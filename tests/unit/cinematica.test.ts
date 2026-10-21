import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import type { IdLutador, LeituraLuta, LutadorLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { apresentacaoDoEspecial, todasAsApresentacoes } from '../../src/data/apresentacao-especiais';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import {
  ALFA_MAX_DO_FLASH,
  Cinematica,
  DURACAO_COMPLETA,
  DURACAO_CURTA,
  linhaDoTempo,
  MAX_TARJAS_NO_CACHE,
  modoDaCinematica,
  TICKS_DA_SAIDA_AO_PULAR,
  VEU_CHEIO,
  VEU_DA_SESSAO,
  type CanvasLike,
} from '../../src/render/cinematica';
import { contraste, desenharEstilo, mistura, type EstiloId } from '../../src/render/estilos-especiais';
import { CHAVES_IDENTIDADE, IDENTIDADES, identidadeDe, identidadePadrao } from '../../src/render/identidade-especiais';
import { chDaFicha } from '../../src/render/lutador';
import type { Ctx } from '../../src/render/tela';

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const SIL = { tag: 'silhueta' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => SIL, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

/** Contexto que grava tudo: chamadas, atribuições, e quantas primitivas de desenho foram feitas. */
function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const PRIMITIVAS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage', 'fillText', 'strokeText']);
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return (...a: unknown[]) => {
          chamadas.push([nome, ...a]);
          return { addColorStop: () => undefined };
        };
      }
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, typeof valor === 'object' ? '[degradê]' : valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas, primitivas: () => chamadas.filter(([n]) => PRIMITIVAS.has(n)).length, textos: () => chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t)) };
}

/** Canvas de fora da tela falso: devolve um contexto gravador e conta quantos foram criados. */
function fabrica() {
  const criados: Array<{ w: number; h: number; g: ReturnType<typeof gravador> }> = [];
  const criar = (w: number, h: number): CanvasLike => {
    const g = gravador();
    criados.push({ w, h, g });
    return { width: w, height: h, getContext: () => g.ctx };
  };
  return { criar, criados };
}

function lutador(id: IdLutador, indice: 0 | 1, extra: Partial<LutadorLeitura> = {}): LutadorLeitura {
  return {
    id, indice, x: indice === 0 ? 300 : 660, y: 470, facing: indice === 0 ? 1 : -1, state: 'move',
    pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 }, move: 'sFire', mt: 3,
    hp: 100, maxHp: 100, hpShown: 100, en: 50, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
    combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  };
}
function luta(a: IdLutador = 'hayato', b: IdLutador = 'wei-long', fa: Partial<LutadorLeitura> = {}): LeituraLuta {
  return {
    fighters: [lutador(a, 0, fa), lutador(b, 1, { state: 'idle', move: null })], projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2,
    cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp', winner: null,
    matchWinner: null, matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [],
  };
}

describe('modoDaCinematica (decisão do dono: COMPLETA por padrão; reduced-motion => CURTA; DESLIGADA e regras sem cinemática => nenhuma)', () => {
  const COM = { cinematica: true };
  it('sem preferência salva: completa; com movimento reduzido: curta', () => {
    expect(modoDaCinematica(undefined, COM, false)).toBe('completa');
    expect(modoDaCinematica(undefined, COM, true)).toBe('curta');
  });
  it('a preferência salva vale sobre o movimento reduzido', () => {
    expect(modoDaCinematica('completa', COM, true)).toBe('completa');
    expect(modoDaCinematica('curta', COM, false)).toBe('curta');
    expect(modoDaCinematica('desligada', COM, false)).toBeNull();
    expect(modoDaCinematica('desligada', COM, true)).toBeNull();
  });
  it('regras sem cinemática (?expansao=4): nenhuma, qualquer que seja a preferência', () => {
    for (const p of ['completa', 'curta', 'desligada', undefined] as const) expect(modoDaCinematica(p, { cinematica: false }, false)).toBeNull();
  });
});

