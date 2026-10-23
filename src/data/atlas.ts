import { SH_IDLE } from '../core/constantes';
import type { PoseDados, Poses } from './tipos';

/**
 * C1 — manifesto de atlas (`public/assets/lutadores/<id>/atlas.json`), PLANO.md 4.3.
 * Tudo em px do ATLAS. `ponta` e `rosto` são relativos ao canto superior esquerdo do quadro.
 *
 * `rosto` = CENTRO do retrato quadrado de 190 px (tela de seleção). No protótipo o retrato é
 * [g.x + headX - 95 + 6, g.y - 4, 190, 190]; os offsets +6/-4 do protótipo ficam embutidos no
 * `rosto` gerado pela extração: rosto = [headX + 6, 91]. Assim o retrato é simplesmente
 * [x + rosto[0] - 95, y + rosto[1] - 95, 190, 190], sem constantes mágicas no loader.
 */
export type QuadroAtlas = {
  x: number;
  y: number;
  w: number;
  h: number;
  /** Âncora horizontal (px a partir do canto esquerdo do quadro); pés = base do recorte (y + h). */
  ax: number;
  /** Ponta do golpe, px do atlas relativos ao canto superior esquerdo do quadro. */
  ponta?: readonly [number, number];
  rosto?: readonly [number, number];
  /** Quadro de PAINEL (folha do filme do especial): a UI o trata à parte; o motor não lê. Ausente = quadro comum. */
  painel?: boolean;
};

export type ManifestoAtlas = {
  versao: 1;
  lutador: string;
  imagem: string;
  tamanho: readonly [number, number];
  /** Altura do idle0: o jogo calcula K = scale * SH_IDLE / alturaRef. */
  alturaRef: number;
  quadros: Record<string, QuadroAtlas>;
};

export const LADO_RETRATO = 190;

/**
 * Converte o manifesto C1 para o formato interno (POSEDATA do protótipo). ÚNICO lugar onde
 * `ponta` (px do atlas, canto do quadro) vira `tipX/tipY` (px lógicos, relativos à âncora,
 * já na escala da guarda): k = SH_IDLE / alturaRef; tipX = (ponta.x - ax) * k;
 * tipY = (h - ponta.y) * k. Não multiplicar por `ch.scale` aqui: o protótipo faz isso na
 * hora de usar (tipX * ch.scale).
 */
export function manifestoParaPoses(m: ManifestoAtlas): Poses {
  const k = SH_IDLE / m.alturaRef;
  const poses: Poses = {};
  for (const [nome, q] of Object.entries(m.quadros)) {
    const p: PoseDados = { x: q.x, y: q.y, w: q.w, h: q.h, ax: q.ax };
    if (q.ponta) {
      p.tipX = (q.ponta[0] - q.ax) * k;
      p.tipY = (q.h - q.ponta[1]) * k;
    }
    if (q.rosto) p.rosto = q.rosto;
    if (q.painel) p.painel = true;
    poses[nome] = p;
  }
  return poses;
}

/** Retrato [x, y, w, h] no atlas a partir do `rosto` de um quadro (ch.head do protótipo). */
export function retratoDoQuadro(p: PoseDados): readonly [number, number, number, number] | null {
  if (!p.rosto) return null;
  const meio = LADO_RETRATO / 2;
  return [p.x + p.rosto[0] - meio, p.y + p.rosto[1] - meio, LADO_RETRATO, LADO_RETRATO];
}

/** Validação mínima do JSON carregado da rede (dado externo): lança com mensagem clara. */
export function validarManifesto(bruto: unknown): ManifestoAtlas {
  const m = bruto as Partial<ManifestoAtlas> | null;
  if (!m || typeof m !== 'object') throw new Error('manifesto: nao e objeto');
  if (m.versao !== 1) throw new Error(`manifesto: versao ${String(m.versao)} nao suportada`);
  if (typeof m.imagem !== 'string' || typeof m.alturaRef !== 'number' || !(m.alturaRef > 0)) {
    throw new Error('manifesto: imagem/alturaRef invalidos');
  }
  if (!m.quadros || typeof m.quadros !== 'object') throw new Error('manifesto: sem quadros');
  if (!Array.isArray(m.tamanho) || m.tamanho.length !== 2) throw new Error('manifesto: tamanho invalido');
  for (const [nome, q] of Object.entries(m.quadros)) {
    for (const campo of ['x', 'y', 'w', 'h', 'ax'] as const) {
      if (typeof q[campo] !== 'number' || !Number.isFinite(q[campo])) {
        throw new Error(`manifesto: quadro ${nome} com ${campo} invalido`);
      }
    }
  }
  return m as ManifestoAtlas;
}
