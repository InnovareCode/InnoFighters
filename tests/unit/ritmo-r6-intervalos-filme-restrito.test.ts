import { describe, expect, it } from 'vitest';
import type { EventoLuta, IdLutador, RitmoMotor } from '../../src/core/contratos';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import type { NomeGolpe } from '../../src/data/tipos';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { cena, contar, doTipo, PROD, soltar, type Cena } from './_filme';

/*
 * R-6 (docs/spec-redesenho-jogabilidade.md §3.1, §3.3, §4): `ritmo.intervalos` (ko/roundend/intro dos rounds 2+/matchend
 * mais curtos) e `ritmo.filmeRestrito` (o filme só no super — R-7, ainda não existe — e no especial comum que dá KO; o
 * resto resolve pelo caminho normal, com o dano de hoje). As duas flags desligadas (padrão) são bit a bit o motor de
 * antes: provado pela suíte inteira passando sem `-u` (hashes/snapshots de `dados.test.ts`/`luta-fidelidade.test.ts`/
 * harness não usam `ritmo`, então não têm como mudar).
 */

const SEM_ENTRADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };

function lutaComRitmo(c1: IdLutador, c2: IdLutador, semente: number, ritmo: RitmoMotor, extra: Partial<ConfigPartida> = {}): Game {
  const g = new Game({ lutadores: PROD, rng: criarRng(semente) });
  g.setup({ mode: 'versus', c1, c2, cpu: null, ritmo, ...extra }, { rounds: 2, time: 99, shake: true });
  return g;
}

/** Pula o `intro` (fica em 'fight') e posiciona os dois perto, prontos para um `lp`/`sFwd` conectar. */
function irParaFight(g: Game): void {
  g.phase = 'fight';
  g.t = 0;
  g.p1.x = 380;
  g.p2.x = 520;
  g.p1.facing = 1;
  g.p2.facing = -1;
}

/** Anda até a fase mudar (ou `limite`) e devolve quantos updates a fase `fase` levou. */
function ticksDaFase(g: Game, fase: string, limite = 400): number {
  for (let i = 0; i < limite; i++) {
    g.update(SEM_ENTRADA);
    if (g.phase !== fase) return i + 1;
  }
  throw new Error(`fase "${fase}" não terminou em ${limite} ticks`);
}

/** Procura a menor distância em que `golpe` do P1 conecta e devolve a cena já jogada (mesma receita de `filmes-motor.test.ts`). */
function achar(c1: IdLutador, c2: IdLutador, golpe: NomeGolpe, preparar: (c: Cena) => void, ritmo?: RitmoMotor, ate = 460): Cena {
  for (let d = 80; d <= ate; d += 10) {
    const c = cena(c1, c2, { esquiva: true, ...(ritmo ? { ritmo } : {}) });
    soltar(c, golpe, d, { antes: preparar });
    const tocou = ['hit', 'throw', 'block', 'armor', 'quebra-guarda', 'esquivou', 'parry', 'clash'].some((t) => contar(c.eventos, t as EventoLuta['tipo']) > 0);
    if (tocou) return c;
  }
  throw new Error(`${c1}/${golpe} contra ${c2}: não conectou em nenhuma distância`);
}

