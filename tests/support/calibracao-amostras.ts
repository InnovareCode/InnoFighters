import { GANHO_DB_MAX, idsConhecidos } from '../../src/data/sons/amostras';
import { IDS_LUTADORES, type EventoLuta, type IdLutador } from '../../src/core/contratos';
import { DADOS_SONS } from '../../src/data/sons';
import type { ContextoSonoro } from '../../src/audio/identidade-sonora';
import { renderGenerico, renderPlano } from './plano';

/*
 * A RÉGUA DE VOLUME das amostras (docs/plano-sons-realistas.md §4.2 passo 4 e §6.3): o `ganhoDb` de cada corte do manifesto é calibrado para o RMS da amostra ficar a
 * ±3 dB do som SINTETIZADO que ela substitui. Aqui mora a referência: o RMS (região ativa, dBFS) do som de hoje, medido no AudioSys real sobre o motor offline.
 * O pacote real traz `rmsDb` (medido pela curadoria) e a Íris/Vega testam no Node sem decodificar MP3: `rmsDb + ganhoDb + MASTER_DB` contra a referência.
 */

/** O que o `master` (0,9) faz com tudo o que sai: as referências são medidas no destino, com o `sfx` em 1. */
export const MASTER_DB = 20 * Math.log10(0.9);
export const TOLERANCIA_DB = 3;

export interface Referencia {
  readonly id: string;
  /** RMS da região ativa do som sintetizado que a amostra substitui, em dBFS, medido no destino. */
  readonly rmsDb: number;
  readonly como: string;
}

const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
const hit = (o: object): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5, ...o }) as EventoLuta;
const outroDe = (id: IdLutador): IdLutador => (id === 'caio' ? 'hayato' : 'caio');
/** O lutador `id` como índice 0 (atacante, kiai, vencedor) ou 1 (defensor: dano, KO, guarda quebrada). */
const comoAtacante = (id: IdLutador, ficha: string | null = null): ContextoSonoro => ({ ids: [id, outroDe(id)], fichas: [ficha, null], semente: 11, tick: 100 });
const comoDefensor = (id: IdLutador): ContextoSonoro => ({ ids: [outroDe(id), id], fichas: [null, null], semente: 11, tick: 100 });

/** Família -> a assinatura cujo acerto ela acompanha (a de referência de volume). */
const ASSINATURA_DA_FAMILIA: Readonly<Record<string, [IdLutador, string, string]>> = {
  'esp.e1.raio': ['hayato', 'base', 'sFire'],
  'esp.e2.dragao': ['wei-long', 'base', 'sFire'],
  'esp.e3.lamina': ['min-ji', 'base', 'sFire'],
  'esp.e4.ginga': ['caio', 'base', 'sFire'],
  'esp.e5.tambor': ['aminu', 'base', 'sFire'],
  'esp.e6.ringue': ['centella', 'base', 'sFire'],
  'esp.e7.florete': ['camille', 'base', 'sFwd'], // a PARADE (sFire) não tem estampa de acerto
  'esp.e8.chenda': ['nila', 'base', 'sFire'],
  'esp.e9.serpente': ['nila', 'sarpa', 'sFire'],
  'esp.e10.estepe': ['baatar', 'base', 'sFire'],
  'esp.e11.aguia': ['baatar', 'base', 'sFwd'],
  'esp.e12.selo': ['zenon', 'base', 'sFire'],
};

const GENERICOS: Readonly<Record<string, [string, (a: import('../../src/audio/audio-sys').AudioSys) => void]>> = {
  'imp.soco.leve': ['punch()', (a) => a.punch()],
  'imp.soco.forte': ['punch()', (a) => a.punch()],
  'imp.chute.leve': ['kick()', (a) => a.kick()],
  'imp.chute.forte': ['kick()', (a) => a.kick()],
  defesa: ['block()', (a) => a.block()],
  'guarda.quebra': ['fireballHit()', (a) => a.fireballHit()],
  arremesso: ['kick()', (a) => a.kick()],
  'ko.queda': ['kick() (som novo: o corpo cai; sem sintético que ele troque)', (a) => a.kick()],
  'golpe.ar.leve': ['swing(0)', (a) => a.swing(0)],
  'golpe.ar.forte': ['swing(1)', (a) => a.swing(1)],
  esquiva: ['swing(1)', (a) => a.swing(1)],
  pouso: ['land()', (a) => a.land()],
  salto: ['jump()', (a) => a.jump()],
  'magia.lanca': ['fireballLaunch()', (a) => a.fireballLaunch()],
  'magia.impacto': ['fireballHit()', (a) => a.fireballHit()],
};

const rmsDaVoz = (ev: EventoLuta, ctx: ContextoSonoro): number => renderPlano(ev, ctx, DADOS_SONS, 'so-voz', 1).d.rmsAtivoDb;
const rmsDaEstampa = (ev: EventoLuta, ctx: ContextoSonoro): number => renderPlano(ev, ctx, DADOS_SONS, 'sem-voz', 1).d.rmsAtivoDb;

let cache: Map<string, Referencia> | null = null;

