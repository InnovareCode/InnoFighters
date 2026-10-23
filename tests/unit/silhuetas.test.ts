import { describe, expect, it } from 'vitest';
import { criarSilhuetaBranca, type CriarCanvas } from '../../src/assets/canvas';
import { carregarManifestos, type ImagemCarregada, type LeitorDeRecursos } from '../../src/assets/carregador';
import { CacheDeSilhuetas, PEDIDOS_SEM_TENTAR_APOS_FALHA } from '../../src/assets/silhuetas';
import type { ArteLutador } from '../../src/assets/elenco';
import type { LutadorLeitura } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { silhuetaTingidaDe } from '../../src/render/esquiva';
import { desenharLutador } from '../../src/render/lutador';
import { desenharPose } from '../../src/render/pose';
import type { Ctx } from '../../src/render/tela';

/*
 * T2 (docs/orcamentos-2026-10-23.md §5): a silhueta branca (flash de dano e rastro) é por QUADRO, sob demanda, com teto de memória, e NUNCA
 * lança: sem contexto 2D (iPhone acima do teto de canvas) o flash simplesmente não aparece e a luta segue.
 */

const IMG = { tag: 'pagina' } as unknown as CanvasImageSource;

/** Fábrica de canvas falsos: grava as chamadas; `semContexto` faz `getContext` devolver null (o iPhone no teto). */
function fabrica(opcoes: { semContexto?: () => boolean; lancaNaFabrica?: boolean; getContextLanca?: boolean } = {}) {
  const criados: Array<{ width: number; height: number; chamadas: Array<[string, ...unknown[]]> }> = [];
  const criar: CriarCanvas = (largura, altura) => {
    if (opcoes.lancaNaFabrica) throw new Error('canvas indisponivel');
    const c = { width: largura, height: altura, chamadas: [] as Array<[string, ...unknown[]]> };
    criados.push(c);
    const g = new Proxy({} as Record<string, unknown>, {
      get: (_, n: string) => (...a: unknown[]) => c.chamadas.push([n, ...a]),
      set: (_, n: string, v: unknown) => (c.chamadas.push([`=${n}`, v]), true),
    });
    return {
      get width() {
        return c.width;
      },
      set width(v: number) {
        c.width = v;
      },
      get height() {
        return c.height;
      },
      set height(v: number) {
        c.height = v;
      },
      getContext: () => {
        if (opcoes.getContextLanca) throw new Error('getContext lancou');
        return opcoes.semContexto?.() ? null : g;
      },
    } as unknown as HTMLCanvasElement;
  };
  return { criar, criados };
}

const quadro = { x: 40, y: 12, w: 20, h: 30 };

describe('criarSilhuetaBranca (por quadro, sem exceção)', () => {
  it('canvas do QUADRO com 1 px de margem de vizinhança, recorte desenhado a partir de 0,0 e tudo pintado de branco por source-atop', () => {
    const f = fabrica();
    const c = criarSilhuetaBranca(IMG, quadro, f.criar);
    expect(c).not.toBeNull();
    const [w, h] = [c!.width, c!.height];
    expect([w, h]).toEqual([22, 32]);
    const ch = f.criados[0]!.chamadas;
    expect(ch.find(([n]) => n === 'drawImage')).toEqual(['drawImage', IMG, 39, 11, 22, 32, 0, 0, 22, 32]);
    expect(ch.some(([n, v]) => n === '=globalCompositeOperation' && v === 'source-atop')).toBe(true);
    expect(ch.some(([n, v]) => n === '=fillStyle' && v === '#fff')).toBe(true);
    expect(ch.find(([n]) => n === 'fillRect')).toEqual(['fillRect', 0, 0, 22, 32]);
  });

  it('getContext nulo: devolve null, não lança, e zera o canvas que criou', () => {
    const f = fabrica({ semContexto: () => true });
    let c: HTMLCanvasElement | null | undefined;
    expect(() => (c = criarSilhuetaBranca(IMG, quadro, f.criar))).not.toThrow();
    expect(c).toBeNull();
    expect(f.criados).toHaveLength(1);
    expect([f.criados[0]!.width, f.criados[0]!.height]).toEqual([0, 0]); // memória devolvida ao navegador
  });

  it('a fábrica ou o getContext lançando também viram null', () => {
    expect(criarSilhuetaBranca(IMG, quadro, fabrica({ lancaNaFabrica: true }).criar)).toBeNull();
    expect(criarSilhuetaBranca(IMG, quadro, fabrica({ getContextLanca: true }).criar)).toBeNull();
  });
});

