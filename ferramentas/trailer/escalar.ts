import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { INICIO_MAXIMO, TICKS_POR_COMPASSO, temMotor, type BatidaGravada, type IdPlano, type PlanoComMotor, type RoteiroDoTrailer, type Tomada, type TomadasDoTrailer } from '../../src/data/trailer/tipos';
import { TICK_DO_MOTOR_NO_ARCONTE } from '../../src/data/trailer/curvas';
import type { LutadorMontado } from '../../src/data/montar';
import { DiretorDoTrailer } from '../../src/trailer/diretor';
import { ticksDoFilmeNoTrailer } from '../../src/trailer/filme';
import { criarPartida, FONTE_VAZIA } from '../../src/trailer/partida';
import { casaBatida, casaInicio, passoDoPlano, RitmoDoPlano, type EsperadaDoRitmo } from '../../src/trailer/ritmo';

/*
 * ESCALAÇÃO do trailer (M2, spec §4.1 e §4.2). Para cada plano de luta do roteiro procura, entre sementes e níveis de CPU, uma luta CPU x CPU que cumpra os golpes
 * que o roteiro pede NO TEMPO que ele pede, e grava a melhor em `src/data/trailer/tomadas.ts`.
 *
 * Como funciona: cada (semente, CPU) é simulada UMA vez e os eventos de cada `update` são gravados. A tomada candidata é um `inicio` (quantos updates pré-rolar):
 * para cada `inicio` possível roda-se a MESMA máquina de ritmo do diretor (`passoDoPlano`/`RitmoDoPlano`, com a câmera lenta e a tarja na conta) sobre os eventos
 * gravados e vê-se em que tick do plano cada golpe cai. A luta é montada pela MESMA função do diretor (`criarPartida`): a tomada que a ferramenta escolhe é a que o
 * jogo toca. Depois de escolher, o diretor real roda o trailer inteiro para gravar a impressão de cada plano.
 */

export interface OpcoesDaEscalacao {
  /** Sementes de 0 a `sementes - 1`. */
  readonly sementes: number;
  /** Combinações de nível da CPU a tentar, [P1, P2]. */
  readonly cpus: readonly (readonly [0 | 1 | 2, 0 | 1 | 2])[];
  /** Teto de `inicio` (updates de pré-rolagem). */
  readonly inicioMaximo: number;
  /** Só estes planos (vazio = todos os de luta). */
  readonly planos: readonly IdPlano[];
  readonly aoProgredir?: (msg: string) => void;
}

export const CPUS_PADRAO: readonly (readonly [0 | 1 | 2, 0 | 1 | 2])[] = [
  [2, 2],
  [1, 2],
  [2, 1],
];

/** Os 4 primeiros updates da luta são a intro (90 ticks): a tomada só começa com a luta em `fight`. */
const MIN_INICIO = 100;
const MARGEM_VIDA = 0.15;
const MAX_CALMO = 45;
const X_MIN = 30;
const X_MAX = 930;
/** O quanto o tick do plano pode se afastar da conta "sem câmera lenta" (a lenta e a tarja esticam o plano). */
const FOLGA_DA_ESTIMATIVA = 56;

interface Gravacao {
  readonly semente: number;
  readonly cpu: readonly [0 | 1 | 2, 0 | 1 | 2];
  /** `eventos[u]` = os eventos do update `u` (1-based; o 0 é vazio). */
  readonly eventos: readonly (readonly EventoLuta[])[];
  readonly fase: Uint8Array;
  readonly hp0: Float32Array;
  readonly hp1: Float32Array;
  readonly x0: Float32Array;
  readonly x1: Float32Array;
  readonly calmo: Uint8Array;
  /** Último update simulado. */
  readonly ate: number;
}

type Elenco = Readonly<Record<IdLutador, LutadorMontado>>;

export function gravar(elenco: Elenco, plano: PlanoComMotor, semente: number, cpu: readonly [0 | 1 | 2, 0 | 1 | 2], limite: number): Gravacao {
  const g = criarPartida(plano, { semente, cpu }, elenco, criarRng);
  const eventos: (readonly EventoLuta[])[] = [[]];
  const fase = new Uint8Array(limite + 1);
  const hp0 = new Float32Array(limite + 1);
  const hp1 = new Float32Array(limite + 1);
  const x0 = new Float32Array(limite + 1);
  const x1 = new Float32Array(limite + 1);
  const calmo = new Uint8Array(limite + 1);
  const [a, b] = g.fighters;
  const razao = (f: typeof a): number => (f.hp + (f.barras - 1) * f.maxHp) / (f.barrasMax * f.maxHp);
  let u = 0;
  while (u < limite && !g.matchDone) {
    g.update(FONTE_VAZIA);
    u++;
    eventos.push(g.events.slice());
    fase[u] = g.phase === 'fight' ? 1 : 0;
    hp0[u] = razao(a);
    hp1[u] = razao(b);
    x0[u] = a.x;
    x1[u] = b.x;
    calmo[u] = (a.state === 'idle' || a.state === 'walk') && (b.state === 'idle' || b.state === 'walk') ? 1 : 0;
  }
  return { semente, cpu, eventos, fase, hp0, hp1, x0, x1, calmo, ate: u };
}

