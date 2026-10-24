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
  /**
   * E3: ESP SEGURADO (estado, não borda). Opcional de propósito: ausente = false, então os quadros do protótipo
   * e todo código antigo seguem iguais. Só a carga do AMINU (S2) lê. Produzido por `input/teclas.ts`
   * (`segurada.has(mapa.sp)`); a CPU não precisa preencher.
   */
  spSeg?: boolean;
  /**
   * ESQUIVA (docs/spec-esquiva-e-cinematica-especial.md A1): borda de descida do botão dedicado (teclado `n`/`o`, L1/L2, botão ESQ
   * no toque). A direção vem do estado segurado: frente = avanço; trás, neutro, ↓ ou ↑ = recuo. Opcional de propósito: ausente =
   * false, então os quadros do protótipo e a CPU antiga seguem iguais. Só vale com `ConfigPartida.esquiva` ligada; desligada, o
   * motor ignora o campo antes de qualquer conta.
   */
  esq?: boolean;
};

/**
 * Mecânicas da REVISÃO DO MOTOR DE LUTA v2 (docs/spec-revisao-motor-luta-v2.md §2), cada uma atrás da sua flag. Ausente ou `false` =
 * o motor de antes, bit a bit (é o que o oráculo de fidelidade ao protótipo e o CPU x CPU antigo fixam). V2-6: o jogo liga as três por padrão; quem liga é a UI, a partir de
 * `Regras.motorV2`; as flags das outras fatias (filmes, combos) entram aqui quando forem implementadas.
 */
export type MotorV2 = {
  /**
   * V2-1 (§7.1): o botão de ataque e as direções feitas DURANTE o hitstop não se perdem; só a entrada HUMANA é lida no tick congelado
   * (a CPU consome RNG e o boneco do treino não é humano) e é entregue ao 1º tick acionável.
   */
  entradaNoHitstop?: boolean;
  /**
   * V2-3c (§3): o FILME do especial. O 1º contato limpo de um especial (golpe com `filme` em `src/data/filmes.ts`) resolve TUDO no tick
   * do acerto (dano pela fórmula do §4.1, energia de UM acerto, KO, troca de barra, estado final de queda) e emite o evento aditivo
   * `filme`. Defendido, esquivado ou absorvido por armadura = sem filme, 1 contato só (os acertos e tiros restantes da execução deixam
   * de existir). Liga também o teto de combo (40% da vida total) em todo acerto. Desligada: o motor de antes, bit a bit.
   */
  filmes?: boolean;
  /**
   * V2-4 (§6): COMBOS PRÓPRIOS (`LutadorDef/FichaDef.combosProprios`). O atacante guarda os golpes que acertaram desde que o rival saiu de
   * `gotHits === 0`; se `histórico + próximo golpe` é prefixo de uma sequência da ficha ativa, o cancelamento vale mesmo fora da regra de
   * rank (a cadeia universal por rank continua para todos). Dentro de uma sequência reconhecida valem `semQueda` e `final`. A CPU DIFÍCIL
   * passa a usá-los (`AI_LEVELS[n].proprio`), o que consome o RNG da CPU. Desligada: o motor de antes, bit a bit.
   */
  combos?: boolean;
  /**
   * A/B do DANO do filme (D-V3; só ferramenta, nunca o jogo): `hoje` = o dano de antes do filme, `v2` = a tabela decidida (o padrão quando ausente), `forte` = o maior de
   * `hoje x 1,4` (projétil `x 1,2`) e `1,2 x hk`. Só tem efeito com `filmes` ligada. URL `?dano-filme=` (só em desenvolvimento) e `--dano-filme` do harness.
   */
  danoFilme?: 'hoje' | 'v2' | 'forte';
};

/**
 * As 6 flags do redesenho de ritmo (docs/spec-redesenho-jogabilidade.md §4) que o MOTOR lê, atrás de `ConfigPartida.ritmo`
 * (`cfgRitmo` em `src/meta/regras.ts`, no molde de `cfgMotorV2`). As outras 2 de `Regras.ritmo` (`tarja`, `provocacao`) são só
 * UI e nunca chegam aqui — `src/meta/tipos.ts` tem o conjunto completo das 8; mantenha os nomes em sincronia com ele.
 */
