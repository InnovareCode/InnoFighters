# Relatório: curadoria dos sons CC0 (pacote v1)

Apolo, 2026-10-22. Missão `cmvjjdso601nq01p7p74d2ueu`. Base: `docs/pesquisa-sons-cc0.md` (§6.1 a lista autorizada, §7 o
plano de curadoria) e `docs/plano-sons-realistas.md` (§4 processamento e folhas, §6 integração). Contrato do manifesto:
`src/data/sons/amostras.ts` (`validarManifesto`, `idsObrigatorios`).

## 0. Resumo

- **Download**: os 22 arquivos da §6.1 (19 itens, Kenney + OpenGameArt, todos CC0, sem login), **byte a byte iguais** ao
  listado (34.747.165 B, diferença 0). SHA-256 de cada um em `arte-fonte/sons/cc0/ORIGEM-downloads.tsv`. Nenhum URL falhou,
  nenhum pacote foi trocado.
- **Medida**: 639 arquivos de áudio medidos (`arte-fonte/sons/cc0/inventario-medido.tsv`): duração, fase L+R, pico, RMS
  ativo, piso, energia por banda, centroide, nº de eventos; nas vozes, f0 (YIN) por grupo.
- **Pacote**: `arte-fonte/sons/pacote-v1/`: `base.mp3` + 10 `lutador-<id>.mp3` + `manifesto.json` + `CREDITOS.txt`.
  **159 cortes em 88 ids, 782.900 B (0,78 MB, teto 1,2 MB)**. Por luta baixa-se a base + 2 lutadores: ~0,36 a 0,41 MB.
- **Contrato**: o manifesto passa no `validarManifesto` real do jogo (0 erros), os bytes declarados batem com os arquivos e
  **todo o núcleo de `idsObrigatorios()` está presente** (foley + kiai/leve/pesado/KO dos 10 lutadores). Rodado por vitest
  contra `src/data/sons/amostras.ts` (`curadoria-scripts/validar-pacote.test.ts`).
- **Régua do iPhone** (reprovar impacto com mais de 60% da energia abaixo de 150 Hz): **0 cortes finais reprovados**. Sozinhos,
  o `impactPunch_heavy` da Kenney (70-84%), o `impactSoft` (92-100%) e os passos `footstep_wood` (68-91%) reprovariam: por isso
  entram só como camada sob a toalha, ou foram trocados (passos do RPG Audio, 2-10%).
- **Runway**: os 4 sfx de IA (`lote0`, `lote1`) medidos com a mesma régua têm **77 a 100%** abaixo de 150 Hz: todos
  reprovariam. Ficam fora do pacote, como manda a ordem, e perdem também por medida.
- **Nada foi ouvido.** A escolha é por medida e pela descrição do arquivo. A seção 6 lista o que só o ouvido do dono prova.

## 1. Método (o que cada número quer dizer)

Scripts em `arte-fonte/sons/curadoria-scripts/` (nenhum roda de dentro da pasta baixada; recebem o caminho como argumento):

| script | faz |
|---|---|
| `x7z.py` | extrator 7z só com a biblioteca padrão do Python (`lzma`). O `tar` do Windows (bsdtar 3.5.2) não abre LZMA ("LZMA codec is unsupported") e não há 7-Zip na máquina: nada foi instalado. Rodado com `python -I`; saneia nomes (sem `..`). Conferido: os 52 FLAC decodificam sem erro no ffmpeg |
| `inventario-cc0.mjs` | mede cada arquivo (tabela em `cc0/inventario-medido.tsv`) |
| `vozes-cc0.mjs` | f0 por YIN e centroide por voz (grupo de arquivos) |
| `render-cc0.test.ts` | renderiza, com o `AudioSys` real, o som sintetizado que cada id substitui (base do `ganhoDb`) |
| `spec-pacote-v1.mjs` | a escolha: de que arquivo(s) sai cada corte, camadas, ganhos relativos, filtros, taxas |
| `pacote-v1.mjs` | corta, soma, filtra, mede a régua, normaliza, monta as folhas, codifica, mede o MP3 e grava o manifesto |
| `validar-pacote.test.ts` | roda o validador do jogo sobre o manifesto |

Regras aplicadas por corte (pesquisa §7 e plano §4.2):

1. **Mono**: L+R somados; se a soma perde mais de 3 dB (fase), só o canal mais forte (caso do `cloth1` e do crepitar
   elétrico, que perde 4,8 dB).
