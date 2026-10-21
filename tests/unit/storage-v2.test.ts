import { describe, expect, it } from 'vitest';
import {
  CHAVE_STORAGE_LEGADA,
  CHAVE_STORAGE_V1,
  CHAVE_STORAGE_V2,
  CONFIGURACOES_PADRAO,
  type IdLutador,
} from '../../src/core/contratos';
import {
  CHAVE_STORAGE_V2_QUEBRADA,
  MAX_CONTROLES,
  MAX_TAMANHO_CONTROLE,
  TETO_RECORDE,
  carregarDados,
  carregarDadosV2,
  sanearConfiguracoes,
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
    // nada apagado/sobrescrito; so a copia da v2 ilegivel e acrescentada
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe('x');
    expect(st.dados.get(CHAVE_STORAGE_V1)).toBe('{');
    expect(st.dados.get(CHAVE_STORAGE_LEGADA)).toBe('[1,');
    expect(st.dados.get(CHAVE_STORAGE_V2_QUEBRADA)).toBe('x');
    expect(st.dados.size).toBe(4);
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

// ---------------------------------------------------------------------------
// Achados do Orion (E8 previa): M1, M3, B1, B2, B3
// ---------------------------------------------------------------------------

describe('storage v2: M1 configuracoes so aceitam o que a UI oferece', () => {
  it('valores que a UI oferece passam intactos', () => {
    for (const rounds of [1, 2, 3]) expect(sanearConfiguracoes({ rounds }).rounds).toBe(rounds);
    for (const time of [0, 30, 60, 99]) expect(sanearConfiguracoes({ time }).time).toBe(time);
    for (const diff of [0, 1, 2]) expect(sanearConfiguracoes({ diff }).diff).toBe(diff);
  });

  it('rounds fora de 1..3 inteiro -> padrao (1e9 travava o HUD)', () => {
    for (const lixo of [1e9, 0, -1, 2.5, 4, 99, Number.MAX_SAFE_INTEGER, '2', null, true, [2], {}]) {
      expect(sanearConfiguracoes({ rounds: lixo }).rounds).toBe(CONFIGURACOES_PADRAO.rounds);
    }
  });

  it('time fora de 0/30/60/99 -> padrao (0 = sem limite continua valido)', () => {
    for (const lixo of [1e9, -1, 2.5, 45, 100, '60', null]) {
      expect(sanearConfiguracoes({ time: lixo }).time).toBe(CONFIGURACOES_PADRAO.time);
    }
    expect(sanearConfiguracoes({ time: 0 }).time).toBe(0);
  });

  it('diff fora de 0..2 -> padrao', () => {
    for (const lixo of [99, -1, 3, 1.5, 1e9, '1', null]) {
      expect(sanearConfiguracoes({ diff: lixo }).diff).toBe(CONFIGURACOES_PADRAO.diff);
    }
  });

  it('um campo ruim nao leva os outros: so ele cai no padrao', () => {
    const r = sanearConfiguracoes({ rounds: 1e9, time: 60, diff: 2, music: 0.3 });
    expect(r).toMatchObject({ rounds: CONFIGURACOES_PADRAO.rounds, time: 60, diff: 2, music: 0.3 });
  });

  it('pelo caminho de carga da v2, da v1 (v2 e v1 antiga) com disco adulterado', () => {
    const adulterado = { rounds: 1e9, time: 5000, diff: 99 };
    const padrao = { rounds: CONFIGURACOES_PADRAO.rounds, time: CONFIGURACOES_PADRAO.time, diff: CONFIGURACOES_PADRAO.diff };
    expect(carregarDadosV2(falso({ [CHAVE_STORAGE_V2]: v2({}, 1, adulterado) }), REGRAS).s).toMatchObject(padrao);
    expect(carregarDadosV2(falso({ [CHAVE_STORAGE_V1]: v1(1, adulterado) }), REGRAS).s).toMatchObject(padrao);
    expect(carregarDados(falso({ [CHAVE_STORAGE_V1]: v1(1, adulterado) })).s).toMatchObject(padrao);
  });

  it('salvarDadosV2 sanea s: o disco nunca guarda rounds 1e9', () => {
    const st = falso();
    const sujo = { ...CONFIGURACOES_PADRAO, rounds: 1e9, time: -5, diff: 99, music: 7 };
    expect(salvarDadosV2(st, { s: sujo, hi: 1, prog: progressoVazio() }, REGRAS)).toBe(true);
    expect(lerV2Cru(st)['s']).toMatchObject({ rounds: CONFIGURACOES_PADRAO.rounds, time: 99, diff: 1, music: 1 });
  });
});

describe('storage v2: M3 v>2 e v2 corrompida nao apagam a v2', () => {
  const rico = {
    desbloqueados: [A, B],
    zeradas: 9,
    chefeDerrotado: true,
    vistos: [A],
    desconhecidos: ['futuro-1', 'futuro-2'],
  };
  const futura = (v: number) => JSON.stringify({ v, s: { rounds: 3 }, hi: 54321, prog: rico, campoNovo: { x: 1 } });

  it.each([[3], [4], [2.5], [1e308]])('v:%s com progresso rico sobrevive a carregar + salvar (byte a byte)', (versao) => {
    const bruto = futura(versao);
    const st = falso({ [CHAVE_STORAGE_V2]: bruto });
    const carregado = carregarDadosV2(st, REGRAS);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto); // carregar nao escreve
    // o build antigo continua jogavel (em memoria) e tenta salvar varias vezes: recusa, sem tocar no disco
    expect(salvarDadosV2(st, { ...carregado, hi: 999 }, REGRAS)).toBe(false);
    expect(salvarDadosV2(st, { ...carregado, prog: { ...carregado.prog, zeradas: 1 } }, REGRAS)).toBe(false);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto);
    expect(st.dados.has(CHAVE_STORAGE_V2_QUEBRADA)).toBe(false); // futura nao e "quebrada"
  });

  it('v>2 + v1: joga com a v1 em memoria, sem gravar a v2 e sem apagar a legada', () => {
    const bruto = futura(3);
    const st = falso({ [CHAVE_STORAGE_V2]: bruto, [CHAVE_STORAGE_V1]: v1(70), [CHAVE_STORAGE_LEGADA]: legado(5) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(70);
    expect(r.prog).toEqual(progressoVazio());
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(true);
  });

  it('v>2 sem nada mais: padroes em memoria, nada gravado alem da v2 que ja existia', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: futura(3) });
    expect(carregarDadosV2(st, REGRAS)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 0, prog: progressoVazio() });
    expect([...st.dados.keys()]).toEqual([CHAVE_STORAGE_V2]);
  });

  it('v2 corrompida: o cru vai para inno-fighters-v2-quebrada antes de a v2 ser substituida', () => {
    const cru = '{"v":2,"hi":900,"prog":{"desbloq';
    const st = falso({ [CHAVE_STORAGE_V2]: cru, [CHAVE_STORAGE_V1]: v1(30) });
    const r = carregarDadosV2(st, REGRAS);
    expect(r.hi).toBe(30);
    expect(st.dados.get(CHAVE_STORAGE_V2_QUEBRADA)).toBe(cru);
    expect(lerV2Cru(st)).toMatchObject({ v: 2, hi: 30 }); // recuperada da v1, como antes
  });

  it.each([['null'], ['[]'], ['123'], ['{}'], ['{"v":1,"s":{},"hi":5}'], ['{"v":"3"}']])(
    'forma que nao e v2 (%s) tambem e copiada antes de ser substituida',
    (cru) => {
      const st = falso({ [CHAVE_STORAGE_V2]: cru, [CHAVE_STORAGE_V1]: v1(61) });
      carregarDadosV2(st, REGRAS);
      expect(st.dados.get(CHAVE_STORAGE_V2_QUEBRADA)).toBe(cru);
    },
  );

  it('nao sobrescreve uma copia que ja existe (a primeira evidencia fica)', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: 'segunda-quebra', [CHAVE_STORAGE_V2_QUEBRADA]: 'primeira-quebra' });
    carregarDadosV2(st, REGRAS);
    expect(st.dados.get(CHAVE_STORAGE_V2_QUEBRADA)).toBe('primeira-quebra');
  });

  it('salvar por cima de uma v2 corrompida (sem ter carregado antes) tambem guarda a copia', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: '{lixo' });
    expect(salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 1, prog: progressoVazio() }, REGRAS)).toBe(true);
    expect(st.dados.get(CHAVE_STORAGE_V2_QUEBRADA)).toBe('{lixo');
    expect(lerV2Cru(st)).toMatchObject({ v: 2, hi: 1 });
  });

  it('v2 valida nao cria copia nenhuma; ausente tambem nao', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}, 5) });
    carregarDadosV2(st, REGRAS);
    salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 6, prog: progressoVazio() }, REGRAS);
    expect(st.dados.has(CHAVE_STORAGE_V2_QUEBRADA)).toBe(false);
    const vazio = falso();
    salvarDadosV2(vazio, { s: { ...CONFIGURACOES_PADRAO }, hi: 6, prog: progressoVazio() }, REGRAS);
    expect(vazio.dados.has(CHAVE_STORAGE_V2_QUEBRADA)).toBe(false);
  });

  it('cota cheia ao copiar nao derruba o carregamento', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: '{lixo', [CHAVE_STORAGE_V1]: v1(44) });
    st.falhaEscrita = true;
    expect(carregarDadosV2(st, REGRAS).hi).toBe(44);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe('{lixo');
  });
});

