import { readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { AtlasLutador, type ImagemCarregada, type LeitorDeRecursos } from '../../src/assets/carregador';
import { validarManifesto } from '../../src/assets/manifesto';
import { SH_IDLE } from '../../src/core/constantes';
import { CENARIOS } from '../../src/data/cenarios';
import { AMINU, BAATAR, CAMILLE, CENTELLA, NILA } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';

/*
 * F3a: a arte REAL dos cinco novos (public/assets/lutadores/<id>) e os seis cenários novos (public/assets/cenarios)
 * passam pelo carregador de verdade: manifesto C1 v2 válido, páginas com o tamanho declarado, apelidos que repetem o
 * retângulo, BAATAR com alturaRef 525 e 4 páginas, retrato que o jogo sabe recortar.
 */

const caminho = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const ferramenta = (await import(/* @vite-ignore */ pathToFileURL(caminho('ferramentas/extrair-prototipo.mjs')).href)) as {
  dimensoesWebp: (b: Buffer) => [number, number];
};

const NOVOS = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const;
const DEFS = { aminu: AMINU, centella: CENTELLA, camille: CAMILLE, nila: NILA, baatar: BAATAR } as const;
const PAGINAS = { aminu: 2, centella: 2, camille: 2, nila: 3, baatar: 4 } as const;

const lerManifesto = (id: string) => validarManifesto(JSON.parse(readFileSync(caminho(`public/assets/lutadores/${id}/atlas.json`), 'utf8')), `${id}/atlas.json`);

/** Leitor falso: devolve "imagens" com o tamanho do arquivo real e anota as URLs pedidas. */
function leitorDeDisco() {
  const pedidos: string[] = [];
  const leitor: LeitorDeRecursos = {
    json: (url) => Promise.resolve(JSON.parse(readFileSync(caminho(`public${url}`), 'utf8')) as unknown),
    imagem: (url) => {
      pedidos.push(url);
      const bytes = readFileSync(caminho(`public${url}`));
      const [width, height] = url.endsWith('.png') ? [bytes.readUInt32BE(16), bytes.readUInt32BE(20)] : ferramenta.dimensoesWebp(bytes);
      return Promise.resolve({ width, height, url } as unknown as ImagemCarregada);
    },
  };
  return { leitor, pedidos };
}

describe.each(NOVOS)('arte real de %s', (id) => {
  const m = lerManifesto(id);

  it('manifesto C1 v2 válido: páginas existem e têm o tamanho declarado; quadros cabem na página', () => {
    expect(m.versao).toBe(2);
    expect(m.lutador).toBe(id);
    expect(m.imagens).toHaveLength(PAGINAS[id]);
    for (const arq of m.imagens) {
      expect(ferramenta.dimensoesWebp(readFileSync(caminho(`public/assets/lutadores/${id}/${arq}`)))).toEqual([...m.tamanho]);
    }
    for (const [nome, q] of Object.entries(m.quadros)) {
      expect(q.x + q.w, nome).toBeLessThanOrEqual(m.tamanho[0]);
      expect(q.y + q.h, nome).toBeLessThanOrEqual(m.tamanho[1]);
      expect(q.p, nome).toBeLessThan(m.imagens.length);
    }
  });

  it('tem as 13 poses mínimas do motor e o quadro de guarda (idle0) com a altura de referência', () => {
    const base = ['idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1', 'crouch', 'block', 'jup', 'hitH', 'koFloor', 'lp1', 'win'];
    for (const nome of base) expect(m.quadros[nome], nome).toBeDefined();
    expect(m.quadros['idle0']?.h).toBe(m.alturaRef);
  });

  it('o jogo monta o lutador sobre o atlas: K = escala x SH_IDLE / altura do idle0 (sem normalizar por quadro)', () => {
    const a = new AtlasLutador(id, m, '/');
    const ch = montarLutador(DEFS[id], a.poses());
    expect(ch.K).toBeCloseTo((DEFS[id].scale * SH_IDLE) / m.alturaRef, 9);
  });

  it('carga sob demanda: as imagens só vêm em carregarImagens (todas as páginas) e somem em liberar', async () => {
    const a = new AtlasLutador(id, m, '/');
    const { leitor, pedidos } = leitorDeDisco();
    expect(a.pronta).toBe(false);
    expect(pedidos).toEqual([]);
    await a.carregarImagens(leitor);
    expect(a.pronta).toBe(true);
    expect(a.paginasCarregadas).toBe(PAGINAS[id]);
    expect(pedidos).toHaveLength(PAGINAS[id]);
    // cada quadro desenha da imagem da SUA página
    const poses = a.poses();
    for (const [nome, pd] of Object.entries(poses)) {
      expect((a.imagemDe(pd) as unknown as { url: string }).url, nome).toBe(`/assets/lutadores/${id}/${m.imagens[a.paginaDe(nome)]}`);
    }
    a.liberar();
    expect(a.pronta).toBe(false);
  });

  it('retrato: o arquivo sai do manifesto e o recorte cabe na imagem', async () => {
    const a = new AtlasLutador(id, m, '/');
    const { leitor } = leitorDeDisco();
    expect(await a.carregarRetrato(leitor)).toBe(true);
    const r = a.retrato([0, 0, 190, 190]);
    expect(r).not.toBeNull();
    const [fx, fy, rw, rh] = r!.recorte;
    const img = r!.imagem as unknown as { width: number; height: number };
    expect(fx + rw).toBeLessThanOrEqual(img.width);
    expect(fy + rh).toBeLessThanOrEqual(img.height);
    expect(rw).toBe(rh);
  });
});

describe('apelidos (dois nomes, o mesmo retângulo)', () => {
  const casos = [
    ['centella', 'idle3', 'idle1'],
    ['baatar', 'idle2', 'idle0'],
  ] as const;

  it.each(casos)('%s: %s e %s apontam para o mesmo retângulo, mas são quadros distintos para o jogo', (id, a, b) => {
    const atlas = new AtlasLutador(id, lerManifesto(id), '/');
    const poses = atlas.poses();
    const [pa, pb] = [poses[a], poses[b]];
    expect(pa).toBeDefined();
    expect(pb).toBeDefined();
    expect([pa!.x, pa!.y, pa!.w, pa!.h, pa!.ax]).toEqual([pb!.x, pb!.y, pb!.w, pb!.h, pb!.ax]);
    expect(pa).not.toBe(pb); // a página do quadro mora num WeakMap por objeto: um objeto por nome
    expect(atlas.paginaDe(a)).toBe(atlas.paginaDe(b));
  });
});

describe('BAATAR (chefão)', () => {
  const m = lerManifesto('baatar');
  it('alturaRef 525 (1,28 x 410), 54 nomes e as poses extras do contrato', () => {
    expect(m.alturaRef).toBe(525);
    expect(Object.keys(m.quadros)).toHaveLength(54);
    for (const nome of ['jpunch', 'devekh0', 'devekh1', 'devekh2', 'dive0', 'dive1']) expect(m.quadros[nome], nome).toBeDefined();
  });

  it('usa as 4 páginas (nenhuma fica vazia)', () => {
    const usadas = new Set(Object.values(m.quadros).map((q) => q.p));
    expect([...usadas].sort()).toEqual([0, 1, 2, 3]);
  });

  it('as pontas saem na escala da guarda (SH_IDLE / alturaRef), como as dos outros', () => {
    const a = new AtlasLutador('baatar', m, '/');
    const q = m.quadros['lp1']!;
    const pd = a.poses()['lp1']!;
    expect(pd.tipX).toBeCloseTo((q.ponta![0] - q.ax) * (SH_IDLE / 525), 9);
  });
});

describe('cenários (public/assets/cenarios)', () => {
  it.each(['jp', 'ng', 'mx', 'fr', 'in', 'mn', 'gr', 'cn', 'kr', 'br'] as const)('%s: WebP 1920x1080, <= 250 KiB (meta 3 do orçamento), no caminho que data/cenarios.ts registra', (id) => {
    const arquivo = CENARIOS[id].arquivo;
    expect(arquivo).toBe(`assets/cenarios/cenario-${id}.webp`);
    const bytes = readFileSync(caminho(`public/${arquivo}`));
    expect(ferramenta.dimensoesWebp(bytes)).toEqual([1920, 1080]);
    expect(bytes.length).toBeLessThanOrEqual(250 * 1024);
  });
});
