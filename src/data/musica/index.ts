import { TEMAS } from './temas';
import { exigirTemasValidos } from './validar';

export * from './tipos';
export { TEMAS };
export { duracaoDoLacoS, exigirTemasValidos, LIMITES_MUSICA, validarTema, validarTemas, VALSA_ZENON } from './validar';
export { lerAcorde, lerMelodia, lerPerc, PESO_PERC, semitonsDoGrau } from './notacao';

// Falha alto e cedo no carregamento (como as falas da provocação e os sons): tema inválido ou lutador sem tema derruba o boot.
exigirTemasValidos(TEMAS);
