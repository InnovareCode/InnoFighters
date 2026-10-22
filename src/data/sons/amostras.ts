import { IDS_LUTADORES, type EventoLuta, type IdLutador } from '../../core/contratos';

/*
 * DADOS das amostras reais (docs/plano-sons-realistas.md §2.4, §4.4, §6): a tabela de ids, o manifesto tipado e a sua validação, o mapa evento -> amostra e as
 * constantes de variação. Nenhum import de `audio/`: o plano sonoro (`plano-amostras.ts`) e o banco (`amostras.ts`) leem daqui. O manifesto em si
 * (`public/assets/sons/manifesto.json`) é baixado no boot e validado por `validarManifesto`; o que está AQUI é o contrato que ele precisa cumprir.
 */

// --- constantes de variação e mixagem ---
/** Peso máximo do pacote inteiro (soma dos bytes das folhas), em bytes: 1,2 MB (plano §0, item 6). */
export const PESO_MAXIMO_BYTES = 1_200_000;
/** Variação de taxa por toque: ±3% (plano §2.3 diz 0,97 a 1,03). */
export const VARIACAO_TAXA = 0.03;
/** Ganho linear por toque: 0,9 a 1,0. */
export const GANHO_VARIACAO_MIN = 0.9;
/** Espelho (o mesmo lutador dos dois lados): o lutador do índice 1 canta -1 semitom (a regra D-S7 de hoje). */
export const ESPELHO_TAXA = Math.pow(2, -1 / 12);
/** A assinatura sintetizada que fica SOB a família do especial: -6 dB, só nas camadas `ataque` e `corpo` (plano §2.3). */
export const GANHO_ASSINATURA_SOB_FAMILIA = Math.pow(10, -6 / 20);
/** O corpo cai depois do golpe que nocauteou (ajustar no ouvido; plano §6.3). */
export const ATRASO_QUEDA_KO_MS = 150;
/** MASHI, evento `carga`: o tambor sobe de tom a cada nível (1, 2, 3). */
export const TAXA_CARGA: readonly number[] = [0.92, 1, 1.12];
/** O vidro sintetizado sobre `guarda.quebra` (decisão de ouvido, `?escuta=1`): ligado por padrão, como no som de hoje. */
export const VIDRO_SOBRE_GUARDA_PADRAO = true;

// --- ids ---
export type CategoriaVoz = 'kiai' | 'leve' | 'leve2' | 'pesado' | 'pesado2' | 'ko' | 'guarda' | 'esforco' | 'vitoria';
export const CATEGORIAS_VOZ: readonly CategoriaVoz[] = ['kiai', 'leve', 'leve2', 'pesado', 'pesado2', 'ko', 'guarda', 'esforco', 'vitoria'];

/** O foley COMPARTILHADO e a magia comum (folha `base`). */
export const IDS_FOLEY = [
  'imp.soco.leve',
  'imp.soco.forte',
  'imp.chute.leve',
  'imp.chute.forte',
  'defesa',
  'guarda.quebra',
  'arremesso',
  'ko.queda',
  'golpe.ar.leve',
  'golpe.ar.forte',
  'esquiva',
  'pouso',
  'salto',
  'magia.lanca',
  'magia.impacto',
] as const;
/** Uma família de especial por estilo E1-E12. */
export const IDS_FAMILIA = [
  'esp.e1.raio',
  'esp.e2.dragao',
  'esp.e3.lamina',
  'esp.e4.ginga',
  'esp.e5.tambor',
  'esp.e6.ringue',
  'esp.e7.florete',
  'esp.e8.chenda',
  'esp.e9.serpente',
  'esp.e10.estepe',
  'esp.e11.aguia',
  'esp.e12.selo',
] as const;

export const idDeVoz = (lutador: IdLutador, cat: CategoriaVoz): string => `voz.${lutador}.${cat}`;

/** Ids de voz extras que não seguem `voz.<lutador>.<categoria>`. */
const IDS_VOZ_EXTRAS = ['voz.nila.sarpa.kiai', 'voz.zenon.riso'] as const;

