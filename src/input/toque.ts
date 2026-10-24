import { posicaoLogica } from './mouse';
import type { TeclasVirtuais } from './teclas';

/** Joystick virtual: o botão (knob) anda no máximo 85% do raio. */
const ALCANCE_KNOB = 0.85;

export type DirecaoToque = 'ArrowLeft' | 'ArrowRight' | 'ArrowUp' | 'ArrowDown';

export interface PosicaoKnob {
  readonly dx: number;
  readonly dy: number;
}

/** Desloca o dedo (dx, dy a partir do centro) para dentro do alcance do knob. */
export function limitarKnob(dx: number, dy: number, raio: number): PosicaoKnob {
  const len = Math.hypot(dx, dy);
  const max = raio * ALCANCE_KNOB;
  if (len > max) return { dx: (dx * max) / len, dy: (dy * max) / len };
  return { dx, dy };
}

export type DirecoesDoKnob = Record<DirecaoToque, boolean>;
export const SEM_DIRECAO: Readonly<DirecoesDoKnob> = Object.freeze({ ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false });

/**
 * U1 (docs/auditoria-fidelidade-motor-2026-10-24.md §1.2, decisão do dono: fugir dos limiares do protótipo por fluidez). O joystick do protótipo
 * tratava cada eixo sozinho (`|dx| > 25%`, `dy < -35%`, `dy > 30%`): empurrar para a direita com 24° de deriva virava andar + PULAR, 21° para
 * baixo virava AGACHAR e parar, e oscilar no limiar de 25% virava "soltou e apertou" = DASH. Agora:
 *  - ZONAS ANGULARES (ângulo φ do dedo em relação ao eixo horizontal): φ < 35° só horizontal (tolera 35° de deriva); φ > 55° só vertical;
 *    entre os dois, a DIAGONAL (as duas direções) — só com ângulo claro (20° de faixa em torno de 45°).
 *  - HISTERESE: o limiar de entrada é maior que o de saída (horizontal 25%/15%, cima 35%/25%, baixo 30%/20% do raio) e a zona em que o dedo JÁ está
 *    se alarga 6° (horizontal até 41°, vertical a partir de 49°), então tremer em cima da fronteira não pisca a direção.
 * `anterior` = o que estava ativo no movimento anterior (ausente = tudo desligado, os limiares de ENTRADA).
 */
export const JOYSTICK = Object.freeze({
  /** Fração do raio (do dedo, já limitado pelo alcance do knob) para ligar/desligar cada direção. */
  horizontal: { liga: 0.25, desliga: 0.15 },
  cima: { liga: 0.35, desliga: 0.25 },
  baixo: { liga: 0.3, desliga: 0.2 },
  /** Graus: acima de `verticalEntra` é só vertical; abaixo de `horizontalEntra` é só horizontal; no meio, diagonal. A zona atual se alarga em `folgaAngular`. */
  horizontalEntra: 35,
  verticalEntra: 55,
  folgaAngular: 6,
  /** Ticks que uma direção do joystick segue segurada depois de o dedo sair da zona dela (a volta dentro disso nunca vira "soltou e apertou"). */
  soltaMinimaTicks: 2,
});

export function direcoesDoKnob(dx: number, dy: number, raio: number, anterior: Readonly<DirecoesDoKnob> = SEM_DIRECAO): DirecoesDoKnob {
  const r = Math.hypot(dx, dy) / raio;
  const fi = (Math.atan2(Math.abs(dy), Math.abs(dx)) * 180) / Math.PI; // 0 = horizontal, 90 = vertical
  const eraH = anterior.ArrowLeft || anterior.ArrowRight;
  const eraV = anterior.ArrowUp || anterior.ArrowDown;
  const { horizontalEntra: hE, verticalEntra: vE, folgaAngular: folga } = JOYSTICK;
  let zona: 'h' | 'v' | 'd';
  if (eraH && !eraV) zona = fi < hE + folga ? 'h' : fi > vE ? 'v' : 'd';
  else if (eraV && !eraH) zona = fi > vE - folga ? 'v' : fi < hE ? 'h' : 'd';
  else zona = fi < hE ? 'h' : fi > vE ? 'v' : 'd';
  const querH = zona !== 'v';
  const querV = zona !== 'h';
  const passa = (liga: number, desliga: number, estava: boolean): boolean => r >= (estava ? desliga : liga);
  return {
    ArrowLeft: querH && dx < 0 && passa(JOYSTICK.horizontal.liga, JOYSTICK.horizontal.desliga, anterior.ArrowLeft),
    ArrowRight: querH && dx > 0 && passa(JOYSTICK.horizontal.liga, JOYSTICK.horizontal.desliga, anterior.ArrowRight),
    ArrowUp: querV && dy < 0 && passa(JOYSTICK.cima.liga, JOYSTICK.cima.desliga, anterior.ArrowUp),
    ArrowDown: querV && dy > 0 && passa(JOYSTICK.baixo.liga, JOYSTICK.baixo.desliga, anterior.ArrowDown),
  };
}

