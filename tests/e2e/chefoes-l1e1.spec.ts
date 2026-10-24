/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type Page } from '@playwright/test';
import { TEXTOS_COMUNS, TEXTOS_DOS_CHEFOES } from '../../src/render/textos-dos-chefoes';
import { SEM_PROVOCACAO } from './_luta';

/*
 * L1/E1 (Lyra): os CHEFÕES PROGRESSIVOS e as ENTRADAS POR ROTEIRO medidos no navegador, com a arte real e as fontes reais. A lógica está provada em
 * tests/unit/{l1e1-chefoes,p1-chefes-progressivos}.test.ts; aqui o que só o navegador prova: texto sem estourar (desktop e celular deitado), o cartão, o VS, o
 * desbloqueio, a entrada de cada guardião (o motor parado por 270 ticks, o efeito de cena e o zoom desenhados de verdade, sem bordas pretas), a aura da fase 2 nos
 * guardiões e a campanha de ponta a ponta pela UI com saves reais (S1, S3, S6, S7).
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 (aviso, entrada, VS, KO e desbloqueio de cada guardião).
 */

test.describe.configure({ timeout: 240_000 });

const GUARDIOES = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const;
type Guardiao = (typeof GUARDIOES)[number];
const NOMES: Record<Guardiao | 'zenon', string> = { aminu: 'AMINU', centella: 'CENTELLA', camille: 'CAMILLE', nila: 'NILA', baatar: 'BAATAR', zenon: 'ZENON' };
const PASTA = process.env['SALVAR_CAPTURAS'];

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

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

type Texto = { t: string; x: number; y: number; px: number; w: number; align: string; css: number };

/** Espia o `fillText`: com `window.__textos` em lista, cada texto entra com posição (lógica), tamanho e largura medida (com a fonte REAL). */
async function espiarTextos(page: Page): Promise<void> {
  await page.evaluate(() => {
    const w = window as any;
    w.__textos = null;
    if (w.__espiaInstalada) return;
    w.__espiaInstalada = true;
    const o = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: [number?]) {
      const lista = w.__textos as any[] | null;
      if (lista) {
        const tf = this.getTransform();
        const px = parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '0');
        lista.push({ t: String(t), x: tf.e / 2 + x * (tf.a / 2), y: tf.f / 2 + y * (tf.d / 2), px: px * (tf.d / 2), w: this.measureText(String(t)).width * (tf.a / 2), align: this.textAlign, css: px * tf.a * (this.canvas.clientWidth / this.canvas.width) });
      }
      return o.call(this, t, x, y, ...(r as []));
    };
  });
}
const textosDoQuadro = async (page: Page): Promise<Texto[]> =>
  page.evaluate(() => {
    const w = window as any;
    w.__textos = [];
    w.__inno.desenhar();
    const r = w.__textos;
    w.__textos = null;
    return r;
  });

/** Os limites de um texto na tela lógica (960x540): esquerda e direita, de acordo com o alinhamento. */
const extremos = (q: Texto): { e: number; d: number } => (q.align === 'left' || q.align === 'start' ? { e: q.x, d: q.x + q.w } : q.align === 'right' || q.align === 'end' ? { e: q.x - q.w, d: q.x } : { e: q.x - q.w / 2, d: q.x + q.w / 2 });
const MARGEM = 16;
function dentroDaTela(textos: Texto[], quais: string[], rotulo: string): void {
  for (const t of quais) {
    const q = textos.find((x) => x.t === t);
    expect(q, `${rotulo}: "${t}" desenhado`).toBeDefined();
    const { e, d } = extremos(q as Texto);
    expect(e, `${rotulo}: "${t}" esquerda`).toBeGreaterThanOrEqual(MARGEM);
    expect(d, `${rotulo}: "${t}" direita`).toBeLessThanOrEqual(960 - MARGEM);
  }
}

