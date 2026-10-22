/*
 * Decisões que dependem do aparelho (puras, para os testes): versão estática ou completa, quantos updates de pré-rolagem cabem num quadro, e quem toca a música.
 */

/** O que a Network Information API expõe (Chromium; o Safari/WebKit não tem, e então vale a versão completa). */
export interface ConexaoLike {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/** Economia de dados ligada, ou rede 2g/3g: o trailer vira a versão estática, que só usa a arte residente (D-T7, R7). */
export function economiaDeDados(conexao: ConexaoLike | undefined | null): boolean {
  if (!conexao) return false;
  if (conexao.saveData === true) return true;
  const t = conexao.effectiveType;
  return t === 'slow-2g' || t === '2g' || t === '3g';
}

/** A conexão do navegador, se houver. */
export function conexaoDoNavegador(): ConexaoLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: ConexaoLike }).connection ?? null;
}

/** Orçamento de CPU da pré-rolagem por quadro (ms) e o mínimo de ticks de motor por quadro (spec §4.4). */
export const ORCAMENTO_PREROLAGEM_MS = 2;
export const MINIMO_DE_TICKS_POR_QUADRO = 8;

/**
 * Pré-rola o que o diretor pedir dentro do orçamento: no mínimo `MINIMO_DE_TICKS_POR_QUADRO` ticks do motor, e mais enquanto o relógio (`agora`) disser que sobrou
 * tempo. `prerolar(n)` devolve quantos ticks andou (menos que `n` = não há mais nada a rolar). Só a QUANTIDADE por quadro depende do relógio, nunca o resultado.
 */
export function prerolarNoOrcamento(prerolar: (maxTicks: number) => number, agora: () => number, orcamentoMs = ORCAMENTO_PREROLAGEM_MS): number {
  const inicio = agora();
  let total = 0;
  for (;;) {
    const feitos = prerolar(MINIMO_DE_TICKS_POR_QUADRO);
    total += feitos;
    if (feitos < MINIMO_DE_TICKS_POR_QUADRO) return total;
    if (agora() - inicio >= orcamentoMs) return total;
  }
}
