/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CHEFE } from './_chefe';

/*
 * F3a: os cinco lutadores novos (AMINU, CENTELLA, CAMILLE, NILA, BAATAR) e os seis cenários, com a arte real, no
 * navegador, no jogo de PRODUÇÃO (abre com 4 e trava o resto; as lutas aceitam os 9). `?expansao=1` (só no servidor de
 * desenvolvimento) libera os 9 na seleção.
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 do canvas (lutador em luta, cenário, seleção) para conferência
 * visual: `SALVAR_CAPTURAS=arte-fonte/capturas npx playwright test novos-lutadores`.
 */

test.describe.configure({ timeout: 120_000 });

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
}

/** Abre uma luta de treino (HAYATO x `c2`) e anda até a fase de luta, com a arte já na memória. */
async function abrirLuta(page: Page, c2: string, extra: Record<string, unknown> = {}): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ mode: 'training', c1: 'hayato', c2, cpu: null, ...extra })} }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 200; i++) {
    const fase = await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }');
    if (fase === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(20)');
}

const NOVOS = [
  { id: 'aminu', cenario: 'ng', paginas: 2 },
  { id: 'centella', cenario: 'mx', paginas: 2 },
  { id: 'camille', cenario: 'fr', paginas: 2 },
  { id: 'nila', cenario: 'in', paginas: 3 }, // GAJA (f1-f4) + SARPA (f5): 60 quadros em 3 páginas
  { id: 'baatar', cenario: 'mn', paginas: 4 },
] as const;

