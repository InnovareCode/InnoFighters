import { describe, expect, it } from 'vitest';
import type { FluidezMotor, IdLutador, InputFrame } from '../../src/core/contratos';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { AJUSTES_DE_FLUIDEZ, comDadosDeFluidez } from '../../src/data/fluidez-dados';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { FLUIDEZ_PADRAO, REGRAS_PADRAO, cfgFluidez, cfgMotorV2, fluidezDaUrl, regrasComFluidez } from '../../src/meta';
import { montarTodos } from './_lutadores';

/**
 * FLUIDEZ do motor (docs/auditoria-fidelidade-motor-2026-10-24.md §4.2): cada correção é provada com o MESMO ensaio antes (flag ausente) e depois (flag ligada),
 * em ticks de espera. Os ensaios A3 (par do super) e B2 (dash engole o golpe) da auditoria são permanentes aqui.
 */
const lutadores = montarTodos();
type Mao = Partial<InputFrame>;

const SUPER = { ritmo: { super: true } } as const;

function novo(id: IdLutador, flu: FluidezMotor | undefined, extra: Partial<ConfigPartida> = {}, distancia = 400) {
  const g = new Game({ lutadores, rng: criarRng(1) });
  g.setup({ mode: 'training', c1: id, c2: 'hayato', ...(flu ? { fluidez: flu } : {}), ...extra }, { rounds: 2, time: 99, shake: false });
  g.phase = 'fight';
  g.t = 0;
  g.trocarAlvoDoTreino('stand');
  const parado: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
  for (let i = 0; i < 3; i++) g.update(parado);
  g.p1.x = 480 - distancia / 2;
  g.p2.x = 480 + distancia / 2;
  g.p1.facing = 1;
  g.p2.facing = -1;
  return g;
}

/** Roda `ticks` ticks com o roteiro de entradas (uma mão por tick; o que não está no roteiro é solto) e devolve o que `obs` viu a cada tick. */
function rodar<T>(g: Game, roteiro: readonly (Mao | undefined)[], ticks: number, obs: (g: Game, i: number) => T): T[] {
  const log: T[] = [];
  for (let i = 0; i < ticks; i++) {
    const q = { ...INPUT_VAZIO, ...(roteiro[i] ?? {}) };
    g.update({ p1: () => ({ ...q }), p2: () => ({ ...INPUT_VAZIO }) });
    log.push(obs(g, i));
  }
  return log;
}

const primeiro = <T,>(log: readonly T[], f: (x: T) => boolean, desde = 0): number => log.findIndex((x, k) => k >= desde && f(x));

describe('M1 / ensaio A3: par do super sem espera', () => {
  const esperaDoForte = (flu: FluidezMotor | undefined, botao: 'hp' | 'hk'): number => {
    const g = novo('hayato', flu, SUPER);
    g.p1.en = 100;
    return primeiro(rodar(g, [{ [botao]: true }], 20, (x) => x.p1.state), (s) => s === 'move');
  };

  it('ANTES: com a barra cheia o forte sozinho espera 3 ticks; DEPOIS: 0', () => {
    expect(esperaDoForte(undefined, 'hp')).toBe(3);
    expect(esperaDoForte(undefined, 'hk')).toBe(3);
    expect(esperaDoForte({ parSuper: true }, 'hp')).toBe(0);
    expect(esperaDoForte({ parSuper: true }, 'hk')).toBe(0);
  });

  it('o par fechando em 0, 1 ou 2 ticks vira o super nos DOIS casos (promovido, sem esperar); com 3 ticks não', () => {
    for (const flu of [undefined, { parSuper: true } as FluidezMotor]) {
      for (const k of [0, 1, 2, 3]) {
        const g = novo('hayato', flu, SUPER);
        g.p1.en = 100;
        const roteiro: Mao[] = [{ hp: true }];
        roteiro[k] = { ...(roteiro[k] ?? {}), hk: true };
        const supers: number[] = [];
        rodar(g, roteiro, 12, (x, i) => {
          if (x.events.some((e) => e.tipo === 'special' && e.super === true)) supers.push(i);
          return 0;
        });
        if (k <= 2) {
          expect(supers, `par a ${k} ticks, fluidez=${flu ? 'ligada' : 'ausente'}`).toEqual([k]);
          expect(g.p1.en).toBeLessThan(15); // gastou a barra inteira (só sobra o regen)
        } else {
          expect(supers, `par a ${k} ticks`).toEqual([]);
          expect(g.p1.en).toBeGreaterThan(95);
        }
      }
    }
  });

  it('o super promovido é o MESMO golpe de quando o par chega junto (sDown do HAYATO), e o normal do 1º botão não deixa buffer sobrando', () => {
    const g = novo('hayato', { parSuper: true }, SUPER);
    g.p1.en = 100;
    rodar(g, [{ hp: true }, undefined, { hk: true }], 4, () => 0);
    expect(g.p1.move).toBe('sDown');
    expect(g.p1.superAtivo).toBe(true);
    expect(g.p1.buf).toBeNull();
    expect(g.p1.bufFila).toBeNull();
  });

  it('sem a barra cheia a flag não muda nada: forte sai no tick 0, nos dois casos', () => {
    for (const flu of [undefined, { parSuper: true } as FluidezMotor]) {
      const g = novo('hayato', flu, SUPER);
      g.p1.en = 60;
      expect(primeiro(rodar(g, [{ hp: true }], 5, (x) => x.p1.state), (s) => s === 'move')).toBe(0);
    }
  });
});

