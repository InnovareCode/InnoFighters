import { describe, expect, it } from 'vitest';
import {
  CHAVE_STORAGE_LEGADA,
  CHAVE_STORAGE_V1,
  CHAVE_STORAGE_V2,
  CINEMATICAS_VALIDAS,
  CINEMATICA_PADRAO,
  CONFIGURACOES_PADRAO,
  type Configuracoes,
} from '../../src/core/contratos';
import {
  CHAVE_STORAGE_V2_QUEBRADA,
  carregarDados,
  carregarDadosV2,
  sanearConfiguracoes,
  salvarDados,
  salvarDadosV2,
  type ArmazenamentoLike,
} from '../../src/core/storage';
import { REGRAS_PADRAO, progressoVazio } from '../../src/meta';
import { regrasDeQuatro, regrasExpansao } from '../../src/ui/dev-expansao';

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
const v1 = (s: object, hi = 100) => JSON.stringify({ v: 1, s, hi });
const legado = (s: object, hi = 55) => JSON.stringify({ s, hi });
const v2 = (s: object, hi = 10) => JSON.stringify({ v: 2, s, hi, prog: {} });
const lerV2Cru = (st: Falso) => JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string) as { s: Record<string, unknown> };

describe('C1: Regras.esquiva e Regras.cinematica', () => {
  it('jogo real (REGRAS_PADRAO) e ?expansao=1: as duas ligadas', () => {
    expect(REGRAS_PADRAO.esquiva).toBe(true);
    expect(REGRAS_PADRAO.cinematica).toBe(true);
    expect(regrasExpansao().esquiva).toBe(true);
    expect(regrasExpansao().cinematica).toBe(true);
  });

  it('?expansao=4 (4 originais / fidelidade): as duas desligadas, e so elas mudam', () => {
    const r = regrasDeQuatro();
    expect(r.esquiva).toBe(false);
    expect(r.cinematica).toBe(false);
    expect(r.roster).toHaveLength(4);
    expect(r.chefe).toBeNull();
  });

  it('sao booleanos estritos (nunca undefined) nos tres conjuntos', () => {
    for (const r of [REGRAS_PADRAO, regrasExpansao(), regrasDeQuatro()]) {
      expect(typeof r.esquiva).toBe('boolean');
      expect(typeof r.cinematica).toBe('boolean');
    }
  });
});

describe('C1: Configuracoes.cinematica (saneamento)', () => {
  it('os 3 valores validos passam intactos', () => {
    expect([...CINEMATICAS_VALIDAS]).toEqual(['completa', 'curta', 'desligada']);
    for (const c of CINEMATICAS_VALIDAS) expect(sanearConfiguracoes({ cinematica: c }).cinematica).toBe(c);
  });

  it('ausente continua ausente (a UI resolve o padrao); o padrao do dono e "completa"', () => {
    expect('cinematica' in sanearConfiguracoes({})).toBe(false);
    expect('cinematica' in sanearConfiguracoes(null)).toBe(false);
    expect('cinematica' in CONFIGURACOES_PADRAO).toBe(false);
    expect(sanearConfiguracoes({ rounds: 3 }).cinematica).toBeUndefined();
    expect(CINEMATICA_PADRAO).toBe('completa');
  });

  it('fora dos 3 valores -> descartado (volta ao padrao), sem derrubar os outros campos', () => {
    const lixos: unknown[] = ['Completa', 'COMPLETA', ' curta', 'curta ', 'off', 'lenta', '', 'true', 1, 0, true, false, null, ['curta'], { v: 'curta' }, '__proto__', 'constructor'];
    for (const lixo of lixos) {
      const r = sanearConfiguracoes({ cinematica: lixo, rounds: 3, shake: false });
      expect('cinematica' in r).toBe(false);
      expect(r).toMatchObject({ rounds: 3, shake: false });
    }
  });

  it('um campo ruim em outro lugar nao leva a preferencia valida', () => {
    expect(sanearConfiguracoes({ cinematica: 'curta', rounds: 1e9 }).cinematica).toBe('curta');
  });

  it('nao muta o CONFIGURACOES_PADRAO congelado', () => {
    sanearConfiguracoes({ cinematica: 'desligada' });
    expect('cinematica' in CONFIGURACOES_PADRAO).toBe(false);
  });
});

