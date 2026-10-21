# Sons por lutador: voz, magias, especiais, dano, KO e vitória

Autora: Nova (arquitetura), 2026-10-21. Missão `cmvikn8wx00ef01p7ckgxfsxm`. **Proposta. Nada implementado.**
Base: HEAD `ac57a80`. Implementa: Vega. Valida: Íris. Documenta: Alexandria.

Pedido do dono: cada um dos 10 lutadores tem sons **próprios e originais** ao lançar magia (projétil), ao fazer especial e
ao levar dano (e, se couber, no KO e na vitória). Decisão do dono: **sintetizados no código**, sem samples e sem créditos
(continua a D8: áudio 100% sintetizado).

---

## 0. Contexto e hipóteses

- **Escala:** jogo de navegador, 1 luta por aba, celular incluído. O teto de CPU é o do celular médio, não o do PC.
- **Maturidade:** produto em expansão (E3 entregue, chefão e provocação em andamento). Já existe **lock-step com o protótipo**
  e um **oráculo de áudio**. Esses dois testes não podem quebrar.
- **Equipe:** Vega implementa sozinha, sem pressa de prazo declarada. Por isso o plano tem fatias pequenas e cada uma deixa o
  jogo como hoje até a chave final ser ligada.

### 0.1 O que existe hoje (lido no código, não suposto)

| Peça | Onde | O que faz | Por que não basta |
|---|---|---|---|
| `AudioSys.voice` | `src/audio/audio-sys.ts:232` | dente-de-serra, 2 formantes fixos, vibrato fixo de 6,5 Hz | é o mesmo trato vocal para todos |
| `hurt(p)`, `special(p)`, `ko(p)` | idem `:285`, `:299`, `:313` | a voz de todos, só o tom muda (`p` = `LutadorDef.pitch`) | **o dono ouve o mesmo som transposto**: é a queixa |
| `fireballLaunch`, `fireballHit` | idem `:304`, `:308` | um único som de projétil | os 7 projéteis soam iguais |
| `sonsDoEvento` | `src/audio/eventos.ts:18` | evento -> método do AudioSys | **oráculo do lock-step**: ver 0.2 |
| receitas da cinemática | `src/render/identidade-especiais.ts` (`abertura`, `batida`) + `SOM_DO_ACERTO` | um som por especial, tocado pela tarja e pela sessão | **só toca com a cinemática ligada** (`fight.ts:393`) e é som da TARJA, não da luta |
| `tocarReceita` | `src/audio/receitas.ts` | toca uma lista de `tone`/`noise` | não tem voz |

### 0.2 Três travas que este desenho respeita

1. **Lock-step de som.** `tests/unit/luta-fidelidade.test.ts:175-178` compara, tick a tick, `sonsDoEvento(e)` com as chamadas
   do protótipo. Mudar a saída de `sonsDoEvento` quebra o teste. **Regra: `sonsDoEvento` não muda.** A identidade entra como
   uma camada POSTERIOR, que lê o evento e decide o que trocar.
2. **Oráculo do grafo de áudio.** `tests/unit/audio.test.ts` compara o grafo inteiro do Web Audio (inclusive o `init()`) com o
   AudioSys do protótipo. **Regra: `init()` e os métodos existentes não mudam.** Tudo o que é novo entra em método novo, e o
   limitador só é ligado por dependência do construtor (6.3).
3. **Fixture do chefão.** `tests/fixtures/audio-sys-antes-do-chefe.ts` congela as trilhas `fight`/`menu`. A música não muda.

### 0.3 Nomes dos eventos (correção do briefing)

O briefing fala em eventos `golpe`, `especial`, `hit` e `dano`. Os nomes reais da `EventoLuta` (`src/core/contratos.ts:339`)
são: `special` (início do especial), `projectile` (o projétil nasce), `hit` (com os campos `especial`, `golpe`, `projetil`,
`dano`, `grande`, `contragolpe`, `nivelCarga`, `dreno`), `throw`, `quebra-guarda`, `parry`, `clash`, `armor`, `carga`,
`rebote`, `troca-ficha`, `ko` e `round` (`fase: 'end'`). **Não existe evento `dano`**: dano é campo do `hit`/`throw`.

---

## 1. Opções de arquitetura (3) e recomendação

| | A. Trocar `sonsDoEvento` | B. Camada de identidade depois de `sonsDoEvento` | C. Sons na render/UI (como a cinemática) |
|---|---|---|---|
| Como | o mapeamento passa a receber o id do lutador e devolve métodos novos | `sonsDoEvento` fica igual; uma função pura `planoSonoro(ev, ctx)` diz o que **manter** e o que **acrescentar** | cada controlador de UI toca as próprias receitas |
| Lock-step | **quebra** (o teste compara a saída) | intacto por construção | intacto |
| Testável sem navegador | sim | sim (plano = dados) | parcial (depende da cena) |
| Funciona com a cinemática desligada | sim | sim | não (é o defeito de hoje) |
| Mudança em `fight.ts` | 1 linha | 1 linha + 2 condicionais | muitas, no território da Lyra |
| Rollback | difícil | uma constante | espalhado |

**Recomendação: B.** É a única que mantém o lock-step verde sem truque, funciona com qualquer preferência de cinemática e
cabe num módulo novo em `src/audio/`. A A seria mais curta, mas obrigaria a reescrever o oráculo do protótipo, que é a prova
mais forte que o projeto tem. A C repete o erro de hoje: identidade que só existe quando a tarja aparece.

### 1.1 Opções da prova de distinção (o "como provar sem ouvir")

| | P1. Paramétrica (só os dados) | P2. Renderizador de referência em TS + métrica espectral | P3. `OfflineAudioContext` no Chromium (Playwright) |
|---|---|---|---|
| Custo | baixo | médio (~300 linhas de teste) | alto (e2e) |
| Roda no `vitest` (Node) | sim | sim | não |
| Mede o som de verdade | não | o modelo do som (osciladores + biquads do cookbook RBJ, a mesma fórmula da spec Web Audio) | sim |
| Pode ser enganada | sim (muda número, som igual) | pouco | não |

**Recomendação: as três, em níveis.** P1 é o lint barato de todo PR. P2 é a régua oficial no `vitest`. P3 roda na validação
da Íris e prova que a régua P2 bate com o navegador. Detalhes na seção 7.

---

## 2. Módulos e responsabilidades

```
src/data/sons/                  DADOS puros (nenhum import de audio/ ou render/)
  tipos.ts                      PerfilVocal, Grito, Silaba, Chamada, AssinaturaEspecial
  perfis-vocais.ts              Record<IdLutador, PerfilVocal> (+ sobreposição da ficha SARPA)
  assinaturas.ts                Record<chave, AssinaturaEspecial>, as 33 chaves de IDENTIDADES
  validar.ts                    validarSons() + exigirSonsValidos() (roda no carregamento, como as falas)
src/audio/
  sintese-voz.ts        (novo)  Grito + PerfilVocal -> ChamadaReceita[] (sílabas, consoantes, contorno). Puro.
  identidade-sonora.ts  (novo)  planoSonoro(ev, ctx): o que manter de sonsDoEvento e o que acrescentar. Puro.
                                variacao(semente, ...) (hash sem estado). IDENTIDADE_SONORA (a chave de rollback).
  receitas.ts           (+)     ChamadaReceita ganha o tipo 'V' (voz); tocarReceita encaminha 'V' para vozFormante
  audio-sys.ts          (+)     vozFormante(), barramento de identidade, garganta por lutador, orçamento de fontes,
                                limitador opcional. init() e os métodos antigos NÃO mudam.
  eventos.ts            (+)     reagirComIdentidade(audio, eventos, ctx, agendar). reagirAosEventos e sonsDoEvento NÃO mudam.
```

Dependência: `data/sons` <- `audio` <- `ui/cenas/fight.ts`. Os tipos de chamada em `data/sons/tipos.ts` têm **a mesma forma**
de `ChamadaReceita`, sem importar dela (o mesmo padrão que `receitas.ts` já usa com o `Som` da render).

### 2.1 Fluxo de um tick

```
game.update -> game.events
  -> reagirComIdentidade(audio, eventos, ctx)
       para cada evento:
         base  = sonsDoEvento(ev)                 (o mesmo de hoje; o lock-step continua olhando só isto)
         plano = planoSonoro(ev, ctx)             (puro: { manter: ChamadaSom[], tocar: ItemDoPlano[] })
         toca plano.manter pelo nome (como hoje) e plano.tocar por tocarReceita (com prioridade e garganta)
       IDENTIDADE_SONORA = false  =>  idêntico a reagirAosEventos(audio, eventos)
```

`ItemDoPlano = { receita: ChamadaReceita[]; prioridade: 0..3; garganta?: IndiceLutador; atrasoMs?: number }`.