describe('M2 / ensaio B2: o ataque cancela o dash', () => {
  /** Dash por duplo toque no tick 5; `lp` apertado `k` ticks depois do início. Devolve a espera até o golpe começar (ou null se foi PERDIDO). */
  const esperaDoGolpe = (flu: FluidezMotor | undefined, k: number): number | null => {
    const g = novo('hayato', flu);
    g.p1.en = 50;
    const R: Mao[] = [{ right: true }, { right: true }, { right: true }, {}, {}];
    for (let i = 5; i < 60; i++) R[i] = { right: true };
    R[5 + k] = { right: true, lp: true };
    const log = rodar(g, R, 60, (x) => x.p1.state);
    expect(log[5]).toBe('dash'); // o duplo toque vale no teclado (sem `toque`)
    const i = primeiro(log, (s) => s === 'move', 6);
    return i < 0 ? null : i - (5 + k);
  };

  it('ANTES: lp nos 8 primeiros ticks do dash é PERDIDO (buffer de 9 < dash de 16); depois atrasa até 8', () => {
    for (const k of [1, 2, 3, 4, 5, 6, 8]) expect(esperaDoGolpe(undefined, k), `k=${k}`).toBeNull();
    expect(esperaDoGolpe(undefined, 9)).toBe(8);
    expect(esperaDoGolpe(undefined, 12)).toBe(5);
  });

  it('DEPOIS: nenhum golpe se perde; o aperto cedo espera só até o tick 4 do dash e o resto sai na hora', () => {
    const flu = { dashCancela: true };
    expect(esperaDoGolpe(flu, 1)).toBe(3);
    expect(esperaDoGolpe(flu, 2)).toBe(2);
    expect(esperaDoGolpe(flu, 3)).toBe(1);
    for (const k of [4, 5, 6, 8, 9, 12]) expect(esperaDoGolpe(flu, k), `k=${k}`).toBe(0);
  });

  it('o recuo (dash para trás) só cancela depois da invulnerabilidade de 6 ticks', () => {
    const g = novo('hayato', { dashCancela: true });
    g.p1.en = 50;
    const R: Mao[] = [{ left: true }, { left: true }, { left: true }, {}, {}];
    for (let i = 5; i < 40; i++) R[i] = { left: true };
    R[7] = { left: true, lp: true };
    const log = rodar(g, R, 40, (x) => x.p1.state);
    expect(log[5]).toBe('dash');
    expect(primeiro(log, (s) => s === 'move', 6)).toBe(5 + 6); // st >= 6
  });
});

describe('M5 / ensaio B1: sem dash por duplo toque no celular', () => {
  const oscilar = (flu: FluidezMotor | undefined): readonly string[] => {
    const g = novo('hayato', flu);
    g.p1.en = 50;
    // joystick perto do limiar: direita 5 ticks, solta 2, direita de novo
    const R: Mao[] = [];
    for (let i = 0; i < 5; i++) R.push({ right: true });
    R.push({}, {});
    for (let i = 0; i < 30; i++) R.push({ right: true });
    return rodar(g, R, 40, (x) => x.p1.state);
  };

  it('ANTES e no teclado: a oscilação vira dash. DEPOIS e no toque: continua andando', () => {
    expect(oscilar(undefined)).toContain('dash');
    expect(oscilar({ semDashNoToque: true })).toContain('dash'); // sem o sinal `toque` (teclado/controle) o duplo toque segue valendo
    expect(oscilar({ semDashNoToque: true, toque: true })).not.toContain('dash');
    expect(oscilar({ toque: true })).toContain('dash'); // `toque` sozinho não muda nada
  });
});

