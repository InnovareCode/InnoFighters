import { describe, expect, it } from 'vitest';
import { paraManifestoV1, validarManifesto } from '../../src/assets/manifesto';
import { manifestoParaPoses } from '../../src/data/atlas';
import { carregarFerramenta } from './_ferramenta';

/*
 * Funções PURAS do pipeline de sprites (ferramentas/sprites/nucleo.mjs, empacotar.mjs, poses.mjs), com imagens
 * sintéticas. A ferramenta é .mjs puro (roda no Node sem build); import dinâmico evita exigir tipos para ela.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type F = (...args: any[]) => any;
const nucleo = await carregarFerramenta<{
  cortarBorda: F; estimarFundo: F; detectarChave: F; calcularAlfa: F; dilatar: F; despill: F; medirHalo: F; vazamento: F;
  mascaraDeAlfa: F; rotular: F; agruparFiguras: F; ordenarGrade: F; recortarFigura: F; caixaOpaca: F; cortarRgba: F;
  espelharRgba: F; centroDeMassaX: F; pontaDireita: F; pontaCima: F; rostoDoQuadro: F; janelaRgba: F; montarManifesto: F;
  separarFundidas: F;
}>('ferramentas/sprites/nucleo.mjs');
const empacotador = await carregarFerramenta<{ empacotar: F; validarEmpacotamento: F }>('ferramentas/sprites/empacotar.mjs');
const poses = await carregarFerramenta<{
  FOLHAS: Record<string, string[]>; ORDEM_CANONICA: string[]; COM_PONTA: string[]; MINIMAS: string[]; MODO_PONTA: Record<string, string>;
}>('ferramentas/sprites/poses.mjs');
const {
  cortarBorda, estimarFundo, detectarChave, calcularAlfa, dilatar, despill, medirHalo, vazamento, mascaraDeAlfa, rotular,
  agruparFiguras, ordenarGrade, recortarFigura, caixaOpaca, espelharRgba, centroDeMassaX, pontaDireita, pontaCima,
  rostoDoQuadro, janelaRgba, montarManifesto, separarFundidas,
} = nucleo;
const { empacotar, validarEmpacotamento } = empacotador;

// ---- helpers de imagem sintética -------------------------------------------------------------------------------
type Rgb = [number, number, number];
const MAGENTA_REAL: Rgb = [254, 37, 248]; // o fundo que a Runway devolve (medido), não #FF00FF

function imagem(largura: number, altura: number, fundo: Rgb) {
  const dados = new Uint8Array(largura * altura * 3);
  for (let p = 0; p < largura * altura; p++) dados.set(fundo, p * 3);
  return { largura, altura, dados };
}
function retangulo(img: ReturnType<typeof imagem>, x0: number, y0: number, w: number, h: number, cor: Rgb) {
  for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) img.dados.set(cor, (y * img.largura + x) * 3);
}
const pixel = (img: ReturnType<typeof imagem>, x: number, y: number): Rgb => {
  const i = (y * img.largura + x) * 3;
  return [img.dados[i]!, img.dados[i + 1]!, img.dados[i + 2]!];
};
const PRETO: Rgb = [20, 20, 20];

// ---- borda e fundo ---------------------------------------------------------------------------------------------
describe('cortarBorda', () => {
  it('tira n px de cada lado e mantém o miolo', () => {
    const img = imagem(10, 8, [1, 2, 3]);
    retangulo(img, 2, 2, 1, 1, [9, 9, 9]);
    const c = cortarBorda(img, 2);
    expect([c.largura, c.altura]).toEqual([6, 4]);
    expect(pixel(c, 0, 0)).toEqual([9, 9, 9]);
    expect(c.dados.length).toBe(6 * 4 * 3);
  });
  it('recusa cortar além do tamanho', () => {
    expect(() => cortarBorda(imagem(4, 4, [0, 0, 0]), 2)).toThrow(/pequena demais/);
  });
});

describe('estimarFundo / detectarChave', () => {
  it('mediana da faixa de borda ignora uma figura que chega perto da borda', () => {
    const img = imagem(100, 80, MAGENTA_REAL);
    retangulo(img, 0, 30, 4, 10, PRETO); // um pé encostando na borda esquerda
    expect(estimarFundo(img, 8)).toEqual(MAGENTA_REAL);
  });
  it('detecta magenta, verde e recusa outra cor', () => {
    expect(detectarChave(MAGENTA_REAL)).toBe('magenta');
    expect(detectarChave([7, 252, 4])).toBe('verde');
    expect(detectarChave([20, 20, 20])).toBeNull();
    expect(detectarChave([0, 0, 255])).toBeNull();
  });
});

// ---- chave de cor ----------------------------------------------------------------------------------------------
describe('calcularAlfa', () => {
  it('fundo (mesmo com a deriva medida de 254,37,248 até 250,49,241) vira 0; figura vira 255', () => {
    const img = imagem(6, 1, MAGENTA_REAL);
    img.dados.set([250, 49, 241], 3); // deriva do fundo mais abaixo na folha
    img.dados.set([60, 60, 60], 6);
    const a = calcularAlfa(img, MAGENTA_REAL);
    expect(a[0]).toBe(0);
    expect(a[1]).toBe(0);
    expect(a[2]).toBe(255);
  });
  it('rampa monotônica entre a tolerância e tolerância+suavidade', () => {
    const img = imagem(5, 1, MAGENTA_REAL);
    // afasta o verde em passos crescentes
    [0, 40, 80, 120, 200].forEach((d, i) => img.dados.set([254, Math.min(255, 37 + d), 248], i * 3));
    const a = Array.from(calcularAlfa(img, MAGENTA_REAL, { tolerancia: 30, suavidade: 80 }) as Uint8Array);
    for (let i = 1; i < a.length; i++) expect(a[i]).toBeGreaterThanOrEqual(a[i - 1]!);
    expect(a[0]).toBe(0);
    expect(a[4]).toBe(255);
    expect(a[2]).toBeGreaterThan(0);
    expect(a[2]).toBeLessThan(255);
  });
});

describe('despill (anti-halo)', () => {
  it('vazamento: magenta = min(R,B)-G; verde = G-max(R,B); pele, branco e amarelo não vazam no magenta', () => {
    expect(vazamento(200, 60, 190, 'magenta')).toBe(130);
    expect(vazamento(240, 190, 150, 'magenta')).toBe(0); // pele
    expect(vazamento(255, 255, 255, 'magenta')).toBe(0); // faixa branca
    expect(vazamento(255, 240, 0, 'magenta')).toBe(0); // amarelo
    expect(vazamento(40, 250, 40, 'verde')).toBe(210);
    expect(vazamento(255, 240, 0, 'verde')).toBe(0);
  });

  it('pixel de borda contaminado de magenta vira cinza escuro; o miolo e o fundo não mudam', () => {
    // figura preta 20x20 num fundo magenta, com uma franja de 1 px "meio rosa" (alfa 128) ao redor
    const img = imagem(40, 40, MAGENTA_REAL);
    retangulo(img, 10, 10, 20, 20, PRETO);
    retangulo(img, 9, 9, 22, 1, [140, 40, 135]); // franja de cima (mistura preto+magenta)
    const alfa = calcularAlfa(img, MAGENTA_REAL);
    const antes = medirHalo(img, alfa, 'magenta');
    expect(antes.sujos).toBeGreaterThan(0);
    const limpa = despill(img, alfa, 'magenta');
    const depois = medirHalo(limpa, alfa, 'magenta');
    expect(depois.sujos).toBe(0);
    const [r, g, b] = pixel(limpa, 15, 9);
    expect(Math.abs(r - g)).toBeLessThan(10);
    expect(Math.abs(b - g)).toBeLessThan(10);
    expect(pixel(limpa, 20, 20)).toEqual(PRETO); // miolo intacto
    expect(pixel(limpa, 0, 0)).toEqual(MAGENTA_REAL); // fundo intacto
    expect(img.dados).not.toBe(limpa.dados); // devolve cópia
  });

  it('despill só mexe na faixa de borda: verde legítimo no miolo (faixa do HAYATO) é preservado', () => {
    // fundo magenta; figura 30x30 cinza com um quadrado verde no centro; a chave é magenta
    const img = imagem(60, 60, MAGENTA_REAL);
    retangulo(img, 10, 10, 30, 30, [60, 60, 60]);
    retangulo(img, 20, 20, 8, 8, [40, 140, 70]);
    const alfa = calcularAlfa(img, MAGENTA_REAL);
    const limpa = despill(img, alfa, 'magenta');
    expect(pixel(limpa, 23, 23)).toEqual([40, 140, 70]);
  });

  it('raio: pixel opaco a mais de `raio` px da transparência não é tocado, mesmo contaminado', () => {
    const img = imagem(40, 40, MAGENTA_REAL);
    retangulo(img, 5, 5, 30, 30, PRETO);
    img.dados.set([120, 20, 110], (20 * 40 + 20) * 3); // pixel rosado no meio do miolo (opaco: longe do fundo)
    const alfa = calcularAlfa(img, MAGENTA_REAL);
    expect(alfa[20 * 40 + 20]).toBe(255);
    expect(vazamento(120, 20, 110, 'magenta')).toBeGreaterThan(0);
    expect(pixel(despill(img, alfa, 'magenta', 2), 20, 20)).toEqual([120, 20, 110]); // longe da borda: fica como está
  });
});

describe('dilatar', () => {
  it('dilata por caixa de raio r', () => {
    const m = new Uint8Array(7 * 7);
    m[3 * 7 + 3] = 1;
    const d = dilatar(m, 7, 7, 2) as Uint8Array;
    expect(d.reduce((a, b) => a + b, 0)).toBe(25);
    expect(d[1 * 7 + 1]).toBe(1);
    expect(d[0]).toBe(0);
  });
});

// ---- componentes conexos ---------------------------------------------------------------------------------------
describe('rotular', () => {
  const mascara = (linhas: string[]) => {
    const w = linhas[0]!.length;
    const m = new Uint8Array(w * linhas.length);
    linhas.forEach((l, y) => [...l].forEach((c, x) => (m[y * w + x] = c === '#' ? 1 : 0)));
    return { m, w, h: linhas.length };
  };

  it('acha dois blocos separados, com área e caixa certas', () => {
    const { m, w, h } = mascara(['##....', '##..##', '....##']);
    const { componentes } = rotular(m, w, h);
    expect(componentes).toHaveLength(2);
    expect(componentes[0]).toMatchObject({ area: 4, x0: 0, y0: 0, x1: 1, y1: 1 });
    expect(componentes[1]).toMatchObject({ area: 4, x0: 4, y0: 1, x1: 5, y1: 2 });
  });

  it('usa 8-vizinhança: pixels na diagonal são o mesmo componente', () => {
    const { m, w, h } = mascara(['#...', '.#..', '..#.']);
    expect(rotular(m, w, h).componentes).toHaveLength(1);
  });

  it('um pé que desce abaixo de y=597 continua sendo da mesma figura (o motivo de não usar grade fixa)', () => {
    const w = 20;
    const h = 1000;
    const m = new Uint8Array(w * h);
    for (let y = 100; y <= 640; y++) for (let x = 5; x < 12; x++) m[y * w + x] = 1; // figura de 541 px que passa de y=597
    const { componentes } = rotular(m, w, h);
    expect(componentes).toHaveLength(1);
    expect(componentes[0]!.y1).toBe(640);
  });

  it('mascaraDeAlfa corta no limiar', () => {
    const m = mascaraDeAlfa(Uint8Array.from([0, 63, 64, 255]), 64) as Uint8Array;
    expect(Array.from(m)).toEqual([0, 0, 1, 1]);
  });
});

describe('agruparFiguras', () => {
  const comp = (id: number, x0: number, y0: number, x1: number, y1: number, area: number) => ({
    id, area, x0, y0, x1, y1, somaX: ((x0 + x1) / 2) * area, somaY: ((y0 + y1) / 2) * area,
  });

  it('funde um pedaço pequeno perto (dedo solto) e descarta ruído longe', () => {
    const grandes = Array.from({ length: 12 }, (_, i) => comp(i + 1, i * 100, 0, i * 100 + 80, 200, 10000));
    const dedo = comp(20, 82, 90, 90, 100, 60); // a 2 px da figura 1
    const ruido = comp(21, 5000, 5000, 5004, 5004, 12);
    const r = agruparFiguras([...grandes, dedo, ruido], { esperado: 12 });
    expect(r.figuras).toHaveLength(12);
    expect(r.descartados.map((c: { id: number }) => c.id)).toEqual([21]);
    const fig = r.figuras.find((f: { ids: number[] }) => f.ids.includes(20));
    expect(fig.ids).toContain(1);
    expect(fig.x1).toBe(90); // a caixa cresceu para incluir o dedo
  });

  it('não inventa figuras: com 11 grandes devolve 11', () => {
    const grandes = Array.from({ length: 11 }, (_, i) => comp(i + 1, i * 100, 0, i * 100 + 80, 200, 10000));
    expect(agruparFiguras(grandes, { esperado: 12 }).figuras).toHaveLength(11);
  });
});

describe('ordenarGrade', () => {
  const fig = (cx: number, cy: number) => ({ ids: [1], x0: 0, y0: 0, x1: 0, y1: 0, area: 1, somaX: cx, somaY: cy });

  it('ordena linha a linha mesmo com as figuras embaralhadas e as caixas se sobrepondo entre linhas', () => {
    // centros: linhas em y ~ 300, 900, 1500 (com variação de +-120, como golpe alto/nocaute baixo)
    const esperado: { cx: number; cy: number }[] = [];
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) esperado.push({ cx: 300 + c * 600, cy: 300 + r * 600 + (c % 2 ? 120 : -120) });
    const embaralhado = [...esperado].sort((a, b) => ((a.cx * 7 + a.cy) % 13) - ((b.cx * 7 + b.cy) % 13));
    const r = ordenarGrade(embaralhado.map((p) => fig(p.cx, p.cy)));
    expect(r.separadas).toBe(true);
    expect(r.figuras.map((f: { somaX: number; somaY: number }) => [f.somaX, f.somaY])).toEqual(esperado.map((p) => [p.cx, p.cy]));
  });

  it('recusa contagem diferente de 12', () => {
    expect(() => ordenarGrade([fig(1, 1)])).toThrow(/esperava 12/);
  });
});

// ---- recorte ---------------------------------------------------------------------------------------------------
describe('recortarFigura', () => {
  it('dá margem de transparência e NÃO leva pixels da figura vizinha que cai dentro da caixa', () => {
    // figura A (L): caixa 0..19 x 0..19; figura B no canto da caixa de A (sobreposição de caixas), 5 px de distância
    const w = 40;
    const h = 40;
    const alfa = new Uint8Array(w * h);
    const rotulos = new Int32Array(w * h);
    const dados = new Uint8Array(w * h * 3).fill(50);
    for (let x = 10; x < 20; x++) for (let y = 10; y < 30; y++) { alfa[y * w + x] = 255; rotulos[y * w + x] = 1; }
    for (let x = 10; x < 30; x++) for (let y = 10; y < 14; y++) { alfa[y * w + x] = 255; rotulos[y * w + x] = 1; }
    for (let x = 26; x < 32; x++) for (let y = 20; y < 26; y++) { alfa[y * w + x] = 255; rotulos[y * w + x] = 2; } // B, dentro da caixa de A
    const figA = { ids: [1], x0: 10, y0: 10, x1: 29, y1: 29 };
    const r = recortarFigura({ largura: w, altura: h, dados }, alfa, rotulos, figA, { margem: 4, franja: 2 });
    expect([r.largura, r.altura]).toEqual([20 + 8, 20 + 8]);
    const a = (x: number, y: number) => r.rgba[(y * r.largura + x) * 4 + 3]!;
    expect(a(4 + 0, 4 + 0)).toBe(255); // canto da própria figura
    expect(a(0, 0)).toBe(0); // margem
    expect(a(4 + 17, 4 + 12)).toBe(0); // dentro do corpo de B (x=27,y=22): é de outra figura
    expect(caixaOpaca(r.rgba, r.largura, r.altura)).toEqual({ x0: 4, y0: 4, x1: 4 + 19, y1: 4 + 19 });
  });

  it('espelhar inverte o quadro no eixo X', () => {
    const rgba = new Uint8Array(3 * 1 * 4);
    rgba.set([1, 0, 0, 255], 0);
    rgba.set([2, 0, 0, 255], 4);
    rgba.set([3, 0, 0, 255], 8);
    const e = espelharRgba(rgba, 3, 1) as Uint8Array;
    expect([e[0], e[4], e[8]]).toEqual([3, 2, 1]);
  });
});

// ---- âncora, ponta, rosto --------------------------------------------------------------------------------------
function quadroRgba(largura: number, altura: number, blocos: [number, number, number, number][]) {
  const rgba = new Uint8Array(largura * altura * 4);
  for (const [x0, y0, w, h] of blocos) {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) rgba.set([10, 10, 10, 255], (y * largura + x) * 4);
  }
  return rgba;
}

describe('âncora (centro de massa X)', () => {
  it('figura simétrica: âncora no meio; braço estendido puxa a âncora para a frente', () => {
    const sim = quadroRgba(20, 10, [[5, 0, 10, 10]]);
    expect(centroDeMassaX(sim, 20, 10)).toBeCloseTo(10, 5);
    const braco = quadroRgba(20, 10, [[5, 0, 10, 10], [15, 4, 5, 2]]);
    expect(centroDeMassaX(braco, 20, 10)).toBeGreaterThan(10);
  });
  it('é ponderada pelo alfa (franja translúcida pesa menos)', () => {
    const rgba = quadroRgba(10, 1, [[0, 0, 4, 1]]);
    rgba.set([10, 10, 10, 51], 9 * 4); // pixel translúcido na ponta direita
    const c = centroDeMassaX(rgba, 10, 1);
    expect(c).toBeLessThan(2 + 0.5 + (9.5 - 2) * 0.1); // quase não desloca
    expect(c).toBeGreaterThan(2);
  });
  it('quadro vazio é erro, não NaN', () => {
    expect(() => centroDeMassaX(new Uint8Array(40), 10, 1)).toThrow(/vazio/);
  });
});

describe('ponta', () => {
  // corpo 10x30 em x 2..11; soco: braço 14x2 em y 8..9 saindo até x=25; pé da frente 6x2 em y 28..29 até x=24
  const rgba = quadroRgba(30, 30, [[2, 0, 10, 30], [12, 8, 14, 2], [12, 28, 13, 2]]);

  it("'direita' pega o ponto mais à direita e centra no y da parte que chega lá", () => {
    const [x, y] = pontaDireita(rgba, 30, 30, { faixa: 3 });
    expect(x).toBe(26); // borda direita do braço (x máx 25, +1)
    expect(y).toBeCloseTo(9, 5); // centro do braço (y 8..9), não uma média no vazio entre o braço e o pé
  });

  it("'mão' (yMax) ignora a faixa dos pés: o pé mais à frente não rouba a ponta do soco", () => {
    // pé vai até x=24 e o braço até x=25: sem yMax já ganha o braço; faz o pé ganhar para provar o corte
    const pe = quadroRgba(30, 30, [[2, 0, 10, 30], [12, 8, 10, 2], [12, 28, 16, 2]]);
    const semCorte = pontaDireita(pe, 30, 30, { faixa: 3 });
    expect(semCorte[1]).toBeGreaterThan(25); // pegou o pé
    const comCorte = pontaDireita(pe, 30, 30, { faixa: 3, yMax: 22 });
    expect(comCorte[0]).toBe(22);
    expect(comCorte[1]).toBeCloseTo(9, 0);
  });

  it("'cima' pega a linha mais alta e o x médio dela (uppercut, soco ao céu)", () => {
    const sobe = quadroRgba(30, 40, [[2, 10, 10, 30], [20, 0, 4, 12]]);
    const [x, y] = pontaCima(sobe, 30, 40, { faixa: 3 });
    expect(y).toBe(0);
    expect(x).toBeCloseTo(22, 0);
  });

  it('quadro vazio é erro', () => {
    expect(() => pontaDireita(new Uint8Array(4 * 4 * 4), 4, 4)).toThrow(/vazio/);
    expect(() => pontaCima(new Uint8Array(4 * 4 * 4), 4, 4)).toThrow(/vazio/);
  });
});

describe('rosto', () => {
  it('[headX + 6, 91] na escala de 410; escala com alturaRef', () => {
    const rgba = quadroRgba(100, 400, [[40, 0, 20, 400]]); // cabeça/corpo centrado em x=50
    const [x, y] = rostoDoQuadro(rgba, 100, 400, 410);
    expect(x).toBeCloseTo(50.5 + 6, 5);
    expect(y).toBe(91);
    const [, y2] = rostoDoQuadro(rgba, 100, 400, 205);
    expect(y2).toBeCloseTo(45.5, 5);
  });
  it('janelaRgba preenche com transparência o que cai fora', () => {
    const rgba = quadroRgba(4, 4, [[0, 0, 4, 4]]);
    const j = janelaRgba(rgba, 4, 4, -2, -2, 6) as Uint8Array;
    expect(j[3]).toBe(0); // (0,0) da janela cai fora
    expect(j[(2 * 6 + 2) * 4 + 3]).toBe(255); // (2,2) da janela = (0,0) do quadro
  });
});

// ---- figuras coladas -------------------------------------------------------------------------------------------
describe('separarFundidas', () => {
  /** 12 "figuras" pretas; as de coluna 1, linhas 1 e 2 são ligadas por uma ponte de `ponte` px de largura. */
  function folhaComPonte(ponte: number) {
    const w = 400;
    const h = 330;
    const m = new Uint8Array(w * h);
    const bloco = (x0: number, y0: number, bw: number, bh: number) => {
      for (let y = y0; y < y0 + bh; y++) for (let x = x0; x < x0 + bw; x++) m[y * w + x] = 1;
    };
    for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) bloco(c * 100 + 20, r * 100 + 10, 60, 80);
    bloco(c0(1) + 20, 90, ponte, 22); // une o fundo da figura (r0,c1) ao topo da (r1,c1) (y 90..112)
    function c0(c: number) { return c * 100; }
    return { m, w, h };
  }

  it('ponte fina: separa por erosão em 12 figuras, sem perder pixels', () => {
    const { m, w, h } = folhaComPonte(6);
    const { rotulos, componentes } = rotular(m, w, h);
    expect(componentes).toHaveLength(11); // duas figuras fundidas
    const total = componentes.reduce((s: number, c: { area: number }) => s + c.area, 0);
    const r = separarFundidas(rotulos, componentes, w, h, { esperado: 12 });
    expect(r.cortes).toHaveLength(1);
    expect(r.cortes[0].metodo).toBe('erosao');
    expect(agruparFiguras(r.componentes, { esperado: 12 }).figuras).toHaveLength(12);
    expect(r.componentes.reduce((s: number, c: { area: number }) => s + c.area, 0)).toBe(total);
  });

  it('ponte grossa demais para a erosão: cai no corte reto no pescoço mais fino', () => {
    const { m, w, h } = folhaComPonte(40);
    // a ponte tem a largura da figura (60) quase: erosão de 12 px não a quebra (ponte vertical de 22 px de altura)
    const { rotulos, componentes } = rotular(m, w, h);
    const r = separarFundidas(rotulos, componentes, w, h, { esperado: 12 });
    expect(agruparFiguras(r.componentes, { esperado: 12 }).figuras).toHaveLength(12);
    expect(r.cortes[0].metodo === 'erosao' || r.cortes[0].metodo === 'corte-reto').toBe(true);
  });

  it('não mexe em nada quando a contagem já bate', () => {
    const { m, w, h } = folhaComPonte(0);
    const { rotulos, componentes } = rotular(m, w, h);
    const r = separarFundidas(rotulos, componentes, w, h, { esperado: 12 });
    expect(r.cortes).toHaveLength(0);
    expect(r.componentes).toHaveLength(12);
  });
});

