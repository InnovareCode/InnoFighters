import { ALTURA, LARGURA } from '../../core/constantes';
import { zoomIn } from '../../render/animacao';
import { APRESENTACAO } from '../../render/apresentacao-lutadores';
import { desenharFundoMenu } from '../../render/cenario';
import { desenharRetrato } from '../../render/retrato';
import { FH } from '../../render/texto';
import { TEXTOS_COMUNS } from '../../render/textos-dos-chefoes';
import type { Navegador } from '../navegador';
import { NAV, type ArgsDesbloqueio, type Cena } from '../tipos';

/** "NOVO LUTADOR LIBERADO!": um aviso para cada id liberado, na ordem recebida (fila primeiro, chefão depois). */
export class CenaDesbloqueio implements Cena {
  private a: ArgsDesbloqueio = { novos: [] };

  constructor(private readonly ui: Navegador) {}

  /** Índice do aviso em exibição. */
  get indice(): number {
    return this.a.indice ?? 0;
  }

  enter(a: ArgsDesbloqueio): void {
    this.a = a;
    this.ui.c.audio.uiPerfect();
  }

  private seguir(): void {
    const prox = this.indice + 1;
    if (prox < this.a.novos.length) this.ui.go('desbloqueio', { novos: this.a.novos, indice: prox });
    else this.ui.go('title');
  }

  key(k: string): boolean {
    if (this.ui.t > 40 && (NAV[k] === 'ok' || NAV[k] === 'back')) this.seguir();
    return true;
  }

  click(): void {
    if (this.ui.t > 40) this.seguir();
  }

  /** Largura máxima do título do cartão (px lógicos): o canvas tem 960; sobra uma margem de 40 de cada lado. */
  static readonly LARGURA_MAXIMA_DO_TITULO = 880;

  /**
   * O título do cartão de um chefão que caiu: o do dado (ZENON: "O ANFITRIÃO SE RENDE") ou "<NOME> SE JUNTA A VOCÊ!". Se o texto medido no navegador (a 46 px, a fonte dos títulos)
   * passa da largura máxima, vale a reserva do Apolo, "SELO ENTREGUE!" (o nome já aparece grande logo abaixo).
   */
  titulo(id: string, nome: string): string {
    const dado = APRESENTACAO[id]?.desbloqueioTitulo;
    const texto = dado ?? TEXTOS_COMUNS.desbloqueioGuardiao.replace('{NOME}', nome);
    const { ctx } = this.ui.c;
    ctx.save();
    ctx.font = FH(46);
    const cabe = ctx.measureText(texto).width <= CenaDesbloqueio.LARGURA_MAXIMA_DO_TITULO;
    ctx.restore();
    return cabe ? texto : TEXTOS_COMUNS.desbloqueioGuardiaoReserva;
  }

  draw(): void {
    const id = this.a.novos[this.indice];
    if (!id) return;
    const { ctx, f, regras } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    const t = this.ui.t;
    const r = m.elenco[id];
    const ch = r.ch;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, t, 0.55);
    f.spotlight(W / 2, 290, 330, `${ch.fire[0]}55`);
    this.ui.desenharPetalas();
    const chefe = id === regras.chefe;
    const epilogo = regras.chefesDaFila ? APRESENTACAO[id]?.epilogo : undefined;
    if (epilogo) {
      // chefão que caiu (chefesDaFila): o enredo fecha aqui. Título do dado (ZENON: "O ANFITRIÃO SE RENDE") ou "<NOME> SE JUNTA A VOCÊ!" (SELO ENTREGUE! se não couber) e o epílogo de 3 linhas no lugar da descrição
      f.A(this.titulo(id, ch.name), W / 2, 50, 46, ['#fff6b0', '#ff9a1a'], '#2a1000', 'center', zoomIn(t));
      desenharRetrato(ctx, r.arte.retrato(ch.head), W / 2 - 100, 86, 200, false, ['#34406e', '#0c1233']);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(W / 2 - 100, 86, 200, 200);
      f.A(ch.name, W / 2, 322, 50, ['#ffffff', ch.accent], '#2a1000', 'center', zoomIn(t - 4));
      f.T(`${ch.title}  •  ${ch.country}`, W / 2, 362, 17, ch.accent, 'center');
      f.T(epilogo.quem, W / 2, 394, 17, '#e8ecff', 'center');
      f.T(epilogo.porque, W / 2, 419, 17, '#e8ecff', 'center');
      f.T(`“${epilogo.convite}”`, W / 2, 454, 19, '#ffd23f', 'center');
      f.T(`Especial: ${ch.sps[0]?.name ?? ''}`, W / 2, 484, 14, ch.fire[0], 'center');
    } else {
      f.A(chefe ? 'O CHEFÃO FOI LIBERADO!' : 'NOVO LUTADOR LIBERADO!', W / 2, 56, 46, ['#fff6b0', '#ff9a1a'], '#2a1000', 'center', zoomIn(t));
      desenharRetrato(ctx, r.arte.retrato(ch.head), W / 2 - 110, 100, 220, false, ['#34406e', '#0c1233']);
      ctx.lineWidth = 5;
      ctx.strokeStyle = '#ffd23f';
      ctx.strokeRect(W / 2 - 110, 100, 220, 220);
      f.A(ch.name, W / 2, 360, 54, ['#ffffff', '#ff9a1a'], '#2a1000', 'center', zoomIn(t - 4));
      f.T(`${ch.title}  •  ${ch.country}`, W / 2, 404, 17, ch.accent, 'center');
      f.T(ch.desc, W / 2, 436, 15, '#e8ecff', 'center');
      f.T(`Especial: ${ch.sps[0]?.name ?? ''}`, W / 2, 462, 14, ch.fire[0], 'center');
    }
    if (this.a.novos.length > 1) f.T(`${this.indice + 1} de ${this.a.novos.length}`, W - 20, 24, 14, '#cfd6f5', 'right');
    if (t > 40 && Math.floor(t / 25) % 2 === 0) f.T('ENTER para continuar', W / 2, ALTURA - 20, 15, '#cfd6f5', 'center');
  }
}
