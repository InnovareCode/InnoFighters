/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test, type Page } from '@playwright/test';
import { usarArteDoPrototipo } from './_jp-prototipo';

/*
 * Fidelidade visual: o MESMO quadro de luta é desenhado pelo protótipo (arquivo original, rodando
 * numa página à parte) e pelo render/ novo, a partir de uma LeituraLuta montada com o estado do
 * protótipo. Os dois canvases (1920x1080) são comparados pixel a pixel.
 *
 * O protótipo é a referência de comportamento; só é lido pelo navegador, nunca editado.
 */

// globais do protótipo (script clássico: const/let/function de topo ficam acessíveis por nome)
declare const game: any;
declare const SETTINGS: any;
declare const canvas: HTMLCanvasElement;
declare const keys: Record<string, boolean>;
declare let pressed: Record<string, boolean>;
declare function setKey(k: string, down: boolean): void;
declare function renderWorld(g: unknown, comHud?: boolean): void;
declare function drawPose(c: CanvasRenderingContext2D, ch: unknown, name: string, x: number, y: number, scale: number, facing?: number, alpha?: number, white?: number): void;
declare const CHARS: Record<string, unknown>;
declare const ctx: CanvasRenderingContext2D;

type Cena = {
  nome: string;
  modo: 'versus' | 'training';
  c1: string;
  c2: string;
  /** código executado logo depois do setup (tick 0) */
  ajustes?: string;
  /** teclas apertadas/soltas em cada tick */
  roteiro?: Array<{ t: number; baixo?: string[]; solta?: string[] }>;
  /** código executado no começo de um tick */
  acoes?: Array<{ t: number; codigo: string }>;
  capturas: number[];
  /** o que as capturas precisam MOSTRAR (garante que o teste não passa em quadros vazios) */
  exige: string[];
};