/** Todo id que o manifesto pode declarar. Um id fora desta tabela derruba a validação (typo, ou som que o jogo não sabe tocar). */
export function idsConhecidos(): ReadonlySet<string> {
  const s = new Set<string>([...IDS_FOLEY, ...IDS_FAMILIA, ...IDS_VOZ_EXTRAS]);
  for (const l of IDS_LUTADORES) for (const c of CATEGORIAS_VOZ) s.add(idDeVoz(l, c));
  return s;
}

/**
 * O núcleo que um pacote REAL precisa trazer para o jogo soar como o plano promete: o foley compartilhado (menos pouso/salto, que eram opcionais) e, por
 * lutador, kiai, dano leve, dano pesado e KO. O resto (famílias, guarda, esforço, vitória, magia, pouso, salto) pode faltar: cai na síntese.
 */
export function idsObrigatorios(): readonly string[] {
  const foley = IDS_FOLEY.filter((id) => !['pouso', 'salto', 'magia.lanca', 'magia.impacto'].includes(id));
  const vozes = IDS_LUTADORES.flatMap((l) => (['kiai', 'leve', 'pesado', 'ko'] as const).map((c) => idDeVoz(l, c)));
  return [...foley, ...vozes];
}

// --- família do especial por assinatura ---
export interface FiltroAmostra {
  readonly tipo: 'lowpass' | 'highpass';
  readonly f: number;
}
export interface FamiliaDoGolpe {
  readonly id: string;
  /** Multiplica a taxa de reprodução (sFire 1; sDown 0,84; sFwd 1,12). */
  readonly taxa: number;
  readonly filtro?: FiltroAmostra;
}

/** Como o golpe transforma o sample da família (plano §2.3): `sFire` o sample inteiro; `sDown` grave e abafado; `sFwd` agudo e fino. */
const TRANSFORMACAO_DO_GOLPE: Readonly<Record<string, { taxa: number; filtro?: FiltroAmostra }>> = {
  sFire: { taxa: 1 },
  sResp: { taxa: 1 },
  sDown: { taxa: 0.84, filtro: { tipo: 'lowpass', f: 1800 } },
  sFwd: { taxa: 1.12, filtro: { tipo: 'highpass', f: 400 } },
};

const FAMILIA_DO_LUTADOR: Readonly<Partial<Record<IdLutador, string>>> = {
  hayato: 'esp.e1.raio',
  'wei-long': 'esp.e2.dragao',
  'min-ji': 'esp.e3.lamina',
  caio: 'esp.e4.ginga',
  aminu: 'esp.e5.tambor',
  centella: 'esp.e6.ringue',
  camille: 'esp.e7.florete',
  zenon: 'esp.e12.selo',
};

/** A família da assinatura `<lutador>.<ficha|base>.<golpe>`: NILA base = E8, SARPA = E9; BAATAR: o MERGULHO (`sFwd`) é a águia E11, o resto o E10. */
export function familiaDaAssinatura(chave: string): FamiliaDoGolpe | undefined {
  const [lutador = '', ficha = 'base', golpe = ''] = chave.split('.');
  let id: string | undefined;
  if (lutador === 'nila') id = ficha === 'sarpa' ? 'esp.e9.serpente' : 'esp.e8.chenda';
  else if (lutador === 'baatar') id = golpe === 'sFwd' ? 'esp.e11.aguia' : 'esp.e10.estepe';
  else id = FAMILIA_DO_LUTADOR[lutador as IdLutador];
  if (!id) return undefined;
  const t = TRANSFORMACAO_DO_GOLPE[golpe] ?? { taxa: 1 };
  return { id, taxa: t.taxa, ...(t.filtro ? { filtro: t.filtro } : {}) };
}

/** A família da troca de ficha da NILA (VADIVU): GAJA -> chenda, SARPA -> serpente. */
export function familiaDaTrocaDeFicha(ficha: string | null): string {
  return ficha === 'sarpa' ? 'esp.e9.serpente' : 'esp.e8.chenda';
}

/** Golpe pesado (a mesma regra do dano pesado de hoje): arremesso, rajada grande, dano >= 12 ou contragolpe. */
export function golpePesado(ev: Extract<EventoLuta, { tipo: 'hit' | 'throw' }>): boolean {
  return ev.tipo === 'throw' || ev.grande || (ev.dano ?? 0) >= 12 || ev.contragolpe;
}

