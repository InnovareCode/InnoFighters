import { GROUND, LARGURA, MAX_EN, SH } from '../core/constantes';
import type {
  CameraLeitura,
  Configuracoes,
  EventoLuta,
  FaseLuta,
  IdLutador,
  IndiceLutador,
  InfoTreino,
  InputFrame,
  LeituraLuta,
  ModoLuta,
  MotorV2,
  PosFilme,
  RitmoMotor,
  TextoFlutuante,
} from '../core/contratos';
import { clamp, lerp, overlap, type Retangulo } from '../core/math';
import type { Rng } from '../core/rng';
import { apresentacaoDoEspecial } from '../data/apresentacao-especiais';
import { PROJ_BASE } from '../data/base-moves';
import { comboReconhecido } from '../data/combos-proprios';
import { danoBaseDaVariante, filmeDoGolpe, type FilmeDoGolpe, type VarianteDoDano } from '../data/filmes';
import type { LutadorMontado } from '../data/montar';
import type { ContraDef, DrenaEnergiaDef, FinalDoCombo, GolpeMontado, IdCenario, KindGolpe, NivelGolpe, NomeGolpe, SomGolpe } from '../data/tipos';
import { danoDeArmadura, danoDoGolpe } from './colisao';
import { NO_INPUT, cpuInput, perfilChefe } from './cpu';
import { dirNum } from './comandos';
import { ATK_KEYS, Fighter, type ChaveAtaque, type PartidaParaLutador } from './fighter';
import type { ProjetilLuta } from './projetil';

/** Alvo do modo treino (DUMMY_NAMES do protótipo). */
export type DummyTreino = 'stand' | 'crouch' | 'block' | 'crouchblock' | 'jump' | 'cpu';

/** cfg de Game.setup: {mode, c1, c2, cpu: nível da CPU no P2 (ou null), p1cpu: nível da CPU no P1 (ou null)}. */
export type ConfigPartida = {
  mode: ModoLuta;
  c1: IdLutador;
  c2: IdLutador;
  cpu?: number | null;
  p1cpu?: number | null;
  /** Cenário; padrão = o da casa do rival (c2). */
  stage?: IdCenario;
  /** Mantém a pontuação do P1 (modo arcade, entre lutas). */
  keepScore?: boolean;
  /**
   * E3: luta de chefe. O P2 (`c2`) vira o chefe SE o `LutadorDef` dele tiver `chefe`; senão a opção é ignorada
   * (é o lutador normal). Round único (`winsNeeded = 1`), seja qual for `ajustes.rounds`, e IA própria.
   */
  chefe?: boolean;
  /**
   * ESQUIVA (V1/V2): liga a mecânica nesta partida. Padrão false: desligada, `InputFrame.esq` é ignorado antes de qualquer conta e
   * nada muda (nem o RNG da CPU). Quem liga é a UI, a partir de `Regras.esquiva`.
   */
  esquiva?: boolean;
  /** Mecânicas da revisão do motor (v2), cada uma atrás da sua flag. Ausente = o motor de antes, bit a bit. Quem liga é a UI (`Regras.motorV2`). */
  motorV2?: MotorV2;
  /** R-6: as 6 flags do redesenho de ritmo que o motor lê (`cfgRitmo(regras)`). Ausente = o motor de antes, bit a bit. */
  ritmo?: RitmoMotor;
};

/** O que um humano fez durante o hitstop e ainda não chegou ao `Fighter` (V2-1): o último botão de ataque, as mudanças de direção e a ESQUIVA. */
type EntradaGuardada = { botao: ChaveAtaque | null; dirs: number[]; esq: boolean };
const entradaGuardadaVazia = (): EntradaGuardada => ({ botao: null, dirs: [], esq: false });

/** V2-3c (spec §4.1): nenhum golpe isolado, filme incluído, passa de 26 (28% da menor vida comum, 92). */
export const TETO_GOLPE = 26;
/** V2-3c (spec §4.1, H2): fração da vida TOTAL do defensor (todas as barras do chefão) que um combo tira, no máximo. */
export const TETO_COMBO = 0.4;
/** Piso do teto de combo: o teste CPU x CPU proíbe acerto de dano zero. */
const PISO_ACERTO_NO_TETO = 0.5;
/**
 * V2-4 (spec §6.1): como o ÚLTIMO golpe comum de um combo próprio derruba. `lanca` sobe mais (a queda `down` do `Fighter` sai com vy -9);
 * `parede` empurra com pelo menos este `kb` (o rival vai até a parede); `cruza` o joga PARA CIMA do atacante (sentido contrário) e ele
 * pousa do outro lado (lutador caído não é empurrado pelo `separate`).
 */
const QUEDA_LANCA_VY = -15;
const QUEDA_PAREDE_KB = 18;
const QUEDA_CRUZA_KB = 11;

/** O que o combo próprio reconhecido manda no acerto atual (V2-4): se este passo não derruba e como cai o último golpe comum. */
type PassoDoCombo = { readonly semQueda: boolean; readonly final: FinalDoCombo | undefined };

/** Distância final entre os dois depois do filme, quando o dado não diz (spec §3.4). */
const DISTANCIA_PADRAO_DO_FILME = 150;
/** Margem de parede de quem está caído (a mesma de `Fighter.physics`). */
const MARGEM_CAIDO = 150;

/**
 * R-6 (`ritmo.intervalos`, docs/spec-redesenho-jogabilidade.md §3.1): espera (ticks) de cada fase de intervalo, de hoje e
 * com a flag. `ko` vale tanto para o KO quanto para o fim por tempo (`timeover`): as duas fases esperam o mesmo hoje.
 * `intro` só encolhe a partir do round 2 (o round 1 é coberto pela sobreposição do R-2 na UI, flag separada).
 */
const KO_ESPERA = 100;
const KO_ESPERA_RITMO = 60;
const ROUNDEND_ESPERA = 175;
const ROUNDEND_ESPERA_RITMO = 90;
const INTRO_LEN_PADRAO = 90;
const INTRO_LEN_RODADA_SEGUINTE_RITMO = 60;
const MATCHEND_ESPERA = 150;
const MATCHEND_ESPERA_RITMO = 90;

/** Parte das configurações que a luta lê. Passe o MESMO objeto que a UI altera (shake é lido ao vivo). */
export type AjustesLuta = Pick<Configuracoes, 'rounds' | 'time' | 'shake'>;

/**
 * De onde vêm as entradas dos humanos. Só é chamada quando o protótipo chamava readInput(): na fase
 * 'fight' e só para lutadores sem CPU, P1 antes de P2. Assim a borda de descida (C2) não é consumida
 * em tick congelado por hitstop nem fora da luta.
 */
export interface FonteEntradas {
  /** `mesclado`: P1 lê teclado de P1 + P2 (modo solo/treino: readInputMerged). */
  p1(mesclado: boolean): InputFrame;
  p2(): InputFrame;
}

/** Ataque na forma que applyHit consome (golpe corpo a corpo ou projétil). */
type AtaqueAcerto = {
  dmg: number;
  kb: number;
  hs: number;
  bs: number;
  lvl: NivelGolpe;
  snd: SomGolpe;
  kind: KindGolpe | undefined;
  heavy: boolean;
  kd: boolean;
  hits: number | undefined;
  proj: boolean;
  /** E3: ticks de atordoamento que atravessam o bloqueio (nível 3 da MASHI). Ausente = o bloqueio segura. */
  quebraGuarda: number | undefined;
  /** E3: rank do golpe, para a armadura por rank. Projétil não tem rank (interrompe qualquer armadura de rank). */
  rank: number | undefined;
  /** E3 (S4): contragolpe reforçado se o rival estava na PREPARAÇÃO do golpe dele (COUP D'ARRÊT). */
  contra: ContraDef | undefined;
  /** V1 (cinemática): chave do golpe (num projétil, do golpe que o lançou), se é de ESPECIAL (nome começa com 's') e o nível da carga (MASHI). */
  golpe: string | undefined;
  especial: boolean;
  nivelCarga: 0 | 1 | 2 | 3;
  /** ZENON: imposto de energia no acerto/bloqueio (TRIBUTO, DECRETO). Projétil e golpe de vários acertos nunca têm (`montar` recusa). */
  drenaEnergia: DrenaEnergiaDef | undefined;
  /** V2-3c: a EXECUÇÃO que deu este acerto (`atkId` do atacante no `startMove`; num projétil, o do golpe que o lançou) e a ficha dele nesse instante. */
  atk: number;
  ficha: string | null;
};

/** Campos de cinemática que os eventos de acerto/defesa levam (só o que existe: `exactOptionalPropertyTypes`). */
const marcaDoGolpe = (mv: AtaqueAcerto): { golpe?: string; especial?: true } => ({
  ...(mv.golpe !== undefined ? { golpe: mv.golpe } : {}),
  ...(mv.especial ? { especial: true as const } : {}),
});

const textoFlutuante = (x: number, y: number, s: string, col: string, size: number): TextoFlutuante => ({ x, y, s, col, size });

/**
 * `atacante` só importa para golpe `carga`: o nível alcançado (`nivelCarga`) escolhe `carga.porNivel[nível − 1]`, que
 * sobrescreve dano, derrubada e quebra-guarda. Sem `carga` as contas são as de sempre (mesma ordem de operações).
 */
