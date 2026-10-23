import { describe, expect, it } from 'vitest';
import type { EventoLuta, InputFrame, MotorV2 } from '../../src/core/contratos';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { REGRAS_PADRAO, cfgMotorV2 } from '../../src/meta';
import { cfgDaEtapa } from '../../src/ui/campanha';
import type { CampanhaArcade } from '../../src/ui/tipos';
import { montarTodos } from './_lutadores';

/**
 * V2-1 (docs/spec-revisao-motor-luta-v2.md §7.1 e §9): o botão apertado DURANTE o hitstop não se perde.
 * A fonte imita o `TeclasVirtuais`: a borda (botão) vale só no tick em que foi dada e some depois (`fimDoTick`).
 */
const lutadores = montarTodos();
const LIGADA: MotorV2 = { entradaNoHitstop: true };

type Mao = Partial<InputFrame>;

function criar(motorV2: MotorV2 | undefined, cfg: { cpu?: number | null; p1cpu?: number | null; esquiva?: boolean } = {}) {
  const mao: { p1: Mao; p2: Mao; leituras: { p1: number; p2: number } } = { p1: {}, p2: {}, leituras: { p1: 0, p2: 0 } };
  const fonte: FonteEntradas = {
    p1: () => {
      mao.leituras.p1++;
      return { ...INPUT_VAZIO, ...mao.p1 };
    },
    p2: () => {
      mao.leituras.p2++;
      return { ...INPUT_VAZIO, ...mao.p2 };
    },
  };
  const g = new Game({ lutadores, rng: criarRng(7) });
  g.setup({ mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, ...cfg, ...(motorV2 ? { motorV2 } : {}) }, { rounds: 2, time: 99, shake: true });
  const eventos: EventoLuta[] = [];
  /** Um tick: o que está em `p1`/`p2` vale só neste tick (como a borda de descida que `fimDoTick` apaga). */
  const tick = (p1: Mao = {}, p2: Mao = {}): void => {
    mao.p1 = p1;
    mao.p2 = p2;
    g.update(fonte);
    eventos.push(...g.events);
    mao.p1 = {};
    mao.p2 = {};
  };
  // intro: 90 ticks sem entrada
  for (let i = 0; i < 100 && g.phase !== 'fight'; i++) tick();
  return { g, tick, eventos, mao };
}

/** Os dois colados, no meio da tela, parados. */
function aproximar(g: Game): void {
  g.p1.x = 420;
  g.p2.x = 420 + 62;
}

/** HAYATO dá `lp` em WEI LONG; devolve a luta no 1º tick de hitstop (acabou de acertar). */
function lpAcertaOBoneco(motorV2: MotorV2 | undefined) {
  const c = criar(motorV2);
  aproximar(c.g);
  c.tick({ lp: true });
  for (let i = 0; i < 20 && c.g.hitstop === 0; i++) c.tick();
  return c;
}

