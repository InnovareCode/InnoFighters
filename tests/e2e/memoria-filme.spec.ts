/* eslint-disable @typescript-eslint/no-explicit-any */
import { execFileSync } from 'node:child_process';
import { devices, expect, test, type Browser, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * V2-3e: memória da folha FILME do HAYATO (docs/orcamentos-2026-10-23.md §2/§3: 1920 x 1280 x 4 = 9,375 MiB decodificada) no PERFIL DE CELULAR (Pixel 7 do Playwright), HAYATO x HAYATO.
 * Duas medidas: (1) o que é determinístico: a imagem da folha na memória do jogo (tamanho decodificado) e o ciclo carregar/soltar; (2) o que depende da máquina: a memória DOS PROCESSOS
 * do Chromium (renderer + GPU), lida do Windows, com e sem a folha, em amostras alternadas, com GC forçado antes de ler. A segunda só vale com a máquina quieta: o teste anota a carga de CPU
 * antes de cada amostra e NÃO falha por ela; a asserção é folgada (a folha entre 5 e 20 MiB).
 */
test.describe.configure({ timeout: 300_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

/** MiB de trabalho (working set) e privados de um processo do Windows, pelo PowerShell. */
function memoriaDoProcesso(pid: number): { ws: number; priv: number } {
  const saida = execFileSync('powershell', ['-NoProfile', '-Command', `$p = Get-Process -Id ${pid}; "$($p.WorkingSet64) $($p.PrivateMemorySize64)"`], { encoding: 'utf8' }).trim().split(' ').map(Number);
  return { ws: (saida[0] ?? 0) / 1048576, priv: (saida[1] ?? 0) / 1048576 };
}

function cargaDaCpu(): number {
  const s = execFileSync('powershell', ['-NoProfile', '-Command', '(Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average'], { encoding: 'utf8' }).trim();
  return Number(s);
}

type Amostra = { com: boolean; fase: string; ws: number; priv: number; cpu: number };

async function amostrar(browser: Browser, baseURL: string, com: boolean, aposFilme: boolean): Promise<Amostra> {
  const { defaultBrowserType: _tipo, ...celular } = devices['Pixel 7'];
  const ctx = await browser.newContext({ ...celular, baseURL });
  const page = await ctx.newPage();
  try {
    if (!com) await page.route('**/assets/lutadores/hayato/filme.webp', (r) => r.abort());
    await page.goto('/?seed=7&manual=1&expansao=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const args = JSON.stringify({ cfg: { mode: 'versus', c1: 'hayato', c2: 'hayato', cpu: null, esquiva: false, motorV2: { filmes: true } } });
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${args}); (${SEM_PROVOCACAO})(h); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
    for (let i = 0; i < 300; i++) if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
    await hook(page, '(h) => h.avancar(5)');
    if (com) await page.waitForFunction(() => (window as any).__inno.mundo().arte.filmesResidentes().includes('hayato'), undefined, { timeout: 30_000 });
    // força a decodificação da folha inteira (o Chromium só a decodifica no primeiro desenho; carregada e nunca desenhada, ela quase não aparece na memória dos processos): um desenho 1 x 1 de uma folha de 1920 x 1280 decodifica tudo
    if (com) await hook(page, `(h) => { const i = h.mundo().arte.atlas.get('hayato').filmeImg; const c = document.createElement('canvas'); c.width = 1; c.height = 1; c.getContext('2d').drawImage(i, 0, 0, i.width ?? i.naturalWidth, i.height ?? i.naturalHeight, 0, 0, 1, 1); }`);
    if (aposFilme) {
      // toca um filme de verdade (desenha as células: força a decodificação/envio à GPU) e deixa a luta voltar
      await hook(page, `(h) => { const g = h.mundo().game; g.p1.x = 410; g.p2.x = 550; g.p1.facing = 1; g.p2.facing = -1; g.p1.en = 100; g.p1.startMove('sFwd', g); }`);
      await hook(page, `(h) => { const s = h.ui.scene; for (let i = 0; i < 300 && !s.filme.ativo; i++) h.avancar(1); for (let i = 0; i < 80 && s.filme.ativo; i++) { h.avancar(1); h.desenhar(1); } }`);
    }
    await page.waitForTimeout(1500);
    const cdp = await ctx.newCDPSession(page);
    await cdp.send('HeapProfiler.collectGarbage');
    await page.waitForTimeout(800);
    const info = await (await (page.context().browser() as Browser).newBrowserCDPSession()).send('SystemInfo.getProcessInfo');
    const pids = (info.processInfo as { type: string; id: number }[]).filter((p) => p.type === 'renderer' || p.type === 'GPU').map((p) => p.id);
    // o renderer da página é o maior renderer; o GPU soma
    const mem = pids.map((id) => memoriaDoProcesso(id));
    const cpu = cargaDaCpu();
    return { com, fase: aposFilme ? 'apos-filme' : 'carregada', ws: mem.reduce((s, m) => s + m.ws, 0), priv: mem.reduce((s, m) => s + m.priv, 0), cpu };
  } finally {
    await ctx.close();
  }
}

test('a folha FILME na memória do jogo: 1920 x 1280 x 4 = 9,375 MiB; só com a luta; solta no fim', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'perfil de celular');
  await page.goto('/?seed=7&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()'), 'no boot não há folha').toEqual([]);
  const args = JSON.stringify({ cfg: { mode: 'versus', c1: 'hayato', c2: 'hayato', cpu: null, esquiva: false, motorV2: { filmes: true } } });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${args}); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.mundo().arte.filmesResidentes().includes('hayato'), undefined, { timeout: 60_000 });
  const dims = await hook(page, '(h) => { const a = h.mundo().arte.atlas.get("hayato"); const i = a.filmeImg; return { w: i.width ?? i.naturalWidth, h: i.height ?? i.naturalHeight, residentes: h.mundo().arte.filmesResidentes() }; }');
  const mib = (dims.w * dims.h * 4) / 1048576;
  info.annotations.push({ type: 'folha FILME decodificada', description: `${dims.w} x ${dims.h} x 4 = ${mib.toFixed(3)} MiB; residentes ${JSON.stringify(dims.residentes)} (HAYATO x HAYATO = uma folha só)` });
  expect(mib).toBeCloseTo(9.375, 3);
  expect(dims.residentes).toEqual(['hayato']);
  await hook(page, `(h) => { h.ui.scene.exit(); }`);
  expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()'), 'soltou ao sair da luta').toEqual([]);
});

