---
name: project-trailer-abertura
description: Spec do trailer de abertura no motor (docs/spec-trailer-abertura.md, 2026-10-22): Games próprios com semente constante, escalação automática M2, relógio do áudio, ≤2 atlas não fixos, D-T1..D-T8
metadata:
  type: project
---

Em 2026-10-22 entreguei `docs/spec-trailer-abertura.md` (proposta, nada implementado). Dono decidiu: montagem no motor (sprites reais, sem vídeo de IA).
- Trailer = cena nova `trailer` atrás de `Regras.trailer` (false em `?expansao=4`): a `CenaIntro` é oráculo de pixel do fidelidade-ui e NÃO muda.
- Cada plano é um `Game` NOVO (máx. 2 vivos), semente CONSTANTE do roteiro, nunca `mundo.game` nem rngs da sessão (+0..+6). `src/fight` intacto.
- Mecanismo recomendado M2: CPU×CPU + ferramenta offline `trailer:escalar` que acha sementes/janelas com as batidas pedidas e grava
  {semente, cpu, inicio, batidas, impressao}; CI confere; em execução batida ausente = segue sem câmera lenta (nunca quebra).
- Cinemática só nas batidas marcadas (duração constante → escalação reproduz sem a classe de render).
- Relógio: estado = função do tick; com áudio, o `AudioContext` decide QUAL tick vai à tela (música entra no compasso seguinte no iOS).
- 25 compassos a 150 BPM (24 ticks/tempo, 2400 ticks). Novos sempre pareados com um fixo; P8 (retratos) é folga para a carga do ZENON.
- Medido: Game CPU×CPU 5–12 µs/tick no desktop; luta inteira 12–70 ms → pré-rolagem fatiada (2 ms/quadro) é barata.
- Memória: vitrine fixa 110 MB; ZENON 60 MB (4 págs 2048×1920), BAATAR 52; regra ≤2 não fixos, BAATAR+ZENON nunca juntos.
  `leitorDeRede.imagem` resolve no onload (decodifica no 1º drawImage) → propus `im.decode()`.

**Why:** o trailer não pode deslocar sequência nenhuma do jogo (replays, fidelidade) e tem que sobreviver a rebalanceamento sem retrabalho manual.
**How to apply:** na revisão, conferir `git diff src/fight` vazio, isolamento dos rngs, e2e antigos com `?trailer=0` (risco R1), e quais D-T o dono respondeu
no PROGRESSO.md. Relacionado: [[project-chefao-zenon]], [[project-esquiva-cinematica]], [[project-chefoes-progressivos]], [[project-armadilhas-arte]].