// --- o pedido de amostra que o plano anota e a execução resolve ---
/**
 * O que o plano pede ao banco. PURO: não diz se a amostra existe. `ids` é uma cadeia de preferência (o primeiro com amostra pronta toca; dentro dele,
 * `u` escolhe a variante). `senao` é o pedido de reserva com transformação própria (SARPA sem o `SSSA` próprio usa a voz da NILA mais aguda e filtrada).
 */
export interface PedidoAmostra {
  readonly ids: readonly string[];
  /** [0, 1): escolhe a variante e nada mais. Vem de `variacao(...)`, nunca de `Math.random`. */
  readonly u: number;
  /** Multiplica a taxa do corte (a variação de ±3%, o espelho -1 st, o golpe da família). */
  readonly taxa: number;
  /** Ganho linear por toque (0,9 a 1,0); o ganho do manifesto (`ganhoDb`) soma por cima. */
  readonly ganho: number;
  readonly filtro?: FiltroAmostra;
  /** `inicio` = 1ª metade do sample (a conjuração); `fim` = 2ª metade (o lançamento); ausente = o sample inteiro. */
  readonly parte?: 'inicio' | 'fim';
  /** Segundos depois do instante de tocar (as batidas repetidas do MASHI). Ausente = já. */
  readonly quando?: number;
  readonly senao?: PedidoAmostra;
}

/** Troca de um método genérico (`punch`, `kick`, `block`, `swing`...) por uma amostra: quem decide é a execução. */
export interface TrocaDeAmostra {
  readonly metodo: string;
  readonly pedido: PedidoAmostra;
}

// --- cobertura: cada evento da luta, o que toca de amostra ---
export type CoberturaDoEvento = readonly string[] | 'sintese';
/**
 * Para cada tipo de evento: os padrões de id que ele pode tocar (`*` = qualquer), ou `'sintese'` (de propósito: jingle, interface, aviso). Tipado como `Record`
 * sobre a união de eventos: um evento novo no motor que ninguém mapeou NÃO COMPILA. `tests/unit/sons-amostras-*.test.ts` confere o mapa contra o manifesto.
 */
export const AMOSTRAS_POR_EVENTO: Readonly<Record<EventoLuta['tipo'], CoberturaDoEvento>> = {
  swing: ['golpe.ar.leve', 'golpe.ar.forte'],
  special: ['voz.*.kiai', 'esp.*'],
  deny: 'sintese',
  jump: ['salto'],
  land: ['pouso'],
  dust: 'sintese',
  projectile: ['magia.lanca', 'esp.*'],
  clash: ['magia.impacto', 'esp.*'],
  block: ['defesa'],
  armor: ['imp.soco.leve', 'imp.chute.leve', 'voz.*.esforco'],
  hit: ['imp.soco.*', 'imp.chute.*', 'magia.impacto', 'voz.*.leve', 'voz.*.pesado', 'esp.*'],
  throw: ['arremesso', 'voz.*.pesado', 'esp.*'],
  ko: ['voz.*.ko', 'ko.queda'],
  round: ['voz.*.vitoria', 'voz.zenon.riso'],
  perfect: 'sintese',
  'fase-chefe': 'sintese',
  parry: ['defesa', 'esp.e7.florete'],
  'quebra-guarda': ['guarda.quebra', 'voz.*.guarda'],
  carga: ['esp.e5.tambor'],
  rebote: ['pouso'],
  'troca-ficha': ['salto', 'esp.e8.chenda', 'esp.e9.serpente'],
  esquiva: ['esquiva'],
  esquivou: 'sintese',
};

