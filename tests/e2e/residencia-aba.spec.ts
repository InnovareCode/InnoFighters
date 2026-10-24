/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { esperarVitrine } from './_arte';
import { SEM_PROVOCACAO } from './_luta';

/*
 * L6 da residência de memória (docs/spec-residencia-de-memoria.md §2.2 "aba oculta" e §5): com a aba oculta o jogo solta tudo o que a cena atual não usa (atlas, cenários e as
 * silhuetas todas, que o iOS cobra como canvas); ao voltar a tabela da cena atual é reaplicada e a vitrine volta em segundo plano. Em `?residencia=fixa` nada disso acontece
 * (o rollback). A visibilidade é simulada como o navegador faria: `document.hidden` + o evento `visibilitychange`.
 */
test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

const visibilidade = (page: Page, oculta: boolean): Promise<void> =>
  page.evaluate((o) => {
    Object.defineProperty(document, 'hidden', { value: o, configurable: true });
    document.dispatchEvent(new Event('visibilitychange'));
  }, oculta);

const estado = (page: Page): Promise<{ atlas: string[]; cenarios: string[]; silhuetas: number }> =>
  hook(page, '(h) => { const m = h.mundo().arte.memoria(); return { atlas: Object.keys(m.atlas).sort(), cenarios: Object.keys(m.cenarios).sort(), silhuetas: m.silhuetas }; }');

async function abrirNoMenu(page: Page, query: string): Promise<void> {
  await page.goto(`/?seed=7&expansao=1&trailer=0${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  if (!query.includes('residencia=fixa')) await esperarVitrine(page); // T4: o data-pronto é só a etapa 0; o teste parte do menu com a vitrine na memória
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('menu'); }`);
  // dá silhueta ao cache: desenha o HAYATO levando um flash
  await hook(page, `(h) => { const a = h.mundo().arte.atlas.get('hayato'); const pd = Object.values(h.mundo().elenco.hayato.ch.pd)[0]; try { h.mundo().elenco.hayato.arte.silhuetaDe(pd); } catch (e) {} void a; }`);
}

test("residência por peso: aba oculta solta o que o menu não usa; ao voltar a vitrine reaparece", async ({ page }, info) => {
  await abrirNoMenu(page, '');
  expect(await hook(page, '(h) => h.mundo().arte.politica')).toBe('por-peso');
  const antes = await estado(page);
  expect(antes.atlas).toEqual(expect.arrayContaining(['hayato', 'wei-long', 'min-ji', 'caio']));
  expect(antes.cenarios).toEqual(expect.arrayContaining(['jp', 'cn', 'kr', 'br']));
  await visibilidade(page, true);
  const oculta = await estado(page);
  info.annotations.push({ type: 'aba oculta (menu)', description: `antes: ${antes.atlas.length} atlas, ${antes.cenarios.length} cenários | oculta: ${JSON.stringify(oculta)}` });
  expect(oculta.atlas, 'só o que o menu usa (VITRINE[0])').toEqual(['hayato']);
  expect(oculta.cenarios, 'só o fundo dos menus').toEqual(['jp']);
  expect(oculta.silhuetas, 'as silhuetas todas').toBe(0);
  await visibilidade(page, false);
  await page.waitForFunction(() => (window as any).__inno.mundo().arte.lutadoresResidentes().length >= 4, undefined, { timeout: 60_000 });
  const volta = await estado(page);
  expect(volta.atlas).toEqual(expect.arrayContaining(['hayato', 'wei-long', 'min-ji', 'caio']));
  expect(volta.cenarios).toContain('jp');
  expect(await hook(page, '(h) => h.ui.esperandoArte')).toBe(false);
  expect(await hook(page, '(h) => h.mundo().fundo.vezesSemFundo')).toBe(0);
});

test('na luta a aba oculta não mexe no que ela usa (a dupla e o cenário) e a luta pausa', async ({ page }) => {
  await page.goto('/?seed=7&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const cfg = JSON.stringify({ cfg: { mode: 'versus', c1: 'nila', c2: 'aminu', cpu: null, esquiva: false } });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg}); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
  const antes = await estado(page);
  await visibilidade(page, true);
  expect(await estado(page)).toEqual({ ...antes, silhuetas: 0 });
  expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(true);
  await visibilidade(page, false);
  expect((await estado(page)).atlas).toEqual(['aminu', 'nila']);
});

test("rollback `?residencia=fixa`: aba oculta e de volta não mudam nada na memória", async ({ page }) => {
  await abrirNoMenu(page, '&residencia=fixa');
  expect(await hook(page, '(h) => h.mundo().arte.politica')).toBe('fixa');
  const antes = await estado(page);
  await visibilidade(page, true);
  const oculta = await estado(page);
  expect(oculta.atlas).toEqual(antes.atlas);
  expect(oculta.cenarios).toEqual(antes.cenarios);
  await visibilidade(page, false);
  expect((await estado(page)).atlas).toEqual(antes.atlas);
});
