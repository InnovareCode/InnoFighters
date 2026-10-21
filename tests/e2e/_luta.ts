/*
 * GANCHOS DE E2E PARA A LUTA, num lugar só (o irmão de `PULAR_ENTRADA` em `_chefe.ts`).
 *
 * `SEM_PROVOCACAO`: a PROVOCAÇÃO (balão do round 1, do round 2+ e da vitória; docs/spec-provocacao-prerround-e-vitoria.md) é apresentação pura: o motor
 * fica parado enquanto ela roda, o HUD some e a luta de ARCADE / LUTA vs CPU / VERSUS leva mais ~5 s para começar. Todo e2e que abre uma luta comum e CONTA TICKS,
 * mede o HUD ou espera a fase `fight` chama este gancho logo depois do `ui.set('fight', ...)`, ANTES do 1º `avancar` (a cena guarda `semProvocacao` até o próximo
 * `enter()`, então vale também para o round 2+ e para a vitória). É o caminho escolhido na auditoria da P2: o teste NÃO ganha timeout maior nem espera mais ticks.
 * Quem testa a provocação (`provocacao.spec.ts`) não o chama.
 *
 * Uso: `await hook(page, SEM_PROVOCACAO)`, ou dentro de outro hook: `(${SEM_PROVOCACAO})(h);`.
 */
export const SEM_PROVOCACAO = '(h) => { const s = h.ui.scene; if (s && s.provocacao) { s.semProvocacao = true; s.provocacao.zerar(); s.aberturaPendente = false; } }';
