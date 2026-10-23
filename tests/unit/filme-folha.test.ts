import { readFileSync, statSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AtlasLutador, type ImagemCarregada, type LeitorDeRecursos } from '../../src/assets/carregador';
import { GerenciadorDeArte, MAX_FOLHAS_FILME } from '../../src/assets/gerenciador';
import { paraManifestoV1, validarManifesto } from '../../src/assets/manifesto';
import { ErroDeAsset } from '../../src/assets/tipos';

/**
 * Folha FILME no atlas (docs/orcamentos-2026-10-23.md, regra do piloto HAYATO): bloco `filme` próprio, página de tamanho próprio,
 * carregada só no início da luta, solta no fim, e NUNCA em `garantir`/`pedir`/`prebuscar`. Sem ler arte-fonte/.
 */

const TAM_ATLAS: [number, number] = [64, 32];
const TAM_FILME: [number, number] = [96, 64];
const quadro = (x: number) => ({ x, y: 0, w: 10, h: 20, ax: 5 });
const quadroF = (x: number, y = 0) => ({ x, y, w: 30, h: 30, ax: 15, painel: true });
const filmeOk = () => ({ imagem: 'filme.webp', tamanho: TAM_FILME, quadros: { f0: quadroF(0), f1: quadroF(32), f2: quadroF(64) } });
const manifesto = (id: string, comFilme: boolean | Record<string, unknown> = true) => ({
  versao: 2,
  lutador: id,
  imagens: ['atlas-0.webp', 'atlas-1.webp'],
  tamanho: TAM_ATLAS,
  alturaRef: 20,
  quadros: { idle0: { ...quadro(0), p: 0 }, guard: { ...quadro(0), p: 0 }, punch: { ...quadro(10), p: 1 } },
  ...(comFilme === false ? {} : { filme: comFilme === true ? filmeOk() : comFilme }),
});

type Opcoes = { falhaFilme?: boolean; tamanhoFilme?: [number, number]; segurarFilme?: boolean };
function leitor(o: Opcoes = {}) {
  const imagens: string[] = [];
  const prebuscas: string[] = [];
  let soltar: (() => void) | null = null;
  const l: LeitorDeRecursos = {
    async json(url) {
      throw new ErroDeAsset(`json inesperado ${url}`, url);
    },
    async imagem(url) {
      imagens.push(url);
      if (/filme\.webp$/.test(url)) {
        if (o.segurarFilme) await new Promise<void>((r) => (soltar = r));
        if (o.falhaFilme) throw new ErroDeAsset(`404 ${url}`, url);
        const [width, height] = o.tamanhoFilme ?? TAM_FILME;
        return { width, height, url } as unknown as ImagemCarregada;
      }
      return { width: TAM_ATLAS[0], height: TAM_ATLAS[1], url } as unknown as ImagemCarregada;
    },
    async prebuscar(url) {
      prebuscas.push(url);
    },
  };
  return { l, imagens, prebuscas, filmesPedidos: () => imagens.filter((u) => /filme\.webp$/.test(u)), liberarSegurado: () => soltar?.() };
}

const atlasDe = (id: string, comFilme: boolean | Record<string, unknown> = true) => new AtlasLutador(id, validarManifesto(manifesto(id, comFilme), `${id}/atlas.json`), '/');
function gerenciador(ids: string[], o: Opcoes = {}, fixos: string[] = []) {
  const r = leitor(o);
  const atlas = new Map(ids.map((id) => [id, atlasDe(id)]));
  const g = new GerenciadorDeArte({ leitor: r.l, baseUrl: '/', atlas, cenarios: new Map(), preferidos: fixos, politica: 'fixa' });
  return { g, r, atlas };
}

afterEach(() => vi.restoreAllMocks());

