/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, test, type Page } from '@playwright/test';

/*
 * P4 (Íris): VARREDURA dos balões com os TEXTOS FINAIS, no navegador (fonte carregada), em vez de só a fala de estresse.
 *  1) abertura: TODOS os pares ordenados de lutadores x TODAS as combinações de falas (com `contra` quando existe) x COMPLETA e CURTA.
 *     Para cada balão, o retângulo que a cena escolhe (`Provocacao.finais`, a geometria final) fica dentro de [12, 948], abaixo do topo permitido
 *     (86 com HUD, 62 sob as faixas) e NÃO encosta na região da cabeça de ninguém (`retanguloDaCabeca`). Dois balões juntos (CURTA) não se tocam: é
 *     informativo (há cantos de 10 a 44 px² em AMINU x NILA e CAMILLE x BAATAR; não reprova, está na lista de pendências).
 *  2) vitória: o ▶ do "pressione para seguir" não pode cair em cima do texto. Corrigido: o balão de vitória reserva uma faixa (RESERVA_DA_SETA = 14 px) embaixo
 *     das linhas e o ▶ mora nela (antes ele cobria a última letra em ~44% das falas). Mede, em TODAS as falas de vitória e em TODAS as larguras de linha: o topo do
 *     ▶ fica abaixo da última linha de texto, o balão tem <= 400 px de largura e <= 146 px de altura.
 */
test.describe.configure({ timeout: 900_000 });

async function abrirJogo(page: Page): Promise<void> {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/?seed=3&manual=1&expansao=1');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

test('abertura: todos os pares x todas as falas x COMPLETA/CURTA: balão dentro da tela, abaixo do HUD e fora da cabeça de todos', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'a medida do canvas não depende do viewport');
  await abrirJogo(page);
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('600 20px Barlow');
    await document.fonts.load('italic 800 19px "Barlow Condensed"');
    const P: any = await import(/* @vite-ignore */ ('/src/render/provocacao.ts' as string));
    const Bl: any = await import(/* @vite-ignore */ ('/src/render/balao.ts' as string));
    const T: any = await import(/* @vite-ignore */ ('/src/data/provocacoes.pt-BR.ts' as string));
    const h = (window as any).__inno;
    const elenco = h.mundo().elenco;
    const ids = Object.keys(elenco);
    const esperar = (ms: number): Promise<unknown> => new Promise((rr) => setTimeout(rr, ms));
    const tab = T.PROVOCACOES_PT_BR;
    const lista = (a: string, b: string): string[] => tab[a].contra?.[b]?.abertura ?? tab[a].abertura;
    let avaliados = 0;
    const cabeca: any[] = [];
    const fora: any[] = [];
    const juntos: any[] = [];
    for (const c1 of ids) {
      for (const c2 of ids) {
        h.ui.fade = 0;
        h.ui.fadeDir = 0;
        h.ui.set('fight', { cfg: { esquiva: true, mode: 'versus', c1, c2, cpu: null } });
        while (!h.ui.scene.espera.pronta) await esperar(20);
        h.avancar(1);
        const s = h.ui.scene;
        const g = h.mundo().game;
        const nomes: [string, string] = [elenco[c1].ch.name, elenco[c2].ch.name];
        for (const t1 of lista(c1, c2)) {
          for (const t2 of lista(c2, c1)) {
            for (const modo of ['completa', 'curta']) {
              const texts = [t1.split('{rival}').join(nomes[1]), t2.split('{rival}').join(nomes[0])];
              s.provocacao.zerar();
              const rot = P.montarRoteiro('abertura', modo, false, texts.map((t, i) => ({ falante: i, texto: t, n: t.length })));
              s.provocacao.iniciar(rot, { pitch: [1, 1], nomes, cores: ['#fff', '#fff'] });
              const alvos: number[] = modo === 'completa' ? rot.janelas.map((j: any) => j.abre + Math.min(40, Math.floor((j.fecha - j.abre) / 2))) : [Math.floor(rot.janelas[0].fecha / 2)];
              for (const alvo of alvos) {
                while (s.provocacao.tick < alvo) s.provocacao.avancar();
                h.desenhar();
              }
              for (const [i, rect] of s.provocacao.finais as Map<number, any>) {
                const j = rot.janelas[i];
                const poses = s.provocacao.posesFinais(g, elenco, rot, j);
                const cab = [0, 1].map((k) => s.provocacao.cabecaDe(g, elenco, k, poses[k], undefined, 0));
                avaliados++;
                const topoMin = modo === 'completa' ? 62 : 86;
                if (rect.x0 < 12 - 0.01 || rect.x1 > 948 + 0.01 || rect.y0 < topoMin - 0.01) fora.push({ c1, c2, modo, balao: i, rect, texto: texts[i] });
                for (const k of [0, 1]) {
                  const rc = Bl.retanguloDaCabeca(cab[k]);
                  const w = Math.min(rect.x1, rc.x1) - Math.max(rect.x0, rc.x0);
                  const hh = Math.min(rect.y1, rc.y1) - Math.max(rect.y0, rc.y0);
                  if (w > 0 && hh > 0) cabeca.push({ c1, c2, modo, balao: i, cabeca: k === 0 ? c1 : c2, area: Math.round(w * hh), texto: String(texts[i]).replace(/\n/g, '/') });
                }
              }
              if (modo === 'curta' && s.provocacao.finais.size === 2) {
                const [a, b] = [...s.provocacao.finais.values()] as any[];
                const w = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0);
                const hh = Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0);
                if (w > 0 && hh > 0) juntos.push({ c1, c2, area: Math.round(w * hh) });
              }
            }
          }
        }
      }
    }
    return { avaliados, cabeca: cabeca.slice(0, 20), nCabeca: cabeca.length, fora: fora.slice(0, 20), nFora: fora.length, juntos };
  });
  console.log(`varredura: ${r.avaliados} balões avaliados; cabeças cobertas ${r.nCabeca}; fora dos limites ${r.nFora}; CURTA com balões se tocando: ${JSON.stringify(r.juntos)}`);
  expect(r.avaliados).toBeGreaterThan(4000);
  expect(r.fora, 'balão fora de [12, 948] ou acima do topo permitido').toEqual([]);
  expect(r.cabeca, 'balão sobre a região da cabeça de alguém').toEqual([]);
});

