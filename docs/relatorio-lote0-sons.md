# Relatório técnico do Lote 0 (portão dos sons realistas)

Curadoria: Apolo, 2026-10-22. Plano: `docs/plano-sons-realistas.md` (§2.4, §3.1, §4). Missão `cmvjhqpiy01ln01p752rgo6j0`.

Este relatório julga só o que **se mede**. O critério 4 do §3.1 ("soa mais real que hoje?", no iPhone) e as partes de ouvido
dos critérios 2 e 3 (palavra inglesa inteligível, chiado de vocoder, eco no fone) são do dono.

## 0. Veredito em 6 linhas

| id | Veredito técnico | Motivo em uma linha |
|---|---|---|
| `imp.soco.leve` | **REPROVADO** | não é um soco audível: 99,8% da energia abaixo de 80 Hz (raia mais forte em 22 Hz), 0,00% entre 500 Hz e 4 kHz; no alto-falante do celular sobra -52 dBFS |
| `teste.kiai.sfx` | **APROVADO** (com o corte "seco") | sem clipping, sem música, cauda de 38 ms; o corte pela regra -45 dBFS dá ataque de 32 ms (2 ms fora); o seco dá 21 ms |
| `voz.hayato` | **APROVADO** (com os cortes "secos") | 5 vocalizações separadas por vales de 509 a 761 ms abaixo de -35 dB (piso -86 a -88 dBFS); rende os 4 papéis e sobra 1 |

Consequência no §3.1: **fala aprovada na medida -> rota A, se o ouvido do dono confirmar**. O soco cai na regra "1 refação com o
prompt corrigido" (prompt na seção 6). O kiai por efeito só importa se a fala reprovar no ouvido.

## 1. Como foi medido

- **Ferramentas**: ffmpeg/ffprobe 8.1.1 (decodificação, `ebur128` com pico real), Node 24 com FFT própria (Welch, Hann, 2048
  pontos, salto 512), envelope RMS de 10 ms com salto de 1 ms, f0 por autocorrelação (quadros de 40 ms, 70-600 Hz, quadro vozeado
  com correlação > 0,6). Os sintéticos foram renderizados pelo `AudioSys` real sobre o mini motor offline
  (`tests/support/audio-offline.ts`), a **44,1 kHz** (o padrão dos testes é 22,05 kHz; subi para comparar a faixa acima de 4 kHz).
- **Estéreo**: soco e kiai vieram **estéreo** (o prompt pedia mono); a voz veio mono. Soma mono = (L+R)/2. Sem cancelamento de fase:
  no soco, L+R fica 1,9 dB acima de L (correlação 0,74, mas R está 10 dB abaixo de L); no kiai, correlação 0,999.
- **Região ativa** (RMS): quadros de 10 ms dentro de 40 dB do pico, a mesma regra da régua do projeto.
- **Ataque**: tempo do 1º ponto >= -45 dBFS até a 1ª amostra que chega a 10% do pico (-20 dB). **Fim útil**: último quadro a
  20 dB ou menos do pico RMS. **Cauda**: do fim útil até o último quadro >= -40 dBFS.
- **"Alto-falante"**: um passa-alta de 300 Hz (Butterworth de 4ª ordem) como estimativa de um alto-falante de celular. É uma
  aproximação, não a resposta medida do iPhone.
- Os scripts estão em `arte-fonte/sons/curadoria-scripts/`, fora do git. As medidas brutas estão em
  `arte-fonte/sons/lote0/cortes/medidas-lote0-v1.json`.

## 2. Os originais

