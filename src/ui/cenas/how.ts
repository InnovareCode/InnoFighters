import { LARGURA } from '../../core/constantes';
import type { IdLutador } from '../../core/contratos';
import { liberados } from '../../meta';
import { textoComoJogarArcade } from '../escada-texto';
import { desenharFundoMenu } from '../../render/cenario';
import { desenharRetrato } from '../../render/retrato';
import { FH } from '../../render/texto';
import type { Navegador } from '../navegador';
import { alturaDosCombos, combosDoLutador, combosLigados, desenharCombos } from '../combos-tela';
import { barrasDeStatus, desenharLinhasDeGolpes, P_COL, SCHEME } from '../personagens';
import { NAV, type ArgsComo, type Cena } from '../tipos';

/** A aba LUTADORES mostra o elenco em 2 colunas (cabe 4; para mais, a E4 reorganiza junto com a grade 3x3 da seleção). */
const COLUNAS_ABA_LUTADORES = 2;
const POR_PAGINA = 4;

export const ABAS_COMO_JOGAR = ['OBJETIVO', 'CONTROLES', 'GOLPES', 'SISTEMA', 'LUTADORES'] as const;

/** Tela "Como jogar": 5 abas (objetivo, controles, golpes, sistema, lutadores). */
export class CenaHow implements Cena {
  tab = 0;
  cid = 0;
  /** Página da aba LUTADORES (4 por página). */
  pagina = 0;

  constructor(private readonly ui: Navegador) {}

  enter(_a: ArgsComo): void {
    this.tab = 0;
    this.cid = 0;
    this.pagina = 0;
  }

  /** Só os lutadores liberados aparecem aqui (travados não vazam nome nem golpes). */
  private lista(): IdLutador[] {
    const { regras, persist } = this.ui.c;
    const libs = liberados(persist.prog, regras);
    return regras.roster.filter((id) => libs.has(id));
  }

  key(k: string): boolean {
    const { audio } = this.ui.c;
    const n = ABAS_COMO_JOGAR.length;
    if (k === 'ArrowLeft' || k === 'a') {
      this.tab = (this.tab + n - 1) % n;
      audio.uiMove();
      return true;
    }
    if (k === 'ArrowRight' || k === 'd') {
      this.tab = (this.tab + 1) % n;
      audio.uiMove();
      return true;
    }
    if ((k === 'ArrowUp' || k === 'w') && this.tab === 2) {
      this.cid = (this.cid + this.lista().length - 1) % this.lista().length;
      audio.uiMove();
      return true;
    }
    const paginas = Math.ceil(this.lista().length / POR_PAGINA);
    if (this.tab === 4 && paginas > 1 && (k === 'ArrowUp' || k === 'w' || k === 'ArrowDown' || k === 's')) {
      this.pagina = (this.pagina + (k === 'ArrowDown' || k === 's' ? 1 : paginas - 1)) % paginas;
      audio.uiMove();
      return true;
    }
    if ((k === 'ArrowDown' || k === 's') && this.tab === 2) {
      this.cid = (this.cid + 1) % this.lista().length;
      audio.uiMove();
      return true;
    }
    if (NAV[k] === 'back' || k === 'Enter') {
      this.ui.go('menu');
      audio.uiBack();
      return true;
    }
    return true;
  }

  click(x: number, y: number): void {
    ABAS_COMO_JOGAR.forEach((_, i) => {
      const tx = 40 + i * 176;
      if (x >= tx && x <= tx + 166 && y >= 62 && y <= 96) {
        this.tab = i;
        this.ui.c.audio.uiMove();
      }
    });
  }

  private bullet(x: number, y: number, w: number, head: string, body: string): number {
    const { f } = this.ui.c;
    f.A(head, x, y, 20, '#ffd23f', '#000', 'left');
    return f.wrap(body, x + 4, y + 26, w, 19, 15, '#e8ecff');
  }

