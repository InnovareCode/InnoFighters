import { describe, expect, it } from 'vitest';
import type { InputFrame } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { comboAbreCancelamento, comboReconhecido, EFEITO_MAX_CARACTERES, ehPrefixo, golpesQueContinuam, validarCombosProprios } from '../../src/data/combos-proprios';
import { ROSTER } from '../../src/data/lutadores';
import type { ComboProprio, FinalDoCombo, NomeGolpe } from '../../src/data/tipos';
import { AI_LEVELS, cpuInput, moveInput, perfilChefe, type PerfilCpu } from '../../src/fight/cpu';
import { montarElenco, type Elenco } from '../../ferramentas/balanco/elenco';
import { limiteDeDano, verificarCombo, verificarCombos } from '../../ferramentas/balanco/frame-data';
import { montarTarefas, lutar } from '../../ferramentas/balanco/simulacao';
import { cena, type Cena } from './_filme';

/*
 * V2-4 (docs/spec-revisao-motor-luta-v2.md §6 e §9): COMBOS PRÓPRIOS atrás de `motorV2.combos`. O que se prova aqui:
 *  1. as funções puras (prefixo do histórico) e a validação de dados no boot;
 *  2. o motor: o combo abre o cancelamento que a cadeia por rank proíbe, `semQueda` e `final` só valem dentro de uma sequência reconhecida,
 *     e com a flag desligada nada disso existe;
 *  3. o VERIFICADOR (spec §6.2) com os 20 combos da 1ª leva (aceite: 20 de 20) e barrando exemplos ruins;
 *  4. a CPU DIFÍCIL (RNG intacto fora do ramo do combo) e o harness.
 */

const elenco = montarElenco();

/** O elenco com a lista de combos de `id` (ficha base) trocada, sem tocar no objeto compartilhado. */
function comCombos(id: (typeof ROSTER)[number], combos: readonly ComboProprio[]): Elenco {
  return { ...elenco, [id]: { ...elenco[id], combosProprios: combos } };
}

const combo = (sequencia: readonly NomeGolpe[], extra: Partial<Omit<ComboProprio, 'sequencia'>> = {}): ComboProprio => ({ id: 'teste', nome: 'TESTE', sequencia, ...extra });

describe('funções puras: o histórico de acertos é prefixo de alguma sequência', () => {
  const A = combo(['hp', 'lk', 'hp'], { id: 'a' });
  const B = combo(['hp', 'hk', 'sFwd'], { id: 'b', semQueda: [1] });
  const lista = [A, B];

  it('ehPrefixo: vazio casa com tudo; maior que a sequência não casa; ordem importa', () => {
    expect(ehPrefixo([], ['hp', 'lk'])).toBe(true);
    expect(ehPrefixo(['hp'], ['hp', 'lk'])).toBe(true);
    expect(ehPrefixo(['hp', 'lk'], ['hp', 'lk'])).toBe(true);
    expect(ehPrefixo(['hp', 'lk', 'hp'], ['hp', 'lk'])).toBe(false);
    expect(ehPrefixo(['lk', 'hp'], ['hp', 'lk'])).toBe(false);
  });

  it('comboReconhecido devolve o 1º combo da lista e o passo do último golpe; sem histórico ou sem casamento, null', () => {
    expect(comboReconhecido(lista, ['hp'])).toEqual({ combo: A, passo: 0 });
    expect(comboReconhecido(lista, ['hp', 'hk'])).toEqual({ combo: B, passo: 1 });
    expect(comboReconhecido(lista, ['hp', 'lk', 'hp'])).toEqual({ combo: A, passo: 2 });
    expect(comboReconhecido(lista, [])).toBeNull();
    expect(comboReconhecido(lista, ['lk'])).toBeNull();
    expect(comboReconhecido(lista, ['hp', 'lk', 'hp', 'hp'])).toBeNull();
    expect(comboReconhecido(undefined, ['hp'])).toBeNull();
  });

  it('comboAbreCancelamento: histórico + próximo precisa ser prefixo; o ÂNCORA é o 1º acerto (meio de sequência não vale)', () => {
    expect(comboAbreCancelamento(lista, ['hp'], 'lk')).toBe(true);
    expect(comboAbreCancelamento(lista, ['hp'], 'hk')).toBe(true);
    expect(comboAbreCancelamento(lista, ['hp'], 'lp')).toBe(false);
    expect(comboAbreCancelamento(lista, ['lk'], 'hp')).toBe(false); // 'lk hp' só existiria no MEIO de A
    expect(comboAbreCancelamento(lista, [], 'hp')).toBe(false);
    expect(comboAbreCancelamento(lista, ['hp', 'lk', 'hp'], 'hp')).toBe(false); // passou do fim
  });

  it('golpesQueContinuam lista o próximo de cada combo, sem repetir, na ordem do dado', () => {
    expect(golpesQueContinuam(lista, ['hp'])).toEqual(['lk', 'hk']);
    expect(golpesQueContinuam(lista, ['hp', 'hk'])).toEqual(['sFwd']);
    expect(golpesQueContinuam(lista, ['hp', 'lk', 'hp'])).toEqual([]);
    expect(golpesQueContinuam([A, combo(['hp', 'lk', 'hk'], { id: 'c' })], ['hp', 'lk'])).toEqual(['hp', 'hk']);
  });
});

