/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { ateOControle, avancarAte, eventos, espiarMotor, hook, irAteALuta, prepararDuelo, teclas } from './_menu-real';

/*
 * O RITMO PADRÃO e o SUPER, pelo caminho REAL do jogo (Iris, 2026-10-24, HEAD 2403b2d): menu de verdade (LUTA vs CPU), SEM `?ritmo=` na URL (= o que vai
 * ao ar), teclado real e `h.avancar` dirigindo o mesmo `ui.update()`. Os specs de comportamento ANTIGO (`cinematica`, `provocacao*`, `tarja-motor-v2`,
 * `zenon-z2z3`) ficam com `&ritmo=0`; ESTE arquivo é a cobertura do padrão novo: tarja sem congelar, provocação curta sobreposta, intervalos curtos,
 * filme só no KO (COMPLETO na luta, CURTO no round), super (comando, tarja, 5 acertos, bloqueio, BAATAR, WEI LONG, botão do toque) e a CPU que usa o super.
 * Specs já existentes que cobrem o resto do ritmo: `ritmo-r1-r2.spec.ts` (contador, geometria da faixa, flags isoladas).
 */
test.describe.configure({ timeout: 240_000 });

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

const SO_DESKTOP = ({}, info: { project: { name: string } }): void => test.skip(info.project.name !== 'desktop', 'comportamento do motor/cena: o perfil desktop basta');

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 1) O padrão sobe ligado; ?ritmo=0 é o rollback
// -------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('o padrão sobe com o ritmo ligado (e ?ritmo=0 desliga tudo)', () => {
  test.beforeEach(SO_DESKTOP);

  test('sem ?ritmo=: regras da UI e cfg do motor, pelo menu real, com tarja/provocação/intervalos/filmeRestrito/super/cpu ligados', async ({ page }) => {
    const erros = coletarErros(page);
    await irAteALuta(page);
    const est = await hook(page, `(h) => ({ regras: h.ui.c.regras.ritmo, super: h.mundo().game.ritmoSuperLigado, semSuper: document.body.classList.contains('sem-super') })`);
    expect(est.regras).toMatchObject({ tarja: true, provocacao: true, intervalos: true, filmeRestrito: true, super: true, cpu: true });
    expect(est.super, 'o MOTOR recebeu ritmo.super pela cfg real (cfgRitmo), não só a UI').toBe(true);
    expect(est.semSuper, 'o botão SUPER do toque existe').toBe(false);
    expect(erros).toEqual([]);
  });

  test('?ritmo=0: o rollback desliga tudo (UI e motor) e o botão SUPER some', async ({ page }) => {
    await irAteALuta(page, { query: '&ritmo=0' });
    const est = await hook(page, `(h) => ({ regras: h.ui.c.regras.ritmo, super: h.mundo().game.ritmoSuperLigado, semSuper: document.body.classList.contains('sem-super') })`);
    expect(Object.values(est.regras ?? {}).some(Boolean), 'nenhuma flag ligada').toBe(false);
    expect(est.super).toBe(false);
    expect(est.semSuper).toBe(true);
  });
});

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 2) Provocação CURTA do round 1 sobreposta à contagem (padrão) e o especial comum que não congela
// -------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('padrão: provocação curta sobreposta e tarja do especial sem congelar', () => {
  test.beforeEach(SO_DESKTOP);

  test('round 1: a provocação é CURTA e corre por cima da contagem (o motor anda com o balão aberto); o controle chega em <= 150 ticks', async ({ page }) => {
    await irAteALuta(page);
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.roteiro?.modo')).toBe('curta');
    const r = await hook(
      page,
      `(h) => {
        const g = h.mundo().game; const s = h.ui.scene; let n = 0; let andouComBalao = 0; let ultimo = g.tick;
        while (g.phase !== 'fight' && n < 400) { h.avancar(1); n++; if (s.provocacao.ativa && g.tick > ultimo) andouComBalao++; ultimo = g.tick; }
        return { ticks: n, fase: g.phase, andouComBalao };
      }`,
    );
    expect(r.fase).toBe('fight');
    expect(r.andouComBalao, 'o motor andou enquanto o balão estava aberto').toBeGreaterThan(0);
    expect(r.ticks, 'pré-luta (G3: <= 2,5 s)').toBeLessThanOrEqual(150);
  });

  test('especial comum: abre a faixa (não a tarja de 48 ticks) e o motor não para; nunca a tarja do super', async ({ page }) => {
    await irAteALuta(page);
    await ateOControle(page);
    await prepararDuelo(page, { en: 60, dist: 300 });
    await teclas(page, 'keydown', 'b');
    await hook(page, '(h) => h.avancar(2)');
    await teclas(page, 'keyup', 'b');
    const abriu = await hook(page, '(h) => ({ faixa: h.ui.scene.faixaRitmo.ativa, cine: h.ui.scene.cine.ativa, tarjaSuper: h.ui.scene.tarjaDoSuper.ativa })');
    expect(abriu).toEqual({ faixa: true, cine: false, tarjaSuper: false });
    const t0 = await hook(page, '(h) => h.mundo().game.tick');
    await hook(page, '(h) => h.avancar(10)');
    expect(await hook(page, '(h) => h.mundo().game.tick'), 'o motor andou 10 ticks com a faixa na tela').toBe(t0 + 10);
  });
});

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 2b) "Como jogar" > GOLPES no padrão: a linha do SUPER cabe para os 10 lutadores (o spec de combos fixa ritmo: {} porque mede a geometria SEM ela)
// -------------------------------------------------------------------------------------------------------------------------------------------------
test('padrão: "Como jogar" > GOLPES mostra "SUPER · NOME" e o comando (X + V) abaixo dos combos e acima da legenda (y < 510), nos 10 lutadores', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'layout 960x540: o perfil desktop basta');
  await page.goto('/?seed=7&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  const n = await hook(
    page,
    `(h) => {
      h.ui.c.regras = { ...h.ui.c.regras, motorV2: { ...(h.ui.c.regras.motorV2 ?? {}), combos: true } }; // ritmo fica o do padrão
      const ctx = h.ui.c.ctx; const o = ctx.fillText.bind(ctx); window.__t = [];
      ctx.fillText = (t, x, y, ...r) => { window.__t.push({ t: String(t), x, y }); return o(t, x, y, ...r); };
      h.persist.prog.desbloqueados = [...new Set([...(h.persist.prog.desbloqueados ?? []), ...h.ui.c.regras.roster])];
      h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('how', { from: 'menu' }); h.ui.scene.tab = 2; return h.ui.c.regras.roster.length;
    }`,
  );
  expect(n).toBeGreaterThanOrEqual(10);
  for (let i = 0; i < n; i++) {
    const t: Array<{ t: string; y: number }> = await hook(page, `(h) => { h.ui.scene.cid = ${i}; window.__t.length = 0; h.ui.draw(); return window.__t.slice(); }`);
    const sup = t.filter((x) => x.t.startsWith('SUPER · '));
    expect(sup.length, `lutador #${i}: a linha do SUPER foi desenhada`).toBeGreaterThan(0);
    const toqueSuper = t.filter((x) => x.t === 'TOQUE: SOCO FORTE + CHUTE FORTE');
    expect(toqueSuper.length, `lutador #${i}: o texto de toque do SUPER`).toBeGreaterThan(0);
    const yMax = Math.max(...toqueSuper.map((x) => x.y));
    expect(yMax, `lutador #${i}: o SUPER termina acima da legenda do rodapé (510)`).toBeLessThanOrEqual(510);
    const combos = t.filter((x) => x.t.startsWith('TOQUE: ') && x.t !== 'TOQUE: SOCO FORTE + CHUTE FORTE');
    for (const c of combos) expect(c.y, `lutador #${i}: os combos ficam ACIMA do SUPER`).toBeLessThan(Math.min(...sup.map((x) => x.y)));
  }
});

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 3) O SUPER pelo teclado, de ponta a ponta
// -------------------------------------------------------------------------------------------------------------------------------------------------
/** SOCO FORTE + CHUTE FORTE (x + v) na mesma evaluate, 1 tick, solta. */
async function apertarSuper(page: Page): Promise<void> {
  await teclas(page, 'keydown', 'x', 'v');
  await hook(page, '(h) => h.avancar(1)');
  await teclas(page, 'keyup', 'x', 'v');
}

