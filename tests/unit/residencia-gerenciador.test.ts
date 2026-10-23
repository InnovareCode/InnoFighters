import { readdirSync } from 'node:fs';
import sharp from 'sharp';
import { describe, expect, it } from 'vitest';
import { BYTES_DE_CENARIO, GerenciadorDeArte, TETO_FORA_DA_LUTA } from '../../src/assets/gerenciador';
import { CacheDeSilhuetas } from '../../src/assets/silhuetas';
import { CENARIOS } from '../../src/data/cenarios';
import { MIB, atlasFalsos, leitorFalso, type DefDeAtlas } from './_arte-falsa';

// L2 da residência de memória (docs/spec-residencia-de-memoria.md §2.4/§2.5): o gerenciador POR PESO. A política 'fixa' (o comportamento de antes) está em assets-demanda.test.ts.

/** Cada página = 1024 x 1024 x 4 = 4 MiB. */
const pg = (n: number): DefDeAtlas => ({ paginas: n, tamanho: [1024, 1024] });
const CEN = BYTES_DE_CENARIO;

const DEFS: Record<string, DefDeAtlas> = {
  h1: pg(5), h2: pg(5), h3: pg(5), h4: pg(5), // a "vitrine": 20 MiB cada, preferidos nesta ordem
  x1: pg(2), x2: pg(2), // não preferidos: 8 MiB
  y: pg(1), grande: pg(6), enorme: { paginas: 4, tamanho: [2048, 1792] }, // pedidos de 4, 24 e 56 MiB
  f1: { ...pg(2), filme: [1920, 1280] }, f2: { ...pg(2), filme: [1920, 1280] },
};
const CENARIOS_DO_TESTE = new Map(['jp', 'cn', 'kr', 'br', 'ng', 'mx'].map((id) => [id, { id, arquivo: `assets/cenarios/cenario-${id}.webp` }]));
const VITRINE = ['h1', 'h2', 'h3', 'h4'];
const CICLO = ['jp', 'cn', 'kr', 'br'];
/** 80 MiB de vitrine + 4 cenários do ciclo + `ng` + x1 + x2 (16 MiB): o gerenciador cheio até o último byte do teto. */
const CHEIO = 80 * MIB + 5 * CEN + 16 * MIB;

async function montar(opcoes: { teto?: number; silhuetas?: CacheDeSilhuetas } = {}) {
  const L = leitorFalso(DEFS);
  const atlas = await atlasFalsos(DEFS, L.l, opcoes.silhuetas);
  const g = new GerenciadorDeArte({
    leitor: L.l,
    baseUrl: '/',
    atlas,
    cenarios: CENARIOS_DO_TESTE,
    preferidos: VITRINE,
    cenariosPreferidos: CICLO,
    politica: 'por-peso',
    teto: opcoes.teto ?? CHEIO,
    ...(opcoes.silhuetas ? { silhuetas: opcoes.silhuetas } : {}),
  });
  return { L, atlas, g };
}

/** Enche o gerenciador: vitrine, o ciclo, `ng`, e x2 antes de x1 (x1 é o mais RECENTE dos dois). */
async function encher(g: GerenciadorDeArte) {
  await g.garantir({ lutadores: VITRINE, cenarios: CICLO });
  await g.garantir({ lutadores: ['x2'], cenarios: ['ng'] });
  await g.garantir({ lutadores: ['x1'] });
}
const atlasVivos = (g: GerenciadorDeArte): string[] => Object.keys(g.memoria().atlas).sort();
const cenariosVivos = (g: GerenciadorDeArte): string[] => Object.keys(g.memoria().cenarios).sort();
const esperar = (ms = 0): Promise<void> => new Promise((r) => setTimeout(r, ms));

