import type { Elenco } from '../assets/elenco';
import { ALTURA, GROUND, LARGURA, SH } from '../core/constantes';
import type { EventoLuta, IdLutador, IndiceLutador, LeituraLuta, LutadorLeitura, PoseAtual, ProjetilLeitura, EstiloProjetil } from '../core/contratos';
import { clamp } from '../core/math';
import { criarRng, type Rng } from '../core/rng';
import type { LutadorMontado } from '../data/montar';
import { POSE_DO_MOTOR, type BatidaFilme, type DesvioDoRival, type FocoDaCamera, type RoteiroFilme, type SomDaBatida } from '../data/roteiros-filme';
import type { PoseDados } from '../data/tipos';
import { aplicarCamera } from './camera';
import { desenharAssinatura, mistura, VIDA_ASSINATURA } from './estilos-especiais';
import { identidadeDe, identidadePadrao, type Identidade } from './identidade-especiais';
import { chDaFicha } from './lutador';
import { desenharRetrato } from './retrato';
import type { Ctx } from './tela';
import { textoArcade } from './texto';

/*
 * O FILME DO ESPECIAL na UI (docs/spec-revisao-motor-luta-v2.md §3.5, docs/roteiros-filme-especiais.md). É APRESENTAÇÃO: o motor já resolveu tudo no tick do contato
 * (dano, KO, troca de barra, estado final de queda) e emitiu o evento `filme`; enquanto o filme roda a cena NÃO chama `game.update` (como a cinemática e a pausa), então
 * pular o filme só encurta a apresentação e o hash do motor não muda. Aqui moram: a linha do tempo PURA (batidas, CURTA, pulo), as trajetórias entre `antes` e `depois`,
 * a câmera, o HUD que desce por batida e termina em `hp` do motor, e a classe que dispara sons/efeitos por batida e desenha por cima do mundo.
 */

export type EventoFilme = Extract<EventoLuta, { tipo: 'filme' }>;
export type ModoFilme = 'completa' | 'curta';

/** Qualquer ataque de um humano só pula a partir deste tick (a regra da entrada do chefão: `tick < 10` recusa). */
export const TICKS_PARA_PULAR = 10;
/** Ao pular, o filme fecha em até este tanto de ticks. */
export const TICKS_DA_SAIDA_AO_PULAR = 6;
/** Duração (ticks) em que uma batida com dano desce a barra do HUD. */
const TICKS_DA_DESCIDA = 5;
/** A barra vermelha (dano recente) alcança a amarela tantos ticks depois. */
const ATRASO_DO_RASTRO = 8;
const TICKS_DA_CAMERA = 4;
/** Recuo do rival na batida da reação e picos do arco por tipo de final (§1.3). */
const RECUO_DA_REACAO = 12;
const PICO_DO_ARCO = { derruba: 70, lanca: 150, parede: 0 } as const;
const QUICO_NA_PAREDE = 20;
/** Teto do zoom do mundo em foco: 1,30; BAATAR 1,25; ZENON 1,10; arte antiga (`legacy`) 1,20. */
export const ZOOM_PADRAO = 1.3;
const TETOS_POR_LUTADOR: Readonly<Record<string, number>> = { baatar: 1.25, zenon: 1.1 };
const ZOOM_LEGACY = 1.2;
/** O tremor do MASHI por nível de carga (§1.3). */
const MULT_DO_NIVEL = [1, 1, 1.25, 1.5] as const;
/** O contador "N HITS" não sobe acima disto (o HUD de cima ocupa até ~y 80). */
const HITS_MIN_Y = 178;
const TREMOR_POR_SOM: Readonly<Record<SomDaBatida, number>> = { leve: 1.5, pesado: 4, final: 7 };

const lerp = (a: number, b: number, k: number): number => a + (b - a) * k;
const facil = (k: number): number => 1 - (1 - clamp(k, 0, 1)) ** 3;

// ----------------------------------------------------------------------------------------------------------------------- linha do tempo (pura)
export type BatidaEfetiva = BatidaFilme & {
  /** Índice na lista COMPLETA do roteiro. */
  readonly orig: number;
  /** Tick de início no modo atual. */
  readonly ini: number;
};

/**
 * As batidas que tocam no `modo`. CURTA: só as que têm `tc` (que passa a ser o início); o peso das cortadas soma na PRIMEIRA que toca depois delas
 * (as que sobram no fim vão para a última), então a soma dos pesos continua 1.
 */
export function batidasEfetivas(r: RoteiroFilme, modo: ModoFilme): readonly BatidaEfetiva[] {
  if (modo === 'completa') return r.batidas.map((b, orig) => ({ ...b, orig, ini: b.t }));
  const saida: BatidaEfetiva[] = [];
  let pendente = 0;
  r.batidas.forEach((b, orig) => {
    if (b.tc === undefined) {
      pendente += b.peso;
      return;
    }
    saida.push({ ...b, orig, ini: b.tc, peso: b.peso + pendente });
    pendente = 0;
  });
  if (pendente > 0 && saida.length > 0) {
    const ultima = saida[saida.length - 1] as BatidaEfetiva;
    saida[saida.length - 1] = { ...ultima, peso: ultima.peso + pendente };
  }
  return saida;
}

export const duracaoDoFilme = (r: RoteiroFilme, modo: ModoFilme): number => (modo === 'completa' ? r.duracao : r.curta);

