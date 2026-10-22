import { describe, expect, it } from 'vitest';
import { CHAVE_STORAGE_V2, IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { carregarDadosV2, salvarDadosV2, type ArmazenamentoLike } from '../../src/core/storage';
import {
  CHEFOES_SO_POR_DERROTA,
  FILA_DESBLOQUEIO,
  INICIAIS,
  MAX_CHEFES_DERROTADOS,
  REGRAS_PADRAO,
  aplicarVitoriaArcade,
  chefeDoArcade,
  chefesDerrotadosDe,
  desafiantesDoChefe,
  ehChefeFinal,
  liberados,
  montarEscada,
  progressoVazio,
  sanearProgresso,
  type Progresso,
  type Regras,
  type ResultadoVitoria,
  type VitoriaArcade,
} from '../../src/meta';
import { montarEscada as montarEscadaAntiga } from '../fixtures/escada-ac57a80';
import {
  aplicarVitoriaArcade as aplicarVitoriaAntiga,
  sanearProgresso as sanearAntigo,
} from '../fixtures/progresso-ac57a80';

/*
 * P1 (docs/spec-chefoes-progressivos-temas-e-dificuldade.md, 1): o chefao do ARCADE e o primeiro da fila ainda bloqueado; com
 * os 9 liberados, o ZENON. Tudo derivado de `desbloqueados` — nenhum campo novo no save, nenhuma migracao.
 *
 * Estrutura: (1) a matriz S1-S11 da spec, (2) o espaco INTEIRO de estados (2^5 subconjuntos da fila x ZENON liberado = 64) x
 * lutador escolhido, (3) a campanha de ponta a ponta, (4) a chave desligada = HEAD ac57a80, (5) rollback contra o saneamento
 * do HEAD, (6) MUTACAO: implementacoes erradas das regras de escolha, que o mesmo verificador tem de reprovar.
 */

const ZENON: IdLutador = 'zenon';
const [AMINU, CENTELLA, CAMILLE, NILA, BAATAR] = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const;
const [HAYATO, WEI_LONG, MIN_JI, CAIO] = ['hayato', 'wei-long', 'min-ji', 'caio'] as const;
const FILA = [...FILA_DESBLOQUEIO];
const ROSTER = [...IDS_LUTADORES];

/** A regra NOVA ligada, sobre o elenco real. (O padrao so vira `true` junto com a L1.) */
const NOVA: Regras = { ...REGRAS_PADRAO, chefesDaFila: true };
const ANTIGA: Regras = { ...REGRAS_PADRAO, chefesDaFila: false };

const comoSave = (desbloqueados: readonly string[], extra: Record<string, unknown> = {}): Progresso =>
  sanearProgresso({ desbloqueados, zeradas: desbloqueados.length, vistos: [], ...extra }, NOVA);

// ---------------------------------------------------------------------------
// O espaco de estados: 2^5 subconjuntos da fila x ZENON liberado ou nao
// ---------------------------------------------------------------------------

type Estado = { rotulo: string; prog: Progresso };
const ESTADOS: Estado[] = [];
for (let mascara = 0; mascara < 1 << FILA.length; mascara++) {
  for (const comZenon of [false, true]) {
    const ids: string[] = FILA.filter((_, i) => (mascara & (1 << i)) !== 0);
    if (comZenon) ids.push(ZENON);
    ESTADOS.push({ rotulo: `[${ids.join(',')}]`, prog: comoSave(ids) });
  }
}
const liberadosDe = (prog: Progresso): IdLutador[] => ROSTER.filter((id) => liberados(prog, NOVA).has(id));

describe('P1: o espaco de estados tem 64 saves', () => {
  it('2^5 subconjuntos da fila x ZENON liberado ou nao, todos distintos', () => {
    expect(ESTADOS).toHaveLength(64);
    expect(new Set(ESTADOS.map((e) => e.rotulo)).size).toBe(64);
  });
});

// ---------------------------------------------------------------------------
// (1) Matriz S1-S11
// ---------------------------------------------------------------------------

type Linha = {
  nome: string;
  save: Record<string, unknown>;
  c1: IdLutador | readonly IdLutador[];
  chefe: IdLutador | null;
  /** Depois da vitoria (com o chefe da vez): */
  desbloqueados: string[];
  novos: IdLutador[];
  derrotados: string[] | undefined;
  zeradas: number;
  /** Quem seria o chefao DEPOIS da vitoria (o proximo). */
  seguinte?: IdLutador | null;
};

const MATRIZ: Linha[] = [
  {
    nome: 'S1: save vazio -> AMINU',
    save: { desbloqueados: [], zeradas: 0 },
    c1: HAYATO,
    chefe: AMINU,
    desbloqueados: [AMINU],
    novos: [AMINU],
    derrotados: [AMINU],
    zeradas: 1,
    seguinte: CENTELLA,
  },
  {
    nome: 'S2: [aminu, centella, camille] -> NILA',
    save: { desbloqueados: [AMINU, CENTELLA, CAMILLE], zeradas: 3 },
    c1: AMINU,
    chefe: NILA,
    desbloqueados: [AMINU, CENTELLA, CAMILLE, NILA],
    novos: [NILA],
    derrotados: [NILA],
    zeradas: 4,
    seguinte: BAATAR,
  },
  {
    nome: 'S3: os 5 da fila, ZENON bloqueado -> ZENON, de qualquer lutador',
    save: { desbloqueados: FILA, zeradas: 5 },
    c1: [HAYATO, WEI_LONG, MIN_JI, CAIO, ...FILA],
    chefe: ZENON,
    desbloqueados: [...FILA, ZENON],
    novos: [ZENON],
    derrotados: [ZENON],
    zeradas: 6,
    seguinte: ZENON,
  },
  {
    nome: 'S4: regra velha [aminu, zenon], chefesDerrotados [zenon], caio -> CENTELLA; o ZENON continua jogavel',
    save: { desbloqueados: [AMINU, ZENON], zeradas: 1, chefeDerrotado: true, chefesDerrotados: [ZENON] },
    c1: CAIO,
    chefe: CENTELLA,
    desbloqueados: [AMINU, ZENON, CENTELLA],
    novos: [CENTELLA],
    derrotados: [ZENON, CENTELLA],
    zeradas: 2,
    seguinte: CAMILLE,
  },
  {
    nome: 'S5: igual a S4 jogando de ZENON -> CENTELLA (o ZENON jogavel nao impede o guardiao)',
    save: { desbloqueados: [AMINU, ZENON], zeradas: 1, chefeDerrotado: true, chefesDerrotados: [ZENON] },
    c1: ZENON,
    chefe: CENTELLA,
    desbloqueados: [AMINU, ZENON, CENTELLA],
    novos: [CENTELLA],
    derrotados: [ZENON, CENTELLA],
    zeradas: 2,
    seguinte: CAMILLE,
  },
  {
    nome: 'S6: os 9 + ZENON, hayato -> ZENON (revanche): novos vazio, so conta a zerada',
    save: { desbloqueados: [...FILA, ZENON], zeradas: 6, chefeDerrotado: true, chefesDerrotados: [ZENON] },
    c1: HAYATO,
    chefe: ZENON,
    desbloqueados: [...FILA, ZENON],
    novos: [],
    derrotados: [ZENON],
    zeradas: 7,
    seguinte: ZENON,
  },
  {
    nome: 'S7: os 9 + ZENON, jogando de ZENON -> sem chefao (ED7)',
    save: { desbloqueados: [...FILA, ZENON], zeradas: 6, chefeDerrotado: true, chefesDerrotados: [ZENON] },
    c1: ZENON,
    chefe: null,
    desbloqueados: [...FILA, ZENON],
    novos: [],
    derrotados: [ZENON],
    zeradas: 7,
    seguinte: null,
  },
  {
    nome: 'S8: fora de ordem [camille], min-ji -> AMINU; o seguinte e CENTELLA (pula CAMILLE)',
    save: { desbloqueados: [CAMILLE], zeradas: 1 },
    c1: MIN_JI,
    chefe: AMINU,
    desbloqueados: [CAMILLE, AMINU],
    novos: [AMINU],
    derrotados: [AMINU],
    zeradas: 2,
    seguinte: CENTELLA,
  },
  {
    nome: 'S9: legado chefeDerrotado:true, [aminu, baatar] -> CENTELLA; chefesDerrotados [baatar, centella]',
    save: { desbloqueados: [AMINU, BAATAR], zeradas: 2, chefeDerrotado: true },
    c1: HAYATO,
    chefe: CENTELLA,
    desbloqueados: [AMINU, BAATAR, CENTELLA],
    novos: [CENTELLA],
    derrotados: [BAATAR, CENTELLA],
    zeradas: 3,
    seguinte: CAMILLE,
  },
  {
    nome: 'S10: desconhecidos [ravi] (onda futura) -> chefao conforme desbloqueados; desconhecidos preservado',
    save: { desbloqueados: [AMINU], desconhecidos: ['ravi'], zeradas: 2 },
    c1: HAYATO,
    chefe: CENTELLA,
    desbloqueados: [AMINU, CENTELLA],
    novos: [CENTELLA],
    derrotados: [CENTELLA],
    zeradas: 3,
    seguinte: CAMILLE,
  },
  {
    nome: 'S11: editado a mao desbloqueados [zenon] -> AMINU; o saneamento ja recompoe chefesDerrotados [zenon]',
    save: { desbloqueados: [ZENON], zeradas: 0 },
    c1: HAYATO,
    chefe: AMINU,
    desbloqueados: [ZENON, AMINU],
    novos: [AMINU],
    derrotados: [ZENON, AMINU],
    zeradas: 1,
    seguinte: CENTELLA,
  },
];

describe('P1 (1): a matriz S1-S11 da spec', () => {
  for (const l of MATRIZ) {
    const c1s = Array.isArray(l.c1) ? (l.c1 as readonly IdLutador[]) : [l.c1 as IdLutador];
    it(l.nome, () => {
      const prog = sanearProgresso({ vistos: [], ...l.save }, NOVA);
      for (const c1 of c1s) {
        expect(chefeDoArcade(c1, prog, NOVA), `chefao com ${c1}`).toBe(l.chefe);
        const r = aplicarVitoriaArcade(prog, { chefe: l.chefe }, NOVA);
        expect(r.prog.desbloqueados, c1).toEqual(l.desbloqueados);
        expect(r.novos, c1).toEqual(l.novos);
        expect(r.prog.chefesDerrotados, c1).toEqual(l.derrotados);
        expect(r.prog.chefeDerrotado, c1).toBe(l.derrotados !== undefined);
        expect(r.prog.zeradas, c1).toBe(l.zeradas);
        if (l.seguinte !== undefined) {
          const seguinte = l.chefe === null ? null : l.seguinte;
          expect(chefeDoArcade(c1, r.prog, NOVA), `seguinte com ${c1}`).toBe(seguinte);
        }
      }
    });
  }

  it('S10: o id desconhecido sobrevive a vitoria', () => {
    const prog = sanearProgresso({ desbloqueados: [AMINU], desconhecidos: ['ravi'], zeradas: 2 }, NOVA);
    expect(aplicarVitoriaArcade(prog, { chefe: CENTELLA }, NOVA).prog.desconhecidos).toEqual(['ravi']);
  });

  it('S11 (saneamento): o ZENON editado a mao ja entra em chefesDerrotados, o AMINU nao', () => {
    const prog = sanearProgresso({ desbloqueados: [ZENON] }, NOVA);
    expect(prog.chefesDerrotados).toEqual([ZENON]);
    expect(derrotou(prog, AMINU)).toBe(false);
  });
});
const derrotou = (p: Progresso, id: string): boolean => chefesDerrotadosDe(p).includes(id);

// ---------------------------------------------------------------------------
// (2) Verificadores (reusados contra as implementacoes certas E as erradas)
// ---------------------------------------------------------------------------

type Escolha = (c1: IdLutador, prog: Progresso, regras: Regras) => IdLutador | null;
type Aplicar = (prog: Progresso, vitoria: VitoriaArcade, regras: Regras) => ResultadoVitoria;

/**
 * Propriedades que, juntas, determinam o chefao de forma unica, sobre os 64 estados x os 10 lutadores (os bloqueados tambem:
 * a UI nao os deixa escolher, mas a funcao se defende). Devolve as violacoes.
 */
function violacoesDaEscolha(escolha: Escolha): string[] {
  const v: string[] = [];
  for (const { rotulo, prog } of ESTADOS) {
    const ja = liberados(prog, NOVA);
    for (const c1 of ROSTER) {
      const e = escolha(c1, prog, NOVA);
      const ctx = `${rotulo} com ${c1}`;
      const pendentes = FILA.filter((id) => !ja.has(id) && id !== c1);
      if (e === c1) v.push(`${ctx}: o chefao e o proprio jogador`);
      if (e !== null && e !== ZENON && ja.has(e)) v.push(`${ctx}: guardiao ${e} ja liberado`);
      if (e !== null && !FILA.includes(e) && e !== ZENON) v.push(`${ctx}: chefao ${e} fora da fila e do final`);
      if (e === ZENON && pendentes.length > 0) v.push(`${ctx}: ZENON antes de ${pendentes[0]}`);
      if (e !== null && e !== ZENON && e !== pendentes[0]) v.push(`${ctx}: ${e} nao e o primeiro da fila (${pendentes[0]})`);
      if (e === null && !(c1 === ZENON && pendentes.length === 0)) v.push(`${ctx}: sem chefao fora do caso ZENON+fila esgotada`);
      if (pendentes.length === 0 && c1 !== ZENON && e !== ZENON) v.push(`${ctx}: fila esgotada e o chefao nao e o ZENON`);
    }
  }
  return v;
}

/** A vitoria sobre o chefao da vez, em todos os estados x todos os lutadores LIBERADOS (os que a UI deixa escolher). */
function violacoesDaVitoria(aplicar: Aplicar): string[] {
  const v: string[] = [];
  for (const { rotulo, prog } of ESTADOS) {
    for (const c1 of liberadosDe(prog)) {
      const chefe = chefeDoArcade(c1, prog, NOVA);
      const ctx = `${rotulo} com ${c1} vs ${chefe}`;
      const entrada = structuredClone(prog);
      const antes = JSON.stringify(entrada);
      const r = aplicar(entrada, { chefe }, NOVA);
      if (JSON.stringify(entrada) !== antes) v.push(`${ctx}: mutou a entrada`);
      if (r.prog.zeradas !== prog.zeradas + 1) v.push(`${ctx}: zeradas ${prog.zeradas} -> ${r.prog.zeradas}`);
      if (!prog.desbloqueados.every((id, i) => r.prog.desbloqueados[i] === id)) v.push(`${ctx}: revogou um desbloqueio`);
      const jaAntes = liberados(prog, NOVA);
      const esperados = chefe !== null && !jaAntes.has(chefe) ? [chefe] : [];
      if (JSON.stringify(r.novos) !== JSON.stringify(esperados)) v.push(`${ctx}: novos ${JSON.stringify(r.novos)}`);
      const depois = liberados(r.prog, NOVA);
      for (const id of ROSTER) {
        const deveria = jaAntes.has(id) || id === chefe;
        if (depois.has(id) !== deveria) v.push(`${ctx}: ${id} liberado=${depois.has(id)}`);
      }
      const dAntes = chefesDerrotadosDe(prog);
      const dDepois = chefesDerrotadosDe(r.prog);
      if (!dAntes.every((id) => dDepois.includes(id))) v.push(`${ctx}: perdeu um chefao derrotado`);
      if (chefe !== null && !dDepois.includes(chefe)) v.push(`${ctx}: ${chefe} nao entrou em chefesDerrotados`);
      if (new Set(dDepois).size !== dDepois.length) v.push(`${ctx}: chefesDerrotados repetido`);
      if (dDepois.length !== dAntes.length + (chefe !== null && !dAntes.includes(chefe) ? 1 : 0)) v.push(`${ctx}: tamanho de chefesDerrotados`);
      if (r.prog.chefeDerrotado !== dDepois.length > 0) v.push(`${ctx}: chefeDerrotado discorda da lista`);
      if (JSON.stringify(r.prog.vistos) !== JSON.stringify(prog.vistos)) v.push(`${ctx}: vistos mudou`);
      if (dDepois.length > MAX_CHEFES_DERROTADOS) v.push(`${ctx}: estourou o teto`);
    }
  }
  return v;
}

describe('P1 (2): exaustivo, 64 estados x lutador escolhido', () => {
  it('chefeDoArcade satisfaz todas as propriedades em todos os 640 pares (estado, lutador)', () => {
    expect(violacoesDaEscolha(chefeDoArcade)).toEqual([]);
  });

  it('o chefao da vez nunca e o jogador e esta sempre bloqueado, exceto o ZENON na revanche', () => {
    let revanches = 0;
    for (const { prog } of ESTADOS) {
      for (const c1 of liberadosDe(prog)) {
        const e = chefeDoArcade(c1, prog, NOVA);
        if (e === null) continue;
        expect(e).not.toBe(c1);
        if (liberados(prog, NOVA).has(e)) {
          expect(e).toBe(ZENON);
          revanches++;
        }
      }
    }
    expect(revanches).toBeGreaterThan(0); // o caso de revanche existe no espaco
  });

  it('a vitoria sobre o chefao da vez satisfaz as propriedades em todos os estados', () => {
    expect(violacoesDaVitoria(aplicarVitoriaArcade)).toEqual([]);
  });

  it('montarEscada: a ultima etapa e o chefao da vez, unico, fora dos rivais; 5 rivais distintos sem o jogador nem o ZENON', () => {
    for (const { rotulo, prog } of ESTADOS) {
      for (const c1 of liberadosDe(prog)) {
        for (const semente of [1, 7]) {
          const ctx = `${rotulo} ${c1} #${semente}`;
          const e = montarEscada({ c1, prog, rng: criarRng(semente), regras: NOVA });
          const chefe = chefeDoArcade(c1, prog, NOVA);
          const rivais = e.filter((x) => !x.chefe);
          expect(e.filter((x) => x.chefe), ctx).toHaveLength(chefe === null ? 0 : 1);
          if (chefe !== null) expect(e[e.length - 1], ctx).toEqual({ id: chefe, chefe: true });
          expect(rivais, ctx).toHaveLength(5);
          expect(new Set(rivais.map((x) => x.id)).size, ctx).toBe(5);
          expect(rivais.some((x) => x.id === c1 || x.id === ZENON || x.id === chefe), ctx).toBe(false);
        }
      }
    }
  });

  it('montarEscada: a mesma semente da a mesma escada (determinismo) e nao muta o progresso', () => {
    const { prog } = ESTADOS[17] as Estado;
    const antes = JSON.stringify(prog);
    const a = montarEscada({ c1: HAYATO, prog, rng: criarRng(5), regras: NOVA });
    const b = montarEscada({ c1: HAYATO, prog, rng: criarRng(5), regras: NOVA });
    expect(a).toEqual(b);
    expect(JSON.stringify(prog)).toBe(antes);
  });
});

// ---------------------------------------------------------------------------
// (3) Campanha ponta a ponta: a escada diz quem e o chefao, a vitoria o libera
// ---------------------------------------------------------------------------

describe('P1 (3): vencendo sempre, tudo fica liberado em exatamente 6 zeradas', () => {
  type Estrategia = (liberadosAgora: readonly IdLutador[], rodada: number) => IdLutador;
  const estrategias: Record<string, Estrategia> = {
    'sempre o primeiro inicial': () => HAYATO,
    'sempre o ultimo liberado': (l) => l[l.length - 1] as IdLutador,
    'rotaciona entre os liberados': (l, r) => l[r % l.length] as IdLutador,
    'o ZENON assim que liberado': (l) => (l.includes(ZENON) ? ZENON : (l[0] as IdLutador)),
  };

  for (const [nome, escolher] of Object.entries(estrategias)) {
    it(`${nome}: 6 zeradas, na ordem da fila e depois o ZENON; nada sai da lista`, () => {
      let prog = progressoVazio();
      const ordem: IdLutador[] = [];
      for (let z = 0; z < 6; z++) {
        const c1 = escolher(liberadosDe(prog), z);
        const etapas = montarEscada({ c1, prog, rng: criarRng(z + 1), regras: NOVA });
        const chefe = etapas.find((e) => e.chefe)?.id ?? null; // o id da etapa, como a UI vai guardar
        const antes = prog.desbloqueados;
        const r = aplicarVitoriaArcade(prog, { chefe }, NOVA);
        expect(r.prog.desbloqueados.slice(0, antes.length)).toEqual(antes);
        ordem.push(...r.novos);
        prog = r.prog;
      }
      expect(ordem).toEqual([...FILA, ZENON]);
      expect(liberados(prog, NOVA).size).toBe(10);
      expect(prog.zeradas).toBe(6);
      expect(prog.chefesDerrotados).toEqual([...FILA, ZENON]);
      // a 7a zerada (revanche) nao libera nada e so conta
      const c1 = HAYATO;
      const chefe = chefeDoArcade(c1, prog, NOVA);
      expect(chefe).toBe(ZENON);
      const r7 = aplicarVitoriaArcade(prog, { chefe }, NOVA);
      expect(r7.novos).toEqual([]);
      expect(r7.prog.zeradas).toBe(7);
      expect(r7.prog.chefesDerrotados).toEqual([...FILA, ZENON]);
    });
  }

  it('jogando SEMPRE de ZENON (save antigo com ele liberado): os 5 guardioes ainda vem, um por zerada', () => {
    let prog = comoSave([ZENON]);
    for (let z = 0; z < 5; z++) {
      const chefe = chefeDoArcade(ZENON, prog, NOVA);
      expect(chefe).toBe(FILA[z]);
      prog = aplicarVitoriaArcade(prog, { chefe }, NOVA).prog;
    }
    expect(chefeDoArcade(ZENON, prog, NOVA)).toBeNull();
    const r = aplicarVitoriaArcade(prog, { chefe: null }, NOVA);
    expect(r.novos).toEqual([]);
    expect(r.prog.zeradas).toBe(prog.zeradas + 1);
  });

  it('o id do chefao vem da etapa: outra aba liberar o guardiao no meio nao gera "novo" repetido nem muda quem caiu', () => {
    const comecou = comoSave([]);
    const chefeGravado = montarEscada({ c1: HAYATO, prog: comecou, rng: criarRng(1), regras: NOVA }).find((e) => e.chefe)?.id ?? null;
    expect(chefeGravado).toBe(AMINU);
    const outraAba = aplicarVitoriaArcade(comecou, { chefe: AMINU }, NOVA).prog; // a outra aba ja zerou e liberou o AMINU
    const r = aplicarVitoriaArcade(outraAba, { chefe: chefeGravado }, NOVA);
    expect(r.novos).toEqual([]);
    expect(r.prog.desbloqueados).toEqual([AMINU]);
    expect(r.prog.chefesDerrotados).toEqual([AMINU]);
    expect(r.prog.zeradas).toBe(2);
  });

  it('um id fora do roster em `chefe` e tratado como sem chefe (nunca libera lixo)', () => {
    const r = aplicarVitoriaArcade(comoSave([]), { chefe: 'inexistente' as IdLutador }, NOVA);
    expect(r.novos).toEqual([]);
    expect(r.prog.desbloqueados).toEqual([]);
    expect(r.prog.chefesDerrotados).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Saneamento / storage: formato v2 intacto
// ---------------------------------------------------------------------------

type Falso = ArmazenamentoLike & { dados: Map<string, string> };
const falso = (inicial: Record<string, string> = {}): Falso => {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
};
const CAMPOS_DO_PROG = ['chefeDerrotado', 'chefesDerrotados', 'desbloqueados', 'desconhecidos', 'vistos', 'zeradas'];

describe('P1: saneamento e formato v2 coerentes, sem migracao', () => {
  it('os guardioes NAO entram em CHEFOES_SO_POR_DERROTA (so o ZENON): ter o id liberado nao prova a derrota', () => {
    expect([...CHEFOES_SO_POR_DERROTA]).toEqual([ZENON]);
    for (const g of FILA) expect(CHEFOES_SO_POR_DERROTA).not.toContain(g);
    // save da regra antiga: os 5 liberados pela zerada, nenhum enfrentado como chefao
    const antigo = sanearProgresso({ desbloqueados: FILA, zeradas: 5, vistos: [] }, NOVA);
    expect(antigo.chefesDerrotados).toBeUndefined();
    expect(antigo.chefeDerrotado).toBe(false);
  });

  it('o teto de chefoes derrotados e 16 e cabe todos os 6 chefoes', () => {
    expect(MAX_CHEFES_DERROTADOS).toBe(16);
    const todos = [...FILA, ZENON];
    expect(sanearProgresso({ desbloqueados: todos, chefesDerrotados: todos }, NOVA).chefesDerrotados).toEqual(todos);
  });

  it('para cada um dos 64 estados: vitoria -> salvar v2 -> carregar devolve o MESMO progresso; o formato e {v,s,hi,prog}', () => {
    for (const { rotulo, prog } of ESTADOS) {
      const chefe = chefeDoArcade(HAYATO, prog, NOVA);
      const depois = aplicarVitoriaArcade(prog, { chefe }, NOVA).prog;
      const st = falso();
      expect(salvarDadosV2(st, { s: {} as never, hi: 10, prog: depois }, NOVA), rotulo).toBe(true);
      const cru = JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string) as Record<string, unknown>;
      expect(Object.keys(cru).sort(), rotulo).toEqual(['hi', 'prog', 's', 'v']);
      expect(cru['v']).toBe(2);
      expect(Object.keys(cru['prog'] as object).every((k) => CAMPOS_DO_PROG.includes(k)), rotulo).toBe(true);
      expect(carregarDadosV2(st, NOVA).prog, rotulo).toEqual(depois);
    }
  });

  it('chefesDerrotados e chefeDerrotado nunca discordam depois de qualquer vitoria nova ou antiga', () => {
    for (const { prog } of ESTADOS) {
      for (const v of [{ chefe: chefeDoArcade(CAIO, prog, NOVA) }, { derrotouChefe: true }, { derrotouChefe: false }] as VitoriaArcade[]) {
        for (const regras of [NOVA, ANTIGA]) {
          const r = aplicarVitoriaArcade(prog, v, regras).prog;
          expect(r.chefeDerrotado).toBe(chefesDerrotadosDe(r).length > 0);
          expect(r.chefesDerrotados === undefined || r.chefesDerrotados.length > 0).toBe(true);
        }
      }
    }
  });
});

// ---------------------------------------------------------------------------
// (4) Chave desligada = o jogo de HEAD ac57a80
// ---------------------------------------------------------------------------

describe('P1 (4): com chefesDaFila:false tudo e identico ao HEAD ac57a80 (rollback, ?expansao=4, testes antigos)', () => {
  it('chefeDoArcade: o ZENON, ou null jogando com ele', () => {
    for (const { prog } of ESTADOS) {
      for (const c1 of ROSTER) expect(chefeDoArcade(c1, prog, ANTIGA)).toBe(c1 === ZENON ? null : ZENON);
    }
    expect(chefeDoArcade(HAYATO, progressoVazio(), { ...ANTIGA, chefe: null })).toBeNull();
  });

  it('montarEscada: identica a do HEAD em todos os estados x lutadores x sementes', () => {
    for (const { rotulo, prog } of ESTADOS) {
      for (const c1 of ROSTER) {
        for (const semente of [1, 2, 99]) {
          for (const regras of [ANTIGA, { ...ANTIGA, travadosNaEscada: false }, { ...ANTIGA, chefe: null }]) {
            const a = montarEscada({ c1, prog, rng: criarRng(semente), regras });
            const b = montarEscadaAntiga({ c1, prog, rng: criarRng(semente), regras });
            expect(a, `${rotulo} ${c1} #${semente}`).toEqual(b);
          }
        }
      }
    }
  });

  it('aplicarVitoriaArcade: formato antigo e `{ chefe }` sem a chave dao o MESMO resultado do HEAD (inclusive com a chave ligada, no formato antigo)', () => {
    for (const { rotulo, prog } of ESTADOS) {
      for (const derrotouChefe of [true, false]) {
        const hoje = aplicarVitoriaAntiga(prog, { derrotouChefe }, NOVA);
        expect(aplicarVitoriaArcade(prog, { derrotouChefe }, ANTIGA), `${rotulo} ${derrotouChefe}`).toEqual(hoje);
        expect(aplicarVitoriaArcade(prog, { derrotouChefe }, NOVA), `${rotulo} ${derrotouChefe} (chave ligada, formato antigo)`).toEqual(hoje);
        expect(aplicarVitoriaArcade(prog, { chefe: derrotouChefe ? ZENON : null }, ANTIGA), `${rotulo} {chefe} ${derrotouChefe}`).toEqual(hoje);
      }
    }
  });

  it('REGRAS_PADRAO depois da L1: a chave ligada (o fim.ts informa o id do chefão); temasMusicais ligado', () => {
    expect(REGRAS_PADRAO.chefesDaFila).toBe(true);
    expect(REGRAS_PADRAO.temasMusicais).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// desafiantesDoChefe / ehChefeFinal
// ---------------------------------------------------------------------------

describe('P1: desafiantesDoChefe e ehChefeFinal', () => {
  it('6 chefoes: os 5 guardioes na ordem da fila e o ZENON por ultimo', () => {
    expect(desafiantesDoChefe(NOVA).map((x) => x.chefe)).toEqual([...FILA, ZENON]);
  });

  it('cada guardiao k e enfrentado por iniciais + fila[0..k-1] (ordem do roster); o ZENON pelos outros 9', () => {
    const lista = desafiantesDoChefe(NOVA);
    FILA.forEach((g, k) => {
      const esperado = ROSTER.filter((id) => [...INICIAIS, ...FILA.slice(0, k)].includes(id));
      expect(lista[k]?.desafiantes, g).toEqual(esperado);
      expect(lista[k]?.desafiantes.includes(g)).toBe(false);
    });
    expect(lista[0]?.desafiantes).toEqual([HAYATO, WEI_LONG, MIN_JI, CAIO]);
    expect(lista[5]?.desafiantes).toEqual(ROSTER.filter((id) => id !== ZENON));
    expect(lista[5]?.desafiantes).toHaveLength(9);
  });

  it('chave desligada: so o chefao fixo, enfrentado por todos os outros; sem chefao nas regras: vazio', () => {
    expect(desafiantesDoChefe(ANTIGA)).toEqual([{ chefe: ZENON, desafiantes: ROSTER.filter((id) => id !== ZENON) }]);
    expect(desafiantesDoChefe({ ...ANTIGA, chefe: null })).toEqual([]);
  });

  it('com a chave ligada e sem Anfitriao (onda sem ZENON): so os guardioes', () => {
    expect(desafiantesDoChefe({ ...NOVA, chefe: null }).map((x) => x.chefe)).toEqual(FILA);
  });

  it('nenhum desafiante de um guardiao esta bloqueado naquele ponto (coerente com chefeDoArcade)', () => {
    for (const { chefe, desafiantes } of desafiantesDoChefe(NOVA)) {
      const k = FILA.indexOf(chefe);
      if (k < 0) continue;
      const prog = comoSave(FILA.slice(0, k));
      for (const c1 of desafiantes) expect(chefeDoArcade(c1, prog, NOVA), `${c1} vs ${chefe}`).toBe(chefe);
    }
  });

  it('ehChefeFinal: so o ZENON; nenhum guardiao; sem Anfitriao nas regras ninguem', () => {
    expect(ehChefeFinal(ZENON)).toBe(true);
    for (const g of FILA) expect(ehChefeFinal(g)).toBe(false);
    expect(ehChefeFinal(ZENON, { ...NOVA, chefe: null })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// (5) Rollback: o saneamento do HEAD ac57a80 le o save do build novo sem perder nada
// ---------------------------------------------------------------------------

describe('P1 (5): rollback contra o saneamento e a vitoria do HEAD ac57a80', () => {
  const ciclo = (prog: Progresso): Progresso => JSON.parse(JSON.stringify(sanearAntigo(JSON.parse(JSON.stringify(prog)), NOVA))) as Progresso;

  it('em todos os 64 estados, depois de uma vitoria nova: o build antigo preserva desbloqueados, zeradas e chefesDerrotados', () => {
    for (const { rotulo, prog } of ESTADOS) {
      const novo = aplicarVitoriaArcade(prog, { chefe: chefeDoArcade(HAYATO, prog, NOVA) }, NOVA).prog;
      const lidoPeloAntigo = ciclo(novo);
      expect(lidoPeloAntigo.desbloqueados, rotulo).toEqual(novo.desbloqueados);
      expect(lidoPeloAntigo.zeradas, rotulo).toBe(novo.zeradas);
      expect(lidoPeloAntigo.chefesDerrotados, rotulo).toEqual(novo.chefesDerrotados);
      expect(lidoPeloAntigo.chefeDerrotado, rotulo).toBe(novo.chefeDerrotado);
      // e o build novo le de volta o que o antigo regravou, igual
      expect(sanearProgresso(lidoPeloAntigo, NOVA), rotulo).toEqual(novo);
    }
  });

  it('a campanha inteira (6 chefoes) cabe no teto 8 do build antigo: nenhum e truncado no rollback', () => {
    let prog = progressoVazio();
    for (let z = 0; z < 6; z++) prog = aplicarVitoriaArcade(prog, { chefe: chefeDoArcade(HAYATO, prog, NOVA) }, NOVA).prog;
    expect(prog.chefesDerrotados).toHaveLength(6);
    expect(ciclo(prog).chefesDerrotados).toEqual(prog.chefesDerrotados);
  });

  it('o build antigo JOGANDO por cima de um save novo (ZENON de chefao fixo, libera a fila): o build novo nao perde nada e o sanea', () => {
    for (const { rotulo, prog } of ESTADOS) {
      const novo = aplicarVitoriaArcade(prog, { chefe: chefeDoArcade(CAIO, prog, NOVA) }, NOVA).prog;
      const antigoJogou = aplicarVitoriaAntiga(novo, { derrotouChefe: true }, NOVA).prog;
      expect(novo.desbloqueados.every((id) => antigoJogou.desbloqueados.includes(id)), rotulo).toBe(true);
      const volta = sanearProgresso(JSON.parse(JSON.stringify(antigoJogou)), NOVA);
      expect(volta.desbloqueados, rotulo).toEqual(antigoJogou.desbloqueados);
      // o ZENON que o build antigo liberou "de graca" entra em chefesDerrotados pelo saneamento, como a Z6 ja garante
      expect(volta.chefeDerrotado, rotulo).toBe(chefesDerrotadosDe(volta).length > 0);
      // e o chefao da vez continua sendo o primeiro da fila ainda bloqueado
      const e = chefeDoArcade(HAYATO, volta, NOVA);
      expect(e === null || e === ZENON || !liberados(volta, NOVA).has(e), rotulo).toBe(true);
    }
  });

  it('um save de ANTES (HEAD, regra velha) abre no build novo: nada revogado, chefao derivado de desbloqueados', () => {
    const doHead = { desbloqueados: [AMINU, BAATAR], zeradas: 2, chefeDerrotado: true, vistos: [AMINU] };
    const p = sanearProgresso(doHead, NOVA);
    expect(p.desbloqueados).toEqual([AMINU, BAATAR]);
    expect(chefeDoArcade(HAYATO, p, NOVA)).toBe(CENTELLA); // BAATAR ja liberado nao tranca a fila
  });
});

// ---------------------------------------------------------------------------
// (6) MUTACAO: regras de escolha erradas que o verificador TEM de reprovar
// ---------------------------------------------------------------------------

describe('P1 (6): mutacao, o verificador reprova cada regra de escolha errada', () => {
  const primeiroBloqueado = (c1: IdLutador, prog: Progresso, r: Regras, ignorarC1 = false): IdLutador | undefined =>
    r.fila.find((id) => !liberados(prog, r).has(id) && (ignorarC1 || id !== c1));
  const ultimoBloqueado = (c1: IdLutador, prog: Progresso, r: Regras): IdLutador | undefined =>
    [...r.fila].reverse().find((id) => !liberados(prog, r).has(id) && id !== c1);
  const final = (c1: IdLutador, r: Regras): IdLutador | null => (r.chefe !== null && c1 !== r.chefe ? r.chefe : null);

  const mutantesDaEscolha: Record<string, Escolha> = {
    'nao pula o c1 (find sem `id !== c1`)': (c1, p, r) => primeiroBloqueado(c1, p, r, true) ?? final(c1, r),
    'ultimo bloqueado em vez do primeiro': (c1, p, r) => ultimoBloqueado(c1, p, r) ?? final(c1, r),
    'ZENON liberado vence a fila': (c1, p, r) =>
      liberados(p, r).has(ZENON) && c1 !== ZENON ? ZENON : (primeiroBloqueado(c1, p, r) ?? final(c1, r)),
    'ignora os liberados (sempre fila[0])': (c1, _p, r) => (r.fila.find((id) => id !== c1) as IdLutador),
    'indice por zeradas (A3): fila[zeradas]': (c1, p, r) => ((r.fila[p.zeradas] as IdLutador | undefined) ?? final(c1, r)),
    'fila esgotada sem chefao (null)': (c1, p, r) => primeiroBloqueado(c1, p, r) ?? null,
    'ZENON mesmo jogando de ZENON': (c1, p, r) => primeiroBloqueado(c1, p, r) ?? r.chefe,
    'sempre o final (a regra velha)': (c1, _p, r) => final(c1, r),
    'ZENON no meio da fila (apos 3 liberados)': (c1, p, r) =>
      FILA.filter((id) => liberados(p, r).has(id)).length >= 3 && c1 !== ZENON ? ZENON : (primeiroBloqueado(c1, p, r) ?? final(c1, r)),
    'decide pelos `vistos` em vez dos desbloqueados': (c1, p, r) =>
      r.fila.find((id) => !p.vistos.includes(id) && id !== c1) ?? final(c1, r),
    'fila esgotada devolve o ultimo guardiao (BAATAR), a alternativa recusada D-A2': (c1, p, r) =>
      primeiroBloqueado(c1, p, r) ?? (c1 === ZENON ? (BAATAR as IdLutador) : r.chefe),
  };

  it('a implementacao real passa (controle)', () => {
    expect(violacoesDaEscolha(chefeDoArcade)).toEqual([]);
  });

  for (const [nome, mutante] of Object.entries(mutantesDaEscolha)) {
    it(`reprova: ${nome}`, () => {
      expect(violacoesDaEscolha(mutante).length).toBeGreaterThan(0);
    });
  }

  // Mutantes EQUIVALENTES (nao mudam nenhum comportamento observavel) ficam de fora de proposito: "considera so `desbloqueados`
  // em vez de `liberados`" (nenhum inicial esta na fila) e "libera o proximo da fila quando nao houve chefe" (sem chefe so ha
  // fila esgotada, entao nao ha proximo).
  const mutantesDaVitoria: Record<string, Aplicar> = {
    'a zerada avanca a fila sozinha (regra velha) alem do chefao': (p, v, r) =>
      aplicarVitoriaAntiga(p, { derrotouChefe: 'chefe' in v && v.chefe !== null }, { ...r, chefesDaFila: false }),
    'nao registra chefesDerrotados': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      const { chefesDerrotados: _c, ...resto } = x.prog;
      void _c;
      return { ...x, prog: { ...resto, chefeDerrotado: false } };
    },
    'revoga o primeiro desbloqueio': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      return { ...x, prog: { ...x.prog, desbloqueados: x.prog.desbloqueados.slice(1) } };
    },
    'nao conta a zerada': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      return { ...x, prog: { ...x.prog, zeradas: p.zeradas } };
    },
    'repete o chefao em chefesDerrotados (revanche)': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      return 'chefe' in v && v.chefe !== null
        ? { ...x, prog: { ...x.prog, chefesDerrotados: [...(x.prog.chefesDerrotados ?? []), v.chefe], chefeDerrotado: true } }
        : x;
    },
    'chefeDerrotado discorda da lista': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      return { ...x, prog: { ...x.prog, chefeDerrotado: !x.prog.chefeDerrotado } };
    },
    'gera `novos` para quem ja estava liberado (cartao repetido)': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      return 'chefe' in v && v.chefe !== null && x.novos.length === 0 ? { ...x, novos: [v.chefe] } : x;
    },
    'muta o progresso de entrada': (p, v, r) => {
      const x = aplicarVitoriaArcade(p, v, r);
      p.zeradas = x.prog.zeradas; // escreve na entrada
      return x;
    },
  };

  it('a vitoria real passa (controle)', () => {
    expect(violacoesDaVitoria(aplicarVitoriaArcade)).toEqual([]);
  });

  for (const [nome, mutante] of Object.entries(mutantesDaVitoria)) {
    it(`reprova: ${nome}`, () => {
      expect(violacoesDaVitoria(mutante).length).toBeGreaterThan(0);
    });
  }
});

// ---------------------------------------------------------------------------
// Defesa em profundidade e arquitetura
// ---------------------------------------------------------------------------

describe('P1: defesa em profundidade', () => {
  it('c1 = o proprio candidato (bloqueado): pula para o proximo bloqueado, nunca o devolve', () => {
    const prog = comoSave([]);
    expect(chefeDoArcade(AMINU, prog, NOVA)).toBe(CENTELLA);
    expect(chefeDoArcade(CENTELLA, prog, NOVA)).toBe(AMINU);
  });

  it('regras de ondas: fila vazia e chefao nulo -> sem chefao; fila vazia com chefao -> o chefao', () => {
    expect(chefeDoArcade(HAYATO, progressoVazio(), { ...NOVA, fila: [], chefe: null })).toBeNull();
    expect(chefeDoArcade(HAYATO, progressoVazio(), { ...NOVA, fila: [] })).toBe(ZENON);
  });

  it('com a chave ligada e sem Anfitriao, a fila esgotada nao tem chefao', () => {
    expect(chefeDoArcade(HAYATO, comoSave(FILA), { ...NOVA, chefe: null })).toBeNull();
  });

  it('chefeDoArcade nao muta o progresso nem as regras', () => {
    const prog = comoSave([AMINU]);
    const a = JSON.stringify([prog, NOVA]);
    chefeDoArcade(HAYATO, prog, NOVA);
    desafiantesDoChefe(NOVA);
    expect(JSON.stringify([prog, NOVA])).toBe(a);
  });
});
