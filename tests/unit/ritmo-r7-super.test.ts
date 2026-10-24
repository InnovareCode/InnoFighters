import { describe, expect, it } from 'vitest';
import { danoDoGolpe } from '../../src/fight/colisao';
import { moveInput } from '../../src/fight/cpu';
import { TETO_SUPER } from '../../src/fight/game';
import { superDoLutador } from '../../src/data/supers';
import { cena, contar, doTipo, PROD, type Cena } from './_filme';

/*
 * R-7/R-7b (docs/spec-redesenho-jogabilidade.md §3.4, §4; docs/supers-e-combos-v2.md; referência do dono — vídeo X-Men
 * vs Street Fighter, combo do Juggernaut): o SUPER no motor, atrás de `ritmo.super`. Luta de verdade (`Game` inteiro,
 * números de PRODUÇÃO), nada de dublê. O comando é testado pelo INPUT real (hp/hk, não `startMove` direto).
 *
 * R-7b: o super NÃO é mais 1 contato atômico com filme. Ele sai do modelo do filme: congela a ativação (30 ticks, tela
 * da Lyra) e resolve no MUNDO em N acertos presos (supers.ts `acertos`/`intervalo`) — cada um incrementa o combo e
 * sai num `hit` normal (`super:true`); o rival não escapa entre eles; o ÚLTIMO sempre derruba; o FILME só entra se
 * o super MATAR (tocado depois do último acerto, `motivo:'ko'`) — super que não mata nunca abre filme.
 */

const golpeNormalDaOrigem = (id: keyof typeof PROD): 'sFire' | 'sDown' | 'sFwd' => superDoLutador(id, null)!.golpe;

/** Aperta hp+hk (uma borda só, 1 tick) e anda ticks o bastante para a sequência presa toda resolver (não depende de `p1.move`: a sequência continua mesmo se o move de origem já tiver terminado). */
function dispararSuper(c: Cena, d: number, o: { antes?: (c: Cena) => void; separado?: boolean; ticks?: number } = {}): void {
  c.g.p1.x = 480 - d / 2;
  c.g.p2.x = 480 + d / 2;
  c.g.p1.facing = 1;
  c.g.p2.facing = -1;
  o.antes?.(c);
  if (o.separado) {
    c.mao.p1 = { hp: true };
    c.tick();
    c.mao.p1 = { hk: true }; // borda 2 ticks depois (dentro da janela de 2)
    c.tick();
    c.mao.p1 = {};
  } else {
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
  }
  c.tick(o.ticks ?? 60); // 5 acertos x intervalo 6 = 24 ticks depois do 1º: 60 sobra de margem folgada
}

