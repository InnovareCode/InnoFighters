/*
 * Service worker no BUILD de produção (T7, docs/service-worker.md): playwright.build.config.ts, `npm run test:e2e:build`.
 * Instala, abre o título OFFLINE, troca de versão sem misturar arte e o kill switch `?sw=0`. O percurso completo (luta offline, 2ª visita medida em bytes,
 * subcaminho /InnoFighters/, botão ATUALIZAR) foi provado à parte; aqui ficam as garantias que não podem regredir.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

test.describe.configure({ timeout: 180_000, mode: 'serial' });

const DIST = join(process.cwd(), 'dist');

interface Estado {
  regs: number;
  controller: boolean;
  waiting: boolean;
  caches: string[];
  arte: string[];
}
const estado = (page: Page): Promise<Estado> =>
  page.evaluate(async () => {
    const regs = await navigator.serviceWorker.getRegistrations();
    const caches_ = await caches.keys();
    const arte = caches_.includes('inno-arte-v1') ? (await (await caches.open('inno-arte-v1')).keys()).map((r) => r.url) : [];
    return { regs: regs.length, controller: navigator.serviceWorker.controller !== null, waiting: !!regs[0]?.waiting, caches: caches_, arte };
  });

const versaoDoSw = (page: Page): Promise<string | null> =>
  page.evaluate(
    () =>
      new Promise<string | null>((resolve) => {
        const t = setTimeout(() => resolve(null), 3000);
        navigator.serviceWorker.addEventListener('message', (e) => {
          if (e.data?.tipo === 'versao') {
            clearTimeout(t);
            resolve(e.data.versao as string);
          }
        });
        void navigator.serviceWorker.getRegistration().then((r) => r?.active?.postMessage({ tipo: 'versao' }));
      }),
  );

/** Um passo de leitura que pode cair no meio de uma recarga (a troca de versão recarrega a página): null em vez de lançar. */
const seguro = async <T>(f: () => Promise<T>): Promise<T | null> => f().catch(() => null);

const coresNoCanvas = (page: Page): Promise<number> =>
  page.locator('canvas#jogo').evaluate((el) => {
    const c = el as HTMLCanvasElement;
    const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
    const cores = new Set<number>();
    for (let i = 0; i < d.length; i += 4 * 997) cores.add((d[i]! << 16) | (d[i + 1]! << 8) | d[i + 2]!);
    return cores.size;
  });

