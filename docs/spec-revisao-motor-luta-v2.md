# Spec técnica: revisão do motor de luta, v2

> Autora: Nova · 2026-10-23 · base: HEAD `f5b5fab` · **substitui** `docs/spec-revisao-motor-luta.md` (v1, 2026-10-22), reprovada
> na auditoria `docs/revisao-completa-2026-10-23.md` §5. Nada da v1 vale, a não ser o que esta spec repete.
> Nada aqui está implementado. Os números de dano saem de `docs/balanco/frame-data.md` (gerado em 2026-10-21, versão dos dados
> `f6b9952cee5e`), que mede no motor com `pow` aplicado e sem escala de combo.

---

## 0. Contexto e hipóteses

- **Maturidade:** jogo jogável e publicado para teste (Pages), 10 lutadores, 6 chefões, trailer aprovado. Não é MVP, mas também não
  é jogo com comunidade competitiva: a régua é "gostoso de jogar no celular e no teclado", não frame data de torneio.
- **Escala:** jogo local no navegador, 1 ou 2 humanos, sem rede. Lock-step determinístico existe por causa de testes, harness e
  trailer, não por netplay. Isso libera a opção A do filme (o motor nunca precisa saber quanto o filme dura).
- **Equipe e prazo:** a squad de sempre; sem prazo declarado. A ordem abaixo põe o filme (prioridade do dono) no caminho crítico.
- **Hipótese H1:** "dano dos golpes normais" = o golpe normal mais forte da **mesma ficha** em pé (`hk`, que é o maior em todas as
  11 fichas medidas). **H2:** "teto por combo" = fração da vida **total** do defensor, não da barra corrente do chefão.
  **H3:** "sem hits que contem" = defendido ou esquivado, o especial vale **um** contato só (1 bloqueio com o raspão do 1º acerto,
  ou 1 esquiva); os acertos e tiros restantes daquela execução deixam de existir. Se o dono quis dizer outra coisa, só o §3.2 muda.

## 1. As decisões do dono (23/10) e onde cada uma mora

| # | Decisão | Onde nesta spec | Substitui |
|---|---|---|---|
| 1 | Filme do personagem batendo em **todos** os especiais, **só** quando conecta. Item mais importante | §3 | R-2 (eu tinha recomendado 1 por lutador) |
| 2 | Tarja no **início** do especial, como hoje | §5 | R-3 (eu tinha recomendado a tarja no acerto) |
| 3 | Especial mais forte que os normais, sem exagero, respeitando `pow`, contragolpe, `danoRecebido` e teto por combo | §4 | R-5 |
| 4 | Combos próprios por lutador | §6 | a tabela de rotas da v1 |
| 5 | Mais fluido, mais encaixe: religar a "mola", interpolação, entrada no hitstop | §7 | §2.3-2.4 e §5 da v1 |
| 6 | Arte do filme avaliada pelo Apolo em paralelo; spec com encaixe para arte atual **e** arte nova | §3.6 | R-6 |

"Os 33" = 10 lutadores × 3 especiais (30) + os 3 da ficha SARPA da NILA. Desses, **31 acertam alguém**; os 2 VADIVU (troca de
postura, GAJA ↔ SARPA) não têm caixa de acerto e não "conectam" nunca (pendência **D-V1**). A PARADE da CAMILLE conecta pelo
FOUETTÉ (`sResp`), que é o golpe que segue a sessão dela.

## 2. Princípios (valem para todas as fatias)

1. **O motor resolve, a UI apresenta (opção A).** No tick do 1º contato limpo, o motor aplica o resultado inteiro do filme e deixa
   os dois lutadores no estado final. A UI toca o filme **sem chamar `game.update`**, exatamente como a cinemática de hoje
   (`ui/cenas/fight.ts:445`). Pular o filme só encurta a apresentação; o motor não muda um bit.
2. **Tudo atrás de flag, por parte.** `ConfigPartida.motorV2?: { entradaNoHitstop?: boolean; filmes?: boolean; combos?: boolean }`
   (ausente = tudo desligado = comportamento e hashes de hoje), espelhado em `Regras.motorV2` (`src/meta/regras.ts`), como a esquiva
   fez. O harness ganha `--motor-v2 entrada,filmes,combos`. O trailer passa a fixar `motorV2: undefined` explicitamente em
   `src/trailer/partida.ts` até a regravação (§10).
3. **Suavidade é render.** Nada de mola, interpolação ou tremor entra em `fight/` (`poseT` incluído). `montar.ts:198`
   (`legacy = !pd['walk7']`) **não muda**: ele continua escolhendo os nomes de pose da arte antiga; o que se religa é a camada de
   transformações, que sai de `poseT` para `src/render/` (§7.2).
4. **Um número de dano por especial, em dado, com regra verificada por teste.** Nada de multiplicador escondido no motor (§4).
5. **Dano no defensor passa sempre por `danoNoDefensor`** (`game.ts:287`). O filme vira o 5º ponto onde a vida cai; o comentário
   da função que diz "4 pontos" é atualizado.

## 3. Filme do especial (decisão 1)

### 3.1 Gatilho (o motor decide)

Abre o filme o **1º contato limpo** de uma execução de especial (golpe com `filme` nos dados) contra o rival, com
`motorV2.filmes` ligado. "Execução" = um `startMove` (identificada por `atkId`) e todos os projéteis que ela lança.

| Situação no 1º contato | Filme? | O que o motor faz |
|---|---|---|
| Acerto limpo (ramo `hit` de `applyHit`, `game.ts:814`) | **sim** | resolve o filme (§3.2) |
| Agarrão de especial que pega (HURACANRANA, ARREMESSO DO AVARGA) | **sim** | idem, no lugar de `arremessar` |
| Bloqueio (inclusive quebra-guarda do MASHI N3) | não | 1 evento `block` com o raspão do 1º acerto; execução consumida |
| Esquiva invulnerável | não | 1 `esquivou`; execução consumida (já é assim no corpo a corpo: `atkEsquivado`) |
| Armadura absorve | não | 1 `armor`; execução consumida |
| PARADE do rival | não | o sucesso é da CAMILLE (a tarja dela abre no `parry`, como hoje) |
| Escudo da GARKUWA absorve o projétil | não | `clash` como hoje |
| Segundo contato de especial **no mesmo tick** (ex.: projétil do P1 e golpe do P2) | não | o 1º na ordem de `resolveHits` leva o filme; o outro resolve como 1 acerto comum, com o dano de hoje |
| Especial que conecta depois de o mesmo combo já ter tido filme | impossível | todo filme termina em queda (§3.3), e queda encerra o combo; fica um teste de invariante |

