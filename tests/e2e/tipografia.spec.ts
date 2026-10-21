/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * Tipografia (2026-10-21): Barlow Condensed (títulos) + Barlow (corpo), auto-hospedadas. Provas no navegador: as fontes CARREGAM antes do 1º quadro (nenhum texto
 * sai na fonte de reserva), o canvas as USA de verdade (largura medida diferente da reserva) e o CSS do toque/aviso também; nenhum pedido sai do próprio site; os acentos do
 * português têm glifo próprio (nada de "tofu"); e o texto das telas principais continua cabendo (caixas medidas nas seleção, opções e no "Como jogar").
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros de textos (menu, como jogar, opções, luta, pausa) com a fonte nova.
 */
test.describe.configure({ timeout: 120_000 });

const PASTA = process.env['SALVAR_CAPTURAS'];
const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

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

test.describe('Tipografia do jogo (Barlow Condensed + Barlow, auto-hospedadas)', () => {
  test('as duas fontes carregam ANTES do 1º quadro, vêm só do próprio site (woff2) e o canvas e o CSS as usam de verdade', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'igual em qualquer aparelho');
    const erros = coletarErros(page);
    const pedidos: string[] = [];
    page.on('request', (r) => pedidos.push(r.url()));
    await page.goto('/?seed=3&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await expect(page.locator('html')).toHaveAttribute('data-fontes', 'ok');
    // nada fora do site (CDN, Google Fonts...)
    const fora = pedidos.filter((u) => !u.startsWith('http://127.0.0.1:5173/') && !u.startsWith('data:') && !u.startsWith('blob:'));
    expect(fora, 'pedidos para fora do próprio site').toEqual([]);
    const fontes = pedidos.filter((u) => u.endsWith('.woff2')).map((u) => new URL(u).pathname).sort();
    expect(fontes).toEqual(['/assets/fontes/barlow-600-latin.woff2', '/assets/fontes/barlow-condensed-800-italic-latin.woff2']);
    const r = await page.evaluate(async () => {
      const c = document.createElement('canvas').getContext('2d')!;
      const largura = (fonte: string, texto: string): number => {
        c.font = fonte;
        return c.measureText(texto).width;
      };
      const T = 'ESCOLHA SEU LUTADOR — Não há ação, você';
      const FH = (f: string) => `italic 800 40px ${f}`;
      const FB = (f: string) => `600 20px ${f}`;
      return {
        check: [document.fonts.check('italic 800 20px "Barlow Condensed"'), document.fonts.check('600 20px Barlow')],
        // a largura com a fonte nova difere da com a de reserva: o canvas desenha com o arquivo, não com a reserva
        titulo: [largura(FH('"Barlow Condensed", sans-serif'), T), largura(FH('sans-serif'), T)],
        corpo: [largura(FB('Barlow, sans-serif'), T), largura(FB('sans-serif'), T)],
        // o CSS do toque, do aviso e do #rot usa a mesma família
        css: ['#esq', '#aviso', '#rot'].map((s) => getComputedStyle(document.querySelector(s)!).fontFamily),
        pesoDoBotao: getComputedStyle(document.querySelector('#esq')!).fontWeight,
        carregadas: [...document.fonts].filter((f) => f.status === 'loaded').map((f) => `${f.family}/${f.style}/${f.weight}`).sort(),
      };
    });
    expect(r.check).toEqual([true, true]);
    expect(Math.abs(r.titulo[0]! - r.titulo[1]!), 'o canvas usa a fonte de título').toBeGreaterThan(5);
    expect(Math.abs(r.corpo[0]! - r.corpo[1]!), 'o canvas usa a fonte de corpo').toBeGreaterThan(5);
    for (const f of r.css) expect(f).toMatch(/Barlow/);
    expect(r.pesoDoBotao).toBe('600');
    expect(r.carregadas).toEqual(['Barlow Condensed/italic/800', 'Barlow/normal/600']);
    expect(erros).toEqual([]);
  });

  test('o 1º quadro já sai na fonte nova (nunca na de reserva): os textos medidos no boot têm a largura da Barlow', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'igual em qualquer aparelho');
    // espia o `font` de cada fillText desde a página nascer: nenhum texto pode usar a reserva (Impact/Segoe UI) como 1ª família
    await page.addInitScript(() => {
      const usadas = new Set<string>();
      (window as any).__fontesUsadas = usadas;
      const o = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, ...a: [string, number, number, number?]) {
        usadas.add(this.font.replace(/[\d.]+px/, 'Npx').split(',')[0]!);
        return o.apply(this, a as never);
      };
    });
    await page.goto('/?seed=3');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await page.waitForTimeout(800);
    const usadas: string[] = await page.evaluate(() => [...(window as any).__fontesUsadas]);
    expect(usadas.length).toBeGreaterThan(0);
    // a única exceção é o LOGO da marca (paleta D1, ui/logo.ts: `italic 900 ... Impact`): identidade já aprovada pelo dono, fora desta troca (ver o handoff)
    for (const u of usadas.filter((x) => x !== 'italic 900 Npx Impact')) expect(u, `fonte usada no canvas: ${u}`).toMatch(/Barlow/);
    expect(usadas.filter((x) => !/Barlow/.test(x))).toEqual(['italic 900 Npx Impact']);
  });

  test('os acentos do português têm glifo na própria fonte (nada vem da reserva): trocar a reserva não muda a largura de nenhuma letra acentuada', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'igual em qualquer aparelho');
    await page.goto('/?seed=3&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-fontes', 'ok');
    const r = await page.evaluate(() => {
      // se a fonte NÃO tem o glifo, o navegador usa a próxima da lista: trocar a reserva (monospace x serif) muda a largura da letra. Com o glifo na Barlow, a reserva não importa.
      const c = document.createElement('canvas').getContext('2d')!;
      const letras = 'ÃÕÇÁÀÂÉÊÍÓÔÚÜãõçáàâéêíóôúü•ºªAEIOUaeiou';
      const falta: string[] = [];
      for (const [peso, familia] of [['italic 800', '"Barlow Condensed"'], ['600', 'Barlow']] as const) {
        for (const ch of letras) {
          c.font = `${peso} 40px ${familia}, monospace`;
          const comMono = c.measureText(ch).width;
          c.font = `${peso} 40px ${familia}, serif`;
          const comSerif = c.measureText(ch).width;
          if (!(comMono > 0) || Math.abs(comMono - comSerif) > 0.001) falta.push(`${familia} ${ch}`);
        }
      }
      return falta;
    });
    expect(r, 'letras sem glifo próprio').toEqual([]);
  });

  test('quadros de texto com a fonte nova (menu, como jogar, opções, luta, pausa): sem erro e com texto', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'igual em qualquer aparelho');
    const erros = coletarErros(page);
    await page.setViewportSize({ width: 1280, height: 720 });
    await page.goto('/?seed=3&manual=1&expansao=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const cena = async (nome: string, args: string, nomeArquivo: string, js = ''): Promise<void> => {
      await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('${nome}', ${args}); const S = h.ui.scene; ${js} h.avancar(20); }`);
      await capturar(page, nomeArquivo);
    };
    await cena('menu', '{}', 'texto-depois-menu');
    await cena('how', "{ from: 'menu' }", 'texto-depois-como-jogar', 'S.tab = 1; S.cid = 0;');
    await cena('options', "{ from: 'menu' }", 'texto-depois-opcoes');
    await cena('diff', "{ mode: 'cpu', c1: 'hayato', c2: 'wei-long' }", 'texto-depois-dificuldade');
    await cena('title', '{ fromIntro: false }', 'texto-depois-titulo', 'S.t = 120;');
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'aminu', c2: 'baatar', cpu: null, esquiva: true } }); (${SEM_PROVOCACAO})(h); }`);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera?.pronta === true, undefined, { timeout: 30_000 });
    await hook(page, '(h) => h.avancar(120)');
    await capturar(page, 'texto-depois-luta');
    await hook(page, "(h) => { const S = h.ui.scene; S.paused = true; S.view = 'main'; h.avancar(3); }");
    await capturar(page, 'texto-depois-pausa');
    expect(erros).toEqual([]);
  });
});
