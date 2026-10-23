import type { Elenco } from '../assets/elenco';
import type { EstadoLutador, LeituraLuta, LutadorLeitura, ProjetilLeitura } from '../core/contratos';
import type { GolpeMontado } from '../data/tipos';
import { chDaFicha } from './lutador';
import { forcaDoGolpe, mola, pesoDe, tremorDoDefensor } from './mola';

/*
 * FLUIDEZ (V2-2, spec-revisao-motor-luta-v2 §7.2 a §7.3): tudo que só existe no DESENHO. A lógica anda a 60 ticks/s; o monitor pede 60, 90, 120 ou 144
 * quadros/s. Esta classe guarda o estado de ANTES de cada tick e entrega, para cada quadro, uma LEITURA DESENHÁVEL com:
 *  - posição de lutadores, projéteis e câmera interpolada entre o tick anterior e o atual (`alfa` = acc / PASSO);
 *  - a mola (antecipação, squash, inclinação...) somada à pose, também interpolada (nada pula no tick);
 *  - o tremor de quem apanha durante o congelamento do acerto.
 * O motor não muda: lê-se a leitura (C3) e devolve-se uma cópia de ler. Com `alfa = 1` e sem mola é exatamente a leitura (o oráculo de pixel não vê nada).
 * Nomes de pose, facing, HUD e salto > 120 px (troca de lado, reinício de round) NÃO são interpolados.
 */

/** Deslocamento acima do qual a posição pula em vez de deslizar (troca de lado, reinício de round, fim de filme). */
export const SALTO_MAXIMO = 120;

type Transf = readonly [dx: number, dy: number, sx: number, sy: number, rot: number];

type AntLutador = { x: number; y: number; t: Transf };
type Ponto = { x: number; y: number };

export interface OpcoesDaVista {
  /** Mola e tremor do rival ligados? (padrão: sim). A interpolação não depende disto. */
  readonly mola?: boolean;
  /** Tremor do rival no congelamento (a opção "tremor de tela" das Opções vale também para ele). */
  readonly tremor?: boolean;
}

const lerp = (a: number, b: number, p: number): number => a + (b - a) * p;
const entre = (de: number, para: number, alfa: number): number => (Math.abs(para - de) > SALTO_MAXIMO ? para : lerp(de, para, alfa));

export class Fluidez {
  private ant: [AntLutador, AntLutador] | null = null;
  private antProj = new Map<number, Ponto>();
  private antCam: { x: number; z: number } | null = null;
  /** `y` visto no último `gravar` por lutador: a velocidade vertical (queda no ar) é a diferença para o tick seguinte. */
  private ultimoY: [number, number] | null = null;
  private estado: [{ e: EstadoLutador; desde: number }, { e: EstadoLutador; desde: number }] = [
    { e: 'idle', desde: 0 },
    { e: 'idle', desde: 0 },
  ];

  /** Nova luta / nova cena: esquece o passado (o 1º quadro desenha o estado atual, sem deslizar de lugar nenhum). */
  zerar(): void {
    this.ant = null;
    this.antProj.clear();
    this.antCam = null;
    this.ultimoY = null;
  }

  /** Ticks que o lutador está no estado atual (a leitura não traz `Fighter.st`; só a vitória usa). */
  private ticksNoEstado(luta: LeituraLuta, i: 0 | 1): number {
    const f = luta.fighters[i];
    const s = this.estado[i];
    if (s.e !== f.state) {
      s.e = f.state;
      s.desde = luta.tick;
    }
    return Math.max(0, luta.tick - s.desde);
  }

  private transformacao(luta: LeituraLuta, i: 0 | 1, elenco: Elenco, usarMola: boolean, vy: number): Transf {
    const f = luta.fighters[i];
    const P = f.pose;
    if (!usarMola) return [P.dx, P.dy, P.sx, P.sy, P.rot];
    const ch = chDaFicha(elenco[f.id].ch, f.ficha);
    // a arte antiga (`legacy`) já tem a mola dela no `poseT`; aqui é só para os atlas novos
    if (ch.legacy) return [P.dx, P.dy, P.sx, P.sy, P.rot];
    const golpe = f.move === null ? null : ((ch.moves as Readonly<Record<string, GolpeMontado | undefined>>)[f.move] ?? null);
    const m = mola(f, golpe, pesoDe(f.id), this.ticksNoEstado(luta, i), vy);
    return [P.dx + m.dx, P.dy + m.dy, P.sx * m.sx, P.sy * m.sy, P.rot + m.rot];
  }