describe('linha do tempo', () => {
  it('COMPLETA: escurece de 0 a 72% em 5 ticks, segura, e cai para a vinheta da sessão (20%) no fim', () => {
    expect(linhaDoTempo('completa', 'MEDIO', 0).veu).toBe(0);
    expect(linhaDoTempo('completa', 'MEDIO', 5).veu).toBeCloseTo(VEU_CHEIO, 5);
    expect(linhaDoTempo('completa', 'MEDIO', 20).veu).toBeCloseTo(VEU_CHEIO, 5);
    expect(linhaDoTempo('completa', 'MEDIO', DURACAO_COMPLETA).veu).toBeCloseTo(VEU_DA_SESSAO, 5);
    // monotônico na subida e na descida (nunca um salto)
    let anterior = 0;
    for (let t = 0; t <= 5; t++) {
      const v = linhaDoTempo('completa', 'MEDIO', t).veu;
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
    for (let t = 36; t < DURACAO_COMPLETA; t++) expect(linhaDoTempo('completa', 'MEDIO', t + 1).veu).toBeLessThanOrEqual(linhaDoTempo('completa', 'MEDIO', t).veu + 1e-9);
  });

  it('um único flash por especial, só nos 3 primeiros ticks e nunca acima de 0,35', () => {
    for (const modo of ['completa', 'curta'] as const) {
      const flashes = Array.from({ length: 48 }, (_, t) => linhaDoTempo(modo, 'MEDIO', t).flash);
      expect(Math.max(...flashes)).toBeLessThanOrEqual(ALFA_MAX_DO_FLASH);
      expect(flashes.filter((f) => f > 0).length).toBeLessThanOrEqual(3);
      expect(flashes.slice(3).every((f) => f === 0)).toBe(true);
    }
  });

  it('a tarja entra (4-13) e sai (36-47); o nome só aparece no "pop" (8-14) com escala 1,3 -> 1', () => {
    const q = (t: number) => linhaDoTempo('completa', 'MEDIO', t);
    expect(q(3).entrada).toBe(0);
    expect(q(13).entrada).toBe(1);
    expect(q(35).saida).toBe(0);
    expect(q(DURACAO_COMPLETA).saida).toBe(1);
    expect(q(7).pop).toBe(0);
    expect(q(8).pop).toBeCloseTo(1.3, 5);
    expect(q(14).pop).toBeCloseTo(1, 5);
  });

  it('ritmos: RÁPIDO entra em 4-9; PESADO faz o pop maior (1,5) e mais tarde (10-16)', () => {
    expect(linhaDoTempo('completa', 'RAPIDO', 9).entrada).toBe(1);
    expect(linhaDoTempo('completa', 'MEDIO', 9).entrada).toBeLessThan(1);
    expect(linhaDoTempo('completa', 'PESADO', 9).pop).toBe(0);
    expect(linhaDoTempo('completa', 'PESADO', 10).pop).toBeCloseTo(1.5, 5);
  });

  it('CURTA: escurece só até 50% e não tem tarja', () => {
    const q = (t: number) => linhaDoTempo('curta', 'MEDIO', t);
    expect(Math.max(...Array.from({ length: DURACAO_CURTA }, (_, t) => q(t).veu))).toBeCloseTo(0.5, 5);
    expect(q(10).entrada).toBe(0);
  });

  it('pular: a saída anda sozinha em no máximo 6 ticks e leva o escurecimento junto até 20%', () => {
    const q = (t: number) => linhaDoTempo('completa', 'MEDIO', t, 20);
    expect(q(20).saida).toBe(0);
    expect(q(20 + TICKS_DA_SAIDA_AO_PULAR).saida).toBe(1);
    expect(q(20 + TICKS_DA_SAIDA_AO_PULAR).veu).toBeCloseTo(VEU_DA_SESSAO, 5);
  });
});

describe('Cinematica: relógio, fila, pular', () => {
  const ev = { lutador: 0 as const, golpe: 'sFire' };
  const rodar = (c: Cinematica): number => {
    let n = 0;
    while (c.ativa && n < 500) {
      c.avancar();
      n++;
    }
    return n;
  };

  it('completa dura 48 ticks e curta 20', () => {
    const a = new Cinematica();
    a.iniciar(ev, 'completa');
    expect(a.ativa).toBe(true);
    expect(rodar(a)).toBe(DURACAO_COMPLETA);
    const b = new Cinematica();
    b.iniciar(ev, 'curta');
    expect(rodar(b)).toBe(DURACAO_CURTA);
  });

  it('pular() no meio termina em no máximo 6 ticks; pular perto do fim não alonga', () => {
    const a = new Cinematica();
    a.iniciar(ev, 'completa');
    for (let i = 0; i < 24; i++) a.avancar();
    a.pular();
    expect(rodar(a)).toBeLessThanOrEqual(TICKS_DA_SAIDA_AO_PULAR);
    const b = new Cinematica();
    b.iniciar(ev, 'completa');
    for (let i = 0; i < 45; i++) b.avancar();
    b.pular();
    expect(rodar(b)).toBeLessThanOrEqual(3);
  });

  it('dois especiais no mesmo tick: o 2º entra na fila e sai CURTO logo em seguida', () => {
    const c = new Cinematica();
    c.iniciar(ev, 'completa');
    c.iniciar({ lutador: 1, golpe: 'sDown' }, 'completa');
    expect(c.naFila).toBe(1);
    expect(c.estado?.modo).toBe('completa');
    expect(rodar(c)).toBe(DURACAO_COMPLETA + DURACAO_CURTA);
  });

  it('pular com fila: a fila inteira sai rápida (no máximo 6 ticks cada)', () => {
    const c = new Cinematica();
    c.iniciar(ev, 'completa');
    c.iniciar({ lutador: 1, golpe: 'sDown' }, 'completa');
    c.pular();
    expect(rodar(c)).toBeLessThanOrEqual(2 * TICKS_DA_SAIDA_AO_PULAR);
  });

  it('sem cinemática, avancar/pular/desenhar não fazem nada', () => {
    const c = new Cinematica();
    const g = gravador();
    expect(() => {
      c.avancar();
      c.pular();
      c.desenhar(g.ctx, luta(), elenco);
    }).not.toThrow();
    expect(g.chamadas).toEqual([]);
  });

  it('o som de abertura sai no 1º quadro e a batida no "pop" do nome, uma vez cada', () => {
    const sons: string[] = [];
    const c = new Cinematica({ aoSom: (m) => sons.push(m) });
    c.iniciar(ev, 'completa');
    const g = gravador();
    for (let t = 0; t < 7; t++) {
      c.desenhar(g.ctx, luta(), elenco);
      c.avancar();
    }
    expect(sons).toEqual(['abertura']);
    for (let t = 7; t < 20; t++) {
      c.desenhar(g.ctx, luta(), elenco);
      c.avancar();
    }
    expect(sons).toEqual(['abertura', 'batida']);
  });
});

describe('Cinematica: desenho', () => {
  function quadros(c: Cinematica, l: LeituraLuta, n = DURACAO_COMPLETA) {
    const todos: ReturnType<typeof gravador>[] = [];
    for (let t = 0; t < n && c.ativa; t++) {
      const g = gravador();
      c.desenhar(g.ctx, l, elenco);
      todos.push(g);
      c.avancar();
    }
    return todos;
  }

  it('nunca usa shadowBlur, filter nem getImageData; um flash de tela cheia por especial, alfa <= 0,35 e nunca branco', () => {
    const f = fabrica();
    const c = new Cinematica({ criarCanvas: f.criar, rng: criarRng(3) });
    c.iniciar({ lutador: 0, golpe: 'sFire', quadro: 'sa1' }, 'completa');
    const todos = quadros(c, luta());
    const proibidas = todos.flatMap((g) => g.chamadas.filter(([n]) => n === '=shadowBlur' || n === '=filter' || n === 'getImageData'));
    expect(proibidas).toEqual([]);
    // flash: fillRect de tela cheia com a cor do brilho e alfa explícito <= 0,35; o único de alfa baixo além do véu
    let flashes = 0;
    for (const g of todos) {
      let alfa = 1;
      let cor = '';
      for (const [n, v, ...r] of g.chamadas) {
        if (n === '=globalAlpha') alfa = v as number;
        if (n === '=fillStyle') cor = String(v);
        if (n === 'fillRect' && v === 0 && r[0] === 0 && r[1] === 960 && r[2] === 540 && alfa < 1) {
          flashes++;
          expect(alfa).toBeLessThanOrEqual(ALFA_MAX_DO_FLASH);
          expect(cor.toLowerCase()).not.toBe('#ffffff');
        }
      }
    }
    expect(flashes).toBeGreaterThanOrEqual(1);
    expect(flashes).toBeLessThanOrEqual(3);
  });

  it('o título na tarja é o nome do golpe (mv.name) e o nome do lutador, em português', () => {
    const c = new Cinematica({ criarCanvas: fabrica().criar });
    c.iniciar({ lutador: 0, golpe: 'sDown', quadro: 'sb1', entrada: 'baixo' }, 'completa');
    const textos = quadros(c, luta()).flatMap((g) => g.textos());
    expect(textos).toContain('RAIJIN-KEN');
    expect(textos).toContain('HAYATO');
  });

  it('a tarja é pintada UMA vez por (lutador, golpe) e reaproveitada; o cache guarda no máximo 6 e zera ao fim da luta', () => {
    const f = fabrica();
    const c = new Cinematica({ criarCanvas: f.criar });
    const l = luta();
    c.iniciar({ lutador: 0, golpe: 'sFire' }, 'completa');
    quadros(c, l);
    expect(c.pintadas).toBe(1);
    c.iniciar({ lutador: 0, golpe: 'sFire' }, 'completa');
    quadros(c, l);
    expect(c.pintadas).toBe(1); // mesma chave: não pinta de novo
    // o canvas do cache tem a resolução real (RS=2): 2000 px de largura
    expect(f.criados[0]?.w).toBe(2000);
    expect(f.criados[0]?.h).toBe(264);
    for (const g of ['sDown', 'sFwd']) {
      c.iniciar({ lutador: 0, golpe: g }, 'completa');
      quadros(c, l);
    }
    expect(c.tarjasNoCache).toBe(3);
    // 9 lutadores x vários golpes: nunca passa de 6
    for (const id of Object.keys(prod) as IdLutador[]) {
      c.iniciar({ lutador: 0, golpe: 'sFire' }, 'completa');
      quadros(c, luta(id, 'hayato'));
      expect(c.tarjasNoCache).toBeLessThanOrEqual(MAX_TARJAS_NO_CACHE);
    }
    c.zerarLuta();
    expect(c.tarjasNoCache).toBe(0);
    expect(c.ativa).toBe(false);
  });

  it('aquecer(): pinta UMA tarja por chamada (as 6 dos dois lutadores) e o 1º especial já encontra a tarja pronta', () => {
    const f = fabrica();
    const c = new Cinematica({ criarCanvas: f.criar });
    const l = luta('hayato', 'caio');
    let n = 0;
    while (c.aquecer(l, elenco) && n < 30) {
      n++;
      expect(c.pintadas).toBeLessThanOrEqual(6);
    }
    expect(n).toBe(12); // 6 tarjas + 6 silhuetas/recortes tingidos, um passo por chamada
    expect(c.tarjasNoCache).toBe(6);
    expect(c.aquecer(l, elenco)).toBe(false);
    c.iniciar({ lutador: 0, golpe: 'sDown' }, 'completa');
    quadros(c, l);
    expect(c.pintadas).toBe(6); // nada novo foi pintado durante a cinemática
  });

  it('sem canvas de fora da tela (sem DOM) a tarja é pintada direto, sem quebrar', () => {
    const c = new Cinematica({ criarCanvas: () => null });
    c.iniciar({ lutador: 0, golpe: 'sFire' }, 'completa');
    const todos = quadros(c, luta());
    expect(todos.length).toBe(DURACAO_COMPLETA);
    expect(todos[20]?.chamadas.some(([n]) => n === 'createLinearGradient')).toBe(true);
  });

  it('o P2 espelha a tarja (scale -1) mas o texto não sai ao contrário', () => {
    const c = new Cinematica({ criarCanvas: fabrica().criar });
    c.iniciar({ lutador: 1, golpe: 'sFire' }, 'completa');
    const l = luta('hayato', 'camille');
    const todos = quadros(c, l);
    const g = todos[20] as ReturnType<typeof gravador>;
    expect(g.chamadas.some(([n, x]) => n === 'scale' && x === -1)).toBe(true);
    // o texto é desenhado depois do espelhamento ser desfeito: nenhum scale(-1) entre o save do texto e o fillText
    const iTexto = g.chamadas.findIndex(([n, s]) => n === 'fillText' && s === 'PARADE');
    const ultimoSave = g.chamadas.slice(0, iTexto).map(([n]) => n).lastIndexOf('save');
    expect(g.chamadas.slice(ultimoSave, iTexto).some(([n, x]) => n === 'scale' && x === -1)).toBe(false);
  });

  it('CURTA: sem tarja (nenhum drawImage de fundo 1000 px), nome pequeno sobre o atacante', () => {
    const c = new Cinematica({ criarCanvas: fabrica().criar });
    c.iniciar({ lutador: 0, golpe: 'sFire', quadro: 'sa1' }, 'curta');
    const todos = quadros(c, luta(), DURACAO_CURTA);
    expect(c.pintadas).toBe(0);
    expect(todos.flatMap((g) => g.textos())).toContain('RAIJIN-DAN');
    expect(todos.every((g) => !g.chamadas.some(([n, ...a]) => n === 'drawImage' && a[3] === 1000))).toBe(true);
  });

  it('orçamento por quadro: cada tick da COMPLETA fica dentro de 52 primitivas (40 de brilho + véu, tarja, pose, halo, textos)', () => {
    for (const chave of CHAVES_IDENTIDADE) {
      const [id, fichaS, golpe] = chave.split('.') as [IdLutador, string, string];
      const ficha = fichaS === 'base' ? null : fichaS;
      const c = new Cinematica({ criarCanvas: fabrica().criar, rng: criarRng(11) });
      c.iniciar({ lutador: 0, golpe, ficha, quadro: apresentacaoDoEspecial(id, ficha, golpe)?.quadro ?? 'sa1' }, 'completa');
      const todos = quadros(c, luta(id, id === 'hayato' ? 'caio' : 'hayato', { ficha }));
      const max = Math.max(...todos.map((g) => g.primitivas()));
      expect(max, `${chave}: ${max} primitivas num quadro`).toBeLessThanOrEqual(52);
    }
  });
});

describe('os 11 estilos e a tabela dos 28 especiais', () => {
  const PRIM = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage']);

  it('são 28 entradas, as mesmas da tabela de apresentação do motor (id, ficha, golpe) e o título é o mv.name exato', () => {
    expect(CHAVES_IDENTIDADE).toHaveLength(28);
    const doMotor = todasAsApresentacoes().map((c) => `${c.id}.${c.ficha ?? 'base'}.${c.golpe}`).sort();
    expect(CHAVES_IDENTIDADE.slice().sort()).toEqual(doMotor);
    for (const chave of CHAVES_IDENTIDADE) {
      const [id, fichaS, golpe] = chave.split('.') as [IdLutador, string, string];
      const ch = chDaFicha(prod[id], fichaS === 'base' ? null : fichaS);
      const mv = (ch.moves as Record<string, { name?: string; cost?: number }>)[golpe];
      expect(mv, chave).toBeDefined();
      expect((IDENTIDADES[chave] as { titulo: string }).titulo, chave).toBe(mv?.name);
    }
  });

  it('cada lutador tem estilo exclusivo (NILA e BAATAR um por ficha) e os 11 estilos aparecem', () => {
    const porEstilo = new Map<EstiloId, Set<string>>();
    for (const [chave, id] of Object.entries(IDENTIDADES)) {
      const dono = chave.split('.')[0] as string;
      (porEstilo.get(id.estilo) ?? porEstilo.set(id.estilo, new Set()).get(id.estilo))?.add(dono);
    }
    expect([...porEstilo.keys()].sort()).toEqual(['E1', 'E10', 'E11', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9']);
    for (const [estilo, donos] of porEstilo) expect(donos.size, `${estilo} em ${[...donos]}`).toBe(1);
  });

  it('nenhum par de especiais é igual (estilo + variante + brilho + recorte + faixa)', () => {
    const vistos = new Set<string>();
    for (const [chave, id] of Object.entries(IDENTIDADES)) {
      const assinatura = [id.estilo, id.variante, id.paleta.brilho, id.recorte, id.faixa.posicao, id.faixa.angulo].join('|');
      expect(vistos.has(assinatura), chave).toBe(false);
      vistos.add(assinatura);
    }
  });

  it('contraste do nome sobre o centro da faixa: topo e base do degradê >= 3:1 (texto grande) nos 28', () => {
    for (const [chave, id] of Object.entries(IDENTIDADES)) {
      const { nucleo, brilho, sombra } = id.paleta;
      const fundo = mistura(sombra, brilho, 0.35);
      expect(contraste(nucleo, fundo), `${chave} topo`).toBeGreaterThanOrEqual(3);
      expect(contraste(mistura(nucleo, brilho, 0.4), fundo), `${chave} base`).toBeGreaterThanOrEqual(3);
    }
  });

  it('cada estilo: <= 24 primitivas por quadro em qualquer tick e variante, sem shadowBlur/filter/getImageData e idêntico ao repetir', () => {
    for (const [chave, id] of Object.entries(IDENTIDADES)) {
      for (const [t, vida] of [[8, 0.2], [14, 1], [22, 1], [30, 1], [37, 0.5]] as const) {
        for (const escala of [1, 0.5]) {
          const rodar = () => {
            const g = gravador();
            desenharEstilo(id.estilo, { ctx: g.ctx, t, vida, p: id.paleta, c: { x: 250, y: 0, w: 700, h: id.faixa.h }, sem: 12345, variante: id.variante, escala, pesado: id.ritmo === 'PESADO' });
            return g;
          };
          const a = rodar();
          const prims = a.chamadas.filter(([n]) => PRIM.has(n)).length;
          expect(prims, `${chave} t=${t} escala=${escala}`).toBeLessThanOrEqual(escala < 1 ? 12 : 24);
          expect(a.chamadas.some(([n]) => n === '=shadowBlur' || n === '=filter' || n === 'getImageData'), chave).toBe(false);
          expect(rodar().chamadas, `${chave} t=${t}: pura`).toEqual(a.chamadas);
          if (t === 22) expect(prims, `${chave} desenha algo no meio do golpe`).toBeGreaterThan(0);
        }
      }
    }
  });

  it('sem vida (antes do tick 8 e depois do 40) o estilo não desenha nada', () => {
    for (const id of Object.values(IDENTIDADES)) {
      const g = gravador();
      desenharEstilo(id.estilo, { ctx: g.ctx, t: 3, vida: 0, p: id.paleta, c: { x: 250, y: 0, w: 700, h: 132 }, sem: 1, variante: id.variante, escala: 1, pesado: false });
      expect(g.chamadas).toEqual([]);
    }
  });

  it('a ficha da NILA acha a identidade dela; o BAATAR (sem fichas) tem o MERGULHO no →+ESP; a ficha sem registro cai na base; golpe sem registro cai no padrão', () => {
    expect(identidadeDe('nila', 'sarpa', 'sFire')?.titulo).toBe('BOTE');
    expect(identidadeDe('nila', null, 'sFire')?.titulo).toBe('GOLPE MARMA');
    expect(identidadeDe('baatar', null, 'sFwd')?.titulo).toBe('MERGULHO DA ÁGUIA');
    expect(identidadeDe('baatar', 'ficha-inexistente', 'sFwd')?.titulo).toBe('MERGULHO DA ÁGUIA');
    expect(identidadeDe('hayato', null, 'lp')).toBeUndefined();
    const padrao = identidadePadrao('X', ['#111111', '#222222', '#333333']);
    expect(padrao.paleta).toEqual({ nucleo: '#222222', brilho: '#111111', sombra: '#333333' });
  });
});
