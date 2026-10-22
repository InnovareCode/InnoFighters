/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { GRADE_DE_PRODUCAO } from './_chefe';
import { SEM_PROVOCACAO } from './_luta';

/*
 * Seleção (2026-10-21, três pedidos do dono): a casa ALEATÓRIA ("RANDOM") da grade de 10, a etiqueta do jogador (VOCÊ...) que cobria o rosto e a tipografia nova.
 * A lógica está provada em tests/unit/{aleatoria,fontes,z2-grade-honra}.test.ts; aqui, no navegador: pixels da etiqueta contra o lutador desenhado (nos 10, nas duas
 * poses, na escala 1,32 do ZENON e no celular deitado), a casa aleatória em repouso/girando/reduced-motion, teclado/mouse/toque, o fluxo até a luta e o RNG da luta intacto.
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 (repouso, girando, revelado, movimento reduzido, etiquetas): `SALVAR_CAPTURAS=arte-fonte/capturas npx playwright test selecao-aleatoria`.
 */
test.describe.configure({ timeout: 180_000 });

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

async function abrirJogo(page: Page, query = '', viewport?: { width: number; height: number }): Promise<void> {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(`/?seed=3&manual=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

/** Abre a seleção (sem fade) já na cena, no modo dado; `js` roda com `S` = a cena. */
const abrirSelecao = (page: Page, modo: string, js = ''): Promise<any> =>
  hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: '${modo}' }); const S = h.ui.cenas.select; ${js} h.avancar(2); }`);

/** No modo manual nada desenha sozinho: desenha uma vez (o que pede o atlas) e espera os atlas chegarem. */
async function aguardarArte(page: Page, ids: readonly string[]): Promise<void> {
  await hook(page, '(h) => h.desenhar()');
  for (const id of ids) {
    await page.waitForFunction((x) => (window as any).__inno.mundo().arte.atlas.get(x)?.pronta === true, id, { timeout: 30_000 });
  }
}

const VIEWPORTS = { desktop: { width: 1280, height: 720 }, celular: { width: 915, height: 412 } } as const;

// ---------------------------------------------------------------------------------------------------------------------------------------------
// 1. A etiqueta do jogador não cobre rosto nenhum
// ---------------------------------------------------------------------------------------------------------------------------------------------

type Medida = {
  /** Pixels da etiqueta (desenho com e sem o texto) que caem sobre pixels do lutador (alfa > 20), nas duas poses e em 5 instantes da respiração. */
  sobre: number;
  /** O mesmo, com a etiqueta no lugar ANTIGO (y 72 centrada no painel): o controle negativo da medida. */
  sobreAntiga: number;
  /** Caixa da etiqueta no lugar novo (px lógicos). */
  caixa: { x0: number; y0: number; x1: number; y1: number };
  /** Topo do lutador (px lógicos, y) na pose mais alta. */
  topoDoLutador: number;
  /** Duas chamadas seguidas de `desenhar` dão o MESMO quadro (senão a diferença com/sem texto mediria animação, não a etiqueta). */
  quadroEstavel: boolean;
  /** Um pixel da etiqueta caiu fora do painel do lutador? (a etiqueta mora no painel: x px..px+284, y 374..506). */
  foraDoPainel: boolean;
};

/**
 * Mede, no navegador, a etiqueta `tag` do jogador `lado` contra o lutador `id` desenhado na lateral dele (mesma chamada `mostrarLutador` da cena: escala de vitrine, tick
 * e pose do brilho). A etiqueta é achada pela DIFERENÇA de pixels entre o quadro com e sem o texto dela (sem máscara, sem suposição de posição).
 */
async function medirEtiqueta(page: Page, tag: string, lado: 0 | 1, id: string): Promise<Medida> {
  return page.evaluate(
    async ({ tag, lado, id }) => {
      const h = (window as any).__inno;
      const cv = document.getElementById('jogo') as HTMLCanvasElement;
      const ctx = cv.getContext('2d')!;
      const F = await import(/* @vite-ignore */ ('/src/ui/ferramentas.ts' as string));
      const P = await import(/* @vite-ignore */ ('/src/ui/personagens.ts' as string));
      const m = h.mundo();
      const ch = m.elenco[id].ch;
      const px = lado === 0 ? 20 : 960 - 20 - 284;
      const ler = (): Uint8ClampedArray => {
        h.desenhar();
        return ctx.getImageData(0, 0, 1920, 1080).data.slice();
      };
      h.ui.t = 40;
      const a = ler();
      const a2 = ler();
      let estavel = true;
      for (let i = 0; i < a.length; i++) if (a[i] !== a2[i]) { estavel = false; break; }
      const fs = CanvasRenderingContext2D.prototype.fillText;
      const ss = CanvasRenderingContext2D.prototype.strokeText;
      CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, ...r: [number, number, number?]) {
        return t === tag ? undefined : fs.call(this, t, ...r);
      };
      CanvasRenderingContext2D.prototype.strokeText = function (this: CanvasRenderingContext2D, t: string, ...r: [number, number, number?]) {
        return t === tag ? undefined : ss.call(this, t, ...r);
      };
      let b: Uint8ClampedArray;
      try {
        b = ler();
      } finally {
        CanvasRenderingContext2D.prototype.fillText = fs;
        CanvasRenderingContext2D.prototype.strokeText = ss;
      }
      const etiqueta = new Uint8Array(1920 * 1080);
      let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
      let fora = false;
      for (let y = 0; y < 1080; y++) {
        for (let x = 0; x < 1920; x++) {
          const i = (y * 1920 + x) * 4;
          if (a[i] !== b[i] || a[i + 1] !== b[i + 1] || a[i + 2] !== b[i + 2]) {
            etiqueta[y * 1920 + x] = 1;
            x0 = Math.min(x0, x / 2); y0 = Math.min(y0, y / 2); x1 = Math.max(x1, x / 2); y1 = Math.max(y1, y / 2);
            if (x / 2 < px || x / 2 > px + 284 || y / 2 < 374 || y / 2 > 506) fora = true;
          }
        }
      }
      // o lutador sozinho (fundo transparente), nas duas poses e em 5 instantes da respiração; guarda a união das máscaras e o topo
      const luta = new Uint8Array(1920 * 1080);
      let topo = 1e9;
      for (const pose of ['guard', 'special']) {
        for (const t of [0, 25, 50, 75, 100]) {
          const c = document.createElement('canvas');
          c.width = 1920; c.height = 1080;
          const g = c.getContext('2d')!;
          g.scale(2, 2);
          P.mostrarLutador(F.criarFerramentas(g), m, id, lado === 0 ? 160 : 800, 362, 1.18 * P.escalaDeVitrine(ch), lado === 0 ? 1 : -1, t + lado * 30, pose);
          const d = g.getImageData(0, 0, 1920, 1080).data;
          for (let y = 0; y < 1080; y++) for (let x = 0; x < 1920; x++) if (d[(y * 1920 + x) * 4 + 3]! > 20) { luta[y * 1920 + x] = 1; topo = Math.min(topo, y / 2); }
        }
      }
      let sobre = 0;
      for (let i = 0; i < luta.length; i++) if (luta[i] && etiqueta[i]) sobre++;
      // controle negativo: a etiqueta no lugar ANTIGO (centrada no painel, y 72, 22 px, o código de antes)
      const c = document.createElement('canvas');
      c.width = 1920; c.height = 1080;
      const g = c.getContext('2d')!;
      g.scale(2, 2);
      F.criarFerramentas(g).A(tag, px + 142, 72, 22, '#fff', '#000', 'center');
      const d = g.getImageData(0, 0, 1920, 1080).data;
      let sobreAntiga = 0;
      for (let i = 0; i < luta.length; i++) if (luta[i] && d[i * 4 + 3]! > 20) sobreAntiga++;
      return { sobre, sobreAntiga, caixa: { x0, y0, x1, y1 }, topoDoLutador: topo, quadroEstavel: estavel, foraDoPainel: fora };
    },
    { tag, lado, id },
  );
}

