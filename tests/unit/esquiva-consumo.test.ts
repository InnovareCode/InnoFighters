import { describe, expect, it } from 'vitest';
import { LARGURA } from '../../src/core/constantes';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import type { NomeGolpe } from '../../src/data/tipos';
import { montarBaatarComAbraco } from './_baatar-chefe';
import { elenco as _elenco, esquivar, fighter, nova } from './_esquiva-qa';
import { tipos } from './_kit-e3';

/*
 * Decisão do Atlas (fix da QA da Íris): quando a esquiva anuncia `esquivou` (golpe/projétil atingindo quem está na janela invulnerável), o golpe é
 * CONSUMIDO para aquele alvo, como um acerto. Antes, a janela de 14 ticks fechava no meio da fase ativa de alguns golpes (RAIJIN-KEN, investidas,
 * RESORTE, `hk`) e o MESMO golpe acertava logo depois do "ESQUIVOU!". Varre o aperto da esquiva por TODOS os ticks do golpe.
 */
void _elenco;

type Caso = { nome: string; atacante: IdLutador; golpe: NomeGolpe; x2: number; x1?: number };
const CASOS: Caso[] = [
  { nome: 'RAIJIN-KEN (sDown, anti-aéreo)', atacante: 'hayato', golpe: 'sDown', x2: 150 },
  { nome: 'KAMINARI-STEP (sFwd, investida)', atacante: 'hayato', golpe: 'sFwd', x2: 260 },
  { nome: 'RESORTE (CENTELLA sFwd)', atacante: 'centella', golpe: 'sFwd', x2: 520, x1: 480 },
  { nome: 'hk do WEI LONG', atacante: 'wei-long', golpe: 'hk', x2: 160 },
  { nome: 'hk do BAATAR', atacante: 'baatar', golpe: 'hk', x2: 170 },
  { nome: 'TIE SHAN KAO (WEI LONG sFwd, armadura e investida)', atacante: 'wei-long', golpe: 'sFwd', x2: 280 },
];

/** Roda o golpe do P2 contra o P1 (colado na parede esquerda), com a esquiva apertada no tick `k`. Devolve todos os eventos. */
function rodar(c: Caso, dir: 'tras' | 'frente', k: number): EventoLuta[] {
  const x1 = c.x1 ?? 70;
  const l = nova(true, 'hayato', c.atacante, x1, c.x2);
  l.g.p1.x = x1;
  l.g.p2.startMove(c.golpe, l.g);
  const ev: EventoLuta[] = [];
  for (let t = 0; t < 170; t++) ev.push(...(t === k ? esquivar(l, dir) : l.passo()));
  return ev;
}

/** Depois do 1º `esquivou` do P1 contra o P2, houve dano (hit/throw) do P2 no P1 NO MESMO golpe? */
function danoDepoisDeEsquivar(ev: readonly EventoLuta[]): boolean {
  const i = ev.findIndex((e) => e.tipo === 'esquivou' && e.lutador === 0 && e.atacante === 1);
  if (i < 0) return false;
  return ev.slice(i + 1).some((e) => (e.tipo === 'hit' || e.tipo === 'throw') && e.atacante === 1 && e.defensor === 0);
}