interface Ocorrencia {
  readonly uHit: number;
  readonly uInicio: number;
}

/** Todas as vezes que o golpe pedido acontece na gravação (acerto + o update em que o golpe começou). */
function ocorrencias(grav: Gravacao, pedida: PlanoComMotor['pede'][number]): Ocorrencia[] {
  const r: Ocorrencia[] = [];
  for (let u = 1; u <= grav.ate; u++) {
    if (!(grav.eventos[u] as readonly EventoLuta[]).some((ev) => casaBatida(pedida, ev))) continue;
    let uInicio = u;
    for (let k = u; k >= Math.max(1, u - 400); k--) {
      if ((grav.eventos[k] as readonly EventoLuta[]).some((ev) => casaInicio(pedida, ev))) {
        uInicio = k;
        break;
      }
    }
    r.push({ uHit: u, uInicio });
  }
  return r;
}

interface Avaliacao {
  readonly ok: boolean;
  readonly motivo?: string;
  readonly score: number;
  readonly batidas: readonly BatidaGravada[];
  readonly taus: readonly number[];
  readonly acertos: number;
  readonly vidaMin: number;
  readonly uFim: number;
}

const alvoDe = (plano: PlanoComMotor, i: number): { alvo: number; folga: number } => {
  const b = plano.pede[i];
  const meio = (plano.compassos * TICKS_POR_COMPASSO) / 2;
  return { alvo: b?.alvo ?? meio, folga: b?.folga ?? 60 };
};

/** Roda a máquina de ritmo sobre a gravação para um `inicio` e as ocorrências escolhidas; mede e pontua. */
function avaliar(grav: Gravacao, plano: PlanoComMotor, inicio: number, escolhas: readonly Ocorrencia[]): Avaliacao {
  const duracao = plano.compassos * TICKS_POR_COMPASSO;
  const esperadas: EsperadaDoRitmo[] = escolhas.map((o, i) => ({ pedida: plano.pede[i] as EsperadaDoRitmo['pedida'], gravada: { pedida: i, tickMotor: o.uHit, tickInicio: o.uInicio } }));
  // o MESMO ritmo do diretor, com o filme do especial congelando o motor (D-V6)
  const ritmo = new RitmoDoPlano(esperadas, plano.tipo === 'arconte' ? TICK_DO_MOTOR_NO_ARCONTE : 0, (ev) => ticksDoFilmeNoTrailer(ev.atacante === 0 ? plano.c1 : plano.c2, ev));
  const taus: number[] = escolhas.map(() => -1);
  let u = inicio;
  const falha = (motivo: string): Avaliacao => ({ ok: false, motivo, score: -Infinity, batidas: [], taus, acertos: 0, vidaMin: 0, uFim: u });
  for (let tau = 0; tau < duracao; tau++) {
    const passo = passoDoPlano(ritmo, tau, u, (un) => {
      if (un > grav.ate) return [];
      return grav.eventos[un] as readonly EventoLuta[];
    });
    if (passo.andou && passo.u > grav.ate) return falha('a gravação acabou antes do plano');
    u = passo.u;
    // D-V6: um filme que o fim do plano cortaria no meio é um corte seco com música: a tomada que o tem é recusada
    for (const ev of passo.eventos) {
      if (ev.tipo === 'filme' && tau + ticksDoFilmeNoTrailer(ev.atacante === 0 ? plano.c1 : plano.c2, ev) >= duracao) return falha('um filme não cabe no plano');
    }
    if (passo.andou) {
      escolhas.forEach((o, i) => {
        if (u === o.uHit && passo.eventos.some((ev) => casaBatida(plano.pede[i] as EsperadaDoRitmo['pedida'], ev))) taus[i] = tau;
      });
    }
  }
  for (let i = 0; i < escolhas.length; i++) {
    const { alvo, folga } = alvoDe(plano, i);
    const tau = taus[i] as number;
    if (tau < 0) return falha(`a batida ${i} não caiu dentro do plano`);
    if (Math.abs(tau - alvo) > folga) return falha(`a batida ${i} cai no tick ${tau} (alvo ${alvo} ± ${folga})`);
    // o arconte só anda depois da entrada; a câmera lenta precisa caber antes do fim do plano
    if (plano.tipo === 'arconte' && tau < TICK_DO_MOTOR_NO_ARCONTE) return falha(`a batida ${i} cai durante a entrada do chefão`);
    const lenta = plano.pede[i]?.lenta;
    if (lenta && tau + lenta.ticks >= duracao) return falha(`a câmera lenta da batida ${i} não cabe no plano`);
  }
  // janela viva: updates inicio+1 .. u
  let acertos = 0;
  let calmo = 0;
  let maiorCalmo = 0;
  let vidaMin = 1;
  for (let k = inicio + 1; k <= u; k++) {
    if (grav.fase[k] !== 1) return falha('a luta saiu de `fight` durante o plano');
    for (const ev of grav.eventos[k] as readonly EventoLuta[]) if (ev.tipo === 'hit' || ev.tipo === 'throw') acertos++;
    calmo = (grav.calmo[k] as number) === 1 ? calmo + 1 : 0;
    maiorCalmo = Math.max(maiorCalmo, calmo);
    vidaMin = Math.min(vidaMin, grav.hp0[k] as number, grav.hp1[k] as number);
    const xa = grav.x0[k] as number;
    const xb = grav.x1[k] as number;
    if (xa < X_MIN || xb < X_MIN || xa > X_MAX || xb > X_MAX) return falha('um lutador sai de quadro');
  }
  const vivos = u - inicio;
  const minAcertos = plano.tipo === 'arconte' ? 1 : Math.max(2, Math.floor(vivos / 40));
  if (acertos < minAcertos) return falha(`${acertos} acertos em ${vivos} updates (mín. ${minAcertos})`);
  if (maiorCalmo > MAX_CALMO) return falha(`${maiorCalmo} updates seguidos sem ação`);
  if (!plano.pede.some((b) => b.tipo === 'ko') && vidaMin < MARGEM_VIDA) return falha(`vida mínima ${vidaMin.toFixed(2)}`);
  // pontuação: perto do alvo, mais acertos, vida dos dois sobrando, pré-rolagem curta
  let score = Math.min(acertos, 12) * 1.5 + vidaMin * 4 - inicio / 600;
  escolhas.forEach((_, i) => {
    const { alvo, folga } = alvoDe(plano, i);
    score += 3 * (1 - Math.abs((taus[i] as number) - alvo) / folga);
  });
  const batidas: BatidaGravada[] = escolhas.map((o, i) => ({ pedida: i, tickMotor: o.uHit, tickInicio: o.uInicio }));
  return { ok: true, score, batidas, taus, acertos, vidaMin, uFim: u };
}