test.describe('A etiqueta do jogador (VOCÊ, ALVO, ADVERSÁRIO, JOGADOR 1/2) não cobre rosto de nenhum lutador', () => {
  test('desktop: os 10 lutadores (inclusive ZENON 1,32 e BAATAR 1,28) no ARCADE: zero pixel da etiqueta sobre o lutador; o lugar antigo cobria quase todos', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'a medida é em px lógicos do canvas: igual em qualquer aparelho; o celular tem o teste das teclas de toque abaixo');
    const erros = coletarErros(page);
    await abrirJogo(page, '&expansao=1', VIEWPORTS.desktop);
    const linhas: string[] = [];
    let cobriamAntes = 0;
    for (const id of GRADE_DE_PRODUCAO) {
      await abrirSelecao(page, 'arcade', `S.cur[0] = S.grade.indexOf('${id}');`);
      await aguardarArte(page, [id]);
      const r = await medirEtiqueta(page, 'VOCÊ', 0, id);
      linhas.push(`${id}: topo ${r.topoDoLutador} | etiqueta x ${r.caixa.x0}-${r.caixa.x1} y ${r.caixa.y0}-${r.caixa.y1} | sobre ${r.sobre} px (antes: ${r.sobreAntiga})`);
      expect(r.quadroEstavel, `${id}: o quadro tem de ser estável para a diferença medir só a etiqueta`).toBe(true);
      expect(r.caixa.x1, `${id}: a etiqueta apareceu?`).toBeGreaterThan(r.caixa.x0);
      expect(r.sobre, `${id}: pixels da etiqueta sobre o lutador`).toBe(0);
      expect(r.foraDoPainel, `${id}: a etiqueta fica DENTRO do painel do lutador`).toBe(false);
      expect(r.caixa.y0, `${id}: abaixo dos pés (y 361) e dentro do painel (374)`).toBeGreaterThanOrEqual(374);
      if (r.sobreAntiga > 0) cobriamAntes++;
    }
    info.annotations.push({ type: 'medido', description: linhas.join('\n') });
    // controle negativo: a medida enxerga o defeito (no código antigo a etiqueta cobria o lutador em quase todos)
    expect(cobriamAntes, 'o controle negativo: a etiqueta no lugar antigo cobre o lutador').toBeGreaterThanOrEqual(8);
    expect(erros).toEqual([]);
  });

  test('desktop: VERSUS (JOGADOR 1 e 2) e a etapa do rival (ADVERSÁRIO, ALVO) com os dois lutadores mais altos', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'medida em px lógicos');
    const erros = coletarErros(page);
    await abrirJogo(page, '&expansao=1', VIEWPORTS.desktop);
    const casos: Array<{ modo: string; js: string; tag: string; lado: 0 | 1; id: string }> = [
      { modo: 'versus', js: "S.cur[0] = S.grade.indexOf('zenon'); S.cur[1] = S.grade.indexOf('baatar');", tag: 'JOGADOR 1', lado: 0, id: 'zenon' },
      { modo: 'versus', js: "S.cur[0] = S.grade.indexOf('zenon'); S.cur[1] = S.grade.indexOf('baatar');", tag: 'JOGADOR 2', lado: 1, id: 'baatar' },
      { modo: 'versus', js: "S.cur[0] = S.grade.indexOf('baatar'); S.cur[1] = S.grade.indexOf('zenon');", tag: 'JOGADOR 2', lado: 1, id: 'zenon' },
      { modo: 'cpu', js: "S.step = 2; S.pick[0] = 0; S.cur[1] = S.grade.indexOf('zenon');", tag: 'ADVERSÁRIO', lado: 1, id: 'zenon' },
      { modo: 'cpu', js: "S.step = 2; S.pick[0] = 0; S.cur[1] = S.grade.indexOf('wei-long');", tag: 'ADVERSÁRIO', lado: 1, id: 'wei-long' },
      { modo: 'training', js: "S.step = 2; S.pick[0] = 0; S.cur[1] = S.grade.indexOf('baatar');", tag: 'ALVO', lado: 1, id: 'baatar' },
    ];
    for (const c of casos) {
      await abrirSelecao(page, c.modo, c.js);
      await aguardarArte(page, ['zenon', 'baatar', 'wei-long', 'hayato']);
      const r = await medirEtiqueta(page, c.tag, c.lado, c.id);
      expect(r.quadroEstavel, `${c.modo} ${c.tag}`).toBe(true);
      expect(r.caixa.x1, `${c.modo} ${c.tag}: a etiqueta apareceu?`).toBeGreaterThan(r.caixa.x0);
      expect(r.sobre, `${c.modo} ${c.tag} ${c.id}`).toBe(0);
      expect(r.foraDoPainel, `${c.modo} ${c.tag}`).toBe(false);
      expect(r.sobreAntiga, `${c.modo} ${c.tag} ${c.id}: controle negativo`).toBeGreaterThan(0);
    }
    expect(erros).toEqual([]);
  });

  test('celular deitado (915x412): a etiqueta do P1 e a do P2 não encostam em nenhuma tecla de toque nem no joystick e ficam legíveis', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    const erros = coletarErros(page);
    await abrirJogo(page, '&expansao=1', VIEWPORTS.celular);
    await abrirSelecao(page, 'versus', "S.cur[0] = S.grade.indexOf('zenon'); S.cur[1] = S.grade.indexOf('baatar');");
    await aguardarArte(page, ['zenon', 'baatar']);
    const cv = (await page.locator('canvas#jogo').boundingBox())!;
    const k = cv.width / 960;
    const teclas: Array<{ id: string; x: number; y: number; w: number; h: number }> = await page.evaluate(() =>
      [...document.querySelectorAll('#joy, #pad .b, #bp')]
        .map((e) => ({ id: e.id || e.className, r: e.getBoundingClientRect() }))
        .filter((q) => q.r.width > 0)
        .map((q) => ({ id: q.id, x: q.r.x, y: q.r.y, w: q.r.width, h: q.r.height })),
    );
    expect(teclas.length, 'a camada de toque aparece no celular').toBeGreaterThanOrEqual(6);
    for (const [tag, lado, id] of [['JOGADOR 1', 0, 'zenon'], ['JOGADOR 2', 1, 'baatar']] as const) {
      const r = await medirEtiqueta(page, tag, lado, id);
      const css = { x0: cv.x + r.caixa.x0 * k, x1: cv.x + r.caixa.x1 * k, y0: cv.y + r.caixa.y0 * k, y1: cv.y + r.caixa.y1 * k };
      info.annotations.push({ type: 'celular', description: `${tag}: ${(css.x1 - css.x0).toFixed(0)}x${(css.y1 - css.y0).toFixed(0)} px CSS em (${css.x0.toFixed(0)},${css.y0.toFixed(0)}); canvas ${cv.width.toFixed(0)}x${cv.height.toFixed(0)}` });
      expect(r.sobre, `${tag}: sobre o lutador`).toBe(0);
      for (const t of teclas) {
        // a área de toque dos botões tem margem transparente (o disco desenhado ocupa 92% dela): 4 px de cada lado não contam; o joystick vale inteiro
        const m = t.id === 'joy' ? 0 : 4;
        const cruza = css.x0 < t.x + t.w - m && css.x1 > t.x + m && css.y0 < t.y + t.h - m && css.y1 > t.y + m;
        expect(cruza, `${tag} x tecla ${t.id}: etiqueta x ${css.x0.toFixed(1)}..${css.x1.toFixed(1)} y ${css.y0.toFixed(1)}..${css.y1.toFixed(1)}; tecla x ${(t.x + m).toFixed(1)}..${(t.x + t.w - m).toFixed(1)} y ${(t.y + m).toFixed(1)}..${(t.y + t.h - m).toFixed(1)}`).toBe(false);
      }
      expect(css.y1 - css.y0, `${tag}: altura legível em px CSS`).toBeGreaterThanOrEqual(12);
    }
    await capturar(page, 'selecao-etiqueta-celular');
    expect(erros).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------
// 2. A casa aleatória
// ---------------------------------------------------------------------------------------------------------------------------------------------

/** Pixels do quadrado da casa aleatória (px do canvas, 2x), para provar que mudam (ou não) com o tempo. */
const pixelsDaCasa = (page: Page): Promise<string> =>
  page.evaluate(() => {
    const h = (window as any).__inno;
    h.desenhar();
    const ctx = (document.getElementById('jogo') as HTMLCanvasElement).getContext('2d')!;
    const d = ctx.getImageData(2 * 356, 2 * 358, 2 * 40, 2 * 40).data;
    let hash = 5381;
    for (let i = 0; i < d.length; i++) hash = (Math.imul(hash, 33) + d[i]!) | 0;
    return String(hash);
  });

async function textos(page: Page): Promise<Array<{ t: string; x: number; y: number; px: number; w: number; align: string }>> {
  return page.evaluate(() => {
    const w = window as any;
    const lista: any[] = [];
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: [number?]) {
      const tf = this.getTransform();
      const px = parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '0');
      lista.push({ t: String(t), x: tf.e / 2 + x * (tf.a / 2), y: tf.f / 2 + y * (tf.d / 2), px: px * (tf.d / 2), w: this.measureText(String(t)).width * (tf.a / 2), align: this.textAlign });
      return o.call(this, t, x, y, ...(r as []));
    };
    try {
      w.__inno.desenhar();
    } finally {
      CanvasRenderingContext2D.prototype.fillText = o;
    }
    return lista;
  });
}

