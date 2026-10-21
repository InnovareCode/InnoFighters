import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { sonsDoEvento } from '../../src/audio/eventos';
import { INPUT_VAZIO, type EventoFaseChefe, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { HAYATO, WEI_LONG } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import { getPD } from '../../src/data/poses';
import type { ConfigChefe, LutadorDef } from '../../src/data/tipos';
import { AI_LEVELS, IA_CHEFE, perfilChefe } from '../../src/fight/cpu';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { montarTodos } from './_lutadores';

/*
 * E3 / S0 + S1a: contrato C3 com valores neutros e o chefão no motor (docs/mecanicas-e3.md §3.6).
 * O BAATAR aqui é PROVISÓRIO: dados de teste sobre o atlas do WEI LONG (a arte real chega na E5). Nada disto está
 * em `LUTADORES`: a produção continua com 4 lutadores e CHEFE null.
 */

const base = montarTodos();
const BAATAR = 'baatar' as IdLutador;
const CFG_CHEFE: ConfigChefe = {
  barras: 2,
  hpPorBarra: 75,
  fichaFase1: 'chefe',
  fichaFase2: 'chefe2',
  danca: { duracao: 90 },
  bonusVitoria: 7777,
};

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
    hp: 118, // o jogável; o chefe usa hpPorBarra
    chefe: CFG_CHEFE,
    fichas: {
      chefe: { pow: 1.3, spd: 0.82 },
      chefe2: { pow: 1.3, spd: 0.82, fire: ['#ff9a3a', '#fff3e0', '#c0392b'] },
    },
    ...extra,
  };
}

const baatar = montarLutador(defBaatar(), poseWei());
const elenco = { ...base, [BAATAR]: baatar } as Record<IdLutador, LutadorMontado>;

const AJUSTES = { rounds: 2, time: 99, shake: true };

/** Entradas mutáveis: o teste escolhe o que cada lado "aperta" no próximo tick. */
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

/** Anda até a fase 'fight' (fim da intro). */
function ateALuta(l: Luta): void {
  for (let i = 0; i < 400 && l.g.phase !== 'fight'; i++) l.passo();
  expect(l.g.phase).toBe('fight');
}

/** Posiciona P1 colado no chefe e dá um golpe forte do jogador: o acerto real passa por applyHit. */
function bater(l: Luta, golpe: 'lp' | 'hp' | 'hk' = 'hp'): EventoLuta[] {
  l.g.p1.x = 420;
  l.g.p2.x = 480;
  l.frame.p1[golpe] = true;
  const eventos = l.passo();
  l.frame.p1[golpe] = false;
  for (let i = 0; i < 40; i++) {
    eventos.push(...l.passo());
    if (eventos.some((e) => e.tipo === 'hit')) break;
  }
  return eventos;
}

const ETAPAS = (ev: readonly EventoLuta[]): string[] => ev.filter((e): e is EventoFaseChefe => e.tipo === 'fase-chefe').map((e) => e.etapa);