describe('V2-1: botão apertado no hitstop', () => {
  it('base do cenário: lp acerta e abre um hitstop de 4 ticks, com a janela de cancelamento aberta', () => {
    const { g } = lpAcertaOBoneco(undefined);
    expect(g.hitstop).toBe(4);
    expect(g.p1.state).toBe('move');
    expect(g.p1.move).toBe('lp');
    expect(g.p1.connected).toBe(true);
  });

  for (const k of [1, 2, 3, 4]) {
    it(`com a flag LIGADA, hp apertado no tick ${k} do hitstop cancela o lp (4 de 4)`, () => {
      const { g, tick } = lpAcertaOBoneco(LIGADA);
      for (let i = 1; i <= 4; i++) tick(i === k ? { hp: true } : {});
      expect(g.hitstop).toBe(0);
      tick(); // 1º tick acionável
      expect(g.p1.move).toBe('hp');
    });

    it(`flag DESLIGADA (hoje): hp apertado no tick ${k} do hitstop se perde (0 de 4)`, () => {
      const { g, tick } = lpAcertaOBoneco(undefined);
      for (let i = 1; i <= 4; i++) tick(i === k ? { hp: true } : {});
      tick();
      tick();
      expect(g.p1.move).not.toBe('hp');
    });
  }

  it('o aperto de DEPOIS do hitstop continua valendo (a flag não atrapalha o caminho de sempre)', () => {
    const { g, tick } = lpAcertaOBoneco(LIGADA);
    for (let i = 1; i <= 4; i++) tick();
    tick({ hk: true });
    expect(g.p1.move).toBe('hk');
  });

  it('dois botões em ticks diferentes do hitstop: o ÚLTIMO vence', () => {
    const { g, tick } = lpAcertaOBoneco(LIGADA);
    tick({ hp: true });
    tick({ hk: true });
    tick();
    tick();
    tick();
    expect(g.p1.move).toBe('hk');
  });

  it('se o 1º tick acionável traz outro botão, esse vence o guardado', () => {
    const { g, tick } = lpAcertaOBoneco(LIGADA);
    tick({ hp: true });
    tick();
    tick();
    tick();
    tick({ hk: true });
    expect(g.p1.move).toBe('hk');
  });

  it('o guardado é entregue UMA vez: depois de gasto, não reaparece no hitstop seguinte', () => {
    const { g, tick } = lpAcertaOBoneco(LIGADA);
    tick({ hp: true });
    tick();
    tick();
    tick();
    tick();
    expect(g.p1.move).toBe('hp');
    expect(g.p1.buf).toBeNull();
  });

  it('o P2 humano também é lido (os dois lados)', () => {
    const c = criar(LIGADA);
    aproximar(c.g);
    c.g.p1.x = 420 + 62;
    c.g.p2.x = 420;
    c.tick({}, { lp: true });
    for (let i = 0; i < 20 && c.g.hitstop === 0; i++) c.tick();
    expect(c.g.hitstop).toBe(4);
    c.tick({}, { hp: true });
    c.tick();
    c.tick();
    c.tick();
    c.tick();
    expect(c.g.p2.move).toBe('hp');
  });
});

describe('V2-1: meia-lua dentro do hitstop', () => {
  /** hitstop de 20 ticks (o da troca de barra do chefão), os dois soltos; ↓ ↘ → no começo e o soco no fim. */
  function meiaLuaNoHitstop(motorV2: MotorV2 | undefined) {
    const c = criar(motorV2);
    aproximar(c.g);
    c.g.p1.en = 100;
    c.g.hitstop = 20;
    for (let i = 1; i <= 20; i++) {
      if (i === 1) c.tick({ down: true });
      else if (i === 2) c.tick({ down: true, right: true });
      else if (i === 3) c.tick({ right: true });
      else if (i === 19) c.tick({ lp: true });
      else c.tick();
    }
    expect(c.g.hitstop).toBe(0);
    c.tick();
    return c;
  }

  it('com a flag LIGADA a meia-lua inteira feita no congelamento solta o especial (sFire, com custo e evento)', () => {
    const { g, eventos } = meiaLuaNoHitstop(LIGADA);
    expect(g.p1.move).toBe('sFire');
    expect(eventos.some((e) => e.tipo === 'special' && e.lutador === 0 && e.golpe === 'sFire')).toBe(true);
  });

  it('flag DESLIGADA: nada sai (a entrada do congelamento se perde)', () => {
    const { g } = meiaLuaNoHitstop(undefined);
    expect(g.p1.move).not.toBe('sFire');
  });

  it('a meia-lua feita DEPOIS da janela de 18 ticks não vale: o histórico guarda só as mudanças, não os 20 ticks', () => {
    const c = criar(LIGADA);
    aproximar(c.g);
    c.g.p1.en = 100;
    c.g.hitstop = 20;
    // ordem errada (→ ↓ ↘ não é ↓ ↘ →): o hist comprimido continua exigindo a sequência
    for (let i = 1; i <= 20; i++) {
      if (i === 1) c.tick({ right: true });
      else if (i === 2) c.tick({ down: true });
      else if (i === 19) c.tick({ lp: true });
      else c.tick();
    }
    c.tick();
    expect(c.g.p1.move).toBe('lp');
  });
});

