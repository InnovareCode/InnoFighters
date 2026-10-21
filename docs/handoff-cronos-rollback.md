# Handoff Cronos — rollback de onda e recorde na migracao (pendencias 1 e 2 da E2)

RESULTADO:
- Verificado: `npm run typecheck` limpo; `npm test` 23 arquivos / 398 testes verdes (rodado com os arquivos do Vega no estado em que estavam). E2E NAO rodado (combinado). Nada testado em navegador: nada daqui e consumido pela UI ainda.
- (1) Rollback de onda — `src/meta/progresso.ts`, `src/meta/tipos.ts`, `src/meta/index.ts`:
  - `Progresso` ganhou o campo OPCIONAL `desconhecidos?: string[]` (opaco; ausente quando vazio, entao o formato em disco e os `toEqual` antigos nao mudam).
  - `sanearProgresso` nao descarta mais id fora do roster: se tem a forma de id (`/^[a-z0-9][a-z0-9-]{0,31}$/`), nao e inicial, nao repete e cabe em `MAX_IDS_DESCONHECIDOS` (32, exportado), vai para `desconhecidos`. Nao-string, forma invalida (`__proto__`, maiuscula, espaco, >32 chars) e excesso continuam descartados. Mantem os primeiros, na ordem.
  - So os conhecidos afetam a UI: `desbloqueados`/`vistos`/`liberados`/`naoVistos`/fila nao veem `desconhecidos`.
  - Reavanco: o saneamento le `desbloqueados` cru + `desconhecidos` cru; o que passou a existir no roster e promovido a `desbloqueados`.
  - `aplicarVitoriaArcade` copia `desconhecidos` para o novo progresso (`marcarVistos` ja preservava por spread). `salvarDadosV2` ja saneava antes de gravar, entao o save do build antigo regrava os desconhecidos.
- (2) Recorde — `src/core/storage.ts` (`carregarDadosV2`): com v2 valida, `hi = max(v2.hi, v1.hi)`. Se a v1 for maior, regrava a v2 (best-effort; se a escrita falhar devolve o maior em memoria e nao apaga nada). Nunca escreve na v1. Se v1 <= v2, a v2 fica intocada byte a byte. v1 invalida/`hi` lixo conta 0. A cadeia v2 corrompida/v1/legada ja devolvia o `hi` da fonte usada (inalterada).
- Testes: `tests/unit/storage-v2.test.ts` (blocos novos "rollback de onda preserva desbloqueios desconhecidos" e "recorde ... = max(v1.hi, v2.hi)"; 2 testes antigos ajustados porque o descarte virou preservacao) e `tests/unit/progresso.test.ts` (3 casos de saneamento/promocao/liberados).

PARA O PROXIMO:
- Lyra (E4): nada muda na API. `prog.desconhecidos` e so persistencia: nao renderizar, nao usar em `liberados`. Se montar `Progresso` na mao, o campo e opcional. Ao gravar, passe o `prog` inteiro (nao reconstruir so com os 4 campos, ou o ganho futuro some).
- Vega/Nova (E5): ao colocar os ids novos em `IDS_LUTADORES`/`FILA_DESBLOQUEIO`, quem ja tinha o id em `desconhecidos` (ou em `desbloqueados`) o recebe como desbloqueado no proximo load, sem migracao. Ids novos devem respeitar `/^[a-z0-9][a-z0-9-]{0,31}$/` — senao nao sobrevivem a um rollback.

PENDENCIAS:
1. Selo NOVO!: `vistos` so guarda ids conhecidos, entao um id promovido de `desconhecidos` reaparece como NAO visto uma vez. Aceito (custo: um selo a mais); guardar `vistos` desconhecidos exigiria mais um campo.
2. Rollback para build SEM este codigo (v2 da E2 pura): ele descarta os ids no load e apaga no proximo save. A protecao so vale a partir de builds com esta mudanca — entao ela precisa estar no build da onda 1.
3. `hi` da v1 so e considerado quando a v2 ja existe e e valida; a chave legada (`sakura-fighters-v4`) nao entra no max (so e lida quando nao ha v2/v1 validas).
4. `inno-fighters-v1` segue como divida: apagar numa release futura estavel (junto some o efeito do max).

APRENDIZADO:
- Causa raiz da perda: o saneamento tratava "id fora do roster" como lixo, mas num lancamento em ondas ele tambem e dado legitimo de um build mais novo. Solucao: separar lixo (forma invalida/excesso) de desconhecido plausivel, guardar este em campo opaco e limitado, e promove-lo quando o id passar a existir. Campo opcional/ausente-quando-vazio manteve o formato e os testes antigos.
- Mesmo padrao do recorde: dado gravado por um build alternativo (v1) nao pode ser sobrescrito pelo build novo em silencio; reconciliar com max e regravar so a chave nova.
