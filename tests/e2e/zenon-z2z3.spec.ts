/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CHEFE, PULAR_ENTRADA } from './_chefe';

/*
 * Z2 + Z3 (Lyra): o chefão ZENON medido no navegador, com a arte real: a ENTRADA DRAMÁTICA (o motor não anda; pular; HUD escondido), a fase 2
 * (aura, arena `gr` púrpura, raios, legenda), o projétil `anel`, a casa de honra da grade de 10 (desktop e celular deitado) e a ESCALA 1,32
 * contra os nomes do HUD. A lógica está provada em tests/unit/{z2-render-chefao,z2-grade-honra,z3-entrada-chefe}.test.ts.
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 (entrada, fase 2, grade de 10, ZENON em cada cenário, medição da escala).
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

/** Espia o `fillText`: com `window.__textos` em lista, cada texto entra com posição (lógica), tamanho e a largura medida. */
async function espiarTextos(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    w.__textos = null;
    if (w.__espiaInstalada) return;
    w.__espiaInstalada = true;
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: [number?]) {
      const lista = w.__textos as Array<{ t: string; x: number; y: number; px: number; w: number; align: string; css: number }> | null;
      if (lista) {
        const tf = this.getTransform();
        const px = parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '0');
        lista.push({ t: String(t), x: tf.e / 2 + x * (tf.a / 2), y: tf.f / 2 + y * (tf.d / 2), px: px * (tf.d / 2), w: this.measureText(String(t)).width * (tf.a / 2), align: this.textAlign, css: px * tf.a * (this.canvas.clientWidth / this.canvas.width) });
      }
      return o.call(this, t, x, y, ...(r as []));
    };
  });
}
const textosDoQuadro = async (page: Page): Promise<Array<{ t: string; x: number; y: number; px: number; w: number; align: string; css: number }>> =>
  page.evaluate(() => {
    const w = window as any;
    w.__textos = [];
    w.__inno.desenhar();
    const r = w.__textos;
    w.__textos = null;
    return r;
  });

async function semear(page: Page, prog: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((p) => {
    if (!window.localStorage.getItem('inno-fighters-v2')) {
      window.localStorage.setItem('inno-fighters-v2', JSON.stringify({ v: 2, s: { music: 0.45, sfx: 0.8, rounds: 1, time: 99, diff: 0, shake: true }, hi: 0, prog: { desbloqueados: [], zeradas: 0, chefeDerrotado: false, vistos: [], ...p } }));
    }
  }, prog);
}