describe('C1: cinematica pelos caminhos de carga e gravacao', () => {
  it('v2 com preferencia valida: carrega intacta', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ cinematica: 'desligada' }) });
    expect(carregarDadosV2(st).s.cinematica).toBe('desligada');
  });

  it('v2 com valor invalido: volta ao padrao (ausente)', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ cinematica: 'turbo', rounds: 3 }) });
    const r = carregarDadosV2(st);
    expect(r.s.cinematica).toBeUndefined();
    expect(r.s.rounds).toBe(3);
  });

  it('v1 (e v1 -> v2) mantem a preferencia valida e descarta a invalida', () => {
    expect(carregarDados(falso({ [CHAVE_STORAGE_V1]: v1({ cinematica: 'curta' }) })).s.cinematica).toBe('curta');
    expect(carregarDados(falso({ [CHAVE_STORAGE_V1]: v1({ cinematica: 'x' }) })).s.cinematica).toBeUndefined();
    const st = falso({ [CHAVE_STORAGE_V1]: v1({ cinematica: 'curta' }) });
    expect(carregarDadosV2(st).s.cinematica).toBe('curta');
    expect(lerV2Cru(st).s['cinematica']).toBe('curta'); // a v2 gravada na migracao leva o campo
    expect(st.dados.get(CHAVE_STORAGE_V1)).toBe(v1({ cinematica: 'curta' })); // v1 intacta
  });

  it('legada (sakura-fighters-v4) valida e invalida', () => {
    expect(carregarDados(falso({ [CHAVE_STORAGE_LEGADA]: legado({ cinematica: 'desligada' }) })).s.cinematica).toBe('desligada');
    expect(carregarDados(falso({ [CHAVE_STORAGE_LEGADA]: legado({ cinematica: 42 }) })).s.cinematica).toBeUndefined();
    expect(carregarDadosV2(falso({ [CHAVE_STORAGE_LEGADA]: legado({ cinematica: 'curta' }) })).s.cinematica).toBe('curta');
    expect(carregarDadosV2(falso({ [CHAVE_STORAGE_LEGADA]: legado({ cinematica: 'x' }) })).s.cinematica).toBeUndefined();
  });

  it('sem nada salvo: padroes, sem o campo', () => {
    expect('cinematica' in carregarDadosV2(falso()).s).toBe(false);
    expect('cinematica' in carregarDados(falso()).s).toBe(false);
  });

  it('salvarDadosV2 sanea na gravacao: valida grava, invalida nao vai para o disco', () => {
    const st = falso();
    expect(salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, cinematica: 'curta' }, hi: 1, prog: progressoVazio() })).toBe(true);
    expect(lerV2Cru(st).s['cinematica']).toBe('curta');
    const ruim = { ...CONFIGURACOES_PADRAO, cinematica: 'lixo' } as unknown as Configuracoes;
    expect(salvarDadosV2(st, { s: ruim, hi: 1, prog: progressoVazio() })).toBe(true);
    expect('cinematica' in lerV2Cru(st).s).toBe(false);
  });

  it('salvar sem a preferencia nao inventa o campo', () => {
    const st = falso();
    salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 1, prog: progressoVazio() });
    expect('cinematica' in lerV2Cru(st).s).toBe(false);
  });

  it('salvarDados (v1) so grava o que o chamador passou; o saneamento fica na leitura', () => {
    const st = falso();
    expect(salvarDados(st, { s: { ...CONFIGURACOES_PADRAO, cinematica: 'curta' }, hi: 2 })).toBe(true);
    expect(carregarDados(st).s.cinematica).toBe('curta');
  });

  it('ida e volta: salvar -> carregar devolve a mesma preferencia, nos 3 valores', () => {
    for (const c of CINEMATICAS_VALIDAS) {
      const st = falso();
      salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, cinematica: c }, hi: 5, prog: progressoVazio() });
      expect(carregarDadosV2(st).s.cinematica).toBe(c);
    }
  });

  it('rollback: v1 de recorde maior mescla o hi sem perder a preferencia da v2', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: v2({ cinematica: 'curta' }, 10), [CHAVE_STORAGE_V1]: v1({}, 9999) });
    const r = carregarDadosV2(st);
    expect(r.hi).toBe(9999);
    expect(r.s.cinematica).toBe('curta');
    expect(lerV2Cru(st).s['cinematica']).toBe('curta'); // a regravacao do merge preservou o campo
  });

  it('rollback: build anterior que regrava a v2 sem o campo -> volta ao padrao, sem erro', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: JSON.stringify({ v: 2, s: { rounds: 3 }, hi: 7, prog: {} }) });
    const r = carregarDadosV2(st);
    expect(r.s.cinematica).toBeUndefined();
    expect(r.s.rounds).toBe(3);
  });

  it('v2 de build mais novo (v:3) nao e sobrescrita por causa da preferencia', () => {
    const futura = JSON.stringify({ v: 3, s: { cinematica: 'curta' } });
    const st = falso({ [CHAVE_STORAGE_V2]: futura });
    expect(salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, cinematica: 'desligada' }, hi: 1, prog: progressoVazio() })).toBe(false);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(futura);
  });

  it('v2 corrompida: cai para a v1 valida com a preferencia e guarda a copia quebrada', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: '{lixo', [CHAVE_STORAGE_V1]: v1({ cinematica: 'desligada' }) });
    expect(carregarDadosV2(st).s.cinematica).toBe('desligada');
    expect(st.dados.get(CHAVE_STORAGE_V2_QUEBRADA)).toBe('{lixo');
  });
});
