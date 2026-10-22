---
name: temas-musicais-t0-t2
description: Temas por lutador T0-T2 entregues (2026-10-21): régua musical congelada, sequenciador puro, 9 TemaDef; armadilhas de orçamento/mixagem e o que falta (T3 ligação, escuta)
metadata:
  type: project
---

Spec `docs/spec-chefoes-progressivos-temas-e-dificuldade.md` §3. Handoff com todos os números: `docs/handoff-vega-temas.md`. `TEMAS_POR_LUTADOR = false` e ninguém chama `trilhaDaLuta`: falta T3 (ligar em `fight.ts` depois da Lyra), Q da Íris (Chromium CPU 4x) e a escuta do dono.

**Estrutura:** dados em `src/data/musica/**` (strings de graus, `mix` por pista, `fase2.mix`), compilador puro `src/audio/partitura.ts`, ramo `schedulerTema`/`playTema` no `audio-sys.ts`, régua em `tests/support/regua-musica.ts` (τ 0,4825 / 0,3482 / 3,413 congelados). Calibrar mixagem: `MUSICA_DIAG=1 npx vitest run tests/unit/musica-calibra-diag.test.ts --silent=false` e colar `mix`/`fase2.mix`.

**Armadilhas que custaram caro (não repetir):**
- `tone()` decai exponencialmente na nota inteira: RMS igual ao da `fight` com pico <= 0,5 não cabe (a `fight` tem 0,93). Ataque de 60 ms no baixo tirou o pico (bumbo e baixo somavam no mesmo instante).
- A faixa da voz (<= +1 dB) e o grave (<= +2 dB) mandam na mixagem: energia tem de ir para 120-300 Hz (baixo com passa-baixa 350 Hz, tambores com f0 150-190 Hz), não para <120 Hz nem 300-3000 Hz. Baixo uma oitava abaixo na fase 2 estoura o grave (4 temas ficam com `baixoOitava: 0`).
- Orçamento (<= 8 fontes novas/passo, <= 15 ativas = 1,25 x o pico REAL da `fight`, que é 12 e não 23): o trecho de troca precisa entrar na conta no pior compasso; evento da troca no passo 0 estoura, atrasar 1 passo.
- A régua dobra a altura (oitava de referência por pista) antes de medir `dT`; transposição e oitava dão `dT` = 0 por construção. A regra de τ foi trocada ANTES de existir tema (D dos controles de andamento passava de 0,4).
- Mini motor offline: estalo de 1 amostra quando o início cai a < 5e-11 s antes de um quadro e o ganho ainda vale 1; o renderizador por chamada (overlap-add, início em 0) não tem.
- Python no Windows não aceita `/c/...`; heredoc com aspas quebra: usar Write/Edit.

**How to apply:** mudou instrumento/padrão de um tema -> rodar `musica-temas`, `musica-mix`, `musica-orcamento` e refazer a calibração do `mix`. Mudar τ da régua exige PROGRESSO.md e novo veredito da Íris.
