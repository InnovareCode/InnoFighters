/* eslint-disable @typescript-eslint/no-explicit-any */
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { expect, test, type CDPSession, type Page } from '@playwright/test';
import { SEM_PROVOCACAO } from './_luta';

/*
 * P2 (Lyra): a PROVOCAÇÃO medida no navegador, com a arte e a fonte reais (docs/spec-provocacao-prerround-e-vitoria.md §10 itens 11 e 12).
 * A lógica está provada em tests/unit/p2-provocacao-{linha,cena}.test.ts e p2-balao.test.ts. Aqui:
 *  - as falas de TODOS os lutadores cabem nos limites, medidas na fonte carregada (`document.fonts.ready`) com o nome de rival mais largo;
 *  - o balão medido por A/B de pixels (o quadro com e sem balão): dentro da tela, abaixo do HUD/faixas, sem cobrir o rosto (ZENON: <= 16 px);
 *  - o fluxo real com o motor: parado durante os balões, pular por ataque/ENTER/toque/clique, a luta fecha pelo fim da vitória;
 *  - as Opções NÃO têm chave de provocação (sempre ligadas; decisão do dono).
 *
 * SALVAR_CAPTURAS=<pasta> grava os quadros 1920x1080 (`SALVAR_CAPTURAS=arte-fonte/capturas npx playwright test provocacao`).
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

const PERFIS = {
  desktop: { width: 1280, height: 720 },
  celular: { width: 844, height: 390 },
} as const;

async function abrirJogo(page: Page, perfil: keyof typeof PERFIS, query = ''): Promise<void> {
  await page.setViewportSize(PERFIS[perfil]);
  await page.goto(`/?seed=3&manual=1&expansao=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
}

/** Abre uma luta e espera a arte (NÃO anda tick nenhum). `semProvocacao` liga o gancho de teste. */
async function abrirLuta(page: Page, cfg: Record<string, unknown>, semProvocacao = false): Promise<void> {
  await hook(page, `(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('fight', { cfg: ${JSON.stringify({ esquiva: true, ...cfg })} }); ${semProvocacao ? `(${SEM_PROVOCACAO})(h);` : ''} }`);
  await page.waitForFunction(() => (window as any).__inno.ui.scene.espera.pronta === true, undefined, { timeout: 30_000 });
}

const FALA_LARGA = 'Você lutou bem. Eu lutei melhor. Treine mais um pouco, rapaz.'; // 61 caracteres: perto do teto de 64

