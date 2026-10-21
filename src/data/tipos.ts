import type { EstiloProjetil, IdLutador } from '../core/contratos';

/** Nomes das entradas da tabela de golpes (ch.moves) do protótipo. */
export type NomeGolpe =
  | 'lp' | 'lk' | 'hp' | 'hk' // em pé: soco/chute fraco e forte
  | 'clp' | 'clk' | 'chp' | 'chk' // agachado (↓ + botão)
  | 'jlp' | 'jhp' | 'jlk' | 'jhk' // no ar
  | '_lag' | 'throw' // recuperação de pouso / arremesso
  | 'sFire' | 'sDown' | 'sFwd' // 3 especiais: ESP · ↓+ESP · →+ESP
  | 'sResp'; // E3 (CAMILLE): resposta da PARADE. Golpe oculto: nenhuma entrada o alcança (só `startMove('sResp')`)

export type NomeEspecial = 'sFire' | 'sDown' | 'sFwd';

/** mid: bloqueia em pé ou agachado · low: só agachado · over: só em pé · throw: não bloqueia. */
export type NivelGolpe = 'mid' | 'low' | 'over' | 'throw';
/** `carga`/`rebote`/`aparar`/`troca` são as primitivas da E3 (docs/mecanicas-e3.md §1): o tipo existe desde a S0, a lógica entra na fatia de cada lutador. */
export type TipoGolpe = 'fire' | 'rise' | 'rush' | 'leap' | 'melee' | 'carga' | 'rebote' | 'aparar' | 'troca';
export type KindGolpe = 'punch' | 'kick' | 'sweep' | 'fire' | 'lag';
/** Som de impacto; é o nome do método do AudioSys (AudioSys[mv.snd]()). */
export type SomGolpe = 'punch' | 'kick' | 'fireballHit';
/** Uma só definição de estilos de projétil: a de core/contratos.ts (C3). Alias mantido p/ quem já importa. */
export type EstiloProjetilDef = EstiloProjetil;

// ---------------------------------------------------------------------------
// E3 — parâmetros novos dos golpes e dicas de CPU (docs/mecanicas-e3.md §2). SÓ TIPOS na S0: campo ausente = código
// antigo intacto. Cada um ganha a lógica (e o teste medido) na fatia indicada.
// ---------------------------------------------------------------------------

/** (S2, AMINU) MASHI: segurar carrega. `niveis[i]` = ticks de espera para atingir o nível i; `max` = auto-solta. */
export type CargaDef = {
  max: number;
  /** Limiar em ticks de cada nível (ex.: [0, 30, 70] → nível 1 a partir de 0, 2 a partir de 30, 3 a partir de 70). */
  niveis: readonly number[];
  /** Multiplicador de velocidade ao andar carregando. */
  andar: number;
  /** Ajustes aplicados ao golpe conforme o nível alcançado (índice = nível − 1). */
  porNivel: readonly { dmg?: number; kd?: 1; quebraGuarda?: number }[];
};

/** (S3, CENTELLA) RESORTE: corre de costas até a corda, quica e volta; quanto mais longe a corda, mais forte. */
export type ReboteDef = {
  vel: number;
  maxTicks: number;
  vy: number;
  vxBase: number;
  vxPorPx: number;
  dmgPorPx: number;
  /** Distância máxima que conta para dano (px). */
  maxDist: number;
};

/** (S4, CAMILLE) PARADE: anula golpe corpo a corpo dos `niveis` na janela ativa e responde com `sResp`. */
export type ParryDef = { niveis: readonly NivelGolpe[]; atordoaAtacante: number };

/**
 * (S1b/S3, BAATAR e CENTELLA) Agarrão em golpe (exige `throw: 1`): `alcance` px entre os dois x (o rival nunca fica a
 * menos de `corpo + corpo` = 78: alcance menor que isso jamais agarra), `dmg` fixo (× pow), `alvo` e `janela` de ticks.
 * `janela` ausente = testa só em mt === S; com janela testa a cada tick de [S, S + janela) até agarrar uma vez.
 * `alvo`: 'chao' (padrão: rival no chão), 'ar' (rival fora do chão a menos de 120 px de altura de diferença: HURACANRANA
 * da CENTELLA) ou 'ambos'.
 */
export type AgarraoDef = { alcance?: number; dmg?: number; alvo?: 'chao' | 'ar' | 'ambos'; janela?: number };

/** (S4, CAMILLE) Contragolpe reforçado quando acerta o rival na PREPARAÇÃO do golpe dele (`mult` no lugar de 1,15; `hs` soma ao atordoamento). */
export type ContraDef = { mult: number; hs: number };

