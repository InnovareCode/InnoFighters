import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { SH_IDLE } from '../../src/core/constantes';
import { manifestoParaPoses, retratoDoQuadro, validarManifesto, type ManifestoAtlas } from '../../src/data/atlas';
import { TEM_PROTOTIPO, posedataOriginal } from './_prototipo';

const caminho = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
// A ferramenta é .mjs puro (roda sem build); import dinâmico evita exigir tipos para ela.
const ferramenta = (await import(/* @vite-ignore */ pathToFileURL(caminho('ferramentas/extrair-prototipo.mjs')).href)) as {
  SH_IDLE: number;
  LUTADORES: Record<string, string>;
  CENARIOS: Record<string, string>;
  dimensoesWebp: (b: Buffer) => [number, number];
  posesParaManifesto: (id: string, poses: Record<string, unknown>, tamanho: [number, number]) => ManifestoAtlas;
};

const ids = Object.entries(ferramenta.LUTADORES);
const manifesto = (id: string): ManifestoAtlas =>
  JSON.parse(readFileSync(caminho(`public/assets/lutadores/${id}/atlas.json`), 'utf8')) as ManifestoAtlas;

describe('C1 — atlas.json extraído do protótipo', () => {
  it('constante SH_IDLE da ferramenta == a do jogo', () => {
    expect(ferramenta.SH_IDLE).toBe(SH_IDLE);
  });

  it.each(ids)('%s: arquivos existem, tamanho do manifesto == cabeçalho do WebP, quadros dentro do atlas', (_f, id) => {
    const m = validarManifesto(manifesto(id));
    expect(m.lutador).toBe(id);
    const webp = readFileSync(caminho(`public/assets/lutadores/${id}/${m.imagem}`));
    expect(ferramenta.dimensoesWebp(webp)).toEqual([...m.tamanho]);
    for (const [nome, q] of Object.entries(m.quadros)) {
      expect(q.x + q.w, nome).toBeLessThanOrEqual(m.tamanho[0]);
      expect(q.y + q.h, nome).toBeLessThanOrEqual(m.tamanho[1]);
    }
    expect(m.alturaRef).toBe(m.quadros['idle0']?.h);
  });

  it('cenários extraídos existem e são JPEG', () => {
    for (const id of Object.values(ferramenta.CENARIOS)) {
      const arq = caminho(`public/assets/cenarios/${id}.jpg`);
      expect(existsSync(arq), id).toBe(true);
      expect([...readFileSync(arq).subarray(0, 3)]).toEqual([0xff, 0xd8, 0xff]);
    }
  });

  describe.skipIf(!TEM_PROTOTIPO)('ida e volta contra o POSEDATA original (armadilha tipX/tipY)', () => {
    const original = posedataOriginal();

    it.each(ids)('%s: manifestoParaPoses reproduz x,y,w,h,ax,tipX,tipY e o retrato do protótipo', (f, id) => {
      const poses = manifestoParaPoses(manifesto(id));
      const orig = original[f] as Record<string, Record<string, number>>;
      expect(Object.keys(poses).sort()).toEqual(Object.keys(orig).sort());
      for (const [nome, o] of Object.entries(orig)) {
        const p = poses[nome];
        expect(p, nome).toBeDefined();
        if (!p || !o) continue;
        expect([p.x, p.y, p.w, p.h, p.ax], nome).toEqual([o['x'], o['y'], o['w'], o['h'], o['ax']]);
        if (o['tipX'] === undefined) {
          expect(p.tipX, `${nome}.tipX`).toBeUndefined();
        } else {
          expect(p.tipX as number, `${nome}.tipX`).toBeCloseTo(o['tipX'], 9);
          expect(p.tipY as number, `${nome}.tipY`).toBeCloseTo(o['tipY'] as number, 9);
        }
        if (o['headX'] !== undefined) {
          const r = retratoDoQuadro(p);
          expect(r, nome).not.toBeNull();
          // fórmula do protótipo (linha 391): [g.x + headX - hs/2 + 6, g.y - 4, hs, hs], hs = 190
          const esperado = [o['x']! + o['headX'] - 95 + 6, o['y']! - 4, 190, 190];
          expect(r?.map((v, i) => Math.abs(v - (esperado[i] as number)) < 1e-9)).toEqual([true, true, true, true]);
        }
      }
    });

    it.each(ids)('%s: a ponta fica dentro do quadro (sanidade: sem erro de escala K)', (_f, id) => {
      for (const [nome, q] of Object.entries(manifesto(id).quadros)) {
        if (!q.ponta) continue;
        expect(q.ponta[0], nome + ".x").toBeGreaterThanOrEqual(0);
        expect(q.ponta[0], nome + ".x").toBeLessThanOrEqual(q.w);
        expect(q.ponta[1], nome + ".y").toBeGreaterThanOrEqual(0);
        expect(q.ponta[1], nome + ".y").toBeLessThanOrEqual(q.h);
      }
    });

    it.each(ids)('%s: regenerar o manifesto em memória dá o mesmo arquivo gravado', (f, id) => {
      const emDisco = manifesto(id);
      const regerado = ferramenta.posesParaManifesto(id, original[f], [...emDisco.tamanho] as [number, number]);
      expect(JSON.parse(JSON.stringify(regerado))).toEqual(emDisco);
    });
  });

  it('validarManifesto rejeita lixo (dado externo)', () => {
    expect(() => validarManifesto(null)).toThrow();
    expect(() => validarManifesto({ versao: 2 })).toThrow(/versao/);
    expect(() => validarManifesto({ versao: 1, imagem: 'a', alturaRef: 410, tamanho: [1, 1], quadros: { a: { x: 'z' } } })).toThrow(/x invalido/);
  });
});