describe('M3: buffer de 2 vagas (fila)', () => {
  const sequencia = (flu: FluidezMotor | undefined): string[] => {
    const g = novo('hayato', flu, {}, 90);
    const seq: string[] = [];
    rodar(g, [{ lp: true }, { hp: true }, { hk: true }], 40, (x) => {
      if (x.p1.state === 'move' && x.p1.move && seq[seq.length - 1] !== x.p1.move) seq.push(x.p1.move);
      return 0;
    });
    return seq;
  };

  it('ANTES: o mais novo vence (lp, hp, hk apertados em sequência viram lp > hk); DEPOIS: ordem de chegada (lp > hp)', () => {
    expect(sequencia(undefined).slice(0, 2)).toEqual(['lp', 'hk']);
    expect(sequencia({ fila: true }).slice(0, 2)).toEqual(['lp', 'hp']);
  });
});

describe('M6: agarrão por SOCO FRACO + CHUTE FRACO', () => {
  const quando = (flu: FluidezMotor | undefined, k: number): { throwEm: number | null; golpe: string | null } => {
    const g = novo('hayato', flu, {}, 90);
    const R: Mao[] = [{ lp: true }];
    R[k] = { ...(R[k] ?? {}), lk: true };
    const log = rodar(g, R, 30, (x) => x.p1.move);
    const i = primeiro(log, (m) => m === 'throw');
    return { throwEm: i < 0 ? null : i, golpe: log.find((m) => m !== null) ?? null };
  };

  it('ANTES: o par sai como lp (ou lk); DEPOIS: agarra no tick em que o par fecha (0, 1 ou 2 ticks), sem esperar', () => {
    for (const k of [0, 1, 2]) {
      expect(quando(undefined, k).throwEm, `antes k=${k}`).toBeNull();
      expect(quando({ agarraoPar: true }, k).throwEm, `depois k=${k}`).toBe(k);
    }
    expect(quando({ agarraoPar: true }, 3).throwEm).toBeNull(); // 3 ticks já não é par
  });

  it('longe do rival (fora do alcance) o par não agarra: sai o normal', () => {
    const g = novo('hayato', { agarraoPar: true }, {}, 300);
    const log = rodar(g, [{ lp: true, lk: true }], 20, (x) => x.p1.move);
    expect(log).not.toContain('throw');
  });

  it('semAgarraoPorFrente + toque: o → + SOCO FORTE de um humano deixa de agarrar; sem o sinal de toque continua agarrando', () => {
    const golpe = (flu: FluidezMotor | undefined): string | null => {
      const g = novo('hayato', flu, {}, 90);
      return rodar(g, [{ right: true, hp: true }], 10, (x) => x.p1.move).find((m) => m !== null) ?? null;
    };
    expect(golpe(undefined)).toBe('throw');
    expect(golpe({ semAgarraoPorFrente: true })).toBe('throw'); // sem `toque`
    expect(golpe({ semAgarraoPorFrente: true, toque: true })).toBe('hp');
  });
});