test.describe('A casa aleatória (RANDOM) da grade de 10', () => {
  test('geometria: o quadradinho 44x44 e a casa de honra 204x44 lado a lado, sem tocar a 3ª linha, o painel nem a dica; o texto da honra cabe nos 204 px', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'medida em px lógicos');
    const erros = coletarErros(page);
    await abrirJogo(page, '&expansao=1', VIEWPORTS.desktop);
    await abrirSelecao(page, 'versus', 'S.cur[0] = 9; S.cur[1] = 10;');
    await aguardarArte(page, ['zenon']);
    const caixas = await hook(page, '(h) => Array.from({ length: 11 }, (_, i) => h.ui.scene.tileRect(i))');
    expect(caixas[10]).toEqual({ x: 352, y: 356, w: 44, h: 44 });
    expect(caixas[9]).toEqual({ x: 404, y: 356, w: 204, h: 44 });
    expect(caixas[10].x + caixas[10].w + 8).toBe(caixas[9].x); // vão de 8 px (a moldura de 4 px de cada lado encosta, não cruza)
    expect(caixas[9].y - 4).toBeGreaterThanOrEqual(caixas[8].y + caixas[8].h + 4);
    const lista = await textos(page);
    const naFaixa = lista.filter((q) => q.y > 356 && q.y < 400 && q.x > 352 && q.x < 608);
    for (const q of naFaixa) {
      const esq = q.x - (q.align === 'center' ? q.w / 2 : q.align === 'right' ? q.w : 0);
      expect(q.y + q.px / 2, `"${q.t}" base`).toBeLessThanOrEqual(400);
      // o "?" e a etiqueta 1P/2P moram dentro do quadradinho (352..396); todo o resto é da casa de honra (404..608)
      if (q.x < 400) {
        expect(esq, `"${q.t}" esquerda (quadradinho)`).toBeGreaterThanOrEqual(352);
        expect(esq + q.w, `"${q.t}" direita (quadradinho)`).toBeLessThanOrEqual(396);
      } else {
        expect(esq, `"${q.t}" esquerda`).toBeGreaterThanOrEqual(404);
        expect(esq + q.w, `"${q.t}" direita`).toBeLessThanOrEqual(608);
      }
    }
    const nome = naFaixa.find((q) => q.t === 'ZENON')!;
    const titulo = naFaixa.find((q) => q.t === 'O ARCONTE')!;
    const chefao = naFaixa.find((q) => q.t === 'CHEFÃO')!;
    expect(nome && titulo && chefao, 'nome, título e CHEFÃO desenhados').toBeTruthy();
    expect(titulo.x + titulo.w, 'o título não encosta no CHEFÃO').toBeLessThan(chefao.x - chefao.w - 4);
    expect(naFaixa.some((q) => q.t === '?'), 'o ? da casa aleatória').toBe(true);
    await capturar(page, 'selecao-aleatoria-faixa-de-baixo');
    expect(erros).toEqual([]);
  });

  test('teclado: ↓ da 1ª coluna chega à aleatória (3 vezes); Enter sorteia, a roleta gira, o sorteado aparece (cursor, painel, lutador) e só então a tela segue para a dificuldade', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'teclado');
    const erros = coletarErros(page);
    await abrirJogo(page, '&expansao=1', VIEWPORTS.desktop);
    await abrirSelecao(page, 'arcade');
    for (let i = 0; i < 3; i++) await page.keyboard.press('ArrowDown');
    expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(10);
    await hook(page, '(h) => h.avancar(30)');
    await capturar(page, 'selecao-aleatoria-repouso');
    await page.keyboard.press('Enter');
    const sorteado: string = await hook(page, '(h) => h.ui.scene.rolando[0].id');
    expect(GRADE_DE_PRODUCAO).toContain(sorteado);
    expect(await hook(page, '(h) => h.ui.scene.lock[0]')).toBe(false); // não escolheu na hora
    await hook(page, '(h) => h.avancar(20)');
    await capturar(page, 'selecao-aleatoria-girando');
    const quadrosDaRoleta = new Set<string>();
    for (let i = 0; i < 6; i++) {
      quadrosDaRoleta.add(await pixelsDaCasa(page));
      await hook(page, '(h) => h.avancar(3)');
    }
    await aguardarArte(page, [sorteado]);
    await hook(page, '(h) => h.avancar(25)'); // passa do pouso (43) e entra na revelação
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe(sorteado);
    expect(await hook(page, '(h) => h.ui.scene.lock[0]')).toBe(false);
    const nomeNaTela = await hook(page, `(h) => h.mundo().elenco['${sorteado}'].ch.name`);
    const vistos = (await textos(page)).map((q) => q.t);
    expect(vistos, 'o painel mostra o sorteado').toContain(nomeNaTela);
    expect(vistos).not.toContain('ALEATÓRIO');
    await capturar(page, 'selecao-aleatoria-revelado');
    await hook(page, '(h) => h.avancar(40)');
    expect(await hook(page, '(h) => h.ui.scene.lock[0]')).toBe(true);
    await hook(page, '(h) => h.avancar(80)');
    expect(await hook(page, '(h) => h.ui.name')).toBe('diff');
    expect(await hook(page, '(h) => h.ui.scene.a.c1')).toBe(sorteado);
    expect(quadrosDaRoleta.size, 'a casa mudou de aparência durante a roleta (os rostos passam)').toBeGreaterThanOrEqual(3);
    expect(erros).toEqual([]);
  });

  test('em repouso os rostos passam sozinhos (embaralhando); com movimento reduzido a casa fica num "?" FIXO e o sorteio sai sem roleta', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'pixels do canvas');
    for (const reduzido of [false, true]) {
      const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop, reducedMotion: reduzido ? 'reduce' : 'no-preference' });
      const page = await ctx.newPage();
      const erros = coletarErros(page);
      await abrirJogo(page, '&expansao=1');
      await abrirSelecao(page, 'arcade', 'S.cur[0] = 10;');
      const quadros = new Set<string>();
      for (let i = 0; i < 12; i++) {
        quadros.add(await pixelsDaCasa(page));
        await hook(page, '(h) => h.avancar(12)'); // um rosto por 12 ticks
      }
      if (reduzido) expect(quadros.size, 'movimento reduzido: o "?" não se mexe').toBe(1);
      else expect(quadros.size, 'em repouso os rostos passam').toBeGreaterThanOrEqual(5);
      await capturar(page, reduzido ? 'selecao-aleatoria-repouso-movimento-reduzido' : 'selecao-aleatoria-repouso-passando');
      // o sorteio: com movimento reduzido pousa no ato (sem rostos na roleta); sem, gira
      await hook(page, '(h) => h.ui.scene.key("Enter")');
      const r = await hook(page, '(h) => { const r = h.ui.scene.rolando[0]; return { rostos: r.rostos.length, pousouEm: r.pousouEm, id: r.id }; }');
      if (reduzido) {
        expect(r.rostos).toBe(0);
        expect(r.pousouEm).toBe(0);
        await aguardarArte(page, [r.id]);
        await hook(page, '(h) => h.avancar(2)');
        await capturar(page, 'selecao-aleatoria-revelado-movimento-reduzido');
      } else {
        expect(r.rostos).toBe(10);
        expect(r.pousouEm).toBeNull();
      }
      expect(erros).toEqual([]);
      await ctx.close();
    }
  });

  test('o sorteio só sai entre os LIBERADOS: progresso inicial (4 de fábrica, ZENON oculto) nunca vê um travado, nem na roleta, nem no resultado; derrotado o ZENON ele entra', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'lógica de cena');
    const erros = coletarErros(page);
    await abrirJogo(page, '', VIEWPORTS.desktop); // produção: 4 liberados, o ZENON oculto
    await abrirSelecao(page, 'arcade', 'S.cur[0] = 10;');
    const r = await hook(
      page,
      `(h) => {
        const S = h.ui.cenas.select; const libs = S.elegiveis(); const ids = new Set(); const rostos = new Set();
        for (let i = 0; i < 500; i++) { S.rolando = [null, null]; S.lock = [false, false]; S.cur[0] = 10; S.key('Enter'); ids.add(S.rolando[0].id); for (const x of S.rolando[0].rostos) rostos.add(x); }
        return { libs, ids: [...ids].sort(), rostos: [...rostos].sort() };
      }`,
    );
    expect(r.libs).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
    expect(r.ids).toEqual([...r.libs].sort());
    for (const x of r.rostos) expect(r.libs).toContain(x);
    expect(r.rostos).not.toContain('zenon');
    expect(erros).toEqual([]);
  });

  test('lock-step intacto: sortear na casa aleatória NÃO toca no RNG da luta (estado igual ao de quem escolheu o mesmo lutador direto), e a luta que segue é a mesma tick a tick', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'lógica de cena');
    const rodar = async (aleatorio: boolean, sorteadoDe?: string): Promise<{ id: string; rngLuta: number; rngVisual: number; hash: string }> => {
      const ctx = await browser.newContext({ viewport: VIEWPORTS.desktop });
      const page = await ctx.newPage();
      const erros = coletarErros(page);
      await abrirJogo(page, '&expansao=1');
      await abrirSelecao(page, 'versus');
      const rngLuta0: number = await hook(page, '(h) => h.mundo().game.rng.estado()');
      let id = sorteadoDe ?? '';
      if (aleatorio) {
        await hook(page, '(h) => { h.ui.scene.cur[0] = 10; h.ui.scene.key("Enter"); }');
        id = await hook(page, '(h) => h.ui.scene.rolando[0].id');
      } else {
        await hook(page, `(h) => { const S = h.ui.scene; S.cur[0] = S.grade.indexOf('${id}'); S.key('Enter'); }`);
      }
      const rngVisual0: number = await hook(page, '(h) => h.ui.c.rngVisual.estado()');
      expect(rngLuta0, 'a luta ainda não sorteou nada').toBe(await hook(page, '(h) => h.mundo().game.rng.estado()'));
      // P2 escolhe direto o HAYATO; a tela segue para o VS e a luta começa: mesma semente, mesmos lutadores
      await hook(page, '(h) => { const S = h.ui.scene; S.cur[1] = 0; S.key("j"); h.avancar(200); }');
      expect(await hook(page, '(h) => h.ui.name'), 'foi para o VS').toBe('vs');
      await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'versus', c1: '${id}', c2: 'hayato', cpu: null, esquiva: h.ui.c.regras.esquiva } }); (${SEM_PROVOCACAO})(h); }`);
      await page.waitForFunction(() => (window as any).__inno.ui.scene.espera?.pronta === true, undefined, { timeout: 30_000 });
      await hook(page, '(h) => h.avancar(150)');
      const fim = await hook(
        page,
        `(h) => { const g = h.mundo().game; return { rng: g.rng.estado(), hash: JSON.stringify([g.p1.x, g.p1.y, g.p1.hp, g.p2.x, g.p2.y, g.p2.hp, g.p1.pose.name, g.p2.pose.name, g.timer ?? 0]), vis: h.ui.c.rngVisual.estado() }; }`,
      );
      expect(erros).toEqual([]);
      await ctx.close();
      return { id, rngLuta: fim.rng, rngVisual: rngVisual0, hash: fim.hash };
    };
    const a = await rodar(true);
    const b = await rodar(false, a.id);
    expect(b.id).toBe(a.id);
    expect(b.rngLuta, 'o RNG da luta termina igual com sorteio ou escolha direta').toBe(a.rngLuta);
    expect(b.hash, 'a luta é a mesma, tick a tick').toBe(a.hash);
    expect(a.rngVisual, 'o RNG visual também não foi consumido pelo sorteio').toBe(b.rngVisual);
  });

  for (const perfil of ['desktop', 'celular'] as const) {
    test(`${perfil}: ${perfil === 'celular' ? 'o TOQUE no quadradinho (e na folga de 4 px dele)' : 'o MOUSE (hover e clique) no quadradinho'} vai para ele e sorteia; o vão até a honra não`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, '&expansao=1', VIEWPORTS[perfil]);
      await abrirSelecao(page, 'versus');
      const cv = (await page.locator('canvas#jogo').boundingBox())!;
      const k = cv.width / 960;
      const css = (lx: number, ly: number) => ({ x: cv.x + lx * k, y: cv.y + ly * k });
      info.annotations.push({ type: 'toque', description: `${perfil}: canvas ${cv.width.toFixed(0)}x${cv.height.toFixed(0)} CSS; quadradinho ${(44 * k).toFixed(0)}x${(44 * k).toFixed(0)} px CSS, área de toque ${(52 * k).toFixed(0)}x${(56 * k).toFixed(0)}` });
      const apontar = async (lx: number, ly: number): Promise<void> => {
        const c = css(lx, ly);
        if (perfil === 'celular') await page.touchscreen.tap(c.x, c.y);
        else await page.mouse.move(c.x, c.y);
      };
      if (perfil === 'desktop') {
        // o vão de 400 a 404 não é de nenhuma casa; a folga (348..352) e o meio são da aleatória
        await hook(page, '(h) => { h.ui.scene.cur[0] = 0; }');
        await apontar(402, 378);
        expect(await hook(page, '(h) => h.ui.scene.cur[0]'), 'no vão entre a aleatória e a honra não há casa').toBe(0);
        await apontar(349, 378);
        expect(await hook(page, '(h) => h.ui.scene.cur[0]'), 'a folga da esquerda é da aleatória').toBe(10);
        await hook(page, '(h) => { h.ui.scene.cur[0] = 0; }');
        await apontar(374, 378);
        expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(10);
        await page.mouse.click(css(374, 378).x, css(374, 378).y);
      } else {
        // toque = clique: tocar a casa vai para ela E confirma (sorteia); o vão não faz nada
        await hook(page, '(h) => { h.ui.scene.cur[0] = 0; }');
        await apontar(402, 378);
        expect(await hook(page, '(h) => h.ui.scene.rolando[0]'), 'no vão entre a aleatória e a honra não há casa').toBeNull();
        expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(0);
        await apontar(349, 378); // a folga da esquerda
        expect(await hook(page, '(h) => h.ui.scene.rolando[0] !== null'), 'a folga da esquerda é da aleatória').toBe(true);
        expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(10);
        await hook(page, '(h) => { h.ui.scene.key("x"); h.ui.scene.cur[0] = 0; }'); // desiste e volta ao começo
        await page.touchscreen.tap(css(374, 378).x, css(374, 378).y);
      }
      expect(await hook(page, '(h) => h.ui.scene.rolando[0] !== null')).toBe(true);
      await hook(page, '(h) => h.avancar(120)');
      expect(await hook(page, '(h) => h.ui.scene.lock[0]')).toBe(true);
      await capturar(page, `selecao-aleatoria-${perfil}`);
      expect(erros).toEqual([]);
    });
  }

  test('controle (gamepad de verdade, pelo mesmo caminho do jogo): ↓ três vezes chega à aleatória e o botão A sorteia; ← e → alternam com a casa de honra', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'entrada');
    const erros = coletarErros(page);
    await page.addInitScript(() => {
      (window as any).__pad = { ligado: false, botoes: [] as number[] };
      navigator.getGamepads = () =>
        [
          (window as any).__pad.ligado
            ? { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (window as any).__pad.botoes.includes(i) })) }
            : null,
        ] as unknown as (Gamepad | null)[];
    });
    await abrirJogo(page, '&expansao=1', VIEWPORTS.desktop);
    await abrirSelecao(page, 'arcade');
    // aperta e solta o botão `b` do controle (13 = baixo, 14 = esquerda, 15 = direita, 0 = A), consultando o controle a cada passo, como o laço do jogo
    const apertar = async (b: number): Promise<void> => {
      await page.evaluate((x) => Object.assign((window as any).__pad, { ligado: true, botoes: [x] }), b);
      await hook(page, '(h) => { h.entrada.consultarGamepads(); h.avancar(1); }');
      await page.evaluate(() => Object.assign((window as any).__pad, { botoes: [] }));
      await hook(page, '(h) => { h.entrada.consultarGamepads(); h.avancar(1); }');
    };
    for (let i = 0; i < 3; i++) await apertar(13);
    expect(await hook(page, '(h) => h.ui.scene.cur[0]')).toBe(10);
    await apertar(15);
    expect(await hook(page, '(h) => h.ui.scene.cur[0]'), '→ da aleatória vai à honra').toBe(9);
    await apertar(14);
    expect(await hook(page, '(h) => h.ui.scene.cur[0]'), '← da honra volta à aleatória').toBe(10);
    await apertar(0);
    expect(await hook(page, '(h) => h.ui.scene.rolando[0] !== null'), 'A confirma na casa aleatória').toBe(true);
    expect(erros).toEqual([]);
  });
});
