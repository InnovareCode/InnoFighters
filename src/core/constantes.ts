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

/** Meia-largura de empurrão entre lutadores (min = 78 do protótipo = 2 * 39). LutadorDef.corpo sobrescreve. */
export const CORPO_PADRAO = 39;

// --- Cenário da luta (src/render/cenario.ts desenha o fundo em y = CENARIO_Y com CENARIO_ALTURA px de altura) ---
/** Topo do fundo da luta na tela lógica (a imagem sobra 20 px acima e 20 abaixo). */
export const CENARIO_Y = -20;
/** Altura com que o fundo da luta é desenhado (ALTURA + 40). */
export const CENARIO_ALTURA = ALTURA + 40;
/**
 * Fração da ALTURA DA IMAGEM em que ficam os pés dos lutadores: (GROUND − CENARIO_Y) / CENARIO_ALTURA = 490 / 580 = 84,5%.
 * Não é os 87% de 470/540 (a tela), porque o fundo não é desenhado do tamanho da tela. O zoom da câmera é ancorado no
 * chão, então a linha não muda com o zoom. A arte do cenário deve estar limpa dessa linha para baixo.
 */
export const PES_NO_CENARIO = (GROUND - CENARIO_Y) / CENARIO_ALTURA;