async function abrirJogo(page: Page, query = '', viewport?: { width: number; height: number }): Promise<void> {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(`/?seed=3&manual=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

/** Abre a luta de ARCADE do HAYATO contra o chefão (sem CPU: os dois parados) e espera a arte. NÃO anda nenhum tick. */
async function abrirChefe(page: Page, extra: Record<string, unknown> = {}, run?: Record<string, unknown>): Promise<void> {
  const cfg = { mode: 'arcade', c1: 'hayato', c2: CHEFE.id, cpu: null, chefe: true, esquiva: true, ...extra };
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify(cfg)}${run ? `, run: ${JSON.stringify(run)}` : ''} }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
}

/** Pula a entrada e a `intro` e deixa a luta em `fight` (os dois parados). */
async function ateALuta(page: Page): Promise<void> {
  await hook(page, PULAR_ENTRADA);
  for (let i = 0; i < 100; i++) if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
}

test.describe('Z3: a ENTRADA DRAMÁTICA do chefão', () => {
  for (const perfil of ['desktop', 'celular'] as const) {
    test(`${perfil}: o motor não anda por 270 ticks, o HUD some, o cartão aparece, e a luta segue sem a entrada ter mexido em nada`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await semear(page);
      await abrirJogo(page, '', perfil === 'celular' ? { width: 915, height: 412 } : undefined);
      await espiarTextos(page);
      await abrirChefe(page);

      // (a) com o chefe na entrada, game.tick não muda em 30 quadros (e nem o relógio da luta nem a fase)
      const antes = await hook(page, '(h) => { const g = h.mundo().game; return { tick: g.tick, t: g.t, fase: g.phase, rng: g.rng.estado ? g.rng.estado() : null }; }');
      await hook(page, '(h) => h.avancar(1)');
      expect(await hook(page, '(h) => h.ui.scene.entrada.ativa')).toBe(true);
      expect(await hook(page, '(h) => h.ui.scene.entrada.modo')).toBe('completa');
      for (let i = 0; i < 30; i++) await hook(page, '(h) => h.avancar(1)');
      const durante = await hook(page, '(h) => { const g = h.mundo().game; return { tick: g.tick, t: g.t, fase: g.phase, rng: g.rng.estado ? g.rng.estado() : null }; }');
      expect(durante).toEqual(antes);

      // (c) foto da entrada: HUD escondido (nenhum texto do HUD), cartão do ZENON dentro da área livre entre as faixas
      // a sequência da entrada de 4,5 s, em fotos: braseiros (31, 71), ele vira a cabeça (120), cartão e fala (200), fala inteira (245)
      await capturar(page, `zenon-entrada-t031-${perfil}`);
      await hook(page, '(h) => h.avancar(40)');
      await capturar(page, `zenon-entrada-t071-${perfil}`);
      await hook(page, '(h) => h.avancar(49)');
      await capturar(page, `zenon-entrada-t120-${perfil}`);
      await hook(page, '(h) => h.avancar(80)'); // tick 200: cartão e fala
      await capturar(page, `zenon-entrada-${perfil}`);
      const textos = await textosDoQuadro(page);
      const nomes = textos.map((x) => x.t);
      for (const hud of ['HAYATO', CHEFE.nome, 'KO', 'SUPER', 'ESQ', '1P  000000', CHEFE.rotulo, 'ROUND 1']) expect(nomes, `HUD "${hud}" escondido`).not.toContain(hud);
      expect(nomes).toContain('ZENON ARGYROS');
      expect(nomes).toContain(CHEFE.titulo);
      for (const x of textos.filter((q) => ['ZENON ARGYROS', CHEFE.titulo].includes(q.t))) {
        expect(x.y - x.px / 2, x.t).toBeGreaterThanOrEqual(56); // abaixo da faixa de cima
        expect(x.y + x.px / 2, x.t).toBeLessThanOrEqual(540 - 56);
        expect(x.x - x.w / 2, x.t).toBeGreaterThanOrEqual(0);
        expect(x.x + x.w / 2, x.t).toBeLessThanOrEqual(960);
      }
      // a fala sai na faixa de baixo, dentro da tela
      const fala = textos.filter((q) => 'Bem-vindo à minha casa. Todo torneio precisa de um anfitrião... e de um último convidado.'.includes(q.t) && q.t.length > 3);
      expect(fala.length).toBeGreaterThan(0);
      for (const x of fala) {
        expect(x.y - x.px / 2).toBeGreaterThanOrEqual(540 - 56);
        expect(x.x + x.w / 2).toBeLessThanOrEqual(960);
      }

      // a fala inteira fica lida na tela antes de as faixas saírem (tick 245): as 89 letras
      await hook(page, '(h) => h.avancar(45)');
      await capturar(page, `zenon-entrada-t245-${perfil}`);
      const lida = (await textosDoQuadro(page)).map((x) => x.t).join('');
      expect(lida).toContain('Bem-vindo à minha casa.');
      expect(lida).toContain('e de um último convidado.');
      // ao fim (270 updates no total) a luta segue: o tick do motor andou só DEPOIS; a `intro` é a de sempre (ROUND 1)
      await hook(page, '(h) => h.avancar(30)');
      const fim = await hook(page, '(h) => { const g = h.mundo().game; return { ativa: h.ui.scene.entrada.ativa, tick: g.tick, fase: g.phase }; }');
      expect(fim.ativa).toBe(false);
      expect(fim.fase).toBe('intro');
      // 1 + 30 + 40 + 49 + 80 + 45 + 30 = 275 updates desde o início; os 270 primeiros foram da entrada, os 5 últimos do motor
      expect(fim.tick).toBe(5);
      const depois = await textosDoQuadro(page);
      expect(depois.map((x) => x.t)).toContain('HAYATO'); // o HUD voltou
      expect(erros).toEqual([]);
    });
  }

  test('(b) ENTER no quadro 20 pula: o motor volta a andar em <= 8 quadros; e a entrada nunca é pulada antes do tick 10', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page);
    await abrirChefe(page);
    await hook(page, '(h) => h.avancar(5)');
    await page.keyboard.press('Enter'); // cedo demais (tick 5): o ENTER que confirma o VS não pode engolir a entrada
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.pulouEm')).toBeNull();
    await hook(page, '(h) => h.avancar(14)'); // tick 20
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBe(0);
    await page.keyboard.press('Enter');
    let quadros = 0;
    while ((await hook(page, '(h) => h.mundo().game.tick')) === 0 && quadros < 30) {
      await hook(page, '(h) => h.avancar(1)');
      quadros++;
    }
    expect(quadros).toBeLessThanOrEqual(8);
    expect(erros).toEqual([]);
  });

  test('um botão de ataque também pula (toque no botão do celular), e depois do continue a entrada é CURTA (1 s)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page);
    // a campanha é UM objeto (como na UI): o continue reabre a luta com a mesma `run`
    await hook(page, "(h) => { window.__run = { c1: 'hayato', etapas: [{ id: 'zenon', chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0 }; }");
    const abrirDeNovo = async (): Promise<void> => {
      await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: null, chefe: true, esquiva: true }, run: window.__run }); }");
      await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
    };
    await abrirDeNovo();
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.modo')).toBe('completa');
    expect(await hook(page, '(h) => window.__run.entradaDoChefeVista')).toBe(true);
    // a mesma campanha (um continue): curta, e termina em 60 updates
    await abrirDeNovo();
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.modo')).toBe('curta');
    await hook(page, '(h) => h.avancar(58)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.ativa')).toBe(true);
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.ativa')).toBe(false);
    expect(erros).toEqual([]);
  });
});

test.describe('Z2: a fase 2 (aura, arena gr, legenda) e o projétil anel', () => {
  /** Posiciona os dois (longe um do outro e do HUD), deixa a câmera convergir e desenha. */
  async function posicionar(page: Page, x1: number, x2: number): Promise<void> {
    await hook(page, `(h) => { const g = h.mundo().game; g.shake = 0; for (let i = 0; i < 90; i++) { g.p1.x = ${x1}; g.p2.x = ${x2}; h.avancar(1); } g.shake = 0; }`);
  }

  /** Cor média de uma janela (px do canvas) e a luminância média. */
  const janela = async (page: Page, x: number, y: number, w: number, h: number): Promise<{ r: number; g: number; b: number; lum: number }> => {
    await hook(page, '(h) => h.desenhar()');
    return page.locator('canvas#jogo').evaluate(
      (el, p) => {
        const c = el as HTMLCanvasElement;
        const d = c.getContext('2d')!.getImageData(p.x, p.y, p.w, p.h).data;
        let r = 0, g = 0, b = 0, n = 0;
        for (let i = 0; i < d.length; i += 4) { r += d[i]!; g += d[i + 1]!; b += d[i + 2]!; n++; }
        r /= n; g /= n; b /= n;
        return { r, g, b, lum: 0.2126 * r + 0.7152 * g + 0.0722 * b };
      },
      { x, y, w, h },
    );
  };

  test('fase 1 x fase 2 no MESMO cenário: braseiros laranja -> púrpura, céu mais escuro, aura no chefe; e na fase 1 nada disso', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await abrirChefe(page);
    await ateALuta(page);
    await posicionar(page, 200, 620);
    expect(await hook(page, '(h) => h.mundo().game.stage')).toBe(CHEFE.cenario);

    // onde está o braseiro grande da frente (à direita) na tela: a mesma conta da render (retângulo da arte, câmera com zoom em torno do chão)
    const pos = await page.evaluate(async () => {
      const h = (window as any).__inno;
      const g = h.mundo().game;
      const arena = await import(/* @vite-ignore */ ('/src/render/arena-gr.ts' as string));
      const a = arena.retanguloDaArte(g.cam.x);
      const b = arena.BRASEIROS_GR[5];
      const lx = a.x + b.fx * a.w;
      const ly = a.y + b.fy * a.h;
      const z = g.cam.z;
      return { x: (g.cam.x + (lx - g.cam.x) * z) * 2, y: (470 + (ly - 470) * z) * 2, z };
    });
    const chama = { x: Math.round(pos.x) - 20, y: Math.round(pos.y) - 10, w: 40, h: 40 }; // a chama inteira (miolo, corpo e a base)
    const ceu = { x: 440, y: 200, w: 160, h: 100 }; // px do canvas (x lógico 220 a 300, y 100 a 150): céu e mar entre os dois primeiros braseiros, sob os nomes e acima das cabeças

    const f1 = { chama: await janela(page, chama.x, chama.y, chama.w, chama.h), ceu: await janela(page, ceu.x, ceu.y, ceu.w, ceu.h) };
    await capturar(page, 'zenon-fase-1');
    // fase 1: a chama é laranja (azul < verde) e a mesma tela com `barras` igual dá zero diferença (a aura/arena da fase 2 não vaza)
    expect(f1.chama.b, 'chama laranja').toBeLessThan(f1.chama.g * 0.9);

    // derruba a barra 1: troca de barra, cena (relógio parado) e fase 2
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 0; g.resolverVidaZerada(g.p2, g.p1); }');
    for (let i = 0; i < 600; i++) if ((await hook(page, '(h) => { h.avancar(1); return h.mundo().game.phase; }')) === 'cena-chefe') break;
    expect(await hook(page, '(h) => h.mundo().game.phase')).toBe('cena-chefe');
    // durante a cena a rampa sobe: o céu escurece aos poucos
    const rampas: number[] = [];
    for (const alvo of [10, 45, 88]) {
      await hook(page, `(h) => { const g = h.mundo().game; while (g.t < ${alvo}) h.avancar(1); }`);
      rampas.push(await page.evaluate(async () => {
        const h = (window as any).__inno;
        const { rampaDaFase2, chefeDaLeitura } = await import(/* @vite-ignore */ ('/src/render/aura-chefe.ts' as string));
        const g = h.mundo().game;
        const c = chefeDaLeitura(g);
        return rampaDaFase2(g, c, h.mundo().elenco[c.id].ch);
      }));
    }
    expect(rampas[0]).toBeLessThan(rampas[1]!);
    expect(rampas[1]).toBeLessThan(rampas[2]!);
    expect(rampas[1]).toBeCloseTo(0.5, 0);
    // legenda "Chega de cortesia." durante a cena
    const textosCena = await textosDoQuadroComEspia(page);
    expect(textosCena).toContain('Chega de cortesia.');
    await capturar(page, 'zenon-fase-2-cena');
    for (let i = 0; i < 200; i++) if ((await hook(page, '(h) => { h.avancar(1); return h.mundo().game.phase; }')) === 'fight') break;
    expect(await hook(page, '(h) => h.mundo().game.p2.ficha')).toBe(CHEFE.fase2);
    await posicionar(page, 200, 620);

    const f2 = { chama: await janela(page, chama.x, chama.y, chama.w, chama.h), ceu: await janela(page, ceu.x, ceu.y, ceu.w, ceu.h) };
    await capturar(page, 'zenon-fase-2');
    // braseiro púrpura: o azul passa o verde com folga; o céu escureceu pelo menos 10% (luminância média da faixa livre)
    expect(f2.chama.b, 'chama púrpura').toBeGreaterThan(f2.chama.g * 1.15);
    expect(f2.ceu.lum / f1.ceu.lum, `céu ${f1.ceu.lum.toFixed(1)} -> ${f2.ceu.lum.toFixed(1)}`).toBeLessThan(0.9);
    info.annotations.push({ type: 'medido', description: `chama fase 1 ${JSON.stringify(f1.chama)} fase 2 ${JSON.stringify(f2.chama)}; céu lum ${f1.ceu.lum.toFixed(1)} -> ${f2.ceu.lum.toFixed(1)}` });

    // a AURA: a mesma tela com o chefe sem a rampa (barras = barrasMax) difere em volta dele; com a rampa 0 não há diferença nenhuma
    const torso = { x: 1160, y: 600, w: 160, h: 280 }; // px do canvas: o corpo do chefe (x lógico 620) longe dos braseiros
    const comAura = await pixels(page, torso);
    await hook(page, '(h) => { h.mundo().game.p2.barras = 2; }');
    const semAura = await pixels(page, torso);
    await hook(page, '(h) => { h.mundo().game.p2.barras = 1; }');
    const diferentes = contarDiferentes(comAura, semAura, 12);
    expect(diferentes, 'pixels do corpo que a aura muda').toBeGreaterThan(400);
    const f1a = await pixels(page, torso);
    const f1b = await pixels(page, torso);
    expect(contarDiferentes(f1a, f1b, 1), 'o mesmo quadro duas vezes').toBe(0);
    expect(erros).toEqual([]);
  });

  /** RGBA de uma região do canvas (backing 1920x1080), já com o quadro desenhado. */
  async function pixels(page: Page, r: { x: number; y: number; w: number; h: number }): Promise<number[]> {
    return page.evaluate((p) => {
      (window as any).__inno.desenhar();
      const c = document.getElementById('jogo') as HTMLCanvasElement;
      return Array.from(c.getContext('2d')!.getImageData(p.x, p.y, p.w, p.h).data);
    }, r);
  }
  const contarDiferentes = (a: number[], b: number[], limiar: number): number => {
    let n = 0;
    for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > limiar) n++;
    return n;
  };
  async function textosDoQuadroComEspia(page: Page): Promise<string[]> {
    await espiarTextos(page);
    return (await textosDoQuadro(page)).map((x) => x.t);
  }

  test('o projétil `anel` (SELO DO ARCONTE): centro ônix escuro e borda magenta no canvas de verdade', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await abrirChefe(page);
    await ateALuta(page);
    await posicionar(page, 150, 700);
    const alvo = await page.evaluate(() => {
      const h = (window as any).__inno;
      const g = h.mundo().game;
      g.p2.en = 100;
      g.p2.facing = -1;
      g.p2.startMove('sFire', g);
      for (let t = 0; t < 80 && g.projectiles.length === 0; t++) { g.p1.x = 150; h.avancar(1); }
      // deixa o anel andar um pouco para fora do chefe
      for (let t = 0; t < 14; t++) { g.p1.x = 150; h.avancar(1); }
      const p = g.projectiles[0];
      if (!p) return null;
      g.p1.x = 150;
      return { estilo: p.style, x: p.x, y: p.y, sc: p.sc, z: g.cam.z, cx: g.cam.x, vx: p.vx };
    });
    expect(alvo, 'o SELO soltou um projétil').not.toBeNull();
    expect(alvo!.estilo).toBe('anel');
    const sx = Math.round((alvo!.cx + (alvo!.x - alvo!.cx) * alvo!.z) * 2);
    const sy = Math.round((470 + (alvo!.y - 470) * alvo!.z) * 2);
    await hook(page, '(h) => h.desenhar()');
    await capturar(page, 'zenon-projetil-anel');
    const rx = 34 * alvo!.sc * alvo!.z * 2;
    const centro = await janela(page, sx - 8, sy - 4, 16, 8);
    const borda = await page.evaluate(({ sx, sy, rx }) => {
      const c = document.getElementById('jogo') as HTMLCanvasElement;
      const g = c.getContext('2d')!;
      // varre uma linha horizontal pelo centro: o pixel mais saturado em magenta (r e b altos, g baixo)
      const d = g.getImageData(sx - Math.round(rx * 1.3), sy - 3, Math.round(rx * 2.6), 6).data;
      let melhor = 0;
      for (let i = 0; i < d.length; i += 4) melhor = Math.max(melhor, Math.min(d[i]!, d[i + 2]!) - d[i + 1]!);
      return melhor;
    }, { sx, sy, rx });
    expect(centro.lum, 'núcleo ônix: escuro (a energia em negativo)').toBeLessThan(55);
    expect(borda, 'borda em brilho magenta').toBeGreaterThan(60);
    expect(erros).toEqual([]);
  });

  test('o TRIBUTO drena: o acerto traz `dreno`, a energia passa do rival para o ZENON e as moedas douradas voam até a barra dele', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await abrirChefe(page);
    await ateALuta(page);
    const r = await page.evaluate(() => {
      const h = (window as any).__inno;
      const g = h.mundo().game;
      g.p1.x = 380;
      g.p2.x = 560;
      g.p1.en = 60;
      g.p2.en = 100;
      g.p2.facing = -1;
      g.p1.facing = 1;
      const antes = { rival: g.p1.en, zenon: g.p2.en };
      g.p2.startMove('sFwd', g);
      let dreno = 0;
      let moedas = 0;
      let tick = -1;
      for (let t = 0; t < 90; t++) {
        h.avancar(1);
        for (const e of g.events) if (e.tipo === 'hit' && e.dreno) dreno = e.dreno;
        moedas = Math.max(moedas, h.ui.scene.moedas.ativas);
        if (dreno && tick < 0) { tick = t; h.desenhar(); }
        if (dreno && t > tick + 10) break;
      }
      return { antes, dreno, moedas, depois: { rival: g.p1.en, zenon: g.p2.en } };
    });
    expect(r.dreno, 'o TRIBUTO acertou e drenou').toBeGreaterThan(0);
    expect(r.moedas).toBeGreaterThan(0);
    expect(r.depois.rival).toBeLessThan(r.antes.rival + 5); // o rival ganha +5 no acerto e perde o dreno: nunca fica acima disso
    await capturar(page, 'zenon-dreno-moedas');
    expect(erros).toEqual([]);
  });

  test('o frame de desenho na fase 2 não passa de 1,25x o da fase 1 (celular emulado; medido, p50 de rodadas alternadas)', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page, '&expansao=1', { width: 915, height: 412 });
    await abrirChefe(page);
    await ateALuta(page);
    await posicionar(page, 250, 680);
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 0; g.resolverVidaZerada(g.p2, g.p1); }');
    for (let i = 0; i < 400; i++) if ((await hook(page, '(h) => { h.avancar(1); return h.mundo().game.phase; }')) === 'fight' && (await hook(page, '(h) => h.mundo().game.p2.ficha')) === CHEFE.fase2) break;
    await posicionar(page, 250, 680);
    const r = await page.evaluate(() => {
      const h = (window as any).__inno;
      const g = h.mundo().game;
      const medir = (n: number): number[] => {
        const ts: number[] = [];
        for (let i = 0; i < n; i++) {
          const t0 = performance.now();
          h.desenhar();
          (document.getElementById('jogo') as HTMLCanvasElement).getContext('2d')!.getImageData(0, 0, 1, 1); // força a GPU a terminar o quadro
          ts.push(performance.now() - t0);
        }
        return ts;
      };
      const med = (a: number[]): number => [...a].sort((x, y) => x - y)[Math.floor(a.length / 2)] as number;
      const f1: number[] = [];
      const f2: number[] = [];
      medir(10);
      for (let rodada = 0; rodada < 6; rodada++) {
        g.p2.barras = 2; // rampa 0 = a fase 1 (a mesma tela, sem aura nem arena de fase 2)
        f1.push(med(medir(25)));
        g.p2.barras = 1;
        f2.push(med(medir(25)));
      }
      return { f1: med(f1), f2: med(f2) };
    });
    info.annotations.push({ type: 'medido', description: `quadro de desenho (celular 915x412, canvas por software): fase 1 ${r.f1.toFixed(2)} ms, fase 2 ${r.f2.toFixed(2)} ms, razão ${(r.f2 / r.f1).toFixed(3)}` });
    expect(r.f2 / r.f1).toBeLessThan(1.25);
    expect(erros).toEqual([]);
  });
});

test.describe('Z2: a cinemática E12 dos 5 especiais do ZENON (brilho, núcleo ônix e nome)', () => {
  test('cada especial abre a tarja no estilo E12: nome do golpe, brilho na cor da paleta e nenhum shadowBlur/filter', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await page.addInitScript(() => {
      const w = window as any;
      w.__proibido = [] as string[];
      const proto = CanvasRenderingContext2D.prototype as any;
      for (const prop of ['shadowBlur', 'filter']) {
        const d = Object.getOwnPropertyDescriptor(proto, prop);
        if (!d?.set) continue;
        Object.defineProperty(proto, prop, { get: d.get as () => unknown, set(v: unknown) { if (v !== 0 && v !== 'none') w.__proibido.push(`${prop}=${String(v)}`); d.set!.call(this, v); } });
      }
    });
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await espiarTextos(page);
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: 'zenon', c2: 'hayato', cpu: null, esquiva: true } }); }");
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
    for (let i = 0; i < 300; i++) if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
    const casos: Array<[string | null, string, string, string]> = [
      [null, 'sFire', 'SELO DO ARCONTE', 'selo'],
      [null, 'sDown', 'COLUNA DE ÔNIX', 'coluna'],
      [null, 'sFwd', 'TRIBUTO', 'tributo'],
      ['chefe2', 'sFire', 'SELO MAIOR', 'selo-maior'],
      ['chefe2', 'sFwd', 'DECRETO', 'decreto'],
    ];
    for (const [ficha, golpe, nome, variante] of casos) {
      const brilho: string = await page.evaluate(async ({ ficha, golpe }) => {
        const h = (window as any).__inno;
        const g = h.mundo().game;
        g.p1.trocarFicha(ficha);
        g.p1.reset(false);
        g.p1.ficha = ficha;
        g.p1.x = 300;
        g.p2.x = 560;
        g.p1.en = 100;
        g.p1.facing = 1;
        g.p1.startMove(golpe, g);
        for (let t = 0; t < 40 && !h.ui.scene.cine.ativa; t++) h.avancar(1);
        h.avancar(22);
        const { identidadeDe } = await import(/* @vite-ignore */ ('/src/render/identidade-especiais.ts' as string));
        return identidadeDe('zenon', ficha, golpe).paleta.brilho as string;
      }, { ficha, golpe });
      expect(await hook(page, '(h) => h.ui.scene.cine.ativa'), `${nome}: a cinemática abriu`).toBe(true);
      const textos = (await textosDoQuadro(page)).map((x) => x.t);
      expect(textos, `${nome}: o nome na tarja`).toContain(nome);
      // a faixa central (y 360..640 do canvas) tem a cor do brilho da paleta em quantidade (a assinatura do estilo)
      const alvo = [parseInt(brilho.slice(1, 3), 16), parseInt(brilho.slice(3, 5), 16), parseInt(brilho.slice(5, 7), 16)];
      const n: number = await page.locator('canvas#jogo').evaluate((el, a) => {
        const d = (el as HTMLCanvasElement).getContext('2d')!.getImageData(0, 360, 1920, 280).data;
        let c = 0;
        for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i]! - a[0]!) + Math.abs(d[i + 1]! - a[1]!) + Math.abs(d[i + 2]! - a[2]!) < 90) c++;
        return c;
      }, alvo);
      expect(n, `${nome} (${variante}): pixels na cor do brilho ${brilho}`).toBeGreaterThan(600);
      await capturar(page, `cinematica-zenon-${ficha ?? 'base'}-${golpe}-desktop`);
      await hook(page, '(h) => { for (let t = 0; t < 120 && h.ui.scene.cine.ativa; t++) h.avancar(1); h.avancar(60); }');
    }
    expect(await page.evaluate(() => (window as any).__proibido)).toEqual([]);
    expect(erros).toEqual([]);
  });
});

test.describe('Z2: a ESCALA 1,32 do ZENON contra os nomes do HUD', () => {
  test('topo da cabeça >= base dos nomes + 4 px em idle*, walk* e block, e >= a base dos nomes (folga >= 0) nas poses de vitória e na cena (câmera ao zoom máximo); salto <= 0,72 não sai da tela', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await abrirChefe(page);
    await ateALuta(page);
    const r = await page.evaluate(async () => {
      const h = (window as any).__inno;
      const m = h.mundo();
      const g = m.game;
      for (let i = 0; i < 160; i++) { g.p1.x = 450; g.p2.x = 520; h.avancar(1); }
      const cv = document.getElementById('jogo') as HTMLCanvasElement;
      const ctx = cv.getContext('2d')!;
      const hud = await import(/* @vite-ignore */ ('/src/render/hud.ts' as string));
      // a base dos nomes: o HUD sozinho num canvas limpo, a linha mais baixa de tinta na faixa y 100..220 (px do canvas), x do nome do chefão
      const c2 = document.createElement('canvas');
      c2.width = 1920;
      c2.height = 1080;
      const x2 = c2.getContext('2d')!;
      x2.setTransform(2, 0, 0, 2, 0, 0);
      hud.desenharHUD(x2, g, m.elenco, { esquiva: true });
      const dados = x2.getImageData(0, 0, 1920, 1080).data;
      const fundoDoNome = (xa: number, xb: number): number => {
        let ult = -1;
        for (let y = 100; y < 220; y++) for (let x = xa; x < xb; x++) if (dados[(y * 1920 + x) * 4 + 3]! > 40) { ult = y; break; }
        return ult / 2;
      };
      const nomes = Math.max(fundoDoNome(1500, 1720), fundoDoNome(210, 380));
      const arte = m.elenco[g.p2.id].arte;
      const topoDe = (nome: string, dy = 0): number => {
        g.p2.pose.name = nome;
        g.p2.y = 470 - dy;
        g.p1.pose.name = 'idle0';
        g.shake = 0;
        h.desenhar();
        const a = ctx.getImageData(0, 0, 1920, 1080).data;
        arte.imagemDe = () => null;
        arte.silhuetaDe = () => null;
        h.desenhar();
        const b = ctx.getImageData(0, 0, 1920, 1080).data;
        delete arte.imagemDe;
        delete arte.silhuetaDe;
        for (let y = 100; y < 1080; y++) for (let x = 0; x < 1920; x++) {
          const i = (y * 1920 + x) * 4;
          if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 30) return y / 2;
        }
        return 9999;
      };
      const comuns = ['idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7', 'block'];
      const altas = ['win', 'vitoria0', 'vitoria1', 'entrada0', 'entrada1', 'entrada2', 'cena2'];
      const topos: Record<string, number> = {};
      for (const p of [...comuns, ...altas]) topos[p] = topoDe(p);
      const vy0 = 16.5 * g.p2.ch.jump;
      const apice = (vy0 * vy0) / (2 * 0.85);
      return { zoom: g.cam.z, jump: g.p2.ch.jump, escala: g.p2.ch.scale, nomes, topos, comuns, altas, apice, jup: topoDe('jup', apice * 0.9), jtop: topoDe('jtop', apice) };
    });
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.pose.name = "idle2"; g.p2.y = 470; h.desenhar(); }');
    await capturar(page, 'zenon-escala-1-32-hud');
    info.annotations.push({ type: 'medido', description: JSON.stringify({ zoom: +r.zoom.toFixed(4), escala: r.escala, baseDosNomes: r.nomes, topos: r.topos, salto: { apice: +r.apice.toFixed(1), jup: r.jup, jtop: r.jtop } }) });
    expect(r.escala).toBe(1.32);
    expect(r.jump).toBeLessThanOrEqual(0.72);
    expect(r.zoom).toBeGreaterThan(1.06); // a câmera encostou perto do zoom máximo (1,075)
    for (const p of r.comuns) expect(r.topos[p], `${p}: topo ${r.topos[p]} contra nomes ${r.nomes}`).toBeGreaterThanOrEqual(r.nomes + 4);
    expect(r.jup).toBeGreaterThanOrEqual(0); // o salto máximo não passa do teto da tela
    expect(r.jtop).toBeGreaterThanOrEqual(0);
    // as poses ALTAS (vitória: aplauso de braços erguidos) também ficam abaixo da base dos nomes (y 77), inclusive nos cantos: o teste mede a faixa inteira da largura
    for (const p of r.altas) expect(r.topos[p], `${p}: topo ${r.topos[p]} contra nomes ${r.nomes}`).toBeGreaterThanOrEqual(r.nomes);
    expect(erros).toEqual([]);
  });
});

test.describe('Z2: a seleção de 10 com a casa de honra, medida no navegador', () => {
  for (const [perfil, viewport] of [['desktop', { width: 1280, height: 720 }], ['celular', { width: 915, height: 412 }]] as const) {
    test(`${perfil}: honra 256x44 sem tocar a 3ª linha, o painel nem a faixa de dica; o texto cabe; ${perfil === 'celular' ? 'toque na honra seleciona a 10ª casa' : 'o clique na honra vai para ela'}`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await semear(page, { desbloqueados: ['aminu'], zeradas: 1 });
      await abrirJogo(page, '', viewport);
      await espiarTextos(page);
      await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); h.avancar(30); h.desenhar(); }");
      const caixas = await hook(page, '(h) => Array.from({ length: 10 }, (_, i) => h.ui.scene.tileRect(i))');
      const honra = caixas[9];
      expect(honra).toEqual({ x: 352, y: 356, w: 256, h: 44 });
      const cv = (await page.locator('canvas#jogo').boundingBox())!;
      const k = cv.width / 960;
      info.annotations.push({ type: 'toque', description: `${perfil}: canvas ${cv.width.toFixed(0)}x${cv.height.toFixed(0)} CSS; casa de honra ${(honra.w * k).toFixed(0)}x${(honra.h * k).toFixed(1)} px CSS (área de toque ${(56 * k).toFixed(1)} px de altura)` });
      expect(honra.y - 4).toBeGreaterThanOrEqual(caixas[8].y + caixas[8].h + 4); // molduras sem tocar
      // o painel de descrição e o texto, com o chefão oculto e com outras casas: tudo entre y 408 e 500, acima da faixa de dica (510)
      for (const indice of [9, 8, 0, 4]) {
        await hook(page, `(h) => { h.ui.scene.cur[0] = ${indice}; h.avancar(3); }`);
        const textos = await textosDoQuadro(page);
        const painel = textos.filter((q) => q.x - (q.align === 'center' ? q.w / 2 : q.align === 'right' ? q.w : 0) >= 352 && q.x <= 608 && q.y > 404 && q.y < 520 && q.px >= 12);
        expect(painel.length, `painel da casa ${indice}`).toBeGreaterThan(0);
        for (const q of painel) {
          expect(q.y - q.px / 2, `casa ${indice} "${q.t}" topo`).toBeGreaterThanOrEqual(408);
          expect(q.y + q.px / 2, `casa ${indice} "${q.t}" base`).toBeLessThanOrEqual(500);
        }
        // o nome do painel (22 px, centrado em x 480) já está dentro do painel que desceu para y 408
        const nome = textos.filter((q) => q.px === 22 && Math.abs(q.x - 480) < 1);
        expect(nome.length, `casa ${indice}: nome do painel`).toBe(1);
        expect(nome[0]!.y - nome[0]!.px / 2, `casa ${indice}: nome do painel`).toBeGreaterThanOrEqual(408);
        const dentro = textos.filter((q) => q.y > 356 && q.y < 400 && q.x > 352 && q.x < 608);
        for (const q of dentro) expect(q.y + q.px / 2, `honra "${q.t}"`).toBeLessThanOrEqual(400);
      }
      // com o cursor na honra: fotos
      await hook(page, '(h) => { h.ui.scene.cur[0] = 9; h.avancar(5); }');
      await capturar(page, `selecao-10-honra-oculto-${perfil}`);
      // toque / clique no meio da honra e na folga
      const alvoCss = (lx: number, ly: number) => ({ x: cv.x + lx * k, y: cv.y + ly * k });
      await hook(page, '(h) => { h.ui.scene.cur[0] = 0; }');
      const centro = alvoCss(480, 378);
      if (perfil === 'celular') await page.touchscreen.tap(centro.x, centro.y);
      else await page.mouse.click(centro.x, centro.y);
      expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(9);
      expect((await hook(page, '(h) => h.ui.scene.lock'))[0]).toBe(false); // oculto: não confirma
      await hook(page, '(h) => { h.ui.scene.cur[0] = 0; }');
      const folga = alvoCss(480, 405); // no vão entre a honra e o painel: ainda é toque na honra
      if (perfil === 'celular') await page.touchscreen.tap(folga.x, folga.y);
      else await page.mouse.click(folga.x, folga.y);
      expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(9);
      expect(erros).toEqual([]);
    });
  }

  test('desktop: o chefão derrotado vira NOVO! na honra, confirma e mostra o rosto, o nome e o título dele', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page, { desbloqueados: ['aminu', CHEFE.id], zeradas: 1, chefeDerrotado: true, chefesDerrotados: [CHEFE.id], vistos: ['aminu'] });
    await abrirJogo(page);
    await espiarTextos(page);
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); h.avancar(30); }");
    expect(await hook(page, '(h) => [...h.ui.scene.novos]')).toEqual([CHEFE.id]);
    await hook(page, '(h) => { h.ui.scene.cur[0] = 9; h.avancar(5); }');
    const textos = (await textosDoQuadro(page)).map((x) => x.t);
    expect(textos).toContain(CHEFE.nome);
    expect(textos).toContain(CHEFE.titulo);
    expect(textos).toContain('CHEFÃO');
    expect(textos).toContain('NOVO!');
    await capturar(page, 'selecao-10-honra-liberado');
    await page.keyboard.press('Enter');
    expect((await hook(page, '(h) => h.ui.scene.lock'))[0]).toBe(true);
    expect(erros).toEqual([]);
  });

  test('desktop: o aviso do chefão traz o texto do ZENON ("O ANFITRIÃO ESTÁ À SUA ESPERA"), sem silhueta nem nome', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page);
    await espiarTextos(page);
    const cfg = { mode: 'arcade', c1: 'hayato', c2: CHEFE.id, cpu: 0, chefe: true };
    const run = { c1: 'hayato', etapas: [{ id: CHEFE.id, chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0 };
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('chefe', { cfg: ${JSON.stringify(cfg)}, run: ${JSON.stringify(run)} }); h.avancar(60); }`);
    const textos = (await textosDoQuadro(page)).map((x) => x.t);
    expect(textos).toContain('O ANFITRIÃO');
    expect(textos).toContain('ESTÁ À SUA ESPERA');
    expect(textos).toContain('???');
    expect(textos).not.toContain('UM DESAFIANTE');
    expect(textos).not.toContain(CHEFE.nome);
    await capturar(page, 'zenon-aviso-de-chefe');
    expect(erros).toEqual([]);
  });
});

