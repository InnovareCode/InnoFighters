#!/usr/bin/env node
/**
 * Extrai ASSETS (imagens em Base64) e POSEDATA do protótipo para arquivos servíveis.
 * PLANO.md 4.3 (C1) e Fase 1. Zero dependências; só Node >= 20.
 *
 *   node ferramentas/extrair-prototipo.mjs [--prototipo <html>] [--saida <public/assets>]
 *
 * Gera:
 *   <saida>/lutadores/<id>/atlas.webp   bytes idênticos ao Base64 do protótipo (sem re-encodar)
 *   <saida>/lutadores/<id>/atlas.json   manifesto C1 (px do atlas; ponta/rosto relativos ao canto do quadro)
 *   <saida>/cenarios/<id>.jpg           bytes idênticos (conversão para WebP é a F2, precisa de encoder)
 *
 * ARMADILHA (PLANO 4.3): no protótipo `tipX/tipY` estão em px LÓGICOS, relativos à âncora
 * (tipX = distância horizontal do pé; tipY = altura acima do pé) e já multiplicados por
 * SH_IDLE/alturaRef. O manifesto guarda px do ATLAS, relativos ao canto superior esquerdo
 * do quadro. Conversão (única, aqui): k = SH_IDLE / alturaRef;
 *   ponta = [ax + tipX / k, h - tipY / k].
 * O inverso (que o loader do jogo aplica) está em src/data/atlas.ts e é provado por
 * tests/unit/atlas.test.ts contra o POSEDATA original.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** Mesmo valor de SH_IDLE em src/core/constantes.ts (altura da guarda na tela). */
export const SH_IDLE = 255;
/** Rosto = centro do retrato 190x190 do protótipo: [headX + 6, 91] (ver src/data/atlas.ts). */
const ROSTO_DY = 91;
const ROSTO_DX = 6;

/** Chave do protótipo -> id do jogo. Ordem = ROSTER do protótipo. */
export const LUTADORES = { f1: 'hayato', f2: 'wei-long', f3: 'min-ji', f4: 'caio' };
/** Chave de ASSETS do protótipo -> id de cenário (bg = Japão: IMG[stage] || IMG.bg). */
export const CENARIOS = { bg: 'jp', bg_cn: 'cn', bg_kr: 'kr', bg_br: 'br' };

function extrairLiteral(texto, nome) {
  const marca = `const ${nome} = `;
  const ini = texto.indexOf(marca);
  if (ini < 0) throw new Error(`${nome} nao encontrado no prototipo`);
  const fim = texto.indexOf('\n', ini);
  let json = texto.slice(ini + marca.length, fim < 0 ? undefined : fim).trimEnd();
  if (json.endsWith(';')) json = json.slice(0, -1);
  return JSON.parse(json);
}

function decodificarDataUri(uri, nome) {
  const m = /^data:([a-z]+\/[a-z]+);base64,/.exec(uri);
  if (!m) throw new Error(`${nome}: nao e data URI base64`);
  return { mime: m[1], bytes: Buffer.from(uri.slice(m[0].length), 'base64') };
}

/** Largura x altura de um WebP (VP8X, VP8 ou VP8L) lendo só o cabeçalho. */
export function dimensoesWebp(b) {
  if (b.length < 30 || b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WEBP') {
    throw new Error('nao e WebP');
  }
  const tipo = b.toString('ascii', 12, 16);
  if (tipo === 'VP8X') return [1 + b.readUIntLE(24, 3), 1 + b.readUIntLE(27, 3)];
  if (tipo === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (tipo === 'VP8L') {
    const bits = b.readUInt32LE(21);
    return [1 + (bits & 0x3fff), 1 + ((bits >>> 14) & 0x3fff)];
  }
  throw new Error(`chunk WebP desconhecido: ${tipo}`);
}

/** POSEDATA de um lutador -> manifesto C1. Função pura (testável). */
export function posesParaManifesto(id, poses, tamanho) {
  const base = poses['idle0'] ?? poses['guard'];
  if (!base) throw new Error(`${id}: sem idle0/guard para alturaRef`);
  const alturaRef = base.h;
  const k = SH_IDLE / alturaRef;
  const quadros = {};
  for (const [nome, p] of Object.entries(poses)) {
    if (p.x + p.w > tamanho[0] || p.y + p.h > tamanho[1]) {
      throw new Error(`${id}/${nome}: quadro fora do atlas ${tamanho[0]}x${tamanho[1]}`);
    }
    const q = { x: p.x, y: p.y, w: p.w, h: p.h, ax: p.ax };
    if (p.tipX !== undefined && p.tipY !== undefined) q.ponta = [p.ax + p.tipX / k, p.h - p.tipY / k];
    if (p.headX !== undefined) q.rosto = [p.headX + ROSTO_DX, ROSTO_DY];
    quadros[nome] = q;
  }
  return { versao: 1, lutador: id, imagem: 'atlas.webp', tamanho, alturaRef, quadros };
}

function escrever(caminho, dados) {
  mkdirSync(dirname(caminho), { recursive: true });
  writeFileSync(caminho, dados);
}

export function extrair({ prototipo, saida }) {
  const texto = readFileSync(prototipo, 'utf8');
  const assets = extrairLiteral(texto, 'ASSETS');
  const posedata = extrairLiteral(texto, 'POSEDATA');
  const resumo = [];
  for (const [chave, id] of Object.entries(LUTADORES)) {
    const { mime, bytes } = decodificarDataUri(assets[chave], chave);
    if (mime !== 'image/webp') throw new Error(`${chave}: esperado webp, veio ${mime}`);
    const tamanho = dimensoesWebp(bytes);
    const manifesto = posesParaManifesto(id, posedata[chave], tamanho);
    const dir = join(saida, 'lutadores', id);
    escrever(join(dir, 'atlas.webp'), bytes);
    escrever(join(dir, 'atlas.json'), JSON.stringify(manifesto, null, 2) + '\n');
    resumo.push(`${id}: atlas ${tamanho.join('x')} (${bytes.length} B), ${Object.keys(manifesto.quadros).length} quadros`);
  }
  for (const [chave, id] of Object.entries(CENARIOS)) {
    const { mime, bytes } = decodificarDataUri(assets[chave], chave);
    if (mime !== 'image/jpeg') throw new Error(`${chave}: esperado jpeg, veio ${mime}`);
    escrever(join(saida, 'cenarios', `${id}.jpg`), bytes);
    resumo.push(`cenario ${id}: ${bytes.length} B`);
  }
  return resumo;
}

function argumento(nome, padrao) {
  const i = process.argv.indexOf(nome);
  return i >= 0 && process.argv[i + 1] ? resolve(process.argv[i + 1]) : padrao;
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const resumo = extrair({
    prototipo: argumento('--prototipo', join(raiz, 'prototipo', 'inno-fighters-artefato.html')),
    saida: argumento('--saida', join(raiz, 'public', 'assets')),
  });
  console.log(resumo.join('\n'));
}
