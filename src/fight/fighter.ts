import { GRAVITY, GROUND, JUMP_FORCE, LARGURA, MAX_EN, WALK_SPEED } from '../core/constantes';
import type {
  ComboLeitura,
  EventoLuta,
  EstadoLutador,
  IdLutador,
  IndiceLutador,
  InputFrame,
  PoseAtual,
  RastroLeitura,
} from '../core/contratos';
import { INPUT_VAZIO } from '../core/contratos';
import { clamp, lerp } from '../core/math';
import { hasPose } from '../data/poses';
import type { LutadorMontado } from '../data/montar';
import type { GolpeMontado, NomeGolpe } from '../data/tipos';
import { attackBox, hurtbox, podeBloquear } from './colisao';
import { MOTIONS, dirNum, motion } from './comandos';
import type { Retangulo } from '../core/math';

export type ChaveAtaque = 'sp' | 'hp' | 'hk' | 'lp' | 'lk';
const ATK_KEYS: readonly ChaveAtaque[] = ['sp', 'hp', 'hk', 'lp', 'lk'];

/** Estado da IA de um lutador controlado pela CPU (Fighter.ai do protótipo). */
export type EstadoIa = {
  plan: PlanoIa | null;
  t: number;
  hold: number;
  holdInp: { back: boolean; down: boolean } | null;
  /** Último ataque (número) ou projétil ('p<id>') ao qual a IA já reagiu. */
  seen: number | string;
  chain: number;
};
export type PlanoIa = Partial<Record<'left' | 'right' | 'up' | 'down' | 'lp' | 'lk' | 'hp' | 'hk' | 'sp', boolean>> & { dur?: number };

/** O que o Fighter precisa da partida (injeção: o Fighter não conhece a classe Game). */
export interface PartidaParaLutador {
  emitir(ev: EventoLuta): void;
  /** Arremesso que acertou (Game.throwHit). */
  arremessar(a: Fighter, d: Fighter): void;
  /** Projétil `i` de `n` (Game.spawnProjectile). */
  lancarProjetil(f: Fighter, mv: GolpeMontado, i: number, n: number): void;
  /** Queda no chão após ser derrubado (onKnock: tremor + poeira). */
  aoCair(f: Fighter): void;
}

const novoIa = (): EstadoIa => ({ plan: null, t: 0, hold: 0, holdInp: null, seen: -1, chain: 0 });

export class Fighter {
  readonly indice: IndiceLutador;
  /** side do protótipo: 1 = P1 (esquerda), 2 = P2. */
  readonly side: 1 | 2;
  ch: LutadorMontado;
  /** Nível da CPU (0..2) ou null se humano. */
  cpu: number | null = null;
  score = 0;
  wins = 0;
  maxHp = 0;