// ---------------------------------------------------------------------------------------------------------------------------------
// 1) As falas de todos os lutadores, medidas na fonte carregada
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P2: as falas cabem (medidas no navegador, fonte carregada, nome de rival mais largo)', () => {
  test('todas as falas de todos os lutadores: linhas <= 372 px em Bangers 24 (caixa alta, +1 px de tracking), 2 linhas (1 em revanche/decisivo) e balão <= 404 px (372 + 2 x 16)', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'a medida do canvas não depende do viewport');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    const r = await page.evaluate(async () => {
      await document.fonts.ready;
      await document.fonts.load('400 24px Bangers');
      await document.fonts.load('italic 800 19px "Barlow Condensed"');
      const B: any = await import(/* @vite-ignore */ ('/src/render/balao.ts' as string));
      const D: any = await import(/* @vite-ignore */ ('/src/data/provocacoes.ts' as string));
      const T: any = await import(/* @vite-ignore */ ('/src/render/texto.ts' as string));
      const h = (window as any).__inno;
      const elenco = h.mundo().elenco;
      const ids = Object.keys(elenco);
      const cv = document.createElement('canvas').getContext('2d')!;
      // a fala é medida como o balão a mede: Bangers 24, tracking de 1 px, em CAIXA ALTA
      cv.font = T.FONTE_DA_FALA(24);
      (cv as any).letterSpacing = '1px';
      const largura = (s: string): number => cv.measureText(s).width;
      const nomes: string[] = ids.map((id) => elenco[id].ch.name);
      const maisLargo = nomes.reduce((a, b) => (largura(b) > largura(a) ? b : a));
      const maxLinhas: Record<string, number> = { abertura: 2, vitoria: 2, vitoriaPerfeita: 2, vitoriaPorTempo: 2, revanche: 1, decisivo: 1, 'contra.abertura': 2, 'contra.vitoria': 2 };
      const problemas: string[] = [];
      let maiorLinha = { px: 0, onde: '' };
      let maiorBalao = { px: 0, onde: '' };
      let total = 0;
      const conferir = (onde: string, lista: readonly string[] | undefined, cat: string): void => {
        for (const [i, modelo] of (lista ?? []).entries()) {
          total++;
          const texto = modelo.split('{rival}').join(maisLargo);
          const linhas: string[] = B.quebrarPorMedida(B.emCaixaAlta(texto), 372, largura);
          if (linhas.length > (maxLinhas[cat] as number)) problemas.push(`${onde}[${i}]: ${linhas.length} linhas (máx ${maxLinhas[cat]}): ${texto}`);
          for (const l of linhas) {
            const px = largura(l);
            if (px > 372) problemas.push(`${onde}[${i}]: linha de ${px.toFixed(1)} px > 372: ${l}`);
            if (px > maiorLinha.px) maiorLinha = { px, onde: `${onde}[${i}]` };
          }
          const caixa = B.medirBalao(cv, texto, 'WEI LONG');
          if (caixa.w > 404) problemas.push(`${onde}[${i}]: balão de ${caixa.w} px > 404`);
          if (caixa.w > maiorBalao.px) maiorBalao = { px: caixa.w, onde: `${onde}[${i}]` };
        }
      };
      for (const id of ids) {
        const f = D.falasDe(id);
        for (const cat of ['abertura', 'revanche', 'decisivo', 'vitoria', 'vitoriaPerfeita', 'vitoriaPorTempo']) conferir(`${id}.${cat}`, f[cat], cat);
        for (const [rival, par] of Object.entries(f.contra ?? {}) as Array<[string, any]>) {
          conferir(`${id}.contra[${rival}].abertura`, par.abertura, 'contra.abertura');
          conferir(`${id}.contra[${rival}].vitoria`, par.vitoria, 'contra.vitoria');
        }
      }
      return { problemas, maiorLinha, maiorBalao, total, maisLargo, fontes: document.fonts.status };
    });
    expect(r.fontes).toBe('loaded');
    expect(r.total).toBeGreaterThan(100);
    expect(r.problemas).toEqual([]);
    // registra a folga: o piso da medida (nome de rival mais largo, fala mais larga)
    console.log(`falas: ${r.total}; rival mais largo = ${r.maisLargo}; linha mais larga ${r.maiorLinha.px.toFixed(1)} px (${r.maiorLinha.onde}); balão mais largo ${r.maiorBalao.px} px (${r.maiorBalao.onde})`);
    expect(erros).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 2) O balão por A/B de pixels
// ---------------------------------------------------------------------------------------------------------------------------------
type Cenario = {
  nome: string;
  c1: string;
  c2: string;
  tipo: 'abertura' | 'rodada' | 'vitoria';
  modo: 'completa' | 'curta';
  falas: Array<{ falante: 0 | 1; texto: string }>;
  /** Em que tick da provocação medir. */
  tick: number;
  estado?: 'round2' | 'vitoria';
  vencedor?: 0 | 1;
};

type Medida = {
  hud: boolean;
  faixa: number;
  rects: Array<{ x0: number; y0: number; x1: number; y1: number }>;
  rosto: Array<{ id: string; pixels: number; profundidade: number; topo: number; altura: number }>;
  cssCorpo: number;
  cssNome: number;
  textos: string[];
};

