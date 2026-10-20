/**
 * Alterna tela cheia (tecla F). Porte de toggleFullscreen(): falhas são ignoradas,
 * pois nem todo navegador (ex.: iPhone) oferece a API.
 */
export function alternarTelaCheia(doc: Document = document): void {
  try {
    if (doc.fullscreenElement) {
      void doc.exitFullscreen().catch(() => undefined);
    } else if (doc.documentElement.requestFullscreen) {
      void doc.documentElement.requestFullscreen().catch(() => undefined);
    }
  } catch {
    /* ignorado */
  }
}

export function emTelaCheia(doc: Document = document): boolean {
  return doc.fullscreenElement !== null;
}
