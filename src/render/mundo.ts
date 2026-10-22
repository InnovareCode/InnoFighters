import type { Elenco } from '../assets/elenco';
import { GROUND } from '../core/constantes';
import type { LeituraLuta } from '../core/contratos';
import type { Rng } from '../core/rng';
import { aplicarCamera } from './camera';
import { rampaDaFase2, chefeDaLeitura } from './aura-chefe';
import { SOBREPOSICOES_DE_CENARIO, desenharCenarioLuta, desenharVinheta } from './cenario';
import { desenharPetalas, desenharProjetil, projetilParaVisual, type CampoDePetalas, type Efeitos } from './efeitos';
import { desenharHUD, desenharOverlay, type OpcoesHud } from './hud';
import { comPose, leituraApresentada } from './apresentacao-lutadores';
import { chDaFicha, desenharLutador } from './lutador';
import { desenharVeuDeFase2 } from './veu-de-fase2';
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
  /** Pose a desenhar no lugar da do motor, por índice de lutador (a entrada dramática do chefão). Vence a pose de apresentação. */
  readonly poses?: Partial<Record<0 | 1, string>>;
  /** Braseiros acesos da arena (0 a 6) durante a entrada dramática; ausente = todos acesos e sem véu. */
  readonly acesos?: number;
  /** Desenhar o texto de fase (ROUND N, FIGHT!, K.O., X VENCE!) por cima do HUD (padrão: sim). A provocação o esconde sem esconder o HUD. */
  readonly overlay?: boolean;
  /** Deslocamento horizontal VISUAL (px lógicos) por lutador: a andada da provocação. O motor não vê; a sombra e a aura vão junto. Ausente = 0. */
  readonly deslocamento?: Partial<Record<0 | 1, number>>;
  /**
   * Zoom de apresentação (push-in da vitória): `fator` em torno do ponto (`x` da TELA, chão). Fica por fora da câmera da luta (que não muda) e por baixo do HUD.
   * Ancorado no chão e com fator >= 1, nenhuma borda do cenário aparece. Ausente (ou fator 1) = o desenho de hoje.
   */
  readonly zoom?: { readonly fator: number; readonly x: number };
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
  const zoom = opcoes.zoom;
  if (zoom && zoom.fator !== 1) {
    ctx.translate(zoom.x, GROUND);
    ctx.scale(zoom.fator, zoom.fator);
    ctx.translate(-zoom.x, -GROUND);
  }
  aplicarCamera(ctx, luta.cam, opcoes.tremor === false ? 0 : luta.shake, rngVisual);
  desenharCenarioLuta(ctx, rec.cenarios.get(luta.stage) ?? rec.cenarioPadrao, luta.cam.x);
  // fase 2 do chefão: a rampa vem do ESTADO (barras < barrasMax), não de um evento; só o chefe tem aura e só a arena registrada muda
  const chefe = chefeDaLeitura(luta);
  const rampa = chefe ? rampaDaFase2(luta, chefe, rec.elenco[chefe.id]?.ch) : 0;
  const sobreposicao = SOBREPOSICOES_DE_CENARIO[luta.stage];
  if (sobreposicao) sobreposicao(ctx, { rampa, t: luta.tick, camX: luta.cam.x, ...(opcoes.acesos === undefined ? {} : { acesos: opcoes.acesos }) });
  // a arena de um GUARDIÃO (sem sobreposição própria, como a `gr` do ZENON) escurece e ganha o tom do guardião na fase 2 (véu procedural, spec §1.7)
  else if (chefe && rampa > 0) desenharVeuDeFase2(ctx, rampa, rec.elenco[chefe.id]?.ch.accent ?? '#888888');

  const [a, b] = luta.fighters;
  // quem está atacando fica por cima (desenhado por último)
  const ordem = a.state === 'move' && b.state !== 'move' ? [b, a] : [a, b];
  for (const f of ordem) {
    const r = rec.elenco[f.id];
    // pose de entrada/vitória (apresentação) ou a imposta pela entrada dramática; o motor e a leitura não mudam
    const imposta = opcoes.poses?.[f.indice];
    const vista = imposta ? comPose(f, imposta) : leituraApresentada(luta, f);
    const dx = opcoes.deslocamento?.[f.indice] ?? 0;
    if (dx !== 0) {
      ctx.save();
      ctx.translate(dx, 0);
    }
    desenharLutador(ctx, vista, r.ch, r.arte, f === chefe ? rampa : 0);
    if (dx !== 0) ctx.restore();
  }
  for (const p of luta.projectiles) {
    const dono = luta.fighters[p.dono];
    desenharProjetil(ctx, projetilParaVisual(p, chDaFicha(rec.elenco[dono.id].ch, dono.ficha).fire));
  }
  efeitos.desenharParticulas(ctx);
  efeitos.desenharImpactos(ctx);
  desenharPetalas(ctx, petalas.lista);
  efeitos.desenharTextos(ctx);
  ctx.restore();

  desenharVinheta(ctx, rec.vinheta);
  if (opcoes.hud !== false) {
    desenharHUD(ctx, luta, rec.elenco, opcoes);
    if (opcoes.overlay !== false) desenharOverlay(ctx, luta, rec.elenco);
  }
}
