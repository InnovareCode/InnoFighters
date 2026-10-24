/** Tipos do gerador (o script roda em Node puro; este arquivo só existe para o vite.config.ts importá-lo sem TS7016). */
export interface ManifestoGerado {
  versao: string;
  build: { commit: string; data: string };
  marca: string;
  revisoes: Record<string, string>;
  shell: string[];
  desligado?: true;
}
export interface OpcoesDoManifesto {
  dist: string;
  base?: string;
  build?: { commit: string; data: string };
  extras?: string[];
  desligado?: boolean;
}
export const ARQUIVO_MANIFESTO: string;
export function hashDeConteudo(buf: Uint8Array): string;
export function listarArquivos(dir: string): string[];
export function relativoABase(href: string, base: string): string | null;
export function referenciasDoHtml(html: string): { refs: string[]; entrada: string | null };
export function iconesDoManifestoDoApp(json: string, caminhoDoManifesto: string): string[];
export function gerarManifesto(o: OpcoesDoManifesto): ManifestoGerado;
export function textoDoManifesto(m: ManifestoGerado): string;
export function escreverManifesto(o: OpcoesDoManifesto): { manifesto: ManifestoGerado; arquivos: number; bytesShell: number; bytesManifesto: number };
