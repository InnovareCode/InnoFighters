import type { ChamadaReceita } from '../audio/receitas';
import type { CartaoDeEntrada } from './apresentacao-lutadores';

/*
 * ROTEIROS DA ENTRADA DRAMÁTICA (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §2.2 e §2.3): o que cada chefão faz nos 270 ticks da entrada COMPLETA, em DADOS.
 * Só poses que JÁ existem nos atlas (D-P4: arte nova entra trocando o nome da pose, sem código). A linha do tempo (`linhaDaEntrada`) é a mesma para todos:
 * o índice da batida em vigor vira o índice da pose; o ZENON (`entrada0/1/2` em 0/96/144) dá exatamente o 0/1/2 de antes. É APRESENTAÇÃO PURA: nada disto vai ao motor.
 */

/** O efeito de cena de cada entrada (`efeitos-de-entrada.ts`); `braseiros-gr` é o do ZENON e mora na arena `gr` (arena-gr.ts), não neste módulo. */
export type EfeitoDeEntrada = 'braseiros-gr' | 'vapor' | 'holofotes' | 'neblina' | 'luar' | 'vento';

/**
 * Uma batida: a partir do tick `em` (COMPLETA) o chefão mostra `pose`. `zoom` e `dx` são QUADROS-CHAVE: o valor é atingido no `em` desta batida e a câmera/o corpo
 * andam suavemente do quadro-chave anterior até ele (sem valor = a batida não é quadro-chave; antes do 1º, vale 1 / 0). O zoom é o de render (como `pv.zoom` da
 * provocação), ancorado no chão sob o chefão; `dx` é o deslocamento horizontal VISUAL do chefão em px lógicos (CAMILLE entra andando).
 */
export type BatidaDeEntrada = { readonly em: number; readonly pose: string; readonly zoom?: number; readonly dx?: number };

export type RoteiroDeEntrada = {
  readonly cartao: CartaoDeEntrada;
  /** COMPLETA: todas, em ordem de `em`. A CURTA e o pulo ficam na ÚLTIMA (pose e zoom finais). */
  readonly batidas: readonly BatidaDeEntrada[];
  readonly efeito: EfeitoDeEntrada;
  /** A assinatura sonora da entrada (além do som das faixas e do cartão, que são comuns). Só `tone`/`noise` (D8). */
  readonly som?: readonly ChamadaReceita[];
  /** O cartão (nome, contorno, título, fio) e o efeito levam a cor (`accent`) do lutador: os guardiões, para os cinco cartões não parecerem do Arconte. O ZENON mantém a paleta dele. */
  readonly naCorDoLutador?: boolean;
};

/** O roteiro sem o cartão (o cartão vem dos textos do Apolo). */
export type DadosDoRoteiro = Omit<RoteiroDeEntrada, 'cartao'>;

/** Uma sequência de poses que se repete (`walk0..3`) a cada `passo` ticks, de `de` até antes de `ate`. A primeira leva `extra`. */
function ciclo(de: number, ate: number, passo: number, poses: readonly string[], extra: Omit<BatidaDeEntrada, 'em' | 'pose'> = {}): BatidaDeEntrada[] {
  const saida: BatidaDeEntrada[] = [];
  for (let em = de, i = 0; em < ate; em += passo, i++) saida.push({ em, pose: poses[i % poses.length] as string, ...(i === 0 ? extra : {}) });
  return saida;
}

/** As batidas do ZENON: `entrada0` de costas (0), vira a cabeça (96) e aperta a tira (144). */
export const BATIDAS_DO_ZENON: readonly BatidaDeEntrada[] = [
  { em: 0, pose: 'entrada0' },
  { em: 96, pose: 'entrada1' },
  { em: 144, pose: 'entrada2' },
];

/** O roteiro do ZENON: os braseiros da arena `gr` acendem; sem zoom e sem som próprio (o dele já são as faixas, os 6 tons dos braseiros e o cartão). */
export const DADOS_DO_ROTEIRO_DO_ZENON: DadosDoRoteiro = { batidas: BATIDAS_DO_ZENON, efeito: 'braseiros-gr' };

/** O toque curto repetido de um rufo: `n` batidas de `f0` (caindo para `f1`), uma a cada `passo` s. */
function rufo(tipo: OscillatorType, f0: number, f1: number, n: number, passo: number, vol: number, t = 0.14): ChamadaReceita[] {
  return Array.from({ length: n }, (_, i): ChamadaReceita => ({ k: 'T', tipo, f0: f0 * (1 + (i % 2) * 0.06), f1, t, vol: vol * (0.75 + 0.25 * (i / Math.max(1, n - 1))), quando: i * passo }));
}

