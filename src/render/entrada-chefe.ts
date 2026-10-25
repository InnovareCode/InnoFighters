import { ALTURA, LARGURA } from '../core/constantes';
import { easeOut } from '../core/math';
import type { ChamadaReceita } from '../audio/receitas';
import { zoomIn } from './animacao';
export { VEU_DA_ARENA } from './arena-gr';
import type { CartaoDeEntrada } from './apresentacao-lutadores';
import { desenharEfeitoDeEntrada } from './efeitos-de-entrada';
import { mistura } from './estilos-especiais';
import { BATIDAS_DO_ZENON, type BatidaDeEntrada, type RoteiroDeEntrada } from './roteiros-de-entrada';
import type { Ctx } from './tela';
import { texto, textoArcade } from './texto';

/*
 * ENTRADA DRAMÁTICA do chefão (docs/spec-chefao-zenon.md §3.2). É APRESENTAÇÃO PURA e fica FORA do motor e do lock-step: a cena da luta NÃO chama
 * `game.update` enquanto ela roda (como a cinemática do especial e a pausa), então tick, relógio, RNG da luta e eventos pendentes (`round start`)
 * são exatamente os de uma luta sem entrada. Ela só usa o `rngVisual` (e nem isso: a linha do tempo é uma função pura do tick).
 *
 * COMPLETA = 270 ticks (4,5 s, sem pressa; era 156, decisão do dono em 2026-10-21): as faixas de cinema entram (0-20), os 6 braseiros acendem da
 * esquerda para a direita (30-90, um a cada 10 ticks), o chefe de costas (`entrada0`, 0-96) vira a cabeça (`entrada1`, 96-144) e aperta a tira sorrindo
 * (`entrada2`, 144-270); o cartão do nome entra em 144 e a fala começa em 150 (1,2 letra por tick: as 89 letras terminam em ~224 e ficam na tela até as
 * faixas saírem, nos últimos 20 ticks). CURTA = 60 ticks, INTACTA: faixas de 12 + `entrada2` + cartão, sem os braseiros em sequência. Pular (ataque, ESP
 * ou ENTER de um humano) só vale depois do tick 10 (não engole o ENTER que confirmou o VS) e a saída leva no máximo 6 ticks, nos dois modos.
 *
 * GENERALIZADA (chefões progressivos, spec §2.3): o que o chefão faz em cada tempo é um ROTEIRO em dados (`roteiros-de-entrada.ts`: batidas de pose, zoom, efeito de cena, som). As constantes
 * e a linha do tempo são as mesmas para o ZENON e os 5 guardiões; `QuadroDaEntrada.pose` é o ÍNDICE da batida em vigor (as batidas do ZENON em 0/96/144 dão o 0/1/2 de sempre).
 */

export type ModoEntrada = 'completa' | 'curta';

export const DURACAO_ENTRADA_COMPLETA = 270;
export const DURACAO_ENTRADA_CURTA = 60;
/** O pulo só vale a partir deste tick. */
export const PULO_VALE_A_PARTIR_DE = 10;
/** Ao pular, a saída leva no máximo isto (o mesmo da cinemática do especial). */
export const SAIDA_AO_PULAR = 6;
/** Altura das faixas de cinema (px lógicos) e quanto elas levam para entrar e sair (CURTA / COMPLETA). */
export const ALTURA_DA_FAIXA = 56;
export const TICKS_DA_FAIXA = 12;
export const TICKS_DA_FAIXA_COMPLETA = 20;
/** Os braseiros da arena `gr`: quantos acendem na sequência, em que tick começa e quantos ticks cada um leva. */
export const BRASEIROS = 6;
export const BRASEIROS_COMECAM_EM = 30;
export const TICKS_POR_BRASEIRO = 10;
/** O cartão do nome aparece neste tick (COMPLETA) e neste (CURTA), e leva tantos ticks para chegar inteiro. */
export const CARTAO_COMPLETA_EM = 144;
export const CARTAO_CURTA_EM = 8;
export const TICKS_DO_CARTAO_COMPLETA = 16;
export const TICKS_DO_CARTAO_CURTA = 10;
/** A fala começa neste tick (COMPLETA; a CURTA começa 6 ticks depois do cartão) e revela este tanto de letras por tick. */
export const FALA_COMECA_EM = 150;
export const LETRAS_POR_TICK = 1.2;
export const LETRAS_POR_TICK_CURTA = 1.9;

