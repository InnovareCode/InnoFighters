import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GROUND } from '../../src/core/constantes';
import { INPUT_VAZIO, type EventoFaseChefe, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { WEI_LONG } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { ConfigChefe, LutadorDef } from '../../src/data/tipos';
import { perfilChefe } from '../../src/fight/cpu';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { chDaFicha } from '../../src/render/lutador';
import { montarTodos } from './_lutadores';

/*
 * QA adversarial do E3 · S0 + S1a (Íris). Tenta quebrar o chefe pelos cantos que `chefe-e3.test.ts` não pisa.
 * Convenção: `it.fails(...)` = BUG REAL conhecido (a asserção descreve o comportamento correto e hoje falha). Quando o
 * bug for corrigido o `it.fails` passa a falhar de propósito: é o sinal para trocar por `it`.
 * Não depende de arte nova nem do BAATAR real: o chefe é o mesmo BAATAR provisório (dados de teste sobre o atlas do WEI LONG).
 */

const base = montarTodos();
const BAATAR = 'baatar' as IdLutador;
const CFG: ConfigChefe = { barras: 2, hpPorBarra: 75, fichaFase1: 'chefe', fichaFase2: 'chefe2', cena: { duracao: 90, poses: ['devekh0', 'devekh1', 'devekh2'] }, bonusVitoria: 7777 };

function poseWei() {
  const url = new URL('../../public/assets/lutadores/wei-long/atlas.json', import.meta.url);
  return manifestoParaPoses(JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as ManifestoAtlas);
}

function defBaatar(extra: Partial<LutadorDef> = {}): LutadorDef {
  const { idPrototipo, ...semProto } = WEI_LONG;
  void idPrototipo;
  return {
    ...semProto,
    id: BAATAR,
    name: 'BAATAR (provisório)',
    pow: 1.18,
    spd: 0.95,
    hp: 118,
    chefe: CFG,
    fichas: { chefe: { pow: 1.3, spd: 0.82 }, chefe2: { pow: 1.3, spd: 0.82, fire: ['#ff9a3a', '#fff3e0', '#c0392b'] } },
    ...extra,
  };
}

/** O contrato tipa `ConfigChefe.barras` como 2; 3 é robustez ALÉM do contrato (a lógica é genérica em `barras`). */
const TRES = 3 as unknown as 2;
const montar = (extra: Partial<LutadorDef> = {}): LutadorMontado => montarLutador(defBaatar(extra), poseWei());
const comElenco = (b: LutadorMontado): Record<IdLutador, LutadorMontado> => ({ ...base, [BAATAR]: b }) as Record<IdLutador, LutadorMontado>;
const elenco = comElenco(montar());
const AJUSTES: { rounds: number; time: number; shake: boolean } = { rounds: 2, time: 99, shake: true };

function fonteManual() {
  const frame = { p1: { ...INPUT_VAZIO } as InputFrame, p2: { ...INPUT_VAZIO } as InputFrame };
  const fonte: FonteEntradas = { p1: () => ({ ...frame.p1 }), p2: () => ({ ...frame.p2 }) };
  return { frame, fonte };
}

type Luta = { g: Game; frame: ReturnType<typeof fonteManual>['frame']; passo: () => EventoLuta[] };

function lutaDeChefe(cfg: Partial<ConfigPartida> = {}, ajustes = AJUSTES, rng: Rng = criarRng(11), lut = elenco): Luta {
  const g = new Game({ lutadores: lut, rng });
  g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true, ...cfg }, { ...ajustes });
  const { frame, fonte } = fonteManual();
  return {
    g,
    frame,
    passo: () => {
      g.update(fonte);
      return [...g.events];
    },
  };
}

function ateALuta(l: Luta): void {
  for (let i = 0; i < 400 && l.g.phase !== 'fight'; i++) l.passo();
  expect(l.g.phase).toBe('fight');
}

const etapas = (ev: readonly EventoLuta[]): string[] => ev.filter((e): e is EventoFaseChefe => e.tipo === 'fase-chefe').map((e) => e.etapa);
const tipos = (ev: readonly EventoLuta[], t: EventoLuta['tipo']): EventoLuta[] => ev.filter((e) => e.tipo === t);

/** Anda até a cena começar (ou estoura). Devolve os eventos vistos no caminho. */
function ateACena(l: Luta, max = 600): EventoLuta[] {
  const vistos: EventoLuta[] = [];
  for (let i = 0; i < max && l.g.phase !== 'cena-chefe'; i++) vistos.push(...l.passo());
  expect(l.g.phase).toBe('cena-chefe');
  return vistos;
}

/** Anda até a luta voltar (fim da cena). */
function ateOFimDaCena(l: Luta, max = 300): EventoLuta[] {
  const vistos: EventoLuta[] = [];
  for (let i = 0; i < max && l.g.phase === 'cena-chefe'; i++) vistos.push(...l.passo());
  expect(l.g.phase).toBe('fight');
  return vistos;
}

/** Projétil do `dono` (golpe sFire) colado em (x, y) no próximo tick. */
function projetilEm(g: Game, dono: 0 | 1, x: number, y: number): void {
  const f = g.fighters[dono];
  g.lancarProjetil(f, f.ch.moves.sFire, 0, 1);
  const pr = g.projectiles[g.projectiles.length - 1];
  if (!pr) throw new Error('projétil não nasceu');
  pr.x = x;
  pr.y = y;
}

