---
name: e3-s3-s5-centella-camille-nila
description: E3 S3/S4/S5 no motor (RESORTE, PARADE, REVERS, VADIVU, rente) + correções #1-#5 da Íris — armadilhas que não se leem no código
metadata:
  type: project
---

Entregue em 2026-10-21 (contrato em docs/handoff-vega-e3-s3-s5.md). Só o que não se deriva do código:

- **`luta-fidelidade.test.ts` compara `BASE_ANIM` e `TYPE_ANIM` com o protótipo chave a chave.** Animação de golpe E3 novo vai em `TYPE_ANIM_E3`/`ANIM_RESP` (data/anim.ts). **How to apply:** nunca acrescentar chave nessas duas tabelas.
- **`activeMove()` é o portão da caixa de acerto**: golpe que não bate (PARADE `parry`, VADIVU `troca`) tem que sair dali, senão a caixa de dano 0 ainda atordoa o rival.
- **A caixa de acerto vem da pose ativa × geometria do atlas provisório**: pose alta (`special`, `jumpKick`) põe a caixa de golpe BAIXO acima do agachado. Golpe baixo → pose baixa (`sweep`) no `anim`; golpe de queda → `tall`. RESORTE usa `anim.a[1]` (voadora), não `a[0]` (corrida).
- **`through` puro NÃO cruza**: a caixa aponta para a frente e acerta antes. REVERS exigiu `dirCorrida`/`cruzouEm` + virar `facing` + travar a caixa até cruzar. A detecção é antes do movimento (1 tick de atraso) — por acaso é o que dá ao rival o `holdBack` novo.
- **CPU encadeia (combo) qualquer especial pagável, ignorando `ia`**: `serveParaCombo` tira antiaereo/defesa/troca/espacoAtras-sem-corda do pool. Dica nova de golpe "só situacional" precisa disso.
- **Flag "neste tick" zera no INÍCIO de `update`**, não é consumida pelo 1º leitor (2 acertos no mesmo tick; chamada direta fora de `update`) — era o #2/#4 da Íris.
- Fichas: `poseDaFicha` vence a pose própria só se o atlas tem o quadro; `troca.ficha` null = base; as duas VADIVU precisam dos mesmos S/A/R (o golpe segue pelo slot `sDown` da ficha nova); `montarLutador` 3º parâmetro interno valida troca dentro das fichas.
- Teste de "decisão da CPU" = 600 sementes chamando `cpuInput` com estado montado à mão (barato, determinístico); CPU×CPU só como fumaça.
- Ferramentas: scratchpad da sessão é compartilhado com missões antigas (apaguei um `m2.json` alheio); heredoc bash com aspas em JSON/TS grande quebra → usar `Write`; arquivos do src são CRLF, editar por script Python que normaliza (ed.py no scratchpad).
- Pendências com outros: render #5 (`chDaFicha` com `Object.hasOwn`) é da Lyra; nomes `sarpa*` das poses são premissa minha.
