import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ARQUIVOS_DA_MARCA,
  ARQUIVOS_DAS_FONTES,
  CENARIO_PADRAO_DA_ETAPA0,
  MANIFESTO_DE_SONS,
  PASTA_DA_MARCA,
  PEDACOS_DA_ETAPA0,
  arquivosDaEtapa0,
  arquivosFixosDaEtapa0,
  caminhoDoManifestoDoLutador,
} from '../../src/assets/etapa0.mjs';
import { urlManifesto } from '../../src/assets/carregador';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { CENARIO_PADRAO, CENARIOS } from '../../src/data/cenarios';
import { iniciarMarca, reiniciarMarcaParaTeste } from '../../src/ui/logo';

/*
 * Etapa 0 do boot (T4, docs/orcamentos-2026-10-23.md §2.2): a lista é a MESMA para o boot e para o service worker (contrato T4/T7). Estes testes travam os pontos
 * em que as duas pontas poderiam divergir: os arquivos existem em public/, o CSS e o index.html citam as mesmas fontes e o splash, a marca é carregada por esta lista,
 * os pedaços de JS do boot são os que \`camadas.ts\` importa, e o gerador de extras falha alto quando um pedaço some.
 */

const RAIZ = process.cwd();
const ler = (c: string): string => readFileSync(join(RAIZ, c), 'utf8');

describe('lista fixa da etapa 0', () => {
  const fixos = arquivosFixosDaEtapa0(IDS_LUTADORES);

  it('tem os 10 manifestos, o cenário padrão, a marca, as fontes e o manifesto de sons — e nenhuma imagem de atlas, retrato, FILME nem som', () => {
    for (const id of IDS_LUTADORES) expect(fixos).toContain(`assets/lutadores/${id}/atlas.json`);
    expect(fixos).toContain(CENARIOS[CENARIO_PADRAO].arquivo);
    for (const a of Object.values(ARQUIVOS_DA_MARCA)) expect(fixos).toContain(`${PASTA_DA_MARCA}${a}`);
    for (const f of ARQUIVOS_DAS_FONTES) expect(fixos).toContain(f);
    expect(fixos).toContain(MANIFESTO_DE_SONS);
    expect(fixos.filter((c) => /atlas-?\d*\.webp|retrato|filme|\.mp3/.test(c))).toEqual([]);
    expect(new Set(fixos).size).toBe(fixos.length);
  });

  it('todo arquivo da lista existe em public/', () => {
    for (const c of fixos) expect(existsSync(join(RAIZ, 'public', c)), c).toBe(true);
  });

  it('os caminhos que o boot monta (carregador) saem das mesmas funções da lista', () => {
    expect(urlManifesto('/Base/', 'hayato')).toBe(`/Base/${caminhoDoManifestoDoLutador('hayato')}`);
    expect(CENARIO_PADRAO_DA_ETAPA0).toBe(CENARIOS[CENARIO_PADRAO].arquivo); // o .mjs (Node puro) repete o arquivo do cenário padrão: aqui a cópia não pode divergir
  });

  it('os lutadores da etapa 0 saem do dist: os que têm atlas.json em public/ são exatamente os do elenco', () => {
    const dePublic = readdirSync(join(RAIZ, 'public/assets/lutadores')).filter((d) => existsSync(join(RAIZ, 'public/assets/lutadores', d, 'atlas.json')));
    expect(dePublic.sort()).toEqual([...IDS_LUTADORES].sort());
    const dist = [...dePublic.map((d) => `assets/lutadores/${d}/atlas.json`), ...PEDACOS_DA_ETAPA0.map((n) => `assets/${n}-X.js`)];
    expect(arquivosDaEtapa0(dist).filter((c) => c.endsWith('atlas.json'))).toHaveLength(IDS_LUTADORES.length);
  });

  it('as fontes da lista são as de src/fontes.css e as pré-carregadas no index.html', () => {
    const css = [...ler('src/fontes.css').matchAll(/url\("\/([^"]+)"\)/g)].map((m) => m[1]);
    expect([...css].sort()).toEqual([...ARQUIVOS_DAS_FONTES].sort());
    const html = ler('index.html');
    for (const f of ARQUIVOS_DAS_FONTES) expect(html, f).toContain(`href="/${f}"`);
    expect(html).toContain(`href="/${PASTA_DA_MARCA}${ARQUIVOS_DA_MARCA.splash}"`); // o splash é pré-carregado antes do JS
  });

  it('a marca é carregada por esta lista: iniciarMarca pede exatamente os 3 arquivos, sob a base', () => {
    const pedidos: string[] = [];
    reiniciarMarcaParaTeste(
      (url) => {
        pedidos.push(url);
        return Promise.reject(new Error('sem rede no teste'));
      },
      '/Base/',
    );
    iniciarMarca('/Base/');
    expect(pedidos.sort()).toEqual(Object.values(ARQUIVOS_DA_MARCA).map((a) => `/Base/${PASTA_DA_MARCA}${a}`).sort());
    reiniciarMarcaParaTeste();
  });
});

describe('pedaços de JS da etapa 0', () => {
  it('são os módulos que camadas.ts importa no boot (import() dinâmico)', () => {
    const importados = [...ler('src/audio/camadas.ts').matchAll(/import\('\.\/([a-z-]+)'\)/g)].map((m) => m[1] as string);
    expect(importados.length).toBeGreaterThan(0);
    for (const nome of importados) expect(PEDACOS_DA_ETAPA0, nome).toContain(nome);
  });

  const dist = [
    ...IDS_LUTADORES.map((id) => `assets/lutadores/${id}/atlas.json`),
    'assets/index-AAA.js',
    'assets/identidade-sonora-BBB.js',
    'assets/partitura-CCC.js',
    'assets/amostras-DDD.js',
    'assets/amostras-EEE.js',
    'assets/temas-FFF.js',
    'assets/trailer-GGG.js',
    'assets/escuta-HHH.js',
    'assets/identidade-sonora-BBB.js.map',
  ];

  it('arquivosDaEtapa0 junta os fixos aos pedaços do dist (todos os de mesmo nome), sem o trailer, a escuta nem os .map', () => {
    const l = arquivosDaEtapa0(dist);
    for (const c of ['assets/identidade-sonora-BBB.js', 'assets/partitura-CCC.js', 'assets/amostras-DDD.js', 'assets/amostras-EEE.js', 'assets/temas-FFF.js']) expect(l).toContain(c);
    for (const c of ['assets/trailer-GGG.js', 'assets/escuta-HHH.js', 'assets/index-AAA.js', 'assets/identidade-sonora-BBB.js.map']) expect(l).not.toContain(c);
    for (const c of arquivosFixosDaEtapa0(IDS_LUTADORES)) expect(l).toContain(c);
    expect(new Set(l).size).toBe(l.length);
    expect([...l]).toEqual([...l].sort());
  });

  it('falha alto quando um pedaço da etapa 0 não existe no dist (renomeado ou removido)', () => {
    expect(() => arquivosDaEtapa0(dist.filter((c) => !c.includes('temas')))).toThrow(/temas/);
  });
});