/** Monta o cenário, anda `tick` ticks da provocação e mede o balão por A/B: o quadro com e sem ele. */
async function medirCenario(page: Page, c: Cenario): Promise<Medida> {
  await abrirLuta(page, { mode: 'versus', c1: c.c1, c2: c.c2, cpu: null });
  return page.evaluate(async (c) => {
    const h = (window as any).__inno;
    const imp = (p: string): Promise<any> => import(/* @vite-ignore */ p as string);
    const [P, W, L, CAM, AP, TELA] = await Promise.all(['/src/render/provocacao.ts', '/src/render/mundo.ts', '/src/render/lutador.ts', '/src/render/camera.ts', '/src/render/apresentacao-lutadores.ts', '/src/render/tela.ts'].map(imp));
    const s = h.ui.scene;
    const m = h.mundo();
    const g = m.game;
    s.aberturaPendente = false;
    if (c.estado === 'round2') {
      g.round = 2;
      g.p1.wins = 0;
      g.p2.wins = 1;
    }
    if (c.estado === 'vitoria') {
      g.phase = 'matchend';
      g.t = 60;
      g.matchWinner = c.vencedor;
      g.winner = c.vencedor;
      const v = c.vencedor as 0 | 1;
      g.fighters[v].setState('win');
      g.fighters[1 - v].setState('ko');
      g.p1.atualizarPose(); // o quadro de verdade: o perdedor no chão, o vencedor em win (o motor faz isto no fim de cada update)
      g.p2.atualizarPose();
    }
    const ids = [g.p1.id, g.p2.id];
    const roteiro = P.montarRoteiro(c.tipo, c.modo, false, c.falas.map((f: any) => ({ falante: f.falante, texto: f.texto, n: f.texto.length })));
    s.provocacao.iniciar(roteiro, {
      pitch: ids.map((id: string) => m.elenco[id].ch.pitch),
      nomes: ids.map((id: string) => m.elenco[id].ch.name),
      cores: [0, 1].map((i) => L.chDaFicha(m.elenco[ids[i]].ch, g.fighters[i].ficha).fire[0]),
    });
    h.avancar(c.tick);

    const cv = document.getElementById('jogo') as HTMLCanvasElement;
    const ctx = cv.getContext('2d')!;
    const textos: string[] = [];
    const orig = CanvasRenderingContext2D.prototype.fillText;
    CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, ...r: any[]) {
      textos.push(String(t));
      return (orig as any).call(this, t, ...r);
    };
    h.desenhar();
    CanvasRenderingContext2D.prototype.fillText = orig;
    const comBalao = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const vista = s.provocacao.vista(g, m.elenco);
    TELA.usarEspacoLogico(ctx);
    W.desenharMundo(ctx, g, m.rec, m.efeitos, m.petalasLuta, h.ui.c.rngVisual, {
      tremor: false,
      alvoTreino: g.dummy,
      esquiva: h.ui.c.regras.esquiva,
      hud: vista.quadro.hud,
      overlay: vista.quadro.overlay,
      poses: vista.poses,
      deslocamento: vista.deslocamento,
      ...(vista.zoom ? { zoom: vista.zoom } : {}),
    });
    const semBalao = ctx.getImageData(0, 0, cv.width, cv.height).data;
    const W2 = cv.width;
    const H2 = cv.height;
    const k = W2 / 960;
    // máscara do balão: o que mudou, só entre as faixas de cinema (y 56..484) para não contar as faixas
    const y0 = Math.round(56 * k);
    const y1 = Math.round((540 - 56) * k);
    const diff = new Uint8Array(W2 * H2);
    for (let y = y0; y < y1; y++) {
      for (let x = 0; x < W2; x++) {
        const i = (y * W2 + x) * 4;
        if (Math.abs(comBalao[i]! - semBalao[i]!) + Math.abs(comBalao[i + 1]! - semBalao[i + 1]!) + Math.abs(comBalao[i + 2]! - semBalao[i + 2]!) > 24) diff[y * W2 + x] = 1;
      }
    }
    // retângulos dos balões: componentes por faixa de colunas e, dentro dela, por faixa de linhas (dois balões empilhados no vão ficam separados por 8 px)
    const cols = new Uint8Array(W2);
    for (let y = 0; y < H2; y++) for (let x = 0; x < W2; x++) if (diff[y * W2 + x]) cols[x] = 1;
    const rects: Array<{ x0: number; y0: number; x1: number; y1: number }> = [];
    for (let x = 0; x < W2; ) {
      if (!cols[x]) {
        x++;
        continue;
      }
      let xe = x;
      while (xe < W2 && cols[xe]) xe++;
      const linhas = new Uint8Array(H2);
      for (let xx = x; xx < xe; xx++) for (let y = 0; y < H2; y++) if (diff[y * W2 + xx]) linhas[y] = 1;
      const corridas: Array<[number, number]> = [];
      for (let y = 0; y < H2; ) {
        if (!linhas[y]) {
          y++;
          continue;
        }
        let ye = y;
        while (ye < H2 && linhas[ye]) ye++;
        // um vão de menos de 4 px lógicos (o rabicho, a borda) continua sendo o mesmo balão
        const ultima = corridas[corridas.length - 1];
        if (ultima && y - ultima[1] < 4 * k) ultima[1] = ye;
        else corridas.push([y, ye]);
        y = ye;
      }
      for (const [ya, yb] of corridas) if (xe - x > 40 && yb - ya > 30) rects.push({ x0: x / k, y0: ya / k, x1: xe / k, y1: yb / k });
      x = xe;
    }
    // silhueta de cada lutador (desenhado sozinho com as mesmas transformações) e quanto do rosto o balão cobre
    const rosto: any[] = [];
    for (const i of [0, 1]) {
      const f = g.fighters[i];
      const off = document.createElement('canvas');
      off.width = W2;
      off.height = H2;
      const x = off.getContext('2d')!;
      x.setTransform(k, 0, 0, k, 0, 0);
      if (vista.zoom) {
        x.translate(vista.zoom.x, 470);
        x.scale(vista.zoom.fator, vista.zoom.fator);
        x.translate(-vista.zoom.x, -470);
      }
      CAM.aplicarCamera(x, g.cam, 0, h.ui.c.rngVisual);
      x.translate(vista.deslocamento[i] ?? 0, 0);
      const pose = vista.poses[i];
      L.desenharLutador(x, pose ? AP.comPose(f, pose) : AP.leituraApresentada(g, f), m.elenco[f.id].ch, m.elenco[f.id].arte);
      const d = x.getImageData(0, 0, W2, H2).data;
      let topo = H2;
      let base = 0;
      for (let y = 0; y < H2; y++) for (let xx = 0; xx < W2; xx++) if (d[(y * W2 + xx) * 4 + 3]! > 120) { if (y < topo) topo = y; if (y > base) base = y; }
      const altura = base - topo;
      // a região do ROSTO: a caixa da cabeça. Altura = 22% do corpo; largura = ±18% do corpo em torno do centro dos 8% de cima da silhueta (o cabelo/crânio),
      // para o ombro e o braço (que a pose estica para o lado) não contarem como rosto
      const limite = topo + Math.round(altura * 0.22);
      let somaX = 0;
      let nTopo = 0;
      for (let y = topo; y < topo + Math.round(altura * 0.08); y++) for (let xx = 0; xx < W2; xx++) if (d[(y * W2 + xx) * 4 + 3]! > 120) { somaX += xx; nTopo++; }
      const centro = nTopo ? somaX / nTopo : 0;
      const meia = 0.18 * altura;
      let pixels = 0;
      let profundidade = 0;
      for (let xx = Math.max(0, Math.floor(centro - meia)); xx < Math.min(W2, Math.ceil(centro + meia)); xx++) {
        let col = 0;
        for (let y = topo; y < limite; y++) if (d[(y * W2 + xx) * 4 + 3]! > 120 && diff[y * W2 + xx]) col++;
        pixels += col;
        if (col > profundidade) profundidade = col;
      }
      rosto.push({ id: f.id, pixels: pixels / (k * k), profundidade: profundidade / k, topo: topo / k, altura: altura / k });
    }
    const css = cv.clientWidth / 960;
    return { hud: vista.quadro.hud, faixa: vista.quadro.faixa, rects, rosto, cssCorpo: 24 * css, cssNome: 19 * css, textos };
  }, c);
}

