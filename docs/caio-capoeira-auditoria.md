# CAIO: auditoria de capoeira, golpe por golpe (24/10/2026)

Autor: Apolo (direção de arte). Pedido do Atlas depois da reprovação do dono: "movimentos sem sentido, nada a ver com
capoeira". A regra do dono continua valendo: toda arte, golpe, especial, filme e combo do CAIO tem ginga.

O que este documento é: leitura do código e das folhas instaladas, comparada com a capoeira real. **Nada foi gerado,
nenhum crédito foi gasto e nada mudou em `src/`, `public/` ou `arte-fonte/`.**

Grau de prova:
- **[lido]**: tirado do código (`src/data/...`, `ferramentas/sprites/...`);
- **[visto]**: folha reduzida conferida a olho, célula por célula;
- **[proposta]**: decisão de direção de arte, a validar pelo dono e no harness.

Botões do jogo: são **4**, não 6. Não existem `mp` nem `mk`. SF = `lp`, SFT = `hp`, CF = `lk`, CFT = `hk`; com ↓ viram
`clp`, `chp`, `clk` e `chk`; no ar, `jlp`, `jhp`, `jlk` e `jhk`. O agarrão (`throw`) usa as poses do `hp`
(`src/data/base-moves.ts`, `src/data/anim.ts`) [lido].

---

## 0. Veredito

| Bloco | Situação | Ação |
|---|---|---|
| Idle e andar (f1 v2 GINGA) | **capoeira** | nada |
| Golpes normais (f3 v1) | **12 de 12 são boxe, karatê ou taekwondo** | **regerar a f3 inteira** (6 créditos) |
| Especiais (f4 v2) | 4 de 12 são capoeira (`sb0`, `sb1`, `sb2`, `sc0`) | 6 células por nova geração, 2 por cópia de código |
| Reações e pulo (f2 v2) | `crouch` é a cocorinha. `block`, `cblock`, `jup` e `jtop` são guarda de boxe | `cblock` por apelido; `block`, `jup` e `jtop` na mesma geração da f4 |
| Folha FILME (closes) | **6 de 6 ok** | nada |
| Rajada do filme e roteiro | ok, desde que a arte nova entre | nada no código |
| Combos próprios | sequências **certas em capoeira**; a arte é que desmente o nome | nada no dado |

**Custo mínimo: 2 gerações = 12 créditos.** O resto sai por apelido ou cópia de célula (0 crédito).
O frame data não muda: o CAIO está a 49,7% no harness, e a proposta troca o desenho e a leitura, não o número.

---

## 1. Causa raiz: por que saiu boxe

O dono só viu a ginga onde o pedido foi escrito em capoeira. Há três causas, e todas estão no prompt:

1. **A mestra está em guarda de boxe.** `caio-mestra-v1.png` e a referência `caio-ref-guarda-v1.png` têm os **dois punhos
   fechados** diante do rosto e da barriga [visto]. Toda folha que anexou a mestra herdou os punhos. O eco da referência
   é um defeito conhecido, já registrado no ZENON e na NILA.
2. **O BLOCO B do CAIO manda fechar o punho.** A frase "Fighting stance: ginga ... **one fist guarding the face**"
   (`docs/plano-arte-lacunas-2026-10-23.md`, linha 268) entra em TODA folha. A lição da NILA f5 vale aqui: a frase de
   postura do CHARACTER manda mais que a linha da célula.
3. **A folha 3 é genérica.** O BLOCO C da f3 é o mesmo para os 10 lutadores (`docs/prompts-arte.md` §2.1): "light punch",
   "heavy punch", "chambered knee", "heavy kick at head height" e "uppercut". Para o CAIO, isso desenha jab, direto,
   chute lateral de karatê, chute alto de taekwondo e gancho.

A f1 v2, a FILME v2 e as linhas 2 e 3 da f4 saíram certas porque o pedido descreveu capoeira de verdade (mãos soltas,
mão no chão, calcanhar em arco).

**Correção que vale para tudo o que vier:** usar o BLOCO B-capoeira do §6.1 (mãos sempre abertas) e anexar como
referência o `idle0` da f1 v2, recortado por código (0 crédito), no lugar da mestra.

---

## 2. Tabela golpe × veredito (o que está no jogo hoje)

Fontes: quadros em `src/data/anim.ts`; dados em `src/data/lutadores/caio.ts` e `src/data/base-moves.ts`; poses nas folhas
instaladas (`caio-f1-base-v2`, `caio-f2-reacoes-v2`, `caio-f3-golpes-v1`, `caio-f4-especiais-v2`).

### 2.1 Normais

