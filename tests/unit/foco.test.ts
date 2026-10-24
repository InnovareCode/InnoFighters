import { describe, expect, it } from 'vitest';
import { observarFoco } from '../../src/platform/foco';

/** `observarFoco`: blur, aba oculta e (L6) aba de volta. Janela e documento falsos com os mesmos listeners. */
function janelaFalsa() {
  const ouvintes = new Map<string, Array<() => void>>();
  const docOuvintes = new Map<string, Array<() => void>>();
  const add = (m: Map<string, Array<() => void>>) => (nome: string, f: () => void) => void m.set(nome, [...(m.get(nome) ?? []), f]);
  const remove = (m: Map<string, Array<() => void>>) => (nome: string, f: () => void) => void m.set(nome, (m.get(nome) ?? []).filter((x) => x !== f));
  const document = { hidden: false, addEventListener: add(docOuvintes), removeEventListener: remove(docOuvintes) };
  const alvo = { document, addEventListener: add(ouvintes), removeEventListener: remove(ouvintes) } as unknown as Window;
  const disparar = (m: Map<string, Array<() => void>>, nome: string): void => (m.get(nome) ?? []).forEach((f) => f());
  return { alvo, document, blur: () => disparar(ouvintes, 'blur'), visibilidade: () => disparar(docOuvintes, 'visibilitychange') };
}

describe('observarFoco', () => {
  it('blur, ocultar e voltar chamam cada callback; desfazer desliga tudo', () => {
    const j = janelaFalsa();
    const log: string[] = [];
    const desfazer = observarFoco(j.alvo, { aoPerderFoco: () => log.push('blur'), aoOcultar: () => log.push('ocultar'), aoVoltar: () => log.push('voltar') });
    j.blur();
    j.document.hidden = true;
    j.visibilidade();
    j.document.hidden = false;
    j.visibilidade();
    expect(log).toEqual(['blur', 'ocultar', 'voltar']);
    desfazer();
    j.blur();
    j.visibilidade();
    expect(log).toHaveLength(3);
  });

  it('sem aoVoltar (os usos antigos) nada quebra', () => {
    const j = janelaFalsa();
    observarFoco(j.alvo, { aoOcultar: () => undefined });
    expect(() => j.visibilidade()).not.toThrow();
  });
});
