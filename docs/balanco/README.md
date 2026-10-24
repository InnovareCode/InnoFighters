# Balanço: qual rodada é qual

Os arquivos são GERADOS por `npm run balanco` (não edite à mão). Duas rodadas `--completo` (100 sementes, NORMAL e DIFÍCIL, 19 800 lutas) estão versionadas:

| Pasta | Configuração | Comando | Para que serve |
|---|---|---|---|
| `docs/balanco/` | **COM esquiva E COM o motor v2 inteiro** (entrada no hitstop + filme do especial + combos próprios) = **o jogo de produção desde a V2-6** | `npm run balanco -- --completo --esquiva` | a referência oficial: metas de balanço valem aqui |
| `docs/balanco/sem-motor-v2/` | esquiva, **motor v2 desligado** (os dados de hoje, o motor de antes) | `npm run balanco -- --completo --esquiva --sem-motor-v2` | o "antes" da V2-6 e a base dos portões do §4.5 (`portoes-v2.json`) |
| `docs/balanco/sem-esquiva/` | SEM esquiva (a CPU não esquiva), rodada ANTIGA | `npm run balanco -- --completo --sem-motor-v2` | comparação histórica: mostra o que a esquiva muda (não é o jogo de hoje; não foi regravada) |

O motor v2 nasce LIGADO no harness, como no jogo. `--sem-motor-v2` o desliga; `--motor-v2 filmes` (ou `entrada`, `combos`, em lista) liga SÓ essas (A/B, sai em `relatorios/`); `--dano-filme hoje|forte` é o A/B do dano do filme (D-V3). O resumo do que mudou na V2-6, por lutador, está em [`../balanco-motor-v2.md`](../balanco-motor-v2.md).

Cada `resultados.md` diz no cabeçalho "Modo **completo + ESQUIVA ligada**" ou "Modo **completo**" e traz a versão dos dados/motor e o hash do resultado.

Metas (valem na rodada de produção): lutadores comuns 42-58% de vitória; 0 lutas travadas; **chefões em RAMPA** (decisão do dono, spec chefões §4.3 e D-D1): o jogador (a CPU do desafiante) vence AMINU ~26-30% no NORMAL, descendo até ZENON ~15-19% (os pontos do meio interpolam: CENTELLA 24-28, CAMILLE 22-26, NILA 19-23, BAATAR 17-21); no DIFÍCIL "proporcionalmente menor" (centro do NORMAL x 0,575, +-3 pontos). Acompanham, por chefão e nível: KO >= 90%, duração média <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, `danoRecebido` >= 0,60. As faixas moram em `ferramentas/balanco/chefoes.ts` (`metaDoChefe`) e são **aproximação CPU x CPU, não a taxa de uma pessoa**.

Cada chefão é medido contra o elenco que existe no ponto dele da progressão (AMINU: os 4 iniciais; CENTELLA: + AMINU; ...; ZENON: os 9) = 39 pares x 2 níveis x 100 sementes = 7800 lutas de chefe, mais as 18 000 regulares.

Hashes: o `resultados.md` traz `hashRegistros` (tudo), **`hashRegulares`** (só as 90 combinações regulares: tem de ser IGUAL antes e depois de qualquer ajuste de chefão) e `hashChefes`. O `hashRegulares` da rodada de produção (V2-6, motor v2 ligado) é **`05bf1b64b46008a0`**, o mesmo antes e depois de DUAS rodadas de ajuste dos fatores de chefão (V2-6 e V2-6b: a prova de que só chefão mudou); o `hashChefes` é `edb33ac1bc92fe9c`. A rodada `sem-motor-v2/` tem `hashRegulares 94bc91f1fdeb98e6` e `hashChefes 689197be17326873`. O antigo `f420ce928e06b304` era de dados que já mudaram (arte nova do CAIO e do WEI LONG, V2-4) e não reproduz mais.

Ferramentas para calibrar (todas gravam em `relatorios/`, nunca aqui): `--chefes aminu,zenon` (só esses), `--sem-regulares` (só os chefões; ~25 s com 100 sementes), `--varrer-dano 1,0.9,0.8` (taxa x fator `danoRecebido` por chefão e nível; falha se a taxa não cair quando o fator cai) e `--ajustes '{"aminu":{"chefe":{"danoRecebido":0.9}}}'` ("e se" sobre o elenco em memória). Sempre com `--esquiva` (a meta vale com esquiva ligada).

Rodada atual (V2-6, dados `0a39396db39d`): hash total com esquiva e motor v2 `79a6e9e3af0c7847` (sem motor v2: `88fe7e6d3689cb6b`). A pasta `sem-esquiva/` é de uma rodada ANTERIOR (um chefão só, o ZENON, e sem os fatores `danoRecebido`): não foi regravada, serve só para comparar a esquiva nos 10 lutadores.

Portões do §4.5 da spec do motor v2: cada rodada completa grava `portoes-v2.md/json` (duração do round, fatia do dano de especial, tempo parado estimado, especiais e filmes por luta); a de produção compara com `sem-motor-v2/portoes-v2.json`. Coluna "Filme" na `frame-data.md` e o verificador de combos (`combos-proprios.md`) só existem na rodada com o motor v2 ligado.

Chefões (V2-6b): cada um tem DOIS fatores, `danoRecebido` (FÁCIL e NORMAL) e `danoRecebidoDificil` (só o nível DIFÍCIL); a coluna "Fator" do `resultados.md` mostra o do nível da linha. `--varrer-dano` varre os dois juntos (mesmo valor); para varrer só o DIFÍCIL use `--niveis 2 --ajustes '{"aminu":{"chefe":{"danoRecebidoDificil":0.9}}}'`.
