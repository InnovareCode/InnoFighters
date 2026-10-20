/**
 * Contratos entre camadas (PLANO.md seção 4.3). Só tipos, sem lógica.
 * Dono deste arquivo: Vega. Lyra apenas lê (pede mudança via Atlas).
 */

/** C2 — um quadro de entrada por jogador e por tick. Idêntico ao readInput() do protótipo. */
export type InputFrame = {
  // estado segurado
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  // borda de descida: true só no tick em que o botão foi apertado
  lp: boolean;
  hp: boolean;
  lk: boolean;
  hk: boolean;
  sp: boolean;
};

export const INPUT_VAZIO: Readonly<InputFrame> = Object.freeze({
  left: false,
  right: false,
  up: false,
  down: false,
  lp: false,
  hp: false,
  lk: false,
  hk: false,
  sp: false,
});

/** C4 — configurações salvas. Valores padrão = DEFAULTS do protótipo. */
export type Configuracoes = {
  music: number;
  sfx: number;
  rounds: number;
  time: number;
  diff: number;
  shake: boolean;
  controles?: Record<string, string>;
};

export const CONFIGURACOES_PADRAO: Readonly<Configuracoes> = Object.freeze({
  music: 0.45,
  sfx: 0.8,
  rounds: 2,
  time: 99,
  diff: 1,
  shake: true,
});

/** C4 — formato gravado no localStorage sob CHAVE_STORAGE. */
export type ArmazenamentoV1 = {
  v: 1;
  s: Configuracoes;
  hi: number;
};

export const CHAVE_STORAGE = 'inno-fighters-v1';
/** Chave do protótipo (Sakura Fighters). Migrar uma vez e apagar. */
export const CHAVE_STORAGE_LEGADA = 'sakura-fighters-v4';

// ---------------------------------------------------------------------------
// C3 — Estado de leitura da luta + fila de eventos (Fase 1a, Vega).
//
// `fight/` ESCREVE; `render/`, `ui/` e `audio/` só LEEM. Nomes de campos = nomes do
// protótipo (x, y, facing, hp, hpShown, en, flash, shake, hitstop...) para o porte
// ser mecânico. Unidades: px lógicos 960x540, ticks de 1/60 s. Só tipos, sem lógica.
//
// Regras de consumo (fidelidade ao protótipo):
//  1. `tick` só avança nos ticks em que a luta realmente andou (no protótipo,
//     `Game.update` retorna cedo durante `hitstop`: partículas, rajadas e textos
//     CONGELAM junto). Quem anima efeitos deve avançá-los quando `tick` mudar,
//     DEPOIS de processar `events` daquele tick (o protótipo cria a partícula e já
//     a atualiza no mesmo tick).
//  2. `events` é esvaziado por `fight/` no início de cada tick; no tick congelado
//     pelo hitstop fica vazio. Quem leu não precisa limpar.
//  3. A luta não toca em áudio nem em partículas; só emite eventos. Sons e efeitos
//     visuais saem dos eventos (receita de cada um no comentário do tipo).
//  4. Aleatoriedade dos efeitos (faíscas, poeira, rotação da rajada, pétalas) usa
//     um RNG visual separado do RNG da lógica (CPU); assim o replay com semente da
//     lógica não depende de quantas partículas foram desenhadas.
// ---------------------------------------------------------------------------

/** 0 = P1 (lado esquerdo, `side` 1 no protótipo), 1 = P2. Índice em `fighters`. */
export type IndiceLutador = 0 | 1;

/** Id estável do lutador. No protótipo: f1=hayato, f2=wei-long, f3=min-ji, f4=caio. */
export type IdLutador = 'hayato' | 'wei-long' | 'min-ji' | 'caio';

/** Máquina de estados do `Fighter` do protótipo (`this.state`). */
export type EstadoLutador =
  | 'idle'
  | 'walk'
  | 'crouch'
  | 'jump'
  | 'prejump'
  | 'land'
  | 'dash'
  | 'move'
  | 'hit'
  | 'block'
  | 'down'
  | 'ko'
  | 'win';

/**
 * Quadro escolhido por `poseT()` + ajustes de transformação. `name` é o nome do
 * quadro no atlas (idle0, walk3, lp1, koFloor...); render aplica, nesta ordem:
 * translate(x, y + dy) · scale(facing * flip, 1) · translate(dx, 0) · rotação `rot`
 * em torno de 45% da altura · scale(sx, sy). `glow` (0..1) = brilho da magia.
 */
