/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';

/*
 * Fidelidade das TELAS (ui/): cada cena é montada no mesmo estado no protótipo original (página
 * file://) e no jogo novo (modo manual, sem relógio) e os dois canvases de 1920x1080 são comparados
 * pixel a pixel. Só o sorteio visual (pétalas, brasas) difere por natureza: o estado sorteado do jogo
 * novo é copiado para o protótipo antes de desenhar.
 *
 * EXCEÇÃO INTENCIONAL (paleta A, "Ouro Forjado"): o logo, o emblema e as brasas do título mudaram de propósito. Dos dois
 * lados esses três elementos são desligados (protótipo: drawLogo/drawEmblem viram no-ops e EMBERS fica vazio; jogo novo:
 * `marca.*` vira no-op e a lista de brasas é esvaziada), então TODO o resto continua comparado pixel a pixel, sem
 * máscara que esconda outras regiões. O logo novo é medido à parte em logo.spec.ts.
 *
 * Os nomes dos campos das cenas foram mantidos de propósito, então o mesmo trecho de código (`codigo`)
 * roda dos dois lados com S = cena, U = navegador/UI, G = partida, SET = configurações.
 */

type Caso = {
  nome: string;
  cena: string;
  args?: unknown;
  /** ticks de update antes de capturar (a luta precisa andar) */
  ticks?: number;
  /** valor de UI.t na captura */
  t?: number;
  /** recorde antes de entrar na cena */
  hi?: number;
  /** código idêntico nos dois lados, depois do enter */
  codigo?: string;
  /** o que a captura precisa mostrar (guarda contra comparar duas telas vazias) */
  minCores?: number;
};

const run = (idx: number, continues = 2, score = 7300) => ({
  c1: 'caio', order: ['hayato', 'wei-long', 'min-ji'], idx, score, continues, diff: 1, cont: 1,
});
const cfgVs = { mode: 'versus', c1: 'caio', c2: 'hayato', cpu: null };
const cfgTreino = { mode: 'training', c1: 'min-ji', c2: 'wei-long', cpu: null };
const resultado = (winner: 1 | 2, mode: string) => ({
  a: { cfg: { mode, c1: 'hayato', c2: 'caio', cpu: 1 } }, winner, st: { r1: 2, r2: 1, c1: 5, c2: 3, s1: 12400, s2: 6100 },
});