describe('R-7: o comando (SOCO FORTE + CHUTE FORTE, barra cheia)', () => {
  it('as duas bordas no MESMO tick, barra cheia: dispara o super (golpe do super, special.super true, barra zerada)', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    const golpe = golpeNormalDaOrigem('hayato');
    dispararSuper(c, 90);
    const sp = doTipo(c.eventos, 'special')[0];
    expect(sp?.golpe).toBe(golpe);
    expect(sp?.super).toBe(true);
  });

  it('as duas bordas até 2 ticks de distância também dispara', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    dispararSuper(c, 90, { separado: true });
    expect(doTipo(c.eventos, 'special')[0]?.super).toBe(true);
  });

  it('barra NÃO cheia: sai o golpe de hoje (sem super.true, sem zerar a barra inteira)', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    c.g.p1.en = 50;
    dispararSuper(c, 90);
    const sp = doTipo(c.eventos, 'special')[0];
    expect(sp?.super).toBeUndefined();
    expect(c.g.p1.en).toBeGreaterThan(0); // o especial de hoje (sDown, cost 30) não zera a barra de 50
  });

  it('flag ausente: hp+hk junto não faz nada demais (cada botão resolve sozinho, como hoje)', () => {
    const c = cena('hayato', 'wei-long'); // sem ritmo
    dispararSuper(c, 90);
    expect(doTipo(c.eventos, 'special').some((e) => e.super)).toBe(false);
  });

  it('custo: a barra vai a 0 NO INSTANTE do disparo (não o `cost` do especial de origem; depois regenera/ganha como qualquer golpe)', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    expect(c.g.p1.en).toBe(100);
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    expect(c.g.p1.en).toBe(0);
  });

  it('3º passo do combo BÁSICO (fraco > forte(semQueda) > ESP) aceita o super no lugar do especial comum (5 acertos presos, sem matar: derruba no fim, sem filme)', () => {
    // hayato-trovao-ascendente: clp, hk, sDown (semQueda no passo 1 = hk segura em pé); o super do HAYATO É sDown.
    const c = cena('hayato', 'wei-long', { ritmo: { super: true }, motorV2: { filmes: true, combos: true } });
    c.g.p2.hp = 1000;
    c.g.p1.x = 440;
    c.g.p2.x = 480;
    c.g.p1.facing = 1;
    c.g.p2.facing = -1;
    const ateAcertar = (): void => {
      for (let i = 0; i < 60; i++) {
        c.tick();
        if (c.porTick[c.porTick.length - 1]?.some((e) => e.tipo === 'hit')) return;
      }
      throw new Error('não acertou em 60 ticks');
    };
    c.g.p1.startMove('clp', c.g);
    ateAcertar();
    expect(c.g.p2.state).not.toBe('down'); // ainda de pé: segue a cadeia
    c.g.p1.startMove('hk', c.g);
    ateAcertar();
    expect(c.g.p2.state).not.toBe('down'); // semQueda: o forte NÃO derruba dentro do combo reconhecido
    expect(c.g.p1.historicoCombo.map((h) => h.golpe)).toEqual(['clp', 'hk']);
    const gotHitsAntes = c.g.p2.gotHits;
    // 3º passo: o super (hp+hk) no 1º tick ACIONÁVEL (depois do hitstop do acerto).
    while (c.g.hitstop > 0) c.tick();
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
    c.tick(60);
    const sp = doTipo(c.eventos, 'special').find((e) => e.super);
    expect(sp?.golpe).toBe('sDown');
    const hitsDoSuper = doTipo(c.eventos, 'hit').filter((h) => h.super);
    expect(hitsDoSuper).toHaveLength(5); // supers.ts: ACERTOS_PADRAO tem 5 frações
    expect(c.g.p2.gotHits).toBe(gotHitsAntes + 5); // cada acerto do super incrementa o combo (contador da Lyra)
    expect(c.g.p2.state).toBe('down'); // o último sempre derruba (p2.hp=1000: não matou)
    expect(contar(c.eventos, 'filme')).toBe(0); // não matou: nenhum filme abre (spec R-7b item 3)
  });
});