describe('CacheDeSilhuetas (teto de memória, LRU, sem martelar quando falha)', () => {
  const area = (n: number) => ({ x: 0, y: 0, w: n, h: n });
  const B10 = 12 * 12 * 4; // um quadro 10x10 com 1 px de margem de cada lado

  it('reaproveita o quadro pedido de novo (mesma chave = mesmo canvas, sem criar outro)', () => {
    const f = fabrica();
    const cache = new CacheDeSilhuetas(1e9, f.criar);
    const a = cache.obter('a', IMG, area(10));
    expect(cache.obter('a', IMG, area(10))).toBe(a);
    expect(f.criados).toHaveLength(1);
    expect(cache.bytes).toBe(B10);
  });

  it('passou do teto: solta o MENOS recente e zera o canvas dele; usar de novo rejuvenesce', () => {
    const f = fabrica();
    const cache = new CacheDeSilhuetas(3 * B10, f.criar); // cabem 3 quadros de 10x10 (+ margem)
    const a = cache.obter('a', IMG, area(10))!;
    cache.obter('b', IMG, area(10));
    cache.obter('c', IMG, area(10));
    cache.obter('a', IMG, area(10)); // a fica como o mais recente; o mais antigo agora é b
    cache.obter('d', IMG, area(10));
    expect(cache.tamanho).toBe(3);
    expect(cache.bytes).toBe(3 * B10);
    expect(cache.obter('a', IMG, area(10))).toBe(a); // sobreviveu
    expect([f.criados[1]!.width, f.criados[1]!.height]).toEqual([0, 0]); // b foi solto e zerado
    expect(f.criados[0]!.width).toBe(12);
    const antes = f.criados.length;
    cache.obter('b', IMG, area(10)); // b teria de ser criado de novo
    expect(f.criados.length).toBe(antes + 1);
  });

  it('nunca passa do teto com muitos quadros (6 MiB por padrão)', () => {
    const f = fabrica();
    const cache = new CacheDeSilhuetas(undefined, f.criar);
    for (let i = 0; i < 200; i++) cache.obter(`q${i}`, IMG, area(300)); // 302x302x4 = 365 KB cada
    expect(cache.bytes).toBeLessThanOrEqual(6 * 1024 * 1024);
    expect(cache.tamanho).toBeLessThanOrEqual(17);
    expect(cache.tamanho).toBeGreaterThan(10);
  });

  it('um quadro maior que o teto inteiro fica sozinho (melhor um flash que nenhum)', () => {
    const f = fabrica();
    const cache = new CacheDeSilhuetas(100, f.criar);
    cache.obter('p', IMG, area(2));
    expect(cache.obter('grande', IMG, area(50))).not.toBeNull();
    expect(cache.tamanho).toBe(1);
  });

  it('soltarPrefixo solta e zera só o atlas indicado', () => {
    const f = fabrica();
    const cache = new CacheDeSilhuetas(1e9, f.criar);
    cache.obter('caio|0|1', IMG, area(10));
    cache.obter('caio|0|2', IMG, area(10));
    cache.obter('hayato|0|1', IMG, area(10));
    cache.soltarPrefixo('caio|');
    expect(cache.tamanho).toBe(1);
    expect(cache.bytes).toBe(B10);
    expect([f.criados[0]!.width, f.criados[1]!.width, f.criados[2]!.width]).toEqual([0, 0, 12]);
  });

  it('sem contexto: null sem lançar, solta o que tinha e fica um tempo sem tentar; depois tenta de novo', () => {
    let semContexto = false;
    const f = fabrica({ semContexto: () => semContexto });
    const cache = new CacheDeSilhuetas(1e9, f.criar);
    cache.obter('boa', IMG, area(10));
    semContexto = true;
    expect(() => cache.obter('ruim', IMG, area(10))).not.toThrow();
    expect(cache.obter('ruim', IMG, area(10))).toBeNull();
    expect(cache.tamanho).toBe(0); // liberou a memória que era nossa
    const tentativas = f.criados.length; // 'boa' + 1 falha (o 2º pedido já estava na espera)
    expect(tentativas).toBe(2);
    for (let i = 0; i < PEDIDOS_SEM_TENTAR_APOS_FALHA - 1; i++) expect(cache.obter('ruim', IMG, area(10))).toBeNull();
    expect(f.criados.length).toBe(tentativas); // nenhum canvas novo durante a espera
    semContexto = false;
    expect(cache.obter('ruim', IMG, area(10))).not.toBeNull(); // acabou a espera e o aparelho se recuperou
  });
});

