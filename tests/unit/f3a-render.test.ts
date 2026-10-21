import { describe, expect, it } from 'vitest';
import type { ArteLutador, Elenco } from '../../src/assets/elenco';
import type { EventoLuta, LeituraLuta, LutadorLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { BAATAR, HAYATO, NILA } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { Efeitos } from '../../src/render/efeitos';
import { desenharHUD } from '../../src/render/hud';
import { chDaFicha, desenharLutador } from '../../src/render/lutador';
import { ETIQUETA_POSTURA, posturaDe } from '../../src/render/postura';
import type { Ctx } from '../../src/render/tela';

/*
 * F3a: o render trata os eventos novos da E3 (rebote, parry, quebra-guarda, carga, troca-ficha, contraEspecial), honra
 * `pose.flip` -1, usa `Object.hasOwn` em chDaFicha e mostra a postura da NILA (GAJA/SARPA) no HUD.
 */

const texto = (s: string) => ({ x: 100, y: 120, s, col: '#fff', size: 24 });

describe('Efeitos.reagir: eventos novos da E3', () => {
  const novo = () => new Efeitos(criarRng(5));

  it('rebote: poeira rente ao chão, no x do quique (a parede), sem texto', () => {
    const e = novo();
    e.reagir({ tipo: 'rebote', lutador: 0, x: 60 });
    expect(e.particulas).toHaveLength(12);
    expect(e.particulas.every((p) => p.dust === true && Math.abs(p.x - 60) <= 42)).toBe(true);
    expect(e.impactos).toHaveLength(0);
    expect(e.textos).toHaveLength(0);
  });

  it('parry: 14 faíscas brancas, rajada grande branca em (x, y) e o texto PARADA!', () => {
    const e = novo();
    e.reagir({ tipo: 'parry', atacante: 1, defensor: 0, x: 300, y: 250, texto: texto('PARADA!') });
    expect(e.particulas).toHaveLength(14);
    expect(e.particulas.every((p) => p.col === '#fff' || p.col === '#ffffff')).toBe(true);
    expect(e.impactos).toHaveLength(1);
    expect(e.impactos[0]).toMatchObject({ x: 300, y: 250, big: true, col: '#ffffff' });
    expect(e.textos.map((t) => t.s)).toEqual(['PARADA!']);
  });

  it('quebra-guarda: 12 faíscas vermelhas, rajada grande vermelha e o texto', () => {
    const e = novo();
    e.reagir({ tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 500, y: 240, texto: texto('GUARDA QUEBRADA!') });
    expect(e.particulas).toHaveLength(12);
    expect(e.particulas.every((p) => p.col === '#ff4a3a' || p.col === '#fff')).toBe(true);
    expect(e.impactos[0]).toMatchObject({ big: true, col: '#ff4a3a' });
    expect(e.textos.map((t) => t.s)).toEqual(['GUARDA QUEBRADA!']);
  });

  it('carga: o pulso cresce com o nível (mais faíscas) e o nível 3 ganha estrela grande; sem a posição é ignorado', () => {
    const onde = (i: 0 | 1) => ({ x: 200 + i * 400, y: 470 });
    const contar = (nivel: 1 | 2 | 3): { n: number; grande: boolean } => {
      const e = novo();
      e.reagir({ tipo: 'carga', lutador: 0, nivel }, onde);
      return { n: e.particulas.length, grande: e.impactos[0]?.big === true };
    };
    expect(contar(1)).toEqual({ n: 8, grande: false });
    expect(contar(2)).toEqual({ n: 12, grande: false });
    expect(contar(3)).toEqual({ n: 16, grande: true });
    const e = novo();
    e.reagir({ tipo: 'carga', lutador: 0, nivel: 2 });
    expect(e.particulas).toHaveLength(0);
  });

  it('carga: o brilho nasce no corpo de QUEM carrega (índice do evento)', () => {
    const e = novo();
    e.reagir({ tipo: 'carga', lutador: 1, nivel: 1 }, (i) => ({ x: i === 1 ? 700 : 100, y: 470 }));
    expect(e.impactos[0]).toMatchObject({ x: 700, y: 370 });
  });

  it('troca-ficha: flash e fumaça no lutador; a cor da estrela diz para onde foi (SARPA verde, GAJA dourada)', () => {
    const onde = () => ({ x: 400, y: 470 });
    const sarpa = novo();
    sarpa.reagir({ tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' }, onde);
    expect(sarpa.particulas.filter((p) => !p.dust)).toHaveLength(16);
    expect(sarpa.particulas.filter((p) => p.dust)).toHaveLength(9);
    expect(sarpa.impactos[0]?.col).toBe('#9cffc8');
    const gaja = novo();
    gaja.reagir({ tipo: 'troca-ficha', lutador: 0, ficha: null }, onde);
    expect(gaja.impactos[0]?.col).toBe('#ffd27a');
    const sem = novo();
    sem.reagir({ tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' });
    expect(sem.particulas).toHaveLength(0);
  });

  it('a fumaça sobe e some sozinha', () => {
    const e = novo();
    e.reagir({ tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' }, () => ({ x: 400, y: 470 }));
    const y0 = e.particulas.filter((p) => p.dust).map((p) => p.y);
    e.avancar();
    e.avancar();
    expect(e.particulas.filter((p) => p.dust).every((p, i) => p.y < (y0[i] as number))).toBe(true);
    for (let i = 0; i < 60; i++) e.avancar();
    expect(e.particulas).toHaveLength(0);
  });

  it('hit.contraEspecial: a rajada é maior (2 estrelas grandes, 32 faíscas) e o texto do evento sai; sem a flag, tudo como antes', () => {
    const hit = (extra: Partial<Extract<EventoLuta, { tipo: 'hit' }>>): EventoLuta => ({
      tipo: 'hit', atacante: 0, defensor: 1, x: 300, y: 250, cor: '#ffd84a', grande: false, snd: 'punch', pitch: 1,
      contragolpe: true, projetil: false, acertos: 1, texto: texto("COUP D'ARRÊT!"), ...extra,
    });
    const comum = novo();
    comum.reagir(hit({}));
    expect(comum.particulas).toHaveLength(18);
    expect(comum.impactos).toHaveLength(1);
    const especial = novo();
    especial.reagir(hit({ contraEspecial: true }));
    expect(especial.particulas).toHaveLength(32);
    expect(especial.impactos).toHaveLength(3);
    expect(especial.impactos.filter((i) => i.big)).toHaveLength(2);
    expect(especial.textos.map((t) => t.s)).toEqual(["COUP D'ARRÊT!"]);
  });
});

describe('chDaFicha: Object.hasOwn', () => {
  const nila = montarLutador(NILA, { idle0: { x: 0, y: 0, w: 100, h: 410, ax: 50 }, guard: { x: 0, y: 0, w: 100, h: 410, ax: 50 } } as Poses);

  it('ficha existente devolve a ficha; null e desconhecida caem no base', () => {
    expect(chDaFicha(nila, 'sarpa')).toBe(nila.fichas['sarpa']);
    expect(chDaFicha(nila, null)).toBe(nila);
    expect(chDaFicha(nila, 'nao-existe')).toBe(nila);
  });

  it("nome herdado de Object.prototype ('toString', 'constructor', '__proto__') não é ficha", () => {
    for (const nome of ['toString', 'constructor', 'hasOwnProperty', '__proto__']) expect(chDaFicha(nila, nome), nome).toBe(nila);
  });
});

describe('pose.flip -1 (corrida de costas do RESORTE)', () => {
  const poses: Poses = { guard: { x: 8, y: 8, w: 289, h: 410, ax: 137 }, idle0: { x: 8, y: 8, w: 289, h: 410, ax: 137 } };
  const ch = montarLutador(HAYATO, poses);
  const IMG = {} as unknown as CanvasImageSource;
  const arte: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
  const leitura = (facing: 1 | -1, flip: 1 | -1): LutadorLeitura =>
    ({
      id: 'hayato', indice: 0, x: 300, y: 470, facing, state: 'move',
      pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip },
      move: null, mt: 0, hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0,
      maxCombo: 0, dmgTaken: 0, combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null,
      barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0,
    }) as LutadorLeitura;

  /** Escalas horizontais aplicadas antes de cada drawImage do corpo (o último drawImage de alfa 1 é o corpo). */
  function escalasX(l: LutadorLeitura): number[] {
    const escalas: number[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(_, nome: string) {
        if (nome === 'scale') return (sx: number) => escalas.push(sx);
        if (nome === 'createRadialGradient' || nome === 'createLinearGradient') return () => ({ addColorStop: () => undefined });
        return () => undefined;
      },
      set: () => true,
    }) as unknown as Ctx;
    desenharLutador(ctx, l, ch, arte);
    return escalas;
  }

  it('facing 1: flip 1 desenha de frente (+1) e flip -1 espelha (-1); facing -1 inverte os dois', () => {
    expect(escalasX(leitura(1, 1))).toContain(1);
    expect(escalasX(leitura(1, 1))).not.toContain(-1);
    expect(escalasX(leitura(1, -1))).toContain(-1);
    expect(escalasX(leitura(-1, 1))).toContain(-1);
    expect(escalasX(leitura(-1, -1))).toContain(1);
    expect(escalasX(leitura(-1, -1))).not.toContain(-1);
  });
});

describe('HUD: postura da NILA (GAJA/SARPA)', () => {
  const poses: Poses = { guard: { x: 8, y: 8, w: 289, h: 410, ax: 137 }, idle0: { x: 8, y: 8, w: 289, h: 410, ax: 137 } };
  const nila = montarLutador(NILA, poses);
  const hayato = montarLutador(HAYATO, poses);
  const baatar = montarLutador(BAATAR, poses);

  it('posturaDe: só quem tem a ficha sarpa; null/ausente = GAJA; as fichas do chefão não são postura', () => {
    expect(posturaDe(nila, null)).toBe('gaja');
    expect(posturaDe(nila, undefined)).toBe('gaja');
    expect(posturaDe(nila, 'sarpa')).toBe('sarpa');
    expect(posturaDe(hayato, null)).toBeNull();
    expect(posturaDe(baatar, 'chefe2')).toBeNull();
  });

  const lutador = (id: string, indice: 0 | 1, ficha: string | null): LutadorLeitura =>
    ({
      id, indice, x: 300, y: 470, facing: 1, state: 'idle', pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 },
      move: null, mt: 0, hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
      combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha, nivelCarga: 0,
    }) as unknown as LutadorLeitura;
  const elenco = {
    hayato: { ch: hayato, arte: { retrato: () => null } },
    nila: { ch: nila, arte: { retrato: () => null } },
  } as unknown as Elenco;

  function textosDoHud(a: LutadorLeitura, b: LutadorLeitura): string[] {
    const textos: string[] = [];
    const ctx = new Proxy({} as Record<string, unknown>, {
      get(_, n: string) {
        if (n === 'measureText') return () => ({ width: 10 });
        if (n === 'createLinearGradient' || n === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
        if (n === 'fillText') return (t: string) => textos.push(t);
        return () => undefined;
      },
      set: () => true,
    }) as unknown as CanvasRenderingContext2D;
    const luta = {
      fighters: [a, b], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2, cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100,
      shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp', winner: null, matchWinner: null, matchDone: false, perfect: false,
      trainInfo: { hits: 0, dmg: 0 }, events: [],
    } as unknown as LeituraLuta;
    desenharHUD(ctx, luta, elenco);
    return textos;
  }

  it('a NILA em GAJA mostra "GAJA"; depois de trocar, "SARPA"; o outro lutador não ganha etiqueta', () => {
    const gaja = textosDoHud(lutador('nila', 0, null), lutador('hayato', 1, null));
    expect(gaja).toContain('GAJA');
    expect(gaja).not.toContain('SARPA');
    const sarpa = textosDoHud(lutador('nila', 0, 'sarpa'), lutador('hayato', 1, null));
    expect(sarpa).toContain('SARPA');
    expect(sarpa).not.toContain('GAJA');
    expect(textosDoHud(lutador('hayato', 0, null), lutador('hayato', 1, null)).some((t) => t === 'GAJA' || t === 'SARPA')).toBe(false);
  });

  it('a NILA no lado 2 também mostra a postura', () => {
    expect(textosDoHud(lutador('hayato', 0, null), lutador('nila', 1, 'sarpa'))).toContain('SARPA');
  });
});

describe('HUD: legibilidade no celular deitado (E7a)', () => {
  // menor tela deitada medida: 844x390 -> o canvas 960x540 vira 693x390 CSS (0,722 por px lógico); alvo ~12 px CSS
  const ESCALA_MIN = 390 / 540;
  const poses: Poses = { guard: { x: 8, y: 8, w: 289, h: 410, ax: 137 }, idle0: { x: 8, y: 8, w: 289, h: 410, ax: 137 } };
  const elenco = {
    nila: { ch: montarLutador(NILA, poses), arte: { retrato: () => null } },
    baatar: { ch: montarLutador(BAATAR, poses), arte: { retrato: () => null } },
  } as unknown as Elenco;
  const lutador = (id: string, indice: 0 | 1, extra: Partial<LutadorLeitura>): LutadorLeitura =>
    ({
      id, indice, x: 300, y: 470, facing: 1, state: 'idle', pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 },
      move: null, mt: 0, hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
      combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
    }) as unknown as LutadorLeitura;

  /** Corpo (px lógicos) com que cada texto foi desenhado. */
  function fontes(a: LutadorLeitura, b: LutadorLeitura): Map<string, number> {
    const vistas = new Map<string, number>();
    const estado: Record<string, unknown> = {};
    const ctx = new Proxy(estado, {
      get(_, n: string) {
        if (n === 'measureText') return () => ({ width: 10 });
        if (n === 'createLinearGradient' || n === 'createRadialGradient') return () => ({ addColorStop: () => undefined });
        if (n === 'fillText') return (t: string) => vistas.set(t, parseFloat(/([\d.]+)px/.exec(String(estado['font']))?.[1] ?? '0'));
        return estado[n] ?? (() => undefined);
      },
      set(_, n: string, v) {
        estado[n] = v;
        return true;
      },
    }) as unknown as CanvasRenderingContext2D;
    const luta = {
      fighters: [a, b], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2, cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100,
      shake: 0, hitstop: 0, mode: 'arcade', training: false, stage: 'jp', winner: null, matchWinner: null, matchDone: false, perfect: false,
      trainInfo: { hits: 0, dmg: 0 }, events: [],
    } as unknown as LeituraLuta;
    desenharHUD(ctx, luta, elenco);
    return vistas;
  }

  it('etiqueta GAJA/SARPA e rótulo CHEFÃO passam de 12 px CSS na menor tela deitada; a etiqueta cabe antes das bolinhas', () => {
    const f = fontes(lutador('nila', 0, {}), lutador('baatar', 1, { chefe: true, barras: 2, barrasMax: 2 }));
    expect((f.get('GAJA') ?? 0) * ESCALA_MIN).toBeGreaterThanOrEqual(12);
    expect((f.get('000000  CHEFÃO') ?? 0) * ESCALA_MIN).toBeGreaterThanOrEqual(12);
    expect((f.get('×2') ?? 0) * ESCALA_MIN).toBeGreaterThanOrEqual(12);
    // lado 1: etiqueta de 236 a 236+w; a bolinha mais à esquerda de 3 rounds começa em 424-2*20-7 = 377
    expect(236 + ETIQUETA_POSTURA.w).toBeLessThan(377);
  });

  it('as linhas dos lutadores comuns seguem as do protótipo (14 px): fidelidade pixel a pixel', () => {
    const f = fontes(lutador('nila', 0, {}), lutador('baatar', 1, {}));
    expect(f.get('000000  CPU') ?? f.get('000000  2P')).toBe(14);
    expect(f.get('1P  000000')).toBe(14);
  });
});
