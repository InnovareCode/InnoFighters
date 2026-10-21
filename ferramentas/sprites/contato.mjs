/**
 * Contact-sheet do resultado, montado a partir do ATLAS GRAVADO (relê atlas-N.webp + atlas.json), não da memória do
 * pipeline: assim confere também o empacotamento e o manifesto. Cada quadro é desenhado com a âncora (ax) no meio
 * da célula e os pés (base do quadro) numa linha comum, que é como o jogo o posiciona; qualquer pulo de posição
 * entre poses aparece como deslocamento visível. Marcas: linha vermelha = pés, linha ciano = ax, cruz amarela = ponta.
 * Duas versões (fundo escuro e claro): resto de rosa na borda só aparece contra um dos dois.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import sharp from 'sharp';

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

export async function gerarContato({ dirAtlas, arquivoSaida, fundo = '#1b1d2a', colunas = 8, escala = 0.5 }) {
  const m = JSON.parse(readFileSync(join(dirAtlas, 'atlas.json'), 'utf8'));
  const paginas = await Promise.all(m.imagens.map((nome) => sharp(join(dirAtlas, nome)).ensureAlpha().raw().toBuffer({ resolveWithObject: true })));
  const nomes = Object.keys(m.quadros);
  const qs = Object.values(m.quadros);
  const esq = Math.max(...qs.map((q) => q.ax)) * escala;
  const dir = Math.max(...qs.map((q) => q.w - q.ax)) * escala;
  const alto = Math.max(...qs.map((q) => q.h)) * escala;
  const celW = Math.ceil(esq + dir) + 24;
  const celH = Math.ceil(alto) + 40;
  const linhas = Math.ceil(nomes.length / colunas);
  const W = celW * colunas;
  const H = celH * linhas;
  const camadas = [];
  const marcas = [];
  const claro = fundo.toLowerCase() > '#808080';
  const tinta = claro ? '#222' : '#ddd';

  for (let i = 0; i < nomes.length; i++) {
    const nome = nomes[i];
    const q = m.quadros[nome];
    const col = i % colunas;
    const lin = Math.floor(i / colunas);
    const cx = col * celW + Math.ceil(esq) + 12;
    const base = lin * celH + celH - 8;
    const w = Math.max(1, Math.round(q.w * escala));
    const h = Math.max(1, Math.round(q.h * escala));
    const pag = paginas[q.p ?? 0];
    const recorte = await sharp(pag.data, { raw: pag.info })
      .extract({ left: q.x, top: q.y, width: q.w, height: q.h })
      .resize(w, h, { kernel: 'lanczos3' })
      .png()
      .toBuffer();
    const left = Math.round(cx - q.ax * escala);
    const top = base - h;
    camadas.push({ input: recorte, left, top });
    marcas.push(`<line x1="${col * celW + 4}" y1="${base}" x2="${(col + 1) * celW - 4}" y2="${base}" stroke="#f33" stroke-width="1"/>`);
    marcas.push(`<line x1="${cx}" y1="${top - 4}" x2="${cx}" y2="${base + 4}" stroke="#0cf" stroke-width="1"/>`);
    if (q.ponta) {
      const px = left + q.ponta[0] * escala;
      const py = top + q.ponta[1] * escala;
      marcas.push(`<path d="M${px - 7},${py} L${px + 7},${py} M${px},${py - 7} L${px},${py + 7}" stroke="#fd0" stroke-width="2" fill="none"/>`);
    }
    marcas.push(`<text x="${col * celW + 6}" y="${lin * celH + 14}" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="${tinta}">${esc(nome)} ${q.w}x${q.h}</text>`);
    marcas.push(`<rect x="${col * celW}" y="${lin * celH}" width="${celW}" height="${celH}" fill="none" stroke="${claro ? '#bbb' : '#444'}" stroke-width="1"/>`);
  }
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${marcas.join('')}</svg>`);
  await sharp({ create: { width: W, height: H, channels: 4, background: fundo } })
    .composite([...camadas, { input: svg, left: 0, top: 0 }])
    .png({ compressionLevel: 9 })
    .toFile(arquivoSaida);
  return { largura: W, altura: H };
}
