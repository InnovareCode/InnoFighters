import type { IdLutador } from '../../core/contratos';
import type { IdCenario } from '../tipos';

/*
 * Tipos dos DADOS do trailer de abertura (docs/spec-trailer-abertura.md §7.2). Nenhum import de `render/`, `ui/` ou `audio/`: o roteiro é dado puro; o
 * `DiretorDoTrailer` (src/trailer) o transforma em quadros e a validação (validar.ts) o confere quando o pedaço do trailer carrega.
 *
 * Unidades: TICK do trailer = 1/60 s. 1 tempo = 24 ticks, 1 compasso = 96 ticks, 25 compassos = 2400 ticks = 40 s a 150 BPM. "Tick do motor" (nas tomadas)
 * é o número de chamadas a `Game.update` desde o `setup` (não o `Game.tick`, que não conta o hitstop): é a unidade que o diretor controla.
 */

export const PLANOS_ID = ['P0', 'P1', 'C1', 'P2', 'C2', 'P3', 'P4', 'C3', 'P5', 'P6', 'P7', 'P8', 'P9', 'P10'] as const;
export type IdPlano = (typeof PLANOS_ID)[number];

export const BPM = 150;
export const TICKS_POR_TEMPO = 24;
export const TEMPOS_POR_COMPASSO = 4;
export const TICKS_POR_COMPASSO = TICKS_POR_TEMPO * TEMPOS_POR_COMPASSO;
export const COMPASSOS_TOTAIS = 25;
export const DURACAO_TOTAL = COMPASSOS_TOTAIS * TICKS_POR_COMPASSO;
/** Limite do pré-rolar do motor (spec §4.2/§7.2): custo de CPU do plano. */
export const INICIO_MAXIMO = 2400;
/** Faixa do letterbox 2,39:1 em px lógicos (em cima e embaixo). */
export const ALTURA_LETTERBOX = 69;
/** Zoom de apresentação: acima de 1,35 aparecem as franjas magenta e os defeitos de recorte da arte. */
export const ZOOM_MINIMO = 1;
export const ZOOM_MAXIMO = 1.35;
/** Título de cartão: no máximo 18 caracteres, caixa alta. */
export const TITULO_MAX = 18;
/** A placa do lutador fica no máximo 1,5 s na tela. */
export const PLACA_MAX_TICKS = 90;

/** Duração da tarja da cinemática do especial (iguais a `DURACAO_CURTA/COMPLETA` de render/cinematica.ts; um teste confere). */
export const DURACAO_DA_CINE = { curta: 20, completa: 48 } as const;
/** Duração da entrada dramática CURTA do chefão (igual a `DURACAO_ENTRADA_CURTA` de render/entrada-chefe.ts; um teste confere). */
export const DURACAO_DA_ENTRADA_CURTA = 60;

/** Semente do RNG do `Game` do trailer: CONSTANTE e sem uso (os dois lutadores são humanos; só a CPU sorteia), mas o `Game` exige um RNG. */
export const SEMENTE_DO_MOTOR = 0;

/** Ajustes de partida do trailer: `shake: true` SEMPRE, para a impressão do motor não depender da preferência do jogador. */
export const AJUSTES_DO_TRAILER = { rounds: 1, time: 99, shake: true } as const;

export type ChaveDeTexto = 'dez-mestres' | 'dez-nacoes' | 'um-torneio' | 'cinco-guardioes' | 'quem-chega-ao-topo' | 'pressione-enter' | 'toque-para-jogar';

/** O modo do FILME no trailer: o trailer pede o modo e não segue a regra do jogo (1ª vez = COMPLETO). */
export type ModoDoFilmeNoTrailer = 'curta' | 'completa';

/** Duração da tarja do SUPER (igual a `DURACAO_TARJA_SUPER` de render/tarja-super.ts; um teste confere). Congela o motor. */
export const DURACAO_DA_TARJA_SUPER = 30;

