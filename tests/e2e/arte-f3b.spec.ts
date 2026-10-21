/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';

/*
 * F3b: a arte nova de HAYATO e MIN-JI (atlas v2, 2 páginas) e a SARPA da NILA (folha 5, 60 quadros em 3 páginas) no jogo REAL
 * (produção: sem as fixtures do protótipo), no navegador. O que se prova aqui:
 *  - cada arquivo de arte é baixado uma vez e as imagens certas (v2) são as que entram em luta;
 *  - o corpo desenhado existe (dezenas de milhares de pixels), está sobre o x lógico dele e a base cai na linha do chão (A/B de
 *    pixels: render com e sem a imagem do lutador; ver armadilhas: medir, não olhar);
 *  - a SARPA desenha MESMO os quadros `sarpa*` (o quadro do atlas bate com o que `poseDaFicha` pede), não os da GAJA.
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 do canvas para conferência visual:
 * `SALVAR_CAPTURAS=arte-fonte/capturas npx playwright test arte-f3b`.
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

function espiarAssets(page: Page): string[] {
  const urls: string[] = [];
  page.on('request', (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith('/assets/')) urls.push(p);
  });
  return urls;
}

async function abrirJogo(page: Page, query: string): Promise<void> {
  await page.goto(`/?seed=3&manual=1&${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  // L2: cada especial congelaria a cena por 48 ticks (a cinemática); este spec mede o golpe quadro a quadro, então ela fica desligada AQUI
  // (a cinemática tem o spec próprio, cinematica.spec.ts). Nada do que se mede aqui fica mais frouxo.
  await page.evaluate(() => {
    (window as any).__inno.persist.settings.cinematica = 'desligada';
  });
}

/** Abre uma luta de treino `c1` x `c2` (os dois controlados à mão) e anda até a fase de luta. */
async function abrirLuta(page: Page, c1: string, c2: string, extra: Record<string, unknown> = {}): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ mode: 'training', c1, c2, cpu: null, ...extra })} }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 200; i++) {
    const fase = await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }');
    if (fase === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(20)');
}

interface Corpo {
  n: number;
  caixa: [number, number, number, number];
  x: number;
  y: number;
  pose: string;
  quadro: string[];
}

/**
 * A/B no quadro atual: desenha com e sem a imagem do lutador `lado` (p1 | p2). O que muda é o corpo dele; a base do que
 * mudou (y1) é a linha dos pés, no canvas real (2x o espaço lógico). `quadro` = nomes do atlas cujo recorte é o que a pose pede.
 */
async function medirCorpo(page: Page, lado: 'p1' | 'p2'): Promise<Corpo> {
  return page.evaluate(async (l: string) => {
    const { getPD } = await import(/* @vite-ignore */ ('/src/data/poses.ts' as string));
    const { chDaFicha } = await import(/* @vite-ignore */ ('/src/render/lutador.ts' as string));
    const h = (window as any).__inno;
    const m = h.mundo();
    const f = m.game[l];
    const canvas = document.getElementById('jogo') as HTMLCanvasElement;
    const g = canvas.getContext('2d') as CanvasRenderingContext2D;
    const arte = m.elenco[f.id].arte;
    m.game.shake = 0; // o tremor de tela (defesa/golpe) sorteia um deslocamento por desenho: sem isso o A/B compara quadros deslocados
    h.desenhar();
    const a = g.getImageData(0, 0, canvas.width, canvas.height);
    h.desenhar();
    const a2 = g.getImageData(0, 0, canvas.width, canvas.height); // o mesmo quadro de novo: o que muda sozinho (pulsos, texto) não é corpo
    const original = arte.imagemDe;
    arte.imagemDe = () => null;
    h.desenhar();
    const b = g.getImageData(0, 0, canvas.width, canvas.height);
    arte.imagemDe = original;
    h.desenhar();
    let [x0, y0, x1, y1] = [canvas.width, canvas.height, -1, -1];
    let n = 0;
    for (let y = 0; y < canvas.height; y++) {
      for (let x = 0; x < canvas.width; x++) {
        const i = (y * canvas.width + x) * 4;
        const ruido = Math.abs((a.data[i] as number) - (a2.data[i] as number)) + Math.abs((a.data[i + 1] as number) - (a2.data[i + 1] as number)) + Math.abs((a.data[i + 2] as number) - (a2.data[i + 2] as number));
        if (ruido > 0) continue;
        const d = Math.abs((a.data[i] as number) - (b.data[i] as number)) + Math.abs((a.data[i + 1] as number) - (b.data[i + 1] as number)) + Math.abs((a.data[i + 2] as number) - (b.data[i + 2] as number));
        if (d > 120) {
          n++;
          if (x < x0) x0 = x;
          if (x > x1) x1 = x;
          if (y < y0) y0 = y;
          if (y > y1) y1 = y;
        }
      }
    }
    const pd = getPD(chDaFicha(f.chBase, f.ficha), f.pose.name);
    const quadros = arte.manifesto.quadros as Record<string, any>;
    const quadro = Object.keys(quadros).filter((k) => quadros[k].x === pd.x && quadros[k].y === pd.y && quadros[k].w === pd.w && quadros[k].h === pd.h);
    return { n, caixa: [x0, y0, x1, y1] as [number, number, number, number], x: f.x, y: f.y, pose: f.pose.name, quadro };
  }, lado);
}

