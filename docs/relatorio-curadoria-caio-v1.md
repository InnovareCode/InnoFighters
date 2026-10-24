# Curadoria técnica do CAIO, folhas v1 (23/10/2026)

Autor: Apolo (direção de arte). Pedido do Atlas: o dono aprovou a olho a mestra e as folhas 1 a 4 (v1). Esta é a
curadoria por medida, célula por célula, com a limpeza por código do que não pede nova geração.

Legenda do grau de prova:
- **[medido]**: script rodado sobre o pixel (o próprio `nucleo.mjs` do pipeline, ou script de medição no scratchpad);
- **[visto]**: recorte ampliado conferido a olho;
- **[proposta]**: decisão minha, a validar no harness ou pelo dono.

Nada foi sobrescrito e nada foi commitado. A pasta `arte-fonte/` está no `.gitignore`, então os arquivos novos dela
ficam só nesta máquina.

---

## 0. Resumo

| Folha | Componentes | Veredito | O que fazer |
|---|---|---|---|
| mestra | 1 | aprovada | nada |
| f1 base | 12 | 10 aprovadas, 1 no limite, **2 reprovadas** (`idle3`, `walk6`) | reparo **sem crédito**: mapa de células (seção 3.1). **Substituída pela f1 v2 GINGA (seção 7)** |
| f2 reações | **18** na v1, 12 na v2 | v2: 11 aprovadas, 1 no limite (`block`) | usar a **v2** (tracinhos limpos) + acolchoar o topo |
| f3 golpes | 12 | 11 aprovadas, 1 no limite (`sweep`) | nada obrigatório |
| f4 especiais | 12 | v2: 9 aprovadas, 3 no limite (`sa1`, `sb0`, `sb2`) | usar a **f4 v2** (risco limpo) + espelhar `sb2` + ponta dos chutes |

- **Nenhuma regeração é obrigatória.** As 2 reprovadas da f1 saem por mapa de células, e as 2 limpezas já estão feitas.
- A folha de reposição CR (seção 5) é **opcional**: 6 créditos, para melhorar a leitura de 4 poses fracas.
- **Achado fora da lista:** os quadros ativos `sb1`, `sb2` e `sc1` do CAIO são chute e rasteira, mas o pipeline mede
  a ponta deles no modo `mao`. Sem a exceção da seção 3.3, o alcance da rasteira e do chute em salto sai errado.

---

## 1. Como foi medido

- **Pipeline real** (`node ferramentas/sprites/cli.mjs caio --saida <scratchpad> --sem-contato`), rodado sobre a v1 e
  sobre a v2. Isso dá os componentes, o halo antes e depois do despill e os avisos de borda. **[medido]**
- **`arte-fonte/ferramentas-curadoria/curadoria-medir.mjs`**. A pasta não existia, então eu a criei com os meus
  scripts. Ele usa as funções do `nucleo.mjs` (corte de 2 px, chave, alfa, rótulo, agrupamento) e mede:
  - caixa de cada figura;
  - margem até as 4 bordas;
  - distância real, pixel a pixel, entre figuras vizinhas;
  - componentes pequenos e a figura dona de cada um;
  - magenta residual no miolo opaco;
  - diferença de silhueta, em % de XOR sobre a união, alinhando pelos pés e pelo centro de massa. **[medido]**
- **Borda bruta**: pixels de figura nas 2 linhas e colunas de fora da folha, antes do corte de 2 px. **[medido]**
- **Escala entre folhas**: comprimento dos pés de perfil (objeto rígido, faixa de 22 px da base), cabeça topo→queixo
  numa grade de 10 px e busca da escala que minimiza o XOR contra o `idle0`. Os scripts são `curadoria-escala.py` e o
  inline no relatório. **[medido]**
- Os critérios "figura ≤ ~70% da linha" e "vão entre linhas" usam a linha nominal de 597,3 px (1792 / 3).

---

## 2. Resultado por folha e por célula

### 2.0 Achado geral: a meta de 70% da linha não foi cumprida em nenhuma folha [medido]

As figuras ocupam de **93 a 102% da altura da linha** nas poses de pé (f3 `lp0`: 610 px numa linha de 597). É o
padrão conhecido da Runway com o BLOCO A, que manda "~70%". Não reprovo por isso, porque o que o recorte por
componente exige está cumprido nas 4 folhas:
- 12 componentes (na f2, depois da limpeza);
- nenhuma figura encostando em outra: a menor distância real é de **17 px** (f3, `hk1` x `upper`);
- só uma figura encosta na borda (f2 `block`, seção 2.3).

As caixas das linhas chegam a se sobrepor na vertical sem que os pixels se toquem:
- f3, coluna 4: o punho do `upper` sobe 79 px para dentro da faixa da linha 2;
- f4, coluna 3: a sobreposição é de 2 px.

Consequência: recortar pela grade 600 x 597 corta figuras. O pipeline já recorta por componente; mantenha assim.

### 2.1 Mestra (`caio-mestra-v1.png`, 1792 x 2400) — APROVADA

- 1 componente, fundo 252,3,250, halo 78,7% → 0,0% depois do despill;
- magenta residual no miolo: 5 px;
- margens: E 272, D 268, topo 66, base 65 px. **[medido]**
- Tatuagem no ombro do lado de quem olha, cordão verde e amarelo com 2 borlas, prendedor verde-limão, descalço. Sem
  FX, sem sombra roxa no chão. **[visto]**

### 2.2 f1 base (`caio-f1-base-v1.png`) — usar como está, com mapa de células

Medidas gerais da folha [medido]:
- 12 componentes, halo 68,4% → 0,0%;
- magenta residual no miolo: 0 a 12 px por figura;
- altura das figuras: 557 a 582 px, de 93 a 97% da linha;
- vão entre linhas: 21 px de L1 para L2 e 15 px de L2 para L3, medidos entre caixas. A distância real mínima entre
  figuras vai de 51 a 82 px;
- **linha 1 (suspeita do Atlas): não toca.** O cabelo fica a 12–36 px do topo; o mais justo é o L1C3, a 12 px;
- **linha 3: os pés ficam a 4–7 px da base.** Os contornos estão fechados e os pés inteiros [visto]. As 2 últimas
  linhas brutas têm 11 px claros sob o L3C1: é o ruído de borda da Runway, que o corte de 2 px tira.
