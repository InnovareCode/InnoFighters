/*
 * D4 (docs/desempenho-android-2026-10-24.md §11.5): `ctx.measureText` devolve um objeto `TextMetrics` do NAVEGADOR (não do heap de JS), e esses só morrem na
 * coleta MAIOR. Medido: 15 chamadas por quadro em página parada subiram as coletas maiores de 2 para 5 em 30 s a 4x; o lixo de JS comum (20 KB/quadro)
 * não subiu nenhuma. A seleção media 16 textos por quadro, o menu 8, e o resultado de uma medida só muda com a fonte/espaçamento/texto: guardar.
 */
export interface Medidor {
  font: string;
  measureText(s: string): { readonly width: number };
}

const guardadas = new Map<string, number>();
const LIMITE = 1500;

/** Largura do texto na fonte atual do contexto (a mesma que `measureText(s).width`), medida uma vez por (fonte, espaçamento, texto). */
export function larguraDoTexto(ctx: Medidor, texto: string): number {
  const espaco = (ctx as { letterSpacing?: string }).letterSpacing ?? '';
  const chave = `${ctx.font}|${espaco}|${texto}`;
  const guardada = guardadas.get(chave);
  if (guardada !== undefined) return guardada;
  const w = ctx.measureText(texto).width;
  if (guardadas.size >= LIMITE) guardadas.clear();
  guardadas.set(chave, w);
  return w;
}

/** A fonte que chega depois (webfont) muda as medidas: esquece tudo. Só os testes e o carregador de fontes precisam chamar. */
export function esquecerMedidas(): void {
  guardadas.clear();
}

if (typeof document !== 'undefined' && document.fonts && typeof document.fonts.addEventListener === 'function') {
  document.fonts.addEventListener('loadingdone', esquecerMedidas);
}
