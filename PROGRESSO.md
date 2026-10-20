# InnoFighters — Progresso

Atualizado em 2026-10-20 por Atlas.

## Estado atual
- Protótipo importado do artefato "Inno Fighters" (claude.ai) para `prototipo/inno-fighters-artefato.html` (9,1 MB, arquivo único, sem alterações).
- Plano de transformação pronto: `PLANO.md` (Nova). Nada implementado ainda.
- Painel de missões ligado (prefixo `INNOFIGHTERS`, id público PM-VG9U). Repositório git iniciado, sem commits.

## Concluído
- Importação do protótipo.
- Planejamento: stack, arquitetura, 7 fases, orçamentos e riscos (`PLANO.md`).

## F0 Fundação — CONCLUÍDA em 2026-10-20 (Vulcano; conferida pelo Atlas)
- Vite 8 + TypeScript 7 estrito + Vitest 5 + Playwright (só Chromium). `typecheck`, `build`, 4 testes unit e 2 e2e (desktop + celular) verdes, rodados pelo Atlas.
- `sprites/` movido para `arte-fonte/lutadores/{caio,min-ji,wei-long}/folhas/` e `arte-fonte/cenarios/` (18 arquivos, nada apagado; pastas vazias de `sprites/` ficaram). `arte-fonte/lutadores/hayato/folhas` vazia aguardando a arte nova (D1).
- Constantes em `src/core/constantes.ts`; escala do canvas em `src/platform/escala.ts` (calculada em JS); `data-pronto` no `<html>` é o sinal que o e2e espera.
- Vulcano adicionou `.github/workflows/ci.yml` (typecheck, test, build no push/PR) — fora do pedido; ainda não rodou em runner real.
- NÃO feito (fica para depois): ESLint/Prettier (estavam no plano F0), PWA/manifest (F4), deploy (F6), `.gitkeep` nas pastas vazias.
- Primeiro commit `eda9109` enviado em 2026-10-20 para `main` em github.com/InnovareCode/InnoFighters (autor local: InnovareCode Squad). Regra do dono: commit e push só com autorização explícita a cada vez.
- O push da sessão não tem login do GitHub (Git Credential Manager pede navegador); foi feito no Terminal do app (`mcp__terminal__run_in_terminal`).
- O CI do Vulcano roda pela primeira vez neste push — conferir a aba Actions do repositório.

## F1 Porte fiel — EM ANDAMENTO (começou em 2026-10-20)
- **F1a concluída** (Vega + Lyra, conferida pelo Atlas: typecheck, 115 unit, build, 39 e2e verdes):
  - Vega: C3 em `src/core/contratos.ts`; `core/` (rng mulberry32, storage com migração); `ferramentas/extrair-prototipo.mjs` (reprodutível, 0 diferenças); `data/` conferida contra o protótipo executado.
  - Lyra: `input/` (teclado, gamepad, toque -> InputFrame), `platform/`, `render/` base, `assets/` (loader C1).
  - Desvios aceitos da Lyra: canvas real 1920x1080 (RS=2, como o protótipo); CSS do canvas; aviso `#rot` agora aparece em retrato (no protótipo nunca aparecia por ordem de CSS).
- **F1b concluída em código** (2026-10-20, conferida pelo Atlas: typecheck, 175 unit, build, 50 e2e verdes):
  - Vega: `src/fight/` (fighter, game, cpu, colisão, comandos, projétil) e `src/audio/` (AudioSys, eventos), com testes de fidelidade rodando partes puras do protótipo como gabarito.
  - Lyra: `src/render/` (pose, rastro do golpe, hud, lutador, mundo) e e2e `fidelidade-prototipo.spec.ts` (render novo x protótipo, pixel a pixel).
  - ATENÇÃO: os relatórios finais dos dois agentes NÃO chegaram ao Atlas (só os avisos de conclusão). Não sei, por eles, o que cada um declarou provado. Só vale o que o Atlas rodou. Íris deve confirmar a cobertura real dos testes de fidelidade.
