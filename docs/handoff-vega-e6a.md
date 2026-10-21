# Handoff Vega — E6a · harness de balanceamento (`npm run balanco`) + correções da SARPA

Data: 2026-10-21. Sem commit. Base: `docs/mecanicas-e3.md` §3.6, §6, §9; `docs/handoff-vega-e5.md`; `docs/handoff-lyra-f3b.md` (defeitos de dados 1 e 2); `docs/handoff-vega-e3-s3-s5.md`.
Não toquei em `src/ui`, `src/render`, `src/input`, `tests/e2e`. **Nenhum ajuste de balanceamento foi aplicado**: só o bug da SARPA e o do `npm run sprites`.

## RESULTADO

### 1. Harness `npm run balanco`

- `ferramentas/balanco/` (TypeScript carregado pelo Vite em SSR; `cli.mjs` orquestra e divide o trabalho em processos). Desvio do doc §6.1: **não é um `vitest.balanco.config.ts`**, é um CLI Node com `--rapido`/`--completo`, porque a tarefa pediu flags e o Vitest não repassa flags próprias. Fora do `npm test`.
  - `elenco.ts`: os 9 lutadores montados pelo caminho de produção (`public/assets/lutadores/*/atlas.json`, **arte real**; HAYATO e MIN-JI com a arte nova, não com o atlas do protótipo). Também `aplicarAjustes` ("e se...", abaixo).
  - `frame-data.ts`: ensaios numa `Game` real em modo treino. Mede, por lutador x ficha (GAJA, SARPA, BAATAR base/`chefe`/`chefe2`) x golpe (todos, menos `_lag`; cada nível da MASHI; `sResp`): início/ativos/recuperação (medidos e nominais), dano (boneco cheio, já com `pow`), hitstun, blockstun, vantagem no acerto e no bloqueio, queda (KD), nível de bloqueio medido contra `block` e `crouchblock`, caixa estática (`fx + w`, vinda da `ponta` do atlas) e **alcance medido** (varredura de 6 px entre 78 e 780, bordas refinadas a 1 px).
  - `simulacao.ts`: CPU x CPU. Semente = hash do TEXTO da tarefa (tipo, lutadores, nível, índice), então a ordem/divisão do trabalho não muda nada. 72 pares ordenados (espelho fora), NORMAL e DIFÍCIL, `--sementes N` por combinação, mais cada um dos 8 como "jogador" (P1 CPU) contra o BAATAR com `cfg.chefe` (mesmo nível nos dois lados). Teto de 21 600 ticks de jogo por luta ("travou").
  - `agregado.ts`, `outliers.ts`, `relatorio.ts`, `estatistica.ts` (Wilson 95%, hash canônico).
- **Modos**: `--rapido` (padrão, 6 sementes, ~20 s, grava em `relatorios/balanco/`, ignorado pelo git) e `--completo` (100 sementes = 16 000 lutas, **~36-50 s com 8 processos**, grava a referência em `docs/balanco/`). Também `--sementes N`, `--niveis`, `--pares aminu:*`, `--base N`, `--sem-chefe`, `--so frame|sim`, `--jobs N`, `--verificar`, `--saida`, `--ajuda`. Variáveis `BALANCO_SEMENTES/NIVEIS/PARES` também valem.
- **Determinismo** (a "diferença entre rodadas"): `resultados.json` guarda o hash dos registros e a versão (hash de `src/data`, `src/fight`, `src/core`, `src/meta`, `ferramentas/balanco` e dos `atlas.json`). A rodada seguinte com os mesmos parâmetros diz **IDÊNTICA**, ou **DIFERENTE esperada** (a versão mudou, com a variação por lutador) ou **DIFERENTE com a mesma versão = bug de não determinismo**. Provado: duas rodadas `--completo` seguidas deram o mesmo hash `43442075ae9be092` ("IDÊNTICA"), e esse hash não mudou quando troquei só código do próprio harness. `--verificar` joga uma amostra duas vezes na hora.
- **"E se..." (`--ajustes`)**: `npm run balanco -- --ajustes '{"wei-long":{"hp":100,"moves":{"hk":{"dmg":15}}}}'` ajusta hp/pow/spd/jump, golpes (inclusive `proj`) e `chefe` EM MEMÓRIA, nunca grava dados e nunca escreve em `docs/balanco/` (sai em `relatorios/balanco-ajustes/`). Foi como medi as propostas abaixo.
- Saídas geradas e versionáveis: `docs/balanco/frame-data.md` + `.json` (195 linhas) e `docs/balanco/resultados.md` + `.json`. Resumo no terminal (tabela por lutador, chefão, sinalizações, hash, determinismo).
- Para ler o terminal ao rodar: `npm run balanco -- --rapido`.

