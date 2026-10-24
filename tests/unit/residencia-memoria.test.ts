import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { pesoDoManifesto } from '../../src/assets/carregador';
import { iniciarArte } from '../../src/assets/elenco';
import { BYTES_DE_CENARIO, GerenciadorDeArte } from '../../src/assets/gerenciador';
import { validarManifesto } from '../../src/assets/manifesto';
import { CacheDeSilhuetas } from '../../src/assets/silhuetas';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { MIB, atlasFalsos, criarCanvasFalso, leitorFalso, CENARIOS_FALSOS, type DefDeAtlas } from './_arte-falsa';

// L1 da residência de memória (docs/spec-residencia-de-memoria.md §5): MEDIR primeiro. `memoria()`, o peso do atlas lido do manifesto e o cache de silhuetas
// compartilhado. Nenhum comportamento muda; estes testes só leem.

const DEFS: Record<string, DefDeAtlas> = {
  hayato: { paginas: 2, tamanho: [1536, 1024], filme: [1920, 1280] }, // 2 x 6 MiB = 12 MiB; FILME 9,375 MiB
  caio: { paginas: 1, tamanho: [2048, 1664] }, // 13 MiB
  nila: { paginas: 3, tamanho: [1024, 1024] }, // 12 MiB, sem filme
};

async function montar(opcoes: { silhuetas?: CacheDeSilhuetas; retratos?: boolean } = {}) {
  const L = leitorFalso(DEFS);
  const atlas = await atlasFalsos(DEFS, L.l, opcoes.silhuetas);
  const g = new GerenciadorDeArte({
    leitor: L.l,
    baseUrl: '/',
    atlas,
    cenarios: CENARIOS_FALSOS,
    politica: 'fixa',
    ...(opcoes.silhuetas ? { silhuetas: opcoes.silhuetas } : {}),
  });
  if (opcoes.retratos) await g.carregarRetratos(Object.keys(DEFS));
  return { L, atlas, g };
}

describe('peso do atlas lido do MANIFESTO (antes de baixar nada)', () => {
  it('largura x altura x 4 x páginas, sem baixar imagem', async () => {
    const { L, atlas } = await montar();
    expect(atlas.get('hayato')?.peso).toBe(1536 * 1024 * 4 * 2);
    expect(atlas.get('caio')?.peso).toBe(13 * MIB);
    expect(atlas.get('nila')?.peso).toBe(12 * MIB);
    expect(L.imagens).toEqual([]); // só o JSON foi lido
  });

  it('os 10 atlas reais, lidos do disco, batem com a tabela da spec (MiB)', () => {
    const esperado: Record<string, number> = { aminu: 30, baatar: 42, caio: 28, camille: 23, centella: 26, hayato: 24, 'min-ji': 24, nila: 37.5, 'wei-long': 26, zenon: 46.5 };
    expect(Object.keys(esperado).sort()).toEqual([...IDS_LUTADORES].sort());
    for (const id of IDS_LUTADORES) {
      const m = validarManifesto(JSON.parse(readFileSync(`public/assets/lutadores/${id}/atlas.json`, 'utf8')), id);
      expect(pesoDoManifesto(m) / MIB, id).toBeCloseTo(esperado[id] as number, 6);
    }
  });
});

