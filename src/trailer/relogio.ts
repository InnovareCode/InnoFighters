import { DURACAO_TOTAL } from '../data/trailer/tipos';

/*
 * O relógio do trailer (spec §4.5). O ESTADO do trailer é função do tick; o relógio só decide QUAL tick vai à tela:
 *  - sem áudio rodando (testes `?manual=1`, áudio bloqueado ou mudo): o tick do laço (`Navegador.update`), de 1 em 1;
 *  - com a música tocando, o relógio do `AudioContext` manda: `tickAlvo = floor((ctx.currentTime - t0) * 60)`. Quadros perdidos no celular não
 *    desalinham corte e batida da música.
 * Funções PURAS: a cena passa os números; nada aqui lê `performance.now` nem `AudioContext`.
 */

export const TICKS_POR_SEGUNDO = 60;
/** Quantos ticks a cena avança por chamada para alcançar o relógio do áudio; acima disso o motor é pulado sem desenhar. */
export const MAX_TICKS_POR_CHAMADA = 6;

/** O tick que o relógio do áudio pede agora. `posicaoDaAbertura` = segundos desde o compasso 0 da música (`AudioSys.posicaoDaAbertura()`); null = sem música. */
export function tickAlvoDoAudio(posicaoDaAbertura: number | null): number | null {
  if (posicaoDaAbertura === null || !Number.isFinite(posicaoDaAbertura)) return null;
  return Math.min(DURACAO_TOTAL, Math.max(0, Math.floor(posicaoDaAbertura * TICKS_POR_SEGUNDO)));
}

/**
 * Quantos ticks avançar nesta chamada. Sem áudio: 1 (o laço manda). Com áudio: os que faltam para o alvo, nunca voltando. `pular` = true quando o atraso
 * passa de `MAX_TICKS_POR_CHAMADA` (a cena avança o motor sem desenhar os quadros do meio).
 */
export function ticksAAvancar(tickAtual: number, alvoDoAudio: number | null): { readonly ticks: number; readonly pular: boolean } {
  if (alvoDoAudio === null) return { ticks: 1, pular: false };
  const falta = alvoDoAudio - tickAtual;
  if (falta <= 0) return { ticks: 0, pular: false };
  return { ticks: falta, pular: falta > MAX_TICKS_POR_CHAMADA };
}

/**
 * A música entra no PRÓXIMO compasso (o iOS resolve o `resume()` depois do 1º quadro): devolve o compasso (0-based) em que a música começa e quantos
 * segundos faltam até lá, no relógio do laço. A cena passa `emSegundos` a `tocarAbertura`, que ancora o `t0` ali.
 */
export function entradaDaMusica(tickAtual: number, ticksPorCompasso = 96): { readonly compasso: number; readonly emSegundos: number } {
  const compasso = Math.floor(tickAtual / ticksPorCompasso) + 1;
  return { compasso, emSegundos: (compasso * ticksPorCompasso - tickAtual) / TICKS_POR_SEGUNDO };
}