/** Um golpe que o plano EXIGE da luta. A partitura (partitura.ts) diz em que tick do motor ele cai; o CI confere que cai ali. */
export interface BatidaPedida {
  /**
   * `golpe`: acerto comum (`hit` do atacante, com `golpe` se pedido); `especial`: acerto de especial; `contra`: contragolpe especial (COUP D'ARRÊT);
   * `carga`: acerto de golpe carregado (MASHI); `block`: o golpe do `lutador` (atacante) foi DEFENDIDO (evento `block`); `super`: o SUPER do `lutador` acerta
   * (o `hit` da sequência presa, com `super: true`); `ko`: o rival cai.
   */
  readonly tipo: 'golpe' | 'especial' | 'contra' | 'carga' | 'block' | 'super' | 'ko';
  /** Quem dá o golpe (0 = P1/c1, 1 = P2/c2). Em `block`, é o ATACANTE (o defensor é o outro). */
  readonly lutador: 0 | 1;
  /** Chave do golpe (`sFire`, `sDown`, `sFwd`, `sResp`, `lp`, `hk`...), se o plano exige um específico. Ausente = qualquer. */
  readonly golpe?: string;
  /** Nível da carga (só em `carga`). Padrão 3. */
  readonly nivel?: 1 | 2 | 3;
  /** APOSENTADO no trailer (a tarja do especial comum saiu; só o super tem tarja, e ela é automática em `tipo: 'super'`). Fica para os testes da tarja antiga. */
  readonly cine?: 'curta' | 'completa';
  /** Câmera lenta a partir do acerto: o motor anda 1 tick a cada `fator` ticks do trailer, por `ticks` ticks do trailer (no máximo 24). */
  readonly lenta?: { readonly fator: 2 | 3 | 4; readonly ticks: number };
  /** Modo do FILME que esta batida abre (só no `super`/`ko`): o trailer pede, não segue a regra do jogo. Ausente = `curta`. */
  readonly filme?: ModoDoFilmeNoTrailer;
  /** Tick do PLANO em que o acerto deve cair (a câmera lenta e os congelamentos já na conta) e a tolerância. Padrão: o meio do plano ± 60. */
  readonly alvo?: number;
  readonly folga?: number;
}

/** Uma batida da tomada: em que update do motor ela acontece (a partitura declara; o CI confere que o motor a produz ali). */
export interface BatidaGravada {
  /** Índice em `pede`. */
  readonly pedida: number;
  /** Chamadas a `update` quando o acerto saiu. */
  readonly tickMotor: number;
  /** Chamadas a `update` quando o golpe COMEÇOU (evento `special`); igual a `tickMotor` nos tipos sem golpe. É onde abre a tarja do super. */
  readonly tickInicio: number;
}

/**
 * As entradas dos DOIS lutadores, um número por update desde o 1º update de LUTA (`PRIMEIRO_UPDATE_DE_LUTA`): máscara de bits (`BIT`) com a direção RELATIVA ao
 * rival (frente/trás), que o `FonteEntradas` traduz para esquerda/direita pelo `facing` do lutador naquele tick.
 */
export interface InputsDaTomada {
  readonly p1: readonly number[];
  readonly p2: readonly number[];
}

export interface Tomada {
  /** Chamadas a `update` antes do 1º quadro do plano (a intro de 90 mais a pré-rolagem). */
  readonly inicio: number;
  readonly batidas: readonly BatidaGravada[];
  /** Hash do estado do `Game` ao fim do plano (o CI confere). */
  readonly impressao: string;
  /** A partitura compilada: as entradas de P1 e P2, tick a tick. Os dois lutadores são HUMANOS (sem CPU e sem RNG). */
  readonly inputs: InputsDaTomada;
  /** Energia dos dois no 1º update (padrão [0, 0]). O P9 começa com [0, 100] para o ZENON ter o super. */
  readonly energia?: readonly [number, number];
  /** Vida dos dois, em % da barra, no 1º update (padrão cheia). Só o P9 usa: o super do ZENON precisa matar para o filme abrir (`filmeRestrito`). */
  readonly vida?: readonly [number, number];
}