const CENAS: Cena[] = [
  { nome: 'abertura: ROUND 1 e HUD cheio',
    exige: ['intro'], modo: 'versus', c1: 'f1', c2: 'f2', capturas: [3, 10, 40, 80] },
  {
    nome: 'FIGHT! + corrida com rastro de imagens',
    exige: ['fight','trail'],
    modo: 'versus',
    c1: 'f3',
    c2: 'f4',
    roteiro: [
      { t: 92, baixo: ['ArrowRight'] },
      { t: 94, solta: ['ArrowRight'] },
      { t: 97, baixo: ['ArrowRight'] },
    ],
    capturas: [91, 100, 104, 108, 112, 118, 126],
  },
  {
    nome: 'socos e chutes: rastro do golpe, flash, faíscas, rajada, combo',
    exige: ['golpe','flash','particulas','impacto','combo'],
    modo: 'versus',
    c1: 'f4',
    c2: 'f3',
    ajustes: 'game.p1.x = 430; game.p2.x = 520;',
    roteiro: [
      { t: 95, baixo: ['x'] },
      { t: 96, solta: ['x'] },
      { t: 101, baixo: ['c'] },
      { t: 102, solta: ['c'] },
      { t: 108, baixo: ['x'] },
      { t: 109, solta: ['x'] },
      { t: 118, baixo: ['v'] },
      { t: 119, solta: ['v'] },
    ],
    capturas: [97, 99, 101, 103, 106, 110, 114, 118, 122, 127, 130, 135, 140],
  },
  {
    nome: 'especial: brilho, projétil, impacto',
    exige: ['glow','projetil','particulas','impacto'],
    modo: 'versus',
    c1: 'f1',
    c2: 'f2',
    ajustes: 'game.p1.en = 100;',
    roteiro: [
      { t: 95, baixo: ['b'] },
      { t: 96, solta: ['b'] },
    ],
    capturas: [100, 106, 112, 118, 126, 134, 150, 170],
  },
  {
    nome: 'especial em onda, lâmina e bumerangue',
    exige: ['glow','projetil'],
    modo: 'versus',
    c1: 'f2',
    c2: 'f4',
    ajustes: 'game.p1.en = 100; game.p1.x = 200; game.p2.x = 760;',
    roteiro: [
      { t: 95, baixo: ['ArrowDown', 'b'] },
      { t: 96, solta: ['ArrowDown', 'b'] },
      { t: 130, baixo: ['b'] },
      { t: 131, solta: ['b'] },
    ],
    capturas: [105, 112, 120, 140, 150, 165],
  },
  {
    nome: 'bloqueio: escudo e texto BLOQUEOU',
    exige: ['impacto', 'texto'],
    modo: 'versus',
    c1: 'f1',
    c2: 'f4',
    ajustes: 'game.p1.x = 430; game.p2.x = 520;',
    roteiro: [
      { t: 92, baixo: ['d'] },
      { t: 95, baixo: ['x'] },
      { t: 96, solta: ['x'] },
      { t: 112, baixo: ['x'] },
      { t: 113, solta: ['x'] },
    ],
    capturas: [97, 100, 103, 106, 114, 117, 120, 126],
  },
  {
    nome: 'arremesso e contra-golpe',
    exige: ['texto'],
    modo: 'versus',
    c1: 'f2',
    c2: 'f3',
    ajustes: 'game.p1.x = 440; game.p2.x = 510;',
    roteiro: [
      { t: 95, baixo: ['ArrowRight', 'x'] },
      { t: 96, solta: ['ArrowRight', 'x'] },
    ],
    capturas: [97, 100, 103, 107, 112, 120, 135],
  },
  {
    nome: 'nocaute: K.O., chão e vencedor',
    exige: ['ko','deitado'],
    modo: 'versus',
    c1: 'f3',
    c2: 'f1',
    ajustes: 'game.p1.x = 430; game.p2.x = 520; game.p2.hp = 6; game.p2.hpShown = 30;',
    roteiro: [
      { t: 95, baixo: ['z'] },
      { t: 96, solta: ['z'] },
      { t: 104, baixo: ['x'] },
      { t: 105, solta: ['x'] },
    ],
    capturas: [100, 108, 112, 118, 124, 140, 170, 230],
  },
  {
    nome: 'fim de round: tempo esgotado, vitória, perfect',
    exige: ['timeover','roundend','matchend','perfect'],
    modo: 'versus',
    c1: 'f1',
    c2: 'f3',
    ajustes: 'game.timeLeft = 7;',
    acoes: [
      { t: 100, codigo: "game.phase = 'timeover'; game.t = 0;" },
      { t: 130, codigo: "game.phase = 'roundend'; game.t = 0; game.winner = game.p1; game.perfect = true;" },
      { t: 180, codigo: "game.phase = 'matchend'; game.t = 0; game.winner = game.p2; game.perfect = false;" },
    ],
    capturas: [100, 112, 135, 142, 150, 185, 240],
  },
  {
    nome: 'treino: painel, alvo e último combo',
    exige: ['treino','golpe'],
    modo: 'training',
    c1: 'f4',
    c2: 'f2',
    roteiro: [
      { t: 45, baixo: ['z'] },
      { t: 46, solta: ['z'] },
      { t: 54, baixo: ['x'] },
      { t: 55, solta: ['x'] },
    ],
    capturas: [10, 50, 58, 62, 70, 90],
  },
];

