# Frame data medida no motor

> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.

Gerado em 2026-10-24 · versão dos dados/motor `0b5ad77394bb` · arte de PRODUÇÃO (`public/assets/lutadores`).

Como ler (todos os tempos em ticks de jogo, 60 por segundo; cada número foi medido numa `Game` em modo treino, não lido da tabela):

- **Nominal S/A/R**: o que o dado declara. **Início/Ativos/Recup.**: o que o motor fez (início = ticks até a 1ª caixa de acerto válida; ativos = ticks com a caixa válida; recup. = do fim dos ativos até o atacante poder agir). Golpe aéreo: ativos vão até pousar. Projétil: início = tick do 1º tiro.
- **Dano**: queda de vida de um boneco cheio no 1º contato (já com `pow`, sem escala de combo). **Hitstun**: ticks do boneco em `hit`. **KD**: o golpe derruba; a vantagem vira o tempo até o boneco levantar.
- **Vant. acerto / bloq.**: (tick em que o defensor fica livre) − (tick em que o atacante fica livre), medida a 90 px (ou na menor distância em que o golpe conecta). Positivo = o atacante age primeiro.
- **Nível**: o declarado → o medido contra `block` e `crouchblock` (`mid` bloqueia nos dois; `low` só agachado; `over` só em pé; `–` = não bloqueável). "alto" = erra o boneco agachado.
- **Caixa**: alcance estático da caixa (`fx + w`, px a partir do x do atacante; sai da `ponta` do atlas). **Alcance medido**: distância entre os dois x em que o golpe conecta (varredura de 6 px, bordas a 1 px). O mínimo entre corpos é 78; o teto da varredura é 780 (`+`).

## HAYATO

_pow 1.07_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 4.3 | 14 | +4 | 8 | -2 | 133 | 78–171 |  |
| lk |  | mid | 5/4/9 | 5/4/9 | 5.3 | 16 | +3 | 9 | -4 | 131 | 78–168 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 9.6 | 24 | +6 | 12 | -6 | 151 | 78–202 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 13.9 | – | KD +48 | 14 | -9 | 168 | 78–223 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.3 | 15 | +4 | 8 | -3 | 150 | 78–187 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 5.3 | 15 | +2 | 9 | -4 | 124 | 78–161 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 10.7 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 9.6 | – | KD +45 | 14 | -12 | 170 | 78–207 |  |
| jlp |  | over | 2/80/0 | 2/13/0 | 5.3 | 15 | +2 | 10 | -3 | 166 | 78–203 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/11/0 | 8.6 | 20 | +9 | 12 | +1 | 174 | 78–211 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/12/0 | 6.4 | 17 | +5 | 11 | -1 | 166 | 78–203 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/10/0 | 10.7 | 22 | +12 | 13 | +3 | 182 | 78–220 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 12.8 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | RAIJIN-DAN | mid (alto) | 14/3/18 | 14/1/20 | 15.0 | – | KD +50 | 17 | -4 | – | 78–780+ | projétil: início = tick do 1º tiro; conecta até o teto da varredura (780) |
| sDown | RAIJIN-KEN | mid | 4/80/0 | 4/33/22 | 17.1 | – | KD +16 | 14 | -41 | 106 | 78–193 | aéreo: ativos até pousar |
| sFwd | KAMINARI-STEP | mid | 6/8/16 | 6/8/16 | 11.8 | 26 | +2 | 12 | -12 | 141 | 78–278 |  |

## WEI-LONG

