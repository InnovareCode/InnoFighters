import type { TomadasDoTrailer } from './tipos';

/*
 * GERADO por `npm run trailer:escalar` (ferramentas/trailer). Não edite à mão: o roteiro (roteiro.ts) é o que se escreve; aqui ficam as TOMADAS, uma por plano de
 * luta, que a escalação achou para cumprir os golpes que o roteiro pede. Se o balanceamento, a CPU ou o atlas mudarem, o teste `trailer-tomadas` falha dizendo
 * qual plano reescalar. A impressão é o hash do estado do `Game` ao fim do plano.
 */
export const TOMADAS: TomadasDoTrailer = {
  P1: { semente: 471, cpu: [2, 1], inicio: 236, batidas: [{ pedida: 0, tickMotor: 313, tickInicio: 305 }], impressao: '093c3f19' },
  P2: { semente: 33, cpu: [2, 2], inicio: 374, batidas: [{ pedida: 0, tickMotor: 430, tickInicio: 425 }, { pedida: 1, tickMotor: 494, tickInicio: 488 }], impressao: '11a817d7' },
  P3: { semente: 263, cpu: [2, 2], inicio: 763, batidas: [{ pedida: 0, tickMotor: 814, tickInicio: 726 }], impressao: '2afd4018' },
  P4: { semente: 373, cpu: [2, 2], inicio: 420, batidas: [{ pedida: 0, tickMotor: 531, tickInicio: 474 }], impressao: 'aa46d868' },
  P5: { semente: 221, cpu: [2, 2], inicio: 240, batidas: [{ pedida: 0, tickMotor: 382, tickInicio: 376 }], impressao: 'fd04baf3' },
  P6: { semente: 112, cpu: [2, 1], inicio: 100, batidas: [{ pedida: 0, tickMotor: 192, tickInicio: 184 }], impressao: '2b19e9fe' },
  P7: { semente: 313, cpu: [2, 1], inicio: 497, batidas: [{ pedida: 0, tickMotor: 627, tickInicio: 615 }], impressao: 'd6fa0bae' },
  P9: { semente: 162, cpu: [2, 1], inicio: 239, batidas: [{ pedida: 0, tickMotor: 256, tickInicio: 246 }], impressao: '36638572' },
};
