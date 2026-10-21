import { describe, expect, it } from 'vitest';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { todasAsApresentacoes } from '../../src/data/apresentacao-especiais';
import type { NomeGolpe } from '../../src/data/tipos';
import { montarBaatarComAbraco } from './_baatar-chefe';
import { elenco, esquivar, nova } from './_esquiva-qa';
import { tipos } from './_kit-e3';

/*
 * A esquiva é de TIMING, não imunidade (decisão do dono, confirmada pelo Atlas): esquivar no tempo certo de um golpe, magia (projétil) ou
 * especial = NÃO sofrer dano; fora do tempo (antes de a janela abrir, depois de ela fechar, ou no arranque vulnerável do avanço) = dano normal.
 *
 * Contagem em ticks a partir do tick em que o botão é apertado (tick 0 = o do aperto):
 *   RECUO   invulnerável nos ticks 0..13  (14 ticks), recuperação vulnerável nos ticks 14..21
 *   AVANÇO  vulnerável nos ticks 0..2 (arranque), invulnerável nos ticks 3..18 (16 ticks), recuperação vulnerável nos ticks 19..25
 */

const danoNoP1 = (ev: readonly EventoLuta[]): number => ev.filter((e) => (e.tipo === 'hit' || e.tipo === 'throw') && e.defensor === 0).length;

// ---------------------------------------------------------------------------------------------------------------------
describe('janela exata (golpe comum de contato conhecido)', () => {
  /** O índice do tick em que o jab do P2 (S = 3) acerta é `inicio + 2` (o `startMove` já conta o 1º tick). */
  it('RECUO: o jab que acerta nos ticks 0..13 é esquivado; do tick 14 em diante acerta', () => {
    for (let contato = 2; contato <= 24; contato++) {
      const l = nova(true, 'hayato', 'caio', 70, 155);
      l.g.p1.x = 70; // na parede: o recuo não foge do alcance, só a invulnerabilidade decide
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 60; t++) {
        if (t === contato - 2) l.g.p2.startMove('lp', l.g);
        ev.push(...(t === 0 ? esquivar(l, 'tras') : l.passo()));
      }
      expect(danoNoP1(ev), `contato no tick ${contato}`).toBe(contato >= 14 ? 1 : 0);
      if (contato < 14) expect(tipos(ev, 'esquivou'), `contato ${contato}`).toHaveLength(1);
    }
  });

  it('AVANÇO: o jab que acerta nos ticks 0..2 (arranque) acerta; nos ticks 3..18 é esquivado; do tick 19 em diante acerta', () => {
    for (let contato = 2; contato <= 30; contato++) {
      const l = nova(true, 'hayato', 'caio', 300, 390);
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 70; t++) {
        if (t === contato - 2) l.g.p2.startMove('lp', l.g);
        ev.push(...(t === 0 ? esquivar(l, 'frente') : l.passo()));
      }
      const deveAcertar = contato <= 2 || contato >= 19;
      expect(danoNoP1(ev), `contato no tick ${contato}`).toBe(deveAcertar ? 1 : 0);
    }
  });
});

// ---------------------------------------------------------------------------------------------------------------------
type Cfg = { x1: number; x2: number };
const POSICOES: Cfg[] = [70, 480].flatMap((x1) => [150, 200, 260, 340, 440, 560, 700, 850].filter((x2) => x2 > x1 + 70).map((x2) => ({ x1, x2 })));

/** Roda o especial do P2 contra o P1 (HAYATO, ou CAIO se o atacante for o HAYATO), com a esquiva apertada no tick `k` (null = sem esquiva). */
function rodar(id: IdLutador, ficha: string | null, golpe: string, cfg: Cfg, k: number | null, dir: 'tras' | 'frente' = 'tras', lut = elenco) {
  const vitima: IdLutador = id === 'caio' ? 'hayato' : 'caio';
  const l = nova(true, vitima, id, cfg.x1, cfg.x2, lut);
  l.g.p1.x = cfg.x1;
  if (ficha) l.g.p2.trocarFicha(ficha);
  l.g.p2.startMove(golpe as NomeGolpe, l.g);
  const ev: EventoLuta[] = [];
  let primeiroDano = -1;
  for (let t = 0; t < 200; t++) {
    const e = t === k ? esquivar(l, dir) : l.passo();
    if (primeiroDano < 0 && danoNoP1(e) > 0) primeiroDano = t;
    ev.push(...e);
  }
  return { ev, primeiroDano };
}

/** Primeira posição em que o especial machuca (sem esquiva) e o tick do 1º dano. `minT`: só aceita contato a partir desse tick. */
function acharContato(id: IdLutador, ficha: string | null, golpe: string, minT = 0): { cfg: Cfg; T: number } | null {
  for (const cfg of POSICOES) {
    const { primeiroDano } = rodar(id, ficha, golpe, cfg, null);
    if (primeiroDano >= minT && primeiroDano >= 0) return { cfg, T: primeiroDano };
  }
  return null;
}