export type RitmoMotor = {
  /** R-6 (Vega): `ko` 100->60, `roundend` 175->90, `intro` dos rounds 2+ 90->60, `matchend` 150->90. */
  intervalos?: boolean;
  /** R-6 (Vega): o filme só no super (R-7) e no especial comum que dá KO; o resto resolve pelo dano normal, sem filme. */
  filmeRestrito?: boolean;
  /** R-7 (Vega): o golpe super (barra cheia). */
  super?: boolean;
  /** R-8 (Vega): cadeia de combo por força, até 4 golpes. */
  cadeia?: boolean;
  /** R-10 (Vega): CPU que confirma, varia e pune. */
  cpu?: boolean;
  /** R-17 (opcional, Vega+Lyra): hitstop por força, faísca e empurrão. */
  impacto?: boolean;
};

/**
 * FLUIDEZ (auditoria do motor, 24/10/2026, docs/auditoria-fidelidade-motor-2026-10-24.md §4.2): as esperas escondidas que o dono sentiu no Android.
 * Cada flag ligada tira uma espera; AUSENTE = o motor de antes, bit a bit (oráculo, lock-step e hashes do balanço). Mesmo molde de `MotorV2`/`RitmoMotor`.
 * Sem `readonly` nos campos: `fluidezDaUrl` monta o objeto campo a campo.
 */
export type FluidezMotor = {
  /** M1: o par do super (SOCO FORTE + CHUTE FORTE) não espera mais: o forte sai no mesmo tick e, se o par fecha em até 2 ticks, o golpe é PROMOVIDO a super. */
  parSuper?: boolean;
  /** M2: ataque (ou o par do super) cancela o dash (frente a partir de 4 ticks, recuo a partir de 6) e o buffer de ataque não expira durante o dash. */
  dashCancela?: boolean;
  /** M5: com `toque`, o humano não tem duplo toque de dash (o joystick oscila no limiar e vira dash por engano; a esquiva cobre). */
  semDashNoToque?: boolean;
  /** M3: buffer de 2 vagas (fila, ordem de chegada) em vez de 1 (o mais novo vence). */
  fila?: boolean;
  /** M6: SOCO FRACO + CHUTE FRACO juntos (em até 2 ticks) agarram: o golpe sai na hora e é promovido a `throw` quando o par fecha. */
  agarraoPar?: boolean;
  /** M6: com `toque`, `->` + SOCO FORTE de um humano deixa de agarrar (o joystick fica sempre empurrado). Só ligar com o botão AGARRAR no toque (`z,c`). */
  semAgarraoPorFrente?: boolean;
  /** D1: ajustes de dados atrás da flag (BAATAR: ARREMESSO DO AVARGA R 36 -> 28), para o motor sem a flag seguir idêntico. */
  dados?: boolean;
  /** O aparelho tem tela de toque (`main.ts` preenche por `temToque`): é o sinal que liga `semDashNoToque` e `semAgarraoPorFrente`. Sozinho não muda nada. */
  toque?: boolean;
};

/** Posição de um lutador num instante do filme (`antes` = no tick do contato, antes de o motor mexer; `depois` = estado final). */
export type PosFilme = { x: number; y: number; facing: 1 | -1 };

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

/**
 * APOSENTADA como opção (decisão do dono, 2026-10-21): a cinemática do especial é parte do jogo, sempre COMPLETA (CURTA com movimento reduzido do SISTEMA).
 * O tipo e o campo ficam para ler saves antigos sem quebrá-los; `ui/persistencia.ts` tira o valor da memória ao carregar (e o devolve ao gravar).
 * Preferência do jogador para a cinemática do especial (spec esquiva/cinemática, C4/B14).
 * 'completa' = animação premium inteira; 'curta' = versão reduzida; 'desligada' = sem cinemática.
 */