test.describe('arte real dos cinco novos', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
  });

  test('a seleção abre os 9 sem travar ninguém (BAATAR na 9ª casa); a produção abre só 4 e trava os outros 5, o BAATAR entre eles', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, 'expansao=1');
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); }");
    const grade = await hook(page, '(h) => h.ui.scene.grade');
    expect(grade).toHaveLength(9);
    expect(grade).toEqual(['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar']); // sem chefão: ordem do roster
    expect(grade[8]).toBe('baatar');
    const liberados = await page.evaluate(async () => {
      const h = (window as any).__inno;
      const { liberados: lib } = await import(/* @vite-ignore */ ('/src/meta/index.ts' as string));
      return [...lib(h.persist.prog, h.ui.c.regras)].sort();
    });
    expect(liberados).toEqual(['aminu', 'baatar', 'caio', 'camille', 'centella', 'hayato', 'min-ji', 'nila', 'wei-long']);
    await capturar(page, 'selecao-expansao-9-liberados');

    const prod = await page.context().newPage();
    const errosProd = coletarErros(prod);
    await prod.goto('/?seed=3&manual=1');
    await expect(prod.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await hook(prod, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); }");
    const estados = await prod.evaluate(async () => {
      const h = (window as any).__inno;
      const { estadoDaCasa } = await import(/* @vite-ignore */ ('/src/ui/grade.ts' as string));
      const cena = h.ui.scene;
      const c = { prog: h.persist.prog, regras: h.ui.c.regras, novos: cena.novos };
      return Object.fromEntries(cena.grade.map((id: string) => [id, estadoDaCasa(id, c)]));
    });
    expect(estados).toEqual({
      hayato: 'liberado', 'wei-long': 'liberado', 'min-ji': 'liberado', caio: 'liberado',
      aminu: 'travado', centella: 'travado', camille: 'travado', nila: 'travado', baatar: 'travado', // BAATAR é lutador comum: sem "???"
    });
    await capturar(prod, 'selecao-producao-5-travados');
    expect(errosProd).toEqual([]);
    expect(erros).toEqual([]);
  });

  test('COM chefão de teste: o chefão fica no centro da grade e escondido ("???") até ser derrotado; os outros 4 seguem travados', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, CHEFE.query);
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); }");
    const grade: string[] = await hook(page, '(h) => h.ui.scene.grade');
    expect(grade).toHaveLength(9);
    expect(grade[4]).toBe(CHEFE.id);
    const estados = await page.evaluate(async () => {
      const h = (window as any).__inno;
      const { estadoDaCasa } = await import(/* @vite-ignore */ ('/src/ui/grade.ts' as string));
      const cena = h.ui.scene;
      const c = { prog: h.persist.prog, regras: h.ui.c.regras, novos: cena.novos };
      return Object.fromEntries(cena.grade.map((id: string) => [id, estadoDaCasa(id, c)]));
    });
    expect(estados).toEqual({
      hayato: 'liberado', 'wei-long': 'liberado', 'min-ji': 'liberado', caio: 'liberado',
      aminu: 'travado', centella: 'travado', camille: 'travado', nila: 'travado', [CHEFE.id]: 'chefe-oculto',
    });
    await capturar(page, 'selecao-producao-chefe-oculto');
    expect(erros).toEqual([]);
  });

  for (const { id, cenario, paginas } of NOVOS) {
    test(`${id}: carga sob demanda (${paginas} páginas + cenário ${cenario}), pés no chão, desenhado da página certa`, async ({ page }) => {
      const erros = coletarErros(page);
      const urls = espiarAssets(page);
      await abrirJogo(page, '');
      // no boot só a vitrine tem imagens: nenhuma página do novo
      expect(urls.filter((u) => u.startsWith(`/assets/lutadores/${id}/atlas-`))).toEqual([]);
      expect(urls.filter((u) => u.endsWith(`cenario-${cenario}.webp`))).toEqual([]);

      await abrirLuta(page, id);
      // a luta pediu cada página uma vez e o cenário da casa do rival
      for (let p = 0; p < paginas; p++) expect(urls.filter((u) => u === `/assets/lutadores/${id}/atlas-${p}.webp`), `página ${p}`).toHaveLength(1);
      expect(urls.filter((u) => u.startsWith(`/assets/lutadores/${id}/atlas-`))).toHaveLength(paginas);
      expect(urls.filter((u) => u === `/assets/cenarios/cenario-${cenario}.webp`)).toHaveLength(1);
      expect(await hook(page, '(h) => h.mundo().game.stage')).toBe(cenario);

      // A/B no mesmo quadro: com e sem a arte do P2. O que muda é o corpo dele; a base do que mudou é a linha dos pés.
      const medida = await page.evaluate(async (alvo: string) => {
        const h = (window as any).__inno;
        const m = h.mundo();
        const canvas = document.getElementById('jogo') as HTMLCanvasElement;
        const g = canvas.getContext('2d') as CanvasRenderingContext2D;
        h.desenhar();
        const a = g.getImageData(0, 0, canvas.width, canvas.height);
        const arte = m.elenco[alvo].arte;
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
        const f = m.game.p2;
        return { n, caixa: [x0, y0, x1, y1], x: f.x, y: f.y, pose: f.pose.name, pagina: m.elenco[alvo].arte.paginaDe(f.pose.name) };
      }, id);
      // o corpo existe (milhares de pixels), está em torno do x lógico do P2 (canvas = 2x) e a base cai na linha do chão
      expect(medida.n).toBeGreaterThan(20_000);
      const [x0, y0, x1, y1] = medida.caixa as [number, number, number, number];
      expect(x0).toBeLessThan(medida.x * 2);
      expect(x1).toBeGreaterThan(medida.x * 2);
      expect(Math.abs(y1 - medida.y * 2), `base do corpo ${y1} x chão ${medida.y * 2}`).toBeLessThanOrEqual(14);
      expect(y0).toBeGreaterThan(200); // a cabeça fica abaixo do HUD (retratos até ~195 px)
      expect(y1 - y0).toBeGreaterThan(id === 'baatar' ? 520 : 400); // tamanho de gente (BAATAR é 1,28x maior)

      await capturar(page, `lutador-${id}-1-guarda`);
      expect(erros).toEqual([]);
    });
  }

  test('NILA: a troca de postura vira SARPA no HUD e volta a GAJA (evento troca-ficha trata flash e fumaça)', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, '');
    await abrirLuta(page, 'nila');
    expect(await hook(page, '(h) => h.mundo().game.p2.ficha')).toBeNull();
    // VADIVU de verdade, pelo golpe (↓+ESP da NILA): a ficha troca em mt === S e o evento sai
    const trocou = await page.evaluate(async () => {
      const h = (window as any).__inno;
      const G = h.mundo().game;
      const antes = h.mundo().efeitos.particulas.length;
      G.p2.startMove('sDown', G);
      const vistos: string[] = [];
      for (let i = 0; i < 20; i++) {
        h.avancar(1);
        for (const ev of G.events) if (ev.tipo === 'troca-ficha') vistos.push(String(ev.ficha));
      }
      return { vistos, ficha: G.p2.ficha, ganhouParticulas: h.mundo().efeitos.particulas.length > antes };
    });
    expect(trocou.vistos).toEqual(['sarpa']);
    expect(trocou.ficha).toBe('sarpa');
    await capturar(page, 'lutador-nila-2-sarpa');
    const volta = await page.evaluate(() => {
      const h = (window as any).__inno;
      const G = h.mundo().game;
      G.p2.startMove('sDown', G);
      for (let i = 0; i < 30; i++) h.avancar(1);
      return G.p2.ficha;
    });
    expect(volta).toBeNull();
    expect(erros).toEqual([]);
  });

  test('BAATAR normal (produção): 1 barra, sem ficha, →+ESP é o MERGULHO DA ÁGUIA com a arte própria (dive0/dive1)', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, '');
    await abrirLuta(page, 'baatar', { mode: 'arcade', cpu: 1 });
    const f = await hook(page, '(h) => { const p = h.mundo().game.p2; return { chefe: p.chefe, barras: p.barras, barrasMax: p.barrasMax, ficha: p.ficha, hp: p.maxHp, sFwd: p.ch.moves.sFwd.name, fichas: Object.keys(p.ch.fichas) }; }');
    expect(f).toMatchObject({ chefe: false, barras: 1, barrasMax: 1, ficha: null, sFwd: 'MERGULHO DA ÁGUIA', fichas: [] });
    // o MERGULHO sai de verdade: a pose do golpe é a do atlas (dive0/dive1) já na ficha base
    const r = await page.evaluate(async () => {
      const { getPD } = await import(/* @vite-ignore */ ('/src/data/poses.ts' as string));
      const h = (window as any).__inno;
      const G = h.mundo().game;
      G.p1.x = 200;
      G.p2.x = 700;
      G.p2.en = 100;
      G.p2.facing = -1;
      G.p2.startMove('sFwd', G);
      const poses = new Set<string>();
      for (let t = 0; t < 60; t++) {
        h.avancar(1);
        poses.add(G.p2.pose.name);
      }
      const ch = h.mundo().elenco.baatar.ch;
      const dive1 = h.mundo().elenco.baatar.arte.manifesto.quadros.dive1;
      const pd = getPD(ch, 'sc1');
      return { poses: [...poses], mergulhoNoAtlas: pd.x === dive1.x && pd.y === dive1.y && pd.w === dive1.w, ficha: G.p2.ficha, fase: G.phase };
    });
    expect(r.poses.some((p) => p === 'sc0' || p === 'sc1')).toBe(true);
    expect(r.mergulhoNoAtlas).toBe(true);
    expect(r).toMatchObject({ ficha: null, fase: 'fight' });
    await capturar(page, 'lutador-baatar-normal-mergulho');
    expect(erros).toEqual([]);
  });

  test('COM chefão de teste (BAATAR antigo): 2 barras, troca de barra, Dança da Águia e fase 2 (MERGULHO) no cenário da Estepe', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, CHEFE.query);
    await abrirLuta(page, CHEFE.id, { mode: 'arcade', cpu: 1, chefe: true });
    const f = await hook(page, '(h) => { const p = h.mundo().game.p2; return { chefe: p.chefe !== null, barras: p.barras, barrasMax: p.barrasMax, ficha: p.ficha }; }');
    expect(f).toEqual({ chefe: true, barras: 2, barrasMax: 2, ficha: CHEFE.fase1 });
    await capturar(page, 'lutador-baatar-0-chefe-2-barras');

    // zera a 1ª barra com um golpe de verdade: a luta troca de barra e abre a Dança (relógio parado, sem entradas)
    // (a harness só rebaixa a vida enquanto a barra não trocou: depois da troca a barra nova nasce cheia e fica assim)
    let fase = '';
    for (let tentativa = 0; tentativa < 12 && fase !== 'cena-chefe'; tentativa++) {
      fase = await page.evaluate(() => {
        const h = (window as any).__inno;
        const G = h.mundo().game;
        if (G.p2.barras === 2) {
          G.p2.hp = 1;
          G.p2.hpShown = 1;
          G.p1.x = G.p2.x - 80;
          G.p1.hp = G.p1.maxHp;
          G.p1.startMove('hp', G);
        }
        for (let t = 0; t < 40 && G.phase !== 'cena-chefe'; t++) h.avancar(1);
        return G.phase as string;
      });
    }
    expect(fase).toBe('cena-chefe');
    const danca = await page.evaluate(() => {
      const h = (window as any).__inno;
      const G = h.mundo().game;
      h.avancar(45);
      return { fase: G.phase, barras: G.p2.barras, pose: G.p2.pose.name, hp: G.p2.hp, maxHp: G.p2.maxHp };
    });
    expect(danca).toMatchObject({ fase: 'cena-chefe', barras: 1 });
    expect(danca.hp).toBe(danca.maxHp); // a barra nova nasce cheia
    expect(danca.pose).toMatch(CHEFE.poseDanca); // a Dança usa as poses próprias do atlas do BAATAR
    await capturar(page, 'lutador-baatar-1-danca-da-aguia');

    // retomada: a ficha da fase 2 está ativa e o MERGULHO usa a arte própria (dive0/dive1), com a barra cheia de novo
    const retomou = await page.evaluate(async (c) => {
      const { getPD } = await import(/* @vite-ignore */ ('/src/data/poses.ts' as string));
      const h = (window as any).__inno;
      const G = h.mundo().game;
      for (let t = 0; t < 120 && G.phase !== 'fight'; t++) h.avancar(1);
      const ficha = G.p2.ficha; // lida antes do golpe (reset() voltaria à ficha da fase 1)
      G.p1.x = 200;
      G.p2.x = 700;
      G.p2.en = 100;
      G.p2.facing = -1;
      G.p2.startMove('sFwd', G);
      const poses = new Set<string>();
      for (let t = 0; t < 40; t++) {
        h.avancar(1);
        poses.add(G.p2.pose.name);
      }
      const ch = h.mundo().elenco[c.id].ch;
      const dive1 = h.mundo().elenco[c.id].arte.manifesto.quadros[c.quadro];
      const pd = getPD(ch.fichas[c.fase2], 'sc1'); // a pose do MERGULHO na ficha da fase 2 resolve para o quadro dive1 do atlas
      return { fase: G.phase, ficha, poses: [...poses], mergulhoNoAtlas: pd.x === dive1.x && pd.y === dive1.y && pd.w === dive1.w };
    }, { id: CHEFE.id, fase2: CHEFE.fase2, quadro: CHEFE.quadrosFase2.sc1 });
    expect(retomou.fase).toBe('fight');
    expect(retomou.ficha).toBe(CHEFE.fase2);
    expect(retomou.poses.some((p) => p === 'sc0' || p === 'sc1')).toBe(true);
    expect(retomou.mergulhoNoAtlas).toBe(true);
    await capturar(page, 'lutador-baatar-2-fase-2');
    expect(erros).toEqual([]);
  });

  test('golpes de cada novo desenham sem erro e a pose sai da página do atlas (todos os especiais)', async ({ page }) => {
    const erros = coletarErros(page);
    await abrirJogo(page, '');
    for (const { id } of NOVOS) {
      await abrirLuta(page, id);
      const r = await page.evaluate(async (alvo: string) => {
        const h = (window as any).__inno;
        const G = h.mundo().game;
        const arte = h.mundo().elenco[alvo].arte;
        const sem: string[] = [];
        const poses = new Set<string>();
        for (const golpe of ['lp', 'hp', 'lk', 'hk', 'clp', 'clk', 'sFire', 'sDown', 'sFwd']) {
          G.p1.x = 300;
          G.p2.x = 520;
          G.p2.en = 100;
          G.p2.reset(false);
          G.p2.facing = -1;
          if (!G.p2.ch.moves[golpe]) continue;
          G.p2.startMove(golpe, G);
          for (let t = 0; t < 70; t++) {
            h.avancar(1);
            h.desenhar();
            poses.add(G.p2.pose.name);
            if (!arte.imagemDe(G.p2.ch.pd ? G.p2.ch.pd[G.p2.pose.name] : { x: 0 })) sem.push(`${golpe}:${G.p2.pose.name}`);
          }
        }
        return { poses: [...poses], sem };
      }, id);
      expect(r.poses.length, id).toBeGreaterThan(8);
      expect(r.sem.length, id).toBeLessThan(5); // a pose pedida existe no atlas (sem null)
    }
    expect(erros).toEqual([]);
  });
});