describe('R-6: ritmo.intervalos (§3.1) — ko/timeover, roundend, intro (rounds 2+) e matchend', () => {
  it('ko -> roundend em 60 ticks com a flag (100 de hoje); KO de round comum', () => {
    const ligada = lutaComRitmo('hayato', 'wei-long', 1, { intervalos: true });
    irParaFight(ligada);
    ligada.p2.hp = 0.01;
    ligada.p1.startMove('lp', ligada);
    for (let i = 0; i < 40 && ligada.phase !== 'ko'; i++) ligada.update(SEM_ENTRADA);
    expect(ligada.phase).toBe('ko');
    expect(ticksDaFase(ligada, 'ko')).toBe(60);
    expect(ligada.phase).toBe('roundend');

    const desligada = lutaComRitmo('hayato', 'wei-long', 1, {});
    irParaFight(desligada);
    desligada.p2.hp = 0.01;
    desligada.p1.startMove('lp', desligada);
    for (let i = 0; i < 40 && desligada.phase !== 'ko'; i++) desligada.update(SEM_ENTRADA);
    expect(desligada.phase).toBe('ko');
    expect(ticksDaFase(desligada, 'ko')).toBe(100);
    expect(desligada.phase).toBe('roundend');
  });

  it('roundend -> intro do round 2 em 90 ticks com a flag (175 de hoje)', () => {
    const g = lutaComRitmo('hayato', 'wei-long', 1, { intervalos: true });
    irParaFight(g);
    g.p2.hp = 0.01;
    g.p1.startMove('lp', g);
    for (let i = 0; i < 400 && g.phase !== 'roundend'; i++) g.update(SEM_ENTRADA);
    expect(g.phase).toBe('roundend');
    expect(ticksDaFase(g, 'roundend')).toBe(90);
    expect(g.phase).toBe('intro');
    expect(g.round).toBe(2);
  });

  it('intro do round 2 fecha em 60 ticks com a flag (90 de hoje); o round 1 não muda (fora do escopo do R-6, R-2 cuida)', () => {
    const g = lutaComRitmo('hayato', 'wei-long', 1, { intervalos: true });
    expect(g.round).toBe(1);
    expect(g.phase).toBe('intro');
    expect(ticksDaFase(g, 'intro')).toBe(90); // round 1: intacto
    expect(g.phase).toBe('fight');
    g.p1.x = 380;
    g.p2.x = 520;
    g.p1.facing = 1;
    g.p2.facing = -1;
    g.p2.hp = 0.01;
    g.p1.startMove('lp', g);
    for (let i = 0; i < 400 && g.phase !== 'intro'; i++) g.update(SEM_ENTRADA);
    expect(g.phase).toBe('intro');
    expect(g.round).toBe(2);
    expect(ticksDaFase(g, 'intro')).toBe(60);
    expect(g.phase).toBe('fight');
  });

  it('ko -> matchend em 60 + 90 ticks com a flag (100 + 150 de hoje), quando o KO decide a luta', () => {
    const g = lutaComRitmo('hayato', 'wei-long', 1, { intervalos: true });
    irParaFight(g);
    g.p1.wins = g.winsNeeded - 1; // este round fecha a luta
    g.p2.hp = 0.01;
    g.p1.startMove('lp', g);
    for (let i = 0; i < 40 && g.phase !== 'ko'; i++) g.update(SEM_ENTRADA);
    expect(g.phase).toBe('ko');
    expect(ticksDaFase(g, 'ko')).toBe(60);
    expect(g.phase).toBe('matchend');
    expect(g.matchWinner).toBe(0);
    // `matchend` não muda de fase (só liga `matchDone`); o `t` zera na entrada da fase (`endRound`).
    let n = 0;
    for (; n < 200 && !g.matchDone; n++) g.update(SEM_ENTRADA);
    expect(g.matchDone).toBe(true);
    expect(n).toBe(90);
    expect(g.phase).toBe('matchend');
  });
});