/** Quando o filme fecha (tick da cena): o fim normal, ou `TICKS_DA_SAIDA_AO_PULAR` depois do pulo. */
export const fimDoFilme = (duracao: number, pulouEm: number | null): number => (pulouEm === null ? duracao : Math.min(duracao, pulouEm + TICKS_DA_SAIDA_AO_PULAR));

/** O tempo DO ROTEIRO no tick `t` da cena: igual a `t`, e depois do pulo acelerado para chegar ao fim do roteiro no último quadro desenhado. */
export function tempoEfetivo(duracao: number, t: number, pulouEm: number | null): number {
  if (pulouEm === null || t <= pulouEm) return Math.min(t, duracao);
  const k = Math.max(1, (duracao - pulouEm) / (TICKS_DA_SAIDA_AO_PULAR - 1));
  return Math.min(duracao, pulouEm + (t - pulouEm) * k);
}

/** Índice (na lista efetiva) da batida que está tocando em `tEf`. */
export function indiceDaBatida(eff: readonly BatidaEfetiva[], tEf: number): number {
  let i = 0;
  for (let j = 0; j < eff.length; j++) if ((eff[j] as BatidaEfetiva).ini <= tEf) i = j;
  return i;
}

export interface DanoDasBatidas {
  /** Quanto da barra já saiu DEPOIS de cada batida (acumulado exato; a última com dano fecha em `dano`). */
  readonly acumulado: readonly number[];
  /** O número mostrado em cada batida (inteiro; a soma é `Math.round(dano)` e o resto vai na última batida com dano). */
  readonly numeros: readonly number[];
  /** Índice (efetivo) da última batida com dano, ou -1. */
  readonly ultima: number;
}

export function danoDasBatidas(eff: readonly BatidaEfetiva[], dano: number): DanoDasBatidas {
  const ultima = eff.reduce((u, b, i) => (b.peso > 0 ? i : u), -1);
  const acumulado: number[] = [];
  const numeros: number[] = [];
  let soma = 0;
  let anterior = 0;
  eff.forEach((b, i) => {
    soma += b.peso;
    const acc = i >= ultima && ultima >= 0 ? dano : dano * soma;
    acumulado.push(acc);
    numeros.push(Math.round(acc) - Math.round(anterior));
    anterior = acc;
  });
  return { acumulado, numeros, ultima };
}

/** Quanto da barra do rival já saiu em `tEf`: cada batida com dano a desce em `TICKS_DA_DESCIDA` ticks. */
export function danoAteAgora(eff: readonly BatidaEfetiva[], d: DanoDasBatidas, tEf: number): number {
  if (tEf < 0 || eff.length === 0) return 0;
  const i = indiceDaBatida(eff, tEf);
  const b = eff[i] as BatidaEfetiva;
  const antes = i === 0 ? 0 : (d.acumulado[i - 1] as number);
  const depois = d.acumulado[i] as number;
  return lerp(antes, depois, facil((tEf - b.ini) / TICKS_DA_DESCIDA));
}

export interface HudDoRival {
  readonly hp: number;
  readonly hpShown: number;
  readonly barras: number;
}

/**
 * O que o HUD mostra para o rival em `tEf`. `antes` = o estado dele no tick anterior ao contato; `motor` = o estado de agora (já com o filme aplicado).
 * A barra desce por batida e no último quadro bate com `hp` do motor. Na troca de barra a barra velha esvazia (com `barras` antigo) e a nova entra quando as
 * batidas com dano acabam.
 */
export function hudDoRival(
  eff: readonly BatidaEfetiva[],
  d: DanoDasBatidas,
  tEf: number,
  antes: HudDoRival,
  motor: HudDoRival,
  trocaDeBarra: boolean,
): HudDoRival {
  const saiu = danoAteAgora(eff, d, tEf);
  const rastro = antes.hp - danoAteAgora(eff, d, tEf - ATRASO_DO_RASTRO);
  if (trocaDeBarra) {
    // a barra nova entra 8 ticks depois da última batida com dano (a descida leva 5; sobram 3 com a barra vazia)
    const fim = d.ultima >= 0 ? (eff[d.ultima] as BatidaEfetiva).ini + TICKS_DA_DESCIDA + 3 : Infinity;
    if (tEf >= fim) return motor;
    const hp = Math.max(0, antes.hp - saiu);
    return { hp, hpShown: Math.max(hp, rastro), barras: antes.barras };
  }
  const hp = Math.max(motor.hp, antes.hp - saiu);
  return { hp, hpShown: Math.max(hp, rastro, Math.min(motor.hpShown, antes.hp)), barras: motor.barras };
}

// ----------------------------------------------------------------------------------------------------------------------- trajetórias e câmera
export type Ponto = { x: number; y: number; facing: 1 | -1 };
export type PontoComGiro = Ponto & { rot: number };
export interface PosicoesDoFilme {
  readonly atacante: Ponto;
  readonly rival: PontoComGiro;
}

/** Onde o rival fica numa batida de agarrão (o atlas desenha o agarrão SEM o rival: quem o põe na mão é o filme). */
function posicaoDoAgarrao(a: Ponto, altura: number, p: DesvioDoRival): PontoComGiro {
  return { x: a.x + a.facing * p.dx, y: a.y - (p.dy ?? 0) - (p.dyAltura ?? 0) * altura, facing: a.facing === 1 ? -1 : 1, rot: p.rot ?? 0 };
}