test.describe('super pelo teclado real (padrão, sem ?ritmo=)', () => {
  test.beforeEach(SO_DESKTOP);

  test('HAYATO, rival com vida alta: tarja congela 30 ticks, 5 acertos presos (intervalo 7), contador sobe 1..5, o último derruba, NENHUM filme', async ({ page }) => {
    const erros = coletarErros(page);
    await irAteALuta(page);
    await ateOControle(page);
    await espiarMotor(page);
    await hook(page, `(h) => { const ctx = h.ui.c.ctx; window.__textos = []; const o = ctx.fillText.bind(ctx); ctx.fillText = (t, ...x) => { window.__textos.push(String(t)); return o(t, ...x); }; }`);
    await prepararDuelo(page);
    await apertarSuper(page);
    expect(await hook(page, '(h) => h.mundo().game.p1.en'), 'a barra inteira foi gasta').toBe(0);
    // a tarja: 30 ticks da cena, o motor parado
    const tarja = await hook(
      page,
      `(h) => { const s = h.ui.scene; const g = h.mundo().game; const t0 = g.tick; let n = 0; const nomes = [];
        if (s.tarjaDoSuper.ativa) nomes.push(s.tarjaDoSuper.estado.nome);
        while (s.tarjaDoSuper.ativa && n < 100) { h.avancar(1); h.desenhar(); n++; }
        return { abriu: nomes.length > 0, nome: nomes[0], ticks: n, motorParado: g.tick === t0 }; }`,
    );
    expect(tarja.abriu, 'a tarja do super abriu').toBe(true);
    expect(tarja.nome).toBe('TENRAI-KEN');
    expect(tarja.ticks, 'tarja de 30 ticks (<= 0,5 s, G3)').toBe(30);
    expect(tarja.motorParado, 'a luta congela durante a tarja').toBe(true);
    // a sequência
    await hook(page, `(h) => { for (let i = 0; i < 80; i++) { h.avancar(1); h.desenhar(); } }`);
    const hits = (await eventos(page, 'hit')).filter((e) => e.super);
    expect(hits.map((e) => e.acertos)).toEqual([1, 2, 3, 4, 5]);
    expect(hits.slice(1).map((e, i) => e.tick - hits[i]!.tick), 'um acerto a cada 7 ticks').toEqual([7, 7, 7, 7]);
    expect(hits.reduce((s, e) => s + (e.dano ?? 0), 0)).toBeCloseTo(29.0, 0);
    const vistos = await hook(page, '(h) => window.__textos.filter((t) => /HITS/.test(t))');
    for (const n of [2, 3, 4, 5]) expect(vistos, `o contador mostrou "${n} HITS"`).toContain(`${n} HITS`);
    const fim = await hook(page, '(h) => { const g = h.mundo().game; return { p2: g.p2.state, p2hp: g.p2.hp }; }');
    expect(['down', 'idle', 'prejump', 'walk']).toContain(fim.p2); // caiu e já pode estar levantando
    expect(1000 - fim.p2hp).toBeCloseTo(29.0, 0);
    expect(await eventos(page, 'filme'), 'super que NÃO mata nunca abre filme').toEqual([]);
    expect(erros).toEqual([]);
  });

  test('super com barra < 100: sai o golpe comum (sem tarja, sem super, a barra não é gasta)', async ({ page }) => {
    await irAteALuta(page);
    await ateOControle(page);
    await espiarMotor(page);
    await prepararDuelo(page, { en: 60 });
    await apertarSuper(page);
    await hook(page, '(h) => h.avancar(40)');
    expect(await hook(page, '(h) => h.ui.scene.tarjaDoSuper.ativa')).toBe(false);
    expect((await eventos(page, 'hit')).filter((e) => e.super)).toEqual([]);
    expect(await hook(page, '(h) => h.mundo().game.p1.en')).toBeGreaterThanOrEqual(60);
  });

  test('super BLOQUEADO (AMINU, que quebra guarda): 1 block, nenhuma quebra de guarda, nenhum acerto do super, a barra foi embora', async ({ page }) => {
    await irAteALuta(page, { p1: 'aminu' });
    await ateOControle(page);
    await espiarMotor(page);
    await prepararDuelo(page);
    await teclas(page, 'keydown', 'd'); // o P2 segura "para trás" (ele olha para a esquerda)
    await hook(page, '(h) => h.avancar(8)');
    await apertarSuper(page);
    await hook(page, '(h) => { for (let i = 0; i < 90; i++) h.avancar(1); }');
    await teclas(page, 'keyup', 'd');
    expect((await eventos(page, 'block')).length).toBeGreaterThanOrEqual(1);
    expect(await eventos(page, 'quebra-guarda')).toEqual([]);
    expect((await eventos(page, 'hit')).filter((e) => e.super)).toEqual([]);
    expect(await hook(page, '(h) => h.mundo().game.p1.en'), 'a barra foi gasta no disparo (o risco é dele)').toBeLessThan(40);
  });

  test('BAATAR: o agarrão é o 1º acerto (throw) e os outros 4 saem como hit; soma = teto 32', async ({ page }) => {
    await irAteALuta(page, { p1: 'baatar' });
    await ateOControle(page);
    await espiarMotor(page);
    await prepararDuelo(page, { dist: 50 });
    await apertarSuper(page);
    await hook(page, `(h) => { for (let i = 0; i < 160; i++) h.avancar(1); }`);
    expect((await eventos(page, 'throw')).length, 'o agarrão pegou').toBe(1);
    const hits = (await eventos(page, 'hit')).filter((e) => e.super);
    expect(hits.map((e) => e.acertos)).toEqual([2, 3, 4, 5]);
    expect(1000 - (await hook(page, '(h) => h.mundo().game.p2.hp'))).toBeCloseTo(32, 0);
    expect(await eventos(page, 'filme')).toEqual([]);
  });

  test('WEI LONG: o projétil do super atravessa e cai em 5 acertos presos (soma 31,1), sem filme', async ({ page }) => {
    await irAteALuta(page, { p1: 'wei-long' });
    await ateOControle(page);
    await espiarMotor(page);
    await prepararDuelo(page, { dist: 300 });
    await apertarSuper(page);
    await hook(page, `(h) => { for (let i = 0; i < 260; i++) h.avancar(1); }`);
    const hits = (await eventos(page, 'hit')).filter((e) => e.super);
    expect(hits.map((e) => e.acertos)).toEqual([1, 2, 3, 4, 5]);
    expect(1000 - (await hook(page, '(h) => h.mundo().game.p2.hp'))).toBeCloseTo(31.1, 0);
    expect(await eventos(page, 'filme')).toEqual([]);
  });
});

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 4) KO que decide a luta: filme COMPLETO; KO de um round: CURTO — no jogo real (super que mata e especial comum que mata)
// -------------------------------------------------------------------------------------------------------------------------------------------------
/** Anda 1 tick por vez até o filme abrir e devolve o modo que o canvas está usando (ou null). */
const MODO_DO_FILME = `(h) => { const s = h.ui.scene; for (let i = 0; i < 400; i++) { h.avancar(1); const e = s.filme.estado; if (e) return { modo: e.modo, duracao: s.filme.duracao }; } return null; }`;

