import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/core/constantes';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import { elenco, esquivar, nova } from './_esquiva-qa';
import { criarLuta, tipos, type Luta } from './_kit-e3';

/*
 * QA ADVERSARIAL da ESQUIVA (Íris, pós-commit 1cb1ccd). Complementa esquiva.test.ts / esquiva-cpu.test.ts / cinematica-eventos.test.ts
 * (da Vega) nos cantos que eles não pisam: fronteiras do botão guardado, parede, mesmo tick, chefão, estado reaproveitado, RNG, fuzz.
 * Convenção: `it.fails(...)` = BUG REAL conhecido (a asserção descreve o comportamento CORRETO e hoje falha). Corrigido o bug, o
 * `it.fails` passa a falhar de propósito: é o sinal para trocar por `it`.
 * Elenco: `montarTodos()` (oráculo, números independentes do balanceamento); o balanço usa `dadosDeProducao`.
 */
const TRAS = ESQUIVA_PADRAO.tras;
const CUSTO = ESQUIVA_PADRAO.custo;

// ---------------------------------------------------------------------------------------------------------------------
describe('botão guardado: as fronteiras exatas dos 6 ticks', () => {
  /** P1 bloqueando até o tick 10 (o 1º tick livre é o 11). Aperta ESQ no tick `t`; devolve em que tick a esquiva saiu (ou null). */
  function quandoSai(t: number): number | null {
    const l = nova(true);
    l.g.p1.setState('block');
    l.g.p1.stun = 10;
    for (let k = 1; k <= 20; k++) {
      l.frame.p1.esq = k === t;
      l.passo();
      if (l.g.p1.state === 'esquiva') return k;
    }
    return null;
  }

  it('apertada no ÚLTIMO tick do bloqueio ou no 1º livre: sai no 1º tick livre (11) ou no próprio tick', () => {
    expect(quandoSai(10)).toBe(11);
    expect(quandoSai(11)).toBe(11);
  });

  it('o botão vale exatamente 6 ticks: apertada 5 ticks antes do 1º livre ainda sai, 6 antes não', () => {
    expect(quandoSai(6)).toBe(11); // 11 - 5
    expect(quandoSai(5)).toBeNull(); // 11 - 6: o botão já decaiu
    expect(quandoSai(1)).toBeNull();
  });

  it('depois de LEVANTAR (down -> idle com invuln de 12): a esquiva guardada sai no 1º tick livre; a apertada cedo demais some', () => {
    const preparar = (): Luta => {
      const l = nova(true);
      l.g.p1.setState('down');
      l.g.p1.phase = 'rise';
      l.g.p1.vx = 0;
      return l;
    };
    // `rise` acaba quando st > 14: conta os ticks até virar idle
    const l0 = preparar();
    let ate = 0;
    while (l0.g.p1.state === 'down' && ate < 60) {
      l0.passo();
      ate++;
    }
    expect(l0.g.p1.state).toBe('idle');
    expect(l0.g.p1.invuln).toBeGreaterThan(0); // levantou invulnerável

    const tentar = (tick: number): boolean => {
      const l = preparar();
      for (let k = 1; k <= ate + 4; k++) {
        l.frame.p1.esq = k === tick;
        l.passo();
        if (l.g.p1.state === 'esquiva') return true;
      }
      return false;
    };
    expect(tentar(ate - 3)).toBe(true); // 3 ticks antes de levantar
    expect(tentar(ate)).toBe(true);
    expect(tentar(Math.max(1, ate - 12))).toBe(false); // muito antes: o botão decaiu
  });

  it('esquiva e invulnerabilidade do levantar não se somam além da janela: a esquiva do 1º tick livre cobre [0, 14) e nada mais', () => {
    const l = nova(true);
    l.g.p1.setState('down');
    l.g.p1.phase = 'rise';
    let k = 0;
    while (l.g.p1.state !== 'esquiva' && k < 80) {
      k++;
      l.frame.p1.esq = k === 12; // `rise` dura 15 ticks: aperta 3 ticks antes de levantar
      l.passo();
    }
    l.frame.p1.esq = false;
    expect(l.g.p1.state).toBe('esquiva');
    // `invuln` do levantar (12) < janela do recuo (14): a janela manda
    let comInv = 0;
    for (let t = 0; t < TRAS.dur; t++) {
      if (l.g.p1.invuln > 0) comInv++;
      l.passo();
    }
    expect(comInv).toBeLessThanOrEqual(TRAS.invFim);
  });

  it('esquiva no AR é recusada: nenhuma energia sai e o estado nunca vira esquiva enquanto os pés não tocam o chão', () => {
    const l = nova(true);
    l.frame.p1.up = true;
    l.passo(); // prejump
    l.frame.p1.up = false;
    const en0 = l.g.p1.en;
    let noArVisto = 0;
    for (let k = 0; k < 40 && l.g.p1.y < GROUND + 1; k++) {
      l.frame.p1.esq = k % 3 === 0;
      l.passo();
      if (l.g.p1.y < GROUND) {
        noArVisto++;
        expect(l.g.p1.state).not.toBe('esquiva');
        expect(l.g.p1.en).toBeGreaterThanOrEqual(en0); // o custo só sai se a esquiva sai
      }
    }
    expect(noArVisto).toBeGreaterThan(10);
  });

  it('esquiva apertada ainda no ar, a ≤ 5 ticks de pousar, sai no 1º tick do chão (botão guardado) e custa 20', () => {
    const l = nova(true);
    l.g.p1.y = GROUND - 8;
    l.g.p1.vy = 3;
    l.g.p1.setState('jump');
    l.frame.p1.esq = true;
    l.passo();
    l.frame.p1.esq = false;
    let estado = '';
    for (let k = 0; k < 8 && estado !== 'esquiva'; k++) {
      l.passo();
      estado = l.g.p1.state;
    }
    expect(estado).toBe('esquiva');
    expect(l.g.p1.en).toBeLessThan(100 - CUSTO + 1);
    expect(l.g.p1.y).toBe(GROUND);
  });

  it('durante o HITSTOP o botão se perde (o jogo nem lê a entrada): apertada ali, não sai; apertada no 1º tick depois, sai', () => {
    const l = nova(true);
    l.g.hitstop = 8;
    const en0 = l.g.p1.en;
    for (let k = 0; k < 8; k++) {
      l.frame.p1.esq = true;
      l.passo();
    }
    l.frame.p1.esq = false;
    l.passo(10);
    expect(l.g.p1.state).not.toBe('esquiva');
    expect(l.g.p1.en).toBeGreaterThanOrEqual(en0);
    const ev = esquivar(l);
    expect(tipos(ev, 'esquiva')).toHaveLength(1);
  });

  it('o hitstop NÃO encurta a invulnerabilidade: uma esquiva interrompida por 30 ticks de congelamento mantém os 14 ticks de janela', () => {
    const l = nova(true);
    esquivar(l);
    let janela = 1; // o tick da própria esquiva
    let congelou = false;
    for (let k = 0; k < 80 && l.g.p1.state === 'esquiva'; k++) {
      if (k === 4 && !congelou) {
        l.g.hitstop = 30;
        congelou = true;
      }
      const processado = l.g.hitstop === 0;
      l.passo();
      if (processado && l.g.p1.state === 'esquiva' && l.g.p1.invuln > 0) janela++;
    }
    expect(janela).toBe(TRAS.invFim);
  });

  it('durante a intro e o fim de round nada sai, e o que foi apertado antes da luta não vaza para o 1º tick de luta', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'caio', esquiva: true }, elenco);
    l.g.p1.en = 100;
    for (let k = 0; k < 120 && l.g.phase !== 'fight'; k++) {
      l.frame.p1.esq = l.g.t < 85; // a intro dura 90 ticks: nunca aperta no tick da virada
      l.passo();
      expect(l.g.p1.state).not.toBe('esquiva');
    }
    expect(l.g.phase).toBe('fight');
    l.frame.p1.esq = false;
    l.passo(3);
    expect(l.g.p1.state).not.toBe('esquiva');
    expect(l.g.p1.en).toBe(100);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('energia: 20 exatos, 19 e arredondamento', () => {
  it('en = 20 esquiva e deixa EXATAMENTE 0 (nunca negativa); en = 19.999999 nega com um deny', () => {
    const a = nova(true);
    a.g.p1.en = 20;
    esquivar(a);
    expect(a.g.p1.en).toBe(0);
    expect(Object.is(a.g.p1.en, -0)).toBe(false);

    const b = nova(true);
    b.g.p1.en = 20 - 1e-6;
    const ev = esquivar(b);
    expect(tipos(ev, 'deny')).toHaveLength(1);
    expect(b.g.p1.state).not.toBe('esquiva');
    expect(b.g.p1.en).toBeGreaterThan(19.99);
  });

  it('ESQ + ESP no mesmo tick com en = 20: a esquiva vence, o especial NÃO sai e não gasta (en termina em 0, não negativa)', () => {
    const l = nova(true);
    l.g.p1.en = 20; // o menor especial do HAYATO custa 20 (sFwd)
    l.frame.p1.esq = true;
    l.frame.p1.sp = true;
    l.frame.p1.right = true; // ESP + frente = sFwd
    const ev = l.passo();
    l.frame.p1.esq = false;
    l.frame.p1.sp = false;
    l.frame.p1.right = false;
    expect(l.g.p1.state).toBe('esquiva');
    expect(tipos(ev, 'special')).toHaveLength(0);
    expect(l.g.p1.en).toBe(0);
    l.passo(40);
    expect(tipos(l.passo(1), 'special')).toHaveLength(0);
    expect(l.g.p1.en).toBeGreaterThanOrEqual(0);
  });

  it('ESQ sem energia + soco no mesmo tick: um deny e o soco SAI (a esquiva negada não engole o golpe guardado)', () => {
    const l = nova(true);
    l.g.p1.en = 19;
    l.frame.p1.esq = true;
    l.frame.p1.lp = true;
    const ev = l.passo();
    expect(tipos(ev, 'deny')).toHaveLength(1);
    expect(tipos(ev, 'swing')).toHaveLength(1);
    expect(l.g.p1.state).toBe('move');
  });

  it('duas esquivas seguidas com 39 de energia: a 1ª sai, a 2ª é negada (a regeneração de ~1 tick não completa os 20)', () => {
    const l = nova(true);
    l.g.p1.en = 39;
    esquivar(l);
    expect(l.g.p1.state).toBe('esquiva');
    l.passo(TRAS.dur); // esquiva toda
    expect(l.g.p1.state).toBe('idle');
    const ev = esquivar(l);
    expect(tipos(ev, 'deny')).toHaveLength(1);
    expect(l.g.p1.state).not.toBe('esquiva');
  });

  it('a esquiva guardada durante a PRÓPRIA esquiva encadeia no 1º tick livre se houver barra (sem fresta de vulnerabilidade extra)', () => {
    const l = nova(true);
    l.g.p1.en = 100;
    esquivar(l);
    l.passo(TRAS.dur - 4); // faltam ~4 ticks
    expect(l.g.p1.state).toBe('esquiva');
    const ev = esquivar(l); // guardada
    ev.push(...l.passo(10));
    expect(tipos(ev, 'esquiva').length).toBe(1); // a 2ª começa quando a 1ª termina
    expect(l.g.p1.en).toBeLessThanOrEqual(100 - 2 * CUSTO + 0.5);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('esquivas cruzadas e distâncias por lutador', () => {
  it('os dois AVANÇAM um contra o outro no mesmo tick: atravessam, trocam de lado, acabam separados e livres', () => {
    const l = nova(true, 'hayato', 'caio', 400, 560);
    l.frame.p1.esq = true;
    l.frame.p1.right = true; // frente do P1
    l.frame.p2.esq = true;
    l.frame.p2.left = true; // frente do P2
    l.passo();
    l.frame.p1.esq = false;
    l.frame.p1.right = false;
    l.frame.p2.esq = false;
    l.frame.p2.left = false;
    expect(l.g.p1.esquiva).toBe(1);
    expect(l.g.p2.esquiva).toBe(1);
    l.passo(60);
    expect(l.g.p1.state).toBe('idle');
    expect(l.g.p2.state).toBe('idle');
    expect(l.g.p1.x).toBeGreaterThan(l.g.p2.x); // trocaram de lado
    expect(Math.abs(l.g.p1.x - l.g.p2.x)).toBeGreaterThan(70);
    for (const f of [l.g.p1, l.g.p2]) {
      expect(f.x).toBeGreaterThanOrEqual(60);
      expect(f.x).toBeLessThanOrEqual(900);
    }
  });

  it('ESQ + ↑ no mesmo tick: a esquiva vence o pulo (não vira prejump) e recua', () => {
    const l = nova(true);
    l.frame.p1.esq = true;
    l.frame.p1.up = true;
    l.passo();
    expect(l.g.p1.state).toBe('esquiva');
    expect(l.g.p1.y).toBe(GROUND);
  });

  it('em cada um dos 9 lutadores o recuo anda 120 x spd e o avanço 150 x spd (±2%), sem sair da arena', () => {
    const ids = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar'] as const;
    for (const id of ids) {
      for (const dir of ['tras', 'frente'] as const) {
        const l = nova(true, id, 'caio', 500, 900);
        const x0 = l.g.p1.x;
        esquivar(l, dir);
        l.passo(30);
        const esperado = (dir === 'tras' ? 120 : 150) * elenco[id].spd;
        expect(Math.abs(l.g.p1.x - x0), `${id} ${dir}`).toBeGreaterThan(esperado * 0.98);
        expect(Math.abs(l.g.p1.x - x0), `${id} ${dir}`).toBeLessThan(esperado * 1.02);
      }
    }
  });
});
