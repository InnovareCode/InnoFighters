import { IDS_LUTADORES, PROVOCACOES_PADRAO, type IdLutador, type IndiceLutador, type PreferenciaProvocacoes } from '../core/contratos';
import type { Rng } from '../core/rng';
import { PROVOCACOES_PT_BR } from './provocacoes.pt-BR';

/*
 * PROVOCAÇÕES (docs/spec-provocacao-prerround-e-vitoria.md §7): tabela de falas por lutador + funções PURAS de escolha e de validação.
 * Apresentação, fora do motor: nada aqui toca `src/fight`, `Game.rng` ou o lock-step. O sorteio usa `Contexto.sorteioDeFalas` (semente + 5).
 * Só dados e lógica; quem desenha o balão e conduz a cena é a P2 (`src/render/provocacao.ts`).
 */

/** Um balão. Pode ter `{rival}` (vira o `ch.name` do oponente). "\n" força a quebra. */
export type Fala = string;

export type FalasDeProvocacao = {
  /** Round 1. ≥ 3 variantes. ≤ 2 linhas, ≤ 64 caracteres (alvo 40-56). */
  readonly abertura: readonly Fala[];
  /** Round ≥ 2, quem perdeu o round anterior. ≥ 2 variantes. 1 linha, ≤ 34 caracteres. */
  readonly revanche: readonly Fala[];
  /** Round decisivo (os dois a 1 vitória do fim). Opcional: ausente usa `revanche`. 1 linha, ≤ 34. */
  readonly decisivo?: readonly Fala[];
  /** Fim da luta, quem venceu. ≥ 3 variantes. ≤ 2 linhas, ≤ 64. */
  readonly vitoria: readonly Fala[];
  /** Venceu o último round sem tomar dano (`perfect`). Opcional. */
  readonly vitoriaPerfeita?: readonly Fala[];
  /** Venceu por tempo. Opcional. */
  readonly vitoriaPorTempo?: readonly Fala[];
  /** Rivalidades: vencem as genéricas contra aquele oponente. Opcional. */
  readonly contra?: Partial<Record<IdLutador, { readonly abertura?: readonly Fala[]; readonly vitoria?: readonly Fala[] }>>;
};

/** Uma tabela completa de um idioma. `Record<IdLutador, …>`: lutador novo sem falas NÃO COMPILA (proposital). */
export type TabelaDeFalas = Readonly<Record<IdLutador, FalasDeProvocacao>>;

export type IdiomaDeFalas = 'pt-BR';
export const IDIOMA_PADRAO: IdiomaDeFalas = 'pt-BR';

/** O token de substituição e quanto ele conta nos limites (o maior nome: WEI LONG / CENTELLA = 8). */
export const TOKEN_RIVAL = '{rival}';
export const CARACTERES_DO_RIVAL = 8;

// ---------------------------------------------------------------------------------------------------------------------------------
// Limites e validação
// ---------------------------------------------------------------------------------------------------------------------------------

/** Categorias de lista que a validação conhece (os títulos do `docs/textos-provocacao.md` + as duas listas de `contra`). */
export type CategoriaDeLista = 'abertura' | 'revanche' | 'decisivo' | 'vitoria' | 'vitoriaPerfeita' | 'vitoriaPorTempo' | 'contra.abertura' | 'contra.vitoria';

export type LimiteDeFala = {
  /** Linhas depois da quebra automática (aproximada por caracteres; o portão de verdade é a medida no navegador, §10 item 11). */
  readonly linhas: number;
  readonly porLinha: number;
  /** Total de caracteres já com `{rival}` = 8 ("\n" conta 1). */
  readonly total: number;
  /** Mínimo de variantes. 0 = a lista é opcional; se existir, precisa ter pelo menos 1. */
  readonly minimo: number;
};

const DUAS_LINHAS = { linhas: 2, porLinha: 34, total: 64 } as const;
const UMA_LINHA = { linhas: 1, porLinha: 34, total: 34 } as const;

