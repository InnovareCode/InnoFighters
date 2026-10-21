import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { DURACAO_COMPLETA, DURACAO_CURTA, TICKS_DA_SAIDA_AO_PULAR } from '../../src/render/cinematica';
import type { Mundo } from '../../src/ui/contexto';
import type { CenaFight } from '../../src/ui/cenas/fight';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { navegadorFalso } from './_ui';

/*
 * A CENA da luta com a cinemática: enquanto ela roda, a cena NÃO chama `game.update` (como a pausa) — o motor não congela, a cena só não o
 * chama. Elenco de produção (os especiais dos 9 existem nele) e um `Game` de verdade; só a arte e o áudio são falsos.
 */
const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

function montar(settings: Partial<Configuracoes> = {}, regras: Regras = REGRAS_PADRAO, c1: IdLutador = 'hayato', c2: IdLutador = 'caio', mode: 'versus' | 'training' = 'versus') {
  const n = navegadorFalso(settings, regras);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  const entrada = {
    lerP1: () => ({ ...frames.p1 }),
    lerP2: () => ({ ...frames.p2 }),
    lerMesclado: () => ({ ...frames.p1 }),
    fimDoTick: () => undefined,
  };
  (n.c as { entrada: unknown }).entrada = entrada;
  const game = new Game({ lutadores: prod, rng: criarRng(5) });
  const mundo = {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: { pedir: () => undefined, usar: () => undefined, estaPronto: () => true, prebuscar: () => undefined },
    game,
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
  n.ui.pronto(mundo);
  n.ui.set('fight', { cfg: { mode, c1, c2, cpu: null, esquiva: regras.esquiva } });
  const cena = n.ui.scene as unknown as CenaFight;
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  /** Anda até a fase de luta. */
  const ateLutar = (): void => {
    for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
    for (let i = 0; i < 5; i++) update();
  };
  /** Solta o ESPECIAL do P1 (borda de 1 tick) e devolve os eventos desse tick. */
  const soltarEspecial = (): EventoLuta[] => {
    game.p1.en = 100;
    game.p1.x = 200;
    game.p2.x = 800;
    frames.p1 = { ...INPUT_VAZIO, sp: true };
    update();
    frames.p1 = { ...INPUT_VAZIO };
    return [...game.events];
  };
  return { ...n, game, cena, frames, update, ateLutar, soltarEspecial };
}

describe('cena da luta: a cinemática congela a CENA, não o motor', () => {
  it('COMPLETA (o padrão): game.tick não anda por 48 update() e volta a andar no 49º', () => {
    const t = montar();
    t.ateLutar();
    const ev = t.soltarEspecial();
    expect(ev.some((e) => e.tipo === 'special')).toBe(true);
    expect(t.cena.cine.ativa).toBe(true);
    expect(t.cena.cine.estado?.modo).toBe('completa');
    const tick = t.game.tick;
    for (let i = 0; i < DURACAO_COMPLETA; i++) {
      expect(t.cena.cine.ativa, `update ${i + 1}`).toBe(true);
      t.update();
      expect(t.game.tick, `update ${i + 1}`).toBe(tick);
    }
    expect(t.cena.cine.ativa).toBe(false);
    t.update();
    expect(t.game.tick).toBe(tick + 1);
  });

  it("CURTA dura 20 updates; 'desligada' anda no 1º update e nem abre a cinemática", () => {
    const curta = montar({ cinematica: 'curta' });
    curta.ateLutar();
    curta.soltarEspecial();
    const tick = curta.game.tick;
    curta.update(DURACAO_CURTA);
    expect(curta.game.tick).toBe(tick);
    expect(curta.cena.cine.ativa).toBe(false);
    curta.update();
    expect(curta.game.tick).toBe(tick + 1);

    const off = montar({ cinematica: 'desligada' });
    off.ateLutar();
    const ev = off.soltarEspecial();
    expect(ev.some((e) => e.tipo === 'special')).toBe(true);
    expect(off.cena.cine.ativa).toBe(false);
    const t0 = off.game.tick;
    off.update();
    expect(off.game.tick).toBe(t0 + 1);
  });

  it('regras sem cinemática (?expansao=4): nenhuma, mesmo com a preferência COMPLETA salva', () => {
    const t = montar({ cinematica: 'completa' }, { ...REGRAS_PADRAO, cinematica: false });
    t.ateLutar();
    t.soltarEspecial();
    expect(t.cena.cine.ativa).toBe(false);
  });

  it('qualquer botão de ataque pula: a luta volta em no máximo 6 updates', () => {
    for (const botao of ['lp', 'hp', 'lk', 'hk', 'sp'] as const) {
      const t = montar();
      t.ateLutar();
      t.soltarEspecial();
      t.update(10);
      expect(t.cena.cine.ativa).toBe(true);
      t.frames.p1 = { ...INPUT_VAZIO, [botao]: true };
      t.update();
      t.frames.p1 = { ...INPUT_VAZIO };
      let n = 1;
      while (t.cena.cine.ativa && n < 20) {
        t.update();
        n++;
      }
      expect(n, botao).toBeLessThanOrEqual(TICKS_DA_SAIDA_AO_PULAR + 1);
    }
  });

  it('segurar a direção não pula (só os botões de ataque)', () => {
    const t = montar();
    t.ateLutar();
    t.soltarEspecial();
    t.frames.p1 = { ...INPUT_VAZIO, left: true, right: true, down: true, spSeg: true };
    t.update(30);
    expect(t.cena.cine.ativa).toBe(true);
  });

  it('a pausa congela a cinemática também, e a música cai a 50% durante ela e volta (na pausa e no fim)', () => {
    const t = montar({ music: 0.4 });
    t.ateLutar();
    t.soltarEspecial();
    const vols = (): number[] => t.audio.chamadas.filter(([n]) => n === 'setMusicVol').map(([, v]) => v as number);
    expect(vols().at(-1)).toBeCloseTo(0.2, 5);
    t.update(5);
    const estado = t.cena.cine.estado?.tick;
    t.cena.pause();
    expect(vols().at(-1)).toBeCloseTo(0.4, 5);
    t.update(10);
    expect(t.cena.cine.estado?.tick).toBe(estado);
    t.cena.key('Escape'); // continuar
    expect(vols().at(-1)).toBeCloseTo(0.2, 5);
    t.update(DURACAO_COMPLETA);
    expect(t.cena.cine.ativa).toBe(false);
    expect(vols().at(-1)).toBeCloseTo(0.4, 5);
  });

  it('dois especiais no mesmo tick: o 2º entra na fila, sai CURTO, e o motor segue parado até os dois acabarem', () => {
    const t = montar({}, REGRAS_PADRAO, 'hayato', 'caio');
    t.ateLutar();
    t.game.p2.en = 100;
    t.game.p2.startMove('sFire', t.game);
    t.soltarEspecial();
    expect(t.cena.cine.naFila + (t.cena.cine.ativa ? 1 : 0)).toBeGreaterThanOrEqual(1);
    const tick = t.game.tick;
    let n = 0;
    while (t.cena.cine.ativa && n < 200) {
      t.update();
      n++;
      expect(t.game.tick).toBe(tick);
    }
    expect(n).toBeGreaterThanOrEqual(DURACAO_COMPLETA);
    expect(n).toBeLessThanOrEqual(DURACAO_COMPLETA + DURACAO_CURTA);
  });

  it('o treino também tem cinemática (a preferência vale em todo modo)', () => {
    const t = montar({}, REGRAS_PADRAO, 'hayato', 'caio', 'training');
    t.ateLutar();
    t.soltarEspecial();
    expect(t.cena.cine.ativa).toBe(true);
  });

  it('o ConfigPartida da cena liga a esquiva a partir das regras', () => {
    expect(montar().game.esquivaLigada).toBe(true);
    expect(montar({}, { ...REGRAS_PADRAO, esquiva: false }).game.esquivaLigada).toBe(false);
  });

  it('desenhar durante a cinemática e depois dela não quebra, e a cinemática desenha por cima do mundo', () => {
    const t = montar();
    t.ateLutar();
    t.soltarEspecial();
    expect(() => t.cena.draw()).not.toThrow();
    const antes = t.g.chamadas.length;
    t.update(20);
    t.cena.draw();
    expect(t.g.chamadas.length).toBeGreaterThan(antes);
    t.update(40);
    expect(() => t.cena.draw()).not.toThrow();
  });
});
