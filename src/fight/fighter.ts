import { GRAVITY, GROUND, JUMP_FORCE, LARGURA, MAX_EN, WALK_SPEED } from '../core/constantes';
import type {
  ComboLeitura,
  EventoLuta,
  EstadoLutador,
  FluidezMotor,
  IdLutador,
  IndiceLutador,
  InputFrame,
  PoseAtual,
  RastroLeitura,
} from '../core/contratos';
import { INPUT_VAZIO } from '../core/contratos';
import { clamp, lerp } from '../core/math';
import { apresentacaoDoEspecial } from '../data/apresentacao-especiais';
import { poseDaCena } from '../data/cena';
import { cadeiaCabeMais, cadeiaPermite, comboAbreCancelamento, golpesQueContinuam } from '../data/combos-proprios';
import { ESQUIVA_PADRAO, type TrechoEsquiva } from '../data/esquiva';
import { hasPose } from '../data/poses';
import type { LutadorMontado } from '../data/montar';
import { superDoLutador } from '../data/supers';
import type { CargaDef, ConfigChefe, GolpeMontado, NomeGolpe, ReboteDef } from '../data/tipos';
import type { PerfilCpu } from './cpu';
import { attackBox, hurtbox, podeBloquear } from './colisao';
import { MOTIONS, dirNum, motion } from './comandos';
import type { Retangulo } from '../core/math';

export type ChaveAtaque = 'sp' | 'hp' | 'hk' | 'lp' | 'lk';
export const ATK_KEYS: readonly ChaveAtaque[] = ['sp', 'hp', 'hk', 'lp', 'lk'];
/** Margem da parede em que `physics` trava o x de um lutador em pé (60 px de cada lado). */
const MARGEM_PAREDE = 60;

/** Estado da IA de um lutador controlado pela CPU (Fighter.ai do protótipo). */
export type EstadoIa = {
  plan: PlanoIa | null;
  t: number;
  hold: number;
  holdInp: { back: boolean; down: boolean } | null;
  /** Último ataque (número) ou projétil ('p<id>') ao qual a IA já reagiu. */
  seen: number | string;
  chain: number;
  /** (dica `carga`) ticks restantes segurando ESP (`spSeg`) depois do primeiro. 0 = não segura. */
  segurar: number;
  /**
   * (dica `defesa-projetil`/`defesa`) golpe a soltar quando o projétil/golpe que a CPU viu estiver chegando; `espera` em ticks.
   * Variante da ESQUIVA: `esquiva` = 1 (avanço) ou -1 (recuo), apertada depois de `espera` ticks.
   */
  reacao: { golpe: NomeGolpe; espera: number } | { esquiva: 1 | -1; espera: number } | null;
  /** (ESQUIVA) `esquivaId` do rival cuja recuperação a CPU já considerou punir (um sorteio por esquiva). */
  puniuEsquiva: number;
  /** (V2-4, combos próprios) `atkId` do golpe cujo acerto a CPU já considerou continuar num combo próprio (um sorteio por golpe). */
  proprioAtk: number;
  /** R-10 (`ritmo.cpu`): a CPU deste round RESERVA a barra para o super? Sorteado uma vez por round (null = ainda não sorteado). */
  reservaSuper: boolean | null;
  /** R-10: ticks seguidos com a barra cheia (para o super sair mesmo sem confirmação se a janela demora). */
  superCheio: number;
  /** R-10: `atkId` do golpe cujo acerto a CPU já considerou fechar com o super (um sorteio por golpe). */
  superAtk: number;
  /** R-10 resto (`ritmo.cpu`): `atkId` do golpe cujo acerto a CPU já está esperando confirmar, e o `mt` em que viu o acerto (a reação de `CPU_RITMO.confirma`). */
  confirmaAtk: number;
  confirmaMt: number;
  /** R-10 resto: `atkId` do golpe do rival que a CPU já considerou punir (um sorteio por golpe). */
  punirAtk: number;
  /** R-10 resto: os últimos 3 especiais comuns que a CPU soltou (o repetido perde chance) e o `atkId` do último golpe contado. */
  ultimosEspeciais: NomeGolpe[];
  atkContado: number;
  /** R-10 resto: histerese do andar: ticks de CPU rodados, sentido (-1/0/1) do último plano de andar e quando ele começou. */
  idade: number;
  walkSentido: -1 | 0 | 1;
  walkDesde: number;
};
export type PlanoIa = Partial<Record<'left' | 'right' | 'up' | 'down' | 'lp' | 'lk' | 'hp' | 'hk' | 'sp', boolean>> & { dur?: number };

/** O que o Fighter precisa da partida (injeção: o Fighter não conhece a classe Game). */
export interface PartidaParaLutador {
  emitir(ev: EventoLuta): void;
  /** Arremesso que acertou (Game.throwHit). `golpe` traz `agarrao.dmg` (E3); sem ele o dano é o de sempre (12). */
  arremessar(a: Fighter, d: Fighter, golpe?: GolpeMontado): void;
  /** Projétil `i` de `n` (Game.spawnProjectile). */
  lancarProjetil(f: Fighter, mv: GolpeMontado, i: number, n: number): void;
  /** Queda no chão após ser derrubado (onKnock: tremor + poeira). */
  aoCair(f: Fighter): void;
  /**
   * ESQUIVA ligada nesta partida (`ConfigPartida.esquiva`). Opcional: dublê de teste sem o campo = desligada. Desligada, o `Fighter`
   * ignora `inp.esq` ANTES de qualquer conta (nenhum estado, energia, `deny` ou RNG).
   */
  readonly esquivaLigada?: boolean;
  /** V2-4 (`motorV2.combos`): o combo próprio abre cancelamentos. Opcional: dublê de teste sem o campo = desligado (nenhuma conta nova). */
  readonly combosLigados?: boolean;
  /** R-8 (`ritmo.cadeia`): cadeia por força (fraco > forte > especial > super, até 4 golpes), só em acerto confirmado. Opcional: dublê de teste sem o campo = a cadeia por rank de sempre. */
  readonly ritmoCadeiaLigada?: boolean;
  /** R-7 (`ritmo.super`): SOCO FORTE + CHUTE FORTE com a barra cheia vira o super. Opcional: dublê de teste sem o campo = desligado. */
  readonly ritmoSuperLigado?: boolean;
  /** R-12: a CPU do ritmo que já usou o teto de supers (luta, round, espera) NÃO recebe o super nem por acidente (hp e hk da CPU em ticks vizinhos viram o par). Ausente = nunca bloqueia. */
  superBloqueadoPara?(f: Fighter): boolean;
  /** FLUIDEZ (M1-M6, `ConfigPartida.fluidez`). Opcional: dublê de teste sem o campo = o motor de antes, bit a bit. */
  readonly fluidez?: FluidezMotor | undefined;
  /** R-10 (D-R4): regen da barra por tick. Ausente = 0,04 de sempre (só `ritmo.super` + `ritmo.cpu` sobem, para a CPU juntar barra sem deixar de usar especiais). */
  readonly regenDeBarra?: number;
}

const novoIa = (): EstadoIa => ({ plan: null, t: 0, hold: 0, holdInp: null, seen: -1, chain: 0, segurar: 0, reacao: null, puniuEsquiva: 0, proprioAtk: -1, reservaSuper: null, superCheio: 0, superAtk: -1, confirmaAtk: -1, confirmaMt: 0, punirAtk: -1, ultimosEspeciais: [], atkContado: -1, idade: 0, walkSentido: 0, walkDesde: 0 });

/** Nível (1..3) de uma carga com `carga` ticks segurados: o maior i+1 tal que carga >= niveis[i]. */
function nivelDaCarga(def: CargaDef, carga: number): 1 | 2 | 3 {
  let n = 1;
  for (let i = 1; i < def.niveis.length; i++) if (carga >= (def.niveis[i] as number)) n = i + 1;
  return Math.min(3, n) as 1 | 2 | 3;
}