| medida | `imp-soco-leve-v1` | `kiai-sfx-v1` | `voz-hayato-chad-v1` |
|---|---|---|---|
| formato | MP3 128 kbps, **2 canais**, Lavf 63.1 | MP3 128 kbps, **2 canais** | MP3 128 kbps, 1 canal |
| duração real (sem o atraso) | 1,000 s | 1,000 s | 7,040 s |
| atraso do codificador | 1105 amostras = **25,06 ms** no início, 875 no fim | idem | 1105 no início, 623 no fim |
| pico real (dBTP, por canal) | -24,2 / -24,4 | -0,3 / -0,3 | -1,4 |
| platôs saturados (>= 3 amostras > 0,97) | 0 | 0 | 0 |
| sonoridade integrada | -52,1 LUFS | -7,4 LUFS | -13,5 LUFS |
| piso (percentil 10, quadros de 20 ms) | -84 dBFS | -65 dBFS | -82 dBFS (vales de -86 a -88) |
| ataque (-45 dBFS até 10% do pico) | 0 ms: a 1ª amostra já está em -28 dBFS | 39 ms | 43 ms (1º evento) |
| energia < 150 / 150-500 / 500-4k / > 4k Hz | **100,0 / 0,0 / 0,0 / 0,0 %** | 0,0 / 1,7 / 97,8 / 0,6 % | 0,7 / 23,6 / 74,8 / 0,9 % |
| centroide espectral | **26 Hz** | 800 Hz | 974 Hz |
| música ou ruído de fundo | não | não (resto de -59 dBFS RMS entre 0,70 e 1,00 s, ronco de 86 Hz de centroide) | não (os vales chegam a -88 dBFS) |

**O atraso de codificação**: os três MP3 têm o cabeçalho Info/LAME com o atraso declarado (1105 amostras = 25,06 ms, e o
preenchimento no fim). O ffmpeg (e o Chrome) descartam esse atraso. Navegador que **não** respeitar o cabeçalho desloca tudo
25,06 ms. Os 40 ms de silêncio do §4.2 cobrem esse caso com folga. Os cortes novos, recodificados com `libmp3lame`, têm o
mesmo atraso declarado de 1105 amostras.

### 2.1 O soco, em detalhe

- Distribuição fina da energia (0-400 ms): 20-40 Hz **82,5%**; 40-80 Hz **17,4%**; 80-150 Hz 0,15%; tudo acima de 150 Hz
  somado: 0,02%. Raias mais fortes: 22 Hz, 0 Hz (deriva de DC), 43 Hz, 65 Hz.
- RMS acima de 150 Hz por fatia de 20 ms: -45, -52, -54, -57, -63 dBFS... O "estalo de pele" que o prompt pedia não existe.
- No fluxo bruto, sem descartar o atraso, o primeiro conteúdo >= -45 dBFS está em 24,8 ms, ou seja, exatamente onde o áudio
  real começa. **O som começa no ataque, sem nenhuma entrada**: o "starts instantly" do prompt foi levado ao pé da letra, e o
  início parece ter ficado truncado. A rampa de 3 ms impede o clique, mas não traz de volta o ataque perdido.
- Normalizado no teto do §4.2 (-1 dBTP, um ganho de **+28,7 dB**), a sonoridade momentânea máxima chega a só **-24,8 LUFS**:
  faltam 8,8 LU para o alvo de -16 LUFS, e não há como chegar lá sem clipar. Depois do passa-alta de 300 Hz, sobra
  **-52 dBFS**. Na mesma escala, o `punch()` sintetizado de hoje deixa **-28,6 dBFS**: o soco de hoje tem 23 dB a mais do que o
  alto-falante consegue tocar.
- Duração: o nível fica acima de -50 dBFS (já normalizado) até o fim do arquivo, em 1,0 s. Para um impacto, o limite é
  0,12-0,45 s. **Não é seco nem curto: é um ronco subsônico que vai sumindo devagar.**

## 3. A fala do HAYATO: segmentação

Limiar de -35 dBFS, unindo os vales mais curtos que 40 ms. **Saíram 5 eventos, e não os 4 do texto.** A identificação abaixo é
uma **hipótese tirada das medidas**: quem diz qual palavra é cada pedaço é o ouvido.

