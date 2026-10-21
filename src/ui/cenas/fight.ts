import { reagirAosEventos } from '../../audio/eventos';
import { tocarReceita, type SintetizadorLike } from '../../audio/receitas';
import { ALTURA, LARGURA, SH } from '../../core/constantes';
import { clamp } from '../../core/math';
import type { EventoLuta } from '../../core/contratos';
import { ESQUIVA_PADRAO } from '../../data/esquiva';
import type { DummyTreino, FonteEntradas } from '../../fight/game';
import { Cinematica, modoDaCinematica, type ModoCine } from '../../render/cinematica';
import { somDoAcerto } from '../../render/identidade-especiais';
import { chDaFicha } from '../../render/lutador';
import { SessaoEspecial } from '../../render/sessao-especial';
import { desenharMundo } from '../../render/mundo';
import { NOMES_ALVO_TREINO } from '../../render/hud';
import { cfgDaEtapa } from '../campanha';
import { EsperaDeArte } from '../espera-de-arte';
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
  /** Último estado aplicado ao botão ESQ do toque (barra abaixo do custo da esquiva); null = ainda não aplicado. */
  private botaoEsqSem: boolean | null = null;
  /** CINEMÁTICA do especial (apresentação pura: enquanto roda a cena não chama `game.update`, como a pausa) e a sessão dos acertos dele. */
  readonly cine: Cinematica;
  readonly sessao: SessaoEspecial;
  /** A música está a 50% por causa da cinemática? */
  private musicaBaixa = false;
  /** Ainda há tarja por aquecer no cache (a abertura da luta pinta uma por tick)? */
  private aquecendo = true;
  /** A arte da luta está na memória? (a luta só anda depois) */
  readonly espera = new EsperaDeArte();
  private m: MenuList;
  private am: MenuList;
  private cm: MenuList;

  constructor(private readonly ui: Navegador) {
    this.m = new MenuList([], ui.c.audio, ui.c.f);
    this.am = this.m;
    this.cm = this.m;
    const sintetizador = (): SintetizadorLike => ui.c.audio as unknown as SintetizadorLike;
    // os sons da cinemática são chamados por ela, NÃO por audio/eventos.ts: o som do evento `special` não muda (o lock-step compara sons)
    this.cine = new Cinematica({
      rng: ui.c.rngVisual,
      aoSom: (momento, id) => void tocarReceita(sintetizador(), momento === 'abertura' ? id.abertura : id.batida),
    });
    this.sessao = new SessaoEspecial({
      rng: ui.c.rngVisual,
      aoSom: (momento, id, dono, nivel) => {
        if (momento === 'defesa') {
          tocarReceita(sintetizador(), id.batida, { abafado: true });
          return;
        }
        const f = ui.m.game.fighters[dono];
        const base = somDoAcerto(f.id, f.ficha ?? null);
        // MASHI: 1, 2 ou 3 batidas de kalangu (a cada 70 ms) conforme o nível; o 3º ainda leva o baque grave
        for (let i = 0; i < Math.max(1, nivel); i++) {
          tocarReceita(sintetizador(), base.map((c) => ({ ...c, quando: (c.quando ?? 0) + i * 0.07, ...(c.k === 'T' && nivel > 0 ? { f0: c.f0 + i * 60 } : {}) })));
        }
        if (nivel >= 3) tocarReceita(sintetizador(), [{ k: 'T', tipo: 'sine', f0: 55, t: 0.5, vol: 0.8 }]);
      },
    });
  }

  /** O modo da cinemática agora (preferência + regras + movimento reduzido), ou null se não há cinemática. */
  private modoDaCine(): ModoCine | null {
    const reduz = typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
    return modoDaCinematica(this.ui.c.persist.settings.cinematica, this.ui.c.regras, reduz);
  }

  /** A música cai para 50% enquanto a cinemática roda (e a pausa a devolve). */
  private baixarMusica(baixar: boolean): void {
    const { audio, persist } = this.ui.c;
    if (baixar === this.musicaBaixa) return;
    this.musicaBaixa = baixar;
    audio.setMusicVol?.(persist.settings.music * (baixar ? 0.5 : 1));
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
    this.espera.iniciar(this.ui.m, a.cfg);
    this.prebuscarProximoRival(a);
    game.setup(a.cfg, persist.settings);
    if (a.cfg.keepScore && a.run) game.p1.score = a.run.score;
    efeitos.limpar();
    this.ultimoTick = game.tick;
    this.cine.zerarLuta();
    this.sessao.zerarLuta();
    this.aquecendo = true;
    this.musicaBaixa = true; // força a volta ao volume salvo (a cena anterior pode ter saído no meio de uma cinemática)
    this.baixarMusica(false);
    this.botaoEsqSem = null;
    this.atualizarBotaoEsquiva();
    audio.startMusic('fight');
    this.montarMenus();
  }

  /** ARCADE: baixa (sem decodificar) a arte do próximo rival enquanto esta luta acontece. */
  private prebuscarProximoRival(a: ArgsFight): void {
    const prox = a.run?.etapas[a.run.idx + 1]?.id;
    if (prox) this.ui.m.arte.prebuscar({ lutadores: [prox], cenarios: [this.ui.m.elenco[prox].ch.stage] });
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
    this.baixarMusica(false);
    this.ui.c.audio.uiPause();
  }

  private resume(): void {
    this.paused = false;
    if (this.cine.ativa) this.baixarMusica(true);
    this.ui.c.audio.uiPause();
  }

  /** Qualquer botão de ataque (ou o especial) de um humano pula a cinemática. As teclas seguradas continuam valendo depois. */
  private alguemPulou(): boolean {
    const { entrada } = this.ui.c;
    const { game } = this.ui.m;
    const ataque = (i: { lp: boolean; hp: boolean; lk: boolean; hk: boolean; sp: boolean } | undefined): boolean => !!i && (i.lp || i.hp || i.lk || i.hk || i.sp);
    // treino e solo (um humano contra a CPU) leem os dois mapas de teclado juntos, como a própria luta
    if (game.training || (game.p1.cpu === null && game.p2.cpu !== null)) return ataque(entrada.lerMesclado?.());
    return (game.p1.cpu === null && ataque(entrada.lerP1?.())) || (game.p2.cpu === null && ataque(entrada.lerP2?.()));
  }

  /** Um tick da cinemática: a luta NÃO anda (o motor não congela; a cena só não o chama). */
  private passoDaCinematica(): void {
    if (this.alguemPulou()) this.cine.pular();
    this.cine.avancar();
    if (!this.cine.ativa) this.baixarMusica(false);
  }

  /** Os eventos do tick: a sessão dos acertos e a abertura da cinemática (no início do golpe, ou no SUCESSO da PARADE/GARKUWA). */
  private reagirAoEspecial(ev: EventoLuta): void {
    const modo = this.modoDaCine();
    if (modo === null) return;
    const { game, elenco } = this.ui.m;
    this.sessao.reagir(ev, game, elenco);
    let abrir: Parameters<Cinematica['iniciar']>[0] | null = null;
    if (ev.tipo === 'special' && ev.momento !== 'sucesso' && ev.golpe !== undefined) {
      abrir = { lutador: ev.lutador, golpe: ev.golpe, ficha: ev.ficha ?? null, ...(ev.quadro ? { quadro: ev.quadro } : {}), ...(ev.entrada ? { entrada: ev.entrada } : {}) };
    } else if (ev.tipo === 'parry' && ev.golpe !== undefined) {
      abrir = { lutador: ev.defensor, golpe: ev.golpe, ficha: game.fighters[ev.defensor].ficha ?? null, ...(ev.quadro ? { quadro: ev.quadro } : {}), ...(ev.entrada ? { entrada: ev.entrada } : {}) };
    } else if (ev.tipo === 'clash' && ev.lutador !== undefined && ev.golpe !== undefined) {
      abrir = { lutador: ev.lutador, golpe: ev.golpe, ficha: game.fighters[ev.lutador].ficha ?? null, ...(ev.quadro ? { quadro: ev.quadro } : {}), ...(ev.entrada ? { entrada: ev.entrada } : {}) };
    }
    if (!abrir) return;
    this.cine.iniciar(abrir, modo);
    this.baixarMusica(true);
  }

  update(): void {
    if (this.paused || !this.espera.pronta) return;
    if (this.cine.ativa) {
      this.passoDaCinematica();
      return;
    }
    const { game, efeitos, petalasLuta } = this.ui.m;
    const { audio } = this.ui.c;
    // abertura da luta: pinta as tarjas dos especiais (uma por tick), fora do caminho do primeiro especial
    if (this.aquecendo && this.modoDaCine() !== null) this.aquecendo = this.cine.aquecer(game, this.ui.m.elenco);
    const t0 = game.t;
    game.update(this.fonte);
    petalasLuta.avancar(t0);
    // eventos -> som e efeitos visuais; depois os efeitos andam um tick (só se a luta andou: hitstop congela)
    reagirAosEventos(audio as unknown as { [m: string]: unknown }, game.events);
    for (const ev of game.events) {
      if (ev.tipo === 'round' && ev.fase === 'start') efeitos.limpar();
      efeitos.reagir(ev, (i) => game.fighters[i], (i) => this.corDoLutador(i));
      this.reagirAoEspecial(ev);
      // O chefe sai em 3 etapas (troca, danca, retomada): o flash e o "FASE 2!" são só da troca de barra, senão disparam 3 vezes.
      // danca/retomada ainda não têm efeito visual próprio (não há overlay de cena do chefe no HUD; por ora só o filtro).
      if (ev.tipo === 'fase-chefe' && ev.etapa === 'troca') this.aoFaseDoChefe(ev.lutador);
    }
    if (game.tick !== this.ultimoTick) {
      this.ultimoTick = game.tick;
      efeitos.avancar();
      this.sessao.avancar(game);
    }
    this.atualizarBotaoEsquiva();
    if (game.matchDone && !this.ended) {
      this.ended = true;
      this.finish();
    }
  }

  /** Cor principal (`fire[0]`) do lutador `i`, na ficha em que ele está (NILA em SARPA, BAATAR na fase 2). */
  private corDoLutador(i: 0 | 1): string {
    const f = this.ui.m.game.fighters[i];
    return chDaFicha(this.ui.m.elenco[f.id].ch, f.ficha).fire[0];
  }

  /** Botão ESQ do toque: esmaece (.sem) quando a barra do P1 está abaixo do custo da esquiva. Só mexe no DOM quando o estado muda. */
  private atualizarBotaoEsquiva(): void {
    if (typeof document === 'undefined') return;
    const sem = this.ui.m.game.p1.en < ESQUIVA_PADRAO.custo;
    if (sem === this.botaoEsqSem) return;
    this.botaoEsqSem = sem;
    document.getElementById('esq')?.classList.toggle('sem', sem);
  }

  /** O chefe passou para a 2ª barra: flash e faíscas nele e o aviso na tela (o som e o tremor são da luta). */
  private aoFaseDoChefe(indice: 0 | 1): void {
    const { game, efeitos } = this.ui.m;
    const f = game.fighters[indice];
    efeitos.faiscas(f.x, f.y - 120, '#ffffff', 40);
    efeitos.estrela(f.x, f.y - 120, '#e6c8ff', true);
    efeitos.textoFlutuante(f.x, f.y - SH, 'FASE 2!', '#ff9a3a', 28);
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
        const prox = run.etapas[run.idx];
        if (!prox) this.ui.go('ending', { run });
        else if (prox.chefe) this.ui.go('chefe', { cfg: cfgDaEtapa(run, true, this.ui.c.regras), run }); // aviso de chefe, depois o VS do chefão
        else this.ui.go('vs', { cfg: cfgDaEtapa(run, true, this.ui.c.regras), run });
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
    desenharMundo(ctx, game, m.rec, m.efeitos, m.petalasLuta, rngVisual, { tremor: persist.settings.shake, alvoTreino: game.dummy, esquiva: this.ui.c.regras.esquiva });
    if (!this.espera.pronta) {
      f.T(this.espera.falhou ? 'Não foi possível carregar os lutadores.' : `Carregando lutadores... ${this.espera.percentual}%`, W / 2, H / 2, 20, '#fff', 'center');
    }
    // a cinemática por cima do mundo; fora dela, a sessão dos acertos (números, "N HITS" e a vinheta de 20%)
    if (this.cine.ativa) this.cine.desenhar(ctx, game, m.elenco);
    else this.sessao.desenhar(ctx, game, m.elenco);
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
