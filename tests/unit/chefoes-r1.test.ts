import { describe, expect, it } from 'vitest';
import { INPUT_VAZIO, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { manifestoParaPoses } from '../../src/data/atlas';
import { AMINU, BAATAR, CAMILLE, CENTELLA, LUTADORES, NILA, ROSTER, ZENON } from '../../src/data/lutadores';
import { DANO_RECEBIDO_MIN, montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { ConfigChefe, LutadorDef } from '../../src/data/tipos';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { lerManifesto, montarTodos } from './_lutadores';

/*
 * R1 (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §4.2): `ConfigChefe.danoRecebido` nos 4 pontos do motor onde a vida
 * do defensor cai, SÓ para o chefe da luta; fichas de fase opcionais; os 5 guardiões com bloco `chefe` em dados.
 * Os pontos são chamados direto (`applyHit`/`arremessar` são os pontos de dano) para medir cada um isolado, com o defensor
 * no estado que o ramo pede. O resto (troca de barra, cena, ZENON) tem testes próprios que seguem verdes sem mudança.
 */

const AJUSTES = { rounds: 2, time: 99, shake: true };
const NADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };

/** Os 5 guardiões e o ZENON com a ARTE REAL (o atlas que o jogo serve) e os dados de produção. */
const base = montarTodos({ arteReal: true, dadosDeProducao: true });

/** O elenco com o `id` montado a partir de uma variação do def dele. */
function comDef(id: IdLutador, def: LutadorDef): Record<IdLutador, LutadorMontado> {
  return { ...base, [id]: montarLutador(def, manifestoParaPoses(lerManifesto(id))) };
}

/** O def do `id` com o bloco `chefe` alterado (`undefined` APAGA a chave: é como se prova "campo ausente"). */
function defComChefe(id: IdLutador, mudanca: { [K in keyof ConfigChefe]?: ConfigChefe[K] | undefined }): LutadorDef {
  const def = LUTADORES[id];
  if (!def.chefe) throw new Error(`${id} sem bloco chefe`);
  const chefe: Record<string, unknown> = { ...def.chefe };
  for (const [k, v] of Object.entries(mudanca)) {
    if (v === undefined) delete chefe[k];
    else chefe[k] = v;
  }
  return { ...def, chefe: chefe as ConfigChefe };
}

type Privado = {
  applyHit(a: unknown, d: unknown, mv: unknown, box: { x: number; y: number; w: number; h: number }): void;
};

/** Um ataque comum corpo a corpo, na forma que `applyHit` consome (dano 10, golpe forte médio). */
const ATAQUE = {
  dmg: 10, kb: 6, hs: 18, bs: 12, lvl: 'mid', snd: 'punch', kind: 'punch', heavy: false, kd: false, hits: undefined, proj: false,
  quebraGuarda: undefined, rank: 1, contra: undefined, golpe: undefined, especial: false, nivelCarga: 0, drenaEnergia: undefined,
};

function luta(elenco: Record<IdLutador, LutadorMontado>, c2: IdLutador, chefe: boolean): Game {
  const g = new Game({ lutadores: elenco, rng: criarRng(7) });
  g.setup({ mode: 'versus', c1: 'hayato', c2, ...(chefe ? { chefe: true } : {}) }, { ...AJUSTES });
  for (let i = 0; i < 400 && g.phase !== 'fight'; i++) g.update(NADA);
  expect(g.phase).toBe('fight');
  g.p1.x = 420;
  g.p2.x = 480;
  g.p1.en = 0;
  g.p2.en = 0;
  return g;
}

/** Quanto a vida do P2 caiu quando o P1 aplica `ataque` (`antes` prepara o defensor). */
function danoNoP2(g: Game, ataque: Record<string, unknown> = ATAQUE, antes?: (g: Game) => void): number {
  antes?.(g);
  const hp = g.p2.hp;
  const hb = g.p2.hurtbox();
  (g as unknown as Privado).applyHit(g.p1, g.p2, ataque, { x: hb.x, y: hb.y, w: hb.w, h: hb.h });
  return hp - g.p2.hp;
}

/** Eventos emitidos FORA de `update` (chamando o ponto de dano direto) ficam na fila `pendentes` do Game. */
const pendentes = (g: Game): EventoLuta[] => (g as unknown as { pendentes: EventoLuta[] }).pendentes;

/** O defensor no meio de um golpe com armadura: `move` precisa apontar para um golpe real (a hurtbox lê `golpeAtual()`). */
function comArmadura(g: Game): void {
  g.p2.armor = 10;
  g.p2.move = 'hp';
  g.p2.setState('move');
}

const GUARDIOES = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const;

describe('R1 · os 5 guardiões ganham ConfigChefe em dados', () => {
  it.each(GUARDIOES)('%s: 2 barras de ceil(hp / 2), cena de 60 ticks, bônus 3000, sem fichas de fase, fator válido', (id) => {
    const def = LUTADORES[id];
    const c = def.chefe as ConfigChefe;
    expect(c).toBeDefined();
    expect(c.barras).toBe(2);
    // R-12: CENTELLA (hp 99 -> 93) e CAMILLE (94 -> 106) mudaram de hp para o balanço do roster; a vida do chefão NÃO acompanha (50 e 47 = ceil dos hp antigos)
    const BARRA_FIXA: Partial<Record<(typeof GUARDIOES)[number], number>> = { centella: 50, camille: 47 };
    expect(c.hpPorBarra).toBe(BARRA_FIXA[id] ?? Math.ceil(def.hp / 2));
    expect(c.cena.duracao).toBe(60);
    expect(c.bonusVitoria).toBe(3000);
    expect(c.fichaFase1).toBeUndefined();
    expect(c.fichaFase2).toBeUndefined();
    expect(c.trilha).toBeUndefined();
    expect(c.danoRecebido ?? 1).toBeGreaterThanOrEqual(DANO_RECEBIDO_MIN);
    expect(c.danoRecebido ?? 1).toBeLessThanOrEqual(1);
  });

  it.each(GUARDIOES)('%s: as poses da cena existem no atlas real (nada de pose nova)', (id) => {
    const quadros = Object.keys(lerManifesto(id).quadros);
    for (const p of (LUTADORES[id].chefe as ConfigChefe).cena.poses) expect(quadros, `${id}: ${p}`).toContain(p);
  });

  it('as cenas de fase 2 são as da spec §2.2: AMINU sa1->sa3, CENTELLA win, CAMILLE block, NILA crouch, BAATAR devekh2->win', () => {
    const poses = (d: LutadorDef): readonly string[] => (d.chefe as ConfigChefe).cena.poses;
    expect(poses(AMINU)).toEqual(['sa1', 'sa3']);
    expect(poses(CENTELLA)).toEqual(['win']);
    expect(poses(CAMILLE)).toEqual(['block']);
    expect(poses(NILA)).toEqual(['crouch']);
    expect(poses(BAATAR)).toEqual(['devekh2', 'win']);
  });

  it('o ZENON segue com as fichas chefe/chefe2, a barra de 50 e a cena de 90; só ganhou o fator da rampa', () => {
    const c = ZENON.chefe as ConfigChefe;
    expect(c.fichaFase1).toBe('chefe');
    expect(c.fichaFase2).toBe('chefe2');
    expect(c.hpPorBarra).toBe(50);
    expect(c.cena.duracao).toBe(90);
    expect(c.danoRecebido).toBeGreaterThanOrEqual(DANO_RECEBIDO_MIN);
    expect(c.danoRecebido).toBeLessThan(1);
  });

  it('o bloco `chefe` não toca no lutador jogável: montar com e sem ele dá o mesmo LutadorMontado (campo a campo, fora o próprio bloco)', () => {
    for (const id of GUARDIOES) {
      const def = LUTADORES[id];
      const { chefe: _c, ...semChefe } = def;
      void _c;
      const com = montarLutador(def, manifestoParaPoses(lerManifesto(id)));
      const sem = montarLutador(semChefe as LutadorDef, manifestoParaPoses(lerManifesto(id)));
      const { chefe: _x, ...comSemBloco } = com;
      void _x;
      expect(comSemBloco, id).toEqual(sem);
    }
  });
});

describe('R1 · montar valida o danoRecebido (falha alto, no boot)', () => {
  const montar = (x: number | undefined): unknown => montarLutador(defComChefe('aminu', { danoRecebido: x }), manifestoParaPoses(lerManifesto('aminu')));

  it('aceita de 0,60 a 1 e ausente', () => {
    for (const x of [0.6, 0.75, 1, undefined]) expect(() => montar(x), String(x)).not.toThrow();
  });

  it.each([0.59, 0.5, 0, -1, 1.01, 2, Number.NaN, Number.POSITIVE_INFINITY])('recusa %s', (x) => {
    expect(() => montar(x)).toThrow(/danoRecebido deve estar entre 0.6 e 1/);
  });
});

describe('R1 · o fator nos 4 pontos onde a vida do chefe cai', () => {
  const F = 0.7;
  const elenco1 = comDef('aminu', defComChefe('aminu', { danoRecebido: 1 }));
  const elencoF = comDef('aminu', defComChefe('aminu', { danoRecebido: F }));

  it('golpe: a vida cai F vezes o que cairia (e o hit.dano do evento, que é o dano efetivo, também)', () => {
    const cheio = danoNoP2(luta(elenco1, 'aminu', true));
    const g = luta(elencoF, 'aminu', true);
    const antes = g.p2.hp;
    const reduzido = danoNoP2(g);
    expect(cheio).toBeGreaterThan(5);
    expect(reduzido).toBeCloseTo(cheio * F, 9);
    expect(antes - g.p2.hp).toBeCloseTo(cheio * F, 9);
    const ev = pendentes(g).find((e): e is Extract<EventoLuta, { tipo: 'hit' }> => e.tipo === 'hit');
    expect(ev?.dano).toBeCloseTo(cheio * F, 9);
  });

  it('raspão de bloqueio: o mínimo de 0,4 vem ANTES do fator (golpe fraco: 0,4 x F, não max(0,4, ...x F))', () => {
    const segurar = (g: Game): void => {
      g.p2.holdBack = true;
    };
    const fraco = { ...ATAQUE, dmg: 1 }; // 1 x pow x 0,12 < 0,4: cai no mínimo
    const cheio = danoNoP2(luta(elenco1, 'aminu', true), fraco, segurar);
    const reduzido = danoNoP2(luta(elencoF, 'aminu', true), fraco, segurar);
    expect(cheio).toBeCloseTo(0.4, 9);
    expect(reduzido).toBeCloseTo(0.4 * F, 9);
    // golpe forte: acima do mínimo, mesma proporção
    const c2 = danoNoP2(luta(elenco1, 'aminu', true), ATAQUE, segurar);
    const r2 = danoNoP2(luta(elencoF, 'aminu', true), ATAQUE, segurar);
    expect(c2).toBeGreaterThan(0.4);
    expect(r2).toBeCloseTo(c2 * F, 9);
  });

  it('armadura: o valor absorvido leva o fator, e o teste "a armadura aguenta?" usa o MESMO valor reduzido', () => {
    const armadura = comArmadura;
    const cheio = danoNoP2(luta(elenco1, 'aminu', true), ATAQUE, armadura);
    const reduzido = danoNoP2(luta(elencoF, 'aminu', true), ATAQUE, armadura);
    expect(cheio).toBeGreaterThan(5);
    expect(reduzido).toBeCloseTo(cheio * F, 9);
    // a vida restante é maior que o dano reduzido, mas MENOR que o dano cheio: só o teste com o valor reduzido absorve (o golpe nem rompe a armadura)
    const g = luta(elencoF, 'aminu', true);
    g.p2.hp = cheio * 0.9;
    armadura(g);
    const hb = g.p2.hurtbox();
    (g as unknown as Privado).applyHit(g.p1, g.p2, ATAQUE, { x: hb.x, y: hb.y, w: hb.w, h: hb.h });
    expect(pendentes(g).some((e) => e.tipo === 'armor')).toBe(true);
    expect(g.p2.hp).toBeCloseTo(cheio * 0.9 - cheio * F, 9);
  });

  it('arremesso: o agarrão tira F vezes o dano (12 x pow do atacante, sem golpe dado)', () => {
    const tirar = (elenco: Record<IdLutador, LutadorMontado>): number => {
      const g = luta(elenco, 'aminu', true);
      const hp = g.p2.hp;
      g.arremessar(g.p1, g.p2);
      return hp - g.p2.hp;
    };
    const cheio = tirar(elenco1);
    expect(cheio).toBeCloseTo(12 * base.hayato.pow, 9);
    expect(tirar(elencoF)).toBeCloseTo(cheio * F, 9);
  });

  it('o dreno de energia NÃO passa pelo fator (é energia, não vida)', () => {
    const drena = { ...ATAQUE, drenaEnergia: { acerto: 12, defesa: 5 } };
    const medir = (elenco: Record<IdLutador, LutadorMontado>): number => {
      const g = luta(elenco, 'aminu', true);
      g.p2.en = 50;
      const antes = g.p2.en;
      danoNoP2(g, drena);
      return antes - g.p2.en;
    };
    expect(medir(elencoF)).toBeCloseTo(medir(elenco1), 9);
  });

  it('o ramo é do CHEFE: o mesmo def sem `cfg.chefe` (AMINU jogável) leva o dano cheio, nos 4 pontos', () => {
    const g1 = luta(elenco1, 'aminu', false);
    const gF = luta(elencoF, 'aminu', false);
    expect(gF.p2.cfgChefe).toBeNull();
    expect(danoNoP2(gF)).toBeCloseTo(danoNoP2(g1), 9);
    const seg = (g: Game): void => {
      g.p2.holdBack = true;
    };
    expect(danoNoP2(luta(elencoF, 'aminu', false), ATAQUE, seg)).toBeCloseTo(danoNoP2(luta(elenco1, 'aminu', false), ATAQUE, seg), 9);
    const arm = comArmadura;
    expect(danoNoP2(luta(elencoF, 'aminu', false), ATAQUE, arm)).toBeCloseTo(danoNoP2(luta(elenco1, 'aminu', false), ATAQUE, arm), 9);
    const a1 = luta(elenco1, 'aminu', false);
    const aF = luta(elencoF, 'aminu', false);
    const h1 = a1.p2.hp;
    a1.arremessar(a1.p1, a1.p2);
    const hF = aF.p2.hp;
    aF.arremessar(aF.p1, aF.p2);
    expect(hF - aF.p2.hp).toBeCloseTo(h1 - a1.p2.hp, 9);
  });

  it('o fator só vale para o defensor que é o CHEFE: o jogador (P1) leva o dano cheio mesmo contra um chefe com fator', () => {
    const g = luta(elencoF, 'aminu', true);
    const hp = g.p1.hp;
    const hb = g.p1.hurtbox();
    (g as unknown as Privado).applyHit(g.p2, g.p1, ATAQUE, { x: hb.x, y: hb.y, w: hb.w, h: hb.h });
    const g1 = luta(elenco1, 'aminu', true);
    const hp1 = g1.p1.hp;
    const hb1 = g1.p1.hurtbox();
    (g1 as unknown as Privado).applyHit(g1.p2, g1.p1, ATAQUE, { x: hb1.x, y: hb1.y, w: hb1.w, h: hb1.h });
    expect(hp - g.p1.hp).toBeCloseTo(hp1 - g1.p1.hp, 9);
  });

  it('fator 1 e ausente dão o MESMO dano, bit a bit (o ramo devolve o número sem multiplicar)', () => {
    const sem = comDef('aminu', defComChefe('aminu', { danoRecebido: undefined }));
    expect(danoNoP2(luta(sem, 'aminu', true))).toBe(danoNoP2(luta(elenco1, 'aminu', true)));
  });
});

describe('R1 · NILA chefe: o fator mora no ConfigChefe, não na ficha (VADIVU não o leva embora)', () => {
  const F = 0.65;
  const elenco = comDef('nila', defComChefe('nila', { danoRecebido: F }));

  it('sem fichaFase1: o chefe começa na GAJA (ficha null, a base); a barra é hpPorBarra; as duas barras valem', () => {
    const g = luta(elenco, 'nila', true);
    expect(g.p2.chefe).toBe(true);
    expect(g.p2.ficha).toBeNull();
    expect(g.p2.maxHp).toBe(52); // ceil(104 / 2): hp da NILA recalibrado na V2-6 (era 108 -> 54)
    expect(g.p2.barrasMax).toBe(2);
  });

  it('trocando de postura (GAJA -> SARPA -> GAJA) o fator continua o mesmo nos 4 pontos', () => {
    const cheio = danoNoP2(luta(comDef('nila', defComChefe('nila', { danoRecebido: 1 })), 'nila', true));
    for (const ficha of ['sarpa', null, 'sarpa']) {
      const g = luta(elenco, 'nila', true);
      g.p2.trocarFicha(ficha);
      expect(g.p2.ficha).toBe(ficha);
      expect(g.p2.cfgChefe?.danoRecebido).toBe(F);
      // o dano de um golpe do HAYATO não depende da ficha do defensor: a razão contra o dano cheio é exatamente F
      expect(danoNoP2(g), String(ficha)).toBeCloseTo(cheio * F, 9);
    }
    const g = luta(elenco, 'nila', true);
    g.p2.trocarFicha('sarpa');
    const hp = g.p2.hp;
    g.arremessar(g.p1, g.p2);
    expect(hp - g.p2.hp).toBeCloseTo(12 * base.hayato.pow * F, 9);
  });

  it('a troca REAL (VADIVU, o golpe do dado) pela CPU durante a luta toda também preserva o fator, e a retomada não desfaz a postura', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(21) });
    g.setup({ mode: 'cpu', c1: 'hayato', c2: 'nila', cpu: 2, p1cpu: 2, chefe: true }, { ...AJUSTES });
    let trocas = 0;
    let retomadas = 0;
    let fichaNaCena: string | null | undefined;
    for (let i = 0; i < 20_000 && !g.matchDone; i++) {
      g.update(NADA);
      for (const e of g.events) {
        if (e.tipo === 'troca-ficha' && e.lutador === 1) trocas++;
        if (e.tipo === 'fase-chefe' && e.etapa === 'cena') fichaNaCena = g.p2.ficha;
        if (e.tipo === 'fase-chefe' && e.etapa === 'retomada') {
          retomadas++;
          expect(g.p2.ficha, 'a retomada não troca de ficha: fica a da cena').toBe(fichaNaCena);
        }
      }
      expect(g.p2.cfgChefe?.danoRecebido).toBe(F);
    }
    expect(trocas).toBeGreaterThan(0);
    expect(retomadas).toBe(1);
  });

  it('cada round recomeça na GAJA (a base), como o ZENON recomeça na fase 1', () => {
    const g = luta(elenco, 'nila', true);
    g.p2.trocarFicha('sarpa');
    g.p2.reset(false);
    expect(g.p2.ficha).toBeNull();
  });
});

