import { reagirAosEventos } from '../../audio/eventos';
import { ALTURA, LARGURA } from '../../core/constantes';
import { clamp } from '../../core/math';
import type { DummyTreino, FonteEntradas } from '../../fight/game';
import { desenharMundo } from '../../render/mundo';
import { NOMES_ALVO_TREINO } from '../../render/hud';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import { desenharLinhasDeGolpes, P_COL } from '../personagens';
import { NAV, type ArgsFight, type Cena } from '../tipos';

type Vista = 'main' | 'moves' | 'audio' | 'confirm';
const ALVOS = Object.keys(NOMES_ALVO_TREINO) as DummyTreino[];

/** A luta e o menu de pausa (continuar, lista de golpes, áudio, treino, sair). */
export class CenaFight implements Cena {
  paused = false;
  private view: Vista = 'main';
  private ended = false;
  private a: ArgsFight | null = null;
  private ultimoTick = 0;
  private m: MenuList;
  private am: MenuList;
  private cm: MenuList;

  constructor(private readonly ui: Navegador) {
    this.m = new MenuList([], ui.c.audio, ui.c.f);
    this.am = this.m;
    this.cm = this.m;
  }

  private get fonte(): FonteEntradas {
    const { entrada } = this.ui.c;
    return { p1: (mesclado) => (mesclado ? entrada.lerMesclado() : entrada.lerP1()), p2: () => entrada.lerP2() };
  }

  enter(a: ArgsFight): void {
    const { game, efeitos } = this.ui.m;
    const { persist, audio } = this.ui.c;
    this.a = a;
    this.paused = false;
    this.view = 'main';
    this.ended = false;
    game.setup(a.cfg, persist.settings);
    if (a.cfg.keepScore && a.run) game.p1.score = a.run.score;
    efeitos.limpar();
    this.ultimoTick = game.tick;
    audio.startMusic('fight');
    this.montarMenus();
  }

  /** Zera projéteis, tremor e congelamento (clearFx do protótipo, sem as partículas que moram no render). */
  private limparEfeitos(): void {
    const { game, efeitos } = this.ui.m;
    game.projectiles = [];
    game.shake = 0;
    game.hitstop = 0;
    efeitos.limpar();
  }

  private montarMenus(): void {
    const { game } = this.ui.m;
    const { audio, f } = this.ui.c;
    const tr = game.training;
    const itens = [
      { label: 'CONTINUAR', onOk: () => this.resume() },
      { label: 'LISTA DE GOLPES', onOk: () => { this.view = 'moves'; } },
      { label: 'ÁUDIO', onOk: () => { this.view = 'audio'; this.am.sel = 0; } },
    ] as ConstructorParameters<typeof MenuList>[0];
    if (tr) {
      itens.push({
        label: 'ALVO DO TREINO',
        value: () => NOMES_ALVO_TREINO[game.dummy],
        onAdjust: (d) => {
          const i = (ALVOS.indexOf(game.dummy) + d + ALVOS.length) % ALVOS.length;
          game.trocarAlvoDoTreino(ALVOS[i] ?? 'stand');
        },
      });
      itens.push({
        label: 'REPOSICIONAR',
        onOk: () => {
          game.p1.reset(false);
          game.p2.reset(false);
          game.p1.hp = game.p1.maxHp;
          game.p2.hp = game.p2.maxHp;
          this.limparEfeitos();
          this.resume();
        },
      });
    }
    itens.push({
      label: tr ? 'TROCAR PERSONAGENS' : 'REINICIAR LUTA',
      onOk: () => {
        this.paused = false;
        if (tr) this.ui.go('select', { mode: 'training' });
        else this.ui.go(this.a?.run ? 'vs' : 'fight', this.a);
      },
    });
    itens.push({ label: 'MENU PRINCIPAL', onOk: () => { this.view = 'confirm'; this.cm.sel = 1; } });
    this.m = new MenuList(itens, audio, f);
    this.am = new MenuList(
      [
        { label: 'MÚSICA', slider: () => this.ui.c.persist.settings.music, onAdjust: (d) => this.vol('music', d), onSet: (v) => this.setVol('music', v) },
        { label: 'EFEITOS', slider: () => this.ui.c.persist.settings.sfx, onAdjust: (d) => this.vol('sfx', d), onSet: (v) => this.setVol('sfx', v) },
        { label: 'VOLTAR', onOk: () => { this.view = 'main'; } },
      ],
      audio,
      f,
    );
    this.cm = new MenuList(
      [
        { label: 'SIM, SAIR', onOk: () => { this.paused = false; audio.startMusic('menu'); this.ui.go('menu'); } },
        { label: 'NÃO, CONTINUAR', onOk: () => { this.view = 'main'; } },
      ],
      audio,
      f,
    );
  }

