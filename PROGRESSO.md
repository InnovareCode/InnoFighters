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

## Expansão — DECISÕES APROVADAS pelo dono em 2026-10-20 (todas conforme a recomendação)
1. Elenco: AMINU (Nigéria/dambe), CENTELLA (México/lucha libre), CAMILLE (França/savate), NILA (Índia/kalaripayattu); chefão BAATAR (Mongólia/bökh). Máx. 1 mecânica nova por lutador.
2. Nomes de golpe em português na tela até revisão de falante nativo (hauçá, Kerala).
3. Ordem de desbloqueio: AMINU, CENTELLA, CAMILLE, NILA; depois BAATAR.
4. ED3 (a): a 1ª zerada do Arcade libera o próximo da fila E o chefão.
5. ED4: escada = 5 rivais sorteados + chefão (6 lutas). 6. ED5: lutador travado pode ser rival. 7. ED6: chefão em round único com 2 barras. 8. ED7: jogando com o chefão, escada sem chefe. 9. ED9: qualquer dificuldade, com continues. 10. ED10: sem super/4º especial.
11. ED8: MVP com os 4 atuais (HAYATO com arte nova, D1) e expansão em ondas. 12. ED11: 5 cenários novos (1 por lutador + arena do chefão, estepe do Naadam sem paredes). 13. ED12: música do chefão se sobrar tempo.
14. Finais dos 4 atuais: Apolo propõe, dono aprova. 15. Logo: embutir fonte livre parecida com Impact. 16. `?seed=N`: manter. 17. Remover a menção à tecla H do "Como jogar". 18. Autorizada a dependência de desenvolvimento `sharp` (F2).
- Em andamento: E1a (Vega), E1b (Lyra), E2 (Cronos) em paralelo; Apolo escreve `docs/prompts-arte.md` com os prompts para o dono gerar as imagens. Dono traz as imagens aos poucos; Apolo cura, equipe segue no ritmo da arte.
- ENTREGUES e conferidas pelo Atlas (2026-10-20): **E1a** (Vega: motor para N lutadores, snapshot CPU x CPU intacto), **E1b** (Lyra: sem "4" literal, papéis ROSTER/INICIAIS/FILA/CHEFE/VITRINE, carga sob demanda + retrato.png, C1 v2; 63 e2e, 40 telas com 0 pixel), **E2** (Cronos: `inno-fighters-v2` + `src/meta/`, UI ainda não usa), **E0** (Apolo: `docs/prompts-arte.md`). Handoffs em `docs/handoff-*.md`.
- **E4 entregue e conferida** (Lyra, 2026-10-20): seleção 3x3 com estados (liberado, NOVO!, travado com cadeado, chefão oculto), escada com chefão, aviso de chefe, VS do chefão, avisos de desbloqueio, HUD de 2 barras (stub de C3), persistência v2 na UI. 383 unit, 69 e2e, 40 telas com 0 pixel; produção segue com 4 lutadores. Fixture de 9 lutadores falsos só em DEV (`/?expansao=1`), fora do bundle. Handoff: `docs/handoff-lyra-e4.md`. NÃO provado: luta de chefe real (E3), toque em aparelho real na grade 3x3.
- Prompts de arte por personagem: `docs/prompts/` (10 arquivos; scripts em `ferramentas/prompts/`). 20 pontos "NÃO GERE AINDA" aguardam `docs/mecanicas-e3.md`.
- Em andamento: **E3-prep** (Nova: `docs/mecanicas-e3.md`, mapa das mecânicas e do chefão para a Vega).
- Decisão nova do dono (E4): o cursor da grade anda por cima dos travados (mostra a dica "Zere o ARCADE para liberar") e só a confirmação é barrada; alternativa: pular travados (uma linha, perde a dica). Recomendado: manter.
- Aguardando o dono: (a) HAYATO versão A (gi de mangas inteiras, emblema de raio, luvas azul-marinho; recomendada) ou B (fiel ao atual); (b) rollback de onda: preservar ids de desbloqueio desconhecidos no salvamento (recomendado, com limites) ou descartar; (c) autorização de commit/push das fases E1a–E2 e dos documentos; (d) gerar as imagens pela ordem de `docs/prompts-arte.md` e trazer uma a uma (arte-fonte/ fica fora do git; backup em nuvem).
- Decisão do Atlas: `core/storage.ts` importar `meta/` é aceito (sem ciclo); na migração o recorde será `max(v1.hi, v2.hi)` (pedir ao Cronos junto da correção do rollback).
- Regra de teste: só a Lyra roda `npm run test:e2e`; Vega e Cronos rodam só os unitários (e2e simultâneos colidem na porta 5173).