/** As asserções do balão: dentro da tela, abaixo do HUD/faixas, sem cobrir o rosto de ninguém (ZENON/BAATAR: <= 16 px de profundidade). */
function conferirMedida(med: Medida, c: Cenario, quantos: number): void {
  expect(med.rects, `${c.nome}: balões desenhados`).toHaveLength(quantos);
  for (const r of med.rects) {
    expect(r.x0, `${c.nome} esquerda`).toBeGreaterThanOrEqual(11);
    expect(r.x1, `${c.nome} direita`).toBeLessThanOrEqual(949);
    expect(r.y0, `${c.nome} topo (HUD ${String(med.hud)})`).toBeGreaterThanOrEqual((med.hud ? 86 : 62) - 1);
    expect(r.y1 - r.y0, `${c.nome} altura`).toBeLessThanOrEqual(146 + BALAO_RABICHO + 2); // até 4 linhas (a variante estreita) + a faixa do ▶ da vitória
    expect(r.x1 - r.x0, `${c.nome} largura`).toBeLessThanOrEqual(404 + BALAO_RABICHO + 4); // linhaMax 372 + 2 x 16 de margem (Tarja de Impacto; era 400 com margem de 14) + o rabicho + o contorno de 5 px
  }
  for (const f of med.rosto) {
    const alto = f.altura > 300; // ZENON (escala 1,32) e BAATAR (1,28): o corpo passa de 300 px
    if (alto) expect(f.profundidade, `${c.nome}: ${f.id} cobre a cabeça por ${f.profundidade.toFixed(1)} px`).toBeLessThanOrEqual(16);
    else expect(f.pixels, `${c.nome}: ${f.id} tem o rosto coberto (${f.pixels.toFixed(0)} px²)`).toBe(0);
  }
}
const BALAO_RABICHO = 12;