export interface ResultadoDoPlano {
  readonly plano: IdPlano;
  readonly tomada: Omit<Tomada, 'impressao'> | null;
  readonly score: number;
  readonly taus: readonly number[];
  readonly acertos: number;
  readonly vidaMin: number;
  /** Quantas simulações tiveram TODAS as batidas pelo menos uma vez, e por batida. */
  readonly simulacoes: number;
  readonly comTodasAsBatidas: number;
  readonly porBatida: readonly number[];
  /** Motivos de recusa mais comuns (para o erro explicar o que faltou). */
  readonly recusas: ReadonlyMap<string, number>;
}

export function escalarPlano(elenco: Elenco, plano: PlanoComMotor, op: OpcoesDaEscalacao): ResultadoDoPlano {
  const duracao = plano.compassos * TICKS_POR_COMPASSO;
  const limite = Math.min(op.inicioMaximo, INICIO_MAXIMO) + duracao + 2;
  let melhor: { score: number; semente: number; cpu: readonly [0 | 1 | 2, 0 | 1 | 2]; inicio: number; av: Avaliacao } | null = null;
  const porBatida = plano.pede.map(() => 0);
  const recusas = new Map<string, number>();
  let simulacoes = 0;
  let comTodas = 0;
  for (let semente = 0; semente < op.sementes; semente++) {
    for (const cpu of op.cpus) {
      const grav = gravar(elenco, plano, semente, cpu, limite);
      simulacoes++;
      const oco = plano.pede.map((b) => ocorrencias(grav, b));
      oco.forEach((o, i) => {
        if (o.length > 0) porBatida[i] = (porBatida[i] as number) + 1;
      });
      if (oco.some((o) => o.length === 0)) continue;
      comTodas++;
      const { alvo: alvo0 } = alvoDe(plano, 0);
      // no P9 o motor só anda depois da entrada do chefão: o tick do plano conta a partir daí
      const base = plano.tipo === 'arconte' ? TICK_DO_MOTOR_NO_ARCONTE : 0;
      for (const o0 of oco[0] as Ocorrencia[]) {
        // `inicio` candidatos: o acerto da 1ª batida cai perto do alvo (a lenta e a tarja esticam o plano, então a estimativa tem folga)
        const centro = o0.uHit - (alvo0 - base);
        const de = Math.max(MIN_INICIO, centro - FOLGA_DA_ESTIMATIVA - 20);
        const ate = Math.min(op.inicioMaximo, centro + FOLGA_DA_ESTIMATIVA, (plano.pede[0]?.cine ? o0.uInicio : o0.uHit) - 1);
        for (let inicio = de; inicio <= ate; inicio++) {
          const escolhas: Ocorrencia[] = [o0];
          let faltou = false;
          for (let i = 1; i < plano.pede.length; i++) {
            const { alvo } = alvoDe(plano, i);
            let pick: Ocorrencia | null = null;
            let d = Infinity;
            for (const c of oco[i] as Ocorrencia[]) {
              if (c.uHit <= inicio || (plano.pede[i]?.cine && c.uInicio <= inicio) || escolhas.some((x) => x.uHit === c.uHit)) continue;
              const dd = Math.abs(c.uHit - inicio - (alvo - base));
              if (dd < d) {
                d = dd;
                pick = c;
              }
            }
            if (!pick) {
              faltou = true;
              break;
            }
            escolhas.push(pick);
          }
          if (faltou) continue;
          const av = avaliar(grav, plano, inicio, escolhas);
          if (!av.ok) {
            const m = (av.motivo ?? '').replace(/\d+(\.\d+)?/g, 'N');
            recusas.set(m, (recusas.get(m) ?? 0) + 1);
            continue;
          }
          if (!melhor || av.score > melhor.score) melhor = { score: av.score, semente, cpu, inicio, av };
        }
      }
    }
    if ((semente + 1) % 50 === 0) op.aoProgredir?.(`  ${plano.id}: ${semente + 1}/${op.sementes} sementes, melhor ${melhor ? melhor.score.toFixed(2) : '-'}`);
  }
  return {
    plano: plano.id,
    tomada: melhor ? { semente: melhor.semente, cpu: melhor.cpu, inicio: melhor.inicio, batidas: melhor.av.batidas } : null,
    score: melhor?.score ?? -Infinity,
    taus: melhor?.av.taus ?? [],
    acertos: melhor?.av.acertos ?? 0,
    vidaMin: melhor?.av.vidaMin ?? 0,
    simulacoes,
    comTodasAsBatidas: comTodas,
    porBatida,
    recusas,
  };
}

