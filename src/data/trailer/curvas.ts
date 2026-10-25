import { ALTURA_LETTERBOX, DURACAO_DA_ENTRADA_CURTA, TICKS_POR_COMPASSO, TICKS_POR_TEMPO, ZOOM_MAXIMO, ZOOM_MINIMO, type QuadroChave } from './tipos';

/*
 * Curvas PURAS do trailer: tudo aqui é função de números (o tick do trailer ou o tick do plano), sem estado, sem relógio e sem sorteio. O diretor (src/trailer)
 * e a validação (validar.ts) usam as mesmas funções, então "o que a validação aprova" e "o que vai à tela" não podem divergir.
 */

/** O c24.1: o único flash de tela cheia do trailer (fecha o E12 do ZENON). */
export const TICK_DO_FLASH = 23 * TICKS_POR_COMPASSO;
export const TICKS_DO_FLASH = 14;
/** O letterbox fecha no c1 (24 ticks) e abre no c24 depois do impacto da logo (24 ticks, a partir do tempo 2). */
export const TICKS_DO_LETTERBOX = 24;
export const TICK_DO_LETTERBOX_ABRIR = TICK_DO_FLASH + TICKS_POR_TEMPO;
/** Começo do plano da logo (c24.1): o impacto, a onda de choque e as brasas contam daqui. */
export const TICK_DA_LOGO = TICK_DO_FLASH;
/** A partir daqui (c25.1) o "PRESSIONE ENTER" / "TOQUE PARA JOGAR" aparece e a tecla age como no título. */
export const TICK_DO_PROMPT = TICK_DA_LOGO + TICKS_POR_COMPASSO;

const limitar = (x: number, a: number, b: number): number => Math.min(b, Math.max(a, x));

/** 0 = sem faixas, 1 = faixas de `ALTURA_LETTERBOX` px (a escala sai do fator × altura). */
export function letterboxNoTick(tick: number): number {
  if (tick < TICK_DO_LETTERBOX_ABRIR) return limitar(tick / TICKS_DO_LETTERBOX, 0, 1);
  return 1 - limitar((tick - TICK_DO_LETTERBOX_ABRIR) / TICKS_DO_LETTERBOX, 0, 1);
}
export const alturaDoLetterbox = (valor: number): number => valor * ALTURA_LETTERBOX;

/** 0..1: 1 no tick do flash, decai linear em `TICKS_DO_FLASH`. Nenhum outro flash de tela cheia existe no trailer. */
export function flashNoTick(tick: number): number {
  const d = tick - TICK_DO_FLASH;
  return d < 0 || d >= TICKS_DO_FLASH ? 0 : 1 - d / TICKS_DO_FLASH;
}

/** Alfa de um título: sobe em 6 ticks, desce em 6; 0 fora de [de, ate). */
export function alfaDoTitulo(tauNoPlano: number, de: number, ate: number): number {
  if (tauNoPlano < de || tauNoPlano >= ate) return 0;
  return limitar(Math.min((tauNoPlano - de + 1) / 6, (ate - tauNoPlano) / 6), 0, 1);
}

const curvar = (u: number, curva: QuadroChave['curva']): number => (curva === 'saida' ? 1 - (1 - u) * (1 - u) : curva === 'entrada' ? u * u : u);

/** Zoom e foco da câmera num tick do plano. Antes do 1º quadro-chave vale o 1º; depois do último, o último. O foco troca em corte seco; o zoom anda pela curva. */
export function cameraNoTick(camera: readonly QuadroChave[], tauNoPlano: number): { readonly zoom: number; readonly foco: QuadroChave['foco'] } {
  const primeiro = camera[0];
  if (!primeiro) return { zoom: 1, foco: 'meio' };
  let anterior: QuadroChave = primeiro;
  for (const q of camera) {
    if (q.t > tauNoPlano) {
      const u = q.t === anterior.t ? 1 : (tauNoPlano - anterior.t) / (q.t - anterior.t);
      return { zoom: limitar(anterior.zoom + (q.zoom - anterior.zoom) * curvar(limitar(u, 0, 1), anterior.curva), ZOOM_MINIMO, ZOOM_MAXIMO), foco: anterior.foco };
    }
    anterior = q;
  }
  return { zoom: limitar(anterior.zoom, ZOOM_MINIMO, ZOOM_MAXIMO), foco: anterior.foco };
}