## Geração de imagens pelo Atlas via Runway (autorizado pelo dono em 2026-10-20)
- Conta Runway nova conectada pelo dono (equipe "Junior", plano gratuito, 500 créditos; não sei se é mensal ou único). Modelo usado: Nano Banana 2.1, 4:3, 2K (6 créditos/imagem; 4K custa 12). Upscale e vídeo bloqueados no plano gratuito.
- Procedimento: enviar a imagem de referência (`init_upload` + `curl` + `complete_upload`), `generate_image` com UMA referência e o prompt de `docs/prompts/`, baixar o resultado para a pasta TEMPORÁRIA, medir (lilás restante, fundo, caixas das figuras) e só então copiar para `arte-fonte/` com o nome do prompt e a versão. Mostrar ao dono antes de seguir; Apolo cura.
- Piloto WEI LONG 1A: aprovado pelo dono (lilás 22.272 -> 95 px; fundo 98,5% magenta puro; figuras sem efeito a ≤2 px das originais). Salvo em `arte-fonte/lutadores/wei-long/folhas/wei-long-f4-especiais-v2.png`.
- WEI LONG folha de especiais: 1B (painel longo, `-v3`) e 1C (cor do painel mais escura, `-v4`, versão final; ressalva: a figura toda escureceu e as calças ficaram levemente marrom-arroxeadas). MIN-JI: mestra `min-ji-mestra-v1.png` aprovada (fundo verde 99,2% puro) e folha 1 `min-ji-f1-base-v1.png` gerada (traje fiel; fundo 97,9% puro; vão entre fileiras de 4 px e nenhum entre as fileiras 2 e 3, igual ou pior que as folhas canônicas do WEI LONG: a F2 precisa fatiar por componentes conexos, não por grade fixa). Saldo Runway: 470 créditos.
- MIN-JI COMPLETA (mestra + folhas 1 a 4, 2026-10-20), em `arte-fonte/lutadores/min-ji/folhas/`: `min-ji-mestra-v1`, `-f1-base-v1`, `-f2-reacoes-v1` e `-v2`, `-f3-golpes-v1`, `-f4-especiais-v1`. Medidas: fundo verde 98% puro, nada encosta na borda, nenhuma folha é cópia da anterior. Folha 2: a v1 tinha o nocaute com a cabeça à DIREITA (spec: esquerda); a correção pelo Runway falhou (não espelhou e criou uma cabeça fantasma, descartada); a v2 é a v1 com a figura do nocaute ESPELHADA POR CÓDIGO (componente conexo, 92%, alinhada pela base; as outras 11 figuras idênticas, diferença 0). Opcionais ainda não gerados: folha 5 (extras) e efeito. Saldo Runway: 446 créditos.
- HAYATO (2026-10-20): o dono escolheu a versão A com a exigência de NÃO lembrar o Ryu. A versão A do Apolo (gi branco + faixa + faixa preta + luvas) ainda lembrava o Ryu; foi gerada uma variante reforçada "A2" e o dono ESCOLHEU a A2: gi cinza-grafite com detalhes amarelo-elétrico, mecha de raio amarela no cabelo, faixa verde, faixa preta com borda amarela, mãos enfaixadas de branco, descalço, fundo magenta. Mestra salva em `arte-fonte/lutadores/hayato/folhas/hayato-mestra-v1.png` (fundo ≈ #FD2BFA, uniforme). `docs/prompts/03-hayato.md` descreve a A1 (gi branco): os prompts das folhas do HAYATO foram adaptados ao traje A2 por mim; o Apolo deve atualizar o arquivo. Folha 1 em geração. Saldo Runway: 428 créditos.
- APROVADO pelo dono em 2026-10-20 ("aprovo também tudo que está pendendo dos outros personagens"): as decisões de mecânica da Nova ED-M1 a ED-M10 conforme a recomendação (NILA com postura GAJA/SARPA e MARMA como atordoamento; CENTELLA com RESORTE e sem salto na parede; GARKUWA sem conversão em carga; BAATAR jogável sem DEVEKH/MERGULHO; fase 2 troca o MERGULHO pelo →+ESP; gatilho da fase 2 na troca de barra; relógio mantido; HP 118 decidido pelo harness; empate repete o round; cortes menores aceitos). O Atlas gera as imagens de AMINU, CENTELLA, CAMILLE, NILA e BAATAR sem parar a cada mestra/folha 1, usando medição como filtro e mostrando cada lutador pronto. AINDA SEM RESPOSTA (não são de personagem): autorização de commit/push de tudo até a E4; rollback de onda (preservar ids desconhecidos); cursor da grade. A E3 (Vega, motor) só começa depois do commit.
- CENÁRIOS (2026-10-20): os 6 gerados pelo Atlas no Runway (2752x1536, 16:9) e salvos em `arte-fonte/cenarios/cenario-{jp,ng,mx,fr,in,mn}-v1.png`: Japão (castelo de cerejeiras), Nigéria (poços de anil de Kano), México (arena de lucha libre), França (Velho Porto de Marselha), Índia (Fort Kochi na monção), Mongólia (estepe do Naadam, sem paredes). Conferidos com linhas-guia a 70% e 87% da altura: chão plano e livre, objetos só nas pontas, sem pessoas em primeiro plano nem texto legível. Falta o Apolo conferir a curadoria. O `jp` novo substitui o `public/assets/cenarios/jp.jpg` (1600x900) na F3.
- HAYATO folha 1: a v1 saiu com os pés da fileira de baixo CORTADOS pela borda da imagem (3 de 4 figuras, base em y=1790 de 1791), sem vão entre fileiras e 2 quadros de andar viraram pulo; a v2 (prompt reforçado: "cada figura ~70% da fileira, vão >= 8%, pelo menos um pé no chão") não cortou nenhum pé (folga de 10 px), os quadros viraram passos, mas o modelo continua fazendo figuras de ~100% da altura da fileira e os vãos entre fileiras seguem de 0 a 5 px. Ambas salvas. LIÇÃO PARA O BLOCO A DO APOLO: o pedido de "80% da altura" é ignorado; o que funciona é exigir que dedos e pés nunca toquem a borda e "um pé sempre no chão"; a F2 deve fatiar por componentes conexos. Saldo Runway: 386 créditos.
- Lição: edição pontual de uma célula pelo Runway pode ignorar a instrução e adicionar artefatos; para espelhar/mover uma figura recortada sobre fundo chapado, fazer por código (exato e sem custo).
- Permissão do dono (2026-10-20): o Atlas salva sozinho em `arte-fonte/` SÓ arquivos novos, com a versão no nome, nunca sobrescrevendo; continua parando para o OK do dono na imagem-mestra e na folha 1 de cada lutador.
- Observação para o Apolo: os prompts 3 a 5 mandam anexar DUAS imagens (mestra e folha 1); a lição do WEI LONG diz que duas anexadas podem fazer o modelo devolver a referência. Testar no Runway com tags e verificar.
- Regra de gasto: seguir a ordem de `docs/prompts/00-indice.md`, informar o saldo a cada lote e parar antes de zerar. Nada de gerar sem o dono saber.

## Hospedagem de teste — GitHub Pages TEMPORÁRIO (decisão do dono em 2026-10-20)
- Site público de teste em `https://innovarecode.github.io/InnoFighters/`, atualizado a cada push na `main` por `.github/workflows/pages.yml` (`npm run build -- --base=/InnoFighters/`). Repositório e site são PÚBLICOS.
- É SÓ ENQUANTO TESTAMOS. Destino final (D6, detalhado): servidor **EasyPanel** da infraestrutura própria. Quando o EasyPanel entrar no ar: apagar `pages.yml` e desligar o Pages (GitHub > Settings > Pages) para tirar o site do ar.
- Pré-requisito manual do dono: Settings > Pages > Source = "GitHub Actions" (sem isso o 1º deploy falha; dá para rodar de novo em Actions > pages > Run workflow).
- NO AR desde 2026-10-20 (commits `a6c9256` e `3ef5998`; o 1º deploy falhou porque o Pages ainda não estava ligado). Conferido no navegador em `https://innovarecode.github.io/InnoFighters/`: `data-pronto` = true, 12 imagens, 0 falhas HTTP, 0 erros de console, sem `__inno`, 6,7 MB transferidos. Atualiza sozinho a cada push na `main`.

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
