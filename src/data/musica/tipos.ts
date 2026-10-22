/*
 * Tipos dos DADOS dos temas musicais por lutador (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §3.2 e §3.4). Nenhum import de `audio/` ou
 * `render/`: o tema é DADO puro; o sequenciador (src/audio/temas.ts) o transforma em chamadas `T`/`R`/`V` e a validação (validar.ts) o confere no
 * carregamento. Nenhum sorteio: a partitura é função do passo, do laço e da fase.
 *
 * Notação das pistas (uma string por compasso, UM token por passo; espaços e `|` só separam para o olho):
 *   melodia (lead)   `3` grau ABSOLUTO da escala do tema (0 = tônica; 5 em pentatônica = a tônica uma oitava acima), `'` sobe e `,` desce uma oitava
 *                    (n graus), `.` pausa, `-` prolonga a nota anterior (sempre no mesmo compasso). Nota fora da escala não existe por construção.
 *   baixo e acorde   os mesmos tokens, mas o grau é RELATIVO à raiz do compasso (`harmonia`); no acorde o token é `x` (toca o acorde) e `-` o prolonga.
 *   percussão        `.` = silêncio e `1`, `2`, `3` = fraco, médio e forte (x0,45 / x0,75 / x1,0 do volume da camada).
 */
import type { IdLutador } from '../../core/contratos';

/** Os 9 lutadores que têm TemaDef: o ZENON mantém a valsa 3/4 de hoje (`playChefe`). */
export type IdTema = Exclude<IdLutador, 'zenon'>;

export type PistaDoTema = 'lead' | 'baixo' | 'perc';
export type TipoOnda = 'sine' | 'square' | 'sawtooth' | 'triangle';
export type TipoFiltro = 'lowpass' | 'highpass' | 'bandpass';

export interface FiltroDef {
  readonly tipo: TipoFiltro;
  /** Hz, ou, com `rel`, múltiplo da frequência da nota. */
  readonly f: number;
  readonly rel?: boolean;
  readonly Q?: number;
}

/** Oscilador com envelope (a primitiva `tone`). */
export interface CamadaTom {
  readonly k: 'T';
  readonly tipo: TipoOnda;
  /** Altura relativa à nota (padrão 1). Ignorado se `f0` (percussão de altura fixa) estiver presente. */
  readonly rel?: number;
  readonly f0?: number;
  readonly f1?: number;
  /** Portamento: começa `deslize` semitons ABAIXO da nota e chega nela em `t` (erhu, venu). */
  readonly deslize?: number;
  /** Duração fixa em s. */
  readonly t?: number;
  /** Ou: múltiplo da duração escrita da nota (se os dois existirem, vale o menor). */
  readonly durNota?: number;
  readonly vol: number;
  readonly atq?: number;
  readonly desafina?: number;
  readonly filtro?: FiltroDef;
}

/** Ruído filtrado (a primitiva `noise`). */
export interface CamadaRuido {
  readonly k: 'R';
  readonly tipo: TipoFiltro;
  readonly f0: number;
  readonly f1?: number;
  readonly Q: number;
  readonly t: number;
  readonly vol: number;
  readonly atq?: number;
}

/** Voz por formantes (a `vozFormante` da spec de sons): só o canto de garganta do BAATAR. Uma nota longa, no máximo 1 por compasso. */
export interface CamadaVoz {
  readonly k: 'V';
  readonly onda: 'sawtooth' | 'square';
  /** Contorno do tom como MÚLTIPLOS da nota (início, 40%, fim). */
  readonly contorno: readonly [number, number, number];
  readonly durNota: number;
  readonly vol: number;
  readonly formantes: readonly [number, number, number];
  readonly q: number;
  readonly ganhoF3: number;
  readonly atq?: number;
  readonly vib?: { readonly hz: number; readonly prof: number; readonly atraso: number };
  readonly sopro?: number;
  readonly coro?: { readonly cents: number; readonly sub: number };
  readonly extra?: { readonly f: number; readonly q: number; readonly ganho: number };
}

export type Camada = CamadaTom | CamadaRuido | CamadaVoz;
/** Um instrumento é a soma das camadas que tocam juntas numa nota ou numa batida. */
export type Instrumento = readonly Camada[];

export interface PistaLead {
  readonly instrumento: Instrumento;
  /** Oitavas acima (+) ou abaixo (-) do registro em que `tonica` está escrita. */
  readonly oitava?: number;
  /** Laço ímpar: troca de instrumento e/ou de oitava. Ausente = a mesma linha UMA OITAVA ACIMA. */
  readonly impar?: { readonly instrumento?: Instrumento; readonly oitava?: number };
  /** Compassos nomeados e a ordem em que tocam (`forma.length` = compassos do tema). */
  readonly compassos: Readonly<Record<string, string>>;
  readonly forma: readonly string[];
  /** Segunda voz paralela (trompetes em terças): a mesma linha `graus` graus acima (+) ou abaixo (-). */
  readonly paralela?: { readonly graus: number; readonly instrumento: Instrumento; readonly oitava?: number };
}