- Pés idênticos nos 3 idles distintos (57 e 97 px). A ginga não escorrega os pés.

| Célula | Pose | Veredito | Medida e motivo |
|---|---|---|---|
| L1C1 | idle0 | aprovada | referência |
| L1C2 | idle1 | aprovada | 23,6% do idle0. Desce 16 px (balanço da ginga) |
| L1C3 | idle2 | **no limite** | 18,6% do idle0. Fica 8 px mais alto e o tronco abre de frente, com os 2 punhos juntos. Pode "pular" no laço: conferir no harness |
| L1C4 | idle3 | **reprovada** (duplicata) | **2,5% do idle0 = mesmo desenho** (abaixo de 3%). Reparo sem crédito na seção 3.1 |
| L2C1–L3C2 | walk0–walk5 | aprovadas | vizinhos a 15–25% um do outro |
| L3C3 | walk6 | **reprovada** | guarda baixa (os 2 braços caídos) e tronco de frente. Pula 38,7% do walk5 e 28% para o walk7, contra 15–25% entre os outros vizinhos. Só no terço de cima, é 25,6% contra 6% entre walk5 e walk7. Reparo sem crédito (3.1) ou regerar (5) |
| L3C4 | walk7 | aprovada | — |

### 2.3 f2 reações (`caio-f2-reacoes-v1.png` → **`caio-f2-reacoes-v2.png`**)

Medidas gerais da folha [medido]:
- **v1: 18 componentes.** São as 12 figuras mais 6 tracinhos de impacto (3 a 18 px cada) soltos à frente do rosto do
  L3C1, em x 290–337, y 1235–1287. O pipeline os FUNDE à figura (raio de fusão de 24 px), então eles iriam para o
  sprite. **v2: 12 componentes.**
- **L1C2 (`block`): o cabelo encosta no topo.** São 7 px de contorno nas linhas brutas 0 e 1, em x 850–856. O
  pipeline avisa "encosta na borda" e corta 2 px da ponta. O contorno da mecha está fechado [visto], então não é
  caso de regerar: basta acolchoar (seção 3.2).
- **L3C4 (`koFloor`), suspeita do Atlas: não toca.** A margem direita é de 13 px e a da base de 8 px. A caixa fica a
  5 px do `kdAir`, mas a distância real entre os dois é de 96 px.

| Célula | Pose | Veredito | Medida e motivo |
|---|---|---|---|
| L1C1 | crouch | aprovada | 450 px = 78% da altura do idle0: mais baixo que o idle, como pedido. O antebraço sobre a cabeça lê como proteção |
| L1C2 | block | **no limite** | cabelo na borda (acolchoar). Lê como guarda alta, parecida com o idle (28,8% depois de igualar a escala). Aceitável |
| L1C3 | cblock | aprovada | ajoelhado com guarda, 489 px |
| L1C4 | jsquat | aprovada | — |
| L2C1–L2C3 | jup, jtop, jfall | aprovadas | — |
| L2C4 | land | aprovada | 28,6% do jsquat: são desenhos distintos |
| L3C1 | hitH | reprovada na v1, **aprovada na v2** | tracinhos removidos: 128 px trocados por fundo, todos à direita do rosto |
| L3C2 | hitB | aprovada | — |
| L3C3 | kdAir | aprovada | cabeça à esquerda |
| L3C4 | koFloor | aprovada | cabeça à **esquerda**: não precisa espelhar |

### 2.4 f3 golpes (`caio-f3-golpes-v1.png`) — usar como está

Medidas gerais da folha [medido]:
- 12 componentes, halo 75,3% → 0,0%;
- margens: topo no mínimo 18 px (L1C1) e base no mínimo 23 px;
- distância real mínima entre figuras: 17 px (L2C4 x L3C4);
- magenta residual no miolo: até 51 px por figura (L2C1). É contorno escuro arroxeado nas frestas do cordão e das
  borlas, a mais de 3 px da borda, onde o despill não chega. Na escala do jogo (0,72) são riscos de menos de 1 px.
  Não pede ação.

| Célula | Pose | Veredito | Medida e motivo |
|---|---|---|---|
| L1C1 | lp0 | aprovada | 11,6% do idle0 na melhor escala: é o preparo do soco |
| L1C2–L1C4 | lp1, hp0, hp1 | aprovadas | — |
| L2C1–L2C4 | lk0, lk1, hk0, hk1 | aprovadas | — |
| L3C1, L3C2 | clp, clk | aprovadas | 47% de diferença entre os dois |
| L3C3 | sweep | **no limite** (fraco, não estava na lista) | a perna estendida é a de **trás**, apontando para a esquerda. O golpe lê como avanço baixo com a mão no chão. É o mesmo defeito da rasteira do ZENON. No jogo funciona, porque a ponta `direita` cai na mão rente ao chão. Regerar só na CR opcional |
| L3C4 | upper | aprovada | o punho sobe para dentro da faixa da linha 2, mas a 17 px reais do hk1 |

### 2.5 f4 especiais (`caio-f4-especiais-v1.png` → **`caio-f4-especiais-v2.png`**)

Medidas gerais da folha [medido]:
- 12 componentes, halo 76,7% → 0,0%;
- margens da base: 8–11 px na linha 3;
- distância real mínima entre figuras: 24 px.

Checagens pedidas [medido]:
- **L1C3 (`sa2`) x idle:** 49,6% do idle0 com a escala igualada. **Não é eco.** Para comparar, o `sa3` (volta à ginga)
  dá 34,5%.
- **`sc1` x `jkick`:** 58%. São desenhos distintos.

| Célula | Pose | Veredito | Medida e motivo |
|---|---|---|---|
| L1C1 | sa0 | aprovada | — |
| L1C2 | sa1 | **no limite** (fraco, conhecido) | soco reto, não meia-lua. Como disparo do projétil funciona, porque o jogo desenha a meia-lua. Regerar só na CR |
| L1C3 | sa2 | aprovada | palmas abertas, 49,6% do idle |
| L1C4 | sa3 | aprovada | volta à ginga |
| L2C1 | sb0 | **no limite** | desce de frente para a direita, sem começar o giro |
| L2C2 | sb1 | reprovada na v1, **aprovada na v2** | risco branco em arco junto ao pé removido. Detalhe na seção 4.2 |
| L2C3 | sb2 | **no limite** | avanço baixo sem giro, com a perna estendida para trás. A rasteira só "gira" no L2C2. Reparo sem crédito: espelhar (3.4) |
| L2C4 | sb3 | aprovada | — |
| L3C1 | sc0 | aprovada | — |
| L3C2 | sc1 | aprovada | 58% do jkick |
| L3C3 | jkick | aprovada | — |
| L3C4 | win | aprovada | sorriso, punho no alto |

