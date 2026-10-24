/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * L4 da residência de memória (docs/spec-residencia-de-memoria.md §3 e §6 S1, S2, S4): a VOLTA AO MENU SEM PISCAR com `?residencia=peso`, em tempo real (o laço do jogo anda sozinho).
 * Um rastro por tick (instalado em `ui.update`) registra, depois de cada tick: a cena, o fade, se a troca está presa no preto, se o essencial do destino está pronto, o contador
 * `vezesSemFundo` (quadros que caíram na reserva do fundo) e os bytes de atlas + cenários.
 *  - S1: no 1º tick com `fadeDir === -1` (a cena nova começa a aparecer) o essencial dela está pronto.
 *  - S2: nenhuma espera no preto passa de 45 ticks; luta -> resultado espera 0.
 *  - S4: `vezesSemFundo === 0` em toda a volta.
 * Percursos: luta -> resultado -> menu e treino -> TROCAR -> seleção.
 */
test.describe.configure({ timeout: 240_000 });

const MIB = 1024 * 1024;
const TETO_DO_PRETO = 45;
const TETO_FORA_DA_LUTA = 136;

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function abrir(page: Page, url: string): Promise<void> {
  await page.addInitScript(() => {
    if (!window.localStorage.getItem('inno-fighters-v1')) {
      window.localStorage.setItem('inno-fighters-v1', JSON.stringify({ v: 1, s: { music: 0, sfx: 0, rounds: 1, time: 99, diff: 0, shake: true }, hi: 0 }));
    }
  });
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

const naCena = (page: Page, nome: string, timeout = 40_000): Promise<unknown> =>
  page.waitForFunction((n) => (window as any).__inno.ui.name === n && (window as any).__inno.ui.fadeTo === null, nome, { timeout });

/** Instala o rastro por tick: tudo o que a volta ao menu precisa provar sai daqui. */
const INSTALAR_RASTRO = `(h) => {
  const ui = h.ui; const orig = ui.update.bind(ui); const rastro = []; window.__rastro = rastro;
  const MIB = ${MIB};
  const pronto = (a) => ({
    menu: a.estaPronto({ lutadores: ['hayato'], cenarios: ['jp'] }),
    select: a.estaPronto({ cenarios: ['jp'] }),
    result: a.estaPronto({ lutadores: [h.mundo().game.p1.id, h.mundo().game.p2.id], cenarios: ['jp'] }),
  });
  ui.update = () => {
    orig();
    const a = h.mundo().arte; const m = a.memoria();
    let b = 0; for (const k in m.atlas) b += m.atlas[k]; for (const k in m.cenarios) b += m.cenarios[k];
    rastro.push({ n: ui.name, f: ui.fade, d: ui.fadeDir, to: ui.fadeTo, t: ui.t, esp: ui.esperandoArte, sem: h.mundo().fundo.vezesSemFundo, p: pronto(a), mib: b / MIB });
  };
}`;

interface Tick {
  n: string;
  f: number;
  d: number;
  to: string | null;
  t: number;
  esp: boolean;
  sem: number;
  p: { menu: boolean; select: boolean; result: boolean };
  mib: number;
}
const rastro = (page: Page): Promise<Tick[]> => page.evaluate('window.__rastro');

/** Quadros que caíram na reserva do fundo desde o 1º tick do rastro (a luta já estava de pé; a entrada na luta, que usa o jp como reserva do cenário que ainda não chegou, fica de fora). */
const semFundo = (r: Tick[]): number => (r.at(-1)?.sem ?? 0) - (r[0]?.sem ?? 0);

/** Ticks presos no preto, por destino (troca pendente com o fade já em 1). */
function presos(r: Tick[]): Record<string, number> {
  const por: Record<string, number> = {};
  for (const x of r) if (x.to !== null && x.f === 1) por[x.to] = (por[x.to] ?? 0) + 1;
  return por;
}

/** O 1º tick em que a cena `nome` começa a aparecer (`fadeDir === -1`) depois do índice `de`. */
const primeiroVisivel = (r: Tick[], nome: string, de = 0): Tick | undefined => r.slice(de).find((x) => x.n === nome && x.d === -1);

async function lutaAteOResultado(page: Page): Promise<void> {
  const cfg = JSON.stringify({ cfg: { mode: 'versus', c1: 'nila', c2: 'aminu', cpu: null, esquiva: false, motorV2: { filmes: true } } });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg}); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
  await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 60_000 });
  await page.waitForFunction(() => (window as any).__inno.mundo().arte.filmesResidentes().length === 2, undefined, { timeout: 60_000 });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; }`);
  await hook(page, INSTALAR_RASTRO);
  // KO do P2: o round único acaba, o fim da luta solta a FILME e pede o jp em segundo plano
  await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 0; g.resolverVidaZerada(g.p2, g.p1); }');
  await page.waitForFunction(() => { const g = (window as any).__inno.mundo().game; return g.phase === 'matchend' && g.t > 45; }, undefined, { timeout: 60_000 });
}

test.describe("S1, S2, S4: volta ao menu sem piscar ('por-peso')", () => {
  test('luta -> resultado -> menu: o fim da luta solta a FILME e traz o jp; resultado espera 0; o menu nasce com a arte pronta e sem fundo faltando', async ({ page }, info) => {
    await abrir(page, '/?seed=7&expansao=1&residencia=peso&trailer=0');
    await lutaAteOResultado(page);
    // o gancho do fim da luta (antes mesmo do ENTER): a FILME saiu e o jp está voltando (ou já voltou)
    expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()'), 'a FILME sai no fim da luta').toEqual([]);
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.cenarios.has('jp'), undefined, { timeout: 30_000 });

    await hook(page, `(h) => { h.ui.key('Enter'); }`); // pula o matchend
    await naCena(page, 'result');
    await page.waitForTimeout(300);
    await hook(page, `(h) => { h.ui.key('Escape'); }`); // volta ao menu principal
    await naCena(page, 'menu');
    // a vitrine volta em segundo plano, uma de cada vez
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.lutadoresResidentes().length >= 4, undefined, { timeout: 60_000 });
    const r = await rastro(page);

    const parados = presos(r);
    const visResult = primeiroVisivel(r, 'result');
    const visMenu = primeiroVisivel(r, 'menu');
    info.annotations.push({
      type: 'volta ao menu',
      description: `ticks presos no preto: ${JSON.stringify(parados)} | pico atlas+cenários ${Math.max(...r.map((x) => x.mib)).toFixed(1)} MiB | vezesSemFundo na volta ${semFundo(r)} | ${r.length} ticks rastreados`,
    });
    // S2: luta -> resultado espera 0 (o jp já tinha voltado no fim da luta); nenhuma espera passa de 45
    expect(parados['result'] ?? 0, 'luta -> resultado espera 0 ticks no preto').toBe(0);
    for (const [destino, n] of Object.entries(parados)) expect(n, `espera para ${destino}`).toBeLessThanOrEqual(TETO_DO_PRETO);
    // S1: no 1º tick visível o essencial do destino está pronto
    expect(visResult, 'o resultado apareceu').toBeDefined();
    expect(visResult?.p.result, 'resultado: essencial pronto quando começa a aparecer').toBe(true);
    expect(visMenu, 'o menu apareceu').toBeDefined();
    expect(visMenu?.p.menu, 'menu: essencial pronto quando começa a aparecer').toBe(true);
    // S4: o fundo nunca faltou, em nenhum quadro desenhado
    expect(semFundo(r), 'vezesSemFundo na volta').toBe(0);
    // o teto fora da luta vale na volta inteira (atlas + cenários, sem retratos)
    expect(Math.max(...r.map((x) => x.mib))).toBeLessThanOrEqual(TETO_FORA_DA_LUTA);
    expect(await hook(page, '(h) => h.ui.esperandoArte')).toBe(false);
  });

  test('treino -> pausa -> TROCAR PERSONAGENS -> seleção: o jp volta antes da seleção aparecer', async ({ page }, info) => {
    await abrir(page, '/?seed=7&expansao=1&residencia=peso&trailer=0');
    const cfg = JSON.stringify({ cfg: { mode: 'training', c1: 'nila', c2: 'aminu', cpu: null, esquiva: false } });
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg}); (${SEM_PROVOCACAO})(h); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 60_000 });
    expect(await hook(page, '(h) => h.mundo().arte.cenarios.has("jp")'), 'na luta o jp não está na memória').toBe(false);
    await hook(page, INSTALAR_RASTRO);
    const tecla = (k: string): Promise<unknown> => hook(page, `(h) => { h.ui.key('${k}'); }`);
    await tecla('Escape');
    for (let i = 0; i < 5; i++) await tecla('ArrowDown');
    await tecla('Enter'); // TROCAR PERSONAGENS
    await naCena(page, 'select');
    await page.waitForTimeout(500);
    const r = await rastro(page);
    const parados = presos(r);
    const vis = primeiroVisivel(r, 'select');
    info.annotations.push({ type: 'treino -> seleção', description: `ticks presos no preto: ${JSON.stringify(parados)} | vezesSemFundo na volta ${semFundo(r)}` });
    for (const [destino, n] of Object.entries(parados)) expect(n, `espera para ${destino}`).toBeLessThanOrEqual(TETO_DO_PRETO);
    expect(vis, 'a seleção apareceu').toBeDefined();
    expect(vis?.p.select, 'seleção: o jp está pronto quando ela começa a aparecer').toBe(true);
    expect(semFundo(r), 'vezesSemFundo na volta').toBe(0);
    expect(await hook(page, '(h) => h.ui.esperandoArte')).toBe(false);
  });

  test('controle negativo: com o jp fora da memória e nenhuma carga a caminho, o contador de fundo faltando sobe (o teste enxerga)', async ({ page }) => {
    await abrir(page, '/?seed=7&manual=1&expansao=1&residencia=peso&trailer=0');
    const cfg = JSON.stringify({ cfg: { mode: 'versus', c1: 'nila', c2: 'aminu', cpu: null, esquiva: false } });
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${cfg}); (${SEM_PROVOCACAO})(h); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    expect(await hook(page, '(h) => h.mundo().fundo.vezesSemFundo')).toBe(0);
    // desenha um menu na marra, sem passar pelo Navegador (que traria o jp): o fundo falta e é contado
    await hook(page, `(h) => { h.ui.scene = h.ui.cenas.options; h.ui.name = 'options'; h.desenhar(1); }`);
    expect(await hook(page, '(h) => h.mundo().fundo.vezesSemFundo')).toBeGreaterThan(0);
  });
});

test.describe("política 'fixa': a troca nunca espera e o fundo nunca falta (igual a hoje)", () => {
  test('luta -> resultado -> menu em tempo real: nenhum tick preso, jp sempre presente', async ({ page }) => {
    await abrir(page, '/?seed=7&expansao=1&residencia=fixa&trailer=0');
    await lutaAteOResultado(page);
    await hook(page, `(h) => { h.ui.key('Enter'); }`);
    await naCena(page, 'result');
    await hook(page, `(h) => { h.ui.key('Escape'); }`);
    await naCena(page, 'menu');
    const r = await rastro(page);
    expect(presos(r)).toEqual({});
    expect(semFundo(r)).toBe(0);
    expect(r.some((x) => x.esp)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------
// O fluxo longo inteiro, em tempo real e pela UI: título -> menu -> seleção (VERSUS) -> VS -> luta -> KO -> resultado -> menu. Nas duas políticas.
for (const politica of ['peso', 'fixa'] as const) {
  test(`fluxo longo com ?residencia=${politica}: título -> menu -> seleção -> VS -> luta -> resultado -> menu`, async ({ page }, info) => {
    await abrir(page, `/?seed=7&expansao=1&residencia=${politica}&trailer=0`);
    const tecla = (k: string): Promise<unknown> => hook(page, `(h) => { h.ui.key('${k}'); }`);
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('title'); }`);
    await hook(page, INSTALAR_RASTRO);
    await tecla('Enter');
    await naCena(page, 'menu');
    await tecla('ArrowDown'); // VERSUS 2 JOGADORES
    await tecla('Enter');
    await naCena(page, 'select');
    // P1 escolhe NILA (Enter), P2 escolhe AMINU (j)
    await hook(page, `(h) => { const s = h.ui.scene; s.cur[0] = s.grade.indexOf('nila'); s.cur[1] = s.grade.indexOf('aminu'); }`);
    await tecla('Enter');
    await tecla('j');
    await naCena(page, 'vs');
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 90_000 });
    const naVs = await hook(page, '(h) => { const a = h.mundo().arte; return { atlas: Object.keys(a.memoria().atlas).sort(), cenarios: Object.keys(a.memoria().cenarios).sort() }; }');
    if (politica === 'peso') expect(naVs, 'na VS só a dupla e o cenário').toEqual({ atlas: ['aminu', 'nila'], cenarios: ['ng'] });
    else expect(naVs.atlas, "'fixa': a vitrine segue na memória").toEqual(expect.arrayContaining(['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'nila']));
    await page.waitForTimeout(800);
    await tecla('Enter'); // pula o confronto
    await naCena(page, 'fight');
    await hook(page, SEM_PROVOCACAO);
    await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 60_000 });
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 0; g.resolverVidaZerada(g.p2, g.p1); }');
    await page.waitForFunction(() => { const g = (window as any).__inno.mundo().game; return g.phase === 'matchend' && g.t > 45; }, undefined, { timeout: 60_000 });
    await tecla('Enter');
    await naCena(page, 'result');
    await page.waitForTimeout(300);
    await tecla('Escape');
    await naCena(page, 'menu');
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.lutadoresResidentes().length >= 4, undefined, { timeout: 60_000 });
    const r = await rastro(page);
    const vis = primeiroVisivel(r, 'menu', r.findIndex((x) => x.n === 'result'));
    info.annotations.push({ type: `fluxo longo (${politica})`, description: `presos ${JSON.stringify(presos(r))} | vezesSemFundo ${r.at(-1)?.sem} | pico ${Math.max(...r.map((x) => x.mib)).toFixed(1)} MiB` });
    expect(vis?.p.menu, 'o menu aparece com a arte pronta').toBe(true);
    for (const n of Object.values(presos(r))) expect(n).toBeLessThanOrEqual(politica === 'peso' ? TETO_DO_PRETO : 0);
    expect(r.at(-1)?.sem, 'o fundo nunca faltou em todo o fluxo').toBe(0);
    const fim = await hook(page, '(h) => h.mundo().arte.lutadoresResidentes().sort()');
    expect(fim).toEqual(expect.arrayContaining(['hayato', 'wei-long', 'min-ji', 'caio']));
    expect(await hook(page, '(h) => h.ui.esperandoArte')).toBe(false);
  });
}
