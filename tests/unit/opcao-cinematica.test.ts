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
    expect(abrir().cena.m.items).toHaveLength(10);
  });
});
