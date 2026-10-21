import { ALTURA, LARGURA } from '../core/constantes';
import { easeOut } from '../core/math';
import type { ChamadaReceita } from '../audio/receitas';
import { zoomIn } from './animacao';
export { VEU_DA_ARENA } from './arena-gr';
import type { CartaoDeEntrada } from './apresentacao-lutadores';
import type { Ctx } from './tela';
import { texto, textoArcade } from './texto';

/*
 * ENTRADA DRAMÁTICA do chefão (docs/spec-chefao-zenon.md §3.2). É APRESENTAÇÃO PURA e fica FORA do motor e do lock-step: a cena da luta NÃO chama
 * `game.update` enquanto ela roda (como a cinemática do especial e a pausa), então tick, relógio, RNG da luta e eventos pendentes (`round start`)
 * são exatamente os de uma luta sem entrada. Ela só usa o `rngVisual` (e nem isso: a linha do tempo é uma função pura do tick).
 *
 * COMPLETA = 156 ticks (2,6 s): faixas de cinema entram (0-12), os 6 braseiros acendem da esquerda para a direita (12-48, um a cada 6 ticks), o
 * chefe de costas (`entrada0`) vira a cabeça (`entrada1`, 48-84) e aperta a tira sorrindo (`entrada2`, 84-156) com o cartão e a fala; as faixas saem
 * nos últimos 12. CURTA = 60 ticks: faixas + `entrada2` + cartão, sem os braseiros em sequência. Pular (ataque, ESP ou ENTER de um humano) só vale
 * depois do tick 10 (não engole o ENTER que confirmou o VS) e a saída leva no máximo 6 ticks.
 */

export type ModoEntrada = 'completa' | 'curta';

export const DURACAO_ENTRADA_COMPLETA = 156;
export const DURACAO_ENTRADA_CURTA = 60;
/** O pulo só vale a partir deste tick. */
export const PULO_VALE_A_PARTIR_DE = 10;
/** Ao pular, a saída leva no máximo isto (o mesmo da cinemática do especial). */
export const SAIDA_AO_PULAR = 6;
/** Altura das faixas de cinema (px lógicos) e quanto elas levam para entrar e sair. */
export const ALTURA_DA_FAIXA = 56;
export const TICKS_DA_FAIXA = 12;
/** Os braseiros da arena `gr`: quantos acendem na sequência, em que tick começa e quantos ticks cada um leva. */
export const BRASEIROS = 6;
export const BRASEIROS_COMECAM_EM = 12;
export const TICKS_POR_BRASEIRO = 6;
/** Ticks em que o chefe vira a cabeça e em que aperta a tira (COMPLETA). */
export const VIRA_A_CABECA_EM = 48;
export const APERTA_A_TIRA_EM = 84;
/** O cartão do nome aparece neste tick (COMPLETA) e neste (CURTA). */
export const CARTAO_COMPLETA_EM = 84;
export const CARTAO_CURTA_EM = 8;
/** A fala começa neste tick (COMPLETA) e revela este tanto de letras por tick. */
export const FALA_COMECA_EM = 90;
export const LETRAS_POR_TICK = 1.9;

/** Quanto dura a entrada neste modo. */
export const duracaoDaEntrada = (modo: ModoEntrada): number => (modo === 'completa' ? DURACAO_ENTRADA_COMPLETA : DURACAO_ENTRADA_CURTA);

export type QuadroDaEntrada = {
  /** Altura de cada faixa de cinema (0 a 56). */
  readonly faixa: number;
  /** Braseiros acesos (0 a 6, fracionário: o que está acendendo conta pela fração). */
  readonly acesos: number;
  /** Índice da pose do chefe: 0 de costas, 1 vira a cabeça, 2 aperta a tira. */
  readonly pose: 0 | 1 | 2;
  /** Progresso do cartão (0 a 1) e a opacidade dele (cai na saída). */
  readonly cartao: number;
  readonly alfa: number;
  /** Letras da fala já reveladas. */
  readonly letras: number;
};

/**
 * A linha do tempo (pura): o que aparece no tick `tick` de uma entrada `modo`. `pulouEm` = o tick em que o jogador pulou (null = não pulou): dali a
 * saída leva `SAIDA_AO_PULAR` ticks e os braseiros acabam de acender, o chefe fica em `entrada2`.
 */