test.describe('KO e filme: COMPLETO se decide a luta, CURTO no round (padrão)', () => {
  test.beforeEach(SO_DESKTOP);

  for (const [nome, decide] of [['KO de um round', false], ['KO que DECIDE a luta', true]] as const) {
    test(`super que MATA — ${nome}: filme de KO depois do último acerto, modo ${decide ? 'COMPLETO' : 'CURTO'}`, async ({ page }) => {
      await irAteALuta(page);
      await ateOControle(page);
      await espiarMotor(page);
      const winsNeeded = await hook(page, '(h) => h.mundo().game.winsNeeded');
      await prepararDuelo(page, { hp2: 6, wins1: decide ? winsNeeded - 1 : 0 });
      await apertarSuper(page);
      const r = await hook(page, MODO_DO_FILME);
      expect(r, 'o filme de KO abriu').not.toBeNull();
      expect(r.modo).toBe(decide ? 'completa' : 'curta');
      const filmes = await eventos(page, 'filme');
      expect(filmes).toHaveLength(1);
      expect(filmes[0]).toMatchObject({ motivo: 'ko' });
      const hits = (await eventos(page, 'hit')).filter((e) => e.super);
      expect(hits.length, 'matou antes do 5º acerto ou no 5º, nunca depois').toBeLessThanOrEqual(5);
      expect(hits.at(-1)!.tick, 'o filme vem DEPOIS do último acerto').toBeLessThanOrEqual(filmes[0].tick);
    });

    test(`especial COMUM que mata — ${nome}: filme de KO, modo ${decide ? 'COMPLETO' : 'CURTO'}`, async ({ page }) => {
      await irAteALuta(page);
      await ateOControle(page);
      await espiarMotor(page);
      const winsNeeded = await hook(page, '(h) => h.mundo().game.winsNeeded');
      await prepararDuelo(page, { hp2: 6, en: 60, dist: 60, wins1: decide ? winsNeeded - 1 : 0 });
      await teclas(page, 'keydown', 'ArrowDown', 'b'); // ↓ + ESP = o RAIJIN-KEN do HAYATO (corpo a corpo)
      await hook(page, '(h) => h.avancar(2)');
      await teclas(page, 'keyup', 'ArrowDown', 'b');
      const r = await hook(page, MODO_DO_FILME);
      expect(r, 'o filme de KO abriu').not.toBeNull();
      expect(r.modo).toBe(decide ? 'completa' : 'curta');
      expect((await eventos(page, 'filme'))[0]).toMatchObject({ motivo: 'ko' });
      expect((await eventos(page, 'hit')).filter((e) => e.super)).toEqual([]); // não foi super
    });
  }

  test('o COMPLETO é mais longo que o CURTO (o modo vale no canvas, não só no rótulo)', async ({ page }) => {
    const dur: Record<string, number> = {};
    for (const decide of [false, true]) {
      await irAteALuta(page, { seed: decide ? 22 : 21 });
      await ateOControle(page);
      const winsNeeded = await hook(page, '(h) => h.mundo().game.winsNeeded');
      await prepararDuelo(page, { hp2: 6, wins1: decide ? winsNeeded - 1 : 0 });
      await apertarSuper(page);
      const r = await hook(page, MODO_DO_FILME);
      dur[r.modo] = r.duracao;
    }
    expect(dur['completa']).toBeGreaterThan(dur['curta']!);
  });
});

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 5) Botão SUPER no celular: só com a barra cheia, toque de verdade (CDP), 2 tamanhos
// -------------------------------------------------------------------------------------------------------------------------------------------------
for (const [nome, vp] of [['844x390', { width: 844, height: 390 }], ['915x412', { width: 915, height: 412 }]] as const) {
  test(`celular ${nome}: o botão SUPER fica apagado com a barra < 100 (o toque não dá super) e acende com 100 (o toque dá o super)`, async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'toque: perfil celular');
    await page.setViewportSize(vp);
    await irAteALuta(page);
    await ateOControle(page);
    await espiarMotor(page);
    const cdp = await page.context().newCDPSession(page);
    const alvo = async (): Promise<{ x: number; y: number; w: number }> =>
      page.evaluate(() => { const r = document.getElementById('sup')!.getBoundingClientRect(); return { x: r.x + r.width / 2, y: r.y + r.height / 2, w: r.width }; });
    const tocar = async (): Promise<void> => {
      const a = await alvo();
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: a.x, y: a.y }] });
      await hook(page, '(h) => h.avancar(2)');
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    };
    // barra 60: apagado
    await prepararDuelo(page, { en: 60 });
    await hook(page, '(h) => h.avancar(2)');
    const a = await alvo();
    expect(await page.evaluate(() => document.getElementById('sup')!.classList.contains('sem'))).toBe(true);
    expect(a.w, 'alvo de toque >= 44 px CSS').toBeGreaterThanOrEqual(44);
    await tocar();
    await hook(page, '(h) => h.avancar(60)');
    expect((await eventos(page, 'hit')).filter((e) => e.super), 'barra < 100: o toque não dá super').toEqual([]);
    // barra cheia: acende e dá o super
    await prepararDuelo(page, { en: 100 });
    await hook(page, '(h) => h.avancar(2)');
    expect(await page.evaluate(() => document.getElementById('sup')!.classList.contains('sem'))).toBe(false);
    await tocar();
    await hook(page, `(h) => { for (let i = 0; i < 100; i++) h.avancar(1); }`);
    expect((await eventos(page, 'hit')).filter((e) => e.super).map((e) => e.acertos)).toEqual([1, 2, 3, 4, 5]);
  });
}