/** Quanto dura a entrada neste modo. */
export const duracaoDaEntrada = (modo: ModoEntrada): number => (modo === 'completa' ? DURACAO_ENTRADA_COMPLETA : DURACAO_ENTRADA_CURTA);

/** Em que tick da COMPLETA o efeito de cena termina de "acender" (0 a 1), e quando o som da assinatura do roteiro toca (COMPLETA / CURTA). */
export const EFEITO_ACENDE_ATE = 90;
export const ASSINATURA_EM = 8;
export const ASSINATURA_EM_CURTA = 3;

export type QuadroDaEntrada = {
  /** Altura de cada faixa de cinema (0 a 56). */
  readonly faixa: number;
  /** Braseiros acesos (0 a 6, fracionário: o que está acendendo conta pela fração). Só o roteiro `braseiros-gr` (ZENON) os acende em sequência; nos outros vale sempre 6. */
  readonly acesos: number;
  /** Índice da BATIDA em vigor (ZENON: 0 de costas, 1 vira a cabeça, 2 aperta a tira). */
  readonly pose: number;
  /** Zoom de render da entrada (1 = sem zoom) e deslocamento horizontal visual do chefão (px lógicos, 0 = parado). */
  readonly zoom: number;
  readonly dx: number;
  /** Quanto o efeito de cena já acendeu (0 a 1; a CURTA já nasce em 1). */
  readonly efeito: number;
  /** Progresso do cartão (0 a 1) e a opacidade dele (cai na saída). */
  readonly cartao: number;
  readonly alfa: number;
  /** Letras da fala já reveladas. */
  readonly letras: number;
};

/** O roteiro de antes da generalização: as batidas do ZENON e os braseiros da arena `gr`. É o padrão de `linhaDaEntrada`. */
const ROTEIRO_PADRAO: Pick<RoteiroDeEntrada, 'batidas' | 'efeito'> = { batidas: BATIDAS_DO_ZENON, efeito: 'braseiros-gr' };

const suave = (k: number): number => k * k * (3 - 2 * k);

/**
 * Uma grandeza que anda por QUADROS-CHAVE (zoom, deslocamento): cada batida que traz o valor o atinge no `em` dela, vindo do quadro-chave anterior em passo suave. Sem nenhum, vale
 * `neutro`; antes do 1º, parte do neutro em 0. `tick = Infinity` devolve o valor FINAL (a CURTA e o pulo ficam nele).
 */
export function porQuadrosChave(batidas: readonly BatidaDeEntrada[], chave: 'zoom' | 'dx', neutro: number, tick: number): number {
  const pontos: { em: number; v: number }[] = [];
  for (const b of batidas) {
    const v = b[chave];
    if (v !== undefined) pontos.push({ em: b.em, v });
  }
  if (pontos.length === 0) return neutro;
  if ((pontos[0] as { em: number }).em > 0) pontos.unshift({ em: 0, v: neutro });
  const ultimo = pontos[pontos.length - 1] as { em: number; v: number };
  if (tick >= ultimo.em) return ultimo.v;
  for (let i = 1; i < pontos.length; i++) {
    const a = pontos[i - 1] as { em: number; v: number };
    const b = pontos[i] as { em: number; v: number };
    if (tick < b.em) return a.v + (b.v - a.v) * suave(Math.max(0, (tick - a.em) / Math.max(1, b.em - a.em)));
  }
  return ultimo.v;
}

/** O índice da última batida que já começou em `tick` (a COMPLETA); a CURTA e o pulo ficam na última. */
export function indiceDaBatida(batidas: readonly BatidaDeEntrada[], tick: number): number {
  let k = 0;
  for (let i = 0; i < batidas.length; i++) if ((batidas[i] as BatidaDeEntrada).em <= tick) k = i;
  return k;
}

/**
 * A linha do tempo (pura): o que aparece no tick `tick` de uma entrada `modo`. `pulouEm` = o tick em que o jogador pulou (null = não pulou): dali a
 * saída leva `SAIDA_AO_PULAR` ticks e os braseiros acabam de acender, o chefe fica na ÚLTIMA batida (zoom e deslocamento vão ao valor final na saída).
 */