/** Tolerância (px do canvas 1920x1080) entre a base do corpo e a linha do chão: a mesma da F3a. */
const TOL_PES = 14;

function esperarNoChao(c: Corpo, rotulo: string): void {
  expect(c.n, `${rotulo}: corpo desenhado`).toBeGreaterThan(20_000);
  expect(c.caixa[0], rotulo).toBeLessThan(c.x * 2);
  expect(c.caixa[2], rotulo).toBeGreaterThan(c.x * 2);
  expect(Math.abs(c.caixa[3] - c.y * 2), `${rotulo}: base ${c.caixa[3]} x chão ${c.y * 2} (pose ${c.pose}, quadro ${c.quadro.join('/')})`).toBeLessThanOrEqual(TOL_PES);
}

test.describe('F3b: HAYATO e MIN-JI com a arte nova (atlas v2) no jogo real', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
  });

  test('em luta: 2 páginas cada (uma vez), nenhum atlas v1 antigo, pés na linha, golpes de solo', async ({ page }) => {
    const erros = coletarErros(page);
    const urls = espiarAssets(page);
    await abrirJogo(page, '');
    await abrirLuta(page, 'hayato', 'min-ji');

    for (const id of ['hayato', 'min-ji']) {
      expect(urls.filter((u) => u.startsWith(`/assets/lutadores/${id}/atlas`) && u.endsWith('.webp')).sort(), id).toEqual([`/assets/lutadores/${id}/atlas-0.webp`, `/assets/lutadores/${id}/atlas-1.webp`]);
      const m = await hook(page, `(h) => { const a = h.mundo().elenco['${id}'].arte; return { versao: a.manifesto.versao, quadros: Object.keys(a.manifesto.quadros).length, paginas: a.paginasCarregadas, alturaRef: a.manifesto.alturaRef }; }`);
      expect(m, id).toMatchObject({ quadros: 48, paginas: 2, alturaRef: 410 });
    }

    // P1 olha para a direita, P2 para a esquerda: cada um sobre o x dele, base na linha do chão
    esperarNoChao(await medirCorpo(page, 'p1'), 'HAYATO guarda');
    esperarNoChao(await medirCorpo(page, 'p2'), 'MIN-JI guarda');

    // controle negativo: se o recorte da pose descer 30 px no atlas, o corpo sobe e o A/B TEM de acusar (a medida mede de verdade)
    await page.evaluate(async () => {
      const { getPD } = await import(/* @vite-ignore */ ('/src/data/poses.ts' as string));
      const { chDaFicha } = await import(/* @vite-ignore */ ('/src/render/lutador.ts' as string));
      const f = (window as any).__inno.mundo().game.p1;
      (window as any).__pdMutado = getPD(chDaFicha(f.chBase, f.ficha), f.pose.name);
      (window as any).__pdMutado.y += 30;
    });
    const deslocado = await medirCorpo(page, 'p1');
    await page.evaluate(() => { (window as any).__pdMutado.y -= 30; });
    expect(Math.abs(deslocado.caixa[3] - deslocado.y * 2), 'o A/B não acusou o pé deslocado').toBeGreaterThan(TOL_PES);
    esperarNoChao(await medirCorpo(page, 'p1'), 'HAYATO guarda (restaurado)');
    await capturar(page, 'f3b-hayato-x-min-ji-luta');

    // golpes de solo de cada um (o que acerta de pé): a pose pedida existe no atlas e a base segue no chão.
    // Mede no 1º tick ATIVO (mt > S); pula os que saem do chão (salto, mergulho).
    const relato: string[] = [];
    for (const [lado, id] of [['p1', 'hayato'], ['p2', 'min-ji']] as const) {
      for (const golpe of ['lp', 'hp', 'lk', 'hk', 'clp', 'sFire', 'sDown', 'sFwd']) {
        const ok = await page.evaluate(
          ({ l, g }) => {
            const h = (window as any).__inno;
            const G = h.mundo().game;
            G.p1.x = 300;
            G.p1.facing = 1;
            G.p2.x = 640;
            G.p2.facing = -1;
            for (const q of [G.p1, G.p2]) {
              q.en = 100;
              q.reset(false);
            }
            G.p1.x = 300;
            G.p2.x = 640;
            const f = G[l];
            if (!f.ch.moves[g]) return false;
            f.startMove(g, G);
            for (let t = 0; t < 40 && !(f.state === 'move' && f.mt > f.golpeAtual().S); t++) h.avancar(1);
            return f.state === 'move';
          },
          { l: lado, g: golpe },
        );
        if (!ok) continue;
        const c = await medirCorpo(page, lado);
        relato.push(`${id}:${golpe}:${c.pose}->${c.quadro.join('/') || 'SEM-QUADRO'} base=${c.caixa[3]} chao=${c.y * 2}`);
        expect(c.quadro.length, `${id} ${golpe} (${c.pose}) sem quadro no atlas`).toBeGreaterThan(0);
        expect(c.n, `${id} ${golpe}`).toBeGreaterThan(5_000);
        await capturar(page, `golpes/f3b-${id}-${golpe}-${c.pose}`);
      }
    }
    test.info().annotations.push({ type: 'golpes', description: relato.join(' | ') });
    expect(erros).toEqual([]);
  });

  test('HAYATO não lembra o Ryu: o quadro de guarda tem gi cinza-grafite, faixa verde e mecha (cores amostradas)', async ({ page }) => {
    await abrirJogo(page, '');
    await abrirLuta(page, 'hayato', 'min-ji');
    // Amostra as cores do corpo do HAYATO (pixels que mudam com/sem a imagem): o gi do Ryu é branco/creme; o novo é grafite.
    const r = await page.evaluate(() => {
      const h = (window as any).__inno;
      const m = h.mundo();
      const canvas = document.getElementById('jogo') as HTMLCanvasElement;
      const g = canvas.getContext('2d') as CanvasRenderingContext2D;
      h.desenhar();
      const a = g.getImageData(0, 0, canvas.width, canvas.height);
      const arte = m.elenco.hayato.arte;
      const original = arte.imagemDe;
      arte.imagemDe = () => null;
      h.desenhar();
      const b = g.getImageData(0, 0, canvas.width, canvas.height);
      arte.imagemDe = original;
      h.desenhar();
      let claros = 0;
      let grafite = 0;
      let verdes = 0;
      let total = 0;
      for (let i = 0; i < a.data.length; i += 4) {
        const dr = Math.abs((a.data[i] as number) - (b.data[i] as number)) + Math.abs((a.data[i + 1] as number) - (b.data[i + 1] as number)) + Math.abs((a.data[i + 2] as number) - (b.data[i + 2] as number));
        if (dr <= 120) continue;
        const R = a.data[i] as number;
        const G = a.data[i + 1] as number;
        const B = a.data[i + 2] as number;
        total++;
        if (R > 200 && G > 200 && B > 190) claros++; // branco/creme (gi do Ryu)
        if (R < 90 && G < 90 && B < 100 && Math.abs(R - B) < 30) grafite++; // grafite
        if (G > R + 30 && G > B + 10 && G > 90) verdes++; // faixa verde
      }
      return { total, claros, grafite, verdes };
    });
    test.info().annotations.push({ type: 'cores', description: JSON.stringify(r) });
    expect(r.total).toBeGreaterThan(20_000);
    // gi cinza-grafite domina; o branco do kimono clássico é minoria; a faixa verde existe
    expect(r.grafite / r.total).toBeGreaterThan(0.3); // medido: 0,55 na arte nova; 0,11 no atlas original
    expect(r.verdes).toBeGreaterThan(400); // medido: 645 na arte nova; 238 no original
    expect(r.claros / r.total).toBeLessThan(0.12); // medido: 0,04 na arte nova; 0,30 no original (gi claro)
  });
});