describe('bloco `filme` do atlas.json: validação', () => {
  it('aceita o bloco e o entrega no manifesto, com os quadros de painel', () => {
    const m = validarManifesto(manifesto('hayato'), 'hayato/atlas.json');
    expect(m.filme?.imagem).toBe('filme.webp');
    expect(m.filme?.tamanho).toEqual(TAM_FILME);
    expect(Object.keys(m.filme?.quadros ?? {})).toEqual(['f0', 'f1', 'f2']);
    expect(m.filme?.quadros['f1']?.painel).toBe(true);
    // o tamanho do atlas e as páginas dele não mudam por causa do filme
    expect(m.tamanho).toEqual(TAM_ATLAS);
    expect(m.imagens).toEqual(['atlas-0.webp', 'atlas-1.webp']);
  });

  it('sem o bloco, o manifesto antigo segue valendo e `filme` fica ausente', () => {
    const m = validarManifesto(manifesto('caio', false), 'caio/atlas.json');
    expect(m).not.toHaveProperty('filme');
  });

  it('a conversão para o formato interno não carrega o filme (as poses são montadas à parte)', () => {
    const v1 = paraManifestoV1(validarManifesto(manifesto('hayato'), 'a.json'));
    expect(Object.keys(v1.quadros)).toEqual(['idle0', 'guard', 'punch']);
  });

  const filmeCom = (troca: Record<string, unknown>) => ({ ...filmeOk(), ...troca });
  it.each([
    ['filme que não é objeto', 'filme.webp'],
    ['imagem com pasta', filmeCom({ imagem: '../filme.webp' })],
    ['imagem ausente', filmeCom({ imagem: undefined })],
    ['imagem igual a uma página do atlas', filmeCom({ imagem: 'atlas-1.webp' })],
    ['tamanho fracionário', filmeCom({ tamanho: [96.5, 64] })],
    ['tamanho vazio', filmeCom({ tamanho: [0, 64] })],
    ['tamanho que não é par', filmeCom({ tamanho: [96] })],
    ['sem quadros', filmeCom({ quadros: {} })],
    ['nome fora de f0..f5', filmeCom({ quadros: { f6: quadroF(0) } })],
    ['nome comum do atlas', filmeCom({ quadros: { idle0: quadroF(0) } })],
    ['quadro sem painel', filmeCom({ quadros: { f0: { x: 0, y: 0, w: 30, h: 30, ax: 15 } } })],
    ['quadro com painel falso', filmeCom({ quadros: { f0: { ...quadroF(0), painel: false } } })],
    ['quadro com página p=1', filmeCom({ quadros: { f0: { ...quadroF(0), p: 1 } } })],
    ['quadro que sai da página pela direita', filmeCom({ quadros: { f0: quadroF(80) } })],
    ['quadro que sai da página por baixo', filmeCom({ quadros: { f0: quadroF(0, 40) } })],
    ['quadro com x negativo', filmeCom({ quadros: { f0: quadroF(-1) } })],
  ])('rejeita: %s', (_n, filme) => {
    expect(() => validarManifesto({ ...manifesto('x', false), filme }, 'x/atlas.json')).toThrow(ErroDeAsset);
  });

  it('rejeita um quadro do filme com o mesmo nome de um quadro do atlas', () => {
    const base = manifesto('x', false);
    const m = { ...base, quadros: { ...base.quadros, f0: { ...quadro(0), p: 0 } }, filme: filmeOk() };
    expect(() => validarManifesto(m, 'x/atlas.json')).toThrow(/repete/);
  });
});

describe('HAYATO real: public/assets/lutadores/hayato', () => {
  const pasta = 'public/assets/lutadores/hayato';
  const bruto = JSON.parse(readFileSync(`${pasta}/atlas.json`, 'utf8')) as unknown;

  it('o atlas.json declara a folha FILME 1920x1280 com f0..f5 de painel, fora de `imagens`', () => {
    const m = validarManifesto(bruto, 'hayato/atlas.json');
    expect(m.imagens).toEqual(['atlas-0.webp', 'atlas-1.webp']);
    expect(m.tamanho).toEqual([2048, 1536]);
    expect(m.filme?.imagem).toBe('filme.webp');
    expect(m.filme?.tamanho).toEqual([1920, 1280]);
    expect(Object.keys(m.filme?.quadros ?? {})).toEqual(['f0', 'f1', 'f2', 'f3', 'f4', 'f5']);
    expect(Object.values(m.filme?.quadros ?? {}).every((q) => q.painel === true)).toBe(true);
  });

  it('as poses f0..f5 existem desde o boot, com `painel`, e a imagem só chega pelo carregarFilme', async () => {
    const a = new AtlasLutador('hayato', validarManifesto(bruto, 'hayato/atlas.json'), '/');
    const poses = a.poses();
    for (const n of ['f0', 'f1', 'f2', 'f3', 'f4', 'f5']) expect(poses[n]?.painel).toBe(true);
    expect(poses['idle0']).not.toHaveProperty('painel');
    const f2 = poses['f2'];
    expect(f2).toMatchObject({ x: 1053, y: 5, w: 802, h: 630, ax: 401 });
    expect(a.imagemDe(f2 as never)).toBeNull();
  });

  it('o arquivo filme.webp é WebP 1920x1280 e pesa o combinado (~433 KB, bem abaixo de 0,8 MiB)', () => {
    const b = readFileSync(`${pasta}/filme.webp`);
    expect(b.subarray(0, 4).toString('latin1')).toBe('RIFF');
    expect(b.subarray(8, 12).toString('latin1')).toBe('WEBP');
    expect(b.subarray(12, 16).toString('latin1')).toBe('VP8X');
    expect(1 + b.readUIntLE(24, 3)).toBe(1920);
    expect(1 + b.readUIntLE(27, 3)).toBe(1280);
    const kb = statSync(`${pasta}/filme.webp`).size / 1024;
    expect(kb).toBeGreaterThan(400);
    expect(kb).toBeLessThan(0.8 * 1024);
  });
});