_pow 0.95_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 4/3/7 | 4/3/7 | 4.3 | 14 | +4 | 8 | -2 | 147 | 78–185 |  |
| lk |  | mid (alto) | 6/4/9 | 6/4/9 | 5.7 | 16 | +3 | 9 | -4 | 132 | 78–170 |  |
| hp |  | mid (alto) | 9/5/17 | 9/5/17 | 9.5 | 24 | +2 | 12 | -10 | 193 | 78–248 |  |
| hk |  | mid (alto) | 12/5/22 | 12/5/22 | 13.3 | – | KD +44 | 14 | -13 | 200 | 78–258 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.8 | 15 | +4 | 8 | -3 | 150 | 78–187 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.8 | 15 | +2 | 9 | -4 | 155 | 78–192 |  |
| chp |  | mid | 7/4/17 | 7/4/17 | 9.5 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 9/6/20 | 9/6/20 | 8.5 | – | KD +45 | 14 | -12 | 217 | 78–254 |  |
| jlp |  | over | 2/80/0 | 2/12/0 | 4.8 | 15 | +3 | 10 | -2 | 184 | 78–221 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/10/0 | 10.5 | 20 | +10 | 12 | +2 | 193 | 78–230 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/11/0 | 5.7 | 17 | +6 | 11 | 0 | 187 | 78–224 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/9/0 | 12.3 | 22 | +13 | 13 | +4 | 203 | 78–241 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 11.4 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | LONG ZHANG | mid (alto) | 20/3/22 | 20/1/24 | 20.0 | – | KD +46 | 17 | -8 | – | 78–780+ | projétil: início = tick do 1º tiro; conecta até o teto da varredura (780) |
| sDown | ZHEN DI | mid | 14/3/26 | 14/1/28 | 13.0 | – | KD +42 | 17 | -12 | – | 78–662 | projétil: início = tick do 1º tiro |
| sFwd | TIE SHAN KAO | mid | 10/10/24 | 10/10/24 | 18.0 | – | KD +37 | 15 | -19 | 168 | 78–287 |  |

## MIN-JI

_pow 0.92_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 2/3/5 | 2/3/5 | 3.2 | 14 | +6 | 8 | 0 | 118 | 78–155 |  |
| lk |  | mid | 4/4/7 | 4/4/7 | 4.1 | 16 | +5 | 9 | -2 | 142 | 78–180 |  |
| hp |  | mid | 5/4/11 | 5/4/11 | 6.9 | 24 | +9 | 12 | -3 | 147 | 78–208 |  |
| hk |  | mid (alto) | 7/5/14 | 7/5/14 | 9.7 | – | KD +52 | 14 | -5 | 157 | 78–222 |  |
| clp |  | mid | 3/3/6 | 3/3/6 | 3.7 | 15 | +6 | 8 | -1 | 150 | 78–187 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.6 | 15 | +2 | 9 | -4 | 120 | 78–157 |  |
| chp |  | mid | 5/4/17 | 5/4/17 | 7.8 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 6/5/16 | 6/5/16 | 7.4 | – | KD +50 | 14 | -7 | 160 | 78–197 |  |
| jlp |  | over | 2/80/0 | 2/15/0 | 4.1 | 15 | 0 | 10 | -5 | 110 | 78–147 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/13/0 | 7.4 | 20 | +7 | 12 | -1 | 110 | 78–147 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/14/0 | 5.5 | 17 | +3 | 11 | -3 | 110 | 78–147 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/12/0 | 7.8 | 22 | +10 | 13 | +1 | 110 | 78–147 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 11.0 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | BULKKOT | mid (alto) | 9/3/15 | 9/1/17 | 15.2 (2x) | 10 | KD +63 | 27 | +9 | – | 78–780+ | projétil: início = tick do 1º tiro; conecta até o teto da varredura (780) |
| sDown | HOERI CHAGI | mid | 4/80/0 | 4/28/18 | 14.9 (3x) | 14 | KD +45 | 24 | -22 | 143 | 78–253 | aéreo: ativos até pousar |
| sFwd | TWIO YEOP CHAGI | mid | 5/80/0 | 5/15/10 | 11.0 | 24 | -1 | 12 | -13 | 180 | 78–420 | aéreo: ativos até pousar |

## CAIO