describe('R-7b: sequência presa do super (N acertos, teto 32 no TOTAL, só abre filme se matar)', () => {
  it('conecta limpo SEM matar: 5 acertos presos, cada um `hit.super`, soma = supers.ts x escalaCombo com teto 32, SEM filme', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    c.g.p2.hp = 1000;
    dispararSuper(c, 90);
    const hits = doTipo(c.eventos, 'hit').filter((h) => h.super);
    expect(hits).toHaveLength(5);
    expect(hits.map((h) => h.acertos)).toEqual([1, 2, 3, 4, 5]); // o contador da Lyra sobe a cada acerto
    expect(hits.at(-1)?.grande).toBe(true); // o último é o "grande" (igual a um golpe que mata/pesado)
    const s = superDoLutador('hayato', null)!;
    const esperado = Math.min(TETO_SUPER, danoDoGolpe(s.dano, PROD.hayato.pow, false, 0, false));
    const somaDosAcertos = hits.reduce((t, h) => t + (h.dano ?? 0), 0);
    expect(somaDosAcertos).toBeCloseTo(esperado, 6);
    expect(1000 - c.g.p2.hp).toBeCloseTo(esperado, 6);
    expect(contar(c.eventos, 'filme')).toBe(0); // não matou: sem filme (R-7b item 3)
  });

  it('teto de 32: AMINU e BAATAR (efetivo > 32 sem corte) somam exatamente 32', () => {
    const aminu = cena('aminu', 'hayato', { ritmo: { super: true } });
    aminu.g.p2.hp = 1000;
    dispararSuper(aminu, 90);
    expect(1000 - aminu.g.p2.hp).toBeCloseTo(TETO_SUPER, 6);

    const baatar = cena('baatar', 'hayato', { ritmo: { super: true } });
    baatar.g.p2.hp = 1000;
    dispararSuper(baatar, 100, { ticks: 120 });
    expect(1000 - baatar.g.p2.hp).toBeCloseTo(TETO_SUPER, 6);
  });

  it('mata no meio da sequência: para ali (não continua acertando um morto), confirma filme (motivo "ko", ko:true)', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    c.g.p2.hp = 5; // menos que a 1ª fração (15% de ~29 ≈ 4,3-6; qualquer um dos 2 primeiros acertos já mata)
    dispararSuper(c, 90);
    expect(contar(c.eventos, 'filme')).toBe(1);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.motivo).toBe('ko');
    expect(f?.ko).toBe(true);
    const hits = doTipo(c.eventos, 'hit').filter((h) => h.super);
    expect(hits.length).toBeLessThan(5); // não chegou aos 5 — morreu antes
    expect(contar(c.eventos, 'ko')).toBe(1);
  });

  it('invulnerabilidade: o HAYATO sobe invulnerável no super (reaproveita o `inv` do RAIJIN-KEN de origem)', () => {
    const c = cena('hayato', 'wei-long', { ritmo: { super: true } });
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
    c.tick(2); // dentro do S (4) + inv (8) do golpe de origem
    expect(c.g.p1.invuln).toBeGreaterThan(0);
  });

  it('bloqueado: 1 block (sem quebra de guarda, nem para o AMINU nível 3), barra já foi embora, nenhum acerto da sequência', () => {
    const c = cena('aminu', 'hayato', { ritmo: { super: true } });
    c.mao.p2 = { right: true }; // P2 segura a guarda
    c.g.p1.x = 435;
    c.g.p2.x = 480;
    c.g.p1.facing = 1;
    c.g.p2.facing = -1;
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
    expect(c.g.p1.en).toBe(0); // a barra foi embora JÁ no disparo, bloqueado ou não (o risco é dele)
    c.tick(60);
    expect(contar(c.eventos, 'quebra-guarda')).toBe(0);
    expect(contar(c.eventos, 'block')).toBeGreaterThanOrEqual(1);
    expect(contar(c.eventos, 'filme')).toBe(0);
    expect(doTipo(c.eventos, 'hit').some((h) => h.super)).toBe(false); // bloqueado: a sequência presa nem começa
  });

  it('projétil (WEI LONG TAIJI ZHANG): 5 acertos presos enquanto atravessa, sem `pow`, sem matar = sem filme', () => {
    const c = cena('wei-long', 'hayato', { ritmo: { super: true } });
    c.g.p2.hp = 1000;
    c.g.p1.x = 300;
    c.g.p2.x = 560;
    c.g.p1.facing = 1;
    c.g.p2.facing = -1;
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
    c.tick(160); // o projétil ainda tem que chegar até o rival antes da sequência começar
    const hits = doTipo(c.eventos, 'hit').filter((h) => h.super);
    expect(hits).toHaveLength(5);
    expect(hits.every((h) => h.projetil)).toBe(true);
    const s = superDoLutador('wei-long', null)!;
    const esperado = Math.min(TETO_SUPER, s.dano); // projétil: sem `pow`
    expect(1000 - c.g.p2.hp).toBeCloseTo(esperado, 6);
    expect(contar(c.eventos, 'filme')).toBe(0);
  });

  it('projétil que MATA no último acerto: filme motivo "ko"', () => {
    const c = cena('wei-long', 'hayato', { ritmo: { super: true } });
    c.g.p2.hp = 6; // sobrevive às 4 primeiras frações (15% cada de ~23 ≈ 3,5), morre na 5ª (40%)
    c.g.p1.x = 300;
    c.g.p2.x = 560;
    c.g.p1.facing = 1;
    c.g.p2.facing = -1;
    c.mao.p1 = { hp: true, hk: true };
    c.tick();
    c.mao.p1 = {};
    c.tick(160);
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.motivo).toBe('ko');
    expect(f?.projetil).toBe(true);
  });

  it('agarrão de especial (BAATAR PESO DA ESTEPE): 1º acerto no `throw`, os outros 4 em `hit.super`; sem matar = derruba sem filme', () => {
    const c = cena('baatar', 'hayato', { ritmo: { super: true } });
    c.g.p2.hp = 1000;
    dispararSuper(c, 100, { ticks: 120 });
    expect(contar(c.eventos, 'throw')).toBe(1); // só o 1º acerto do agarrão-super vira `throw`
    const hits = doTipo(c.eventos, 'hit').filter((h) => h.super);
    expect(hits).toHaveLength(4); // os outros 4 (de 5) saem como `hit` comum
    expect(c.g.p2.gotHits).toBe(5);
    expect(c.g.p2.state).toBe('down');
    expect(contar(c.eventos, 'filme')).toBe(0);
  });

  it('agarrão de especial (BAATAR) que MATA: filme motivo "ko" depois do último acerto', () => {
    const c = cena('baatar', 'hayato', { ritmo: { super: true } });
    c.g.p2.hp = 1;
    dispararSuper(c, 100, { ticks: 120 });
    const f = doTipo(c.eventos, 'filme')[0];
    expect(f?.motivo).toBe('ko');
    expect(f?.ko).toBe(true);
  });
});

