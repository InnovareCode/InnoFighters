import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../../src/core/contratos';
import { CADEIA_MAX_GOLPES, cadeiaPermite, forcaDoRank, validarCombosProprios } from '../../src/data/combos-proprios';
import { ROSTER } from '../../src/data/lutadores';
import type { ComboProprio, NomeGolpe } from '../../src/data/tipos';
import { cpuInput, CPU_RITMO, moveInput } from '../../src/fight/cpu';
import type { Rng } from '../../src/core/rng';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { cena, type Cena } from './_filme';

/*
 * R-8 (docs/spec-redesenho-jogabilidade.md §3.5, flag `ritmo.cadeia`): a cadeia de combo por FORÇA. Fraco > forte > especial > super, no máximo 4
 * golpes, cancelando SÓ em acerto confirmado (não no bloqueio). Luta de verdade (`Game` inteiro, números de produção) e o comando pelo INPUT real.
 * Desligada, o motor é o de antes (a cadeia por rank, `connected` também no bloqueio): é o que os testes "flag desligada" provam.
 */

const elenco = montarElenco();
const combo = (sequencia: readonly NomeGolpe[], extra: Partial<Omit<ComboProprio, 'sequencia'>> = {}): ComboProprio => ({ id: 'teste', nome: 'TESTE', sequencia, ...extra });

describe('regra pura da cadeia por força', () => {
  it('força pelo rank: 1-2 fraco, 3-4 forte, 9 especial; o resto (lag, 0) não tem', () => {
    expect([1, 2, 3, 4, 9, 0, 5].map(forcaDoRank)).toEqual(['fraco', 'fraco', 'forte', 'forte', 'especial', null, null]);
  });

  it('fraco > forte > especial; fraco > fraco só crescendo (ou na repetição do soco fraco), até 2 fracos', () => {
    expect(cadeiaPermite([1], 2)).toBe(true); // lp > lk
    expect(cadeiaPermite([1], 1)).toBe(false); // lp > lp sem `rep`
    expect(cadeiaPermite([1], 1, true)).toBe(true); // lp > lp com `rep`
    expect(cadeiaPermite([2], 1)).toBe(false); // a força não desce
    expect(cadeiaPermite([1], 3)).toBe(true);
    expect(cadeiaPermite([2], 4)).toBe(true);
    expect(cadeiaPermite([1, 1], 1, true)).toBe(false); // o 3º fraco
    expect(cadeiaPermite([1, 2], 2)).toBe(false);
    expect(cadeiaPermite([1, 2], 3)).toBe(true);
  });

  it('forte > forte e forte > fraco NÃO cancelam; qualquer normal > especial; especial não cancela', () => {
    expect(cadeiaPermite([3], 4)).toBe(false); // hp > hk (hoje cancela)
    expect(cadeiaPermite([4], 3)).toBe(false);
    expect(cadeiaPermite([3], 3)).toBe(false);
    expect(cadeiaPermite([3], 1)).toBe(false);
    expect(cadeiaPermite([1], 9)).toBe(true);
    expect(cadeiaPermite([3], 9)).toBe(true);
    expect(cadeiaPermite([9], 1)).toBe(false);
    expect(cadeiaPermite([9], 9)).toBe(false);
  });

  it('a cadeia tem no máximo 4 golpes: fraco > fraco > forte > especial cabe; o 5º não', () => {
    expect(CADEIA_MAX_GOLPES).toBe(4);
    expect(cadeiaPermite([1, 2, 3], 9)).toBe(true); // o 4º
    expect(cadeiaPermite([1, 1, 3], 9)).toBe(true);
    expect(cadeiaPermite([1, 2, 3, 3], 9)).toBe(false); // o 5º
    expect(cadeiaPermite([1, 2, 3, 3], 4)).toBe(false);
    expect(cadeiaPermite([1, 2, 3], 4)).toBe(false); // forte > forte
  });

  it('a cadeia mais longa de hoje (lp > lp > lp > lk > hp > especial, 6 golpes) deixa de existir', () => {
    const hoje = [1, 1, 1, 2, 3, 9];
    let ranks: number[] = [];
    let chegou = 0;
    for (let i = 0; i < hoje.length; i++) {
      if (i > 0 && !cadeiaPermite(ranks, hoje[i] as number, hoje[i] === hoje[i - 1] && hoje[i] === 1)) break;
      ranks = [...ranks, hoje[i] as number];
      chegou = ranks.length;
    }
    expect(chegou).toBe(2); // lp > lp e o 3º fraco já não cabe
  });
});