_pow 0.97_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 3.9 | 14 | +4 | 8 | -2 | 113 | 78–151 |  |
| lk |  | mid | 5/4/9 | 5/4/9 | 4.8 | 16 | +3 | 9 | -4 | 182 | 78–220 |  |
| hp |  | mid (alto) | 8/4/14 | 8/4/14 | 8.2 | 24 | +6 | 12 | -6 | 133 | 78–184 |  |
| hk |  | mid (alto) | 10/5/18 | 10/5/18 | 12.1 | – | KD +48 | 14 | -9 | 234 | 78–289 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 3.9 | 15 | +4 | 8 | -3 | 161 | 78–199 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.8 | 15 | +2 | 9 | -4 | 197 | 78–235 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 9.7 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 8.7 | – | KD +45 | 14 | -12 | 218 | 78–256 |  |
| jlp |  | over | 2/80/0 | 2/16/0 | 4.8 | 15 | +2 | 10 | -3 | 130 | 78–168 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/14/0 | 7.8 | 20 | +7 | 12 | -1 | 137 | 78–175 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/15/0 | 5.8 | 17 | +3 | 11 | -3 | 127 | 78–164 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/13/0 | 9.7 | 22 | +9 | 13 | 0 | 137 | 78–175 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 11.6 | – | KD +52 | – | – | 111 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | ONDA VERDE | mid (alto) | 12/3/17 | 12/1/19 | 14.0 | – | KD +51 | 17 | -3 | – | 78–385 | projétil: início = tick do 1º tiro |
| sDown | RABO-DE-ARRAIA | low | 9/7/22 | 9/7/22 | 12.6 | – | KD +42 | 15 | -14 | 420 | 78–458 |  |
| sFwd | MEIA-LUA | over | 6/80/0 | 6/24/12 | 13.6 | 26 | -10 | 13 | -23 | 136 | 78–375 | aéreo: ativos até pousar |

## AMINU

_pow 1.18_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 4.7 | 14 | +4 | 8 | -2 | 154 | 78–192 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 5.9 | 16 | +3 | 9 | -4 | 185 | 78–222 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 10.6 | 24 | +6 | 12 | -6 | 192 | 78–244 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 15.3 | – | KD +48 | 14 | -9 | 231 | 78–287 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.7 | 15 | +4 | 8 | -3 | 176 | 78–213 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 5.9 | 15 | +2 | 9 | -4 | 179 | 78–216 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 11.8 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 10.6 | – | KD +45 | 14 | -12 | 240 | 78–277 |  |
| jlp |  | over | 2/80/0 | 2/12/0 | 5.9 | 15 | +3 | 10 | -2 | 149 | 78–187 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/10/0 | 9.4 | 20 | +10 | 12 | +2 | 157 | 78–194 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/11/0 | 7.1 | 17 | +6 | 11 | 0 | 149 | 78–187 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/9/0 | 11.8 | 22 | +13 | 13 | +4 | 164 | 78–202 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 14.2 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire (nível 1) | MASHI | mid (alto) | 10/5/20 | 10/5/20 | 9.4 | 22 | -3 | 12 | -13 | 201 | 78–239 |  |
| sFire (nível 2) | MASHI | mid (alto) | 10/5/20 | 39/5/20 | 17.7 | – | KD +46 | 12 | -13 | 201 | 78–239 | início inclui 38 ticks segurando ESP |
| sFire (nível 3) | MASHI | mid (alto) | 10/5/20 | 79/5/20 | 26.0 | – | KD +46 | – | +15 | 201 | 78–239 | início inclui 78 ticks segurando ESP; QUEBRA A GUARDA: atordoa mesmo bloqueando |
| sDown | GARKUWA | mid (alto) | 5/20/18 | 5/20/18 | 5.9 | 18 | -20 | 10 | -28 | 157 | 78–195 |  |
| sFwd | PASSO DO LEÃO | mid (alto) | 7/9/20 | 7/9/20 | 11.8 | 26 | -3 | 16 | -13 | 176 | 78–295 |  |

