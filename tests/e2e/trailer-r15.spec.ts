/* eslint-disable @typescript-eslint/no-explicit-any */
import { writeFileSync } from 'node:fs';
import { expect, test, type Page } from '@playwright/test';

/*
 * R-15 (spec §6 + docs/partitura-trailer.md §8): o trailer é ENCENADO e a UI o apresenta. Num passe só pelo trailer inteiro, em modo manual (1 tick por vez, um quadro desenhado por tick):
 *  - a TARJA DO SUPER (a única do trailer) toca por 30 ticks, só no P9, e nenhuma outra tarja existe;
 *  - a entrada do ZENON (ticks 96-155 do P9) corre POR CIMA da luta em curso e encerra limpa;
 *  - o filme CURTO do P9 abre perto do tick 162 e toca até o último quadro do plano;
 *  - nenhum plano de luta fica parado mais de 0,5 s (o motor sem andar, fora a tarja e o filme), nem com os dois lutadores parados juntos mais de 0,2 s;
 *  - o contador de acertos aparece (e só ele: DANGER e nota não existem no trailer).
 * `LYRA_R15=<caminho.json>` grava as medidas.
 */
test.describe.configure({ timeout: 480_000 });

const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

/** Um tick: avança, DESENHA (um erro de desenho em qualquer quadro vira erro de página) e devolve o diagnóstico. */
const PASSO = `(h) => {
  h.avancar(1);
  h.desenhar();
  const d = h.ui.cenas.trailer.diagnostico();
  return { tick: d.tick, plano: d.plano, tarja: d.tarjaDoSuper, filme: d.filmeAtivo, entrada: d.entradaAtiva, acertos: d.acertos, luta: d.luta, reserva: d.reserva, prox: d.proximoPlano };
}`;