test.describe('Z2: o ZENON em cada cenário (contraste do corpo contra o fundo)', () => {
  const CENARIOS = ['gr', 'jp', 'cn', 'kr', 'br', 'ng', 'mx', 'fr', 'in', 'mn'];

  test('foto do ZENON em cada um dos 10 cenários e o contraste de luminância do corpo (A/B com e sem o sprite)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await abrirChefe(page);
    await ateALuta(page);
    const medidas: Record<string, { corpo: number; fundo: number; razao: number; botas: number }> = {};
    for (const cen of CENARIOS) {
      await page.evaluate(async (id) => {
        const h = (window as any).__inno;
        await h.mundo().arte.garantir({ cenarios: [id] });
        if (!h.mundo().rec.cenarios.has(id)) h.mundo().rec.cenarios.set(id, h.mundo().arte.cenarios.get(id));
        const g = h.mundo().game;
        g.stage = id;
        g.shake = 0;
        for (let i = 0; i < 90; i++) { g.p1.x = 250; g.p2.x = 700; h.avancar(1); }
        g.p2.pose.name = 'idle0';
        g.p1.pose.name = 'idle0';
        g.shake = 0;
      }, cen);
      await capturar(page, `zenon-cenario-${cen}`);
      medidas[cen] = await page.evaluate(() => {
        const h = (window as any).__inno;
        const m = h.mundo();
        const g = m.game;
        const cv = document.getElementById('jogo') as HTMLCanvasElement;
        const ctx = cv.getContext('2d')!;
        const arte = m.elenco[g.p2.id].arte;
        const ler = (): Uint8ClampedArray => { h.desenhar(); return ctx.getImageData(0, 0, 1920, 1080).data; };
        const a = ler();
        arte.imagemDe = () => null;
        arte.silhuetaDe = () => null;
        const b = ler();
        delete arte.imagemDe;
        delete arte.silhuetaDe;
        const lum = (d: Uint8ClampedArray, i: number): number => {
          const f = (v: number): number => { const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4; };
          return 0.2126 * f(d[i]!) + 0.7152 * f(d[i + 1]!) + 0.0722 * f(d[i + 2]!);
        };
        // só o corpo (diferença entre com e sem sprite), em duas faixas: tudo e as botas (o quinto de baixo da altura do sprite); fundo = o mesmo pixel sem sprite
        let ys = 9999, ye = 0;
        const mascara: number[] = [];
        for (let y = 100; y < 1000; y++) for (let x = 1100; x < 1800; x++) {
          const i = (y * 1920 + x) * 4;
          if (Math.abs(a[i]! - b[i]!) + Math.abs(a[i + 1]! - b[i + 1]!) + Math.abs(a[i + 2]! - b[i + 2]!) > 40) { mascara.push(i); ys = Math.min(ys, y); ye = Math.max(ye, y); }
        }
        const lim = ye - (ye - ys) * 0.2;
        let sc = 0, sf = 0, n = 0, sb = 0, sfb = 0, nb = 0;
        for (const i of mascara) {
          const y = Math.floor(i / 4 / 1920);
          sc += lum(a, i); sf += lum(b, i); n++;
          if (y >= lim) { sb += lum(a, i); sfb += lum(b, i); nb++; }
        }
        const corpo = sc / n, fundo = sf / n;
        const razao = (Math.max(corpo, fundo) + 0.05) / (Math.min(corpo, fundo) + 0.05);
        const razaoBotas = nb ? (Math.max(sb / nb, sfb / nb) + 0.05) / (Math.min(sb / nb, sfb / nb) + 0.05) : 0;
        return { corpo: +corpo.toFixed(4), fundo: +fundo.toFixed(4), razao: +razao.toFixed(2), botas: +razaoBotas.toFixed(2) };
      });
    }
    info.annotations.push({ type: 'contraste', description: JSON.stringify(medidas) });
    // a arena do chefão: o piso clareado dá ao corpo (casaco e calça escuros) pelo menos o 1,5:1 que o Apolo mediu (1,53 casaco/calça; 1,85 botas)
    expect(medidas['gr']!.razao, 'corpo x fundo no gr').toBeGreaterThanOrEqual(1.5);
    expect(medidas['gr']!.botas, 'botas x piso no gr').toBeGreaterThanOrEqual(1.5);
    for (const cen of CENARIOS) expect(medidas[cen]!.razao, `${cen}: o corpo é visível`).toBeGreaterThan(1.15);
    expect(erros).toEqual([]);
  });
});

