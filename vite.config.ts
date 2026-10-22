import { execSync } from 'node:child_process';
import type { Plugin } from 'vite';
import { defineConfig } from 'vitest/config';

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

export default defineConfig({
  plugins: [cspSoNoBuild(), versaoJson()],
  define: { __INNO_BUILD__: JSON.stringify(BUILD) },
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