"Execução consumida" = acertos restantes de golpe com `hits`, os tiros seguintes de `shots` (BULKKOT) e os projéteis já em voo da
mesma execução não colidem mais com o rival (podem seguir na tela como fantasma ou sumir: escolha da Vega, o critério é **0 eventos
extras**). Com a flag desligada, nada disso roda.

Nota: hoje não existe troca de golpes no mesmo tick no corpo a corpo: o P1 resolve primeiro e `d.move = null` anula o golpe do P2
(`game.ts:570-588` + `:831`). É um viés antigo a favor do P1, fora do escopo. Fica registrado.

### 3.2 Resolução atômica (no tick do contato)

1. Dano do filme, em uma conta só (§4.1). Conta como **um** golpe no combo: `gotHits += 1`, `comboDmg += dano`.
2. Energia como um acerto: +8 ao atacante (+4 se projétil), +5 ao defensor (`game.ts:827-828`). Dreno do ZENON: uma cobrança só.
3. `resolverVidaZerada` como sempre: KO e troca de barra do chefão saem daqui. Na troca de barra, `dano` = o que saiu da barra
   (regra de hoje), a barra seguinte enche, `invuln = 60` e a cena da fase 2 fica pendente; ela só dispara com o chefão livre no
   chão, portanto **depois** do filme, sem código novo.
4. Estado final (§3.3) gravado nos dois lutadores.
5. Eventos do tick, nesta ordem: `fase-chefe` (se houver) → `hit` com `filme: true` → `filme` → `ko` (se houver).

### 3.3 Estado final

Todo filme termina em **queda**. Isso resolve três coisas de uma vez: o combo acaba (sem laço "combo → filme → combo"), a posição
final é bem definida para a UI chegar nela, e a vantagem depois do filme vira dado.

- **Defensor:** `state = 'down'`, `phase = 'lie'`, `st = 0`, `y = GROUND`, `vx = 0` (deitado direto, sem o arco de `knockdown`, que
  apareceria **depois** do filme e quebraria a continuidade). Chama `aoCair` (poeira + tremor), como o pouso de hoje
  (`fighter.ts:935-939`). Depois: 34 ticks deitado + 14 levantando + 12 invulnerável (`fighter.ts:881-897`). KO: `state = 'ko'` no chão.
- **Posição:** `xDefensor = xAtacante + facing × distancia`, presos em [150, 960 − 150] (margem de quem está caído, `fighter.ts:911`);
  se prendeu na parede, o atacante recua para manter a distância mínima de 78. Projétil: só o defensor muda de lugar.
- **Atacante (corpo a corpo e agarrão):** no chão, em `move = '_lag'` com `lagR = recuperacao`. Aéreo pousa no tick do filme.
  **Projétil:** o atacante não é tocado (ele já pode estar fazendo outra coisa).
- **Vantagem depois do filme** = 48 − `recuperacao` (o defensor fica livre ao fim do `rise`). Valor padrão por especial:
  `recuperacao = 48 − clamp(vantagem no acerto de hoje, +16, +40)` (coluna "Vant. acerto" do `frame-data.md`; especial que hoje não
  derruba entra como +16). Cronos gera a coluna; a Vega só ajusta se o harness apontar.

### 3.4 Contrato de dados do motor (aditivo)

Fica **fora** de `LutadorDef.especiais`, como `apresentacao-especiais.ts` já fica, para não mexer no oráculo de fidelidade dos 4
originais. Arquivo novo `src/data/filmes.ts`, chave `<lutador>` + ficha opcional + golpe (a ficha é procurada primeiro), mesclado
por `montar.ts` em `GolpeMontado.filme`:

```ts
export type FilmeDoGolpe = {
  /** Dano BASE do filme inteiro (antes de `pow`; projétil não usa `pow`). Uma linha da tabela do §4.3. */
  dano: number;
  /** MASHI: dano por nível de carga (1..3); substitui `dano` quando o golpe tem `carga`. */
  danoPorNivel?: readonly [number, number, number];
  /** Distância final entre os dois (px). Padrão 150. */
  distancia?: number;
  /** Ticks do atacante depois do filme (§3.3). */
  recuperacao: number;
  /** Só visual (a UI escolhe a cena final); o motor trata as três como queda. */
  final?: 'derruba' | 'parede' | 'lanca';
};
```

Evento novo em `EventoLuta` (C3, `src/core/contratos.ts`), e o campo `filme?: true` no `hit`:

```ts
| { tipo: 'filme'; atacante: IndiceLutador; defensor: IndiceLutador; golpe: string; ficha: string | null;
    projetil: boolean; nivelCarga?: 1 | 2 | 3; dano: number; contragolpe: boolean; ko: boolean; trocaDeBarra: boolean;
    final: 'derruba' | 'parede' | 'lanca';
    antes: { atacante: PosFilme; defensor: PosFilme }; depois: { atacante: PosFilme; defensor: PosFilme } }
// PosFilme = { x: number; y: number; facing: 1 | -1 }
```

`dano` = o que saiu da barra (mesma regra do `hit.dano`). O motor não emite duração, batidas nem poses: isso é da UI.

### 3.5 Apresentação (UI)

- **Módulo:** `src/render/filme.ts`, com linha do tempo **pura** `quadroDoFilme(roteiro, t, pulouEm)` (no molde de
  `linhaDoTempo` da cinemática) + a classe que desenha. Integração em `ui/cenas/fight.ts`: `if (this.filme.ativo) { passoDoFilme();
  return; }` antes do teste da cinemática.
- **Eventos adiados:** quando o tick traz `filme`, a cena consome o `hit{filme}` no filme e **guarda** os demais eventos do tick
  (`ko`, `round`, `fase-chefe`) para reagir a eles quando o filme fechar. Som e efeitos de `hit{filme}` não tocam no tick do contato:
  quem toca é o filme, por batida (Vega ajusta `sonsDoEvento`/`reagirDoJogo` para ignorar `hit` com `filme`).
- **HUD:** durante o filme a barra desce por batida a partir de `hpShown`; no último quadro ela tem de bater com `hp` do motor.
  O contador de acertos é do filme (batidas), não do motor; a soma dos números mostrados é exatamente `dano` (o resto vai na
  última batida).
