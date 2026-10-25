import type { EventoLuta, LeituraLuta } from '../core/contratos';

/*
 * FLASH DE DANO LIMITADO nas situações NOVAS (decisão do Atlas, 2026-10-25, coerência visual de jogo de luta). O flash do protótipo é a silhueta branca por cima do corpo
 * com alfa `flash / 8 * 0.5` (até 0,5) e é a identidade do golpe: o oráculo de pixel o cobra e NADA nele muda. Mas o contador `flash` só anda quando o motor anda, e o motor
 * fica parado ou renovando o 8 a cada acerto por dezenas de ticks em duas situações que o protótipo nunca teve:
 *  - o SUPER multi-acerto preso (`hit.super`, R-7b): o defensor leva N acertos seguidos e o flash volta a 8 em cada um;
 *  - o FILME do KO/super (`filme.motivo`, `ritmo.filmeRestrito`): o motor está parado pelos ticks do filme e o flash fica em 8.
 * O defensor ficava lavado de branco (parecia um fantasma) no trecho mais bonito. Aqui, só nele e só nessas duas situações, o alfa do flash vale no máximo `TETO_DO_FLASH_LIMITADO`
 * (0,15) e continua decaindo com o contador. Qualquer outro acerto segue com os 0,5 de sempre. Sem `ritmo.super`/`ritmo.filmeRestrito` não há `hit.super` nem `filme.motivo`, então nada muda.
 *
 * Quem apresenta (a cena da luta, o trailer) alimenta `reagir` com os eventos do tick e chama `avancar` uma vez por tick; o desenho lê `limitado`.
 */

/** Alfa máximo do flash do defensor de um super multi-acerto e do filme do KO. */
export const TETO_DO_FLASH_LIMITADO = 0.15;

/** O alfa da silhueta branca do flash de dano. Sem `limitado` é, bit a bit, o `flash / 8 * 0.5` do protótipo. */
export function alfaDoFlash(flash: number, limitado: boolean): number {
  const a = (flash / 8) * 0.5;
  return limitado && a > TETO_DO_FLASH_LIMITADO ? TETO_DO_FLASH_LIMITADO : a;
}

export class LimiteDoFlash {
  /** Por lutador: o flash dele está limitado agora. O mesmo objeto é reaproveitado (o desenho lê todo quadro, sem alocar). */
  readonly limitado: { 0: boolean; 1: boolean } = { 0: false, 1: false };

  /** Os eventos de UM tick do motor: o defensor de um acerto do super, ou de um filme com motivo, passa a ter o flash limitado. */
  reagir(eventos: readonly EventoLuta[]): void {
    for (const ev of eventos) {
      if (ev.tipo === 'hit' && ev.super === true) this.limitado[ev.defensor] = true;
      else if (ev.tipo === 'filme' && ev.motivo !== undefined) this.limitado[ev.defensor] = true;
    }
  }

  /** Um tick: o limite acaba quando o flash do lutador zera e nenhum filme está tocando (o próximo acerto comum volta aos 0,5 do protótipo). */
  avancar(luta: Pick<LeituraLuta, 'fighters'>, filmeAtivo: boolean): void {
    for (const i of [0, 1] as const) if (this.limitado[i] && !filmeAtivo && luta.fighters[i].flash <= 0) this.limitado[i] = false;
  }

  zerar(): void {
    this.limitado[0] = false;
    this.limitado[1] = false;
  }
}