export function posicoesDoFilme(
  r: RoteiroFilme,
  eff: readonly BatidaEfetiva[],
  tEf: number,
  ev: Pick<EventoFilme, 'antes' | 'depois' | 'final'>,
  alturaDoAtacante: number,
): PosicoesDoFilme {
  const ini = (orig: number): number => (eff.find((b) => b.orig === orig) ?? (eff[eff.length - 1] as BatidaEfetiva)).ini;
  const m = r.marcos;
  const tImpacto = ini(m.impacto);
  const tReacao = ini(m.reacao);
  const tLanc = ini(m.lancamento);
  const tQueda = ini(m.queda);
  const tPouso = ini(m.pouso ?? m.queda);
  const aA = ev.antes.atacante;
  const aD = ev.depois.atacante;
  const dA = ev.antes.defensor;
  const dD = ev.depois.defensor;

  // atacante: parado em `antes` até o impacto; depois reto até `depois`
  let atacante: Ponto;
  if (tEf >= tPouso) atacante = { ...aD };
  else if (tEf < tImpacto) atacante = { ...aA };
  else {
    const u = clamp((tEf - tImpacto) / Math.max(1, tPouso - tImpacto), 0, 1);
    atacante = { x: lerp(aA.x, aD.x, u), y: lerp(aA.y, aD.y, u), facing: aA.facing };
  }
  atacante.facing = tEf >= tLanc ? aD.facing : aA.facing;

  // overrides do agarrão: a última batida (já tocada) com `rivalPos`
  const comPos = eff.filter((b) => b.rivalPos !== undefined);
  const dono = (t: number): BatidaEfetiva | undefined => [...comPos].reverse().find((b) => b.ini <= t);
  const mundoDe = (b: BatidaEfetiva): PontoComGiro => posicaoDoAgarrao(atacante, alturaDoAtacante, b.rivalPos as DesvioDoRival);

  let rival: PontoComGiro;
  if (tEf >= tQueda) rival = { ...dD, rot: 0 };
  else if (tEf < tReacao) {
    const atual = dono(tEf);
    if (atual) {
      const anterior = [...comPos].reverse().find((b) => b.ini < atual.ini);
      const de: PontoComGiro = anterior ? mundoDe(anterior) : { ...dA, rot: 0 };
      const para = mundoDe(atual);
      const k = facil((tEf - atual.ini) / 4);
      rival = { x: lerp(de.x, para.x, k), y: lerp(de.y, para.y, k), facing: para.facing, rot: lerp(de.rot, para.rot, k) };
    } else rival = { ...dA, rot: 0 };
  } else {
    // da reação até a queda: sai do ponto onde estava (recuado 12 px, ou na mão do agarrão) até `depois`, em arco
    const atualNaReacao = dono(tReacao);
    const away = Math.sign(dA.x - aA.x) || aA.facing;
    const inicio: PontoComGiro = atualNaReacao ? mundoDe(atualNaReacao) : { x: dA.x + away * RECUO_DA_REACAO, y: dA.y, facing: dA.facing, rot: 0 };
    const s = clamp((tEf - tReacao) / Math.max(1, tQueda - tReacao), 0, 1);
    const e = facil(s);
    const p = clamp((tLanc - tReacao) / Math.max(1, tQueda - tReacao), 0, 1);
    const pico = r.tipo === 'agarrao' ? 0 : PICO_DO_ARCO[ev.final];
    const arco = pico === 0 ? 0 : pico * (p <= 0 ? Math.cos((Math.PI / 2) * s) : p >= 1 || s < p ? Math.sin((Math.PI / 2) * (s / (p || 1))) : Math.cos((Math.PI / 2) * ((s - p) / (1 - p))));
    const quico = ev.final === 'parede' ? QUICO_NA_PAREDE * Math.sin(Math.PI * clamp((s - 0.75) / 0.25, 0, 1)) : 0;
    rival = {
      x: lerp(inicio.x, dD.x, e) - away * quico,
      y: lerp(inicio.y, dD.y, e) - arco,
      facing: tEf >= tLanc ? dD.facing : (atualNaReacao ? inicio.facing : dA.facing),
      rot: lerp(inicio.rot, 0, e),
    };
  }
  return { atacante, rival };
}

export interface CameraDoFilme {
  x: number;
  z: number;
}

/** O teto do zoom com o lutador em foco: 1,30 (1,20 com a arte antiga); BAATAR 1,25; ZENON 1,10. */
export function tetoDeZoom(id: IdLutador | string, ch: Pick<LutadorMontado, 'legacy'>): number {
  return Math.min(TETOS_POR_LUTADOR[id] ?? ZOOM_PADRAO, ch.legacy ? ZOOM_LEGACY : ZOOM_PADRAO);
}

function alvoDaCamera(b: BatidaEfetiva | undefined, pos: PosicoesDoFilme, tetoA: number, tetoR: number, padrao: CameraDoFilme): CameraDoFilme {
  const c = b?.camera;
  if (!c) return padrao;
  const foco: FocoDaCamera = c.foco;
  const teto = foco === 'atacante' ? tetoA : foco === 'rival' ? tetoR : Math.min(tetoA, tetoR);
  const x = foco === 'atacante' ? pos.atacante.x : foco === 'rival' ? pos.rival.x : (pos.atacante.x + pos.rival.x) / 2;
  return { x: clamp(x, 160, LARGURA - 160), z: Math.max(1, Math.min(c.zoom, teto)) };
}

