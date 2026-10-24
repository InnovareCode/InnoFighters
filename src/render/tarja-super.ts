import type { Elenco } from '../assets/elenco';
import { LARGURA, SH } from '../core/constantes';
import type { IndiceLutador, LeituraLuta } from '../core/contratos';
import { criarRng, type Rng } from '../core/rng';
import { aplicarCamera } from './camera';
import { desenharFaixaComRosto, rostoDoGolpe } from './faixa-rosto';
import { Y_TOPO_FAIXA_RITMO } from './faixa-ritmo';
import { paletaFaixaDe } from './paleta-lutador';
import type { Ctx } from './tela';

/*
 * TARJA DO SUPER (docs/spec-redesenho-jogabilidade.md §3.2/§3.4, R-9, flag `Regras.ritmo.super`): ao contrário da `FaixaRitmo`
 * (especial comum, não congela), esta CONGELA a cena por 30 ticks fixos (0,5 s): `fight.ts` para de chamar `game.update`
 * enquanto ela roda, como a `Cinematica` fazia para os especiais comuns antes do R-2.
 *
 * Direção de arte (decisão do dono, 24/10/2026, vídeo-referência X-Men vs Street Fighter): a MESMA faixa com rosto da
 * `FaixaRitmo` (`desenharFaixaComRosto`, `faixa-rosto.ts`) + linhas de velocidade BRANCAS irradiando do corpo do atacante, no
 * MUNDO (não na faixa) — exatamente como o vídeo mostra no instante da ativação. Sem pular (30 ticks já é o orçamento curto do
 * §5.1 G3; nada na spec pede um atalho aqui, ao contrário do FILME que vem depois).
 */

export const DURACAO_TARJA_SUPER = 30;
/** A faixa GRANDE (170 px, y 86-256): pode cobrir as cabeças porque a cena está congelada. O especial comum usa a de 105 px (`ALTURA_FAIXA_RITMO`). */
export const ALTURA_TARJA_SUPER = 170;
const ENTRA = 6;
const SAI = 6;

export interface EventoTarjaSuper {
  readonly lutador: IndiceLutador;
  /** Chave de `ch.moves` do golpe de origem (a identidade visual/cor vem dele). */
  readonly golpe: string;
  readonly ficha: string | null;
  /** O nome do SUPER (ex. TENRAI-KEN) — NÃO o nome do especial de origem. */
  readonly nome: string;
}

interface Ativa {
  readonly ev: EventoTarjaSuper;
  readonly sem: number;
  t: number;
}

export class TarjaDoSuper {
  private atual: Ativa | null = null;
  private readonly rng: Rng;

  constructor(op: { readonly rng?: Rng } = {}) {
    this.rng = op.rng ?? criarRng(1);
  }

  get ativa(): boolean {
    return this.atual !== null;
  }

  get duracao(): number {
    return this.atual ? DURACAO_TARJA_SUPER : 0;
  }

  /** Estado de leitura (teste e contador de ritmo). */
  get estado(): { readonly lutador: IndiceLutador; readonly golpe: string; readonly nome: string; readonly t: number } | null {
    const a = this.atual;
    return a ? { lutador: a.ev.lutador, golpe: a.ev.golpe, nome: a.ev.nome, t: a.t } : null;
  }

  /** Começa a tarja (um super por vez: o motor só emite um por tick). */
  iniciar(ev: EventoTarjaSuper): void {
    this.atual = { ev, t: 0, sem: Math.floor(this.rng.proximo() * 4294967296) };
  }

  /** Um tick (a luta NÃO anda: quem chama não chama `game.update` enquanto `ativa`). */
  avancar(): void {
    const a = this.atual;
    if (!a) return;
    a.t++;
    if (a.t >= DURACAO_TARJA_SUPER) this.atual = null;
  }

  zerarLuta(): void {
    this.atual = null;
  }

  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
    const a = this.atual;
    if (!a) return;
    const f = luta.fighters[a.ev.lutador];

    const entraK = Math.min(1, a.t / ENTRA);
    const saiIni = DURACAO_TARJA_SUPER - SAI;
    const saiK = a.t <= saiIni ? 0 : Math.min(1, (a.t - saiIni) / SAI);
    const intensidade = entraK * (1 - saiK);

    this.desenharLinhasDeVelocidade(ctx, luta, f, intensidade, a.sem);

    const deslocaX = -Math.max(1 - entraK, saiK) * LARGURA;
    desenharFaixaComRosto({
      ctx,
      x: 0,
      y: Y_TOPO_FAIXA_RITMO,
      w: LARGURA,
      h: ALTURA_TARJA_SUPER,
      alfa: 1,
      deslocaX,
      paleta: paletaFaixaDe(f.id, a.ev.ficha),
      nome: a.ev.nome,
      rosto: rostoDoGolpe(elenco, f.id, a.ev.ficha, a.ev.golpe),
    });
  }

  /** Linhas brancas irradiando do atacante, no MUNDO (câmera aplicada), como o vídeo-referência. */
  private desenharLinhasDeVelocidade(ctx: Ctx, luta: LeituraLuta, f: LeituraLuta['fighters'][number], intensidade: number, sem: number): void {
    if (intensidade <= 0) return;
    ctx.save();
    aplicarCamera(ctx, luta.cam, 0, this.rng);
    const cx = f.x;
    const cy = f.y - SH * 0.55;
    const N = 16;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = '#ffffff';
    ctx.lineCap = 'round';
    for (let i = 0; i < N; i++) {
      const ang = (i / N) * Math.PI * 2 + (sem % 1000) * 0.0001;
      const r0 = 18;
      const r1 = r0 + 70 + 220 * intensidade;
      ctx.globalAlpha = 0.55 * intensidade * (0.6 + 0.4 * (i % 2));
      ctx.lineWidth = 1.5 + 2 * intensidade;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(ang) * r0, cy + Math.sin(ang) * r0);
      ctx.lineTo(cx + Math.cos(ang) * r1, cy + Math.sin(ang) * r1);
      ctx.stroke();
    }
    ctx.restore();
  }
}