| evento | núcleo (ms) | dur. a -20 dB do pico | f0 (mediana, faixa p10-p90) | < 150 / 150-500 / 500-4k / > 4k | centroide | planura | leitura provável |
|---|---|---|---|---|---|---|---|
| E1 | 135-492 | 255 ms | 416 Hz (350-420) | 0,1 / 17,8 / 80,8 / 1,3 | 1052 Hz | 0,063 | o grito curto `HA!` (kiai) |
| E2 | 1156-1749 | 545 ms | 194 Hz (78-368), caindo | 2,1 / 63,8 / 32,8 / 1,3 | 755 Hz | 0,065 | grunhido (`Ugh`, ou o grunhido que a etiqueta `[grunts]` gerou por conta própria) |
| E3 | 2518-3105 | 543 ms | 207 Hz (121-308) | 2,5 / 46,2 / 50,2 / 1,1 | 817 Hz | 0,058 | grunhido (`Ugh`) |
| E4 | 3623-4485 | 786 ms | 145 Hz (91-296); subida lenta de cerca de 230 ms | 0,8 / 75,2 / 23,8 / 0,2 | 543 Hz | **0,013** (nasal, quase sem ruído) | `Nngh` |
| E5 | 5200-6895 | 1641 ms | 387 Hz (302-424): sobe de 340 para 428 e depois cai | 0,2 / 2,7 / 96,2 / 0,9 | 1118 Hz | 0,043 | `Uaaaah` (KO) |

| vale | mínimo | tempo abaixo de -35 dB | tempo abaixo de -60 dB |
|---|---|---|---|
| E1-E2 | -85,9 dBFS | 656 ms | 236 ms |
| E2-E3 | -88,4 dBFS | 761 ms | 337 ms |
| E3-E4 | -87,9 dBFS | 509 ms | 180 ms |
| E4-E5 | -88,2 dBFS | 707 ms | 322 ms |

- Depois de E1 a E4 há uma **respiração** separada: cerca de 300 ms, pico entre -37 e -45 dBFS, RMS por volta de -51 dBFS,
  planura de 0,58 a 0,68 e centroide de 2,9 a 3,6 kHz. Isso é ruído de sopro, não eco: um eco repetiria o espectro da voz (planura
  baixa, centroide perto de 550-1100 Hz). Os cortes param antes dela.
- **Nos últimos 28 ms do arquivo (7,011-7,039 s)** começa outro som, com pico de -34 dBFS, cortado pelo fim do arquivo. Nenhum
  corte usa esse trecho, mas é sinal de que o gerador encerrou a fala no meio de alguma coisa. Vale ficar de olho nos próximos
  pacotes.
- **Rende os 4 cortes? Sim, e sobra 1.** As emendas não existem, porque cada papel sai de um só evento e não há colagem. O
  problema é outro: a **duração natural** de E2 a E5 passa da faixa do tipo (leve 0,10-0,30 s; pesado 0,18-0,45 s; KO 0,6-1,2 s),
  então esses cortes são **truncados no meio da vogal**, com uma saída longa (50, 60 e 150 ms). Se isso soa cortado, só o ouvido
  diz.
- O início dos 5 eventos é suave (entram com o "h" ou com a nasal): pela regra do §4.2 (-45 dBFS menos 3 ms), o ataque fica entre
  **40 e 141 ms**, e reprova o critério de 30 ms. Os cortes de papel usam o **início seco**: a amostra chega a 10% do pico do evento
  e o corte começa 25 ms antes. Isso pula de 21 a 120 ms de subida, e o ataque fica entre 4 e 23 ms.

## 4. Os cortes candidatos (`arte-fonte/sons/lote0/cortes/`)

