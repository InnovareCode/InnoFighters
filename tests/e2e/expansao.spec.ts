/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { CHEFE, DESCRICAO_DO_ARCADE, GRADE_DE_PRODUCAO, PULAR_ENTRADA, urlComChefe } from './_chefe';
import { SEM_PROVOCACAO } from './_luta';

/*
 * E4/E5/Z2 — Arcade, seleção (3x3 + a CASA DE HONRA do chefão) e desbloqueio, no jogo REAL de 10 lutadores (AMINU, CENTELLA, CAMILLE, NILA e
 * BAATAR na fila de desbloqueio; o ZENON é o chefão do ARCADE e, derrotado, jogável: ver `_chefe.ts`). O jogo de 4 (as 40 telas de
 * fidelidade-ui e o ARCADE de 3 lutas de jogo.spec.ts) roda com `?expansao=4`. O progresso é semeado direto no localStorage v2 (sem
 * código de trapaça no jogo).
 */

test.describe.configure({ timeout: 120_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

async function esperarCena(page: Page, nome: string, timeout = 20_000): Promise<void> {
  await page.waitForFunction((n) => (window as any).__inno.ui.name === n && (window as any).__inno.ui.fadeTo === null, nome, { timeout });
}

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

/** Semeia a v2 (config rápida: 1 round, CPU fácil) com o progresso dado. */
async function semear(page: Page, prog: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((p) => {
    if (!window.localStorage.getItem('inno-fighters-v2')) {
      window.localStorage.setItem(
        'inno-fighters-v2',
        JSON.stringify({
          v: 2,
          s: { music: 0.45, sfx: 0.8, rounds: 1, time: 99, diff: 0, shake: true },
          hi: 0,
          prog: { desbloqueados: [], zeradas: 0, chefeDerrotado: false, vistos: [], ...p },
        }),
      );
    }
  }, prog);
}

const pasta = process.env['SALVAR_QUADROS'];
async function foto(page: Page, nome: string): Promise<void> {
  if (!pasta) return;
  mkdirSync(pasta, { recursive: true });
  const png = await page.locator('canvas#jogo').evaluate((el) => (el as HTMLCanvasElement).toDataURL('image/png'));
  writeFileSync(resolve(pasta, `${nome}.png`), Buffer.from(png.split(',')[1]!, 'base64'));
}

/** Abre uma cena direto (sem fade) no modo manual: o teste dá os ticks e desenha quando quer. */
const abrirCena = (page: Page, cena: string, args: unknown, ticks = 0): Promise<void> =>
  page.evaluate(
    ({ cena, args, ticks }) => {
      const h = (window as any).__inno;
      h.ui.fade = 0;
      h.ui.fadeDir = 0;
      h.ui.fadeTo = null;
      h.ui.set(cena, args);
      if (ticks) h.avancar(ticks);
      h.desenhar();
    },
    { cena, args, ticks },
  );

test.describe('seleção de 10 (3x3 + casa de honra) com estados', () => {
  test('PRODUÇÃO: o chefão na casa de honra ("???"), o BAATAR na 9ª, travados, NOVO! e travado que não confirma', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page, { desbloqueados: ['aminu'], zeradas: 1 });
    await page.goto(`/?${urlComChefe('seed=3&manual=1')}`);
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await abrirCena(page, 'select', { mode: 'versus' }, 30);

    const a = await hook(page, '(h) => { const s = h.ui.scene; return { grade: s.grade, novos: [...s.novos], vistos: h.persist.prog.vistos, cur: s.cur, chefe: h.ui.c.regras.chefe }; }');
    expect(a.chefe).toBe(CHEFE.id);
    expect(a.grade).toEqual([...GRADE_DE_PRODUCAO]); // os 9 regulares na ordem do roster (BAATAR na 9ª casa) e o chefão por último: a casa de honra
    expect(a.novos).toEqual(['aminu']);
    expect(a.vistos).toEqual(['aminu']); // ao abrir já conta como visto
    expect(JSON.parse(await page.evaluate(() => window.localStorage.getItem('inno-fighters-v2')!)).prog.vistos).toEqual(['aminu']);
    expect(a.cur).toEqual([0, 1]);
    await foto(page, 'selecao-10-inicio');

    // estados medidos com o código real da grade: o chefão é "???" (chefe-oculto); o BAATAR é lutador comum, travado como os da fila
    const estados = await page.evaluate(async () => {
      const h = (window as any).__inno;
      const { estadoDaCasa } = await import(/* @vite-ignore */ ('/src/ui/grade.ts' as string));
      const cena = h.ui.scene;
      const c = { prog: h.persist.prog, regras: h.ui.c.regras, novos: cena.novos };
      return Object.fromEntries(cena.grade.map((id: string) => [id, estadoDaCasa(id, c)]));
    });
    expect(estados).toEqual({
      hayato: 'liberado', 'wei-long': 'liberado', 'min-ji': 'liberado', caio: 'liberado',
      aminu: 'novo', centella: 'travado', camille: 'travado', nila: 'travado', baatar: 'travado', [CHEFE.id]: 'chefe-oculto',
    });

    // 3 colunas medidas no navegador: 9 casas de 80 px dentro do canvas, sem sobreposição, a do centro centrada; a 10ª é a faixa de honra
    const caixas = await hook(page, '(h) => Array.from({ length: 10 }, (_, i) => h.ui.scene.tileRect(i))');
    expect(caixas[4].x + caixas[4].w / 2).toBe(480);
    for (const c of caixas.slice(0, 9)) expect(c.w).toBe(80);
    expect(caixas[8].x + caixas[8].w).toBeLessThanOrEqual(960);
    expect(caixas[9]).toEqual({ x: 404, y: 356, w: 204, h: 44 }); // a honra dividiu a faixa com a casa aleatória (o quadradinho de 44 px, índice 10)

    // teclas reais: do HAYATO (índice 0) ↓ ↓ = CAMILLE (6) (travada: o cursor anda por cima, Enter não confirma)
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe('camille');
    await page.keyboard.press('Enter');
    expect(await hook(page, '(h) => ({ lock: h.ui.scene.lock, done: h.ui.scene.done })')).toEqual({ lock: [false, false], done: 0 });
    // → → chega ao BAATAR (9ª casa): travado, não confirma (como qualquer outro da fila, e sem "???")
    await page.keyboard.press('ArrowRight');
    await page.keyboard.press('ArrowRight');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe('baatar');
    await page.keyboard.press('Enter');
    expect((await hook(page, '(h) => h.ui.scene.lock'))[0]).toBe(false);
    await hook(page, '(h) => h.desenhar()');
    await foto(page, 'selecao-10-baatar-travado');
    // ↓ vai à casa de honra: o chefão oculto, o cursor anda por cima, Enter não confirma
    await page.keyboard.press('ArrowDown');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe(CHEFE.id);
    await page.keyboard.press('Enter');
    expect((await hook(page, '(h) => h.ui.scene.lock'))[0]).toBe(false);
    await hook(page, '(h) => h.desenhar()');
    await foto(page, 'selecao-10-honra-oculto');
    // ← vai à casa aleatória e → volta à honra (a faixa de baixo tem duas casas); ↑ da honra vai para a 7 (NILA), ↑ de novo para a 4 (AMINU: liberado, com selo NOVO!), que confirma
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('ArrowRight');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe(CHEFE.id);
    await page.keyboard.press('ArrowUp');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe('nila');
    await page.keyboard.press('ArrowUp');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe('aminu');
    await page.keyboard.press('Enter');
    expect((await hook(page, '(h) => h.ui.scene.lock'))[0]).toBe(true);

    // reabrir a seleção: o selo NOVO! já não aparece
    await abrirCena(page, 'select', { mode: 'versus' }, 5);
    expect(await hook(page, '(h) => [...h.ui.scene.novos]')).toEqual([]);
    expect(erros).toEqual([]);
  });

  test('PRODUÇÃO: o BAATAR desbloqueado confirma como qualquer lutador, na 9ª casa', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    const todos = ['aminu', 'centella', 'camille', 'nila', 'baatar'];
    await semear(page, { desbloqueados: todos, zeradas: 5, vistos: todos });
    await page.goto('/?seed=3&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await abrirCena(page, 'select', { mode: 'versus' }, 30);
    await hook(page, '(h) => { h.ui.scene.cur[0] = 8; }');
    expect(await hook(page, '(h) => h.ui.scene.grade[h.ui.scene.cur[0]]')).toBe('baatar');
    await page.keyboard.press('Enter');
    expect((await hook(page, '(h) => h.ui.scene.lock'))[0]).toBe(true);
    expect(erros).toEqual([]);
  });

  test('o toque cabe: casa de 80 px lógicos vira pelo menos 44 px CSS em desktop e em celular deitado', async ({ page }, info) => {
    await semear(page);
    await page.setViewportSize(info.project.name === 'celular' ? { width: 915, height: 412 } : { width: 1280, height: 720 });
    await page.goto('/?seed=3&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const larguraCss = (await page.locator('canvas#jogo').boundingBox())!.width;
    const casaCss = (80 * larguraCss) / 960;
    info.annotations.push({ type: 'toque', description: `canvas ${larguraCss.toFixed(0)} px CSS => casa 3x3 de ${casaCss.toFixed(1)} px` });
    expect(casaCss).toBeGreaterThanOrEqual(44); // alvo de toque mínimo (WCAG 2.5.5 / Material)
  });

  test('PRODUÇÃO: o menu mostra a escada com chefão', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await semear(page);
    await page.goto(`/?${urlComChefe('seed=3&manual=1')}`);
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await abrirCena(page, 'menu', undefined, 5);
    expect(await hook(page, '(h) => h.ui.scene.m.items[0].desc')).toBe(DESCRICAO_DO_ARCADE);
  });

});