export type TomadasDoTrailer = Readonly<Partial<Record<IdPlano, Tomada>>>;

export interface QuadroChave {
  /** Tick do plano em que o quadro-chave vale. */
  readonly t: number;
  readonly zoom: number;
  /** Onde a câmera ancora o zoom: no meio dos dois, ou em um deles. Troca de foco = corte seco. */
  readonly foco: 'meio' | 'p1' | 'p2';
  /** Como anda DESTE quadro-chave até o próximo. Padrão `linear`. */
  readonly curva?: 'linear' | 'saida' | 'entrada';
}

export type Titulo =
  | { readonly estilo: 'cartao'; readonly chave: ChaveDeTexto; readonly de: number; readonly ate: number }
  | { readonly estilo: 'placa'; readonly lutador: IdLutador; readonly de: number; readonly ate: number };

interface Base {
  readonly id: IdPlano;
  readonly compassos: number;
  readonly titulos?: readonly Titulo[];
}

export type Plano =
  | (Base & { readonly tipo: 'frio'; readonly lutador: IdLutador; readonly stage: IdCenario; readonly camera: readonly QuadroChave[] })
  | (Base & { readonly tipo: 'luta'; readonly c1: IdLutador; readonly c2: IdLutador; readonly stage: IdCenario; readonly pede: readonly BatidaPedida[]; readonly camera: readonly QuadroChave[] })
  | (Base & { readonly tipo: 'cartao'; readonly fundo: 'preto' | IdCenario })
  | (Base & { readonly tipo: 'retratos'; readonly ordem: readonly IdLutador[] })
  | (Base & { readonly tipo: 'arconte'; readonly c1: IdLutador; readonly c2: 'zenon'; readonly stage: IdCenario; readonly pede: readonly BatidaPedida[]; readonly camera: readonly QuadroChave[] })
  | (Base & { readonly tipo: 'logo' });

export type PlanoComMotor = Extract<Plano, { tipo: 'luta' | 'arconte' }>;
export const temMotor = (p: Plano): p is PlanoComMotor => p.tipo === 'luta' || p.tipo === 'arconte';

/** A versão estática (movimento reduzido, spec §6.3): quadros parados que trocam por dissolução. */
export interface QuadroEstatico {
  /** Lutadores desenhados em `win` (só quem tem arte residente: a vitrine). */
  readonly lutadores: readonly IdLutador[];
  /** Quem aparece só pelo RETRATO (sempre residente): os guardiões e o ZENON. */
  readonly retratos?: readonly IdLutador[];
  readonly stage: IdCenario;
  /** Título de cartão sobre o quadro. */
  readonly titulo?: ChaveDeTexto;
  /** O último quadro é a logo parada mais "PRESSIONE ENTER". */
  readonly logo?: true;
}
export interface EstaticaDef {
  readonly quadros: readonly QuadroEstatico[];
  /** Ticks de cada quadro (1 compasso). */
  readonly ticksPorQuadro: number;
  /** Ticks da dissolução entre quadros. */
  readonly dissolucao: number;
  /** Compassos (0-based) do arranjo da abertura que a música da versão estática toca, em ordem (c1, c2, c8, c13, c21, c24). */
  readonly compassosDaMusica: readonly number[];
}

export interface RoteiroDoTrailer {
  readonly bpm: typeof BPM;
  readonly ticksPorTempo: typeof TICKS_POR_TEMPO;
  /** Semente do RNG VISUAL do trailer (efeitos, pétalas): constante do roteiro, nunca a da sessão. */
  readonly sementeVisual: number;
  readonly planos: readonly Plano[];
  readonly estatica: EstaticaDef;
}

/** O que se pede à arte (lutadores e cenários) para um plano. */
export interface PedidoDeArte {
  readonly lutadores: readonly IdLutador[];
  readonly cenarios: readonly IdCenario[];
}

export interface PlacaDeTexto {
  readonly nome: string;
  readonly pais: string;
  readonly epiteto?: string;
}