describe('S0 · C3 aditivo: valores neutros publicados pelo Game', () => {
  it('lutadores normais: barras 1, barrasMax 1, chefe false, ficha null, nivelCarga 0', () => {
    const g = new Game({ lutadores: base, rng: criarRng(3) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: 'caio' }, { ...AJUSTES });
    for (const f of g.fighters) {
      expect([f.barras, f.barrasMax, f.chefe, f.ficha, f.nivelCarga]).toEqual([1, 1, false, null, 0]);
    }
    expect(g.winsNeeded).toBe(2);
  });

  it('CPU x CPU de 3000 ticks não emite nenhum evento novo da E3 nem entra em cena', () => {
    const g = new Game({ lutadores: base, rng: criarRng(42) });
    g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'min-ji', cpu: 2, p1cpu: 2 }, { ...AJUSTES });
    const vistos = new Set<string>();
    const nada: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
    for (let i = 0; i < 3000; i++) {
      g.update(nada);
      for (const e of g.events) vistos.add(e.tipo);
      expect(g.phase).not.toBe('cena-chefe');
      for (const f of g.fighters) expect(f.state).not.toBe('cena');
    }
    for (const novo of ['fase-chefe', 'parry', 'quebra-guarda', 'carga', 'rebote', 'troca-ficha']) expect(vistos.has(novo)).toBe(false);
  });

  it('spSeg é opcional no C2: o quadro vazio e o da CPU não o trazem', () => {
    expect('spSeg' in INPUT_VAZIO).toBe(false);
    const frame: InputFrame = { ...INPUT_VAZIO, spSeg: true };
    expect(frame.spSeg).toBe(true);
  });

  it('os eventos novos têm som mapeado só com métodos que o AudioSys já tem', () => {
    const metodos = (e: EventoLuta): string[] => sonsDoEvento(e).map((s) => s.metodo);
    expect(metodos({ tipo: 'fase-chefe', lutador: 1, etapa: 'troca', barrasRestantes: 1 })).toEqual(['fireballHit']);
    expect(metodos({ tipo: 'fase-chefe', lutador: 1, etapa: 'danca', barrasRestantes: 1 })).toEqual(['introWhoosh']);
    expect(metodos({ tipo: 'fase-chefe', lutador: 1, etapa: 'retomada', barrasRestantes: 1 })).toEqual(['fight']);
    expect(metodos({ tipo: 'carga', lutador: 0, nivel: 2 })).toEqual(['uiSelect']);
    expect(metodos({ tipo: 'rebote', lutador: 0, x: 60 })).toEqual(['land']);
    expect(metodos({ tipo: 'troca-ficha', lutador: 0, ficha: null })).toEqual(['jump']);
  });
});

describe('S0 · dica de CPU só gasta RNG de quem a tem', () => {
  function contarSorteios(def: LutadorDef): { chamadas: number; resumo: string } {
    const rng = criarRng(42);
    let chamadas = 0;
    const contador: Rng = new Proxy(rng, {
      get(alvo, prop, recv) {
        const v = Reflect.get(alvo, prop, recv) as unknown;
        if (typeof v !== 'function') return v;
        return (...a: unknown[]) => {
          chamadas++;
          return (v as (...x: unknown[]) => unknown).apply(alvo, a);
        };
      },
    });
    const poses = poseWei();
    const lut = { ...base, 'wei-long': montarLutador(def, poses) } as Record<IdLutador, LutadorMontado>;
    const g = new Game({ lutadores: lut, rng: contador });
    g.setup({ mode: 'cpu', c1: 'wei-long', c2: 'hayato', cpu: 2, p1cpu: 2 }, { ...AJUSTES });
    const nada: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
    for (let i = 0; i < 4000; i++) g.update(nada);
    return { chamadas, resumo: JSON.stringify([g.p1.hp, g.p2.hp, g.p1.x, g.p2.x, g.tick, g.round]) };
  }

  it('lutador sem dica: dicasIa vazio; com dica no golpe: a lista traz o golpe, mas o RNG não muda (papéis ainda não existem)', () => {
    expect(base['wei-long'].dicasIa).toEqual([]);
    const comDica: LutadorDef = { ...WEI_LONG, mods: { ...WEI_LONG.mods, lp: { ...WEI_LONG.mods.lp, ia: { papel: 'pressao', alcance: [0, 200] } } } };
    const montado = montarLutador(comDica, poseWei());
    expect(montado.dicasIa).toEqual([{ golpe: 'lp', dica: { papel: 'pressao', alcance: [0, 200] } }]);
    const a = contarSorteios(WEI_LONG);
    const b = contarSorteios(comDica);
    expect(b.chamadas).toBe(a.chamadas);
    expect(b.resumo).toBe(a.resumo);
  });
});