| Comando | Quadros | Nome hoje | O que a pose mostra de fato [visto] | Capoeira? | Golpe correto |
|---|---|---|---|---|---|
| SF (`lp`) | `lp0` → `lp1` | (sem nome) | guarda de boxe e depois **jab** de punho fechado na altura do rosto | **não** (boxe) | **Galopante** |
| SFT (`hp`) | `hp0` → `hp1` | (sem nome) | punho armado acima do ombro e depois **direto** com o quadril girado | **não** (boxe) | **Cabeçada** |
| CF (`lk`) | `lk0` → `lk1` | (sem nome) | joelho armado com os punhos na guarda e depois **chute lateral** na barriga | **não** (karatê) | **Bênção** |
| CFT (`hk`) | `hk0` → `hk1` | (sem nome) | joelho armado e depois **chute vertical alto**, com os punhos fechados | **não** (taekwondo; o grupo B já tinha apontado) | **Armada** |
| ↓SF (`clp`) | `crouch` → `clp` | (sem nome) | agachado de cócoras, **soco reto** | **não** | **Cotovelada** baixa |
| ↓CF (`clk`) | `crouch` → `clk` | (sem nome) | agachado, chute curto na canela com os **punhos na guarda** | **meio**: a perna lembra uma chapa baixa, os braços são de boxe | **Chapa baixa** (da negativa) |
| ↓SFT (`chp`) | `crouch` → `upper` | (sem nome) | **gancho de baixo para cima**, punho no alto | **não** (boxe) | **Queixada** subindo (antiaéreo) |
| ↓CFT (`chk`) | `crouch` → `sweep` | (sem nome) | avanço baixo com a mão no chão e a perna de **trás** esticada para a esquerda | **meio**: a base é uma negativa, mas a perna que varre está do lado errado | **Rasteira** |
| no ar, CF/CFT (`jlk`, `jhk`) | `jtop` → `jkick` | (sem nome) | joelho armado no ar e chute de ponta, com **punhos de boxe** | **não** (taekwondo) | **Voo do morcego** |
| no ar, SF/SFT (`jlp`, `jhp`) | `jtop` → `jkick` (apelido: o CAIO não tem `jpunch`, ver `montar.ts:144`) | — | igual ao de cima | **não** | igual ao de cima (sem arte própria) |
| agarrão (`throw`) | `hp0` → `hp1` | — | o direto de boxe | **não** | **Banda** (pendência de código, §5.4) |

### 2.2 Especiais

| Especial | Quadros | Nome hoje | O que a pose mostra [visto] | Capoeira? | Golpe correto |
|---|---|---|---|---|---|
| `sFire` | `sa0` → **`sa1`** → `sa2`, `sa3` | ONDA VERDE | `sa0`: braço enrolado no tronco. **`sa1`: soco reto** (já estava "no limite" na curadoria). `sa2`: palmas empurrando, gesto de "energia". `sa3`: guarda de boxe | **não**: a onda sai de um soco | onda verde lançada por uma **meia-lua de frente**: a meia-lua de energia nasce do arco do pé |
| `sDown` | `sb0` → `sb1`/`sb2` (alternando) → `sb3` | RABO-DE-ARRAIA | `sb0`: desce com as mãos soltas. `sb1`: cócoras, mão no chão, perna da frente varrendo rente com a sola. `sb2`: mãos no chão, perna esticada para trás (negativa). **`sb3`: guarda de boxe** | **sim** nas 3 primeiras; **não** no `sb3` | manter. `sb3` = volta à ginga (cópia do `idle`) |
| `sFwd` | `crouch` (pre) → `sc0` → **`sc1`** | MEIA-LUA | `crouch`: cocorinha (ok). `sc0`: impulso baixo com as mãos soltas (ok). **`sc1`: voadora frontal de taekwondo, com o punho na guarda** | **não** no golpe; o close do filme (`f2`) é que é meia-lua de compasso | **meia-lua de compasso** (§4.2) |
| vitória | `win` | — | sorriso e **punho fechado** no alto | **meio** | **Chamada**: mão aberta, palma para cima, convidando para o jogo |

### 2.3 Movimento, defesa e reações

| Pose | Uso | O que mostra [visto] | Capoeira? | Correto |
|---|---|---|---|---|
| `idle0`–`idle3` (f1 v2) | parado | ginga baixa, mãos abertas, antebraço cruzando o rosto | **sim** | manter |
| `walk0`–`walk7` (f1 v2) | andar | ginga com passo, tronco girando, mãos abertas | **sim** | manter |
| `crouch` (f2) | agachar, preparo de ↓ e janela da **esquiva** (`render/esquiva.ts`) | cócoras com o antebraço sobre a cabeça | **sim**: é a **cocorinha** | manter |
| `land` (f2) | aterrissar e recuperar da esquiva | joelhos dobrados | neutro | manter |
| `block` (f2) | defesa em pé | **guarda de boxe**, punhos no rosto | **não** | **esquiva lateral** com o braço de defesa (§4.1) |
| `cblock` (f2) | defesa agachada | **ajoelhado com guarda de boxe** | **não** | **cocorinha**: apelido do `crouch` (0 crédito) |
| `jsquat`, `jfall` | pulo | joelhos dobrados, mãos baixas | neutro | manter |
| `jup`, `jtop` | pulo (o `jtop` é também o preparo dos chutes aéreos) | **punhos de boxe** na guarda | **não** | mãos soltas abertas, joelho subindo |
| `hitH`, `hitB`, `kdAir`, `koFloor` | reações | reações | n/a | manter |

