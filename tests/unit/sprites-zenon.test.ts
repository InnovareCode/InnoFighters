import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { carregarFerramenta } from './_ferramenta';

/*
 * ZENON · Z5: o layout do pipeline (s1..s10 + zr, mapa v2 do Apolo, docs/handoff-apolo-zenon-folhas.md §8) e as exceções dele em
 * lutadores.json. A prova do atlas gerado é de zenon-arte.test.ts.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
type F = (...args: any[]) => any;
const poses = await carregarFerramenta<{ resolverLayout: F; nomesDaCelula: F; ORDEM_COMPLETA: string[]; COM_PONTA: string[] }>('ferramentas/sprites/poses.mjs');
const excecoes = JSON.parse(readFileSync(fileURLToPath(new URL('../../ferramentas/sprites/lutadores.json', import.meta.url)), 'utf8')) as Record<string, any>;
const zenon = excecoes['zenon'] as Record<string, any>;

describe('pipeline · layout do ZENON', () => {
  const layout = poses.resolverLayout(zenon);
  const todas = Object.values<{ celulas: unknown[] }>(layout.folhas).flatMap((f) => f.celulas.flatMap((c) => poses.nomesDaCelula(c)));

  it('11 folhas 3x2 (s1..s10 e a reposição zr), cada uma com 6 células', () => {
    expect(layout.ids).toEqual(['s1', 's2', 's3', 's4', 's5', 's6', 's7', 's8', 's9', 's10', 'zr']);
    for (const id of layout.ids) {
      expect(layout.folhas[id].grade, id).toEqual([3, 2]);
      expect(layout.folhas[id].celulas, id).toHaveLength(6);
    }
  });

  it('o mapa v2: células descartadas (null) e apelidos onde o Apolo mandou', () => {
    const c = (f: string) => layout.folhas[f].celulas;
    expect(c('s1')).toEqual(['idle0', null, ['idle1', 'idle3'], 'idle2', 'walk0', 'walk1']);
    expect(c('s3')).toEqual([['crouch', 'cblock'], 'block', null, 'jsquat', 'jup', 'jtop']);
    expect(c('s6')).toEqual(['hk0', 'hk1', 'clp', 'clk', null, 'upper']); // a rasteira da S6 saiu (perna de trás): a `sweep` vem da ZR
    expect(c('s7')).toEqual(['sa0', ['sa1', 'sa2'], 'sa3', 'sb0', ['sb1', 'sb2'], 'sb3']);
    expect(c('s8')).toEqual(['sc0', 'sc1', 'sc2', 'jkick', null, 'grab0']);
    expect(c('s9')).toEqual(['decreto0', 'decreto1', 'decreto2', 'grab1', ['vitoria0', 'win'], 'vitoria1']);
    expect(c('s10')).toEqual(['entrada0', 'entrada1', 'entrada2', 'cena0', 'cena1', 'cena2']);
    expect(c('zr')).toEqual([null, 'sweep', null, null, null, 'jpunch']);
  });

  it('nenhuma pose aparece em duas células e o contrato de nomes (48 canônicas + jpunch + as do ZENON) fica completo', () => {
    expect(new Set(todas).size).toBe(todas.length);
    for (const n of poses.ORDEM_COMPLETA.filter((x) => !/^(devekh|dive)/.test(x))) expect(todas, n).toContain(n);
    for (const n of ['entrada0', 'entrada1', 'entrada2', 'cena0', 'cena1', 'cena2', 'vitoria0', 'vitoria1', 'decreto0', 'decreto1', 'decreto2', 'sc2', 'grab0', 'grab1']) {
      expect(todas, n).toContain(n);
    }
  });

  it('o mapa v1 antigo (sweep = apelido do clk) é recusado: nome repetido entre células', () => {
    const v1 = { ...zenon, celulas: { s6: ['hk0', 'hk1', 'clp', ['clk', 'sweep'], null, 'upper'] } };
    expect(() => poses.resolverLayout(v1)).toThrow(/sweep/);
  });

  it('exceções: alturaRef 558, acolchoar s8 à direita 16, pontas por exceção (lk1 e upper mão, sb1 cima, decreto1 mão)', () => {
    expect(zenon['layout']).toBe('zenon');
    expect(zenon['alturaRef']).toBe(558);
    expect(zenon['acolchoar']).toEqual({ s8: { direita: 16 } });
    expect(zenon['ponta']).toEqual({ lk1: 'mao', upper: 'mao', sb1: 'cima', decreto1: 'mao' });
    expect(zenon['fatorFolha']).toBeUndefined(); // cabeças e botas iguais entre as folhas (±5%): sem fator
  });
});