describe('storage v2: B1 controles com teto', () => {
  it('no maximo MAX_CONTROLES entradas, mantendo as primeiras', () => {
    const muitos = Object.fromEntries(Array.from({ length: 5000 }, (_, i) => [`k${i}`, 'v']));
    const r = sanearConfiguracoes({ controles: muitos }).controles ?? {};
    expect(Object.keys(r)).toHaveLength(MAX_CONTROLES);
    expect(Object.keys(r)[0]).toBe('k0');
  });

  it('chave ou valor maior que o limite e descartado; no limite exato passa', () => {
    const ok = 'x'.repeat(MAX_TAMANHO_CONTROLE);
    const longo = 'x'.repeat(MAX_TAMANHO_CONTROLE + 1);
    const r = sanearConfiguracoes({ controles: { [ok]: ok, [longo]: 'v', k: longo, bom: 'KeyA', num: 7 } }).controles;
    expect(r).toEqual({ [ok]: ok, bom: 'KeyA' });
  });

  it('__proto__ nao entra; salvarDadosV2 tambem limita o que grava', () => {
    const st = falso();
    const muitos = Object.fromEntries(Array.from({ length: 200 }, (_, i) => [`k${i}`, 'v']));
    const proto = JSON.parse('{"__proto__":"x","a":"b"}') as Record<string, string>;
    expect(sanearConfiguracoes({ controles: proto }).controles).toEqual({ a: 'b' });
    salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, controles: muitos }, hi: 1, prog: progressoVazio() }, REGRAS);
    expect(Object.keys((lerV2Cru(st)['s'] as { controles: object }).controles)).toHaveLength(MAX_CONTROLES);
  });
});

