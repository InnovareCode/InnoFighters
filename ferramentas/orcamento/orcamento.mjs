/*
 * Portão de orçamento (T8, docs/orcamentos-2026-10-23.md §1 e §5). Node puro, sem dependência: lê o `dist/` DEPOIS do build
 * e compara com as metas de `orcamento.json`. Nada aqui lê `public/`, `arte-fonte/` ou o código-fonte: só o que o jogador baixa.
 *
 * O que mede (unidades: JS em kB gzip de 1000 bytes, como o Vite mostra; arquivos em MiB = 2^20 e KiB = 2^10):
 *   js-inicial     gzip do script de entrada + dos <link rel="modulepreload"> do index.html (o que bloqueia o título)
 *   js-total       gzip de TODO .js do dist, menos os pedaços de `jsExcluidos` (`escuta` só existe com ?escuta=1)
 *   atlas-peso     soma dos bytes das páginas de cada lutador (atlas.webp ou atlas-N.webp), com exceção nominal por lutador
 *   atlas-px       maior página do lutador (largura e altura, lidas do cabeçalho do WebP; cai no `tamanho` do atlas.json)
 *   cenario-peso   cada arquivo de dist/assets/cenarios
 *
 * Modo: `aviso` (padrão) imprime a tabela e sai 0 mesmo com itens estourados; `bloqueante` sai 1. A promoção é POR ITEM:
 * `bloqueantes` no orcamento.json aceita "*", um grupo ("atlas-px") ou uma chave exata ("atlas-px:wei-long").
 */
import { gzipSync } from 'node:zlib';
import { closeSync, existsSync, openSync, readdirSync, readFileSync, readSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const KB = 1000;
const KIB = 1024;
const MIB = 1024 * 1024;

/** Largura e altura de um WebP lendo só o cabeçalho (VP8 lossy, VP8L lossless, VP8X estendido). `null` se não for WebP. */
export function dimensoesWebp(buf) {
  if (buf.length < 30) return null;
  if (buf.toString('ascii', 0, 4) !== 'RIFF' || buf.toString('ascii', 8, 12) !== 'WEBP') return null;
  const tipo = buf.toString('ascii', 12, 16);
  if (tipo === 'VP8 ') {
    if (buf[23] !== 0x9d || buf[24] !== 0x01 || buf[25] !== 0x2a) return null;
    return { w: buf.readUInt16LE(26) & 0x3fff, h: buf.readUInt16LE(28) & 0x3fff };
  }
  if (tipo === 'VP8L') {
    if (buf[20] !== 0x2f) return null;
    const bits = buf.readUInt32LE(21);
    return { w: (bits & 0x3fff) + 1, h: ((bits >>> 14) & 0x3fff) + 1 };
  }
  if (tipo === 'VP8X') return { w: 1 + buf.readUIntLE(24, 3), h: 1 + buf.readUIntLE(27, 3) };
  return null;
}

function dimensoesDoArquivo(caminho) {
  const fd = openSync(caminho, 'r');
  try {
    const cab = Buffer.alloc(32);
    const lidos = readSync(fd, cab, 0, 32, 0);
    return dimensoesWebp(cab.subarray(0, lidos));
  } finally {
    closeSync(fd);
  }
}

function gzipBytes(caminho) {
  return gzipSync(readFileSync(caminho), { level: 9 }).length;
}

function listar(dir, filtro) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter(filtro).sort();
}

function arquivosJs(dir) {
  const achados = [];
  const andar = (d) => {
    for (const e of readdirSync(d, { withFileTypes: true })) {
      const p = join(d, e.name);
      if (e.isDirectory()) andar(p);
      else if (e.name.endsWith('.js')) achados.push(p);
    }
  };
  if (existsSync(dir)) andar(dir);
  return achados.sort();
}