describe('V2-1: quem NÃO é lido no congelamento', () => {
  it('lutador da CPU: a fonte nunca é chamada para ele e o RNG não anda a mais', () => {
    const rngDe = (motorV2: MotorV2 | undefined) => {
      const c = criar(motorV2, { cpu: 2 });
      aproximar(c.g);
      for (let i = 0; i < 200; i++) {
        c.g.hitstop = i % 17 === 0 ? 5 : c.g.hitstop; // congelamentos frequentes
        c.tick();
      }
      return { leituras: c.mao.leituras, x: [c.g.p1.x, c.g.p2.x], hp: [c.g.p1.hp, c.g.p2.hp], tick: c.g.tick };
    };
    const off = rngDe(undefined);
    const on = rngDe(LIGADA);
    expect(on.leituras.p2).toBe(0); // CPU no P2: nunca lida
    expect(off.leituras.p2).toBe(0);
    expect(on.x).toEqual(off.x);
    expect(on.hp).toEqual(off.hp);
    expect(on.tick).toBe(off.tick);
  });

  it('CPU x CPU: a fonte não é chamada nunca, com ou sem flag', () => {
    for (const m of [undefined, LIGADA]) {
      const c = criar(m, { cpu: 2, p1cpu: 2 });
      for (let i = 0; i < 1500; i++) c.tick();
      expect(c.mao.leituras).toEqual({ p1: 0, p2: 0 });
    }
  });

  it('treino: o alvo (P2) não é humano e não é lido; o P1 é lido com o teclado mesclado', () => {
    let leituraDoP2 = 0;
    const mesclado: boolean[] = [];
    const fonte: FonteEntradas = {
      p1: (m) => {
        mesclado.push(m);
        return { ...INPUT_VAZIO };
      },
      p2: () => {
        leituraDoP2++;
        return { ...INPUT_VAZIO };
      },
    };
    const g = new Game({ lutadores, rng: criarRng(3) });
    g.setup({ mode: 'training', c1: 'hayato', c2: 'wei-long', cpu: null, motorV2: LIGADA }, { rounds: 2, time: 99, shake: true });
    for (let i = 0; i < 60; i++) g.update(fonte);
    g.hitstop = 3;
    g.update(fonte);
    expect(leituraDoP2).toBe(0);
    expect(mesclado.every(Boolean)).toBe(true);
  });

  it('fora da fase fight (intro) a fonte não é lida no congelamento', () => {
    let leituras = 0;
    const fonte: FonteEntradas = { p1: () => (leituras++, { ...INPUT_VAZIO }), p2: () => (leituras++, { ...INPUT_VAZIO }) };
    const g = new Game({ lutadores, rng: criarRng(3) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: 'wei-long', cpu: null, motorV2: LIGADA }, { rounds: 2, time: 99, shake: true });
    g.hitstop = 5;
    for (let i = 0; i < 5; i++) g.update(fonte);
    expect(g.phase).toBe('intro');
    expect(leituras).toBe(0);
  });
});

