import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { CHEFE, FILA_DESBLOQUEIO, INICIAIS, LUTADORES, ROSTER, VITRINE } from '../../src/data/lutadores';
import { CICLO_VITRINE, posicoesDaFileira, STAGE_OF } from '../../src/ui/logo';

describe('papéis dos lutadores (plano de expansão 1.2)', () => {
  it('INICIAIS + FILA_DESBLOQUEIO + CHEFE = ROSTER, sem repetição', () => {
    const uniao = [...INICIAIS, ...FILA_DESBLOQUEIO, ...(CHEFE ? [CHEFE] : [])];
    expect(new Set(uniao).size).toBe(uniao.length);
    expect([...uniao].sort()).toEqual([...ROSTER].sort());
  });

  it('o ROSTER cobre todos os ids do contrato e LUTADORES tem exatamente esses ids', () => {
    expect([...ROSTER].sort()).toEqual([...IDS_LUTADORES].sort());
    expect(Object.keys(LUTADORES).sort()).toEqual([...IDS_LUTADORES].sort());
  });

  it('a VITRINE é só de lutadores liberados de fábrica (não revela os que se desbloqueiam)', () => {
    expect(VITRINE.every((id) => INICIAIS.includes(id))).toBe(true);
    expect(VITRINE.length).toBeGreaterThan(0);
    expect(VITRINE.some((id) => FILA_DESBLOQUEIO.includes(id) || id === CHEFE)).toBe(false);
  });

  it('hoje (4 lutadores) a ordem do protótipo se mantém', () => {
    expect([...ROSTER]).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
    expect([...VITRINE]).toEqual(['hayato', 'wei-long', 'min-ji', 'caio']);
  });

  it('o título sai da vitrine: ciclo de cenários = cenário da casa de cada lutador da vitrine', () => {
    expect([...STAGE_OF]).toEqual([...VITRINE]);
    expect([...CICLO_VITRINE]).toEqual(['jp', 'cn', 'kr', 'br']);
  });
});

describe('fileira de heróis do título', () => {
  it('4 heróis: as posições do protótipo (104, 296 | 664, 856)', () => {
    expect(posicoesDaFileira(4)).toEqual([104, 296, 664, 856]);
  });

  it('qualquer quantidade: crescente, dentro do canvas e simétrica', () => {
    for (const n of [1, 2, 3, 4, 5]) {
      const xs = posicoesDaFileira(n);
      expect(xs).toHaveLength(n);
      expect([...xs].sort((a, b) => a - b)).toEqual(xs);
      expect(xs.every((x) => x >= 0 && x <= 960)).toBe(true);
    }
    expect(posicoesDaFileira(2)).toEqual([104, 856]);
  });
});

describe('UI e assets sem "4" literal de elenco', () => {
  const arquivos = (dir: string): string[] =>
    readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? arquivos(join(dir, d.name)) : d.name.endsWith('.ts') ? [join(dir, d.name)] : []));
  const fontes = [...arquivos('src/ui'), ...arquivos('src/assets')];

  it.each([
    ['módulo 4', /%\s*4\b/],
    ['laço até 4', /\bi\s*<\s*4\b/],
    ['painéis em W / 4', /\bW\s*\/\s*4\b/],
    ['posições fixas da fileira', /\[104,\s*296,\s*664,\s*856\]/],
    ['i >> 1 (grade fixa)', />>\s*1\b/],
  ])('nenhum arquivo usa %s', (_nome, regex) => {
    const achados = fontes.filter((f) => regex.test(readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '')));
    expect(achados).toEqual([]);
  });
});