### 2.6 Escala entre folhas (fatorFolha) [medido]

| Medida | f1 | f2 | f3 | f4 |
|---|---|---|---|---|
| Pé de trás, de perfil (px) | 57 | 59 | 58–59 | 57–59 |
| Pé da frente, de perfil (px) | 97 | 99 | 97–98 | 98–103 |
| Cabeça topo→queixo, a olho na grade (px) | ~104 | ~107 | ~108 | ~111 |

- O pé, que é rígido, varia no máximo 2% em f2 e f3. Na f4 vai até 6%, mas só em 2 poses: no `sb3` dá 98.
- A cabeça infla quando inclinada (lição do ZENON). Por isso eu confio no pé.
- **Proposta:** não usar `fatorFolha` agora. Depois do atlas, conferir topo→queixo no `idle0`, `lp0`, `block` e `sa3`.
  Só se a f4 sair mais de 5% maior, usar `fatorFolha.f4 = 0,96`. **[proposta]**

---

## 3. Reparos sem crédito (configuração do pipeline, para a Vega)

Tudo abaixo vai em `ferramentas/sprites/lutadores.json`, entrada `caio`, que ainda não existe. A exceção é o
espelhamento, que é flag de CLI.

### 3.1 Mapa da f1: idle em ida e volta e walk6 por apelido [proposta]

```json
"celulas": { "f1": ["idle0", ["idle1", "idle3"], "idle2", null, "walk0", "walk1", "walk2", "walk3", "walk4", ["walk5", "walk6"], null, "walk7"] }
```

- **Idle:** o laço fica 0 → 1 → 2 → 1, com passos de 23,6%, 22,4%, 22,4% e 23,6%. Hoje é 0 → 1 → 2 → 0' → 0, com
  um quadro repetido (2,5%) e um salto direto de 2 para 0. É o mesmo arranjo da CENTELLA.
- **Walk:** o walk6 vira apelido do walk5. O L3C3 é descartado. Do walk5 para o walk7 dá 21,8%, dentro da faixa dos
  outros passos, e o tronco muda só 6%. O custo é um quadro segurado em 8. Se a CR vier boa, o walk6 dela substitui o
  apelido.

### 3.2 Acolchoar o topo da f2 [proposta]

```json
"acolchoar": { "f2": { "topo": 6 } }
```

Com isso, o corte de 2 px da borda tira a margem acolchoada, não a ponta da mecha do `block`. É a mesma solução do
BAATAR B9.

### 3.3 Ponta dos quadros ativos (achado novo) [lido em `poses.mjs` + proposta]

O `MODO_PONTA` padrão põe `sb1`, `sb2` e `sc1` em `mao`, que pega o ponto mais à direita **acima** da faixa dos pés.
No CAIO esses quadros são rasteira (`sb1` e `sb2`) e chute em salto (`sc1`): o pé é a ponta.

```json
"ponta": { "sb1": "direita", "sb2": "direita", "sc1": "direita" }
```

Conferir o `reach` da RABO-DE-ARRAIA (`rm: 2.0`) no harness depois disso. É o R3 do plano.

### 3.4 Espelhar o `sb2` para a rasteira ler o giro [proposta, para o dono julgar no harness]

```
npm run sprites -- caio --espelhar f4:sb2
```

- O `sb2` espelhado fica de frente para a esquerda, mãos no chão e perna estendida para a direita, rente ao chão.
  Entre o `sb1` (de frente para a direita) e o `sb3`, lê como meia-volta do rabo-de-arraia. Montei a sequência e
  conferi a olho [visto: `m-sb-espelho.jpg` no scratchpad].
- **Efeito colateral:** no quadro espelhado, a tatuagem e o cordão trocam de lado. Num quadro de giro, na escala
  0,72, é difícil de ver, mas é erro de continuidade. O dono decide.
- A animação `melee` alterna `sb1` e `sb2` no ativo (`anim.ts`, `loop: 4`), e o motor já vira o sprite na entrada
  (`spin: 1`). Com o espelho, a alternância ativa também gira.
- O espelhamento é só flag de CLI: o `lutadores.json` não tem chave para ele. Se o dono aprovar, alguém precisa
  lembrar do flag em toda geração. Outra saída é a Vega criar a chave.

---

## 4. Limpezas por código (feitas)

Script: `arte-fonte/ferramentas-curadoria/caio-limpar-v2.py`. Ele lê a v1 e grava a v2 numa pasta dada, então é
reprodutível. A v1 fica intacta.

### 4.1 `caio-f2-reacoes-v2.png`: tracinhos do `hitH` [medido + visto]

- Linha a linha, de y 1222 a 1296, acha a borda do rosto e do cabelo. Todo pixel que não é fundo, de 3 px depois
  dessa borda até x 351, vira fundo (252,2,250).
- Foram 128 px alterados, todos na caixa x 279–338, y 1232–1287. Nenhum pixel do rosto foi tocado: a diferença v1 x
  v2 só existe nessa caixa.
- Pipeline na v2: **12 componentes** (eram 18), e o L3C1 virou 1 componente só.

### 4.2 `caio-f4-especiais-v2.png`: risco branco do `sb1` [medido + visto]

O risco é um arco semitransparente que sai do calcanhar. Ele também deixou um véu claro sobre a sola e uma segunda
linha escura por fora do contorno da sola. A limpeza teve quatro passos:
1. **Arco por fora do pé e quina do calcanhar** (polígono abaixo da reta (1093,1082)–(1108,1092)): tudo o que não
   é contorno preto vira fundo.
2. **Contorno da quina**, que o risco encobria: reta escura de 3 px desenhada com antisserrilhado (4x maior e
   reduzida) entre os trechos intactos.
3. **Sola:** o contorno real é o primeiro pixel escuro a partir de x 1110, linha a linha. Entre y 1054 e 1070, o que
   está por fora dele vira fundo (era a linha escura do risco). Por dentro, o véu (pele clareada por mistura com
   branco, até 45%) é repintado por difusão a partir da pele vizinha. Um contorno de 2,5 px com antisserrilhado
   reforça o trecho fino.
