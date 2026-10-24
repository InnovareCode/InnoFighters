import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { decidirSw, trocaRecente } from '../../src/platform/sw';
import {
  NOME_CACHE_ARTE,
  cachesNossos,
  caminhoNoEscopo,
  chaveDeRevisao,
  escolherEstrategia,
  htmlEhDestaVersao,
  lerChave,
  mesmaVersaoDoBuild,
  nomeCacheShell,
  planoDeLimpeza,
  respostaGuardavel,
  usadosParaGuardar,
} from '../../src/sw/logica';
import { definirAtualizadorSw, recarregarSemCache } from '../../src/versao';
import { carregarFerramenta } from './_ferramenta';

/*
 * Service worker (T7). Lógica pura (src/sw/logica.ts), gerador do manifesto de revisões (ferramentas/sw) e decisão de registro (src/platform/sw.ts).
 * O comportamento no navegador (instalar, offline, atualizar) é provado em tests/e2e-build/service-worker.spec.ts. Nada aqui lê dist/ ou public/ reais.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
/* eslint-disable @typescript-eslint/no-explicit-any */
const ger = await carregarFerramenta<{
  hashDeConteudo: (b: Uint8Array) => string;
  listarArquivos: (d: string) => string[];
  relativoABase: (href: string, base: string) => string | null;
  referenciasDoHtml: (h: string) => { refs: string[]; entrada: string | null };
  gerarManifesto: (o: any) => any;
  escreverManifesto: (o: any) => any;
  textoDoManifesto: (m: any) => string;
}>('ferramentas/sw/manifesto.mjs');

