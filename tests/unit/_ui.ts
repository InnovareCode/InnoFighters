import type { AudioSys } from '../../src/audio/audio-sys';
import type { Configuracoes } from '../../src/core/contratos';
import { CONFIGURACOES_PADRAO } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { progressoVazio, REGRAS_PADRAO, type Regras } from '../../src/meta';
import type { Entrada } from '../../src/input/entrada';
import type { Ctx } from '../../src/render/tela';
import type { Contexto, Mundo, Persistencia } from '../../src/ui/contexto';
import { criarFerramentas } from '../../src/ui/ferramentas';
import { Navegador } from '../../src/ui/navegador';

/** Contexto 2D falso que grava chamadas ([nome, ...args]). */
export function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return (...a: unknown[]) => {
          chamadas.push([nome, ...a]);
          return { addColorStop: () => undefined };
        };
      }
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set() {
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas, textos: () => chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t)) };
}

/** Áudio falso: grava o nome e os argumentos de cada método chamado. */
export function audioFalso() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const audio = new Proxy({ ctx: null } as Record<string, unknown>, {
    get(alvo, nome: string) {
      if (nome in alvo) return alvo[nome];
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
  }) as unknown as AudioSys;
  return { audio, chamadas, nomes: () => chamadas.map(([n]) => n) };
}

/** Navegador com contexto falso (sem navegador de verdade): serve para testar a lógica das cenas. */
export function navegadorFalso(settings: Partial<Configuracoes> = {}, regras: Regras = REGRAS_PADRAO) {
  const g = gravador();
  const a = audioFalso();
  const salvou = { n: 0 };
  const persist: Persistencia = {
    settings: { ...CONFIGURACOES_PADRAO, ...settings },
    hi: 0,
    prog: progressoVazio(),
    salvar() {
      salvou.n++;
    },
  };
  const entrada = {} as unknown as Entrada;
  const c: Contexto = {
    ctx: g.ctx,
    f: criarFerramentas(g.ctx),
    audio: a.audio,
    persist,
    entrada,
    rngVisual: criarRng(1),
    rngUI: criarRng(2),
    regras,
    alternarTelaCheia: () => undefined,
    temToque: () => false,
  };
  const ui = new Navegador(c);
  return { ui, c, g, audio: a, persist, salvou };
}

/** Mundo mínimo (só o que as cenas testadas leem): nome e tom de voz dos 4 lutadores. */
export function mundoFalso(): Mundo {
  const ch = (name: string, pitch: number) => ({ ch: { name, pitch }, arte: {} });
  return {
    elenco: { hayato: ch('HAYATO', 1.05), 'wei-long': ch('WEI LONG', 0.82), 'min-ji': ch('MIN-JI', 1.55), caio: ch('CAIO', 0.98) },
  } as unknown as Mundo;
}

/** Mundo mínimo para as 9 regras falsas (E4): nome, tom e cenário dos 9 lutadores. */
export function mundoFalso9(): Mundo {
  const ch = (name: string, pitch: number, stage: string) => ({ ch: { name, pitch, stage, K: 1, scale: 1 }, arte: { retrato: () => null } });
  const elenco = {
    hayato: ch('HAYATO', 1.05, 'jp'),
    'wei-long': ch('WEI LONG', 0.82, 'cn'),
    'min-ji': ch('MIN-JI', 1.55, 'kr'),
    caio: ch('CAIO', 0.98, 'br'),
    'novo-a': ch('NOVO A', 1, 'jp'),
    'novo-b': ch('NOVO B', 1, 'cn'),
    'novo-c': ch('NOVO C', 1, 'kr'),
    'novo-d': ch('NOVO D', 1, 'br'),
    'chefe-x': ch('CHEFE X', 0.7, 'br'),
  };
  return { elenco, arte: { pedir: () => undefined, usar: () => undefined, estaPronto: () => true, prebuscar: () => undefined } } as unknown as Mundo;
}
