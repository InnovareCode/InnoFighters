---
name: project-curadoria-filme
description: Curadoria da folha FILME (closes do especial) — piloto HAYATO e grupos A (CENTELLA/BAATAR/ZENON), B (WEI/CAIO/MIN-JI) e C aprovados 2026-10-23; conta do painel, cortes tortos, empacotamento, prova pelo bloco filme
metadata:
  type: project
---

Piloto HAYATO v1 (`docs/curadoria-filme-hayato-v1.md`) e grupo B (`docs/curadoria-filme-grupo-b.md`) curados em 2026-10-23.
Páginas em `arte-fonte/lutadores/<id>/filme/<id>-filme-pagina-v1.{webp,png,json}`.

- **Conta do painel (mudou depois do piloto):** célula a 96% da altura = 643,2 px de canvas; largura útil 777,6 px. Hc 630 =
  1,021x; Hc 600 = 1,072x. Célula com w/h > 1,209 é limitada pela LARGURA: guardar além de ~778 px é memória invisível (WC).
- **A linha de corte da IA vem com anti-alias:** replicar a linha 5 px acima nas 4 últimas, mas SÓ nas células com corte
  (4º arg do montador). Em corpo inteiro a réplica apaga o contorno do pé.
- **Corte em curva/diagonal (CAIO v2 linha 2):** pintar o fundo abaixo da ponta MAIS ALTA da tigela (`filme-endireitar-corte.py`),
  cópia em `filme/`, nunca -v2 da folha.
- **Três chutes de corpo inteiro na mesma linha estouram 2048:** `filme-empacotar.mjs` escolhe as linhas sem reamostrar.
- **Prova:** `filme-prova-bloco.mjs` injeta o bloco `filme` (produção desde bf99492) para qualquer lutador, P1 e P2.
- **Grupo C** (`docs/curadoria-filme-grupo-c.md`): 3 aprovadas. AMINU `f2` = ECO (XOR 4,9%, a pose da mestra) saiu da página
  (cai no Alt; prompt de 2 células no §6). Corte VERTICAL da IA (AMINU R2C2): esmaecer SÓ O ALFA na página (`filme-celulas.mjs
  fN:eK`); esmaecer na folha mistura pele + verde, vira oliva e deixa fio verde-amarelo no painel. Linha preta desenhada na base
  dos bustos (CAMILLE): apagar a faixa inteira em `filme-limpar-grupo-c.py`.
- **Grupo A** (`docs/curadoria-filme-grupo-a.md`): 3 aprovadas. WC 732 para as figuras deitadas da CENTELLA (sem ele: 2864 px,
  0,64x no painel); BAATAR com Hc 610 (6 células largas: 2032 px). CENTELLA `f4` com a cabeça para a DIREITA foi espelhada na
  página (`filme-espelhar-celula.mjs`); conferir na captura do P2 que o rosto vira para LONGE do atacante. ZENON `f5`, o oposto
  do HAYATO, está certo (é o literal do prompt). Riscos soltos: abertura morfológica numa janela FOLGADA (a janela justa
  erode o cabelo). Objeto POR CIMA da mão (cordão do BAATAR `f1`) não sai por código (3 tentativas): aceitar ou regerar 1 célula.
- **Regerar 1 célula = regerar a FOLHA com a folha atual como única referência** e a célula errada nomeada WRONG (AMINU v2,
  aprovada 2026-10-23): as outras 5 voltam quase idênticas (±1 px). Entra só a célula nova, colada por MÁSCARA de componente
  numa cópia da folha limpa (`filme-trocar-celula.mjs`; a caixa nova invade a vizinha, retângulo apagaria a outra figura).
  Saída `filme/<id>-filme-limpa-v2.png` + `-pagina-v2.*`; nunca remontar da folha nova (traz os defeitos que a limpa tirou).
  ZENON v2 aprovada e curada (grupo A §10): sem limpa, a base é a própria folha v1 → `limpa-v1` + `pagina-v2` 1760x1280.
  BAATAR v2 aprovada e curada (grupo A §12): `limpa-v1` + `f1` → `limpa-v2` → `pagina-v2` 2000x1248; args da v1 provados
  remontando a limpa v1 (`610 f0,f3,f4 732`). Ordem de linhas da v1 mantida (empacotar ganharia 16 px mexendo 5 quadros).
  Células "intocadas": base = folha original → ~20-50 bytes diferentes ("mesmas caixas"); base = limpa que já montou a
  página → 0 byte (BAATAR), aí vale "pixel a pixel". Medir sempre antes de escolher a frase.
  No Git Bash, caminho de saída para node/sharp tem de ser `cygpath -m` (`/c/...` falha ao gravar).
- Gotas de saliva no "rosto atingido" NÃO são lixo. CAIO: `f3` veio como "chamada" (sorriso + mão aberta), aceita como ginga.

**Why:** os grupos A, B e C editaram as MESMAS ferramentas em paralelo (montador ganhou 4º arg `cortes` e 5º `WC`);
um `write` cego teria apagado o trabalho do outro grupo.
**How to apply:** reler a ferramenta compartilhada logo antes de editar, usar Edit (falha se mudou), e preferir arquivo novo.
Eco: XOR mínimo > respiração do idle (régua do próprio lutador). Ver [[project-roteiros-filme]], [[project-curadoria-sprites]].