- **Duração:** COMPLETA de 45 a 75 ticks; CURTA de 30 (reduced-motion, e talvez repetição: **D-V4**). Qualquer ataque de um humano
  pula depois do tick 10 (a regra de hoje, `fight.ts:393`). CPU × CPU (modo atrair) nunca pula.
- **Câmera:** zoom do mundo, teto 1,5 (acima disso o sprite de ~410 px borra); 1,2 para CAIO e WEI LONG enquanto a arte deles for a
  do protótipo (risco A6, decisão R-1).
- **Saída:** o último quadro deixa os dois exatamente nas posições `depois` do evento; ao fechar, a interpolação (§7.3) é zerada
  (sem "deslizar" das posições de antes).

### 3.6 Arte: os dois encaixes (decisão 6)

O roteiro é o mesmo nos dois casos; só muda de onde vêm as poses.

```ts
// src/data/roteiros-filme.ts (só UI; o motor não importa)
export type BatidaFilme = {
  t: number;                    // tick de início da batida
  atacante: string; atacanteAlt?: string;   // pose (nome de atlas); Alt = cadeia de queda
  rival: string; rivalAlt?: string;
  peso: number;                 // fração do dano mostrado nesta batida (soma 1)
  camera?: { zoom: number; foco: 'atacante' | 'rival' | 'meio' };
  som?: 'leve' | 'pesado' | 'final';
  retrato?: boolean;            // close do retrato (1ª batida, em geral)
};
export type RoteiroFilme = { duracao: number; curta: number; estilo?: string /* E1..E12 de estilos-especiais.ts */; batidas: readonly BatidaFilme[] };
```

- **Arte atual (saída A do Apolo):** batidas com poses que os 10 atlas já têm (`sa0-3`, `sb0-3`, `sc0-1`, `hp1`, `hk1`; rival em
  `hitH`, `hitB`, `kdAir`, `koFloor`), retrato, linhas de velocidade e a assinatura E1-E12. Custo de memória: zero.
- **Arte nova (saída B):** poses novas `f0..f5` por lutador, numa página de atlas própria gerada pelo pipeline de sprites, com
  `atacanteAlt` apontando para a pose atual equivalente. Se a página não carregou, `getPD` cai no `Alt` e o filme toca do mesmo
  jeito (nunca espera arte). Carga sob demanda dos 2 lutadores da luta; no máximo 2 páginas extras por luta (régua de memória A1).
- **Modelos por tipo, desde o 1º dia:** 4 roteiros genéricos (`projetil`, `chao`, `aereo`, `agarrao`) montados só com poses comuns.
  Todo especial com `filme` e sem roteiro próprio usa o do tipo dele. Assim a fatia do motor e a da UI não esperam o Apolo.

## 4. Dano do especial (decisão 3)

### 4.1 Fórmula (a ordem importa)

```
bruto   = filme.dano × (projétil ? 1 : pow)                       // o filme inteiro
escala  = escalaCombo(gotHits)                                     // UM fator, colisao.ts:61 (−10% por golpe, piso 50%)
contra  = contragolpe ? (emPreparo ? contra.mult : 1,15) : 1       // regra de hoje (danoDoGolpe, colisao.ts:66)
golpe   = min(TETO_GOLPE, bruto × escala × contra)                 // TETO_GOLPE = 26
vida    = danoNoDefensor(d, golpe)                                 // × danoRecebido do chefão
final   = min(vida, max(0,5, TETO_COMBO × vidaTotal(d) − d.comboDmg))   // TETO_COMBO = 0,40
```

- `TETO_COMBO` vale para **todo** acerto com `motorV2.filmes` ligado (golpe comum também). O piso 0,5 existe porque o teste
  CPU × CPU proíbe acerto de dano zero (`balanco-adversarial.test.ts`). `vidaTotal` = `ch.hp` (no chefão, a soma das barras).
- Treino continua sem matar (`game.ts:817`).
- O raspão no bloqueio continua o de hoje, sobre o 1º acerto (`game.ts:736`), não sobre o filme.

### 4.2 Regra da tabela (verificada por teste, não por fé)

Para cada especial que acerta, em cada ficha:

- **Maior que os normais:** dano limpo efetivo (`bruto`, sem escala nem contragolpe) ≥ **1,10 × `hk` da ficha**.
- **Mais forte, sem exagero:** proposta = `max(hoje × 1,25, 1,10 × hk)` (projétil: `hoje × 1,15`, porque é seguro e de longe),
  arredondada a 0,5 e limitada a 26. Mediana do aumento: **1,27×** (a v1 dava ~1,9×).
- **Nenhum golpe isolado passa de 26** (28% da menor vida comum, 92) e o tripwire de hoje (efetivo < 60% da menor barra de guardião
  = 27,6, `balanco-adversarial.test.ts:34-47`) **fica como está** e passa a ler `filme.dano` também.

### 4.3 Tabela proposta (efetivos, com `pow`; "hk" = maior normal da ficha)

