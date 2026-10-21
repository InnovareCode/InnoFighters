# Changelog

Marcos do InnoFighters, do mais recente para o mais antigo. Datas e hashes vêm do `git log` (fuso -03:00).
Os nomes de fase (F0, E1a, E3 S2...) são os de `PLANO.md` e `docs/plano-expansao.md`.

## 2026-10-21: elenco de 9 lutadores no jogo (`c7437c1`)

- **E3 S3, S4, S5** (Vega): mecânicas da CENTELLA (RESORTE e HURACANRANA), da CAMILLE (PARADE, contragolpe e REVERS) e da NILA (VADIVU, troca de postura GAJA/SARPA).
- **E5** (Vega, Lyra): 9 ids em produção (`IDS_LUTADORES`); fila AMINU, CENTELLA, CAMILLE, NILA; chefão BAATAR; escada de 5 rivais mais o chefão; cenário da casa de cada lutador.
- **F3a e F3b** (Lyra): arte nova de HAYATO (traje A2) e MIN-JI; atlas e retratos dos 5 novos (atlas C1 v2); 6 cenários novos em WebP; folha 5 da NILA (serpente).
- **Oráculo de fidelidade:** atlas original de HAYATO e MIN-JI em `tests/fixtures/atlas-prototipo/`, para o teste não depender da arte nova.
- Arte bruta e capturas continuam fora do git (`arte-fonte/`, decisão D5).

## 2026-10-21: pipeline de sprites para o chefão e os novos (`763343e`)

- **E3 S1b e S2** (Vega): BAATAR (agarrão com janela, armadura por rank, MERGULHO DA ÁGUIA) e AMINU (carga MASHI com 3 níveis, quebra-guarda, absorção de projétil).
- Pipeline estendido ao layout 3x2 do chefão e rodado nos 5 novos. **Estado atual:** não executa (ver `docs/como-adicionar-um-lutador.md`).
- **Storage** (Cronos): configurações só com valores da UI; v2 de versão futura nunca sobrescrita; v2 corrompida copiada antes de ser substituída.
- **Testes do chefão** (Íris): 41 testes adversariais; 5 casos `it.fails` documentam defeitos conhecidos.
- **CI e deploy** (Vulcano): permissões mínimas, testes antes do deploy, actions fixadas por SHA, Dependabot, `noindex` no site.

## 2026-10-21: F2, pipeline de sprites (`21a062d`)

- `ferramentas/sprites/`: recorte por componente conexo, fundo medido na borda, chave de cor com despill, escala única por lutador, âncora pelos pés, ponta dos golpes.
- `sharp` como devDependency. Saída em `sprites-gerados/` (fora do git).

## 2026-10-20: expansão, contratos C3, chefão (E3 S0 e S1a), persistência por ondas, UI pós-E3 (`3af66cc`)

- **E1a** (Vega): motor para N lutadores. `IDS_LUTADORES`, `idPrototipo` opcional, `CenarioDef.casa`.
- **E1b** (Lyra): sem "4" fixo na UI; `VITRINE`; carga sob demanda (`src/assets/gerenciador.ts`); manifesto C1 v2 com páginas.
- **E2** (Cronos): storage v2 com chave `inno-fighters-v2`, migração, saneamento e `src/meta/` (desbloqueio, vitória, escada).
- **E3 S0 e S1a** (Vega): tipos C3 aditivos, `ConfigChefe`, troca de barra, Dança da Águia, `IA_CHEFE`. Produção continuou com 4 lutadores e chefão nulo.
- **E4** (Lyra): seleção 3x3 com estados (liberado, NOVO!, travado, chefão oculto); escada com chefão; aviso de chefe; tela de desbloqueio; HUD de duas barras.
- **E0 e prompts de arte** (Apolo): `docs/prompts-arte.md` e `docs/prompts/`.

## 2026-10-20: site de teste no GitHub Pages (`a6c9256`, `3ef5998`)

- `.github/workflows/pages.yml`: build com `--base=/InnoFighters/` e deploy a cada push na `main`.
- **Temporário.** O destino é o servidor EasyPanel (decisão D6). Ao entrar no ar, o workflow e o Pages devem ser desligados.

## 2026-10-20: F1c, jogo de ponta a ponta (`e704d93`)

- `src/ui/`: cenas (boot, intro, título, menu, seleção, dificuldade, VS, luta, pausa, resultado, Arcade, continuar, como jogar, opções) e `MenuList`.
- `main.ts` com laço de passo fixo ligando entrada, luta, render e áudio.
- Semente pela URL (`?seed=N`).
- Logo com a paleta A "Ouro Forjado", desacoplada do elenco (`src/ui/logo.ts`).
- Testes: fluxo completo (`jogo.spec.ts`) e 40 telas comparadas pixel a pixel com o protótipo.

## 2026-10-20: F1a e F1b, porte do protótipo em módulos (`d444e5e`)

- **F1a:** contratos C2, C3 e C4; RNG com semente (mulberry32); storage v1 com migração de `sakura-fighters-v4`; `data/` conferido contra o protótipo; `input/`, `platform/` e loader do manifesto C1; `ferramentas/extrair-prototipo.mjs`.
- **F1b:** `fight/` (motor sem DOM, áudio e render, emitindo eventos); `audio/` sintetizado; `render/` (pose, rastro de golpe, HUD, lutador, mundo). Testes de fidelidade contra o protótipo.

## 2026-10-20: F0, fundação (`eda9109`)

- Vite 8, TypeScript 7 em modo estrito, Vitest 5, Playwright (só Chromium).
- Canvas lógico 960x540 com escala por CSS.
- CI (`.github/workflows/ci.yml`): typecheck, testes e build.
- Importação do protótipo para `prototipo/` (referência congelada). Plano em `PLANO.md`, com decisões D1 a D9 do dono.

## Decisões do dono que valem para o código

- **Expansão** (2026-10-20): elenco aprovado (AMINU, CENTELLA, CAMILLE, NILA; chefão BAATAR); ordem de desbloqueio; 1ª zerada do Arcade libera o próximo da fila e o chefão; escada de 5 rivais mais o chefão; chefão em round único com duas barras; máximo de uma mecânica nova por lutador. Lista completa em `PROGRESSO.md`.
- **Repositório público** (2026-10-21): fica público até a entrada no EasyPanel.

## Pendente (não entregue)

- **E6, balanceamento:** harness de frame data e simulação em construção (`ferramentas/balanco/`, ainda não commitado; `docs/balanco/` ainda não existe). Os números do BAATAR e da AMINU são provisórios.
- **E7, celular:** portão de desempenho com o chefão em cena e 9 retratos.
- **E8, segurança e deploy:** revisão do saneamento do storage v2 pelo Órion; publicação com rollback pelo Vulcano; documentação (esta fase).
- **F4, celular e PWA**, **F5, QA**, **F6, deploy definitivo** no EasyPanel, **F7, documentação final**.
- **Não provado:** som, gamepad em aparelho real, iOS e Safari (`PROGRESSO.md`, F1).
- **Quebrado no estado atual:** `npm run sprites` (import duplicado em `ferramentas/sprites/executar.mjs:15`). E `npm test` com 2 falhas em `tests/unit/gamepad.test.ts`, por alteração não commitada.
