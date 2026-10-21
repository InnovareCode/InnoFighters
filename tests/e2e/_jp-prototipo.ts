import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
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