const OPOSTA: Readonly<Record<DirecaoToque, DirecaoToque>> = { ArrowLeft: 'ArrowRight', ArrowRight: 'ArrowLeft', ArrowUp: 'ArrowDown', ArrowDown: 'ArrowUp' };

/**
 * U4: ticks que o dedo no ESPECIAL fica "sem spSeg" (o botão tem `data-nivel="N"` no HTML). A carga do MASHI (AMINU) decide em mt = S-1 (~tick 10)
 * se o `spSeg` está apertado; ELA NÃO RETOMA depois. Por isso qualquer valor >= ~10 desliga a carga no toque (ensaio em tests/unit/toque-fluidez.test.ts):
 * o mecanismo existe e está testado, mas o index.html NÃO põe o atributo (0 = desligado) até a decisão do dono/Vega.
 */
export const ATRASO_DE_NIVEL_PADRAO = 0;

/** Aparelho com tela de toque (mesmo teste do protótipo). */
export function temToque(alvo: Window): boolean {
  return 'ontouchstart' in alvo || alvo.navigator.maxTouchPoints > 0;
}

export interface OpcoesToque {
  readonly alvo: Window;
  readonly teclas: TeclasVirtuais;
  readonly canvas: HTMLCanvasElement;
  /** Descida de tecla virtual (menus e atalhos), igual ao teclado. */
  readonly aoTecla: (tecla: string) => void;
  /** Toque direto no canvas (confirma menus / destrava o áudio). Coordenadas lógicas. */
  readonly aoToqueCanvas?: (x: number, y: number) => void;
}

function acharToque(lista: TouchList, id: number): Touch | null {
  for (let i = 0; i < lista.length; i++) {
    const t = lista.item(i);
    if (t && t.identifier === id) return t;
  }
  return null;
}

/** Desenhos de estado dos controles (apertado, apagado, joystick ativo): carregados ao ligar o toque; sem isso o 1º aperto pode piscar sem desenho. */
const SVGS_DE_ESTADO: readonly string[] = [
  ...['soco-leve', 'soco-forte', 'chute-leve', 'chute-forte', 'esquiva', 'especial', 'pausa'].map((n) => `${n}-pressionado`),
  'esquiva-desabilitado',
  'especial-desabilitado',
  'joystick-aro-ativo',
  'joystick-bolinha-pressionada',
];

/** Pede os SVGs de estado ao navegador (ficam no cache; o CSS os usa por `url()`). Fora do navegador (testes em Node) não faz nada. */
export function precarregarDesenhosDoToque(base: string = import.meta.env.BASE_URL): void {
  if (typeof Image === 'undefined') return;
  for (const nome of SVGS_DE_ESTADO) new Image().src = `${base}assets/ui/toque/${nome}.svg`;
}

/**
 * Camada de toque (joystick à esquerda, 4 botões + R1 + pausa à direita), porte da IIFE do protótipo.
 * Os controles viram teclas virtuais do jogador 1. Devolve `null` quando o aparelho não tem toque.
 * O HTML (#touch, #joy, #knob, .b[data-k]) mora em index.html; o CSS em toque.css.
 */