export type PoseAtual = {
  name: string;
  dx: number;
  dy: number;
  sx: number;
  sy: number;
  rot: number;
  glow: number;
  flip: 1 | -1;
};

/** Combo exibido no HUD (combo1/combo2 do protótipo): hits > 1 por `t` ticks. */
export type ComboLeitura = { hits: number; dmg: number; t: number };

/** Imagem fantasma de corrida/investida (`Fighter.trail`). `life` 10 → 0. */
export type RastroLeitura = { x: number; y: number; name: string; f: 1 | -1; life: number };

export type LutadorLeitura = {
  /** Qual personagem (chave de data/lutadores). */
  id: IdLutador;
  /** 0 = P1, 1 = P2. */
  indice: IndiceLutador;
  x: number;
  /** Pés. Chão = GROUND (470). */
  y: number;
  facing: 1 | -1;
  state: EstadoLutador;
  pose: PoseAtual;
  /** Golpe em curso (chave de ch.moves) e tick dentro dele — drawSwing precisa. */
  move: string | null;
  mt: number;
  hp: number;
  maxHp: number;
  /** HP "atrasado" da barra de vida (desce 0,5/tick até alcançar hp). */
  hpShown: number;
  /** Energia 0..100. */
  en: number;
  /** Flash branco de dano, 8 → 0. */
  flash: number;
  invuln: number;
  /** Contador de ticks de vida do lutador (pisca da invulnerabilidade, brilho). */
  age: number;
  /** Pontuação, rounds ganhos, maior combo e dano levado (HUD/resultado). */
  score: number;
  wins: number;
  maxCombo: number;
  dmgTaken: number;
  /** Combo que ESTE lutador aplicou no rival (combo1 p/ P1, combo2 p/ P2). */
  combo: ComboLeitura;
  trail: readonly RastroLeitura[];
  /** Controlado pela CPU? nível 0..2 (FÁCIL/NORMAL/DIFÍCIL) ou null. */
  cpu: number | null;
};

export type EstiloProjetil = 'orb' | 'wave' | 'blade' | 'boomerang';

export type ProjetilLeitura = {
  id: number;
  x: number;
  y: number;
  vx: number;
  /** Direção em que foi lançado (+1/-1). */
  dir: 1 | -1;
  /** Quem lançou. render pega as cores em data/lutadores[<id>].fire. */
  dono: IndiceLutador;
  style: EstiloProjetil;
  /** Escala x / y do desenho. */
  sc: number;
  sy: number;
  /** Ticks desde o lançamento (animação). */
  frame: number;
};

export type FaseLuta = 'idle' | 'intro' | 'fight' | 'ko' | 'timeover' | 'roundend' | 'matchend';

export type ModoLuta = 'versus' | 'cpu' | 'arcade' | 'training';

export type CameraLeitura = { z: number; x: number };

/** Estatística do modo treino (`trainInfo`). */
export type InfoTreino = { hits: number; dmg: number };

/** Texto flutuante (`floatText`): sobe 0,6 px/tick por 50 ticks, apaga no fim. */
export type TextoFlutuante = { x: number; y: number; s: string; col: string; size: number };

/** Som de impacto (`mv.snd` do protótipo) — nome do método do AudioSys. */
export type SomImpacto = 'punch' | 'kick' | 'fireballHit';

/**
 * Fila de eventos da luta. Cada um é o que o protótipo fazia chamando AudioSys.* /
 * sparks / burst / dust / floatText / shake de dentro da lógica. Receitas:
 *
 *  swing      -> AudioSys.swing(golpe === 'punch' ? 0 : 1)   (inclusive arremesso no vazio: 'kick')
 *  special    -> AudioSys.special(pitch)                      (gasto de energia ao iniciar a magia)
 *  deny       -> AudioSys.deny()                              (sem energia)
 *  jump       -> AudioSys.jump()
 *  land       -> AudioSys.land()                              (pouso e queda no chão)
 *  dust       -> partículas de poeira: dust(x, n, power)      (passos, pulo, pouso, corrida, queda)
 *  projectile -> AudioSys.fireballLaunch()
 *  clash      -> faíscas 22 brancas + rajada grande branca em (x, y) + AudioSys.fireballHit()
 *  block      -> faíscas 8 '#9ad8ff' + rajada de bloqueio (blk, dir, life 9) + AudioSys.block() + texto
 *  armor      -> faíscas 10 brancas + rajada pequena branca + AudioSys[snd]() + texto
 *  hit        -> faíscas 18 de `cor` + rajada (grande?) + AudioSys[snd]() + AudioSys.hurt(pitch) + texto
 *  throw      -> AudioSys.kick() + AudioSys.hurt(pitch) + texto
 *  ko         -> AudioSys.ko(pitch)
 *  round      -> fase 'start': AudioSys.roundStart(); 'fight': AudioSys.fight(); 'timeover': AudioSys.timeOver();
 *                'end': AudioSys.victory()
 *  perfect    -> emitido junto de round/'end' quando venceu sem perder vida: AudioSys.uiPerfect() após 700 ms
 *
 * O tremor de tela e o hitstop NÃO viajam no evento: ficam em `LeituraLuta.shake` /
 * `.hitstop` (o protótipo os lê/decrementa como estado).
 */