const tmp = mkdtempSync(join(tmpdir(), 'sw-teste-'));
afterAll(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

const ESCOPO = 'https://x.github.io/InnoFighters/';
const REV = { 'assets/index-AAA.js': 'r1', 'assets/lutadores/hayato/atlas.webp': 'r2', 'manifest.webmanifest': 'r3', 'assets/c#.png': 'r4' };

describe('SW: caminho no escopo e chave de revisão', () => {
  it('tira a base e a query; recusa outra origem e fora do escopo', () => {
    expect(caminhoNoEscopo(`${ESCOPO}assets/a.js?x=1#h`, ESCOPO)).toBe('assets/a.js');
    expect(caminhoNoEscopo(ESCOPO, ESCOPO)).toBe('');
    expect(caminhoNoEscopo(`${ESCOPO}?trailer=1`, ESCOPO)).toBe('');
    expect(caminhoNoEscopo('https://outro.com/InnoFighters/assets/a.js', ESCOPO)).toBeNull();
    expect(caminhoNoEscopo('https://x.github.io/Outro/a.js', ESCOPO)).toBeNull();
    expect(caminhoNoEscopo('lixo', ESCOPO)).toBeNull();
  });

  it('funciona na raiz (EasyPanel) e decodifica o caminho como o build o lista', () => {
    expect(caminhoNoEscopo('https://jogo.com/assets/c%23.png', 'https://jogo.com/')).toBe('assets/c#.png');
  });

  it('a chave de cache muda com a revisão e é reversível', () => {
    const a = chaveDeRevisao(ESCOPO, 'assets/x.webp', 'aaa');
    const b = chaveDeRevisao(ESCOPO, 'assets/x.webp', 'bbb');
    expect(a).not.toBe(b);
    expect(lerChave(a, ESCOPO)).toEqual({ caminho: 'assets/x.webp', revisao: 'aaa' });
    expect(lerChave('https://outro.com/x?__rev=1', ESCOPO)).toBeNull();
    expect(lerChave(`${ESCOPO}assets/x.webp`, ESCOPO)).toBeNull();
  });
});

describe('SW: escolha de estratégia', () => {
  const GET = { metodo: 'GET', modo: 'no-cors', temRange: false } as const;
  const est = (p: Partial<{ metodo: string; modo: string; caminho: string | null; temRange: boolean }>) => escolherEstrategia({ ...GET, caminho: '', ...p }, REV);

  it('navegação para a base ou index.html (com qualquer query) vem do shell; outra página passa direto', () => {
    expect(est({ modo: 'navigate', caminho: '' })).toBe('navegacao');
    expect(est({ modo: 'navigate', caminho: 'index.html' })).toBe('navegacao');
    expect(est({ modo: 'navigate', caminho: 'prototipo/x.html' })).toBe('ignorar');
  });

  it('arquivo do manifesto = revisão; fora do manifesto = rede', () => {
    expect(est({ caminho: 'assets/lutadores/hayato/atlas.webp' })).toBe('revisao');
    expect(est({ caminho: 'assets/index-AAA.js' })).toBe('revisao');
    expect(est({ caminho: 'manifest.webmanifest' })).toBe('revisao');
    expect(est({ caminho: 'assets/lutadores/novo/atlas.webp' })).toBe('ignorar');
  });

  it('nunca intercepta version.json, sw.js e o manifesto, nem POST, nem Range, nem outra origem', () => {
    for (const c of ['version.json', 'sw.js', 'sw-manifesto.js']) expect(escolherEstrategia({ ...GET, caminho: c }, { ...REV, [c]: 'x' })).toBe('ignorar');
    expect(est({ metodo: 'POST', caminho: 'assets/index-AAA.js' })).toBe('ignorar');
    expect(est({ temRange: true, caminho: 'assets/lutadores/hayato/atlas.webp' })).toBe('ignorar');
    expect(est({ caminho: null })).toBe('ignorar');
  });

  it('chave herdada do protótipo de objeto não vira "no manifesto"', () => {
    expect(est({ caminho: 'constructor' })).toBe('ignorar');
    expect(est({ caminho: '__proto__' })).toBe('ignorar');
    expect(est({ caminho: 'toString' })).toBe('ignorar');
  });
});

describe('SW: o que se guarda', () => {
  it('só 200; nada de 206, 404, 304; HTML no lugar de arquivo de dados não entra', () => {
    expect(respostaGuardavel({ status: 200, tipoConteudo: 'image/webp', caminho: 'assets/a.webp' })).toBe(true);
    expect(respostaGuardavel({ status: 200, tipoConteudo: null, caminho: 'assets/a.webp' })).toBe(true);
    expect(respostaGuardavel({ status: 206, tipoConteudo: 'audio/mpeg', caminho: 'assets/a.mp3' })).toBe(false);
    expect(respostaGuardavel({ status: 404, tipoConteudo: 'text/html', caminho: 'assets/a.webp' })).toBe(false);
    expect(respostaGuardavel({ status: 200, tipoConteudo: 'text/html; charset=utf-8', caminho: 'assets/a.webp' })).toBe(false);
    expect(respostaGuardavel({ status: 200, tipoConteudo: 'text/html', caminho: 'index.html' })).toBe(true);
  });

  it('o index.html só vale se citar o arquivo de entrada DESTA versão', () => {
    const html = '<script type="module" src="/InnoFighters/assets/index-AAA.js"></script>';
    expect(htmlEhDestaVersao(html, 'assets/index-AAA.js')).toBe(true);
    expect(htmlEhDestaVersao(html.replace('AAA', 'BBB'), 'assets/index-AAA.js')).toBe(false);
    expect(htmlEhDestaVersao('qualquer coisa', '')).toBe(false);
  });

  it('a captura da 1ª visita só vale se a página roda a mesma versão do SW', () => {
    const m = { build: { commit: 'abc1234', data: '2026-10-24T00:00:00.000Z' } };
    expect(mesmaVersaoDoBuild(m, { commit: 'abc1234', data: '2026-10-24T00:00:00.000Z' })).toBe(true);
    expect(mesmaVersaoDoBuild(m, { commit: 'abc1234', data: 'outra' })).toBe(false);
    expect(mesmaVersaoDoBuild(m, {})).toBe(false);
  });

  it('das URLs usadas guarda só as do escopo e do manifesto, sem repetir e sem o que já está guardado', () => {
    const urls = [
      `${ESCOPO}assets/lutadores/hayato/atlas.webp`,
      `${ESCOPO}assets/lutadores/hayato/atlas.webp?t=2`,
      `${ESCOPO}assets/index-AAA.js`,
      `${ESCOPO}assets/nao-existe.webp`,
      `${ESCOPO}version.json?t=1`,
      'https://cdn.exemplo.com/assets/index-AAA.js',
      42,
      null,
    ];
    const ja = new Set([chaveDeRevisao(ESCOPO, 'assets/index-AAA.js', 'r1')]);
    expect(usadosParaGuardar(urls, ESCOPO, REV, ja)).toEqual(['assets/lutadores/hayato/atlas.webp']);
    expect(usadosParaGuardar(urls, ESCOPO, REV, new Set(), 1)).toHaveLength(1);
  });
});

describe('SW: limpeza ao ativar', () => {
  const versao = 'abc.1234';
  const k = (c: string, r: string) => chaveDeRevisao(ESCOPO, c, r);

  it('apaga shell de outras versões e caches inno-* desconhecidos; preserva cache de outro dono e o atual', () => {
    const p = planoDeLimpeza({
      caches: [NOME_CACHE_ARTE, nomeCacheShell(versao), nomeCacheShell('velha.0000'), 'inno-legado', 'workbox-precache', 'outro-app'],
      chavesDaArte: [],
      versao,
      escopo: ESCOPO,
      revisoes: REV,
    });
    expect(p.apagarCaches.sort()).toEqual(['inno-legado', nomeCacheShell('velha.0000')]);
  });

  it('na arte apaga a revisão velha e o arquivo que saiu do build; mantém a revisão atual', () => {
    const p = planoDeLimpeza({
      caches: [NOME_CACHE_ARTE],
      chavesDaArte: [k('assets/lutadores/hayato/atlas.webp', 'r2'), k('assets/lutadores/hayato/atlas.webp', 'VELHA'), k('assets/index-ANTIGO.js', 'x'), `${ESCOPO}sem-revisao`],
      versao,
      escopo: ESCOPO,
      revisoes: REV,
    });
    expect(p.apagarChaves.sort()).toEqual([k('assets/index-ANTIGO.js', 'x'), k('assets/lutadores/hayato/atlas.webp', 'VELHA'), `${ESCOPO}sem-revisao`].sort());
  });

  it('a aposentadoria leva todos os caches inno-* e só eles', () => {
    expect(cachesNossos(['inno-arte-v1', 'inno-shell-x', 'outro'])).toEqual(['inno-arte-v1', 'inno-shell-x']);
  });
});

describe('registro: kill switch e produção', () => {
  const base = { producao: true, temSuporte: true, search: '', flag: null as string | null };
  it('em dev, em teste de e2e (dev server) ou sem suporte: não faz nada', () => {
    expect(decidirSw({ ...base, producao: false }).acao).toBe('ignorar');
    expect(decidirSw({ ...base, temSuporte: false }).acao).toBe('ignorar');
    expect(decidirSw({ ...base, producao: false, search: '?sw=0' })).toEqual({ acao: 'ignorar', flag: 'manter' });
  });
  it('produção: registra por padrão; ?trailer=, ?residencia= e ?motorv2= não mexem', () => {
    expect(decidirSw(base)).toEqual({ acao: 'registrar', flag: 'manter' });
    expect(decidirSw({ ...base, search: '?trailer=1&residencia=fixa&motorv2=0' })).toEqual({ acao: 'registrar', flag: 'manter' });
  });
  it('?sw=0 desliga e grava a flag; a flag mantém desligado sem o parâmetro; ?sw=1 religa e apaga a flag', () => {
    expect(decidirSw({ ...base, search: '?sw=0' })).toEqual({ acao: 'desligar', flag: 'gravar-desligado' });
    expect(decidirSw({ ...base, flag: '0' })).toEqual({ acao: 'desligar', flag: 'manter' });
    expect(decidirSw({ ...base, flag: '0', search: '?sw=1' })).toEqual({ acao: 'registrar', flag: 'apagar' });
  });
  it('a trava de troca: 15 s depois de uma troca não tenta outra (evita laço de recarga)', () => {
    expect(trocaRecente(String(1000), 5000)).toBe(true);
    expect(trocaRecente(String(1000), 20_000)).toBe(false);
    expect(trocaRecente(null, 5000)).toBe(false);
    expect(trocaRecente('lixo', 5000)).toBe(false);
    expect(trocaRecente(String(9000), 5000)).toBe(false);
  });
});

describe('versão: o botão "atualizar" passa pelo SW', () => {
  const alvoFalso = () => {
    const r = { destino: '' };
    return { r, alvo: { location: { href: 'https://x.io/J/?seed=3', replace: (u: string) => (r.destino = u) } } as unknown as Pick<Window, 'location'> };
  };
  it('troca feita pelo SW: não recarrega por conta própria (o controllerchange recarrega)', async () => {
    const { r, alvo } = alvoFalso();
    definirAtualizadorSw(() => Promise.resolve(true));
    recarregarSemCache(alvo, null);
    await Promise.resolve();
    await Promise.resolve();
    expect(r.destino).toBe('');
    definirAtualizadorSw(null);
  });
  it('SW sem versão nova ou com erro: recarrega com ?v= como antes', async () => {
    for (const f of [() => Promise.resolve(false), () => Promise.reject(new Error('x'))]) {
      const { r, alvo } = alvoFalso();
      definirAtualizadorSw(f);
      recarregarSemCache(alvo, { commit: 'abc1234', data: '', sujo: false });
      await new Promise((ok) => setTimeout(ok, 5));
      expect(r.destino).toBe('https://x.io/J/?seed=3&v=abc1234');
    }
    definirAtualizadorSw(null);
  });
});

function distFalso(nome: string, extra: Record<string, string> = {}, base = '/'): string {
  const dist = join(tmp, nome);
  const arquivos: Record<string, string> = {
    'index.html': `<html><head><link rel="manifest" href="${base}manifest.webmanifest"><link rel="icon" href="${base}assets/ui/i.png"><link rel="preload" href="${base}assets/fontes/f.woff2" as="font"><link rel="modulepreload" href="${base}assets/dep-123.js"><link rel="stylesheet" href="${base}assets/index-abc.css"><script type="module" src="${base}assets/index-XYZ.js"></script></head></html>`,
    'manifest.webmanifest': JSON.stringify({ icons: [{ src: 'assets/ui/ic-192.png' }, { src: 'assets/ui/ic-512.png' }] }),
    'version.json': '{"commit":"abc1234","data":"2026-10-24T00:00:00.000Z","sujo":false}',
    'assets/index-XYZ.js': 'export {}',
    'assets/index-XYZ.js.map': '{}',
    'assets/dep-123.js': 'dep',
    'assets/index-abc.css': 'css',
    'assets/ui/i.png': 'png',
    'assets/ui/ic-192.png': 'a',
    'assets/ui/ic-512.png': 'b',
    'assets/fontes/f.woff2': 'fonte',
    'assets/lutadores/hayato/atlas.webp': 'arte-v1',
    ...extra,
  };
  for (const [c, t] of Object.entries(arquivos)) {
    mkdirSync(dirname(join(dist, c)), { recursive: true });
    writeFileSync(join(dist, c), t);
  }
  return dist;
}

describe('gerador do manifesto de revisões', () => {
  it('hash de conteúdo: igual para o mesmo conteúdo, diferente se um byte muda', () => {
    expect(ger.hashDeConteudo(Buffer.from('a'))).toBe(ger.hashDeConteudo(Buffer.from('a')));
    expect(ger.hashDeConteudo(Buffer.from('a'))).not.toBe(ger.hashDeConteudo(Buffer.from('b')));
    expect(ger.hashDeConteudo(Buffer.from('a'))).toMatch(/^[0-9a-f]{16}$/);
  });

  it('lista revisões sem .map, index.html, version.json e os arquivos do próprio SW; shell sai do HTML + ícones do manifest do app', () => {
    const dist = distFalso('a');
    writeFileSync(join(dist, 'sw.js'), 'x');
    const m = ger.gerarManifesto({ dist, base: '/', build: { commit: 'abc1234', data: 'd' } });
    expect(Object.keys(m.revisoes)).not.toContain('index.html');
    expect(Object.keys(m.revisoes)).not.toContain('version.json');
    expect(Object.keys(m.revisoes)).not.toContain('sw.js');
    expect(Object.keys(m.revisoes).some((c) => c.endsWith('.map'))).toBe(false);
    expect(Object.keys(m.revisoes)).toContain('assets/lutadores/hayato/atlas.webp');
    expect(m.marca).toBe('assets/index-XYZ.js');
    expect(m.shell).toEqual([
      'assets/dep-123.js',
      'assets/fontes/f.woff2',
      'assets/index-XYZ.js',
      'assets/index-abc.css',
      'assets/ui/i.png',
      'assets/ui/ic-192.png',
      'assets/ui/ic-512.png',
      'manifest.webmanifest',
    ]);
    // a arte da vitrine NÃO está no shell: ela só entra no cache quando é usada
    expect(m.shell).not.toContain('assets/lutadores/hayato/atlas.webp');
    expect(m.versao).toMatch(/^abc1234\.[0-9a-f]{8}$/);
    expect(m.build).toEqual({ commit: 'abc1234', data: 'd' });
  });

  it('a revisão e a versão MUDAM quando a arte (sem hash no nome) muda, e só a dela; arquivos iguais mantêm a revisão', () => {
    const v1 = ger.gerarManifesto({ dist: distFalso('b1'), build: { commit: 'c', data: 'd' } });
    const v2 = ger.gerarManifesto({ dist: distFalso('b2', { 'assets/lutadores/hayato/atlas.webp': 'arte-v2' }), build: { commit: 'c', data: 'd' } });
    const igual = ger.gerarManifesto({ dist: distFalso('b3'), build: { commit: 'c', data: 'd' } });
    expect(v2.revisoes['assets/lutadores/hayato/atlas.webp']).not.toBe(v1.revisoes['assets/lutadores/hayato/atlas.webp']);
    expect(v2.revisoes['assets/ui/i.png']).toBe(v1.revisoes['assets/ui/i.png']);
    expect(v2.versao).not.toBe(v1.versao);
    expect(igual.versao).toBe(v1.versao); // reprodutível: mesmo conteúdo, mesma versão
  });

  it('funciona sob o subcaminho do Pages (/InnoFighters/): caminhos saem relativos à base', () => {
    const dist = distFalso('c', {}, '/InnoFighters/');
    const m = ger.gerarManifesto({ dist, base: '/InnoFighters/', build: { commit: 'c', data: 'd' } });
    expect(m.marca).toBe('assets/index-XYZ.js');
    expect(m.shell).toContain('assets/index-abc.css');
    expect(m.shell).toContain('manifest.webmanifest');
    expect(ger.relativoABase('/InnoFighters/assets/a.js', '/InnoFighters/')).toBe('assets/a.js');
    expect(ger.relativoABase('/assets/a.js', '/InnoFighters/')).toBeNull();
    expect(ger.relativoABase('https://cdn.com/a.js', '/')).toBeNull();
    expect(ger.relativoABase('./assets/a.js', './')).toBe('assets/a.js');
  });

  it('recusa dist sem index.html, sem script de entrada ou com entrada ausente do dist', () => {
    expect(() => ger.gerarManifesto({ dist: join(tmp, 'nao-existe') })).toThrow(/index\.html/);
    const sem = distFalso('d');
    writeFileSync(join(sem, 'index.html'), '<html></html>');
    expect(() => ger.gerarManifesto({ dist: sem })).toThrow(/entrada/);
    const ausente = distFalso('e');
    rmSync(join(ausente, 'assets/index-XYZ.js'));
    expect(() => ger.gerarManifesto({ dist: ausente })).toThrow(/nao esta no dist/);
  });

  it('SW aposentado: o manifesto leva desligado:true', () => {
    expect(ger.gerarManifesto({ dist: distFalso('f'), desligado: true }).desligado).toBe(true);
    expect(ger.gerarManifesto({ dist: distFalso('g') }).desligado).toBeUndefined();
  });

  it('escreve sw-manifesto.js como script clássico que define self.__INNO_MANIFESTO__ (o que o importScripts executa)', () => {
    const dist = distFalso('h');
    const r = ger.escreverManifesto({ dist, build: { commit: 'c', data: 'd' } });
    const texto = readFileSync(join(dist, 'sw-manifesto.js'), 'utf8');
    const self: { __INNO_MANIFESTO__?: any } = {};
    new Function('self', texto)(self);
    expect(self.__INNO_MANIFESTO__).toEqual(r.manifesto);
    expect(r.arquivos).toBe(Object.keys(r.manifesto.revisoes).length);
  });

  it('o script e a CLI passam em Node puro (sem Vite)', () => {
    for (const f of ['manifesto.mjs', 'cli.mjs']) {
      const r = spawnSync(process.execPath, ['--check', join(RAIZ, 'ferramentas/sw', f)], { encoding: 'utf8' });
      expect(r.stderr).toBe('');
      expect(r.status).toBe(0);
    }
    const dist = distFalso('i');
    const cli = spawnSync(process.execPath, [join(RAIZ, 'ferramentas/sw/cli.mjs'), `--dist=${dist}`], { encoding: 'utf8' });
    expect(cli.status).toBe(0);
    expect(cli.stdout).toMatch(/sw-manifesto\.js: versao abc1234\./);
    expect(spawnSync(process.execPath, [join(RAIZ, 'ferramentas/sw/cli.mjs'), `--dist=${join(tmp, 'vazio')}`], { encoding: 'utf8' }).status).toBe(2);
  });
});
