import type { IdLutador } from '../../src/core/contratos';
import { hashDe, media, wilson } from './estatistica';
import type { ContagemGolpe, ParametrosSim, Registro } from './simulacao';

/*
 * Agregação dos registros da simulação: taxa de vitória por lutador, matriz A x B (os dois lados somados), chefão, golpes
 * e mecânicas. Função pura sobre os registros: a mesma lista dá sempre o mesmo `Agregado` (e o mesmo hash).
 */

export type Taxa = { n: number; k: number; taxa: number; lo: number; hi: number };

export const taxaDe = (k: number, n: number): Taxa => {
  const [lo, hi] = wilson(k, n);
  return { n, k, taxa: n ? k / n : 0, lo, hi };
};

export type LinhaLutador = {
  id: IdLutador;
  lutas: number;
  vitorias: number;
  travadas: number;
  geral: Taxa;
  comoP1: Taxa;
  comoP2: Taxa;
  porNivel: Record<string, Taxa>;
  /** Duração média das lutas que ele disputou, em segundos de jogo (60 ticks). */
  duracaoSeg: number;
  /** Fração das lutas cujo round decisivo terminou por TEMPO. */
  lutasPorTempo: number;
  /** Fração dos rounds (decididos) que foram por tempo. */
  roundsPorTempo: number;
  danoPorLuta: number;
  perfeitos: number;
};

export type LinhaChefe = {
  desafiante: IdLutador;
  nivel: number;
  jogador: Taxa;
  duracaoSeg: number;
  /** Fração das lutas em que o chefe chegou a trocar de barra / fazer a Dança. */
  trocouBarra: number;
  fezDanca: number;
  porKo: number;
  roundsMedios: number;
  travadas: number;
};

export type MecanicasCpu = {
  aminu: { usosMashi: number; seguraram: number; nivel2: number; nivel3: number; pctNivel2OuMais: number; pctNivel3: number };
  camille: { usosParade: number; paradas: number; sucesso: number };
  centella: { usosResorte: number; acertos: number; faixas: [number, number, number, number]; pctAcimaDoMinimo: number };
  nila: { trocasPorLuta: number };
  baatar: { agarroes: number; lutas: number };
  /** Esquivas por luta (por lutador) e quantos golpes/projéteis elas esquivaram; tudo 0 sem `--esquiva`. */
  esquiva: { porLuta: number; esquivadosPorLuta: number };
};

export type Agregado = {
  parametros: ParametrosSim;
  total: { regulares: number; chefe: number; travadas: number; duracaoSegMedia: number; lutasPorTempo: number; roundsPorTempo: number; empates: number };
  porLutador: Record<string, LinhaLutador>;
  /** matriz[a][b] = vitórias de A contra B, somando A como P1 e A como P2. */
  matriz: Record<string, Record<string, Taxa>>;
  lado: { p1: Taxa };
  chefe: LinhaChefe[];
  /** golpes[lutador][golpe] = [usos, acertos, bloqueios+paradas] (regulares). */
  golpes: Record<string, Record<string, ContagemGolpe>>;
  mecanicas: MecanicasCpu;
};

const fim = (r: Registro): 'ko' | 'tempo' | null => r.fim[r.fim.length - 1] ?? null;

