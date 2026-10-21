# Handoff Vega — V1 + V2 · contratos C2/C3, motor da ESQUIVA, eventos da CINEMÁTICA do especial (e a CPU da esquiva)

Data: 2026-10-21. Sem commit. Base: `docs/spec-esquiva-e-cinematica-especial.md` (Nova), `docs/identidade-visual-especiais.md` (Apolo, "Pendências") e os acréscimos do Atlas (a a e).
Não toquei em `src/ui`, `src/render`, `src/input`, `tests/e2e`. Tudo da esquiva fica atrás de `ConfigPartida.esquiva` (desligada por padrão): snapshot CPU x CPU (semente 42) e `luta-fidelidade` seguem verdes **sem `-u`**.

## RESULTADO

### Contratos (src/core/contratos.ts, dono: Vega; a Lyra só lê)

**Regra de leitura:** os campos novos dos eventos e de `LutadorLeitura` são **opcionais NO TIPO** (para não quebrar os eventos/leituras que os testes da Lyra fabricam à mão) mas o **motor SEMPRE os preenche** (exceto onde o texto diz "só quando"). Pode tratar como presentes.

- **C2** `InputFrame.esq?: boolean`: borda de descida do botão ESQUIVA. Ausente = false. `INPUT_VAZIO` e `NO_INPUT` NÃO ganham o campo. Direção: **frente segurada = avanço; trás, neutro, ↓ ou ↑ = recuo** (a direção é lida no tick em que a esquiva sai, não no tick do aperto). A Lyra preenche `esq` em `input/teclas.ts` (teclas `n` P1, `o` P2, L1/L2 no pad, botão ESQ no toque). Ignorado pelo motor antes de qualquer conta se a esquiva está desligada.
- **`ConfigPartida.esquiva?: boolean`** (padrão false) → `Game.esquivaLigada`. Quem liga é a UI (`Regras.esquiva`).
- **`EstadoLutador`** ganha `'esquiva'` (nunca ocorre com a flag desligada).
- **`LutadorLeitura.esquiva?: 0 | 1 | -1`**: 1 = avanço, -1 = recuo, 0 = não esquiva (sempre 0 sem a flag). Invulnerável agora = `invuln > 0` (já publicado). Nesse estado `pose.name` é `crouch` (janela, com `rot` = ±0,12: avanço +, recuo −) ou `land` (recuperação); o `Fighter.trail` já recebe rastro durante a esquiva.
- **`ProjetilLeitura.especial?: true`**: projétil lançado por golpe de ESPECIAL (nome do golpe começa com 's'); ausente nos demais.
- **Tipos novos exportados:** `EntradaTarja = 'lateral' | 'cima' | 'baixo' | 'rival'`, `MomentoCinematica = 'inicio' | 'sucesso'`, `EventoSpecial`.
- **Dados exportados para a UI:** `ESQUIVA_PADRAO` (`src/data/esquiva.ts`: `custo 20`, `buffer 6`, `tras {dur 22, invIni 0, invFim 14, dist 120}`, `frente {dur 26, invIni 3, invFim 19, dist 150}`), para o marcador de 20 no HUD e o botão `.sem` (`en < ESQUIVA_PADRAO.custo`). `apresentacaoDoEspecial(id, ficha, golpe)` e `todasAsApresentacoes()` (`src/data/apresentacao-especiais.ts`).

### Eventos novos (só com a esquiva ligada)

| Evento | Campos | Quando / receita (spec 2.3) |
|---|---|---|
| `esquiva` | `lutador`, `dir: 1 \| -1` (1 = avanço), `x` | ao começar. Poeira em (x, 7, 1) (o motor já emite o `dust`), flash curto em `fire[0]`, som `swing(1)` (já mapeado em `audio/eventos.ts`) |
| `esquivou` | `lutador` (quem esquivou), `atacante`, `x`, `y`, `projetil: boolean` | um golpe/projétil sobrepôs a hurtbox de quem está na janela INVULNERÁVEL. **Uma vez por golpe (atkId) / projétil (id) em cada esquiva.** Texto `ESQUIVOU!` (`#bfe9ff`, 20) no `lutador`, som `uiSelect(1.4)` (mapeado). Sem energia, sem pontos |
| `deny` (já existia) | `lutador` | esquiva pedida com `en < 20`: nada é gasto, o botão guardado é descartado |

### Campos novos em eventos que já existiam (SEMPRE emitidos; não mudam som nem snapshot)