- **F1c concluída em código** (2026-10-20, conferida pelo Atlas: typecheck, 201 unit, build, 58 e2e verdes rodados sozinhos): `src/ui/` (cenas + MenuList) e o loop em `main.ts`. O jogo roda de ponta a ponta (título, menu, seleção, dificuldade, VS, luta, pausa, resultado, Arcade, continuar, como jogar, opções). Handoff completo em `docs/handoff-lyra-f1c.md`.
- **Logo, paleta A (Ouro Forjado) aplicado** (2026-10-20, escolha do dono; conferido pelo Atlas: 205 unit, 59 e2e, build verdes; logo visto no navegador). `PALETA_MARCA` e `marca` em `src/ui/logo.ts`, desacoplados do elenco (emblema/brasas não leem lutadores). Testes de fidelidade desligam o logo dos DOIS lados; `logo.spec.ts` mede o logo à parte. Handoff: `docs/handoff-lyra-logo.md`. Não medido: brilho em movimento e cenários cn/kr; fonte Impact (fallback Arial Black).
- Teste manual: servidor de dev do dono na porta 5174 (`.claude/launch.json`: `innofighters-dev` local; `innofighters-celular` com `--host 0.0.0.0`, IP da máquina 192.168.0.105, rede Wi-Fi marcada Pública no Windows — o firewall pode bloquear). Playwright usa a 5173.
- Armadilha de teste: NUNCA rodar dois `npm run test:e2e` ao mesmo tempo (nem com um `vite` na 5173 aberto): colidem na porta 5173 e na pasta `test-results/` e dão falso negativo (ERR_CONNECTION_REFUSED, ENOENT).
- Desvios da F1c a decidir: `?seed=N` também vale em produção; tecla H (debug) alterna `game.debug` mas não desenha caixas de colisão; fonte Impact/Segoe UI do sistema (muda em Linux/macOS).
- **Falta da F1:** só a revisão da Íris (jogar o Arcade inteiro, celular de verdade, persistência). Som, gamepad real e iOS/Safari NÃO foram provados.
- Atlas extraídos do protótipo têm nomes de quadro LEGADOS (guard, punch, kick...) e 3600 px de largura (acima do limite iOS de 2048): só a arte nova da F2/F3 resolve.
- Pendência: `sharp` não está instalado; conversão de cenários/atlas para WebP e redimensionamento ficam para a F2 (pedir autorização antes de instalar).
- Sugestão da Vega: script `"extrair": "node ferramentas/extrair-prototipo.mjs"` no `package.json`.

## Expansão — pedido do dono em 2026-10-20 (depois da F1c; ainda em planejamento)
- Melhorar as cores do logo "INNO FIGHTERS": hoje há 3 paletas competindo (INNO prata-azulado frio, FIGHTERS laranja-vermelho quente, anel multicolorido). É decisão visual nova, não porte fiel — Apolo propõe, Lyra aplica em `src/ui/logo.ts` só depois da F1c.
- +4 personagens novos, SEMPRE com características, habilidades, poderes e nacionalidades diferentes entre si e dos atuais (HAYATO-Japão, WEI LONG-China, MIN-JI-Coreia, CAIO-Brasil). Roster final: 8 + chefão.
- Chefão no fim do Arcade. DECIDIDO: jogável após derrotá-lo (luta final mais forte e maior; vira personagem liberável).
- Gamificação de desbloqueio. DECIDIDO: por progresso no Arcade. Começam liberados os 4 atuais; zerar o Arcade libera o próximo da fila; derrotar o chefão libera o chefão. Exige estender o storage (C4) com os desbloqueados, com migração.
- ENTREGUES em 2026-10-20: `docs/proposta-expansao.md` (Apolo: 3 paletas de logo, recomendada A "Ouro Forjado"; AMINU-Nigéria/dambe, CENTELLA-México/lucha libre, CAMILLE-França/savate, NILA-Índia/kalaripayattu; chefão BAATAR-Mongólia/bökh, escala 1.28, vida 150, jogável depois com vida 118; ordem de desbloqueio AMINU, CENTELLA, CAMILLE, NILA, depois BAATAR) e `docs/plano-expansao.md` (Nova: fases E1-E8; carga sob demanda dos atlas vira pré-requisito; storage v2 em CHAVE NOVA `inno-fighters-v2`; ED1-ED12 para o dono). Aguardam aprovação do dono — nada implementado.
- Entregas originais (referência): Cada novo lutador precisa de folhas de sprite geradas pelo dono (mesmo pipeline da F2) — risco de calendário.
- Em aberto para o dono depois das propostas: aprovar nacionalidades/estilos/poderes dos 4 novos e do chefão; aprovar a paleta do logo; ordem de desbloqueio.