---

## 3. Perfil sonoro por lutador (a voz)

### 3.1 Modelo da voz (a primitiva nova `vozFormante`)

A voz de hoje é dente-de-serra por 2 filtros passa-banda. A nova usa o mesmo princípio (fonte + filtro, o modelo clássico de
síntese por formantes), com o que falta para dar identidade:

- **Trato vocal (`k`)**: multiplica os 3 formantes. Trato longo (homem grande) = `k` < 1; trato curto = `k` > 1. É isto, e não
  o tom, que faz uma voz soar de outra pessoa. **É o que falta hoje.**
- **3 formantes com ganho próprio** (F1 1,0, F2 0,7, F3 = `ganhoF3`), e **deslizamento** de vogal para vogal (ditongo).
- **Contorno de tom** em 3 pontos (início, pico, fim) em semitons relativos ao `f0` do perfil.
- **Vibrato** com frequência, profundidade e atraso próprios.
- **Aspereza** (modulação de amplitude 25-55 Hz: rouquidão, rosnado) e **sopro** (ruído no F2: voz soprosa).
- **Coro** opcional (2ª fonte desafinada + sub-oitava) e **formante extra** estreito (o assobio do canto de garganta).
- **Consoantes** sugeridas por ruído antes da vogal: plosiva (`p t k d b g`: estalo de 15-25 ms passa-alta), fricativa
  (`s sh ch f h z`: faixa de ruído de 40-90 ms), vibrante (`r`: modulação de 24-28 Hz nos primeiros 80 ms), e final nasal
  (`m n`: formantes fechados 250/1000/2200 com ganho 0,4).

Formantes de referência (adulto, `k` = 1), em Hz:

| Vogal | F1 | F2 | F3 |
|---|---|---|---|
| a | 730 | 1090 | 2440 |
| e (é) | 530 | 1840 | 2480 |
| ê | 400 | 2000 | 2550 |
| i | 270 | 2290 | 3010 |
| o | 570 | 840 | 2410 |
| u | 300 | 870 | 2240 |
| ə (uh) | 640 | 1190 | 2390 |
| m/n (nasal) | 250 | 1000 | 2200 |

Honestidade sobre o resultado: síntese por formantes dá **gritos com a forma da vogal**, não palavras inteligíveis. As
palavras abaixo dão o desenho (vogais, consoante de ataque, contorno). Ninguém vai "ler" a palavra no som, e não precisa.

### 3.2 Os 10 perfis

`f0` = tom da voz de dano leve. O grito do especial usa `f0 x 1,25` salvo indicação. O `pitch` de `LutadorDef` **não muda**
(o motor o copia nos eventos e o lock-step compara).

| Lutador (origem) | f0 Hz | k | onda / Q / F3 | ataque | vibrato Hz / prof. / atraso | aspereza Hz / prof. | sopro | extra | contorno típico | personalidade em som |
|---|---|---|---|---|---|---|---|---|---|---|
| HAYATO (Japão) | 165 | 1,00 | serra / 7 / 0,35 | 6 ms | nenhum | nenhuma | 0,10 | — | sobe 1 st e corta seco, queda de −5 st | disciplina: kiai curto, sem floreio |
| WEI LONG (China) | 118 | 0,88 | serra / 5 / 0,30 | 20 ms | 4,5 / 1,5% / 120 ms | 32 / 0,20 | 0,25 | — | plano e longo, cai −3 st no fim | a expiração do qigong: calma e peso |
| MIN-JI (Coreia do Sul) | 300 | 1,20 | serra / 8 / 0,45 | 4 ms | nenhum | nenhuma | 0,05 | — | sobe +3 st e corta | velocidade: o "kihap" do taekwondo, agudo e cortado |
| CAIO (Brasil) | 170 | 1,02 | serra / 4 / 0,40 | 12 ms | 5,5 / 3% / 60 ms | nenhuma | 0,15 | — | sobe +4 st no fim (chamada da roda) | ginga: voz aberta, quase cantada |
| AMINU (Nigéria) | 135 | 0,94 | quadrada / 6 / 0,30 | 8 ms | nenhum | 50 / 0,10 | 0,10 | — | **desce −7 st** (como o kalangu) | voz de peito, firme; o tambor falante na fala |
| CENTELLA (México) | 290 | 1,15 | serra / 4 / 0,60 | 6 ms | 6,5 / 4% / 150 ms | nenhuma | 0,10 | `r` rolado 26 Hz | arco: sobe +5 e desce −4 st | showbiz: brilhante, para a arquibancada |
| CAMILLE (França) | 255 | 1,12 | serra / 10 / 0,20 | 15 ms | 5 / 1% / 80 ms | nenhuma | 0,20 | — | contido, cai −2 st | esgrima: precisa, sem esforço aparente |
| NILA, GAJA (Índia, Kerala) | 230 | 1,14 | serra / 6 / 0,30 | 10 ms | nenhum | nenhuma | 0,15 | final nasal | plano e grave para a voz dela | elefante: centrada, firme |
| NILA, SARPA | 258 (×1,12) | 1,14 | serra / 7 / 0,40 | 5 ms | nenhum | nenhuma | **0,45** | início fricativo 5,2 kHz | sobe +4 st | serpente: sibilante (o mesmo chiado do E9) |
| BAATAR (Mongólia) | 100 | 0,84 | serra / 5 / 0,25 | 25 ms | 3 / 1% / 150 ms | 42 / 0,35 | 0,20 | formante extra 1400 Hz, Q 25, ganho 0,5 (assobio do canto de garganta) | crescendo longo | o maior do elenco: rosnado e garganta |
| ZENON (Grécia, chefão) | 112 | 0,92 | serra / 8 / 0,35 | 25 ms | 5 / 2% / 100 ms | nenhuma | 0,05 | coro ±8 cents + sub-oitava 30% | sobe devagar e cai com desdém | teatral e sinistro: a voz "dobrada" |

**Espelho** (mesmo lutador dos dois lados): o índice 1 usa `f0` −1 st e `k × 0,97` (D-S7).

### 3.3 Grito característico, vitória e KO por lutador

Notação: sílabas separadas por hífen; vogal em `[ ]`; `st` = contorno em semitons. Palavras reais vêm marcadas **(rev.)**:
precisam de revisão de falante nativo, a mesma pendência que já existe para os nomes dos golpes. Cada uma tem a alternativa
**não-lexical** pronta (D-S1).

| Lutador | Kiai base (dano não, ataque) | Vitória (fim da luta) | KO | Alternativa não-lexical |
|---|---|---|---|---|
| HAYATO | "SEI-YA!" [e→i][a], plosiva-s, 0,30 s | "O-SU!" (押忍, cumprimento do karatê) [o][u] **(rev.)** | "U-AAAH" [u→a→o] 1,0 s | "HA!" / "HAA-A" |
| WEI LONG | "HŌ-HA!" [o 0,25][a 0,30], expirado | "HAO!" (好, "bom") [a→o] 0,5 s **(rev.)** | "HOOO" grave [o→u] 1,1 s | "HŌ…" |
| MIN-JI | "HYAP!" [i→a] fim -p, 0,18 s | "A-SSA!" (아싸, "isso!") [a][a] **(rev.)** | "KYAA-A" [i→a] 0,9 s | "HYA!" |
| CAIO | "IÊ!" [i→ê] sobe, 0,35 s | "IÊ-Ê!" [i→ê][ê] (o chamado da roda) | "AAI-Ô" [a→i][o] 1,0 s | "Ê-Ê!" |
| AMINU | "HAU!" [a→u] desce −7 st, 0,30 s | "NA CI!" (hauçá, "venci") [a][i] **(rev.)** | "HOO-OH" [o→o] desce, 1,0 s | "HAU!" |
| CENTELLA | "¡YA-JÚ!" [a][u] sobe, 0,35 s | "¡E-SO!" [e][o], `r` rolado no ataque **(rev.)** | "¡AAY!" [a→i] 0,9 s | "¡YA-HA!" |
| CAMILLE | "HÉ!" [é] 0,18 s, ataque suave | "VOI-LÀ!" [o→a][a] **(rev.)** | "AH-NON" [a][o nasal] 0,9 s | "HÉ-HA" |
| NILA GAJA | "DHAM!" [a] final -m, 0,30 s | "SA-RI!" (malaiala, "certo") [a][i] **(rev.)** | "HAA-A" [a→ə] 0,9 s | "HM-HA" |
| NILA SARPA | "SSA!" [a] início s, 0,22 s | (a vitória usa a voz da ficha ativa) | (idem) | "SSI-YA" |
| BAATAR | "UGH-HA!" [ə][a] 0,40 s | "HUU-RAI! HUU-RAI!" (exclamação ritual mongol) [u][a→i] ×2 **(rev.)** | "UUURGH" [u→ə] 1,2 s | "HAA-UGH" |
| ZENON | "HMH… HA!" [m][a] 0,45 s | risada "HA-HA-HA" descendo −2 st por sílaba, com sub-oitava | "Ó-CHI!" (όχι, "não") [o][i] 1,1 s **(rev.)** | "HAAAH" |

