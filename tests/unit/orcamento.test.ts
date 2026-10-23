import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { carregarFerramenta } from './_ferramenta';

/*
 * Portao de orcamento (T8, ferramentas/orcamento): roda contra um dist FALSO montado em pasta temporaria. Nada aqui le
 * `dist/` real, `public/` ou `arte-fonte/`; os WebP falsos so tem o cabecalho RIFF/VP8X e bytes aleatorios de enchimento.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const orc = await carregarFerramenta<{
  dimensoesWebp: (b: Buffer) => { w: number; h: number } | null;
  jsIniciais: (html: string) => string[];
  medir: (dist: string, cfg: any) => any[];
  avaliar: (linhas: any[], cfg: any, modo?: string) => any[];
  resumo: (linhas: any[]) => { total: number; ok: number; avisos: number; falhas: number };
  tabela: (linhas: any[]) => string;
  lerConfig: (c: string) => any;
}>('ferramentas/orcamento/orcamento.mjs');

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const CLI = join(RAIZ, 'ferramentas/orcamento/cli.mjs');
const CFG_REAL = join(RAIZ, 'ferramentas/orcamento/orcamento.json');
const MIB = 1024 * 1024;
const KIB = 1024;

const tmp = mkdtempSync(join(tmpdir(), 'orcamento-teste-'));
sharp.cache(false);
afterAll(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

/** WebP falso: cabecalho VP8X com w x h reais e enchimento ate `bytes`. */
function webpFalso(w: number, h: number, bytes: number): Buffer {
  const b = Buffer.concat([Buffer.alloc(30), randomBytes(Math.max(0, bytes - 30))]);
  b.write('RIFF', 0, 'ascii');
  b.writeUInt32LE(b.length - 8, 4);
  b.write('WEBPVP8X', 8, 'ascii');
  b.writeUInt32LE(10, 16);
  b.writeUIntLE(w - 1, 24, 3);
  b.writeUIntLE(h - 1, 27, 3);
  return b;
}

interface Opcoes {
  jsInicialBytes?: number; // incompressivel: gzip ~ igual
  jsExtraBytes?: number;
  escutaBytes?: number;
  atlas?: Record<string, { paginas: number; bytesPorPagina: number; w: number; h: number }>;
  cenarios?: Record<string, number>; // nome -> bytes
}

let n = 0;
function montarDist(o: Opcoes = {}): string {
  const dist = join(tmp, `dist-${n++}`);
  const escrever = (rel: string, dado: Buffer | string) => {
    const p = join(dist, rel);
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, dado);
  };
  escrever(
    'index.html',
    '<!doctype html><html><head><link rel="icon" href="/x.ico">' +
      '<script type="module" crossorigin src="/assets/index-AAA.js"></script>' +
      '<link rel="modulepreload" crossorigin href="/assets/contratos-BBB.js">' +
      '<link rel="stylesheet" crossorigin href="/assets/index-CCC.css"></head><body></body></html>',
  );
  escrever('assets/index-AAA.js', randomBytes(o.jsInicialBytes ?? 100_000));
  escrever('assets/contratos-BBB.js', randomBytes(10_000));
  escrever('assets/trailer-DDD.js', randomBytes(o.jsExtraBytes ?? 20_000)); // so no total
  escrever('assets/escuta-EEE.js', randomBytes(o.escutaBytes ?? 60_000)); // fora do total
  escrever('assets/index-AAA.js.map', randomBytes(500_000)); // mapa nunca conta
  const atlas = o.atlas ?? { hayato: { paginas: 2, bytesPorPagina: 0.6 * MIB, w: 2048, h: 1536 } };
  for (const [id, a] of Object.entries(atlas)) {
    for (let i = 0; i < a.paginas; i++) escrever(`assets/lutadores/${id}/atlas-${i}.webp`, webpFalso(a.w, a.h, a.bytesPorPagina));
    escrever(`assets/lutadores/${id}/atlas.json`, JSON.stringify({ versao: 2, tamanho: [a.w, a.h] }));
    escrever(`assets/lutadores/${id}/retrato.png`, randomBytes(2000));
  }
  for (const [nome, bytes] of Object.entries(o.cenarios ?? { 'cenario-jp.webp': 200 * KIB })) escrever(`assets/cenarios/${nome}`, randomBytes(bytes));
  return dist;
}

const cfg = orc.lerConfig(CFG_REAL);
const rodar = (dist: string, extra: string[] = []) => spawnSync(process.execPath, [CLI, `--dist=${dist}`, ...extra], { encoding: 'utf8', env: { ...process.env, GITHUB_ACTIONS: '' } });
const porChave = (linhas: any[], chave: string) => linhas.find((l) => l.chave === chave);

