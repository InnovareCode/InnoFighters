import { describe, expect, it } from 'vitest';
import type { EventoFaseChefe, EventoLuta } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import { AI_LEVELS, cpuInput } from '../../src/fight/cpu';
import { ateALuta, criarLuta, soltar, tipos, type Luta } from './_kit-e3';
import { comBaatarChefe } from './_baatar-chefe';
import { elenco as elencoBase, esquivar } from './_esquiva-qa';

/*
 * QA adversarial da ESQUIVA, parte 3: o CHEFÃO (BAATAR antigo de fixtura, barras, Dança) e a CPU que pune a recuperação (Íris).
 * Convenção `it.fails` = bug real conhecido (corrigido o bug, trocar por `it`).
 */
/** O elenco do oráculo com o BAATAR ANTIGO (chefão) de fixtura: o BAATAR de produção virou lutador normal. */
const elenco = comBaatarChefe(elencoBase);
const TRAS = ESQUIVA_PADRAO.tras;

const etapas = (ev: readonly EventoLuta[]): string[] => ev.filter((e): e is EventoFaseChefe => e.tipo === 'fase-chefe').map((e) => e.etapa);

/** Luta contra o chefão (P2 = BAATAR, sem CPU: o teste dirige os dois lados), na fase 'fight' e com tudo parado. */
function contraOChefe(esquiva = true, semente = 3): Luta {
  const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'baatar', chefe: true, esquiva }, elenco, criarRng(semente));
  ateALuta(l);
  l.g.p1.en = 100;
  l.g.p2.en = 100;
  l.g.p1.x = 300;
  l.g.p2.x = 700;
  soltar(l);
  return l;
}

describe('CHEFÃO: a esquiva e a Dança da Águia', () => {
  it('uma esquiva GUARDADA do jogador não pode sair durante a Dança (hoje o botão guardado atravessa a fronteira de fase e gasta 20 de energia no meio da cena)', () => {
    // Causa provável: Game.talvezIniciarCenaDoChefe (game.ts:468-471) zera `buf` dos dois, mas NÃO `bufEsq` (private, fighter.ts:127). O jogador
    // atordoado/atacando no momento em que a cena abre tem a esquiva ainda guardada (6 ticks); ao ficar livre, `tentarEsquivar` roda com
    // phase === 'cena-chefe'. Mesma classe do defeito #1 da QA do E3 (buf na Dança), corrigido só para o `buf`.
    const l = contraOChefe();
    l.g.p2.cenaPendente = true;
    l.g.p1.setState('hit');
    l.g.p1.stun = 3;
    l.frame.p1.esq = true;
    l.passo();
    l.frame.p1.esq = false;
    expect(l.g.phase).toBe('cena-chefe');
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 12; t++) ev.push(...l.passo());
    expect(tipos(ev, 'esquiva')).toHaveLength(0);
    expect(l.g.p1.state).not.toBe('esquiva');
    expect(l.g.p1.en).toBe(100);
  });

  it('o mesmo caso com o `buf` de ataque (corrigido na E3): o soco guardado NÃO sai durante a Dança (controle do teste acima)', () => {
    const l = contraOChefe();
    l.g.p2.cenaPendente = true;
    l.g.p1.setState('hit');
    l.g.p1.stun = 3;
    l.frame.p1.lp = true;
    l.passo();
    l.frame.p1.lp = false;
    expect(l.g.phase).toBe('cena-chefe');
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 12; t++) ev.push(...l.passo());
    expect(tipos(ev, 'swing')).toHaveLength(0);
  });

  it('o chefão (CPU DIFÍCIL) não esquiva durante a Dança, não tem estado esquiva na cena e a luta retoma sem ninguém preso', () => {
    const l = contraOChefe();
    l.g.p2.cpu = 2;
    l.g.p2.cenaPendente = true;
    const ev: EventoLuta[] = [];
    ev.push(...l.passo()); // a cena abre no 1º tick (o chefe estava livre)
    expect(l.g.phase).toBe('cena-chefe');
    for (let t = 0; t < 300 && l.g.phase === 'cena-chefe'; t++) ev.push(...l.passo());
    expect(etapas(ev)).toEqual(['cena', 'retomada']);
    expect(l.g.phase).toBe('fight');
    expect(l.g.p2.state).not.toBe('cena');
    expect(ev.filter((e) => e.tipo === 'esquiva' || e.tipo === 'deny')).toHaveLength(0);
  });

  it('a cena só abre quando a esquiva do chefe TERMINA (esquiva não é estado livre para a Dança)', () => {
    const l = contraOChefe();
    esquivar(l, 'tras', 2);
    expect(l.g.p2.state).toBe('esquiva');
    l.g.p2.cenaPendente = true;
    let abriuNoMeio = false;
    for (let t = 0; t < TRAS.dur - 3; t++) {
      l.passo();
      if (l.g.phase === 'cena-chefe' && l.g.p2.state === 'esquiva') abriuNoMeio = true;
    }
    expect(abriuNoMeio).toBe(false);
    l.passo(10);
    expect(l.g.phase).toBe('cena-chefe');
  });
});

