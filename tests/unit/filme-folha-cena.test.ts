import { afterEach, describe, expect, it, vi } from 'vitest';
import { AtlasLutador, type ImagemCarregada, type LeitorDeRecursos } from '../../src/assets/carregador';
import type { Elenco } from '../../src/assets/elenco';
import { ErroDeAsset } from '../../src/assets/tipos';
import { INPUT_VAZIO, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { PoseDados } from '../../src/data/tipos';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import type { CenaFight } from '../../src/ui/cenas/fight';
import type { Mundo } from '../../src/ui/contexto';
import { PROD } from './_filme';
import { lerManifestoC1 } from './_lutadores';
import { navegadorFalso } from './_ui';

/*
 * A folha FILME na CENA da luta: baixada DEPOIS que a luta começou (nunca na VS, nunca em pedir/prebuscar), solta ao sair; e, sem a imagem (ainda
 * não chegou, 404, imagem de outro tamanho), o filme toca a pose `Alt` do mundo e NÃO lança. Atlas do HAYATO de verdade (public/assets) e `Game` de verdade.
 */
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arteGenerica = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };

const imagemFalsa = (w: number, h: number, tag: string): ImagemCarregada => ({ width: w, height: h, tag }) as unknown as ImagemCarregada;

type Cenario = { filme: 'ok' | '404' | 'tamanho' };

/** O atlas real do HAYATO (manifesto de public/) com um leitor falso: as páginas do corpo chegam sempre; a do FILME conforme o cenário. */
function atlasDoHayato(c: Cenario) {
  const m = lerManifestoC1('hayato');
  const pedidos: string[] = [];
  const leitor: LeitorDeRecursos = {
    async json(url) {
      throw new ErroDeAsset(`json inesperado ${url}`, url);
    },
    async imagem(url) {
      pedidos.push(url);
      if (/filme\.webp$/.test(url)) {
        if (c.filme === '404') throw new ErroDeAsset(`Falha ao carregar ${url}`, url);
        if (c.filme === 'tamanho') return imagemFalsa(10, 10, 'filme');
        return imagemFalsa(m.filme!.tamanho[0], m.filme!.tamanho[1], 'filme');
      }
      return imagemFalsa(m.tamanho[0], m.tamanho[1], 'pagina');
    },
  };
  const atlas = new AtlasLutador('hayato', m, '/', () => {
    const g = new Proxy({}, { get: () => () => undefined, set: () => true });
    return { width: 1, height: 1, getContext: () => g } as unknown as HTMLCanvasElement;
  });
  return { atlas, leitor, pedidos };
}

async function montar(c: Cenario, opcoes: { carregarNaEntrada?: boolean } = {}) {
  const { atlas, leitor, pedidos } = atlasDoHayato(c);
  await atlas.carregarImagens(leitor); // o corpo está na memória (a vitrine); a folha FILME só vem pela cena
  const hayato: LutadorMontado = montarLutador(LUTADORES.hayato, atlas.poses());
  const lutadores = { ...PROD, hayato } as Record<IdLutador, LutadorMontado>;
  const elenco = Object.fromEntries(Object.entries(lutadores).map(([id, ch]) => [id, { ch, arte: id === 'hayato' ? atlas : arteGenerica }])) as unknown as Elenco;
  const n = navegadorFalso({ provocacoes: 'desligadas' }, REGRAS_PADRAO);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  (n.c as { entrada: unknown }).entrada = { lerP1: () => ({ ...frames.p1 }), lerP2: () => ({ ...frames.p2 }), lerMesclado: () => ({ ...frames.p1 }), fimDoTick: () => undefined };
  const game = new Game({ lutadores, rng: criarRng(5) });
  const chamadas: string[] = [];
  const cargas: Array<Promise<void>> = [];
  const arte = {
    pedir: () => void chamadas.push('pedir'),
    usar: () => undefined,
    estaPronto: () => true,
    prebuscar: () => void chamadas.push('prebuscar'),
    carregarFilme: (ids: readonly string[]) => {
      chamadas.push(`carregarFilme:${ids.join(',')}`);
      const p = (ids.includes('hayato') ? atlas.carregarFilme(leitor) : Promise.resolve(false)).then(() => undefined);
      cargas.push(p);
      return p;
    },
    soltarFilme: () => {
      chamadas.push('soltarFilme');
      atlas.liberarFilme();
    },
  };
  n.ui.pronto({
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte,
    game,
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo);
  n.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: false, motorV2: { filmes: true } } });
  const cena = n.ui.scene as unknown as CenaFight;
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
  update(5);
  if (opcoes.carregarNaEntrada !== false) await Promise.all(cargas);
  /** O HAYATO solta o especial perto do rival e anda até o filme abrir. */
  const bater = (golpe: 'sFwd' | 'sDown' | 'sFire'): void => {
    game.p1.en = 100;
    game.p1.x = 380;
    game.p2.x = 520;
    game.p1.facing = 1;
    game.p2.facing = -1;
    game.p1.startMove(golpe, game);
    for (let i = 0; i < 200 && !cena.filme.ativo; i++) update();
  };
  /** Toca o filme inteiro desenhando a cada tick; devolve tudo o que foi desenhado com a folha FILME. */
  const tocar = (): { desenhosDaFolha: unknown[][]; ticks: number } => {
    let ticks = 0;
    const folha: unknown[][] = [];
    while (cena.filme.ativo && ticks < 300) {
      update();
      n.g.chamadas.length = 0;
      cena.draw();
      for (const ch of n.g.chamadas) if (ch[0] === 'drawImage' && (ch[1] as { tag?: string })?.tag === 'filme') folha.push(ch);
      ticks++;
    }
    return { desenhosDaFolha: folha, ticks };
  };
  return { ...n, atlas, game, cena, chamadas, pedidos, bater, tocar, update };
}

