/**
 * Mostra erros de JavaScript numa caixa vermelha sobre o jogo (porte do <pre id="err">
 * do protótipo). Ajuda a diagnosticar no celular, onde não há console.
 */
export function mostrarErrosNaTela(alvo: Window = window): () => void {
  const aoErro = (e: ErrorEvent): void => {
    const caixa = alvo.document.getElementById('err');
    if (!caixa) return;
    caixa.style.display = 'block';
    caixa.textContent = `${caixa.textContent ?? ''}Erro: ${e.message} (linha ${e.lineno}) | `;
  };
  alvo.addEventListener('error', aoErro);
  return () => alvo.removeEventListener('error', aoErro);
}
