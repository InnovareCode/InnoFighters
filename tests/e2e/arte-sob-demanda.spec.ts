/* eslint-disable @typescript-eslint/no-explicit-any */
import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function esperarCena(page: Page, nome: string, timeout = 20_000): Promise<void> {
  await page.waitForFunction((n) => (window as any).__inno.ui.name === n && (window as any).__inno.ui.fadeTo === null, nome, { timeout });
}

/** Caminhos de tudo que a página pediu da pasta /assets/. */
function espiarAssets(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith('/assets/')) urls.push(p);
  });
  return urls;
}

const atlasDe = (urls: string[]): string[] => urls.filter((u) => /\/atlas\.webp$/.test(u)).map((u) => u.split('/')[3] as string).sort();
const cenariosDe = (urls: string[]): string[] => urls.filter((u) => u.startsWith('/assets/cenarios/')).map((u) => u.split('/')[3] as string).sort();

test.describe('retratos e carga de arte', () => {
  test('boot padrão: retrato de todos, atlas só da vitrine, cada arquivo uma vez', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const urls = espiarAssets(page);
    await page.goto('/?seed=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(urls.filter((u) => u.endsWith('/atlas.json')).length).toBe(4);
    expect(urls.filter((u) => u.endsWith('/retrato.png')).length).toBe(4);
    expect(atlasDe(urls)).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']); // a vitrine = os 4 de hoje
    expect(cenariosDe(urls)).toEqual(['br.jpg', 'cn.jpg', 'jp.jpg', 'kr.jpg']);
    const r = await hook(page, '(h) => { const m = h.mundo(); return Object.fromEntries(Object.entries(m.elenco).map(([id, e]) => [id, e.arte.temRetrato])); }');
    expect(r).toEqual({ hayato: true, 'wei-long': true, 'min-ji': true, caio: true });
  });

  test('tudo sob demanda: sem atlas no boot; a seleção pede só os mostrados e o VS só a dupla da luta', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros: string[] = [];
    page.on('pageerror', (e) => erros.push(e.message));
    page.on('console', (m) => m.type() === 'error' && erros.push(m.text()));
    await page.addInitScript(() => {
      window.localStorage.setItem('inno-fighters-v1', JSON.stringify({ v: 1, s: { music: 0.45, sfx: 0.8, rounds: 1, time: 99, diff: 0, shake: true }, hi: 0 }));
    });
    const urls = espiarAssets(page);
    await page.goto('/?seed=7&precarga=minima');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });

    // boot: manifestos, retratos e o cenário padrão; NENHUM atlas e nenhum outro cenário
    expect(atlasDe(urls)).toEqual([]);
    expect(cenariosDe(urls)).toEqual(['jp.jpg']);
    expect(urls.filter((u) => u.endsWith('/retrato.png')).length).toBe(4);

    await page.keyboard.press('Enter');
    await esperarCena(page, 'intro');
    await page.waitForTimeout(400);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'title'); // a vitrine não está na memória: o título aparece sem os lutadores, sem erro
    await page.keyboard.press('Enter');
    await esperarCena(page, 'menu');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter'); // LUTA vs CPU
    await esperarCena(page, 'select');

    // a seleção mostra o HAYATO grande: pede só o atlas dele (o resto da grade usa retratos)
    await expect.poll(() => atlasDe(urls)).toEqual(['hayato']);
    await page.keyboard.press('Enter'); // escolhe HAYATO; o adversário sugerido (WEI LONG) aparece grande
    await expect.poll(() => atlasDe(urls)).toEqual(['hayato', 'wei-long']);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'diff');
    await page.keyboard.press('Enter');
    await esperarCena(page, 'vs');
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 20_000 });
    // o VS pediu o cenário da casa do rival (WEI LONG = cn) e nada mais
    expect(cenariosDe(urls)).toEqual(['cn.jpg', 'jp.jpg']);
    expect(atlasDe(urls)).toEqual(['hayato', 'wei-long']);
    await page.waitForTimeout(700);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'fight');
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 20_000 });

    // a luta desenha os dois lutadores de verdade (a arte chegou) e cada arquivo foi baixado uma vez
    const pintado = await page.locator('canvas#jogo').evaluate((el) => {
      const c = el as HTMLCanvasElement;
      const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
      const cores = new Set<number>();
      for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
      return cores.size;
    });
    expect(pintado).toBeGreaterThan(200);
    const residentes = await hook(page, '(h) => h.mundo().arte.lutadoresResidentes().sort()');
    expect(residentes).toEqual(['hayato', 'wei-long']);
    const cargas = await hook(page, '(h) => Object.fromEntries(h.mundo().arte.cargas.lutadores)');
    expect(cargas).toEqual({ hayato: 1, 'wei-long': 1 });
    expect(urls.filter((u) => u.endsWith('/atlas.webp'))).toHaveLength(2);
    expect(erros).toEqual([]);
  });

  test('a poda solta o lutador antigo e a luta seguinte baixa o novo (memória limitada)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await page.goto('/?seed=2&precarga=minima&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const r = await page.evaluate(async () => {
      const m = (window as any).__inno.mundo();
      const a = m.arte;
      const trilha: string[][] = [];
      const par = async (ids: string[]) => {
        a.usar(ids);
        await a.garantir({ lutadores: ids });
        trilha.push(a.lutadoresResidentes().sort());
      };
      await par(['hayato', 'wei-long']);
      await par(['min-ji', 'caio']);
      await par(['hayato', 'caio']);
      return { trilha, cargas: Object.fromEntries(a.cargas.lutadores) };
    });
    // limite padrão de 3 residentes: ao chegar o 4º, sai o menos recente que não está em uso
    expect(r.trilha[0]).toEqual(['hayato', 'wei-long']);
    expect(r.trilha[1]!.length).toBeLessThanOrEqual(3);
    expect(r.trilha[1]).toEqual(expect.arrayContaining(['min-ji', 'caio']));
    expect(r.trilha[2]).toEqual(expect.arrayContaining(['hayato', 'caio']));
    expect(r.trilha[2]!.length).toBeLessThanOrEqual(3);
    expect(r.cargas['hayato']).toBe(2); // foi solto e baixou de novo
  });
});

