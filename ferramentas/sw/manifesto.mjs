/*
 * Manifesto de revisões do service worker (T7). Node puro, sem dependência. Roda dentro do build (plugin em vite.config.ts) e sozinho:
 *   node ferramentas/sw/cli.mjs [--dist=dist] [--base=/] [--desligado]
 *
 * Lê o `dist/` FINAL (já com o `public/` copiado) e escreve `dist/sw-manifesto.js`, que o `sw.js` carrega com importScripts:
 *  - revisoes: cada arquivo (menos .map, index.html, version.json, sw.js, sw-manifesto.js) -> hash do CONTEÚDO. Os arquivos de `public/` não têm hash no nome,
 *    então é este hash que diz ao SW que a arte mudou. Arquivo com hash no nome também entra (uniforme, e a chave de cache fica por conteúdo).
 *  - shell: o que o `index.html` do build puxa (script de entrada, modulepreload, CSS, preload de fonte/imagem, ícones, manifest do app) + os ícones do manifest do app.
 *    Sai do próprio HTML construído: boot e SW não divergem. (Quando a T4 exportar a lista da "etapa 0", ela entra por `extras`.)
 *  - versao: commit + resumo de revisoes/shell. Muda se QUALQUER arquivo muda; é o nome do cache do shell.
 * O sw.js muda de bytes sempre que o manifesto muda (importScripts entra na checagem de atualização do navegador), então arte nova = SW novo.
 */
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

export const ARQUIVO_MANIFESTO = 'sw-manifesto.js';
/** Fora das revisões: o SW não os serve do cache de revisão (HTML pertence à versão; version.json vai sempre à rede; os dois do SW são do navegador). */
const EXCLUIDOS = new Set(['index.html', 'version.json', 'sw.js', ARQUIVO_MANIFESTO, '404.html']);

export const hashDeConteudo = (buf) => createHash('sha256').update(buf).digest('hex').slice(0, 16);

/** Todos os arquivos de `dir` (caminhos com `/`, relativos a `dir`), ordenados, sem os .map e sem os excluídos. */
export function listarArquivos(dir) {
  const achados = [];
  const andar = (d) => {
    for (const nome of readdirSync(d).sort()) {
      const abs = join(d, nome);
      if (statSync(abs).isDirectory()) andar(abs);
      else achados.push(relative(dir, abs).split(sep).join('/'));
    }
  };
  andar(dir);
  return achados.filter((c) => !c.endsWith('.map') && !EXCLUIDOS.has(c));
}

/** Caminho relativo à base a partir de um href do HTML ('/x', '/Base/x', './x', 'x'); null se for de outra origem ou fora da base. */
export function relativoABase(href, base) {
  const raiz = 'http://escopo.invalido';
  const baseAbs = new URL(base, `${raiz}/`);
  const u = new URL(href, baseAbs);
  if (u.origin !== raiz) return null;
  if (!u.pathname.startsWith(baseAbs.pathname)) return null;
  return decodeURIComponent(u.pathname.slice(baseAbs.pathname.length)) || null;
}

/** hrefs/srcs que a PRIMEIRA tela do build precisa. Lê só o que o Vite escreve (atributos entre aspas duplas). */
export function referenciasDoHtml(html) {
  const refs = [];
  let entrada = null;
  for (const m of html.matchAll(/<script\b[^>]*>/gi)) {
    const tag = m[0];
    const src = /\bsrc="([^"]+)"/i.exec(tag)?.[1];
    if (src && /\btype="module"/i.test(tag)) {
      refs.push(src);
      entrada ??= src;
    }
  }
  for (const m of html.matchAll(/<link\b[^>]*>/gi)) {
    const tag = m[0];
    const rel = /\brel="([^"]+)"/i.exec(tag)?.[1]?.toLowerCase() ?? '';
    const href = /\bhref="([^"]+)"/i.exec(tag)?.[1];
    if (!href) continue;
    if (/(^|\s)(modulepreload|stylesheet|preload|icon|apple-touch-icon|manifest)(\s|$)/.test(rel)) refs.push(href);
  }
  return { refs, entrada };
}

