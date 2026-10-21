import { ASSINATURAS } from './assinaturas';
import { PERFIS_POR_FICHA, PERFIS_VOCAIS } from './perfis-vocais';
import type { DadosSons } from './tipos';
import { exigirSonsValidos } from './validar';

export * from './tipos';
export { ASSINATURAS, PERFIS_POR_FICHA, PERFIS_VOCAIS };
export { chavesDosEspeciais, exigirSonsValidos, validarSons, LIMITES } from './validar';

/** Os dados de sons reais. */
export const DADOS_SONS: DadosSons = { perfis: PERFIS_VOCAIS, perfisPorFicha: PERFIS_POR_FICHA, assinaturas: ASSINATURAS };

// Falha alto e cedo no carregamento (como as falas da provocação): lutador sem voz ou especial sem assinatura derruba o boot.
exigirSonsValidos(DADOS_SONS, { exigirGritos: true, exigirAssinaturasCompletas: true });