describe('CHEFÃO: troca de barra no mesmo tick do acerto na RECUPERAÇÃO da esquiva', () => {
  /** O chefe esquiva (recuo) encostado na parede direita; o jogador acerta o jab na recuperação. */
  function cenario() {
    const l = contraOChefe();
    l.g.p2.x = 890;
    l.g.p1.x = 815;
    esquivar(l, 'tras', 2);
    l.passo(12);
    l.g.p2.hp = 1; // o jab zera a barra
    l.g.p1.startMove('lp', l.g);
    return l;
  }

  it('contragolpe que zera a barra: `fase-chefe troca` ANTES do `hit` (que é contragolpe, com dano = o que restava), hitstop 20 / shake 14, barra cheia, 60 de invuln e cena pendente', () => {
    const l = cenario();
    const ev: EventoLuta[] = [];
    let tickDoHit = -1;
    for (let t = 0; t < 12 && tickDoHit < 0; t++) {
      const out = l.passo();
      ev.push(...out);
      if (tipos(out, 'hit').length) tickDoHit = t;
    }
    expect(tickDoHit).toBeGreaterThanOrEqual(0);
    const hit = tipos(ev, 'hit')[0];
    expect(hit).toMatchObject({ tipo: 'hit', defensor: 1, contragolpe: true });
    expect(hit?.tipo === 'hit' && hit.dano).toBeCloseTo(1, 9); // só saiu 1 de vida da barra que acabou
    expect(etapas(ev)).toEqual(['troca']);
    const ordem = ev.map((e) => e.tipo).filter((t) => t === 'fase-chefe' || t === 'hit');
    expect(ordem).toEqual(['fase-chefe', 'hit']);
    expect(l.g.hitstop).toBe(20);
    expect(l.g.shake).toBe(14);
    expect(l.g.p2.barras).toBe(1);
    expect(l.g.p2.hp).toBe(l.g.p2.maxHp);
    expect(l.g.p2.invuln).toBe(60);
    expect(l.g.p2.cenaPendente).toBe(true);
  });

  it('o acerto na recuperação com a barra cheia (sem troca) é contragolpe com dano > 0 e o `dano` bate com a vida perdida', () => {
    const l = contraOChefe();
    l.g.p2.x = 890;
    l.g.p1.x = 815;
    esquivar(l, 'tras', 2);
    l.passo(12);
    const hp0 = l.g.p2.hp;
    l.g.p1.startMove('lp', l.g);
    const ev = l.passo(8);
    const hit = tipos(ev, 'hit')[0];
    expect(hit).toMatchObject({ contragolpe: true });
    expect(hit?.tipo === 'hit' && hit.dano).toBeGreaterThan(0);
    expect(hit?.tipo === 'hit' && hit.dano).toBeCloseTo(hp0 - l.g.p2.hp, 9);
  });

  it('a invulnerabilidade da troca (60) vence a esquiva do chefe: nada o acerta na recuperação e a Dança abre quando ele fica livre', () => {
    const l = contraOChefe();
    l.g.p2.invuln = 60;
    l.g.p2.cenaPendente = true;
    l.g.p2.x = 890;
    l.g.p1.x = 815;
    esquivar(l, 'tras', 2);
    l.passo(15);
    l.g.p1.startMove('lp', l.g);
    const hp0 = l.g.p2.hp;
    l.passo(10);
    expect(l.g.p2.hp).toBe(hp0);
    for (let t = 0; t < 40 && l.g.phase !== 'cena-chefe'; t++) l.passo();
    expect(l.g.phase).toBe('cena-chefe');
  });
});

