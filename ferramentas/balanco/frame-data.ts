import { GROUND, JUMP_FORCE } from '../../src/core/constantes';
import type { EstadoLutador, EventoLuta, IdLutador, InputFrame, MotorV2 } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { cadeiaPermite, forcaDoRank } from '../../src/data/combos-proprios';
import type { ComboProprio, NivelGolpe, NomeGolpe, TipoGolpe } from '../../src/data/tipos';
import { moveInput } from '../../src/fight/cpu';
import { Game, TETO_COMBO, type DummyTreino, type FonteEntradas } from '../../src/fight/game';
import type { Elenco } from './elenco';

/*
 * Frame data MEDIDA NO MOTOR (docs/mecanicas-e3.md 6.2). Nada daqui lê a tabela de golpes para "calcular" um número que o
 * motor produz: cada valor sai de uma `Game` real em modo treino, com o boneco `stand`/`block`/`crouchblock`, andando
 * tick a tick. A tabela de golpes entra só como coluna "nominal", para o leitor ver onde o motor discorda do dado.
 *
 * Convenções (todas contadas em ticks de JOGO, `Game.tick`, que não anda durante o hitstop):
 *  - início   = ticks do `startMove` até o 1º tick em que a caixa de acerto vale (S, para um golpe simples);
 *  - ativos   = ticks em que a caixa vale; recuperação = do fim dos ativos até o atacante voltar a um estado livre;
 *  - vantagem = (tick em que o defensor fica livre) − (tick em que o atacante fica livre); positivo = atacante na frente;
 *  - alcance  = distância entre os DOIS x (centro a centro) em que o golpe conecta, varrida de 6 em 6 px e refinada a 1 px nas
 *    duas bordas. Os corpos nunca ficam a menos de 78 (39 + 39). O teto da arena para a varredura é 780.
 */

export const ARENA = { centro: 480, dMin: 78, dMax: 780, passo: 6 } as const;
const MAX_TICKS_ENSAIO = 400;
const BONECO: IdLutador = 'hayato';

/** Estados em que o lutador já pode agir (os de `Fighter.update` que aceitam um golpe novo). */
const LIVRES: ReadonlySet<EstadoLutador> = new Set<EstadoLutador>(['idle', 'walk', 'crouch', 'land']);

type Quadro = { -readonly [K in keyof InputFrame]: InputFrame[K] };
const quadroVazio = (): Quadro => ({ left: false, right: false, up: false, down: false, lp: false, hp: false, lk: false, hk: false, sp: false });

export type Cenario = {
  elenco: Elenco;
  id: IdLutador;
  /** null = ficha base. */
  ficha: string | null;
  golpe: NomeGolpe;
  /** Distância entre os x do atacante e do boneco. */
  d: number;
  dummy: DummyTreino;
  /** O boneco começa no ar (golpes de agarrão aéreo). */
  alvoNoAr?: boolean;
  /** O boneco não pode ser atingido (mede o golpe sem a reação dele). */
  imune?: boolean;
  /** Ticks segurando ESP (`spSeg`) a partir do 1º tick: níveis da carga. */
  segurar?: number;
  /** 'conexao' para no 1º acerto/bloqueio (varredura de alcance); 'completo' anda até os dois ficarem livres. */
  parar: 'conexao' | 'completo';
  /** Liga `motorV2.filmes` na `Game` do ensaio (V2-3c): o 1º contato limpo de um especial vira filme. */
  filmes?: boolean;
};

export type Ensaio = {
  /** Houve acerto, bloqueio, agarrão, armadura ou parada do golpe do atacante. */
  conectou: boolean;
  /** Contagem por tipo de evento do ATACANTE (hit, block, throw, armor, parry, quebra-guarda). */
  eventos: Record<string, number>;
  /** Tick (desde o `startMove`) do 1º tick com a caixa de acerto válida, ou null se ela nunca valeu. */
  inicio: number | null;
  ativos: number;
  /** Tick em que o atacante ficou livre, ou null. */
  livreAtacante: number | null;
  livreDefensor: number | null;
  afetado: boolean;
  ticksEmHit: number;
  ticksEmBlock: number;
  caiu: boolean;
  /** Queda total de vida do boneco no ensaio (dano + raspão). */
  danoNoBoneco: number;
  acertos: number;
  bloqueios: number;
  /** Bloqueios que o golpe atravessou (`quebraGuarda`). */
  quebras: number;
  ticks: number;
  /** `momento` do RESORTE no 1º acerto (0 se o golpe não é `rebote`). */
  momentoNoAcerto: number;
  /** Eventos `filme` do ATACANTE (V2-3c; sempre 0 com a flag desligada). */
  filmes: number;
};

