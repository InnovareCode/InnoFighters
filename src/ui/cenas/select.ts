import { LARGURA } from '../../core/constantes';
import type { IdLutador } from '../../core/contratos';
import { desenharFundoMenu } from '../../render/cenario';
import { desenharRetrato } from '../../render/retrato';
import { liberados, marcarVistos, naoVistos, proximoDaFila } from '../../meta';
import { dicaArcadeSelecao } from '../escada-texto';
import { colunasDaGrade, estadoDaCasa, moverNaGrade, ordemDaGrade, podeEscolher, proximaLiberada, retanguloDaCasa, retanguloDeToque, temCasaDeHonra, type EstadoCasa } from '../grade';
import type { Navegador } from '../navegador';
import { barrasDeStatus, escalaDeVitrine, mostrarLutador, P_COL } from '../personagens';
import type { ArgsSelect, Cena, ModoMenu } from '../tipos';

type Dir = 'up' | 'down' | 'left' | 'right';

const TECLAS_P1: Readonly<Record<string, Dir>> = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right' };
const TECLAS_P2: Readonly<Record<string, Dir>> = { w: 'up', s: 'down', a: 'left', d: 'right' };

/**
 * Seleção de lutador(es): grade de 2 colunas até 4 lutadores (layout de hoje), 3x3 com o chefão no centro (9) ou 3x3 de regulares com a CASA DE
 * HONRA do chefão embaixo (10, o ZENON), estados liberado / NOVO! / travado / chefão oculto, 1 ou 2 jogadores, etapa de alvo/adversário.
 * Tudo deriva de `regras.roster` (nada de "4" fixo) e do progresso do jogador.
 */
export class CenaSelect implements Cena {
  mode: ModoMenu = 'arcade';
  versus = false;
  step = 1;
  /** Posições na grade (não ids): `grade[cur[p]]` é o lutador sob o cursor. */
  cur: [number, number] = [0, 1];
  lock: [boolean, boolean] = [false, false];
  pick: [number, number] = [0, 1];
  flash: [number, number] = [0, 0];
  done = 0;
  /** Ids na ordem das casas. */
  grade: IdLutador[] = [];
  private colunas: 2 | 3 = 2;
  /** Há a casa de honra do chefão (10 casas: 3x3 + o chefão numa faixa embaixo)? */
  private honra = false;
  private libs: ReadonlySet<IdLutador> = new Set();
  /** Liberados que ainda não tinham sido vistos ao abrir a tela (selo NOVO!). */
  novos: ReadonlySet<IdLutador> = new Set();

  constructor(private readonly ui: Navegador) {}

  enter(a: ArgsSelect): void {
    const { regras, persist } = this.ui.c;
    this.mode = a.mode;
    this.versus = a.mode === 'versus';
    this.step = 1;
    this.grade = ordemDaGrade(regras.roster, regras.chefe);
    this.colunas = colunasDaGrade(this.grade.length);
    this.honra = temCasaDeHonra(this.grade.length);
    this.libs = liberados(persist.prog, regras);
    // o selo NOVO! vale durante esta visita; ao abrir, já conta como visto (some na próxima)
    this.novos = new Set(naoVistos(persist.prog).filter((id) => this.libs.has(id)));
    if (this.novos.size > 0) {
      persist.prog = marcarVistos(persist.prog, [...this.novos]);
      persist.salvar();
    }
    const primeiro = Math.max(0, proximaLiberada(this.grade, this.libs, 0));
    this.cur = [primeiro, Math.max(0, proximaLiberada(this.grade, this.libs, primeiro + 1))];
    this.lock = [false, false];
    this.pick = [0, 1];
    this.flash = [0, 0];
    this.done = 0;
  }

  private get n(): number {
    return this.grade.length;
  }

  private idEm(i: number): IdLutador {
    return this.grade[i] ?? this.grade[0] ?? 'hayato';
  }

