import type { EventoLuta, IdLutador, InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import type { NomeGolpe } from '../../src/data/tipos';
import { Game, type FonteEntradas } from '../../src/fight/game';
import type { Fighter } from '../../src/fight/fighter';
import type { ProjetilLuta } from '../../src/fight/projetil';
import type { ChefeDoHarness } from './chefoes';
import type { Elenco } from './elenco';
import { semente32 } from './estatistica';

/*
 * Simulação CPU x CPU do harness (docs/mecanicas-e3.md 6.3). Cada luta é independente e determinística: a semente sai do
 * TEXTO da tarefa (tipo, lutadores, nível, índice), não da ordem de execução, então dividir o trabalho entre processos
 * (ou rodar duas vezes) dá exatamente o mesmo resultado. Nada aqui toca em estado do jogo: cada luta monta a própria `Game`.
 */

/** Ajustes de partida do harness: os padrões do jogo (2 rounds, 99 s). */
export const AJUSTES_SIM = { rounds: 2, time: 99, shake: false } as const;
/** Teto por luta (docs 6.3): 6 minutos de jogo. Passou, a luta é marcada "travou". */
export const TETO_TICKS = 21_600;
/** Segurança contra loop infinito em hitstop: updates, não ticks de jogo. */
export const TETO_UPDATES = 60_000;

export type TipoTarefa = 'regular' | 'chefe';

export type Tarefa = {
  idx: number;
  tipo: TipoTarefa;
  /** P1. No chefe é o "jogador" (uma CPU). */
  a: IdLutador;
  /** P2. No chefe é o chefão da tarefa (um dos 6). */
  b: IdLutador;
  /** Nível da CPU (índice de `AI_LEVELS`): 1 = NORMAL, 2 = DIFÍCIL. Vale para os dois lados. */
  nivel: number;
  semente: number;
  /** ESQUIVA ligada nesta luta (`--esquiva`). A semente NÃO muda: a mesma luta com e sem esquiva é comparável. */
  esquiva?: true;
  /** `motorV2.entradaNoHitstop` ligada nesta luta (`--entrada-hitstop`). CPU x CPU não lê a fonte: o resultado tem de ser idêntico. */
  entradaNoHitstop?: true;
  /** `motorV2.filmes` ligada nesta luta (`--filmes`, V2-3c). Muda o resultado de propósito (dano do especial, queda, teto de combo): referência própria. */
  filmes?: true;
  /** `motorV2.combos` ligada nesta luta (`--motor-v2 combos`, V2-4). A semente não muda; a CPU DIFÍCIL passa a sortear os combos próprios (consome RNG): referência própria. */
  combos?: true;
};

export type ParametrosSim = {
  sementes: number;
  niveis: readonly number[];
  /** Muda todas as sementes de uma vez (segunda opinião sobre o mesmo balanço). */
  base: number;
  /** `a:b` separados por vírgula, `*` em qualquer lado (ex.: `aminu:*,*:nila`). Vazio = todos. */
  filtro: string | null;
  incluirChefe: boolean;
  /** Só estes chefões (`--chefes aminu,zenon`). Ausente/null = os 6. */
  chefes?: readonly string[] | null;
  /** Não joga as lutas regulares (`--sem-regulares`): calibração rápida dos chefões. Com `idx` recomeçando em 0 (a semente não muda). */
  semRegulares?: boolean;
  /** Liga a esquiva (V2) em todas as lutas. Ausente/false = como sempre. */
  esquiva?: boolean;
  /** Liga `motorV2.entradaNoHitstop` (V2-1) em todas as lutas: prova que a flag não muda o harness (o hash tem de continuar o mesmo). */
  entradaNoHitstop?: boolean;
  /** Liga `motorV2.filmes` (V2-3c) em todas as lutas. A semente não muda: a mesma luta com e sem filme é comparável. */
  filmes?: boolean;
  /** Liga `motorV2.combos` (V2-4) em todas as lutas. A semente não muda: a mesma luta com e sem combos é comparável. */
  combos?: boolean;
  /** "E se...": ajustes em memória sobre o elenco (ver `aplicarAjustes`). Ausente = os dados do jogo como estão. */
  ajustes?: Record<string, unknown>;
};

/** Contadores de um golpe de um lutador numa luta: [usos, acertos, bloqueios+paradas]. */
export type ContagemGolpe = [number, number, number];

export type Registro = {
  idx: number;
  tipo: TipoTarefa;
  a: IdLutador;
  b: IdLutador;
  nivel: number;
  semente: number;
  /** Índice do vencedor da LUTA (0 = P1) ou null (travou). */
  venc: 0 | 1 | null;
  travou: boolean;
  /** Chamadas a `update` / ticks de jogo (sem hitstop). */
  updates: number;
  ticks: number;
  rounds: number;
  /** Como terminou cada round decidido: KO ou tempo. */
  fim: ('ko' | 'tempo')[];
  empates: number;
  perfeitos: [number, number];
  /** Dano CAUSADO por cada lado (queda de `vidaTotal` do rival; inclui raspão de bloqueio). */
  dano: [number, number];
  golpes: [Record<string, ContagemGolpe>, Record<string, ContagemGolpe>];
  /** Trocas de barra, cenas e retomadas do chefe. */
  chefe: [number, number, number];
  trocaFicha: [number, number];
  /** Paradas bem-sucedidas (contadas no DEFENSOR). */
  parry: [number, number];
  quebra: [number, number];
  agarroes: [number, number];
  clash: number;
  /** Eventos `carga` por nível 1..3, por lutador. */
  carga: [[number, number, number], [number, number, number]];
  rebote: [number, number];
  /** Esquivas começadas e golpes/projéteis esquivados, por lutador (só com `--esquiva`). */
  esquivas: [number, number];
  esquivou: [number, number];
  /** Acertos do RESORTE por faixa de momento (fração de `maxDist`): <10%, 10-25%, 25-50%, >=50%. */
  reboteFaixas: [[number, number, number, number], [number, number, number, number]];
  /** Combos próprios COMPLETOS por lutador (V2-4). Só existe com `--motor-v2 combos`: sem a flag a chave não aparece e o hash é o de sempre. */
  combosProprios?: [number, number];
};

const ZERO_FRAME = (): InputFrame => ({ left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, sp: false });
const FONTE_VAZIA: FonteEntradas = { p1: ZERO_FRAME, p2: ZERO_FRAME };

/** Casa `a:b` (com `*`) contra um par. Filtro vazio casa tudo. */
export function casaFiltro(filtro: string | null, a: string, b: string): boolean {
  if (!filtro || filtro.trim() === '') return true;
  return filtro.split(',').some((parte) => {
    const [fa, fb] = parte.trim().split(':');
    return (fa === undefined || fa === '*' || fa === a) && (fb === undefined || fb === '*' || fb === b);
  });
}

/**
 * A lista fixa de lutas do harness, na ordem estável: regulares (par ordenado, nível, índice) e depois os chefões, um a um.
 * `chefes` é a lista de chefões com os desafiantes de cada um (`desafiantesDoChefe`); por compatibilidade aceita também UM id
 * (o chefão único de antes: todos os outros lutadores o enfrentam) ou null (sem chefão). Os regulares vêm SEMPRE primeiro e
 * com os mesmos `idx` e sementes de antes: acrescentar chefões não mexe neles.
 */
export function montarTarefas(ids: readonly IdLutador[], chefes: IdLutador | null | readonly ChefeDoHarness[], p: ParametrosSim): Tarefa[] {
  const tarefas: Tarefa[] = [];
  const lista: readonly ChefeDoHarness[] =
    chefes === null ? [] : typeof chefes === 'string' ? [{ chefe: chefes, desafiantes: ids.filter((id) => id !== chefes) }] : chefes;
  const nova = (tipo: TipoTarefa, a: IdLutador, b: IdLutador, nivel: number, i: number): void => {
    tarefas.push({
      idx: tarefas.length,
      tipo,
      a,
      b,
      nivel,
      semente: semente32(`${p.base}|${tipo}|${a}|${b}|${nivel}|${i}`),
      ...(p.esquiva ? { esquiva: true as const } : {}),
      ...(p.entradaNoHitstop ? { entradaNoHitstop: true as const } : {}),
      ...(p.filmes ? { filmes: true as const } : {}),
      ...(p.combos ? { combos: true as const } : {}),
    });
  };
  if (p.semRegulares !== true) {
    for (const a of ids) {
      for (const b of ids) {
        if (a === b || !casaFiltro(p.filtro, a, b)) continue;
        for (const nivel of p.niveis) for (let i = 0; i < p.sementes; i++) nova('regular', a, b, nivel, i);
      }
    }
  }
  // Sem chefão no jogo (lista vazia) não há tarefa de chefe, mesmo com `incluirChefe`. `p.chefes` limita a quais chefões medir.
  if (p.incluirChefe) {
    for (const { chefe, desafiantes } of lista) {
      if (p.chefes && !p.chefes.includes(chefe)) continue;
      for (const a of desafiantes) {
        if (a === chefe || !casaFiltro(p.filtro, a, chefe)) continue;
        for (const nivel of p.niveis) for (let i = 0; i < p.sementes; i++) nova('chefe', a, chefe, nivel, i);
      }
    }
  }
  return tarefas;
}

const chaveDoGolpe = (f: Fighter, golpe: string): string => (f.ficha ? `${f.ficha}/${golpe}` : golpe);

/**
 * Projétil acertando: de qual golpe ele veio? Pelo `spec` do projétil que acabou de morrer perto do ponto do evento (cada golpe
 * tem o seu objeto `proj`); sem ele (nasceu e acertou no mesmo tick), se o lutador só tem UM golpe que solta projétil, é ele;
 * senão, 'projétil'.
 */
function golpeDoProjetil(f: Fighter, mortos: readonly ProjetilLuta[], x: number, y: number): string {
  let melhor: ProjetilLuta | null = null;
  let dist = 160;
  for (const pr of mortos) {
    const d = Math.hypot(pr.x - x, pr.y - y);
    if (pr.owner === f && d < dist) {
      melhor = pr;
      dist = d;
    }
  }
  const especiais = ['sFire', 'sDown', 'sFwd'] as const;
  if (melhor) {
    const alvo = melhor.spec;
    const n = especiais.find((e) => f.ch.moves[e].proj === alvo);
    if (n) return chaveDoGolpe(f, n);
  }
  const nomes = especiais.filter((n) => f.ch.moves[n].type === 'fire');
  return chaveDoGolpe(f, nomes.length === 1 ? (nomes[0] as string) : 'projétil');
}

function contagem(r: Record<string, ContagemGolpe>, chave: string): ContagemGolpe {
  let c = r[chave];
  if (!c) {
    c = [0, 0, 0];
    r[chave] = c;
  }
  return c;
}

/** As flags do motor v2 desta tarefa (`{}` quando nenhuma: a cfg fica idêntica à de antes, nem a chave `motorV2` aparece). */
function motorV2DaTarefa(t: Tarefa): { motorV2?: { entradaNoHitstop?: true; filmes?: true; combos?: true } } {
  if (!t.entradaNoHitstop && !t.filmes && !t.combos) return {};
  return {
    motorV2: {
      ...(t.entradaNoHitstop ? { entradaNoHitstop: true as const } : {}),
      ...(t.filmes ? { filmes: true as const } : {}),
      ...(t.combos ? { combos: true as const } : {}),
    },
  };
}

/** Joga UMA luta CPU x CPU até o fim (ou o teto) e devolve tudo o que o relatório precisa. */
export function lutar(elenco: Elenco, t: Tarefa): Registro {
  const g = new Game({ lutadores: elenco, rng: criarRng(t.semente) });
  g.setup(
    { mode: 'cpu', c1: t.a, c2: t.b, cpu: t.nivel, p1cpu: t.nivel, ...(t.tipo === 'chefe' ? { chefe: true } : {}), ...(t.esquiva ? { esquiva: true } : {}), ...motorV2DaTarefa(t) },
    { ...AJUSTES_SIM },
  );
  const [f0, f1] = g.fighters;
  const lutadores = [f0, f1] as const;
  const reg: Registro = {
    idx: t.idx,
    tipo: t.tipo,
    a: t.a,
    b: t.b,
    nivel: t.nivel,
    semente: t.semente,
    venc: null,
    travou: false,
    updates: 0,
    ticks: 0,
    rounds: 1,
    fim: [],
    empates: 0,
    perfeitos: [0, 0],
    dano: [0, 0],
    golpes: [{}, {}],
    chefe: [0, 0, 0],
    trocaFicha: [0, 0],
    parry: [0, 0],
    quebra: [0, 0],
    agarroes: [0, 0],
    clash: 0,
    carga: [
      [0, 0, 0],
      [0, 0, 0],
    ],
    rebote: [0, 0],
    esquivas: [0, 0],
    esquivou: [0, 0],
    reboteFaixas: [
      [0, 0, 0, 0],
      [0, 0, 0, 0],
    ],
  };
  const ultimoAtk: [number, number] = [f0.atkId, f1.atkId];
  const vida: [number, number] = [f0.vidaTotal, f1.vidaTotal];
  let faseAnterior = g.phase;
  let projAntes: ProjetilLuta[] = [];
  while (!g.matchDone) {
    projAntes = g.projectiles.length ? g.projectiles.slice() : projAntes.length ? [] : projAntes;
    g.update(FONTE_VAZIA);
    reg.updates++;
    for (const i of [0, 1] as const) {
      const f = lutadores[i];
      if (f.atkId !== ultimoAtk[i]) {
        if (f.atkId > ultimoAtk[i] && f.state === 'move' && f.move !== null && f.move !== '_lag') contagem(reg.golpes[i], chaveDoGolpe(f, f.move))[0]++;
        ultimoAtk[i] = f.atkId;
      }
      const vt = f.vidaTotal;
      if (vt < vida[i]) reg.dano[1 - i as 0 | 1] += vida[i] - vt;
      vida[i] = vt;
    }
    const mortos = projAntes.length ? projAntes.filter((pr) => pr.life <= 0) : projAntes;
    for (const e of g.events as readonly EventoLuta[]) contarEvento(reg, e, lutadores, mortos);
    if (g.phase !== faseAnterior) {
      if (g.phase === 'ko') reg.fim.push('ko');
      else if (g.phase === 'timeover') reg.fim.push('tempo');
      faseAnterior = g.phase;
    }
    if (g.tick > TETO_TICKS || reg.updates > TETO_UPDATES) {
      reg.travou = true;
      break;
    }
  }
  reg.ticks = g.tick;
  reg.rounds = g.round;
  reg.empates = reg.fim.length - (g.p1.wins + g.p2.wins);
  if (t.combos) reg.combosProprios = [g.combosPropriosFeitos[0], g.combosPropriosFeitos[1]];
  if (!reg.travou) reg.venc = g.matchWinner;
  return reg;
}

function contarEvento(reg: Registro, e: EventoLuta, f: readonly [Fighter, Fighter], mortos: readonly ProjetilLuta[]): void {
  switch (e.tipo) {
    case 'hit': {
      const a = f[e.atacante];
      // Acerto que abriu um FILME (V2-3c): o atacante já está em `_lag` neste ponto, então `a.move` não diz mais qual golpe foi; o evento diz.
      const chave = e.filme === true && e.golpe !== undefined ? chaveDoGolpe(a, e.golpe) : e.projetil ? golpeDoProjetil(a, mortos, e.x, e.y) : a.move !== null ? chaveDoGolpe(a, a.move) : null;
      if (chave) contagem(reg.golpes[e.atacante], chave)[1]++;
      const golpeDoAcerto = e.filme === true && e.golpe !== undefined ? (e.golpe as NomeGolpe) : a.move;
      const mv = !e.projetil && golpeDoAcerto !== null ? a.ch.moves[golpeDoAcerto] : null;
      if (mv?.rebote) {
        const fr = Math.min(a.momento, mv.rebote.maxDist) / mv.rebote.maxDist;
        reg.reboteFaixas[e.atacante][fr < 0.1 ? 0 : fr < 0.25 ? 1 : fr < 0.5 ? 2 : 3]++;
      }
      break;
    }
    case 'throw': {
      const a = f[e.atacante];
      if (e.filme === true && e.golpe !== undefined) contagem(reg.golpes[e.atacante], chaveDoGolpe(a, e.golpe))[1]++; // idem: o agarrão de especial com filme
      else if (a.move !== null) contagem(reg.golpes[e.atacante], chaveDoGolpe(a, a.move))[1]++;
      reg.agarroes[e.atacante]++;
      break;
    }
    case 'armor': {
      const a = f[e.atacante];
      if (a.move !== null) contagem(reg.golpes[e.atacante], chaveDoGolpe(a, a.move))[1]++;
      break;
    }
    case 'quebra-guarda': {
      const a = f[e.atacante];
      if (a.move !== null) contagem(reg.golpes[e.atacante], chaveDoGolpe(a, a.move))[1]++;
      reg.quebra[e.atacante]++;
      break;
    }
    case 'block': {
      const a = f[e.atacante];
      // O evento `block` não diz se foi projétil: um projétil do atacante que morreu bem ali é o que foi bloqueado.
      const doProjetil = mortos.some((pr) => pr.owner === a && Math.hypot(pr.x - e.x, pr.y - e.y) < 160);
      const chave = !doProjetil && a.move !== null && a.state === 'move' ? chaveDoGolpe(a, a.move) : golpeDoProjetil(a, mortos, e.x, e.y);
      contagem(reg.golpes[e.atacante], chave)[2]++;
      break;
    }
    case 'parry': {
      const a = f[e.atacante];
      if (a.move !== null || a.state === 'hit') contagem(reg.golpes[e.atacante], a.move !== null ? chaveDoGolpe(a, a.move) : 'parado')[2]++;
      reg.parry[e.defensor]++;
      break;
    }
    case 'perfect':
      reg.perfeitos[e.vencedor]++;
      break;
    case 'fase-chefe':
      if (e.etapa === 'troca') reg.chefe[0]++;
      else if (e.etapa === 'cena') reg.chefe[1]++;
      else reg.chefe[2]++;
      break;
    case 'troca-ficha':
      reg.trocaFicha[e.lutador]++;
      break;
    case 'carga':
      reg.carga[e.lutador][(e.nivel - 1) as 0 | 1 | 2]++;
      break;
    case 'rebote':
      reg.rebote[e.lutador]++;
      break;
    case 'clash':
      reg.clash++;
      break;
    case 'esquiva':
      reg.esquivas[e.lutador]++;
      break;
    case 'esquivou':
      reg.esquivou[e.lutador]++;
      break;
    default:
      break;
  }
}

/** Roda uma lista de tarefas em ordem e devolve os registros (o chamador decide como dividir o trabalho). */
export function rodarTarefas(elenco: Elenco, tarefas: readonly Tarefa[]): Registro[] {
  return tarefas.map((t) => lutar(elenco, t));
}
