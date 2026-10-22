import { describe, expect, it } from 'vitest';
import { CHAVE_STORAGE_V2 } from '../../src/core/contratos';
import { carregarDadosV2 } from '../../src/core/storage';
import { REGRAS_PADRAO } from '../../src/meta';
import { criarPersistencia } from '../../src/ui/persistencia';
import { modoDaCinematica } from '../../src/render/cinematica';
import { modoDaProvocacao } from '../../src/render/provocacao';
import { navegadorFalso } from './_ui';

/*
 * Decisão do dono (2026-10-21): as frentes pedidas (cinemática do especial, provocações) ficam SEMPRE LIGADAS, sem chave nas Opções.
 * O movimento reduzido do SISTEMA continua sendo respeitado (acessibilidade, não opção do jogo). Saves antigos com a preferência
 * seguem legíveis e NÃO são apagados do disco, mas deixam de valer.
 */

function abrir(settings = {}, regras = REGRAS_PADRAO) {
  const n = navegadorFalso(settings, regras);
  const cena = n.ui.cenas.options as unknown as {
    enter(a: { from: string }): void;
    m: { items: Array<{ label: string; value?: () => string; onAdjust?: (d: number) => void; onOk?: () => void }> };
  };
  cena.enter({ from: 'menu' });
  const item = (rotulo: string) => cena.m.items.find((i) => i.label === rotulo);
  return { ...n, cena, item };
}

describe('Opções sem chaves de recurso', () => {
  it('a tela é a do protótipo: 9 linhas, sem CINEMÁTICA DO ESPECIAL nem PROVOCAÇÕES (com ou sem as regras novas)', () => {
    for (const regras of [REGRAS_PADRAO, { ...REGRAS_PADRAO, cinematica: false }]) {
      const t = abrir({}, regras);
      expect(t.cena.m.items.map((i) => i.label)).toEqual([
        'MÚSICA',
        'EFEITOS SONOROS',
        'ROUNDS PARA VENCER',
        'TEMPO DO ROUND',
        'DIFICULDADE PADRÃO',
        'TREMOR DE TELA',
        'TELA CHEIA (F)',
        'RESTAURAR PADRÕES',
        'VOLTAR',
      ]);
    }
  });

  it('RESTAURAR PADRÕES continua apagando as preferências aposentadas da memória (e mantém volumes/rounds nos padrões)', () => {
    const t = abrir({ cinematica: 'desligada', provocacoes: 'desligadas', rounds: 3 });
    t.item('RESTAURAR PADRÕES')?.onOk?.();
    expect('cinematica' in t.persist.settings).toBe(false);
    expect('provocacoes' in t.persist.settings).toBe(false);
    expect(t.persist.settings.rounds).toBe(2);
  });
});

describe('preferências antigas no save: ignoradas, não apagadas', () => {
  const armazenamento = (inicial: Record<string, string> = {}) => {
    const mem = new Map(Object.entries(inicial));
    return { mem, getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => void mem.set(k, v), removeItem: (k: string) => void mem.delete(k) };
  };
  const salvoAntigo = JSON.stringify({ v: 2, s: { music: 0.3, cinematica: 'desligada', provocacoes: 'desligadas' }, hi: 10, prog: {} });

  it('na memória o jogo não as vê (cinemática e provocações valem como no padrão do dono)', () => {
    const arm = armazenamento({ [CHAVE_STORAGE_V2]: salvoAntigo });
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, () => undefined);
    expect(p.settings.cinematica).toBeUndefined();
    expect(p.settings.provocacoes).toBeUndefined();
    expect(p.settings.music).toBe(0.3); // o resto do save vale
    expect(modoDaCinematica(p.settings.cinematica, REGRAS_PADRAO, false)).toBe('completa');
    expect(modoDaProvocacao('rodada', p.settings.cinematica, false, false)).toBe('completa');
  });

  it('ao gravar, o disco continua com os campos antigos (save aditivo) e o resto reflete o estado atual', () => {
    const arm = armazenamento({ [CHAVE_STORAGE_V2]: salvoAntigo });
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, () => undefined);
    p.settings.rounds = 3;
    expect(p.salvar()).toBe(true);
    const disco = carregarDadosV2(arm, REGRAS_PADRAO).s;
    expect(disco.cinematica).toBe('desligada');
    expect(disco.provocacoes).toBe('desligadas');
    expect(disco.rounds).toBe(3);
  });

  it('movimento reduzido do SISTEMA continua respeitado: a cinemática e a provocação saem CURTAS', () => {
    expect(modoDaCinematica(undefined, REGRAS_PADRAO, true)).toBe('curta');
    expect(modoDaProvocacao('rodada', undefined, true, false)).toBe('curta');
    expect(modoDaProvocacao('rodada', undefined, false, false)).toBe('completa');
  });

  it('save sem os campos segue igual', () => {
    const arm = armazenamento();
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, () => undefined);
    expect(p.salvar()).toBe(true);
    const disco = carregarDadosV2(arm, REGRAS_PADRAO).s;
    expect('cinematica' in disco).toBe(false);
    expect('provocacoes' in disco).toBe(false);
  });
});
