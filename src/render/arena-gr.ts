import { ALTURA, LARGURA } from '../core/constantes';
import { az, mistura } from './estilos-especiais';
import type { Ctx } from './tela';

/*
 * Sobreposição procedural da arena `gr` ("Anfiteatro do Arconte", docs/spec-chefao-zenon.md §4.3 e §6): NÃO há segunda imagem para a fase 2. A arte
 * traz 6 braseiros e uma tempestade púrpura ao fundo; aqui desenhamos por cima o brilho dos braseiros (laranja na fase 1, púrpura na fase 2),
 * o escurecimento do céu e raios mais próximos. `rampa` (0 a 1) vem do estado da luta (`rampaDaFase2`, render/aura-chefe.ts), não de um evento
 * isolado: pausa, cinemática ou um evento perdido não deixam a arena presa nem apagada.
 *
 * Orçamento: 14 primitivas por quadro (1 véu, 6 brilhos, 3 camadas de chama, 4 do raio), sem shadowBlur, sem filter, sem getImageData. Pura do tick:
 * o sorteio dos raios é um hash do índice (não consome o `rngVisual`, então a sequência dos efeitos é a mesma com ou sem a arena).
 */

/** Onde a arte `cenario-gr.webp` guarda os braseiros: centro da chama em fração da imagem 1920x1080 (MEDIDO no arquivo, não estimado) e o tamanho da chama em px lógicos. */
export const BRASEIROS_GR: readonly { readonly fx: number; readonly fy: number; readonly hw: number; readonly h: number; readonly brilho: number }[] = [
  { fx: 0.178, fy: 0.313, hw: 10, h: 22, brilho: 34 },
  { fx: 0.379, fy: 0.345, hw: 10, h: 22, brilho: 34 },
  { fx: 0.62, fy: 0.344, hw: 10, h: 22, brilho: 34 },
  { fx: 0.819, fy: 0.313, hw: 10, h: 22, brilho: 34 },
  { fx: 0.125, fy: 0.523, hw: 19, h: 44, brilho: 62 },
  { fx: 0.875, fy: 0.527, hw: 19, h: 44, brilho: 62 },
];

export const LARANJA_DO_BRASEIRO = '#ff8a2a';
export const PURPURA_DO_BRASEIRO = '#b02a7e';
/** Intervalo entre raios (ticks): de 90 a 150. */
export const RAIO_MIN = 90;
/** Escurecimento máximo da arena na entrada dramática (antes do primeiro braseiro; igual a `VEU_DA_ARENA` de entrada-chefe.ts). */
export const VEU_DA_ARENA = 0.55;
export const RAIO_VARIA = 61;
/** Duração visível de um raio (ticks). */
export const VIDA_DO_RAIO = 7;

export type EstadoDaArena = {
  /** 0 = fase 1; 1 = fase 2 plena (sobe durante a cena do chefe). */
  readonly rampa: number;
  /** Tick da luta (anima a chama e sorteia os raios). */
  readonly t: number;
  /** x da câmera (a arte anda com paralaxe leve em relação a ela: ver `desenharCenarioLuta`). */
  readonly camX: number;
  /** Entrada dramática do chefão: braseiros acesos (0 a 6, fracionário, da esquerda para a direita). Ausente = todos acesos e nenhum véu. */
  readonly acesos?: number;
};

/** A ordem em que os braseiros acendem (da esquerda para a direita pela posição na arte): índices de `BRASEIROS_GR`. */
export const ORDEM_DE_ACENDER: readonly number[] = BRASEIROS_GR.map((b, i) => [b.fx, i] as const).sort((p, q) => p[0] - q[0]).map(([, i]) => i);

/** Onde (em px lógicos) a arte está desenhada: o mesmo retângulo de `desenharCenarioLuta`. */
export function retanguloDaArte(camX: number): { x: number; y: number; w: number; h: number } {
  return { x: -30 - (camX - LARGURA / 2) * 0.05, y: -20, w: LARGURA + 60, h: ALTURA + 40 };
}

/** Os tempos (ticks) em que um evento de raio começa: o k-ésimo vem do anterior + 90 a 150, tudo por hash do índice. */
const inicios: number[] = [];
function inicioDoRaio(k: number): number {
  while (inicios.length <= k) {
    const i = inicios.length;
    inicios.push(i === 0 ? 30 + Math.floor(az(0x2e90, 0) * 60) : (inicios[i - 1] as number) + RAIO_MIN + Math.floor(az(0x2e90, i) * RAIO_VARIA));
  }
  return inicios[k] as number;
}

/** Os raios vivos no tick `t`: `{ x0 em fração da arte, idade, semente }`. Um evento tem 1 raio, ou 2 (o segundo 5 ticks depois, em outro x). */
export function raiosVivos(t: number): { fx: number; idade: number; sem: number }[] {
  const vivos: { fx: number; idade: number; sem: number }[] = [];
  // o evento k acontece em inicioDoRaio(k); como os eventos distam >= 90 ticks, só os 2 últimos podem estar vivos
  let k = 0;
  while (inicioDoRaio(k + 1) <= t) k++;
  for (const kk of [k]) {
    const ini = inicioDoRaio(kk);
    const duplo = az(0x2e91, kk) > 0.5;
    for (let j = 0; j < (duplo ? 2 : 1); j++) {
      const idade = t - ini - j * 5;
      if (idade >= 0 && idade < VIDA_DO_RAIO) vivos.push({ fx: 0.12 + az(0x2e92, kk * 2 + j) * 0.76, idade, sem: kk * 2 + j });
    }
  }
  return vivos;
}

