import type { Elenco } from '../../assets/elenco';
import { ALTURA, LARGURA } from '../../core/constantes';
import type { IdLutador } from '../../core/contratos';
import { easeOut, lerp } from '../../core/math';
import { entradaDoRetrato } from '../../data/trailer/curvas';
import { ALTURA_LETTERBOX } from '../../data/trailer/tipos';
import type { Ferramentas } from '../../ui/ferramentas';
import { chDaFicha } from '../lutador';
import { desenharRetrato, type RostoPronto } from '../retrato';
import { FH } from '../texto';
import { RS, type Ctx } from '../tela';

/*
 * P8, a montagem (docs/spec-trailer-abertura.md §3.1): os retratos entram um por tempo, cada um com um estalo e um risco de luz LOCAL (não é flash de tela cheia). Só
 * usa retratos, que ficam sempre na memória: é a folga para a carga do ZENON. O desenho segue a QUANTIDADE do roteiro (`plano.ordem.length`):
 *  - até 8 retratos: PAINÉIS INCLINADOS lado a lado em duas fileiras (4x2 para 8), a largura toda, com o nome embaixo à esquerda (a direção de arte do Apolo);
 *  - mais que 8: a grade de cartas (3x3 para 9).
 */

// ---------------------------------------------------------------------------------------------------------------- geometria

/** Painel inclinado (docs/direcao-arte-trailer.md §4.4): 240x190, inclinação 36, vão de 8; fileira 1 em y 76 e a 2 em y 274 (dentro das faixas de 69). */
export const PAINEL = { largura: 240, altura: 190, inclinacao: 36, vao: 8, topo: ALTURA_LETTERBOX + 7 } as const;

export interface PainelDaMontagem {
  readonly coluna: number;
  readonly linha: number;
  /** Retângulo de referência (sem a inclinação). */
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
}

export const colunasDaMontagem = (n: number): number => (n <= 8 ? 4 : 3);

/** Os painéis da montagem de `n` (<= 8) retratos, na ordem de entrada (fileira por fileira: coluna i % 4, linha floor(i / 4)). */
export function layoutDosPaineis(n: number): readonly PainelDaMontagem[] {
  const colunas = colunasDaMontagem(n);
  return Array.from({ length: n }, (_, i) => {
    const coluna = i % colunas;
    const linha = Math.floor(i / colunas);
    return { coluna, linha, x: coluna * PAINEL.largura, y: PAINEL.topo + linha * (PAINEL.altura + PAINEL.vao), w: PAINEL.largura, h: PAINEL.altura };
  });
}

/** A grade de cartas (9 retratos): células de 104 px com 8 de vão, centrada. */
export const CELULA = 104;
export const VAO = 8;
export const TOPO_DA_GRADE = 80;
const LADO_DA_GRADE = 3 * CELULA + 2 * VAO;
export function posicaoDoRetrato(i: number): { readonly x: number; readonly y: number } {
  return { x: LARGURA / 2 - LADO_DA_GRADE / 2 + (i % 3) * (CELULA + VAO), y: TOPO_DA_GRADE + Math.floor(i / 3) * (CELULA + VAO) };
}

/** Escala e alfa de um retrato `idade` ticks depois de entrar: estala de 1,35x a 1x em 8 ticks e acende em 4. */
export function animacaoDoRetrato(idade: number): { readonly escala: number; readonly alfa: number } {
  if (idade < 0) return { escala: 1, alfa: 0 };
  return { escala: 1 + 0.35 * Math.max(0, 1 - idade / 8) ** 2, alfa: Math.min(1, (idade + 1) / 4) };
}

/** O rosto cobrindo um retângulo (`cover`): escala pelo lado que sobra, alinhado ao topo (o rosto mora no alto do recorte) e centrado na largura. */
export function desenharRostoCobrindo(ctx: Ctx, rosto: RostoPronto, x: number, y: number, w: number, h: number): void {
  if (!rosto) return;
  const [sx, sy, sw, sh] = rosto.recorte;
  const k = Math.max(w / sw, h / sh);
  const dw = sw * k;
  const dh = sh * k;
  ctx.drawImage(rosto.imagem, sx, sy, sw, sh, x + (w - dw) / 2, y, dw, dh);
}