/** Um ensaio de um golpe contra o boneco. Função pura: cada chamada monta a própria `Game`. */
export function ensaiar(c: Cenario): Ensaio {
  const g = new Game({ lutadores: c.elenco, rng: criarRng(1) });
  g.setup({ mode: 'training', c1: c.id, c2: BONECO, ...(c.filmes ? { motorV2: { filmes: true } } : {}) }, { rounds: 2, time: 99, shake: false });
  g.phase = 'fight';
  g.t = 0;
  g.trocarAlvoDoTreino(c.dummy);
  const p1 = g.p1;
  const p2 = g.p2;
  p1.trocarFicha(c.ficha);
  const frame = quadroVazio();
  const fonte: FonteEntradas = { p1: () => ({ ...frame }), p2: () => quadroVazio() };

  p1.x = ARENA.centro - c.d / 2;
  p2.x = ARENA.centro + c.d / 2;
  p1.facing = 1;
  p2.facing = -1;
  p1.en = 100;
  if (c.imune) p2.invuln = 1_000_000;

  // Golpe aéreo: o atacante pula de verdade e ataca no ápice (vy >= 0). O resto do aquecimento (3 ticks) deixa o boneco entrar
  // na guarda/agachado antes do primeiro tick possível de acerto.
  const noAr = c.golpe[0] === 'j';
  if (noAr) {
    p1.setState('jump');
    p1.y = GROUND - 1;
    p1.vy = JUMP_FORCE * p1.ch.jump;
    p1.vx = 0;
    for (let i = 0; i < 80 && p1.vy < 0; i++) g.update(fonte);
  }
  for (let i = 0; i < 3; i++) g.update(fonte);
  if (c.alvoNoAr) {
    p2.setState('jump');
    p2.y = GROUND - 70;
    p2.vy = -3;
  }
  // O boneco que bloqueia anda para trás enquanto segura o botão (ver `Game.dummyInput`): o aquecimento e o pulo já o teriam
  // afastado. Reposiciona os dois e, enquanto nada o atinge, o prende no lugar (um rival que bloqueia sem recuar).
  const xDoBoneco = ARENA.centro + c.d / 2;
  p1.x = ARENA.centro - c.d / 2;
  p2.x = xDoBoneco;
  p2.vx = 0;
  p1.startMove(c.golpe, g);

  const r: Ensaio = {
    conectou: false,
    eventos: {},
    inicio: null,
    ativos: 0,
    livreAtacante: null,
    livreDefensor: null,
    afetado: false,
    ticksEmHit: 0,
    ticksEmBlock: 0,
    caiu: false,
    danoNoBoneco: 0,
    acertos: 0,
    bloqueios: 0,
    quebras: 0,
    ticks: 0,
    momentoNoAcerto: 0,
    filmes: 0,
  };
  const t0 = g.tick;
  let ultimoN = 0;
  let hpAntes = p2.hp;
  for (let i = 0; i < MAX_TICKS_ENSAIO * 3; i++) {
    frame.spSeg = c.segurar !== undefined && i < c.segurar;
    g.update(fonte);
    const n = g.tick - t0;
    const novoTick = n !== ultimoN;
    ultimoN = n;
    r.ticks = n;
    for (const e of g.events as readonly EventoLuta[]) {
      if (!('atacante' in e) || e.atacante !== 0) continue;
      r.eventos[e.tipo] = (r.eventos[e.tipo] ?? 0) + 1;
      if (e.tipo === 'filme') r.filmes++;
      if (e.tipo === 'quebra-guarda') {
        // atravessou o bloqueio: conta como bloqueio QUEBRADO (o defensor tentou bloquear), não como acerto limpo
        r.conectou = true;
        r.bloqueios++;
        r.quebras++;
      } else if (e.tipo === 'hit' || e.tipo === 'throw' || e.tipo === 'armor' || e.tipo === 'parry') {
        if (!r.conectou) r.momentoNoAcerto = p1.momento;
        r.conectou = true;
        r.acertos++;
      } else if (e.tipo === 'block') {
        r.conectou = true;
        r.bloqueios++;
      }
    }
    if (!r.afetado && p2.state !== 'jump') p2.x = xDoBoneco;
    if (p2.hp < hpAntes) r.danoNoBoneco += hpAntes - p2.hp;
    hpAntes = p2.hp;
    if (novoTick) {
      if (p1.activeMove()) {
        if (r.inicio === null) r.inicio = n;
        r.ativos++;
      }
      if (p2.state === 'hit') r.ticksEmHit++;
      if (p2.state === 'block') r.ticksEmBlock++;
    }
    if (p2.state === 'down' || p2.state === 'ko') r.caiu = true;
    if (p2.state === 'hit' || p2.state === 'block' || p2.state === 'down' || p2.state === 'ko') r.afetado = true;
    if (r.livreAtacante === null && LIVRES.has(p1.state)) r.livreAtacante = n;
    if (r.afetado && r.livreDefensor === null && LIVRES.has(p2.state)) r.livreDefensor = n;
    if (c.parar === 'conexao' && r.conectou) break;
    if (c.parar === 'completo' && r.livreAtacante !== null && g.projectiles.length === 0 && (!r.afetado || r.livreDefensor !== null)) break;
    if (n > MAX_TICKS_ENSAIO) break;
  }
  return r;
}