| Evento | Campo novo | Significado |
|---|---|---|
| `special` | `golpe` | chave de `ch.moves` que começou (`sFire`/`sDown`/`sFwd`). Nome/pose/cor: `chDaFicha(ch, ficha).moves[golpe]` |
|  | `ficha` | ficha de quem atacou (null = base) |
|  | `momento` | `'inicio'` (padrão) ou **`'sucesso'` (PARADE e GARKUWA): a UI NÃO abre a cinemática neste evento**; abre no `parry` / `clash` (abaixo). A MASHI é `'inicio'`: a cinemática abre ao começar a carga |
|  | `quadro?`, `entrada?` | da tabela do Apolo (só quando há registro): quadro do atlas para o recorte da tarja e `EntradaTarja` (ausente = lateral) |
| `hit` | `dano` | vida tirada por ESTE acerto (hp antes − depois, com escala de combo e contragolpe; na troca de barra do chefe, o que saiu da barra que acabou) |
|  | `especial?: true` | acerto de especial: corpo a corpo cujo nome começa com 's' (**inclui o FOUETTÉ `sResp`**) ou projétil de um |
|  | `golpe` | golpe que acertou (num projétil, o que o lançou) |
|  | `nivelCarga?: 1\|2\|3` | só em golpe `carga` (MASHI): o nível aparece no acerto |
| `throw` | `dano`, `especial?: true`, `golpe` | **acréscimo (a):** agarrões de especial (ARREMESSO DO AVARGA, ABRAÇO DA ESTEPE, HURACANRANA) levam dano e `especial`. O arremesso comum (→+HP) leva `dano` e `golpe: 'throw'`, **sem** `especial` |
| `armor` | `dano`, `golpe`, `especial?` | `dano` = absorvido pela armadura; mostrar em cinza, **não conta acerto** |
| `block`, `quebra-guarda` | `golpe`, `especial?: true` | defesa de especial: **nenhum número, nenhum contador** (B11); a tarja/vinheta saem de qualquer jeito |
| `parry` | `golpe`, `continua?`, `quadro?`, `entrada?` | **acréscimo (b)/(c):** `golpe` = o golpe do DEFENSOR que aparou (`sFire`, PARADE) = **o SUCESSO que dispara a cinemática dela**; `continua: 'sResp'` = o FOUETTÉ segue a MESMA sessão (seus `hit` vêm com `golpe: 'sResp'` e `especial: true`) |
| `clash` | `lutador?`, `golpe?`, `quadro?`, `entrada?` | **acréscimo (c):** só no escudo da GARKUWA que absorveu um projétil: dono do escudo e `golpe: 'sDown'` = SUCESSO que dispara a cinemática. O choque de dois projéteis NÃO leva esses campos |

### Como a sessão do especial (Lyra) deve usar isto

1. **Abre** em `special` com `momento === 'inicio'`; ou em `parry` (defensor = `lutador` da sessão, `golpe`) / `clash` com `lutador` presente (os dois casos de `momento === 'sucesso'`; o `special` desses golpes só toca o som e gasta energia).
2. **Conta** `hit` e `throw` com `especial: true` do atacante da sessão (o `dano` soma no "TOTAL"). Para a PARADE aceite também `golpe === 'sResp'` (ou `parry.continua`) como continuação, mesmo com `fighters[i].move !== golpe`.
3. **Não conta** `block`, `parry` (do atacante), `quebra-guarda`, `esquivou`; `armor` mostra `dano` em cinza sem contar.
4. A MASHI: o selo do nível vem de `hit.nivelCarga`; a cinemática abre quando a carga começa.
5. `ProjetilLeitura.especial` diz se ainda há projétil de especial vivo (fechar a sessão).

### Motor da ESQUIVA (V2, `src/fight/fighter.ts`, `game.ts`)