// Por desenho NÃO são esquiváveis do jeito comum: a PARADE (não ataca) e a HURACANRANA (alvo no ar, e a esquiva só sai no chão). O ABRAÇO DA
// ESTEPE (agarra a recuperação do recuo) saiu do kit do BAATAR (o →+ESP dele é o MERGULHO): fica no teste de "o que a esquiva NÃO cobre", com o
// def de fixtura. A GARKUWA É um golpe (palma-escudo) e se esquiva como os outros. MIN-JI BULKKOT tem 2 projéteis:
// cada um é esquivado separadamente.
const ESPECIAIS = todasAsApresentacoes().filter((c) => !(c.id === 'camille' && c.golpe === 'sFire') && !(c.id === 'centella' && c.golpe === 'sDown'));
const MULTI_PROJETIL = (id: string, golpe: string): boolean => id === 'min-ji' && golpe === 'sFire';

describe('cada especial: no tempo certo = zero dano; golpe esquivado é consumido', () => {
  it('a lista cobre os especiais dos 9 (28 menos PARADE e HURACANRANA; inclui as fichas SARPA e o MERGULHO do BAATAR)', () => {
    const nomes = ESPECIAIS.map((c) => `${c.id}${c.ficha ? '/' + c.ficha : ''}.${c.golpe}`);
    expect(nomes).toHaveLength(26);
    expect(nomes).toContain('aminu.sDown'); // GARKUWA
    expect(nomes).toContain('baatar.sFwd'); // MERGULHO DA ÁGUIA
    expect(nomes).toContain('centella.sFwd'); // RESORTE
    expect(nomes).toContain('wei-long.sDown'); // ZHEN DI (projétil rasteiro)
    expect(nomes).toContain('baatar.sFire'); // ARREMESSO DO AVARGA (agarrão)
  });

  for (const c of ESPECIAIS) {
    const rotulo = `${c.id}${c.ficha ? '/' + c.ficha : ''} ${c.golpe}`;
    it(`${rotulo}: esquivar em qualquer dos ticks que cobrem o contato = zero dano e nenhum dano do mesmo golpe depois do "ESQUIVOU!"`, () => {
      const achado = acharContato(c.id, c.ficha, c.golpe);
      expect(achado, `${rotulo} não machuca em nenhuma posição (a base do teste)`).not.toBeNull();
      const { cfg, T } = achado as { cfg: Cfg; T: number };
      let announced = 0;
      // tempo certo: o aperto cai de 10 ticks antes do contato até o próprio tick do contato (o contato pode deslizar 1-3 ticks quando o recuo mexe na distância)
      // REVERS (`through`): no tick do contato a CAMILLE já cruzou e o `facing` do alvo vira; "trás" apertado ali é "frente" (arranque vulnerável)
      const ate = c.id === 'camille' && c.golpe === 'sFwd' ? T - 1 : T;
      for (let k = Math.max(0, T - 10); k <= ate; k++) {
        const { ev } = rodar(c.id, c.ficha, c.golpe, cfg, k);
        if (!MULTI_PROJETIL(c.id, c.golpe)) expect(danoNoP1(ev), `${rotulo} k=${k} (contato em ${T})`).toBe(0);
        if (tipos(ev, 'esquivou').length > 0) announced++;
      }
      // golpes que são agarrões (ARREMESSO) não anunciam "esquivou" (o agarrão simplesmente falha); os demais anunciam
      if (!(c.id === 'baatar' && c.golpe === 'sFire') && !(c.id === 'centella' && c.golpe === 'sFwd')) expect(announced, rotulo).toBeGreaterThan(0);
      // consumo: em NENHUM aperto da varredura há dano do mesmo golpe depois de "esquivou"
      if (!MULTI_PROJETIL(c.id, c.golpe)) {
        for (let k = 0; k <= T + 3; k++) {
          const { ev } = rodar(c.id, c.ficha, c.golpe, cfg, k);
          const i = ev.findIndex((e) => e.tipo === 'esquivou' && e.lutador === 0);
          if (i >= 0) expect(danoNoP1(ev.slice(i + 1)), `${rotulo} k=${k}`).toBe(0);
        }
      }
    });

    it(`${rotulo}: esquivar DEPOIS do contato (janela aberta tarde demais) = dano normal`, () => {
      const achado = acharContato(c.id, c.ficha, c.golpe) as { cfg: Cfg; T: number };
      const { ev } = rodar(c.id, c.ficha, c.golpe, achado.cfg, achado.T + 1);
      expect(danoNoP1(ev), rotulo).toBeGreaterThan(0);
    });
  }
});