describe('AtlasLutador: a folha FILME é uma página à parte', () => {
  it('carregarImagens e prebuscarImagens nunca pedem a FILME; só o atlas', async () => {
    const r = leitor();
    const a = atlasDe('hayato');
    await a.prebuscarImagens(r.l);
    expect(r.prebuscas.map((u) => u.split('/').pop())).toEqual(['atlas-0.webp', 'atlas-1.webp']);
    await a.carregarImagens(r.l);
    expect(r.filmesPedidos()).toEqual([]);
    expect(a.pronta).toBe(true);
    expect(a.paginasCarregadas).toBe(2);
    expect(a.filmePronto).toBe(false);
  });

  it('carregarFilme põe a imagem em f0..f5 (e só nelas), sem silhueta e sem mexer nas páginas do atlas', async () => {
    const r = leitor();
    const a = atlasDe('hayato');
    await a.carregarImagens(r.l);
    const poses = a.poses();
    const f0 = poses['f0'] as never;
    expect(a.imagemDe(f0)).toBeNull();
    expect(await a.carregarFilme(r.l)).toBe(true);
    expect(a.filmePronto).toBe(true);
    expect((a.imagemDe(f0) as unknown as { url: string }).url).toBe('/assets/lutadores/hayato/filme.webp');
    expect(a.silhuetaDe(f0)).toBeNull();
    expect((a.imagemDe(poses['punch'] as never) as unknown as { url: string }).url).toContain('atlas-1.webp');
    expect(a.paginasCarregadas).toBe(2);
  });

  it('carregarFilme é idempotente e chamadas simultâneas dividem uma só carga', async () => {
    const r = leitor();
    const a = atlasDe('hayato');
    const [x, y] = await Promise.all([a.carregarFilme(r.l), a.carregarFilme(r.l)]);
    await a.carregarFilme(r.l);
    expect([x, y]).toEqual([true, true]);
    expect(r.filmesPedidos()).toHaveLength(1);
  });

  it('liberarFilme solta só a FILME; liberar() solta tudo; as poses f0..f5 continuam existindo', async () => {
    const r = leitor();
    const a = atlasDe('hayato');
    await a.carregarImagens(r.l);
    await a.carregarFilme(r.l);
    a.liberarFilme();
    expect(a.filmePronto).toBe(false);
    expect(a.pronta).toBe(true);
    expect(a.imagemDe(a.poses()['f2'] as never)).toBeNull();
    await a.carregarFilme(r.l);
    a.liberar();
    expect(a.pronta).toBe(false);
    expect(a.filmePronto).toBe(false);
    expect(a.poses()['f2']?.painel).toBe(true);
  });

  it('lutador sem filme: carregarFilme devolve false sem pedir nada', async () => {
    const r = leitor();
    const a = atlasDe('caio', false);
    expect(a.temFilme).toBe(false);
    expect(await a.carregarFilme(r.l)).toBe(false);
    expect(r.imagens).toEqual([]);
    expect(a.poses()).not.toHaveProperty('f0');
  });

  it('falha de carga cai na pose de reserva sem lançar: devolve false, imagem null, e uma nova tentativa funciona', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const ruim = leitor({ falhaFilme: true });
    const a = atlasDe('hayato');
    await a.carregarImagens(ruim.l);
    await expect(a.carregarFilme(ruim.l)).resolves.toBe(false);
    expect(a.filmePronto).toBe(false);
    expect(a.imagemDe(a.poses()['f0'] as never)).toBeNull();
    expect(a.pronta).toBe(true);
    expect(aviso).toHaveBeenCalledTimes(1);
    await expect(a.carregarFilme(leitor().l)).resolves.toBe(true); // a falha não fica gravada
  });

  it('imagem de outro tamanho é recusada como falha (o painel não desenha com recortes errados)', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const a = atlasDe('hayato');
    await expect(a.carregarFilme(leitor({ tamanhoFilme: [2048, 1536] }).l)).resolves.toBe(false);
    expect(a.filmePronto).toBe(false);
  });

  it('soltar a FILME enquanto ela baixa não a ressuscita quando a rede responde', async () => {
    const r = leitor({ segurarFilme: true });
    const a = atlasDe('hayato');
    const carga = a.carregarFilme(r.l);
    await Promise.resolve();
    a.liberarFilme();
    r.liberarSegurado();
    await expect(carga).resolves.toBe(false);
    expect(a.filmePronto).toBe(false);
  });
});

