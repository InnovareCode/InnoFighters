# Plano de sons realistas na luta (samples gerados por IA)

Autor: Apolo (direção de arte e som), 2026-10-22. Missão `cmvjhd3v501kx01p7ka36g69b`. Base: HEAD `c3ad28f`.
**Status: plano. Nenhum áudio gerado, nenhum código alterado.** Quem gera: Atlas (pela ferramenta da Runway). Quem cura: Apolo.
Quem integra: Vega. Quem valida: Íris. O ouvido final: o dono, no iPhone.

Pedido do dono (teste no iPhone): os sons da luta (soco, chute, dano, especial, magia) soam artificiais. Ele quer **sons
realistas, por lutador**, e decidiu que eles vêm de **samples gerados por IA**. Isto revoga, só para estes sons, a D8 ("áudio
100% sintetizado") e a decisão da `docs/spec-sons-por-lutador.md` ("sem samples"). A síntese não sai do jogo: vira o
**fallback** de cada sample e continua dona da música, da interface e das marcas do jogo (gongo do KO, jingles).

---

## 0. Resumo em 8 linhas

1. **Três camadas**: foley de impacto COMPARTILHADO (11 sons para os 10 lutadores, +2 opcionais) + VOZ por lutador (pacotes de fala curtos,
   o recurso mais barato por segundo) + uma FAMÍLIA de especial por estilo E1-E12 (1 sample cada), multiplicada por código.
2. **Plano: 51 créditos** em 6 lotes, mais 9 de folga para refazer dentro do teto de 60. A reserva de 14 fica intocada.
3. **Portão no Lote 0 (3 créditos)**: soco, pacote de voz masculina (dano + kiai) pela fala, kiai pelo gerador de efeitos.
   Decide a qualidade E a rota da voz (fala x efeito) antes de gastar o resto.
4. Duração **sempre declarada** (omitir custa 2). Efeito curto pede `duration: 1`: o mínimo de 0,5 s custa o mesmo crédito.
5. Pacote de voz com **até 50 caracteres = 1 crédito** e rende 4 cortes (kiai, dano leve, dano pesado, KO).
6. Entrega: MP3 mono 44,1 kHz em **folhas de som** (1 da base + 1 por lutador), manifesto JSON, alvo **<= 1,2 MB** no total
   (estimado 0,5 a 0,75 MB) e ~0,3 MB baixados por luta.
7. Integração: camada de samples no `AudioSys` com `decodeAudioData` lazy por folha; **sem a folha decodificada, toca a
   síntese de hoje** (nada fica mudo, nada muda no lock-step).
8. **Licença: o dono precisa conferir os termos da Runway** para uso comercial de áudio gerado no plano gratuito antes de
   publicar fora do ambiente de teste.

---

## 1. Inventário: o que a luta toca hoje e o que vira sample

Lido em `src/audio/eventos.ts` (evento -> método do `AudioSys`, o oráculo do lock-step), `src/audio/identidade-sonora.ts`
(a camada posterior, sempre ligada: voz formante por lutador + assinaturas dos 33 especiais), `src/audio/audio-sys.ts`
(as receitas), `src/data/sons/*` (perfis, gritos, assinaturas) e `docs/handoff-vega-sons-temas-ligacao.md`.

Hoje **tudo é síntese**: `punch()` é um seno 190->50 Hz + ruído passa-banda; `kick()` um seno 120->35 + triângulo + ruído;
a voz de cada lutador é dente-de-serra por 3 formantes (`vozFormante`, ~15 nós por sílaba). No alto-falante do iPhone, que não
reproduz abaixo de ~150 Hz, sobra justamente a parte "eletrônica" (o clique do ruído e o zumbido da serra): é a queixa.

| Evento da luta | Hoje (`sonsDoEvento` + identidade) | Vira sample? | Sample (id) | Observação |
|---|---|---|---|---|
| `hit`, `snd: punch` | `punch()` + voz de dano do defensor (leve/pesado) | **sim** | `imp.soco.leve` / `imp.soco.forte` + voz | leve/pesado pela regra que já existe (`grande`, `dano >= 12`, `contragolpe`) |
| `hit`, `snd: kick` | `kick()` + voz de dano | **sim** | `imp.chute.leve` / `imp.chute.forte` + voz | idem |
| `hit` com `projetil` | `fireballHit()` (a identidade troca pela estampa) | **sim** | `magia.impacto` + família | |
| `hit`/`throw` com `especial` corpo a corpo | soco/chute + estampa sintetizada | **sim** | soco/chute + família | a estampa sintetizada fica por baixo (2.3) |
| `block` | `block()` | **sim** | `defesa` | especial defendido soma a família abafada (regra de hoje) |
| `parry` | `block()` (+ sucesso PARADE) | **sim** | `defesa` (+ `esp.e7.florete`) | |
| `quebra-guarda` | `fireballHit()` -> voz de guarda + `VIDRO_GUARDA` | **sim** | `guarda.quebra` + voz | o vidro sintetizado: decidir na escuta |
| `throw` | `kick()` + voz pesada | **sim** | `arremesso` + voz | |
| `armor` | `punch()`/`kick()` + "HNN" (WEI LONG, BAATAR) | **sim** | impacto leve + esforço (Lote 4) | |
| `ko` | voz de KO + `GONGO_KO` | **sim (corpo e voz)** | `ko.queda` + voz de KO | **o gongo fica sintetizado**: é a marca do KO do jogo |
| `swing` | `swing(0/1)` | **sim** | `golpe.ar.leve` / `golpe.ar.forte` | toca em todo golpe: é o que mais denuncia o sintético |
| `esquiva` | `swing(1)` | **sim** | `esquiva` | |
| `esquivou` | `uiSelect(1.4)` | não | — | é aviso de interface, tem de soar "de jogo" |
| `special` (início) | grito do golpe (voz formante) + conjuração | **sim** | kiai do lutador + família | |
| `projectile` | `fireballLaunch()` -> lançamento da assinatura | **sim** | `magia.lanca` + família | |
| `clash` | `fireballHit()` (+ sucesso GARKUWA) | **sim** | `magia.impacto` (+ `esp.e5.tambor`) | |
| `carga` (MASHI) | batidas sintetizadas por nível | **sim** | `esp.e5.tambor` x nível, tom por nível | |
| `rebote` (RESORTE) | `land()` + receita | parcial | `pouso` (Lote 5) | a "corda" da receita fica |
| `troca-ficha` (VADIVU) | `jump()` + receita | **sim** | `esp.e9.serpente` / `esp.e8.chenda` | |
| `land`, `jump` | `land()`, `jump()` | opcional | `pouso`, `salto` (Lote 5) | só se sobrar crédito |
| `round` start/fight/timeover/end, `perfect`, `deny`, `fase-chefe`, `uiSelect` | jingles e avisos | **não** | — | identidade de arcade e música: síntese de propósito |
| vitória (fim da luta) | kiai de vitória (voz formante, +950 ms) | **sim** | kiai (Lote 2) ou vitória (Lote 4); ZENON: riso | |
| música (temas por lutador) | sequenciador | **não** | — | fora do escopo |

---

## 2. Estratégia: máximo realismo por crédito

### 2.1 As três camadas

| Camada | O que é | Por que assim | Custo |
|---|---|---|---|
| **A. Foley compartilhado** | impactos, defesa, guarda, arremesso, queda do KO, golpes no ar, esquiva | um soco soa como soco em qualquer lutador; o que diferencia o lutador é a VOZ e o ESPECIAL. 11 sons cobrem os 10 (+ pouso e salto opcionais) | 12 créd. (Lotes 0 e 1) + 2 (Lote 5) |
| **B. Voz por lutador** | 1 pacote de fala de <= 50 caracteres com 4 vocalizações, cortado em 4 samples (+ pacote 2 opcional) | a fala custa 1 crédito por 50 caracteres e rende ~3 s de voz; o gerador de efeitos cobraria 1 crédito por segundo | 11 a 21 créd. (Lotes 0, 2 e 4), mais o kiai de teste (1) |
| **C. Famílias de especial** | 1 sample por estilo E1-E12 + 2 corpos comuns de magia (lançar, explodir) | 33 especiais saem de 12 famílias com variação por código (2.3); a síntese de hoje fica por baixo para que os 3 especiais do mesmo lutador não sejam "o mesmo som transposto" | 15 créd. (Lote 3) |

### 2.2 Regras de prompt (valem para todos)

- **Inglês, até 450 caracteres**, na ordem **fonte -> ação -> espaço**: o que faz o som, o que acontece com ele, e como foi
  gravado. Sem nomes de pessoas, marcas, filmes, jogos ou obras.
- Todo efeito termina com a mesma cauda técnica (`Dry close-mic studio foley, isolated, starts instantly, no music, no voice,
  no reverb tail, mono.`): **seco** (reverberação não se tira depois, e o cenário muda a cada luta), **isolado** (sem música
  nem voz de fundo), **começa já** (menos silêncio para cortar).
- `duration` **sempre declarado**. Efeito curto: `1` (o mínimo de 0,5 custa o mesmo crédito e dá menos material para escolher).
  Só a queda do KO e o ringue da CENTELLA pedem `2`.
- Voz pela fala: sílabas **não lexicais** (a alternativa não-lexical da spec §3.3), em caixa alta no kiai, separadas por
  pontuação para o corte ser limpo. As palavras reais (vitória do Lote 4) seguem com a pendência de revisão de falante nativo.
- Nada de clonar voz de pessoa real: só vozes de preset.

### 2.3 Variação por código (o que multiplica cada crédito)

Tudo determinístico: a escolha sai de `variacao(semente, tick, indice, lutador, canal)` (o hash sem estado que já existe),
**nunca** de `Math.random`.

| Recurso | Faixa | Para quê |
|---|---|---|
| `playbackRate` por toque | 0,97 a 1,03 (±0,5 st) | o 5º soco seguido não soa idêntico |
| ganho por toque | 0,9 a 1,0 | idem |
| início do corte | 0 a 8 ms à frente | idem, sem mexer no ataque |
| leve x pesado | o mesmo sample a 1,0 / 0,92 de taxa + passa-baixa 3,5 kHz no pesado, se o Lote 1 reprovar um dos dois | economia de emergência |
| espelho (mesmo lutador dos 2 lados) | taxa x 0,944 (-1 st) na voz do índice 1 | a regra D-S7 de hoje |
| especial por golpe (mesma família) | `sFire` = sample inteiro, taxa 1,0; `sDown` = taxa 0,84 + passa-baixa 1,8 kHz; `sFwd` = taxa 1,12 + passa-alta 400 Hz | 3 golpes, 1 crédito |
| conjuração x impacto | conjuração = 1ª metade do sample; impacto = o sample inteiro sobre `magia.impacto` | 2 momentos, 1 crédito |
| assinatura sintetizada | fica tocando a **-6 dB** sob a família (só camadas `ataque` e `corpo`) | mantém a distinção R2b entre os especiais do mesmo lutador e a "melodia" do instrumento de cada um |
| identidade da voz | taxa fixa por lutador (tabela 2.5) + o preset de cada um | 10 vozes com poucos presets |

### 2.4 Tabela completa (id, prompt, duração, créditos, onde toca, lutadores, fallback)

Lotes 0, 1, 3 e 5 usam `generate_sound_effect` (modelo padrão `sound-effects`, MP3). Lotes 0 (`voz.hayato`), 2 e 4 usam
`generate_speech` (`eleven_v3`). Créditos: efeito = `ceil(duration)`; fala = `ceil(caracteres / 50)`, mínimo 1. Os caracteres
foram contados por script, com as etiquetas `[...]` incluídas (cálculo conservador). Nas tabelas de fala, **onde toca** é o
mapa de corte da 2.5 (kiai no `special` e na vitória, leve/pesado no `hit`/`throw` do defensor, KO no `ko`, guarda na
`quebra-guarda`, esforço no `armor`), o **lutador** é o do id e o **fallback** é a voz formante sintetizada de hoje
(`sintetizarGrito`, mesma categoria).

#### Lote 0

| id | ferramenta | prompt (inglês) | duração | créd. | onde toca | lutadores | fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `imp.soco.leve` | sfx | Bare knuckle punch landing on a muscular torso: a tight, snappy flesh smack with a short low thump underneath, like a fast jab in a martial arts film. Single hit. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `hit`/`armor` com `snd: punch` e golpe leve (regra do dano leve) | todos | `punch()` |
| `teste.kiai.sfx` | sfx | Adult male martial artist shouting one short explosive battle cry, a sharp "hah" from the chest as he strikes. One shout only, no words. Dry close-mic studio recording, isolated, starts instantly, no music, no reverb tail, mono. | 1 s | 1 | só portão (compara rota A x B da voz); se a rota B vencer, vira o kiai do arquétipo masculino médio | teste | `special(p)` / grito sintetizado |

| id | ferramenta | texto (eleven_v3) | car. | créd. |
| --- | --- | --- | --- | --- |
| `voz.hayato` | speech | `[shouts] HA! [grunts] Ugh! Nngh! [shouts] Uaaaah!` | 49 | 1 |

#### Lote 1

| id | ferramenta | prompt (inglês) | duração | créd. | onde toca | lutadores | fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `imp.soco.forte` | sfx | Heavy punch landing hard on a body: a deep, meaty flesh impact with a bone-jarring low thud and a short cloth snap, like a knockout hook in an action film. Single hit. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `hit` com `snd: punch` e pesado (`grande`, `dano >= 12` ou `contragolpe`) | todos | `punch()` |
| `imp.chute.leve` | sfx | Quick shin kick landing on a thigh: a crisp slap of skin with a light thud and a flick of cloth. Single hit. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `hit`/`armor` com `snd: kick` e golpe leve | todos | `kick()` |
| `imp.chute.forte` | sfx | Powerful roundhouse kick slamming into a ribcage: a thick, heavy body thump with a sharp crack on top and a cloth whip. Single hit. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `hit` com `snd: kick` e pesado | todos | `kick()` |
| `defesa` | sfx | Forearms blocking a punch: a muffled, padded thud of arm against arm with a short cloth rustle, absorbed and controlled, no flesh slap. Single block. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `block` comum e `parry` (a base); a defesa de especial soma a estampa abafada | todos | `block()` |
| `guarda.quebra` | sfx | A defensive guard being smashed open: a hard double impact on raised forearms followed by a sharp cracking snap and a quick stumble of feet. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `quebra-guarda` (no lugar do `fireballHit`; o `VIDRO_GUARDA` decide na escuta) | todos | `fireballHit()` + `VIDRO_GUARDA` |
| `arremesso` | sfx | A fighter thrown and slammed onto a hard wooden stage floor: a heavy full-body thud with a short skid of cloth and a low wooden boom. Single slam. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `throw` (no lugar do `kick()` do arremesso; a estampa E6/E10 soma por cima) | todos | `kick()` |
| `ko.queda` | sfx | Knockout body fall: a limp fighter collapsing with a short cloth slump, then the whole body hitting a hard wooden stage floor with a heavy thud, a small bounce and a final cloth settle. No punch. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 2 s | 2 | `ko`, com `atrasoMs` acertado na escuta (o corpo cai depois do golpe); o `GONGO_KO` sintetizado fica | todos | gongo do `ko(p)` |
| `golpe.ar.leve` | sfx | A fast punch cutting the air: a short, thin, airy whoosh close to the microphone with a tiny cloth flick. Single swing. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `swing` com `golpe: punch` | todos | `swing(0)` |
| `golpe.ar.forte` | sfx | A heavy kick sweeping through the air: a deep, wide whoosh with a strong cloth whip at the end. Single swing. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `swing` com `golpe: kick` | todos | `swing(1)` |
| `esquiva` | sfx | A fighter dodging sideways at the last instant: a quick sliding foot scuff on a wooden floor with a sharp cloth flutter and a light air whoosh. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `esquiva` (o `esquivou` segue `uiSelect`, é aviso de interface) | todos | `swing(1)` |

#### Lote 2

| id | ferramenta | texto (eleven_v3) | car. | créd. |
| --- | --- | --- | --- | --- |
| `voz.wei-long` | speech | `[shouts] HO-HA! [grunts] Hmph! Unngh! Hoooh!` | 44 | 1 |
| `voz.min-ji` | speech | `[shouts] HYA! [grunts] Ah! Ahk! [shouts] Kyaaa!` | 47 | 1 |
| `voz.caio` | speech | `[shouts] EH-EH! [grunts] Uh! Ugh! [shouts] Aaai!` | 48 | 1 |
| `voz.aminu` | speech | `[shouts] HAU! [grunts] Hng! Uggh! [shouts] Hooo!` | 48 | 1 |
| `voz.centella` | speech | `[shouts] YA-HA! [grunts] Ay! Aah! [shouts] Aaaay!` | 49 | 1 |
| `voz.camille` | speech | `[shouts] HEH-HA! [grunts] Hm! Ah! Aaah-non!` | 43 | 1 |
| `voz.nila` | speech | `[shouts] HM-HA! [grunts] Hn! Aah! [shouts] Haaa!` | 48 | 1 |
| `voz.baatar` | speech | `[shouts] HAA-UGH! [grunts] Hrr! Urrgh! Uuurgh!` | 46 | 1 |
| `voz.zenon` | speech | `[shouts] HAAAH! [grunts] Hmph! Ngh! Ohhh-khi!` | 45 | 1 |
| `voz.zenon.riso` | speech | `[laughs] Ha... ha... HA-HA-HA!` | 30 | 1 |

#### Lote 3

| id | ferramenta | prompt (inglês) | duração | créd. | onde toca | lutadores | fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `magia.lanca` | sfx | Magical energy projectile launched from open palms: a sudden rising burst of compressed air and crackling energy that rushes away from the microphone. No impact. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `projectile`: corpo comum do lançamento, por baixo da família | HAYATO, WEI LONG, MIN-JI, CAIO, ZENON | `fireballLaunch()` |
| `magia.impacto` | sfx | Magical energy blast hitting a body: a punchy low boom with an air pressure burst, a sizzling crackle and a quick decay. Single impact. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `hit` com `projetil`, e `clash` entre projéteis | idem | `fireballHit()` |
| `esp.e1.raio` | sfx | Electric lightning bolt: rapid sharp static zaps snapping in a burst, ending in a short dry thunder crack. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E1: `special` (conjuração), `projectile` (sFire), estampa e impacto | HAYATO | assinatura E1 sintetizada |
| `esp.e2.dragao` | sfx | Huge breath of air roaring like a giant creature, layered with a deep low bass drum thump, heavy and calm. No metal, no gong. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E2: idem (sFire `orb`, sDown `wave`) | WEI LONG | assinatura E2 |
| `esp.e3.lamina` | sfx | Crescent blade of wind slicing upward: a fast bright rising air cut with a small high bell ting and a soft flicker of flame. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E3: idem (sFire `blade`; HOERI CHAGI por acerto) | MIN-JI | assinatura E3 |
| `esp.e4.ginga` | sfx | Single musical bow with a gourd resonator struck with a stick: a twangy metallic string boing bending upward, plus a short dry rattle of a woven basket shaker. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E4: idem (sFire `boomerang`) | CAIO | assinatura E4 |
| `esp.e5.tambor` | sfx | Hourglass talking drum hit with a curved stick while the strings are squeezed: a deep skin tone that bends downward, with a sharp skin slap on the attack. Single hit. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E5: idem + evento `carga` (MASHI, 1 batida por nível) + sucesso da GARKUWA | AMINU | assinatura E5 |
| `esp.e6.ringue` | sfx | Wrestling ring: one bright boxing ring bell ding, then a body slamming onto the canvas ring mat with a springy rope rattle, and a short crowd cheer swelling up. Close-mic, isolated, starts instantly, only a short arena ambience, no music, mono. | 2 s | 2 | E6: idem; o sino abre a PLANCHA, a lona é a estampa do `throw` da HURACANRANA, a torcida é a cauda | CENTELLA | assinatura E6 |
| `esp.e7.florete` | sfx | Two thin steel fencing blades: a fast whipping swish through the air ending in a clean, high metallic blade clash that rings briefly. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E7: idem + sucesso da PARADE (`parry`) + FOUETTÉ (`sResp`) | CAMILLE | assinatura E7 |
| `esp.e8.chenda` | sfx | Tall cylindrical temple drum played with two sticks: a fast dry roll on tight skin ending in one low resonant thump. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E8: idem + `troca-ficha` de volta para GAJA | NILA (GAJA) | assinatura E8 |
| `esp.e9.serpente` | sfx | Large snake: a sharp hiss spiraling upward in pitch, then a quick dry strike snap. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E9: idem + `troca-ficha` para SARPA | NILA (SARPA) | assinatura E9 |
| `esp.e10.estepe` | sfx | Low bowed two-string horsehead fiddle playing a rough drone in fifths, with a strong gust of open steppe wind sweeping across. No melody. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E10: ARREMESSO DO AVARGA e QUEBRA-BASE | BAATAR | assinatura E10 |
| `esp.e11.aguia` | sfx | A large eagle diving: one piercing raptor screech over big powerful wing flaps beating the air. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E11: MERGULHO DA ÁGUIA | BAATAR | assinatura E11 |
| `esp.e12.selo` | sfx | Dark ominous pipe organ chord stab in a low fifth, with a harpsichord pluck on top and a heavy stone ring spinning and grinding. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | E12: SELO, COLUNA, TRIBUTO, SELO MAIOR, DECRETO (as moedas do dreno seguem sintetizadas) | ZENON | assinatura E12 |

#### Lote 4

| id | ferramenta | texto (eleven_v3) | car. | créd. |
| --- | --- | --- | --- | --- |
| `voz2.hayato` | speech | `[grunts] Oh?! Hnn! [shouts] Osu! [grunts] Uh!` | 45 | 1 |
| `voz2.wei-long` | speech | `[grunts] Ho?! Hnnn! [shouts] Hao! [grunts] Uhh!` | 47 | 1 |
| `voz2.min-ji` | speech | `[grunts] Eh?! Hn! [shouts] A-ssa! [grunts] Uh!` | 46 | 1 |
| `voz2.caio` | speech | `[grunts] Opa?! Hn! [shouts] Ie-eh! [grunts] Uh!` | 47 | 1 |
| `voz2.aminu` | speech | `[grunts] Oh?! Hnn! [shouts] Haaa-u! [grunts] Ah!` | 48 | 1 |
| `voz2.centella` | speech | `[grunts] Ay?! Hn! [shouts] Eso! [grunts] Uh!` | 44 | 1 |
| `voz2.camille` | speech | `[grunts] Oh?! Hn! [shouts] Voila! [grunts] Uh!` | 46 | 1 |
| `voz2.nila` | speech | `[shouts] SSSA! [grunts] Ah?! Hn! [shouts] Sa-ri!` | 48 | 1 |
| `voz2.baatar` | speech | `[grunts] Hoh?! HNNN! [shouts] Huu-rai! Huu-rai!` | 47 | 1 |
| `voz2.zenon` | speech | `[grunts] Hm?! Hnn! [shouts] HA! [grunts] Tch!` | 45 | 1 |

#### Lote 5

| id | ferramenta | prompt (inglês) | duração | créd. | onde toca | lutadores | fallback |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `pouso` | sfx | Bare feet landing on a wooden floor after a jump: a soft double thud with a light creak and a cloth settle. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `land` e `rebote` | todos | `land()` |
| `salto` | sfx | A fighter pushing off a wooden floor into a jump: a quick foot push scuff and a short upward cloth whoosh. Dry close-mic studio foley, isolated, starts instantly, no music, no voice, no reverb tail, mono. | 1 s | 1 | `jump` e `troca-ficha` (a base) | todos | `jump()` |

### 2.5 Vozes: preset, taxa e mapa de corte

A fala só tem vozes de preset em inglês. **Não invento nomes de preset aqui**: o Atlas escolhe na lista da ferramenta pelo
critério abaixo, e registra no manifesto qual preset virou qual lutador (o nome do preset é dado técnico, não é conta).
`languageCode`: **omitir** no portão; usar (`ja`, `zh`, `ko`, `pt`, `es`, `fr`, `el`) só se o pacote soar "falado em
inglês" demais, e só no código que a ferramenta aceitar.

| Lutador | Preset: critério | Taxa fixa no código | Corte do pacote 1 (ordem) | Corte do pacote 2 (Lote 4) |
|---|---|---|---|---|
| HAYATO | homem adulto, médio-grave, firme, seco | 1,00 | kiai `HA`, leve `Ugh`, pesado `Nngh`, KO `Uaaaah` | guarda `Oh?!`, esforço, vitória `Osu` (rev.), leve 2 |
| WEI LONG | homem maduro, grave, calmo, soproso | 0,94 | kiai `HO-HA`, leve `Hmph`, pesado `Unngh`, KO `Hoooh` | guarda, esforço `Hnnn` (armadura), vitória `Hao` (rev.), leve 2 |
| MIN-JI | mulher jovem, aguda, cortante | 1,04 | kiai `HYA`, leve `Ah`, pesado `Ahk`, KO `Kyaaa` | guarda, esforço, vitória `A-ssa` (rev.), leve 2 |
| CAIO | homem jovem, aberto, quente, quase cantado | 1,00 | kiai `EH-EH`, leve `Uh`, pesado `Ugh`, KO `Aaai` | guarda `Opa?!`, esforço, vitória `Ie-eh`, leve 2 |
| AMINU | homem adulto, voz de peito, firme | 0,96 | kiai `HAU`, leve `Hng`, pesado `Uggh`, KO `Hooo` | guarda, esforço, vitória `Haaa-u`, leve 2 |
| CENTELLA | mulher, energética, brilhante, de palco | 1,02 | kiai `YA-HA`, leve `Ay`, pesado `Aah`, KO `Aaaay` | guarda, esforço, vitória `Eso` (rev.), leve 2 |
| CAMILLE | mulher, contida, elegante, médio | 1,00 | kiai `HEH-HA`, leve `Hm`, pesado `Ah`, KO `Aaah-non` | guarda, esforço, vitória `Voila`, leve 2 |
| NILA | mulher, centrada, médio-grave | 1,00 (SARPA: 1,06 + passa-alta 300 Hz) | kiai `HM-HA`, leve `Hn`, pesado `Aah`, KO `Haaa` | kiai SARPA `SSSA`, guarda, leve 2, vitória `Sa-ri` (rev.) |
| BAATAR | homem muito grave, grande, rosnado | 0,88 | kiai `HAA-UGH`, leve `Hrr`, pesado `Urrgh`, KO `Uuurgh` | guarda, esforço `HNNN` (armadura), vitória `Huu-rai` x2 (rev.) |
| ZENON (chefão) | homem grave, teatral, sinistro | 0,92 + cópia a 0,97 com passa-baixa 1,2 kHz a -10 dB (a voz "dobrada", +1 fonte) | kiai `HAAAH`, leve `Hmph`, pesado `Ngh`, KO `Ohhh-khi` | guarda, esforço, kiai 2 `HA` (COLUNA), desdém `Tch`; vitória = `voz.zenon.riso` |

Regras: os 10 com **pelo menos 6 presets diferentes**; dois lutadores do mesmo gênero que dividirem preset ficam a >= 2 st de
taxa um do outro. Dano leve com 3 variantes (pedido da spec) = o corte leve do pacote 1 + o do pacote 2 + o leve do pacote 1 a
taxa 1,03. Até o Lote 4 existir: guarda = corte pesado; esforço e vitória seguem **sintetizados** (fallback).

**Rota B da voz (só se a fala reprovar no portão e o kiai por efeito passar):** vozes por arquétipo pelo gerador de efeitos,
3 arquétipos (homem grave: WEI LONG, BAATAR, ZENON; homem médio: HAYATO, CAIO, AMINU; mulher: MIN-JI, CENTELLA, CAMILLE, NILA),
cada um com kiai (1 s, 1 créd.), pacote de 3 gemidos de dor (3 s, 3 créd.) e KO (1 s, 1 créd.) = **15 créditos**, no lugar dos
Lotes 2 e 4 (20). A identidade por lutador vem da taxa da tabela acima e da síntese de hoje somada a -9 dB. Prompt-modelo:
`Adult man in a fight letting out three different short pained grunts after taking body blows, one second apart. No words. Dry close-mic studio recording, isolated, starts instantly, no music, no reverb tail, mono.`

---

## 3. Ordem de geração em lotes, com portão

| Lote | O quê | Créd. | Acumulado | Portão para seguir |
|---|---|---|---|---|
| **0 — teste** | `imp.soco.leve`, `voz.hayato` (fala), `teste.kiai.sfx` | 3 | 3 | **ver 3.1**. Sem o OK, nada mais é gerado |
| 1 — foley | 10 sons de impacto, defesa, guarda, arremesso, queda, ar, esquiva | 11 | 14 | curadoria (4.3) aprova >= 9 de 10; o que reprovar entra na fila de refazer |
| 2 — vozes | 9 pacotes + riso do ZENON (rota A) | 10 | 24 | >= 8 de 10 pacotes cortáveis em 4 samples limpos; vozes distintas entre si de ouvido |
| 3 — especiais | 2 corpos de magia + 12 famílias | 15 | 39 | a integração da Vega com os Lotes 0-2 já tocou no `?escuta=1` (prova que o caminho funciona antes de gastar o lote maior) |
| 4 — vozes 2 | 10 pacotes (guarda, esforço, vitória, leve 2) | 10 | 49 | só se os Lotes 0-3 passaram e a folga de refazer não foi consumida acima de 5 |
| 5 — opcional | `pouso`, `salto` | 2 | 51 | só com folga |
| folga | refazer o que a curadoria reprovar | até 9 | **60** | 1 refação por id; 2ª reprovação = o id fica sintetizado |

Regra de parada: se em qualquer lote a taxa de reprovação passar de 30%, **parar**, reescrever os prompts daquele tipo e
gerar 1 só para provar antes de continuar. Créditos nunca gastos em "mais uma variação" sem id na tabela.

### 3.1 O portão (Lote 0)

O que cada um prova:

- `imp.soco.leve`: se o gerador entrega foley **seco, curto e sem música**, com ataque nos primeiros 30 ms.
- `voz.hayato`: se a fala com etiquetas dá **esforço humano** (e não leitura de texto) E se o pacote corta em 4 pedaços limpos.
  Cobre "dano de lutador masculino" (cortes leve e pesado) e é a voz real do HAYATO se aprovar.
- `teste.kiai.sfx`: o mesmo kiai pelo gerador de efeitos, para comparar com o kiai do pacote. Decide a rota da voz.

Critérios (o Apolo mede os 1 a 3; o dono decide o 4):

1. **Técnico**: sem clipping; sem música; cauda acima de -40 dB <= 150 ms depois do fim útil; ataque <= 30 ms do início
   depois do corte.
2. **Corte da fala**: 4 vocalizações separáveis com >= 40 ms de vale abaixo de -35 dB entre elas; nenhuma palavra inglesa
   inteligível.
3. **Artefato de IA**: sem "metal" (chiado granulado de vocoder) nem eco duplo audível no fone.
4. **O dono, no iPhone (alto-falante e fone)**: as 3 prévias tocadas em fila contra o som de hoje (`?escuta=1`, caixa "ANTES",
   ou os MP3 numa página de teste). Pergunta única: "soa mais real que hoje?".

Decisão: soco e fala aprovados -> rota A, segue o Lote 1. Fala reprovada e kiai por efeito aprovado -> rota B (2.5). Os dois
reprovados -> as vozes **ficam sintetizadas** e só seguem o foley e as famílias (Lotes 1, 3 e 5: o plano encolhe para 31 créditos).
Soco reprovado -> 1 refação com o prompt corrigido; reprovado de novo -> parar e voltar para o Atlas e o dono.

---

## 4. Curadoria (o que o Apolo faz com cada arquivo)

### 4.1 Onde os arquivos ficam

- O MP3 baixado da Runway vai para a **pasta temporária** (nunca para o repo): o original é o "master", guardado fora do git
  junto da arte-fonte (`arte-fonte/`, que o `.gitignore` já ignora), em `arte-fonte/sons/<lote>/<id>.mp3`.
- Só o **resultado curado** entra em `public/assets/sons/`.

### 4.2 Processamento (ffmpeg 8.1, já instalado na máquina)

Ordem, por corte:

1. **Decodificar para WAV float 44,1 kHz mono** (`-ac 1 -ar 44100`); se vier estéreo, conferir antes que não há cancelamento
   de fase na soma (comparar o RMS de L+R com o de L).
2. **Cortar**: início no 1º ponto acima de -45 dBFS menos 3 ms; fim quando o nível cai abaixo de -50 dBFS e fica. Pacote de
   fala: cortar nos vales da 3.1 (2). Limites por tipo (fora disso, encurtar ou reprovar): impacto 0,12-0,45 s; golpe no ar
   0,12-0,35 s; dano leve 0,10-0,30 s; dano pesado 0,18-0,45 s; kiai 0,18-0,60 s; KO 0,6-1,2 s (spec §5.3); família 0,3-1,0 s
   (E6 até 1,6 s); queda do KO até 1,5 s.
3. **Rampas**: entrada de **3 ms nos impactos** (preserva o transiente) e **5 ms no resto**; saída de **5 ms** no mínimo,
   20 ms em caudas longas. Nenhum corte termina fora de zero.
4. **Normalizar**: pico a **-1 dBTP** (medido com `loudnorm` em modo de medição ou `ebur128=peak=true`). Volume: alvo
   **-16 LUFS** de sonoridade momentânea máxima nos sons >= 0,4 s; nos curtos (< 0,4 s, onde a janela LUFS não vale), RMS da
   região ativa a **-14 dBFS** (impactos) e **-16 dBFS** (vozes). O ajuste FINO de mixagem não é feito no arquivo: vai no
   `ganhoDb` do manifesto, calibrado contra o som sintetizado que cada sample substitui (±3 dB, spec §6.3).
5. **Medir e anotar** no manifesto: duração, pico (dBFS) e RMS da região ativa (dBFS) de cada corte, saídos do `astats`.
   É isso que deixa a Vega testar volume no Node sem decodificar MP3.
6. **Montar as folhas** (4.4) e **codificar**: MP3 **CBR**, LAME (`libmp3lame`), cabeçalho Xing/LAME presente,
   **96 kbps** na folha da base (transientes) e **64 kbps** nas folhas de voz e família, mono, 44,1 kHz.

Por que MP3, e não AAC/Ogg/Opus: o `decodeAudioData` do Safari do iOS decodifica MP3 e AAC; Ogg Vorbis não é garantido em
iOS antigo. Entre MP3 e AAC, o MP3 é o que decodifica igual em todos os navegadores do público. **O MP3 tem atraso de
codificação** (~25 ms de silêncio no início, e nem todo navegador o remove): por isso cada corte na folha tem **40 ms de
silêncio antes e depois**, e a Vega acha o ataque real no buffer decodificado (6.2), em vez de confiar no
instante escrito no manifesto.

### 4.3 Checklist de aprovação por id

Aprovado só com os 5: (1) os limites técnicos da 3.1; (2) duração dentro da faixa do tipo; (3) sem artefato de IA no fone;
(4) **lê como a coisa certa sem imagem** (um soco é soco, não palma; uma defesa é bloqueio, não acerto); (5) para família:
reconhecível como o instrumento ou o elemento do estilo (E1 elétrico, E4 o arco de corda com cabaça, E5 o tambor que muda de
tom, etc.). Reprovado vai para a fila de refazer com o motivo e o prompt corrigido (1 vez por id).

### 4.4 Folhas, nomes e manifesto

```
public/assets/sons/
  LEIA-ME.txt                 origem declarada (já criado)
  manifesto.json              índice de cortes (abaixo)
  base.mp3                    foley + magia comum (Lotes 0, 1, 3 comuns, 5): ~12 s, ~145 KB
  lutador-<id>.mp3            voz (pacotes 1 e 2) + família(s) do lutador: ~6 s, ~50 KB cada (10 arquivos)
```

Nomes: minúsculas, sem acento, o `id` de luta do lutador (`wei-long`, `min-ji`). Os ids de som são os da tabela 2.4; os cortes
de voz viram `voz.<lutador>.<kiai|leve|leve2|pesado|ko|guarda|esforco|vitoria>` (NILA SARPA: `voz.nila.sarpa.kiai`).

Forma do manifesto (a Vega fecha o tipo e a validação):

```json
{
  "versao": 1,
  "taxa": 44100,
  "folhas": { "base": { "arquivo": "base.mp3", "bytes": 0 }, "hayato": { "arquivo": "lutador-hayato.mp3", "bytes": 0 } },
  "sons": {
    "imp.soco.leve": { "folha": "base", "inicio": 0.04, "dur": 0.22, "picoDb": -1.0, "rmsDb": -14.2, "ganhoDb": 0 },
    "voz.hayato.kiai": { "folha": "hayato", "inicio": 0.04, "dur": 0.31, "picoDb": -1.0, "rmsDb": -16.1, "ganhoDb": 0, "taxa": 1.0 }
  },
  "presets": { "hayato": "<nome do preset escolhido>" }
}
```

Peso: ~60 s de material curado (foley ~12 s a 96 kbps + vozes e famílias ~48 s a 64 kbps) = **0,5 a 0,75 MB**, contra o teto
de 1,2 MB. Por luta baixa-se a base + 2 lutadores, **~0,25 a 0,3 MB**.

---

## 5. Licença e origem

- **O dono deve conferir, antes de publicar fora do ambiente de teste, os termos de uso vigentes da Runway** para uso
  comercial de áudio gerado (efeitos e fala) numa conta do **plano gratuito**: se o plano gratuito permite uso comercial, se
  exige atribuição, e se há regra própria para as vozes de preset da fala. Este plano **não afirma** que o uso comercial está
  liberado; ninguém da squad conferiu os termos.
- Até a confirmação: os samples só vão para o site de teste; a chave de rollback (6.1) devolve o som 100% sintetizado sem
  apagar arquivo.
- `public/assets/sons/LEIA-ME.txt` declara a origem (gerado por IA na Runway, sem voz de pessoa real, curadoria da squad) e
  a pendência de licença, **sem id de conta, e-mail ou saldo**. Atualizar a data e os lotes quando os arquivos entrarem.
- Nenhum prompt cita pessoa, marca ou obra; nenhuma voz imita alguém.

---

## 6. Integração prevista (para a Vega)

### 6.1 Forma

- Módulo novo **`src/audio/amostras.ts`** (pedaço à parte por `import()`, como `identidade-sonora` e `temas`): `BancoDeAmostras`
  com `carregarFolha(nome)`, `tem(id)`, `tocar(id, opcoes)`. Chave de rollback `AMOSTRAS_REALISTAS = true` em
  `src/audio/chaves.ts` (sempre ligada, como as outras; falsa = o som de hoje). Nada no menu, nada na URL.
- **`sonsDoEvento` não muda** (lock-step) e **`init()` não muda** (oráculo do grafo). Os samples são uma 3ª camada, depois da
  identidade.
- **O plano continua puro**: `planoSonoro` passa a anotar, em cada item, a amostra preferida (`amostra?: { id, taxa?, filtro? }`)
  e, para os métodos genéricos que um sample troca (`punch`, `kick`, `block`, `swing`, `fireballLaunch`, `fireballHit`), uma
  lista de trocas `{ metodo, amostra }`. **Quem decide se o sample existe é a execução** (`tocarItem`/`reagirComIdentidade`):
  com o buffer decodificado toca o sample; sem ele toca o que toca hoje. Assim os testes de plano atuais seguem verdes e o
  jogo nunca fica mudo esperando rede.
- Leve x pesado, variante e taxa saem de `variacao(...)` com canais novos (sem `Math.random`).

### 6.2 Carregamento e iOS

- `fetch` do manifesto e da `base.mp3` no boot, em paralelo com as fontes (como os pedaços de hoje); `fetch` das folhas dos
  2 lutadores ao confirmar a seleção (e do adversário do arcade ao sortear). O CSP já permite (`connect-src 'self'`).
- `decodeAudioData` **só depois que o `AudioContext` existe** (ele nasce no 1º gesto, `src/platform/audio-desbloqueio.ts`);
  decodificar com o contexto `suspended` funciona, então não espera o `resume`. Usar a forma de callback com a promessa como
  rede (WebKit antigo).
- **Ataque real**: ao decodificar, varrer cada corte a partir de `inicio - 40 ms` até o 1º sample acima de -45 dBFS e guardar
  esse instante. Absorve o atraso do MP3, que muda de navegador para navegador.
- Tocar por `AudioBufferSourceNode.start(quando, deslocamento, duracao)` sobre o buffer da folha (sem copiar buffer).
- iOS: o contexto costuma rodar a 48 kHz; o decode reamostra sozinho. Memória: PCM float32 ~190 KB por segundo de áudio;
  base + 2 lutadores ~24 s = **~4,5 MB**, aceitável. Guardar no máximo 4 folhas de lutador (descartar a mais antiga).
- O interruptor de silencioso do iPhone continua calando o Web Audio (comportamento do iOS, já registrado): não contornar.
- Falha de rede numa folha = aquela folha fica na síntese, sem derrubar nada (a regra do `TypeError` que já existe). Manifesto
  **inválido** (corte sem folha, id fora da tabela, total > 1,2 MB) derruba o boot, como os dados de sons.

### 6.3 Mixagem e orçamento

- Destino: `barramentoIdentidade()` -> `sfx` -> master -> limitador. A voz-sample passa pela **garganta** do lutador
  (`abrirGarganta`: uma voz por vez, KO não é interrompido, anti-metralhadora de 80 ms), como a voz sintetizada.
- Um sample = **1 fonte** (+ 1 ganho + 1 filtro opcional), contra ~4 fontes e ~15 nós de uma sílaba de voz formante: a camada
  de samples **alivia** o orçamento. Registrar com `registrarFontes`; teto de 12 por plano e 32 simultâneas continua; prioridade
  igual à de hoje (KO e vitória 3; grito e sucesso 2; dano e impacto 1).
- Ganho: `ganhoDb` do manifesto, calibrado para o RMS de cada sample ficar a ±3 dB do som sintetizado que ele troca (a régua de
  volume que já existe, com o `rmsDb` do manifesto do lado do sample); dano pesado +2 a +4 dB acima do leve; pico por plano
  <= 0,7.
- **Família de especial**: sample + a assinatura sintetizada a -6 dB (camadas `ataque` e `corpo`), ver 2.3. **KO**: a queda
  (sample, com `atrasoMs` ajustado no ouvido) + voz de KO (sample) + `GONGO_KO` (síntese).
- Painel `?escuta=1`: acrescentar a caixa "amostra / síntese" (A/B por som) e o volume de cada camada. É onde o dono e o Apolo
  decidem as 3 dúvidas abertas: o `VIDRO_GUARDA` sobre `guarda.quebra`, o sub-grave sintetizado sob os impactos no alto-falante
  do celular, e o atraso da queda do KO.

### 6.4 Testes que a Vega deve deixar (a Íris valida)

Manifesto válido (todo id da tabela de troca existe em alguma folha, folhas existem, soma dos bytes <= 1,2 MB); banco vazio =
plano e chamadas **iguais às de hoje**; com o banco cheio, `punch` não toca junto do `imp.soco.*`; nenhum `Math.random`;
`luta-fidelidade`, `audio.test`, `audio-chefe.test` verdes sem `-u`; teto de 32 fontes no estresse "tudo ligado". No aparelho
(só a Íris ou o dono, no iPhone): o 1º toque destrava e o 1º soco já sai como sample.

---

## 7. O que só o ouvido prova

Os testes vão provar que os samples **existem, cabem, carregam e caem na síntese quando faltam**. Não provam que soam bem. Isso é
o portão do Lote 0, a curadoria por id (4.3) e a escuta do dono no iPhone, nesta ordem.
