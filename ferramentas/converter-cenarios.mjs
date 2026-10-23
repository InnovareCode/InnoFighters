// Converte a arte-fonte dos cenarios (PNG ou JPG 2752x1536) para o formato do jogo: WebP 1920x1080 em
// public/assets/cenarios/cenario-<sigla>.webp (os nomes que src/data/cenarios.ts espera).
// Recorta 21 px da largura (centrado) para chegar a 16:9 exato sem distorcer: a linha dos pes (84,5% da altura) nao muda.
// Uso: node ferramentas/converter-cenarios.mjs [qualidade] [--so <sigla>[,<sigla>]]   (--so: converte so estes; padrao todos)
// Qualidade: sem argumento, cada cenario usa a sua em QUALIDADES (padrao 80); com argumento, vale para todos os convertidos.
import sharp from 'sharp';
import { statSync } from 'node:fs';

const args = process.argv.slice(2);
const iSo = args.indexOf('--so');
const SO = iSo >= 0 ? new Set((args[iSo + 1] ?? '').split(',').filter(Boolean)) : null;
const QUALIDADE_ARG = args.find((a, i) => i !== iSo && i !== iSo + 1 && /^\d+$/.test(a));
// gr-v2 = gr-v1 com o piso clareado (piso2.ps1 do Apolo): a bota preta do ZENON sumia no marmore preto (contraste 1,01:1 -> 1,85:1).
// Cada fonte leva a extensao: os cenarios curados do Apolo (cn, kr, br) chegaram em JPG; os demais em PNG.
// cn/kr/br: copias de Cenario_*_2K_*.jpg (o nome original tem reticencias e quebra scripts); o original fica intocado.
const FONTES = { jp: 'jp-v1.png', ng: 'ng-v2.png', mx: 'mx-v1.png', fr: 'fr-v2.png', in: 'in-v1.png', mn: 'mn-v1.png', gr: 'gr-v2.png', cn: 'cn-v1.jpg', kr: 'kr-v1.jpg', br: 'br-v1.jpg' };
// Qualidade por cenario, escolhida para ficar em <= 250 KB (meta 3 do orcamento): cn q80, kr e br q70.
const QUALIDADES = { cn: 80, kr: 70, br: 70 };
for (const [id, fonte] of Object.entries(FONTES)) {
  if (SO && !SO.has(id)) continue;
  const entrada = `arte-fonte/cenarios/cenario-${fonte}`;
  const qualidade = QUALIDADE_ARG ? Number(QUALIDADE_ARG) : (QUALIDADES[id] ?? 80);
  const saida = `public/assets/cenarios/cenario-${id}.webp`;
  const { width, height } = await sharp(entrada).metadata();
  const largura = Math.round((height * 16) / 9);
  await sharp(entrada)
    .extract({ left: Math.floor((width - largura) / 2), top: 0, width: largura, height })
    .resize(1920, 1080, { kernel: 'lanczos3' })
    .webp({ quality: qualidade, effort: 5 })
    .toFile(saida);
  console.log(`${id}: ${entrada} (${width}x${height}) -> ${saida} q${qualidade} ${(statSync(saida).size / 1024).toFixed(0)} KB`);
}
