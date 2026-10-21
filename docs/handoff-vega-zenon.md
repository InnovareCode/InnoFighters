# Handoff Vega: chefão ZENON ARGYROS (Z1 + Z4 + Z5 + flip). VERSÃO FINAL

Missão do painel `cmvi8mqih01iu01nxcjs4v4hc`, 2026-10-21. **Sem commit** (regra da missão: "sem e2e, sem commit"; os e2e são da Lyra e eu não os rodei).
Aceite medido nesta sessão: `npx tsc --noEmit` limpo, `npx vitest run` **66 arquivos / 1474 testes verdes**, `npm run build` verde. Snapshot antigo
(`fight.test.ts`) e fidelidade lock-step dos 4 originais **intactos, sem `-u`** (nenhum `.snap` aparece em `git status`).

## RESULTADO

### Z1: motor e contratos (src/)
- `Golpe.drenaEnergia { acerto, defesa }` (`data/tipos.ts`, lido em `fight/game.ts#cobrarDreno`): roda só nos ramos de acerto e de bloqueio de `applyHit`, **depois** dos ganhos
  normais do ramo (+8/+5 e +3/+4): `k = min(rival.en, valor)`, `rival.en -= k`, `atacante.en = min(100, +k)`. Armadura que absorve, PARADE, esquiva e `untouchable` retornam antes: não drenam.
  Eventos `hit`, `block` e `quebra-guarda` ganharam `dreno?: number` (só quando `k > 0`). `montar.ts` recusa (erro de dados no boot) `drenaEnergia` com `proj`/`type:'fire'`,
  `hits > 1`, `throw`/`agarrao` (o agarrão não passa por `applyHit`: o dado dizia "drena" e não drenava) e números fora de `0 <= defesa <= acerto <= 100`.
  **Atenção ao teste 2 da spec:** como o +5 do ramo vem antes, rival com `en = 0` perde 5 no acerto, não 0.
- `ConfigChefe.cena: CenaDef { duracao, poses }` no lugar de `danca`; `trilha?: 'chefe'`. Etapa do evento `fase-chefe`: `'danca'` virou **`'cena'`**. `src/data/cena.ts` novo:
  `poseDaCena(cena, t)` (a conta do `Fighter.poseT` no estado `cena`, reaproveitável pela render) e `validarCena` (duração inteira de 1 a 600, 1 a 8 nomes `^[\w-]+$`, chamada em `montarLutador`).
  BAATAR chefão antigo (fixtura): `cena: { duracao: 90, poses: ['devekh0','devekh1','devekh2'] }`. Testes e `ferramentas/balanco` atualizados (`fezDanca` virou `fezCena`, coluna "Viu a cena").
- `LutadorDef.anim.throw` (arte própria do agarrão comum; `animFor` aceita `throw`; ausente = igual a antes). `LutadorDef.alturaDoProjetil` (px acima dos pés onde o projétil nasce; ausente = a conta de sempre).
- **ZENON** (`src/data/lutadores/zenon.ts`, `ZENON_DEF` + `ZENON` em `lutadores/index.ts`): `scale 1,36`, `jump 0,72`, `spd 0,92`, `pow 1,0`, `hp 100` (jogável), `reach 1,12`, `stride 15`,
  `alturaEmPe 1,25` (medido: 0,92 × 347 px / 254,4), `alturaDoProjetil 175`, `stage 'gr'`. Fichas: `chefe` (fase 1: TRIBUTO com dreno 20/10) e `chefe2` (fase 2: `armadura { rankMax 2 }` + `armor:1` em
  hp/hk/chp, SELO MAIOR sp 9,5 sc 1,9 dmg 16, DECRETO `through` com dreno 20/10, `fire ['#e0249a','#0c0710','#12040c']`, `poseDaFicha sc0/sc1 -> decreto0/decreto1`). `chefe`: 2 barras de **50**, cena 90 ticks
  `cena0-2`, bônus 5000, `trilha: 'chefe'`. Especiais: SELO DO ARCONTE (`proj style 'anel'`, sp 7, sc 1,5, dmg 14, kd; **sem dica de IA**: lógica padrão de projétil), COLUNA DE ÔNIX (`rise`, `vy -11`, inv 8, dica
  `antiaereo`), TRIBUTO (`rush`, dreno 12/6 no jogável, dica `aproximar [90,220]`), DECRETO (`rush` + `through`, dica `aproximar [120,230]`). Jogável = ficha base (1 barra, sem armadura).
