---
name: project-sons-por-lutador
description: Spec de sons por lutador (docs/spec-sons-por-lutador.md, 2026-10-21): camada de identidade DEPOIS de sonsDoEvento (lock-step), régua espectral calibrada antes do som, D-S1..D-S9
metadata:
  type: project
---

Em 2026-10-21 entreguei `docs/spec-sons-por-lutador.md` (proposta, nada implementado). Dono decidiu: sons sintetizados no código.
- Travas: `luta-fidelidade.test.ts:175` compara `sonsDoEvento` com o protótipo tick a tick, e `audio.test.ts` compara o grafo inteiro
  (inclusive `init()`). Por isso: `sonsDoEvento`, `init()` e os métodos antigos NÃO mudam; a identidade é `planoSonoro(ev, ctx)` puro
  que diz o que manter/acrescentar, chamado por `reagirComIdentidade`; o limitador só por dependência do construtor (padrão false).
- Voz nova = `vozFormante` (trato `k`, 3 formantes, contorno, vibrato, aspereza, sopro, coro, formante extra) como tipo 'V' em
  `ChamadaReceita`. Dados em `src/data/sons/` (Record<IdLutador> + 33 assinaturas com as chaves de IDENTIDADES), validados no boot.
- O `projectile` não traz golpe: resolve por (id, ficha, style). Variação = hash sem estado com semente + 6.
- Prova (rev. 2, depois que a S0 da Vega reprovou a rev. 1): formantes fixos e estreitos fazem a TRANSPOSIÇÃO mudar
  brilho/envelope (piso medido dos sons de hoje 0,67/0,96/0,83, positivo mínimo 2,15). Decidi: vozes comparadas com o TOM
  IGUALADO (perfil copiado com f0 = 175 Hz, KO sem gongo, P só em voz pura); efeitos com tau relativo 1,5 (1,56x o piso) e
  sem P. Portão S0b: voice() a 175 Hz [380,850] x [720,1150] >= 1,5, senão a régua é cega e volta para mim. Recusei estreitar
  os controles (opção B): seria escolher o controle para passar.
- Com a chave ligada, a abertura da tarja e o som da SessaoEspecial calam (fight.ts:103 e 116-128); a batida fica.

**Why:** mudar `sonsDoEvento` quebraria a prova mais forte do projeto; e régua ajustada depois de ouvir não prova nada.
**How to apply:** ao revisar a Vega, conferir S0 antes de S2/S3, escalas congeladas com números, `git diff src/fight` vazio,
ligações em fight.ts só depois da provocação da Lyra. Ver no PROGRESSO.md quais D-S o dono respondeu.
Relacionado: [[project-provocacao]], [[project-esquiva-cinematica]], [[project-chefao-zenon]].