/** A câmera em `tEf`: vai da anterior à desta batida em `TICKS_DA_CAMERA`; a 1ª parte da câmera da luta e a ÚLTIMA volta para a câmera da luta (que a luta retoma). */
export function cameraDoFilme(
  eff: readonly BatidaEfetiva[],
  tEf: number,
  pos: PosicoesDoFilme,
  tetos: readonly [number, number],
  inicial: CameraDoFilme,
  final: CameraDoFilme,
  duracao: number = Infinity,
): CameraDoFilme {
  const i = indiceDaBatida(eff, tEf);
  const b = eff[i];
  const alvo = (j: number): CameraDoFilme => (j >= eff.length - 1 ? final : alvoDaCamera(eff[j], pos, tetos[0], tetos[1], final));
  const atual = alvo(i);
  const anterior = i === 0 ? inicial : alvo(i - 1);
  // a última batida pode durar menos que a transição (CURTA): o último quadro desenhado (`duracao - 1`) já tem de estar na câmera da luta
  const ini = b?.ini ?? 0;
  const k = facil((tEf - ini) / Math.max(1, Math.min(TICKS_DA_CAMERA, i >= eff.length - 1 ? duracao - 1 - ini : TICKS_DA_CAMERA)));
  return { x: lerp(anterior.x, atual.x, k), z: lerp(anterior.z, atual.z, k) };
}

// ----------------------------------------------------------------------------------------------------------------------- poses
export interface PoseResolvida {
  /** A pose do mundo (sempre existe: a cadeia de `getPD` cuida do resto). */
  readonly mundo: string;
  /** Se a pose é de uma página FILME (painel): o nome dela. Ausente = desenha só no mundo. */
  readonly painel: string | null;
}

const ehCelulaDeFilme = (nome: string): boolean => /^f[0-5]$/.test(nome);

/** O nome vira pose do mundo ou painel: `$motor` = a pose da leitura; `f0..f5` sem página (ou sem `painel: true`) cai no `Alt`. */
export function resolverPoseDoFilme(ch: Pick<LutadorMontado, 'pd'>, nome: string, alt: string | undefined, doMotor: string): PoseResolvida {
  if (nome === POSE_DO_MOTOR) return { mundo: doMotor, painel: null };
  if (!ehCelulaDeFilme(nome)) return { mundo: nome, painel: null };
  const pd = ch.pd[nome] as (PoseDados & { painel?: boolean }) | undefined;
  if (!pd) return { mundo: alt ?? doMotor, painel: null };
  return pd.painel === true ? { mundo: alt ?? doMotor, painel: nome } : { mundo: nome, painel: null };
}

// ----------------------------------------------------------------------------------------------------------------------- o filme
export interface OpcoesFilme {
  readonly rng?: Rng;
  /** Som da batida (a UI toca a assinatura do lutador). `nivel` = carga do MASHI (0 = sem). */
  readonly aoSom?: (som: SomDaBatida, atacante: IndiceLutador, nivel: number) => void;
  /** Uma batida com dano acertou em (x, y) do mundo. */
  readonly aoImpacto?: (i: { x: number; y: number; cor: string; grande: boolean; contragolpe: boolean }) => void;
  readonly aoMoedas?: () => void;
  /** O rival chegou ao chão (`dust` do motor, adiado). */
  readonly aoQueda?: () => void;
}

export interface IniciarFilme {
  readonly ev: EventoFilme;
  readonly roteiro: RoteiroFilme;
  readonly modo: ModoFilme;
  /** O rival no tick ANTERIOR ao contato (a barra parte daqui). */
  readonly rivalAntes: HudDoRival;
  /** Cor das faíscas do impacto (o `brilho` da paleta do especial). */
  readonly cor: string;
  /** Altura do atacante em px (SH x escala), para o agarrão. */
  readonly alturaDoAtacante: number;
  /** A câmera da luta no momento do contato (a 1ª batida parte dela). */
  readonly cameraInicial: CameraDoFilme;
}

interface Numero {
  x: number;
  y: number;
  valor: number;
  idade: number;
}
interface Marca {
  x: number;
  y: number;
  idade: number;
  dir: 1 | -1;
}

/** Um filme em andamento (um por vez: o motor só emite um por tick). */
export class FilmeDoEspecial {
  private cur: IniciarFilme | null = null;
  private eff: readonly BatidaEfetiva[] = [];
  private dano: DanoDasBatidas = { acumulado: [], numeros: [], ultima: -1 };
  private t = 0;
  private pulouEm: number | null = null;
  private proxima = 0;
  private hits = 0;
  private numeros: Numero[] = [];
  private marcas: Marca[] = [];
  private popDoContador = 0;
  private tremor = { amp: 0, desde: 0 };
  private sem = 1;
  private readonly rng: Rng;
  /** Os painéis da batida que está tocando (o desenho os lê). */
  private paineis: { quem: 'atacante' | 'rival'; nome: string }[] = [];
  private projetilDaBatida: ProjetilLeitura | null = null;
  private idade = 0;
  private numerosJaMostrados = 0;
  /** Quantas batidas com dano o filme já mostrou e a soma dos números mostrados (teste: é `Math.round(dano)`). */
  danosMostrados = 0;
  somaMostrada = 0;