describe('V1-V3 e V6 no boot, mais o limite de 2 combos', () => {
  const moves = elenco.camille.moves; // tem PARADE (sFire: parry + papel de defesa) e REVERS (sFwd)
  const erro = (c: ComboProprio | ComboProprio[], msg: RegExp): void => expect(() => validarCombosProprios('camille', Array.isArray(c) ? c : [c], moves)).toThrow(msg);

  it('V1: a força não desce (hp > lk, hk > lp, especial no meio já era proibido)', () => {
    erro(combo(['hp', 'lk', 'hp']), /V1/);
    erro(combo(['lp', 'hk', 'lk']), /V1/);
    expect(() => validarCombosProprios('camille', [combo(['lp', 'hp', 'hp'], { final: 'parede' })], moves)).not.toThrow(); // forte > forte é permitido na assinatura
  });

  it('V2: `final` só em golpe forte (lk não lança)', () => {
    erro(combo(['lk', 'lk'], { final: 'lanca' }), /V2/);
    erro(combo(['lp', 'lk', 'lp'], { final: 'lanca' }), /V1|V2/);
  });

  it('V3: no máximo 3 fracos', () => {
    erro(combo(['lp', 'lk', 'clp', 'clk']), /V1|V3/); // lk > clp também desce em rank, mas ambos são fracos: a V3 é quem barra
    expect(() => validarCombosProprios('camille', [combo(['lk', 'clp', 'clk', 'sFwd'])], moves)).not.toThrow(); // 3 fracos + especial (a assinatura da SARPA)
  });

  it('V6: o especial de defesa/contragolpe (PARADE) não fecha combo; o de ataque (REVERS) fecha', () => {
    erro(combo(['clk', 'hk', 'sDown'], { semQueda: [1] }), /V6|existe/);
    expect(() => validarCombosProprios('camille', [combo(['clk', 'hk', 'sFwd'], { semQueda: [1] })], moves)).not.toThrow();
  });

  it('no máximo 2 combos por lutador/ficha', () => {
    erro([combo(['lp', 'lk'], { id: 'a' }), combo(['lp', 'hp'], { id: 'b' }), combo(['lk', 'hp'], { id: 'c' })], /no máximo 2/);
  });
});

describe('V4 e V5 sobre os 17 combos do jogo', () => {
  const todos = ROSTER.flatMap((id) => [
    ...(elenco[id].combosProprios ?? []).map((c) => ({ id, c })),
    ...Object.values(elenco[id].fichas).flatMap((f) => (f.combosProprios && f.combosProprios !== elenco[id].combosProprios ? f.combosProprios.map((c) => ({ id, c })) : [])),
  ]);

  it('V4: duas assinaturas do jogo não têm os mesmos botões E o mesmo final', () => {
    const chaves = todos.filter(({ c }) => c.final !== undefined).map(({ c }) => `${c.sequencia.join('>')}|${c.final}`);
    expect(new Set(chaves).size).toBe(chaves.length);
  });

  it('V5: `cruza` só onde o golpe leva o corpo para o outro lado (hoje: a rasteira giratória do CAIO)', () => {
    expect(todos.filter(({ c }) => c.final === 'cruza').map(({ c }) => c.id)).toEqual(['caio-ginga-rasteira']);
  });

  it('cada lutador/ficha tem no máximo 2, e todos obedecem V1-V3 e V6 (o boot já exige; aqui fica o placar)', () => {
    for (const id of ROSTER) expect((elenco[id].combosProprios ?? []).length, id).toBeLessThanOrEqual(2);
    expect(todos).toHaveLength(17);
  });
});

/** Teclas que produzem o golpe (a mesma tabela que a CPU usa). */
const teclas = (n: NomeGolpe): Partial<InputFrame> => {
  const { dur: _dur, ...p } = moveInput(n, 1);
  void _dur;
  return p;
};

function treino(lutador: (typeof ROSTER)[number], cadeia: boolean, alvo: 'stand' | 'block' = 'stand'): Cena {
  const c = cena(lutador, 'hayato', { modo: 'training', motorV2: { combos: true }, ...(cadeia ? { ritmo: { cadeia: true } } : {}) });
  c.g.trocarAlvoDoTreino(alvo);
  c.tick(3);
  c.g.p1.x = 435;
  c.g.p2.x = 525;
  c.g.p1.en = 100;
  return c;
}

/**
 * Jogador ideal: aperta o botão do passo seguinte assim que o anterior acerta. Devolve os golpes que SAÍRAM cancelando o anterior, na ordem
 * (o 1º conta como cancelado de nada), e quantos acertaram.
 */
