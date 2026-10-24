import type { PedidoDeArte } from '../assets/gerenciador';
import type { IdLutador } from '../core/contratos';
import { CENARIO_PADRAO } from '../data/cenarios';
import { LUTADORES, VITRINE } from '../data/lutadores';
import type { Mundo } from './contexto';
import type { ArgsDiff, ArgsEnding, ArgsFight, ArgsResult, ArgsContinue, NomeCena } from './tipos';

/*
 * O que cada cena precisa na memória (docs/spec-residencia-de-memoria.md §2.3): PURO, sem gerenciador nem navegador, testável sozinho (mesmo padrão de `src/trailer/carga.ts`).
 * O `Navegador` aplica isto no `go`/`set` quando a política é `'por-peso'`. O `switch` é exaustivo em `NomeCena`: cena nova sem linha aqui não compila.
 */

export interface ArteDaCena {
  /** Em uso enquanto a cena está na tela; a troca de cena segura no preto até chegar (com teto: `TETO_DO_PRETO`). */
  readonly essencial: PedidoDeArte;
  /** Fila de fundo, um item por vez, só o que cabe no teto sem soltar nada em uso nem preferido. */
  readonly desejavel?: PedidoDeArte;
  /** VS e luta: solta tudo o que está fora do essencial ao entrar. */
  readonly exclusiva?: true;
}

/** Os cenários da vitrine, na ordem de prioridade: o fundo dos menus primeiro (`jp`), depois a casa de cada um da vitrine (os mesmos `cenariosPreferidos` do gerenciador). */
export const CENARIOS_DA_VITRINE: readonly string[] = [...new Set<string>([CENARIO_PADRAO, ...VITRINE.map((id) => LUTADORES[id].stage)])];

const FUNDO: readonly string[] = [CENARIO_PADRAO];

/**
 * A arte dos dois primeiros planos do trailer (P0 e P1: o HAYATO no jp e o HAYATO contra o WEI LONG no cn): a única que a cena do trailer mantém ao entrar. Se já estava na memória
 * (a etapa 1 do boot a trouxe, e o aquecimento do 1º desenho já rodou), a abertura não paga decodificação nem rede de novo. Um teste confere com o roteiro (`arteDoPlano` de P0 + P1).
 */
export const ARTE_DE_ABERTURA_DO_TRAILER: PedidoDeArte = { lutadores: VITRINE.slice(0, 2), cenarios: VITRINE.slice(0, 2).map((id) => LUTADORES[id].stage) };

/** Os ids presentes (args parciais, de testes e ganchos, não derrubam a tabela). */
const ids = (...xs: ReadonlyArray<string | undefined>): string[] => [...new Set(xs.filter((x): x is string => typeof x === 'string'))];

/** A dupla da luta e o cenário dela (a casa do rival, salvo `stage` explícito). */
function dupla(a: Partial<ArgsFight> | undefined, m: Pick<Mundo, 'elenco'>): PedidoDeArte {
  const cfg = a?.cfg;
  const c2 = cfg?.c2 as IdLutador | undefined;
  const stage = cfg?.stage ?? (c2 ? m.elenco[c2]?.ch.stage : undefined);
  return { lutadores: ids(cfg?.c1, c2), cenarios: ids(stage) };
}

export function arteDaCena(nome: NomeCena, args: unknown, m: Pick<Mundo, 'elenco'>): ArteDaCena {
  switch (nome) {
    case 'boot':
      return { essencial: {} }; // o `iniciarArte` cuida do boot: a etapa 0 antes do `data-pronto`, a etapa 1 (retratos e vitrine, em segundo plano) logo depois
    case 'intro':
      return { essencial: { lutadores: VITRINE, cenarios: CENARIOS_DA_VITRINE } };
    case 'trailer':
      // T12: o trailer NÃO segura a vitrine. Entra exclusivo (solta o resto, inclusive o que a etapa 1 já trouxe) e a `CargaEscalonada` dele pede e solta a arte de cada plano, com o plano atual e o
      // seguinte na memória: pico de ~145 MiB de imagem, contra 164 com a vitrine fixa. Não há espera no preto (a VS e a luta são as exclusivas que esperam; o trailer nunca espera a rede).
      return { essencial: ARTE_DE_ABERTURA_DO_TRAILER, exclusiva: true };
    case 'title':
      return { essencial: { lutadores: VITRINE, cenarios: FUNDO }, desejavel: { cenarios: CENARIOS_DA_VITRINE.slice(1) } };
    case 'menu':
      return { essencial: { lutadores: VITRINE.slice(0, 1), cenarios: FUNDO }, desejavel: { lutadores: VITRINE.slice(1) } };
    case 'select':
    case 'how':
    case 'options':
      return { essencial: { cenarios: FUNDO } };
    case 'diff':
      return { essencial: { lutadores: ids((args as Partial<ArgsDiff> | undefined)?.c1), cenarios: FUNDO } };
    case 'chefe':
      return { essencial: {} }; // só o retrato (sempre residente)
    case 'vs':
    case 'fight':
      return { essencial: dupla(args as Partial<ArgsFight> | undefined, m), exclusiva: true };
    case 'result': {
      const d = dupla((args as Partial<ArgsResult> | undefined)?.a, m);
      return { essencial: { lutadores: d.lutadores ?? [], cenarios: FUNDO }, desejavel: { lutadores: VITRINE } };
    }
    case 'continue': {
      const d = dupla((args as Partial<ArgsContinue> | undefined)?.a, m);
      return { essencial: { lutadores: d.lutadores ?? [], cenarios: FUNDO } };
    }
    case 'ending':
      return { essencial: { lutadores: ids((args as Partial<ArgsEnding> | undefined)?.run?.c1), cenarios: FUNDO }, desejavel: { lutadores: VITRINE } };
    case 'desbloqueio':
      return { essencial: { cenarios: FUNDO }, desejavel: { lutadores: VITRINE } };
    default: {
      const _exaustivo: never = nome;
      return _exaustivo;
    }
  }
}