export class Fighter {
  readonly indice: IndiceLutador;
  /** side do protótipo: 1 = P1 (esquerda), 2 = P2. */
  readonly side: 1 | 2;
  ch: LutadorMontado;
  /** Nível da CPU (0..2) ou null se humano. */
  cpu: number | null = null;
  score = 0;
  wins = 0;
  maxHp = 0;
  /** Barras de vida restantes (1 = luta normal; `barrasMax` no começo do round). */
  barras = 1;
  /** Barras com que o round começa (1; 2 no chefão). `reset` volta `barras` para cá. */
  barrasMax = 1;
  /** É o chefe desta luta? (`virarChefe`; `setChar` desfaz.) */
  chefe = false;
  /** Configuração do chefe (hpPorBarra, fichas, cena). null fora de luta de chefe. */
  cfgChefe: ConfigChefe | null = null;
  /** A barra acabou e a Dança da Águia ainda não rodou (o `Game` dispara no primeiro tick livre). */
  cenaPendente = false;
  /** Perfil de CPU próprio (só o chefe). null = usa `AI_LEVELS[cpu]`. */
  perfilIa: PerfilCpu | null = null;
  /** Ficha ativa (null = a base). `reset` volta para `fichaBase`. */
  ficha: string | null = null;
  /** Ficha com que cada round começa: null normalmente; `fichaFase1` no chefe. */
  private fichaBase: string | null = null;
  /** O lutador montado SEM ficha (a base). `ch` aponta para ele ou para `chBase.fichas[ficha]`. */
  private chBase: LutadorMontado;
  /**
   * Nível da carga (AMINU, S2): 0 fora de um golpe `carga`; de 1 a 3 do ponto de segurar (mt = S−1) até o fim do golpe
   * (um toque sem segurar também sai como nível 1).
   */
  nivelCarga: 0 | 1 | 2 | 3 = 0;
  /** Ticks segurando ESP no golpe `carga` em curso (o nível sai daqui). Zerado em `startMove`. */
  private carga = 0;
  /** Está parado em mt = S−1 acumulando carga. */
  private carregando = false;
  /**
   * RESORTE (CENTELLA, S3): 0 = fora do golpe `rebote` (ou ainda na preparação); 1 = ida (corre de costas até a parede);
   * 2 = volta (voadora, no ar até pousar). Zerado em `startMove`/`reset` e no 1º tick fora do golpe.
   */
  reboteFase: 0 | 1 | 2 = 0;
  /** Distância (px) que a ida percorreu, até `rebote.maxDist`: dano (`noAtaque`) e velocidade da volta saem daqui. */
  momento = 0;
  private reboteX0 = 0;
  private reboteTicks = 0;
  /** REVERS (S4, golpe `through`): sentido em que a corrida anda (o `facing` do início) e o `mt` em que cruzou o rival (−1 = ainda não). */
  private dirCorrida: 1 | -1 = 1;
  private cruzouEm = -1;
  /** ESQUIVA (V2): sentido (1 = avanço, -1 = recuo), tick dentro dela, botão guardado (ticks restantes) e golpes/projéteis já "esquivados". */
  private esqDir: 1 | -1 = -1;
  private esqT = 0;
  private bufEsq = 0;
  /** Quantas esquivas este lutador já começou (a CPU rival usa para punir cada recuperação uma vez). Zera em `reset`. */
  esquivaId = 0;
  private readonly esquivados = new Set<string>();
  /**
   * `atkId` do golpe deste lutador que já foi ESQUIVADO (-1 = nenhum). Um golpe esquivado é CONSUMIDO para o alvo, como um acerto: depois do
   * `esquivou` ele não acerta mais no mesmo golpe (a janela de 14 ticks é mais curta que a fase ativa de alguns golpes). Zera em `reset`.
   */
  atkEsquivado = -1;

