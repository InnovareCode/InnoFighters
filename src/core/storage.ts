import {
  CHAVE_STORAGE,
  CHAVE_STORAGE_LEGADA,
  CONFIGURACOES_PADRAO,
  type ArmazenamentoV1,
  type Configuracoes,
} from './contratos';

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