describe('validação no boot (falha alto)', () => {
  const moves = elenco.hayato.moves;
  const ok = (c: ComboProprio): void => validarCombosProprios('hayato', [c], moves);
  const erro = (c: ComboProprio | ComboProprio[], msg: RegExp): void => expect(() => validarCombosProprios('hayato', Array.isArray(c) ? c : [c], moves)).toThrow(msg);

  it('aceita 2 a 4 golpes comuns de chão, com um especial só no último lugar', () => {
    ok(combo(['lp', 'lk']));
    ok(combo(['lp', 'lk', 'hp', 'chk']));
    ok(combo(['clp', 'hk', 'sDown'], { semQueda: [1] }));
    expect(() => validarCombosProprios('hayato', undefined, moves)).not.toThrow();
  });

  it('recusa tamanho fora de 2..4, golpe aéreo/agarrão/oculto, especial no meio e golpe que não existe', () => {
    erro(combo(['lp']), /2 a 4 golpes/);
    erro(combo(['lp', 'lk', 'hp', 'hk', 'chk']), /2 a 4 golpes/);
    erro(combo(['lp', 'jhk']), /só normais de chão/);
    erro(combo(['lp', 'throw']), /só normais de chão/);
    erro(combo(['lp', 'sResp']), /não existe|só normais/);
    erro(combo(['lp', 'sFire', 'hp']), /ÚLTIMO lugar/);
    erro(combo(['sFire', 'lp']), /ÚLTIMO lugar/);
  });

  it('recusa id vazio ou repetido, sequência repetida e nome vazio', () => {
    erro([combo(['lp', 'lk'], { id: 'x' }), combo(['hp', 'hk'], { id: 'x' })], /repetido/);
    erro([combo(['lp', 'lk'], { id: 'x' }), combo(['lp', 'lk'], { id: 'y' })], /repetida/);
    erro(combo(['lp', 'lk'], { nome: ' ' }), /nome vazio/);
  });

  it('efeito: opcional; vazio, com quebra de linha, espaço sobrando ou acima do teto falha alto', () => {
    ok(combo(['lp', 'lk']));
    ok(combo(['lp', 'lk'], { efeito: 'segura em pé' }));
    ok(combo(['lp', 'lk'], { efeito: 'x'.repeat(EFEITO_MAX_CARACTERES) }));
    erro(combo(['lp', 'lk'], { efeito: '' }), /efeito vazio/);
    erro(combo(['lp', 'lk'], { efeito: '   ' }), /efeito vazio/);
    erro(combo(['lp', 'lk'], { efeito: 'duas\nlinhas' }), /quebra de linha/);
    erro(combo(['lp', 'lk'], { efeito: 'com\ttab' }), /quebra de linha/);
    erro(combo(['lp', 'lk'], { efeito: ' espaço na ponta' }), /espaço sobrando/);
    erro(combo(['lp', 'lk'], { efeito: 'x'.repeat(EFEITO_MAX_CARACTERES + 1) }), /máximo/);
  });

  it('semQueda: só nos passos que derrubam (kd), com atordoamento (hs), antes do último, sem repetir; final: sem especial no fim', () => {
    erro(combo(['lp', 'lk', 'hp'], { semQueda: [1] }), /já não derruba/); // lk não derruba
    erro(combo(['lp', 'chp', 'hp'], { semQueda: [1] }), /sem atordoamento/); // chp derruba mas hs 0: o rival ficaria livre
    erro(combo(['hk', 'lp'], { semQueda: [1] }), /fora de 0\.\.0/); // o último é regido por `final`
    erro(combo(['hk', 'hk', 'lp'], { semQueda: [0, 0] }), /repetido/);
    erro(combo(['lp', 'hk', 'sFwd'], { final: 'cruza' }), /especial tem o filme/);
    erro(combo(['lp', 'lk'], { final: 'voa' as FinalDoCombo }), /desconhecido/);
  });
});

