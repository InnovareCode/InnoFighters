/*
 * Ajudantes das medições de VOZ (spec §7.2): renderizam o grito de um lutador com o AudioSys real, com o tom IGUALADO (F0_REFERENCIA_VOZ) para
 * que a distância meça só o que não é tom, ou com o tom real (R6 e R7).
 */
import { tocarReceita } from '../../src/audio/receitas';
import { sintetizarGrito } from '../../src/audio/sintese-voz';
import type { IdLutador } from '../../src/core/contratos';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { DADOS_SONS, type Grito, type PerfilVocal } from '../../src/data/sons';
import { descrever, distancia, type Descritores, type Escalas, type Partes } from './descritores';
import { F0_REFERENCIA_VOZ } from './regua-sons';
import { renderizar } from './render-som';

export function perfilDe(id: IdLutador, ficha: string | null = null): PerfilVocal {
  const base = DADOS_SONS.perfis[id] as PerfilVocal;
  const sobre = ficha ? DADOS_SONS.perfisPorFicha[`${id}.${ficha}`] : undefined;
  return sobre ? { ...base, ...sobre } : base;
}

export interface OpcoesRender {
  /** Troca o f0 do perfil (padrão: o de referência). `null` = o real do lutador. */
  readonly f0?: number | null;
  readonly tom?: number;
  readonly vol?: number;
  readonly espelho?: boolean;
}

const CACHE = new Map<string, Descritores>();

export function descreverGrito(perfil: PerfilVocal, grito: Grito, o: OpcoesRender = {}): Descritores {
  const chave = JSON.stringify([perfil, grito, o]);
  const guardado = CACHE.get(chave);
  if (guardado) return guardado;
  const d = descreverGritoSemCache(perfil, grito, o);
  CACHE.set(chave, d);
  return d;
}

function descreverGritoSemCache(perfil: PerfilVocal, grito: Grito, o: OpcoesRender): Descritores {
  const f0 = o.f0 === null ? perfil.f0 : (o.f0 ?? F0_REFERENCIA_VOZ);
  const receita = sintetizarGrito({ ...perfil, f0 }, grito, { ...(o.tom === undefined ? {} : { tom: o.tom }), ...(o.vol === undefined ? {} : { vol: o.vol }), ...(o.espelho ? { espelho: true } : {}) });
  return descrever(renderizar((a) => void tocarReceita(a, receita)).amostras);
}

export function amostrasDoGrito(perfil: PerfilVocal, grito: Grito, o: OpcoesRender = {}): Float32Array {
  const f0 = o.f0 === null ? perfil.f0 : (o.f0 ?? F0_REFERENCIA_VOZ);
  const receita = sintetizarGrito({ ...perfil, f0 }, grito, { ...(o.tom === undefined ? {} : { tom: o.tom }), ...(o.vol === undefined ? {} : { vol: o.vol }) });
  return renderizar((a) => void tocarReceita(a, receita)).amostras;
}

export interface ParMedido {
  readonly a: string;
  readonly b: string;
  readonly partes: Partes;
}

/** Todos os pares (i < j) de uma lista nomeada. */
export function paresDe(itens: readonly { nome: string; d: Descritores }[], esc: Escalas): ParMedido[] {
  const saida: ParMedido[] = [];
  for (let i = 0; i < itens.length; i++)
    for (let j = i + 1; j < itens.length; j++) saida.push({ a: (itens[i] as { nome: string }).nome, b: (itens[j] as { nome: string }).nome, partes: distancia((itens[i] as { d: Descritores }).d, (itens[j] as { d: Descritores }).d, esc) });
  return saida;
}

export const maisProximo = (pares: readonly ParMedido[]): ParMedido => pares.reduce((m, p) => (p.partes.S < m.partes.S ? p : m));

export const fmt = (p: ParMedido): string =>
  `${p.a} x ${p.b}: S=${p.partes.S.toFixed(2)} (dT ${p.partes.dT.toFixed(2)} dC ${p.partes.dC.toFixed(2)} dE ${p.partes.dE.toFixed(2)} dP ${p.partes.dP.toFixed(2)})`;

export const LUTADORES_COM_VOZ: readonly IdLutador[] = IDS_LUTADORES;
