/** Resolucao logica do jogo (PLANO.md 5, Fase 0). O canvas e escalado por CSS. */
export const LARGURA = 960;
export const ALTURA = 540;

// --- Nucleo do protótipo (secao 1). Nomes mantidos de proposito para o porte ser mecanico. ---
/** Linha do chao (y dos pes). */
export const GROUND = 470;
/** Altura do lutador na tela usada nas caixas de dano (hurtbox). */
export const SH = 265;
/** Altura da guarda na tela (px logicos); base do fator K de cada lutador. */
export const SH_IDLE = 255;
export const GRAVITY = 0.85;
export const WALK_SPEED = 3.6;
export const JUMP_FORCE = -16.5;
export const MAX_HP = 100;
export const MAX_EN = 100;
export const SPECIAL_COST = 40;