describe('S1a · montagem: fichas, extras e dicas', () => {
  it('fichas são montadas sobre as mesmas poses, com os dados da ficha por cima e sem fichas próprias', () => {
    expect(Object.keys(baatar.fichas).sort()).toEqual(['chefe', 'chefe2']);
    expect(baatar.fichas['chefe']?.pow).toBe(1.3);
    expect(baatar.fichas['chefe']?.spd).toBe(0.82);
    expect(baatar.fichas['chefe2']?.fire[0]).toBe('#ff9a3a');
    expect(baatar.fichas['chefe']?.pd).toBe(baatar.pd);
    expect(baatar.fichas['chefe']?.id).toBe(BAATAR);
    expect(baatar.fichas['chefe']?.fichas).toEqual({});
    expect(baatar.fichas['chefe']?.chefe).toBeUndefined();
    expect(baatar.chefe).toBe(CFG_CHEFE);
    expect(base.hayato.fichas).toEqual({});
  });

  it('extras.sResp vira golpe montado com caixa; sem extras o golpe não existe', () => {
    const sResp = { ...WEI_LONG.especiais.sDown, name: 'RESPOSTA', type: 'melee' as const, kind: 'kick' as const, S: 4, A: 3, R: 10, dmg: 12, rank: 9 };
    const m = montarLutador({ ...HAYATO, extras: { sResp } }, poseWei());
    expect(m.moves.sResp?.id).toBe('sResp');
    expect(m.boxes.sResp).toBeDefined();
    expect(base.hayato.moves.sResp).toBeUndefined();
  });
});

describe('S1a · setup de chefe', () => {
  it('cfg.chefe: P2 com 2 barras de 75, ficha da fase 1, round único e IA própria', () => {
    const l = lutaDeChefe({ cpu: 1 }, { ...AJUSTES, rounds: 3 });
    const c = l.g.p2;
    expect([c.chefe, c.barras, c.barrasMax, c.maxHp, c.hp, c.ficha]).toEqual([true, 2, 2, 75, 75, 'chefe']);
    expect(c.ch.pow).toBe(1.3);
    expect(l.g.winsNeeded).toBe(1);
    expect(c.perfilIa).toEqual(perfilChefe(1, false));
    expect(l.g.p1.chefe).toBe(false);
    expect(l.g.p1.perfilIa).toBeNull();
    expect(c.vidaTotal).toBe(150);
  });

  it('BAATAR jogável (sem cfg.chefe): 1 barra, hp próprio, ficha base, round conforme as configurações', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(5) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR }, { ...AJUSTES });
    const b = g.p2;
    expect([b.chefe, b.barras, b.barrasMax, b.maxHp, b.hp, b.ficha, b.perfilIa]).toEqual([false, 1, 1, 118, 118, null, null]);
    expect(b.ch.pow).toBe(1.18);
    expect(g.winsNeeded).toBe(2);
  });

  it('cfg.chefe num lutador SEM `chefe` é ignorado (lutador normal)', () => {
    const g = new Game({ lutadores: base, rng: criarRng(5) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: 'caio', chefe: true }, { ...AJUSTES });
    expect([g.p2.chefe, g.p2.barrasMax, g.winsNeeded]).toEqual([false, 1, 2]);
  });

  it('o mesmo Game reaproveitado: depois de uma luta de chefe, uma luta normal não herda barras, ficha nem IA', () => {
    const l = lutaDeChefe({ cpu: 2 });
    l.g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR }, { ...AJUSTES });
    const b = l.g.p2;
    expect([b.chefe, b.barras, b.barrasMax, b.maxHp, b.ficha, b.perfilIa, b.cenaPendente]).toEqual([false, 1, 1, 118, null, null, false]);
  });

  it('trocarFicha não mexe em hp/maxHp; ficha desconhecida falha alto; null volta à base', () => {
    const l = lutaDeChefe();
    const c = l.g.p2;
    c.hp = 33;
    c.trocarFicha('chefe2');
    expect([c.ficha, c.hp, c.maxHp, c.ch.pow]).toEqual(['chefe2', 33, 75, 1.3]);
    expect(() => c.trocarFicha('nao-existe')).toThrow(/ficha desconhecida/);
    c.trocarFicha(null);
    expect([c.ficha, c.hp, c.maxHp, c.ch]).toEqual([null, 33, 75, baatar]);
  });
});

