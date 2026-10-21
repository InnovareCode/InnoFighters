import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { carregarFontes, FACES_DO_JOGO } from '../../src/platform/fontes';
import { FAMILIA_CORPO, FAMILIA_TITULO, FB, FH } from '../../src/render/texto';

/*
 * Tipografia (2026-10-21): Barlow Condensed (títulos) + Barlow (corpo), AUTO-HOSPEDADAS em public/assets/fontes (OFL), sem CDN. Aqui: as strings de
 * fonte do canvas, a carga antes do 1º quadro e a integridade dos arquivos. A fonte carregar e desenhar de verdade é provado no navegador
 * (tests/e2e/tipografia.spec.ts e tests/e2e-build/csp.spec.ts).
 */
const PASTA = resolve('public/assets/fontes');

describe('strings de fonte do canvas', () => {
  it('títulos em Barlow Condensed ExtraBold itálico e corpo em Barlow SemiBold, com reserva', () => {
    expect(FH(20)).toBe('italic 800 20px "Barlow Condensed", "Arial Narrow", Impact, sans-serif');
    expect(FB(13)).toBe('600 13px Barlow, "Segoe UI", "Trebuchet MS", Arial, sans-serif');
    expect(FAMILIA_TITULO.startsWith('"Barlow Condensed"')).toBe(true);
    expect(FAMILIA_CORPO.startsWith('Barlow,')).toBe(true);
  });

  it('as faces pedidas antes do 1º quadro são exatamente as que FH e FB usam (estilo, peso e família)', () => {
    expect(FACES_DO_JOGO).toEqual(['italic 800 20px "Barlow Condensed"', '600 20px "Barlow"']);
    expect(FH(20).startsWith(FACES_DO_JOGO[0]!)).toBe(true);
    expect(FB(20).replace('Barlow,', '"Barlow"').startsWith(FACES_DO_JOGO[1]!)).toBe(true);
  });
});

describe('carregarFontes (antes do 1º quadro)', () => {
  it('pede cada face com amostra de acentos do português e resolve true quando todas chegam', async () => {
    const pedidos: Array<[string, string | undefined]> = [];
    const ok = await carregarFontes({ load: async (f, t) => void pedidos.push([f, t]) }, FACES_DO_JOGO, 500);
    expect(ok).toBe(true);
    expect(pedidos.map(([f]) => f)).toEqual([...FACES_DO_JOGO]);
    for (const [, t] of pedidos) for (const c of 'ÃÕÇÁÉÍÓÚÂÊÔÀ') expect(t).toContain(c);
  });

  it('falha de carga (arquivo 404, rede) resolve false e NÃO rejeita: o jogo abre com a fonte de reserva', async () => {
    const ok = await carregarFontes({ load: () => Promise.reject(new Error('404')) }, FACES_DO_JOGO, 500);
    expect(ok).toBe(false);
  });

  it('carga que nunca termina estoura o teto e resolve false (nunca prende o boot)', async () => {
    const t0 = Date.now();
    const ok = await carregarFontes({ load: () => new Promise(() => undefined) }, FACES_DO_JOGO, 30);
    expect(ok).toBe(false);
    expect(Date.now() - t0).toBeLessThan(1000);
  });

  it('sem document.fonts (ambiente sem navegador) resolve false sem lançar', async () => {
    expect(await carregarFontes(undefined, FACES_DO_JOGO, 30)).toBe(false);
  });
});

describe('arquivos das fontes', () => {
  it('os 2 woff2 existem, são woff2 de verdade (assinatura wOF2) e leves (subset latino, < 40 KB cada)', () => {
    for (const arq of ['barlow-condensed-800-italic-latin.woff2', 'barlow-600-latin.woff2']) {
      const caminho = join(PASTA, arq);
      expect(existsSync(caminho), arq).toBe(true);
      expect(readFileSync(caminho).subarray(0, 4).toString('latin1'), arq).toBe('wOF2');
      expect(statSync(caminho).size, arq).toBeLessThan(40_000);
    }
  });

  it('a licença OFL de cada família está junto dos arquivos', () => {
    for (const arq of ['OFL-barlow.txt', 'OFL-barlow-condensed.txt']) {
      const txt = readFileSync(join(PASTA, arq), 'utf8');
      expect(txt, arq).toContain('SIL OPEN FONT LICENSE Version 1.1');
      expect(txt, arq).toContain('The Barlow Project Authors');
    }
    expect(readdirSync(PASTA).sort()).toEqual(['LEIA-ME.txt', 'OFL-barlow-condensed.txt', 'OFL-barlow.txt', 'barlow-600-latin.woff2', 'barlow-condensed-800-italic-latin.woff2']);
  });

  it('o CSS declara exatamente esses arquivos (caminho local, woff2) e o index.html os precarrega; nada de CDN em lugar nenhum', () => {
    const css = readFileSync(resolve('src/fontes.css'), 'utf8');
    const html = readFileSync(resolve('index.html'), 'utf8');
    for (const arq of ['barlow-condensed-800-italic-latin.woff2', 'barlow-600-latin.woff2']) {
      expect(css).toContain(`url("/assets/fontes/${arq}") format("woff2")`);
      expect(html).toContain(`href="/assets/fontes/${arq}" as="font" type="font/woff2" crossorigin`);
    }
    expect(css).toMatch(/font-display:\s*block/);
    for (const texto of [css, html, readFileSync(resolve('src/input/toque.css'), 'utf8'), readFileSync(resolve('src/platform/aviso.css'), 'utf8')]) {
      expect(texto).not.toMatch(/googleapis|gstatic|fonts\.google|cdn\.|https?:\/\//i);
    }
  });

  it('a CSP libera fonte só de o próprio site (font-src self) e o jogo não depende de nenhuma outra origem', async () => {
    const { POLITICA_CSP } = await import('../../vite.config');
    expect(POLITICA_CSP).toContain("font-src 'self'");
    expect(POLITICA_CSP).not.toMatch(/https?:|\*/);
  });
});
