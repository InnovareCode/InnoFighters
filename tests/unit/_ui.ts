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
      return true;
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

/** Os 10 lutadores do elenco (E5 + o ZENON): nome, tom de voz e cenário da casa (iguais aos dos dados reais). */
const ELENCO_FALSO: ReadonlyArray<readonly [string, string, number, string]> = [
  ['hayato', 'HAYATO', 1.05, 'jp'],
  ['wei-long', 'WEI LONG', 0.82, 'cn'],
  ['min-ji', 'MIN-JI', 1.55, 'kr'],
  ['caio', 'CAIO', 0.98, 'br'],
  ['aminu', 'AMINU', 0.9, 'ng'],
  ['centella', 'CENTELLA', 1.2, 'mx'],
  ['camille', 'CAMILLE', 1.1, 'fr'],
  ['nila', 'NILA', 1.12, 'in'],
  ['baatar', 'BAATAR', 0.7, 'mn'],
  ['zenon', 'ZENON', 0.76, 'gr'],
];

/**
 * Dublê do `GerenciadorDeArte` para as cenas: tudo pronto, nada carrega. Política `'fixa'` (o `Navegador` só chama `entrarNaLuta`, que em `'fixa'` é o `usar` de sempre).
 * `extra` sobrescreve/acrescenta (ex.: `carregarFilme`, `soltarFilme`, `politica: 'por-peso'`).
 */
export function arteFalsa(extra: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    politica: 'fixa',
    pedir: () => undefined,
    usar: () => undefined,
    entrarNaLuta: () => undefined,
    preferir: () => undefined,
    aliviar: () => undefined,
    garantir: () => Promise.resolve(),
    estaPronto: () => true,
    prebuscar: () => undefined,
    ...extra,
  };
}

/** Mundo mínimo (só o que as cenas testadas leem): nome, tom e cenário dos 10 lutadores. */
export function mundoFalso(): Mundo {
  const ch = (name: string, pitch: number, stage: string) => ({ ch: { name, pitch, stage, K: 1, scale: 1, fichas: {}, title: 'O Arconte', head: [0, 0, 1, 1] }, arte: { retrato: () => null } });
  const elenco = Object.fromEntries(ELENCO_FALSO.map(([id, nome, tom, cen]) => [id, ch(nome, tom, cen)]));
  return { elenco, arte: arteFalsa() } as unknown as Mundo;
}

/** Igual a `mundoFalso` (desde a E5 as regras padrão já têm os 9): mantido pelo nome que os testes da E4 usam. */
export const mundoFalso9 = mundoFalso;