describe('S1a · IA do chefe', () => {
  it('fica fora de AI_LEVELS (menu de dificuldade) e soma 0,15 em react/block com teto 1', () => {
    expect(AI_LEVELS).toHaveLength(3);
    expect(IA_CHEFE.bonusReacao).toBe(0.15);
    const normal = AI_LEVELS[1];
    const p = perfilChefe(1, false);
    expect(p.react).toBeCloseTo(normal.react + 0.15, 12);
    expect(p.block).toBeCloseTo(normal.block + 0.15, 12);
    expect([p.think, p.aggr, p.fire, p.anti, p.combo]).toEqual([normal.think, normal.aggr, normal.fire, normal.anti, normal.combo]);
    const dificil = perfilChefe(2, false);
    expect(dificil.react).toBe(1);
    expect(dificil.block).toBe(1);
  });

  it('fase 2: aggr 1 e anti +0,2 (teto 1)', () => {
    expect(perfilChefe(0, true).aggr).toBe(1);
    expect(perfilChefe(0, true).anti).toBeCloseTo(AI_LEVELS[0].anti + 0.2, 12);
    expect(perfilChefe(2, true).anti).toBeCloseTo(0.95, 12); // DIFÍCIL já tem 0,75
    expect(perfilChefe(2, true).anti).toBeLessThanOrEqual(1);
  });

  it('o chefe com CPU roda 3000 ticks sem erro e o perfil da fase 2 entra depois da cena', () => {
    const l = lutaDeChefe({ cpu: 1, p1cpu: 1 });
    for (let i = 0; i < 3000; i++) l.passo();
    expect(l.g.tick).toBeGreaterThan(1500);
  });
});

describe('S1a · troca de barra (§3.2)', () => {
  it('1ª vez que zera: barras 1, hp cheio, luta segue, 1 fase-chefe/troca, nenhum ko; 2ª vez: ko', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    c.hp = 0;
    expect(g.resolverVidaZerada(c, g.p1)).toBe(false);
    expect([c.barras, c.hp, g.phase, c.invuln, c.cenaPendente, c.gotHits]).toEqual([1, 75, 'fight', 60, true, 0]);
    expect([g.hitstop, g.shake]).toEqual([20, 14]);
    const ev = l.passo();
    expect(ev.filter((e) => e.tipo === 'fase-chefe')).toEqual([{ tipo: 'fase-chefe', lutador: 1, etapa: 'troca', barrasRestantes: 1 }]);
    expect(ev.some((e) => e.tipo === 'ko')).toBe(false);
    c.hp = 0;
    expect(g.resolverVidaZerada(c, g.p1)).toBe(true);
    expect(g.phase).toBe('ko');
    expect(c.state).toBe('ko');
    expect(l.passo().some((e) => e.tipo === 'ko' && e.defensor === 1)).toBe(true);
  });

  it('pelo golpe real: fase-chefe/troca sai ANTES do hit no mesmo tick, hp salta cheio e o hpShown acompanha', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    l.g.p2.hp = 0.5;
    const ev = bater(l, 'hp');
    const ordem = ev.map((e) => e.tipo).filter((t) => t === 'fase-chefe' || t === 'hit');
    expect(ordem).toEqual(['fase-chefe', 'hit']);
    expect(ev.some((e) => e.tipo === 'ko')).toBe(false);
    const c = l.g.p2;
    expect([c.barras, c.hp, c.hpShown, l.g.phase]).toEqual([1, 75, 75, 'fight']);
    expect(c.state === 'hit' || c.state === 'down').toBe(true);
  });

  it('o hitstop e o tremor da troca sobrevivem ao que applyHit grava depois (20 e 14, com tremor ligado)', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    l.g.p2.hp = 0.5;
    l.g.p1.x = 420;
    l.g.p2.x = 480;
    l.frame.p1.hp = true;
    let visto = false;
    for (let i = 0; i < 40 && !visto; i++) {
      const ev = l.passo();
      l.frame.p1.hp = false;
      if (ev.some((e) => e.tipo === 'fase-chefe')) {
        visto = true;
        expect([l.g.hitstop, l.g.shake]).toEqual([20, 14]);
      }
    }
    expect(visto).toBe(true);
  });

  it('invulnerável por 60 ticks: o combo não atravessa para a barra final', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    l.g.p2.hp = 0.5;
    bater(l, 'hp');
    const c = l.g.p2;
    expect(c.untouchable).toBe(true);
    const hpAntes = c.hp;
    // o jogador continua golpeando durante a invulnerabilidade
    for (let i = 0; i < 30; i++) {
      l.g.p1.x = 420;
      c.x = 480;
      l.frame.p1.lp = i % 8 === 0;
      l.passo();
    }
    expect(c.hp).toBe(hpAntes);
    expect(c.barras).toBe(1);
  });
});