const CASOS: Caso[] = [
  { nome: 'boot: carregando', cena: 'boot', t: 20, codigo: 'U.ready = false; U.loadProg = 0.4;' },
  { nome: 'boot: pronto (texto aceso)', cena: 'boot', t: 12 },
  { nome: 'boot: pronto (texto apagado)', cena: 'boot', t: 40 },
  ...[20, 60, 100, 125, 155, 200, 250].map((t): Caso => ({ nome: `abertura t=${t}`, cena: 'intro', t, codigo: `S.t = ${t};` })),
  ...[0, 90, 300].map((t): Caso => ({ nome: `título t=${t}`, cena: 'title', args: { fromIntro: false }, t, codigo: `S.t = ${t};` })),
  { nome: 'título com recorde', cena: 'title', args: { fromIntro: false }, t: 50, hi: 12345, codigo: 'S.t = 50;' },
  ...[0, 150, 310, 600].map((t): Caso => ({ nome: `menu principal t=${t}`, cena: 'menu', t })),
  { nome: 'menu: 3º item', cena: 'menu', t: 80, codigo: 'S.m.sel = 2;' },
  { nome: 'seleção versus', cena: 'select', args: { mode: 'versus' }, t: 40 },
  { nome: 'seleção versus: P1 travado, flash', cena: 'select', args: { mode: 'versus' }, t: 40, codigo: 'S.cur = [2, 3]; S.lock = [true, false]; S.pick = [2, 1]; S.flash = [30, 0];' },
  { nome: 'seleção arcade (painel de rivais)', cena: 'select', args: { mode: 'arcade' }, t: 25 },
  { nome: 'seleção cpu etapa 2', cena: 'select', args: { mode: 'cpu' }, t: 25, codigo: 'S.step = 2; S.cur = [1, 3]; S.pick = [1, 3]; S.lock = [true, false];' },
  { nome: 'seleção treino', cena: 'select', args: { mode: 'training' }, t: 60, codigo: 'S.cur = [3, 0];' },
  { nome: 'dificuldade', cena: 'diff', args: { mode: 'cpu', c1: 'hayato', c2: 'caio' }, t: 30, codigo: 'S.m.sel = 2;' },
  { nome: 'confronto t=10', cena: 'vs', args: { cfg: { mode: 'arcade', c1: 'caio', c2: 'min-ji', cpu: 1 }, run: run(1) }, t: 10 },
  { nome: 'confronto t=28', cena: 'vs', args: { cfg: { mode: 'cpu', c1: 'caio', c2: 'min-ji', cpu: 2 } }, t: 28 },
  { nome: 'confronto t=60', cena: 'vs', args: { cfg: { mode: 'versus', c1: 'wei-long', c2: 'hayato', cpu: null } }, t: 60 },
  { nome: 'confronto t=130', cena: 'vs', args: { cfg: { mode: 'arcade', c1: 'hayato', c2: 'caio', cpu: 0 }, run: run(2) }, t: 130 },
  ...[0, 1, 2, 3, 4].map((tab): Caso => ({ nome: `como jogar aba ${tab}`, cena: 'how', args: { from: 'menu' }, t: 20, codigo: `S.tab = ${tab}; S.cid = ${tab % 4};` })),
  { nome: 'opções', cena: 'options', args: { from: 'menu' }, t: 30 },
  { nome: 'opções: mexidas', cena: 'options', args: { from: 'menu' }, t: 30, codigo: 'SET.music = 0.2; SET.sfx = 1; SET.rounds = 3; SET.time = 0; SET.diff = 2; SET.shake = false; S.m.sel = 3;' },
  { nome: 'resultado: jogador 1', cena: 'result', args: resultado(1, 'versus'), t: 20 },
  { nome: 'resultado: CPU venceu', cena: 'result', args: resultado(2, 'cpu'), t: 45, codigo: 'S.m.sel = 1;' },
  { nome: 'continuar? 8 s', cena: 'continue', args: { run: run(1), a: { cfg: { mode: 'arcade', c1: 'caio', c2: 'wei-long', cpu: 1 }, run: run(1) } }, t: 30, codigo: 'S.left = 481;' },
  { nome: 'continuar? 1 crédito, 3 s', cena: 'continue', args: { run: run(1, 1), a: { cfg: { mode: 'arcade', c1: 'caio', c2: 'wei-long', cpu: 1 }, run: run(1, 1) } }, t: 30, codigo: 'S.left = 100;' },
  { nome: 'game over', cena: 'continue', args: { run: run(2, 0, 15500), a: { cfg: { mode: 'arcade', c1: 'caio', c2: 'min-ji', cpu: 1 }, run: run(2, 0, 15500) } }, t: 60, codigo: 'S.over = true; S.overT = 40;' },
  { nome: 'final do arcade: novo recorde', cena: 'ending', args: { run: run(3, 1, 22000) }, t: 100, hi: 5000 },
  { nome: 'final do arcade: sem recorde', cena: 'ending', args: { run: run(3, 0, 800) }, t: 75, hi: 5000 },
  { nome: 'luta: ROUND 1', cena: 'fight', args: { cfg: cfgVs }, ticks: 20, t: 20 },
  { nome: 'luta: FIGHT!', cena: 'fight', args: { cfg: cfgVs }, ticks: 100, t: 100 },
  { nome: 'luta: cpu, tempo e rounds', cena: 'fight', args: { cfg: { mode: 'cpu', c1: 'hayato', c2: 'min-ji', cpu: 0 } }, ticks: 50, t: 50, codigo: 'G.p1.hp = 60; G.p1.hpShown = 80; G.p2.en = 70;' },
  { nome: 'luta: treino com dica', cena: 'fight', args: { cfg: cfgTreino }, ticks: 60, t: 60 },
  { nome: 'pausa: menu', cena: 'fight', args: { cfg: cfgVs }, ticks: 110, t: 110, codigo: 'S.paused = true; S.view = "main";' },
  { nome: 'pausa: menu com 3º item', cena: 'fight', args: { cfg: cfgVs }, ticks: 110, t: 110, codigo: 'S.paused = true; S.view = "main"; S.m.sel = 2;' },
  { nome: 'pausa: áudio', cena: 'fight', args: { cfg: cfgVs }, ticks: 110, t: 110, codigo: 'S.paused = true; S.view = "audio"; S.am.sel = 1;' },
  { nome: 'pausa: confirmar saída', cena: 'fight', args: { cfg: cfgVs }, ticks: 110, t: 110, codigo: 'S.paused = true; S.view = "confirm"; S.cm.sel = 1;' },
  { nome: 'pausa: lista de golpes (versus)', cena: 'fight', args: { cfg: cfgVs }, ticks: 110, t: 110, codigo: 'S.paused = true; S.view = "moves";' },
  { nome: 'pausa: lista de golpes (solo)', cena: 'fight', args: { cfg: { mode: 'cpu', c1: 'min-ji', c2: 'wei-long', cpu: 1 } }, ticks: 80, t: 80, codigo: 'S.paused = true; S.view = "moves";' },
  { nome: 'pausa: treino (alvo e reposicionar)', cena: 'fight', args: { cfg: cfgTreino }, ticks: 70, t: 70, codigo: 'S.paused = true; S.view = "main"; S.m.sel = 3;' },
];