// ---------------------------------------------------------------------------------------------------------------------
// Alcance
// ---------------------------------------------------------------------------------------------------------------------

export type Alcance = {
  /** Menor/maior distância (centro a centro) em que o golpe conecta; null = nunca conectou entre 78 e 780. */
  min: number | null;
  max: number | null;
  /** O maior valor é o teto da varredura (o golpe provavelmente chega mais longe que a arena). */
  noTeto: boolean;
  /** Quantos pontos da varredura DENTRO de [min, max] não conectaram (0 = faixa contínua). */
  furos: number;
};

/** Varredura grossa + refinamento a 1 px nas duas bordas. `conecta(d)` roda um ensaio de parada na conexão. */
export function varrerAlcance(conecta: (d: number) => boolean): Alcance {
  const pontos: number[] = [];
  for (let d: number = ARENA.dMin; d <= ARENA.dMax; d += ARENA.passo) pontos.push(d);
  const ok = pontos.map((d) => conecta(d));
  const primeiro = ok.indexOf(true);
  if (primeiro < 0) return { min: null, max: null, noTeto: false, furos: 0 };
  const ultimo = ok.lastIndexOf(true);
  let min = pontos[primeiro] as number;
  if (primeiro > 0) {
    let falso = pontos[primeiro - 1] as number;
    let verdadeiro = min;
    while (verdadeiro - falso > 1) {
      const meio = Math.floor((falso + verdadeiro) / 2);
      if (conecta(meio)) verdadeiro = meio;
      else falso = meio;
    }
    min = verdadeiro;
  }
  let max = pontos[ultimo] as number;
  const noTeto = ultimo === pontos.length - 1;
  if (!noTeto) {
    let verdadeiro = max;
    let falso = pontos[ultimo + 1] as number;
    while (falso - verdadeiro > 1) {
      const meio = Math.floor((falso + verdadeiro) / 2);
      if (conecta(meio)) verdadeiro = meio;
      else falso = meio;
    }
    max = verdadeiro;
  }
  let furos = 0;
  for (let i = primeiro; i <= ultimo; i++) if (!ok[i]) furos++;
  return { min, max, noTeto, furos };
}

// ---------------------------------------------------------------------------------------------------------------------
// Uma linha da tabela
// ---------------------------------------------------------------------------------------------------------------------

export type Bloqueio = NivelGolpe | 'nenhum';

export type MedidaGolpe = {
  lutador: IdLutador;
  ficha: string | null;
  golpe: NomeGolpe;
  /** Variante medida (hoje só a carga: 'nível 1'..'nível 3'). */
  variante: string | null;
  nome: string | null;
  tipo: TipoGolpe | null;
  /** O que o dado declara. */
  nominal: { S: number; A: number; R: number; dmg: number | null; hs: number | null; bs: number | null; lvl: NivelGolpe; custo: number | null; pow: number };
  /** Caixa de acerto estática (px a partir do x do atacante): fx + w; null = golpe sem caixa (projétil, agarrão, troca). */
  caixa: { fx: number; w: number; fy: number; h: number; alcanceEstatico: number } | null;
  /** O que o motor fez. */
  inicio: number | null;
  ativos: number | null;
  recuperacao: number | null;
  total: number | null;
  alcance: Alcance | null;
  /** Distância usada nas medidas de dano/vantagem. */
  dRef: number | null;
  dano: number | null;
  acertos: number | null;
  hitstun: number | null;
  derruba: boolean;
  vantagemAcerto: number | null;
  blockstun: number | null;
  vantagemBloqueio: number | null;
  raspao: number | null;
  /** Nível de bloqueio medido contra `block` e `crouchblock`. */
  bloqueioMedido: Bloqueio | null;
  /** V2-3c: o 1º contato limpo do golpe abre um FILME? null = não medido (flag desligada); só especiais (e o FOUETTÉ) podem ser true. */
  filme: boolean | null;
  notas: string[];
};

const SEM_ACERTO: ReadonlySet<TipoGolpe> = new Set<TipoGolpe>(['troca', 'aparar']);

