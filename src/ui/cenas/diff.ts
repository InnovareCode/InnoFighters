import { LARGURA } from '../../core/constantes';
import type { IdLutador } from '../../core/contratos';
import { ROSTER } from '../../data/lutadores';
import { AI_LEVELS } from '../../fight/cpu';
import { desenharFundoMenu } from '../../render/cenario';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import { mostrarLutador } from '../personagens';
import type { AcaoNav, ArgsDiff, CampanhaArcade, Cena } from '../tipos';

/** Escolha da dificuldade da CPU (e sorteio dos rivais no ARCADE). */
export class CenaDiff implements Cena {
  private a: ArgsDiff = { mode: 'cpu', c1: 'hayato', c2: 'wei-long' };
  private m: MenuList;

  constructor(private readonly ui: Navegador) {
    this.m = this.criarMenu();
  }

  private criarMenu(): MenuList {
    const { f, audio } = this.ui.c;
    return new MenuList(AI_LEVELS.map((L, i) => ({ label: L.name, onOk: () => this.escolher(i) })), audio, f);
  }

  enter(a: ArgsDiff): void {
    this.a = a;
    this.m = this.criarMenu();
    this.m.sel = this.ui.c.persist.settings.diff;
  }

  /** Nível escolhido: grava como padrão e segue para a tela de confronto. */
  private escolher(i: number): void {
    const { persist, rngUI } = this.ui.c;
    persist.settings.diff = i;
    persist.salvar();
    const a = this.a;
    if (a.mode === 'arcade') {
      const outros: IdLutador[] = ROSTER.filter((c) => c !== a.c1);
      for (let k = outros.length - 1; k > 0; k--) {
        const j = Math.floor(rngUI.proximo() * (k + 1));
        const tmp = outros[k] as IdLutador;
        outros[k] = outros[j] as IdLutador;
        outros[j] = tmp;
      }
      const run: CampanhaArcade = { c1: a.c1, order: outros, idx: 0, score: 0, continues: 3, diff: i, cont: 0 };
      this.ui.run = run;
      this.ui.go('vs', { cfg: { mode: 'arcade', c1: a.c1, c2: outros[0] as IdLutador, cpu: i }, run });
    } else this.ui.go('vs', { cfg: { mode: 'cpu', c1: a.c1, c2: a.c2, cpu: i } });
  }

  draw(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, this.ui.t, 0.55);
    this.ui.desenharPetalas();
    f.A('DIFICULDADE', W / 2, 70, 56, ['#ffffff', '#ffc27a'], '#1a0a00');
    this.m.draw(W / 2 - 200, 140, 400, 62, { size: 32, align: 'center' });
    f.panel(W / 2 - 250, 350, 500, 70, { r: 8 });
    f.wrap(AI_LEVELS[this.m.sel]?.desc ?? '', W / 2 - 232, 378, 464, 22, 17, '#e8ecff');
    mostrarLutador(f, m, this.a.c1, 120, 480, 0.9, 1, this.ui.t);
    f.hint('↑ ↓ escolher     ENTER / Z confirmar     ESC voltar');
  }

  nav(a: AcaoNav): void {
    if (a === 'back') {
      this.ui.go('select', { mode: this.a.mode });
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