2. **Início seco**: 10% do pico menos 25 ms, por camada. As camadas se alinham pelo ataque de cada uma.
3. **Passa-alta 80 Hz** em todo corte (tira ronco e subgrave que o iPhone não toca).
4. **Fim**: o envelope de 10 ms cai a -50 dB do pico e fica; corta no limite da categoria. Rampas: entrada 3 ms (impacto) ou
   5 ms; saída 15 ms (impacto e ar), 20-40 ms (queda, magia, família), 40 ms (voz).
5. **Normalização por categoria**: impacto, queda, magia e família a pico -1 dBFS; ar e roupa a pico -6 dBFS; voz a RMS
   ativo -16 dBFS com pico <= -1 dBFS.
6. **Folhas**: 40 ms de silêncio antes e depois de cada corte (80 ms entre dois cortes). MP3 CBR mono 44,1 kHz, LAME, cabeçalho
   Xing ("Info") presente; **96 kbps na base**, **64 kbps nas folhas de lutador** (voz + família). Conferido com `ffprobe`.
7. **Medida do MP3, não do WAV**: `picoDb` e `rmsDb` do manifesto saem da folha MP3 decodificada. O florete passava de
   0 dBFS depois do MP3 (agudos a 7-8 kHz de centroide): o script baixa só o corte que passa de -0,3 dBFS e recodifica.
   Atraso do decodificador do ffmpeg medido por correlação cruzada: **0 amostras** nas 11 folhas (o ffmpeg respeita a
   etiqueta de gapless). Outros navegadores podem não respeitar: por isso os 40 ms, e a Vega acha o ataque no buffer.
8. **`ganhoDb`**: o RMS do sintético que o corte substitui menos o RMS do corte (plano §6.3: amostra a ±3 dB do som de hoje).
   Mapa id -> sintético em `REF_SINT` (`spec-pacote-v1.mjs`): soco -> `punch()`, chute/arremesso/queda -> `kick()`, defesa ->
   `block()`, ar -> `swing(0/1)`, guarda/magia.impacto -> `fireballHit()`, lança/famílias -> `fireballLaunch()`, vozes -> a voz
   formante do próprio lutador por categoria.

### Decisões que mudam o que estava escrito (registrar)

| decisão | antes | agora | por quê |
|---|---|---|---|
| camadas **assadas no arquivo** | pesquisa §7.8: "camadas somadas" por código | o soco já é Kenney + toalha num corte só | 1 fonte por golpe (alivia o orçamento de 32 fontes), mixagem determinística e a régua medida no som final |
| identidade da voz | taxa por lutador no código | **taxa no manifesto** (`taxa`, o código aplica); **filtros assados** (BAATAR, NILA, SARPA, voz dobrada do ZENON) | o contrato tem `taxa` por corte e não tem filtro por corte |
| MIN-JI | taxa 1,04 | **1,00** | a Type 1 já é a voz mais aguda medida (f0 mediana 604 Hz); subir mais a deixaria infantil |
| CAIO | 1,00 (plano) / 1,06 (pesquisa) | **1,03** | a voz 2 do HaelDB já é a mais aguda dos homens (428 Hz) |
| BAATAR | 0,88 | **0,86** + passa-baixa 2,5 kHz | é a voz 3 do HaelDB (329 Hz), afastá-la mais do AMINU e do WEI LONG |
| `arremesso` | impacto, 0,12-0,45 s | **até 0,60 s** | é corpo no chão (uma queda curta); a 450 ms o baque era cortado |
| `golpe.ar.leve` | 0,12-0,35 s | **78-106 ms** | os 4 swishes leves do pacote são curtos por natureza; o `swing(0)` de hoje dura 90 ms |
| vozes | 80 kbps (pesquisa) | **64 kbps** (plano e ordem da missão) | peso |
| `charge.wav` (faxcorp) | baixado | **não usado** | 4 s de carga sem ataque útil; E1 saiu do `shieldhit` + `hit` + crepitar |

## 2. Matriz final: evento -> id -> cortes -> fontes

Números: `b150` = % da energia abaixo de 150 Hz no corte final (régua: <= 60%). Fontes completas (pacote, arquivo, URL, licença)
em cada corte do `manifesto.json` (`origem`, `fonte`, `baixadoDe`, `licenca: "CC0"`).

### 2.1 Folha `base` (278.405 B, 23,1 s, 96 kbps): 51 cortes

