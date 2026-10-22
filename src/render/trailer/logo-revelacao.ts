import { ALTURA, LARGURA } from '../../core/constantes';
import { easeOut, lerp, clamp } from '../../core/math';
import { LAYOUT_DA_MARCA, LOGO_ALTURA } from '../../ui/logo';
import type { Ferramentas } from '../../ui/ferramentas';
import type { Ctx } from '../tela';
import { TICK_DA_LOGO, TICK_DO_PROMPT } from '../../data/trailer/curvas';
import { ruido } from './frio';

/*
 * P10, a revelação da logo (docs/spec-trailer-abertura.md §3.1): no c24.1 a logo OFICIAL bate na tela (escala 3,2 -> 1), com onda de choque, brasas e tremor (a coreografia
 * da `CenaIntro`, t 120 a 170), enquanto o título aparece por trás. O flash branco é o do diretor (o único de tela cheia do trailer). Tudo é FUNÇÃO PURA de `tl` (ticks
 * desde o impacto): nada guarda estado, então o quadro é o mesmo em toda visita e depois de um salto de relógio. O último quadro é o 1º quadro do título
 * (`fromTrailer`: o título nasce em t = 120): por isso o fundo e a chamada são os do próprio `CenaTitle`.
 */

/** O `t` do título atrás da logo: parado em 0 por 72 ticks e depois correndo, de modo que no último tick do trailer (tl 191) vale 119 e o título nasce em 120. */
export const ATRASO_DO_TITULO = 72;
export const tDoTituloNaRevelacao = (tl: number): number => Math.max(0, tl - ATRASO_DO_TITULO);

/** Escala da logo: bate de 1,6x a 1x em 8 ticks (menos que os 3,2x da abertura de hoje: sob o flash, 3,2x é só borrão) e dá um repique de até 4% que acaba no tick 16. */
export function escalaDaBatida(tl: number): number {
  if (tl < 8) return lerp(1.6, 1, easeOut(clamp(tl / 8, 0, 1)));
  return 1 + Math.max(0, 0.04 - (tl - 8) * 0.005);
}

/** Opacidade da logo: acende em ~7 ticks. */
export const alfaDaLogo = (tl: number): number => clamp((tl / 10) * 1.5, 0, 1);

/**
 * Varredura de luz sobre a logo: só a do próprio título (a partir do tick 102). Durante o impacto NÃO há varredura: ela custa uma camada do tamanho da logo por quadro
 * (`source-in` + `lighter`), e sob o flash, a onda de choque e as brasas ninguém a vê. Devolve -1 (sem varredura) antes disso.
 */
export function brilhoDaLogo(tl: number): number {
  if (tl < ATRASO_DO_TITULO) return -1;
  const t = tDoTituloNaRevelacao(tl);
  return ((t % 300) - 30) / 60;
}

/** Amplitude (px) do tremor do impacto: 13 px no tick 0 até 0 no 22. */
export const tremorDoImpacto = (tl: number): number => (tl >= 0 && tl < 22 ? (22 - tl) * 0.6 : 0);

export const FAGULHAS = 70;
const CORES_DAS_FAGULHAS = ['#ffd36b', '#ff9a3d', '#ff6a1a', '#fff1d0'] as const;
export interface Fagulha {
  readonly x: number;
  readonly y: number;
  readonly alfa: number;
  readonly cor: string;
}

/**
 * A fagulha `i` `n` ticks depois do impacto, em forma FECHADA da dinâmica da abertura de hoje (x += vx; vx *= .95; vy = vy*.95 + .08), com ângulo e velocidade determinísticos
 * (ângulo áureo e passo 37: a abertura sorteava de `rngVisual`). Null depois de 60 ticks.
 */
export function fagulha(i: number, n: number): Fagulha | null {
  if (n < 0 || n > 60) return null;
  const ang = (i * 2.399) % 6.283;
  const vel = 3 + ((i * 37) % 10);
  const d = (vel * (1 - 0.95 ** n)) / 0.05;
  return {
    x: LARGURA / 2 + Math.cos(ang) * d,
    y: LAYOUT_DA_MARCA.y + Math.sin(ang) * d + 0.04 * n * n,
    alfa: clamp((45 - n) / 30, 0, 1),
    cor: CORES_DAS_FAGULHAS[i % 4] as string,
  };
}

