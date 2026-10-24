/*
 * Decisões que dependem do aparelho (puras, para os testes): versão estática ou completa, quantos updates de pré-rolagem cabem num quadro, e quem toca a música.
 */

/** O que a Network Information API expõe (Chromium; o Safari/WebKit não tem, e então vale a versão completa). */
export interface ConexaoLike {
  readonly saveData?: boolean;
  readonly effectiveType?: string;
}

/** Economia de dados ligada, ou rede 2g/3g: o trailer vira a versão estática, que só usa a arte residente (D-T7, R7). */
export function economiaDeDados(conexao: ConexaoLike | undefined | null): boolean {
  if (!conexao) return false;
  if (conexao.saveData === true) return true;
  const t = conexao.effectiveType;
  return t === 'slow-2g' || t === '2g' || t === '3g';
}

/**
 * Abaixo desta vazão medida no boot (bytes/s, `platform/vazao.ts`) o trailer completo não se sustenta: cada plano de luta pede ~2,3 MiB de atlas com 2 compassos (3,2 s) de
 * antecedência, ou seja ~0,72 MiB/s de rede nominal (~6 Mbps). A medida do boot fica abaixo da nominal (ver vazao.ts); calibrada no build com CDP, 3 rodadas iguais:
 * 9 Mbps = 551 000 B/s (completo), 4 Mbps = 315 000 B/s e Fast 3G = 120 000 B/s (estáticos). 420 000 B/s fica no meio (~25% de folga para cada lado). Se a medida errar para
 * cima o completo pode perder um plano: a cena então cai para o estático no 2º cartão de reserva (`LIMITE_DE_RESERVAS`).
 */
export const LIMIAR_DE_VAZAO_BYTES_POR_S = 420_000;

/** Quantos planos viram cartão de reserva antes de a cena desistir do completo e seguir pelo estático (o 1º cartão é tolerado, o 2º não: reserva em série é pior que o estático). */
export const LIMITE_DE_RESERVAS = 2;

export type MotivoDoEstatico = 'movimento' | 'economia' | 'vazao';

/**
 * Trailer ESTÁTICO ou COMPLETO. Estático quando: o jogador pediu menos movimento; a Network Information API existe e diz economia de dados ou 2g/3g; OU (o caso do iPhone, que
 * não tem a API) a vazão medida no boot ficou abaixo do limiar. Vazão desconhecida (null: 2ª visita pelo cache, nada medível) nunca é "lenta". Devolve o motivo (a arte que o
 * estático pede depende dele: por movimento reduzido a rede é boa e vale a vitrine; nos outros só cenários e retratos, que cabem numa rede lenta).
 */
export function decidirTrailerEstatico(e: { reduzirMovimento: boolean; conexao: ConexaoLike | undefined | null; vazao: number | null }): { estatico: boolean; motivo: MotivoDoEstatico | null } {
  if (e.reduzirMovimento) return { estatico: true, motivo: 'movimento' };
  if (economiaDeDados(e.conexao)) return { estatico: true, motivo: 'economia' };
  if (e.vazao !== null && Number.isFinite(e.vazao) && e.vazao < LIMIAR_DE_VAZAO_BYTES_POR_S) return { estatico: true, motivo: 'vazao' };
  return { estatico: false, motivo: null };
}

/** A conexão do navegador, se houver. */
export function conexaoDoNavegador(): ConexaoLike | null {
  if (typeof navigator === 'undefined') return null;
  return (navigator as Navigator & { connection?: ConexaoLike }).connection ?? null;
}

/** Orçamento de CPU da pré-rolagem por quadro (ms) e o mínimo de ticks de motor por quadro (spec §4.4). */
export const ORCAMENTO_PREROLAGEM_MS = 2;
export const MINIMO_DE_TICKS_POR_QUADRO = 8;

/**
 * Pré-rola o que o diretor pedir dentro do orçamento: no mínimo `MINIMO_DE_TICKS_POR_QUADRO` ticks do motor, e mais enquanto o relógio (`agora`) disser que sobrou
 * tempo. `prerolar(n)` devolve quantos ticks andou (menos que `n` = não há mais nada a rolar). Só a QUANTIDADE por quadro depende do relógio, nunca o resultado.
 */
export function prerolarNoOrcamento(prerolar: (maxTicks: number) => number, agora: () => number, orcamentoMs = ORCAMENTO_PREROLAGEM_MS): number {
  const inicio = agora();
  let total = 0;
  for (;;) {
    const feitos = prerolar(MINIMO_DE_TICKS_POR_QUADRO);
    total += feitos;
    if (feitos < MINIMO_DE_TICKS_POR_QUADRO) return total;
    if (agora() - inicio >= orcamentoMs) return total;
  }
}
