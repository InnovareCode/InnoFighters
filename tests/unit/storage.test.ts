import { describe, expect, it } from 'vitest';
import { CHAVE_STORAGE, CHAVE_STORAGE_LEGADA, CONFIGURACOES_PADRAO } from '../../src/core/contratos';
import { carregarDados, salvarDados, sanearConfiguracoes, type ArmazenamentoLike } from '../../src/core/storage';

function falso(inicial: Record<string, string> = {}): ArmazenamentoLike & { dados: Map<string, string> } {
  const dados = new Map(Object.entries(inicial));
  return {
    dados,
    getItem: (k) => dados.get(k) ?? null,
    setItem: (k, v) => void dados.set(k, v),
    removeItem: (k) => void dados.delete(k),
  };
}

describe('storage: migracao sakura-fighters-v4 -> inno-fighters-v1 (C4)', () => {
  it('sem nada salvo devolve os padroes e nao grava', () => {
    const st = falso();
    expect(carregarDados(st)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 0 });
    expect(st.dados.size).toBe(0);
  });

  it('migra s e hi da chave antiga, grava no formato {v:1,s,hi} e apaga a antiga', () => {
    const antigo = { s: { music: 0.1, sfx: 0.2, rounds: 3, time: 60, diff: 2, shake: false }, hi: 123456 };
    const st = falso({ [CHAVE_STORAGE_LEGADA]: JSON.stringify(antigo) });
    const r = carregarDados(st);
    expect(r).toEqual({ s: antigo.s, hi: 123456 });
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(false);
    expect(JSON.parse(st.dados.get(CHAVE_STORAGE) as string)).toEqual({ v: 1, s: antigo.s, hi: 123456 });
  });

  it('migracao e uma vez so: segunda carga le a chave nova e nada mais muda', () => {
    const st = falso({ [CHAVE_STORAGE_LEGADA]: JSON.stringify({ s: { rounds: 3 }, hi: 9 }) });
    const primeira = carregarDados(st);
    const gravado = st.dados.get(CHAVE_STORAGE);
    const segunda = carregarDados(st);
    expect(segunda).toEqual(primeira);
    expect(st.dados.get(CHAVE_STORAGE)).toBe(gravado);
    expect(primeira.s.rounds).toBe(3);
    expect(primeira.s.music).toBe(CONFIGURACOES_PADRAO.music); // campo ausente cai no padrao
  });

  it('chave antiga parcial (so hi) preserva o recorde', () => {
    const st = falso({ [CHAVE_STORAGE_LEGADA]: JSON.stringify({ hi: 777 }) });
    expect(carregarDados(st)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 777 });
  });

  it('se as duas existem, a nova vence e a antiga e apagada sem sobrescrever a nova', () => {
    const nova = { v: 1, s: { ...CONFIGURACOES_PADRAO, rounds: 1 }, hi: 50 };
    const st = falso({
      [CHAVE_STORAGE]: JSON.stringify(nova),
      [CHAVE_STORAGE_LEGADA]: JSON.stringify({ s: { rounds: 3 }, hi: 999 }),
    });
    expect(carregarDados(st)).toEqual({ s: nova.s, hi: 50 });
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(false);
    expect(JSON.parse(st.dados.get(CHAVE_STORAGE) as string)).toEqual(nova);
  });

  it('chave nova corrompida cai na antiga (nao perde o recorde)', () => {
    const st = falso({ [CHAVE_STORAGE]: '{quebrado', [CHAVE_STORAGE_LEGADA]: JSON.stringify({ s: {}, hi: 42 }) });
    expect(carregarDados(st).hi).toBe(42);
  });

  it('JSON corrompido nas duas chaves -> padroes, sem excecao', () => {
    const st = falso({ [CHAVE_STORAGE]: 'x', [CHAVE_STORAGE_LEGADA]: '[1,' });
    expect(carregarDados(st)).toEqual({ s: CONFIGURACOES_PADRAO, hi: 0 });
  });

  it('se gravar a chave nova falhar, NAO apaga a antiga', () => {
    const st = falso({ [CHAVE_STORAGE_LEGADA]: JSON.stringify({ s: {}, hi: 5 }) });
    st.setItem = () => {
      throw new Error('cota');
    };
    expect(carregarDados(st).hi).toBe(5);
    expect(st.dados.has(CHAVE_STORAGE_LEGADA)).toBe(true);
  });

  it('salvarDados devolve false quando o storage lanca', () => {
    const st = falso();
    st.setItem = () => {
      throw new Error('modo privado');
    };
    expect(salvarDados(st, { s: { ...CONFIGURACOES_PADRAO }, hi: 1 })).toBe(false);
  });
});

describe('sanearConfiguracoes', () => {
  it('ignora tipos errados e fixa volume em [0,1]', () => {
    const r = sanearConfiguracoes({ music: 7, sfx: 'alto', rounds: NaN, shake: 'sim', controles: { a: 'KeyA', b: 3 } });
    expect(r.music).toBe(1);
    expect(r.sfx).toBe(CONFIGURACOES_PADRAO.sfx);
    expect(r.rounds).toBe(CONFIGURACOES_PADRAO.rounds);
    expect(r.shake).toBe(CONFIGURACOES_PADRAO.shake);
    expect(r.controles).toEqual({ a: 'KeyA' });
  });
  it('lixo que nao e objeto vira padrao', () => {
    expect(sanearConfiguracoes(null)).toEqual(CONFIGURACOES_PADRAO);
    expect(sanearConfiguracoes('x')).toEqual(CONFIGURACOES_PADRAO);
  });
});