describe('AtlasLutador.silhuetaDe com o iPhone no teto de canvas', () => {
  const manifesto = {
    versao: 1,
    lutador: 'caio',
    imagem: 'atlas.webp',
    tamanho: [64, 32],
    alturaRef: 10,
    quadros: { idle0: { x: 0, y: 0, w: 8, h: 10, ax: 4 }, punch: { x: 8, y: 0, w: 12, h: 10, ax: 4 } },
  };
  const leitor: LeitorDeRecursos = {
    json: async () => manifesto,
    imagem: async () => ({ width: 64, height: 32 }) as unknown as ImagemCarregada,
  };

  it('devolve null (e não lança) sem contexto; com contexto devolve o canvas do quadro, igual no pedido seguinte', async () => {
    let semContexto = true;
    const f = fabrica({ semContexto: () => semContexto });
    const atlas = (await carregarManifestos('/', ['caio'], leitor, f.criar)).get('caio')!;
    const poses = atlas.poses();
    expect(atlas.silhuetaDe(poses['idle0']!)).toBeNull(); // ainda não carregou as imagens
    await atlas.carregarImagens(leitor);
    expect(() => atlas.silhuetaDe(poses['idle0']!)).not.toThrow();
    expect(atlas.silhuetaDe(poses['idle0']!)).toBeNull();
    semContexto = false;
    // ainda dentro da espera depois da falha: segue null, e é de propósito
    expect(atlas.silhuetaDe(poses['idle0']!)).toBeNull();
    for (let i = 0; i < PEDIDOS_SEM_TENTAR_APOS_FALHA; i++) atlas.silhuetaDe(poses['idle0']!);
    const s = atlas.silhuetaDe(poses['punch']!);
    expect(s).not.toBeNull();
    expect([s!.width, s!.height]).toEqual([14, 12]); // o quadro (12x10) + a margem, não a página de 64x32
    expect(atlas.silhuetaDe(poses['punch']!)).toBe(s);
  });

  it('liberar() zera as silhuetas do atlas (a memória volta antes de a página ser solta)', async () => {
    const f = fabrica();
    const atlas = (await carregarManifestos('/', ['caio'], leitor, f.criar)).get('caio')!;
    await atlas.carregarImagens(leitor);
    atlas.silhuetaDe(atlas.poses()['idle0']!);
    expect(f.criados[0]!.width).toBe(10);
    atlas.liberar();
    expect([f.criados[0]!.width, f.criados[0]!.height]).toEqual([0, 0]);
  });
});