### 3.4 Dano: as variações

Escolha pelo evento (sem campo novo no motor). A voz é **do defensor** (`ctx.ids[ev.defensor]`).

| Variação | Quando (campos do evento) | Forma | Variantes |
|---|---|---|---|
| **leve** | `hit` com `!grande && (dano ?? 0) < 12 && !contragolpe` | 1 sílaba, 0,12-0,16 s, `f0 × 1,0`, contorno −3 st, vol 0,8 | 3 vogais por perfil (ex.: HAYATO `[ə] [u] [a]`), escolhidas por `variacao` |
| **pesado** | `hit` com `grande` ou `dano >= 12` ou `contragolpe`; todo `throw` | 0,22-0,28 s, `f0 × 1,15 -> × 0,8`, vogal `[a]`, aspereza +0,15, vol 1,0 | 2 variantes |
| **guarda quebrada** | `quebra-guarda` | grunhido de surpresa, contorno **sobe** +4 st, 0,18 s, `[o→a]`, mais o "vidro" comum: R(passa-alta 6000, 1, 0,12, 0,25) + T(triângulo 3520, 0,08, 0,08) + T(triângulo 4186, 0,06, 0,06, +30 ms) | 1 |
| **esforço** | `armor` (WEI LONG e BAATAR absorvendo) | "HNN!" nasal fechado, 0,10 s, vol 0,6 | 1 |
| **KO** | `ko` | o KO do perfil (3.3), **mais o gongo comum de hoje** reproduzido como receita: R(passa-baixa 500→80, 1, 0,3, 0,4) + T(seno 110, 1,4, 0,5, +100 ms) + T(seno 221, 1,0, 0,2, +100 ms) | 1 |

O gongo fica comum de propósito: é a marca do KO do JOGO, não do lutador.

---

## 4. Assinatura de cada especial (33 entradas, E1..E12)

### 4.1 Vocabulário e momentos

Notação do Apolo (`docs/identidade-visual-especiais.md` §1.6): `T(onda f0→f1, duração s, vol, +quando, filtro)` = `tone()`;
`R(filtro f0→f1, Q, duração s, vol, +quando)` = `noise()`. Cada chamada leva uma **camada**: `ataque` (0-30 ms, o transiente),
`corpo` (o tom ou o varrido), `cauda` (o decaimento) ou `extra`. A camada decide a ordem de corte quando falta orçamento (6.2).

Momentos de cada especial:

| Momento | Evento | O que toca | O que sai do som de hoje |
|---|---|---|---|
| **grito** | `special` (momento `inicio`) | o grito do golpe na voz do lutador | `special(p)` (o "HA-DOU" genérico) |
| **conjuração** | `special` | a carga do golpe (corpo da assinatura) | idem |
| **lançamento** | `projectile` | o projétil nascendo (só os 7 projéteis) | `fireballLaunch()` |
| **impacto** | `hit` com `projetil` | o projétil acertando | `fireballHit` do `hit.snd` |
| **estampa** | `hit`/`throw` com `especial` e corpo a corpo | camada SOBRE `punch`/`kick` (o corpo físico fica) | nada (acrescenta) |
| **defesa** | `block`/`parry do rival` com `especial` | a estampa abafada (passa-baixa 1200 Hz, ×0,4), a mesma regra da sessão da cinemática | nada |
| **sucesso** | `parry` (PARADE) e `clash` com `lutador` (GARKUWA) | grito + chamadas de sucesso | `block()`/`fireballHit()` ficam, a assinatura acrescenta |

Como o `projectile` não traz `golpe`, o golpe sai de **(id, ficha, `style`)**: HAYATO `orb` = sFire; WEI LONG `orb` = sFire e
`wave` = sDown; MIN-JI `blade` = sFire; CAIO `boomerang` = sFire; ZENON `anel` = sFire da ficha ativa (`chefe2` = SELO MAIOR).
Não há ambiguidade, e o motor não muda. A validação no boot confere que cada `style` usado nos dados tem dono único por
lutador.

As receitas da tarja (`abertura`/`batida`) seguem sendo da cinemática. As assinaturas abaixo reaproveitam o **timbre** delas
(a família é a mesma do §1.6 do Apolo), mas são sons de luta: mais curtos e com ataque mais forte.

### 4.2 Tabela das 33

Volumes são o ponto de partida. A régua de volume (6.4) pode corrigir até ±3 dB.

**E1 RAIO, HAYATO** (estalo elétrico em rajada + quadrada aguda, base Mi5 659 Hz)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `hayato.base.sFire` RAIJIN-DAN (projétil `orb`) | "RAI-DAN!" [a→i][a] −5 st, plosiva d | conj.: ataque R(passa-alta 5000, 1, 0,04, 0,25) ×3 a +0/+40/+80 ms. **lanç.:** ataque R(passa-alta 6000, 1, 0,03, 0,35); corpo T(quadrada 659→1318, 0,18, 0,08) + T(serra 110, 0,3, 0,12, passa-baixa 900); cauda R(passa-banda 3000→800, 2, 0,25, 0,15) | ataque R(passa-alta 4000, 1, 0,05, 0,4); corpo T(quadrada 1318→330, 0,12, 0,1) + T(seno 90→35, 0,25, 0,5); cauda R(passa-alta 5000, 1, 0,03, 0,2) a +50 e +110 ms (o trovão estalando) |
| `hayato.base.sDown` RAIJIN-KEN | "RAI-KEN!" [a→i][e] fim -n | corpo R(passa-baixa 2000→200, 1, 0,35, 0,4) + T(quadrada 330→990, 0,1, 0,08) | ataque R(passa-alta 5000, 1, 0,04, 0,35); corpo T(quadrada 990→1976, 0,08, 0,07); cauda T(seno 120→40, 0,2, 0,5) |
| `hayato.base.sFwd` KAMINARI-STEP | "KA-MI!" [a][i] plosiva k | corpo R(passa-banda 1200→5000, 2, 0,12, 0,3) (zíper); extra R(passa-alta 7000, 1, 0,02, 0,2, +60 ms) | ataque R(passa-alta 5000, 1, 0,04, 0,3); corpo T(quadrada 659, 0,06, 0,08) |

**E2 ESCAMA DE DRAGÃO, WEI LONG** (bumbo grave longo + ronco, base Sol2 98 Hz; sem gongo)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `wei-long.base.sFire` LONG ZHANG (projétil `orb` enorme) | "HŌ-HA!" [o 0,25][a 0,30] expirado | conj.: T(seno 70→45, 0,6, 0,5) + R(passa-baixa 400→80, 1, 0,5, 0,3). **lanç.:** ataque T(seno 140→70, 0,08, 0,5); corpo T(seno 98, 0,9, 0,3) + T(serra 70→55, 0,6, 0,12, passa-baixa 400) + R(passa-banda 300, 1, 0,8, 0,25, ataque 0,15 s) (rugido); cauda T(seno 49, 1,0, 0,25, +200 ms) | ataque T(seno 98→40, 0,5, 0,7); corpo R(passa-baixa 600→80, 1, 0,45, 0,5); cauda T(serra 55, 0,3, 0,1, passa-baixa 300) |
| `wei-long.base.sDown` ZHEN DI (projétil `wave`, rente ao chão) | "ZHEN!" [e] fim -n, grave (`f0 × 1,0`) | conj.: T(seno 60→35, 0,4, 0,8) + R(passa-baixa 250, 1, 0,5, 0,5) (o pisão). **lanç.:** corpo 3 baques T(seno 80→40, 0,12, 0,4) a +0/+90/+180 ms; cauda R(passa-baixa 180, 1, 0,6, 0,35) (o tremor) | ataque T(seno 70→30, 0,35, 0,7); corpo R(passa-baixa 300→60, 1, 0,3, 0,45) |
| `wei-long.base.sFwd` TIE SHAN KAO | "KAO!" [a→o] | corpo T(triângulo 220, 0,5, 0,15) (ferro) + R(passa-banda 400, 2, 0,2, 0,3) | ataque T(triângulo 440→220, 0,15, 0,15); corpo T(seno 55, 0,5, 0,7); cauda R(passa-baixa 800→100, 1, 0,25, 0,4) |