const noAtaque = (mv: GolpeMontado, atacante: Fighter): AtaqueAcerto => {
  const nivel = mv.carga ? mv.carga.porNivel[Math.max(1, atacante.nivelCarga) - 1] : undefined;
  const base = nivel?.dmg ?? mv.dmg ?? 0;
  return {
    // RESORTE (S3): o dano cresce com o percurso da ida (`momento`, já limitado a maxDist). Sem `rebote`, a conta é a de sempre.
    dmg: mv.rebote ? base + Math.min(atacante.momento, mv.rebote.maxDist) * mv.rebote.dmgPorPx : base,
    kb: mv.kb ?? 0,
    hs: mv.hs ?? 0,
    bs: mv.bs ?? 0,
    lvl: mv.lvl ?? 'mid',
    snd: mv.snd ?? 'punch',
    kind: mv.kind,
    heavy: !!mv.heavy,
    kd: !!(nivel?.kd ?? mv.kd),
    hits: mv.hits,
    proj: false,
    quebraGuarda: nivel?.quebraGuarda ?? mv.quebraGuarda,
    rank: mv.rank,
    contra: mv.contra,
    golpe: mv.id,
    especial: mv.id[0] === 's',
    nivelCarga: mv.carga ? atacante.nivelCarga : 0,
    drenaEnergia: mv.drenaEnergia,
    atk: atacante.atkId,
    ficha: atacante.ficha,
  };
};

export type Dependencias = {
  /** Os 4 lutadores já montados (data/montar). */
  lutadores: Readonly<Record<IdLutador, LutadorMontado>>;
  /** RNG da LÓGICA (CPU). Efeitos visuais usam outro, fora de fight/. */
  rng: Rng;
};

export class Game implements LeituraLuta, PartidaParaLutador {
  readonly p1: Fighter;
  readonly p2: Fighter;
  readonly fighters: readonly [Fighter, Fighter];
  private readonly lutadores: Readonly<Record<IdLutador, LutadorMontado>>;
  private readonly rng: Rng;
  private ajustes: AjustesLuta = { rounds: 2, time: 99, shake: true };

  mode: ModoLuta = 'versus';
  training = false;
  debug = false;
  stage: IdCenario = 'jp';
  winsNeeded = 2;
  timeMax = 0;
  timeLeft = 0;
  dummy: DummyTreino = 'stand';
  round = 1;
  phase: FaseLuta = 'idle';
  t = 0;
  tick = 0;
  shake = 0;
  hitstop = 0;
  cam: CameraLeitura = { z: 1, x: LARGURA / 2 };
  projectiles: ProjetilLuta[] = [];
  winner: IndiceLutador | null = null;
  matchWinner: IndiceLutador | null = null;
  matchDone = false;
  perfect = false;
  trainInfo: InfoTreino = { hits: 0, dmg: 0 };
  events: EventoLuta[] = [];

  /** Troca de barra no tick: o `hitstop`/`shake` dela têm que sobreviver ao que o chamador grava depois. */
  private trocaDeBarraNoTick = false;
  /** ESQUIVA ligada nesta partida (`ConfigPartida.esquiva`). Lida pelo `Fighter` (via `PartidaParaLutador`) e pela CPU. */
  esquivaLigada = false;
  /** V2-1 (`ConfigPartida.motorV2.entradaNoHitstop`): lê a entrada humana nos ticks congelados e a entrega ao 1º tick acionável. */
  private entradaNoHitstop = false;
  private guardada: [EntradaGuardada, EntradaGuardada] = [entradaGuardadaVazia(), entradaGuardadaVazia()];
  /** V2-3c (`ConfigPartida.motorV2.filmes`): o 1º contato limpo de um especial vira FILME. Desligada, nada disto roda. */
  private filmesLigados = false;
  /** A/B do dano do filme (ferramenta); `v2` = a tabela decidida. */
  private variantePadraoDoFilme: VarianteDoDano = 'v2';
  /** V2-4 (`ConfigPartida.motorV2.combos`): o combo próprio abre cancelamentos e manda em `semQueda`/`final`. Lida pelo `Fighter` e pela CPU. */
  combosLigados = false;
  /** V2-4: combos próprios COMPLETOS (o último golpe da sequência acertou) por lutador, na partida toda (não zera por round). O harness lê. */
  readonly combosPropriosFeitos: [number, number] = [0, 0];
  /** Ferramenta de medição (verificador de combos, spec §6.2): desliga o teto de combo para medir o dano que o desenho do combo dá SEM a rede. */
  semTetoDeCombo = false;
  /** R-6 (`ConfigPartida.ritmo.intervalos`): `ko`/`roundend`/`intro` dos rounds 2+/`matchend` mais curtos. Desligada, os de hoje. */
  private ritmoIntervalos = false;
  /** R-6 (`ConfigPartida.ritmo.filmeRestrito`): o filme só abre no super (R-7) ou no especial comum que dá KO. Desligada, qualquer acerto limpo de especial abre (V2-3c de hoje). */
  private ritmoFilmeRestrito = false;
  /** Já houve um filme neste tick? O 2º contato de especial do mesmo tick resolve como acerto comum (spec §3.1). Zera em `update`. */
  private filmeNoTick = false;
  /** Execuções de especial que já tiveram o seu contato (filme, bloqueio, esquiva ou armadura): chave `atk * 2 + indice`. Zera por round. */
  private execConsumidas = new Set<number>();
  /** De qual execução (e ficha) cada projétil veio, para os tiros restantes de um especial já consumido deixarem de existir. */
  private execDoProjetil = new WeakMap<ProjetilLuta, { atk: number; ficha: string | null }>();
  private pid = 0;
  private tick60 = 0;
  private refillT = 0;
  private introLen = 90;
  /** Eventos emitidos fora de update() (setup/startRound); entram no primeiro update seguinte. */
  private pendentes: EventoLuta[] = [];
  private dentroDoUpdate = false;

  constructor(dep: Dependencias) {
    this.lutadores = dep.lutadores;
    this.rng = dep.rng;
    this.p1 = new Fighter(dep.lutadores.hayato, 0);
    this.p2 = new Fighter(dep.lutadores['wei-long'], 1);
    this.fighters = [this.p1, this.p2];
  }

  // ----- LeituraLuta -----
  get timer(): number {
    return this.timeLeft;
  }
  get timerMax(): number {
    return this.timeMax;
  }

  /** Há CPU em algum lado? (o P1 humano usa então o teclado mesclado.) */
  get solo(): boolean {
    return this.p1.cpu !== null || this.p2.cpu !== null;
  }

  emitir(ev: EventoLuta): void {
    (this.dentroDoUpdate ? this.events : this.pendentes).push(ev);
  }

  private clearFx(): void {
    this.projectiles = [];
    this.shake = 0;
    this.hitstop = 0;
    this.guardada = [entradaGuardadaVazia(), entradaGuardadaVazia()]; // o aperto do round que acabou não vale no seguinte
    this.trocaDeBarraNoTick = false; // não vaza para o round/luta seguinte se `resolverVidaZerada` foi chamada sem `applyHit`/`arremessar`
    this.execConsumidas.clear(); // `atkId` recomeça em 0 a cada round: a chave de uma execução não vale no round seguinte
    this.filmeNoTick = false;
  }

  setup(cfg: ConfigPartida, ajustes: AjustesLuta): void {
    this.ajustes = ajustes;
    this.mode = cfg.mode;
    this.training = cfg.mode === 'training';
    this.stage = cfg.stage ?? this.lutadores[cfg.c2].stage; // luta na casa do rival
    this.p1.setChar(this.lutadores[cfg.c1]);
    this.p2.setChar(this.lutadores[cfg.c2]);
    const cfgChefe = cfg.chefe ? this.lutadores[cfg.c2].chefe : undefined;
    if (cfgChefe) this.p2.virarChefe(cfgChefe);
    this.p1.cpu = cfg.p1cpu != null ? cfg.p1cpu : null;
    this.p2.cpu = cfg.cpu != null ? cfg.cpu : null;
    this.esquivaLigada = cfg.esquiva === true;
    this.entradaNoHitstop = cfg.motorV2?.entradaNoHitstop === true;
    this.filmesLigados = cfg.motorV2?.filmes === true;
    this.variantePadraoDoFilme = cfg.motorV2?.danoFilme ?? 'v2';
    this.combosLigados = cfg.motorV2?.combos === true;
    this.ritmoIntervalos = cfg.ritmo?.intervalos === true;
    this.ritmoFilmeRestrito = cfg.ritmo?.filmeRestrito === true;
    this.combosPropriosFeitos[0] = 0;
    this.combosPropriosFeitos[1] = 0;
    this.winsNeeded = cfgChefe ? 1 : ajustes.rounds;
    this.timeMax = this.training ? 0 : ajustes.time;
    this.dummy = 'stand';
    this.round = 1;
    this.matchWinner = null;
    this.matchDone = false;
    this.winner = null;
    this.p1.wins = 0;
    this.p2.wins = 0;
    if (!cfg.keepScore) this.p1.score = 0;
    this.p2.score = 0;
    this.startRound(true);
  }

  /** Troca o alvo do treino; 'cpu' liga uma CPU nível 1 no P2, os demais a desligam (UI, tecla T). */
  trocarAlvoDoTreino(d: DummyTreino): void {
    this.dummy = d;
    this.p2.cpu = d === 'cpu' ? 1 : null;
  }