describe('R1 · fichas de fase opcionais', () => {
  it('sem fichaFase1/2: virarChefe não lança, a ficha é null e a retomada da cena não troca nada', () => {
    const elenco = comDef('aminu', defComChefe('aminu', {}));
    const g = luta(elenco, 'aminu', true);
    expect(g.p2.chefe).toBe(true);
    expect(g.p2.ficha).toBeNull();
    expect(g.p2.ch).toBe(elenco['aminu']);
  });

  it('ficha declarada e desconhecida continua falhando alto no setup (fichaFase1 e fichaFase2)', () => {
    const g1 = new Game({ lutadores: comDef('aminu', defComChefe('aminu', { fichaFase1: 'nao-existe' })), rng: criarRng(1) });
    expect(() => g1.setup({ mode: 'versus', c1: 'hayato', c2: 'aminu', chefe: true }, { ...AJUSTES })).toThrow(/ficha desconhecida 'nao-existe'/);
    const g2 = new Game({ lutadores: comDef('aminu', defComChefe('aminu', { fichaFase2: 'fase2-com-typo' })), rng: criarRng(1) });
    expect(() => g2.setup({ mode: 'versus', c1: 'hayato', c2: 'aminu', chefe: true }, { ...AJUSTES })).toThrow(/ficha desconhecida 'fase2-com-typo'/);
  });

  it('o guardião de ponta a ponta: barra zera, cena de 60 ticks com as poses dele, retomada, e o fator vale nas duas barras', () => {
    const elenco = comDef('aminu', defComChefe('aminu', { danoRecebido: 0.8 }));
    const g = luta(elenco, 'aminu', true);
    const etapas: string[] = [];
    g.p2.hp = 1;
    g.p1.x = 420;
    g.p2.x = 480;
    const hb = g.p2.hurtbox();
    (g as unknown as Privado).applyHit(g.p1, g.p2, { ...ATAQUE, dmg: 30 }, { x: hb.x, y: hb.y, w: hb.w, h: hb.h });
    expect(g.p2.barras).toBe(1);
    expect(g.p2.hp).toBe(g.p2.maxHp);
    let ticksNaCena = 0;
    for (let i = 0; i < 400 && etapas[etapas.length - 1] !== 'retomada'; i++) {
      g.update(NADA);
      for (const e of g.events) if (e.tipo === 'fase-chefe') etapas.push(e.etapa);
      if (g.phase === 'cena-chefe') ticksNaCena++;
    }
    expect(etapas).toEqual(['troca', 'cena', 'retomada']);
    expect(ticksNaCena).toBeGreaterThanOrEqual(59);
    expect(ticksNaCena).toBeLessThanOrEqual(61);
    expect(g.p2.ficha).toBeNull();
    expect(g.phase).toBe('fight');
    expect(g.p2.cfgChefe?.danoRecebido).toBe(0.8);
  });
});