const URL_PROTOTIPO = pathToFileURL(resolve('prototipo/inno-fighters-artefato.html')).href;

/** Estado de sorteio do jogo novo, copiado para o protótipo (as sequências aleatórias diferem por natureza). */
type Sorteio = { petalas: unknown; brasas: unknown; petalasLuta: unknown };

async function prepararNoApp(app: Page, caso: Caso): Promise<Sorteio> {
  return app.evaluate((c) => {
    const h = (window as any).__inno;
    const U = h.ui;
    U.fade = 0;
    U.fadeDir = 0;
    U.fadeTo = null;
    U.ready = true;
    U.loadProg = 0;
    if (c.hi !== undefined) h.persist.hi = c.hi;
    // a campanha do jogo novo guarda `etapas` (montarEscada) onde o protótipo guardava `order`
    const noApp = (v: any): any => {
      if (Array.isArray(v)) return v.map(noApp);
      if (v && typeof v === 'object') {
        const o: any = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, noApp(x)]));
        if (Array.isArray(v.order)) {
          o.etapas = v.order.map((id: string) => ({ id, chefe: false }));
          delete o.order;
        }
        return o;
      }
      return v;
    };
    U.set(c.cena, noApp(c.args));
    U.cenas.title.brasas.lista.length = 0; // brasas fora da comparação (cor nova de propósito)
    if (c.ticks) h.avancar(c.ticks);
    if (c.t !== undefined) U.t = c.t;
    const S = U.cenas[c.cena];
    const G = h.mundo().game;
    if (c.codigo) new Function('S', 'U', 'G', 'SET', c.codigo)(S, U, G, h.persist.settings);
    const m = h.mundo();
    return {
      petalas: JSON.parse(JSON.stringify(U.petalas.lista)),
      brasas: JSON.parse(JSON.stringify(U.cenas.title.brasas.lista)),
      petalasLuta: JSON.parse(JSON.stringify(m.petalasLuta.lista)),
    };
  }, caso);
}

