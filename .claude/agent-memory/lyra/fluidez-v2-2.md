---
name: fluidez-v2-2
description: V2-2 (2026-10-23) fluidez só no render - mola, interpolação, tremor do rival, tecla H; decisões, medidas e armadilhas
metadata:
  type: project
---

Arquitetura: `render/fluidez.ts` (classe `Fluidez`: `gravar` antes de cada tick, `vista(luta, alfa, elenco, opcoes)` devolve a leitura desenhável), `render/mola.ts` (função pura `mola` + pesos do Apolo em `PESO_DO_LUTADOR`, mora em render porque `LutadorDef.peso` é contrato da Vega e não existe), `render/caixas.ts` (tecla H, usa `fight/colisao`). Chave única: `Navegador.fluidez` (false por padrão; `main.ts` liga no tempo real; `?manual=1` desliga; `?manual=1&fluidez=1` só DEV liga para testes). `Cena.draw(alfa = 1)`.

- **Why:** o oráculo de pixel e os snapshots não podem mudar; com a flag desligada o caminho é o do HEAD (provado: PNGs idênticos byte a byte em 5 lutadores x 11 poses).
- Medido: caminhada 60 quadros a 144 Hz, razão desvio/média do Δx de tela = 1,18 antes (35 de 60 quadros parados) e 0,015 depois (0,010 a 60 Hz; 0,014 a 90; 0,015 a 120). `vista()` custa ~16 us por quadro. Perfil de celular com a máquina carregada (suíte da Íris rodando): p95 de trabalho 27 a 70 ms a 4x tanto no HEAD quanto com a fluidez, então a meta p95 < 16,7 ms NÃO é provável nessa condição; a 1x o p95 de trabalho é ~3 ms nos dois.

**Armadilhas:**
1. `{...fighter}` PERDE os getters do contrato (`id`, `esquiva`): a vista copia os campos e repõe os dois. A raiz da luta usa `Object.create(luta, ...)` para herdar `timer`/`timerMax`.
2. O critério "salto de âncora <= 12 px nos 10 atlas" da spec mede nada visível: `ax` = centro de massa X (nucleo.mjs `centroDeMassaX`) e o desenho o põe em `f.x` em todo quadro. Medi o que o jogador vê (pés relativos ao `ax`, `tests/unit/fluidez-ancora.test.ts`): 169 pares acima de 12 px na arte de hoje (caminhada e rasteira têm movimento legítimo de pé). Virou catraca (`tests/fixtures/escorregoes-conhecidos.json`, regenerar com `GERAR_ESCORREGOES=1` quando a arte mudar; WEI LONG e CAIO estavam sendo trocados em 2026-10-23).
3. `powershell -Command "... *servidor.mjs*"` mata a própria shell: matar o vite por `netstat -ano | grep :PORTA | taskkill //PID`.
4. sharp: `.resize()` roda ANTES de `.composite()` no pipeline; para reduzir a composição, `toBuffer()` primeiro.
5. Capturas com P1 atacando: o P2 é desenhado primeiro; achar o corpo do P1 por menor `e` com `f > 300*k` (o retrato do HUD também usa drawImage).
6. Snapshot para medir sem o WIP dos outros: `git archive HEAD` + só os MEUS arquivos por cima (a 1ª tentativa sobrepondo `src/ui` inteiro levou o WIP da Vega e quebrou o boot: `cfgMotorV2`). Remover o junction de node_modules antes de apagar a pasta.
7. A cinemática, a provocação e a entrada do chefão chamam `gravar` igual (no topo do `update`): nada desliza quando nada anda.
8. Tremor do rival so na `Fluidez` (usa `settings.shake`); e2e dele mede a distância P2 - P1 (a tremida de tela da câmera sai da conta): alterna ±2,33 px com zoom 1,04.
