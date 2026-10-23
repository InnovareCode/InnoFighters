# Spec Técnica: Revisão do Motor de Luta

Autora: Nova (arquiteta de software), 2026-10-22. Status: **proposta técnica para implementação** (Vega no motor/dados, Lyra no render/cinemática/câmera, Cronos nas regras/storage, Íris no QA/balanço). Base técnica consultada: `src/core/contratos.ts`, `src/fight/{fighter,game,colisao,comandos,cpu}.ts`, `src/render/{cinematica,sessao-especial,mundo,camera}.ts`, `src/data/{base-moves,montar,tipos}.ts`, `src/data/lutadores/*.ts`, `docs/balanco/frame-data.md`, `docs/spec-esquiva-e-cinematica-especial.md` e `docs/mecanicas-e3.md`.

---

## 0. Contexto, Hipóteses e Objetivos

O InnoFighters possui 10 lutadores implementados e funcionais (`hayato`, `wei-long`, `min-ji`, `caio`, `centella`, `camille`, `nila`, `aminu`, `baatar`, `zenon`). O motor atual herdou do protótipo regras genéricas que geram quatro gargalos perceptíveis de jogabilidade:

1. **Combos homogêneos e excesso de buffer permissivo:**
   - O buffer de ataque atual de 9 ticks (150 ms) causa "ghost inputs" e buffering involuntário em trocas rápidas de botões.
   - O cancelamento atual (`Fighter.updateMove:766`) aceita encadear qualquer golpe de rank menor em rank maior (`rank < 9`), desde o início da fase ativa até o último frame de recuperação (`mt >= S`), sem distinguir janela estrita de cancelamento nem respeitar a identidade de cada lutador.
2. **Especiais com dano descalibrado:**
   - A base atual dos especiais varia entre 8 e 20 (muitos tiram 10 a 14), o que é baixo demais para um recurso que custa de 20% a 45% de barra de energia (frequentemente tirando menos dano que um chute forte `hk` normal, que varia entre 12 e 15).
   - Se o dano base subir para a faixa competitiva (~25 a 35), a fórmula de scaling atual (`Math.max(0.5, 1 - 0.1 * gotHits)`) com piso fixo de 50% causaria combos de 60% a 70% da vida total (92 a 112 HP), tornando o jogo punitivo demais ("two-touch kill").
3. **Ritmo da cinemática e impacto visual:**
   - A cinemática existente (`Cinematica` de 48 ticks completa / 20 ticks curta) pausa a luta na apresentação (`fight.ts`), mas ainda não possui zoom cinematográfico dinâmico centrado na ação nem hitstop de impacto calibrado nos golpes finais dos especiais.
4. **Frame data e fluidez dos golpes normais:**
   - Alguns golpes leves possuem startups ou recuperações que não conversam com o arquétipo do personagem (ex: jabs com alcances desconectados, chutes pesados sem punição justa ou sweeps com blockstuns idênticos a golpes médios).

### Hipóteses Declaradas
- **Escala e Plataforma:** Jogo de luta arcade/versus 2D em Canvas, local, 60 fps cravados, desktop e celular (toque).
- **Isolamento de Regressão:** O motor mantém compatibilidade com o oráculo do protótipo (`tests/fixtures/dados-prototipo/originais.json` e `tests/unit/luta-fidelidade.test.ts`) através do isolamento de flag `ConfigPartida.revisaoMotor`, seguindo o precedente bem-sucedido de `ConfigPartida.esquiva`.
- **Taxa de Vida Nominal:** Barra de vida padrão entre 92 e 112 HP (média 100). Um especial isolado deve causar ~25% a 35% de vida; em combo escalado longo, nunca deve passar de 45% do dano total acumulado no combo.

---

## 1. Decisão Estrutural e Arquitetura do Motor

| # | Decisão | Por quê | Alternativa Descartada |
|---|---|---|---|
| **M0** | **Flag de motor `revisaoMotor` no `ConfigPartida` (padrão true em produção, false no oráculo de fidelidade).** | Permite que a produção desfrute de buffer de 4 ticks, novas rotas de combo, janelas de cancel estritas e scaling moderno, sem quebrar os testes de lock-step tick-a-tick contra o protótipo legado (`tests/unit/luta-fidelidade.test.ts`) nem `?expansao=4`. | Quebrar os testes de fidelidade do protótipo ou duplicar o arquivo `fighter.ts`. |
| **M1** | **Hit-Cancel Estrito (`cancelWindow`) em substituição ao cancelamento na recuperação inteira.** | Hoje o jogador pode cancelar um golpe 15 ticks após o impacto (durante o recovery). A janela estrita exige cancelar durante os frames ativos ou nos primeiros 2 a 3 ticks de recuperação de impacto. | Manter cancel na recuperação toda (faz o jogo parecer frouxo e desconectado). |
| **M2** | **Buffer de Ataque configurado em 4 ticks (66,6 ms).** | 9 ticks permitia apertar botões no pânico que saíam muito depois. 4 ticks é o padrão da indústria (Street Fighter 6 usa 4 frames; Guilty Gear Strive usa 3-4 frames). Absorve imprecisão de toque sem atraso perceptível. | 1 tick (estrito demais para celular/touchpad) ou 2 ticks (frustrante em telas 60Hz com leve variação de input). |
| **M3** | **Novo Sistema de Scaling de Combo: Proration de Starter + Decaimento Progressivo + Piso Mínimo de Especial.** | Evita *1-hit kill* ou combos degenerados de 70% de vida, garantindo ao mesmo tempo que gastar barra de especial no final de um combo longo sempre cause dano mínimo recompensador. | Piso fixo de 50% (atual) ou decaimento linear sem piso (onde especial tiraria 1 de dano). |
| **M4** | **Zoom Dinâmico de Câmera na Apresentação (`render/cinematica.ts` e `render/mundo.ts`).** | A cinemática já roda fora do motor (`game.update` não anda). O zoom cinematográfico (1.20x a 1.25x ancorado no atacante) dá a dramaticidade do anime sem dessincronizar o motor. | Mudar o zoom dentro de `Game.cam` (poluiria a lógica do motor com estética de apresentação). |