| Lutador | Especial | Tipo | Hoje | hk | **v2** | v2/hoje | v2/hk |
|---|---|---|---|---|---|---|---|
| HAYATO | RAIJIN-DAN | projétil | 15,0 | 13,9 | **17,5** | 1,17 | 1,26 |
| HAYATO | RAIJIN-KEN | aéreo | 17,1 | 13,9 | **21,5** | 1,26 | 1,55 |
| HAYATO | KAMINARI-STEP | chão | 11,8 | 13,9 | **15,5** | 1,31 | 1,12 |
| WEI LONG | LONG ZHANG | projétil | 20,0 | 13,0 | **23,0** | 1,15 | 1,77 |
| WEI LONG | ZHEN DI | projétil | 13,0 | 13,0 | **15,0** | 1,15 | 1,15 |
| WEI LONG | TIE SHAN KAO | chão | 17,7 | 13,0 | **22,0** | 1,24 | 1,69 |
| MIN-JI | BULKKOT (2 tiros) | projétil | 15,2 | 9,5 | **17,5** | 1,15 | 1,84 |
| MIN-JI | HOERI CHAGI (3 acertos) | aéreo | 14,6 | 9,5 | **18,5** | 1,27 | 1,95 |
| MIN-JI | TWIO YEOP CHAGI | aéreo | 10,8 | 9,5 | **13,5** | 1,25 | 1,42 |
| CAIO | ONDA VERDE | projétil | 14,0 | 12,1 | **16,0** | 1,14 | 1,32 |
| CAIO | RABO-DE-ARRAIA | chão | 12,6 | 12,1 | **16,0** | 1,27 | 1,32 |
| CAIO | MEIA-LUA | aéreo | 13,6 | 12,1 | **17,0** | 1,25 | 1,40 |
| AMINU | MASHI nível 1 | chão | 9,4 | 15,3 | **17,0** | 1,81 ⚠ | 1,11 |
| AMINU | MASHI nível 2 | chão | 17,7 | 15,3 | **22,0** | 1,24 | 1,44 |
| AMINU | MASHI nível 3 (quebra a guarda) | chão | 26,0 | 15,3 | **26,0** | 1,00 | 1,70 |
| AMINU | GARKUWA (acerto) | chão | 5,9 | 15,3 | **17,0** | 2,88 ⚠ | 1,11 |
| AMINU | PASSO DO LEÃO | chão | 11,8 | 15,3 | **17,0** | 1,44 | 1,11 |
| CENTELLA | PLANCHA | aéreo | 13,2 | 12,2 | **16,5** | 1,25 | 1,35 |
| CENTELLA | HURACANRANA | agarrão | 16,9 | 12,2 | **21,0** | 1,24 | 1,72 |
| CENTELLA | RESORTE | chão | 14,6 | 12,2 | **18,5** | 1,27 | 1,52 |
| CAMILLE | PARADE → FOUETTÉ | chão | 11,8 | 12,7 | **15,0** | 1,27 | 1,18 |
| CAMILLE | COUP D'ARRÊT | chão | 8,8 | 12,7 | **14,0** | 1,59 | 1,10 |
| CAMILLE | REVERS | chão | 12,7 | 12,7 | **16,0** | 1,26 | 1,26 |
| NILA (GAJA) | GOLPE MARMA | chão | 7,1 | 17,7 | **19,5** | 2,75 ⚠ | 1,10 |
| NILA (GAJA) | PASSO DO ELEFANTE | chão | 14,2 | 17,7 | **19,5** | 1,37 | 1,10 |
| NILA (SARPA) | BOTE | chão | 7,2 | 9,0 | **10,0** | 1,39 | 1,11 |
| NILA (SARPA) | SALTO DA SERPENTE | aéreo | 12,6 | 9,0 | **16,0** | 1,27 | 1,78 |
| BAATAR | ARREMESSO DO AVARGA | agarrão | 19,8 | 13,5 | **25,0** | 1,26 | 1,85 |
| BAATAR | QUEBRA-BASE | chão | 12,6 | 13,5 | **16,0** | 1,27 | 1,19 |
| BAATAR | MERGULHO DA ÁGUIA | aéreo | 9,0 | 13,5 | **15,0** | 1,67 | 1,11 |
| ZENON | SELO DO ARCONTE | projétil | 14,0 | 13,0 | **16,0** | 1,14 | 1,23 |
| ZENON | COLUNA DE ÔNIX | aéreo | 15,0 | 13,0 | **19,0** | 1,27 | 1,46 |
| ZENON | TRIBUTO | chão | 10,0 | 13,0 | **14,5** | 1,45 | 1,12 |
| *ZENON chefão (fase 2)* | *SELO MAIOR* | *projétil* | *16,0* | *13,0* | ***18,5*** | *1,16* | *1,42* |
| *ZENON chefão (fase 2)* | *DECRETO* | *chão* | *14,0* | *13,0* | ***17,5*** | *1,25* | *1,35* |

Os dois em itálico são variantes de ficha de chefão (não contam nos 33). Os VADIVU não têm linha (não machucam).
Na data o valor guardado é o **base** (efetivo ÷ `pow`, exceto projétil); o teste refaz a conta e confere as duas regras do §4.2.

⚠ **Forçados pela regra literal "maior que os normais"** (pendência **D-V2**): GARKUWA, MARMA e MASHI nível 1 têm dano baixo por
desenho (escudo, atordoamento de 46 ticks, toque sem carga). Notas:
- A MARMA perde a função de abrir combo (o filme termina em queda). Hoje a rota `hp → MARMA → hp → hk` soma ~42,2 (46% de 92, conta
  sobre os dados, não simulada); com o filme, `hp → MARMA` dá 13,0 + 19,5 × 0,9 = **30,6**. Ou seja: a NILA fica **mais fraca** no
  pico, mesmo com a MARMA isolada subindo 2,75×.
- MASHI: a carga continua valendo a pena (17 → 22 → 26 + quebra-guarda), mas a distância entre os níveis encolhe.
- Se o harness mostrar abuso de GARKUWA (S 5, 20 ticks ativos), o ajuste é no **custo de energia ou na recuperação**, não no dano.

### 4.4 Prova aritmética sobre a cadeia real

**A cadeia universal de verdade** (lida no código, `fighter.ts:766-777` + `game.ts:844` + `fighter.ts:365`): cancela em golpe de
rank maior, `lp`/`clp` repetem até 3 vezes, e **qualquer golpe que derruba encerra o combo**, porque o caído é intocável. `hk`,
`chp` e `chk` derrubam, então o combo mais longo que termina em especial é `lp ×3 → lk → hp → especial` (6 acertos, escalas
1,0 / 0,9 / 0,8 / 0,7 / 0,6 / 0,5). Correção à auditoria: o `hp → hk → sDown` do HAYATO que usei lá (35,8) **não existe**, porque o
`hk` derruba.

Pior caso por lutador (teto aritmético: contragolpe no 1º golpe, a cadeia mais longa sem checar alcance; a cadeia que de fato
combina sai do verificador do §6 e só pode ser menor ou igual):

| Atacante (pior especial no fim da cadeia) | Hoje | v2 | v2 com contragolpe | % de 92 (menor vida) |
|---|---|---|---|---|
| NILA GAJA (PASSO DO ELEFANTE / MARMA) | 31,7 | 34,4 | **35,1** | 38% |
| AMINU (PASSO DO LEÃO / GARKUWA) | 29,1 | 31,7 | 32,4 | 35% |
| WEI LONG (LONG ZHANG) | 30,7 | 32,8 | 33,4 | 36% |
| HAYATO (RAIJIN-KEN) | 29,6 | 31,8 | 32,5 | 35% |
| ZENON (COLUNA DE ÔNIX) | 27,2 | 29,2 | 29,8 | 32% |
| CENTELLA (RESORTE) | 25,9 | 27,9 | 28,5 | 31% |
| CAIO (MEIA-LUA) | 25,6 | 27,3 | 27,9 | 30% |
| CAMILLE (REVERS) | 25,6 | 27,2 | 27,8 | 30% |
| BAATAR (QUEBRA-BASE) | 25,1 | 26,8 | 27,4 | 30% |
| MIN-JI (HOERI CHAGI) | 22,5 | 25,2 | 25,7 | 28% |
| NILA SARPA (SALTO DA SERPENTE) | 23,0 | 24,7 | 25,2 | 27% |

