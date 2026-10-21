import {
  CHAVE_STORAGE,
  CHAVE_STORAGE_LEGADA,
  CHAVE_STORAGE_V2,
  CONFIGURACOES_PADRAO,
  type ArmazenamentoV1,
  type Configuracoes,
} from './contratos';
import { progressoVazio, sanearProgresso } from '../meta/progresso';
import { REGRAS_PADRAO } from '../meta/regras';
import type { ArmazenamentoV2, Progresso, Regras } from '../meta/tipos';

/** Subconjunto de Storage que usamos; permite testar em Node com um Map. */
export interface ArmazenamentoLike {
  getItem(chave: string): string | null;
  setItem(chave: string, valor: string): void;
  removeItem(chave: string): void;
}

export type DadosSalvos = { s: Configuracoes; hi: number };

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Valores que a tela de Opcoes oferece (src/ui/cenas/options.ts). Fora disso, vale o padrao. */
const ROUNDS_VALIDOS: readonly number[] = [1, 2, 3];
const TEMPO_VALIDO: readonly number[] = [0, 30, 60, 99];
const DIFF_VALIDA: readonly number[] = [0, 1, 2];
/** `controles` e campo reservado (sem UI hoje): teto de entradas e de tamanho de chave/valor. */
export const MAX_CONTROLES = 32;
export const MAX_TAMANHO_CONTROLE = 32;
/** Teto do recorde: acima disso nao e pontuacao jogavel, e dado adulterado (e contaminaria o max(v1,v2)). */
export const TETO_RECORDE = 99_999_999;

/** Numero inteiro que esteja na lista; qualquer outra coisa (1e9, 2.5, -1, NaN, string) -> undefined. */
function dentroDe(v: unknown, validos: readonly number[]): number | undefined {
  return ehNumero(v) && Number.isInteger(v) && validos.includes(v) ? v : undefined;
}

/**
 * Aceita so campos conhecidos com o tipo certo; o resto cai no padrao. Dado salvo
 * nunca e confiavel (localStorage e editavel). Valores validos passam intactos —
 * o protótipo fazia Object.assign cego. `rounds`/`time`/`diff` so aceitam o que a UI oferece
 * (um `rounds` gigante travava o HUD, que desenha um marcador por round).
 */
export function sanearConfiguracoes(bruto: unknown): Configuracoes {
  const r: Configuracoes = { ...CONFIGURACOES_PADRAO };
  if (!ehObjeto(bruto)) return r;
  const lim01 = (v: number): number => Math.max(0, Math.min(1, v));
  if (ehNumero(bruto['music'])) r.music = lim01(bruto['music']);
  if (ehNumero(bruto['sfx'])) r.sfx = lim01(bruto['sfx']);
  r.rounds = dentroDe(bruto['rounds'], ROUNDS_VALIDOS) ?? r.rounds;
  r.time = dentroDe(bruto['time'], TEMPO_VALIDO) ?? r.time;
  r.diff = dentroDe(bruto['diff'], DIFF_VALIDA) ?? r.diff;
  if (typeof bruto['shake'] === 'boolean') r.shake = bruto['shake'];
  const ctl = bruto['controles'];
  if (ehObjeto(ctl)) {
    const limpo: Record<string, string> = {};
    let n = 0;
    for (const [k, v] of Object.entries(ctl)) {
      if (n >= MAX_CONTROLES) break;
      if (k === '__proto__' || k.length > MAX_TAMANHO_CONTROLE) continue;
      if (typeof v !== 'string' || v.length > MAX_TAMANHO_CONTROLE) continue;
      limpo[k] = v;
      n++;
    }
    r.controles = limpo;
  }
  return r;
}

/** Recorde: inteiro >= 0 e <= TETO_RECORDE. Fracionario perde a fracao; acima do teto (1e308...) e adulterado -> 0. */
export function sanearHi(v: unknown): number {
  if (!ehNumero(v) || v <= 0) return 0;
  const inteiro = Math.floor(v);
  return inteiro <= TETO_RECORDE ? inteiro : 0;
}

function lerJson(armazenamento: ArmazenamentoLike, chave: string): unknown {
  try {
    const txt = armazenamento.getItem(chave);
    return txt === null ? undefined : (JSON.parse(txt) as unknown);
  } catch {
    return undefined; // JSON corrompido ou storage indisponivel
  }
}

/** Le `inno-fighters-v1` (formato {v:1, s, hi}); undefined se ausente/invalido. */
function lerV1(armazenamento: ArmazenamentoLike): DadosSalvos | undefined {
  const o = lerJson(armazenamento, CHAVE_STORAGE);
  if (!ehObjeto(o) || o['v'] !== 1) return undefined;
  return { s: sanearConfiguracoes(o['s']), hi: sanearHi(o['hi']) };
}

