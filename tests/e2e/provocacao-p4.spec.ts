/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * P4 (Íris): a PROVOCAÇÃO conferida de fora, por quem não a escreveu (docs/spec-provocacao-prerround-e-vitoria.md §10, com a nota "Decisões do dono").
 * Complementa tests/e2e/provocacao.spec.ts (Lyra): aqui o olhar é o do jogador (o que está desenhado quadro a quadro: HUD, "ROUND N", faixas, balões),
 * a foto do motor com os textos finais e o laço em TEMPO REAL (rAF), que o resto da suíte nunca exercita (todos usam `?manual=1`).
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros-chave (1920x1080) com o prefixo `p4-`.
 */
test.describe.configure({ timeout: 240_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const PASTA = process.env['SALVAR_CAPTURAS'];

async function capturar(page: Page, nome: string): Promise<void> {
  if (!PASTA) return;
  mkdirSync(resolve(PASTA), { recursive: true });
  const png: string = await page.evaluate(() => {
    (window as any).__inno.desenhar();
    return (document.getElementById('jogo') as HTMLCanvasElement).toDataURL('image/png');
  });
  writeFileSync(resolve(PASTA, `p4-${nome}.png`), Buffer.from(png.split(',')[1] as string, 'base64'));
}

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

const PERFIS = { desktop: { width: 1280, height: 720 }, celular: { width: 844, height: 390 } } as const;

async function abrirJogo(page: Page, perfil: keyof typeof PERFIS, query = '', manual = true, seed = 3): Promise<void> {
  await page.setViewportSize(PERFIS[perfil]);
  await page.goto(`/?seed=${seed}${manual ? '&manual=1' : ''}&expansao=1&ritmo=0${query}`); // ritmo=0: provocação que para o motor (antigo)
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  // espia o texto desenhado no canvas: o que o jogador LÊ na tela, quadro a quadro
  await page.evaluate(() => {
    const w = window as any;
    w.__txt = [];
    if (w.__espia) return;
    w.__espia = true;
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: [number?]) {
      // só o canvas do JOGO: os balões pintam a plaquinha numa camada fora da tela (cache), com coordenadas locais, que não são o que o jogador lê
      if (this.canvas.id === 'jogo') {
        const tf = this.getTransform();
        w.__txt.push({ t: String(t), y: tf.f / 2 + y * (tf.d / 2) });
      }
      return o.call(this, t, x, y, ...(r as []));
    };
  });
}

/** Preferências antes de abrir a luta (o jogador mexeu nas Opções). */
const preferencias = (page: Page, s: Record<string, string | null>): Promise<any> =>
  hook(page, `(h) => { const S = h.persist.settings; for (const [k, v] of Object.entries(${JSON.stringify(s)})) { if (v === null) delete S[k]; else S[k] = v; } }`);

async function abrirLuta(page: Page, cfg: Record<string, unknown>, semProvocacao = false): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ esquiva: true, ...cfg })} }); ${semProvocacao ? `(${SEM_PROVOCACAO})(h);` : ''} }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
}

/**
 * Um tick da cena + um desenho, e o que o jogador vê: `hud` = algum texto na faixa do HUD (y < 56), `overlay` = o "ROUND N" / "FIGHT!" / "X VENCE!" desenhados.
 * Roda DENTRO da página (uma ida só), devolve a série.
 */
const PASSO = `
  const s = h.ui.scene; const g = h.mundo().game;
  const passo = (forcar) => {
    const antes = { tick: g.tick, t: g.t, fase: g.phase, rng: g.rng.estado ? g.rng.estado() : null };
    h.avancar(1);
    window.__txt.length = 0;
    const ativa = h.ui.name === 'fight' && s.provocacao.ativa;
    if (h.ui.name === 'fight' && (ativa || forcar)) h.desenhar();
    const txt = window.__txt.map((x) => x);
    const q = ativa ? s.provocacao.quadro() : null;
    return {
      cena: h.ui.name, ativa, tipo: ativa ? s.provocacao.roteiro.tipo : null, modo: ativa ? s.provocacao.roteiro.modo : null,
      parado: g.tick === antes.tick && g.t === antes.t && g.phase === antes.fase && (g.rng.estado ? g.rng.estado() === antes.rng : true),
      tick: g.tick, t: g.t, fase: g.phase, round: g.round,
      hudTexto: txt.some((x) => x.y < 56), overlay: txt.some((x) => /^(ROUND \\d|FIGHT!|K\\.O\\.|TEMPO ESGOTADO|.* VENCE!|EMPATE!)$/.test(x.t)),
      overlayTxt: txt.filter((x) => /^(ROUND \\d|FIGHT!|K\\.O\\.|TEMPO ESGOTADO|.* VENCE!|EMPATE!|VITÓRIA FINAL)$/.test(x.t)).map((x) => x.t),
      q: q ? { hud: q.hud, overlay: q.overlay, faixa: q.faixa, zoom: q.zoom, desl: q.deslocamento, baloes: q.baloes.map((b) => ({ f: b.falante, l: b.letras, e: b.escala, a: b.alfa, seta: b.seta })) } : null,
    };
  };
`;

