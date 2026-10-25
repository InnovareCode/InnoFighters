import { PAD_MAP, type BotaoPad } from './mapa';
import type { TeclasVirtuais } from './teclas';

/** Subconjunto de `Gamepad` que usamos (facilita testar sem navegador). */
export interface PadLike {
  readonly connected: boolean;
  readonly buttons: ReadonlyArray<{ readonly pressed: boolean }>;
  readonly axes: readonly number[];
}

export type EstadoPad = Record<BotaoPad, boolean>;

const ZONA_MORTA = 0.5;
/** Sem controle nenhum conectado, a lista do navegador só é pedida a cada tantos quadros (o controle novo é visto em ~0,25 s). */
const CONSULTA_OCIOSA = 15;

/** Estado lógico de um controle (porte do `st` de pollPads): direcionais por botão ou analógico. */
export function lerEstadoPad(pad: PadLike): EstadoPad {
  const b = (i: number): boolean => !!pad.buttons[i]?.pressed;
  const ax = pad.axes[0] ?? 0;
  const ay = pad.axes[1] ?? 0;
  return {
    up: b(12) || ay < -ZONA_MORTA,
    down: b(13) || ay > ZONA_MORTA,
    left: b(14) || ax < -ZONA_MORTA,
    right: b(15) || ax > ZONA_MORTA,
    a: b(0),
    b: b(1),
    x: b(2),
    y: b(3),
    l1: b(4),
    l2: b(6),
    r1: b(5),
    r2: b(7),
    start: b(9),
  };
}

const BOTOES: readonly BotaoPad[] = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'r1', 'r2', 'l1', 'l2', 'start'];

export type ObterPads = () => ArrayLike<PadLike | null> | null | undefined;

/**
 * Consulta os controles uma vez por quadro e converte mudanças de botão em teclas virtuais
 * (o 1º controle é o jogador 1, o 2º é o jogador 2). Um erro desliga o gamepad, como no protótipo.
 *
 * O jogador de cada controle é FIXO enquanto ele estiver conectado, pela posição dele na lista do navegador (`navigator.getGamepads()`):
 * numerar pela posição na lista só dos conectados fazia o controle do P2 virar o slot do P1 quando o do P1 caía, e o botão que o P2 já
 * segurava disparava um golpe/ESP novo do P1 (e o P2 perdia as teclas dele). Um controle novo ocupa o menor slot livre.
 */
export class Gamepads {
  private anterior: [Partial<EstadoPad>, Partial<EstadoPad>] = [{}, {}];
  private quebrado = false;
  /** Posição do controle na lista do navegador -> jogador (0 = P1, 1 = P2). */
  private readonly slots = new Map<number, 0 | 1>();

  constructor(
    private readonly teclas: TeclasVirtuais,
    private readonly aoTecla: (tecla: string) => void,
    private readonly obterPads: ObterPads = () => (typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null),
  ) {}

  /** Consultas seguidas sem nenhum controle conectado: sem controle, só olha a cada `CONSULTA_OCIOSA` quadros (cada `getGamepads()` aloca uma lista nova no navegador). */
  private ociosas = 0;

  consultar(): void {
    if (this.quebrado) return;
    if (this.slots.size === 0 && this.ociosas > 0 && this.ociosas % CONSULTA_OCIOSA !== 0) {
      this.ociosas++;
      return;
    }
    try {
      const todos = Array.from(this.obterPads() ?? []);
      const vivos: Array<[number, PadLike]> = [];
      todos.forEach((p, idx) => {
        if (p && p.connected) vivos.push([idx, p]);
      });
      this.ociosas = vivos.length === 0 && this.slots.size === 0 ? this.ociosas + 1 : 0;
      // controle que sumiu (desconectado, ou na lista com connected:false): solta o que ele segurava e libera o slot
      for (const [idx, slot] of [...this.slots]) {
        if (vivos.some(([i]) => i === idx)) continue;
        this.soltarSlot(slot);
        this.slots.delete(idx);
      }
      for (const [idx, pad] of vivos) {
        let slot = this.slots.get(idx);
        if (slot === undefined) {
          const livre = ([0, 1] as const).find((s) => ![...this.slots.values()].includes(s));
          if (livre === undefined) continue; // só 2 jogadores
          slot = livre;
          this.slots.set(idx, slot);
        }
        const i = slot;
        const mapa = PAD_MAP[i];
        const atual = lerEstadoPad(pad);
        const antes = this.anterior[i];
        // mais de um botão pode virar a MESMA tecla (R1 e R2 = especial): a tecla fica segurada enquanto QUALQUER um estiver
        // apertado; tratar cada botão sozinho soltava o especial (e o MASHI da S2, que carrega segurando) ao soltar só um deles
        for (const tecla of new Set(BOTOES.map((botao) => mapa[botao]))) {
          const daTecla = BOTOES.filter((botao) => mapa[botao] === tecla);
          const agora = daTecla.some((botao) => atual[botao]);
          if (agora !== daTecla.some((botao) => !!antes[botao])) {
            this.teclas.definir(tecla, agora);
            if (agora) this.aoTecla(tecla);
          }
        }
        this.anterior[i] = atual;
      }
    } catch {
      this.quebrado = true;
    }
  }

  private soltarSlot(i: 0 | 1): void {
    const antes = this.anterior[i];
    for (const botao of BOTOES) if (antes[botao]) this.teclas.cancelar(PAD_MAP[i][botao]);
    this.anterior[i] = {};
  }
}
