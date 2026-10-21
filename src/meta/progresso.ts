import type { IdLutador } from '../core/contratos';
import { REGRAS_PADRAO } from './regras';
import type { Progresso, Regras, ResultadoVitoria } from './tipos';

/** Funcoes PURAS: sem DOM, sem storage, sem relogio. Nada aqui muta o que recebe. */

export function progressoVazio(): Progresso {
  return { desbloqueados: [], zeradas: 0, chefeDerrotado: false, vistos: [] };
}

/** O unico chefao que existiu antes de `chefesDerrotados`: e quem um `chefeDerrotado: true` antigo significa. */
export const CHEFE_LEGADO = 'baatar';
/**
 * Chefoes que SO se liberam derrotando-os (nao estao na fila de desbloqueio): ter o id em `desbloqueados` (ou em
 * `desconhecidos`, num build que ainda nao o conhece) prova a derrota. O saneamento usa isto para recompor
 * `chefesDerrotados` depois de um rollback, quando o build antigo apagou a lista mas guardou o desbloqueio.
 * NAO inclui o `baatar`: ele tambem sai da fila, entao ter o id nao prova que foi derrotado como chefe.
 */
export const CHEFOES_SO_POR_DERROTA: readonly string[] = ['zenon'];
/** Teto da lista de chefoes derrotados (sao poucos; localStorage e editavel). */
export const MAX_CHEFES_DERROTADOS = 8;

/** Chefoes derrotados, olhando tambem o booleano legado (um `Progresso` montado a mao por codigo antigo). */
export function chefesDerrotadosDe(prog: Progresso): readonly string[] {
  if (prog.chefesDerrotados && prog.chefesDerrotados.length > 0) return prog.chefesDerrotados;
  return prog.chefeDerrotado ? [CHEFE_LEGADO] : [];
}

/** Este chefao ja foi derrotado alguma vez? */
export function derrotouOChefe(prog: Progresso, id: string): boolean {
  return chefesDerrotadosDe(prog).includes(id);
}

/** INICIAIS ∪ prog.desbloqueados. */
export function liberados(prog: Progresso, regras: Regras = REGRAS_PADRAO): ReadonlySet<IdLutador> {
  return new Set<IdLutador>([...regras.iniciais, ...prog.desbloqueados]);
}

/**
 * O proximo da fila e "o primeiro que ainda nao esta liberado" — nao `fila[zeradas]`. Por isso reordenar a
 * fila numa atualizacao nunca revoga ninguem. `undefined` com a fila esgotada.
 */
export function proximoDaFila(prog: Progresso, regras: Regras = REGRAS_PADRAO): IdLutador | undefined {
  const ja = liberados(prog, regras);
  return regras.fila.find((id) => !ja.has(id));
}

/**
 * Zerou o Arcade (qualquer dificuldade, com continues — ED9). Sempre conta uma zerada e libera o proximo da
 * fila (se houver). Se `derrotouChefe`, tambem libera o chefao na 1a vez (ED3a). Jogando COM o chefao nao ha
 * luta de chefe: o chamador passa `derrotouChefe: false` e a zerada so avanca a fila.
 * `novos` vem na ordem em que o desbloqueio deve ser mostrado (fila primeiro, chefao depois).
 */
export function aplicarVitoriaArcade(
  prog: Progresso,
  vitoria: { derrotouChefe: boolean },
  regras: Regras = REGRAS_PADRAO,
): ResultadoVitoria {
  const desbloqueados = [...prog.desbloqueados];
  const novos: IdLutador[] = [];
  const liberar = (id: IdLutador): void => {
    desbloqueados.push(id);
    novos.push(id);
  };

  const proximo = proximoDaFila(prog, regras);
  if (proximo !== undefined) liberar(proximo);

  const chefe = regras.chefe;
  if (vitoria.derrotouChefe && chefe !== null && !liberados(prog, regras).has(chefe) && !novos.includes(chefe)) {
    liberar(chefe);
  }
  // QUAL chefao caiu: soma o atual (sem repetir) aos ja derrotados. Jogando COM o chefao nao ha luta de chefe.
  const derrotados = [...chefesDerrotadosDe(prog)];
  if (vitoria.derrotouChefe && chefe !== null && !derrotados.includes(chefe)) derrotados.push(chefe);

  return {
    prog: {
      desbloqueados,
      zeradas: Math.min(prog.zeradas + 1, Number.MAX_SAFE_INTEGER),
      chefeDerrotado: derrotados.length > 0,
      ...(derrotados.length > 0 ? { chefesDerrotados: derrotados } : {}),
      vistos: [...prog.vistos],
      ...(prog.desconhecidos && prog.desconhecidos.length > 0 ? { desconhecidos: [...prog.desconhecidos] } : {}),
    },
    novos,
  };
}

/** Marca como "vistos" (selo NOVO! some) so quem esta de fato liberado; ids travados/duplicados sao ignorados. */
export function marcarVistos(prog: Progresso, ids: readonly IdLutador[]): Progresso {
  const vistos = [...prog.vistos];
  for (const id of ids) {
    if (prog.desbloqueados.includes(id) && !vistos.includes(id)) vistos.push(id);
  }
  return { ...prog, desbloqueados: [...prog.desbloqueados], vistos };
}

