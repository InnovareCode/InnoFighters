import { describe, expect, it } from 'vitest';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { apresentacaoDoEspecial, todasAsApresentacoes } from '../../src/data/apresentacao-especiais';
import type { NomeGolpe } from '../../src/data/tipos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { ateALuta, criarLuta, soltar, tipos, type Luta } from './_kit-e3';

/*
 * V1 — campos de cinemática do especial nos eventos (docs/spec-esquiva-e-cinematica-especial.md 3.2/3.3 teste 1) mais os acréscimos do
 * Atlas: dano e `especial` no `throw`, `sResp` como continuação da PARADE, PARADE/GARKUWA disparando no SUCESSO, nível da MASHI no acerto,
 * `quadro`/`entrada` da tabela do Apolo. Elenco de PRODUÇÃO (os especiais dos 9 existem nele).
 */
const elenco = montarElenco();

function luta(c1: IdLutador, c2: IdLutador, x1 = 300, x2 = 390): Luta {
  const l = criarLuta({ mode: 'versus', c1, c2 }, elenco);
  ateALuta(l);
  l.g.p1.x = x1;
  l.g.p2.x = x2;
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  soltar(l);
  return l;
}

const doTipo = <T extends EventoLuta['tipo']>(ev: readonly EventoLuta[], t: T): Extract<EventoLuta, { tipo: T }>[] => tipos(ev, t) as Extract<EventoLuta, { tipo: T }>[];

describe('special: golpe, ficha, momento e apresentação', () => {
  const casos = todasAsApresentacoes();

  it('a tabela de apresentação cobre os 29 especiais (9 lutadores, NILA em 2 posturas, BAATAR na fase 2)', () => {
    expect(casos).toHaveLength(29);
    expect(casos.filter((c) => c.ficha === null)).toHaveLength(26); // 9 x 3 menos a VADIVU (custo 0, sem special)
  });

  it('todo quadro citado existe no atlas de produção do lutador (e é o que o Apolo escreveu)', () => {
    for (const c of casos) {
      const ch = c.ficha === null ? elenco[c.id] : (elenco[c.id].fichas[c.ficha] ?? elenco[c.id]);
      expect(ch.pd[c.apresentacao.quadro], `${c.id}${c.ficha ? `/${c.ficha}` : ''} ${c.golpe} -> ${c.apresentacao.quadro}`).toBeDefined();
    }
  });

  it('cada um dos especiais, ao começar, emite special com o golpe, a ficha, o momento e o que a tabela manda', () => {
    for (const c of casos) {
      const l = luta(c.id, c.id === 'hayato' ? 'caio' : 'hayato');
      if (c.ficha !== null) l.g.p1.trocarFicha(c.ficha);
      l.g.p1.startMove(c.golpe as NomeGolpe, l.g);
      const ev = doTipo(l.passo(), 'special');
      expect(ev, `${c.id} ${c.golpe}`).toHaveLength(1);
      expect(ev[0]).toMatchObject({ lutador: 0, golpe: c.golpe, ficha: c.ficha, momento: c.apresentacao.momento ?? 'inicio', quadro: c.apresentacao.quadro });
      if (c.apresentacao.entrada) expect(ev[0]?.entrada).toBe(c.apresentacao.entrada);
      else expect(ev[0]?.entrada).toBeUndefined();
    }
  });

  it('só PARADE e GARKUWA disparam no sucesso; a MASHI dispara ao começar a carga', () => {
    const sucesso = casos.filter((c) => c.apresentacao.momento === 'sucesso').map((c) => `${c.id}.${c.golpe}`);
    expect(sucesso.sort()).toEqual(['aminu.sDown', 'camille.sFire']);
    const l = luta('aminu', 'caio');
    l.frame.p1.sp = true;
    l.frame.p1.spSeg = true;
    const ev = doTipo(l.passo(), 'special');
    expect(ev[0]).toMatchObject({ golpe: 'sFire', momento: 'inicio' });
  });

  it('a VADIVU (custo 0) não emite special; a base do BAATAR usa o registro da base na fase 1 e o MERGULHO na fase 2', () => {
    const nila = luta('nila', 'hayato');
    nila.g.p1.startMove('sDown', nila.g);
    expect(doTipo(nila.passo(), 'special')).toHaveLength(0);
    expect(apresentacaoDoEspecial('baatar', 'chefe', 'sFwd')?.quadro).toBe('sc1');
    expect(apresentacaoDoEspecial('baatar', 'chefe2', 'sFwd')).toMatchObject({ quadro: 'dive1', entrada: 'cima' });
    expect(apresentacaoDoEspecial('hayato', null, 'lp')).toBeUndefined();
  });
});