// --- o manifesto ---
export interface CorteDeAmostra {
  /** Nome da folha em `folhas`. */
  readonly folha: string;
  /** Segundo da folha onde o conteúdo do corte começa (depois dos ~40 ms de silêncio). O ataque REAL é achado varrendo o buffer decodificado. */
  readonly inicio: number;
  /** Duração do conteúdo, em s. */
  readonly dur: number;
  readonly picoDb: number;
  /** RMS da região ativa, em dBFS (para a régua de volume testar no Node sem decodificar MP3). */
  readonly rmsDb: number;
  /** Ajuste fino de mixagem, calibrado a ±3 dB do som sintetizado que o corte substitui. */
  readonly ganhoDb: number;
  /** Taxa fixa do corte (a identidade da voz do lutador: BAATAR 0,88...). Ausente = 1. */
  readonly taxa?: number;
  /** De onde veio (pacote, autor, arquivo): obrigatório em todo corte. */
  readonly origem: string;
  /** Só `CC0` entra no jogo. */
  readonly licenca: 'CC0';
  readonly fonte?: string;
}
export interface FolhaDoManifesto {
  readonly arquivo: string;
  readonly bytes: number;
}
export interface ManifestoDeAmostras {
  readonly versao: 1;
  readonly taxa: number;
  readonly folhas: Readonly<Record<string, FolhaDoManifesto>>;
  /** Um corte ou uma lista de variantes do mesmo som (a escolha vem de `PedidoAmostra.u`). */
  readonly sons: Readonly<Record<string, CorteDeAmostra | readonly CorteDeAmostra[]>>;
  readonly presets?: Readonly<Record<string, string>>;
}

/** Todos os cortes de um som (um só, ou a lista de variantes). */
export function cortesDe(v: CorteDeAmostra | readonly CorteDeAmostra[] | undefined): readonly CorteDeAmostra[] {
  if (v === undefined) return [];
  return Array.isArray(v) ? (v as readonly CorteDeAmostra[]) : [v as CorteDeAmostra];
}

const ehObjeto = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const ehNumero = (x: unknown): x is number => typeof x === 'number' && Number.isFinite(x);

/** `leve2` e `pesado2` são VARIANTES de `leve` e `pesado` (o pacote 2 do plano): o banco as junta. Devolve o id base, ou o próprio id. */
export function idBaseDaVariante(id: string): string {
  return /^voz\.[a-z-]+\.(?:leve|pesado)2$/.test(id) ? id.slice(0, -1) : id;
}

/** O `ganhoDb` calibra o corte contra o som sintetizado que ele troca: foley normalizado a -6 dBFS (RMS ~ -20) contra um `swing()` sintético a -42 dBFS pede -22 dB, e contra o `land()` a -49 dBFS, -30 dB. */
export const GANHO_DB_MAX = 36;
const MAX_VARIANTES = 6;
const DUR_MAX = 2;
const DUR_MIN = 0.03;

/**
 * Valida o manifesto (plano §6.2 e §6.4). Devolve a lista de problemas; vazia = válido. Confere: forma e versão; folhas (nome, arquivo `.mp3`, bytes) e peso total
 * <= 1,2 MB; todo id na tabela; todo corte numa folha que existe, com início, duração, pico, RMS e ganho plausíveis, `origem` preenchida e `licenca` `CC0`.
 * NÃO exige que todo id exista (famílias sem sample livre ficam na síntese): `idsObrigatorios` diz o núcleo que um pacote real precisa trazer.
 */