### 2.4 Folha FILME, roteiro e combos

| Item | O que mostra | Capoeira? | Ação |
|---|---|---|---|
| FILME `f0` (ONDA VERDE) | busto com o tronco torcido, braços varrendo em arco, mãos abertas, sorriso | **sim**. No busto as pernas ficam fora do quadro; o braço varrendo é o contrapeso de uma meia-lua de frente | manter |
| FILME `f1` (RABO-DE-ARRAIA) | ginga baixa, mão no chão, perna varrendo rente | **sim** | manter |
| FILME `f2` (MEIA-LUA) | **meia-lua de compasso**: mão no chão, corpo invertido, calcanhar descendo em arco | **sim**, e é o modelo do novo `sc1` | manter |
| FILME `f3` (grito) | a **chamada**: sorriso malandro, mão aberta | **sim** | manter |
| FILME `f4`, `f5` | rosto atingido, lançado | n/a | manter |
| Rajada `['lk1', 'sweep', 'sb0']` (`roteiros-filme.ts:194`) | hoje: chute lateral, avanço baixo, descida | **meio** | **não mexer no código**: com a f3 nova vira bênção → rasteira → descida |
| Roteiro da MEIA-LUA (`prep sc0, subida sc0, impacto sc1, queda sb2`) | impulso, voadora de taekwondo, negativa | **meio** | não mexer: com o `sc1` novo vira impulso → compasso → negativa |
| VOLTA AO MUNDO `clk › clk › chk`, cruza | hoje: 2 chutes curtos de boxe e um avanço baixo | **o nome e a sequência são capoeira**; a arte não é | manter o dado (§4.3) |
| SÃO BENTO GRANDE `lk › hk › →ESP` | hoje: chute lateral, chute de taekwondo e voadora | **o nome e a sequência são capoeira**; a arte não é | manter o dado (§4.3) |

---

## 3. Glossário de pose (o que pedir para a arte)

Regras que valem para TODA pose do CAIO:
- **mãos sempre abertas**, dedos soltos;
- joelhos dobrados e corpo baixo;
- o braço que protege é o **antebraço cruzando o rosto**, com a mão aberta;
- os chutes são **arcos de perna esticada** ou **empurrões de sola**, nunca o chute de ponta com o joelho armado;
- olhar sempre no adversário, inclusive de costas (cabeça virada por cima do ombro).

| Golpe | Pose para gerar arte |
|---|---|
| **Ginga** | base em triângulo: um pé recua na diagonal, joelhos dobrados, tronco inclinado à frente. O braço do lado da perna de trás cruza diante do rosto com a mão aberta; o outro fica solto e baixo |
| **Galopante** | a mão em concha, aberta, desce em arco horizontal na orelha do adversário. Batida de palma, não soco |
| **Cabeçada** | o corpo se lança quase na horizontal e o topo da cabeça vai à frente, na altura do peito do rival. Os braços ficam para trás, mãos abertas, e a perna de trás empurra |
| **Bênção** | o joelho sobe à frente do peito e a perna estica reta, empurrando com a **sola chapada** na barriga. Tronco um pouco para trás e uma mão aberta diante do rosto |
| **Armada** | giro: por um instante as costas ficam para o rival, com a cabeça virada por cima do ombro. A perna estica e varre na horizontal, na altura da cabeça, com a borda do pé e o calcanhar à frente. Os braços abrem baixos para equilibrar |
| **Meia-lua de frente** | a perna esticada passa à frente do corpo num arco de dentro para fora, na altura da cabeça. A sola fica de frente para o alvo no topo do arco. Tronco ereto, mãos abertas |
| **Meia-lua de compasso** | o tronco dobra baixo e gira, uma mão vai ao chão sob o peito e o olhar passa por baixo do braço. A outra perna, esticada, sobe em arco alto por cima, e o calcanhar desce no alvo |
| **Queixada** | a perna de trás sobe esticada num arco por fora, alto, passando acima da cabeça. O tronco inclina para trás e os braços abrem |
| **Chapa baixa** | da negativa: o corpo fica sentado sobre a perna de trás, uma mão vai ao chão atrás e a perna da frente empurra com a sola na canela |
| **Rasteira** | negativa funda: sobre uma perna toda dobrada, as duas mãos no chão, a outra perna esticada rente ao chão. O peito do pé ou o calcanhar engancha o tornozelo do rival. A perna que varre aponta **para o rival** |
| **Rabo-de-arraia** (como o jogo usa) | as duas mãos no chão e o corpo girando 360° baixo, com o calcanhar varrendo na altura do tornozelo. Nota: na Capoeira Angola, "rabo-de-arraia" também é o nome da meia-lua de compasso. Aqui fica a versão rente ao chão, para não repetir o `sFwd` |
| **Voo do morcego** | salto com as **duas solas juntas** à frente, na diagonal para baixo. Tronco para trás, braços abertos atrás |
| **Cotovelada** | da ginga baixa, o cotovelo avança na horizontal, na altura da barriga. A mão desse braço fica aberta, na frente do peito |
| **Banda** | o pé entra atrás do calcanhar do rival e a mão empurra o peito dele. É uma rasteira de pé, de corpo colado |
| **Esquiva lateral** | joelhos dobrados e o tronco desviando para o lado oposto ao do golpe. O antebraço protege o rosto (o "braço de defesa"), mão aberta; a outra mão fica perto do chão |
| **Cocorinha** | de cócoras, os calcanhares no chão, o antebraço sobre a cabeça |
| **Negativa** | o corpo baixo sobre uma perna dobrada, a outra esticada à frente, uma mão no chão e a cabeça erguida olhando o rival |
| **Aú, macaco, rolê** | estrela, salto para trás apoiado na mão e rolamento pelo chão. Não entram no moveset de golpes; ficam para a transição do combo VOLTA AO MUNDO, a provocação e a entrada (§5.4) |

