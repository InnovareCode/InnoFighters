import type { EventoLuta, IdLutador, InputFrame, MotorV2 } from '../../src/core/contratos';
import { INPUT_VAZIO } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import type { NomeGolpe } from '../../src/data/tipos';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { montarTodos } from './_lutadores';

/*
 * Kit do FILME do especial no motor (V2-3c): monta uma luta de verdade (versus, os dois humanos parados), com os números de PRODUÇÃO
 * (os de `src/data/filmes.ts` são calibrados sobre eles), e deixa o teste dirigir o tick a tick. Nada de dublê: é o `Game` inteiro.
 */
export const PROD = montarTodos({ dadosDeProducao: true });

export const FILMES: MotorV2 = { filmes: true };

type Mao = Partial<InputFrame>;

export type Cena = {
  g: Game;
  /** Todos os eventos desde o início, na ordem. */
  eventos: EventoLuta[];
  /** Os eventos de cada tick (`porTick[n]` = o tick `n` desde `iniciar`). */
  porTick: EventoLuta[][];
  mao: { p1: Mao; p2: Mao };
  /** Anda `n` ticks (o que está em `mao` vale em todos; botões de borda: use `bater`). */
  tick: (n?: number) => void;
};

export type OpcoesCena = {
  motorV2?: MotorV2 | null;
  esquiva?: boolean;
  chefe?: boolean;
  semente?: number;
  /** Modo da luta (padrão versus; o treino nunca mata). */
  modo?: ConfigPartida['mode'];
};

/** Uma luta pronta para dirigir: já em 'fight', lutadores parados e separados. */
export function cena(c1: IdLutador, c2: IdLutador, o: OpcoesCena = {}): Cena {
  const mao = { p1: {} as Mao, p2: {} as Mao };
  const fonte: FonteEntradas = {
    p1: () => ({ ...INPUT_VAZIO, ...mao.p1 }),
    p2: () => ({ ...INPUT_VAZIO, ...mao.p2 }),
  };
  const g = new Game({ lutadores: PROD, rng: criarRng(o.semente ?? 3) });
  const motorV2 = o.motorV2 === undefined ? FILMES : o.motorV2;
  g.setup(
    {
      mode: o.modo ?? 'versus',
      c1,
      c2,
      cpu: null,
      ...(o.chefe ? { chefe: true } : {}),
      ...(o.esquiva ? { esquiva: true } : {}),
      ...(motorV2 ? { motorV2 } : {}),
    },
    { rounds: 2, time: 99, shake: true },
  );
  g.phase = 'fight';
  g.t = 0;
  const eventos: EventoLuta[] = [];
  const porTick: EventoLuta[][] = [];
  const tick = (n = 1): void => {
    for (let i = 0; i < n; i++) {
      g.update(fonte);
      eventos.push(...g.events);
      porTick.push([...g.events]);
    }
  };
  g.p1.x = 380;
  g.p2.x = 520;
  g.p1.en = 100;
  g.p2.en = 100;
  return { g, eventos, porTick, mao, tick };
}

/** Quantos eventos do tipo `t` houve (opcionalmente filtrando). */
export const contar = (ev: readonly EventoLuta[], t: EventoLuta['tipo']): number => ev.filter((e) => e.tipo === t).length;

export const doTipo = <T extends EventoLuta['tipo']>(ev: readonly EventoLuta[], t: T): Extract<EventoLuta, { tipo: T }>[] =>
  ev.filter((e): e is Extract<EventoLuta, { tipo: T }> => e.tipo === t);

export type OpcoesSoltar = {
  /** Depois de posicionar os dois e antes de o golpe começar (ajustar vida, ficha, guarda do rival...). */
  antes?: (c: Cena) => void;
  /** Antes de CADA tick (`i` = 0 no primeiro): prender o rival no lugar, apertar um botão num tick certo... */
  cada?: (c: Cena, i: number) => void;
  limite?: number;
};

/**
 * Faz o P1 soltar o golpe `golpe` contra o P2 a `d` px (centro a centro) e anda até o golpe e os projéteis acabarem (ou `limite`).
 */
export function soltar(c: Cena, golpe: NomeGolpe, d: number, o: OpcoesSoltar = {}): void {
  c.g.p1.x = 480 - d / 2;
  c.g.p2.x = 480 + d / 2;
  c.g.p1.facing = 1;
  c.g.p2.facing = -1;
  o.antes?.(c);
  c.g.p1.startMove(golpe, c.g);
  const limite = o.limite ?? 160;
  for (let i = 0; i < limite; i++) {
    o.cada?.(c, i);
    c.tick();
    if (c.g.p1.move === null && c.g.projectiles.length === 0) break;
  }
}