export function linhaDaEntrada(
  modo: ModoEntrada,
  tick: number,
  pulouEm: number | null = null,
  roteiro: Pick<RoteiroDeEntrada, 'batidas' | 'efeito'> = ROTEIRO_PADRAO,
): QuadroDaEntrada {
  const total = duracaoDaEntrada(modo);
  const fim = pulouEm === null ? total : Math.min(total, pulouEm + SAIDA_AO_PULAR);
  const sequencia = modo === 'completa';
  const ticksDaFaixa = sequencia ? TICKS_DA_FAIXA_COMPLETA : TICKS_DA_FAIXA;
  const saidaIni = pulouEm === null ? total - ticksDaFaixa : pulouEm;
  const saidaDur = Math.max(1, fim - saidaIni);
  const saindo = tick >= saidaIni ? Math.min(1, (tick - saidaIni) / saidaDur) : 0;
  const entrando = Math.min(1, tick / ticksDaFaixa);
  const faixa = ALTURA_DA_FAIXA * easeOut(entrando) * (1 - saindo);

  const sequenciaDeBraseiros = sequencia && roteiro.efeito === 'braseiros-gr';
  const acesosNormal = !sequenciaDeBraseiros ? BRASEIROS : Math.min(BRASEIROS, Math.max(0, (tick - BRASEIROS_COMECAM_EM) / TICKS_POR_BRASEIRO));
  // pulou: os que faltam acendem de uma vez durante a saída
  const acesos = pulouEm === null || !sequenciaDeBraseiros ? acesosNormal : Math.min(BRASEIROS, acesosNormal + (BRASEIROS - acesosNormal) * saindo);
  const ultima = roteiro.batidas.length - 1;
  const pose = !sequencia || pulouEm !== null ? ultima : indiceDaBatida(roteiro.batidas, tick);
  // zoom e deslocamento: a COMPLETA anda pelos quadros-chave; a CURTA fica no valor final; quem pulou vai do valor do instante do pulo ao final durante a saída
  const zFinal = porQuadrosChave(roteiro.batidas, 'zoom', 1, Number.POSITIVE_INFINITY);
  const dFinal = porQuadrosChave(roteiro.batidas, 'dx', 0, Number.POSITIVE_INFINITY);
  const zAgora = sequencia ? porQuadrosChave(roteiro.batidas, 'zoom', 1, pulouEm ?? tick) : zFinal;
  const dAgora = sequencia ? porQuadrosChave(roteiro.batidas, 'dx', 0, pulouEm ?? tick) : dFinal;
  const zoom = pulouEm === null ? zAgora : zAgora + (zFinal - zAgora) * saindo;
  const dx = pulouEm === null ? dAgora : dAgora + (dFinal - dAgora) * saindo;
  const progressoNormal = sequencia ? Math.min(1, tick / EFEITO_ACENDE_ATE) : 1;
  const efeito = pulouEm === null ? progressoNormal : progressoNormal + (1 - progressoNormal) * saindo;

  const cartaoEm = sequencia ? CARTAO_COMPLETA_EM : CARTAO_CURTA_EM;
  const cartao = Math.min(1, Math.max(0, (tick - cartaoEm) / (sequencia ? TICKS_DO_CARTAO_COMPLETA : TICKS_DO_CARTAO_CURTA)));
  const falaEm = sequencia ? FALA_COMECA_EM : CARTAO_CURTA_EM + 6;
  const letras = Math.max(0, (tick - falaEm) * (sequencia ? LETRAS_POR_TICK : LETRAS_POR_TICK_CURTA));
  return { faixa, acesos, pose, zoom, dx, efeito, cartao, alfa: 1 - saindo, letras };
}

/** As cores do cartão: as do Arconte (ouro e rosa-ônix) ou, com a cor (`accent`) de um guardião, as dele (o 2º tom do nome, o contorno, o título, o fio e o rodapé). */
export type PaletaDoCartao = {
  readonly nome: readonly [string, string];
  readonly contornoDoNome: string;
  readonly titulo: readonly [string, string];
  readonly contornoDoTitulo: string;
  readonly fio: string;
  readonly rodape: string;
};

