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
    r1: b(5),
    r2: b(7),
    start: b(9),
  };
}

const BOTOES: readonly BotaoPad[] = ['up', 'down', 'left', 'right', 'a', 'b', 'x', 'y', 'r1', 'r2', 'start'];

export type ObterPads = () => ArrayLike<PadLike | null> | null | undefined;

/**
 * Consulta os controles uma vez por quadro e converte mudanças de botão em teclas virtuais
 * (o controle 0 é o jogador 1, o 1 é o jogador 2). Um erro desliga o gamepad, como no protótipo.
 */
export class Gamepads {
  private anterior: [Partial<EstadoPad>, Partial<EstadoPad>] = [{}, {}];
  private quebrado = false;

  constructor(
    private readonly teclas: TeclasVirtuais,
    private readonly aoTecla: (tecla: string) => void,
    private readonly obterPads: ObterPads = () => (typeof navigator !== 'undefined' ? navigator.getGamepads?.() : null),
  ) {}

  consultar(): void {
    if (this.quebrado) return;
    try {
      const todos = Array.from(this.obterPads() ?? []);
      const pads = todos.filter((p): p is PadLike => !!p && p.connected);
      pads.slice(0, 2).forEach((pad, i) => {
        const mapa = PAD_MAP[i === 0 ? 0 : 1];
        const atual = lerEstadoPad(pad);
        const antes = this.anterior[i === 0 ? 0 : 1];
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
        this.anterior[i === 0 ? 0 : 1] = atual;
      });
      // controle desconectado com botão apertado: solta o que ele segurava (senão o especial fica 'segurado' para sempre)
      for (let i = Math.min(pads.length, 2); i < 2; i++) this.soltarSlot(i === 0 ? 0 : 1);
    } catch {
      this.quebrado = true;
    }
  }

  private soltarSlot(i: 0 | 1): void {
    const antes = this.anterior[i];
    for (const botao of BOTOES) if (antes[botao]) this.teclas.definir(PAD_MAP[i][botao], false);
    this.anterior[i] = {};
  }
}
