# Dados ORIGINAIS dos 4 lutadores do protótipo (oráculo de fidelidade)

`originais.json` guarda `hp`, `pow` e `mods` de HAYATO, WEI LONG, MIN-JI e CAIO **como estão no protótipo** (`prototipo/`).
Na E6b os valores de produção (`src/data/lutadores/*.ts`) foram afastados do protótipo para equilibrar o jogo; este arquivo
mantém o oráculo: `tests/unit/_lutadores.ts` (`montarTodos`, `defsDoOraculo`) monta os 4 com estes números, e é com eles que
`dados.test`, `luta-fidelidade` e o snapshot CPU x CPU (semente 42) comparam o motor com o protótipo.

Não edite para "acompanhar" o balanceamento: se um destes números mudar, o motor deixou de ser fiel ao protótipo e o teste
certo reprova. O balanceamento muda `src/data/lutadores/*.ts`; `dados-balanceados.test.ts` garante que a produção só se afasta
daqui nos campos permitidos.
