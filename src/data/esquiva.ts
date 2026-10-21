/*
 * ESQUIVA (docs/spec-esquiva-e-cinematica-especial.md 2.1, A3/A4/A6). Valores de PARTIDA: a E6 ajusta pelo harness e com o dono jogando.
 *
 * Cada esquiva anda `dist` px em `invFim` ticks com velocidade decrescente (v = k·(1 − t/T), integral = dist) e fica `dur − invFim` ticks
 * parada na recuperação (sem invulnerabilidade, sem bloqueio, arremessável, contragolpe). A janela invulnerável é [invIni, invFim).
 * O deslocamento é escalado por `ch.spd`, como a corrida.
 */
export type TrechoEsquiva = {
  /** Ticks da esquiva inteira (movimento + recuperação). */
  dur: number;
  /** Primeiro tick invulnerável (os anteriores são o arranque, vulnerável). */
  invIni: number;
  /** Primeiro tick que já NÃO é invulnerável; o movimento acaba aqui. */
  invFim: number;
  /** Deslocamento total em px (spd = 1). */
  dist: number;
};

export type ParametrosEsquiva = {
  /** Energia gasta; precisa de `en >= custo` (igual ao `canAfford` dos especiais). */
  custo: number;
  /** Ticks que o botão apertado fica guardado (separado do buffer de ataque, que é de 9). */
  buffer: number;
  tras: TrechoEsquiva;
  frente: TrechoEsquiva;
};

export const ESQUIVA_PADRAO: ParametrosEsquiva = {
  custo: 20,
  buffer: 6,
  tras: { dur: 22, invIni: 0, invFim: 14, dist: 120 },
  frente: { dur: 26, invIni: 3, invFim: 19, dist: 150 },
};