describe('V2-3c: o botão ESQ também não se perde no hitstop (o spSeg é estado segurado, não borda: já chega ao 1º tick acionável)', () => {
  /** Dois parados e um congelamento de 4 ticks (de outro acerto); o P1 aperta ESQ no tick `k` do congelamento. */
  function esqNoCongelamento(motorV2: MotorV2 | undefined, esquiva: boolean, k: number) {
    const c = criar(motorV2, { esquiva });
    aproximar(c.g);
    c.g.p1.x = 300;
    c.g.p1.en = 100; // a esquiva custa energia
    c.g.hitstop = 4;
    for (let i = 1; i <= 4; i++) c.tick(i === k ? { esq: true } : {});
    c.tick(); // 1º tick acionável
    return c;
  }

  for (const k of [1, 2, 3, 4]) {
    it(`com a flag e a esquiva LIGADAS, ESQ no tick ${k} do hitstop vira esquiva (4 de 4)`, () => {
      const c = esqNoCongelamento(LIGADA, true, k);
      expect(c.eventos.filter((e) => e.tipo === 'esquiva')).toHaveLength(1);
      expect(c.g.p1.state).toBe('esquiva');
    });

    it(`flag DESLIGADA (hoje): ESQ no tick ${k} do hitstop se perde`, () => {
      const c = esqNoCongelamento(undefined, true, k);
      expect(c.eventos.filter((e) => e.tipo === 'esquiva')).toHaveLength(0);
      expect(c.g.p1.state).not.toBe('esquiva');
    });
  }

  it('com a esquiva DESLIGADA na partida, o ESQ guardado no congelamento é ignorado (nada de esquiva escondida)', () => {
    const c = esqNoCongelamento(LIGADA, false, 2);
    expect(c.eventos.filter((e) => e.tipo === 'esquiva')).toHaveLength(0);
    expect(c.g.p1.state).not.toBe('esquiva');
  });

  it('ESQ no 1º tick de um hitstop de 3 ainda vira esquiva no 1º tick acionável', () => {
    const c = criar(LIGADA, { esquiva: true });
    aproximar(c.g);
    c.g.p1.en = 100;
    c.g.hitstop = 3;
    c.tick({ esq: true });
    c.tick();
    c.tick();
    c.tick();
    expect(c.g.p1.state).toBe('esquiva');
  });
});

describe('V2-1: a flag desligada é o motor de antes', () => {
  it('sem a flag a fonte NÃO é lida em tick congelado (o contrato de FonteEntradas continua valendo)', () => {
    const c = criar(undefined);
    aproximar(c.g);
    c.g.hitstop = 3;
    const antes = { ...c.mao.leituras };
    c.tick();
    c.tick();
    c.tick();
    expect(c.mao.leituras).toEqual(antes);
  });

  it('CPU x CPU de 3000 ticks, semente 42: o resultado é idêntico com e sem a flag', () => {
    const rodar = (m: MotorV2 | undefined) => {
      const g = new Game({ lutadores, rng: criarRng(42) });
      g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 3, p1cpu: 3, esquiva: true, ...(m ? { motorV2: m } : {}) }, { rounds: 2, time: 99, shake: true });
      const sem: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
      const eventos: string[] = [];
      for (let i = 0; i < 3000; i++) {
        g.update(sem);
        for (const e of g.events) eventos.push(e.tipo);
      }
      return { eventos, hp: [g.p1.hp, g.p2.hp], x: [g.p1.x, g.p2.x], tick: g.tick, t: g.t };
    };
    expect(rodar(LIGADA)).toEqual(rodar(undefined));
  });
});

describe('V2-1: a flag nas Regras e na cfg da UI', () => {
  it('desligada por padrão: REGRAS_PADRAO não carrega a flag e a cfg fica sem a chave motorV2', () => {
    expect(REGRAS_PADRAO.motorV2).toBeUndefined();
    expect(cfgMotorV2(REGRAS_PADRAO)).toEqual({});
    expect(cfgMotorV2({ motorV2: {} })).toEqual({});
    expect(cfgMotorV2({ motorV2: { entradaNoHitstop: false } })).toEqual({});
    const run = { c1: 'hayato', diff: 1, idx: 0, etapas: [{ id: 'wei-long', chefe: false }] } as unknown as CampanhaArcade;
    expect('motorV2' in cfgDaEtapa(run, false, REGRAS_PADRAO)).toBe(false);
  });

  it('ligada nas Regras, vai para a cfg das lutas do ARCADE', () => {
    const regras = { ...REGRAS_PADRAO, motorV2: LIGADA };
    expect(cfgMotorV2(regras)).toEqual({ motorV2: LIGADA });
    const run = { c1: 'hayato', diff: 1, idx: 0, etapas: [{ id: 'wei-long', chefe: false }] } as unknown as CampanhaArcade;
    expect(cfgDaEtapa(run, false, regras).motorV2).toEqual(LIGADA);
  });
});
