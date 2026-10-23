/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { SEM_PROVOCACAO } from './_luta';

/*
 * V2-3d (FILME DO ESPECIAL na UI, spec §3.5/§9): medido no navegador, pelo gancho de desenvolvimento `?filme=<lutador>:<golpe>` (um evento `filme` falso: o filme toca sem
 * depender do motor). A lógica com o motor de verdade está em tests/unit/{filme-ui,filme-cena}.test.ts; aqui se prova o que só o navegador prova: os 33 tocam sem erro
 * de página, o último quadro desenhado bate com o estado da luta, a cena não chama o motor, a tecla de ataque pula só a partir do tick 10 e o desenho do filme não custa
 * mais que o do jogo normal. Capturas: só com SALVAR_CAPTURAS=<pasta> (nunca grava por padrão).
 */

test.describe.configure({ timeout: 240_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

/** Os 33 especiais com filme (31 + SELO MAIOR e DECRETO do ZENON): lutador, ficha (null = base) e golpe. Espelha `src/data/filmes.ts`. */
const FILMES: ReadonlyArray<readonly [string, string | null, string]> = [
  ['hayato', null, 'sFire'], ['hayato', null, 'sDown'], ['hayato', null, 'sFwd'],
  ['wei-long', null, 'sFire'], ['wei-long', null, 'sDown'], ['wei-long', null, 'sFwd'],
  ['min-ji', null, 'sFire'], ['min-ji', null, 'sDown'], ['min-ji', null, 'sFwd'],
  ['caio', null, 'sFire'], ['caio', null, 'sDown'], ['caio', null, 'sFwd'],
  ['aminu', null, 'sFire'], ['aminu', null, 'sDown'], ['aminu', null, 'sFwd'],
  ['centella', null, 'sFire'], ['centella', null, 'sDown'], ['centella', null, 'sFwd'],
  ['camille', null, 'sResp'], ['camille', null, 'sDown'], ['camille', null, 'sFwd'],
  ['nila', null, 'sFire'], ['nila', null, 'sFwd'], ['nila', 'sarpa', 'sFire'], ['nila', 'sarpa', 'sFwd'],
  ['baatar', null, 'sFire'], ['baatar', null, 'sDown'], ['baatar', null, 'sFwd'],
  ['zenon', null, 'sFire'], ['zenon', null, 'sDown'], ['zenon', null, 'sFwd'],
  ['zenon', 'chefe2', 'sFire'], ['zenon', 'chefe2', 'sFwd'],
];

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

async function abrir(page: Page): Promise<void> {
  await page.goto('/?seed=7&manual=1&fluidez=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

/**
 * Abre uma luta com o gancho `?filme=` apontando para o golpe (a URL muda sem recarregar: a cena lê `location.search` a cada `enter`) e anda até o filme abrir.
 * A ficha, se houver, é posta no P1 ainda na `intro`, antes de o gancho disparar no 1º tick da fase `fight`.
 */
async function abrirFilme(page: Page, lutador: string, ficha: string | null, golpe: string, preferencia: 'completa' | 'curta' = 'completa', mode = 'versus'): Promise<void> {
  const rival = lutador === 'caio' ? 'hayato' : 'caio';
  await page.evaluate((q) => history.replaceState(null, '', `/?seed=7&manual=1&fluidez=1&expansao=1&filme=${q}`), `${lutador}:${golpe}`);
  await hook(
    page,
    `(h) => {
      h.persist.settings.cinematica = ${JSON.stringify(preferencia)};
      h.ui.fade = 0; h.ui.fadeDir = 0;
      h.ui.set('fight', { cfg: { mode: ${JSON.stringify(mode)}, c1: ${JSON.stringify(lutador)}, c2: ${JSON.stringify(rival)}, cpu: null, esquiva: true } });
      (${SEM_PROVOCACAO})(h);
      ${ficha ? `h.mundo().game.p1.trocarFicha(${JSON.stringify(ficha)});` : ''}
    }`,
  );
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 400; i++) {
    if (await hook(page, '(h) => { h.avancar(1); return h.ui.scene.filme.ativo; }')) return;
  }
  throw new Error(`${lutador}/${ficha}/${golpe}: o filme não abriu`);
}

/** O estado do filme e a luta: posições da vista do filme x as do motor (último quadro), vida e soma dos números. */
const LER = `(h) => {
  const s = h.ui.scene; const g = h.mundo().game; const f = s.filme;
  const v = f.vista(g, h.mundo().elenco);
  const ev = f.estado;
  const pos = (i) => ({ x: v.fighters[i].x, y: v.fighters[i].y, facing: v.fighters[i].facing, gx: g.fighters[i].x, gy: g.fighters[i].y, gf: g.fighters[i].facing, hp: v.fighters[i].hp, ghp: g.fighters[i].hp, pose: v.fighters[i].pose.name, gpose: g.fighters[i].pose.name });
  return { ativo: f.ativo, estado: ev, p: [pos(0), pos(1)], soma: f.somaMostrada, tick: g.tick, camZ: v.cam.z, gcamZ: g.cam.z };
}`;

test.describe('FILME do especial (V2-3d)', () => {
  test('os 33 especiais tocam pelo gancho: sem erro de página, o filme fecha e o último quadro bate com a luta', async ({ page }) => {
    const erros = coletarErros(page);
    await abrir(page);
    const pasta = process.env['SALVAR_CAPTURAS'] ? `${process.env['SALVAR_CAPTURAS']}/filme` : null;
    if (pasta) mkdirSync(pasta, { recursive: true });
    for (const [lutador, ficha, golpe] of FILMES) {
      const rot = `${lutador}${ficha ? `/${ficha}` : ''} ${golpe}`;
      await abrirFilme(page, lutador, ficha, golpe);
      const tickDoContato: number = await hook(page, '(h) => h.mundo().game.tick');
      const duracao: number = await hook(page, '(h) => h.ui.scene.filme.duracao');
      expect(duracao, rot).toBeGreaterThanOrEqual(45);
      // o meio do filme: a cena não anda o motor
      await hook(page, `(h) => h.avancar(${Math.floor(duracao / 2)})`);
      expect(await hook(page, '(h) => h.mundo().game.tick'), `${rot}: o motor não anda durante o filme`).toBe(tickDoContato);
      if (pasta) await page.locator('#jogo').screenshot({ path: `${pasta}/${lutador}-${ficha ?? 'base'}-${golpe}-meio.png` });
      // o último quadro desenhado
      await hook(page, `(h) => h.avancar(${duracao - Math.floor(duracao / 2) - 1})`);
      const u = await hook(page, LER);
      expect(u.ativo, rot).toBe(true);
      for (const i of [0, 1]) {
        expect(Math.abs(u.p[i].x - u.p[i].gx), `${rot}: x do lutador ${i}`).toBeLessThanOrEqual(1);
        expect(Math.abs(u.p[i].y - u.p[i].gy), `${rot}: y do lutador ${i}`).toBeLessThanOrEqual(1);
        expect(u.p[i].facing, `${rot}: olhar do lutador ${i}`).toBe(u.p[i].gf);
        // a pose do atacante no último quadro é a do motor (`$motor`); a do rival é `koFloor` do roteiro (o gancho falso não roda o motor, então a pose guardada dele é velha)
        if (i === 0) expect(u.p[i].pose, `${rot}: a pose do último quadro é a do motor`).toBe(u.p[i].gpose);
        expect(u.p[i].hp, `${rot}: a barra termina em hp`).toBeCloseTo(u.p[i].ghp, 9);
      }
      expect(u.camZ, `${rot}: a câmera volta à da luta`).toBeCloseTo(u.gcamZ, 9);
      expect(u.soma, `${rot}: soma dos números`).toBeGreaterThan(0);
      await hook(page, '(h) => { h.desenhar(1); return 0; }');
      if (pasta) await page.locator('#jogo').screenshot({ path: `${pasta}/${lutador}-${ficha ?? 'base'}-${golpe}-fim.png` });
      await hook(page, '(h) => h.avancar(1)');
      expect(await hook(page, '(h) => h.ui.scene.filme.ativo'), `${rot}: fechou`).toBe(false);
    }
    expect(erros).toEqual([]);
  });

  test('o filme desenha: o canvas muda entre as batidas e o HUD desce a barra do rival até o hp do motor', async ({ page }) => {
    await abrir(page);
    await abrirFilme(page, 'hayato', null, 'sFwd');
    const pixels = (): Promise<string> =>
      hook(page, `(h) => { h.desenhar(1); const c = document.getElementById('jogo'); return c.toDataURL('image/png').length + ':' + c.toDataURL('image/png').slice(-400); }`);
    const a = await pixels();
    await hook(page, '(h) => h.avancar(30)');
    const b = await pixels();
    expect(b).not.toBe(a);
    const hpInicio: number = await hook(page, '(h) => h.ui.scene.filme.vista(h.mundo().game, h.mundo().elenco).fighters[1].hp');
    const hpMotor: number = await hook(page, '(h) => h.mundo().game.fighters[1].hp');
    expect(hpInicio, 'no meio do filme a barra ainda não chegou ao hp do motor').toBeGreaterThan(hpMotor);
    await hook(page, '(h) => h.avancar(34)');
    const hpFim: number = await hook(page, '(h) => h.ui.scene.filme.vista(h.mundo().game, h.mundo().elenco).fighters[1].hp');
    expect(hpFim).toBeCloseTo(hpMotor, 9);
  });

  test('pular com a tecla: antes do tick 10 não vale; as setas nunca; depois, a luta volta em no máximo 6 quadros', async ({ page }) => {
    await abrir(page);
    for (const tecla of ['z', 'x', 'c', 'v', 'b']) {
      await abrirFilme(page, 'hayato', null, 'sFwd');
      // antes do tick 10: a tecla é ignorada
      await page.keyboard.down(tecla);
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up(tecla);
      expect(await hook(page, '(h) => h.ui.scene.filme.estado.pulouEm'), `${tecla}: antes do tick 10`).toBeNull();
      await hook(page, '(h) => h.avancar(11)');
      await page.keyboard.press('ArrowLeft');
      await hook(page, '(h) => h.avancar(3)');
      expect(await hook(page, '(h) => h.ui.scene.filme.ativo'), `${tecla}: seta não pula`).toBe(true);
      await page.keyboard.down(tecla);
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up(tecla);
      let n = 0;
      while (await hook(page, '(h) => h.ui.scene.filme.ativo')) {
        await hook(page, '(h) => h.avancar(1)');
        if (++n > 20) break;
      }
      expect(n, tecla).toBeLessThanOrEqual(6);
    }
  });

  test('CURTA: 30 quadros no treino e com a cinemática CURTA; COMPLETA em versus', async ({ page }) => {
    await abrir(page);
    await abrirFilme(page, 'hayato', null, 'sFwd', 'completa', 'versus');
    expect(await hook(page, '(h) => h.ui.scene.filme.duracao')).toBe(66);
    await abrirFilme(page, 'hayato', null, 'sFwd', 'curta', 'versus');
    expect(await hook(page, '(h) => h.ui.scene.filme.duracao')).toBe(30);
    await abrirFilme(page, 'hayato', null, 'sFwd', 'completa', 'training');
    expect(await hook(page, '(h) => h.ui.scene.filme.duracao')).toBe(30);
  });

  test('desempenho: desenhar um quadro do filme não custa mais que o dobro de um quadro normal da luta (+ 4 ms)', async ({ page }) => {
    await abrir(page);
    const medir = `(h, n) => { const t = []; for (let i = 0; i < n; i++) { const a = performance.now(); h.desenhar(1); t.push(performance.now() - a); } t.sort((x, y) => x - y); return { mediana: t[Math.floor(n / 2)], p95: t[Math.floor(n * 0.95)] }; }`;
    await abrirFilme(page, 'baatar', null, 'sFire');
    const filme = await page.evaluate(`(() => { const h = window.__inno; h.avancar(30); return (${medir})(h, 60); })()`);
    await hook(page, '(h) => h.avancar(40)');
    await hook(page, '(h) => h.avancar(10)');
    const normal = await page.evaluate(`(() => { const h = window.__inno; return (${medir})(h, 60); })()`);
    test.info().annotations.push({ type: 'quadro (ms)', description: `filme ${JSON.stringify(filme)} x normal ${JSON.stringify(normal)}` });
    expect((filme as any).mediana).toBeLessThanOrEqual((normal as any).mediana * 2 + 4);
  });
});