async function abrirJogo(page: Page, perfil: 'desktop' | 'celular', prog: Record<string, unknown> = {}): Promise<void> {
  await page.addInitScript((p) => {
    if (!window.localStorage.getItem('inno-fighters-v2')) {
      window.localStorage.setItem('inno-fighters-v2', JSON.stringify({ v: 2, s: { music: 0.45, sfx: 0.8, rounds: 1, time: 99, diff: 0, shake: true }, hi: 0, prog: { desbloqueados: [], zeradas: 0, chefeDerrotado: false, vistos: [], ...p } }));
    }
  }, prog);
  if (perfil === 'celular') await page.setViewportSize({ width: 915, height: 412 });
  await page.goto('/?seed=3&manual=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

/** O progresso em memória (e só nele): liberados e, se pedido, o chefão já derrotado. */
const poeProg = (page: Page, ids: string[], extra: Record<string, unknown> = {}): Promise<void> =>
  hook(page, `(h) => { h.persist.prog = { ...h.persist.prog, desbloqueados: ${JSON.stringify(ids)}, vistos: ${JSON.stringify(ids)}, ...${JSON.stringify(extra)} }; }`);

const FILA_TODA = [...GUARDIOES];
const argsDe = (c2: string, extra: Record<string, unknown> = {}, run?: Record<string, unknown>) => ({
  cfg: { mode: 'arcade', c1: 'hayato', c2, cpu: null, chefe: true, esquiva: true, ...extra },
  run: run ?? { c1: 'hayato', etapas: [{ id: c2, chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0 },
});
const ir = (page: Page, cena: string, args: unknown): Promise<void> => hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('${cena}', ${JSON.stringify(args)}); }`);

async function abrirLuta(page: Page, c2: string, run?: Record<string, unknown>): Promise<void> {
  await ir(page, 'fight', argsDe(c2, {}, run));
  await hook(page, SEM_PROVOCACAO);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
}

const perfis = ['desktop', 'celular'] as const;

test.describe('aviso, VS e cartão de desbloqueio de cada guardião (textos dentro da tela)', () => {
  for (const perfil of perfis) {
    test(`${perfil}: aviso e rodapé do Apolo, rótulo do VS sem "Vença N rounds", epílogo no desbloqueio, tudo dentro dos 960 px`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      await espiarTextos(page);
      const medidas: string[] = [];
      for (const g of GUARDIOES) {
        const t = TEXTOS_DOS_CHEFOES[g]!;
        const k = GUARDIOES.indexOf(g);
        const liberados = FILA_TODA.slice(0, k);
        // --- aviso
        await poeProg(page, liberados);
        await ir(page, 'chefe', argsDe(g));
        await hook(page, '(h) => h.avancar(90)');
        let q = await textosDoQuadro(page);
        const nomes = q.map((x) => x.t);
        expect(nomes, `${g} aviso`).toEqual(expect.arrayContaining([t.aviso![0], t.aviso![1], t.avisoRodape]));
        expect(nomes, `${g}: o aviso não mostra o rodapé do ZENON`).not.toContain('A última luta do torneio: 1 round, 2 barras de vida.');
        dentroDaTela(q, [t.aviso![0], t.aviso![1], t.avisoRodape], `${g} aviso`);
        for (const l of t.aviso!) expect(q.find((x) => x.t === l)!.px, `${g} aviso`).toBeCloseTo(58, 0);
        medidas.push(`${g} aviso: ${Math.max(...t.aviso!.map((l) => q.find((x) => x.t === l)!.w)).toFixed(0)} px (linha mais larga), rodapé ${q.find((x) => x.t === t.avisoRodape)!.w.toFixed(0)} px`);
        await capturar(page, `chefoes-l1e1-${g}-aviso-${perfil}`);
        // --- VS
        await ir(page, 'vs', argsDe(g));
        await page.waitForFunction(() => (window as any).__inno.ui.scene.espera?.pronta === true, undefined, { timeout: 60_000 });
        await hook(page, '(h) => h.avancar(70)');
        q = await textosDoQuadro(page);
        expect(q.map((x) => x.t), `${g} VS`).toContain(t.vs);
        expect(q.some((x) => x.t.startsWith('Vença')), `${g}: luta de chefe tem 1 round: sem "Vença N rounds"`).toBe(false);
        dentroDaTela(q, [t.vs], `${g} VS`);
        medidas.push(`${g} VS: "${t.vs}" ${q.find((x) => x.t === t.vs)!.w.toFixed(0)} px`);
        await capturar(page, `chefoes-l1e1-${g}-vs-${perfil}`);
        // --- desbloqueio
        await poeProg(page, [...liberados, g]);
        await ir(page, 'desbloqueio', { novos: [g] });
        await hook(page, '(h) => h.avancar(60)');
        q = await textosDoQuadro(page);
        const titulo = TEXTOS_COMUNS.desbloqueioGuardiao.replace('{NOME}', NOMES[g]);
        expect(q.map((x) => x.t), `${g}: o título cabe e não cai na reserva`).toContain(titulo);
        expect(q.map((x) => x.t)).not.toContain(TEXTOS_COMUNS.desbloqueioGuardiaoReserva);
        const ep = t.epilogo;
        dentroDaTela(q, [titulo, ep.quem, ep.porque, `“${ep.convite}”`], `${g} desbloqueio`);
        medidas.push(`${g} desbloqueio: título ${q.find((x) => x.t === titulo)!.w.toFixed(0)} px, linhas ${[ep.quem, ep.porque].map((l) => q.find((x) => x.t === l)!.w.toFixed(0)).join('/')} px, convite ${q.find((x) => x.t === `“${ep.convite}”`)!.w.toFixed(0)} px`);
        await capturar(page, `chefoes-l1e1-${g}-desbloqueio-${perfil}`);
      }
      console.log(`[${perfil}]\n${medidas.join('\n')}`);
      expect(erros).toEqual([]);
    });
  }

  test('o ZENON: aviso da 1ª vez, revanche (já derrotado), VS "O ANFITRIÃO" e desbloqueio "O ANFITRIÃO SE RENDE" com epílogo', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await espiarTextos(page);
    const z = TEXTOS_DOS_CHEFOES['zenon']!;
    await poeProg(page, FILA_TODA);
    await ir(page, 'chefe', argsDe('zenon'));
    await hook(page, '(h) => h.avancar(90)');
    let q = await textosDoQuadro(page);
    expect(q.map((x) => x.t)).toEqual(expect.arrayContaining(['O ANFITRIÃO', 'ESTÁ À SUA ESPERA', z.avisoRodape]));
    await capturar(page, 'chefoes-l1e1-zenon-aviso-desktop');
    // revanche: ele já foi derrotado
    await poeProg(page, [...FILA_TODA, 'zenon'], { chefesDerrotados: ['zenon'], chefeDerrotado: true });
    await ir(page, 'chefe', argsDe('zenon'));
    await hook(page, '(h) => h.avancar(90)');
    q = await textosDoQuadro(page);
    expect(q.map((x) => x.t)).toEqual(expect.arrayContaining(['O ANFITRIÃO', 'QUER REVANCHE', z.avisoRodapeRevanche!]));
    dentroDaTela(q, ['QUER REVANCHE', z.avisoRodapeRevanche!], 'zenon revanche');
    await capturar(page, 'chefoes-l1e1-zenon-aviso-revanche-desktop');
    await ir(page, 'vs', argsDe('zenon'));
    await page.waitForFunction(() => (window as any).__inno.ui.scene.espera?.pronta === true, undefined, { timeout: 60_000 });
    await hook(page, '(h) => h.avancar(70)');
    q = await textosDoQuadro(page);
    expect(q.map((x) => x.t)).toContain('ARCADE — O ANFITRIÃO');
    await capturar(page, 'chefoes-l1e1-zenon-vs-desktop');
    await ir(page, 'desbloqueio', { novos: ['zenon'] });
    await hook(page, '(h) => h.avancar(60)');
    q = await textosDoQuadro(page);
    expect(q.map((x) => x.t)).toEqual(expect.arrayContaining(['O ANFITRIÃO SE RENDE', z.epilogo.quem, z.epilogo.porque, `“${z.epilogo.convite}”`]));
    dentroDaTela(q, ['O ANFITRIÃO SE RENDE', z.epilogo.quem, z.epilogo.porque, `“${z.epilogo.convite}”`], 'zenon desbloqueio');
    await capturar(page, 'chefoes-l1e1-zenon-desbloqueio-desktop');
    expect(erros).toEqual([]);
  });
});

test.describe('seleção: o que as casas fechadas dizem', () => {
  for (const perfil of perfis) {
    test(`${perfil}: o próximo guardião, os outros e o Anfitrião; nenhuma linha sem o nome nem o gênero e nada estoura o painel`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      await espiarTextos(page);
      const casos: Array<[string, string[], string, readonly string[]]> = [
        ['proximo-aminu', [], 'aminu', TEXTOS_COMUNS.selecao.proximo],
        ['outro-nila', [], 'nila', TEXTOS_COMUNS.selecao.outros],
        ['proximo-camille', ['aminu', 'centella'], 'camille', TEXTOS_COMUNS.selecao.proximo],
        ['anfitriao', ['aminu', 'centella'], 'zenon', TEXTOS_COMUNS.selecao.anfitriao],
      ];
      for (const [rotulo, liberados, alvo, linhas] of casos) {
        await poeProg(page, liberados);
        await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('select', { mode: 'arcade' }); const S = h.ui.scene; S.cur[0] = S.grade.indexOf('${alvo}'); h.avancar(10); }`);
        const q = await textosDoQuadro(page);
        const nomes = q.map((x) => x.t);
        // painel lateral (linhas sem quebra ou quebradas) e painel central: o texto inteiro aparece nos dois, sem sair do painel (x 20 a 304 e x 366 a 594)
        const lateral = q.filter((x) => x.x < 310 && x.y > 400 && x.t !== '???' && x.t !== 'VOCÊ');
        const textoLateral = lateral.map((x) => x.t).join(' ');
        for (const l of linhas) expect(textoLateral.replace(/\s+/g, ' '), `${rotulo} lateral`).toContain(l.split(' ').slice(0, 3).join(' '));
        for (const x of lateral) expect(extremos(x).d, `${rotulo}: "${x.t}" dentro do painel lateral`).toBeLessThanOrEqual(20 + 284 - 8);
        const central = q.filter((x) => x.x > 350 && x.x < 610 && x.y > 400 && x.y < 505 && x.t !== '???' && x.t !== 'ALEATÓRIO');
        for (const x of central) {
          expect(extremos(x).e, `${rotulo}: "${x.t}" painel central`).toBeGreaterThanOrEqual(352);
          expect(extremos(x).d, `${rotulo}: "${x.t}" painel central`).toBeLessThanOrEqual(608);
        }
        expect(nomes.some((n) => /guardi[ãa]/i.test(n)), `${rotulo}: não diz "guardião/guardiã"`).toBe(false);
        expect(nomes.some((n) => /-[oa]\b/.test(n) && n.includes('Derrote') && alvo !== 'zenon'), `${rotulo}: sem pronome de gênero`).toBe(false);
        await capturar(page, `chefoes-l1e1-select-${rotulo}-${perfil}`);
      }
      expect(erros).toEqual([]);
    });
  }
});