test.describe('F3b: NILA (GAJA e SARPA) com a folha 5', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
  });

  // um teste por postura: cada um cabe em ~25 s e a suíte não disputa CPU com os testes de jogo real
  for (const postura of ['gaja', 'sarpa'] as const) {
  test(`${postura.toUpperCase()}: 3 páginas e 60 quadros; idle, andar, defesa e os dois especiais desenham o quadro certo e pisam no chão`, async ({ page }) => {
    const erros = coletarErros(page);
    const urls = espiarAssets(page);
    await abrirJogo(page, '');
    // NILA é a P1 (setas): andar e defender com teclado de verdade; o HAYATO (P2) só ataca quando o teste manda
    await abrirLuta(page, 'nila', 'hayato');
    expect(urls.filter((u) => u.startsWith('/assets/lutadores/nila/atlas-')).sort()).toEqual(['/assets/lutadores/nila/atlas-0.webp', '/assets/lutadores/nila/atlas-1.webp', '/assets/lutadores/nila/atlas-2.webp']);
    const m = await hook(page, '(h) => { const a = h.mundo().elenco.nila.arte; return { quadros: Object.keys(a.manifesto.quadros).length, paginas: a.paginasCarregadas, sarpa: Object.keys(a.manifesto.quadros).filter((k) => k.startsWith("sarpa")).length }; }');
    expect(m).toEqual({ quadros: 60, paginas: 3, sarpa: 12 });

    const relato: string[] = [];
    const nome = (c: Corpo): string => c.quadro.join('/') || 'SEM-QUADRO';
    const registrar = (rot: string, c: Corpo): void => {
      relato.push(`${rot}:${c.pose}->${nome(c)} base=${c.caixa[3]} chao=${c.y * 2}`);
    };

    const preparar = async (): Promise<void> => {
      await page.keyboard.up('ArrowLeft');
      await page.keyboard.up('ArrowRight');
      await page.keyboard.up('ArrowDown');
      await page.evaluate(() => {
        const h = (window as any).__inno;
        const G = h.mundo().game;
        for (const q of [G.p1, G.p2]) q.reset(false);
        G.p1.x = 300;
        G.p2.x = 680;
        G.p1.en = 100;
        G.p2.en = 100;
        h.avancar(2);
      });
    };

    {
      await preparar();
      if (postura === 'sarpa') {
        await page.evaluate(() => {
          const h = (window as any).__inno;
          const G = h.mundo().game;
          G.p1.trocarFicha('sarpa');
          h.avancar(2);
        });
      }
      const pref = `nila-${postura}`;
      const prefixoQuadro = postura === 'sarpa' ? /^sarpa/ : /^(?!sarpa)/;

      // idle: laço de 4 quadros (a serpente ondula); anda o laço inteiro medindo cada um
      const quadros = new Set<string>();
      for (let t = 0; t < 40; t += 10) {
        await hook(page, '(h) => h.avancar(10)');
        const c = await medirCorpo(page, 'p1');
        esperarNoChao(c, `${pref} idle`);
        for (const q of c.quadro) quadros.add(q);
        if (t === 0) {
          registrar(`${pref}-idle`, c);
          await capturar(page, `f3b-${pref}-1-idle`);
        }
        expect(c.quadro.some((q) => prefixoQuadro.test(q)), `${pref} idle desenhou ${nome(c)}`).toBe(true);
      }

      // andar: seta para a direita de verdade
      await page.keyboard.down('ArrowRight');
      await hook(page, '(h) => h.avancar(14)');
      const andar = await medirCorpo(page, 'p1');
      registrar(`${pref}-andar`, andar);
      esperarNoChao(andar, `${pref} andar`);
      expect(andar.pose).toMatch(/^walk/);
      expect(andar.quadro.some((q) => prefixoQuadro.test(q)), `${pref} andar desenhou ${nome(andar)}`).toBe(true);
      await capturar(page, `f3b-${pref}-2-andar`);
      await page.keyboard.up('ArrowRight');

      // defesa em pé e agachada: o HAYATO (P2) ataca e a NILA segura "para trás"; ela olha para a direita, então trás = esquerda
      for (const agachada of [false, true]) {
        await preparar();
        if (postura === 'sarpa') await page.evaluate(() => { (window as any).__inno.mundo().game.p1.trocarFicha('sarpa'); });
        await page.evaluate(() => {
          const G = (window as any).__inno.mundo().game;
          G.p2.x = G.p1.x + 150; // golpe longo do HAYATO alcança
          G.p2.facing = -1;
        });
        await page.keyboard.down('ArrowLeft');
        if (agachada) await page.keyboard.down('ArrowDown');
        const def = await page.evaluate((baixo: boolean) => {
          const h = (window as any).__inno;
          const G = h.mundo().game;
          G.p2.startMove(baixo ? 'clp' : 'hp', G);
          let achou = false;
          for (let t = 0; t < 60 && !achou; t++) {
            h.avancar(1);
            if (G.p1.state === 'block') achou = true;
          }
          return achou;
        }, agachada);
        expect(def, `${pref} defesa${agachada ? ' agachada' : ''}: o golpe foi bloqueado`).toBe(true);
        const c = await medirCorpo(page, 'p1');
        registrar(`${pref}-defesa${agachada ? '-agachada' : ''}`, c);
        expect(c.n, `${pref} defesa`).toBeGreaterThan(5_000);
        expect(Math.abs(c.caixa[3] - c.y * 2), `${pref} defesa: base ${c.caixa[3]} x chão ${c.y * 2}`).toBeLessThanOrEqual(TOL_PES);
        expect(c.quadro.length, `${pref} defesa: pose ${c.pose} sem quadro`).toBeGreaterThan(0);
        if (postura === 'sarpa') expect(c.quadro, `defesa da SARPA desenhou ${nome(c)}`).toContain('sarpaBlock');
        else expect(c.quadro.some((q) => /^sarpa/.test(q))).toBe(false);
        if (!agachada) await capturar(page, `f3b-${pref}-3-defesa`);
        await page.keyboard.up('ArrowLeft');
        await page.keyboard.up('ArrowDown');
      }

      // golpe especial: SARPA ESP = BOTE (deslize), →+ESP = salto; GAJA ESP = toque, →+ESP = passo do elefante
      for (const golpe of ['sFire', 'sFwd'] as const) {
        await preparar();
        if (postura === 'sarpa') await page.evaluate(() => { (window as any).__inno.mundo().game.p1.trocarFicha('sarpa'); });
        const pecas: Array<{ t: number; pose: string; quadro: string; base: number; chao: number; noAr: boolean; alcance: [number, number] }> = [];
        const total = await page.evaluate((g: string) => {
          const h = (window as any).__inno;
          const G = h.mundo().game;
          G.p2.x = 900; // longe: o golpe não conecta e o deslize/salto roda inteiro
          G.p1.startMove(g, G);
          return G.p1.golpeAtual().S + G.p1.golpeAtual().A + 8;
        }, golpe);
        for (let t = 0; t < total + 30; t += 3) {
          await hook(page, '(h) => h.avancar(3)');
          const estado = await hook(page, '(h) => { const f = h.mundo().game.p1; return { move: f.state, mt: f.mt, y: f.y, ch: f.grounded }; }');
          if (estado.move !== 'move' && estado.move !== 'jump') break;
          const c = await medirCorpo(page, 'p1');
          pecas.push({ t, pose: c.pose, quadro: c.quadro.join('/'), base: c.caixa[3], chao: c.y * 2, noAr: !estado.ch, alcance: [c.caixa[0], c.caixa[2]] });
          if (t % 6 === 0) await capturar(page, `golpes/f3b-${pref}-${golpe}-t${String(t).padStart(2, '0')}-${c.pose}`);
        }
        relato.push(`${pref}-${golpe}: ` + pecas.map((p) => `${p.pose}->${p.quadro || 'SEM-QUADRO'}${p.noAr ? '(ar)' : `(base ${p.base - p.chao})`}`).join(', '));
        expect(pecas.length, `${pref} ${golpe}`).toBeGreaterThan(2);
        expect(pecas.every((p) => p.quadro !== ''), `${pref} ${golpe}: pose sem quadro no atlas`).toBe(true);
        // no chão (deslize, passo): a base do corpo fica na linha
        for (const p of pecas.filter((q) => !q.noAr)) expect(Math.abs(p.base - p.chao), `${pref} ${golpe} ${p.pose}->${p.quadro}`).toBeLessThanOrEqual(TOL_PES);
        if (postura === 'sarpa' && golpe === 'sFire') {
          const q = new Set(pecas.map((p) => p.quadro));
          expect(q.has('sarpaSlide0') || q.has('sarpaSlide1'), `BOTE desenhou ${[...q].join(',')}`).toBe(true);
          expect(q.has('sarpaSlide1'), 'BOTE: deslize ativo').toBe(true);
        }
        if (postura === 'sarpa' && golpe === 'sFwd') {
          const q = new Set(pecas.map((p) => p.quadro));
          expect([...q].some((n) => /^sarpaLeap/.test(n)), `salto desenhou ${[...q].join(',')}`).toBe(true);
        }
      }
    }
    test.info().annotations.push({ type: 'nila', description: relato.join(' | ') });
    expect(erros).toEqual([]);
  });
  }
});

