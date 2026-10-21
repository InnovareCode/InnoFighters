import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/core/constantes';
import type { EventoLuta } from '../../src/core/contratos';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import { ateALuta, criarLuta, soltar, tipos, type Luta } from './_kit-e3';
import { montarTodos } from './_lutadores';

/*
 * ESQUIVA (docs/spec-esquiva-e-cinematica-especial.md 2.6, testes 1 a 7): motor, sem CPU. Elenco do oráculo (`montarTodos`): números
 * independentes do balanceamento. P1 = HAYATO (esquiva), P2 = CAIO (ataca/parado).
 */
const elenco = montarTodos();

function nova(esquiva: boolean, x1 = 300, x2 = 700, c2: 'caio' | 'hayato' = 'caio'): Luta {
  const l = criarLuta({ mode: 'versus', c1: 'hayato', c2, esquiva }, elenco);
  ateALuta(l);
  l.g.p1.x = x1;
  l.g.p2.x = x2;
  l.g.p1.en = 100;
  soltar(l);
  return l;
}

/** Aperta o botão ESQUIVA por 1 tick (borda) com a direção dada e solta. Devolve os eventos desse tick. */
function esquivar(l: Luta, dir: 'tras' | 'frente' | 'neutro' = 'tras'): EventoLuta[] {
  l.frame.p1.esq = true;
  l.frame.p1.left = dir === 'tras';
  l.frame.p1.right = dir === 'frente';
  const ev = l.passo();
  l.frame.p1.esq = false;
  l.frame.p1.left = false;
  l.frame.p1.right = false;
  return ev;
}

describe('flag desligada: a esquiva não existe', () => {
  it('esq:true por 300 ticks não muda estado, energia, eventos nem posição em relação ao mesmo trecho sem esq', () => {
    const rodar = (comEsq: boolean) => {
      const l = nova(false);
      l.g.p1.en = 50;
      const trilha: unknown[] = [];
      for (let t = 0; t < 300; t++) {
        l.frame.p1.esq = comEsq && t % 7 === 0;
        l.frame.p1.left = t % 40 < 10;
        l.frame.p1.lp = t % 53 === 0;
        const ev = l.passo();
        trilha.push([l.g.p1.state, l.g.p1.en, l.g.p1.x, l.g.p1.invuln, ev.map((e) => e.tipo).join(',')]);
      }
      return trilha;
    };
    expect(rodar(true)).toEqual(rodar(false));
  });

  it('nenhum evento esquiva/esquivou/deny por causa do botão e o estado nunca é "esquiva"', () => {
    const l = nova(false);
    l.g.p1.en = 5;
    const ev = esquivar(l);
    ev.push(...l.passo(30));
    expect(tipos(ev, 'esquiva')).toHaveLength(0);
    expect(tipos(ev, 'deny')).toHaveLength(0);
    expect(l.g.p1.state).not.toBe('esquiva');
    expect(l.g.p1.esquiva).toBe(0);
  });
});

describe('esquiva para trás (recuo)', () => {
  it('com en = 20 e ← : estado esquiva, en 0, evento dir -1, ~120 px para trás, invulnerável exatamente nos ticks [0, 14)', () => {
    const l = nova(true);
    l.g.p1.en = 20;
    const x0 = l.g.p1.x;
    const inv: boolean[] = [];
    const eventos = esquivar(l);
    inv.push(l.g.p1.invuln > 0);
    expect(l.g.p1.state).toBe('esquiva');
    expect(l.g.p1.esquiva).toBe(-1);
    expect(l.g.p1.en).toBe(0);
    const evEsq = tipos(eventos, 'esquiva');
    expect(evEsq).toHaveLength(1);
    expect(evEsq[0]).toMatchObject({ tipo: 'esquiva', lutador: 0, dir: -1 });
    for (let t = 1; t < ESQUIVA_PADRAO.tras.dur; t++) {
      l.passo();
      inv.push(l.g.p1.invuln > 0);
    }
    expect(inv.slice(0, 14).every(Boolean)).toBe(true);
    expect(inv.slice(14).some(Boolean)).toBe(false);
    expect(x0 - l.g.p1.x).toBeGreaterThan(108);
    expect(x0 - l.g.p1.x).toBeLessThan(132);
    expect(l.g.p1.state).toBe('idle');
  });

  it('neutro, ↓ e ↑ também recuam (o padrão é defensivo)', () => {
    for (const cima of [false, true]) {
      const l = nova(true);
      l.frame.p1.esq = true;
      l.frame.p1.up = cima;
      l.frame.p1.down = !cima;
      l.passo();
      expect(l.g.p1.esquiva).toBe(-1);
    }
    const n = nova(true);
    esquivar(n, 'neutro');
    expect(n.g.p1.esquiva).toBe(-1);
  });

  it('a esquiva não regenera energia (igual ao dash) e deixa o corpo no chão', () => {
    const l = nova(true);
    l.g.p1.en = 60;
    esquivar(l);
    const en = l.g.p1.en;
    l.passo(10);
    expect(l.g.p1.en).toBe(en);
    expect(l.g.p1.y).toBe(GROUND);
  });
});