describe('hit: dano, especial, golpe', () => {
  it('dano = vida tirada neste acerto (já com pow); golpe comum não leva especial', () => {
    const l = luta('hayato', 'caio');
    const antes = l.g.p2.hp;
    l.g.p1.startMove('lp', l.g);
    const ev = doTipo(l.passo(8), 'hit');
    expect(ev).toHaveLength(1);
    expect(ev[0]?.dano).toBeCloseTo(antes - l.g.p2.hp, 9);
    expect(ev[0]?.dano).toBeGreaterThan(0);
    expect(ev[0]?.golpe).toBe('lp');
    expect(ev[0]?.especial).toBeUndefined();
  });

  it('dano com escala de combo e contragolpe bate com a diferença de hp em cada acerto', () => {
    const l = luta('hayato', 'caio');
    let soma = 0;
    const antes = l.g.p2.hp;
    for (let i = 0; i < 3; i++) {
      l.g.p1.startMove('lp', l.g);
      for (const e of doTipo(l.passo(5), 'hit')) soma += e.dano ?? 0;
    }
    expect(soma).toBeCloseTo(antes - l.g.p2.hp, 9);
    const cont = luta('hayato', 'caio');
    cont.g.p2.startMove('hk', cont.g); // o CAIO está na preparação: o jab do HAYATO é contragolpe
    cont.g.p1.startMove('lp', cont.g);
    const hp0 = cont.g.p2.hp;
    const h = doTipo(cont.passo(6), 'hit').find((e) => e.defensor === 1);
    expect(h?.contragolpe).toBe(true);
    expect(h?.dano).toBeCloseTo(hp0 - cont.g.p2.hp, 9);
  });

  it('especial corpo a corpo e projétil de especial levam especial:true e o golpe; o ESP do HAYATO (projétil) idem', () => {
    const corpo = luta('hayato', 'caio');
    corpo.g.p1.startMove('sFwd', corpo.g); // KAMINARI-STEP, investida
    const h1 = doTipo(corpo.passo(20), 'hit');
    expect(h1[0]).toMatchObject({ especial: true, golpe: 'sFwd' });

    const proj = luta('hayato', 'caio', 300, 520);
    proj.g.p1.startMove('sFire', proj.g);
    const h2 = doTipo(proj.passo(60), 'hit');
    expect(h2).toHaveLength(1);
    expect(h2[0]).toMatchObject({ projetil: true, especial: true, golpe: 'sFire' });
    expect(proj.g.p2.hp).toBeCloseTo(proj.g.p2.maxHp - (h2[0]?.dano ?? 0), 9);
  });

  it('o projétil de um golpe COMUM não existe, mas o lançamento carrega o golpe (ProjetilLeitura.especial só nos especiais)', () => {
    const l = luta('hayato', 'caio', 300, 800);
    l.g.p1.startMove('sFire', l.g);
    l.passo(16);
    expect(l.g.projectiles[0]?.especial).toBe(true);
  });

  it('troca de barra do chefe: o dano é o que saiu da barra que acabou (não o hp cheio da nova)', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'baatar', chefe: true }, elenco);
    ateALuta(l);
    l.g.p1.x = 300;
    l.g.p2.x = 380;
    l.g.p2.hp = 3;
    l.g.p2.invuln = 0;
    l.g.p1.startMove('hk', l.g);
    const hits = doTipo(l.passo(14), 'hit');
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0]?.dano).toBeCloseTo(3, 9);
  });
});

describe('throw: agarrão de especial conta; arremesso comum não', () => {
  it('ARREMESSO DO AVARGA (BAATAR sFire): dano = vida tirada, especial e golpe', () => {
    const l = luta('baatar', 'hayato', 300, 380);
    const antes = l.g.p2.hp;
    l.g.p1.startMove('sFire', l.g);
    const t = doTipo(l.passo(30), 'throw');
    expect(t).toHaveLength(1);
    expect(t[0]).toMatchObject({ especial: true, golpe: 'sFire' });
    expect(t[0]?.dano).toBeCloseTo(antes - l.g.p2.hp, 9);
    expect(t[0]?.dano).toBeGreaterThan(0);
  });

  it('ABRAÇO DA ESTEPE (BAATAR sFwd) também', () => {
    const l = luta('baatar', 'hayato', 300, 380);
    l.g.p1.startMove('sFwd', l.g);
    const t = doTipo(l.passo(40), 'throw');
    expect(t[0]).toMatchObject({ especial: true, golpe: 'sFwd' });
  });

  it('HURACANRANA (CENTELLA sDown, rival no ar) também', () => {
    const l = luta('centella', 'hayato', 300, 390);
    l.g.p2.setState('jump');
    l.g.p2.y = 470 - 70;
    l.g.p2.vy = -2;
    l.g.p1.startMove('sDown', l.g);
    const t = doTipo(l.passo(25), 'throw');
    expect(t[0]).toMatchObject({ especial: true, golpe: 'sDown' });
  });

  it('o arremesso comum (golpe `throw`) leva dano e golpe, mas NÃO especial', () => {
    const l = luta('hayato', 'caio', 300, 380);
    const antes = l.g.p2.hp;
    l.g.p1.startMove('throw', l.g);
    const t = doTipo(l.passo(8), 'throw');
    expect(t).toHaveLength(1);
    expect(t[0]?.golpe).toBe('throw');
    expect(t[0]?.especial).toBeUndefined();
    expect(t[0]?.dano).toBeCloseTo(antes - l.g.p2.hp, 9);
  });
});

