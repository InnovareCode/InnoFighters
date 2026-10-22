# Pesquisa: sons de luta em bibliotecas livres (CC0)

Autor: Apolo (direção de arte e som), 2026-10-22. Missão `cmvji7qh401mi01p7v4kp1010`.
**Status: pesquisa. Nenhum áudio baixado, ouvido, gerado ou commitado.** Quem autoriza o download: o dono. Quem cura: Apolo.
Quem integra: Vega (folhas + manifesto, como no `docs/plano-sons-realistas.md`). Quem valida: Íris. O ouvido final: o dono, no iPhone.

Contexto: a Runway gratuita bloqueou a geração (ficaram só os 6 áudios de teste em `arte-fonte/sons/lote0` e `lote1`) e o
dono escolheu **bibliotecas gratuitas livres (CC0 / domínio público)** para os sons realistas da luta. Este documento troca
a ORIGEM dos samples; a arquitetura do plano (3 camadas, folhas MP3 com manifesto, síntese como fallback, gongo e jingles
sintetizados) continua valendo.

---

## 0. Resumo em 8 linhas

1. **Recomendação: 19 itens (22 arquivos), 34,7 MB brutos, todos CC0**, de 2 fontes que não exigem login: **Kenney.nl** (2 pacotes) e
   **OpenGameArt.org** (17 itens). Cobrem todo o foley (camada A) e as vozes dos 10 lutadores (camada B).
2. Foley: Kenney `impactPunch` (10 socos, leve e pesado), toalha molhada no corpo e no chão (o truque clássico de foley de
   soco), 13 *swishes* para os golpes no ar, blocos acolchoados para a defesa, quedas e madeira quebrando para a guarda.
3. Vozes: **6 timbres masculinos** (1 pacote completo de aventureiro + 4 vozes gravadas em Neumann + 1 de dor) e **3 timbres
   femininos** (atriz de voz com 3 registros: fofo, médio, maduro) + gemidos e grito de outra atriz. Riso do ZENON: CC0.
4. Especiais (camada C): **cobertura parcial**. Raio (E1), lâmina (E3), florete (E7), sino do ringue (E6), fogo, explosão e
   energia têm material; **tambores (E5, E8), serpente (E9), rabeca e vento da estepe (E10), águia (E11) e órgão (E12) não
   têm sample CC0 bom**: ficam na síntese de hoje (o fallback do plano).
5. Lacunas de voz: **nenhuma voz idosa** e **nenhuma voz masculina claramente jovem** em CC0 confiável. Saem por taxa e filtro.
6. Pacote final estimado: **0,6 a 0,9 MB** em MP3 CBR mono 44,1 kHz (alvo <= 1,2 MB), ~85 cortes.
7. Descartados: Freesound (exige login para baixar), Sonniss GDC (não é CC0, proíbe redistribuir o som como som e cada
   pacote tem centenas de MB), packs do itch.io com etiqueta CC0 mas texto que **proíbe "incorporating"** (conflito de licença).
8. **Nada foi ouvido.** Qualidade aqui é *esperada* (descrição, formato, origem); o veredito sai da curadoria medida + ouvido do dono.

---

## 1. Método e limites (o que foi provado e o que não foi)

- As ferramentas WebSearch/WebFetch falharam nesta sessão (erro de modelo). A pesquisa foi feita lendo o **HTML** das páginas
  (Kenney, OpenGameArt, itch.io, Creative Commons, Freesound) e a página de licença da Sonniss pelo **Wayback Machine** (o site
  devolve 403 a robôs).
- **Conteúdo dos ZIPs listado sem baixar áudio**: um script pediu ao servidor só o *diretório central* do ZIP (requisições
  HTTP `Range` nos últimos bytes, que são metadados: nome e tamanho de cada arquivo). Zero byte de áudio foi transferido.
  Os `.7z` não permitem isso: deles só se sabe o tamanho total e a descrição.
- Tamanhos em bytes vêm de `HEAD` (Content-Length) no dia 2026-10-22.
- **Licença**: copiada da página de cada item. A cláusula CC0 está na seção 2. Uma licença pode mudar depois: por isso o
  LEIA-ME (seção 9) guarda a URL e a data da conferência.
- **Qualidade NÃO medida**: nenhum arquivo foi ouvido nem passou pelo `lote0.mjs`. Onde escrevo "esperada", é inferência.

---

## 2. A licença: o que a CC0 permite (e o único cuidado)