/** Roda uma cena no protótipo e devolve, por captura, a LeituraLuta equivalente + o PNG do quadro. */
async function rodarNoPrototipo(proto: Page, cena: Cena) {
  return proto.evaluate((c: Cena) => {
    const MAPA: Record<string, string> = { f1: 'hayato', f2: 'wei-long', f3: 'min-ji', f4: 'caio' };
    const CEN: Record<string, string> = { bg_jp: 'jp', bg_cn: 'cn', bg_kr: 'kr', bg_br: 'br' };
    SETTINGS.shake = false; // o tremor sorteia deslocamentos; não é comparável quadro a quadro
    for (const k of Object.keys(keys)) keys[k] = false;
    pressed = {};
    game.setup({ mode: c.modo, c1: c.c1, c2: c.c2, cpu: null });
    if (c.ajustes) new Function('game', c.ajustes)(game);

    const lutador = (p: any, i: number, combo: any) => {
      const P = p.poseT();
      return {
        id: MAPA[p.ch.id], indice: i, x: p.x, y: p.y, facing: p.facing, state: p.state,
        pose: { name: P.name, dx: P.dx, dy: P.dy, sx: P.sx, sy: P.sy, rot: P.rot, glow: P.glow, flip: P.flip },
        move: p.move, mt: p.mt, hp: p.hp, maxHp: p.maxHp, hpShown: p.hpShown, en: p.en, flash: p.flash,
        invuln: p.invuln, age: p.age, score: p.score, wins: p.wins, maxCombo: p.maxCombo, dmgTaken: p.dmgTaken,
        combo: { hits: combo.hits, dmg: combo.dmg, t: combo.t },
        trail: p.trail.map((t: any) => ({ x: t.x, y: t.y, name: t.name, f: t.f, life: t.life })),
        cpu: p.cpu ? p.cpu.level : null,
      };
    };
    const copia = (v: any) => JSON.parse(JSON.stringify(v));
    const capturar = (tick: number) => {
      const leitura = {
        fighters: [lutador(game.p1, 0, game.combo1), lutador(game.p2, 1, game.combo2)],
        projectiles: game.projectiles.map((pr: any, id: number) => ({
          id, x: pr.x, y: pr.y, vx: pr.vx, dir: pr.dir, dono: pr.owner === game.p1 ? 0 : 1, style: pr.style, sc: pr.sc, sy: pr.sy, frame: pr.frame,
        })),
        timer: game.timeLeft, timerMax: game.timeMax, round: game.round, winsNeeded: game.winsNeeded,
        cam: { z: game.cam.z, x: game.cam.x }, phase: game.phase, t: game.t, tick, shake: 0, hitstop: game.hitstop,
        mode: game.mode, training: game.training, stage: CEN[game.stage] ?? 'jp',
        winner: game.winner ? (game.winner === game.p1 ? 0 : 1) : null, matchWinner: null, matchDone: false,
        perfect: !!game.perfect, trainInfo: copia(game.trainInfo), events: [],
      };
      renderWorld(game, true);
      return {
        tick, leitura, alvoTreino: game.dummy,
        particulas: copia(game.particles), impactos: copia(game.bursts), textos: copia(game.texts), petalas: copia(game.petals),
        png: canvas.toDataURL('image/png'),
      };
    };

    const saida: any[] = [];
    const ultimo = Math.max(...c.capturas);
    for (let tick = 0; tick <= ultimo; tick++) {
      for (const a of c.acoes ?? []) if (a.t === tick) new Function('game', a.codigo)(game);
      for (const e of c.roteiro ?? []) {
        if (e.t !== tick) continue;
        for (const k of e.baixo ?? []) setKey(k, true);
        for (const k of e.solta ?? []) setKey(k, false);
      }
      if (c.capturas.includes(tick)) saida.push(capturar(tick));
      game.update();
      pressed = {};
    }
    return saida;
  }, cena);
}