describe('PARADE: sucesso, continuação pelo FOUETTÉ', () => {
  it('parry leva o golpe do defensor, a continuação sResp e a apresentação; o FOUETTÉ é um hit especial com golpe sResp', () => {
    const l = luta('hayato', 'camille', 300, 380);
    l.g.p2.startMove('sFire', l.g); // PARADE
    l.passo(2);
    l.g.p1.startMove('lp', l.g);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 40; t++) ev.push(...l.passo());
    const parry = doTipo(ev, 'parry');
    expect(parry).toHaveLength(1);
    expect(parry[0]).toMatchObject({ defensor: 1, golpe: 'sFire', continua: 'sResp', quadro: 'sa1' });
    const fouette = doTipo(ev, 'hit').find((e) => e.golpe === 'sResp');
    expect(fouette).toMatchObject({ atacante: 1, especial: true, golpe: 'sResp' });
    expect(fouette?.dano).toBeGreaterThan(0);
  });
});

describe('GARKUWA: o clash do escudo leva dono e golpe', () => {
  it('projétil absorvido: clash com lutador e golpe sDown; choque de dois projéteis segue sem esses campos', () => {
    const l = luta('aminu', 'hayato', 300, 600);
    l.g.p1.startMove('sDown', l.g);
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 60; t++) ev.push(...l.passo());
    const clash = doTipo(ev, 'clash');
    expect(clash.length).toBeGreaterThan(0);
    expect(clash[0]).toMatchObject({ lutador: 0, golpe: 'sDown' });
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);

    const choque = luta('hayato', 'hayato', 300, 600);
    choque.g.lancarProjetil(choque.g.p1, choque.g.p1.ch.moves.sFire, 0, 1);
    choque.g.lancarProjetil(choque.g.p2, choque.g.p2.ch.moves.sFire, 0, 1);
    const ev2: EventoLuta[] = [];
    for (let t = 0; t < 40; t++) ev2.push(...choque.passo());
    const c2 = doTipo(ev2, 'clash');
    expect(c2.length).toBeGreaterThan(0);
    expect(c2[0]?.lutador).toBeUndefined();
    expect(c2[0]?.golpe).toBeUndefined();
  });
});

describe('MASHI: o nível aparece no acerto', () => {
  it('toque = nível 1; segurando até o limiar = 2 e 3 (hit.nivelCarga); golpe sem carga não leva o campo', () => {
    const niveis: Record<string, number | undefined> = {};
    for (const [rotulo, seg] of [['n1', 0], ['n2', 38], ['n3', 78]] as const) {
      const l = luta('aminu', 'hayato', 300, 380);
      l.g.p1.startMove('sFire', l.g);
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 140; t++) {
        l.frame.p1.spSeg = t < seg;
        ev.push(...l.passo());
      }
      niveis[rotulo] = doTipo(ev, 'hit').find((e) => e.atacante === 0)?.nivelCarga;
    }
    expect(niveis).toEqual({ n1: 1, n2: 2, n3: 3 });
    const lp = luta('aminu', 'hayato', 300, 380);
    lp.g.p1.startMove('lp', lp.g);
    expect(doTipo(lp.passo(8), 'hit')[0]?.nivelCarga).toBeUndefined();
  });
});

describe('armor, block e quebra-guarda de especial', () => {
  it('armadura: armor leva dano (absorvido) e o golpe; não é hit', () => {
    const l = luta('hayato', 'wei-long', 300, 380);
    l.g.p2.startMove('sFwd', l.g); // TIE SHAN KAO, armadura
    l.passo(3);
    l.g.p1.startMove('lp', l.g);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 10; t++) ev.push(...l.passo());
    const arm = doTipo(ev, 'armor');
    expect(arm.length).toBeGreaterThan(0);
    expect(arm[0]?.dano).toBeGreaterThan(0);
    expect(arm[0]?.golpe).toBe('lp');
  });

  it('bloquear um especial: block leva golpe e especial:true (a sessão não mostra número)', () => {
    const l = luta('hayato', 'caio', 300, 380);
    l.frame.p2.right = true; // P2 olha para a esquerda: trás = direita
    l.g.p1.startMove('sFwd', l.g);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 25; t++) ev.push(...l.passo());
    const b = doTipo(ev, 'block');
    expect(b.length).toBeGreaterThan(0);
    expect(b[0]).toMatchObject({ golpe: 'sFwd', especial: true });
  });

  it('quebra de guarda do MASHI nível 3: quebra-guarda leva golpe e especial', () => {
    const l = luta('aminu', 'hayato', 300, 380);
    l.frame.p2.right = true;
    l.g.p1.startMove('sFire', l.g);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 140; t++) {
      l.frame.p1.spSeg = t < 78;
      if (l.g.p2.state === 'walk' || l.g.p2.state === 'idle') l.g.p2.x = 380; // segura "trás" sem recuar (o boneco que bloqueia anda)
      ev.push(...l.passo());
    }
    const q = doTipo(ev, 'quebra-guarda');
    expect(q.length).toBeGreaterThan(0);
    expect(q[0]).toMatchObject({ golpe: 'sFire', especial: true });
  });
});
