/* Utilitário de testes: lê o protótipo congelado e executa os TRECHOS dele que são dados/funções puras.
 * Serve de gabarito para provar que o porte não mudou comportamento. O arquivo tem uma linha de 9,3 MB
 * (ASSETS); aqui ela só é lida em memória, nunca impressa. */
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export type Obj = Record<string, any>;

export const CAMINHO_PROTOTIPO = fileURLToPath(new URL('../../prototipo/inno-fighters-artefato.html', import.meta.url));
export const TEM_PROTOTIPO = existsSync(CAMINHO_PROTOTIPO);

let cache: string[] | null = null;
export function linhasDoPrototipo(): string[] {
  cache ??= readFileSync(CAMINHO_PROTOTIPO, 'utf8').split('\n');
  return cache;
}

/** POSEDATA original, por chave do protótipo (f1..f4). */
export function posedataOriginal(): Obj {
  const linha = linhasDoPrototipo().find((l) => l.startsWith('const POSEDATA = '));
  if (!linha) throw new Error('POSEDATA nao encontrado');
  return JSON.parse(linha.slice('const POSEDATA = '.length).replace(/;\s*$/, '')) as Obj;
}

/** Texto das linhas de `inicio` (inclusive, a que CONTÉM o marcador) até `fim` (exclusive). */
export function trecho(inicio: string, fim: string): string {
  const ls = linhasDoPrototipo();
  const i = ls.findIndex((l) => l.includes(inicio));
  const j = ls.findIndex((l, k) => k > i && l.includes(fim));
  if (i < 0 || j < 0) throw new Error(`trecho nao encontrado: ${inicio} .. ${fim}`);
  return ls.slice(i, j).join('\n');
}

/** Compara estruturas com tolerância em números. Devolve a lista de diferenças (vazia = igual). */
export function diferencas(a: unknown, b: unknown, caminho = '', tol = 1e-9, out: string[] = []): string[] {
  if (typeof a === 'number' && typeof b === 'number') {
    if (!(Math.abs(a - b) <= tol)) out.push(`${caminho}: ${a} != ${b}`);
  } else if (a && b && typeof a === 'object' && typeof b === 'object') {
    const ka = Object.keys(a).sort();
    const kb = Object.keys(b).sort();
    if (ka.join('|') !== kb.join('|')) out.push(`${caminho}: chaves ${ka.join(',')} != ${kb.join(',')}`);
    for (const k of ka) if (k in b) diferencas((a as Obj)[k], (b as Obj)[k], `${caminho}.${k}`, tol, out);
  } else if (a !== b) {
    out.push(`${caminho}: ${JSON.stringify(a)} != ${JSON.stringify(b)}`);
  }
  return out;
}