// ---------- C1 v2: atlas em duas páginas, de verdade no navegador ----------

/** PNG opaco de uma cor só. */
function pngCor(largura: number, altura: number, [r, g, b]: [number, number, number]): Buffer {
  const tabela = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (buf: Buffer): number => {
    let c = 0xffffffff;
    for (const x of buf) c = tabela[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo: string, dados: Buffer): Buffer => {
    const t = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dados.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(t));
    return Buffer.concat([len, t, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  const linhas: Buffer[] = [];
  for (let y = 0; y < altura; y++) {
    const l = Buffer.alloc(1 + largura * 4);
    for (let x = 0; x < largura; x++) {
      l[1 + x * 4] = r;
      l[2 + x * 4] = g;
      l[3 + x * 4] = b;
      l[4 + x * 4] = 255;
    }
    linhas.push(l);
  }
  return Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), bloco('IHDR', ihdr), bloco('IDAT', deflateSync(Buffer.concat(linhas))), bloco('IEND', Buffer.alloc(0))]);
}

test('C1 v2 no navegador: o quadro é desenhado da página certa (e a silhueta também)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'só no desktop');
  await page.goto('/?seed=1&manual=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const manifesto = {
    versao: 2,
    lutador: 'teste',
    imagens: ['atlas-0.png', 'atlas-1.png'],
    tamanho: [64, 32],
    alturaRef: 32,
    quadros: {
      guard: { x: 0, y: 0, w: 32, h: 32, ax: 16, p: 0 },
      punch: { x: 32, y: 0, w: 32, h: 32, ax: 16, ponta: [30, 10], p: 1 },
    },
  };
  await page.route('**/assets/lutadores/teste/atlas.json', (rota) => rota.fulfill({ json: manifesto }));
  await page.route('**/assets/lutadores/teste/atlas-0.png', (rota) => rota.fulfill({ contentType: 'image/png', body: pngCor(64, 32, [255, 0, 0]) }));
  await page.route('**/assets/lutadores/teste/atlas-1.png', (rota) => rota.fulfill({ contentType: 'image/png', body: pngCor(64, 32, [0, 0, 255]) }));

  const r = await page.evaluate(async () => {
    const imp = (p: string): Promise<any> => import(/* @vite-ignore */ p);
    const { carregarRecursos } = await imp('/src/assets/carregador.ts');
    const { desenharPose } = await imp('/src/render/pose.ts');
    const rec = await carregarRecursos({ baseUrl: '/', lutadores: ['teste'], cenarios: [] });
    const atlas = rec.lutadores.get('teste');
    const ch = { pd: atlas.poses(), K: 1 };
    const c = document.createElement('canvas');
    c.width = 200;
    c.height = 100;
    const ctx = c.getContext('2d')!;
    desenharPose(ctx, ch, atlas, 'guard', 40, 60, 1); // página 0 (vermelha), à esquerda
    desenharPose(ctx, ch, atlas, 'punch', 140, 60, 1); // página 1 (azul), à direita
    const px = (x: number, y: number) => Array.from(ctx.getImageData(x, y, 1, 1).data);
    const antes = { guard: px(40, 40), punch: px(140, 40), vazio: px(100, 40) };
    ctx.clearRect(0, 0, 200, 100);
    desenharPose(ctx, ch, atlas, 'punch', 140, 60, 1, 1, 0, 1); // só a silhueta branca da página 1
    return { antes, silhueta: px(140, 40), paginas: atlas.paginasCarregadas, pagDoPunch: atlas.paginaDe('punch') };
  });
  expect(r.paginas).toBe(2);
  expect(r.pagDoPunch).toBe(1);
  expect(r.antes.guard).toEqual([255, 0, 0, 255]);
  expect(r.antes.punch).toEqual([0, 0, 255, 255]);
  expect(r.antes.vazio[3]).toBe(0);
  expect(r.silhueta).toEqual([255, 255, 255, 255]);
});