export const LIMITES_DE_FALA: Readonly<Record<CategoriaDeLista, LimiteDeFala>> = Object.freeze({
  abertura: { ...DUAS_LINHAS, minimo: 3 },
  revanche: { ...UMA_LINHA, minimo: 2 },
  decisivo: { ...UMA_LINHA, minimo: 0 },
  vitoria: { ...DUAS_LINHAS, minimo: 3 },
  vitoriaPerfeita: { ...DUAS_LINHAS, minimo: 0 },
  vitoriaPorTempo: { ...DUAS_LINHAS, minimo: 0 },
  'contra.abertura': { ...DUAS_LINHAS, minimo: 0 },
  'contra.vitoria': { ...DUAS_LINHAS, minimo: 0 },
});

/** Latin-1 imprimível (sem NBSP e hífen suave, que são invisíveis) + `— … “ ” ‘ ’` + "\n". Sem emoji: a fonte do canvas não tem. */
const CARACTERES_PERMITIDOS = /^[ -~¡-¬®-ÿ—…“”‘’\n]*$/;

/** Troca o token pelo comprimento máximo (8) para medir, sem depender do nome real. */
export function comRivalMedido(fala: Fala): string {
  return fala.split(TOKEN_RIVAL).join('X'.repeat(CARACTERES_DO_RIVAL));
}

/**
 * Quebra por caracteres (guloso, por palavra), respeitando "\n". É a APROXIMAÇÃO usada pela validação de dados; o balão real quebra por medida
 * em px (P2). Uma palavra maior que `porLinha` fica sozinha numa linha (a validação então acusa o estouro).
 */
export function quebrarPorCaracteres(texto: string, porLinha: number): string[] {
  const linhas: string[] = [];
  for (const segmento of texto.split('\n')) {
    let atual = '';
    for (const palavra of segmento.split(' ')) {
      if (atual === '') atual = palavra;
      else if (atual.length + 1 + palavra.length <= porLinha) atual += ' ' + palavra;
      else {
        linhas.push(atual);
        atual = palavra;
      }
    }
    linhas.push(atual);
  }
  return linhas;
}

/** Problemas de UMA fala contra o limite da categoria (vazio = ok). */
export function problemasDaFala(fala: unknown, limite: LimiteDeFala): string[] {
  if (typeof fala !== 'string') return ['não é texto'];
  const p: string[] = [];
  if (fala.trim() === '') return ['fala vazia'];
  if (fala !== fala.trim()) p.push('espaço sobrando no começo ou no fim');
  if (/ {2,}/.test(fala)) p.push('espaços duplos');
  if (!CARACTERES_PERMITIDOS.test(fala)) p.push('caractere fora do permitido (Latin-1 e — … “ ” ‘ ’; sem emoji)');
  if (/[{}]/.test(fala.split(TOKEN_RIVAL).join(''))) p.push(`só o token ${TOKEN_RIVAL} é aceito entre chaves`);
  const medida = comRivalMedido(fala);
  if (medida.length > limite.total) p.push(`${medida.length} caracteres (máximo ${limite.total})`);
  const linhas = quebrarPorCaracteres(medida, limite.porLinha);
  if (linhas.some((l) => l === '')) p.push('linha vazia (\\n no começo, no fim ou duplo)');
  if (linhas.length > limite.linhas) p.push(`${linhas.length} linhas (máximo ${limite.linhas})`);
  const larga = linhas.find((l) => l.length > limite.porLinha);
  if (larga !== undefined) p.push(`linha com ${larga.length} caracteres (máximo ${limite.porLinha})`);
  return p;
}

function problemasDaLista(onde: string, lista: unknown, categoria: CategoriaDeLista, obrigatoria: boolean): string[] {
  const limite = LIMITES_DE_FALA[categoria];
  if (lista === undefined) return obrigatoria ? [`${onde}: lista ausente`] : [];
  if (!Array.isArray(lista)) return [`${onde}: não é uma lista`];
  const p: string[] = [];
  const minimo = Math.max(limite.minimo, 1);
  if (lista.length < minimo) p.push(`${onde}: ${lista.length} variante(s), mínimo ${minimo}`);
  const vistas = new Set<string>();
  lista.forEach((fala: unknown, i) => {
    for (const motivo of problemasDaFala(fala, limite)) p.push(`${onde}[${i}]: ${motivo}`);
    if (typeof fala === 'string') {
      const chave = fala.trim().toLowerCase();
      if (vistas.has(chave)) p.push(`${onde}[${i}]: repetida na mesma lista`);
      vistas.add(chave);
    }
  });
  return p;
}