/** Roda o diretor REAL sobre as tomadas (com a pré-rolagem completa) e devolve a impressão de cada plano de luta. */
export function impressoesDoDiretor(roteiro: RoteiroDoTrailer, tomadas: TomadasDoTrailer, elenco: Elenco): { impressoes: Map<IdPlano, string>; reservas: readonly IdPlano[] } {
  const d = new DiretorDoTrailer(roteiro, tomadas, { lutadores: elenco, criarRng });
  while (!d.fim) {
    d.prerolar(Number.POSITIVE_INFINITY);
    d.avancar();
  }
  return { impressoes: new Map(d.impressoes()), reservas: d.planosEmReserva() };
}

/** O texto de `src/data/trailer/tomadas.ts`, na ordem do roteiro. */
export function textoDasTomadas(roteiro: RoteiroDoTrailer, tomadas: TomadasDoTrailer): string {
  const linhas: string[] = [];
  for (const p of roteiro.planos) {
    const t = tomadas[p.id];
    if (!t || !temMotor(p)) continue;
    const batidas = t.batidas.map((b) => `{ pedida: ${b.pedida}, tickMotor: ${b.tickMotor}, tickInicio: ${b.tickInicio} }`).join(', ');
    linhas.push(`  ${p.id}: { semente: ${t.semente}, cpu: [${t.cpu[0]}, ${t.cpu[1]}], inicio: ${t.inicio}, batidas: [${batidas}], impressao: '${t.impressao}' },`);
  }
  return `import type { TomadasDoTrailer } from './tipos';

/*
 * GERADO por \`npm run trailer:escalar\` (ferramentas/trailer). Não edite à mão: o roteiro (roteiro.ts) é o que se escreve; aqui ficam as TOMADAS, uma por plano de
 * luta, que a escalação achou para cumprir os golpes que o roteiro pede. Se o balanceamento, a CPU ou o atlas mudarem, o teste \`trailer-tomadas\` falha dizendo
 * qual plano reescalar. A impressão é o hash do estado do \`Game\` ao fim do plano.
 */
export const TOMADAS: TomadasDoTrailer = {
${linhas.join('\n')}
};
`;
}