4. Total de 3.808 px alterados, todos na caixa x 1005–1161, y 1042–1124. Pipeline na v2: 12 componentes, halo
   76,5% → 0,0%.

**Limite honesto:** a sola perdeu 1 a 2 px de largura no trecho do risco, e a pele repintada é lisa, sem a textura do
traço original. A 0,72 isso não aparece [visto no recorte ampliado e no tamanho de folha]. Mesmo assim, recomendo o
dono olhar o `sb1` no harness.

### 4.3 O pipeline já pega as v2

O `acharFolha` escolhe o maior `-vN`. Rodar `npm run sprites -- caio` agora já usa f2-v2 e f4-v2 [medido: o log da
rodada lista os dois arquivos].

---

## 5. Folha de reposição CR (OPCIONAL, 6 créditos) — prompt pronto

**Para quê:** melhorar a leitura de `sa1` (meia-lua), `sb0` e `sb2` (giro da rasteira), `sweep` (perna da frente) e
`walk6`. Use o formato 4 x 3 da f1–f4 (não o 3 x 2), para sair na mesma escala das outras folhas. As 12 células dão
2 ou 3 tentativas para cada pose difícil. Da memória do BAATAR: o modelo insiste em soco reto. Se o `sa1` falhar nas
3 tentativas, aceite o v1.

- **Anexar (UMA imagem):** `caio-mestra-v1.png`.
- **Salvar em:** `arte-fonte/lutadores/caio/folhas/caio-cr-reposicao-v1.png`.
- **Formato:** 4:3, 2K.
- **Montagem:** BLOCO A geral (`docs/prompts-arte.md` §2), sem mudar nada. Depois o BLOCO B do CAIO (plano
  `docs/plano-arte-lacunas-2026-10-23.md` §2.4), sem mudar nada. Depois este BLOCO C:

```
SHEET R — REPLACEMENT POSES. Exactly 12 poses in 4 columns and 3 rows, one per cell, as listed.
Row 1, cells 1, 2 and 3 (wide crescent arm swing, three versions of the same moment, only the hand height varies a little): low wide stance, front knee bent, torso twisted toward the right; the arm nearest the viewer swings across the body in a wide horizontal curve at chest height with a FLAT OPEN HAND, fingers straight and together, palm facing down; the hand is at the far right end of the curve and the arm is slightly curved, never straight. NOT a punch, NOT a fist. The other hand is open near the rear hip.
Row 1, cell 4: walking forward, mid-step: the back heel lifted with the toes still on the baseline, the front foot flat on the baseline, knees slightly bent. Guard UP: front fist at chin height, rear fist in front of the belly, torso in profile facing right.
Row 2, cells 1 and 2 (start of a capoeira spinning low kick): dropping low and turning his back toward the viewer, head looking back over the shoulder to the right, both hands reaching down to the baseline, knees deeply bent.
Row 2, cells 3 and 4 (middle of the spin; in these two cells only he FACES LEFT): both hands flat on the baseline, body low and facing left, one leg stretched far out to the RIGHT along the baseline at ankle height, heel leading, the other knee deeply bent.
Row 3, cells 1, 2 and 3 (low sweep kick, three versions): crouching very low, the rear hand flat on the baseline; the FRONT leg, the one nearest the right edge of the cell, fully extended forward to the RIGHT along the baseline at ankle height, heel leading, sole facing right; the back knee deeply bent under the body. The kicking leg points to the right, never backward.
Row 3, cell 4: the same walking step as row 1 cell 4, with the other leg in front.
```

**Checagem depois de gerar** (pelo `curadoria-medir.mjs`):
- 12 componentes, sem risco nem poeira. Lembre: "spin" e "sweep" puxam rastro de movimento.
- Células de andar **x mestra**: diferença acima de 15%. Abaixo disso é eco da referência, porque a guarda pedida é a
  da mestra (lição do ZENON).
- Na linha 2, células 3 e 4: de frente para a esquerda e com as **duas** mãos no chão.
- Na linha 3: a perna estendida sai do lado **direito** da figura.
- Escala: pé de trás com 57–59 px de perfil.

**Integração:** a Vega decide entre duas saídas:
- uma `folhasExtras.cr` com grade [4,3], `null` nas células recusadas e `null` nas células trocadas de f1, f3 e f4;
- ou transplantar a célula por código para uma f1-v2, f3-v2 ou f4-v2 (máscara do componente + âncora no pé de
  apoio, como na AMINU f3 v3).

A primeira é mais limpa, mas precisa confirmar que `folhasExtras` aceita nome canônico.

---

## 6. Arquivos

| Arquivo | O quê |
|---|---|
| `arte-fonte/lutadores/caio/folhas/caio-f2-reacoes-v2.png` | **novo**, f2 sem os tracinhos do hitH |
| `arte-fonte/lutadores/caio/folhas/caio-f4-especiais-v2.png` | **novo**, f4 sem o risco do sb1 |
| `arte-fonte/ferramentas-curadoria/curadoria-medir.mjs` | **novo**, medição reutilizável. Uso: `node curadoria-medir.mjs <pastaFolhas> <saida.json> [f2=arquivo.png ...]`. Os nomes padrão e os pares de diferença são do CAIO: troque para outro lutador |
| `arte-fonte/ferramentas-curadoria/caio-limpar-v2.py` | **novo**, a limpeza das seções 4.1 e 4.2. Uso: `python -P caio-limpar-v2.py <pastaSaida>` |
| `arte-fonte/ferramentas-curadoria/curadoria-escala.py` | **novo**, a busca de escala por XOR. Lê o `medidas-v1.json` da pasta atual |
| `docs/relatorio-curadoria-caio-v1.md` | este relatório |

Os arquivos v1 não foram alterados.

---

## 7. f1 v2 GINGA (`caio-f1-base-v2.png`, 23/10/2026)

Origem: `folhas/_candidatas/caio-f1-base-ginga-v2.png`, aprovada a olho pelo dono. Ela substitui a f1 v1 (guarda de
boxe) pelo gingado da capoeira. A promoção é o arquivo novo `caio-f1-base-v2.png` na raiz de `folhas/`: o
`acharFolha` pega o maior `-vN`. A v1 e a candidata ficam intactas.

### 7.1 Resumo