/**
 * Quantos ticks (contados do 1º do ensaio) manter ESP apertado para soltar com a carga EXATAMENTE no limiar do nível `n`.
 * O golpe para em mt = S−1 e soma 1 à carga por tick segurado a partir desse tick: segurar até o tick H deixa
 * carga = H − (S−1) + 1. n = 1 é só um toque. Quem confere é o teste (dano do nível = `carga.porNivel[n−1].dmg × pow`).
 */
export function ticksParaNivel(S: number, niveis: readonly number[], n: number): number {
  if (n <= 1) return 0;
  return S - 2 + (niveis[n - 1] as number);
}

/** Mede UM golpe (ou uma variante dele) de um lutador na ficha dada. */
export function medirGolpe(elenco: Elenco, id: IdLutador, ficha: string | null, golpe: NomeGolpe, nivelCarga: number | null = null, motorV2?: MotorV2): MedidaGolpe {
  const filmes = motorV2?.filmes === true;
  const base = elenco[id];
  const ch = ficha === null ? base : (base.fichas[ficha] as typeof base);
  const mv = ch.moves[golpe];
  const caixaDef = ch.boxes[golpe];
  const segurar = nivelCarga !== null && mv.carga ? ticksParaNivel(mv.S, mv.carga.niveis, nivelCarga) : undefined;
  const alvoNoAr = mv.agarrao?.alvo === 'ar';
  const notas: string[] = [];
  const cen = (extra: Partial<Cenario> & Pick<Cenario, 'd' | 'dummy' | 'parar'>): Cenario => ({
    elenco,
    id,
    ficha,
    golpe,
    ...(segurar !== undefined ? { segurar } : {}),
    ...(alvoNoAr ? { alvoNoAr: true } : {}),
    ...(filmes ? { filmes: true } : {}),
    ...extra,
  });

  const medida: MedidaGolpe = {
    lutador: id,
    ficha,
    golpe,
    variante: nivelCarga !== null ? `nível ${nivelCarga}` : null,
    nome: mv.name ?? null,
    tipo: mv.type ?? null,
    nominal: {
      S: mv.S,
      A: mv.A,
      R: golpe === '_lag' ? 0 : mv.R,
      dmg: mv.proj?.dmg ?? mv.dmg ?? null,
      hs: mv.hs ?? mv.proj?.hs ?? null,
      bs: mv.bs ?? null,
      lvl: mv.lvl ?? 'mid',
      custo: mv.cost ?? null,
      pow: ch.pow,
    },
    caixa: caixaDef ? { fx: caixaDef.fx, w: caixaDef.w, fy: caixaDef.fy, h: caixaDef.h, alcanceEstatico: caixaDef.fx + caixaDef.w } : null,
    inicio: null,
    ativos: null,
    recuperacao: null,
    total: null,
    alcance: null,
    dRef: null,
    dano: null,
    acertos: null,
    hitstun: null,
    derruba: false,
    vantagemAcerto: null,
    blockstun: null,
    vantagemBloqueio: null,
    raspao: null,
    bloqueioMedido: null,
    filme: filmes ? false : null,
    notas,
  };

  // 1) Tempos: o boneco está IMUNE (não reage), a 200 px, para o REVERS poder cruzar e o salto com alvo ter para onde ir.
  let tempo = ensaiar(cen({ d: 200, dummy: 'stand', imune: true, parar: 'completo' }));
  // REVERS (`through`) só vale depois de cruzar o rival: se o percurso não chega a 200 px, repete com ele mais perto.
  if (tempo.inicio === null && mv.through) tempo = ensaiar(cen({ d: 100, dummy: 'stand', imune: true, parar: 'completo' }));
  let inicio = tempo.inicio;
  let ativos = tempo.ativos;
  if (inicio === null) {
    // Golpes sem caixa de acerto: o instante que importa é outro.
    if (mv.type === 'fire') {
      inicio = (mv.shots ?? [mv.S])[0] as number;
      ativos = 1;
      notas.push('projétil: início = tick do 1º tiro');
    } else if (mv.throw) {
      inicio = mv.S;
      ativos = mv.agarrao?.janela ?? 1;
      notas.push('agarrão: ativos = janela de teste');
    } else if (mv.type === 'aparar') {
      inicio = mv.S;
      ativos = mv.A;
      notas.push('PARADE: ativos = janela de aparar');
    } else if (mv.type === 'troca') {
      inicio = mv.S;
      ativos = 1;
      notas.push('troca de ficha em mt = S');
    } else notas.push('a caixa de acerto nunca valeu neste ensaio');
  }
  medida.inicio = inicio;
  medida.ativos = ativos;
  medida.total = tempo.livreAtacante;
  if (inicio !== null && tempo.livreAtacante !== null) medida.recuperacao = Math.max(0, tempo.livreAtacante - inicio - ativos);
  if (mv.air) notas.push('aéreo: ativos até pousar');
  if (segurar !== undefined && segurar > 0) notas.push(`início inclui ${segurar} ticks segurando ESP`);
  if (mv.type === 'rebote') notas.push('RESORTE: início inclui a ida até a corda');

  if (SEM_ACERTO.has(mv.type as TipoGolpe)) {
    notas.push('sem acerto (efeito de defesa/postura)');
    return medida;
  }

  // 2) Alcance: varredura contra o boneco parado.
  const parado = (d: number): boolean => ensaiar(cen({ d, dummy: 'stand', parar: 'conexao' })).conectou;
  const alcance = varrerAlcance(parado);
  medida.alcance = alcance;
  if (alcance.min === null) {
    notas.push('NÃO conecta em nenhuma distância de 78 a 780');
    return medida;
  }
  if (alcance.furos > 0) notas.push(`faixa de alcance com ${alcance.furos} furo(s) na varredura de ${ARENA.passo} px`);
  if (alcance.noTeto) notas.push('conecta até o teto da varredura (780)');

  // 3) Acerto: no ponto mais próximo de 90 px em que conecta.
  const dRef = Math.max(alcance.min, Math.min(90, alcance.max as number));
  const ref = parado(dRef) ? dRef : alcance.min;
  medida.dRef = ref;
  const acerto = ensaiar(cen({ d: ref, dummy: 'stand', parar: 'completo' }));
  medida.dano = acerto.danoNoBoneco;
  medida.acertos = acerto.acertos;
  medida.derruba = acerto.caiu;
  medida.hitstun = acerto.ticksEmHit > 0 ? acerto.ticksEmHit : null;
  if (filmes) medida.filme = acerto.filmes === 1;
  if (acerto.livreAtacante !== null && acerto.livreDefensor !== null) medida.vantagemAcerto = acerto.livreDefensor - acerto.livreAtacante;
  if (acerto.momentoNoAcerto > 0) notas.push(`momento no acerto ${Math.round(acerto.momentoNoAcerto)} px`);

  // 4) Bloqueio: contra `block` (em pé) e `crouchblock`. Quem segura o golpe define o nível medido.
  if (!alvoNoAr && !mv.throw) {
    const embPe = ensaiar(cen({ d: ref, dummy: 'block', parar: 'completo' }));
    const agachado = ensaiar(cen({ d: ref, dummy: 'crouchblock', parar: 'completo' }));
    const seguraEmPe = embPe.bloqueios > 0 && embPe.acertos === 0;
    const seguraAgachado = agachado.bloqueios > 0 && agachado.acertos === 0;
    // Errar o boneco agachado NÃO é "não bloqueável": é só um golpe alto (a caixa de acerto passa por cima da hurtbox
    // de 56%). O nível só é "over" quando o agachado é ATINGIDO e o em pé bloqueia; golpe que erra agachado herda o declarado.
    const erraAgachado = agachado.bloqueios === 0 && agachado.acertos === 0;
    if (seguraEmPe && seguraAgachado) medida.bloqueioMedido = 'mid';
    else if (seguraEmPe && erraAgachado) {
      medida.bloqueioMedido = medida.nominal.lvl === 'over' ? 'over' : 'mid';
      notas.push('erra o boneco agachado (golpe alto)');
    } else if (seguraEmPe) medida.bloqueioMedido = 'over';
    else if (seguraAgachado) medida.bloqueioMedido = 'low';
    else medida.bloqueioMedido = 'nenhum';
    const bom = seguraEmPe ? embPe : seguraAgachado ? agachado : null;
    if (bom) {
      medida.blockstun = bom.ticksEmBlock > 0 ? bom.ticksEmBlock : null;
      medida.raspao = bom.danoNoBoneco;
      if (bom.livreAtacante !== null && bom.livreDefensor !== null) medida.vantagemBloqueio = bom.livreDefensor - bom.livreAtacante;
    }
    if (embPe.quebras > 0) notas.push('QUEBRA A GUARDA: atordoa mesmo bloqueando');
    if (medida.bloqueioMedido !== medida.nominal.lvl) notas.push(`nível medido ${medida.bloqueioMedido} ≠ declarado ${medida.nominal.lvl}`);
  } else {
    medida.bloqueioMedido = 'nenhum';
    if (mv.throw) notas.push('agarrão: não bloqueável');
  }
  return medida;
}