test.describe('ARCADE de PRODUÇÃO com o chefão ZENON, de ponta a ponta (teclado real)', () => {
  test('5 rivais sorteados + chefão: aviso, VS do chefão, final, e os dois avisos de desbloqueio', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    test.setTimeout(300_000);
    const erros = coletarErros(page);
    await semear(page);
    await page.goto(`/?${urlComChefe('seed=11')}`);
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('diff', { mode: 'arcade', c1: 'min-ji', c2: 'hayato' }); }");
    await page.keyboard.press('Enter'); // dificuldade
    await esperarCena(page, 'vs');

    const etapas = await hook(page, '(h) => h.ui.run.etapas');
    expect(etapas).toHaveLength(6);
    expect(etapas[5]).toEqual({ id: CHEFE.id, chefe: true });
    expect(etapas.slice(0, 5).every((e: any) => !e.chefe && e.id !== 'min-ji' && e.id !== CHEFE.id)).toBe(true);
    expect(await hook(page, '(h) => h.ui.scene.a.cfg.chefe')).toBeUndefined();

    for (let luta = 0; luta < 6; luta++) {
      if (luta === 5) {
        // depois do 5º rival vem o aviso de chefe, depois o VS do chefão
        await esperarCena(page, 'chefe', 30_000);
        await foto(page, 'aviso-de-chefe');
        await page.waitForTimeout(900);
        await page.keyboard.press('Enter');
      }
      await esperarCena(page, 'vs', 30_000);
      if (luta === 5) {
        expect(await hook(page, '(h) => h.ui.scene.a.cfg')).toMatchObject({ mode: 'arcade', c2: CHEFE.id, chefe: true });
        await page.waitForTimeout(700);
        await foto(page, 'vs-do-chefao');
      }
      await page.waitForTimeout(700);
      await page.keyboard.press('Enter');
      await esperarCena(page, 'fight', 20_000);
      await hook(page, SEM_PROVOCACAO); // a provocação (balões) é outro assunto: o gancho de teste a desliga (spec da provocação, auditoria da P2)
      await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 20_000 });
      // o rival cai com poucos golpes; o chefão tem 2 barras e uma Dança no meio (fase 'cena-chefe'): derruba a 2ª também
      const fotografado = new Set<string>();
      for (let i = 0; i < 160; i++) {
        const fase = await hook(page, '(h) => h.mundo().game.phase');
        if (fase !== 'fight' && fase !== 'cena-chefe') break;
        if (luta === 5) {
          // SALVAR_QUADROS: o chefão da ARCADE de verdade (1ª barra, cena, fase 2) com o jogador na arte nova
          const barras = await hook(page, '(h) => h.mundo().game.p2.barras');
          const quando = fase === 'cena-chefe' ? 'cena' : barras === 1 ? 'fase-2' : 'fase-1';
          if (!fotografado.has(quando)) {
            fotografado.add(quando);
            await foto(page, `arcade-${CHEFE.id}-${quando}`);
          }
        }
        if (fase === 'fight') {
          await hook(page, '(h) => { const g = h.mundo().game; g.p1.hp = g.p1.maxHp; if (g.p2.hp > 3) { g.p2.hp = 3; g.p2.hpShown = 3; } g.p1.x = g.p2.x - 80; }');
          await page.keyboard.press('z');
        }
        await page.waitForTimeout(80);
      }
      await esperarCena(page, luta < 4 ? 'vs' : luta === 4 ? 'chefe' : 'ending', 40_000);
      if (luta === 4) await page.waitForTimeout(0);
    }

    // zerou: o final grava o progresso (fila primeiro, chefão depois) e mostra um aviso por lutador novo
    const prog = await hook(page, '(h) => h.persist.prog');
    expect(prog).toMatchObject({ desbloqueados: [CHEFE.fila1, CHEFE.id], zeradas: 1, chefeDerrotado: true, chefesDerrotados: [CHEFE.id] });
    expect(await hook(page, '(h) => h.ui.scene.novos')).toEqual([CHEFE.fila1, CHEFE.id]);
    await page.waitForTimeout(1200);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'desbloqueio');
    expect(await hook(page, '(h) => h.ui.scene.indice')).toBe(0);
    await page.waitForTimeout(900);
    await foto(page, 'desbloqueio-1');
    await page.keyboard.press('Enter');
    await esperarCena(page, 'desbloqueio');
    expect(await hook(page, '(h) => h.ui.scene.indice')).toBe(1);
    await page.waitForTimeout(900);
    await foto(page, 'desbloqueio-2');
    await page.keyboard.press('Enter');
    await esperarCena(page, 'title');

    // gravado em disco (v2) e a próxima seleção mostra os dois com o selo NOVO!
    const salvo = JSON.parse(await page.evaluate(() => window.localStorage.getItem('inno-fighters-v2')!));
    expect(salvo.prog).toMatchObject({ desbloqueados: [CHEFE.fila1, CHEFE.id], zeradas: 1, chefeDerrotado: true, chefesDerrotados: [CHEFE.id] });
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'versus' }); }");
    expect(await hook(page, '(h) => [...h.ui.scene.novos].sort()')).toEqual([CHEFE.fila1, CHEFE.id].sort());
    expect(erros).toEqual([]);
  });
});

