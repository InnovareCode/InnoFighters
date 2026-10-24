import type { InputFrame } from '../core/contratos';
import { CTRL_P1, CTRL_P2, type MapaTeclas } from './mapa';

/**
 * Estado das "teclas virtuais" (porte de `keys`/`pressed`/`setKey`/`readInput` do protótipo).
 * - `segurada`: a tecla está pressionada agora.
 * - `apertada`: a tecla foi apertada neste tick (borda de descida); limpa por `fimDoTick`.
 * Teclado, gamepad e toque escrevem aqui; a luta só lê InputFrame.
 */
export class TeclasVirtuais {
  private segurada = new Set<string>();
  private apertada = new Set<string>();
  /**
   * U2 (docs/auditoria-fidelidade-motor-2026-10-24.md): tecla apertada E solta dentro do MESMO tick. Os golpes sobrevivem a isso (a borda
   * `apertada` guarda o aperto), a direção NÃO (era nível: `segurada` já estava vazia quando o tick lia) — um toque de direção mais curto
   * que um quadro sumia. Aqui ela vale por 1 tick, como a borda do botão. Só a direção lê esta marca (`ler`); some no `fimDoTick`.
   */
  private retida = new Set<string>();
  /** U1: soltura ATRASADA (tecla -> ticks que ainda segura depois do pedido de soltar). Cancelada se a tecla é apertada de novo antes. */
  private soltaEm = new Map<string, number>();
  /** U4: teclas cujo NÍVEL (`spSeg`) ainda é escondido (tecla -> ticks restantes). A borda (`sp`) sai na hora; só o "segurando" demora. */
  private nivelEm = new Map<string, number>();

  /**
   * Registra a mudança de estado de uma tecla. Só gera borda se ela estava solta. `atrasoDeNivel` (U4, só ao APERTAR uma tecla que estava
   * solta): quantos ticks o `spSeg` dela fica falso — o toque curto/impreciso no ESPECIAL não vira carga do MASHI por acidente.
   */
  definir(tecla: string, abaixo: boolean, atrasoDeNivel = 0): void {
    this.soltaEm.delete(tecla); // apertar OU soltar de verdade cancela uma soltura atrasada pendente
    if (abaixo) {
      if (!this.segurada.has(tecla)) {
        this.apertada.add(tecla);
        if (atrasoDeNivel > 0) this.nivelEm.set(tecla, atrasoDeNivel);
      }
      this.segurada.add(tecla);
    } else {
      if (this.apertada.has(tecla)) this.retida.add(tecla);
      this.segurada.delete(tecla);
      this.nivelEm.delete(tecla);
    }
  }

  /**
   * Soltura FORÇADA (controle desconectado, `touchcancel`): a tecla some agora, sem o 1 tick da trava de direção (U2) — quem cancela não
   * "tocou". A borda de golpe pendente (`apertada`) continua como sempre.
   */
  cancelar(tecla: string): void {
    this.definir(tecla, false);
    this.retida.delete(tecla);
  }

  /**
   * U1: pede para soltar `tecla` daqui a `ticks` ticks (ela segue segurada até lá). Se for apertada de novo antes (`definir(tecla, true)`)
   * o pedido some e NADA acontece — nem solta nem nova borda: é o que impede a oscilação do joystick no limiar de virar "soltou e apertou"
   * (dash acidental). `ticks <= 0` solta na hora.
   */
  soltarDepois(tecla: string, ticks: number): void {
    if (!this.segurada.has(tecla)) return;
    if (ticks <= 0) this.definir(tecla, false);
    else this.soltaEm.set(tecla, ticks);
  }

  estaSegurada(tecla: string): boolean {
    return this.segurada.has(tecla);
  }

  /** Solta todas as teclas (perda de foco da janela). Não mexe nas bordas pendentes. */
  soltarTodas(): void {
    this.segurada.clear();
    this.retida.clear();
    this.soltaEm.clear();
    this.nivelEm.clear();
  }

  /** Descarta as bordas de descida e envelhece as soltas atrasadas e os níveis escondidos; chamar depois de cada tick de lógica. */
  fimDoTick(): void {
    this.apertada.clear();
    this.retida.clear();
    for (const [tecla, n] of this.soltaEm) {
      if (n <= 1) {
        this.soltaEm.delete(tecla);
        this.segurada.delete(tecla);
        this.nivelEm.delete(tecla);
      } else this.soltaEm.set(tecla, n - 1);
    }
    for (const [tecla, n] of this.nivelEm) {
      if (n <= 1) this.nivelEm.delete(tecla);
      else this.nivelEm.set(tecla, n - 1);
    }
  }

  /**
   * Um eixo (par de direções opostas): nível (`segurada`) OU tocada e solta dentro deste mesmo tick (`retida`, U2). Se as duas aparecem juntas
   * e só uma delas é a retida (virada rápida: tocou a direita, soltou, e já segura a esquerda), a retida perde — a mais recente é a segurada.
   * Duas seguradas ao mesmo tempo (teclado com as duas apertadas) continuam as duas, como sempre.
   */
  private eixo(a: string, b: string): [boolean, boolean] {
    let va = this.segurada.has(a) || this.retida.has(a);
    let vb = this.segurada.has(b) || this.retida.has(b);
    if (va && vb) {
      if (this.segurada.has(a) && !this.segurada.has(b)) vb = false;
      else if (this.segurada.has(b) && !this.segurada.has(a)) va = false;
    }
    return [va, vb];
  }

  /** C2 — InputFrame de um jogador, idêntico ao `readInput()` do protótipo. */
  ler(mapa: MapaTeclas): InputFrame {
    const [left, right] = this.eixo(mapa.left, mapa.right);
    const [up, down] = this.eixo(mapa.up, mapa.down);
    return {
      left,
      right,
      up,
      down,
      lp: this.apertada.has(mapa.lp),
      hp: this.apertada.has(mapa.hp),
      lk: this.apertada.has(mapa.lk),
      hk: this.apertada.has(mapa.hk),
      sp: this.apertada.has(mapa.sp),
      // ESQUIVA: borda de descida do botao dedicado (so vale com ConfigPartida.esquiva ligada; o motor ignora antes de qualquer conta)
      esq: this.apertada.has(mapa.esq),
      // segurado (nível, não borda): o MASHI da S2 carrega enquanto o botão de especial estiver pressionado
      spSeg: this.segurada.has(mapa.sp) && !this.nivelEm.has(mapa.sp),
    };
  }

  lerP1(): InputFrame {
    return this.ler(CTRL_P1);
  }

  lerP2(): InputFrame {
    return this.ler(CTRL_P2);
  }

  /** OR dos dois mapas (menus e modos de um jogador só): `readInputMerged()` do protótipo. */
  lerMesclado(): InputFrame {
    const a = this.lerP1();
    const b = this.lerP2();
    return {
      left: a.left || b.left,
      right: a.right || b.right,
      up: a.up || b.up,
      down: a.down || b.down,
      lp: a.lp || b.lp,
      hp: a.hp || b.hp,
      lk: a.lk || b.lk,
      hk: a.hk || b.hk,
      sp: a.sp || b.sp,
      esq: a.esq === true || b.esq === true,
      spSeg: a.spSeg === true || b.spSeg === true,
    };
  }
}

/** Tecla de uma letra vira minúscula; as demais (ArrowLeft, Escape...) ficam como vêm. */
export function normalizarTecla(chave: string): string {
  return chave.length === 1 ? chave.toLowerCase() : chave;
}
