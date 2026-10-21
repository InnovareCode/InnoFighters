# Prompts de arte — índice

Um arquivo por personagem, cada prompt já **completo**: é só copiar o bloco inteiro. Não é preciso montar nada.
Fonte técnica: `docs/prompts-arte.md` (estes arquivos são gerados a partir dela por `ferramentas/prompts/montar-prompts.mjs`
e conferidos por `ferramentas/prompts/verificar-prompts.mjs`; mude a fonte, nunca estes arquivos à mão).

**Gerador atual: Runway, modelo Nano Banana 2.1, paisagem 4:3, 2K** (6 créditos por imagem; 4K custa 12). A imagem-mestra
é retrato 3:4 e os cenários são 16:9. Quem gera é o Atlas, com o dono sabendo do saldo a cada lote.

## Ordem de geração

| Prioridade | O quê | Arquivo | Quantas imagens | Status |
|---|---|---|---|---|
| 1 | WEI LONG — edição da folha de especiais | 01-wei-long.md | 3 edições (1A, 1B e 1C); efeito já entregue | CONCLUÍDO: `wei-long-f4-especiais-v4.png` é a final · efeito APROVADO, falta salvar o original |
| 2 | MIN-JI — 4 folhas novas | 02-min-ji.md | 1 mestra + 4 folhas (+1 opcional, +1 efeito) | mestra e folhas 1-4 GERADAS (f2 com nocaute espelhado por código) · folha 5 e efeito: opcionais |
| 3 | HAYATO — 4 folhas novas, traje A2 | 03-hayato.md | 1 mestra + 4 folhas (+1 opcional, +1 efeito) | mestra A2 APROVADA pelo dono · folhas 1-4 GERADAS (f1 e f2 com v2), aprovação no `PROGRESSO.md` · folha 5 e efeito: opcionais |
| 3 | Cenário do Japão | 09-cenarios.md (prompt 1) | 1 | GERADO (`cenario-jp-v1.png`), falta curadoria |
| 4 | AMINU (fundo verde) | 04-aminu.md | 1 mestra + 4 folhas (+1 opcional, +1 efeito) | pronto para gerar (tudo liberado) |
| 4 | CENTELLA (fundo magenta) | 05-centella.md | 1 mestra + 4 folhas (+1 opcional, +1 efeito) | pronto para gerar (tudo liberado; folha 5 sem salto na parede, ED-M2) |
| 4 | CAMILLE (fundo verde) | 06-camille.md | 1 mestra + 4 folhas (+1 opcional, +1 efeito) | pronto para gerar (tudo liberado) |
| 4 | NILA (fundo verde) | 07-nila.md | 1 mestra + 5 folhas (+1 efeito) | pronto para gerar (tudo liberado; folha 5 da serpente é obrigatória, ED-M1) |
| 5 | BAATAR, chefão (fundo verde) | 08-baatar.md | 1 mestra + 9 folhas (+1 efeito) | pronto para gerar (tudo liberado) |
| 6 | 5 cenários novos (Nigéria, México, França, Índia, Mongólia) | 09-cenarios.md (prompts 2-6) | 5 | GERADOS (`-v1`), falta curadoria |

As antigas marcas de espera caíram em 2026-10-20: o dono aprovou as mecânicas ED-M1 a ED-M10 (`docs/mecanicas-e3.md`),
e com isso as folhas 4, as folhas 5, as folhas B7 a B9 do BAATAR e os efeitos estão liberados.

## Regras que valem para tudo

1. **Uma só imagem de referência por prompt**, a indicada em "Anexar" (nas folhas, a imagem-mestra aprovada). Com duas
   anexadas, o modelo devolve uma delas em vez de gerar a folha nova (aconteceu no WEI LONG).
2. **Bloco IMPORTANT SPACING em todo prompt de folha nova** (já vem dentro do texto): figura com cerca de 70% da altura
   da fileira, faixa vazia de pelo menos 8% entre as fileiras e nas bordas, pés e dedos nunca cortados. Junto vem a
   regra do andar: **pelo menos um pé no chão em todo quadro**, para o passo não virar pulo.
3. **Fundo por lutador**, sempre uma cor chapada (nunca "transparente"): **verde** `#00FF00` para MIN-JI, AMINU, CAMILLE,
   NILA e BAATAR; **magenta** `#FF00FF` para WEI LONG, HAYATO e CENTELLA. O recorte mede o fundo real por pixel.
4. **Nocaute com a cabeça à ESQUERDA.** Se vier à direita (aconteceu com a MIN-JI e com o HAYATO), não gere de novo
   nem corrija pelo gerador: o Atlas espelha só essa figura por código e salva como versão nova (`-v2`).
5. Dentro de cada personagem, siga a numeração dos prompts. Depois da imagem-mestra e da folha 1, **pare e espere o OK do dono**.
6. Se a folha vier quase boa, use os prompts de correção do próprio arquivo, **um defeito por vez**. Não gere do zero.
7. Baixe o resultado para uma pasta temporária, meça (fundo, vãos, pés na borda) e só então copie para `arte-fonte/`
   com o nome indicado e a versão no nome. Nunca sobrescreva uma versão anterior.

## Contagem de prompts por arquivo

| Arquivo | Prompts numerados | Prompts de correção |
|---|---|---|
| 01-wei-long.md | 3 | 12 |
| 02-min-ji.md | 7 | 12 |
| 03-hayato.md | 7 | 12 |
| 04-aminu.md | 7 | 13 |
| 05-centella.md | 7 | 13 |
| 06-camille.md | 7 | 12 |
| 07-nila.md | 7 | 12 |
| 08-baatar.md | 11 | 12 |
| 09-cenarios.md | 6 | 3 |

## Finais do Arcade dos 4 atuais

O rascunho para aprovação está em `docs/prompts-arte.md` §13 (não é prompt de imagem).
