import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { INPUT_VAZIO, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { AMINU, BAATAR, CAMILLE, CENTELLA, NILA } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { Golpe, LutadorDef } from '../../src/data/tipos';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { montarTodos } from './_lutadores';

/*
 * Utilidades dos testes de E3 (S1b BAATAR e S2 AMINU). As definições novas são montadas sobre o atlas do WEI LONG
 * (a arte própria só chega na E5), e entram num elenco FORA da produção: `LUTADORES`/`ROSTER` seguem com 4.
 */

export const ID_BAATAR = BAATAR.id;
export const ID_AMINU = AMINU.id;
export const ID_CENTELLA = CENTELLA.id;
export const ID_CAMILLE = CAMILLE.id;
export const ID_NILA = NILA.id;

export function posesWei() {
  const url = new URL('../../public/assets/lutadores/wei-long/atlas.json', import.meta.url);
  return manifestoParaPoses(JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as ManifestoAtlas);
}

export function montarFixtura(def: LutadorDef): LutadorMontado {
  return montarLutador(def, posesWei());
}

/** Os 4 lutadores de produção mais os da E3 (ou versões alteradas deles, para os testes de mutação de dados). */
export function elencoE3(
  extra: Partial<Record<'baatar' | 'aminu' | 'centella' | 'camille' | 'nila', LutadorDef>> = {},
): Record<IdLutador, LutadorMontado> {
  return {
    ...montarTodos(),
    [ID_BAATAR]: montarFixtura(extra.baatar ?? BAATAR),
    [ID_AMINU]: montarFixtura(extra.aminu ?? AMINU),
    [ID_CENTELLA]: montarFixtura(extra.centella ?? CENTELLA),
    [ID_CAMILLE]: montarFixtura(extra.camille ?? CAMILLE),
    [ID_NILA]: montarFixtura(extra.nila ?? NILA),
  } as Record<IdLutador, LutadorMontado>;
}

export const AJUSTES = { rounds: 2, time: 99, shake: true };

export type Quadro = { -readonly [K in keyof InputFrame]: InputFrame[K] };
export type Luta = {
  g: Game;
  frame: { p1: Quadro; p2: Quadro };
  /** Anda `n` ticks e devolve TODOS os eventos emitidos neles, na ordem. */
  passo: (n?: number) => EventoLuta[];
};

/** Luta com as entradas na mão do teste: o que estiver em `frame.p1/p2` é o que cada lado "aperta" no próximo tick. */
export function criarLuta(cfg: ConfigPartida, elenco: Record<IdLutador, LutadorMontado>, rng: Rng = criarRng(5)): Luta {
  const g = new Game({ lutadores: elenco, rng });
  g.setup(cfg, { ...AJUSTES });
  const frame = { p1: { ...INPUT_VAZIO } as Quadro, p2: { ...INPUT_VAZIO } as Quadro };
  const fonte: FonteEntradas = { p1: () => ({ ...frame.p1 }), p2: () => ({ ...frame.p2 }) };
  const luta: Luta = {
    g,
    frame,
    passo: (n = 1) => {
      const eventos: EventoLuta[] = [];
      for (let i = 0; i < n; i++) {
        g.update(fonte);
        eventos.push(...g.events);
      }
      return eventos;
    },
  };
  return luta;
}

/** Anda até o fim da intro. */
export function ateALuta(l: Luta): void {
  for (let i = 0; i < 400 && l.g.phase !== 'fight'; i++) l.passo();
  if (l.g.phase !== 'fight') throw new Error('a luta não saiu da intro');
}

/** Solta todas as teclas dos dois lados. */
export function soltar(l: Luta): void {
  l.frame.p1 = { ...INPUT_VAZIO } as Quadro;
  l.frame.p2 = { ...INPUT_VAZIO } as Quadro;
}

/** O golpe sem a dica de CPU (mutação de dados dos testes). */
export function semIa(g: Golpe): Golpe {
  const { ia: _ia, ...resto } = g;
  void _ia;
  return resto;
}

export const tipos = (ev: readonly EventoLuta[], tipo: EventoLuta['tipo']): EventoLuta[] => ev.filter((e) => e.tipo === tipo);
