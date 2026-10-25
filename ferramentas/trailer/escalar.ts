import type { EstadoLutador, EventoLuta, IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { TICKS_POR_COMPASSO, temMotor, type IdPlano, type PlanoComMotor, type RoteiroDoTrailer, type Tomada, type TomadasDoTrailer } from '../../src/data/trailer/tipos';
import type { LutadorMontado } from '../../src/data/montar';
import { DiretorDoTrailer, modoDoFilme } from '../../src/trailer/diretor';
import { ticksDoFilmeNoTrailer } from '../../src/trailer/filme';
import { casaBatida } from '../../src/trailer/ritmo';

/*
 * CONFERÊNCIA do trailer (R-14). Antes esta ferramenta ESCALAVA: procurava, entre sementes e níveis de CPU, uma luta que cumprisse os golpes do roteiro. Agora os dois lutadores são humanos e a luta
 * é a PARTITURA (src/data/trailer/partitura.ts, escrita à mão): não há o que procurar. A ferramenta roda o diretor REAL sobre as tomadas compiladas e CONFERE: cada batida cai no tick do plano que o
 * roteiro pede (`alvo` ± `folga`) e no tick do motor que a partitura declara; imprime a impressão (hash) de cada plano e as regras de ritmo (parado, congelado, último quadro). O RASTRO de um plano
 * (quem faz o quê, tick a tick) é o instrumento de afinar a partitura à mão: "o CI aponta a batida; o reajuste é manual e de minutos" (spec K6).
 */

type Elenco = Readonly<Record<IdLutador, LutadorMontado>>;

export interface LadoAmostra {
  readonly state: EstadoLutador;
  readonly move: string | null;
  readonly mt: number;
  readonly x: number;
  readonly y: number;
  readonly facing: 1 | -1;
  readonly hp: number;
  readonly en: number;
  readonly pose: string;
}
export interface Amostra {
  readonly plano: IdPlano;
  /** Tick do PLANO (0..191). */
  readonly tau: number;
  /** Tick do MOTOR deste quadro (0-based; só vale quando `andou`). */
  readonly m: number;
  readonly andou: boolean;
  readonly lenta: number;
  /** A tarja do super ou um filme congela o motor neste quadro? (o plano não conta como "parado" nesses quadros) */
  readonly congelado: boolean;
  /** O FILME do especial está tocando neste quadro (ele é movimento, não congelamento)? */
  readonly emFilme: boolean;
  readonly eventos: readonly EventoLuta[];
  readonly lado: readonly [LadoAmostra, LadoAmostra];
}

/** Roda o diretor REAL sobre o trailer inteiro e devolve, por plano de luta, uma amostra por quadro mais as impressões. */
export function percorrer(roteiro: RoteiroDoTrailer, tomadas: TomadasDoTrailer, elenco: Elenco): { amostras: Map<IdPlano, Amostra[]>; impressoes: Map<IdPlano, string>; reservas: readonly IdPlano[] } {
  const d = new DiretorDoTrailer(roteiro, tomadas, { lutadores: elenco, criarRng });
  const amostras = new Map<IdPlano, Amostra[]>();
  const motor = new Map<IdPlano, number>();
  const filmeAte = new Map<IdPlano, number>();
  while (!d.fim) {
    d.prerolar(Number.POSITIVE_INFINITY);
    const q = d.avancar();
    const luta = q.luta;
    if (!temMotor(q.plano) || !luta) continue;
    const id = q.plano.id;
    const m = motor.get(id) ?? 0;
    if (q.motorAndou) motor.set(id, m + 1);
    if (q.filme && temMotor(q.plano)) filmeAte.set(id, q.tickNoPlano + ticksDoFilmeNoTrailer(q.filme.ev.atacante === 0 ? q.plano.c1 : q.plano.c2, q.filme.ev, modoDoFilme(q.plano, q.filme.ev)));
    const lista = amostras.get(id) ?? [];
    lista.push({
      plano: id,
      tau: q.tickNoPlano,
      m,
      andou: q.motorAndou,
      lenta: q.lenta,
      // motor parado sem câmera lenta = congelado pela tarja do super ou pelo filme
      congelado: !q.motorAndou && q.lenta === 1,
      emFilme: q.tickNoPlano <= (filmeAte.get(id) ?? -1),
      eventos: q.eventos,
      lado: luta.fighters.map((f) => ({ state: f.state, move: f.move, mt: f.mt, x: f.x, y: f.y, facing: f.facing, hp: f.hp, en: f.en, pose: f.pose.name })) as unknown as readonly [LadoAmostra, LadoAmostra],
    });
    amostras.set(id, lista);
  }
  return { amostras, impressoes: new Map(d.impressoes()), reservas: d.planosEmReserva() };
}

export interface BatidaMedida {
  readonly i: number;
  readonly tipo: string;
  /** Tick do motor em que a partitura declarou o acerto e em que o motor o produziu pela 1ª vez (null = não aconteceu). */
  readonly declarado: number;
  readonly real: number | null;
  /** Tick do plano em que o acerto cai (null = não aconteceu) e o alvo do roteiro. */
  readonly tau: number | null;
  readonly alvo: number;
  readonly folga: number;
  readonly ok: boolean;
}

export function medirBatidas(plano: PlanoComMotor, tomada: Tomada, amostras: readonly Amostra[]): BatidaMedida[] {
  return plano.pede.map((pedida, i) => {
    const g = tomada.batidas[i];
    const declarado = (g?.tickMotor ?? 0) - tomada.inicio - 1;
    const alvo = pedida.alvo ?? (plano.compassos * TICKS_POR_COMPASSO) / 2;
    const folga = pedida.folga ?? 60;
    const noDeclarado = amostras.find((x) => x.andou && x.m === declarado && x.eventos.some((ev) => casaBatida(pedida, ev)));
    const primeiro = amostras.find((x) => x.andou && x.eventos.some((ev) => casaBatida(pedida, ev)));
    const tau = (noDeclarado ?? primeiro)?.tau ?? null;
    return {
      i,
      tipo: `${pedida.tipo}${pedida.golpe ? ' ' + pedida.golpe : ''} do ${pedida.lutador === 0 ? 'P1' : 'P2'}`,
      declarado,
      real: primeiro ? primeiro.m : null,
      tau,
      alvo,
      folga,
      ok: noDeclarado !== undefined && tau !== null && Math.abs(tau - alvo) <= folga,
    };
  });
}

export interface RegrasMedidas {
  /** Maior sequência de quadros com o lutador em `idle`, por lutador (não conta quadros congelados pela tarja/filme). */
  readonly paradoMax: readonly [number, number];
  readonly paradosJuntosMax: number;
  /** Quadros seguidos com o motor congelado (tarja do super/filme). */
  readonly congeladoMax: number;
  /** O estado dos dois no último quadro. */
  readonly ultimo: readonly [EstadoLutador, EstadoLutador];
  /** Há alguém em movimento no último quadro? (nada de nocaute imóvel) */
  readonly ultimoEmMovimento: boolean;
}

const EM_MOVIMENTO: ReadonlySet<EstadoLutador> = new Set<EstadoLutador>(['walk', 'move', 'jump', 'prejump', 'dash', 'hit', 'esquiva', 'block', 'land', 'win']);

export function medirRegras(amostras: readonly Amostra[]): RegrasMedidas {
  const correr = [0, 0];
  const max = [0, 0];
  let juntos = 0;
  let juntosMax = 0;
  let cong = 0;
  let congMax = 0;
  for (const a of amostras) {
    cong = a.congelado && !a.emFilme ? cong + 1 : 0;
    congMax = Math.max(congMax, cong);
    if (a.congelado) continue;
    for (const k of [0, 1] as const) {
      correr[k] = (a.lado[k] as LadoAmostra).state === 'idle' ? (correr[k] as number) + 1 : 0;
      max[k] = Math.max(max[k] as number, correr[k] as number);
    }
    juntos = (correr[0] as number) > 0 && (correr[1] as number) > 0 ? juntos + 1 : 0;
    juntosMax = Math.max(juntosMax, juntos);
  }
  const fim = amostras[amostras.length - 1];
  const ultimo = (fim ? [fim.lado[0].state, fim.lado[1].state] : ['idle', 'idle']) as [EstadoLutador, EstadoLutador];
  // o filme tocando no último quadro é movimento (o plano termina no filme e a logo corta)
  return { paradoMax: [max[0] as number, max[1] as number], paradosJuntosMax: juntosMax, congeladoMax: congMax, ultimo, ultimoEmMovimento: fim?.emFilme === true || ultimo.some((s) => EM_MOVIMENTO.has(s)) };
}

const EVENTOS_DO_RASTRO = new Set(['hit', 'block', 'throw', 'special', 'filme', 'ko', 'parry', 'esquivou', 'armor', 'quebra-guarda', 'projectile', 'deny']);

/** O RASTRO de um plano, linha a linha (para afinar a partitura à mão): tick do plano, tick do motor, estado de cada lutador, distância e os eventos de contato. */
export function rastroDoPlano(amostras: readonly Amostra[], de = 0, ate = 191): string[] {
  const linhas: string[] = [];
  const f = (l: LadoAmostra): string => `${l.state}${l.move ? ':' + l.move : ''}${l.mt ? '.' + l.mt : ''}@${Math.round(l.x)}${l.y < 469 ? '^' + Math.round(470 - l.y) : ''}`;
  for (const a of amostras) {
    if (a.tau < de || a.tau > ate) continue;
    const [p1, p2] = a.lado;
    const evs = a.eventos
      .filter((e) => EVENTOS_DO_RASTRO.has(e.tipo))
      .map((e) => {
        const x = e as unknown as Record<string, unknown>;
        const quem = x['atacante'] ?? x['lutador'] ?? x['defensor'];
        return `${e.tipo}${x['golpe'] ? ':' + String(x['golpe']) : ''}${x['super'] ? '*' : ''}${quem === undefined ? '' : '/' + String(quem)}`;
      })
      .join(' ');
    linhas.push(
      `${String(a.tau).padStart(3)} m${a.andou ? String(a.m).padStart(3) : ' --'}${a.lenta > 1 ? ' L' + a.lenta : '   '} | ${f(p1).padEnd(26)} | ${f(p2).padEnd(26)} | d${String(Math.round(Math.abs(p1.x - p2.x))).padStart(3)} hp ${Math.round(p1.hp)}/${Math.round(p2.hp)} en ${Math.round(p1.en)}/${Math.round(p2.en)} ${evs}`,
    );
  }
  return linhas;
}

/** Roda o diretor real e devolve só a impressão de cada plano de luta. */
export function impressoesDoDiretor(roteiro: RoteiroDoTrailer, tomadas: TomadasDoTrailer, elenco: Elenco): { impressoes: Map<IdPlano, string>; reservas: readonly IdPlano[] } {
  const { impressoes, reservas } = percorrer(roteiro, tomadas, elenco);
  return { impressoes, reservas };
}