test('vitória: o ▶ do "pressione para seguir" não cai em cima do texto (mora numa faixa reservada embaixo das linhas)', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'a medida do canvas não depende do viewport');
  await abrirJogo(page);
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('600 20px Barlow');
    const B: any = await import(/* @vite-ignore */ ('/src/render/balao.ts' as string));
    const T: any = await import(/* @vite-ignore */ ('/src/data/provocacoes.pt-BR.ts' as string));
    const h = (window as any).__inno;
    const elenco = h.mundo().elenco;
    const cv = document.createElement('canvas').getContext('2d')!;
    const tab = T.PROVOCACOES_PT_BR;
    const colide: string[] = [];
    let total = 0;
    for (const id of Object.keys(elenco)) {
      const f = tab[id];
      const listas: Array<[string, readonly string[]]> = [['vitoria', f.vitoria], ['vitoriaPerfeita', f.vitoriaPerfeita ?? []], ['vitoriaPorTempo', f.vitoriaPorTempo ?? []]];
      for (const [rv, c] of Object.entries(f.contra ?? {})) listas.push([`contra.${rv}`, (c as any).vitoria ?? []]);
      for (const [nome, ls] of listas) {
        for (const modelo of ls) {
          total++;
          const texto = modelo.split('{rival}').join('CENTELLA');
          for (const caixa of B.variantesDoBalao(cv, texto, elenco[id].ch.name, B.RESERVA_DA_SETA)) {
            const fimDoTexto = B.BALAO.margemTopo + B.BALAO.alturaDoNome + B.BALAO.alturaDaLinha * caixa.linhas.length;
            const topoDaSeta = caixa.h - B.BALAO.margemBase - (caixa.reserva || 16) / 2 - 5;
            const baseDaSeta = topoDaSeta + 10;
            if (topoDaSeta < fimDoTexto) colide.push(`${id}.${nome}: "${texto.split(String.fromCharCode(10)).join('/')}" (${caixa.linhas.length} linhas, ▶ no topo ${topoDaSeta} < texto até ${fimDoTexto})`);
            if (baseDaSeta > caixa.h) colide.push(`${id}.${nome}: ▶ passa da borda de baixo`);
            if (caixa.w > 400) colide.push(`${id}.${nome}: balão de ${caixa.w} px > 400`);
            if (caixa.h > 146) colide.push(`${id}.${nome}: balão de ${caixa.h} px de altura > 146`);
          }
        }
      }
    }
    return { total, colide };
  });
  console.log(`▶ x texto: ${r.colide.length} de ${r.total} falas de vitória colidem`);
  expect(r.colide).toEqual([]);
});

