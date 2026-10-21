---
name: project-logo-paleta-d
description: Logo com INNO azul (paleta D, 2026-10-21) — D1 Cobalto Real recomendada x D2 Azul Elétrico; regra do aro claro; como renderizar o jogo real com paleta trocada em memória
metadata:
  type: project
---

2026-10-21: dono pediu "a versão em que o INNO é azul". Entregue `docs/proposta-logo-paleta-d.md` + previews
`arte-fonte/logo-paleta-d-preview.png` e `-cenarios.png`. D1 "Cobalto Real" (INNO royal 222-227 graus, aro de ouro
`#ffe08a`, anel cobalto de um tom, FIGHTERS brasa igual à A) recomendada; D2 "Azul Elétrico" (201-215 graus, aro creme)
cai dentro da faixa do HAYATO. Aguardando escolha do dono; Lyra aplica e reescreve `logo.spec.ts`/`logo.test.ts`
(as asserções "0 pixels frios" e horizonte `#9a5a12` quebram de propósito).

**Why:** não existe azul livre na roda de cores (HAYATO 193-216, AMINU 234-238); material (metal + aro de ouro)
é o que separa o logo dos lutadores.

**How to apply:**
- O aro interno do logo TEM que ser claro: o piso da borda é sqrt((Li+0,05)/(Lo+0,05)); aro azul médio cai para ~2,6:1.
- Para mostrar variação de paleta no jogo real sem tocar o arquivo: Vite com `--config` no scratchpad, raiz no projeto,
  plugin `transform` (enforce pre) trocando o trecho `PALETA_MARCA`..`function obterLogo`; portas 5191+, nunca 5173/5174.
  Fundo do título real: `__inno.ui.set('title')`, `marca.desenharLogo = () => {}`, `__inno.desenhar()`.
- "Corpo x fundo" < 3:1 em cenários crus claros acontece em TODAS as paletas: quem segura é o contorno preto de 22 px.
- Relacionado: [[project-proposta-expansao]].
