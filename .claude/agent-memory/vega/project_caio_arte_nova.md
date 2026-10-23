---
name: caio-arte-nova
description: Integração do CAIO novo (2026-10-23): entrada no lutadores.json, fixture do atlas original, o que o atlas move no jogo (caixas) e armadilhas (ponta do sb2, trailer P2)
metadata:
  type: project
---

Entregue em 2026-10-23 (sem commit). Só o que não se deriva do código:

- **Arte nova muda o jogo sem mudar o motor**: `tipX/tipY` do atlas viram caixas em `montar.ts` (só a PRIMEIRA pose ativa: `anim.a[0]`). Por isso `sb2` (2º quadro ativo da rasteira) nunca entra em caixa, só no rastro (`rastro-golpe.ts`). **How to apply:** antes de achar que uma `ponta` pesa na luta, ver se a pose é `a[0]` do golpe.
- Oráculo = a mesma receita de HAYATO/MIN-JI: atlas original em `tests/fixtures/atlas-prototipo/caio/` + `caio` em `ORIGINAIS_COM_ATLAS_DE_PROTOTIPO` (`_lutadores.ts`) + `atlas.test`/`dados.test` apontando a fixture. Sem isso, snapshot/lock-step caem. Passou sem -u.
- **Ponta `direita` no `sb2` do CAIO sem espelhar cai na CABEÇA/orelha** (a perna estendida aponta para a ESQUERDA; o ponto mais à direita é o cabelo, y=75 de h=298). Só afeta o rastro. `direita` serve ao `sb1` (pé) e `sc1` (pé). Se o dono não espelhar o sb2, considerar tirar a ponta (rastro some) ou criar modo "esquerda".
- Fidelidade por 3 caminhos (dados, luta, e2e de pixel). O terceiro (e2e) é da Lyra: `arte-sob-demanda.spec.ts` conta `/atlas.webp` (agora só WEI LONG) e `fidelidade-*.spec.ts` precisam servir a fixture do CAIO.
- **Trailer P2 (MIN-JI x CAIO) tem impressão do motor gravada em `tomadas.ts`**: trocar o atlas do CAIO muda a luta da tomada (3 testes de `trailer-diretor`). Não é bug: `npm run trailer:escalar -- --plano P2` + reaprovação do dono.
- Cabeça topo-queixo medida no atlas final (régua a 5x, grid de 10 px): idle0/lp0/block ~88, sa3/hk0 ~90-91 -> sem `fatorFolha`.
- Flakes sob carga (suíte inteira, 116 workers): `chefe-adversarial` (timeout 5 s), `sons-integracao` (p99 relativo). Passam isolados. Conferir isolado antes de culpar a mudança.

**Calibração por dados (2ª passada, 2026-10-23):**
- Arte nova sem calibrar: CAIO 49,2% -> 61,3% no harness (alcance maior). Só igualar a LARGURA da caixa (rm) deu 43,8%; hp com +9% (rm .72) deu 47,8% (aceito). **Why:** igualar largura não igualou contatos do `hp` (cause exata não achada: geometria quase igual; altura/bh não explicou). **How to apply:** depois de calibrar caixa por dados, SEMPRE medir a taxa no harness (`--pares 'caio:*' --sem-chefe` leva ~1 min) e ajustar o golpe cujos contatos caem (ver linha "Golpes que a CPU usa" do resultados.md).
- Oráculo com especiais: `originais.json` ganhou `caio.especiais` (sDown/sFwd rm/bh de produção mudam; dados.test compara `especiais` com o protótipo). `defDoOraculo` usa a fixture quando existe.
- `ponta: "nenhuma"` (executar.mjs) = quadro sem ponta, sem rastro. Documentado em poses.mjs e docs/como-adicionar-um-lutador.md.
- `--saida` do harness com o MESMO nome sobrescreve a rodada anterior (perdi a rodada A cheia): usar um nome por variante.
- Rodada do harness reproduz `docs/balanco` (hash 957b8416d75bf060, regulares f420ce92) com a arte e def antigas: boa prova de que a árvore está igual à referência.

**WEI LONG (mesma receita, 2026-10-23):**
- Largura IGUAL do oráculo deixou o WEI +3 pts (48,0 -> 50,8%); a largura é a alavanca mais sensível do harness: -8% derrubou ~9 pts, -2,5% (rm calculado com fator 0,975) deu 47,5%. **How to apply:** calibrar rm por busca binária contra a largura do oráculo e depois escalar por ~0,975, medir com `--pares '<id>:*' --sem-chefe` (1 min, pareado por semente) e confirmar no completo.
- A ombrada do WEI (sc1 novo) tem a ponta NO OMBRO (85 px da âncora): o rm precisou ir de 0.95 a 2.02 para o punho do protótipo (152 px de caixa). `mao:F` (pipeline) corrige a ponta do joelho.
- spawn do projétil: o atlas ANTIGO do WEI tinha a pose `special` com tip 270 (spawn x 250); o atlas novo cai em `sa1` (spawn x 75). Não há alavanca de dados para o x (só `alturaDoProjetil`, y). Projéteis acertam mais (+26%) e a taxa foi compensada nas caixas.
- `arquivos` em lutadores.json fixa a versão de folha (f4 v1 nova vs f4 v2..v4 antigas na raiz). Teste do pipeline com a "maior versão" corrompida.
- `tests/unit/fluidez-ancora.test.ts` (de outra instância) + `tests/fixtures/escorregoes-conhecidos.json` registram o escorregão de pés da arte de PRODUÇÃO: arte nova pode piorar linhas (WEI: clp 18,3->22,8; chp 24,5->54,1; chk e jlp novos). Não regenerei: decisão do Atlas/Apolo.
