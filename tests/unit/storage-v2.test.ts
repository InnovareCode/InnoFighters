import { describe, expect, it } from 'vitest';
import {
  CHAVE_STORAGE_LEGADA,
  CHAVE_STORAGE_V1,
  CHAVE_STORAGE_V2,
  CONFIGURACOES_PADRAO,
  type IdLutador,
} from '../../src/core/contratos';
import {
  carregarDados,
  carregarDadosV2,
  salvarDados,
  salvarDadosV2,
  type ArmazenamentoLike,
  type DadosSalvosV2,
} from '../../src/core/storage';
import {
  MAX_IDS_DESCONHECIDOS,
  REGRAS_PADRAO,
  aplicarVitoriaArcade,
  liberados,
  marcarVistos,
  naoVistos,
  progressoVazio,
  type Regras,
} from '../../src/meta';

const id = (s: string): IdLutador => s as IdLutador;
const [H, W, M, C] = [id('hayato'), id('wei-long'), id('min-ji'), id('caio')];
const [A, B, BOSS] = [id('novo-a'), id('novo-b'), id('chefe-x')];
const REGRAS: Pick<Regras, 'roster' | 'iniciais'> = { roster: [H, W, M, C, A, B, BOSS], iniciais: [H, W, M, C] };

type Falso = ArmazenamentoLike & { dados: Map<string, string>; falhaEscrita: boolean };
function falso(inicial: Record<string, string> = {}): Falso {
  const dados = new Map(Object.entries(inicial));
  const st: Falso = {
    dados,
    falhaEscrita: false,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => {
      if (st.falhaEscrita) throw new DOMException('cota excedida', 'QuotaExceededError');
      dados.set(k, v);
    },
    removeItem: (k) => void dados.delete(k),
  };
  return st;
}

const v1 = (hi = 100, s: object = { rounds: 3 }) => JSON.stringify({ v: 1, s, hi });
const legado = (hi = 55, s: object = { rounds: 1 }) => JSON.stringify({ s, hi });
const v2 = (prog: unknown, hi = 10, s: object = {}) => JSON.stringify({ v: 2, s, hi, prog });
const lerV2Cru = (st: Falso) => JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string) as Record<string, unknown>;

describe('storage v2: chaves', () => {
  it('chave nova e distinta da v1; CHAVE_STORAGE_V1 e a mesma string da v1 em uso', () => {
    expect(CHAVE_STORAGE_V2).toBe('inno-fighters-v2');
    expect(CHAVE_STORAGE_V1).toBe('inno-fighters-v1');
    expect(CHAVE_STORAGE_V2).not.toBe(CHAVE_STORAGE_V1);
  });
});

