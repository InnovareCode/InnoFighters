/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { PULAR_ENTRADA } from './_chefe';
import { SEM_PROVOCACAO } from './_luta';

/*
 * V2-3e (QA do FILME do especial no JOGO DE VERDADE, `motorV2.filmes` ligada): o motor real dispara o contato, a cena real congela, a arte e o canvas são os de produção.
 * (O gancho `?filme=` e os 33 filmes sem motor estão em filme.spec.ts; a lógica com arte falsa, em tests/unit/filme-cena.test.ts e filmes-motor.test.ts.)
 * Aqui: KO e troca de barra DENTRO do filme (só aparecem depois do último quadro), pular não muda um bit do motor, os 33 especiais pelo motor, o 2º contato do mesmo tick,
 * o painel do HAYATO como P2 (borda inclinada e sem fantasma do mundo) e o ciclo da folha FILME (rede, 404, soltar ao sair pela pausa).
 */
test.describe.configure({ timeout: 400_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);
const URL_BASE = '/?seed=7&manual=1&expansao=1';

async function abrir(page: Page, url = URL_BASE): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  return erros;
}

/** Abre a luta (cena `fight`) com o motor v2 de filmes ligado e anda até a fase `fight`. `run` + `chefe` = a luta de chefão do ARCADE. */
async function abrirLuta(page: Page, cfg: Record<string, unknown>, run?: Record<string, unknown>): Promise<void> {
  const args = JSON.stringify({ cfg: { mode: 'versus', cpu: null, esquiva: false, motorV2: { filmes: true }, ...cfg }, ...(run ? { run } : {}) });
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', ${args}); (${SEM_PROVOCACAO})(h); (${PULAR_ENTRADA})(h); }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  for (let i = 0; i < 300; i++) {
    if ((await hook(page, '(h) => { h.avancar(2); return h.mundo().game.phase; }')) === 'fight') break;
  }
  await hook(page, '(h) => h.avancar(5)');
}

/** Espiões: eventos que chegam aos efeitos, "FASE 2!" do chefão e os desenhos do título "K.O." (a luta inteira passa por `ui.c.ctx`). */
const ESPIAR = `(h) => {
  const w = window; const s = h.ui.scene; const g = h.mundo().game; const e = h.mundo().efeitos;
  w.__efx = []; w.__fase = []; w.__ko = 0; w.__comecou = 0;
  if (w.__espiado) return;
  w.__espiado = true;
  const r = e.reagir.bind(e);
  e.reagir = (ev, ...rest) => { w.__efx.push({ tick: h.mundo().game.tick, tipo: ev.tipo, etapa: ev.etapa ?? null, filme: ev.filme === true, projetil: ev.projetil === true, ativo: h.ui.scene.filme.ativo }); return r(ev, ...rest); };
  const a = s.aoFaseDoChefe.bind(s); s.aoFaseDoChefe = (...x) => { w.__fase.push({ tick: h.mundo().game.tick, ativo: s.filme.ativo }); return a(...x); };
  const c = s.comecarFilme.bind(s); s.comecarFilme = (...x) => { w.__comecou++; return c(...x); };
  const ctx = h.ui.c.ctx;
  for (const m of ['fillText', 'strokeText']) { const o = ctx[m].bind(ctx); ctx[m] = (t, ...x) => { if (String(t) === 'K.O.') w.__ko++; return o(t, ...x); }; }
}`;

/** O P1 (`quem` = 0) ou o P2 solta `golpe` a `d` px do rival, com energia cheia, e anda a cena até o filme abrir (ou `limite` updates). Devolve se abriu. */
async function soltar(page: Page, quem: 0 | 1, golpe: string, d: number, limite = 240, antes = ''): Promise<boolean> {
  await hook(
    page,
    `(h) => { const g = h.mundo().game; const a = g.fighters[${quem}]; const b = g.fighters[${1 - quem}];
      const p1x = 480 - ${d} / 2, p2x = 480 + ${d} / 2;
      g.p1.x = p1x; g.p2.x = p2x; g.p1.facing = 1; g.p2.facing = -1; a.en = 100; ${antes}
      a.startMove(${JSON.stringify(golpe)}, g); }`,
  );
  return hook(page, `(h) => { const s = h.ui.scene; const g = h.mundo().game; for (let i = 0; i < ${limite}; i++) { h.avancar(1); if (s.filme.ativo) return true; if (g.fighters[${quem}].move === null && g.projectiles.length === 0 && g.phase === 'fight' && i > 8) return false; } return false; }`);
}

/** Termina o filme em andamento, devolvendo quantos updates levou. */
const TERMINAR = `(h) => { const s = h.ui.scene; let n = 0; while (s.filme.ativo && n < 200) { h.avancar(1); n++; } return n; }`;