  /**
   * Guarda o estado de ANTES de um `game.update`. Chamar no início de TODO `update` da cena de luta (inclusive pausa, cinemática, provocação e entrada:
   * nesses casos nada anda e o "anterior" fica igual ao atual, então nada desliza).
   */
  gravar(luta: LeituraLuta, elenco: Elenco, opcoes: OpcoesDaVista = {}): void {
    const usarMola = opcoes.mola !== false;
    const [a, b] = luta.fighters;
    const vy = (f: LutadorLeitura, i: 0 | 1): number => (this.ultimoY ? f.y - this.ultimoY[i] : 0);
    this.ant = [
      { x: a.x, y: a.y, t: this.transformacao(luta, 0, elenco, usarMola, vy(a, 0)) },
      { x: b.x, y: b.y, t: this.transformacao(luta, 1, elenco, usarMola, vy(b, 1)) },
    ];
    this.ultimoY = [a.y, b.y];
    this.antProj.clear();
    for (const p of luta.projectiles) this.antProj.set(p.id, { x: p.x, y: p.y });
    this.antCam = { x: luta.cam.x, z: luta.cam.z };
  }

  /**
   * A leitura a desenhar neste quadro. `alfa` em [0, 1]: 0 = o estado de antes do último tick, 1 = o atual.
   * Devolve um objeto novo cuja raiz herda da luta (getters como `timer` continuam valendo); `fighters`, `projectiles` e `cam` são cópias.
   */
  vista(luta: LeituraLuta, alfa: number, elenco: Elenco, opcoes: OpcoesDaVista = {}): LeituraLuta {
    const usarMola = opcoes.mola !== false;
    const al = alfa < 0 ? 0 : alfa > 1 ? 1 : alfa;
    const ant = this.ant;
    const tremor = opcoes.tremor !== false && luta.hitstop > 0;
    const fighters = [0, 1].map((n) => {
      const i = n as 0 | 1;
      const f = luta.fighters[i];
      const vy = this.ultimoY ? f.y - this.ultimoY[i] : 0;
      const t = this.transformacao(luta, i, elenco, usarMola, vy);
      const antes = ant?.[i];
      // x/y interpolados; o resto da transformação também (a antecipação "entra" em vez de pular no tick)
      const x = antes ? entre(antes.x, f.x, al) : f.x;
      const y = antes ? entre(antes.y, f.y, al) : f.y;
      const mistura = (k: 0 | 1 | 2 | 3 | 4): number => (antes ? lerp(antes.t[k], t[k], al) : t[k]);
      let dx = mistura(0);
      const dy = mistura(1);
      const sx = mistura(2);
      const sy = mistura(3);
      const rot = mistura(4);
      if (tremor && usarMola && apanha(f)) {
        const atacante = luta.fighters[(1 - i) as 0 | 1];
        const forca = forcaDoGolpe(atacante.state === 'move' ? atacante.move : null);
        const amp = tremorDoDefensor(forca, pesoDe(f.id));
        // a cada tick de `Game.t` (que anda durante o congelamento) o lado troca; `dx` é no sentido do olhar, então vira px de tela com facing * flip
        dx += (luta.t % 2 === 0 ? amp : -amp) * f.facing * f.pose.flip;
      }
      // cópia com os campos próprios + os dois getters do contrato (`id`, `esquiva`) que a cópia perderia
      const v: LutadorLeitura = {
        ...f,
        id: f.id,
        esquiva: f.esquiva ?? 0,
        x,
        y,
        pose: { ...f.pose, dx, dy, sx, sy, rot },
      };
      return v;
    }) as [LutadorLeitura, LutadorLeitura];
    const projectiles: ProjetilLeitura[] = luta.projectiles.map((p) => {
      const antes = this.antProj.get(p.id);
      return antes ? { ...p, x: entre(antes.x, p.x, al), y: entre(antes.y, p.y, al) } : p;
    });
    const antCam = this.antCam;
    const cam = antCam ? { ...luta.cam, x: entre(antCam.x, luta.cam.x, al), z: lerp(antCam.z, luta.cam.z, al) } : luta.cam;
    return Object.create(luta, {
      fighters: { value: fighters },
      projectiles: { value: projectiles },
      cam: { value: cam },
    }) as LeituraLuta;
  }
}

/** Quem leva o acerto no congelamento: atordoado, defendendo, ou derrubado/KO no tick do golpe (`flash` ainda aceso). */
function apanha(f: LutadorLeitura): boolean {
  return f.state === 'hit' || f.state === 'block' || ((f.state === 'down' || f.state === 'ko') && f.flash > 0);
}