describe('R-7: CPU (moveInput upgrada hp+hk sem sortear nada novo)', () => {
  it('golpe = o super do lutador, barra cheia, flag ligada: hp+hk', () => {
    const f = PROD.hayato; // só precisa de `ch.id`/`ficha`/`en`; moveInput usa um Fighter de verdade na luta
    const c = cena('hayato', 'wei-long');
    expect(moveInput('sDown', 1, c.g.p1, true)).toEqual({ hp: true, hk: true });
    void f;
  });

  it('barra não cheia: o botão único de sempre (não hp+hk)', () => {
    const c = cena('hayato', 'wei-long');
    c.g.p1.en = 50;
    const p = moveInput('sDown', 1, c.g.p1, true);
    expect(p).not.toEqual({ hp: true, hk: true });
    expect(p.sp).toBe(true);
  });

  it('flag desligada ou sem `me`: comportamento de sempre', () => {
    const c = cena('hayato', 'wei-long');
    expect(moveInput('sDown', 1, c.g.p1, false)).toEqual({ sp: true, down: true });
    expect(moveInput('sDown', 1)).toEqual({ sp: true, down: true });
  });

  it('golpe que NÃO é o super do lutador: botão único (ex.: sFire do HAYATO, que não é o super dele)', () => {
    const c = cena('hayato', 'wei-long');
    const p = moveInput('sFire', 1, c.g.p1, true);
    expect(p).not.toEqual({ hp: true, hk: true });
  });
});

describe('R-7: flag desligada = hashes de hoje (guarda)', () => {
  it('sem `ritmo.super`, `Fighter.superAtivo` nunca liga mesmo pressionando hp+hk com a barra cheia', () => {
    const c = cena('hayato', 'wei-long');
    dispararSuper(c, 90);
    expect(c.g.p1.superAtivo).toBe(false);
  });
});