- `apresentacao-especiais.ts`: 5 registros do ZENON (SELO, COLUNA `baixo`, TRIBUTO, `chefe2/sFire` SELO MAIOR, `chefe2/sFwd` DECRETO = `decreto1`): tabela passa a 33 entradas.
- **Entrada no jogo:** `'zenon'` em `IDS_LUTADORES`/`LUTADORES`/`ROSTER` (10º, depois do BAATAR), `IdCenario 'gr'` + `CENARIOS.gr` (casa `zenon`, fora do ciclo e do padrão), `CHEFE = 'zenon'`. Escada = 5 rivais + ZENON
  (jogando COM ele: 5, ED7); derrotado, ele é liberado (D-Z1). `dev-chefe-teste.ts` foi **removido pela Lyra** (ela migrou o e2e para o chefão real): não restaurei.

### Z4: música (src/audio)
- Tabela `TRILHAS` (`fight` 150 bpm x16x4, `menu` 92 x16x4, `chefe` 138 bpm, 12 passos x 8 compassos = 96, `andamentoFase2 1,12`); `scheduler` lê dela. `playChefe`: Ré frígio dominante (raiz 50, graus 0,1,0,1,-2,1,0,0),
  bordão + bumbo no passo 0, órgão em quintas nos passos 4 e 8, prato (ruído passa-alta 6 kHz) no 8, cravo em 96 passos de melodia. `AudioSys.musicaDaFase(2)`: bumbo nos 3 tempos, órgão uma oitava abaixo, andamento +12%,
  **só vira no início do próximo compasso**; `startMusic` (mesma trilha ou outra) volta à fase 1. `eventos.ts`: `fase-chefe` etapa `cena` => `introWhoosh` + `musicaDaFase(2)`. Sem `Math.random` em `src/audio`.
  A Lyra já ligou `audio.startMusic(cfgChefe.trilha ?? 'fight')` em `ui/cenas/fight.ts`.
- Referência de `fight`/`menu`: `tests/fixtures/audio-sys-antes-do-chefe.ts` é o AudioSys de ANTES da mudança (cópia congelada do HEAD); o teste compara tone/noise (tipo, f0, f1, t, vol, at, filtro, dest) em 2 laços + o oráculo do protótipo (`audio.test.ts`) segue verde.

### Z5: pipeline, atlas e arena
- `ferramentas/sprites/poses.mjs`: layout `zenon` (s1..s10 + `zr`, 3x2) com o **mapa v2** do Apolo (§8 do handoff dele). `lutadores.json` `zenon`: `alturaRef 558`, `acolchoar s8 direita 16`, `ponta` `lk1 mao`, `upper mao`, `sb1 cima`, `decreto1 mao`.
  Sem `fatorFolha`. `EXTRAS`/`COM_PONTA` globais ficaram como estavam (as poses do ZENON saem do layout; `decreto1` ganha ponta pela exceção). Decisão sobre fora do contrato: `sc2` = recuperação do TRIBUTO (`anim.sFwd.r`), `grab0`/`grab1` = agarrão comum
  (`anim.throw`: preparação/ golpe e recuperação), `decreto2` = recuperação do DECRETO.
- S9 v2 (sem a poeira, `apagar-pequenos.ps1 -X0 2130 -Y0 960 -X1 2210 -Y1 1005`: 9 componentes, 150 px) em `arte-fonte/lutadores/zenon/folhas/zenon-s9-v2.png` (arquivo NOVO; `arte-fonte/` é ignorada pelo git).
- `npm run sprites -- zenon`: 11 folhas, 6 componentes em todas, 63 quadros (58 desenhos), escala 0,6776, **4 páginas 2048x1920, 1,79 MB** (teto: 5 páginas, 3 MB, 80 MB decodificados: ocupa 63 MB), idle0 = 558 px. Contact-sheet conferido:
  `arte-fonte/lutadores/zenon/contact-sheet-zenon.png` (pontas nos lugares certos: `lk1` na mão, `sb1` na palma erguida, `sweep` e `jkick` na bota, `jpunch` no cotovelo).