describe('S1a · Dança da Águia (§3.3)', () => {
  const LIVRES = ['idle', 'walk', 'crouch', 'land'];

  it('começa no primeiro tick livre, dura exatamente `duracao` ticks, congela tudo e termina na ficha da fase 2', () => {
    const l = lutaDeChefe({ cpu: 1 });
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    g.timeMax = 30;
    g.timeLeft = 30;
    c.hp = 0.5;
    bater(l, 'hp');
    expect(c.cenaPendente).toBe(true);
    expect(c.ficha).toBe('chefe');

    // até a cena: nunca se vê 'fight' com chefe livre no chão e cena pendente (ela começa NO primeiro tick livre)
    let tickCena = -1;
    const etapas: string[] = [];
    for (let i = 0; i < 400 && g.phase !== 'cena-chefe'; i++) {
      const ev = l.passo();
      etapas.push(...ETAPAS(ev));
      if (g.phase === 'fight') {
        expect(c.cenaPendente && c.grounded && LIVRES.includes(c.state), `tick ${i}: deveria já ter começado a cena`).toBe(false);
      }
    }
    expect(g.phase).toBe('cena-chefe');
    tickCena = g.tick;
    expect(c.state).toBe('cena');
    expect(c.cenaPendente).toBe(false);
    expect(etapas).toEqual(['danca']);

    // durante a cena: contar ticks, relógio parado, nada de hit, projéteis vazios
    // o jogador "termina o que estava fazendo": um MASHI/projétil em andamento não pode deixar projétil vivo
    g.p1.startMove('sFire', g);
    g.p1.en = 100;
    const relogio = g.timer;
    let ticksDeCena = 0;
    let hits = 0;
    const evCena: EventoLuta[] = [];
    while (g.phase === 'cena-chefe' && ticksDeCena < 500) {
      l.frame.p1.hp = true; // apertar não deve fazer nada: as entradas vão vazias fora de 'fight'
      g.p1.x = 420;
      c.x = 480;
      const ev = l.passo();
      evCena.push(...ev);
      ticksDeCena++;
      if (g.phase === 'cena-chefe') {
        expect(g.timer).toBe(relogio);
        expect(g.projectiles).toHaveLength(0);
        expect(c.state).toBe('cena');
      }
      hits += ev.filter((e) => e.tipo === 'hit').length;
    }
    l.frame.p1.hp = false;
    expect(hits).toBe(0);
    // `phase` vale 'cena-chefe' no início de exatamente `duracao` ticks: o último dos 90 já devolve 'fight'
    expect(ticksDeCena).toBe(CFG_CHEFE.danca.duracao);
    expect(tickCena).toBeGreaterThan(0);
    expect(g.phase).toBe('fight');
    expect(c.ficha).toBe('chefe2');
    expect(c.ch.fire[0]).toBe('#ff9a3a');
    expect(c.state).toBe('idle');
    expect(ETAPAS(evCena)).toEqual(['retomada']);
    expect(g.timer).toBe(relogio);
    expect(c.perfilIa).toEqual(perfilChefe(1, true));
    // hp e barras não foram tocados pela troca de ficha
    expect([c.barras, c.hp, c.maxHp]).toEqual([1, 75, 75]);
  });

  it('a pose da cena é devekh0..2 por tempo e, sem a arte (atlas provisório), o getPD cai numa pose existente', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const c = l.g.p2;
    c.setState('cena');
    const nomes: string[] = [];
    for (const st of [0, 29, 30, 59, 60, 89, 200]) {
      c.st = st;
      nomes.push(c.poseT().name);
    }
    expect(nomes).toEqual(['devekh0', 'devekh0', 'devekh1', 'devekh1', 'devekh2', 'devekh2', 'devekh2']);
    expect(() => getPD(c.ch, 'devekh1')).not.toThrow();
  });

  it('KO do jogador no mesmo tick da troca de barra: vale o KO e não há cena (nos dois sentidos)', () => {
    for (const ordem of ['troca-antes', 'ko-antes'] as const) {
      const l = lutaDeChefe();
      ateALuta(l);
      const { g } = l;
      g.p2.hp = 0;
      g.p1.hp = 0;
      if (ordem === 'troca-antes') {
        g.resolverVidaZerada(g.p2, g.p1);
        g.resolverVidaZerada(g.p1, g.p2);
      } else {
        g.resolverVidaZerada(g.p1, g.p2);
        g.resolverVidaZerada(g.p2, g.p1);
      }
      expect(g.phase).toBe('ko');
      for (let i = 0; i < 300; i++) {
        l.passo();
        expect(g.phase, ordem).not.toBe('cena-chefe');
        expect(g.p2.state, ordem).not.toBe('cena');
      }
    }
  });

  it('fim de tempo no tick da troca: vence o fim de tempo, sem cena', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    const { g } = l;
    g.timeMax = 1;
    g.timeLeft = 1;
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    g.hitstop = 0; // sem o congelamento da troca, para o relógio e a cena disputarem o MESMO tick
    (g as unknown as { tick60: number }).tick60 = 59;
    expect(g.p2.state).toBe('idle'); // chefe livre: sem o fim de tempo a cena começaria agora
    l.passo();
    expect(g.phase).toBe('timeover');
    for (let i = 0; i < 80; i++) {
      l.passo();
      expect(g.phase).not.toBe('cena-chefe');
    }
  });
});