  constructor(private readonly op: OpcoesFilme = {}) {
    this.rng = op.rng ?? criarRng(1);
  }

  get ativo(): boolean {
    return this.cur !== null;
  }

  get estado(): { tick: number; modo: ModoFilme; golpe: string; atacante: IndiceLutador; pulouEm: number | null; tEf: number; hits: number } | null {
    const c = this.cur;
    return c ? { tick: this.t, modo: c.modo, golpe: c.ev.golpe, atacante: c.ev.atacante, pulouEm: this.pulouEm, tEf: this.tEfetivo(), hits: this.hits } : null;
  }

  get duracao(): number {
    return this.cur ? duracaoDoFilme(this.cur.roteiro, this.cur.modo) : 0;
  }

  /** Os números mostrados e a soma deles (teste). */
  get numerosDoDano(): readonly number[] {
    return this.dano.numeros;
  }

  private tEfetivo(): number {
    return this.cur ? tempoEfetivo(this.duracao, this.t, this.pulouEm) : 0;
  }

  iniciar(a: IniciarFilme): void {
    this.cur = a;
    this.eff = batidasEfetivas(a.roteiro, a.modo);
    this.dano = danoDasBatidas(this.eff, a.ev.dano);
    this.t = 0;
    this.pulouEm = null;
    this.proxima = 0;
    this.hits = 0;
    this.numeros = [];
    this.marcas = [];
    this.popDoContador = 0;
    this.tremor = { amp: 0, desde: 0 };
    this.sem = Math.floor(this.rng.proximo() * 4294967296);
    this.paineis = [];
    this.projetilDaBatida = null;
    this.idade = 0;
    this.numerosJaMostrados = 0;
    this.danosMostrados = 0;
    this.somaMostrada = 0;
    this.disparar(0);
  }

  /** Pula (só a partir do tick `TICKS_PARA_PULAR`, uma vez). Devolve se pulou. */
  pular(): boolean {
    if (!this.cur || this.pulouEm !== null || this.t < TICKS_PARA_PULAR) return false;
    this.pulouEm = this.t;
    return true;
  }

  zerar(): void {
    this.cur = null;
    this.eff = [];
  }

  /** Um tick de apresentação (a luta NÃO anda). */
  avancar(): void {
    const c = this.cur;
    if (!c) return;
    this.t++;
    for (const n of this.numeros) n.idade++;
    for (const m of this.marcas) m.idade++;
    this.numeros = this.numeros.filter((n) => n.idade < 46);
    this.marcas = this.marcas.filter((m) => m.idade < VIDA_ASSINATURA);
    this.popDoContador = Math.max(0, this.popDoContador - 1 / 8);
    if (this.t >= fimDoFilme(this.duracao, this.pulouEm)) {
      this.cur = null;
      return;
    }
    this.disparar(this.tEfetivo());
  }

  /** Dispara as batidas que começaram até `tEf`. */
  private disparar(tEf: number): void {
    const c = this.cur;
    if (!c) return;
    let valorDoTick = 0;
    const primeiroDano = this.hits === 0;
    let primeiro: BatidaEfetiva | null = null;
    while (this.proxima < this.eff.length && (this.eff[this.proxima] as BatidaEfetiva).ini <= tEf) {
      const i = this.proxima++;
      const b = this.eff[i] as BatidaEfetiva;
      const acelerado = this.pulouEm !== null;
      if (b.som && (!acelerado || b.som === 'final')) this.op.aoSom?.(b.som, c.ev.atacante, c.ev.nivelCarga ?? 0);
      if (b.moedas) this.op.aoMoedas?.();
      if (b.orig === c.roteiro.marcos.queda) this.op.aoQueda?.();
      if (b.peso > 0) {
        valorDoTick += this.dano.numeros[i] as number;
        primeiro ??= b;
        this.hits++;
        this.danosMostrados++;
        this.popDoContador = 1;
        const nivel = MULT_DO_NIVEL[c.ev.nivelCarga ?? 0] ?? 1;
        const amp = TREMOR_POR_SOM[b.som ?? 'leve'] * nivel;
        this.tremor = { amp: Math.max(amp, this.tremor.amp * 0.5), desde: tEf };
      }
    }
    if (primeiro) {
      const p = this.posicoes(tEf);
      const ponto = { x: p.rival.x, y: p.rival.y - SH * 0.55 };
      this.somaMostrada += valorDoTick;
      // números seguidos não se empilham no mesmo ponto: alternam de lado e de altura
      const n = this.numerosJaMostrados++;
      if (valorDoTick > 0) this.numeros.push({ x: ponto.x + (n % 2 === 0 ? -34 : 34), y: ponto.y - 30 - (n % 3) * 18, valor: valorDoTick, idade: 0 });
      this.marcas.push({ x: ponto.x, y: ponto.y, idade: 0, dir: p.atacante.facing });
      this.op.aoImpacto?.({ x: ponto.x, y: ponto.y, cor: c.cor, grande: primeiro.som === 'final', contragolpe: c.ev.contragolpe && primeiroDano });
    }
  }

  posicoes(tEf: number = this.tEfetivo()): PosicoesDoFilme {
    const c = this.cur;
    if (!c) throw new Error('FilmeDoEspecial.posicoes: nenhum filme em andamento');
    return posicoesDoFilme(c.roteiro, this.eff, tEf, c.ev, c.alturaDoAtacante);
  }

