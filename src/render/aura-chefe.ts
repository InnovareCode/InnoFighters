import { SH } from '../core/constantes';
import type { LeituraLuta, LutadorLeitura } from '../core/contratos';
import type { LutadorMontado } from '../data/montar';
import { ONIX } from './estilos-especiais';
import type { Ctx } from './tela';

/*
 * Fase 2 do chefão, só desenho (docs/spec-chefao-zenon.md §4.3). O "escurecimento do céu" que a E3 prometia NUNCA existiu (a UI só desenhava
 * o "FASE 2!"): a aura sombria do chefe e a mudança da arena são render nova, ligadas ao ESTADO e não a um evento solto.
 *
 * `rampaDaFase2` vale 0 enquanto o chefe tem todas as barras; sobe de 0 a 1 durante a cena (`phase === 'cena-chefe'`, `t / duração`); e segura 1
 * quando a ficha da fase 2 está ativa (depois da retomada, até o fim da luta). Entre a troca de barra e o começo da cena ele ainda está
 * caído/levantando: a aura espera a cena (0). Como só olha a leitura, pausa, cinemática e um evento perdido não a deixam presa nem apagada.
 */

/** Duração da cena quando o def não diz (o ZENON usa 90 ticks). */
export const DURACAO_PADRAO_DA_CENA = 90;

/** O chefe da luta (o lutador com `chefe`), ou null. */
export function chefeDaLeitura(luta: LeituraLuta): LutadorLeitura | null {
  const [a, b] = luta.fighters;
  return a.chefe ? a : b.chefe ? b : null;
}

/** A rampa da fase 2 (0 a 1) para o chefe `f`, cujo lutador montado é `ch` (lê `ch.chefe` para a ficha e a duração da cena). */
export function rampaDaFase2(luta: LeituraLuta, f: LutadorLeitura, ch: LutadorMontado | undefined): number {
  if (!f.chefe || f.barras >= f.barrasMax) return 0;
  const cfg = ch?.chefe;
  if (luta.phase === 'cena-chefe') return Math.min(1, Math.max(0, luta.t / (cfg?.cena.duracao ?? DURACAO_PADRAO_DA_CENA)));
  return cfg && f.ficha === cfg.fichaFase2 ? 1 : 0;
}

const DOIS_PI = Math.PI * 2;

/** Número de fiapos subindo da aura. */
export const FIAPOS_DA_AURA = 8;

/**
 * A aura do chefe na fase 2, desenhada ANTES do sprite: núcleo ônix em `source-over` (alfa <= 0,55; é o que faz o personagem escuro ler contra o
 * mármore), borda em brilho em `lighter` (alfa <= 0,35), uma elipse na base, respiração `sin(idade/18)` e fiapos de 2 px subindo.
 * 4 primitivas: nada com `rampa` 0. Sem shadowBlur, sem filter, sem getImageData.
 */
export function desenharAuraChefe(ctx: Ctx, f: LutadorLeitura, rampa: number, brilho: string, escala: number): void {
  if (rampa <= 0.001) return;
  const resp = 1 + Math.sin(f.age / 18) * 0.05;
  const h = SH * escala * 0.5;
  const cx = f.x;
  const cy = f.y - h * 0.9;
  const rx = 78 * escala * resp;
  const ry = h * 1.02 * resp;
  ctx.save();
  // núcleo ônix
  const g = ctx.createRadialGradient(cx, cy, 8, cx, cy, ry);
  g.addColorStop(0, ONIX);
  g.addColorStop(0.6, ONIX);
  g.addColorStop(1, 'rgba(12,7,16,0)');
  ctx.globalAlpha = 0.55 * rampa;
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, DOIS_PI);
  ctx.fill();
  // borda em brilho
  ctx.globalCompositeOperation = 'lighter';
  const g2 = ctx.createRadialGradient(cx, cy, ry * 0.55, cx, cy, ry);
  g2.addColorStop(0, `${brilho}00`);
  g2.addColorStop(0.75, `${brilho}59`);
  g2.addColorStop(1, `${brilho}00`);
  ctx.globalAlpha = 0.35 * rampa;
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.ellipse(cx, cy, rx * 1.15, ry, 0, 0, DOIS_PI);
  ctx.fill();
  // fiapos subindo (um traçado só): curvas de 2 px que nascem em volta do corpo e sobem ~60 px
  ctx.beginPath();
  for (let i = 0; i < FIAPOS_DA_AURA; i++) {
    const fase = ((f.age * 0.9 + i * 31) % 70) / 70;
    const x0 = cx + Math.sin(i * 2.4) * rx * 0.85;
    const y0 = f.y - 20 - fase * ry * 1.6;
    ctx.moveTo(x0, y0);
    ctx.quadraticCurveTo(x0 + Math.sin(f.age / 9 + i) * 9, y0 - 14, x0 + Math.sin(f.age / 7 + i * 2) * 6, y0 - 28);
  }
  ctx.lineWidth = 2;
  ctx.strokeStyle = brilho;
  ctx.globalAlpha = 0.5 * rampa;
  ctx.stroke();
  // elipse da base, no chão
  ctx.globalCompositeOperation = 'source-over';
  ctx.fillStyle = ONIX;
  ctx.globalAlpha = 0.4 * rampa;
  ctx.beginPath();
  ctx.ellipse(cx, f.y + 4, rx * 1.1, 13, 0, 0, DOIS_PI);
  ctx.fill();
  ctx.restore();
}