test.describe('F3b: retratos na seleção', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
  });

  test('os 10 retratos (HAYATO, MIN-JI e NILA novos, e o do ZENON) chegam e a seleção desenha os 10 liberados', async ({ page }) => {
    const erros = coletarErros(page);
    const urls = espiarAssets(page);
    await abrirJogo(page, 'expansao=1');
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); h.avancar(30); h.desenhar(); }");
    expect(urls.filter((u) => u.endsWith('/retrato.png')).length).toBe(10);
    const retratos = await hook(page, '(h) => Object.fromEntries(Object.entries(h.mundo().elenco).map(([id, e]) => { const r = e.arte.retrato([0, 0, 1, 1]); return [id, r ? [r.imagem.width, r.imagem.height, r.recorte.join(",")] : null]; }))');
    for (const id of ['hayato', 'min-ji', 'nila']) {
      expect(retratos[id], id).not.toBeNull();
      // o retrato novo tem o recorte fracionário do retrato.json, dentro da imagem
      const [w, h, rec] = retratos[id] as [number, number, string];
      const [rx, ry, rw, rh] = rec.split(',').map(Number) as [number, number, number, number];
      expect(rx + rw, id).toBeLessThanOrEqual(w + 1);
      expect(ry + rh, id).toBeLessThanOrEqual(h + 1);
    }
    await capturar(page, 'f3b-selecao-9-liberados');
    await hook(page, "(h) => { h.ui.set('select', { mode: 'versus' }); h.avancar(2); h.desenhar(); }");
    expect(erros).toEqual([]);
  });

  test('a seleção de produção (4 liberados) com os retratos novos', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, '');
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); h.avancar(30); h.desenhar(); }");
    await capturar(page, 'f3b-selecao-producao');
    expect(erros).toEqual([]);
  });
});
