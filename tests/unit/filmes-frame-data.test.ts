import { describe, expect, it } from 'vitest';
import { filmeDoGolpe, todosOsFilmes } from '../../src/data/filmes';
import type { NomeGolpe } from '../../src/data/tipos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { ensaiar, medirGolpe, type MedidaGolpe } from '../../ferramentas/balanco/frame-data';
import { frameDataMd } from '../../ferramentas/balanco/relatorio';

/*
 * V2-3c (spec §9): "o frame-data com a flag ganha a coluna 'filme' e marca ✓ nos 31". A medida de verdade (`medirGolpe`) varre o alcance
 * inteiro e custa caro; aqui o ✓ dos 31 sai do MESMO ensaio de acerto (`ensaiar`, em modo treino, com `motorV2.filmes`) achando a
 * distância por varredura grossa, e `medirGolpe` é conferido em alguns golpes de cada família. O relatório inteiro (`--filmes`) é rodado
 * pelo CLI e conferido na entrega.
 */
const elenco = montarElenco();
const FILMES = { filmes: true } as const;

/** O golpe (na ficha) conecta numa distância de 80 a 520? Devolve a primeira. */
function distanciaQueConecta(id: Parameters<typeof ensaiar>[0]['id'], ficha: string | null, golpe: NomeGolpe, segurar?: number): number | null {
  const alvoNoAr = elenco[id].moves[golpe].agarrao?.alvo === 'ar';
  for (let d = 80; d <= 520; d += 20) {
    const e = ensaiar({ elenco, id, ficha, golpe, d, dummy: 'stand', parar: 'conexao', filmes: true, ...(alvoNoAr ? { alvoNoAr: true } : {}), ...(segurar !== undefined ? { segurar } : {}) });
    if (e.conectou) return d;
  }
  return null;
}

describe('V2-3c: o ensaio com a flag marca o filme nos 31 golpes que acertam alguém', () => {
  const alvos = todosOsFilmes().filter((f) => f.ficha !== 'chefe2');

  it('são 31 golpes (a MASHI conta uma vez) e cada um abre EXATAMENTE 1 filme no ensaio completo', () => {
    expect(alvos).toHaveLength(31);
    for (const { id, ficha, golpe, filme } of alvos) {
      const nivel = filme.danoPorNivel ? 3 : null;
      const segurar = nivel === 3 ? 78 : undefined; // MASHI no nível 3
      const rot = `${id}${ficha ? `/${ficha}` : ''} ${golpe}`;
      const d = distanciaQueConecta(id, ficha, golpe as NomeGolpe, segurar);
      expect(d, `${rot}: não conecta no boneco`).not.toBeNull();
      const e = ensaiar({ elenco, id, ficha, golpe: golpe as NomeGolpe, d: d as number, dummy: 'stand', parar: 'completo', filmes: true, ...(elenco[id].moves[golpe].agarrao?.alvo === 'ar' ? { alvoNoAr: true } : {}), ...(segurar !== undefined ? { segurar } : {}) });
      expect(e.filmes, `${rot}: filmes no ensaio`).toBe(1);
      expect(e.caiu, `${rot}: o boneco termina caído`).toBe(true);
    }
  });

  it('sem a flag o MESMO ensaio não tem filme nenhum', () => {
    for (const { id, ficha, golpe } of alvos.slice(0, 6)) {
      const e = ensaiar({ elenco, id, ficha, golpe: golpe as NomeGolpe, d: 90, dummy: 'stand', parar: 'completo' });
      expect(e.filmes).toBe(0);
    }
  });
});

