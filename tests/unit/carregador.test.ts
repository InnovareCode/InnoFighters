import { describe, expect, it } from 'vitest';
import {
  carregarRecursos,
  totalDeArquivos,
  urlAtlas,
  urlCenario,
  urlManifesto,
  type ImagemCarregada,
  type LeitorDeRecursos,
} from '../../src/assets/carregador';
import type { CriarCanvas } from '../../src/assets/canvas';
import { ErroDeAsset } from '../../src/assets/tipos';

const manifesto = (lutador: string, tamanho: [number, number] = [64, 32]) => ({
  versao: 1,
  lutador,
  imagem: 'atlas.webp',
  tamanho,
  alturaRef: 10,
  quadros: { idle0: { x: 0, y: 0, w: 8, h: 10, ax: 4 } },
});

function leitorFalso(opcoes: { falharEm?: string; tamanhoImagem?: [number, number] } = {}): LeitorDeRecursos & { pedidos: string[] } {
  const pedidos: string[] = [];
  const [w, h] = opcoes.tamanhoImagem ?? [64, 32];
  return {
    pedidos,
    async json(url) {
      pedidos.push(url);
      if (url === opcoes.falharEm) throw new ErroDeAsset(`Falha ao carregar ${url}`, url);
      const id = /lutadores\/([^/]+)\//.exec(url)?.[1] ?? '?';
      return manifesto(id);
    },
    async imagem(url) {
      pedidos.push(url);
      if (url === opcoes.falharEm) throw new ErroDeAsset(`Falha ao carregar ${url}`, url);
      return { width: w, height: h } as unknown as ImagemCarregada;
    },
  };
}

const plano = { baseUrl: '/', lutadores: ['caio', 'min-ji'], cenarios: [{ id: 'br', arquivo: 'assets/cenarios/cenario-br.webp' }] };

describe('urls do plano (PLANO.md 4.2)', () => {
  it('monta caminhos com e sem barra final', () => {
    expect(urlManifesto('/', 'caio')).toBe('/assets/lutadores/caio/atlas.json');
    expect(urlManifesto('/jogo', 'caio')).toBe('/jogo/assets/lutadores/caio/atlas.json');
    expect(urlAtlas('/', 'caio', 'atlas.webp')).toBe('/assets/lutadores/caio/atlas.webp');
    expect(urlCenario('/', 'assets/cenarios/cenario-br.webp')).toBe('/assets/cenarios/cenario-br.webp');
    expect(urlCenario('/jogo/', '/assets/cenarios/cenario-br.webp')).toBe('/jogo/assets/cenarios/cenario-br.webp');
  });
  it('conta manifesto + imagem por lutador e uma imagem por cenário', () => {
    expect(totalDeArquivos(plano)).toBe(5);
  });
});

describe('carregarRecursos', () => {
  it('carrega tudo, com progresso crescente terminando em 1', async () => {
    const leitor = leitorFalso();
    const marcos: number[] = [];
    const r = await carregarRecursos(plano, { leitor, aoProgredir: (f) => marcos.push(f) });
    expect([...r.lutadores.keys()].sort()).toEqual(['caio', 'min-ji']);
    expect([...r.cenarios.keys()]).toEqual(['br']);
    expect(marcos).toHaveLength(5);
    expect(marcos[marcos.length - 1]).toBe(1);
    expect([...marcos].sort((a, b) => a - b)).toEqual(marcos);
    expect(leitor.pedidos).toContain('/assets/lutadores/min-ji/atlas.webp');
  });

  it('plano vazio termina com progresso 1', async () => {
    const marcos: number[] = [];
    await carregarRecursos({ baseUrl: '/', lutadores: [], cenarios: [] }, { leitor: leitorFalso(), aoProgredir: (f) => marcos.push(f) });
    expect(marcos).toEqual([1]);
  });

  it('falha de um arquivo rejeita dizendo qual', async () => {
    const leitor = leitorFalso({ falharEm: '/assets/cenarios/cenario-br.webp' });
    await expect(carregarRecursos(plano, { leitor })).rejects.toThrow('cenarios/cenario-br.webp');
  });

  it('imagem de tamanho diferente do manifesto é rejeitada', async () => {
    const leitor = leitorFalso({ tamanhoImagem: [10, 10] });
    await expect(carregarRecursos(plano, { leitor })).rejects.toThrow(/10x10.*64x32/);
  });

  it('manifesto inválido é rejeitado', async () => {
    const leitor: LeitorDeRecursos = { json: async () => ({ versao: 9 }), imagem: async () => ({ width: 1, height: 1 }) as unknown as ImagemCarregada };
    await expect(carregarRecursos(plano, { leitor })).rejects.toBeInstanceOf(ErroDeAsset);
  });

  it('a silhueta branca é do QUADRO e só é criada na primeira vez que alguém pede', async () => {
    let criados = 0;
    const criarCanvas: CriarCanvas = (largura, altura) => {
      criados++;
      const ctx = { drawImage() {}, fillRect() {}, globalCompositeOperation: '', fillStyle: '' };
      return { width: largura, height: altura, getContext: () => ctx } as unknown as HTMLCanvasElement;
    };
    const r = await carregarRecursos(plano, { leitor: leitorFalso(), criarCanvas });
    expect(criados).toBe(0);
    const caio = r.lutadores.get('caio');
    expect(caio).toBeDefined();
    const quadro = caio?.poses()['idle0'];
    expect(quadro).toBeDefined();
    await caio?.carregarImagens(leitorFalso());
    const s1 = caio?.silhuetaDe(quadro!);
    const s2 = caio?.silhuetaDe(quadro!);
    expect(criados).toBe(1);
    expect(s1).toBe(s2);
    expect([s1?.width, s1?.height]).toEqual([16, 24]); // o recorte do quadro idle0 (8x10) alinhado a 8 px com 8 de margem, não a página de 64x32
  });

  it('poses() converte pelo manifestoParaPoses e guarda', async () => {
    const r = await carregarRecursos(plano, { leitor: leitorFalso() });
    const caio = r.lutadores.get('caio');
    expect(caio?.poses()).toBe(caio?.poses());
    expect(caio?.poses()['idle0']).toMatchObject({ x: 0, y: 0, w: 8, h: 10, ax: 4 });
  });
});
