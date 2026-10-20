/** Janela mais alta que larga: o jogo é paisagem (o aviso #rot aparece por CSS nesse caso). */
export function emRetrato(largura: number, altura: number): boolean {
  return altura > largura;
}

/**
 * Tenta travar a tela em paisagem (só funciona em tela cheia e em navegadores que oferecem
 * a API). Melhor esforço: nunca lança. Ainda não é chamada pelo jogo (comportamento do
 * protótipo = só o aviso); fica pronta para a Fase 4 (celular).
 */
export async function travarPaisagem(alvo: Window = window): Promise<boolean> {
  try {
    const orientacao = alvo.screen.orientation as ScreenOrientation & { lock?: (o: string) => Promise<void> };
    if (!orientacao || typeof orientacao.lock !== 'function') return false;
    await orientacao.lock('landscape');
    return true;
  } catch {
    return false;
  }
}
