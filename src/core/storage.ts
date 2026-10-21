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

/**
 * Aceita so campos conhecidos com o tipo certo; o resto cai no padrao. Dado salvo
 * nunca e confiavel (localStorage e editavel). Valores validos passam intactos —
 * o protótipo fazia Object.assign cego.
 */
export function sanearConfiguracoes(bruto: unknown): Configuracoes {
  const r: Configuracoes = { ...CONFIGURACOES_PADRAO };
  if (!ehObjeto(bruto)) return r;
  const lim01 = (v: number): number => Math.max(0, Math.min(1, v));
  if (ehNumero(bruto['music'])) r.music = lim01(bruto['music']);
  if (ehNumero(bruto['sfx'])) r.sfx = lim01(bruto['sfx']);
  if (ehNumero(bruto['rounds'])) r.rounds = bruto['rounds'];
  if (ehNumero(bruto['time'])) r.time = bruto['time'];
  if (ehNumero(bruto['diff'])) r.diff = bruto['diff'];
  if (typeof bruto['shake'] === 'boolean') r.shake = bruto['shake'];
  const ctl = bruto['controles'];
  if (ehObjeto(ctl)) {
    const limpo: Record<string, string> = {};
    for (const [k, v] of Object.entries(ctl)) if (typeof v === 'string') limpo[k] = v;
    r.controles = limpo;
  }
  return r;
}

function sanearHi(v: unknown): number {
  return ehNumero(v) && v > 0 ? v : 0;
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

/** Le `inno-fighters-v2`; undefined se ausente, corrompida ou de outra versao. */
function lerV2(armazenamento: ArmazenamentoLike, regras: Pick<Regras, 'roster' | 'iniciais'>): DadosSalvosV2 | undefined {
  const o = lerJson(armazenamento, CHAVE_STORAGE_V2);
  if (!ehObjeto(o) || o['v'] !== 2) return undefined;
  return { s: sanearConfiguracoes(o['s']), hi: sanearHi(o['hi']), prog: sanearProgresso(o['prog'], regras) };
}

/**
 * Grava `inno-fighters-v2`. Devolve false se o storage falhou (cota, modo privado) — e nesse caso nada foi
 * apagado por aqui. O progresso e saneado antes de gravar, para o disco nunca guardar lixo.
 */
export function salvarDadosV2(
  armazenamento: ArmazenamentoLike,
  dados: DadosSalvosV2,
  regras: Pick<Regras, 'roster' | 'iniciais'> = REGRAS_PADRAO,
): boolean {
  const corpo: ArmazenamentoV2 = { v: 2, s: dados.s, hi: dados.hi, prog: sanearProgresso(dados.prog, regras) };
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
 * Uma v2 corrompida cai no passo 2/3 em vez de ir direto aos padroes (nao perde o recorde). A legada so e
 * apagada DEPOIS que a v2 foi gravada com sucesso. Idempotente: carregar duas vezes da o mesmo resultado.
 */
export function carregarDadosV2(
  armazenamento: ArmazenamentoLike,
  regras: Pick<Regras, 'roster' | 'iniciais'> = REGRAS_PADRAO,
): DadosSalvosV2 {
  const atual = lerV2(armazenamento, regras);
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
