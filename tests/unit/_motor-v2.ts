import type { MotorV2 } from '../../src/core/contratos';

/**
 * As três flags do motor v2 DESLIGADAS explicitamente (V2-6). O jogo as liga por padrão (`REGRAS_PADRAO.motorV2`); os testes que provam fidelidade ao
 * protótipo e o oráculo CPU x CPU antigo fixam este objeto para não depender do padrão: continuam verdes sem `-u` se o padrão mudar.
 */
export const MOTOR_V2_DESLIGADO: Readonly<Required<Omit<MotorV2, 'danoFilme'>>> = Object.freeze({ entradaNoHitstop: false, filmes: false, combos: false });