/**
 * Valida uma tabela inteira (todos os ids, todas as listas, limites e caracteres). Devolve TODOS os problemas, legíveis; vazio = ok.
 * Aceita `unknown` por dentro: o TypeScript garante a forma, mas a tabela de outro idioma pode vir de JSON um dia.
 */
export function validarTabelaDeFalas(tabela: unknown, ids: readonly string[] = IDS_LUTADORES): string[] {
  if (typeof tabela !== 'object' || tabela === null) return ['a tabela de falas não é um objeto'];
  const t = tabela as Record<string, unknown>;
  const p: string[] = [];
  for (const id of Object.keys(t)) {
    if (!ids.includes(id)) p.push(`${id}: lutador desconhecido na tabela de falas`);
  }
  for (const id of ids) {
    const f = t[id];
    if (typeof f !== 'object' || f === null) {
      p.push(`${id}: SEM FALAS (todo lutador precisa de abertura, revanche e vitoria)`);
      continue;
    }
    const falas = f as Record<string, unknown>;
    p.push(...problemasDaLista(`${id}.abertura`, falas['abertura'], 'abertura', true));
    p.push(...problemasDaLista(`${id}.revanche`, falas['revanche'], 'revanche', true));
    p.push(...problemasDaLista(`${id}.decisivo`, falas['decisivo'], 'decisivo', false));
    p.push(...problemasDaLista(`${id}.vitoria`, falas['vitoria'], 'vitoria', true));
    p.push(...problemasDaLista(`${id}.vitoriaPerfeita`, falas['vitoriaPerfeita'], 'vitoriaPerfeita', false));
    p.push(...problemasDaLista(`${id}.vitoriaPorTempo`, falas['vitoriaPorTempo'], 'vitoriaPorTempo', false));
    const contra = falas['contra'];
    if (contra === undefined) continue;
    if (typeof contra !== 'object' || contra === null || Array.isArray(contra)) {
      p.push(`${id}.contra: não é um objeto`);
      continue;
    }
    for (const [rival, par] of Object.entries(contra as Record<string, unknown>)) {
      const onde = `${id}.contra[${rival}]`;
      // O espelho (`contra[id]` dentro de `id`) é válido: o Apolo escreveu fala de espelho para o ZENON (md §2, contra: zenon dentro do ZENON).
      if (!ids.includes(rival)) p.push(`${onde}: rival desconhecido`);
      if (typeof par !== 'object' || par === null) {
        p.push(`${onde}: não é um objeto`);
        continue;
      }
      const o = par as Record<string, unknown>;
      if (o['abertura'] === undefined && o['vitoria'] === undefined) p.push(`${onde}: sem abertura nem vitoria`);
      p.push(...problemasDaLista(`${onde}.abertura`, o['abertura'], 'contra.abertura', false));
      p.push(...problemasDaLista(`${onde}.vitoria`, o['vitoria'], 'contra.vitoria', false));
    }
  }
  return p;
}

/** Erro de dados de falas: a mensagem lista TODOS os problemas; `problemas` serve a testes e a ferramentas. */
export class ErroDeFalas extends Error {
  readonly problemas: readonly string[];
  constructor(rotulo: string, problemas: readonly string[]) {
    super(`Falas de provocação inválidas (${rotulo}): ${problemas.length} problema(s)\n - ${problemas.join('\n - ')}`);
    this.name = 'ErroDeFalas';
    this.problemas = problemas;
  }
}

/** Valida e LANÇA (falha alto) se houver qualquer problema. É o que roda no boot, no carregamento deste módulo. */
export function exigirFalasValidas(tabela: unknown, rotulo: string, ids: readonly string[] = IDS_LUTADORES): void {
  const problemas = validarTabelaDeFalas(tabela, ids);
  if (problemas.length > 0) throw new ErroDeFalas(rotulo, problemas);
}

const TABELAS: Readonly<Record<IdiomaDeFalas, TabelaDeFalas>> = { 'pt-BR': PROVOCACOES_PT_BR };

// Falha ALTO e CEDO: qualquer import deste módulo (a cena de luta importa) derruba o boot se um lutador estiver sem falas ou fora dos limites.
for (const idioma of Object.keys(TABELAS) as IdiomaDeFalas[]) exigirFalasValidas(TABELAS[idioma], idioma);

