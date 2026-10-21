/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';
import { mkdirSync } from 'node:fs';

/*
 * L2 (CINEMÁTICA DO ESPECIAL): medida no navegador — a luta congela 48 ticks por padrão (a CENA não chama game.update; o motor não congela),
 * a tela escurece, a tarja aparece com o nome do golpe na cor do lutador, os acertos mostram o dano e o contador só quando o rival NÃO defendeu,
 * qualquer botão de ataque pula, a opção das Opções vale e persiste. As capturas dos 28 especiais (desktop) e dos 9 lutadores (celular deitado)
 * vão para arte-fonte/capturas/. A lógica está provada em tests/unit/{cinematica,sessao-especial,cena-luta-cinematica}.test.ts.
 */

test.describe.configure({ timeout: 180_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const CAPTURAS = 'arte-fonte/capturas';

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

/** Espia o canvas: guarda cada texto desenhado (fillText) e qualquer uso de shadowBlur/filter (proibidos na cinemática). */
async function espiarCanvas(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as any;
    w.__textos = [] as string[];
    w.__proibido = [] as string[];
    const proto = CanvasRenderingContext2D.prototype as any;
    const fill = proto.fillText;
    proto.fillText = function (s: string, ...r: unknown[]) {
      w.__textos.push(String(s));
      return fill.call(this, s, ...r);
    };
    for (const prop of ['shadowBlur', 'filter']) {
      const d = Object.getOwnPropertyDescriptor(proto, prop);
      if (!d?.set) continue;
      Object.defineProperty(proto, prop, {
        get: d.get as () => unknown,
        set(v: unknown) {
          if (v !== 0 && v !== 'none') w.__proibido.push(`${prop}=${String(v)}`);
          d.set!.call(this, v);
        },
      });
    }
  });
}

