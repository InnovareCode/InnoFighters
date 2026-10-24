import { afterEach, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { carregarCamadasSonoras } from '../../src/audio/camadas';
import { chavesSonoras, IDENTIDADE_SONORA, TEMAS_POR_LUTADOR } from '../../src/audio/chaves';
import { INPUT_VAZIO, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
const REGRAS: Regras = { ...REGRAS_PADRAO, ritmo: {} }; // R-9: estas suites testam a Cinematica/Provocacao bloqueando de sempre (ritmo.tarja/provocacao agora vem ligado por padrao)
import { CampoDePetalas, Efeitos } from '../../src/render/efeitos';
import type { Mundo } from '../../src/ui/contexto';
import type { CenaFight } from '../../src/ui/cenas/fight';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { navegadorFalso, arteFalsa } from './_ui';

/*
 * A CENA da luta ligada às duas camadas (S4 e T3, sempre ligadas por decisão do dono): a trilha da luta (o tema do adversário), os eventos pela camada de
 * identidade e o silêncio da abertura da tarja e da sessão do especial. Com as chaves desligadas (rollback por código) a cena é a de antes.
 */
const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

function montar(c1: IdLutador = 'hayato', c2: IdLutador = 'caio', regras: Regras = REGRAS, extra: { chefe?: boolean } = {}) {
  const n = navegadorFalso({ provocacoes: 'desligadas' }, regras);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  (n.c as { entrada: unknown }).entrada = { lerP1: () => ({ ...frames.p1 }), lerP2: () => ({ ...frames.p2 }), lerMesclado: () => ({ ...frames.p1 }), fimDoTick: () => undefined };
  const game = new Game({ lutadores: prod, rng: criarRng(5) });
  const mundo = {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: arteFalsa(),
    game,
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
  n.ui.pronto(mundo);
  n.ui.set('fight', { cfg: { mode: 'versus', c1, c2, cpu: null, esquiva: regras.esquiva, ...extra } });
  const cena = n.ui.scene as unknown as CenaFight;
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  const ateLutar = (): void => {
    for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
    for (let i = 0; i < 5; i++) update();
  };
  const soltarEspecial = (): void => {
    game.p1.en = 100;
    game.p1.x = 200;
    game.p2.x = 800;
    frames.p1 = { ...INPUT_VAZIO, sp: true };
    update();
    frames.p1 = { ...INPUT_VAZIO };
  };
  const musicas = (): unknown[] => n.audio.chamadas.filter(([nome]) => nome === 'startMusic').map(([, k]) => k);
  const sintese = (): number => n.audio.chamadas.filter(([nome]) => nome === 'tone' || nome === 'noise').length;
  return { ...n, game, cena, update, ateLutar, soltarEspecial, musicas, sintese };
}

afterEach(() => {
  chavesSonoras.identidade = IDENTIDADE_SONORA;
  chavesSonoras.temas = TEMAS_POR_LUTADOR;
});

describe('rollback por código (chaves desligadas): a cena é a de antes', () => {
  beforeEach(() => {
    chavesSonoras.identidade = false;
    chavesSonoras.temas = false;
  });
  it('a música da luta é a `fight`, em qualquer modo e contra qualquer adversário', () => {
    for (const c2 of ['caio', 'baatar', 'zenon'] as const) expect(montar('hayato', c2).musicas(), c2).toEqual(['fight']);
  });

  it('a abertura da tarja toca (o grito e a conjuração do evento são os genéricos de hoje)', () => {
    const t = montar();
    t.ateLutar();
    t.soltarEspecial();
    const antes = t.sintese();
    t.cena.draw();
    expect(t.sintese()).toBeGreaterThan(antes);
  });
});

describe('temas ligados (o padrão): o tema do ADVERSÁRIO', () => {
  beforeAll(async () => {
    expect(await carregarCamadasSonoras({ identidade: true, temas: true })).toBe(true);
  });

  it('a luta começa com o tema do c2 (rival, VERSUS, treino...); o ZENON, com a valsa; sem `regras.temasMusicais` (`?expansao=4`), a `fight`', () => {
    expect(montar('hayato', 'caio').musicas()).toEqual(['tema:caio']);
    expect(montar('caio', 'hayato').musicas()).toEqual(['tema:hayato']);
    expect(montar('hayato', 'hayato').musicas()).toEqual(['tema:hayato']); // espelho: o tema do lutador
    expect(montar('hayato', 'zenon').musicas()).toEqual(['chefe']);
    expect(montar('hayato', 'caio', { ...REGRAS, temasMusicais: false }).musicas()).toEqual(['fight']);
  });

  it('o chefão ZENON continua com a valsa (e a troca de fase segue pelo evento `fase-chefe`, que já chama `musicaDaFase(2)`)', () => {
    expect(montar('hayato', 'zenon', REGRAS, { chefe: true }).musicas()).toEqual(['chefe']);
  });
});

describe('identidade ligada (o padrão): a abertura da tarja cala', () => {
  beforeAll(async () => {
    await carregarCamadasSonoras({ identidade: true });
  });

  it('o `draw` da cinemática não toca a abertura (o som do especial já veio no evento); sem a chave, toca', () => {
    chavesSonoras.identidade = false;
    const desligada = montar();
    desligada.ateLutar();
    desligada.soltarEspecial();
    const a0 = desligada.sintese();
    desligada.cena.draw();
    expect(desligada.sintese() - a0).toBeGreaterThan(0);

    chavesSonoras.identidade = true; // o padrão (o describe de rollback acima o desliga só dentro dele)
    const ligada = montar();
    ligada.ateLutar();
    ligada.soltarEspecial();
    const b0 = ligada.sintese();
    ligada.cena.draw();
    expect(ligada.sintese() - b0).toBe(0);
  });
});

describe('identidade ligada: o som de acerto da sessão do especial cala (a estampa da assinatura já toca no evento)', () => {
  beforeAll(async () => {
    await carregarCamadasSonoras({ identidade: true });
  });

  /** Solta o especial do HAYATO (projétil) e anda só com `update` (sem `draw`: a abertura da tarja soa no desenho) até o projétil acertar; devolve as chamadas de síntese. */
  const ateOAcerto = (ligada: boolean): number => {
    chavesSonoras.identidade = ligada;
    const t = montar();
    t.ateLutar();
    t.soltarEspecial();
    const antes = t.sintese();
    let acertou = false;
    for (let i = 0; i < 400 && !acertou; i++) {
      t.update();
      acertou = t.game.events.some((e) => e.tipo === 'hit' && e.especial === true);
    }
    expect(acertou).toBe(true);
    return t.sintese() - antes;
  };

  it('sem a chave a sessão toca o acerto; com a chave, nada de síntese vem da sessão', () => {
    expect(ateOAcerto(false)).toBeGreaterThan(0);
    expect(ateOAcerto(true)).toBe(0);
  });
});
