/*
 * Regera `dist/sw-manifesto.js` de um dist já construído (o build já faz isso; serve para refazer à mão, para o SW aposentado e para provas).
 *   node ferramentas/sw/cli.mjs [--dist=dist] [--base=/] [--commit=abc1234] [--data=ISO] [--desligado]
 * Sem --commit/--data lê o `version.json` do dist.
 * A lista da ETAPA 0 do boot (src/assets/etapa0.ts) é do build (vite.config.ts); aqui, node puro, ela é herdada do manifesto que já está no dist: o que estava no shell e ainda
 * existe continua nele (`--sem-extras` descarta e volta ao shell só do index.html).
 */
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { escreverManifesto } from './manifesto.mjs';

/** O `shell` do manifesto que já está no dist (a etapa 0 entrou nele pelo build); [] se não há manifesto legível. */
function shellAnterior(dist) {
  try {
    const texto = readFileSync(join(dist, 'sw-manifesto.js'), 'utf8');
    const m = JSON.parse(texto.replace(/^self\.__INNO_MANIFESTO__=/, '').replace(/;\s*$/, ''));
    return Array.isArray(m.shell) ? m.shell.filter((c) => typeof c === 'string' && existsSync(join(dist, c))) : [];
  } catch {
    return [];
  }
}

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
  const desligado = args['desligado'] === 'true';
  const extras = desligado || args['sem-extras'] === 'true' ? [] : shellAnterior(dist);
  const r = escreverManifesto({ dist, base: args['base'] ?? '/', build, extras, desligado });
  console.log(`sw-manifesto.js: versao ${r.manifesto.versao}, ${r.arquivos} arquivos, shell ${r.manifesto.shell.length} (${(r.bytesShell / 1048576).toFixed(2)} MiB), manifesto ${(r.bytesManifesto / 1024).toFixed(1)} KiB`);
} catch (e) {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(2);
}
