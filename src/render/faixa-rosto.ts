import type { Elenco } from '../assets/elenco';
import type { IdLutador } from '../core/contratos';
import type { LutadorMontado } from '../data/montar';
import { getPD } from '../data/poses';
import { roteiroDoFilme } from '../data/roteiros-filme';
import { resolverPoseDoFilme } from './filme';
import type { Ctx } from './tela';
import { FONTE_DO_ESPECIAL, textoArcade } from './texto';

/*
 * FAIXA COM ROSTO (estilo X-Men vs Street Fighter, decisão do dono 24/10/2026, docs/spec-redesenho-jogabilidade.md §3.2/§3.4):
 * banda horizontal larga, laranja/amarela com listras, atravessando o terço de cima da tela; o rosto do lutador em close (de
 * perfil, gritando) entra pela esquerda com um brilho de impacto perto da boca; o cenário e os lutadores continuam visíveis
 * embaixo. Usada em DOIS lugares com a MESMA pintura: `FaixaRitmo` (especial comum, não congela) e `TarjaDoSuper` (super,
 * congela 30 ticks + linhas de velocidade). Este módulo é só a pintura PURA e a busca do rosto; nenhum dos dois estados mora aqui.
 *
 * O rosto vem da MESMA célula de "close"/grito que o filme do especial já usa (`roteiroDoFilme(...).batidas[0]`, a 1ª batida,
 * sempre o grito, t0-t12): se essa pose for uma célula da página FILME (`f0..f5`, `resolverPoseDoFilme(...).painel`), recortamos
 * dela; a página só existe depois que a luta carrega (`CenaFight.carregarFolhasDoFilme`, já chamado no início). Lutadores cujo
 * grito NÃO é uma célula de painel (NILA: `sa0`/`sc0`; ZENON: `cena1` — poses do MUNDO, não da folha FILME) não têm rosto: a
 * faixa cai para nome só, nunca fica vazia. `pd.rosto` (quando o manifesto traz, "centro do retrato") afina o recorte para a
 * cabeça; sem ele, usamos o quadro de painel inteiro.
 */