| Item | Medida | Veredito |
|---|---|---|
| Componentes | bruta: **2** (a linha de chão une as fileiras); limpa: **12** | ok |
| Linha de chão | 3 linhas de 4 px (y 561–564, 1140–1143, 1746–1749), de x 46 a 2353 | **removida por código** |
| Halo / fundo | fundo 253,2,250; halo 87,8% → 0,0% depois do despill (pipeline) | ok |
| Magenta no miolo | 16 a 98 px por figura (o máximo é o L2C2) | ok, mesmo padrão da f3 v1 (até 51) |
| Margem das bordas | cabelo a 24–35 px do topo; pés a 32–38 px da base; laterais ≥ 61 px | ok |
| Figura / linha | 546–598 px = 91–100% da linha de 597 px | igual às outras folhas (seção 2.0) |
| Vão entre figuras | distância real mínima de 31,8 px (L1C1 x L2C1); as caixas das fileiras se sobrepõem até 14 px | ok, o pipeline recorta por componente |
| idle0–3 | 32,6 a 51,7% entre si | **4 desenhos distintos, sem cópia, sem apelido** |
| walk | vizinhos a 32–45% na ordem nova; o pior era 56,2% (walk7 → walk0) na ordem da grade | **reordenado** (7.4) |
| Escala | cabeça e pé dentro de ±4% das f2–f4 | **sem `fatorFolha`** (7.5) |
| Mãos | abertas nas 12 | ok; 2 no limite (7.3) |
| Eco da mestra | mestra x idle0 = 68,1% | não é eco |

Medido com o pipeline real (`node ferramentas/sprites/cli.mjs caio --saida <scratchpad> --sem-contato`: 12
componentes nas 4 folhas, escala 0,7396, 48 quadros), com `curadoria-medir.mjs` e com os scripts Python do
scratchpad. **[medido]**

### 7.2 Linha de chão: como saiu sem comer pé nem contorno [medido + visto]

Script: `arte-fonte/ferramentas-curadoria/caio-f1-tirar-linha.py`. Uso:
`python -P caio-f1-tirar-linha.py <entrada> <saida>`. É reprodutível a partir da candidata.

- **Primeira tentativa, reprovada:** trocar por fundo todo pixel roxo (B ≈ R, G ≈ 0) na faixa da linha. Isso comeu a
  base da sola na fileira 3, porque o contorno da sola desta folha tem a mesma cor da linha. Ficaram 39 fragmentos
  soltos sob os pés: a contagem deu 51, e foi assim que o erro apareceu.
- **Regra que ficou:** a figura está desenhada POR CIMA da linha. Coluna a coluna, varro a faixa da linha (±3 px):
  - de cima para baixo, se acima da faixa há fundo;
  - de baixo para cima, se abaixo da faixa há fundo.

  Troco por fundo só o pixel que bate com a cor da linha naquela altura (mediana das ~1.650 colunas expostas) ou que já
  é quase fundo. A varredura **para no primeiro pixel que não bate**, que é o contorno do pé. Coluna com figura acima
  e abaixo da faixa não é tocada (ali o pé cobre a linha).
- **2ª passada:** nos trechos em que a sola apoiava na própria linha, a base ficava em degrau ou com entalhe. Faço um
  fechamento morfológico da base da sola, coluna a coluna, com janela de 9. Entre a base atual e a base fechada,
  devolvo os pixels **originais**: 124 + 101 + 124 px. Isso não estende as pontas do pé.
- Resultado: 54.770 px alterados, todos nas faixas y 558–567, 1137–1146 e 1743–1752. Fora delas, nenhum pixel mudou.
  **12 componentes.** Pés conferidos a 5–6x, antes e depois, e os 12 quadros do atlas final sobre fundo escuro: sem
  resto de linha e sem halo.
- **Limite honesto:**
  - onde os dedos apoiavam na linha, 1 px da mistura linha/contorno ficou como contorno (L2C1, x 136–145, y 1143);
  - 4 colunas de 1 px de antisserrilhado ficaram coladas a pés (x 1294, 1795, 1283 e 1877).

  Na escala do jogo (0,74) isso fica abaixo de 1 px.

### 7.3 Por célula

| Célula | Pose (mapa novo) | Veredito | Medida e motivo |
|---|---|---|---|
| L1C1 | idle0 | aprovada | referência da escala. Mão da frente aberta à altura do rosto |
| L1C2 | idle1 | aprovada | 34,6% do idle0. Braço da frente cruzado baixo, mão aberta sobre a coxa |
| L1C3 | idle2 | aprovada | 51,7% do idle0 e 35,7% do idle3. Os dois antebraços cruzam diante do rosto, palmas abertas |
| L1C4 | idle3 | **no limite** | 41,3% do idle0. **A mão de trás segura o cordão** (dedos em volta da corda verde): não é punho, mas não é mão "solta". A 0,74 lê como mão no quadril |
| L2C1 | walk0 | aprovada (pés: ver 7.4) | de costas, girando, mão da frente aberta |
| L2C2 | walk1 | aprovada | — |
| L2C3 | walk2 | aprovada | abre o tronco, mãos abertas |
| L2C4 | walk4 | **no limite** | a mão de trás segura o cordão, como o idle3 |
| L3C1 | walk3 | aprovada | — |
| L3C2 | walk7 | aprovada | mão da frente erguida e aberta (dedos levemente curvos, sem punho) |
| L3C3 | walk6 | **no limite** | **a borla amarela salta para entre as pernas** (nas outras 7 está no quadril de trás). É um "pop" de 1 quadro, de ~30 px na escala do jogo. Ver 7.6 |
| L3C4 | walk5 | aprovada | braços bem abertos, mãos abertas |

Traje: os 12 quadros têm a tatuagem no ombro, o cordão verde e amarelo com 2 borlas e o prendedor verde-limão, e estão
descalços. Nos quadros de costas (L2C1, L2C2), a tatuagem aparece no ombro da frente. Isso é coerente com o giro do
tronco, não é troca de lado. **[visto]**

### 7.4 Ciclo do andar: reordenado pelo mapa [medido + proposta]

A grade agrupa os desenhos em dois tipos:
- **de costas/girando:** L2C1, L2C2, L2C3, L3C2;
- **de frente:** L2C4, L3C1, L3C3, L3C4.

