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
 *  - img-src data: blob: / media-src blob: / connect-src 'self': não são exceções de uso hoje (o jogo só carrega
 *    imagens e JSON do próprio site, e sintetiza o áudio por AudioContext), vêm da sugestão do Órion e deixam
 *    folga para createImageBitmap/blob sem afrouxar nada de script.
 * O que o `<meta>` NÃO cobre: frame-ancestors, report-uri e sandbox (só valem por cabeçalho).
 */
export const POLITICA_CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
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

export default defineConfig({
  plugins: [cspSoNoBuild()],
  server: { port: 5173, strictPort: true },
  preview: { port: 4173, strictPort: true },
  build: { target: 'es2022', sourcemap: true },
  test: {
    include: ['tests/unit/**/*.test.ts'],
    environment: 'node',
  },
});