Cada corte tem um `.wav` (float 32, 44,1 kHz mono, **sem** silêncio em volta: é a matriz para montar as folhas) e um `.mp3`
(LAME CBR mono 44,1 kHz, 96 kbps no impacto e 64 kbps nas vozes, com **40 ms de silêncio antes e depois**, para ouvir e testar
numa página). Rampas: entrada de 3 ms no impacto e de 5 ms nas vozes; saída de 5 ms no fim natural, 20 ms nos eventos inteiros
longos, e 40 a 150 ms quando o corte é truncado. Normalização do §4.2: com 0,4 s ou mais, sonoridade momentânea máxima de
-16 LUFS; abaixo de 0,4 s, RMS ativo de -14 dBFS (impacto) ou -16 dBFS (voz); teto de -1 dBTP, conferido **depois** do MP3.

| arquivo (`-v1`) | origem | dur. | ganho | M máx / RMS ativo | pico MP3 | ataque | cauda | situação |
|---|---|---|---|---|---|---|---|---|
| `voz-hayato-kiai` | E1, 137-517 ms, fim natural | 0,380 s | -1,4 dB | RMS -16,0 | -3,6 dBTP | 23 ms | 34 ms | **papel: kiai** (faixa 0,18-0,60) |
| `voz-hayato-leve` | E2, 1170-1470 ms, truncado | 0,300 s | -2,2 dB | RMS -16,0 | -4,7 | 23 ms | 7 ms | **papel: dano leve** |
| `voz-hayato-leve2` | E3, 2532-2832 ms, truncado | 0,300 s | -1,5 dB | RMS -16,0 | -5,5 | 17 ms | 5 ms | **papel: dano leve, 2ª variante** |
| `voz-hayato-pesado` | E4, 3686-4136 ms, truncado | 0,450 s | +1,0 dB | M -16,3 | -4,2 | 4 ms | 5 ms | **papel: dano pesado** |
| `voz-hayato-pesado2` | E2, 1170-1620 ms, truncado | 0,450 s | -2,5 dB | M -16,4 | -4,4 | 23 ms | 6 ms | alternativa de pesado (escolha de ouvido) |
| `voz-hayato-ko` | E5, 5210-6410 ms, truncado com saída de 150 ms | 1,200 s | -6,1 dB | M -16,5 | -10,0 | 23 ms | 8 ms | **papel: KO** (faixa 0,6-1,2) |
| `voz-hayato-e1` a `e5` | os 5 eventos inteiros pela regra -45/-50 do §4.2 | 0,40 / 0,71 / 0,68 / 1,17 / 1,77 s | -1,3 a -6,2 dB | M de -16,3 a -16,5 | -3,4 a -8,3 | **40 / 141 / 101 / 131 / 61 ms** | 10 a 34 ms | referência para ouvir; reprovam no ataque |
| `kiai-sfx-corte-seco` | 14-614 ms, início seco | 0,600 s | -7,3 dB | M -16,5 | -7,7 | 21 ms | 38 ms | **o kiai da rota B**, se ela for usada |
| `kiai-sfx-corte` | 0-600 ms, regra -45 | 0,600 s | -7,2 dB | M -16,3 | -7,5 | **32 ms** | 37 ms | referência (2 ms fora) |
| `imp-soco-leve-corte` | 0-450 ms, limitado a 0,45 s | 0,450 s | +28,7 dB, no teto | M **-24,8** | -1,4 | 0 ms (ataque truncado) | 123 ms | **reprovado**; existe só para o dono ouvir o problema |

Os números para o manifesto (`picoDb`, `rmsDb`, duração) estão por corte em `medidas-lote0-v1.json`, nos campos `cortes[].final`.

## 5. Real x sintético: o que ganha em corpo

Todos normalizados com o pico em -1 dBFS, para comparar forma e espectro. "Alto-falante" = RMS ativo depois do passa-alta de
300 Hz. "dp f0" = desvio do tom em semitons; "|Δ| f0" = salto médio de tom entre quadros vizinhos de 10 ms (irregularidade).

