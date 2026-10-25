import type { IdPlano, InputsDaTomada, Tomada, TomadasDoTrailer } from './tipos';

/*
 * A PARTITURA do trailer (docs/partitura-trailer.md, R-13/R-14). Cada plano de luta tem as entradas dos DOIS lutadores escritas à mão, na notação do Apolo, e este módulo as compila em
 * máscaras de bits por update do motor (`Tomada.inputs`). Os dois lutadores são HUMANOS no trailer: sem CPU, sem RNG, sem busca de semente. O que acontece é o que está escrito aqui.
 *
 * TEMPO. Os números são "ticks do MOTOR" do plano: o tick 0 é o 1º update que o 1º quadro do plano mostra (depois da pré-rolagem); negativos são a pré-rolagem (PR), que põe os
 * dois na distância de abertura. NÃO são ticks do trailer: a câmera lenta (1 update a cada `fator` ticks), a tarja do super (30) e o filme (30 a 66) param o motor, então um
 * contato que a partitura põe no tick 104 do motor cai no tick 104 + (o que já parou) do plano. O CI mede os dois (`alvo` no roteiro é em ticks do PLANO).
 *
 * NOTAÇÃO (separada por espaços; direções RELATIVAS ao lutador, que o `FonteEntradas` traduz pelo `facing` do tick):
 *   F[a,b)  T[a,b)  D[a,b)  U[a,b)  DT[a,b)    direção(ões) segurada(s) do tick a até b-1 (F frente, T trás, D baixo, U cima)
 *   lp@t hp@t lk@t hk@t sp@t esq@t              borda do botão no tick t
 *   D+sp@t  F+hk@t                              direção + borda; a direção fica segurada de t-2 a t+1 (como a mão faz: a direção vem antes do botão)
 *   UF@t                                        pulo: as direções ficam seguradas de t a t+3
 *   sp~[a,b)                                    ESP segurado (a carga do AMINU): borda em a, `spSeg` até b-1
 *   hp+hk@t                                     SUPER: as duas bordas no mesmo tick (a barra tem de estar cheia)
 */

/** O 1º update em que o `Game` lê entradas (a intro dura 90 updates e a luta começa no 90). O índice 0 das máscaras é este update. */
export const PRIMEIRO_UPDATE_DE_LUTA = 90;

export const BIT = { F: 1, T: 2, D: 4, U: 8, lp: 16, hp: 32, lk: 64, hk: 128, sp: 256, spSeg: 512, esq: 1024 } as const;
type Botao = 'lp' | 'hp' | 'lk' | 'hk' | 'sp' | 'esq';

const BITS_DIRECAO: Readonly<Record<string, number>> = { F: BIT.F, T: BIT.T, D: BIT.D, U: BIT.U };
const direcoes = (letras: string): number => [...letras].reduce((m, l) => m | (BITS_DIRECAO[l] ?? 0), 0);

/** Quantos updates cabem na máscara de um plano: a pré-rolagem, os 192 ticks do trailer e folga para o motor andar mais que o trailer (nunca anda mais de 1 por tick). */
const FOLGA = 40;

/** Compila a notação de UM lutador numa máscara por update. `pr` = pré-rolagem; `duracao` = ticks do plano. Lança em token inválido (a partitura é dado do repositório). */
export function compilarLado(texto: string, pr: number, duracao = 192): number[] {
  const m: number[] = new Array<number>(pr + duracao + FOLGA).fill(0);
  const marca = (de: number, ate: number, bits: number): void => {
    for (let t = de; t < ate; t++) if (pr + t >= 0 && pr + t < m.length) m[pr + t] = (m[pr + t] as number) | bits;
  };
  for (const tok of texto.split(/\s+/).filter(Boolean)) {
    let r: RegExpExecArray | null;
    if ((r = /^([FTDU]+)\[(-?\d+),(-?\d+)\)$/.exec(tok))) marca(Number(r[2]), Number(r[3]), direcoes(r[1] as string));
    else if ((r = /^([FTDU]+)@(-?\d+)$/.exec(tok))) marca(Number(r[2]), Number(r[2]) + 4, direcoes(r[1] as string));
    else if ((r = /^hp\+hk@(-?\d+)$/.exec(tok))) marca(Number(r[1]), Number(r[1]) + 1, BIT.hp | BIT.hk);
    else if ((r = /^(?:([FTDU]+)\+)?(lp|hp|lk|hk|sp|esq)@(-?\d+)$/.exec(tok))) {
      const t = Number(r[3]);
      marca(t, t + 1, BIT[r[2] as Botao]);
      if (r[1]) marca(t - 2, t + 2, direcoes(r[1]));
    } else if ((r = /^sp~\[(-?\d+),(-?\d+)\)$/.exec(tok))) {
      marca(Number(r[1]), Number(r[1]) + 1, BIT.sp);
      marca(Number(r[1]), Number(r[2]), BIT.spSeg);
    } else throw new Error(`partitura: token inválido "${tok}"`);
  }
  return m;
}