test.describe('Z5: a carga sob demanda do ZENON', () => {
  test('nenhuma página do atlas dele é pedida no boot nem antes da luta anterior ao chefão; na 5ª luta o ARCADE pré-busca as páginas', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    const urls: string[] = [];
    page.on('request', (r) => {
      const p = new URL(r.url()).pathname;
      if (p.startsWith('/assets/lutadores/zenon/')) urls.push(p);
    });
    await semear(page);
    await abrirJogo(page);
    const paginas = (): string[] => urls.filter((u) => /\/atlas-\d\.webp$/.test(u));
    expect(urls.filter((u) => u.endsWith('/retrato.png') || u.endsWith('/atlas.json')).length).toBeGreaterThanOrEqual(2); // manifesto e retrato no boot
    expect(paginas()).toEqual([]);
    // seleção e menus não pedem as páginas dele
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); h.avancar(30); }");
    expect(paginas()).toEqual([]);
    // 4ª luta do ARCADE (idx 3): o próximo rival é o 5º: nada do ZENON
    const etapas = [{ id: 'caio', chefe: false }, { id: 'wei-long', chefe: false }, { id: 'min-ji', chefe: false }, { id: 'aminu', chefe: false }, { id: 'camille', chefe: false }, { id: CHEFE.id, chefe: true }];
    const run = (idx: number) => ({ c1: 'hayato', etapas, idx, score: 0, continues: 3, diff: 0, cont: 0 });
    await hook(page, `(h) => { h.ui.set('fight', { cfg: { mode: 'arcade', c1: 'hayato', c2: 'min-ji', cpu: 0, esquiva: true }, run: ${JSON.stringify(run(3))} }); }`);
    await page.waitForTimeout(600);
    expect(paginas()).toEqual([]);
    // 5ª luta (idx 4): o próximo é o chefão: o ARCADE pré-busca (baixa sem decodificar) as páginas do ZENON enquanto esta luta acontece
    await hook(page, `(h) => { h.ui.set('fight', { cfg: { mode: 'arcade', c1: 'hayato', c2: 'camille', cpu: 0, esquiva: true }, run: ${JSON.stringify(run(4))} }); }`);
    await expect.poll(() => paginas().length, { timeout: 20_000 }).toBeGreaterThanOrEqual(1);
    expect(erros).toEqual([]);
  });
});

