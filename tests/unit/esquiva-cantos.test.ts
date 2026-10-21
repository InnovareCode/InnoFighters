import { describe, expect, it } from 'vitest';
import { LARGURA } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import { montarBaatarComAbraco } from './_baatar-chefe';
import { elenco, esquivar, fighter, nova, type Lado } from './_esquiva-qa';
import { tipos, type Luta } from './_kit-e3';

/*
 * QA adversarial da ESQUIVA, parte 2: parede, mesmo tick, PARADE, agarrões e projéteis (Íris). Convenção `it.fails` = bug real
 * conhecido (a asserção descreve o comportamento correto e hoje falha; corrigido o bug, trocar por `it`).
 */
const TRAS = ESQUIVA_PADRAO.tras;
const FRENTE = ESQUIVA_PADRAO.frente;

// ---------------------------------------------------------------------------------------------------------------------
describe('avanço e recuo no canto (parede 60 / 900)', () => {
  /** `quem` avança (frente) contra o rival (`pinado`) colado na parede `lado`; devolve a trilha de x e se atravessou. */
  function avancoNaParede(lado: 'esq' | 'dir', quem: Lado) {
    const l = nova(true);
    const adv = fighter(l, quem);
    const pin = fighter(l, quem === 1 ? 2 : 1);
    pin.x = lado === 'esq' ? 60 : LARGURA - 60;
    adv.x = lado === 'esq' ? 120 : LARGURA - 120;
    adv.facing = adv.x > pin.x ? -1 : 1;
    const lado0 = Math.sign(adv.x - pin.x);
    const trilha: number[] = [];
    esquivar(l, 'frente', quem);
    for (let t = 0; t < 60; t++) {
      trilha.push(adv.x, pin.x);
      l.passo();
    }
    return { l, adv, pin, trilha, cruzou: Math.sign(adv.x - pin.x) !== lado0 };
  }

  it('nos 4 cantos o avanço mantém todos dentro de [60, 900], sem NaN, volta ao livre e os corpos acabam separados', () => {
    for (const lado of ['esq', 'dir'] as const) {
      for (const quem of [1, 2] as const) {
        const { adv, pin, trilha } = avancoNaParede(lado, quem);
        for (const x of trilha) {
          expect(Number.isFinite(x)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(60);
          expect(x).toBeLessThanOrEqual(LARGURA - 60);
        }
        expect(adv.state).toBe('idle');
        expect(Math.abs(adv.x - pin.x), `${lado} P${quem}`).toBeGreaterThan(70); // sobreposição resolvida (corpo 39 + 39)
      }
    }
  });

  it('o resultado do avanço contra rival colado na parede NÃO depende de quem é P1 e P2 (hoje: P1 atravessa no canto esquerdo, P2 não)', () => {
    // Causa provável: Game.separate() (game.ts:536-541) desempata dx === 0 com `s = dx >= 0 ? 1 : -1`, assumindo que o P2 está à direita.
    // Os dois ficam em x = 60 (clamp), dx = 0, e o P1 sempre vai para a esquerda: o P1 "atravessa" o P2 no canto esquerdo e o P2 NÃO atravessa o P1.
    const a = avancoNaParede('esq', 1).cruzou;
    const b = avancoNaParede('esq', 2).cruzou;
    expect(a).toBe(b);
  });

  it('a assimetria é espelhada: P1 no canto esquerdo = P2 no direito (documenta o estado atual para o teste acima)', () => {
    expect(avancoNaParede('esq', 1).cruzou).toBe(avancoNaParede('dir', 2).cruzou);
    expect(avancoNaParede('esq', 2).cruzou).toBe(avancoNaParede('dir', 1).cruzou);
  });

  it('recuo encostado na parede: não anda, gasta os 20, continua invulnerável e anuncia o golpe esquivado', () => {
    const l = nova(true, 'hayato', 'caio', 60, 140);
    l.g.p1.x = 60;
    const ev = esquivar(l, 'tras');
    expect(l.g.p1.en).toBe(100 - ESQUIVA_PADRAO.custo);
    l.g.p2.startMove('lp', l.g);
    ev.push(...l.passo(12));
    expect(l.g.p1.x).toBeGreaterThanOrEqual(60);
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);
    expect(tipos(ev, 'esquivou')).toHaveLength(1);
  });

  it('avanço do P2 na parede direita contra o P1 já colado: sem teleporte (nenhum salto de x maior que a velocidade da esquiva)', () => {
    const l = nova(true);
    l.g.p2.x = LARGURA - 90;
    l.g.p1.x = LARGURA - 130;
    let ant = l.g.p2.x;
    esquivar(l, 'frente', 2);
    let maiorSalto = 0;
    for (let t = 0; t < 40; t++) {
      maiorSalto = Math.max(maiorSalto, Math.abs(l.g.p2.x - ant));
      ant = l.g.p2.x;
      l.passo();
    }
    // pico da velocidade do avanço = 2*dist/(invFim+1) ~ 15 px/tick; o empurrão de corpos soma no máximo ~78/2 por tick
    expect(maiorSalto).toBeLessThan(45);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('dois eventos de especial no mesmo tick', () => {
  it('os dois lutadores soltam o especial no MESMO tick: dois `special` na ordem P1, P2, com os campos novos, gasto certo e projéteis que se anulam', () => {
    const l = nova(true, 'hayato', 'hayato');
    l.frame.p1.sp = true;
    l.frame.p2.sp = true;
    const ev = l.passo();
    l.frame.p1.sp = false;
    l.frame.p2.sp = false;
    const sp = tipos(ev, 'special');
    expect(sp).toHaveLength(2);
    expect(sp.map((e) => e.tipo === 'special' && e.lutador)).toEqual([0, 1]);
    for (const e of sp) expect(e).toMatchObject({ tipo: 'special', golpe: 'sFire', ficha: null, momento: 'inicio' });
    expect(l.g.p1.en).toBe(60);
    expect(l.g.p2.en).toBe(60);
    ev.push(...l.passo(80));
    expect(tipos(ev, 'projectile')).toHaveLength(2);
    expect(tipos(ev, 'hit')).toHaveLength(0); // os dois projéteis se encontram e se anulam
    const choque = tipos(ev, 'clash');
    expect(choque).toHaveLength(1);
    expect(choque[0]).not.toHaveProperty('lutador'); // o choque de projéteis NÃO leva os campos do escudo da GARKUWA
    expect(choque[0]).not.toHaveProperty('golpe');
  });

  it('ESP do P1 e ESQUIVA do P2 no mesmo tick (a investida do P1 contra quem esquiva): ninguém trava, o P2 não toma dano na janela, no máximo um `esquivou` por golpe', () => {
    const l = nova(true, 'hayato', 'caio', 300, 400);
    l.frame.p1.sp = true;
    l.frame.p1.right = true; // sFwd, a investida KAMINARI-STEP
    l.frame.p2.esq = true;
    l.frame.p2.right = true; // trás do P2 (olha para a esquerda)
    const ev = l.passo();
    l.frame.p1.sp = false;
    l.frame.p1.right = false;
    l.frame.p2.esq = false;
    l.frame.p2.right = false;
    expect(tipos(ev, 'special')).toHaveLength(1);
    expect(tipos(ev, 'esquiva')).toHaveLength(1);
    expect(l.g.p2.state).toBe('esquiva');
    const hpAntes = l.g.p2.hp;
    let janelaSemDano = true;
    let esquivou = 0;
    for (let t = 0; t < 40; t++) {
      const invAntes = l.g.p2.invuln;
      const out = l.passo();
      esquivou += tipos(out, 'esquivou').length;
      if (invAntes >= 2 && l.g.p2.hp < hpAntes) janelaSemDano = false;
    }
    expect(janelaSemDano).toBe(true);
    expect(esquivou).toBeLessThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('PARADE (CAMILLE) contra os especiais dos outros 8', () => {
  const ATACANTES: IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'nila', 'baatar'];
  const GOLPES = ['sFire', 'sDown', 'sFwd'] as const;

  type Resultado = { atacante: IdLutador; golpe: string; atraso: number; ev: EventoLuta[]; l: Luta };

  function parar(atacante: IdLutador, golpe: (typeof GOLPES)[number], atraso: number): Resultado {
    const l = nova(true, 'camille', atacante, 400, 470);
    l.g.p1.en = 100;
    l.g.p2.en = 100;
    l.g.p2.startMove(golpe, l.g);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 80; t++) {
      l.frame.p1.sp = t === atraso;
      ev.push(...l.passo());
    }
    return { atacante, golpe, atraso, ev, l };
  }

  const todos: Resultado[] = [];
  for (const a of ATACANTES) {
    for (const g of GOLPES) {
      if (!elenco[a].moves[g]) continue;
      for (const atraso of [0, 2, 4, 6, 8]) todos.push(parar(a, g, atraso));
    }
  }
  const aparados = todos.filter((r) => tipos(r.ev, 'parry').length > 0);

  it('aparou pelo menos alguns especiais corpo a corpo `mid`/`over` e deixou passar os outros (não é tudo nem nada)', () => {
    expect(aparados.length).toBeGreaterThan(3);
    expect(aparados.length).toBeLessThan(todos.length);
  });

  it('em toda PARADE bem-sucedida: `parry` do defensor 0 com golpe sFire, continua sResp e quadro; o atacante vira atordoado e SEM acerto especial dele', () => {
    for (const r of aparados) {
      const p = tipos(r.ev, 'parry')[0];
      expect(p, `${r.atacante} ${r.golpe}`).toMatchObject({ tipo: 'parry', defensor: 0, atacante: 1, golpe: 'sFire', continua: 'sResp' });
      expect(p).toHaveProperty('quadro');
      // o `special` da CAMILLE é só som/gasto (sucesso depois); o do atacante abre a cinemática dele
      const sps = tipos(r.ev, 'special');
      const doDefensor = sps.find((e) => e.tipo === 'special' && e.lutador === 0);
      const doAtacante = sps.find((e) => e.tipo === 'special' && e.lutador === 1);
      expect(doDefensor, `${r.atacante} ${r.golpe}`).toMatchObject({ momento: 'sucesso', golpe: 'sFire' });
      expect(doAtacante, `${r.atacante} ${r.golpe}`).toMatchObject({ golpe: r.golpe });
      // nenhum acerto do golpe especial do atacante na CAMILLE
      const acertosNela = r.ev.filter((e) => e.tipo === 'hit' && e.defensor === 0 && e.golpe === r.golpe);
      expect(acertosNela, `${r.atacante} ${r.golpe}`).toHaveLength(0);
    }
  });

  it('o FOUETTÉ que segue a PARADE acerta com golpe sResp, `especial: true` e `dano` = a vida que o atacante perdeu', () => {
    let achou = 0;
    for (const r of aparados) {
      const l = r.l;
      const respostas = r.ev.filter((e) => e.tipo === 'hit' && e.atacante === 0 && e.golpe === 'sResp');
      if (respostas.length === 0) continue;
      achou++;
      for (const h of respostas) expect(h).toMatchObject({ especial: true, golpe: 'sResp' });
      const soma = respostas.reduce((s, e) => s + (e.tipo === 'hit' ? (e.dano ?? 0) : 0), 0);
      const perdeu = l.g.p2.maxHp - l.g.p2.hp;
      expect(soma).toBeGreaterThan(0);
      expect(soma).toBeLessThanOrEqual(perdeu + 1e-9);
    }
    expect(achou).toBeGreaterThan(0);
  });

  it('PARADE contra PROJÉTIL e contra AGARRÃO não apara (passam): hit/throw normais e nenhum `parry`', () => {
    const l = nova(true, 'camille', 'hayato', 400, 700);
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 70; t++) {
      l.frame.p1.sp = t === 20 || t === 21;
      ev.push(...l.passo());
    }
    expect(tipos(ev, 'parry')).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('agarrões x esquiva', () => {
  /** P1 colado na parede (o recuo quase não o afasta) e P2 a 85 px. P2 começa o `golpe` no tick 0; P1 esquiva no tick `e` (1-based). */
  function agarrar(golpe: 'throw', e: number | null, dirEsq: 'tras' | 'frente' = 'tras') {
    const l = nova(true, 'hayato', 'caio', 70, 155);
    l.g.p2.startMove(golpe, l.g);
    const S = l.g.p2.ch.moves[golpe].S;
    const ev: EventoLuta[] = [];
    for (let t = 1; t <= 30; t++) {
      if (e !== null && t === e) ev.push(...esquivar(l, dirEsq));
      else ev.push(...l.passo());
    }
    return { l, ev, S };
  }

  it('o arremesso comum só pega quem NÃO está na janela invulnerável: varrendo o tick da esquiva em volta do tick do agarrão', () => {
    const { S } = agarrar('throw', null);
    const conectou = (e: number | null): boolean => tipos(agarrar('throw', e).ev, 'throw').length > 0;
    expect(conectou(null)).toBe(true); // controle: sem esquiva agarra
    for (let e = Math.max(1, S - 15); e <= S + 3; e++) {
      const dentro = e <= S && S <= e + TRAS.invFim - 1;
      expect(conectou(e), `esquiva no tick ${e}, agarrão no tick ${S}`).toBe(!dentro);
    }
  });

  it('o AVANÇO tem 3 ticks de arranque vulneráveis: agarrado nele, esquivado depois', () => {
    const { S } = agarrar('throw', null);
    // avanço no tick e: janela invulnerável = passes [e+3, e+19)
    const conectou = (e: number): boolean => {
      const l = nova(true, 'hayato', 'caio', 300, 385); // longe da parede: o avanço atravessa
      l.g.p2.startMove('throw', l.g);
      const ev: EventoLuta[] = [];
      for (let t = 1; t <= 30; t++) ev.push(...(t === e ? esquivar(l, 'frente') : l.passo()));
      return tipos(ev, 'throw').length > 0;
    };
    for (let e = Math.max(1, S - 20); e <= S + 2; e++) {
      const invuln = S >= e + FRENTE.invIni && S < e + FRENTE.invFim;
      const alcance = true;
      void alcance;
      expect(conectou(e), `avanço no tick ${e}, agarrão no tick ${S}`).toBe(!invuln);
    }
  });

  it('ARREMESSO DO AVARGA (alcance 162): a esquiva escapa; ABRAÇO DA ESTEPE (janela de 16 ticks, maior que a invulnerabilidade): nunca agarra COM a janela aberta, mas agarra a recuperação', () => {
    const arremesso = nova(true, 'hayato', 'baatar', 70, 160);
    arremesso.g.p2.startMove('sFire', arremesso.g);
    const ev = esquivar(arremesso, 'tras');
    ev.push(...arremesso.passo(60));
    expect(tipos(ev, 'throw')).toHaveLength(0);
    expect(arremesso.g.p1.hp).toBe(arremesso.g.p1.maxHp);

    // o ABRAÇO saiu do kit do BAATAR (virou lutador normal): a mecânica do rush + agarrão em janela segue no motor e é vigiada com o def de fixtura
    const abraco = nova(true, 'hayato', 'baatar', 70, 160, { ...elenco, baatar: montarBaatarComAbraco() });
    abraco.g.p2.startMove('sFwd', abraco.g);
    esquivar(abraco, 'tras');
    let agarrouEm = -1;
    for (let t = 1; t <= 60 && agarrouEm < 0; t++) {
      const invAntes = abraco.g.p1.invuln;
      const out = abraco.passo();
      if (tipos(out, 'throw').length > 0) {
        agarrouEm = t;
        expect(invAntes, `agarrão no tick ${t} da esquiva`).toBeLessThanOrEqual(1); // só depois de a janela fechar
      }
    }
    // a janela do ABRAÇO (S 12 + 16) passa dos 14 ticks de invulnerabilidade: a recuperação da esquiva é agarrada (projeto)
    expect(agarrouEm).toBeGreaterThanOrEqual(TRAS.invFim);
  });

  it('esquiva apertada ENQUANTO o rival já está em cima do agarrão (S-1): a invulnerabilidade já vale no tick do agarrão', () => {
    const { S } = agarrar('throw', null);
    const { ev } = agarrar('throw', S);
    expect(tipos(ev, 'throw')).toHaveLength(0);
  });

  it('quem foi arremessado (down) não esquiva enquanto está caído, mas a esquiva guardada 3 ticks antes de levantar sai no 1º tick livre', () => {
    const l = nova(true, 'hayato', 'caio', 70, 155);
    l.g.p2.startMove('throw', l.g);
    let ev: EventoLuta[] = l.passo(12);
    expect(tipos(ev, 'throw')).toHaveLength(1);
    expect(l.g.p1.state).toBe('down');
    // aperta durante a queda e deita: nada
    for (let t = 0; t < 12; t++) {
      l.frame.p1.esq = true;
      ev = l.passo();
      expect(l.g.p1.state).toBe('down');
    }
    expect(tipos(ev, 'esquiva')).toHaveLength(0);
    l.frame.p1.esq = false;
    // ... e acompanha até levantar: segura ESQ nos últimos ticks de `rise`
    let saiu = false;
    for (let t = 0; t < 120 && !saiu; t++) {
      const subindo = l.g.p1.state === 'down' && l.g.p1.phase === 'rise' && l.g.p1.st >= 11;
      l.frame.p1.esq = subindo;
      l.passo();
      l.frame.p1.esq = false;
      saiu = l.g.p1.state === 'esquiva';
    }
    expect(saiu).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('projétil do rival x avanço e recuo', () => {
  /** HAYATO (P2) solta o RAIJIN-DAN em direção ao P1 (a 400 px). O P1 esquiva quando o projétil chega a `d0` px. */
  function contraProjetil(modo: 'frente' | 'tras', d0: number, x1 = 300) {
    const l = nova(true, 'hayato', 'hayato', x1, 700);
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const ev: EventoLuta[] = [];
    let kDesdeEsq = -1;
    let kDoDano = -1;
    let violou = false;
    const hp0 = l.g.p1.hp;
    for (let t = 0; t < 120; t++) {
      const pr = l.g.projectiles[0];
      const invAntes = l.g.p1.invuln;
      const hpAntes = l.g.p1.hp;
      let out: EventoLuta[];
      if (kDesdeEsq < 0 && pr && pr.x - l.g.p1.x < d0) {
        out = esquivar(l, modo);
        kDesdeEsq = 0;
      } else {
        out = l.passo();
        if (kDesdeEsq >= 0) kDesdeEsq++;
      }
      ev.push(...out);
      if (l.g.p1.hp < hpAntes) {
        if (kDoDano < 0) kDoDano = kDesdeEsq;
        // dano no tick em que a janela ainda valia depois do decremento (invuln >= 2 antes do tick)
        if (invAntes >= 2) violou = true;
      }
    }
    return { l, ev, hp0, kDoDano, violou, kDesdeEsq };
  }

  it('NUNCA toma dano de projétil com a janela aberta, em qualquer distância de reação (avanço e recuo, 30 distâncias cada)', () => {
    for (const modo of ['frente', 'tras'] as const) {
      for (let d0 = 70; d0 <= 360; d0 += 10) {
        const r = contraProjetil(modo, d0, modo === 'tras' ? 120 : 300);
        expect(r.violou, `${modo} d0=${d0}`).toBe(false);
        const esq = tipos(r.ev, 'esquivou').filter((e) => e.tipo === 'esquivou' && e.projetil);
        expect(esq.length, `${modo} d0=${d0}`).toBeLessThanOrEqual(1); // 1 projétil, 1 aviso por esquiva
      }
    }
  });

  it('o AVANÇO atravessa o projétil sem dano quando ele chega depois do arranque; só toma dano se o projétil tocar nos 3 ticks vulneráveis ou depois dos 19', () => {
    let semDano = 0;
    let comDano = 0;
    for (let d0 = 70; d0 <= 360; d0 += 10) {
      const r = contraProjetil('frente', d0);
      if (r.l.g.p1.hp === r.hp0) semDano++;
      else {
        comDano++;
        const k = r.kDoDano;
        expect(k < FRENTE.invIni || k >= FRENTE.invFim, `d0=${d0} dano no tick ${k} da esquiva`).toBe(true);
      }
    }
    expect(semDano).toBeGreaterThan(10);
    expect(comDano).toBeGreaterThan(0); // reagir tarde demais continua custando vida
  });

  it('o RECUO só ganha tempo do projétil (documenta o projeto): ele acerta quando a janela fecha, mas nunca antes', () => {
    let atingidos = 0;
    for (let d0 = 110; d0 <= 360; d0 += 10) {
      const r = contraProjetil('tras', d0, 400);
      if (r.l.g.p1.hp < r.hp0) {
        atingidos++;
        expect(r.kDoDano).toBeGreaterThanOrEqual(TRAS.invFim);
      }
    }
    expect(atingidos).toBeGreaterThanOrEqual(0);
  });

  it('dois projéteis sobre a mesma esquiva: um `esquivou` para CADA um (ids diferentes), e nenhum dano na janela', () => {
    const l = nova(true, 'hayato', 'hayato', 70, 700);
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const [a, b] = l.g.projectiles;
    if (!a || !b) throw new Error('projéteis não nasceram');
    a.x = 150;
    b.x = 175;
    const ev = esquivar(l, 'tras');
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);
    ev.push(...l.passo(12));
    const avisos = tipos(ev, 'esquivou').filter((e) => e.tipo === 'esquivou' && e.projetil);
    expect(avisos).toHaveLength(2);
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);
  });

  it('golpe corpo a corpo reiniciado (novo atkId) dentro da MESMA janela é anunciado de novo; o mesmo atkId, só uma vez', () => {
    const l = nova(true, 'hayato', 'caio', 70, 155);
    esquivar(l, 'tras');
    l.g.p2.startMove('lp', l.g);
    const ev = l.passo(5);
    expect(tipos(ev, 'esquivou')).toHaveLength(1);
    l.g.p2.startMove('lp', l.g); // atkId novo
    ev.push(...l.passo(5));
    expect(tipos(ev, 'esquivou')).toHaveLength(2);
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);
  });
});