describe('sem barra', () => {
  it('en = 19: um deny, nada gasto, nada de esquiva', () => {
    const l = nova(true);
    l.g.p1.en = 19;
    const ev = esquivar(l);
    ev.push(...l.passo(10));
    expect(tipos(ev, 'deny')).toHaveLength(1);
    expect(tipos(ev, 'esquiva')).toHaveLength(0);
    expect(l.g.p1.state).not.toBe('esquiva');
    expect(l.g.p1.en).toBeGreaterThanOrEqual(19);
    expect(l.g.p1.en).toBeLessThan(19.6);
  });
});

describe('invulnerabilidade na janela, punição na recuperação', () => {
  /** P1 encostado na parede esquerda (o recuo quase não sai do lugar) e P2 a 85 px, para o golpe do P2 alcançar nas duas fases. */
  const perto = (): Luta => nova(true, 70, 155);

  it('jab do rival na janela: nenhum dano e exatamente um esquivou; o mesmo jab na recuperação é CONTRAGOLPE', () => {
    const naJanela = perto();
    esquivar(naJanela);
    naJanela.g.p2.startMove('lp', naJanela.g);
    const ev = naJanela.passo(12);
    expect(naJanela.g.p1.hp).toBe(naJanela.g.p1.maxHp);
    expect(tipos(ev, 'esquivou')).toHaveLength(1);
    expect(tipos(ev, 'esquivou')[0]).toMatchObject({ lutador: 0, atacante: 1, projetil: false });
    expect(tipos(ev, 'hit')).toHaveLength(0);

    const naRecuperacao = perto();
    esquivar(naRecuperacao);
    naRecuperacao.passo(11); // t = 12: o jab (S = 3) chega em t = 15, depois de a janela fechar (14)
    naRecuperacao.g.p2.startMove('lp', naRecuperacao.g);
    const ev2 = naRecuperacao.passo(8);
    const hit = tipos(ev2, 'hit')[0];
    expect(hit).toMatchObject({ tipo: 'hit', defensor: 0, contragolpe: true });
    expect(naRecuperacao.g.p1.hp).toBeLessThan(naRecuperacao.g.p1.maxHp);
  });

  it('arremesso: na janela o rival não agarra; na recuperação agarra (throw)', () => {
    const naJanela = perto();
    esquivar(naJanela);
    naJanela.g.p2.startMove('throw', naJanela.g);
    const ev = naJanela.passo(8);
    expect(tipos(ev, 'throw')).toHaveLength(0);
    expect(naJanela.g.p1.hp).toBe(naJanela.g.p1.maxHp);

    const naRecuperacao = perto();
    esquivar(naRecuperacao);
    naRecuperacao.passo(11);
    naRecuperacao.g.p2.startMove('throw', naRecuperacao.g);
    const ev2 = naRecuperacao.passo(8);
    expect(tipos(ev2, 'throw')).toHaveLength(1);
  });

  it('projétil na janela: não acerta enquanto dura a invulnerabilidade, é anunciado uma vez e SEGUE voando', () => {
    const l = nova(true, 70, 500, 'hayato');
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const ev: EventoLuta[] = [];
    let ticksDesdeEsq = -1;
    let hpNoFimDaJanela = -1;
    let vivoNoFimDaJanela = false;
    for (let t = 0; t < 80 && hpNoFimDaJanela < 0; t++) {
      const pr = l.g.projectiles[0];
      if (ticksDesdeEsq < 0 && pr && pr.x - l.g.p1.x < 130) {
        ev.push(...esquivar(l));
        ticksDesdeEsq = 0;
      } else {
        ev.push(...l.passo());
        if (ticksDesdeEsq >= 0) ticksDesdeEsq++;
      }
      if (ticksDesdeEsq === ESQUIVA_PADRAO.tras.invFim - 1) {
        hpNoFimDaJanela = l.g.p1.hp;
        vivoNoFimDaJanela = l.g.projectiles.length > 0;
      }
    }
    expect(ticksDesdeEsq).toBeGreaterThan(0);
    expect(hpNoFimDaJanela).toBe(l.g.p1.maxHp);
    expect(vivoNoFimDaJanela).toBe(true);
    expect(tipos(ev, 'esquivou')).toHaveLength(1);
    expect(tipos(ev, 'esquivou')[0]).toMatchObject({ projetil: true });
    expect(tipos(ev, 'hit')).toHaveLength(0);
  });

  it('a recuperação não bloqueia: segurando trás, o jab dá hit (não block)', () => {
    const l = perto();
    esquivar(l);
    l.passo(11);
    l.frame.p1.left = true; // trás (P1 olha para a direita)
    l.g.p2.startMove('lp', l.g);
    const ev = l.passo(8);
    expect(tipos(ev, 'block')).toHaveLength(0);
    expect(tipos(ev, 'hit')).toHaveLength(1);
  });
});

