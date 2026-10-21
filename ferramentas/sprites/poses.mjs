/**
 * Ordem das 12 poses de cada folha (esquerda para a direita, de cima para baixo) -> nome canônico do C1.
 * Fonte: blocos "SHEET n" de docs/prompts/*.md (idênticos em todos os lutadores, exceto o texto dos especiais da
 * folha 4: os SLOTS sa/sb/sc são fixos, o que muda é o golpe desenhado neles).
 * Folha 5 genérica (extras: jpunch etc.) não existe; o `jpunch` cai no fallback do motor. A NILA tem uma f5 própria (serpente,
 * poses `sarpa*`), declarada em lutadores.json (`folhasExtras`).
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
 *  - 'pe'      = ponto mais à direita abaixo de FRACAO_PE da altura (a bota, quando a mão passa dela)
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
/**
 * Modo 'pe' (só por exceção em lutadores.json): ponto mais à direita ABAIXO de 55% da altura do quadro. Para o chute em
 * salto em que o punho da frente passa da bota (BAATAR `jkick`: a ponta tem de ser a bota que bate, não a mão).
 */
export const FRACAO_PE = 0.55;

// ---------------------------------------------------------------------------------------------------------------
// Layouts de folhas (lutadores novos). O padrão é o de 12 poses (f1..f4, grade 4x3). O chefão BAATAR usa 9 folhas de
// 6 poses (grade 3x2) mais a folha de reposição `br`: docs/prompts/08-baatar.md e docs/prompts-arte.md §7.
//
// Uma CÉLULA da folha é: um nome de pose; uma lista de nomes (apelidos: o mesmo desenho serve a mais de um quadro do
// ciclo, e entra UMA vez no atlas, com as duas entradas do manifesto apontando para o mesmo retângulo); ou null
// (figura descartada: a pose não entra no atlas, mas a figura ainda conta para achar as 6/12 da folha).
// ---------------------------------------------------------------------------------------------------------------

/** Poses que não são do mapa canônico de 48 mas existem no motor (`jpunch`: folha 5; `devekh`/`dive`: BAATAR). */
export const EXTRAS = ['jpunch', 'devekh0', 'devekh1', 'devekh2', 'dive0', 'dive1'];

/** Ordem do manifesto: as canônicas e depois as extras (as que o lutador não tiver simplesmente não saem). */
export const ORDEM_COMPLETA = [...ORDEM_CANONICA, ...EXTRAS];

export const GRADE_PADRAO = [4, 3];
export const GRADE_CHEFE = [3, 2];

const LAYOUT_PADRAO = {
  ids: IDS_FOLHA,
  folhas: Object.fromEntries(IDS_FOLHA.map((f) => [f, { grade: GRADE_PADRAO, celulas: FOLHAS[f] }])),
};

/**
 * BAATAR (1,28x maior no jogo). Mapa de docs/prompts-arte.md §7, já com a curadoria do Apolo
 * (docs/handoff-apolo-baatar-folhas.md, lotes 7 e 8):
 *  - B1: o idle 4 (r2c1) sobe em vez de "descer o peito" e é 38 px mais alto: descartado. Laço 2-1-3-1 (alturas
 *    825/830/837/830): idle0 = frame 1 (a referência de escala), idle1 = frame 3, idle2 = frame 1 de novo, idle3 = frame 2.
 *  - B3 r1c1 (agachar) sai da folha de reposição BR (na B3 ele saiu em pé: 98,6% do idle); BR r1c3 (hip toss) vale no
 *    lugar do B7 r1c3. As outras 4 células da BR não entram (decisão do Apolo).
 *  - B9 = v2 (proporção corrigida); devekh0-2 (dança), dive0-1 (mergulho) e win (vitória).
 */