test.describe('chefão na tela (cenas e HUD de barras)', () => {
  test('aviso, VS e HUD de 2 barras desenham e se medem no navegador', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page, { desbloqueados: [CHEFE.fila1, CHEFE.id], zeradas: 1, chefeDerrotado: true, vistos: [CHEFE.fila1, CHEFE.id] });
    await page.goto(`/?${urlComChefe('seed=4&manual=1')}`);
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const cfg = { mode: 'arcade', c1: 'hayato', c2: CHEFE.id, cpu: 0, chefe: true };
    const run = { c1: 'hayato', etapas: [{ id: CHEFE.id, chefe: true }], idx: 0, score: 1200, continues: 3, diff: 0, cont: 0 };

    // conta de pixels de um canto/região do canvas (backing 1920x1080) que satisfazem um critério
    const contar = (x: number, y: number, w: number, h: number, criterio: string): Promise<number> =>
      page.locator('canvas#jogo').evaluate(
        (el, p) => {
          const c = el as HTMLCanvasElement;
          const d = c.getContext('2d')!.getImageData(p.x, p.y, p.w, p.h).data;
          const f = new Function('r', 'g', 'b', `return ${p.criterio};`) as (r: number, g: number, b: number) => boolean;
          let n = 0;
          for (let i = 0; i < d.length; i += 4) if (f(d[i]!, d[i + 1]!, d[i + 2]!)) n++;
          return n;
        },
        { x, y, w, h, criterio },
      );

    // 1) aviso: fundo avermelhado e o texto dourado/branco no alto
    await abrirCena(page, 'chefe', { cfg, run }, 60);
    await foto(page, 'e4-aviso');
    expect(await contar(0, 0, 300, 1080, 'r >= g + 25 && r >= b + 15')).toBeGreaterThan(300 * 1080 * 0.5); // bordas avermelhadas (pulso)
    expect(await contar(400, 100, 1100, 200, 'r > 240 && g > 180 && b > 170')).toBeGreaterThan(500); // título claro

    // 2) VS do chefão: faixa CHEFÃO dourada no centro-alto e fundo avermelhado
    await abrirCena(page, 'vs', { cfg, run }, 60);
    await foto(page, 'e4-vs-chefao');
    expect(await contar(760, 40, 400, 80, 'r > 240 && g > 150 && b < 120')).toBeGreaterThan(300); // dourado do "CHEFÃO"
    const vsNormal = { ...cfg, chefe: undefined };
    await abrirCena(page, 'vs', { cfg: vsNormal, run }, 60);
    expect(await contar(760, 40, 400, 80, 'r > 240 && g > 150 && b < 120')).toBeLessThan(40); // sem chefão, sem a faixa

    // 3) HUD com 2 barras: a barra de baixo (roxa) aparece por trás, onde a atual já esvaziou (hp 50%); na última barra
    //    some; o jogo de hoje nem tem os campos
    await abrirCena(page, 'fight', { cfg }, 0);
    await hook(page, PULAR_ENTRADA); // a entrada dramática esconde o HUD: aqui se mede o HUD
    await hook(page, '(h) => { h.avancar(100); h.desenhar(); }');
    const roxo = 'b > 150 && r > 60 && r < 235 && g < 150 && b > r + 20';
    const regiaoBarra = [1048, 48, 664, 52] as const; // barra do lado direito (P2), px do canvas real
    await hook(page, '(h) => { const f = h.mundo().game.p2; f.hp = f.hpShown = f.maxHp / 2; f.barras = 2; f.barrasMax = 2; f.chefe = true; h.desenhar(); }');
    await foto(page, 'e4-hud-2-barras');
    const comDuas = await contar(...regiaoBarra, roxo);
    expect(comDuas).toBeGreaterThan(300);
    await hook(page, '(h) => { const f = h.mundo().game.p2; f.barras = 1; h.desenhar(); }');
    expect(await contar(...regiaoBarra, roxo)).toBeLessThan(comDuas / 10);
    await hook(page, '(h) => { const f = h.mundo().game.p2; delete f.barras; delete f.barrasMax; delete f.chefe; h.desenhar(); }');
    expect(await contar(...regiaoBarra, roxo)).toBeLessThan(comDuas / 10);
    expect(erros).toEqual([]);
  });
});