export function agregar(registros: readonly Registro[], ids: readonly IdLutador[], chefeId: IdLutador, parametros: ParametrosSim): Agregado {
  const regulares = registros.filter((r) => r.tipo === 'regular');
  const doChefe = registros.filter((r) => r.tipo === 'chefe');

  const porLutador: Record<string, LinhaLutador> = {};
  const golpes: Record<string, Record<string, ContagemGolpe>> = {};
  for (const id of ids) {
    const mine = regulares.filter((r) => r.a === id || r.b === id);
    const lado = (r: Registro): 0 | 1 => (r.a === id ? 0 : 1);
    const decididas = mine.filter((r) => !r.travou);
    const venceu = (r: Registro): boolean => r.venc === lado(r);
    const vit = decididas.filter(venceu).length;
    const p1 = decididas.filter((r) => r.a === id);
    const p2 = decididas.filter((r) => r.b === id);
    const porNivel: Record<string, Taxa> = {};
    for (const nivel of parametros.niveis) {
      const d = decididas.filter((r) => r.nivel === nivel);
      porNivel[String(nivel)] = taxaDe(d.filter(venceu).length, d.length);
    }
    const roundsDecididos = mine.reduce((s, r) => s + r.fim.length, 0);
    const roundsTempo = mine.reduce((s, r) => s + r.fim.filter((x) => x === 'tempo').length, 0);
    porLutador[id] = {
      id,
      lutas: mine.length,
      vitorias: vit,
      travadas: mine.length - decididas.length,
      geral: taxaDe(vit, decididas.length),
      comoP1: taxaDe(p1.filter((r) => r.venc === 0).length, p1.length),
      comoP2: taxaDe(p2.filter((r) => r.venc === 1).length, p2.length),
      porNivel,
      duracaoSeg: media(mine.map((r) => r.ticks / 60)),
      lutasPorTempo: mine.length ? mine.filter((r) => fim(r) === 'tempo').length / mine.length : 0,
      roundsPorTempo: roundsDecididos ? roundsTempo / roundsDecididos : 0,
      danoPorLuta: media(mine.map((r) => r.dano[lado(r)])),
      perfeitos: mine.reduce((s, r) => s + r.perfeitos[lado(r)], 0),
    };
    const g: Record<string, ContagemGolpe> = {};
    for (const r of mine) {
      for (const [chave, c] of Object.entries(r.golpes[lado(r)])) {
        const alvo = (g[chave] ??= [0, 0, 0]);
        alvo[0] += c[0];
        alvo[1] += c[1];
        alvo[2] += c[2];
      }
    }
    golpes[id] = g;
  }

  const matriz: Record<string, Record<string, Taxa>> = {};
  for (const a of ids) {
    matriz[a] = {};
    for (const b of ids) {
      if (a === b) continue;
      const jogos = regulares.filter((r) => !r.travou && ((r.a === a && r.b === b) || (r.a === b && r.b === a)));
      const k = jogos.filter((r) => (r.a === a ? r.venc === 0 : r.venc === 1)).length;
      (matriz[a] as Record<string, Taxa>)[b] = taxaDe(k, jogos.length);
    }
  }
  const decididasReg = regulares.filter((r) => !r.travou);

  const chefe: LinhaChefe[] = [];
  for (const nivel of parametros.niveis) {
    for (const desafiante of ids) {
      const l = doChefe.filter((r) => r.a === desafiante && r.nivel === nivel);
      if (!l.length) continue;
      const ok = l.filter((r) => !r.travou);
      chefe.push({
        desafiante,
        nivel,
        jogador: taxaDe(ok.filter((r) => r.venc === 0).length, ok.length),
        duracaoSeg: media(l.map((r) => r.ticks / 60)),
        trocouBarra: l.filter((r) => r.chefe[0] > 0).length / l.length,
        fezDanca: l.filter((r) => r.chefe[1] > 0).length / l.length,
        porKo: l.filter((r) => fim(r) === 'ko').length / l.length,
        roundsMedios: media(l.map((r) => r.rounds)),
        travadas: l.length - ok.length,
      });
    }
  }

  const lado = (r: Registro, id: IdLutador): 0 | 1 => (r.a === id ? 0 : 1);
  const somaLado = (pegar: (r: Registro, i: 0 | 1) => number, id: IdLutador): number =>
    regulares.filter((r) => r.a === id || r.b === id).reduce((s, r) => s + pegar(r, lado(r, id)), 0);

  const cargaN = (n: number): number => somaLado((r, i) => r.carga[i][n as 0 | 1 | 2], 'aminu');
  const seguraram = cargaN(0);
  const parades = somaLado((r, i) => r.parry[i], 'camille');
  const usosParade = golpes['camille']?.['sFire']?.[0] ?? 0;
  const faixas: [number, number, number, number] = [0, 0, 0, 0];
  for (let f = 0; f < 4; f++) faixas[f] = somaLado((r, i) => r.reboteFaixas[i][f as 0 | 1 | 2 | 3], 'centella');
  const acertosResorte = faixas.reduce((a, b) => a + b, 0);
  const lutasNila = regulares.filter((r) => r.a === 'nila' || r.b === 'nila').length;
  const lutasBaatar = regulares.filter((r) => r.a === chefeId || r.b === chefeId).length;

  return {
    parametros,
    total: {
      regulares: regulares.length,
      chefe: doChefe.length,
      travadas: registros.filter((r) => r.travou).length,
      duracaoSegMedia: media(regulares.map((r) => r.ticks / 60)),
      lutasPorTempo: regulares.length ? regulares.filter((r) => fim(r) === 'tempo').length / regulares.length : 0,
      roundsPorTempo: (() => {
        const dec = regulares.reduce((s, r) => s + r.fim.length, 0);
        return dec ? regulares.reduce((s, r) => s + r.fim.filter((x) => x === 'tempo').length, 0) / dec : 0;
      })(),
      empates: regulares.reduce((s, r) => s + r.empates, 0),
    },
    porLutador,
    matriz,
    lado: { p1: taxaDe(decididasReg.filter((r) => r.venc === 0).length, decididasReg.length) },
    chefe,
    golpes,
    mecanicas: {
      aminu: {
        usosMashi: golpes['aminu']?.['sFire']?.[0] ?? 0,
        seguraram,
        nivel2: cargaN(1),
        nivel3: cargaN(2),
        pctNivel2OuMais: seguraram ? cargaN(1) / seguraram : 0,
        pctNivel3: seguraram ? cargaN(2) / seguraram : 0,
      },
      camille: { usosParade, paradas: parades, sucesso: usosParade ? parades / usosParade : 0 },
      centella: {
        usosResorte: golpes['centella']?.['sFwd']?.[0] ?? 0,
        acertos: acertosResorte,
        faixas,
        pctAcimaDoMinimo: acertosResorte ? (faixas[1] + faixas[2] + faixas[3]) / acertosResorte : 0,
      },
      nila: { trocasPorLuta: lutasNila ? somaLado((r, i) => r.trocaFicha[i], 'nila') / lutasNila : 0 },
      baatar: { agarroes: somaLado((r, i) => r.agarroes[i], chefeId), lutas: lutasBaatar },
      esquiva: {
        porLuta: regulares.length ? regulares.reduce((s, r) => s + r.esquivas[0] + r.esquivas[1], 0) / regulares.length : 0,
        esquivadosPorLuta: regulares.length ? regulares.reduce((s, r) => s + r.esquivou[0] + r.esquivou[1], 0) / regulares.length : 0,
      },
    },
  };
}

