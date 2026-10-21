/**
 * Ordem das 12 poses de cada folha (esquerda para a direita, de cima para baixo) -> nome canônico do C1.
 * Fonte: blocos "SHEET n" de docs/prompts/*.md (idênticos em todos os lutadores, exceto o texto dos especiais da
 * folha 4: os SLOTS sa/sb/sc são fixos, o que muda é o golpe desenhado neles).
 * Folha 5 (extras: jpunch etc.) é opcional e ainda não existe; o `jpunch` cai no fallback do motor.
 */
export const FOLHAS = {
  f1: ['idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7'],
  f2: ['crouch', 'block', 'cblock', 'jsquat', 'jup', 'jtop', 'jfall', 'land', 'hitH', 'hitB', 'kdAir', 'koFloor'],
  f3: ['lp0', 'lp1', 'hp0', 'hp1', 'lk0', 'lk1', 'hk0', 'hk1', 'clp', 'clk', 'sweep', 'upper'],
  f4: ['sa0', 'sa1', 'sa2', 'sa3', 'sb0', 'sb1', 'sb2', 'sb3', 'sc0', 'sc1', 'jkick', 'win'],
};

/** Poses canônicas na ordem do manifesto (PLANO.md 4.3, C1). */
export const ORDEM_CANONICA = Object.values(FOLHAS).flat();

/** Quadros de golpe ativo: `ponta` obrigatória (PLANO.md 4.3, C1). `jpunch` só quando a folha 5 existir. */
export const COM_PONTA = ['lp1', 'hp1', 'lk1', 'hk1', 'clp', 'clk', 'sweep', 'upper', 'sa1', 'sa2', 'sb1', 'sb2', 'sc1', 'jkick', 'jpunch'];

/** Mínimo para o lutador entrar no jogo (PLANO.md 4.3). */
export const MINIMAS = ['idle0', 'walk0', 'crouch', 'block', 'jtop', 'hitH', 'koFloor', 'lp1', 'hp1', 'lk1', 'hk1', 'sa1', 'win'];

/** Nomes das folhas na ordem de processamento. */
export const IDS_FOLHA = Object.keys(FOLHAS);

/**
 * Como medir a ponta de cada golpe (nucleo.mjs):
 *  - 'mao'     = ponto mais à direita ACIMA da faixa dos pés (soco, palma). Sem isso, numa base larga a ponta do pé
 *                da frente empata ou ganha da mão e a ponta cai no chão (visto no AMINU: sb2 e sa1).
 *  - 'direita' = ponto mais à direita da figura inteira (chutes, rasteira, chute em salto: o pé É a ponta).
 *  - 'cima'    = ponto mais alto (golpe antiaéreo: o punho sobe e o mais à direita seria um pé).
 * Por lutador, a exceção mora em ferramentas/sprites/lutadores.json (ex.: o sb2 do HAYATO é um uppercut = 'cima').
 */
export const MODO_PONTA = {
  lp1: 'mao', hp1: 'mao', clp: 'mao', sa1: 'mao', sa2: 'mao', sb1: 'mao', sb2: 'mao', sc1: 'mao', jpunch: 'mao',
  lk1: 'direita', hk1: 'direita', clk: 'direita', sweep: 'direita', jkick: 'direita',
  upper: 'cima',
};
/** Fração da alturaRef, medida a partir da base do quadro, que o modo 'mao' ignora (zona dos pés e canelas). */
export const FAIXA_DOS_PES = 0.22;
