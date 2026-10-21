# Balanço: qual rodada é qual

Os arquivos são GERADOS por `npm run balanco` (não edite à mão). Duas rodadas `--completo` (100 sementes, NORMAL e DIFÍCIL, 19 800 lutas) estão versionadas:

| Pasta | Configuração | Comando | Para que serve |
|---|---|---|---|
| `docs/balanco/` | **COM esquiva** (`Regras.esquiva` ligada) = **o jogo de produção** | `npm run balanco -- --completo --esquiva` | a referência oficial: metas de balanço valem aqui |
| `docs/balanco/sem-esquiva/` | SEM esquiva (a CPU não esquiva) | `npm run balanco -- --completo` | comparação: mostra o que a esquiva muda (não é o jogo de hoje) |

Cada `resultados.md` diz no cabeçalho "Modo **completo + ESQUIVA ligada**" ou "Modo **completo**" e traz a versão dos dados/motor e o hash do resultado.

Metas (valem na rodada de produção): lutadores comuns 42-58% de vitória; chefão NORMAL (o jogador vence) 30-40%; chefão DIFÍCIL >= ~20%; 0 lutas travadas.

Rodada atual (dados `d81622b9b8db`, ZENON `scale 1,32` / `alturaEmPe 1,22`): hash com esquiva `2c93922d5c48c8ea`, sem esquiva `2c88c4e935021822`.