  draw(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, this.ui.t, 0.6);
    f.A('COMO JOGAR', LARGURA / 2, 36, 40, ['#ffffff', '#ffc27a'], '#1a0a00');
    ABAS_COMO_JOGAR.forEach((t, i) => {
      const x = 40 + i * 176;
      const sel = i === this.tab;
      f.panel(x, 62, 166, 34, {
        r: 6,
        c0: sel ? '#ffcf4a' : 'rgba(26,18,52,.85)',
        c1: sel ? '#ff8a2a' : 'rgba(10,8,26,.85)',
        stroke: sel ? '#fff' : 'rgba(255,255,255,.25)',
      });
      ctx.save();
      ctx.font = FH(18);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = sel ? '#1b0b00' : '#fff';
      ctx.fillText(t, x + 83, 80);
      ctx.restore();
    });
    const y0 = 110;
    if (this.tab === 0) {
      f.panel(40, y0, 880, 372);
      this.bullet(64, y0 + 30, 400, 'VENÇA O ROUND', 'Zere a barra de vida do rival para dar o K.O. Se o tempo acabar, vence quem tiver mais vida.');
      this.bullet(64, y0 + 120, 400, 'VENÇA A LUTA', 'Ganhe o número de rounds configurado (padrão: 2 — "melhor de 3"). Um round sem sofrer dano vale PERFECT e bônus de pontos.');
      this.bullet(64, y0 + 230, 400, 'BARRA SUPER', 'Enche ao dar e receber golpes e aos poucos com o tempo. Cada especial gasta uma parte da barra (de 20 a 45).');
      this.bullet(500, y0 + 30, 400, 'ARCADE', textoComoJogarArcade(this.ui.c.regras));
      this.bullet(500, y0 + 120, 400, 'VERSUS E LUTA vs CPU', 'Duelo com um amigo no mesmo teclado/controle ou contra a CPU em 3 dificuldades.');
      this.bullet(500, y0 + 210, 400, 'TREINAMENTO', 'Tempo infinito, energia sempre cheia e alvo configurável (parado, agachado, bloqueando, pulando ou CPU). Veja o dano dos seus combos.');
    } else if (this.tab === 1) {
      ([1, 2] as const).forEach((s) => {
        const x = s === 1 ? 40 : 500;
        const cor = P_COL[s === 1 ? 0 : 1];
        f.panel(x, y0, 420, 250, { stroke: cor });
        f.A(s === 1 ? 'JOGADOR 1' : 'JOGADOR 2', x + 210, y0 + 24, 26, cor, '#000');
        const S = SCHEME[s];
        const bx = x + 40;
        const by = y0 + 56;
        f.keycap(S.up, bx + 40, by, 38, 38);
        f.keycap(S.left, bx, by + 42, 38, 38);
        f.keycap(S.down, bx + 40, by + 42, 38, 38);
        f.keycap(S.right, bx + 80, by + 42, 38, 38);
        f.T('MOVER', bx + 59, by + 98, 12, '#cfd6f5', 'center');
        const botoes: ReadonlyArray<readonly ['lp' | 'hp' | 'lk' | 'hk' | 'sp', string]> = [
          ['lp', 'SOCO FRACO'], ['hp', 'SOCO FORTE'], ['lk', 'CHUTE FRACO'], ['hk', 'CHUTE FORTE'], ['sp', 'ESPECIAL'],
        ];
        botoes.forEach(([k, n], i) => {
          const cx = x + 178 + (i % 3) * 80;
          const cy = by - 6 + Math.floor(i / 3) * 68;
          f.keycap(S[k], cx, cy, 44, 44, true);
          f.T(n, cx + 22, cy + 56, 10, k === 'sp' ? '#ffd23f' : '#fff', 'center');
        });
        f.T(`← → andar / defender   ${S.up} pular   ${S.down} agachar`, x + 24, y0 + 200, 13, '#e8ecff', 'left');
        f.T(`Especiais: ↓↘→ / →↓↘ + soco, ↓↙← + chute (ou ESP, ${S.down}+ESP, ${S.fwd}+ESP)`, x + 24, y0 + 222, 11, '#ffd23f', 'left');
        f.T(s === 1 ? '1 jogador: as duas configurações funcionam.' : '', x + 24, y0 + 241, 11, '#9fa6c9', 'left');
      });
      f.panel(40, y0 + 262, 880, 110, { r: 8 });
      // com a ESQUIVA nas regras entra mais uma linha (4 linhas em vez de 3); sem ela o painel é o do protótipo
      const esq = this.ui.c.regras.esquiva;
      f.T('ESC ou P — pausar     M — mudo     F — tela cheia', 60, y0 + (esq ? 282 : 288), 15, '#e8ecff', 'left');
      f.T('Controle (PlayStation): □ soco fraco • △ soco forte • ✕ chute fraco • ○ chute forte • R1 especial • ' + (esq ? 'L1 esquiva • ' : '') + 'START pausa • 2 controles = 2 jogadores.', 60, y0 + (esq ? 306 : 318), 13, '#cfd6f5', 'left');
      if (esq) f.T('ESQUIVA: P1 tecla N • P2 tecla O • controle L1 ou L2 • celular botão ESQ. Com → avança, com ← ou parado recua. Custa 20 da barra SUPER.', 60, y0 + 330, 13, '#7fe3ff', 'left');
      f.T('Menus: setas / WASD navegam • ENTER / Z confirmam • ESC / X voltam • o mouse também funciona.', 60, y0 + (esq ? 354 : 346), 14, '#cfd6f5', 'left');
    } else if (this.tab === 2) {
      const id = this.lista()[this.cid] ?? 'hayato';
      const ch = m.elenco[id].ch;
      f.A(ch.name, 480, y0 + 8, 24, ch.accent, '#000');
      f.T('↑ ↓ trocar de lutador', 920, y0 + 8, 13, '#cfd6f5', 'right');
      // V2-4 (§6.2): com a regra dos combos próprios ligada, a lista dos combos do lutador entra embaixo dos golpes (a legenda das teclas sobe)
      const combos = combosLigados(this.ui.c.regras) ? combosDoLutador(m.elenco[id].ch) : [];
      if (combos.length > 0) {
        const rowH = Math.min(49, Math.floor((500 - alturaDosCombos(combos.length) - 6 - (y0 + 26) + 5) / 7));
        desenharLinhasDeGolpes(f, m, id, 40, y0 + 26, 880, 1, rowH);
        desenharCombos(f, combos, ch.accent, 40, y0 + 26 + 7 * rowH - 5 + 6, 880, 1);
        f.T('Teclas do Jogador 1 (J2: W A S D + J K U I L)', 40, y0 + 8, 12, '#9fa6c9', 'left');
      } else {
        desenharLinhasDeGolpes(f, m, id, 40, y0 + 26, 880, 1, 49);
        f.T('Teclas do Jogador 1 (Jogador 2: W A S D + J K U I L)', 40, y0 + 376, 12, '#9fa6c9', 'left');
      }
    } else if (this.tab === 3) {
      f.panel(40, y0, 880, 372);
      this.bullet(64, y0 + 28, 400, 'DEFESA', 'Segure a direção CONTRA o oponente para bloquear (andar para trás também protege). Golpes baixos só são bloqueados AGACHADO (↓ + trás); golpes aéreos só EM PÉ. Bloquear causa pouquíssimo dano.');
      this.bullet(64, y0 + 160, 400, 'COMBOS', 'Ao acertar (ou ser bloqueado), aperte o próximo botão e o golpe ENCADEIA: soco fraco → chute fraco → soco forte → chute forte → especial. O soco fraco pode se repetir. O dano cai ~10% por golpe.');
      this.bullet(500, y0 + 28, 400, 'MOVIMENTO', 'Toque 2x para frente: corrida. 2x para trás: recuo rápido. Colado no rival, → + soco forte: ARREMESSO (não dá para bloquear).');
      this.bullet(500, y0 + 122, 400, 'DERRUBADAS', 'Chute forte, rasteira, ↓ + soco forte e quase todos os especiais derrubam. Quem cai fica invulnerável por instantes ao levantar.');
      this.bullet(500, y0 + 212, 400, 'ENERGIA', 'Cada especial tem um custo. Acertar golpes enche mais a barra.' + (this.ui.c.regras.esquiva ? ' A esquiva custa 20 e deixa você invulnerável por um instante.' : ''));
      this.bullet(500, y0 + 288, 400, 'DICA', 'Pule por cima dos projéteis, use a rasteira contra quem só bloqueia em pé e alterne alto/baixo para furar a defesa.');
    } else {
      this.lista().slice(this.pagina * POR_PAGINA, (this.pagina + 1) * POR_PAGINA).forEach((id, i) => {
        const r = m.elenco[id];
        const ch = r.ch;
        const x = 40 + (i % COLUNAS_ABA_LUTADORES) * 446;
        const y = y0 + Math.floor(i / COLUNAS_ABA_LUTADORES) * 188;
        f.panel(x, y, 434, 178, { stroke: ch.accent });
        desenharRetrato(ctx, r.arte.retrato(ch.head), x + 10, y + 10, 100, false, ['#34406e', '#0c1233']);
        f.A(ch.name, x + 124, y + 26, 28, '#fff', '#000', 'left');
        f.T(ch.title, x + 124, y + 52, 13, ch.accent, 'left');
        f.wrap(ch.desc, x + 124, y + 74, 296, 17, 13, '#e8ecff');
        barrasDeStatus(f, ch, x + 14, y + 128, 170);
        ch.sps.forEach((sp, j) => f.T((j === 0 ? 'ESP  ' : j === 1 ? '↓ ESP  ' : '→ ESP  ') + (sp.name ?? ''), x + 214, y + 128 + j * 17, 13, j === 0 ? ch.fire[0] : '#e8ecff', 'left'));
      });
    }
    f.hint('← → trocar aba     ESC / ENTER voltar ao menu');
  }
}