test.describe('a ENTRADA de cada guardião, no navegador', () => {
  for (const perfil of perfis) {
    test(`${perfil}: o motor fica parado por 270 ticks, o HUD some, o cartão e a fala cabem entre as faixas e o efeito de cena está desenhado de verdade`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      await espiarTextos(page);
      const medidas: string[] = [];
      for (const g of GUARDIOES) {
        const t = TEXTOS_DOS_CHEFOES[g]!;
        const k = GUARDIOES.indexOf(g);
        await poeProg(page, FILA_TODA.slice(0, k));
        await abrirLuta(page, g);
        const antes = await hook(page, '(h) => { const G = h.mundo().game; return { tick: G.tick, t: G.t, fase: G.phase, rng: G.rng.estado ? G.rng.estado() : null }; }');
        await hook(page, '(h) => h.avancar(1)');
        expect(await hook(page, '(h) => h.ui.scene.entrada.ativa'), `${g} entrada ativa`).toBe(true);
        expect(await hook(page, '(h) => h.ui.scene.entrada.modo'), g).toBe('completa');
        // as batidas: o índice anda e cada pose é uma das do roteiro
        const batidas: Array<{ em: number; pose: string }> = await hook(page, '(h) => h.ui.scene.entrada.batidas.map((b) => ({ em: b.em, pose: b.pose }))');
        expect(batidas.length, g).toBeGreaterThanOrEqual(3);
        await hook(page, '(h) => h.avancar(29)'); // tick 30
        expect(await hook(page, '(h) => { const G = h.mundo().game; return { tick: G.tick, t: G.t, fase: G.phase, rng: G.rng.estado ? G.rng.estado() : null }; }'), `${g}: o motor não andou`).toEqual(antes);
        await capturar(page, `chefoes-l1e1-${g}-entrada-t030-${perfil}`);
        await hook(page, '(h) => h.avancar(40)'); // 70
        await capturar(page, `chefoes-l1e1-${g}-entrada-t070-${perfil}`);
        // efeito de cena A/B no tick 120: o mesmo quadro com o efeito do roteiro e com o dos braseiros (que não desenha nada fora da arena gr)
        await hook(page, '(h) => h.avancar(50)'); // 120
        const diff: number = await page.evaluate(() => {
          const h = (window as any).__inno;
          const cv = document.getElementById('jogo') as HTMLCanvasElement;
          const ler = (): Uint8ClampedArray => {
            h.desenhar();
            const c2 = document.createElement('canvas');
            c2.width = 480;
            c2.height = 270;
            const x = c2.getContext('2d') as CanvasRenderingContext2D;
            x.drawImage(cv, 0, 0, 480, 270);
            return x.getImageData(0, 0, 480, 270).data;
          };
          const a = ler();
          const a2 = ler();
          const e = h.ui.scene.entrada;
          const guardado = e.roteiro;
          e.roteiro = { ...guardado, efeito: 'braseiros-gr' };
          const b = ler();
          e.roteiro = guardado;
          let controle = 0;
          let total = 0;
          for (let i = 0; i < a.length; i += 4) {
            if (Math.abs((a[i] as number) - (a2[i] as number)) + Math.abs((a[i + 1] as number) - (a2[i + 1] as number)) + Math.abs((a[i + 2] as number) - (a2[i + 2] as number)) > 6) controle++;
            if (Math.abs((a[i] as number) - (b[i] as number)) + Math.abs((a[i + 1] as number) - (b[i + 1] as number)) + Math.abs((a[i + 2] as number) - (b[i + 2] as number)) > 6) total++;
          }
          return total * 100000 + controle; // dois números num só (evita um 2º evaluate): total em centenas de milhar, controle no resto
        });
        const dEfeito = Math.floor(diff / 100000);
        const dControle = diff % 100000;
        expect(dControle, `${g}: dois desenhos do mesmo quadro são idênticos (controle negativo)`).toBe(0);
        expect(dEfeito, `${g}: o efeito de cena muda pixels do quadro`).toBeGreaterThan(150);
        medidas.push(`${g}: efeito muda ${dEfeito} de 129600 px (480x270)`);
        await hook(page, '(h) => h.avancar(80)'); // 200: cartão e fala
        await capturar(page, `chefoes-l1e1-${g}-entrada-t200-${perfil}`);
        const q = await textosDoQuadro(page);
        const nomes = q.map((x) => x.t);
        for (const hud of ['HAYATO', 'KO', 'SUPER', 'ESQ', 'ROUND 1', `000000  CHEFÃO · ${t.tituloHud}`]) expect(nomes, `${g}: HUD "${hud}" escondido`).not.toContain(hud);
        const c = t.cartao!;
        expect(nomes).toEqual(expect.arrayContaining([c.nome, c.titulo, c.rodape.split('').join(' ')]));
        for (const x of q.filter((y) => [c.nome, c.titulo, c.rodape.split('').join(' ')].includes(y.t))) {
          expect(x.y - x.px / 2, `${g} "${x.t}" abaixo da faixa`).toBeGreaterThanOrEqual(56);
          const { e, d } = extremos(x);
          expect(e, `${g} "${x.t}"`).toBeGreaterThanOrEqual(MARGEM);
          expect(d, `${g} "${x.t}"`).toBeLessThanOrEqual(960 - MARGEM);
        }
        const rod = q.find((x) => x.t === c.rodape.split('').join(' '))!;
        medidas.push(`${g}: rodapé espaçado "${c.rodape}" ${rod.w.toFixed(0)} px (o fio de ouro tem 300), título ${q.find((x) => x.t === c.titulo)!.w.toFixed(0)} px`);
        // fala: 2 linhas na faixa de baixo, inteiras dentro da tela
        const [l1, l2] = [t.falas!.entrada!.slice(0, t.falas!.entrada!.indexOf('. ') + 1), t.falas!.entrada!.slice(t.falas!.entrada!.indexOf('. ') + 2)];
        await hook(page, '(h) => h.avancar(40)'); // 240: a fala inteira lida (as faixas e a fala saem a partir do 250)
        const q2 = await textosDoQuadro(page);
        const f1 = q2.find((x) => x.t === l1);
        const f2 = q2.find((x) => x.t === l2);
        expect(f1, `${g} fala linha 1`).toBeDefined();
        expect(f2, `${g} fala linha 2 inteira`).toBeDefined();
        for (const f of [f1, f2] as Texto[]) {
          expect(f.y - f.px / 2, `${g} fala na faixa de baixo`).toBeGreaterThanOrEqual(540 - 56);
          expect(extremos(f).e, `${g} fala`).toBeGreaterThanOrEqual(MARGEM);
          expect(extremos(f).d, `${g} fala`).toBeLessThanOrEqual(960 - MARGEM);
        }
        medidas.push(`${g}: fala ${(f1 as Texto).w.toFixed(0)} / ${(f2 as Texto).w.toFixed(0)} px de 928`);
        // acabou: 270 updates no total (1 + 29 + 40 + 50 + 80 + 40 = 240; +30) e o motor anda só depois
        await hook(page, '(h) => h.avancar(30)');
        // (o `tick` do Game é global e só zera na criação: a conta é a partir do valor de quando a luta abriu)
        expect(await hook(page, '(h) => ({ ativa: h.ui.scene.entrada.ativa, tick: h.mundo().game.tick })'), `${g}: acabou em 270`).toEqual({ ativa: false, tick: antes.tick });
        await hook(page, '(h) => h.avancar(1)');
        expect(await hook(page, '(h) => h.mundo().game.tick'), g).toBe(antes.tick + 1);
      }
      console.log(`[${perfil}]\n${medidas.join('\n')}`);
      expect(erros).toEqual([]);
    });
  }

  test('BAATAR (plano aberto 0,95) não mostra borda preta; a CAMILLE entra andando (sai da borda e termina no lugar dela)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await poeProg(page, FILA_TODA.slice(0, 4));
    await abrirLuta(page, 'baatar');
    await hook(page, '(h) => h.avancar(1)');
    const bordas = async (): Promise<number> =>
      page.evaluate(() => {
        (window as any).__inno.desenhar();
        const cv = document.getElementById('jogo') as HTMLCanvasElement;
        const x = cv.getContext('2d') as CanvasRenderingContext2D;
        let pretos = 0;
        for (let y = 130; y < 950; y += 10) {
          for (const px of [0, 1, 1918, 1919]) {
            const d = x.getImageData(px, y, 1, 1).data;
            if (d[0] === 0 && d[1] === 0 && d[2] === 0) pretos++;
          }
        }
        return pretos;
      });
    expect(await hook(page, '(h) => h.ui.scene.entrada.quadro().zoom')).toBeLessThan(1);
    expect(await bordas(), 'BAATAR com zoom < 1: as bordas laterais não são pretas').toBe(0);
    await hook(page, '(h) => h.avancar(60)');
    expect(await bordas(), 'BAATAR no meio da entrada').toBe(0);
    // CAMILLE: a posição na tela do chefão (dx visual) vai de 300 a 0
    await poeProg(page, FILA_TODA.slice(0, 2));
    await abrirLuta(page, 'camille');
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.quadro().dx')).toBeGreaterThan(250);
    await hook(page, '(h) => h.avancar(99)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.quadro().dx')).toBe(0);
    expect(erros).toEqual([]);
  });

  test('pular: depois do tick 10 a luta anda em <= 8 quadros; depois de um continue a entrada é CURTA (60 ticks) e o motor fica parado nela', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await poeProg(page, FILA_TODA.slice(0, 2));
    const run = { c1: 'hayato', etapas: [{ id: 'camille', chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0 };
    await hook(page, `(h) => { window.__run = ${JSON.stringify(run)}; }`);
    const abrir = async (): Promise<void> => {
      await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: { mode: 'arcade', c1: 'hayato', c2: 'camille', cpu: null, chefe: true, esquiva: true }, run: window.__run }); (" + SEM_PROVOCACAO + ')(h); }');
      await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
    };
    await abrir();
    await hook(page, '(h) => h.avancar(5)');
    await page.keyboard.press('Enter'); // cedo demais (tick 5): não pula
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.pulouEm')).toBeNull();
    await hook(page, '(h) => h.avancar(14)');
    await page.keyboard.press('Enter');
    let quadros = 0;
    while ((await hook(page, '(h) => h.mundo().game.tick')) === 0 && quadros < 30) {
      await hook(page, '(h) => h.avancar(1)');
      quadros++;
    }
    expect(quadros).toBeLessThanOrEqual(8);
    // o continue: a mesma campanha, entrada CURTA (o `tick` do Game é global e não zera no setup: conta-se a partir do valor de quando a luta abriu)
    await abrir();
    const base: number = await hook(page, '(h) => h.mundo().game.tick');
    await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.entrada.modo')).toBe('curta');
    await hook(page, '(h) => h.avancar(58)'); // 59 updates: a CURTA ainda roda
    expect(await hook(page, '(h) => ({ ativa: h.ui.scene.entrada.ativa, tick: h.mundo().game.tick })')).toEqual({ ativa: true, tick: base });
    await hook(page, '(h) => h.avancar(1)'); // o 60º: acabou e o motor continua parado
    expect(await hook(page, '(h) => ({ ativa: h.ui.scene.entrada.ativa, tick: h.mundo().game.tick })')).toEqual({ ativa: false, tick: base });
    await hook(page, '(h) => h.avancar(1)'); // o 61º é do motor
    expect((await hook(page, '(h) => h.mundo().game.tick')) - base).toBe(1);
    expect(erros).toEqual([]);
  });
});