---

## 4. Moveset proposto (completo)

Princípio: **o frame data não muda.** S/A/R, dano, nível e derrubada ficam como estão. A capoeira entra no desenho, no
nome (documento e arte) e no texto do especial. Os golpes normais não têm nome na tela, então o nome serve à arte, ao
roteiro e a este documento.

### 4.1 Normais

| Comando | Golpe | Preparo (quadro `…0`) | Ativo (quadro `…1`) | No jogo (hoje, não muda) |
|---|---|---|---|---|
| SF `lp` | **Galopante** | ginga baixa, o braço do lado do público recuado atrás do ombro, mão aberta em concha | o braço desce em arco horizontal e a palma bate na altura do rosto do rival; a outra mão aberta guarda o rosto | rápido (3/3/7), **médio**, alcance curto (`rm` 0,65), repete |
| SFT `hp` | **Cabeçada** | agachado à frente, queixo recolhido, olhos no rival, mãos abertas perto dos joelhos | o corpo lançado quase na horizontal, o topo da cabeça à frente na altura do peito e a perna de trás empurrando | pesado, **médio**, alcance curto (`rm` 0,72), avança 14 px. A ponta `mao` acha o topo da cabeça: não muda o modo |
| CF `lk` | **Bênção** | em pé sobre a perna de trás, joelho da frente alto e sola apontada para o rival | a perna esticada reta e a sola chapada na barriga; tronco para trás, mão aberta no rosto | **médio**, altura da barriga, `rm` 0,87 |
| CFT `hk` | **Armada** | de costas para a câmera, cabeça virada por cima do ombro para o rival, braços abrindo | a perna esticada varrendo na horizontal, na altura da cabeça, borda do pé à frente; tronco inclinado para longe | pesado, **médio**, alto (`bh` 184), `rm` 1,22, **derruba** |
| ↓SF `clp` | **Cotovelada** baixa | `crouch` (cocorinha) | da ginga baixa, o cotovelo avança na horizontal na altura da barriga; mão aberta no peito | **médio**, curto (`rm` 0,99), repete |
| ↓CF `clk` | **Chapa baixa** | `crouch` | sentado sobre a perna de trás, mão no chão atrás, a sola da perna da frente empurrando a canela | **baixo**, `rm` 1,1 |
| ↓SFT `chp` | **Queixada** subindo | `crouch` | sai da cocorinha e a perna esticada sobe em arco por fora, acima da cabeça; tronco para trás | **antiaéreo** (`tall`, `bh` 125), derruba. A ponta `cima` serve para o pé no alto |
| ↓CFT `chk` | **Rasteira** | `crouch` | negativa funda, as duas mãos no chão, a perna da frente esticada rente ao chão enganchando o tornozelo, apontada para o rival | **baixo**, `rm` 1,4, **derruba** |
| no ar CF/CFT `jlk` `jhk` | **Voo do morcego** | `jtop` (joelhos recolhidos, mãos abertas) | no ar, as duas solas juntas à frente na diagonal para baixo, braços abertos atrás | **alto** (`over`: só se defende em pé) |
| no ar SF/SFT `jlp` `jhp` | Voo do morcego (apelido) | `jtop` | o mesmo quadro (`montar.ts:144` usa o `jkick`) | igual |
| agarrão `throw` | **Banda** (proposta, §5.4) | hoje: as poses da cabeçada | — | — |

