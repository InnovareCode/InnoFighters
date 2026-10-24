import { describe, expect, it } from 'vitest';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { NUCLEO_DO_NOME, SOMBRA_DO_NOME } from '../../src/render/faixa-rosto';
import { paletaFaixaDe, type PaletaFaixa } from '../../src/render/paleta-lutador';

/*
 * PALETA DA FAIXA POR LUTADOR (pedido do dono, 24/10/2026): cada lutador tem uma paleta (3 tons: escuro/médio/claro) própria,
 * derivada do figurino (não do `fire`/efeito do golpe). Aqui: toda a paleta é válida (hex de verdade), as 10 + as 2 fichas que
 * variam são diferentes o bastante entre si (nada repetido sem querer), e o CONTRASTE do nome (`NUCLEO_DO_NOME`/`SOMBRA_DO_NOME`,
 * `faixa-rosto.ts`) é medido contra os tons mais arriscados de CADA paleta — nunca abaixo do limiar de legibilidade do jogo.
 */

const hexParaRgb = (hex: string): [number, number, number] => [parseInt(hex.slice(1, 3), 16), parseInt(hex.slice(3, 5), 16), parseInt(hex.slice(5, 7), 16)];

/** Luminância relativa (WCAG 2.x), 0..1. */
function luminancia(hex: string): number {
  const lin = (v: number): number => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  const [r, g, b] = hexParaRgb(hex);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** Razão de contraste WCAG entre duas cores (1..21). */
function contraste(a: string, b: string): number {
  const la = luminancia(a) + 0.05;
  const lb = luminancia(b) + 0.05;
  return la > lb ? la / lb : lb / la;
}

const TODAS_AS_PALETAS: Array<[string, PaletaFaixa]> = [
  ...IDS_LUTADORES.map((id): [string, PaletaFaixa] => [id, paletaFaixaDe(id, null)]),
  ['nila/sarpa', paletaFaixaDe('nila', 'sarpa')],
  ['zenon/chefe2', paletaFaixaDe('zenon', 'chefe2')],
];

describe('paletaFaixaDe: as 3 cores de cada lutador (figurino, não o `fire` do golpe)', () => {
  it('todo lutador do roster tem paleta (nunca cai no undefined)', () => {
    for (const id of IDS_LUTADORES) expect(paletaFaixaDe(id, null)).toBeTruthy();
  });

  it('as 3 cores são hex válidos (#rrggbb)', () => {
    for (const [nome, p] of TODAS_AS_PALETAS) {
      for (const [tom, cor] of Object.entries(p)) expect(cor, `${nome}.${tom}`).toMatch(/^#[0-9a-f]{6}$/);
    }
  });

  it('escuro < médio < claro em luminância (a mesma ordem do gradiente, senão o "brilho" central não lê)', () => {
    for (const [nome, p] of TODAS_AS_PALETAS) {
      expect(luminancia(p.escuro), `${nome}: escuro < médio`).toBeLessThan(luminancia(p.medio) + 0.02);
      expect(luminancia(p.medio), `${nome}: médio < claro`).toBeLessThan(luminancia(p.claro) + 0.02);
    }
  });

  it('as 10 paletas base são visualmente distintas entre si (nenhum par com as 3 cores quase iguais)', () => {
    const dist = (a: PaletaFaixa, b: PaletaFaixa): number =>
      (['escuro', 'medio', 'claro'] as const).reduce((s, k) => {
        const [r1, g1, b1] = hexParaRgb(a[k]);
        const [r2, g2, b2] = hexParaRgb(b[k]);
        return s + Math.hypot(r1 - r2, g1 - g2, b1 - b2);
      }, 0);
    const base = IDS_LUTADORES.map((id) => [id, paletaFaixaDe(id, null)] as const);
    for (let i = 0; i < base.length; i++) {
      for (let j = i + 1; j < base.length; j++) {
        expect(dist(base[i]![1], base[j]![1]), `${base[i]![0]} x ${base[j]![0]}`).toBeGreaterThan(40);
      }
    }
  });

  it('postura/fase que varia (NILA/SARPA, ZENON/chefe2) é diferente da base do mesmo lutador', () => {
    expect(paletaFaixaDe('nila', 'sarpa')).not.toEqual(paletaFaixaDe('nila', null));
    expect(paletaFaixaDe('zenon', 'chefe2')).not.toEqual(paletaFaixaDe('zenon', null));
  });

  it('ficha sem paleta própria cai na paleta base do lutador', () => {
    expect(paletaFaixaDe('hayato', 'qualquer-coisa')).toEqual(paletaFaixaDe('hayato', null));
  });
});

describe('contraste do nome (NUCLEO_DO_NOME/SOMBRA_DO_NOME) contra TODAS as paletas — medido, não suposto', () => {
  it('o contorno escuro do nome tem contraste >= 4,5:1 (texto, WCAG AA) contra o tom CLARO (o mais arriscado) de toda paleta', () => {
    for (const [nome, p] of TODAS_AS_PALETAS) {
      const c = contraste(SOMBRA_DO_NOME, p.claro);
      expect(c, `${nome}: contorno x claro = ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('o preenchimento branco do nome tem contraste >= 4,5:1 contra o tom ESCURO (a borda da faixa) de toda paleta', () => {
    for (const [nome, p] of TODAS_AS_PALETAS) {
      const c = contraste(NUCLEO_DO_NOME, p.escuro);
      expect(c, `${nome}: núcleo x escuro = ${c.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  });

  it('o preenchimento branco SOZINHO (sem o contorno) pode falhar contra o tom claro — é POR ISSO que o contorno existe (não é redundante)', () => {
    // prova a premissa do design: se o branco sozinho já desse conta contra qualquer claro, o contorno seria decorativo
    const falhariam = TODAS_AS_PALETAS.filter(([, p]) => contraste(NUCLEO_DO_NOME, p.claro) < 4.5);
    expect(falhariam.length, 'pelo menos uma paleta clara o bastante para o branco sozinho não bastar').toBeGreaterThan(0);
  });
});