### 2. Correções da SARPA (objetivas)

- **Salto `sFwd` sobre o HUD** (`src/data/lutadores/nila.ts`, ficha `sarpa`): `vy -19 -> -14.5` e `vx 6 -> 7.8`. Medido tick a tick no motor com o atlas real (topo do sprite = `y + pdy - h*K`, zoom máximo 1,075 ancorado no chão): antes o topo ia a **y ~6 na tela** (cobria o relógio); agora **y ~99** (o relógio termina em ~98; `render/hud.ts`). O `vx` compensa o voo mais curto: deslocamento decolagem->pouso de 264 px antes e 265 px agora (alcance horizontal preservado; a altura do salto caiu de ~204 para ~118 px). O painel do MODO TREINO (y 98-156) continua sendo cruzado pelo salto; não tratei.
- **Hurtbox da SARPA** (campo novo opcional `LutadorDef.alturaEmPe`, `src/data/tipos.ts`; `hurtbox()` em `src/fight/colisao.ts` recebe `escalaEmPe`; `Fighter.hurtbox` só repassa se o lutador tem o campo): `fichas.sarpa.alturaEmPe = 0.79`, aplicado só em `idle`, `walk` e `block` em pé. Agachada, `rente` (BOTE), no ar e em golpe não mudam (essas poses não encolhem). Os outros 8 lutadores e a GAJA não têm o campo: a caixa é a mesma, bit a bit (teste compara `toEqual`). O 0,79 foi conferido contra o atlas de produção: idle 0,78, andar 0,80, defesa 0,76 da GAJA (tolerância do teste: 0,045).
- Atualizei **um** teste existente porque descrevia o defeito: `tests/unit/nila-s5.test.ts` (BOTE) esperava a SARPA em pé com `SH * 0,96`; agora espera `SH * 0,96 * 0,79` e confere `alturaEmPe`.

### 3. Bug do `npm run sprites` (pedido do Atlas)

- Causa raiz: `ferramentas/sprites/executar.mjs:15` importava `separarFundidas` duas vezes. O Vitest (que transforma o módulo) tolera; o Node recusa (`SyntaxError`). Corrigido (uma linha).
- `tests/unit/ferramentas-node-puro.test.ts` (17 testes): roda `node --check` em cada `.mjs` de `ferramentas/` (sprites, prompts, balanco), faz `import()` do `executar.mjs` por um processo `node` de verdade, e roda `cli.mjs --ajuda` dos sprites e do balanço. Para isso o `sprites/cli.mjs` ganhou `--ajuda` (imprime o uso e sai, sem ler folha nem gravar nada).
- Prova de ponta a ponta: `npm run sprites -- aminu --saida <tmp> --sem-contato` gerou `atlas-0.webp`, `atlas-1.webp`, `atlas.json`, `relatorio.json` e `retrato.png` (48 quadros, 2 páginas). Usei `--sem-contato` para não regravar os contact-sheets de `arte-fonte/`.
- Triviais: `aminu.ts:61` ("a arte própria vem na E5" -> já entrou); `aminu.ts:4` já dizia "No elenco desde a E5" (nada a mudar); `ferramentas/prompts/montar-prompts.mjs` agora resolve a raiz pelo próprio arquivo (`import.meta.url`), sem caminho absoluto fixo.