// ---- empacotador -----------------------------------------------------------------------------------------------
describe('empacotar', () => {
  const itens = (n: number, w = 300, h = 400) => Array.from({ length: n }, (_, i) => ({ nome: `q${i}`, w: w + (i % 5) * 7, h: h - (i % 4) * 11 }));

  it('nenhum quadro sai da página nem encosta em outro; todos aparecem uma vez', () => {
    const r = empacotar(itens(30));
    expect(validarEmpacotamento(r, 4)).toEqual([]);
    const nomes = r.paginas.flat().map((c: { nome: string }) => c.nome).sort();
    expect(nomes).toEqual(itens(30).map((i) => i.nome).sort());
    for (const p of r.paginas) for (const c of p) expect(c.x + c.w).toBeLessThanOrEqual(r.tamanho[0]);
  });

  it('abre mais páginas quando não cabe em uma e encolhe a altura da página ao mínimo', () => {
    const grande = empacotar(itens(48));
    expect(grande.paginas.length).toBeGreaterThanOrEqual(2);
    expect(grande.tamanho[1]).toBeLessThanOrEqual(2048);
    const pequeno = empacotar(itens(3));
    expect(pequeno.paginas).toHaveLength(1);
    expect(pequeno.tamanho[1]).toBeLessThan(2048); // encolheu
    expect(validarEmpacotamento(pequeno, 4)).toEqual([]);
  });

  it('quadro maior que a página é erro claro', () => {
    expect(() => empacotar([{ nome: 'gigante', w: 3000, h: 100 }])).toThrow(/maior que a pagina/);
  });

  it('validarEmpacotamento acusa sobreposição (o teste que prova o teste)', () => {
    const ruim = { tamanho: [100, 100], paginas: [[{ nome: 'a', w: 50, h: 50, x: 0, y: 0 }, { nome: 'b', w: 50, h: 50, x: 40, y: 10 }]] };
    expect(validarEmpacotamento(ruim, 0).length).toBeGreaterThan(0);
    const fora = { tamanho: [100, 100], paginas: [[{ nome: 'a', w: 60, h: 50, x: 50, y: 0 }]] };
    expect(validarEmpacotamento(fora, 0)).toEqual(['a: fora da pagina 0']);
  });
});

