import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { mostrarErrosNaTela } from '../../src/platform/erros';

/*
 * Erros na tela (src/platform/erros.ts): a caixa vermelha `#err` que ajuda a diagnosticar no celular, onde não há console. Uma janela falsa
 * (nada aqui depende de navegador): o que importa é o contrato com o index.html (o id `err`), o texto que o jogador/dono lê e o "desligar".
 */

interface CaixaFalsa {
  style: { display: string };
  textContent: string | null;
}

type Ouvinte = (e: ErrorEvent) => void;

function janelaFalsa(caixa: CaixaFalsa | null) {
  const ouvintes = new Map<string, Set<Ouvinte>>();
  const ids: string[] = [];
  const alvo = {
    document: {
      getElementById: (id: string): CaixaFalsa | null => {
        ids.push(id);
        return id === 'err' ? caixa : null;
      },
    },
    addEventListener: (tipo: string, f: Ouvinte): void => {
      if (!ouvintes.has(tipo)) ouvintes.set(tipo, new Set());
      ouvintes.get(tipo)!.add(f);
    },
    removeEventListener: (tipo: string, f: Ouvinte): void => {
      ouvintes.get(tipo)?.delete(f);
    },
  };
  /** Dispara um `error` como o navegador: entrega a todos os ouvintes registrados. */
  const disparar = (message: string, lineno: number): void => {
    for (const f of [...(ouvintes.get('error') ?? [])]) f({ message, lineno } as ErrorEvent);
  };
  return { janela: alvo as unknown as Window, disparar, ouvintes, ids };
}

const caixaOculta = (): CaixaFalsa => ({ style: { display: 'none' }, textContent: '' });

describe('mostrarErrosNaTela', () => {
  it('registra UM ouvinte de `error` na janela e não mostra nada antes de haver erro', () => {
    const caixa = caixaOculta();
    const { janela, ouvintes } = janelaFalsa(caixa);
    mostrarErrosNaTela(janela);
    expect(ouvintes.get('error')?.size).toBe(1);
    expect(caixa.style.display).toBe('none');
    expect(caixa.textContent).toBe('');
  });

  it('um erro de JavaScript abre a caixa e escreve "Erro: <mensagem> (linha N) | "', () => {
    const caixa = caixaOculta();
    const { janela, disparar, ids } = janelaFalsa(caixa);
    mostrarErrosNaTela(janela);
    disparar('x is not a function', 42);
    expect(caixa.style.display).toBe('block');
    expect(caixa.textContent).toBe('Erro: x is not a function (linha 42) | ');
    expect(ids).toEqual(['err']);
  });

  it('erros seguidos se ACUMULAM na caixa, na ordem em que aconteceram (nenhum apaga o anterior)', () => {
    const caixa = caixaOculta();
    const { janela, disparar } = janelaFalsa(caixa);
    mostrarErrosNaTela(janela);
    disparar('primeiro', 1);
    disparar('segundo', 2);
    disparar('terceiro', 3);
    expect(caixa.textContent).toBe('Erro: primeiro (linha 1) | Erro: segundo (linha 2) | Erro: terceiro (linha 3) | ');
  });

  it('caixa com texto prévio (ou sem textContent) não escreve "null" nem "undefined"', () => {
    const comTexto: CaixaFalsa = { style: { display: 'none' }, textContent: 'antes | ' };
    const a = janelaFalsa(comTexto);
    mostrarErrosNaTela(a.janela);
    a.disparar('boom', 7);
    expect(comTexto.textContent).toBe('antes | Erro: boom (linha 7) | ');

    const semTexto: CaixaFalsa = { style: { display: 'none' }, textContent: null };
    const b = janelaFalsa(semTexto);
    mostrarErrosNaTela(b.janela);
    b.disparar('boom', 7);
    expect(semTexto.textContent).toBe('Erro: boom (linha 7) | ');
    expect(semTexto.textContent).not.toMatch(/null|undefined/);
  });

  it('sem o elemento #err na página, o erro passa em silêncio (a tela de erro nunca causa outro erro)', () => {
    const { janela, disparar } = janelaFalsa(null);
    mostrarErrosNaTela(janela);
    expect(() => disparar('qualquer', 1)).not.toThrow();
  });

  it('o desligador devolvido remove o ouvinte: erros depois dele não mexem na caixa', () => {
    const caixa = caixaOculta();
    const { janela, disparar, ouvintes } = janelaFalsa(caixa);
    const desligar = mostrarErrosNaTela(janela);
    disparar('antes de desligar', 1);
    desligar();
    expect(ouvintes.get('error')?.size).toBe(0);
    caixa.style.display = 'none';
    caixa.textContent = '';
    disparar('depois de desligar', 2);
    expect(caixa.style.display).toBe('none');
    expect(caixa.textContent).toBe('');
  });

  it('desligar duas vezes não lança, e ligar de novo volta a mostrar (um ouvinte só por chamada)', () => {
    const caixa = caixaOculta();
    const { janela, disparar, ouvintes } = janelaFalsa(caixa);
    const desligar = mostrarErrosNaTela(janela);
    desligar();
    expect(() => desligar()).not.toThrow();
    mostrarErrosNaTela(janela);
    expect(ouvintes.get('error')?.size).toBe(1);
    disparar('de novo', 9);
    expect(caixa.textContent).toBe('Erro: de novo (linha 9) | ');
  });

  it('integração com a página: o index.html tem o <pre id="err"> ESCONDIDO por padrão (se o id mudar, a caixa some sem aviso)', () => {
    const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
    const tag = html.match(/<pre\b[^>]*\bid="err"[^>]*>/);
    expect(tag, 'index.html sem <pre id="err">').not.toBeNull();
    expect(tag![0]).toMatch(/display:\s*none/);
  });
});