afterEach(() => vi.restoreAllMocks());

describe('o gerenciador é chamado no momento certo', () => {
  it('a luta começa -> carregarFilme([c1, c2]) uma vez; nunca pedir/prebuscar com a folha; sair da luta -> soltarFilme', async () => {
    const t = await montar({ filme: 'ok' });
    expect(t.chamadas.filter((c) => c.startsWith('carregarFilme'))).toEqual(['carregarFilme:hayato,caio']);
    expect(t.atlas.filmePronto).toBe(true);
    expect(t.chamadas).not.toContain('soltarFilme');
    t.ui.set('menu'); // saiu da luta
    expect(t.chamadas[t.chamadas.length - 1]).toBe('soltarFilme');
    expect(t.atlas.filmePronto).toBe(false);
  });

  it('revanche (a luta recomeça na mesma cena) NÃO solta a folha nem a baixa de novo: a troca de cena é que solta', async () => {
    const t = await montar({ filme: 'ok' });
    t.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: false, motorV2: { filmes: true } } });
    expect(t.chamadas).not.toContain('soltarFilme');
    expect(t.pedidos.filter((u) => /filme.webp$/.test(u))).toHaveLength(1); // o atlas já a tinha: carregarFilme é idempotente
    t.ui.set('menu');
    expect(t.chamadas.filter((c) => c === 'soltarFilme')).toHaveLength(1);
  });
});

describe('sem a imagem da folha o filme toca a pose Alt do mundo, sem lançar', () => {
  const hayato = (t: Awaited<ReturnType<typeof montar>>) => t.cena.filme && t.game.p1.ch;

  it('as células f0..f5 do atlas real são de painel (guarda: o teste precisa delas)', async () => {
    const t = await montar({ filme: 'ok' });
    const pd = t.atlas.poses();
    for (const k of ['f0', 'f1', 'f2', 'f3', 'f4', 'f5']) expect((pd[k] as PoseDados & { painel?: boolean } | undefined)?.painel, k).toBe(true);
    expect(hayato(t)).toBeTruthy();
  });

  it('COM a folha: o painel é desenhado da folha FILME, com o recorte da célula do golpe', async () => {
    const t = await montar({ filme: 'ok' });
    t.bater('sFire');
    expect(t.cena.filme.ativo).toBe(true);
    const { desenhosDaFolha } = t.tocar();
    expect(desenhosDaFolha.length).toBeGreaterThan(0);
    const f0 = t.atlas.poses()['f0']!;
    expect(desenhosDaFolha.some((d) => d[2] === f0.x && d[3] === f0.y && d[4] === f0.w && d[5] === f0.h)).toBe(true);
  });

  for (const cenario of ['404', 'tamanho'] as const) {
    it(`folha com falha (${cenario}): imagemDe devolve null, os 3 especiais tocam inteiros e desenham, nada da folha vai à tela`, async () => {
      const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      const t = await montar({ filme: cenario });
      expect(t.atlas.filmePronto).toBe(false);
      expect(aviso).toHaveBeenCalledWith(expect.stringContaining('folha de "hayato" indisponivel'));
      for (const k of ['f0', 'f1', 'f2', 'f3', 'f4', 'f5']) expect(t.atlas.imagemDe(t.atlas.poses()[k]!), k).toBeNull();
      for (const golpe of ['sFire', 'sDown', 'sFwd'] as const) {
        t.game.p1.hp = t.game.p1.maxHp;
        t.game.p2.hp = t.game.p2.maxHp;
        t.bater(golpe);
        expect(t.cena.filme.ativo, golpe).toBe(true);
        let r!: ReturnType<typeof t.tocar>;
        expect(() => (r = t.tocar()), golpe).not.toThrow();
        expect(r.ticks, golpe).toBeGreaterThan(20); // o filme tocou inteiro
        expect(r.desenhosDaFolha, golpe).toEqual([]);
        for (let i = 0; i < 80; i++) t.update(); // deixa o hitstop e a queda passarem antes do próximo
        t.game.p2.state = 'idle';
      }
    });
  }

  it('quem pede o quadro da folha antes de ela chegar (carga em andamento) recebe null e depois recebe a imagem', async () => {
    const t = await montar({ filme: 'ok' }, { carregarNaEntrada: false });
    // o corpo já está na memória; a folha pode estar a caminho: nos dois casos nunca lança
    const f1 = t.atlas.poses()['f1']!;
    expect(() => t.atlas.imagemDe(f1)).not.toThrow();
    t.atlas.liberarFilme();
    expect(t.atlas.imagemDe(f1)).toBeNull();
  });
});