/** Todas as medidas de um lutador: a ficha base e cada ficha, todos os golpes (menos `_lag`), cada nível da carga. */
export function medirLutador(elenco: Elenco, id: IdLutador, motorV2?: MotorV2): MedidaGolpe[] {
  const base = elenco[id];
  const saida: MedidaGolpe[] = [];
  const fichas: (string | null)[] = [null, ...Object.keys(base.fichas)];
  for (const ficha of fichas) {
    const ch = ficha === null ? base : (base.fichas[ficha] as typeof base);
    const nomes = (Object.keys(ch.moves) as NomeGolpe[]).filter((n) => n !== '_lag');
    for (const golpe of nomes) {
      const mv = ch.moves[golpe];
      if (mv.carga) {
        for (let n = 1; n <= mv.carga.niveis.length; n++) saida.push(medirGolpe(elenco, id, ficha, golpe, n, motorV2));
      } else saida.push(medirGolpe(elenco, id, ficha, golpe, null, motorV2));
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------------------------------
// Verificador de COMBOS PRÓPRIOS (docs/spec-revisao-motor-luta-v2.md §6.2, fatia V2-4)
// ---------------------------------------------------------------------------------------------------------------------

/*
 * Cada sequência de `combosProprios` roda numa `Game` real em modo treino, contra o boneco com a guarda em pé e agachada, com `motorV2.combos` E
 * `motorV2.filmes` ligados (o estado de destino: o especial do fim leva o filme) e SEM o teto de combo (`semTetoDeCombo`): o dano medido é
 * o que o DESENHO do combo dá, não o que a rede do teto deixa passar. O atacante é um jogador ideal: aperta o botão do passo seguinte
 * assim que o anterior acerta (o cancelamento sai no 1º tick acionável). O boneco não bloqueia o 1º golpe (está parado em pé); depois dele passa a
 * bloquear (em pé: `block`; agachado: `crouchblock`), então um elo que dá folga vira bloqueio e o verificador pega. Atenção: o `crouching`
 * do `Fighter` só se atualiza em estado livre, então quem estava de guarda baixa quando apanhou continua com a caixa baixa durante o
 * atordoamento e os golpes ALTOS (hp/hk de quase todos) passam por cima: o combo não é à prova de "agachar antes do 1º golpe".
 *
 * Falha se: algum golpe é bloqueado, erra, ou não encadeia; o boneco fica livre (ou cai) antes do último golpe; o dano passa de
 * `TETO_COMBO` x vida do boneco; ou a sequência não tem nenhuma propriedade que a cadeia universal por rank não dê.
 */

/** Distância (centro a centro) em que o combo começa: a de referência das medidas de dano e vantagem. */
export const DISTANCIA_DO_COMBO = 90;
/** Ticks extras depois do último acerto, para o rival cair/pousar e a posição final valer. */
const TICKS_DEPOIS_DO_COMBO = 70;
const MAX_TICKS_COMBO = 600;

export type PosturaDoCombo = 'em pé' | 'agachado';

export type EnsaioCombo = {
  postura: PosturaDoCombo;
  /** Quantos passos acertaram (de `sequencia.length`). */
  acertos: number;
  /** A 1ª falha, em português; null = a sequência inteira acertou sem folga. */
  falha: string | null;
  /** Queda de vida do boneco no combo inteiro, SEM o teto. */
  dano: number;
  /** Como o rival ficou: caído?, distância final até o atacante, trocou de lado?, pico de altura (px acima do chão), x final dele. */
  fim: { caiu: boolean; distancia: number; trocouDeLado: boolean; pico: number; x: number };
};

export type VerificacaoCombo = {
  lutador: IdLutador;
  ficha: string | null;
  id: string;
  nome: string;
  sequencia: readonly NomeGolpe[];
  emPe: EnsaioCombo;
  agachado: EnsaioCombo;
  /** O maior dano entre as duas posturas e o limite (TETO_COMBO x vida do boneco). */
  dano: number;
  limite: number;
  /** O que a cadeia universal não dá a esta sequência (vazio = é só a cadeia universal). */
  identidade: string[];
  falhas: string[];
  ok: boolean;
};

/**
 * `TETO_COMBO` x a MENOR vida do elenco: o limite de dano de um combo próprio (0,4 x 92 = 36,8, a vida do BAATAR). É a vida de quem mais sofre
 * o combo, não a do boneco (106): o limite vale para o combo inteiro contra qualquer rival.
 */
export function limiteDeDano(elenco: Elenco): number {
  return TETO_COMBO * Math.min(...Object.values(elenco).map((l) => l.hp));
}

/** O que a sequência tem que a cadeia universal POR FORÇA (R-8: fraco > forte > especial, no máximo 2 fracos, forte > forte fora; derrubada encerra) não dá. */
export function identidadeDoCombo(elenco: Elenco, id: IdLutador, ficha: string | null, combo: ComboProprio): string[] {
  const base = elenco[id];
  const ch = ficha === null ? base : (base.fichas[ficha] as typeof base);
  const saida: string[] = [];
  const ranks: number[] = [];
  for (let i = 0; i < combo.sequencia.length; i++) {
    const depois = ch.moves[combo.sequencia[i] as NomeGolpe];
    const antes = i > 0 ? ch.moves[combo.sequencia[i - 1] as NomeGolpe] : null;
    if (antes) {
      const repete = !!antes.rep && antes.id === depois.id;
      if (!cadeiaPermite(ranks, depois.rank, repete)) saida.push(`${antes.id} (${forcaDoRank(antes.rank) ?? '?'}) cancela em ${depois.id} (${forcaDoRank(depois.rank) ?? '?'}) fora da cadeia por força`);
    }
    ranks.push(depois.rank);
  }
  // BÁSICO (fraco > forte > especial) cujo forte já segura em pé sem `semQueda` (o `hp` da NILA não derruba): a forma é a identidade (spec §3.5.2).
  const forcas = ranks.map(forcaDoRank);
  const meio = ch.moves[combo.sequencia[1] as NomeGolpe];
  if (forcas.length === 3 && forcas[0] === 'fraco' && forcas[1] === 'forte' && forcas[2] === 'especial' && !meio.kd && (combo.semQueda?.length ?? 0) === 0) {
    saida.push(`BÁSICO: ${meio.id} já segura em pé`);
  }
  if ((combo.semQueda?.length ?? 0) > 0) saida.push(`${combo.semQueda?.map((i) => combo.sequencia[i]).join(', ')} sem queda`);
  if (combo.final !== undefined && combo.final !== 'derruba') saida.push(`final '${combo.final}'`);
  return saida;
}

function ensaiarCombo(elenco: Elenco, id: IdLutador, ficha: string | null, combo: ComboProprio, postura: PosturaDoCombo): EnsaioCombo {
  const sequencia = combo.sequencia;
  const g = new Game({ lutadores: elenco, rng: criarRng(1) });
  // `ritmo.cadeia` (R-8) é parte do estado de destino: o cancelamento só sai em acerto confirmado e a força manda (a sequência TEM que passar por essa regra)
  g.setup({ mode: 'training', c1: id, c2: BONECO, motorV2: { combos: true, filmes: true }, ritmo: { cadeia: true } }, { rounds: 2, time: 99, shake: false });
  g.phase = 'fight';
  g.t = 0;
  g.semTetoDeCombo = true;
  g.trocarAlvoDoTreino('stand'); // o 1º golpe pega o boneco desprevenido (em pé); a guarda dele só começa depois dele
  const p1 = g.p1;
  const p2 = g.p2;
  p1.trocarFicha(ficha);
  const frame = quadroVazio();
  const fonte: FonteEntradas = { p1: () => ({ ...frame }), p2: () => quadroVazio() };
  p1.x = ARENA.centro - DISTANCIA_DO_COMBO / 2;
  p2.x = ARENA.centro + DISTANCIA_DO_COMBO / 2;
  p1.facing = 1;
  p2.facing = -1;
  p1.en = 100;
  for (let i = 0; i < 3; i++) g.update(fonte);
  p1.x = ARENA.centro - DISTANCIA_DO_COMBO / 2;
  p2.x = ARENA.centro + DISTANCIA_DO_COMBO / 2;
  p2.vx = 0;
  const lado0 = Math.sign(p2.x - p1.x);

  const r: EnsaioCombo = { postura, acertos: 0, falha: null, dano: 0, fim: { caiu: false, distancia: 0, trocouDeLado: false, pico: 0, x: 0 } };
  const total = sequencia.length;
  let atkAntes = p1.atkId; // `atkId` antes de o passo atual começar (`startMove` o incrementa)
  let iniciado = false;
  let ticksDepois = 0;
  const hpInicial = p2.hp;
  for (let i = 0; i < MAX_TICKS_COMBO && r.falha === null; i++) {
    // O botão (e a direção) do passo atual fica apertado até o golpe começar; sem passo pendente, solta tudo.
    Object.assign(frame, quadroVazio());
    if (r.acertos < total && !iniciado) Object.assign(frame, moveInput(sequencia[r.acertos] as NomeGolpe, 1));
    g.update(fonte);
    if (!iniciado && r.acertos < total && p1.atkId > atkAntes) iniciado = true;
    const passo = r.acertos;
    for (const e of g.events as readonly EventoLuta[]) {
      if (!('atacante' in e) || e.atacante !== 0) continue;
      if (e.tipo === 'block' || e.tipo === 'quebra-guarda') r.falha ??= `passo ${passo + 1} (${sequencia[passo]}) foi bloqueado`;
      else if (e.tipo === 'armor' || e.tipo === 'parry') r.falha ??= `passo ${passo + 1} (${sequencia[passo]}) foi absorvido (${e.tipo})`;
      else if ((e.tipo === 'hit' || e.tipo === 'throw') && iniciado && r.acertos === passo && passo < total) {
        r.acertos++;
        if (passo === 0) g.trocarAlvoDoTreino(postura === 'em pé' ? 'block' : 'crouchblock');
        atkAntes = p1.atkId;
        iniciado = false;
      }
    }
    if (r.falha !== null) break;
    const n = r.acertos;
    if (n < total) {
      // Entre dois golpes o rival tem que seguir atordoado (nem livre, nem caído) e o atacante tem que continuar no golpe até o próximo começar.
      if (n > 0 && LIVRES.has(p2.state)) r.falha = `o boneco ficou livre depois do passo ${n} (${sequencia[n - 1]}) e antes do ${n + 1}`;
      else if (n > 0 && (p2.state === 'down' || p2.state === 'ko')) r.falha = `o boneco caiu no passo ${n} (${sequencia[n - 1]}): o passo ${n + 1} não tem em quem bater`;
      else if (n > 0 && !iniciado && p1.state !== 'move') r.falha = `o passo ${n + 1} (${sequencia[n]}) não encadeou: o cancelamento não saiu antes de ${sequencia[n - 1]} acabar`;
      else if (iniciado && p1.state !== 'move') r.falha = `o passo ${n + 1} (${sequencia[n]}) errou o boneco`;
      else if (n === 0 && !iniciado && i > 120) r.falha = `o passo 1 (${sequencia[0]}) não saiu`;
    }
    r.fim.pico = Math.max(r.fim.pico, GROUND - p2.y);
    if (r.acertos === total && ++ticksDepois > TICKS_DEPOIS_DO_COMBO) break;
  }
  if (r.falha === null && r.acertos < total) r.falha = `só ${r.acertos} de ${total} golpes acertaram`;
  r.dano = hpInicial - p2.hp;
  r.fim.caiu = p2.state === 'down' || p2.state === 'ko';
  r.fim.distancia = Math.abs(p2.x - p1.x);
  r.fim.trocouDeLado = Math.sign(p2.x - p1.x) !== lado0;
  r.fim.x = p2.x;
  return r;
}

/** Verifica UM combo próprio (spec §6.2): as duas posturas, o limite de dano e a identidade. */
export function verificarCombo(elenco: Elenco, id: IdLutador, ficha: string | null, combo: ComboProprio): VerificacaoCombo {
  const emPe = ensaiarCombo(elenco, id, ficha, combo, 'em pé');
  const agachado = ensaiarCombo(elenco, id, ficha, combo, 'agachado');
  const limite = limiteDeDano(elenco);
  const dano = Math.max(emPe.dano, agachado.dano);
  const identidade = identidadeDoCombo(elenco, id, ficha, combo);
  const falhas: string[] = [];
  if (emPe.falha) falhas.push(`em pé: ${emPe.falha}`);
  if (agachado.falha) falhas.push(`agachado: ${agachado.falha}`);
  if (dano > limite + 1e-9) falhas.push(`dano ${dano.toFixed(1)} passa de ${limite.toFixed(1)} (${Math.round(TETO_COMBO * 100)}% da menor vida do elenco) sem o teto`);
  if (identidade.length === 0) falhas.push('sem propriedade nova: é só a cadeia universal por força');
  return { lutador: id, ficha, id: combo.id, nome: combo.nome, sequencia: combo.sequencia, emPe, agachado, dano, limite, identidade, falhas, ok: falhas.length === 0 };
}

/** Todos os combos próprios de todos os lutadores (a ficha base e cada ficha que traz a SUA lista). */
export function verificarCombos(elenco: Elenco, ids: readonly IdLutador[]): VerificacaoCombo[] {
  const saida: VerificacaoCombo[] = [];
  for (const id of ids) {
    const base = elenco[id];
    const doBase = base.combosProprios;
    for (const c of doBase ?? []) saida.push(verificarCombo(elenco, id, null, c));
    for (const [nome, ficha] of Object.entries(base.fichas)) {
      // Ficha sem lista própria herda a da base (já verificada acima); só as que trazem a sua entram.
      if (ficha.combosProprios && ficha.combosProprios !== doBase) for (const c of ficha.combosProprios) saida.push(verificarCombo(elenco, id, nome, c));
    }
  }
  return saida;
}