test('trailer encenado: tarja do super só no P9, entrada sobreposta, filme curto até o fim, nada parado e o contador de acertos', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'desktop');
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') erros.push(`console: ${m.text()}`);
  });
  await page.goto('/?seed=5&manual=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  // o ZENON liberado (o trailer mostra o rosto e o nome dele, não a silhueta)
  await hook(page, '(h) => { const p = h.ui.c.persist.prog; p.desbloqueados = [...p.desbloqueados, "zenon"]; }');
  await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('trailer', { origem: 'atrair' }); }");
  await page.waitForFunction(() => (window as any).__inno.ui.cenas.trailer.pronta === true, undefined, { timeout: 30_000 });

  const quadros: any[] = [];
  for (let guarda = 0; quadros.length < 2399 && guarda < 20000; guarda++) {
    // não avança para um plano cuja arte ainda não chegou (o diretor a trocaria por reserva): espera a rede, como o jogador
    const d = await hook(page, '(h) => h.ui.cenas.trailer.diagnostico()');
    if (d.proximoPlano && d.proximoPlano.emTicks <= 1 && !d.proximoPlano.artePronta) {
      await page.waitForTimeout(100);
      continue;
    }
    quadros.push(await hook(page, PASSO));
  }
  expect(quadros.length).toBeGreaterThanOrEqual(2399);

  // ---- tarja do super: uma só, 30 ticks, no P9
  const comTarja = quadros.filter((q) => q.tarja);
  expect(new Set(comTarja.map((q) => q.plano)), 'a tarja só existe no P9').toEqual(new Set(['P9']));
  expect(comTarja.length, 'a tarja dura 30 ticks').toBe(30);
  const t0 = comTarja[0].tick;
  expect(comTarja[29].tick, 'em sequência, sem buracos').toBe(t0 + 29);

  // ---- P9: planos e ticks
  const inicioP9 = quadros.find((q) => q.plano === 'P9').tick as number;
  const p9 = quadros.filter((q) => q.plano === 'P9');
  expect(p9.length).toBeGreaterThanOrEqual(190);
  const tauDe = (q: any): number => q.tick - inicioP9;
  expect(tauDe(comTarja[0]), 'a tarja abre no super (tick 75 do plano)').toBeGreaterThanOrEqual(70);
  expect(tauDe(comTarja[0])).toBeLessThanOrEqual(80);

  // ---- entrada do ZENON sobreposta: ativa só entre 96 e 155 do P9 e a luta anda no meio dela (o motor tem tick novo)
  const comEntrada = quadros.filter((q) => q.entrada);
  expect(new Set(comEntrada.map((q) => q.plano))).toEqual(new Set(['P9']));
  expect(tauDe(comEntrada[0])).toBeGreaterThanOrEqual(95);
  expect(tauDe(comEntrada[comEntrada.length - 1])).toBeLessThanOrEqual(156);
  const ticksDoMotorNaEntrada = new Set(comEntrada.map((q) => q.luta?.tick));
  expect(ticksDoMotorNaEntrada.size, 'a luta anda durante a entrada (não congelou)').toBeGreaterThan(20);
  expect(tauDe(quadros.find((q) => q.tick === inicioP9 + 160)), 'a entrada já fechou').toBeGreaterThan(156);
  expect(quadros.find((q) => q.tick === inicioP9 + 160).entrada).toBe(false);

  // ---- filme CURTO do P9: abre perto do 162 e toca até o último quadro
  const comFilme = p9.filter((q) => q.filme);
  expect(comFilme.length, 'o filme tocou no P9').toBeGreaterThan(20);
  expect(tauDe(comFilme[0]), 'abre perto do tick 162').toBeGreaterThanOrEqual(158);
  expect(tauDe(comFilme[0])).toBeLessThanOrEqual(166);
  expect(p9[190].filme, 'ainda tocando no penúltimo quadro do plano').toBe(true);
  expect(quadros.filter((q) => q.filme && q.plano !== 'P9').length, 'nenhum outro plano tem filme').toBe(0);

  // ---- nada parado. A câmera anda o tempo todo (o zoom é uma rampa), então quadros idênticos nunca existiriam: o que se mede é o MOTOR (o mundo) e os lutadores.
  //  (a) o motor sem andar: ticks seguidos com o mesmo tick de jogo, fora a tarja e o filme (que o diretor segura de propósito); a câmera lenta máxima é de 24 ticks
  //  (b) os dois lutadores parados juntos: nenhum mudou de lugar/estado/golpe entre dois ticks DO MOTOR (ticks em que o motor não andou não contam nem quebram a conta)
  const medidas: Record<string, { motorSemAndar: number; osDoisParados: number }> = {};
  for (const id of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P9']) {
    const doPlano = quadros.filter((q) => q.plano === id);
    expect(doPlano.length, id).toBeGreaterThan(100);
    let semAndar = 0;
    let maxSemAndar = 0;
    let parados = 0;
    let maxParados = 0;
    for (let i = 1; i < doPlano.length; i++) {
      const q = doPlano[i];
      const a = doPlano[i - 1];
      if (!q.luta || !a.luta) continue;
      if (q.luta.tick === a.luta.tick) {
        if (!q.tarja && !q.filme) {
          semAndar++;
          maxSemAndar = Math.max(maxSemAndar, semAndar);
        }
        continue;
      }
      semAndar = 0;
      const mudou = [0, 1].some((k) => JSON.stringify(q.luta.f[k]) !== JSON.stringify(a.luta.f[k]));
      if (mudou) parados = 0;
      else {
        parados++;
        maxParados = Math.max(maxParados, parados);
      }
    }
    medidas[id] = { motorSemAndar: maxSemAndar, osDoisParados: maxParados };
    expect(maxSemAndar, `${id}: o motor sem andar, fora tarja e filme (0,5 s = 30 ticks)`).toBeLessThan(30);
    expect(maxParados, `${id}: os dois lutadores parados juntos (0,2 s = 12 ticks do motor)`).toBeLessThanOrEqual(12);
  }
  info.annotations.push({ type: 'medidas R-15', description: JSON.stringify(medidas) });

  // controle: a medida enxerga o motor parado (a tarja congela 30 ticks de propósito e o filme também). Sem isto, `motorSemAndar: 0` não provaria nada.
  const p9Luta = quadros.filter((q) => q.plano === 'P9' && q.luta);
  let seq = 0;
  let maxNaTarja = 0;
  for (let i = 1; i < p9Luta.length; i++) {
    seq = p9Luta[i].tarja && p9Luta[i].luta.tick === p9Luta[i - 1].luta.tick ? seq + 1 : 0;
    maxNaTarja = Math.max(maxNaTarja, seq);
  }
  info.annotations.push({ type: 'controle: ticks seguidos com o motor parado na tarja', description: String(maxNaTarja) });
  expect(maxNaTarja, 'a medida vê o motor congelado pela tarja').toBeGreaterThanOrEqual(25);

  // ---- contador de acertos: aparece nos planos de luta (só ele; o DANGER e a nota não são desenhados no trailer)
  const planosComAcertos = new Set(quadros.filter((q) => (q.acertos?.[0] ?? 0) >= 2 || (q.acertos?.[1] ?? 0) >= 2).map((q) => q.plano));
  expect(planosComAcertos.size, 'o contador de acertos apareceu em vários planos').toBeGreaterThanOrEqual(3);
  expect(planosComAcertos.has('P9')).toBe(true);

  expect(quadros.at(-1).reserva).toBe(false);
  expect(erros).toEqual([]);
  if (process.env['LYRA_R15']) writeFileSync(process.env['LYRA_R15'], JSON.stringify({ medidas, inicioP9, tarja: [comTarja[0].tick, comTarja[29].tick], filme: [comFilme[0].tick, comFilme.at(-1).tick] }));
});
