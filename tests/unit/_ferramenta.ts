import { fileURLToPath, pathToFileURL } from 'node:url';

/**
 * Importa um script de `ferramentas/` (.mjs puro, sem tipos). O import dinâmico por URL absoluta evita o TS7016
 * (módulo sem declaração) sem criar .d.ts para ferramentas que rodam direto no Node, sem build.
 */
export async function carregarFerramenta<T>(relativo: string): Promise<T> {
  const caminho = fileURLToPath(new URL(`../../${relativo}`, import.meta.url));
  return (await import(/* @vite-ignore */ pathToFileURL(caminho).href)) as T;
}