  private startRound(first: boolean): void {
    const completo = first || this.round === 1;
    this.p1.reset(completo);
    this.p2.reset(completo);
    this.aplicarPerfilDoChefe(false); // todo round recomeça na fase 1
    this.clearFx();
    this.timeLeft = this.timeMax;
    this.tick60 = 0;
    this.phase = 'intro';
    this.t = 0;
    this.winner = null;
    this.perfect = false;
    this.refillT = 0;
    this.trainInfo = { hits: 0, dmg: 0 };
    this.p1.combo = { hits: 0, dmg: 0, t: 0 };
    this.p2.combo = { hits: 0, dmg: 0, t: 0 };
    this.introLen = this.training ? 40 : this.ritmoIntervalos && this.round > 1 ? INTRO_LEN_RODADA_SEGUINTE_RITMO : INTRO_LEN_PADRAO;
    if (!this.training) this.emitir({ tipo: 'round', fase: 'start', round: this.round });
  }

  /** O chefe desta luta (sempre o P2) ou null. A UI lê `fighters[i].chefe`. */
  private get chefeDaLuta(): Fighter | null {
    return this.p2.chefe ? this.p2 : null;
  }

  /** IA do chefe: nível da CPU escolhido + acréscimo da fase. Sem chefe não faz nada (os outros usam AI_LEVELS). */
  private aplicarPerfilDoChefe(fase2: boolean): void {
    const c = this.chefeDaLuta;
    if (c) c.perfilIa = perfilChefe(c.cpu ?? 1, fase2);
  }

  aoCair(f: Fighter): void {
    this.shake = Math.max(this.shake, 4);
    this.emitir({ tipo: 'dust', x: f.x, n: 14, power: 1.4 });
  }

  /**
   * Dano que a VIDA do defensor sofre de verdade. Só o chefe com `ConfigChefe.danoRecebido` (< 1) leva menos; para todo o resto
   * devolve `dano` sem tocar (nem uma multiplicação por 1), o que mantém os 4 originais bit a bit. Chamado depois de todas as contas
   * do golpe (gotHits, contragolpe, mínimo do raspão) e antes de descontar da vida, nos 4 pontos onde ela cai. O fator mora no
   * `cfgChefe` do Fighter, não na ficha: o VADIVU da NILA troca de ficha no meio da luta e levaria o reforço junto.
   */
  private danoNoDefensor(d: Fighter, dano: number): number {
    const fator = d.cfgChefe === null || d.cfgChefe === undefined ? undefined : d.cpu === 2 && d.cfgChefe.danoRecebidoDificil !== undefined ? d.cfgChefe.danoRecebidoDificil : d.cfgChefe.danoRecebido;
    return fator === undefined || fator === 1 ? dano : dano * fator;
  }

  /** Arremesso: joga o rival por cima do ombro. */
  arremessar(a: Fighter, d: Fighter, golpe?: GolpeMontado): void {
    const filmeCandidato = golpe && this.filmesLigados && !this.filmeNoTick && golpe.id[0] === 's' ? filmeDoGolpe(a.ch.id, a.ficha, golpe.id) : undefined;
    // R-6 (`ritmo.filmeRestrito`): o agarrão de especial (BAATAR, CENTELLA) é "especial comum" como qualquer outro — só
    // vira filme se o acerto der KO (sem super ainda, R-7). Igual a `applyHit`: o candidato fica pendente até o dano
    // NORMAL (abaixo, o mesmo de sempre) decidir.
    const restringir = this.ritmoFilmeRestrito && filmeCandidato !== undefined;
    if (golpe && filmeCandidato && !restringir) {
      this.arremessarComFilme(a, d, golpe, filmeCandidato);
      return;
    }
    const antes = restringir ? this.posicoesDoFilme(a, d) : undefined;
    const dmg = this.danoNoDefensor(d, (golpe?.agarrao?.dmg ?? 12) * a.ch.pow);
    const hpAntes = d.hp;
    d.hp = Math.max(this.training ? 1 : 0, d.hp - dmg);
    const dano = hpAntes - d.hp;
    d.dmgTaken += dmg;
    a.score += Math.round(dmg * 100);
    d.move = null;
    d.flash = 8;
    d.gotHits = 1;
    d.comboDmg = dmg;
    a.connected = true;
    a.en = Math.min(MAX_EN, a.en + 8);
    d.x = clamp(a.x + a.facing * 30, 70, LARGURA - 70);
    const noAr = !d.grounded; // HURACANRANA: o rival agarrado no ar é jogado PARA BAIXO; no chão o arremesso o lança para cima
    const barrasAntes = d.barras;
    const diferidos: EventoLuta[] = [];
    const kill = this.resolverVidaZerada(d, a, restringir ? diferidos : undefined);
    if (restringir && kill) {
      // Confirma o filme (motivo 'ko') por cima do dano NORMAL já aplicado acima: o estado final de queda do filme
      // (§3.3) substitui o knockdown comum.
      this.filmeNoTick = true;
      this.estadoFinalDoFilme(a, d, filmeCandidato as FilmeDoGolpe, false, kill);
      this.reforcarTrocaDeBarra();
      this.emitir({
        tipo: 'throw',
        atacante: a.indice,
        defensor: d.indice,
        pitch: d.ch.pitch,
        texto: textoFlutuante(a.x, a.y - SH, 'ARREMESSO!', '#ffd23f', 22),
        dano,
        golpe: (golpe as GolpeMontado).id,
        especial: true as const,
        filme: true,
      });
      this.emitir({
        tipo: 'filme',
        atacante: a.indice,
        defensor: d.indice,
        golpe: (golpe as GolpeMontado).id,
        ficha: a.ficha,
        projetil: false,
        dano,
        contragolpe: false,
        ko: true,
        trocaDeBarra: d.barras < barrasAntes,
        final: (filmeCandidato as FilmeDoGolpe).final ?? 'derruba',
        antes: antes as { atacante: PosFilme; defensor: PosFilme },
        depois: this.posicoesDoFilme(a, d),
        motivo: 'ko',
      });
      for (const ev of diferidos) this.emitir(ev);
      return;
    }
    if (kill) {
      d.vx = -a.facing * 7;
    } else {
      d.knockdown(-a.facing, 6);
      d.vy = noAr ? 9 : -12;
    }
    this.shake = 8;
    this.hitstop = 6;
    this.reforcarTrocaDeBarra();
    this.emitir({
      tipo: 'throw',
      atacante: a.indice,
      defensor: d.indice,
      pitch: d.ch.pitch,
      texto: textoFlutuante(a.x, a.y - SH, 'ARREMESSO!', '#ffd23f', 22),
      // V1: o agarrão de ESPECIAL (BAATAR sFire, CENTELLA sDown) conta acerto na sessão do especial; o arremesso comum não.
      dano,
      ...(golpe ? { golpe: golpe.id } : {}),
      ...(golpe && golpe.id[0] === 's' ? { especial: true as const } : {}),
    });
  }

  lancarProjetil(f: Fighter, mv: GolpeMontado, i: number, n: number): void {
    const sp = mv.proj;
    if (!sp) return;
    // V2-3c: os tiros restantes de um especial que já teve o seu contato (acertou, foi defendido, esquivado ou absorvido) não existem.
    if (this.filmesLigados && this.execConsumidas.has(this.chaveDaExecucao(f.indice, f.atkId))) return;
    const low = !!sp.low;
    const pr: ProjetilLuta = {
      id: ++this.pid,
      x: f.x + f.facing * f.ch.spawn.x,
      y: low ? f.y - 30 : f.y - f.ch.spawn.y,
      vx: sp.sp * f.facing,
      dir: f.facing,
      dono: f.indice,
      owner: f,
      life: sp.life || 150,
      frame: 0,
      spec: sp,
      sc: sp.sc || 1,
      sy: sp.sy || sp.sc || 1,
      style: sp.style || 'orb',
      acc: sp.acc || 0,
      kd: sp.kdLast ? i === n - 1 : sp.kd !== false,
      golpe: mv.id,
      ...(mv.id[0] === 's' ? { especial: true as const } : {}),
    };
    this.projectiles.push(pr);
    if (this.filmesLigados) this.execDoProjetil.set(pr, { atk: f.atkId, ficha: f.ficha });
    this.emitir({ tipo: 'projectile', lutador: f.indice, x: pr.x, y: pr.y, style: pr.style });
  }

  /** Entradas dos dois lutadores neste tick (humanos pela fonte; CPU/alvo de treino calculados aqui). */
  private inputs(fonte: FonteEntradas): [InputFrame, InputFrame] {
    const none = NO_INPUT();
    if (this.phase !== 'fight') return [none, none];
    const solo = this.solo;
    const i1 = this.p1.cpu !== null ? cpuInput(this.p1, this.p2, this, this.rng) : fonte.p1(solo || this.training);
    let i2: InputFrame;
    if (this.p2.cpu !== null) i2 = cpuInput(this.p2, this.p1, this, this.rng);
    else if (this.training) i2 = this.dummyInput();
    else i2 = fonte.p2();
    return [i1, i2];
  }

