# InnoFighters — Progresso

Atualizado em 2026-10-21 (Alexandria, Z8, sobre o commit `0684548`). Histórico de estados mais antigos abaixo; o bloco mais novo é o primeiro.

## Estado em 2026-10-21 (commit `0684548`) — o mais novo
- No `main`: `0684548` (Zenon Argyros, o Arconte), sobre `9b63acb` (esquiva, cinemática única por especial, BAATAR normal, balanço) e `1cb1ccd`. A árvore estava limpa na data desta revisão.
- **Zenon no jogo:** chefão final (`CHEFE = 'zenon'`, `src/meta/regras.ts`), 10º lutador. Luta em duas barras, cena da fase 2 (90 ticks), trilha da valsa, dreno (TRIBUTO e DECRETO), armadura da fase 2, SELO com projétil próprio, entrada dramática (156 ticks; 60 depois de continue) e casa de honra na grade de 10. Depois de derrotado, jogável.
- **Fila e elenco:** AMINU > CENTELLA > CAMILLE > NILA > BAATAR (lutador comum, 5º da fila). A Dança da Águia virou só a entrada e a vitória do BAATAR.
- **Esquiva:** ligada (`Regras.esquiva`). N (P1), O (P2), L1/L2 no controle, ESQ no toque. Custo 20.
- **Cinemática do especial:** COMPLETA (48 ticks) ou CURTA (20 ticks). Padrão COMPLETA; CURTA com `prefers-reduced-motion`.
- **Balanço** (`docs/balanco/`, sem esquiva, versão de dados `267890b2233a`): ZENON jogável 52,9% de vitória geral. Chefão: 31,4% no NORMAL e 19,1% no DIFÍCIL (meta 20-40%, só no NORMAL). Com esquiva (configuração de produção, `relatorios/balanco-esquiva/`, não versionado): 36,0% e 28,0%. **A confirmar** em rodada versionada.
- **Testes nesta revisão:** `npm run typecheck` limpo. `npx vitest run`: 66 arquivos, 1475 testes verdes. E2E: última rodada da Lyra, 145 passaram e 0 falharam (`docs/handoff-lyra-zenon.md`); não reexecutada aqui (regra: só a Lyra roda e2e).
- **Sprites:** `npm run sprites` executa (o import duplicado de `separarFundidas` não está mais no HEAD).
- **Docs desta passada** (Alexandria): `README.md`, `CHANGELOG.md`, `docs/arquitetura.md`, `docs/como-adicionar-um-lutador.md`, `PROGRESSO.md`. Alterações **não commitadas**, aguardando OK do dono.
- **Em aberto:** as decisões da seção "Decisões em aberto" (bloco do Zenon). E7 (celular), E8 (segurança e deploy), F4 a F7. Som do chefão não foi ouvido, só as chamadas foram conferidas.

