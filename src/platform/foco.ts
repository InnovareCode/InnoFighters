export interface CallbacksFoco {
  /** A janela perdeu o foco (blur). */
  aoPerderFoco?: () => void;
  /** A aba foi para segundo plano (visibilitychange com document.hidden). */
  aoOcultar?: () => void;
  /** A aba voltou a ficar visível (visibilitychange com `document.hidden` falso). */
  aoVoltar?: () => void;
}

/**
 * Pausa por foco/visibilidade (porte dos listeners blur e visibilitychange do protótipo):
 * a cena de luta usa isso para pausar sozinha. Devolve a função que desfaz a ligação.
 */
export function observarFoco(alvo: Window, cb: CallbacksFoco): () => void {
  const blur = (): void => cb.aoPerderFoco?.();
  const visibilidade = (): void => {
    if (alvo.document.hidden) cb.aoOcultar?.();
    else cb.aoVoltar?.();
  };
  alvo.addEventListener('blur', blur);
  alvo.document.addEventListener('visibilitychange', visibilidade);
  return () => {
    alvo.removeEventListener('blur', blur);
    alvo.document.removeEventListener('visibilitychange', visibilidade);
  };
}
