import type { ManifestoAtlas } from '../data/atlas';
import { ErroDeAsset, type ManifestoC1, type Par, type QuadroC1, type Quatro, type RetratoDef } from './tipos';

const ehObjeto = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const ehNumero = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);
/** Só um nome de arquivo, sem pastas e sem ponto inicial: impede ../ vindo de um manifesto adulterado. */
const nomeDeArquivo = (v: unknown): v is string => typeof v === 'string' && /^[\w.-]+$/.test(v) && !v.startsWith('.');

/** Máximo de páginas por atlas (limite de sanidade para dado externo). */
export const MAX_PAGINAS = 8;

function par(v: unknown, onde: string, recurso: string): Par {
  if (!Array.isArray(v) || v.length !== 2 || !ehNumero(v[0]) || !ehNumero(v[1])) {
    throw new ErroDeAsset(`${recurso}: ${onde} deve ser [numero, numero]`, recurso);
  }
  return [v[0], v[1]];
}

function quadro(v: unknown, nome: string, recurso: string, paginas: number): QuadroC1 {
  if (!ehObjeto(v)) throw new ErroDeAsset(`${recurso}: quadro "${nome}" invalido`, recurso);
  const { x, y, w, h, ax } = v;
  if (!ehNumero(x) || !ehNumero(y) || !ehNumero(w) || !ehNumero(h) || !ehNumero(ax)) {
    throw new ErroDeAsset(`${recurso}: quadro "${nome}" precisa de x, y, w, h, ax numericos`, recurso);
  }
  if (w <= 0 || h <= 0) throw new ErroDeAsset(`${recurso}: quadro "${nome}" com tamanho vazio`, recurso);
  let p = 0;
  if (v['p'] !== undefined) {
    const bruto = v['p'];
    if (typeof bruto !== 'number' || !Number.isInteger(bruto) || bruto < 0 || bruto >= paginas) {
      throw new ErroDeAsset(`${recurso}: quadro "${nome}" com pagina "p" fora de 0..${paginas - 1}`, recurso);
    }
    p = bruto;
  }
  const q: QuadroC1 = { x, y, w, h, ax, p };
  if (v['rosto'] !== undefined) q.rosto = par(v['rosto'], `quadro "${nome}".rosto`, recurso);
  if (v['ponta'] !== undefined) q.ponta = par(v['ponta'], `quadro "${nome}".ponta`, recurso);
  return q;
}

/** `retrato`: "arquivo.png" (imagem inteira) ou { arquivo, recorte: [x, y, w, h] }. */
export function validarRetrato(v: unknown, recurso: string): RetratoDef {
  if (typeof v === 'string') {
    if (!nomeDeArquivo(v)) throw new ErroDeAsset(`${recurso}: "retrato" deve ser um nome de arquivo simples`, recurso);
    return { arquivo: v };
  }
  if (!ehObjeto(v) || !nomeDeArquivo(v['arquivo'])) {
    throw new ErroDeAsset(`${recurso}: "retrato" deve ser um nome de arquivo ou { arquivo, recorte }`, recurso);
  }
  const arquivo = v['arquivo'];
  if (v['recorte'] === undefined) return { arquivo };
  const r = v['recorte'];
  if (!Array.isArray(r) || r.length !== 4 || !r.every(ehNumero) || (r[2] as number) <= 0 || (r[3] as number) <= 0) {
    throw new ErroDeAsset(`${recurso}: "retrato.recorte" deve ser [x, y, w, h] positivo`, recurso);
  }
  return { arquivo, recorte: r as unknown as Quatro };
}

/**
 * Valida o JSON de um atlas (C1 v1 ou v2) com checagem estrita (campos numéricos, nomes de arquivo sem pasta).
 * Lança ErroDeAsset dizendo o que está errado e onde. v1 = uma imagem (`imagem`); v2 = várias páginas
 * (`imagens`, e `p` em cada quadro). A conversão para poses (tipX/tipY) NÃO é feita aqui: é só
 * `manifestoParaPoses` em data/atlas.ts (use `paraManifestoV1`).
 */
export function validarManifesto(dados: unknown, recurso: string): ManifestoC1 {
  if (!ehObjeto(dados)) throw new ErroDeAsset(`${recurso}: manifesto nao e um objeto`, recurso);
  const versao = dados['versao'];
  if (versao !== 1 && versao !== 2) throw new ErroDeAsset(`${recurso}: versao de manifesto nao suportada (${String(versao)})`, recurso);
  const lutador = dados['lutador'];
  if (typeof lutador !== 'string' || lutador === '') throw new ErroDeAsset(`${recurso}: "lutador" ausente`, recurso);

  let imagens: string[];
  if (versao === 1) {
    const imagem = dados['imagem'];
    if (!nomeDeArquivo(imagem)) throw new ErroDeAsset(`${recurso}: "imagem" deve ser um nome de arquivo simples`, recurso);
    imagens = [imagem];
  } else {
    const lista = dados['imagens'];
    if (!Array.isArray(lista) || lista.length === 0 || lista.length > MAX_PAGINAS) {
      throw new ErroDeAsset(`${recurso}: "imagens" deve ter de 1 a ${MAX_PAGINAS} arquivos`, recurso);
    }
    if (!lista.every(nomeDeArquivo)) throw new ErroDeAsset(`${recurso}: "imagens" so aceita nomes de arquivo simples`, recurso);
    if (new Set(lista).size !== lista.length) throw new ErroDeAsset(`${recurso}: "imagens" com arquivo repetido`, recurso);
    imagens = [...lista] as string[];
  }

  const tamanho = par(dados['tamanho'], 'tamanho', recurso);
  if (tamanho[0] <= 0 || tamanho[1] <= 0) throw new ErroDeAsset(`${recurso}: tamanho do atlas vazio`, recurso);
  const alturaRef = dados['alturaRef'];
  if (!ehNumero(alturaRef) || alturaRef <= 0) throw new ErroDeAsset(`${recurso}: "alturaRef" deve ser > 0`, recurso);
  const bruto = dados['quadros'];
  if (!ehObjeto(bruto) || Object.keys(bruto).length === 0) throw new ErroDeAsset(`${recurso}: "quadros" vazio`, recurso);
  const quadros: Record<string, QuadroC1> = {};
  for (const [nome, v] of Object.entries(bruto)) {
    if (versao === 1 && ehObjeto(v) && v['p'] !== undefined && v['p'] !== 0) {
      throw new ErroDeAsset(`${recurso}: quadro "${nome}" usa pagina "p" num manifesto v1 (uma imagem so)`, recurso);
    }
    quadros[nome] = quadro(v, nome, recurso, imagens.length);
  }
  const saida: ManifestoC1 = { versao, lutador, imagens, tamanho, alturaRef, quadros };
  if (dados['retrato'] === undefined) return saida;
  return { ...saida, retrato: validarRetrato(dados['retrato'], recurso) };
}

/** O manifesto no formato v1 que `manifestoParaPoses` (data/atlas.ts) entende; `p` fica de fora (as páginas ficam no AtlasLutador). */
export function paraManifestoV1(m: ManifestoC1): ManifestoAtlas {
  const quadros: ManifestoAtlas['quadros'] = {};
  for (const [nome, q] of Object.entries(m.quadros)) {
    const { p: _pagina, ...resto } = q;
    quadros[nome] = resto;
  }
  return { versao: 1, lutador: m.lutador, imagem: m.imagens[0] ?? '', tamanho: m.tamanho, alturaRef: m.alturaRef, quadros };
}