/** A sobreposição da arena `gr`: véu do céu, brilho dos 6 braseiros (laranja -> púrpura), chamas púrpura e raios na fase 2. */
export function sobreposicaoDaArenaGr(ctx: Ctx, e: EstadoDaArena): void {
  const r = Math.min(1, Math.max(0, e.rampa));
  const a = retanguloDaArte(e.camX);
  ctx.save();
  // escurecimento do céu: do topo até a linha da arquibancada, sem tocar o piso
  if (r > 0) {
    const g = ctx.createLinearGradient(0, a.y, 0, a.y + a.h * 0.42);
    g.addColorStop(0, `rgba(10,4,22,${(0.5 * r).toFixed(3)})`);
    g.addColorStop(1, 'rgba(10,4,22,0)');
    ctx.fillStyle = g;
    ctx.fillRect(a.x, a.y, a.w, a.h * 0.42);
  }
  // entrada dramática: a arena começa escura e clareia a cada braseiro que acende (o véu some quando o último acende)
  const acesos = e.acesos ?? BRASEIROS_GR.length;
  if (acesos < BRASEIROS_GR.length) {
    ctx.fillStyle = `rgba(4,2,12,${(VEU_DA_ARENA * (1 - acesos / BRASEIROS_GR.length)).toFixed(3)})`;
    ctx.fillRect(a.x, a.y, a.w, a.h);
  }
  // brilho dos braseiros em `lighter`; a cor sobe de laranja para púrpura com a rampa
  const cor = mistura(LARANJA_DO_BRASEIRO, PURPURA_DO_BRASEIRO, r);
  ctx.globalCompositeOperation = 'lighter';
  BRASEIROS_GR.forEach((b, i) => {
    const k = Math.min(1, Math.max(0, acesos - ORDEM_DE_ACENDER.indexOf(i)));
    if (k <= 0) return;
    const x = a.x + b.fx * a.w;
    const y = a.y + b.fy * a.h;
    // k < 1: o braseiro está acendendo (o brilho cresce e passa de 1 por um instante: o clarão da ignição)
    const R = b.brilho * k * (1 + (k < 1 ? 0.6 * Math.sin(k * Math.PI) : 0)) * (1 + 0.09 * Math.sin(e.t * 0.31 + i * 1.7) + 0.05 * Math.sin(e.t * 0.77 + i * 3.1));
    const g = ctx.createRadialGradient(x, y, 1, x, y, R);
    g.addColorStop(0, `${cor}cc`);
    g.addColorStop(1, `${cor}00`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.globalCompositeOperation = 'source-over';
  if (r > 0.02) {
    // chamas púrpura por cima das laranja da arte (duas camadas: a de fora e o miolo claro), alfa pela rampa
    for (const [esc, col, alfa] of [[1, PURPURA_DO_BRASEIRO, 0.92], [0.72, '#ff5fb8', 0.92], [0.4, '#ffe6f6', 0.95]] as const) {
      ctx.fillStyle = col;
      ctx.globalAlpha = alfa * r;
      ctx.beginPath();
      BRASEIROS_GR.forEach((b, i) => {
        const x = a.x + b.fx * a.w;
        const base = a.y + b.fy * a.h + b.h * 0.42;
        const hw = b.hw * esc;
        const h = b.h * esc * (1 + 0.08 * Math.sin(e.t * 0.4 + i * 2.3));
        const sway = Math.sin(e.t * 0.23 + i * 1.3) * hw * 0.35;
        ctx.moveTo(x - hw, base);
        ctx.quadraticCurveTo(x - hw * 1.05, base - h * 0.5, x + sway, base - h);
        ctx.quadraticCurveTo(x + hw * 1.05, base - h * 0.5, x + hw, base);
        ctx.closePath();
      });
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    // raios mais próximos: só na fase 2 (a arte já tem a tempestade ao longe)
    const vivos = raiosVivos(e.t);
    if (vivos.length > 0) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.beginPath();
      for (const v of vivos) {
        const x0 = a.x + v.fx * a.w;
        let x = x0;
        ctx.moveTo(x, a.y);
        for (let s = 1; s <= 5; s++) {
          x = x0 + (az(0x2e93 + v.sem, s + Math.floor(v.idade / 2) * 7) - 0.5) * 46;
          ctx.lineTo(x, a.y + (a.h * 0.36 * s) / 5);
        }
      }
      ctx.lineJoin = 'round';
      ctx.lineWidth = 7;
      ctx.strokeStyle = PURPURA_DO_BRASEIRO;
      ctx.globalAlpha = 0.55 * r;
      ctx.stroke();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#ffe6ff';
      ctx.globalAlpha = 0.95 * r;
      ctx.stroke();
      // clarão curto no céu nos primeiros ticks do raio (degradê: sem borda dura embaixo)
      const novo = Math.min(...vivos.map((v) => v.idade));
      const cl = ctx.createLinearGradient(0, a.y, 0, a.y + a.h * 0.42);
      cl.addColorStop(0, `${PURPURA_DO_BRASEIRO}ff`);
      cl.addColorStop(1, `${PURPURA_DO_BRASEIRO}00`);
      ctx.globalAlpha = 0.3 * r * Math.max(0, 1 - novo / 4);
      ctx.fillStyle = cl;
      ctx.fillRect(a.x, a.y, a.w, a.h * 0.42);
    }
  }
  ctx.restore();
}
