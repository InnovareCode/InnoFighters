import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { criarRng } from '../../src/core/rng';
import type { Ctx } from '../../src/render/tela';
import {
  Brasas,
  desenharLogo,
  desenharLogoHorizontal,
  desenharSplash,
  iniciarMarca,
  LAYOUT_DA_MARCA,
  LOGO_ALTURA,
  LOGO_MENU,
  marca,
  marcaPronta,
  PALETA_MARCA,
  prepararImagemDaMarca,
  reiniciarMarcaParaTeste,
  retanguloDaMarca,
} from '../../src/ui/logo';

/** Contexto falso: grava toda atribuição de propriedade e toda chamada ([nome, argumentos]). */
function espiao() {
  const sets: Array<[string, unknown]> = [];
  const chamadas: Array<[string, unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get: (_, nome: string) => (...args: unknown[]) => {
      chamadas.push([nome, args]);
      return { addColorStop: () => undefined };
    },
    set(_, nome: string, valor: unknown) {
      sets.push([nome, valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, sets, chamadas, desenhos: () => chamadas.filter(([n]) => n === 'drawImage').map(([, a]) => a) };
}

type Falsa = { width: number; height: number; nome: string };
const fonte = (nome: string, width: number, height: number): Falsa => ({ nome, width, height });
/** Canvas falso: só o que `prepararImagemDaMarca` e a varredura usam. */
const criarCanvasFalso = (w: number, h: number) => {
  const c = { width: w, height: h, nome: `pre-${w}x${h}`, getContext: () => ({ imageSmoothingEnabled: false, imageSmoothingQuality: 'low', drawImage: () => undefined, clearRect: () => undefined, fillRect: () => undefined, createLinearGradient: () => ({ addColorStop: () => undefined }), set globalCompositeOperation(_: string) {}, set fillStyle(_: unknown) {} }) };
  return c as unknown as HTMLCanvasElement;
};
const TAMANHOS: Record<string, [number, number]> = { 'logo-v1-1600.webp': [1600, 1127], 'logo-horizontal-v1-600.webp': [600, 336], 'splash-v1-1920x1080.webp': [1920, 1080] };
const tick = () => new Promise<void>((r) => setTimeout(r, 0));

/** Carregador falso: guarda os pedidos e só entrega quando o teste manda. */
function carregadorFalso() {
  const pedidos: string[] = [];
  const pendentes: Array<() => void> = [];
  const carregar = (url: string): Promise<Falsa> =>
    new Promise((ok, falhou) => {
      pedidos.push(url);
      const arq = url.split('/').pop() ?? '';
      const t = TAMANHOS[arq];
      pendentes.push(() => (t ? ok(fonte(arq, t[0], t[1])) : falhou(new Error('desconhecido'))));
    });
  return { pedidos, carregar: carregar as never, liberar: async () => { pendentes.splice(0).forEach((f) => f()); await tick(); await tick(); } };
}

describe('marca do torneio: a logo oficial do dono é IMAGEM (docs/logo-oficial.md)', () => {
  it('só restam as cores que o jogo ainda usa: as brasas (família brasa, fogo de FIGHTERS) e a cor da varredura de luz', () => {
    expect([...PALETA_MARCA.brasas]).toEqual(['#ffd27a', '#ff9a3d', '#ff5a12']);
    expect([...PALETA_MARCA.brilho]).toEqual([236, 244, 255]);
    expect(Object.keys(PALETA_MARCA).sort()).toEqual(['brasas', 'brilho']);
  });

  it('o desenho vetorial antigo saiu: sem Impact, sem palavras desenhadas, sem emblema/anel', () => {
    const fonteLogo = readFileSync('src/ui/logo.ts', 'utf8');
    expect(fonteLogo).not.toMatch(/Impact|PALAVRAS|obterLogo|desenharEmblema|createConicGradient|contornoInterno/);
    for (const f of ['boot', 'title', 'intro', 'menu']) expect(readFileSync(`src/ui/cenas/${f}.ts`, 'utf8'), f).not.toMatch(/Emblema|LOGO_S\b/);
  });

  it('as brasas só têm cores da família brasa, qualquer que seja a semente', () => {
    for (const semente of [1, 2, 99, 12345]) {
      const b = new Brasas(criarRng(semente));
      expect(b.lista).toHaveLength(70);
      expect(b.lista.every((e) => Number.isInteger(e.c) && e.c >= 0 && e.c < PALETA_MARCA.brasas.length)).toBe(true);
      const { ctx, sets } = espiao();
      b.desenhar(ctx, 30);
      const cores = new Set(sets.filter(([n]) => n === 'fillStyle').map(([, v]) => v as string));
      expect([...cores].every((c) => PALETA_MARCA.brasas.includes(c))).toBe(true);
      expect(cores.size).toBeGreaterThan(1);
    }
  });

  it('as brasas não dependem dos lutadores (funcionam com qualquer tamanho de elenco)', () => {
    const src = readFileSync('src/ui/logo.ts', 'utf8');
    const brasas = src.slice(src.indexOf('export class Brasas'), src.indexOf('/** Escurece em cima'));
    expect(brasas).not.toMatch(/LUTADORES|ROSTER|\.fire\b/);
  });

  it('as cenas chamam a marca pelo objeto `marca` (um teste pode trocar as peças), cada uma com a peça certa', () => {
    expect(Object.keys(marca).sort()).toEqual(['desenharLogo', 'desenharLogoHorizontal', 'desenharSplash']);
    const quem: Record<string, string> = { boot: 'desenharSplash', title: 'desenharLogo', intro: 'desenharLogo', menu: 'desenharLogoHorizontal' };
    for (const [f, peca] of Object.entries(quem)) {
      const src = readFileSync(`src/ui/cenas/${f}.ts`, 'utf8');
      expect(src, f).toContain(`marca.${peca}(`);
      expect(src, f).not.toMatch(/(^|[^.\w])desenhar(Logo|LogoHorizontal|Splash)\(/m);
    }
  });

  it('a geometria do título (docs/logo-oficial.md §6): altura 330, centro y 169 (topo y 4), CTA em y 352, sem o subtítulo desenhado', () => {
    expect(LOGO_ALTURA).toBe(330);
    expect(LAYOUT_DA_MARCA.y - LOGO_ALTURA / 2).toBe(4);
    expect(LOGO_MENU).toEqual({ altura: 86, x: 124, y: 50 });
    const titulo = readFileSync('src/ui/cenas/title.ts', 'utf8');
    expect(titulo).toMatch(/f\.A\(lab, W \/ 2, 352, 22,/);
    expect(titulo).toContain('ctx.fillRect(W / 2 - 150, 337, 300, 30)');
    expect(titulo).not.toMatch(/TORNEIO MUNDIAL|letterSpacing/); // o subtítulo está na faixa da arte
  });
});

describe('prepararImagemDaMarca: reduz UMA vez para o tamanho de desenho', () => {
  it('fonte maior que a largura pedida: cria o canvas reduzido (proporção mantida)', () => {
    const f = fonte('grande', 1600, 1127);
    const r = prepararImagemDaMarca(f as never, 937, criarCanvasFalso);
    expect(r.fonte).toBe(f);
    expect(r.pre?.width).toBe(937);
    expect(r.pre?.height).toBe(Math.round((1127 * 937) / 1600));
  });

  it('fonte já pequena, ou largura 0 (splash): sem pré-reduzida', () => {
    expect(prepararImagemDaMarca(fonte('p', 500, 300) as never, 938, criarCanvasFalso).pre).toBeNull();
    expect(prepararImagemDaMarca(fonte('s', 1920, 1080) as never, 0, criarCanvasFalso).pre).toBeNull();
  });

  it('canvas sem contexto 2D: cai na fonte, sem lançar', () => {
    const semCtx = ((w: number, h: number) => ({ width: w, height: h, getContext: () => null })) as never;
    expect(prepararImagemDaMarca(fonte('x', 1600, 1127) as never, 938, semCtx).pre).toBeNull();
  });
});

describe('carregamento e desenho da marca', () => {
  let rede: ReturnType<typeof carregadorFalso>;
  beforeEach(() => {
    rede = carregadorFalso();
    reiniciarMarcaParaTeste(rede.carregar, '/', criarCanvasFalso);
  });

  it('iniciarMarca pede as três imagens (splash, logo completa, horizontal) na base do site, uma só vez', () => {
    iniciarMarca('/InnoFighters');
    iniciarMarca('/InnoFighters/');
    expect(rede.pedidos.sort()).toEqual([
      '/InnoFighters/assets/ui/logo/logo-horizontal-v1-600.webp',
      '/InnoFighters/assets/ui/logo/logo-v1-1600.webp',
      '/InnoFighters/assets/ui/logo/splash-v1-1920x1080.webp',
    ]);
  });

  it('antes da imagem chegar: nada é desenhado e as peças devolvem false (a cena usa o fundo de antes)', () => {
    iniciarMarca('/');
    const { ctx, chamadas } = espiao();
    expect(desenharLogo(ctx, 480, 169, 330, -1)).toBe(false);
    expect(desenharLogoHorizontal(ctx, 124, 50, 86, -1)).toBe(false);
    expect(desenharSplash(ctx)).toBe(false);
    expect(chamadas.filter(([n]) => n === 'drawImage')).toHaveLength(0);
    expect(marcaPronta('principal')).toBe(false);
    expect(retanguloDaMarca('principal', 480, 169, 330)).toBeNull();
  });

  it('depois: a logo ocupa o retângulo certo (altura 330, largura pela proporção, centro 480,169) usando a versão já reduzida', async () => {
    iniciarMarca('/');
    await rede.liberar();
    expect(marcaPronta('principal')).toBe(true);
    const { ctx, desenhos } = espiao();
    expect(desenharLogo(ctx, 480, 169, 330, -1)).toBe(true);
    const [src, x, y, w, h] = desenhos()[0] as [Falsa, number, number, number, number];
    expect(src.nome).toMatch(/^pre-937x/); // não a de 1600 px
    expect(h).toBe(330);
    expect(w).toBeCloseTo(330 * (1600 / 1127), 6);
    expect(x + w / 2).toBeCloseTo(480, 6);
    expect(y).toBe(4);
    const r = retanguloDaMarca('principal', 480, 169, 330)!;
    expect([r.x, r.y, r.w, r.h]).toEqual([x, y, w, h]);
  });

  it('ampliada (o impacto da abertura chega a 3,2x) usa a imagem original, não a reduzida', async () => {
    iniciarMarca('/');
    await rede.liberar();
    const { ctx, desenhos } = espiao();
    desenharLogo(ctx, 480, 169, 330 * 3.2, -1);
    expect((desenhos()[0]?.[0] as Falsa).nome).toBe('logo-v1-1600.webp');
    const pequena = espiao();
    desenharLogo(pequena.ctx, 480, 169, 330 * 0.5, -1);
    expect((pequena.desenhos()[0]?.[0] as Falsa).nome).toMatch(/^pre-/);
  });

  it('a horizontal do menu: centro (124, 50), altura 86, largura 153,3', async () => {
    iniciarMarca('/');
    await rede.liberar();
    const { ctx, desenhos } = espiao();
    expect(desenharLogoHorizontal(ctx, LOGO_MENU.x, LOGO_MENU.y, LOGO_MENU.altura, -1)).toBe(true);
    const [src, x, y, w, h] = desenhos()[0] as [Falsa, number, number, number, number];
    expect(src.nome).toMatch(/^pre-307x/);
    expect([y, h]).toEqual([7, 86]);
    expect(w).toBeCloseTo(86 * (600 / 336), 6);
    expect(x + w / 2).toBeCloseTo(124, 6);
  });

  it('o splash é desenhado em tela cheia (0, 0, 960, 540), da imagem original de 1920x1080', async () => {
    iniciarMarca('/');
    await rede.liberar();
    const { ctx, desenhos } = espiao();
    expect(desenharSplash(ctx)).toBe(true);
    const [src, x, y, w, h] = desenhos()[0] as [Falsa, number, number, number, number];
    expect(src.nome).toBe('splash-v1-1920x1080.webp');
    expect([x, y, w, h]).toEqual([0, 0, 960, 540]);
  });

  it('a transparência é respeitada (alpha da cena) e a imagem é suavizada em alta qualidade', async () => {
    iniciarMarca('/');
    await rede.liberar();
    const { ctx, sets } = espiao();
    desenharLogo(ctx, 480, 169, 330, -1, 0.4);
    expect(sets).toContainEqual(['globalAlpha', 0.4]);
    expect(sets).toContainEqual(['imageSmoothingQuality', 'high']);
  });

  it('a varredura de luz só existe com shine em [0, 1]: soma com `lighter` por cima, só onde há logo (source-in)', async () => {
    iniciarMarca('/');
    await rede.liberar();
    const fora = espiao();
    desenharLogo(fora.ctx, 480, 169, 330, -1);
    desenharLogo(fora.ctx, 480, 169, 330, 1.2);
    expect(fora.desenhos()).toHaveLength(2); // só a logo, duas vezes
    const dentro = espiao();
    desenharLogo(dentro.ctx, 480, 169, 330, 0.5);
    expect(dentro.desenhos()).toHaveLength(2); // a logo + a camada da varredura
    expect(dentro.sets).toContainEqual(['globalCompositeOperation', 'lighter']);
    const camada = dentro.desenhos()[1]?.[0] as { nome: string };
    expect(camada.nome).toMatch(/^pre-937x/);
  });

  it('se a imagem não carrega (arquivo ausente, sem rede): nada é desenhado e nada lança', async () => {
    reiniciarMarcaParaTeste((() => Promise.reject(new Error('404'))) as never, '/', criarCanvasFalso);
    iniciarMarca('/');
    await tick();
    await tick();
    const { ctx, chamadas } = espiao();
    expect(desenharLogo(ctx, 480, 169, 330, 0.5)).toBe(false);
    expect(desenharSplash(ctx)).toBe(false);
    expect(chamadas.filter(([n]) => n === 'drawImage')).toHaveLength(0);
  });
});
