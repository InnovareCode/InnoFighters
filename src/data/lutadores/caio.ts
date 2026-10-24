import type { LutadorDef } from '../tipos';

/** CAIO (f4 no protótipo): capoeira, chutes de longo alcance. */
export const CAIO: LutadorDef = {
  id: 'caio',
  idPrototipo: 'f4',
  country: 'BRASIL',
  stage: 'br',
  stageName: 'Copacabana, Rio de Janeiro',
  name: 'CAIO',
  title: 'Mestre da Ginga',
  pitch: 0.98,
  desc: 'Chutes longos e mobilidade. Controla o espaço.',
  fire: ['#c8ff3a', '#fffde0', '#2fb52f'],
  accent: '#7ddc3a',
  pow: 0.97,
  spd: 1.07,
  hp: 98,
  jump: 1.12,
  scale: 1.02,
  stride: 13,
  bars: [3, 4, 3, 5],
  // V2-4 (`motorV2.combos`): combos próprios. NOMES PROVISÓRIOS (o Apolo dá os definitivos em docs/combos-proprios.md); o `id` é estável.
  combosProprios: [
    { id: 'caio-ginga-rasteira', nome: 'VOLTA AO MUNDO', sequencia: ['clk', 'clk', 'chk'], final: 'cruza' },
    { id: 'caio-meia-lua-encadeada', nome: 'SÃO BENTO GRANDE', sequencia: ['lk', 'hk', 'sFwd'], semQueda: [1], efeito: 'segura em pé e fecha na MEIA-LUA' },
  ],
  reach: 1.12,
  // CAPOEIRA (2026-10-24): o `sa1` deixa de ser a pose genérica (soco) e passa a ser o chute da meia-lua (ponta no pé,
  // não na mão). Sem fixar aqui, a ONDA VERDE nasceria na altura da cabeça. Valor = tipY do `sa1` de HOJE (ponta
  // [380, 118.39] de h=400, k = 255/396) x scale 1.02, medido ANTES da troca da folha (auditoria §6.2).
  alturaDoProjetil: 185,
  // ARTE NOVA (2026-10-23): o alcance de golpe nasce da ponta (tipX/tipY) do atlas, e as poses novas chegam mais longe. O `rm`
  // (e o `bh` do hk e da MEIA-LUA) abaixo devolve a caixa do CAIO ao tamanho de antes: largura a +-10% da original, medida em
  // tests/unit/caio-arte-calibrada.test.ts. Os números do protótipo seguem em tests/fixtures/dados-prototipo/originais.json.
  // Antes -> depois: lp 0.8 -> 0.65, lk 1.15 -> 0.87, hp 0.95 -> 0.72, hk 1.38 -> 1.22 (+ bh 168), jlp 1 -> 0.76 (novo),
  // jhp 1.05 -> 0.8, jlk 1.15 -> 0.74, jhk 1.25 -> 0.8; RABO-DE-ARRAIA rm 2 -> 2.8; MEIA-LUA rm 1.2 -> 0.76 e bh 92 -> 160.
  // clp, clk e chk já caem a menos de 10%: intactos. O hp ficou +9% (e não -1%): com a largura igual o CAIO perdia 5 pontos de
  // vitória no harness (49,2% -> 43,8%); com 0.72 volta a 47,8%. Altura da caixa (não corrigível por dados): ver o teste.
  // GINGA (f1 v2, 2026-10-23): o idle agachado (553 px contra 573) com alturaRef 396 sobe o K do jogo em 410/396 (+3,5%) e todo
  // alcance cresce junto (hp +8,6% -> +12,3%, clp +6,5% -> +10,0%; os outros ficam a +3-4%, dentro da janela). Só dois ajustes: clp
  // rm .99 (volta a +8,8%) e hk bh 168 -> 184 (o pé da caixa, que sobe com a ponta, volta a 158). Devolver TODAS as larguras ao
  // que eram derrubou o CAIO a 46,4% (esquiva) no harness; sem tocar nelas ele fica a 49,6%: a taxa mora no hp (rm .72 -> .70 = -1,8 pt).
  // O hp ficou em .72 (+12,3%, ver o teste). Harness: 49,7% com esquiva (referência 49,2%) e 50,7% sem (referência 51,3%).
  // CAPOEIRA (2026-10-24): f3 v2 + CR2 trocam a pose ATIVA de lp, hp, hk, clk, chk, jlp/jhp (jpunch -> alias jkick) e jlk/jhk:
  // a largura saiu da janela de +-10% (tests/unit/caio-arte-calibrada.test.ts) e foi recalibrada por dados, igual que antes.
  // Primeira passada (só largura +-10%, bh do hk/sFwd pela altura): harness caiu para 33,8% (esquiva, --pares caio:*,*:caio,
  // 720 lutas) contra a referência 49,2-49,7%. Causa: a largura não era a alavanca que faltava — `lk` tinha o CENTRO da caixa
  // (tipY*scale, fixo pela pose; só o `bh` espalha em torno dele) 52 px mais alto que antes (desvio da arte), caindo quase
  // fora da faixa de acerto do adversário em pé; sem corrigir, nenhum rm resolve. `lk.bh` 70 -> 174 (a caixa cresce em torno
  // do mesmo centro até alcançar de novo o "pé" de antes) tirou o CAIO de 38% para 42%; aí sim valeu empurrar a largura ao
  // teto de +-10%/+13% do teste: hp .72->.90, hk 1.22->1.15 (+ bh 184->154: pé da caixa de volta a 158), clk 1.1->0.965, chk
  // 1.4->1.04, lp .65->.86 (também batia no piso de 90px), jlp/jhp/jlk/jhk .76/.8/.74/.8 -> .72/.76/.7/.76 (jpunch e jkick
  // caem no MESMO quadro agora, o `jkick` da CR2), sFwd.bh 160->188 (a meia-lua segue acertando quem está agachado: o `sc1`
  // espelhado sobe a ponta). `clp`, `chp`, `sFire`, `sDown`, `throw` ficaram com desvios pequenos (1-3 pt de acerto, dentro do
  // ruído) e não foram tocados. A amostra filtrada (`--pares caio:*,*:caio --sem-chefe --esquiva`, 720 lutas) ainda fechou em
  // 47,6% (a referência NESSE modo, antes da capoeira, é 51,5%) — amostra pequena/enviesada (só os 9 bots, sem espelho). O
  // harness OFICIAL (`--completo --esquiva`, 3600 lutas, docs/balanco) deu **49,7%** (IC95 48-51%), dentro da faixa 49,2-49,7%
  // e sem alerta: regravado em 2026-10-24.
  mods: {
    lp: { rm: 0.86 },
    lk: { rm: 0.96, bh: 174 },
    hp: { S: 8, dmg: 8.5, rm: 0.9 },
    hk: { S: 10, dmg: 12.5, rm: 1.15, bh: 154 },
    clp: { rm: 0.99 },
    clk: { rm: 0.965 },
    chk: { rm: 1.04 },
    jlp: { rm: 0.72 },
    jhp: { rm: 0.76 },
    jlk: { rm: 0.7 },
    jhk: { rm: 0.76 },
  },
  especiais: {
    sFire: {
      name: 'ONDA VERDE', info: 'Meia-lua de energia que VAI e VOLTA como bumerangue. Pode acertar na volta.', pose: 'special', type: 'fire', kind: 'fire',
      S: 12, A: 3, R: 17, cost: 38, rank: 9,
      proj: { dmg: 14, sp: 11.5, kb: 9, hs: 25, kd: true, style: 'boomerang', sc: 1.05, acc: 0.3, life: 150 },
    },
    sDown: {
      name: 'RABO-DE-ARRAIA', info: 'Rasteira giratória de alcance enorme. Golpe BAIXO que derruba.', pose: 'sweep', type: 'melee', kind: 'sweep', snd: 'kick',
      S: 9, A: 7, R: 22, cost: 24, rank: 9,
      dmg: 13, kb: 8, hs: 0, bs: 15, kd: 1, lvl: 'low', bh: 58, rm: 2.8, crouch: 1, heavy: 1, spin: 1,
    },
    sFwd: {
      name: 'MEIA-LUA', info: 'Salto de ginga com chute descendente. Golpe ALTO: só se defende em pé.', pose: 'jumpKick', pre: 'crouch',
      type: 'leap', kind: 'kick', snd: 'kick', S: 6, A: 80, R: 0, cost: 20, rank: 9,
      vy: -10.8, vx: 8.4, lag: 12, dmg: 14, kb: 8, hs: 26, bs: 13, lvl: 'over', air: 1, bh: 188, rm: 0.76, heavy: 1,
    },
  },
};