  /**
   * A leitura a DESENHAR neste quadro: os dois lutadores na trajetória do roteiro e nas poses da batida, o HUD do rival descendo por batida, a câmera do filme e
   * o tremor por batida. Devolve um objeto novo que herda da luta (os getters como `timer` seguem valendo).
   */
  vista(luta: LeituraLuta, elenco: Elenco): LeituraLuta {
    const c = this.cur;
    if (!c) return luta;
    const tEf = this.tEfetivo();
    const i = indiceDaBatida(this.eff, tEf);
    const b = this.eff[i] as BatidaEfetiva;
    const idade = tEf - b.ini;
    this.idade = idade;
    const pos = this.posicoes(tEf);
    const ia = c.ev.atacante;
    const id = c.ev.defensor;
    const fa = luta.fighters[ia];
    const fd = luta.fighters[id];
    const cha = chDaFicha(elenco[fa.id].ch, fa.ficha);
    const chd = chDaFicha(elenco[fd.id].ch, fd.ficha);
    const pa = resolverPoseDoFilme(cha, b.atacante, b.atacanteAlt, fa.pose.name);
    const pr = resolverPoseDoFilme(chd, b.rival, b.rivalAlt, fd.pose.name);
    this.paineis = [];
    if (pa.painel) this.paineis.push({ quem: 'atacante', nome: pa.painel });
    if (pr.painel) this.paineis.push({ quem: 'rival', nome: pr.painel });

    const flip: 1 | -1 = b.alternaFlip && Math.floor(idade / 3) % 2 === 1 ? -1 : 1;
    const poseDe = (f: LutadorLeitura, nome: string, doMotor: boolean, rot: number, giro: 1 | -1): PoseAtual =>
      doMotor ? f.pose : { name: nome, dx: 0, dy: 0, sx: 1, sy: 1, rot, glow: 0, flip: giro };

    const hud = hudDoRival(
      this.eff,
      this.dano,
      tEf,
      c.rivalAntes,
      { hp: fd.hp, hpShown: fd.hpShown, barras: fd.barras },
      c.ev.trocaDeBarra,
    );
    const levando = b.peso > 0 ? Math.max(0, 8 - idade) : 0;
    const atacante: LutadorLeitura = {
      ...fa,
      id: fa.id,
      esquiva: fa.esquiva ?? 0,
      x: pos.atacante.x,
      y: pos.atacante.y,
      facing: pos.atacante.facing,
      pose: poseDe(fa, pa.mundo, b.atacante === POSE_DO_MOTOR, 0, flip),
      flash: 0,
      trail: [],
      combo: { hits: 0, dmg: 0, t: 0 },
    };
    const rival: LutadorLeitura = {
      ...fd,
      id: fd.id,
      esquiva: fd.esquiva ?? 0,
      x: pos.rival.x,
      y: pos.rival.y,
      facing: pos.rival.facing,
      pose: poseDe(fd, pr.mundo, b.rival === POSE_DO_MOTOR, pos.rival.rot, 1),
      flash: levando,
      trail: [],
      hp: hud.hp,
      hpShown: hud.hpShown,
      barras: hud.barras,
    };
    const fighters = (ia === 0 ? [atacante, rival] : [rival, atacante]) as [LutadorLeitura, LutadorLeitura];

    // projétil do golpe parado no ponto de acerto (ONDA VERDE, BULKKOT...) e sem os do motor desta execução
    this.projetilDaBatida = b.projetil ? this.projetilDe(cha, c.ev.golpe, ia, pos, idade) : null;
    const projectiles = luta.projectiles.filter((p) => !(p.dono === ia && p.especial === true));
    if (this.projetilDaBatida) projectiles.push(this.projetilDaBatida);

    const cam = cameraDoFilme(
      this.eff,
      tEf,
      pos,
      [tetoDeZoom(fa.id, cha), tetoDeZoom(fd.id, chd)],
      c.cameraInicial,
      { x: luta.cam.x, z: luta.cam.z },
      this.duracao,
    );
    const shake = this.tremor.amp * Math.max(0, 1 - (tEf - this.tremor.desde) / 10);
    return Object.create(luta, {
      fighters: { value: fighters },
      projectiles: { value: projectiles },
      cam: { value: { ...luta.cam, ...cam } },
      shake: { value: shake },
      hitstop: { value: 0 },
    }) as LeituraLuta;
  }

  private projetilDe(ch: LutadorMontado, golpe: string, dono: IndiceLutador, pos: PosicoesDoFilme, idade: number): ProjetilLeitura | null {
    const mv = (ch.moves as Readonly<Record<string, { proj?: { style: string; sc: number; sy?: number } } | undefined>>)[golpe];
    const pj = mv?.proj;
    if (!pj) return null;
    const dir = pos.atacante.facing;
    return {
      id: -1,
      x: pos.rival.x - dir * 30,
      y: pos.rival.y - SH * 0.5,
      vx: 0,
      dir,
      dono,
      style: pj.style as EstiloProjetil,
      sc: pj.sc,
      sy: pj.sy ?? pj.sc,
      frame: idade,
      especial: true,
    };
  }

