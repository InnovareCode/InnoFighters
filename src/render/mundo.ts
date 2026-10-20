import type { Elenco } from '../assets/elenco';
import type { LeituraLuta } from '../core/contratos';
import type { Rng } from '../core/rng';
import { aplicarCamera } from './camera';
import { desenharCenarioLuta, desenharVinheta } from './cenario';
import { desenharPetalas, desenharProjetil, projetilParaVisual, type CampoDePetalas, type Efeitos } from './efeitos';
import { desenharHUD, desenharOverlay, type OpcoesHud } from './hud';
import { desenharLutador } from './lutador';
import { limparQuadro, type Ctx } from './tela';

/** Imagens e dados montados de que a cena de luta precisa para desenhar. */
export interface RecursosDeDesenho {
  readonly elenco: Elenco;
  /** Cenários por id (`LeituraLuta.stage`). */
  readonly cenarios: ReadonlyMap<string, CanvasImageSource>;
  /** Usado quando o id do cenário não existe (o protótipo caía em IMG.bg). */
  readonly cenarioPadrao: CanvasImageSource;
  readonly vinheta: CanvasImageSource;
}

export interface OpcoesMundo extends OpcoesHud {
  /** Opção "tremor de tela" ligada? (SETTINGS.shake). Padrão: sim. */
  readonly tremor?: boolean;
  /** Desenhar HUD e faixas por cima (padrão: sim). */
  readonly hud?: boolean;
}

/**
 * Um quadro da luta (porte de renderWorld): cenário -> lutadores -> projéteis -> partículas ->
 * impactos -> pétalas -> textos, tudo sob a câmera e o tremor; depois vinheta, HUD e faixas.
 * Só lê a `LeituraLuta`; o estado visual (partículas, pétalas) vem de quem chama.
 * `rngVisual` sorteia o tremor e deve ser o mesmo Rng dos efeitos (nunca o da lógica).
 */
export function desenharMundo(
  ctx: Ctx,
  luta: LeituraLuta,
  rec: RecursosDeDesenho,
  efeitos: Efeitos,
  petalas: CampoDePetalas,
  rngVisual: Rng,
  opcoes: OpcoesMundo = {},
): void {
  limparQuadro(ctx);
  ctx.save();
  aplicarCamera(ctx, luta.cam, opcoes.tremor === false ? 0 : luta.shake, rngVisual);
  desenharCenarioLuta(ctx, rec.cenarios.get(luta.stage) ?? rec.cenarioPadrao, luta.cam.x);

  const [a, b] = luta.fighters;
  // quem está atacando fica por cima (desenhado por último)
  const ordem = a.state === 'move' && b.state !== 'move' ? [b, a] : [a, b];
  for (const f of ordem) {
    const r = rec.elenco[f.id];
    desenharLutador(ctx, f, r.ch, r.arte);
  }
  for (const p of luta.projectiles) {
    const dono = luta.fighters[p.dono];
    desenharProjetil(ctx, projetilParaVisual(p, rec.elenco[dono.id].ch.fire));
  }
  efeitos.desenharParticulas(ctx);
  efeitos.desenharImpactos(ctx);
  desenharPetalas(ctx, petalas.lista);
  efeitos.desenharTextos(ctx);
  ctx.restore();

  desenharVinheta(ctx, rec.vinheta);
  if (opcoes.hud !== false) {
    desenharHUD(ctx, luta, rec.elenco, opcoes);
    desenharOverlay(ctx, luta, rec.elenco);
  }
}
