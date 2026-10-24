import { expect, type Page } from '@playwright/test';

/*
 * `data-pronto` é só a ETAPA 0 do boot (T4, docs/orcamentos-2026-10-23.md §2.2): os manifestos, o cenário padrão, a marca e as fontes. A vitrine (os 4 atlas de fábrica e os
 * cenários do título) e os retratos chegam depois, em segundo plano, e `data-vitrine="true"` marca que já estão na memória.
 *
 * Todo e2e que assume a vitrine ou os retratos na memória logo depois do boot (medir o que está residente, abrir uma luta em `?manual=1` onde os ticks correm mais
 * rápido que a rede, ler `arte.atlas.get(...).paginas`) espera por este sinal. Quem testa a carga em si espera só o `data-pronto` e mede o que veio.
 */

/** Espera a etapa 1 do boot terminar (vitrine, cenários do título e retratos já na memória). */
export async function esperarVitrine(page: Page, timeout = 60_000): Promise<void> {
  await expect(page.locator('html')).toHaveAttribute('data-vitrine', 'true', { timeout });
}