- `public/assets/lutadores/zenon/` (4 páginas, `atlas.json` com o `retrato` igual ao do `retrato.json`, `retrato.png`; sem `relatorio.json`) e `node ferramentas/gerar-retratos.mjs --so zenon` + `--verificar`: ok.
- Arena: `cenario-gr-v2.png` por `piso2.ps1` (valores padrão) -> `public/assets/cenarios/cenario-gr.webp` 1920x1080 (151 KB) por `ferramentas/converter-cenarios.mjs --so gr` (o script ganhou `--so <sigla>` e a fonte `gr-v2`). 6 braseiros (frações do Apolo §5).
- `ancora: 'tronco'` (spec §9.3) **testei e descartei**: com a âncora na faixa 15-55% o desvio ficou PIOR (idle 2,5 px contra 1,4; andar 13,5 contra 11,8 px do atlas). O desvio do andar vem da inclinação real do tronco nas poses, não do casaco.
  O critério da spec (idle ≤ 4, andar ≤ 8 px) fecha no idle (2,5 px) e **não** no andar (11,8 px de atlas ≈ 7 px de tela). Para a Lyra/Apolo olharem no jogo; se patinar, a saída é a S2 v2 (passada alternada) que o Apolo já previu.

### Balanço (docs/balanco/, 100 sementes, NORMAL + DIFÍCIL, 19 800 lutas, 0 travadas, hash `08a116c08e22a075`, `--verificar` idêntica)
| | hayato | wei-long | min-ji | caio | aminu | centella | camille | nila | baatar | **zenon** |
|---|---|---|---|---|---|---|---|---|---|---|
| `--completo` | 47,9 | 52,0 | 50,7 | 51,3 | 46,3 | 41,3 | 56,7 | 49,0 | 51,9 | **52,9 (IC 51-55)** |
- **Chefão (jogador-CPU x ZENON chefe):** sem esquiva NORMAL **31,4%** / DIFÍCIL 19,1%; **com esquiva** (produção: `Regras.esquiva = true`) NORMAL **36,0%** / DIFÍCIL 28,0% (`--completo --esquiva`, `relatorios/balanco-esquiva/`, hash `23037ac3e454a428`). Meta 20-40% (só vale no NORMAL).
  Chegou à 2ª barra em 56-92% das lutas (≥ 50%), cena = 100% das trocas de barra, 100% terminam por KO. 0 alerta; 3 atenção (CENTELLA 41,3% por 0,7 ponto abaixo de 42, ela já era a mais fraca; DIFÍCIL do chefão 19,1%; REVERS usa 4,8% de contato).
- **Achado do harness (causa raiz):** a primeira rodada deu o ZENON jogável em 7% e o chefão em 86% de vitória do jogador. **Causa: a 1,36 de escala a mão dos golpes em pé fica a ~300 px do chão e a caixa de acerto (54-84 px, centrada na mão) passava por cima da cabeça
  de quem tem escala 1,0 (topo da hurtbox a 254 px)**: `hk` 2,9% de contato; o SELO nascia a ~280 px. Correção só em dados: `bh` 200/190/250/250/240 em lp/lk/hp/hk/clp e 190 no TRIBUTO e no DECRETO (o fundo da caixa vai a ~170 px), `alturaDoProjetil 175`.
  Depois dela a taxa subiu a 53% e o `hp`/`pow` voltaram ao valor de partida (100 / 1,0). **Armadilha achada junto:** `FichaDef.mods` SUBSTITUI o `mods` do def por golpe (raso): a fase 2 com `hp: { armor: 1 }` apagou o `bh` e o `hp`/`hk` dela "não conectavam em nenhuma distância" (alerta do harness); agora `hp: { ...MODS_BASE.hp, armor: 1 }`.
- Ajustes só nos números dele: `hpPorBarra` 50 (era 40 de partida), `pow` 1,0. Como lutador comum `hp 100`/`pow 1,0` (sem ajuste). O dreno do jogável é 12/6; a energia do rival não zera o kit (o harness não mede "especiais por luta contra o ZENON": ver PENDÊNCIAS).
- `ferramentas/balanco/elenco.ts`: `--ajustes` aceita `alturaEmPe`.