Defesa e movimento:

| Pose | Proposta |
|---|---|
| `block` | **esquiva lateral com o braço de defesa**: tronco desviando para trás e para a esquerda, antebraço da frente diante do rosto com a mão aberta e a palma para fora, a outra mão baixa |
| `cblock` | **cocorinha** = apelido do `crouch` (mesma folha, 0 crédito) |
| `jup`, `jtop` | mãos soltas e abertas, um joelho subindo; o `jtop` com os joelhos recolhidos e os braços abertos |
| esquiva (`crouch` → `land`) | já é a cocorinha: manter |

### 4.2 Especiais

| Especial | Nome na tela | Golpe de capoeira | Quadros (proposta) | No jogo |
|---|---|---|---|---|
| `sFire` | **ONDA VERDE** (mantém) | **meia-lua de frente** que solta a onda: a meia-lua de energia nasce do arco do pé | `sa0`: ginga, peso na perna da frente, a de trás começando a subir. **`sa1`: a perna esticada no topo do arco, na altura da cabeça, sola de frente para o rival** (disparo). `sa2`: a perna descendo à frente, braços abertos. `sa3`: volta à ginga = cópia do `idle1` | projétil bumerangue, sem mudança. **Atenção (Vega):** o ponto de saída do projétil vem do `tipY` do `sa1` (`montar.ts:215`). Com o pé no alto, a onda nasceria na altura da cabeça. Fixar `alturaDoProjetil` com o valor de hoje |
| `sDown` | **RABO-DE-ARRAIA** (mantém) | giro baixo com as mãos no chão e o calcanhar varrendo rente | `sb0`, `sb1` e `sb2` como estão. **`sb3` = volta à ginga, cópia do `idle0`** | baixo, derruba, `rm` 2,8, sem mudança |
| `sFwd` | **MEIA-LUA** (mantém o nome curto) | **meia-lua de compasso**, solta no ar | `crouch` (cocorinha) → `sc0` (impulso, como está) → **`sc1` novo: o corpo dobrado e girando, uma mão estendida para o chão, a perna esticada passando em arco alto por cima, calcanhar descendo no rival** (o mesmo desenho do close FILME `f2`) → `sb2` (queda em negativa, já é o roteiro) | salto, `over`, sem mudança |

Textos de `info` propostos (para a Vega aplicar em `caio.ts`, se o dono aprovar):
- ONDA VERDE: "Meia-lua de frente que solta uma onda verde. VAI e VOLTA como bumerangue; pode acertar na volta."
- RABO-DE-ARRAIA: mantém ("Rasteira giratória de alcance enorme. Golpe BAIXO que derruba.").
- MEIA-LUA: "Meia-lua de compasso: a mão vai ao chão e o calcanhar desce do alto. Golpe ALTO: só se defende em pé."

**Alternativa para o `sFwd` (decisão do dono, não recomendo agora):** a meia-lua de compasso real é de chão. Plantar
a mão exigiria trocar o `type: 'leap'` por um golpe de chão. Isso mexe em S/A/R, no nível e no balanço (harness a
49,7%). A versão "solta" do quadro acima mantém o salto e lê como compasso, porque o close do filme já mostra o
compasso e o `sc1` vai repetir o mesmo desenho.

### 4.3 Combos próprios

Os dois combos de hoje **já fazem sentido em capoeira**. O que os desmentia era a arte da f3. Com a f3 nova:

| Combo | Sequência (dado, não muda) | Como lê com a arte nova |
|---|---|---|
| **VOLTA AO MUNDO** (`caio-ginga-rasteira`) | ↓CF › ↓CF › ↓CFT, final `cruza` | chapa baixa › chapa baixa › **rasteira**, e passa para o outro lado. Na roda, "volta ao mundo" é circular e voltar em outra posição: o `cruza` é exatamente isso. É o "rasteira → aú" do pedido. O aú desenhado na travessia fica como pendência (§5.4) |
| **SÃO BENTO GRANDE** (`caio-meia-lua-encadeada`) | CF › CFT › →ESP, `semQueda [1]` | **bênção › armada › meia-lua de compasso**. É a sequência mais clássica da roda: empurra, gira e fecha com o compasso. O efeito "segura em pé e fecha na MEIA-LUA" continua certo |