describe('storage v2: cadeia de migracao (plano 3.3)', () => {
  it('vazio -> padroes, progresso vazio e NADA gravado', () => {
    const st = falso();
    expect(carregarDadosV2(st, REGRAS)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 0, prog: progressoVazio() });
    expect(st.dados.size).toBe(0);
  });

  it('so v1 -> migra s/hi, progresso vazio, grava a v2 e MANTEM a v1 intacta', () => {
    const bruto = v1(777, { rounds: 3, music: 0.2 });
    const st = falso({ [CHAVE_STORAGE_V1]: bruto });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(777);
    expect(r.s.rounds).toBe(3);
    expect(r.s.music).toBe(0.2);
    expect(r.prog).toEqual(progressoVazio());
    expect(lerV2Cru(st)).toMatchObject({ v: 2, hi: 777, prog: progressoVazio() });
    expect(st.dados.get(CHAVE_STORAGE_V1)).toBe(bruto); // byte a byte
  });

  it('so legado -> migra, grava a v2 e apaga a legada', () => {
    const st = falso({ [CHAVE_STORAGE_LEGADA]: legado(321) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(321);
    expect(r.s.rounds).toBe(1);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(false);
    expect(lerV2Cru(st)).toMatchObject({ v: 2, hi: 321 });
    expect(st.dados.has(CHAVE_STORAGE_V1)).toBe(false); // nao inventa v1
  });

  it('v1 + legada -> a v1 vence (a legada e mais velha); legada some depois de gravar a v2', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: v1(500), [CHAVE_STORAGE_LEGADA]: legado(9999) });
    expect(carregarDadosV2(st, REGRAS).hi).toBe(500);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(false);
    expect(st.dados.has(CHAVE_STORAGE_V1)).toBe(true);
  });

  it('v2 + legada -> usa a v2, apaga a legada, mantem a v1 e nao regrava a v2', () => {
    const bruto2 = v2({ desbloqueados: [A], zeradas: 1, chefeDerrotado: false, vistos: [] }, 42);
    const bruto1 = v1(7);
    const st = falso({ [CHAVE_STORAGE_V2]: bruto2, [CHAVE_STORAGE_V1]: bruto1, [CHAVE_STORAGE_LEGADA]: legado() });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(42);
    expect(r.prog.desbloqueados).toEqual([A]);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(false);
    expect(st.dados.get(CHAVE_STORAGE_V1)).toBe(bruto1);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto2);
  });

  it('v2 corrompida + v1 valida -> recupera o recorde da v1 e regrava a v2 por cima do lixo', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: '{quebrado', [CHAVE_STORAGE_V1]: v1(888) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(888);
    expect(lerV2Cru(st)).toMatchObject({ v: 2, hi: 888 });
    expect(st.dados.has(CHAVE_STORAGE_V1)).toBe(true);
  });

  it('v2 corrompida + so legada -> recupera da legada', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: '[1,', [CHAVE_STORAGE_LEGADA]: legado(64) });
    expect(carregarDadosV2(st, REGRAS).hi).toBe(64);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(false);
  });

  it('tudo corrompido -> padroes, sem lancar e sem apagar nada', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: 'x', [CHAVE_STORAGE_V1]: '{', [CHAVE_STORAGE_LEGADA]: '[1,' });
    expect(carregarDadosV2(st, REGRAS)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 0, prog: progressoVazio() });
    expect(st.dados.size).toBe(3);
  });

  it.each([['null'], ['[]'], ['123'], ['"texto"'], ['true'], ['{}'], ['{"v":1,"s":{},"hi":5}'], ['{"v":3,"hi":5}']])(
    'v2 com JSON valido mas forma invalida (%s) nao e aceita: cai na v1',
    (cru) => {
      const st = falso({ [CHAVE_STORAGE_V2]: cru, [CHAVE_STORAGE_V1]: v1(61) });
      expect(carregarDadosV2(st, REGRAS).hi).toBe(61);
    },
  );

  it('v2 valida com prog lixo preserva config e recorde (so o progresso zera)', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2('quebrado', 333, { rounds: 3 }) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(333);
    expect(r.s.rounds).toBe(3);
    expect(r.prog).toEqual(progressoVazio());
  });

  it('getItem lancando (storage indisponivel) -> padroes', () => {
    const st = falso();
    st.getItem = () => {
      throw new Error('SecurityError');
    };
    expect(carregarDadosV2(st, REGRAS).prog).toEqual(progressoVazio());
  });
});

describe('storage v2: falha de escrita nunca perde dado', () => {
  const dados: DadosSalvosV2 = { s: { ...CONFIGURACOES_PADRAO }, hi: 5, prog: progressoVazio() };

  it('setItem lancando -> salvarDadosV2 devolve false e nao apaga nada', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: v1(), [CHAVE_STORAGE_LEGADA]: legado() });
    st.falhaEscrita = true;
    expect(salvarDadosV2(st, dados, REGRAS)).toBe(false);
    expect(st.dados.size).toBe(2);
  });

  it('migrar da legada com a escrita falhando: devolve os dados em memoria e MANTEM a legada', () => {
    const st = falso({ [CHAVE_STORAGE_LEGADA]: legado(222) });
    st.falhaEscrita = true;
    expect(carregarDadosV2(st, REGRAS).hi).toBe(222);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(true);
    expect(st.dados.has(CHAVE_STORAGE_V2)).toBe(false);
  });

  it('migrar da v1 com a escrita falhando: v1 e legada continuam la', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: v1(5), [CHAVE_STORAGE_LEGADA]: legado() });
    st.falhaEscrita = true;
    expect(carregarDadosV2(st, REGRAS).hi).toBe(5);
    expect(st.dados.has(CHAVE_STORAGE_V1)).toBe(true);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(true);
  });

  it('removeItem lancando nao derruba o carregamento', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}), [CHAVE_STORAGE_LEGADA]: legado() });
    st.removeItem = () => {
      throw new Error('x');
    };
    expect(() => carregarDadosV2(st, REGRAS)).not.toThrow();
  });
});