/** As falas de um lutador. Outro idioma = outro arquivo com o mesmo tipo (`TabelaDeFalas`). */
export function falasDe(id: IdLutador, idioma: IdiomaDeFalas = IDIOMA_PADRAO): FalasDeProvocacao {
  return TABELAS[idioma][id];
}

/** Preferência salva -> ligada ou não. Ausente = padrão do dono ('ligadas'). */
export function provocacoesLigadas(salva: PreferenciaProvocacoes | undefined): boolean {
  return (salva ?? PROVOCACOES_PADRAO) === 'ligadas';
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Escolha (pura)
// ---------------------------------------------------------------------------------------------------------------------------------

/** `{rival}` -> nome do oponente. Troca por função: um nome com `$&`/`$1` não pode virar substituição especial. */
export function trocarRival(fala: Fala, nomeRival: string): string {
  return fala.split(TOKEN_RIVAL).join(nomeRival);
}

/**
 * Escolhe uma fala da lista SEM repetir `ultima` (a última deste lutador) quando a lista tem mais de uma. Sempre consome EXATAMENTE um
 * número do `rng` (se houver), para a sequência do sorteio de falas ser previsível. Sem `rng` (testes antigos): a primeira candidata.
 * Lista vazia lança: a validação do boot garante que ela não ocorre.
 */
export function escolherFala(lista: readonly Fala[], rng?: Pick<Rng, 'inteiro'>, ultima?: Fala): Fala {
  if (lista.length === 0) throw new Error('escolherFala: lista vazia');
  const semRepetir = lista.length > 1 && ultima !== undefined ? lista.filter((f) => f !== ultima) : lista;
  const candidatas = semRepetir.length > 0 ? semRepetir : lista;
  const i = rng ? rng.inteiro(candidatas.length) : 0;
  return candidatas[i] as Fala;
}

/** Memória de "última fala deste lutador" (por sessão da cena). Guarda o MODELO (com `{rival}`), não o texto já trocado. */
export interface MemoriaDeFalas {
  ultima(falante: IdLutador): Fala | undefined;
  lembrar(falante: IdLutador, modelo: Fala): void;
}

export function criarMemoriaDeFalas(): MemoriaDeFalas {
  const m = new Map<IdLutador, Fala>();
  return { ultima: (f) => m.get(f), lembrar: (f, modelo) => void m.set(f, modelo) };
}

/** De onde saiu a lista escolhida (as precedências da §7.1). */
export type OrigemDaLista = CategoriaDeLista;

export type ListaEscolhida = { readonly origem: OrigemDaLista; readonly lista: readonly Fala[] };

const temItens = (l: readonly Fala[] | undefined): l is readonly Fala[] => l !== undefined && l.length > 0;

/** Abertura: `contra[rival].abertura` > `abertura`. */
export function listaDeAbertura(falas: FalasDeProvocacao, rival: IdLutador): ListaEscolhida {
  const c = falas.contra?.[rival]?.abertura;
  return temItens(c) ? { origem: 'contra.abertura', lista: c } : { origem: 'abertura', lista: falas.abertura };
}

/** Round ≥ 2: `decisivo` (se o round é decisivo e a lista existe) > `revanche`. */
export function listaDeRodada(falas: FalasDeProvocacao, decisivo: boolean): ListaEscolhida {
  return decisivo && temItens(falas.decisivo) ? { origem: 'decisivo', lista: falas.decisivo } : { origem: 'revanche', lista: falas.revanche };
}

export type ContextoDaVitoria = { readonly perdedor: IdLutador; readonly perfeita?: boolean | undefined; readonly porTempo?: boolean | undefined };

/** Vitória: `contra[perdedor].vitoria` > `vitoriaPerfeita` > `vitoriaPorTempo` > `vitoria`. */
export function listaDeVitoria(falas: FalasDeProvocacao, c: ContextoDaVitoria): ListaEscolhida {
  const contra = falas.contra?.[c.perdedor]?.vitoria;
  if (temItens(contra)) return { origem: 'contra.vitoria', lista: contra };
  if (c.perfeita && temItens(falas.vitoriaPerfeita)) return { origem: 'vitoriaPerfeita', lista: falas.vitoriaPerfeita };
  if (c.porTempo && temItens(falas.vitoriaPorTempo)) return { origem: 'vitoriaPorTempo', lista: falas.vitoriaPorTempo };
  return { origem: 'vitoria', lista: falas.vitoria };
}

/** Quem fala e o que se sabe do momento. `nomeRival` é o `ch.name` do oponente (a P2 lê do lutador). */
export type PedidoDeFala =
  | { readonly tipo: 'abertura'; readonly falante: IdLutador; readonly rival: IdLutador; readonly nomeRival: string }
  | { readonly tipo: 'rodada'; readonly falante: IdLutador; readonly rival: IdLutador; readonly nomeRival: string; readonly decisivo: boolean }
  | {
      readonly tipo: 'vitoria';
      readonly falante: IdLutador;
      /** O perdedor (o oponente do vencedor). */
      readonly rival: IdLutador;
      readonly nomeRival: string;
      readonly perfeita?: boolean | undefined;
      readonly porTempo?: boolean | undefined;
    };

export type FalaSorteada = {
  /** Texto final, com `{rival}` trocado. É o que o balão mostra. */
  readonly texto: string;
  /** O modelo sorteado (com `{rival}`): é o que a memória guarda e o que os testes comparam. */
  readonly modelo: Fala;
  readonly origem: OrigemDaLista;
};

export type OpcoesDoSorteio = {
  /** Ausente: determinístico (a primeira candidata). Na cena: `Contexto.sorteioDeFalas`. */
  readonly rng?: Pick<Rng, 'inteiro'> | undefined;
  /** Ausente: sem a regra de não repetir. Na cena: uma por sessão da `CenaFight`. */
  readonly memoria?: MemoriaDeFalas | undefined;
  readonly idioma?: IdiomaDeFalas | undefined;
};

/** Sorteia a fala de um pedido: monta a lista pela precedência, escolhe sem repetir a última do falante, troca `{rival}` e lembra. */
export function sortearFala(pedido: PedidoDeFala, op: OpcoesDoSorteio = {}): FalaSorteada {
  const falas = falasDe(pedido.falante, op.idioma ?? IDIOMA_PADRAO);
  let escolhida: ListaEscolhida;
  if (pedido.tipo === 'abertura') escolhida = listaDeAbertura(falas, pedido.rival);
  else if (pedido.tipo === 'rodada') escolhida = listaDeRodada(falas, pedido.decisivo);
  else escolhida = listaDeVitoria(falas, { perdedor: pedido.rival, perfeita: pedido.perfeita, porTempo: pedido.porTempo });
  const modelo = escolherFala(escolhida.lista, op.rng, op.memoria?.ultima(pedido.falante));
  op.memoria?.lembrar(pedido.falante, modelo);
  return { texto: trocarRival(modelo, pedido.nomeRival), modelo, origem: escolhida.origem };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Quem fala no round >= 2 (pura; a P2 só liga ao estado do Game)
// ---------------------------------------------------------------------------------------------------------------------------------

export type EntradaDaRodada = {
  /** Número do round que vai começar (≥ 2). */
  readonly round: number;
  /** Quem venceu o round que acabou de terminar; `null` = empate. */
  readonly vencedorAnterior: IndiceLutador | null;
  /** Vitórias de rounds de cada um (índice 0 = P1) já contando o round anterior. */
  readonly vitorias: readonly [number, number];
  /** Vitórias necessárias para fechar a luta (`Game.winsNeeded`). */
  readonly vitoriasParaVencer: number;
};

/**
 * Round ≥ 2: fala quem PERDEU o round anterior; empate no anterior: P1 nos rounds ímpares, P2 nos pares. Decisivo = os dois a 1 vitória
 * do fim (só faz sentido com 2+ vitórias necessárias).
 */
export function quemFalaNaRodada(e: EntradaDaRodada): { falante: IndiceLutador; decisivo: boolean } {
  const falante: IndiceLutador = e.vencedorAnterior === null ? (e.round % 2 === 1 ? 0 : 1) : e.vencedorAnterior === 0 ? 1 : 0;
  const falta = e.vitoriasParaVencer - 1;
  const decisivo = e.vitoriasParaVencer >= 2 && e.vitorias[0] === falta && e.vitorias[1] === falta;
  return { falante, decisivo };
}

/** Round 1: o P1 (o desafiante) fala primeiro e o P2 (a casa) responde (decisão do dono; spec §3.1). */
export const ORDEM_DA_ABERTURA: readonly [IndiceLutador, IndiceLutador] = [0, 1];