  private estado(id: IdLutador): EstadoCasa {
    const { regras, persist } = this.ui.c;
    return estadoDaCasa(id, { prog: persist.prog, regras, novos: this.novos });
  }

  private title(): string {
    if (this.versus) return 'ESCOLHAM SEUS LUTADORES';
    return this.step === 1 ? 'ESCOLHA SEU LUTADOR' : this.mode === 'training' ? 'ESCOLHA O ALVO DO TREINO' : 'ESCOLHA O ADVERSÁRIO';
  }

  /** Jogador que está escolhendo agora (null no versus: os dois). */
  private active(): 0 | 1 | null {
    return this.versus ? null : this.step === 1 ? 0 : 1;
  }

  /** O cursor anda por TODAS as casas (inclusive travadas, para mostrar o que falta); só a confirmação é barrada. */
  private moveCursor(p: 0 | 1, a: Dir): void {
    this.cur[p] = moverNaGrade(this.cur[p], a, this.n, this.colunas);
    this.ui.c.audio.uiMove();
  }

  private confirm(p: 0 | 1): void {
    if (this.lock[p] || this.done) return;
    const id = this.idEm(this.cur[p]);
    if (!podeEscolher(this.estado(id))) {
      this.ui.c.audio.deny(); // travado não confirma, em nenhum modo
      return;
    }
    this.lock[p] = true;
    this.pick[p] = this.cur[p];
    this.flash[p] = 36;
    this.ui.c.audio.uiSelect(this.ui.m.elenco[id].ch.pitch);
    if (this.versus) {
      if (this.lock[0] && this.lock[1]) this.done = 70;
      return;
    }
    if (this.mode === 'arcade') {
      this.done = 60;
      return;
    }
    if (this.step === 1) {
      this.step = 2;
      this.cur[1] = Math.max(0, proximaLiberada(this.grade, this.libs, this.cur[0] + 1));
      this.lock[1] = false;
      return;
    }
    this.done = 60;
  }

  private back(p: 0 | 1): void {
    const { audio } = this.ui.c;
    if (this.done) return;
    if (this.versus) {
      if (this.lock[p]) {
        this.lock[p] = false;
        audio.uiBack();
      } else {
        this.ui.go('menu');
        audio.uiBack();
      }
      return;
    }
    if (this.step === 2) {
      this.step = 1;
      this.lock[0] = false;
      audio.uiBack();
    } else {
      this.ui.go('menu');
      audio.uiBack();
    }
  }

  key(k: string): boolean {
    const d1 = TECLAS_P1[k];
    const d2 = TECLAS_P2[k];
    const ok1 = k === 'z' || k === 'c' || k === 'Enter' || k === ' ';
    const ok2 = k === 'j' || k === 'u';
    const bk1 = k === 'x' || k === 'v' || k === 'Escape' || k === 'Backspace';
    const bk2 = k === 'k' || k === 'i';
    if (this.versus) {
      if (d1 && !this.lock[0]) this.moveCursor(0, d1);
      else if (d2 && !this.lock[1]) this.moveCursor(1, d2);
      else if (ok1) this.confirm(0);
      else if (ok2) this.confirm(1);
      else if (bk1) this.back(0);
      else if (bk2) this.back(1);
      else return false;
      return true;
    }
    const act = this.active() ?? 0;
    const dir = d1 ?? d2;
    if (dir) {
      if (!this.lock[act]) this.moveCursor(act, dir);
    } else if (ok1 || ok2) this.confirm(act);
    else if (bk1 || bk2) this.back(0);
    else return false;
    return true;
  }

  private tileRect(i: number): { x: number; y: number; w: number; h: number } {
    return retanguloDaCasa(i, this.colunas, this.n);
  }

  /** A área de mouse/toque da casa (a de honra tem folga: ver `retanguloDeToque`). */
  private toqueRect(i: number): { x: number; y: number; w: number; h: number } {
    return retanguloDeToque(i, this.colunas, this.n);
  }

  private jogadorDoMouse(): 0 | 1 {
    return this.versus ? (this.lock[0] ? 1 : 0) : (this.active() ?? 0);
  }