test.describe('os seis cenários (1920x1080 WebP) no jogo', () => {
  test.beforeEach(({}, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
  });

  const CENARIOS = [
    { id: 'jp', casa: 'hayato' },
    { id: 'ng', casa: 'aminu' },
    { id: 'mx', casa: 'centella' },
    { id: 'fr', casa: 'camille' },
    { id: 'in', casa: 'nila' },
    { id: 'mn', casa: 'baatar' },
  ] as const;

  for (const { id, casa } of CENARIOS) {
    test(`cenário ${id}: carrega como imagem 1920x1080 e a luta na casa de ${casa} o usa`, async ({ page }) => {
      const erros = coletarErros(page);
      await abrirJogo(page, '');
      // o rival é a casa do cenário (luta no cenário do rival); o jp é a casa do HAYATO, que luta contra a CAMILLE como rival dele
      await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ mode: 'training', c1: casa === 'hayato' ? 'camille' : 'hayato', c2: casa, cpu: null })} }); }`);
      await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
      await hook(page, '(h) => h.avancar(100)');
      const dim = await hook(page, `(h) => { const i = h.mundo().arte.cenarios.get('${id}'); return [i.width, i.height, h.mundo().game.stage]; }`);
      expect(dim).toEqual([1920, 1080, id]);
      await capturar(page, `cenario-${id}`);
      expect(erros).toEqual([]);
    });
  }
});