test.describe('na luta: HUD, aura da fase 2 e fala de derrota', () => {
  for (const perfil of perfis) {
    test(`${perfil}: "CHEFÃO · <título>" cabe na barra, a aura acende na fase 2 de cada guardião (A/B de pixels com controle) e a derrota fala no KO`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      await espiarTextos(page);
      const medidas: string[] = [];
      for (const g of GUARDIOES) {
        const t = TEXTOS_DOS_CHEFOES[g]!;
        await poeProg(page, FILA_TODA.slice(0, GUARDIOES.indexOf(g)));
        await abrirLuta(page, g);
        await hook(page, '(h) => { const s = h.ui.scene; s.entradaPendente = false; s.entrada.zerar(); h.avancar(100); }');
        expect(await hook(page, '(h) => h.mundo().game.phase'), g).toBe('fight');
        // HUD: o rótulo do chefão com o título curto, dentro da barra do P2 (x 524 a 856) e sem passar do medalhão do KO (480 + 50)
        let q = await textosDoQuadro(page);
        const rot = q.find((x) => x.t === `000000  CHEFÃO · ${t.tituloHud}`);
        expect(rot, `${g}: rótulo do HUD`).toBeDefined();
        const { e, d } = extremos(rot as Texto);
        expect(e, `${g}: rótulo começa depois do medalhão`).toBeGreaterThanOrEqual(536);
        expect(d, `${g}: rótulo dentro da barra`).toBeLessThanOrEqual(524 + 332);
        expect((rot as Texto).css, `${g}: corpo do rótulo em px CSS`).toBeGreaterThan(perfil === 'celular' ? 11 : 12);
        medidas.push(`${g}: rótulo do HUD ${(rot as Texto).w.toFixed(0)} px de 320 (corpo ${(rot as Texto).css.toFixed(1)} px CSS)`);
        // aura: fase 2 (barras = 1) contra fase 1 (barras = 2), o mesmo quadro; controle = dois desenhos iguais
        const r: { aura: number; controle: number } = await page.evaluate(() => {
          const h = (window as any).__inno;
          const G = h.mundo().game;
          const cv = document.getElementById('jogo') as HTMLCanvasElement;
          const ler = (): Uint8ClampedArray => {
            h.desenhar();
            const c2 = document.createElement('canvas');
            c2.width = 480;
            c2.height = 270;
            const x = c2.getContext('2d') as CanvasRenderingContext2D;
            x.drawImage(cv, 0, 0, 480, 270);
            return x.getImageData(0, 0, 480, 270).data;
          };
          G.p2.barras = 2;
          const a = ler();
          const a2 = ler();
          G.p2.barras = 1;
          const b = ler();
          let aura = 0;
          let controle = 0;
          for (let i = 0; i < a.length; i += 4) {
            if (Math.abs((a[i] as number) - (b[i] as number)) + Math.abs((a[i + 1] as number) - (b[i + 1] as number)) + Math.abs((a[i + 2] as number) - (b[i + 2] as number)) > 24) aura++;
            if (Math.abs((a[i] as number) - (a2[i] as number)) > 0) controle++;
          }
          return { aura, controle };
        });
        expect(r.controle, `${g}: controle negativo (dois desenhos iguais)`).toBe(0);
        expect(r.aura, `${g}: a aura da fase 2 acende (sem depender de ficha)`).toBeGreaterThan(1500);
        medidas.push(`${g}: a aura muda ${r.aura} px (480x270)`);
        await capturar(page, `chefoes-l1e1-${g}-fase2-aura-${perfil}`);
        // KO final: a legenda de derrota do Apolo, dentro da pílula (480 px) ou ao menos da tela
        await hook(page, "(h) => { const G = h.mundo().game; G.p2.barras = 1; G.p2.hp = 0; G.phase = 'ko'; G.t = 40; h.avancar(1); }");
        q = await textosDoQuadro(page);
        const der = q.find((x) => x.t === t.falas!.derrota);
        expect(der, `${g}: fala de derrota`).toBeDefined();
        expect(extremos(der as Texto).e, `${g}: derrota`).toBeGreaterThanOrEqual(MARGEM);
        expect(extremos(der as Texto).d, `${g}: derrota`).toBeLessThanOrEqual(960 - MARGEM);
        medidas.push(`${g}: derrota ${(der as Texto).w.toFixed(0)} px (a pílula tem 480)`);
        await capturar(page, `chefoes-l1e1-${g}-ko-derrota-${perfil}`);
      }
      console.log(`[${perfil}]\n${medidas.join('\n')}`);
      expect(erros).toEqual([]);
    });
  }
});

