import type { Elenco } from '../assets/elenco';
import type { AudioSys } from '../audio/audio-sys';
import type { Configuracoes, IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';
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
  salvar(): void;
}

/** O que só existe depois que a arte carregou: recursos de desenho, a luta e os efeitos dela. */
export interface Mundo {
  readonly rec: RecursosDeDesenho;
  readonly elenco: Elenco;
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
  alternarTelaCheia(): void;
  /** Aparelho com tela de toque (muda o texto "PRESSIONE ENTER"). */
  temToque(): boolean;
}

export type { IdLutador };