describe('storage v2: rollback seguro (por isso a chave nova)', () => {
  it('o build antigo (v1) le e grava so a v1; a v2 fica intacta', () => {
    const prog = { desbloqueados: [A, B], zeradas: 2, chefeDerrotado: true, vistos: [A] };
    const bruto2 = v2(prog, 900);
    const st = falso({ [CHAVE_STORAGE_V1]: v1(400), [CHAVE_STORAGE_V2]: bruto2 });

    // build antigo roda: carrega, joga, salva
    const velho = carregarDados(st);
    expect(velho.hi).toBe(400);
    salvarDados(st, { s: velho.s, hi: 450 });

    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto2); // progresso preservado byte a byte
    expect(JSON.parse(st.dados.get(CHAVE_STORAGE_V1) as string)).toMatchObject({ v: 1, hi: 450 });

    // reavanca para o build novo: a v2 esta la com o progresso
    const novo = carregarDadosV2(st, REGRAS);
    expect(novo.prog.desbloqueados).toEqual([A, B]);
    expect(novo.prog.zeradas).toBe(2);
  });

  it('carregarDadosV2 nunca altera a v1, mesmo migrando dela', () => {
    const bruto1 = v1(321);
    const st = falso({ [CHAVE_STORAGE_V1]: bruto1 });
    carregarDadosV2(st, REGRAS);
    carregarDadosV2(st, REGRAS);
    expect(st.dados.get(CHAVE_STORAGE_V1)).toBe(bruto1);
  });

  it('as funcoes v1 continuam com o comportamento de antes (nao leem nem tocam a v2)', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [A] }, 999) });
    expect(carregarDados(st)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 0 });
    expect(salvarDados(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 3 })).toBe(true);
    expect(JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string)).toMatchObject({ hi: 999 });
  });
});

describe('storage v2: saneamento (localStorage e editavel)', () => {
  it('descarta id desconhecido, duplicado e de tipo errado; zeradas NaN/negativo vira 0', () => {
    const st = falso({
      [CHAVE_STORAGE_V2]: v2({ desbloqueados: [B, 'fantasma', B, 7, null, A], zeradas: -3, chefeDerrotado: 'true', vistos: [A, 'x'] }),
    });
    const r = carregarDadosV2(st, REGRAS);
    // 'fantasma' tem forma de id: e PRESERVADO como desconhecido (rollback de onda); 7/null/duplicado somem.
    expect(r.prog).toEqual({
      desbloqueados: [B, A],
      zeradas: 0,
      chefeDerrotado: false,
      vistos: [A],
      desconhecidos: ['fantasma'],
    });
  });

  it('lixo que nao tem forma de id (tipo errado, maiusculas, espacos, longo) e descartado', () => {
    const lixo = ['__proto__', 'Fantasma', 'com espaco', 'x'.repeat(33), '', '../etc', 7, null, {}];
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [A, ...lixo] }) });
    expect(carregarDadosV2(st, REGRAS).prog).toEqual({ ...progressoVazio(), desbloqueados: [A] });
  });

  it('iniciais nunca ficam em desbloqueados', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [H, A, C] }) });
    expect(carregarDadosV2(st, REGRAS).prog.desbloqueados).toEqual([A]);
  });

  it('config e recorde sujos sao saneados como na v1', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}, -5, { music: 9, rounds: 'tres', shake: 'sim' }) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(0);
    expect(r.s.music).toBe(1);
    expect(r.s.rounds).toBe(CONFIGURACOES_PADRAO.rounds);
    expect(r.s.shake).toBe(CONFIGURACOES_PADRAO.shake);
  });

  it('salvarDadosV2 sanea o progresso antes de gravar (disco nunca guarda lixo)', () => {
    const st = falso();
    const sujo = { desbloqueados: [A, A, 'x', H], zeradas: 1, chefeDerrotado: false, vistos: [] } as unknown as DadosSalvosV2['prog'];
    expect(salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 1, prog: sujo }, REGRAS)).toBe(true);
    expect((lerV2Cru(st)['prog'] as { desbloqueados: string[] }).desbloqueados).toEqual([A]);
  });

  it('com as regras padrao (4 ids reais) um id novo nao afeta a UI: fora de desbloqueados, so preservado', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: ['aminu', 'hayato'] }) });
    const r = carregarDadosV2(st);
    expect(r.prog.desbloqueados).toEqual([]);
    expect(r.prog.desconhecidos).toEqual(['aminu']);
  });
});