| evento do jogo | id | cortes | fontes (camada principal + camadas) | b150 | dur. |
|---|---|---|---|---|---|
| `hit` soco leve, `armor` | `imp.soco.leve` | 4 | Kenney `impactPunch_medium_000/001/003/004` + toalha no corpo 13/25/29/33 a -6 dB | 6-10% | 295-364 ms |
| `hit` soco pesado | `imp.soco.forte` | 4 | Kenney `impactPunch_heavy_000/001/003/004` + toalha grossa 5/6/34/39 a -2 dB | 37-54% | 430-450 ms |
| `hit` chute leve, `armor` | `imp.chute.leve` | 4 | toalha 5/26/35/6 + Kenney `impactSoft_medium` / `impactPunch_medium_002` a -8 dB | 4-8% | 356-450 ms |
| `hit` chute pesado | `imp.chute.forte` | 4 | toalha 4/34/39/2 + Kenney `impactPunch_heavy_002/001/003` / `impactWood_heavy_003` a -4 dB | 3-40% | 395-450 ms |
| `block`, `parry` | `defesa` | 4 | StarNinjas papelão `impact.8/4/9/6` | 1% | 274-450 ms |
| `quebra-guarda` | `guarda.quebra` | 3 | Kenney `impactPlank_medium_000/003/004` + rubberduck `bfh1_wood_breaking_03/01/04` a -3 dB | 16-35% | 409-430 ms |
| `throw` | `arremesso` | 3 | toalha no chão 3/7/5 + Kenney `cloth3/1/2` a -12 dB | 5-12% | 380-511 ms |
| `ko` (corpo) | `ko.queda` | 3 | dois baques: toalha no chão 10+7 / 12+9 / 11+6 (o 2º a -5 dB, +150-190 ms) + Kenney `impactPunch_heavy` a -8 dB; `atrasoMs: 150` | 12-16% | 620-666 ms |
| `swing` soco | `golpe.ar.leve` | 4 | artisticdude `swish-10..13` | 0% | 78-106 ms |
| `swing` chute | `golpe.ar.forte` | 4 | artisticdude `swish-3/4/7/9` | 1-2% | 123-152 ms |
| `esquiva` | `esquiva` | 3 | Kenney `cloth2/4/1` + swish 12/13/10 a -4/-6 dB | 3-22% | 340-350 ms |
| `land`, `rebote` | `pouso` | 3 | Kenney RPG `footstep03+05` / `footstep00 + cloth3` / `footstep07+09` | 3-8% | 249-429 ms |
| `jump`, `troca-ficha` | `salto` | 2 | Kenney RPG `footstep08/06` (120 ms) + swish 13/11 | 1% | 124-125 ms |
| `projectile` | `magia.lanca` | 3 | rubberduck `spell_01`, `spell_02`, `spell_fire_06` | 0-4% | 445-700 ms |
| `hit` de projétil, `clash` | `magia.impacto` | 3 | faxcorp `hit` + `spell_fire_07`; `spell_fire_07` + Kenney punch; `spell_fire_05` + Kenney plank | 3-5% | 474-700 ms |

### 2.2 Vozes (folhas `lutador-<id>`, 64 kbps): 95 cortes