test.describe('progresso de uma onda futura (rollback)', () => {
  test('ids desconhecidos sobrevivem à seleção e ao final do ARCADE (a UI passa o prog inteiro)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await semear(page, { desbloqueados: ['aminu'], desconhecidos: ['onda2-x', 'onda2-y'], zeradas: 1, vistos: ['aminu'] });
    await page.goto('/?seed=5&manual=1');
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    const emDisco = (): Promise<any> => page.evaluate(() => JSON.parse(window.localStorage.getItem('inno-fighters-v2')!).prog);

    // 1) abrir a seleção marca vistos (marcarVistos) e grava: os desconhecidos continuam em memória e em disco
    await abrirCena(page, 'select', { mode: 'versus' }, 5);
    expect((await hook(page, '(h) => h.persist.prog')).desconhecidos).toEqual(['onda2-x', 'onda2-y']);
    expect((await emDisco()).desconhecidos).toEqual(['onda2-x', 'onda2-y']);

    // 2) zerar o ARCADE (aplicarVitoriaArcade + salvar): idem, e o ganho novo entra sem perder os de fora
    const run = { c1: 'hayato', etapas: [{ id: 'caio', chefe: false }], idx: 1, score: 900, continues: 3, diff: 0, cont: 0 };
    await abrirCena(page, 'ending', { run });
    const depois = await emDisco();
    expect(depois.desconhecidos).toEqual(['onda2-x', 'onda2-y']);
    expect(depois.zeradas).toBe(2);
    expect(depois.desbloqueados).toContain('aminu');
    expect(erros).toEqual([]);
  });
});