/** Desbloqueados que o jogador ainda nao viu na selecao (selo NOVO!). */
export function naoVistos(prog: Progresso): IdLutador[] {
  return prog.desbloqueados.filter((id) => !prog.vistos.includes(id));
}

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Teto de ids desconhecidos preservados (localStorage e editavel: nao deixa crescer sem limite). */
export const MAX_IDS_DESCONHECIDOS = 32;
/** Forma aceita para um id desconhecido preservado: kebab-case curto, como os ids reais ('wei-long', 'min-ji'). */
const FORMA_ID_DESCONHECIDO = /^[a-z0-9][a-z0-9-]{0,31}$/;

/**
 * Saneia `prog` lido do localStorage (dado externo e editavel; plano 3.3): duplicados removidos, iniciais nunca
 * guardados, `vistos` limitado a quem esta desbloqueado, `zeradas` inteiro >= 0. Nunca lanca.
 *
 * Chefoes derrotados (Z6): `chefesDerrotados` aceita so ids com a forma de id, sem repeticao, ate
 * `MAX_CHEFES_DERROTADOS` — NAO exige que o id esteja no roster (o chefao de uma onda futura ainda nao existe). Save
 * antigo, com `chefeDerrotado: true` (booleano estrito) e sem lista, vira `[CHEFE_LEGADO]`. Chefao de
 * `CHEFOES_SO_POR_DERROTA` desbloqueado entra na lista (recompoe o que um rollback apagou). `chefeDerrotado` e
 * DERIVADO: `true` sse a lista nao esta vazia (assim os dois campos nunca discordam e o build antigo le o ganho).
 *
 * Ids de desbloqueio FORA do roster (lutador de onda futura apos rollback) NAO sao jogados fora: vao para
 * `desconhecidos` (opaco, so para sobreviver ao proximo save), desde que tenham a forma de um id
 * (`FORMA_ID_DESCONHECIDO`), sem repeticao, ate `MAX_IDS_DESCONHECIDOS`. Lixo (nao-string, forma invalida,
 * excesso) continua descartado. Ids que passaram a existir no roster sao promovidos a `desbloqueados`.
 * `vistos` so cobre ids conhecidos (selo NOVO! pode reaparecer uma vez para um id promovido).
 */
export function sanearProgresso(bruto: unknown, regras: Pick<Regras, 'roster' | 'iniciais'> = REGRAS_PADRAO): Progresso {
  if (!ehObjeto(bruto)) return progressoVazio();
  const conhecidos = new Set<string>(regras.roster);
  const iniciais = new Set<string>(regras.iniciais);

  const strings = (v: unknown): string[] => (Array.isArray(v) ? (v as unknown[]).filter((x): x is string => typeof x === 'string') : []);

  const desbloqueados: IdLutador[] = [];
  const desconhecidos: string[] = [];
  // `desbloqueados` cru primeiro, depois `desconhecidos` cru (que pode conter ids hoje conhecidos).
  for (const item of [...strings(bruto['desbloqueados']), ...strings(bruto['desconhecidos'])]) {
    if (iniciais.has(item)) continue;
    if (conhecidos.has(item)) {
      if (!desbloqueados.includes(item as IdLutador)) desbloqueados.push(item as IdLutador);
    } else if (
      FORMA_ID_DESCONHECIDO.test(item) &&
      desconhecidos.length < MAX_IDS_DESCONHECIDOS &&
      !desconhecidos.includes(item)
    ) {
      desconhecidos.push(item);
    }
  }

  const permitidos = new Set<string>(desbloqueados);
  const vistos: IdLutador[] = [];
  for (const item of strings(bruto['vistos'])) {
    if (permitidos.has(item) && !vistos.includes(item as IdLutador)) vistos.push(item as IdLutador);
  }

  const derrotados: string[] = [];
  const somar = (item: string): void => {
    if (FORMA_ID_DESCONHECIDO.test(item) && derrotados.length < MAX_CHEFES_DERROTADOS && !derrotados.includes(item)) {
      derrotados.push(item);
    }
  };
  strings(bruto['chefesDerrotados']).forEach(somar);
  if (derrotados.length === 0 && bruto['chefeDerrotado'] === true) somar(CHEFE_LEGADO);
  const liberadosOuDesconhecidos = new Set<string>([...desbloqueados, ...desconhecidos]);
  for (const id of CHEFOES_SO_POR_DERROTA) if (liberadosOuDesconhecidos.has(id)) somar(id);

  const z = bruto['zeradas'];
  const zeradas = typeof z === 'number' && Number.isFinite(z) && z > 0 ? Math.min(Math.floor(z), Number.MAX_SAFE_INTEGER) : 0;

  return {
    desbloqueados,
    zeradas,
    chefeDerrotado: derrotados.length > 0,
    vistos,
    ...(derrotados.length > 0 ? { chefesDerrotados: derrotados } : {}),
    ...(desconhecidos.length > 0 ? { desconhecidos } : {}),
  };
}