**CC0 1.0, texto legal** (https://creativecommons.org/publicdomain/zero/1.0/legalcode.en), seção 2, Waiver:

> "To the greatest extent permitted by, but not in contravention of, applicable law, Affirmer hereby overtly, fully,
> permanently, irrevocably and unconditionally waives, abandons, and surrenders all of Affirmer's Copyright and Related
> Rights and associated claims and causes of action, whether now known or unknown (including existing as well as future
> claims and causes of action), in the Work (i) in all territories worldwide, (ii) for the maximum duration provided by
> applicable law or treaty (including future time extensions), (iii) in any current or future medium and for any number of
> copies, and (iv) for any purpose whatsoever, including without limitation commercial, advertising or promotional purposes
> (the "Waiver")."

**Resumo oficial** (https://creativecommons.org/publicdomain/zero/1.0/):

> "You can copy, modify, distribute and perform the work, even for commercial purposes, all without asking permission."

Conferência das 3 perguntas, valendo para todo item CC0 desta pesquisa:

| Pergunta | Resposta | De onde |
|---|---|---|
| Uso comercial? | **Sim** | "(iv) for any purpose whatsoever, including without limitation commercial" |
| Redistribuir dentro de um jogo web público (MP3 servido a qualquer um)? | **Sim**, em qualquer número de cópias e meio | "(iii) in any current or future medium and for any number of copies"; "copy, modify, distribute" |
| Atribuição obrigatória? | **Não** | a renúncia é total; o resumo diz "without asking permission". Créditos ficam por transparência (seção 9) |

**O único cuidado, que vale para VOZ** (mesma página, "Other Information"):

> "publicity or privacy — The use of a work free of known copyright restrictions may be otherwise regulated or limited. The
> work or its use may be subject to personal data protection laws, publicity, image, or privacy rights that allow a person to
> control how their voice, image or likeness is used, or other restrictions or limitations under applicable law."

Ou seja: a CC0 libera o direito autoral da gravação, não o direito da pessoa sobre a própria voz. Mitigação adotada: só
vozes **publicadas pela própria pessoa** ou por quem as gravou declarando o propósito; só **vocalizações não lexicais**
(grito, gemido, esforço), sempre **transformadas** (taxa e filtro por lutador), nunca associadas ao nome do intérprete como
"a voz do personagem". Nenhuma voz desta lista é de pessoa pública.

**Kenney** (https://kenney.nl/support), além do selo "License: Creative Commons CC0" em cada página de pacote:

> "Can I use the game assets in a (commercial) project? Yes, all game assets on the asset pages are public domain licensed
> (CC0). You're free to use them, even in commercial projects."
> "Is attribution required when using the game assets? Attribution is not required, but if you choose to give credit you can
> do so by mentioning "Kenney". Do not use our logo, as it is reserved for official projects by our studio."

**OpenGameArt**: cada página tem o campo "License(s)". Onde o item tem várias licenças (ex.: "OGA-BY 3.0 CC0"), o autor
oferece todas e **nós escolhemos a CC0**; isso fica registrado no LEIA-ME.

---

## 3. Ranking dos candidatos

Legenda de cobertura: **S** soco, **C** chute, **D** defesa, **G** quebra de guarda, **A** arremesso, **K** queda do KO,
**W** golpe no ar/esquiva, **M** magia (lançar/impacto), **E#** família de especial, **V** voz.
Risco de "rip" (som de jogo comercial disfarçado de CC0): avaliado pela origem declarada. **Nenhum item recomendado tem cara
de rip**: todos descrevem como foram gravados (microfone, objeto, ator) e por quem.

| # | Pacote (autor) | URL | Licença (texto da página) | Download | Formato / qtd | Cobre | Qualidade esperada | Riscos |
|---|---|---|---|---|---|---|---|---|
| 1 | **Impact Sounds** (Kenney) | https://kenney.nl/assets/impact-sounds | "License: Creative Commons CC0" + FAQ acima | 800.850 B (0,76 MB) | OGG, 130 + License.txt | S, D, G, A, K, E6 (sino) | boa e limpa, curta, "de jogo"; 5 socos médios + 5 pesados | baixo. Pode soar "polido demais" sozinho: somar a toalha |
| 2 | **40 wet towel club/pound/hit/attack** (qubodup) | https://opengameart.org/content/40-wet-towel-clubpoundhitattack-sounds | "License(s): CC0". Página: "Available under cc0. Ignore the txt info file in the 7z that says otherwise." | 3.410.439 B | 7z, 40 (WAV, conteúdo não listável) | S, C (corpo) | realista: toalha molhada nas costas de uma pessoa, a técnica de foley de soco de cinema; gravação caseira de 2009 (pode ter ruído de sala) | **o .txt dentro do 7z diz outra licença**; vale a declaração do autor na página (registrar no LEIA-ME) |
| 3 | **Swishes Sound Pack** (artisticdude) | https://opengameart.org/content/swishes-sound-pack | "License(s): CC0" | 385.150 B | WAV, 13 (4 leves, 9 pesados) | W (golpe leve/forte, esquiva), E3 | boa; feito para um RPG livre | baixo. Lixo de Mac (`__MACOSX`, `.DS_Store`) no zip: ignorar |
| 4 | **RPG Male Adventurer** (wolfwoot) | https://opengameart.org/content/voice-clip-pack-male-adventurer-rpg | "License(s): CC0". "Feel free to use for whatever type of project." | 3.717.331 B | WAV, 37: attack0-8, attackbig0-5, hurt0-9, death0-1, victory0-1, jump0-1, +falas | V: kiai, leve, pesado, KO, vitória, esforço (1 homem) | o pacote mais completo para luta: tem TODAS as categorias do mapa de corte | médio-baixo: não diz quem é o intérprete. Falas `yes/no/greet` não usar |
| 5 | **Male Grunt/Yelling sounds** (HaelDB) | https://opengameart.org/content/male-gruntyelling-sounds | "License(s): OGA-BY 3.0 CC0" (escolhemos CC0) | 9.715.828 B | WAV, 62 em 4 vozes (`1yell`, `2yell`, `3grunt`/`3yell`, `yell`) | V: kiai, dano, KO (4 homens) | alta: "Recorded on a Neuman Mic avalon 2022 preamp"; 4 timbres = 4 lutadores | médio: o autor gravou 4 pessoas; o consentimento delas é declarado só implicitamente. Mitigar com transformação |
| 6 | **Female RPG Voice Starter Pack** (cicifyre / Cici Fyre) | https://opengameart.org/content/female-rpg-voice-starter-pack (também em https://cicifyre.itch.io/rpg-voice-starter-pack) | OGA: "License(s): CC0"; itch: "Asset license: Creative Commons Zero v1.0 Universal". "Credit appreciated, but not required." | 8.794.794 B | WAV, 90 em 3 vozes (Type 1 fofa, Type 2 média, Type 3 madura) | V: kiai (`attack1-3`), dano (`damaged1-3`), esforço (`jump1-3`) x 3 mulheres; feitiços falados (não usar) | boa; atriz de voz gravando a si mesma | baixo (a própria atriz publicou). **Não tem KO/morte**: KO feminino sai do item 7 |
| 7 | **Female Hurt Grunts & Groans** + **Female Scream 1** (AuraVoice / Nocturnal_Vanguard) | https://opengameart.org/content/female-hurt-grunts-groans e https://opengameart.org/content/female-scream-1 | "License(s): CC0". "Whatever SFX I post here, use however you like! No credit required." | 188.830 B + 33.339 B | OGG, 1 faixa com vários gemidos + 1 grito | V: dano pesado e KO femininos | boa; atriz de voz profissional, gravações de projetos dela | baixo (a própria atriz publicou). A faixa longa precisa ser fatiada |
| 8 | **75 CC0 breaking / falling / hit sfx** (rubberduck) | https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx | "License(s): CC0" | 1.624.406 B | OGG, 75 (`bfh1_hit_01-13`, `falling_01-07`, `wood_breaking_01-04`, `glass_*`, `rock_*`) | G (madeira/vidro quebrando), A, K (queda) | média-boa; gravações do próprio autor | baixo |
| 9 | **12 wet towel hitting/falling/punching floor** (qubodup) | https://opengameart.org/content/12-wet-towel-hittingfallingpunching-floor-sounds | "License(s): CC0". "Also available under CC0 as of 2024-08-24. Ignore the txt file in the 7z that says otherwise." | 1.206.466 B | 7z, 12 | A, K (corpo no chão) | realista (mesma técnica do item 2), chão de pedra | igual ao item 2 (txt interno desatualizado) |
| 10 | **Electricity Game Sound Pack** (faxcorp) | https://opengameart.org/content/electricity-game-sound-pack | "License(s): CC0" | 4 arquivos avulsos, 1.344.462 B | WAV: `hit`, `charge`, `shieldhit`, `crackleelectricityloop` | E1 (raio), M (energia), D de especial | boa; feito para um jogo do autor | baixo. Baixar só os 4, não o pacote todo |
| 11 | **80 CC0 RPG SFX** (rubberduck) | https://opengameart.org/content/80-cc0-rpg-sfx | "License(s): CC0" | 1.845.114 B | OGG, 80 (`spell_01-02`, `spell_fire_01-02`, `blade_01-03`, `item_stone_*`, ...) | M (feitiço, fogo), E3, E7, E12 (pedra) | média | baixo |
| 12 | **20 Sword Sound Effects** (StarNinjas) | https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes | "License(s): CC0" | 149.512 B + 144.575 B (2 zips) | OGG, 10 ataques + 10 choques | E7 (florete), parry | média; "moving two knives against each other" = lâmina fina, bom para florete | baixo |
| 13 | **10 Impact/Shield Blocks** (StarNinjas) | https://opengameart.org/content/10-impactshield-blocks | "License(s): CC0" | 128.502 B | OGG, 10 | D (defesa acolchoada) | média; "made by hiting a piece of cardboard" (abafado, sem estalo de pele: é o que a defesa pede) | baixo |
| 14 | **RPG Audio** (Kenney) | https://kenney.nl/assets/rpg-audio | "License: Creative Commons CC0" | 964.837 B | OGG, ~52 (`cloth1-4`, `clothBelt`, `creak1-3`, `knifeSlice`, `drawKnife`...) | W (roupa na esquiva), A/K (roupa), E7 | boa | baixo |
| 15 | **Playersounds 1** + **Pain sounds** (EmoPreben) | https://opengameart.org/content/playersounds-1-by-emopreben e https://opengameart.org/content/pain-sounds-by-emopreben | "License(s): CC0". "heres some more public domain painsounds I've recorded for you to use for whatever" | 191.467 B (ogg) + 73.117 B | OGG, 4 hurt + 2 jump; 6 gemidos | V: dano (6º homem), esforço | média; o próprio autor gravando a si mesmo | baixo |
| 16 | **Evil Laugh** (AntumDeluge) | https://opengameart.org/content/evil-laugh | "License(s): CC0". "Licensing: Creative Commons Zero (CC0)" | 28.146 B | OGG mono 44,1 kHz, 1 | V: riso de vitória do ZENON | média ("Me... laughing evil-like") | baixo |
| — | *reserva* **Sci-fi Sounds** (Kenney) | https://kenney.nl/assets/sci-fi-sounds | CC0 | 5.875.104 B | OGG, 76 (`explosionCrunch`, `lowFrequency_explosion`, `forceField`, `laserLarge`) | M, E12 | boa, mas sintética/eletrônica | ficaria "de ficção científica"; só se o M do item 10/11 reprovar |
| — | *reserva* **100 CC0 SFX** / **#2** (rubberduck) | https://opengameart.org/content/100-cc0-sfx e https://opengameart.org/content/100-cc0-sfx-2 | CC0 | 2.921.904 B / 2.367.871 B | OGG; `bell_01-03`, `gong_01-02`, `slam_01-07`, `thunder_01`, `air_01-03` | E6 (sino), E1 (trovão), E10 (ar) | baixa-média: "recorded with an android device" | só para lacunas pontuais |
| — | *reserva* **Punch** / **Impact** (qubodup) | https://opengameart.org/content/punch e https://opengameart.org/content/impact | CC0 | 200.895 B / 130.980 B | 7z | S | média | redundante com 1 e 2 |
| — | *reserva* **37 hits/punches** (Independent.nu) | https://opengameart.org/content/37-hitspunches | CC0 | 1.684.480 B | 7z, 37 | S, C | desconhecida | a descrição da página é de outro pacote ("Game menus, in-game terminals"): sinal de cópia descuidada; conteúdo não listável |
| — | *reserva* **grunts of male death and pain** (thebardofblasphemy) | https://opengameart.org/content/grunts-male-death-and-pain | CC0. "You have my blessing to do whatever you want with this sound file." | 4.380.108 B | 1 WAV longo | V: KO masculino | amadora | só se faltar KO grave |
| — | *reserva* **Sinister Laugh** (WeaponGuy), **Man hurt sounds** (Aharabada), **15 vocal male strain** (qubodup) | /content/sinister-laugh, /content/man-hurt-sounds, /content/15-vocal-male-strainhurtpainjump-sounds | CC0 (o do qubodup: "Available under CC0 starting 2024-08-30") | 63.724 / 111.701 / 1.444.637 B | OGG/7z | V | amadora | timbres extras se um lutador ficar sem voz distinta |
| — | *reserva* **Voiceover Pack: Fighter** (Kenney) | https://kenney.nl/assets/voiceover-pack-fighter | CC0 | 1.265.449 B | OGG, 46 falas de locutor (`fight`, `round_1-5`, `final_round`, `flawless_victory`, `you_win`) | locutor (fora do escopo) | boa | só se o dono quiser locutor; hoje rodada e vitória são jingles sintetizados de propósito |

---

## 4. Descartados (e por quê)

| Fonte | Motivo |
|---|---|
| **Freesound** (freesound.org) | A FAQ diz: "To download a sound, first make sure you are logged into your registered account." Viola a regra "sem login obrigatório". Além disso mistura CC0, CC-BY e licenças antigas no mesmo acervo. Vários itens do OpenGameArt acima são cópias de sons do Freesound feitas **pelos próprios autores** (ex.: qubodup), então não perdemos o melhor material |
| **Sonniss GDC Bundle** | Não é CC0. Licença (Wayback de https://sonniss.com/gdc-bundle-license/): "Licensee may use and modify the licensed sound effects for personal and commercial projects without attribution", mas "Licensee may not distribute, publish, sub-license or otherwise supply the sound effects as sound effects to any other person [...] Re-designed and manipulated sounds remain licensed material". Uso no jogo seria permitido; porém cada pacote anual tem dezenas de GB (fora do teto de 40 MB) e qualquer cópia dos brutos fora do time vira violação. Fica como opção futura de alta qualidade, não agora |
| **Warrior / Mage / Orc Voice Pack** (johncarroll, itch.io) | Etiqueta "Asset license: Creative Commons Zero v1.0 Universal", mas o texto diz "You can use this for personal or commercial projects without giving credit, **however reselling or incorporating is prohibited**". "Incorporating" contradiz a CC0 e pode ler-se como proibir incorporar a um produto. **Conflito de licença = descartar**, a não ser que o autor confirme por escrito. É pena: são 110+ gravações com ataques leves/pesados, defesa e morte (18 MB) |
| **Free Catgirl Fighting Voice Pack** (cicifyre, itch.io) | CC0 limpo, mas o conteúdo é "jumping sounds, meows, and swings": miado de anime não serve a nenhum lutador. A mesma atriz já está no item 6 |
| **Free Voice Clips Pack (Bright/Mature Female)** (cicifyre) | CC0, mas são falas de visual novel ("hi, bye", "how are you"), 10-15 MB. Pouco grito |
| **Steampunk Fantasy Voices** (xathien, OGA) | CC0, mas "various cheesy caricatures" e 16,9 MB: tom cômico |
| **Kronbits 200 Free SFX**, **512 Sound Effects (8-bit)**, packs "retro" | CC0, mas estética 8-bit: o oposto do pedido (realismo) |
| **Pixabay, Mixkit** | Não são CC0 (licenças próprias com restrição de redistribuição "standalone"; a do Pixabay não abriu: 403). Pixabay tem histórico de uploads de terceiros com origem duvidosa (risco de rip). Não conferido a fundo porque a regra do dono é CC0 |
| **BBC Sound Effects, Zapsplat (grátis), SoundBible** | Não conferidos nesta sessão; conhecidos por exigir atribuição, login ou uso não comercial. Fora da regra CC0 |

---

## 5. Cobertura por evento do jogo

Eventos e ids do `docs/plano-sons-realistas.md` §1 e §2.4 (lidos em `src/audio/eventos.ts`). Arquivos citados = candidatos
para a curadoria escolher; o número entre parênteses é o item da seção 3. "Runway" = os 3 sfx do Lote 1 que já temos e ainda
não foram medidos: entram na mesma comparação, e vence a medida + o ouvido.

| id do sample | Evento | Fontes CC0 candidatas | Status |
|---|---|---|---|
| `imp.soco.leve` | `hit`/`armor` punch leve | (1) `impactPunch_medium_000-004` + (2) toalha curta | **coberto** (o da Runway reprovou: subgrave) |
| `imp.soco.forte` | `hit` punch pesado | (1) `impactPunch_heavy_000-004` + (2) toalha pesada | **coberto**; comparar com Runway `imp-soco-forte-v1` |
| `imp.chute.leve` | `hit`/`armor` kick leve | (2) toalha (golpe largo) + (1) `impactSoft_medium` | **coberto**; comparar com Runway `imp-chute-leve-v1` |
| `imp.chute.forte` | `hit` kick pesado | (2) toalha pesada + (1) `impactPunch_heavy` a taxa 0,9 | **coberto** |
| `defesa` | `block`, `parry` | (13) `impact.1-10` (papelão) + (1) `impactSoft_heavy` + (14) `cloth` | **coberto**; comparar com Runway `defesa-v1` |
| `guarda.quebra` | `quebra-guarda` | (1) `impactPlank_medium`/`impactWood_heavy` + (8) `bfh1_wood_breaking_01-04`; vidro: (1) `impactGlass_heavy` ou o `VIDRO_GUARDA` sintetizado | **coberto** |
| `arremesso` | `throw` | (9) toalha no chão + (8) `bfh1_falling_*` + (14) `cloth` | **coberto** |
| `ko.queda` | `ko` (corpo) | (9) + (8) `bfh1_falling_01-07` + (14) `clothBelt`; gongo segue sintetizado | **coberto** |
| `golpe.ar.leve` / `.forte` | `swing` | (3) 4 leves / 9 pesados | **coberto** |
| `esquiva` | `esquiva` | (3) swish leve + (14) `cloth1-4` + (1) `footstep_wood` | **coberto** |
| `pouso` / `salto` | `land`, `jump`, `rebote` | (1) `footstep_wood_000-004` + (14) `cloth` | **coberto** (era opcional) |
| `magia.lanca` | `projectile` | (11) `spell_01-02` + (10) `charge` (ataque) | **coberto** (qualidade média) |
| `magia.impacto` | `hit` com projétil, `clash` | (10) `hit` + (11) `spell_fire_01-02`; reserva: Kenney `explosionCrunch` | **coberto** |
| `esp.e1.raio` (HAYATO) | especial E1 | (10) `crackleelectricityloop` + `hit`; reserva `thunder_01` | **coberto** |
| `esp.e2.dragao` (WEI LONG) | E2 | sopro: (3) swish pesado a taxa 0,7; bumbo: nenhum | **parcial**: o bumbo fica sintetizado |
| `esp.e3.lamina` (MIN-JI) | E3 | (3) swish leve a taxa 1,15 + (1) `impactBell_heavy` curto | **coberto** |
| `esp.e4.ginga` (CAIO) | E4 | nenhum berimbau/caxixi CC0 confiável | **lacuna**: síntese |
| `esp.e5.tambor` (AMINU) | E5, `carga` | nenhum tambor falante CC0 | **lacuna**: síntese |
| `esp.e6.ringue` (CENTELLA) | E6 | sino: (1) `impactBell_heavy_000-004`; lona: (9); torcida: nenhuma boa | **parcial** |
| `esp.e7.florete` (CAMILLE) | E7, `parry` ok | (12) ataques + choques; (11) `blade_01-03`; (14) `knifeSlice` | **coberto** |
| `esp.e8.chenda` (NILA/GAJA) | E8 | nenhum | **lacuna**: síntese |
| `esp.e9.serpente` (NILA/SARPA) | E9 | nenhum chiado de cobra CC0 bom | **lacuna**: síntese (ruído filtrado já faz bem) |
| `esp.e10.estepe` (BAATAR) | E10 | vento: reserva `sfx100v2_air_01`; rabeca: nenhum | **lacuna**: síntese |
| `esp.e11.aguia` (BAATAR) | E11 | nenhum | **lacuna**: síntese |
| `esp.e12.selo` (ZENON) | E12 | pedra: (11) `item_stone_*`, (8) `bfh1_rock_*`; órgão: nenhum | **parcial** |
| `voz.*` kiai | `special`, vitória | (4) `attack*`/`attackbig*`; (5) `*yell*`; (6) `attack1-3` | **coberto** |
| `voz.*` dano leve/pesado | `hit`/`throw` do defensor | (4) `hurt0-9`; (5) `3grunt*`; (6) `damaged1-3`; (7); (15) | **coberto** |
| `voz.*` KO | `ko` | (4) `death0-1`; (5) yells longos; (7) gemido longo + grito | **coberto** |
| `voz2.*` guarda/esforço | `quebra-guarda`, `armor` | (4) `jump*`, (6) `jump1-3`, (15) `Jump1-2` | **coberto** |
| vitória | fim da luta | (4) `victory0-1` (homem), (6) `healed*` só se não for palavra; ZENON: (16) riso | **parcial** para mulheres (usar kiai) |

### 5.1 Vozes por lutador (proposta, a confirmar no ouvido)

Regra do plano mantida: dois lutadores com a mesma fonte ficam a **>= 2 semitons** de taxa um do outro, e cada um ganha um
filtro de assinatura. As vozes do HaelDB serão distribuídas pelo timbre real (grave/médio), que só se sabe ouvindo.

| Lutador | Fonte | Taxa base | Observação |
|---|---|---|---|
| HAYATO | (4) wolfwoot | 1,00 | o pacote mais completo vai para o protagonista. O "Chad" da Runway, aprovado, fica como alternativa **se** a licença da Runway for confirmada |
| WEI LONG | (5) HaelDB, voz mais grave e soprosa | 0,94 | maduro |
| CAIO | (5) HaelDB, voz mais aberta | 1,06 | "jovem" sai da taxa; não há voz jovem masculina CC0 boa |
| AMINU | (5) HaelDB, voz de peito | 0,97 | |
| BAATAR | (5) HaelDB restante, ou (4) a 0,84 + passa-baixa 2,5 kHz | 0,84-0,88 | muito grave; se dividir com HAYATO, a distância é de 3 st |
| ZENON | (15) EmoPreben + (4) `death` a 0,90; riso (16) | 0,92 + cópia "dobrada" do plano | o riso de vitória é o (16) |
| MIN-JI | (6) Type 1 (fofa) | 1,04 | |
| CENTELLA | (6) Type 2 (média) | 1,00 | KO: (7) a 1,04 |
| CAMILLE | (6) Type 3 (madura) | 1,00 | KO: (7) |
| NILA | (6) Type 3 a 0,89 (2 st abaixo de CAMILLE) + (7) gemidos | 0,89; SARPA 0,95 + passa-alta 300 Hz | divide fonte com CAMILLE: a taxa e o filtro separam |

**Lacuna declarada:** só 3 atrizes/registros femininos para 4 lutadoras e nenhuma voz idosa. Se no ouvido NILA e CAMILLE
soarem a mesma pessoa, a saída honesta é NILA manter a voz formante sintetizada atual somada a -9 dB (rota B do plano).

---

## 6. Recomendação: combinação mínima (19 itens, 22 arquivos, 34,7 MB)

Critério: o menor número de fontes que cobre **toda a camada A e toda a camada B**, com 2 a 5 variações por som (para o 5º soco
seguido não repetir), sem item com licença ambígua ou login.

### 6.1 Lista exata para o dono autorizar

Destino sugerido: `C:\Projetos\Web\InnoGames\InnoFighters\arte-fonte\sons\cc0\<n>-<pacote>\` (uma pasta nova e vazia por
pacote; `arte-fonte/` já está no `.gitignore`, então os brutos **nunca** entram no git).

| n | Pacote | URL do arquivo (download direto, sem login) | Bytes |
|---|---|---|---|
| 1 | Kenney Impact Sounds | https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip | 800.850 |
| 2 | Kenney RPG Audio | https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip | 964.837 |
| 3 | qubodup, wet towel on body | https://opengameart.org/sites/default/files/wet_towel_on_body.7z | 3.410.439 |
| 4 | qubodup, wet towel on floor | https://opengameart.org/sites/default/files/wet_towel_on_floor.7z | 1.206.466 |
| 5 | artisticdude, Swishes | https://opengameart.org/sites/default/files/swishes.zip | 385.150 |
| 6 | StarNinjas, Impact/Shield Blocks | https://opengameart.org/sites/default/files/impact_-_starninjas.zip | 128.502 |
| 7 | StarNinjas, Sword attacks | https://opengameart.org/sites/default/files/sword_-_starninjas_1.zip | 149.512 |
| 8 | StarNinjas, Sword clashes | https://opengameart.org/sites/default/files/sword_clash_-_starninjas_0.zip | 144.575 |
| 9 | rubberduck, 75 breaking/falling/hit | https://opengameart.org/sites/default/files/sfx_breaking_and_falling.zip | 1.624.406 |
| 10 | rubberduck, 80 RPG SFX | https://opengameart.org/sites/default/files/80-CC0-RPG-SFX_0.zip | 1.845.114 |
| 11 | faxcorp, electricity `hit.wav` | https://opengameart.org/sites/default/files/hit.wav | 389.140 |
| 12 | faxcorp, electricity `charge.wav` | https://opengameart.org/sites/default/files/charge.wav | 729.164 |
| 13 | faxcorp, electricity `shieldhit.wav` | https://opengameart.org/sites/default/files/shieldhit.wav | 137.858 |
| 14 | faxcorp, electricity `crackleelectricityloop.wav` | https://opengameart.org/sites/default/files/crackleelectricityloop.wav | 88.300 |
| 15 | wolfwoot, RPG Male Adventurer | https://opengameart.org/sites/default/files/RPG%20Male%20Adventurer.zip | 3.717.331 |
| 16 | HaelDB, Male Grunt/Yelling | https://opengameart.org/sites/default/files/yelling%20sounds.zip | 9.715.828 |
| 17 | cicifyre, Female RPG Voice Starter Pack | https://opengameart.org/sites/default/files/RPG%20Voice%20Starter%20Pack.zip | 8.794.794 |
| 18 | AuraVoice, Female Hurt Grunts & Groans + Female Scream 1 | https://opengameart.org/sites/default/files/female_hurt_grunts_groans_1.ogg e https://opengameart.org/sites/default/files/female_scream_1.ogg | 188.830 + 33.339 |
| 19 | EmoPreben (Playersounds ogg + Pain sounds) e AntumDeluge (Evil Laugh) | https://opengameart.org/sites/default/files/Playersounds%20-%20ogg.zip, https://opengameart.org/sites/default/files/painsounds.zip, https://opengameart.org/sites/default/files/laugh-evil-1_0.ogg | 191.467 + 73.117 + 28.146 |
| | **Total** | 22 arquivos em 19 itens | **34.747.165 B (34,7 MB)** |

Folga até 40 MB: 5,2 MB. Se uma categoria reprovar na curadoria, a reserva da seção 3 cobre: Kenney Sci-fi (5,9 MB) para
magia, `100 CC0 SFX` (2,9 MB) para sino/trovão, `death pain grunts` (4,4 MB) para KO grave. Cada uma é um pedido novo ao dono.

### 6.2 O que se aproveita de cada pacote (o resto é descartado na curadoria)

- **1 Kenney Impact**: `impactPunch_medium_000-004`, `impactPunch_heavy_000-004`, `impactSoft_medium/heavy_000-004`,
  `impactPlank_medium_*`, `impactWood_heavy_*`, `impactGlass_heavy_*`, `impactBell_heavy_*`, `footstep_wood_*`.
- **2 Kenney RPG**: `cloth1-4`, `clothBelt`, `clothBelt2`, `knifeSlice`, `knifeSlice2`, `drawKnife1-3`.
- **3/4 toalhas**: escolher 6 a 8 de 40 (corpo) e 3 a 4 de 12 (chão) no ouvido.
- **5 Swishes**: todos os 13 (4 leves, 9 pesados).
- **6 StarNinjas blocks**: 3 a 5 de 10. **7/8 espadas**: 2 ataques + 3 choques.
- **9 rubberduck 75**: `bfh1_hit_*`, `bfh1_falling_*`, `bfh1_wood_breaking_*`, `bfh1_glass_breaking_*`.
- **10 rubberduck 80**: `spell_01-02`, `spell_fire_01-02`, `blade_01-03`, `item_stone_01-04`.
- **11-14 faxcorp**: os 4 avulsos.
- **15 wolfwoot**: `attack0-8`, `attackbig0-5`, `hurt0-9`, `death0-1`, `victory0-1`, `jump0-1` (não usar `yes/no/greet/gameover`: são palavras).
- **16 HaelDB**: os 62, separados nas 4 vozes pelo prefixo.
- **17 cicifyre**: por voz, `attack1-3`, `damaged1-3`, `jump1-3` (não usar feitiços falados: são palavras em inglês).
- **18-19**: todos.

---

## 7. Plano de curadoria

Mesma ferramenta do Lote 0 (`arte-fonte/sons/curadoria-scripts/`: `lote0.mjs` corta, normaliza e mede; `ffmpeg 8.1` já está
instalado). O `tar` do Windows 10 (bsdtar 3.5.2 / libarchive) deve abrir os `.7z`; se não abrir, 7-Zip.

1. **Desembrulhar com segurança**: cada pacote na sua pasta nova e vazia; scripts ficam em `curadoria-scripts/` e recebem o
   caminho como argumento (nunca rodar nada de dentro da pasta baixada). Apagar `__MACOSX` e `.DS_Store`.
2. **Inventário medido** (`explorar.mjs`): por arquivo, duração, taxa, canais, pico dBFS, RMS, e a energia por banda
   (< 150 Hz, 150-500 Hz, 500 Hz-4 kHz, > 4 kHz). **Régua do iPhone**: reprovar todo impacto com mais de 60% da energia abaixo
   de 150 Hz (foi o que matou o soco leve da Runway).
3. **Escolha**: 2 a 5 por id, por medida + ouvido; os 3 sfx da Runway (`soco forte`, `chute leve`, `defesa`) entram na mesma
   tabela e competem de igual para igual. Licença e origem do vencedor vão para o manifesto.
4. **Corte**: início seco = 10% do pico - 25 ms (regra validada no Lote 0); fim no ponto em que o envelope cai a -50 dB do pico,
   com fade-out de 15 ms (impacto) ou 40 ms (voz). Limites: impacto <= 450 ms, ar <= 350 ms, queda <= 1,2 s, voz <= 900 ms
   (KO <= 1,6 s). Fatiar as faixas com vários sons (AuraVoice, HaelDB) pelos vales do envelope (`segs.mjs`).
5. **Mono e limpeza**: soma L+R só depois de conferir fase (se a soma perder > 3 dB, usar só o canal mais forte); passa-alta
   80 Hz (tira ronco de sala e o subgrave inútil no iPhone); redução de ruído só se o fundo passar de -55 dBFS.
6. **Normalização por categoria** (todo o mix já se apoia no ganho por evento do `AudioSys`, então a folha entra nivelada):
   impactos a pico -1 dBFS; ar e roupa a pico -6 dBFS; vozes a RMS -16 dBFS com pico <= -1 dBFS. `rmsDb`/`picoDb` no manifesto
   (como no plano) para a Íris testar volume no Node.
7. **Codificação**: MP3 CBR mono 44,1 kHz, 96 kbps (impactos, ar, magia) e 80 kbps (vozes), 40 ms de silêncio em volta de cada
   corte (o atraso do MP3 varia por navegador). Folhas: `base` (foley + magia, ~45 cortes) + 1 por lutador (~4-7 cortes).
   **Estimativa**: ~85 cortes, ~60 s somados, **0,6 a 0,9 MB** no total (alvo <= 1,2 MB).
8. **Variação por código** (a do plano §2.3, determinística pelo `variacao(...)`, nunca `Math.random`): taxa 0,97-1,03 e ganho
   0,9-1,0 por toque; sorteio entre as 2-5 variantes do id; especial por golpe = taxa e filtro (`sFire` 1,0; `sDown` 0,84 +
   passa-baixa 1,8 kHz; `sFwd` 1,12 + passa-alta 400 Hz); camadas somadas (soco = Kenney + toalha a -6 dB) para o som não
   soar "de biblioteca".
9. **Lacunas** (E2 bumbo, E4, E5, E8, E9, E10, E11, E12 órgão; voz idosa): continuam na **síntese de hoje**, que já é o
   fallback de cada id. Nada fica mudo.
10. **Prova**: o dono ouve a folha `base` + 2 lutadores no `?escuta=1` do iPhone **antes** de cortar os outros 8 (o mesmo portão
    do plano). A Íris valida o manifesto (ids, licença, origem e volume presentes em todo corte).

---

## 8. Riscos e como cada um foi tratado

| Risco | Onde | Tratamento |
|---|---|---|
| Rip de jogo comercial | geral | descartado tudo sem origem declarada; os 19 itens descrevem a gravação (ator, microfone, objeto). Ainda assim, na escuta, **reprovar qualquer som que pareça conhecido de outro jogo** |
| `.txt` interno com outra licença | toalhas do qubodup (3, 4) | a página do autor diz explicitamente para ignorar o txt; guardar a URL e a frase no LEIA-ME |
| Licença múltipla | HaelDB (OGA-BY 3.0 + CC0) | escolhemos CC0; registrar a escolha |
| Direito de voz da pessoa | vozes (15-19) | só vocalização não lexical, transformada, sem nome do intérprete no jogo; atrizes que publicaram a si mesmas preferidas |
| Licença muda depois | todos | LEIA-ME com URL, data (2026-10-22) e a frase copiada; a CC0 é irrevogável ("irrevocably") para o que já foi publicado |
| Qualidade caseira | qubodup (2009), rubberduck (celular) | camadas + filtro; reserva Kenney/Sci-fi |
| Marca | Kenney | não usar o logo (pedido do próprio Kenney); o nome só aparece nos créditos |

---

## 9. LEIA-ME de créditos (modelo)

Proposta de arquivo: `public/assets/sons/CREDITOS.txt` (viaja com o jogo) e cópia em `arte-fonte/sons/cc0/LEIA-ME.md`.
Texto pronto para preencher com os arquivos realmente usados após a curadoria:

```text
InnoFighters: créditos de áudio
================================

Os sons de luta realistas do InnoFighters vêm de bibliotecas livres. Todos estão sob
Creative Commons Zero (CC0 1.0, domínio público): não exigem atribuição. Registramos a
origem mesmo assim, por transparência e como agradecimento a quem os gravou.
Licença: https://creativecommons.org/publicdomain/zero/1.0/
Conferência das licenças: 2026-10-22.

Os sons foram cortados, mixados em camadas, normalizados, convertidos para MP3 mono e
alterados em tom e filtro pelo jogo. As vozes são usadas só como gritos e gemidos, sem
representar a pessoa que as gravou.

Foley e efeitos
- Kenney (kenney.nl): "Impact Sounds" e "RPG Audio". CC0.
  https://kenney.nl/assets/impact-sounds  https://kenney.nl/assets/rpg-audio
- qubodup: "40 wet towel club/pound/hit/attack sounds" e "12 wet towel hitting/falling/
  punching floor sounds". CC0 conforme a página do autor (que pede para ignorar o txt
  antigo dentro do arquivo).
  https://opengameart.org/content/40-wet-towel-clubpoundhitattack-sounds
  https://opengameart.org/content/12-wet-towel-hittingfallingpunching-floor-sounds
- artisticdude: "Swishes Sound Pack". CC0.  https://opengameart.org/content/swishes-sound-pack
- StarNinjas: "10 Impact/Shield Blocks" e "20 Sword Sound Effects". CC0.
  https://opengameart.org/content/10-impactshield-blocks
  https://opengameart.org/content/20-sword-sound-effects-attacks-and-clashes
- rubberduck: "75 CC0 breaking / falling / hit sfx" e "80 CC0 RPG SFX". CC0.
  https://opengameart.org/content/75-cc0-breaking-falling-hit-sfx
  https://opengameart.org/content/80-cc0-rpg-sfx
- faxcorp: "Electricity Game Sound Pack". CC0.
  https://opengameart.org/content/electricity-game-sound-pack

Vozes
- wolfwoot: "Voice Clip Pack - Male Adventurer RPG". CC0.
  https://opengameart.org/content/voice-clip-pack-male-adventurer-rpg
- HaelDB: "Male Grunt/Yelling sounds". Oferecido em OGA-BY 3.0 e CC0; usado sob CC0.
  https://opengameart.org/content/male-gruntyelling-sounds
- Cici Fyre (cicifyre): "Female RPG Voice Starter Pack". CC0.
  https://opengameart.org/content/female-rpg-voice-starter-pack
- AuraVoice (Nocturnal_Vanguard): "Female Hurt Grunts & Groans" e "Female Scream 1". CC0.
  https://opengameart.org/content/female-hurt-grunts-groans
  https://opengameart.org/content/female-scream-1
- EmoPreben: "Playersounds 1" e "Pain sounds". CC0.
  https://opengameart.org/content/playersounds-1-by-emopreben
  https://opengameart.org/content/pain-sounds-by-emopreben
- AntumDeluge: "Evil Laugh". CC0.  https://opengameart.org/content/evil-laugh

Síntese própria do jogo
- Música, interface, gongo do KO, jingles de rodada e os especiais sem sample livre
  (tambores, berimbau, serpente, estepe, águia, órgão) são sintetizados pelo próprio jogo.

[Se o HAYATO usar a voz gerada na Runway: acrescentar a origem e a licença conferida.]
```

---

## 10. Decisões do dono e pendências

1. **Autorizar o download** da lista 6.1 (19 itens, 34,7 MB, todos CC0, sem login).
2. **HAYATO**: voz CC0 (wolfwoot) ou o "Chad" da Runway (aprovado no ouvido)? O Chad só pode ir a público com a licença da
   Runway para o plano gratuito conferida; a voz CC0 não depende disso.
3. **Os 6 áudios da Runway** (`lote0`, `lote1`): seguem só como candidatos na comparação; mesma pendência de licença.
4. **Warrior Voice Pack** (johncarroll): se o dono quiser, perguntar ao autor o que "incorporating is prohibited" quer dizer.
   Uma resposta escrita liberando o uso em jogo devolve ao jogo o melhor pacote de voz masculina encontrado.
5. **Lacunas de especial** (E2 bumbo, E4, E5, E8-E11, E12 órgão): ficam sintetizadas. Se o dono quiser sample nelas, o caminho
   é a reserva Sonniss (licença boa, download grande) ou gravar foley próprio; nenhuma fonte CC0 conferida serve.