describe('MAGIA (projétil do HAYATO): janela exata por distância', () => {
  const danoDeProjetil = (ev: readonly EventoLuta[]): number => ev.filter((e) => e.tipo === 'hit' && e.defensor === 0 && e.projetil).length;

  function lancar(x1: number, x2: number) {
    const l = nova(true, 'caio', 'hayato', x1, x2);
    l.g.p1.x = x1;
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    return l;
  }
  function contato(x1: number, x2: number): number {
    const l = lancar(x1, x2);
    for (let t = 0; t < 140; t++) if (danoDeProjetil(l.passo()) > 0) return t;
    return -1;
  }

  it('RECUO na parede apertado no tick 0: a magia que chega nos ticks 0..12 é esquivada; do tick 15 em diante acerta (13-14: fronteira, o recuo desloca o alvo 10 px) (varredura de 170 a 760 px)', () => {
    let esquivadas = 0;
    let acertou = 0;
    for (let x2 = 170; x2 <= 760; x2 += 10) {
      const T = contato(70, x2);
      expect(T, `x2=${x2} sem esquiva precisa acertar`).toBeGreaterThanOrEqual(0);
      const l = lancar(70, x2);
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 140; t++) ev.push(...(t === 0 ? esquivar(l, 'tras') : l.passo()));
      const dano = danoDeProjetil(ev);
      // o recuo na parede ainda desloca o alvo 10 px (70 -> 60): o contato escorrega ~1 tick, então T = 13 e 14 ficam na fronteira
      if (T <= 12) expect(dano, `x2=${x2} contato em ${T}`).toBe(0);
      else if (T >= 15) expect(dano, `x2=${x2} contato em ${T}`).toBe(1);
      if (T <= 12) esquivadas++;
      else if (T >= 15) acertou++;
    }
    expect(esquivadas).toBeGreaterThan(5);
    expect(acertou).toBeGreaterThan(5);
  });

  it('AVANÇO contra a magia: zero dano se apertado com o projétil a mais de ~75 px (8+ ticks antes do contato) e antes de a janela fechar; o arranque vulnerável pega quem aperta tarde', () => {
    const T = contato(300, 760);
    const dano = (k: number): number => {
      const l = lancar(300, 760);
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 140; t++) ev.push(...(t === k ? esquivar(l, 'frente') : l.passo()));
      return danoDeProjetil(ev);
    };
    for (let k = T - 25; k <= T - 8; k++) expect(dano(k), `avanço ${T - k} ticks antes do contato`).toBe(0);
    for (let k = T - 6; k <= T; k++) expect(dano(k), `avanço ${T - k} ticks antes do contato (arranque)`).toBeGreaterThan(0);
    expect(dano(T - 45), 'cedo demais: o projétil chega depois da janela e da recuperação começar').toBeGreaterThan(0);
  });
});

describe('o que a esquiva NÃO cobre, por desenho (lista para o dono)', () => {
  it('ABRAÇO DA ESTEPE (rush + agarrão em janela; def de fixtura, fora do kit do BAATAR): a janela de teste do agarrão (16 ticks) passa dos 14 de invulnerabilidade e agarra a RECUPERAÇÃO do recuo', () => {
    let agarrou = 0;
    for (let k = 0; k <= 11; k++) {
      const { ev } = rodar('baatar', null, 'sFwd', { x1: 70, x2: 150 }, k, 'tras', { ...elenco, baatar: montarBaatarComAbraco() });
      agarrou += tipos(ev, 'throw').length > 0 ? 1 : 0;
    }
    expect(agarrou).toBeGreaterThan(0);
  });

  it('MIN-JI BULKKOT (2 projéteis): a esquiva cobre os que chegam dentro da janela; esquivar antes do 2º projétil chegar deixa passar o 2º', () => {
    const cfg: Cfg = { x1: 70, x2: 150 };
    const { primeiroDano: T } = rodar('min-ji', null, 'sFire', cfg, null);
    expect(T).toBeGreaterThanOrEqual(0);
    const danos = new Set<number>();
    for (let k = 0; k <= T; k++) danos.add(danoNoP1(rodar('min-ji', null, 'sFire', cfg, k).ev));
    expect(danos.has(0)).toBe(true); // com o aperto certo os dois projéteis são esquivados
    expect(danos.has(1)).toBe(true); // com o aperto cedo, o 2º passa
  });

  it('HURACANRANA (CENTELLA ↓+ESP) só agarra rival NO AR, e a esquiva só sai no chão: não há esquiva dela', () => {
    const l = nova(true, 'hayato', 'centella', 300, 390);
    l.g.p1.setState('jump');
    l.g.p1.y = 470 - 70;
    l.g.p1.vy = -2;
    l.g.p2.startMove('sDown', l.g);
    const ev = esquivar(l, 'tras');
    ev.push(...l.passo(25));
    expect(tipos(ev, 'esquiva')).toHaveLength(0);
    expect(tipos(ev, 'throw').length).toBeGreaterThan(0);
  });

  it('PARADE (CAMILLE ↑ESP) não ataca: não há o que esquivar (o dano que ela evita é do rival). A GARKUWA (AMINU ↓+ESP) é uma palma e se esquiva normalmente', () => {
    const { ev } = rodar('camille', null, 'sFire', { x1: 300, x2: 390 }, null);
    expect(danoNoP1(ev)).toBe(0);
    const g = rodar('aminu', null, 'sDown', { x1: 70, x2: 150 }, null);
    expect(danoNoP1(g.ev)).toBeGreaterThan(0);
  });
});
