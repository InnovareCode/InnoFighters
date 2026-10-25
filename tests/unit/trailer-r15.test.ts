import { describe, expect, it } from 'vitest';
import type { LeituraLuta, LutadorLeitura } from '../../src/core/contratos';
import { ALTURA_LETTERBOX } from '../../src/data/trailer/tipos';
import { EntradaDoChefe } from '../../src/render/entrada-chefe';
import { HudRitmo, NOTAS } from '../../src/render/hud-ritmo';
import type { Ctx } from '../../src/render/tela';

/*
 * R-15 (UI do trailer encenado): o que a cena do trailer usa e que ganhou um modo novo. A cena em si (pixels, ticks, tarja, filme) é provada no navegador, em tests/e2e/trailer-r15.spec.ts.
 *  - `HudRitmo.desenharCombos(..., false)` pinta só o contador de acertos (o trailer não tem nota do combo);
 *  - `EntradaDoChefe.sobreposta` empilha o cartão na faixa preta de cima (a entrada do P9 corre por cima de uma luta em curso e não pode cobrir cabeça).
 */

/** Contexto que só grava chamadas e atribuições. */
function gravador() {
  const chamadas: string[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return (s: string) => ({ width: s.length * 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
      return (...a: unknown[]) => chamadas.push(`${nome}(${a.map((x) => (typeof x === 'number' ? Math.round(x * 1000) / 1000 : String(x))).join(',')})`);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push(`=${nome}:${String(valor)}`);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas };
}

function lutador(indice: 0 | 1): LutadorLeitura {
  return {
    id: indice === 0 ? 'hayato' : 'zenon', indice, x: indice === 0 ? 300 : 660, y: 470, facing: indice === 0 ? 1 : -1, state: 'idle',
    pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 }, move: null, mt: 0,
    hp: 100, maxHp: 100, hpShown: 100, en: 50, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
    combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0,
  } as unknown as LutadorLeitura;
}
function luta(): LeituraLuta {
  return {
    fighters: [lutador(0), lutador(1)], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 1,
    cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'gr', winner: null,
    matchWinner: null, matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [],
  } as unknown as LeituraLuta;
}

describe('R-15: o contador de acertos do trailer não tem nota', () => {
  /** Um combo de 5 acertos que acaba: a nota (ÓTIMO) fica 60 ticks na tela. */
  function comNotaNoAr(): { h: HudRitmo; l: LeituraLuta } {
    const l = luta();
    const h = new HudRitmo();
    l.fighters[0].combo = { hits: 5, dmg: 25, t: 60 };
    h.avancar(l);
    l.fighters[0].combo = { hits: 5, dmg: 25, t: 59 };
    h.avancar(l);
    expect(h.nota(0).patamar, 'a nota existe no HUD').toBeGreaterThanOrEqual(0);
    return { h, l };
  }

  it('com a nota (o padrão da luta) o texto da nota é pintado; sem ela (trailer) só o contador', () => {
    const { h, l } = comNotaNoAr();
    const nota = NOTAS[h.nota(0).patamar]?.palavra as string;
    const com = gravador();
    h.desenharCombos(com.ctx, l);
    expect(com.chamadas.some((c) => c.startsWith(`strokeText(${nota}`)), 'a luta mostra a nota').toBe(true);
    const sem = gravador();
    h.desenharCombos(sem.ctx, l, false);
    expect(sem.chamadas.some((c) => c.startsWith(`strokeText(${nota}`)), 'o trailer não mostra a nota').toBe(false);
    expect(sem.chamadas.some((c) => c.startsWith('strokeText(5 HITS')), 'o contador continua').toBe(true);
  });

  it('o DANGER é um desenho à parte (`desenharPerigo`): quem não o chama não o tem', () => {
    const l = luta();
    l.fighters[1].hp = 10;
    const h = new HudRitmo();
    for (let i = 0; i < 12; i++) h.avancar(l);
    expect(h.perigo(1)).toBeGreaterThan(0);
    const g = gravador();
    h.desenharCombos(g.ctx, l, false);
    expect(g.chamadas.some((c) => c.includes('DANGER'))).toBe(false);
  });
});

describe('R-15: a entrada do chefão sobreposta à luta mora na faixa preta de cima', () => {
  const cartao = { nome: 'ZENON ARGYROS', titulo: 'O ARCONTE', rodape: 'DONO DO TORNEIO' };

  /** As alturas (y) onde o texto é pintado: o `textoArcade` faz `translate(x, y)` antes de escrever. */
  const alturasDosTextos = (chamadas: readonly string[]): number[] =>
    chamadas.filter((c) => c.startsWith('translate(')).map((c) => Number(c.slice(10, -1).split(',')[1]));

  function entradaNoTick(sobreposta: boolean, tick: number): string[] {
    const e = new EntradaDoChefe();
    e.iniciar('curta', cartao, '');
    e.sobreposta = sobreposta;
    for (let i = 0; i < tick; i++) e.avancar();
    const g = gravador();
    e.desenhar(g.ctx);
    return g.chamadas;
  }

  it('a luta de sempre mantém o cartão de 100/142/184 px (a entrada normal não muda)', () => {
    const ys = alturasDosTextos(entradaNoTick(false, 25));
    expect(ys).toContain(100);
    expect(ys).toContain(142);
  });

  it('sobreposta: o nome e o título ficam acima da faixa do letterbox (y < 69) e nenhum texto cai sobre a arena', () => {
    const chamadas = entradaNoTick(true, 25);
    const ys = alturasDosTextos(chamadas);
    expect(ys.length).toBeGreaterThanOrEqual(2);
    for (const y of ys) expect(y, 'cabe na faixa de cima').toBeLessThan(ALTURA_LETTERBOX);
    expect(chamadas.some((c) => c.startsWith('strokeText(ZENON ARGYROS'))).toBe(true);
    expect(chamadas.some((c) => c.startsWith('strokeText(O ARCONTE'))).toBe(true);
  });

  it('`iniciar` e `zerar` desligam o modo (uma entrada normal depois da do trailer não herda o compacto)', () => {
    const e = new EntradaDoChefe();
    e.iniciar('curta', cartao, '');
    e.sobreposta = true;
    e.zerar();
    expect(e.sobreposta).toBe(false);
    e.sobreposta = true;
    e.iniciar('curta', cartao, '');
    expect(e.sobreposta).toBe(false);
  });
});
