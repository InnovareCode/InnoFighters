# Medição em aparelho real (T13) — roteiro para o dono

Autora: Íris (QA), 2026-10-24. Item T13 de `docs/orcamentos-2026-10-23.md`. Para quem executa: o dono, no iPhone dele e num Android.

**Por que isto existe.** Os números do laboratório (Chromium no PC, sem GPU de celular) são **contas e pisos**: dizem quanto a arte pesa, não se o aparelho aguenta.
Só o aparelho responde três perguntas: (1) **a memória cabe?** (o iPhone derruba a aba quando falta), (2) **os quadros ficam fluidos?**, (3) **abre rápido e funciona sem rede?**
Tempo: uns 40 minutos por aparelho. Não precisa instalar nada além do que está aqui.

## 1. Antes de começar

- Bateria acima de 50% e **sem o modo de economia de energia** (ele reduz os quadros e estraga a medida).
- Wi-Fi bom para os testes 1 a 5. Feche os outros aplicativos e **reinicie o navegador** (feche pelo seletor de apps e abra de novo).
- Ligue o modo "Não perturbe" (uma notificação no meio da luta atrapalha o cronômetro).
- Tenha à mão o **cronômetro** do próprio celular.
- Anote **só**: modelo do aparelho, versão do sistema, navegador e versão. Não anote nome, conta, telefone nem endereço.
- O site de teste é temporário (GitHub Pages): `https://innovarecode.github.io/InnoFighters/`. Se não abrir, avise antes de seguir.
- Abra **OPÇÕES** no jogo e anote o texto do canto inferior direito (`versão ...`): é a versão que você está medindo.

## 2. Endereços (sempre digite o endereço inteiro; não use "atualizar")

Base: `https://innovarecode.github.io/InnoFighters/`

| Para quê | Acrescente à base | O que muda |
|---|---|---|
| Padrão (sem nada) | — | residência por peso, motor v2 (filme do especial, combos, entrada), service worker ligado |
| **Residência A** (a nova, padrão) | `?residencia=peso` | a arte que não está em uso sai da memória |
| **Residência B** (a de antes) | `?residencia=fixa` | a vitrine fica sempre na memória; serve de comparação |
| Sem motor v2 | `?motorv2=0` | sem filme do especial e sem combos próprios (o jogo de antes). Para ver se o filme é o que pesa |
| Sem service worker | `?sw=0` | desliga o cache offline **e continua desligado nas próximas visitas** até você abrir `?sw=1` |
| Religar o service worker | `?sw=1` | volta ao normal |

Regras de ouro: **uma variante por vez**; entre uma e outra, feche a aba e reinicie o navegador. No fim, abra `?sw=1` uma vez para deixar o aparelho limpo.

## 3. Os testes

Em cada teste: faça o passo a passo, **anote o número ou o "sim/não"** e passe para a tabela da seção 4.

**T1 — Primeira abertura (tempo do boot).** Limpe os dados do site antes (iPhone: Ajustes > Safari > Avançado > Dados de sites, apague `innovarecode.github.io`; no Chrome: Configurações > Privacidade > Limpar dados). Feche e abra o navegador. Digite a base.
- Cronometre do toque em "Ir" até aparecer a tela **"CLIQUE OU PRESSIONE UMA TECLA"**. Anote os segundos e se estava no Wi-Fi ou no 4G/5G.
- Laboratório: **0,913 MiB** baixados até essa tela (meta 1,5 MiB).

**T2 — Trailer.** Na tela acima, **toque uma vez** e assista ao trailer inteiro (uns 40 segundos) sem tocar. Anote: (a) o trailer começou ou apareceu a abertura antiga curta (acontece se o pedaço do trailer ainda não baixou: é permitido); (b) **algum trecho virou um cartão parado com os nomes dos lutadores no lugar da luta** (é o "cartão de reserva": a arte não chegou a tempo); quantos; (c) quadros: fluido / engasga um pouco / engasga muito; (d) **a página recarregou sozinha ou apareceu aviso de erro?** (sim/não).
- Laboratório: pico de **145,3 MiB** de imagem no trailer (limite 150).
- O que o laboratório mostrou em rede lenta (Chromium com "Fast 3G" simulado, 1ª visita): o "CLIQUE OU PRESSIONE..." aparece em ~9 s; se você tocar antes de o pedaço do trailer chegar, toca a **abertura antiga curta** (permitido). Com o pedaço já baixado, um navegador que informa rede 3G ou "economia de dados" (Chrome do Android) recebe a **versão estática** do trailer (uns 7 a 10 s, só cartões: "DEZ MESTRES.", "CINCO SELOS.", "QUEM SOBE AO TOPO..."). Já o **iPhone não informa o tipo de rede**, então ele tenta o trailer completo: em rede lenta, 8 dos 14 planos viraram **cartão de reserva** (dois retratos com os nomes sobre fundo azul-escuro, sem luta) e, nos primeiros segundos, antes de os retratos chegarem, o cartão pode aparecer **vazio**. Anote o que você viu: é esse comportamento que queremos confirmar no aparelho.

