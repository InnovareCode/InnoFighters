import { ALTURA, GROUND, MAX_EN } from '../core/constantes';
import type { EventoLuta, IndiceLutador, LeituraLuta } from '../core/contratos';
import type { Ctx } from './tela';

/*
 * O DRENO visível do ZENON (TRIBUTO e DECRETO; docs/spec-chefao-zenon.md §1 e docs/identidade-visual-especiais.md §3.10): quando um acerto ou um
 * bloqueio traz `dreno` (> 0) a energia que saiu do rival vira MOEDAS (losangos dourados de 10 x 6 px) que voam do ponto do golpe até a ponta da barra
 * SUPER de quem drenou. Só desenho, em coordenadas da TELA (a barra é do HUD, fora da câmera): o motor já moveu os números. No acerto saem de 1 a 6
 * moedas (uma por ~4 de energia); na defesa, metade. Zero RNG: a trajetória é função da idade e do índice.
 */

/** Ticks que cada moeda voa e a defasagem entre uma e a seguinte. */
export const VIDA_DA_MOEDA = 28;
export const DEFASAGEM_ENTRE_MOEDAS = 2;
export const MAX_MOEDAS_POR_EVENTO = 6;
export const OURO_DA_MOEDA = '#d9b25a';

/** Onde fica a ponta da barra SUPER (px lógicos), do lado 1 (esquerda, enche da esquerda) e do lado 2 (direita, enche da direita). */
export const BARRA_DE_ENERGIA = { esquerda: { x: 128, w: 240 }, direita: { x: 592, w: 240 }, y: ALTURA - 34 + 8 } as const;

type Moeda = { x0: number; y0: number; indice: IndiceLutador; idade: number; espera: number; lado: number };

/** Quantas moedas saem de um evento: uma por ~4 de energia (de 1 a 6); na defesa, metade (mínimo 1). */
export function moedasDoEvento(dreno: number, defesa: boolean): number {
  const n = Math.min(MAX_MOEDAS_POR_EVENTO, Math.max(1, Math.round(dreno / 4)));
  return defesa ? Math.max(1, Math.ceil(n / 2)) : n;
}

/** A ponta da barra de energia de `indice` agora (onde as moedas chegam). */
export function pontaDaBarra(indice: IndiceLutador, en: number): { x: number; y: number } {
  const f = Math.min(1, Math.max(0, en / MAX_EN));
  const b = indice === 0 ? BARRA_DE_ENERGIA.esquerda : BARRA_DE_ENERGIA.direita;
  return { x: indice === 0 ? b.x + b.w * f : b.x + b.w - b.w * f, y: BARRA_DE_ENERGIA.y };
}

export class MoedasDeDreno {
  private moedas: Moeda[] = [];

  /** Quantas moedas estão no ar. */
  get ativas(): number {
    return this.moedas.length;
  }

  zerar(): void {
    this.moedas = [];
  }

  /** Um evento da luta: se é `hit` ou `block` com `dreno`, solta as moedas do ponto do golpe (câmera de agora) para a barra de quem drenou. */
  reagir(ev: EventoLuta, luta: Pick<LeituraLuta, 'cam'>): void {
    if ((ev.tipo !== 'hit' && ev.tipo !== 'block') || !ev.dreno || ev.dreno <= 0) return;
    const z = luta.cam.z;
    const x0 = luta.cam.x + (ev.x - luta.cam.x) * z;
    const y0 = GROUND + (ev.y - GROUND) * z;
    const n = moedasDoEvento(ev.dreno, ev.tipo === 'block');
    for (let i = 0; i < n; i++) this.moedas.push({ x0, y0, indice: ev.atacante, idade: 0, espera: i * DEFASAGEM_ENTRE_MOEDAS, lado: i % 2 ? 1 : -1 });
  }

  /** Um tick da luta (só quando ela andou). */
  avancar(): void {
    for (const m of this.moedas) {
      if (m.espera > 0) m.espera--;
      else m.idade++;
    }
    this.moedas = this.moedas.filter((m) => m.idade < VIDA_DA_MOEDA);
  }

  /** Posição de uma moeda (curva quadrática: sobe um pouco, abre para o lado e cai na barra). Função pura da idade. */
  static posicao(m: { x0: number; y0: number; idade: number; lado: number }, destino: { x: number; y: number }): { x: number; y: number; alfa: number } {
    const t = Math.min(1, m.idade / VIDA_DA_MOEDA);
    const e = t * t * (3 - 2 * t);
    const cx = (m.x0 + destino.x) / 2 + m.lado * 60;
    const cy = Math.min(m.y0, destino.y) - 90;
    const u = 1 - e;
    return {
      x: u * u * m.x0 + 2 * u * e * cx + e * e * destino.x,
      y: u * u * m.y0 + 2 * u * e * cy + e * e * destino.y,
      alfa: t < 0.85 ? 1 : (1 - t) / 0.15,
    };
  }

  /** Desenha as moedas em coordenadas da tela (depois do HUD). Um preenchimento por moeda: no máximo 6 por evento. */
  desenhar(ctx: Ctx, luta: Pick<LeituraLuta, 'fighters'>): void {
    if (this.moedas.length === 0) return;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = OURO_DA_MOEDA;
    for (const m of this.moedas) {
      if (m.espera > 0) continue;
      const alvo = pontaDaBarra(m.indice, luta.fighters[m.indice].en);
      const p = MoedasDeDreno.posicao(m, alvo);
      ctx.globalAlpha = p.alfa;
      ctx.beginPath();
      ctx.moveTo(p.x - 5, p.y);
      ctx.lineTo(p.x, p.y - 3);
      ctx.lineTo(p.x + 5, p.y);
      ctx.lineTo(p.x, p.y + 3);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }
}
