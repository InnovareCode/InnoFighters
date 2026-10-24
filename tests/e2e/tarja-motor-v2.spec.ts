/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * Causa raiz investigada (pedido do Atlas, 2026-10-24): o dono não viu a TARJA de apresentação do especial no HEAD publicado 209ecd8. A suíte existente
 * (`cinematica.spec.ts`, os 28 especiais) prova a cinemática à exaustão, mas SEMPRE via `h.ui.set('fight', { cfg })` com um `cfg` montado à mão — nunca
 * passa `motorV2`, então nunca exercita o jogo como ele realmente roda hoje (motor v2 sempre ligado, `MOTOR_V2_PADRAO`, desde a V2-6). Este arquivo fecha
 * esse buraco: navega pelo TECLADO de verdade (boot -> menu -> seleção -> [dificuldade] -> VS -> luta), do jeito que `select.ts`/`diff.ts` entregam o
 * `cfg.motorV2` de verdade (`cfgMotorV2(regras)`), com `?residencia=peso` (o padrão de produção desde a L5+L6) e SEM `?motorv2=0`. Testado manualmente
 * (dev server + build de produção): a tarja aparece. Hipóteses descartadas com evidência (estado + pixel): motor v2 não suprime nem atrasa a tarja; a
 * residência por peso não deixa a arte dela fora da memória; `cfgMotorV2`/`regrasComMotorV2` não tocam `regras.cinematica` (prova unitária em
 * `tests/unit/cinematica-motor-v2.test.ts`, com mutação confirmada vermelha).
 */

test.describe.configure({ timeout: 180_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

function coletarErros(page: Page): string[] {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  return erros;
}

async function esperarCena(page: Page, nome: string, timeout = 30_000): Promise<void> {
  await page.waitForFunction((n) => (window as any).__inno.ui.name === n && (window as any).__inno.ui.fadeTo === null, nome, { timeout });
}

/** Espia fillText (nome do golpe na tarja). */
async function espiarTextos(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const w = window as any;
    w.__textos = [] as string[];
    const proto = CanvasRenderingContext2D.prototype as any;
    const fill = proto.fillText;
    proto.fillText = function (s: string, ...r: unknown[]) {
      w.__textos.push(String(s));
      return fill.call(this, s, ...r);
    };
  });
}

/** Quantos pixels do canvas inteiro estão a no máximo `tol` (distância RGB) da cor `alvo`: a borda/fundo da tarja. */
const PERTO = `(h, alvo, tol) => {
  h.desenhar();
  const c = document.getElementById('jogo'); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0;
  for (let i = 0; i < d.length; i += 4) { const dr = d[i] - alvo[0], dg = d[i + 1] - alvo[1], db = d[i + 2] - alvo[2]; if (dr * dr + dg * dg + db * db <= tol * tol) n++; } return n; }`;

/** Boot -> intro -> title -> menu, pelo teclado de verdade (como o dono joga). */
async function irAoMenu(page: Page, url: string): Promise<void> {
  await page.goto(url);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await esperarCena(page, 'boot');
  await page.keyboard.press('Enter');
  await esperarCena(page, 'intro');
  await page.waitForTimeout(400);
  await page.keyboard.press('Enter');
  await esperarCena(page, 'title');
  await page.keyboard.press('Enter');
  await esperarCena(page, 'menu');
}

/**
 * Da 'fight' pronta: posiciona o P1 longe do P2, energia cheia, dispara o especial (tecla B de verdade) e captura o estado da cinemática DENTRO do
 * navegador (um loop por `requestAnimationFrame`, sem round-trip do Playwright no meio) assim que ela abre — em tempo real (sem `?manual=1`) um
 * `page.waitForFunction` seguido de um `page.evaluate` separado é uma corrida: a COMPLETA pode fechar entre as duas chamadas.
 */
async function dispararEspecialDeVerdade(page: Page): Promise<{ cfg: any; cine: { modo: string; golpe: string; lutador: number; nome: string } | null }> {
  await hook(page, SEM_PROVOCACAO);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 60_000 });
  await page.waitForFunction(() => (window as any).__inno.mundo().game.phase === 'fight', undefined, { timeout: 60_000 });
  const cfg = await hook(page, '(h) => h.ui.scene.a.cfg');
  await hook(page, '(h) => { const g = h.mundo().game; g.p1.en = 100; g.p1.x = 250; g.p2.x = 780; g.p1.facing = 1; g.p2.facing = -1; }');
  const capturar = page.evaluate(`(() => { const h = window.__inno; return new Promise((resolve) => {
    const t0 = performance.now();
    const olhar = () => {
      const c = h.ui.scene.cine;
      if (c && c.ativa && c.estado) {
        const g = h.mundo().game; const f = g.fighters[c.estado.lutador]; const nome = f.ch.moves[c.estado.golpe].name;
        resolve({ modo: c.estado.modo, golpe: c.estado.golpe, lutador: c.estado.lutador, nome });
        return;
      }
      if (performance.now() - t0 > 4000) { resolve(null); return; }
      requestAnimationFrame(olhar);
    };
    requestAnimationFrame(olhar);
  }); })()`);
  await page.keyboard.down('b');
  await page.waitForTimeout(32);
  await page.keyboard.up('b');
  const cine = (await capturar) as { modo: string; golpe: string; lutador: number; nome: string } | null;
  return { cfg, cine };
}