// -------------------------------------------------------------------------------------------------------------------------------------------------
// 6) A CPU usa o super, e o tempo sem controle fecha a meta (6 lutas CPU x CPU, melhor de 3, NORMAL, padrão)
// -------------------------------------------------------------------------------------------------------------------------------------------------
test.describe('6 lutas CPU x CPU no padrão: supers por luta (G10) e tempo sem controle (G1/G2)', () => {
  test.beforeEach(SO_DESKTOP);
  test.describe.configure({ timeout: 480_000 });

  test('supers por luta 1..4 em média e nenhuma luta com mais de 6; G1 <= 10% e G2 <= 25% (limite de reprovação); a tarja congelante nunca aparece', async ({ page }, info) => {
    const P1S = ['hayato', 'min-ji', 'aminu', 'camille', 'baatar', 'caio'];
    const linhas: any[] = [];
    for (const p1 of P1S) {
      await irAteALuta(page, { p1 });
      await hook(page, `(h) => { const g = h.mundo().game; g.p1.cpu = 1; g.p2.cpu = 1; window.__n = { supers: 0, hitsSuper: 0, filmes: [] }; const o = g.emitir.bind(g); g.emitir = (ev) => { if (ev.tipo === 'special' && ev.super) window.__n.supers++; if (ev.tipo === 'hit' && ev.super) window.__n.hitsSuper++; if (ev.tipo === 'filme') window.__n.filmes.push(ev.motivo); return o(ev); }; }`);
      let snap: any = null;
      for (let i = 0; i < 2000; i++) {
        const r = await hook(page, `(h) => { h.avancar(30); const g = h.mundo().game; return { nome: h.ui.name, fase: g.phase, rit: window.__ritmo ? JSON.parse(JSON.stringify(window.__ritmo)) : null }; }`);
        if (r.nome !== 'fight') break;
        if (r.fase === 'matchend' && r.rit) { snap = r.rit; break; }
      }
      expect(snap, `${p1}: a luta chegou ao KO final`).not.toBeNull();
      const n = await hook(page, '(h) => window.__n');
      const m = snap.porMotivo;
      const g1 = (100 * (m.hitstop + m.tarja + m['flash-super'] + m.filme)) / (m.jogavel + m.hitstop + m.tarja + m['flash-super'] + m.filme);
      const g2 = (100 * (snap.total - m.jogavel)) / snap.total;
      linhas.push({ p1, supers: n.supers, hitsSuper: n.hitsSuper, filmes: n.filmes, g1: +g1.toFixed(1), g2: +g2.toFixed(1), flash: m['flash-super'], tarja: m.tarja });
      expect(m.tarja, `${p1}: a tarja que congela o especial comum não existe no padrão`).toBe(0);
      expect(m['flash-super'], `${p1}: cada super congela exatamente 30 ticks`).toBe(30 * n.supers);
      expect(n.supers, `${p1}: no máximo 6 supers na luta (G10)`).toBeLessThanOrEqual(6);
      expect(g1, `${p1}: G1 (dentro do round) <= 10%`).toBeLessThanOrEqual(10);
      expect(g2, `${p1}: G2 (até o KO final) <= 25%`).toBeLessThanOrEqual(25);
    }
    const media = linhas.reduce((s, l) => s + l.supers, 0) / linhas.length;
    info.annotations.push({ type: 'supers por luta e G1/G2', description: JSON.stringify(linhas) });
    expect(media, 'G10: 1 a 4 supers por luta em média').toBeGreaterThanOrEqual(1);
    expect(media).toBeLessThanOrEqual(4);
  });
});

void avancarAte;
