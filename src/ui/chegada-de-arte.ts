/** Ticks (0,2 s) da rampa de opacidade de um lutador cuja arte chegou DEPOIS de a cena abrir. */
export const TICKS_DA_CHEGADA = 12;

const JA_PRONTA = Number.NEGATIVE_INFINITY;
const ESPERANDO = Number.NaN;

/**
 * Chegada suave da arte (docs/spec-residencia-de-memoria.md §3.4): um lutador cuja arte chega com a cena já aberta (a vitrine voltando em segundo plano depois de uma luta)
 * não aparece de estalo: sobe de 0 a 1 em `TICKS_DA_CHEGADA` ticks, a partir do 1º tick em que ficou pronto. Quem já estava pronto quando a cena o desenhou pela 1ª vez fica em 1
 * (o desenho é IDÊNTICO ao de antes: nenhum `globalAlpha` é tocado). Sem RNG e sem relógio de parede: depende só do tick `t` da cena e de a arte estar pronta. Uma instância por
 * cena; `reiniciar()` na entrada dela.
 */
export class ChegadaDeArte {
  /** id -> tick em que ficou pronto (rampa), `JA_PRONTA` (sempre 1) ou `ESPERANDO` (NaN: a arte ainda não chegou). */
  private readonly estado = new Map<string, number>();

  reiniciar(): void {
    this.estado.clear();
  }

  /** A opacidade (0..1) do lutador `id` neste tick `t`. `pronta` = a arte dele está na memória agora. */
  alfa(id: string, pronta: boolean, t: number): number {
    if (!pronta) {
      this.estado.set(id, ESPERANDO);
      return 0;
    }
    const e = this.estado.get(id);
    if (e === undefined) {
      this.estado.set(id, JA_PRONTA);
      return 1;
    }
    if (e === JA_PRONTA) return 1;
    if (Number.isNaN(e)) {
      this.estado.set(id, t);
      return 0;
    }
    if (t < e) {
      // o tempo andou para trás (a cena redesenhada num tick anterior, como o trailer faz com o título): não há o que suavizar
      this.estado.set(id, JA_PRONTA);
      return 1;
    }
    return Math.min(1, (t - e) / TICKS_DA_CHEGADA);
  }
}