## CENTELLA

_pow 0.95_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 3.8 | 14 | +4 | 8 | -2 | 131 | 78–169 |  |
| lk |  | mid | 5/4/9 | 5/4/9 | 4.8 | 16 | +3 | 9 | -4 | 151 | 78–189 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 8.5 | 24 | +6 | 12 | -6 | 158 | 78–209 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 12.3 | – | KD +48 | 14 | -9 | 176 | 78–231 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 3.8 | 15 | +4 | 8 | -3 | 150 | 78–187 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.8 | 15 | +2 | 9 | -4 | 132 | 78–170 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 9.5 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 8.5 | – | KD +45 | 14 | -12 | 192 | 78–230 |  |
| jlp |  | over | 2/80/0 | 2/17/0 | 4.8 | 15 | -2 | 10 | -7 | 156 | 78–193 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/15/0 | 7.6 | 20 | +5 | 12 | -3 | 164 | 78–201 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/16/0 | 5.7 | 17 | +1 | 11 | -5 | 156 | 78–193 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/14/0 | 9.5 | 22 | +8 | 13 | -1 | 171 | 78–209 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 11.4 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | PLANCHA | over | 8/80/0 | 8/39/24 | 13.3 | – | KD +8 | 14 | -49 | 110 | 78–499 | aéreo: ativos até pousar |
| sDown | HURACANRANA | throw→– | 6/18/24 | 6/18/24 | 17.1 | – | KD +14 | – | – | 135 | 78–151 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFwd | RESORTE | mid | 8/0/0 | 51/21/22 | 14.7 | – | KD +43 | 14 | -14 | 204 | 78–215 | RESORTE: início inclui a ida até a corda; momento no acerto 375 px |

## CAMILLE

_pow 0.94_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 3.8 | 14 | +4 | 8 | -2 | 137 | 78–175 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 4.7 | 16 | +3 | 9 | -4 | 171 | 78–209 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 8.5 | 24 | +6 | 12 | -6 | 175 | 78–227 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 12.2 | – | KD +48 | 14 | -9 | 212 | 78–267 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 3.8 | 15 | +4 | 8 | -3 | 155 | 78–192 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.7 | 15 | +2 | 9 | -4 | 161 | 78–198 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 9.4 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 8.5 | – | KD +45 | 14 | -12 | 217 | 78–254 |  |
| jlp |  | over | 2/80/0 | 2/13/0 | 4.7 | 15 | +2 | 10 | -3 | 173 | 78–210 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/11/0 | 7.5 | 20 | +9 | 12 | +1 | 181 | 78–219 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/12/0 | 5.6 | 17 | +5 | 11 | -1 | 173 | 78–210 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/10/0 | 9.4 | 22 | +12 | 13 | +3 | 190 | 78–227 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 11.3 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | PARADE | mid | 3/18/22 | 3/18/22 | – | – | – | – | – | 113 | – | PARADE: ativos = janela de aparar; sem acerto (efeito de defesa/postura) |
| sDown | COUP D'ARRÊT | low | 6/4/16 | 6/4/16 | 8.5 | 20 | 0 | 12 | -8 | 230 | 78–268 |  |
| sFwd | REVERS | mid (alto) | 8/14/22 | 17/5/22 | 12.2 | 24 | -4 | 14 | -14 | 179 | 78–156 |  |
| sResp | FOUETTÉ | mid | 4/5/16 | 4/5/16 | 11.3 | – | KD +50 | 14 | -7 | 201 | 78–238 |  |

## NILA

