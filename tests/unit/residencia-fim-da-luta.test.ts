import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO } from '../../src/meta';
import { CampoDePetalas, Efeitos } from '../../src/render/efeitos';
import type { CenaFight } from '../../src/ui/cenas/fight';
import type { Mundo } from '../../src/ui/contexto';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { arteFalsa, navegadorFalso } from './_ui';

/*
 * O gancho do FIM DA LUTA (L4, spec da residência §2.2): no 1º tick com `matchend`, vencedor definido e o filme parado, a FILME sai e o `jp` começa a voltar em segundo plano.
 * Uma vez por luta; nunca no meio de um filme; só na política 'por-peso'. Motor de verdade; só a arte e o áudio são falsos.
 */
const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arteDoElenco = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte: arteDoElenco }])) as unknown as Elenco;

function montar(politica: 'fixa' | 'por-peso') {
  const n = navegadorFalso({ provocacoes: 'desligadas' }, REGRAS_PADRAO);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  (n.c as { entrada: unknown }).entrada = { lerP1: () => ({ ...frames.p1 }), lerP2: () => ({ ...frames.p2 }), lerMesclado: () => ({ ...frames.p1 }), fimDoTick: () => undefined };
  const game = new Game({ lutadores: prod, rng: criarRng(5) });
  const chamadas: string[] = [];
  const arte = arteFalsa({
    politica,
    soltarFilme: () => void chamadas.push('soltarFilme'),
    preferir: (p: unknown) => void chamadas.push(`preferir ${JSON.stringify(p)}`),
  });
  n.ui.pronto({
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte,
    game,
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo);
  const entrar = (): CenaFight => {
    n.ui.set('fight', { cfg: { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: false } });
    return n.ui.scene as unknown as CenaFight;
  };
  const cena = entrar();
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  const ateLutar = (): void => {
    for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
    update(5);
  };
  /** O fim da luta, forçado: o gancho só olha `phase` e `matchWinner`. */
  const terminar = (): void => {
    game.phase = 'matchend';
    game.matchWinner = 0;
  };
  chamadas.length = 0;
  return { cena, game, chamadas, update, ateLutar, terminar, entrar };
}

const FIM = ['soltarFilme', `preferir ${JSON.stringify({ cenarios: ['jp'] })}`];

describe('gancho do fim da luta (residência por peso)', () => {
  it('no 1º tick do matchend com vencedor: solta a FILME e pede o jp em segundo plano; uma vez só', () => {
    const t = montar('por-peso');
    t.ateLutar();
    expect(t.chamadas.filter((c) => c.startsWith('preferir') || c === 'soltarFilme')).toEqual([]); // durante a luta, nada
    t.terminar();
    t.update();
    expect(t.chamadas.filter((c) => c.startsWith('preferir') || c === 'soltarFilme')).toEqual(FIM);
    t.update(30);
    expect(t.chamadas.filter((c) => c.startsWith('preferir') || c === 'soltarFilme')).toEqual(FIM);
  });

  it('sem vencedor (matchWinner nulo) ou fora do matchend não dispara', () => {
    const t = montar('por-peso');
    t.ateLutar();
    t.game.phase = 'matchend';
    t.game.matchWinner = null;
    t.update(3);
    expect(t.chamadas).not.toContain('soltarFilme');
    t.game.phase = 'ko';
    t.game.matchWinner = 0;
    t.update(3);
    expect(t.chamadas).not.toContain('soltarFilme');
  });

  it('nunca no meio de um filme: espera o último quadro e dispara no tick seguinte', () => {
    const t = montar('por-peso');
    t.ateLutar();
    let ativo = true;
    Object.defineProperty(t.cena.filme, 'ativo', { get: () => ativo, configurable: true });
    t.terminar();
    t.update(5);
    expect(t.chamadas).not.toContain('soltarFilme');
    ativo = false;
    t.update();
    expect(t.chamadas.filter((c) => c === 'soltarFilme')).toHaveLength(1);
  });

  it('a flag zera no `enter`: a luta seguinte (revanche) dispara de novo, uma vez', () => {
    const t = montar('por-peso');
    t.ateLutar();
    t.terminar();
    t.update();
    expect(t.chamadas.filter((c) => c === 'soltarFilme')).toHaveLength(1);
    t.chamadas.length = 0;
    t.entrar();
    t.game.phase = 'matchend';
    t.game.matchWinner = 1;
    t.update(2);
    expect(t.chamadas.filter((c) => c === 'soltarFilme')).toHaveLength(1);
  });

  it("política 'fixa': nada acontece (o `exit` já solta a FILME, como sempre)", () => {
    const t = montar('fixa');
    t.ateLutar();
    t.terminar();
    t.update(5);
    expect(t.chamadas).toEqual([]);
  });
});