describe('esquivou CONSOME o golpe: nunca "ESQUIVOU!" seguido de dano do mesmo golpe', () => {
  for (const c of CASOS) {
    for (const dir of ['tras', 'frente'] as const) {
      it(`${c.nome}, esquiva para ${dir === 'tras' ? 'trás' : 'frente'} apertada em cada tick de 0 a 110`, () => {
        let comEsquivou = 0;
        for (let k = 0; k <= 110; k++) {
          const ev = rodar(c, dir, k);
          if (tipos(ev, 'esquivou').length > 0) comEsquivou++;
          expect(danoDepoisDeEsquivar(ev), `${c.nome} ${dir} k=${k}`).toBe(false);
        }
        // não é vácuo: a varredura pega o golpe na janela em vários alinhamentos
        expect(comEsquivou, `${c.nome} ${dir}`).toBeGreaterThanOrEqual(1);
      });
    }
  }

  it('os 14 ticks de janela do recuo, um a um, em cada golpe que a QA mediu (sDown, sFwd, RESORTE, hk do WEI LONG e do BAATAR)', () => {
    for (const c of CASOS.slice(0, 5)) {
      // acha o tick `k0` em que o golpe é esquivado pela 1ª vez e testa os 14 ticks de janela a partir dele (k0 .. k0 + 13)
      let k0 = -1;
      for (let k = 0; k <= 110 && k0 < 0; k++) if (tipos(rodar(c, 'tras', k), 'esquivou').length > 0) k0 = k;
      expect(k0, c.nome).toBeGreaterThanOrEqual(0);
      for (let k = Math.max(0, k0 - 2); k < k0 + 14; k++) {
        const ev = rodar(c, 'tras', k);
        expect(danoDepoisDeEsquivar(ev), `${c.nome} k=${k}`).toBe(false);
      }
    }
  });

  it('um golpe esquivado é consumido SÓ para aquele golpe: o golpe seguinte do mesmo rival acerta normalmente', () => {
    const c = CASOS[3] as Caso; // hk do WEI LONG
    let achou = false;
    for (let k = 0; k <= 30 && !achou; k++) {
      const l = nova(true, 'hayato', c.atacante, 70, c.x2);
      l.g.p1.x = 70;
      l.g.p2.startMove(c.golpe, l.g);
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 40; t++) ev.push(...(t === k ? esquivar(l, 'tras') : l.passo()));
      if (tipos(ev, 'esquivou').length === 0) continue;
      achou = true;
      l.passo(60); // tudo acaba, a esquiva termina
      l.g.p2.startMove('lp', l.g); // golpe NOVO (atkId novo)
      const ev2 = l.passo(14);
      expect(tipos(ev2, 'hit').some((e) => e.tipo === 'hit' && e.atacante === 1)).toBe(true);
    }
    expect(achou).toBe(true);
  });

  it('projétil esquivado segue voando (atravessa) mas não acerta mais o alvo depois da janela', () => {
    const l = nova(true, 'hayato', 'hayato', 70, 500);
    l.g.p1.x = 70;
    l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
    const ev: EventoLuta[] = [];
    let esq = false;
    let vivoDepois = false;
    for (let t = 0; t < 90; t++) {
      const pr = l.g.projectiles[0];
      if (!esq && pr && pr.x - l.g.p1.x < 130) {
        ev.push(...esquivar(l, 'tras'));
        esq = true;
      } else ev.push(...l.passo());
      if (esq && l.g.p1.state !== 'esquiva' && l.g.projectiles.length > 0) vivoDepois = true;
    }
    expect(tipos(ev, 'esquivou')).toHaveLength(1);
    expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 0)).toHaveLength(0);
    expect(l.g.p1.hp).toBe(l.g.p1.maxHp);
    expect(vivoDepois).toBe(true);
  });

  it('o avanço continua atravessando o rival e o ABRAÇO DA ESTEPE ainda agarra a RECUPERAÇÃO do recuo', () => {
    const l = nova(true, 'hayato', 'caio', 300, 390);
    esquivar(l, 'frente');
    l.passo(10);
    expect(Math.sign(l.g.p2.x - l.g.p1.x)).toBe(-1); // atravessou
    const b = nova(true, 'hayato', 'baatar', 70, 160, { ..._elenco, baatar: montarBaatarComAbraco() }); // ABRAÇO: def de fixtura (saiu do kit do BAATAR)
    b.g.p1.x = 70;
    esquivar(b, 'tras');
    b.g.p2.startMove('sFwd', b.g); // ABRAÇO: janela de 16 ticks que passa dos 14 de invulnerabilidade
    const ev: EventoLuta[] = [];
    for (let t = 0; t < 40; t++) ev.push(...b.passo());
    expect(tipos(ev, 'throw').length).toBeGreaterThan(0);
  });
});

describe('avanço contra rival colado na parede: simétrico entre P1 e P2 e entre os cantos', () => {
  it('quem esquiva fica do lado de onde saiu (a parede não deixa atravessar), qualquer que seja o índice ou o canto', () => {
    for (const lado of ['esq', 'dir'] as const) {
      for (const quem of [1, 2] as const) {
        const l = nova(true);
        const adv = fighter(l, quem);
        const pin = fighter(l, quem === 1 ? 2 : 1);
        pin.x = lado === 'esq' ? 60 : LARGURA - 60;
        adv.x = lado === 'esq' ? 120 : LARGURA - 120;
        adv.facing = adv.x > pin.x ? -1 : 1;
        const lado0 = Math.sign(adv.x - pin.x);
        esquivar(l, 'frente', quem);
        l.passo(60);
        expect(Math.sign(adv.x - pin.x), `${lado} P${quem}`).toBe(lado0);
        expect(Math.abs(adv.x - pin.x)).toBeGreaterThan(70);
      }
    }
  });
});