describe('esquiva para frente (avanço)', () => {
  it('começando a 90 px do rival atravessa: o sinal de (rival − eu) inverte e o rival não é empurrado durante a esquiva', () => {
    const l = nova(true, 300, 390);
    const antes = l.g.p2.x - l.g.p1.x;
    expect(antes).toBeGreaterThan(0);
    esquivar(l, 'frente');
    expect(l.g.p1.esquiva).toBe(1);
    const xs: number[] = [l.g.p2.x];
    for (let t = 1; t < ESQUIVA_PADRAO.frente.invFim; t++) {
      l.passo();
      xs.push(l.g.p2.x);
    }
    expect(l.g.p2.x - l.g.p1.x).toBeLessThan(0);
    expect(new Set(xs).size).toBe(1);
    expect(l.g.p1.x - 300).toBeGreaterThan(135);
  });

  it('o arranque (3 ticks) é vulnerável e a janela é [3, 19)', () => {
    const l = nova(true, 300, 700);
    const inv: boolean[] = [];
    esquivar(l, 'frente');
    inv.push(l.g.p1.invuln > 0);
    for (let t = 1; t < ESQUIVA_PADRAO.frente.dur; t++) {
      l.passo();
      inv.push(l.g.p1.invuln > 0);
    }
    expect(inv.map((v, i) => (v ? i : -1)).filter((i) => i >= 0)).toEqual(Array.from({ length: 16 }, (_, i) => i + 3));
  });

  it('o avanço atravessa o projétil, que continua vivo', () => {
    const l = nova(true, 300, 700, 'hayato');
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    let vivoDepoisDeCruzar = false;
    let esquivou = false;
    for (let t = 0; t < 60; t++) {
      const pr = l.g.projectiles[0];
      if (!esquivou && pr && pr.x - l.g.p1.x < 200) {
        esquivar(l, 'frente');
        esquivou = true;
      } else l.passo();
      const q = l.g.projectiles[0];
      if (esquivou && q && q.x < l.g.p1.x) vivoDepoisDeCruzar = true;
    }
    expect(esquivou).toBe(true);
    expect(vivoDepoisDeCruzar).toBe(true);
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);
  });
});

describe('onde a esquiva NÃO sai, e o botão guardado', () => {
  it('no ar, em prejump, durante um golpe e atordoado: ignorada (o botão guardado vence 6 ticks e some)', () => {
    const noAr = nova(true);
    noAr.g.p1.y = GROUND - 220;
    noAr.g.p1.setState('jump');
    esquivar(noAr);
    noAr.passo(10);
    expect(noAr.g.p1.state).not.toBe('esquiva');

    const prejump = nova(true);
    prejump.frame.p1.up = true;
    prejump.passo();
    prejump.frame.p1.up = false;
    expect(prejump.g.p1.state).toBe('prejump');
    esquivar(prejump);
    expect(prejump.g.p1.state).not.toBe('esquiva');

    const golpe = nova(true);
    golpe.g.p1.startMove('hk', golpe.g);
    esquivar(golpe);
    golpe.passo(8);
    expect(golpe.g.p1.state).toBe('move');
    expect(golpe.g.p1.esquiva).toBe(0);

    const atordoado = nova(true);
    atordoado.g.p1.setState('hit');
    atordoado.g.p1.stun = 40;
    esquivar(atordoado);
    atordoado.passo(8);
    expect(atordoado.g.p1.state).toBe('hit');
  });

  it('apertada 4 ticks antes de o bloqueio acabar: sai no 1º tick livre; 7 ticks antes: não sai', () => {
    const tentar = (antes: number): boolean => {
      const l = nova(true);
      l.g.p1.setState('block');
      l.g.p1.stun = 10;
      // o bloqueio acaba no tick 10; apertando no tick (10 - antes) o botão guardado cobre o 1º tick livre (11) se antes <= 5
      for (let t = 1; t <= 14; t++) {
        l.frame.p1.esq = t === 10 - antes;
        l.passo();
        if (l.g.p1.state === 'esquiva') return true;
      }
      return false;
    };
    expect(tentar(4)).toBe(true);
    expect(tentar(7)).toBe(false);
  });

  it('a esquiva e o ataque no mesmo tick: a esquiva vence e zera o botão de ataque', () => {
    const l = nova(true);
    l.frame.p1.esq = true;
    l.frame.p1.lp = true;
    const ev = l.passo();
    expect(l.g.p1.state).toBe('esquiva');
    expect(tipos(ev, 'swing')).toHaveLength(0);
    l.frame.p1.esq = false;
    l.frame.p1.lp = false;
    l.passo(40);
    expect(l.g.p1.move).toBeNull();
  });

  it('o CAIO (rival) também esquiva: a esquiva vale para os dois lados', () => {
    const l = nova(true);
    l.g.p2.en = 100;
    l.frame.p2.esq = true;
    l.frame.p2.right = true; // P2 olha para a esquerda: trás = direita
    l.passo();
    expect(l.g.p2.state).toBe('esquiva');
    expect(l.g.p2.esquiva).toBe(-1);
  });
});