describe('V2-3c: medirGolpe (a coluna do frame-data)', () => {
  it('com a flag: ✓ no especial, ✗ no golpe comum, na PARADE e no VADIVU; sem a flag a coluna é null (não medida)', () => {
    const med = (id: Parameters<typeof medirGolpe>[1], ficha: string | null, golpe: NomeGolpe, nivel: number | null = null) => medirGolpe(elenco, id, ficha, golpe, nivel, FILMES);
    expect(med('hayato', null, 'sFwd').filme).toBe(true);
    expect(med('hayato', null, 'hk').filme).toBe(false);
    expect(med('min-ji', null, 'sDown').filme).toBe(true); // HOERI (3 acertos): 1 filme
    expect(med('aminu', null, 'sFire', 2).filme).toBe(true); // MASHI, um nível
    expect(med('camille', null, 'sResp').filme).toBe(true); // o FOUETTÉ que a PARADE libera
    expect(med('camille', null, 'sFire').filme).toBe(false); // a PARADE em si não machuca
    expect(med('nila', null, 'sDown').filme).toBe(false); // VADIVU
    expect(medirGolpe(elenco, 'hayato', null, 'sFwd').filme).toBeNull();
  });

  it('o dano medido com a flag é o do filme (HAYATO KAMINARI-STEP: 14,49 × pow)', () => {
    const m = medirGolpe(elenco, 'hayato', null, 'sFwd', null, FILMES);
    expect(m.dano).toBeCloseTo((filmeDoGolpe('hayato', null, 'sFwd')?.dano ?? 0) * elenco.hayato.pow, 6);
  });
});

describe('V2-3c: o relatório', () => {
  const linha = (golpe: string, filme: boolean | null): MedidaGolpe =>
    ({
      lutador: 'hayato', ficha: null, golpe, variante: null, nome: golpe, tipo: 'melee',
      nominal: { S: 1, A: 1, R: 1, dmg: 1, hs: 1, bs: 1, lvl: 'mid', custo: null, pow: 1 },
      caixa: null, inicio: 1, ativos: 1, recuperacao: 1, total: 3, alcance: null, dRef: 90, dano: 10, acertos: 1, hitstun: 5, derruba: false,
      vantagemAcerto: 1, blockstun: 1, vantagemBloqueio: 0, raspao: 1, bloqueioMedido: 'mid', filme, notas: [],
    }) as MedidaGolpe;

  it('com a flag: coluna "Filme" com ✓ onde abre filme e – onde não; sem a flag o arquivo não ganha coluna', () => {
    const cab = { geradoEm: '2026-10-23', versaoDados: 'x' };
    const com = frameDataMd([linha('sFwd', true), linha('hk', false)], ['hayato'], cab);
    expect(com).toContain('| Dano | Filme | Hitstun |');
    expect(com).toMatch(/\| sFwd \| sFwd \|[^\n]*\| ✓ \|/);
    expect(com).toMatch(/\| hk \| hk \|[^\n]*\| – \|/);
    const sem = frameDataMd([linha('sFwd', null), linha('hk', null)], ['hayato'], cab);
    expect(sem).not.toContain('Filme');
    expect(sem).toContain('| Dano | Hitstun |');
  });
});

describe('V2-3c: o harness credita o acerto ao GOLPE que abriu o filme (o atacante já está em `_lag` quando o evento chega)', () => {
  it('lutas CPU x CPU com a flag: nenhum acerto cai na chave `_lag`, e os especiais somam acertos', async () => {
    const { lutar } = await import('../../ferramentas/balanco/simulacao');
    let especiais = 0;
    for (const [a, b] of [['hayato', 'wei-long'], ['baatar', 'min-ji'], ['centella', 'camille']] as const) {
      const reg = lutar(elenco, { idx: 0, tipo: 'regular', a, b, nivel: 2, semente: 5, esquiva: true, filmes: true });
      for (const i of [0, 1] as const) {
        const golpes = reg.golpes[i];
        expect(golpes['_lag']?.[1] ?? 0, `${a}x${b} P${i + 1}: acertos em _lag`).toBe(0);
        for (const k of ['sFire', 'sDown', 'sFwd', 'sResp']) especiais += golpes[k]?.[1] ?? 0;
      }
    }
    expect(especiais).toBeGreaterThan(0);
  });
});