/** Uma batida declarada: `t` = tick do MOTOR em que o acerto sai; `t0` = tick em que o golpe começou (só o super: onde abre a tarja). */
export type BatidaDaPartitura = readonly [t: number, t0?: number];

export interface PartituraDoPlano {
  /** Pré-rolagem, em updates depois da intro: o tempo de os dois andarem até a distância de abertura. */
  readonly pr: number;
  readonly p1: string;
  readonly p2: string;
  /** Uma por `pede` do roteiro, na mesma ordem. */
  readonly batidas: readonly BatidaDaPartitura[];
  readonly energia?: readonly [number, number];
  readonly vida?: readonly [number, number];
  /** O hash do estado do `Game` ao fim do plano (o CI confere; `npm run trailer:escalar` imprime o atual). */
  readonly impressao: string;
}

/*
 * Ticks do MOTOR (ver o cabeçalho). As batidas `[t, t0?]` foram MEDIDAS com `npm run trailer:escalar -- --plano Px --rastro` e o CI as confere. `energia` é a de cada lado no 1º update de LUTA
 * (a intro e a pré-rolagem somam a regeneração de 0,07/tick; o Apolo previu [0, 0], mas todo especial custa 20 a 45 e o 1º sai antes de a barra encher).
 */
export const PARTITURA: Readonly<Partial<Record<IdPlano, PartituraDoPlano>>> = {
  // HAYATO x WEI LONG: o WEI solta a ZHEN DI (tremor rente ao chão), o HAYATO pula por cima, acerta o chute no ar, pousa e fecha o BÁSICO ↓SF › CFT › ↓ESP (RAIJIN-KEN, câmera lenta).
  P1: {
    pr: 34,
    p1: 'F[-34,0) T[0,6) F[6,14) UF@18 hk@44 F[64,76) D+lp@76 hk@82 D[90,105) sp@92 T[166,180) F[180,192)',
    p2: 'F[-28,12) D+sp@18 F[150,192)',
    energia: [30, 30],
    batidas: [[49], [94], [105]],
    impressao: 'db8336b9',
  },
  // MIN-JI x CAIO: HANA-DUL-SET (lk, lk, hk) defendido na ginga; no corte o CAIO defende a voadora e devolve a rasteira (D+hk).
  P2: {
    pr: 30,
    p1: 'F[-30,6) T[6,10) F[10,16) T[16,20) F[20,28) T[28,32) F[32,40) lk@43 lk@61 hk@79 T[88,98) F[100,112) F+sp@112',
    p2: 'F[-24,0) T[0,10) F[10,20) T[20,30) F[30,40) T[40,91) T[100,108) T[108,126) F[126,130) D+lk@134 D+lk@143 D+hk@152 F[170,178) T[178,186) F[186,192)',
    energia: [40, 40],
    batidas: [[47], [65], [117], [171]],
    impressao: 'b4472e3b',
  },
  // AMINU x HAYATO: o AMINU carrega a MASHI andando; o HAYATO recua, testa o vazio, volta e defende de pé; a MASHI nível 3 quebra a guarda; o AMINU fecha com SF › CFT › PASSO DO LEÃO.
  P3: {
    pr: 35,
    p1: 'F[-35,6) sp~[6,92) F[10,92) lp@121 hk@126 F[136,152) sp@138 F[172,192)',
    p2: 'F[-32,0) T[0,30) lp@34 F[46,84) T[90,100) DT[172,192)',
    energia: [40, 40],
    batidas: [[92], [141]],
    impressao: 'bc122743',
  },
  // CENTELLA x CAIO: a CAIO joga a ONDA VERDE, ela defende, recua até a corda e volta no RESORTE; o CAIO avança na ginga e leva a voadora.
  P4: {
    pr: 30,
    p1: 'F[-30,0) DT[20,44) T[44,60) F[76,96) sp@78 T[150,170) F[170,192)',
    p2: 'F[-30,0) sp@6 F[34,70) T[70,76) F[76,150) T[150,160) F[160,170) T[170,180) F[180,192)',
    energia: [40, 40],
    batidas: [[56], [121]],
    impressao: '2a8a3748',
  },
  // CAMILLE x MIN-JI: a MIN-JI ataca (soco forte), a CAMILLE a pega na preparação (COUP D'ARRÊT), prende o chute fraco e fecha no REVERS; as duas voltam ao jogo de pernas.
  P5: {
    pr: 40,
    p1: 'F[-40,0) F[0,4) T[4,8) F[8,14) T[14,20) F[20,26) D+sp@30 F[46,58) D+lk@58 F[62,80) sp@64 T[121,140) F[140,150) T[150,160) F[160,172) T[172,182) F[182,192)',
    p2: 'F[-34,0) F[0,4) T[4,8) F[8,14) T[14,18) F[18,26) hp@34 F[122,134) lk@140 T[150,160) F[160,172) T[172,182) F[182,192)',
    energia: [40, 40],
    batidas: [[36], [66], [90]],
    impressao: 'a1e9c1d5',
  },
  // NILA x WEI LONG: o WEI pisa (ZHEN DI), a NILA defende agachada, avança, SF › SFT › PASSO, troca de postura (VADIVU) e a SARPA fecha com o BOTE.
  P6: {
    pr: 37,
    p1: 'F[-30,12) DT[16,40) F[44,62) D+lp@63 hp@70 F+sp@82 D+sp@128 sp@146 F[184,192)',
    p2: 'F[-37,0) D+sp@4 F[48,62) F[122,160)',
    energia: [40, 40],
    batidas: [[18], [80], [95], [153]],
    impressao: 'fad78798',
  },
  // BAATAR x HAYATO: o soco forte com armadura atravessa o chute do HAYATO e o ARREMESSO DO AVARGA bate o HAYATO no chão; o BAATAR parte no MERGULHO DA ÁGUIA.
  P7: {
    pr: 30,
    p1: 'F[-30,36) hp@38 F[56,66) sp@72 T[96,100) F[112,160) sp@130',
    p2: 'F[-23,0) T[0,6) F[8,30) lk@40 T[74,80) F[112,118) T[118,124) sp@126',
    energia: [90, 40],
    batidas: [[51], [86]],
    impressao: '4b1128c4',
  },
  // HAYATO x ZENON (o ÚNICO super do trailer): o ZENON defende o BÁSICO do HAYATO e o RAIJIN-KEN, pune o pouso e fecha na CORTESIA DA CASA (tarja de 30, 5 acertos presos, o último mata, filme CURTO).
  P9: {
    pr: 70,
    p1: 'F[-70,1) D+lp@1 D[10,32) sp@16',
    p2: 'F[-70,-16) DT[-16,40) F[40,56) D+lp@58 hp+hk@75',
    energia: [40, 100],
    vida: [0.18, 1],
    batidas: [[5], [23], [62], [91, 75], [131]],
    impressao: '3e797860',
  },
};

export function compilarPlano(p: PartituraDoPlano): Tomada {
  const inicio = PRIMEIRO_UPDATE_DE_LUTA - 1 + p.pr;
  const inputs: InputsDaTomada = { p1: compilarLado(p.p1, p.pr), p2: compilarLado(p.p2, p.pr) };
  return {
    inicio,
    batidas: p.batidas.map(([t, t0], i) => ({ pedida: i, tickMotor: inicio + 1 + t, tickInicio: inicio + 1 + (t0 ?? t) })),
    impressao: p.impressao,
    inputs,
    ...(p.energia ? { energia: p.energia } : {}),
    ...(p.vida ? { vida: p.vida } : {}),
  };
}

export function compilarPartitura(partitura: Readonly<Partial<Record<IdPlano, PartituraDoPlano>>> = PARTITURA): TomadasDoTrailer {
  const r: Partial<Record<IdPlano, Tomada>> = {};
  for (const [id, p] of Object.entries(partitura) as [IdPlano, PartituraDoPlano][]) r[id] = compilarPlano(p);
  return r;
}