// ---------------------------------------------------------------------------------------------------------------- desenho

export interface EntradaDosRetratos {
  readonly ctx: Ctx;
  readonly f: Ferramentas;
  readonly elenco: Elenco;
  readonly ordem: readonly IdLutador[];
  readonly tauNoPlano: number;
  readonly risco: number;
  /** Retratos que viram silhueta escura ("???") em vez de rosto (o ZENON ainda não liberado, D-T2). */
  readonly ocultos?: ReadonlySet<IdLutador>;
}

/** O fundo da montagem: escuro, com um clarão azul-marinho atrás. */
export function desenharFundoDaMontagem(ctx: Ctx): void {
  const g = ctx.createLinearGradient(0, 0, 0, ALTURA);
  g.addColorStop(0, '#05030c');
  g.addColorStop(1, '#0d0a20');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  const r = ctx.createRadialGradient(LARGURA / 2, 240, 20, LARGURA / 2, 240, 360);
  r.addColorStop(0, 'rgba(70,90,190,.32)');
  r.addColorStop(1, 'rgba(70,90,190,0)');
  ctx.fillStyle = r;
  ctx.fillRect(0, 0, LARGURA, ALTURA);
}

/** O paralelogramo do painel (o topo desloca +sk/2 e a base -sk/2; 2 px de respiro entre vizinhos). */
function caminhoDoPainel(ctx: Ctx, p: PainelDaMontagem, y0: number): void {
  const sk = PAINEL.inclinacao;
  ctx.beginPath();
  ctx.moveTo(p.x + sk / 2 + 2, y0);
  ctx.lineTo(p.x + p.w + sk / 2 - 2, y0);
  ctx.lineTo(p.x + p.w - sk / 2 - 2, y0 + p.h);
  ctx.lineTo(p.x - sk / 2 + 2, y0 + p.h);
  ctx.closePath();
}

const TINTA = '#07040e';
const CREME = '#fff5e2';

