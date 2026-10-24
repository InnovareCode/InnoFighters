/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * R-1 + R-2 (docs/spec-redesenho-jogabilidade.md §3.1/§3.2/§5.2, Lyra): o contador `window.__ritmo` (DEV) e a faixa SEM
 * CONGELAR da tarja do especial comum, por cima da flag `Regras.ritmo` (`tarja`/`provocacao`). Método da Íris (§5.2.2):
 * `?manual=1` + `h.avancar(n)` (o MESMO caminho de `ui.update()` do jogo real, só quem chama é o teste). Mede com a
 * flag LIGADA e DESLIGADA no MESMO cenário, para o antes/depois ser comparável — não dois jogos diferentes.
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 (`SALVAR_CAPTURAS=arte-fonte/ritmo npx playwright test ritmo-r1-r2`),
 * as 2 capturas antes/depois da tarja pedidas no handoff.
 */
test.describe.configure({ timeout: 180_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const PASTA = process.env['SALVAR_CAPTURAS'];

async function capturar(page: Page, nome: string): Promise<void> {
  if (!PASTA) return;
  mkdirSync(resolve(PASTA), { recursive: true });
  const png: string = await page.evaluate(() => {
    (window as any).__inno.desenhar();
    return (document.getElementById('jogo') as HTMLCanvasElement).toDataURL('image/png');
  });
  writeFileSync(resolve(PASTA, `${nome}.png`), Buffer.from(png.split(',')[1] as string, 'base64'));
}

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

const PERFIS = {
  desktop: { width: 1280, height: 720 },
  celular: { width: 844, height: 390 },
} as const;

async function abrirJogo(page: Page, perfil: keyof typeof PERFIS, query = ''): Promise<void> {
  await page.setViewportSize(PERFIS[perfil]);
  await page.goto(`/?seed=21&manual=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

/** Abre uma luta direto na cena (sem passar pelo menu) e espera a arte. Lutadores fixos (HAYATO/WEI LONG): fora do escopo da Vega (CAIO). */
async function abrirLuta(page: Page, cfg: Record<string, unknown> = {}, semProvocacao = false): Promise<void> {
  await hook(
    page,
    `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: true, ...cfg })} }); ${semProvocacao ? `(${SEM_PROVOCACAO})(h);` : ''} }`,
  );
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
}

/** Liga/desliga `Regras.ritmo` DEPOIS do boot (o teste não precisa de `?ritmo=` na URL: muta o contexto direto, como os outros e2e mutam `regras`/`persist`). */
const ritmo = (page: Page, r: Record<string, boolean> | null): Promise<any> => hook(page, `(h) => { h.ui.c.regras = { ...h.ui.c.regras, ritmo: ${JSON.stringify(r ?? {})} }; }`);

// ---------------------------------------------------------------------------------------------------------------------------------
// R-2: a tarja SEM congelar (flag `ritmo.tarja`)
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('R-2: a tarja do especial comum para de congelar a luta (Regras.ritmo.tarja)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'comportamento, não precisa dos 2 perfis'));

  test('flag DESLIGADA (padrão, sem regressão): o especial ainda congela — `game.tick` não anda enquanto a tarja (`cine`) está ativa', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await abrirLuta(page, {}, true);
    await ritmo(page, null); // explícito: {} = tudo desligado, o jogo de hoje
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; g.p1.x = 250; g.p2.x = 780; g.p1.facing = 1; g.p2.facing = -1; }');
    // sai do `intro` (90 ticks = 1,5 s, hoje): antes disso o motor ignora ataque. Daí sim o especial pode ser disparado.
    await hook(page, "(h) => { const g = h.mundo().game; let n = 0; while (g.phase !== 'fight' && n < 300) { h.avancar(1); n++; } }");
    // dispara o especial de verdade pelo TECLADO (tecla B, como em tarja-motor-v2.spec.ts): o `?manual=1` só desliga o laço em
    // tempo real, os listeners de teclado continuam reais — `h.avancar` lê o estado de tecla do jeito que o jogo real lê.
    await page.keyboard.down('b');
    await hook(page, '(h) => h.avancar(2)');
    await page.keyboard.up('b');
    expect(await hook(page, '(h) => h.ui.scene.cine.ativa'), 'a tarja congelante abriu').toBe(true);
    expect(await hook(page, '(h) => h.ui.scene.faixaRitmo.ativa'), 'sem a flag, a faixa SEM congelar não é usada').toBe(false);
    const tickAntes = await hook(page, '(h) => h.mundo().game.tick');
    await hook(page, '(h) => h.avancar(10)');
    const tickDepois = await hook(page, '(h) => h.mundo().game.tick');
    expect(tickDepois, 'o motor não andou: a cena só avançou o relógio da cinemática').toBe(tickAntes);
    expect(erros).toEqual([]);
  });

  test('flag LIGADA: o MESMO especial abre a faixa (não a tarja congelante) e `game.tick` continua andando, tick a tick', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await abrirLuta(page, {}, true);
    await ritmo(page, { tarja: true });
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; g.p1.x = 250; g.p2.x = 780; g.p1.facing = 1; g.p2.facing = -1; }');
    await hook(page, "(h) => { const g = h.mundo().game; let n = 0; while (g.phase !== 'fight' && n < 300) { h.avancar(1); n++; } }");
    await page.keyboard.down('b');
    await hook(page, '(h) => h.avancar(2)');
    await page.keyboard.up('b');
    expect(await hook(page, '(h) => h.ui.scene.faixaRitmo.ativa'), 'a faixa SEM congelar abriu').toBe(true);
    expect(await hook(page, '(h) => h.ui.scene.cine.ativa'), 'a tarja congelante de hoje não é usada com a flag ligada').toBe(false);
    const tickAntes = await hook(page, '(h) => h.mundo().game.tick');
    await hook(page, '(h) => h.avancar(10)');
    const tickDepois = await hook(page, '(h) => h.mundo().game.tick');
    expect(tickDepois, 'o motor andou 10 ticks com a faixa na tela: a luta não parou').toBe(tickAntes + 10);
    // e a faixa acaba sozinha (40 ticks da 1ª vez) sem travar nada
    await hook(page, '(h) => h.avancar(40)');
    expect(await hook(page, '(h) => h.ui.scene.faixaRitmo.ativa')).toBe(false);
    expect(erros).toEqual([]);
  });

  test('1ª vez: 40 ticks na tela; 2ª vez do MESMO golpe nesta luta: 24 ticks (medido pelo relógio real da cena)', async ({ page }) => {
    await abrirJogo(page, 'desktop');
    await abrirLuta(page, {}, true);
    await ritmo(page, { tarja: true });
    const dur1 = await hook(page, `(h) => { const s = h.ui.scene; s.faixaRitmo.iniciar({ lutador: 0, golpe: 'sFire' }); let t = 0; while (s.faixaRitmo.ativa) { s.faixaRitmo.avancar(); t++; } return t; }`);
    const dur2 = await hook(page, `(h) => { const s = h.ui.scene; s.faixaRitmo.iniciar({ lutador: 0, golpe: 'sFire' }); let t = 0; while (s.faixaRitmo.ativa) { s.faixaRitmo.avancar(); t++; } return t; }`);
    expect(dur1).toBe(40);
    expect(dur2).toBe(24);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// R-2: geometria da faixa, MEDIDA no navegador (skill medir-antes-de-afirmar) — 960×540 (desktop) e 844×390 (celular deitado)
// ---------------------------------------------------------------------------------------------------------------------------------
for (const perfil of ['desktop', 'celular'] as const) {
  test(`R-2 (${perfil}): a faixa fica entre o HUD e as cabeças, sem cobrir nenhum dos dois — medido por diff de pixel`, async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'um perfil de página basta (o Chromium emula os 2 viewports; o teste roda 2x, 1 por perfil)');
    const erros = coletarErros(page);
    await abrirJogo(page, perfil);
    await abrirLuta(page, {}, true);
    await ritmo(page, { tarja: true });
    await hook(page, '(h) => h.avancar(20)'); // sai da intro: lutadores em pé, pose normal

    const medida = await page.evaluate(() => {
      const h = (window as any).__inno;
      const s = h.ui.scene;
      const cv = document.getElementById('jogo') as HTMLCanvasElement;
      const ctx = cv.getContext('2d')!;
      h.desenhar();
      const sem = ctx.getImageData(0, 0, cv.width, cv.height).data;
      s.faixaRitmo.iniciar({ lutador: 0, golpe: 'sFire' });
      for (let i = 0; i < 15; i++) s.faixaRitmo.avancar(); // passa da entrada (6 ticks): "fica" parada
      h.desenhar();
      const com = ctx.getImageData(0, 0, cv.width, cv.height).data;
      const W = cv.width;
      const H = cv.height;
      const k = W / 960; // físico -> lógico (960×540), a mesma conversão de provocacao.spec.ts
      let x0 = W, y0 = H, x1 = 0, y1 = 0;
      let mudou = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          const d = Math.abs(com[i]! - sem[i]!) + Math.abs(com[i + 1]! - sem[i + 1]!) + Math.abs(com[i + 2]! - sem[i + 2]!);
          if (d > 24) {
            mudou++;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      return { x0: x0 / k, y0: y0 / k, x1: x1 / k, y1: y1 / k, mudou, W, H, k };
    });
    info.annotations.push({ type: 'medido', description: `${perfil}: faixa em y=[${medida.y0.toFixed(1)}, ${medida.y1.toFixed(1)}] x=[${medida.x0.toFixed(1)}, ${medida.x1.toFixed(1)}] (lógico, canvas ${medida.W}x${medida.H}, k=${medida.k.toFixed(3)})` });
    expect(medida.mudou, 'a faixa pintou alguma coisa (não ficou em branco/vazia)').toBeGreaterThan(300);
    // HUD: nome/placar terminam por volta de y=86 (hud.ts, LIMITES_COM_HUD.topoMin=86) — a faixa não pode começar antes disso
    expect(medida.y0, `${perfil}: a faixa não cobre o HUD`).toBeGreaterThanOrEqual(84);
    // cabeça do lutador em pé: topo por volta de y=205 (GROUND 470 − SH_IDLE 255) — a faixa não pode chegar lá
    expect(medida.y1, `${perfil}: a faixa não cobre a cabeça do lutador`).toBeLessThanOrEqual(195);
    // cabe na largura lógica (960), sem vazar para fora do canvas
    expect(medida.x0).toBeGreaterThanOrEqual(0);
    expect(medida.x1).toBeLessThanOrEqual(960);
    // A posição em px LÓGICOS acima é a MESMA nos 2 perfis por desenho: o canvas pinta sempre no buffer fixo LARGURA*RS x
    // ALTURA*RS (`prepararCanvas`, RS=2 => 1920x1080), e só o CSS (`ajustarEscala`) encolhe o DESENHO na tela — por isso
    // medir só dentro do canvas não provaria nada diferente no celular. O que REALMENTE muda com o viewport é se o
    // letterbox (`calcularTamanhoCss`) ainda cabe sem cortar: confere aqui, no boundingBox da página.
    const caixa = (await page.locator('#jogo').boundingBox())!;
    const viewport = page.viewportSize()!;
    expect(caixa.width, `${perfil}: o canvas cabe na largura do viewport (letterbox, sem cortar)`).toBeLessThanOrEqual(viewport.width + 1);
    expect(caixa.height, `${perfil}: o canvas cabe na altura do viewport (letterbox, sem cortar)`).toBeLessThanOrEqual(viewport.height + 1);
    info.annotations.push({ type: 'medido', description: `${perfil}: canvas na página = ${caixa.width.toFixed(0)}x${caixa.height.toFixed(0)} px CSS, viewport ${viewport.width}x${viewport.height}` });
    await capturar(page, `faixa-ritmo-${perfil}-depois`);
    expect(erros).toEqual([]);
  });
}

/** A tarja congelante de HOJE (flag desligada), para a captura "antes" ficar ao lado da "depois" de cima. */
test('captura: a tarja de HOJE (flag desligada), para comparar com a faixa nova', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'só a captura, 1 perfil basta');
  await abrirJogo(page, 'desktop');
  await abrirLuta(page, {}, true);
  await ritmo(page, null);
  await hook(page, '(h) => h.avancar(20)');
  await hook(page, "(h) => { const s = h.ui.scene; const ev = { lutador: 0, golpe: 'sFire', ficha: null }; s.cine.iniciar(ev, 'completa'); }");
  await hook(page, '(h) => h.avancar(14)'); // perto do pico da tarja completa
  await capturar(page, 'tarja-congelante-antes');
  expect(await hook(page, '(h) => h.ui.scene.cine.ativa')).toBe(true);
});

// ---------------------------------------------------------------------------------------------------------------------------------
// R-1: o contador `window.__ritmo` — soma dos motivos = ticks simulados, numa luta REAL (não só a função pura)
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('R-1: window.__ritmo (DEV), medido numa luta real com `?manual=1`', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'contador, não depende do viewport'));

  test('existe, começa zerado a cada `enter()`, e a soma dos motivos bate com o nº de ticks simulados', async ({ page }) => {
    await abrirJogo(page, 'desktop');
    await abrirLuta(page, {}, true);
    const zerado = await hook(page, '(h) => window.__ritmo.total');
    expect(zerado).toBe(0);
    const N = 90;
    await hook(page, `(h) => h.avancar(${N})`);
    const r = await hook(page, '(h) => window.__ritmo');
    const soma = Object.values(r.porMotivo as Record<string, number>).reduce((a: number, b: number) => a + b, 0);
    expect(soma, 'soma dos motivos = ticks da cena').toBe(r.total);
    expect(r.total, `${N} ticks simulados, todos contados (nenhuma pausa no meio)`).toBe(N);
    // round 1 sem provocação (gancho de teste): os 90 ticks caem OU em intro (ROUND 1/LUTE!) OU em jogável, depois que o round começa
    expect(r.porMotivo.intro + r.porMotivo.jogavel + r.porMotivo.hitstop, 'nada de filme/tarja/provocação nesses 90 ticks parados').toBe(N);
  });

  test('o "tempo sem controle" (G1) cai com `ritmo.tarja` ligada, no MESMO roteiro de especiais: compara o contador antes e depois', async ({ page }) => {
    const rodarLuta = async (comFlag: boolean): Promise<{ total: number; semControle: number; tarja: number; jogavel: number }> => {
      await abrirLuta(page, {}, true);
      await ritmo(page, comFlag ? { tarja: true } : null);
      await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; g.p2.en = 100; g.p1.x = 250; g.p2.x = 780; g.p1.facing = 1; g.p2.facing = -1; }');
      await hook(page, "(h) => { const g = h.mundo().game; let n = 0; while (g.phase !== 'fight' && n < 300) { h.avancar(1); n++; } }"); // sai da intro
      // 3 especiais do P1 em sequência, pelo TECLADO de verdade (tecla B), espaçados o bastante para cada um resolver
      for (let i = 0; i < 3; i++) {
        await page.keyboard.down('b');
        await hook(page, '(h) => h.avancar(2)');
        await page.keyboard.up('b');
        await hook(page, '(h) => h.avancar(60)'); // sobra tempo para a tarja/faixa acabar
        await hook(page, '(h) => { h.mundo().game.p1.en = 100; }'); // a barra não é o que este teste mede
      }
      const r = await hook(page, '(h) => window.__ritmo');
      const semControle = r.total - r.porMotivo.jogavel - r.porMotivo.hitstop;
      return { total: r.total, semControle, tarja: r.porMotivo.tarja, jogavel: r.porMotivo.jogavel };
    };

    await abrirJogo(page, 'desktop');
    const antes = await rodarLuta(false);
    const depois = await rodarLuta(true);

    expect(antes.tarja, 'sem a flag: a tarja (congelante) aparece e soma ticks sem controle').toBeGreaterThan(0);
    expect(depois.tarja, 'com a flag: a faixa não bloqueia — o bucket `tarja` (congelante) fica zerado').toBe(0);
    expect(depois.semControle, 'tempo sem controle cai (ou no mínimo não piora) com a flag ligada, no MESMO roteiro de especiais').toBeLessThanOrEqual(antes.semControle);
    test.info().annotations.push({
      type: 'medido',
      description: `tempo sem controle (ticks de ${antes.total}/${depois.total}): antes=${antes.semControle} (${((antes.semControle / antes.total) * 100).toFixed(1)}%) depois=${depois.semControle} (${((depois.semControle / depois.total) * 100).toFixed(1)}%)`,
    });
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// R-2: provocação sobreposta à contagem (round 1) — só CURTA, só com a flag; a COMPLETA (1º confronto ARCADE/chefão) não muda
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('R-2: a provocação CURTA do round 1 corre por cima da contagem (Regras.ritmo.provocacao)', () => {
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'comportamento, não precisa dos 2 perfis'));

  /** VERSUS (sem `run`): nunca é "1º confronto do ARCADE" nem chefão — com a flag, a COMPLETA de hoje vira CURTA sobreposta (D-R8). */
  async function abrirVersus(page: Page): Promise<void> {
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: true } }); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  }

  test('flag DESLIGADA: round 1 é COMPLETA (como hoje) e BLOQUEIA o motor (game.tick não anda enquanto ela roda)', async ({ page }) => {
    await abrirJogo(page, 'desktop');
    await ritmo(page, null);
    await abrirVersus(page);
    await hook(page, '(h) => h.avancar(1)'); // a provocação do round 1 começa ANTES do 1º update
    expect(await hook(page, '(h) => h.ui.scene.provocacao.roteiro?.modo')).toBe('completa');
    const tickAntes = await hook(page, '(h) => h.mundo().game.tick');
    await hook(page, '(h) => h.avancar(30)');
    expect(await hook(page, '(h) => h.mundo().game.tick'), 'o motor não andou: a COMPLETA ainda bloqueia (sem mudança)').toBe(tickAntes);
    expect(await hook(page, '(h) => h.mundo().game.phase')).toBe('intro'); // nem a contagem andou
  });

  test('flag LIGADA: round 1 vira CURTA e corre por CIMA da contagem (game.tick anda desde o 1º tick)', async ({ page }) => {
    await abrirJogo(page, 'desktop');
    await ritmo(page, { provocacao: true });
    await abrirVersus(page);
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.roteiro?.modo'), 'D-R8: VERSUS não é o 1º confronto do ARCADE nem chefão — CURTA').toBe('curta');
    const pre = await hook(page, `(h) => {
      const g = h.mundo().game; const s = h.ui.scene; let ticks = 0;
      while (g.phase !== 'fight' && ticks < 300) { h.avancar(1); ticks++; }
      return { ticks, phase: g.phase, tick: g.tick, provocacaoAtiva: s.provocacao.ativa };
    }`);
    // o motor saiu do `intro` (ganhou controle) dentro do orçamento de 2,5 s (150 ticks a 60 Hz) do §3.1/G3 — mesmo com o balão talvez ainda fechando
    expect(pre.phase, 'chegou à fase `fight`: o jogador já tem controle').toBe('fight');
    expect(pre.ticks, 'pré-luta <= 2,5 s (150 ticks), com a provocação sobreposta à contagem').toBeLessThanOrEqual(150);
  });
});