  /** A identidade do especial (paleta, estilo) ou o padrão do lutador. */
  private identidade(luta: LeituraLuta, elenco: Elenco): Identidade {
    const c = this.cur as IniciarFilme;
    const f = luta.fighters[c.ev.atacante];
    const feita = identidadeDe(f.id, c.ev.ficha, c.ev.golpe);
    if (feita) return feita;
    const ch = chDaFicha(elenco[f.id].ch, c.ev.ficha);
    const mv = (ch.moves as Record<string, { name?: string } | undefined>)[c.ev.golpe];
    return identidadePadrao(mv?.name ?? c.ev.golpe, ch.fire);
  }

  /** A identidade do filme em andamento (a cena a usa para a cor das faíscas). */
  identidadeDoFilme(luta: LeituraLuta, elenco: Elenco): Identidade | null {
    return this.cur ? this.identidade(luta, elenco) : null;
  }

  /** O que a tela mostra agora (teste): painéis, contador e números. */
  get leitura(): { paineis: readonly { quem: 'atacante' | 'rival'; nome: string }[]; hits: number; numeros: readonly number[]; retrato: boolean } {
    const b = this.cur ? (this.eff[indiceDaBatida(this.eff, this.tEfetivo())] as BatidaEfetiva | undefined) : undefined;
    return { paineis: this.paineis, hits: this.hits, numeros: this.numeros.map((n) => n.valor), retrato: b?.retrato === true };
  }

  /**
   * Por cima do mundo (a leitura é a `vista` deste quadro): a assinatura do estilo e os números no ponto de acerto (sob a câmera do filme), o contador
   * "N HITS" e, de tela, o retrato e o painel de close da folha FILME.
   */
  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
    const c = this.cur;
    if (!c) return;
    const id = this.identidade(luta, elenco);
    const rival = luta.fighters[c.ev.defensor];
    ctx.save();
    aplicarCamera(ctx, luta.cam, 0, this.rng);
    for (const m of this.marcas) {
      desenharAssinatura({ ctx, idade: m.idade, estilo: id.estilo, variante: id.variante, p: id.paleta, x: m.x, y: m.y, sem: this.sem, dir: m.dir, eco: false, pesado: id.ritmo === 'PESADO' });
    }
    const contorno = mistura(id.paleta.sombra, '#000000', 0.45);
    for (const n of this.numeros) {
      const k = n.idade / 46;
      const pop = n.idade < 6 ? 1.4 - (n.idade / 6) * 0.4 : 1;
      const alfa = Math.min(1, (46 - n.idade) / 14);
      textoArcade(ctx, `-${n.valor}`, n.x, n.y - 10 - k * 40, 34, id.paleta.brilho, contorno, 'center', pop, alfa);
    }
    ctx.restore();
    if (this.hits > 0) {
      // o contador mora na TELA (sobre a cabeça do rival, preso entre o HUD de cima e as bordas): sob o zoom da câmera ele subiria para dentro das barras
      const k = luta.cam.z;
      const cabeca = rival.y - SH * chDaFicha(elenco[rival.id].ch, rival.ficha).scale - 26;
      const tx = clamp(luta.cam.x + k * (rival.x - luta.cam.x), 110, LARGURA - 110);
      const ty = Math.max(HITS_MIN_Y, GROUND + k * (cabeca - GROUND));
      textoArcade(ctx, `${this.hits} ${this.hits === 1 ? 'HIT' : 'HITS'}`, tx, ty, 40, [id.paleta.nucleo, id.paleta.brilho], contorno, 'center', 1 + this.popDoContador * 0.4, 1);
    }

    const b = this.eff[indiceDaBatida(this.eff, this.tEfetivo())] as BatidaEfetiva;
    const fa = luta.fighters[c.ev.atacante];
    if (b.retrato && this.paineis.every((p) => p.quem !== 'atacante')) {
      const r = elenco[fa.id];
      const lado = fa.indice === 0 ? 1 : -1;
      const tam = 150;
      const entra = facil(this.idade / 4);
      const x = lado === 1 ? lerp(-tam, 14, entra) : lerp(LARGURA, LARGURA - 14 - tam, entra);
      desenharRetrato(ctx, r.arte.retrato(r.ch.head), x, 100, tam, lado === -1, [id.paleta.brilho, id.paleta.sombra]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = id.paleta.brilho;
      ctx.strokeRect(x, 100, tam, tam);
    }
    for (const p of this.paineis) {
      const quem = luta.fighters[p.quem === 'atacante' ? c.ev.atacante : c.ev.defensor];
      const ch = chDaFicha(elenco[quem.id].ch, quem.ficha);
      const pd = ch.pd[p.nome];
      const img = pd ? elenco[quem.id].arte.imagemDe(pd) : null;
      if (pd && img) desenharPainelDeClose(ctx, img, pd, id, { atacando: p.quem === 'atacante', deQuemEstaEsquerda: quem.x <= luta.fighters[quem.indice === 0 ? 1 : 0].x, facing: quem.facing, idade: this.idade });
    }
  }
}

// ----------------------------------------------------------------------------------------------------------------------- painel de close (folha FILME)
export const ALTURA_DO_PAINEL = Math.round(ALTURA * 0.62);
export const LARGURA_DO_PAINEL = 460;
export const BASE_DO_PAINEL = ALTURA - 44;
const INCLINACAO_DO_PAINEL = (12 * Math.PI) / 180;

