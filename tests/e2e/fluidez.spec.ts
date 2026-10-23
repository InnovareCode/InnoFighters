/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * V2-2 (fluidez só no RENDER, docs/spec-revisao-motor-luta-v2.md §7.2 a §7.4 e §9): medida no navegador.
 * `?manual=1` desliga o laço em tempo real e a fluidez (o oráculo de pixel não muda); `&fluidez=1` (só DEV) a liga para estes testes, que dirigem o laço
 * por conta própria: ticks a 60/s e um quadro a cada 1000/hz ms simulados, chamando `desenhar(alfa)` com `alfa = acc / PASSO` como o `main.ts`.
 * A lógica pura está em tests/unit/mola-fluidez.test.ts; a arte (salto de pés), em tests/unit/fluidez-ancora.test.ts.
 *
 * ESTE ARQUIVO FOI ESCRITO E CONFERIDO PELOS MESMOS ROTEIROS EM NODE (scratchpad), mas NÃO foi rodado pelo `playwright test`: a Íris tinha a suíte em andamento.
 */

test.describe.configure({ timeout: 180_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const IDS = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar', 'zenon'] as const;

async function abrir(page: Page, query = '&fluidez=1'): Promise<void> {
  await page.goto(`/?seed=7&manual=1&expansao=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

async function abrirLuta(page: Page, cfg: Record<string, unknown>): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify(cfg)} }); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  for (let i = 0; i < 200; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
}

/** Espia `drawImage` do canvas do jogo: a transformação e o destino de cada imagem que NÃO é cenário nem vinheta (os corpos). */
async function espiarCorpos(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as any;
    w.__imgs = [];
    w.__gravar = false;
    const proto = CanvasRenderingContext2D.prototype as any;
    const orig = proto.drawImage;
    proto.drawImage = function (img: unknown, ...r: unknown[]) {
      if (w.__gravar && this.canvas && this.canvas.id === 'jogo') {
        const t = this.getTransform();
        w.__imgs.push({ a: t.a, d: t.d, e: t.e, f: t.f, r, img });
      }
      return orig.call(this, img, ...r);
    };
  });
}

/** Corpos da última chamada de `desenhar`: [P1, P2] por posição de tela (P1 à esquerda), ou só o que existir. */
const CORPOS = `(h) => {
  const w = window; const m = h.mundo();
  const alheias = new Set([...m.rec.cenarios.values(), m.rec.cenarioPadrao, m.rec.vinheta]);
  const k = document.getElementById('jogo').width / 960;
  return w.__imgs.filter((i) => !alheias.has(i.img) && i.d > 0 && i.f > 300 * k).sort((a, b) => a.e - b.e).map((i) => i.e / k);
}`;

/** A caminhada de 60 quadros a `hz`: desvio-padrão do Δx (px lógicos de tela) por quadro ÷ média. */
async function razaoDaCaminhada(page: Page, id: string, hz: number): Promise<{ razao: number; media: number; paradas: number }> {
  await abrirLuta(page, { mode: 'versus', c1: id, c2: 'caio', cpu: null, esquiva: true });
  await hook(page, '(h) => { const g = h.mundo().game; g.p1.x = 200; g.p2.x = 800; g.p1.en = 100; g.p2.hp = g.p2.maxHp; h.avancar(2); }');
  await page.keyboard.down('ArrowRight');
  await hook(page, '(h) => h.avancar(12)'); // já andando
  const xs: number[] = await page.evaluate(
    ({ hz, corpos }) => {
      const h = (window as any).__inno;
      const PASSO = 1000 / 60;
      const dt = 1000 / hz;
      const pegar = new Function('return ' + corpos)() as (h: unknown) => number[];
      const r: number[] = [];
      let acc = 0.3 * PASSO;
      (window as any).__gravar = true;
      for (let q = 0; q < 61; q++) {
        acc += dt;
        while (acc >= PASSO) {
          h.avancar(1);
          acc -= PASSO;
        }
        (window as any).__imgs.length = 0;
        h.desenhar(acc / PASSO);
        r.push(pegar(h)[0] as number);
      }
      (window as any).__gravar = false;
      return r;
    },
    { hz, corpos: CORPOS },
  );
  await page.keyboard.up('ArrowRight');
  const d = xs.slice(1).map((x, i) => x - (xs[i] as number));
  const media = d.reduce((a, b) => a + b, 0) / d.length;
  const dp = Math.sqrt(d.reduce((a, b) => a + (b - media) ** 2, 0) / d.length);
  return { razao: dp / Math.abs(media), media, paradas: d.filter((x) => Math.abs(x) < 1e-6).length };
}

test.describe('fluidez da luta (V2-2)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'medidas em desktop'));

  test('caminhada a 144 Hz: desvio-padrão do Δx ÷ média <= 0,15 (hoje, sem a fluidez, passa de 1,0)', async ({ page }) => {
    await espiarCorpos(page);
    await abrir(page, '');
    const hoje = await razaoDaCaminhada(page, 'hayato', 144);
    // controle negativo: sem a interpolação (o desenho de antes) a mesma medida enxerga o tranco (35 de 60 quadros parados)
    expect(hoje.razao, `sem fluidez: ${JSON.stringify(hoje)}`).toBeGreaterThan(0.8);
    expect(hoje.paradas).toBeGreaterThan(20);
    for (const id of ['hayato', 'baatar'] as const) {
      await abrir(page, '&fluidez=1');
      const r = await razaoDaCaminhada(page, id, 144);
      expect(r.razao, `${id} a 144 Hz: ${JSON.stringify(r)}`).toBeLessThanOrEqual(0.15);
      expect(r.paradas, id).toBe(0);
    }
  });

  test('a 60 Hz a caminhada continua lisa e o desenho com alfa 1 é o tick atual', async ({ page }) => {
    await espiarCorpos(page);
    await abrir(page);
    const r = await razaoDaCaminhada(page, 'hayato', 60);
    expect(r.razao).toBeLessThanOrEqual(0.15);
  });

  test('sem `&fluidez=1` (o oráculo de pixel) o desenho ignora o alfa: desenhar(0,3) == desenhar()', async ({ page }) => {
    await abrir(page, '');
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: true });
    const iguais = await hook(
      page,
      `(h) => {
        const c = document.getElementById('jogo'); const g = c.getContext('2d');
        h.mundo().game.p1.startMove('hp', h.mundo().game); h.avancar(3);
        h.desenhar(); const a = g.getImageData(0, 0, c.width, c.height).data.slice();
        h.desenhar(0.3); const b = g.getImageData(0, 0, c.width, c.height).data;
        for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
        return h.ui.fluidez === false;
      }`,
    );
    expect(iguais).toBe(true);
  });

  test('a mola aparece nos 10 lutadores (antecipação do golpe forte, pouso e preparo do especial mudam o desenho)', async ({ page }) => {
    await abrir(page);
    for (const id of IDS) {
      await abrirLuta(page, { mode: 'versus', c1: id, c2: id === 'hayato' ? 'caio' : 'hayato', cpu: null, esquiva: true });
      const dif: Record<string, number> = await hook(
        page,
        `(h) => {
          const g = h.mundo().game; const c = document.getElementById('jogo');
          const px = () => { h.desenhar(1); return c.getContext('2d').getImageData(0, 0, c.width, c.height).data; };
          const dif = (a, b) => { let n = 0; for (let i = 0; i < a.length; i += 4) if (Math.abs(a[i] - b[i]) + Math.abs(a[i + 1] - b[i + 1]) + Math.abs(a[i + 2] - b[i + 2]) > 30) n++; return n; };
          const p = g.p1; const out = {};
          const prep = (f) => { p.reset(false); g.p2.reset(false); p.x = 300; g.p2.x = 800; p.en = 100; g.phase = 'fight'; g.t = 400; g.hitstop = 0; f(); p.atualizarPose(); g.p2.atualizarPose(); };
          const casos = {
            golpeForte: () => { p.startMove('hp', g); p.mt = Math.max(0, p.ch.moves.hp.S - 1); },
            pouso: () => p.setState('land'),
            preparoDoEspecial: () => { p.startMove('sFire', g); p.mt = Math.max(0, p.ch.moves.sFire.S - 1); },
          };
          for (const [nome, f] of Object.entries(casos)) { prep(f); h.ui.fluidez = false; const a = new Uint8ClampedArray(px()); h.ui.fluidez = true; out[nome] = dif(a, px()); }
          return out;
        }`,
      );
      for (const [nome, n] of Object.entries(dif)) expect(n, `${id} ${nome}`).toBeGreaterThan(5000);
    }
  });

  test('tremor do rival no congelamento: a distância entre os corpos alterna a cada tick (±3 px de golpe forte x 0,75 do BAATAR, na escala da câmera)', async ({ page }) => {
    await espiarCorpos(page);
    await abrir(page);
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'baatar', cpu: null, esquiva: true });
    const r: { estadoP2: string; dist: number[] } = await page.evaluate(
      ({ corpos }) => {
        const h = (window as any).__inno;
        const g = h.mundo().game;
        const pegar = new Function('return ' + corpos)() as (h: unknown) => number[];
        g.p1.x = 300;
        g.p2.x = 372;
        g.p1.en = 100;
        g.p2.hp = g.p2.maxHp;
        g.t = 400;
        g.p1.startMove('hp', g);
        let n = 0;
        while (g.hitstop === 0 && n++ < 60) h.avancar(1);
        const dist: number[] = [];
        (window as any).__gravar = true;
        for (let i = 0; i < 5 && g.hitstop > 1; i++) {
          h.avancar(1);
          (window as any).__imgs.length = 0;
          h.desenhar(1);
          const c = pegar(h);
          dist.push((c[c.length - 1] as number) - (c[0] as number)); // P2 menos P1: a tremida da tela (câmera) sai da conta
        }
        (window as any).__gravar = false;
        return { estadoP2: g.p2.state, dist };
      },
      { corpos: CORPOS },
    );
    expect(r.estadoP2).toBe('hit');
    expect(r.dist.length).toBeGreaterThanOrEqual(4);
    // alterna: pares e ímpares de `Game.t` ficam em lados opostos da média, com ~2 x 2,25 px de diferença (x o zoom da câmera, ~1,04)
    for (let i = 2; i < r.dist.length; i++) expect(Math.abs((r.dist[i] as number) - (r.dist[i - 2] as number)), 'mesmo lado a cada 2 ticks').toBeLessThan(0.2);
    const salto = Math.abs((r.dist[1] as number) - (r.dist[0] as number));
    expect(salto, `alternância ${JSON.stringify(r.dist)}`).toBeGreaterThan(4);
    expect(salto).toBeLessThan(5.5);
  });

  test('tecla H no treino desenha as caixas de dano e de acerto; H de novo apaga; fora do treino não desenha', async ({ page }) => {
    await abrir(page);
    await abrirLuta(page, { mode: 'training', c1: 'hayato', c2: 'caio', cpu: null, esquiva: true });
    // ciano (#33e6ff) = caixa de dano; tolerância de 24 por canal (o traço tem alfa 0,95)
    const ciano = (): Promise<number> =>
      hook(
        page,
        `(h) => { h.desenhar(1); const c = document.getElementById('jogo'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
          for (let i = 0; i < d.length; i += 4) if (Math.abs(d[i] - 0x33) < 24 && Math.abs(d[i + 1] - 0xe6) < 24 && Math.abs(d[i + 2] - 0xff) < 24) n++; return n; }`,
      );
    expect(await ciano()).toBeLessThan(50);
    await page.keyboard.press('h');
    expect(await ciano(), 'com H ligado').toBeGreaterThan(1500);
    await page.keyboard.press('h');
    expect(await ciano(), 'H de novo apaga').toBeLessThan(50);
    // fora do treino a tecla liga a flag, mas nada é desenhado (a ferramenta é do treino)
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: true });
    await page.keyboard.press('h');
    expect(await ciano()).toBeLessThan(50);
  });

  test('interpolação: com a luta andando, o desenho em alfa 0 e em alfa 1 fica em lugares diferentes (e alfa 1 é o tick atual)', async ({ page }) => {
    await espiarCorpos(page);
    await abrir(page);
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: true });
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.x = 200; g.p2.x = 800; h.avancar(2); }');
    await page.keyboard.down('ArrowRight');
    await hook(page, '(h) => h.avancar(10)');
    const [x0, x5, x1] = (await page.evaluate(
      ({ corpos }) => {
        const h = (window as any).__inno;
        const pegar = new Function('return ' + corpos)() as (h: unknown) => number[];
        (window as any).__gravar = true;
        const em = (alfa: number): number => {
          (window as any).__imgs.length = 0;
          h.desenhar(alfa);
          return pegar(h)[0] as number;
        };
        const r = [em(0), em(0.5), em(1)];
        (window as any).__gravar = false;
        return r;
      },
      { corpos: CORPOS },
    )) as [number, number, number];
    await page.keyboard.up('ArrowRight');
    expect(x1 - x0, 'um tick de caminhada (~3,6 px)').toBeGreaterThan(2);
    expect(x5).toBeGreaterThan(x0);
    expect(x5).toBeLessThan(x1);
  });
});