const cenarios = (perfil: keyof typeof PERFIS): Cenario[] => [
  // o pior caso de largura: a fala mais larga na boca de quem tem o nome de rival mais largo; hayato (baixo) e wei-long (nome largo)
  { nome: `abertura-larga-${perfil}`, c1: 'hayato', c2: 'centella', tipo: 'abertura', modo: 'completa', falas: [{ falante: 0, texto: FALA_LARGA }, { falante: 1, texto: 'Hoje eu não perco, HAYATO. Pode vir com tudo!' }], tick: 44 + 60 },
  { nome: `abertura-p2-${perfil}`, c1: 'hayato', c2: 'centella', tipo: 'abertura', modo: 'completa', falas: [{ falante: 0, texto: 'Calma, CENTELLA.' }, { falante: 1, texto: FALA_LARGA }], tick: 54 + 84 + 60 },
  // os dois mais altos: ZENON (1,32) contra BAATAR (1,28), um falando em cada ponta
  { nome: `abertura-zenon-baatar-${perfil}`, c1: 'zenon', c2: 'baatar', tipo: 'abertura', modo: 'completa', falas: [{ falante: 0, texto: FALA_LARGA }, { falante: 1, texto: 'Falas curtas bastam, BAATAR.' }], tick: 44 + 60 },
  { nome: `abertura-baatar-zenon-p2-${perfil}`, c1: 'baatar', c2: 'zenon', tipo: 'abertura', modo: 'completa', falas: [{ falante: 0, texto: 'Pequena.' }, { falante: 1, texto: FALA_LARGA }], tick: 54 + 84 + 60 },
  // CURTA: os dois balões ao mesmo tempo, sem se encostar
  { nome: `abertura-curta-${perfil}`, c1: 'hayato', c2: 'wei-long', tipo: 'abertura', modo: 'curta', falas: [{ falante: 0, texto: FALA_LARGA }, { falante: 1, texto: FALA_LARGA }], tick: 30 },
  { nome: `abertura-curta-zenon-${perfil}`, c1: 'zenon', c2: 'baatar', tipo: 'abertura', modo: 'curta', falas: [{ falante: 0, texto: FALA_LARGA }, { falante: 1, texto: FALA_LARGA }], tick: 30 },
  // round 2+: 1 linha, o HUD fica (o topo do balão passa de y 86)
  { nome: `rodada-hayato-${perfil}`, c1: 'hayato', c2: 'caio', tipo: 'rodada', modo: 'completa', falas: [{ falante: 0, texto: 'De novo? Eu espero, CAIO.' }], tick: 70, estado: 'round2' },
  { nome: `rodada-zenon-${perfil}`, c1: 'zenon', c2: 'hayato', tipo: 'rodada', modo: 'completa', falas: [{ falante: 0, texto: 'Ainda de pé, HAYATO?' }], tick: 70, estado: 'round2' },
  // round 2+ com a cinemática CURTA/DESLIGADA: o mesmo balão de 1 linha, texto inteiro com fade (a opção PROVOCAÇÕES é quem liga)
  { nome: `rodada-curta-baatar-${perfil}`, c1: 'baatar', c2: 'centella', tipo: 'rodada', modo: 'curta', falas: [{ falante: 0, texto: 'Ainda de pé, CENTELLA?' }], tick: 40, estado: 'round2' },
  // vitória COMPLETA com o push-in final (1,08): o vencedor mais alto e um baixo
  { nome: `vitoria-zenon-${perfil}`, c1: 'hayato', c2: 'zenon', tipo: 'vitoria', modo: 'completa', falas: [{ falante: 1, texto: FALA_LARGA }], tick: 16 + 60, estado: 'vitoria', vencedor: 1 },
  { nome: `vitoria-hayato-${perfil}`, c1: 'hayato', c2: 'centella', tipo: 'vitoria', modo: 'completa', falas: [{ falante: 0, texto: FALA_LARGA }], tick: 16 + 60, estado: 'vitoria', vencedor: 0 },
  { nome: `vitoria-baatar-${perfil}`, c1: 'zenon', c2: 'baatar', tipo: 'vitoria', modo: 'completa', falas: [{ falante: 1, texto: FALA_LARGA }], tick: 16 + 60, estado: 'vitoria', vencedor: 1 },
  { nome: `vitoria-curta-${perfil}`, c1: 'camille', c2: 'zenon', tipo: 'vitoria', modo: 'curta', falas: [{ falante: 0, texto: FALA_LARGA }], tick: 30, estado: 'vitoria', vencedor: 0 },
];

