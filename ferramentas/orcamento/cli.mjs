/*
 * Portão de orçamento: `npm run orcamento -- [--dist=dist] [--modo=aviso|bloqueante] [--config=ferramentas/orcamento/orcamento.json]`.
 * Roda DEPOIS de `npm run build`. Saída: 0 = ok ou só avisos; 1 = algum item bloqueante estourou; 2 = dist ausente/ilegível.
 * `--modo` também vem de ORCAMENTO_MODO. No GitHub Actions imprime anotações (::warning / ::error) e grava a tabela no resumo do job.
 */
import { appendFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { avaliar, lerConfig, medir, resumo, tabela } from './orcamento.mjs';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.length ? v.join('=') : 'true'];
    }),
);

const modo = args['modo'] ?? process.env['ORCAMENTO_MODO'] ?? 'aviso';
if (modo !== 'aviso' && modo !== 'bloqueante') {
  console.error(`orcamento: --modo deve ser "aviso" ou "bloqueante" (veio "${modo}")`);
  process.exit(2);
}
const dist = resolve(args['dist'] ?? 'dist');
const cfgPath = resolve(args['config'] ?? fileURLToPath(new URL('./orcamento.json', import.meta.url)));

let linhas;
let cfg;
try {
  cfg = lerConfig(cfgPath);
  linhas = avaliar(medir(dist, cfg), cfg, modo);
} catch (e) {
  console.error(`orcamento: ${e instanceof Error ? e.message : String(e)}`);
  process.exit(2);
}

const r = resumo(linhas);
const md = tabela(linhas);
console.log(`Portao de orcamento (modo ${modo}) em ${dist}\n`);
console.log(md);
console.log(`\n${r.ok} ok, ${r.avisos} aviso(s), ${r.falhas} falha(s) bloqueante(s) de ${r.total} itens.`);
if (r.avisos > 0 && r.falhas === 0) {
  console.log('Itens em AVISO nao derrubam o build; para promover, ver ferramentas/orcamento/README.md.');
}

if (process.env['GITHUB_ACTIONS'] === 'true') {
  for (const l of linhas) {
    if (l.status === 'OK') continue;
    const nivel = l.status === 'FALHA' ? 'error' : 'warning';
    console.log(`::${nivel} title=Orcamento ${l.chave}::${l.item}: medido ${l.medido}, meta ${l.meta}`);
  }
  const resumoJob = process.env['GITHUB_STEP_SUMMARY'];
  if (resumoJob) {
    appendFileSync(resumoJob, `### Portao de orcamento (modo ${modo})\n\n${md}\n\n${r.ok} ok, ${r.avisos} aviso(s), ${r.falhas} falha(s) bloqueante(s).\n`);
  }
}
process.exit(r.falhas > 0 ? 1 : 0);