  x = 0;
  y = GROUND;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  hp = 0;
  hpShown = 0;
  en = 0;
  state: EstadoLutador = 'idle';
  st = 0;
  age = 0;
  move: NomeGolpe | null = null;
  mt = 0;
  atkId = 0;
  stun = 0;
  hitDone = false;
  connected = false;
  shots = 0;
  airUsed = false;
  armor = 0;
  rep = 0;
  lagR = 14;
  walkDist = 0;
  hist: number[] = [];
  lastTap = { dir: 0, t: -99 };
  prevH = 0;
  dashDir = 0;
  dashLen = 0;
  jdir = 0;
  hitCount = 0;
  lastHitMt = 0;
  hitKind: 'H' | 'B' = 'H';
  trail: RastroLeitura[] = [];
  opp: Fighter | null = null;
  crouching = false;
  holdBack = false;
  buf: { k: ChaveAtaque; t: number } | null = null;
  /** R-7: o golpe em curso (`move`/`atkId` atual) é o SUPER (dano/filme/custo próprios). Ligado em `startMove`, nunca fora dele. */
  superAtivo = false;
  /** R-7: `age` do último `hp`/`hk` apertado (borda), para achar o par "as duas bordas no mesmo tick ou até 2 ticks de distância". */
  private hpApertadoEm = -99;
  private hkApertadoEm = -99;
  /** M6 (`fluidez.agarraoPar`): `age` do último `lp`/`lk` apertado (borda), para achar o par "até 2 ticks de distância". */
  private lpApertadoEm = -99;
  private lkApertadoEm = -99;
  /** M6: o par lp+lk que agarra, achado NESTE tick (`agarrarNaBorda`, 1x por tick em `corpoDoUpdate`). */
  private agarrarNoTick = false;
  /** M3 (`fluidez.fila`): a 2ª vaga do buffer de ataque (a 1ª é `buf`, a mais antiga). Sempre null com a flag desligada. */
  bufFila: { k: ChaveAtaque; t: number } | null = null;
  /** As flags de fluidez da partida, copiadas de `jogo.fluidez` no começo de cada `update` (`resolveAttack` não recebe o `jogo`). */
  private flu: FluidezMotor | undefined = undefined;
  /** R-7: o golpe do super achado NESTE tick (`superNaBorda`, chamado 1x em `corpoDoUpdate`), ou null. Lido pelas duas entradas (estado livre e cancelamento). */
  private golpeSuperNoTick: NomeGolpe | null = null;
  flash = 0;
  invuln = 0;
  phase: 'air' | 'lie' | 'rise' = 'air';
  gotHits = 0;
  /**
   * V2-4 (`motorV2.combos`): golpes DESTE lutador que acertaram o rival desde que ele saiu de `gotHits === 0` (um por execução, na ordem).
   * Só o `Game` escreve (em `applyHit`); com a flag desligada fica sempre vazio. `atk` = o `atkId` da execução, para o cancelamento
   * saber que o último acerto é do golpe em curso (e não de um acerto velho, com o golpe atual só bloqueado).
   */
  historicoCombo: { golpe: NomeGolpe; atk: number }[] = [];
  /**
   * R-8: os golpes ENCADEADOS por cancelamento até agora (o último é o golpe em curso). Um golpe que começa do zero recomeça a lista; só os
   * cancelamentos de `updateMove` a estendem. É o que `ritmo.cadeia` mede para o teto de 4 golpes e para os fracos seguidos.
   */
  cadeiaGolpes: NomeGolpe[] = [];
  lastDmg = 0;
  dmgTaken = 0;
  maxCombo = 0;
  comboDmg = 0;
  ai: EstadoIa = novoIa();
  inp: InputFrame = INPUT_VAZIO;
  /** Pose calculada no fim de cada tick (poseT); `pose.dy` é o `pdy` do protótipo. */
  pose: PoseAtual = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 };
  combo: ComboLeitura = { hits: 0, dmg: 0, t: 0 };

  constructor(ch: LutadorMontado, indice: IndiceLutador) {
    this.indice = indice;
    this.side = indice === 0 ? 1 : 2;
    this.ch = ch;
    this.chBase = ch;
    this.maxHp = ch.hp;
    this.reset(true);
  }

  /** Vida somada de todas as barras (desempate por tempo). Com 1 barra == hp. */
  get vidaTotal(): number {
    return this.hp + (this.barras - 1) * this.maxHp;
  }
  /** Meia-largura de empurrão (LutadorDef.corpo; default 39). */
  get corpo(): number {
    return this.ch.corpo;
  }

  get id(): IdLutador {
    return this.ch.id;
  }
  /** C3 `LutadorLeitura.esquiva`: 1 = avanço, -1 = recuo, 0 = não está esquivando. */
  get esquiva(): 0 | 1 | -1 {
    return this.state === 'esquiva' ? this.esqDir : 0;
  }
  /** Compatível com LutadorLeitura.cpu. */
  get pdy(): number {
    return this.pose.dy;
  }

  /** Troca o lutador inteiro (nova luta). Desfaz tudo o que for de chefe/ficha: o próximo `virarChefe` é explícito. */
  setChar(ch: LutadorMontado): void {
    this.ch = ch;
    this.chBase = ch;
    this.maxHp = ch.hp;
    this.barrasMax = 1;
    this.chefe = false;
    this.cfgChefe = null;
    this.cenaPendente = false;
    this.perfilIa = null;
    this.ficha = null;
    this.fichaBase = null;
    this.zerarCarga();
  }

  private zerarCarga(): void {
    this.nivelCarga = 0;
    this.carga = 0;
    this.carregando = false;
  }

  /** Estado do RESORTE e do REVERS: começa limpo a cada golpe (e a cada round). */
  private zerarMovimentoE3(): void {
    this.reboteFase = 0;
    this.momento = 0;
    this.reboteTicks = 0;
    this.cruzouEm = -1;
    this.dirCorrida = this.facing;
  }

  private zerarEsquiva(): void {
    this.esqDir = -1;
    this.esqT = 0;
    this.bufEsq = 0;
    this.esquivaId = 0;
    this.atkEsquivado = -1;
    this.esquivados.clear();
  }

  /**
   * Descarta os botões guardados (ataque e esquiva). O `Game` chama ao abrir a Dança da Águia: sem isto o jogador atacaria ou esquivaria
   * (gasto de energia, som, invulnerabilidade) no meio da cena com o botão apertado antes dela.
   */
  limparBotoesGuardados(): void {
    this.buf = null;
    this.bufFila = null;
    this.bufEsq = 0;
  }

  /**
   * Faz deste lutador o chefe da luta: barras e vida por barra vêm da config, e cada round começa na `fichaFase1`.
   * Chamar DEPOIS de `setChar`. Fica na ficha da fase 1 já (o `reset` do primeiro round a reaplica).
   */
  virarChefe(cfg: ConfigChefe): void {
    // As DUAS fichas (quando existem) são validadas já no setup: a da fase 2 só seria usada 90 ticks depois da 1ª troca, no meio da luta.
    // Ficha ausente = o guardião luta com a ficha do jogável (null = a base) e a retomada não a troca (NILA fica na postura em que estava).
    if (cfg.fichaFase1 !== undefined) this.exigirFicha(cfg.fichaFase1);
    if (cfg.fichaFase2 !== undefined) this.exigirFicha(cfg.fichaFase2);
    this.chefe = true;
    this.cfgChefe = cfg;
    this.barrasMax = cfg.barras;
    this.fichaBase = cfg.fichaFase1 ?? null;
    this.maxHp = cfg.hpPorBarra;
    this.trocarFicha(this.fichaBase);
  }

  /**
   * Troca de ficha (postura, fase do chefe) SEM mexer em `hp`/`maxHp` (diferente de `setChar`). null = a base.
   * Nome desconhecido é erro de dados: falha alto em vez de desenhar a ficha errada.
   */
  trocarFicha(nome: string | null): void {
    if (nome === null) this.ch = this.chBase;
    else this.ch = this.exigirFicha(nome);
    this.ficha = nome;
  }

  /** A ficha `nome` da base, ou erro de dados. `hasOwn`: nomes herdados de Object.prototype ('constructor') não são ficha. */
  private exigirFicha(nome: string): LutadorMontado {
    const f = Object.hasOwn(this.chBase.fichas, nome) ? this.chBase.fichas[nome] : undefined;
    if (!f) throw new Error(`${this.chBase.id}: ficha desconhecida '${nome}'`);
    return f;
  }

  reset(full: boolean): void {
    this.x = this.side === 1 ? 270 : 690;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.side === 1 ? 1 : -1;
    this.trocarFicha(this.fichaBase); // cada round começa na postura/fase base
    this.cenaPendente = false;
    this.zerarCarga();
    this.zerarMovimentoE3();
    this.zerarEsquiva();
    this.maxHp = this.cfgChefe ? this.cfgChefe.hpPorBarra : this.ch.hp;
    this.hp = this.maxHp;
    this.hpShown = this.hp;
    this.barras = this.barrasMax;
    if (full) this.en = 0;
    else this.en = Math.max(this.en * 0.5, 20);
    this.state = 'idle';
    this.st = 0;
    this.age = 0;
    this.move = null;
    this.mt = 0;
    this.atkId = 0;
    this.stun = 0;
    this.hitDone = false;
    this.connected = false;
    this.shots = 0;
    this.airUsed = false;
    this.armor = 0;
    this.rep = 0;
    this.lagR = 14;
    this.walkDist = 0;
    this.hist = [];
    this.lastTap = { dir: 0, t: -99 };
    this.prevH = 0;
    this.dashDir = 0;
    this.dashLen = 0;
    this.jdir = 0;
    this.hitCount = 0;
    this.lastHitMt = 0;
    this.hitKind = 'H';
    this.trail = [];
    this.opp = null;
    this.crouching = false;
    this.holdBack = false;
    this.buf = null;
    this.bufFila = null;
    this.superAtivo = false;
    this.hpApertadoEm = -99;
    this.hkApertadoEm = -99;
    this.lpApertadoEm = -99;
    this.lkApertadoEm = -99;
    this.flash = 0;
    this.invuln = 0;
    this.phase = 'air';
    this.gotHits = 0;
    this.historicoCombo = [];
    this.cadeiaGolpes = [];
    this.lastDmg = 0;
    this.dmgTaken = 0;
    this.maxCombo = 0;
    this.comboDmg = 0;
    this.ai = novoIa();
    this.atualizarPose();
  }

  get grounded(): boolean {
    return this.y >= GROUND;
  }
  get attacking(): boolean {
    return this.state === 'move';
  }
  get untouchable(): boolean {
    return this.state === 'down' || this.state === 'ko' || this.invuln > 0 || this.state === 'win';
  }

  /** Golpe em curso. Só chamar com state === 'move'. */
  golpeAtual(): GolpeMontado {
    return this.ch.moves[this.move as NomeGolpe];
  }

  canBlock(lvl: GolpeMontado['lvl']): boolean {
    return podeBloquear(lvl, { noChao: this.grounded, segurandoTras: this.holdBack, state: this.state, agachado: this.crouching });
  }

  setState(s: EstadoLutador): void {
    if (this.state !== s) {
      this.state = s;
      this.st = 0;
    }
  }

  isLow(): boolean {
    return (
      this.state === 'crouch' ||
      (this.state === 'move' && !!this.golpeAtual().crouch) ||
      ((this.state === 'hit' || this.state === 'block') && this.crouching)
    );
  }

  /** Converte o botão apertado + direção no golpe correspondente (ex.: ↓ + soco forte = chp). */
  resolveAttack(k: ChaveAtaque, inp: InputFrame): NomeGolpe | null {
    const fwd = this.facing > 0 ? inp.right : inp.left;
    const punch = k === 'lp' || k === 'hp';
    const kick = k === 'lk' || k === 'hk';
    if (!this.grounded) return k === 'sp' ? null : (('j' + k) as NomeGolpe);
    if (k === 'sp') return inp.down ? 'sDown' : fwd ? 'sFwd' : 'sFire';
    // comandos clássicos: →↓↘ + soco, ↓↘→ + soco, ↓↙← + chute
    if (punch && this.motion(MOTIONS.dp) && this.canAfford('sDown')) return 'sDown';
    if (punch && this.motion(MOTIONS.qcf) && this.canAfford('sFire')) return 'sFire';
    if (kick && this.motion(MOTIONS.qcb) && this.canAfford('sFwd')) return 'sFwd';
    // M6 (`fluidez.semAgarraoPorFrente` + `toque`): no celular o joystick fica empurrado para a frente, então → + soco forte de um HUMANO não agarra (o par lp+lk agarra); a CPU segue como sempre
    const semFrente = this.flu?.semAgarraoPorFrente === true && this.flu.toque === true && this.cpu === null;
    if (k === 'hp' && fwd && !inp.down && !semFrente && this.canThrow()) return 'throw'; // arremesso: → + soco forte colado no rival
    return ((inp.down ? 'c' : '') + k) as NomeGolpe;
  }

  motion(seq: readonly number[], win = 18): boolean {
    return motion(this.hist, seq, win);
  }

  /**
   * R-7 (D-R1, `ritmo.super`): registra as bordas de `hp`/`hk` deste tick e devolve o golpe do SUPER se as duas
   * acabaram de casar (a mais recente, achando a outra a até 2 ticks de distância) e a barra está cheia. Chamar
   * UMA vez por tick (`InputFrame` não muda: a detecção é toda daqui). Sem super para este lutador/ficha, ou com a
   * barra não cheia: `null` — "sai o golpe de hoje" (`resolveAttack` resolve o botão único como sempre).
   */
  private superNaBorda(inp: InputFrame): NomeGolpe | null {
    if (inp.hp) this.hpApertadoEm = this.age;
    if (inp.hk) this.hkApertadoEm = this.age;
    if (!inp.hp && !inp.hk) return null; // só dispara no tick de uma borda nova (evita repetir por até 2 ticks)
    if (this.en < MAX_EN) return null;
    if (Math.abs(this.hpApertadoEm - this.hkApertadoEm) > 2) return null;
    return superDoLutador(this.ch.id, this.ficha)?.golpe ?? null;
  }

  /**
   * R-7: a borda guardada (`this.buf`) é hp OU hk sozinho, mas ainda cabe no par (apertado há <= 2 ticks, barra cheia,
   * há super para este lutador/ficha)? Se sim, quem chama NÃO resolve o `buf` agora — espera mais 1-2 ticks pelo par
   * (sem isso, o 1º botão sempre venceria como golpe comum antes de o 2º chegar, e "até 2 ticks de distância" nunca
   * disparava: só o mesmo tick funcionava).
   */
  private aguardandoParDoSuper(jogo: PartidaParaLutador): boolean {
    if (jogo.fluidez?.parSuper === true) return false; // M1: sem espera — o forte sai na hora e é PROMOVIDO a super se o par fechar (`promoverPar`)
    if (jogo.ritmoSuperLigado !== true || jogo.superBloqueadoPara?.(this) === true || !this.buf || (this.buf.k !== 'hp' && this.buf.k !== 'hk')) return false;
    if (this.en < MAX_EN || !superDoLutador(this.ch.id, this.ficha)) return false;
    const apertadoEm = this.buf.k === 'hp' ? this.hpApertadoEm : this.hkApertadoEm;
    return this.age - apertadoEm <= 2;
  }

  /**
   * M6 (`fluidez.agarraoPar`): registra as bordas de `lp`/`lk` deste tick e diz se as duas acabaram de casar (até 2 ticks de distância) COM o rival ao alcance
   * do agarrão e este lutador no chão. Zera as marcas ao achar, para a próxima borda não repetir o par. Chamar UMA vez por tick.
   */
  private agarrarNaBorda(inp: InputFrame): boolean {
    if (inp.lp) this.lpApertadoEm = this.age;
    if (inp.lk) this.lkApertadoEm = this.age;
    if (!inp.lp && !inp.lk) return false;
    if (Math.abs(this.lpApertadoEm - this.lkApertadoEm) > 2) return false;
    if (!this.grounded || !this.canThrow()) return false;
    this.lpApertadoEm = -99;
    this.lkApertadoEm = -99;
    return true;
  }

  /** Esvazia as duas vagas do buffer (o par do super e o agarrão consomem o aperto inteiro, não só a 1ª vaga). */
  private limparBuffer(): void {
    this.buf = null;
    this.bufFila = null;
  }

  /**
   * M1/M6: o 1º botão do par já iniciou um normal (sem espera). Se o par fecha em até 2 ticks do golpe (`mt <= 2`, antes de o normal acertar) o golpe é PROMOVIDO:
   * SOCO FORTE + CHUTE FORTE com a barra cheia viram o super (M1); SOCO FRACO + CHUTE FRACO ao alcance viram `throw` (M6). Devolve true se promoveu.
   */
  private promoverPar(jogo: PartidaParaLutador, mv: GolpeMontado): boolean {
    const flu = jogo.fluidez;
    if (!flu || !this.grounded || mv.air || this.mt > 2 || this.superAtivo) return false;
    if (this.move === null || this.move[0] === 's' || this.move === '_lag' || this.move === 'throw') return false;
    if (flu.parSuper === true && this.golpeSuperNoTick) {
      this.limparBuffer();
      this.startMove(this.golpeSuperNoTick, jogo, true);
      return true;
    }
    if (flu.agarraoPar === true && this.agarrarNoTick) {
      this.limparBuffer();
      this.startMove('throw', jogo);
      return true;
    }
    return false;
  }

  /**
   * M2 (`fluidez.dashCancela`): ataque, super ou agarrão cancelam o dash (frente a partir do tick 4; recuo a partir do 6, quando a invulnerabilidade de 6 ticks acabou).
   * Antes disso o botão fica guardado (o buffer não expira dentro do dash). Devolve true se começou um golpe neste tick.
   */
  private cancelarDash(inp: InputFrame, jogo: PartidaParaLutador): boolean {
    if (this.st < (this.dashDir < 0 ? 6 : 4)) return false;
    const flu = jogo.fluidez;
    if (flu?.parSuper === true && this.golpeSuperNoTick) {
      this.limparBuffer();
      this.startMove(this.golpeSuperNoTick, jogo, true);
      return true;
    }
    if (flu?.agarraoPar === true && this.agarrarNoTick) {
      this.limparBuffer();
      this.startMove('throw', jogo);
      return true;
    }
    if (this.aguardandoParDoSuper(jogo) || !this.buf) return false;
    const nm = this.resolveAttack(this.buf.k, inp);
    this.buf = null;
    if (!nm) return false;
    if (!this.canAfford(nm)) {
      jogo.emitir({ tipo: 'deny', lutador: this.indice });
      return false;
    }
    this.startMove(nm, jogo);
    return true;
  }

  /**
   * Dá para agarrar o rival agora? Sem `golpe` (ou sem `agarrao`) é o arremesso de sempre: alcance 108, rival no chão.
   * `golpe.agarrao.alcance` troca o alcance (E3: ARREMESSO 162, ABRAÇO < 108) e `alvo` escolhe quem pode ser agarrado:
   * 'chao' (padrão), 'ar' (rival fora do chão, a menos de 120 px de altura de diferença, pulando ou atacando no ar:
   * HURACANRANA) ou 'ambos'.
   */
  canThrow(golpe?: GolpeMontado): boolean {
    const o = this.opp;
    if (!o || o.untouchable || o.stun > 0) return false;
    if (Math.abs(o.x - this.x) >= (golpe?.agarrao?.alcance ?? 108)) return false;
    const noChao = o.grounded && ['idle', 'walk', 'crouch', 'land', 'prejump', 'dash', 'move', 'esquiva'].includes(o.state);
    const alvo = golpe?.agarrao?.alvo ?? 'chao';
    if (alvo === 'chao') return noChao;
    const noAr = !o.grounded && Math.abs(o.y - this.y) < 120 && (o.state === 'jump' || o.state === 'move');
    return alvo === 'ar' ? noAr : noChao || noAr;
  }

  canAfford(name: NomeGolpe): boolean {
    const mv = this.ch.moves[name];
    return !mv.cost || this.en >= mv.cost;
  }

  /** `superExec`: R-7 — este golpe é o SUPER (a MESMA pose/golpe de `name`, custo a barra inteira, `special.super: true`). */
  startMove(name: NomeGolpe, jogo: PartidaParaLutador, superExec = false): void {
    const mv = this.ch.moves[name];
    this.move = name;
    this.mt = 0;
    this.hitDone = false;
    this.connected = false;
    this.shots = 0;
    this.atkId++;
    this.rep = 0;
    this.cadeiaGolpes = [name];
    this.superAtivo = superExec;
    this.setState('move');
    if (this.grounded) this.vx = 0;
    if (superExec) {
      // R-7 (§3.4): custo = a barra INTEIRA, não `mv.cost` do especial de origem.
      this.en = 0;
      const ap = apresentacaoDoEspecial(this.ch.id, this.ficha, name);
      jogo.emitir({
        tipo: 'special',
        lutador: this.indice,
        pitch: this.ch.pitch,
        golpe: name,
        ficha: this.ficha,
        momento: ap?.momento ?? 'inicio',
        super: true,
        ...(ap ? { quadro: ap.quadro } : {}),
        ...(ap?.entrada ? { entrada: ap.entrada } : {}),
      });
    } else if (mv.cost) {
      this.en -= mv.cost;
      // V1 (cinemática): o evento leva o golpe, a ficha e a apresentação (quadro/entrada/momento); o som continua o de sempre.
      const ap = apresentacaoDoEspecial(this.ch.id, this.ficha, name);
      jogo.emitir({
        tipo: 'special',
        lutador: this.indice,
        pitch: this.ch.pitch,
        golpe: name,
        ficha: this.ficha,
        momento: ap?.momento ?? 'inicio',
        ...(ap ? { quadro: ap.quadro } : {}),
        ...(ap?.entrada ? { entrada: ap.entrada } : {}),
      });
    } else {
      jogo.emitir({ tipo: 'swing', lutador: this.indice, golpe: mv.kind === 'punch' ? 'punch' : 'kick' });
    }
    if (mv.air) this.airUsed = true;
    this.armor = mv.armor ? mv.S + mv.A : 0;
    // O super reaproveita o `inv` do golpe de origem (HAYATO/MIN-JI já sobem invulneráveis; ver src/data/supers.ts).
    if (mv.inv) this.invuln = Math.max(this.invuln, mv.S + mv.inv);
    this.hitCount = 0;
    this.lastHitMt = 0;
    this.zerarMovimentoE3();
    if (name[0] === 's') this.hist.length = 0;
  }

  endMove(inp: InputFrame | null): void {
    this.move = null;
    this.zerarCarga();
    if (!this.grounded) this.setState('jump');
    else this.setState(inp && inp.down ? 'crouch' : 'idle');
  }

  knockdown(dir: number, kb: number): void {
    this.setState('down');
    this.phase = 'air';
    this.vx = kb * dir * 1.15;
    this.vy = -9;
    if (this.grounded) this.y -= 1;
    this.stun = 0;
    this.move = null;
  }

  private poeira(jogo: PartidaParaLutador, x: number, n: number, power: number): void {
    jogo.emitir({ tipo: 'dust', x, n, power });
  }

  update(inp: InputFrame, opp: Fighter, jogo: PartidaParaLutador): void {
    this.corpoDoUpdate(inp, opp, jogo);
  }

  /**
   * V2-1 (`motorV2.entradaNoHitstop`): entrega o que o jogador fez DURANTE o hitstop, antes do `update` do 1º tick acionável.
   * As direções entram em `hist` antes da do tick, então uma meia-lua feita no congelamento conta. O botão vira `buf` com `t: 10`
   * porque o `update` do próprio tick o decrementa antes de ler a entrada: ao fim da leitura ele vale 9, como um aperto neste tick; se
   * o tick traz outro botão, esse sobrescreve (o aperto mais recente vence).
   */
  receberEntradaDoCongelamento(botao: ChaveAtaque | null, dirs: readonly number[], esq = false): void {
    for (const d of dirs) {
      this.hist.push(d);
      if (this.hist.length > 30) this.hist.shift();
    }
    if (botao) this.buf = { k: botao, t: 10 };
    // ESQUIVA apertada no congelamento: o `update` do tick decrementa `bufEsq` antes de ler a entrada, então +1 deixa o buffer inteiro.
    if (esq) this.bufEsq = ESQUIVA_PADRAO.buffer + 1;
  }

  private corpoDoUpdate(inp: InputFrame, opp: Fighter, jogo: PartidaParaLutador): void {
    this.age++;
    this.st++;
    // Carga só existe dentro do golpe `carga`: acertado, derrubado ou trocado de golpe, o nível some no tick seguinte.
    if (this.nivelCarga !== 0 && !(this.state === 'move' && this.move !== null && this.golpeAtual().carga)) this.zerarCarga();
    // Idem o RESORTE: a fase só existe dentro do golpe `rebote` (pousar vira `_lag`; acertado ou derrubado, some no tick seguinte).
    if (this.reboteFase !== 0 && !(this.state === 'move' && this.move !== null && this.golpeAtual().rebote)) this.reboteFase = 0;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    const flu = jogo.fluidez;
    this.flu = flu;
    // M2: dentro do dash o botão guardado não expira (o dash cancela a partir do tick 4; antes disso o aperto espera)
    const congelaBuf = flu?.dashCancela === true && this.state === 'dash';
    if (this.buf && !congelaBuf && --this.buf.t <= 0) this.buf = null;
    if (flu?.fila === true) {
      // M3: 2 vagas. `buf` é a mais antiga e executa primeiro; a 2ª sobe para a 1ª assim que a 1ª é gasta ou expira
      if (this.bufFila && !congelaBuf && --this.bufFila.t <= 0) this.bufFila = null;
      if (!this.buf && this.bufFila) {
        this.buf = this.bufFila;
        this.bufFila = null;
      }
    }
    for (const k of ATK_KEYS) {
      if (inp[k]) {
        if (flu?.fila === true && this.buf) this.bufFila = { k, t: 9 };
        else this.buf = { k, t: 9 };
        break;
      }
    }
    // R-7: UMA chamada por tick, ANTES de qualquer estado (como o `buf` acima). Com a flag desligada, nada roda: nenhuma
    // borda é guardada e nenhum estado novo aparece (igual ao motor de antes, bit a bit).
    this.golpeSuperNoTick = jogo.ritmoSuperLigado === true && jogo.superBloqueadoPara?.(this) !== true ? this.superNaBorda(inp) : null;
    this.agarrarNoTick = flu?.agarraoPar === true ? this.agarrarNaBorda(inp) : false;
    if (this.armor > 0) this.armor--;
    // ESQUIVA: o botão fica guardado `buffer` ticks. Com a flag desligada nada disto roda (ignorado antes de qualquer conta).
    if (jogo.esquivaLigada === true) {
      if (this.bufEsq > 0) this.bufEsq--;
      if (inp.esq === true) this.bufEsq = ESQUIVA_PADRAO.buffer;
    }
    const back = this.facing > 0 ? inp.left : inp.right;
    this.holdBack = !!back;
    this.inp = inp;
    this.opp = opp;
    this.hist.push(dirNum(inp, this.facing));
    if (this.hist.length > 30) this.hist.shift();
    const hdir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const tapped = hdir && hdir !== this.prevH;
    this.prevH = hdir;
    const cm = this.state === 'move' ? this.golpeAtual() : null;
    const trailing = this.state === 'dash' || this.state === 'esquiva' || (cm && (cm.type === 'rush' || cm.type === 'leap' || cm.type === 'rebote') && this.mt >= cm.S);
    if (trailing && this.age % 2 === 0) {
      this.trail.push({ x: this.x, y: this.y, name: this.poseT().name, f: this.facing, life: 10 });
    }
    for (const tr of this.trail) tr.life--;
    if (this.trail.length) this.trail = this.trail.filter((tr) => tr.life > 0);
    switch (this.state) {
      case 'ko':
        this.physics(jogo);
        if (this.grounded) this.vx *= 0.88;
        return;
      case 'down':
        this.updateDown(jogo);
        return;
      case 'hit':
      case 'block':
        if (this.grounded) this.vx *= 0.84;
        this.physics(jogo);
        if (--this.stun <= 0 && (this.state === 'hit' || this.state === 'block')) {
          this.gotHits = 0;
          this.setState(this.grounded ? (inp.down ? 'crouch' : 'idle') : 'jump');
        }
        return;
      case 'esquiva': // sem regen (igual ao dash)
        this.updateEsquiva(jogo);
        return;
      case 'win':
      case 'cena': // cena da fase 2 do chefe (BAATAR antigo: Dança da Águia; ZENON: estala os dedos): parado até o Game devolver o controle
        this.vx = 0;
        this.physics(jogo);
        return;
      case 'prejump': // agachadinha antes de saltar
        this.vx = 0;
        if (this.st >= 3) {
          this.vy = JUMP_FORCE * this.ch.jump;
          this.y -= 1;
          this.vx = this.jdir * WALK_SPEED * this.ch.spd * 1.3;
          this.setState('jump');
          this.airUsed = false;
          jogo.emitir({ tipo: 'jump', lutador: this.indice });
          this.poeira(jogo, this.x, 5, 0.8);
        }
        this.physics(jogo);
        return;
      case 'dash':
        if (flu?.dashCancela === true && this.cancelarDash(inp, jogo)) {
          this.physics(jogo);
          return;
        }
        this.vx =
          this.dashDir * this.facing * (this.dashDir > 0 ? 10.5 : 9) * this.ch.spd * Math.max(0, 1 - this.st / this.dashLen) * 1.25;
        if (this.st >= this.dashLen) this.setState('idle');
        this.physics(jogo);
        return;
      case 'move':
        this.updateMove(inp, opp, jogo);
        this.regen(jogo.regenDeBarra);
        return;
      default:
        break;
    }
    // ---- estados livres: parado, andando, agachado, pulando ----
    if (this.state === 'land' && this.st >= 4) this.setState('idle');
    if (this.grounded) {
      this.facing = opp.x >= this.x ? 1 : -1;
      this.crouching = !!inp.down;
      // ESQUIVA vem ANTES do buffer de ataque: se as duas coisas saem no mesmo tick, a esquiva vence e zera `buf`.
      if (jogo.esquivaLigada === true && this.bufEsq > 0 && this.tentarEsquivar(inp, jogo)) return;
      // R-7: o super vence o `buf` de um botão só (hp OU hk sozinho continuaria no buf e viraria o golpe de hoje).
      if (this.golpeSuperNoTick) {
        this.limparBuffer();
        this.startMove(this.golpeSuperNoTick, jogo, true);
        this.physics(jogo);
        return;
      }
      // M6: lp + lk juntos, rival ao alcance = agarrão (sem esperar: se só um botão chegou, o normal sai e `promoverPar` troca)
      if (this.agarrarNoTick) {
        this.limparBuffer();
        this.startMove('throw', jogo);
        this.physics(jogo);
        return;
      }
      // R-7: hp OU hk sozinho ainda pode virar par (até 2 ticks) — espera antes de resolver como golpe comum.
      if (this.aguardandoParDoSuper(jogo)) {
        this.physics(jogo);
        return;
      }
      if (this.buf) {
        const nm = this.resolveAttack(this.buf.k, inp);
        this.buf = null;
        if (nm) {
          if (this.canAfford(nm)) {
            this.startMove(nm, jogo);
            this.physics(jogo);
            return;
          }
          jogo.emitir({ tipo: 'deny', lutador: this.indice });
        }
      }
      // M5 (`fluidez.toque`): no celular o humano não tem duplo toque (o joystick oscila no limiar e vira dash por engano; a esquiva cobre)
      const semDash = flu?.toque === true && flu.semDashNoToque === true && this.cpu === null;
      if (tapped && !semDash && !inp.down && !inp.up && this.state !== 'land') {
        // toque duplo = corrida / recuo rápido
        if (this.lastTap.dir === hdir && this.age - this.lastTap.t < 13) {
          this.dashDir = hdir * this.facing;
          this.dashLen = this.dashDir > 0 ? 16 : 18;
          this.setState('dash');
          this.lastTap.t = -99;
          if (this.dashDir < 0) this.invuln = Math.max(this.invuln, 6);
          jogo.emitir({ tipo: 'jump', lutador: this.indice });
          this.poeira(jogo, this.x - this.facing * 20, 7, 1);
          this.physics(jogo);
          return;
        }
        this.lastTap = { dir: hdir, t: this.age };
      }
      if (this.state === 'land') {
        this.vx = 0;
      } else if (inp.down) {
        this.vx = 0;
        this.setState('crouch');
      } else {
        const dir = hdir;
        const st = this.ch.stride || 11;
        this.vx = dir * WALK_SPEED * this.ch.spd * (dir * this.facing < 0 ? 0.8 : 1);
        if (dir) {
          const b0 = Math.floor(this.walkDist / st);
          this.walkDist += this.vx * this.facing;
          const b1 = Math.floor(this.walkDist / st);
          if (b0 !== b1 && (((b1 % 4) + 4) % 4 === 0)) this.poeira(jogo, this.x - this.facing * 10, 2, 0.6);
        }
        this.setState(dir ? 'walk' : 'idle');
        if (inp.up) {
          this.jdir = dir;
          this.vx = 0;
          this.setState('prejump');
        }
      }
    } else {
      this.crouching = false;
      this.setState('jump');
      if (this.buf && !this.airUsed) {
        const nm = this.resolveAttack(this.buf.k, inp);
        this.buf = null;
        if (nm) this.startMove(nm, jogo);
      }
    }
    this.physics(jogo);
    this.regen(jogo.regenDeBarra);
  }

  /** A esquiva está na RECUPERAÇÃO (já sem invulnerabilidade; punível por golpe, arremesso e contragolpe)? Para a CPU. */
  get esquivaPunivel(): boolean {
    return this.state === 'esquiva' && this.invuln <= 0 && this.esqT >= this.trechoDaEsquiva.invFim;
  }

  private get trechoDaEsquiva(): TrechoEsquiva {
    return this.esqDir > 0 ? ESQUIVA_PADRAO.frente : ESQUIVA_PADRAO.tras;
  }

  /**
   * Começa a esquiva se há energia (`en >= custo`). Sem energia: um `deny` (o som do especial sem barra), nada é gasto e o botão guardado
   * é descartado. Frente segurada = avanço; trás, neutro, ↓ ou ↑ = recuo. Devolve true se começou (o tick já andou o 1º passo).
   */
  private tentarEsquivar(inp: InputFrame, jogo: PartidaParaLutador): boolean {
    if (this.en < ESQUIVA_PADRAO.custo) {
      this.bufEsq = 0;
      jogo.emitir({ tipo: 'deny', lutador: this.indice });
      return false;
    }
    const frente = this.facing > 0 ? inp.right : inp.left;
    this.esqDir = frente ? 1 : -1;
    this.en -= ESQUIVA_PADRAO.custo;
    this.bufEsq = 0;
    this.buf = null;
    this.crouching = false;
    this.esqT = 0;
    this.esquivaId++;
    this.esquivados.clear();
    this.vx = 0;
    this.setState('esquiva');
    const tr = this.trechoDaEsquiva;
    if (tr.invIni === 0) this.invuln = Math.max(this.invuln, tr.invFim);
    jogo.emitir({ tipo: 'esquiva', lutador: this.indice, dir: this.esqDir, x: this.x });
    this.poeira(jogo, this.x - this.facing * 20, 7, 1);
    this.updateEsquiva(jogo);
    return true;
  }

  /**
   * Um tick da esquiva. Anda `dist` px em `invFim` ticks com velocidade decrescente (v = k·(1 − t/T), integral = dist, escalada por
   * `spd`), fica invulnerável em [invIni, invFim) e depois só espera a recuperação (vulnerável, sem bloquear). Sem pulo: `y` fixo.
   */
  private updateEsquiva(jogo: PartidaParaLutador): void {
    const tr = this.trechoDaEsquiva;
    const t = this.esqT;
    if (t < tr.invFim) {
      const k = (2 * tr.dist) / (tr.invFim + 1);
      this.vx = this.esqDir * this.facing * k * (1 - t / tr.invFim) * this.ch.spd;
    } else this.vx = 0;
    if (t === tr.invIni && tr.invIni > 0) this.invuln = Math.max(this.invuln, tr.invFim - tr.invIni);
    this.physics(jogo);
    this.esqT++;
    if (this.esqT >= tr.dur) {
      this.vx = 0;
      this.setState('idle');
    }
  }

  /** Registra (uma vez por golpe/projétil nesta esquiva) que `chave` teria acertado quem está na janela invulnerável. */
  registrarEsquivada(chave: string): boolean {
    if (this.esquivados.has(chave)) return false;
    this.esquivados.add(chave);
    return true;
  }

  regen(taxa = 0.04): void {
    this.en = Math.min(MAX_EN, this.en + taxa);
  }

  private updateMove(inp: InputFrame, opp: Fighter, jogo: PartidaParaLutador): void {
    const mv = this.golpeAtual();
    this.mt++;
    if (this.promoverPar(jogo, mv)) {
      this.physics(jogo);
      return;
    }
    const segurando = mv.carga ? this.tickDaCarga(mv, inp, jogo) : false;
    if (mv.rebote) this.tickDoRebote(mv, jogo);
    if (mv.through) this.tickDoCruzamento(mv, opp);
    if (mv.hits && this.hitDone && this.hitCount < mv.hits && this.mt - this.lastHitMt >= (mv.every || 6)) this.hitDone = false; // golpe de vários acertos
    // R-8 (`ritmo.cadeia`): cancelar exige ACERTO confirmado do golpe em curso (o histórico do combo), não o `connected` que o bloqueio também liga.
    const cadeia = jogo.ritmoCadeiaLigada === true;
    const confirmou = cadeia ? this.acertoConfirmado() : this.connected;
    if (mv.throw) {
      // Sem `agarrao.janela` o agarrão testa só em mt === S (o arremesso de sempre). Com janela (ABRAÇO), testa a cada
      // tick de [S, S + janela) até agarrar uma vez (`hitDone` marca "já agarrou"; golpe `throw` nunca usa caixa de acerto).
      const janela = mv.agarrao?.janela;
      const noInicio = this.mt === mv.S;
      const dentro = janela ? this.mt >= mv.S && this.mt < mv.S + janela && !this.hitDone : noInicio;
      if (dentro) {
        if (this.canThrow(mv)) {
          if (janela) this.hitDone = true;
          jogo.arremessar(this, opp, mv);
        } else if (noInicio) jogo.emitir({ tipo: 'swing', lutador: this.indice, golpe: 'kick' });
      }
    }
    if (mv.type === 'fire') {
      // projétil(eis)
      const sh = mv.shots || [mv.S];
      if (this.shots < sh.length && this.mt === sh[this.shots]) {
        jogo.lancarProjetil(this, mv, this.shots, sh.length);
        this.shots++;
      }
    } else if ((mv.type === 'rise' || mv.type === 'leap') && this.mt === mv.S) {
      // salto do golpe
      this.vy = mv.vy ?? 0;
      // Salto com alvo (E3): `vxAlvo` = ticks de voo; a velocidade é a distância até o rival hoje / ticks, limitada por
      // |mv.vx| (16 se ausente). Sem `vxAlvo` é a velocidade fixa de sempre.
      if (mv.vxAlvo) {
        const teto = Math.abs(mv.vx ?? 16);
        this.vx = clamp((opp.x - this.x) / mv.vxAlvo, -teto, teto);
      } else this.vx = this.facing * (mv.vx ?? 0);
      this.y -= 1;
      jogo.emitir({ tipo: 'jump', lutador: this.indice });
    } else if (mv.type === 'troca' && mv.troca && this.mt === mv.S) {
      // VADIVU (NILA): a troca acontece em mt === S, sem mexer em hp/maxHp. A ficha nova traz o mesmo golpe no mesmo slot
      // (tempos iguais), então o golpe segue de onde estava.
      this.trocarFicha(mv.troca.ficha);
      jogo.emitir({ tipo: 'troca-ficha', lutador: this.indice, ficha: mv.troca.ficha });
    } else if (!mv.air && mv.rank < 9 && confirmou && this.mt >= mv.S && this.golpeSuperNoTick && (!cadeia || cadeiaCabeMais(this.cadeiaGolpes.length))) {
      // R-7: "entra a partir de qualquer normal que conectou" (§3.4) — o mesmo cancelamento de rank maior, mas achado
      // pelo PAR hp+hk (não pelo `buf` de um botão só). golpe especial (rank 9) não cancela para o super (MVP, §3.4):
      // `mv.rank < 9` já garante isso, igual ao cancelamento comum.
      const nm = this.golpeSuperNoTick;
      const encadeados = [...this.cadeiaGolpes, nm];
      this.buf = null;
      this.startMove(nm, jogo, true);
      this.cadeiaGolpes = encadeados;
      this.rep = 0;
      this.physics(jogo);
      return;
    } else if (!mv.air && mv.rank < 9 && confirmou && this.mt >= mv.S && this.aguardandoParDoSuper(jogo)) {
      // R-7: hp OU hk sozinho ainda pode virar par (até 2 ticks) — espera antes de resolver `buf` como cancelamento comum.
    } else if (!mv.air && mv.rank < 9 && confirmou && this.mt >= mv.S && this.buf) {
      // combo: cancela em golpe de rank maior
      const nm = this.resolveAttack(this.buf.k, inp);
      const nmv = nm ? this.ch.moves[nm] : null;
      if (
        nm &&
        nmv &&
        this.canAfford(nm) &&
        (cadeia
          ? this.cadeiaAbre(nm, nmv.rank, !!mv.rep && nm === this.move && this.rep < 2)
          : nmv.rank > mv.rank || (mv.rep && nm === this.move && this.rep < 2) || (jogo.combosLigados === true && this.comboProprioAbre(nm)))
      ) {
        const rep = nm === this.move ? this.rep + 1 : 0;
        const encadeados = [...this.cadeiaGolpes, nm];
        this.buf = null;
        this.startMove(nm, jogo);
        this.cadeiaGolpes = encadeados;
        this.rep = rep;
        this.physics(jogo);
        return;
      }
    }
    if (this.grounded) {
      const rushing = mv.type === 'rush' && this.mt >= mv.S && this.mt < mv.S + mv.A;
      // `through` (REVERS) anda no sentido do INÍCIO: o `facing` vira ao cruzar o rival, a corrida não.
      if (rushing) this.vx = (mv.through ? this.dirCorrida : this.facing) * (mv.vx ?? 0) * (this.hitDone ? 0.3 : 1);
      else this.vx *= 0.8;
      if (mv.adv && !segurando && this.mt >= mv.S - 2 && this.mt < mv.S + mv.A) this.x += (this.facing * mv.adv) / (mv.A + 2); // avanço ao golpear
      if (segurando && mv.carga) {
        // carregando: anda devagar (a carga segura o golpe em mt = S−1, então o decaimento acima não pode comer a velocidade)
        const hdir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
        this.vx = hdir * WALK_SPEED * this.ch.spd * mv.carga.andar;
      }
      if (this.reboteFase === 1 && mv.rebote) this.vx = -this.facing * mv.rebote.vel; // ida do RESORTE: corre de costas até a parede
    }
    const R = this.move === '_lag' ? this.lagR : mv.R;
    if (!mv.air && !mv.rebote && this.mt >= mv.S + mv.A + R) {
      this.endMove(inp);
      this.physics(jogo);
      return;
    }
    this.physics(jogo);
  }

  /** Os golpes do `historicoCombo` na ordem, só se o último é um acerto do golpe EM CURSO (um bloqueio do golpe atual não continua combo). */
  private golpesDoComboEmCurso(): NomeGolpe[] {
    const h = this.historicoCombo;
    const ultimo = h[h.length - 1];
    if (!ultimo || ultimo.atk !== this.atkId || ultimo.golpe !== this.move) return [];
    return h.map((x) => x.golpe);
  }

  /** R-8: o golpe em curso ACERTOU (não só foi bloqueado)? O último item do histórico é uma execução deste golpe. */
  acertoConfirmado(): boolean {
    const h = this.historicoCombo;
    const ultimo = h[h.length - 1];
    return ultimo !== undefined && ultimo.atk === this.atkId && ultimo.golpe === this.move;
  }

  /** R-8: a cadeia por força deixa cancelar do golpe em curso para `nm` (rank `rankNm`)? A assinatura (combo próprio) abre o que a força proíbe, mas o teto de 4 golpes vale sempre. */
  private cadeiaAbre(nm: NomeGolpe, rankNm: number, repete: boolean): boolean {
    if (!cadeiaCabeMais(this.cadeiaGolpes.length)) return false;
    if (this.comboProprioAbre(nm)) return true;
    return cadeiaPermite(this.cadeiaGolpes.map((g) => this.ch.moves[g].rank), rankNm, repete);
  }

  /** V2-4: `histórico + nm` é prefixo de um combo próprio da ficha ativa? Então o cancelamento vale mesmo fora da regra de rank. */
  private comboProprioAbre(nm: NomeGolpe): boolean {
    return comboAbreCancelamento(this.ch.combosProprios, this.golpesDoComboEmCurso(), nm);
  }

  /** V2-4: golpes que continuam algum combo próprio a partir do golpe que acabou de acertar (a CPU escolhe entre eles). Vazio = nada a continuar. */
  continuacoesDoComboProprio(): NomeGolpe[] {
    return golpesQueContinuam(this.ch.combosProprios, this.golpesDoComboEmCurso());
  }

  /**
   * Golpe `carga` (MASHI): em mt = S−1, com `spSeg` apertado, o golpe fica parado ali e soma 1 em `carga` por tick.
   * Soltar `spSeg` (ou chegar a `carga.max`) deixa o mt andar; o nível vem de `carga.niveis`. Um toque sem segurar também
   * sai (nível 1). Devolve true no tick em que o golpe ficou parado (o chamador anda devagar e não avança `adv`).
   * O tick que chega a mt = S−1 já conta como o 1º segurado. O evento `carga` sai ao começar (nível 1) e a cada subida.
   */
  private tickDaCarga(mv: GolpeMontado, inp: InputFrame, jogo: PartidaParaLutador): boolean {
    const c = mv.carga as CargaDef;
    if (!this.carregando && this.mt === mv.S - 1) {
      this.nivelCarga = 1;
      if (inp.spSeg) {
        this.carregando = true;
        jogo.emitir({ tipo: 'carga', lutador: this.indice, nivel: 1 });
      }
    }
    if (!this.carregando) return false;
    if (!inp.spSeg) {
      this.carregando = false; // soltou: o mt segue no próximo passo (este tick já avançou para S)
      return false;
    }
    this.carga++;
    this.mt = mv.S - 1;
    const n = nivelDaCarga(c, this.carga);
    if (n !== this.nivelCarga) {
      this.nivelCarga = n;
      jogo.emitir({ tipo: 'carga', lutador: this.indice, nivel: n });
    }
    if (this.carga >= c.max) this.carregando = false; // auto-solta no máximo
    return true;
  }

  /**
   * RESORTE (CENTELLA): em `mt >= S` a ida corre de costas até a margem da parede de TRÁS dela (a mesma de `physics`: 60
   * ou LARGURA − 60) ou até `maxTicks`; então quica: evento `rebote`, salto curto e voadora com velocidade
   * `vxBase + momento × vxPorPx`. O dano cresce com o mesmo `momento` (`noAtaque`). Quem está encostada na parede quica
   * já no 1º tick, com momento 0. A ida não tem caixa de acerto; a volta tem, até pousar (`activeMove`).
   */
  private tickDoRebote(mv: GolpeMontado, jogo: PartidaParaLutador): void {
    const r = mv.rebote as ReboteDef;
    if (this.reboteFase === 0 && this.mt >= mv.S) {
      this.reboteFase = 1;
      this.reboteX0 = this.x;
      this.reboteTicks = 0;
    }
    if (this.reboteFase !== 1) return;
    this.momento = Math.min(Math.abs(this.x - this.reboteX0), r.maxDist);
    this.reboteTicks++;
    const naParede = this.facing > 0 ? this.x <= MARGEM_PAREDE : this.x >= LARGURA - MARGEM_PAREDE;
    if (naParede || this.reboteTicks > r.maxTicks) {
      this.reboteFase = 2;
      this.vy = r.vy;
      this.vx = this.facing * (r.vxBase + this.momento * r.vxPorPx);
      this.y -= 1;
      jogo.emitir({ tipo: 'rebote', lutador: this.indice, x: this.x });
    }
  }

  /**
   * REVERS (CAMILLE, golpe `through`): ao passar do x do rival ela vira (`facing` troca) e só DEPOIS a caixa de acerto
   * vale (`activeMove`): o chute de calcanhar acerta pelas costas dele. A checagem vem ANTES do movimento do tick, então
   * o cruzamento é percebido um tick depois de o sinal da distância inverter; nesse meio tempo o `facing` do rival já
   * acompanhou o dela, e é o que dá a ele a chance de estar segurando o "trás" novo quando o chute chega. A corrida
   * segue no sentido do início.
   */
  private tickDoCruzamento(mv: GolpeMontado, opp: Fighter): void {
    if (this.cruzouEm >= 0 || this.mt < mv.S) return;
    if ((opp.x - this.x) * this.dirCorrida <= 0) {
      this.cruzouEm = this.mt;
      this.facing = (-this.dirCorrida) as 1 | -1;
    }
  }

  get passing(): boolean {
    // O AVANÇO da esquiva atravessa o corpo do rival durante todo o movimento (o arranque vulnerável também): sem empurrão.
    if (this.state === 'esquiva') return this.esqDir > 0 && this.esqT < ESQUIVA_PADRAO.frente.invFim;
    if (this.state !== 'move') return false;
    const mv = this.golpeAtual();
    return !!mv.through && this.mt < mv.S + mv.A + 4;
  }

  private updateDown(jogo: PartidaParaLutador): void {
    if (this.phase === 'air') {
      this.physics(jogo);
    } else if (this.phase === 'lie') {
      this.vx *= 0.85;
      this.x += this.vx;
      if (this.st > 34) {
        this.phase = 'rise';
        this.st = 0;
      }
    } else if (this.phase === 'rise') {
      if (this.st > 14) {
        this.gotHits = 0;
        this.invuln = 12;
        this.setState('idle');
      }
    }
  }

  private physics(jogo: PartidaParaLutador): void {
    this.x += this.vx;
    if (this.y < GROUND || this.vy < 0) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND) {
        this.y = GROUND;
        this.vy = 0;
        this.onLand(jogo);
      }
    }
    const m = this.state === 'ko' || this.state === 'down' ? 150 : 60;
    this.x = clamp(this.x, m, LARGURA - m);
  }

  private onLand(jogo: PartidaParaLutador): void {
    if (this.state === 'jump') {
      this.setState('land');
      this.vx = 0;
      jogo.emitir({ tipo: 'land', lutador: this.indice });
      this.poeira(jogo, this.x, 8, 1);
    } else if (this.state === 'move' && (this.golpeAtual().air || this.reboteFase === 2)) {
      const lag = this.golpeAtual().lag;
      jogo.emitir({ tipo: 'land', lutador: this.indice });
      if (lag) {
        this.move = '_lag';
        this.mt = 0;
        this.vx = 0;
        this.lagR = lag;
      } else {
        this.move = null;
        this.setState('land');
        this.vx = 0;
      }
      this.poeira(jogo, this.x, 8, 1);
    } else if (this.state === 'down' && this.phase === 'air') {
      this.phase = 'lie';
      this.st = 0;
      jogo.emitir({ tipo: 'land', lutador: this.indice });
      jogo.aoCair(this);
    } else if (this.state === 'hit') {
      this.setState('idle');
    }
  }

  hurtbox(): Retangulo {
    return hurtbox({
      x: this.x,
      y: this.y,
      state: this.state,
      baixo: this.isLow(),
      noChao: this.grounded,
      rente: this.state === 'move' && !!this.golpeAtual().rente,
      ...(this.ch.alturaEmPe !== undefined ? { escalaEmPe: this.ch.alturaEmPe } : {}),
    });
  }

  attackBox(b: { fx: number; fy: number; w: number; h: number }): Retangulo {
    return attackBox(this, b);
  }

  /** Golpe atualmente na fase ativa (ou null). */
  activeMove(): GolpeMontado | null {
    if (this.state !== 'move') return null;
    const mv = this.golpeAtual();
    if (mv.type === 'fire' || mv.kind === 'lag' || mv.throw) return null;
    if (mv.parry || mv.type === 'troca') return null; // PARADE e VADIVU não têm caixa de acerto (a PARADE age em `applyHit`)
    if (mv.rebote) return this.reboteFase === 2 ? mv : null; // só a voadora da volta acerta; a ida é só corrida
    if (mv.through && this.cruzouEm < 0) return null; // REVERS: só acerta depois de cruzar o rival
    return this.mt >= mv.S && (mv.air || this.mt < mv.S + mv.A) ? mv : null;
  }

  /** Recalcula `pose` (o protótipo chamava poseT() ao desenhar; aqui vai no tick). */
  atualizarPose(): void {
    this.pose = this.poseT();
  }

  /**
   * Escolhe o QUADRO da animação (+ pequenos ajustes de transformação quando a arte ainda é a antiga,
   * de poucas poses). Sem efeitos colaterais.
   */
  poseT(): PoseAtual {
    const ch = this.ch;
    const t = this.age;
    const L = ch.legacy;
    const P: PoseAtual = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 };
    switch (this.state) {
      case 'idle': {
        const seq = [0, 1, 2, 3, 2, 1];
        P.name = 'idle' + seq[Math.floor(t / 9) % 6];
        if (L) {
          const s = Math.sin(t / 16);
          P.sy = 1 + 0.012 * s;
          P.sx = 1 - 0.006 * s;
          P.name = Math.floor(t / 34) % 2 ? 'idle2' : 'idle0';
        }
        break;
      }
      case 'walk': {
        const st = ch.stride || 11;
        const i = ((Math.floor(this.walkDist / st) % 8) + 8) % 8;
        P.name = 'walk' + i;
        if (L) P.dy = -Math.abs(Math.sin(((this.walkDist / st) / 2) * Math.PI)) * 3;
        break;
      }
      case 'dash':
        if (this.dashDir > 0) {
          P.name = 'walk' + (Math.floor(this.st / 2) % 8);
          P.rot = 0.07;
        } else {
          P.name = 'jup';
          P.dy = -Math.sin(Math.min(1, this.st / this.dashLen) * Math.PI) * 18;
        }
        break;
      case 'prejump':
        P.name = 'jsquat';
        if (L) P.sy = 0.9;
        break;
      case 'land':
        P.name = 'land';
        if (L) P.sy = 0.93;
        break;
      case 'crouch':
        P.name = 'crouch';
        break;
      case 'jump':
        P.name = this.vy < -5 ? 'jup' : this.vy > 4 ? 'jfall' : 'jtop';
        break;
      case 'move':
        this.moveFrame(P);
        break;
      case 'hit':
        P.name = this.crouching ? 'hitB' : 'hit' + this.hitKind;
        P.dx = this.st < 5 ? -5 + this.st : 0;
        if (L && this.crouching) P.sy = 0.86;
        break;
      case 'block':
        P.name = this.crouching ? 'cblock' : 'block';
        P.dx = this.st < 5 ? -8 + this.st : 0;
        break;
      case 'down':
      case 'ko':
        if (this.state === 'ko' ? this.y < GROUND - 6 : this.phase === 'air') {
          P.name = 'kdAir';
          if (L) P.rot = clamp(this.vy / 40, -0.5, 0.5) * -1;
        } else if (this.state === 'down' && this.phase === 'rise') P.name = 'crouch';
        else P.name = 'koFloor';
        break;
      case 'cena': {
        // Poses da `ConfigChefe.cena` em partes iguais da duração (spec-chefao-zenon §2); pose que falta no atlas cai na cadeia de `getPD`.
        const cena = this.cfgChefe?.cena;
        P.name = cena ? poseDaCena(cena, this.st) : 'win';
        break;
      }
      case 'esquiva': {
        // janela invulnerável: corpo baixo inclinado (crouch, rot ∓0,12); recuperação: land. Os dois quadros existem em todo atlas.
        const tr = this.trechoDaEsquiva;
        if (this.esqT <= tr.invFim) {
          P.name = 'crouch';
          P.rot = this.esqDir * 0.12;
        } else P.name = 'land';
        break;
      }
      case 'win':
        P.name = 'win';
        if (L) {
          P.dy = -Math.abs(Math.sin(this.st / 11)) * 10;
          P.sy = 1 + 0.015 * Math.sin(this.st / 5);
        }
        break;
    }
    return P;
  }

  private moveFrame(P: PoseAtual): void {
    const ch = this.ch;
    const L = ch.legacy;
    const mv = this.golpeAtual();
    const A = mv.anim;
    const into = this.mt - mv.S;
    const pick = (fr: readonly string[], p: number): string => fr[clamp(Math.floor(p * fr.length), 0, fr.length - 1)] as string;
    if (into < 0) {
      const p = clamp(this.mt / Math.max(1, mv.S), 0, 0.999);
      P.name = pick(A.s, p);
      if (mv.type === 'fire') P.glow = p;
      if (mv.carga) P.glow = clamp(this.carga / mv.carga.max, 0, 1); // o punho brilha mais a cada tick segurado
      if (L) {
        if (mv.type === 'fire') {
          P.sy = lerp(1, 0.86, p);
          P.sx = lerp(1, 1.08, p);
          P.dx = -10 * p;
        } else if (mv.pre) P.sy = lerp(1, 0.94, p);
        else if (!mv.crouch && !mv.air) {
          P.dx = -7 * p;
          if (mv.heavy) {
            P.dx = -12 * p;
            P.sx = 1 + 0.03 * p;
          }
        }
      }
      return;
    }
    if (mv.rebote) {
      // ida: corrida de costas (a[0], espelhada); volta: voadora (a[1], ou a[0] se a ficha só tem uma pose)
      if (this.reboteFase === 1) {
        P.name = A.a[0] as string;
        P.flip = -1;
      } else {
        P.name = (A.a[1] ?? A.a[0]) as string;
        if (L && !hasPose(ch, P.name)) P.rot = 0.22;
      }
      return;
    }
    if (mv.air) {
      if (A.fall && this.vy > 3) P.name = A.fall;
      else if (A.loop) P.name = A.a[Math.floor(into / A.loop) % A.a.length] as string;
      else P.name = A.a[Math.min(A.a.length - 1, Math.floor(into / 5))] as string;
    } else if (into < mv.A) {
      P.name = A.loop ? (A.a[Math.floor(into / A.loop) % A.a.length] as string) : pick(A.a, into / mv.A);
    } else {
      const R = this.move === '_lag' ? this.lagR : mv.R;
      P.name = pick(A.r || A.a, (into - mv.A) / Math.max(1, R));
    }
    if (mv.type === 'fire') P.glow = into < mv.A ? 1 : Math.max(0, 1 - (into - mv.A) / mv.R);
    if (mv.carga) P.glow = clamp(this.carga / mv.carga.max, 0, 1);
    if (mv.spin && (mv.air || into < mv.A)) P.flip = Math.floor(into / 3) % 2 ? -1 : 1;
    if (L) {
      if (mv.air && !hasPose(ch, mv.pose)) P.rot = 0.22;
      if (mv.tilt) P.rot = mv.tilt;
      if (mv.lift) P.dy -= mv.lift * Math.min(1, into / 3);
      if (mv.heavy && !mv.air && into < mv.A + 4) {
        P.dx += 7;
        P.sx = 1.04;
      }
      if (mv.type === 'rush' && !mv.tilt) P.rot = 0.1;
    }
  }

}
