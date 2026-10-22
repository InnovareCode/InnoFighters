---
name: baloes-premium
description: Balão de fala "Tarja de Impacto" (docs/direcao-arte-baloes.md) — Bangers 24 caixa alta +1px, 7 variantes, protótipo injetado no jogo por page.route, armadilhas de medida
metadata:
  type: project
---

Proposta de 2026-10-22 (missão cmviycnqk015x01p7umwcp0rd): `docs/direcao-arte-baloes.md`. Protótipo de referência (JS) em
`arte-fonte/baloes/prototipo/premium-nucleo.js`; Bangers + OFL em `arte-fonte/baloes/fonte-para-public/` (NÃO em public/:
`tests/unit/fontes.test.ts` confere a lista exata da pasta, a Lyra move junto com o teste). Previews `arte-fonte/capturas/baloes-premium-*`.

**Why:** dono achou os balões "muito feios" e pediu a fonte "indicada em jogos" → letreiro de quadrinho (Bangers, OFL).
Plano B se ele quiser minúsculas: Saira Condensed 800 a 27 px.

**How to apply:**
- Medir fonte com regra JUSTA (mesmo balão, maior tamanho que cabe nas 232 falas E com acento ≤ passo−2). Só largura engana:
  Bangers perde na regra porque o acento da maiúscula sobe 1,15 em; ganhou com 24 px + `letterSpacing` 1px + passo 28.
- Protótipo no jogo real sem tocar código: vite dev em porta própria + `context.route('**/src/render/balao.ts*')` trocando
  `export function X(` por `function X__antigo(` e anexando o núcleo; fonte servida por route no mesmo origin (CSP). Vite
  recarrega a página quando outro agente salva arquivo: o script precisa repetir a cena.
- A/B de pixels conta TUDO que sai da caixa: sombra dura, glow (shadowBlur) e contorno em esquadria na ponta do rabicho
  encostam no rosto/limites. Sombra mora dentro da caixa, glow por dentro do aro, ponta recua 3 px.
- Painel OPACO: contraste independe dos 10 cenários (pixels até lum 0,99). Pior caso = retícula da cor mais clara (CAMILLE).
- Ênfase = rival + última palavra; muda só cor (largura igual, quebra igual). Pop ancorado à esquerda da linha de base.
- Retrato na plaquinha recusado na v1 (ruído a 844x390). Ônix segue exclusivo do ZENON ([[novo-chefao]], [[textos-provocacao]]).