describe('os 20 combos da 1ª leva (spec §6.1/§9): o dado', () => {
  const todos = ROSTER.flatMap((id) => [
    ...(elenco[id].combosProprios ?? []).map((c) => ({ id, ficha: null as string | null, c })),
    ...Object.entries(elenco[id].fichas).flatMap(([ficha, ch]) => (ch.combosProprios && ch.combosProprios !== elenco[id].combosProprios ? ch.combosProprios.map((c) => ({ id, ficha: ficha as string | null, c })) : [])),
  ]);

  it('são 20: 2 por lutador, e a NILA tem 1 por postura (GAJA na base, SARPA na ficha)', () => {
    expect(todos).toHaveLength(20);
    for (const id of ROSTER) {
      const deles = todos.filter((t) => t.id === id);
      expect(deles, id).toHaveLength(2);
    }
    const nila = todos.filter((t) => t.id === 'nila');
    expect(nila.map((t) => t.ficha).sort()).toEqual([null, 'sarpa']);
  });

  it('ids únicos no jogo todo, começando pelo id do lutador; nomes preenchidos; sequências de 2 a 4 golpes', () => {
    const ids = todos.map((t) => t.c.id);
    expect(new Set(ids).size).toBe(20);
    for (const { id, c } of todos) {
      expect(c.id.startsWith(`${id}-`), c.id).toBe(true);
      expect(c.nome.trim().length, c.id).toBeGreaterThan(0);
      expect(c.sequencia.length, c.id).toBeGreaterThanOrEqual(2);
      expect(c.sequencia.length, c.id).toBeLessThanOrEqual(4);
    }
  });

  it('as fichas do ZENON (chefe e chefe2) herdam os 2 combos da base', () => {
    expect(elenco.zenon.fichas['chefe']?.combosProprios).toBe(elenco.zenon.combosProprios);
    expect(elenco.zenon.fichas['chefe2']?.combosProprios).toBe(elenco.zenon.combosProprios);
  });
});

