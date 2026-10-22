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

/** Quais setas estão ativas para o deslocamento do knob (limiares do protótipo: 25% / 35% / 30% do raio). */
export function direcoesDoKnob(dx: number, dy: number, raio: number): Record<DirecaoToque, boolean> {
  return {
    ArrowLeft: dx < -raio * 0.25,
    ArrowRight: dx > raio * 0.25,
    ArrowUp: dy < -raio * 0.35,
    ArrowDown: dy > raio * 0.3,
  };
}

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

  // botões: cada um aperta a tecla do seu data-k
  doc.querySelectorAll<HTMLElement>('#touch .b').forEach((el) => {
    const tecla = el.getAttribute('data-k');
    if (!tecla) return;
    let preso = false;
    const descer = (e: TouchEvent): void => {
      e.preventDefault();
      if (preso) return;
      preso = true;
      el.classList.add('on');
      op.teclas.definir(tecla, true);
      op.aoTecla(tecla);
    };
    const subir = (e: TouchEvent): void => {
      e.preventDefault();
      if (!preso) return;
      preso = false;
      el.classList.remove('on');
      op.teclas.definir(tecla, false);
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
    const ativas: Record<DirecaoToque, boolean> = { ArrowLeft: false, ArrowRight: false, ArrowUp: false, ArrowDown: false };
    const mudar = (k: DirecaoToque, v: boolean): void => {
      if (ativas[k] === v) return;
      ativas[k] = v;
      op.teclas.definir(k, v);
      if (v) op.aoTecla(k);
    };
    const mover = (t: Touch): void => {
      const r = joy.getBoundingClientRect();
      const raio = r.width / 2;
      const { dx, dy } = limitarKnob(t.clientX - (r.left + raio), t.clientY - (r.top + raio), raio);
      knob.style.transform = `translate(${dx}px,${dy}px)`;
      const d = direcoesDoKnob(dx, dy, raio);
      mudar('ArrowLeft', d.ArrowLeft);
      mudar('ArrowRight', d.ArrowRight);
      mudar('ArrowUp', d.ArrowUp);
      mudar('ArrowDown', d.ArrowDown);
    };
    const fim = (): void => {
      id = null;
      joy.classList.remove('ativo');
      knob.style.transform = '';
      (Object.keys(ativas) as DirecaoToque[]).forEach((k) => mudar(k, false));
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
    ouvir(joy, 'touchcancel', fim);
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