async function desenharNoPrototipo(proto: Page, caso: Caso, sorteio: Sorteio): Promise<string> {
  return proto.evaluate(
    ({ c, s }: { c: Caso; s: Sorteio }) => {
      const P = window as any;
      const MAPA: Record<string, string> = { hayato: 'f1', 'wei-long': 'f2', 'min-ji': 'f3', caio: 'f4' };
      const mapear = (v: any): any => {
        if (typeof v === 'string') return MAPA[v] ?? v;
        if (Array.isArray(v)) return v.map(mapear);
        if (v && typeof v === 'object') return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, mapear(x)]));
        return v;
      };
      // globais do protótipo (script clássico): UI, SCENES, SETTINGS, game, EMBERS, canvas, HISCORE...
      const g = new Function(
        'return { UI: typeof UI !== "undefined" ? UI : null, SCENES, SETTINGS, game, EMBERS, canvas, setHi: (v) => { HISCORE = v; } };',
      )();
      const { UI: U, SCENES, SETTINGS, game, EMBERS, canvas, setHi } = g;
      void P;
      U.fade = 0;
      U.fadeDir = 0;
      U.fadeTo = null;
      U.ready = true;
      U.loadProg = 0;
      if (c.hi !== undefined) setHi(c.hi);
      U.set(c.cena, c.args === undefined ? undefined : mapear(c.args));
      if (c.ticks) for (let i = 0; i < c.ticks; i++) U.update();
      if (c.t !== undefined) U.t = c.t;
      const S = SCENES[c.cena];
      if (c.codigo) new Function('S', 'U', 'G', 'SET', c.codigo)(S, U, game, SETTINGS);
      U.petals = s.petalas;
      EMBERS.splice(0, EMBERS.length, ...(s.brasas as any[]));
      game.petals = s.petalasLuta;
      U.draw();
      return canvas.toDataURL('image/png') as string;
    },
    { c: caso, s: sorteio },
  );
}

async function compararNoApp(app: Page, caso: Caso, png: string): Promise<{ diferentes: number; maximo: number; caixa: number[]; cores: number; grade: number[]; diff?: string }> {
  return app.evaluate(
    async ({ png, minCores, gerarDiff }) => {
      const h = (window as any).__inno;
      h.desenhar();
      const canvas = h.ui.c.ctx.canvas as HTMLCanvasElement;
      const a = canvas.getContext('2d')!.getImageData(0, 0, 1920, 1080).data;
      const img = new Image();
      img.src = png;
      await img.decode();
      const ref = document.createElement('canvas');
      ref.width = 1920;
      ref.height = 1080;
      const rc = ref.getContext('2d')!;
      rc.drawImage(img, 0, 0);
      const b = rc.getImageData(0, 0, 1920, 1080).data;
      const dc = document.createElement('canvas');
      dc.width = 1920;
      dc.height = 1080;
      const dctx = dc.getContext('2d')!;
      const dimg = dctx.createImageData(1920, 1080);
      let diferentes = 0;
      let maximo = 0;
      let x0 = 1920, y0 = 1080, x1 = -1, y1 = -1;
      const cores = new Set<number>();
      const grade = new Array(48).fill(0);
      for (let i = 0; i < a.length; i += 4) {
        if (i % (4 * 613) === 0) cores.add((a[i]! << 16) | (a[i + 1]! << 8) | a[i + 2]!);
        const d = Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!));
        if (d > maximo) maximo = d;
        if (d > 2) {
          diferentes++;
          dimg.data[i] = 255; dimg.data[i + 3] = 255;
          const p = i / 4;
          grade[Math.floor(((p / 1920) | 0) / 270) * 8 + Math.floor((p % 1920) / 240)]++;
          const x = p % 1920, y = (p / 1920) | 0;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
      void minCores;
      dctx.putImageData(dimg, 0, 0);
      return { diferentes, maximo, caixa: [x0, y0, x1, y1], cores: cores.size, grade, ...(gerarDiff ? { diff: dc.toDataURL('image/png') } : {}) };
    },
    { png, minCores: caso.minCores ?? 0, gerarDiff: !!process.env['SALVAR_QUADROS'] },
  );
}

