import { ROTEIRO, DESTAQUE } from './roteiro';
import { TOMADAS } from './tomadas';
import { exigirRoteiroValido } from './validar';

export * from './tipos';
export { ROTEIRO, DESTAQUE, TOMADAS };
export { PLACAS, TEXTOS, NOME_OCULTO } from './textos';
export * from './curvas';
export { cortesDeFoco, exigirRoteiroValido, maiorFlashEm60, validarRoteiro } from './validar';

// Falha alto e cedo quando o pedaço do trailer carrega (como as falas da provocação e os temas): roteiro inválido = o trailer não abre (a cena cai na abertura de hoje).
exigirRoteiroValido(ROTEIRO, TOMADAS, { destaque: DESTAQUE });