// ---- poses e contrato C1 ---------------------------------------------------------------------------------------
describe('poses e manifesto C1 v2', () => {
  it('as 4 folhas têm 12 poses únicas (48) e cobrem as 13 mínimas do C1', () => {
    for (const nomes of Object.values(poses.FOLHAS)) expect(nomes).toHaveLength(12);
    expect(new Set(poses.ORDEM_CANONICA).size).toBe(48);
    for (const n of poses.MINIMAS) expect(poses.ORDEM_CANONICA, n).toContain(n);
    for (const n of poses.COM_PONTA.filter((x) => x !== 'jpunch')) expect(poses.ORDEM_CANONICA, n).toContain(n);
    for (const n of Object.keys(poses.MODO_PONTA)) expect(poses.COM_PONTA, n).toContain(n);
  });

  it('a ordem das poses da folha 1 e 2 bate com docs/prompts (idle/walk; crouch..koFloor)', () => {
    expect(poses.FOLHAS['f1']!.slice(0, 5)).toEqual(['idle0', 'idle1', 'idle2', 'idle3', 'walk0']);
    expect(poses.FOLHAS['f2']![11]).toBe('koFloor');
    expect(poses.FOLHAS['f4']!.slice(8)).toEqual(['sc0', 'sc1', 'jkick', 'win']);
  });

  it('o manifesto montado passa no validarManifesto do jogo e converte para tipX/tipY', () => {
    const m = montarManifesto({
      lutador: 'teste',
      imagens: ['atlas-0.webp', 'atlas-1.webp'],
      tamanho: [2048, 1536],
      alturaRef: 410,
      quadros: {
        idle0: { p: 0, x: 4, y: 4, w: 298, h: 410, ax: 150.123456, rosto: [156.4567, 91] },
        lp1: { p: 1, x: 4, y: 4, w: 344, h: 406, ax: 160, ponta: [344, 100.126] },
      },
      retrato: { arquivo: 'retrato.png', recorte: [0, 0, 190, 190] },
    });
    const v = validarManifesto(m, 'teste/atlas.json');
    expect(v.versao).toBe(2);
    expect(v.imagens).toEqual(['atlas-0.webp', 'atlas-1.webp']);
    expect(v.quadros['lp1']!.p).toBe(1);
    expect(v.retrato).toEqual({ arquivo: 'retrato.png', recorte: [0, 0, 190, 190] });
    expect(m.quadros.idle0.ax).toBe(150.12); // 2 casas
    const p = manifestoParaPoses(paraManifestoV1(v));
    expect(p['lp1']!.tipX).toBeGreaterThan(0);
    expect(p['lp1']!.tipY).toBeGreaterThan(0);
  });
});
