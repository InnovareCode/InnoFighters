/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';

/*
 * LAYOUT E PADRÃO DO BOTÃO SUPER (#sup) no celular deitado, medido no navegador em 4 tamanhos. Queixa do dono: o SUPER ficava colado na PAUSA (risco de pausar
 * sem querer) e era um anel de CSS fora do padrão dos outros botões. Agora: mesma arte/anatomia do ESPECIAL em magenta, numa escadinha à esquerda do ESQUIVA
 * (ESPECIAL 3,88 > ESQUIVA 3,5 > SUPER 2,85, em unidades de D), a pelo menos UM botão inteiro de distância da pausa, sem mexer nos botões que já existiam.
 */
test.describe.configure({ timeout: 120_000 });

const TAMANHOS = [
  { nome: '844x390', w: 844, h: 390 },
  { nome: '915x412', w: 915, h: 412 },
  { nome: '667x375', w: 667, h: 375 },
  { nome: '932x430', w: 932, h: 430 },
];

/** Posição de cada botão já existente, em unidades de D medidas do canto seguro inferior direito (toque.css: --x/--y). NÃO podem mudar. */
const CENTROS_ANTIGOS: Record<string, [number, number]> = { lp: [1.78, 1.2], hp: [1.78, 2.36], lk: [0.62, 1.48], hk: [0.62, 2.64], esq: [1.78, 3.5], r1: [0.62, 3.88] };

