import { execSync } from 'node:child_process';
import { resolve } from 'node:path';
import { build as viteBuild, type Plugin, type ResolvedConfig } from 'vite';
import { defineConfig } from 'vitest/config';
import { arquivosDaEtapa0 } from './src/assets/etapa0.mjs';
import { escreverManifesto, listarArquivos } from './ferramentas/sw/manifesto.mjs';

/**
 * Política de segurança de conteúdo (achado do Órion, E8 prévia). Vai por `<meta http-equiv>` porque o Pages não
 * deixa definir cabeçalhos; ao migrar para um servidor próprio (EasyPanel), passar a servir como cabeçalho.
 * Validada contra o BUILD por `npm run test:e2e:build` (tests/e2e-build/csp.spec.ts).
 *
 * Exceções à política mínima (cada uma com o motivo; qualquer nova entra aqui E no teste):
 *  - style-src 'unsafe-inline': o `<style>` do index.html (tamanho do canvas antes do JS subir) e o `style="..."`
 *    do `<pre id="err">`. Só estilo: scripts continuam travados em 'self'.
 *  - font-src 'self' (explícita, não é exceção): as fontes do canvas (Barlow, OFL) são woff2 auto-hospedados em /assets/fontes; Google Fonts/CDN
 *    ficam barrados por desenho (privacidade e CSP). Sem a diretiva valeria o default-src, o mesmo 'self': ela existe para o teste de build a fixar.
 *  - img-src data: blob: / media-src blob: / connect-src 'self': não são exceções de uso hoje (o jogo só carrega
 *    imagens e JSON do próprio site, e sintetiza o áudio por AudioContext), vêm da sugestão do Órion e deixam
 *    folga para createImageBitmap/blob sem afrouxar nada de script.
 * O que o `<meta>` NÃO cobre: frame-ancestors, report-uri e sandbox (só valem por cabeçalho).
 */
export const POLITICA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self'",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "media-src 'self' blob:",
  // service worker (T7): o sw.js é do mesmo site; sem a diretiva valeria o fallback (script-src/default-src, também 'self'). Explícita para o teste de build a fixar.
  "worker-src 'self'",
].join('; ');

/** Injeta o `<meta>` da CSP SÓ no build: o servidor de desenvolvimento injeta scripts inline (HMR, preamble). */
function cspSoNoBuild(): Plugin {
  return {
    name: 'inno-csp-so-no-build',
    apply: 'build',
    transformIndexHtml() {
      // head-prepend: a meta precisa vir antes de qualquer <script>/<link> que ela deve governar.
      return [{ tag: 'meta', attrs: { 'http-equiv': 'Content-Security-Policy', content: POLITICA_CSP }, injectTo: 'head-prepend' }];
    },
  };
}

/**
 * Identidade do build: commit curto + instante da compilação. Vai para o código por `define` (`__INNO_BUILD__`, lido em src/versao.ts) e para
 * `version.json` ao lado do index.html. Existe para o dono PROVAR qual versão está vendo (o Pages serve o index.html com `max-age=600` e não
 * deixa mudar cabeçalhos) e para o jogo avisar quando há uma versão mais nova no ar.
 */
function identidadeDoBuild(): { commit: string; data: string; sujo: boolean } {
  let commit = (process.env['GITHUB_SHA'] ?? '').slice(0, 7);
  let sujo = false;
  try {
    commit = execSync('git rev-parse --short HEAD', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim() || commit;
    sujo = execSync('git status --porcelain', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim().length > 0;
  } catch {
    /* sem git (tarball): fica o que veio do ambiente */
  }
  return { commit: commit || 'dev', data: new Date().toISOString(), sujo };
}

const BUILD = identidadeDoBuild();

/** Publica `version.json` (a mesma identidade) no build; o jogo o consulta com `cache: 'no-store'` para saber se há versão nova. */
function versaoJson(): Plugin {
  return {
    name: 'inno-version-json',
    apply: 'build',
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: 'version.json', source: JSON.stringify(BUILD) });
    },
  };
}

/**
 * Service worker (T7, docs/service-worker.md). Depois que o build termina (com o `public/` já copiado em dist/):
 *  1. compila src/sw/sw.ts para dist/sw.js (IIFE, sem hash no nome: o navegador o procura sempre no mesmo endereço);
 *  2. escreve dist/sw-manifesto.js, o manifesto de revisões (hash de conteúdo de cada arquivo), que o sw.js carrega com importScripts.
 * `INNO_SW=off` no build gera o SW APOSENTADO (apaga os caches e se desregistra ao ativar): é o rollback de emergência por deploy.
 */
function serviceWorker(): Plugin {
  let cfg: ResolvedConfig;
  return {
    name: 'inno-service-worker',
    apply: 'build',
    configResolved(c) {
      cfg = c;
    },
    async closeBundle() {
      if (cfg.build.ssr) return;
      const dist = resolve(cfg.root, cfg.build.outDir);
      await viteBuild({
        configFile: false,
        root: cfg.root,
        logLevel: 'warn',
        publicDir: false,
        define: {},
        build: {
          outDir: dist,
          emptyOutDir: false,
          copyPublicDir: false,
          sourcemap: false,
          minify: true,
          target: 'es2022',
          lib: { entry: resolve(cfg.root, 'src/sw/sw.ts'), formats: ['iife'], name: 'InnoSw', fileName: () => 'sw.js' },
        },
      });
      // contrato T4/T7: o shell do install = o que o index.html puxa + a ETAPA 0 do boot (src/assets/etapa0.ts, o mesmo módulo que o boot usa). Aposentado: sem lista (não baixa nada).
      const desligado = process.env['INNO_SW'] === 'off';
      const extras = desligado ? [] : arquivosDaEtapa0(listarArquivos(dist));
      const r = escreverManifesto({ dist, base: cfg.base, build: { commit: BUILD.commit, data: BUILD.data }, extras, desligado });
      cfg.logger.info(
        `sw: dist/sw.js + sw-manifesto.js (versao ${r.manifesto.versao}${r.manifesto.desligado ? ', APOSENTADO' : ''}): ${r.arquivos} arquivos com revisao, shell de ${r.manifesto.shell.length} (${(r.bytesShell / 1048576).toFixed(2)} MiB), manifesto de ${(r.bytesManifesto / 1024).toFixed(1)} KiB`,
      );
    },
  };
}

export default defineConfig({
  plugins: [cspSoNoBuild(), versaoJson(), serviceWorker()],
  define: { __INNO_BUILD__: JSON.stringify(BUILD) },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
    // O padrao (5 s) estourava em sons-volume e sprites-pipeline (1,2 a 1,6 s sozinhos) quando a maquina estava ocupada, e o `npm test` e portao de deploy: folga de 6x.
    // Nao esconde travamento (30 s ainda e um teste preso); medicao de relogio nao fica aqui, fica em `npm run test:perf`.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
