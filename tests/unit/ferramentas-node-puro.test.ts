import { spawnSync } from 'node:child_process';
import { readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';

/*
 * Os scripts de `ferramentas/` rodam em Node PURO (sem Vite). Os outros testes os importam pelo Vitest, que transforma o
 * módulo e tolera o que o Node recusa: foi assim que um `import { separarFundidas, separarFundidas }` duplicado deixou
 * `npm run sprites` quebrado com a suíte toda verde. Aqui cada .mjs é checado e carregado por um processo `node` de verdade.
 */
const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

function mjsDe(pasta: string): string[] {
  return readdirSync(join(RAIZ, pasta)).filter((f) => f.endsWith('.mjs')).map((f) => join(pasta, f));
}
const node = (args: string[]) => spawnSync(process.execPath, args, { cwd: RAIZ, encoding: 'utf8', timeout: 60_000 });

describe('ferramentas em Node puro', () => {
  const todos = ['ferramentas/sprites', 'ferramentas/marcador', 'ferramentas/prompts', 'ferramentas/balanco', 'ferramentas'].flatMap((p) => {
    try {
      return mjsDe(p);
    } catch {
      return [];
    }
  });

  it('encontra os scripts (a varredura não pode ficar vazia)', () => {
    expect(todos.length).toBeGreaterThanOrEqual(8);
    expect(todos).toContain(join('ferramentas/sprites', 'executar.mjs'));
  });

  it.each(todos)('%s passa em `node --check` (sem erro de sintaxe nem declaração duplicada)', (arquivo) => {
    const r = node(['--check', arquivo]);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('o módulo de orquestração dos sprites carrega por import() em Node puro', () => {
    const url = pathToFileURL(join(RAIZ, 'ferramentas/sprites/executar.mjs')).href;
    const r = node(['--input-type=module', '-e', `const m = await import(${JSON.stringify(url)}); if (typeof m.gerarLutador !== 'function') process.exit(3);`]);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
  });

  it('`npm run sprites -- --ajuda` (cli.mjs) imprime o uso e sai com 0, sem gravar nada', () => {
    const r = node(['ferramentas/sprites/cli.mjs', '--ajuda']);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('uso: npm run sprites');
  });

  it('`npm run balanco -- --ajuda` imprime as opções e sai com 0, sem rodar nenhuma luta', () => {
    const r = node(['ferramentas/balanco/cli.mjs', '--ajuda']);
    expect(r.stderr).toBe('');
    expect(r.status).toBe(0);
    expect(r.stdout).toContain('--rapido');
    expect(r.stdout).toContain('--completo');
  });

  it('o balanco recusa opção desconhecida com erro claro e código 1', () => {
    const r = node(['ferramentas/balanco/cli.mjs', '--voar']);
    expect(r.status).toBe(1);
    expect(r.stderr).toContain('opção desconhecida');
  });
});