  private vol(k: 'music' | 'sfx', d: number): void {
    this.setVol(k, clamp(Math.round((this.ui.c.persist.settings[k] + d * 0.1) * 10) / 10, 0, 1));
  }

  private setVol(k: 'music' | 'sfx', v: number): void {
    const { persist, audio } = this.ui.c;
    persist.settings[k] = v;
    if (k === 'music') audio.setMusicVol(v);
    else audio.setSfxVol(v);
    persist.salvar();
  }

  pause(): void {
    if (this.paused || this.ui.m.game.matchDone) return;
    this.paused = true;
    this.view = 'main';
    this.m.sel = 0;
    this.ui.c.audio.uiPause();
  }

  private resume(): void {
    this.paused = false;
    this.ui.c.audio.uiPause();
  }

  update(): void {
    if (this.paused) return;
    const { game, efeitos, petalasLuta } = this.ui.m;
    const { audio } = this.ui.c;
    const t0 = game.t;
    game.update(this.fonte);
    petalasLuta.avancar(t0);
    // eventos -> som e efeitos visuais; depois os efeitos andam um tick (só se a luta andou: hitstop congela)
    reagirAosEventos(audio as unknown as { [m: string]: unknown }, game.events);
    for (const ev of game.events) {
      if (ev.tipo === 'round' && ev.fase === 'start') efeitos.limpar();
      efeitos.reagir(ev);
    }
    if (game.tick !== this.ultimoTick) {
      this.ultimoTick = game.tick;
      efeitos.avancar();
    }
    if (game.matchDone && !this.ended) {
      this.ended = true;
      this.finish();
    }
  }

  private finish(): void {
    const { game } = this.ui.m;
    const a = this.a;
    if (!a) return;
    const win = game.matchWinner;
    const run = a.run;
    if (a.cfg.mode === 'arcade' && run) {
      run.score = game.p1.score;
      if (win === 0) {
        run.idx++;
        const prox = run.order[run.idx];
        if (!prox) this.ui.go('ending', { run });
        else this.ui.go('vs', { cfg: { mode: 'arcade', c1: run.c1, c2: prox, cpu: run.diff, keepScore: true }, run });
      } else this.ui.go('continue', { run, a });
      return;
    }
    this.ui.go('result', {
      a,
      winner: win === 0 ? 1 : 2,
      st: { r1: game.p1.wins, r2: game.p2.wins, c1: game.p1.maxCombo, c2: game.p2.maxCombo, s1: game.p1.score, s2: game.p2.score },
    });
  }

  key(k: string): boolean {
    const { game } = this.ui.m;
    const { audio } = this.ui.c;
    if (this.paused) {
      const act = NAV[k];
      if (this.view === 'moves') {
        if (act === 'back' || act === 'ok' || k === 'p') {
          this.view = 'main';
          audio.uiBack();
        }
        return true;
      }
      const menu = this.menuFor() ?? this.m;
      if (k === 'p') {
        if (this.view === 'main') this.resume();
        else this.view = 'main';
        return true;
      }
      if (act === 'back') {
        if (this.view === 'main') this.resume();
        else {
          this.view = 'main';
          audio.uiBack();
        }
        return true;
      }
      if (act) menu.nav(act);
      return true;
    }
    if (k === 'Escape' || k === 'p') {
      this.pause();
      return true;
    }
    if (k === 'Enter' && game.phase === 'matchend' && game.t > 40) {
      game.matchDone = true;
      return true;
    }
    if (k === 'h') {
      game.debug = !game.debug;
      return true;
    }
    if (k === 'r' && game.training) {
      game.p1.reset(false);
      game.p2.reset(false);
      this.limparEfeitos();
      game.phase = 'fight';
      return true;
    }
    if (game.training && k === 't') {
      game.trocarAlvoDoTreino(ALVOS[(ALVOS.indexOf(game.dummy) + 1) % ALVOS.length] ?? 'stand');
      return true;
    }
    return false;
  }

