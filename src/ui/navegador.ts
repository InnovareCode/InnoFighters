import { ALTURA, LARGURA } from '../core/constantes';
import { clamp } from '../core/math';
import { CampoDePetalas, desenharPetalas } from '../render/efeitos';
import { usarEspacoLogico } from '../render/tela';
import { criarCenas } from './cenas';
import type { Contexto, Mundo } from './contexto';
import { NAV, type CampanhaArcade, type Cena, type NomeCena } from './tipos';

/** Cenas em que toca a música de menu ao entrar. */
const CENAS_COM_MUSICA_DE_MENU: readonly NomeCena[] = ['title', 'menu', 'select', 'diff', 'how', 'options'];

/**
 * Gerente de cenas e transições (o objeto `UI` do protótipo): fade entre telas, tecla -> ação de
 * menu, mouse/toque com as travas do protótipo, petalas dos menus e a campanha ARCADE em curso.
 */
export class Navegador {
  scene: Cena | null = null;
  name: NomeCena | '' = '';
  t = 0;
  fade = 1;
  fadeDir: -1 | 0 | 1 = -1;
  fadeTo: NomeCena | null = null;
  fadeArgs: unknown = {};
  /** A arte terminou de carregar? */
  ready = false;
  /** Progresso do carregamento (0..1). */
  loadProg = 0;
  /** Mensagem se o carregamento falhou (a tela de abertura mostra). */
  erroCarga: string | null = null;
  run: CampanhaArcade | null = null;

  readonly petalas: CampoDePetalas;
  readonly cenas: Record<NomeCena, Cena>;
  private mundo: Mundo | null = null;

  constructor(readonly c: Contexto) {
    this.petalas = new CampoDePetalas(c.rngVisual, 'menu');
    this.cenas = criarCenas(this);
  }

  /** Recursos que só existem depois do carregamento; falha clara se alguém pedir antes da hora. */
  get m(): Mundo {
    if (!this.mundo) throw new Error('Navegador: a arte ainda nao carregou');
    return this.mundo;
  }

  /** Chamado quando a arte carregou: libera a abertura (o boot passa a pedir "clique ou tecla"). */
  pronto(mundo: Mundo): void {
    this.mundo = mundo;
    this.ready = true;
  }

  /** Troca de cena com fade (ignorado se já há uma troca em curso). */
  go(name: NomeCena, args?: unknown): void {
    if (this.fadeTo) return;
    this.fadeTo = name;
    this.fadeArgs = args ?? {};
    this.fadeDir = 1;
  }

  /** Troca imediata. */
  set(name: NomeCena, args?: unknown): void {
    this.name = name;
    this.scene = this.cenas[name];
    if (CENAS_COM_MUSICA_DE_MENU.includes(name) && this.c.audio.ctx) this.c.audio.startMusic('menu');
    this.t = 0;
    (this.scene.enter as ((a: unknown) => void) | undefined)?.call(this.scene, args ?? {});
  }

  /** Um tick de 1/60 s. */
  update(): void {
    this.t++;
    this.petalas.avancar(this.t);
    if (this.fadeDir === 1) {
      this.fade += 0.12;
      if (this.fade >= 1) {
        this.fade = 1;
        if (this.fadeTo) this.set(this.fadeTo, this.fadeArgs);
        this.fadeDir = -1;
        this.fadeTo = null;
      }
    } else if (this.fadeDir === -1) {
      this.fade -= 0.08;
      if (this.fade <= 0) {
        this.fade = 0;
        this.fadeDir = 0;
      }
    }
    this.scene?.update?.();
  }

  draw(): void {
    const { ctx } = this.c;
    usarEspacoLogico(ctx);
    this.scene?.draw();
    if (this.fade > 0) {
      usarEspacoLogico(ctx);
      ctx.fillStyle = `rgba(6,2,14,${clamp(this.fade, 0, 1)})`;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }
  }

  /** Descida de tecla: a cena trata (key) ou vira ação de menu (nav). */
  key(k: string): void {
    if (this.fadeTo || !this.scene) return;
    if (this.scene.key?.(k)) return;
    const a = NAV[k];
    if (a && this.scene.nav) this.scene.nav(a);
  }

  /** Mouse sobre o canvas (coordenadas lógicas). */
  hover(x: number, y: number): void {
    if (this.scene?.hover && !this.fadeTo) this.scene.hover(x, y);
  }

  /** Clique/toque no canvas: não age na luta em andamento nem durante a troca de cena. */
  click(x: number, y: number): void {
    if (this.fadeTo || !this.scene) return;
    if (this.name === 'fight' && !this.scene.paused) return;
    this.scene.click?.(x, y);
  }

  /** Toque no canvas: passa o ponto (hover) antes do clique. */
  toque(x: number, y: number): void {
    if (this.fadeTo || !this.scene) return;
    this.scene.hover?.(x, y);
    this.click(x, y);
  }

  /** Janela sem foco / aba oculta. */
  blur(): void {
    this.scene?.blur?.();
  }

  /** Pétalas dos menus (desenhadas pelas cenas de menu). */
  desenharPetalas(): void {
    desenharPetalas(this.c.ctx, this.petalas.lista);
  }

  /** Inicia o áudio no primeiro gesto do usuário (startAudio do protótipo). */
  iniciarAudio(): void {
    const { audio, persist } = this.c;
    audio.init();
    audio.resume();
    audio.setMusicVol(persist.settings.music);
    audio.setSfxVol(persist.settings.sfx);
    audio.startMusic('menu');
  }
}
