import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * As ferramentas do trailer rodam em Node PURO (sem Vite no processo do teste): `npm run trailer:escalar` e `npm run trailer:medir`. Como nos outros scripts de
 * `ferramentas/`, o que o Vitest tolera e o Node recusa (declaração duplicada, sintaxe) só aparece rodando um `node` de verdade.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const node = (args: string[]) => spawnSync(process.execPath, args, { cwd: RAIZ, encoding: 'utf8', timeout: 60_000 });

describe('ferramentas do trailer em Node puro', () => {
  it.each(['ferramentas/trailer/cli.mjs', 'ferramentas/trailer/medir.mjs'])('%s passa em `node --check`', (arquivo) => {
    const r = node(['--check', arquivo]);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('`npm run trailer:escalar -- --ajuda` imprime as opções e sai com 0, sem simular nenhuma luta', () => {
    const r = node(['ferramentas/trailer/cli.mjs', '--ajuda']);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('--plano');
    expect(r.stdout).toContain('--sementes');
    expect(r.stdout).toContain('--verificar');
  });

  it('a escalação recusa opção desconhecida e plano sem motor com erro claro e código 1', () => {
    const a = node(['ferramentas/trailer/cli.mjs', '--voar']);
    expect(a.status).toBe(1);
    expect(a.stderr).toContain('opção desconhecida');
    const b = node(['ferramentas/trailer/cli.mjs', '--plano', 'C1', '--simular']);
    expect(b.status).toBe(1);
    expect(b.stderr).toContain('sem motor ou inexistente');
  }, 60_000); // o segundo caso sobe o Vite (carregamento SSR) antes de recusar

  it('`npm run trailer:medir -- --ajuda` imprime o uso e sai com 0, sem abrir navegador', () => {
    const r = node(['ferramentas/trailer/medir.mjs', '--ajuda']);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('uso: npm run trailer:medir');
  });

  it('a medição recusa opção inválida', () => {
    const r = node(['ferramentas/trailer/medir.mjs', '--taxas', 'abc']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('--taxas');
  });

  it('os scripts do package.json existem', () => {
    const pkg = JSON.parse(readFileSync(`${RAIZ}package.json`, 'utf8')) as { scripts: Record<string, string> };
    expect(pkg.scripts['trailer:escalar']).toBe('node ferramentas/trailer/cli.mjs');
    expect(pkg.scripts['trailer:medir']).toBe('node ferramentas/trailer/medir.mjs');
  });

  it('a base de desempenho gravada é coerente: o limite do trailer é 1,15 x o p95 da pior luta de referência a 4x', () => {
    const base = JSON.parse(readFileSync(`${RAIZ}ferramentas/trailer/base-desempenho.json`, 'utf8')) as {
      razaoMaximaDoTrailer: number;
      taxaDeReferencia: number;
      lutas: Record<string, Record<string, Record<string, { p95: number }>>>;
      limiteDoTrailerP95Ms: Record<string, number>;
    };
    expect(base.razaoMaximaDoTrailer).toBe(1.15);
    expect(base.taxaDeReferencia).toBe(4);
    for (const modo of ['custo', 'intervalo']) {
      const p95s = Object.values(base.lutas).map((l) => l['4']?.[modo]?.p95 ?? 0);
      expect(Math.min(...p95s)).toBeGreaterThan(0);
      expect(base.limiteDoTrailerP95Ms[modo]).toBeCloseTo(1.15 * Math.max(...p95s), 2);
    }
  });
});
