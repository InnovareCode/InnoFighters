# Handoff Cronos C1: regras e preferência da esquiva/cinemática

Spec: `docs/spec-esquiva-e-cinematica-especial.md` (C4, B14, B15, DD1-DD5). Sem UI, sem commit.

## RESULTADO

- `Regras.esquiva` e `Regras.cinematica` (`readonly boolean`, obrigatórios) em `src/meta/tipos.ts`.
  - `REGRAS_PADRAO` (`src/meta/regras.ts`): `true` / `true`.
  - `regrasExpansao()` (`?expansao=1`, `src/ui/dev-expansao.ts`): `true` / `true` (herda de `REGRAS_PADRAO`).
  - `regrasDeQuatro()` (`?expansao=4`, fidelidade dos 4 originais): `false` / `false`.
- `Configuracoes.cinematica?: PreferenciaCinematica` em `src/core/contratos.ts`, com `CINEMATICAS_VALIDAS`
  (`['completa','curta','desligada']`), `PreferenciaCinematica` e `CINEMATICA_PADRAO = 'completa'`.
- `sanearConfiguracoes` (`src/core/storage.ts`) aceita só esses 3 strings exatos (sem trim, sem caixa); qualquer outra
  coisa vira **ausente**. Vale para v1, v2 e legada (todas passam por ele) e para `salvarDadosV2` (sanea na gravação).
  `salvarDados` (v1) não sanea na gravação, como antes; a leitura sanea.
- `tests/unit/progresso.test.ts`: o literal `REGRAS` ganhou `esquiva/cinematica` (o tipo passou a exigir).
- Teste novo: `tests/unit/c1-regras-cinematica.test.ts` (21 testes).

### Decisão de modelagem: padrão = campo AUSENTE, não gravado

O dono decidiu que o padrão é `'completa'`. Mas o B15 da spec diz que, sem preferência salva e com
`prefers-reduced-motion: reduce`, o padrão vira `'curta'`. Se `CONFIGURACOES_PADRAO` ou o saneamento injetassem
`'completa'`, a UI não saberia distinguir "jogador escolheu completa" de "nunca escolheu", e o B15 morreria. Por isso:
`CONFIGURACOES_PADRAO` e o saneamento NÃO têm o campo; ausente fica ausente; **quem resolve é a UI** com
`CINEMATICA_PADRAO`. Efeito prático: inválido volta ao padrão (= ausente = `'completa'` na UI), como pedido.

### Verificação (nível de prova)

- `npx vitest run tests/unit/c1-regras-cinematica.test.ts`: 21/21 verdes.
- `npm test` completo: 41 arquivos, 914 testes verdes (no momento da execução; Vega/Lyra editam em paralelo).
- `npx tsc --noEmit`: limpo (no momento da execução).
- Mutação (script manual, cada mutante aplicado, teste rodado, arquivo restaurado): 9/9 mortos. Mutantes: aceitar
  qualquer string; perder `'desligada'` da lista; `salvarDadosV2` sem sanear; saneamento injetando `'completa'`;
  `regrasDeQuatro` com esquiva `true`; idem cinemática; `REGRAS_PADRAO` com esquiva `false`; idem cinemática; merge
  de recorde (rollback) perdendo `s`.
- Não verificado: nenhum navegador/e2e (fora do escopo, sem UI). Eslint não roda (o projeto não tem `eslint.config.*`).

## PARA O PRÓXIMO

Nomes exatos:

| O quê | Onde | Valor |
|---|---|---|
| `regras.esquiva: boolean` | `Regras` (`src/meta`, exportado de `../meta`) | padrão `true`; `?expansao=4` `false` |
| `regras.cinematica: boolean` | idem | padrão `true`; `?expansao=4` `false` |
| `Configuracoes.cinematica?` | `src/core/contratos.ts` | `'completa' \| 'curta' \| 'desligada'` ou ausente |
| `PreferenciaCinematica` | `src/core/contratos.ts` | tipo da união acima |
| `CINEMATICAS_VALIDAS` | `src/core/contratos.ts` | `readonly ['completa','curta','desligada']` (ordem para a linha de opções) |
| `CINEMATICA_PADRAO` | `src/core/contratos.ts` | `'completa'` |

**Lyra (E7a / L1, L2):**
- Montar o `ConfigPartida` com `esquiva: regras.esquiva` em todos os pontos (`cfgDaEtapa`, seleção, treino).
- Resolver o modo da cinemática (`modoDaCinematica`): `!regras.cinematica` -> nenhuma; senão
  `S.cinematica ?? (reducedMotion ? 'curta' : CINEMATICA_PADRAO)`; `'desligada'` -> nenhuma.
- Linha de opções "CINEMÁTICA DO ESPECIAL": mostrar o valor resolvido quando `S.cinematica` está ausente. Ao
  escolher, grave o valor (passa a ser preferência explícita).
- **Armadilha em `src/ui/cenas/options.ts:70`**: o "restaurar padrões" faz `Object.assign(S, CONFIGURACOES_PADRAO)`.
  Como o padrão não tem `cinematica`, uma preferência já salva SOBREVIVE ao reset. Faça `delete S.cinematica` junto.
- Outros pontos que montam `Configuracoes`/`Regras` à mão (literais) precisam dos novos campos de `Regras`; os de
  `Configuracoes` são opcionais, não exigem nada.

**Vega (E6a):** `Regras` não chega ao motor; use só `ConfigPartida.esquiva` (a UI liga a partir de `regras.esquiva`).
Quem fabrica `Regras` em testes precisa dos dois campos (tipo exige).

## PENDÊNCIAS

- Nenhuma de regra de negócio. Confirmar com o dono só se ele preferir que o "restaurar padrões" também volte a
  cinemática ao padrão (assumido: sim, via `delete S.cinematica`).

## APRENDIZADO

- Campo novo de preferência com padrão que depende do contexto (reduced-motion): manter AUSENTE no storage e no
  `CONFIGURACOES_PADRAO`, e resolver na UI; injetar o padrão no saneamento apaga a distinção "escolheu x nunca escolheu".
- Efeito colateral de qualquer campo opcional fora de `CONFIGURACOES_PADRAO`: `Object.assign(S, CONFIGURACOES_PADRAO)`
  não o limpa (já vale para `controles`).
- Campo novo em `Regras` (tipo obrigatório) quebra literais de `Regras` em testes (`progresso.test.ts`) e em
  `dev-expansao.ts`; o `tsc` aponta, mas as fixtures de `?expansao=` só são checadas por tipo, não por teste: o teste
  novo cobre os valores das três.