// ---------------------------------------------------------------------------------------------------------------------
describe('troca de barra em estados raros do chefe', () => {
  it('no ar: o projétil derruba a barra, o chefe cai e a cena só começa com ele no chão, em estado livre', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    c.hp = 0.5;
    c.y = GROUND - 150;
    c.vy = 0;
    c.setState('jump');
    projetilEm(g, 0, c.x - 20, c.y - 120);
    const ev = l.passo();
    expect(etapas(ev)).toEqual(['troca']);
    expect(tipos(ev, 'ko')).toHaveLength(0);
    expect([c.barras, c.hp, g.phase]).toEqual([1, 75, 'fight']);
    expect(c.state).toBe('down'); // no ar a reação é derrubar

    // enquanto estiver no ar/caído nunca há cena; ela abre no primeiro tick livre e no chão
    let viuNoAr = false;
    for (let i = 0; i < 400 && g.phase !== 'cena-chefe'; i++) {
      l.passo();
      if (c.y < GROUND) viuNoAr = true;
      if (g.phase === 'fight') expect(c.state, `tick ${i}`).not.toBe('cena');
    }
    expect(viuNoAr).toBe(true); // o teste realmente passou pelo ar
    expect(g.phase).toBe('cena-chefe');
    expect(c.y).toBe(GROUND);
    expect(c.state).toBe('cena');
    ateOFimDaCena(l);
    expect(c.ficha).toBe('chefe2');
  });

  it('em golpe com armadura: a armadura não engole a barra; golpe que zera interrompe o golpe do chefe e troca', () => {
    const arm = montar({ mods: { ...WEI_LONG.mods, hp: { ...WEI_LONG.mods.hp, S: 30, A: 20, R: 10, armor: 1 } } });
    const lut = comElenco(arm);

    // controle: com a barra cheia, a armadura absorve (nada de troca, o golpe do chefe segue)
    const a = lutaDeChefe({}, AJUSTES, criarRng(11), lut);
    ateALuta(a);
    a.g.p2.startMove('hp', a.g);
    expect(a.g.p2.armor).toBeGreaterThan(0);
    a.g.p1.x = 420;
    a.g.p2.x = 480;
    a.frame.p1.hp = true;
    for (let i = 0; i < 25; i++) {
      a.passo();
      a.frame.p1.hp = false;
    }
    expect(a.g.p2.barras).toBe(2);

    // o golpe forte que ZERA a barra passa pela armadura: troca, o golpe do chefe é cancelado
    const l = lutaDeChefe({}, AJUSTES, criarRng(11), lut);
    ateALuta(l);
    const c = l.g.p2;
    c.hp = 0.5;
    c.startMove('hp', l.g);
    expect(c.armor).toBeGreaterThan(0);
    l.g.p1.x = 420;
    c.x = 480;
    l.frame.p1.hp = true;
    let ev: EventoLuta[] = [];
    for (let i = 0; i < 30 && etapas(ev).length === 0; i++) {
      ev = l.passo();
      l.frame.p1.hp = false;
    }
    expect(etapas(ev)).toEqual(['troca']);
    expect(tipos(ev, 'armor')).toHaveLength(0);
    expect([c.barras, c.hp]).toEqual([1, 75]);
    expect(c.state).not.toBe('move');
    expect(c.move).toBeNull();
    // a luta segue e a cena abre normalmente
    ateACena(l);
    expect(c.state).toBe('cena');
  });

  it('o chefe no meio do golpe de arremesso dele: levar o soco que troca a barra cancela o agarrão (ninguém é arremessado depois)', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    c.hp = 0.5;
    g.p1.x = 420;
    c.x = 480;
    l.frame.p1.hp = true; // soco forte do jogador: a caixa abre em mt = 7
    l.passo();
    l.frame.p1.hp = false;
    while (g.p1.mt < 5) l.passo();
    c.startMove('throw', g); // agarrão do chefe: testa em mt = 3, isto é, DEPOIS de o soco do jogador acertar
    expect(c.move).toBe('throw');
    const hpJogador = g.p1.hp;
    const todos: EventoLuta[] = [];
    for (let i = 0; i < 200; i++) todos.push(...l.passo());
    expect(etapas(todos)).toEqual(['troca', 'cena', 'retomada']);
    expect(tipos(todos, 'throw')).toHaveLength(0);
    expect(g.p1.hp).toBe(hpJogador);
    expect(c.move === 'throw').toBe(false);
    expect(g.phase).not.toBe('ko');
  });

  it('arremesso do jogador (golpe REAL, → + soco forte) que zera a barra: troca, hitstop 20, tremor 14, ordem dos eventos, sem KO', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    c.hp = 0.5;
    g.p1.x = 420;
    c.x = 480;
    l.frame.p1.right = true;
    l.frame.p1.hp = true;
    const todos: EventoLuta[] = [];
    let tickDaTroca = -1;
    for (let i = 0; i < 20 && tickDaTroca < 0; i++) {
      const ev = l.passo();
      l.frame.p1.hp = false;
      l.frame.p1.right = false;
      todos.push(...ev);
      if (etapas(ev).length) tickDaTroca = i;
    }
    expect(tickDaTroca).toBeGreaterThanOrEqual(0);
    expect(g.p1.move).toBe('throw');
    const ordem = todos.map((e) => e.tipo).filter((t) => t === 'fase-chefe' || t === 'throw' || t === 'ko');
    expect(ordem).toEqual(['fase-chefe', 'throw']);
    expect([g.hitstop, g.shake]).toEqual([20, 14]);
    expect([c.barras, c.hp, c.hpShown, g.phase, c.cenaPendente]).toEqual([1, 75, 75, 'fight', true]);
    expect(c.state).toBe('down'); // arremesso derruba
    expect(c.gotHits).toBe(0);
    // e a cena vem depois, uma só vez
    const resto = ateACena(l);
    expect(etapas(resto)).toEqual(['cena']);
  });

  it('arremesso do jogador com o tremor desligado: a troca congela 20 ticks e não treme (shake 0)', () => {
    const l = lutaDeChefe({}, { ...AJUSTES, shake: false });
    ateALuta(l);
    const c = l.g.p2;
    c.hp = 0.5;
    l.g.p1.x = 420;
    c.x = 480;
    l.frame.p1.right = true;
    l.frame.p1.hp = true;
    let visto = false;
    for (let i = 0; i < 20 && !visto; i++) {
      const ev = l.passo();
      l.frame.p1.hp = false;
      l.frame.p1.right = false;
      visto = etapas(ev).length > 0;
    }
    expect(visto).toBe(true);
    expect(l.g.hitstop).toBe(20);
    expect(l.g.shake).toBe(0);
  });

  it('golpe comum com o tremor desligado: a troca congela 20 ticks e o tremor é 0', () => {
    const l = lutaDeChefe({}, { ...AJUSTES, shake: false });
    ateALuta(l);
    l.g.p2.hp = 0.5;
    l.g.p1.x = 420;
    l.g.p2.x = 480;
    l.frame.p1.hp = true;
    let visto = false;
    for (let i = 0; i < 40 && !visto; i++) {
      const ev = l.passo();
      l.frame.p1.hp = false;
      visto = etapas(ev).length > 0;
    }
    expect(visto).toBe(true);
    expect([l.g.hitstop, l.g.shake]).toEqual([20, 0]);
  });

  it('(além do contrato) chefe de 3 barras: duas trocas, duas danças, ficha da fase 2 nas duas, KO só na terceira', () => {
    const l = lutaDeChefe({}, AJUSTES, criarRng(11), comElenco(montar({ chefe: { ...CFG, barras: TRES } })));
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    expect([c.barras, c.barrasMax, c.vidaTotal]).toEqual([3, 3, 225]);
    const todas: string[] = [];
    for (const esperado of [2, 1]) {
      g.p2.hp = 0;
      expect(g.resolverVidaZerada(c, g.p1)).toBe(false);
      expect(c.barras).toBe(esperado);
      todas.push(...etapas(ateACena(l)));
      todas.push(...etapas(ateOFimDaCena(l)));
      // tira o congelamento/invulnerabilidade herdados e confere o estado de volta
      expect(c.ficha).toBe('chefe2');
      expect(c.state).toBe('idle');
    }
    expect(todas).toEqual(['troca', 'cena', 'retomada', 'troca', 'cena', 'retomada']);
    expect([c.barras, c.hp]).toEqual([1, 75]);
    c.hp = 0;
    expect(g.resolverVidaZerada(c, g.p1)).toBe(true); // a terceira vida zerada é KO
    expect(g.phase).toBe('ko');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('cena: o que pode vazar para dentro dela', () => {
  /** Troca REAL de barra: o soco forte do jogador (golpe de verdade, via applyHit) zera a barra. */
  function trocaReal(l: Luta): void {
    const { g } = l;
    g.p2.hp = 0.5;
    g.p1.x = 420;
    g.p2.x = 480;
    l.frame.p1.hp = true;
    let visto = false;
    for (let i = 0; i < 40 && !visto; i++) {
      visto = etapas(l.passo()).includes('troca');
      l.frame.p1.hp = false;
    }
    expect(visto).toBe(true);
  }

  /**
   * Projétil do `dono` quase parado, a 110 px do alvo: só o alcançaria ~190 ticks depois, isto é, DEPOIS do fim da cena
   * (que abre em ~20 ticks e dura 90). Se a cena não o apagar, ele acerta na retomada.
   */
  function projetilLento(g: Game, dono: 0 | 1): void {
    const alvo = g.fighters[dono === 0 ? 1 : 0];
    projetilEm(g, dono, alvo.x + (dono === 0 ? -110 : 110), alvo.y - 120);
    const pr = g.projectiles[g.projectiles.length - 1];
    if (!pr) throw new Error('sem projétil');
    pr.vx = pr.dir * 0.2;
    pr.life = 1000;
  }

  it('projétil do JOGADOR em voo na entrada da cena: some; não reaparece quando a luta retoma e nada acerta o chefe', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    trocaReal(l);
    projetilLento(g, 0);
    expect(g.projectiles).toHaveLength(1);
    ateACena(l);
    expect(g.projectiles).toHaveLength(0);
    const hp = g.p2.hp;
    const depois = [...ateOFimDaCena(l)];
    for (let i = 0; i < 260; i++) depois.push(...l.passo());
    expect(tipos(depois, 'hit')).toHaveLength(0);
    expect(g.p2.hp).toBe(hp);
    expect(g.projectiles).toHaveLength(0);
  });

  it('projétil do CHEFE em voo na entrada da cena: também some e não acerta o jogador quando a luta retoma', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    trocaReal(l);
    projetilLento(g, 1);
    expect(g.projectiles).toHaveLength(1);
    ateACena(l);
    expect(g.projectiles).toHaveLength(0);
    const hp = g.p1.hp;
    const depois = [...ateOFimDaCena(l)];
    for (let i = 0; i < 260; i++) depois.push(...l.passo());
    expect(tipos(depois, 'hit')).toHaveLength(0);
    expect(g.p1.hp).toBe(hp);
  });

  it('o jogador não ganha ataque novo dentro da cena: soco ainda no buffer (apertado antes dela, golpe anterior acabando) não dispara com a dança em andamento', () => {
    // O `buf` de ataque do Fighter vale 9 ticks e segue sendo consumido na cena, embora o Game mande NO_INPUT. Sem a
    // cena, o golpe sairia normalmente; COM a cena o jogador ataca um chefe que dança (energia gasta, som de golpe).
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1); // troca direta: o chefe fica livre e a cena abre no 1º tick depois do congelamento
    for (let i = 0; i < 25 && g.hitstop > 0; i++) l.passo();
    expect([g.hitstop, g.phase, g.p2.state]).toEqual([0, 'fight', 'idle']);
    g.p1.startMove('lp', g); // o jogador ainda "termina" um golpe curto...
    g.p1.mt = 8; // ...que acaba ~5 ticks depois da cena abrir
    l.frame.p1.hp = true; // e aperta soco forte no ÚLTIMO tick de 'fight' (a cena abre no fim dele)
    l.passo();
    l.frame.p1.hp = false;
    expect(g.phase).toBe('cena-chefe');
    const eventos: EventoLuta[] = [];
    for (let i = 0; i < 12 && g.phase === 'cena-chefe'; i++) {
      eventos.push(...l.passo());
      expect(g.p1.move === 'hp', `tick ${i} da cena: o jogador socou durante a dança`).toBe(false);
    }
    expect(eventos.filter((e) => e.tipo === 'swing' && e.lutador === 0)).toHaveLength(0);
  });

  it('fim de tempo com a cena pendente e o chefe ainda caído: vale o tempo, a luta acaba e nenhuma cena abre depois', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.timeMax = 1;
    g.timeLeft = 1;
    const c = g.p2;
    c.hp = 0;
    g.p1.hp = 50;
    g.p1.x = 420;
    c.x = 480;
    g.resolverVidaZerada(c, g.p1);
    c.knockdown(1, 6); // continua caído quando o relógio zera
    c.invuln = 60;
    g.hitstop = 0;
    (g as unknown as { tick60: number }).tick60 = 59;
    l.passo();
    expect(g.phase).toBe('timeover');
    expect(c.cenaPendente).toBe(true);
    for (let i = 0; i < 400 && !g.matchDone; i++) {
      l.passo();
      expect(g.phase).not.toBe('cena-chefe');
    }
    expect(g.phase).toBe('matchend');
    expect(g.matchWinner).toBe(1); // vidaTotal decide: 75 do chefe (barra final) contra 50 do jogador
  });

  it('empate por tempo com a cena pendente: novo round, chefe volta a 2 barras, ficha 1, sem cena fantasma', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.timeMax = 1;
    g.timeLeft = 1;
    const c = g.p2;
    c.hp = 0;
    g.resolverVidaZerada(c, g.p1); // barra 2 → 1, cena pendente
    g.p1.hp = c.vidaTotal; // 75 contra 75: empate exato
    c.knockdown(1, 6);
    c.invuln = 60;
    g.hitstop = 0;
    (g as unknown as { tick60: number }).tick60 = 59;
    for (let i = 0; i < 400 && g.round === 1; i++) {
      l.passo();
      expect(g.phase).not.toBe('cena-chefe');
    }
    expect(g.round).toBe(2);
    expect(g.winner).toBeNull();
    expect([c.barras, c.hp, c.ficha, c.cenaPendente, c.state, g.phase]).toEqual([2, 75, 'chefe', false, 'idle', 'intro']);
    expect(c.invuln).toBe(0);
    for (let i = 0; i < 200; i++) {
      l.passo();
      expect(g.phase).not.toBe('cena-chefe');
    }
  });

  it('KO do chefe depois de um round perdido-e-empatado: a barra final ainda precisa de uma nova troca antes (não nasce com 1 barra)', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    ateACena(l);
    ateOFimDaCena(l);
    g.p2.hp = 0;
    g.p1.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1); // KO do chefe (última barra)
    g.resolverVidaZerada(g.p1, g.p2); // KO duplo
    for (let i = 0; i < 400 && g.round === 1; i++) l.passo();
    expect(g.round).toBe(2);
    expect([g.p2.barras, g.p2.barrasMax, g.p2.ficha]).toEqual([2, 2, 'chefe']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('mesmo tick: troca de barra x tudo o mais que acontece nele', () => {
  /** Prepara: P1 acerta o soco forte no chefe (barra a zerar) e injeta um projétil do chefe sobre o P1 no mesmo tick. */
  function trocaComProjetilDoChefe(hpDoJogador: number): { l: Luta; ev: EventoLuta[] } {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0.5;
    g.p1.hp = hpDoJogador;
    g.p1.x = 420;
    g.p2.x = 480;
    l.frame.p1.hp = true;
    const S = g.p1.ch.moves.hp.S;
    let ev: EventoLuta[] = [];
    for (let i = 0; i < 40; i++) {
      // no tick em que a caixa do soco abre (mt vira S), o projétil do chefe também chega ao jogador
      if (g.p1.state === 'move' && g.p1.mt === S - 1) projetilEm(g, 1, g.p1.x, g.p1.y - 120);
      ev = l.passo();
      l.frame.p1.hp = false;
      if (etapas(ev).length) break;
    }
    return { l, ev };
  }

  it('KO do jogador pelo projétil do chefe no mesmo tick em que a barra troca: vale o KO, nunca há cena, o chefe vence', () => {
    const { l, ev } = trocaComProjetilDoChefe(0.2);
    const { g } = l;
    expect(etapas(ev)).toEqual(['troca']);
    expect(tipos(ev, 'ko')).toHaveLength(1);
    expect(g.phase).toBe('ko');
    expect(g.p2.cenaPendente).toBe(true);
    for (let i = 0; i < 500 && !g.matchDone; i++) {
      l.passo();
      expect(g.phase).not.toBe('cena-chefe');
    }
    expect(g.phase).toBe('matchend');
    expect(g.matchWinner).toBe(1);
    expect(g.perfect).toBe(false); // o chefe perdeu uma barra
    expect(g.p1.score).toBeLessThan(CFG.bonusVitoria); // quem perdeu não ganha o bônus
  });

  it('o congelamento da troca (hitstop 20 / tremor 14) sobrevive a um projétil do chefe que acerta o jogador no MESMO tick', () => {
    // applyHit(chefe → jogador) roda DEPOIS do applyHit que trocou a barra e regrava hitstop/tremor (4/5): a flag
    // `trocaDeBarraNoTick` já foi consumida pelo primeiro applyHit, então ninguém reforça de novo.
    const { l, ev } = trocaComProjetilDoChefe(100);
    expect(etapas(ev)).toEqual(['troca']);
    expect(tipos(ev, 'hit').length).toBeGreaterThanOrEqual(2); // o soco no chefe e o projétil no jogador
    expect([l.g.hitstop, l.g.shake]).toEqual([20, 14]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('flag trocaDeBarraNoTick e chamadas diretas de resolverVidaZerada', () => {
  function hitstopDoProximoProjetil(g: Game, l: Luta): number {
    // espera o congelamento da troca e a dança passarem (um golpe no tick em que a cena abre teria o hitstop zerado por ela)
    for (let i = 0; i < 300 && (g.hitstop > 0 || g.phase !== 'fight' || g.p2.cenaPendente); i++) l.passo();
    expect([g.hitstop, g.phase, g.p2.cenaPendente]).toEqual([0, 'fight', false]);
    g.p1.hp = 100;
    projetilEm(g, 1, g.p1.x, g.p1.y - 120); // golpe COMUM do chefe no jogador, sem relação com troca de barra
    const ev = l.passo();
    expect(tipos(ev, 'hit')).toHaveLength(1);
    return g.hitstop;
  }

  it('controle: sem chamada direta, um projétil comum congela 4 ticks', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    expect(hitstopDoProximoProjetil(l.g, l)).toBe(4);
  });

  it('chamada direta de resolverVidaZerada (troca de barra) não deixa estado escondido que infla o hitstop do PRÓXIMO golpe comum', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    expect(hitstopDoProximoProjetil(g, l)).toBe(4); // hoje sai 20: a flag ficou ligada até o próximo applyHit
  });

  it('a flag não atravessa um novo setup (Game reaproveitado): o primeiro golpe da luta seguinte tem hitstop normal (regressão: o clearFx a zera)', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    g.setup({ mode: 'versus', c1: 'hayato', c2: 'caio' }, { ...AJUSTES });
    const { fonte } = fonteManual();
    for (let i = 0; i < 400 && g.phase !== 'fight'; i++) g.update(fonte);
    g.p1.hp = 100;
    g.p2.hp = 100;
    g.lancarProjetil(g.p2, g.p2.ch.moves.sFire, 0, 1);
    const pr = g.projectiles[0];
    if (!pr) throw new Error('sem projétil');
    pr.x = g.p1.x;
    pr.y = g.p1.y - 120;
    g.update(fonte);
    expect(g.events.some((e) => e.tipo === 'hit')).toBe(true);
    expect(g.hitstop).toBe(4);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Game/Fighter reaproveitados entre lutas', () => {
  function rngTrocavel(seed: number) {
    let dentro = criarRng(seed);
    const rng: Rng = {
      proximo: () => dentro.proximo(),
      entre: (a, b) => dentro.entre(a, b),
      inteiro: (n) => dentro.inteiro(n),
      escolher: (i) => dentro.escolher(i),
      estado: () => dentro.estado(),
    };
    return { rng, ressemear: (s: number) => (dentro = criarRng(s)) };
  }

  const NADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };

  /** Resumo determinístico do que a LÓGICA produziu (câmera e contador global de ticks ficam de fora: não são regra). */
  function trilha(g: Game, ticks: number): string {
    const out: string[] = [];
    for (let i = 0; i < ticks; i++) {
      g.update(NADA);
      const f = g.fighters.map((x) => [x.x, x.y, x.hp, x.en, x.state, x.move, x.mt, x.stun, x.invuln, x.facing, x.wins, x.score, x.barras, x.ficha]);
      out.push(JSON.stringify([g.phase, g.t, g.timeLeft, g.projectiles.length, g.round, g.hitstop, g.shake, f, g.events.map((e) => e.tipo)]));
    }
    return out.join('\n');
  }

  it('luta normal depois de uma luta de chefe (parada NO MEIO da cena) é idêntica à mesma luta num Game novo', () => {
    const A = rngTrocavel(42);
    const novo = new Game({ lutadores: elenco, rng: A.rng });
    novo.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 2, p1cpu: 2 }, { ...AJUSTES });
    const esperado = trilha(novo, 1500);

    const B = rngTrocavel(7);
    const usado = new Game({ lutadores: elenco, rng: B.rng });
    usado.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true }, { ...AJUSTES });
    const m = fonteManual();
    for (let i = 0; i < 400 && usado.phase !== 'fight'; i++) usado.update(m.fonte);
    // troca REAL (soco do jogador), cena aberta, e a luta é interrompida NO MEIO da dança com um projétil na mão
    usado.p2.hp = 0.5;
    usado.p1.x = 420;
    usado.p2.x = 480;
    m.frame.p1.hp = true;
    for (let i = 0; i < 40 && usado.p2.barras === 2; i++) {
      usado.update(m.fonte);
      m.frame.p1.hp = false;
    }
    expect(usado.p2.barras).toBe(1);
    for (let i = 0; i < 600 && usado.phase !== 'cena-chefe'; i++) usado.update(m.fonte);
    expect(usado.phase).toBe('cena-chefe');
    for (let i = 0; i < 20; i++) usado.update(m.fonte);
    usado.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 2, p1cpu: 2 }, { ...AJUSTES });
    B.ressemear(42);
    expect(trilha(usado, 1500)).toBe(esperado);
  });

  it('chefe → chefe com outra config (3 barras, fichas trocadas): nada da primeira config sobra', () => {
    const l = lutaDeChefe({ cpu: 1 });
    ateALuta(l);
    l.g.p2.hp = 0;
    l.g.resolverVidaZerada(l.g.p2, l.g.p1);
    ateACena(l);
    ateOFimDaCena(l);
    expect(l.g.p2.ficha).toBe('chefe2');

    const cfg3: ConfigChefe = { ...CFG, barras: TRES, hpPorBarra: 40, fichaFase1: 'chefe2', fichaFase2: 'chefe', cena: { duracao: 30, poses: ['devekh0', 'devekh1', 'devekh2'] }, bonusVitoria: 1 };
    const l3 = comElenco(montar({ chefe: cfg3 }));
    const g = new Game({ lutadores: l3, rng: criarRng(3) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true, cpu: 1 }, { ...AJUSTES });
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    // reaproveita o MESMO Game para um chefe de outra config? o Game guarda `lutadores` do construtor; basta checar o reset interno
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true, cpu: 1 }, { ...AJUSTES });
    expect([g.p2.barras, g.p2.barrasMax, g.p2.maxHp, g.p2.hp, g.p2.ficha, g.p2.cenaPendente, g.p2.invuln]).toEqual([3, 3, 40, 40, 'chefe2', false, 0]);
    expect(g.p2.perfilIa).toEqual(perfilChefe(1, false));
  });

  it('o jogador P1 nunca vira chefe, nem usando o lutador-chefe como P1', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(3) });
    g.setup({ mode: 'versus', c1: BAATAR, c2: 'caio', chefe: true }, { ...AJUSTES });
    expect([g.p1.chefe, g.p1.barras, g.p1.ficha, g.p2.chefe, g.winsNeeded]).toEqual([false, 1, null, false, 2]);
    g.p1.hp = 0;
    expect(g.resolverVidaZerada(g.p1, g.p2)).toBe(true);
  });

  it('espelho: o chefe contra o BAATAR jogável (mesmo id) — só o P2 é chefe e as fichas não vazam para o P1', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(3) });
    g.setup({ mode: 'versus', c1: BAATAR, c2: BAATAR, chefe: true }, { ...AJUSTES });
    expect([g.p1.chefe, g.p1.barrasMax, g.p1.ficha, g.p1.maxHp]).toEqual([false, 1, null, 118]);
    expect([g.p2.chefe, g.p2.barrasMax, g.p2.ficha, g.p2.maxHp]).toEqual([true, 2, 'chefe', 75]);
    expect(g.p1.ch).toBe(elenco[BAATAR]);
    expect(g.p2.ch).not.toBe(g.p1.ch);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('dados ruins: ficha que não existe, chefe sem def', () => {
  const comFichas = (chefe: Partial<ConfigChefe>) => comElenco(montar({ chefe: { ...CFG, ...chefe } }));

  it('fichaFase1 inexistente: o setup falha ALTO e nomeia a ficha; o mesmo Game faz uma luta normal limpa depois', () => {
    const g = new Game({ lutadores: comFichas({ fichaFase1: 'nao-existe' }), rng: criarRng(3) });
    expect(() => g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true }, { ...AJUSTES })).toThrow(/ficha desconhecida 'nao-existe'/);
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR }, { ...AJUSTES }); // sem chefe: o BAATAR jogável
    expect([g.p2.chefe, g.p2.barrasMax, g.p2.ficha, g.p2.cfgChefe, g.winsNeeded, g.p2.maxHp]).toEqual([false, 1, null, null, 2, 118]);
  });

  it('fichaFase2 inexistente é recusada JÁ na montagem/setup, não 90 ticks depois da primeira troca, no meio da luta', () => {
    // Hoje só `andarCenaDoChefe` chama trocarFicha(fichaFase2): o erro estoura dentro de Game.update com o jogo em
    // 'cena-chefe' para sempre (cada tick lança de novo). Validar na montagem/virarChefe (fail-fast) resolve.
    const ruim = () => {
      const lut = comFichas({ fichaFase2: 'fase2-com-typo' });
      const g = new Game({ lutadores: lut, rng: criarRng(3) });
      g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true }, { ...AJUSTES });
    };
    expect(ruim).toThrow(/ficha/i);
  });

  it('(regressão do bug acima) fichaFase2 inexistente: o setup lança e nomeia a ficha; nada de jogo preso em cena-chefe', () => {
    expect(() => lutaDeChefe({}, AJUSTES, criarRng(3), comFichas({ fichaFase2: 'fase2-com-typo' }))).toThrow(/ficha desconhecida 'fase2-com-typo'/);
  });

  it('render: ficha desconhecida na leitura cai no lutador base, sem lançar (chDaFicha)', () => {
    const b = elenco[BAATAR];
    expect(chDaFicha(b, 'nao-existe')).toBe(b);
    expect(chDaFicha(b, null)).toBe(b);
    expect(chDaFicha(b, '')).toBe(b);
    expect(chDaFicha(b, 'chefe2')).toBe(b.fichas['chefe2']);
  });

  it('(endurecimento, baixíssima) nome herdado de Object.prototype não é ficha: nem na render nem no Fighter', () => {
    // `fichas` é um objeto simples: `fichas['toString']` acha a função herdada. Sem risco prático hoje (os nomes vêm de
    // dados tipados do repositório, não do jogador), mas a promessa "desconhecido → base / erro" fica furada.
    const b = elenco[BAATAR];
    expect(chDaFicha(b, 'toString')).toBe(b);
    const l = lutaDeChefe();
    expect(() => l.g.p2.trocarFicha('constructor')).toThrow(/ficha desconhecida/);
  });

  it('cfg.chefe sem LutadorDef.chefe: luta CPU x CPU idêntica, tick a tick, à mesma sem cfg.chefe (semente 42)', () => {
    const rodar = (chefe: boolean): string => {
      const g = new Game({ lutadores: base, rng: criarRng(42) });
      g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 2, p1cpu: 2, ...(chefe ? { chefe: true } : {}) }, { ...AJUSTES });
      const out: string[] = [];
      for (let i = 0; i < 2500; i++) {
        g.update({ p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) });
        out.push(JSON.stringify([g.phase, g.p1.hp, g.p2.hp, g.p1.x, g.p2.x, g.p1.state, g.p2.state, g.winsNeeded, g.events.map((e) => e.tipo)]));
      }
      return out.join('\n');
    };
    expect(rodar(true)).toBe(rodar(false));
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('perfect e bônus com chefe', () => {
  it('jogador vence o chefe depois de levar dano: não é perfeito (e ainda leva o bônus)', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p1.hp = g.p1.maxHp - 5;
    g.p2.barras = 1;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    for (let i = 0; i < 400 && !g.matchDone; i++) l.passo();
    expect(g.perfect).toBe(false);
    expect(g.p1.score).toBeGreaterThanOrEqual(CFG.bonusVitoria);
  });

  it('o chefe vence por KO sem ter perdido barra e sem levar dano: perfeito; o bônus de chefe NÃO vai para o chefe', () => {
    const pontosDoChefe = (bonus: number): { score: number; perfect: boolean; vencedor: number | null } => {
      const l = lutaDeChefe({}, AJUSTES, criarRng(11), comElenco(montar({ chefe: { ...CFG, bonusVitoria: bonus } })));
      ateALuta(l);
      const { g } = l;
      g.p1.hp = 0;
      expect(g.resolverVidaZerada(g.p1, g.p2)).toBe(true);
      for (let i = 0; i < 400 && !g.matchDone; i++) l.passo();
      return { score: g.p2.score, perfect: g.perfect, vencedor: g.matchWinner };
    };
    const com = pontosDoChefe(7777);
    const sem = pontosDoChefe(0);
    expect(com.vencedor).toBe(1);
    expect(com.perfect).toBe(true);
    expect(com.score).toBe(sem.score); // o bônus só vai para quem derrota o chefe
  });

  it('o chefe vence na 2ª barra por KO do jogador: não é perfeito', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    ateACena(l);
    ateOFimDaCena(l);
    g.p1.hp = 0;
    g.resolverVidaZerada(g.p1, g.p2);
    for (let i = 0; i < 400 && !g.matchDone; i++) l.passo();
    expect(g.matchWinner).toBe(1);
    expect(g.perfect).toBe(false);
  });

  it('o evento `perfect` só sai junto com g.perfect (não existe perfect "fantasma" com chefe)', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.p2.barras = 1;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    const todos: EventoLuta[] = [];
    for (let i = 0; i < 400 && !g.matchDone; i++) todos.push(...l.passo());
    expect(tipos(todos, 'perfect')).toHaveLength(g.perfect ? 1 : 0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('determinismo', () => {
  const NADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };

  /** Chefe (CPU FÁCIL, para a barra cair) contra o hayato na CPU DIFÍCIL, até o fim da luta. */
  function luta(seed: number): string {
    const g = new Game({ lutadores: elenco, rng: criarRng(seed) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR, chefe: true, cpu: 0, p1cpu: 2 }, { ...AJUSTES, rounds: 3 });
    const out: string[] = [];
    for (let i = 0; i < 6000 && !g.matchDone; i++) {
      g.update(NADA);
      const f = g.fighters.map((x) => [x.x, x.y, x.hp, x.state, x.move, x.barras, x.ficha, x.invuln, x.cenaPendente]);
      out.push(JSON.stringify([g.phase, g.t, g.round, g.hitstop, g.shake, f, g.events.map((e) => (e.tipo === 'fase-chefe' ? e.etapa : e.tipo))]));
    }
    return out.join('\n');
  }

  it('mesma semente, chefe x CPU: saída idêntica tick a tick; semente diferente: saída diferente', () => {
    const a = luta(2);
    expect(luta(2)).toBe(a);
    expect(luta(3)).not.toBe(a);
  });

  it('e a luta determinística realmente passa por troca, dança e retomada (não prova determinismo no vazio)', () => {
    const vistos = new Set<string>();
    for (const linha of luta(2).split('\n')) for (const e of (JSON.parse(linha) as unknown[][])[6] as string[]) vistos.add(e);
    expect([...vistos].filter((e) => ['troca', 'cena', 'retomada'].includes(e)).sort()).toEqual(['cena', 'retomada', 'troca']);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('fuzz de invariantes: CPU e apertador de botão contra o chefe (golpes, arremessos, projéteis, armadura reais)', () => {
  type Cenario = { c1: IdLutador; p1cpu: number | null; cpuChefe: number };
  const CENARIOS: Cenario[] = [
    { c1: 'hayato', p1cpu: 2, cpuChefe: 0 },
    { c1: 'caio', p1cpu: 2, cpuChefe: 0 },
    { c1: 'wei-long', p1cpu: 2, cpuChefe: 1 },
    { c1: 'min-ji', p1cpu: 2, cpuChefe: 0 },
    { c1: 'hayato', p1cpu: null, cpuChefe: 0 }, // humano apertando botões ao acaso (inclui → + soco forte = arremesso)
    { c1: 'wei-long', p1cpu: null, cpuChefe: 1 },
  ];
  // o chefe com armadura em vários golpes, para a armadura entrar na mistura
  const lutArmada = comElenco(montar({ mods: { ...WEI_LONG.mods, hp: { ...WEI_LONG.mods.hp, armor: 1 }, hk: { ...WEI_LONG.mods.hk, armor: 1 } } }));

  function apertador(seed: number): FonteEntradas {
    const r = criarRng(seed * 31 + 5);
    let direcao: Partial<InputFrame> = {};
    let ate = 0;
    let n = 0;
    return {
      p1: () => {
        if (n++ >= ate) {
          ate = n + 4 + r.inteiro(14);
          const d = r.inteiro(6);
          direcao = d === 0 ? { left: true } : d === 1 || d === 2 ? { right: true } : d === 3 ? { down: true } : d === 4 ? { up: true } : {};
        }
        const ataque: Partial<InputFrame> = r.proximo() < 0.3 ? { [r.escolher(['lp', 'lk', 'hp', 'hk', 'sp'] as const)]: true } : {};
        return { ...INPUT_VAZIO, ...direcao, ...ataque };
      },
      p2: () => ({ ...INPUT_VAZIO }),
    };
  }

  type Placar = { trocas: number; dancas: number; retomadas: number; mortesDoChefe: number; throws: number; armaduras: number };

  function fuzz(cen: Cenario, seeds: readonly number[]): Placar {
    const placar: Placar = { trocas: 0, dancas: 0, retomadas: 0, mortesDoChefe: 0, throws: 0, armaduras: 0 };
    for (const seed of seeds) {
      const g = new Game({ lutadores: lutArmada, rng: criarRng(seed) });
      g.setup({ mode: 'versus', c1: cen.c1, c2: BAATAR, chefe: true, cpu: cen.cpuChefe, p1cpu: cen.p1cpu }, { ...AJUSTES, rounds: 3 });
      const fonte = cen.p1cpu === null ? apertador(seed) : { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
      const c = g.p2;
      let seguidosDeCena = 0;
      let relogioDaCena = -1;
      let trocasNoRound = 0;
      let round = g.round;
      let sequencia: string[] = [];
      for (let t = 0; t < 5000 && !g.matchDone; t++) {
        g.update(fonte);
        const ev = g.events;
        const onde = `semente ${seed}, tick ${t} (${g.phase})`;
        if (g.round !== round) {
          round = g.round;
          trocasNoRound = 0;
          sequencia = [];
        }
        for (const e of ev) {
          if (e.tipo === 'fase-chefe') {
            sequencia.push(e.etapa);
            if (e.etapa === 'troca') {
              trocasNoRound++;
              placar.trocas++;
              expect(c.hpShown, onde).toBe(c.hp); // a barra nova enche no mesmo tick
            }
            if (e.etapa === 'cena') placar.dancas++;
            if (e.etapa === 'retomada') placar.retomadas++;
          }
          if (e.tipo === 'throw') placar.throws++;
          if (e.tipo === 'armor') placar.armaduras++;
          if (e.tipo === 'ko' && e.defensor === 1) placar.mortesDoChefe++;
        }
        // a ordem dos eventos do chefe, no round: troca, cena, retomada; sem repetir nem pular
        expect(['', 'troca', 'troca,cena', 'troca,cena,retomada'], `${onde}: ${sequencia.join(',')}`).toContain(sequencia.join(','));
        expect(trocasNoRound, onde).toBeLessThanOrEqual(c.barrasMax - 1);
        // barras e vida
        expect(c.barras, onde).toBeGreaterThanOrEqual(1);
        expect(c.barras, onde).toBeLessThanOrEqual(c.barrasMax);
        expect(c.hp, onde).toBeLessThanOrEqual(c.maxHp + 1e-9);
        expect(g.p1.barras, onde).toBe(1);
        if (g.phase === 'fight' || g.phase === 'cena-chefe') expect(c.hp, onde).toBeGreaterThan(0);
        // a ficha acompanha a fase: 'chefe2' só depois da retomada
        expect(c.ficha, onde).toBe(sequencia.includes('retomada') ? 'chefe2' : 'chefe');
        expect(c.ch, onde).toBe(lutArmada[BAATAR].fichas[c.ficha as string]);
        // cena: tudo parado
        if (g.phase === 'cena-chefe') {
          if (seguidosDeCena === 0) relogioDaCena = g.timer;
          seguidosDeCena++;
          expect(c.state, onde).toBe('cena');
          expect(c.grounded, onde).toBe(true);
          expect(g.projectiles, onde).toHaveLength(0);
          expect(g.hitstop, onde).toBe(0);
          expect(g.timer, onde).toBe(relogioDaCena);
          expect(c.cenaPendente, onde).toBe(false);
          expect(ev.filter((e) => e.tipo === 'hit' || e.tipo === 'armor' || e.tipo === 'block'), onde).toHaveLength(0);
          expect(seguidosDeCena, onde).toBeLessThanOrEqual(CFG.cena.duracao);
        } else {
          if (seguidosDeCena > 0 && g.phase === 'fight') expect(seguidosDeCena, onde).toBe(CFG.cena.duracao); // retomou: dançou os 90
          seguidosDeCena = 0;
        }
      }
    }
    return placar;
  }

  for (const [i, cen] of CENARIOS.entries()) {
    it(`cenário ${i}: ${cen.c1}, P1 ${cen.p1cpu === null ? 'apertador de botão' : 'CPU ' + cen.p1cpu}, chefe CPU ${cen.cpuChefe} (5 sementes): invariantes valem e o cenário não é vazio`, () => {
      const p = fuzz(cen, [1, 2, 3, 4, 5]);
      expect(p.trocas, 'trocas de barra').toBeGreaterThanOrEqual(2);
      expect(p.dancas, 'danças').toBeGreaterThanOrEqual(1);
      expect(p.retomadas, 'retomadas').toBeGreaterThanOrEqual(1);
    });
  }

  it('o apertador de botão exercita arremesso e armadura REAIS contra o chefe', () => {
    const p = fuzz({ c1: 'hayato', p1cpu: null, cpuChefe: 0 }, [1, 2, 3, 4, 5, 6, 7, 8]);
    expect(p.throws, 'arremessos').toBeGreaterThanOrEqual(1);
    expect(p.armaduras, 'acertos absorvidos por armadura').toBeGreaterThanOrEqual(1);
  });
});