test('vitória, por PIXEL: o triângulo do ▶ (diferença entre o balão com e sem ▶) não toca nenhum pixel do texto, nas 108 falas x rivais x 3 larguras', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'a medida do canvas não depende do viewport');
  await abrirJogo(page);
  const r = await page.evaluate(async () => {
    await document.fonts.ready;
    await document.fonts.load('600 20px Barlow');
    await document.fonts.load('italic 800 19px "Barlow Condensed"');
    const B: any = await import(/* @vite-ignore */ ('/src/render/balao.ts' as string));
    const T: any = await import(/* @vite-ignore */ ('/src/data/provocacoes.pt-BR.ts' as string));
    const h = (window as any).__inno;
    const elenco = h.mundo().elenco;
    const tab = T.PROVOCACOES_PT_BR;
    const cv = document.createElement('canvas');
    cv.width = 960;
    cv.height = 540;
    const ctx = cv.getContext('2d', { willReadFrequently: true })!;
    const toca: string[] = [];
    let casos = 0;
    let semTriangulo = 0;
    for (const id of Object.keys(elenco)) {
      const f = tab[id];
      const listas: Array<[string, readonly string[]]> = [['vitoria', f.vitoria], ['vitoriaPerfeita', f.vitoriaPerfeita ?? []], ['vitoriaPorTempo', f.vitoriaPorTempo ?? []]];
      for (const [rv, c] of Object.entries(f.contra ?? {})) listas.push([`contra.${rv}`, (c as any).vitoria ?? []]);
      for (const [nome, ls] of listas) {
        for (const modelo of ls) {
          for (const rival of ['HAYATO', 'CENTELLA']) {
            const texto = modelo.split('{rival}').join(rival);
            for (const caixa of B.variantesDoBalao(cv.getContext('2d'), texto, elenco[id].ch.name, B.RESERVA_DA_SETA)) {
              casos++;
              const col = { x: 100, y: 100, w: caixa.w, h: caixa.h, lado: 'cima', base: { x: 150, y: 100 + caixa.h }, ponta: { x: 150, y: 100 + caixa.h }, cobreFalante: 0, cobreOutros: 0, cobreBaloes: 0 };
              const desenhar = (seta: boolean): Uint8ClampedArray => {
                ctx.clearRect(0, 0, 960, 540);
                B.desenharBalao(ctx, caixa, col, { letras: Infinity, escala: 1, alfa: 1, seta, tick: 0, piscar: false, corDoNome: '#ffffff' });
                return ctx.getImageData(90, 90, caixa.w + 20, caixa.h + 20).data;
              };
              const sem = desenhar(false);
              const com = desenhar(true);
              const W = caixa.w + 20;
              const H = caixa.h + 20;
              // fundo puro do balão: um pixel do interior, junto da margem esquerda, abaixo das linhas
              const fundoIdx = ((10 + caixa.h - 6) * W + (10 + 6)) * 4;
              const fundo = [sem[fundoIdx], sem[fundoIdx + 1], sem[fundoIdx + 2], sem[fundoIdx + 3]];
              const ehTexto = (i: number): boolean => sem[i] !== fundo[0] || sem[i + 1] !== fundo[1] || sem[i + 2] !== fundo[2] || sem[i + 3] !== fundo[3];
              let tri = 0;
              let encosta = 0;
              for (let y = 1; y < H - 1; y++) {
                for (let x = 1; x < W - 1; x++) {
                  const i = (y * W + x) * 4;
                  if (com[i] === sem[i] && com[i + 1] === sem[i + 1] && com[i + 2] === sem[i + 2] && com[i + 3] === sem[i + 3]) continue;
                  tri++;
                  // o pixel do triângulo, ou algum vizinho dele, é texto/borda do balão sem ▶?
                  for (let dy = -1; dy <= 1; dy++) {
                    for (let dx = -1; dx <= 1; dx++) {
                      const j = ((y + dy) * W + (x + dx)) * 4;
                      if (ehTexto(j)) encosta++;
                    }
                  }
                }
              }
              if (tri === 0) semTriangulo++;
              if (encosta > 0) toca.push(`${id}.${nome} [${caixa.linhas.length} linhas, ${caixa.w}x${caixa.h}] "${texto.split(String.fromCharCode(10)).join('/')}": ${encosta} contatos`);
            }
          }
        }
      }
    }
    return { casos, semTriangulo, toca: toca.slice(0, 15), nToca: toca.length };
  });
  console.log(`▶ por pixel: ${r.casos} balões; triângulo ausente em ${r.semTriangulo}; tocando texto/borda em ${r.nToca}`);
  expect(r.semTriangulo, 'o ▶ foi mesmo desenhado em todos').toBe(0);
  expect(r.toca).toEqual([]);
});