for (const perfil of ['desktop', 'celular'] as const) {
  test.describe(`P2: o balão medido por A/B de pixels (${perfil} ${PERFIS[perfil].width}x${PERFIS[perfil].height})`, () => {
    test(`dentro da tela, abaixo do HUD/faixas, sem cobrir o rosto; texto >= 13 px CSS${perfil === 'celular' ? ' no celular deitado' : ''}`, async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      const relato: string[] = [];
      for (const c of cenarios(perfil)) {
        const med = await medirCenario(page, c);
        await capturar(page, `provocacao-${c.nome}`); // antes das asserções: o quadro que reprova também fica salvo
        const juntos = c.modo === 'curta' && c.tipo === 'abertura';
        conferirMedida(med, c, juntos ? 2 : 1);
        // dois balões da CURTA não se encostam
        if (juntos) {
          const [r0, r1] = med.rects as [Medida['rects'][0], Medida['rects'][0]];
          const lado = Math.min(r0.x1, r1.x1) - Math.max(r0.x0, r1.x0);
          const alto = Math.min(r0.y1, r1.y1) - Math.max(r0.y0, r1.y0);
          expect(lado > 0 && alto > 0, `${c.nome}: os dois balões não se sobrepõem`).toBe(false);
        }
        // o texto do balão no aparelho: a fonte do corpo e a etiqueta do nome em px CSS
        expect(med.cssCorpo, `${c.nome} corpo`).toBeGreaterThanOrEqual(perfil === 'celular' ? 17 : 24);
        expect(med.cssNome, `${c.nome} nome`).toBeGreaterThanOrEqual(perfil === "celular" ? 13 : 19);
        relato.push(`${c.nome}: ${med.rects.map((r) => `[${r.x0.toFixed(0)},${r.y0.toFixed(0)} ${(r.x1 - r.x0).toFixed(0)}x${(r.y1 - r.y0).toFixed(0)}]`).join(' ')} rosto ${med.rosto.map((f) => `${f.id}:${f.pixels.toFixed(0)}px²/${f.profundidade.toFixed(0)}px`).join(' ')} css ${med.cssCorpo.toFixed(1)}/${med.cssNome.toFixed(1)}`);
      }
      console.log(`\n${perfil}\n${relato.join('\n')}`);
      expect(erros).toEqual([]);
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 3) O fluxo real com o motor
// ---------------------------------------------------------------------------------------------------------------------------------
const estadoDoMotor = `(h) => { const g = h.mundo().game; return { tick: g.tick, t: g.t, fase: g.phase, round: g.round, rng: g.rng.estado ? g.rng.estado() : null }; }`;

for (const perfil of ['desktop', 'celular'] as const) {
  test.describe(`P2: o fluxo real (${perfil})`, () => {
    test('a luta vs CPU: o motor não anda no round 1, no round 2 nem na vitória; a vitória fecha a luta e leva ao resultado', async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2 });
      const antes = await hook(page, estadoDoMotor);
      expect(antes.tick).toBe(0);
      const vistos = { abertura: 0, rodada: 0, vitoria: 0 };
      let resultado = false;
      for (let i = 0; i < 400 && !resultado; i++) {
        const r = await hook(
          page,
          `(h) => {
            const s = h.ui.scene; const g = h.mundo().game; const out = { ev: [] };
            for (let k = 0; k < 20; k++) {
              const antes = g.tick; const t0 = g.t; const jaAtiva = s.provocacao.ativa;
              h.avancar(1);
              if (h.ui.name !== 'fight') { out.fim = h.ui.name; break; }
              // só conta o update em que a provocação JÁ estava aberta no começo (o que a abre é o próprio update do motor)
              if (jaAtiva && s.provocacao.ativa) out.ev.push([s.provocacao.roteiro.tipo, g.tick === antes && g.t === t0, g.phase, g.t, g.tick]);
            }
            return out;
          }`,
        );
        for (const [tipo, parado, fase, t] of r.ev as Array<[keyof typeof vistos, boolean, string, number]>) {
          vistos[tipo]++;
          expect(parado, `${tipo}: o motor não pode andar enquanto o balão está aberto`).toBe(true);
          if (tipo === 'rodada') expect(fase).toBe('intro');
          if (tipo === 'vitoria') {
            expect(fase).toBe('matchend');
            expect(t).toBeGreaterThanOrEqual(56);
            expect(t).toBeLessThanOrEqual(100);
          }
        }
        if (r.fim) resultado = r.fim === 'result' || r.fim === 'continue';
        if (r.fim && !resultado) throw new Error(`foi para ${r.fim}`);
      }
      expect(resultado, 'a luta terminou no resultado').toBe(true);
      expect(vistos.abertura).toBeGreaterThan(100);
      expect(vistos.rodada).toBeGreaterThan(60);
      expect(vistos.vitoria).toBeGreaterThan(100);
      expect(erros).toEqual([]);
    });

    test('pular: ataque do teclado depois do tick 10 (nunca antes); a luta anda em <= 6 ticks e o golpe que pulou não vira ataque', async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 0 });
      await hook(page, '(h) => h.avancar(5)');
      await page.keyboard.down('z'); // P1: soco fraco, ANTES do tick 10
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up('z');
      expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), 'antes do tick 10 não pula').toBeNull();
      await hook(page, '(h) => h.avancar(10)');
      await page.keyboard.down('z');
      await hook(page, '(h) => h.avancar(1)');
      await page.keyboard.up('z');
      expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm')).not.toBeNull();
      let n = 0;
      while ((await hook(page, '(h) => h.ui.scene.provocacao.ativa')) && n < 20) {
        await hook(page, '(h) => h.avancar(1)');
        n++;
      }
      expect(n).toBeLessThanOrEqual(6);
      await hook(page, '(h) => h.avancar(1)');
      const g = await hook(page, '(h) => { const g = h.mundo().game; return { tick: g.tick, move: g.p1.move, state: g.p1.state }; }');
      expect(g.tick).toBeGreaterThan(0);
      expect(g.move, 'o golpe que pulou não pode virar ataque no 1º tick').toBeNull();
      expect(erros).toEqual([]);
    });

    test('pular: ENTER e o clique/toque no canvas', async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      const erros = coletarErros(page);
      await abrirJogo(page, perfil);
      // ENTER
      await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 0 });
      await hook(page, '(h) => h.avancar(15)');
      await page.keyboard.press('Enter');
      expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm')).not.toBeNull();
      // toque (celular) ou clique (desktop) no canvas
      await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 0 });
      await hook(page, '(h) => h.avancar(15)');
      const caixa = (await page.locator('#jogo').boundingBox())!;
      const x = caixa.x + caixa.width / 2;
      const y = caixa.y + caixa.height / 2;
      if (perfil === 'celular') {
        const cdp: CDPSession = await page.context().newCDPSession(page);
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
        await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
      } else {
        await page.mouse.click(x, y);
      }
      expect(await hook(page, '(h) => h.ui.scene.provocacao.pulouEm'), `${perfil}: o toque/clique no canvas pula`).not.toBeNull();
      let n = 0;
      while ((await hook(page, '(h) => h.ui.scene.provocacao.ativa')) && n < 20) {
        await hook(page, '(h) => h.avancar(1)');
        n++;
      }
      expect(n).toBeLessThanOrEqual(6);
      // e fora da provocação o clique no canvas continua sem efeito na luta em andamento
      await hook(page, '(h) => h.avancar(200)');
      expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(false);
      if (perfil === 'desktop') await page.mouse.click(x, y);
      expect(await hook(page, '(h) => h.ui.scene.paused')).toBe(false);
      expect(erros).toEqual([]);
    });

    test('o gancho SEM_PROVOCACAO: a luta começa no 1º update e a provocação nunca abre (round 1, round 2 e vitória)', async ({ page }, info) => {
      test.skip(info.project.name !== perfil, `só no ${perfil}`);
      await abrirJogo(page, perfil);
      await abrirLuta(page, { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2 }, true);
      await hook(page, '(h) => h.avancar(1)');
      expect((await hook(page, estadoDoMotor)).tick).toBe(1);
      const abriu = await hook(
        page,
        `(h) => { let abriu = false; const s = h.ui.scene; for (let i = 0; i < 6000 && h.ui.name === 'fight'; i++) { h.avancar(1); abriu = abriu || s.provocacao.ativa; } return { abriu, cena: h.ui.name }; }`,
      );
      expect(abriu.abriu).toBe(false);
      expect(abriu.cena).not.toBe('fight');
    });
  });
}

