import type { IdLutador } from '../core/contratos';
import { TEMAS } from '../data/musica';
import type { IdTema, TemaDef } from '../data/musica/tipos';
import type { TrilhaMusica } from './audio-sys';
import { compilarTema, orcamentoDoTema, type TemaCompilado } from './partitura';

export { compilarTema, duracaoDoPasso, orcamentoDoTema, partituraDaTroca, partituraDoPasso, varianteDoLaco, type Fase, type TemaCompilado } from './partitura';

/*
 * Temas musicais por lutador (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §3). Este módulo liga os DADOS (src/data/musica) ao AudioSys
 * (`playTema`) e escolhe a trilha de uma luta (`trilhaDaLuta`, pura). As 3 trilhas de hoje (`fight`, `menu`, `chefe`) NÃO mudam.
 */

/**
 * Chave de rollback e de escuta do dono. Enquanto `false` o jogo toca exatamente a música de hoje: `trilhaDaLuta` devolve `'fight'` (ou `'chefe'`
 * no chefão que tem `trilha`). Só vira `true` depois da escuta do dono dos 10 temas (T3/Q).
 */
export const TEMAS_POR_LUTADOR = false;

/** O tema do lutador, ou null no ZENON (a valsa de hoje é a trilha `'chefe'`). */
export function temaDoLutador(id: IdLutador): TemaDef | null {
  const t = TEMAS[id];
  return t === 'chefe' ? null : t;
}

/** O tema compilado de uma trilha `tema:<id>`; null nas outras trilhas. */
export function temaDaTrilha(trilha: TrilhaMusica): TemaCompilado | null {
  if (!trilha.startsWith('tema:')) return null;
  const def = temaDoLutador(trilha.slice(5) as IdLutador);
  return def ? compilarTema(def) : null;
}

/** O que `trilhaDaLuta` precisa da luta: o rival (`c2`, a casa do VERSUS) e se é luta de chefe. */
export interface LutaParaMusica {
  readonly c2: IdLutador;
  readonly chefe?: boolean | undefined;
}

/**
 * Trilha de uma luta (spec §3.3). Pura. Com `chave` desligada ou `regras.temasMusicais` desligada (`?expansao=4`) devolve a música de hoje:
 * `'chefe'` no chefão que tem `trilha` (`trilhaDoChefe`), `'fight'` no resto. Ligada: o tema do `c2` em todos os modos (ARCADE rival e chefão,
 * LUTA vs CPU, VERSUS, TREINO, demo); o ZENON, que não tem TemaDef, toca a valsa (`'chefe'`), sempre na fase 1 se não for chefão.
 */
export function trilhaDaLuta(cfg: LutaParaMusica, regras: { readonly temasMusicais: boolean }, chave: boolean = TEMAS_POR_LUTADOR, trilhaDoChefe?: 'chefe'): TrilhaMusica {
  if (!chave || !regras.temasMusicais) return cfg.chefe ? (trilhaDoChefe ?? 'fight') : 'fight';
  return temaDoLutador(cfg.c2) ? (`tema:${cfg.c2 as IdTema}` as TrilhaMusica) : 'chefe';
}

// --- orçamento de CPU, relativo ao da trilha `fight` (spec §3.5) ---

/**
 * Fontes novas por passo: o máximo da `fight` de hoje (medido por tests/unit/musica-orcamento.test.ts: passo 0 = bumbo, chimbal, baixo, 2 do lead e 3
 * do acorde = 8). Fontes ativas: 1,25 x o pico de fontes ativas da `fight` (medido: 12 -> 15). O teste refaz a medida e falha se estas constantes
 * deixarem de ser a conta certa.
 */
export const FONTES_NOVAS_POR_PASSO_MAX = 8;
export const FONTES_ATIVAS_MAX = 15;
/** `vozFormante`: nota longa (>= 4 passos) e no máximo 1 por compasso. */
export const VOZ_POR_COMPASSO_MAX = 1;
export const VOZ_PASSOS_MINIMOS = 4;

/** Confere o orçamento de fontes de todos os temas. Lança com a lista de erros. Roda no carregamento, junto da validação dos dados. */
export function validarOrcamentoDosTemas(): void {
  const erros: string[] = [];
  for (const [id, t] of Object.entries(TEMAS)) {
    if (t === 'chefe') continue;
    const o = orcamentoDoTema(compilarTema(t));
    if (o.porPasso > FONTES_NOVAS_POR_PASSO_MAX) erros.push(`${id}: ${o.porPasso} fontes novas num passo (máx. ${FONTES_NOVAS_POR_PASSO_MAX})`);
    if (o.ativas > FONTES_ATIVAS_MAX) erros.push(`${id}: ${o.ativas} fontes ativas (máx. ${FONTES_ATIVAS_MAX})`);
    if (o.vozesPorCompasso > VOZ_POR_COMPASSO_MAX) erros.push(`${id}: ${o.vozesPorCompasso} vozes por compasso (máx. ${VOZ_POR_COMPASSO_MAX})`);
    if (o.vozesPorCompasso > 0 && o.vozMaisCurta < VOZ_PASSOS_MINIMOS) erros.push(`${id}: voz de ${o.vozMaisCurta.toFixed(1)} passos (mín. ${VOZ_PASSOS_MINIMOS})`);
  }
  if (erros.length) throw new Error(`orçamento dos temas estourado:\n  ${erros.join('\n  ')}`);
}

validarOrcamentoDosTemas();