Exemplo da conta (NILA GAJA, pow 1,18; normais efetivos lp 4,7, lk 5,9, hp 13,0):
4,7 × 1,15 + 4,7 × 0,9 + 4,7 × 0,8 + 5,9 × 0,7 + 13,0 × 0,6 + 19,5 × 0,5 = 5,41 + 4,23 + 3,76 + 4,13 + 7,80 + 9,75 = **35,1**.

Conclusões que a tabela prova:
1. **Especial isolado:** máximo 26 (MASHI 3; LONG ZHANG com contragolpe dá 23 × 1,15 = 26,45 → 26). 28% de 92, abaixo do tripwire 27,6.
2. **Combo:** máximo 35,1 = 38% de 92, abaixo de `TETO_COMBO` (36,8 contra quem tem 92). O teto **não dispara na cadeia universal**;
   ele é a rede para os combos próprios (§6) e para o que ninguém previu. Agarrões e MASHI 2-3 não entram em cadeia (o agarrão exige
   rival sem atordoamento, `fighter.ts:420`; a carga exige segurar ESP), então as linhas deles na conta são folga.
3. **Por que o combo quase não sobe:** no fim da cadeia o especial leva 0,5 de escala; o aumento aparece no especial isolado e no
   especial curto (`hp → especial`, escala 0,9). É o desenho: força na hora do filme, sem dobrar o combo.
4. **Chefões:** pior golpe isolado contra o guardião BAATAR (barra 46, `danoRecebido` 0,85): 26 × 0,85 = 22,1 = 48% de uma barra,
   **igual a hoje** (MASHI 3 já dá 26). O combo é cortado na troca de barra (`game.ts:909-915`), então nada atravessa barras.
   Mesmo assim os 6 `danoRecebido` (0,80 a 0,925) são recalibrados na fatia V2-6, porque a frequência de especial muda.

### 4.5 Portões do harness (com `--motor-v2 filmes`)

- Taxa de vitória de cada par entre 42% e 58% (régua de hoje).
- Duração média do round em ticks de motor: queda de no máximo 20% contra a referência atual.
- Fatia do dano que vem de especial: no máximo +10 pontos percentuais sobre a referência, e entre 25% e 40% em valor absoluto.
- 0 KO em um golpe, 0 acerto de dano zero, 0 luta travada (os testes de hoje).
- **Tempo parado** (novo, estimado pelo harness): `especiais iniciados × 48 + filmes × duração do roteiro` ≤ 15% do tempo do round.
- Chefões de volta à rampa da spec de chefões progressivos depois da recalibração.
- DEV: `?dano-filme=hoje|v2|forte` (forte = 1,4 / 1,2 / piso 1,2) para o dono jogar o A/B antes de fixar (**D-V3**).

## 5. Tarja (decisão 2)

Fica no início, como hoje (`fight.ts:416`, `special.momento`). A PARADE e a GARKUWA seguem abrindo no sucesso (`parry`/`clash`).
O que muda: nada no código da tarja. A sequência de um especial que conecta passa a ser **tarja (48) → luta anda → contato → filme**.

Consequência que o dono precisa saber (risco A7, continua aberto): a tarja congela a luta e o rival humano pode **segurar para trás**
durante ela (a direção segurada vale quando a luta volta). Contra humanos, o filme vai aparecer menos que contra a CPU. Mitigações
possíveis, se o teste mostrar: tarja mais curta só contra humanos, ou um brilho de 6-8 ticks no início e a tarja como abertura do
filme. Nenhuma entra sem nova decisão do dono.

## 6. Combos próprios (decisão 4)

### 6.1 Contrato

Em `LutadorDef` **e** em `FichaDef` (NILA troca de postura; o chefão tem fichas de fase):

```ts
combosProprios?: readonly {
  id: string;                       // estável, para teste e para a lista na tela
  nome: string;                     // português, do Apolo
  sequencia: readonly NomeGolpe[];  // 2 a 4 golpes; pode terminar em especial (aí o especial leva o filme)
  /** Passos que, DENTRO desta sequência, não derrubam (ex.: o hk do meio vira atordoamento de `hs` próprio). */
  semQueda?: readonly number[];     // índices na sequência
  /** Propriedade do último golpe comum da sequência. 'cruza' = troca de lado; as outras derrubam com variação de distância/altura. */
  final?: 'derruba' | 'lanca' | 'parede' | 'cruza';
}[];
```

- **Universal continua** (pendência **D-V7**, minha recomendação): a cadeia por rank segue para todos; o combo próprio abre
  cancelamentos que a universal proíbe (rank igual ou menor, golpe que derruba no meio com `semQueda`).
- **Reconhecimento:** o atacante guarda o histórico dos golpes que acertaram desde que o defensor saiu de `gotHits === 0`. No
  cancelamento (`fighter.ts:766`), se `histórico + próximo` é prefixo de alguma `sequencia` da ficha ativa, o cancelamento vale mesmo
  fora da regra de rank. `final` e `semQueda` só se aplicam dentro de uma sequência reconhecida.
- **Identidade:** cada combo próprio precisa de uma propriedade que a cadeia universal não dá (derrubada à parede, lançamento, troca
  de lado, especial depois de golpe forte). 2 por lutador na 1ª leva (20; NILA 1 por postura).

### 6.2 Prova e teto

- **Verificador** em `ferramentas/balanco/frame-data.ts`: cada sequência roda contra o boneco de treino em pé e agachado, na
  distância de início declarada; o boneco tenta bloquear a partir do 2º golpe. Falha se qualquer golpe for bloqueado, errar, ou se o
  boneco ficar livre entre dois golpes.
- **Dano de cada combo próprio** ≤ 40% de 92 **sem** depender do teto: o teto é rede, não ferramenta de desenho. Exemplo do que o
  verificador barra: `hp → hk (semQueda) → MARMA` da NILA = 13,0 + 17,7 × 0,9 + 19,5 × 0,8 = **44,5** (48%).
