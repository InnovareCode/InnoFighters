import type { Elenco } from '../assets/elenco';
import { GROUND } from '../core/constantes';
import type { LeituraLuta } from '../core/contratos';
import type { GolpeMontado } from '../data/tipos';
import { attackBox, hurtbox } from '../fight/colisao';
import { chDaFicha } from './lutador';
import type { Ctx } from './tela';

/*
 * Conferência a olho (V2-2, spec-revisao-motor-luta-v2 §7.4): a tecla H desenha as caixas de dano (hurtbox, ciano) e de acerto (vermelho cheio na
 * janela ativa; tracejado fraco na preparação e na recuperação), mais a caixa dos projéteis (amarelo). Só LÊ a leitura C3 e usa as funções puras de
 * `fight/colisao` (a mesma geometria do motor, sem copiar constante). Desenhar dentro da câmera, depois dos corpos. Ferramenta de DEV/treino.
 */

const SEM_CAIXA: ReadonlySet<string> = new Set(['fire', 'lag']);

/** Golpe com caixa de acerto? Espelha `Fighter.activeMove`: sem `fire`/`lag`/`throw`/`parry`/`troca`. */
function golpeComCaixa(mv: GolpeMontado | undefined): mv is GolpeMontado {
  if (!mv) return false;
  return !(SEM_CAIXA.has(mv.type ?? '') || SEM_CAIXA.has(mv.kind ?? '') || mv.throw || mv.parry || mv.type === 'troca');
}

function retangulo(ctx: Ctx, r: { x: number; y: number; w: number; h: number }, cor: string, tracejado: boolean): void {
  ctx.setLineDash(tracejado ? [6, 5] : []);
  ctx.strokeStyle = cor;
  ctx.lineWidth = 2;
  ctx.strokeRect(r.x, r.y, r.w, r.h);
}

export function desenharCaixas(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
  ctx.save();
  for (const f of luta.fighters) {
    const ch = chDaFicha(elenco[f.id].ch, f.ficha);
    const mv = f.state === 'move' && f.move !== null ? (ch.moves as Readonly<Record<string, GolpeMontado | undefined>>)[f.move] : undefined;
    // `isLow()` do motor: agachado, golpe agachado, ou apanhando/defendendo agachado (a pose `hitB`/`cblock`)
    const baixo = f.state === 'crouch' || !!mv?.crouch || ((f.state === 'hit' || f.state === 'block') && (f.pose.name === 'hitB' || f.pose.name === 'cblock'));
    const dano = hurtbox({
      x: f.x,
      y: f.y,
      state: f.state,
      baixo,
      noChao: f.y >= GROUND,
      rente: !!mv?.rente,
      ...(ch.alturaEmPe !== undefined ? { escalaEmPe: ch.alturaEmPe } : {}),
    });
    ctx.globalAlpha = 0.95;
    retangulo(ctx, dano, '#33e6ff', false);
    if (golpeComCaixa(mv) && mv.box) {
      const caixa = ch.boxes[mv.box];
      if (caixa) {
        const ativo = f.mt >= mv.S && (mv.air || f.mt < mv.S + mv.A);
        ctx.globalAlpha = ativo ? 0.95 : 0.4;
        retangulo(ctx, attackBox(f, caixa), '#ff3b3b', !ativo);
      }
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(f.x - 2, f.y - 2, 4, 4); // a âncora (pés)
  }
  ctx.globalAlpha = 0.95;
  for (const p of luta.projectiles) retangulo(ctx, { x: p.x - 34 * p.sc, y: p.y - 30 * p.sy, w: 68 * p.sc, h: 60 * p.sy }, '#ffd23b', false);
  ctx.restore();
}
