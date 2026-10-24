import { afterEach, describe, expect, it } from 'vitest';
import { esquecerVazaoDoBoot, registrarVazaoDoBoot, TAMANHO_MINIMO_MEDIDO, vazaoDasTransferencias, vazaoDoBoot } from '../../src/platform/vazao';
import { decidirTrailerEstatico, LIMIAR_DE_VAZAO_BYTES_POR_S, LIMITE_DE_RESERVAS } from '../../src/ui/trailer/ambiente';
import { desenharReserva } from '../../src/render/trailer/reserva';
import { desenharQuadroEstatico } from '../../src/render/trailer/estatica';
import { desenharRostoOuPlaca, iniciaisDe } from '../../src/render/trailer/rosto';
import { ROTEIRO } from '../../src/data/trailer/roteiro';
import type { LutadorRender } from '../../src/assets/elenco';

/*
 * Rede lenta no trailer (docs/orcamentos-2026-10-23.md, achado da Íris sobre o iPhone): o decisor estático x completo sem `navigator.connection`, a vazão medida no boot e o
 * rosto que nunca sai vazio. O comportamento no navegador (Fast 3G de verdade) está em tests/e2e-build/trailer-rede.spec.ts e tests/e2e/trailer-rede-lenta.spec.ts.
 */

const MiB = 1048576;

describe('decidirTrailerEstatico: sem Network Information API (iPhone) vale a vazão medida', () => {
  const base = { reduzirMovimento: false, conexao: null, vazao: null as number | null };

  it('movimento reduzido sempre vence, e o motivo é "movimento"', () => {
    expect(decidirTrailerEstatico({ ...base, reduzirMovimento: true, vazao: 5 * MiB })).toEqual({ estatico: true, motivo: 'movimento' });
  });

  it('economia de dados e 2g/3g da API continuam valendo (e vencem a vazão boa)', () => {
    expect(decidirTrailerEstatico({ ...base, conexao: { saveData: true }, vazao: 5 * MiB })).toEqual({ estatico: true, motivo: 'economia' });
    for (const t of ['slow-2g', '2g', '3g']) expect(decidirTrailerEstatico({ ...base, conexao: { effectiveType: t } }).motivo, t).toBe('economia');
    expect(decidirTrailerEstatico({ ...base, conexao: { effectiveType: '4g', saveData: false }, vazao: 5 * MiB })).toEqual({ estatico: false, motivo: null });
  });

  it('SEM a API (conexao null), a vazão abaixo do limiar vira estático por "vazao"; no limiar ou acima é completo', () => {
    expect(decidirTrailerEstatico({ ...base, vazao: LIMIAR_DE_VAZAO_BYTES_POR_S - 1 })).toEqual({ estatico: true, motivo: 'vazao' });
    expect(decidirTrailerEstatico({ ...base, vazao: LIMIAR_DE_VAZAO_BYTES_POR_S })).toEqual({ estatico: false, motivo: null });
    expect(decidirTrailerEstatico({ ...base, vazao: 30 * MiB })).toEqual({ estatico: false, motivo: null });
  });

  it('os números medidos no build (CDP, 3 rodadas iguais) caem do lado certo do limiar: 9 Mbps completo; 4 Mbps e Fast 3G estáticos', () => {
    expect(decidirTrailerEstatico({ ...base, vazao: 551_000 }).estatico, '9 Mbps').toBe(false);
    expect(decidirTrailerEstatico({ ...base, vazao: 315_000 }).estatico, '4 Mbps').toBe(true);
    expect(decidirTrailerEstatico({ ...base, vazao: 120_000 }).estatico, 'Fast 3G').toBe(true);
  });

  it('vazão desconhecida (2ª visita pelo cache, nada medível) NUNCA é lenta: completo', () => {
    expect(decidirTrailerEstatico({ ...base, vazao: null })).toEqual({ estatico: false, motivo: null });
    expect(decidirTrailerEstatico({ ...base, vazao: Number.NaN })).toEqual({ estatico: false, motivo: null });
  });

  it('o limiar é ~0,4 MiB/s e o completo tolera 1 cartão de reserva (o 2º muda para o estático)', () => {
    expect(LIMIAR_DE_VAZAO_BYTES_POR_S).toBeGreaterThan(315_000);
    expect(LIMIAR_DE_VAZAO_BYTES_POR_S).toBeLessThan(551_000);
    expect(LIMITE_DE_RESERVAS).toBe(2);
  });
});