| lutador | fonte (f0 mediana medida) | taxa / assado | kiai | leve (+leve2) | pesado (+pesado2) | KO | guarda | esforço | vitória |
|---|---|---|---|---|---|---|---|---|---|
| HAYATO | wolfwoot (334 Hz) — decisão do dono | 1,00 | 3 (`attack2/4`, `attackbig3`) | 2+1 (`hurt3/8`, `hurt6`) | 2+1 (`hurt0/4`, `hurt2`) | `death1` | `hurt9` | — | `victory1` |
| WEI LONG | HaelDB voz 1 (374 Hz) | 0,94 | 2 | 2 (os 2 mais escuros, centroide 446-620 Hz) | 2 | `1yell3` (0,82 s) | 1 | `1yell14` | 1 |
| CAIO | HaelDB voz 2 (428 Hz, a mais aguda) | 1,03 | 2 | 2 | 2 | `2yell10` | 1 | — | 1 |
| AMINU | HaelDB voz 4 `yell*` (368 Hz) | 0,97 | 3 | 2 | 2 | `yell2` | 1 | — | 1 |
| BAATAR | HaelDB voz 3 `3yell*/3grunt*` (329 Hz) | 0,86 + passa-baixa 2,5 kHz | 3 | 2 (`3grunt4/5`) | 2 | `3grunt6` | 1 | `3grunt3` | 1 |
| ZENON | EmoPreben (277 Hz, a mais grave e de peito) | 0,92 + voz dobrada (cópia +0,9 st, passa-baixa 1,2 kHz, -10 dB) | 2 (`Arrrch`, `Arrggh`) | 2 | 2 | `Hurt3` | `hyyrdhh` | — | riso AntumDeluge (`voz.zenon.riso`, 1,9 s) |
| MIN-JI | Cici Fyre Type 1 (604 Hz) | 1,00 | 2 | 1+1 | 1 | AuraVoice gemido 6 a 1,12 | `jump2` | — | `attack2` |
| CENTELLA | Cici Fyre Type 2 (445 Hz) | 1,00 | 2 | 1+1 | 1 | AuraVoice Female Scream 1 a 1,04 | `jump2` | — | `attack3` |
| CAMILLE | Cici Fyre Type 3 (353 Hz) | 1,00 | 2 | 2 | 1 | AuraVoice gemido 7 | `jump3` | — | `attack1` |
| NILA | Cici Fyre Type 3 (a mesma atriz da CAMILLE) | 0,89 (-2 st) + passa-baixa 2,8 kHz | 2 | 2 | 2 (AuraVoice gemidos 3 e 5) | AuraVoice gemido 8 | `jump1` | — | `attack2` |
| NILA / SARPA | Cici Fyre Type 3 `attack3` | 0,95 + passa-alta 300 Hz | `voz.nila.sarpa.kiai` | | | | | | |

Como a voz do HaelDB foi dividida em categorias sem ouvir: dentro de cada voz, os arquivos **mais escuros** (centroide baixo,
muito 150-500 Hz) viraram dano (o "ugh"), os **mais claros e de ataque rápido** (pico até ~250 ms depois do início) viraram
kiai, e os **mais longos** viraram KO e vitória. Truncados no limite da categoria (kiai 600 ms, leve 300, pesado/guarda/esforço
450, KO 1,2 s, vitória 1,0 s) com saída de 40 ms. Na Cici Fyre e no wolfwoot valeu o nome do arquivo (`attack`, `hurt`,
`damaged`, `jump`, `death`, `victory`). O gemido longo da AuraVoice (12,9 s) foi fatiado pelos vales a -36 dB do pico em 8
gemidos.

Regra dos 2 semitons: as únicas fontes repetidas entre lutadores são a Type 3 (CAMILLE 1,00 x NILA 0,89 = 2,0 st, mais o
filtro) e a AuraVoice (KO de MIN-JI 1,12, CAMILLE 1,00 e NILA 0,89, cada um num gemido diferente; CENTELLA usa o grito, outro
arquivo).

### 2.3 Famílias de especial (folhas de lutador): 13 cortes

| família | lutador | cortes | fontes | situação |
|---|---|---|---|---|
| `esp.e1.raio` | HAYATO | 2 | faxcorp `shieldhit` (passa-alta 200 Hz) + crepitar a -3 dB; faxcorp `hit` + crepitar a -8 dB | coberto |
| `esp.e2.dragao` | WEI LONG | 1 | 3 swishes pesados assados a 0,85/0,75/0,72 (o sopro), passa-alta 140 Hz | **parcial**: o bumbo segue sintetizado |
| `esp.e3.lamina` | MIN-JI | 2 | swish leve assado a 1,15 + Kenney `knifeSlice2` / `knifeSlice` (+ sino curto a -14 dB) | coberto |
| `esp.e6.ringue` | CENTELLA | 2 | Kenney `impactBell_heavy_002` (0,59 s) e `_000` (1,29 s) | **parcial**: sino só; a lona é o `arremesso` da base; torcida sintetizada |
| `esp.e7.florete` | CAMILLE | 4 | StarNinjas `sword.6`, `sword.4` (ataques) e `sword_clash.2`, `.5` (choques) | coberto (ataque e choque no mesmo id: o sorteio pode dar choque num lançamento) |
| `esp.e12.selo` | ZENON | 2 | rubberduck `item_stone_01` + `stones_04`; `bfh1_rock_breaking_01` + `item_stone_01` | **parcial**: a pedra; o órgão segue sintetizado |

## 3. Quantos cortes por evento

