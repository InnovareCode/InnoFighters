import { describe, expect, it } from 'vitest';
import {
  CHAVE_STORAGE_V1,
  CHAVE_STORAGE_V2,
  CONFIGURACOES_PADRAO,
  PROVOCACOES_PADRAO,
  PROVOCACOES_VALIDAS,
} from '../../src/core/contratos';
import { carregarDadosV2, sanearConfiguracoes, salvarDadosV2, type ArmazenamentoLike } from '../../src/core/storage';
import { progressoVazio } from '../../src/meta';

function falso(inicial: Record<string, string> = {}): ArmazenamentoLike & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v), removeItem: (k) => void dados.delete(k) };
}

describe('preferência `provocacoes` no storage v2 (aditiva, C4)', () => {
  it('o padrão é ligadas e os valores válidos são só os dois', () => {
    expect(PROVOCACOES_PADRAO).toBe('ligadas');
    expect([...PROVOCACOES_VALIDAS]).toEqual(['ligadas', 'desligadas']);
    expect('provocacoes' in CONFIGURACOES_PADRAO).toBe(false); // ausente = padrão (como `cinematica`)
  });

  it('sanearConfiguracoes aceita os dois valores e nada além', () => {
    expect(sanearConfiguracoes({ provocacoes: 'desligadas' }).provocacoes).toBe('desligadas');
    expect(sanearConfiguracoes({ provocacoes: 'ligadas' }).provocacoes).toBe('ligadas');
    for (const lixo of ['', 'LIGADAS', 'on', 'curta', 'completa', 1, 0, true, false, null, [], {}, 'ligadas ', '__proto__']) {
      const s = sanearConfiguracoes({ provocacoes: lixo });
      expect(s.provocacoes, JSON.stringify(lixo)).toBeUndefined();
      expect('provocacoes' in s).toBe(false);
    }
  });

  it('não interfere nos outros campos nem na cinemática (opções independentes)', () => {
    const s = sanearConfiguracoes({ cinematica: 'curta', provocacoes: 'desligadas', rounds: 3 });
    expect(s.cinematica).toBe('curta');
    expect(s.provocacoes).toBe('desligadas');
    expect(s.rounds).toBe(3);
    const so = sanearConfiguracoes({ cinematica: 'desligada' });
    expect(so.provocacoes).toBeUndefined(); // desligar a cinemática NÃO desliga as provocações
  });

  it('save v2 antigo (sem o campo) carrega igual a antes: sem `provocacoes` e sem perder nada', () => {
    const antigo = JSON.stringify({ v: 2, s: { music: 0.3, sfx: 0.5, rounds: 3, time: 60, diff: 2, shake: false, cinematica: 'curta' }, hi: 12345, prog: progressoVazio() });
    const st = falso({ [CHAVE_STORAGE_V2]: antigo });
    const d = carregarDadosV2(st);
    expect(d.hi).toBe(12345);
    expect(d.s).toEqual({ music: 0.3, sfx: 0.5, rounds: 3, time: 60, diff: 2, shake: false, cinematica: 'curta' });
    expect('provocacoes' in d.s).toBe(false);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(antigo); // só ler não reescreve o disco
  });

  it('ida e volta: salvar desligadas e carregar devolve desligadas; ligadas explícito também sobrevive', () => {
    for (const valor of ['desligadas', 'ligadas'] as const) {
      const st = falso();
      expect(salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, provocacoes: valor }, hi: 7, prog: progressoVazio() })).toBe(true);
      expect(JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string).s.provocacoes).toBe(valor);
      expect(JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string).v).toBe(2); // sem bump de versão
      expect(carregarDadosV2(st).s.provocacoes).toBe(valor);
    }
  });

  it('ao gravar, valor adulterado no objeto em memória NÃO vai para o disco', () => {
    const st = falso();
    salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, provocacoes: 'hackeado' as never }, hi: 0, prog: progressoVazio() });
    expect('provocacoes' in JSON.parse(st.dados.get(CHAVE_STORAGE_V2) as string).s).toBe(false);
  });

  it('v2 com valor lixo no disco carrega como ausente (= ligadas), sem derrubar o resto', () => {
    const st = falso({ [CHAVE_STORAGE_V2]: JSON.stringify({ v: 2, s: { provocacoes: 'talvez', rounds: 3 }, hi: 9, prog: progressoVazio() }) });
    const d = carregarDadosV2(st);
    expect(d.s.provocacoes).toBeUndefined();
    expect(d.s.rounds).toBe(3);
    expect(d.hi).toBe(9);
  });

  it('v > 2 (build mais novo) continua INTOCADO: não é lido, não é sobrescrito, nada de `provocacoes` é escrito por cima', () => {
    const futura = JSON.stringify({ v: 3, s: { provocacoes: 'desligadas', rounds: 3 }, hi: 54321, campoNovo: { x: 1 } });
    const st = falso({ [CHAVE_STORAGE_V2]: futura });
    expect(carregarDadosV2(st).s.provocacoes).toBeUndefined(); // joga com padrões em memória
    expect(salvarDadosV2(st, { s: { ...CONFIGURACOES_PADRAO, provocacoes: 'desligadas' }, hi: 1, prog: progressoVazio() })).toBe(false);
    expect(st.dados.get(CHAVE_STORAGE_V2)).toBe(futura);
  });

  it('migração da v1 (sem o campo) continua sem o campo', () => {
    const st = falso({ [CHAVE_STORAGE_V1]: JSON.stringify({ v: 1, s: { rounds: 3 }, hi: 5 }) });
    const d = carregarDadosV2(st);
    expect('provocacoes' in d.s).toBe(false);
    expect(d.s.rounds).toBe(3);
  });
});