export function linhaDaEntrada(modo: ModoEntrada, tick: number, pulouEm: number | null = null): QuadroDaEntrada {
  const total = duracaoDaEntrada(modo);
  const fim = pulouEm === null ? total : Math.min(total, pulouEm + SAIDA_AO_PULAR);
  const saidaIni = pulouEm === null ? total - TICKS_DA_FAIXA : pulouEm;
  const saidaDur = Math.max(1, fim - saidaIni);
  const saindo = tick >= saidaIni ? Math.min(1, (tick - saidaIni) / saidaDur) : 0;
  const entrando = Math.min(1, tick / TICKS_DA_FAIXA);
  const faixa = ALTURA_DA_FAIXA * easeOut(entrando) * (1 - saindo);

  const sequencia = modo === 'completa';
  const acesosNormal = !sequencia ? BRASEIROS : Math.min(BRASEIROS, Math.max(0, (tick - BRASEIROS_COMECAM_EM) / TICKS_POR_BRASEIRO));
  // pulou: os que faltam acendem de uma vez durante a saída
  const acesos = pulouEm === null || !sequencia ? acesosNormal : Math.min(BRASEIROS, acesosNormal + (BRASEIROS - acesosNormal) * saindo);
  const pose = !sequencia || pulouEm !== null ? 2 : tick < VIRA_A_CABECA_EM ? 0 : tick < APERTA_A_TIRA_EM ? 1 : 2;

  const cartaoEm = sequencia ? CARTAO_COMPLETA_EM : CARTAO_CURTA_EM;
  const cartao = Math.min(1, Math.max(0, (tick - cartaoEm) / 10));
  const falaEm = sequencia ? FALA_COMECA_EM : CARTAO_CURTA_EM + 6;
  const letras = Math.max(0, (tick - falaEm) * LETRAS_POR_TICK);
  return { faixa, acesos, pose, cartao, alfa: 1 - saindo, letras };
}

/** A fala da entrada neste modo: a COMPLETA diz tudo; a CURTA só a primeira frase. */
export function falaDaEntrada(modo: ModoEntrada, fala: string): string {
  if (modo === 'completa') return fala;
  const i = fala.indexOf('. ');
  return i < 0 ? fala : fala.slice(0, i + 1);
}

/** Receitas de som (só `tone`/`noise` do AudioSys: D8). */
export const SOM_DAS_FAIXAS: readonly ChamadaReceita[] = [{ k: 'R', tipo: 'bandpass', f0: 300, f1: 2400, Q: 1, t: 0.4, vol: 0.18 }];
export const somDoBraseiro = (i: number): readonly ChamadaReceita[] => [
  { k: 'R', tipo: 'bandpass', f0: 700, f1: 3000, Q: 1.5, t: 0.14, vol: 0.12 },
  { k: 'T', tipo: 'triangle', f0: 523 * 2 ** (i / 6), t: 0.18, vol: 0.1 },
];
export const SOM_DO_CARTAO: readonly ChamadaReceita[] = [
  { k: 'T', tipo: 'sawtooth', f0: 147, t: 0.6, vol: 0.12, filtro: { tipo: 'lowpass', f: 900 } },
  { k: 'T', tipo: 'sine', f0: 50, t: 0.4, vol: 0.6 },
];

export type SomDaEntrada = 'faixas' | 'cartao' | { readonly braseiro: number };

export interface OpcoesEntrada {
  /** Toca uma receita. */
  readonly aoSom?: (som: SomDaEntrada) => void;
}

/**
 * O controlador da entrada. API da `Cinematica`: `iniciar`, `ativa`, `avancar`, `pular`, `desenhar`. O chamador (a cena da luta) chama `avancar()` UMA
 * vez por tick no lugar de `game.update`, e `desenhar()` por cima do mundo desenhado sem HUD.
 */
export class EntradaDoChefe {
  ativa = false;
  modo: ModoEntrada = 'completa';
  /** Ticks que já andaram desde `iniciar` (0 no começo). */
  tick = 0;
  pulouEm: number | null = null;
  private cartao: CartaoDeEntrada | null = null;
  private fala = '';
  private acesosSoados = 0;
  private somDoCartao = false;

  constructor(private readonly op: OpcoesEntrada = {}) {}

