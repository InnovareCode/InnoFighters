/*
 * O CHEFÃO DOS E2E, num lugar só: o ZENON ARGYROS, "O Arconte" (a Z5 da Vega o pôs no jogo real: `REGRAS_PADRAO.chefe === 'zenon'`, 10 lutadores,
 * arena `gr`). Os testes que exercitam a mecânica de chefão (HUD de barras, ×2/×1, FASE 2!, cena de fase 2, aviso e VS de chefe, desbloqueio de
 * chefe, casa de honra da grade, entrada dramática, etiquetas do HUD no celular) leem as constantes daqui, nunca um id literal.
 *
 * Histórico: de 2026-10-21 a Z5, o jogo de produção não tinha chefão (`CHEFE = null`) e estes testes abriam um chefe de teste (o BAATAR antigo)
 * por `?chefe=teste`. Esse gancho, `src/ui/dev-chefe-teste.ts` e os testes "PRODUÇÃO (sem chefão)" saíram; o BAATAR antigo continua como fixtura de
 * UNIDADE em `tests/unit/_baatar-chefe.ts` (o motor ainda é testado com ele).
 */
export const CHEFE = {
  /** Id do lutador que faz de chefão no ARCADE. */
  id: 'zenon',
  /** Nome como aparece no HUD. */
  nome: 'ZENON',
  /** Título do def (o HUD mostra "CHEFÃO · O ARCONTE"). */
  titulo: 'O ARCONTE',
  /** Rótulo da linha do placar do P2 (o chefão sempre é o P2 nas lutas do ARCADE). */
  rotulo: '000000  CHEFÃO · O ARCONTE',
  /** Trecho de URL que liga o chefão (vazio: a produção já tem o dele). Sem `&` no começo. */
  query: '',
  /** Fichas da fase 1 e da fase 2 (nomes do `chefe.fichaFase1/2` do def). */
  fase1: 'chefe',
  fase2: 'chefe2',
  /** Poses da cena entre as barras (`Fighter.pose.name` durante a fase `cena-chefe`). */
  poseCena: /^cena[012]$/,
  /** Poses do especial da fase 2 (aliases `sc0/sc1`) e os quadros do atlas a que resolvem: usados para provar a arte própria. */
  quadrosFase2: { sc0: 'decreto0', sc1: 'decreto1' },
  /** O 1º da fila de desbloqueio (o final do ARCADE o libera antes do chefão). */
  fila1: 'aminu',
  /** Cenário do chefão (a luta é sempre na casa dele). */
  cenario: 'gr',
} as const;

/** `?seed=...&manual=1` etc. `extra` é um trecho `a=b&c=d` (pode ser vazio). */
export function urlComChefe(base: string, extra = ''): string {
  const partes = [base, CHEFE.query, extra].filter((p) => p !== '');
  return partes.join('&');
}

/** A grade de seleção de produção: os 9 regulares na ordem do ROSTER e o chefão por último (a CASA DE HONRA, índice 9). */
export const GRADE_DE_PRODUCAO = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar', CHEFE.id] as const;

/** O texto do menu com o chefão. */
export const DESCRICAO_DO_ARCADE = 'Um jogador: enfrente 5 rivais em sequência, depois o chefão, e torne-se o campeão.';

/**
 * Pula a ENTRADA DRAMÁTICA do chefão numa luta recém-aberta (chamar antes do 1º `h.avancar`/update): a entrada não chama o motor, mas leva 156 ticks
 * (2,6 s) com o HUD escondido, então os e2e que medem o HUD ou contam ticks da luta de chefão a desligam por este hook.
 */
export const PULAR_ENTRADA = '(h) => { const s = h.ui.scene; if (s && s.entrada) { s.entradaPendente = false; s.entrada.zerar(); } }';