Na ordem da grade, o ciclo atravessa de um grupo para o outro 4 vezes. O fechamento walk7 → walk0 (braços abertos de
frente → de costas) dá **56,2%**, contra 32–48% nos outros passos. Busquei a ordem de 8 quadros que minimiza o pior
salto do laço (todas as 5.040 permutações com o L2C1 fixo):

| Ordem | Passos do laço (% XOR) | Pior | Média |
|---|---|---|---|
| grade (L2C1…L3C4) | 34,4 · 36,7 · 48,0 · 36,6 · 41,9 · 44,8 · 32,3 · **56,2** | 56,2 | 41,4 |
| **nova** (L2C1, L2C2, L2C3, L3C1, L2C4, L3C4, L3C3, L3C2) | 34,4 · 36,7 · 42,8 · 36,6 · 33,1 · 32,3 · 44,8 · 33,6 | **44,8** | **36,8** |

- Na ordem nova, o tronco faz **uma** balançada por ciclo: gira, abre de frente, abre os braços e volta a fechar a
  guarda com a mão no rosto (L3C2), que emenda no L2C1. Montei as duas sequências ancoradas no `ax` e conferi a olho.
  A nova lê como ginga contínua. **[visto]**
- **Pés em relação ao `ax` (atlas final, px do jogo):** a base é quase constante (de 335 a 395 px entre o calcanhar de
  trás e a ponta do pé da frente). Não há passada de verdade: as pernas nunca trocam de lado. É uma ginga que avança,
  então os pés **deslizam** com o deslocamento do andar, como em qualquer andar sem passo alternado.
- O meio dos pés fica entre −10 e −15 px do `ax` em 7 quadros. O **walk0 (L2C1) fica em −38**: o corpo vai para a
  frente sobre a perna da frente. Na entrada e na saída do walk0, os pés pulam ~25 px para trás e voltam. Como o
  personagem avança, isso lê como o pé de apoio ficando para trás, mas **conferir no harness**. Se incomodar, a saída
  sem crédito é trocar o walk0 por apelido do walk1 (`["walk1", "walk0"]` no L2C2, com `null` no L2C1). O custo é o
  laço passar de walk7 (L3C2) para walk1 com 47,1%.

### 7.5 Escala: sem `fatorFolha`; atenção ao `alturaRef` [medido]

| Régua | f1 v2 (ginga) | f1 v1 | f2 v2 | f3 v1 | f4 v2 |
|---|---|---|---|---|---|
| Cabeça topo→queixo, grade de 10 px (px) | idle 108–112; walk 103–117 | 102 | 105 (`block`) | 110 (`lp0`) | 110 (`sa3`) |
| Pé da frente de perfil, faixa de 22–30 px (px) | idle 102–104; walk 108–117 | 96–98 | 99 | 97–98 | 98–104 |

- **Idle x f2–f4:** cabeça de +0 a +4% e pé +3%. Dentro dos 5%: **não usar `fatorFolha.f1`**.
- **Walk:** a cabeça varia de 103 a 117 px, porque os quadros de cabeça inclinada e sorriso aberto inflam o queixo
  (lição do ZENON). O pé da frente mede 108–117 px porque fica chapado de perfil, enquanto no idle ele gira um pouco
  para o espectador. Uma busca de escala pelas pernas contra o walk4 dá de 0,95 a 1,06 em 11 de 12 quadros. A exceção
  é o L2C2, a 1,11, porque tem a base mais estreita (294 px contra 330–366): é pose, não escala.
- **Achado que não é `fatorFolha`:** o pipeline tira a escala do lutador inteiro da altura do `idle0`
  (`executar.mjs`, `alturaRef / idle0`). O idle novo é agachado na ginga: 553 px, contra 573 no v1. Por isso, **o CAIO
  inteiro cresce 3,4% no jogo**: escala de 0,7155 para 0,7396. Medido no atlas: `block` 424 → 438, `lp0` 438 → 453,
  `sa3` 410 → 424.
  - Está abaixo dos 5%, então não é obrigatório mexer.
  - Para manter o tamanho que o dono já viu, use **`"alturaRef": 396`** na entrada `caio` (410 × 553/573). **[proposta]**
  - `fatorFolha.f1` seria a ferramenta errada: ele escala só a f1 e deixa o idle0 fora do `alturaRef`.

### 7.6 O que fazer com as células no limite

- **idle3 e walk4 (mão no cordão):** aceitar. A memória da capoeira pede "mãos soltas ou guardando o rosto". Brincar
  com o cordão é solto e não é punho. Regerar custaria 6 créditos e arriscaria perder a ginga aprovada.
- **walk6 (borla entre as pernas):** aceitar e conferir no harness. Se o dono notar o salto, há duas saídas.
  - **Sem crédito:** apagar a borla de entre as pernas e repintar a calça. É o mesmo método da seção 4.2 (véu por
    difusão).
  - **Com crédito (6), só esta célula:** use o prompt abaixo. Anexe **uma** imagem, a `caio-f1-base-v2.png`
    recortada no L3C3, e não a mestra: a pose a manter é a da célula. 2K, 1:1.

```
Edit this exact image. Keep the pose, the body, the face, the hands, the white capoeira pants, the bare feet, the shoulder tattoo and the solid magenta (#FF00FF) background EXACTLY as they are. Change ONLY the belt cord: both cord tassels (one green, one yellow) hang together at the BACK HIP on the left side of the figure, swinging slightly backward, both fully visible against the background. Nothing hangs between the legs. No ground line, no shadow, no motion lines, no effects.
```

  Depois de gerar, rode o `difcruz` contra a anexada. Uma diferença menor que 3% fora da área da borla prova que
  só a borla mudou; a mais que isso, houve mudança de pose. Transplante a célula para uma f1 v3 pelo método da AMINU
  f3 v3: máscara do componente + âncora no pé de apoio.
- **Nenhuma célula reprovada:** não há regeração obrigatória.

### 7.7 Mapa de células (aplicado em `ferramentas/sprites/lutadores.json`, entrada `caio`)

```json
"f1": ["idle0", "idle1", "idle2", "idle3", "walk0", "walk1", "walk2", "walk4", "walk3", "walk7", "walk6", "walk5"]
```

- Sem apelido: o idle anda 0 → 1 → 2 → 3 → 0, com passos de 34,6, 40,8, 35,7 e 41,3%. A ida e volta da v1 deixou de
  ser necessária.
