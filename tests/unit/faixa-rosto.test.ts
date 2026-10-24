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
const RETRATO_IMG = { tag: 'retrato' } as unknown as CanvasImageSource;
type Retrato = { imagem: CanvasImageSource; recorte: readonly [number, number, number, number] } | null;
type ArteFalsa = { pronta: boolean; imagemDe: () => CanvasImageSource | null; silhuetaDe: () => null; retrato: () => Retrato };
const SEM_NADA: ArteFalsa = { pronta: true, imagemDe: () => null, silhuetaDe: () => null, retrato: () => null };
const COM_IMAGEM: ArteFalsa = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => null, retrato: () => null };
// só o retrato.webp (nenhuma célula do FILME na memória): o nível 3, que NUNCA falha
const SO_RETRATO: ArteFalsa = { pronta: true, imagemDe: () => null, silhuetaDe: () => null, retrato: () => ({ imagem: RETRATO_IMG, recorte: [1, 2, 180, 200] }) };
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

describe('rostoDoGolpe: 3 níveis — painel do grito, painel alternativo (NILA/ZENON), retrato (nunca falha com arte pronta)', () => {
  it('sem NENHUMA imagem (nem FILME nem retrato — dublê de teste sem arte pronta): devolve null, nunca lança', () => {
    const elenco = elencoDe(SEM_NADA);
    for (const id of IDS_LUTADORES) expect(() => rostoDoGolpe(elenco, id, null, 'sFire')).not.toThrow();
    expect(rostoDoGolpe(elenco, 'hayato', null, 'sFire')).toBeNull();
  });

  it('golpe sem roteiro próprio: cai no roteiro GENÉRICO (sem lançar)', () => {
    const elenco = elencoDe(COM_IMAGEM);
    expect(() => rostoDoGolpe(elenco, 'hayato', null, 'golpeInexistente')).not.toThrow();
  });

  it('TODOS os 10 lutadores têm rosto com a página FILME na memória — nível 1 (8 deles) + nível 2 (NILA/ZENON, pose alternativa)', () => {
    const elenco = elencoDe(COM_IMAGEM);
    for (const id of IDS_LUTADORES) expect(rostoDoGolpe(elenco, id, null, 'sFire'), id).not.toBeNull();
  });

  it('NILA e ZENON: o grito do roteiro NÃO é painel (pose do mundo), mas o nível 2 (`f4`) resolve mesmo assim', () => {
    const elenco = elencoDe(COM_IMAGEM);
    expect(rostoDoGolpe(elenco, 'nila', null, 'sFire')).not.toBeNull();
    expect(rostoDoGolpe(elenco, 'zenon', null, 'sFire')).not.toBeNull();
  });

  it('nível 3 (retrato.webp): sem NENHUMA célula do FILME na memória, ainda assim devolve um rosto — NUNCA fica vazio', () => {
    const elenco = elencoDe(SO_RETRATO);
    for (const id of IDS_LUTADORES) {
      const r = rostoDoGolpe(elenco, id, null, 'sFire');
      expect(r, id).not.toBeNull();
      expect(r!.img).toBe(RETRATO_IMG);
      expect(r!.sx).toBe(1);
      expect(r!.sw).toBe(180);
    }
  });

  it('o recorte devolvido (nível 1/2) tem largura e altura positivas e a mesma imagem passada por `arte.imagemDe`', () => {
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
    x: 0, y: 86, w: 960, h: 170, alfa: 1, deslocaX: 0, paleta: { escuro: '#0c0c10', medio: '#3c4414', claro: '#d9ff5e' }, nome: 'TESTE',
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
