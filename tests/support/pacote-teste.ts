import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { CATEGORIAS_VOZ, IDS_FAMILIA, IDS_FOLEY, idDeVoz, type CorteDeAmostra, type ManifestoDeAmostras } from '../../src/data/sons/amostras';
import { Buffer as BufferOffline } from './audio-offline';

/*
 * PACOTE DE TESTE das amostras reais: ondas sintéticas determinísticas com o MESMO manifesto que o pacote real terá (folhas `base` + uma por lutador, cortes com
 * origem e licença CC0). Existe para o código ser desenvolvido e testado sem depender de `arte-fonte/` (a CI é limpa) nem do pacote da curadoria.
 *
 * Dois usos, o mesmo gerador:
 *  - EM MEMÓRIA (os testes): `criarPacote()` devolve o manifesto, os bytes de cada folha (Float32 cru, não MP3) e os `buscar`/`decodificar` que o banco aceita.
 *  - EM ARQUIVO (`tests/fixtures/sons-pacote/`): `escreverWav` + ffmpeg geram os MP3 e o `manifesto.json` (ferramentas/sons/gerar-pacote-teste.mjs); servem para o navegador
 *    decodificar MP3 de verdade e provar o atraso de codificação.
 * Nada aqui usa `Math.random`: o ruído é um LCG com semente fixa.
 */

export const TAXA_PACOTE = 44100;
/** Silêncio em volta de cada corte, como a curadoria entrega (o atraso do MP3 varia por navegador). */
export const FOLGA_S = 0.04;
export const ORIGEM_DO_PACOTE_DE_TESTE = 'pacote de teste sintético (tests/support/pacote-teste.ts), não é som real';

/** Em que folha mora cada família (a do dono). */
const DONO_DA_FAMILIA: Readonly<Record<string, IdLutador>> = {
  'esp.e1.raio': 'hayato',
  'esp.e2.dragao': 'wei-long',
  'esp.e3.lamina': 'min-ji',
  'esp.e4.ginga': 'caio',
  'esp.e5.tambor': 'aminu',
  'esp.e6.ringue': 'centella',
  'esp.e7.florete': 'camille',
  'esp.e8.chenda': 'nila',
  'esp.e9.serpente': 'nila',
  'esp.e10.estepe': 'baatar',
  'esp.e11.aguia': 'baatar',
  'esp.e12.selo': 'zenon',
};

const hash = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
};

/** Duração (s) por tipo de som, dentro das faixas do plano §4.2. */
function duracaoDe(id: string): number {
  if (id === 'ko.queda') return 0.8;
  if (id.endsWith('.ko')) return 0.9;
  if (id.startsWith('esp.')) return 0.5;
  if (id.startsWith('voz.')) return id.endsWith('.pesado') || id.endsWith('.pesado2') ? 0.3 : 0.24;
  if (id.startsWith('golpe.ar') || id === 'esquiva') return 0.2;
  return 0.22;
}

/** Uma rajada determinística: seno + harmônico + ruído de LCG, ataque de 3 ms e decaimento exponencial, pico em -3 dBFS. */
export function rajada(id: string, taxa = TAXA_PACOTE): Float32Array {
  const dur = duracaoDe(id);
  const n = Math.round(dur * taxa);
  const h = hash(id);
  const f = 180 + (h % 1800);
  let lcg = h | 1;
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / taxa;
    lcg = (Math.imul(lcg, 1664525) + 1013904223) >>> 0;
    const ruido = lcg / 4294967296 * 2 - 1;
    const atq = Math.min(1, t / 0.003);
    const dec = Math.exp((-t / dur) * 5.5);
    const sai = Math.min(1, (dur - t) / 0.005);
    out[i] = (Math.sin(2 * Math.PI * f * t) * 0.7 + Math.sin(2 * Math.PI * f * 2.01 * t) * 0.2 + ruido * 0.1) * atq * dec * Math.max(0, sai);
  }
  let pico = 0;
  for (const x of out) pico = Math.max(pico, Math.abs(x));
  const k = Math.pow(10, -3 / 20) / (pico || 1);
  for (let i = 0; i < n; i++) out[i] = (out[i] as number) * k;
  return out;
}