- **CPU:** só no DIFÍCIL, com chance por nível em `AI_LEVELS` (como a esquiva). Isso consome o RNG da CPU, então muda o CPU × CPU
  (fica atrás de `motorV2.combos`).
- **Onde o jogador aprende:** a lista aparece no TREINO (no lugar da dica genérica de `fight.ts:766`) e no "Como jogar", gerada do
  mesmo dado.

## 7. Fluidez e encaixe (decisão 5)

### 7.1 Entrada no hitstop (Vega, motor)

O defeito, lido no código: durante o hitstop `Game.passo` retorna antes de ler a entrada (`game.ts:405-408`), e a borda do botão é
apagada no fim de cada tick (`main.ts:212`). Quem aperta o próximo golpe **durante** o congelamento do acerto, que é o momento
natural de apertar, perde o aperto. O buffer de 9 ticks (`fighter.ts:508`) e a janela de cancelamento (aberta do acerto ao fim do
golpe, `fighter.ts:766`) já são generosos; **não mudam**.

Correção (com `motorV2.entradaNoHitstop`): no tick congelado, ler **só as fontes humanas** (`fonte.p1`/`fonte.p2`; a CPU e o boneco
não, porque `cpuInput` consome RNG) e guardar por lutador (a) o último botão de ataque apertado e (b) as mudanças de direção (sem
repetir a mesma em sequência). No 1º tick acionável, o botão vira `buf = { k, t: 9 }` se o tick não trouxer outro, e as direções
entram em `hist` antes da do tick, para meia-lua feita no congelamento contar. Como a CPU não é tocada, **o CPU × CPU, o harness e o
trailer não mudam com a flag ligada** (critério de aceite, não suposição).

### 7.2 A "mola" de volta (Lyra + Apolo, render)

Hoje as transformações procedurais (antecipação `dx −7·p`, squash do projétil, inclinação e avanço do golpe pesado, `lift`, `tilt`,
respiração do idle, quique do `win`, squash de pouso) só rodam com `L = ch.legacy` (`fighter.ts:984-1135`), e `legacy` é falso nos
10 atlas (`montar.ts:198`; os 10 têm `walk7`). A arte nova perdeu a mola.

- Nova função pura em `src/render/mola.ts`: `mola(f: LutadorLeitura, golpe: GolpeMontado | null, peso): { dx, dy, sx, sy, rot }`,
  somada à `f.pose` em `desenharLutador` (`src/render/lutador.ts:30`). Só para `!ch.legacy` (a arte antiga já tem a dela no `poseT`).
- Amplitudes por arquétipo em dado (`peso: 'leve' | 'medio' | 'pesado'` em `LutadorDef`, valores do Apolo), com o protótipo como
  ponto de partida. Nada de trocar nome de pose: só transformação.
- **Tremor do rival no hitstop:** ±2 a 4 px alternando a cada tick de `game.t` (que anda durante o hitstop, `game.ts:404`), só no
  sprite do defensor. É o que mais dá "peso" ao acerto, e é barato.
- Desligada em `?manual=1` e no oráculo de pixel do protótipo.

### 7.3 Interpolação de desenho (Lyra, render)

- A cena guarda posição anterior de lutadores, projéteis e câmera **antes** de cada `game.update`; `ui.draw(alfa)` desenha
  `lerp(anterior, atual, alfa)` com `alfa = acc / PASSO` (hoje `ui.draw()` não recebe nada; o laço de `main.ts:205-215` passa a
  entregar o `acc` que sobra depois dos ticks).
- Sem interpolar: salto > 120 px (troca de lado, reinício de round, fim de filme), nomes de pose (são discretos) e tudo que é HUD.
- `?manual=1` desenha com `alfa = 1` (o oráculo de pixel não muda).

### 7.4 Conferência a olho

- Tecla H no TREINO (DEV) desenha caixa de acerto e de dano (hoje não desenha nada).
- Teste de dados de "salto de âncora": em cada animação, a âncora (`ax`) de quadros consecutivos não pula mais que 12 px.
- Arte de transição (`lp2`, `hp2`, `hk2`, virada, entrada no agachado) é opcional, do Apolo, e entra sem código pela cadeia do `anim`.

## 8. Resumo dos contratos

| Contrato | Mudança | Dono | Compatível? |
|---|---|---|---|
| `ConfigPartida.motorV2`, `Regras.motorV2` | novo, opcional | Vega | sim (ausente = hoje) |
| `InputFrame` (C2) | **nenhuma** | – | – |
| `EventoLuta` (C3) | `filme` novo; `hit.filme?: true` | Vega | aditivo |
| `LutadorLeitura` (C3) | só se a mola precisar de campo que falta (ex.: `S` do golpe) | Vega, a pedido da Lyra | aditivo |
| `src/data/filmes.ts` → `GolpeMontado.filme` | novo | Cronos (tabela) + Vega (montagem) | aditivo |
| `src/data/roteiros-filme.ts` | novo, só UI | Apolo (roteiro) + Lyra (formato) | – |
| `LutadorDef/FichaDef.combosProprios`, `LutadorDef.peso` | novos, opcionais | Vega (contrato), Apolo (conteúdo) | aditivo |
| Saves (`inno-fighters-v2`) | **nenhuma** | – | – |

## 9. Fatias, donos, ordem e critérios de aceite

```
V2-0 spec (Nova, esta) ─┬─► V2-1 entrada no hitstop (Vega, P) ───────────────────────────────┐
                        ├─► V2-2 mola + interpolação + tremor + tecla H (Lyra; Apolo nos pesos, M)
                        ├─► V2-3a tabela de dano + recuperação em data (Cronos, P) ──┐        │
                        └─► V2-3b roteiros e avaliação de arte A x B (Apolo, M) ──┐  │        │
                                                                                 │  ▼        │
                              V2-3c filme no motor (Vega, G) ∥ V2-3d filme na UI (Lyra, G) ◄─┘
                                                     └──────────┬──────────┘
                                                                ▼
                                       V2-3e QA do filme (Íris) ──► A/B do dano com o dono (D-V3)
                                                                ▼
                              V2-4 combos próprios + verificador + lista na tela (Vega + Lyra + Apolo, M)
                                                                ▼
                              V2-6 regravação: harness, chefões, snapshots novos, trailer (Cronos + Vega + Íris; dono aprova)
                                                                ▼
                              V2-7 QA final + e2e + aparelho (Íris) ──► V2-8 docs (Alexandria)
```