## PROVADO (executado nesta sessão, no código do disco)

- `npx tsc --noEmit` (`npm run typecheck`): 0 erros. `npm run build`: verde (173,86 kB JS). `npx vitest run` (`npm test`): **41 arquivos, 914 testes verdes**, snapshot CPU x CPU semente 42 e `luta-fidelidade` dos 4 originais **sem `-u`** (o `.snap` não foi tocado: mtime de 2026-10-20). `test:e2e` NÃO rodado (combinado: a Lyra faz a E7a).
- Testes novos: `tests/unit/balanco.test.ts` (22), `tests/unit/e6a-sarpa.test.ts` (8), `tests/unit/ferramentas-node-puro.test.ts` (17).
- **Mutação** (mutante aplicado, teste certo reprovou, arquivo restaurado):
  - SARPA, 6 mutantes, todos mortos: `vy -19`; `vx 6`; `alturaEmPe 1`; `alturaEmPe 0,6`; fator aplicado também agachado (tirei `!f.baixo`); fator aplicado também no ar (`jump` no conjunto de estados).
  - Harness, 14 mutantes, todos mortos no fim: RNG com `Math.random` (derruba os 2 testes de determinismo); semente trocada por `semente + idx` (**sobreviveu na 1ª rodada**, matou com o teste novo "o resultado não depende da posição na lista"); dano atribuído ao lado errado; início medido com +1; recuperação com +1; vantagem com o sinal trocado; nível de bloqueio do golpe alto; matriz A x B invertida; z do Wilson 1,64; índice fora da semente; limiar de Wilson do par; `proj` e `chefe` do `--ajustes` alterados no lugar (vazariam para os dados); `chefe` aceito em ficha (**sobreviveu**, matou com o caso `baatar/chefe`).
  - Sprites, 1 mutante: reintroduzir o `separarFundidas` duplicado derruba 3 testes.
- Os 2 casos conhecidos do harness: HAYATO `lp` (início 3, ativos 3, recup 7, hitstun 14, +4 no acerto = hs − A − R, −2 no bloqueio, dano 4 × pow, `mid`) e WEI LONG `hk` (12/5/22, dano 17 × pow, derruba) mais `clk` baixo.

## NÃO provado

- Nada visto em navegador. O voo da SARPA foi medido no motor com a altura do quadro do atlas, não olhado em tela; o 98 da base do HUD vem de `render/hud.ts` (relógio `y 74`, fonte 46), não de uma medição de pixel. A Lyra/Íris devem olhar o salto no jogo.
- A CPU **não usa golpe aéreo** nem agacha para bloquear em todos os casos; os `j*` aparecem na frame data, mas "nunca acerta na CPU" só avalia o que ela usa. A frame data dos golpes aéreos é medida no ápice (o atacante pula parado e ataca em `vy >= 0`).
- Resultado de "humano": a CPU joga os dois lados. PARADE e postura da NILA tendem a parecer piores do que são numa mão humana; o veredito do chefão é a sessão de jogo do dono.
- Os números das propostas abaixo vêm de N = 30 sementes (960 lutas por rodada, IC95 de ±3 pp por lutador), não de N = 100.

## OUTLIERS (rodada `--completo`: 16 000 lutas, 100 sementes, NORMAL + DIFÍCIL; `docs/balanco/resultados.md`)

Metas: taxa geral fora de 35-65% = alerta (42-58% = atenção, doc §6.3); par com limite inferior de Wilson > 65% = alerta; chefão (NORMAL) com o jogador vencendo 20-40%.