test.describe('a campanha pela UI com saves reais', () => {
  /** Abre a escolha de dificuldade do ARCADE com `c1` e confirma o nível 0: devolve a escada montada pela UI. */
  async function montarEscadaPelaUI(page: Page, c1: string): Promise<Array<{ id: string; chefe: boolean }>> {
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.go = (n, a) => { window.__ultimaIda = { n, a }; }; h.ui.set('diff', { mode: 'arcade', c1: '${c1}', c2: 'caio' }); h.ui.scene.nav('ok'); }`);
    return hook(page, '(h) => h.ui.run.etapas.map((e) => ({ id: e.id, chefe: !!e.chefe }))');
  }

  /** Zera o ARCADE da campanha `etapas`: abre o final, espera, e devolve o que ele liberou, o save gravado e para onde o ENTER leva. */
  async function zerar(page: Page, c1: string, etapas: Array<{ id: string; chefe: boolean }>): Promise<{ novos: string[]; prog: any; proxima: any }> {
    await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; delete h.ui.go; h.ui.set('ending', { run: { c1: '${c1}', etapas: ${JSON.stringify(etapas)}, idx: ${etapas.length}, score: 1234, continues: 3, diff: 0, cont: 0 } }); h.avancar(70); }`);
    const novos: string[] = await hook(page, '(h) => [...h.ui.cenas.ending.novos]');
    const prog = await page.evaluate(() => JSON.parse(window.localStorage.getItem('inno-fighters-v2') as string).prog);
    await page.keyboard.press('Enter');
    // o fade de saída leva ~9 ticks; na residência por peso a troca ainda espera (até 45 ticks) a arte do destino chegar: anda até a troca acabar, sem contar ticks
    await page.waitForFunction(() => { const h = (window as any).__inno; h.avancar(4); return h.ui.fadeTo === null && !h.ui.esperandoArte; }, undefined, { polling: 20, timeout: 30_000 });
    const proxima = await hook(page, "(h) => ({ cena: h.ui.scene === h.ui.cenas.desbloqueio ? 'desbloqueio' : h.ui.scene === h.ui.cenas.title ? 'title' : 'outra', novos: h.ui.cenas.desbloqueio.a ? [...h.ui.cenas.desbloqueio.a.novos] : [] })");
    return { novos, prog, proxima };
  }

  test('S1 (save vazio): o chefão da escada é o AMINU; zerar libera SÓ o AMINU, grava e mostra o cartão com o epílogo; depois da fila, o ZENON', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    const escada = await montarEscadaPelaUI(page, 'hayato');
    expect(escada.at(-1)).toEqual({ id: 'aminu', chefe: true });
    expect(escada.filter((e) => e.chefe)).toHaveLength(1);
    expect(escada.some((e, i) => i < escada.length - 1 && (e.id === 'aminu' || e.id === 'zenon' || e.id === 'hayato'))).toBe(false);
    const r = await zerar(page, 'hayato', escada);
    expect(r.novos).toEqual(['aminu']);
    expect(r.prog).toMatchObject({ desbloqueados: ['aminu'], zeradas: 1, chefesDerrotados: ['aminu'] });
    expect(r.proxima).toMatchObject({ cena: 'desbloqueio', novos: ['aminu'] });
    // o cartão do AMINU: o epílogo no lugar da descrição
    await espiarTextos(page);
    await hook(page, '(h) => h.avancar(60)');
    const q = (await textosDoQuadro(page)).map((x) => x.t);
    expect(q).toEqual(expect.arrayContaining(['AMINU SE JUNTA A VOCÊ!', TEXTOS_DOS_CHEFOES['aminu']!.epilogo.quem, `“${TEXTOS_DOS_CHEFOES['aminu']!.epilogo.convite}”`]));
    // a 6ª zerada (com o save de 5 guardiões e o ZENON bloqueado): o chefão da escada passa a ser o ZENON
    await hook(page, '(h) => { h.persist.prog = { ...h.persist.prog, desbloqueados: [...h.persist.prog.desbloqueados, \'centella\', \'camille\', \'nila\', \'baatar\'] }; }');
    const escada5 = await montarEscadaPelaUI(page, 'hayato');
    expect(escada5.at(-1)).toEqual({ id: 'zenon', chefe: true });
    expect(erros).toEqual([]);
  });

  test('S3 (5 guardiões, ZENON bloqueado): zerar libera o ZENON com "O ANFITRIÃO SE RENDE"; S6 (tudo liberado): a revanche só conta a zerada, sem cartão', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await poeProg(page, FILA_TODA, { zeradas: 5 });
    const escada = await montarEscadaPelaUI(page, 'hayato');
    expect(escada.at(-1)).toEqual({ id: 'zenon', chefe: true });
    const r = await zerar(page, 'hayato', escada);
    expect(r.novos).toEqual(['zenon']);
    expect(r.prog).toMatchObject({ desbloqueados: [...FILA_TODA, 'zenon'], zeradas: 6 });
    expect(r.prog.chefesDerrotados).toContain('zenon');
    expect(r.proxima).toMatchObject({ cena: 'desbloqueio', novos: ['zenon'] });
    await espiarTextos(page);
    await hook(page, '(h) => h.avancar(60)');
    expect((await textosDoQuadro(page)).map((x) => x.t)).toContain('O ANFITRIÃO SE RENDE');
    // revanche: o ZENON já está liberado e derrotado
    const escadaR = await montarEscadaPelaUI(page, 'hayato');
    expect(escadaR.at(-1)).toEqual({ id: 'zenon', chefe: true });
    const rr = await zerar(page, 'hayato', escadaR);
    expect(rr.novos).toEqual([]);
    expect(rr.prog.zeradas).toBe(7);
    expect(rr.proxima.cena).toBe('title');
    expect(erros).toEqual([]);
  });

  test('S7 (tudo liberado, jogando de ZENON): escada de 5 sem chefão; zerar conta a zerada e vai direto ao título', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await poeProg(page, [...FILA_TODA, 'zenon'], { zeradas: 6, chefesDerrotados: [...FILA_TODA, 'zenon'], chefeDerrotado: true });
    const escada = await montarEscadaPelaUI(page, 'zenon');
    expect(escada).toHaveLength(5);
    expect(escada.some((e) => e.chefe || e.id === 'zenon')).toBe(false);
    const r = await zerar(page, 'zenon', escada);
    expect(r.novos).toEqual([]);
    expect(r.prog.zeradas).toBe(7);
    expect(r.proxima.cena).toBe('title');
    // save antigo (só o ZENON liberado, fila vazia): jogando de ZENON o chefão é o AMINU (S5)
    await poeProg(page, ['zenon'], { zeradas: 1, chefesDerrotados: ['zenon'], chefeDerrotado: true });
    const velha = await montarEscadaPelaUI(page, 'zenon');
    expect(velha.at(-1)).toEqual({ id: 'aminu', chefe: true });
    expect(erros).toEqual([]);
  });

  test('o texto "Como jogar" e a dica da seleção seguem coerentes: 5 rivais e o chefão (a escada continua com 5 rivais com 10 lutadores)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    await abrirJogo(page, 'desktop');
    const n = await hook(page, "(h) => h.ui.c.regras.tamanhoEscada");
    expect(n).toBe(5);
    const escada = await montarEscadaPelaUI(page, 'hayato');
    expect(escada).toHaveLength(6);
  });
});
