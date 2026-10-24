import { ALTURA, LARGURA } from '../core/constantes';
import { clamp } from '../core/math';
import { CampoDePetalas, desenharPetalas } from '../render/efeitos';
import { usarEspacoLogico } from '../render/tela';
import { criarCenas } from './cenas';
import type { Contexto, Mundo } from './contexto';
import { arteDaCena, type ArteDaCena } from './residencia';
import { NAV, type CampanhaArcade, type Cena, type NomeCena } from './tipos';

/** Cenas em que toca a música de menu ao entrar. */
const CENAS_COM_MUSICA_DE_MENU: readonly NomeCena[] = ['title', 'menu', 'select', 'diff', 'how', 'options'];

/** Ticks (0,75 s) que a troca de cena segura no preto esperando a arte essencial do destino (política `'por-peso'`). Passado isso, entra mesmo assim. Spec da residência §2.6. */
export const TETO_DO_PRETO = 45;

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
  /**
   * Fluidez do desenho da luta (V2-2): interpolação entre ticks, a mola, o tremor do rival e a tecla H. Desligada por padrão: o laço de tempo real do
   * `main.ts` liga; `?manual=1` (oráculo de pixel, e2e) deixa desligada, e `?manual=1&fluidez=1` (só DEV) liga para os testes da própria fluidez.
   */
  fluidez = false;

  readonly petalas: CampoDePetalas;
  readonly cenas: Record<NomeCena, Cena>;
  private mundo: Mundo | null = null;
  /** O que o destino da troca em curso precisa (só na política `'por-peso'`; null = nada a esperar). */
  private destino: ArteDaCena | null = null;
  /** Ticks que a troca em curso já ficou presa no preto esperando a arte. */
  private esperaNoPreto = 0;

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
    // o pedaço do trailer (diretor, roteiro, render, música) baixa agora, enquanto o boot espera o gesto; se o gesto vier antes, o boot vai para a abertura de hoje
    (this.cenas.trailer as { precarregar?: () => void }).precarregar?.();
  }

  /**
   * Há uma troca de cena em curso esperando a arte essencial do destino? (Para os e2e esperarem em vez de contar ticks.) Sempre falso na política `'fixa'`, em que a
   * troca nunca espera.
   */
  get esperandoArte(): boolean {
    return this.fadeTo !== null && this.destino !== null && this.mundo !== null && !this.mundo.arte.estaPronto(this.destino.essencial);
  }

  /** Troca de cena com fade (ignorado se já há uma troca em curso). */
  go(name: NomeCena, args?: unknown): void {
    if (this.fadeTo) return;
    this.fadeTo = name;
    this.fadeArgs = args ?? {};
    this.fadeDir = 1;
    this.prepararDestino(name, this.fadeArgs);
  }

  /**
   * Política `'por-peso'`: ao sair da luta a FILME já sai (antes de carregar o destino, para o pico não somar) e, se o destino não é exclusivo, o essencial dele começa a
   * carregar JÁ, em paralelo com o fade. A VS e a luta carregam pelo `EsperaDeArte`, depois de soltar (despejo antes de decodificar).
   */
  private prepararDestino(name: NomeCena, args: unknown): void {
    this.destino = null;
    this.esperaNoPreto = 0;
    const mundo = this.mundo;
    if (!mundo || mundo.arte.politica !== 'por-peso') return;
    if (this.name === 'fight') mundo.arte.soltarFilme();
    const alvo = arteDaCena(name, args, mundo);
    if (alvo.exclusiva) return;
    this.destino = alvo;
    mundo.arte.garantir(alvo.essencial).catch((e: unknown) => console.error(e));
  }

  /**
   * Aplica a tabela da cena ao gerenciador ANTES do `enter`. `'fixa'`: só a VS e a luta marcam a dupla em uso (o `usar` de sempre). `'por-peso'`: a cena exclusiva solta tudo o
   * que está fora dela; as outras marcam o essencial em uso e trocam a fila de fundo pelo desejável (vazia, se a cena não tem: cancela a da cena anterior).
   */
  private aplicarArte(name: NomeCena, args: unknown): void {
    this.destino = null;
    this.esperaNoPreto = 0;
    const mundo = this.mundo;
    if (!mundo) return;
    const { arte } = mundo;
    const alvo = arteDaCena(name, args, mundo);
    if (arte.politica !== 'por-peso') {
      if (alvo.exclusiva) arte.entrarNaLuta(alvo.essencial);
      return;
    }
    if (alvo.exclusiva) arte.entrarNaLuta(alvo.essencial);
    else arte.usar(alvo.essencial);
    arte.preferir(alvo.desejavel ?? {});
  }

  /** Segura a troca no preto (a cena velha congela) até o essencial do destino chegar, no máximo `TETO_DO_PRETO` ticks. Com a arte pronta segura ZERO ticks. */
  private seguraNoPreto(): boolean {
    if (this.fadeDir !== 1 || this.fadeTo === null || this.destino === null || !this.mundo) return false;
    if (this.fade + 0.12 < 1) return false; // o fade ainda não chega ao preto neste tick
    if (this.esperaNoPreto >= TETO_DO_PRETO || this.mundo.arte.estaPronto(this.destino.essencial)) return false;
    this.esperaNoPreto++;
    this.fade = 1;
    return true;
  }

  /** Troca imediata. */
  set(name: NomeCena, args?: unknown): void {
    if (this.scene && this.name !== name) this.scene.exit?.();
    this.aplicarArte(name, args ?? {});
    this.name = name;
    this.scene = this.cenas[name];
    if (CENAS_COM_MUSICA_DE_MENU.includes(name) && this.c.audio.ctx) this.c.audio.startMusic('menu');
    this.t = 0;
    (this.scene.enter as ((a: unknown) => void) | undefined)?.call(this.scene, args ?? {});
  }

  /** Um tick de 1/60 s. */
  update(): void {
    if (this.seguraNoPreto()) return; // a cena velha congela no preto: sem t++, sem pétalas, sem scene.update
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

  /** `alfa` = acc / PASSO do laço (ver `main.ts`); sem ele (testes, `?manual=1`) a cena desenha o tick atual. */
  draw(alfa = 1): void {
    const { ctx } = this.c;
    usarEspacoLogico(ctx);
    this.scene?.draw(alfa);
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
    // a luta em andamento não age no clique, EXCETO enquanto a provocação roda (pular com o mouse ou o dedo)
    if (this.name === 'fight' && !this.scene.paused && !this.scene.aceitaToqueNaLuta?.()) return;
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