- Pés do idle no atlas: a base fica constante (372–376 px), mas o meio dos pés vai de +6 a −12 px do `ax`. O corpo
  balança sobre os pés plantados, e a âncora no centro de massa transforma isso em **pés deslizando ~18 px** no laço
  do idle. Hoje o pipeline não tem chave para ancorar pelos pés. A **proposta para a Vega** é `"ancora": { "idle*":
  "pes" }`, com `ax` no meio dos pés, nos quadros do idle. Assim a ginga balança o tronco sem patinar. Até lá,
  conferir no harness. **[medido + proposta]**

### 7.8 Arquivos

| Arquivo | O quê |
|---|---|
| `arte-fonte/lutadores/caio/folhas/caio-f1-base-v2.png` | **novo**, f1 ginga sem a linha de chão (promoção) |
| `arte-fonte/ferramentas-curadoria/caio-f1-tirar-linha.py` | **novo**, a limpeza da seção 7.2 |
| `ferramentas/sprites/lutadores.json` | `celulas.f1` e `_nota` do `caio` |

---

## 8. Capoeira: f3 v2 e CR2 (24/10/2026)

O dono aprovou as duas folhas geradas com o BLOCO B-capoeira (`docs/caio-capoeira-auditoria.md` §5.3). Curadoria **sem
crédito**: um transplante de mão, troca de mapa e um espelho opcional. Nada foi gerado.

### 8.1 f3 capoeira (`_candidatas/caio-f3-golpes-capoeira-v1.png` → `folhas/caio-f3-golpes-v2.png`)

| Célula | Pedido | Veredito | Decisão |
|---|---|---|---|
| L1C1 | preparo da galopante | **eco** da referência de ginga (5,5% de máscara contra o `idle0`; a menor respiração é 32,6%) | descartada (`null`) |
| L1C2 | galopante | guarda de mãos abertas, sem o arco do tapa | **vira `lp0`** (preparo: mãos abertas no alto) |
| L1C3 | preparo da cabeçada | ok | `hp0` |
| L1C4 | cabeçada | corpo a ~35° (o pedido era quase horizontal), mas a cabeça é o ponto mais à frente e os braços vão para trás | **aproveitada** (`hp1`; a ponta `mao` cai na cabeça, medido) |
| L2C1 / L2C2 | bênção | ok, sola de frente | `lk0` / `lk1` |
| L2C3 / L2C4 | armada | ok, de costas, perna reta na altura da cabeça | `hk0` / `hk1` |
| L3C1 | cotovelada baixa | **punho fechado** na mão de trás; e não é cotovelada (braço estendido) nem agachada (515 px contra 450 do `crouch`) | **corrigida por código**: mão aberta (palma, dedos para cima) transplantada do `sa2` da f4 v2 (escala 1,05, giro 18°, cor ajustada a 70%, rampa de 8 px no pulso). Fica `clp` como **palmada baixa** |
| L3C2 | chapa baixa | ok | `clk` |
| L3C3 | rasteira | ok, perna esticada à **direita** | `sweep` (`chk`) |
| L3C4 | queixada | ok, perna reta acima da cabeça, à direita | `upper` (`chp`) |

O `lp1` (galopante ativa) sai da CR2 L3C1 (8.2): braço estendido, palma aberta na altura do rosto, a outra mão atrás.

### 8.2 CR2 (`_candidatas/caio-cr2-capoeira-v1.png` → `folhas/caio-cr2-capoeira-v1.png`, cópia idêntica)

| Célula | Pedido | Veredito | Decisão |
|---|---|---|---|
| L1C1 | início da meia-lua (`sa0`) | **eco** da referência (5,5%) | descartada. `sa0` = **apelido do `sa2`** (joelho alto: o mesmo desenho serve à subida e à descida da perna) |
| L1C2 | meia-lua no topo (`sa1`) | ok, perna à direita, sola de frente | `sa1`, ponta `direita` (o pé) |
| L1C3 | depois da meia-lua (`sa2`) | ok | `sa2` (+ apelido `sa0`) |
| L1C4 | vitória | ok, palma para cima e sorriso (42% contra a referência) | `win` |
| L2C1 / L2C2 | compasso | os dois saíram como **aú**: mão no chão à direita, pernas passando no alto **à esquerda** | **L2C2** (perna mais alta, mais "por cima"). Ver 8.3 |
| L2C3 / L2C4 | voo do morcego (2 pés) | saiu com **uma perna só**, esticada para cima e à direita | **L2C3** (`jkick`). Voadora de uma perna serve ao `jkick`; "voo do morcego" deixa de valer para a arte |
| L3C1 / L3C2 | esquiva | L3C1: palma à frente, tronco ereto (33,5% contra a referência, no limite do eco). L3C2: antebraço diante do rosto, tronco desviando (44,9%) | **L3C2 = `block`**; **L3C1 = `lp1`** |
| L3C3 | `jtop` | ok | `jtop` |
| L3C4 | `jup` | ok. Os dedos do pé param a 3 px da base, com contorno fechado (não está cortado) | `jup`. O aviso "encosta na borda" some com `acolchoar.cr2.base 6` |

### 8.3 Compasso (`sc1`): fase do giro ou espelho?

- **Como está:** serve como fase do giro (o aú passando por cima). Mas o `sc1` é o **primeiro quadro ativo** do `sFwd`, e a
  caixa nasce da ponta dele (`montar.ts:166-167`). Com a ponta `direita`, a ponta cai nos dreads, a 62% da altura
  (`[355, 228.7]` de 366): a caixa desce para a altura da cabeça dele, de ponta-cabeça. Espelhar só a perna não dá, porque o
  quadril e o tronco giram junto.
- **Espelhado (0 crédito):** a perna reta passa por cima e o calcanhar desce à **direita**: é o compasso batendo. A ponta
  `direita` cai no calcanhar, no alto (`[355, 17.9]`). O rosto fica de frente para a câmera nas duas versões. Arquivo
  pronto em `_candidatas/caio-cr2-capoeira-v2-sc1-espelhado.png` (só a célula L2C2 espelhada).
- **Recomendo o espelhado**, mas a decisão é do dono: ele vetou espelhar o `sb2`. Se aprovar, copiar para
  `folhas/caio-cr2-capoeira-v2.png` (o `acharFolha` pega o maior -vN) ou fixar em `arquivos.cr2`.