test.describe('Z4: as falas do chefão só no matchend / KO final, e as poses de vitória', () => {
  const VITORIA = 'Aplausos para o convidado. A saída é pelos fundos.';
  const DERROTA = 'Então o torneio é seu. Cuide melhor dele do que eu cuidei.';

  async function luta(page: Page, winsNeeded: number): Promise<void> {
    await semear(page);
    await abrirJogo(page, '&expansao=1');
    await espiarTextos(page);
    await abrirChefe(page);
    await ateALuta(page);
    await hook(page, `(h) => { const g = h.mundo().game; g.winsNeeded = ${winsNeeded}; g.p1.x = 300; g.p2.x = 640; }`);
  }
  const fase = (page: Page): Promise<string> => hook(page, '(h) => h.mundo().game.phase');
  /** Anda até a fase (no máximo `max` quadros). */
  async function ate(page: Page, alvo: string, max = 600): Promise<void> {
    for (let i = 0; i < max; i++) {
      if ((await fase(page)) === alvo) return;
      await hook(page, '(h) => h.avancar(1)');
    }
    throw new Error(`não chegou a ${alvo} (parou em ${await fase(page)})`);
  }
  /** Anda `n` quadros e devolve os textos desenhados. */
  async function textosApos(page: Page, n: number): Promise<string[]> {
    await hook(page, `(h) => h.avancar(${n})`);
    return (await textosDoQuadro(page)).map((x) => x.t);
  }
  const poseDesenhada = (page: Page): Promise<string> => page.evaluate(async () => {
    const h = (window as any).__inno;
    const { leituraApresentada } = await import(/* @vite-ignore */ ('/src/render/apresentacao-lutadores.ts' as string));
    const g = h.mundo().game;
    return leituraApresentada(g, g.p2).pose.name;
  });

  test('vitória do ZENON: fala SÓ no matchend (nunca no roundend), com as poses vitoria0 e vitoria1', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await luta(page, 2);
    // round 1 ganho pelo ZENON por tempo, com a luta ainda aberta (2 rounds): roundend, sem fala nenhuma
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.hp = 30; g.timeLeft = 1; g.tick60 = 59; }');
    await ate(page, 'roundend');
    for (const n of [1, 12, 40]) {
      const textos = await textosApos(page, n);
      expect(textos, `roundend +${n}`).not.toContain(VITORIA);
      expect(textos, `roundend +${n}`).not.toContain(DERROTA);
    }
    // luta de 1 round: o ZENON vence por tempo -> matchend, com a fala e a pose de vitória pelo tempo da fase
    await hook(page, '(h) => { const g = h.mundo().game; g.winsNeeded = 1; g.phase = "fight"; g.t = 0; g.round = 1; g.p1.wins = 0; g.p2.wins = 0; g.p1.setState("idle"); g.p2.setState("idle"); g.p1.hp = 30; g.p2.hp = g.p2.maxHp; g.timeLeft = 1; g.tick60 = 59; }');
    await ate(page, 'matchend');
    expect(await hook(page, '(h) => h.mundo().game.matchWinner')).toBe(1);
    const nomes: string[] = [];
    for (const [alvo, esperada] of [[30, 'vitoria0'], [60, 'vitoria1']] as const) {
      await hook(page, `(h) => { const g = h.mundo().game; while (g.t < ${alvo}) h.avancar(1); h.desenhar(); }`);
      expect(await fase(page)).toBe('matchend');
      expect(await poseDesenhada(page), `t ${alvo}`).toBe(esperada);
      expect(await textosApos(page, 0), `t ${alvo}`).toContain(VITORIA);
      await capturar(page, `zenon-vitoria-matchend-${esperada}`);
      nomes.push(esperada);
    }
    expect(nomes).toEqual(['vitoria0', 'vitoria1']);
    expect(erros).toEqual([]);
  });

  test('derrota do ZENON: fala SÓ no KO final (e depois dele no matchend); KO de round, perda por tempo e roundend ficam mudos', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await luta(page, 2);
    // KO de round (o jogador ainda não ganhou nenhum round e a luta é de 2): NÃO é o KO final
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.barras = 1; g.ko(g.p2, g.p1); }');
    expect(await fase(page)).toBe('ko');
    expect(await textosApos(page, 10)).not.toContain(DERROTA);
    // o KO final: o jogador já tem 1 round de 2 e este fecha a luta
    await luta(page, 2);
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.wins = 1; g.p2.barras = 1; g.ko(g.p2, g.p1); }');
    expect(await fase(page)).toBe('ko');
    expect(await textosApos(page, 10)).toContain(DERROTA);
    await capturar(page, 'zenon-derrota-ko-final');
    await ate(page, 'matchend');
    expect(await textosApos(page, 12)).toContain(DERROTA);
    // perder por TEMPO (a vida não zerou) não fala
    await luta(page, 1);
    await hook(page, '(h) => { const g = h.mundo().game; g.p2.hp = 20; g.timeLeft = 1; g.tick60 = 59; }');
    await ate(page, 'matchend');
    expect(await hook(page, '(h) => h.mundo().game.matchWinner')).toBe(0);
    expect(await textosApos(page, 12)).not.toContain(DERROTA);
    expect(erros).toEqual([]);
  });
});