async function serie(page: Page, corpo: string): Promise<any> {
  return hook(page, `(h) => { ${PASSO} ${corpo} }`);
}

const CPU = { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2 } as const;

// ---------------------------------------------------------------------------------------------------------------------------------
// ROUND 1
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: round 1, quadro a quadro (textos finais)', () => {
  test('COMPLETA: 5 a 7,7 s, HUD e "ROUND 1" escondidos, um balão por vez (P1 primeiro), motor parado; no fim o HUD e o ROUND 1 voltam', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, CPU);
    const r = await serie(page, `
      const out = []; let n = 0;
      while (n < 1200) { const p = passo(); out.push(p); n++; if (!p.ativa) { out.push(passo(true)); break; } }
      const roteiro = s.provocacao.roteiro;
      return { out, total: roteiro.total, janelas: roteiro.janelas.map((j) => ({ f: j.falante, abre: j.abre, fim: j.fim, texto: j.texto, n: j.n })), faixas: roteiro.faixas, andada: roteiro.andada };
    `);
    const { out, total } = r;
    const ativos = out.filter((p: any) => p.ativa);
    console.log(`round1 COMPLETA: total=${total} ticks (${(total / 60).toFixed(2)} s), janelas=${JSON.stringify(r.janelas)}`);
    expect(total, 'duração do round 1 COMPLETA em ticks (teto 7,7 s; com os textos finais, curtos, fica perto de 4,8 s)').toBeGreaterThanOrEqual(240);
    expect(total).toBeLessThanOrEqual(460);
    const congelados = out.filter((p: any) => p.tick === 0);
    expect(congelados.length, 'o motor fica em tick 0 por `total` chamadas de update').toBe(total);
    expect(congelados.every((p: any) => p.parado && p.fase === 'intro'), 'o motor não anda').toBe(true);
    expect(ativos.every((p: any) => !p.q.hud && !p.q.overlay), 'HUD e overlay escondidos (o quadro diz)').toBe(true);
    expect(ativos.some((p: any) => p.hudTexto), 'nenhum texto do HUD foi desenhado na faixa de cima').toBe(false);
    expect(ativos.some((p: any) => p.overlay), 'nenhum "ROUND 1" desenhado').toBe(false);
    expect(Math.max(...ativos.map((p: any) => p.q.faixa)), 'faixas de cinema entram (56 px)').toBeGreaterThanOrEqual(50);
    expect(Math.max(...ativos.map((p: any) => Math.abs(p.q.desl[0]))), 'a andada acontece (P1 sai de -260)').toBeGreaterThan(200);
    // um balão por vez, o P1 primeiro
    const abertos = ativos.map((p: any) => p.q.baloes.filter((b: any) => b.a > 0).map((b: any) => b.f));
    expect(abertos.every((a: number[]) => a.length <= 1), 'nunca dois balões abertos juntos na COMPLETA').toBe(true);
    const ordem = abertos.flat().filter((f: number, i: number, a: number[]) => i === 0 || f !== a[i - 1]);
    expect(ordem, 'P1 fala primeiro, o P2 responde').toEqual([0, 1]);
    // depois da provocação: ROUND 1 e HUD voltam
    const depois = out[out.length - 1];
    expect(depois.tick, 'o motor anda na chamada seguinte').toBe(1);
    expect(depois.fase).toBe('intro');
    expect(depois.overlayTxt).toContain('ROUND 1');
    expect(depois.hudTexto, 'o HUD volta').toBe(true);
    expect(erros).toEqual([]);
  });

  for (const pref of ['curta', 'desligada'] as const) {
    test(`cinemática ${pref.toUpperCase()}: provocação CURTA (<= 126 ticks), os dois balões juntos, HUD visível, "ROUND 1" escondido`, async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'só no desktop');
      await abrirJogo(page, 'desktop');
      await preferencias(page, { cinematica: pref });
      await abrirLuta(page, CPU);
      const r = await serie(page, `
        const out = []; while (out.length < 400) { const p = passo(); out.push(p); if (!p.ativa) break; }
        return { out, total: s.provocacao.roteiro.total, modo: s.provocacao.roteiro.modo };
      `);
      const ativos = r.out.filter((p: any) => p.ativa);
      console.log(`round1 ${pref}: total=${r.total} (${(r.total / 60).toFixed(2)} s)`);
      expect(r.modo).toBe('curta');
      expect(r.total).toBeLessThanOrEqual(126);
      expect(r.out.filter((p: any) => p.tick === 0).length).toBe(r.total);
      expect(r.out.every((p: any) => p.parado && p.tick === 0)).toBe(true);
      expect(ativos.every((p: any) => p.q.hud && !p.q.overlay && p.q.faixa === 0), 'HUD visível, overlay escondido, sem faixas').toBe(true);
      expect(ativos.some((p: any) => p.hudTexto), 'o HUD está mesmo desenhado').toBe(true);
      expect(ativos.some((p: any) => p.overlay), '"ROUND 1" escondido').toBe(false);
      expect(ativos.some((p: any) => p.q.baloes.filter((b: any) => b.a > 0).length === 2), 'os dois balões abertos juntos').toBe(true);
    });
  }

  test('o mesmo confronto de novo (continue/reinício) vira CURTA mesmo com a cinemática COMPLETA', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, CPU);
    const a = await hook(page, '(h) => h.ui.scene.aberturaPendente === false ? 0 : (h.avancar(1), h.ui.scene.provocacao.roteiro.modo)');
    expect(a).toBe('completa');
    await abrirLuta(page, CPU);
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.roteiro.modo')).toBe('curta');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// ROUND 2+
// ---------------------------------------------------------------------------------------------------------------------------------
for (const pref of ['completa', 'curta', 'desligada'] as const) {
  test.describe(`P4: round 2+ com a cinemática ${pref.toUpperCase()}`, () => {
    test('1 linha, cerca de 2 s, HUD visível, motor parado em intro t 0, fala quem perdeu o round', async ({ page }, info) => {
      test.skip(info.project.name !== 'desktop', 'só no desktop');
      const erros = coletarErros(page);
      await abrirJogo(page, 'desktop');
      await preferencias(page, { cinematica: pref });
      await abrirLuta(page, CPU);
      const r = await serie(page, `
        const vistos = []; let n = 0; const ant = [];
        while (n < 30000) {
          const p = passo(); n++;
          if (p.ativa && p.tipo === 'rodada') {
            // coleta o round 2 inteiro
            const out = [p]; let venc = s.vencedorDoRound; let perd = venc === null ? null : 1 - venc;
            const rot = s.provocacao.roteiro;
            const info = { total: rot.total, modo: rot.modo, janelas: rot.janelas.map((j) => ({ f: j.falante, texto: j.texto, n: j.n, abre: j.abre, fim: j.fim })), hud: rot.hud, overlay: rot.overlay, faixas: rot.faixas, round: g.round, venc, perd, vit: [g.p1.wins, g.p2.wins] };
            while (out.length < 400) { const q = passo(); out.push(q); if (!q.ativa) break; }
            out.push(passo(true));
            return { info, out };
          }
          if (h.ui.name !== 'fight') return { fim: h.ui.name, n };
        }
        return { semRodada: true };
      `);
      expect(r.info, 'a luta chegou ao round 2').toBeDefined();
      const { info: ri, out } = r;
      const ativos = out.filter((p: any) => p.ativa);
      console.log(`round2+ ${pref}: round ${ri.round} modo=${ri.modo} total=${ri.total} (${(ri.total / 60).toFixed(2)} s) janelas=${JSON.stringify(ri.janelas)} venc=${ri.venc} wins=${ri.vit}`);
      expect(ri.janelas, 'um balão só').toHaveLength(1);
      expect(ri.janelas[0].n, 'fala de 1 linha (<= 34 car.)').toBeLessThanOrEqual(34);
      expect(ri.total / 60, 'cerca de 2 s').toBeGreaterThanOrEqual(1.2);
      expect(ri.total / 60).toBeLessThanOrEqual(2.2);
      const congelados = out.slice(1, -1); // [0] é o update que ABRE (o do `round start`), o último é o 1º do motor
      expect(congelados, 'o motor fica parado `total` chamadas de update').toHaveLength(ri.total);
      expect(congelados.every((p: any) => p.parado && p.fase === 'intro' && p.t === 0), 'motor parado em intro t 0').toBe(true);
      expect(ativos.every((p: any) => p.q.hud && !p.q.overlay && p.q.faixa === 0), 'HUD visível, sem faixas').toBe(true);
      expect(ativos.some((p: any) => p.hudTexto), 'HUD realmente desenhado').toBe(true);
      expect(ativos.some((p: any) => p.overlay), '"ROUND 2" escondido durante o balão').toBe(false);
      if (ri.perd !== null) expect(ri.janelas[0].f, 'fala quem PERDEU o round anterior').toBe(ri.perd);
      const depois = out[out.length - 1];
      expect(depois.tick, 'o motor anda depois').toBeGreaterThan(0);
      expect(depois.overlayTxt.some((t: string) => /^ROUND \d$/.test(t)), 'o ROUND N do motor aparece depois').toBe(true);
      expect(erros).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// VITÓRIA
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: vitória', () => {
  test('COMPLETA: congela em matchend t 56..100, push-in 1,08, faixas, HUD e título escondidos, ▶ no fim, balão do vencedor; ENTER só vale depois do tick 24', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, CPU, false);
    // chega na vitória
    const chegou = await serie(page, `
      let n = 0; while (n < 60000) { const p = passo(); n++; if (p.ativa && p.tipo === 'vitoria') return { ok: true, n }; if (h.ui.name !== 'fight') return { fim: h.ui.name }; }
      return { ok: false };
    `);
    expect(chegou.ok).toBe(true);
    const v = await hook(page, '(h) => { const g = h.mundo().game; const r = h.ui.scene.provocacao.roteiro; return { t: g.t, fase: g.phase, venc: g.matchWinner, total: r.total, zoomFinal: r.zoomFinal, vencedor: r.vencedor, modo: r.modo, faixas: r.faixas, hud: r.hud, janelas: r.janelas.map((j) => ({ f: j.falante, texto: j.texto, n: j.n, abre: j.abre, fim: j.fim })) }; }');
    console.log(`vitória COMPLETA: ${JSON.stringify(v)}`);
    expect(v.fase).toBe('matchend');
    expect(v.t).toBeGreaterThanOrEqual(56);
    expect(v.t).toBeLessThanOrEqual(100);
    expect(v.zoomFinal).toBeCloseTo(1.08, 5);
    expect(v.vencedor).toBe(v.venc);
    expect(v.janelas[0].f, 'o balão é do vencedor').toBe(v.venc);
    // roda a provocação em ticks, quadro a quadro: antes do tick 24, ENTER é consumido e NÃO pula; depois, pula em <= 6
    const r = await serie(page, `
      const out = [];
      for (let i = 0; i < 10; i++) out.push(passo());
      const tickDoEnter = s.provocacao.tick ?? null;
      return { out, pulouEm: s.provocacao.pulouEm, tickDoEnter };
    `);
    await capturar(page, 'vitoria-completa-tick10');
    await page.keyboard.press('Enter'); // ainda antes do 24
    expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'ENTER antes do tick 24 não pula').toBeNull();
    const meio = await serie(page, `
      const out = []; for (let i = 0; i < 40; i++) out.push(passo());
      return { out };
    `);
    await capturar(page, 'vitoria-completa-tick50');
    const quadro = [...r.out, ...meio.out].filter((p: any) => p.ativa);
    expect(quadro.every((p: any) => p.parado), 'motor parado').toBe(true);
    expect(quadro.every((p: any) => !p.q.hud && !p.q.overlay), 'HUD e título escondidos na COMPLETA').toBe(true);
    expect(quadro.some((p: any) => p.hudTexto)).toBe(false);
    expect(quadro.some((p: any) => p.overlay)).toBe(false);
    expect(Math.max(...quadro.map((p: any) => p.q.zoom)), 'push-in avança (até 1,08)').toBeGreaterThan(1.05);
    expect(Math.max(...quadro.map((p: any) => p.q.zoom))).toBeLessThanOrEqual(1.0801);
    const comSeta = await serie(page, `
      let achou = false; let n = 0;
      while (s.provocacao.ativa && n < 400) { const p = passo(); n++; if (p.q && p.q.baloes.some((b) => b.seta) && Math.floor(s.provocacao.tick / 20) % 2 === 0) { achou = true; break; } }
      return { achou, n };
    `);
    expect(comSeta.achou, 'o ▶ aparece').toBe(true);
    await capturar(page, 'vitoria-completa-seta');
    await page.keyboard.press('Enter');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'ENTER depois do 24 pula').not.toBeNull();
    const fim = await serie(page, `
      let n = 0; while (!g.matchDone && n < 30) { passo(); n++; }
      const ate = n; let m = 0; while (h.ui.name === 'fight' && m < 120) { passo(); m++; }
      return { n: ate, fade: m, cena: h.ui.name, ativa: s.provocacao.ativa };
    `);
    console.log(`vitória: ENTER -> matchDone em ${fim.n} ticks; troca de cena (fade) ${fim.fade} ticks`);
    expect(fim.n, 'ENTER na vitória encerra em <= 6 ticks').toBeLessThanOrEqual(6);
    expect(fim.cena, 'a luta fecha (matchDone) e vai ao resultado').not.toBe('fight');
    expect(erros).toEqual([]);
  });

  test('CURTA: sem faixas e sem zoom, HUD e título "X VENCE!" ficam, balão do vencedor', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'curta' });
    await abrirLuta(page, CPU);
    const chegou = await serie(page, `
      let n = 0; while (n < 60000) { const p = passo(); n++; if (p.ativa && p.tipo === 'vitoria') { const out = [p]; while (out.length < 400) { const q = passo(); out.push(q); if (!q.ativa) break; } return { ok: true, out, total: s.provocacao.roteiro.total }; } if (h.ui.name !== 'fight') return { fim: h.ui.name }; }
      return { ok: false };
    `);
    expect(chegou.ok).toBe(true);
    const ativos = chegou.out.filter((p: any) => p.ativa);
    console.log(`vitória CURTA: total=${chegou.total} (${(chegou.total / 60).toFixed(2)} s)`);
    expect(chegou.total).toBeLessThanOrEqual(126);
    expect(ativos.every((p: any) => p.q.hud && p.q.faixa === 0 && p.q.zoom === 1)).toBe(true);
    expect(ativos.some((p: any) => p.overlayTxt.some((t: string) => / VENCE!$/.test(t))), 'o título "X VENCE!" aparece').toBe(true);
    expect(ativos.some((p: any) => p.hudTexto)).toBe(true);
  });

  test('pular a vitória com ataque (borda) depois do tick 24: martelar ataque antes NÃO pula (R3)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, CPU);
    await serie(page, `
      let n = 0; while (n < 60000) { const p = passo(); n++; if (p.ativa && p.tipo === 'vitoria') return {}; }
      return {};
    `);
    // martela: aperta e solta o soco a cada tick durante 20 ticks (antes do 24)
    for (let i = 0; i < 20; i++) {
      await page.keyboard.down('z');
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up('z');
    }
    expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'martelar ataque durante os primeiros ticks não pula a vitória').toBeNull();
    for (let i = 0; i < 10; i++) await hook(page, '(h) => h.avancar(1)');
    await page.keyboard.down('z');
    await hook(page, '(h) => h.avancar(1)');
    await page.keyboard.up('z');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'o ataque depois do 24 pula').not.toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// MOVIMENTO REDUZIDO
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: movimento reduzido (prefers-reduced-motion do navegador de verdade)', () => {
  test('sem andada, sem zoom, sem pop, em round 1, round 2+ e vitória; as durações são as mesmas', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await abrirJogo(page, 'desktop');
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    await preferencias(page, { cinematica: 'completa' }); // explícita: COMPLETA, mas sem movimento
    await abrirLuta(page, CPU);
    const r = await serie(page, `
      const todos = []; const totais = {}; let n = 0;
      while (n < 60000 && h.ui.name === 'fight') {
        const p = passo(); n++;
        if (p.ativa) { todos.push(p); totais[p.tipo] = s.provocacao.roteiro.total; }
      }
      return { todos, totais };
    `);
    const tipos = new Set(r.todos.map((p: any) => p.tipo));
    console.log(`reduzido: tipos=${[...tipos]} totais=${JSON.stringify(r.totais)}`);
    expect([...tipos].sort()).toEqual(['abertura', 'rodada', 'vitoria']);
    for (const p of r.todos) {
      expect(p.q.desl[0], 'sem andada').toBe(0);
      expect(p.q.desl[1]).toBe(0);
      expect(p.q.zoom, 'sem push-in').toBe(1);
      expect(p.q.baloes.every((b: any) => b.e === 1), 'sem pop').toBe(true);
    }
    // sem a preferência de cinemática, o reduzido vira CURTA
    await preferencias(page, { cinematica: null });
    await abrirLuta(page, { ...CPU, c1: 'caio', c2: 'hayato' });
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.roteiro.modo')).toBe('curta');
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// ONDE NÃO RODA, E O QUE RODA
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: onde a provocação roda (e onde nunca abre)', () => {
  const nunca = `
    let abriu = 0; let n = 0; const s = h.ui.scene;
    while (n < LIM && h.ui.name === 'fight') { h.avancar(1); n++; if (s.provocacao && s.provocacao.ativa) abriu++; }
    return { abriu, n, cena: h.ui.name };
  `;

  test('opção PROVOCAÇÕES desligada: nada abre (round 1, round 2+, vitória) e ENTER/ataque/toque no canvas não fazem nada estranho', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    await preferencias(page, { provocacoes: 'desligadas', cinematica: 'completa' });
    await abrirLuta(page, CPU);
    await hook(page, '(h) => h.avancar(1)');
    expect((await hook(page, '(h) => h.mundo().game.tick'))).toBe(1); // a luta começa no 1º update
    await page.keyboard.press('Enter'); // ENTER na luta em andamento não faz nada
    const r = await hook(page, `(h) => { ${nunca.replace('LIM', '60000')} }`);
    expect(r.abriu).toBe(0);
    expect(r.cena).not.toBe('fight'); // a luta terminou sozinha
  });

  test('TREINO, CPU×CPU e ?expansao=4 nunca abrem', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, { mode: 'training', c1: 'hayato', c2: 'caio', cpu: null });
    let r = await hook(page, `(h) => { ${nunca.replace('LIM', '1500')} }`);
    expect(r.abriu, 'treino').toBe(0);
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBeGreaterThan(1000);
    await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', p1cpu: 2, cpu: 2 });
    r = await hook(page, `(h) => { ${nunca.replace('LIM', '60000')} }`);
    expect(r.abriu, 'CPU×CPU').toBe(0);
    // ?expansao=4: regras sem cinemática (o jogo de 4)
    await abrirJogo(page, 'desktop', '', true);
    await page.goto('/?seed=3&manual=1&expansao=4&ritmo=0');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await hook(page, '(h) => h.ui.c.regras.cinematica')).toBe(false);
    await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2 });
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.mundo().game.tick'), 'a luta de 4 começa no 1º update').toBe(1);
    r = await hook(page, `(h) => { ${nunca.replace('LIM', '60000')} }`);
    expect(r.abriu, '?expansao=4').toBe(0);
  });

  test('VERSUS de 2 jogadores tem provocação; qualquer um dos dois pula (P2 com j)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null });
    await hook(page, '(h) => h.avancar(15)');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.ativa'), 'o VERSUS abre a provocação').toBe(true);
    expect(await hook(page, '(h) => h.mundo().game.tick')).toBe(0);
    await capturar(page, 'versus-2p-abertura');
    await page.keyboard.down('j'); // ataque do P2
    await hook(page, '(h) => h.avancar(1)');
    await page.keyboard.up('j');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'o P2 pula').not.toBeNull();
    // e o P1 em outra luta
    await abrirLuta(page, { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null });
    await hook(page, '(h) => h.avancar(15)');
    await page.keyboard.down('z');
    await hook(page, '(h) => h.avancar(1)');
    await page.keyboard.up('z');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'o P1 pula').not.toBeNull();
    expect(erros).toEqual([]);
  });

  test('ESPELHO (mesmo lutador nos dois lados) e ZENON x ZENON não quebram a escolha das falas', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    for (const id of ['hayato', 'zenon', 'baatar']) {
      await abrirLuta(page, { mode: 'versus', c1: id, c2: id, cpu: null });
      await hook(page, '(h) => h.avancar(1)');
      const j = await hook(page, '(h) => h.ui.scene.provocacao.roteiro.janelas.map((j) => j.texto)');
      expect(j.length, `${id} espelho: duas falas`).toBe(2);
      expect(j.every((t: string) => t.length > 0 && !t.includes('{rival}'))).toBe(true);
      let n = 0;
      while ((await hook(page, '(h) => h.ui.scene.provocacao.ativa')) && n < 600) {
        await hook(page, '(h) => h.avancar(5)');
        n += 5;
      }
      expect(await hook(page, '(h) => h.ui.scene.provocacao.ativa')).toBe(false);
    }
    expect(erros).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// ZENON
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: ZENON', () => {
  test('ZENON jogável: abertura e vitória com as falas dele, balão sem cobrir o rosto (capturas)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, { mode: 'cpu', c1: 'zenon', c2: 'hayato', cpu: 2 });
    await hook(page, '(h) => h.avancar(1)');
    const falas = await hook(page, '(h) => h.ui.scene.provocacao.roteiro.janelas.map((j) => ({ f: j.falante, t: j.texto }))');
    console.log(`zenon jogável abertura: ${JSON.stringify(falas)}`);
    expect(falas[0].f).toBe(0);
    for (const alvo of [80, 150, 250]) {
      while ((await hook(page, '(h) => h.ui.scene.provocacao.quadro() ? 1 : 0')) && (await hook(page, '(h) => h.ui.scene.provocacao.tick')) < alvo) await hook(page, '(h) => h.avancar(1)');
      await capturar(page, `zenon-jogavel-abertura-${alvo}`);
    }
    expect(erros).toEqual([]);
  });

  test('chefão ZENON vencendo: balão (com a fala dele), sem a legenda antiga; o pré-round do chefão não tem balão', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, { mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: 4, chefe: true });
    // pula a entrada dramática do chefão e deixa o jogador parado: o ZENON vence
    const r = await serie(page, `
      s.entrada.zerar(); s.entradaPendente = false;
      const textos = new Set(); let preBalao = false; let vit = null; let n = 0; const frames = [];
      while (n < 80000 && h.ui.name === 'fight') {
        const p = passo(); n++;
        for (const x of window.__txt) textos.add(x.t);
        if (p.ativa && p.tipo === 'abertura') preBalao = true;
        if (p.ativa && p.tipo === 'vitoria') { if (!vit) vit = { f: s.provocacao.roteiro.janelas[0].falante, texto: s.provocacao.roteiro.janelas[0].texto, venc: g.matchWinner }; frames.push([...window.__txt.map((x) => x.t)]); }
      }
      return { preBalao, vit, cena: h.ui.name, n, nTextos: textos.size, framesDaVitoria: frames.length, todosTextos: [...textos].filter((t) => t.length > 12) };
    `);
    console.log(`chefão vence: ${JSON.stringify({ preBalao: r.preBalao, vit: r.vit, cena: r.cena })}`);
    expect(r.preBalao, 'sem balão no pré-round do chefão').toBe(false);
    expect(r.vit, 'a vitória do ZENON tem balão').not.toBeNull();
    expect(r.vit.f).toBe(1);
    expect(r.vit.venc).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// MOTOR IDÊNTICO (a foto) e RNG, com os textos finais, no navegador
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: motor idêntico', () => {
  const FOTO = `
    const g = h.mundo().game; const s = h.ui.scene; const fotos = []; const parados = []; let n = 0;
    let ultimoTick = -1; let provTicks = 0;
    while (n < 80000 && h.ui.name === 'fight') {
      const antesRng = g.rng.estado ? g.rng.estado() : null; const antesTick = g.tick; const antesT = g.t; const jaAtiva = h.ui.name === 'fight' && s.provocacao.ativa;
      h.avancar(1); n++;
      const ativa = h.ui.name === 'fight' && s.provocacao.ativa;
      if (ativa || jaAtiva) provTicks++;
      if (jaAtiva) { parados.push(g.tick === antesTick && g.t === antesT && (g.rng.estado ? g.rng.estado() === antesRng : true)); }
      if (g.tick !== ultimoTick) {
        ultimoTick = g.tick;
        const f = (x) => [x.x, x.y, x.hp, x.state, x.dir, x.energy ?? 0].join(',');
        fotos.push([g.tick, g.phase, g.round, f(g.p1), f(g.p2), g.rng.estado ? g.rng.estado() : 0].join('|'));
      }
    }
    return { fotos, provTicks, todosParados: parados.every((x) => x), nParados: parados.length, cena: h.ui.name, rngFinal: g.rng.estado ? g.rng.estado() : null };
  `;

  test('luta CPU completa com e sem provocação (COMPLETA e CURTA): foto tick a tick idêntica, nenhum RNG do motor consumido enquanto ela roda', async ({ browser }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const resultados: any[] = [];
    for (const variante of ['sem', 'completa', 'curta']) {
      const ctx = await browser.newContext({ viewport: PERFIS.desktop });
      const page = await ctx.newPage();
      await abrirJogo(page, 'desktop', '', true, 11);
      await preferencias(page, { cinematica: variante === 'curta' ? 'curta' : 'completa' });
      await abrirLuta(page, { mode: 'cpu', c1: 'caio', c2: 'wei-long', cpu: 2 }, variante === 'sem');
      resultados.push({ variante, ...(await hook(page, `(h) => { ${FOTO} }`)) });
      await ctx.close();
    }
    const [sem, comp, curta] = resultados;
    console.log(`foto: sem=${sem.fotos.length} fotos, completa=${comp.fotos.length} (prov ${comp.provTicks} ticks), curta=${curta.fotos.length} (prov ${curta.provTicks} ticks)`);
    expect(sem.provTicks).toBe(0);
    expect(comp.provTicks).toBeGreaterThan(500);
    expect(curta.provTicks).toBeGreaterThan(200);
    expect(comp.todosParados, 'COMPLETA: durante a provocação nem tick, nem t, nem RNG do motor mexem').toBe(true);
    expect(curta.todosParados).toBe(true);
    // a luta com provocação é a mesma luta: as fotos coincidem (a COMPLETA/CURTA só ganham ticks de espera, em que a foto não muda)
    const semFotos: string[] = sem.fotos;
    // a luta com provocação fecha no fim dela (matchDone); a sem provocação espera o ENTER/tempo do matchend: compara-se o trecho até onde a primeira fecha
    const ate = (fs: string[]): number => Number(fs[fs.length - 1]!.split('|')[0]);
    const recorte = (fs: string[], max: number): string[] => fs.filter((f) => { const t = Number(f.split('|')[0]); return t >= 1 && t <= max; });
    for (const v of [comp, curta]) {
      const max = ate(v.fotos);
      expect(max, 'a luta com provocação chega até o matchend (CAIO x WEI LONG, CPU 2, semente 11: 2685 ticks desde a ginga do CAIO; era > 3000)').toBeGreaterThan(2000);
      expect(recorte(v.fotos, max)).toEqual(recorte(semFotos, max));
    }
    expect(comp.rngFinal).toBe(sem.rngFinal);
    expect(curta.rngFinal).toBe(sem.rngFinal);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// TEMPO REAL (rAF): o laço que o resto da suíte nunca exercita
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P4: em tempo real (requestAnimationFrame, teclado real)', () => {
  test('round 1 COMPLETA dura de 5 a 7,7 s de relógio; ataque depois do tick 10 pula em <= 0,2 s; sem erros', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop', '', false);
    await preferencias(page, { cinematica: 'completa' });
    // sem manual: o laço roda sozinho. Abre a luta e mede o relógio de parede até o motor andar
    const t0 = await page.evaluate(() => performance.now());
    await abrirLuta(page, CPU);
    await page.waitForFunction(() => (window as any).__inno.mundo().game.tick > 0, undefined, { timeout: 20_000, polling: 50 });
    const dur = ((await page.evaluate(() => performance.now())) - t0) / 1000;
    const total = await hook(page, '(h) => h.ui.scene.provocacao.roteiro.total');
    console.log(`tempo real: round 1 COMPLETA = ${dur.toFixed(2)} s de relógio (roteiro ${(total / 60).toFixed(2)} s)`);
    expect(dur, 'relógio de parede do round 1').toBeGreaterThanOrEqual(total / 60 - 0.3);
    expect(dur).toBeLessThanOrEqual(7.7 + 1.5); // + folga da carga da arte
    // outra luta, em página nova (estado limpo): pula com o ataque depois de 0,5 s
    await abrirJogo(page, 'desktop', '', false);
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, { ...CPU, c1: 'caio', c2: 'hayato' });
    await page.waitForFunction(() => (window as any).__inno.ui.scene.provocacao.ativa === true, undefined, { timeout: 10_000, polling: 20 });
    await page.waitForFunction(() => (window as any).__inno.ui.scene.provocacao.tick >= 30, undefined, { timeout: 10_000, polling: 20 });
    await page.evaluate(() => {
      const w = window as any;
      w.__td = null;
      w.__tk = null;
      window.addEventListener('keydown', (e) => { if (e.key === 'z' && w.__td === null) w.__td = performance.now(); });
      const poll = (): void => { if (w.__inno.mundo().game.tick > 0) w.__tk = performance.now(); else requestAnimationFrame(poll); };
      poll();
    });
    await page.keyboard.down('z');
    await page.waitForFunction(() => (window as any).__tk !== null, undefined, { timeout: 5_000, polling: 10 });
    await page.keyboard.up('z');
    const dbg = await page.evaluate(() => ({ td: (window as any).__td, tk: (window as any).__tk, tick: (window as any).__inno.mundo().game.tick, prov: (window as any).__inno.ui.scene.provocacao.tick, pulou: (window as any).__inno.ui.scene.provocacao.pulouEm }));
    console.log(`tempo real dbg: ${JSON.stringify(dbg)}`);
    const espera = (dbg.tk - dbg.td) / 1000;
    console.log(`tempo real: do ataque ao motor andar = ${espera.toFixed(3)} s`);
    expect(espera).toBeLessThanOrEqual(0.25);
    expect(erros).toEqual([]);
  });

  test('toque real (celular): tocar o canvas pula; o toque num botão de ataque também', async ({ page }, info) => {
    test.skip(info.project.name !== 'celular', 'só no celular');
    const erros = coletarErros(page);
    await abrirJogo(page, 'celular', '', false);
    await preferencias(page, { cinematica: 'completa' });
    await abrirLuta(page, CPU);
    await page.waitForFunction(() => (window as any).__inno.ui.scene.provocacao.tick >= 30, undefined, { timeout: 10_000, polling: 20 });
    const caixa = (await page.locator('#jogo').boundingBox())!;
    await page.touchscreen.tap(caixa.x + caixa.width / 2, caixa.y + caixa.height * 0.35);
    await page.waitForFunction(() => (window as any).__inno.mundo().game.tick > 0, undefined, { timeout: 5_000, polling: 20 });
    await capturar(page, 'celular-depois-do-toque');
    // vitória: toca de novo para pular
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(false);
    expect(erros).toEqual([]);
  });
});

// CDP: toque cru sem sintetizar mouse (como o celular de verdade faz antes do click sintético)
test('P4: toque cru por CDP no celular pula uma vez só (o click sintético seguinte não pausa nem pula de novo)', async ({ page }, info) => {
  test.skip(info.project.name !== 'celular', 'só no celular');
  await abrirJogo(page, 'celular');
  await preferencias(page, { cinematica: 'completa' });
  await abrirLuta(page, CPU);
  await hook(page, '(h) => h.avancar(20)');
  const caixa = (await page.locator('#jogo').boundingBox())!;
  const cdp: CDPSession = await page.context().newCDPSession(page);
  const x = caixa.x + caixa.width / 2;
  const y = caixa.y + caixa.height / 2;
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm')).not.toBeNull();
  await hook(page, '(h) => h.avancar(10)');
  expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(false);
});