export function ligarToque(op: OpcoesToque): (() => void) | null {
  if (!temToque(op.alvo)) return null;
  const doc = op.alvo.document;
  doc.body.classList.add('touch');
  precarregarDesenhosDoToque();
  const desfazer: Array<() => void> = [];
  const ouvir = (el: HTMLElement, tipo: 'touchstart' | 'touchmove' | 'touchend' | 'touchcancel', fn: (e: TouchEvent) => void): void => {
    const ouvinte = fn as EventListener;
    el.addEventListener(tipo, ouvinte, { passive: false });
    desfazer.push(() => el.removeEventListener(tipo, ouvinte));
  };

  // botões: cada um aperta a(s) tecla(s) do seu data-k (R-9: o SUPER tem duas, "x,v" = SFT+CFT juntas)
  doc.querySelectorAll<HTMLElement>('#touch .b').forEach((el) => {
    const bruto = el.getAttribute('data-k');
    if (!bruto) return;
    const teclas = bruto.split(',');
    const atrasoDeNivel = Number(el.getAttribute('data-nivel') ?? ATRASO_DE_NIVEL_PADRAO) || 0;
    let preso = false;
    const descer = (e: TouchEvent): void => {
      e.preventDefault();
      if (preso) return;
      preso = true;
      el.classList.add('on');
      for (const tecla of teclas) {
        op.teclas.definir(tecla, true, atrasoDeNivel);
        op.aoTecla(tecla);
      }
    };
    const subir = (e: TouchEvent): void => {
      e.preventDefault();
      if (!preso) return;
      preso = false;
      el.classList.remove('on');
      for (const tecla of teclas) op.teclas.definir(tecla, false);
    };
    ouvir(el, 'touchstart', descer);
    ouvir(el, 'touchend', subir);
    ouvir(el, 'touchcancel', subir);
  });

  // joystick analógico -> setas do jogador 1
  const joy = doc.getElementById('joy');
  const knob = doc.getElementById('knob');
  if (joy && knob) {
    let id: number | null = null;
    let ativas: DirecoesDoKnob = { ...SEM_DIRECAO };
    /** Setas que ESTE joystick apertou e ainda não soltou de vez (teclado/gamepad nunca são tocados ao levantar o dedo). */
    const minhas = new Set<DirecaoToque>();
    const mudar = (k: DirecaoToque, v: boolean): void => {
      if (ativas[k] === v) return;
      ativas = { ...ativas, [k]: v };
      if (v) {
        // direção nova: a oposta sai NA HORA (soltar atrasado deixaria esquerda+direita juntas por 2 ticks) e a própria volta a valer sem nova borda se ainda estava presa
        const op_ = OPOSTA[k];
        if (ativas[op_]) ativas = { ...ativas, [op_]: false };
        if (minhas.delete(op_)) op.teclas.definir(op_, false);
        const jaSegurada = op.teclas.estaSegurada(k);
        op.teclas.definir(k, true);
        minhas.add(k);
        if (!jaSegurada) op.aoTecla(k);
      } else op.teclas.soltarDepois(k, JOYSTICK.soltaMinimaTicks); // saiu da zona: segura mais 2 ticks (a volta nesse prazo cancela)
    };
    const mover = (t: Touch): void => {
      const r = joy.getBoundingClientRect();
      const raio = r.width / 2;
      const { dx, dy } = limitarKnob(t.clientX - (r.left + raio), t.clientY - (r.top + raio), raio);
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const d = direcoesDoKnob(dx, dy, raio, ativas);
      // as direções que ENTRAM primeiro (a oposta sai na hora), depois as que saem
      for (const k of Object.keys(d) as DirecaoToque[]) if (d[k]) mudar(k, true);
      for (const k of Object.keys(d) as DirecaoToque[]) if (!d[k]) mudar(k, false);
    };
    const fim = (cancelado = false): void => {
      id = null;
      joy.classList.remove('ativo');
      knob.style.transform = '';
      // dedo levantado = parar de verdade (intenção explícita): solta NA HORA, sem o prazo de 2 ticks (que é só contra tremor do dedo)
      // touchcancel (ligação, gesto do sistema) = soltura forçada, sem o 1 tick da trava de direção (U2): quem cancela não "tocou"
      for (const k of minhas) (cancelado ? op.teclas.cancelar(k) : op.teclas.definir(k, false));
      minhas.clear();
      ativas = { ...SEM_DIRECAO };
    };
    ouvir(joy, 'touchstart', (e) => {
      e.preventDefault();
      if (id !== null) return;
      const t = e.changedTouches.item(0);
      if (!t) return;
      id = t.identifier;
      joy.classList.add('ativo');
      mover(t);
    });
    ouvir(joy, 'touchmove', (e) => {
      e.preventDefault();
      if (id === null) return;
      const t = acharToque(e.touches, id);
      if (t) mover(t);
    });
    ouvir(joy, 'touchend', (e) => {
      e.preventDefault();
      if (id !== null && acharToque(e.changedTouches, id)) fim();
    });
    ouvir(joy, 'touchcancel', () => fim(true));
  }

  // toque no canvas: confirma menus e inicia o áudio
  ouvir(op.canvas, 'touchstart', (e) => {
    e.preventDefault();
    const t = e.changedTouches.item(0);
    if (!t) return;
    const p = posicaoLogica(op.canvas.getBoundingClientRect(), t.clientX, t.clientY);
    op.aoToqueCanvas?.(p.x, p.y);
  });

  return () => {
    desfazer.forEach((f) => f());
    doc.body.classList.remove('touch');
  };
}