  x = 0;
  y = GROUND;
  vx = 0;
  vy = 0;
  facing: 1 | -1 = 1;
  hp = 0;
  hpShown = 0;
  en = 0;
  state: EstadoLutador = 'idle';
  st = 0;
  age = 0;
  move: NomeGolpe | null = null;
  mt = 0;
  atkId = 0;
  stun = 0;
  hitDone = false;
  connected = false;
  shots = 0;
  airUsed = false;
  armor = 0;
  rep = 0;
  lagR = 14;
  walkDist = 0;
  hist: number[] = [];
  lastTap = { dir: 0, t: -99 };
  prevH = 0;
  dashDir = 0;
  dashLen = 0;
  jdir = 0;
  hitCount = 0;
  lastHitMt = 0;
  hitKind: 'H' | 'B' = 'H';
  trail: RastroLeitura[] = [];
  opp: Fighter | null = null;
  crouching = false;
  holdBack = false;
  buf: { k: ChaveAtaque; t: number } | null = null;
  flash = 0;
  invuln = 0;
  phase: 'air' | 'lie' | 'rise' = 'air';
  gotHits = 0;
  lastDmg = 0;
  dmgTaken = 0;
  maxCombo = 0;
  comboDmg = 0;
  ai: EstadoIa = novoIa();
  inp: InputFrame = INPUT_VAZIO;
  /** Pose calculada no fim de cada tick (poseT); `pose.dy` é o `pdy` do protótipo. */
  pose: PoseAtual = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 };
  combo: ComboLeitura = { hits: 0, dmg: 0, t: 0 };

  constructor(ch: LutadorMontado, indice: IndiceLutador) {
    this.indice = indice;
    this.side = indice === 0 ? 1 : 2;
    this.ch = ch;
    this.maxHp = ch.hp;
    this.reset(true);
  }

  get id(): IdLutador {
    return this.ch.id;
  }
  /** Compatível com LutadorLeitura.cpu. */
  get pdy(): number {
    return this.pose.dy;
  }

  setChar(ch: LutadorMontado): void {
    this.ch = ch;
    this.maxHp = ch.hp;
  }

  reset(full: boolean): void {
    this.x = this.side === 1 ? 270 : 690;
    this.y = GROUND;
    this.vx = 0;
    this.vy = 0;
    this.facing = this.side === 1 ? 1 : -1;
    this.maxHp = this.ch.hp;
    this.hp = this.maxHp;
    this.hpShown = this.hp;
    if (full) this.en = 0;
    else this.en = Math.max(this.en * 0.5, 20);
    this.state = 'idle';
    this.st = 0;
    this.age = 0;
    this.move = null;
    this.mt = 0;
    this.atkId = 0;
    this.stun = 0;
    this.hitDone = false;
    this.connected = false;
    this.shots = 0;
    this.airUsed = false;
    this.armor = 0;
    this.rep = 0;
    this.lagR = 14;
    this.walkDist = 0;
    this.hist = [];
    this.lastTap = { dir: 0, t: -99 };
    this.prevH = 0;
    this.dashDir = 0;
    this.dashLen = 0;
    this.jdir = 0;
    this.hitCount = 0;
    this.lastHitMt = 0;
    this.hitKind = 'H';
    this.trail = [];
    this.opp = null;
    this.crouching = false;
    this.holdBack = false;
    this.buf = null;
    this.flash = 0;
    this.invuln = 0;
    this.phase = 'air';
    this.gotHits = 0;
    this.lastDmg = 0;
    this.dmgTaken = 0;
    this.maxCombo = 0;
    this.comboDmg = 0;
    this.ai = novoIa();
    this.atualizarPose();
  }

  get grounded(): boolean {
    return this.y >= GROUND;
  }
  get attacking(): boolean {
    return this.state === 'move';
  }
  get untouchable(): boolean {
    return this.state === 'down' || this.state === 'ko' || this.invuln > 0 || this.state === 'win';
  }

  /** Golpe em curso. Só chamar com state === 'move'. */
  golpeAtual(): GolpeMontado {
    return this.ch.moves[this.move as NomeGolpe];
  }

  canBlock(lvl: GolpeMontado['lvl']): boolean {
    return podeBloquear(lvl, { noChao: this.grounded, segurandoTras: this.holdBack, state: this.state, agachado: this.crouching });
  }

  setState(s: EstadoLutador): void {
    if (this.state !== s) {
      this.state = s;
      this.st = 0;
    }
  }

  isLow(): boolean {
    return (
      this.state === 'crouch' ||
      (this.state === 'move' && !!this.golpeAtual().crouch) ||
      ((this.state === 'hit' || this.state === 'block') && this.crouching)
    );
  }

  /** Converte o botão apertado + direção no golpe correspondente (ex.: ↓ + soco forte = chp). */
  resolveAttack(k: ChaveAtaque, inp: InputFrame): NomeGolpe | null {
    const fwd = this.facing > 0 ? inp.right : inp.left;
    const punch = k === 'lp' || k === 'hp';
    const kick = k === 'lk' || k === 'hk';
    if (!this.grounded) return k === 'sp' ? null : (('j' + k) as NomeGolpe);
    if (k === 'sp') return inp.down ? 'sDown' : fwd ? 'sFwd' : 'sFire';
    // comandos clássicos: →↓↘ + soco, ↓↘→ + soco, ↓↙← + chute
    if (punch && this.motion(MOTIONS.dp) && this.canAfford('sDown')) return 'sDown';
    if (punch && this.motion(MOTIONS.qcf) && this.canAfford('sFire')) return 'sFire';
    if (kick && this.motion(MOTIONS.qcb) && this.canAfford('sFwd')) return 'sFwd';
    if (k === 'hp' && fwd && !inp.down && this.canThrow()) return 'throw'; // arremesso: → + soco forte colado no rival
    return ((inp.down ? 'c' : '') + k) as NomeGolpe;
  }

  motion(seq: readonly number[], win = 18): boolean {
    return motion(this.hist, seq, win);
  }

  canThrow(): boolean {
    const o = this.opp;
    if (!o || !o.grounded || o.untouchable || o.stun > 0) return false;
    if (!['idle', 'walk', 'crouch', 'land', 'prejump', 'dash', 'move'].includes(o.state)) return false;
    return Math.abs(o.x - this.x) < 108;
  }

  canAfford(name: NomeGolpe): boolean {
    const mv = this.ch.moves[name];
    return !mv.cost || this.en >= mv.cost;
  }

  startMove(name: NomeGolpe, jogo: PartidaParaLutador): void {
    const mv = this.ch.moves[name];
    this.move = name;
    this.mt = 0;
    this.hitDone = false;
    this.connected = false;
    this.shots = 0;
    this.atkId++;
    this.rep = 0;
    this.setState('move');
    if (this.grounded) this.vx = 0;
    if (mv.cost) {
      this.en -= mv.cost;
      jogo.emitir({ tipo: 'special', lutador: this.indice, pitch: this.ch.pitch });
    } else {
      jogo.emitir({ tipo: 'swing', lutador: this.indice, golpe: mv.kind === 'punch' ? 'punch' : 'kick' });
    }
    if (mv.air) this.airUsed = true;
    this.armor = mv.armor ? mv.S + mv.A : 0;
    if (mv.inv) this.invuln = Math.max(this.invuln, mv.S + mv.inv);
    this.hitCount = 0;
    this.lastHitMt = 0;
    if (name[0] === 's') this.hist.length = 0;
  }

  endMove(inp: InputFrame | null): void {
    this.move = null;
    if (!this.grounded) this.setState('jump');
    else this.setState(inp && inp.down ? 'crouch' : 'idle');
  }

  knockdown(dir: number, kb: number): void {
    this.setState('down');
    this.phase = 'air';
    this.vx = kb * dir * 1.15;
    this.vy = -9;
    if (this.grounded) this.y -= 1;
    this.stun = 0;
    this.move = null;
  }

  private poeira(jogo: PartidaParaLutador, x: number, n: number, power: number): void {
    jogo.emitir({ tipo: 'dust', x, n, power });
  }

  update(inp: InputFrame, opp: Fighter, jogo: PartidaParaLutador): void {
    this.corpoDoUpdate(inp, opp, jogo);
  }

  private corpoDoUpdate(inp: InputFrame, opp: Fighter, jogo: PartidaParaLutador): void {
    this.age++;
    this.st++;
    if (this.flash > 0) this.flash--;
    if (this.invuln > 0) this.invuln--;
    if (this.buf && --this.buf.t <= 0) this.buf = null;
    for (const k of ATK_KEYS) {
      if (inp[k]) {
        this.buf = { k, t: 9 };
        break;
      }
    }
    if (this.armor > 0) this.armor--;
    const back = this.facing > 0 ? inp.left : inp.right;
    this.holdBack = !!back;
    this.inp = inp;
    this.opp = opp;
    this.hist.push(dirNum(inp, this.facing));
    if (this.hist.length > 30) this.hist.shift();
    const hdir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    const tapped = hdir && hdir !== this.prevH;
    this.prevH = hdir;
    const cm = this.state === 'move' ? this.golpeAtual() : null;
    const trailing = this.state === 'dash' || (cm && (cm.type === 'rush' || cm.type === 'leap') && this.mt >= cm.S);
    if (trailing && this.age % 2 === 0) {
      this.trail.push({ x: this.x, y: this.y, name: this.poseT().name, f: this.facing, life: 10 });
    }
    for (const tr of this.trail) tr.life--;
    if (this.trail.length) this.trail = this.trail.filter((tr) => tr.life > 0);
    switch (this.state) {
      case 'ko':
        this.physics(jogo);
        if (this.grounded) this.vx *= 0.88;
        return;
      case 'down':
        this.updateDown(jogo);
        return;
      case 'hit':
      case 'block':
        if (this.grounded) this.vx *= 0.84;
        this.physics(jogo);
        if (--this.stun <= 0 && (this.state === 'hit' || this.state === 'block')) {
          this.gotHits = 0;
          this.setState(this.grounded ? (inp.down ? 'crouch' : 'idle') : 'jump');
        }
        return;
      case 'win':
        this.vx = 0;
        this.physics(jogo);
        return;
      case 'prejump': // agachadinha antes de saltar
        this.vx = 0;
        if (this.st >= 3) {
          this.vy = JUMP_FORCE * this.ch.jump;
          this.y -= 1;
          this.vx = this.jdir * WALK_SPEED * this.ch.spd * 1.3;
          this.setState('jump');
          this.airUsed = false;
          jogo.emitir({ tipo: 'jump', lutador: this.indice });
          this.poeira(jogo, this.x, 5, 0.8);
        }
        this.physics(jogo);
        return;
      case 'dash':
        this.vx =
          this.dashDir * this.facing * (this.dashDir > 0 ? 10.5 : 9) * this.ch.spd * Math.max(0, 1 - this.st / this.dashLen) * 1.25;
        if (this.st >= this.dashLen) this.setState('idle');
        this.physics(jogo);
        return;
      case 'move':
        this.updateMove(inp, opp, jogo);
        this.regen();
        return;
      default:
        break;
    }
    // ---- estados livres: parado, andando, agachado, pulando ----
    if (this.state === 'land' && this.st >= 4) this.setState('idle');
    if (this.grounded) {
      this.facing = opp.x >= this.x ? 1 : -1;
      this.crouching = !!inp.down;
      if (this.buf) {
        const nm = this.resolveAttack(this.buf.k, inp);
        this.buf = null;
        if (nm) {
          if (this.canAfford(nm)) {
            this.startMove(nm, jogo);
            this.physics(jogo);
            return;
          }
          jogo.emitir({ tipo: 'deny', lutador: this.indice });
        }
      }
      if (tapped && !inp.down && !inp.up && this.state !== 'land') {
        // toque duplo = corrida / recuo rápido
        if (this.lastTap.dir === hdir && this.age - this.lastTap.t < 13) {
          this.dashDir = hdir * this.facing;
          this.dashLen = this.dashDir > 0 ? 16 : 18;
          this.setState('dash');
          this.lastTap.t = -99;
          if (this.dashDir < 0) this.invuln = Math.max(this.invuln, 6);
          jogo.emitir({ tipo: 'jump', lutador: this.indice });
          this.poeira(jogo, this.x - this.facing * 20, 7, 1);
          this.physics(jogo);
          return;
        }
        this.lastTap = { dir: hdir, t: this.age };
      }
      if (this.state === 'land') {
        this.vx = 0;
      } else if (inp.down) {
        this.vx = 0;
        this.setState('crouch');
      } else {
        const dir = hdir;
        const st = this.ch.stride || 11;
        this.vx = dir * WALK_SPEED * this.ch.spd * (dir * this.facing < 0 ? 0.8 : 1);
        if (dir) {
          const b0 = Math.floor(this.walkDist / st);
          this.walkDist += this.vx * this.facing;
          const b1 = Math.floor(this.walkDist / st);
          if (b0 !== b1 && (((b1 % 4) + 4) % 4 === 0)) this.poeira(jogo, this.x - this.facing * 10, 2, 0.6);
        }
        this.setState(dir ? 'walk' : 'idle');
        if (inp.up) {
          this.jdir = dir;
          this.vx = 0;
          this.setState('prejump');
        }
      }
    } else {
      this.crouching = false;
      this.setState('jump');
      if (this.buf && !this.airUsed) {
        const nm = this.resolveAttack(this.buf.k, inp);
        this.buf = null;
        if (nm) this.startMove(nm, jogo);
      }
    }
    this.physics(jogo);
    this.regen();
  }

  regen(): void {
    this.en = Math.min(MAX_EN, this.en + 0.04);
  }

  private updateMove(inp: InputFrame, opp: Fighter, jogo: PartidaParaLutador): void {
    const mv = this.golpeAtual();
    this.mt++;
    if (mv.hits && this.hitDone && this.hitCount < mv.hits && this.mt - this.lastHitMt >= (mv.every || 6)) this.hitDone = false; // golpe de vários acertos
    if (mv.throw && this.mt === mv.S) {
      if (this.canThrow()) jogo.arremessar(this, opp);
      else jogo.emitir({ tipo: 'swing', lutador: this.indice, golpe: 'kick' });
    }
    if (mv.type === 'fire') {
      // projétil(eis)
      const sh = mv.shots || [mv.S];
      if (this.shots < sh.length && this.mt === sh[this.shots]) {
        jogo.lancarProjetil(this, mv, this.shots, sh.length);
        this.shots++;
      }
    } else if ((mv.type === 'rise' || mv.type === 'leap') && this.mt === mv.S) {
      // salto do golpe
      this.vy = mv.vy ?? 0;
      this.vx = this.facing * (mv.vx ?? 0);
      this.y -= 1;
      jogo.emitir({ tipo: 'jump', lutador: this.indice });
    } else if (!mv.air && mv.rank < 9 && this.connected && this.mt >= mv.S && this.buf) {
      // combo: cancela em golpe de rank maior
      const nm = this.resolveAttack(this.buf.k, inp);
      const nmv = nm ? this.ch.moves[nm] : null;
      if (nm && nmv && this.canAfford(nm) && (nmv.rank > mv.rank || (mv.rep && nm === this.move && this.rep < 2))) {
        const rep = nm === this.move ? this.rep + 1 : 0;
        this.buf = null;
        this.startMove(nm, jogo);
        this.rep = rep;
        this.physics(jogo);
        return;
      }
    }
    if (this.grounded) {
      const rushing = mv.type === 'rush' && this.mt >= mv.S && this.mt < mv.S + mv.A;
      if (rushing) this.vx = this.facing * (mv.vx ?? 0) * (this.hitDone ? 0.3 : 1);
      else this.vx *= 0.8;
      if (mv.adv && this.mt >= mv.S - 2 && this.mt < mv.S + mv.A) this.x += (this.facing * mv.adv) / (mv.A + 2); // avanço ao golpear
    }
    const R = this.move === '_lag' ? this.lagR : mv.R;
    if (!mv.air && this.mt >= mv.S + mv.A + R) {
      this.endMove(inp);
      this.physics(jogo);
      return;
    }
    this.physics(jogo);
  }

  get passing(): boolean {
    if (this.state !== 'move') return false;
    const mv = this.golpeAtual();
    return !!mv.through && this.mt < mv.S + mv.A + 4;
  }

  private updateDown(jogo: PartidaParaLutador): void {
    if (this.phase === 'air') {
      this.physics(jogo);
    } else if (this.phase === 'lie') {
      this.vx *= 0.85;
      this.x += this.vx;
      if (this.st > 34) {
        this.phase = 'rise';
        this.st = 0;
      }
    } else if (this.phase === 'rise') {
      if (this.st > 14) {
        this.gotHits = 0;
        this.invuln = 12;
        this.setState('idle');
      }
    }
  }

  private physics(jogo: PartidaParaLutador): void {
    this.x += this.vx;
    if (this.y < GROUND || this.vy < 0) {
      this.vy += GRAVITY;
      this.y += this.vy;
      if (this.y >= GROUND) {
        this.y = GROUND;
        this.vy = 0;
        this.onLand(jogo);
      }
    }
    const m = this.state === 'ko' || this.state === 'down' ? 150 : 60;
    this.x = clamp(this.x, m, LARGURA - m);
  }

  private onLand(jogo: PartidaParaLutador): void {
    if (this.state === 'jump') {
      this.setState('land');
      this.vx = 0;
      jogo.emitir({ tipo: 'land', lutador: this.indice });
      this.poeira(jogo, this.x, 8, 1);
    } else if (this.state === 'move' && this.golpeAtual().air) {
      const lag = this.golpeAtual().lag;
      jogo.emitir({ tipo: 'land', lutador: this.indice });
      if (lag) {
        this.move = '_lag';
        this.mt = 0;
        this.vx = 0;
        this.lagR = lag;
      } else {
        this.move = null;
        this.setState('land');
        this.vx = 0;
      }
      this.poeira(jogo, this.x, 8, 1);
    } else if (this.state === 'down' && this.phase === 'air') {
      this.phase = 'lie';
      this.st = 0;
      jogo.emitir({ tipo: 'land', lutador: this.indice });
      jogo.aoCair(this);
    } else if (this.state === 'hit') {
      this.setState('idle');
    }
  }

  hurtbox(): Retangulo {
    return hurtbox({ x: this.x, y: this.y, state: this.state, baixo: this.isLow(), noChao: this.grounded });
  }

  attackBox(b: { fx: number; fy: number; w: number; h: number }): Retangulo {
    return attackBox(this, b);
  }

  /** Golpe atualmente na fase ativa (ou null). */
  activeMove(): GolpeMontado | null {
    if (this.state !== 'move') return null;
    const mv = this.golpeAtual();
    if (mv.type === 'fire' || mv.kind === 'lag' || mv.throw) return null;
    return this.mt >= mv.S && (mv.air || this.mt < mv.S + mv.A) ? mv : null;
  }

  /** Recalcula `pose` (o protótipo chamava poseT() ao desenhar; aqui vai no tick). */
  atualizarPose(): void {
    this.pose = this.poseT();
  }

  /**
   * Escolhe o QUADRO da animação (+ pequenos ajustes de transformação quando a arte ainda é a antiga,
   * de poucas poses). Sem efeitos colaterais.
   */
  poseT(): PoseAtual {
    const ch = this.ch;
    const t = this.age;
    const L = ch.legacy;
    const P: PoseAtual = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 };
    switch (this.state) {
      case 'idle': {
        const seq = [0, 1, 2, 3, 2, 1];
        P.name = 'idle' + seq[Math.floor(t / 9) % 6];
        if (L) {
          const s = Math.sin(t / 16);
          P.sy = 1 + 0.012 * s;
          P.sx = 1 - 0.006 * s;
          P.name = Math.floor(t / 34) % 2 ? 'idle2' : 'idle0';
        }
        break;
      }
      case 'walk': {
        const st = ch.stride || 11;
        const i = ((Math.floor(this.walkDist / st) % 8) + 8) % 8;
        P.name = 'walk' + i;
        if (L) P.dy = -Math.abs(Math.sin(((this.walkDist / st) / 2) * Math.PI)) * 3;
        break;
      }
      case 'dash':
        if (this.dashDir > 0) {
          P.name = 'walk' + (Math.floor(this.st / 2) % 8);
          P.rot = 0.07;
        } else {
          P.name = 'jup';
          P.dy = -Math.sin(Math.min(1, this.st / this.dashLen) * Math.PI) * 18;
        }
        break;
      case 'prejump':
        P.name = 'jsquat';
        if (L) P.sy = 0.9;
        break;
      case 'land':
        P.name = 'land';
        if (L) P.sy = 0.93;
        break;
      case 'crouch':
        P.name = 'crouch';
        break;
      case 'jump':
        P.name = this.vy < -5 ? 'jup' : this.vy > 4 ? 'jfall' : 'jtop';
        break;
      case 'move':
        this.moveFrame(P);
        break;
      case 'hit':
        P.name = this.crouching ? 'hitB' : 'hit' + this.hitKind;
        P.dx = this.st < 5 ? -5 + this.st : 0;
        if (L && this.crouching) P.sy = 0.86;
        break;
      case 'block':
        P.name = this.crouching ? 'cblock' : 'block';
        P.dx = this.st < 5 ? -8 + this.st : 0;
        break;
      case 'down':
      case 'ko':
        if (this.state === 'ko' ? this.y < GROUND - 6 : this.phase === 'air') {
          P.name = 'kdAir';
          if (L) P.rot = clamp(this.vy / 40, -0.5, 0.5) * -1;
        } else if (this.state === 'down' && this.phase === 'rise') P.name = 'crouch';
        else P.name = 'koFloor';
        break;
      case 'win':
        P.name = 'win';
        if (L) {
          P.dy = -Math.abs(Math.sin(this.st / 11)) * 10;
          P.sy = 1 + 0.015 * Math.sin(this.st / 5);
        }
        break;
    }
    return P;
  }

  private moveFrame(P: PoseAtual): void {
    const ch = this.ch;
    const L = ch.legacy;
    const mv = this.golpeAtual();
    const A = mv.anim;
    const into = this.mt - mv.S;
    const pick = (fr: readonly string[], p: number): string => fr[clamp(Math.floor(p * fr.length), 0, fr.length - 1)] as string;
    if (into < 0) {
      const p = clamp(this.mt / Math.max(1, mv.S), 0, 0.999);
      P.name = pick(A.s, p);
      if (mv.type === 'fire') P.glow = p;
      if (L) {
        if (mv.type === 'fire') {
          P.sy = lerp(1, 0.86, p);
          P.sx = lerp(1, 1.08, p);
          P.dx = -10 * p;
        } else if (mv.pre) P.sy = lerp(1, 0.94, p);
        else if (!mv.crouch && !mv.air) {
          P.dx = -7 * p;
          if (mv.heavy) {
            P.dx = -12 * p;
            P.sx = 1 + 0.03 * p;
          }
        }
      }
      return;
    }
    if (mv.air) {
      if (A.fall && this.vy > 3) P.name = A.fall;
      else if (A.loop) P.name = A.a[Math.floor(into / A.loop) % A.a.length] as string;
      else P.name = A.a[Math.min(A.a.length - 1, Math.floor(into / 5))] as string;
    } else if (into < mv.A) {
      P.name = A.loop ? (A.a[Math.floor(into / A.loop) % A.a.length] as string) : pick(A.a, into / mv.A);
    } else {
      const R = this.move === '_lag' ? this.lagR : mv.R;
      P.name = pick(A.r || A.a, (into - mv.A) / Math.max(1, R));
    }
    if (mv.type === 'fire') P.glow = into < mv.A ? 1 : Math.max(0, 1 - (into - mv.A) / mv.R);
    if (mv.spin && (mv.air || into < mv.A)) P.flip = Math.floor(into / 3) % 2 ? -1 : 1;
    if (L) {
      if (mv.air && !hasPose(ch, mv.pose)) P.rot = 0.22;
      if (mv.tilt) P.rot = mv.tilt;
      if (mv.lift) P.dy -= mv.lift * Math.min(1, into / 3);
      if (mv.heavy && !mv.air && into < mv.A + 4) {
        P.dx += 7;
        P.sx = 1.04;
      }
      if (mv.type === 'rush' && !mv.tilt) P.rot = 0.1;
    }
  }

}