| evento | ids que tocam amostra | cortes |
|---|---|---|
| `hit` (corpo a corpo) | `imp.soco.*`, `imp.chute.*` + voz leve/pesado do defensor | 16 de impacto + 2-3 leves e 1-3 pesados por lutador |
| `hit` de projétil / `clash` | `magia.impacto` | 3 |
| `block` / `parry` | `defesa` (+ `esp.e7.florete` no PARADE) | 4 (+4) |
| `quebra-guarda` | `guarda.quebra` + `voz.*.guarda` | 3 + 1 por lutador |
| `throw` | `arremesso` + voz pesada | 3 |
| `armor` | `imp.soco.leve`, `imp.chute.leve` + `voz.*.esforco` | 8 + esforço só no WEI LONG e no BAATAR (os únicos com armadura) |
| `ko` | `ko.queda` + `voz.*.ko` (+ gongo sintetizado) | 3 + 1 por lutador |
| `swing` | `golpe.ar.leve` / `.forte` | 4 + 4 |
| `esquiva` | `esquiva` | 3 |
| `land` / `rebote` | `pouso` | 3 |
| `jump` / `troca-ficha` | `salto` (+ família E8/E9: sintetizadas) | 2 |
| `special` | `voz.*.kiai` + `esp.*` | 2-3 kiai por lutador + família (6 de 12 estilos) |
| `projectile` | `magia.lanca` + família | 3 |
| `round` (vitória) | `voz.*.vitoria`, `voz.zenon.riso` | 1 por lutador |
| `carga` (MASHI) | `esp.e5.tambor` | 0: sintetizado |

## 4. Lacunas que ficam sintetizadas

- **Famílias sem nenhum sample**: E4 ginga (berimbau/caxixi, CAIO), E5 tambor (AMINU, inclusive a `carga` do MASHI e o sucesso
  da GARKUWA), E8 chenda (NILA/GAJA), E9 serpente (NILA/SARPA), E10 estepe e E11 águia (BAATAR). Nenhuma fonte CC0 conferida
  serve (pesquisa §5).
- **Partes de família**: o bumbo do E2, a torcida do E6, o órgão do E12, as moedas do dreno do ZENON.
- **Voz**: esforço dos 8 lutadores sem armadura (o evento não toca para eles); vitória da NILA, MIN-JI, CENTELLA e CAMILLE é
  um kiai (`attack*`), não um grito de vitória (a Cici Fyre não tem); nenhuma voz idosa (WEI LONG é "maduro" só pela taxa).
- **De propósito** (identidade de arcade): gongo do KO, jingles de rodada, `perfect`, `deny`, `esquivou`, interface, música.
- O `VIDRO_GUARDA` sintetizado continua por cima de `guarda.quebra` (`VIDRO_SOBRE_GUARDA_PADRAO = true`): decidir no ouvido.

## 5. Volume: o que o `ganhoDb` faz e onde ele bateu no teto

O `ganhoDb` iguala o RMS de cada corte ao do som sintetizado que ele troca. Em quatro ids o sintético de hoje é tão baixo que
o ganho ideal passa do teto de ±18 dB do validador; ficou -18 e o corte toca **mais alto que o som de hoje** (anotado no
campo `nota` de cada corte):

| id | RMS do sintético | ganho ideal | ficou | acima de hoje |
|---|---|---|---|---|
| `golpe.ar.leve` | -48,5 dBFS | -28,2 dB | -18 | +10,2 dB |
| `golpe.ar.forte` | -47,5 dBFS | -31,7 dB | -18 | +13,7 dB |
| `esquiva` | -47,5 dBFS | -23,2 dB | -18 | +5,2 dB |
| `pouso` | -51,6 dBFS | -32,0 dB | -18 | +14,0 dB |

Não baixei o arquivo para caber: o golpe no ar é "o que mais denuncia o sintético" (plano §1) e, igualado a -48 dBFS, o swish
grave do chute (centroide 207-299 Hz) sumiria no alto-falante do iPhone. Se o dono achar alto, a Vega troca só o número no
manifesto (até -18) ou o Apolo regrava a folha com o pico mais baixo; não precisa baixar nada de novo.

Nas vozes, a relação leve x pesado segue a do sintético de cada lutador, com piso de +2 dB (plano §6.3): onde o sintético não
respeitava, o `ganhoDb` do pesado subiu (MIN-JI +4,1 dB, porque o pesado sintético dela é **mais baixo** que o leve; CENTELLA
+0,7; WEI LONG +0,4; ZENON +0,1; anotado em `nota`). Resultado, RMS final médio leve -> pesado: HAYATO -27,3 -> -19,9;
WEI LONG -23,0 -> -21,1; CAIO -23,6 -> -20,3; AMINU -25,2 -> -20,3; BAATAR -24,9 -> -22,1; ZENON -23,3 -> -21,3; MIN-JI
-15,8 -> -13,8; CENTELLA -21,4 -> -19,3; CAMILLE -25,8 -> -19,7; NILA -25,2 -> -20,0 dBFS. O teto "+4 dB" do plano não foi
imposto: HAYATO, CAMILLE e NILA ficam 5-7 dB acima, como já são no sintético de hoje.