| # | Achado | Número | Gravidade |
|---|---|---|---|
| O1 | **WEI LONG** domina | 85,3% geral (IC 84-86); vence 8 de 8 pares com Wilson > 65% (hayato 97%, aminu 98%, nila 94%, centella 91%, min-ji 89%, caio 86%, camille 82%); só empata com o BAATAR (45%) | alerta |
| O2 | **BAATAR jogável** domina | 90,3% (IC 89-91); 8 de 8 pares > 65% (hayato 99%, min-ji 96%, caio 97%, aminu 98%, centella 96%, nila 97%, camille 85%); decide o ED-M8 (hp 118 / pow 1,18): **o harness diz que está fora** | alerta |
| O3 | **AMINU** fraca | 20,7%; perde de quase todos (vs wei-long 3%, baatar 2%, camille 16%, min-ji 17%, caio 25%, centella 25%) | alerta |
| O4 | **NILA** fraca | 29,7% (NORMAL 34% / DIFÍCIL 25%) | alerta |
| O5 | **HAYATO** fraco | 32,6% | alerta |
| O6 | CENTELLA levemente abaixo | 40,3% (meta 42-58) | atenção |
| O7 | **Chefão impossível** para a CPU | jogador vence **1,0% (NORMAL)** e **3,5% (DIFÍCIL)**, meta 20-40%. Só o WEI LONG chega perto (6% / 20%). Todas as lutas terminam em KO; a 2ª barra/Dança só é alcançada em 11-65% das lutas | alerta |
| O8 | NILA troca de postura demais | 16,1 VADIVU por luta (custo 0, 15 ticks parada cada) | observação (dica de CPU) |
| O9 | Ninguém perde por tempo | 0% das lutas e dos rounds acabam por tempo (média 91 s por luta de 2-3 rounds); meta < 10% passa. Lado: P1 vence 52,5% | ok |
| O10 | Golpes **sem alcance real** | **nenhum**: todos conectam a partir de 78 px; o alcance máximo mais curto é o do agarrão (78-107, por desenho: o corte é 108) e, entre os golpes de caixa, o `chp` (78-143) | ok |
| O11 | Golpes que **nunca acertam** na CPU (≥ 30 usos) | **nenhum**; a PARADE (CAMILLE) apara em 47,3% dos usos (meta ≥ 25%), a MASHI chega ao nível 2+ em 55,0% / nível 3 em 7,0% (meta ≥ 30%), o RESORTE acerta com momento ≥ 10% em 100% (meta ≥ 50%): **as dicas de CPU estão certas** | ok |
| O12 | Nível de bloqueio declarado x medido | **zero divergências** nos 195 golpes (mid/low/over/throw batem; golpe "alto" que erra o agachado herda o declarado) | ok |

Conclusão: o desequilíbrio **não vem de alcance nem de dica de CPU**, vem de números (hp/pow/dano dos golpes comuns) e do chefe.

## PROPOSTAS (NÃO aplicadas; medidas com `--ajustes`, N = 30 sementes, ±3 pp)

Pontos de partida, não verdades: o Atlas decide com a Íris.