describe("política 'por-peso': constantes e padrão", () => {
  it('o padrão da classe é por-peso, com o teto de 136 MiB', async () => {
    const L = leitorFalso(DEFS);
    const g = new GerenciadorDeArte({ leitor: L.l, baseUrl: '/', atlas: await atlasFalsos(DEFS, L.l), cenarios: CENARIOS_DO_TESTE });
    expect(g.politica).toBe('por-peso');
    expect(g.teto).toBe(TETO_FORA_DA_LUTA);
    expect(TETO_FORA_DA_LUTA).toBe(136 * MIB);
  });

  it('os 10 cenários do jogo têm 1920 x 1080 no disco: BYTES_DE_CENARIO vale para todos', async () => {
    expect(BYTES_DE_CENARIO).toBe(1920 * 1080 * 4);
    const todos = Object.values(CENARIOS);
    expect(todos).toHaveLength(10);
    for (const c of todos) {
      const m = await sharp(`public/${c.arquivo}`).metadata();
      expect([c.id, m.width, m.height]).toEqual([c.id, 1920, 1080]);
    }
    expect(readdirSync('public/assets/cenarios').filter((f) => /^cenario-.*\.webp$/.test(f))).toHaveLength(10);
  });
});

describe('ordem de despejo (§2.4), tudo ANTES de decodificar', () => {
  it('o gerenciador cheio fica exatamente no teto', async () => {
    const { g } = await montar();
    await encher(g);
    expect(g.bytesComprometidos()).toBe(CHEIO);
    expect(atlasVivos(g)).toEqual(['h1', 'h2', 'h3', 'h4', 'x1', 'x2']);
    expect(cenariosVivos(g)).toEqual(['br', 'cn', 'jp', 'kr', 'ng']);
  });

  it('pedido pequeno (4 MiB): sai só o atlas não preferido MENOS recente (x2; x1 foi tocado depois)', async () => {
    const { g } = await montar();
    await encher(g);
    await g.garantir({ lutadores: ['y'] });
    expect(atlasVivos(g)).toEqual(['h1', 'h2', 'h3', 'h4', 'x1', 'y']);
    expect(cenariosVivos(g)).toEqual(['br', 'cn', 'jp', 'kr', 'ng']);
  });

  it('pedido médio (24 MiB): atlas não preferidos, depois o cenário não preferido, depois o ÚLTIMO cenário preferido (br)', async () => {
    const { g } = await montar();
    await encher(g);
    await g.garantir({ lutadores: ['grande'] });
    expect(atlasVivos(g)).toEqual(['grande', 'h1', 'h2', 'h3', 'h4']); // x1 e x2 saíram
    expect(cenariosVivos(g)).toEqual(['cn', 'jp', 'kr']); // ng (não preferido) e br (o último da lista)
  });

  it('pedido enorme (56 MiB): todos os cenários, o jp POR ÚLTIMO, e só então os atlas preferidos, do fim para o começo (h4)', async () => {
    const { g } = await montar();
    await encher(g);
    await g.garantir({ lutadores: ['enorme'] });
    expect(atlasVivos(g)).toEqual(['enorme', 'h1', 'h2', 'h3']); // sai h4, o último da lista
    expect(cenariosVivos(g)).toEqual([]);
    expect(g.bytesComprometidos()).toBeLessThanOrEqual(CHEIO);
  });

  it('o pedido de cenário também abre espaço (7,9 MiB): sai x2, o atlas mais antigo', async () => {
    const { g } = await montar();
    await encher(g);
    await g.garantir({ cenarios: ['mx'] });
    expect(atlasVivos(g)).toEqual(['h1', 'h2', 'h3', 'h4', 'x1']);
    expect(cenariosVivos(g)).toEqual(['br', 'cn', 'jp', 'kr', 'mx', 'ng']);
  });

  it('o cenário não preferido menos recente sai antes do mais recente', async () => {
    const { g } = await montar({ teto: 80 * MIB + 6 * CEN });
    await g.garantir({ lutadores: VITRINE, cenarios: CICLO });
    await g.garantir({ cenarios: ['ng'] });
    await g.garantir({ cenarios: ['mx'] }); // mx mais recente que ng
    expect(cenariosVivos(g)).toEqual(['br', 'cn', 'jp', 'kr', 'mx', 'ng']);
    await g.garantir({ cenarios: ['ng'] }); // toca ng: agora mx é o mais antigo
    g.usar({}); // nada em uso
    await g.garantir({ lutadores: ['y'] }); // 4 MiB: cabe? 80 + 6 cenários já é o teto => precisa soltar um cenário não preferido
    expect(cenariosVivos(g)).toEqual(['br', 'cn', 'jp', 'kr', 'ng']);
  });

  it('nunca solta o que está em uso: o atlas e o cenário em uso ficam, o despejo pula para o próximo', async () => {
    const { g } = await montar();
    await encher(g);
    g.usar({ lutadores: ['x2', 'h4'], cenarios: ['ng', 'jp'] });
    await g.garantir({ lutadores: ['enorme'] });
    // faltam 56 MiB: x1 (8), os cenários preferidos fora de uso br, kr, cn (23,7), depois os atlas preferidos do fim: h4 está em uso (pula), h3 e h2 saem (40). h1 sobra.
    expect(atlasVivos(g)).toEqual(['enorme', 'h1', 'h4', 'x2']);
    expect(cenariosVivos(g)).toEqual(['jp', 'ng']);
  });

  it('se só o que está em uso já passa do teto, o teto cede: nada em uso é solto e nada quebra', async () => {
    const { g } = await montar({ teto: 30 * MIB });
    g.usar({ lutadores: ['grande', 'h1'] }); // 44 MiB em uso
    await g.garantir({ lutadores: ['grande', 'h1'] });
    await g.garantir({ lutadores: ['y'] });
    expect(atlasVivos(g)).toEqual(['grande', 'h1', 'y']);
    expect(g.bytesComprometidos()).toBeGreaterThan(30 * MIB);
  });

  it('o que já está residente E faz parte do pedido não sai para abrir espaço para o resto do mesmo pedido', async () => {
    const { g } = await montar();
    await encher(g);
    await g.garantir({ lutadores: ['x1', 'grande'], cenarios: ['ng', 'mx'] }); // x1 e ng já estão aí e são pedidos junto: ficam; sai x2 e o que for preciso
    expect(atlasVivos(g)).toContain('x1');
    expect(atlasVivos(g)).toContain('grande');
    expect(atlasVivos(g)).not.toContain('x2');
    expect(cenariosVivos(g)).toEqual(expect.arrayContaining(['ng', 'mx']));
  });

  it('o que o próprio pedido traz nunca sai para abrir espaço para ele mesmo (pedido > teto)', async () => {
    const { g } = await montar({ teto: 20 * MIB });
    await g.garantir({ lutadores: ['h1', 'h2'] }); // 40 MiB pedidos de uma vez
    expect(atlasVivos(g)).toEqual(['h1', 'h2']);
  });
});