### ficha base _(pow 1.15)_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 4.6 | 14 | +4 | 8 | -2 | 138 | 78–176 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 5.8 | 16 | +3 | 9 | -4 | 164 | 78–202 |  |
| hp |  | mid (alto) | 8/4/14 | 8/4/14 | 12.7 | 24 | +6 | 12 | -6 | 173 | 78–225 |  |
| hk |  | mid (alto) | 10/5/18 | 10/5/18 | 17.3 | – | KD +48 | 14 | -9 | 185 | 78–241 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.6 | 15 | +4 | 8 | -3 | 159 | 78–196 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 5.8 | 15 | +2 | 9 | -4 | 142 | 78–180 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 11.5 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 10.3 | – | KD +45 | 14 | -12 | 212 | 78–249 |  |
| jlp |  | over | 2/80/0 | 2/15/0 | 5.8 | 15 | +3 | 10 | -2 | 121 | 78–159 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/13/0 | 9.2 | 20 | +7 | 12 | -1 | 127 | 78–165 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/14/0 | 6.9 | 17 | +4 | 11 | -2 | 121 | 78–159 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/12/0 | 11.5 | 22 | +10 | 13 | +1 | 133 | 78–171 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 13.8 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | GOLPE MARMA | mid (alto) | 8/4/20 | 8/4/20 | 6.9 | 46 | +22 | 12 | -12 | 188 | 78–225 |  |
| sDown | VADIVU | mid | 6/1/8 | 6/1/8 | – | – | – | – | – | 165 | – | troca de ficha em mt = S; sem acerto (efeito de defesa/postura) |
| sFwd | PASSO DO ELEFANTE | mid (alto) | 10/10/24 | 10/10/24 | 13.8 | 22 | -12 | 14 | -20 | 146 | 78–243 |  |

### ficha sarpa _(pow 0.9)_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 3.6 | 14 | +4 | 8 | -2 | 138 | 78–176 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 4.5 | 16 | +3 | 9 | -4 | 164 | 78–202 |  |
| hp |  | mid (alto) | 5/4/14 | 5/4/14 | 6.3 | 24 | +6 | 12 | -6 | 173 | 78–225 |  |
| hk |  | mid (alto) | 8/5/18 | 8/5/18 | 9.0 | – | KD +48 | 14 | -9 | 185 | 78–241 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 3.6 | 15 | +4 | 8 | -3 | 159 | 78–196 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.5 | 15 | +2 | 9 | -4 | 142 | 78–180 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 9.0 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 8.1 | – | KD +45 | 14 | -12 | 150 | 78–187 |  |
| jlp |  | over | 2/80/0 | 2/15/0 | 4.5 | 15 | +3 | 10 | -2 | 121 | 78–159 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/13/0 | 7.2 | 20 | +7 | 12 | -1 | 127 | 78–165 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/14/0 | 5.4 | 17 | +4 | 11 | -2 | 121 | 78–159 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/12/0 | 9.0 | 22 | +10 | 13 | +1 | 133 | 78–171 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 10.8 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | BOTE | low | 7/14/18 | 7/14/18 | 7.2 | – | KD +39 | 12 | -20 | 180 | 78–350 |  |
| sDown | VADIVU | mid | 6/1/8 | 6/1/8 | – | – | – | – | – | 165 | – | troca de ficha em mt = S; sem acerto (efeito de defesa/postura) |
| sFwd | SALTO DA SERPENTE | over | 10/80/0 | 10/33/20 | 12.6 | – | KD +18 | 16 | -37 | 134 | 78–429 | aéreo: ativos até pousar |

## BAATAR