describe('memoria(): bytes vivos por categoria', () => {
  it('nasce zerada (só os manifestos foram lidos)', async () => {
    const { g } = await montar();
    expect(g.memoria()).toEqual({ atlas: {}, filmes: {}, cenarios: {}, retratos: 0, silhuetas: 0, imagens: 0 });
  });

  it('soma atlas, cenários e retratos; `imagens` é a soma e as silhuetas ficam de fora', async () => {
    const { g } = await montar({ retratos: true });
    await g.garantir({ lutadores: ['hayato', 'caio'], cenarios: ['jp', 'cn'] });
    const m = g.memoria();
    expect(m.atlas).toEqual({ hayato: 12 * MIB, caio: 13 * MIB });
    expect(m.cenarios).toEqual({ jp: BYTES_DE_CENARIO, cn: BYTES_DE_CENARIO });
    expect(m.retratos).toBe(3 * 195 * 194 * 4); // os 3 retratos
    expect(m.filmes).toEqual({});
    expect(m.imagens).toBe(25 * MIB + 2 * BYTES_DE_CENARIO + 3 * 195 * 194 * 4);
    expect(m.silhuetas).toBe(0);
  });

  it('solta o atlas, sai da conta; o retrato fica', async () => {
    const { g } = await montar({ retratos: true });
    await g.garantir({ lutadores: ['nila'] });
    expect(g.memoria().atlas).toEqual({ nila: 12 * MIB });
    g.liberarLutador('nila');
    g.liberarCenario('jp');
    const m = g.memoria();
    expect(m.atlas).toEqual({});
    expect(m.retratos).toBe(3 * 195 * 194 * 4);
  });

  it('apelido de fixture não duplica: o mesmo objeto de atlas conta uma vez, pelo id real', async () => {
    const { g } = await montar({ retratos: true });
    g.registrarApelido('hayato-2', 'hayato');
    await g.garantir({ lutadores: ['hayato', 'hayato-2'] });
    const m = g.memoria();
    expect(m.atlas).toEqual({ hayato: 12 * MIB });
    expect(m.imagens).toBe(12 * MIB + 3 * 195 * 194 * 4);
  });

  it('a FILME conta só quando está PRONTA: carga em andamento não entra, solta sai', async () => {
    const { g, L } = await montar();
    await g.garantir({ lutadores: ['hayato'] });
    const liberar = L.segurar(/filme\.webp$/);
    const carga = g.carregarFilme(['hayato']);
    await new Promise((r) => setTimeout(r, 0));
    expect(g.memoria().filmes).toEqual({}); // pedida, ainda não chegou
    expect(g.memoria().imagens).toBe(12 * MIB);
    liberar();
    await carga;
    expect(g.memoria().filmes).toEqual({ hayato: 1920 * 1280 * 4 });
    expect(g.memoria().imagens).toBe(12 * MIB + 1920 * 1280 * 4);
    g.soltarFilme();
    expect(g.memoria().filmes).toEqual({});
  });

  it('lutador sem filme não aparece em `filmes`', async () => {
    const { g } = await montar();
    await g.garantir({ lutadores: ['nila'] });
    await g.carregarFilme(['nila']);
    expect(g.memoria().filmes).toEqual({});
  });
});

describe('cache de silhuetas COMPARTILHADO entre os atlas e o gerenciador', () => {
  it('as silhuetas criadas pelos atlas aparecem em memoria().silhuetas (o mesmo teto, a mesma conta)', async () => {
    const silhuetas = new CacheDeSilhuetas();
    const { g, atlas } = await montar({ silhuetas });
    await g.garantir({ lutadores: ['hayato', 'caio'] });
    const a = atlas.get('hayato');
    const c = atlas.get('caio');
    const s1 = a?.silhuetaDe(a.poses()['guard'] as never);
    const s2 = c?.silhuetaDe(c.poses()['punch'] as never);
    expect(s1 && s2).toBeTruthy();
    const esperado = s1!.width * s1!.height * 4 + s2!.width * s2!.height * 4;
    expect(esperado).toBeGreaterThan(0);
    expect(silhuetas.bytes).toBe(esperado);
    expect(g.memoria().silhuetas).toBe(esperado);
    expect(g.memoria().imagens).toBe(25 * MIB); // silhueta é canvas, não imagem
    g.liberarLutador('hayato'); // o atlas que sai leva as silhuetas dele
    expect(g.memoria().silhuetas).toBe(s2!.width * s2!.height * 4);
  });

  it('iniciarArte cria UM cache e o entrega aos 10 atlas e ao gerenciador', async () => {
    const defs = Object.fromEntries(IDS_LUTADORES.map((id) => [id, { paginas: 1, tamanho: [64, 32] as const }]));
    const L = leitorFalso(defs);
    const { elenco, arte } = await iniciarArte({ baseUrl: '/', leitor: L.l, criarCanvas: criarCanvasFalso, precarregar: ['hayato', 'caio'] });
    expect(arte.politica).toBe('por-peso'); // o padrão do jogo desde a L6 (`?residencia=fixa` é o rollback)
    expect(arte.memoria().silhuetas).toBe(0);
    const bytesDe = (c: CanvasImageSource | null): number => {
      const { width, height } = (c ?? { width: 0, height: 0 }) as { width: number; height: number };
      return width * height * 4;
    };
    const sh = elenco['hayato'].arte.silhuetaDe(elenco['hayato'].ch.pd['guard'] as never);
    const sc = elenco['caio'].arte.silhuetaDe(elenco['caio'].ch.pd['guard'] as never);
    expect(sh && sc).toBeTruthy();
    const m = arte.memoria();
    expect(m.silhuetas).toBe(bytesDe(sh) + bytesDe(sc)); // os dois lutadores alimentam a mesma conta
    expect(m.silhuetas).toBeGreaterThan(0);
    expect(Object.keys(m.cenarios).sort()).toEqual(['br', 'jp']); // os preferidos de [hayato, caio]
    expect(m.imagens).toBe(2 * 64 * 32 * 4 + 2 * BYTES_DE_CENARIO + 10 * 195 * 194 * 4);
  });
});
