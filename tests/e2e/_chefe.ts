/*
 * O CHEFÃO DOS E2E, num lugar só. Os testes que exercitam a mecânica de chefão (HUD de barras, ×2/×1, FASE 2!, Dança, aviso e
 * VS de chefe, desbloqueio de chefe, casa central da grade, etiquetas do HUD no celular) NÃO usam o jogo de produção (que hoje
 * não tem chefão: `REGRAS_PADRAO.chefe === null`); abrem o jogo com `CHEFE.query`, que põe o chefe de teste (o BAATAR antigo,
 * `src/ui/dev-chefe-teste.ts`, só em desenvolvimento) no fim do ARCADE.
 *
 * QUANDO O ZENON ENTRAR (REGRAS_PADRAO.chefe = 'zenon'): troque SÓ as constantes abaixo. `query` passa a ser '' (a produção já
 * tem chefão), `id`/`nome` apontam para ele e `fase1`/`fase2`/`poseDanca` seguem a ficha e as poses do def dele. Depois apague
 * `src/ui/dev-chefe-teste.ts`, o gancho `?chefe=teste` do `main.ts` e os testes de produção "sem chefão" (`SEM_CHEFE`).
 */
export const CHEFE = {
  /** Id do lutador que faz de chefão no ARCADE. */
  id: 'baatar',
  /** Nome como aparece no HUD. */
  nome: 'BAATAR',
  /** Trecho de URL que liga o chefão (vazio quando a produção tiver o dela). Sem `&` no começo. */
  query: 'chefe=teste',
  /** Fichas da fase 1 e da fase 2 (nomes do `chefe.fichaFase1/2` do def). */
  fase1: 'chefe',
  fase2: 'chefe2',
  /** Poses da Dança entre as barras (`Fighter.pose.name` durante a fase `cena-chefe`). */
  poseDanca: /^devekh[012]$/,
  /** Poses do especial da fase 2 (aliases `sc0/sc1`) e os quadros do atlas a que resolvem: usados para provar a arte própria. */
  quadrosFase2: { sc0: 'dive0', sc1: 'dive1' },
  /** O 1º da fila de desbloqueio (o final do ARCADE o libera antes do chefão). */
  fila1: 'aminu',
} as const;

/** `?seed=...&manual=1` etc. com o chefão ligado. `extra` é um trecho `a=b&c=d` (pode ser vazio). */
export function urlComChefe(base: string, extra = ''): string {
  const partes = [base, CHEFE.query, extra].filter((p) => p !== '');
  return partes.join('&');
}

/**
 * O ARCADE de PRODUÇÃO de hoje: 5 etapas, sem chefão. Os testes "sem chefão" afirmam isto; quando o Zenon entrar, viram 6 etapas
 * e este bloco sai com eles.
 */
export const SEM_CHEFE = {
  etapas: 5,
  descricao: 'Um jogador: enfrente os 5 rivais em sequência e torne-se o campeão.',
} as const;