---

## 2. Combos por Personagem

### 2.1 Rotas de Cadeia (Chain Routes / Target Combos)

Hoje, qualquer golpe normal encadeia em qualquer golpe de rank maior (`rank 1: lp/clp → rank 2: lk/clk → rank 3: hp/chp → rank 4: hk/chk → rank 9: especiais`). Isso cria uma esteira universal genérica. A revisão introduz:

1. **Cadeia Universal (Gatling Padrão):**
   - `Leve (rank 1/2)` → `Forte (rank 3/4)` → `Especial (rank 9)`.
   - Golpes do mesmo botão mantêm repetição rápida se declararem `rep: 1` (ex: `lp → lp → lp` em MIN-JI e HAYATO).
   - Chutes baixos (`clk`) cancelam em golpes fortes ou especiais apenas no acerto (*hit-confirm*).
2. **Rotas Específicas por Arquétipo (`LutadorDef.rotasCombo`):**
   Para dar identidade aos 10 lutadores, o motor aceita opcionalmente em `LutadorDef` uma lista explícita de transições autorizadas (`rotasCombo?: Record<string, readonly NomeGolpe[]>`). Quando ausente, aplica a Cadeia Universal refinada.

#### Tabela de Rotas de Cadeia por Lutador

| Lutador | Arquétipo | Rotas Características de Combo | Estilo de Finalização |
|---|---|---|---|
| **HAYATO** | All-Around (Shoto) | `lp → hp → sFwd` (Kaminari-Step)<br>`clp → clk → sFire` (Raijin-Dan)<br>`jhk → hp → sDown` (Raijin-Ken) | Versátil: projétil a média distância, DP no anti-aéreo e rush para encurtar. |
| **WEI LONG** | Juggernaut / Heavy Kung Fu | `lk → hp → sFwd` (Tie Shan Kao com armadura)<br>`clp → chp → sDown` (Zhen Di baixo)<br>`hp → sFire` (Long Zhang, palma gigante) | Poucos hits, alto impacto e pushback massivo; cancelas pesadas com armadura. |
| **MIN-JI** | Rushdown / Taekwondo | `lp → lp → lk → hk → sDown` (Hoeri Chagi 3x)<br>`clp → clk → sFwd` (Twio Yeop Chagi)<br>`jlk → clp → hp → sFire` (Bulkkot lâminas duplas) | Magic series longa; múltiplos acertos rápidos com scaling severo no final. |
| **CAIO** | Zoner / Mobile Capoeira | `lk → hk → sDown` (Rabo-de-Arraia)<br>`clp → clk → sFire` (Onda Verde bumerangue)<br>`jhk → lk → sFwd` (Meia-Lua over) | Pokes longos de perna encadeando em rasteiras de longo alcance e bumerangue. |
| **CENTELLA** | Acrobática / Lucha Libre | `lp → lk → sFire` (Plancha overhead)<br>`jhp → hp → sFwd` (Resorte na corda)<br>`clp → lk → sDown` (Huracanrana anti-aérea) | Links curtos no chão para armar setups aéreos ou quiques de parede. |
| **CAMILLE** | Counter / Savate Esgrima | `lk → clk → sDown` (Coup d'Arrêt contragolpe)<br>`lp → hp → sFwd` (Revers pelas costas)<br>`Parade bem-sucedida → sResp` (Fouetté automático) | Gatlings de toque leve com confirmação em golpes que cruzam ou punem no contra. |
| **NILA** | Stance / Kalaripayattu | **GAJA (Elefante):** `lp → hp → sFire` (Golpe Marma 46hs)<br>`hp → sFwd` (Passo do Elefante)<br>**SARPA (Serpente):** `clp → clk → sFire` (Bote rasteiro rente)<br>`lk → hp → sFwd` (Salto da Serpente) | GAJA atordoa para combos pesados; SARPA desliza sob projéteis e comba baixo. |
| **AMINU** | Charge Tank / Dambe | `lp → hp → sFwd` (Passo do Leão)<br>`clp → hp → sFire` (Mashi carga instantânea Nível 1)<br>`hk (KD) → setup de Mashi carregado (Nível 2/3)` | Encadeia socos pesados em investidas de empurrão; quebra guarda em setups. |
| **BAATAR** | Grappler / Bökh | `lk → hp → sDown` (Quebra-Base)<br>`clp → clk → sFwd` (Mergulho da Águia)<br>`hp (KD) → oki de sFire` (Arremesso do Avarga inbloqueável) | Foco em knockdown com golpes de armadura para aplicar pressão de agarrão. |
| **ZENON** | Boss / Pancrácio Arconte | `lp → hp → sFwd` (Tributo com dreno)<br>`clp → chk → sFire` (Selo do Arconte)<br>`jhp → hp → sDown` (Coluna de Ônix anti-aérea) | Golpes de alcance teatral encadeando em dreno de energia e projéteis lentos. |

### 2.2 Janelas de Cancel (Hit-Cancel Estrito)

#### O Problema Atual
Em `src/fight/fighter.ts:766`:
```ts
} else if (!mv.air && mv.rank < 9 && this.connected && this.mt >= mv.S && this.buf) {
  // Cancela em qualquer momento após S, inclusive durante todo o R (recuperação)!
```
Se um golpe tem `S: 4, A: 3, R: 14`, o jogador pode conectar no frame 4 e apertar o botão no frame 18 (14 frames depois!), e o especial ainda é acionado cancelando a animação de recuo. Isso anula a necessidade de precisão e faz o jogo parecer lento e gelatinoso.

#### Regra Proposta: `cancelWindow`
1. O cancelamento só é permitido durante:
   $$\text{Janela} = [mv.S,\, mv.S + mv.A + K_{\text{cancel}}]$$
   onde $K_{\text{cancel}} = 2$ ticks de recuperação.
2. **Hit-Cancel Obrigatório:**
   - O golpe DEVE ter colidido (`this.connected === true`).
   - **Whiff-Cancel Proibido:** Se o golpe passar no vazio, o lutador é obrigado a passar por todos os frames de recuperação ($R$) sem poder cancelar em especial ou golpe mais forte.
3. **Cancel no Bloqueio (Block-Cancel):**
   - Golpes normais leves e médios podem cancelar em projéteis (`type: 'fire'`) ou investidas seguras no bloqueio para criar pressão (*blockstring*).
   - Especiais do tipo anti-aéreo/reversal (`type: 'rise'`, ex: Raijin-Ken, Coluna de Ônix) NÃO podem ser cancelados no bloqueio — só saem se o golpe anterior tiver acertado no hit limpo (impede que o atacante fique 100% seguro gastando barra sem confirmar).

### 2.3 Buffer de Comando (3 a 5 Ticks)

- **Valor Atual:** `this.buf = { k, t: 9 }` (9 ticks = 150 ms).
- **Valor Proposto:** `BUFFER_ATAQUE = 4` ticks (66,6 ms) com tolerância dinâmica:
  - No chão em estado livre: buffer de **4 ticks**.
  - Durante hitstop de acerto ou bloqueio: o buffer não decai enquanto `game.hitstop > 0` (o jogador pode bufferizar a entrada durante o congelamento de impacto e ela sai no primeiro frame acionável — *reversal buffer*).
  - Durante o levantar de knockdown (`state === 'down'`): buffer de **5 ticks** antes de ficar de pé para facilitar saídas de reversão sem exigir timing de 1 frame.

### 2.4 Fluidez de Recuperação (Recovery Frames e Vantagem)

Para que o combate pareça fluido:
- **Dead frames removidos:** Golpes que terminam voltam para `idle` ou `crouch` imediatamente no frame $S + A + R$, sem ticks intermediários de pose morta.
- **Transição de Pouso (`land`):** Pousar de um pulo neutro tem 3 ticks de recuperação que podem ser cancelados imediatamente por bloqueio ou esquiva. Pousar após um golpe aéreo tem recovery proporcional ao peso do golpe (`jlp`: 3 ticks; `jhk`: 5 ticks).
- **Blockstun Calibrado:** Golpes leves garantem vantagem de frame neutra ou levemente negativa (-1 a 0), permitindo continuar a pressão ou defender. Golpes pesados em pé deixam o atacante em -4 a -6 se bloqueados de perto, permitindo punição se mal espaçados.

---

## 3. Balanceamento de Dano dos Especiais e Sistema de Scaling

### 3.1 Escala Atual x Proposta de Dano Base dos Especiais

Hoje, a maioria dos especiais causa entre 10 e 18 de dano. Para um recurso que exige 20 a 45 de energia, o jogador sente que "o especial não compensa o risco".

**Nova Faixa Padrão:** Dano base nominal entre **25 e 35** para especiais de consumo pleno (30 a 45 energia). Especiais leves ou de utilidade (custo 20-25) situam-se em 20-25.

#### Tabela Comparativa de Especiais (10 Lutadores)

| Lutador | Especial | Tipo | Custo | Dano Atual | Dano Proposto | Justificativa de Balanceamento |
|---|---|---|---|---|---|---|
| **HAYATO** | `sFire` (Raijin-Dan) | Projétil | 40 | 15.0 | **28.0** | Projétil clássico de alto custo; deve punir zoneamento rival. |
| | `sDown` (Raijin-Ken) | Rise (DP) | 30 | 16.0 | **30.0** | Anti-aéreo arriscado; recompensa punição vertical limpa. |
| | `sFwd` (Kaminari-Step) | Rush | 20 | 11.0 | **22.0** | Golpe rápido de aproximação; fecha combos com dano moderado. |
| **WEI LONG** | `sFire` (Long Zhang) | Projétil | 45 | 20.0 | **35.0** | O projétil mais lento e devastador do jogo. 45 de barra. |
| | `sDown` (Zhen Di) | Projétil Baixo | 28 | 13.0 | **24.0** | Terremoto baixo que força pulo ou agacho; dano equilibrado. |
| | `sFwd` (Tie Shan Kao) | Rush / Armadura | 35 | 19.0 | **32.0** | Ombrada pesada que absorve impacto; deve recompensar o trade. |
| **MIN-JI** | `sFire` (Bulkkot) | 2x Lâminas | 30 | 8+8 (16) | **14+14 (28.0)** | Duas lâminas rápidas. 14 por tiro; ambas conectam se confirmadas. |
| | `sDown` (Hoeri Chagi) | Rise 3 hits | 28 | 6x3 (18) | **10x3 (30.0)** | Chute tornado de 3 acertos; anti-aéreo icônico. |
| | `sFwd` (Twio Yeop Chagi)| Leap Voadora | 22 | 12.0 | **23.0** | Voadora rasante rápida; finalizadora de combos leves. |
| **CAIO** | `sFire` (Onda Verde) | Bumerangue | 38 | 14.0 | **26.0** | Meia-lua que vai e volta; 26 no primeiro toque (10 na volta se pegar). |
| | `sDown` (Rabo-de-Arraia)| Rasteira Longa | 24 | 13.0 | **24.0** | Rasteira de varredura imensa; derruba em knockdown limpo. |
| | `sFwd` (Meia-Lua) | Leap Overhead | 20 | 14.0 | **23.0** | Golpe alto que quebra defesa agachada; custo baixo e dano ágil. |
| **CENTELLA** | `sFire` (Plancha) | Leap Overhead | 25 | 14.0 | **25.0** | Salto alto e queda de corpo; quebra guarda agachada com impacto. |
| | `sDown` (Huracanrana) | Agarrão Ar | 25 | 18.0 | **32.0** | Agarrão aéreo de alta dificuldade de acerto; recompensa massiva. |
| | `sFwd` (Resorte) | Rebote Corda | 30 | 8..18 | **18..34** | Base 18 + até 16 pelo percurso de corrida na corda (recompensa distância). |
| **CAMILLE** | `sFire` (Parade) | Aparar | 25 | 0 (postura)| **0** | Postura defensiva que aciona `sResp` (Fouetté) ao aparar golpe médio/alto. |
| | `extras.sResp` (Fouetté)| Resposta Parade| 0 | 12.0 | **32.0** | O contra-ataque da Parade; deve punir severamente quem atacou nela. |
| | `sDown` (Coup d'Arrêt)| Melee Baixo | 20 | 9.0 (13.5) | **18.0 (27.0)** | Base 18; vira 27 se acertar o rival na preparação do golpe dele. |
| | `sFwd` (Revers) | Rush Cruzado | 30 | 13.0 | **26.0** | Passa pelas costas e inverte a guarda; recompensa mixup limpo. |
| **NILA** | `sFire` (Golpe Marma) | Melee Atordoar | 20 | 6.0 | **16.0** | Dano intencionalmente moderado porque concede 46 ticks de stun para combo. |
| | `sFwd` (Passo Elefante)| Rush Pesado | 25 | 12.0 | **27.0** | Avanço pesado com as duas mãos que arremessa o rival contra o canto. |
| | `SARPA.sFire` (Bote) | Rush Baixo | 20 | 8.0 | **24.0** | Rasteira que passa sob projéteis; pune projéteis com dano sólido. |
| | `SARPA.sFwd` (Salto) | Leap Parafuso | 25 | 14.0 | **28.0** | Salto acrobático em parafuso; golpe alto punitivo. |
| **AMINU** | `sFire` (Mashi Nível 1)| Carga Instantânea| 25 | 8.0 | **22.0** | Direto simples sem segurar; poke sólido com barra. |
| | `sFire` (Mashi Nível 2)| Carga Média | 25 | 15.0 | **30.0** | Segurado 30 ticks; derruba e causa impacto pesado. |
| | `sFire` (Mashi Nível 3)| Carga Máxima | 25 | 22.0 | **38.0** | Segurado 70 ticks; QUEBRA GUARDA e causa o maior dano de soco único. |
| | `sDown` (Garkuwa) | Escudo Projétil| 22 | 5.0 | **12.0** | Função utilitária de absorver projéteis frontais. |
| | `sFwd` (Passo do Leão)| Rush Escudo | 30 | 10.0 | **26.0** | Investida de ombro e escudo com pushback de parede. |
| **BAATAR** | `sFire` (Avarga) | Agarrão Comando| 30 | 22.0 | **35.0** | Agarrão de comando inbloqueável de longo alcance; 35 de dano puro. |
| | `sDown` (Quebra-Base) | Rasteira Armadura| 20 | 14.0 | **24.0** | Gancho de perna baixo com armadura; pune avanços rivais. |
| | `sFwd` (Mergulho Águia)| Leap Teleguiado | 35 | 10.0 | **27.0** | Voo alto rastreador; fecha distância longa com dano expressivo. |
| **ZENON** | `sFire` (Selo Arconte)| Projétil Anel | 35 | 14.0 | **28.0** | Anel de energia lento e amplo (sobe para 32 na Fase 2). |
| | `sDown` (Coluna Ônix) | Rise Anti-Aéreo| 30 | 15.0 | **30.0** | Joelhada mística ascendente com invulnerabilidade de arranque. |
| | `sFwd` (Tributo) | Rush Dreno | 30 | 10.0 | **22.0** | Causa 22 de dano e drena 12 de energia do adversário (20 na Fase 2). |

### 3.2 Novo Sistema de Scaling de Combo (Proration Anti-1-Hit-Kill)

#### O Risco Matemático
Com vida de 100 HP, se um combo padrão de 4 hits (`lp → lk → hp → Especial 32dmg`) usasse a escala antiga:
- Hit 1 (`lp`): $4 \times 1.0 = 4.0$
- Hit 2 (`lk`): $5 \times 0.9 = 4.5$
- Hit 3 (`hp`): $9 \times 0.8 = 7.2$
- Hit 4 (`sFwd` 32): $32 \times 0.7 = 22.4$
- **Total antigo:** $38.1$ de dano (38% da vida). Aceitável.
Mas em combos com starters pesados (`hp → hk → Especial 35` com contragolpe):
- Dano passaria de 65% em um único acerto com contra! Isso torna o jogo frustrante.

#### Nova Fórmula de Scaling: `escalaComboRevisada`

A nova escala opera com três regras combinadas:

1. **Decaimento Não-Linear por Hit:**
   - Hit 1: **100%** ($1.00$)
   - Hit 2: **80%** ($0.80$)
   - Hit 3: **65%** ($0.65$)
   - Hit 4: **50%** ($0.50$)
   - Hit 5: **40%** ($0.40$)
   - Hit 6+: **30%** ($0.30$)
   - Piso geral para golpes normais: **15%** ($0.15$).

2. **Starter Proration (Penalidade por Golpe Iniciador):**
   - Se o combo começa com golpe leve rápido (`lp`, `clp`, `lk`, `clk`), o multiplicador global de todos os hits subsequentes recebe uma proration inicial de **80%** ($0.80$). Impede que um jab de 2 ticks converta em combo de 40 de dano.
   - Se o combo começa com golpe pesado (`hp`, `hk`, `chp`, `chk`) ou **Contragolpe**, a proration inicial é de **100%** ($1.00$) — premiando a leitura tática e a punição de recovery do adversário.

3. **Piso Mínimo Garantido para Especiais (*Special Floor*):**
   - Especiais pagam barra (20 a 45 de energia). Para evitar que o especial no 6º hit tire 3 de dano, ele possui um piso garantido de **30%** do seu dano base nominal (ou mínimo de 8 pontos de dano líquido, o que for maior).

#### Implementação Pura em `src/fight/colisao.ts`:
```ts
export function escalaComboRevisada(gotHits: number, starterLeve: boolean, ehEspecial: boolean): number {
  const tabela = [1.0, 0.80, 0.65, 0.50, 0.40, 0.30];
  const base = gotHits < tabela.length ? (tabela[gotHits] as number) : 0.20;
  const comStarter = gotHits > 0 && starterLeve ? base * 0.80 : base;
  if (ehEspecial) return Math.max(0.30, comStarter);
  return Math.max(0.15, comStarter);
}
```

--- 

## 4. Cinemática do Especial: Pausa Dramática, Câmera e Impacto Visual

### 4.1 O Momento Exato da Pausa Dramática (Super Freeze)

- **Gatilho de Ativação:** O congelamento dramático dispara no momento exato em que o especial é acionado (`startMove`, com `mv.cost > 0`).
- **Estado do Motor durante o Freeze:** O motor permanece no tick inicial (`mt === 0` ou `mt === 1`), antes de qualquer hitbox ativa ser calculada. Nenhum projétil se move, nenhuma barra de vida cai e o relógio da partida não avança.
- **Duração do Freeze:**
  - **Modo COMPLETA:** **48 ticks (0,8 s)** na 1ª vez que o especial é visto na partida (estabelece o espetáculo e a dramaticidade da técnica).
  - **Modo CURTA:** **16 ticks (0,26 s)** nas repetições seguintes da mesma luta ou no Modo Treino/Competitivo. É um "flash freeze" rápido com halo colorido e rajada de partículas, sem arrastar o ritmo da luta.

### 4.2 Zoom Dinâmico de Câmera na Apresentação

Hoje, a cinemática desenha a tarja e o lutador por cima do fundo escurecido, mas o mundo permanece no zoom padrão de combate (1.0 a 1.075).

#### Regra da Câmera Cinematográfica
Durante o Super Freeze da cinemática:
1. **Foco e Âncora:** A câmera calcula o ponto central do atacante:
   $$X_{\text{foco}} = \text{clamp}(F_{\text{atacante}}.x,\, 240,\, 720),\quad Y_{\text{foco}} = \text{GROUND}$$
2. **Curva de Zoom:**
   - Ticks 0 a 6 (Entrada): Zoom interpola suavemente de $1.0\times$ até $1.25\times$ (Modo Completa) ou $1.15\times$ (Modo Curta) usando `ease.cubica`.
   - Ticks centrais (Exibição da Tarja / Estilo): Zoom sustentado em $1.25\times$ com leve *slow-pan* horizontal de 6 px na direção do golpe.
   - Ticks finais (Saída da Tarja, ticks 38 a 48): Zoom desacelera e retorna suavemente para a câmera real da partida em `ease.cubica`.
3. **Transição Livre de Desorientação:**
   - A linha do chão (`GROUND = 470`) é mantida fixa como âncora vertical. O chão nunca sai da tela.
   - O adversário nunca é cortado completamente da visualização periférica: a vinheta lateral preserva a silhueta do defensor.

### 4.3 Hitstop Cinematográfico de Impacto (Freeze no Acerto)

Quando um especial acerta o adversário (no hit real pós-cinemática):
- **Acertos Intermediários (em golpes multi-hit):** Hitstop leve de **4 ticks** por acerto para manter o defensor "preso" na animação sem quebrar a fluidez.
- **Último Acerto (Finalizador de Especial):**
  - Hitstop estendido para **12 a 14 ticks** (0,2 a 0,23 s) — o clássico "crunch" de impacto de anime/arcade.
  - Flash de impacto com cor principal do lutador (`ch.fire[0]`).
  - Tremor de tela direcional calibrado (`shake = 8` se a opção estiver ligada nas configurações).
  - Efeito de dispersão de partículas na direção do vetor de empurrão (`kb`).

--- 

## 5. Fluidez dos Golpes Normais: Frame Data dos 10 Lutadores

Todos os tempos em ticks de jogo (60 Hz). Convenção padrão do motor:
- **$S$ (Startup / Preparação):** ticks do início até o frame anterior ao surgimento da primeira caixa de ataque ativa.
- **$A$ (Active / Ativos):** ticks em que a caixa de ataque colide com a hurtbox do rival.
- **$R$ (Recovery / Recuperação):** ticks do término da caixa de ataque até o lutador retornar ao estado neutro (`idle` ou `crouch`).
- **Vantagem de Frame no Acerto ($V_{\text{hit}}$):** $hs - ((A - 1) + R)$.
- **Vantagem de Frame no Bloqueio ($V_{\text{blk}}$):** $bs - ((A - 1) + R)$.

### 5.1 Tabela Base dos Golpes Normais Revisada (`src/data/base-moves.ts`)

| Golpe | Botão / Posição | S/A/R Atual | S/A/R Proposto | Dmg | Hitstun | Vant. Hit | Blockstun | Vant. Blk | Intenção de Fluidez |
|---|---|---|---|---|---|---|---|---|---|
| `lp` | Soco Leve em Pé | 3/3/7 | **3/3/6** | 4.0 | 14 | **+6** | 8 | **0** | Jab rápido; neutro no bloqueio, ideal para pokes e cadeias. |
| `lk` | Chute Leve em Pé | 5/4/9 | **4/3/8** | 5.0 | 16 | **+6** | 9 | **-1** | Chute leve mais ágil (startup de 5 para 4 ticks). |
| `hp` | Soco Forte em Pé | 7/4/14 | **7/4/13** | 10.0 | 24 | **+8** | 12 | **-4** | Ferramenta primordial de cancel em especial no acerto. |
| `hk` | Chute Forte em Pé | 9/5/18 | **9/5/17** | 14.0 | 30 (KD) | **KD +48**| 14 | **-7** | Alto dano e knockdown; punível de perto se bloqueado. |
| `clp` | Soco Leve Agachado | 4/3/8 | **3/3/6** | 4.0 | 15 | **+7** | 8 | **0** | Poke rápido agachado (startup cai para 3 ticks). |
| `clk` | Chute Leve Baixo (Low)| 6/3/10 | **5/3/8** | 5.0 | 15 | **+5** | 9 | **-1** | Ataque baixo (*low*) mais responsivo; confirma em combo. |
| `chp` | Soco Forte Agachado | 6/4/17 | **6/4/15** | 11.0 | 0 (KD) | **KD +50**| 12 | **-6** | Gancho ascendente; excelente anti-aéreo de chão. |
| `chk` | Rasteira Baixa (Sweep)| 8/6/20 | **7/5/18** | 9.0 | 0 (KD) | **KD +46**| 14 | **-8** | Rasteira clássica; derruba, mas é punível se bloqueada. |
| `throw`| Arremesso Neutro | 3/3/22 | **3/2/20** | 12.0 | 0 (KD) | **KD +52**| – | – | Inbloqueável a curta distância; recuperação menor no erro. |

--- 

### 5.2 Ajustes Específicos por Lutador (`mods` em `src/data/lutadores/*.ts`)

#### 1. HAYATO (All-Around / Shoto)
- **Arquétipo:** O padrão ouro de precisão e equilíbrio.
- **Mods Atuais:** Vazio (usa 100% da tabela base).
- **Ajustes Propostos:**
  - Mantém fidelidade à tabela base revisada: jab de 3 ticks, `clp` de 3 ticks.
  - `sFwd` (Kaminari-Step): Startup de 6 para **5 ticks**, tornando-o um verdadeiro punisher de média distância.
  - `hp`: Hitstun 24 permite cancel confortável em `sFire` ou `sFwd`.

#### 2. WEI LONG (Heavy Kung Fu / Juggernaut)
- **Arquétipo:** Golpes lentos, pesados, com avanços longos e armadura.
- **Mods Atuais:** `lp` (S:4), `lk` (S:6), `hp` (S:9, A:5, R:17), `hk` (S:12, A:5, R:22), `chp` (S:7), `chk` (S:9).
- **Ajustes Propostos:**
  - `lp`: S: 4, A: 3, R: 6 (dano 5.0). Jab ligeiramente mais lento que a média, mas positivo no hit (+6).
  - `hp`: S: 8 (era 9), A: 5, R: 16 (dano 11.0, adv 20). Startup reduzido em 1 tick para facilitar combos após pulo forte.
  - `hk`: S: 11 (era 12), A: 5, R: 20 (dano 15.0). O golpe mais destruidor em alcance do chão.
  - `sFwd` (Tie Shan Kao): Ganha armadura ativa a partir do tick 2 (era tick 3), tornando a absorção mais confiável.

#### 3. MIN-JI (Rushdown / Taekwondo)
- **Arquétipo:** A lutadora mais rápida do jogo, especialista em sequências ininterruptas.
- **Mods Atuais:** `lp` (S:2, R:5), `lk` (S:4, R:7), `hp` (S:5, R:11), `hk` (S:7, R:14), `clp` (S:3, R:6), `chk` (S:6, R:16).
- **Ajustes Propostos:**
  - `lp`: S: 2, A: 3, R: 4 (dano 3.2). O golpe mais rápido de todo o jogo (+8 no acerto).
  - `clp`: S: 3, A: 3, R: 5 (dano 3.5). Encadeia em si mesmo até 3 vezes com fluidez extrema.
  - `lk`: S: 4, A: 3, R: 6 (dano 4.5). Link natural de `lp → lk`.
  - `hp`: S: 5, A: 4, R: 10 (dano 8.0, adv 24). Avança 24 px para manter o oponente grudado.
  - Recuperação geral dos chutes no ar (`jlk`, `jhk`) reduzida em 2 ticks ao pousar.

#### 4. CAIO (Mobile Zoner / Capoeira)
- **Arquétipo:** Domínio de espaço com pernadas de longo alcance e ginga elástica.
- **Mods Atuais:** `rm` alto em chutes (`hk` rm 1.38, `chk` rm 1.4), `hp` (S:8), `hk` (S:10).
- **Ajustes Propostos:**
  - `lk`: S: 4, A: 4, R: 8 (rm 1.15). Poke rápido e comprido para parar avanços.
  - `hk`: S: 9 (era 10), A: 5, R: 17 (dano 13.0, rm 1.38). Mais rápido para punir whiffs de longe.
  - `sDown` (Rabo-de-Arraia): Startup reduzido de 9 para **8 ticks**; alcance de 420 px permanece o terror de quem não bloqueia baixo.

#### 5. CENTELLA (Luchadora / Aerial Grappler)
- **Arquétipo:** Agilidade aérea, mergulhos e reversões acrobáticas.
- **Mods Atuais:** Vazio em mods normais (foco nos especiais de luta livre).
- **Ajustes Propostos:**
  - `clp`: S: 3, A: 3, R: 5. Mais rápida no chão para criar o espaço necessário para o pulo.
  - `jhp`: S: 4, A: 80, R: 0 (dano 9.0). Caixa de acerto angulada para baixo com prioridade contra anti-aéreos tardios.
  - `sDown` (Huracanrana): Janela ativa de agarrão aéreo expandida de 18 para **22 ticks** para perdoar pequenas imprecisões de altura.

#### 6. CAMILLE (Fencer / Savate Counter)
- **Arquétipo:** Técnica, contragolpes refinados e estocadas precisas.
- **Mods Atuais:** Vazio em mods normais (usa a base com alcance longo `reach: 1.1`).
- **Ajustes Propostos:**
  - `lk` (Chassé): S: 4, A: 4, R: 7 (dano 5.5). Chute frontal reto de longo alcance.
  - `hp`: S: 6 (era 7), A: 4, R: 12 (dano 9.5). Golpe reto de punho com recuperação limpa.
  - `sDown` (Coup d'Arrêt): Startup de 6 para **5 ticks**; fundamental para interceptar ataques adversários na preparação.

#### 7. NILA (Stance Hybrid / Kalaripayattu)
- **Arquétipo:** Transição fluida entre Elefante pesado (GAJA) e Serpente rasteira (SARPA).
- **Mods Atuais:**
  - GAJA: `hp` (S:8), `hk` (S:10).
  - SARPA: `hp` (S:5), `hk` (S:8).
- **Ajustes Propostos:**
  - **GAJA:** `hp` S: 7 (era 8), dano 12.0; `hk` S: 9 (era 10), dano 16.0. Sensação de peso com startup ligeiramente acelerado para não perder combos pós-Marma.
  - **SARPA:** `hp` S: 4 (era 5), dano 7.0; `hk` S: 7 (era 8), dano 10.0. Extremamente ágil.
  - `sDown` (Vadivu - Troca de Postura): Tempo de execução reduzido de 6 para **4 ticks**, tornando a troca no meio de neutral muito mais segura e tática.

#### 8. AMINU (Tank Boxer / Dambe)
- **Arquétipo:** Punhos pesados enrolados em corda, avanços lentos e absorção de dano.
- **Mods Atuais:** Vazio na base (usa `reach: 1.08`).
- **Ajustes Propostos:**
  - `hp`: S: 7, A: 4, R: 13 (dano 11.5, adv 16). Soco pesado que empurra o oponente.
  - `clp`: S: 3, A: 3, R: 6. Jab baixo ágil para afastar oponentes colados.
  - `sFire` (Mashi Carga): Nível 1 sai em 8 ticks (era 10); velocidade de caminhada enquanto segura aumentada em 20%.

#### 9. BAATAR (Heavy Grappler / Bökh)
- **Arquétipo:** O gigante das estepes; absorve golpes leves e esmaga com agarrões.
- **Mods Atuais:** Armadura nos fortes (`hp`, `hk`, `chp`, `chk`), `hp` (S:9), `hk` (S:12), `chk` (S:10).
- **Ajustes Propostos:**
  - `hp`: S: 8 (era 9), A: 4, R: 14 (dano 11.0, com armadura ativa no tick 2).
  - `chk`: S: 9 (era 10), A: 6, R: 18 (dano 10.0, rasteira com armadura).
  - `clp`: S: 4, A: 3, R: 7. Permite criar pequenas aberturas para o agarrão de comando `sFire`.

#### 10. ZENON (Arconte / Boss)
- **Arquétipo:** Imponente, alcance amplo, golpes teatrais de pancrácio.
- **Mods Atuais:** Caixas de acerto largas (`bh: 200..250`).
- **Ajustes Propostos:**
  - `lp`: S: 3, A: 3, R: 6 (dano 4.5). Alcance de mão aberta amplo.
  - `hp`: S: 7, A: 4, R: 13 (dano 10.5). Estocada com a palma que conecta limpo em `sFwd` (Tributo).
  - `sFwd` (Tributo): Startup reduzido de 10 para **8 ticks** na versão jogável e na fase 1 do chefão, tornando a drenagem de energia viável como punição de combos.

---

## 6. Contratos de API e Dados

### 6.1 Contrato C2 (`InputFrame` e Buffer)
Nenhum campo novo é necessário em `InputFrame` — o contrato C2 já possui os botões e `spSeg`/`esq`. A mudança ocorre na interpretação em `Fighter.corpoDoUpdate`:
- A constante de buffer é reduzida:
  ```ts
  export const BUFFER_ATAQUE_PADRAO = 4; // ticks
  export const BUFFER_REVERSAL = 5;      // ticks ao levantar
  ```

### 6.2 Contrato C3 (Eventos e Leitura da Luta)

Extensões aditivas em `src/core/contratos.ts`:

```ts
// EventoLuta aditivo (opcional, ausente não quebra leitores antigos):
| {
    tipo: 'combo-hit';
    atacante: IndiceLutador;
    defensor: IndiceLutador;
    hitNumero: number;
    danoLiquido: number;
    scalingAplicado: number; // ex: 0.65
    ehEspecial: boolean;
  }
```

Em `LutadorLeitura`:
- O objeto `combo: ComboLeitura` passa a expor opcionalmente `scalingAtual?: number` para que o HUD possa renderizar o multiplicador decrescente se desejado.

### 6.3 Dados de Golpes (`src/data/tipos.ts`)

Campos novos opcionais em `Golpe`:
```ts
export type Golpe = {
  // ... campos existentes ...
  /**
   * (Revisão do Motor) Janela estrita de cancelamento em ticks desde mt === 0.
   * Padrão quando ausente: [S, S + A + 2]. Após este limite, cancelamento é bloqueado.
   */
  janelaCancel?: readonly [inicio: number, fim: number];
  /** Se true, este golpe não pode ser cancelado em especial no bloqueio (só no hit). */
  bloqueiaCancelNoBlock?: boolean;
};
```

Em `LutadorDef`:
```ts
export type LutadorDef = {
  // ... campos existentes ...
  /**
   * (Revisão do Motor) Rotas de combo personalizadas por lutador.
   * Chave: golpe atual -> lista de golpes para os quais pode cancelar no hit.
   * Ausente: aplica a regra de cadeia universal (rank crescente).
   */
  rotasCombo?: Partial<Record<NomeGolpe, readonly NomeGolpe[]>>;
};
```

--- 

## 7. Fatias de Implementação, Donos e Ordem

| Fatia | Dono | Escopo Técnico | Depende de | Critério de Aceite |
|---|---|---|---|---|
| **F1: Motor e Scaling** | Vega | - Buffer de ataque para 4 ticks em `fighter.ts` (atrás de `revisaoMotor`).<br>- Janela estrita de cancel (`cancelWindow`) e corte de cancel na recuperação tardia.<br>- Nova fórmula de scaling (`escalaComboRevisada`) com starter proration e piso de especial.<br>- Flag `revisaoMotor` em `ConfigPartida` e `Regras`. | — | Testes de unidade verdes; snapshot do oráculo e `luta-fidelidade` intactos com flag desligada; testes novos provando scaling de 4 hits e janela de cancel. |
| **F2: Frame Data e Especiais** | Vega | - Atualização de `BASE_MOVES` em `src/data/base-moves.ts`.<br>- Atualização de `mods` e danos de especiais nos 10 lutadores em `src/data/lutadores/*.ts`.<br>- Calibração dos especiais para a faixa de 25-35 de dano nominal. | F1 | `npm run test` verde; teste `balanco-adversarial.test.ts` atualizado com o novo teto de dano sem quebrar tripwires de 1-hit-kill. |
| **F3: Câmera e Impacto Visual** | Lyra | - Zoom dinâmico (1.20x-1.25x) com âncora no atacante durante o freeze em `render/cinematica.ts`.<br>- Transição de retorno suave para a câmera do jogo.<br>- Hitstop de 12-14 ticks no acerto final dos especiais em `game.ts` / `fight.ts`.<br>- Efeito visual de vinheta e halo calibrado. | F1, F2 | E2E de cinemática passando; medição no Playwright confirmando p95 < 16,7 ms; zero tremor indesejado de câmera. |
| **F4: IA e Harness de Balanço** | Vega | - Atualização das decisões de combo da CPU em `src/fight/cpu.ts` para respeitar as novas janelas.<br>- Execução da rodada do harness (`npm run balanco`).<br>- Relatório de taxas de vitória dos 10 lutadores e chefões. | F1, F2 | 100 sementes rodadas; nenhum lutador com taxa degenerada fora de 40-60%; chefões respeitando a rampa. |
| **F5: QA e Validação Prática** | Íris | - Testes manuais e automatizados de cadeias de combo dos 10 lutadores.<br>- Testes adversariais de mash de botões (provar eliminação de ghost inputs com buffer 4).<br>- Veredito formal APROVADO/REPROVADO. | F1..F4 | Relatório de QA sem bugs de travamento de estado e combos responsivos no teclado e toque. |
| **F6: Documentação Técnica** | Alexandria | - Atualização de `docs/arquitetura.md` com as novas regras de motor.<br>- Atualização da frame data gerada em `docs/balanco/frame-data.md`.<br>- Registro no `CHANGELOG.md` e guia de golpes no manual. | F5 aprovado | Documentação 100% aderente ao código real mergeado. |

**Ordem de Execução:**
$$\text{F1 (Motor/Scaling)} \longrightarrow \text{F2 (Dados/Lutadores)} \longrightarrow \text{F3 (Câmera/Impacto) ∥ F4 (IA/Harness)} \longrightarrow \text{F5 (QA)} \longrightarrow \text{F6 (Docs)}$$

--- 

## 8. Decisões do Dono

| # | Item | Opção Recomendada | Alternativa | Por que recomendamos |
|---|---|---|---|---|
| **DD-M1** | **Tamanho do Buffer de Comando** | **4 ticks (66,6 ms)** | 3 ticks ou 5 ticks | 4 ticks é o equilíbrio perfeito entre rigor competitivo e acessibilidade em telas touch de 60 Hz. |
| **DD-M2** | **Starter Proration em Golpes Leves** | **Sim (80% nos golpes seguintes)** | Não (100% linear) | Sem a proration inicial, um poke rápido de jab de 2 frames causaria 40% de vida, desequilibrando o jogo a favor de rushdown. |
| **DD-M3** | **Piso de Dano dos Especiais** | **30% do dano base (ou mínimo 8)** | Sem piso (escala até 15%) | Especial custa barra de energia valiosa; terminar um combo com especial deve sempre causar um impacto visual e numérico satisfatório. |
| **DD-M4** | **Cancel no Bloqueio para Reversals** | **Proibir cancel em `rise` no block** | Permitir em qualquer golpe | Permite que o defensor puna tentativas descuidadas de usar DP/Dragon Punch no bloqueio. |
| **DD-M5** | **Zoom na Cinemática em Aparelhos Fracos** | **Desligar zoom se `prefers-reduced-motion`** | Forçar zoom em todos | Acessibilidade WCAG e estabilidade de framerate em celulares mais antigos. |
| **DD-M6** | **Compatibilidade com o Protótipo Legado** | **Flag `revisaoMotor` (padrão true em prod, false no teste legado)** | Atualizar fixture do teste legado | Preserva os testes históricos de fidelidade sem gerar retrabalho artificial. |

--- 

## 9. Riscos Técnicos, Dívidas Conscientes e Mitigações

| # | Risco | Probabilidade | Impacto | Mitigação Arquitetural |
|---|---|---|---|---|
| **R1** | **Aumento do dano dos especiais romper tripwires existentes de QA.** | Alta | Médio | O tripwire em `balanco-adversarial.test.ts:44` vigia se algum golpe passa de 60% da menor barra de vida (27.6 HP). Como os especiais agora dão 25-35 base, a F2 deve calibrar o tripwire para checar golpes normais isolados (< 25) e especiais isolados (< 40% da vida total do lutador), mantendo o tripwire contra 1-hit-kill íntegro. |
| **R2** | **Buffer menor (4 ticks) dificultar combos no controle de toque.** | Média | Médio | O buffer não decai durante hitstop nem no knockdown, concedendo folga suficiente para input durante os congelamentos de impacto. Se a Íris reprovar no mobile, a F5 ajusta para 5 ticks exclusivamente no toque via `temToque`. |
| **R3** | **Zoom cinematográfico causar queda de frames no celular.** | Baixa | Médio | O zoom é aplicado via `ctx.scale()` na matriz do canvas já existente, sem invocar filtros pesados, `filter`, `shadowBlur` ou cópias de buffer. A Lyra valida no perfil móvel do Playwright. |
| **R4** | **IA da CPU não conseguir executar as novas rotas de combo.** | Média | Baixo | A F4 atualiza `src/fight/cpu.ts:305` para consultar as novas janelas de cancel antes de enfileirar entradas, garantindo que a CPU em DIFÍCIL execute os novos combos com fluidez. |
| **R5** | **Divergência nos testes de fidelidade (`luta-fidelidade.test.ts`).** | Baixa | Alto | A flag `revisaoMotor: false` isola os testes do oráculo legado, garantindo que o diff do motor não toque no comportamento dos 4 originais rodando na fixture histórica. |
