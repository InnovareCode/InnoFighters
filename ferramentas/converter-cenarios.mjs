// Converte a arte-fonte dos cenarios (PNG 2752x1536) para o formato do jogo: WebP 1920x1080 em
// public/assets/cenarios/cenario-<sigla>.webp (os nomes que src/data/cenarios.ts espera).
// Recorta 21 px da largura (centrado) para chegar a 16:9 exato sem distorcer: a linha dos pes (84,5% da altura) nao muda.
// Uso: node ferramentas/converter-cenarios.mjs [qualidade=80] [--so <sigla>[,<sigla>]]   (--so: converte so estes; padrao todos)
import sharp from 'sharp';
import { statSync } from 'node:fs';

const args = process.argv.slice(2);
const iSo = args.indexOf('--so');
const SO = iSo >= 0 ? new Set((args[iSo + 1] ?? '').split(',').filter(Boolean)) : null;
const QUALIDADE = Number(args.find((a, i) => i !== iSo && i !== iSo + 1 && /^\d+$/.test(a)) ?? 80);
// gr-v2 = gr-v1 com o piso clareado (piso2.ps1 do Apolo): a bota preta do ZENON sumia no marmore preto (contraste 1,01:1 -> 1,85:1).
const FONTES = { jp: 'jp-v1', ng: 'ng-v2', mx: 'mx-v1', fr: 'fr-v2', in: 'in-v1', mn: 'mn-v1', gr: 'gr-v2' };
for (const [id, fonte] of Object.entries(FONTES)) {
  if (SO && !SO.has(id)) continue;
  const entrada = `arte-fonte/cenarios/cenario-${fonte}.png`;
  const saida = `public/assets/cenarios/cenario-${id}.webp`;
  const { width, height } = await sharp(entrada).metadata();
  const largura = Math.round((height * 16) / 9);
  await sharp(entrada)
    .extract({ left: Math.floor((width - largura) / 2), top: 0, width: largura, height })
    .resize(1920, 1080, { kernel: 'lanczos3' })
    .webp({ quality: QUALIDADE, effort: 5 })
    .toFile(saida);
  console.log(`${id}: ${entrada} (${width}x${height}) -> ${saida} ${(statSync(saida).size / 1024).toFixed(0)} KB`);
}
