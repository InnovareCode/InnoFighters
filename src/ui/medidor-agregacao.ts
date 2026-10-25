/*
 * MEDIDOR DE FPS, parte pura (docs/medicao-em-aparelho.md): guarda os últimos 30 s de quadros em buffers fixos (nenhuma alocação por quadro) e responde
 * "FPS, p95 e pior quadro" para qualquer janela recente e o resumo por cena que o botão COPIAR exporta. Nada aqui toca em DOM nem em relógio: quem chama
 * passa o instante (o mesmo `agora` do requestAnimationFrame).
 */

/** Janela do relatório copiado. */
export const JANELA_RELATORIO_MS = 30_000;
/** Janela do p95 e do pior quadro mostrados na tela. */
export const JANELA_PICO_MS = 5_000;
/** Janela da média de FPS mostrada na tela. */
export const JANELA_FPS_MS = 1_000;
/** Intervalo acima do qual o quadro NÃO conta (aba em segundo plano, aparelho dormindo): não é lentidão do desenho. */
export const INTERVALO_MAXIMO_MS = 500;
/** 30 s a 240 Hz = 7200 quadros; sobra folga. */
export const CAPACIDADE = 8192;
/** Cenas distintas que o buffer indexa (Uint8). */
const MAX_CENAS = 255;

export interface ResumoDeJanela {
  readonly quadros: number;
  readonly fps: number;
  readonly p95: number;
  readonly pior: number;
}

export interface ResumoDeCena extends ResumoDeJanela {
  /** Soma dos intervalos dos quadros da cena na janela (s). */
  readonly segundos: number;
  readonly rsMin: number;
  readonly rsMax: number;
}

const arredonda = (v: number, casas = 1): number => {
  const k = 10 ** casas;
  return Math.round(v * k) / k;
};

export class AgregadorDeQuadros {
  private readonly ts = new Float64Array(CAPACIDADE);
  private readonly dt = new Float32Array(CAPACIDADE);
  private readonly cena = new Uint8Array(CAPACIDADE);
  private readonly rs = new Float32Array(CAPACIDADE);
  private readonly rascunho = new Float32Array(CAPACIDADE);
  private readonly nomes: string[] = [];
  /** Próxima posição a escrever. */
  private proximo = 0;
  private n = 0;

  /** Um quadro: `agora` (ms), `intervalo` desde o anterior (ms), a cena e o RS do canvas. Devolve se contou (intervalo fora de (0, 500] é ignorado). */
  registrar(agora: number, intervalo: number, cena: string, rs: number): boolean {
    if (!(intervalo > 0) || intervalo > INTERVALO_MAXIMO_MS) return false;
    const i = this.proximo;
    this.ts[i] = agora;
    this.dt[i] = intervalo;
    this.cena[i] = this.indiceDaCena(cena);
    this.rs[i] = rs;
    this.proximo = (i + 1) % CAPACIDADE;
    if (this.n < CAPACIDADE) this.n++;
    return true;
  }

  private indiceDaCena(nome: string): number {
    const nomes = this.nomes;
    for (let k = 0; k < nomes.length; k++) if (nomes[k] === nome) return k;
    if (nomes.length >= MAX_CENAS) return MAX_CENAS - 1;
    nomes.push(nome);
    return nomes.length - 1;
  }

  /** Posição (no buffer circular) do quadro `k` contado do mais novo (0) para trás. */
  private posicao(k: number): number {
    return (this.proximo - 1 - k + CAPACIDADE * 2) % CAPACIDADE;
  }

  get quadros(): number {
    return this.n;
  }

  /** FPS (quadros / soma dos intervalos), p95 e pior intervalo dos quadros dos últimos `janelaMs`, contados a partir de `agora`. */
  resumo(agora: number, janelaMs: number): ResumoDeJanela {
    const corte = agora - janelaMs;
    let k = 0;
    let soma = 0;
    let pior = 0;
    while (k < this.n) {
      const p = this.posicao(k);
      if ((this.ts[p] as number) < corte) break;
      const d = this.dt[p] as number;
      this.rascunho[k] = d;
      soma += d;
      if (d > pior) pior = d;
      k++;
    }
    return { quadros: k, fps: soma > 0 ? arredonda((k * 1000) / soma) : 0, p95: percentil95(this.rascunho, k), pior: arredonda(pior) };
  }

  /** Resumo por cena dos últimos `JANELA_RELATORIO_MS`: o que o botão COPIAR exporta. */
  porCena(agora: number): Record<string, ResumoDeCena> {
    const corte = agora - JANELA_RELATORIO_MS;
    const saida: Record<string, ResumoDeCena> = {};
    for (let c = 0; c < this.nomes.length; c++) {
      let k = 0;
      let quadros = 0;
      let soma = 0;
      let pior = 0;
      let rsMin = Infinity;
      let rsMax = 0;
      for (let j = 0; j < this.n; j++) {
        const p = this.posicao(j);
        if ((this.ts[p] as number) < corte) break;
        if (this.cena[p] !== c) continue;
        const d = this.dt[p] as number;
        this.rascunho[k++] = d;
        quadros++;
        soma += d;
        if (d > pior) pior = d;
        const r = this.rs[p] as number;
        if (r < rsMin) rsMin = r;
        if (r > rsMax) rsMax = r;
      }
      if (quadros === 0) continue;
      saida[this.nomes[c] as string] = {
        quadros,
        segundos: arredonda(soma / 1000),
        fps: soma > 0 ? arredonda((quadros * 1000) / soma) : 0,
        p95: percentil95(this.rascunho, k),
        pior: arredonda(pior),
        rsMin,
        rsMax,
      };
    }
    return saida;
  }
}

/** p95 dos `k` primeiros valores de `v` (ordena essa fatia no próprio rascunho). */
function percentil95(v: Float32Array, k: number): number {
  if (k === 0) return 0;
  const fatia = v.subarray(0, k);
  fatia.sort();
  return arredonda(fatia[Math.min(k - 1, Math.max(0, Math.ceil(0.95 * k) - 1))] as number);
}

export interface AmbienteDoAparelho {
  readonly userAgent: string;
  readonly dpr: number;
  readonly tela: string;
  readonly canvas: string;
  readonly hardwareConcurrency: number | null;
  readonly deviceMemory: number | null;
  readonly versao: string;
}

export interface EstadoDoMedidor {
  readonly rs: number;
  readonly rsModo: string;
  readonly cena: string;
  readonly arteMiB: number | null;
  readonly longtasks: { readonly suportado: boolean; readonly ultimos5s: number; readonly piorMs: number; readonly totalDesdeLigar: number };
}

/** O JSON que o botão COPIAR coloca na área de transferência (sem dado pessoal: só o userAgent e números do aparelho). */
export function montarRelatorio(ag: AgregadorDeQuadros, agora: number, ambiente: AmbienteDoAparelho, estado: EstadoDoMedidor): object {
  return {
    formato: 'inno-fps-1',
    janelaS: JANELA_RELATORIO_MS / 1000,
    versao: ambiente.versao,
    userAgent: ambiente.userAgent,
    dpr: ambiente.dpr,
    tela: ambiente.tela,
    canvas: ambiente.canvas,
    hardwareConcurrency: ambiente.hardwareConcurrency,
    deviceMemoryGB: ambiente.deviceMemory,
    agora: { cena: estado.cena, rs: estado.rs, rsModo: estado.rsModo, arteMiB: estado.arteMiB },
    ultimos5s: ag.resumo(agora, JANELA_PICO_MS),
    porCena: ag.porCena(agora),
    longtasks: estado.longtasks,
  };
}
