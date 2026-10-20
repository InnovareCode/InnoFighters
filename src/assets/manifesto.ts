import { ErroDeAsset, type ManifestoAtlas, type Par, type QuadroAtlas } from './tipos';

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function par(v: unknown, onde: string, recurso: string): Par {
  if (!Array.isArray(v) || v.length !== 2 || !ehNumero(v[0]) || !ehNumero(v[1])) {
    throw new ErroDeAsset(`${recurso}: ${onde} deve ser [numero, numero]`, recurso);
  }
  return [v[0], v[1]];
}

function quadro(v: unknown, nome: string, recurso: string): QuadroAtlas {
  if (!ehObjeto(v)) throw new ErroDeAsset(`${recurso}: quadro "${nome}" invalido`, recurso);
  const { x, y, w, h, ax } = v;
  if (!ehNumero(x) || !ehNumero(y) || !ehNumero(w) || !ehNumero(h) || !ehNumero(ax)) {
    throw new ErroDeAsset(`${recurso}: quadro "${nome}" precisa de x, y, w, h, ax numericos`, recurso);
  }
  if (w <= 0 || h <= 0) throw new ErroDeAsset(`${recurso}: quadro "${nome}" com tamanho vazio`, recurso);
  const q: QuadroAtlas = { x, y, w, h, ax };
  if (v['rosto'] !== undefined) q.rosto = par(v['rosto'], `quadro "${nome}".rosto`, recurso);
  if (v['ponta'] !== undefined) q.ponta = par(v['ponta'], `quadro "${nome}".ponta`, recurso);
  return q;
}

/**
 * Valida o JSON de um atlas (C1) com checagem estrita (campos numéricos, nome de imagem sem pasta).
 * Lança ErroDeAsset dizendo o que está errado e onde. A conversão para poses (tipX/tipY) NÃO é
 * feita aqui: é só `manifestoParaPoses` em data/atlas.ts.
 */
export function validarManifesto(dados: unknown, recurso: string): ManifestoAtlas {
  if (!ehObjeto(dados)) throw new ErroDeAsset(`${recurso}: manifesto nao e um objeto`, recurso);
  if (dados['versao'] !== 1) throw new ErroDeAsset(`${recurso}: versao de manifesto nao suportada (${String(dados['versao'])})`, recurso);
  const lutador = dados['lutador'];
  if (typeof lutador !== 'string' || lutador === '') throw new ErroDeAsset(`${recurso}: "lutador" ausente`, recurso);
  const imagem = dados['imagem'];
  // só um nome de arquivo, sem pastas: impede ../ vindo de um manifesto adulterado
  if (typeof imagem !== 'string' || !/^[\w.-]+$/.test(imagem) || imagem.startsWith('.')) {
    throw new ErroDeAsset(`${recurso}: "imagem" deve ser um nome de arquivo simples`, recurso);
  }
  const tamanho = par(dados['tamanho'], 'tamanho', recurso);
  if (tamanho[0] <= 0 || tamanho[1] <= 0) throw new ErroDeAsset(`${recurso}: tamanho do atlas vazio`, recurso);
  const alturaRef = dados['alturaRef'];
  if (!ehNumero(alturaRef) || alturaRef <= 0) throw new ErroDeAsset(`${recurso}: "alturaRef" deve ser > 0`, recurso);
  const bruto = dados['quadros'];
  if (!ehObjeto(bruto) || Object.keys(bruto).length === 0) throw new ErroDeAsset(`${recurso}: "quadros" vazio`, recurso);
  const quadros: Record<string, QuadroAtlas> = {};
  for (const [nome, v] of Object.entries(bruto)) quadros[nome] = quadro(v, nome, recurso);
  return { versao: 1, lutador, imagem, tamanho, alturaRef, quadros };
}