describe('CHEFÃO: armadura e eventos novos', () => {
  it('o soco que o chefe absorve com a armadura publica `armor` com dano = a vida que saiu, sem `hit`, sem interromper o golpe e SEM `esquivou`', () => {
    const l = contraOChefe();
    l.g.p1.x = 560;
    l.g.p2.x = 660;
    l.g.p2.startMove('sFwd', l.g); // ABRAÇO DA ESTEPE: armadura durante S + A, ignora golpe leve
    const hp0 = l.g.p2.hp;
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 30 && tipos(ev, 'armor').length === 0; t++) {
      if (l.g.p1.state !== 'move') l.g.p1.startMove('lp', l.g);
      ev.push(...l.passo());
    }
    const a = tipos(ev, 'armor')[0];
    expect(a).toMatchObject({ tipo: 'armor', atacante: 0, defensor: 1, golpe: 'lp' });
    expect(tipos(ev, 'hit')).toHaveLength(0);
    expect(tipos(ev, 'esquivou')).toHaveLength(0);
    expect(l.g.p2.state === 'move' || l.g.p2.state === 'idle').toBe(true);
    expect(a?.tipo === 'armor' && a.dano).toBeGreaterThan(0);
    expect(a?.tipo === 'armor' && a.dano).toBeCloseTo(hp0 - l.g.p2.hp, 9);
  });
});

