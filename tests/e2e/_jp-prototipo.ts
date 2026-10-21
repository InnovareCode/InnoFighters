import { existsSync, mkdirSync, readFileSync, renameSync, statSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import type { BrowserContext, Page } from '@playwright/test';

/**
 * Os testes de fidelidade comparam o jogo com o PROTÓTIPO, pixel a pixel. Desde a F3a o cenário do Japão do jogo é arte
 * nova (`cenario-jp.webp`); o protótipo continua desenhando o antigo (guardado em tests/fixtures/jp-prototipo.jpg).
 * Para o oráculo valer, estas páginas recebem o jp antigo no lugar do novo. Chamar ANTES do `goto`.
 */
export async function usarJpDoPrototipo(alvo: Page | BrowserContext): Promise<void> {
  const corpo = readFileSync(resolve('tests/fixtures/jp-prototipo.jpg'));
  await alvo.route('**/assets/cenarios/cenario-jp.webp', (rota) => rota.fulfill({ body: corpo, contentType: 'image/jpeg' }));
}

const ORIGINAIS = ['hayato', 'min-ji'] as const;
const TIPOS: Record<string, string> = { '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png' };

/**
 * Desde a F3b HAYATO e MIN-JI têm arte nova em produção (atlas v2, 2 páginas). O protótipo desenha os ORIGINAIS, e a fidelidade
 * compara pixel a pixel: estas páginas recebem o atlas original desses dois (tests/fixtures/atlas-prototipo/<id>/, formato v1 com
 * `atlas.webp`, mais retrato.json e retrato.png) no lugar do de produção. Chamar ANTES do `goto`.
 */
export async function usarOriginaisDoPrototipo(alvo: Page | BrowserContext): Promise<void> {
  for (const id of ORIGINAIS) {
    await alvo.route(`**/assets/lutadores/${id}/*`, (rota) => {
      const arquivo = new URL(rota.request().url()).pathname.split('/').pop() ?? '';
      const ext = arquivo.slice(arquivo.lastIndexOf('.'));
      const caminho = resolve('tests/fixtures/atlas-prototipo', id, arquivo);
      // só os 4 arquivos da fixture existem; qualquer outro (atlas-0.webp...) é erro de teste e não deve cair no de produção
      if (!(ext in TIPOS) || !existsSync(caminho)) return rota.fulfill({ status: 404, body: `sem ${arquivo} na fixture do protótipo` });
      return rota.fulfill({ body: readFileSync(caminho), contentType: TIPOS[ext]! });
    });
  }
}

/** Ambiente completo do oráculo: cenário antigo do Japão e atlas originais de HAYATO e MIN-JI. */
export async function usarArteDoPrototipo(alvo: Page | BrowserContext): Promise<void> {
  await usarJpDoPrototipo(alvo);
  await usarOriginaisDoPrototipo(alvo);
}

/*
 * TIPOGRAFIA (decisão do dono, 2026-10-21): o jogo passou a desenhar todo o texto em Barlow Condensed (títulos) e Barlow (corpo), auto-hospedadas, e a etiqueta do
 * jogador na seleção (VOCÊ, ALVO, ADVERSÁRIO, JOGADOR 1/2) saiu de cima do rosto para o painel do lutador. O protótipo continua desenhando em Impact/Segoe UI e a etiqueta
 * em cima do rosto, então a fidelidade pixel a pixel das TELAS compara contra uma CÓPIA do protótipo com SÓ essas duas mudanças: as linhas FH/FB trocadas pelas strings
 * novas (as mesmas de src/render/texto.ts, escritas aqui por extenso de propósito: se alguém mexer nelas, a fidelidade reprova) e a linha da etiqueta no lugar novo.
 * Todo o resto (posições, cores, tamanhos, lógica) é o do protótipo original, e é isso que continua provado pixel a pixel.
 */
const FONTES_DO_JOGO = {
  titulo: 'italic 800 ${s}px "Barlow Condensed", "Arial Narrow", Impact, sans-serif',
  corpo: '600 ${s}px Barlow, "Segoe UI", "Trebuchet MS", Arial, sans-serif',
  arquivos: { 'Barlow Condensed': ['italic', 800, 'barlow-condensed-800-italic-latin.woff2'], Barlow: ['normal', 600, 'barlow-600-latin.woff2'] },
} as const;

/** Caminho (file://) da cópia do protótipo com as fontes e a etiqueta novas; gerada em test-results/ (idempotente e atômica: 4 workers chamam juntos). */
export function urlDoPrototipoComFontesDoJogo(): string {
  const original = readFileSync(resolve('prototipo/inno-fighters-artefato.html'), 'utf8');
  const troca = (texto: string, de: string, para: string): string => {
    if (!texto.includes(de)) throw new Error(`o protótipo não tem mais o trecho: ${de.slice(0, 60)}`);
    return texto.replace(de, () => para);
  };
  let html = original;
  html = troca(html, 'const FH = (s) => `italic bold ${s}px Impact, "Arial Black", "Segoe UI", sans-serif`;', `const FH = (s) => \`${FONTES_DO_JOGO.titulo}\`;`);
  html = troca(html, 'const FB = (s) => `bold ${s}px "Segoe UI", "Trebuchet MS", Arial, sans-serif`;', `const FB = (s) => \`${FONTES_DO_JOGO.corpo}\`;`);
  html = troca(html, "arcadeText(tag, px + 142, 72, 22, P_COL[p], '#000', 'center');", "arcadeText(tag, px + 270, 394, 20, P_COL[p], '#000', 'right');");
  const faces = Object.entries(FONTES_DO_JOGO.arquivos)
    .map(([familia, [estilo, peso, arq]]) => `@font-face{font-family:"${familia}";font-style:${estilo};font-weight:${peso};font-display:block;src:url("${pathToFileURL(resolve('public/assets/fontes', arq)).href}") format("woff2");}`)
    .join('');
  html = troca(html, '</head>', `<style>${faces}</style></head>`);
  const pasta = resolve('test-results/prototipo-fontes');
  const destino = join(pasta, 'inno-fighters-artefato.html');
  const tamanho = Buffer.byteLength(html);
  if (!existsSync(destino) || statSync(destino).size !== tamanho || readFileSync(destino, 'utf8') !== html) {
    mkdirSync(pasta, { recursive: true });
    const tmp = join(pasta, `tmp-${process.pid}-${Date.now()}.html`);
    writeFileSync(tmp, html);
    renameSync(tmp, destino);
  }
  return pathToFileURL(destino).href;
}

/** Espera as 2 fontes do jogo carregarem na página do protótipo (o canvas não espera: sem isto o 1º quadro sairia na fonte de reserva). */
export async function aguardarFontesNoPrototipo(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await Promise.all([document.fonts.load('italic 800 20px "Barlow Condensed"', 'ÃÕÇ'), document.fonts.load('600 20px Barlow', 'ÃÕÇ')]);
    if (!document.fonts.check('italic 800 20px "Barlow Condensed"') || !document.fonts.check('600 20px Barlow')) throw new Error('as fontes do jogo não carregaram no protótipo');
  });
}