/** Foto do estado do MOTOR (campos escalares de tudo + estado do RNG): igual de um bit para o outro = o mesmo motor. */
const ESTADO_DO_MOTOR = `(h) => {
  const sc = (o) => Object.fromEntries(Object.entries(o).filter(([k, v]) => k !== 'events' && (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean' || v === null)));
  const g = h.mundo().game;
  const json = JSON.stringify({ g: sc(g), p: g.fighters.map(sc), pr: g.projectiles.map(sc), cam: sc(g.cam), rng: g.rng.estado() });
  let x = 2166136261; for (let i = 0; i < json.length; i++) { x ^= json.charCodeAt(i); x = Math.imul(x, 16777619) >>> 0; }
  return { hash: x.toString(16).padStart(8, '0'), json, tick: g.tick };
}`;

test.describe('KO e troca de barra DENTRO do filme (só depois do último quadro)', () => {
  test('KO: o motor já resolveu (fase ko, rival no chão), mas o título K.O. e o evento `ko` só chegam depois do último quadro', async ({ page }) => {
    const erros = await abrir(page);
    await abrirLuta(page, { c1: 'hayato', c2: 'wei-long' });
    await hook(page, ESPIAR);
    await hook(page, '(h) => { h.mundo().game.p2.hp = 6; }');
    expect(await soltar(page, 0, 'sFwd', 90), 'o filme abriu').toBe(true);
    const aberto = await hook(page, `(h) => { const g = h.mundo().game; const s = h.ui.scene; return { fase: g.phase, estado: g.p2.state, hp: g.p2.hp, tick: g.tick, dur: s.filme.duracao, ko: window.__efx.filter((e) => e.tipo === 'ko').length, dust: window.__efx.filter((e) => e.tipo === 'dust').length }; }`);
    expect(aberto.fase).toBe('ko');
    expect(aberto.estado).toBe('ko');
    expect(aberto.hp).toBe(0);
    expect(aberto.ko, 'nenhum `ko` nos efeitos no tick do contato').toBe(0);
    expect(aberto.dust).toBe(0);
    // a duração inteira: o motor parado, a fase continua ko, nada de K.O. no desenho e nenhum evento `ko`
    for (let i = 0; i < aberto.dur - 1; i++) {
      const q = await hook(page, `(h) => { h.avancar(1); h.desenhar(1); const g = h.mundo().game; return { ativo: h.ui.scene.filme.ativo, tick: g.tick, fase: g.phase, ko: window.__ko, ev: window.__efx.filter((e) => e.tipo === 'ko').length }; }`);
      expect(q.ativo, `quadro ${i + 1}`).toBe(true);
      expect(q.tick, `quadro ${i + 1}: motor parado`).toBe(aberto.tick);
      expect(q.fase).toBe('ko');
      expect(q.ko, `quadro ${i + 1}: o título K.O. não aparece dentro do filme`).toBe(0);
      expect(q.ev, `quadro ${i + 1}: evento ko adiado`).toBe(0);
    }
    // o último quadro: o filme fecha e o KO chega
    await hook(page, `(h) => { h.avancar(1); h.desenhar(1); }`);
    const fim = await hook(page, `(h) => ({ ativo: h.ui.scene.filme.ativo, ko: window.__efx.filter((e) => e.tipo === 'ko').length, dust: window.__efx.filter((e) => e.tipo === 'dust').length, comecou: window.__comecou })`);
    expect(fim.ativo).toBe(false);
    expect(fim.ko, 'o evento ko chega ao fechar').toBe(1);
    expect(fim.dust, 'o pó da queda aconteceu (na batida da queda ou no fim)').toBeGreaterThanOrEqual(1);
    expect(fim.comecou).toBe(1);
    // e o título K.O. aparece nos quadros seguintes da fase ko
    let vistoK0 = 0;
    for (let i = 0; i < 12 && !vistoK0; i++) vistoK0 = await hook(page, `(h) => { h.avancar(1); h.desenhar(1); return window.__ko; }`);
    expect(vistoK0, 'o título K.O. aparece depois do filme').toBeGreaterThan(0);
    expect(erros).toEqual([]);
  });

  test('chefão: a troca de barra acontece DENTRO do filme (barra cheia, rival caído) e o "FASE 2!" + a cena só vêm depois do último quadro', async ({ page }) => {
    const erros = await abrir(page);
    const run = { c1: 'hayato', etapas: [{ id: 'zenon', chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0 };
    await abrirLuta(page, { mode: 'arcade', c1: 'hayato', c2: 'zenon', chefe: true, esquiva: true }, run);
    await hook(page, ESPIAR);
    const antes = await hook(page, '(h) => { const c = h.mundo().game.p2; return { barras: c.barras, hp: c.hp, max: c.maxHp }; }');
    expect(antes.barras, 'o ZENON tem 2 barras').toBe(2);
    await hook(page, '(h) => { h.mundo().game.p2.hp = 4; }');
    expect(await soltar(page, 0, 'sFwd', 90, 400), 'o filme abriu').toBe(true);
    const aberto = await hook(page, `(h) => { const g = h.mundo().game; const c = g.p2; return { barras: c.barras, hp: c.hp, max: c.maxHp, estado: c.state, fase: g.phase, tick: g.tick, dur: h.ui.scene.filme.duracao, fases: window.__fase.length, efxFase: window.__efx.filter((e) => e.tipo === 'fase-chefe').length }; }`);
    expect(aberto.barras, 'o motor já trocou de barra').toBe(1);
    expect(aberto.hp).toBe(aberto.max);
    expect(aberto.estado).toBe('down');
    expect(aberto.fase).toBe('fight');
    expect(aberto.fases, '"FASE 2!" ainda não').toBe(0);
    expect(aberto.efxFase, 'fase-chefe ainda não chegou aos efeitos').toBe(0);
    for (let i = 0; i < aberto.dur - 1; i++) {
      const q = await hook(page, `(h) => { h.avancar(1); h.desenhar(1); const g = h.mundo().game; return { ativo: h.ui.scene.filme.ativo, tick: g.tick, fase: g.phase, fases: window.__fase.length, ef: window.__efx.filter((e) => e.tipo === 'fase-chefe').length }; }`);
      expect(q.ativo).toBe(true);
      expect(q.tick).toBe(aberto.tick);
      expect(q.fase).toBe('fight');
      expect(q.fases).toBe(0);
      expect(q.ef).toBe(0);
    }
    await hook(page, `(h) => { h.avancar(1); }`);
    const fim = await hook(page, `(h) => ({ ativo: h.ui.scene.filme.ativo, fases: window.__fase.slice(), ef: window.__efx.filter((e) => e.tipo === 'fase-chefe').map((e) => e.etapa) })`);
    expect(fim.ativo).toBe(false);
    expect(fim.fases, 'o "FASE 2!" dispara uma vez, com o filme já fechado').toHaveLength(1);
    expect(fim.fases[0].ativo).toBe(false);
    expect(fim.ef[0]).toBe('troca');
    // a cena do chefão vem depois e a luta segue
    const fase = await hook(page, `(h) => { const g = h.mundo().game; for (let i = 0; i < 400 && g.phase === 'fight'; i++) h.avancar(1); return g.phase; }`);
    expect(fase).toBe('cena-chefe');
    expect(await hook(page, `(h) => window.__efx.filter((e) => e.tipo === 'fase-chefe').map((e) => e.etapa)`)).toEqual(['troca', 'cena']);
    expect(erros).toEqual([]);
  });
});

test('PULAR (ataque do P1 no tick 10, ou ENTER) encurta o filme e deixa o MOTOR idêntico: mesmo hash, mesmo RNG, nas três versões', async ({ page }) => {
  const rodar = async (modo: 'inteiro' | 'ataque' | 'enter'): Promise<{ n: number; motor: { hash: string; json: string; tick: number } }> => {
    await abrir(page);
    await abrirLuta(page, { c1: 'hayato', c2: 'caio' });
    expect(await soltar(page, 0, 'sFwd', 140)).toBe(true);
    let n = 0;
    if (modo !== 'inteiro') {
      await hook(page, '(h) => h.avancar(10)');
      n = 10;
      if (modo === 'ataque') await page.keyboard.down('x');
      else await page.keyboard.press('Enter');
      await hook(page, '(h) => h.avancar(1)');
      n++;
      if (modo === 'ataque') await page.keyboard.up('x');
    }
    n += await hook(page, TERMINAR);
    await hook(page, '(h) => h.avancar(30)'); // e a luta segue
    return { n, motor: await hook(page, ESTADO_DO_MOTOR) };
  };
  const inteiro = await rodar('inteiro');
  const ataque = await rodar('ataque');
  const enter = await rodar('enter');
  test.info().annotations.push({ type: 'hash do motor', description: `inteiro ${inteiro.motor.hash} (${inteiro.n} updates) | ataque ${ataque.motor.hash} (${ataque.n}) | enter ${enter.motor.hash} (${enter.n})` });
  expect(inteiro.n).toBe(66);
  expect(ataque.n).toBeLessThanOrEqual(16);
  expect(enter.n).toBeLessThanOrEqual(16);
  expect(ataque.motor.tick).toBe(inteiro.motor.tick);
  expect(ataque.motor.json).toBe(inteiro.motor.json);
  expect(enter.motor.json).toBe(inteiro.motor.json);
  expect(ataque.motor.hash).toBe(inteiro.motor.hash);
  expect(enter.motor.hash).toBe(inteiro.motor.hash);
});

/** Os 33 especiais com filme (31 + SELO MAIOR e DECRETO do ZENON): lutador, ficha e golpe. Espelha `src/data/filmes.ts`; a RESPOSTA da CAMILLE (`sResp`) só nasce da PARADE (coberta em filmes-motor.test.ts e no gancho). */
const FILMES: ReadonlyArray<readonly [string, string | null, string]> = [
  ['hayato', null, 'sFire'], ['hayato', null, 'sDown'], ['hayato', null, 'sFwd'],
  ['wei-long', null, 'sFire'], ['wei-long', null, 'sDown'], ['wei-long', null, 'sFwd'],
  ['min-ji', null, 'sFire'], ['min-ji', null, 'sDown'], ['min-ji', null, 'sFwd'],
  ['caio', null, 'sFire'], ['caio', null, 'sDown'], ['caio', null, 'sFwd'],
  ['aminu', null, 'sFire'], ['aminu', null, 'sDown'], ['aminu', null, 'sFwd'],
  ['centella', null, 'sFire'], ['centella', null, 'sDown'], ['centella', null, 'sFwd'],
  ['camille', null, 'sDown'], ['camille', null, 'sFwd'],
  ['nila', null, 'sFire'], ['nila', null, 'sFwd'], ['nila', 'sarpa', 'sFire'], ['nila', 'sarpa', 'sFwd'],
  ['baatar', null, 'sFire'], ['baatar', null, 'sDown'], ['baatar', null, 'sFwd'],
  ['zenon', null, 'sFire'], ['zenon', null, 'sDown'], ['zenon', null, 'sFwd'],
  ['zenon', 'chefe2', 'sFire'], ['zenon', 'chefe2', 'sFwd'],
];

test('os 32 especiais que o motor dispara abrem UM filme cada, de verdade (a 33ª, a RESPOSTA da CAMILLE, só nasce da PARADE)', async ({ page }) => {
  const erros = await abrir(page);
  const falhas: string[] = [];
  const distancias: Record<string, number> = {};
  const durs: Record<string, number> = {};
  for (const [lutador, ficha, golpe] of FILMES) {
    const rot = `${lutador}${ficha ? `/${ficha}` : ''} ${golpe}`;
    const rival = lutador === 'caio' ? 'hayato' : 'caio';
    let abriu = false;
    for (const d of [90, 130, 180, 240, 320]) {
      await abrirLuta(page, { c1: lutador, c2: rival });
      await hook(page, ESPIAR);
      if (ficha) await hook(page, `(h) => { h.mundo().game.p1.trocarFicha(${JSON.stringify(ficha)}); }`);
      // o HURACANRANA da CENTELLA só agarra rival NO AR (no chão ela erra e fica exposta): o rival está em salto
      const noAr = lutador === 'centella' && golpe === 'sDown' ? "g.p2.setState('jump'); g.p2.y = 400; g.p2.vy = -3;" : '';
      if (await soltar(page, 0, golpe, d, 240, noAr)) {
        abriu = true;
        distancias[rot] = d;
        const q = await hook(page, `(h) => { const g = h.mundo().game; const s = h.ui.scene; return { tick: g.tick, dur: s.filme.duracao, modo: s.filme.estado?.modo, golpe: s.filme.estado?.golpe ?? null, hp2: g.p2.hp, max2: g.p2.maxHp, estado2: g.p2.state }; }`);
        await hook(page, `(h) => h.avancar(${q.dur - 1})`);
        const parado = await hook(page, '(h) => h.mundo().game.tick');
        if (parado !== q.tick) falhas.push(`${rot}: o motor andou durante o filme`);
        durs[rot] = q.dur;
        if (q.modo !== 'completa' || q.dur < 45) falhas.push(`${rot}: modo ${q.modo}, duração ${q.dur} (esperado COMPLETA, >= 45)`);
        if (q.hp2 >= q.max2) falhas.push(`${rot}: o rival não perdeu vida`);
        await hook(page, '(h) => h.avancar(1)');
        const fechou = await hook(page, `(h) => ({ ativo: h.ui.scene.filme.ativo, comecou: window.__comecou })`);
        if (fechou.ativo) falhas.push(`${rot}: não fechou em ${q.dur} updates`);
        if (fechou.comecou !== 1) falhas.push(`${rot}: ${fechou.comecou} filmes abertos (esperado 1)`);
        break;
      }
    }
    if (!abriu) falhas.push(`${rot}: nenhum filme abriu em 5 distâncias (90..320 px)`);
  }
  test.info().annotations.push({ type: 'distâncias que abriram', description: JSON.stringify(distancias) });
  test.info().annotations.push({ type: 'duração do filme (updates)', description: JSON.stringify(durs) });
  expect(falhas).toEqual([]);
  expect(erros).toEqual([]);
});

test('2º contato de especial no MESMO tick: 1 filme só; o outro vale como acerto comum e chega aos efeitos na hora', async ({ page }) => {
  const erros = await abrir(page);
  // acha (par, d, atraso) no próprio navegador, com o Game real e os dados de PRODUÇÃO do elenco (a arte nova muda a geometria: o par de corpo a corpo + projétil que os
  // testes de unidade usam com a arte original não coincide no mesmo tick aqui; o par de dois projéteis coincide): os dois golpes se tocam no MESMO tick
  const achado = await page.evaluate(async () => {
    const h = (window as any).__inno;
    const imp = (p: string): Promise<any> => import(/* @vite-ignore */ p);
    const { Game } = await imp('/src/fight/game.ts');
    const { criarRng } = await imp('/src/core/rng.ts');
    const { INPUT_VAZIO } = await imp('/src/core/contratos.ts');
    const lutadores = Object.fromEntries(Object.entries(h.mundo().elenco).map(([id, e]: [string, any]) => [id, e.ch]));
    const fonte = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
    for (const par of [['hayato', 'sFwd', 'wei-long', 'sFire'], ['hayato', 'sFire', 'wei-long', 'sFire']] as string[][]) {
      for (let d = 60; d <= 360; d += 5) {
        for (let atraso = -24; atraso <= 24; atraso++) {
          const g = new Game({ lutadores, rng: criarRng(3) });
          g.setup({ mode: 'versus', c1: par[0], c2: par[2], cpu: null, motorV2: { filmes: true } }, { rounds: 2, time: 99, shake: true });
          g.phase = 'fight';
          g.t = 0;
          g.p1.x = 480 - d / 2;
          g.p2.x = 480 + d / 2;
          g.p1.en = 100;
          g.p2.en = 100;
          const t = (n: number): void => {
            for (let i = 0; i < n; i++) g.update(fonte);
          };
          if (atraso >= 0) {
            g.p1.startMove(par[1], g);
            t(atraso);
            g.p2.startMove(par[3], g);
          } else {
            g.p2.startMove(par[3], g);
            t(-atraso);
            g.p1.startMove(par[1], g);
          }
          for (let i = 0; i < 90; i++) {
            g.update(fonte);
            if (g.events.filter((e: any) => e.tipo === 'hit').length === 2 && g.events.some((e: any) => e.tipo === 'filme')) return { par, d, atraso };
          }
        }
      }
    }
    return null;
  });
  expect(achado, 'não achei dois contatos de especial no mesmo tick').not.toBeNull();
  const { par, d, atraso } = achado!;
  test.info().annotations.push({ type: 'par que coincide', description: JSON.stringify(achado) });
  // sem a cinemática da tarja (ela congela a cena no começo de cada especial e embaralharia a contagem de ticks do roteiro); o filme passa a CURTO
  await hook(page, `(h) => { h.persist.settings.cinematica = 'desligada'; }`);
  await abrirLuta(page, { c1: par[0]!, c2: par[2]! });
  await hook(page, ESPIAR);
  // repete na luta de verdade (cena real): mesma posição e mesma ordem
  await hook(
    page,
    `(h) => { const g = h.mundo().game; g.p1.x = 480 - ${d} / 2; g.p2.x = 480 + ${d} / 2; g.p1.facing = 1; g.p2.facing = -1; g.p1.en = 100; g.p2.en = 100;
      window.__ticks = []; const s = h.ui.scene; window.__gravar = () => { const ev = g.events; window.__ticks.push({ tick: g.tick, filme: ev.filter((e) => e.tipo === 'filme').length, hits: ev.filter((e) => e.tipo === 'hit').map((e) => ({ f: e.filme === true, proj: e.projetil === true, def: e.defensor })), ativo: s.filme.ativo }); }; }`,
  );
  const sequencia: [string, string, number][] = atraso >= 0 ? [['p1', par[1]!, atraso], ['p2', par[3]!, 0]] : [['p2', par[3]!, -atraso], ['p1', par[1]!, 0]];
  for (const [quem, golpe, esperar] of sequencia) {
    await hook(page, `(h) => { const g = h.mundo().game; g.${quem}.startMove('${golpe}', g); }`);
    for (let i = 0; i < esperar; i++) await hook(page, `(h) => { h.avancar(1); window.__gravar(); }`);
  }
  for (let i = 0; i < 90; i++) {
    await hook(page, `(h) => { h.avancar(1); window.__gravar(); }`);
    if (await hook(page, `(h) => window.__ticks.some((t) => t.hits.length === 2)`)) break;
  }
  const dois = await hook(page, `(h) => window.__ticks.find((t) => t.hits.length === 2) ?? null`);
  expect(dois, 'na cena de verdade também houve dois acertos no mesmo tick').not.toBeNull();
  expect(dois.filme, 'um evento filme só').toBe(1);
  const hitsDoFilme = dois.hits.filter((x: any) => x.f);
  const hitsComuns = dois.hits.filter((x: any) => !x.f);
  expect(hitsDoFilme).toHaveLength(1);
  expect(hitsComuns).toHaveLength(1);
  expect(hitsComuns[0].proj, 'o acerto comum é de projétil').toBe(true);
  expect(hitsComuns[0].def, 'e acerta o OUTRO lutador').not.toBe(hitsDoFilme[0].def);
  // o acerto comum chega aos efeitos NO TICK do contato; o que abriu o filme não (hit{filme} nunca vai para os efeitos de acerto)
  const efx = await hook(page, `(h) => window.__efx.filter((e) => e.tick === ${dois.tick} && e.tipo === 'hit').map((e) => ({ filme: e.filme, projetil: e.projetil }))`);
  expect(efx).toEqual([{ filme: false, projetil: true }]);
  await hook(page, TERMINAR);
  expect(await hook(page, '(h) => window.__comecou'), 'um filme só na luta inteira desse tick').toBe(1);
  expect(erros).toEqual([]);
});

/**
 * Espia o painel do filme: cada `drawImage` da folha FILME (com a transformação e o polígono do `clip` mais recente) e quantos desenhos do MUNDO (imagens antes da 1ª célula,
 * menos cenário e vinheta) o quadro teve. Com `pular`, o mundo não é desenhado: a diferença entre os dois quadros é o "fantasma" que atravessa o fundo do painel.
 */
const ESPIAR_PAINEL = `(h) => {
  const w = window; const ctx = h.ui.c.ctx;
  const alheias = new Set([...h.mundo().rec.cenarios.values(), h.mundo().rec.cenarioPadrao, h.mundo().rec.vinheta]);
  const folhas = () => [...h.mundo().arte.atlas.values()].map((x) => x.filmeImg).filter((x) => x);
  const k = () => ctx.canvas.width / 960;
  let caminho = [];
  const ap = (x, y) => { const t = ctx.getTransform(); return [(t.a * x + t.c * y + t.e) / k(), (t.b * x + t.d * y + t.f) / k()]; };
  const bp = ctx.beginPath.bind(ctx); ctx.beginPath = () => { caminho = []; return bp(); };
  const mv = ctx.moveTo.bind(ctx); ctx.moveTo = (x, y) => { caminho.push(ap(x, y)); return mv(x, y); };
  const ln = ctx.lineTo.bind(ctx); ctx.lineTo = (x, y) => { caminho.push(ap(x, y)); return ln(x, y); };
  const cl = ctx.clip.bind(ctx); ctx.clip = (...a) => { if (caminho.length === 4) w.__quadro.clip = caminho.slice(); return cl(...a); };
  const di = ctx.drawImage.bind(ctx);
  ctx.drawImage = (img, ...a) => {
    const q = w.__quadro;
    if (a.length === 8 && folhas().includes(img)) { const t = ctx.getTransform(); q.vistaCel = true; q.cels.push({ img, a: a.slice(), t: [t.a, t.b, t.c, t.d, t.e, t.f], k: k(), poligono: q.clip }); }
    else if (!q.vistaCel && !alheias.has(img)) { q.mundo++; if (q.pular) return; }
    return di(img, ...a);
  };
  w.__novoQuadro = (pular) => { w.__quadro = { cels: [], mundo: 0, pular: !!pular, vistaCel: false, clip: null }; };
  w.__novoQuadro(false);
}`;

/** Mede, no quadro já desenhado, a menor distância (px lógicos) entre os pixels OPACOS de cada close e a borda inclinada do painel dele (positivo = dentro do painel). */
const MARGEM_DOS_CLOSES = `(h) => {
  const q = window.__quadro; let margem = Infinity; let n = 0; let borda = Infinity;
  for (const c of q.cels) {
    if (!c.poligono) continue;
    n++;
    const [sx, sy, sw, sh, dx, dy, dw, dh] = c.a;
    const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
    const cx = cv.getContext('2d'); cx.drawImage(c.img, sx, sy, sw, sh, 0, 0, sw, sh);
    const px = cx.getImageData(0, 0, sw, sh).data;
    const P = c.poligono; const p1 = P[1]; const p2 = P[2]; borda = Math.min(borda, Math.abs(p1[0] - 480));
    const cen = [P.reduce((s, p) => s + p[0], 0) / 4, P.reduce((s, p) => s + p[1], 0) / 4];
    const nx = p2[1] - p1[1]; const ny = p1[0] - p2[0]; const norma = Math.hypot(nx, ny);
    const lado = Math.sign((cen[0] - p1[0]) * nx + (cen[1] - p1[1]) * ny) || 1;
    const [a, b, cc, d, e, f] = c.t;
    for (let v = 0; v < sh; v += 2) for (let u = 0; u < sw; u++) {
      if (px[(v * sw + u) * 4 + 3] < 40) continue;
      const X = dx + (u / sw) * dw; const Y = dy + (v / sh) * dh;
      const gx = (a * X + cc * Y + e) / c.k; const gy = (b * X + d * Y + f) / c.k;
      const dist = (((gx - p1[0]) * nx + (gy - p1[1]) * ny) * lado) / norma;
      if (dist < margem) margem = dist;
    }
  }
  return { margem, closes: n, mundo: q.mundo, borda };
}`;

/** O "fantasma": desenha o quadro com e sem os desenhos do mundo e devolve a maior diferença (níveis de cor) dentro do painel, longe da borda. */
const FANTASMA_NO_PAINEL = `(h) => {
  const w = window; const c = h.ui.c.ctx.canvas; const g = c.getContext('2d');
  const ler = () => g.getImageData(0, 0, c.width, c.height).data;
  w.__novoQuadro(false); h.desenhar(1); const A = ler().slice(); const q = w.__quadro;
  const alvo = q.cels.find((x) => x.poligono);
  if (!alvo) return null;
  w.__novoQuadro(true); h.desenhar(1); const B = ler();
  const P = alvo.poligono; const k = c.width / 960; let max = 0; let amostras = 0;
  const direita = P[0][0] > 480;
  for (let y = Math.ceil(P[0][1] * k) + 6; y < Math.floor(P[3][1] * k) - 6; y += 3) {
    const xi = P[1][0] + ((P[2][0] - P[1][0]) * (y / k - P[1][1])) / (P[2][1] - P[1][1]); // x da borda inclinada nesta altura
    const x0 = direita ? xi + 10 : xi - 10; const x1 = direita ? xi + 160 : xi - 160;
    for (let X = x0; direita ? X < x1 : X > x1; X += direita ? 7 : -7) {
      const i = (y * c.width + Math.round(X * k)) * 4;
      max = Math.max(max, Math.abs(A[i] - B[i]), Math.abs(A[i + 1] - B[i + 1]), Math.abs(A[i + 2] - B[i + 2]));
      amostras++;
    }
  }
  return { max, amostras, mundoPulado: q.mundo };
}`;

test.describe('painel do filme do HAYATO (P2 e P1)', () => {
  for (const [quem, rotulo] of [[1, 'P2 (direita)'], [0, 'P1 (esquerda)']] as const) {
    test(`${rotulo}: a folha FILME chega depois da luta começar; em cada um dos 3 especiais o close não encosta na borda inclinada e o mundo não aparece como fantasma atrás do painel`, async ({ page }) => {
      const erros = await abrir(page);
      const todas: { golpe: string; tick: number; margem: number; closes: number; fantasma: number | null; borda: number }[] = [];
      for (const golpe of ['sFwd', 'sFire', 'sDown']) {
        await abrirLuta(page, quem === 1 ? { c1: 'caio', c2: 'hayato' } : { c1: 'hayato', c2: 'caio' });
        await page.waitForFunction(() => (window as any).__inno.mundo().arte.filmesResidentes().includes('hayato'), undefined, { timeout: 30_000 });
        await hook(page, ESPIAR_PAINEL);
        expect(await soltar(page, quem, golpe, golpe === 'sFire' ? 240 : 140), `o HAYATO ${rotulo} abriu o filme de ${golpe}`).toBe(true);
        const dur: number = await hook(page, '(h) => h.ui.scene.filme.duracao');
        for (let t = 0; t < dur - 1; t++) {
          await hook(page, '(h) => h.avancar(1)');
          if (t % 2 !== 0) continue;
          await hook(page, '(h) => { window.__novoQuadro(false); h.desenhar(1); }');
          const m = await hook(page, MARGEM_DOS_CLOSES);
          if (!m.closes) continue;
          const f = await hook(page, FANTASMA_NO_PAINEL);
          todas.push({ golpe, tick: t, margem: m.margem, closes: m.closes, fantasma: f ? f.max : null, borda: m.borda });
        }
      }
      test.info().annotations.push({ type: `painel HAYATO ${rotulo} [golpe, tick, margem px, fantasma níveis, borda]`, description: JSON.stringify(todas.map((m) => [m.golpe, m.tick, +m.margem.toFixed(1), m.fantasma, +m.borda.toFixed(1)])) });
      expect(todas.length, 'o painel foi medido em vários quadros').toBeGreaterThan(10);
      // com o painel ainda DESLIZANDO o clip corta o close (pixels fora do painel não aparecem) e o quadro tem outras camadas: só valem os quadros com o painel parado
      const repouso = Math.min(...todas.map((m) => m.borda));
      const paradas = todas.filter((m) => m.borda <= repouso + 0.5);
      expect(paradas.length, 'quadros com o painel parado').toBeGreaterThan(8);
      const margemMin = Math.min(...paradas.map((m) => m.margem));
      const fantasmaMax = Math.max(...paradas.map((m) => m.fantasma ?? 0));
      expect(margemMin, `distância mínima do close à borda inclinada (px lógicos): ${margemMin.toFixed(1)}`).toBeGreaterThanOrEqual(3);
      // 6% do que está atrás aparece por baixo do fundo a 0,94: no máximo ~16 níveis; o 0,85 de antes dava ~38
      expect(fantasmaMax, `fantasma do mundo atrás do painel (níveis): ${fantasmaMax}`).toBeLessThanOrEqual(20);
      expect(erros).toEqual([]);
    });
  }
});

test.describe('ciclo da folha FILME na rede e na memória', () => {
  test('a seleção e a VS NÃO pedem filme.webp; ele só aparece na rede depois que a luta começa; solta ao sair pela pausa (MENU PRINCIPAL)', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('filme.webp')) pedidos.push(r.url());
    });
    const erros = await abrir(page);
    // seleção e VS
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); }`);
    await hook(page, '(h) => h.avancar(30)');
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('vs', { cfg: { mode: 'versus', c1: 'hayato', c2: 'hayato', cpu: null, esquiva: false } }); }`);
    await page.waitForTimeout(1500);
    await hook(page, '(h) => h.avancar(20)');
    expect(pedidos, 'seleção + VS: nenhum pedido de filme.webp').toEqual([]);
    expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()')).toEqual([]);
    // a luta
    await abrirLuta(page, { c1: 'hayato', c2: 'hayato' });
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.filmesResidentes().length > 0, undefined, { timeout: 30_000 });
    expect(pedidos.length, 'um pedido só (HAYATO x HAYATO = uma folha)').toBe(1);
    expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()')).toEqual(['hayato']);
    // pausa -> MENU PRINCIPAL -> SIM, SAIR (pelo teclado de verdade)
    await page.keyboard.press('Escape');
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(true);
    const rotulos: string[] = await hook(page, '(h) => h.ui.scene.m.itens?.map((i) => i.label) ?? h.ui.scene.m.items?.map((i) => i.label)');
    const alvo = rotulos.indexOf('MENU PRINCIPAL');
    expect(alvo, `itens da pausa: ${rotulos.join(' | ')}`).toBeGreaterThanOrEqual(0);
    const atual: number = await hook(page, '(h) => h.ui.scene.m.sel');
    for (let i = atual; i < alvo; i++) await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Enter');
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.view')).toBe('confirm');
    await page.keyboard.press('ArrowUp'); // "NÃO, CONTINUAR" é o padrão; "SIM, SAIR" fica em cima
    await page.keyboard.press('Enter');
    await hook(page, '(h) => h.avancar(80)'); // a transição (fade) termina sozinha
    expect(await hook(page, '(h) => h.ui.scene === h.ui.cenas.menu'), 'chegou ao menu').toBe(true);
    expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()'), 'a folha saiu da memória').toEqual([]);
    expect(erros).toEqual([]);
  });

  test('SEM a flag motorV2.filmes (o padrão): a luta inteira não faz nenhum pedido de filme.webp nem deixa folha na memória; com ela, a mesma luta pede', async ({ page }) => {
    const pedidos: string[] = [];
    page.on('request', (r) => {
      if (r.url().includes('filme.webp')) pedidos.push(r.url());
    });
    const erros = await abrir(page);
    await abrirLuta(page, { c1: 'hayato', c2: 'caio', motorV2: undefined }); // JSON.stringify descarta o undefined: a cfg nasce SEM motorV2, como a do jogo com as regras padrão
    expect(await hook(page, '(h) => h.mundo().game.filmesLigados'), 'guarda: o motor está sem filmes').toBe(false);
    await hook(page, '(h) => h.avancar(120)');
    await page.waitForTimeout(2000);
    expect(pedidos, 'nenhuma folha FILME pedida à rede').toEqual([]);
    expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()'), 'nenhuma folha na memória').toEqual([]);
    // controle positivo: a MESMA luta com a flag baixa as duas folhas
    await abrirLuta(page, { c1: 'hayato', c2: 'caio' });
    await page.waitForFunction(() => (window as any).__inno.mundo().arte.filmesResidentes().length === 2, undefined, { timeout: 30_000 });
    expect(pedidos.length, 'com a flag, uma folha por lutador').toBe(2);
    expect(erros).toEqual([]);
  });

  test('404 do filme.webp: o filme toca na pose de reserva (Alt), sem erro de página e sem folha residente', async ({ page }) => {
    await page.route('**/assets/lutadores/hayato/filme.webp', (r) => r.fulfill({ status: 404, body: 'nao tem' }));
    const avisos: string[] = [];
    page.on('console', (m) => m.type() === 'warning' && avisos.push(m.text()));
    const erros = await abrir(page);
    await abrirLuta(page, { c1: 'hayato', c2: 'caio' });
    await page.waitForTimeout(800);
    // o CAIO tem folha FILME própria desde 6fadc65 (as 10 páginas): ela carrega normalmente; só a do HAYATO (404) não pode ficar
    expect(await hook(page, '(h) => h.mundo().arte.filmesResidentes()'), 'só a folha do HAYATO falhou').toEqual(['caio']);
    await hook(page, ESPIAR_PAINEL);
    expect(await soltar(page, 0, 'sFwd', 140), 'o filme abre mesmo sem a folha').toBe(true);
    const dur: number = await hook(page, '(h) => h.ui.scene.filme.duracao');
    let celulas = 0;
    let celulasDoRival = 0;
    for (let t = 0; t < dur - 1; t++) {
      await hook(page, '(h) => h.avancar(1)');
      if (t % 4 === 0) {
        await hook(page, '(h) => { window.__novoQuadro(false); h.desenhar(1); }');
        // o painel também mostra o close do RIVAL, da folha DELE (o CAIO tem folha própria desde 6fadc65): conta-se por dono da folha
        const donos: (string | undefined)[] = await hook(page, `(h) => window.__quadro.cels.map((c) => [...h.mundo().arte.atlas.entries()].find(([, a]) => a.filmeImg === c.img)?.[0])`);
        celulas += donos.filter((d) => d !== 'caio').length;
        celulasDoRival += donos.filter((d) => d === 'caio').length;
      }
    }
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.filme.ativo')).toBe(false);
    expect(celulas, 'nenhuma célula da folha do HAYATO (404) foi desenhada (caiu na Alt)').toBe(0);
    expect(celulasDoRival, 'a folha do rival (CAIO, que carregou) continua desenhando o close dele').toBeGreaterThan(0);
    expect(avisos.some((a) => a.includes('[filme]')), `aviso "[filme] folha ... indisponivel": ${avisos.join(' / ')}`).toBe(true);
    expect(erros).toEqual([]);
  });
});