export const ROTEIROS_DOS_GUARDIOES: Readonly<Record<string, DadosDoRoteiro>> = {
  // AMINU: de guarda (a palma-escudo), carrega o MASHI (sa0 -> sa1, o zoom fecha no punho) e segura o punho (sa2) até o cartão; o zoom volta a 1 no fim.
  aminu: {
    batidas: [
      { em: 0, pose: 'block', zoom: 1 },
      { em: 96, pose: 'sa0', zoom: 1 },
      { em: 120, pose: 'sa1', zoom: 1.12 },
      { em: 144, pose: 'sa2', zoom: 1.12 },
      { em: 214, pose: 'sa2', zoom: 1 },
    ],
    efeito: 'vapor',
    // rufo de kalangu: o tom CAI (f0 -> f0 * 2^(-7/12), como a voz dele)
    som: rufo('triangle', 220, 220 * 2 ** (-7 / 12), 7, 0.085, 0.3),
  },
  // CENTELLA: no ar, vindo da corda (a câmera começa alta e desce), pousa e abre os braços para o público.
  centella: {
    batidas: [
      { em: 0, pose: 'jtop', zoom: 1.15 },
      { em: 96, pose: 'land', zoom: 1 },
      { em: 144, pose: 'win', zoom: 1 },
    ],
    efeito: 'holofotes',
    // rugido da plateia (ruído passa-banda subindo) e o sino do ringue
    som: [
      { k: 'R', tipo: 'bandpass', f0: 400, f1: 1800, Q: 0.8, t: 1.5, vol: 0.2, atq: 0.4 },
      { k: 'T', tipo: 'sine', f0: 880, t: 0.7, vol: 0.14, quando: 0.9 },
      { k: 'T', tipo: 'sine', f0: 1320, t: 0.55, vol: 0.09, quando: 0.9 },
    ],
  },
  // CAMILLE: entra ANDANDO pelo cais (walk0-3 em marcha, vindo da direita), "en garde" (block) e o chute alto apresentado (hk1), recolhido no fim. Câmera fixa.
  camille: {
    batidas: [
      ...ciclo(0, 96, 8, ['walk0', 'walk1', 'walk2', 'walk3'], { dx: 300 }),
      { em: 96, pose: 'block', dx: 0 },
      { em: 144, pose: 'hk1' },
      { em: 192, pose: 'block' },
    ],
    efeito: 'neblina',
    // buzina de navio: dente-de-serra a 70 Hz, longa, com a quinta por cima
    som: [
      { k: 'T', tipo: 'sawtooth', f0: 70, t: 1.8, vol: 0.22, atq: 0.12, filtro: { tipo: 'lowpass', f: 420 } },
      { k: 'T', tipo: 'sawtooth', f0: 105, t: 1.8, vol: 0.1, atq: 0.12, filtro: { tipo: 'lowpass', f: 420 } },
    ],
  },
  // NILA: GAJA (o elefante, idle0), agacha e vira serpente (SARPA, que respira em 4 quadros) e VOLTA a GAJA no cartão: mostra as duas formas.
  nila: {
    batidas: [
      { em: 0, pose: 'idle0', zoom: 1 },
      { em: 96, pose: 'crouch', zoom: 1.04 },
      { em: 114, pose: 'sarpaIdle0', zoom: 1.08 },
      { em: 122, pose: 'sarpaIdle1' },
      { em: 130, pose: 'sarpaIdle2' },
      { em: 138, pose: 'sarpaIdle3' },
      { em: 144, pose: 'idle0', zoom: 1 },
    ],
    efeito: 'luar',
    // rufo de chenda: toques secos e agudos, mais rápidos que o kalangu
    som: rufo('square', 330, 190, 9, 0.06, 0.12, 0.09),
  },
  // BAATAR: a Dança da Águia inteira (devekh0 -> 1 -> 2), sem lacuna, num plano aberto que fecha em 1.
  baatar: {
    batidas: [
      { em: 0, pose: 'devekh0', zoom: 0.95 },
      { em: 96, pose: 'devekh1', zoom: 0.98 },
      { em: 144, pose: 'devekh2', zoom: 1 },
    ],
    efeito: 'vento',
    // vento (ruído passa-baixa) e o canto de garganta (dente-de-serra baixo com formante)
    som: [
      { k: 'R', tipo: 'lowpass', f0: 500, f1: 900, Q: 0.6, t: 2, vol: 0.2, atq: 0.6 },
      { k: 'T', tipo: 'sawtooth', f0: 98, t: 1.8, vol: 0.09, atq: 0.4, filtro: { tipo: 'bandpass', f: 700 }, Q: 6 },
      { k: 'T', tipo: 'sawtooth', f0: 98, t: 1.8, vol: 0.05, atq: 0.4, filtro: { tipo: 'bandpass', f: 1400 }, Q: 8 },
    ],
  },
};