describe('GerenciadorDeArte: ciclo da luta com a FILME', () => {
  it('garantir, pedir e prebuscar não tocam a FILME: nem baixam, nem decodificam', async () => {
    const { g, r } = gerenciador(['hayato', 'caio']);
    g.prebuscar({ lutadores: ['hayato', 'caio'] });
    await g.garantir({ lutadores: ['hayato', 'caio'] });
    g.pedir('hayato');
    await new Promise((res) => setTimeout(res, 0));
    expect([...r.prebuscas, ...r.imagens].some((u) => /filme/.test(u))).toBe(false);
    expect(g.filmesResidentes()).toEqual([]);
    expect(g.estaPronto({ lutadores: ['hayato', 'caio'] })).toBe(true); // a FILME não conta para "pronto": a VS não espera por ela
  });

  it('carga no início da luta para os 2 lutadores e liberação no fim; os atlas ficam', async () => {
    const { g, r } = gerenciador(['hayato', 'caio']);
    await g.garantir({ lutadores: ['hayato', 'caio'] });
    await g.carregarFilme(['hayato', 'caio']);
    expect(g.filmesResidentes().sort()).toEqual(['caio', 'hayato']);
    expect(r.filmesPedidos()).toHaveLength(2);
    expect(g.cargas.filmes.get('hayato')).toBe(1);
    g.soltarFilme();
    expect(g.filmesResidentes()).toEqual([]);
    expect(g.lutadoresResidentes().sort()).toEqual(['caio', 'hayato']);
  });

  it('espelho: o mesmo lutador duas vezes é uma folha só, uma requisição só', async () => {
    const { g, r } = gerenciador(['hayato']);
    await g.carregarFilme(['hayato', 'hayato']);
    expect(r.filmesPedidos()).toHaveLength(1);
    expect(g.filmesResidentes()).toEqual(['hayato']);
  });

  it(`nunca mais que ${MAX_FOLHAS_FILME} folhas por luta: o 3º pedido é ignorado`, async () => {
    const { g } = gerenciador(['a', 'b', 'c']);
    await g.carregarFilme(['a', 'b', 'c']);
    expect(g.filmesResidentes().sort()).toEqual(['a', 'b']);
  });

  it('a próxima luta solta a folha da anterior antes de carregar a sua (continua em 2 no máximo)', async () => {
    const { g } = gerenciador(['a', 'b', 'c']);
    await g.carregarFilme(['a', 'b']);
    await g.carregarFilme(['c', 'b']);
    expect(g.filmesResidentes().sort()).toEqual(['b', 'c']);
  });

  it('lutador fixo (vitrine) também perde a FILME no fim da luta, mesmo que o atlas nunca seja solto', async () => {
    const { g } = gerenciador(['hayato', 'caio'], {}, ['hayato']);
    await g.garantir({ lutadores: ['hayato', 'caio'] });
    await g.carregarFilme(['hayato', 'caio']);
    g.soltarFilme(['hayato', 'caio']);
    expect(g.filmesResidentes()).toEqual([]);
    expect(g.lutadoresResidentes()).toContain('hayato');
  });

  it('liberar o lutador (poda) leva a FILME junto', async () => {
    const { g } = gerenciador(['hayato', 'caio']);
    await g.garantir({ lutadores: ['hayato'] });
    await g.carregarFilme(['hayato']);
    g.liberarLutador('hayato');
    expect(g.filmesResidentes()).toEqual([]);
  });

  it('falha de carga não rejeita nem derruba a luta: o atlas segue pronto e o especial usa a pose de reserva', async () => {
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const { g, atlas } = gerenciador(['hayato', 'caio'], { falhaFilme: true });
    await g.garantir({ lutadores: ['hayato', 'caio'] });
    await expect(g.carregarFilme(['hayato', 'caio'])).resolves.toBeUndefined();
    expect(g.filmesResidentes()).toEqual([]);
    expect(g.cargas.filmes.size).toBe(0);
    expect(g.estaPronto({ lutadores: ['hayato', 'caio'] })).toBe(true);
    expect(atlas.get('hayato')?.imagemDe(atlas.get('hayato')?.poses()['f1'] as never)).toBeNull();
    expect(aviso).toHaveBeenCalled();
    expect(erro).not.toHaveBeenCalled();
  });

  it('id desconhecido ou sem filme é ignorado sem erro', async () => {
    const r = leitor();
    const g = new GerenciadorDeArte({ leitor: r.l, baseUrl: '/', atlas: new Map([['caio', atlasDe('caio', false)]]), cenarios: new Map() });
    await expect(g.carregarFilme(['caio', 'fantasma'])).resolves.toBeUndefined();
    expect(r.imagens).toEqual([]);
  });
});