describe('R1 · nada muda fora da luta de chefe', () => {
  it('um duelo CPU x CPU de 3000 ticks é idêntico (vida, posição, eventos) com e sem o bloco `chefe` no def do P2', () => {
    const comBloco = comDef('camille', defComChefe('camille', { danoRecebido: 0.6 }));
    const semBloco = comDef('camille', (({ chefe: _c, ...resto }) => (void _c, resto as LutadorDef))(LUTADORES.camille));
    const rodar = (lut: Record<IdLutador, LutadorMontado>): string => {
      const g = new Game({ lutadores: lut, rng: criarRng(42) });
      g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'camille', cpu: 2, p1cpu: 2 }, { ...AJUSTES });
      const log: string[] = [];
      const f: InputFrame = { ...INPUT_VAZIO };
      void f;
      for (let i = 0; i < 3000; i++) {
        g.update(NADA);
        log.push(`${g.p1.hp.toFixed(6)}|${g.p2.hp.toFixed(6)}|${g.p1.x.toFixed(3)}|${g.p2.x.toFixed(3)}|${g.events.map((e) => e.tipo).join(',')}`);
        if (g.matchDone) break;
      }
      return log.join('\n');
    };
    expect(rodar(comBloco)).toBe(rodar(semBloco));
  });

  it('ROSTER: só os 5 guardiões e o ZENON têm bloco `chefe`; os 4 originais nunca', () => {
    const comChefe = ROSTER.filter((id) => LUTADORES[id].chefe !== undefined).sort();
    expect(comChefe).toEqual(['aminu', 'baatar', 'camille', 'centella', 'nila', 'zenon']);
    for (const id of ['hayato', 'wei-long', 'min-ji', 'caio'] as const) expect(LUTADORES[id].chefe).toBeUndefined();
  });
});