describe('desenho sem silhueta: o flash some, a luta não cai', () => {
  const quadroDe = (x: number, y: number, w: number, h: number, ax: number) => ({ x, y, w, h, ax });
  const poses: Poses = { guard: quadroDe(8, 8, 289, 410, 137), idle0: quadroDe(8, 8, 289, 410, 137), punch: quadroDe(300, 8, 380, 420, 168) };
  const hayato = montarLutador(LUTADORES.hayato, poses);
  const SIL = { tag: 'silhueta' } as unknown as CanvasImageSource;

  function gravador() {
    const chamadas: Array<[string, ...unknown[]]> = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(_, nome: string) {
        if (nome === 'measureText') return () => ({ width: 10 });
        if (nome === 'createLinearGradient' || nome === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
        return (...a: unknown[]) => chamadas.push([nome, ...a]);
      },
      set: () => true,
    }) as unknown as Ctx;
    return { ctx, chamadas, desenhos: (img: unknown) => chamadas.filter(([n, i]) => n === 'drawImage' && i === img) };
  }
  const pose = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 } as const;
  const lutador = (extra: Partial<LutadorLeitura> = {}): LutadorLeitura => ({
    id: 'hayato', indice: 0, x: 300, y: 470, facing: 1, state: 'idle', pose, move: null, mt: 0,
    hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 6, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0,
    dmgTaken: 0, combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null,
    barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  });
  const arteSem: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => null, retrato: () => null };
  const arteCom: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => SIL, retrato: () => null };

  it('flash de dano (desenharLutador): sem silhueta desenha só o corpo; com ela, o recorte (1,1,w,h) por cima', () => {
    const sem = gravador();
    expect(() => desenharLutador(sem.ctx, lutador(), hayato, arteSem)).not.toThrow();
    expect(sem.desenhos(IMG).length).toBeGreaterThan(0);
    const com = gravador();
    desenharLutador(com.ctx, lutador(), hayato, arteCom);
    const sil = com.desenhos(SIL);
    expect(sil).toHaveLength(1);
    expect(sil[0]!.slice(2, 6)).toEqual([1, 1, 289, 410]); // a silhueta é do quadro (com 1 px de margem)
    const corpo = com.desenhos(IMG).find(([, , x]) => x === 8);
    expect(corpo?.slice(2, 6)).toEqual([8, 8, 289, 410]); // o corpo continua lendo a PÁGINA
  });

  it('rastro de imagens: sem silhueta pula o rastro, sem exceção', () => {
    const rastro = { x: 280, y: 470, name: 'punch', f: 1 as const, life: 8 };
    const g = gravador();
    expect(() => desenharLutador(g.ctx, lutador({ flash: 0, trail: [rastro, rastro] }), hayato, arteSem)).not.toThrow();
  });

  it('desenharPose com branco: sem silhueta desenha só a imagem; com ela, fonte em (1,1,w,h)', () => {
    const sem = gravador();
    expect(() => desenharPose(sem.ctx, hayato, arteSem, 'idle0', 0, 0, 1, 1, 1, 0.5)).not.toThrow();
    expect(sem.chamadas.filter(([n]) => n === 'drawImage')).toHaveLength(1);
    const com = gravador();
    desenharPose(com.ctx, hayato, arteCom, 'idle0', 0, 0, 1, 1, 1, 0.5);
    expect(com.desenhos(SIL)[0]!.slice(2, 6)).toEqual([1, 1, 289, 410]);
  });

  it('silhuetaTingidaDe: o recorte tingido já feito dispensa pedir a silhueta de novo (o cache dela tem teto)', () => {
    const pd = { x: 1, y: 2, w: 6, h: 7, ax: 3 };
    let pedidas = 0;
    const arte: ArteLutador = { ...arteCom, silhuetaDe: () => (pedidas++, SIL) };
    const f = fabrica();
    const a = silhuetaTingidaDe(arte, pd, '#6fe0ff', f.criar as never);
    expect(a).not.toBeNull();
    expect(pedidas).toBe(1);
    expect(silhuetaTingidaDe(arte, pd, '#6fe0ff', f.criar as never)).toBe(a);
    expect(pedidas).toBe(1); // não pediu de novo
    expect(silhuetaTingidaDe({ ...arteCom, silhuetaDe: () => null }, { ...pd, x: 99 }, '#6fe0ff', f.criar as never)).toBeNull();
  });
});