describe('D1: dados do BAATAR atrás da flag', () => {
  it('ANTES: ARREMESSO DO AVARGA R 36; DEPOIS: 28, no golpe e em `sps`; o objeto do elenco nunca muda', () => {
    expect(novo('baatar', undefined).p1.ch.moves.sFire.R).toBe(36);
    const g = novo('baatar', { dados: true });
    expect(g.p1.ch.moves.sFire.R).toBe(28);
    expect(g.p1.ch.sps.find((s) => s.name === g.p1.ch.moves.sFire.name)?.R).toBe(28);
    expect(lutadores.baatar.moves.sFire.R).toBe(36);
    expect(comDadosDeFluidez(lutadores.baatar)).toBe(comDadosDeFluidez(lutadores.baatar)); // memoizado
  });

  it('só quem NÃO é um dos 4 originais do protótipo recebe ajuste (o oráculo compara esses campo a campo)', () => {
    for (const original of ['hayato', 'wei-long', 'min-ji', 'caio'] as const) expect(AJUSTES_DE_FLUIDEZ[original]).toBeUndefined();
    for (const id of ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu'] as const) expect(comDadosDeFluidez(lutadores[id])).toBe(lutadores[id]);
  });
});

describe('desligada = o motor de antes, bit a bit', () => {
  /** Uma luta CPU x CPU de 1500 ticks; devolve um resumo de tudo o que importa. */
  const lutar = (flu: FluidezMotor | undefined): string => {
    const g = new Game({ lutadores, rng: criarRng(42) });
    g.setup({ mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2, p1cpu: 2, ...(flu ? { fluidez: flu } : {}) }, { rounds: 2, time: 99, shake: false });
    const parado: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
    let tipos = '';
    for (let i = 0; i < 1500; i++) {
      g.update(parado);
      tipos += g.events.length;
    }
    return JSON.stringify([g.p1.hp, g.p2.hp, g.p1.en, g.p2.en, g.p1.x, g.p2.x, g.tick, g.round, tipos]);
  };

  it('`fluidez: {}` e todas as chaves falsas dão a MESMA luta que a chave ausente', () => {
    const base = lutar(undefined);
    expect(lutar({})).toBe(base);
    expect(lutar({ parSuper: false, dashCancela: false, fila: false, agarraoPar: false, dados: false })).toBe(base);
    expect(lutar({ toque: true })).toBe(base);
  });

  it('o ritmo.super desligado com a fluidez ligada também não muda a CPU (o par nem existe)', () => {
    expect(lutar({ parSuper: true })).toBe(lutar(undefined));
  });
});

describe('Regras e URL da fluidez', () => {
  it('REGRAS_PADRAO liga a fluidez (menos semAgarraoPorFrente, que espera o botão AGARRAR no toque)', () => {
    expect(REGRAS_PADRAO.fluidez).toEqual(FLUIDEZ_PADRAO);
    expect(FLUIDEZ_PADRAO).toMatchObject({ parSuper: true, dashCancela: true, semDashNoToque: true, fila: true, agarraoPar: true, dados: true, semAgarraoPorFrente: false });
  });

  it('cfgMotorV2 leva a fluidez junto (select, diff e campanha herdam sem mudar); só `toque` não conta', () => {
    expect(cfgMotorV2(REGRAS_PADRAO).fluidez).toEqual(FLUIDEZ_PADRAO);
    expect(cfgFluidez({})).toEqual({});
    expect(cfgFluidez({ fluidez: { toque: true } })).toEqual({});
    expect(cfgFluidez({ fluidez: {} })).toEqual({});
    expect(cfgMotorV2({})).toEqual({});
  });

  it('?fluidez= : ausente/1 = padrão, 0 = desligada, lista = só essas, desconhecido = padrão', () => {
    expect(fluidezDaUrl('')).toEqual(FLUIDEZ_PADRAO);
    expect(fluidezDaUrl('?fluidez=1')).toEqual(FLUIDEZ_PADRAO);
    for (const v of ['0', 'off', 'false', 'nao', 'não']) expect(fluidezDaUrl(`?fluidez=${v}`)).toEqual({});
    expect(fluidezDaUrl('?fluidez=par,dash')).toEqual({ parSuper: true, dashCancela: true });
    expect(fluidezDaUrl('?fluidez=dados')).toEqual({ dados: true });
    expect(fluidezDaUrl('?fluidez=xyz')).toEqual(FLUIDEZ_PADRAO);
    expect(fluidezDaUrl('?fluidez=par,xyz')).toEqual(FLUIDEZ_PADRAO);
  });

  it('regrasComFluidez: o sinal de toque entra só com alguma flag ligada; `?fluidez=0` não deixa nada (nem toque)', () => {
    expect(regrasComFluidez(REGRAS_PADRAO, '', false).fluidez).toEqual(FLUIDEZ_PADRAO);
    expect(regrasComFluidez(REGRAS_PADRAO, '', true).fluidez).toEqual({ ...FLUIDEZ_PADRAO, toque: true });
    expect(regrasComFluidez(REGRAS_PADRAO, '?fluidez=0', true).fluidez).toEqual({});
    expect(REGRAS_PADRAO.fluidez).toEqual(FLUIDEZ_PADRAO); // não muta a entrada
  });

  it('o jogo com toque e a fluidez padrão leva `toque` à Game (o sinal chega ao motor)', () => {
    const cfg = { mode: 'training', c1: 'hayato', c2: 'caio', ...cfgMotorV2(regrasComFluidez(REGRAS_PADRAO, '', true)) } as ConfigPartida;
    const g = new Game({ lutadores, rng: criarRng(1) });
    g.setup(cfg, { rounds: 2, time: 99, shake: false });
    expect(g.fluidez?.toque).toBe(true);
    expect(g.fluidez?.parSuper).toBe(true);
  });
});
