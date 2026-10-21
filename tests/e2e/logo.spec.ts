/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

/*
 * Logo novo (paleta D1, "Cobalto Real", docs/proposta-logo-paleta-d.md seção 4): medido no navegador, à parte da comparação com o
 * protótipo (fidelidade-ui.spec.ts desliga logo, emblema e brasas dos dois lados de propósito).
 *
 * Mede: (1) INNO é azul (mais de 50% dos pixels CLAROS dele, sem contorno preto e volume, caem em 195-250 graus) e FIGHTERS não tem
 * nenhum pixel claro azul (continua brasa); (2) o horizonte de INNO é cobalto saturado (saturação > 0,6, matiz 215-235), não cinza;
 * (3) contraste da borda POR PALAVRA: 0 pixels abaixo de 3:1 (WCAG 1.4.11) contra os fundos reais (cenários jp e br sem e com a
 * gradação do título, o fundo do menu e o fundo escuro da abertura); (4) o emblema é de um tom só, azul (matizes 210-235).
 * O logo ANTIGO do protótipo é medido ao lado só para registro (o antigo tinha pixels frios).
 */

const URL_PROTOTIPO = pathToFileURL(resolve('prototipo/inno-fighters-artefato.html')).href;
test.describe.configure({ timeout: 120_000 });

type Borda = { anel: number; minimo: number; mediana: number; abaixoDe3: number };
type Resumo = {
  opacos: number;
  /** pixels CLAROS (luminância > 0,03: preenchimento e aro, sem contorno preto e volume) de cada palavra e quantos são azuis (195-250 graus, s > 0,2) */
  innoClaros: number;
  innoAzuis: number;
  fightersClaros: number;
  fightersAzuis: number;
  horizonte: number;
  contrasteBordas: number;
  fundos: Array<{ nome: string; inno: Borda; fighters: Borda }>;
  emblemaOpacos: number;
  emblemaMatizes: number[];
};