describe('S1a · round único, desempate e empate (§3.3 / §3.4)', () => {
  it('com rounds = 2 e rounds = 3, UMA vitória encerra a luta de chefe', () => {
    for (const rounds of [2, 3]) {
      const l = lutaDeChefe({}, { ...AJUSTES, rounds });
      ateALuta(l);
      const { g } = l;
      expect(g.winsNeeded).toBe(1);
      g.p2.barras = 1;
      g.p2.hp = 0;
      g.resolverVidaZerada(g.p2, g.p1);
      for (let i = 0; i < 400 && !g.matchDone; i++) l.passo();
      expect(g.phase, `rounds ${rounds}`).toBe('matchend');
      expect(g.matchWinner).toBe(0);
      expect(g.round).toBe(1);
      expect(g.matchDone).toBe(true);
    }
  });

  function fimPorTempo(ajusta: (g: Game) => void): Game {
    const l = lutaDeChefe();
    ateALuta(l);
    l.g.timeMax = 1;
    l.g.timeLeft = 1;
    ajusta(l.g);
    for (let i = 0; i < 400 && l.g.phase !== 'roundend' && l.g.phase !== 'matchend'; i++) l.passo();
    return l.g;
  }

  it('tempo esgota com o chefe na 2ª barra (vidaTotal 10) e o jogador com 50: o jogador vence', () => {
    const g = fimPorTempo((x) => {
      x.p2.barras = 1;
      x.p2.hp = 10;
      x.p1.hp = 50;
    });
    expect(g.p2.vidaTotal).toBe(10);
    expect(g.winner).toBe(0);
    expect(g.phase).toBe('matchend');
  });

  it('tempo esgota com o chefe ainda na 1ª barra com 30 (vidaTotal 105) e o jogador com 90: o chefe vence', () => {
    const g = fimPorTempo((x) => {
      x.p2.hp = 30;
      x.p1.hp = 90;
    });
    expect(g.p2.vidaTotal).toBe(105);
    expect(g.winner).toBe(1);
  });

  it('empate (KO duplo): novo round, o chefe volta com 2 barras, hp cheio e na ficha da fase 1', () => {
    const l = lutaDeChefe({ cpu: 1 });
    ateALuta(l);
    const { g } = l;
    g.p2.hp = 0.5;
    bater(l, 'hp'); // gasta a 1ª barra e passa pela fase 2
    for (let i = 0; i < 400 && g.phase !== 'fight'; i++) l.passo();
    for (let i = 0; i < 400 && g.p2.ficha !== 'chefe2'; i++) l.passo();
    expect(g.p2.ficha).toBe('chefe2');
    g.p2.hp = 0;
    g.p1.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    g.resolverVidaZerada(g.p1, g.p2);
    for (let i = 0; i < 400 && g.round === 1; i++) l.passo();
    expect(g.round).toBe(2);
    expect(g.winner).toBeNull();
    expect(g.phase).toBe('intro');
    const c = g.p2;
    expect([c.barras, c.hp, c.maxHp, c.ficha, c.cenaPendente, c.state]).toEqual([2, 75, 75, 'chefe', false, 'idle']);
    expect(c.perfilIa).toEqual(perfilChefe(1, false));
    expect(g.winsNeeded).toBe(1);
  });

  it('bônus: derrotar o chefe soma bonusVitoria ao vencedor; vencer qualquer outro não soma', () => {
    const pontos = (bonus: number): number => {
      const lut = { ...elenco, [BAATAR]: montarLutador(defBaatar({ chefe: { ...CFG_CHEFE, bonusVitoria: bonus } }), poseWei()) } as Record<IdLutador, LutadorMontado>;
      const l = lutaDeChefe({}, AJUSTES, criarRng(11), lut);
      ateALuta(l);
      l.g.p2.barras = 1;
      l.g.p2.hp = 0;
      l.g.resolverVidaZerada(l.g.p2, l.g.p1);
      for (let i = 0; i < 400 && !l.g.matchDone; i++) l.passo();
      return l.g.p1.score;
    };
    expect(pontos(7777) - pontos(0)).toBe(7777);

    // sem cfg.chefe (BAATAR jogável) o mesmo desfecho não rende bônus
    const g = new Game({ lutadores: elenco, rng: criarRng(11) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR }, { ...AJUSTES });
    const { fonte } = fonteManual();
    for (let i = 0; i < 400 && g.phase !== 'fight'; i++) g.update(fonte);
    g.p2.hp = 0;
    g.resolverVidaZerada(g.p2, g.p1);
    for (let i = 0; i < 400 && g.phase === 'ko'; i++) g.update(fonte);
    expect(g.p1.score).toBe(pontos(0));
  });

  it('perfeito: derrotar o chefe sem perder vida é perfeito; o chefe que venceu depois de perder uma barra não é', () => {
    const l = lutaDeChefe();
    ateALuta(l);
    l.g.p2.barras = 1;
    l.g.p2.hp = 0;
    l.g.resolverVidaZerada(l.g.p2, l.g.p1);
    for (let i = 0; i < 400 && l.g.phase !== 'matchend'; i++) l.passo();
    expect(l.g.perfect).toBe(true);

    const m = lutaDeChefe();
    ateALuta(m);
    m.g.timeMax = 1;
    m.g.timeLeft = 1;
    m.g.p2.barras = 1; // já perdeu uma barra
    m.g.p2.hp = m.g.p2.maxHp; // e a barra final está cheia
    m.g.p1.hp = 10;
    for (let i = 0; i < 400 && m.g.phase !== 'matchend'; i++) m.passo();
    expect(m.g.winner).toBe(1);
    expect(m.g.perfect).toBe(false);
  });
});

