---
name: trailer-arte
description: Direção de arte do trailer de abertura (2026-10-22): frase dos cartões, 2 vozes tipográficas, regras de câmera medidas (pico no acerto DA TOMADA, tetos de zoom), P8 com 8 retratos, como renderizar prévias com o DiretorDoTrailer real
metadata:
  type: project
---

Entregue em 2026-10-22 (missão cmvjezzmo01hu01p72a4obr6z): `docs/direcao-arte-trailer.md`, textos em `src/data/trailer/textos.ts`
(só eu edito), campos de arte em `roteiro.ts`, protótipo + captura + glifos em `arte-fonte/trailer/prototipo/`, prévias
`arte-fonte/capturas/trailer-arte-*`. Decisões A1–A7 aguardam o dono.

**Why:** a Vega escreveu câmera e textos como palpite; medindo no jogo real, 3 defeitos apareceram (cabeças sob o letterbox, pico do
zoom fora do golpe, cortes por troca de foco invisíveis).

**How to apply:**
- Frase: DEZ MESTRES. / DEZ NAÇÕES. / UM SÓ CINTURÃO. / CINCO SELOS. / QUEM SOBE AO TOPO… ("…" é 1 caractere; teto 18).
- Bangers = voz dos lutadores (balões); Barlow Condensed 800 itálico = voz do torneio (cartões). Aço nas palavras, fogo na última.
- Câmera: o pico mora no acerto GRAVADO na tomada (`tickMotor − inicio`), não no `alvo` pedido (P3 pedia 96, acertou em 50).
  Tetos medidos: ZENON ≤ 1,10 (a 1,21 a cabeça ia a y 45; faixa = 69); aéreo ≤ 1,15 só no acerto. Trocar foco com zoom igual
  não aparece: o corte precisa mudar o enquadramento ≥ 15%.
- O lutador "lavado" de branco nos quadros de acerto é o flash de dano (silFlash), não esquiva. Medi esquiva = 0.
- Prévias: `capturar.mjs` usa `window.__inno` + `import('/src/trailer/index.ts')` e anda o diretor tick a tick. Com outro agente
  editando src/, o Vite do projeto devolve 500: rode sobre `git archive HEAD` no scratchpad com junções `mklink /J` para
  node_modules e public, e desfaça as junções com `cmd /c rmdir` ANTES de apagar a pasta (rm -rf seguiria o link).
- Estática só usa cenário residente (padrão, jp, cn, kr, br). Ver [[logo-oficial]], [[baloes-premium]], [[textos-chefoes]].
