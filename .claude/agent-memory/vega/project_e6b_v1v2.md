---
name: e6b-v1v2-balanceamento-esquiva
description: E6b (balanceamento aplicado, oráculo dos 4 originais em fixture) e V1+V2 (contratos C2/C3, motor da esquiva, eventos da cinemática, CPU da esquiva) — armadilhas
metadata:
  type: project
---

Entregue em 2026-10-21 (sem commit). Contratos em `docs/handoff-vega-e6b.md` e `docs/handoff-vega-v1v2.md`. Só o que não se deriva do código:

- **Oráculo dos 4 originais = `tests/fixtures/dados-prototipo/originais.json`** (hp, pow, mods). `montarTodos()` (padrão) monta com ele + atlas original; `{dadosDeProducao:true}` monta o balanceado. `dados.test` usa `defDoOraculo`. Balancear = editar `src/data/lutadores/*.ts`, nunca a fixture. `dados-balanceados.test.ts` trava o afastamento a hp/pow/`dmg` dos golpes comuns.
- Balanço aplicado só com números (sem tirar armadura do BAATAR): todas as taxas CPU x CPU em 44-57%, chefão 24%/29%. `--ajustes` mede antes de gravar.
- **Campo novo em evento = opcional no tipo, sempre preenchido pelo motor** (a Lyra/Íris fabricam eventos em teste). Dado de apresentação dos especiais fica em `src/data/apresentacao-especiais.ts`, fora de `LutadorDef.especiais` (oráculo compara campo a campo).
- Esquiva: recuo não atravessa projétil (só o avanço); a CPU aperta o avanço a ~170 px por causa do arranque vulnerável de 3 ticks. `Fighter.passing` cobre o avanço inteiro. `emPreparo` (COUP D'ARRÊT) exige `state === 'move'` (esquiva também é "counter" e não tem `golpeAtual`).
- Regra de RNG da CPU: nada de `rnd()` novo com flag desligada ou `esq = 0`; provado contando chamadas em 400 sementes.
- PARADE e GARKUWA disparam a cinemática no SUCESSO (`parry`/`clash.lutador`), `special.momento = 'sucesso'`; `sResp` continua a sessão (`parry.continua`).
- Edição com texto livre: `python - <<EOF` quebra com apóstrofos; gravar `.py` pela ferramenta Write em `relatorios/` (ignorada) e rodar.
- **Fix da QA da esquiva (2026-10-21):** "esquivou" CONSOME o golpe (`Fighter.atkEsquivado`, `ProjetilLuta.esquivou`; nunca reusar `hitDone`, ele desacelera investida); `limparBotoesGuardados()` ao abrir a Dança; desempate de `separate()` com `dx === 0` e esquiva em curso = o esquivador fica do lado de onde saiu (`facing` congelado). Janela exata: recuo invulnerável nos ticks 0-13; avanço vulnerável 0-2 e invulnerável 3-18. Detalhes em `docs/handoff-vega-esquiva-fix.md`.