/** Retângulo do painel (para teste e para o desenho): lado esquerdo ou direito da tela, com a borda de dentro inclinada 12°. */
export function geometriaDoPainel(esquerda: boolean, deslize: number): { topo: number; base: number; pontos: readonly [number, number][] } {
  const topo = BASE_DO_PAINEL - ALTURA_DO_PAINEL;
  const inc = Math.tan(INCLINACAO_DO_PAINEL) * ALTURA_DO_PAINEL;
  const w = LARGURA_DO_PAINEL;
  const fora = (1 - deslize) * (w + 20);
  if (esquerda) {
    const dx = -fora;
    return { topo, base: BASE_DO_PAINEL, pontos: [[-10 + dx, topo], [w + dx, topo], [w - inc + dx, BASE_DO_PAINEL], [-10 + dx, BASE_DO_PAINEL]] };
  }
  const dx = fora;
  return { topo, base: BASE_DO_PAINEL, pontos: [[LARGURA + 10 + dx, topo], [LARGURA - w + inc + dx, topo], [LARGURA - w + dx, BASE_DO_PAINEL], [LARGURA + 10 + dx, BASE_DO_PAINEL]] };
}

/** Fundo do painel (curadoria do Apolo, docs/curadoria-filme-hayato-v1.md 6.2.2): a 0,85 o lutador do mundo (na pose `Alt`, atrás do painel) e os números de dano apareciam como fantasma. */
export const ALFA_DO_FUNDO_DO_PAINEL = 0.94;
/** A célula ocupa 96% da altura do painel (6.2.4): a 100% o cabelo encostava no topo. */
export const FRACAO_DA_ALTURA_DA_CELULA = 0.96;

/**
 * Onde a célula `pd` (esquerda ou direita) se assenta no painel: escala, tamanho e o x do centro. A largura útil desconta a inclinação de 12° da borda de
 * dentro (6.2.3): sem isso o punho de um close largo (o gancho do HAYATO, 802 px) ficava a ~6 px da borda quando o atacante está à direita da tela.
 * A célula se centra na faixa entre a borda de fora e a borda de dentro NA BASE (onde o painel é mais estreito), então cabe inteira em qualquer altura.
 */
export function encaixeDaCelula(pd: Pick<PoseDados, 'w' | 'h'>, esquerda: boolean): { k: number; w: number; h: number; cx: number } {
  const inc = Math.tan(INCLINACAO_DO_PAINEL) * ALTURA_DO_PAINEL;
  const util = LARGURA_DO_PAINEL - inc;
  const k = Math.min(util / pd.w, (ALTURA_DO_PAINEL * FRACAO_DA_ALTURA_DA_CELULA) / pd.h);
  const centro = (util - 10) / 2; // a borda de fora está em x = -10
  return { k, w: pd.w * k, h: pd.h * k, cx: esquerda ? centro : LARGURA - centro };
}

export interface ArgsDoPainel {
  /** Close do atacante (a célula olha para a direita) ou do rival (a reação olha para a esquerda: a cabeça vai para longe do atacante). */
  readonly atacando: boolean;
  /** O lutador do close está no lado esquerdo da tela? */
  readonly deQuemEstaEsquerda: boolean;
  readonly facing: 1 | -1;
  /** Ticks desde o início da batida (o painel entra em 4). */
  readonly idade: number;
}

/** Desenha o close (uma célula da folha FILME, `pd`) num painel inclinado na cor do especial, do lado de quem está no close. */
export function desenharPainelDeClose(ctx: Ctx, img: CanvasImageSource, pd: PoseDados, id: Identidade, a: ArgsDoPainel): void {
  const g = geometriaDoPainel(a.deQuemEstaEsquerda, facil(a.idade / 4));
  ctx.save();
  ctx.beginPath();
  g.pontos.forEach(([x, y], i) => (i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)));
  ctx.closePath();
  ctx.clip();
  ctx.globalAlpha = ALFA_DO_FUNDO_DO_PAINEL;
  ctx.fillStyle = id.paleta.sombra;
  ctx.fillRect(0, g.topo, LARGURA, ALTURA_DO_PAINEL);
  // linhas de velocidade
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = id.paleta.brilho;
  for (let i = 0; i < 9; i++) ctx.fillRect(0, g.topo + 20 + i * 34, LARGURA, 3);
  ctx.globalAlpha = 1;
  // a célula: encostada na borda de baixo, cabendo no painel (altura a 96%, largura descontando a inclinação)
  const { w, h, cx } = encaixeDaCelula(pd, a.deQuemEstaEsquerda);
  // a célula do atacante olha para a direita (espelha se ele olha para a esquerda); a reação olha para a esquerda (espelha se o rival olha para a esquerda)
  const espelhar = a.facing === -1;
  ctx.translate(cx, g.base);
  if (espelhar) ctx.scale(-1, 1);
  ctx.drawImage(img, pd.x, pd.y, pd.w, pd.h, -w / 2, -h, w, h);
  ctx.restore();
  // fio de 3 px na cor brilho ao longo da borda de dentro
  ctx.save();
  ctx.lineWidth = 3;
  ctx.strokeStyle = id.paleta.brilho;
  ctx.beginPath();
  const p = g.pontos;
  const [a1, a2] = [p[1] as readonly [number, number], p[2] as readonly [number, number]];
  ctx.moveTo(a1[0], a1[1]);
  ctx.lineTo(a2[0], a2[1]);
  ctx.stroke();
  ctx.restore();
}

/** A altura (px) do atacante, para o agarrão. */
export const alturaDoLutador = (ch: Pick<LutadorMontado, 'scale'>): number => SH * ch.scale;

