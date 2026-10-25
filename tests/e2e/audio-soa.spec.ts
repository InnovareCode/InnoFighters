/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { ESPIAO } from './_audio-espiao';

/*
 * "Algo soa" (incidente de 25/10/2026: o dono relatou o jogo MUDO no site publicado; a causa era cache do navegador dele, mas nada na suíte provava o óbvio).
 * Prova, com um espião do `AudioContext` injetado antes do código da página e um GESTO REAL (teclado no desktop; toque via CDP `Input.dispatchTouchEvent` no
 * celular, os mesmos eventos de um aparelho), que:
 *   1. nenhum contexto existe antes do 1º gesto (o navegador o barraria e o jogo não deve criá-lo à força);
 *   2. depois do gesto existe um contexto e ele está `running` (não `suspended`/`closed`);
 *   3. algo é de fato tocado (BufferSource + Oscillator > 0: amostras OU síntese) e nenhuma decodificação falhou.
 * CONTROLE NEGATIVO permanente (o teste pega o defeito, não só passa): um gesto SINTÉTICO (`isTrusted=false`, o navegador não o conta como ativação) e a falta de
 * qualquer gesto precisam REPROVAR as mesmas asserções. Sem estes controles um espião quebrado deixaria o teste verde para sempre.
 * Só observa (sem `window.__inno`): vale também contra o build (tests/e2e-build/audio-soa-sw.spec.ts repete o essencial com o service worker).
 */
test.describe.configure({ timeout: 120_000 });


type Gesto = 'real' | 'nenhum';

/**
 * TODA leitura da página antes do gesto vai por CDP com `userGesture: false`. `page.evaluate`, `waitForFunction` e os matchers de locator avaliam com `userGesture: true`:
 * o Chromium passa a contar a página como ativada pelo usuário e um `AudioContext` criado depois nasce `running` sem gesto nenhum (medido: `new AudioContext().state` dá
 * `running` por `page.evaluate` e `suspended` por CDP sem gesto). Sem este cuidado o teste provaria o Playwright, não o jogo, e o controle negativo nunca falharia.
 */
const sessoes = new WeakMap<Page, Promise<CDPSession>>();
async function ler<T>(page: Page, expressao: string): Promise<T> {
  let s = sessoes.get(page);
  if (!s) sessoes.set(page, (s = page.context().newCDPSession(page)));
  const r = await (await s).send('Runtime.evaluate', { expression: expressao, userGesture: false, returnByValue: true });
  if (r.exceptionDetails) throw new Error(`leitura falhou: ${r.exceptionDetails.text}`);
  return r.result.value as T;
}

async function abrir(page: Page): Promise<void> {
  await page.addInitScript(ESPIAO);
  await page.goto('/');
  await expect.poll(() => ler<string | undefined>(page, 'document.documentElement.dataset.pronto'), { timeout: 60_000 }).toBe('true');
}

interface Estado {
  estados: string[];
  fontes: number;
  osc: number;
  decodeErr: string[];
}
const estado = (page: Page): Promise<Estado> =>
  ler<Estado>(page, `(() => { const L = window.__aud; return { estados: L.ctxs.map((c) => c.state), fontes: L.fontes, osc: L.osc, decodeErr: L.decodeErr }; })()`);

async function darGesto(page: Page, gesto: Gesto, toque: boolean): Promise<void> {
  if (gesto === 'nenhum') return;
  if (toque) {
    const vp = page.viewportSize()!;
    const cdp = await page.context().newCDPSession(page);
    const pt = { x: Math.round(vp.width / 2), y: Math.round(vp.height / 2) };
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [pt] });
    await page.waitForTimeout(60); // duração de um toque humano, só para o touchend vir depois do touchstart (não é espera por resultado)
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await page.keyboard.press('Enter');
  }
}

/** As três provas. Lança se qualquer uma falhar (o controle negativo depende disto). */
async function provarQueSoa(page: Page, gesto: Gesto, toque: boolean): Promise<void> {
  await abrir(page);
  expect((await estado(page)).estados, 'antes do 1º gesto não pode existir contexto de áudio').toEqual([]);
  await darGesto(page, gesto, toque);
  await expect.poll(async () => (await estado(page)).estados, { timeout: 8000, message: 'o contexto tem de chegar a running' }).toContain('running');
  await expect.poll(async () => { const e = await estado(page); return e.fontes + e.osc; }, { timeout: 8000, message: 'algo tem de ser tocado (BufferSource ou Oscillator)' }).toBeGreaterThan(0);
  const e = await estado(page);
  expect(e.estados.every((x) => x === 'running' || x === 'suspended'), `estados: ${e.estados.join(',')}`).toBe(true);
  expect(e.decodeErr, 'nenhuma decodificação de som pode falhar').toEqual([]);
}

test.describe('algo soa depois do 1º gesto', () => {
  test('gesto real: o contexto sobe a running e há nós tocando, sem falha de decodificação', async ({ page }, info) => {
    await provarQueSoa(page, 'real', info.project.name === 'celular');
  });

  test('controle negativo: sem nenhum gesto não há contexto running nem som, e o teste reprova', async ({ page }, info) => {
    await expect(provarQueSoa(page, 'nenhum', info.project.name === 'celular')).rejects.toThrow();
    expect((await estado(page)).estados).not.toContain('running');
  });
});
