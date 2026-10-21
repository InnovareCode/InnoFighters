// Converte a arte-fonte dos cenarios (PNG 2752x1536) para o formato do jogo: WebP 1920x1080 em
// public/assets/cenarios/cenario-<sigla>.webp (os nomes que src/data/cenarios.ts espera).
// Recorta 21 px da largura (centrado) para chegar a 16:9 exato sem distorcer: a linha dos pes (84,5% da altura) nao muda.
// Uso: node ferramentas/converter-cenarios.mjs [qualidade=80]
import sharp from 'sharp';
import { statSync } from 'node:fs';

const QUALIDADE = Number(process.argv[2] ?? 80);
const FONTES = { jp: 'jp-v1', ng: 'ng-v2', mx: 'mx-v1', fr: 'fr-v2', in: 'in-v1', mn: 'mn-v1' };
for (const [id, fonte] of Object.entries(FONTES)) {
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