describe('pico durante garantir()', () => {
  it('o espaço abre ANTES da primeira imagem ser pedida e o comprometido nunca passa do teto', async () => {
    const { g, L } = await montar();
    await encher(g);
    const vistos: Array<{ comprometido: number; x1: boolean; x2: boolean }> = [];
    L.aoPedirImagem(() => vistos.push({ comprometido: g.bytesComprometidos(), x1: 'x1' in g.memoria().atlas, x2: 'x2' in g.memoria().atlas }));
    await g.garantir({ lutadores: ['grande'], cenarios: ['mx'] });
    expect(vistos.length).toBeGreaterThanOrEqual(7); // 6 páginas + 1 cenário
    for (const v of vistos) {
      expect(v.comprometido).toBeLessThanOrEqual(CHEIO);
      expect(v.x2).toBe(false); // o velho já tinha saído quando o novo começou a ser decodificado
    }
  });

  it('carga em andamento conta como residente: o 2º pedido enxerga o 1º e despeja para caber os dois', async () => {
    const { g, L } = await montar({ teto: 40 * MIB });
    const liberar = L.segurar(/\/grande\/atlas/);
    const primeiro = g.garantir({ lutadores: ['grande'] }); // 24 MiB, parado na decodificação
    await esperar();
    expect(g.memoria().atlas).toEqual({}); // nada chegou
    expect(g.bytesComprometidos()).toBe(24 * MIB); // mas já conta
    await g.garantir({ lutadores: ['x1', 'x2'] }); // 16 MiB: cabem (40)
    expect(atlasVivos(g)).toEqual(['x1', 'x2']);
    await g.garantir({ lutadores: ['y'] }); // 4 MiB: 44 > 40 => sai o x mais antigo, x1 (a carga em andamento NÃO é cancelada)
    expect(g.bytesComprometidos()).toBeLessThanOrEqual(40 * MIB);
    expect(atlasVivos(g)).toEqual(['x2', 'y']);
    liberar();
    await primeiro;
    expect(atlasVivos(g)).toEqual(['grande', 'x2', 'y']);
  });
});