describe('orcamento: configuracao', () => {
  it('traz as metas aprovadas (OR-1) e nasce toda em aviso', () => {
    expect(cfg.jsInicialKb).toBe(135);
    expect(cfg.jsTotalKb).toBe(200);
    expect(cfg.jsExcluidos).toEqual(['escuta']);
    expect(cfg.atlasMiB).toBe(1.6);
    expect(cfg.atlasExcecoesMiB).toEqual({ baatar: 2.0, zenon: 2.0 });
    expect(cfg.atlasPaginaPx).toBe(2048);
    expect(cfg.cenarioKiB).toBe(250);
    expect(cfg.bloqueantes).toEqual([]);
  });
});

describe('orcamento: leitura do dist', () => {
  it('dist dentro das metas: tudo OK e exit 0', () => {
    const linhas = orc.avaliar(orc.medir(montarDist(), cfg), cfg);
    expect(orc.resumo(linhas)).toMatchObject({ avisos: 0, falhas: 0 });
    expect(linhas.every((l) => l.status === 'OK')).toBe(true);
    expect(rodar(montarDist()).status).toBe(0);
  });

  it('JS inicial = entrada + modulepreload (nao o total); o .map e ignorado', () => {
    const dist = montarDist({ jsInicialBytes: 100_000 });
    const linhas = orc.medir(dist, cfg);
    const inicial = porChave(linhas, 'js-inicial');
    expect(inicial.medido).toMatch(/^110\.[0-2] kB$/); // 100 000 + 10 000 bytes aleatorios: o gzip so soma ~0,03%
  });

  it('o pedaço `escuta` fica fora do JS total, os demais entram', () => {
    // inicial 110 + trailer 20 = ~130 kB; com escuta (60) iria a ~190, ainda < 200: usa 100k de escuta para provar a exclusao
    const dist = montarDist({ escutaBytes: 100_000, jsExtraBytes: 70_000 });
    const total = porChave(orc.medir(dist, cfg), 'js-total');
    expect(total.passou).toBe(true); // 100+10+70 = ~180; somando a escuta (100) daria ~280 e falharia
    expect(total.medido).toMatch(/^18\d\.\d kB$/);
    const semExclusao = porChave(orc.medir(dist, { ...cfg, jsExcluidos: [] }), 'js-total');
    expect(semExclusao.passou).toBe(false);
  });

  it('JS inicial acima de 135 kB estoura (aviso) e o JS total acima de 200 kB tambem', () => {
    const linhas = orc.avaliar(orc.medir(montarDist({ jsInicialBytes: 140_000, jsExtraBytes: 80_000 }), cfg), cfg);
    expect(porChave(linhas, 'js-inicial').status).toBe('AVISO');
    expect(porChave(linhas, 'js-total').status).toBe('AVISO');
  });

  it('atlas: peso <= 1,6 MiB, com excecao nominal de 2,0 para BAATAR e ZENON', () => {
    const dist = montarDist({
      atlas: {
        hayato: { paginas: 2, bytesPorPagina: 0.9 * MIB, w: 2048, h: 1536 }, // 1,8 MiB: estoura
        baatar: { paginas: 4, bytesPorPagina: 0.45 * MIB, w: 2048, h: 1664 }, // 1,8 MiB: passa por excecao
        zenon: { paginas: 4, bytesPorPagina: 0.55 * MIB, w: 2048, h: 1920 }, // 2,2 MiB: estoura ate a excecao
      },
    });
    const linhas = orc.medir(dist, cfg);
    expect(porChave(linhas, 'atlas-peso:hayato').passou).toBe(false);
    expect(porChave(linhas, 'atlas-peso:baatar').passou).toBe(true);
    expect(porChave(linhas, 'atlas-peso:zenon').passou).toBe(false);
  });

  it('atlas: pagina de 3600 x 2296 (WEI LONG v1) estoura; 2048 x 2048 passa', () => {
    const dist = montarDist({
      atlas: {
        'wei-long': { paginas: 1, bytesPorPagina: 1.2 * MIB, w: 3600, h: 2296 },
        caio: { paginas: 2, bytesPorPagina: 0.5 * MIB, w: 2048, h: 2048 },
      },
    });
    const linhas = orc.medir(dist, cfg);
    const wei = porChave(linhas, 'atlas-px:wei-long');
    expect(wei.passou).toBe(false);
    expect(wei.medido).toBe('3600 x 2296');
    expect(porChave(linhas, 'atlas-px:caio').passou).toBe(true);
  });

  it('cenario: > 250 KiB estoura', () => {
    const linhas = orc.medir(montarDist({ cenarios: { 'kr.jpg': 305 * KIB, 'cenario-jp.webp': 230 * KIB } }), cfg);
    expect(porChave(linhas, 'cenario-peso:kr.jpg').passou).toBe(false);
    expect(porChave(linhas, 'cenario-peso:cenario-jp.webp').passou).toBe(true);
  });

  it('a tabela tem item | meta | medido | status', () => {
    const t = orc.tabela(orc.avaliar(orc.medir(montarDist(), cfg), cfg));
    const [cab] = t.split('\n');
    expect(cab!.split('|').map((c) => c.trim()).filter(Boolean)).toEqual(['item', 'meta', 'medido', 'status']);
    expect(t).toContain('JS inicial (gzip)');
  });
});

