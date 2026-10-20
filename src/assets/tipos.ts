/** C1 — manifesto de atlas. Os tipos moram em data/atlas.ts (Vega); aqui só se reexporta e se define o erro. */
export type { ManifestoAtlas, QuadroAtlas } from '../data/atlas';

export type Par = readonly [number, number];

/** Falha de carga ou de validação de um recurso; a mensagem diz qual. */
export class ErroDeAsset extends Error {
  constructor(
    mensagem: string,
    readonly recurso: string,
    opcoes?: { cause?: unknown },
  ) {
    super(mensagem, opcoes);
    this.name = 'ErroDeAsset';
  }
}
