import type { TomadasDoTrailer } from './tipos';

/*
 * GERADO por `npm run trailer:escalar` (ferramentas/trailer). Não edite à mão: o roteiro (roteiro.ts) é o que se escreve; aqui ficam as TOMADAS, uma por plano de
 * luta, que a escalação achou para cumprir os golpes que o roteiro pede. Se o balanceamento, a CPU ou o atlas mudarem, o teste `trailer-tomadas` falha dizendo
 * qual plano reescalar. A impressão é o hash do estado do `Game` ao fim do plano.
 */
export const TOMADAS: TomadasDoTrailer = {
  P1: { semente: 95, cpu: [2, 2], inicio: 159, batidas: [{ pedida: 0, tickMotor: 244, tickInicio: 230 }], impressao: 'da616364' },
  P2: { semente: 51, cpu: [1, 2], inicio: 150, batidas: [{ pedida: 0, tickMotor: 211, tickInicio: 206 }, { pedida: 1, tickMotor: 276, tickInicio: 270 }], impressao: '56b35f4b' },
  P3: { semente: 36, cpu: [1, 2], inicio: 1213, batidas: [{ pedida: 0, tickMotor: 1267, tickInicio: 1188 }], impressao: 'ee09772b' },
  P4: { semente: 52, cpu: [2, 1], inicio: 166, batidas: [{ pedida: 0, tickMotor: 277, tickInicio: 209 }], impressao: '27749af3' },
  P5: { semente: 67, cpu: [2, 1], inicio: 292, batidas: [{ pedida: 0, tickMotor: 389, tickInicio: 383 }], impressao: '6a5d040d' },
  P6: { semente: 185, cpu: [2, 1], inicio: 117, batidas: [{ pedida: 0, tickMotor: 214, tickInicio: 207 }], impressao: '59359701' },
  P7: { semente: 182, cpu: [2, 1], inicio: 395, batidas: [{ pedida: 0, tickMotor: 496, tickInicio: 484 }], impressao: '93d29470' },
  P9: { semente: 257, cpu: [1, 2], inicio: 652, batidas: [{ pedida: 0, tickMotor: 658, tickInicio: 642 }], impressao: 'ff26259e' },
};
