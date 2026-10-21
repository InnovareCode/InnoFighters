# Curadoria AMINU: folhas 2, 3 e 4 (Apolo, 2026-10-20)

Fontes conferidas: `scratchpad/runway-lote4/aminu-f2-reacoes-v1.png`, `aminu-f3-golpes-v1.png`,
`aminu-f4-especiais-v1.png` (2400x1792), contra `arte-fonte/lutadores/aminu/folhas/aminu-mestra-v1.png` e os
prompts 3, 4 e 5 de `docs/prompts/04-aminu.md`.

## Vereditos

| Folha | Veredito | Motivo em uma linha |
|---|---|---|
| f2 reações | **CORRIGIR (espelho)** | Nocaute (linha 3, col. 4) com a cabeça à DIREITA; o resto está certo |
| f3 golpes normais | **REGERAR** | Linha 1 col. 2 e linha 3 col. 1: corda também na mão da FRENTE; linha 3 col. 1 nem está agachado |
| f4 especiais | **APROVADO** (2 ressalvas, nenhuma bloqueia) | Chute em salto parece joelhada; na vitória o punho erguido é o nu |

## Medições (componentes conexos, fundo #00FF00, limiar 90)

Rodei `componentes.ps1` nas três: **12 componentes grandes em cada uma**. Nenhuma figura encosta em outra.
Pequenos (<3000 px): f2 = 0, f3 = 1, f4 = 1 (ruído, não é figura).

O que isso NÃO prova: que dê para recortar a folha numa grade fixa. Em todas as três as caixas das fileiras se
sobrepõem na vertical, então o recorte tem que ser **por componente** (caixa de cada figura), não por fileira:
- f2: o nocaute tem 718 px de largura (x 1646-2363), mais largo que uma célula de 600, e invade a coluna 3.
- f3: o gancho (linha 3, col. 4) começa em y=1141; a linha 2 termina em y=1206.
- f4: a linha 1 termina em y=643 e a linha 2 começa em y=621; a vitória começa em y=1081.

## f2: reações

- Linha 3: soco no rosto recua para a ESQUERDA, golpe no estômago dobra para a frente, arremessado no ar com a
  cabeça à ESQUERDA: corretos.
- **Nocaute com a cabeça à DIREITA.** Espelhar só essa figura. Retângulo x 1646-2363, y 1621-1753 (componente de
  68185 px). Conferi com `vao.ps1` que nenhuma parte da figura vizinha (col. 3) entra nesse retângulo: as linhas
  1612-1625 estão vazias e os pixels de 1626 em diante pertencem ao pé erguido do próprio nocaute. Espelhar pelo
  retângulo é seguro; espelhar pela máscara do componente é ainda mais seguro. Salvar como `-v2`.
- Corda só na mão de trás em todas as 12. Nas defesas a mão enfaixada cruza na frente do rosto, o que é natural.
- Mão da frente fechada em punho no pulo (linha 2, col. 1 e 2). Aceito: é guarda no ar, e na escala do jogo o
  sinal de identidade é a corda.

## f3: golpes normais

- **Linha 1, col. 2 (soco fraco):** o punho da frente estendido está ENFAIXADO, e o de trás também. Dois punhos
  com corda quebram a marca do personagem.
- **Linha 3, col. 1 (soco fraco agachado):** de novo os dois punhos enfaixados, e a figura está em base larga em
  pé (515 px de altura, quase a de pé), não agachada. Isso quebra a caixa de dano do agachado.
- Corretos: linha 1 col. 4 (soco forte com a corda, certo), linha 2 inteira, rasteira (perna esticada até o chão,
  pé apoiado; a canela fica em diagonal suave, aceito como "rente ao chão"), gancho antiaéreo.
- Nenhum golpe encosta na vizinha (12 componentes). O menor vão horizontal é de 9 px entre a linha 3 col. 2 e
  col. 3, mas em alturas diferentes (pé do chute em y≈1572, pé da rasteira em y≈1704).

### Ajuste de prompt para regerar (Prompt 4, mesma referência única: `aminu-mestra-v1.png`)

Acrescentar logo depois do parágrafo CHARACTER:

```
Only ONE hand is ever wrapped: the REAR fist. The lead hand and lead forearm are bare skin in every cell, also when the lead hand punches.
```

E trocar estas duas descrições:

```
Row 1: (1) light punch start, (2) light punch: the BARE lead fist fully extended at face height, the rope-wrapped rear fist stays at the cheek, (3) heavy punch wind-up, (4) heavy punch: the rope-wrapped rear fist fully extended, hips and shoulders rotated into it.
Row 3: (1) crouching light punch: knees deeply bent, hips low, head at about two thirds of the standing height, BARE lead fist jabbing forward, (2) ...
```

Plano B, se a v2 vier com defeitos novos: as 10 células boas da v1 servem. Como o recorte é por componente, dá
para montar o lutador com a v1 e tirar da v2 só as duas células trocadas, desde que a altura das figuras bata
(conferir a altura da figura de pé nas duas folhas antes).

## f4: especiais

- Soco carregado em 4 tempos: punho com corda na bochecha, recolhido no quadril, estendido na altura do rosto,
  de volta à guarda. A sequência lê bem. O tempo 1 é quase igual à guarda; aceito.
- Mão-escudo: passo com a mão subindo, palma aberta empurrando com os dedos abertos, palma firme, volta. Correto.
- Passo do leão: agachamento à frente com a palma, investida baixa com a palma no peito. Correto.
- **Ressalva 1, chute em salto:** saiu um joelho erguido com o pé apontando para baixo, mais joelhada voadora do
  que chute diagonal. A Lyra pode pôr a caixa de ataque no joelho/canela. Se o dono quiser o chute clássico,
  pedir só essa pose depois (não regerar a folha por isso).
- **Ressalva 2, vitória:** o punho erguido é o nu e a mão enfaixada está no peito (o prompt pedia o contrário).
  O traje continua coerente (a corda segue na mão de trás dele), só a ênfase muda. Aceito.
- Corda só na mão de trás nas 12.

## Fidelidade e limpeza (as três)

Rosto, barba curta, cabelo raspado, faixa creme com bordado cobre, calção índigo, manchas índigo nos antebraços
e canela da frente enfaixada batem com a mestra. O bordado da faixa sai mais floral do que o zigue-zague da mestra:
variação pequena, invisível na escala do jogo. Sem efeito, texto, grade ou figura extra em nenhuma das três
(conferido a olho na imagem inteira e em recortes ampliados).
