/** Tipos de `etapa0.mjs` (Node puro; o .d.mts existe para o TS e o vite.config.ts o importarem sem TS7016). */
export const PASTA_DA_MARCA: string;
export const ARQUIVOS_DA_MARCA: { readonly splash: string; readonly principal: string; readonly horizontal: string };
export const ARQUIVOS_DAS_FONTES: readonly string[];
export const MANIFESTO_DE_SONS: string;
export const CENARIO_PADRAO_DA_ETAPA0: string;
export const PEDACOS_DA_ETAPA0: readonly string[];
export function caminhoDoManifestoDoLutador(id: string): string;
export function arquivosFixosDaEtapa0(ids: readonly string[]): string[];
export function arquivosDaEtapa0(arquivosDoDist: readonly string[]): string[];
