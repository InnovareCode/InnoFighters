import type { FaseLuta } from '../../core/contratos';

/*
 * CONTADOR DE RITMO (docs/spec-redesenho-jogabilidade.md §5.2.1, R-1, só DEV): classifica CADA tick da cena de luta num motivo
 * mutuamente exclusivo, para medir "tempo sem controle" sem a subamostragem de 100 ms do diagnóstico da Íris (que perdia o
 * hitstop, curto). `motivoDoTick` é PURA: recebe o estado da cena no instante em que `CenaFight.update()` decide o que fazer
 * neste tick (antes de qualquer efeito colateral), e devolve exatamente um motivo, ou `null` quando o tick não conta (a PAUSA
 * do menu, ou a cena ainda esperando a arte — nenhum dos dois é "jogo", nem "sem controle dele": simplesmente não rodou).
 *
 * A ordem dos `if` é a MESMA ordem em que `CenaFight.update()` decide o que fazer no tick (entrada do chefão > provocação >
 * filme > tarja > fase do motor > hitstop > jogável): cada tick cai em exatamente um motivo, nunca dois, por construção.
 */

export type MotivoRitmo =
  | 'jogavel'
  | 'hitstop'
  | 'tarja'
  | 'flash-super'
  | 'filme'
  | 'provocacao'
  | 'intro'
  | 'ko'
  | 'roundend'
  | 'matchend'
  | 'entrada-chefe'
  | 'cena-chefe';

/** Todos os motivos, na ordem do contrato (§4) — usado para inicializar o contador zerado. */
export const MOTIVOS_RITMO: readonly MotivoRitmo[] = [
  'jogavel',
  'hitstop',
  'tarja',
  'flash-super',
  'filme',
  'provocacao',
  'intro',
  'ko',
  'roundend',
  'matchend',
  'entrada-chefe',
  'cena-chefe',
];

/** O que `CenaFight.update()` sabe no início do tick, na mesma ordem em que decide o que fazer. */
export interface EstadoParaRitmo {
  /** A entrada dramática do chefão (apresentação pura, o motor não anda). */
  readonly entradaChefeAtiva: boolean;
  /** A provocação está bloqueando o motor NESTE tick (`Regras.ritmo.provocacao` desligada, ou o balão não é o de round 1 CURTA — R-2). Com a provocação sobreposta à contagem (R-2), o motor anda e este campo é `false`: o tick cai no motivo do `fase`/`hitstop` normal. */
  readonly provocacaoBloqueando: boolean;
  /** O filme do especial está rodando (o motor não anda). */
  readonly filmeAtivo: boolean;
  /** A tarja do especial está rodando bloqueando o motor (`Regras.ritmo.tarja` desligada — o comportamento de hoje). Com a flag ligada (R-2), a faixa não bloqueia e este campo é `false`. */
  readonly tarjaBloqueando: boolean;
  /** Quando `tarjaBloqueando`, se é a tarja do SUPER (congela, R-7) — ainda não existe no motor; sempre `false` por ora. */
  readonly tarjaDoSuper: boolean;
  /** `game.phase` no tick (só relevante quando nada acima bloqueia: o motor rodou). */
  readonly fase: FaseLuta;
  /** `game.hitstop` no tick (só relevante com `fase === 'fight'`). */
  readonly hitstop: number;
}

/** O motivo deste tick, ou `null` se ele não conta (pausa do menu, ou a cena ainda não está pronta). */
export function motivoDoTick(e: EstadoParaRitmo): MotivoRitmo {
  if (e.entradaChefeAtiva) return 'entrada-chefe';
  if (e.provocacaoBloqueando) return 'provocacao';
  if (e.filmeAtivo) return 'filme';
  if (e.tarjaBloqueando) return e.tarjaDoSuper ? 'flash-super' : 'tarja';
  switch (e.fase) {
    case 'intro':
      return 'intro';
    case 'ko':
    case 'timeover': // fim de round por tempo: mesma espera de 100 ticks do KO (game.ts), sem controle do mesmo jeito
      return 'ko';
    case 'roundend':
      return 'roundend';
    case 'matchend':
      return 'matchend';
    case 'cena-chefe':
      return 'cena-chefe';
    case 'fight':
    case 'idle': // nunca deveria chegar aqui depois do 1º `setup()`; cai no mesmo balde de "fight" por segurança
      return e.hitstop > 0 ? 'hitstop' : 'jogavel';
  }
}

/** O contador por motivo de UMA luta (`window.__ritmo`, só DEV). */
export interface ContadorRitmo {
  readonly porMotivo: Record<MotivoRitmo, number>;
  total: number;
}

/** Um contador zerado, com todos os motivos presentes (para `soma dos motivos === total` valer sem precisar somar chaves ausentes). */
export function criarContadorRitmo(): ContadorRitmo {
  const porMotivo = {} as Record<MotivoRitmo, number>;
  for (const m of MOTIVOS_RITMO) porMotivo[m] = 0;
  return { porMotivo, total: 0 };
}

/** Registra um tick no contador (muta `c`; pura o bastante para o teste, sem estado global). */
export function registrarTickDeRitmo(c: ContadorRitmo, motivo: MotivoRitmo): void {
  c.porMotivo[motivo]++;
  c.total++;
}

declare global {
  interface Window {
    /** R-1, só DEV: o contador da luta atual (`CenaFight`), para a Íris medir sem a amostra de 100 ms. */
    __ritmo?: ContadorRitmo;
  }
}