/** Le `sakura-fighters-v4` (formato do protótipo, sem `v`: {s, hi}); undefined se ausente/invalido. */
function lerLegado(armazenamento: ArmazenamentoLike): DadosSalvos | undefined {
  const o = lerJson(armazenamento, CHAVE_STORAGE_LEGADA);
  if (!ehObjeto(o)) return undefined;
  return { s: sanearConfiguracoes(o['s']), hi: sanearHi(o['hi']) };
}

/** Grava no formato C4. Devolve false se o storage falhou (cota, modo privado). */
export function salvarDados(armazenamento: ArmazenamentoLike, dados: DadosSalvos): boolean {
  const corpo: ArmazenamentoV1 = { v: 1, s: dados.s, hi: dados.hi };
  try {
    armazenamento.setItem(CHAVE_STORAGE, JSON.stringify(corpo));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega configuracoes e recorde, migrando uma vez da chave antiga:
 *  1. existe `inno-fighters-v1` valida -> usa; se a antiga ainda existe, apaga (obsoleta).
 *  2. senao, existe `sakura-fighters-v4` -> migra s/hi para a chave nova e APAGA a antiga
 *     (so apaga se a gravacao nova deu certo, para nunca perder o recorde).
 *  3. senao -> padroes.
 */
export function carregarDados(armazenamento: ArmazenamentoLike): DadosSalvos {
  const atual = lerV1(armazenamento);
  if (atual) {
    removerLegado(armazenamento);
    return atual;
  }
  const legado = lerLegado(armazenamento);
  if (legado) {
    if (salvarDados(armazenamento, legado)) removerLegado(armazenamento);
    return legado;
  }
  return { s: { ...CONFIGURACOES_PADRAO }, hi: 0 };
}

function removerLegado(armazenamento: ArmazenamentoLike): void {
  try {
    armazenamento.removeItem(CHAVE_STORAGE_LEGADA);
  } catch {
    /* sem armazenamento: ignora */
  }
}

// ---------------------------------------------------------------------------
// C4 v2 (expansao, E2): chave `inno-fighters-v2` com progresso de desbloqueio.
// Convive com as funcoes acima (v1) ate a E4 trocar a UI. Nota de camada: `meta/` e codigo puro que
// so importa `core/contratos` e `core/rng`; importar `meta/progresso` aqui nao cria ciclo.
// ---------------------------------------------------------------------------

export type DadosSalvosV2 = { s: Configuracoes; hi: number; prog: Progresso };

function padroesV2(): DadosSalvosV2 {
  return { s: { ...CONFIGURACOES_PADRAO }, hi: 0, prog: progressoVazio() };
}

/** Copia da v2 ilegivel, guardada antes de ela ser substituida (para o dono/suporte recuperar a mao). */
export const CHAVE_STORAGE_V2_QUEBRADA = 'inno-fighters-v2-quebrada';

/**
 * Estado da chave `inno-fighters-v2` no disco:
 *  - `ausente`: nao existe (ou o storage esta indisponivel);
 *  - `ok`: formato {v:2,...} que este build entende;
 *  - `futura`: `v` numerico > 2, gravada por um build MAIS NOVO — nao entendemos e nao podemos sobrescrever;
 *  - `corrompida`: JSON invalido ou forma que nao e v2 (null, [], v ausente/1/texto...) — `texto` e o cru.
 */
type EstadoV2 =
  | { estado: 'ausente' }
  | { estado: 'ok'; objeto: Record<string, unknown> }
  | { estado: 'futura' }
  | { estado: 'corrompida'; texto: string };

function inspecionarV2(armazenamento: ArmazenamentoLike): EstadoV2 {
  let texto: string | null;
  try {
    texto = armazenamento.getItem(CHAVE_STORAGE_V2);
  } catch {
    return { estado: 'ausente' }; // storage indisponivel
  }
  if (texto === null) return { estado: 'ausente' };
  let o: unknown;
  try {
    o = JSON.parse(texto);
  } catch {
    return { estado: 'corrompida', texto };
  }
  if (!ehObjeto(o)) return { estado: 'corrompida', texto };
  const versao = o['v'];
  if (versao === 2) return { estado: 'ok', objeto: o };
  if (ehNumero(versao) && versao > 2) return { estado: 'futura' };
  return { estado: 'corrompida', texto };
}

/**
 * Guarda o cru da v2 corrompida em `inno-fighters-v2-quebrada` antes de a v2 ser substituida. Best-effort
 * (cota cheia nao pode derrubar o carregamento) e NAO sobrescreve uma copia que ja exista: a primeira
 * evidencia vale tanto quanto qualquer outra e o disco nao cresce a cada carga.
 */
function guardarCopiaQuebrada(armazenamento: ArmazenamentoLike, texto: string): void {
  try {
    if (armazenamento.getItem(CHAVE_STORAGE_V2_QUEBRADA) === null) armazenamento.setItem(CHAVE_STORAGE_V2_QUEBRADA, texto);
  } catch {
    /* sem espaco/armazenamento: segue sem a copia */
  }
}

/**
 * Grava `inno-fighters-v2`. Devolve false se NAO gravou: storage falhou (cota, modo privado) ou a v2 em disco e
 * de um build mais novo (`v > 2`) — nesse caso nada e escrito por cima. Nada e apagado por aqui. `s`, `hi` e o
 * progresso sao saneados antes de gravar, para o disco nunca guardar lixo. Se a v2 em disco estiver corrompida,
 * o cru vai para `inno-fighters-v2-quebrada` antes de ser substituido.
 */
export function salvarDadosV2(
  armazenamento: ArmazenamentoLike,
  dados: DadosSalvosV2,
  regras: Pick<Regras, 'roster' | 'iniciais'> = REGRAS_PADRAO,
): boolean {
  const atual = inspecionarV2(armazenamento);
  if (atual.estado === 'futura') return false;
  if (atual.estado === 'corrompida') guardarCopiaQuebrada(armazenamento, atual.texto);
  const corpo: ArmazenamentoV2 = {
    v: 2,
    s: sanearConfiguracoes(dados.s),
    hi: sanearHi(dados.hi),
    prog: sanearProgresso(dados.prog, regras),
  };
  try {
    armazenamento.setItem(CHAVE_STORAGE_V2, JSON.stringify(corpo));
    return true;
  } catch {
    return false;
  }
}

/**
 * Carrega config, recorde e progresso (plano 3.3):
 *  1. `inno-fighters-v2` valida -> usa (com `hi = max(v2.hi, v1.hi)`); apaga `sakura-fighters-v4` se ainda existir.
 *     A v1 FICA (uma release).
 *  2. senao `inno-fighters-v1` valida -> {s, hi} + progresso vazio, grava a v2 (nao apaga a v1).
 *  3. senao `sakura-fighters-v4` -> migra s/hi, grava a v2.
 *  4. senao -> padroes (nao grava).
 * Uma v2 corrompida cai no passo 2/3 em vez de ir direto aos padroes (nao perde o recorde), e o cru dela vai
 * para `inno-fighters-v2-quebrada` antes de ser substituido. Uma v2 `v > 2` (build mais novo) tambem cai no
 * passo 2/3/4, mas em memoria: nunca e sobrescrita (ver salvarDadosV2). A legada so e
 * apagada DEPOIS que a v2 foi gravada com sucesso. Idempotente: carregar duas vezes da o mesmo resultado.
 */
export function carregarDadosV2(
  armazenamento: ArmazenamentoLike,
  regras: Pick<Regras, 'roster' | 'iniciais'> = REGRAS_PADRAO,
): DadosSalvosV2 {
  const estado = inspecionarV2(armazenamento);
  // `futura` (v > 2, build mais novo) cai na cadeia abaixo como se nao houvesse v2 — joga-se em memoria com a
  // v1/legada/padroes — mas NADA e escrito por cima: salvarDadosV2 recusa (false), entao a v2 fica intacta e a
  // legada nao e apagada (so apaga apos gravar a v2).
  if (estado.estado === 'corrompida') guardarCopiaQuebrada(armazenamento, estado.texto);
  const atual: DadosSalvosV2 | undefined =
    estado.estado === 'ok'
      ? {
          s: sanearConfiguracoes(estado.objeto['s']),
          hi: sanearHi(estado.objeto['hi']),
          prog: sanearProgresso(estado.objeto['prog'], regras),
        }
      : undefined;
  if (atual) {
    removerLegado(armazenamento);
    // Rollback para o build v1 e reavanco: o recorde batido la so existe na v1. Vale o maior; regrava a v2
    // (best-effort, sem apagar nada) para o disco concordar com o retorno. Nunca toca a v1.
    const recordeV1 = lerV1(armazenamento)?.hi ?? 0;
    if (recordeV1 > atual.hi) {
      const mesclado: DadosSalvosV2 = { ...atual, hi: recordeV1 };
      salvarDadosV2(armazenamento, mesclado, regras);
      return mesclado;
    }
    return atual;
  }
  const base = lerV1(armazenamento) ?? lerLegado(armazenamento);
  if (base) {
    const migrado: DadosSalvosV2 = { s: base.s, hi: base.hi, prog: progressoVazio() };
    if (salvarDadosV2(armazenamento, migrado, regras)) removerLegado(armazenamento);
    return migrado;
  }
  return padroesV2();
}
