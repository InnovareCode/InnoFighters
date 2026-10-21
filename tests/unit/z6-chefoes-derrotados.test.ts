import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CHAVE_STORAGE_V2, CONFIGURACOES_PADRAO, IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import {
  carregarDadosV2,
  salvarDadosV2,
  type ArmazenamentoLike,
  type DadosSalvosV2,
} from '../../src/core/storage';
import {
  CHEFE_LEGADO,
  CHEFOES_SO_POR_DERROTA,
  FILA_DESBLOQUEIO,
  INICIAIS,
  MAX_CHEFES_DERROTADOS,
  REGRAS_PADRAO,
  aplicarVitoriaArcade,
  chefesDerrotadosDe,
  derrotouOChefe,
  liberados,
  marcarVistos,
  montarEscada,
  proximoDaFila,
  progressoVazio,
  sanearProgresso,
  type Progresso,
  type Regras,
} from '../../src/meta';
import { criarRng } from '../../src/core/rng';

/*
 * Z6 (spec do chefao Zenon, §11): QUAL chefao foi derrotado, migracao do `chefeDerrotado` booleano, desbloqueio do
 * novo chefao, ida e volta com rollback. 'zenon' NAO esta em IDS_LUTADORES (flip so na Z5, achado A7): aqui ele e um
 * id de fixtura, com cast, em regras proprias — nada disto depende do roster real ganhar o id.
 */

const id = (s: string): IdLutador => s as IdLutador;
const ZENON = id('zenon');
const [AMINU, CENTELLA, CAMILLE, NILA, BAATAR] = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const;

/** O roster de hoje (9) e o de 10 (com o Zenon), como a Z5 deixara. */
const ROSTER9: readonly IdLutador[] = IDS_LUTADORES;
const ROSTER10: readonly IdLutador[] = [...IDS_LUTADORES, ZENON];
const R9: Pick<Regras, 'roster' | 'iniciais'> = { roster: ROSTER9, iniciais: INICIAIS };
const R10: Regras = { ...REGRAS_PADRAO, roster: ROSTER10, chefe: ZENON }; // fila = a real (5, com o BAATAR)

const prog = (p: Partial<Progresso> = {}): Progresso => ({ ...progressoVazio(), ...p });

// ---------------------------------------------------------------------------
// Armazenamento falso + o "build antigo" (anterior a Z6) para o rollback
// ---------------------------------------------------------------------------

type Falso = ArmazenamentoLike & { dados: Map<string, string> };
function falso(inicial: Record<string, string> = {}): Falso {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
}
const cru = (st: Falso): Record<string, unknown> => JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string) as Record<string, unknown>;
const progCru = (st: Falso): Record<string, unknown> => cru(st)['prog'] as Record<string, unknown>;
const v2 = (p: unknown, hi = 10) => JSON.stringify({ v: 2, s: {}, hi, prog: p });

/**
 * O saneamento do build ANTERIOR a Z6 (E2 + rollback): so conhece os 4 campos + `desconhecidos`, e reescreve
 * o progresso so com eles. Copia fiel da logica antiga, para provar o que acontece quando ele regrava o save.
 */
function salvarComBuildAntigo(st: Falso, roster: readonly string[]): void {
  const o = cru(st);
  const p = o['prog'] as Record<string, unknown>;
  const strs = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : []);
  const inic = new Set<string>(INICIAIS);
  const desb: string[] = [];
  const desc: string[] = [];
  for (const item of [...strs(p['desbloqueados']), ...strs(p['desconhecidos'])]) {
    if (inic.has(item)) continue;
    if (roster.includes(item)) {
      if (!desb.includes(item)) desb.push(item);
    } else if (/^[a-z0-9][a-z0-9-]{0,31}$/.test(item) && desc.length < 32 && !desc.includes(item)) desc.push(item);
  }
  const antigo = {
    desbloqueados: desb,
    zeradas: p['zeradas'],
    chefeDerrotado: p['chefeDerrotado'] === true,
    vistos: strs(p['vistos']).filter((x) => desb.includes(x)),
    ...(desc.length > 0 ? { desconhecidos: desc } : {}),
  };
  st.dados.set(CHAVE_STORAGE_V2, JSON.stringify({ v: 2, s: o['s'], hi: o['hi'], prog: antigo }));
}