describe('orcamento: aviso x bloqueante (exit code do CLI)', () => {
  const dist3600 = () => montarDist({ atlas: { 'wei-long': { paginas: 1, bytesPorPagina: 1.2 * MIB, w: 3600, h: 2296 } } });

  it('padrao = aviso: o item estourado aparece na tabela, mas o exit e 0', () => {
    const r = rodar(dist3600());
    expect(r.status).toBe(0);
    expect(r.stdout).toMatch(/Atlas wei-long: pagina \(px\)\s*\|[^|]*\|\s*3600 x 2296\s*\|\s*AVISO/);
  });

  it('--modo=bloqueante: o atlas de 3600 px derruba (exit 1)', () => {
    const r = rodar(dist3600(), ['--modo=bloqueante']);
    expect(r.status).toBe(1);
    expect(r.stdout).toContain('FALHA');
  });

  it('ORCAMENTO_MODO=bloqueante tem o mesmo efeito do argumento', () => {
    const r = spawnSync(process.execPath, [CLI, `--dist=${dist3600()}`], { encoding: 'utf8', env: { ...process.env, ORCAMENTO_MODO: 'bloqueante', GITHUB_ACTIONS: '' } });
    expect(r.status).toBe(1);
  });

  it('promocao por item: so o grupo/chave listado em `bloqueantes` derruba', () => {
    const dist = dist3600();
    const mkCfg = (bloqueantes: string[]) => {
      const p = join(tmp, `cfg-${n++}.json`);
      writeFileSync(p, JSON.stringify({ ...cfg, bloqueantes }));
      return p;
    };
    expect(rodar(dist, [`--config=${mkCfg(['atlas-px'])}`]).status).toBe(1); // grupo
    expect(rodar(dist, [`--config=${mkCfg(['atlas-px:wei-long'])}`]).status).toBe(1); // chave exata
    expect(rodar(dist, [`--config=${mkCfg(['*'])}`]).status).toBe(1);
    expect(rodar(dist, [`--config=${mkCfg(['atlas-px:caio'])}`]).status).toBe(0); // outro item: continua aviso
    expect(rodar(dist, [`--config=${mkCfg(['js-inicial', 'cenario-peso'])}`]).status).toBe(0); // grupos que passam
  });

  it('dist inexistente: exit 2 (build nao rodou), mesmo em aviso', () => {
    const r = rodar(join(tmp, 'nao-existe'));
    expect(r.status).toBe(2);
    expect(r.stderr).toContain('index.html');
  });

  it('modo invalido: exit 2', () => {
    expect(rodar(montarDist(), ['--modo=talvez']).status).toBe(2);
  });
});

describe('orcamento: leitor de cabecalho WebP (contra o encoder real)', () => {
  const pixels = (w: number, h: number) => ({ create: { width: w, height: h, channels: 4 as const, background: { r: 200, g: 30, b: 30, alpha: 0.5 } } });

  it('le VP8 (lossy), VP8L (lossless) e VP8X (com alpha/animacao) iguais ao que o sharp escreveu', async () => {
    const lossy = await sharp({ create: { width: 321, height: 123, channels: 3, background: '#3a7' } }).webp({ quality: 70 }).toBuffer();
    const lossless = await sharp(pixels(77, 55)).webp({ lossless: true }).toBuffer();
    const comAlpha = await sharp(pixels(640, 480)).webp({ quality: 80 }).toBuffer();
    expect(lossy.toString('ascii', 12, 16)).toBe('VP8 ');
    expect(orc.dimensoesWebp(lossy)).toEqual({ w: 321, h: 123 });
    expect(orc.dimensoesWebp(lossless)).toEqual({ w: 77, h: 55 });
    expect(orc.dimensoesWebp(comAlpha)).toEqual({ w: 640, h: 480 });
  });

  it('devolve null para o que nao e WebP', () => {
    expect(orc.dimensoesWebp(Buffer.from('nao sou webp, so texto comprido o bastante'))).toBeNull();
    expect(orc.dimensoesWebp(Buffer.alloc(10))).toBeNull();
  });

  it('jsIniciais pega script module e modulepreload, ignora css/icone e tira a barra inicial', () => {
    const html = '<script type="module" src="/assets/a.js"></script><link rel="modulepreload" href="/assets/b.js?x=1"><link rel="stylesheet" href="/assets/c.css"><script src="/assets/legado.js"></script>';
    expect(orc.jsIniciais(html)).toEqual(['assets/a.js', 'assets/b.js']);
  });
});