Combo extra (só se o dono quiser um 3º; hoje a tela tem 2 por lutador e a régua de largura do nome vale):
**CHAMADA** — SF › SFT › ↓ESP: galopante › cabeçada › rabo-de-arraia. A mão distrai, a cabeçada entra, e o giro rente
derruba. São só golpes de chão, com o especial no fim, e cabe nas regras de `validarCombosProprios`. Antes, medir o nome
na régua (`tests/unit/combos-nomes.test.ts`).

---

## 5. Folhas a regerar (lista mínima)

### 5.1 Resumo

| # | O quê | Crédito | Substitui |
|---|---|---|---|
| G1 | **f3 v2 — golpes de capoeira** (12 células) | 6 | `caio-f3-golpes-v1.png` inteira |
| G2 | **CR2 — reposição** (12 células: 6 da f4, 1 da f2, com segunda tentativa nas difíceis) | 6 | `sa0`, `sa1`, `sa2`, `sc1`, `jkick`, `win` (f4); `block`, `jup`, `jtop` (f2) |
| C1 | `cblock` = apelido do `crouch` | 0 | mapa da f2 em `lutadores.json` (mesma folha, como o `walk5`/`walk6` da f1) |
| C2 | `sa3` = cópia do `idle1`; `sb3` = cópia do `idle0` | 0 | transplante por máscara para uma `caio-f4-especiais-v3.png` (âncora no pé de apoio, como na AMINU f3 v3) |
| — | FILME, f1, `sb0`, `sb1`, `sb2`, `sc0`, `crouch`, reações | 0 | nada |

**Total: 12 créditos.** Se a CR2 falhar numa pose (o modelo insiste em soco reto e punho no alto, como no BAATAR), a
lição vale: depois de 2 tentativas, aceite e ajuste a caixa de acerto.

### 5.2 Referência (antes de gerar)

- Recortar por código o `idle0` da `caio-f1-base-v2.png` (L1C1, depois da limpeza da linha de chão) e salvar em
  `arte-fonte/lutadores/caio/referencia/caio-ref-ginga-v1.png`. **Anexar só essa imagem.** A mestra está em guarda de
  boxe e devolveria os punhos.
- Risco de eco: as poses parecidas com a ginga (`win`, `block`) podem voltar como a própria referência. Rodar o
  `difcruz.ps1` de cada célula contra a referência e reprovar se a diferença ficar abaixo da respiração do idle
  (32,6%, a menor da f1 v2).

### 5.3 Prompts prontos (montagem: BLOCO A geral + este BLOCO B + o BLOCO C da folha; formato 4:3, 2K, fundo magenta)

**BLOCO B-capoeira (substitui o BLOCO B do CAIO nas folhas de ação):**
```
CHARACTER — CAIO: Afro-Brazilian capoeira master from Rio de Janeiro, about 27 years old, lean and muscular, long limbs, agile. Dark brown skin, determined eyes, short beard shadow. Shoulder-length dreadlocks tied back in a high ponytail with a lime-green hair tie. Bare-chested, with a black tribal tattoo on the shoulder and upper arm nearest the viewer when he faces right. White loose capoeira abada trousers with a white waistband. A braided green-and-yellow capoeira cord tied at the waist, its two long ends hanging at the left hip with one green tassel and one yellow tassel. Barefoot. No shirt, no shoes, no jewelry.
MOVEMENT STYLE: capoeira. His hands are ALWAYS OPEN, fingers loose and slightly spread, in every cell: NEVER a closed fist, never a boxing guard. Knees bent, body low and swaying. Kicks are swinging arcs with a straight leg or flat-sole pushes, never a karate or taekwondo chambered snap kick.
Same face, costume, body proportions and size as the attached reference image; the POSE comes only from each cell's description, never from the reference. Background color: solid flat magenta #FF00FF.
```

