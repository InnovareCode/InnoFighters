import {
  AgregadorDeQuadros,
  JANELA_FPS_MS,
  JANELA_PICO_MS,
  JANELA_RELATORIO_MS,
  montarRelatorio,
  type AmbienteDoAparelho,
  type EstadoDoMedidor,
} from './medidor-agregacao';

/*
 * MEDIDOR DE FPS NO APARELHO (`?fps=1`; docs/medicao-em-aparelho.md). Desligado não existe: `main.ts` só importa este módulo quando a URL pede, e o
 * laço do jogo não chama nada. Ligado: um quadro custa um registro em buffers fixos (sem alocar); o texto muda a cada 500 ms.
 */

const ATUALIZA_A_CADA_MS = 500;

/** `?fps=1` (ou `true`) liga. */
export function medidorLigado(busca: string): boolean {
  const v = new URLSearchParams(busca).get('fps');
  return v === '1' || v === 'true';
}

interface Cena {
  readonly name: string;
  readonly scene?: unknown;
  readonly m?: unknown;
}

interface Flag {
  readonly ativa?: boolean;
  readonly ativo?: boolean;
}

/** O nome da cena/fase que está sendo desenhada (menu, select, luta, luta/tarja-super, luta/filme...). Só lê campos; constantes, sem alocar. */
export function rotuloDaCena(ui: Cena): string {
  if (ui.name !== 'fight') return ui.name || 'boot';
  const s = ui.scene as {
    espera?: { pronta?: boolean };
    paused?: boolean;
    entrada?: Flag;
    provocacao?: Flag;
    filme?: Flag;
    tarjaDoSuper?: Flag;
    cine?: Flag;
    faixaRitmo?: Flag;
  } | null;
  const g = (ui.m as { game?: { phase?: string; hitstop?: number } } | null)?.game;
  if (!s) return 'luta';
  if (s.espera && s.espera.pronta === false) return 'luta/carregando';
  if (s.paused) return 'luta/pausa';
  if (s.entrada?.ativa) return 'luta/entrada-chefe';
  if (s.provocacao?.ativa) return 'luta/provocacao';
  if (s.filme?.ativo) return 'luta/filme';
  if (s.tarjaDoSuper?.ativa) return 'luta/tarja-super';
  if (s.cine?.ativa) return 'luta/tarja-especial';
  if (s.faixaRitmo?.ativa) return 'luta/faixa-especial';
  if (g?.phase === 'fight') return (g.hitstop ?? 0) > 0 ? 'luta/hitstop' : 'luta';
  return g?.phase ? `luta/${g.phase}` : 'luta';
}

export interface FontesDoMedidor {
  readonly rotulo: () => string;
  readonly rs: () => number;
  /** 'auto' (governador), 'fixo' (desktop) ou 'forcado' (`?rs=`). */
  readonly rsModo: () => string;
  /** MiB de arte decodificada, ou null se ainda não há. */
  readonly arteMiB: () => number | null;
  readonly versao: string;
}

function ambienteDoAparelho(canvas: HTMLCanvasElement | null, versao: string): AmbienteDoAparelho {
  const nav = navigator as Navigator & { deviceMemory?: number };
  return {
    userAgent: nav.userAgent,
    dpr: window.devicePixelRatio,
    tela: `${window.innerWidth}x${window.innerHeight}`,
    canvas: canvas ? `${canvas.width}x${canvas.height}` : '',
    hardwareConcurrency: nav.hardwareConcurrency ?? null,
    deviceMemory: nav.deviceMemory ?? null,
    versao,
  };
}

export class MedidorDeFps {
  private readonly agregador = new AgregadorDeQuadros();
  private readonly caixa: HTMLDivElement;
  private readonly linha1: HTMLDivElement;
  private readonly linha2: HTMLDivElement;
  private readonly botao: HTMLButtonElement;
  private ultimoTs = 0;
  private proxima = 0;
  private restauraBotao = 0;
  /** Long tasks (PerformanceObserver): instante e duração dos últimos 64. */
  private readonly ltTs = new Float64Array(64);
  private readonly ltDur = new Float32Array(64);
  private ltN = 0;
  private ltSuportado = false;