**E3 LÂMINA CRESCENTE, MIN-JI** (sopro agudo subindo + sino pequeno, Dó#6 1109 Hz)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `min-ji.base.sFire` BULKKOT (2 projéteis `blade`) | "BUL-KOT!" [u][o] plosivas b, t | conj.: nenhuma (o grito basta; o golpe solta 2 lâminas). **lanç.** (cada lâmina; a 2ª a +2 st por `variacao`): corpo R(passa-banda 1800→4200, 1,5, 0,1, 0,25) + T(triângulo 1109, 0,15, 0,08); extra R(passa-alta 3000, 1, 0,08, 0,1) (o fogo) | ataque R(passa-banda 4200→1500, 1,5, 0,08, 0,3); corpo T(triângulo 1109→1661, 0,1, 0,1); cauda T(seno 160→60, 0,12, 0,35) |
| `min-ji.base.sDown` HOERI CHAGI (3 acertos) | "HI-YAAP!" [i][a] sobe | corpo 3 sopros R(passa-banda 1500 / 2200 / 3200, 1,5, 0,08, 0,25) a +0/+60/+120 ms | ataque R(passa-banda 2500→4500, 1,5, 0,06, 0,25); corpo T(triângulo 1109 × [1; 1,26; 1,5] pelo `hit.acertos`, 0,08, 0,08): **o sino sobe a cada acerto** |
| `min-ji.base.sFwd` TWIO YEOP CHAGI | "TWI-O!" [u→i][o] plosiva t | corpo R(passa-banda 900→3000, 1,2, 0,25, 0,3) (o ar rasgando) | ataque R(passa-banda 3000→900, 1,2, 0,1, 0,3); corpo T(seno 120→35, 0,22, 0,5); cauda T(triângulo 1109, 0,2, 0,1) |

**E4 ARCO DE GINGA, CAIO** (berimbau: triângulo 196→220 Hz, o "dóin" que sobe; caxixi: ruído 3 kHz curto)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `caio.base.sFire` ONDA VERDE (projétil `boomerang`) | "IÊ!" [i→ê] sobe +4 st | conj.: caxixi R(passa-banda 3000, 3, 0,05, 0,2). **lanç.:** corpo T(triângulo 196→220, 0,35, 0,3); ataque caxixi a +0 e +80 ms; cauda R(passa-banda 700→1500, 1, 0,35, 0,12) | corpo T(triângulo 220→196, 0,2, 0,3) (o dóin **descendo**); ataque caxixi; cauda T(seno 140→60, 0,15, 0,4) |
| `caio.base.sDown` RABO-DE-ARRAIA | "Ô-A!" [o][a] | corpo R(passa-banda 600→1600, 1, 0,3, 0,3) + T(triângulo 147→165, 0,3, 0,25) (berimbau grave) | corpo T(triângulo 165→147, 0,2, 0,25); ataque caxixi |
| `caio.base.sFwd` MEIA-LUA | "Ê-HÊ!" [ê][ê] brincalhão | corpo T(triângulo 294→330, 0,25, 0,25); ataque caxixi a +0 e +80 ms | corpo T(triângulo 330→294, 0,15, 0,2); cauda T(seno 120→35, 0,22, 0,5) |

**E5 CORDA TRANÇADA, AMINU** (kalangu: seno que DESCE 180→120 Hz + estalo de pele 900 Hz)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `aminu.base.sFire` MASHI (carga, 3 níveis) | "HAU!" curto, desce | conj.: kalangu T(seno 180→120, 0,22, 0,4) + R(passa-banda 900, 2, 0,03, 0,3). **Evento `carga`** (no lugar de `uiSelect`): `nivel` batidas, a cada 70 ms, de T(seno 180→120 / 240→150 / 300→180, 0,15, 0,45) | `nivelCarga` batidas de kalangu (a regra que hoje está em `fight.ts:124-127`, que passa para os dados); nível 3 + T(seno 55, 0,5, 0,8) |
| `aminu.base.sDown` GARKUWA (sucesso) | **sem grito no início** (D-S3) | no início, só a postura: T(seno 260→200, 0,12, 0,25) (pele esticada) | **sucesso** (`clash` com `lutador`): grito "HAP!" + R(passa-alta 2500, 1, 0,05, 0,2) + T(seno 90→45, 0,25, 0,5) + 2 batidas T(seno 300→200, 0,12, 0,4) e T(seno 240→160, 0,12, 0,4, +70 ms) |
| `aminu.base.sFwd` PASSO DO LEÃO | "ZA-KI!" (hauçá, "leão") [a][i], fricativa z **(rev.)** | corpo 2 kalangu T(seno 180→120, 0,2, 0,45) e T(seno 160→110, 0,2, 0,45, +90 ms); cauda R(passa-banda 400, 1, 0,25, 0,3) | corpo T(seno 160→110, 0,2, 0,45); ataque R(passa-banda 900, 2, 0,03, 0,3); cauda R(passa-baixa 500→100, 1, 0,2, 0,3) |

**E6 ESTRELA DE LUCHA, CENTELLA** (sino do ringue: triângulo 1568 + seno 2350 Hz; torcida: ruído 700 Hz de ataque lento)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `centella.base.sFire` PLANCHA | "¡Ó-RA-LE!" [o][a][e] `r` rolado **(rev.)** | corpo T(triângulo 1568, 0,6, 0,2) + T(seno 2350, 0,4, 0,08) (o "ding"); cauda R(passa-banda 700, 0,8, 0,7, 0,2, ataque 0,2 s) (a torcida subindo) | corpo T(seno 120→35, 0,22, 0,5) + R(passa-baixa 1500→150, 1, 0,3, 0,45) (a lona); cauda R(passa-banda 900, 0,7, 0,6, 0,18, ataque 0,15 s) |
| `centella.base.sDown` HURACANRANA (agarrão) | "¡HU-RA!" [u][a] `r` rolado | corpo R(passa-banda 800→3000, 1,2, 0,2, 0,3) (o giro) | no `throw`: corpo T(triângulo 1568, 0,3, 0,15) + R(passa-baixa 1200→100, 1, 0,3, 0,5); cauda R(passa-banda 600, 1, 0,5, 0,2, ataque 0,1 s) (o "ôô" da torcida) |
| `centella.base.sFwd` RESORTE | "¡YA-JÚ!" [a][u] | corpo T(serra 98→140, 0,3, 0,12, passa-baixa 800) (a corda tensionando). **Evento `rebote`** (mantém `land`): T(serra 140→98, 0,25, 0,15, passa-baixa 1200) + T(seno 220→440, 0,15, 0,3) | corpo T(seno 220→440, 0,15, 0,25) + T(seno 120→40, 0,22, 0,5); cauda T(triângulo 1568, 0,2, 0,1) |

**E7 FIO DE FLORETE, CAMILLE** (lâmina: triângulo 2637 Hz longo e baixo + chiado passa-alta 6 kHz)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `camille.base.sFire` PARADE (+ FOUETTÉ `sResp`) | **sem grito no início** (D-S3) | no início, só a postura: T(triângulo 2637, 0,3, 0,04) (a lâmina erguida, quase inaudível) | **sucesso** (`parry`): grito "HÉ!" + T(triângulo 3136, 0,08, 0,15) + T(triângulo 3520, 0,08, 0,15, +50 ms) (as lâminas se cruzando) + R(passa-alta 6000, 1, 0,1, 0,2). **FOUETTÉ** (`hit` com `golpe: 'sResp'`): voz da CAMILLE "TOU-CHÉ!" [u][é] **(rev.)** + corpo T(triângulo 2637→1760, 0,25, 0,12) + R(passa-alta 6000, 1, 0,08, 0,2) |
| `camille.base.sDown` COUP D'ARRÊT | "AR-RÊT!" [a][ê] plosiva t | corpo R(passa-alta 5000→8000, 1, 0,08, 0,25) (a estocada) | corpo T(seno 190→50, 0,13, 0,5) + T(triângulo 3520, 0,12, 0,1); ataque R(passa-alta 7000, 1, 0,04, 0,25). Com `contraEspecial`: extra T(quadrada 880, 0,25, 0,06, passa-baixa 2000) a +50 ms: **o bip do placar elétrico da esgrima** |
| `camille.base.sFwd` REVERS | "RE-VERS!" [e][é] fricativa s | corpo R(passa-banda 2000→700, 1, 0,2, 0,25) (o giro) | corpo T(triângulo 2637, 0,2, 0,12); ataque R(passa-banda 1500, 2, 0,05, 0,2) |

**E8 CHAMA DE LAMPARINA, NILA GAJA** (chenda, o tambor de Kerala: seno 140→90 em rufo) e **E9 ESPIRAL DE SERPENTE, NILA SARPA** (chiado 5,2 kHz, Q 4)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `nila.base.sFire` GOLPE MARMA | "HM!" nasal, contido, vol 0,6 | corpo T(seno 880, 0,5, 0,06) (o foco); ataque R(passa-banda 1200, 2, 0,02, 0,3) (o dedo) | corpo T(seno 140→90, 0,2, 0,4); cauda T(seno 1760, 0,6, 0,04) + T(seno 1760, 0,6, 0,04, desafinado +12 cents): **o batimento de dois senos é o zumbido do atordoamento** |
| `nila.base.sFwd` PASSO DO ELEFANTE | "DHAM!" [a] fim -m, grave | corpo 2 golpes de chenda T(seno 110→70, 0,25, 0,5) + R(passa-baixa 400, 1, 0,2, 0,3) a +0 e +200 ms | corpo rufo 4 × T(seno 140→90, 0,08, 0,3) a cada 45 ms; cauda T(seno 60→35, 0,3, 0,6) |
| `nila.sarpa.sFire` BOTE | "SSA!" [a] início s | corpo R(passa-banda 5200, 4, 0,3, 0,2) + T(seno 160, 0,1, 0,3) | ataque R(passa-banda 5200, 4, 0,12, 0,25); corpo T(seno 200→80, 0,1, 0,35) (o bote seco) |
| `nila.sarpa.sFwd` SALTO DA SERPENTE | "SHI-YA!" [i][a] sobe | corpo R(passa-banda 2000→6000, 3, 0,35, 0,2) + T(seno 330→660, 0,3, 0,12) | corpo T(seno 120→35, 0,22, 0,5); cauda R(passa-banda 6000→2000, 3, 0,15, 0,2) |

**Evento `troca-ficha`** (VADIVU; mantém `jump`): para SARPA, R(passa-banda 2000→5200, 4, 0,25, 0,2) (o chiado subindo); de
volta para GAJA (`ficha: null`), 2 × T(seno 140→90, 0,2, 0,4) a +0 e +90 ms.

**E10 VENTO DA ESTEPE e E11 PENA DE ÁGUIA, BAATAR** (bordão em quinta de morin khuur: serra 73 + 110 Hz, passa-baixa 500; águia: triângulo 2400→1500)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `baatar.base.sFire` ARREMESSO DO AVARGA (E10, agarrão) | "UGH-HA!" [ə][a] | corpo T(serra 73, 0,5, 0,15, passa-baixa 500) + T(serra 110, 0,5, 0,08, passa-baixa 600) | no `throw`: ataque T(seno 55, 0,4, 0,6); corpo R(passa-baixa 600→60, 1, 0,5, 0,55) (o corpo no chão); cauda T(serra 73→55, 0,6, 0,12, passa-baixa 400) (o bordão caindo) |
| `baatar.base.sDown` QUEBRA-BASE (E10) | "HEH!" [e] curto | corpo R(passa-banda 300→150, 1, 0,25, 0,4) + T(seno 90→45, 0,3, 0,4) | corpo T(seno 90→45, 0,2, 0,45); cauda T(serra 110, 0,15, 0,08, passa-baixa 500) |
| `baatar.base.sFwd` MERGULHO DA ÁGUIA (E11) | "HAA-AA!" [a] longo, crescendo | corpo T(triângulo 2400→1500, 0,3, 0,12) + a mesma desafinada +20 cents (o grito da águia); cauda R(passa-banda 900, 1, 0,6, 0,2) (as asas) | ataque T(seno 45, 0,6, 0,8); corpo R(passa-baixa 900→80, 1, 0,4, 0,5); cauda T(triângulo 2000→1400, 0,15, 0,06) |

**E12 MEANDRO E ANEL, ZENON** (quinta de órgão Ré/Lá 147/220 Hz; cravo triângulo 1175→880; seno 50; moedas triângulo 2637)

| Chave | Grito | Conjuração / lançamento | Impacto / estampa |
|---|---|---|---|
| `zenon.base.sFire` SELO DO ARCONTE (projétil `anel`) | "HMH… HA!" [m][a] | conj.: T(serra 147, 0,4, 0,08, passa-baixa 900) + T(serra 220, 0,4, 0,05, passa-baixa 900). **lanç.:** ataque T(triângulo 1175→880, 0,12, 0,1) (cravo); corpo R(passa-banda 500, 3, 0,5, 0,1) (o anel girando); cauda a quinta de órgão 0,5 s, vol 0,05 | ataque T(triângulo 1175→880, 0,12, 0,1); corpo T(seno 50, 0,4, 0,6); cauda R(passa-baixa 1200→100, 1, 0,3, 0,4) |
| `zenon.base.sDown` COLUNA DE ÔNIX | "HA!" seco, desdém | corpo T(serra 147→294, 0,25, 0,1, passa-baixa 1200) (o órgão subindo uma oitava) + R(passa-baixa 800→2400, 1, 0,25, 0,2) (a pedra subindo) | ataque T(triângulo 1175→880, 0,12, 0,1); corpo T(seno 50, 0,3, 0,6); cauda T(triângulo 587, 0,15, 0,08) (pedra batendo) |
| `zenon.base.sFwd` TRIBUTO (dreno) | "DÓ-SE!" (δώσε, "dá!") [o][e] **(rev.)** | corpo quinta de órgão curta (0,3 s) | `BATIDA_ZENON`; **com `dreno > 0`** + 3 moedas T(triângulo 2637, 0,05, 0,05) a +0/+40/+80 ms (o dreno se ouve; sem dreno, sem moeda) |
| `zenon.chefe2.sFire` SELO MAIOR (projétil `anel`, fase 2) | "HA-HA!" [a][a], sub-oitava a 50% | como o SELO, mais T(serra 73,5, 0,7, 0,1, passa-baixa 500) (o pedal de Ré grave) | o do SELO mais R(passa-baixa 400→60, 1, 0,5, 0,4) |
| `zenon.chefe2.sFwd` DECRETO (dreno, fase 2) | "NÓ-MOS!" (νόμος, "lei") [o][o] **(rev.)** | corpo T(serra 147, 0,3, 0,1, passa-baixa 900) + R(passa-banda 1500→400, 1, 0,3, 0,25) (cruzando) | `BATIDA_ZENON` + T(triângulo 1760→1175, 0,1, 0,1) (o costa de mão no cravo); moedas com `dreno > 0` |

### 4.3 Eventos que não mudam

`swing`, `jump`, `land`, `deny`, `dust`, `block` comum, `round start/fight/timeover`, `perfect`, `esquiva`, `esquivou`,
`fase-chefe` e `clash` entre dois projéteis continuam exatamente como hoje. O `victory()` do fim do round também fica. O kiai
de vitória **soma** a ele, só no fim da luta (`round end` com `fimDaLuta` e `vencedor` não nulo), com `atrasoMs: 950`: cai no
acorde final do jingle e quando o balão de vitória da provocação aparece (t ≥ 56 ticks), sem acoplar código (D-S2).

---

## 5. Contrato de dados

### 5.1 Tipos (`src/data/sons/tipos.ts`)

```ts
export type Vogal = 'a' | 'e' | 'ê' | 'é' | 'i' | 'o' | 'u' | 'ə' | 'm' | 'n';
export type Consoante = 'p' | 't' | 'k' | 'b' | 'd' | 'g' | 's' | 'sh' | 'ch' | 'h' | 'f' | 'z' | 'r';
export interface Silaba { readonly c?: Consoante; readonly v: Vogal; readonly v2?: Vogal; readonly t: number; readonly st?: readonly [number, number, number]; readonly fim?: 'm' | 'n' | 't' | 'k' | 'p' }
export interface Grito { readonly silabas: readonly Silaba[]; readonly fatorF0?: number; readonly vol?: number; readonly pausa?: number; readonly subOitava?: number }
export interface PerfilVocal {
  readonly f0: number; readonly k: number; readonly onda: 'sawtooth' | 'square'; readonly q: number; readonly ganhoF3: number; readonly atq: number;
  readonly vib: { readonly hz: number; readonly prof: number; readonly atraso: number };
  readonly aspereza: { readonly hz: number; readonly prof: number };
  readonly sopro: number;
  readonly coro?: { readonly cents: number; readonly sub: number };
  readonly formanteExtra?: { readonly f: number; readonly q: number; readonly ganho: number };
  readonly vibrante?: number;
  readonly dano: { readonly leve: readonly Grito[]; readonly pesado: readonly Grito[]; readonly guarda: Grito; readonly esforco: Grito; readonly ko: Grito };
  readonly vitoria: Grito;
}
export type Camada = 'ataque' | 'corpo' | 'cauda' | 'extra';
/** A mesma forma de `ChamadaReceita` (src/audio/receitas.ts) mais a camada. Sem importar de audio/. */
export type Chamada = ({ k: 'T'; ... } | { k: 'R'; ... }) & { readonly camada: Camada };
export interface AssinaturaEspecial {
  readonly grito: Grito | null;              // null = sem grito no início (PARADE, GARKUWA)
  readonly conjuracao: readonly Chamada[];
  readonly lancamento?: readonly Chamada[];  // só as 7 chaves de projétil
  readonly estampa: readonly Chamada[];      // impacto do projétil OU camada sobre punch/kick
  readonly sucesso?: { readonly grito: Grito | null; readonly chamadas: readonly Chamada[] };
  readonly porNivel?: true;                  // MASHI: estampa repetida por nivelCarga
  readonly porAcerto?: readonly number[];    // HOERI CHAGI: fator do f0 por hit.acertos
  readonly comDreno?: readonly Chamada[];    // ZENON: só com dreno > 0
  readonly contraEspecial?: readonly Chamada[]; // COUP D'ARRÊT
  readonly resposta?: { readonly golpe: string; readonly grito: Grito; readonly estampa: readonly Chamada[] }; // FOUETTÉ
}
```

### 5.2 Tabelas

- `PERFIS_VOCAIS: Readonly<Record<IdLutador, PerfilVocal>>` e `PERFIS_POR_FICHA: Partial<Record<'nila.sarpa', Partial<PerfilVocal>>>`.
  `Record<IdLutador, ...>` faz **lutador novo sem voz não compilar**, o mesmo mecanismo das falas.
- `ASSINATURAS: Readonly<Record<string, AssinaturaEspecial>>` com chave `<id>.<ficha|base>.<golpe>` (a mesma de `IDENTIDADES`).
  Resolução igual à `identidadeDe`: ficha ativa, senão base (a ficha `chefe` do ZENON cai na base).
- Eventos de mecânica com som próprio ficam junto da assinatura do golpe: `carga` (MASHI), `rebote` (RESORTE),
  `troca-ficha` (NILA, em `PERFIS_POR_FICHA`), e o `esforco` do `armor` no perfil.

### 5.3 Validação no boot (`exigirSonsValidos`, no carregamento do módulo, como as falas)

Falha **alto e cedo** (lança, derruba o boot) se:

1. Um id de `IDS_LUTADORES` não tem perfil (redundante com o `Record`, cobre `as` forçado).
2. O conjunto de chaves de `ASSINATURAS` difere do conjunto de especiais que existem nos dados dos lutadores (todo golpe `s*`
   com `name`, por ficha, menos `sResp`, que vive em `resposta`). Hoje são **33**. Nenhuma órfã, nenhuma faltando.
3. Uma chave de projétil (o golpe tem `proj`) está sem `lancamento`, ou uma chave sem projétil tem `lancamento`.
4. Dois golpes de projétil do mesmo lutador e da mesma ficha usam o mesmo `style` (a resolução da seção 4.1 ficaria ambígua).
5. Limites: `f0` entre 80 e 450 Hz; `k` entre 0,80 e 1,25; `q` entre 3 e 12; grito de especial ≤ 0,60 s; KO ≤ 1,2 s;
   vitória ≤ 1,0 s; frequências entre 20 e 12 000 Hz; `vol` ≤ 1,0 (T/R) e ≤ 1,5 (voz); `quando` ≤ 0,6 s; no máximo 8 chamadas
   por momento e **no máximo 12 fontes** (osciladores + ruídos) por plano completo de um evento (6.2).

Um teste (não o boot, porque `data/` não importa `render/`) confere que `Object.keys(ASSINATURAS)` é igual a
`CHAVES_IDENTIDADE`.

---

## 6. Execução: determinismo, orçamento, mixagem

### 6.1 Determinismo

- **Nenhum `Math.random` em `src/audio/**` e em `src/data/sons/**`** (teste de lint por busca de texto, já é a regra).
- A variação (para o 5º "UGH" seguido não soar idêntico) sai de um **hash sem estado**:
  `variacao(semente, tick, indiceDoEvento, lutador, canal) -> [0, 1)` (mistura inteira + um passo de mulberry32).
  `semente = sementeDaPartida + 6` (a próxima livre: +1 visual, +2 UI, +3 buffer de ruído, +4 seleção, +5 falas).
  Sem estado quer dizer que **a ordem e a quantidade de sons tocados não deslocam nada**: o mesmo motivo de separar os RNGs.
- Faixas: tom ±3% (±0,5 st), volume ×[0,9; 1,0], escolha entre as variantes de `dano.leve` e `dano.pesado`.
- **Nunca** o RNG da lógica (CPU, lock-step) e **nunca** o `rngVisual` (consumir dele deslocaria faíscas e poeira).
- O plano é puro: `(evento, ctx) -> plano`. Mesmo evento + mesma semente + mesmo tick = mesmo plano, em Node ou no navegador.
- A semente chega pelo construtor do AudioSys (`new AudioSys({ rng: criarRng(semente + 3), sementeVariacao: semente + 6 })`
  em `src/main.ts`): o `Contexto` da UI não muda.

### 6.2 Orçamento de CPU e vozes no celular

- **Fonte** = `OscillatorNode` ou `AudioBufferSourceNode` iniciado. Uma sílaba de voz custa até 4 fontes (fonte, vibrato,
  aspereza, sopro; ZENON +2 do coro) e ~15 nós.
- Teto por plano de evento: **12 fontes, 40 nós**. Teto simultâneo dos efeitos: **32 fontes ativas** (a música não entra na
  conta e já usa as dela).
- O AudioSys guarda o fim agendado de cada fonte nova e conta as ativas pelo `currentTime`. Se um plano estoura o teto,
  corta **por camada, em ordem fixa**: `extra` -> `cauda` -> `sopro`/`coro` da voz -> `corpo` secundário. **Nunca** corta o
  `ataque` nem a sílaba principal. A ordem é fixa, então o corte é determinístico para o mesmo estado.
- **Prioridade** entre planos: KO e vitória (3) > grito e sucesso (2) > dano e impacto (1) > o resto (0). Sem espaço nem
  cortando camadas, o de menor prioridade não toca.
- **Garganta** (uma pessoa tem uma só): cada voz de um lutador sai por um `GainNode` próprio. Uma voz nova do mesmo lutador
  desliga a anterior em 15 ms (`setTargetAtTime(0, agora, 0,005)`). Exceção: enquanto o grito de KO toca, nenhuma outra voz
  daquele lutador entra.
- **Anti-metralhadora:** a voz de dano do mesmo lutador não volta antes de 80 ms (multi-acerto, HOERI CHAGI, combo): o
  impacto toca, a voz não.
- `sfx` em 0: o plano não é montado (nenhum nó criado à toa).

### 6.3 Mixagem e limitador

- **Volume igual ao que substitui:** o RMS de cada som novo (na região ativa) fica a **±3 dB** do som genérico que ele
  troca: grito + conjuração contra `special(p)`, dano leve contra `hurt(p)`, KO contra `ko(p)`, lançamento contra
  `fireballLaunch()`, impacto contra `fireballHit()`. O dano pesado fica de +2 a +4 dB acima do leve. Isso mantém o
  equilíbrio com a música que já foi acertado.
- **Pico** de cada plano no barramento de efeitos ≤ 0,7 (−3 dBFS), medido no renderizador de referência.
- **Limitador:** `DynamicsCompressorNode` entre o master e o destino (limiar −3 dB, joelho 0, razão 20, ataque 2 ms,
  soltura 120 ms). Só existe com `limitador: true` no construtor (`src/main.ts`). O padrão é `false`, e por isso o oráculo do
  protótipo, que constrói o AudioSys sem essa opção, continua com o mesmo grafo. Estresse (KO + 2 danos pesados + impacto +
  música no mesmo instante) com pico ≤ 0,99 depois do limitador, medido no Chromium (P3).
- **Mute e redução:** `toggleMute` hoje só cala a música, e não existe "som reduzido" nas configurações (só o volume `sfx`).
  Esta spec não cria opção nova (D-S5). O volume `sfx` vale para tudo o que é novo, porque tudo passa pelo barramento `sfx`.
  O movimento reduzido não afeta o som.

### 6.4 Convivência com a cinemática e a sessão do especial

Com `IDENTIDADE_SONORA` ligada:

- a `abertura` da tarja **não toca** (o grito e a conjuração do evento já tocaram no mesmo tick; tocar os dois embola);
- a `batida` da tarja continua (é o "pop" do nome, um som de interface);
- o som de `acerto`/`defesa` da `SessaoEspecial` **não toca** (a estampa e a defesa da assinatura já tocam, com ou sem
  cinemática). A regra do MASHI que está em `fight.ts:123-127` passa para os dados (`porNivel`).

Resultado: o jogador ouve **o mesmo** lutador com a cinemática completa, curta ou desligada. Hoje não ouve nada de próprio
quando ela está desligada.

---

## 7. Como provar que os sons são distintos, sem ouvir

### 7.1 A régua (revisão 2, 2026-10-21, depois da S0 da Vega)

**O que a S0 mediu** (`docs/handoff-vega-sons.md`, com o AudioSys real renderizado pelo motor offline de teste): a régua da
revisão 1 **não calibrou**. Os controles negativos (os sons de hoje) ficaram entre 0,67 e 3,93, contra o alvo de ≤ 0,4.
Nenhuma escala razoável resolvia. A Vega parou, como a spec mandava.

**Causa raiz, e por que ela muda o desenho e não só um número.** A voz de hoje tem formantes **fixos e estreitos** (Q 5-6).
Quando só o `f0` muda, mudam também os harmônicos que passam por cada formante, e com eles o brilho (C) e a forma do volume
(E). A orelha ouve "a mesma voz transposta"; o espectro mede outra coisa. Isso tem uma consequência maior que a calibração:
**com essa régua, uma voz nova poderia passar só por ter outro tom**, porque a transposição sozinha já rende até 0,96. É
exatamente o defeito que o dono quer eliminar. Afrouxar a escala (a opção A pura da Vega) deixaria essa brecha aberta. Escolher
controles mais estreitos (opção B) seria escolher o controle para a régua passar: **recusada**.

**Decisão: tirar o tom da comparação de vozes POR CONSTRUÇÃO, e usar o piso medido como limiar relativo no resto.**

1. **Vozes (R1, R4, R6v):** os dois sons do par são renderizados com o **mesmo `f0`**. O teste copia o perfil dos dados e troca
   só o `f0` por `F0_REFERENCIA_VOZ = 175 Hz` (a média geométrica dos 10 perfis da 3.2). O contorno em semitons, o trato `k`, a
   onda, a aspereza, o sopro e o resto continuam os do lutador. Com o tom igual, os harmônicos são os mesmos nos dois lados, e
   o que sobra na distância é **só** o que não é tom. Não precisa de descritor novo (a opção C da Vega fica dispensada).
   O KO é medido **sem o gongo**, que é comum de propósito (3.4). O bloco `P` só vale aqui, em voz pura.
2. **Efeitos (R2, R3, R6e):** as frequências das assinaturas são escolha de instrumento (berimbau a 196 Hz e sino a 1568 Hz
   são instrumentos diferentes), então ficam como estão. O `P` fica desligado (`eP = ∞`), porque o som tem vários tons ao mesmo
   tempo e o estimador não tem o que medir. O limiar é **relativo ao piso medido**: `τ = 1,5`, ou seja, 1,56 vez o pior som de
   hoje (0,96) e abaixo do menor par obviamente diferente (2,15).
3. **Descritores:** os da S0 (`tests/support/descritores.ts`), sem mudança. As escalas da revisão 1 ficam, e a calibração
   escolhe só `eT = 1,5`, o valor em que o piso e o teto foram medidos:

| Bloco | O que é | Escala | Vozes | Efeitos |
|---|---|---|---|---|
| `T` timbre | média dos MFCC c1..c12 (40 bandas mel, 80-8000 Hz), sem c0 | `eT = 1,5` | conta | conta |
| `C` brilho | log2 do centroide em 5 trechos | `eC = 1/3` de oitava | conta | conta |
| `E` envelope | dB em 8 trechos (normalizado pelo pico) | `eE = 6` dB | conta | conta |
| `D` duração | log2 da duração da região ativa | `eD = 0,5` oitava | conta | conta |
| `P` contorno | tom por soma de subharmônicos em 5 pontos, relativo à média do próprio som | `eP = 2` st | conta | **desligado** (`eP = ∞`) |
| `M` tom médio | tom absoluto | — | informativo | informativo |

**Pisos e tetos medidos (S0, `eT` 1,5, sem P), que ficam congelados como regressão da própria régua:**

| Medida | Valor | Papel |
|---|---|---|
| `hurt(p)` dos 10 `pitch`, pior par | 0,67 | piso do som de hoje |
| `special(p)`, pior par | **0,96** | piso do som de hoje (o maior: define `τ`) |
| `ko(p)`, pior par | 0,83 | piso do som de hoje |
| menor par positivo (`punch` x `kick`) | **2,15** | teto da diferença óbvia |

**Portão de sensibilidade S0b (novo, roda antes de congelar; escolhido agora, antes de existir qualquer número):** a
igualação de tom só serve se a régua enxergar timbre com o tom igual. Teste: `voice()` de hoje a 175 Hz, mesmo `t` (0,3 s),
mesmo `vol`, `vib: false`, com os dois conjuntos de formantes **mais distantes que o código já usa**, `[380, 850]` (vogal
fechada, do `special`) x `[720, 1150]` (vogal "a", do `ko`), tem de dar **`S ≥ 1,5`** com as escalas de voz. O par
`[700, 1250]` x `[720, 1150]` (as duas são "a") é impresso só como informação. **Se o S0b falhar**, a régua é cega para
timbre com o tom igual: a fatia para e volta para a Nova. Nenhuma escala é reajustada para o portão passar.

**Congelamento:** tudo isto vai para `tests/support/regua-sons.ts`, com os números medidos num comentário e a data. Mudar
depois exige registro no PROGRESSO.md e um novo veredito da Íris. A ordem continua: **a régua congela antes do som novo
existir** (S0 -> S2/S3).

### 7.2 Critérios (revisão 2)

`Sv` = distância de voz (tom igualado a 175 Hz, com `P`). `Se` = distância de efeito (tom real, sem `P`).

| ID | O que | Pares | Critério |
|---|---|---|---|
| R1 | voz entre lutadores | 45 pares, para cada um de: dano leve (variante 0), dano pesado, guarda quebrada, KO (sem gongo), kiai base, vitória | todo par `Sv ≥ 1,5` |
| R2 | assinaturas dos especiais, sem a voz (conjuração + estampa) | 33 entradas, pares de lutadores diferentes | todo par `Se ≥ 1,5` |
| R2b | mesmo lutador | pares dentro do lutador | `Se ≥ 1,0` (acima do piso de 0,96: dois especiais do mesmo lutador não podem ser só o mesmo som transposto) |
| R2c | coerência | por lutador | média intra < média inter (silhueta > 0): os sons de um lutador soam como dele |
| R3 | projéteis | 7 lançamentos e 7 impactos | lutadores diferentes `Se ≥ 1,5`; WEI LONG sFire x sDown `Se ≥ 1,0`; ZENON SELO x SELO MAIOR `Se ≥ 0,6` (o mesmo selo, maior, parecido de propósito) |
| R4 | posturas da NILA | GAJA x SARPA (dano leve e kiai) | `Sv ≥ 1,0` (a mesma pessoa, outra postura) |
| R5 | regressão da régua | (a) os 3 pisos de hoje recalculados; (b) o menor positivo recalculado; (c) `hurt(p)` de hoje com tom igualado | (a) cada um `≤ 1,0` (= `τ / 1,5`); (b) `≥ 2,0`; (c) `Sv = 0` ± 0,05. Se (a) ou (b) falhar, quem mudou foi a régua, não o som |
| R6 | variação não descaracteriza | cada som x as variações de `variacao` (tom ±3%, volume, variante) | voz: `Sv < 0,4` com o tom REAL (testa a estabilidade do `P`); efeito: `Se < 0,4` |
| R7 | espelho | perfil x perfil de espelho, com o tom REAL e com `P` | `0,3 ≤ S ≤ 1,0` (distingue os dois lados e continua o mesmo lutador) |

A saída do teste imprime a matriz e o **par mais próximo** de cada critério, com o valor e a decomposição (dT, dC, dE, dD,
dP). "Passou" sem número não vale.

**Risco residual, dito com clareza:** nos efeitos, o tom continua dentro da distância, então duas assinaturas que fossem o
mesmo instrumento muito transposto poderiam passar no R2. A defesa ali é o desenho (instrumento diferente por lutador, §4.2),
o R2b e a escuta do dono, não o número.

### 7.3 Os três níveis

- **N0 grafo** (`vitest`, contexto falso `tests/unit/_fake-audio.ts`): cada evento chama a receita certa; fontes por plano
  ≤ 12; corte por camada na ordem certa; garganta e anti-metralhadora; mesma semente = log idêntico, semente diferente =
  variação só dentro das faixas; `IDENTIDADE_SONORA = false` = log igual ao de `reagirAosEventos`.
- **N1 paramétrico** (`vitest`, só os dados): a tupla (faixa de `k`, onda, faixa de aspereza, faixa de sopro, vogal do kiai)
  não se repete entre lutadores. É o lint barato; não prova som.
- **N2 espectral** (`vitest`, o AudioSys real sobre o motor offline de teste `tests/support/audio-offline.ts`): S0b, R1-R7,
  volume (6.3) e pico por plano.
- **N3 navegador** (Playwright, Chromium): o AudioSys **real** com `criarContexto: () => new OfflineAudioContext(1, n, 22050)`
  renderiza as mesmas receitas. (a) Fidelidade da régua: timbre de referência x real, mesmo som, `S ≤ 0,3`. (b) R1-R3 de novo
  no áudio real. (c) Estresse do limitador. (d) Orçamento: luta CPU x CPU de 60 s com `Emulation.setCPUThrottlingRate` 4x,
  máximo de fontes ativas ≤ 32 e tempo de `reagirComIdentidade` por tick com p99 < 0,5 ms.

O que **não** se prova sem ouvir: que o som é bonito, que o grito não ficou cômico e que a palavra lexical soa respeitosa.
Isso é a escuta do dono (fatia S5) e a revisão nativa. Os testes provam que os sons são **diferentes**, não que são **bons**.

---

## 8. Integração: o que muda fora de `src/audio` e `src/data/sons`

Ligações mínimas, todas atrás da mesma chave `IDENTIDADE_SONORA` (falsa = jogo de hoje):

| Arquivo | Linha (HEAD `ac57a80`) | Mudança |
|---|---|---|
| `src/ui/cenas/fight.ts` | 438 | `reagirAosEventos(audio, game.events)` -> `reagirComIdentidade(audio, game.events, contextoSonoro(game))` (+ import). `contextoSonoro` mora em `src/audio/identidade-sonora.ts` e lê `fighters[i].id`, `.ficha` e `tick` da `LeituraLuta` |
| `src/ui/cenas/fight.ts` | 103 | `momento === 'abertura' ? id.abertura : id.batida` -> abertura vazia com a chave ligada |
| `src/ui/cenas/fight.ts` | 116-128 | o `aoSom` da `SessaoEspecial` não toca com a chave ligada (um `if` no topo) |
| `src/main.ts` | 89 | `new AudioSys({ rng: criarRng(semente + 3), sementeVariacao: semente + 6, limitador: true })` |

`src/fight/**` não muda (`git diff src/fight` vazio). `src/core/contratos.ts` não muda. **As três ligações em `fight.ts` só
entram depois que a Lyra integrar a provocação** (ela está no mesmo arquivo agora).

---

## 9. Plano em fases

| Fatia | Quem | O que | Depende de | Pronto quando |
|---|---|---|---|---|
| **S0** régua | Vega | motor offline, descritores e pisos medidos com os sons de hoje (feito; a rev. 1 não calibrou); rev. 2: portão S0b e `tests/support/regua-sons.ts` congelado (§7.1) | — | S0b `S ≥ 1,5`; R5 verde; números e data no comentário; nenhum som novo |
| **S1** primitivas | Vega | `vozFormante`, `ChamadaReceita` `'V'`, barramento de identidade, garganta, orçamento, limitador opcional, `variacao` | — (paralela à S0) | `audio.test`, `audio-chefe.test`, `luta-fidelidade.test` verdes sem `-u`; N0 da primitiva; o jogo soa igual (chave desligada) |
| **S2** vozes | Vega | `data/sons` com os 10 perfis, kiai, dano, KO, vitória; `exigirSonsValidos` | S0, S1 | R1, R4, R5, R6, R7 e volume da voz verdes, com a matriz impressa |
| **S3** assinaturas | Vega | as 33 assinaturas, 7 projéteis, carga, rebote, troca-ficha, armadura, sucesso, FOUETTÉ, COUP D'ARRÊT, dreno | S0, S1 | R2, R2b, R2c, R3 e volume verdes; chaves = `CHAVES_IDENTIDADE` |
| **S4** ligação | Vega | `planoSonoro`, `reagirComIdentidade`, `contextoSonoro`, as 4 ligações da seção 8 | S2, S3, **provocação da Lyra integrada** | N0 completo; `git diff src/fight` vazio; e2e antigos verdes |
| **S5** validação | Íris + dono | N3 no Chromium; página de escuta só de desenvolvimento (`?sons=1`: 10 lutadores × kiai, dano leve/pesado, guarda, KO, vitória, e as 33 assinaturas); **escuta do dono**; teste num celular real | S4 | veredito da Íris com os números; OK do dono na escuta; só então `IDENTIDADE_SONORA = true` |
| **S6** docs | Alexandria | `docs/como-adicionar-um-lutador.md` (seção "sons": perfil + assinaturas, o boot reprova se faltar), `docs/arquitetura.md` (camada de identidade sonora, as 3 travas da 0.2) | S5 | conferido contra o código |

S0 e S1 andam em paralelo. S2 e S3 também (dados diferentes, mesma primitiva). **A régua (S0) vem antes do som (S2/S3) de
propósito**: quem faz o som não pode ajustar a régua depois de ouvir o resultado.

---

## 10. Riscos

| # | Risco | Mitigação |
|---|---|---|
| R1 | Alguém "simplifica" e troca a saída de `sonsDoEvento`: o lock-step quebra | identidade só depois; `luta-fidelidade` continua chamando `sonsDoEvento`; comentário de aviso no topo da função |
| R2 | O limitador ou um nó novo no `init()` muda o grafo do oráculo | limitador só por dependência (padrão `false`); barramento de identidade criado na primeira chamada de identidade, nunca no `init()` |
| R3 | Voz por formantes soa robótica ou cômica | escuta do dono como portão (S5); parâmetros em dados (ajuste sem código); grito não-lexical pronto |
| R4 | Ajustar o som (ou a régua) só para passar no teste | régua congelada na S0 com os sons antigos; R5 (controle negativo) obrigatório; escuta do dono |
| R5 | Palavra estrangeira errada ou desrespeitosa | marcas (rev.); revisão nativa pendente; nada religioso (sem "om", sem sino de templo, decisão que o Apolo já tomou no E8) |
| R6 | Sons da tarja e da luta embolam | abertura e sessão caladas com a chave (6.4); a batida fica |
| R7 | Cansaço: o mesmo "UGH" 40 vezes no treino | garganta, 80 ms de anti-metralhadora, variantes por `variacao` |
| R8 | Engasgo no celular | 12 fontes por plano, 32 ativas, corte por camada, estresse com CPU 4x mais lenta; **o celular real só o dono testa** |
| R9 | Conflito com a Lyra em `fight.ts` | as 3 ligações entram na S4, depois da provocação; são 3 pontos pequenos e listados |
| R10 | O motor offline de teste difere do navegador (PolyBLEP, biquad em blocos, compressor simples) | N3(a): mesmo som, motor offline x Chromium, `S ≤ 0,3`; se falhar, a régua N2 perde validade até corrigir |
| R11 | O volume sobe aos poucos e estoura | ±3 dB do som substituído + limitador + estresse |
| R12 | O kiai de vitória pisa no som do balão da provocação | 950 ms escolhidos para casar com o balão; ajuste em dado, sem acoplamento |

Dívidas conscientes: (a) som de voo do projétil fica de fora (D-S4); (b) kiai em golpes normais fica de fora (D-S9);
(c) `toggleMute` continua calando só a música (é o comportamento do protótipo).

---

## 11. Decisões em aberto (para o dono)

| ID | Pergunta | Opções | Recomendação |
|---|---|---|---|
| D-S1 | Gritos com palavras reais ("OSU!", "A-SSA!", "¡ÓRALE!", "VOILÀ!") ou só vogais? | lexicais com revisão nativa / não-lexicais | lexicais marcadas (rev.), com a versão não-lexical pronta na mesma tabela |
| D-S2 | Kiai de vitória: só no fim da luta ou a cada round ganho? | fim da luta / todo round | fim da luta (o round já tem o jingle) |
| D-S3 | PARADE e GARKUWA: grito no início (como o "HA-DOU" genérico de hoje, que avisa o rival) ou só no sucesso? | início / sucesso | só no sucesso, coerente com a tarja, que já espera o sucesso para não avisar |
| D-S4 | Som contínuo enquanto o projétil voa? | sim / não | não na v1 (custo de vozes e não há evento de fim do projétil) |
| D-S5 | Opção "VOZES: LIGADAS/DESLIGADAS" no menu? | sim / não | não agora (o volume de efeitos já existe); reavaliar depois da escuta |
| D-S6 | Limitador no master (pega a música também) ou só nos efeitos? | master / efeitos | master: protege contra estouro na soma, que é onde estoura |
| D-S7 | Espelho: o P2 com a voz um pouco mais grave? | sim / não | sim (−1 st, trato ×0,97) |
| D-S8 | Com a cinemática ligada, o grito do lutador toca e a abertura da tarja sai? | grito / abertura | grito (a voz é do lutador; a tarja é interface) |
| D-S9 | Kiai também em golpes normais fortes? | sim / não | fora deste pedido; decidir depois de ouvir a v1 |