## 6. O que SÓ O OUVIDO PROVA

Os números provam que os cortes existem, cabem, passam no validador, não estouram e não são subgrave. Não provam que soam
certo. Na ordem do portão do plano (§7.10): o dono ouve a folha `base` + 2 lutadores no `?escuta=1` do iPhone (alto-falante e
fone) antes de a Vega integrar o resto. Para ouvir sem o jogo: `arte-fonte/sons/pacote-v1/escuta/<id>-<n>.mp3` (159
arquivos, um por corte, com a taxa da voz já aplicada).

1. **"Lê como a coisa certa sem imagem"** (plano §4.3, item 4): soco é soco e não palma; defesa é bloqueio e não acerto;
   guarda quebrando soa como algo cedendo. Suspeitos por medida: `imp.chute.leve` 3 (toalha clara, centroide 1,4 kHz: risco
   de "tapa") e `imp.chute.forte` 4 (centroide 1,6 kHz).
2. **Categoria das vozes do HaelDB**: dividi por centroide e duração, sem ouvir. Um "leve" pode ser um grito de ataque; um
   kiai truncado a 600 ms pode terminar no meio da vogal.
3. **Palavras**: o `victory1` do wolfwoot e os `attack*` da Cici Fyre podem conter sílaba inteligível em inglês. Regra do plano:
   nenhuma palavra inglesa inteligível.
4. **NILA x CAMILLE**: mesma atriz, separadas por -2 st e passa-baixa 2,8 kHz. Se soarem a mesma pessoa, a saída honesta da
   pesquisa §5.1 é a NILA voltar à voz formante sintetizada (rota B).
5. **As 4 vozes do HaelDB soam como pessoas diferentes?** (WEI LONG, CAIO, AMINU, BAATAR). A f0 mediana separa 329-428 Hz, mas
   o timbre só o ouvido diz.
6. **ZENON**: a voz dobrada soa "chefão" ou soa eco? O riso (outra pessoa, AntumDeluge) combina com a voz?
7. **Famílias**: E1 soa elétrico? O sopro do E2 soa dragão ou só vento? O sino do E6 soa ringue? O florete com ataque e
   choque sorteados no mesmo id incomoda no lançamento?
8. **Volume** dos 4 ids com ganho no teto (seção 5) e o equilíbrio voz x impacto.
9. **Atraso da queda do KO**: `atrasoMs: 150` no manifesto, igual ao `ATRASO_QUEDA_KO_MS` do código.
10. **Rip**: reprovar qualquer som que pareça conhecido de outro jogo (pesquisa §8).
11. **Ruído de sala** das toalhas (gravação caseira de 2009): o piso medido nos brutos vai de -40 a -66 dBFS; somado e
    normalizado, pode aparecer no fone.

## 7. Arquivos

- Brutos e origem (fora do git, `arte-fonte/` está no `.gitignore`): `arte-fonte/sons/cc0/<n>-<pacote>/` (arquivo baixado +
  `x-<nome>/` extraído), `ORIGEM-downloads.tsv` (URL, bytes, SHA-256, licença, data), `inventario-medido.tsv`, `CREDITOS.txt`.
- Pacote: `arte-fonte/sons/pacote-v1/` (`base.mp3`, `lutador-*.mp3`, `manifesto.json`, `CREDITOS.txt`,
  `relatorio-medidas.json` com todas as medidas por corte, `escuta/`).
- Em `public/`: só o `public/assets/sons/LEIA-ME.txt` atualizado. A Vega copia `base.mp3`, `lutador-*.mp3`, `manifesto.json` e
  `CREDITOS.txt` para `public/assets/sons/` **depois** da aprovação do dono. `escuta/` e `relatorio-medidas.json` não vão.
- Para refazer o pacote do zero: `node curadoria-scripts/pacote-v1.mjs <cc0> <saida> <sinteticos-f32> <temp>` (os
  sintéticos saem do `render-cc0.test.ts` por vitest).
