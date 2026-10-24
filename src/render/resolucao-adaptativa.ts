/*
 * GOVERNADOR DE RESOLUÇÃO (docs/desempenho-android-2026-10-24.md §8.2 D1): decide, pelo que o aparelho REALMENTE entrega, em qual degrau de
 * `tela.ts` (`DEGRAUS_DE_TOQUE`: 2 -> 1,5 -> 1) o canvas principal deve desenhar. Puro: só recebe o intervalo entre quadros e o custo do
 * callback de cada quadro e devolve a troca (ou nada); quem aplica é `main.ts` (`trocarDegrau`), no começo do callback, sem piscar.
 *
 * Regras (índice 0 = mais nítido; descer = índice maior):
 *  - Janela de `JANELA` quadros. Quadros com intervalo > `IGNORAR_ACIMA_DE` (aba em segundo plano, troca de cena carregando arte, GC longo) NÃO
 *    contam: não é o desenho que está lento.
 *  - DESCE um degrau se o p95 do intervalo passar de `LIMITE_DE_DESCIDA` (20 ms) em `JANELAS_PARA_DESCER` janelas SEGUIDAS (~3 s a 30 fps).
 *  - SOBE um degrau só com folga de verdade: p95 do intervalo <= `LIMITE_DE_SUBIDA` E p95 do trabalho <= `TRABALHO_MAXIMO_PARA_SUBIR`, por
 *    `JANELAS_PARA_SUBIR` janelas seguidas (~10 s) E fora do bloqueio de quem já desceu dali.
 *  - DESCER TEM QUE ADIANTAR: depois de descer, a 1ª janela inteira é comparada com a que mandou descer. Se o p95 não caiu `GANHO_MINIMO` (10%) e ainda
 *    passa do limite, o gargalo NÃO é pixel (é a thread principal: lógica, chamadas de desenho, GC): resolução menor só borra a imagem sem dar fluidez. Volta
 *    ao degrau anterior (motivo 'ineficaz') e fica `BLOQUEIO_INEFICAZ_S` sem tentar descer de novo.
 *  - HISTERESE contra piscar: toda descida bloqueia a subida PARA AQUELE degrau por `BLOQUEIO_BASE_S` segundos, dobrando a cada reincidência
 *    (até `BLOQUEIO_MAXIMO_S`); depois de qualquer troca os primeiros `QUADROS_DE_ASSENTO` quadros (recriar o canvas, reaquecer a GPU) não contam.
 */
export const JANELA = 90;
export const IGNORAR_ACIMA_DE = 100;
export const LIMITE_DE_DESCIDA = 20;
export const JANELAS_PARA_DESCER = 2;
export const LIMITE_DE_SUBIDA = 17.5;
export const TRABALHO_MAXIMO_PARA_SUBIR = 5;
export const JANELAS_PARA_SUBIR = 6;
export const BLOQUEIO_BASE_S = 120;
export const BLOQUEIO_MAXIMO_S = 960;
export const QUADROS_DE_ASSENTO = 45;
export const GANHO_MINIMO = 0.1;
export const BLOQUEIO_INEFICAZ_S = 600;

export interface Troca {
  readonly de: number;
  readonly para: number;
  readonly motivo: 'lento' | 'folga' | 'ineficaz';
}

function percentil(v: readonly number[], p: number): number {
  if (v.length === 0) return 0;
  const s = [...v].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.max(0, Math.ceil(p * s.length) - 1))] as number;
}

export class GovernadorDeResolucao {
  private intervalos: number[] = [];
  private trabalhos: number[] = [];
  private lentas = 0;
  private folgadas = 0;
  private assentando = QUADROS_DE_ASSENTO;
  /** Tempo acumulado (s) dos quadros contados, para os bloqueios. */
  private relogio = 0;
  /** degrau -> instante (relogio) até o qual NÃO se sobe para ele. */
  private bloqueadoAte = new Map<number, number>();
  private descidasDe = new Map<number, number>();
  /** p95 da janela que mandou descer; > 0 = a 1ª janela depois da descida ainda precisa provar que adiantou. */
  private p95AntesDaDescida = 0;
  /** Até este instante (relogio) não se desce: a última descida não adiantou. */
  private semDescerAte = 0;

  constructor(
    private nivel: number,
    private readonly ultimo: number,
  ) {}

  get degrau(): number {
    return this.nivel;
  }

  /** Um quadro: `intervalo` (ms desde o anterior) e `trabalho` (ms do callback). Devolve a troca a aplicar AGORA, ou null. */
  registrar(intervalo: number, trabalho: number): Troca | null {
    if (!(intervalo > 0) || intervalo > IGNORAR_ACIMA_DE) return null;
    if (this.assentando > 0) {
      this.assentando--;
      return null;
    }
    this.relogio += intervalo / 1000;
    this.intervalos.push(intervalo);
    this.trabalhos.push(trabalho);
    if (this.intervalos.length < JANELA) return null;
    const pI = percentil(this.intervalos, 0.95);
    const pT = percentil(this.trabalhos, 0.95);
    this.intervalos = [];
    this.trabalhos = [];
    if (this.p95AntesDaDescida > 0) {
      const antes = this.p95AntesDaDescida;
      this.p95AntesDaDescida = 0;
      if (pI > LIMITE_DE_DESCIDA && pI > antes * (1 - GANHO_MINIMO)) {
        this.semDescerAte = this.relogio + BLOQUEIO_INEFICAZ_S;
        return this.trocar(this.nivel - 1, 'ineficaz');
      }
    }
    if (pI > LIMITE_DE_DESCIDA) {
      this.lentas++;
      this.folgadas = 0;
      if (this.lentas >= JANELAS_PARA_DESCER && this.nivel < this.ultimo && this.relogio >= this.semDescerAte) {
        this.p95AntesDaDescida = pI;
        return this.trocar(this.nivel + 1, 'lento');
      }
      return null;
    }
    this.lentas = 0;
    if (pI <= LIMITE_DE_SUBIDA && pT <= TRABALHO_MAXIMO_PARA_SUBIR && this.nivel > 0 && (this.bloqueadoAte.get(this.nivel - 1) ?? 0) <= this.relogio) {
      this.folgadas++;
      if (this.folgadas >= JANELAS_PARA_SUBIR) return this.trocar(this.nivel - 1, 'folga');
    } else this.folgadas = 0;
    return null;
  }

  private trocar(para: number, motivo: Troca['motivo']): Troca {
    const de = this.nivel;
    if (motivo === 'lento') {
      // quem desce do degrau `de` bloqueia a volta PARA `de`, cada vez por mais tempo
      const n = (this.descidasDe.get(de) ?? 0) + 1;
      this.descidasDe.set(de, n);
      this.bloqueadoAte.set(de, this.relogio + Math.min(BLOQUEIO_MAXIMO_S, BLOQUEIO_BASE_S * 2 ** (n - 1)));
    }
    this.nivel = para;
    this.lentas = 0;
    this.folgadas = 0;
    this.assentando = QUADROS_DE_ASSENTO;
    this.intervalos = [];
    this.trabalhos = [];
    if (motivo !== 'lento') this.p95AntesDaDescida = 0;
    return { de, para, motivo };
  }
}