describe('CPU DIFÍCIL punindo a recuperação da esquiva', () => {
  /** P2 acabou de esquivar (recuo) e está na RECUPERAÇÃO, a 90 px do P1 (ainda humano). */
  function rivalEmRecuperacao(semente: number, esperar = 14, c1 = 'caio' as const, c2 = 'hayato' as const): Luta {
    const l = criarLuta({ mode: 'versus', c1, c2, esquiva: true }, elenco, criarRng(semente));
    ateALuta(l);
    l.g.p1.x = 300;
    l.g.p2.x = 390;
    l.g.p1.en = 100;
    l.g.p2.en = 100;
    soltar(l);
    l.frame.p2.esq = true;
    l.frame.p2.right = true; // trás do P2
    l.passo();
    l.frame.p2.esq = false;
    l.frame.p2.right = false;
    l.g.p2.x = 390;
    l.passo(esperar); // 14: a invulnerabilidade acaba e começa a recuperação (esquivaPunivel); menos que isso = ainda na janela
    l.g.p2.x = 390;
    return l;
  }

  /** A CPU (P1, `nivel`) a 90 px do P2 em recuperação. Devolve os eventos dos 30 ticks seguintes. */
  function punicao(nivel: number, semente: number, esperar = 14) {
    const l = rivalEmRecuperacao(semente, esperar);
    l.g.p1.cpu = nivel;
    const ev: EventoLuta[] = [];
    let hpNaJanela = true;
    for (let t = 0; t < 30; t++) {
      const hpAntes = l.g.p2.hp;
      const invAntes = l.g.p2.invuln;
      ev.push(...l.passo());
      if (invAntes >= 2 && l.g.p2.hp < hpAntes) hpNaJanela = false;
    }
    return { l, ev, hpNaJanela };
  }

  /** Sementes (de 200) em que a CPU de `nivel` puniu de verdade o rival na recuperação: arremesso ou contragolpe. */
  const punidas = (nivel: number): number => {
    let n = 0;
    for (let s = 1; s <= 200; s++) {
      const { ev } = punicao(nivel, s);
      if (ev.some((e) => e.tipo === 'throw' || (e.tipo === 'hit' && e.defensor === 1 && e.contragolpe))) n++;
    }
    return n;
  };

  it('a punição efetiva (arremesso ou contragolpe na recuperação) cresce com o nível: FÁCIL < NORMAL < DIFÍCIL, e a DIFÍCIL pune em 60% a 98% das sementes', () => {
    const [facil, normal, dificil] = [punidas(0), punidas(1), punidas(2)];
    expect(facil).toBeLessThan(normal);
    expect(normal).toBeLessThan(dificil);
    expect(dificil / 200).toBeGreaterThan(0.6);
    expect(dificil / 200).toBeLessThan(0.98);
  });

  it('NÃO gasta o sorteio de punição enquanto o rival ainda está na janela invulnerável (só a RECUPERAÇÃO é punível)', () => {
    for (let s = 1; s <= 30; s++) {
      const l = rivalEmRecuperacao(s, 4);
      expect(l.g.p2.esquivaPunivel).toBe(false);
      l.g.p1.cpu = 2;
      l.g.p1.perfilIa = { ...AI_LEVELS[2], punir: 1 };
      cpuInput(l.g.p1, l.g.p2, l.g, criarRng(s));
      expect(l.g.p1.ai.puniuEsquiva ?? 0, 'semente ' + s).not.toBe(l.g.p2.esquivaId);
    }
  });

  it('UM sorteio de punição por esquiva do rival: com punir = 1 a CPU pune na 1ª decisão e, com o rival parado na mesma recuperação, não repete o soco a cada tick', () => {
    let repeticoes = 0;
    let chamadas = 0;
    for (let s = 1; s <= 40; s++) {
      const l = rivalEmRecuperacao(s);
      l.g.p1.cpu = 2;
      l.g.p1.perfilIa = { ...AI_LEVELS[2], punir: 1 };
      const rng = criarRng(s);
      const primeira = cpuInput(l.g.p1, l.g.p2, l.g, rng);
      expect(primeira.hp === true, 'semente ' + s).toBe(true); // punir = 1: sempre pune a 1ª vez
      expect(l.g.p1.ai.puniuEsquiva, 'semente ' + s).toBe(l.g.p2.esquivaId);
      for (let k = 0; k < 4; k++) {
        const outra = cpuInput(l.g.p1, l.g.p2, l.g, rng);
        chamadas++;
        if (outra.hp === true) repeticoes++;
      }
    }
    expect(repeticoes / chamadas).toBeLessThan(0.4); // fora da punição, o soco forte é só uma das opções do plano normal
  });

  it('a CPU DIFÍCIL ataca o rival ainda na JANELA invulnerável (ticks 3 e 6 da esquiva) e nunca o acerta, em nenhuma das 200 sementes', () => {
    let atacou = 0;
    for (const esperar of [3, 6]) {
      for (let s = 1; s <= 200; s++) {
        const r = punicao(2, s, esperar);
        expect(r.hpNaJanela, 'semente ' + s + ' esperar ' + esperar).toBe(true);
        if (r.ev.some((e) => e.tipo === 'swing' && e.lutador === 0 || e.tipo === 'esquivou')) atacou++;
      }
    }
    expect(atacou).toBeGreaterThan(40); // o cenário de fato põe a CPU para atacar dentro da janela
  });

  it('quando a punição vira arremesso (agarrão), ele sai com `dano` e sem `especial`; quando vira soco, o dano publicado bate com a vida perdida', () => {
    let arremessos = 0;
    let socos = 0;
    for (let s = 1; s <= 200; s++) {
      const { l, ev } = punicao(2, s);
      const t = ev.find((e) => e.tipo === 'throw');
      if (t && t.tipo === 'throw') {
        arremessos++;
        expect(t.dano).toBeGreaterThan(0);
        expect(t).toMatchObject({ golpe: 'throw' });
        expect(t).not.toHaveProperty('especial');
      }
      const h = ev.filter((e) => e.tipo === 'hit' && e.defensor === 1);
      if (h.length && !t) {
        socos++;
        const soma = h.reduce((a, e) => a + (e.tipo === 'hit' ? (e.dano ?? 0) : 0), 0);
        expect(soma).toBeCloseTo(l.g.p2.maxHp - l.g.p2.hp, 9);
      }
    }
    expect(arremessos + socos).toBeGreaterThan(40);
  });
});
