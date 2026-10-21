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

  /** Registra a mudança de estado de uma tecla. Só gera borda se ela estava solta. */
  definir(tecla: string, abaixo: boolean): void {
    if (abaixo) {
      if (!this.segurada.has(tecla)) this.apertada.add(tecla);
      this.segurada.add(tecla);
    } else {
      this.segurada.delete(tecla);
    }
  }

  estaSegurada(tecla: string): boolean {
    return this.segurada.has(tecla);
  }

  /** Solta todas as teclas (perda de foco da janela). Não mexe nas bordas pendentes. */
  soltarTodas(): void {
    this.segurada.clear();
  }

  /** Descarta as bordas de descida; chamar depois de cada tick de lógica. */
  fimDoTick(): void {
    this.apertada.clear();
  }

  /** C2 — InputFrame de um jogador, idêntico ao `readInput()` do protótipo. */
  ler(mapa: MapaTeclas): InputFrame {
    return {
      left: this.segurada.has(mapa.left),
      right: this.segurada.has(mapa.right),
      up: this.segurada.has(mapa.up),
      down: this.segurada.has(mapa.down),
      lp: this.apertada.has(mapa.lp),
      hp: this.apertada.has(mapa.hp),
      lk: this.apertada.has(mapa.lk),
      hk: this.apertada.has(mapa.hk),
      sp: this.apertada.has(mapa.sp),
      // ESQUIVA: borda de descida do botao dedicado (so vale com ConfigPartida.esquiva ligada; o motor ignora antes de qualquer conta)
      esq: this.apertada.has(mapa.esq),
      // segurado (nível, não borda): o MASHI da S2 carrega enquanto o botão de especial estiver pressionado
      spSeg: this.segurada.has(mapa.sp),
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