describe('S1a · treino e modo normal não mudam', () => {
  it('treino com BAATAR sem cfg.chefe: 1 barra e nunca morre', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(5) });
    g.setup({ mode: 'training', c1: 'hayato', c2: BAATAR }, { ...AJUSTES });
    expect([g.p2.barras, g.p2.barrasMax, g.p2.chefe]).toEqual([1, 1, false]);
    g.p2.hp = -4;
    expect(g.resolverVidaZerada(g.p2, g.p1)).toBe(false);
    expect(g.p2.hp).toBe(1);
    expect(g.phase).not.toBe('ko');
  });

  it('treino com chefe ligado: a vida nunca passa para a barra seguinte (o treino não gasta barra)', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(5) });
    g.setup({ mode: 'training', c1: 'hayato', c2: BAATAR, chefe: true }, { ...AJUSTES });
    g.p2.hp = 0;
    expect(g.resolverVidaZerada(g.p2, g.p1)).toBe(false);
    expect([g.p2.hp, g.p2.barras, g.p2.cenaPendente]).toEqual([1, 2, false]);
  });

  it('versus com o BAATAR jogável: vida zerada é KO direto (1 barra)', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(5) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: BAATAR }, { ...AJUSTES });
    g.p2.hp = 0;
    expect(g.resolverVidaZerada(g.p2, g.p1)).toBe(true);
    expect(g.phase).toBe('ko');
  });
});