describe('vazaoDasTransferencias: bytes sobre a UNIÃO dos intervalos das transferências grandes', () => {
  const e = (transferSize: number, responseStart: number, responseEnd: number) => ({ transferSize, responseStart, responseEnd });

  it('uma transferência: bytes / duração', () => {
    expect(vazaoDasTransferencias([e(200_000, 100, 1100)])).toBeCloseTo(200_000, 6); // 200 kB em 1 s
  });

  it('paralelas dividem a banda e contam UMA vez: 2 x 100 kB ao mesmo tempo em 1 s = 200 kB/s', () => {
    expect(vazaoDasTransferencias([e(100_000, 0, 1000), e(100_000, 0, 1000)])).toBeCloseTo(200_000, 6);
    expect(vazaoDasTransferencias([e(100_000, 0, 600), e(100_000, 400, 1000)])).toBeCloseTo(200_000, 6); // sobreposição parcial: união = 1 s
  });

  it('os vãos entre transferências (esperando o JS pedir a próxima) ficam de fora', () => {
    // 100 kB em 0..500 e 100 kB em 3000..3500: 1 s de transferência, e não 3,5 s
    expect(vazaoDasTransferencias([e(100_000, 0, 500), e(100_000, 3000, 3500)])).toBeCloseTo(200_000, 6);
  });

  it('as pequenas (< 100 KB) são só latência e não entram; cache e service worker (transferSize 0) idem', () => {
    expect(TAMANHO_MINIMO_MEDIDO).toBe(100_000);
    expect(vazaoDasTransferencias([e(99_999, 0, 10), e(2_000, 0, 5_000)])).toBeNull();
    expect(vazaoDasTransferencias([e(0, 0, 50), e(0, 10, 90)])).toBeNull();
    expect(vazaoDasTransferencias([e(300_000, 0, 1000), e(5_000, 0, 9_000)])).toBeCloseTo(300_000, 6);
  });

  it('sem entradas, ou com intervalo vazio ou inválido: null', () => {
    expect(vazaoDasTransferencias([])).toBeNull();
    expect(vazaoDasTransferencias([e(200_000, 500, 500)])).toBeNull();
    expect(vazaoDasTransferencias([e(200_000, 0, Number.POSITIVE_INFINITY)])).toBeNull();
  });
});

describe('registro da vazão do boot', () => {
  afterEach(() => esquecerVazaoDoBoot());

  it('guarda o valor dado (override de teste), aceita null e esquece', () => {
    expect(vazaoDoBoot()).toBeNull();
    registrarVazaoDoBoot(123_456);
    expect(vazaoDoBoot()).toBe(123_456);
    registrarVazaoDoBoot(null);
    expect(vazaoDoBoot()).toBeNull();
  });

  it('sem Resource Timing (Node) devolve null em vez de lançar', () => {
    expect(registrarVazaoDoBoot()).toBeNull();
  });
});

// ------------------------------------------------------------------------------------------------------------------------------ o rosto nunca vazio

/** Um contexto 2D que só anota as chamadas (o desenho de verdade é provado no navegador). */
function ctxFalso() {
  const chamadas: string[] = [];
  const alvo: Record<string, unknown> = {};
  const ctx = new Proxy(alvo, {
    get(_t, nome: string) {
      if (nome === 'chamadas') return chamadas;
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') return () => ({ addColorStop() {} });
      return (...a: unknown[]) => {
        chamadas.push(`${nome}`);
        return a[0];
      };
    },
    set() {
      return true;
    },
  }) as unknown as CanvasRenderingContext2D & { chamadas: string[] };
  return ctx;
}

function ferramentasFalsas() {
  const textos: string[] = [];
  const f = {
    A: (t: string) => void textos.push(t),
    T: (t: string) => void textos.push(t),
    floorShadow: () => undefined,
  };
  return { f: f as never, textos };
}