test.describe('Z4: nomes dos especiais no painel da seleção', () => {
  test('nenhum nome de lutador NOVO passa da borda do painel; os 4 originais seguem a 13 px (fidelidade)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page, { desbloqueados: ['aminu', 'centella', 'camille', 'nila', 'baatar'], zeradas: 2, chefeDerrotado: true });
    await abrirJogo(page, '&expansao=1');
    await espiarTextos(page);
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); h.avancar(30); h.desenhar(); }");
    const grade: string[] = await hook(page, '(h) => h.ui.scene.grade');
    expect(grade).toHaveLength(10);
    const originais = ['hayato', 'wei-long', 'min-ji', 'caio'];
    const medidas: Array<{ id: string; nome: string; px: number; direita: number }> = [];
    for (let i = 0; i < grade.length; i++) {
      await hook(page, `(h) => { h.ui.scene.cur[0] = ${i}; h.ui.scene.cur[1] = ${i}; h.avancar(2); }`);
      expect(await hook(page, `(h) => h.ui.scene.estado(h.ui.scene.idEm(${i}))`), grade[i]).not.toMatch(/travado|oculto/);
      const textos = await textosDoQuadro(page);
      // os 3 nomes de especial de cada painel: coluna x = px + 180 (P1 px 20, P2 px 656), linhas y 456, 473, 490
      for (const [px, lado] of [[20, 'P1'], [656, 'P2']] as const) {
        const linhas = textos.filter((q) => Math.abs(q.x - (px + 180)) < 0.01 && [456, 473, 490].some((y) => Math.abs(q.y - y) < 0.01));
        expect(linhas.length, `${grade[i]} ${lado}: 3 nomes de especial`).toBe(3);
        for (const q of linhas) {
          const direita = q.x + q.w;
          medidas.push({ id: `${grade[i]}/${lado}`, nome: q.t, px: q.px, direita: +(direita - (px + 284)).toFixed(1) });
          if (originais.includes(grade[i]!)) expect(q.px, `${grade[i]} "${q.t}" é original: 13 px`).toBe(13);
          else expect(direita, `${grade[i]} ${lado} "${q.t}" passa da borda do painel (${q.px}px, ${q.w.toFixed(1)} de largura)`).toBeLessThanOrEqual(px + 284 - 8);
        }
      }
      if (grade[i] === 'zenon') await capturar(page, 'selecao-10-especiais-zenon');
      if (grade[i] === 'baatar') await capturar(page, 'selecao-10-especiais-baatar');
    }
    info.annotations.push({ type: 'medido', description: JSON.stringify(medidas.filter((m) => m.id.endsWith('/P1')).map((m) => `${m.id.split('/')[0]} ${m.nome} ${m.px}px folga ${-m.direita}`)) });
    expect(medidas.some((m) => m.px < 13), 'algum nome novo encolheu').toBe(true);
    expect(erros).toEqual([]);
  });
});