describe('R-6: ritmo.filmeRestrito (§3.3) — o filme só no especial que dá KO (sem super ainda, R-7)', () => {
  const normal = (c1: IdLutador, golpe: 'sFwd' | 'sFire' = 'sFwd'): number => {
    const mv = PROD[c1].moves[golpe];
    return golpe === 'sFire' ? (mv.dmg ?? 0) : (mv.dmg ?? 0) * PROD[c1].pow;
  };

  it('não dá KO: 0 filme, hit.filme ausente, dano NORMAL (o mesmo da flag desligada, não a tabela de filmes.ts)', () => {
    const r: Cena = cena('hayato', 'wei-long', { ritmo: { filmeRestrito: true } });
    r.g.p2.hp = 1000;
    soltar(r, 'sFwd', 90);
    expect(contar(r.eventos, 'filme')).toBe(0);
    expect(doTipo(r.eventos, 'hit').some((h) => h.filme !== undefined)).toBe(false);
    expect(contar(r.eventos, 'hit')).toBeGreaterThan(0);
    expect(1000 - r.g.p2.hp).toBeCloseTo(normal('hayato'), 9);
  });

  it('dá KO de round (não decide a luta): 1 filme, motivo "ko", ko:true, trocaDeBarra:false, dano NORMAL (não o de filmes.ts)', () => {
    const r: Cena = cena('hayato', 'wei-long', { ritmo: { filmeRestrito: true } });
    r.g.p2.hp = 1; // qualquer acerto limpo mata
    soltar(r, 'sFwd', 90);
    expect(contar(r.eventos, 'filme')).toBe(1);
    const f = doTipo(r.eventos, 'filme')[0];
    expect(f?.motivo).toBe('ko');
    expect(f?.ko).toBe(true);
    expect(f?.trocaDeBarra).toBe(false);
    expect(f?.dano).toBeCloseTo(1, 9); // só o que faltava (hp=1), bem abaixo do dano normal (~11,8)
    expect(r.g.p2.hp).toBe(0);
    expect(doTipo(r.eventos, 'hit')[0]?.filme).toBe(true);
  });

  it('dá KO que decide a luta: mesmo motivo "ko" (COMPLETO x CURTO é escolha da UI, fora do R-6); a partida termina', () => {
    const r: Cena = cena('hayato', 'wei-long', { ritmo: { filmeRestrito: true } });
    r.g.p1.wins = r.g.winsNeeded - 1;
    r.g.p2.hp = 1;
    soltar(r, 'sFwd', 90, { limite: 300 });
    expect(contar(r.eventos, 'filme')).toBe(1);
    expect(doTipo(r.eventos, 'filme')[0]?.motivo).toBe('ko');
    for (let i = 0; i < 300 && !r.g.matchDone; i++) r.tick();
    expect(r.g.matchDone).toBe(true);
    expect(r.g.matchWinner).toBe(0);
  });

  it('TREINO: nunca mata (hp mínimo 1) — nenhum filme mesmo acertando um especial várias vezes', () => {
    const r: Cena = cena('hayato', 'wei-long', { ritmo: { filmeRestrito: true }, modo: 'training' });
    r.g.p2.hp = 1;
    for (let golpes = 0; golpes < 3; golpes++) soltar(r, 'sFwd', 90);
    expect(contar(r.eventos, 'filme')).toBe(0);
    expect(r.g.p2.hp).toBeGreaterThanOrEqual(1);
  });

  it('troca de barra do chefão: zera a barra mas não mata — 0 filme, 1 fase-chefe (troca)', () => {
    const r: Cena = cena('hayato', 'baatar', { ritmo: { filmeRestrito: true }, chefe: true });
    expect(r.g.p2.barras).toBe(2);
    r.g.p2.hp = 1;
    soltar(r, 'sFwd', 90);
    expect(contar(r.eventos, 'filme')).toBe(0);
    expect(contar(r.eventos, 'fase-chefe')).toBe(1);
    expect(doTipo(r.eventos, 'fase-chefe')[0]?.etapa).toBe('troca');
    expect(r.g.p2.barras).toBe(1);
    expect(r.g.p2.hp).toBe(r.g.p2.maxHp);
  });

  it('agarrão de especial (throw, BAATAR sFire = ARREMESSO DO AVARGA): sem KO não vira filme (dano normal); com KO vira (motivo "ko")', () => {
    const semKo = achar('baatar', 'hayato', 'sFire', (cc) => (cc.g.p2.hp = 1000), { filmeRestrito: true });
    expect(contar(semKo.eventos, 'throw')).toBeGreaterThan(0);
    expect(contar(semKo.eventos, 'filme')).toBe(0);
    expect(doTipo(semKo.eventos, 'throw')[0]?.filme).toBeUndefined();
    // agarrão (não corpo a corpo nem projétil): o dano normal é `agarrao.dmg x pow` (`arremessar`, não `danoDoGolpe`).
    const normalDoAgarrao = (PROD.baatar.moves.sFire.agarrao?.dmg ?? 0) * PROD.baatar.pow;
    expect(1000 - semKo.g.p2.hp).toBeCloseTo(normalDoAgarrao, 9);

    const comKo = achar('baatar', 'hayato', 'sFire', (cc) => (cc.g.p2.hp = 1), { filmeRestrito: true });
    expect(contar(comKo.eventos, 'filme')).toBe(1);
    expect(doTipo(comKo.eventos, 'filme')[0]?.motivo).toBe('ko');
    expect(doTipo(comKo.eventos, 'throw')[0]?.filme).toBe(true);
    expect(comKo.g.p2.hp).toBe(0);
  });
});

describe('R-6: flag ausente — o motor de hoje, intacto', () => {
  it('filmeRestrito ausente: qualquer especial limpo abre filme (V2-3c de sempre), mesmo sem KO', () => {
    const c = achar('hayato', 'wei-long', 'sFwd', (cc) => (cc.g.p2.hp = 1000));
    expect(contar(c.eventos, 'filme')).toBe(1);
    expect(doTipo(c.eventos, 'filme')[0]?.motivo).toBeUndefined();
  });
});