| par | < 150 / 150-500 / 500-4k / > 4k | centroide | RMS ativo | alto-falante | dp f0 | \|Δ\| f0 |
|---|---|---|---|---|---|---|
| soco real (corte) | 100 / 0 / 0 / 0 | 26 Hz | -13,3 | **-52,0** | n/a | n/a |
| `punch()` sintético | 19,8 / 80,0 / 0,2 / 0 | 161 Hz | -13,6 | **-28,6** | n/a | n/a |
| kiai real (fala, E1) | 0,1 / 17,8 / 80,8 / 1,3 | 1052 Hz | -13,8 | -14,3 | 1,6 st | 1,00 st |
| kiai real (efeito, seco) | 0 / 1,7 / 97,8 / 0,6 | 800 Hz | -10,7 | -11,0 | 11,6 st (f0 instável) | 2,58 st |
| kiai sintético do HAYATO | 0,3 / 53,3 / 46,2 / 0,2 | 594 Hz | -14,2 | -16,2 | 0,7 st | 0,35 st |
| `special(1)` genérico | 1,1 / 47,9 / 50,9 / 0 | 620 Hz | -14,0 | -15,9 | 2,5 st | 0,26 st |
| leve real (E2 / E3) | 0,1 / 65,7 / 34,0 / 0,2 e 0 / 36,2 / 63,5 / 0,3 | 720 / 884 Hz | -12,9 / -12,1 | -15,5 / -13,5 | 7,1 / 5,6 st | 3,76 / 1,15 st |
| leve sintético do HAYATO | 0,7 / 86,7 / 12,3 / 0,2 | 504 Hz | -13,5 | -17,1 | 0,5 st | 0,21 st |
| pesado real (E4 / E2) | 0 / 66,8 / 33,1 / 0 e 0,9 / 69,3 / 29,0 / 0,8 | 618 / 657 Hz | -13,6 / -13,4 | -17,3 / -16,8 | 8,1 / 10,2 st | 3,93 / 4,37 st |
| pesado sintético do HAYATO | 0,3 / 34,2 / 65,4 / 0,1 | 561 Hz | -14,3 | -15,7 | 1,4 st | 0,32 st |
| KO real (E5) | 0 / 2,3 / 97,0 / 0,6 | 1050 Hz | -8,9 | **-9,1** | 4,6 st | 0,79 st |
| KO sintético do HAYATO (sem gongo) | 0 / 62,0 / 37,9 / 0,1 | 501 Hz | -12,1 | **-14,9** | 0,8 st | 0,06 st |

O que a medida diz, sem enfeite:

1. **No sentido de "grave", o corpo não aumenta.** Abaixo de 150 Hz, nenhum som real tem mais energia que o sintético. Entre
   150 e 500 Hz, o kiai real e o KO real têm **bem menos** (17,8% e 2,3%, contra 53% e 62%), porque gritam com f0 de 390 a
   420 Hz, enquanto o perfil sintético do HAYATO grita a 165 Hz. Os grunhidos (leve e pesado) ficam no mesmo patamar do
   sintético (de 36 a 70%, contra 34 a 87%). E o soco real é **pior** que o `punch()` justamente na faixa de 150-500 Hz.
2. **O ganho que se mede é outro: irregularidade humana e presença na faixa que o celular toca.** O tom da voz real oscila de 3 a
   18 vezes mais que o do sintético (|Δ| f0 de 0,8 a 4,4 st, contra 0,06 a 0,35), e a planura mostra respiração e ruído de
   garganta. Com o mesmo pico, depois do passa-alta de 300 Hz, o KO real deixa **+5,8 dB** de energia, o kiai **+1,9 dB** e o
   leve **+1,6 a +3,6 dB**. O pesado deixa **-1,1 a -1,6 dB** (é mais grave e nasal).
3. **Identidade**: a voz "Chad" grita bem mais aguda que o perfil sintético (f0 de 416 Hz no kiai, contra 168 Hz). Se a fala
   for adotada, a "taxa fixa" da tabela 2.5 (1,00 para o HAYATO) e a distância entre os 10 lutadores (R6/R7) precisam ser
   recalculadas sobre os samples, e não sobre a síntese.