const LAYOUT_CHEFE = {
  ids: ['b1', 'b2', 'b3', 'br', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9'],
  folhas: {
    b1: { grade: GRADE_CHEFE, celulas: [['idle0', 'idle2'], 'idle3', 'idle1', null, 'walk0', 'walk1'] },
    b2: { grade: GRADE_CHEFE, celulas: ['walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7'] },
    b3: { grade: GRADE_CHEFE, celulas: [null, 'block', 'cblock', 'jsquat', 'jup', 'jtop'] },
    br: { grade: GRADE_CHEFE, celulas: ['crouch', null, 'sa2', null, null, null] },
    b4: { grade: GRADE_CHEFE, celulas: ['jfall', 'land', 'hitH', 'hitB', 'kdAir', 'koFloor'] },
    b5: { grade: GRADE_CHEFE, celulas: ['lp0', 'lp1', 'hp0', 'hp1', 'lk0', 'lk1'] },
    b6: { grade: GRADE_CHEFE, celulas: ['hk0', 'hk1', 'clp', 'clk', 'sweep', 'upper'] },
    b7: { grade: GRADE_CHEFE, celulas: ['sa0', 'sa1', null, 'sa3', 'sb0', 'sb1'] },
    b8: { grade: GRADE_CHEFE, celulas: ['sb2', 'sb3', 'sc0', 'sc1', 'jkick', 'jpunch'] },
    b9: { grade: GRADE_CHEFE, celulas: ['devekh0', 'devekh1', 'devekh2', 'dive0', 'dive1', 'win'] },
  },
};

export const LAYOUTS = { padrao: LAYOUT_PADRAO, chefe: LAYOUT_CHEFE };

/** Uma célula (nome | lista | null) como lista de nomes (vazia = descartada). */
export function nomesDaCelula(celula) {
  if (celula == null) return [];
  return Array.isArray(celula) ? celula : [celula];
}

/**
 * Layout efetivo do lutador: o do arquivo de exceções (`layout`: 'padrao' | 'chefe') com as células de cada folha
 * trocadas por `celulas` (lutadores.json) quando houver. Valida: nome de pose repetido entre células é erro (dois
 * desenhos para a mesma pose), e a quantidade de células tem de bater com a grade.
 */
export function resolverLayout(excecoes = {}) {
  const base = LAYOUTS[excecoes.layout ?? 'padrao'];
  if (!base) throw new Error(`layout desconhecido: ${excecoes.layout}`);
  const folhas = {};
  for (const id of base.ids) {
    const f = base.folhas[id];
    const celulas = excecoes.celulas?.[id] ?? f.celulas;
    if (celulas.length !== f.grade[0] * f.grade[1]) {
      throw new Error(`folha ${id}: ${celulas.length} celulas para uma grade ${f.grade.join('x')}`);
    }
    folhas[id] = { grade: f.grade, celulas };
  }
  // folhas EXTRAS do lutador (lutadores.json `folhasExtras`: NILA f5 = serpente). Entram depois das do layout; os nomes de
  // pose delas são livres (não precisam estar em ORDEM_COMPLETA: `executar.mjs` acrescenta ao fim do manifesto).
  const ids = [...base.ids];
  for (const [id, f] of Object.entries(excecoes.folhasExtras ?? {})) {
    if (folhas[id]) throw new Error(`folhasExtras: "${id}" ja existe no layout`);
    const grade = f.grade ?? GRADE_PADRAO;
    if (f.celulas.length !== grade[0] * grade[1]) {
      throw new Error(`folha ${id}: ${f.celulas.length} celulas para uma grade ${grade.join('x')}`);
    }
    folhas[id] = { grade, celulas: f.celulas };
    ids.push(id);
  }
  const vistos = new Map();
  for (const id of ids) {
    for (const nome of folhas[id].celulas.flatMap(nomesDaCelula)) {
      if (vistos.has(nome)) throw new Error(`pose "${nome}" aparece em duas celulas (${vistos.get(nome)} e ${id})`);
      vistos.set(nome, id);
    }
  }
  return { ids, folhas };
}