**BLOCO C — G1, f3 v2 (salvar em `arte-fonte/lutadores/caio/folhas/_candidatas/caio-f3-golpes-capoeira-v1.png`):**
```
SHEET 3 — CAPOEIRA NORMAL ATTACKS. Exactly 12 poses in 4 columns and 3 rows, one per cell, as listed.
Row 1: (1) open-hand slap wind-up: low ginga stance, the arm nearest the viewer drawn back behind the shoulder, the hand OPEN and cupped, the other forearm in front of the face with an open hand. (2) open-hand slap: the same arm swung forward in a flat horizontal arc, the cupped OPEN palm at face height at the far right, the other open hand guarding the face. NOT a punch. (3) head-butt wind-up: crouching forward, chin tucked, eyes up toward the right, both open hands low near the knees. (4) head-butt: the body lunging forward almost horizontal at chest height, the top of the head leading toward the right, the back leg stretched behind pushing off, both arms swept back along the body with open hands.
Row 2: (1) push-kick chamber: upright on the back leg, the front knee raised high in front of the chest, the sole of the front foot facing right, one forearm across the face with an open hand. (2) push kick: the front leg fully extended straight forward at stomach height, the flat SOLE pushing toward the right, toes up, torso leaning slightly back, one open hand in front of the face, the other arm low. (3) spinning kick start: his BACK turned toward the viewer, head looking back over the shoulder to the right, weight on the front foot, both arms opening wide and low. (4) spinning crescent kick: the kicking leg kept STRAIGHT and swinging horizontally at head height, the outer edge of the foot and the heel at the far right, torso leaning away to the left, both arms open low for balance.
Row 3: (1) low elbow strike: deep crouch, the elbow nearest the viewer driving forward horizontally at stomach height, that forearm folded across the chest with the hand OPEN, the other open hand on the knee. (2) low sole push: sitting very low on the fully bent back leg, one hand flat on the baseline behind him, the FRONT leg extended to the right at shin height, the flat sole pushing forward. (3) hooking sweep: crouching very low on one fully bent leg, both hands flat on the baseline, the other leg stretched far to the RIGHT along the baseline, the foot hooked at ankle height. The stretched leg points to the right, never backward. (4) rising kick: rising out of a deep squat, the leg nearest the right edge swinging STRAIGHT up in a high outside arc, the foot above his own head, torso leaning back, both arms open for balance.
Every hand is open. No motion lines, no arcs drawn, no trails, no dust.
```

**BLOCO C — G2, CR2 (salvar em `.../folhas/_candidatas/caio-cr2-capoeira-v1.png`):**
```
SHEET R2 — CAPOEIRA REPLACEMENT POSES. Exactly 12 poses in 4 columns and 3 rows, one per cell, as listed.
Row 1: (1) crescent kick start: ginga stance, weight on the front leg, the back leg starting to swing up from behind, arms open and low. (2) front crescent kick: the back leg swinging STRAIGHT across in front of the body in a high inside-to-outside arc, the foot at head height at the top of the arc toward the right, the sole facing right, torso upright, one open hand in front of the face. (3) after the crescent kick: the kicking leg coming down in front with the knee bent, about to land, both arms open wide, a confident grin. (4) victory call: relaxed upright ginga, one arm raised forward with the OPEN hand palm up, inviting, the other open hand low, a big mischievous smile.
Row 2, cells 1 and 2 (two versions of the same flying compass kick): the body folded low and turned, one hand stretched down toward the baseline below the chest, head looking to the right under his own arm, the other leg STRAIGHT and swinging in a high arc over the top, the heel leading and coming down toward the right. Row 2, cells 3 and 4 (two versions of a flying double kick): in the air, body leaning back, BOTH legs extended together diagonally down toward the right, both soles leading, arms open behind him.
Row 3, cells 1 and 2 (two versions of a capoeira side dodge): knees bent, the torso leaning away to the LEFT, the forearm nearest the viewer raised in front of the face with an OPEN hand, palm out, the other open hand low near the baseline. Row 3, cell 3: jump apex: knees tucked, both arms loose and open, open hands. Row 3, cell 4: jump rising: the body going up, one knee rising, both arms swinging up, open hands.
Every hand is open. No motion lines, no arcs drawn, no trails, no dust.
```

Mapa da CR2 para o pipeline: L1C1 `sa0`, L1C2 `sa1`, L1C3 `sa2`, L1C4 `win`, L2C1/L2C2 `sc1` (a melhor), L2C3/L2C4
`jkick` (a melhor), L3C1/L3C2 `block` (a melhor), L3C3 `jtop`, L3C4 `jup`. A Vega decide entre uma `folhasExtras.cr2`
(grade [4,3], `null` nas recusadas) e o transplante por máscara para v3 das folhas.

**Checagem depois de gerar** (`curadoria-medir.mjs` + olho):
- 12 componentes. "Spin", "sweep" e "kick" puxam rastro e linha de chão; contar componentes acha os dois;
- **nenhum punho fechado** em 12 de 12 (a olho, com zoom nas mãos). É o critério de reprovação do dono;
- `sweep` e `sa1`: a perna que golpeia sai do lado **direito** da figura;
- `hk1`: a perna reta, sem joelho armado;
- escala: pé de trás de perfil com 57 a 59 px (régua do relatório do CAIO §2.6);
- eco contra a referência de ginga (§5.2).

### 5.4 Pendências de código (não são folhas)

- **Banda no agarrão:** `animFor` já aceita `anim.throw` por lutador (`src/data/anim.ts:54`). Hoje o agarrão do CAIO
  desenharia a cabeçada. Para a banda são precisos 2 quadros novos (pé atrás do calcanhar + mão no peito; o puxão). Ficam
  para uma f5 do CAIO, que já tem a linha 3 escrita (ginga, aú e provocação; `plano-arte-lacunas` §2.4). Não entra na
  lista mínima.