### 8.4 C1 e C2 (só mapa, sem pixel novo)

- **C1:** `cblock` = apelido do `crouch` (`["crouch", "cblock"]` na f2).
- **C2:** `sb3` = apelido do `idle0` e `sa3` = apelido do `idle1`, na f1. O apelido usa o mesmo retângulo e, com ele, a
  âncora `pes` do idle: a volta para a ginga não pula. Não é preciso uma `f4 v3`.

### 8.5 Mapa completo para a Vega (`ferramentas/sprites/lutadores.json`, entrada `caio`)

```json
"celulas": {
  "f1": [["idle0", "sb3"], ["idle1", "sa3"], "idle2", "idle3", "walk0", "walk1", "walk2", "walk4", "walk3", "walk7", "walk6", "walk5"],
  "f2": [["crouch", "cblock"], null, null, "jsquat", null, null, "jfall", "land", "hitH", "hitB", "kdAir", "koFloor"],
  "f3": [null, "lp0", "hp0", "hp1", "lk0", "lk1", "hk0", "hk1", "clp", "clk", "sweep", "upper"],
  "f4": [null, null, null, null, "sb0", "sb1", "sb2", null, "sc0", null, null, null]
},
"folhasExtras": {
  "cr2": { "grade": [4, 3], "celulas": [null, "sa1", ["sa2", "sa0"], "win", null, "sc1", "jkick", null, "lp1", "block", "jtop", "jup"] }
},
"acolchoar": { "f2": { "topo": 6 }, "cr2": { "base": 6 } },
"ponta": { "sb1": "direita", "sb2": "nenhuma", "sc1": "direita", "sa1": "direita", "lp1": "mao:0.5" }
```

- Nomes do motor: `clp1` = `clp`, `clk1` = `clk`, `chp1` = `upper`, `chk1` = `sweep` (`anim.ts:14-17`).
- **`lp1: "mao:0.5"` é obrigatório:** no modo `mao`, a canela da frente passa da palma e a ponta caía a 69% da altura
  (`[332, 258]`). Com `mao:0.5`, a ponta vai para a palma (`[324, 52]`).
- O `acharFolha` pega sozinho `caio-f3-golpes-v2.png` (v2 > v1) e `caio-cr2-capoeira-v1.png`. f1, f2 e f4 seguem na v2.

### 8.6 Checklist §5.3 (medido)

| Item | f3 v2 | CR2 |
|---|---|---|
| 12 componentes, nenhum pequeno (linha de chão, rastro) | 12, 0 | 12, 0 |
| Linha de chão | não há | não há |
| Escala | o L1C1 (eco) contra o `idle0` da f1 v2: altura 98,4%, pé de trás 68/69, pé da frente 100/102 → ~98%. Pé de trás de perfil: 55–60 px | pé de trás 66–70, da frente 97–102, igual à f1. **Sem `fatorFolha`** |
| Eco contra `caio-ref-ginga-v1` | L1C1 é eco (descartada); as demais vão de 38,6% a 76% | L1C1 é eco (descartada); L3C1 dá 33,5% (no limite, usada como `lp1`: o braço é outro); as demais vão de 42% a 73% |
| Perna da rasteira e da queixada à direita | sim (L3C3, L3C4) | `sa1` à direita: sim |
| Nenhum punho fechado no resultado final | **sim**, depois do transplante no L3C1. No L2C1, a mão de trás está curvada segurando o cotovelo (não é punho) | sim |

### 8.7 Prova no pipeline real

`gerarLutador` com o mapa de 8.5 e as exceções passadas em memória, saída só no scratchpad. O `lutadores.json` não foi
tocado. Resultado: 12 componentes em cada uma das 4 folhas e na cr2, e todas as poses presentes. O único aviso novo é o do
`jup`, que o `acolchoar` resolve.

| Pose | Ponta (atlas) | Comentário |
|---|---|---|
| `lp1` | `[324, 52]` de 377 | palma na altura do rosto (com `mao:0.5`) |
| `hp1` | `[410, 68]` de 355 | topo da cabeça |
| `clp` | `[300, 117]` de 370 | palma na altura do peito |
| `sa1` | `[299, 61]` de 407 | pé no alto: **fixar `alturaDoProjetil`** (auditoria §6.2) |
| `sc1` | `[355, 229]`; espelhado `[355, 18]` | ver 8.3 |
| `jkick` | `[417, 51]` de 305 (antes `[332, 237]` de 428) | a caixa **sobe**, porque o pé está no alto do quadro. Conferir no harness se o pulo ainda acerta quem está agachado |
| `sweep` | `[417, 234]` de 306 | pé rente ao chão |

### 8.8 Resíduos conhecidos (sem crédito, não bloqueiam)

- **`clp` em pé:** 370 px no atlas, contra 324 do `crouch`. Do agachado, ele "sobe" para dar a palmada. A cotovelada
  agachada de verdade fica para a f5 do CAIO, junto com a banda e o aú (auditoria §5.4).
- **`lp0`/`lp1` sem o arco do tapa:** a galopante lê como palmada de frente (mãos abertas no alto, depois o braço estendido).
- **`jkick` de uma perna, apontando para cima:** a arte não tem mais o "voo do morcego" com os dois pés.
- **Calibração:** o `caio-arte-calibrada.test.ts` vai acusar, porque `lp1`, `clp`, `sc1`, `jkick` e `block` mudaram de
  largura. Recalibrar `rm`/`bh` para a largura de hoje e rodar o harness (auditoria §6.3).

### 8.9 Arquivos

| Arquivo | O quê |
|---|---|
| `arte-fonte/lutadores/caio/folhas/caio-f3-golpes-v2.png` | **novo**: f3 capoeira com a mão aberta no L3C1 |
| `arte-fonte/lutadores/caio/folhas/caio-cr2-capoeira-v1.png` | **novo**: cópia idêntica da CR2 aprovada (md5 `e440fe9e…`) |
| `arte-fonte/lutadores/caio/folhas/_candidatas/caio-cr2-capoeira-v2-sc1-espelhado.png` | **novo, opcional**: CR2 com o compasso espelhado (decisão do dono) |
| `arte-fonte/ferramentas-curadoria/caio-f3-mao-aberta.py` | **novo**: o transplante (`python -P caio-f3-mao-aberta.py <f3> <f4v2> <saida> 1.05 18 2 0.7`) |
