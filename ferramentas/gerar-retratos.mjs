#!/usr/bin/env node
/**
 * Gera `retrato.webp` + `retrato.json` de cada lutador a partir do atlas (docs/plano-expansao.md 1.4). WebP desde a T6 do
 * orcamento de 2026-10-23: os 10 PNG somavam 0,57 MiB e a meta e <= 0,35 MiB no conjunto.
 *
 * Por que existe: a seleção e o HUD desenhavam o rosto recortando o atlas INTEIRO (milhões de pixels) só para
 * mostrar 88-120 px. Com carga sob demanda, a seleção não pode exigir todos os atlas na memória; o retrato é um
 * arquivo pequeno por lutador.
 *
 * "Sem mudar a imagem": o recorte do jogo é fracionário (o `rosto` do manifesto é fracionário). Então o retrato
 * guarda um recorte INTEIRO com 2 px de margem (pixels idênticos aos do atlas, sem reamostrar) e o `retrato.json`
 * guarda o recorte fracionário dentro dele. O jogo desenha `drawImage(retrato, fx, fy, 190, 190, ...)`: a mesma
 * amostragem de antes, só que lendo um arquivo pequeno.
 *
 * O Node não decodifica WebP, então o Chromium que o Playwright já instala (devDependency) decodifica o atlas e entrega os
 * pixels; o WebP sai do `sharp` (devDependency do pipeline de sprites) em modo QUASE sem perdas (nearLossless 80): o alfa
 * e o traço ficam como no atlas (erro de alfa <= 1 em 255) e os 10 juntos ficam em ~0,3 MiB. `codificarPng` (sem perdas)
 * continua exportado: serve para ler/comparar pixels crus nos testes.
 *
 * Além do sidecar `retrato.json`, atualiza o campo `retrato` do `atlas.json` (o jogo lê o campo primeiro e só cai no
 * sidecar sem ele; os dois TÊM de dizer o mesmo). Só esse campo muda; o resto do atlas nunca é reescrito aqui.
 *
 * Uso:  node ferramentas/gerar-retratos.mjs [--so <id>] [--verificar] [--saida <pasta>]
 *   --verificar  não grava: regenera em memória e sai com código 1 se o que está no disco diferir.
 */
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync } from 'node:zlib';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..');
/** Lado do retrato no atlas (LADO_RETRATO de src/data/atlas.ts). */
export const LADO = 190;
const MARGEM = 2;
/** Arquivo do retrato (T6 do orçamento: era retrato.png). */
export const ARQUIVO_RETRATO = 'retrato.webp';
/** Parâmetros do WebP do retrato: quase sem perdas (alfa preservado), esforço máximo (o arquivo é pequeno). */
export const OPCOES_WEBP = { nearLossless: true, quality: 80, effort: 6 };

/** Altura do idle0 no atlas dos lutadores de tamanho normal (a janela do retrato é LADO nesta escala). */
const ALTURA_REF_NORMAL = 410;

/** Lado da janela do retrato num atlas: LADO, ou LADO x (alturaRef / 410) nos maiores (BAATAR, 525): mesmo enquadramento. */
export function ladoDoRetrato(manifesto) {
  return Math.round((LADO * Math.max(manifesto.alturaRef ?? ALTURA_REF_NORMAL, ALTURA_REF_NORMAL)) / ALTURA_REF_NORMAL);
}

/** Quadro do rosto (guard ?? idle0). */
const quadroDoRosto = (manifesto) => manifesto.quadros.guard ?? manifesto.quadros.idle0;

/** Recorte [x, y, w, h] (fracionário) do rosto no atlas: o mesmo `head` de montarLutador (guard ?? idle0). */
export function recorteDoRosto(manifesto) {
  const q = quadroDoRosto(manifesto);
  if (!q) throw new Error(`${manifesto.lutador}: sem guard/idle0`);
  const [rx, ry] = q.rosto ?? [0, 0];
  const lado = ladoDoRetrato(manifesto);
  return [q.x + rx - lado / 2, q.y + ry - lado / 2, lado, lado];
}

/** Retângulo inteiro (com margem) que contém o recorte, e o recorte relativo a ele. */
export function janelaInteira([hx, hy, w, h], largura, altura) {
  const x0 = Math.max(0, Math.floor(hx) - MARGEM);
  const y0 = Math.max(0, Math.floor(hy) - MARGEM);
  const x1 = Math.min(largura, Math.ceil(hx + w) + MARGEM);
  const y1 = Math.min(altura, Math.ceil(hy + h) + MARGEM);
  return { x0, y0, w: x1 - x0, h: y1 - y0, recorte: [hx - x0, hy - y0, w, h] };
}