describe('o VERIFICADOR (spec §6.2): aceite da fatia', () => {
  const verificacoes = verificarCombos(elenco, ROSTER);

  it('20 de 20 combos combinam em pé e agachado (nenhum golpe bloqueado, errado ou sem encadear; o boneco nunca livre entre eles)', () => {
    expect(verificacoes).toHaveLength(20);
    for (const v of verificacoes) {
      expect(v.emPe.falha, `${v.id} em pé`).toBeNull();
      expect(v.agachado.falha, `${v.id} agachado`).toBeNull();
      expect(v.emPe.acertos, v.id).toBe(v.sequencia.length);
      expect(v.agachado.acertos, v.id).toBe(v.sequencia.length);
    }
  });

  it('20 de 20 com dano <= 36,8 (40% de 92) SEM o teto de combo, e cada um tem uma propriedade que a cadeia universal não dá', () => {
    expect(limiteDeDano(elenco)).toBeCloseTo(36.8, 9);
    for (const v of verificacoes) {
      expect(v.dano, `${v.id}: ${v.dano.toFixed(2)}`).toBeLessThanOrEqual(36.8 + 1e-9);
      expect(v.dano, v.id).toBeGreaterThan(5);
      expect(v.identidade.length, `${v.id} sem identidade`).toBeGreaterThan(0);
      expect(v.ok, `${v.id}: ${v.falhas.join(' | ')}`).toBe(true);
    }
    expect(verificacoes.filter((v) => v.ok)).toHaveLength(20);
  });

  it('barra o exemplo ruim da spec: hp > hk (sem queda) > GOLPE MARMA da NILA = 43,4 (47% de 92) sem o teto', () => {
    const ruim = combo(['hp', 'hk', 'sFire'], { id: 'nila-ruim', semQueda: [1] });
    const v = verificarCombo(comCombos('nila', [ruim]), 'nila', null, ruim);
    expect(v.dano).toBeCloseTo(43.4, 1); // hp 12,7 + hk 17,3 x 0,9 + MARMA 19,0 x 0,8 (pow 1,15 da V2-6; era 44,5 com pow 1,18 e MARMA 19,5)
    expect(v.ok).toBe(false);
    expect(v.falhas.join(' ')).toMatch(/dano 43\.\d passa de 36\.8/);
    // os golpes em si encadeiam: a falha é só o dano
    expect(v.emPe.falha).toBeNull();
    expect(v.agachado.falha).toBeNull();
  });

  it('barra elo com folga: o boneco fica livre (LONG ZHANG é lento demais depois de um soco fraco; RESORTE depois do chute forte)', () => {
    const lento = combo(['lp', 'sFire'], { id: 'wei-lento' });
    const v = verificarCombo(comCombos('wei-long', [lento]), 'wei-long', null, lento);
    expect(v.ok).toBe(false);
    expect(v.emPe.falha).toMatch(/ficou livre depois do passo 1 \(lp\) e antes do 2/);
    expect(v.agachado.falha).toMatch(/ficou livre/);
    const resorte = combo(['lk', 'hk', 'sFwd'], { id: 'centella-lento', semQueda: [1] });
    expect(verificarCombo(comCombos('centella', [resorte]), 'centella', null, resorte).emPe.falha).toMatch(/ficou livre depois do passo 2 \(hk\)/);
  });

  it('barra a queda no meio (golpe que derruba sem `semQueda`) e a sequência que é só a cadeia universal', () => {
    const cai = combo(['lp', 'hk', 'lp'], { id: 'hayato-cai' });
    const v = verificarCombo(comCombos('hayato', [cai]), 'hayato', null, cai);
    expect(v.emPe.falha).toMatch(/o boneco caiu no passo 2 \(hk\)/);
    const universal = combo(['lp', 'lk', 'hp'], { id: 'hayato-universal' });
    const u = verificarCombo(comCombos('hayato', [universal]), 'hayato', null, universal);
    expect(u.emPe.falha).toBeNull();
    expect(u.identidade).toEqual([]);
    expect(u.ok).toBe(false);
    expect(u.falhas.join(' ')).toMatch(/cadeia universal/);
  });

  it('o cancelamento só sai porque o combo está REGISTRADO: sem ele (lista vazia) hp > lk não encadeia', () => {
    const c = combo(['hp', 'lk', 'hp'], { id: 'wei-sem-registro', final: 'parede' });
    const v = verificarCombo(comCombos('wei-long', []), 'wei-long', null, c);
    expect(v.emPe.falha).toMatch(/não encadeou/);
    expect(verificarCombo(comCombos('wei-long', [c]), 'wei-long', null, c).emPe.falha).toBeNull();
  });
});

describe('o motor: `final` muda COMO o rival cai (só no último golpe comum de uma sequência reconhecida)', () => {
  const seq: NomeGolpe[] = ['lp', 'lk', 'hp'];
  const rodar = (final: FinalDoCombo | undefined) => {
    const c = combo(seq, { id: 'final', ...(final ? { final } : {}) });
    return verificarCombo(comCombos('camille', [c]), 'camille', null, c).emPe.fim;
  };
  const base = rodar('derruba');

  it("'derruba' é a queda de sempre; 'lanca' sobe mais; 'parede' vai muito mais longe; 'cruza' pousa do outro lado", () => {
    const lanca = rodar('lanca');
    const parede = rodar('parede');
    const cruza = rodar('cruza');
    expect(base.caiu).toBe(true);
    expect(base.trocouDeLado).toBe(false);
    expect(lanca.pico).toBeGreaterThan(base.pico + 40);
    expect(parede.distancia).toBeGreaterThan(base.distancia + 60);
    expect(cruza.trocouDeLado).toBe(true);
    expect(lanca.trocouDeLado).toBe(false);
    expect(parede.trocouDeLado).toBe(false);
  });

  it('sem `final`, o hp que não derruba continua não derrubando (só o golpe da sequência reconhecida muda)', () => {
    // 'derruba' declarado faz o hp (que sozinho deixa o rival em pé) derrubá-lo; sem `final` o rival fica de pé e o 'caiu' é falso
    const semFinal = rodar(undefined);
    expect(semFinal.caiu).toBe(false);
    expect(base.caiu).toBe(true);
  });
});