export function validarManifesto(m: unknown): string[] {
  const erros: string[] = [];
  if (!ehObjeto(m)) return ['manifesto: não é um objeto'];
  if (m['versao'] !== 1) erros.push(`manifesto: versao ${String(m['versao'])} (esperado 1)`);
  if (m['taxa'] !== 44100 && m['taxa'] !== 48000) erros.push(`manifesto: taxa ${String(m['taxa'])} (esperado 44100 ou 48000)`);
  const folhas = m['folhas'];
  const nomesDeFolha = new Set<string>();
  if (!ehObjeto(folhas) || Object.keys(folhas).length === 0) erros.push('manifesto: folhas vazias');
  else {
    let total = 0;
    for (const [nome, f] of Object.entries(folhas)) {
      nomesDeFolha.add(nome);
      if (!/^[a-z0-9-]+$/.test(nome)) erros.push(`folha '${nome}': nome inválido (minúsculas, dígitos e hífen)`);
      if (!ehObjeto(f)) {
        erros.push(`folha '${nome}': não é um objeto`);
        continue;
      }
      if (typeof f['arquivo'] !== 'string' || !/^[a-z0-9][a-z0-9._-]*\.mp3$/.test(f['arquivo'])) erros.push(`folha '${nome}': arquivo inválido (um .mp3 na mesma pasta do manifesto)`);
      if (!ehNumero(f['bytes']) || !Number.isInteger(f['bytes']) || f['bytes'] <= 0) erros.push(`folha '${nome}': bytes inválido`);
      else total += f['bytes'];
    }
    if (total > PESO_MAXIMO_BYTES) erros.push(`manifesto: peso ${total} B passa de ${PESO_MAXIMO_BYTES} B (1,2 MB)`);
  }
  const sons = m['sons'];
  if (!ehObjeto(sons) || Object.keys(sons).length === 0) {
    erros.push('manifesto: sons vazio');
    return erros;
  }
  const conhecidos = idsConhecidos();
  for (const [id, v] of Object.entries(sons)) {
    if (!conhecidos.has(id)) erros.push(`som '${id}': id fora da tabela do plano`);
    const lista = Array.isArray(v) ? (v as unknown[]) : [v];
    if (lista.length === 0) erros.push(`som '${id}': lista de variantes vazia`);
    if (lista.length > MAX_VARIANTES) erros.push(`som '${id}': ${lista.length} variantes (máx. ${MAX_VARIANTES})`);
    lista.forEach((c, i) => {
      const onde = lista.length > 1 ? `som '${id}'[${i}]` : `som '${id}'`;
      if (!ehObjeto(c)) {
        erros.push(`${onde}: não é um objeto`);
        return;
      }
      if (typeof c['folha'] !== 'string' || !nomesDeFolha.has(c['folha'])) erros.push(`${onde}: folha '${String(c['folha'])}' não existe`);
      if (!ehNumero(c['inicio']) || c['inicio'] < 0) erros.push(`${onde}: inicio inválido`);
      if (!ehNumero(c['dur']) || c['dur'] < DUR_MIN || c['dur'] > DUR_MAX) erros.push(`${onde}: dur ${String(c['dur'])} fora de [${DUR_MIN}, ${DUR_MAX}] s`);
      if (!ehNumero(c['picoDb']) || c['picoDb'] > 0 || c['picoDb'] < -40) erros.push(`${onde}: picoDb ${String(c['picoDb'])} fora de [-40, 0]`);
      if (!ehNumero(c['rmsDb']) || c['rmsDb'] > 0 || c['rmsDb'] < -60) erros.push(`${onde}: rmsDb ${String(c['rmsDb'])} fora de [-60, 0]`);
      else if (ehNumero(c['picoDb']) && c['rmsDb'] > c['picoDb'] + 0.01) erros.push(`${onde}: rmsDb acima do picoDb`);
      if (!ehNumero(c['ganhoDb']) || Math.abs(c['ganhoDb']) > GANHO_DB_MAX) erros.push(`${onde}: ganhoDb ${String(c['ganhoDb'])} fora de ±${GANHO_DB_MAX} dB`);
      if (c['taxa'] !== undefined && (!ehNumero(c['taxa']) || c['taxa'] < 0.7 || c['taxa'] > 1.3)) erros.push(`${onde}: taxa ${String(c['taxa'])} fora de [0,7, 1,3]`);
      if (typeof c['origem'] !== 'string' || c['origem'].trim().length < 3) erros.push(`${onde}: origem ausente (de onde veio o corte?)`);
      if (c['licenca'] !== 'CC0') erros.push(`${onde}: licenca '${String(c['licenca'])}' (só CC0 entra no jogo)`);
      if (c['fonte'] !== undefined && typeof c['fonte'] !== 'string') erros.push(`${onde}: fonte precisa ser texto`);
    });
  }
  return erros;
}

/** Valida e devolve o manifesto tipado, ou lança com TODOS os problemas (o carregamento derruba o boot, como os dados de sons). */
export function exigirManifestoValido(m: unknown): ManifestoDeAmostras {
  const erros = validarManifesto(m);
  if (erros.length) throw new Error(`manifesto de amostras inválido:${erros.map((e) => `\n - ${e}`).join('')}`);
  return m as ManifestoDeAmostras;
}
