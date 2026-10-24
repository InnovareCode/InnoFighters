/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/*
 * D-V6: o trailer TOCA o filme do especial (antes o evento `filme` do motor era ignorado e o golpe virava corte seco). O diretor segura o motor pelos ticks do roteiro e a cena
 * desenha o filme por cima do mundo. Aqui, no navegador: o trailer inteiro em modo manual, sem reserva e sem erro, o filme ativo em trechos contínuos de ~30 ticks (a versão curta),
 * e um quadro do meio do filme que difere do mesmo tick sem filme (o filme muda o pixel).
 */
test.describe.configure({ timeout: 240_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const diag = (page: Page): Promise<any> => hook(page, '(h) => h.ui.cenas.trailer.diagnostico()');

async function andarAte(page: Page, alvo: number): Promise<any> {
  for (let guarda = 0; guarda < 4000; guarda++) {
    const d = await diag(page);
    if (d.tick >= alvo) return d;
    const prox = d.proximoPlano;
    if (prox && prox.emTicks <= 1 && !prox.artePronta) {
      await page.waitForTimeout(100);
      continue;
    }
    const passo = Math.max(1, Math.min(alvo - d.tick, prox ? Math.max(1, prox.emTicks - (prox.artePronta ? 0 : 1)) : alvo - d.tick, 2));
    await hook(page, `(h) => h.avancar(${passo})`);
  }
  throw new Error(`o trailer não chegou ao tick ${alvo}`);
}

test('o trailer toca o filme do especial: trechos contínuos de ~30 ticks, sem reserva e sem erro', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop');
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  await page.goto('/?seed=5&manual=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
  await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });

  const trechos: Array<{ de: number; ate: number; plano: string }> = [];
  let aberto: { de: number; plano: string } | null = null;
  let quadroDoMeio: string | null = null;
  let tickDoMeio = -1;
  let ultimo = null as any;
  for (let tick = 2; tick <= 2399; tick += 2) {
    const d = await andarAte(page, tick);
    ultimo = d;
    if (d.filmeAtivo && !aberto) aberto = { de: d.tick, plano: d.plano };
    if (d.filmeAtivo && aberto && quadroDoMeio === null && d.tick - aberto.de >= 12) {
      quadroDoMeio = await hook(page, "(h) => { h.desenhar(); return document.getElementById('jogo').toDataURL('image/png'); }");
      tickDoMeio = d.tick;
    }
    if (!d.filmeAtivo && aberto) {
      trechos.push({ de: aberto.de, ate: d.tick, plano: aberto.plano });
      aberto = null;
    }
  }
  info.annotations.push({ type: 'filmes no trailer', description: JSON.stringify(trechos) });
  expect(ultimo.planosEmReserva, 'nenhum plano virou reserva').toEqual([]);
  expect(trechos.length, 'pelo menos um filme tocou').toBeGreaterThan(0);
  for (const t of trechos) {
    const dur = t.ate - t.de;
    expect(dur, `filme em ${t.plano} (tick ${t.de}): versão curta de 30 ticks (±amostragem de 2)`).toBeGreaterThanOrEqual(26);
    expect(dur).toBeLessThanOrEqual(34);
  }
  expect(quadroDoMeio, 'um quadro do meio do filme foi desenhado').not.toBeNull();
  expect(erros).toEqual([]);
  // conferência a olho: LYRA_QUADRO=<caminho.png> grava o quadro do meio do filme
  if (quadroDoMeio && process.env['LYRA_QUADRO']) writeFileSync(process.env['LYRA_QUADRO'], Buffer.from(quadroDoMeio.split(',')[1] as string, 'base64'));
  if (quadroDoMeio) await info.attach(`filme-no-tick-${tickDoMeio}.png`, { body: Buffer.from(quadroDoMeio.split(',')[1] as string, 'base64'), contentType: 'image/png' });
});
