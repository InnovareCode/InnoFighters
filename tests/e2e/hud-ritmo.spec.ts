/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * HUD do ritmo (Lyra, pedido do dono 24/10/2026, ref. X-Men vs Street Fighter): DANGER com a vida baixa, nota do combo (BOM / ÓTIMO / INCRÍVEL) e contador de
 * acertos polido. Atrás de `Regras.ritmo.tarja` (padrão LIGADO; rollback `?ritmo=0`).
 *
 * Método (skill medir-antes-de-afirmar): o MESMO estado do motor é desenhado duas vezes, com a flag ligada e desligada, SEM nenhum tick no meio; a diferença de
 * pixels é exatamente o que o HUD novo acrescentou. Dela saem a caixa (px lógicos 960x540 e px CSS) e a prova de que, quando nada novo aparece, os dois quadros
 * são idênticos. `?rs=2` fixa o buffer em 1920x1080 também no celular emulado (toque cairia em RS 1,5).
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros: `SALVAR_CAPTURAS=arte-fonte/hud-ritmo npx playwright test hud-ritmo`.
 */
test.describe.configure({ timeout: 180_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const PASTA = process.env['SALVAR_CAPTURAS'];

const PERFIS = {
  desktop: { width: 1280, height: 720 },
  'celular-844': { width: 844, height: 390 },
  'celular-915': { width: 915, height: 412 },
} as const;
type Perfil = keyof typeof PERFIS;

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    // o roteiro do trailer (Vega, em obra) reclama no console de dev; nada a ver com o HUD
    if (m.type() === 'error' && !/trailer/i.test(m.text())) erros.push(`console: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page, perfil: Perfil, query = ''): Promise<void> {
  await page.setViewportSize(PERFIS[perfil]);
  await page.goto(`/?seed=21&manual=1&rs=2${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await hook(
    page,
    `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null })} }); (${SEM_PROVOCACAO})(h); }`,
  );
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  await hook(page, "(h) => { const g = h.mundo().game; let n = 0; while (g.phase !== 'fight' && n < 400) { h.avancar(1); n++; } g.p1.x = 250; g.p2.x = 780; }");
  await hook(page, '(h) => h.avancar(50)'); // passa do FIGHT! (45 ticks): a captura mostra só o HUD
}

interface Diferenca {
  /** Pixels que mudaram entre "HUD novo ligado" e "desligado" (0 = quadros idênticos). */
  n: number;
  /** Caixa da diferença em px LÓGICOS (960x540), ou null. */
  caixa: { x0: number; y0: number; x1: number; y1: number } | null;
  /** Pixels soltos que o MESMO estado desenhado 2x deixa diferentes (ruído de partículas do cenário; ficam fora da comparação). */
  repetido: number;
  /** PNG do quadro com a flag ligada. */
  png: string;
}

/** Desenha o estado atual 2x com a flag ligada e 1x desligada (sem tick no meio) e devolve a diferença. `xMin` ignora pixels à esquerda (para isolar a nota do contador). */
async function diferenca(page: Page, xMin = 0): Promise<Diferenca> {
  return page.evaluate((xMinLogico) => {
    const h = (window as any).__inno;
    const cv = document.getElementById('jogo') as HTMLCanvasElement;
    const c = cv.getContext('2d') as CanvasRenderingContext2D;
    const W = cv.width;
    const H = cv.height;
    const esc = W / 960;
    const ler = (): Uint8ClampedArray => {
      h.desenhar();
      return c.getImageData(0, 0, W, H).data;
    };
    const A = ler();
    const A2 = ler();
    const png = cv.toDataURL('image/png');
    // ruído de fundo: o mesmo estado desenhado 2x deixa alguns pixels soltos diferentes (partículas do cenário); eles ficam FORA da comparação
    const ruido = new Uint8Array(W * H);
    let repetido = 0;
    for (let i = 0; i < A.length; i += 4) {
      if (A[i] !== A2[i] || A[i + 1] !== A2[i + 1] || A[i + 2] !== A2[i + 2]) {
        repetido++;
        ruido[i / 4] = 1;
      }
    }
    const anterior = h.ui.c.regras;
    h.ui.c.regras = { ...anterior, ritmo: { ...anterior.ritmo, tarja: false } };
    const B = ler();
    h.ui.c.regras = anterior;
    let n = 0;
    let x0 = W;
    let y0 = H;
    let x1 = -1;
    let y1 = -1;
    for (let p = 0; p < A.length; p += 4) {
      if (A[p] === B[p] && A[p + 1] === B[p + 1] && A[p + 2] === B[p + 2]) continue;
      const i = p / 4;
      if (ruido[i]) continue;
      const x = i % W;
      const y = (i - x) / W;
      if (x / esc < xMinLogico) continue;
      n++;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
    return { n, caixa: n ? { x0: x0 / esc, y0: y0 / esc, x1: (x1 + 1) / esc, y1: (y1 + 1) / esc } : null, repetido, png };
  }, xMin);
}

function guardar(nome: string, perfil: Perfil, png: string): void {
  if (!PASTA) return;
  mkdirSync(resolve(PASTA), { recursive: true });
  writeFileSync(resolve(PASTA, `${nome}-${perfil}.png`), Buffer.from(png.split(',')[1] as string, 'base64'));
}

/** Caixa lógica -> caixa em px CSS da página (o canvas tem letterbox: usa a caixa REAL do elemento). */
async function paraCss(page: Page, c: { x0: number; y0: number; x1: number; y1: number }): Promise<{ x: number; y: number; w: number; h: number }> {
  const b = await page.locator('#jogo').boundingBox();
  if (!b) throw new Error('#jogo sem caixa');
  return { x: b.x + (c.x0 / 960) * b.width, y: b.y + (c.y0 / 540) * b.height, w: ((c.x1 - c.x0) / 960) * b.width, h: ((c.y1 - c.y0) / 540) * b.height };
}

/** O HUD novo não pode cobrir nenhum controle de toque visível (joystick, botões, pausa). Só faz sentido onde há toque. */
async function semCobrirToque(page: Page, caixa: { x: number; y: number; w: number; h: number }, onde: string): Promise<void> {
  const alvos = await page.evaluate(() => {
    const lista: Array<{ id: string; x: number; y: number; w: number; h: number }> = [];
    for (const el of Array.from(document.querySelectorAll('#joy, #pad .b, #bp'))) {
      const e = el as HTMLElement;
      const cs = getComputedStyle(e);
      if (cs.visibility === 'hidden' || cs.display === 'none') continue;
      const r = e.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      lista.push({ id: e.id || e.className, x: r.x, y: r.y, w: r.width, h: r.height });
    }
    return lista;
  });
  for (const a of alvos) {
    const ix = Math.min(caixa.x + caixa.w, a.x + a.w) - Math.max(caixa.x, a.x);
    const iy = Math.min(caixa.y + caixa.h, a.y + a.h) - Math.max(caixa.y, a.y);
    expect(ix > 0 && iy > 0, `${onde} (${Math.round(caixa.x)},${Math.round(caixa.y)} ${Math.round(caixa.w)}x${Math.round(caixa.h)}) cobre o controle de toque ${a.id} (${Math.round(a.x)},${Math.round(a.y)} ${Math.round(a.w)}x${Math.round(a.h)})`).toBe(false);
  }
}

/** Põe o rival preso num combo de verdade do motor (golpeado em 'hit' com `stun` ticks): o contador sobe, depois a cadeia acaba sozinha. */
const PRENDER_RIVAL = (hits: number, dmg: number, stun: number): string =>
  `(h) => { const g = h.mundo().game; g.p2.state = 'hit'; g.p2.stun = ${stun}; g.p2.gotHits = ${hits}; g.p2.comboDmg = ${dmg}; }`;

for (const perfil of Object.keys(PERFIS) as Perfil[]) {
  test.describe(`HUD do ritmo @ ${perfil}`, () => {
    test.beforeEach(({}, info) => {
      const ehCelular = perfil !== 'desktop';
      test.skip((info.project.name === 'desktop') === ehCelular, `perfil ${perfil} só roda no projeto ${ehCelular ? 'celular' : 'desktop'}`);
    });

    test('DANGER: aparece do lado de quem está com a vida <= 25%, pulsa devagar, não cobre o toque e some ao curar', async ({ page }) => {
      const erros = coletarErros(page);
      await abrir(page, perfil);
      // nada novo na tela: os dois quadros (flag ligada/desligada) são idênticos
      const limpo = await diferenca(page);
      expect(limpo.repetido, 'o ruído de fundo é pequeno (só partículas soltas)').toBeLessThan(3000);
      expect(limpo.n, 'sem combo e sem vida baixa o HUD é idêntico ao de sempre').toBe(0);

      await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 24; g.p2.hpShown = 24; }');
      await hook(page, '(h) => h.avancar(14)');
      expect(await hook(page, '(h) => h.ui.scene.hudRitmo.perigo(1)')).toBe(1);
      expect(await hook(page, '(h) => h.ui.scene.hudRitmo.perigo(0)')).toBe(0);

      // fase do pulso: relógio 0 (alfa mínima) x relógio 24 (alfa máxima)
      const ate = (r: number): Promise<void> => hook(page, `(h) => { const s = h.ui.scene.hudRitmo.lados[1]; let n = 0; while (s.relogio !== ${r} && n < 100) { h.avancar(1); n++; } }`);
      await ate(0);
      const fraco = await diferenca(page);
      await ate(24);
      const forte = await diferenca(page);
      guardar('danger', perfil, forte.png);
      expect(forte.caixa, 'o DANGER desenhou algo').not.toBeNull();
      const c = forte.caixa!;
      expect(c.x0, 'do lado direito (o lutador de lá é o de vida baixa)').toBeGreaterThan(960 - 24 - 220);
      expect(c.x1).toBeLessThanOrEqual(960 - 24 + 8);
      expect(c.y0, 'na altura do contador (y~150), abaixo do nome e dos rounds').toBeGreaterThan(110);
      expect(c.y1).toBeLessThan(200);
      expect(c.x1 - c.x0, 'legível: >= 80 px lógicos de largura').toBeGreaterThan(80);
      expect(forte.n, 'pulso: no ápice há mais tinta que no mínimo').toBeGreaterThan(fraco.n * 0.9);
      expect(fraco.n, 'o mínimo do pulso continua visível (não pisca até sumir)').toBeGreaterThan(0);
      // legibilidade: pixels amarelo/laranja de verdade (R alto, B baixo) dentro da caixa
      const quente = await page.evaluate((cx) => {
        (window as any).__inno.desenhar(); // `diferenca` termina com a flag desligada: redesenha ligada
        const cv = document.getElementById('jogo') as HTMLCanvasElement;
        const esc = cv.width / 960;
        const d = (cv.getContext('2d') as CanvasRenderingContext2D).getImageData(Math.floor(cx.x0 * esc), Math.floor(cx.y0 * esc), Math.ceil((cx.x1 - cx.x0) * esc), Math.ceil((cx.y1 - cx.y0) * esc)).data;
        let q = 0;
        for (let i = 0; i < d.length; i += 4) if (d[i]! > 200 && d[i + 1]! > 110 && d[i + 2]! < 120) q++;
        return q;
      }, c);
      expect(quente, 'o texto é amarelo/laranja').toBeGreaterThan(300);
      if (perfil !== 'desktop') await semCobrirToque(page, await paraCss(page, c), 'DANGER');

      // curou: some
      await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 90; g.p2.hpShown = 90; }');
      await hook(page, '(h) => h.avancar(12)');
      expect(await hook(page, '(h) => h.ui.scene.hudRitmo.perigo(1)')).toBe(0);
      expect((await diferenca(page)).n).toBe(0);
      expect(erros).toEqual([]);
    });

    test('combo: o contador cresce a cada acerto, muda de cor por patamar, e a nota ÓTIMO! aparece ao lado quando a cadeia acaba e some em ~1 s', async ({ page }) => {
      const erros = coletarErros(page);
      await abrir(page, perfil);
      // 2 acertos (sem nota): o contador de sempre, mas com o tranco do acerto novo
      await hook(page, PRENDER_RIVAL(2, 6, 40));
      await hook(page, '(h) => h.avancar(1)');
      expect(await hook(page, '(h) => h.mundo().game.p1.combo.hits')).toBe(2);
      const tranco = await diferenca(page);
      expect(tranco.caixa, 'o tranco do 1º acerto mexe no contador').not.toBeNull();
      expect(tranco.caixa!.x1, 'contador do P1 fica na metade esquerda').toBeLessThan(480);
      await hook(page, '(h) => h.avancar(12)');

      // sobe para 6 acertos: tranco de novo + patamar novo (cor)
      await hook(page, '(h) => { const g = h.mundo().game; g.p2.gotHits = 6; g.p2.comboDmg = 14; }');
      await hook(page, '(h) => h.avancar(1)');
      const sobe = await diferenca(page);
      guardar('contador-tranco', perfil, sobe.png);
      expect(sobe.n).toBeGreaterThan(tranco.n * 0.5);
      await hook(page, '(h) => h.avancar(12)');
      const patamar = await diferenca(page);
      guardar('contador', perfil, patamar.png);
      expect(patamar.caixa, 'patamar 2 (5-6 acertos): cor própria, mesmo parado').not.toBeNull();
      expect(patamar.n).toBeGreaterThan(200);
      expect(await hook(page, '(h) => h.ui.scene.hudRitmo.nota(0).patamar'), 'ainda rolando: sem nota').toBe(-1);

      // a cadeia acaba (o `stun` do rival esgota): nota ÓTIMO! (6 acertos, 14 de dano num rival de 100+)
      await hook(page, "(h) => { const g = h.mundo().game; let n = 0; while (g.p2.gotHits > 0 && n < 100) { h.avancar(1); n++; } h.avancar(8); }");
      const nota = await hook(page, '(h) => h.ui.scene.hudRitmo.nota(0)');
      expect(nota.patamar, 'ÓTIMO').toBe(1);
      expect(nota.hits).toBe(6);
      const soNota = await diferenca(page, 140); // à direita do contador "6 HITS"
      guardar('nota-otimo', perfil, soNota.png);
      expect(soNota.caixa, 'a nota está desenhada ao lado do contador').not.toBeNull();
      const n = soNota.caixa!;
      expect(n.x0, 'depois do contador').toBeGreaterThan(100);
      expect(n.x1, 'ainda no lado do P1').toBeLessThan(480);
      expect(n.y0).toBeGreaterThan(110);
      expect(n.y1).toBeLessThan(200);
      expect(n.x1 - n.x0, 'legível').toBeGreaterThan(70);
      if (perfil !== 'desktop') {
        const tudo = await diferenca(page);
        await semCobrirToque(page, await paraCss(page, tudo.caixa!), 'contador + nota');
      }

      // some em ~1 s (60 ticks): o relógio da nota zera, e com o contador também apagado o quadro volta a ser idêntico ao de sempre
      await hook(page, '(h) => h.avancar(60)');
      expect(await hook(page, '(h) => h.ui.scene.hudRitmo.nota(0).patamar')).toBe(-1);
      expect((await diferenca(page)).n).toBe(0);
      expect(erros).toEqual([]);
    });

    test('rollback `?ritmo=0`: nada do HUD novo aparece (DANGER, nota e contador são os de antes)', async ({ page }) => {
      const erros = coletarErros(page);
      await abrir(page, perfil, '&ritmo=0');
      expect(await hook(page, '(h) => h.ui.c.regras.ritmo.tarja === true')).toBe(false);
      await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 20; g.p2.hpShown = 20; }');
      await hook(page, PRENDER_RIVAL(6, 14, 30));
      await hook(page, '(h) => h.avancar(40)');
      // com a flag desligada, "desligar de novo" não muda nada: o HUD novo não existe nesta página
      expect((await diferenca(page)).n).toBe(0);
      expect(erros).toEqual([]);
    });
  });
}