async function aLuta(page: Page, w: number, h: number): Promise<void> {
  await page.setViewportSize({ width: w, height: h });
  await page.goto('/?seed=7&manual=1&expansao=1&rs=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const hook = (c: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${c})(h); })()`);
  await hook(`(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: true, motorV2: { filmes: true } } }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  for (let i = 0; i < 300; i++) {
    if ((await hook('(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook('(h) => { const g = h.mundo().game; g.p1.en = 100; h.avancar(2); h.desenhar(); }');
}

interface Caixa {
  x: number;
  y: number;
  w: number;
  h: number;
}

const medir = (page: Page): Promise<{ caixas: Record<string, Caixa>; vw: number; vh: number }> =>
  page.evaluate(() => {
    const caixas: Record<string, { x: number; y: number; w: number; h: number }> = {};
    for (const e of document.querySelectorAll('#touch .b, #joy')) {
      const b = e.getBoundingClientRect();
      const id = e.id || (e.className.match(/\b(lp|hp|lk|hk)\b/)?.[1] ?? e.getAttribute('data-k') ?? '?');
      caixas[id] = { x: b.x, y: b.y, w: b.width, h: b.height };
    }
    return { caixas, vw: innerWidth, vh: innerHeight };
  });

for (const t of TAMANHOS) {
  test.describe(`celular ${t.nome}`, () => {
    test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'toque: perfil celular'));

    test('nenhum botão se sobrepõe, todos >= 44 px, dentro da margem segura; SUPER a >= 1 botão da pausa e do joystick, na zona do polegar direito', async ({ page }) => {
      await aLuta(page, t.w, t.h);
      const { caixas: c, vw, vh } = await medir(page);
      const ids = Object.keys(c);
      for (const id of ['joy', 'bp', 'sup', 'r1', 'esq', 'lp', 'hp', 'lk', 'hk']) expect(ids, `existe ${id}`).toContain(id);
      for (let i = 0; i < ids.length; i++)
        for (let j = i + 1; j < ids.length; j++) {
          const a = c[ids[i]!]!;
          const b = c[ids[j]!]!;
          const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
          const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
          expect(ox > 0.5 && oy > 0.5, `${ids[i]} sobrepõe ${ids[j]}`).toBe(false);
        }
      for (const id of ids.filter((k) => k !== 'joy')) {
        const b = c[id]!;
        expect(b.w, `${id} largura >= 44`).toBeGreaterThanOrEqual(43.99);
        expect(b.h, `${id} altura >= 44`).toBeGreaterThanOrEqual(43.99);
        expect(b.x + b.w, `${id} dentro da margem direita (8 px)`).toBeLessThanOrEqual(vw - 8 + 0.5);
        expect(b.y, `${id} abaixo da margem do topo (6 px)`).toBeGreaterThanOrEqual(6 - 0.5);
        expect(b.y + b.h, `${id} acima da margem da base (6 px)`).toBeLessThanOrEqual(vh - 6 + 0.5);
      }
      const sup = c['sup']!;
      const bp = c['bp']!;
      const joy = c['joy']!;
      const vao = Math.max(0, bp.y - (sup.y + sup.h), sup.y - (bp.y + bp.h), bp.x - (sup.x + sup.w), sup.x - (bp.x + bp.w));
      expect(vao, `vão SUPER<->PAUSA (${vao.toFixed(0)} px) >= 1 botão inteiro (${sup.w.toFixed(0)} px)`).toBeGreaterThanOrEqual(sup.w);
      expect(sup.x - (joy.x + joy.w), 'vão SUPER<->joystick >= 1 botão').toBeGreaterThanOrEqual(sup.w);
      // polegar direito: o SUPER fica na metade direita e no mesmo aglomerado (perto do canto de apoio, como o ESQUIVA/ESPECIAL), nunca cruzando o joystick
      const D = c['lp']!.w;
      expect(sup.x + sup.w / 2, 'SUPER na metade direita da tela').toBeGreaterThan(vw / 2);
      const apoio = { x: vw - 8, y: vh - 6 };
      const dist = (b: Caixa): number => Math.hypot(apoio.x - (b.x + b.w / 2), apoio.y - (b.y + b.h / 2)) / D;
      const maisLonge = Math.max(...['lp', 'hp', 'lk', 'hk', 'esq', 'r1'].map((k) => dist(c[k]!)));
      expect(dist(sup), `alcance do SUPER (${dist(sup).toFixed(2)} D) <= 1,1x o do botão mais longe que o dono já usa (${maisLonge.toFixed(2)} D)`).toBeLessThanOrEqual(maisLonge * 1.1);
      // o toque no centro do SUPER cai nele (nada por cima)
      const topo = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id, [sup.x + sup.w / 2, sup.y + sup.h / 2] as [number, number]);
      expect(topo).toBe('sup');
    });

    test('os botões que já existiam NÃO se mexeram (memória muscular): mesmos centros, em unidades de D, do canto seguro', async ({ page }) => {
      await aLuta(page, t.w, t.h);
      const { caixas: c, vw, vh } = await medir(page);
      const D = c['lp']!.w;
      for (const [id, [x, y]] of Object.entries(CENTROS_ANTIGOS)) {
        const b = c[id]!;
        expect((vw - 8 - (b.x + b.w / 2)) / D, `${id} x`).toBeCloseTo(x, 1);
        expect((vh - 6 - (b.y + b.h / 2)) / D, `${id} y`).toBeCloseTo(y, 1);
      }
    });

    test('mesmo padrão dos outros botões: arte super*.svg, mesmo tamanho do ESPECIAL, rótulo na mesma fonte, acento magenta, estados .on/.sem', async ({ page }) => {
      await aLuta(page, t.w, t.h);
      const r = await page.evaluate(() => {
        const css = (id: string, pseudo: string): CSSStyleDeclaration => getComputedStyle(document.getElementById(id)!, pseudo);
        const sup = document.getElementById('sup')!;
        const estado = (cls: string[]): string => {
          sup.className = ['b', ...cls].join(' ');
          return getComputedStyle(sup, '::before').backgroundImage;
        };
        const base = estado([]);
        const comSem = estado(['sem']);
        const comOn = estado(['on']);
        sup.className = 'b';
        return {
          base,
          comSem,
          comOn,
          lado: [sup.getBoundingClientRect().width, document.getElementById('r1')!.getBoundingClientRect().width],
          raio: css('sup', '::before').borderRadius,
          rotulo: { sup: [css('sup', '::after').fontFamily, css('sup', '::after').fontSize, css('sup', '::after').fontWeight, css('sup', '::after').fontStyle], r1: [css('r1', '::after').fontFamily, css('r1', '::after').fontSize, css('r1', '::after').fontWeight, css('r1', '::after').fontStyle] },
          borda: css('sup', '::after').borderTopColor,
          texto: css('sup', '::after').content,
          opacidade: [css('sup', '::before').opacity, css('r1', '::before').opacity],
        };
      });
      expect(r.base).toContain('/assets/ui/toque/super.svg');
      expect(r.comSem).toContain('super-desabilitado.svg');
      expect(r.comOn).toContain('super-pressionado.svg');
      expect(r.lado[0], 'mesmo lado do ESPECIAL').toBeCloseTo(r.lado[1]!, 1);
      expect(r.raio, 'sem anel de CSS próprio (o desenho é o SVG)').toMatch(/^0px$/);
      expect(r.rotulo.sup, 'rótulo na mesma fonte/tamanho/peso/estilo do ESPECIAL').toEqual(r.rotulo.r1);
      expect(r.borda).toBe('rgb(255, 63, 160)');
      expect(r.texto).toContain('SUPER');
      expect(r.opacidade[0]).toBe(r.opacidade[1]);
    });

    test('body.sem-super esconde o botão sem deslocar nenhum outro e sem deixar o toque passar a ele', async ({ page }) => {
      await aLuta(page, t.w, t.h);
      const antes = await medir(page);
      await page.evaluate(() => document.body.classList.add('sem-super'));
      const depois = await medir(page);
      const estilo = await page.evaluate(() => {
        const e = document.getElementById('sup')!;
        const c = getComputedStyle(e);
        return { visibilidade: c.visibility, toque: c.pointerEvents };
      });
      expect(estilo).toEqual({ visibilidade: 'hidden', toque: 'none' });
      for (const id of Object.keys(antes.caixas).filter((k) => k !== 'sup')) expect(depois.caixas[id], `${id} não se mexe`).toEqual(antes.caixas[id]);
    });
  });
}
