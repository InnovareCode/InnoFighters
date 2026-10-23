import { describe, expect, it } from 'vitest';
import { emRetrato, travarPaisagem } from '../../src/platform/orientacao';

/*
 * Orientação (src/platform/orientacao.ts): `emRetrato` decide quando o aviso "gire o aparelho" vale; `travarPaisagem` é MELHOR ESFORÇO e NUNCA lança
 * (a API só existe em alguns navegadores e só vale em tela cheia). Janelas falsas: nada aqui depende de navegador.
 */

describe('emRetrato', () => {
  it.each([
    [390, 844, true], // celular em pé
    [768, 1024, true], // tablet em pé
    [1, 2, true],
  ])('mais alta que larga (%i x %i) = retrato', (largura, altura, esperado) => {
    expect(emRetrato(largura, altura)).toBe(esperado);
  });

  it.each([
    [844, 390], // celular deitado
    [1920, 1080],
    [2, 1],
  ])('mais larga que alta (%i x %i) = paisagem', (largura, altura) => {
    expect(emRetrato(largura, altura)).toBe(false);
  });

  it('QUADRADA não é retrato: só altura ESTRITAMENTE maior avisa (o jogo é paisagem, mas 1:1 joga)', () => {
    expect(emRetrato(600, 600)).toBe(false);
    expect(emRetrato(600, 601)).toBe(true);
    expect(emRetrato(601, 600)).toBe(false);
  });

  it('janela zerada (iframe escondido, antes do layout) não é retrato', () => {
    expect(emRetrato(0, 0)).toBe(false);
  });

  it('aceita medidas fracionárias (zoom do navegador) sem arredondar', () => {
    expect(emRetrato(400.4, 400.5)).toBe(true);
    expect(emRetrato(400.5, 400.4)).toBe(false);
  });
});

/** Uma janela com `screen.orientation` falso; `orientacao` ausente/`lock` ausente reproduz Safari/desktop. */
function janela(orientacao: unknown): { alvo: Window; chamadas: string[] } {
  const chamadas: string[] = [];
  const o = orientacao as { lock?: unknown } | undefined | null;
  if (o && typeof o.lock === 'function') {
    const original = o.lock as (tipo: string) => Promise<void>;
    o.lock = (tipo: string): Promise<void> => {
      chamadas.push(tipo);
      return original(tipo);
    };
  }
  return { alvo: { screen: { orientation: orientacao } } as unknown as Window, chamadas };
}

describe('travarPaisagem', () => {
  it('com a API e o navegador aceitando: pede "landscape" UMA vez e devolve true', async () => {
    const { alvo, chamadas } = janela({ lock: () => Promise.resolve() });
    await expect(travarPaisagem(alvo)).resolves.toBe(true);
    expect(chamadas).toEqual(['landscape']);
  });

  it('navegador recusando (fora de tela cheia: SecurityError/NotSupportedError) devolve false e não lança', async () => {
    for (const nome of ['SecurityError', 'NotSupportedError', 'AbortError']) {
      const erro = Object.assign(new Error('recusado'), { name: nome });
      const { alvo, chamadas } = janela({ lock: () => Promise.reject(erro) });
      await expect(travarPaisagem(alvo)).resolves.toBe(false);
      expect(chamadas).toEqual(['landscape']); // tentou, foi recusado
    }
  });

  it('`lock` que lança SÍNCRONO (antes de devolver a promessa) também vira false', async () => {
    const { alvo } = janela({
      lock: () => {
        throw new TypeError('lock is not allowed');
      },
    });
    await expect(travarPaisagem(alvo)).resolves.toBe(false);
  });

  it('Safari/iOS: `screen.orientation` existe mas SEM `lock` -> false, sem tentar nada', async () => {
    const { alvo } = janela({ type: 'portrait-primary' });
    await expect(travarPaisagem(alvo)).resolves.toBe(false);
  });

  it('`lock` que não é função (valor estranho) -> false', async () => {
    const { alvo } = janela({ lock: 'landscape' });
    await expect(travarPaisagem(alvo)).resolves.toBe(false);
  });

  it('sem `screen.orientation` (navegador antigo, desktop) -> false', async () => {
    await expect(travarPaisagem(janela(undefined).alvo)).resolves.toBe(false);
    await expect(travarPaisagem(janela(null).alvo)).resolves.toBe(false);
  });

  it('sem `screen` nenhum na janela (ambiente sem tela) -> false, não lança TypeError', async () => {
    await expect(travarPaisagem({} as unknown as Window)).resolves.toBe(false);
  });

  it('é assíncrona: devolve uma promessa e só pede o bloqueio ao ser chamada (nunca ao importar o módulo)', async () => {
    const { alvo, chamadas } = janela({ lock: () => Promise.resolve() });
    expect(chamadas).toEqual([]);
    const r = travarPaisagem(alvo);
    expect(r).toBeInstanceOf(Promise);
    await r;
    expect(chamadas).toHaveLength(1);
  });
});