- **Aú na travessia do VOLTA AO MUNDO:** depende de como o `cruza` desenha o deslocamento. O aú cabe na mesma f5.

---

## 6. Impacto no código (para Vega e Lyra, depois da arte aprovada)

1. **Ponta do `sa1`:** passa de soco para chute. Pedir `ponta: { sa1: 'direita' }` em `ferramentas/sprites/lutadores.json`
   (`caio`), como já existe para `sb1` e `sc1`.
2. **Altura do projétil:** fixar `alturaDoProjetil` no `caio.ts` com o valor de hoje (`tipY(sa1) × scale`, medido no
   atlas atual ANTES da troca). Sem isso, a ONDA VERDE sai na altura da cabeça.
3. **Calibração das caixas:** os `rm` e `bh` do `caio.ts` foram calibrados contra a arte de hoje
   (`tests/unit/caio-arte-calibrada.test.ts`). Com a f3 nova, o teste vai acusar. Recalibrar para a mesma largura e rodar
   o harness (a referência é 49,2% a 49,7%).
4. **Apelido do `cblock` e cópias do `sa3`/`sb3`:** mapa da f2 e f4 v3 (§5.1, C1 e C2).
5. **Textos de `info`** dos especiais (§4.2), se o dono aprovar.
6. **Nada muda** em `roteiros-filme.ts`, `filmes.ts`, nos combos nem na página FILME.

---

## 7. Três referências visuais (descritas, para o gerador e para quem cura)

**R1 — Meia-lua de compasso, momento do impacto (modelo do `sc1` e do close `f2`).**
Plano lateral, câmera na altura do quadril. O capoeirista está dobrado quase em ângulo reto: a mão do lado da câmera
apoiada no chão, sob o peito, e a cabeça baixa, olhando o alvo por baixo do próprio braço (nunca de costas sem olhar).
A perna de trás fica dobrada e plantada. A perna que chuta sobe esticada num arco que passa acima da linha da cabeça do
rival, com o calcanhar à frente e os dedos do pé puxados. A abadá branca faz uma diagonal limpa do chão ao pé, e o cordão
verde e amarelo cai na direção do chão, mostrando a gravidade invertida. Leitura em silhueta: um "compasso" aberto, com
a ponta seca no chão (a mão) e a outra traçando o círculo.

**R2 — Armada, meio do giro (modelo do `hk0`/`hk1`).**
Dois tempos. No preparo, o lutador está de costas para a câmera, a tatuagem fica escondida e o rosto aparece por cima do
ombro, olhando o rival com malícia, enquanto os braços se abrem como asas baixas. No ativo, a perna gira **esticada**, sem
joelho armado, varrendo na horizontal na altura da cabeça, com a borda externa do pé à frente. O tronco se inclina para o
lado oposto, em contrapeso. Os dreads e as borlas voam na direção do giro: é o único "rastro" permitido, porque é do
corpo, não é efeito desenhado. Leitura: um ponteiro de relógio passando na altura da cabeça.

**R3 — Ginga com braço de defesa e esquiva (modelo do `idle`, do `block` e da referência §5.2).**
Base em triângulo: o pé de trás recua na diagonal e o da frente fica plantado, joelhos dobrados e quadril baixo. O braço
do lado da perna de trás cruza diante do rosto, com o antebraço vertical e a mão aberta, palma para fora; a outra mão fica
solta perto da coxa. Na esquiva, o mesmo braço continua protegendo enquanto o tronco desce e se afasta do golpe. A cabeça
nunca sai da linha do olhar do rival, e o sorriso é de quem está brincando: é jogo, não briga. É isso que separa a
capoeira do boxe na silhueta: **nenhum punho fechado e o corpo sempre em movimento lateral**.

---

## 8. Arquivos

- Este documento: `docs/caio-capoeira-auditoria.md`.
- Lidos: `src/data/lutadores/caio.ts`, `src/data/base-moves.ts`, `src/data/anim.ts`, `src/data/montar.ts`,
  `src/data/combos-proprios.ts`, `src/data/filmes.ts`, `src/data/roteiros-filme.ts`, `ferramentas/sprites/poses.mjs`,
  `ferramentas/sprites/lutadores.json`, `docs/relatorio-curadoria-caio-v1.md`, `docs/curadoria-filme-grupo-b.md`,
  `docs/prompts-arte.md`, `docs/plano-arte-lacunas-2026-10-23.md`, `docs/combos-proprios.md`.
- Folhas conferidas (cópias reduzidas, só no scratchpad): `caio-f1-base-v2`, `caio-f2-reacoes-v2`, `caio-f3-golpes-v1`,
  `caio-f4-especiais-v2`, `caio-filme-pagina-v1`, `caio-mestra-v1` e `caio-ref-guarda-v1`.
