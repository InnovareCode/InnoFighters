import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { validarManifesto } from '../../src/assets/manifesto';
import { carregarFerramenta } from './_ferramenta';

/*
 * Páginas FILME dos 10 lutadores (public/assets/lutadores/<id>/filme.webp + bloco `filme` do atlas.json) e a garantia de que
 * `npm run sprites` não apaga o bloco (a fonte versionada dele é ferramentas/sprites/lutadores.json, chave `filme`).
 * Lê só public/ e ferramentas/; nada de arte-fonte/ (gitignored). O HAYATO é o piloto; os outros 9 entram igual (só dados).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const executar = await carregarFerramenta<{ gerarLutador: (p: any) => Promise<any> }>('ferramentas/sprites/executar.mjs');
const nucleo = await carregarFerramenta<{ validarBlocoFilme: (f: unknown) => string[]; montarManifesto: (p: any) => any }>('ferramentas/sprites/nucleo.mjs');
const orc = await carregarFerramenta<{ dimensoesWebp: (b: Buffer) => { w: number; h: number } | null }>('ferramentas/orcamento/orcamento.mjs');

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const MIB = 1024 * 1024;
const KIB = 1024;
const IDS = ['hayato', 'centella', 'baatar', 'zenon', 'wei-long', 'caio', 'min-ji', 'camille', 'aminu', 'nila'] as const;
const F0_F5 = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'];
/** A AMINU não tem o f2 (o PASSO DO LEÃO usa o Alt: docs/curadoria-filme-grupo-c.md §3). */
const quadrosEsperados = (id: string) => (id === 'aminu' ? F0_F5.filter((n) => n !== 'f2') : F0_F5);

const dirDe = (id: string) => join(RAIZ, 'public', 'assets', 'lutadores', id);
const atlasDe = (id: string) => JSON.parse(readFileSync(join(dirDe(id), 'atlas.json'), 'utf8'));
const excecoes = JSON.parse(readFileSync(join(RAIZ, 'ferramentas', 'sprites', 'lutadores.json'), 'utf8')) as Record<string, any>;

const tmp = mkdtempSync(join(tmpdir(), 'filme-paginas-'));
sharp.cache(false);
afterAll(() => rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 }));

describe.each(IDS)('página FILME de %s no jogo', (id) => {
  const atlas = atlasDe(id);
  const filme = atlas.filme;
  const bytes = readFileSync(join(dirDe(id), 'filme.webp'));

  it('o atlas.json tem o bloco `filme` e passa no validador do jogo', () => {
    expect(filme, 'bloco filme').toBeDefined();
    const m = validarManifesto(atlas, `${id}/atlas.json`);
    expect(m.filme?.imagem).toBe('filme.webp');
    expect(Object.keys(m.filme?.quadros ?? {})).toEqual(quadrosEsperados(id));
  });

  it('o tamanho declarado é o do cabeçalho do WebP e a página fica dentro de 2048 x 1280', () => {
    const dims = orc.dimensoesWebp(bytes);
    expect(dims, 'cabeçalho do WebP legível').not.toBeNull();
    expect([dims!.w, dims!.h]).toEqual(filme.tamanho);
    expect(dims!.w).toBeLessThanOrEqual(2048);
    expect(dims!.h).toBeLessThanOrEqual(1280);
  });

  it('o peso do webp fica entre 200 KiB e 0,8 MiB', () => {
    expect(bytes.length).toBeGreaterThanOrEqual(200 * KIB);
    expect(bytes.length).toBeLessThanOrEqual(0.8 * MIB);
  });

  it('todo quadro: painel true, sem campo p, ax = round(w/2) e dentro da página', () => {
    const [W, H] = filme.tamanho as [number, number];
    for (const [nome, q] of Object.entries(filme.quadros) as [string, any][]) {
      expect(q.painel, `${nome}.painel`).toBe(true);
      expect(q, `${nome} sem p`).not.toHaveProperty('p');
      expect(q.ax, `${nome}.ax`).toBe(Math.round(q.w / 2));
      expect(q.x).toBeGreaterThanOrEqual(0);
      expect(q.y).toBeGreaterThanOrEqual(0);
      expect(q.x + q.w, `${nome} passa da largura`).toBeLessThanOrEqual(W);
      expect(q.y + q.h, `${nome} passa da altura`).toBeLessThanOrEqual(H);
    }
  });

  it('o bloco do atlas.json é o de lutadores.json (a fonte que o pipeline usa para repor)', () => {
    expect(excecoes[id]?.filme).toEqual(filme);
  });

  it('o webp decodifica com o tamanho declarado (não é só o cabeçalho)', async () => {
    const meta = await sharp(bytes).metadata();
    expect([meta.width, meta.height]).toEqual(filme.tamanho);
  });
});

describe('AMINU: sem o quadro f2', () => {
  it('o bloco tem f0, f1, f3, f4 e f5, e nenhum f2', () => {
    expect(Object.keys(atlasDe('aminu').filme.quadros)).toEqual(['f0', 'f1', 'f3', 'f4', 'f5']);
  });
});

describe('validarBlocoFilme (pipeline)', () => {
  const ok = () => structuredClone(excecoes['caio'].filme);
  it('aceita os 10 blocos reais', () => {
    for (const id of IDS) expect(nucleo.validarBlocoFilme(excecoes[id].filme), id).toEqual([]);
  });
  it.each([
    ['sem objeto', undefined],
    ['imagem com pasta', { ...ok(), imagem: '../filme.webp' }],
    ['imagem que é página do atlas', { ...ok(), imagem: 'atlas-1.webp' }],
    ['tamanho fracionário', { ...ok(), tamanho: [10.5, 20] }],
    ['sem quadros', { ...ok(), quadros: {} }],
    ['quadro fora de f0..f5', { ...ok(), quadros: { idle0: ok().quadros.f0 } }],
    ['painel falso', { ...ok(), quadros: { f0: { ...ok().quadros.f0, painel: false } } }],
    ['com campo p', { ...ok(), quadros: { f0: { ...ok().quadros.f0, p: 0 } } }],
    ['quadro que sai da página', { ...ok(), quadros: { f0: { ...ok().quadros.f0, x: 1800 } } }],
  ])('rejeita: %s', (_n, filme) => {
    expect(nucleo.validarBlocoFilme(filme).length).toBeGreaterThan(0);
  });
});