test('memória dos processos (renderer + GPU), perfil de celular, HAYATO x HAYATO: com a folha FILME x sem (amostras alternadas, GC forçado antes de ler)', async ({ browser, baseURL }, info) => {
  test.skip(info.project.name !== 'celular', 'perfil de celular');
  const N = 4;
  const amostras: Amostra[] = [];
  for (let i = 0; i < N; i++) {
    amostras.push(await amostrar(browser, baseURL!, false, false));
    amostras.push(await amostrar(browser, baseURL!, false, true)); // controle: toca o filme SEM a folha (pose Alt): separa o custo da folha do custo de tocar um filme
    amostras.push(await amostrar(browser, baseURL!, true, false));
    amostras.push(await amostrar(browser, baseURL!, true, true));
  }
  const mediana = (v: number[]): number => [...v].sort((a, b) => a - b)[Math.floor(v.length / 2)]!;
  const grupo = (com: boolean, fase: string, campo: 'ws' | 'priv'): number => mediana(amostras.filter((a) => a.com === com && (fase === '*' || a.fase === fase)).map((a) => a[campo]));
  const semWS = grupo(false, 'carregada', 'ws');
  const comWS = grupo(true, 'carregada', 'ws');
  const aposWS = grupo(true, 'apos-filme', 'ws');
  const semAposWS = grupo(false, 'apos-filme', 'ws');
  const semAposPriv = grupo(false, 'apos-filme', 'priv');
  const semPriv = grupo(false, 'carregada', 'priv');
  const comPriv = grupo(true, 'carregada', 'priv');
  const aposPriv = grupo(true, 'apos-filme', 'priv');
  const cpuMax = Math.max(...amostras.map((a) => a.cpu));
  const cpuMed = mediana(amostras.map((a) => a.cpu));
  info.annotations.push({
    type: 'memória dos processos (MiB, medianas de 4)',
    description: `working set: sem ${semWS.toFixed(1)} | com ${comWS.toFixed(1)} (+${(comWS - semWS).toFixed(1)}) | após tocar um filme ${aposWS.toFixed(1)} (+${(aposWS - semWS).toFixed(1)}); controle (filme tocado SEM a folha) ${semAposWS.toFixed(1)}, logo a folha custa ${(aposWS - semAposWS).toFixed(1)}; privada: sem ${semPriv.toFixed(1)} | com ${comPriv.toFixed(1)} (+${(comPriv - semPriv).toFixed(1)}) | após filme ${aposPriv.toFixed(1)} (+${(aposPriv - semPriv).toFixed(1)}), controle ${semAposPriv.toFixed(1)}, logo a folha custa ${(aposPriv - semAposPriv).toFixed(1)}; CPU da máquina nas amostras: mediana ${cpuMed}%, máx ${cpuMax}%`,
  });
  info.annotations.push({ type: 'amostras', description: JSON.stringify(amostras.map((a) => [a.com ? 'com' : 'sem', a.fase, +a.ws.toFixed(0), +a.priv.toFixed(0), a.cpu])) });
  // A asserção vale no par "carregada" (mesma luta, com x sem a folha, nada tocado), com a folha decodificada à força (ver `amostrar`): a folha de 9,4 MiB aparece como ~+12 a +15 MiB de working set
  // (renderer + GPU). A memória PRIVADA quase não se mexe (+2 a +5, dentro do ruído) e o par "após filme" subtrai dois valores que oscilam ~±8 MiB (+0,4, -2,7 e -3,4 com o código parado): nenhum dos dois serve de asserção.
  // Sem a folha (404, ou a carga quebrada) a diferença fica perto de 0.
  expect(comWS - semWS, 'a folha decodificada custa working set (7 a 30 MiB); perto de 0 = a folha não carregou').toBeGreaterThan(7);
  expect(comWS - semWS).toBeLessThan(30);
});