// --- P0 (frio) ---
/** O raio (estilo E1) cai no tempo 3 do 1º compasso, acende o cenário e o HAYATO aparece em contraluz. */
export const TICK_DO_RAIO = 2 * TICKS_POR_TEMPO;
/** A partir daqui o HAYATO sai do `idle` para a pose de vitória (`win`). */
export const TICK_DA_VITORIA_DO_FRIO = 5 * TICKS_POR_TEMPO;
export function frioNoTick(tauNoPlano: number): { readonly pose: 'idle' | 'win'; readonly raio: number } {
  const d = tauNoPlano - TICK_DO_RAIO;
  return { pose: tauNoPlano >= TICK_DA_VITORIA_DO_FRIO ? 'win' : 'idle', raio: d < 0 ? 0 : limitar(1 - d / 60, 0, 1) };
}

// --- P8 (retratos) ---
/** Tick (do plano) em que o retrato `i` (0 a 8) entra na grade: um por tempo, o 9º na última colcheia. */
export const entradaDoRetrato = (i: number): number => (i < 8 ? i * TICKS_POR_TEMPO : 7 * TICKS_POR_TEMPO + TICKS_POR_TEMPO / 2);
export function retratosNoTick(tauNoPlano: number, n: number): { readonly entraram: number; readonly risco: number } {
  let entraram = 0;
  let ultima = -1;
  for (let i = 0; i < n; i++) {
    if (tauNoPlano >= entradaDoRetrato(i)) {
      entraram = i + 1;
      ultima = entradaDoRetrato(i);
    }
  }
  // o risco de luz varre a grade nos 10 ticks depois de cada entrada
  return { entraram, risco: ultima < 0 ? 0 : limitar(1 - (tauNoPlano - ultima) / 10, 0, 1) };
}

// --- P9 (arconte) ---
export const TICK_DO_PRIMEIRO_BRASEIRO = TICKS_POR_TEMPO;
export const TICKS_POR_BRASEIRO = TICKS_POR_TEMPO / 2;
export const BRASEIROS = 6;
/** c22.1: 1 tempo de silêncio; depois os braseiros acendem em colcheias. A entrada curta do chefão começa no c22.2 (tick 96 do plano) e dura `DURACAO_DA_ENTRADA_CURTA`. */
export const TICK_DA_ENTRADA = TICKS_POR_COMPASSO;
/** Fim da entrada curta do chefão (96 + 60): a Lyra (R-15) a toca como SOBREPOSIÇÃO, porque a luta já está andando. */
export const TICK_DO_FIM_DA_ENTRADA = TICK_DA_ENTRADA + DURACAO_DA_ENTRADA_CURTA;
/**
 * R-14: o motor anda desde o tick 0 do plano. A partitura do P9 (docs/partitura-trailer.md) tem 192 ticks de luta (o super sai no 99); com o motor parado até o 156, como era na M2, só
 * restariam 36. Antes era `TICK_DO_FIM_DA_ENTRADA`.
 */
export const TICK_DO_MOTOR_NO_ARCONTE = 0;
export function arconteNoTick(tauNoPlano: number): { readonly acesos: number; readonly entrada: boolean; readonly tickDaEntrada: number } {
  const acesos = tauNoPlano < TICK_DO_PRIMEIRO_BRASEIRO ? 0 : Math.min(BRASEIROS, Math.floor((tauNoPlano - TICK_DO_PRIMEIRO_BRASEIRO) / TICKS_POR_BRASEIRO) + 1);
  const entrada = tauNoPlano >= TICK_DA_ENTRADA && tauNoPlano < TICK_DO_FIM_DA_ENTRADA;
  return { acesos, entrada, tickDaEntrada: entrada ? tauNoPlano - TICK_DA_ENTRADA : -1 };
}