### Testes novos/ajustados
- Novos: `tests/unit/zenon-motor.test.ts` (dreno: acerto, rival com pouca energia, teto 100, bloqueio, golpe sem dreno, projétil, invulnerável, armadura que absorve; validação do dado; cena e etapas; armadura da fase 2 x fase 1; DECRETO cruza e drena),
  `zenon-arte.test.ts` (lê o atlas real: toda pose citada existe, atlas ≤ 5 páginas/3 MB/80 MB, `alturaEmPe` medido, pontas, fundo das caixas, subida da COLUNA com o topo na tela), `sprites-zenon.test.ts` (layout v2), `audio-chefe.test.ts`, helper `_zenon.ts`.
- Ajustados (ZENON entrou no elenco): `e5-elenco`, `e4-ui` (R9 = regras de antes do Zenon, injetadas), `progresso`, `ui`, `papeis-lutadores`, `balanco`, `balanco-adversarial`, `e6a-sarpa`, `z6-chefoes-derrotados`, `esquiva-timing` (31 especiais; DECRETO tratado como `through`, igual ao REVERS), `cinematica`, `cinematica-eventos` (33), e as trocas `danca -> cena`.
- **Mutação:** 45 mutantes das mecânicas novas (dreno: min, teto, ordem, ramos, evento, projétil; montar: cada recusa e cada faixa; cena: pose, duração, etapa, validação; ficha 2: armadura, `armor`, `bh`; DECRETO `through`/dreno; SELO MAIOR; `alturaDoProjetil`; `alturaEmPe`; `anim.throw`;
  áudio: bumbo, órgão, prato, andamento, virada no compasso, reset de fase, 12 passos, bpm de fight/menu, `musicaDaFase` no evento). **44 mortos, 1 sobrevivente equivalente** (tirar `Number.isFinite`: NaN e Infinity já caem nas comparações). Script: `relatorios/mutar.py` (ignorado pelo git).

## PARA O PRÓXIMO

### Lyra
- Contratos já estão no código (§ acima). Pontos de integração que eu NÃO toquei (src/render, src/ui, src/input, tests/e2e): você já tem `APRESENTACAO` em `src/render/apresentacao-lutadores.ts` (eu não criei tabela de dados duplicada), `IDENTIDADES_ZENON`, `projetil-anel.ts`, `entrada-chefe.ts`, grade de 10. O `zenon` agora está em `IdLutador`: `IDENTIDADES_ZENON` pode virar parte de `IDENTIDADES` e o `CHAVES_IDENTIDADE` de 28 passar a 33 (ajustei `cinematica.test.ts` para somar as duas tabelas; refaça como preferir).
- **O SELO nasce a 175 px do chão (meia altura), não na mão do `sa1` (~280 px):** a 280 a caixa do projétil passava por cima da cabeça de todo mundo. O anel de E12 que a render desenha "na mão" no `sa1` fica ~100 px acima de onde o projétil sai. Se quiser o anel saindo da mão, o caminho é a hurtbox em pé do rival, não o `alturaDoProjetil`.
- Hurtbox do ZENON em pé = 318 px (`alturaEmPe 1,25`) contra um sprite de 347 px visíveis: a caixa do rival (76 px de largura) é a de sempre. Medir no navegador (skill `medir-antes-de-afirmar`): topo da cabeça x HUD (spec §9.1, estimativa de folga 4-19 px), `jump 0,72`, a subida da COLUNA (`vy -11` = 71 px; o teste unitário garante topo do sprite ≥ -6 px com zoom 1,075, mas é conta, não medida).
- `tests/e2e/` que podem mudar: arte sob demanda (atlas do ZENON de 4 páginas, 1,79 MB), boot com 10 manifestos, `celular-e7a`, `novos-lutadores`, `expansao` (você já adaptou); eu não rodei e2e.
- A ficha `chefe` do ZENON usa o TRIBUTO de dreno 20/10; o jogável 12/6. A moeda visual lê `ev.dreno` (valor real transferido), não o dado.

