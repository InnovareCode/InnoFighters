import type { IdLutador } from '../core/contratos';

/** Nomes das entradas da tabela de golpes (ch.moves) do protótipo. */
export type NomeGolpe =
  | 'lp' | 'lk' | 'hp' | 'hk' // em pé: soco/chute fraco e forte
  | 'clp' | 'clk' | 'chp' | 'chk' // agachado (↓ + botão)
  | 'jlp' | 'jhp' | 'jlk' | 'jhk' // no ar
  | '_lag' | 'throw' // recuperação de pouso / arremesso
  | 'sFire' | 'sDown' | 'sFwd'; // 3 especiais: ESP · ↓+ESP · →+ESP

export type NomeEspecial = 'sFire' | 'sDown' | 'sFwd';

/** mid: bloqueia em pé ou agachado · low: só agachado · over: só em pé · throw: não bloqueia. */
export type NivelGolpe = 'mid' | 'low' | 'over' | 'throw';
export type TipoGolpe = 'fire' | 'rise' | 'rush' | 'leap' | 'melee';
export type KindGolpe = 'punch' | 'kick' | 'sweep' | 'fire' | 'lag';
/** Som de impacto; é o nome do método do AudioSys (AudioSys[mv.snd]()). */
export type SomGolpe = 'punch' | 'kick' | 'fireballHit';
export type EstiloProjetilDef = 'orb' | 'wave' | 'blade' | 'boomerang';

export type ProjetilDef = {
  dmg: number;
  /** Velocidade horizontal (px/tick). */
  sp: number;
  kb: number;
  hs: number;
  kd: boolean;
  /** Só o último tiro derruba (MIN-JI). */
  kdLast?: boolean;
  style: EstiloProjetilDef;
  sc: number;
  sy?: number;
  /** Rasteiro: nasce a 30 px do chão e só é bloqueado agachado. */
  low?: boolean;
  /** Aceleração contrária (bumerangue). */
  acc?: number;
  life: number;
};

/**
 * Golpe como no protótipo. S = quadros de preparação, A = ativos, R = recuperação.
 * Flags 1/0 do protótipo ficam como `1` (ausente = falso). Campos opcionais só existem
 * em alguns golpes (ex.: sFire não tem dmg/kb — usa `proj`); a lógica deve tratar
 * ausente como o protótipo trata (undefined = falsy/0).
 */
export type Golpe = {
  pose: string;
  S: number;
  A: number;
  R: number;
  kind: KindGolpe;
  /** Golpes só encadeiam em golpes de rank MAIOR. 0 = lag, 9 = especial/arremesso. */
  rank: number;
  dmg?: number;
  kb?: number;
  /** Atordoamento ao acertar / ao ser bloqueado. */
  hs?: number;
  bs?: number;
  lvl?: NivelGolpe;
  snd?: SomGolpe;
  /** Pode repetir o mesmo golpe (até 3x). */
  rep?: 1;
  /** Altura da caixa de acerto e multiplicador de alcance. */
  bh?: number;
  rm?: number;
  /** Avanço (px) ao golpear. */
  adv?: number;
  heavy?: 1;
  kd?: 1;
  crouch?: 1;
  tilt?: number;
  lift?: number;
  tall?: 1;
  air?: 1;
  throw?: 1;
  through?: 1;
  // --- especiais ---
  name?: string;
  info?: string;
  type?: TipoGolpe;
  /** Pose de preparação do especial (vira ch.alias.sc0). */
  pre?: string;
  cost?: number;
  vx?: number;
  vy?: number;
  inv?: number;
  lag?: number;
  armor?: 1;
  hits?: number;
  every?: number;
  spin?: 1;
  /** Ticks (mt) em que cada projétil sai. */
  shots?: number[];
  proj?: ProjetilDef;
};

/** Animação de um golpe: s = preparação, a = ativa, r = recuperação (quadros distribuídos pela fase). */
export type Anim = { s: readonly string[]; a: readonly string[]; r?: readonly string[]; loop?: number; fall?: string };

export type ModsGolpes = Partial<Record<NomeGolpe, Partial<Golpe>>>;
export type EspeciaisLutador = Record<NomeEspecial, Golpe>;

export type IdCenario = 'jp' | 'cn' | 'kr' | 'br';

/** Dados estáticos de um lutador (CHARS do protótipo, sem o que é derivado do atlas). */
export type LutadorDef = {
  id: IdLutador;
  /** Chave no protótipo (f1..f4); só para a ferramenta de extração e o teste de fidelidade. */
  idPrototipo: 'f1' | 'f2' | 'f3' | 'f4';
  country: string;
  /** Cenário da casa do lutador (luta-se na casa do rival). */
  stage: IdCenario;
  stageName: string;
  name: string;
  title: string;
  /** Tom das vozes (AudioSys.hurt/ko/special). */
  pitch: number;
  desc: string;
  /** Cores da magia: [meio, núcleo, borda]. */
  fire: readonly [string, string, string];
  accent: string;
  pow: number;
  spd: number;
  /** Vida máxima. */
  hp: number;
  jump: number;
  scale: number;
  /** px de caminhada por quadro de passo. */
  stride: number;
  /** Barras da tela de seleção (1 a 5), na ordem do protótipo (statBars). */
  bars: readonly [number, number, number, number];
  reach?: number;
  mods: ModsGolpes;
  especiais: EspeciaisLutador;
  /** Ajustes de animação por especial quando a folha pede outra sequência (CHAR_ANIM). */
  anim?: Partial<Record<NomeEspecial, Anim>>;
};

/** Pose no formato interno (o do POSEDATA do protótipo). tipX/tipY em px lógicos relativos à âncora. */
export type PoseDados = {
  x: number;
  y: number;
  w: number;
  h: number;
  ax: number;
  tipX?: number;
  tipY?: number;
  /** Centro do retrato relativo ao canto do quadro (ver data/atlas.ts). */
  rosto?: readonly [number, number];
};
export type Poses = Record<string, PoseDados>;

/** Caixa de ataque relativa ao lutador (ch.boxes): fx = recuo à frente, fy = altura do pé até o fundo. */
export type CaixaGolpe = { fx: number; fy: number; w: number; h: number };

export type GolpeMontado = Golpe & { id: NomeGolpe; anim: Anim; box?: NomeGolpe };