const lutador = (nome: string, retrato: boolean, pronta = true): LutadorRender =>
  ({
    ch: { name: nome, head: [0, 0, 1, 1], fire: ['#ff9a3a', '#ffd27a', '#aa3300'], accent: '#ffcc00', stage: 'jp' },
    arte: {
      pronta,
      retrato: () => (retrato ? { imagem: {} as CanvasImageSource, recorte: [0, 0, 10, 10] as const } : null),
      imagemDe: () => null,
      silhuetaDe: () => null,
    },
  }) as unknown as LutadorRender;

describe('o rosto nunca sai vazio', () => {
  it('iniciaisDe: duas palavras viram as duas iniciais; uma palavra, as duas primeiras letras', () => {
    expect(iniciaisDe('WEI LONG')).toBe('WL');
    expect(iniciaisDe('MIN-JI')).toBe('MJ');
    expect(iniciaisDe('HAYATO')).toBe('HA');
    expect(iniciaisDe('')).toBe('?');
  });

  it('com o retrato desenha a imagem; sem ele desenha a PLACA com as iniciais (texto na tela)', () => {
    const a = ferramentasFalsas();
    const c1 = ctxFalso();
    expect(desenharRostoOuPlaca(c1, a.f, lutador('HAYATO', true), 0, 0, 200, false, ['#000', '#111'])).toBe(true);
    expect(a.textos).toEqual([]);
    expect(c1.chamadas).toContain('drawImage');
    const b = ferramentasFalsas();
    const c2 = ctxFalso();
    expect(desenharRostoOuPlaca(c2, b.f, lutador('WEI LONG', false), 0, 0, 200, false, ['#000', '#111'])).toBe(false);
    expect(b.textos).toEqual(['WL']);
    expect(c2.chamadas).not.toContain('drawImage');
    expect(c2.chamadas).toContain('fillRect');
  });

  it('o cartão de reserva, com os retratos AINDA não chegados, mostra a placa dos dois e os dois nomes', () => {
    const { f, textos } = ferramentasFalsas();
    const elenco = { hayato: lutador('HAYATO', false), caio: lutador('CAIO', false) } as never;
    desenharReserva({ ctx: ctxFalso(), f, elenco, c1: 'hayato', c2: 'caio', cenario: undefined, vinheta: {} as CanvasImageSource, tauNoPlano: 10 });
    expect(textos.sort()).toEqual(['CA', 'CAIO', 'HA', 'HAYATO'].sort());
  });

  it('o quadro estático com lutadores cuja ARTE não chegou (rede lenta) desenha o rosto no lugar da pose; com a arte, a pose', () => {
    const quadro = ROTEIRO.estatica.quadros[1]!; // HAYATO + WEI LONG
    const sem = ferramentasFalsas();
    const recursos = (elenco: never, f: never) => ({ ctx: ctxFalso(), f, elenco, cenarios: new Map(), vinheta: {} as CanvasImageSource, ocultos: new Set<never>(), logo: () => false, chamada: () => undefined });
    desenharQuadroEstatico(recursos({ hayato: lutador('HAYATO', false, false), 'wei-long': lutador('WEI LONG', false, false) } as never, sem.f), quadro, 1);
    expect(sem.textos).toEqual(expect.arrayContaining(['HA', 'HAYATO', 'WL', 'WEI LONG']));
  });

  it('o quadro estático só de retratos (guardiões) também cai na placa', () => {
    const quadro = ROTEIRO.estatica.quadros[3]!; // retratos de AMINU, CENTELLA, CAMILLE
    const { f, textos } = ferramentasFalsas();
    const elenco = { aminu: lutador('AMINU', false), centella: lutador('CENTELLA', false), camille: lutador('CAMILLE', false) } as never;
    desenharQuadroEstatico({ ctx: ctxFalso(), f, elenco, cenarios: new Map(), vinheta: {} as CanvasImageSource, ocultos: new Set<never>(), logo: () => false, chamada: () => undefined }, quadro, 1);
    expect(textos).toEqual(expect.arrayContaining(['AM', 'CE', 'CA']));
  });
});