/** Desenha os mesmos quadros com o render/ novo e compara com o PNG do protótipo. */
async function compararNoApp(app: Page, snaps: any[]) {
  return app.evaluate(async (lista: any[]) => {
    const imp = (p: string): Promise<any> => import(/* @vite-ignore */ p);
    const { carregarRecursos } = await imp('/src/assets/carregador.ts');
    const { planoPadrao, montarElenco } = await imp('/src/assets/elenco.ts');
    const { Efeitos, CampoDePetalas } = await imp('/src/render/efeitos.ts');
    const { criarVinheta } = await imp('/src/render/cenario.ts');
    const { desenharMundo } = await imp('/src/render/mundo.ts');
    const { prepararCanvas } = await imp('/src/render/tela.ts');
    const { criarRng } = await imp('/src/core/rng.ts');

    const rec = await carregarRecursos(planoPadrao('/'));
    const recursos = { elenco: montarElenco(rec), cenarios: rec.cenarios, cenarioPadrao: rec.cenarios.get('jp'), vinheta: criarVinheta() };
    const ctx = prepararCanvas(document.createElement('canvas'));
    const ref = document.createElement('canvas');
    ref.width = 1920;
    ref.height = 1080;
    const rctx = ref.getContext('2d')!;

    const resultados: any[] = [];
    for (const s of lista) {
      const rng = criarRng(1);
      const efeitos = new Efeitos(rng);
      efeitos.particulas = s.particulas;
      efeitos.impactos = s.impactos;
      efeitos.textos = s.textos;
      const petalas = new CampoDePetalas(criarRng(2), 'luta');
      petalas.lista.splice(0, petalas.lista.length, ...s.petalas);
      desenharMundo(ctx, s.leitura, recursos, efeitos, petalas, rng, { tremor: false, alvoTreino: s.alvoTreino });

      const img = new Image();
      img.src = s.png;
      await img.decode();
      rctx.clearRect(0, 0, 1920, 1080);
      rctx.drawImage(img, 0, 0);
      const a = ctx.getImageData(0, 0, 1920, 1080).data;
      const b = rctx.getImageData(0, 0, 1920, 1080).data;
      let diferentes = 0;
      let maximo = 0;
      let x0 = 1920, y0 = 1080, x1 = -1, y1 = -1;
      for (let i = 0; i < a.length; i += 4) {
        const d = Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!), Math.abs(a[i + 3]! - b[i + 3]!));
        if (d > 0) {
          if (d > maximo) maximo = d;
          if (d > 2) {
            diferentes++;
            const p = i / 4;
            const x = p % 1920, y = (p / 1920) | 0;
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            if (y > y1) y1 = y;
          }
        }
      }
      resultados.push({ tick: s.tick, fase: s.leitura.phase, diferentes, maximo, caixa: [x0, y0, x1, y1] });
    }
    return resultados;
  }, snaps);
}

const POSES = ['idle0', 'walk3', 'lp1', 'hk1', 'sa1', 'win', 'koFloor', 'hitH', 'crouch', 'jtop', 'guard', 'nao-existe'];
const MAPA_IDS: Record<string, string> = { f1: 'hayato', f2: 'wei-long', f3: 'min-ji', f4: 'caio' };

