import type { EntradaTarja, IdLutador, MomentoCinematica } from '../core/contratos';
import type { NomeEspecial } from './tipos';

/*
 * Dados de APRESENTAÇÃO dos 29 especiais para a cinemática (docs/identidade-visual-especiais.md, seção 4 e 1.2/1.3): qual quadro do atlas vai
 * na tarja, por onde a tarja entra e quando a cinemática dispara. Ficam FORA de `LutadorDef.especiais` de propósito: o oráculo de fidelidade
 * compara os especiais dos 4 originais com o protótipo, campo a campo, e o motor não lê nada daqui além de copiar para o evento `special`.
 *
 * Chave: `<lutador>` + ficha opcional + golpe. A ficha é procurada primeiro (NILA em SARPA, BAATAR na fase 2); sem registro, vale o da base.
 */
export type ApresentacaoEspecial = {
  /** Quadro do atlas para o recorte da tarja (nome de pose; a pose do golpe só vale se este for omitido). */
  quadro: string;
  /** Entrada da tarja; ausente = `lateral` (24 dos 29). */
  entrada?: Exclude<EntradaTarja, 'lateral'>;
  /** Ausente = 'inicio'. 'sucesso': PARADE e GARKUWA, para a tarja não avisar o rival. */
  momento?: Extract<MomentoCinematica, 'sucesso'>;
  /** Golpe que continua a mesma sessão do especial (FOUETTÉ `sResp` depois da PARADE). */
  continua?: 'sResp';
};

type Tabela = Partial<Record<IdLutador, Partial<Record<string, ApresentacaoEspecial>>>>;

const T: Tabela = {
  hayato: {
    sFire: { quadro: 'sa1' },
    sDown: { quadro: 'sb1', entrada: 'baixo' },
    sFwd: { quadro: 'sc1' },
  },
  'wei-long': {
    sFire: { quadro: 'special' },
    sDown: { quadro: 'sb1', entrada: 'cima' },
    sFwd: { quadro: 'sc1' },
  },
  'min-ji': {
    sFire: { quadro: 'sa1' },
    sDown: { quadro: 'sb1' },
    sFwd: { quadro: 'sc1' },
  },
  caio: {
    sFire: { quadro: 'special' },
    sDown: { quadro: 'sb1' },
    sFwd: { quadro: 'sc1', entrada: 'cima' },
  },
  aminu: {
    sFire: { quadro: 'hp1' },
    sDown: { quadro: 'sb1', momento: 'sucesso' },
    sFwd: { quadro: 'sc1' },
  },
  centella: {
    sFire: { quadro: 'sa1', entrada: 'cima' },
    sDown: { quadro: 'sb2', entrada: 'baixo' },
    sFwd: { quadro: 'sc0', entrada: 'rival' },
  },
  camille: {
    sFire: { quadro: 'sa1', momento: 'sucesso', continua: 'sResp' },
    sDown: { quadro: 'sb1', entrada: 'rival' },
    sFwd: { quadro: 'sc1' },
  },
  nila: {
    sFire: { quadro: 'sa1' },
    sFwd: { quadro: 'sc1' },
    'sarpa/sFire': { quadro: 'sarpaSlide1' },
    'sarpa/sFwd': { quadro: 'sarpaLeap1', entrada: 'baixo' },
  },
  baatar: {
    sFire: { quadro: 'sa1' },
    sDown: { quadro: 'sb1', entrada: 'rival' },
    sFwd: { quadro: 'sc1' },
    'chefe2/sFwd': { quadro: 'dive1', entrada: 'cima' },
  },
};

/** O registro de apresentação do especial `golpe` do lutador `id` na ficha `ficha` (null = base), ou undefined se não há. */
export function apresentacaoDoEspecial(id: IdLutador, ficha: string | null, golpe: string): ApresentacaoEspecial | undefined {
  const t = T[id];
  if (!t) return undefined;
  if (ficha !== null) {
    const daFicha = t[`${ficha}/${golpe}`];
    if (daFicha) return daFicha;
  }
  return t[golpe];
}

/** Todos os registros, para teste e para quem quiser listar (id, ficha|null, golpe, registro). */
export function todasAsApresentacoes(): { id: IdLutador; ficha: string | null; golpe: NomeEspecial; apresentacao: ApresentacaoEspecial }[] {
  const saida: { id: IdLutador; ficha: string | null; golpe: NomeEspecial; apresentacao: ApresentacaoEspecial }[] = [];
  for (const [id, t] of Object.entries(T) as [IdLutador, Partial<Record<string, ApresentacaoEspecial>>][]) {
    for (const [chave, apresentacao] of Object.entries(t)) {
      if (!apresentacao) continue;
      const [a, b] = chave.split('/');
      const ficha = b === undefined ? null : (a as string);
      const golpe = (b === undefined ? a : b) as NomeEspecial;
      saida.push({ id, ficha, golpe, apresentacao });
    }
  }
  return saida;
}
