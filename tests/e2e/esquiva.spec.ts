/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { mkdirSync } from 'node:fs';

/*
 * L1 (ESQUIVA): a entrada de verdade (teclado N/O, L1/L2 do controle, botão ESQ do toque) chega ao motor, a direção vem de quem segura
 * frente/trás, o HUD mostra se há barra, o fantasma só vale na janela invulnerável e o botão ESQ cabe na casa reservada na E7a.
 * A lógica da esquiva (janelas, contragolpe, CPU) está provada em tests/unit/esquiva*.test.ts; aqui é o que só o navegador mostra.
 */

test.describe.configure({ timeout: 120_000 });

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

async function abrir(page: Page, query = '', viewport?: { width: number; height: number }): Promise<void> {
  if (viewport) await page.setViewportSize(viewport);
  await page.goto(`/?seed=3&manual=1&expansao=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

async function abrirLuta(page: Page, cfg: Record<string, unknown>): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify(cfg)} }); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
  for (let i = 0; i < 200; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
}

/** Versus HAYATO x WEI LONG, P1 em x=300 olhando para a direita, rival longe (700) e parado; barra do P1 em `en`. */
async function prepararDuelo(page: Page, en: number, cfgExtra: Record<string, unknown> = {}): Promise<void> {
  await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: true, ...cfgExtra });
  await hook(page, `(h) => { const g = h.mundo().game; g.p1.x = 300; g.p2.x = 760; g.p1.en = ${en}; g.p2.en = ${en}; g.p1.hp = g.p1.maxHp; g.p2.hp = g.p2.maxHp; }`);
}

type Tick = { estado: string; esquiva: number; invuln: number; x: number; en: number; pose: string };
const um = (page: Page): Promise<Tick> =>
  hook(
    page,
    `(h) => { h.entrada.consultarGamepads(); h.avancar(1); const f = h.mundo().game.p1; return { estado: f.state, esquiva: f.esquiva, invuln: f.invuln, x: f.x, en: f.en, pose: f.pose.name }; }`,
  );

/** Aperta N (e a direção, se houver), dá o 1º tick, solta tudo e devolve a trilha até o fim da esquiva. */
async function esquivar(page: Page, direcao: 'ArrowLeft' | 'ArrowRight' | null, tecla = 'n'): Promise<Tick[]> {
  if (direcao) await page.keyboard.down(direcao);
  await page.keyboard.down(tecla);
  const trilha: Tick[] = [await um(page)];
  await page.keyboard.up(tecla);
  for (let i = 0; i < 30; i++) trilha.push(await um(page));
  if (direcao) await page.keyboard.up(direcao);
  return trilha;
}

test.describe('esquiva pelo teclado de verdade', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'teclado: só no desktop'));

  test('N + ← recua, N + → avança, N sozinho recua; cada uma custa 20 e a janela invulnerável dura ~14 ticks', async ({ page }) => {
    const erros = coletarErros(page);
    await abrir(page);
    const casos: Array<{ nome: string; dir: 'ArrowLeft' | 'ArrowRight' | null; sentido: 1 | -1; dist: number }> = [
      { nome: 'trás', dir: 'ArrowLeft', sentido: -1, dist: 120 },
      { nome: 'frente', dir: 'ArrowRight', sentido: 1, dist: 150 },
      { nome: 'neutro', dir: null, sentido: -1, dist: 120 },
    ];
    for (const c of casos) {
      await prepararDuelo(page, 60);
      const x0 = await hook(page, '(h) => h.mundo().game.p1.x');
      const trilha = await esquivar(page, c.dir);
      const primeiro = trilha[0]!;
      expect(primeiro.estado, `${c.nome}: estado no 1º tick`).toBe('esquiva');
      expect(primeiro.esquiva, `${c.nome}: sentido`).toBe(c.sentido);
      expect(primeiro.en, `${c.nome}: custo`).toBe(40);
      // a energia fica parada durante a esquiva (não regenera) e o deslocamento acompanha a distância prevista
      const fim = trilha.find((t) => t.estado !== 'esquiva')!;
      expect(fim, `${c.nome}: a esquiva termina`).toBeTruthy();
      expect(Math.abs(trilha[trilha.indexOf(fim) - 1]!.x - x0), `${c.nome}: distância`).toBeGreaterThan(c.dist - 14);
      expect(Math.abs(trilha[trilha.indexOf(fim) - 1]!.x - x0), `${c.nome}: distância`).toBeLessThan(c.dist + 14);
      expect(Math.sign(trilha[trilha.indexOf(fim) - 1]!.x - x0), `${c.nome}: para onde foi`).toBe(c.sentido);
      // janela invulnerável: nos primeiros ticks e só neles (o avanço tem 3 ticks de arranque vulnerável)
      const comInvuln = trilha.filter((t) => t.invuln > 0 && t.estado === 'esquiva').length;
      expect(comInvuln, `${c.nome}: ticks invulneráveis`).toBeGreaterThanOrEqual(12);
      expect(comInvuln, `${c.nome}: ticks invulneráveis`).toBeLessThanOrEqual(18);
      // pose: corpo baixo na janela, `land` na recuperação
      expect(trilha.filter((t) => t.estado === 'esquiva').map((t) => t.pose)).toContain('crouch');
      expect(trilha.filter((t) => t.estado === 'esquiva').map((t) => t.pose)).toContain('land');
    }
    expect(erros).toEqual([]);
  });

  test('sem barra (19 < 20): nada acontece, nada é gasto e o som de "sem energia" toca; com exatamente 20 sai', async ({ page }) => {
    const erros = coletarErros(page);
    await abrir(page);
    await prepararDuelo(page, 19);
    await hook(page, '(h) => { h.mundo().game.p1.en = 19; }');
    await page.keyboard.down('n');
    const negado = await hook(page, `(h) => { h.avancar(1); const g = h.mundo().game; return { estado: g.p1.state, en: g.p1.en, deny: g.events.some((e) => e.tipo === 'deny' && e.lutador === 0) }; }`);
    await page.keyboard.up('n');
    expect(negado).toMatchObject({ estado: 'idle', deny: true });
    expect(negado.en).toBeGreaterThanOrEqual(19); // pode regenerar, nunca gasta

    await prepararDuelo(page, 20);
    await hook(page, '(h) => { h.mundo().game.p1.en = 20; }');
    const t = await esquivar(page, null);
    expect(t[0]).toMatchObject({ estado: 'esquiva', en: 0 });
    expect(erros).toEqual([]);
  });

  test('P2 esquiva com a tecla O (e P1 não); a esquiva do P2 olha o lado dele', async ({ page }) => {
    await abrir(page);
    await prepararDuelo(page, 60);
    await page.keyboard.down('o');
    const r = await hook(
      page,
      `(h) => { h.avancar(1); const g = h.mundo().game; return { p1: g.p1.state, p2: g.p2.state, dir2: g.p2.esquiva, en1: g.p1.en, en2: g.p2.en }; }`,
    );
    await page.keyboard.up('o');
    expect(r).toMatchObject({ p1: 'idle', p2: 'esquiva', dir2: -1, en2: 40 });
    expect(r.en1).toBeGreaterThanOrEqual(60);
  });

  test('regra de produto: com Regras.esquiva desligada (?expansao=4) a luta ignora a tecla N', async ({ page }) => {
    await page.goto('/?seed=3&manual=1&expansao=4');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await hook(page, '(h) => h.ui.c.regras.esquiva')).toBe(false);
    // o caminho de verdade: a cena de seleção monta o ConfigPartida a partir das regras (esquiva: false)
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: false });
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 80; }');
    await page.keyboard.down('n');
    const r = await hook(page, `(h) => { h.avancar(1); const g = h.mundo().game; return { estado: g.p1.state, en: g.p1.en, deny: g.events.some((e) => e.tipo === 'deny') }; }`);
    await page.keyboard.up('n');
    expect(r).toMatchObject({ estado: 'idle', deny: false });
    expect(r.en).toBeGreaterThanOrEqual(80);
  });

  test('a cena de seleção liga a esquiva a partir das regras (versus e treino)', async ({ page }) => {
    await abrir(page);
    const cfgs = await hook(
      page,
      `(h) => {
        const saidas = [];
        const ui = h.ui;
        const go = ui.go.bind(ui);
        ui.go = (nome, args) => { saidas.push([nome, args && args.cfg ? args.cfg.esquiva : null]); };
        const s = ui.cenas.select;
        for (const modo of ['versus', 'training']) {
          s.enter({ mode: modo });
          s.pick = [0, 3]; s.done = 1;
          s.update();
        }
        ui.go = go;
        return saidas;
      }`,
    );
    expect(cfgs).toEqual([['vs', true], ['fight', true]]);
  });
});

test.describe('HUD e fantasma da esquiva', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'captura em desktop'));

  /** Pixel RGB do canvas (coordenadas LÓGICAS 960x540; o canvas real é 2x). */
  const pixel = (page: Page, x: number, y: number): Promise<[number, number, number]> =>
    hook(page, `(h) => { h.desenhar(); const c = document.getElementById('jogo'); const d = c.getContext('2d').getImageData(${x * 2}, ${y * 2}, 1, 1).data; return [d[0], d[1], d[2]]; }`);

  test('selo ESQ: apagado com a barra abaixo de 20, aceso (ciano/branco) a partir de 20; marcador ciano no 20% da barra; ausente sem a regra', async ({ page }) => {
    await abrir(page);
    await prepararDuelo(page, 19);
    // selo do P1: x 380..416, y 505..523 (px lógicos). Pega um ponto do fundo do selo, longe do texto (cantos internos)
    const SX = 384;
    const SY = 508;
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 19; g.p2.en = 19; }');
    const apagado = await pixel(page, SX, SY);
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 20; g.p2.en = 20; }');
    // a luz pulsa a cada 7 ticks: o fundo é ciano (#7fe3ff) ou branco; nos dois casos é CLARO e azulado, nunca o navy do apagado
    const acesos: Array<[number, number, number]> = [];
    for (let i = 0; i < 4; i++) {
      acesos.push(await pixel(page, SX, SY));
      await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 20; h.avancar(7); }');
    }
    expect(apagado[0] + apagado[1] + apagado[2], `apagado ${apagado}`).toBeLessThan(250); // #10264a = 16,38,74
    for (const a of acesos) {
      expect(a[1], `aceso ${a}`).toBeGreaterThan(200);
      expect(a[2], `aceso ${a}`).toBeGreaterThan(240);
    }
    expect(new Set(acesos.map((a) => a.join(','))).size, 'pulsa entre dois tons').toBeGreaterThanOrEqual(2);

    // marcador no 20% da barra do P1 (barra x 128..368; 20% = 48 px -> x=176): ciano 3 px antes do dourado, com borda escura
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; }');
    const custoEspecial: number = await hook(page, '(h) => h.mundo().elenco.hayato.ch.proj.cost');
    const ciano = await pixel(page, 173, 514);
    const dourado = await pixel(page, 128 + (240 * custoEspecial) / 100, 514);
    const borda = await pixel(page, 172, 514);
    expect(ciano[1], `ciano ${ciano}`).toBeGreaterThan(200);
    expect(ciano[0], `ciano ${ciano}`).toBeLessThan(160);
    expect(dourado[0], `dourado ${dourado}`).toBeGreaterThan(220);
    expect(dourado[2], `dourado ${dourado}`).toBeLessThan(120);
    expect(borda[0] + borda[1] + borda[2], `borda escura ${borda}`).toBeLessThan(120);

    // sem a regra (?expansao=4) o HUD é o do protótipo: nem selo nem marcador
    await page.goto('/?seed=3&manual=1&expansao=4');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, esquiva: false });
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; }');
    const semSelo = await pixel(page, SX, SY);
    const semMarcador = await pixel(page, 173, 514);
    expect(semSelo[1], `sem selo ${semSelo}`).toBeLessThan(200);
    // sem o marcador, o pixel é o da barra cheia (degradê claro) e não o ciano do marcador nem a borda escura
    expect(semMarcador).not.toEqual(ciano);
    const borda4 = await pixel(page, 172, 514);
    expect(borda4[0] + borda4[1] + borda4[2], `sem borda escura ${borda4}`).toBeGreaterThan(300);
  });

  test('fantasma só na janela invulnerável: a faixa na cor do lutador aparece atrás dele e some na recuperação; capturas frente e trás', async ({ page }, info) => {
    mkdirSync(CAPTURAS, { recursive: true });
    await abrir(page);
    for (const [nome, dir, sentido] of [['tras', 'ArrowLeft', -1], ['frente', 'ArrowRight', 1]] as const) {
      await prepararDuelo(page, 60);
      await page.keyboard.down(dir);
      await page.keyboard.down('n');
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up('n');
      await hook(page, '(h) => h.avancar(4)');
      // dentro da janela: faixa atrás do corpo (cor do HAYATO: fire[0] = #6fe0ff), a meia altura do torso
      const janela = await hook(page, `(h) => {
        const g = h.mundo().game; const f = g.p1; const c = document.getElementById('jogo');
        const k = c.width / 960;
        const y = f.y - 130;
        const lerPx = (x) => { const d = c.getContext('2d').getImageData(Math.round((x - g.cam.x + 480 / g.cam.z) * g.cam.z * k), Math.round(y * g.cam.z * k), 1, 1).data; return d[0] + d[1] + d[2]; };
        // A/B no MESMO quadro: com a janela invulnerável (faixa + rastro) e com invuln = 0 (o que a recuperação mostra); só a faixa muda esses pontos
        const pontos = [70, 95, 120].map((d) => f.x - ${sentido} * d);
        const rastro = f.trail; f.trail = []; // sem o rastro de silhuetas: o que muda entre as duas leituras é SÓ a faixa de velocidade
        h.desenhar();
        const com = pontos.map(lerPx);
        const inv = f.invuln; f.invuln = 0; h.desenhar(); const sem = pontos.map(lerPx); f.invuln = inv; f.trail = rastro; h.desenhar();
        return { estado: f.state, invuln: inv, esquiva: f.esquiva, com, sem, maiorGanho: Math.max(...com.map((v, i) => v - sem[i])) };
      }`);
      expect(janela, nome).toMatchObject({ estado: 'esquiva', esquiva: sentido });
      expect(janela.invuln, nome).toBeGreaterThan(0);
      await page.locator('canvas#jogo').screenshot({ path: `${CAPTURAS}/esquiva-${nome}-janela.png` });
      // avança até a recuperação (vulnerável): sem faixa
      const recuperacao = await hook(page, `(h) => {
        let n = 0; const f = h.mundo().game.p1;
        while (f.invuln > 0 && n++ < 40) h.avancar(1);
        h.avancar(1);
        h.desenhar();
        return { estado: f.state, invuln: f.invuln, esquiva: f.esquiva };
      }`);
      await page.locator('canvas#jogo').screenshot({ path: `${CAPTURAS}/esquiva-${nome}-recuperacao.png` });
      await page.keyboard.up(dir);
      expect(recuperacao, nome).toMatchObject({ estado: 'esquiva', invuln: 0 });
      // a faixa de velocidade (fire[0]) acende os pontos atrás do corpo: mais claro com a janela que sem ela
      expect(janela.maiorGanho, `${nome}: com ${janela.com} sem ${janela.sem}`).toBeGreaterThan(20);
    }
    info.annotations.push({ type: 'capturas', description: `${CAPTURAS}/esquiva-{tras,frente}-{janela,recuperacao}.png` });
  });
});

test.describe('esquiva no controle e no toque', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');

  test('controle: L1 e L2 esquivam (a direção vem do direcional), R1 continua sendo o especial', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'controle: só no desktop');
    await page.addInitScript(() => {
      (window as any).__pad = { ligado: false, botoes: [] as number[] };
      navigator.getGamepads = () =>
        [
          (window as any).__pad.ligado
            ? { connected: true, axes: [0, 0], buttons: Array.from({ length: 17 }, (_, i) => ({ pressed: (window as any).__pad.botoes.includes(i) })) }
            : null,
        ] as unknown as (Gamepad | null)[];
    });
    await abrir(page);
    for (const [botao, direcional, sentido] of [[4, 15, 1], [6, 14, -1]] as const) {
      await prepararDuelo(page, 60);
      await page.evaluate(([b, d]) => Object.assign((window as any).__pad, { ligado: true, botoes: [b, d] }), [botao, direcional] as const);
      const t = await um(page);
      await page.evaluate(() => Object.assign((window as any).__pad, { botoes: [] }));
      expect(t, `botão ${botao}`).toMatchObject({ estado: 'esquiva', esquiva: sentido, en: 40 });
      for (let i = 0; i < 30; i++) await um(page);
    }
    // R1 NÃO esquiva: gasta o especial
    await prepararDuelo(page, 60);
    await page.evaluate(() => Object.assign((window as any).__pad, { ligado: true, botoes: [5] }));
    const r1 = await um(page);
    await page.evaluate(() => Object.assign((window as any).__pad, { botoes: [] }));
    expect(r1.estado).toBe('move');
  });

  test('toque: o botão ESQ + o joystick para a frente avançam; sem direção recua; esmaece (.sem) sem barra; some sem a regra', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'toque: só no celular');
    const erros = coletarErros(page);
    await abrir(page, '', { width: 915, height: 412 });
    const cdp: CDPSession = await page.context().newCDPSession(page);
    const centro = async (seletor: string) => {
      const b = await page.locator(seletor).boundingBox();
      if (!b) throw new Error(`${seletor} sem caixa`);
      return { x: b.x + b.width / 2, y: b.y + b.height / 2, b };
    };
    await prepararDuelo(page, 60);
    const esq = await centro('#esq');
    const joy = await centro('#joy');
    const raio = joy.b.width / 2;
    // joystick todo para a direita (frente do P1) com o 1º dedo; o 2º dedo toca o ESQ
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: joy.x + raio * 0.8, y: joy.y, id: 1 }] });
    await hook(page, '(h) => h.avancar(1)');
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: joy.x + raio * 0.8, y: joy.y, id: 1 }, { x: esq.x, y: esq.y, id: 2 }],
    });
    const frente = await um(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(frente).toMatchObject({ estado: 'esquiva', esquiva: 1 });
    expect(frente.en, 'custo 20 (a barra regenerou um pouco nos 2 ticks antes do toque)').toBeCloseTo(40, 0);
    for (let i = 0; i < 30; i++) await um(page);

    // sem o joystick: recua
    await prepararDuelo(page, 60);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: esq.x, y: esq.y, id: 3 }] });
    const tras = await um(page);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    expect(tras).toMatchObject({ estado: 'esquiva', esquiva: -1 });

    // a classe .sem acompanha a barra do P1 e só muda quando o estado muda
    await prepararDuelo(page, 60);
    await hook(page, '(h) => { h.mundo().game.p1.en = 60; h.avancar(2); }');
    expect(await page.locator('#esq').evaluate((el) => el.classList.contains('sem'))).toBe(false);
    await hook(page, '(h) => { h.mundo().game.p1.en = 10; h.avancar(2); }');
    expect(await page.locator('#esq').evaluate((el) => el.classList.contains('sem'))).toBe(true);
    expect(+(await page.locator('#esq').evaluate((el) => getComputedStyle(el).opacity))).toBeLessThan(0.6);
    await hook(page, '(h) => { h.mundo().game.p1.en = 30; h.avancar(2); }');
    expect(await page.locator('#esq').evaluate((el) => el.classList.contains('sem'))).toBe(false);
    expect(+(await page.locator('#esq').evaluate((el) => getComputedStyle(el).opacity))).toBe(1);

    // visível, dentro da janela e tocável (é o elemento que recebe o toque no próprio centro)
    expect(await page.locator('#esq').evaluate((el) => getComputedStyle(el).visibility)).toBe('visible');
    expect(await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id, [esq.x, esq.y])).toBe('esq');
    expect(erros).toEqual([]);
  });

  test('toque sem a regra (?expansao=4): o botão ESQ some, mas a casa fica (o ESP não muda de lugar)', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'toque: só no celular');
    await page.setViewportSize({ width: 915, height: 412 });
    await page.goto('/?seed=3&manual=1&expansao=4');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await page.locator('#esq').evaluate((el) => getComputedStyle(el).visibility)).toBe('hidden');
    expect(await page.evaluate(() => document.body.classList.contains('sem-esquiva'))).toBe(true);
    const caixa = await page.locator('#esq').boundingBox();
    const r1 = await page.locator('#r1').boundingBox();
    expect(caixa!.width).toBeGreaterThanOrEqual(44);
    expect(caixa!.x).toBeLessThan(r1!.x);
    // tocar a casa vazia não faz nada: nenhum elemento tocável no ponto
    const alvo = await page.evaluate(([x, y]) => document.elementFromPoint(x!, y!)?.id ?? '', [caixa!.x + caixa!.width / 2, caixa!.y + caixa!.height / 2]);
    expect(alvo).not.toBe('esq');
  });
});