export interface PistaBaixo {
  readonly instrumento: Instrumento;
  readonly oitava?: number;
  /** Um padrão por compasso, em ciclo (o número de padrões deve dividir `compassos`). */
  readonly padroes: string | readonly string[];
}

export interface PistaAcorde {
  readonly instrumento: Instrumento;
  readonly oitava?: number;
  /** Graus acima da raiz do compasso que soam juntos (0 = a raiz). */
  readonly voicing: readonly number[];
  /** Alternativa para bordões: semitons acima da raiz (ex. `[0, 7]`, a quinta mesmo fora da escala). Vence `voicing`. */
  readonly semitons?: readonly number[];
  readonly padroes: string | readonly string[];
}

export interface PistaPerc {
  readonly instrumento: Instrumento;
  readonly padroes: string | readonly string[];
}

/** Evento do trecho de troca de fase (tocado uma vez, no 1º passo do compasso em que a fase 2 começa). */
export type EventoDaTroca = Camada & {
  /** Atraso em s depois do início do compasso. */
  readonly quando: number;
  /** Semitons acima da tônica do tema (só em camada afinada sem `f0`). */
  readonly semi?: number;
};

export interface Fase2 {
  /** Multiplica o andamento (a spec: 1,08). */
  readonly andamento: number;
  /** Camadas EXTRAS de percussão (bumbo em todos os tempos). */
  readonly perc: readonly PistaPerc[];
  /** Oitavas somadas ao baixo (-1: uma oitava abaixo). */
  readonly baixoOitava: number;
  /**
   * Ganho de cada pista SÓ na fase 2, em cima do `mix` do tema (a mesa de som da fase 2): o baixo uma oitava abaixo e a percussão extra empurram o grave
   * e o pico, e isto traz a fase 2 de volta ao RMS, ao grave e à faixa da voz da fase 1. Ausente = 1.
   */
  readonly mix?: Readonly<Partial<Record<PistaDoTema, number>>>;
  /** Contracanto: a linha do lead `graus` graus acima/abaixo, atrasada `atraso` passos, em outro instrumento. */
  readonly contracanto: { readonly instrumento: Instrumento; readonly graus: number; readonly atraso: number; readonly oitava?: number };
  readonly troca: readonly EventoDaTroca[];
}

export interface TemaDef {
  readonly nome: string;
  readonly origem: string;
  /** MIDI do grau 0 no registro do lead. Só a classe de altura define a tônica; a oitava é registro. */
  readonly tonica: number;
  /** Semitons acima da tônica, crescentes, de 0 a 11. */
  readonly escala: readonly number[];
  readonly compasso: {
    /** Passos (a subdivisão do sequenciador) por compasso. */
    readonly passos: number;
    /** Passos por pulso do `bpm`. */
    readonly passosPorPulso: number;
    /** Pulsos por compasso, em ciclo (3/4 = [3]; sesquiáltera = [2, 3]). Só a régua de ritmo lê isto. */
    readonly pulsos: readonly number[];
  };
  readonly bpm: number;
  /** Fração do pulso em que a 2ª colcheia cai (0,5 = reto). Vale para passos de colcheia (2 por pulso). */
  readonly swing?: number;
  readonly compassos: 8 | 16;
  /** Compassos sem lead no 1º laço (padrão 2): a fala da entrada não briga com a melodia. */
  readonly abertura?: number;
  /** Ganho do tema inteiro, calibrado para o RMS do laço ficar a ±1,5 dB do da `fight` (tests/unit/musica-mix.test.ts). */
  readonly volume: number;
  /** Ganho de cada pista (a mesa de som do tema); ausente = 1. Calibrado junto do `volume` (faixa da voz, grave e RMS). */
  readonly mix?: Readonly<Partial<Record<PistaDoTema, number>>>;
  /** Grau da raiz de cada compasso, em ciclo. */
  readonly harmonia: readonly number[];
  readonly lead: PistaLead;
  readonly baixo: PistaBaixo;
  readonly acorde?: PistaAcorde;
  readonly perc: readonly PistaPerc[];
  readonly fase2: Fase2;
}

/** Cada lutador tem um tema; o ZENON tem a valsa (`'chefe'`). Faltar um lutador não compila. */
export type TabelaDeTemas = Readonly<Record<IdLutador, TemaDef | 'chefe'>>;
