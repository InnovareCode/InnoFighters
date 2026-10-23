---
name: project-residencia-memoria
description: Spec da residência de memória na luta (docs/spec-residencia-de-memoria.md, 2026-10-23) — tabela pura por cena, luta exclusiva, jp sai da luta, teto 136 fora da luta, política 'fixa' x 'por-peso', fatias L1-L7, D-R1..D-R6
metadata:
  type: project
---

Escrita em 2026-10-23 (HEAD a7b22a0), nada implementado. Pré-requisito para ligar `motorV2.filmes` em produção.

Decisões e porquês que não estão no código:
- **Achado do `jp`**: é o fundo de todos os menus e `main.ts` guarda `rec.cenarioPadrao` por referência no boot → nunca sai. Com o `jp`
  fixo, 9 pares comuns passam de 115 (pior NILA x AMINU 120,7); soltando-o na luta, nenhum (112,8). Por isso: jp sai, pré-recarga no
  fim da luta (matchend + filme parado, junto com soltar FILME) e `rec.cenarioPadrao` vira getter com reserva 1x1 (D-R1).
- Escolhi tabela pura `arteDaCena(nome,args)` em `src/ui/residencia.ts` aplicada no `Navegador.set` (mesmo padrão de `trailer/carga.ts`),
  não regras espalhadas nas cenas: o bug de hoje (`fixos`) é exatamente regra esquecida no exit.
- Teto fora da luta 136 MiB = estado do título de hoje (vitrine 102 + 4 cenários 31,6); 6c (≤150 fora da luta) NÃO fecha (D-R3).
- Despejo antes de decodificar; ordem: não preferidos LRU → cenários não preferidos → cenários preferidos (br,kr,cn,jp) → vitrine
  (caio,min-ji,wei-long,hayato). `preferir` nunca despeja preferido nem em uso.
- Rollout: política `'fixa'` (hoje byte a byte, Navegador sem espera no preto) é o padrão até a L6; `?residencia=` também em produção (A/B
  no iPhone, rollback).
- Critério: `memoria().imagens` + 17,9 de base; WS A/B com decodificação forçada (Chromium só decodifica no 1º desenho) ≥ 0,6× a
  diferença analítica; WeakRef morta após GC prova que não sobrou referência.

**Why:** a Íris mediu 135-255 MiB por luta; o excesso é exatamente vitrine + cenários fixos.
**How to apply:** fatias L1→L2→L3→L4∥L5→L6 (Lyra); BAATAR x ZENON só fecha com T10/OR-4 (Vega). Conferir no PROGRESSO as D-R.
Relacionado: [[project-orcamentos]], [[project-trailer-abertura]], [[project-revisao-motor-luta]].
