import type { Elenco } from '../../assets/elenco';
import { ALTURA, GROUND, LARGURA } from '../../core/constantes';
import type { IdLutador } from '../../core/contratos';
import type { QuadroEstatico } from '../../data/trailer/tipos';
import { LAYOUT_DA_MARCA, LOGO_ALTURA } from '../../ui/logo';
import type { Ferramentas } from '../../ui/ferramentas';
import { desenharCenarioLuta, desenharVinheta } from '../cenario';
import { desenharPose } from '../pose';
import type { Ctx } from '../tela';
import { desenharFundoDaMontagem } from './retratos';
import { desenharRostoOuPlaca } from './rosto';

/*
 * Versão ESTÁTICA do trailer (movimento reduzido ou economia de dados, spec §6.3): quadros PARADOS que trocam por dissolução. Zero aproximação, tremor, câmera lenta,
 * flash, onda de choque ou faísca. Só usa arte residente (a vitrine em `win`, os retratos e os cenários fixos); o que não está na memória cai no fundo escuro.
 */

export interface RecursosDaEstatica {
  readonly ctx: Ctx;
  readonly f: Ferramentas;
  readonly elenco: Elenco;
  readonly cenarios: ReadonlyMap<string, CanvasImageSource>;
  readonly vinheta: CanvasImageSource;
  /** Retratos que viram silhueta escura (o ZENON ainda não liberado, D-T2). */
  readonly ocultos: ReadonlySet<IdLutador>;
  /** Desenha a logo oficial; false se a imagem ainda não chegou. */
  readonly logo: (ctx: Ctx, x: number, y: number, altura: number, shine: number, alpha: number) => boolean;
  /** A chamada do título (CTA, recorde, rodapé) em `t`. */
  readonly chamada: (t: number) => void;
}

/** x dos `n` lutadores/retratos de um quadro (centro), de modo que 1 fica no meio, 2 em +-170 e 3 em +-230. */
export function posicoesDoQuadro(n: number): readonly number[] {
  if (n <= 1) return [LARGURA / 2];
  if (n === 2) return [LARGURA / 2 - 170, LARGURA / 2 + 170];
  return Array.from({ length: n }, (_, i) => LARGURA / 2 + (i - (n - 1) / 2) * 230);
}

/** Um quadro estático inteiro (sem letterbox nem título: quem chama põe). */
export function desenharQuadroEstatico(r: RecursosDaEstatica, q: QuadroEstatico, alfa: number): void {
  const { ctx, f } = r;
  if (alfa <= 0) return;
  ctx.save();
  ctx.globalAlpha = Math.min(1, alfa);
  const fundo = r.cenarios.get(q.stage);
  if (fundo) {
    desenharCenarioLuta(ctx, fundo, LARGURA / 2);
    ctx.fillStyle = q.logo ? 'rgba(4,2,10,.55)' : 'rgba(4,2,10,.38)';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
    desenharVinheta(ctx, r.vinheta);
  } else desenharFundoDaMontagem(ctx);
  if (q.logo) {
    if (!r.logo(ctx, LARGURA / 2, LAYOUT_DA_MARCA.y, LOGO_ALTURA, 2, 1)) f.A('INNO FIGHTERS', LARGURA / 2, LAYOUT_DA_MARCA.y, 96, ['#ffffff', '#ffd27a'], '#1a0a00');
    r.chamada(120);
  } else if (q.lutadores.length > 0) {
    const xs = posicoesDoQuadro(q.lutadores.length);
    q.lutadores.forEach((id, i) => {
      const l = r.elenco[id];
      if (l.arte.pronta !== false) {
        f.floorShadow(xs[i] as number, GROUND, 70);
        desenharPose(ctx, l.ch, l.arte, 'win', xs[i] as number, GROUND, 1.05, i === 1 ? -1 : 1);
      } else {
        // o atlas não está na memória (rede lenta: o estático por vazão só pede cenários e retratos): o rosto no lugar da pose, nunca um vão
        const lado = 190;
        const x = (xs[i] as number) - lado / 2;
        desenharRostoOuPlaca(ctx, f, l, x, 170, lado, i === 1, ['#34406e', '#0c1233']);
        ctx.lineWidth = 3;
        ctx.strokeStyle = l.ch.accent;
        ctx.strokeRect(x + 1.5, 171.5, lado - 3, lado - 3);
        f.A(l.ch.name, x + lado / 2, 170 + lado + 30, 26, ['#ffffff', '#ffd27a'], '#000');
      }
    });
  } else if (q.retratos && q.retratos.length > 0) {
    const xs = posicoesDoQuadro(q.retratos.length);
    const lado = 150;
    q.retratos.forEach((id, i) => {
      const l = r.elenco[id];
      const x = (xs[i] as number) - lado / 2;
      const y = 200;
      if (r.ocultos.has(id)) {
        ctx.fillStyle = 'rgba(6,3,16,.92)';
        ctx.fillRect(x, y, lado, lado);
        f.A('?', x + lado / 2, y + lado / 2, 80, '#6c5a8a', '#000');
      } else desenharRostoOuPlaca(ctx, f, l, x, y, lado, false, ['#34406e', '#0c1233']);
      ctx.lineWidth = 3;
      ctx.strokeStyle = l.ch.accent;
      ctx.strokeRect(x + 1.5, y + 1.5, lado - 3, lado - 3);
    });
  }
  ctx.restore();
}