/** Folha 4x3 mínima (fundo magenta da Runway, tronco + cabeça + braço por figura): só para o pipeline ter o que regerar. */
async function folhaMinima(arquivo: string): Promise<void> {
  const W = 800;
  const H = 600;
  const buf = Buffer.alloc(W * H * 3);
  for (let p = 0; p < W * H; p++) buf.set([254, 37, 248], p * 3);
  const pinta = (x0: number, y0: number, w: number, h: number, cor: number[]) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) buf.set(cor, (y * W + x) * 3);
  };
  for (let i = 0; i < 12; i++) {
    const cx = (i % 4) * 200 + 70;
    const base = Math.floor(i / 4) * 200 + 190;
    const alt = i === 0 ? 100 : 80 + (i % 5) * 4;
    pinta(cx, base - alt, 30, alt, [30, 30, 30]);
    pinta(cx + 5, base - alt - 14, 20, 14, [200, 150, 110]);
    pinta(cx + 30, base - alt + 20, 10 + i * 6, 8, [240, 240, 240]);
  }
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(arquivo);
}

describe('npm run sprites mantém a página FILME ao regerar o atlas', () => {
  // CAIO e WEI LONG são os que serão regerados (folha nova do CAIO pendente); os outros usam o mesmo caminho
  it.each(['caio', 'wei-long', 'aminu'])('%s: o atlas regerado traz o mesmo bloco `filme` e a imagem ao lado', async (id) => {
    const raiz = join(tmp, `raiz-${id}`);
    mkdirSync(join(raiz, 'public', 'assets', 'lutadores', id), { recursive: true });
    copyFileSync(join(dirDe(id), 'filme.webp'), join(raiz, 'public', 'assets', 'lutadores', id, 'filme.webp'));
    const folha = join(tmp, `${id}-f1-base-v1.png`);
    await folhaMinima(folha);
    const saida = join(tmp, `saida-${id}`);
    // `excecoes` reais do lutador (o que o CLI lê), só sem as folhas/células reais (que dependem da arte-fonte)
    const r = await executar.gerarLutador({ raiz, id, folhas: ['f1'], saida, arquivos: { f1: folha }, excecoes: { filme: excecoes[id].filme } });
    const gerado = JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8'));
    expect(gerado.filme).toEqual(atlasDe(id).filme);
    expect(Object.keys(gerado).at(-1)).toBe('filme');
    expect(existsSync(join(saida, 'filme.webp'))).toBe(true);
    expect(statSync(join(saida, 'filme.webp')).size).toBe(statSync(join(dirDe(id), 'filme.webp')).size);
    expect(validarManifesto(gerado, `${id}/atlas.json`).filme?.imagem).toBe('filme.webp');
    expect(r.relatorio.avisos.some((a: string) => /^filme:/.test(a))).toBe(false);
  }, 60000);

  it('sem a chave `filme` o atlas sai sem o bloco (lutador sem página FILME não ganha nada)', async () => {
    const folha = join(tmp, 'sem-filme-f1-base-v1.png');
    await folhaMinima(folha);
    const saida = join(tmp, 'saida-sem-filme');
    await executar.gerarLutador({ raiz: tmp, id: 'sem-filme', folhas: ['f1'], saida, arquivos: { f1: folha }, excecoes: {} });
    expect(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8'))).not.toHaveProperty('filme');
    expect(existsSync(join(saida, 'filme.webp'))).toBe(false);
  }, 60000);

  it('imagem ausente em public/: o bloco entra mesmo assim e o relatório avisa; tamanho divergente e bloco inválido são erro', async () => {
    const folha = join(tmp, 'aus-f1-base-v1.png');
    await folhaMinima(folha);
    const base = { raiz: tmp, id: 'aus', folhas: ['f1'], arquivos: { f1: folha } };
    const filme = excecoes['caio'].filme;
    const r = await executar.gerarLutador({ ...base, saida: join(tmp, 'saida-aus'), excecoes: { filme } });
    expect(JSON.parse(readFileSync(join(tmp, 'saida-aus', 'atlas.json'), 'utf8')).filme).toEqual(filme);
    expect(r.relatorio.avisos.some((a: string) => /^filme: filme\.webp nao existe/.test(a))).toBe(true);

    const raizErrada = join(tmp, 'raiz-errada');
    mkdirSync(join(raizErrada, 'public', 'assets', 'lutadores', 'aus'), { recursive: true });
    await sharp({ create: { width: 64, height: 64, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .webp()
      .toFile(join(raizErrada, 'public', 'assets', 'lutadores', 'aus', 'filme.webp'));
    await expect(executar.gerarLutador({ ...base, raiz: raizErrada, saida: join(tmp, 'saida-aus2'), excecoes: { filme } })).rejects.toThrow(/declara 1888x1280, mas filme\.webp tem 64x64/);
    await expect(executar.gerarLutador({ ...base, saida: join(tmp, 'saida-aus3'), excecoes: { filme: { ...filme, quadros: { f0: { ...filme.quadros.f0, painel: false } } } } })).rejects.toThrow(/invalido/);
  }, 60000);
});