// ---------------------------------------------------------------------------
// §11.2 - quem ja derrotou o BAATAR (nada se perde)
// ---------------------------------------------------------------------------

describe('Z6 §11.2: o BAATAR virou o 5o da fila e o Zenon e o chefao', () => {
  it('a fila das regras padrao ja e AMINU, CENTELLA, CAMILLE, NILA, BAATAR', () => {
    expect([...FILA_DESBLOQUEIO]).toEqual([AMINU, CENTELLA, CAMILLE, NILA, BAATAR]);
  });

  it('caso 1: baatar ja liberado (derrotou o chefe) -> continua jogavel; a fila pula o BAATAR e termina na NILA', () => {
    const antigo = prog({ desbloqueados: [AMINU, BAATAR, CENTELLA, CAMILLE, NILA], zeradas: 4, chefeDerrotado: true });
    const p = sanearProgresso(antigo, R10);
    expect(liberados(p, R10).has(BAATAR)).toBe(true);
    expect(p.desbloqueados).toEqual([AMINU, BAATAR, CENTELLA, CAMILLE, NILA]); // nada se perde
    expect(proximoDaFila(p, R10)).toBeUndefined(); // nao ha 5a vaga: o BAATAR ja era dele
    const r = aplicarVitoriaArcade(p, { derrotouChefe: false }, R10);
    expect(r.novos).toEqual([]); // proxima zerada sem chefe nao libera ninguem
    expect(r.prog.desbloqueados).toEqual(p.desbloqueados);
    expect(r.prog.zeradas).toBe(5);
  });

  it('caso 1b: a fila pula quem ja esta liberado mesmo no meio (BAATAR ganho antes da CAMILLE)', () => {
    const p = prog({ desbloqueados: [AMINU, BAATAR], zeradas: 1 });
    expect(proximoDaFila(p, R10)).toBe(CENTELLA);
    const r = aplicarVitoriaArcade(p, { derrotouChefe: false }, R10);
    expect(r.novos).toEqual([CENTELLA]);
  });

  it('caso 2: zeradas >= 4 sem o BAATAR -> a proxima zerada libera o BAATAR (5o)', () => {
    const p = prog({ desbloqueados: [AMINU, CENTELLA, CAMILLE, NILA], zeradas: 4 });
    expect(proximoDaFila(p, R10)).toBe(BAATAR);
    const r = aplicarVitoriaArcade(p, { derrotouChefe: false }, R10);
    expect(r.novos).toEqual([BAATAR]);
    expect(r.prog.desbloqueados).toEqual([AMINU, CENTELLA, CAMILLE, NILA, BAATAR]);
    expect(r.prog.chefeDerrotado).toBe(false); // ganhar o BAATAR pela fila NAO e derrotar chefe
    expect(r.prog.chefesDerrotados).toBeUndefined();
  });

  it('caso 3: chefeDerrotado:true antigo vira chefesDerrotados [baatar] e nao concede o Zenon de graca', () => {
    const p = sanearProgresso({ desbloqueados: [AMINU, BAATAR], zeradas: 1, chefeDerrotado: true, vistos: [] }, R10);
    expect(p.chefesDerrotados).toEqual([BAATAR]);
    expect(p.chefeDerrotado).toBe(true);
    expect(liberados(p, R10).has(ZENON)).toBe(false);
    expect(p.desbloqueados).not.toContain(ZENON);
    expect(derrotouOChefe(p, 'zenon')).toBe(false);
  });

  it('caso 4: derrotar o Zenon com a fila esgotada libera SO o Zenon, e a lista fica [baatar, zenon]', () => {
    const esgotada = sanearProgresso(
      { desbloqueados: [AMINU, CENTELLA, CAMILLE, NILA, BAATAR], zeradas: 5, chefeDerrotado: true },
      R10,
    );
    const r = aplicarVitoriaArcade(esgotada, { derrotouChefe: true }, R10);
    expect(r.novos).toEqual([ZENON]);
    expect(r.prog.desbloqueados).toEqual([AMINU, CENTELLA, CAMILLE, NILA, BAATAR, ZENON]);
    expect(r.prog.chefesDerrotados).toEqual([BAATAR, 'zenon']);
    expect(r.prog.zeradas).toBe(6);
  });

  it('caso 4b: 1a zerada derrotando o Zenon libera a fila[0] E o Zenon, nessa ordem; a seguinte nao repete', () => {
    const r1 = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, R10);
    expect(r1.novos).toEqual([AMINU, ZENON]);
    expect(r1.prog.chefesDerrotados).toEqual(['zenon']);
    const r2 = aplicarVitoriaArcade(r1.prog, { derrotouChefe: true }, R10);
    expect(r2.novos).toEqual([CENTELLA]);
    expect(r2.prog.chefesDerrotados).toEqual(['zenon']); // sem repetir
  });

  it('caso 5: jogando COM o Zenon nao ha luta de chefe (ED7): a zerada so avanca a fila e nao marca derrota', () => {
    const e = montarEscada({ c1: ZENON, prog: prog({ desbloqueados: [ZENON] }), rng: criarRng(3), regras: R10 });
    expect(e.some((x) => x.chefe || x.id === ZENON)).toBe(false);
    const r = aplicarVitoriaArcade(prog({ desbloqueados: [ZENON] }), { derrotouChefe: false }, R10);
    expect(r.novos).toEqual([AMINU]);
    expect(r.prog.chefeDerrotado).toBe(false);
    expect(r.prog.chefesDerrotados).toBeUndefined();
  });

  it('sem chefao nas regras (estado de hoje: CHEFE null) derrotouChefe nao inventa derrota nem desbloqueio', () => {
    expect(REGRAS_PADRAO.chefe).toBeNull();
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, REGRAS_PADRAO);
    expect(r.novos).toEqual([AMINU]);
    expect(r.prog.chefeDerrotado).toBe(false);
    expect(r.prog.chefesDerrotados).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// chefesDerrotados: saneamento
// ---------------------------------------------------------------------------

describe('Z6: sanearProgresso - chefesDerrotados', () => {
  it('quem nunca derrotou chefao: o campo fica AUSENTE (formato em disco identico ao anterior)', () => {
    const p = sanearProgresso({ desbloqueados: [AMINU], zeradas: 1 }, R10);
    expect(Object.keys(p).sort()).toEqual(['chefeDerrotado', 'desbloqueados', 'vistos', 'zeradas']);
    expect(p.chefeDerrotado).toBe(false);
  });

  it('save antigo com booleano true estrito e sem lista -> [baatar]', () => {
    expect(sanearProgresso({ chefeDerrotado: true }, R10).chefesDerrotados).toEqual([CHEFE_LEGADO]);
    expect(CHEFE_LEGADO).toBe('baatar');
  });

  it.each([['true'], [1], ['sim'], [null], [{}], [[]]])('so o booleano true ESTRITO conta como legado (%j)', (v) => {
    const p = sanearProgresso({ chefeDerrotado: v }, R10);
    expect(p.chefeDerrotado).toBe(false);
    expect(p.chefesDerrotados).toBeUndefined();
  });

  it('a lista manda sobre o booleano: nao inventa o baatar quando a lista ja diz qual chefao foi', () => {
    const p = sanearProgresso({ chefeDerrotado: true, chefesDerrotados: ['outro-chefe'] }, R10);
    expect(p.chefesDerrotados).toEqual(['outro-chefe']);
  });

  it('lista vazia + booleano true cai no legado; lista com itens + booleano false -> chefeDerrotado derivado = true', () => {
    expect(sanearProgresso({ chefeDerrotado: true, chefesDerrotados: [] }, R10).chefesDerrotados).toEqual(['baatar']);
    const p = sanearProgresso({ chefeDerrotado: false, chefesDerrotados: ['zenon'] }, R10);
    expect(p.chefeDerrotado).toBe(true); // os dois campos nunca discordam
    expect(p.chefesDerrotados).toEqual(['zenon']);
  });

  it('aceita id fora do roster (o chefao de onda futura ainda nao existe) - roster de hoje e de 10', () => {
    for (const roster of [ROSTER9, ROSTER10]) {
      const p = sanearProgresso({ chefesDerrotados: ['zenon'] }, { ...R10, roster });
      expect(p.chefesDerrotados).toEqual(['zenon']);
    }
  });

  it('descarta lixo: nao-string, forma invalida, repetidos; mantem a ordem', () => {
    const p = sanearProgresso(
      { chefesDerrotados: ['baatar', 7, null, {}, 'baatar', 'ZENON', 'com espaco', '__proto__', '', 'x'.repeat(33), 'zenon'] },
      R10,
    );
    expect(p.chefesDerrotados).toEqual(['baatar', 'zenon']);
  });

  it.each([['texto'], [42], [{ 0: 'zenon' }], [null], [true]])('lista que nao e lista (%j) vira vazia', (v) => {
    const p = sanearProgresso({ chefesDerrotados: v }, R10);
    expect(p.chefesDerrotados).toBeUndefined();
    expect(p.chefeDerrotado).toBe(false);
  });

  it(`limita a ${MAX_CHEFES_DERROTADOS} entradas (mantem as primeiras)`, () => {
    const muitos = Array.from({ length: 50 }, (_, i) => `chefe-${i}`);
    const p = sanearProgresso({ chefesDerrotados: muitos }, R10);
    expect(p.chefesDerrotados).toHaveLength(MAX_CHEFES_DERROTADOS);
    expect(p.chefesDerrotados).toEqual(muitos.slice(0, MAX_CHEFES_DERROTADOS));
  });

  it('o Zenon desbloqueado prova a derrota (recompoe a lista que um rollback apagou) - em desbloqueados e em desconhecidos', () => {
    expect(CHEFOES_SO_POR_DERROTA).toContain('zenon');
    const a = sanearProgresso({ desbloqueados: [AMINU, 'zenon'] }, { ...R10 });
    expect(a.chefesDerrotados).toEqual(['zenon']);
    expect(a.chefeDerrotado).toBe(true);
    const b = sanearProgresso({ desbloqueados: [AMINU], desconhecidos: ['zenon'] }, R9);
    expect(b.desconhecidos).toEqual(['zenon']);
    expect(b.desbloqueados).toEqual([AMINU]);
    expect(b.chefesDerrotados).toEqual(['zenon']);
  });

  it('ter o BAATAR NAO prova derrota (ele tambem sai da fila)', () => {
    const p = sanearProgresso({ desbloqueados: [BAATAR] }, R10);
    expect(p.chefesDerrotados).toBeUndefined();
    expect(p.chefeDerrotado).toBe(false);
  });

  it('e idempotente e nao muta a entrada', () => {
    const sujos: unknown[] = [
      { chefeDerrotado: true },
      { chefesDerrotados: ['zenon', 'zenon', 3], chefeDerrotado: 'x' },
      { desbloqueados: ['zenon', 'aminu'], desconhecidos: ['zenon'], chefeDerrotado: true },
      { chefesDerrotados: Array.from({ length: 40 }, (_, i) => `c-${i}`) },
    ];
    for (const sujo of sujos) {
      const copia = structuredClone(sujo);
      const uma = sanearProgresso(sujo, R10);
      expect(sujo).toEqual(copia);
      expect(sanearProgresso(uma, R10)).toEqual(uma);
    }
  });
});

describe('Z6: aplicarVitoriaArcade / marcarVistos / helpers com a lista', () => {
  it('prog montado a mao com so o booleano legado ainda soma o chefao novo a [baatar]', () => {
    const r = aplicarVitoriaArcade(prog({ chefeDerrotado: true, desbloqueados: [AMINU, BAATAR] }), { derrotouChefe: true }, R10);
    expect(r.prog.chefesDerrotados).toEqual([BAATAR, 'zenon']);
    expect(chefesDerrotadosDe(prog({ chefeDerrotado: true }))).toEqual(['baatar']);
    expect(chefesDerrotadosDe(progressoVazio())).toEqual([]);
  });

  it('e pura: nao muta a lista da entrada e devolve array novo', () => {
    const entrada = prog({ chefeDerrotado: true, chefesDerrotados: [BAATAR] });
    const copia = structuredClone(entrada);
    const r = aplicarVitoriaArcade(entrada, { derrotouChefe: true }, R10);
    expect(entrada).toEqual(copia);
    expect(r.prog.chefesDerrotados).not.toBe(entrada.chefesDerrotados);
    expect(r.prog.chefesDerrotados).toEqual([BAATAR, 'zenon']);
  });

  it('chefao ja derrotado e ja liberado: derrotar de novo nao duplica nada', () => {
    const p = prog({ desbloqueados: [ZENON], chefeDerrotado: true, chefesDerrotados: ['zenon'] });
    const r = aplicarVitoriaArcade(p, { derrotouChefe: true }, R10);
    expect(r.prog.chefesDerrotados).toEqual(['zenon']);
    expect(r.prog.desbloqueados.filter((x) => x === ZENON)).toHaveLength(1);
  });

  it('o desconhecidos sobrevive junto da lista', () => {
    const r = aplicarVitoriaArcade(prog({ desconhecidos: ['futuro'], chefesDerrotados: ['zenon'], chefeDerrotado: true }), { derrotouChefe: false }, R10);
    expect(r.prog.desconhecidos).toEqual(['futuro']);
    expect(r.prog.chefesDerrotados).toEqual(['zenon']);
  });

  it('marcarVistos preserva chefesDerrotados', () => {
    const p = marcarVistos(prog({ desbloqueados: [AMINU], chefeDerrotado: true, chefesDerrotados: [BAATAR] }), [AMINU]);
    expect(p.chefesDerrotados).toEqual([BAATAR]);
    expect(p.vistos).toEqual([AMINU]);
  });
});

// ---------------------------------------------------------------------------
// §11.3 - ids novos, ida e volta, rollback (storage)
// ---------------------------------------------------------------------------

describe("Z6 §11.3: 'zenon' passa pela regex de desconhecidos (build antigo preserva, build novo recupera)", () => {
  it("roster de hoje: {desbloqueados:['baatar','zenon']} -> zenon em desconhecidos; roster de 10: promovido de volta", () => {
    const salvo = { desbloqueados: [BAATAR, 'zenon'], zeradas: 5, vistos: [BAATAR] };
    const hoje = sanearProgresso(salvo, R9);
    expect(hoje.desbloqueados).toEqual([BAATAR]);
    expect(hoje.desconhecidos).toEqual(['zenon']);
    // gravou e voltou a ler no build novo
    const ida = sanearProgresso(hoje, { ...R10 });
    expect(ida.desbloqueados).toEqual([BAATAR, 'zenon']);
    expect(ida.desconhecidos).toBeUndefined();
  });

  it('o id nunca afeta a UI enquanto desconhecido: nao esta em liberados nem na fila', () => {
    const p = sanearProgresso({ desbloqueados: ['zenon'] }, R9);
    expect(liberados(p, REGRAS_PADRAO).has(ZENON)).toBe(false);
    expect(proximoDaFila(p, REGRAS_PADRAO)).toBe(AMINU);
  });
});

describe('Z6: v2 -> v2 estendida (sem bump de versao) em disco', () => {
  const base = (p: Progresso): DadosSalvosV2 => ({ s: { ...CONFIGURACOES_PADRAO }, hi: 500, prog: p });

  it('v2 antiga com chefeDerrotado:true e sem lista: carregar migra em memoria; o disco so muda no proximo save', () => {
    const antigo = v2({ desbloqueados: [AMINU, BAATAR], zeradas: 1, chefeDerrotado: true, vistos: [AMINU] });
    const st = falso({ [CHAVE_STORAGE_V2]: antigo });
    const r = carregarDadosV2(st, R10);
    expect(r.prog.chefesDerrotados).toEqual(['baatar']);
    expect(r.prog.desbloqueados).toEqual([AMINU, BAATAR]); // o desbloqueio do BAATAR intacto
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(antigo); // carregar nao reescreve (idempotente)
    expect(carregarDadosV2(st, R10)).toEqual(r);

    expect(salvarDadosV2(st, r, R10)).toBe(true);
    expect(cru(st)['v']).toBe(2); // sem bump
    expect(progCru(st)).toMatchObject({ chefeDerrotado: true, chefesDerrotados: ['baatar'], desbloqueados: [AMINU, BAATAR] });
    expect(carregarDadosV2(st, R10)).toEqual(r);
  });

  it('quem nunca derrotou chefao: o disco continua com exatamente as 4 chaves do formato anterior', () => {
    const st = falso();
    salvarDadosV2(st, base(prog({ desbloqueados: [AMINU], zeradas: 1 })), R10);
    expect(Object.keys(progCru(st)).sort()).toEqual(['chefeDerrotado', 'desbloqueados', 'vistos', 'zeradas']);
  });

  it('gravacao sanea: lixo em chefesDerrotados nunca chega ao disco', () => {
    const st = falso();
    const sujo = { ...progressoVazio(), chefesDerrotados: ['zenon', 'zenon', 9, '__proto__', 'ZENON', ...Array.from({ length: 30 }, (_, i) => `c-${i}`)] };
    salvarDadosV2(st, base(sujo as unknown as Progresso), R10);
    const lista = progCru(st)['chefesDerrotados'] as string[];
    expect(lista).toHaveLength(MAX_CHEFES_DERROTADOS);
    expect(lista[0]).toBe('zenon');
    expect(lista.every((x) => /^[a-z0-9][a-z0-9-]{0,31}$/.test(x))).toBe(true);
    expect(new Set(lista).size).toBe(lista.length);
    expect(progCru(st)['chefeDerrotado']).toBe(true);
  });

  it('leitura sanea: lista adulterada no disco (tipos errados) nao quebra e vira o que e valido', () => {
    for (const lixo of ['zenon', 5, { a: 1 }, [1, 2], null, [['zenon']]]) {
      const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [], zeradas: 0, chefeDerrotado: false, vistos: [], chefesDerrotados: lixo }) });
      const r = carregarDadosV2(st, R10);
      expect(r.prog.chefesDerrotados).toBeUndefined();
      expect(r.prog.chefeDerrotado).toBe(false);
    }
  });

  it('v2 FUTURA (v > 2) com chefesDerrotados fica byte a byte; carregar + salvar nao a tocam', () => {
    const futura = JSON.stringify({
      v: 3,
      s: { rounds: 3 },
      hi: 77,
      prog: { desbloqueados: ['zenon'], zeradas: 9, chefeDerrotado: true, chefesDerrotados: ['baatar', 'zenon'], vistos: [], novo: 1 },
      campoNovo: { x: 1 },
    });
    const st = falso({ [CHAVE_STORAGE_V2]: futura });
    const r = carregarDadosV2(st, R10);
    expect(salvarDadosV2(st, r, R10)).toBe(false);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(futura);
  });
});