test.describe('fidelidade visual: render/ novo x protótipo (pixel a pixel)', () => {
  test.setTimeout(240_000);

  let proto: Page;
  test.beforeAll(async ({ browser }, info) => {
    if (info.project.name !== 'desktop') return;
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    proto = await ctx.newPage();
    await proto.goto(pathToFileURL(resolve('prototipo/inno-fighters-artefato.html')).href);
    await proto.waitForFunction(() => !!(window as any).SF && (window as any).SF.UI.ready, undefined, { timeout: 60_000 });
  });
  test.afterAll(async () => {
    await proto?.context().close();
  });

  for (const cena of CENAS) {
    test(cena.nome, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'comparação só no desktop');
      const snaps = await rodarNoPrototipo(proto, cena);
      expect(snaps).toHaveLength(cena.capturas.length);
      // SALVAR_QUADROS=<pasta>: grava os quadros de referência do protótipo para inspeção visual
      const pasta = process.env['SALVAR_QUADROS'];
      if (pasta) {
        mkdirSync(pasta, { recursive: true });
        for (const q of snaps) writeFileSync(resolve(pasta, `${cena.c1}-${cena.c2}-${cena.nome.slice(0, 12).replace(/W+/g, '_')}-t${q.tick}.png`), Buffer.from(q.png.split(',')[1], 'base64'));
      }
      const visto = new Set<string>();
      for (const q of snaps) {
        const L = q.leitura;
        visto.add(L.phase);
        if (L.training) visto.add('treino');
        if (L.perfect) visto.add('perfect');
        if (L.projectiles.length) visto.add('projetil');
        if (q.particulas.length) visto.add('particulas');
        if (q.impactos.length) visto.add('impacto');
        if (q.textos.length) visto.add('texto');
        for (const f of L.fighters) {
          if (f.state === 'move') visto.add('golpe');
          if (f.flash > 0) visto.add('flash');
          if (f.combo.t > 0) visto.add('combo');
          if (f.trail.length) visto.add('trail');
          if (f.pose.glow > 0.01) visto.add('glow');
          if (f.pose.name === 'koFloor') visto.add('deitado');
        }
      }
      info.annotations.push({ type: 'coberto', description: [...visto].join(',') });
      for (const e of cena.exige) expect(visto.has(e), `a cena nao mostrou '${e}' (viu: ${[...visto].join(',')})`).toBe(true);
      await usarArteDoPrototipo(page);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true');
      const r = await compararNoApp(page, snaps);
      info.annotations.push({ type: 'diferencas', description: JSON.stringify(r) });
      for (const q of r) {
        expect(q.diferentes, `tick ${q.tick} (${q.fase}) caixa ${JSON.stringify(q.caixa)} max ${q.maximo}`).toBe(0);
      }
    });
  }

  test('desenharPose: 4 lutadores x 12 poses (alias, fallback, espelho, alfa e flash)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'comparação só no desktop');
    const png = await proto.evaluate(
      ({ poses, ids }) => {
        ctx.setTransform(2, 0, 0, 2, 0, 0);
        ctx.clearRect(0, 0, 960, 540);
        ctx.fillStyle = '#3a3a55';
        ctx.fillRect(0, 0, 960, 540);
        Object.keys(ids).forEach((id, linha) => {
          poses.forEach((nome: string, col: number) => {
            const x = 40 + col * 78;
            const y = 120 + linha * 125;
            drawPose(ctx, CHARS[id], nome, x, y, 0.36, col % 2 ? -1 : 1, col === 3 ? 0.5 : 1, col === 7 ? 0.6 : 0);
          });
        });
        return canvas.toDataURL('image/png');
      },
      { poses: POSES, ids: MAPA_IDS },
    );
    await usarArteDoPrototipo(page); // HAYATO e MIN-JI com o atlas original: é o que o protótipo desenha
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true');
    const r = await page.evaluate(
      async ({ png, poses, ids }) => {
        const imp = (p: string): Promise<any> => import(/* @vite-ignore */ p);
        const { carregarRecursos } = await imp('/src/assets/carregador.ts');
        const { planoPadrao, montarElenco } = await imp('/src/assets/elenco.ts');
        const { desenharPose } = await imp('/src/render/pose.ts');
        const { prepararCanvas, usarEspacoLogico } = await imp('/src/render/tela.ts');
        const elenco = montarElenco(await carregarRecursos(planoPadrao('/')));
        const c = prepararCanvas(document.createElement('canvas'));
        usarEspacoLogico(c);
        c.fillStyle = '#3a3a55';
        c.fillRect(0, 0, 960, 540);
        Object.keys(ids).forEach((id, linha) => {
          const { ch, arte } = elenco[ids[id]!];
          poses.forEach((nome: string, col: number) => {
            desenharPose(c, ch, arte, nome, 40 + col * 78, 120 + linha * 125, 0.36, col % 2 ? -1 : 1, col === 3 ? 0.5 : 1, col === 7 ? 0.6 : 0);
          });
        });
        const img = new Image();
        img.src = png;
        await img.decode();
        const ref = document.createElement('canvas');
        ref.width = 1920;
        ref.height = 1080;
        const rc = ref.getContext('2d')!;
        rc.drawImage(img, 0, 0);
        const a = c.getImageData(0, 0, 1920, 1080).data;
        const b = rc.getImageData(0, 0, 1920, 1080).data;
        let dif = 0;
        let pintados = 0;
        for (let i = 0; i < a.length; i += 4) {
          if (a[i] !== 0x3a || a[i + 1] !== 0x3a) pintados++;
          if (Math.max(Math.abs(a[i]! - b[i]!), Math.abs(a[i + 1]! - b[i + 1]!), Math.abs(a[i + 2]! - b[i + 2]!)) > 2) dif++;
        }
        return { dif, pintados };
      },
      { png, poses: POSES, ids: MAPA_IDS },
    );
    expect(r.pintados).toBeGreaterThan(100_000); // os 48 bonecos apareceram de verdade
    expect(r.dif).toBe(0);
  });
});