const db = (x: number): number => 20 * Math.log10(Math.max(x, 1e-9));
function medir(d: Float32Array): { picoDb: number; rmsDb: number } {
  let pico = 0;
  let soma = 0;
  for (const x of d) {
    pico = Math.max(pico, Math.abs(x));
    soma += x * x;
  }
  return { picoDb: Math.round(db(pico) * 100) / 100, rmsDb: Math.round(db(Math.sqrt(soma / d.length)) * 100) / 100 };
}

/** Todos os ids do pacote de teste -> a folha onde moram. */
export function idsDoPacote(): { id: string; folha: string; variantes: number }[] {
  const itens: { id: string; folha: string; variantes: number }[] = [];
  for (const id of IDS_FOLEY) itens.push({ id, folha: 'base', variantes: id === 'imp.soco.leve' || id === 'imp.soco.forte' ? 2 : 1 });
  for (const l of IDS_LUTADORES) {
    for (const c of CATEGORIAS_VOZ) itens.push({ id: idDeVoz(l, c), folha: l, variantes: 1 });
    if (l === 'zenon') itens.push({ id: 'voz.zenon.riso', folha: l, variantes: 1 });
    if (l === 'nila') itens.push({ id: 'voz.nila.sarpa.kiai', folha: l, variantes: 1 });
  }
  for (const id of IDS_FAMILIA) itens.push({ id, folha: DONO_DA_FAMILIA[id] as string, variantes: 1 });
  return itens;
}

export interface OpcoesDoPacote {
  /** Atraso de codificação do MP3 a simular (ms): desloca todo o conteúdo da folha. Padrão 0. */
  readonly atrasoMs?: number;
  /** Ids a deixar de fora (lacunas: família sem sample livre, etc.). */
  readonly sem?: readonly string[];
  /** Folhas a deixar de fora do manifesto E da rede. */
  readonly semFolhas?: readonly string[];
  /** Ganho em dB aplicado a todos os cortes no manifesto. */
  readonly ganhoDb?: number;
  /** Ganho em dB por id (a calibração contra o som sintético); vence `ganhoDb`. */
  readonly ganhoPorId?: Readonly<Record<string, number>>;
  /** Taxa de amostragem das folhas em memória. */
  readonly taxa?: number;
}

export interface PacoteDeTeste {
  readonly manifesto: ManifestoDeAmostras;
  /** Folha -> PCM float (mono). */
  readonly pcm: ReadonlyMap<string, Float32Array>;
  /** arquivo -> bytes (Float32 cru) que o `buscar` devolve. */
  readonly arquivos: ReadonlyMap<string, ArrayBuffer>;
  /** URLs pedidas ao `buscar`, em ordem. */
  readonly pedidos: string[];
  readonly buscar: (url: string) => Promise<ArrayBuffer>;
  /** Decodifica os bytes crus para o `Buffer` do motor offline, na taxa do contexto. */
  readonly decodificar: (ctx: { sampleRate: number }, bytes: ArrayBuffer) => Promise<never>;
}