describe('storage v2: rollback de onda preserva desbloqueios desconhecidos', () => {
  // Build da onda 2 conhece NILA; o build da onda 1 (rollback) nao conhece.
  const NILA = id('nila');
  const ONDA2: Pick<Regras, 'roster' | 'iniciais'> = { roster: [H, W, M, C, A, NILA], iniciais: [H, W, M, C] };
  const ONDA1: Pick<Regras, 'roster' | 'iniciais'> = { roster: [H, W, M, C, A], iniciais: [H, W, M, C] };
  const base = { s: { ...CONFIGURACOES_PADRAO }, hi: 10 };

  it('onda 2 grava -> onda 1 carrega e salva -> onda 2 recupera o ganho (sem perda)', () => {
    const st = falso();
    salvarDadosV2(st, { ...base, prog: { desbloqueados: [A, NILA], zeradas: 2, chefeDerrotado: false, vistos: [A, NILA] } }, ONDA2);

    // build da onda 1: NILA nao afeta a UI...
    const velho = carregarDadosV2(st, ONDA1);
    expect(velho.prog.desbloqueados).toEqual([A]);
    expect(velho.prog.vistos).toEqual([A]);
    expect(velho.prog.zeradas).toBe(2);
    // ...mas sobrevive a um save do build antigo
    expect(salvarDadosV2(st, { ...velho, hi: 20 }, ONDA1)).toBe(true);
    expect((lerV2Cru(st)['prog'] as { desconhecidos: string[] }).desconhecidos).toEqual(['nila']);

    // reavanca: NILA volta como desbloqueado
    const novo = carregarDadosV2(st, ONDA2);
    expect(novo.prog.desbloqueados).toEqual([A, NILA]);
    expect(novo.prog.desconhecidos).toBeUndefined();
    expect(novo.hi).toBe(20);
  });

  it('desconhecidos nao entram em liberados nem em naoVistos (so os conhecidos afetam a UI)', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [A, 'nila'] }) });
    const { prog } = carregarDadosV2(st, ONDA1);
    expect([...liberados(prog, { ...REGRAS_PADRAO, ...ONDA1 })]).not.toContain('nila');
    expect(naoVistos(prog)).toEqual([A]);
  });

  it('zerar o Arcade no build antigo nao apaga o desconhecido', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: ['nila'], zeradas: 1 }) });
    const { prog } = carregarDadosV2(st, ONDA1);
    const r = aplicarVitoriaArcade(prog, { derrotouChefe: false }, { ...REGRAS_PADRAO, ...ONDA1, fila: [A], chefe: null });
    expect(r.novos).toEqual([A]);
    expect(r.prog.desconhecidos).toEqual(['nila']);
    expect(marcarVistos(r.prog, [A]).desconhecidos).toEqual(['nila']);
  });

  it('desconhecidos tambem lidos do campo proprio; iniciais e duplicados nao entram', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desconhecidos: ['nila', 'nila', 'hayato', 'outro'] }) });
    expect(carregarDadosV2(st, ONDA1).prog.desconhecidos).toEqual(['nila', 'outro']);
  });

  it('limite: no maximo MAX_IDS_DESCONHECIDOS ids preservados (editar o storage nao incha o disco)', () => {
    const muitos = Array.from({ length: MAX_IDS_DESCONHECIDOS + 50 }, (_, i) => `id-${i}`);
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: muitos }) });
    const r = carregarDadosV2(st, ONDA1);
    expect(r.prog.desconhecidos).toHaveLength(MAX_IDS_DESCONHECIDOS);
    expect(r.prog.desconhecidos?.[0]).toBe('id-0'); // mantem os primeiros, na ordem
  });

  it('sem desconhecidos o campo nem existe em disco (formato inalterado)', () => {
    const st = falso();
    salvarDadosV2(st, { ...base, prog: progressoVazio() }, ONDA1);
    expect(Object.keys(lerV2Cru(st)['prog'] as object).sort()).toEqual(['chefeDerrotado', 'desbloqueados', 'vistos', 'zeradas']);
  });

  it('idempotente: carregar -> salvar -> carregar nao muda nada', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ desbloqueados: [A, 'nila'], vistos: [A] }) });
    const a = carregarDadosV2(st, ONDA1);
    salvarDadosV2(st, a, ONDA1);
    expect(carregarDadosV2(st, ONDA1)).toEqual(a);
  });
});