/** Hash do resultado: só o que decide o balanço (os registros ordenados por `idx`). Duas rodadas iguais dão o mesmo hash. */
export function hashDosRegistros(registros: readonly Registro[]): string {
  return hashDe([...registros].sort((a, b) => a.idx - b.idx));
}

/** Diferenças entre duas rodadas com os MESMOS parâmetros: o que mudou na taxa de vitória por lutador e no hash. */
export type Diferenca = {
  igual: boolean;
  hashAntes: string;
  hashAgora: string;
  /** Mesma versão de dados/motor/harness nas duas rodadas? Se sim e o hash difere, NÃO há determinismo (bug). */
  mesmaVersao: boolean;
  versaoAntes: string;
  versaoAgora: string;
  mudancas: { id: string; antes: number; agora: number }[];
};

export function compararRodadas(
  antes: { hash: string; versao: string; taxas: Record<string, number> },
  agora: { hash: string; versao: string; taxas: Record<string, number> },
): Diferenca {
  const mudancas: Diferenca['mudancas'] = [];
  for (const id of Object.keys(agora.taxas)) {
    const a = antes.taxas[id];
    const b = agora.taxas[id] as number;
    if (a === undefined || Math.abs(a - b) > 1e-12) mudancas.push({ id, antes: a ?? NaN, agora: b });
  }
  return {
    igual: antes.hash === agora.hash,
    hashAntes: antes.hash,
    hashAgora: agora.hash,
    mesmaVersao: antes.versao === agora.versao,
    versaoAntes: antes.versao,
    versaoAgora: agora.versao,
    mudancas,
  };
}