V2-1, V2-2, V2-3a e V2-3b andam em paralelo. V2-3c e V2-3d andam em paralelo porque o contrato do §3.4 está fechado aqui; a UI
começa com os 4 roteiros genéricos e um gancho DEV que injeta um evento `filme` falso. O combo vem depois do filme porque a Vega
mexe nos dois no mesmo trecho (`applyHit` e o cancelamento) e porque sequência que termina em especial depende da queda do §3.3.

| Fatia | Dono | Critérios de aceite (medíveis) |
|---|---|---|
| **V2-1** | Vega | (1) teste que **falha hoje**: depois de `lp` acertar o boneco, apertar `hp` em cada tick do hitstop (1 a 4) → cancelamento em 4 de 4 (hoje 0 de 4); (2) meia-lua inteira dentro de um hitstop de 20 → especial sai; (3) com a flag **ligada**, `hashRegulares` do harness continua `f420ce928e06b304` e os snapshots `fight.test.ts:203` e `esquiva-cpu.test.ts:260` passam **sem `-u`**; (4) e2e de teclado no navegador: aperto no hitstop vira cancelamento |
| **V2-2** | Lyra (+Apolo) | (1) `git diff --stat src/fight` vazio (C3 aditivo à parte); (2) oráculo de pixel e snapshots sem mudança; (3) caminhada de 60 quadros a 144 Hz simulados: desvio-padrão do Δx por quadro ÷ média ≤ 0,15 (medir e registrar o valor de hoje antes); (4) p95 do quadro < 16,7 ms no perfil de celular do E7a; (5) tecla H desenha as caixas; (6) teste de salto de âncora ≤ 12 px nos 10 atlas; (7) a mola aparece nos 10 (captura antes/depois, vista pelo Apolo) |
| **V2-3a** | Cronos | `src/data/filmes.ts` com as 33 linhas do §4.3 (base, não efetivo) + `recuperacao` gerada do `frame-data.md`; teste de regra: as 31 + 2 variantes cumprem ≥ 1,10 × hk, ≤ 26 e tripwire 27,6; mediana v2/hoje entre 1,20 e 1,35 |
| **V2-3b** | Apolo | 31 roteiros (ou o modelo do tipo, declarado por especial); laudo A x B com custo em créditos e memória; se B, os prompts e o nome das poses `f0..f5` |
| **V2-3c** | Vega | um teste por linha da tabela do §3.1 (bloqueado → 0 `filme` e 1 `block`; esquivado → 0 `filme` e 0 `hit`; armadura → 0 `filme`; PARADE → 0 `filme` do atacante e 1 da CAMILLE no FOUETTÉ; dois contatos no mesmo tick → 1 `filme`; VADIVU → nunca); vida cai exatamente o valor da fórmula do §4.1 (contragolpe, escala, teto 26, `danoRecebido`, teto de combo); KO dentro do filme; troca de barra dentro do filme com a cena **depois**; BULKKOT e HOERI → 1 `filme`, 0 eventos extras; estado final do §3.3 (defensor em `lie`, atacante em `_lag` com `recuperacao`); cobertura: o frame-data com a flag ganha a coluna "filme" e marca ✓ nos 31; flag desligada → snapshots antigos sem `-u` |
| **V2-3d** | Lyra | os 31 tocam (gancho DEV `?filme=<lutador>:<golpe>` + e2e em laço); último quadro = posições `depois` do evento (≤ 1 px); barra do HUD termina em `hp` do motor; soma dos números = `dano`; pular depois do tick 10 funciona e **não muda o hash do motor** (mesma semente, pulando e não pulando); KO e troca de barra adiados até o fim do filme; p95 < 16,7 ms durante o filme no perfil de celular; com arte A, memória medida igual à de hoje (± 5 MB) |
| **V2-3e** | Íris | veredito sobre V2-3c/d com os critérios acima, rodando o jogo de verdade (não só unitário); harness rápido com `--motor-v2 filmes` dentro dos portões do §4.5 |
| **V2-4** | Vega + Lyra + Apolo | verificador: 20 de 20 combos combinam em pé e agachado; 20 de 20 com dano ≤ 36,8 sem o teto; CPU DIFÍCIL usa ao menos 1 combo próprio por luta em média no harness; a lista do TREINO e do "Como jogar" sai do dado (teste que muda o dado e vê o texto mudar) |
| **V2-6** | Cronos + Vega + Íris | §10 inteiro; os 6 chefões dentro da rampa; `hashRegulares` novo igual antes e depois do ajuste de chefão; trailer reescalado e **aprovado pelo dono** |
| **V2-7** | Íris | e2e completo verde; teste em aparelho real (celular deitado) com filme, interpolação e mola; veredito APROVADO/REPROVADO |
| **V2-8** | Alexandria | `docs/arquitetura.md`, `docs/como-adicionar-um-lutador.md` (filme, roteiro, combos, peso), CHANGELOG, `docs/balanco/README.md` com os hashes novos |

## 10. O que invalida e plano de regravar

| Artefato | Com flags desligadas | Com flags ligadas |
|---|---|---|
| Snapshot CPU × CPU (`tests/unit/fight.test.ts:203`, `esquiva-cpu.test.ts:260`) | intacto, **nunca** `-u` | snapshot **novo** em arquivo novo (`motor-v2-cpu.test.ts`), gerado uma vez pela Íris depois da V2-3c |
| `hashRegulares` `f420ce928e06b304` (`docs/balanco/`) | intacto | V2-1 sozinha: **tem de continuar igual**; filmes/combos: referência nova |
| Tomadas do trailer (`src/data/trailer/tomadas.ts`: semente, `tickMotor`, `impressao`) | intactas (o trailer fixa `motorV2: undefined`) | reescalar com `npm run trailer:escalar` e medir com `trailer:medir`; o dono reaprova |
| `danoRecebido` dos 6 chefões (0,80 a 0,925) | intactos | recalibrar com `--varrer-dano` |
| `frame-data.md` | intacto | coluna de dano do especial passa a ser a do filme; coluna "filme" nova |
| Tripwire de `balanco-adversarial.test.ts:34` | intacto | lê `filme.dano` também; o limite (60% da menor barra) **não muda** |
| Testes da sessão do especial, cinemática, áudio de acerto de especial, esquiva de especial, armadura | intactos | revisar os que contam acertos de especial (passa a ser 1 por execução) |
| Mola e interpolação | – | não mudam hash nenhum; mudam o **visual** do trailer (que desenha com `desenharLutador`): entra na reaprovação |

