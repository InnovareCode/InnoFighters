import { describe, expect, it } from 'vitest';
import { CINEMATICA_PADRAO } from '../../src/core/contratos';
import { REGRAS_PADRAO } from '../../src/meta';
import { cinematicaResolvida } from '../../src/ui/cenas/options';
import { navegadorFalso } from './_ui';

/** A linha "CINEMÁTICA DO ESPECIAL" das Opções (decisão do dono: COMPLETA | CURTA | DESLIGADA, padrão COMPLETA, reduced-motion => CURTA). */
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

describe('opção CINEMÁTICA DO ESPECIAL', () => {
  it('cinematicaResolvida: o salvo vale; sem salvo, COMPLETA (ou CURTA com movimento reduzido)', () => {
    expect(cinematicaResolvida(undefined, false)).toBe(CINEMATICA_PADRAO);
    expect(cinematicaResolvida(undefined, true)).toBe('curta');
    expect(cinematicaResolvida('completa', true)).toBe('completa');
    expect(cinematicaResolvida('desligada', false)).toBe('desligada');
  });

  it('mostra COMPLETA sem preferência; as setas percorrem COMPLETA -> CURTA -> DESLIGADA -> COMPLETA e cada escolha é gravada', () => {
    const t = abrir();
    const linha = t.item('CINEMÁTICA DO ESPECIAL');
    expect(linha).toBeDefined();
    expect(linha?.value?.()).toBe('COMPLETA');
    expect(t.persist.settings.cinematica).toBeUndefined(); // só olhar não grava
    const gravacoes = t.salvou.n;
    linha?.onAdjust?.(1);
    expect(linha?.value?.()).toBe('CURTA');
    expect(t.persist.settings.cinematica).toBe('curta');
    linha?.onAdjust?.(1);
    expect(linha?.value?.()).toBe('DESLIGADA');
    expect(t.persist.settings.cinematica).toBe('desligada');
    linha?.onAdjust?.(1);
    expect(linha?.value?.()).toBe('COMPLETA');
    expect(t.salvou.n).toBe(gravacoes + 3);
    linha?.onAdjust?.(-1);
    expect(t.persist.settings.cinematica).toBe('desligada');
  });

  it('RESTAURAR PADRÕES apaga a preferência (o padrão não tem o campo e o Object.assign não o limparia)', () => {
    const t = abrir({ cinematica: 'desligada' });
    expect(t.item('CINEMÁTICA DO ESPECIAL')?.value?.()).toBe('DESLIGADA');
    t.item('RESTAURAR PADRÕES')?.onOk?.();
    expect(t.persist.settings.cinematica).toBeUndefined();
    expect(t.item('CINEMÁTICA DO ESPECIAL')?.value?.()).toBe('COMPLETA');
    expect('cinematica' in t.persist.settings).toBe(false);
  });

  it('sem Regras.cinematica (?expansao=4) a linha não existe: a tela de Opções é a do protótipo', () => {
    const t = abrir({}, { ...REGRAS_PADRAO, cinematica: false });
    expect(t.item('CINEMÁTICA DO ESPECIAL')).toBeUndefined();
    expect(t.cena.m.items).toHaveLength(9);
    expect(abrir().cena.m.items).toHaveLength(11); // com a cinemática E as provocações
  });
});

describe('opção PROVOCAÇÕES (própria, separada da cinemática; decisão do dono, 2026-10-21)', () => {
  it('mostra LIGADAS sem preferência (o padrão) e as setas alternam LIGADAS <-> DESLIGADAS, gravando cada escolha', () => {
    const t = abrir();
    const linha = t.item('PROVOCAÇÕES');
    expect(linha).toBeDefined();
    expect(linha?.value?.()).toBe('LIGADAS');
    expect(t.persist.settings.provocacoes).toBeUndefined(); // só olhar não grava
    const gravacoes = t.salvou.n;
    linha?.onAdjust?.(1);
    expect(linha?.value?.()).toBe('DESLIGADAS');
    expect(t.persist.settings.provocacoes).toBe('desligadas');
    linha?.onAdjust?.(-1);
    expect(linha?.value?.()).toBe('LIGADAS');
    expect(t.persist.settings.provocacoes).toBe('ligadas');
    expect(t.salvou.n).toBe(gravacoes + 2);
  });

  it('é INDEPENDENTE da cinemática: mexer em uma não muda a outra', () => {
    const t = abrir({ cinematica: 'desligada' });
    expect(t.item('PROVOCAÇÕES')?.value?.()).toBe('LIGADAS'); // a cinemática desligada NÃO desliga a provocação
    t.item('PROVOCAÇÕES')?.onAdjust?.(1);
    expect(t.persist.settings.cinematica).toBe('desligada');
    t.item('CINEMÁTICA DO ESPECIAL')?.onAdjust?.(1);
    expect(t.persist.settings.provocacoes).toBe('desligadas');
  });

  it('fica logo depois da cinemática e antes da tela cheia', () => {
    const rotulos = abrir().cena.m.items.map((i) => i.label);
    expect(rotulos.indexOf('PROVOCAÇÕES')).toBe(rotulos.indexOf('CINEMÁTICA DO ESPECIAL') + 1);
    expect(rotulos.indexOf('TELA CHEIA (F)')).toBe(rotulos.indexOf('PROVOCAÇÕES') + 1);
  });

  it('RESTAURAR PADRÕES apaga a preferência (o padrão é a ausência do campo; o Object.assign não o limparia)', () => {
    const t = abrir({ provocacoes: 'desligadas' });
    expect(t.item('PROVOCAÇÕES')?.value?.()).toBe('DESLIGADAS');
    t.item('RESTAURAR PADRÕES')?.onOk?.();
    expect(t.persist.settings.provocacoes).toBeUndefined();
    expect('provocacoes' in t.persist.settings).toBe(false);
    expect(t.item('PROVOCAÇÕES')?.value?.()).toBe('LIGADAS');
  });

  it('sem Regras.cinematica (?expansao=4) a linha não existe: a tela de Opções é a do protótipo (9 linhas)', () => {
    const t = abrir({}, { ...REGRAS_PADRAO, cinematica: false });
    expect(t.item('PROVOCAÇÕES')).toBeUndefined();
    expect(t.cena.m.items).toHaveLength(9);
  });
});
