import type { IdLutador } from '../core/contratos';

/*
 * SUPER (R-7/R-7b, docs/spec-redesenho-jogabilidade.md §3.4 e §4, atrás de `ritmo.super`): a versão forte de um dos 3
 * especiais que o lutador já tem, escolhida pelo Apolo (docs/supers-e-combos-v2.md §3). Fora de `LutadorDef` de
 * propósito, como `apresentacao-especiais.ts`/`filmes.ts`: o oráculo de fidelidade compara os especiais dos 4
 * originais com o protótipo campo a campo, e o super não existe nele.
 *
 * Chave: `<lutador>` (ficha base) ou `<lutador>/<ficha>` (NILA `sarpa`, ZENON `chefe2`). Sem registro, o lutador/ficha
 * não tem super (o comando SOCO FORTE + CHUTE FORTE não sai nada, mesmo com a barra cheia).
 *
 * `dano` é o valor BASE: o efetivo (1,35 × o efetivo do filme v2) ÷ `pow` da ficha, exceto projétil (que não usa
 * `pow`, o efetivo é o próprio valor) — mesma convenção de `filmes.ts`. O teto de 32 (`TETO_SUPER` em
 * `fight/game.ts`) é aplicado em cima do resultado TOTAL da sequência, não no dado: por isso AMINU e BAATAR guardam
 * a base do valor CHEIO (35,1 e 33,8 ÷ pow), não já cortada em 32 — o corte acontece sempre, não só quando o dado
 * "passaria" dele.
 *
 * `invulneravel` (só HAYATO e MIN-JI): o MESMO valor de `mv.inv` do especial de origem (RAIJIN-KEN e HOERI CHAGI já
 * sobem invulneráveis) — o campo existe para o contrato bater com a spec e para `todosOsSupers`/validação, mas o
 * motor não precisa aplicá-lo de novo: reaproveita o `inv` do golpe (mesma pose, mesmo golpe, só o dano muda).
 *
 * `acertos` (R-7b, referência do dono — vídeo X-Men vs Street Fighter): o super não é mais 1 contato atômico com
 * filme: é uma sequência de N acertos presos (o rival não escapa entre eles), cada um uma FRAÇÃO do total (soma
 * 1); o ÚLTIMO sempre derruba, e só ele pode abrir filme (se matar — docs §3.3, `ritmo.filmeRestrito`/R-6: CURTO
 * no KO de round, COMPLETO no da luta). Padrão (todos os 12, provisório — Apolo/dono ajustam por lutador depois):
 * 5 acertos, 60% dividido igualmente nos 4 primeiros (15% cada) e 40% no último. `intervalo`: ticks entre um
 * acerto e o próximo (6, o mesmo da HOERI CHAGI de 3 acertos, `every:7` — um pouco mais apertado por ser 5).
 */

/** R-7b: o padrão dos 12 (provisório) — 5 acertos, 60%/4 + 40% no último. */
const ACERTOS_PADRAO: readonly number[] = [0.15, 0.15, 0.15, 0.15, 0.4];
const INTERVALO_PADRAO = 6;

export type SuperDoGolpe = {
  golpe: 'sFire' | 'sDown' | 'sFwd';
  nome: string;
  /** Dano BASE do super INTEIRO (antes de `pow`; projétil não usa `pow`). docs/supers-e-combos-v2.md §3. */
  dano: number;
  /** Só informativo (já vem do `inv` do golpe de origem — ver o comentário do arquivo). */
  invulneravel?: number;
  /** R-7b: fração do dano total de cada acerto da sequência (soma 1; o último derruba). */
  acertos: readonly number[];
  /** R-7b: ticks entre um acerto e o próximo (não conta antes do 1º). */
  intervalo: number;
};

type ChaveSuper = IdLutador | `${IdLutador}/${string}`;

const T: Partial<Record<ChaveSuper, SuperDoGolpe>> = {
  hayato: { golpe: 'sDown', nome: 'TENRAI-KEN', dano: 27.1, invulneravel: 8, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // RAIJIN-KEN x1,35, ef. 29,0
  'wei-long': { golpe: 'sFire', nome: 'TAIJI ZHANG', dano: 31.1, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // LONG ZHANG x1,35, projétil, ef. 31,1
  'min-ji': { golpe: 'sDown', nome: 'TAEPUNG CHAGI', dano: 27.17, invulneravel: 6, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // HOERI CHAGI x1,35, ef. 25,0
  caio: { golpe: 'sFwd', nome: 'MEIA-LUA DE COMPASSO', dano: 23.71, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // MEIA-LUA x1,35, ef. 23,0
  aminu: { golpe: 'sFire', nome: 'VALEU A ESPERA', dano: 29.75, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // MASHI nv3 x1,35, ef. 35,1 -> 32 (teto)
  centella: { golpe: 'sFire', nome: 'ESTRELLA FUGAZ', dano: 23.47, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // PLANCHA x1,35, ef. 22,3
  camille: { golpe: 'sFwd', nome: 'BOTTE SECRÈTE', dano: 22.98, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // REVERS x1,35, ef. 21,6
  nila: { golpe: 'sFire', nome: 'PONTO VITAL', dano: 22.35, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // GOLPE MARMA (GAJA) x1,35, ef. 25,7
  'nila/sarpa': { golpe: 'sFwd', nome: 'PICADA', dano: 24, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // SALTO DA SERPENTE x1,35, ef. 21,6
  baatar: { golpe: 'sFire', nome: 'PESO DA ESTEPE', dano: 37.56, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // ARREMESSO DO AVARGA (agarrão) x1,35, ef. 33,8 -> 32 (teto)
  zenon: { golpe: 'sFire', nome: 'CORTESIA DA CASA', dano: 21.6, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // SELO DO ARCONTE x1,35, projétil, ef. 21,6
  'zenon/chefe2': { golpe: 'sFwd', nome: 'FIM DO BANQUETE', dano: 23.6, acertos: ACERTOS_PADRAO, intervalo: INTERVALO_PADRAO }, // DECRETO x1,35, ef. 23,6
};

/** O super de `id` na ficha `ficha` (null = base), ou undefined se não há (o comando não faz nada). */
export function superDoLutador(id: IdLutador, ficha: string | null): SuperDoGolpe | undefined {
  if (ficha !== null) {
    const daFicha = T[`${id}/${ficha}`];
    if (daFicha) return daFicha;
  }
  return T[id];
}

/** Todos os registros, para teste e para listar (id, ficha|null, super). */
export function todosOsSupers(): { id: IdLutador; ficha: string | null; super: SuperDoGolpe }[] {
  const saida: { id: IdLutador; ficha: string | null; super: SuperDoGolpe }[] = [];
  for (const [chave, s] of Object.entries(T)) {
    if (!s) continue;
    const [a, b] = chave.split('/');
    saida.push({ id: a as IdLutador, ficha: b ?? null, super: s });
  }
  return saida;
}
