import { existsSync, readFileSync, statSync } from 'node:fs';
import sharp from 'sharp';
import { inflateSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import type { CriarCanvas } from '../../src/assets/canvas';
import { AtlasLutador, carregarManifestos, carregarRecursos, type ImagemCarregada, type LeitorDeRecursos } from '../../src/assets/carregador';
import { iniciarArte } from '../../src/assets/elenco';
import { arquivosFixosDaEtapa0 } from '../../src/assets/etapa0.mjs';
import { GerenciadorDeArte } from '../../src/assets/gerenciador';
import { paraManifestoV1, validarManifesto, validarRetrato } from '../../src/assets/manifesto';
import { ErroDeAsset } from '../../src/assets/tipos';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { VITRINE } from '../../src/data/lutadores';
// @ts-expect-error ferramenta .mjs pura, sem tipos
import { codificarPng, dimensoesPng, janelaInteira, recorteDoRosto, trocarCampoRetrato } from '../../ferramentas/gerar-retratos.mjs';

// ---------- leitor falso com contagem de pedidos ----------
type Defs = {
  /** manifesto de cada lutador (JSON cru) */
  manifestos: Record<string, unknown>;
  /** tamanho de cada imagem pelo nome do arquivo (ex.: "caio/atlas.webp") */
  imagens?: Record<string, [number, number]>;
  semSidecar?: boolean;
};

function leitor(d: Defs) {
  const pedidos: string[] = [];
  const prebuscas: string[] = [];
  const l: LeitorDeRecursos = {
    async json(url) {
      pedidos.push(url);
      const m = /lutadores\/([^/]+)\/(atlas|retrato)\.json/.exec(url);
      if (m?.[2] === 'atlas' && m[1] && d.manifestos[m[1]]) return d.manifestos[m[1]];
      if (m?.[2] === 'retrato' && !d.semSidecar) return { arquivo: 'retrato.webp', recorte: [2.5, 2, 190, 190] };
      throw new ErroDeAsset(`404 ${url}`, url);
    },
    async imagem(url) {
      pedidos.push(url);
      const tam = d.imagens?.[url.replace(/^.*assets\/(lutadores\/)?/, '')] ?? (/retrato\.webp$/.test(url) ? [195, 194] : [64, 32]);
      return { width: tam[0], height: tam[1], url } as unknown as ImagemCarregada;
    },
    async prebuscar(url) {
      prebuscas.push(url);
    },
  };
  return { l, pedidos, prebuscas, atlasBaixados: () => pedidos.filter((p) => /atlas\.(webp|png)|atlas-\d/.test(p)) };
}

const quadro = (x: number, p?: number) => ({ x, y: 0, w: 10, h: 20, ax: 5, ...(p === undefined ? {} : { p }) });
const v1 = (id: string) => ({ versao: 1, lutador: id, imagem: 'atlas.webp', tamanho: [64, 32], alturaRef: 20, quadros: { idle0: quadro(0), guard: quadro(0), punch: quadro(10) } });
const v2 = (id: string) => ({
  versao: 2, lutador: id, imagens: ['atlas-0.webp', 'atlas-1.webp'], tamanho: [64, 32], alturaRef: 20,
  quadros: { idle0: quadro(0, 0), guard: quadro(0, 0), punch: quadro(10, 1) },
});
const criarCanvasFalso: CriarCanvas = (w, h) => ({ width: w, height: h, getContext: () => ({ drawImage() {}, fillRect() {} }) }) as unknown as HTMLCanvasElement;

describe('C1 v2 — validarManifesto', () => {
  it('v1 continua valendo e vira 1 página; v2 aceita várias páginas com p por quadro', () => {
    const a = validarManifesto(v1('caio'), 'a.json');
    expect(a.imagens).toEqual(['atlas.webp']);
    expect(a.quadros['punch']?.p).toBe(0);
    const b = validarManifesto(v2('caio'), 'a.json');
    expect(b.versao).toBe(2);
    expect(b.imagens).toEqual(['atlas-0.webp', 'atlas-1.webp']);
    expect(b.quadros['punch']?.p).toBe(1);
  });

  it.each([
    ['v2 sem imagens', { ...v2('x'), imagens: undefined }],
    ['v2 com lista vazia', { ...v2('x'), imagens: [] }],
    ['v2 com pasta no nome', { ...v2('x'), imagens: ['../a.webp'] }],
    ['v2 com arquivo repetido', { ...v2('x'), imagens: ['a.webp', 'a.webp'] }],
    ['v2 com mais de 8 páginas', { ...v2('x'), imagens: Array.from({ length: 9 }, (_, i) => `a${i}.webp`) }],
    ['p fora das páginas', { ...v2('x'), quadros: { idle0: quadro(0, 2) } }],
    ['p negativo', { ...v2('x'), quadros: { idle0: quadro(0, -1) } }],
    ['p fracionário', { ...v2('x'), quadros: { idle0: quadro(0, 0.5) } }],
    ['v1 com p diferente de 0', { ...v1('x'), quadros: { idle0: quadro(0, 1) } }],
    ['versão 3', { ...v1('x'), versao: 3 }],
  ])('rejeita: %s', (_n, dados) => {
    expect(() => validarManifesto(dados, 'a.json')).toThrow(ErroDeAsset);
  });

  it('retrato: nome simples, ou { arquivo, recorte }; rejeita pasta e recorte ruim', () => {
    expect(validarRetrato('retrato.webp', 'x')).toEqual({ arquivo: 'retrato.webp' });
    expect(validarRetrato({ arquivo: 'r.png', recorte: [1.5, 2, 190, 190] }, 'x')).toEqual({ arquivo: 'r.png', recorte: [1.5, 2, 190, 190] });
    expect(validarManifesto({ ...v1('x'), retrato: 'retrato.webp' }, 'a').retrato).toEqual({ arquivo: 'retrato.webp' });
    for (const ruim of ['../r.png', '.oculto', { arquivo: 'a/b.png' }, { arquivo: 'r.png', recorte: [1, 2, 3] }, { arquivo: 'r.png', recorte: [0, 0, 0, 5] }, 5]) {
      expect(() => validarRetrato(ruim, 'x')).toThrow(ErroDeAsset);
    }
  });

  it('paraManifestoV1 entrega o formato de data/atlas.ts sem a página', () => {
    const m = paraManifestoV1(validarManifesto(v2('caio'), 'a'));
    expect(m.versao).toBe(1);
    expect(m.imagem).toBe('atlas-0.webp');
    expect(m.quadros['punch']).toEqual({ x: 10, y: 0, w: 10, h: 20, ax: 5 });
  });
});

describe('AtlasLutador com várias páginas', () => {
  async function atlasV2() {
    const L = leitor({ manifestos: { caio: v2('caio') } });
    const mapa = await carregarManifestos('/', ['caio'], L.l, criarCanvasFalso);
    const a = mapa.get('caio') as AtlasLutador;
    return { a, L };
  }

  it('metadados existem antes das imagens; carregarImagens baixa todas as páginas e confere o tamanho', async () => {
    const { a, L } = await atlasV2();
    expect(a.pronta).toBe(false);
    expect(L.atlasBaixados()).toEqual([]);
    expect(() => a.imagem).toThrow(/ainda nao foi carregado/);
    await a.carregarImagens(L.l);
    expect(a.pronta).toBe(true);
    expect(a.paginasCarregadas).toBe(2);
    expect(L.atlasBaixados()).toEqual(['/assets/lutadores/caio/atlas-0.webp', '/assets/lutadores/caio/atlas-1.webp']);
  });

  it('imagemDe/silhuetaDe devolvem a página do quadro (inclusive via objeto de pose)', async () => {
    const { a, L } = await atlasV2();
    await a.carregarImagens(L.l);
    const poses = a.poses();
    const g = poses['guard']!;
    const punch = poses['punch']!;
    expect((a.imagemDe(g) as unknown as { url: string }).url).toMatch(/atlas-0\.webp$/);
    expect((a.imagemDe(punch) as unknown as { url: string }).url).toMatch(/atlas-1\.webp$/);
    const s0 = a.silhuetaDe(g);
    const s1 = a.silhuetaDe(punch);
    expect(s0).not.toBe(s1);
    expect(a.silhuetaDe(punch)).toBe(s1); // cache por quadro
    expect(a.paginaDe('punch')).toBe(1);
  });

  it('página com tamanho diferente do manifesto é rejeitada dizendo qual', async () => {
    const L = leitor({ manifestos: { caio: v2('caio') }, imagens: { 'caio/atlas-1.webp': [10, 10] } });
    const a = (await carregarManifestos('/', ['caio'], L.l)).get('caio') as AtlasLutador;
    await expect(a.carregarImagens(L.l)).rejects.toThrow(/atlas-1\.webp.*10x10.*64x32/);
    expect(a.pronta).toBe(false);
  });

  it('liberar solta as imagens e mantém os metadados; dá para carregar de novo', async () => {
    const { a, L } = await atlasV2();
    await a.carregarImagens(L.l);
    const pd = a.poses()['guard']!;
    a.liberar();
    expect(a.pronta).toBe(false);
    expect(a.imagemDe(pd)).toBeNull();
    expect(a.silhuetaDe(pd)).toBeNull();
    expect(Object.keys(a.poses())).toContain('punch');
    await a.carregarImagens(L.l);
    expect(a.pronta).toBe(true);
  });

  it('duas chamadas simultâneas de carregarImagens dividem a mesma carga', async () => {
    const { a, L } = await atlasV2();
    await Promise.all([a.carregarImagens(L.l), a.carregarImagens(L.l)]);
    expect(L.atlasBaixados()).toHaveLength(2);
  });

  it('retrato: o próprio arquivo se carregado; senão o recorte do atlas; senão nada', async () => {
    const L = leitor({ manifestos: { caio: v1('caio') } });
    const a = (await carregarManifestos('/', ['caio'], L.l)).get('caio') as AtlasLutador;
    const head = [3, 4, 190, 190] as const;
    expect(a.retrato(head)).toBeNull();
    await a.carregarImagens(L.l);
    expect(a.retrato(head)?.recorte).toEqual(head); // atlas como recurso
    expect(await a.carregarRetrato(L.l)).toBe(true); // sidecar retrato.json
    const r = a.retrato(head);
    expect(r?.recorte).toEqual([2.5, 2, 190, 190]);
    expect((r?.imagem as unknown as { url: string }).url).toMatch(/retrato\.webp$/);
    a.liberar();
    expect(a.retrato(head)).not.toBeNull(); // o retrato sobrevive à liberação do atlas
  });

  it('sem sidecar nem campo, carregarRetrato devolve false e o atlas serve de recurso', async () => {
    const L = leitor({ manifestos: { caio: v1('caio') }, semSidecar: true });
    const a = (await carregarManifestos('/', ['caio'], L.l)).get('caio') as AtlasLutador;
    expect(await a.carregarRetrato(L.l)).toBe(false);
    expect(a.temRetrato).toBe(false);
  });

  it('carregarRecursos (tudo de uma vez) conta as páginas extras no progresso e termina em 1', async () => {
    const L = leitor({ manifestos: { a: v1('a'), b: v2('b') } });
    const marcos: number[] = [];
    const r = await carregarRecursos({ baseUrl: '/', lutadores: ['a', 'b'], cenarios: [] }, { leitor: L.l, aoProgredir: (f) => marcos.push(f) });
    expect(r.lutadores.get('b')?.paginasCarregadas).toBe(2);
    expect(marcos.at(-1)).toBe(1);
    expect([...marcos].sort((x, y) => x - y)).toEqual(marcos);
  });
});

// Política 'fixa' = o comportamento de antes da residência por peso (preferido = fixo, no máximo LIMITE_RESIDENTES_FIXA atlas não fixos, poda DEPOIS de carregar).
// A política nova ('por-peso') é coberta em residencia-gerenciador.test.ts.
describe("GerenciadorDeArte (carga sob demanda, política 'fixa')", () => {
  const ids = ['a', 'b', 'c', 'd', 'e', 'f'];
  async function ger(opcoes: { preferidos?: string[] } = {}) {
    const L = leitor({ manifestos: Object.fromEntries(ids.map((i) => [i, v1(i)])) });
    const atlas = await carregarManifestos('/', ids, L.l, criarCanvasFalso);
    const cenarios = new Map([['jp', { id: 'jp', arquivo: 'assets/cenarios/jp.jpg' }], ['br', { id: 'br', arquivo: 'assets/cenarios/cenario-br.webp' }]]);
    const g = new GerenciadorDeArte({ leitor: L.l, baseUrl: '/', atlas, cenarios, preferidos: opcoes.preferidos ?? [], cenariosPreferidos: ['jp'], politica: 'fixa' });
    return { g, L, atlas };
  }

  it('garantir carrega só o pedido, uma vez, e relata o progresso até 1', async () => {
    const { g, L } = await ger();
    const marcos: number[] = [];
    await g.garantir({ lutadores: ['a', 'b'], cenarios: ['br'] }, (f) => marcos.push(f));
    expect(L.atlasBaixados()).toHaveLength(2);
    expect(g.cenarios.has('br')).toBe(true);
    expect(marcos.at(-1)).toBe(1);
    expect(g.estaPronto({ lutadores: ['a', 'b'], cenarios: ['br'] })).toBe(true);
    expect(g.estaPronto({ lutadores: ['c'] })).toBe(false);
    await g.garantir({ lutadores: ['a', 'b'], cenarios: ['br'] }); // de novo: nada novo
    expect(L.atlasBaixados()).toHaveLength(2);
  });

  it('pedidos simultâneos do mesmo lutador baixam uma vez só', async () => {
    const { g, L } = await ger();
    await Promise.all([g.garantir({ lutadores: ['a'] }), g.garantir({ lutadores: ['a', 'b'] }), g.garantir({ lutadores: ['a'] })]);
    expect(L.atlasBaixados().filter((u) => u.includes('/a/'))).toHaveLength(1);
    expect(g.cargas.lutadores.get('a')).toBe(1);
  });

  it('poda o menos recente que não está em uso nem é fixo, respeitando o limite de 3 não fixos', async () => {
    const { g, atlas } = await ger({ preferidos: ['a'] });
    await g.garantir({ lutadores: ['a'] });
    await g.garantir({ lutadores: ['b'] });
    await g.garantir({ lutadores: ['c'] });
    g.usar({ lutadores: ['c'] });
    await g.garantir({ lutadores: ['d'] });
    expect(g.lutadoresResidentes().sort()).toEqual(['a', 'b', 'c', 'd']); // 3 não fixos (b, c, d): cabe
    await g.garantir({ lutadores: ['e'] });
    // fixo a nunca sai; 4 não fixos passam do limite de 3: sai o mais antigo que não está em uso (b); c está em uso
    expect(g.lutadoresResidentes().sort()).toEqual(['a', 'c', 'd', 'e']);
    expect(atlas.get('b')?.pronta).toBe(false);
    // quem está em uso nunca é solto, mesmo passando do limite
    g.usar({ lutadores: ['c', 'd', 'e', 'f'] });
    await g.garantir({ lutadores: ['f'] });
    expect(g.lutadoresResidentes().sort()).toEqual(['a', 'c', 'd', 'e', 'f']);
  });

  it("em 'fixa' o despejo é só a poda de DEPOIS de carregar: o excedente existe durante a carga e nada de peso é considerado", async () => {
    const { g, L } = await ger();
    const vistos: number[] = [];
    const imagem = L.l.imagem.bind(L.l);
    L.l.imagem = async (url) => {
      vistos.push(g.lutadoresResidentes().length);
      return imagem(url);
    };
    for (const id of ['a', 'b', 'c', 'd']) await g.garantir({ lutadores: [id] });
    expect(vistos).toEqual([0, 1, 2, 3]); // no 4º pedido já há 3 residentes: o antigo só sai depois da chegada do novo
    expect(g.lutadoresResidentes()).toHaveLength(3);
  });

  it("em 'fixa' entrarNaLuta é só usar(): solta nada e o resto (preferir, aliviar) não faz nada", async () => {
    const { g } = await ger({ preferidos: ['a'] });
    await g.garantir({ lutadores: ['a', 'b'], cenarios: ['jp', 'br'] });
    g.entrarNaLuta({ lutadores: ['c'] });
    g.preferir({ lutadores: ['d'] });
    await g.fundoPronto();
    g.aliviar();
    expect(g.lutadoresResidentes().sort()).toEqual(['a', 'b']);
    expect([...g.cenarios.keys()].sort()).toEqual(['br', 'jp']);
  });

  it('liberarLutador respeita os fixos; liberarCenario respeita os cenários fixos', async () => {
    const { g } = await ger({ preferidos: ['a'] });
    await g.garantir({ lutadores: ['a', 'b'], cenarios: ['jp', 'br'] });
    g.liberarLutador('a');
    g.liberarLutador('b');
    g.liberarCenario('jp');
    g.liberarCenario('br');
    expect(g.lutadoresResidentes()).toEqual(['a']);
    expect([...g.cenarios.keys()]).toEqual(['jp']);
  });

  it('prebuscar só baixa (cache), sem decodificar nem marcar como pronto', async () => {
    const { g, L, atlas } = await ger();
    g.prebuscar({ lutadores: ['b'], cenarios: ['br'] });
    await new Promise((r) => setTimeout(r, 5));
    expect(L.prebuscas).toEqual(['/assets/lutadores/b/atlas.webp', '/assets/cenarios/cenario-br.webp']);
    expect(atlas.get('b')?.pronta).toBe(false);
    expect(g.cenarios.has('br')).toBe(false);
  });

  it('lutador ou cenário desconhecido falha com mensagem clara; pedir() não derruba o jogo', async () => {
    const { g } = await ger();
    await expect(g.garantir({ lutadores: ['zzz'] })).rejects.toThrow(/zzz/);
    await expect(g.garantir({ cenarios: ['nada'] })).rejects.toThrow(/nada/);
  });

  it('retratos de todos carregam de uma vez e ficam, mesmo com o atlas solto', async () => {
    const { g, atlas } = await ger();
    await g.carregarRetratos(ids);
    expect(ids.every((i) => atlas.get(i)?.temRetrato)).toBe(true);
    await g.garantir({ lutadores: ['a'] });
    g.liberarLutador('a');
    expect(atlas.get('a')?.temRetrato).toBe(true);
  });
});

describe('iniciarArte (boot) com o elenco real e leitor falso', () => {
  const todos = Object.fromEntries(IDS_LUTADORES.map((i) => [i, v1(i)]));

  it('padrão (T4): a ETAPA 0 baixa SÓ os manifestos dos 10 e o cenário padrão, exatamente o que a lista de etapa0.ts diz', async () => {
    const L = leitor({ manifestos: todos });
    const { elenco, arte } = await iniciarArte({ baseUrl: '/', leitor: L.l, criarCanvas: criarCanvasFalso });
    expect(Object.keys(elenco).sort()).toEqual([...IDS_LUTADORES].sort());
    expect(arte.lutadoresResidentes()).toEqual([]); // nenhum atlas antes do data-pronto
    expect(L.atlasBaixados()).toEqual([]);
    expect(L.pedidos.filter((p) => p.endsWith('/retrato.webp'))).toEqual([]); // retratos: etapa 1
    expect([...arte.cenarios.keys()]).toEqual(['jp']);
    // contrato T4/T7: o que o boot baixa (arquivos de dados) é um SUBCONJUNTO da lista que o SW pré-carrega, e o que a lista tem de arte, o boot baixou
    const pedidos = L.pedidos.map((p) => p.slice(1)).sort();
    expect(pedidos).toEqual(arquivosFixosDaEtapa0(IDS_LUTADORES).filter((c) => c.startsWith('assets/lutadores/') || c.startsWith('assets/cenarios/')).sort());
  });

  it('padrão (T4): a ETAPA 1 (etapa1) traz os retratos de todos e a vitrine (atlas e cenários do título) em segundo plano, sem bloquear', async () => {
    const L = leitor({ manifestos: todos });
    const { arte, etapa1 } = await iniciarArte({ baseUrl: '/', leitor: L.l, criarCanvas: criarCanvasFalso });
    etapa1();
    await arte.fundoPronto();
    expect(arte.lutadoresResidentes().sort()).toEqual([...VITRINE].sort());
    expect(L.atlasBaixados()).toHaveLength(VITRINE.length);
    expect(L.pedidos.filter((p) => p.endsWith('/retrato.webp'))).toHaveLength(IDS_LUTADORES.length);
    expect(arte.estaPronto({ lutadores: VITRINE, cenarios: ['jp', 'cn', 'kr', 'br'] })).toBe(true);
  });

  it("política 'fixa' (rollback `?residencia=fixa`): o boot de antes, retratos e vitrine na etapa 0 e a etapa 1 não faz nada", async () => {
    const L = leitor({ manifestos: todos });
    const { arte, etapa1 } = await iniciarArte({ baseUrl: '/', leitor: L.l, criarCanvas: criarCanvasFalso, politica: 'fixa' });
    expect(arte.lutadoresResidentes().sort()).toEqual([...VITRINE].sort());
    expect(L.pedidos.filter((p) => p.endsWith('/retrato.webp'))).toHaveLength(IDS_LUTADORES.length);
    expect(arte.cenarios.has('jp')).toBe(true);
    const antes = L.pedidos.length;
    etapa1();
    await arte.fundoPronto();
    expect(L.pedidos).toHaveLength(antes);
  });

  it('precarregar vazio: nenhum atlas no boot (tudo sob demanda), só retratos e o cenário padrão', async () => {
    const L = leitor({ manifestos: todos });
    const marcos: number[] = [];
    const { arte, etapa1 } = await iniciarArte({ baseUrl: '/', leitor: L.l, precarregar: [], criarCanvas: criarCanvasFalso, aoProgredir: (f) => marcos.push(f) });
    etapa1();
    await arte.fundoPronto();
    expect(L.atlasBaixados()).toEqual([]);
    expect([...arte.cenarios.keys()]).toEqual(['jp']);
    expect(marcos.at(-1)).toBe(1);
    expect([...marcos].sort((x, y) => x - y)).toEqual(marcos);
    await arte.garantir({ lutadores: ['caio', 'hayato'], cenarios: ['br'] });
    expect(L.atlasBaixados()).toHaveLength(2);
  });
});

describe('ferramenta de retratos (gerar-retratos.mjs)', () => {
  it('janelaInteira: contém o recorte fracionário com margem e respeita o atlas', () => {
    const j = janelaInteira([13.04, 4, 190, 190], 3600, 2251);
    expect(j.x0).toBe(11);
    expect(j.y0).toBe(2);
    expect(j.w).toBe(Math.ceil(13.04 + 190) + 2 - 11);
    expect(j.recorte[0]).toBeCloseTo(13.04 - 11, 12);
    expect(j.recorte[1]).toBe(2);
    const borda = janelaInteira([0.5, 0.5, 190, 190], 100, 100);
    expect(borda.x0).toBe(0);
    expect(borda.w).toBe(100);
  });

  it('codificarPng gera um PNG válido e sem perdas (ida e volta)', () => {
    const w = 3, h = 2;
    const rgba = Buffer.from([255, 0, 0, 255, 0, 255, 0, 128, 0, 0, 255, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
    const png = codificarPng(rgba, w, h) as Buffer;
    expect(dimensoesPng(png)).toEqual([w, h]);
    // extrai o IDAT e inflate: filtro 0 por linha
    const idat = png.subarray(png.indexOf('IDAT') + 4, png.indexOf('IEND') - 8);
    const cru = inflateSync(idat);
    const linhas = [cru.subarray(1, 1 + w * 4), cru.subarray(2 + w * 4, 2 + 2 * w * 4)];
    expect(Buffer.concat(linhas)).toEqual(rgba);
  });

  it.each(IDS_LUTADORES)('%s: retrato.webp/retrato.json em disco batem com o atlas (recorte dentro da imagem, mesma geometria do jogo)', async (id) => {
    const dir = `public/assets/lutadores/${id}`;
    const manifesto = JSON.parse(readFileSync(`${dir}/atlas.json`, 'utf8'));
    const sidecar = validarRetrato(JSON.parse(readFileSync(`${dir}/retrato.json`, 'utf8')), id);
    // T6 do orçamento: o campo `retrato` do atlas.json (que o jogo lê primeiro) e o sidecar dizem a MESMA coisa, e o arquivo é WebP
    expect(manifesto.retrato, id).toEqual({ arquivo: 'retrato.webp', recorte: sidecar.recorte });
    expect(sidecar.arquivo).toBe('retrato.webp');
    expect(existsSync(`${dir}/retrato.png`), 'o retrato antigo (PNG) não fica ao lado do novo').toBe(false);
    const meta = await sharp(`${dir}/${sidecar.arquivo}`).metadata();
    expect(meta.format).toBe('webp');
    expect(meta.hasAlpha).toBe(true);
    const [w, h] = [meta.width!, meta.height!];
    const [fx, fy, rw, rh] = sidecar.recorte!;
    // 190 px; nos atlas de alturaRef maior que 410 a janela cresce na mesma proporção (mesmo enquadramento do rosto)
    expect([rw, rh]).toEqual([Math.round((190 * Math.max(manifesto.alturaRef, 410)) / 410), Math.round((190 * Math.max(manifesto.alturaRef, 410)) / 410)]);
    expect(fx).toBeGreaterThanOrEqual(0);
    expect(fy).toBeGreaterThanOrEqual(0);
    expect(fx + rw).toBeLessThanOrEqual(w);
    expect(fy + rh).toBeLessThanOrEqual(h);
    // o recorte fracionário é o mesmo que o jogo calcula (head de montarLutador): posição no atlas = janela + recorte
    const [hx, hy] = recorteDoRosto(manifesto) as number[];
    expect(Math.abs(hx! - Math.floor(hx!) - (fx - Math.floor(fx)))).toBeLessThan(1e-6);
    expect(Math.abs(hy! - Math.floor(hy!) - (fy - Math.floor(fy)))).toBeLessThan(1e-6);
    // pequeno: muito menor que o atlas inteiro
    expect(statSync(`${dir}/${sidecar.arquivo}`).size).toBeLessThan(50_000);
  });

  it('T6 do orçamento: os 10 retratos juntos pesam <= 0,35 MiB (eram 0,57 MiB em PNG)', () => {
    const total = IDS_LUTADORES.reduce((soma, id) => soma + statSync(`public/assets/lutadores/${id}/retrato.webp`).size, 0);
    expect(IDS_LUTADORES).toHaveLength(10);
    expect(total / 1048576).toBeLessThanOrEqual(0.35);
  });

  it('trocarCampoRetrato: troca só o bloco `retrato` e preserva o resto do texto (formatação à mão incluída)', () => {
    const texto = '{\n  "versao": 2,\n  "quadros": { "a": { "x": 1, "y": 2 } },\n  "retrato": {\n    "arquivo": "retrato.png",\n    "recorte": [\n      2.5,\n      0,\n      190,\n      190\n    ]\n  },\n  "fim": true\n}\n';
    const novo = trocarCampoRetrato(texto, { arquivo: 'retrato.webp', recorte: [2.5, 0, 190, 190] }, 'x') as string;
    expect(novo.replace(/"retrato": \{[\s\S]*?\n {2}\}/, '')).toBe(texto.replace(/"retrato": \{[\s\S]*?\n {2}\}/, ''));
    expect(JSON.parse(novo).retrato).toEqual({ arquivo: 'retrato.webp', recorte: [2.5, 0, 190, 190] });
    expect(novo).toContain('"quadros": { "a": { "x": 1, "y": 2 } },'); // a linha escrita à mão sobrevive
    expect(() => trocarCampoRetrato('{"a":1}', { arquivo: 'r.webp', recorte: [0, 0, 1, 1] }, 'x')).toThrow(/sem o bloco/);
  });
});