## Próximos passos (ordem do plano)
1. F1 Porte fiel (Vega + Lyra) em paralelo com F2 Pipeline de sprites (Vega + Apolo). Contratos C1–C4 em `PLANO.md` seção 4.3.
2. F3 Arte nova no jogo, F4 celular/PWA, F5 balanceamento/QA, F6 segurança e deploy, F7 documentação.

## Decisões do dono (tomadas em 2026-10-20; contexto em PLANO.md seção 9)
- D1: gerar arte nova do HAYATO ANTES do lançamento (4 lutadores). Contra a recomendação da Nova (lançar com 3): a arte e o cenário do HAYATO entram no caminho crítico; Apolo escreve os prompts.
- D2: rastros de golpe só do jogo (`drawSwing`); os rastros pintados nas folhas são removidos.
- D3: regenerar as folhas da MIN-JI com fundo verde/transparente, sem efeitos e com grade regular.
- D4: Apolo propõe agora as folhas canônicas do WEI LONG (7 arquivos) — missão aberta, entrega em `docs/proposta-wei-long.md`; o dono aprova.
- D5: arte bruta FORA do git (pasta ignorada) com backup em nuvem; só os atlas processados são versionados.
- D6: publicar em infra própria (subdomínio do innovarecode.com.br). Contra a recomendação da Nova (Cloudflare/Netlify). Pendência: Vulcano precisa saber qual servidor e como o dono publica hoje (só na F6).
- D7: TypeScript estrito nos módulos novos, porte progressivo.
- D8: áudio 100% sintetizado no MVP.
- D9: nome InnoFighters, chave `inno-fighters-v1`, migrando uma vez de `sakura-fighters-v4`.

## Decisões em aberto
- D4 APROVADA em 2026-10-20 (proposta em `docs/proposta-wei-long.md`): conjunto canônico = folhas 153007 (base), 153112 (reação), 153710 (golpes), 153054 (especiais); descartadas 153049, rncovy.jfif, 8hwvqp.jfif. A 153710 entra como está no MVP (braçadeira marrom, faixa, barba longa). A ombrada do TIE SHAN KAO fica como soco com aura por enquanto.
- Edição de arte ainda obrigatória antes da F3: folha 153054 — tirar os efeitos lilás desenhados (coerente com D2) e passar para painel longo. A troca do quadro L3C2 por ombrada foi adiada pelo dono. Prompts na seção 4 da proposta. Depende de o dono gerar a edição; sem missão aberta até lá (bloqueio real: depende do dono).
- Adiado (pós-MVP): edição da 153710 (braçadeira preta, sem faixa, barba mais curta), quadro de soco no ar, arte da ombrada.
- Poses sem cobertura no WEI LONG: soco no ar, agachamento antes do pulo, agachado fundo (reaproveitar aterrissagem).
- Efeitos (cabeça de dragão, onda de chão): asset à parte, fundo preto, mistura aditiva `lighter`.
- D6: detalhes da infra própria (servidor, forma de deploy) antes da F6.

## Armadilhas já conhecidas
- Linha 320 do protótipo tem 9,3 MB (ASSETS em Base64): nunca usar Read nela; para espiar, `awk 'NR==320{print substr($0,1,300)}'`.
- Folhas de sprite de IA vêm sem transparência e sem escala consistente; o pipeline de recorte e marcação (pés, ponta do golpe) é fase própria.
- Caixas de acerto derivam da ponta do golpe na arte: trocar a arte muda o balanceamento.
- No protótipo `tipX/tipY` já estão em escala de tela; o manifesto novo guarda px da imagem. Converter uma única vez, no carregamento.
