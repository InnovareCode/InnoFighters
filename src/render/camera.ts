import { GROUND } from '../core/constantes';
import type { Rng } from '../core/rng';
import type { Ctx } from './tela';

/** Câmera da luta: centro horizontal e zoom (a luta calcula; aqui só se aplica). */
export interface Camera {
  x: number;
  z: number;
}

/**
 * Aplica zoom em torno de (cam.x, chão) e o tremor de tela ao contexto. Chamar dentro de
 * ctx.save()/restore(). `tremor` é a amplitude em px lógicos; passe 0 se a opção de tremor
 * estiver desligada (o protótipo testava SETTINGS.shake no desenho). O sorteio dos
 * deslocamentos vem de um Rng só dos efeitos, para não mexer na sequência da lógica.
 */
export function aplicarCamera(ctx: Ctx, cam: Camera, tremor: number, rng: Rng): void {
  ctx.translate(cam.x, GROUND);
  ctx.scale(cam.z, cam.z);
  ctx.translate(-cam.x, -GROUND);
  if (tremor > 0) {
    const dx = rng.entre(-tremor, tremor);
    const dy = rng.entre(-tremor, tremor);
    ctx.translate(dx, dy);
  }
}