export const PALETA_DO_ARCONTE: PaletaDoCartao = {
  nome: ['#ffffff', '#f0c8e6'],
  contornoDoNome: '#2a0418',
  titulo: ['#fff0b0', '#d9b25a'],
  contornoDoTitulo: '#1a0612',
  fio: '#d9b25a',
  rodape: '#d9b25a',
};

/** A paleta do cartão de quem tem a cor `accent` (#rrggbb); sem cor (ZENON) ou com cor inválida, a do Arconte. */
export function paletaDoCartao(accent?: string): PaletaDoCartao {
  if (!accent || !/^#[0-9a-fA-F]{6}$/.test(accent)) return PALETA_DO_ARCONTE;
  const claro = mistura(accent, '#ffffff', 0.5);
  return {
    nome: ['#ffffff', claro],
    contornoDoNome: mistura(accent, '#000000', 0.88),
    titulo: ['#ffffff', mistura(accent, '#ffffff', 0.35)],
    contornoDoTitulo: mistura(accent, '#000000', 0.92),
    fio: mistura(accent, '#ffffff', 0.25),
    rodape: mistura(accent, '#ffffff', 0.75),
  };
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

export type SomDaEntrada = 'faixas' | 'cartao' | 'assinatura' | { readonly braseiro: number };

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
  /**
   * SOBREPOSTA a uma luta em curso (o trailer, R-15): o cartão é compacto e mora na faixa preta de cima (y 0-69, a do letterbox), para não cobrir cabeça nenhuma, e some junto com
   * as faixas. A cena que a liga o faz DEPOIS de `iniciar` (que a desliga); `zerar` também.
   */
  sobreposta = false;
  private cartao: CartaoDeEntrada | null = null;
  private fala = '';
  private acesosSoados = 0;
  private somDoCartao = false;
  private somDaAssinatura = false;
  private roteiro: Pick<RoteiroDeEntrada, 'batidas' | 'efeito' | 'som'> = ROTEIRO_PADRAO;
  private paleta: PaletaDoCartao = PALETA_DO_ARCONTE;
  private cor = '#d6339a';

  constructor(private readonly op: OpcoesEntrada = {}) {}

  /**
   * Começa a entrada. `cartao` e `fala` vêm de `APRESENTACAO`; `roteiro` (batidas, efeito, som) também: sem ele vale o do ZENON (braseiros da `gr`). `cor` = o `accent` do
   * guardião, que tinge o cartão e o efeito (sem cor, o cartão é o do Arconte).
   */
  iniciar(modo: ModoEntrada, cartao: CartaoDeEntrada, fala = '', roteiro?: Pick<RoteiroDeEntrada, 'batidas' | 'efeito' | 'som'>, cor?: string): void {
    this.ativa = true;
    this.sobreposta = false;
    this.modo = modo;
    this.tick = 0;
    this.pulouEm = null;
    this.cartao = cartao;
    this.fala = falaDaEntrada(modo, fala);
    this.acesosSoados = 0;
    this.somDoCartao = false;
    this.somDaAssinatura = false;
    this.roteiro = roteiro ?? ROTEIRO_PADRAO;
    this.paleta = paletaDoCartao(cor);
    this.cor = cor ?? '#d6339a';
    this.op.aoSom?.('faixas');
  }

  /** As batidas da entrada em vigor (a cena escolhe a pose do chefão pelo índice de `quadro().pose`). */
  get batidas(): readonly BatidaDeEntrada[] {
    return this.roteiro.batidas;
  }

  /** A assinatura sonora do roteiro em vigor (vazia para o ZENON). */
  get assinatura(): NonNullable<RoteiroDeEntrada['som']> {
    return this.roteiro.som ?? [];
  }

  /** Para tudo (a luta foi reiniciada ou a cena saiu). */
  zerar(): void {
    this.ativa = false;
    this.sobreposta = false;
    this.tick = 0;
    this.pulouEm = null;
    this.cartao = null;
  }

  /** O quadro de agora. */
  quadro(): QuadroDaEntrada {
    return linhaDaEntrada(this.modo, this.tick, this.pulouEm, this.roteiro);
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
    if (this.roteiro.efeito === 'braseiros-gr') {
      while (this.modo === 'completa' && this.pulouEm === null && this.acesosSoados < Math.min(BRASEIROS, Math.floor(q.acesos))) this.op.aoSom?.({ braseiro: this.acesosSoados++ });
    }
    // a assinatura sonora do guardião (rufo, buzina, vento...) toca uma vez, logo depois das faixas
    if (!this.somDaAssinatura && this.roteiro.som && this.tick >= (this.modo === 'completa' ? ASSINATURA_EM : ASSINATURA_EM_CURTA)) {
      this.somDaAssinatura = true;
      this.op.aoSom?.('assinatura');
    }
    if (!this.somDoCartao && q.cartao > 0) {
      this.somDoCartao = true;
      this.op.aoSom?.('cartao');
    }
    if (this.tick >= this.fim()) this.ativa = false;
  }

  /**
   * Desenha o efeito de cena, as faixas, o cartão e a fala por cima do mundo (que a cena desenhou sem HUD). `alvo` = onde o chefão está NA TELA (x e chão), para os efeitos que o
   * seguem (holofotes, luar); sem ele, o padrão.
   */
  desenhar(ctx: Ctx, alvo?: { readonly x: number; readonly chao: number }): void {
    if (!this.ativa) return;
    const q = this.quadro();
    // o efeito de cena (nada para os braseiros da `gr`, que moram na arena): entra com as faixas e sai com elas
    desenharEfeitoDeEntrada(ctx, {
      efeito: this.roteiro.efeito,
      progresso: q.efeito,
      tick: this.tick,
      alfa: q.alfa * Math.min(1, q.faixa / ALTURA_DA_FAIXA),
      cor: this.cor,
      alvo: alvo ?? { x: 710, chao: 470 },
    });
    ctx.save();
    // faixas de cinema
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LARGURA, q.faixa);
    ctx.fillRect(0, ALTURA - q.faixa, LARGURA, q.faixa);
    const c = this.cartao;
    if (c && q.cartao > 0 && this.sobreposta) {
      // compacto, dentro da faixa preta de cima: nome, título e rodapé empilhados em 69 px; sai com as faixas (`q.alfa`)
      const k = easeOut(q.cartao) * q.alfa;
      const pal = this.paleta;
      textoArcade(ctx, c.nome, LARGURA / 2, 22, 30, pal.nome, pal.contornoDoNome, 'center', 1, k);
      textoArcade(ctx, c.titulo, LARGURA / 2, 46, 17, pal.titulo, pal.contornoDoTitulo, 'center', 1, k);
      texto(ctx, c.rodape.split('').join(' '), LARGURA / 2, 62, 10, pal.rodape, 'center', { alpha: k });
    } else if (c && q.cartao > 0) {
      const k = easeOut(q.cartao);
      const x = LARGURA / 2 - (1 - k) * 70;
      ctx.globalAlpha = q.alfa;
      // fio de ouro sob o título
      const pal = this.paleta;
      if (pal !== PALETA_DO_ARCONTE) {
        // guardião: um véu escuro e macio (elipse com miolo cheio) atrás do cartão: os cenários de dia (o cais, o sol de Kano) deixavam o rodapé claro sobre o céu claro
        ctx.save();
        ctx.translate(LARGURA / 2, 142);
        ctx.scale(1, 0.3);
        const v = ctx.createRadialGradient(0, 0, 0, 0, 0, 330);
        v.addColorStop(0, `rgba(0,0,0,${(0.72 * k).toFixed(3)})`);
        v.addColorStop(0.62, `rgba(0,0,0,${(0.66 * k).toFixed(3)})`);
        v.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = v;
        ctx.beginPath();
        ctx.arc(0, 0, 330, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      ctx.fillStyle = pal.fio;
      ctx.fillRect(LARGURA / 2 - 150 * k, 168, 300 * k, 2);
      textoArcade(ctx, c.nome, x, 100, 56, pal.nome, pal.contornoDoNome, 'center', zoomIn(q.cartao * 14), k);
      textoArcade(ctx, c.titulo, x, 142, 30, pal.titulo, pal.contornoDoTitulo, 'center', 1, k);
      texto(ctx, c.rodape.split('').join(' '), x, 184, 13, pal.rodape, 'center', { alpha: k });
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