/** A referência sintética de TODO id da tabela (os de voz por lutador, os de família, o foley). Calculada uma vez por processo. */
export function referencias(): ReadonlyMap<string, Referencia> {
  if (cache) return cache;
  const m = new Map<string, Referencia>();
  const poe = (id: string, rmsDb: number, como: string): void => void m.set(id, { id, rmsDb, como });
  for (const [id, [como, tocar]] of Object.entries(GENERICOS)) poe(id, renderGenerico(tocar, 1).d.rmsAtivoDb, como);
  for (const [id, [l, ficha, golpe]] of Object.entries(ASSINATURA_DA_FAMILIA)) {
    poe(id, rmsDaEstampa(hit({ especial: true, golpe }), comoAtacante(l, ficha === 'base' ? null : ficha)), `estampa sintetizada de ${l}.${ficha}.${golpe}`);
  }
  for (const l of IDS_LUTADORES) {
    // o golpe de referência do kiai: o 1º do lutador que tem grito (a PARADE da CAMILLE não grita)
    const golpeComGrito = Object.entries(DADOS_SONS.assinaturas).find(([k, a]) => k.startsWith(`${l}.base.`) && a.grito !== null)?.[0].split('.')[2] ?? 'sFire';
    const temEsforco = DADOS_SONS.perfis[l]?.gritos?.esforco !== undefined;
    const kiai = rmsDaVoz({ tipo: 'special', lutador: 0, pitch: 1, golpe: golpeComGrito, ficha: null, momento: 'inicio' }, comoAtacante(l));
    const leve = rmsDaVoz(hit({}), comoDefensor(l));
    const pesado = rmsDaVoz(hit({ grande: true }), comoDefensor(l));
    const ko = rmsDaVoz({ tipo: 'ko', defensor: 1, pitch: 1 }, comoDefensor(l));
    const guarda = rmsDaVoz({ tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT }, comoDefensor(l));
    const esforco = temEsforco ? rmsDaVoz({ tipo: 'armor', atacante: 0, defensor: 1, x: 0, y: 0, snd: 'punch', texto: TXT }, comoDefensor(l)) : pesado;
    const vitoria = rmsDaVoz({ tipo: 'round', fase: 'end', round: 2, vencedor: 0, fimDaLuta: true }, comoAtacante(l));
    poe(`voz.${l}.kiai`, kiai, `grito do especial ${golpeComGrito} sintetizado`);
    poe(`voz.${l}.leve`, leve, 'dano leve sintetizado');
    poe(`voz.${l}.leve2`, leve, 'dano leve sintetizado');
    poe(`voz.${l}.pesado`, pesado, 'dano pesado sintetizado');
    poe(`voz.${l}.pesado2`, pesado, 'dano pesado sintetizado');
    poe(`voz.${l}.ko`, ko, 'grito de KO sintetizado (sem o gongo)');
    poe(`voz.${l}.guarda`, guarda, 'grito da guarda quebrada sintetizado');
    poe(`voz.${l}.esforco`, esforco, temEsforco ? 'esforço da armadura sintetizado' : 'dano pesado sintetizado (o lutador não tem esforço)');
    poe(`voz.${l}.vitoria`, vitoria, 'kiai de vitória sintetizado');
  }
  poe('voz.nila.sarpa.kiai', rmsDaVoz({ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: 'sarpa', momento: 'inicio' }, comoAtacante('nila', 'sarpa')), 'grito da SARPA sintetizado');
  poe('voz.zenon.riso', m.get('voz.zenon.vitoria')?.rmsDb ?? -20, 'kiai de vitória do ZENON sintetizado');
  for (const id of idsConhecidos()) if (!m.has(id)) throw new Error(`calibração: sem referência para o id '${id}'`);
  cache = m;
  return m;
}

/**
 * Teto do pico DEPOIS do ganho, em dBFS, antes do master: o limitador do master (-3 dB, razão 20) segura o resto, mas um transiente a +8 dBFS vira estalo. O som sintético
 * de hoje já passa de 0 dBFS no barramento (o KO tem pico 1,37 = +2,7 dB); aqui o teto é +1,5 dBFS.
 */
export const PICO_MAXIMO_DEPOIS_DO_GANHO_DB = 1.5;

export interface GanhoCalibrado {
  readonly ganhoDb: number;
  /** O RMS pedia mais ganho do que o pico deixa: o corte é um transiente seco e fica abaixo da síntese (decisão de ouvido, não de régua). */
  readonly limitadoPeloPico: boolean;
}

/** O ganho em dB que põe o RMS do corte (`rmsDb`) na referência (±36 dB), sem estourar o teto de pico (`picoDb`, se informado). */
export function ganhoCalibrado(id: string, rmsDb: number, picoDb?: number): GanhoCalibrado {
  const ref = referencias().get(id);
  if (!ref) throw new Error(`sem referência para '${id}'`);
  const pedido = Math.max(-GANHO_DB_MAX, Math.min(GANHO_DB_MAX, Math.round((ref.rmsDb - MASTER_DB - rmsDb) * 10) / 10));
  const teto = picoDb === undefined ? Infinity : Math.floor((PICO_MAXIMO_DEPOIS_DO_GANHO_DB - picoDb) * 10) / 10;
  return pedido > teto ? { ganhoDb: teto, limitadoPeloPico: true } : { ganhoDb: pedido, limitadoPeloPico: false };
}

/** Só o ganho (sem olhar o pico): a calibração pura. */
export const ganhoSugeridoDb = (id: string, rmsDb: number): number => ganhoCalibrado(id, rmsDb).ganhoDb;