describe('storage v2: recorde na migracao/reavanco = max(v1.hi, v2.hi)', () => {
  it('v1 com recorde maior (batido no build antigo) vence a v2 e a v2 e regravada', () => {
    const bruto1 = v1(900);
    const st = falso({ [CHAVE_STORAGE_V1]: bruto1, [CHAVE_STORAGE_V2]: v2({ desbloqueados: [A], zeradas: 3 }, 400, { rounds: 3 }) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(900);
    expect(r.prog.desbloqueados).toEqual([A]); // progresso e config seguem os da v2
    expect(r.prog.zeradas).toBe(3);
    expect(r.s.rounds).toBe(3);
    expect(lerV2Cru(st)).toMatchObject({ v: 2, hi: 900 });
    expect(st.dados.get(CHAVE_STORAGE_V1)).toBe(bruto1); // v1 intocada
  });

  it('v2 com recorde maior ou igual nao e regravada (byte a byte)', () => {
    for (const hiV1 of [100, 400]) {
      const bruto2 = v2({}, 400);
      const st = falso({ [CHAVE_STORAGE_V1]: v1(hiV1), [CHAVE_STORAGE_V2]: bruto2 });
      expect(carregarDadosV2(st, REGRAS).hi).toBe(400);
      expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto2);
    }
  });

  it('v1 invalida ou com hi lixo nao derruba o recorde da v2', () => {
    for (const cru of ['{quebrado', JSON.stringify({ v: 1, s: {}, hi: -5 }), JSON.stringify({ v: 1, s: {}, hi: 'alto' })]) {
      const st = falso({ [CHAVE_STORAGE_V1]: cru, [CHAVE_STORAGE_V2]: v2({}, 400) });
      expect(carregarDadosV2(st, REGRAS).hi).toBe(400);
    }
  });

  it('escrita falhando: devolve o maior em memoria e nao apaga nada', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: v1(900), [CHAVE_STORAGE_V2]: v2({}, 400) });
    st.falhaEscrita = true;
    expect(carregarDadosV2(st, REGRAS).hi).toBe(900);
    expect(st.dados.size).toBe(2);
  });

  it('idempotente: depois da 1a carga o disco nao muda mais', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: v1(900), [CHAVE_STORAGE_V2]: v2({}, 400) });
    carregarDadosV2(st, REGRAS);
    const disco = new Map(st.dados);
    expect(carregarDadosV2(st, REGRAS).hi).toBe(900);
    expect(st.dados).toEqual(disco);
  });
});

describe('storage v2: idempotencia e ida e volta', () => {
  it('carregar duas vezes da o mesmo resultado e nao muda o disco depois da 1a', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: v1(77), [CHAVE_STORAGE_LEGADA]: legado() });
    const a = carregarDadosV2(st, REGRAS);
    const disco = new Map(st.dados);
    const b = carregarDadosV2(st, REGRAS);
    expect(b).toEqual(a);
    expect(st.dados).toEqual(disco);
  });

  it('salvar -> carregar devolve o que foi salvo', () => {
    const st = falso();
    const dados: DadosSalvosV2 = {
      s: { ...CONFIGURACOES_PADRAO, rounds: 3, shake: false },
      hi: 12345,
      prog: { desbloqueados: [A, BOSS], zeradas: 4, chefeDerrotado: true, vistos: [A] },
    };
    expect(salvarDadosV2(st, dados, REGRAS)).toBe(true);
    expect(carregarDadosV2(st, REGRAS)).toEqual(dados);
  });

  it('o formato em disco e {v:2, s, hi, prog}', () => {
    const st = falso();
    salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 1, prog: progressoVazio() }, REGRAS);
    expect(Object.keys(lerV2Cru(st)).sort()).toEqual(['hi', 'prog', 's', 'v']);
  });
});