describe('storage v2: B2/B3 salvarDadosV2 sanea s e hi; max(v1,v2) usa o hi saneado', () => {
  const grava = (hi: number) => {
    const st = falso();
    salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO }, hi, prog: progressoVazio() }, REGRAS);
    return lerV2Cru(st)['hi'];
  };

  it.each([
    [1e308, 0],
    [Infinity, 0],
    [NaN, 0],
    [-5, 0],
    [2.9, 2],
    [123456, 123456],
    [TETO_RECORDE, TETO_RECORDE],
    [TETO_RECORDE + 1, 0],
    [Number.MAX_SAFE_INTEGER, 0],
  ])('hi %s e gravado como %s', (entrada, esperado) => {
    expect(grava(entrada)).toBe(esperado);
  });

  it('hi nao numerico em memoria (cast) vira 0', () => {
    expect(grava('9' as unknown as number)).toBe(0);
  });

  it('v1 com hi 1e308 nao contamina o max: vale o hi saneado e a v2 fica intacta', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}, 10), [CHAVE_STORAGE_V1]: v1(1e308) });
    const bruto2 = st.dados.get(CHAVE_STORAGE_V2);
    expect(carregarDadosV2(st, REGRAS).hi).toBe(10);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(bruto2);
  });

  it('v2 com hi 1e308 no disco: lido como 0 e a v1 legitima vence o max', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}, 1e308), [CHAVE_STORAGE_V1]: v1(80) });
    expect(carregarDadosV2(st, REGRAS).hi).toBe(80);
    expect(lerV2Cru(st)['hi']).toBe(80);
  });

  it('v1 fracionaria 80.7 entra como 80 no max e e gravada inteira', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}, 10), [CHAVE_STORAGE_V1]: v1(80.7) });
    expect(carregarDadosV2(st, REGRAS).hi).toBe(80);
    expect(lerV2Cru(st)['hi']).toBe(80);
  });

  it('o recorde legitimo (v1 > v2) continua valendo apos o saneamento', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({}, 10), [CHAVE_STORAGE_V1]: v1(5000) });
    expect(carregarDadosV2(st, REGRAS).hi).toBe(5000);
  });
});