_pow 0.9_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 3.6 | 14 | +4 | 8 | -2 | 179 | 78–216 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 4.5 | 16 | +3 | 9 | -4 | 174 | 78–211 |  |
| hp |  | mid (alto) | 9/4/14 | 9/4/14 | 9.9 | 24 | +6 | 12 | -6 | 192 | 78–244 |  |
| hk |  | mid (alto) | 12/5/18 | 12/5/18 | 13.5 | – | KD +48 | 14 | -9 | 229 | 78–285 |  |
| clp |  | mid (alto) | 4/3/8 | 4/3/8 | 3.6 | 15 | +4 | 8 | -3 | 164 | 78–201 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 4.5 | 15 | +2 | 9 | -4 | 167 | 78–204 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 10.8 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 10/6/20 | 10/6/20 | 9.9 | – | KD +45 | 14 | -12 | 214 | 78–252 |  |
| jlp |  | over | 2/80/0 | 2/10/0 | 4.5 | 15 | +5 | 10 | 0 | 151 | 78–188 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/8/0 | 7.2 | 20 | +12 | 12 | +4 | 158 | 78–196 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/9/0 | 5.4 | 17 | +8 | 11 | +2 | 144 | 78–182 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/7/0 | 9.0 | 22 | +15 | 13 | +6 | 159 | 78–196 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 10.8 | – | KD +52 | – | – | 110 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | ARREMESSO DO AVARGA | throw→– | 14/3/36 | 14/1/38 | 19.8 | – | KD +38 | – | – | 110 | 78–161 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sDown | QUEBRA-BASE | low | 10/5/22 | 10/5/22 | 12.6 | – | KD +44 | 14 | -13 | 181 | 78–219 |  |
| sFwd | MERGULHO DA ÁGUIA | over | 12/80/0 | 12/39/26 | 9.0 | – | KD +6 | 16 | -49 | 195 | 78–780+ | aéreo: ativos até pousar; conecta até o teto da varredura (780) |

## ZENON

### ficha base _(pow 1)_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 4.0 | 14 | +4 | 8 | -2 | 178 | 78–215 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 5.0 | 16 | +3 | 9 | -4 | 115 | 78–152 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 9.0 | 24 | +6 | 12 | -6 | 222 | 78–274 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 13.0 | – | KD +48 | 14 | -9 | 286 | 78–341 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.0 | 15 | +4 | 8 | -3 | 198 | 78–236 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 5.0 | 15 | +2 | 9 | -4 | 205 | 78–243 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 10.0 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 9.0 | – | KD +45 | 14 | -12 | 265 | 78–303 |  |
| jlp |  | over | 2/80/0 | 2/9/0 | 5.0 | 15 | +6 | 10 | +1 | 152 | 78–190 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/7/0 | 8.0 | 20 | +13 | 12 | +5 | 160 | 78–198 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/8/0 | 6.0 | 17 | +9 | 11 | +3 | 242 | 78–280 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/6/0 | 10.0 | 22 | +16 | 13 | +7 | 267 | 78–304 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 12.0 | – | KD +52 | – | – | 141 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | SELO DO ARCONTE | mid | 16/3/22 | 16/1/24 | 14.0 | – | KD +46 | 17 | -8 | – | 78–780+ | projétil: início = tick do 1º tiro; conecta até o teto da varredura (780) |
| sDown | COLUNA DE ÔNIX | mid | 4/80/0 | 4/24/22 | 15.0 | – | KD +25 | 14 | -32 | 106 | 78–179 | aéreo: ativos até pousar |
| sFwd | TRIBUTO | mid (alto) | 10/12/22 | 10/12/22 | 10.0 | 26 | -8 | 12 | -22 | 239 | 78–385 |  |