export interface RostoDaFaixa {
  readonly img: CanvasImageSource;
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

/** O recorte do rosto (gritando) de `lutador/ficha/golpe`, ou `null` se não há célula de painel para ele (cai no nome só). */
export function rostoDoGolpe(elenco: Elenco, lutador: IdLutador, ficha: string | null, golpe: string): RostoDaFaixa | null {
  const r = elenco[lutador];
  if (!r) return null;
  const ch = r.ch as unknown as LutadorMontado;
  const roteiro = roteiroDoFilme(lutador, ficha, golpe, false);
  const b0 = roteiro.batidas[0];
  if (!b0) return null;
  const resolvido = resolverPoseDoFilme(ch, b0.atacante, b0.atacanteAlt, 'idle0');
  if (!resolvido.painel) return null;
  const pd = getPD(ch, resolvido.painel);
  const img = r.arte.imagemDe(pd);
  if (!img) return null;
  if (!pd.rosto) return { img, sx: pd.x, sy: pd.y, sw: pd.w, sh: pd.h };
  // recorte mais justo (cabeça), centrado em `pd.rosto`, dentro dos limites do quadro inteiro
  const lado = Math.min(pd.w, pd.h) * 0.62;
  const cx = pd.x + pd.rosto[0];
  const cy = pd.y + pd.rosto[1];
  const sx = Math.max(pd.x, Math.min(pd.x + pd.w - lado, cx - lado / 2));
  const sy = Math.max(pd.y, Math.min(pd.y + pd.h - lado, cy - lado / 2));
  return { img, sx, sy, sw: lado, sh: lado };
}

export interface OpcoesFaixaRosto {
  readonly ctx: Ctx;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** 0..1: opacidade da faixa inteira (entra/sai). */
  readonly alfa: number;
  /** -w..0: desloca a faixa para a esquerda (entra/sai pelo lado esquerdo); 0 = no lugar. */
  readonly deslocaX: number;
  /** Cor de destaque do lutador (uma listra). */
  readonly corDestaque: string;
  readonly nome: string;
  readonly corNome: readonly [nucleo: string, sombra: string];
  readonly rosto: RostoDaFaixa | null;
}

/** A pintura da faixa (fundo listrado laranja/amarelo, o rosto à esquerda com o brilho de impacto, o nome). Pura: não muda estado. */
export function desenharFaixaComRosto(o: OpcoesFaixaRosto): void {
  const { ctx } = o;
  const x = o.x + o.deslocaX;
  ctx.save();
  ctx.globalAlpha = o.alfa;
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h); // o clip fica na posição FIXA (a faixa desliza por dentro dele, sem vazar)
  ctx.clip();
  // fundo: gradiente vertical escuro -> laranja -> amarelo -> laranja -> escuro (o "miolo" claro da referência)
  const g = ctx.createLinearGradient(0, o.y, 0, o.y + o.h);
  g.addColorStop(0, '#5a1f00');
  g.addColorStop(0.16, '#d95f0e');
  g.addColorStop(0.5, '#ffd34d');
  g.addColorStop(0.84, '#d95f0e');
  g.addColorStop(1, '#5a1f00');
  ctx.fillStyle = g;
  ctx.fillRect(x, o.y, o.w, o.h);
  // listras horizontais escuras, finas (a textura "arranhada" da referência)
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  const faixas = 7;
  for (let i = 1; i < faixas; i++) {
    const ly = o.y + (o.h * i) / faixas;
    ctx.fillRect(x, ly - 1, o.w, 2);
  }
  // 1 listra na cor do lutador, perto do topo (a "identidade" de quem ataca)
  ctx.globalAlpha = o.alfa * 0.5;
  ctx.fillStyle = o.corDestaque;
  ctx.fillRect(x, o.y + o.h * 0.1, o.w, Math.max(3, o.h * 0.045));
  ctx.globalAlpha = o.alfa;
  // o rosto, encostado na borda de baixo, à esquerda
  let xRosto = x + o.w * 0.12;
  if (o.rosto) {
    const escala = (o.h * 0.98) / o.rosto.sh;
    const dw = o.rosto.sw * escala;
    const dh = o.rosto.sh * escala;
    const dx = x + 6;
    const dy = o.y + o.h - dh;
    ctx.drawImage(o.rosto.img, o.rosto.sx, o.rosto.sy, o.rosto.sw, o.rosto.sh, dx, dy, dw, dh);
    // brilho de impacto (vermelho) perto da "boca": canto superior direito do recorte (o perfil olha para a direita)
    const gx = dx + dw * 0.82;
    const gy = dy + dh * 0.38;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, dh * 0.22);
    glow.addColorStop(0, 'rgba(255,90,60,.95)');
    glow.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gx, gy, dh * 0.22, 0, Math.PI * 2);
    ctx.fill();
    xRosto = dx + dw + 14;
  }
  // o nome: à direita do rosto (ou centralizado na faixa, sem rosto)
  const nx = o.rosto ? xRosto : x + o.w / 2;
  const tamanho = tamanhoDoNomeNaFaixaRosto(ctx, o.nome, o.rosto ? x + o.w - nx - 10 : o.w * 0.7);
  textoArcade(ctx, o.nome, nx, o.y + o.h / 2, tamanho, o.corNome[0], o.corNome[1], o.rosto ? 'left' : 'center', 1, 1, FONTE_DO_ESPECIAL(tamanho));
  ctx.restore();
}

/** Nome em até `max` px; encolhe (nunca abaixo de 16) se não couber na largura livre. */
function tamanhoDoNomeNaFaixaRosto(ctx: Ctx, nome: string, livre: number, max = 34): number {
  ctx.save();
  ctx.font = FONTE_DO_ESPECIAL(max);
  const w = ctx.measureText(nome).width;
  ctx.restore();
  return w > livre && livre > 0 ? Math.max(16, Math.floor((max * livre) / w)) : max;
}