describe('geração de carga: nada ressuscita na luta (R5)', () => {
  it('atlas em andamento de fora da luta é solto na chegada', async () => {
    const { g, L, atlas } = await montar();
    const liberar = L.segurar(/\/x1\/atlas/);
    const carga = g.garantir({ lutadores: ['x1'] }); // pedida ANTES (cursor da seleção)
    await esperar();
    g.entrarNaLuta({ lutadores: ['h1', 'h2'], cenarios: ['jp'] });
    liberar();
    await carga;
    expect(atlas.get('x1')?.pronta).toBe(false);
    expect(g.memoria().atlas).toEqual({});
    expect(g.bytesComprometidos()).toBe(0);
  });

  it('cenário em andamento de fora da luta nem entra no mapa', async () => {
    const { g, L } = await montar();
    const liberar = L.segurar(/cenario-ng/);
    const carga = g.garantir({ cenarios: ['ng'] });
    await esperar();
    g.entrarNaLuta({ lutadores: ['h1'], cenarios: ['jp'] });
    liberar();
    await carga;
    expect(g.cenarios.has('ng')).toBe(false);
    expect(g.bytesComprometidos()).toBe(0);
  });

  it('carga em andamento que FAZ PARTE da luta fica (o cursor pediu o mesmo lutador da VS)', async () => {
    const { g, L } = await montar();
    const liberar = L.segurar(/\/h1\/atlas/);
    const carga = g.garantir({ lutadores: ['h1'] });
    await esperar();
    g.entrarNaLuta({ lutadores: ['h1', 'h2'], cenarios: [] });
    const vs = g.garantir({ lutadores: ['h1', 'h2'] }); // a VS pede de novo e divide a mesma carga
    liberar();
    await Promise.all([carga, vs]);
    expect(atlasVivos(g)).toEqual(['h1', 'h2']);
    expect(g.cargas.lutadores.get('h1')).toBe(1);
  });

  it('o pedido de DEPOIS da luta (outra geração do mesmo lutador) não herda o descarte', async () => {
    const { g, L, atlas } = await montar();
    const liberar = L.segurar(/\/x1\/atlas/);
    const antiga = g.garantir({ lutadores: ['x1'] });
    await esperar();
    g.entrarNaLuta({ lutadores: ['h1'], cenarios: [] });
    g.usar({ lutadores: ['x1'] }); // saiu da luta e a próxima cena usa x1
    const nova = g.garantir({ lutadores: ['x1'] });
    liberar();
    await Promise.all([antiga, nova]);
    expect(atlas.get('x1')?.pronta).toBe(true);
  });
});