async function abrir(page: Page, query = '', viewport?: { width: number; height: number }): Promise<void> {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(`/?seed=7&manual=1&expansao=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

async function abrirLuta(page: Page, cfg: Record<string, unknown>): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify(cfg)} }); (${SEM_PROVOCACAO})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 200; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
}

/** Luminância média (0..255) de uma região em coordenadas LÓGICAS 960x540, lida do canvas depois de desenhar. */
const LUM = `(h, x0, y0, x1, y1) => {
  h.desenhar();
  const c = document.getElementById('jogo'); const k = c.width / 960;
  const d = c.getContext('2d').getImageData(Math.round(x0 * k), Math.round(y0 * k), Math.round((x1 - x0) * k), Math.round((y1 - y0) * k)).data;
  let s = 0, n = 0; for (let i = 0; i < d.length; i += 16) { s += 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]; n++; } return s / n; }`;
/** Quantos pixels do canvas inteiro estão a no máximo `tol` (distância RGB) da cor `alvo`. */
const PERTO = `(h, alvo, tol) => {
  h.desenhar();
  const c = document.getElementById('jogo'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
  for (let i = 0; i < d.length; i += 4) { const dr = d[i] - alvo[0], dg = d[i + 1] - alvo[1], db = d[i + 2] - alvo[2]; if (dr * dr + dg * dg + db * db <= tol * tol) n++; } return n; }`;

const rgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Onde o fundo do cenário é "chão" nas duas pontas, longe dos lutadores e da tarja (média das duas). */
async function luminanciaDoChao(page: Page): Promise<number> {
  const a: number = await page.evaluate(`(() => { const h = window.__inno; return (${LUM})(h, 0, 440, 110, 495); })()`);
  const b: number = await page.evaluate(`(() => { const h = window.__inno; return (${LUM})(h, 850, 440, 960, 495); })()`);
  return (a + b) / 2;
}

async function prepararDuelo(page: Page, c1: string, c2: string, ficha: string | null = null, cfg: Record<string, unknown> = {}): Promise<void> {
  await abrirLuta(page, { mode: 'versus', c1, c2, cpu: null, esquiva: true, ...cfg });
  await hook(page, `(h) => { const g = h.mundo().game; g.p1.x = 300; g.p2.x = 660; g.p1.en = 100; g.p2.en = 100; ${ficha ? `g.p1.trocarFicha(${JSON.stringify(ficha)});` : ''} }`);
}

/** Dispara o especial `golpe` do P1 (como a tecla faria) e dá o 1º update, que emite o evento `special`. */
async function dispararEspecial(page: Page, golpe: string): Promise<void> {
  await hook(page, `(h) => { const g = h.mundo().game; g.p1.startMove(${JSON.stringify(golpe)}, g); h.avancar(1); }`);
}

const cine = (page: Page): Promise<{ ativa: boolean; estado: { modo: string; tick: number; lutador: number; golpe: string } | null }> =>
  hook(page, '(h) => ({ ativa: h.ui.scene.cine.ativa, estado: h.ui.scene.cine.estado })');

/** Anda a cena (ui.update) e conta os updates em que a LUTA ficou parada enquanto a cinemática rodava. */
async function contarCongelamento(page: Page, limite = 200): Promise<{ parados: number; motorAndou: boolean }> {
  return hook(
    page,
    `(h) => {
      const g = h.mundo().game; const c = h.ui.scene.cine; const tick0 = g.tick; let parados = 0, n = 0;
      while (c.ativa && n++ < ${limite}) { h.avancar(1); if (g.tick === tick0) parados++; }
      return { parados, motorAndou: g.tick !== tick0 };
    }`,
  );
}

test.describe('cinemática do especial (padrão: COMPLETA, 48 ticks)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'medidas em desktop; celular tem o bloco próprio abaixo'));

  test('tecla B de verdade: 48 ticks parados, tela escurece >= 50%, tarja na cor do HAYATO com o nome RAIJIN-DAN; depois a vinheta da sessão', async ({ page }, info) => {
    mkdirSync(CAPTURAS, { recursive: true });
    const erros = coletarErros(page);
    await espiarCanvas(page);
    await abrir(page);
    await prepararDuelo(page, 'hayato', 'caio');
    const antes = await luminanciaDoChao(page);
    expect(antes).toBeGreaterThan(20); // o chão não é preto (senão a razão não diz nada)
    const tick0 = await hook(page, '(h) => h.mundo().game.tick');
    await page.keyboard.down('b');
    await hook(page, '(h) => h.avancar(1)');
    await page.keyboard.up('b');
    const c0 = await cine(page);
    expect(c0.ativa).toBe(true);
    expect(c0.estado).toMatchObject({ modo: 'completa', lutador: 0, golpe: 'sFire' });
    const tickNoEvento = await hook(page, '(h) => h.mundo().game.tick');
    expect(tickNoEvento).toBe(tick0 + 1);

    // até o quadro 20 da cinemática (o update do evento abre a cinemática no tick 0; cada update seguinte avança 1)
    await hook(page, '(h) => h.avancar(20)');
    expect((await cine(page)).estado?.tick).toBe(20);
    const noQuadro20 = await luminanciaDoChao(page);
    expect(noQuadro20 / antes, `escurecimento: ${antes.toFixed(1)} -> ${noQuadro20.toFixed(1)}`).toBeLessThanOrEqual(0.5);
    // a tarja: a borda de 3 px e o fundo têm a cor do lutador (fire[0] = #6fe0ff)
    const perto = await hook(page, `(h) => (${PERTO})(h, [111, 224, 255], 40)`);
    expect(perto, 'pixels da cor do HAYATO').toBeGreaterThan(800);
    // o nome do golpe foi desenhado
    expect(await page.evaluate(() => (window as any).__textos)).toContain('RAIJIN-DAN');
    await page.locator('canvas#jogo').screenshot({ path: `${CAPTURAS}/cinematica-hayato-raijin-dan-quadro20-desktop.png` });

    // resto da cinemática: o motor segue parado até o 48º
    const resto = await contarCongelamento(page);
    expect(resto.parados + 20).toBe(48); // 48 updates parados ao todo depois do evento
    expect(resto.motorAndou).toBe(false);
    expect((await cine(page)).ativa).toBe(false);
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBe(tickNoEvento);
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBe(tickNoEvento + 1);

    // a sessão: vinheta de 20% no lugar do escurecimento forte (a luta segue com o projétil no ar)
    const sessao = await luminanciaDoChao(page);
    expect(sessao / antes, 'vinheta da sessão').toBeGreaterThan(0.6);
    expect(sessao / antes).toBeLessThan(0.95);
    // proibidos: nenhum shadowBlur/filter em todo o caminho
    expect(await page.evaluate(() => (window as any).__proibido)).toEqual([]);
    expect(erros).toEqual([]);
    info.annotations.push({ type: 'medido', description: `chão ${antes.toFixed(1)} -> ${noQuadro20.toFixed(1)} (x${(noQuadro20 / antes).toFixed(2)}) -> sessão ${sessao.toFixed(1)}; px da cor ${perto}` });
  });

  test('cada especial repete a cinemática COMPLETA (não só a 1ª vez)', async ({ page }) => {
    await abrir(page);
    await prepararDuelo(page, 'hayato', 'caio');
    for (let i = 0; i < 2; i++) {
      await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; g.p1.reset(false); g.p1.x = 300; g.p2.x = 800; }');
      await dispararEspecial(page, 'sFire');
      const c = await cine(page);
      expect(c.estado?.modo, `${i + 1}ª vez`).toBe('completa');
      const r = await contarCongelamento(page);
      expect(r.parados, `${i + 1}ª vez`).toBe(48);
    }
  });

  test('qualquer botão de ataque pula: a luta volta em no máximo 8 quadros; as setas não pulam', async ({ page }) => {
    await abrir(page);
    for (const tecla of ['z', 'x', 'c', 'v', 'b']) {
      await prepararDuelo(page, 'hayato', 'caio');
      await dispararEspecial(page, 'sFire');
      await hook(page, '(h) => h.avancar(12)');
      expect((await cine(page)).ativa, tecla).toBe(true);
      await page.keyboard.press('ArrowLeft'); // direção: nada acontece
      await hook(page, '(h) => h.avancar(3)');
      expect((await cine(page)).ativa, `${tecla}: seta não pula`).toBe(true);
      await page.keyboard.down(tecla);
      let n = 0;
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up(tecla);
      while ((await cine(page)).ativa && n < 20) {
        await hook(page, '(h) => h.avancar(1)');
        n++;
      }
      expect(n + 1, tecla).toBeLessThanOrEqual(8);
    }
  });

  test('acertos: o dano e o contador aparecem SÓ se o rival não defendeu; defendendo, nenhum número e nenhum contador (a animação sai igual)', async ({ page }) => {
    await espiarCanvas(page);
    await abrir(page);
    const rodar = async (defende: boolean) => {
      await prepararDuelo(page, 'hayato', 'caio');
      await hook(page, '(h) => { const g = h.mundo().game; g.p1.x = 300; g.p2.x = 520; g.p2.hp = g.p2.maxHp; }');
      await page.evaluate(() => ((window as any).__textos.length = 0));
      if (defende) await page.keyboard.down('d'); // P2 olha para a esquerda: "trás" é a direita = bloqueia
      await dispararEspecial(page, 'sFire');
      const animou = (await cine(page)).ativa;
      // anda até o projétil chegar (acerto ou bloqueio) e a sessão fechar
      const resultado = await hook(
        page,
        `(h) => {
          const g = h.mundo().game; const s = h.ui.scene.sessao; let acertou = false, bloqueou = false, maxHits = 0, numeros = 0, total = 0;
          for (let i = 0; i < 260; i++) {
            h.avancar(1);
            h.desenhar();
            for (const e of g.events) { if (e.tipo === 'hit' && e.especial) acertou = true; if (e.tipo === 'block') bloqueou = true; }
            const l = s.leitura(0); if (l) { maxHits = Math.max(maxHits, l.hits); numeros = Math.max(numeros, l.numeros.length); total = Math.max(total, l.total); }
            if (!h.ui.scene.cine.ativa && !l && (acertou || bloqueou) && i > 20) break;
          }
          return { acertou, bloqueou, maxHits, numeros, total, hpPerdido: g.p2.maxHp - g.p2.hp };
        }`,
      );
      if (defende) await page.keyboard.up('d');
      const textos: string[] = await page.evaluate(() => (window as any).__textos);
      return { animou, ...resultado, danoNaTela: textos.filter((t) => /^-\d+$/.test(t)), contadorNaTela: textos.filter((t) => /HIT/.test(t)), totalNaTela: textos.filter((t) => /^TOTAL/.test(t)) };
    };
    const acerto = await rodar(false);
    expect(acerto.animou).toBe(true);
    expect(acerto.acertou).toBe(true);
    expect(acerto.maxHits).toBeGreaterThanOrEqual(1);
    expect(acerto.numeros).toBeGreaterThanOrEqual(1);
    expect(acerto.danoNaTela.length).toBeGreaterThan(0);
    expect(acerto.contadorNaTela.length).toBeGreaterThan(0);
    expect(acerto.totalNaTela.length).toBeGreaterThan(0);
    expect(acerto.total).toBe(acerto.hpPerdido); // o TOTAL é o hp que o rival perdeu
    const bloqueio = await rodar(true);
    expect(bloqueio.animou, 'a animação premium sai igual na defesa').toBe(true);
    expect(bloqueio.bloqueou).toBe(true);
    expect(bloqueio.acertou).toBe(false);
    expect(bloqueio.maxHits).toBe(0);
    expect(bloqueio.numeros).toBe(0);
    expect(bloqueio.danoNaTela, 'nenhum número no bloqueio').toEqual([]);
    expect(bloqueio.contadorNaTela, 'nenhum contador no bloqueio').toEqual([]);
    expect(bloqueio.totalNaTela).toEqual([]);
  });

  test('a PARADE só abre a cinemática no SUCESSO (parry), nunca ao começar; o FOUETTÉ segue a sessão', async ({ page }) => {
    await abrir(page);
    await prepararDuelo(page, 'camille', 'hayato');
    // P2 (HAYATO) soca colado enquanto a CAMILLE está na PARADE
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.x = 400; g.p2.x = 470; g.p1.startMove("sFire", g); }');
    const r = await hook(
      page,
      `(h) => {
        const g = h.mundo().game; const c = h.ui.scene.cine; let abriuNoSpecial = false, abriuNoParry = false, tickAbertura = -1; const vistos = [];
        for (let i = 0; i < 60; i++) {
          if (i === 4) g.p2.startMove('hp', g);
          const antes = c.ativa; h.avancar(1);
          const tipos = g.events.map((e) => e.tipo);
          if (tipos.includes('special') && c.ativa && !tipos.includes('parry')) abriuNoSpecial = true;
          if (tipos.includes('parry')) { abriuNoParry = c.ativa && !antes; tickAbertura = i; vistos.push(c.estado && c.estado.golpe); break; }
        }
        return { abriuNoSpecial, abriuNoParry, tickAbertura, vistos };
      }`,
    );
    expect(r.abriuNoSpecial).toBe(false);
    expect(r.abriuNoParry, JSON.stringify(r)).toBe(true);
    expect(r.vistos).toEqual(['sFire']);
    const sessao = await hook(page, '(h) => h.ui.scene.sessao.leitura(0) ?? h.ui.scene.sessao.leitura(1)');
    expect(sessao).toMatchObject({ aberta: true, golpe: 'sFire' });
  });

  test('GARKUWA: a cinemática abre no clash do escudo com o projétil, não ao começar o golpe', async ({ page }) => {
    await abrir(page);
    await prepararDuelo(page, 'aminu', 'hayato');
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.x = 400; g.p2.x = 700; }');
    const r = await hook(
      page,
      `(h) => {
        const g = h.mundo().game; const c = h.ui.scene.cine;
        // 1) o HAYATO lança o projétil dele (a cinemática DELE abre e passa); 2) com o projétil no ar, o AMINU levanta o escudo
        g.p2.startMove('sFire', g); h.avancar(1);
        let n = 0; while (c.ativa && n++ < 200) h.avancar(1);
        n = 0; while (g.projectiles.length === 0 && n++ < 80) h.avancar(1);
        const projetilNoAr = g.projectiles.length > 0;
        g.p1.startMove('sDown', g);
        let abriuCedo = false, abriuNoClash = false, golpe = null;
        for (let i = 0; i < 120; i++) {
          const antes = c.ativa; h.avancar(1);
          if (c.ativa && !antes) {
            if (g.events.some((e) => e.tipo === 'clash' && e.lutador === 0)) { abriuNoClash = true; golpe = c.estado.golpe; } else abriuCedo = true;
            break;
          }
        }
        return { projetilNoAr, abriuCedo, abriuNoClash, golpe };
      }`,
    );
    expect(r.projetilNoAr).toBe(true);
    expect(r, JSON.stringify(r)).toMatchObject({ abriuCedo: false, abriuNoClash: true, golpe: 'sDown' });
  });
});

test.describe('opção CINEMÁTICA DO ESPECIAL', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'só no desktop'));

  async function irParaAsOpcoes(page: Page): Promise<void> {
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('options', { from: 'menu' }); }`);
  }
  const linha = (page: Page): Promise<number> => hook(page, `(h) => h.ui.scene.m.items.findIndex((i) => i.label === 'CINEMÁTICA DO ESPECIAL')`);

  test('mostra a linha, troca pelas setas, grava e persiste (recarregar continua DESLIGADA e a luta não congela)', async ({ page }) => {
    await abrir(page);
    await irParaAsOpcoes(page);
    const i = await linha(page);
    expect(i).toBeGreaterThan(-1);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('COMPLETA');
    await hook(page, `(h) => { h.ui.scene.m.sel = ${i}; }`);
    await page.keyboard.press('ArrowRight'); // COMPLETA -> CURTA
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('CURTA');
    await page.keyboard.press('ArrowRight');
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('DESLIGADA');
    expect(await hook(page, '(h) => h.persist.settings.cinematica')).toBe('desligada');
    // a tela cabe: a última linha termina acima da dica (y < 530)
    await hook(page, '(h) => h.desenhar()');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await hook(page, '(h) => h.persist.settings.cinematica')).toBe('desligada');
    await prepararDuelo(page, 'hayato', 'caio');
    await dispararEspecial(page, 'sFire');
    expect((await cine(page)).ativa).toBe(false);
    const t = await hook(page, '(h) => { const t0 = h.mundo().game.tick; h.avancar(1); return h.mundo().game.tick - t0; }');
    expect(t).toBe(1);
  });

  test('CURTA: 20 ticks, sem tarja; RESTAURAR PADRÕES apaga a preferência (volta COMPLETA)', async ({ page }) => {
    await abrir(page);
    await hook(page, `(h) => { h.persist.settings.cinematica = 'curta'; }`);
    await prepararDuelo(page, 'hayato', 'caio');
    await dispararEspecial(page, 'sFire');
    expect((await cine(page)).estado?.modo).toBe('curta');
    const r = await contarCongelamento(page);
    expect(r.parados).toBe(20);
    await irParaAsOpcoes(page);
    const i = await linha(page);
    const iRest = await hook(page, `(h) => h.ui.scene.m.items.findIndex((x) => x.label === 'RESTAURAR PADRÕES')`);
    await hook(page, `(h) => { h.ui.scene.m.sel = ${iRest}; }`);
    await page.keyboard.press('Enter');
    expect(await hook(page, '(h) => h.persist.settings.cinematica')).toBeUndefined();
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('COMPLETA');
  });

  test('prefers-reduced-motion sem preferência salva = CURTA; com COMPLETA salva continua COMPLETA', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrir(page);
    await irParaAsOpcoes(page);
    const i = await linha(page);
    expect(await hook(page, `(h) => h.ui.scene.m.items[${i}].value()`)).toBe('CURTA');
    await prepararDuelo(page, 'hayato', 'caio');
    await dispararEspecial(page, 'sFire');
    expect((await cine(page)).estado?.modo).toBe('curta');
    await hook(page, `(h) => { h.persist.settings.cinematica = 'completa'; }`);
    await prepararDuelo(page, 'hayato', 'caio');
    await dispararEspecial(page, 'sFire');
    expect((await cine(page)).estado?.modo).toBe('completa');
  });

  test('?expansao=4 (fidelidade dos 4 originais): sem a linha nas Opções e sem cinemática, qualquer que seja a preferência', async ({ page }) => {
    await page.goto('/?seed=7&manual=1&expansao=4');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await irParaAsOpcoes(page);
    expect(await linha(page)).toBe(-1);
    await hook(page, `(h) => { h.persist.settings.cinematica = 'completa'; }`);
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null });
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; g.p1.startMove("sFire", g); h.avancar(1); }');
    expect((await cine(page)).ativa).toBe(false);
  });
});