// ---------------------------------------------------------------------------------------------------------------------------------
// 4) ZENON vencendo usa o balão novo (sem a legenda antiga)
// ---------------------------------------------------------------------------------------------------------------------------------
test.describe('P2: o ZENON vencendo fala pelo balão, sem a legenda antiga', () => {
  test('matchend do chefão: a legenda de vitória não aparece (nem antes do balão) e o balão leva a fala dele; o pré-round do chefão não tem balão', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'só no desktop');
    const erros = coletarErros(page);
    await abrirJogo(page, 'desktop');
    await abrirLuta(page, { mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: null, chefe: true });
    await hook(page, '(h) => h.avancar(3)'); // a entrada dramática (e não a provocação) abre
    expect(await hook(page, '(h) => ({ prov: h.ui.scene.provocacao.ativa, entrada: h.ui.scene.entrada.ativa })')).toEqual({ prov: false, entrada: true });
    // pula a entrada e o intro: o chefão em luta
    await hook(page, `(h) => { const s = h.ui.scene; s.entrada.zerar(); }`);
    for (let i = 0; i < 100 && (await hook(page, '(h) => h.mundo().game.phase')) !== 'fight'; i++) await hook(page, '(h) => h.avancar(2)');
    // o ZENON vence a luta (de 1 round) por tempo
    await hook(page, '(h) => { const g = h.mundo().game; g.p1.hp = 30; g.timeLeft = 1; g.tick60 = 59; }');
    for (let i = 0; i < 600 && (await hook(page, '(h) => h.mundo().game.phase')) !== 'matchend'; i++) await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.mundo().game.matchWinner')).toBe(1);
    const VITORIA = 'Aplausos para o convidado. A saída é pelos fundos.';
    const textos = async (): Promise<string[]> =>
      page.evaluate(() => {
        const w = window as any;
        const lista: string[] = [];
        const o = CanvasRenderingContext2D.prototype.fillText;
        CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, ...r: any[]) {
          lista.push(String(t));
          return (o as any).call(this, t, ...r);
        };
        w.__inno.desenhar();
        CanvasRenderingContext2D.prototype.fillText = o;
        return lista;
      });
    await hook(page, '(h) => { while (h.mundo().game.t < 30) h.avancar(1); }');
    expect(await textos(), 'antes do balão (matchend t 30)').not.toContain(VITORIA);
    for (let i = 0; i < 200 && !(await hook(page, '(h) => h.ui.scene.provocacao.ativa')); i++) await hook(page, '(h) => h.avancar(1)');
    expect(await hook(page, '(h) => h.ui.scene.provocacao.roteiro.tipo')).toBe('vitoria');
    await hook(page, '(h) => h.avancar(70)');
    const t = await textos();
    expect(t).not.toContain(VITORIA);
    expect(t).toContain('ZENON');
    await capturar(page, 'provocacao-zenon-vence-chefao');
    expect(erros).toEqual([]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------
// 5) As Opções NÃO têm a linha PROVOCAÇÕES (decisão do dono, 2026-10-21: as frentes pedidas ficam sempre ligadas)
// ---------------------------------------------------------------------------------------------------------------------------------
for (const perfil of ['desktop', 'celular'] as const) {
  test(`P2: as Opções (${perfil}) não têm PROVOCAÇÕES nem CINEMÁTICA: 9 linhas que cabem, e um save antigo "desligadas" não desliga nada`, async ({ page }, info) => {
    test.skip(info.project.name !== perfil, `só no ${perfil}`);
    const erros = coletarErros(page);
    await abrirJogo(page, perfil, '');
    await page.evaluate(() => {
      const w = window as any;
      w.__textos = [];
      const o = CanvasRenderingContext2D.prototype.fillText;
      CanvasRenderingContext2D.prototype.fillText = function (this: CanvasRenderingContext2D, t: string, x: number, y: number, ...r: any[]) {
        if (w.__textos) w.__textos.push({ t: String(t), x, y, px: parseFloat(/([d.]+)px/.exec(this.font)?.[1] ?? '0') });
        return (o as any).call(this, t, x, y, ...r);
      };
    });
    await hook(page, "(h) => { h.ui.fade = 0; h.ui.fadeDir = 0; h.ui.set('options', { from: 'menu' }); h.avancar(2); }");
    const itens = await hook(page, '(h) => h.ui.scene.m.items.map((i) => i.label)');
    expect(itens).toHaveLength(9);
    expect(itens).not.toContain('PROVOCAÇÕES');
    expect(itens).not.toContain('CINEMÁTICA DO ESPECIAL');
    const textos: Array<{ t: string; x: number; y: number; px: number }> = await page.evaluate(() => {
      const w = window as any;
      w.__textos = [];
      w.__inno.desenhar();
      return w.__textos;
    });
    expect(textos.some((x) => /PROVOCA/.test(x.t))).toBe(false);
    // 9 linhas: a última (VOLTAR) e a dica de baixo cabem, sem se sobrepor
    const voltar = textos.find((x) => x.t === 'VOLTAR')!;
    const dica = textos.filter((x) => x.t.includes('escolher'))[0]!;
    expect(voltar.y + 14).toBeLessThan(dica.y - dica.px / 2);
    await capturar(page, `provocacao-opcoes-${perfil}`);
    // save de versão anterior com as provocações "desligadas": é ignorado (o gancho de teste não o vê, o disco o mantém)
    await page.evaluate(() => {
      const d = JSON.parse(window.localStorage.getItem('inno-fighters-v2') ?? '{"v":2,"s":{},"hi":0,"prog":{}}');
      d.s.provocacoes = 'desligadas';
      window.localStorage.setItem('inno-fighters-v2', JSON.stringify(d));
    });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
    expect(await hook(page, '(h) => h.persist.settings.provocacoes')).toBeUndefined();
    expect(erros).toEqual([]);
  });
}