  private dummyInput(): InputFrame {
    const d = this.p2;
    const inp = NO_INPUT();
    const away = this.p1.x < d.x ? 'right' : 'left';
    if (this.dummy === 'crouch') inp.down = true;
    else if (this.dummy === 'block') inp[away] = true;
    else if (this.dummy === 'crouchblock') {
      inp[away] = true;
      inp.down = true;
    } else if (this.dummy === 'jump') {
      if (d.grounded && d.state !== 'hit' && d.age % 70 === 0) inp.up = true;
    } else if (this.dummy === 'cpu') {
      d.cpu = d.cpu ?? 1;
      return cpuInput(d, this.p1, this, this.rng);
    }
    return inp;
  }

  /**
   * V2-1: tick congelado pelo hitstop. Lê SÓ a entrada humana, com as mesmas regras de `inputs` (a CPU não é tocada: `cpuInput` consome
   * RNG; o alvo do treino também não é humano), e guarda por lutador o último botão de ataque e as mudanças de direção (a mesma
   * direção em sequência não se repete, para uma meia-lua feita num hitstop longo caber na janela de 18 ticks do `motion`).
   */
  private guardarEntradaDoCongelamento(fonte: FonteEntradas): void {
    const humano1 = this.p1.cpu === null;
    const humano2 = this.p2.cpu === null && !this.training;
    if (humano1) this.guardar(0, fonte.p1(this.solo || this.training));
    if (humano2) this.guardar(1, fonte.p2());
  }

  private guardar(i: 0 | 1, inp: InputFrame): void {
    const f = this.fighters[i];
    const g = this.guardada[i];
    const botao = ATK_KEYS.find((k) => inp[k]);
    if (botao) g.botao = botao;
    if (this.esquivaLigada && inp.esq === true) g.esq = true; // a borda do ESQ também vive 1 tick (e a esquiva só vale com a mecânica ligada)
    const d = dirNum(inp, f.facing);
    if (d !== (g.dirs.length ? g.dirs[g.dirs.length - 1] : f.hist[f.hist.length - 1])) g.dirs.push(d);
  }

  /** 1º tick acionável depois do congelamento: entrega o guardado aos lutadores (antes do `update` deles) ou o descarta se a luta não está em 'fight'. */
  private entregarEntradaDoCongelamento(luta: boolean): void {
    for (const i of [0, 1] as const) {
      const g = this.guardada[i];
      if (luta && (g.botao || g.dirs.length || g.esq)) this.fighters[i].receberEntradaDoCongelamento(g.botao, g.dirs, g.esq);
      this.guardada[i] = entradaGuardadaVazia();
    }
  }

  /** Um tick da luta. */
  update(fonte: FonteEntradas): void {
    this.events = this.pendentes;
    this.pendentes = [];
    this.trocaDeBarraNoTick = false;
    this.filmeNoTick = false;
    this.dentroDoUpdate = true;
    try {
      this.passo(fonte);
    } finally {
      this.dentroDoUpdate = false;
    }
    this.p1.atualizarPose();
    this.p2.atualizarPose();
  }

