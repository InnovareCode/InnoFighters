import { VITRINE } from '../../data/lutadores';
import { desenharFundoMenu } from '../../render/cenario';
import { descricaoArcade } from '../escada-texto';
import { LOGO_MENU, marca } from '../logo';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import { mostrarLutador } from '../personagens';
import type { AcaoNav, Cena, ModoMenu } from '../tipos';

/** Menu principal. */
export class CenaMenu implements Cena {
  private m: MenuList;

  constructor(private readonly ui: Navegador) {
    this.m = this.criarMenu();
  }

  private criarMenu(): MenuList {
    const { f, audio } = this.ui.c;
    const ir = (mode: ModoMenu) => () => this.ui.go('select', { mode });
    return new MenuList(
      [
        { label: 'ARCADE', desc: descricaoArcade(this.ui.c.regras), onOk: ir('arcade') },
        { label: 'VERSUS 2 JOGADORES', desc: 'Duelo local no mesmo teclado ou com dois controles.', onOk: ir('versus') },
        { label: 'LUTA vs CPU', desc: 'Escolha qualquer combinação de lutadores e a dificuldade.', onOk: ir('cpu') },
        { label: 'TREINAMENTO', desc: 'Pratique combos sem pressão: tempo infinito, energia e alvo configurável.', onOk: ir('training') },
        { label: 'COMO JOGAR', desc: 'Controles, lista de golpes e regras do jogo.', onOk: () => this.ui.go('how', { from: 'menu' }) },
        { label: 'OPÇÕES', desc: 'Volume, rounds, tempo, dificuldade e efeitos.', onOk: () => this.ui.go('options', { from: 'menu' }) },
      ],
      audio,
      f,
    );
  }

  enter(): void {
    this.m = this.criarMenu();
    this.ui.c.audio.startMusic('menu');
  }

  /** Item selecionado (para teste e para a dica). */
  get selecionado(): number {
    return this.m.sel;
  }

  draw(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const t = this.ui.t;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, t, 0.42);
    const id = VITRINE[Math.floor(t / 300) % VITRINE.length] ?? 'hayato';
    const k = (t % 300) / 300;
    f.spotlight(720, 380, 230, 'rgba(255,190,220,.16)');
    ctx.save();
    ctx.globalAlpha = Math.min(1, Math.min(k * 8, (1 - k) * 8));
    mostrarLutador(f, m, id, 720, 490, 1.5, -1, t);
    ctx.restore();
    f.A(m.elenco[id].ch.name, 720, 90, 40, '#fff', '#000', 'center', 1, Math.min(1, Math.min(k * 8, (1 - k) * 8)));
    this.ui.desenharPetalas();
    marca.desenharLogoHorizontal(ctx, LOGO_MENU.x, LOGO_MENU.y, LOGO_MENU.altura, ((t % 360) - 30) / 60);
    this.m.draw(34, 100, 380, 54, { size: 25, t });
    f.panel(34, 430, 520, 62, { r: 8 });
    f.wrap(this.m.items[this.m.sel]?.desc ?? '', 50, 452, 490, 20, 15, '#e8ecff');
    f.hint('↑ ↓ navegar     ENTER / Z selecionar     ESC voltar');
  }

  nav(a: AcaoNav): void {
    if (a === 'back') {
      this.ui.go('title');
      this.ui.c.audio.uiBack();
    } else this.m.nav(a);
  }

  hover(x: number, y: number): void {
    this.m.hover(x, y);
  }

  click(x: number, y: number): void {
    this.m.click(x, y);
  }
}
