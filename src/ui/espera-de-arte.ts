import type { IdLutador } from '../core/contratos';
import type { Mundo } from './contexto';

/** O que uma luta precisa na memória: os dois atlas e o cenário (a casa do rival, salvo `stage` explícito). */
export type PedidoDaLuta = { c1: IdLutador; c2: IdLutador; stage?: string | undefined };

/**
 * Espera a arte de uma luta (VS e luta): marca os dois lutadores como "em uso" (a poda não os solta), pede o que
 * falta ao gerenciador e expõe `pronta`/`progresso`/`falhou`. Se tudo já está na memória (a vitrine, hoje) `pronta`
 * já nasce verdadeira, sem nenhuma espera: o jogador não vê diferença.
 */
export class EsperaDeArte {
  pronta = true;
  progresso = 1;
  falhou: string | null = null;
  private geracao = 0;

  iniciar(m: Mundo, p: PedidoDaLuta): void {
    const pedido = { lutadores: [p.c1, p.c2], cenarios: [p.stage ?? m.elenco[p.c2].ch.stage] };
    const minha = ++this.geracao;
    this.falhou = null;
    // 'fixa': só marca em uso (como sempre); 'por-peso': luta exclusiva, solta a vitrine e os outros cenários já. Provisório: a L3 move isto para o Navegador.
    // O `?.` é dos dublês de teste do gerenciador (os mesmos de `carregarFilme?.` em fight.ts).
    m.arte.entrarNaLuta?.(pedido);
    this.pronta = m.arte.estaPronto(pedido);
    this.progresso = this.pronta ? 1 : 0;
    if (this.pronta) return;
    m.arte
      .garantir(pedido, (f) => {
        if (minha === this.geracao) this.progresso = f;
      })
      .then(() => {
        if (minha === this.geracao) this.pronta = true;
      })
      .catch((e: unknown) => {
        console.error(e);
        if (minha === this.geracao) this.falhou = e instanceof Error ? e.message : String(e);
      });
  }

  /** Percentual inteiro para mostrar na tela. */
  get percentual(): number {
    return Math.round(this.progresso * 100);
  }
}