export type EventoLuta =
  | { tipo: 'swing'; lutador: IndiceLutador; golpe: 'punch' | 'kick' }
  | { tipo: 'special'; lutador: IndiceLutador; pitch: number }
  | { tipo: 'deny'; lutador: IndiceLutador }
  | { tipo: 'jump'; lutador: IndiceLutador }
  | { tipo: 'land'; lutador: IndiceLutador }
  | { tipo: 'dust'; x: number; n: number; power: number }
  | { tipo: 'projectile'; lutador: IndiceLutador; x: number; y: number; style: EstiloProjetil }
  | { tipo: 'clash'; x: number; y: number }
  | {
      tipo: 'block';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      /** Sentido da rajada de bloqueio (= -facing do atacante). */
      dir: 1 | -1;
      texto: TextoFlutuante | null;
    }
  | {
      tipo: 'armor';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      snd: SomImpacto;
      texto: TextoFlutuante;
    }
  | {
      tipo: 'hit';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      /** Cor das faíscas/rajada: cor do fogo do dono se projétil, senão '#ffd84a'. */
      cor: string;
      /** Rajada grande: projétil, golpe pesado ou golpe que mata. */
      grande: boolean;
      snd: SomImpacto;
      /** `pitch` do defensor (voz de dor). */
      pitch: number;
      contragolpe: boolean;
      projetil: boolean;
      /** Combo em andamento no defensor após este golpe (d.gotHits). */
      acertos: number;
      /** Texto 'COUNTER!' quando for contragolpe. */
      texto: TextoFlutuante | null;
    }
  | { tipo: 'throw'; atacante: IndiceLutador; defensor: IndiceLutador; pitch: number; texto: TextoFlutuante }
  | { tipo: 'ko'; defensor: IndiceLutador; pitch: number }
  | {
      tipo: 'round';
      fase: 'start' | 'fight' | 'timeover' | 'end';
      round: number;
      /** Só em 'end': vencedor do round (null = empate) e se a luta terminou. */
      vencedor?: IndiceLutador | null;
      fimDaLuta?: boolean;
    }
  | { tipo: 'perfect'; vencedor: IndiceLutador };

/** Tudo o que render/ui/audio podem ler de uma luta em andamento. */
export type LeituraLuta = {
  readonly fighters: readonly [LutadorLeitura, LutadorLeitura];
  readonly projectiles: readonly ProjetilLeitura[];
  /** Segundos restantes (timeLeft). 0 = sem limite (treino) ou acabou. */
  readonly timer: number;
  /** Tempo máximo configurado (timeMax); 0 = sem limite. */
  readonly timerMax: number;
  readonly round: number;
  /** Rounds necessários para vencer a luta (SETTINGS.rounds). */
  readonly winsNeeded: number;
  readonly cam: CameraLeitura;
  readonly phase: FaseLuta;
  /** Ticks na fase atual (`Game.t`). */
  readonly t: number;
  /** Contador de ticks que de fato andaram (ver regra 1). */
  readonly tick: number;
  /** Tremor de tela restante (px de amplitude, cai 1/tick). */
  readonly shake: number;
  /** Ticks de congelamento restantes. */
  readonly hitstop: number;
  readonly mode: ModoLuta;
  readonly training: boolean;
  readonly stage: string;
  /** Vencedor do round / da luta (null enquanto indefinido ou empate). */
  readonly winner: IndiceLutador | null;
  readonly matchWinner: IndiceLutador | null;
  readonly matchDone: boolean;
  /** Round terminou sem o vencedor perder vida. */
  readonly perfect: boolean;
  readonly trainInfo: InfoTreino;
  /** Eventos emitidos NESTE tick. */
  readonly events: readonly EventoLuta[];
};