/** Arquivos .js que o index.html carrega na largada: o <script type=module> e os modulepreload. */
export function jsIniciais(html) {
  const alvos = new Set();
  for (const tag of html.match(/<(?:script|link)\b[^>]*>/gi) ?? []) {
    const ehScript = /^<script/i.test(tag) && /type\s*=\s*["']module["']/i.test(tag);
    const ehPreload = /^<link/i.test(tag) && /rel\s*=\s*["']modulepreload["']/i.test(tag);
    if (!ehScript && !ehPreload) continue;
    const m = /(?:src|href)\s*=\s*["']([^"']+)["']/i.exec(tag);
    if (m) alvos.add(m[1].split(/[?#]/)[0].replace(/^[./]+/, '').replace(/^\//, ''));
  }
  return [...alvos].filter((a) => a.endsWith('.js'));
}

const fmtKb = (b) => `${(b / KB).toFixed(1)} kB`;
const fmtMib = (b) => `${(b / MIB).toFixed(2)} MiB`;
const fmtKib = (b) => `${(b / KIB).toFixed(0)} KiB`;

function linha(grupo, alvo, item, meta, medido, passou) {
  return { chave: alvo ? `${grupo}:${alvo}` : grupo, grupo, alvo, item, meta, medido, passou };
}

/** Mede o dist e devolve as linhas (sem decidir bloqueio). Lança Error se o dist não parece um build. */
export function medir(distDir, cfg) {
  const indexHtml = join(distDir, 'index.html');
  if (!existsSync(indexHtml)) throw new Error(`sem index.html em ${distDir}: o build rodou?`);
  const linhas = [];

  // JS inicial e total
  const iniciais = jsIniciais(readFileSync(indexHtml, 'utf8'));
  if (iniciais.length === 0) throw new Error('index.html sem <script type="module"> nem modulepreload: nao achei o JS inicial');
  let inicial = 0;
  for (const rel of iniciais) {
    const p = join(distDir, rel);
    if (!existsSync(p)) throw new Error(`o index.html cita ${rel}, que nao esta no dist`);
    inicial += gzipBytes(p);
  }
  linhas.push(linha('js-inicial', '', 'JS inicial (gzip)', `<= ${cfg.jsInicialKb} kB`, fmtKb(inicial), inicial <= cfg.jsInicialKb * KB));

  const excluidos = (cfg.jsExcluidos ?? []).map((n) => new RegExp(`^${n}[-.]`));
  let total = 0;
  for (const p of arquivosJs(distDir)) {
    const base = relative(distDir, p).split(/[\\/]/).pop();
    if (excluidos.some((r) => r.test(base))) continue;
    total += gzipBytes(p);
  }
  const semExcl = (cfg.jsExcluidos ?? []).length ? ` (sem ${cfg.jsExcluidos.join(', ')})` : '';
  linhas.push(linha('js-total', '', `JS total (gzip)${semExcl}`, `<= ${cfg.jsTotalKb} kB`, fmtKb(total), total <= cfg.jsTotalKb * KB));

  // Atlas por lutador
  const raizLutadores = join(distDir, 'assets', 'lutadores');
  for (const id of listar(raizLutadores, (n) => statSync(join(raizLutadores, n)).isDirectory())) {
    const dir = join(raizLutadores, id);
    const paginas = listar(dir, (n) => /^atlas(-\d+)?\.webp$/.test(n));
    if (paginas.length === 0) {
      linhas.push(linha('atlas-peso', id, `Atlas ${id}: peso`, 'ter paginas', 'nenhuma pagina', false));
      continue;
    }
    const bytes = paginas.reduce((s, n) => s + statSync(join(dir, n)).size, 0);
    const limMib = cfg.atlasExcecoesMiB?.[id] ?? cfg.atlasMiB;
    const nota = cfg.atlasExcecoesMiB?.[id] !== undefined ? ' (excecao nominal)' : '';
    linhas.push(linha('atlas-peso', id, `Atlas ${id}: peso${nota}`, `<= ${limMib} MiB`, `${fmtMib(bytes)} (${paginas.length} pag.)`, bytes <= limMib * MIB));

    // px: a maior pagina decide. Cabecalho do WebP primeiro; o tamanho do atlas.json (v1 e v2) so se o cabecalho nao ler.
    let dims = paginas.map((n) => dimensoesDoArquivo(join(dir, n)));
    if (dims.some((d) => d === null)) {
      let tam = null;
      try {
        const t = JSON.parse(readFileSync(join(dir, 'atlas.json'), 'utf8')).tamanho;
        if (Array.isArray(t) && t.length === 2) tam = { w: t[0], h: t[1] };
      } catch {
        /* sem atlas.json legivel */
      }
      dims = dims.map((d) => d ?? tam);
    }
    const metaPx = `<= ${cfg.atlasPaginaPx} x ${cfg.atlasPaginaPx}`;
    if (dims.some((d) => d === null)) {
      linhas.push(linha('atlas-px', id, `Atlas ${id}: pagina (px)`, metaPx, 'ilegivel', false));
      continue;
    }
    const maior = dims.reduce((a, d) => (Math.max(d.w, d.h) > Math.max(a.w, a.h) ? d : a));
    const ok = dims.every((d) => d.w <= cfg.atlasPaginaPx && d.h <= cfg.atlasPaginaPx);
    linhas.push(linha('atlas-px', id, `Atlas ${id}: pagina (px)`, metaPx, `${maior.w} x ${maior.h}`, ok));
  }

  // Cenarios
  const raizCen = join(distDir, 'assets', 'cenarios');
  for (const n of listar(raizCen, (x) => /\.(webp|jpe?g|png)$/i.test(x))) {
    const b = statSync(join(raizCen, n)).size;
    linhas.push(linha('cenario-peso', n, `Cenario ${n}`, `<= ${cfg.cenarioKiB} KiB`, fmtKib(b), b <= cfg.cenarioKiB * KIB));
  }
  return linhas;
}

/** Decide, por linha, se estourar derruba o build. `modo` global "bloqueante" promove tudo. */
export function avaliar(linhas, cfg, modo = 'aviso') {
  const bloq = cfg.bloqueantes ?? [];
  const tudo = modo === 'bloqueante' || bloq.includes('*');
  return linhas.map((l) => {
    const bloqueante = tudo || bloq.includes(l.grupo) || bloq.includes(l.chave);
    const status = l.passou ? 'OK' : bloqueante ? 'FALHA' : 'AVISO';
    return { ...l, bloqueante, status };
  });
}

export function resumo(linhas) {
  const falhas = linhas.filter((l) => l.status === 'FALHA').length;
  const avisos = linhas.filter((l) => l.status === 'AVISO').length;
  return { total: linhas.length, ok: linhas.length - falhas - avisos, avisos, falhas };
}

/** Tabela markdown `item | meta | medido | status` (serve no log e no resumo do GitHub). */
export function tabela(linhas) {
  const cab = ['item', 'meta', 'medido', 'status'];
  const corpo = linhas.map((l) => [l.item, l.meta, l.medido, l.status]);
  const larg = cab.map((c, i) => Math.max(c.length, ...corpo.map((r) => r[i].length)));
  const fmt = (r) => `| ${r.map((c, i) => c.padEnd(larg[i])).join(' | ')} |`;
  return [fmt(cab), `|${larg.map((w) => '-'.repeat(w + 2)).join('|')}|`, ...corpo.map(fmt)].join('\n');
}

export function lerConfig(caminho) {
  return JSON.parse(readFileSync(caminho, 'utf8'));
}
