# Handoff — Apolo — curadoria da 1ª entrega do WEI LONG (2026-10-20)

## RESULTADO
- **`8b788295` (tentativa do Prompt 1): REPROVADA.** Conferi a olho: é a folha 153007 (4 quadros parados na base de
  cavalo + 8 de andar, com a grade escura), quase idêntica, sem nenhuma pose de especial. Confirma a medição do Atlas
  (diferença média de 8,6 contra a 153007). Causa provável: com 2 imagens anexadas, o Gemini devolveu a de referência
  (ou a folha anexada foi a errada). Não salvar.
- **`1bcee91a` (Prompt 2, efeito do dragão): APROVADA.** Medido com PowerShell/System.Drawing na imagem do chat:
  - fundo fora da faixa dos dragões com brilho máximo 2/255;
  - 4 quadros separados em x 32-261, 305-553, 587-858 e 896-1161 (sem encostar);
  - nenhum personagem;
  - média dos pixels brilhantes RGB(177,124,216), lilás coerente com `fire` do WEI LONG;
  - bocas viradas para a direita.

  Ressalvas:
  - veio comprimida (1200×896 JPG); falta o original do Gemini em `arte-fonte/lutadores/wei-long/fx/wei-long-fx-v1.png`;
  - o quadro 3 é o maior e o 4 se dissipa: quadros 1-3 = voo, 4 = dissipação.
- **Prompt 1 dividido em 1A e 1B**, com uma única imagem anexada em cada:
  - 1A remove os efeitos, partindo da 153054, e gera a v2;
  - 1B só alonga o painel até a canela, descrito em palavras e sem imagem de referência, e gera a v3.

  O veredito ficou no topo de `docs/prompts/01-wei-long.md`. A fonte é `docs/prompts-arte.md` §5.1, entre os marcadores `veredito-wei`.
- Regerado com `ferramentas/prompts/montar-prompts.mjs`.
- **Verificação** (`verificar-prompts.mjs`): `OK: nenhuma falha`. Prompts por arquivo:

  | Arquivo | Prompts |
  |---|---|
  | 01-wei-long | 3 (1A, 1B, 2) |
  | 02-min-ji | 7 |
  | 03-hayato | 13 |
  | 04-aminu | 7 |
  | 05-centella | 7 |
  | 06-camille | 7 |
  | 07-nila | 7 |
  | 08-baatar | 11 |
  | 09-cenarios | 6 |

  O verificador ganhou 3 checagens:
  - aceita rótulos 1A/1B em sequência;
  - exige o veredito no topo do arquivo do WEI LONG;
  - exige "UMA imagem só" no campo Anexar das etapas 1A e 1B.

## PARA O PRÓXIMO
- **Atlas → dono:**
  - rodar a 1A anexando só a `...153054.jpg` e enviar o resultado;
  - depois do OK, rodar a 1B anexando só a v2;
  - salvar o original do efeito em `fx/`.
- **Lyra:** o efeito do dragão está aprovado como asset em fundo preto (mistura `lighter`). Usar ou não é decisão dela (D2).

## PENDÊNCIAS
- Conferir o original do efeito em resolução cheia. Medi só a cópia comprimida do chat.
- Se a 1B alterar rostos ou poses de novo, fazer a túnica em duas metades (linhas 1-2, depois a linha 3).

## APRENDIZADO
- **Gemini com 2 imagens anexadas pode ecoar a referência em vez de editar a primeira.** Edição = uma imagem anexada
  por vez, e o detalhe de traje vai descrito em palavras.
- Ao curar, comparar o que voltou com **todas** as folhas de origem, não só com a pedida. O Atlas mediu a diferença
  média contra cada folha, e isso identificou na hora qual delas tinha voltado.
