/*
 * Regera `dist/sw-manifesto.js` de um dist já construído (o build já faz isso; serve para refazer à mão, para o SW aposentado e para provas).
 *   node ferramentas/sw/cli.mjs [--dist=dist] [--base=/] [--commit=abc1234] [--data=ISO] [--desligado]
 * Sem --commit/--data lê o `version.json` do dist.
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { escreverManifesto } from './manifesto.mjs';

const args = Object.fromEntries(
  process.argv
    .slice(2)
    .filter((a) => a.startsWith('--'))
    .map((a) => {
      const [k, ...v] = a.slice(2).split('=');
      return [k, v.length ? v.join('=') : 'true'];
    }),
);
const dist = resolve(args['dist'] ?? 'dist');
let build = { commit: 'dev', data: '' };
const vj = join(dist, 'version.json');
if (existsSync(vj)) {
  const j = JSON.parse(readFileSync(vj, 'utf8'));
  build = { commit: String(j.commit ?? 'dev'), data: String(j.data ?? '') };
}
if (args['commit']) build.commit = args['commit'];
if (args['data']) build.data = args['data'];

try {
  const r = escreverManifesto({ dist, base: args['base'] ?? '/', build, desligado: args['desligado'] === 'true' });
  console.log(`sw-manifesto.js: versao ${r.manifesto.versao}, ${r.arquivos} arquivos, shell ${r.manifesto.shell.length} (${(r.bytesShell / 1048576).toFixed(2)} MiB), manifesto ${(r.bytesManifesto / 1024).toFixed(1)} KiB`);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(2);
}
