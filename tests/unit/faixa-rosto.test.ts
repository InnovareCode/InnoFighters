import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { desenharFaixaComRosto, rostoDoGolpe } from '../../src/render/faixa-rosto';
import type { Ctx } from '../../src/render/tela';

/*
 * FAIXA COM ROSTO (estilo X-Men vs Street Fighter, decisão do dono 24/10/2026): a busca do rosto (`rostoDoGolpe`, via o MESMO
 * "close"/grito que o filme do especial já usa) e a pintura pura (`desenharFaixaComRosto`), compartilhadas por `FaixaRitmo`
 * (especial comum) e `TarjaDoSuper`. `montarElenco()` carrega o atlas.json de PRODUÇÃO (o mesmo pipeline de `faixa-ritmo.test.ts`),
 * então `rostoDoGolpe` aqui lê os `painel`/`rosto` REAIS do manifesto — "se não estiver, cai no nome só" se prova com dados de verdade.
 */

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
type ArteFalsa = { pronta: boolean; imagemDe: () => CanvasImageSource | null; silhuetaDe: () => null; retrato: () => null };
const SEM_IMAGEM: ArteFalsa = { pronta: true, imagemDe: () => null, silhuetaDe: () => null, retrato: () => null };
const COM_IMAGEM: ArteFalsa = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => null, retrato: () => null };
const elencoDe = (arte: ArteFalsa): Elenco => Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas };
}

describe('rostoDoGolpe: o recorte vem do MESMO close/grito que o filme do especial usa', () => {
  it('sem a imagem na memória (página FILME ainda não carregada): devolve null, nunca lança', () => {
    const elenco = elencoDe(SEM_IMAGEM);
    for (const id of IDS_LUTADORES) expect(() => rostoDoGolpe(elenco, id, null, 'sFire')).not.toThrow();
    expect(rostoDoGolpe(elenco, 'hayato', null, 'sFire')).toBeNull();
  });

  it('golpe sem roteiro próprio: cai no roteiro GENÉRICO (sem lançar) — pode ou não ter rosto, dependendo do `f3` do lutador', () => {
    const elenco = elencoDe(COM_IMAGEM);
    expect(() => rostoDoGolpe(elenco, 'hayato', null, 'golpeInexistente')).not.toThrow();
  });

  it('pelo menos ALGUNS dos 10 lutadores têm rosto disponível (painel:true no grito) com a imagem na memória — nunca todos null', () => {
    const elenco = elencoDe(COM_IMAGEM);
    const comRosto = IDS_LUTADORES.filter((id) => rostoDoGolpe(elenco, id, null, 'sFire') !== null);
    expect(comRosto.length).toBeGreaterThan(0);
  });

  it('o recorte devolvido (quando existe) tem largura e altura positivas e a mesma imagem passada por `arte.imagemDe`', () => {
    const elenco = elencoDe(COM_IMAGEM);
    for (const id of IDS_LUTADORES) {
      for (const golpe of ['sFire', 'sDown', 'sFwd']) {
        const r = rostoDoGolpe(elenco, id, null, golpe);
        if (!r) continue;
        expect(r.sw, `${id}/${golpe}`).toBeGreaterThan(0);
        expect(r.sh, `${id}/${golpe}`).toBeGreaterThan(0);
        expect(r.img).toBe(IMG);
      }
    }
  });
});

describe('desenharFaixaComRosto: a pintura pura', () => {
  const base = {
    x: 0, y: 86, w: 960, h: 170, alfa: 1, deslocaX: 0, corDestaque: '#ff0000', nome: 'TESTE', corNome: ['#fff', '#000'] as const,
  };

  it('sem rosto: ainda assim desenha (fundo + nome), nunca fica em branco', () => {
    const g = gravador();
    desenharFaixaComRosto({ ...base, ctx: g.ctx, rosto: null });
    expect(g.chamadas.some(([n]) => n === 'fillRect')).toBe(true);
    expect(g.chamadas.some(([n]) => n === 'fillText')).toBe(true);
    expect(g.chamadas.some(([n]) => n === 'drawImage')).toBe(false);
  });

  it('com rosto: desenha a imagem (drawImage) além do fundo e do nome', () => {
    const g = gravador();
    desenharFaixaComRosto({ ...base, ctx: g.ctx, rosto: { img: IMG, sx: 0, sy: 0, sw: 100, sh: 120 } });
    expect(g.chamadas.some(([n]) => n === 'drawImage')).toBe(true);
    expect(g.chamadas.some(([n]) => n === 'fillText')).toBe(true);
  });

  it('o clip (rect) fica na posição FIXA (x, y, w, h) mesmo com deslocaX diferente de 0 — só o fundo desliza por dentro', () => {
    const g = gravador();
    desenharFaixaComRosto({ ...base, ctx: g.ctx, rosto: null, deslocaX: -500 });
    const rect = g.chamadas.find(([n]) => n === 'rect') as [string, number, number, number, number];
    expect(rect.slice(1)).toEqual([base.x, base.y, base.w, base.h]);
  });

  it('nunca usa shadowBlur/filter/getImageData (mesmos limites de desenho das outras cinemáticas)', () => {
    const g = gravador();
    desenharFaixaComRosto({ ...base, ctx: g.ctx, rosto: { img: IMG, sx: 0, sy: 0, sw: 100, sh: 120 } });
    const proibidas = g.chamadas.filter(([n]) => n === '=shadowBlur' || n === '=filter' || n === 'getImageData');
    expect(proibidas).toEqual([]);
  });
});