describe('Z6: ida e volta com rollback (build novo -> build antigo -> build novo)', () => {
  /** Jogador no build novo derrota o Zenon (e ja tinha derrotado o BAATAR como chefe na epoca antiga). */
  function jogadorQueDerrotouOZenon(): Falso {
    const st = falso({
      [CHAVE_STORAGE_V2]: v2({
        desbloqueados: [AMINU, BAATAR, CENTELLA, CAMILLE, NILA],
        zeradas: 5,
        chefeDerrotado: true,
        vistos: [AMINU, BAATAR],
      }),
    });
    const dados = carregarDadosV2(st, R10);
    const r = aplicarVitoriaArcade(dados.prog, { derrotouChefe: true }, R10);
    expect(r.novos).toEqual([ZENON]);
    expect(salvarDadosV2(st, { ...dados, prog: r.prog }, R10)).toBe(true);
    return st;
  }

  it('estado salvo no build novo: Zenon liberado, baatar mantido, lista [baatar, zenon]', () => {
    const st = jogadorQueDerrotouOZenon();
    expect(progCru(st)).toMatchObject({
      desbloqueados: [AMINU, BAATAR, CENTELLA, CAMILLE, NILA, 'zenon'],
      chefeDerrotado: true,
      chefesDerrotados: ['baatar', 'zenon'],
    });
  });

  it('(a) rollback para um build COM esta mudanca mas SEM o Zenon no roster: ganho e lista preservados; reavanco promove', () => {
    const st = jogadorQueDerrotouOZenon();
    const hoje = carregarDadosV2(st, R9);
    expect(hoje.prog.desbloqueados).toEqual([AMINU, BAATAR, CENTELLA, CAMILLE, NILA]); // o Zenon nao aparece
    expect(hoje.prog.desconhecidos).toEqual(['zenon']);
    expect(hoje.prog.chefesDerrotados).toEqual(['baatar', 'zenon']);
    expect(salvarDadosV2(st, { ...hoje, hi: hoje.hi + 1 }, R9)).toBe(true); // o build jogou e gravou

    const volta = carregarDadosV2(st, R10);
    expect(volta.prog.desbloqueados).toEqual([AMINU, BAATAR, CENTELLA, CAMILLE, NILA, 'zenon']);
    expect(volta.prog.desconhecidos).toBeUndefined();
    expect(volta.prog.chefesDerrotados).toEqual(['baatar', 'zenon']);
    expect(liberados(volta.prog, R10).has(ZENON)).toBe(true);
  });

  it('(b) rollback para o build ANTERIOR a Z6 (ignora a lista): o desbloqueio e o booleano sobrevivem; o reavanco recompoe a lista', () => {
    const st = jogadorQueDerrotouOZenon();
    salvarComBuildAntigo(st, ROSTER9);
    // o que o build antigo deixou no disco: sem a lista, com o Zenon guardado como desconhecido
    expect(progCru(st)['chefesDerrotados']).toBeUndefined();
    expect(progCru(st)).toMatchObject({ chefeDerrotado: true, desconhecidos: ['zenon'] });

    const volta = carregarDadosV2(st, R10);
    expect(volta.prog.desbloqueados).toEqual([AMINU, BAATAR, CENTELLA, CAMILLE, NILA, 'zenon']);
    expect([...(volta.prog.chefesDerrotados ?? [])].sort()).toEqual(['baatar', 'zenon']);
    expect(volta.prog.chefeDerrotado).toBe(true);
    expect(volta.prog.zeradas).toBe(6);
  });

  it('(b2) o jogador que so derrotou o BAATAR (nunca viu o Zenon) atravessa build antigo e volta com [baatar]', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [AMINU, BAATAR], zeradas: 1, chefeDerrotado: true, vistos: [] }) });
    const novo = carregarDadosV2(st, R10);
    salvarDadosV2(st, novo, R10);
    salvarComBuildAntigo(st, ROSTER9);
    const volta = carregarDadosV2(st, R10);
    expect(volta.prog.chefesDerrotados).toEqual(['baatar']);
    expect(volta.prog.desbloqueados).toEqual([AMINU, BAATAR]);
  });

  it('rollback para o build da v1 (outra chave): a v2 com a lista fica intacta byte a byte', () => {
    const st = jogadorQueDerrotouOZenon();
    const antes = st.dados.get(CHAVE_STORAGE_V2);
    st.setItem('inno-fighters-v1', JSON.stringify({ v: 1, s: {}, hi: 3 }));
    // o build v1 le/grava so a chave dele; nada dele toca a v2
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(antes);
    const volta = carregarDadosV2(st, R10);
    expect(volta.prog.chefesDerrotados).toEqual(['baatar', 'zenon']);
  });

  it('ida e volta e estavel: salvar -> carregar -> salvar produz o mesmo JSON', () => {
    const st = jogadorQueDerrotouOZenon();
    const um = st.dados.get(CHAVE_STORAGE_V2);
    const r = carregarDadosV2(st, R10);
    salvarDadosV2(st, r, R10);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(um);
  });
});