export const CINEMATICAS_VALIDAS = ['completa', 'curta', 'desligada'] as const;
export type PreferenciaCinematica = (typeof CINEMATICAS_VALIDAS)[number];
/** Padrão quando não há preferência salva (decisão do dono). A UI aplica; B15 pode baixar para 'curta' com reduced-motion. */
export const CINEMATICA_PADRAO: PreferenciaCinematica = 'completa';

/**
 * APOSENTADA como opção (decisão do dono, 2026-10-21): as provocações são parte do jogo, sempre ligadas. Mesmo tratamento da cinemática (save aditivo, valor ignorado).
 * Preferência do jogador para as PROVOCAÇÕES (balões antes do round e na vitória; docs/spec-provocacao-prerround-e-vitoria.md).
 * Opção PRÓPRIA, separada da cinemática do especial (decisão do dono). 'ligadas' = fala; 'desligadas' = nenhuma.
 */
export const PROVOCACOES_VALIDAS = ['ligadas', 'desligadas'] as const;
export type PreferenciaProvocacoes = (typeof PROVOCACOES_VALIDAS)[number];
/** Padrão quando não há preferência salva (decisão do dono): ligadas. */
export const PROVOCACOES_PADRAO: PreferenciaProvocacoes = 'ligadas';

/** C4 — configurações salvas. Valores padrão = DEFAULTS do protótipo. */
export type Configuracoes = {
  music: number;
  sfx: number;
  rounds: number;
  time: number;
  diff: number;
  shake: boolean;
  controles?: Record<string, string>;
  /** Ausente = sem preferência salva (a UI resolve: `CINEMATICA_PADRAO`, ou 'curta' com reduced-motion, B15). */
  cinematica?: PreferenciaCinematica;
  /** Ausente = sem preferência salva = `PROVOCACOES_PADRAO` ('ligadas'). Campo aditivo da v2 (sem bump de versão). */
  provocacoes?: PreferenciaProvocacoes;
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

/**
 * C4 v2 (expansao, E2). Chave NOVA, nao `v: 2` dentro da v1: um rollback de build le a v1 intacta em vez de
 * regravar por cima. `CHAVE_STORAGE` segue apontando para a v1 ate a E4 trocar a UI; ai ela passa a valer a V2.
 */
export const CHAVE_STORAGE_V1 = CHAVE_STORAGE;
export const CHAVE_STORAGE_V2 = 'inno-fighters-v2';

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

/**
 * Id estável do lutador. No protótipo: f1=hayato, f2=wei-long, f3=min-ji, f4=caio. Os cinco da expansão (E5) vêm depois,
 * na ordem da grade: a fila de desbloqueio (aminu, centella, camille, nila, baatar; o BAATAR deixou de ser o chefão). Esta lista é a ordem do
 * `ROSTER` e o que o save reconhece: id fora dela é "desconhecido" (build de onda anterior), ver `src/meta/progresso.ts`.
 */
export const IDS_LUTADORES = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar', 'zenon'] as const;
export type IdLutador = (typeof IDS_LUTADORES)[number];

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
  | 'win'
  /** E3: o chefe está na Dança da Águia (cena entre as fases). Nunca ocorre fora de luta de chefe. */
  | 'cena'
  /** ESQUIVA: no chão, invulnerável na janela e vulnerável na recuperação. Nunca ocorre com `ConfigPartida.esquiva` desligada. */
  | 'esquiva';

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
  // --- C3 aditivo da E3 (docs/mecanicas-e3.md §4). Valores sem a mecânica: 1, 1, false, null, 0. ---
  /**
   * Barras de vida que ainda restam (1 fora de luta de chefe). `hp`/`maxHp` descrevem a barra ATUAL; `maxHp` é o
   * `hpPorBarra` do chefe. Na troca de barra `hp` salta para cheio e `hpShown` acompanha no mesmo tick.
   */
  barras: number;
  /** Barras com que a luta começou (2 no chefão, 1 nos demais). */
  barrasMax: number;
  /** Este lutador é o chefe da luta? */
  chefe: boolean;
  /**
   * Ficha (conjunto de poses/atributos) ativa: null = a base do lutador. A render escolhe
   * `elenco[id].ch.fichas[ficha]` para `getPD` e para as cores `fire` quando não for null.
   */
  ficha: string | null;
  /** Nível de carga do MASHI (AMINU, S2): 0 = sem carga. */
  nivelCarga: 0 | 1 | 2 | 3;
  /**
   * ESQUIVA: 1 = avanço, -1 = recuo, 0 = não está esquivando (sempre 0 com a esquiva desligada). Invulnerável agora = `invuln > 0`
   * (já publicado). Opcional no tipo só para não quebrar leituras fabricadas em teste; o `Fighter` sempre publica.
   */
  esquiva?: 0 | 1 | -1;
};