/**
 * Dica de CPU por golpe (E3 §2). REGRA: a CPU só gasta chamadas de RNG a mais por causa de uma dica se o PRÓPRIO
 * lutador a declara (`LutadorMontado.dicasIa` não vazio). Lutador sem dica consome exatamente o RNG de antes — é o que
 * mantém o snapshot de CPU × CPU (semente 42) intacto. Papéis hoje: `pressao`/`aproximar` (usar o golpe no `alcance`;
 * `segurar` mantém ESP apertado) e `defesa-projetil` (escudo no lugar do bloqueio). `antiaereo` (golpe que entra no ramo anti-aéreo), `defesa` (golpe que substitui o bloqueio contra golpe corpo a corpo não baixo) e `troca` (troca de ficha pela distância; o único `rnd` extra da S5): nenhum deles sorteia a mais fora do ramo em que entra.
 */
export type PapelIa = 'pressao' | 'aproximar' | 'defesa' | 'defesa-projetil' | 'antiaereo' | 'troca';
export type DicaIa = {
  papel: PapelIa;
  /** Distância (px) em que o golpe faz sentido: [mín, máx]. */
  alcance?: readonly [number, number];
  /** (carga) quantos ticks segurar ESP, sorteado em [mín, máx]. */
  segurar?: readonly [number, number];
  /** (RESORTE) distância mínima até a parede de trás. */
  espacoAtras?: number;
  /** (troca de postura) ficha preferida longe (`distancia`) e perto (`perto`) do rival; null = a ficha base. */
  preferir?: { distancia: string | null; perto: string | null };
  /** (troca de postura) distância (px) que separa "perto" de "longe". Padrão 200. */
  limite?: number;
};

/**
 * (ZENON, spec-chefao-zenon §2) Cena de poses por tempo: `poses[i]` vale do tick floor(i·duracao/n) ao próximo; a última
 * segura até o fim. Dois consumidores, um tipo: a cena de fase 2 do chefe (`ConfigChefe.cena`, no motor) e as poses de
 * entrada/vitória (`APRESENTACAO`, só desenho).
 */
export type CenaDef = { duracao: number; poses: readonly string[] };

/** Trilha da luta de chefe (src/audio, spec §5). Ausente = a trilha de luta de sempre. */
export type TrilhaChefe = 'chefe';

/** Configuração da luta de chefe de um lutador (docs/mecanicas-e3.md §3.1). Só vale com `ConfigPartida.chefe`. */
export type ConfigChefe = {
  barras: 2;
  /** Vida de cada barra (vira `maxHp` do chefe). */
  hpPorBarra: number;
  /** Ficha ativa na fase 1 (atributos do modo chefão) — chave de `LutadorDef.fichas`. Ausente = a ficha base do jogável (os guardiões). */
  fichaFase1?: string;
  /** Ficha ativa na fase 2, depois da cena. Ausente = não troca de ficha na retomada (a NILA mantém a postura em que estava). */
  fichaFase2?: string;
  /** Cena da fase 2 (era `danca`): `duracao` ticks entre a troca de barra e a retomada, e as poses do chefe nela. */
  cena: CenaDef;
  /** Pontos para quem derrota o chefe (valor final na E6). */
  bonusVitoria: number;
  /** Trilha da luta de chefe (spec §5). Ausente = 'fight' (a de hoje). Tirar o campo é o rollback. */
  trilha?: TrilhaChefe;
  /**
   * Multiplicador do dano que a VIDA do chefe sofre (arremesso, raspão de bloqueio, armadura e golpe), aplicado depois de todas as
   * contas do golpe. Mora aqui, e não numa ficha, porque a ficha do lutador pode mudar no meio da luta (VADIVU da NILA) e levaria o
   * reforço junto. 0,60 <= x <= 1: abaixo disso o chefão vira esponja (spec chefões §4.3, R5). Ausente = 1 (como sempre). A energia
   * (`drenaEnergia`) não passa por ele.
   */
  danoRecebido?: number;
};

/**
 * (ZENON, spec §1) TRIBUTO/DECRETO: no acerto tira `acerto` de energia do rival e dá ao atacante; na defesa (bloqueio),
 * `defesa`. Sem escala por `pow`. Só vale em golpe corpo a corpo de UM acerto; `montar` rejeita com `proj`, `hits > 1`, `throw`
 * ou valores fora de 0 ≤ defesa ≤ acerto ≤ MAX_EN.
 */
