/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * L5 da residência de memória (docs/spec-residencia-de-memoria.md §3.4 e §6 S3): a CHEGADA SUAVE. A vitrine volta em segundo plano depois de uma luta; um herói cuja arte
 * chega com o título já aberto (aqui, o atlas da CAIO atrasado 2 s por rota) sobe de 0 a 1 em 12 ticks, sem salto. Mede-se a opacidade que a fileira do título pede a cada
 * quadro (o retorno de `ChegadaDeArte.alfa` da CAIO), em tempo real.
 */
test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

test('o atlas da CAIO chega 2 s depois do título abrir: a opacidade dele sobe de 0 a 1 em >= 10 ticks, monótona e sem salto', async ({ page }, info) => {
  await page.goto('/?seed=7&manual=1&expansao=1&trailer=0');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  expect(await hook(page, '(h) => h.mundo().arte.politica')).toBe('por-peso');
  // a luta solta a vitrine; só depois disso o atraso entra (o boot carregou a CAIO sem demora)
  const cfg = JSON.stringify({ cfg: { mode: 'versus', c1: 'hayato', c2: 'min-ji', cpu: null, esquiva: false } });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg}); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  expect(await hook(page, '(h) => h.mundo().arte.lutadoresResidentes().includes("caio")')).toBe(false);
  await page.route('**/assets/lutadores/caio/**', async (rota) => {
    await new Promise((r) => setTimeout(r, 2000));
    await rota.continue();
  });
  await hook(
    page,
    `(h) => { const c = h.ui.cenas.title.chegada; const orig = c.alfa.bind(c); window.__alfas = [];
      c.alfa = (id, pronta, t) => { const a = orig(id, pronta, t); if (id === 'caio') window.__alfas.push([t, a, pronta]); return a; }; }`,
  );
  await hook(page, `(h) => h.ui.go('title')`);
  // modo manual: UM tick por vez, desenhando a cada tick (a rampa é função do tick; o laço de tempo real desenha a 10 Hz numa máquina ocupada e amostraria de 6 em 6)
  // 1º a troca de cena (fade + a espera no preto), SEM desenhar: é rápida e fica muito aquém dos 2 s do atraso
  await page.waitForFunction(() => { const h = (window as any).__inno; h.avancar(1); return h.ui.name === 'title' && h.ui.fadeTo === null; }, undefined, { timeout: 30_000, polling: 5 });
  expect(await hook(page, '(h) => h.mundo().arte.lutadoresResidentes().includes("caio")'), 'o título abriu antes de a CAIO chegar').toBe(false);
  let residente = false;
  for (let i = 0; i < 1500 && !residente; i++) {
    await hook(page, '(h) => { h.avancar(1); h.desenhar(1); }');
    await page.waitForTimeout(8);
    residente = await hook(page, '(h) => h.ui.name === "title" && h.mundo().arte.lutadoresResidentes().includes("caio")');
  }
  expect(residente, 'a CAIO chegou').toBe(true);
  await hook(page, '(h) => { for (let i = 0; i < 40; i++) { h.avancar(1); h.desenhar(1); } }');
  const amostras: Array<[number, number, boolean]> = await page.evaluate('window.__alfas');
  // um valor por tick (o desenho pode repetir o mesmo tick)
  const porTick = new Map<number, number>();
  for (const [t, a] of amostras) porTick.set(t, a);
  const serie = [...porTick.entries()].sort((x, y) => x[0] - y[0]);
  info.annotations.push({ type: 'opacidade da CAIO', description: `${serie.length} ticks; ${serie.filter(([, a]) => a > 0 && a < 1).length} intermediários; primeira ${serie[0]?.[1]}, última ${serie.at(-1)?.[1]}` });
  expect(serie.length).toBeGreaterThan(30);
  expect(serie[0]?.[1], 'a CAIO ainda não tinha chegado quando o título abriu').toBe(0);
  expect(serie.at(-1)?.[1], 'depois de chegar fica em 1').toBe(1);
  const intermediarios = serie.filter(([, a]) => a > 0 && a < 1);
  expect(intermediarios.length, 'a rampa dura pelo menos 10 ticks').toBeGreaterThanOrEqual(10);
  for (let i = 1; i < serie.length; i++) {
    const [t0, a0] = serie[i - 1] as [number, number];
    const [t1, a1] = serie[i] as [number, number];
    expect(a1, `monótona (ticks ${t0} -> ${t1})`).toBeGreaterThanOrEqual(a0);
    expect(a1 - a0, `sem salto (ticks ${t0} -> ${t1})`).toBeLessThanOrEqual((t1 - t0) / 12 + 1e-9);
  }
  // nenhum quadro da volta caiu na reserva do fundo
  expect(await hook(page, '(h) => h.mundo().fundo.vezesSemFundo')).toBeLessThanOrEqual(2); // os 2 quadros da entrada na luta (cenário ainda a caminho)
});