### ficha chefe _(pow 1)_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 4.0 | 14 | +4 | 8 | -2 | 178 | 78–215 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 5.0 | 16 | +3 | 9 | -4 | 115 | 78–152 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 9.0 | 24 | +6 | 12 | -6 | 222 | 78–274 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 13.0 | – | KD +48 | 14 | -9 | 286 | 78–341 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.0 | 15 | +4 | 8 | -3 | 198 | 78–236 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 5.0 | 15 | +2 | 9 | -4 | 205 | 78–243 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 10.0 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 9.0 | – | KD +45 | 14 | -12 | 265 | 78–303 |  |
| jlp |  | over | 2/80/0 | 2/9/0 | 5.0 | 15 | +6 | 10 | +1 | 152 | 78–190 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/7/0 | 8.0 | 20 | +13 | 12 | +5 | 160 | 78–198 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/8/0 | 6.0 | 17 | +9 | 11 | +3 | 242 | 78–280 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/6/0 | 10.0 | 22 | +16 | 13 | +7 | 267 | 78–304 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 12.0 | – | KD +52 | – | – | 141 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | SELO DO ARCONTE | mid | 16/3/22 | 16/1/24 | 14.0 | – | KD +46 | 17 | -8 | – | 78–780+ | projétil: início = tick do 1º tiro; conecta até o teto da varredura (780) |
| sDown | COLUNA DE ÔNIX | mid | 4/80/0 | 4/24/22 | 15.0 | – | KD +25 | 14 | -32 | 106 | 78–179 | aéreo: ativos até pousar |
| sFwd | TRIBUTO | mid (alto) | 10/12/22 | 10/12/22 | 10.0 | 26 | -8 | 12 | -22 | 239 | 78–385 |  |

### ficha chefe2 _(pow 1)_

| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano | Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| lp |  | mid (alto) | 3/3/7 | 3/3/7 | 4.0 | 14 | +4 | 8 | -2 | 178 | 78–215 |  |
| lk |  | mid (alto) | 5/4/9 | 5/4/9 | 5.0 | 16 | +3 | 9 | -4 | 115 | 78–152 |  |
| hp |  | mid (alto) | 7/4/14 | 7/4/14 | 9.0 | 24 | +6 | 12 | -6 | 222 | 78–274 |  |
| hk |  | mid (alto) | 9/5/18 | 9/5/18 | 13.0 | – | KD +48 | 14 | -9 | 286 | 78–341 |  |
| clp |  | mid | 4/3/8 | 4/3/8 | 4.0 | 15 | +4 | 8 | -3 | 198 | 78–236 |  |
| clk |  | low | 6/3/10 | 6/3/10 | 5.0 | 15 | +2 | 9 | -4 | 205 | 78–243 |  |
| chp |  | mid | 6/4/17 | 6/4/17 | 10.0 | – | KD +50 | 12 | -9 | 106 | 78–143 |  |
| chk |  | low | 8/6/20 | 8/6/20 | 9.0 | – | KD +45 | 14 | -12 | 265 | 78–303 |  |
| jlp |  | over | 2/80/0 | 2/9/0 | 5.0 | 15 | +6 | 10 | +1 | 152 | 78–190 | aéreo: ativos até pousar |
| jhp |  | over | 4/80/0 | 4/7/0 | 8.0 | 20 | +13 | 12 | +5 | 160 | 78–198 | aéreo: ativos até pousar |
| jlk |  | over | 3/80/0 | 3/8/0 | 6.0 | 17 | +9 | 11 | +3 | 242 | 78–280 | aéreo: ativos até pousar |
| jhk |  | over | 5/80/0 | 5/6/0 | 10.0 | 22 | +16 | 13 | +7 | 267 | 78–304 | aéreo: ativos até pousar |
| throw |  | throw→– | 3/3/22 | 3/1/24 | 12.0 | – | KD +52 | – | – | 141 | 78–107 | agarrão: ativos = janela de teste; agarrão: não bloqueável |
| sFire | SELO MAIOR | mid | 14/3/22 | 14/1/24 | 16.0 | – | KD +46 | 17 | -8 | – | 78–780+ | projétil: início = tick do 1º tiro; conecta até o teto da varredura (780) |
| sDown | COLUNA DE ÔNIX | mid | 4/80/0 | 4/24/22 | 15.0 | – | KD +25 | 14 | -32 | 106 | 78–179 | aéreo: ativos até pousar |
| sFwd | DECRETO | mid | 8/22/22 | 24/6/22 | 14.0 | 24 | -12 | 14 | -22 | 259 | 78–262 |  |

`*` = a faixa de alcance tem furos na varredura de 6 px (o golpe não conecta em todas as distâncias entre o mínimo e o máximo).
