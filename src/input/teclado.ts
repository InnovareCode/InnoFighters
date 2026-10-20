import { TECLAS_SEM_PADRAO } from './mapa';
import { normalizarTecla, type TeclasVirtuais } from './teclas';

/**
 * Liga o teclado físico às teclas virtuais (porte dos listeners keydown/keyup/blur do protótipo).
 * `aoTecla` recebe cada descida de tecla (sem repetição) para menus e atalhos.
 * Devolve a função que desfaz a ligação.
 */
export function ligarTeclado(alvo: Window, teclas: TeclasVirtuais, aoTecla: (tecla: string) => void): () => void {
  const descer = (e: KeyboardEvent): void => {
    const k = normalizarTecla(e.key);
    if (TECLAS_SEM_PADRAO.includes(k)) e.preventDefault();
    if (e.repeat) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    teclas.definir(k, true);
    aoTecla(k);
  };
  const subir = (e: KeyboardEvent): void => {
    teclas.definir(normalizarTecla(e.key), false);
  };
  // janela sem foco: o navegador não avisa o keyup, então soltamos tudo
  const perderFoco = (): void => teclas.soltarTodas();

  alvo.addEventListener('keydown', descer);
  alvo.addEventListener('keyup', subir);
  alvo.addEventListener('blur', perderFoco);
  return () => {
    alvo.removeEventListener('keydown', descer);
    alvo.removeEventListener('keyup', subir);
    alvo.removeEventListener('blur', perderFoco);
  };
}