test.describe('fidelidade das telas: ui/ novo x protótipo (pixel a pixel)', () => {
  test.setTimeout(300_000);
  let proto: Page;
  let app: Page;

  test.beforeAll(async ({ browser }, info) => {
    if (info.project.name !== 'desktop') return;
    const cp = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    proto = await cp.newPage();
    // o protótipo não pode andar sozinho entre uma captura e outra: o teste dá cada tick
    await proto.addInitScript(() => {
      window.requestAnimationFrame = () => 0;
    });
    await proto.goto(URL_PROTOTIPO);
    await proto.waitForFunction(() => !!(window as any).SF && (window as any).SF.UI.ready, undefined, { timeout: 60_000 });
    const ca = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    app = await ca.newPage();
    await app.goto('/?seed=5&manual=1');
    await app.waitForSelector('html[data-pronto]', { timeout: 60_000 });
    // logo e emblema desligados dos dois lados (ver o cabeçalho)
    await app.evaluate(async () => {
      const L = await import(/* @vite-ignore */ ('/src/ui/logo.ts' as string));
      L.marca.desenharLogo = () => undefined;
      L.marca.desenharEmblema = () => undefined;
    });
    await proto.evaluate(() => {
      const w = window as any;
      w.drawLogo = () => undefined;
      w.drawEmblem = () => undefined;
    });
  });
  test.afterAll(async () => {
    await proto?.context().close();
    await app?.context().close();
  });

  test('cada cena e estado (boot, abertura, título, menus, VS, luta, pausa, resultados)', async ({}, info) => {
    test.skip(info.project.name !== 'desktop', 'comparação só no desktop');
    const pasta = process.env['SALVAR_QUADROS'];
    const falhas: string[] = [];
    const resumo: string[] = [];
    const filtro = process.env['SO_CASOS'] ? new RegExp(process.env['SO_CASOS'] as string) : null;
    for (const caso of CASOS) {
      if (filtro && !filtro.test(caso.nome)) continue;
      const sorteio = await prepararNoApp(app, caso);
      const png = await desenharNoPrototipo(proto, caso, sorteio);
      if (pasta) {
        mkdirSync(pasta, { recursive: true });
        writeFileSync(resolve(pasta, `${caso.nome.replace(/[^\w]+/g, '_')}.png`), Buffer.from(png.split(',')[1]!, 'base64'));
      }
      const r = await compararNoApp(app, caso, png);
      if (pasta) {
        const meu = await app.locator('canvas#jogo').evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png'));
        writeFileSync(resolve(pasta, `${caso.nome.replace(/\W+/g, '_')}__meu.png`), Buffer.from(meu.split(',')[1]!, 'base64'));
      }
      if (pasta && r.diff) writeFileSync(resolve(pasta, `${caso.nome.replace(/\W+/g, '_')}__diff.png`), Buffer.from(r.diff.split(',')[1]!, 'base64'));
      resumo.push(`${caso.nome}: ${r.diferentes} px (max ${r.maximo}, cores ${r.cores})`);
      if (r.diferentes !== 0) falhas.push(`${caso.nome}: ${r.diferentes} px diferentes, caixa ${JSON.stringify(r.caixa)}, max ${r.maximo}, grade(4x... linhas) ${JSON.stringify(r.grade)}`);
      expect(r.cores, `${caso.nome}: a tela parece vazia`).toBeGreaterThan(30);
    }
    info.annotations.push({ type: 'telas', description: resumo.join('\n') });
    expect(falhas, falhas.join('\n')).toEqual([]);
  });
});
