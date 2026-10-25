/*
 * "Algo soa" no BUILD de produção com o service worker ligado na 2ª visita (incidente de 25/10/2026: jogo mudo no site publicado, causa = cache do navegador do dono).
 * Contrato: com o SW já instalado por uma visita anterior, o manifesto de sons e a folha `base` chegam PELO SW (fromServiceWorker) e na revisão desta versão
 * (`?v=<commit do version.json>`, nunca a de um build velho), com status 200 e tipo certo; um gesto real põe o contexto em `running`, algo é tocado e nada falha ao decodificar.
 * playwright.build.config.ts, `npm run test:e2e:build`. O caso do dev/celular e os controles negativos estão em tests/e2e/audio-soa.spec.ts.
 */
import { expect, test, type Response } from '@playwright/test';
import { ESPIAO } from '../e2e/_audio-espiao';

test.describe.configure({ timeout: 120_000 });

test('2ª visita com o SW ativo: manifesto de sons e base.mp3 vêm do SW na revisão desta versão, e o áudio sobe a running', async ({ context, request }) => {
  const { commit } = (await (await request.get('/version.json')).json()) as { commit: string };
  expect(commit).toMatch(/^[0-9a-f]{7,}$|^dev$/);

  // 1ª visita: instala o SW (e já o deixa controlar)
  const primeira = await context.newPage();
  await primeira.goto('/');
  await expect(primeira.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await primeira.evaluate(() => navigator.serviceWorker.ready.then(() => undefined));
  await primeira.close();

  // 2ª visita: página nova no mesmo contexto (mesmos caches e SW)
  const page = await context.newPage();
  await page.addInitScript(ESPIAO);
  const respostas: Response[] = [];
  page.on('response', (r) => {
    if (/\/assets\/sons\/(manifesto\.json|base\.mp3)/.test(r.url())) respostas.push(r);
  });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  expect(await page.evaluate(() => navigator.serviceWorker.controller !== null), 'a 2ª visita nasce sob o controle do SW').toBe(true);

  await page.keyboard.press('Enter'); // gesto real: só ele libera o áudio e dispara o download da `base` (etapa 2 do boot)
  await expect.poll(() => respostas.some((r) => r.url().includes('base.mp3')), { timeout: 20_000, message: 'base.mp3 tem de ser pedida depois do 1º gesto' }).toBe(true);
  await expect.poll(() => respostas.some((r) => r.url().includes('manifesto.json')), { timeout: 20_000 }).toBe(true);

  for (const nome of ['manifesto.json', 'base.mp3']) {
    const r = respostas.find((x) => x.url().includes(nome))!;
    expect(r.url(), `${nome}: revisão desta versão`).toContain(`?v=${commit}`);
    expect(r.status(), nome).toBe(200);
    expect(r.fromServiceWorker(), `${nome} tem de vir do service worker`).toBe(true);
    expect((await r.body()).length, `${nome} não pode vir vazio`).toBeGreaterThan(10_000);
  }
  expect(respostas.find((x) => x.url().includes('manifesto.json'))!.headers()['content-type']).toContain('json');
  expect(respostas.find((x) => x.url().includes('base.mp3'))!.headers()['content-type']).toMatch(/audio\//);

  await page.waitForFunction(() => (window as unknown as { __aud: { ctxs: Array<{ state: string }> } }).__aud.ctxs.some((c) => c.state === 'running'), null, { timeout: 8000 });
  await page.waitForFunction(
    () => {
      const L = (window as unknown as { __aud: { decodeOk: number; fontes: number; osc: number } }).__aud;
      return L.decodeOk > 0 && L.fontes + L.osc > 0;
    },
    null,
    { timeout: 15_000 },
  );
  expect(await page.evaluate(() => (window as unknown as { __aud: { decodeErr: string[] } }).__aud.decodeErr)).toEqual([]);
});