  constructor(
    private readonly fontes: FontesDoMedidor,
    private readonly canvas: HTMLCanvasElement | null = document.getElementById('jogo') as HTMLCanvasElement | null,
  ) {
    const caixa = document.createElement('div');
    caixa.id = 'fps';
    const e = caixa.style;
    e.position = 'fixed';
    // fora da zona dos botões de toque (joystick à esquerda, botões à direita, pausa no topo) e dentro da margem segura: base, centro
    e.left = '50%';
    e.bottom = 'max(env(safe-area-inset-bottom, 0px), 6px)';
    e.transform = 'translateX(-50%)';
    e.zIndex = '8';
    e.pointerEvents = 'none';
    e.font = '10px/1.3 ui-monospace, Menlo, Consolas, monospace';
    e.color = '#d8ffe0';
    e.background = 'rgba(0,0,0,.6)';
    e.padding = '2px 6px';
    e.borderRadius = '4px';
    e.whiteSpace = 'pre';
    e.textAlign = 'center';
    e.maxWidth = '60vw';
    this.linha1 = document.createElement('div');
    this.linha2 = document.createElement('div');
    this.botao = document.createElement('button');
    this.botao.type = 'button';
    this.botao.textContent = 'COPIAR';
    this.botao.setAttribute('aria-label', 'Copiar relatório de FPS');
    const b = this.botao.style;
    b.pointerEvents = 'auto';
    b.font = 'inherit';
    b.fontWeight = '700';
    b.margin = '2px 0 0';
    b.padding = '3px 10px';
    b.color = '#05030a';
    b.background = '#d8ffe0';
    b.border = '0';
    b.borderRadius = '3px';
    // o toque no botão não pode virar entrada do jogo (joystick, botões)
    for (const tipo of ['pointerdown', 'touchstart', 'mousedown', 'keydown']) this.botao.addEventListener(tipo, (ev) => ev.stopPropagation());
    this.botao.addEventListener('click', () => void this.copiar());
    caixa.append(this.linha1, this.linha2, this.botao);
    document.body.appendChild(caixa);
    this.caixa = caixa;
    this.linha1.textContent = 'medindo...';
    try {
      const obs = new PerformanceObserver((lista) => {
        for (const x of lista.getEntries()) this.registrarLongTask(x.startTime, x.duration);
      });
      obs.observe({ type: 'longtask', buffered: false });
      this.ltSuportado = true;
    } catch {
      this.ltSuportado = false;
    }
  }

  private registrarLongTask(inicio: number, dur: number): void {
    const i = this.ltN % 64;
    this.ltTs[i] = inicio;
    this.ltDur[i] = dur;
    this.ltN++;
  }

  private longtasks(agora: number): EstadoDoMedidor['longtasks'] {
    let n = 0;
    let pior = 0;
    const total = Math.min(this.ltN, 64);
    for (let i = 0; i < total; i++) {
      if ((this.ltTs[i] as number) >= agora - JANELA_PICO_MS) {
        n++;
        if ((this.ltDur[i] as number) > pior) pior = this.ltDur[i] as number;
      }
    }
    return { suportado: this.ltSuportado, ultimos5s: n, piorMs: Math.round(pior), totalDesdeLigar: this.ltN };
  }

  /** Chamar uma vez por quadro, com o `agora` do requestAnimationFrame. */
  quadro(agora: number): void {
    const dt = agora - this.ultimoTs;
    if (this.ultimoTs > 0) this.agregador.registrar(agora, dt, this.fontes.rotulo(), this.fontes.rs());
    this.ultimoTs = agora;
    if (agora >= this.proxima) {
      this.proxima = agora + ATUALIZA_A_CADA_MS;
      this.atualizar(agora);
    }
  }

  private estado(agora: number): EstadoDoMedidor {
    return { rs: this.fontes.rs(), rsModo: this.fontes.rsModo(), cena: this.fontes.rotulo(), arteMiB: this.fontes.arteMiB(), longtasks: this.longtasks(agora) };
  }

  private atualizar(agora: number): void {
    const s = this.agregador.resumo(agora, JANELA_FPS_MS);
    const p = this.agregador.resumo(agora, JANELA_PICO_MS);
    const e = this.estado(agora);
    this.linha1.textContent = `${s.fps.toFixed(0)} fps  p95 ${p.p95.toFixed(1)}  pior ${p.pior.toFixed(0)} ms (5s)`;
    const arte = e.arteMiB === null ? '-' : `${e.arteMiB.toFixed(0)}`;
    const lt = e.longtasks.suportado ? `${e.longtasks.ultimos5s}` : 'n/d';
    this.linha2.textContent = `RS ${e.rs} ${e.rsModo} | ${e.cena} | arte ${arte} MiB | lt ${lt}`;
  }

  /** O JSON do botão COPIAR (também usado pelos testes). */
  relatorio(agora: number = performance.now()): object {
    return montarRelatorio(this.agregador, agora, ambienteDoAparelho(this.canvas, this.fontes.versao), this.estado(agora));
  }

  private async copiar(): Promise<void> {
    const texto = JSON.stringify(this.relatorio());
    let ok = false;
    try {
      if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(texto);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok) ok = copiarPorSelecao(texto);
    if (!ok) {
      // último recurso: o navegador mostra o texto para o dono copiar na mão
      window.prompt('Copie o relatório:', texto);
      ok = true;
    }
    this.botao.textContent = ok ? 'COPIADO' : 'FALHOU';
    window.clearTimeout(this.restauraBotao);
    this.restauraBotao = window.setTimeout(() => {
      this.botao.textContent = 'COPIAR';
    }, 1500);
  }

  /** Remove o overlay (testes). */
  remover(): void {
    this.caixa.remove();
  }

  /** Janela do relatório em segundos (para a doc e os testes). */
  static readonly JANELA_RELATORIO_S = JANELA_RELATORIO_MS / 1000;
}

function copiarPorSelecao(texto: string): boolean {
  try {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.select();
    const ok = document.execCommand('copy');
    area.remove();
    return ok;
  } catch {
    return false;
  }
}

/** Cria o medidor com as fontes do jogo (chamado por `main.ts` só quando `?fps=1`). */
export function criarMedidor(fontes: FontesDoMedidor): MedidorDeFps {
  return new MedidorDeFps(fontes);
}