function encadear(c: Cena, sequencia: readonly NomeGolpe[], limite = 400): { saiu: NomeGolpe[]; acertos: number } {
  const saiu: NomeGolpe[] = [];
  let acertos = 0;
  let atkAntes = c.g.p1.atkId;
  let iniciado = false;
  for (let i = 0; i < limite && acertos < sequencia.length; i++) {
    c.mao.p1 = iniciado ? {} : teclas(sequencia[acertos] as NomeGolpe);
    const emGolpe = c.g.p1.state === 'move' && c.g.p1.move === sequencia[acertos - 1];
    c.tick();
    if (!iniciado && c.g.p1.atkId > atkAntes) {
      iniciado = true;
      if (acertos === 0 || emGolpe) saiu.push(sequencia[acertos] as NomeGolpe);
    }
    for (const e of c.porTick[c.porTick.length - 1] ?? []) {
      if (e.tipo === 'hit' && e.atacante === 0 && iniciado) {
        acertos++;
        atkAntes = c.g.p1.atkId;
        iniciado = false;
      }
    }
  }
  c.mao.p1 = {};
  return { saiu, acertos };
}

describe('o motor com ritmo.cadeia: a cadeia por força', () => {
  it('fraco > forte > especial: lp > hp > especial sai cancelando cada elo (HAYATO)', () => {
    const c = treino('hayato', true);
    const r = encadear(c, ['lp', 'hp', 'sDown']);
    expect(r.saiu).toEqual(['lp', 'hp', 'sDown']);
    expect(r.acertos).toBe(3);
  });

  it('forte > forte NÃO cancela (hp > hk): o hk só sai depois do hp acabar; com a flag desligada, cancela', () => {
    const ligado = treino('hayato', true);
    expect(encadear(ligado, ['hp', 'hk'], 200).saiu).toEqual(['hp']);
    const desligado = treino('hayato', false);
    expect(encadear(desligado, ['hp', 'hk'], 200).saiu).toEqual(['hp', 'hk']);
  });

  it('no máximo 2 fracos: lp > lp > lp só cancela até o 2º; lp > lk > hp > especial fecha em 4', () => {
    const tres = treino('hayato', true);
    expect(encadear(tres, ['lp', 'lp', 'lp'], 300).saiu).toEqual(['lp', 'lp']);
    const longo = treino('hayato', true);
    expect(encadear(longo, ['lp', 'lk', 'hp', 'sDown']).saiu).toEqual(['lp', 'lk', 'hp', 'sDown']);
    const hoje = treino('hayato', false);
    expect(encadear(hoje, ['lp', 'lp', 'lp']).saiu).toEqual(['lp', 'lp', 'lp']); // a cadeia de hoje deixa 3 socos
  });

  it('o teto de 4 golpes: depois de lp > lk > hp > especial nada mais cancela', () => {
    const c = treino('hayato', true);
    encadear(c, ['lp', 'lk', 'hp', 'sDown']);
    expect(c.g.p1.cadeiaGolpes).toEqual(['lp', 'lk', 'hp', 'sDown']);
    expect(c.g.p1.cadeiaGolpes.length).toBe(CADEIA_MAX_GOLPES);
  });

  it('o cancelamento exige ACERTO: golpe bloqueado não encadeia (com a flag desligada, encadeia no bloqueio, o `connected` de hoje)', () => {
    const cancelou = (cadeia: boolean): boolean => {
      const c = treino('hayato', cadeia, 'block');
      c.tick(2);
      c.g.p2.x = 525;
      c.g.p1.startMove('lp', c.g);
      let cancelou = false;
      for (let i = 0; i < 30; i++) {
        c.mao.p1 = i > 4 ? teclas('hp') : {};
        const eraLp = c.g.p1.state === 'move' && c.g.p1.move === 'lp';
        c.tick();
        if (eraLp && c.g.p1.move === 'hp') cancelou = true;
      }
      expect(c.eventos.some((e) => e.tipo === 'block')).toBe(true);
      return cancelou;
    };
    expect(cancelou(false)).toBe(true); // hoje o bloqueio também liga `connected`
    expect(cancelou(true)).toBe(false); // R-8: só acerto confirmado
  });

  it('uma assinatura abre o que a força proíbe (AMINU lk > hp > hp: o 2º forte só sai pelo combo), mas o teto de 4 vale', () => {
    const c = treino('aminu', true);
    const r = encadear(c, ['lk', 'hp', 'hp']);
    expect(r.saiu).toEqual(['lk', 'hp', 'hp']);
    expect(c.g.p1.cadeiaGolpes.length).toBeLessThanOrEqual(CADEIA_MAX_GOLPES);
  });

  it('a assinatura de 3 fracos da SARPA (lk > clp > clk > especial) cabe nos 4 golpes', () => {
    const c = cena('nila', 'hayato', { modo: 'training', motorV2: { combos: true }, ritmo: { cadeia: true } });
    c.g.p1.trocarFicha('sarpa');
    c.g.trocarAlvoDoTreino('stand');
    c.tick(3);
    c.g.p1.x = 435;
    c.g.p2.x = 525;
    c.g.p1.en = 100;
    const r = encadear(c, ['lk', 'clp', 'clk', 'sFire']);
    expect(r.saiu).toEqual(['lk', 'clp', 'clk', 'sFire']);
  });

  it('o super cancela o fim da cadeia depois de um acerto confirmado; no bloqueio não', () => {
    const disparar = (alvo: 'stand' | 'block'): boolean => {
      const c = cena('hayato', 'hayato', { modo: 'training', motorV2: { combos: true, filmes: true }, ritmo: { cadeia: true, super: true } });
      c.g.trocarAlvoDoTreino(alvo);
      c.tick(3);
      c.g.p1.x = 435;
      c.g.p2.x = 525;
      c.g.p1.en = 100;
      c.g.p1.startMove('lp', c.g);
      let superou = false;
      for (let i = 0; i < 40; i++) {
        c.mao.p1 = i > 4 && i < 8 ? { hp: true, hk: true } : {};
        c.tick();
        if (c.eventos.some((e) => e.tipo === 'special' && e.super === true)) superou = true;
      }
      return superou;
    };
    expect(disparar('stand')).toBe(true);
    expect(disparar('block')).toBe(false);
  });
});

