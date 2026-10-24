import { describe, expect, it } from 'vitest';
import { cena, doTipo, soltar, type Cena } from './_filme';

/*
 * Defeito da Íris (7f62baf): `modoDoFilme` lia `game.matchWinner`, que o motor só preenche em `endRound()` (~100 ticks DEPOIS do acerto),
 * então o KO que decide a luta abria filme CURTO. Correção: `ko.decideALuta` e `filme.decideALuta` saem calculados NO TICK do KO.
 * Aqui `ajustes.rounds = 2` (`cena`): o vencedor com 1 round fecha a luta; com 0, só o round.
 */

function superQueMata(c: Cena): void {
  c.g.p1.x = 435;
  c.g.p2.x = 525;
  c.g.p1.facing = 1;
  c.g.p2.facing = -1;
  c.g.p2.hp = 1;
  c.mao.p1 = { hp: true, hk: true };
  c.tick();
  c.mao.p1 = {};
  c.tick(60);
}

describe('decideALuta calculado no tick do KO (antes de endRound/matchWinner)', () => {
  it('especial comum que mata e FECHA a luta: filme.decideALuta e ko.decideALuta true, e matchWinner ainda null', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.wins = 1;
    c.g.p2.hp = 1;
    soltar(c, 'sDown', 90);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.ko).toBe(true);
    expect(f?.decideALuta).toBe(true);
    expect(doTipo(c.eventos, 'ko')[0]?.decideALuta).toBe(true);
    expect(c.g.matchWinner).toBeNull(); // o defeito: a UI só tinha isto, e é tarde demais
  });

  it('especial comum que mata um round que NÃO fecha a luta: false', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p2.hp = 1;
    soltar(c, 'sDown', 90);
    expect(doTipo(c.eventos, 'filme')[0]?.decideALuta).toBe(false);
    expect(doTipo(c.eventos, 'ko')[0]?.decideALuta).toBe(false);
  });

  it('filme que NÃO mata nunca decide a luta, mesmo com o vencedor a 1 round de fechar', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.wins = 1;
    c.g.p2.hp = 1000;
    soltar(c, 'sDown', 90);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.ko).toBe(false);
    expect(f?.decideALuta).toBe(false);
  });

  it('super que mata e fecha a luta: filme motivo "ko" com decideALuta true', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    c.g.p1.wins = 1;
    superQueMata(c);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.motivo).toBe('ko');
    expect(f?.decideALuta).toBe(true);
    expect(doTipo(c.eventos, 'ko')[0]?.decideALuta).toBe(true);
  });

  it('super que mata um round comum: decideALuta false', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    superQueMata(c);
    expect(doTipo(c.eventos, 'filme')[0]?.decideALuta).toBe(false);
  });

  it('KO sem filme (golpe comum) também carrega o campo', () => {
    const c = cena('hayato', 'wei-long', { motorV2: null });
    c.g.p1.wins = 1;
    c.g.p2.hp = 1;
    soltar(c, 'hp', 70);
    expect(doTipo(c.eventos, 'ko')[0]?.decideALuta).toBe(true);
  });
});