/** Os ícones do manifest do app (relativos ao manifest). */
export function iconesDoManifestoDoApp(json, caminhoDoManifesto) {
  const saida = [];
  try {
    const m = JSON.parse(json);
    const dir = caminhoDoManifesto.includes('/') ? caminhoDoManifesto.slice(0, caminhoDoManifesto.lastIndexOf('/') + 1) : '';
    for (const ic of Array.isArray(m.icons) ? m.icons : []) {
      if (typeof ic?.src === 'string') saida.push(new URL(ic.src, `http://x/${dir}`).pathname.slice(1));
    }
  } catch {
    /* manifest do app ilegível: o shell fica sem os ícones, o resto vale */
  }
  return saida;
}

/**
 * Monta o objeto do manifesto a partir de um dist pronto.
 * @param {{dist: string, base?: string, build?: {commit: string, data: string}, extras?: string[], desligado?: boolean}} o
 */
export function gerarManifesto({ dist, base = '/', build = { commit: 'dev', data: '' }, extras = [], desligado = false }) {
  if (!existsSync(join(dist, 'index.html'))) throw new Error(`sw: ${join(dist, 'index.html')} nao existe (rode o build antes)`);
  const revisoes = {};
  for (const c of listarArquivos(dist)) revisoes[c] = hashDeConteudo(readFileSync(join(dist, c)));

  const html = readFileSync(join(dist, 'index.html'), 'utf8');
  const { refs, entrada } = referenciasDoHtml(html);
  if (!entrada) throw new Error('sw: o index.html do build nao tem <script type="module"> de entrada');
  const marca = relativoABase(entrada, base);
  if (!marca || !(marca in revisoes)) throw new Error(`sw: o script de entrada (${entrada}) nao esta no dist`);

  const shell = new Set();
  const pedidos = refs.map((r) => relativoABase(r, base));
  for (const c of pedidos) if (c && c in revisoes) shell.add(c);
  const arquivoManifestoApp = pedidos.find((c) => c && /\.webmanifest$/.test(c));
  if (arquivoManifestoApp && arquivoManifestoApp in revisoes) {
    for (const c of iconesDoManifestoDoApp(readFileSync(join(dist, arquivoManifestoApp), 'utf8'), arquivoManifestoApp)) if (c in revisoes) shell.add(c);
  }
  for (const c of extras) {
    if (!(c in revisoes)) throw new Error(`sw: extra do shell "${c}" nao esta no dist`);
    shell.add(c);
  }
  const lista = [...shell].sort();
  const resumo = hashDeConteudo(JSON.stringify([revisoes, lista, marca])).slice(0, 8);
  return { versao: `${build.commit}.${resumo}`, build: { commit: build.commit, data: build.data }, marca, revisoes, shell: lista, ...(desligado ? { desligado: true } : {}) };
}

/** Texto de `sw-manifesto.js` (script clássico: o sw.js o lê de `self.__INNO_MANIFESTO__`). */
export const textoDoManifesto = (m) => `self.__INNO_MANIFESTO__=${JSON.stringify(m)};\n`;

/** Gera e grava `dist/sw-manifesto.js`. Devolve o manifesto e um resumo para o log do build. */
export function escreverManifesto(opcoes) {
  const m = gerarManifesto(opcoes);
  const texto = textoDoManifesto(m);
  writeFileSync(join(opcoes.dist, ARQUIVO_MANIFESTO), texto);
  const tamanho = (c) => statSync(join(opcoes.dist, c)).size;
  const bytesShell = m.shell.reduce((s, c) => s + tamanho(c), 0);
  return { manifesto: m, arquivos: Object.keys(m.revisoes).length, bytesShell, bytesManifesto: Buffer.byteLength(texto) };
}