  private passo(fonte: FonteEntradas): void {
    this.t++;
    if (this.hitstop > 0) {
      this.hitstop--;
      if (this.entradaNoHitstop && this.phase === 'fight') this.guardarEntradaDoCongelamento(fonte);
      return;
    }
    this.tick++;
    if (this.shake > 0) this.shake--;
    if (this.phase === 'intro' && this.t >= this.introLen) {
      this.phase = 'fight';
      this.t = 0;
      if (!this.training) this.emitir({ tipo: 'round', fase: 'fight', round: this.round });
    }
    const fighting = this.phase === 'fight';
    const [i1, i2] = this.inputs(fonte);
    if (this.entradaNoHitstop) this.entregarEntradaDoCongelamento(fighting);
    if (this.phase === 'roundend' || this.phase === 'matchend') {
      for (const p of [this.p1, this.p2]) {
        if (p.indice === this.winner && p.grounded && p.state !== 'move' && p.state !== 'hit' && p.state !== 'down' && p.state !== 'win' && this.t > 20) p.setState('win');
      }
    }
    this.p1.update(i1, this.p2, this);
    this.p2.update(i2, this.p1, this);
    this.separate();
    for (const pr of this.projectiles) {
      if (pr.acc) {
        pr.vx -= pr.dir * pr.acc;
        if (pr.dir * (pr.x - pr.owner.x) < -70 && pr.frame > 10) pr.life = 0; // bumerangue volta
      }
      pr.x += pr.vx;
      pr.life--;
      pr.frame++;
    }
    if (fighting) this.resolveHits();
    this.projectiles = this.projectiles.filter((p) => p.life > 0 && p.x > -140 && p.x < LARGURA + 140);
    for (const p of [this.p1, this.p2]) {
      if (p.hpShown > p.hp) p.hpShown = Math.max(p.hp, p.hpShown - 0.5);
      else if (p.hpShown < p.hp) p.hpShown = p.hp;
    }
    this.updateCombos();
    this.updateCamera();
    if (this.training) {
      this.updateTraining();
      return;
    }
    if (fighting && this.timeMax > 0) {
      this.tick60++;
      if (this.tick60 >= 60) {
        this.tick60 = 0;
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.phase = 'timeover';
          this.t = 0;
          this.emitir({ tipo: 'round', fase: 'timeover', round: this.round });
        }
      }
    }
    if (this.phase === 'cena-chefe') this.andarCenaDoChefe();
    else if (this.phase === 'fight') this.talvezIniciarCenaDoChefe();
    if ((this.phase === 'ko' || this.phase === 'timeover') && this.t >= (this.ritmoIntervalos ? KO_ESPERA_RITMO : KO_ESPERA)) this.endRound();
    if (this.phase === 'roundend' && this.t >= (this.ritmoIntervalos ? ROUNDEND_ESPERA_RITMO : ROUNDEND_ESPERA)) {
      this.round++;
      this.startRound(false);
    }
    if (this.phase === 'matchend' && this.t >= (this.ritmoIntervalos ? MATCHEND_ESPERA_RITMO : MATCHEND_ESPERA)) this.matchDone = true;
  }

  /**
   * Cena da fase 2 do chefe (E3 §3.3, era a Dança da Águia; ZENON: spec §2). Começa no primeiro tick em que a luta segue em 'fight' e o chefe, com a barra já trocada
   * (`cenaPendente`), está livre no chão (depois de levantar). KO ou fim de tempo no mesmo tick vencem: a fase já não é
   * 'fight' e a cena não começa. Durante a cena: relógio parado, sem acertos, sem projéteis, sem entradas.
   */
  private talvezIniciarCenaDoChefe(): void {
    const c = this.chefeDaLuta;
    if (!c || !c.cenaPendente || !c.grounded) return;
    if (c.state !== 'idle' && c.state !== 'walk' && c.state !== 'crouch' && c.state !== 'land') return;
    c.cenaPendente = false;
    c.setState('cena');
    c.vx = 0;
    // O Game manda NO_INPUT na cena, mas o `buf` (9 ticks) de cada lutador seguiria sendo consumido: sem isto o jogador
    // ataca (gasta energia, som) com a dança em andamento.
    this.p1.limparBotoesGuardados();
    this.p2.limparBotoesGuardados();
    this.phase = 'cena-chefe';
    this.t = 0;
    this.projectiles = [];
    this.hitstop = 0;
    this.emitir({ tipo: 'fase-chefe', lutador: c.indice, etapa: 'cena', barrasRestantes: c.barras });
  }

  /** Fim da cena: o chefe entra na ficha da fase 2 e a luta volta a andar. A cena dura `cena.duracao` ticks. */
  private andarCenaDoChefe(): void {
    const c = this.chefeDaLuta;
    const cfg = c?.cfgChefe;
    this.projectiles = []; // um golpe do jogador que terminava durante a cena pode ter soltado projétil
    if (!c || !cfg || this.t < cfg.cena.duracao) return;
    if (cfg.fichaFase2 !== undefined) c.trocarFicha(cfg.fichaFase2); // sem ficha de fase 2 o chefe segue na que estava (NILA: a postura)
    c.setState('idle');
    this.aplicarPerfilDoChefe(true);
    this.phase = 'fight';
    this.t = 0;
    this.emitir({ tipo: 'fase-chefe', lutador: c.indice, etapa: 'retomada', barrasRestantes: c.barras });
  }

  private updateTraining(): void {
    const d = this.p2;
    this.p1.en = Math.min(MAX_EN, this.p1.en + 0.25);
    this.p2.en = MAX_EN;
    if (this.p1.hp < this.p1.maxHp) this.p1.hp = this.p1.maxHp;
    if (d.hp < d.maxHp && d.gotHits === 0 && (d.state === 'idle' || d.state === 'crouch')) {
      if (++this.refillT > 80) {
        d.hp = d.maxHp;
        d.hpShown = d.hp;
        this.refillT = 0;
      }
    } else this.refillT = 0;
  }

  private updateCombos(): void {
    for (const [d, c] of [
      [this.p2, this.p1.combo],
      [this.p1, this.p2.combo],
    ] as const) {
      if (d.gotHits >= 2) {
        c.hits = d.gotHits;
        c.dmg = d.comboDmg;
        c.t = 60;
      } else if (c.t > 0) c.t--;
    }
  }

  private updateCamera(): void {
    const a = this.p1;
    const b = this.p2;
    const d = Math.abs(a.x - b.x);
    const mid = (a.x + b.x) / 2;
    const tz = 1 + clamp((560 - d) / 560, 0, 1) * 0.075;
    const tx = clamp(mid, 160, LARGURA - 160);
    this.cam.z = lerp(this.cam.z, tz, 0.08);
    this.cam.x = lerp(this.cam.x, tx, 0.1);
  }

  private separate(): void {
    const a = this.p1;
    const b = this.p2;
    if (a.passing || b.passing) return;
    if ((a.untouchable && a.state !== 'win') || (b.untouchable && b.state !== 'win') || a.state === 'down' || b.state === 'down') return;
    const dx = b.x - a.x;
    const min = a.corpo + b.corpo; // 39 + 39 = 78 com o corpo padrão
    if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 90) {
      let s = dx >= 0 ? 1 : -1;
      // Empate exato (os dois no mesmo x, p. ex. o avanço da esquiva contra um rival colado na parede): o desempate antigo assumia o P2 à direita
      // e dava resultados diferentes para P1 e P2. Com uma esquiva em curso, quem esquiva fica do lado de onde saiu (o rival está para onde ele
      // olhava: o `facing` não muda durante a esquiva). Sem esquiva o desempate é o de sempre (o snapshot e o lock-step não mudam).
      if (dx === 0) {
        const e = a.state === 'esquiva' ? a : b.state === 'esquiva' ? b : null;
        if (e) s = e === a ? e.facing : -e.facing;
      }
      const push = (min - Math.abs(dx)) / 2;
      a.x -= push * s;
      b.x += push * s;
      a.x = clamp(a.x, 60, LARGURA - 60);
      b.x = clamp(b.x, 60, LARGURA - 60);
    }
  }

  private resolveHits(): void {
    for (const [a, d] of [
      [this.p1, this.p2],
      [this.p2, this.p1],
    ] as const) {
      const mv = a.activeMove();
      if (!mv || a.hitDone || a.atkEsquivado === a.atkId) continue; // esquivado = consumido para o alvo (como um acerto)
      if (this.filmesLigados && this.execConsumidas.has(this.chaveDaExecucao(a.indice, a.atkId))) continue; // V2-3c: 1 contato só por execução de especial
      if (d.untouchable) {
        // ESQUIVA: quem está na janela invulnerável e levaria o golpe "esquivou" (uma vez por golpe) e o golpe é CONSUMIDO: não acerta mais
        // quando a janela fechar no meio da fase ativa. Fora disso, sem efeito, como sempre.
        if (d.state === 'esquiva' && this.verEsquivada(a, d, mv.box ? a.ch.boxes[mv.box] : undefined, `a${a.atkId}`, false)) {
          a.atkEsquivado = a.atkId;
          if (this.filmeDaExecucao(a, mv.id, a.ficha)) this.consumirExecucao(a.indice, a.atkId); // esquivado = o contato da execução (sem filme)
        }
        continue;
      }
      const caixa = mv.box ? a.ch.boxes[mv.box] : undefined;
      if (!caixa) continue;
      const box = a.attackBox(caixa);
      if (overlap(box, d.hurtbox())) {
        a.hitDone = true;
        this.applyHit(a, d, noAtaque(mv, a), box);
      }
    }
    for (const pr of this.projectiles) {
      if (pr.life <= 0) continue;
      const d = pr.owner === this.p1 ? this.p2 : this.p1;
      const o = pr.owner;
      const exec = this.filmesLigados ? this.execDoProjetil.get(pr) : undefined;
      if (exec && this.execConsumidas.has(this.chaveDaExecucao(o.indice, exec.atk))) {
        pr.life = 0; // V2-3c: tiro de uma execução que já teve o seu contato: sai sem colidir (0 eventos extras)
        continue;
      }
      const box = { x: pr.x - 34 * pr.sc, y: pr.y - 30 * pr.sy, w: 68 * pr.sc, h: 60 * pr.sy };
      // E3: escudo da GARKUWA. Projétil que vem de frente e toca o lutador na janela ativa de um golpe `absorveProj`
      // some como num choque de projéteis (evento `clash`); não há dano nem applyHit. Pelas costas ou fora da janela: acerta.
      if (this.absorve(d, pr) && overlap(box, d.hurtbox())) {
        pr.life = 0;
        // V1: o escudo (GARKUWA) que absorve é o SUCESSO do golpe: leva o dono, o golpe e a apresentação para a cinemática.
        const golpeDoEscudo = d.move as string;
        const ap = apresentacaoDoEspecial(d.ch.id, d.ficha, golpeDoEscudo);
        this.emitir({
          tipo: 'clash',
          x: pr.x,
          y: pr.y,
          lutador: d.indice,
          golpe: golpeDoEscudo,
          ...(ap ? { quadro: ap.quadro } : {}),
          ...(ap?.entrada ? { entrada: ap.entrada } : {}),
        });
        continue;
      }
      if (d.untouchable && d.state === 'esquiva') {
        // o projétil atravessa quem esquiva (segue voando), a esquiva é anunciada uma vez por projétil e ele fica CONSUMIDO para este alvo
        if (this.verEsquivada(o, d, { fx: 0, fy: 0, w: 0, h: 0 }, `p${pr.id}`, true, box)) {
          pr.esquivou = true;
          if (exec && this.filmeDaExecucao(o, pr.golpe, exec.ficha)) this.consumirExecucao(o.indice, exec.atk); // os outros tiros da execução também deixam de existir
        }
      }
      if (!d.untouchable && !pr.esquivou && overlap(box, d.hurtbox())) {
        pr.life = 0;
        // PROJ_BASE vem DEPOIS no Object.assign do protótipo e sobrescreve lvl: o tremor rasteiro (`low`)
        // acaba como 'mid'. Preservado de propósito (zero mudança de comportamento).
        this.applyHit(
          o,
          d,
          {
            dmg: pr.spec.dmg,
            kb: pr.spec.kb,
            hs: pr.spec.hs,
            bs: PROJ_BASE.bs,
            lvl: PROJ_BASE.lvl,
            snd: PROJ_BASE.snd,
            kind: undefined,
            heavy: false,
            kd: pr.kd,
            hits: undefined,
            proj: PROJ_BASE.proj,
            quebraGuarda: undefined,
            rank: undefined,
            contra: undefined,
            golpe: pr.golpe,
            especial: pr.especial === true,
            nivelCarga: 0,
            drenaEnergia: undefined, // projétil não drena (o SELO é projétil)
            atk: exec?.atk ?? o.atkId,
            ficha: exec ? exec.ficha : o.ficha,
          },
          box,
        );
        continue;
      }
      for (const q of this.projectiles) {
        if (q !== pr && q.life > 0 && q.owner !== pr.owner && Math.abs(q.x - pr.x) < 56 * Math.max(pr.sc, q.sc) && Math.abs(q.y - pr.y) < 60) {
          q.life = 0;
          pr.life = 0;
          this.shake = 4;
          this.emitir({ tipo: 'clash', x: (q.x + pr.x) / 2, y: pr.y });
        }
      }
    }
  }

  /**
   * ESQUIVA: o golpe `a` (caixa `caixa`) ou o projétil (`box`) sobrepõe a hurtbox de `d`, que está na janela invulnerável da esquiva.
   * Emite `esquivou` uma vez por `chave` (atkId do golpe ou id do projétil) por esquiva.
   */
  private verEsquivada(a: Fighter, d: Fighter, caixa: { fx: number; fy: number; w: number; h: number } | undefined, chave: string, projetil: boolean, boxProj?: Retangulo): boolean {
    if (!caixa) return false;
    const box = boxProj ?? a.attackBox(caixa);
    const hb = d.hurtbox();
    if (!overlap(box, hb)) return false;
    if (!d.registrarEsquivada(chave)) return false;
    this.emitir({
      tipo: 'esquivou',
      lutador: d.indice,
      atacante: a.indice,
      x: (Math.max(box.x, hb.x) + Math.min(box.x + box.w, hb.x + hb.w)) / 2,
      y: (Math.max(box.y, hb.y) + Math.min(box.y + box.h, hb.y + hb.h)) / 2,
      projetil,
    });
    return true;
  }

  /** `d` está com o escudo levantado (golpe `absorveProj` na janela ativa) contra um projétil que vem de frente? */
  private absorve(d: Fighter, pr: ProjetilLuta): boolean {
    if (d.state !== 'move') return false;
    const mv = d.golpeAtual();
    return !!mv.absorveProj && d.mt >= mv.S && d.mt < mv.S + mv.A && pr.dir === -d.facing;
  }

  /** `d` está com a PARADE ativa (golpe `aparar`, mt em [S, S + A)) contra este golpe corpo a corpo de nível aparável? */
  private apara(d: Fighter, mv: AtaqueAcerto): boolean {
    if (d.state !== 'move' || mv.proj) return false;
    const g = d.golpeAtual();
    return !!g.parry && d.mt >= g.S && d.mt < g.S + g.A && g.parry.niveis.includes(mv.lvl);
  }

  private applyHit(a: Fighter, d: Fighter, mv: AtaqueAcerto, box: Retangulo): void {
    // E3 (CAMILLE): PARADE. Anula o golpe (sem dano, sem raspão), atordoa quem atacou e responde com o `sResp`. Projétil e
    // golpe baixo (fora de `niveis`) seguem o caminho normal; o agarrão nem passa por aqui (`arremessar`).
    if (this.apara(d, mv)) {
      const parry = d.golpeAtual().parry as { atordoaAtacante: number };
      const hb = d.hurtbox();
      const x = (Math.max(box.x, hb.x) + Math.min(box.x + box.w, hb.x + hb.w)) / 2;
      const y = (Math.max(box.y, hb.y) + Math.min(box.y + box.h, hb.y + hb.h)) / 2;
      a.move = null;
      a.hitDone = true;
      a.setState('hit');
      a.stun = parry.atordoaAtacante;
      a.vx = 0;
      const golpeDaParada = d.move as string; // antes do `startMove('sResp')`: o golpe do defensor que aparou
      const ap = apresentacaoDoEspecial(d.ch.id, d.ficha, golpeDaParada);
      d.startMove('sResp', this);
      this.hitstop = 8;
      this.shake = this.ajustes.shake ? 3 : 0;
      this.emitir({
        tipo: 'parry',
        atacante: a.indice,
        defensor: d.indice,
        x,
        y,
        texto: textoFlutuante(d.x, d.y - SH * 0.95, 'PARADA!', '#e6ebf7', 22),
        // V1: SUCESSO da PARADE = gatilho da cinemática dela; o FOUETTÉ (`sResp`) segue a mesma sessão
        golpe: golpeDaParada,
        ...(ap?.continua ? { continua: ap.continua } : {}),
        ...(ap ? { quadro: ap.quadro } : {}),
        ...(ap?.entrada ? { entrada: ap.entrada } : {}),
      });
      return;
    }
    // V2-3c: todo contato (bloqueio, armadura ou acerto) de um especial com filme consome a execução; só o acerto limpo abre o filme.
    const doFilme = this.filmeDaExecucao(a, mv.golpe ?? '', mv.ficha);
    if (doFilme) this.consumirExecucao(a.indice, mv.atk);
    const blocked = d.canBlock(mv.lvl);
    const hb = d.hurtbox();
    const ox = (Math.max(box.x, hb.x) + Math.min(box.x + box.w, hb.x + hb.w)) / 2;
    const oy = (Math.max(box.y, hb.y) + Math.min(box.y + box.h, hb.y + hb.h)) / 2;
    a.connected = true;
    a.hitCount = (a.hitCount || 0) + 1;
    a.lastHitMt = a.mt;
    const cornered = d.x <= 66 || d.x >= LARGURA - 66;
    if (blocked) {
      const chip = this.danoNoDefensor(d, Math.max(0.4, (mv.proj ? mv.dmg : mv.dmg * a.ch.pow) * 0.12));
      d.hp = Math.max(1, d.hp - chip);
      a.score += Math.round(chip * 50);
      // E3: golpe com `quebraGuarda` (MASHI nível 3) atravessa o bloqueio: o raspão é o mesmo, mas o defensor fica
      // atordoado (`hit`) pelos ticks do golpe em vez de em `block`. Sem o campo, o bloqueio é o de sempre.
      const quebrou = mv.quebraGuarda !== undefined && mv.quebraGuarda > 0;
      if (quebrou) {
        d.hitKind = mv.kind === 'punch' || mv.lvl === 'over' || mv.proj ? 'H' : 'B';
        d.setState('hit');
        d.stun = mv.quebraGuarda as number;
      } else {
        d.setState('block');
        d.stun = mv.bs + (mv.proj ? 4 : 0);
      }
      d.vx = mv.kb * 0.9 * a.facing;
      d.move = null;
      if (cornered && !mv.proj) a.vx = -a.facing * mv.kb * 0.8;
      this.shake = quebrou ? (this.ajustes.shake ? 9 : 0) : 2;
      this.hitstop = quebrou ? 6 : 2;
      a.en = Math.min(MAX_EN, a.en + 3);
      d.en = Math.min(MAX_EN, d.en + 4);
      const drenoDefesa = this.cobrarDreno(a, d, mv.drenaEnergia, 'defesa'); // depois dos ganhos do ramo (spec ZENON §1.2)
      if (quebrou) {
        this.emitir({
          tipo: 'quebra-guarda',
          atacante: a.indice,
          defensor: d.indice,
          x: ox,
          y: oy,
          texto: textoFlutuante(d.x, d.y - SH * 0.95, 'GUARDA QUEBRADA!', '#ff5a4a', 22),
          ...marcaDoGolpe(mv),
          ...(drenoDefesa > 0 ? { dreno: drenoDefesa } : {}),
        });
        return;
      }
      this.emitir({
        tipo: 'block',
        atacante: a.indice,
        defensor: d.indice,
        x: ox,
        y: oy,
        dir: (-a.facing) as 1 | -1,
        texto: d.gotHits === 0 ? textoFlutuante(d.x, d.y - SH * 0.95, 'BLOQUEOU', '#9ad8ff', 18) : null,
        ...marcaDoGolpe(mv),
        ...(drenoDefesa > 0 ? { dreno: drenoDefesa } : {}),
      });
      return;
    }
    d.hitKind = mv.kind === 'punch' || mv.lvl === 'over' || mv.proj ? 'H' : 'B';
    const counter = d.state === 'move' || d.state === 'esquiva'; // acerto na recuperação da esquiva = contragolpe
    // E3 (S4): contragolpe na PREPARAÇÃO do golpe do rival (lido ANTES de `d.move = null`). Só reforça se o golpe tem `contra`.
    const emPreparo = d.state === 'move' && mv.contra !== undefined && d.mt < d.golpeAtual().S;
    // E3: `armadura.rankMax` (PESO DA MONTANHA) limita a armadura a golpes de rank <= rankMax; projétil (sem rank) e
    // golpe forte a interrompem. Sem `armadura` no def, qualquer golpe é absorvido como sempre.
    const rankMax = d.ch.armadura?.rankMax;
    const armaduraAbsorve = rankMax === undefined || (mv.rank !== undefined && mv.rank <= rankMax);
    const danoArmadura = d.armor > 0 ? this.danoNoDefensor(d, danoDeArmadura(mv.dmg, a.ch.pow, mv.proj)) : 0; // o teste de absorção e o valor usam o MESMO dano
    if (d.armor > 0 && d.state === 'move' && armaduraAbsorve && d.hp - danoArmadura > 0) {
      // ARMADURA: absorve o golpe sem interromper
      const ad = danoArmadura;
      d.hp -= ad;
      d.flash = 6;
      a.score += Math.round(ad * 100);
      this.hitstop = 4;
      this.shake = 4;
      this.emitir({
        tipo: 'armor',
        atacante: a.indice,
        defensor: d.indice,
        x: ox,
        y: oy,
        snd: mv.snd,
        texto: textoFlutuante(d.x, d.y - SH * 0.95, 'ARMADURA', '#ffd23f', 18),
        dano: ad,
        ...marcaDoGolpe(mv),
      });
      return;
    }
    if (d.gotHits === 0) d.comboDmg = 0;
    // V2-4: o acerto entra no histórico do atacante ANTES de `gotHits++` (o histórico recomeça quando o rival estava livre).
    const passoDoCombo = this.combosLigados ? this.registrarAcertoDoCombo(a, d, mv) : null;
    // V2-3c: o 2º contato de especial do MESMO tick resolve como acerto comum (spec §3.1); o 1º leva o filme.
    const filmeCandidato = this.filmeNoTick ? undefined : doFilme;
    // R-6 (`ritmo.filmeRestrito`): sem super ainda (R-7, sempre "não é super" por ora), um especial comum só vira filme
    // SE o acerto der KO — e isso só se sabe depois do dano (abaixo). Até lá o candidato fica pendente, não confirmado:
    // `filme` nasce `undefined` e a conta do dano cai no caminho normal (`danoDoGolpe`), como a tabela do §3.3 manda.
    const restringir = this.ritmoFilmeRestrito && filmeCandidato !== undefined;
    let filme = restringir ? undefined : filmeCandidato;
    const antes = filmeCandidato ? this.posicoesDoFilme(a, d) : undefined;
    const multContra = emPreparo ? mv.contra?.mult : undefined;
    let dmg = this.danoNoDefensor(
      d,
      filme ? this.danoDoFilme(filme, a, mv.nivelCarga, mv.proj, d.gotHits, counter, multContra) : danoDoGolpe(mv.dmg, a.ch.pow, mv.proj, d.gotHits, counter, multContra),
    );
    if (this.filmesLigados) dmg = this.limitarAoTetoDoCombo(d, dmg);
    const stunExtra = emPreparo ? (mv.contra?.hs ?? 0) : 0;
    if (this.training) dmg = Math.min(dmg, d.hp - 1 > 0 ? dmg : 0);
    const hpAntes = d.hp;
    d.hp = Math.max(0, d.hp - dmg);
    const danoCausado = hpAntes - d.hp; // V1: o que saiu da barra (antes de a troca de barra do chefe enchê-la de novo)
    d.gotHits++;
    d.comboDmg += dmg;
    d.dmgTaken += dmg;
    a.score += Math.round(dmg * 100);
    a.maxCombo = Math.max(a.maxCombo, d.gotHits);
    this.trainInfo = { hits: d.gotHits, dmg: d.comboDmg };
    a.en = Math.min(MAX_EN, a.en + (mv.proj ? 4 : 8));
    d.en = Math.min(MAX_EN, d.en + 5);
    const drenoAcerto = this.cobrarDreno(a, d, mv.drenaEnergia, 'acerto'); // depois dos ganhos do ramo (spec ZENON §1.2)
    d.flash = 8;
    d.move = null;
    const barrasAntes = d.barras;
    const diferidos: EventoLuta[] = []; // o `ko` do filme sai DEPOIS do `hit` e do `filme` (spec §3.2); fora do filme sai na hora, como sempre
    // `restringir`: o `ko` TAMBÉM fica pendente em `diferidos` (adiantado), porque só se confirma filme depois do `kill`.
    const kill = this.resolverVidaZerada(d, a, filme || restringir ? diferidos : undefined);
    if (restringir) filme = kill ? filmeCandidato : undefined; // confirma o filme só se este acerto zerou a vida (motivo 'ko')
    if (filme) {
      this.filmeNoTick = true;
      this.estadoFinalDoFilme(a, d, filme, mv.proj, kill);
    } else if (kill) {
      // o KO já foi aplicado em resolverVidaZerada: não há reação de hit/knockdown
    } else if (mv.hits && a.hitCount < mv.hits) {
      // acertos intermediários: segura o rival no combo
      d.setState('hit');
      d.stun = mv.hs + stunExtra;
      d.vx = mv.kb * a.facing * 0.5;
      if (!d.grounded || a.vy < 0) {
        d.vy = Math.min(a.vy, -3);
        if (d.grounded) d.y -= 1;
      }
    } else if ((mv.kd && !passoDoCombo?.semQueda) || passoDoCombo?.final !== undefined || !d.grounded || d.state === 'down') {
      this.derrubar(a, d, mv.proj ? mv.kb : Math.max(mv.kb, 7), passoDoCombo?.final);
    } else {
      d.setState('hit');
      d.stun = mv.hs + stunExtra;
      d.vx = mv.kb * a.facing;
    }
    if (cornered && !kill && !filme) a.vx = -a.facing * mv.kb * 0.8;
    this.shake = this.ajustes.shake ? (mv.heavy || mv.proj || kill ? 9 : 5) : 0;
    this.hitstop = mv.heavy || kill ? 6 : 4;
    this.reforcarTrocaDeBarra();
    this.emitir({
      tipo: 'hit',
      atacante: a.indice,
      defensor: d.indice,
      x: ox,
      y: oy,
      cor: mv.proj ? a.ch.fire[0] : '#ffd84a',
      grande: mv.proj || mv.heavy || kill,
      snd: mv.snd,
      pitch: d.ch.pitch,
      contragolpe: counter,
      projetil: mv.proj,
      acertos: d.gotHits,
      texto: emPreparo
        ? textoFlutuante(ox, oy - 40, "COUP D'ARRÊT!", '#ffffff', 26)
        : counter
          ? textoFlutuante(ox, oy - 40, 'COUNTER!', '#ff9a3a', 24)
          : null,
      ...(emPreparo ? { contraEspecial: true } : {}),
      dano: danoCausado,
      ...marcaDoGolpe(mv),
      ...(mv.nivelCarga > 0 ? { nivelCarga: mv.nivelCarga as 1 | 2 | 3 } : {}),
      ...(drenoAcerto > 0 ? { dreno: drenoAcerto } : {}),
      ...(filme ? { filme: true as const } : {}),
    });
    if (filme && antes) {
      this.emitir({
        tipo: 'filme',
        atacante: a.indice,
        defensor: d.indice,
        golpe: mv.golpe ?? '',
        ficha: mv.ficha,
        projetil: mv.proj,
        ...(mv.nivelCarga > 0 ? { nivelCarga: mv.nivelCarga as 1 | 2 | 3 } : {}),
        dano: danoCausado,
        contragolpe: counter,
        ko: kill,
        trocaDeBarra: d.barras < barrasAntes,
        final: filme.final ?? 'derruba',
        antes,
        depois: this.posicoesDoFilme(a, d),
        // R-6: só com `ritmo.filmeRestrito` (sem super ainda, R-7: todo filme confirmado aqui é por KO).
        ...(this.ritmoFilmeRestrito ? ({ motivo: kill ? 'ko' : 'super' } as const) : {}),
      });
      for (const ev of diferidos) this.emitir(ev);
    }
  }

  // ----- V2-4: combos próprios (docs/spec-revisao-motor-luta-v2.md §6) -----

  /**
   * Registra o acerto `mv` no histórico do atacante (um por execução; recomeça se o rival estava livre) e devolve o passo do combo próprio
   * que o histórico inteiro reconhece (o 1º da lista), ou null. Chegar ao último golpe da sequência conta um combo completo.
   */
  private registrarAcertoDoCombo(a: Fighter, d: Fighter, mv: AtaqueAcerto): PassoDoCombo | null {
    if (d.gotHits === 0) a.historicoCombo.length = 0;
    if (mv.golpe === undefined) return null;
    const h = a.historicoCombo;
    if (h[h.length - 1]?.atk !== mv.atk) h.push({ golpe: mv.golpe as NomeGolpe, atk: mv.atk });
    const r = comboReconhecido(a.ch.combosProprios, h.map((x) => x.golpe));
    if (!r) return null;
    const ultimo = r.passo === r.combo.sequencia.length - 1;
    if (ultimo) this.combosPropriosFeitos[a.indice]++;
    return { semQueda: r.combo.semQueda?.includes(r.passo) === true, final: ultimo ? r.combo.final : undefined };
  }

  /** A queda de sempre (`final` ausente ou 'derruba') ou uma das três variações do último golpe de um combo próprio. */
  private derrubar(a: Fighter, d: Fighter, kb: number, final: FinalDoCombo | undefined): void {
    if (final === 'parede') d.knockdown(a.facing, Math.max(kb, QUEDA_PAREDE_KB));
    else if (final === 'cruza') d.knockdown(-a.facing, Math.max(kb, QUEDA_CRUZA_KB));
    else {
      d.knockdown(a.facing, kb);
      if (final === 'lanca') d.vy = QUEDA_LANCA_VY;
    }
  }

  // ----- V2-3c: filme do especial (docs/spec-revisao-motor-luta-v2.md §3 e §4) -----

  /** O filme do golpe `golpe` (chave de `ch.moves`) de `a` na ficha `ficha`, ou undefined (flag desligada, golpe comum, ou especial sem filme: PARADE, VADIVU). */
  private filmeDaExecucao(a: Fighter, golpe: string, ficha: string | null): FilmeDoGolpe | undefined {
    if (!this.filmesLigados || golpe[0] !== 's') return undefined;
    return filmeDoGolpe(a.ch.id, ficha, golpe);
  }

  private chaveDaExecucao(indice: IndiceLutador, atk: number): number {
    return atk * 2 + indice;
  }

  /** A execução `atk` do lutador `indice` teve o seu contato: nenhum acerto ou tiro dela existe mais (os projéteis em voo somem no próximo `resolveHits`). */
  private consumirExecucao(indice: IndiceLutador, atk: number): void {
    this.execConsumidas.add(this.chaveDaExecucao(indice, atk));
  }

  private posicoesDoFilme(a: Fighter, d: Fighter): { atacante: PosFilme; defensor: PosFilme } {
    return { atacante: { x: a.x, y: a.y, facing: a.facing }, defensor: { x: d.x, y: d.y, facing: d.facing } };
  }

  /**
   * Dano do filme inteiro antes do `danoRecebido` (spec §4.1): `dano x (projétil ? 1 : pow) x escalaCombo x contragolpe`, no máximo `TETO_GOLPE`.
   * Mesma conta e mesma ordem de `danoDoGolpe`; a MASHI usa o `danoPorNivel` do nível da carga.
   */
  private danoDoFilme(filme: FilmeDoGolpe, a: Fighter, nivelCarga: number, projetil: boolean, gotHits: number, contragolpe: boolean, multContra: number | undefined): number {
    // A/B do dano (`motorV2.danoFilme`): ausente ou `v2` = a tabela decidida, igual a antes de existir a opção
    const base = danoBaseDaVariante(filme, this.variantePadraoDoFilme, nivelCarga, projetil, a.ch.pow, a.ch.moves.hk?.dmg ?? 0);
    return Math.min(TETO_GOLPE, danoDoGolpe(base, a.ch.pow, projetil, gotHits, contragolpe, multContra));
  }

  /**
   * Teto de combo (spec §4.1, H2): um combo tira no máximo `TETO_COMBO` da vida TOTAL do defensor (todas as barras do chefão), sempre
   * deixando passar `PISO_ACERTO_NO_TETO` (o teste CPU x CPU proíbe acerto de dano zero). Vale para todo acerto com `motorV2.filmes`.
   * `dmg` já é o que a vida sofre (depois do `danoRecebido`), e `comboDmg` acumula a mesma grandeza.
   */
  private limitarAoTetoDoCombo(d: Fighter, dmg: number): number {
    if (this.semTetoDeCombo) return dmg;
    return Math.min(dmg, Math.max(PISO_ACERTO_NO_TETO, TETO_COMBO * d.maxHp * d.barrasMax - d.comboDmg));
  }

  /**
   * Estado final do filme (spec §3.3): o defensor deitado (`down`/`lie`, ou `ko`) no chão, a `distancia` do atacante, presos nas margens de
   * quem está caído; o atacante (exceto projétil) no chão, em `_lag` com `recuperacao` ticks, recuando se o defensor encostou na parede.
   * O combo acaba (queda), então nada mais acerta o defensor até ele levantar.
   */
  private estadoFinalDoFilme(a: Fighter, d: Fighter, filme: FilmeDoGolpe, projetil: boolean, ko: boolean): void {
    const distancia = filme.distancia ?? DISTANCIA_PADRAO_DO_FILME;
    if (!ko) {
      d.setState('down');
      d.phase = 'lie';
    }
    d.st = 0;
    d.stun = 0;
    d.move = null;
    d.vx = 0;
    d.vy = 0;
    d.y = GROUND;
    d.x = clamp(a.x + a.facing * distancia, MARGEM_CAIDO, LARGURA - MARGEM_CAIDO);
    if (!projetil) {
      a.vx = 0;
      a.vy = 0;
      a.y = GROUND;
      // Parede nas costas do defensor: é o atacante quem recua para manter a distância (nunca menos que a soma dos corpos).
      const livre = clamp(d.x - a.facing * distancia, 60, LARGURA - 60);
      if (Math.abs(d.x - a.x) < distancia) a.x = livre;
      a.move = '_lag';
      a.mt = 0;
      a.lagR = filme.recuperacao;
      a.hitDone = true;
      a.connected = false; // sem cancelamento: a vantagem depois do filme é a do dado (48 - recuperacao)
      a.armor = 0;
    }
    this.aoCair(d);
  }

  /** Agarrão de ESPECIAL que pega (HURACANRANA, ARREMESSO DO AVARGA) com filme: faz o papel de `applyHit` + `arremessar` (spec §3.1). */
  private arremessarComFilme(a: Fighter, d: Fighter, golpe: GolpeMontado, filme: FilmeDoGolpe): void {
    this.filmeNoTick = true;
    this.consumirExecucao(a.indice, a.atkId);
    const antes = this.posicoesDoFilme(a, d);
    if (d.gotHits === 0) d.comboDmg = 0;
    let dmg = this.danoNoDefensor(d, this.danoDoFilme(filme, a, 0, false, d.gotHits, false, undefined));
    dmg = this.limitarAoTetoDoCombo(d, dmg);
    if (this.training) dmg = Math.min(dmg, d.hp - 1 > 0 ? dmg : 0);
    const hpAntes = d.hp;
    d.hp = Math.max(0, d.hp - dmg);
    const dano = hpAntes - d.hp;
    d.gotHits++;
    d.comboDmg += dmg;
    d.dmgTaken += dmg;
    a.score += Math.round(dmg * 100);
    a.maxCombo = Math.max(a.maxCombo, d.gotHits);
    this.trainInfo = { hits: d.gotHits, dmg: d.comboDmg };
    a.connected = true;
    a.en = Math.min(MAX_EN, a.en + 8);
    d.en = Math.min(MAX_EN, d.en + 5);
    d.flash = 8;
    d.move = null;
    const barrasAntes = d.barras;
    const diferidos: EventoLuta[] = [];
    const kill = this.resolverVidaZerada(d, a, diferidos);
    this.estadoFinalDoFilme(a, d, filme, false, kill);
    this.shake = 8;
    this.hitstop = 6;
    this.reforcarTrocaDeBarra();
    this.emitir({
      tipo: 'throw',
      atacante: a.indice,
      defensor: d.indice,
      pitch: d.ch.pitch,
      texto: textoFlutuante(a.x, a.y - SH, 'ARREMESSO!', '#ffd23f', 22),
      dano,
      golpe: golpe.id,
      especial: true,
      filme: true,
    });
    this.emitir({
      tipo: 'filme',
      atacante: a.indice,
      defensor: d.indice,
      golpe: golpe.id,
      ficha: a.ficha,
      projetil: false,
      dano,
      contragolpe: false,
      ko: kill,
      trocaDeBarra: d.barras < barrasAntes,
      final: filme.final ?? 'derruba',
      antes,
      depois: this.posicoesDoFilme(a, d),
    });
    for (const ev of diferidos) this.emitir(ev);
  }

  /**
   * (ZENON) Passa energia do defensor para o atacante: `k = min(d.en, valor)`, `d.en -= k`, `a.en = min(MAX_EN, a.en + k)`. Devolve `k`
   * (0 = nada transferido). Só os dois ramos de `applyHit` que mexem em `en` (acerto e bloqueio) chamam; a armadura que absorve, a
   * PARADE e a esquiva retornam antes. Sem `drenaEnergia` não toca em nada (o lock-step dos originais não vê).
   */
  private cobrarDreno(a: Fighter, d: Fighter, dreno: DrenaEnergiaDef | undefined, ramo: 'acerto' | 'defesa'): number {
    if (!dreno) return 0;
    const k = Math.min(d.en, dreno[ramo]);
    if (!(k > 0)) return 0;
    d.en -= k;
    a.en = Math.min(MAX_EN, a.en + k);
    return k;
  }

  /**
   * Único lugar que decide o que acontece quando a vida de `d` chegou a 0 ou menos (golpe, projétil ou
   * arremesso). Devolve true se houve KO. Treino nunca mata: a vida fica em 1.
   *
   * Chefe com barra de sobra (E3): NÃO é KO. A barra seguinte enche, o combo é cortado, o chefe fica invulnerável
   * por 60 ticks (o combo não atravessa para a barra final) e a Dança da Águia fica pendente. Devolve false, então
   * os chamadores aplicam a reação normal (atordoamento ou derrubada). O evento `fase-chefe` sai ANTES do `hit`.
   */
  resolverVidaZerada(d: Fighter, a: Fighter, diferidos?: EventoLuta[]): boolean {
    if (d.hp > 0) return false;
    if (this.training) {
      d.hp = 1;
      return false;
    }
    if (d.barras > 1) {
      d.barras--;
      d.hp = d.maxHp;
      d.gotHits = 0;
      d.invuln = 60;
      d.cenaPendente = true;
      this.hitstop = 20;
      this.shake = 14;
      this.trocaDeBarraNoTick = true;
      this.emitir({ tipo: 'fase-chefe', lutador: d.indice, etapa: 'troca', barrasRestantes: d.barras });
      return false;
    }
    this.ko(d, a, diferidos);
    return true;
  }

  /** Reaplica hitstop/shake da troca de barra depois que `applyHit`/`arremessar` gravaram os valores do golpe comum. */
  private reforcarTrocaDeBarra(): void {
    // A flag vale pelo TICK inteiro (zera no início de `update`): um 2º acerto no mesmo tick (ex.: projétil do chefe no
    // jogador) também reaplica 20/14, em vez de regravar 4/9 por cima da troca. Chamada direta de `resolverVidaZerada`
    // fora de `update` não deixa a flag viva para o próximo golpe comum: o próximo `update` a zera antes de qualquer acerto.
    if (!this.trocaDeBarraNoTick) return;
    this.hitstop = 20;
    this.shake = this.ajustes.shake ? 14 : 0;
  }

  private ko(d: Fighter, a: Fighter, diferidos?: EventoLuta[]): void {
    d.hp = 0;
    d.stun = 0;
    d.setState('ko');
    d.vx = 7 * a.facing;
    d.vy = -9;
    d.y -= 1;
    d.move = null;
    this.phase = 'ko';
    this.t = 0;
    this.shake = 14;
    this.hitstop = 14;
    const ev: EventoLuta = { tipo: 'ko', defensor: d.indice, pitch: d.ch.pitch };
    if (diferidos) diferidos.push(ev); // V2-3c: o `ko` de um filme sai depois do `hit` e do `filme`
    else this.emitir(ev);
  }

  private endRound(): void {
    let w: Fighter | null = null;
    // desempate por tempo: vida somada de todas as barras (com 1 barra == hp, como no protótipo)
    if (this.p1.vidaTotal > this.p2.vidaTotal) w = this.p1;
    else if (this.p2.vidaTotal > this.p1.vidaTotal) w = this.p2;
    this.winner = w ? w.indice : null;
    this.perfect = false;
    if (w) {
      w.wins++;
      // Perfeito é sobre a barra final e exige não ter perdido nenhuma barra (barras === barrasMax: 1 === 1 nos normais).
      this.perfect = w.hp >= w.maxHp - 0.01 && w.barras === w.barrasMax;
      w.score += Math.max(0, this.timeLeft) * 100 + Math.round(w.hp) * 50 + (this.perfect ? 5000 : 0);
      // Bônus por derrotar o chefe: só quando o perdedor era o chefe da luta.
      const perdedor = w === this.p1 ? this.p2 : this.p1;
      if (perdedor.cfgChefe) w.score += perdedor.cfgChefe.bonusVitoria;
    }
    const fimDaLuta = !!w && w.wins >= this.winsNeeded;
    this.emitir({ tipo: 'round', fase: 'end', round: this.round, vencedor: this.winner, fimDaLuta });
    if (w && this.perfect) this.emitir({ tipo: 'perfect', vencedor: w.indice });
    if (w && fimDaLuta) {
      this.phase = 'matchend';
      this.matchWinner = w.indice;
    } else this.phase = 'roundend';
    this.t = 0;
  }
}