/** Teclas que produzem o golpe (a mesma tabela que a CPU usa). */
const teclas = (n: NomeGolpe): Partial<InputFrame> => {
  const { dur: _dur, ...p } = moveInput(n, 1);
  void _dur;
  return p;
};

/**
 * Deixa o P1 apertar a sequência como um jogador ideal (o próximo botão assim que o golpe acerta). Devolve quantos golpes acertaram e
 * quantos dos golpes seguintes saíram CANCELANDO o anterior (começaram com o anterior ainda em curso, em vez de esperar a recuperação).
 */
function encadear(c: Cena, sequencia: readonly NomeGolpe[], limite = 500): { acertos: number; cancelados: number } {
  let acertos = 0;
  let cancelados = 0;
  let atkAntes = c.g.p1.atkId;
  let iniciado = false;
  for (let i = 0; i < limite && acertos < sequencia.length; i++) {
    c.mao.p1 = iniciado ? {} : teclas(sequencia[acertos] as NomeGolpe);
    const emGolpe = c.g.p1.state === 'move' && c.g.p1.move === sequencia[acertos - 1];
    c.tick();
    if (!iniciado && c.g.p1.atkId > atkAntes) {
      iniciado = true;
      if (acertos > 0 && emGolpe) cancelados++;
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
  return { acertos, cancelados };
}

function treino(c1: (typeof ROSTER)[number], flag: boolean) {
  const c = cena(c1, 'hayato', { modo: 'training', motorV2: flag ? { combos: true } : null });
  c.g.trocarAlvoDoTreino('stand');
  c.tick(3);
  c.g.p1.x = 435;
  c.g.p2.x = 525;
  c.g.p1.en = 100;
  return c;
}

describe('o motor: o combo abre o cancelamento que a cadeia por rank proíbe', () => {
  it('flag LIGADA: WEI LONG faz hp > lk > hp (rank 3 > 2 > 3); DESLIGADA, o lk depois do hp não sai', () => {
    const ligado = treino('wei-long', true);
    expect(encadear(ligado, ['hp', 'lk', 'hp'])).toEqual({ acertos: 3, cancelados: 2 });
    const desligado = treino('wei-long', false);
    // sem a flag o lk depois do hp só começa quando o hp ACABA (ainda dentro do atordoamento do rival, então acerta, mas não é cancelamento);
    // o único cancelamento é o lk > hp, que é a cadeia universal (rank 2 > 3)
    expect(encadear(desligado, ['hp', 'lk', 'hp'], 200).cancelados).toBe(1);
    expect(desligado.g.p1.historicoCombo).toEqual([]); // com a flag desligada o histórico nem é escrito
    expect(desligado.g.combosPropriosFeitos).toEqual([0, 0]);
  });

  it('o histórico recomeça quando o rival fica livre e o combo só vale a partir do 1º acerto (âncora)', () => {
    const c = treino('wei-long', true);
    expect(encadear(c, ['lk', 'hp'])).toEqual({ acertos: 2, cancelados: 1 }); // lk > hp é a cadeia universal; o histórico [lk, hp] NÃO é prefixo de hp > lk > hp
    c.tick(120); // o rival se recompõe
    expect(c.g.p2.gotHits).toBe(0);
    c.g.p1.x = 435;
    c.g.p2.x = 525;
    expect(encadear(c, ['hp', 'lk', 'hp'])).toEqual({ acertos: 3, cancelados: 2 }); // e um combo novo funciona depois
    expect(c.g.combosPropriosFeitos[0]).toBe(1);
  });

  it('um golpe BLOQUEADO não abre combo: sem acerto no histórico o hp > lk não sai', () => {
    const c = treino('wei-long', true);
    c.g.trocarAlvoDoTreino('block');
    c.tick(2);
    c.g.p2.x = 525;
    c.g.p1.startMove('hp', c.g);
    let cancelou = false;
    for (let i = 0; i < 40; i++) {
      c.mao.p1 = i > 8 ? teclas('lk') : {};
      const eraHp = c.g.p1.state === 'move' && c.g.p1.move === 'hp';
      c.tick();
      if (eraHp && c.g.p1.move === 'lk') cancelou = true;
    }
    expect(c.eventos.some((e) => e.tipo === 'block')).toBe(true);
    expect(c.eventos.some((e) => e.tipo === 'hit')).toBe(false);
    expect(c.g.p1.historicoCombo).toEqual([]);
    expect(cancelou).toBe(false);
  });

  it('`semQueda`: com a flag o hk do meio deixa o rival atordoado (hit) e o especial encaixa; sem ela (cadeia universal) o hk derruba', () => {
    const ligado = treino('hayato', true);
    expect(encadear(ligado, ['clp', 'hk'])).toEqual({ acertos: 2, cancelados: 1 });
    expect(ligado.g.p2.state).toBe('hit'); // o hk do meio NÃO derrubou: o rival segue atordoado
    expect(ligado.g.p2.stun).toBeGreaterThan(0);
    const completo = treino('hayato', true);
    expect(encadear(completo, ['clp', 'hk', 'sDown'])).toEqual({ acertos: 3, cancelados: 2 });
    expect(completo.g.combosPropriosFeitos[0]).toBe(1);
    const desligado = treino('hayato', false);
    expect(encadear(desligado, ['clp', 'hk'])).toEqual({ acertos: 2, cancelados: 1 }); // a cadeia universal também cancela clp > hk...
    expect(desligado.g.p2.state).toBe('down'); // ...mas o hk derruba: o sDown não teria em quem bater
  });
});

describe('a CPU: só o DIFÍCIL usa o combo, e o RNG fica como antes fora do ramo dele', () => {
  const normal = AI_LEVELS[1];
  const dificil = AI_LEVELS[2];

  function contador(valor: number): { rng: Rng; chamadas: () => number } {
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

  /** CPU (P1, hayato) logo depois de acertar o clp: o próximo do combo `clp > hk > sDown` é o hk. */
  function depoisDoClp(flag: boolean, perfil?: PerfilCpu) {
    const c = cena('hayato', 'caio', { modo: 'versus', motorV2: flag ? { combos: true } : null });
    c.g.p1.cpu = 2;
    if (perfil) c.g.p1.perfilIa = perfil;
    c.g.p1.x = 435;
    c.g.p2.x = 525;
    c.g.p1.en = 100;
    c.g.p1.startMove('clp', c.g);
    c.g.p1.mt = 4;
    c.g.p1.connected = true;
    c.g.p1.historicoCombo = [{ golpe: 'clp', atk: c.g.p1.atkId }];
    return c;
  }

  it('AI_LEVELS: proprio 0 / 0 / 0,85 (chance por nível); o chefe herda o do nível escolhido', () => {
    expect(AI_LEVELS.map((n) => n.proprio)).toEqual([0, 0, 0.85]);
    expect(perfilChefe(2, false).proprio).toBe(0.85);
    expect(perfilChefe(1, true).proprio).toBe(0);
  });

  it('flag ligada + DIFÍCIL: depois do acerto que continua o combo, UM sorteio e a CPU aperta o próximo golpe (hk)', () => {
    const c = depoisDoClp(true);
    const { rng, chamadas } = contador(0.1);
    const inp = cpuInput(c.g.p1, c.g.p2, c.g, rng);
    expect(inp.hk).toBe(true);
    expect(inp.lp || inp.lk || inp.hp || inp.sp).toBe(false);
    expect(chamadas()).toBe(1);
    expect(c.g.p1.ai.proprioAtk).toBe(c.g.p1.atkId);
  });

  it('um sorteio por golpe: depois de recusar (rnd alto) a CPU não sorteia de novo no mesmo golpe', () => {
    const c = depoisDoClp(true);
    const um = contador(0.99);
    cpuInput(c.g.p1, c.g.p2, c.g, um.rng);
    const primeira = um.chamadas();
    const dois = contador(0.99);
    cpuInput(c.g.p1, c.g.p2, c.g, dois.rng);
    // a 2ª chamada no mesmo golpe pula o ramo do combo: gasta menos sorteios que a 1ª
    expect(dois.chamadas()).toBeLessThan(primeira);
  });

  it('flag DESLIGADA: o perfil com `proprio` 0,85 decide e sorteia EXATAMENTE como o de `proprio` 0 (400 sementes)', () => {
    const zero: PerfilCpu = { ...dificil, proprio: 0 };
    for (let s = 1; s <= 400; s++) {
      const a = depoisDoClp(false);
      const b = depoisDoClp(false, zero);
      const ra = criarRng(s);
      const rb = criarRng(s);
      const ia = cpuInput(a.g.p1, a.g.p2, a.g, ra);
      const ib = cpuInput(b.g.p1, b.g.p2, b.g, rb);
      expect(ia, `semente ${s}`).toEqual(ib);
      expect(ra.estado(), `semente ${s}`).toBe(rb.estado());
    }
  });

  it('flag ligada mas `proprio` 0 (NORMAL/FÁCIL): nenhum sorteio a mais, mesmo com o combo disponível', () => {
    const zero: PerfilCpu = { ...normal, proprio: 0 };
    for (let s = 1; s <= 200; s++) {
      const ligada = depoisDoClp(true, zero);
      const desligada = depoisDoClp(false, zero);
      const r1 = criarRng(s);
      const r2 = criarRng(s);
      expect(cpuInput(ligada.g.p1, ligada.g.p2, ligada.g, r1), `semente ${s}`).toEqual(cpuInput(desligada.g.p1, desligada.g.p2, desligada.g, r2));
      expect(r1.estado(), `semente ${s}`).toBe(r2.estado());
    }
  });

  it('sem combo para continuar (lutador sem lista, ou histórico que não casa) não há sorteio nenhum a mais', () => {
    const c = depoisDoClp(true);
    c.g.p1.historicoCombo = [{ golpe: 'lk', atk: c.g.p1.atkId }]; // nenhum combo do HAYATO começa com lk > ...
    const ligada = contador(0.99);
    cpuInput(c.g.p1, c.g.p2, c.g, ligada.rng);
    const d = depoisDoClp(false);
    const desligada = contador(0.99);
    cpuInput(d.g.p1, d.g.p2, d.g, desligada.rng);
    expect(ligada.chamadas()).toBe(desligada.chamadas());
  });
});

describe('aceite no harness: a CPU DIFÍCIL usa combos próprios', () => {
  it('em média >= 1 combo próprio completo por luta (soma dos dois lados) em 40 lutas DIFÍCIL x DIFÍCIL; NORMAL praticamente não usa', () => {
    const pares = 'hayato:caio,wei-long:min-ji,aminu:centella,camille:nila,baatar:zenon,caio:hayato,min-ji:aminu,centella:camille,nila:baatar,zenon:wei-long';
    const dificeis = montarTarefas(ROSTER, null, { sementes: 4, niveis: [2], base: 1, filtro: pares, incluirChefe: false, combos: true });
    expect(dificeis).toHaveLength(40);
    const total = dificeis.reduce((s, t) => {
      const r = lutar(elenco, t);
      return s + (r.combosProprios?.[0] ?? 0) + (r.combosProprios?.[1] ?? 0);
    }, 0);
    expect(total / dificeis.length).toBeGreaterThanOrEqual(1);
  }, 120_000);
});

describe('o harness (`--motor-v2 combos`)', () => {
  const PARAMS = { sementes: 1, niveis: [2], base: 1, filtro: 'hayato:caio', incluirChefe: false } as const;

  it('com a flag o Registro traz `combosProprios` e a luta é determinística; sem ela a chave NÃO existe (o hash de antes não muda)', () => {
    const [t] = montarTarefas(ROSTER, null, { ...PARAMS, combos: true });
    expect(t?.combos).toBe(true);
    const a = lutar(elenco, t as NonNullable<typeof t>);
    const b = lutar(elenco, t as NonNullable<typeof t>);
    expect(a.combosProprios).toBeDefined();
    expect(a).toEqual(b);
    const [s] = montarTarefas(ROSTER, null, PARAMS);
    expect('combos' in (s as object)).toBe(false);
    expect('combosProprios' in lutar(elenco, s as NonNullable<typeof s>)).toBe(false);
  });
});