## Estado em 2026-10-21 (noite, histórico: commit `c7437c1`)
- NO AR e no `main` (commit `c7437c1`, Pages #6 verde): os 9 lutadores (HAYATO A2, WEI LONG, MIN-JI nova, CAIO + AMINU, CENTELLA, CAMILLE, NILA e o chefão BAATAR), 6 cenários novos, escada do Arcade com 5 rivais + chefão, fila de desbloqueio AMINU > CENTELLA > CAMILLE > NILA, mecânicas E3 S0 a S5, pipeline de sprites F2, correções do Órion (storage, CSP, workflows). 833 testes unitários, e2e 95, e2e:build 5.
- Em andamento: E6a (harness `npm run balanco` + correções da SARPA, Vega), E7a (celular, Lyra), correção do import duplicado em `ferramentas/sprites/executar.mjs` (achado da Alexandria; `npm run sprites` está quebrado no HEAD).
- Docs novos (Alexandria): `README.md`, `docs/como-adicionar-um-lutador.md`, `docs/arquitetura.md`, `CHANGELOG.md`.
- Decisões que dependem do dono: licença do repositório (`LICENSE`); `sourcemap` público (virar `hidden` ao privar o repo); ressalvas de arte (joelhada no chute em salto do AMINU e da NILA f4, vitória do AMINU sem a corda, luva aberta da CAMILLE, agachado raso da CENTELLA, soco aéreo e golpe de antebraço do BAATAR); cor do efeito do HAYATO (amarelo-elétrico, a confirmar); Secret Scanning/Push Protection/2FA no GitHub. Balanceamento dos 9 e do chefão: E6, com o dono jogando.
- Fonte de geração de arte: Runway (Nano Banana 2.1); `docs/prompts-arte.md` ainda cita Gemini em §0 e §11 (nota no topo).

## Estado atual (2026-10-21, mais cedo)
- Código na `main` do GitHub (commit `3af66cc`): F1 porte fiel, logo, E1 a E4 da expansão, E3 S0+S1a (contratos C3 e primitiva do chefão, só em teste; produção segue com 4 lutadores e CHEFE null), persistência por ondas (ids desconhecidos preservados, `hi = max(v1, v2)`), UI pós-E3 (FASE 2! só na etapa `troca`, `spSeg`, render por ficha). 434 testes unitários, e2e 70 passam. Site de teste no GitHub Pages.
- Arte: ver o bloco "Arte em 2026-10-21" abaixo.
- Em andamento: F2 pipeline de sprites (Vega), curadoria e correção das folhas (Apolo). Seguem: E3 S1b a S5, E5 a E8, F3.
- Regra do dono (2026-10-21): TODO trabalho abre missão no painel e vai para o agente competente, sem exceção. O Atlas só executa o que os agentes não alcançam (ex.: MCP da Runway).

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
- Conta Runway nova conectada pelo dono. Modelo usado: Nano Banana 2.1, 4:3, 2K. Upscale e vídeo bloqueados no plano gratuito.
- Procedimento: enviar a imagem de referência (`init_upload` + `curl` + `complete_upload`), `generate_image` com UMA referência e o prompt de `docs/prompts/`, baixar o resultado para a pasta TEMPORÁRIA, medir (lilás restante, fundo, caixas das figuras) e só então copiar para `arte-fonte/` com o nome do prompt e a versão. Mostrar ao dono antes de seguir; Apolo cura.
- Piloto WEI LONG 1A: aprovado pelo dono (lilás 22.272 -> 95 px; fundo 98,5% magenta puro; figuras sem efeito a ≤2 px das originais). Salvo em `arte-fonte/lutadores/wei-long/folhas/wei-long-f4-especiais-v2.png`.
- WEI LONG folha de especiais: 1B (painel longo, `-v3`) e 1C (cor do painel mais escura, `-v4`, versão final; ressalva: a figura toda escureceu e as calças ficaram levemente marrom-arroxeadas). MIN-JI: mestra `min-ji-mestra-v1.png` aprovada (fundo verde 99,2% puro) e folha 1 `min-ji-f1-base-v1.png` gerada (traje fiel; fundo 97,9% puro; vão entre fileiras de 4 px e nenhum entre as fileiras 2 e 3, igual ou pior que as folhas canônicas do WEI LONG: a F2 precisa fatiar por componentes conexos, não por grade fixa).
- MIN-JI COMPLETA (mestra + folhas 1 a 4, 2026-10-20), em `arte-fonte/lutadores/min-ji/folhas/`: `min-ji-mestra-v1`, `-f1-base-v1`, `-f2-reacoes-v1` e `-v2`, `-f3-golpes-v1`, `-f4-especiais-v1`. Medidas: fundo verde 98% puro, nada encosta na borda, nenhuma folha é cópia da anterior. Folha 2: a v1 tinha o nocaute com a cabeça à DIREITA (spec: esquerda); a correção pelo Runway falhou (não espelhou e criou uma cabeça fantasma, descartada); a v2 é a v1 com a figura do nocaute ESPELHADA POR CÓDIGO (componente conexo, 92%, alinhada pela base; as outras 11 figuras idênticas, diferença 0). Opcionais ainda não gerados: folha 5 (extras) e efeito.
- HAYATO (2026-10-20): o dono escolheu a versão A com a exigência de NÃO lembrar o Ryu. A versão A do Apolo (gi branco + faixa + faixa preta + luvas) ainda lembrava o Ryu; foi gerada uma variante reforçada "A2" e o dono ESCOLHEU a A2: gi cinza-grafite com detalhes amarelo-elétrico, mecha de raio amarela no cabelo, faixa verde, faixa preta com borda amarela, mãos enfaixadas de branco, descalço, fundo magenta. Mestra salva em `arte-fonte/lutadores/hayato/folhas/hayato-mestra-v1.png` (fundo ≈ #FD2BFA, uniforme). `docs/prompts/03-hayato.md` descreve a A1 (gi branco): os prompts das folhas do HAYATO foram adaptados ao traje A2 por mim; o Apolo deve atualizar o arquivo. Folha 1 em geração.
- APROVADO pelo dono em 2026-10-20 ("aprovo também tudo que está pendendo dos outros personagens"): as decisões de mecânica da Nova ED-M1 a ED-M10 conforme a recomendação (NILA com postura GAJA/SARPA e MARMA como atordoamento; CENTELLA com RESORTE e sem salto na parede; GARKUWA sem conversão em carga; BAATAR jogável sem DEVEKH/MERGULHO; fase 2 troca o MERGULHO pelo →+ESP; gatilho da fase 2 na troca de barra; relógio mantido; HP 118 decidido pelo harness; empate repete o round; cortes menores aceitos). O Atlas gera as imagens de AMINU, CENTELLA, CAMILLE, NILA e BAATAR sem parar a cada mestra/folha 1, usando medição como filtro e mostrando cada lutador pronto. AINDA SEM RESPOSTA (não são de personagem): autorização de commit/push de tudo até a E4; rollback de onda (preservar ids desconhecidos); cursor da grade. A E3 (Vega, motor) só começa depois do commit.
- CENÁRIOS (2026-10-20): os 6 gerados pelo Atlas no Runway (2752x1536, 16:9) e salvos em `arte-fonte/cenarios/cenario-{jp,ng,mx,fr,in,mn}-v1.png`: Japão (castelo de cerejeiras), Nigéria (poços de anil de Kano), México (arena de lucha libre), França (Velho Porto de Marselha), Índia (Fort Kochi na monção), Mongólia (estepe do Naadam, sem paredes). Conferidos com linhas-guia a 70% e 87% da altura: chão plano e livre, objetos só nas pontas, sem pessoas em primeiro plano nem texto legível. Falta o Apolo conferir a curadoria. O `jp` novo substitui o `public/assets/cenarios/jp.jpg` (1600x900) na F3.
- HAYATO folha 1: a v1 saiu com os pés da fileira de baixo CORTADOS pela borda da imagem (3 de 4 figuras, base em y=1790 de 1791), sem vão entre fileiras e 2 quadros de andar viraram pulo; a v2 (prompt reforçado: "cada figura ~70% da fileira, vão >= 8%, pelo menos um pé no chão") não cortou nenhum pé (folga de 10 px), os quadros viraram passos, mas o modelo continua fazendo figuras de ~100% da altura da fileira e os vãos entre fileiras seguem de 0 a 5 px. Ambas salvas. LIÇÃO PARA O BLOCO A DO APOLO: o pedido de "80% da altura" é ignorado; o que funciona é exigir que dedos e pés nunca toquem a borda e "um pé sempre no chão"; a F2 deve fatiar por componentes conexos.
- Lição: edição pontual de uma célula pelo Runway pode ignorar a instrução e adicionar artefatos; para espelhar/mover uma figura recortada sobre fundo chapado, fazer por código (exato e sem custo).
- Permissão do dono (2026-10-20): o Atlas salva sozinho em `arte-fonte/` SÓ arquivos novos, com a versão no nome, nunca sobrescrevendo; continua parando para o OK do dono na imagem-mestra e na folha 1 de cada lutador.
- Observação para o Apolo: os prompts 3 a 5 mandam anexar DUAS imagens (mestra e folha 1); a lição do WEI LONG diz que duas anexadas podem fazer o modelo devolver a referência. Testar no Runway com tags e verificar.
- Regra de gasto: seguir a ordem de `docs/prompts/00-indice.md`, informar o saldo a cada lote e parar antes de zerar. Nada de gerar sem o dono saber.

### Arte em 2026-10-21 (tudo em `arte-fonte/lutadores/<id>/folhas/`, nomes com versão; os prompts agora vêm de `docs/prompts-arte.md` + `ferramentas/prompts/montar-prompts.mjs`, nunca editar `docs/prompts/` à mão)
- HAYATO completo (mestra A2 + f1 a f4; f2 v2 com nocaute espelhado por código). Os 4 novos têm mestra + f1 a f4 geradas; as 3 folhas dos novos que o Apolo mandou CORRIGIR foram devolvidas a ele para correção por código (espelhar "arremessado no ar" da CENTELLA f2 e da NILA f2, apagar linha de chão da CAMILLE f2 e traços da CAMILLE f4 e da NILA f2, juntar NILA f1: respiração da v1 + andar da v2). AMINU: f2 v2 (nocaute espelhado), f3 v2 regerada (corda só na mão de trás, jab com punho nu, soco agachado de fato agachado), f4 aprovada.
- BAATAR: mestra aprovada pelo dono em 2026-10-21 (`baatar-mestra-v1.png`); folhas B1 a B9 (3x2) geradas e salvas, em curadoria do Apolo.
- Lições novas: o modelo desenha linha de chão e traços de movimento mesmo com "NO effects" (detectar por contagem de componentes: tem que dar 12, ou 6 nas folhas do BAATAR); a pose "arremessado no ar" sai com a cabeça à direita (conferir como o nocaute); "crouching X" pode sair de pé (comparar alturas); em golpe de jab o modelo enfaixa os dois punhos (dizer "the BARE lead fist"); respiração de 4 quadros quase iguais só se acha medindo o topo da cabeça por figura; versões da mesma folha vêm em escalas diferentes (normalizar cada uma pela própria referência); cuidado ao copiar a URL assinada das imagens (um caractere errado dá 401).
- Ressalvas aceitas (decisão do dono se quiser refazer): chute em salto do AMINU e da NILA f4 saiu como joelhada; vitória do AMINU com o punho erguido sem corda; luva aberta da CAMILLE na rasteira; agachado pouco profundo da CENTELLA f2.

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
### Zenon e chefão (registrado pela Alexandria em 2026-10-21, para o dono e o Atlas decidirem)
1. **Escala do ZENON (1,36) x poses de vitória.** Medido no navegador (Lyra): as poses `win` e `vitoria1` ficam com o topo do sprite a 4,5 px e 2 px acima da base dos nomes do HUD (y 77). Só encostam nos nomes quando o ZENON está nos cantos da arena (nomes em x 110-175 e 800-854). Opções: (a) manter 1,36 e aceitar; (b) `scale` 1,32, que dá 7 px de folga sem mexer na arte. O critério "inclusive `win`" só fecha em (b). Não testado: a escala 1,42.
2. **Cinemática CURTA como padrão em toque.** Hoje o padrão é COMPLETA em todos os aparelhos. CURTA só entra com `prefers-reduced-motion` ou com a preferência salva. A entrada do chefão em CURTA e a cinemática em CURTA não foram medidas em aparelho.
   - **Dado conhecido:** a entrada COMPLETA do chefão tem 156 ticks (2,6 s) e esconde o HUD durante a entrada. O custo em aparelho de toque não foi medido.
   - **Como fica se mudar:** `CINEMATICA_PADRAO` (`src/core/contratos.ts`) e o padrão de `src/ui/cenas/fight.ts`, que hoje repete `'completa'` literal.
3. **Contraste do ZENON jogável em cn, kr e mx.** Razão de luminância do corpo com o fundo: cn 1,37, kr 1,34, mx 1,34 (o casaco preto sobre fundo médio). Acima de 1,5: gr 1,64, jp 2,52, br 3,05, fr 4,09 (o mínimo de 1,5 é o do Apolo). O chefão luta sempre no `gr`, então o problema só aparece se o ZENON jogável lutar nesses três. Opções: aceitar, ou pedir ao Apolo luz ou piso mais claros nesses cenários.
4. **Andar do ZENON pode patinar (critério S2 v2).** Idle com 2,5 px de desvio (critério da spec: até 4). Andar com 11,8 px no atlas, cerca de 7 px na tela (critério: até 8 px). A âncora pelo tronco foi testada e descartada (piorou). A saída é a passada alternada (S2 v2), que o Apolo já previu. Opções: fazer S2 v2 agora ou aceitar o andar como está e olhar no jogo.
5. **Nomes de especiais estouram o painel da seleção.** 13 de 30 nomes passam da borda (ex.: `SELO DO ARCONTE` com 117 px e `COLUNA DE ÔNIX` com 119 px, para cerca de 98 disponíveis). Inclui os 4 originais. Corrigir só nos novos é possível, mas o e2e de fidelidade pixel a pixel dos originais quebra se a fonte mudar. Opções: encolher a fonte só dos novos (com regra própria) ou em todos, aceitando atualizar o e2e de fidelidade.
6. **Fala de derrota só no KO?** Hoje a derrota do chefão (`falaDoChefe`, `src/render/apresentacao-lutadores.ts`) aparece no KO, mas também em `roundend` e `matchend` sempre que o chefão perde um round (inclusive por tempo) ou a luta. A vitória também aparece em `roundend` quando ele vence um round. A intenção registrada era derrota só no KO final. Opções: (a) restringir a derrota ao KO e a vitória ao `matchend`; (b) manter o comportamento atual e documentar.
7. **Cinemática DESLIGADA e a entrada do chefão.** Com a cinemática DESLIGADA, a entrada do chefão ainda roda, em CURTA (`src/ui/cenas/fight.ts`, `modoDaEntrada`). O comentário da função diz que é intencional. Opções: manter (a entrada é a apresentação do chefe) ou desligar a entrada junto com a cinemática.
8. **Qual balanço é a referência.** `docs/balanco/` é a rodada sem esquiva. A produção tem `Regras.esquiva` ligada. Opções: regerar `docs/balanco/` com a esquiva (`npm run balanco -- --completo --esquiva --saida docs/balanco`) ou versionar as duas rodadas. A decisão de rodar e gravar fica com o Atlas, porque a saída é versionada.

### Decisões anteriores (2026-10-20)
- D4 APROVADA em 2026-10-20 (proposta em `docs/proposta-wei-long.md`): conjunto canônico = folhas 153007 (base), 153112 (reação), 153710 (golpes), 153054 (especiais); descartadas 153049, rncovy.jfif, 8hwvqp.jfif. A 153710 entra como está no MVP (braçadeira marrom, faixa, barba longa). A ombrada do TIE SHAN KAO fica como soco com aura por enquanto.
- Edição de arte ainda obrigatória antes da F3: folha 153054 — tirar os efeitos lilás desenhados (coerente com D2) e passar para painel longo. A troca do quadro L3C2 por ombrada foi adiada pelo dono. Prompts na seção 4 da proposta. Depende de o dono gerar a edição; sem missão aberta até lá (bloqueio real: depende do dono).
- Adiado (pós-MVP): edição da 153710 (braçadeira preta, sem faixa, barba mais curta), quadro de soco no ar, arte da ombrada.
- Poses sem cobertura no WEI LONG: soco no ar, agachamento antes do pulo, agachado fundo (reaproveitar aterrissagem).
- Efeitos (cabeça de dragão, onda de chão): asset à parte, fundo preto, mistura aditiva `lighter`.
- D6: detalhes da infra própria (servidor, forma de deploy) antes da F6.

## Decisão do dono em 2026-10-21 — repositório público (M2 do Órion)
- O repositório `InnovareCode/InnoFighters` FICA PÚBLICO por enquanto (docs, `PLANO.md`, `PROGRESSO.md`, `.claude/agent-memory` e a arte de `public/assets` visíveis). Reavaliar ao entrar no EasyPanel (D6): privar o repo, desligar o Pages, `sourcemap:'hidden'`.
- Enquanto for público: nenhum id de conta, créditos ou e-mail de serviço nas memórias dos agentes nem nos docs. Secret Scanning, Push Protection e 2FA são conferências do dono no GitHub (o Atlas não alcança essas configurações).

## Armadilhas já conhecidas
- Chefão (ZENON): `FichaDef.mods` é raso por golpe (espalhe `MODS_BASE`); caixa de acerto de sprite alto com `bh` pequeno não conecta; escala acima de 1,1 exige `escalaDeVitrine` na vitrine. Ver `docs/como-adicionar-um-lutador.md`, passo 6b.
- Linha 320 do protótipo tem 9,3 MB (ASSETS em Base64): nunca usar Read nela; para espiar, `awk 'NR==320{print substr($0,1,300)}'`.
- Folhas de sprite de IA vêm sem transparência e sem escala consistente; o pipeline de recorte e marcação (pés, ponta do golpe) é fase própria.
- Caixas de acerto derivam da ponta do golpe na arte: trocar a arte muda o balanceamento.
- No protótipo `tipX/tipY` já estão em escala de tela; o manifesto novo guarda px da imagem. Converter uma única vez, no carregamento.