  /** Começa a entrada. `cartao` e `fala` vêm de `APRESENTACAO`. */
  iniciar(modo: ModoEntrada, cartao: CartaoDeEntrada, fala = ''): void {
    this.ativa = true;
    this.modo = modo;
    this.tick = 0;
    this.pulouEm = null;
    this.cartao = cartao;
    this.fala = falaDaEntrada(modo, fala);
    this.acesosSoados = 0;
    this.somDoCartao = false;
    this.op.aoSom?.('faixas');
  }

  /** Para tudo (a luta foi reiniciada ou a cena saiu). */
  zerar(): void {
    this.ativa = false;
    this.tick = 0;
    this.pulouEm = null;
    this.cartao = null;
  }

  /** O quadro de agora. */
  quadro(): QuadroDaEntrada {
    return linhaDaEntrada(this.modo, this.tick, this.pulouEm);
  }

  /** Quanto falta para acabar (ticks). */
  restante(): number {
    return Math.max(0, this.fim() - this.tick);
  }

  private fim(): number {
    const total = duracaoDaEntrada(this.modo);
    return this.pulouEm === null ? total : Math.min(total, this.pulouEm + SAIDA_AO_PULAR);
  }

  /** Pula (só vale depois do tick 10 e uma vez). Devolve se valeu. */
  pular(): boolean {
    if (!this.ativa || this.pulouEm !== null || this.tick < PULO_VALE_A_PARTIR_DE) return false;
    this.pulouEm = this.tick;
    return true;
  }

  /** Um tick: anda o relógio da entrada (nunca o da luta) e dispara os sons. Quando chega ao fim, `ativa` vira false. */
  avancar(): void {
    if (!this.ativa) return;
    this.tick++;
    const q = this.quadro();
    // um tom por braseiro que acabou de acender; o cartão bate quando aparece
    while (this.modo === 'completa' && this.pulouEm === null && this.acesosSoados < Math.min(BRASEIROS, Math.floor(q.acesos))) this.op.aoSom?.({ braseiro: this.acesosSoados++ });
    if (!this.somDoCartao && q.cartao > 0) {
      this.somDoCartao = true;
      this.op.aoSom?.('cartao');
    }
    if (this.tick >= this.fim()) this.ativa = false;
  }

  /** Desenha as faixas, o cartão e a fala por cima do mundo (que a cena desenhou sem HUD). */
  desenhar(ctx: Ctx): void {
    if (!this.ativa) return;
    const q = this.quadro();
    ctx.save();
    // faixas de cinema
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LARGURA, q.faixa);
    ctx.fillRect(0, ALTURA - q.faixa, LARGURA, q.faixa);
    const c = this.cartao;
    if (c && q.cartao > 0) {
      const k = easeOut(q.cartao);
      const x = LARGURA / 2 - (1 - k) * 70;
      ctx.globalAlpha = q.alfa;
      // fio de ouro sob o título
      ctx.fillStyle = '#d9b25a';
      ctx.fillRect(LARGURA / 2 - 150 * k, 168, 300 * k, 2);
      textoArcade(ctx, c.nome, x, 100, 56, ['#ffffff', '#f0c8e6'], '#2a0418', 'center', zoomIn(q.cartao * 14), k);
      textoArcade(ctx, c.titulo, x, 142, 30, ['#fff0b0', '#d9b25a'], '#1a0612', 'center', 1, k);
      texto(ctx, c.rodape.split('').join(' '), x, 184, 13, '#d9b25a', 'center', { alpha: k });
      ctx.globalAlpha = 1;
    }
    // fala na faixa de baixo (letreiro: aparece letra a letra)
    if (this.fala && q.letras > 0 && q.faixa > 40) {
      const visivel = this.fala.slice(0, Math.floor(q.letras));
      const corte = this.fala.indexOf('. ');
      const dividir = corte >= 0 && this.fala.length > 40;
      const l1 = dividir ? this.fala.slice(0, corte + 1) : this.fala;
      const l2 = dividir ? this.fala.slice(corte + 2) : '';
      const v1 = visivel.slice(0, l1.length);
      const v2 = dividir ? visivel.slice(l1.length + 1) : '';
      ctx.globalAlpha = q.alfa;
      texto(ctx, v1, LARGURA / 2, dividir ? ALTURA - 40 : ALTURA - 28, 20, '#ffffff', 'center');
      if (l2) texto(ctx, v2, LARGURA / 2, ALTURA - 15, 19, '#f0c8e6', 'center');
      ctx.globalAlpha = 1;
    }
    ctx.restore();
  }
}
