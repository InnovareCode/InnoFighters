import type { IdLutador } from '../core/contratos';

/*
 * PALETA DA FAIXA POR LUTADOR (pedido do dono, 24/10/2026, depois de ver a faixa com rosto): a cor da banda deixa de ser a
 * identidade do GOLPE (`identidade-especiais.ts`) e passa a ser a cor PREDOMINANTE de cada lutador — autêntica e exclusiva
 * do nosso jogo, não derivada de `ch.fire`/`accent` (esses são a cor do EFEITO do especial, não do figurino: o `fire` do
 * HAYATO é ciano do raio, mas a roupa dele é preto com amarelo-limão). As 3 cores vieram de olhar o retrato/atlas de cada
 * um (`public/assets/lutadores/<id>/retrato.webp`): `escuro` = a borda da faixa (cor base do figurino), `medio` = o corpo
 * da faixa (tom intermediário), `claro` = as listras/o brilho no centro (o detalhe/acessório mais vivo). Só UI — não mexe
 * em `src/data/lutadores` (o dado de jogo continua com `fire`/`accent` do jeito que estava).
 */

export interface PaletaFaixa {
  readonly escuro: string;
  readonly medio: string;
  readonly claro: string;
}

/** Figurino predominante de cada lutador (base/sem ficha). */
const POR_LUTADOR: Readonly<Record<IdLutador, PaletaFaixa>> = Object.freeze({
  // preto do gi + amarelo-limão do raio/faixa na cabeça
  hayato: { escuro: '#0c0c10', medio: '#3c4414', claro: '#d9ff5e' },
  // azul-real do robe + dourado do dragão bordado
  'wei-long': { escuro: '#0a1240', medio: '#1f4fcc', claro: '#ffe29a' },
  // dobô branco com gola preta + vermelho da faixa/luvas do taekwondo
  'min-ji': { escuro: '#141414', medio: '#b3192f', claro: '#fff6ea' },
  // verde e amarelo da corda de capoeira
  caio: { escuro: '#163a12', medio: '#2fb52f', claro: '#e9ff6a' },
  // tecido terracota/marrom com padrão dourado do dambe
  aminu: { escuro: '#2a1206', medio: '#a65a2e', claro: '#ffdca0' },
  // verde-água da máscara de lucha libre
  centella: { escuro: '#063a30', medio: '#1fcf9e', claro: '#e9fff8' },
  // azul-marinho do top + prata das luvas de boxe
  camille: { escuro: '#0c1230', medio: '#35406e', claro: '#e8ecf7' },
  // creme do sari + terracota das bordas (GAJA, postura base)
  nila: { escuro: '#3a1604', medio: '#c06a1e', claro: '#ffe9c2' },
  // vermelho-vinho do robe mongol + dourado do bordado
  baatar: { escuro: '#3a0a08', medio: '#9c1f16', claro: '#ffcf7a' },
  // preto do paletó + magenta do forro + dourado do medalhão
  zenon: { escuro: '#0a0608', medio: '#6a1450', claro: '#ffd37a' },
});

/** Posturas/fases que trocam de figurino/paleta (dono: "pode variar"). Chave: `lutador/ficha`. */
const POR_FICHA: Readonly<Partial<Record<`${IdLutador}/${string}`, PaletaFaixa>>> = Object.freeze({
  // SARPA (serpente): verde mais frio/escamado, no lugar do terracota da GAJA
  'nila/sarpa': { escuro: '#0c2e14', medio: '#2e8a4a', claro: '#d8ffb0' },
  // fase 2 do chefão: o magenta aprofunda e ganha um rosa mais aceso (a "conta" sobe de tom)
  'zenon/chefe2': { escuro: '#0a0608', medio: '#8a1060', claro: '#ff8fd0' },
});

/** A paleta da faixa de `lutador` na `ficha` dada (null = base). Sempre devolve algo (nunca undefined). */
export function paletaFaixaDe(lutador: IdLutador, ficha: string | null): PaletaFaixa {
  if (ficha) {
    const daFicha = POR_FICHA[`${lutador}/${ficha}`];
    if (daFicha) return daFicha;
  }
  return POR_LUTADOR[lutador];
}