### Íris
- Conferir na mão: o dreno quando o rival está com pouca energia (`dreno` menor que 20/10, `en` nunca negativa); armadura da fase 2 só nos golpes fortes dele (parado ele recua normal: dívida da spec §4.1); o DECRETO contra rival encostado na parede e contra esquiva; o jogável (ficha base) sem armadura nem cena; `?esquiva` contra TRIBUTO e DECRETO (esquiva-timing cobre).
- Rodada final sugerida: `npm run balanco -- --completo --esquiva` (a de produção) e olhar `zenon` e o bloco do chefão.

### Órion
- Entrada externa nova: nenhuma. `validarCena`/`drenaEnergia` validam dado estático no boot (falha alto). Vale ver `public/assets/lutadores/zenon/atlas.json` (manifesto lido pelo `validarManifesto` do carregador) e o `converter-cenarios.mjs --so`.

### Alexandria (Z8)
- `como-adicionar-um-lutador.md`: `cena`, `drenaEnergia`, `trilha`, `alturaEmPe` medido, `alturaDoProjetil`, `anim.throw`, a armadilha do `mods` de ficha (raso por golpe) e a do `bh` com sprite alto. `arquitetura.md` (tabela de trilhas, `poseDaCena`).

## PENDÊNCIAS
- **Sem commit** (sem e2e verde). Arquivos novos fora do git: `arte-fonte/` é ignorada (S9 v2, `cenario-gr-v2.png`, contact-sheet); `sprites-gerados/` idem. O que entra no commit: `public/assets/lutadores/zenon/`, `public/assets/cenarios/cenario-gr.webp`, `src/data/cena.ts`, `src/data/lutadores/zenon.ts`, `tests/fixtures/audio-sys-antes-do-chefe.ts` e os testes novos.
- Métrica "especiais do jogador por luta contra o ZENON >= 0,6x a média" e "dreno médio por luta" (spec §10) **não medidas**: o harness não conta `dreno`. Fica para a Íris/Z7 se o dono quiser o número (pede campo novo no agregado; `reg.chefe` já conta troca/cena/retomada).
- A4 da spec (agregado genérico no lugar do campo `baatar` fixo): não fiz. O BAATAR é lutador regular e a estatística de agarrões dele continua por id literal; o bloco de chefe já usa `regras.chefe`.
- IA: `IA_CHEFE` global não mudou (nenhum perfil por chefão foi necessário; o harness fechou sem ele).
- O arquivo `docs/handoff-apolo-zenon-folhas.md` está sem `git add` (é do Apolo). `PROGRESSO.md` não foi tocado (é do Atlas).
- `ancora: 'tronco'` (spec §9.3) descartada com medida (acima). Reserva de arte: ZR r2c2 (2ª rasteira) e r2c1 (`block` alternativo) não entraram, como o Apolo indicou.

## APRENDIZADO
- **Sprite alto + caixa centrada na mão = golpe que passa por cima do rival.** A caixa de acerto é `fy = tipY·scale + bh/2` e tem altura `bh`: o fundo é `tipY·scale − bh/2`. Para um lutador de escala > 1,2 com a mão na altura do rosto, medir o fundo da caixa contra o topo da hurtbox de escala 1,0 (254 px) ANTES de balancear; o harness acusou como "7% de vitória" e `hk` com 3% de contato. O mesmo vale para o ponto de nascimento do projétil (`alturaDoProjetil`).
- `FichaDef.mods` é raso por golpe: `hp: { armor: 1 }` na ficha apaga o `bh` do base. Sempre `{ ...MODS_BASE.hp, armor: 1 }`.
- A âncora por faixa do tronco não resolve o "andar patinando" quando a inclinação do corpo é real; medir antes de pôr no pipeline (a opção custou 20 linhas e foi revertida).
- Congelar o módulo antigo (`audio-sys-antes-do-chefe.ts`) como oráculo é mais barato e mais forte do que gravar uma lista de chamadas à parte para provar que a refatoração não mudou as trilhas antigas.
- Ambiente: `python - <<'EOF'`/heredoc com acento ou aspas quebra o bash; gravei `.py` com a ferramenta Write em `relatorios/` e rodei com `python -I`. Edit preserva CRLF; scripts precisam normalizar `\r\n`.