test.describe('service worker no build', () => {
  test('o build publica sw.js e o manifesto de revisões (hash de conteúdo, shell sem a arte pesada)', async ({ request }) => {
    expect((await request.get('/sw.js')).status()).toBe(200);
    const texto = await (await request.get('/sw-manifesto.js')).text();
    const m = JSON.parse(texto.replace(/^self\.__INNO_MANIFESTO__=/, '').replace(/;\s*$/, '')) as {
      versao: string;
      marca: string;
      revisoes: Record<string, string>;
      shell: string[];
    };
    expect(Object.keys(m.revisoes).length).toBeGreaterThan(50);
    for (const rev of Object.values(m.revisoes)) expect(rev).toMatch(/^[0-9a-f]{16}$/);
    expect(m.revisoes['manifest.webmanifest']).toBeTruthy();
    expect(Object.keys(m.revisoes).some((c) => c.startsWith('assets/lutadores/') && c.endsWith('.webp'))).toBe(true); // arte de public/ SEM hash no nome ganha revisão
    expect(m.shell).toContain(m.marca);
    expect(m.shell.some((c) => c.includes('/lutadores/') || c.endsWith('filme.webp'))).toBe(false);
    expect(Object.keys(m.revisoes).some((c) => c === 'index.html' || c === 'version.json' || c.endsWith('.map'))).toBe(false);
  });

  test('instala na 1ª visita, guarda o que foi usado e reabre o título OFFLINE', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await expect.poll(async () => (await estado(page)).controller, { timeout: 30_000 }).toBe(true);
    // a captura do que a página já baixou antes de o SW assumir chega em ~8 s
    await expect.poll(async () => (await estado(page)).arte.filter((u) => u.includes('/assets/lutadores/')).length, { timeout: 45_000 }).toBeGreaterThan(0);
    const e = await estado(page);
    expect(e.caches).toContain('inno-arte-v1');
    expect(e.caches.some((n) => n.startsWith('inno-shell-'))).toBe(true);
    expect(e.arte.every((u) => /\?__rev=[0-9a-f]{16}$/.test(u))).toBe(true);
    expect(e.arte.filter((u) => /filme/.test(u))).toEqual([]); // FILME não é pré-baixada

    await ctx.setOffline(true);
    const off = await ctx.newPage();
    await off.goto('/?trailer=0&residencia=fixa&motorv2=0');
    await expect(off.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(new URL(off.url()).search).toBe('?trailer=0&residencia=fixa&motorv2=0');
    await off.waitForTimeout(1500);
    expect(await coresNoCanvas(off)).toBeGreaterThan(200);
    await ctx.close();
  });

  test('versão nova: assume no boot, ou espera fora dele sem misturar arte e assume no boot seguinte', async ({ browser }) => {
    const manifestoPath = join(DIST, 'sw-manifesto.js');
    const original = readFileSync(manifestoPath, 'utf8');
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    try {
      const page = await ctx.newPage();
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
      await expect.poll(async () => (await estado(page)).controller, { timeout: 30_000 }).toBe(true);
      const v1 = await versaoDoSw(page);
      expect(v1).toBeTruthy();

      // "deploy" da v2: o manifesto muda (revisão de um arquivo da arte + versão), o resto do dist fica igual
      const m = JSON.parse(original.replace(/^self\.__INNO_MANIFESTO__=/, '').replace(/;\s*$/, '')) as { versao: string; revisoes: Record<string, string> };
      const arte = Object.keys(m.revisoes).find((c) => c.startsWith('assets/lutadores/') && c.endsWith('.json'))!;
      const v2 = { ...m, versao: `${m.versao}.v2`, revisoes: { ...m.revisoes, [arte]: '0123456789abcdef' } };
      writeFileSync(manifestoPath, `self.__INNO_MANIFESTO__=${JSON.stringify(v2)};\n`);

      // 1) v2 sobe e a página recarrega: o SW instala em segundos e a troca cai na janela de boot (antes de qualquer luta), então a v2 assume sozinha
      await page.reload();
      await expect.poll(() => seguro(() => versaoDoSw(page)), { timeout: 45_000 }).toBe(v2.versao);
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
      const depois = await estado(page);
      expect(depois.waiting).toBe(false);
      expect(depois.caches.filter((n) => n.startsWith('inno-shell-'))).toHaveLength(1); // o shell da v1 foi limpo
      // limpeza: nada no cache da arte com revisão que o manifesto novo não conhece
      const revisaoDe = (u: string): string => u.slice(u.lastIndexOf('?__rev=') + 7);
      const caminhoDe = (u: string): string => new URL(u).pathname.replace(/^\//, '');
      expect(depois.arte.filter((u) => v2.revisoes[caminhoDe(u).split('?')[0]!] !== revisaoDe(u))).toEqual([]);

      // 2) v3 sobe FORA da janela de boot (20 s): instala em espera, a página fica na v2 (sem misturar) e a v3 assume no boot seguinte
      await page.waitForTimeout(21_000);
      const v3 = { ...v2, versao: `${m.versao}.v3`, revisoes: { ...v2.revisoes, [arte]: 'fedcba9876543210' } };
      writeFileSync(manifestoPath, `self.__INNO_MANIFESTO__=${JSON.stringify(v3)};\n`);
      await page.evaluate(async () => void (await (await navigator.serviceWorker.getRegistration())?.update()));
      await expect.poll(async () => (await estado(page)).waiting, { timeout: 30_000 }).toBe(true);
      expect(await versaoDoSw(page)).toBe(v2.versao);
      expect((await estado(page)).caches.filter((n) => n.startsWith('inno-shell-'))).toHaveLength(2);
      await page.reload();
      await expect.poll(() => seguro(() => versaoDoSw(page)), { timeout: 45_000 }).toBe(v3.versao);
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
      expect((await estado(page)).waiting).toBe(false);
    } finally {
      writeFileSync(manifestoPath, original);
      await ctx.close();
    }
  });

  test('kill switch: ?sw=0 desregistra e limpa, a flag mantém desligado, ?sw=1 religa', async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page = await ctx.newPage();
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await expect.poll(async () => (await estado(page)).controller, { timeout: 30_000 }).toBe(true);

    await page.goto('/?sw=0');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await expect.poll(async () => (await estado(page)).regs, { timeout: 15_000 }).toBe(0);
    await expect.poll(async () => (await estado(page)).caches.filter((n) => n.startsWith('inno-')), { timeout: 15_000 }).toEqual([]);

    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await page.waitForTimeout(2500);
    const sem = await estado(page);
    expect(sem.regs).toBe(0);
    expect(sem.controller).toBe(false);

    await page.goto('/?sw=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await expect.poll(async () => (await estado(page)).regs, { timeout: 15_000 }).toBe(1);
    await ctx.close();
  });
});