1. **Chefão (O7)** — dados do BAATAR, sem conflito com a fidelidade: `chefe.hpPorBarra 75 -> 40` e `pow` das fichas `chefe` e `chefe2` `1,3 -> 1,0`. Medido (N = 480 por nível, só o chefão): jogador vence **24,6% (NORMAL)** e **29,0% (DIFÍCIL)**. Variantes: `hpPorBarra 45` + `pow 0,9/0,95` -> 21,3% / 27,7%; só `hpPorBarra 50` -> 5,6% / 9,6%; só o `pow 1,3 -> 1,0` -> 2,5% / 5,8% (a vida por barra pesa mais que o `pow`). Comando: `npm run balanco -- --rapido --sementes 60 --so sim --pares '*:baatar' --ajustes '{"baatar":{"chefe":{"hpPorBarra":40}},"baatar/chefe":{"pow":1.0},"baatar/chefe2":{"pow":1.0}}'`.
2. **Pacote para O1-O5** (um só, porque mexer num lutador desloca todos): medido, taxa geral antes -> depois: hayato 32,6 -> 43,4; **wei-long 85,3 -> 59,7**; min-ji 49,3 -> 49,4; caio 49,2 -> 51,7; aminu 20,7 -> 36,4; centella 40,3 -> 47,7; camille 52,8 -> 57,0; nila 29,7 -> 40,3; **baatar 90,3 -> 64,5** (tudo dentro de 35-65%).
   - WEI LONG: `pow 1,14 -> 0,96`, `hp 108 -> 98`, `hk dmg 17 -> 14`, `hp 13 -> 10`, `chp 13 -> 10`, `chk 12 -> 9`, `lp 5 -> 4,5`, `lk 6,5 -> 6`.
   - BAATAR jogável: `pow 1,18 -> 0,95`, `hp 118 -> 96`, sem `armor` em `hp` e `chp`.
   - AMINU: `hp 102 -> 108`, `pow 1,06 -> 1,14`. NILA (GAJA): `hp 98 -> 104`, `pow 1,10 -> 1,14`. HAYATO: `hp 100 -> 104`, `pow 1 -> 1,05`.
   - Comando: `npm run balanco -- --rapido --sementes 30 --so sim --sem-chefe --ajustes '{"wei-long":{"pow":0.96,"hp":98,"moves":{"hk":{"dmg":14},"hp":{"dmg":10},"chp":{"dmg":10},"chk":{"dmg":9},"lp":{"dmg":4.5},"lk":{"dmg":6}}},"baatar":{"pow":0.95,"hp":96,"moves":{"hp":{"armor":0},"chp":{"armor":0}}},"aminu":{"hp":108,"pow":1.14},"hayato":{"hp":104,"pow":1.05},"nila":{"hp":104,"pow":1.14}}'`.
   - O que **não** adianta no WEI LONG (medido, para não gastar iteração): tirar a armadura da TIE SHAN KAO (85,3 -> 84,5), cortar o dano dos projéteis (-> 80,3), alongar a preparação do `hk`/`hp` (-> 82,1), até tirar os 3 especiais (-> 78,4). Só `pow`/`hp` e o dano dos golpes comuns movem o número. Com `hp 98`, `pow 1,0` e SEM especiais ele ainda faz 57%.
3. **Observação O8**: se a troca de postura da NILA incomodar, a dica `troca` (`CHANCE_TROCA 0,3 x aggr`, `cpu.ts`) é o lugar; não tem efeito no balanceamento medido.

### ATENÇÃO — conflito com a fidelidade (decisão do Atlas)

WEI LONG e HAYATO são dos 4 **originais**: `tests/unit/dados.test.ts` compara `pow`, `hp`, `mods` e `especiais` deles com o protótipo, e o `luta-fidelidade` (lock-step) e o snapshot dependem dos mesmos números. **Aplicar o pacote (itens de WEI LONG e HAYATO) derruba esses testes por desenho.** Opções: (a) o Atlas autoriza afastar os 4 originais do protótipo e o oráculo passa a usar uma fixture dos dados do protótipo (como já se fez com o atlas de HAYATO e MIN-JI); (b) manter os 4 originais e ajustar só os 5 novos, o que **não resolve O1** (o WEI LONG segue em ~85%). Só os itens do BAATAR, AMINU, NILA e do chefão (proposta 1) não têm esse conflito.

## PARA O PRÓXIMO

### Atlas / Íris
- Decidir o conflito acima e o que entra das propostas; depois aplicar os dados e rodar `npm run balanco -- --completo` de novo (a 2ª rodada compara com `docs/balanco/resultados.json` e mostra a variação por lutador).
- Íris atacar: (1) o harness com `--pares` esquisito, `--sementes 1`, `--niveis 2`; (2) o salto da SARPA em jogo, com zoom máximo, e a hurtbox dela em pé (projétil alto, golpe alto) — a base do HUD que usei é o relógio, não o painel do treino; (3) `npm run sprites -- <id>` de outro lutador.
- `docs/mecanicas-e3.md` §6.1 descreve `vitest.balanco.config.ts` e `relatorios/balanco-AAAA-MM-DD`; o real é o CLI acima (Alexandria pode alinhar).