function desenharPainel(e: EntradaDosRetratos, id: IdLutador, p: PainelDaMontagem, i: number, idade: number): void {
  const { ctx } = e;
  const r = e.elenco[id];
  const cor = chDaFicha(r.ch, null).fire[0];
  const sk = PAINEL.inclinacao;
  const k = easeOut(idade / 8);
  const dir = i % 2 ? -1 : 1;
  const y0 = p.y + (1 - k) * 36 * dir;
  ctx.save();
  ctx.globalAlpha = k;
  caminhoDoPainel(ctx, p, y0);
  ctx.save();
  ctx.clip();
  const g = ctx.createLinearGradient(0, y0, 0, y0 + p.h);
  g.addColorStop(0, '#0b0718');
  g.addColorStop(1, cor);
  ctx.fillStyle = g;
  ctx.fillRect(p.x - sk, y0, p.w + sk * 2, p.h);
  if (e.ocultos?.has(id)) {
    ctx.fillStyle = 'rgba(6,3,16,.92)';
    ctx.fillRect(p.x - sk, y0, p.w + sk * 2, p.h);
    e.f.A('?', p.x + p.w / 2, y0 + p.h / 2, 90, '#6c5a8a', '#000');
  } else {
    const rosto = r.arte.retrato(r.ch.head);
    if (rosto) {
      // "cover": o quadrado do rosto ocupa a largura toda, centrado a 46% da altura
      const [sx, sy, sw, sh] = rosto.recorte;
      const lado = p.w + sk;
      ctx.drawImage(rosto.imagem, sx, sy, sw, sh, p.x + p.w / 2 - lado / 2, y0 + p.h / 2 - lado * 0.46, lado, lado);
    }
  }
  const sombra = ctx.createLinearGradient(0, y0 + p.h * 0.55, 0, y0 + p.h);
  sombra.addColorStop(0, 'rgba(7,4,14,0)');
  sombra.addColorStop(1, 'rgba(7,4,14,.9)');
  ctx.fillStyle = sombra;
  ctx.fillRect(p.x - sk, y0, p.w + sk * 2, p.h);
  // o risco de luz SÓ no painel que acabou de entrar (local, ~9% da tela: não é flash)
  const risco = Math.min(1, Math.max(0, 1 - idade / 10));
  if (risco > 0) {
    const px = lerp(p.x - 40, p.x + p.w + 40, 1 - risco);
    const gr = ctx.createLinearGradient(px - 30, 0, px + 30, 0);
    gr.addColorStop(0, 'rgba(255,255,255,0)');
    gr.addColorStop(0.5, `rgba(255,255,255,${(0.6 * risco).toFixed(3)})`);
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(p.x - sk, y0, p.w + sk * 2, p.h);
  }
  ctx.restore();
  ctx.lineJoin = 'miter';
  caminhoDoPainel(ctx, p, y0);
  ctx.lineWidth = 5;
  ctx.strokeStyle = TINTA;
  ctx.stroke();
  // o fio creme na aresta inclinada da direita (o fio da abertura de hoje)
  ctx.beginPath();
  ctx.moveTo(p.x + p.w + sk / 2 - 2, y0);
  ctx.lineTo(p.x + p.w - sk / 2 - 2, y0 + p.h);
  ctx.lineWidth = 2.5;
  ctx.strokeStyle = '#fff1d0';
  ctx.stroke();
  if (!e.ocultos?.has(id)) {
    ctx.font = FH(24);
    (ctx as Ctx & { letterSpacing: string }).letterSpacing = '1px';
    ctx.textBaseline = 'alphabetic';
    ctx.textAlign = 'left';
    ctx.fillStyle = 'rgba(4,2,10,.9)';
    ctx.fillText(r.ch.name, p.x + 5, y0 + p.h - 10);
    ctx.fillStyle = CREME;
    ctx.fillText(r.ch.name, p.x + 4, y0 + p.h - 12);
    ctx.fillStyle = cor;
    ctx.fillRect(p.x + 4, y0 + p.h - 8, 34, 3);
  }
  ctx.restore();
}