**T3 — Luta comum, quadros.** Menu > **LUTA vs CPU**, HAYATO contra MIN-JI, dificuldade padrão. Jogue 2 rounds. Anote: quantas vezes sentiu **travar** em 1 minuto (0, 1 a 3, mais de 3) e nota de 1 a 5 para a fluidez. Faça na variante **A** e depois na **B**.
- Opcional e muito útil: **grave a tela** (iPhone: Central de Controle > Gravação de Tela; Android: gravador do sistema) durante o round e mande o vídeo para a equipe; contamos os quadros.

**T4 — Filme do especial.** Na mesma luta, use o botão **ESPECIAL** até um golpe especial **acertar**. Anote: o jogo **congelou antes do filme aparecer?** (sim/não e quantos segundos contados "um, dois, três"), e se o filme rodou fluido. Repita com `?motorv2=0` só para comparar os quadros da luta (sem filme).

**T5 — Memória (a aba sobrevive?).** Faça **5 lutas seguidas** (resultado > menu > nova luta), alternando os pares HAYATO x MIN-JI e CAIO x WEI LONG (os quatro lutadores iniciais), sem fechar a aba. Anote: **a aba recarregou sozinha?** em qual luta? (iPhone: a página volta ao início ou mostra "ocorreu um problema"; Android: "Ops!"/"Aw, Snap!"). Faça em A e em B.
- Se **BAATAR e ZENON já estiverem liberados** no seu aparelho, faça uma luta com um deles (os mais pesados, até 150 MiB no laboratório) e repita. Se não estiverem, escreva "não liberados" (liberá-los exige vencer os guardiões do ARCADE; ver pendência no fim).
- Android, opcional: Opções do desenvolvedor > Memória mostra o uso do Chrome; anote o pico. No iPhone não há leitura simples: o sinal é a aba recarregar.

**T6 — Offline (2ª visita).** Com o Wi-Fi ligado, abra a base, **jogue uma luta com os lutadores que quer testar offline** (o cache guarda só o que foi usado) e feche a aba. Ative o **modo avião** (Wi-Fi e dados desligados). Abra a base de novo. Anote: abre o título? em quantos segundos? uma luta com os mesmos lutadores funciona? e com um lutador que você **não** usou antes? (a falha aqui é esperada; anote o que aparece).
- Laboratório: a 2ª visita online baixa só ~0,1 KiB.
- Se algo falhar, repita com `?sw=0` e anote se o problema some (isso diz se o culpado é o cache offline). Depois abra `?sw=1`.

**T7 — Tela cheia (iPhone).** Compartilhar > "Adicionar à Tela de Início", abra pelo ícone novo e repita o T3 uma vez. Anote se os quadros e a memória mudam em relação ao navegador.

## 4. Tabela de resposta (copie e preencha, uma por aparelho)

Aparelho: ______ Sistema: ______ Navegador: ______ Versão do jogo (Opções): ______ Rede: ______

| Teste | Variante (URL) | Resultado (ok / problema) | Número | Observação |
|---|---|---|---|---|
| T1 boot | padrão | | segundos até "CLIQUE...": | |
| T2 trailer | padrão | | cartões de reserva: ___ ; recarregou: sim/não | |
| T3 quadros | A `?residencia=peso` | | travadas/min: ___ ; nota 1-5: ___ | |
| T3 quadros | B `?residencia=fixa` | | travadas/min: ___ ; nota 1-5: ___ | |
| T4 filme | padrão | | congelou ___ s ; fluido: sim/não | |
| T4 sem filme | `?motorv2=0` | | travadas/min: ___ | |
| T5 memória | A | | aba recarregou na luta nº: ___ (ou "não") | |
| T5 memória | B | | aba recarregou na luta nº: ___ (ou "não") | |
| T5 pesado | A | | BAATAR/ZENON: recarregou sim/não/não liberado | |
| T6 offline | padrão | | abre: sim/não ; ___ s ; luta: sim/não ; lutador novo: sim/não | |
| T6 sem SW | `?sw=0` | | (só se o T6 falhou) problema some: sim/não | |
| T7 tela cheia (iPhone) | padrão | | mudou algo: sim/não | |

## 5. Como a equipe lê o resultado

| Sinal | Significa | Próximo passo da equipe |
|---|---|---|
| Aba recarrega em A e em B | memória de imagem acima do que o aparelho aguenta | abrir a L7 (`createImageBitmap` + `close()`) e cortar mais; reavaliar BAATAR/ZENON |
| Recarrega só em B | a residência por peso resolve | tornar `peso` definitivo e remover o caminho `fixa` |
| Quadros bons em A e ruins em `?motorv2=0` (ou o contrário) | o filme/combos pesa na CPU | olhar a folha FILME |
| Trailer com muitos cartões de reserva | rede do aparelho lenta para o orçamento de carga | aumentar a antecedência da carga ou encurtar o trailer na rede lenta |
| T6 falha e some com `?sw=0` | defeito do cache offline neste navegador (cota do iOS ainda desconhecida) | rever `docs/service-worker.md` |

Nenhum dado pessoal é necessário: se o vídeo mostrar notificações ou nome de conta, **não envie** esse trecho.

> Pendência registrada pela Íris: sem vencer o ARCADE no aparelho, BAATAR e ZENON (os dois de maior memória) não ficam disponíveis para o T5. A decisão de oferecer um atalho de liberação para teste é do dono.
