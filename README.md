# InnoFighters

Jogo de luta 2D (Canvas 2D, TypeScript estrito, Vite). Plano completo em
`PLANO.md`; estado em `PROGRESSO.md`. `prototipo/` e a referencia congelada.

## Comandos

| Comando | O que faz |
|---|---|
| `npm ci` | instala dependencias exatas do lockfile |
| `npm run dev` | servidor de desenvolvimento em http://127.0.0.1:5173 |
| `npm run build` | typecheck + build de producao em `dist/` |
| `npm run typecheck` | `tsc --noEmit` (modo estrito) |
| `npm test` | testes de unidade (Vitest) |
| `npm run test:e2e` | testes e2e (Playwright, sobe o dev server sozinho) |

Primeira vez no e2e: `npx playwright install chromium` (so o Chromium e usado).
Requer Node >= 20.
