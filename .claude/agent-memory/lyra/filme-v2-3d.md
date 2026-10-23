---
name: filme-v2-3d
description: V2-3d (2026-10-23) o FILME do especial na UI - arquitetura, decisões que a spec deixava abertas, medidas no navegador e armadilhas
metadata:
  type: project
---

Arquitetura: `src/data/roteiros-filme.ts` (tabela do §4 do Apolo + 4 modelos; `roteiroDoFilme(lutador, ficha, golpe, projetil)`), `src/render/filme.ts` (linha do tempo PURA + `FilmeDoEspecial`), integração em `ui/cenas/fight.ts` (`passoDoFilme`, `comecarFilme`, `reagirAosEventos`, gancho DEV `?filme=<lutador>:<golpe>`). A cena NÃO chama `game.update` durante o filme (como a cinemática); o motor já está no estado final.

- **Eventos do tick do contato:** `hit/throw {filme}` e `filme` NÃO vão para efeitos/sessão (o filme toca por batida). `ko`, `round`, `perfect`, `fase-chefe` esperam o FIM; `dust` espera a batida da QUEDA. `reagirDoJogo` recebe só os de agora.
- **HUD:** a vista do filme copia os lutadores (`{...f, id: f.id, esquiva: f.esquiva ?? 0}`: o spread perde os 2 getters) e troca hp/hpShown/barras do rival; `hp = max(hp do motor, antes - saiu)` garante que o último quadro bate com o motor. `hpShown` final = o do motor (senão a barra vermelha "volta" depois do filme). Troca de barra: barra velha esvazia e a nova entra 8 ticks depois da última batida com dano.
- **Pulo:** `t < 10` recusa (igual à entrada do chefão); ao pular o tempo ACELERA para o roteiro chegar ao fim no ÚLTIMO quadro desenhado (`fim - 1`), não no `fim`. Fechamento <= 6 ticks.
- **Sobra de hitstop:** depois do filme o motor ainda tem 4-6 ticks de hitstop (20 na troca de barra): o 1º `update` depois do filme NÃO anda o tick (testes devem esperar ~8 updates).
- **Soma dos números:** inteiros, soma = `Math.round(dano)` (acumulado arredondado; a última batida com dano fecha em `dano` exato). Não dá para mostrar 17,5 em inteiros.
- **Pose de painel:** `resolverPoseDoFilme`: `f0..f5` só vira painel se `pd.painel === true`; senão cai no `Alt`. **FALTA (loader, não é da UI):** `QuadroC1`/`manifesto.ts` aceitar `painel` e `manifestoParaPoses` pôr `p.painel = true`; `PoseDados.painel?` em `data/tipos.ts`. Sem isso a folha FILME do HAYATO carrega mas nunca vira painel.
- **Agarrão (rivalPos):** a spec do Apolo ("30 px acima da cabeça dela") é impossível: dois corpos empilhados dão ~560 px e a tela tem 540. Medido no navegador: rival de cabeça para baixo AO LADO dela (dx 38, altura 0,5) e câmera 1,05; BAATAR: `kdAir` já é quase deitada, rot 0,25 (rot de 1,45 virava de cabeça para baixo). A pose `kdAir` tem rotação própria: somar `rot` grande dá giro duplo.
- **Rot e âncora:** `P.rot` gira em torno de 0,45 SH acima dos pés; invertido (π) a cabeça fica 0,1 SH ABAIXO da âncora. Conta de posição no mundo de cabeça para baixo tem de levar isso.
- **Contador "N HITS":** desenhado em coordenadas de TELA (câmera aplicada na mão), senão sob zoom 1,3 sobe para dentro do HUD; clamp y >= 178.
- **Câmera:** zoom em torno de (cam.x, chão), `cam.x` é o PIVÔ fixo (não o centro da tela); foco no rival com o atacante a 480 px corta o atacante (design do Apolo). Última batida vira para a câmera da luta (blend em min(4, duração-1-ini) ticks: na CURTA a última batida dura 4).
- **Modos:** COMPLETA só com cinemática COMPLETA, 1ª vez do (lutador|ficha|golpe) na luta e fora do treino; o resto CURTA (inclui cinemática desligada e regras sem cinemática).

**Armadilhas:** (1) o `Game` só deixa a luta andar depois do hitstop; (2) a cena de teste deve usar elenco de PRODUÇÃO (`PROD` de `tests/unit/_filme.ts`) para o motor emitir filme com os números reais; (3) heredoc/regex em scripts de edição: usar Write de .mjs e `rep(a,b)` com string literal; (4) o commit do Atlas pegou versões parciais de `fight.ts` e `roteiros-filme.ts` no meio do trabalho (git status mostra M em arquivos "meus"); (5) verificação sem o runner do Playwright: scratchpad `capturar-filme.mjs` (vite próprio na 5391 + chromium) e `driver-filme.mjs` gerado do spec; os 33 tocam, sem erro de página; desenho do quadro do filme ≈ o normal (mediana 18,9 x 17,2 ms em SwiftShader, máquina carregada).