/** `anel`: só o ZENON (SELO DO ARCONTE / SELO MAIOR): três elipses concêntricas, núcleo ônix e borda em brilho (render/projetil-anel.ts). */
export type EstiloProjetil = 'orb' | 'wave' | 'blade' | 'boomerang' | 'anel';

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
  /** Lançado por um ESPECIAL (golpe cujo nome começa com 's'). Ausente = projétil de golpe comum. A sessão do especial usa. */
  especial?: true;
};

export type FaseLuta =
  | 'idle'
  | 'intro'
  | 'fight'
  | 'ko'
  | 'timeover'
  | 'roundend'
  | 'matchend'
  /** E3: cena do chefe entre as barras (relógio parado, sem acertos, sem projéteis). Nunca ocorre fora de luta de chefe. */
  | 'cena-chefe';

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
 * Eventos da E3 (docs/mecanicas-e3.md §4), todos emitidos pelo motor: fase-chefe (S1a), quebra-guarda e carga (S2),
 * rebote (S3), parry e hit.contraEspecial (S4), troca-ficha (S5):
 *
 *  fase-chefe   -> etapa 'troca': a barra do chefe acabou e uma nova encheu. Sai ANTES do `hit` do mesmo tick.
 *                  Receita: flash branco + faíscas no chefe, tremor (já em `shake`), som grave de impacto, animação
 *                  de "barra nova enchendo" no HUD. Cena e ficha ainda NÃO mudaram.
 *                  etapa 'cena' (era 'danca'): começou a cena (fase 'cena-chefe', relógio parado): escurece o céu da arena, faixa.
 *                  etapa 'retomada': a cena acabou e a ficha da fase 2 está ativa: desliga a faixa e o escurecimento.
 *  parry        -> (S4) faíscas 14 brancas + rajada em (x, y) + som de bloqueio agudo + texto 'PARADA!'. Sai NO LUGAR de
 *                  block/hit (o golpe foi anulado); o atacante entra em `hit` e o defensor em golpe `sResp` (pose do fouetté).
 *  quebra-guarda-> (S2) faíscas 12 vermelhas + rajada grande em (x, y) + som de vidro/impacto + texto 'GUARDA QUEBRADA!'
 *  carga        -> (S2) a cada nível alcançado: apito crescente com tom proporcional a `nivel` + pulso de brilho
 *  rebote       -> (S3) a CENTELLA tocou a corda: poeira na parede + som de corda esticando. `x` é onde ela quicou. Durante a
 *                  ida a pose tem `flip` −1 (corrida de costas) e a volta é a voadora (flip 1).
 *  troca-ficha  -> (S5) o lutador trocou de ficha (VADIVU da NILA, em mt === S do golpe): flash + fumaça; `ficha` null = voltou
 *                  à base. A troca de fase do chefe NÃO emite este evento (ela tem `fase-chefe`). `LutadorLeitura.ficha` já vale.
 *  hit.contraEspecial -> (S4) COUP D'ARRÊT na preparação do rival: o `texto` já vem como "COUP D'ARRÊT!" no lugar de 'COUNTER!'
 *                  (`contragolpe` também é true); a render pode dar efeito próprio. Ausente nos demais acertos.
 *
 * Eventos da ESQUIVA (V1/V2, só com `ConfigPartida.esquiva` ligada) e campos da cinemática do especial (V1, sempre emitidos):
 *
 *  esquiva   -> o lutador começou uma esquiva (`dir` 1 = avanço, -1 = recuo). Poeira em (x, 7, 1), flash curto na cor `fire[0]`, swing(1).
 *  esquivou  -> um golpe/projétil teria acertado quem está na janela INVULNERÁVEL da esquiva. Uma vez por golpe (atkId) / projétil (id) por
 *               esquiva. Texto 'ESQUIVOU!' (#bfe9ff, 20) em `lutador` + uiSelect(1.4). Não dá energia nem pontos.
 *  hit/throw/armor .dano, .especial, .golpe -> cinemática: número de dano e contador de acertos do ESPECIAL (só `hit`/`throw` com `especial`;
 *               `armor` mostra o `dano` em cinza e não conta; `block`, `parry` e `quebra-guarda` de especial não mostram nada).
 *  special   -> ver `EventoSpecial`.
 *
 * O tremor de tela e o hitstop NÃO viajam no evento: ficam em `LeituraLuta.shake` /
 * `.hitstop` (o protótipo os lê/decrementa como estado).
 */
export type EventoLuta =
  | { tipo: 'swing'; lutador: IndiceLutador; golpe: 'punch' | 'kick' }
  | EventoSpecial
  | { tipo: 'deny'; lutador: IndiceLutador }
  | { tipo: 'jump'; lutador: IndiceLutador }
  | { tipo: 'land'; lutador: IndiceLutador }
  | { tipo: 'dust'; x: number; n: number; power: number }
  | { tipo: 'projectile'; lutador: IndiceLutador; x: number; y: number; style: EstiloProjetil }
  | {
      tipo: 'clash';
      x: number;
      y: number;
      /**
       * Só no escudo da GARKUWA (AMINU) que absorveu um projétil: dono do escudo e golpe (`sDown`). Ausente no choque de dois
       * projéteis. É o SUCESSO que dispara a cinemática desse golpe (`special.momento === 'sucesso'`).
       */
      lutador?: IndiceLutador;
      golpe?: string;
      quadro?: string;
      entrada?: EntradaTarja;
    }
  | {
      tipo: 'block';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      /** Sentido da rajada de bloqueio (= -facing do atacante). */
      dir: 1 | -1;
      texto: TextoFlutuante | null;
      /** Defesa de um ESPECIAL: o golpe (chave de ch.moves ou do projétil) e `especial: true`. Sem número, sem contador (B11). */
      golpe?: string;
      especial?: true;
      /** ZENON (`drenaEnergia`): energia que o golpe tirou do defensor no bloqueio (> 0) e deu ao atacante. Ausente = não houve dreno. */
      dreno?: number;
    }
  | {
      tipo: 'armor';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      snd: SomImpacto;
      texto: TextoFlutuante;
      /** Vida absorvida pela armadura neste acerto (60% do dano cheio). Mostra-se em cinza e NÃO conta como acerto. */
      dano?: number;
      golpe?: string;
      especial?: true;
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
      /** E3 (S4): contragolpe especial (ex.: COUP D'ARRÊT na preparação do rival). Ausente = comum. */
      contraEspecial?: boolean;
      /**
       * V1 (cinemática do especial): vida tirada por ESTE acerto (= hp do defensor antes − depois, já com escala de combo e
       * contragolpe; na troca de barra do chefe, o que saiu da barra que acabou). Sempre presente nos eventos do motor.
       */
      dano?: number;
      /** Acerto de especial: golpe corpo a corpo cujo nome começa com 's' (inclusive o FOUETTÉ `sResp`) ou projétil lançado por um. Ausente = golpe comum. */
      especial?: true;
      /** Golpe que acertou (chave de ch.moves do atacante; num projétil, o golpe que o lançou). */
      golpe?: string;
      /** ZENON (`drenaEnergia`): energia que este acerto tirou do defensor (> 0) e deu ao atacante. Ausente = não houve dreno. */
      dreno?: number;
      /** Nível da carga do MASHI neste acerto (1..3). Só em golpe `carga`. */
      nivelCarga?: 1 | 2 | 3;
      /** V2-3c: este acerto é o contato que abriu um FILME (vem sempre acompanhado do evento `filme`, logo depois). Ausente = acerto comum. */
      filme?: true;
      /** R-7b (`ritmo.super`): este acerto é um dos N da sequência presa do super (`acertos` cresce a cada um; o último derruba). Ausente = fora de um super. */
      super?: true;
    }
  | {
      /**
       * V2-3c (§3.4): o 1º contato limpo de um especial, resolvido por inteiro no tick (a UI só apresenta, sem chamar `game.update`).
       * Ordem dos eventos do tick: `fase-chefe` (se houver) -> `hit {filme: true}` -> `filme` -> `ko` (se houver). Não leva duração,
       * batidas nem poses: isso é da UI. Agarrão de especial (HURACANRANA, ARREMESSO DO AVARGA) emite `throw` no lugar do `hit`.
       */
      tipo: 'filme';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      /** Chave do golpe (`sFire`, `sDown`, `sFwd`, `sResp`) e a ficha do atacante (null = base). */
      golpe: string;
      ficha: string | null;
      projetil: boolean;
      nivelCarga?: 1 | 2 | 3;
      /** O que saiu da barra (mesma regra do `hit.dano`: na troca de barra do chefão, o que saiu da barra que acabou). */
      dano: number;
      contragolpe: boolean;
      ko: boolean;
      trocaDeBarra: boolean;
      final: 'derruba' | 'parede' | 'lanca';
      antes: { atacante: PosFilme; defensor: PosFilme };
      depois: { atacante: PosFilme; defensor: PosFilme };
      /** R-6 (`ritmo.filmeRestrito`): por que este filme abriu (super do R-7, ou o especial comum que deu KO). Ausente = flag desligada. */
      motivo?: 'super' | 'ko';
      /** O KO deste filme decide a LUTA (só verdadeiro com `ko: true` e o vencedor fechando `winsNeeded`); o motor sempre preenche. Ausente = não decide. */
      decideALuta?: boolean;
    }
  | {
      tipo: 'throw';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      pitch: number;
      texto: TextoFlutuante;
      /** V1: vida tirada pelo agarrão. Sempre presente nos eventos do motor. */
      dano?: number;
      /** Agarrão de ESPECIAL (ARREMESSO DO AVARGA, ABRAÇO DA ESTEPE, HURACANRANA). O arremesso comum (→+HP) não leva a marca. */
      especial?: true;
      golpe?: string;
      /** V2-3c: este agarrão abriu um FILME (o evento `filme` vem logo depois). Ausente = arremesso comum. */
      filme?: true;
    }
  | {
      tipo: 'ko';
      defensor: IndiceLutador;
      pitch: number;
      /** R-9/Íris: este KO encerra a LUTA (o vencedor do round fecha `winsNeeded`), calculado no tick do KO — `matchWinner` só sai em `endRound`, ~100 ticks depois. O motor sempre preenche; ausente = não decide. */
      decideALuta?: boolean;
    }
  | {
      tipo: 'round';
      fase: 'start' | 'fight' | 'timeover' | 'end';
      round: number;
      /** Só em 'end': vencedor do round (null = empate) e se a luta terminou. */
      vencedor?: IndiceLutador | null;
      fimDaLuta?: boolean;
    }
  | { tipo: 'perfect'; vencedor: IndiceLutador }
  | EventoFaseChefe
  | {
      tipo: 'parry';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      texto: TextoFlutuante;
      /**
       * V1: o golpe do DEFENSOR que aparou (`sFire`, a PARADE). É o SUCESSO que dispara a cinemática dele (`special.momento ===
       * 'sucesso'`), e `continua` (`sResp`, o FOUETTÉ) é o golpe que segue a mesma sessão do especial.
       */
      golpe?: string;
      continua?: string;
      quadro?: string;
      entrada?: EntradaTarja;
    }
  | {
      tipo: 'quebra-guarda';
      atacante: IndiceLutador;
      defensor: IndiceLutador;
      x: number;
      y: number;
      texto: TextoFlutuante;
      golpe?: string;
      especial?: true;
      /** ZENON: dreno de energia no bloqueio quebrado (ver `block.dreno`). */
      dreno?: number;
    }
  | { tipo: 'carga'; lutador: IndiceLutador; nivel: 1 | 2 | 3 }
  | { tipo: 'rebote'; lutador: IndiceLutador; x: number }
  | { tipo: 'troca-ficha'; lutador: IndiceLutador; ficha: string | null }
  | { tipo: 'esquiva'; lutador: IndiceLutador; dir: 1 | -1; x: number }
  | { tipo: 'esquivou'; lutador: IndiceLutador; atacante: IndiceLutador; x: number; y: number; projetil: boolean };

/** Como a tarja da cinemática entra (docs/identidade-visual-especiais.md 1.3). `lateral` = do lado de quem atacou (o padrão). */
export type EntradaTarja = 'lateral' | 'cima' | 'baixo' | 'rival';

/** Quando a cinemática de um especial dispara: ao começar o golpe (padrão) ou só no SUCESSO (PARADE e GARKUWA: o rival não pode ser avisado). */
export type MomentoCinematica = 'inicio' | 'sucesso';

/**
 * `special` (V1). O evento de sempre (gasto de energia, som) mais o que a cinemática precisa. O motor SEMPRE preenche `golpe`, `ficha` e
 * `momento`; `quadro`/`entrada` só quando `src/data/apresentacao-especiais.ts` tem registro.
 *  - `golpe`: chave de ch.moves do golpe que começou (`sFire`, `sDown`, `sFwd`). Nome, pose e cor: `chDaFicha(ch, ficha).moves[golpe]`.
 *  - `ficha`: ficha ativa de quem atacou (null = base), para `chDaFicha` (NILA em SARPA).
 *  - `momento: 'sucesso'` (PARADE, GARKUWA): a UI NÃO abre a cinemática neste evento; abre no `parry` / `clash` (com `lutador`) do mesmo golpe.
 *    A MASHI dispara ao começar a carga (`inicio`); o nível aparece em `hit.nivelCarga`.
 *  - `quadro`: nome do quadro do atlas para o recorte da tarja (troca da pose do golpe, quando o Apolo pede outra). `entrada`: ver `EntradaTarja`.
 */
export type EventoSpecial = {
  tipo: 'special';
  lutador: IndiceLutador;
  pitch: number;
  golpe?: string;
  ficha?: string | null;
  momento?: MomentoCinematica;
  quadro?: string;
  entrada?: EntradaTarja;
  /** R-7 (`ritmo.super`): este golpe é o SUPER do lutador (SOCO FORTE + CHUTE FORTE, barra cheia). Ausente = especial comum. */
  super?: true;
};

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

// ---------------------------------------------------------------------------
// C3 aditivo da E3 — campos reais (S0, Vega). Substituem o stub que a UI (E4) usava.
// ---------------------------------------------------------------------------

/** Etapas da luta de chefe (docs/mecanicas-e3.md §3). */
export type EtapaFaseChefe = 'troca' | 'cena' | 'retomada';

/**
 * Evento do chefe. `lutador` = o chefe. `barrasRestantes` = barras DEPOIS do evento (1 na troca da 2ª para a 1ª;
 * nas etapas 'cena' e 'retomada' repete o valor atual). ATENÇÃO (UI): sai uma vez por etapa, então quem só quer o
 * flash da troca de barra deve filtrar `etapa === 'troca'`.
 */
export type EventoFaseChefe = {
  tipo: 'fase-chefe';
  lutador: IndiceLutador;
  etapa: EtapaFaseChefe;
  barrasRestantes: number;
};

/**
 * @deprecated Era o stub da E4; os campos agora são obrigatórios em `LutadorLeitura`. Mantido (tudo opcional) para
 * quem ainda faz `p as LutadorLeitura & ExtensaoChefeLeitura` ou fabrica leituras parciais.
 */
export type ExtensaoChefeLeitura = Partial<Pick<LutadorLeitura, 'barras' | 'barrasMax' | 'chefe'>>;
