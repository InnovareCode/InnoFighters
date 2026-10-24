/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';

/*
 * V2-4, UI dos combos próprios (spec §6.2): medido no navegador com as fontes de verdade. A lógica (texto, dado -> tela, flag) está em tests/unit/combos-tela.test.ts; aqui se
 * prova o que só o navegador prova: nenhum texto de combo passa da caixa dele nem encosta nas teclas, e a lista cabe acima da legenda do rodapé (y < 510), no "Como jogar" e na
 * pausa do treino, para os 10 lutadores. ESCRITO, NÃO RODADO (a Íris roda: as portas dela).
 */
test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function abrir(page: Page): Promise<void> {
  await page.goto('/?seed=7&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  // liga a regra dos combos próprios (a mesma que o motor lê) e espia os textos desenhados
  await hook(
    page,
    `(h) => {
      h.ui.c.regras = { ...h.ui.c.regras, ritmo: {}, motorV2: { ...(h.ui.c.regras.motorV2 ?? {}), combos: true } }; // ritmo: {} = geometria SEM a linha do SUPER (com ela a lista encolhe e a caixa sobe; o padrão tem teste próprio em ritmo-padrao-super.spec.ts)
      const ctx = h.ui.c.ctx;
      const original = ctx.fillText.bind(ctx);
      window.__textos = [];
      ctx.fillText = (t, x, y, ...r) => {
        window.__textos.push({ t: String(t), x, y, w: ctx.measureText(String(t)).width, align: ctx.textAlign, font: ctx.font });
        return original(t, x, y, ...r);
      };
    }`,
  );
}

type Texto = { t: string; x: number; y: number; w: number; align: string; font: string };

/** Desenha um quadro e devolve os textos que ele desenhou (com a largura medida na fonte de verdade). */
async function desenhar(page: Page): Promise<Texto[]> {
  return hook(page, `(h) => { window.__textos.length = 0; h.ui.draw(); return window.__textos.slice(); }`);
}

const esquerdaDe = (t: Texto): number => (t.align === 'center' ? t.x - t.w / 2 : t.align === 'right' || t.align === 'end' ? t.x - t.w : t.x);
const direitaDe = (t: Texto): number => esquerdaDe(t) + t.w;

/** Confere a banda dos combos: cada caixa (nome, sub, teclas, toque) tem o texto dentro dela e o nome não encosta nas teclas. */
function conferirBanda(textos: Texto[], topo: number, nome: string): void {
  const toques = textos.filter((t) => t.t.startsWith('TOQUE: '));
  expect(toques.length, `${nome}: uma linha de toque por combo`).toBeGreaterThan(0);
  for (const toque of toques) {
    const yCaixa = toque.y - 39; // a linha de toque fica em cy + 39
    expect(yCaixa, `${nome}: a caixa começa abaixo dos golpes`).toBeGreaterThanOrEqual(topo);
    expect(yCaixa + 46, `${nome}: a caixa termina acima da legenda do rodapé (510)`).toBeLessThanOrEqual(510);
    // a caixa do toque: da esquerda dela (x - 10) até a largura de uma coluna; o texto cabe com folga
    const caixaE = toque.x - 10;
    const doCombo = textos.filter((t) => t.y >= yCaixa && t.y <= yCaixa + 46 && esquerdaDe(t) >= caixaE - 1 && esquerdaDe(t) < caixaE + 430);
    // o nome tem sombra (dois fillText, y e y + 1,5); as teclas são de rótulo curto, centradas, na linha cy + 15
    const nomeDoCombo = doCombo.find((t) => t.x === caixaE + 10 && Math.abs(t.y - (yCaixa + 13)) <= 2 && t.w > 30);
    expect(nomeDoCombo, `${nome}: nome do combo`).toBeTruthy();
    const teclas = doCombo.filter((t) => t.align === 'center' && t.y === yCaixa + 15 && t.t.length <= 2);
    expect(teclas.length, `${nome}: teclas do combo`).toBeGreaterThanOrEqual(2);
    const primeiraTecla = Math.min(...teclas.map((t) => t.x - 13));
    expect(direitaDe(nomeDoCombo!) + 4, `${nome}/${nomeDoCombo!.t}: o nome não encosta nas teclas`).toBeLessThanOrEqual(primeiraTecla);
    expect(direitaDe(toque), `${nome}: o texto de toque cabe na caixa`).toBeLessThanOrEqual(caixaE + 416 - 10);
  }
}

test('"Como jogar" > GOLPES: os combos de cada um dos 10 lutadores cabem, sem encostar nas teclas nem na legenda', async ({ page }) => {
  await abrir(page);
  const n = await hook(page, `(h) => { h.persist.prog.desbloqueados = [...new Set([...(h.persist.prog.desbloqueados ?? []), ...h.ui.c.regras.roster])]; h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('how', { from: 'menu' }); h.ui.scene.tab = 2; return h.ui.c.regras.roster.length; }`);
  expect(n).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < n; i++) {
    await hook(page, `(h) => { h.ui.scene.cid = ${i}; }`);
    const textos = await desenhar(page);
    conferirBanda(textos, 450, `como jogar #${i}`);
  }
});

test('sem a regra a aba GOLPES é a de antes (nenhum combo e a legenda das teclas no rodapé)', async ({ page }) => {
  await abrir(page);
  await hook(page, `(h) => { h.ui.c.regras = { ...h.ui.c.regras, motorV2: undefined }; h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('how', { from: 'menu' }); h.ui.scene.tab = 2; }`);
  const textos = await desenhar(page);
  expect(textos.some((t) => t.t.startsWith('TOQUE: '))).toBe(false);
  // o texto de corpo tem sombra (src/render/texto.ts: fillText em y + 1,5 ANTES do texto em y): a linha é a de MENOR y
  const legenda = textos.filter((t) => t.t.startsWith('Teclas do Jogador 1'));
  expect(legenda.length).toBeGreaterThan(0);
  expect(Math.min(...legenda.map((t) => t.y))).toBe(110 + 376);
});

test('TREINO: a pausa > lista de golpes mostra os combos no lugar da dica genérica', async ({ page }) => {
  await abrir(page);
  await hook(
    page,
    `(h) => {
      h.ui.fade = 0; h.ui.fadeDir = 0;
      h.ui.set('fight', { cfg: { mode: 'training', c1: 'hayato', c2: 'caio', cpu: null, esquiva: false, motorV2: h.ui.c.regras.motorV2 } });
      h.ui.scene.paused = true; h.ui.scene.view = 'moves';
    }`,
  );
  const textos = await desenhar(page);
  conferirBanda(textos, 440, 'treino');
  expect(textos.some((t) => t.t.startsWith('COMBOS PRÓPRIOS'))).toBe(true);
  expect(textos.some((t) => t.t.startsWith('COMBO: soco fraco'))).toBe(false);
});