  hover(mx: number, my: number): void {
    for (let i = 0; i < this.n; i++) {
      const r = this.toqueRect(i);
      const p = this.jogadorDoMouse();
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h && !this.lock[p] && this.cur[p] !== i) {
        this.cur[p] = i;
        this.ui.c.audio.uiMove();
      }
    }
  }

  click(mx: number, my: number): void {
    for (let i = 0; i < this.n; i++) {
      const r = this.toqueRect(i);
      if (mx >= r.x && mx <= r.x + r.w && my >= r.y && my <= r.y + r.h) {
        const p = this.jogadorDoMouse();
        this.cur[p] = i;
        this.confirm(p);
      }
    }
  }

  update(): void {
    for (let p = 0; p < 2; p++) if ((this.flash[p as 0 | 1] ?? 0) > 0) this.flash[p as 0 | 1]--;
    if (this.done > 0 && --this.done === 0) {
      const c1 = this.idEm(this.pick[0]);
      const c2 = this.idEm(this.pick[1]);
      if (this.mode === 'arcade' || this.mode === 'cpu') this.ui.go('diff', { mode: this.mode, c1, c2 });
      else if (this.mode === 'versus') this.ui.go('vs', { cfg: { mode: 'versus', c1, c2, cpu: null, esquiva: this.ui.c.regras.esquiva } });
      else this.ui.go('fight', { cfg: { mode: 'training', c1, c2, cpu: null, esquiva: this.ui.c.regras.esquiva } });
    }
  }

  /** Texto do painel quando a casa não está liberada (sem revelar a fila: só o próximo vira "?"). */
  private textosDeCasaFechada(id: IdLutador): { nome: string; linhas: string[] } {
    const { regras, persist } = this.ui.c;
    if (this.estado(id) === 'chefe-oculto') return { nome: '???', linhas: ['Aparece no fim do ARCADE.', 'Derrote-o para liberar.'] };
    const linhas = ['Zere o ARCADE para liberar.'];
    if (proximoDaFila(persist.prog, regras) === id) linhas.push('É o próximo a ser liberado.');
    return { nome: '???', linhas };
  }

  private lado(p: 0 | 1, x: number, facing: number): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const t = this.ui.t;
    const idx = this.versus ? this.cur[p] : p === 0 ? (this.step === 1 ? this.cur[0] : this.pick[0]) : this.cur[1];
    const id = this.idEm(idx);
    const px = p === 0 ? 20 : LARGURA - 20 - 284;
    const tag = this.versus ? (p === 0 ? 'JOGADOR 1' : 'JOGADOR 2') : p === 0 ? 'VOCÊ' : this.mode === 'training' ? 'ALVO' : 'ADVERSÁRIO';
    if (!podeEscolher(this.estado(id))) {
      // casa fechada: nada de lutador (nem carrega o atlas): só um ponto de interrogação e o que falta
      f.spotlight(x, 300, 190, p === 0 ? 'rgba(63,169,255,.28)' : 'rgba(255,79,94,.28)');
      f.A('?', x, 260, 170, ['#4a4a66', '#1a1a2e'], '#0a0a14');
      const tx = this.textosDeCasaFechada(id);
      f.panel(px, 374, 284, 132, { stroke: P_COL[p] });
      f.A(tx.nome, px + 14, 394, 28, '#fff', '#000', 'left');
      tx.linhas.forEach((l, i) => f.T(l, px + 14, 424 + i * 20, 14, i === 0 ? '#e8ecff' : '#ffd23f', 'left'));
      f.A(tag, px + 142, 72, 22, P_COL[p], '#000', 'center');
      return;
    }
    const ch = m.elenco[id].ch;
    const fl = this.flash[p];
    f.spotlight(x, 300, 190, p === 0 ? 'rgba(63,169,255,.28)' : 'rgba(255,79,94,.28)');
    ctx.save();
    ctx.translate(x, 0);
    if (fl > 0) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      f.spotlight(0, 300, 200, `${ch.fire[0]}99`);
      ctx.restore();
    }
    ctx.restore();
    mostrarLutador(f, m, ch.id, x, 362, 1.18 * escalaDeVitrine(ch), facing, t + p * 30, fl > 12 ? 'special' : 'guard');
    f.panel(px, 374, 284, 132, { stroke: P_COL[p] });
    f.A(ch.name, px + 14, 394, 28, '#fff', '#000', 'left');
    f.T(`${ch.title}  •  ${ch.country}`, px + 14, 418, 13, ch.accent, 'left');
    barrasDeStatus(f, ch, px + 14, 444, 150);
    f.T('ESPECIAIS', px + 180, 438, 11, '#9fa6c9', 'left', { shadow: false });
    ch.sps.forEach((sp, i) => f.T((i === 0 ? '' : i === 1 ? '↓ ' : '→ ') + (sp.name ?? ''), px + 180, 456 + i * 17, 13, i === 0 ? ch.fire[0] : '#e8ecff', 'left'));
    f.A(tag, px + 142, 72, 22, P_COL[p], '#000', 'center');
  }

  /** Cadeado simples (corpo + argola) centrado em (cx, cy). */
  private cadeado(cx: number, cy: number, esc: number): void {
    const { ctx } = this.ui.c;
    ctx.save();
    ctx.strokeStyle = '#cfd6f5';
    ctx.lineWidth = 4 * esc;
    ctx.beginPath();
    ctx.arc(cx, cy - 6 * esc, 9 * esc, Math.PI, 0);
    ctx.stroke();
    ctx.fillStyle = '#cfd6f5';
    ctx.fillRect(cx - 14 * esc, cy - 6 * esc, 28 * esc, 22 * esc);
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(cx, cy + 4 * esc, 3.5 * esc, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private casa(i: number): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    const id = this.idEm(i);
    const est = this.estado(id);
    const r = this.tileRect(i);
    const esc = r.w / 120; // 1 na grade de hoje (120 px); 0,67 na 3x3 (80 px)
    const rc = m.elenco[id];
    const ch = rc.ch;
    const aqui = ([0, 1] as const).filter((p) => (this.versus || (p === 0 ? true : this.step === 2)) && this.cur[p] === i);
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,.4)';
    ctx.fillRect(r.x - 4, r.y - 4, r.w + 8, r.h + 8);
    ctx.restore();
    if (this.honra && i === this.n - 1) {
      this.casaDeHonra(i, est, r);
      return;
    }
    if (est === 'chefe-oculto') {
      const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
      g.addColorStop(0, '#2a1236');
      g.addColorStop(1, '#0a0614');
      ctx.fillStyle = g;
      ctx.fillRect(r.x, r.y, r.w, r.h);
      f.A('???', r.x + r.w / 2, r.y + r.h / 2 - 6 * esc, 30 * esc, '#6a5a8a', '#0a0a14');
    } else {
      desenharRetrato(ctx, rc.arte.retrato(ch.head), r.x, r.y, r.w, false, ['#34406e', '#0c1233']);
      if (est === 'travado') {
        ctx.fillStyle = 'rgba(6,3,16,.9)'; // silhueta escura do retrato
        ctx.fillRect(r.x, r.y, r.w, r.h);
        this.cadeado(r.x + r.w / 2, r.y + r.h / 2 - 8 * esc, esc);
      }
    }
    ctx.fillStyle = 'rgba(0,0,0,.6)';
    ctx.fillRect(r.x, r.y + r.h - 22 * esc, r.w, 22 * esc);
    f.T(est === 'travado' || est === 'chefe-oculto' ? '???' : ch.name, r.x + r.w / 2, r.y + r.h - 11 * esc, 14 * esc, est === 'travado' || est === 'chefe-oculto' ? '#9fa6c9' : '#fff', 'center');
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#0a0a14';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    if (est === 'novo') {
      // selo NOVO! (pisca de leve) até o jogador ver
      const a = 0.75 + 0.25 * Math.sin(this.ui.t / 8);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#ffd23f';
      ctx.fillRect(r.x + (r.w - 50 * esc) / 2, r.y + 26 * esc, 50 * esc, 17 * esc);
      ctx.restore();
      f.T('NOVO!', r.x + r.w / 2, r.y + 34.5 * esc, 12 * esc, '#1b0b00', 'center', { shadow: false });
    }
    this.marcadores(r, esc, aqui);
  }

  /** Os marcadores dos jogadores sobre a casa (moldura pulsante, etiqueta 1P/2P/CPU e o OK de quem já travou). Na casa de honra (faixa 256x44) a etiqueta é fixa e legível. */
  private marcadores(r: { x: number; y: number; w: number; h: number }, esc: number, aqui: readonly (0 | 1)[], honra = false): void {
    const { ctx, f } = this.ui.c;
    const tw = honra ? 32 : 34 * esc;
    const th = honra ? 18 : 20 * esc;
    const ts = honra ? 12 : 13 * esc;
    aqui.forEach((p, n) => {
      const pulse = this.lock[p] ? 1 : 0.6 + 0.4 * Math.sin(this.ui.t / 6);
      ctx.save();
      ctx.globalAlpha = pulse;
      ctx.lineWidth = 5;
      ctx.strokeStyle = P_COL[p];
      ctx.strokeRect(r.x - 3 - n * 5, r.y - 3 - n * 5, r.w + 6 + n * 10, r.h + 6 + n * 10);
      ctx.restore();
      ctx.fillStyle = P_COL[p];
      ctx.fillRect(r.x + (p ? r.w - tw : 0), r.y, tw, th);
      f.T(this.versus ? (p ? '2P' : '1P') : p ? 'CPU' : '1P', r.x + (p ? r.w - tw / 2 : tw / 2), r.y + th / 2, ts, '#fff', 'center', { shadow: false });
      if (this.lock[p]) {
        ctx.fillStyle = 'rgba(0,0,0,.35)';
        ctx.fillRect(r.x, r.y, r.w, honra ? r.h : r.h - 22 * esc);
        f.A('OK', r.x + r.w / 2, honra ? r.y + r.h / 2 : r.y + 50 * esc, honra ? 24 : 30 * esc, P_COL[p], '#000');
      }
    });
  }

  /**
   * A CASA DE HONRA do chefão: faixa de 256x44 embaixo da 3x3, moldura em ouro (`#d9b25a`). Oculto = "???" (sem silhueta, não confirma);
   * liberado = o rosto dele num quadrado de 44 px, o nome e o título. Os marcadores dos jogadores são os mesmos das outras casas.
   */
  private casaDeHonra(i: number, est: EstadoCasa, r: { x: number; y: number; w: number; h: number }): void {
    const { ctx, f } = this.ui.c;
    const rc = this.ui.m.elenco[this.idEm(i)];
    const ch = rc.ch;
    const aqui = ([0, 1] as const).filter((p) => (this.versus || (p === 0 ? true : this.step === 2)) && this.cur[p] === i);
    const g = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    g.addColorStop(0, '#2a1236');
    g.addColorStop(1, '#0a0614');
    ctx.fillStyle = g;
    ctx.fillRect(r.x, r.y, r.w, r.h);
    if (est === 'chefe-oculto') {
      f.A('???', r.x + r.w / 2, r.y + r.h / 2 - 2, 28, '#8a7a5a', '#0a0a14');
      f.T('O ANFITRIÃO', r.x + r.w - 8, r.y + r.h - 9, 11, '#d9b25a', 'right', { shadow: false });
    } else {
      desenharRetrato(ctx, rc.arte.retrato(ch.head), r.x, r.y, r.h, false, ['#4a1a3a', '#12040c']);
      f.A(ch.name, r.x + r.h + 12, r.y + 15, 20, '#fff', '#000', 'left');
      f.T(ch.title.toUpperCase(), r.x + r.h + 12, r.y + 34, 12, '#d9b25a', 'left', { shadow: false });
      f.T('CHEFÃO', r.x + r.w - 8, r.y + 34, 12, '#d9b25a', 'right', { shadow: false });
      if (est === 'novo') {
        ctx.fillStyle = '#ffd23f';
        ctx.fillRect(r.x + r.w - 56, r.y + 4, 50, 17);
        f.T('NOVO!', r.x + r.w - 31, r.y + 12.5, 12, '#1b0b00', 'center', { shadow: false });
      }
    }
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#d9b25a';
    ctx.strokeRect(r.x, r.y, r.w, r.h);
    this.marcadores(r, 1, aqui, true);
  }

  draw(): void {
    const { ctx, f, regras } = this.ui.c;
    const m = this.ui.m;
    const W = LARGURA;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, this.ui.t, 0.5);
    this.ui.desenharPetalas();
    f.A(this.title(), W / 2, 42, 38, ['#ffffff', '#ffc27a'], '#1a0a00');
    this.lado(0, 160, 1);
    if (this.versus || this.step === 2) this.lado(1, W - 160, -1);
    else {
      // painel de rivais (modo solo, etapa 1)
      const px = W - 20 - 284;
      f.A(this.mode === 'arcade' ? 'RIVAIS' : this.mode === 'training' ? 'ALVO' : 'ADVERSÁRIO', px + 142, 72, 22, P_COL[1], '#000', 'center');
      f.panel(px, 100, 284, 250, { stroke: P_COL[1] });
      const msg =
        this.mode === 'arcade'
          ? dicaArcadeSelecao(regras)
          : this.mode === 'training'
            ? 'Depois você escolhe quem será o alvo do treino.'
            : 'Depois você escolhe o adversário e a dificuldade.';
      f.wrap(msg, px + 16, 126, 252, 20, 15, '#e8ecff');
      // retratos dos outros lutadores: só cabem os 3 de hoje; com elenco maior o painel fica só com o texto
      const outros = this.grade.filter((_, i) => i !== this.cur[0]);
      if (outros.length <= 3) {
        outros.forEach((id, i) => {
          const r = m.elenco[id];
          desenharRetrato(ctx, r.arte.retrato(r.ch.head), px + 18 + i * 88, 210, 80, true, ['#4a2a5a', '#160c24']);
          f.T(r.ch.name, px + 58 + i * 88, 304, 13, '#fff', 'center');
        });
      }
    }
    // grade central
    for (let i = 0; i < this.n; i++) this.casa(i);
    const act = this.versus ? 0 : (this.active() ?? 0);
    const idc = this.idEm(this.cur[act]);
    // com a casa de honra o painel desce 50 px (e encolhe 8): y 408 a 500, acima da faixa de dica (510)
    const py = this.honra ? 408 : 358;
    const ph = this.honra ? 92 : 100;
    const nomeY = py + (this.honra ? 17 : 18);
    const textoY = py + (this.honra ? 38 : 44);
    const linha = this.honra ? 15 : 17;
    f.panel(352, py, 256, ph, { r: 8 });
    if (podeEscolher(this.estado(idc))) {
      const hc = m.elenco[idc].ch;
      f.A(hc.name, 480, nomeY, 22, '#fff', '#000');
      f.wrap(hc.desc, 366, textoY, 228, linha, 13, '#e8ecff');
    } else {
      f.A('???', 480, nomeY, 22, '#9fa6c9', '#000');
      f.wrap(this.estado(idc) === 'chefe-oculto' ? 'Aparece no fim do ARCADE.' : 'Zere o ARCADE para liberar.', 366, textoY, 228, linha, 13, '#e8ecff');
    }
    f.hint(this.versus ? 'P1: ← ↑ ↓ → e Z      P2: WASD e J      X / K desfazer     ESC menu' : '← ↑ ↓ → mover     ENTER / Z confirmar     ESC / X voltar');
  }
}