/** Os 28 especiais: cada um congela 48 ticks, escurece, mostra a tarja na cor do lutador e o nome do golpe. Capturas para o Apolo. */
test.describe('os 28 especiais, um a um (desktop)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'só no desktop'));

  const casos: Array<{ id: string; ficha: string | null; golpe: string; rival: string }> = [];
  for (const id of ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar']) {
    for (const golpe of ['sFire', 'sDown', 'sFwd']) casos.push({ id, ficha: null, golpe, rival: id === 'hayato' ? 'caio' : 'hayato' });
  }
  // VADIVU (nila sDown, custo 0) não tem cinemática; PARADE e GARKUWA abrem só no sucesso (testes próprios acima); NILA em SARPA
  const semCinemaPeloInicio = new Set(['nila.sDown', 'camille.sFire', 'aminu.sDown']);
  const lista = [
    ...casos.filter((c) => !semCinemaPeloInicio.has(`${c.id}.${c.golpe}`)),
    { id: 'nila', ficha: 'sarpa', golpe: 'sFire', rival: 'hayato' },
    { id: 'nila', ficha: 'sarpa', golpe: 'sFwd', rival: 'hayato' },
  ];

  test('tarja, nome, escurecimento e 48 ticks em cada especial (tick 20 capturado)', async ({ page }, info) => {
    mkdirSync(CAPTURAS, { recursive: true });
    const erros = coletarErros(page);
    await espiarCanvas(page);
    await abrir(page);
    expect(lista).toHaveLength(26); // 28 especiais: 24 abrem no início do golpe + 2 (NILA em SARPA); PARADE e GARKUWA têm testes próprios
    const resumo: string[] = [];
    for (const c of lista) {
      const rotulo = `${c.id}${c.ficha ? '.' + c.ficha : ''}.${c.golpe}`;
      await prepararDuelo(page, c.id, c.rival, c.ficha);
      const antes = await luminanciaDoChao(page);
      const ident = await page.evaluate(
        async ([id, ficha, golpe]) => {
          const url = '/src/render/identidade-especiais.ts';
          const m: any = await import(/* @vite-ignore */ url);
          const i = m.identidadeDe(id, ficha, golpe);
          const nome = (window as any).__inno.mundo().elenco[id].ch;
          return i ? { titulo: i.titulo, brilho: i.paleta.brilho } : { titulo: nome.moves[golpe].name, brilho: nome.fire[0] };
        },
        [c.id, c.ficha, c.golpe] as const,
      );
      await page.evaluate(() => ((window as any).__textos.length = 0));
      await dispararEspecial(page, c.golpe);
      expect((await cine(page)).ativa, `${rotulo}: abriu`).toBe(true);
      await hook(page, '(h) => h.avancar(20)');
      const q20 = await luminanciaDoChao(page);
      const alvo = rgb(ident.brilho);
      const perto: number = await hook(page, `(h) => (${PERTO})(h, ${JSON.stringify(alvo)}, 48)`);
      const textos: string[] = await page.evaluate(() => (window as any).__textos);
      expect(textos, `${rotulo}: nome do golpe`).toContain(ident.titulo);
      expect(q20 / antes, `${rotulo}: escurecimento ${antes.toFixed(0)} -> ${q20.toFixed(0)}`).toBeLessThanOrEqual(0.55);
      expect(perto, `${rotulo}: pixels de ${ident.brilho}`).toBeGreaterThan(600);
      await page.locator('canvas#jogo').screenshot({ path: `${CAPTURAS}/cinematica-${c.id}-${c.ficha ?? 'base'}-${c.golpe}-desktop.png` });
      const r = await contarCongelamento(page);
      expect(r.parados + 20, `${rotulo}: ticks parados`).toBe(48);
      expect(r.motorAndou, rotulo).toBe(false);
      resumo.push(`${rotulo}: x${(q20 / antes).toFixed(2)} px=${perto}`);
    }
    expect(await page.evaluate(() => (window as any).__proibido)).toEqual([]);
    expect(erros).toEqual([]);
    info.annotations.push({ type: 'medido', description: resumo.join(' | ') });
  });
});