const tabelaCrc = Array.from({ length: 256 }, (_, n) => {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
const crc32 = (b) => {
  let c = 0xffffffff;
  for (const x of b) c = tabelaCrc[(c ^ x) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};
const bloco = (tipo, dados) => {
  const t = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
  const len = Buffer.alloc(4);
  len.writeUInt32BE(dados.length);
  const sum = Buffer.alloc(4);
  sum.writeUInt32BE(crc32(t));
  return Buffer.concat([len, t, sum]);
};

/** PNG RGBA de 8 bits, sem perdas, a partir de pixels RGBA (Buffer de w*h*4). */
export function codificarPng(rgba, largura, altura) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const linhas = Buffer.alloc((1 + largura * 4) * altura);
  for (let y = 0; y < altura; y++) rgba.copy(linhas, y * (1 + largura * 4) + 1, y * largura * 4, (y + 1) * largura * 4);
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(linhas, { level: 9 })),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

/** WebP do retrato a partir de pixels RGBA crus (w*h*4), com as OPCOES_WEBP. O `sharp` é injetado para o módulo carregar sem ele. */
export async function codificarWebp(sharp, rgba, largura, altura) {
  return sharp(rgba, { raw: { width: largura, height: altura, channels: 4 } }).webp(OPCOES_WEBP).toBuffer();
}

/**
 * Troca SÓ o bloco `"retrato": { ... }` do texto do atlas.json (indentação de 2, como o pipeline escreve), sem reescrever o resto:
 * alguns atlas (WEI LONG) têm formatação à mão e um JSON.stringify do arquivo inteiro apagaria isso num diff enorme.
 * Confere que o texto novo, lido de volta, só difere do antigo no campo `retrato`.
 */
export function trocarCampoRetrato(texto, retrato, id = '?') {
  const bloco = /"retrato":\s*\{[^{}]*"recorte":\s*\[[^\]]*\]\s*\}/;
  if (!bloco.test(texto)) throw new Error(`${id}: atlas.json sem o bloco "retrato" no formato esperado`);
  const novo = `"retrato": ${JSON.stringify(retrato, null, 2).replace(/\n/g, '\n  ')}`;
  const saida = texto.replace(bloco, () => novo);
  const antes = JSON.parse(texto);
  const depois = JSON.parse(saida);
  if (JSON.stringify({ ...antes, retrato: null }) !== JSON.stringify({ ...depois, retrato: null }) || JSON.stringify(depois.retrato) !== JSON.stringify(retrato)) {
    throw new Error(`${id}: a troca do campo retrato mexeu em mais que ele`);
  }
  return saida;
}

/** Largura e altura de um PNG (lidas do IHDR). */
export function dimensoesPng(buf) {
  if (buf.readUInt32BE(0) !== 0x89504e47) throw new Error('nao e PNG');
  return [buf.readUInt32BE(16), buf.readUInt32BE(20)];
}

function argumentos(argv) {
  const a = { so: null, verificar: false, saida: join(RAIZ, 'public', 'assets', 'lutadores') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--so') a.so = argv[++i];
    else if (argv[i] === '--verificar') a.verificar = true;
    else if (argv[i] === '--saida') a.saida = resolve(argv[++i]);
  }
  return a;
}

async function principal() {
  const args = argumentos(process.argv.slice(2));
  const { chromium } = await import('@playwright/test');
  const sharp = (await import('sharp')).default;
  const ids = (await import('node:fs')).readdirSync(args.saida, { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name).filter((id) => !args.so || id === args.so);
  const navegador = await chromium.launch();
  const pagina = await navegador.newPage();
  let diferentes = 0;
  try {
    for (const id of ids) {
      const dir = join(args.saida, id);
      const jsonAtlas = join(dir, 'atlas.json');
      if (!existsSync(jsonAtlas)) continue;
      const m = JSON.parse(readFileSync(jsonAtlas, 'utf8'));
      // atlas C1 v2: o quadro do rosto pode estar em outra página (idle0 do BAATAR está na página 1)
      const arquivoAtlas = m.imagem ?? m.imagens?.[quadroDoRosto(m)?.p ?? 0];
      const bytes = readFileSync(join(dir, arquivoAtlas));
      const mime = arquivoAtlas.endsWith('.png') ? 'image/png' : 'image/webp';
      const [hx, hy, w, h] = recorteDoRosto(m);
      const j = janelaInteira([hx, hy, w, h], m.tamanho[0], m.tamanho[1]);
      const b64 = await pagina.evaluate(
        async ({ url, j }) => {
          const img = new Image();
          img.src = url;
          await img.decode();
          const c = document.createElement('canvas');
          c.width = j.w;
          c.height = j.h;
          const g = c.getContext('2d', { willReadFrequently: true });
          g.drawImage(img, j.x0, j.y0, j.w, j.h, 0, 0, j.w, j.h); // sem escala: pixels idênticos aos do atlas
          const d = g.getImageData(0, 0, j.w, j.h).data;
          let s = '';
          for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode(...d.subarray(i, i + 0x8000));
          return btoa(s);
        },
        { url: `data:${mime};base64,${bytes.toString('base64')}`, j },
      );
      const webp = await codificarWebp(sharp, Buffer.from(b64, 'base64'), j.w, j.h);
      const retrato = { arquivo: ARQUIVO_RETRATO, recorte: j.recorte };
      const json = `${JSON.stringify(retrato, null, 2)}\n`;
      const caminhoImg = join(dir, ARQUIVO_RETRATO);
      const caminhoJson = join(dir, 'retrato.json');
      const campoIgual = JSON.stringify(m.retrato) === JSON.stringify(retrato);
      if (args.verificar) {
        const igual = existsSync(caminhoImg) && existsSync(caminhoJson) && readFileSync(caminhoImg).equals(webp) && readFileSync(caminhoJson, 'utf8') === json && campoIgual;
        console.log(`${id}: ${igual ? 'ok' : 'DIFERE'}`);
        if (!igual) diferentes++;
      } else {
        mkdirSync(dir, { recursive: true });
        writeFileSync(caminhoImg, webp);
        writeFileSync(caminhoJson, json);
        if (!campoIgual) {
          writeFileSync(jsonAtlas, trocarCampoRetrato(readFileSync(jsonAtlas, 'utf8'), retrato, id));
        }
        rmSync(join(dir, 'retrato.png'), { force: true }); // o formato antigo: nao deixar dois retratos lado a lado
        console.log(`${id}: ${ARQUIVO_RETRATO} ${j.w}x${j.h} (${webp.length} bytes), recorte ${j.recorte.map((v) => +v.toFixed(3)).join(', ')}`);
      }
    }
  } finally {
    await navegador.close();
  }
  if (diferentes) process.exit(1);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await principal();