test('logo Cobalto Real (D1): INNO azul, FIGHTERS brasa, horizonte cobalto e borda legível por palavra sobre jp, br e o fundo escuro', async ({ page, browser }, info) => {
  test.skip(info.project.name !== 'desktop', 'medição só no desktop');
  await page.goto('/?seed=5&manual=1');
  await page.waitForSelector('html[data-pronto]', { timeout: 60_000 });

  const r: Resumo & { fotos: Record<string, string> } = await page.evaluate(async () => {
    const imp = (p: string): Promise<any> => import(/* @vite-ignore */ p);
    const L = await imp('/src/ui/logo.ts');
    const { desenharFundoMenu } = await imp('/src/render/cenario.ts');
    const h = (window as any).__inno;
    const m = h.mundo();
    const W = 960;
    const H = 540;
    const novo = (w = W, hh = H) => {
      const c = document.createElement('canvas');
      c.width = w;
      c.height = hh;
      return c;
    };
    const lum = (r: number, g: number, b: number): number => {
      const f = (v: number): number => {
        const s = v / 255;
        return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
      };
      return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
    };
    const contraste = (a: number, b: number): number => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
    const matiz = (r: number, g: number, b: number): { h: number; s: number } => {
      const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
      if (d === 0) return { h: 0, s: 0 };
      const s = d / (mx === 0 ? 1 : mx);
      let hh = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
      hh *= 60;
      if (hh < 0) hh += 360;
      return { h: hh, s };
    };

    // ---- camada do logo sozinha (sem brilho), em escala 1 num canvas 760x300 ----
    const camada = novo(760, 300);
    const cg = camada.getContext('2d')!;
    L.desenharLogo(cg, 380, 150, 1, -1);
    const dados = cg.getImageData(0, 0, 760, 300).data;
    // corte entre as palavras: INNO acima, FIGHTERS abaixo (y = 176 na camada de 760x300, como na proposta)
    const CORTE = 176;
    let opacos = 0, innoClaros = 0, innoAzuis = 0, fightersClaros = 0, fightersAzuis = 0;
    for (let i = 0; i < dados.length; i += 4) {
      if (dados[i + 3]! < 128) continue;
      opacos++;
      if (lum(dados[i]!, dados[i + 1]!, dados[i + 2]!) <= 0.03) continue; // contorno preto e volume índigo não contam: só preenchimento e aro
      const y = Math.floor(i / 4 / 760);
      const { h: mh, s } = matiz(dados[i]!, dados[i + 1]!, dados[i + 2]!);
      const azul = s > 0.2 && mh >= 195 && mh <= 250;
      if (y < CORTE) {
        innoClaros++;
        if (azul) innoAzuis++;
      } else {
        fightersClaros++;
        if (azul) fightersAzuis++;
      }
    }
    // horizonte de INNO: linha em que o degradê chega a 50% (y = 150 - 168*0.82 + 0.5*(168*0.82 + 4)): cobalto saturado, não cinza
    const yHor = Math.round(150 - 168 * 0.82 + 0.5 * (168 * 0.82 + 4));
    let horizonte = 0;
    for (let x = 0; x < 760; x++) {
      const i = (yHor * 760 + x) * 4;
      if (dados[i + 3]! < 250) continue;
      const { h: mh, s } = matiz(dados[i]!, dados[i + 1]!, dados[i + 2]!);
      if (s > 0.6 && mh >= 215 && mh <= 235) horizonte++;
    }
    // contraste entre o contorno interno dourado e o externo escuro (o que segura a leitura sobre qualquer fundo)
    const hex = (c: string): [number, number, number] => [1, 3, 5].map((k) => parseInt(c.slice(k, k + 2), 16)) as [number, number, number];
    const LE = lum(...hex(L.PALETA_MARCA.contornoInterno));
    const LO = lum(...hex(L.PALETA_MARCA.contornoExterno));
    const contrasteBordas = contraste(LE, LO);

    // ---- fundos reais ----
    const fundos: Array<[string, (c: CanvasRenderingContext2D) => void, number, number, number]> = [];
    const cenarioPuro = (id: string) => (c: CanvasRenderingContext2D) => c.drawImage(m.rec.cenarios.get(id), 0, 0, W, H);
    const titulo = async (idx: number) => {
      const { desenharCicloDeCenarios, gradacaoCinema } = L;
      return (c: CanvasRenderingContext2D) => {
        desenharCicloDeCenarios(c, m, idx * 420 + 10);
        gradacaoCinema(c, m);
      };
    };
    fundos.push(['jp cru', cenarioPuro('jp'), 480, 142, 0.84]);
    fundos.push(['br cru', cenarioPuro('br'), 480, 142, 0.84]);
    fundos.push(['título jp', await titulo(0), 480, 142, 0.84]);
    fundos.push(['título br', await titulo(3), 480, 142, 0.84]);
    fundos.push(['menu jp (logo pequeno)', (c) => desenharFundoMenu(c, m.rec.cenarioPadrao, m.rec.vinheta, 100, 0.42), 140, 46, 0.3]);
    fundos.push(['abertura (escuro)', (c) => { c.fillStyle = '#04020a'; c.fillRect(0, 0, W, H); }, 480, 142, 0.84]);

    const saida: Resumo['fundos'] = [];
    const fotos: Record<string, string> = {};
    for (const [nome, pintar, x, y, sc] of fundos) {
      const fundo = novo();
      const fg = fundo.getContext('2d')!;
      pintar(fg);
      const lg = novo();
      const lc = lg.getContext('2d')!;
      L.desenharLogo(lc, x, y, sc, -1);
      const A = lc.getImageData(0, 0, W, H).data;
      const B = fg.getImageData(0, 0, W, H).data;
      // anel: pixel de fundo (sem logo) a até 5 px de um pixel do logo
      const alfa = (px: number, py: number): number => (px < 0 || py < 0 || px >= W || py >= H ? 0 : A[(py * W + px) * 4 + 3]!);
      const corte = y + (CORTE - 150) * sc; // linha entre as palavras no fundo
      const razoes: { inno: number[]; fighters: number[] } = { inno: [], fighters: [] };
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          if (alfa(px, py) > 0) continue;
          let perto = false;
          for (let d = 1; d <= 5 && !perto; d++) perto = alfa(px + d, py) > 250 || alfa(px - d, py) > 250 || alfa(px, py + d) > 250 || alfa(px, py - d) > 250;
          if (!perto) continue;
          const i = (py * W + px) * 4;
          const Lb = lum(B[i]!, B[i + 1]!, B[i + 2]!);
          // o contorno externo escuro encosta no fundo; o dourado vem logo dentro: vale o melhor dos dois
          razoes[py < corte ? 'inno' : 'fighters'].push(Math.max(contraste(Lb, LO), contraste(Lb, LE)));
        }
      }
      const resumir = (v: number[]): Borda => {
        v.sort((p, q) => p - q);
        return { anel: v.length, minimo: v[0] ?? 0, mediana: v[Math.floor(v.length / 2)] ?? 0, abaixoDe3: v.filter((r) => r < 3).length };
      };
      saida.push({ nome, inno: resumir(razoes.inno), fighters: resumir(razoes.fighters) });
      // foto composta para inspeção visual
      const foto = novo();
      const fo = foto.getContext('2d')!;
      fo.drawImage(fundo, 0, 0);
      L.desenharLogo(fo, x, y, sc, 0.4);
      fotos[nome] = foto.toDataURL('image/png');
    }

    // ---- emblema: cor única, sem depender dos lutadores ----
    const em = novo(480, 480);
    const eg = em.getContext('2d')!;
    L.desenharEmblema(eg, 240, 240, 132, 77, 1);
    const E = eg.getImageData(0, 0, 480, 480).data;
    let emOpacos = 0;
    const matizes: number[] = [];
    for (let i = 0; i < E.length; i += 4) {
      if (E[i + 3]! < 40) continue;
      emOpacos++;
      const { h: mh, s } = matiz(E[i]!, E[i + 1]!, E[i + 2]!);
      if (s > 0.2) matizes.push(mh);
    }
    matizes.sort((a, b) => a - b);
    return {
      opacos, innoClaros, innoAzuis, fightersClaros, fightersAzuis, horizonte, contrasteBordas, fundos: saida, emblemaOpacos: emOpacos,
      emblemaMatizes: [matizes[0] ?? 0, matizes[matizes.length - 1] ?? 0],
      fotos,
    };
  });

  // registro: o logo antigo do protótipo (para comparar, sem asserção)
  const antigo = await (async () => {
    const ctx = await browser.newContext();
    const p = await ctx.newPage();
    await p.addInitScript(() => { window.requestAnimationFrame = () => 0; });
    await p.goto(URL_PROTOTIPO);
    await p.waitForFunction(() => !!(window as any).SF && (window as any).SF.UI.ready, undefined, { timeout: 60_000 });
    const v = await p.evaluate(() => {
      const g = new Function('return { ctx, drawLogo, canvas }')();
      g.ctx.setTransform(2, 0, 0, 2, 0, 0);
      g.ctx.clearRect(0, 0, 960, 540);
      g.drawLogo(480, 270, 1, -1);
      const d = g.ctx.getImageData(0, 0, 1920, 1080).data;
      let frios = 0, opacos = 0;
      for (let i = 0; i < d.length; i += 4) {
        if (d[i + 3] < 128) continue;
        opacos++;
        const r = d[i], gg = d[i + 1], b = d[i + 2];
        const mx = Math.max(r, gg, b), mn = Math.min(r, gg, b), dd = mx - mn;
        if (dd === 0) continue;
        const s = dd / mx;
        let h = mx === r ? ((gg - b) / dd) % 6 : mx === gg ? (b - r) / dd + 2 : (r - gg) / dd + 4;
        h *= 60;
        if (h < 0) h += 360;
        if (s > 0.2 && h >= 150 && h <= 300) frios++;
      }
      return { frios, opacos };
    });
    await ctx.close();
    return v;
  })();

  const pct = (n: number, d: number): string => (d ? ((100 * n) / d).toFixed(0) : '0') + '%';
  const resumo = [
    `novo: ${r.opacos} px opacos; INNO ${r.innoAzuis}/${r.innoClaros} claros azuis (${pct(r.innoAzuis, r.innoClaros)}); FIGHTERS ${r.fightersAzuis}/${r.fightersClaros} claros azuis; horizonte cobalto em ${r.horizonte} px da linha; contraste ouro/escuro ${r.contrasteBordas.toFixed(1)}:1`,
    ...r.fundos.map(
      (f) =>
        `${f.nome}: INNO pior ${f.inno.minimo.toFixed(2)}:1 med ${f.inno.mediana.toFixed(2)}:1 <3:1 = ${f.inno.abaixoDe3} (anel ${f.inno.anel}); FIGHTERS pior ${f.fighters.minimo.toFixed(2)}:1 med ${f.fighters.mediana.toFixed(2)}:1 <3:1 = ${f.fighters.abaixoDe3} (anel ${f.fighters.anel})`,
    ),
    `emblema: ${r.emblemaOpacos} px, matizes ${r.emblemaMatizes.map((v) => v.toFixed(0)).join('..')}`,
    `antigo (protótipo): ${antigo.opacos} px opacos, ${antigo.frios} frios`,
  ].join('\n');
  info.annotations.push({ type: 'logo', description: resumo });
  console.log(resumo);

  const pasta = process.env['SALVAR_QUADROS'];
  if (pasta) {
    mkdirSync(pasta, { recursive: true });
    for (const [nome, png] of Object.entries(r.fotos)) writeFileSync(resolve(pasta, `logo_${nome.replace(/\W+/g, '_')}.png`), Buffer.from(png.split(',')[1]!, 'base64'));
  }

  // (1) INNO é azul (mais da metade dos pixels claros dele) e FIGHTERS continua brasa (nenhum pixel claro azul)
  expect(r.opacos).toBeGreaterThan(20_000);
  expect(r.innoClaros).toBeGreaterThan(5000);
  expect(r.innoAzuis / r.innoClaros, 'fração de pixels claros de INNO na faixa 195-250 graus').toBeGreaterThan(0.5);
  expect(r.fightersClaros).toBeGreaterThan(3000);
  expect(r.fightersAzuis, 'pixels claros azuis em FIGHTERS').toBe(0);
  // o antigo tinha o cromo azulado com horizonte cinza; a medição tem que enxergar o azul do protótipo
  expect(antigo.frios).toBeGreaterThan(1000);
  // (2) o horizonte de INNO é cobalto saturado (s > 0,6, matiz 215-235), não cinza-ardósia
  expect(r.horizonte).toBeGreaterThan(40);
  // (3) legibilidade: borda com 3:1 ou mais, por palavra, em todos os fundos (o aro claro é o piso)
  expect(r.contrasteBordas).toBeGreaterThan(15);
  for (const f of r.fundos) {
    for (const [palavra, b] of [['INNO', f.inno], ['FIGHTERS', f.fighters]] as const) {
      expect(b.anel, `${f.nome} ${palavra}: sem anel`).toBeGreaterThan(250);
      expect(b.abaixoDe3, `${f.nome} ${palavra}: pixels do contorno com menos de 3:1 contra o fundo (pior ${b.minimo.toFixed(2)})`).toBe(0);
      expect(b.mediana, `${f.nome} ${palavra}: mediana`).toBeGreaterThan(4);
    }
  }
  // (4) emblema de um tom só, azul (matizes entre 210 e 235 graus), e desenhado de verdade
  expect(r.emblemaOpacos).toBeGreaterThan(3000);
  expect(r.emblemaMatizes[0]).toBeGreaterThanOrEqual(210);
  expect(r.emblemaMatizes[1]).toBeLessThanOrEqual(235);
});