describe('entrarNaLuta (VS e luta exclusivas)', () => {
  it('solta JÁ a vitrine, os outros cenários e a FILME de quem não está na luta; os da luta ficam', async () => {
    const { g } = await montar();
    await encher(g);
    await g.garantir({ lutadores: ['f1', 'f2'] });
    await g.carregarFilme(['f1', 'f2']);
    expect(g.filmesResidentes().sort()).toEqual(['f1', 'f2']);
    g.entrarNaLuta({ lutadores: ['f1', 'h2'], cenarios: ['kr'] });
    expect(atlasVivos(g)).toEqual(['f1', 'h2']);
    expect(cenariosVivos(g)).toEqual(['kr']);
    expect(g.filmesResidentes()).toEqual(['f1']); // f2 saiu com o atlas; a de f1 fica (a luta é dele)
    const m = g.memoria();
    expect(m.filmes).toEqual({ f1: 1920 * 1280 * 4 });
    expect(m.atlas).toEqual({ f1: 8 * MIB, h2: 20 * MIB });
  });

  it('revanche (a mesma dupla de novo): não solta nada e nada é baixado outra vez', async () => {
    const { g, L } = await montar();
    await g.garantir({ lutadores: ['h1', 'h2'], cenarios: ['jp'] });
    const antes = L.imagens.length;
    g.entrarNaLuta({ lutadores: ['h1', 'h2'], cenarios: ['jp'] });
    await g.garantir({ lutadores: ['h1', 'h2'], cenarios: ['jp'] });
    expect(L.imagens.length).toBe(antes);
    expect(atlasVivos(g)).toEqual(['h1', 'h2']);
  });

  it('as silhuetas do atlas que saiu vão junto', async () => {
    const silhuetas = new CacheDeSilhuetas();
    const { g, atlas } = await montar({ silhuetas });
    await g.garantir({ lutadores: ['h1', 'h2'] });
    for (const id of ['h1', 'h2']) atlas.get(id)?.silhuetaDe(atlas.get(id)?.poses()['guard'] as never);
    expect(silhuetas.tamanho).toBe(2);
    g.entrarNaLuta({ lutadores: ['h1'], cenarios: [] });
    expect(silhuetas.tamanho).toBe(1);
  });

  it('cancela a fila de fundo: o que ainda não começou nunca é carregado', async () => {
    const { g, L } = await montar();
    const liberar = L.segurar(/\/h1\/atlas/);
    g.preferir({ lutadores: ['h1', 'h2', 'h3'], cenarios: ['jp'] });
    await esperar();
    g.entrarNaLuta({ lutadores: ['x1'], cenarios: ['ng'] });
    liberar();
    await g.fundoPronto();
    expect(L.imagens.filter((u) => /\/h[23]\//.test(u) || /cenario-jp/.test(u))).toEqual([]);
    expect(atlasVivos(g)).toEqual([]); // e o h1, que já estava a caminho, foi solto na chegada
  });
});

describe('preferir (fila de fundo, serial)', () => {
  it('carrega UM item por vez, na ordem pedida: atlas e depois cenários', async () => {
    const { g, L } = await montar({ teto: 1000 * MIB });
    const liberar1 = L.segurar(/\/h1\/atlas-0/);
    g.preferir({ lutadores: ['h1', 'h2'], cenarios: ['jp'] });
    await esperar();
    expect(L.imagens.some((u) => /\/h2\//.test(u))).toBe(false); // h1 ainda decodificando: h2 espera
    expect(L.imagens.filter((u) => /\/h1\//.test(u))).toHaveLength(5); // as 5 páginas do h1 foram pedidas juntas (um atlas = uma carga)
    liberar1();
    await g.fundoPronto();
    const ordem = L.imagens.filter((u) => /atlas-0|cenario/.test(u)).map((u) => (/cenario/.test(u) ? 'jp' : u.split('/')[3]));
    expect(ordem).toEqual(['h1', 'h2', 'jp']);
    expect(atlasVivos(g)).toEqual(['h1', 'h2']);
    expect(cenariosVivos(g)).toEqual(['jp']);
  });

  it('um novo preferir SUBSTITUI a fila (o item já em andamento termina)', async () => {
    const { g, L } = await montar({ teto: 1000 * MIB });
    const liberar = L.segurar(/\/h1\/atlas-0/);
    g.preferir({ lutadores: ['h1', 'h2'] });
    await esperar();
    g.preferir({ lutadores: ['h3'] });
    liberar();
    await g.fundoPronto();
    expect(atlasVivos(g)).toEqual(['h1', 'h3']);
  });

  it('não despeja preferidos nem o que está em uso para caber: o que não couber fica de fora', async () => {
    const { g } = await montar({ teto: 100 * MIB });
    await g.garantir({ lutadores: ['h1', 'h2', 'h3', 'h4'] }); // 80
    g.usar({ lutadores: ['h4'] });
    g.preferir({ lutadores: ['grande', 'y'] }); // 24 não cabe (80 + 24 > 100); 4 + 80 = 84 cabe
    await g.fundoPronto();
    expect(atlasVivos(g)).toEqual(['h1', 'h2', 'h3', 'h4', 'y']);
  });

  it('pode despejar um NÃO preferido fora de uso (passos 1 e 2)', async () => {
    const { g } = await montar({ teto: 100 * MIB });
    await g.garantir({ lutadores: ['h1', 'h2', 'h3', 'h4'] }); // 80
    await g.garantir({ lutadores: ['x1', 'x2'] }); // 96
    g.usar({});
    g.preferir({ lutadores: ['y'] }); // 100 exato com um x a menos? 96 + 4 = 100: cabe sem despejar
    await g.fundoPronto();
    expect(atlasVivos(g)).toEqual(['h1', 'h2', 'h3', 'h4', 'x1', 'x2', 'y']);
    g.preferir({ cenarios: ['jp'] }); // + 7,9 passa do teto: sai x1 ou x2 (o menos recente)
    await g.fundoPronto();
    expect(cenariosVivos(g)).toEqual(['jp']);
    expect(atlasVivos(g)).toEqual(['h1', 'h2', 'h3', 'h4', 'x2', 'y']);
  });

  it('erro de carga vira console e a fila segue', async () => {
    const { g } = await montar({ teto: 1000 * MIB });
    const erros: unknown[] = [];
    const original = console.error;
    console.error = (...a: unknown[]) => erros.push(a);
    try {
      g.preferir({ lutadores: ['nao-existe', 'h1'] });
      await g.fundoPronto();
    } finally {
      console.error = original;
    }
    expect(erros).toHaveLength(1);
    expect(atlasVivos(g)).toEqual(['h1']);
  });
});

describe('aliviar (aba oculta)', () => {
  it('solta tudo fora de uso (atlas, FILME, cenários) e todas as silhuetas; o que está em uso fica', async () => {
    const silhuetas = new CacheDeSilhuetas();
    const { g, atlas } = await montar({ silhuetas });
    await encher(g);
    await g.garantir({ lutadores: ['f1'] });
    await g.carregarFilme(['f1']);
    for (const id of ['h1', 'x1', 'f1']) atlas.get(id)?.silhuetaDe(atlas.get(id)?.poses()['guard'] as never);
    expect(silhuetas.bytes).toBeGreaterThan(0);
    g.usar({ lutadores: ['f1'], cenarios: ['jp'] });
    g.aliviar();
    expect(atlasVivos(g)).toEqual(['f1']);
    expect(cenariosVivos(g)).toEqual(['jp']);
    expect(g.filmesResidentes()).toEqual(['f1']);
    expect(silhuetas.bytes).toBe(0);
    expect(g.memoria().silhuetas).toBe(0);
  });

  it('cancela a fila e solta na chegada o que estava a caminho', async () => {
    const { g, L } = await montar({ teto: 1000 * MIB });
    const liberar = L.segurar(/\/h1\/atlas/);
    g.preferir({ lutadores: ['h1', 'h2'] });
    await esperar();
    g.aliviar();
    liberar();
    await g.fundoPronto();
    expect(atlasVivos(g)).toEqual([]);
    expect(L.imagens.some((u) => /\/h2\//.test(u))).toBe(false);
  });
});

describe('liberarLutador / liberarCenario respeitam em uso e preferidos', () => {
  it('preferido e em uso não saem; o resto sai', async () => {
    const { g } = await montar();
    await g.garantir({ lutadores: ['h1', 'x1', 'x2'], cenarios: ['jp', 'ng', 'mx'] });
    g.usar({ lutadores: ['x2'], cenarios: ['mx'] });
    for (const id of ['h1', 'x1', 'x2']) g.liberarLutador(id);
    for (const id of ['jp', 'ng', 'mx']) g.liberarCenario(id);
    expect(atlasVivos(g)).toEqual(['h1', 'x2']);
    expect(cenariosVivos(g)).toEqual(['jp', 'mx']);
  });
});