- Entrada: botão guardado `bufEsq` de **6 ticks** (separado do `buf` de ataque de 9), só decai/guarda com a flag ligada. Sai só **no chão, em estado livre** (`idle`, `walk`, `crouch`, `land`), **antes** do buffer de ataque (se saem no mesmo tick, a esquiva vence e zera `buf`). Não sai no ar, em `prejump`, golpe, `hit`, `block`, `down`; o botão guardado deixa sair no 1º tick livre (apertada ≤ 5 ticks antes de o bloqueio acabar).
- Custo **20** de energia (`en >= 20`); sem barra: `deny`. Não regenera energia durante a esquiva.
- Recuo: 22 ticks, ~120 px, invulnerável nos ticks [0, 14), recuperação de 8. Avanço: 26 ticks, ~150 px, 3 ticks de arranque vulneráveis, invulnerável em [3, 19), recuperação de 7. Velocidade decrescente `v = k·(1 − t/T)` (integral = `dist`), escalada por `ch.spd`; `y` fixo.
- Invulnerável a golpes, projéteis e agarrões (usa o `invuln`). **O avanço atravessa o corpo do rival durante todo o movimento** (inclusive o arranque vulnerável: `Fighter.passing`; a spec dizia só na janela, mas o arranque encostava e empurrava) e atravessa projéteis, que seguem voando. Não atravessa a parede (clamp 60..900).
- Recuperação: sem `invuln`, **não bloqueia**, **pode ser arremessada**, e acerto nela é **CONTRAGOLPE** (`counter`); `emPreparo` (COUP D'ARRÊT) agora exige `state === 'move'`.
- `esquivou`: em `resolveHits`, golpe ativo ou projétil que sobrepõe a hurtbox de quem esquiva na janela.

### CPU da esquiva (V2 da spec, `src/fight/cpu.ts`)

- `AI_LEVELS` ganha `esq`/`punir`: FÁCIL 0/0, NORMAL 0,25/0,35, DIFÍCIL 0,5/0,7. `perfilChefe` soma `IA_CHEFE.bonusReacao` (0,15, teto 1) nos dois (o chefe FÁCIL esquiva com 0,15: DD4 "sim").
- **Regra de RNG provada:** com a flag desligada ou `esq = 0` (FÁCIL) a CPU gasta os mesmos `rnd()` de antes; o sorteio extra só existe depois de poder esquivar (flag ligada, nível com `esq > 0`, no chão, estado livre, `en >= 20`).
- Ramo 1 (golpe do rival): só **depois de decidir defender**, e só contra especial ou golpe `heavy`: `rnd() < esq` → **recuo**, apertado `chega − 5` ticks depois (a janela cobre o impacto); nesse caso não sorteia o agachar.
- Ramo 2 (projétil): depois de decidir defender, `rnd() < esq` → **avanço**. Desvio da spec: aperta a **~170 px** do projétil (a spec dizia ~90), porque o arranque de 3 ticks é vulnerável e a 90 px o projétil acerta antes de a janela abrir (o teste exige que mais de 80% dos avanços saiam sem dano).
- Punir: rival em recuperação (`Fighter.esquivaPunivel`) a < 110 px: **um** sorteio por esquiva do rival (`esquivaId`), `rnd() < punir` → arremesso se der (`canThrow`), senão `hp`.
- Harness `npm run balanco -- --completo --esquiva` (saída em `relatorios/balanco-esquiva/`, nunca em `docs/balanco/`). 100 sementes, 16 000 lutas, 0 travadas, taxa de vitória dos 9 **sem → com esquiva**: hayato 47,9 → 44,2; wei-long 51,5 → 46,6; min-ji 51,4 → 48,7; caio 52,4 → 51,4; aminu 44,9 → 53,7; centella 43,8 → 45,8; camille 56,4 → 53,9; nila 48,7 → 56,8; baatar 53,0 → 49,0; chefão (jogador vence) NORMAL 24,3 → 24,9, DIFÍCIL 29,4 → 30,1. Todos dentro de 35-65%; **a esquiva não desequilibra** (a maior mudança é +8,1 pp na NILA). A rodada **sem** a flag mantém exatamente as taxas de antes (0 lutadores mudaram de taxa).

### Apresentação (acréscimo e): `src/data/apresentacao-especiais.ts`

Os 29 especiais da tabela do Apolo (§4) com `quadro`, `entrada` (só `cima`/`baixo`/`rival`; ausente = lateral), `momento: 'sucesso'` (PARADE, GARKUWA) e `continua: 'sResp'` (PARADE). Ficam FORA de `LutadorDef.especiais` de propósito: o oráculo compara os especiais dos 4 originais com o protótipo campo a campo. Teste: todo `quadro` existe no atlas de produção do lutador (ficha incluída). A VADIVU (custo 0) não emite `special`.

### Áudio

`src/audio/eventos.ts`: `esquiva` → `swing(1)`, `esquivou` → `uiSelect(1.4)` (nenhum método novo). O som do evento `special` não mudou (o lock-step compara sons).

## PROVADO

- `npm run typecheck` 0 erros; `npm test` **45 arquivos, 970 testes verdes**; `npm run build` verde. O snapshot antigo (`fight.test.ts.snap`) e `luta-fidelidade` seguem verdes **sem `-u`** (git: o `.snap` antigo não aparece como modificado; só nasceu `tests/unit/__snapshots__/esquiva-cpu.test.ts.snap`, do teste novo "CPU x CPU semente 42 COM esquiva"). `test:e2e` NÃO rodado.
- Testes novos: `tests/unit/esquiva.test.ts` (17: flag desligada idêntica por 300 ticks, custo e `deny`, janela [0,14) e [3,19), 120 ± 12 px, jab/projétil/arremesso na janela x recuperação, contragolpe, avanço que atravessa sem empurrar, botão guardado 4 x 7 ticks, locais em que não sai, esquiva x ataque no mesmo tick), `esquiva-cpu.test.ts` (13: RNG idêntico com flag desligada/FÁCIL em 400 sementes, recuo e avanço da CPU, punição ~70%, perfil do chefe, fumaça e snapshot com esquiva), `cinematica-eventos.test.ts` (20: os 29 `special`, quadros no atlas, `dano` = diferença de hp em golpe/projétil/combo/contragolpe/troca de barra, `especial`, `throw` dos 3 agarrões e o comum, PARADE/FOUETTÉ, clash da GARKUWA, nível da MASHI, `armor`/`block`/`quebra-guarda`).
- **Mutação** (mutante aplicado, o teste certo reprova, arquivo restaurado), 18 mutantes, todos mortos: sem `invuln` no início; sem custo; sem contragolpe na recuperação; sem buffer (`bufEsq = 1`); direção invertida; avanço sem atravessar; recuperação que bloqueia; recuperação sem poder ser arremessada; flag ignorada (`=== true` -> `true`); `esquivou` repetido; `dano` errado; agarrão de especial sem a marca; CPU sem a checagem da flag; CPU esquivando de golpe leve; PARADE sem `momento: 'sucesso'`; `parry` sem `continua`; `nivelCarga` fixo em 0; `clash` sem o golpe do escudo; e outros.
- Medi o impacto no balanço: `--completo` sem esquiva = taxas idênticas às da E6b.

## NÃO provado

- Nada visto em navegador; sem e2e. Pose, rastro, fantasma, HUD, botão ESQ e toda a cinemática são da Lyra: aqui só contratos e motor.
- As durações/distâncias da esquiva e as chances da CPU são **de partida** (a spec manda a E6 ajustar com o dono jogando). O harness mede só CPU x CPU.
- A CPU não sofre o aviso da tarja (R1 da spec); o harness não mede isso.

## PARA O PRÓXIMO

### Lyra (L1/L2)
- Tudo acima. Pontos de atenção: (1) `special.momento === 'sucesso'` => **não** abrir a cinemática no `special`; abrir no `parry` (use `parry.golpe`, `quadro`, `entrada`; o defensor é o dono) e no `clash` com `lutador`. (2) `throw.especial` conta acerto, `throw.dano` soma. (3) `hit.golpe === 'sResp'` pertence à sessão da PARADE. (4) `armor.dano` em cinza, sem contar. (5) O avanço atravessa o rival: o render de `esquiva !== 0 && invuln > 0` (fantasma, alfa 0,55) deve valer na janela, não no arranque. (6) `LutadorLeitura.esquiva`, `ProjetilLeitura.especial` e os campos dos eventos são opcionais no tipo; leia com `?.` ou `??`.
- Os e2e que apertam especial no modo de produção: a cinemática congela 0,8 s (auditoria da L2).

### Íris (adversarial)
- Esquiva no último tick do bloqueio, avanço no canto (parede 60/900), dois especiais no mesmo tick, esquiva com `en` exatamente 20, esquiva do chefe em Dança (não há entradas), PARADE contra especial (a cinemática só no sucesso), `esq` junto com ataque no mesmo tick, esquiva durante `cena-chefe`, CPU DIFÍCIL punindo a recuperação (arremesso x `hp`).

### Órion
- `Fighter.registrarEsquivada` é público para o `Game` marcar golpes já esquivados (conjunto limpo a cada esquiva). `colisao.hurtbox` não mudou. `separate()`/`passing` agora considera o avanço da esquiva.

### Cronos (`Regras.esquiva`/`cinematica`)
- Nada deste lado depende de `Regras`; a UI precisa passar `esquiva: regras.esquiva` ao montar o `ConfigPartida`.

## PENDÊNCIAS

- Lyra: L1 (entrada + render da esquiva) e L2 (cinemática); Cronos: C1 (regras e preferência).
- Ajuste fino da esquiva e da CPU na E6 (valores de partida) com o dono jogando. Sem commit.

## APRENDIZADO

- Ao pôr campo novo em evento que a Lyra/Íris fabricam à mão em teste, deixe-o **opcional no tipo** e **sempre preenchido pelo motor**: o contrato fica estável e nenhum teste alheio quebra em paralelo.
- Dado de **apresentação** (quadro, entrada, momento) precisa de tabela PRÓPRIA fora de `LutadorDef.especiais`: o oráculo de fidelidade compara os especiais dos originais com o protótipo, campo a campo.
- Esquivar de projétil: o recuo só ganha tempo, não atravessa (o projétil é mais rápido que o recuo e acerta quando a janela fecha); quem atravessa é o avanço, e a CPU precisa apertá-lo antes do arranque vulnerável (~170 px).
- Um dublê que bloqueia (`dummyInput` "trás") anda: nos testes de acerto contra defensor que bloqueia, fixar o `x` dele.
- `python - <<EOF` com apóstrofos no Bash ainda quebra ("unexpected EOF"): scripts de edição com texto livre vão num arquivo `.py` salvo pela ferramenta Write.