// ----- a CPU (R-10 resto): confirma o acerto, segue o plano, pune o erro, não treme no andar -----

/** RNG que devolve sempre `valor` (0,01 = todo sorteio "passa") e conta as chamadas. */
function fixo(valor: number): { rng: Rng; chamadas: () => number } {
  let n = 0;
  const rng: Rng = {
    proximo: () => (n++, valor),
    entre: (a, b) => a + rng.proximo() * (b - a),
    inteiro: (k) => Math.floor(rng.proximo() * k),
    escolher: (xs) => xs[Math.floor(rng.proximo() * xs.length)] as (typeof xs)[number],
    estado: () => 0,
  };
  return { rng, chamadas: () => n };
}
const algumAtaque = (i: InputFrame): boolean => !!(i.lp || i.lk || i.hp || i.hk || i.sp);

describe('a CPU com ritmo.cadeia + ritmo.cpu', () => {
  const RITMO = { cadeia: true, cpu: true, super: true } as const;
  /** CPU (P1, HAYATO) no meio do clp, com o rival ao alcance. `acertou` = o histórico do combo tem o clp (acerto confirmado); `connected` sempre ligado (o bloqueio também liga). */
  function depoisDoClp(nivel: 0 | 1 | 2, acertou: boolean, ritmo: typeof RITMO | null = RITMO) {
    const c = cena('hayato', 'caio', { modo: 'versus', motorV2: { combos: true }, ...(ritmo ? { ritmo } : {}) });
    c.g.p1.cpu = nivel;
    c.g.p1.x = 435;
    c.g.p2.x = 525;
    c.g.p1.en = 40;
    c.g.p1.startMove('clp', c.g);
    c.g.p1.mt = 4;
    c.g.p1.connected = true;
    if (acertou) c.g.p1.historicoCombo = [{ golpe: 'clp', atk: c.g.p1.atkId }];
    c.g.p2.setState('hit');
    c.g.p2.stun = 30;
    return c;
  }

  it('golpe BLOQUEADO (connected sem acerto no histórico): a CPU não aperta o próximo golpe; sem a cadeia, aperta (o `connected` de hoje)', () => {
    const c = depoisDoClp(2, false);
    for (let i = 0; i < 30; i++) expect(algumAtaque(cpuInput(c.g.p1, c.g.p2, c.g, fixo(0.01).rng)), `tick ${i}`).toBe(false);
    const hoje = depoisDoClp(2, false, null);
    c.g.p1.mt = 4;
    let apertou = false;
    for (let i = 0; i < 30 && !apertou; i++) apertou = algumAtaque(cpuInput(hoje.g.p1, hoje.g.p2, hoje.g, fixo(0.01).rng));
    expect(apertou).toBe(true);
  });

  it('acerto confirmado: espera o tempo de reação do nível (CPU_RITMO.confirma) e então segue o combo (clp > hk); o FÁCIL espera mais que o DIFÍCIL', () => {
    const quando = (nivel: 0 | 1 | 2): number => {
      const c = depoisDoClp(nivel, true);
      c.g.p1.startMove('clp', c.g);
      c.g.p1.mt = 4;
      c.g.p1.historicoCombo = [{ golpe: 'clp', atk: c.g.p1.atkId }];
      for (let i = 0; i < 12; i++) {
        c.g.p1.mt = 4 + i;
        const inp = cpuInput(c.g.p1, c.g.p2, c.g, fixo(0.01).rng);
        if (inp.hk) return i;
      }
      return Infinity;
    };
    const dificil = quando(2);
    const normal = quando(1);
    expect(dificil).toBeLessThanOrEqual(CPU_RITMO[2].confirma);
    expect(normal).toBeLessThanOrEqual(CPU_RITMO[1].confirma);
    expect(dificil).toBeLessThanOrEqual(normal);
    expect(quando(0)).toBeGreaterThan(normal); // o FÁCIL perde o elo por lentidão (a janela do clp fecha antes)
  });

  it('pune o erro: golpe do rival que errou e deixou recuperação longa leva uma resposta, uma vez por golpe dele', () => {
    const c = cena('hayato', 'caio', { modo: 'versus', motorV2: { combos: true }, ritmo: RITMO });
    c.g.p1.cpu = 2;
    c.g.p1.x = 435;
    c.g.p2.x = 525;
    c.g.p2.startMove('hk', c.g);
    c.g.p1.ai.seen = c.g.p2.atkId; // já reagiu a este golpe (o ramo de defesa não consome o sorteio)
    const g = c.g.p2.golpeAtual();
    c.g.p2.mt = g.S + g.A + 2; // na recuperação
    const a = cpuInput(c.g.p1, c.g.p2, c.g, fixo(0.01).rng);
    expect(algumAtaque(a)).toBe(true);
    const de = fixo(0.01);
    cpuInput(c.g.p1, c.g.p2, c.g, de.rng); // o mesmo golpe dele: já foi considerado
    expect(c.g.p1.ai.punirAtk).toBe(c.g.p2.atkId);
  });

  it('o FÁCIL nunca pune o erro (punirErro 0) e o chefão fica de fora de tudo isto', () => {
    expect(CPU_RITMO[0].punirErro).toBe(0);
    const c = cena('hayato', 'caio', { modo: 'versus', motorV2: { combos: true }, ritmo: RITMO });
    c.g.p1.cpu = 2;
    c.g.p1.perfilIa = { ...(c.g.p1.perfilIa ?? ({} as never)), think: 8, react: 0, block: 0, aggr: 0, fire: 0, anti: 0, combo: 0, esq: 0, punir: 0, proprio: 0 };
    c.g.p1.x = 435;
    c.g.p2.x = 525;
    c.g.p2.startMove('hk', c.g);
    const g = c.g.p2.golpeAtual();
    c.g.p2.mt = g.S + g.A + 2;
    cpuInput(c.g.p1, c.g.p2, c.g, fixo(0.01).rng);
    expect(c.g.p1.ai.punirAtk).toBe(-1); // com `perfilIa` (chefão) o ramo nem roda
  });

  it('histerese no andar: o sentido do passo não inverte antes de 16 ticks (sem a flag, inverte em menos)', () => {
    const menorIntervalo = (ritmo: typeof RITMO | null): number => {
      const c = cena('hayato', 'caio', { modo: 'versus', ...(ritmo ? { ritmo } : {}), semente: 11 });
      c.g.p1.cpu = 2;
      c.g.p1.x = 300;
      c.g.p2.x = 550; // a 250 px: a CPU anda para frente e para trás
      let ultimoSentido = 0;
      let desde = 0;
      let menor = Infinity;
      for (let t = 0; t < 900; t++) {
        c.tick();
        if (c.g.p1.state === 'walk') {
          const s = Math.sign(c.g.p1.vx);
          if (s !== 0 && ultimoSentido !== 0 && s !== ultimoSentido) menor = Math.min(menor, t - desde);
          if (s !== 0 && s !== ultimoSentido) {
            ultimoSentido = s;
            desde = t;
          }
        }
        c.g.p1.x = 300;
        c.g.p2.x = 550;
      }
      return menor;
    };
    expect(menorIntervalo(RITMO)).toBeGreaterThanOrEqual(16);
    expect(menorIntervalo(null)).toBeLessThan(16);
  });
});