## 6. Refação do soco (1 crédito, a única do id)

Diagnóstico do prompt: "a short **low thump underneath**" puxou o gerador para o subgrave, e "**starts instantly**" cortou a
entrada do ataque. O "snappy flesh smack" não apareceu. Prompt corrigido (inglês, 379 caracteres, `duration: 1`):

> `A single bare-knuckle jab smacking a bare muscular torso, recorded up close: a sharp, bright, snappy slap of skin on skin with a tight punchy midrange body, like a leather glove hitting a heavy bag. Very short, under a quarter second. A split second of silence, then the one hit. Dry close-mic studio foley, isolated, no music, no voice, no sub-bass rumble, no reverb tail, mono.`

Para aprovar, o novo soco precisa medir: 500-4k Hz >= 30% da energia; < 80 Hz <= 20%; fim útil <= 0,25 s; nível acima de
-40 dBFS por no máximo 150 ms depois do fim útil; normalizado a -1 dBTP, RMS ativo de -14 dBFS ou mais sem clipar; depois do
passa-alta de 300 Hz, pelo menos o -28,6 dBFS do `punch()` de hoje.

**Recomendação para o Lote 1** (é decisão do Atlas, porque mexe na regra 2.2): trocar "starts instantly" por "a split second of
silence, then..." em **todos os impactos**. O corte tira o silêncio de graça, mas o ataque perdido não volta. Acrescentar
"no sub-bass rumble" nos sons que não são queda nem arremesso.

## 7. Critérios do §3.1: o que passou na medida

| critério | soco | kiai por efeito | fala do HAYATO |
|---|---|---|---|
| 1a sem clipping | ok (-24,2 dBTP) | ok (-0,3 dBTP, sem platô; perto do teto, mas os cortes saem a -7,7) | ok (-1,4 dBTP) |
| 1b sem música | ok | ok | ok (vales de -86 a -88 dBFS) |
| 1c cauda acima de -40 dB <= 150 ms | **falha**: o nível só fica abaixo de -50 dBFS (normalizado) no fim do arquivo, em 1,0 s | ok (38 ms) | ok (de 5 a 34 ms nos cortes de papel) |
| 1d ataque <= 30 ms | número ok (0 ms), mas o ataque está **truncado** | ok no corte seco (21 ms); 32 ms pela regra -45 | ok nos cortes secos (de 4 a 23 ms); de 40 a 141 ms pela regra -45 |
| duração do tipo (§4.2) | **falha** (impacto de 0,12-0,45 s; natural de cerca de 1 s) | ok cortado em 0,60 s (natural de 0,685 s) | ok depois de truncar E2, E3, E4 e E5 (natural acima da faixa) |
| 2 separável (vale >= 40 ms abaixo de -35 dB) | n/a | n/a | **ok**, com folga: vales de 509 a 761 ms |
| 2 sem palavra inglesa inteligível | n/a | n/a | **ouvido do dono** |
| 3 sem metal nem eco duplo | ouvido | ouvido; na medida, nenhum eco (o resto depois de 0,7 s é ronco de 86 Hz a -59 dBFS) | ouvido; na medida, os restos depois de cada evento são respiração (planura de 0,58 a 0,68), não eco |
| 4 "mais real que hoje" (iPhone) | **dono** | **dono** | **dono** |

## 8. O que esta medida não prova

- Que a voz soa humana, que não tem "metal" e que nenhuma sílaba vira inglês: é escuta, no fone e no alto-falante.
- Que o truncamento de E2, E3, E4 e E5 soa natural (saídas de 50 a 150 ms no meio da vogal).
- Que cada evento é a palavra que a tabela da hipótese diz (E2 e E3 podem estar trocados com `Ugh`; o extra pode ser E2).
- A resposta real do alto-falante do iPhone: o passa-alta de 300 Hz é uma estimativa.
- A licença de uso comercial do áudio gerado no plano gratuito (§5 do plano): **não conferida**.