export type DrenaEnergiaDef = { acerto: number; defesa: number };

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
  // --- E3: parâmetros novos (ver blocos acima) ---
  carga?: CargaDef;
  rebote?: ReboteDef;
  parry?: ParryDef;
  agarrao?: AgarraoDef;
  contra?: ContraDef;
  /** (S2) Nível de quebra de guarda: bloqueado vira atordoamento de `quebraGuarda` ticks. */
  quebraGuarda?: number;
  /** (S2) Projétil frontal que tocar o lutador durante este golpe some (evento `clash`). */
  absorveProj?: 1;
  /** (S5) Passa por baixo de projétil (terceiro nível de altura da hurtbox). */
  rente?: 1;
  /**
   * (S1b) Salto com alvo (só `leap`/`rise`): ticks de voo (deve bater com o voo real: vy −17 e gravidade 0,85 = 40). A
   * velocidade horizontal é (x do rival − x) / vxAlvo na decolagem, limitada por |vx| (16 se ausente).
   */
  vxAlvo?: number;
  /** (S5) Golpe `type: 'troca'`: ficha para a qual o lutador troca em `mt === S` (null = volta à base). */
  troca?: { ficha: string | null };
  /** Dica de CPU (ver `DicaIa`). */
  ia?: DicaIa;
  /** (ZENON) Imposto de energia no acerto/bloqueio (ver `DrenaEnergiaDef`). */
  drenaEnergia?: DrenaEnergiaDef;
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

/** Ficha: variação do lutador (postura da NILA, fases do chefe). Sobrescreve (raso) campos do `LutadorDef` base. */
export type FichaDef = Partial<Omit<LutadorDef, 'id' | 'fichas' | 'chefe'>>;

export type IdCenario = 'jp' | 'cn' | 'kr' | 'br' | 'ng' | 'mx' | 'fr' | 'in' | 'mn' | 'gr';

/** Dados estáticos de um lutador (CHARS do protótipo, sem o que é derivado do atlas). */
export type LutadorDef = {
  id: IdLutador;
  /**
   * Chave no protótipo (f1..f4). OPCIONAL: lutadores novos não existem no protótipo; os testes de
   * fidelidade iteram só quem tem.
   */
  idPrototipo?: 'f1' | 'f2' | 'f3' | 'f4';
  /**
   * Meia-largura de empurrão entre lutadores (px lógicos). Default CORPO_PADRAO (39). A distância mínima
   * entre dois lutadores é a soma dos dois `corpo` (39 + 39 = 78, o valor fixo do protótipo).
   */
  corpo?: number;
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
  /** Ajustes de animação por especial quando a folha pede outra sequência (CHAR_ANIM). `throw` (ZENON): arte própria do agarrão comum. */
  anim?: Partial<Record<NomeEspecial | 'sResp' | 'throw', Anim>>;
  /**
   * (S5) Pose por ficha: nome lógico -> pose do atlas que SUBSTITUI a pose própria (ex.: `idle0 -> sarpaIdle0`). Só vale
   * se o atlas tem a pose; senão `getPD` segue a cadeia de sempre. Diferente de `alias` (que só entra quando falta).
   */
  poseDaFicha?: Readonly<Record<string, string>>;
  /**
   * (E6a) Fração da altura da hurtbox EM PÉ (idle, walk e block em pé) para quem tem o corpo mais baixo que a guarda: a
   * SARPA (ficha da NILA) mede ~79% da GAJA nesses quadros (`sarpaIdle*`, `sarpaWalk*`, `sarpaBlock`) e a caixa de 96% de SH
   * deixava projéteis e golpes altos acertando o ar acima da cabeça dela. Ausente = 1 (a caixa de sempre, bit a bit).
   * Não vale agachado, `rente`, no ar nem em golpe: esses estados usam poses que não mudam de tamanho.
   */
  alturaEmPe?: number;
  /**
   * (ZENON) Altura (px logicos acima dos pes, ja na escala do lutador) em que o projetil nasce. Ausente = a da ponta de `special`/`sa1`
   * (conta de sempre, bit a bit). A 1,36 de escala a mao do `sa1` fica a ~280 px do chao e a caixa do projetil (60 px) passava por cima da
   * cabeca de quem tem escala 1,0 (hurtbox em pe com topo a 254 px): o SELO nunca acertava.
   */
  alturaDoProjetil?: number;
  // --- E3 ---
  /** Golpes extras que nenhuma entrada alcança (ex.: `sResp` da CAMILLE). */
  extras?: Partial<Record<'sResp', Golpe>>;
  /** (S1b) PESO DA MONTANHA: `armor:1` só absorve golpes de rank ≤ rankMax; projétil e golpe forte interrompem. */
  armadura?: { rankMax: number };
  /** Fichas nomeadas (ver `FichaDef`). Montadas no boot por `montarLutador`; ausente = só a base. */
  fichas?: Record<string, FichaDef>;
  /** Presente = este lutador pode ser o chefe (`ConfigPartida.chefe`). Sem `cfg.chefe` o lutador é o jogável normal. */
  chefe?: ConfigChefe;
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