test.describe('celular deitado', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'celular', 'só no celular'));

  test('os 9 lutadores: capturas da tarja em 915x412 e o desempenho dos quadros da cinemática (CPU 4x)', async ({ page }, info) => {
    mkdirSync(CAPTURAS, { recursive: true });
    const erros = coletarErros(page);
    await abrir(page, '', { width: 915, height: 412 });
    const cdp: CDPSession = await page.context().newCDPSession(page);
    const ids = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar'];
    for (const id of ids) {
      const golpe = id === 'camille' ? 'sDown' : 'sFire';
      await prepararDuelo(page, id, id === 'hayato' ? 'caio' : 'hayato');
      await dispararEspecial(page, golpe);
      expect((await cine(page)).ativa, id).toBe(true);
      await hook(page, '(h) => { h.avancar(20); h.desenhar(); }');
      const ocupa = await page.evaluate(() => {
        const c = document.getElementById('jogo')!.getBoundingClientRect();
        return { w: c.width, h: c.height };
      });
      expect(ocupa.w).toBeGreaterThan(600);
      await page.screenshot({ path: `${CAPTURAS}/cinematica-${id}-${golpe}-celular-915x412.png` });
    }

    // desempenho: CPU 4x, tempo de ui.update()+ui.draw() (com o canvas forçado a terminar), comparando quadros da cinemática com quadros normais
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
    const medir = () =>
      hook(
        page,
        `(h) => {
          const g = h.mundo().game; const c = document.getElementById('jogo').getContext('2d'); const t = [];
          for (let i = 0; i < 40; i++) {
            const t0 = performance.now(); h.avancar(1); h.desenhar(); c.getImageData(0, 0, 1, 1); t.push(performance.now() - t0);
          }
          t.sort((a, b) => a - b);
          return { mediana: t[20], p95: t[Math.floor(t.length * 0.95)], max: t[t.length - 1], cine: h.ui.scene.cine.ativa };
        }`,
      );
    await prepararDuelo(page, 'wei-long', 'hayato');
    await hook(page, '(h) => h.avancar(30)');
    const normal = await medir();
    await prepararDuelo(page, 'wei-long', 'hayato');
    await dispararEspecial(page, 'sFire');
    const comCine = await medir();
    await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
    info.annotations.push({ type: 'desempenho-cpu4x', description: `normal ${JSON.stringify(normal)} | cinemática ${JSON.stringify(comCine)}` });
    expect(comCine.cine).toBe(true);
    expect(erros).toEqual([]);
  });
});