export function criarPacote(o: OpcoesDoPacote = {}): PacoteDeTeste {
  const taxa = o.taxa ?? TAXA_PACOTE;
  const folgaAmostras = Math.round(FOLGA_S * taxa);
  const atraso = Math.round(((o.atrasoMs ?? 0) / 1000) * taxa);
  const sem = new Set(o.sem ?? []);
  const semFolhas = new Set(o.semFolhas ?? []);
  const porFolha = new Map<string, { id: string; variantes: number }[]>();
  for (const it of idsDoPacote()) {
    if (sem.has(it.id) || semFolhas.has(it.folha)) continue;
    const l = porFolha.get(it.folha) ?? [];
    l.push(it);
    porFolha.set(it.folha, l);
  }
  const pcm = new Map<string, Float32Array>();
  const arquivos = new Map<string, ArrayBuffer>();
  const folhas: Record<string, { arquivo: string; bytes: number }> = {};
  const sons: Record<string, CorteDeAmostra | CorteDeAmostra[]> = {};
  for (const [nome, itens] of porFolha) {
    // posiciona os cortes: folga, corte, folga, corte...
    const corpos: { id: string; v: number; dados: Float32Array; inicio: number }[] = [];
    let cursor = folgaAmostras;
    for (const it of itens) {
      for (let v = 0; v < it.variantes; v++) {
        const dados = rajada(v === 0 ? it.id : `${it.id}#${v}`, taxa);
        corpos.push({ id: it.id, v, dados, inicio: cursor });
        cursor += dados.length + folgaAmostras;
      }
    }
    const folha = new Float32Array(cursor + atraso);
    for (const c of corpos) folha.set(c.dados, c.inicio + atraso);
    pcm.set(nome, folha);
    const arquivo = nome === 'base' ? 'base.mp3' : `lutador-${nome}.mp3`;
    arquivos.set(arquivo, folha.buffer.slice(folha.byteOffset, folha.byteOffset + folha.byteLength) as ArrayBuffer);
    // `bytes` é uma estimativa do MP3 a 64 kbps (o pacote real traz o tamanho do arquivo)
    folhas[nome] = { arquivo, bytes: Math.ceil((folha.length / taxa) * 8000) };
    for (const c of corpos) {
      const m = medir(c.dados);
      const corte: CorteDeAmostra = {
        folha: nome,
        inicio: Math.round((c.inicio / taxa) * 10000) / 10000,
        dur: Math.round((c.dados.length / taxa) * 10000) / 10000,
        picoDb: m.picoDb,
        rmsDb: m.rmsDb,
        ganhoDb: o.ganhoPorId?.[c.id] ?? o.ganhoDb ?? 0,
        origem: ORIGEM_DO_PACOTE_DE_TESTE,
        licenca: 'CC0',
      };
      const atual = sons[c.id];
      if (atual === undefined) sons[c.id] = corte;
      else sons[c.id] = [...(Array.isArray(atual) ? atual : [atual]), corte];
    }
  }
  const pedidos: string[] = [];
  const manifesto: ManifestoDeAmostras = { versao: 1, taxa: 44100, folhas, sons };
  const buscar = async (url: string): Promise<ArrayBuffer> => {
    pedidos.push(url);
    const arquivo = url.split('/').pop()?.split('?')[0] ?? '';
    const bytes = arquivos.get(arquivo);
    if (!bytes) throw new Error(`404 ${url}`);
    return bytes.slice(0);
  };
  const decodificar = async (ctx: { sampleRate: number }, bytes: ArrayBuffer): Promise<never> => {
    const cru = new Float32Array(bytes);
    const taxaCtx = ctx.sampleRate;
    if (taxaCtx === taxa) return new BufferOffline(1, cru.length, taxa, cru) as never;
    const n = Math.floor((cru.length * taxaCtx) / taxa);
    const out = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      const pos = (i * taxa) / taxaCtx;
      const k = Math.floor(pos);
      const f = pos - k;
      out[i] = (cru[k] as number) * (1 - f) + (cru[Math.min(cru.length - 1, k + 1)] as number) * f;
    }
    return new BufferOffline(1, n, taxaCtx, out) as never;
  };
  return { manifesto, pcm, arquivos, pedidos, buscar, decodificar };
}

/** WAV PCM 16 bits mono (para o ffmpeg codificar os MP3 do pacote de arquivo). */
export function escreverWav(dados: Float32Array, taxa: number): Uint8Array {
  const n = dados.length;
  const out = new Uint8Array(44 + n * 2);
  const v = new DataView(out.buffer);
  const texto = (o: number, s: string): void => void [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
  texto(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  texto(8, 'WAVEfmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, taxa, true);
  v.setUint32(28, taxa * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  texto(36, 'data');
  v.setUint32(40, n * 2, true);
  for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.max(-1, Math.min(1, dados[i] as number)) * 32767), true);
  return out;
}