function risco(ctx: Ctx, area: { readonly x: number; readonly y: number; readonly w: number; readonly h: number }, fracao: number, forca: number): void {
  const cx = area.x - 60 + fracao * (area.w + 120);
  const cy = area.y + area.h / 2;
  const ax = 0.94 * 46;
  const ay = 0.34 * 46;
  ctx.save();
  ctx.beginPath();
  ctx.rect(area.x, area.y, area.w, area.h);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  const g = ctx.createLinearGradient(cx - ax, cy - ay, cx + ax, cy + ay);
  g.addColorStop(0, 'rgba(180,200,255,0)');
  g.addColorStop(0.5, `rgba(220,232,255,${(0.3 * forca).toFixed(3)})`);
  g.addColorStop(1, 'rgba(180,200,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(area.x, area.y, area.w, area.h);
  ctx.restore();
}

function desenharCartas(e: EntradaDosRetratos): void {
  const { ctx, f, elenco, ordem, tauNoPlano } = e;
  ordem.forEach((id, i) => {
    const { x, y } = posicaoDoRetrato(i);
    const idade = tauNoPlano - entradaDoRetrato(i);
    const an = animacaoDoRetrato(idade);
    ctx.fillStyle = 'rgba(255,255,255,.05)';
    ctx.fillRect(x, y, CELULA, CELULA);
    if (an.alfa <= 0) return;
    const r = elenco[id];
    ctx.save();
    ctx.globalAlpha = an.alfa;
    ctx.translate(x + CELULA / 2, y + CELULA / 2);
    ctx.scale(an.escala, an.escala);
    ctx.translate(-CELULA / 2, -CELULA / 2);
    if (e.ocultos?.has(id)) {
      ctx.fillStyle = 'rgba(6,3,16,.92)';
      ctx.fillRect(0, 0, CELULA, CELULA);
      f.A('?', CELULA / 2, CELULA / 2, 54, '#6c5a8a', '#000');
    } else desenharRetrato(ctx, r.arte.retrato(r.ch.head), 0, 0, CELULA, false, ['#34406e', '#0c1233']);
    ctx.lineWidth = 3;
    ctx.strokeStyle = r.ch.accent;
    ctx.strokeRect(1.5, 1.5, CELULA - 3, CELULA - 3);
    if (!e.ocultos?.has(id)) {
      ctx.fillStyle = 'rgba(4,2,12,.78)';
      ctx.fillRect(3, CELULA - 20, CELULA - 6, 17);
      f.T(r.ch.name, CELULA / 2, CELULA - 11.5, 12, '#ffffff', 'center');
    }
    ctx.restore();
  });
  if (e.risco > 0) risco(ctx, { x: LARGURA / 2 - LADO_DA_GRADE / 2 - 6, y: TOPO_DA_GRADE - 6, w: LADO_DA_GRADE + 12, h: LADO_DA_GRADE + 12 }, 1 - e.risco, e.risco);
}

/** Ticks depois da entrada em que um painel está parado (a entrada leva 8 ticks e o risco de luz 10). */
export const TICKS_ATE_ASSENTAR = 10;

/**
 * Os painéis já assentados, pintados UMA vez numa camada (960x540). Só o painel que está entrando se redesenha por quadro: a montagem inteira custava 8 painéis com 5 degradês,
 * recorte e retrato a cada quadro (38 ms a 4x); com a camada é 1 `drawImage` mais o painel que entra. O resultado é o mesmo pixel: o painel assentado é imutável.
 */
export class CamadaDaMontagem {
  private cv: HTMLCanvasElement | null = null;
  private readonly pintados = new Set<number>();

  contexto(): Ctx | null {
    if (typeof document === 'undefined') return null;
    if (!this.cv) {
      this.cv = document.createElement('canvas');
      this.cv.width = LARGURA * RS;
      this.cv.height = ALTURA * RS;
    }
    const g = this.cv.getContext('2d');
    if (g) g.setTransform(RS, 0, 0, RS, 0, 0);
    return g;
  }
  get canvas(): HTMLCanvasElement | null {
    return this.cv;
  }
  jaPintado(i: number): boolean {
    return this.pintados.has(i);
  }
  marcar(i: number): void {
    this.pintados.add(i);
  }
  soltar(): void {
    this.cv = null;
    this.pintados.clear();
  }
}

export function desenharMontagem(e: EntradaDosRetratos, camada?: CamadaDaMontagem): void {
  const { ctx, ordem, tauNoPlano } = e;
  if (ordem.length > 8) {
    desenharFundoDaMontagem(ctx);
    desenharCartas(e);
    return;
  }
  ctx.fillStyle = '#04020a';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  const paineis = layoutDosPaineis(ordem.length);
  const g = camada?.contexto() ?? null;
  if (camada && g) {
    // os assentados entram na camada (uma vez) e saem dela num só desenho
    paineis.forEach((p, i) => {
      const idade = tauNoPlano - entradaDoRetrato(i);
      if (idade >= TICKS_ATE_ASSENTAR && !camada.jaPintado(i)) {
        desenharPainel({ ...e, ctx: g }, ordem[i] as IdLutador, p, i, TICKS_ATE_ASSENTAR);
        camada.marcar(i);
      }
    });
    if (camada.canvas) ctx.drawImage(camada.canvas, 0, 0, LARGURA, ALTURA);
    paineis.forEach((p, i) => {
      const idade = tauNoPlano - entradaDoRetrato(i);
      if (idade >= 0 && idade < TICKS_ATE_ASSENTAR) desenharPainel(e, ordem[i] as IdLutador, p, i, idade);
    });
    return;
  }
  paineis.forEach((p, i) => {
    const idade = tauNoPlano - entradaDoRetrato(i);
    if (idade >= 0) desenharPainel(e, ordem[i] as IdLutador, p, i, idade);
  });
}