// ---------------------------------------------------------------------------
// Teste de arquitetura: o booleano legado nao decide nada
// ---------------------------------------------------------------------------

describe('Z6: arquitetura - nada de jogo/UI le o chefeDerrotado legado', () => {
  const SRC = fileURLToPath(new URL('../../src/', import.meta.url));
  const ARQUIVOS_PERMITIDOS = ['meta/tipos.ts', 'meta/progresso.ts'];

  function listar(dir: string): string[] {
    return readdirSync(dir).flatMap((nome) => {
      const caminho = join(dir, nome);
      return statSync(caminho).isDirectory() ? listar(caminho) : /\.(ts|tsx|js|mjs)$/.test(nome) ? [caminho] : [];
    });
  }
  const LEGADO = /\bchefeDerrotado\b/;

  /** Arquivos de src/ (relativos, com /) que citam o campo legado fora dos dois donos dele. */
  function leitoresDoLegado(arquivos: Record<string, string>): string[] {
    return Object.entries(arquivos)
      .filter(([rel]) => !ARQUIVOS_PERMITIDOS.includes(rel) && LEGADO.test(arquivo(rel, arquivos)))
      .map(([rel]) => rel);
  }
  const arquivo = (rel: string, todos: Record<string, string>): string => todos[rel] ?? '';

  const todos: Record<string, string> = Object.fromEntries(
    listar(SRC).map((f) => [relative(SRC, f).split(sep).join('/'), readFileSync(f, 'utf8')]),
  );

  it('a varredura enxerga o codigo (nao pode ficar vazia) incluindo src/ui e src/core/storage.ts', () => {
    const nomes = Object.keys(todos);
    expect(nomes.length).toBeGreaterThan(30);
    expect(nomes.some((n) => n.startsWith('ui/'))).toBe(true);
    expect(nomes).toContain('core/storage.ts');
    expect(nomes).toContain('meta/progresso.ts');
  });

  it('so meta/tipos.ts e meta/progresso.ts mencionam chefeDerrotado; src/ui e o resto de src nao', () => {
    expect(leitoresDoLegado(todos)).toEqual([]);
    expect(LEGADO.test(todos['meta/tipos.ts'] ?? '')).toBe(true); // o contrato ainda o documenta
  });

  it('o detector funciona: um arquivo de UI que leia prog.chefeDerrotado seria apontado (e chefesDerrotados nao confunde)', () => {
    const falsa = { ...todos, 'ui/cenas/x.ts': 'if (prog.chefeDerrotado) mostrar();' };
    expect(leitoresDoLegado(falsa)).toEqual(['ui/cenas/x.ts']);
    expect(leitoresDoLegado({ 'ui/cenas/y.ts': 'prog.chefesDerrotados?.includes(id)' })).toEqual([]);
  });
});