  private menuFor(): MenuList | null {
    return this.view === 'audio' ? this.am : this.view === 'confirm' ? this.cm : this.view === 'main' ? this.m : null;
  }

  hover(x: number, y: number): void {
    if (this.paused) this.menuFor()?.hover(x, y);
  }

  click(x: number, y: number): void {
    if (!this.paused) return;
    const m = this.menuFor();
    if (m) m.click(x, y);
    else this.view = 'main';
  }

  blur(): void {
    this.pause();
  }

  draw(): void {
    const { ctx, f, persist, rngVisual } = this.ui.c;
    const m = this.ui.m;
    const { game } = m;
    const W = LARGURA;
    const H = ALTURA;
    desenharMundo(ctx, game, m.rec, m.efeitos, m.petalasLuta, rngVisual, { tremor: persist.settings.shake, alvoTreino: game.dummy });
    if (!this.paused) {
      if (game.training && game.phase === 'fight' && game.t < 400) {
        f.T('ESC pausa  •  R reposiciona  •  T troca o alvo', W / 2, H - 56, 13, '#cfd6f5', 'center', { alpha: 1 - game.t / 400 });
      }
      return;
    }
    ctx.fillStyle = 'rgba(6,3,16,.72)';
    ctx.fillRect(0, 0, W, H);
    if (this.view === 'moves') {
      ctx.fillStyle = 'rgba(6,3,16,.8)';
      ctx.fillRect(0, 0, W, H);
      this.desenharGolpes();
      return;
    }
    f.A('PAUSADO', W / 2, 62, 64, ['#ffffff', '#ffc27a'], '#1a0a00');
    if (this.view === 'main') {
      this.m.draw(W / 2 - 190, 110, 380, 50, { size: 24, align: 'center' });
      f.hint('↑ ↓ navegar     ENTER / Z selecionar     ESC continuar');
    } else if (this.view === 'audio') {
      f.A('ÁUDIO', W / 2, 130, 36, '#fff', '#000');
      this.am.draw(W / 2 - 230, 170, 460, 56, { size: 24 });
      f.hint('↑ ↓ escolher     ← → ajustar     ESC voltar');
    } else if (this.view === 'confirm') {
      f.A('SAIR PARA O MENU?', W / 2, 150, 40, '#fff', '#000');
      f.T('O progresso desta luta será perdido.', W / 2, 192, 17, '#ffd9a6', 'center');
      this.cm.draw(W / 2 - 170, 230, 340, 56, { size: 26, align: 'center' });
      f.hint('↑ ↓ escolher     ENTER confirmar     ESC voltar');
    }
  }

  private desenharGolpes(): void {
    const { f } = this.ui.c;
    const m = this.ui.m;
    const { game } = m;
    const W = LARGURA;
    f.A('LISTA DE GOLPES', W / 2, 40, 44, ['#ffffff', '#ffc27a'], '#1a0a00');
    if (game.mode === 'versus') {
      const colunas = [
        [game.p1, 1, 14],
        [game.p2, 2, W / 2 + 6],
      ] as const;
      for (const [p, s, x] of colunas) {
        f.A(p.ch.name + (s === 1 ? '  (P1)' : '  (P2)'), x + (W / 2 - 20) / 2, 80, 22, P_COL[s - 1] ?? '#fff', '#000');
        desenharLinhasDeGolpes(f, m, p.ch.id, x, 100, W / 2 - 20, s, 50);
      }
    } else {
      f.A(game.p1.ch.name, W / 2, 80, 24, P_COL[0], '#000');
      desenharLinhasDeGolpes(f, m, game.p1.ch.id, 60, 100, W - 120, 1, 50);
    }
    f.hint('COMBO: soco fraco → chute fraco → soco forte → chute forte → especial (aperte o próximo botão ao acertar)     ESC voltar');
  }
}