test.describe('tarja do especial, pelo caminho REAL do jogo (motor v2 ligado por padrão, ?residencia=peso)', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'só Chromium');
  test.beforeEach(({}, info) => test.skip(info.project.name !== 'desktop', 'medidas em desktop'));

  test('ARCADE (LUTA x CPU, 1º item do menu): a tarja abre com motorV2 ligado de verdade e mostra o nome do golpe', async ({ page }, info) => {
    const erros = coletarErros(page);
    await espiarTextos(page);
    await irAoMenu(page, '/?seed=11&trailer=0&residencia=peso');
    // ARCADE é o 1º item (já selecionado)
    await page.keyboard.press('Enter');
    await esperarCena(page, 'select');
    await page.keyboard.press('Enter'); // P1 sugerido
    await esperarCena(page, 'diff');
    await page.keyboard.press('Enter'); // dificuldade padrão
    await esperarCena(page, 'vs');
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter'); // pula o confronto
    await esperarCena(page, 'fight');

    const { cfg, cine } = await dispararEspecialDeVerdade(page);
    expect(cfg.motorV2, 'o cfg real desta luta tem o motor v2 ligado (cfgDaEtapa -> cfgMotorV2)').toMatchObject({ filmes: true, entradaNoHitstop: true, combos: true });
    expect(cine, 'a cinemática abriu quando o especial saiu').not.toBeNull();
    expect(cine?.modo, 'a preferência padrão é COMPLETA').toBe('completa');
    // o "pop" do nome do golpe só vem com o quadro em andamento: espera o próprio texto aparecer, sem round-trip no meio (evita a corrida com a COMPLETA, ~800ms)
    await page.waitForFunction((nome: string) => ((window as any).__textos as string[]).includes(nome), cine!.nome, { timeout: 2_000 });
    // o nome sozinho não bastaria (o painel de combos do HUD também escreve nomes de golpe): a faixa grande na cor do HAYATO só existe se a tarja de
    // verdade foi desenhada, não só o estado.
    const perto: number = await page.evaluate(`(() => { const h = window.__inno; return (${PERTO})(h, [111, 224, 255], 60); })()`);
    expect(perto, 'a tarja pintou uma faixa grande na cor do lutador (não ficou em branco/vazia)').toBeGreaterThan(300);
    info.annotations.push({ type: 'medido', description: `golpe=${cine?.golpe} modo=${cine?.modo} nome=${cine?.nome} px=${perto}` });
    expect(erros).toEqual([]);
  });

  test('VERSUS 2 JOGADORES: a tarja do P1 abre igual, com o motor v2 ligado pela seleção real', async ({ page }) => {
    const erros = coletarErros(page);
    await espiarTextos(page);
    await irAoMenu(page, '/?seed=12&trailer=0&residencia=peso');
    await page.keyboard.press('ArrowDown'); // VERSUS 2 JOGADORES
    expect(await hook(page, '(h) => h.ui.scene.selecionado')).toBe(1);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'select');
    await page.keyboard.press('Enter'); // P1 (hayato, seta ← → não mexida)
    await page.keyboard.press('j'); // P2 confirma (teclado de VERSUS)
    await esperarCena(page, 'vs');
    await page.waitForTimeout(800);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'fight');

    const { cfg, cine } = await dispararEspecialDeVerdade(page);
    expect(cfg.mode).toBe('versus');
    expect(cfg.motorV2, 'select.ts injeta o motor v2 real no VERSUS também').toMatchObject({ filmes: true, entradaNoHitstop: true, combos: true });
    expect(cine, 'a cinemática abriu quando o especial saiu').not.toBeNull();
    expect(cine?.modo).toBe('completa');
    await page.waitForFunction((nome: string) => ((window as any).__textos as string[]).includes(nome), cine!.nome, { timeout: 2_000 });
    const perto: number = await page.evaluate(`(() => { const h = window.__inno; return (${PERTO})(h, [111, 224, 255], 60); })()`);
    expect(perto, 'a tarja pintou uma faixa grande na cor do lutador (não ficou em branco/vazia)').toBeGreaterThan(300);
    expect(erros).toEqual([]);
  });

  test('TREINAMENTO: também mostra a tarja (não é exclusivo de Arcade/Versus)', async ({ page }) => {
    const erros = coletarErros(page);
    await espiarTextos(page);
    await irAoMenu(page, '/?seed=13&trailer=0&residencia=peso');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown'); // TREINAMENTO
    expect(await hook(page, '(h) => h.ui.scene.selecionado')).toBe(3);
    await page.keyboard.press('Enter');
    await esperarCena(page, 'select');
    await page.keyboard.press('Enter'); // P1
    await page.keyboard.press('Enter'); // alvo do treino
    await esperarCena(page, 'fight');

    const { cfg, cine } = await dispararEspecialDeVerdade(page);
    expect(cfg.mode).toBe('training');
    expect(cfg.motorV2).toMatchObject({ filmes: true, entradaNoHitstop: true, combos: true });
    expect(cine, 'a cinemática abriu quando o especial saiu').not.toBeNull();
    expect(cine?.modo).toBe('completa');
    await page.waitForFunction((nome: string) => ((window as any).__textos as string[]).includes(nome), cine!.nome, { timeout: 2_000 });
    const perto: number = await page.evaluate(`(() => { const h = window.__inno; return (${PERTO})(h, [111, 224, 255], 60); })()`);
    expect(perto, 'a tarja pintou uma faixa grande na cor do lutador (não ficou em branco/vazia)').toBeGreaterThan(300);
    expect(erros).toEqual([]);
  });
});
