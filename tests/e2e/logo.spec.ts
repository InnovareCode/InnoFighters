/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { expect, test } from '@playwright/test';

/*
 * Logo novo (paleta A, "Ouro Forjado"): medido no navegador, à parte da comparação com o protótipo
 * (fidelidade-ui.spec.ts desliga logo, emblema e brasas dos dois lados de propósito).
 *
 * Mede: (1) só família quente, sem pixel frio; (2) o horizonte de INNO é o marrom-ouro #9a5a12, não cinza;
 * (3) contraste do contorno externo escuro e do contorno interno dourado contra os fundos reais (cenários jp e br
 * sem e com a gradação do título, o fundo do menu e o fundo escuro da abertura); (4) o emblema é de cor única.
 * O logo ANTIGO do protótipo é medido ao lado só para registro (o antigo tinha pixels frios).
 */

const URL_PROTOTIPO = pathToFileURL(resolve('prototipo/inno-fighters-artefato.html')).href;
test.describe.configure({ timeout: 120_000 });

type Resumo = {
  frios: number;
  opacos: number;
  horizonte: number;
  contrasteBordas: number;
  fundos: Array<{ nome: string; anel: number; minimo: number; mediana: number; abaixoDe3: number }>;
  emblemaFrios: number;
  emblemaOpacos: number;
  emblemaMatizes: number[];
};

test('logo Ouro Forjado: só quente, horizonte marrom-ouro e legível sobre jp, br e o fundo escuro', async ({ page, browser }, info) => {
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
    let frios = 0, opacos = 0;
    for (let i = 0; i < dados.length; i += 4) {
      if (dados[i + 3]! < 128) continue;
      opacos++;
      const { h: mh, s } = matiz(dados[i]!, dados[i + 1]!, dados[i + 2]!);
      if (s > 0.2 && mh >= 150 && mh <= 300) frios++;
    }
    // horizonte de INNO: linha em que o degradê chega a 50% (y = 150 - 168*0.82 + 0.5*(168*0.82 + 4))
    const yHor = Math.round(150 - 168 * 0.82 + 0.5 * (168 * 0.82 + 4));
    let horizonte = 0;
    for (let x = 0; x < 760; x++) {
      const i = (yHor * 760 + x) * 4;
      if (dados[i + 3]! < 250) continue;
      const d = Math.hypot(dados[i]! - 0x9a, dados[i + 1]! - 0x5a, dados[i + 2]! - 0x12);
      if (d < 40) horizonte++;
    }
    // contraste entre o contorno interno dourado e o externo escuro (o que segura a leitura sobre qualquer fundo)
    const LE = lum(0xff, 0xe0, 0x8a);
    const LO = lum(0x0b, 0x03, 0x06);
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
      const razoes: number[] = [];
      for (let py = 0; py < H; py++) {
        for (let px = 0; px < W; px++) {
          if (alfa(px, py) > 0) continue;
          let perto = false;
          for (let d = 1; d <= 5 && !perto; d++) perto = alfa(px + d, py) > 250 || alfa(px - d, py) > 250 || alfa(px, py + d) > 250 || alfa(px, py - d) > 250;
          if (!perto) continue;
          const i = (py * W + px) * 4;
          const Lb = lum(B[i]!, B[i + 1]!, B[i + 2]!);
          // o contorno externo escuro encosta no fundo; o dourado vem logo dentro: vale o melhor dos dois
          razoes.push(Math.max(contraste(Lb, LO), contraste(Lb, LE)));
        }
      }
      razoes.sort((a, b) => a - b);
      saida.push({
        nome,
        anel: razoes.length,
        minimo: razoes[0] ?? 0,
        mediana: razoes[Math.floor(razoes.length / 2)] ?? 0,
        abaixoDe3: razoes.filter((v) => v < 3).length,
      });
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
    let emFrios = 0, emOpacos = 0;
    const matizes: number[] = [];
    for (let i = 0; i < E.length; i += 4) {
      if (E[i + 3]! < 40) continue;
      emOpacos++;
      const { h: mh, s } = matiz(E[i]!, E[i + 1]!, E[i + 2]!);
      if (s > 0.2 && mh >= 150 && mh <= 300) emFrios++;
      if (s > 0.2) matizes.push(mh);
    }
    matizes.sort((a, b) => a - b);
    return {
      frios, opacos, horizonte, contrasteBordas, fundos: saida, emblemaFrios: emFrios, emblemaOpacos: emOpacos,
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

  const resumo = [
    `novo: ${r.opacos} px opacos, ${r.frios} frios; horizonte #9a5a12 em ${r.horizonte} px da linha; contraste dourado/escuro ${r.contrasteBordas.toFixed(1)}:1`,
    ...r.fundos.map((f) => `${f.nome}: anel ${f.anel} px, pior ${f.minimo.toFixed(2)}:1, mediana ${f.mediana.toFixed(2)}:1, abaixo de 3:1 = ${f.abaixoDe3}`),
    `emblema: ${r.emblemaOpacos} px, ${r.emblemaFrios} frios, matizes ${r.emblemaMatizes.map((v) => v.toFixed(0)).join('..')}`,
    `antigo (protótipo): ${antigo.opacos} px opacos, ${antigo.frios} frios`,
  ].join('\n');
  info.annotations.push({ type: 'logo', description: resumo });
  console.log(resumo);

  const pasta = process.env['SALVAR_QUADROS'];
  if (pasta) {
    mkdirSync(pasta, { recursive: true });
    for (const [nome, png] of Object.entries(r.fotos)) writeFileSync(resolve(pasta, `logo_${nome.replace(/\W+/g, '_')}.png`), Buffer.from(png.split(',')[1]!, 'base64'));
  }

  // (1) família quente única
  expect(r.opacos).toBeGreaterThan(20_000);
  expect(r.frios, 'pixels frios (azul/ciano/roxo) no logo').toBe(0);
  // o antigo tinha o cromo azulado; a medição tem que enxergar a diferença
  expect(antigo.frios).toBeGreaterThan(1000);
  // (2) o horizonte de INNO é ouro escuro, não cinza-ardósia
  expect(r.horizonte).toBeGreaterThan(40);
  // (3) legibilidade
  expect(r.contrasteBordas).toBeGreaterThan(7);
  for (const f of r.fundos) {
    expect(f.anel, `${f.nome}: sem anel`).toBeGreaterThan(500);
    expect(f.abaixoDe3, `${f.nome}: pixels do contorno com menos de 3:1 contra o fundo (pior ${f.minimo.toFixed(2)})`).toBe(0);
    expect(f.mediana, `${f.nome}: mediana`).toBeGreaterThan(4);
  }
  // (4) emblema de cor única (matiz entre vermelho-alaranjado e amarelo), e desenhado de verdade
  expect(r.emblemaOpacos).toBeGreaterThan(3000);
  expect(r.emblemaFrios).toBe(0);
  expect(r.emblemaMatizes[0]).toBeGreaterThanOrEqual(15);
  expect(r.emblemaMatizes[1]).toBeLessThanOrEqual(60);
});
