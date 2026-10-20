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
- Nenhum commit/push ainda; o dono pediu para perguntar antes.

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
- Primeiro commit/push no GitHub (`origin` conectado, repositório vazio): aguardando OK do dono.

## Armadilhas já conhecidas
- Linha 320 do protótipo tem 9,3 MB (ASSETS em Base64): nunca usar Read nela; para espiar, `awk 'NR==320{print substr($0,1,300)}'`.
- Folhas de sprite de IA vêm sem transparência e sem escala consistente; o pipeline de recorte e marcação (pés, ponta do golpe) é fase própria.
- Caixas de acerto derivam da ponta do golpe na arte: trocar a arte muda o balanceamento.
- No protótipo `tipX/tipY` já estão em escala de tela; o manifesto novo guarda px da imagem. Converter uma única vez, no carregamento.
