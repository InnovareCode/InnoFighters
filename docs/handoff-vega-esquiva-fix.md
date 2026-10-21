# Handoff Vega — correções da QA da esquiva (Íris) e regra "esquivou consome o golpe"

Data: 2026-10-21. Sem commit. Base: `docs/handoff-iris-esquiva.md`, decisão do Atlas e confirmação do dono. Não toquei em `src/render`, `src/ui`, `src/input` nem `tests/e2e` (o defeito #3, do gamepad, é da Lyra). Só `tests/unit/esquiva-chefe-cpu.test.ts` e `esquiva-cantos.test.ts` foram editados, e só para trocar `it.fails` por `it`.

## RESULTADO

### Correções

- **#1 botão guardado atravessa a Dança da Águia.** `Fighter.limparBotoesGuardados()` (público) zera `buf` e `bufEsq`; `Game.talvezIniciarCenaDoChefe` chama nos dois lutadores ao abrir a cena (`game.ts`). Medido antes: `en` 100 -> 80 no 2º tick da cena. `it.fails` -> `it` (passa).
- **#2 avanço contra rival colado na parede dependia de ser P1 ou P2.** `Game.separate` desempatava `dx === 0` por `dx >= 0` (assume o P2 à direita). Agora, no empate exato e com uma esquiva em curso, **quem esquiva fica do lado de onde saiu**: o rival está para onde ele olhava (o `facing` não muda durante a esquiva), então `s = esquivador.facing` (ou `-facing` se o esquivador é o P2). Sem esquiva o desempate é o de sempre (snapshot e lock-step intactos). Resultado: nos 4 cantos (P1/P2 x esquerdo/direito) o avanço contra rival encurralado **nunca atravessa a parede** e os corpos acabam separados. `it.fails` -> `it` (passa) + teste novo que cobre o lado correto (um mutante com o sinal trocado sobreviveu ao teste de simetria e ao novo ele morre).
- **Decisão do Atlas/dono: "ESQUIVOU!" CONSOME o golpe.** Quando a esquiva anuncia `esquivou`, o golpe não acerta mais aquele alvo, como um acerto:
  - corpo a corpo: `Fighter.atkEsquivado` guarda o `atkId` esquivado e `resolveHits` pula o golpe (nenhum efeito colateral no movimento: uma investida esquivada NÃO desacelera, ao contrário do `hitDone`);
  - projétil: `ProjetilLuta.esquivou`: ele segue voando (atravessa) mas não acerta mais o alvo, nem depois de a janela fechar;
  - agarrão: sem mudança. O agarrão com `agarrao.janela` só testa `canThrow` e falha com a janela aberta; **não anuncia `esquivou`** (nunca anunciou). O ABRAÇO DA ESTEPE (janela de 16 > 14 ticks) agarra a RECUPERAÇÃO do recuo, como o Atlas aceitou.
  - O avanço continua atravessando o rival e os projéteis.
- Efeito colateral esperado: o snapshot **novo** `esquiva-cpu.test.ts.snap` (CPU x CPU semente 42 COM esquiva, criado na V2) mudou de conteúdo, porque agora a esquiva consome golpes; regravei SÓ ele (`-u` no arquivo dele). O snapshot antigo `fight.test.ts.snap` e `luta-fidelidade` seguem verdes **sem `-u`** (git: o `.snap` antigo não aparece como modificado).

## O QUE CADA ESQUIVA COBRE (para mostrar ao dono)

Contagem a partir do tick em que o botão é apertado (tick 0 = o do aperto). Medido por varredura no motor.

| | Recuo (←, neutro, ↓ ou ↑) | Avanço (→, na direção do rival) |
|---|---|---|
| Energia | 20 | 20 |
| Duração | 22 ticks | 26 ticks |
| Deslocamento | ~120 px para trás (×`spd`) | ~150 px para a frente (×`spd`), **atravessa o rival e os projéteis** |
| Vulnerável (arranque) | nenhum | **ticks 0, 1, 2** |
| **INVULNERÁVEL** | **ticks 0 a 13 (14 ticks)** | **ticks 3 a 18 (16 ticks)** |
| Vulnerável (recuperação) | ticks 14 a 21: não bloqueia, pode ser agarrado, acerto = contragolpe | ticks 19 a 25: idem |

Provado com golpe de contato conhecido (jab com preparação 3): o recuo esquiva todo contato nos ticks 0 a 13 e leva o do tick 14 em diante; o avanço leva o contato dos ticks 0 a 2, esquiva os dos ticks 3 a 18 e leva o do tick 19 em diante. Com **magia** (projétil do HAYATO, recuo na parede): zero dano quando o projétil chega nos ticks 0 a 12, dano quando chega no 15 em diante (13 e 14 são fronteira: o recuo ainda desloca o alvo 10 px). Avanço contra magia: zero dano se apertado com o projétil a mais de ~75 px do contato (8+ ticks antes) e antes de a janela fechar; mais perto que isso o arranque vulnerável toma o projétil; cedo demais (projétil chega depois da recuperação começar) também leva.

**Cobre** (golpe, magia/projétil e especial: zero dano e nenhum dano do mesmo golpe depois do "ESQUIVOU!"): provado para os **26 especiais** abaixo, esquivando em cada um dos 11 ticks que cobrem o contato, e varrendo o aperto em todos os ticks do golpe (esquiva + dano do mesmo golpe nunca acontece):

| Lutador | Especiais esquiváveis |
|---|---|
| HAYATO | RAIJIN-DAN (magia), RAIJIN-KEN, KAMINARI-STEP |
| WEI LONG | LONG ZHANG (magia grande), ZHEN DI (magia rasteira), TIE SHAN KAO (investida com armadura) |
| MIN-JI | BULKKOT (2 projéteis, ver abaixo), HOERI CHAGI, TWIO YEOP CHAGI |
| CAIO | ONDA VERDE, RABO-DE-ARRAIA, MEIA-LUA |
| AMINU | MASHI (cada nível), GARKUWA (a palma é um golpe e se esquiva), PASSO DO LEÃO |
| CENTELLA | PLANCHA, RESORTE |
| CAMILLE | COUP D'ARRÊT, REVERS |
| NILA | GOLPE MARMA, PASSO DO ELEFANTE, BOTE (SARPA), SALTO DA SERPENTE (SARPA) |
| BAATAR | ARREMESSO DO AVARGA (o agarrão simplesmente falha), QUEBRA-BASE, MERGULHO DA ÁGUIA (fase 2) |

**NÃO cobre / esquiva só em parte, por desenho (lista para o dono):**

1. **Fora do tempo** (a esquiva é de timing, não imunidade): antes de a janela abrir (arranque do avanço, ticks 0 a 2), depois de ela fechar (recuo do tick 14, avanço do 19) ou apertada depois do contato = dano normal.
2. **ABRAÇO DA ESTEPE** (BAATAR →+ESP): o agarrão testa durante 16 ticks e a janela do recuo é de 14, então ele pega a recuperação do recuo (decisão do Atlas: aceito).
3. **HURACANRANA** (CENTELLA ↓+ESP): só agarra rival NO AR e a esquiva só sai no chão; não há esquiva dela.
4. **PARADE** (CAMILLE ↑ESP): não ataca; não há o que esquivar (o dano que ela evita é do rival).
5. **BULKKOT** (MIN-JI ↑ESP, 2 projéteis): cada projétil é esquivado separadamente. Apertar cedo esquiva o 1º e o 2º, que chega depois da janela, acerta; apertar no tempo dos dois esquiva os dois.
6. **REVERS** (CAMILLE →+ESP): ela cruza o alvo e o `facing` dele vira no tick do cruzamento. Apertar "trás" exatamente nesse tick vira "frente" (avanço, arranque vulnerável). Fora esse tick, esquiva normalmente.
7. Recuo longe da parede foge de golpes curtos pela distância (120 px), não só pela invulnerabilidade; o avanço contra a magia/projétil só funciona com o projétil ainda longe (item acima).

## PROVADO (executado nesta sessão, no código do disco)

- `npx tsc --noEmit`: 0 erros em `src/` e `tests/unit` (restam 2 erros em `tests/e2e/cinematica.spec.ts`, arquivo da Lyra em edição, não meu). `npm test`: **57 arquivos, 1222 testes verdes**. `npm run build`: verde. Snapshot antigo e `luta-fidelidade` verdes, sem `-u`. `test:e2e` não rodado.
- Testes novos: `tests/unit/esquiva-consumo.test.ts` (17): para `sDown` (RAIJIN-KEN), `sFwd` (investidas de HAYATO e WEI LONG), RESORTE, `hk` do WEI LONG e do BAATAR, esquiva para trás e para frente apertada em CADA tick de 0 a 110 do golpe, e os 14 ticks de janela um a um: **nunca há "esquivou" seguido de dano do mesmo golpe**; o golpe seguinte do rival acerta; projétil esquivado segue voando e não acerta depois; o avanço continua atravessando; o ABRAÇO ainda agarra a recuperação; o avanço contra rival na parede é simétrico. `tests/unit/esquiva-timing.test.ts` (61): janela exata do recuo e do avanço com golpe de contato conhecido, magia por distância, e, para **cada um dos 26 especiais**, zero dano no tempo certo + consumo + dano quando a esquiva vem tarde, mais a lista do que não cobre.
- **Mutação** (mutante aplicado, o teste certo reprova, restaurado): golpe esquivado não consumido (22 testes caem; reproduz exatamente os defeitos que a Íris mediu em `sDown`, `sFwd`, RESORTE e `hk`), projétil não consumido (7), sem limpar o `bufEsq` na Dança (2), desempate do `separate` removido (1) e com o sinal invertido (1), janela do recuo de 13 ou de 15 ticks (2 e 1), arranque do avanço de 2 ticks (2) e janela do avanço de 18 (2), o escudo/`clash` sem o golpe etc. (os da V1/V2 seguem valendo). O primeiro mutante do sinal do desempate **sobreviveu** ao teste de simetria (um desempate simétrico mas ERRADO passa nele): matou ao eu acrescentar "o esquivador acaba do lado de onde saiu".
- **Balanço** (harness, dados de produção, 100 sementes, 16 000 lutas, 0 travadas):
  - Sem a flag: resultado **IDÊNTICO** à referência (`docs/balanco/resultados.json`, hash `41def0eefa85f158`): hayato 47,9 / wei-long 51,5 / min-ji 51,4 / caio 52,4 / aminu 44,9 / centella 43,8 / camille 56,4 / nila 48,7 / baatar 53,0; chefão 24,3% (NORMAL) e 29,4% (DIFÍCIL). A correção não mexe em nada sem a esquiva.
  - `--esquiva` (nova referência em `relatorios/balanco-esquiva/`): **hayato 45,5 / wei-long 48,8 / min-ji 42,4 / caio 49,4 / aminu 54,8 / centella 46,4 / camille 55,0 / nila 57,6 / baatar 50,1**; chefão **24,6% (NORMAL) e 25,9% (DIFÍCIL)**. Antes do consumo: 44,2 / 46,6 / 48,7 / 51,4 / 53,7 / 45,8 / 53,9 / 56,8 / 49,0 e chefão 24,9 / 30,1. A esquiva ficou um pouco mais forte (o golpe esquivado agora vale por inteiro: MIN-JI cai de 48,7 para 42,4, o resto muda até 3 pp) mas **todos continuam entre 42,4% e 57,6%** e o chefão em 24-26%: **não apliquei nenhuma mudança de valores**. Única sinalização: REVERS com 5,0% de contato (pré-existente).
  - `--rapido --verificar` e `--rapido --esquiva --verificar`: amostras IDÊNTICAS entre duas rodadas, 0 travadas; sem a flag 0 sinalizações, com a flag só o REVERS (e CAMILLE 59,9% com N pequeno, que some com N = 100).

## NÃO provado

- Nada em navegador. A sensação (o aviso "ESQUIVOU!" e o golpe sumindo no mesmo instante) é da Lyra mostrar.
- MIN-JI 42,4% com esquiva está na borda baixa da faixa (42-58%); é a CPU esquivando e punindo, não uma pessoa. Se o dono achar a esquiva forte demais, os valores ficam em `src/data/esquiva.ts` (custo 20, janelas 14/16).
- Obs. 3 da Íris (botão apertado no hitstop se perde): não alterada (igual ao buffer de ataque).

## PARA O PRÓXIMO

- **Atlas:** mostrar ao dono a tabela "O QUE CADA ESQUIVA COBRE" acima. Decisões que sobram: (a) o ABRAÇO pegar a recuperação do recuo (aceito); (b) a obs. 3 (botão perdido no hitstop de 20 ticks da troca de barra).
- **Lyra:** o #3 (gamepad, `entrada-adversarial.test.ts`) é dela. Para a render: depois de `esquivou` o golpe NÃO acerta mais (pode mostrar o texto sem esperar dano); o projétil esquivado continua visível e atravessa.
- **Íris:** pode reabrir com o avanço no canto (agora simétrico) e com a cena do chefe com o botão guardado.

## PENDÊNCIAS

- Defeito #3 (gamepad) com a Lyra. Sem commit.

## APRENDIZADO

- "Anunciar" sem "consumir" cria dano pós-aviso: todo evento de invulnerabilidade que diz "evitou" precisa marcar o golpe/projétil como já resolvido para aquele alvo (`atkEsquivado`, `pr.esquivou`), sem reaproveitar flags com efeito colateral (`hitDone` desacelera a investida).
- Desempate por índice (P1/P2) em colisão é bug latente: usar um fato do estado (aqui, o `facing` congelado de quem esquiva) ou testar P1 e P2 espelhados.
- Teste de simetria sozinho aceita desempate simétrico e errado: sempre acrescentar a asserção do resultado esperado.
- Para provar "janela exata" sem depender de geometria, usar um golpe/projétil de contato controlável (jab com preparação conhecida, projétil por distância) e varrer o tick; a varredura por especial é boa para "consumo" e "zero dano", mas fica frágil para "dano fora do tempo" porque o próprio deslocamento da esquiva muda o contato (1 a 3 ticks).
