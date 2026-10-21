import type { Elenco } from '../assets/elenco';
import type { GerenciadorDeArte } from '../assets/gerenciador';
import type { AudioSys } from '../audio/audio-sys';
import type { Configuracoes, IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';
import type { Progresso, Regras } from '../meta';
import type { Game } from '../fight/game';
import type { Efeitos, CampoDePetalas } from '../render/efeitos';
import type { RecursosDeDesenho } from '../render/mundo';
import type { Ctx } from '../render/tela';
import type { Entrada } from '../input/entrada';
import type { Ferramentas } from './ferramentas';

/** Configurações e recorde salvos (C4). `salvar()` grava no armazenamento local. */
export interface Persistencia {
  readonly settings: Configuracoes;
  /** Recorde (HISCORE). */
  hi: number;
  /** Progresso de desbloqueio (C4 v2). Troque o valor inteiro (é imutável) e chame `salvar()`. */
  prog: Progresso;
  /** Grava. Devolve false se NÃO gravou (cota, modo privado, ou v2 de um build mais novo); a UI já avisa sozinha. */
  salvar(): boolean;
}

/** O que só existe depois que a arte carregou: recursos de desenho, a luta e os efeitos dela. */
export interface Mundo {
  readonly rec: RecursosDeDesenho;
  readonly elenco: Elenco;
  /** Carga sob demanda das imagens (atlas e cenários); os dados dos lutadores já estão todos em `elenco`. */
  readonly arte: GerenciadorDeArte;
  readonly game: Game;
  readonly efeitos: Efeitos;
  /** Pétalas do fundo da luta (as dos menus ficam no Navegador). */
  readonly petalasLuta: CampoDePetalas;
}

/** Dependências comuns de todas as cenas. */
export interface Contexto {
  readonly ctx: Ctx;
  readonly f: Ferramentas;
  readonly audio: AudioSys;
  readonly persist: Persistencia;
  readonly entrada: Entrada;
  /** Sorteio dos efeitos visuais (pétalas, brasas, faíscas, tremor). Nunca o da lógica. */
  readonly rngVisual: Rng;
  /** Sorteio das decisões de interface (ordem dos rivais do ARCADE). */
  readonly rngUI: Rng;
  /**
   * Sorteio da casa ALEATÓRIA da seleção (semente + 4): fora do RNG da luta (lock-step/replay), dos efeitos visuais e do `rngUI` (ordem dos rivais).
   * Ausente (testes antigos): a cena usa o `rngUI`.
   */
  readonly sorteioDaSelecao?: Rng;
  /** O jogador pediu menos movimento (`prefers-reduced-motion`)? A casa aleatória fica num "?" fixo e o sorteio sai sem rolagem. Ausente = não. */
  readonly reduzirMovimento?: () => boolean;
  /** Regras do desbloqueio e do elenco (padrão: `REGRAS_PADRAO`; testes injetam outras, ex.: 9 ids falsos). */
  readonly regras: Regras;
  alternarTelaCheia(): void;
  /** Aparelho com tela de toque (muda o texto "PRESSIONE ENTER"). */
  temToque(): boolean;
}

export type { IdLutador };
