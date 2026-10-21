# Balanço: qual rodada é qual

Os arquivos são GERADOS por `npm run balanco` (não edite à mão). Duas rodadas `--completo` (100 sementes, NORMAL e DIFÍCIL, 19 800 lutas) estão versionadas:

| Pasta | Configuração | Comando | Para que serve |
|---|---|---|---|
| `docs/balanco/` | **COM esquiva** (`Regras.esquiva` ligada) = **o jogo de produção** | `npm run balanco -- --completo --esquiva` | a referência oficial: metas de balanço valem aqui |
| `docs/balanco/sem-esquiva/` | SEM esquiva (a CPU não esquiva) | `npm run balanco -- --completo` | comparação: mostra o que a esquiva muda (não é o jogo de hoje) |

Cada `resultados.md` diz no cabeçalho "Modo **completo + ESQUIVA ligada**" ou "Modo **completo**" e traz a versão dos dados/motor e o hash do resultado.

Metas (valem na rodada de produção): lutadores comuns 42-58% de vitória; 0 lutas travadas; **chefões em RAMPA** (decisão do dono, spec chefões §4.3 e D-D1): o jogador (a CPU do desafiante) vence AMINU ~26-30% no NORMAL, descendo até ZENON ~15-19% (os pontos do meio interpolam: CENTELLA 24-28, CAMILLE 22-26, NILA 19-23, BAATAR 17-21); no DIFÍCIL "proporcionalmente menor" (centro do NORMAL x 0,575, +-3 pontos). Acompanham, por chefão e nível: KO >= 90%, duração média <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, `danoRecebido` >= 0,60. As faixas moram em `ferramentas/balanco/chefoes.ts` (`metaDoChefe`) e são **aproximação CPU x CPU, não a taxa de uma pessoa**.

Cada chefão é medido contra o elenco que existe no ponto dele da progressão (AMINU: os 4 iniciais; CENTELLA: + AMINU; ...; ZENON: os 9) = 39 pares x 2 níveis x 100 sementes = 7800 lutas de chefe, mais as 18 000 regulares.

Hashes: o `resultados.md` traz `hashRegistros` (tudo), **`hashRegulares`** (só as 90 combinações regulares: tem de ser IGUAL antes e depois de qualquer ajuste de chefão) e `hashChefes`. O `hashRegulares` da rodada de produção é `f420ce928e06b304` (idêntico ao de antes do R1).

Ferramentas para calibrar (todas gravam em `relatorios/`, nunca aqui): `--chefes aminu,zenon` (só esses), `--sem-regulares` (só os chefões; ~25 s com 100 sementes), `--varrer-dano 1,0.9,0.8` (taxa x fator `danoRecebido` por chefão e nível; falha se a taxa não cair quando o fator cai) e `--ajustes '{"aminu":{"chefe":{"danoRecebido":0.9}}}'` ("e se" sobre o elenco em memória). Sempre com `--esquiva` (a meta vale com esquiva ligada).

Rodada atual (R1/R3 dos chefões, dados `f6b9952cee5e`): hash com esquiva `957b8416d75bf060`. A pasta `sem-esquiva/` é da rodada ANTERIOR (um chefão só, o ZENON, e sem os fatores `danoRecebido`): não foi regravada, serve só para comparar a esquiva nos 10 lutadores.