**Ordem da regravação (V2-6), numa rodada só, com as flags que vão para produção:**
1. `npm run balanco -- --completo --esquiva --motor-v2 entrada,filmes,combos` → conferir os portões do §4.5. A referência de hoje vai
   para `docs/balanco/sem-motor-v2/` (o mesmo padrão de `sem-esquiva/`).
2. `--varrer-dano` nos 6 chefões → novos `danoRecebido` (Vega grava nos `lutadores/*.ts`).
3. Rodada completa de novo → `hashRegulares` novo tem de ser **igual** ao do passo 1 (só chefão mudou).
4. Íris gera o snapshot novo (passo único, registrado no handoff com o hash).
5. Trailer: decidir **D-V6**, tirar o `motorV2: undefined` de `partida.ts`, reescalar, medir, dono reaprova.
6. `Regras.motorV2` ligado em produção. Rollback = desligar a flag (os dados de hoje continuam lá).

## 11. Riscos

| # | Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|---|
| V1 | Tarja no início avisa o rival humano; o filme aparece pouco em luta entre pessoas (A7) | Alta | Médio | registrar a taxa filme/especial nas lutas de teste do dono; as opções do §5 ficam prontas para decisão |
| V2 | Fadiga: tarja (48) + filme (45-75) a cada especial que conecta; a CPU usa muito especial | Alta | Alto | portão de tempo parado ≤ 15%; CURTA na repetição (**D-V4**); pular depois do tick 10 |
| V3 | Os 3 especiais forçados pelo piso (GARKUWA 2,9×, MARMA 2,75×, MASHI 1 1,8×) dominam | Média | Médio | harness por golpe; ajuste por custo/recuperação; **D-V2** |
| V4 | Todo filme derruba: especial que hoje é negativo no acerto (PASSO DO ELEFANTE −12, MEIA-LUA −10) passa a +16 com queda | Certa | Médio | `recuperacao` por especial em dado; o harness diz quem passou do ponto |
| V5 | Ordem de eventos no tick do filme (KO, troca de barra, fim de round) quebra HUD, música ou cena do chefão | Média | Alto | fila de eventos adiados (§3.5) com teste por caso; o motor não depende dela |
| V6 | Arte do protótipo do CAIO e do WEI LONG exposta no close (A6) | Alta | Médio | zoom 1,2 neles até R-1 |
| V7 | Arte nova estoura a memória no iPhone (A1) | Média (se B) | Alto | ≤ 2 páginas extras por luta, carga sob demanda, queda para a pose atual |
| V8 | Economia de energia muda: especial de vários acertos dava mais energia por acerto; agora o filme conta 1 | Certa | Baixo | o harness mede; ajuste em `filme`, se preciso |
| V9 | Mola e interpolação mexem no visual de e2e com captura e do oráculo | Média | Baixo | ambas desligadas em `?manual=1` |
| V10 | Regravar tudo (harness, chefões, trailer) custa uma rodada inteira e a reaprovação do dono | Certa | Médio | uma regravação só, no fim (V2-6), com todas as flags; V2-1 e V2-2 não pedem regravação |
| V11 | A MARMA perde o papel de abrir combo | Certa | Baixo | aceito como troca pelo filme; NILA fica mais fraca no pico (§4.3) |

**Dívidas conscientes:** o viés do P1 na colisão do mesmo tick (§3.1) continua; o filme não é "rollback-safe" para uma rede futura
porque não precisa ser (o motor é atômico, o que já basta para rede); a CURTA de 16 ticks da v1 não é feita.

## 12. O que depende do dono

| # | Decisão | Minha recomendação |
|---|---|---|
| **D-V1** | Os 2 VADIVU (troca de postura) não acertam ninguém. Ficam sem filme, só com a tarja? | sim, sem filme (não há o que conectar) |
| **D-V2** | GARKUWA, MARMA e MASHI 1 seguem a regra literal "maior que os normais" (sobem 1,8× a 2,9×) ou viram exceção? | regra literal, com o harness vigiando e ajuste por custo |
| **D-V3** | Fixar a tabela depois de jogar o A/B `hoje / v2 / forte`? | sim; partir de v2 |
| **D-V4** | O mesmo especial conectando de novo na mesma luta toca a versão CURTA (30 ticks)? | sim, da 2ª vez em diante |
| **D-V5** | No TREINO o filme toca inteiro ou CURTO? | CURTO |
| **D-V6** | O trailer mostra um filme? | sim, um (é o melhor momento do jogo para vender) |
| **D-V7** | A cadeia universal continua para todos, com os combos próprios por cima (R-7)? | sim |
| **D-V8** | Arte do filme: atual (A) ou nova (B), a partir do laudo do Apolo; e R-1 (CAIO e WEI LONG) | A para todos já; B só onde o laudo mostrar que A não convence |
| **D-V9** | Confirmar a leitura de "sem hits que contem" (H3): defendido = 1 bloqueio só | confirmar |

Continuam abertas da auditoria e tocam esta spec: R-1 (arte do CAIO e do WEI LONG), A7 (tarja avisa o rival).

## 13. O que provei e o que só inferi

- **Medi nos dados versionados:** todos os danos "hoje" e os `hk` vêm de `docs/balanco/frame-data.md` (medido no motor em
  2026-10-21, com `pow`). Não rodei o harness nesta sessão, então esses números valem para a versão `f6b9952cee5e` dos dados.
- **Calculei:** a tabela do §4.3 e a do §4.4 com um script de conta sobre esses números (escala, contragolpe, teto). É aritmética,
  não luta simulada: a cadeia de 6 golpes é o teto, e se ela combina de fato é o verificador do §6 que diz.
- **Li no código, sem teste:** entrada perdida no hitstop; caído intocável encerrando o combo; janela de cancelamento sem limite
  superior; `legacy` só mexendo em transformação e não em colisão (`pose.dx/dy` não entram em `hurtbox`/`attackBox`); trailer
  montando a partida num lugar só (`src/trailer/partida.ts:23-26`); a rota de ~42 da MARMA hoje.
- **Não conferi:** os valores de `custo` de energia de cada especial e o tempo real de pausa por round (o portão novo do §4.5 mede).