### Lyra
- Nada em `src/ui`/`src/render` foi alterado. Efeitos que a Lyra pode ver: a SARPA em pé tem a caixa de dano 21% mais baixa (se o modo debug da render desenha a hurtbox, vai aparecer menor) e o SALTO DA SERPENTE sobe ~85 px menos. `LutadorDef.alturaEmPe` é opcional e só o motor lê.

### Órion
- `ferramentas/balanco/cli.mjs` usa `fork` de si mesmo com `BALANCO_PARAMS` por variável de ambiente (JSON gerado pelo próprio processo pai, sem entrada externa) e `JSON.parse` do `--ajustes` da linha de comando (só ferramenta de dev). `--ajustes` valida chaves e falha alto.
- `colisao.hurtbox` ganhou um parâmetro opcional; com ele ausente a conta é a de antes.

## PENDÊNCIAS

- Aplicar (ou não) as propostas — decisão do Atlas com a Íris; conflito com a fidelidade dos originais.
- Sessão de jogo do dono para o chefão (a CPU como "jogador" é só um piso).
- `docs/mecanicas-e3.md` §6.1/§6.3 desatualizado quanto ao nome do comando/arquivos (Alexandria).
- Sem commit (a pedido). Arquivos novos: `ferramentas/balanco/*`, `docs/balanco/*`, `tests/unit/{balanco,e6a-sarpa,ferramentas-node-puro}.test.ts`, `docs/handoff-vega-e6a.md`. `.gitignore` ganhou `relatorios/`.

## APRENDIZADO

- **Teste que importa o módulo pelo Vitest esconde erro de sintaxe que o Node recusa** (import duplicado em `.mjs`). Todo script de `ferramentas/` precisa de um teste que o rode por `node` de verdade (`--check` + `import()` + um modo sem efeito colateral como `--ajuda`).
- **Medir `activeMove()` por tick é a definição de "ativo" que o motor usa**: golpe sem caixa (projétil, agarrão, PARADE, VADIVU) precisa de regra própria (tick do tiro, `agarrao.janela`, janela de aparar), senão o relatório mostra "nunca ativo".
- **Boneco que bloqueia anda para trás** (`Game.dummyInput` aperta "trás" o tempo todo): em ensaio de alcance/vantagem ele sai do lugar durante o aquecimento e o pulo, e o golpe "erra" por 9-90 px. Reposicionar logo antes do `startMove` e prendê-lo no lugar até ser atingido.
- **Errar o boneco agachado não é "não bloqueável"**: golpe alto só passa por cima da hurtbox de 56%. Nível de bloqueio medido tem que distinguir "atingiu", "bloqueou" e "errou".
- **Seed derivada da POSIÇÃO na lista** (`semente + idx`) passa nos testes de determinismo mas faz um filtro (`--pares`) dar resultado diferente do completo. A semente tem que sair do texto da tarefa; teste: mesma tarefa com `idx` diferente dá o mesmo registro.
- **Em `--ajustes`, objetos aninhados (`proj`, `chefe`) são compartilhados com a definição estática** (o spread de `montarLutador` é raso): trocar por cópia, nunca atribuir no lugar, e testar que `WEI_LONG`/`BAATAR` estáticos não mudaram.
- **O número que mais move a taxa de vitória da CPU é `hp` x `pow` x dano dos golpes comuns**; armadura, dano de projétil e tempo de preparação quase não movem (WEI LONG ficou em 78-85% em todos os testes isolados). Ajuste proposto sem medir tende a errar o alvo.
- Ambiente: `python - <<'EOF'` e heredoc com `$`/aspas no Bash quebraram duas vezes ("unexpected EOF"); para arquivo grande usar `Write`. O `.missao-atual` sumiu no meio da sessão (o Atlas fechou/reapontou), então o painel só recebeu 2 eventos meus.
