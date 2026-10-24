import { describe, expect, it } from 'vitest';
import { TeclasVirtuais } from '../../src/input/teclas';
import { direcoesDoKnob, ligarToque, limitarKnob } from '../../src/input/toque';
import { cena, PROD } from './_filme';

/*
 * ENSAIOS ANTES/DEPOIS do toque (U1 joystick com zonas + histerese + soltura mínima, U2 trava de 1 tick, U4 filtro do `spSeg`), em
 * trajetórias simuladas de polegar com semente fixa (mesmos números a cada rodada). "ANTES" = o joystick do protótipo reimplementado AQUI
 * (limiares |dx|>25%, cima>35%, baixo>30%, cada eixo sozinho, solta na hora) — o código antigo já não existe em `toque.ts`.
 * "DEPOIS" = a camada REAL (`ligarToque` + `TeclasVirtuais`), com o mesmo clock de ticks do jogo (`fimDoTick`). Os números vão no console
 * (`npx vitest run tests/unit/toque-fluidez.test.ts --reporter=verbose`) e no handoff; as asserções fixam o que tem de continuar valendo.
 * docs/auditoria-fidelidade-motor-2026-10-24.md §1.2 e §4.1.
 */

// ---------------------------------------------------------------------------------------------------------------- sorteio e trajetórias
function mulberry32(a: number): () => number {
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const normal = (rnd: () => number): number => Math.sqrt(-2 * Math.log(1 - rnd())) * Math.cos(2 * Math.PI * rnd());

type Ponto = { r: number; graus: number }; // fração do raio e ângulo em graus (0 = direita; positivo = para CIMA)
const paraDxDy = (p: Ponto): [number, number] => [p.r * Math.cos((p.graus * Math.PI) / 180), -p.r * Math.sin((p.graus * Math.PI) / 180)];

/** Um polegar que EMPURRA PARA A DIREITA por `ticks` ticks: deriva angular lenta (arco do polegar), tremor e variação de pressão. */
function empurraDireita(rnd: () => number, ticks: number, pressao: number, derivaMax: number): Ponto[] {
  const base = (rnd() * 2 - 1) * derivaMax; // deriva média do jeito de segurar
  const fase = rnd() * Math.PI * 2;
  const saida: Ponto[] = [];
  let ruidoR = 0;
  let ruidoA = 0;
  for (let t = 0; t < ticks; t++) {
    ruidoR = ruidoR * 0.85 + normal(rnd) * 0.035; // ruído de pressão, correlacionado (passa-baixa)
    ruidoA = ruidoA * 0.85 + normal(rnd) * 1.2;
    saida.push({ r: Math.min(0.85, Math.max(0, pressao + ruidoR)), graus: base + 6 * Math.sin(fase + t / 14) + ruidoA });
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------------------------- ANTES (o protótipo)
type Dir = { left: boolean; right: boolean; up: boolean; down: boolean };
const antes = (p: Ponto): Dir => {
  const [dx, dy] = paraDxDy(p);
  return { left: dx < -0.25, right: dx > 0.25, up: dy < -0.35, down: dy > 0.3 };
};

// ---------------------------------------------------------------------------------------------------------------- DEPOIS (a camada real)
class ElFalso extends EventTarget {
  readonly classes = new Set<string>();
  readonly style = { transform: '' };
  readonly classList = { add: (c: string) => this.classes.add(c), remove: (c: string) => this.classes.delete(c) };
  constructor(private readonly dataK: string | null = null, private readonly dataNivel: string | null = null) {
    super();
  }
  getAttribute(n: string): string | null {
    return n === 'data-k' ? this.dataK : n === 'data-nivel' ? this.dataNivel : null;
  }
  getBoundingClientRect(): { left: number; top: number; width: number; height: number } {
    return { left: 0, top: 0, width: 100, height: 100 };
  }
}
function camada(nivelDoEspecial: string | null = null) {
  const joy = new ElFalso();
  const knob = new ElFalso();
  const r1 = new ElFalso('b', nivelDoEspecial);
  const alvo = {
    ontouchstart: null,
    navigator: { maxTouchPoints: 5 },
    document: { body: new ElFalso(), querySelectorAll: () => [r1], getElementById: (id: string) => (id === 'joy' ? joy : id === 'knob' ? knob : null) },
  } as unknown as Window;
  const teclas = new TeclasVirtuais();
  ligarToque({ alvo, teclas, canvas: new ElFalso() as unknown as HTMLCanvasElement, aoTecla: () => undefined });
  const disparar = (el: ElFalso, tipo: string, x: number, y: number): void => {
    const dedos = [{ identifier: 1, clientX: 50 + x * 50, clientY: 50 + y * 50 }];
    const lista = Object.assign(dedos, { item: (n: number) => dedos[n] ?? null });
    const nenhum = Object.assign([], { item: () => null });
    el.dispatchEvent(Object.assign(new Event(tipo, { cancelable: true }), { changedTouches: lista, touches: tipo === 'touchend' ? nenhum : lista }));
  };
  let tocando = false;
  return {
    teclas,
    /** Um tick: o dedo vai a `p` (ou levanta, `null`), o jogo lê o InputFrame e fecha o tick. */
    tick(p: Ponto | null): Dir {
      if (p === null) {
        if (tocando) disparar(joy, 'touchend', 0, 0);
        tocando = false;
      } else {
        const [dx, dy] = paraDxDy(p);
        // o dedo é limitado pelo alcance do knob (85%) dentro de toque.ts; aqui entrega a posição bruta em fração do raio
        disparar(joy, tocando ? 'touchmove' : 'touchstart', dx, dy);
        tocando = true;
      }
      const f = teclas.lerP1();
      teclas.fimDoTick();
      return { left: f.left, right: f.right, up: f.up, down: f.down };
    },
    r1: (tipo: 'touchstart' | 'touchend') => disparar(r1, tipo, 0, 0),
  };
}

// ---------------------------------------------------------------------------------------------------------------- métricas
type Contagem = { saltos: number; agachadas: number; dashes: number; soltasEspurias: number; trajetorias: number };
/**
 * Lê a sequência de direções de UMA trajetória em que o jogador só quer ANDAR PARA A DIREITA: conta pulos (borda de subida de `up`), agachadas
 * (`down`), soltas espúrias de `right` depois de já estar andando e DASHES acidentais (re-apertar `right` até 12 ticks depois de soltar: o
 * duplo toque do motor, janela de 13 ticks, docs/auditoria §1.2).
 */
function contar(seq: Dir[], acc: Contagem): void {
  acc.trajetorias++;
  let up = false;
  let down = false;
  let right = false;
  let andou = false;
  let ticksSolta = 99;
  for (const d of seq) {
    if (d.up && !up) acc.saltos++;
    if (d.down && !down) acc.agachadas++;
    if (d.right && !right) {
      if (andou && ticksSolta <= 12) acc.dashes++;
    }
    if (!d.right && right && andou) acc.soltasEspurias++;
    if (d.right) {
      andou = true;
      ticksSolta = 0;
    } else ticksSolta++;
    up = d.up;
    down = d.down;
    right = d.right;
  }
}
const vazio = (): Contagem => ({ saltos: 0, agachadas: 0, dashes: 0, soltasEspurias: 0, trajetorias: 0 });

function rodar(traj: Ponto[][]): { antes: Contagem; depois: Contagem } {
  const a = vazio();
  const d = vazio();
  for (const t of traj) {
    contar(t.map(antes), a);
    const c = camada();
    contar(t.map((p) => c.tick(p)), d); // sem o tick final de dedo levantado: parar de propósito não é "solta espúria"
  }
  return { antes: a, depois: d };
}

const fmt = (nome: string, r: { antes: Contagem; depois: Contagem }): string =>
  `${nome} [${r.antes.trajetorias} trajetórias]: ANTES pulos ${r.antes.saltos}, agachadas ${r.antes.agachadas}, dashes ${r.antes.dashes}, soltas espúrias ${r.antes.soltasEspurias} | DEPOIS pulos ${r.depois.saltos}, agachadas ${r.depois.agachadas}, dashes ${r.depois.dashes}, soltas espúrias ${r.depois.soltasEspurias}`;

describe('U1: o jogador só quer ANDAR PARA A DIREITA — o que o joystick fazia sem ser pedido', () => {
  it('A) empurra firme (pressão 70%) com deriva do polegar de até ±25° (+arco e tremor): ANTES pulava/agachava; DEPOIS só anda', () => {
    const rnd = mulberry32(1);
    const traj = Array.from({ length: 400 }, () => empurraDireita(rnd, 90, 0.7, 25));
    const r = rodar(traj);
    console.log(fmt('A firme ±25°', r));
    expect(r.antes.saltos + r.antes.agachadas, 'o ensaio precisa REPRODUZIR o defeito antigo').toBeGreaterThan(50);
    expect(r.depois.saltos).toBe(0);
    expect(r.depois.agachadas).toBe(0);
    expect(r.depois.dashes).toBe(0);
    expect(r.depois.soltasEspurias).toBe(0);
  });

  it('A2) deriva de ±30° (mais o arco de ±6° e o tremor: parte das trajetórias passa de 35° de verdade, e aí é diagonal): erro residual < 2% das trajetórias', () => {
    const rnd = mulberry32(11);
    const traj = Array.from({ length: 400 }, () => empurraDireita(rnd, 90, 0.7, 30));
    const r = rodar(traj);
    console.log(fmt('A2 firme ±30°', r));
    expect(r.antes.saltos + r.antes.agachadas).toBeGreaterThan(100);
    expect(r.depois.saltos + r.depois.agachadas).toBeLessThan(traj.length * 0.02);
  });

  it('B) empurra FRACO (pressão ~30%, bem em cima do limiar de 25%): ANTES a oscilação virava solta + dash; DEPOIS não', () => {
    const rnd = mulberry32(2);
    const traj = Array.from({ length: 400 }, () => empurraDireita(rnd, 120, 0.3, 12));
    const r = rodar(traj);
    console.log(fmt('B fraco ~30%', r));
    expect(r.antes.dashes, 'o ensaio precisa REPRODUZIR o dash acidental').toBeGreaterThan(20);
    expect(r.depois.dashes, 'pelo menos 90% menos dashes acidentais').toBeLessThan(r.antes.dashes / 10);
    expect(r.depois.soltasEspurias, 'pelo menos 75% menos soltas').toBeLessThan(r.antes.soltasEspurias / 4);
    expect(r.depois.saltos + r.depois.agachadas).toBe(0);
  });

  it('C) as intenções de verdade continuam saindo: cima claro PULA, baixo claro AGACHA, diagonal clara dá as duas direções', () => {
    const rnd = mulberry32(3);
    const intencao = (grausBase: number, ticks = 30) => Array.from({ length: ticks }, () => ({ r: 0.75 + normal(rnd) * 0.03, graus: grausBase + normal(rnd) * 2 }));
    let pulos = 0;
    let agachou = 0;
    let diagonais = 0;
    const N = 200;
    for (let i = 0; i < N; i++) {
      const c = camada();
      const cima = intencao(75).map((p) => c.tick(p));
      pulos += cima.some((d) => d.up) ? 1 : 0;
      const c2 = camada();
      agachou += intencao(-75).map((p) => c2.tick(p)).some((d) => d.down) ? 1 : 0;
      const c3 = camada();
      diagonais += intencao(45).map((p) => c3.tick(p)).some((d) => d.up && d.right) ? 1 : 0;
    }
    console.log(`C intenções: pulo ${pulos}/${N}, agachar ${agachou}/${N}, diagonal ↗ ${diagonais}/${N}`);
    expect(pulos).toBe(N);
    expect(agachou).toBe(N);
    expect(diagonais).toBe(N);
  });

  it('D) custo da soltura mínima: parar DE PROPÓSITO (dedo sai da zona) segura 2 ticks (33 ms); levantar o dedo para na hora', () => {
    const c = camada();
    for (let i = 0; i < 10; i++) c.tick({ r: 0.8, graus: 0 });
    const saiu: boolean[] = [];
    for (let i = 0; i < 4; i++) saiu.push(c.tick({ r: 0, graus: 0 }).right);
    console.log(`D sair da zona: right por tick = ${JSON.stringify(saiu)} (ANTES: [false,...] = 0 tick de atraso)`);
    expect(saiu).toEqual([true, true, false, false]);
    const c2 = camada();
    for (let i = 0; i < 10; i++) c2.tick({ r: 0.8, graus: 0 });
    expect(c2.tick(null).right, 'dedo levantado').toBe(false);
  });

  it('E) o duplo toque DE PROPÓSITO continua existindo: soltar de verdade por >= 3 ticks e apertar de novo dentro de 12 ticks segue sendo 2 apertos', () => {
    const c = camada();
    const seq: Dir[] = [];
    for (let i = 0; i < 6; i++) seq.push(c.tick({ r: 0.8, graus: 0 }));
    for (let i = 0; i < 4; i++) seq.push(c.tick(null)); // levanta o dedo 4 ticks
    for (let i = 0; i < 6; i++) seq.push(c.tick({ r: 0.8, graus: 0 }));
    const acc = vazio();
    contar(seq, acc);
    expect(acc.dashes).toBe(1);
  });
});

describe('U2: toque de direção MAIS CURTO que um quadro (resolução de 16,67 ms por tick)', () => {
  it('2000 toques de 1 a 14 ms em fase aleatória: ANTES parte sumia, DEPOIS todos chegam ao motor, por 1 tick', () => {
    const rnd = mulberry32(4);
    let vistosAntes = 0;
    let vistosDepois = 0;
    const N = 2000;
    const TICK = 1000 / 60;
    for (let i = 0; i < N; i++) {
      const t0 = rnd() * TICK * 3;
      const dur = 1 + rnd() * 13;
      // ANTES: a direção era só nível — o tick vê se ainda está apertada no instante da leitura
      for (let k = 0; k < 6; k++) {
        const T = k * TICK;
        if (T >= t0 && T < t0 + dur) {
          vistosAntes++;
          break;
        }
      }
      // DEPOIS: a camada real, na mesma linha do tempo
      const teclas = new TeclasVirtuais();
      let apertou = false;
      let soltou = false;
      let visto = false;
      for (let k = 0; k < 6; k++) {
        const T = k * TICK;
        if (!apertou && T >= t0) {
          teclas.definir('ArrowRight', true);
          apertou = true;
        }
        if (apertou && !soltou && T >= t0 + dur) {
          teclas.definir('ArrowRight', false);
          soltou = true;
        }
        // (a leitura do tick vem depois dos eventos que já chegaram até T)
        if (teclas.lerP1().right) visto = true;
        teclas.fimDoTick();
        if (visto) break;
      }
      if (visto) vistosDepois++;
    }
    console.log(`U2 toques curtos: ANTES ${vistosAntes}/${N} chegaram ao motor | DEPOIS ${vistosDepois}/${N}`);
    expect(vistosAntes).toBeLessThan(N);
    expect(vistosDepois).toBe(N);
  });
});

describe('U4: filtro do spSeg no ESPECIAL do toque, no MOTOR real (AMINU, MASHI)', () => {
  /** Segura o ESPECIAL por `k` ticks (a partir do tick 0) e devolve o maior nível de carga visto e o tick em que o golpe passou do ponto de carga. */
  function mashi(nivelDoDedo: string | null, k: number): { nivel: number; ticksAteAcabar: number } {
    const c = cena('aminu', 'hayato', { esquiva: false });
    c.g.p1.en = 100;
    c.g.p1.x = 300;
    c.g.p2.x = 700;
    const toque = camada(nivelDoDedo);
    let nivel = 0;
    let ticksAteAcabar = -1;
    for (let t = 0; t < 120; t++) {
      if (t === 0) toque.r1('touchstart');
      if (t === k) toque.r1('touchend');
      c.mao.p1 = { ...toque.teclas.lerP1() };
      toque.teclas.fimDoTick();
      c.tick();
      nivel = Math.max(nivel, c.g.p1.nivelCarga);
      if (t > 3 && c.g.p1.move === null && ticksAteAcabar < 0) ticksAteAcabar = t;
    }
    return { nivel, ticksAteAcabar };
  }

  it('ensaio: dedo por k ticks no ESPECIAL com e sem o filtro de 12 ticks — o filtro DESLIGA a carga do MASHI no toque', () => {
    const linhas: string[] = [];
    const resultados: Record<string, { nivel: number; ticksAteAcabar: number }> = {};
    for (const [rot, nivel] of [['sem filtro', null], ['filtro 12', '12']] as const) {
      for (const k of [5, 10, 11, 14, 20, 30, 45]) {
        const r = mashi(nivel, k);
        resultados[`${rot}/${k}`] = r;
        linhas.push(`${rot} dedo ${k} ticks -> nível de carga ${r.nivel}, golpe acaba no tick ${r.ticksAteAcabar}`);
      }
    }
    console.log('U4 MASHI (AMINU):\n' + linhas.join('\n'));
    // sem filtro (o toque de hoje): quem segura >= 11 ticks carrega (nível >= 1) — o "dedo mais longo vira carga" da auditoria
    expect(resultados['sem filtro/30']!.nivel).toBeGreaterThanOrEqual(1);
    expect(resultados['sem filtro/5']!.nivel).toBeLessThanOrEqual(1);
    // com o filtro de 12: a carga decide em mt = S-1 (~tick 10) e NÃO retoma: segurar 45 ticks não carrega mais
    expect(resultados['filtro 12/45']!.nivel).toBeLessThanOrEqual(1);
    expect(resultados['filtro 12/45']!.ticksAteAcabar).toBeLessThan(resultados['sem filtro/45']!.ticksAteAcabar);
  });
});

describe('sanidade: a lógica pura continua a mesma que a camada usa', () => {
  it('direcoesDoKnob com o knob limitado a 85% do raio (o que o dedo no canto produz)', () => {
    const { dx, dy } = limitarKnob(300, -20, 100);
    expect(direcoesDoKnob(dx, dy, 100)).toEqual({ ArrowLeft: false, ArrowRight: true, ArrowUp: false, ArrowDown: false });
    expect(PROD.aminu).toBeDefined();
  });
});