export interface EntradaDaRevelacao {
  readonly ctx: Ctx;
  readonly f: Ferramentas;
  /** Ticks desde o impacto (0 = c24.1). */
  readonly tl: number;
  /** A partir do c25.1: "PRESSIONE ENTER" / "TOQUE PARA JOGAR". */
  readonly prompt: boolean;
  /** Desenha a logo oficial; false se a imagem ainda não chegou (cai no texto). */
  readonly logo: (ctx: Ctx, x: number, y: number, altura: number, shine: number, alpha: number) => boolean;
  /** O fundo do título (sem texto) em `t`. */
  readonly fundo: (t: number) => void;
  /** A chamada do título (CTA, recorde, rodapé) em `t`, com fade-in `aparece`. */
  readonly chamada: (t: number, aparece: number) => void;
  /** Camadas que entram ENTRE o fundo e a logo (§7: fundo, letterbox, flash e só então a logo, que bate nítida e rompe o quadro de cinema). */
  readonly entreFundoELogo: () => void;
}

export function desenharRevelacao(e: EntradaDaRevelacao): void {
  const { ctx, f, tl } = e;
  ctx.fillStyle = '#04020a';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  // 1) o título aparece por trás
  const a = clamp((tl - 6) / 50, 0, 1);
  if (a > 0) {
    ctx.save();
    ctx.globalAlpha = a;
    e.fundo(tDoTituloNaRevelacao(tl));
    ctx.restore();
  }
  e.entreFundoELogo();
  // 2) a logo bate com tremor
  const tr = tremorDoImpacto(tl);
  const dx = tr > 0 ? (ruido(tl, 1) - 0.5) * 2 * tr : 0;
  const dy = tr > 0 ? (ruido(tl, 2) - 0.5) * 2 * tr : 0;
  const t = tDoTituloNaRevelacao(tl);
  const flutua = tl >= ATRASO_DO_TITULO ? Math.sin(t / 45) * 3 : 0;
  ctx.save();
  ctx.translate(dx, dy);
  const sc = escalaDaBatida(tl);
  const alfa = alfaDaLogo(tl);
  if (!e.logo(ctx, LARGURA / 2, LAYOUT_DA_MARCA.y + flutua, LOGO_ALTURA * sc, brilhoDaLogo(tl), alfa)) {
    f.A('INNO FIGHTERS', LARGURA / 2, LAYOUT_DA_MARCA.y + flutua, 96, ['#ffffff', '#ffd27a'], '#1a0a00', 'center', sc, alfa);
  }
  ctx.restore();
  // 3) onda de choque
  if (tl >= 0 && tl < 42) {
    const r = tl * 22;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(255,230,180,${(1 - tl / 42).toFixed(3)})`;
    ctx.lineWidth = 10 * (1 - tl / 42) + 1;
    ctx.beginPath();
    ctx.arc(LARGURA / 2, LAYOUT_DA_MARCA.y, r, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  // 4) brasas: uma passada por cor (4 caminhos, não 70 preenchimentos)
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let c = 0; c < CORES_DAS_FAGULHAS.length; c++) {
    ctx.fillStyle = CORES_DAS_FAGULHAS[c] as string;
    ctx.globalAlpha = clamp((45 - tl) / 30, 0, 1);
    ctx.beginPath();
    for (let i = c; i < FAGULHAS; i += CORES_DAS_FAGULHAS.length) {
      const p = fagulha(i, tl);
      if (!p) continue;
      ctx.moveTo(p.x + 3, p.y);
      ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    }
    ctx.fill();
  }
  ctx.restore();
  // 5) a chamada, a partir do c25.1
  if (e.prompt) e.chamada(t, clamp((tl - (TICK_DO_PROMPT - TICK_DA_LOGO)) / 12, 0, 1));
}
