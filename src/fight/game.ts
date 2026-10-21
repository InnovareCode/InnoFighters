import { LARGURA, MAX_EN, SH } from '../core/constantes';
import type {
  CameraLeitura,
  Configuracoes,
  EventoLuta,
  FaseLuta,
  IdLutador,
  IndiceLutador,
  InfoTreino,
  InputFrame,
  LeituraLuta,
  ModoLuta,
  TextoFlutuante,
} from '../core/contratos';
import { clamp, lerp, overlap, type Retangulo } from '../core/math';
import type { Rng } from '../core/rng';
import { PROJ_BASE } from '../data/base-moves';
import type { LutadorMontado } from '../data/montar';
import type { GolpeMontado, IdCenario, KindGolpe, NivelGolpe, SomGolpe } from '../data/tipos';
import { danoDeArmadura, danoDoGolpe } from './colisao';
import { NO_INPUT, cpuInput, perfilChefe } from './cpu';
import { Fighter, type PartidaParaLutador } from './fighter';
import type { ProjetilLuta } from './projetil';

/** Alvo do modo treino (DUMMY_NAMES do protótipo). */
export type DummyTreino = 'stand' | 'crouch' | 'block' | 'crouchblock' | 'jump' | 'cpu';

/** cfg de Game.setup: {mode, c1, c2, cpu: nível da CPU no P2 (ou null), p1cpu: nível da CPU no P1 (ou null)}. */
export type ConfigPartida = {
  mode: ModoLuta;
  c1: IdLutador;
  c2: IdLutador;
  cpu?: number | null;
  p1cpu?: number | null;
  /** Cenário; padrão = o da casa do rival (c2). */
  stage?: IdCenario;
  /** Mantém a pontuação do P1 (modo arcade, entre lutas). */
  keepScore?: boolean;
  /**
   * E3: luta de chefe. O P2 (`c2`) vira o chefe SE o `LutadorDef` dele tiver `chefe`; senão a opção é ignorada
   * (é o lutador normal). Round único (`winsNeeded = 1`), seja qual for `ajustes.rounds`, e IA própria.
   */
  chefe?: boolean;
};

/** Parte das configurações que a luta lê. Passe o MESMO objeto que a UI altera (shake é lido ao vivo). */
export type AjustesLuta = Pick<Configuracoes, 'rounds' | 'time' | 'shake'>;

/**
 * De onde vêm as entradas dos humanos. Só é chamada quando o protótipo chamava readInput(): na fase
 * 'fight' e só para lutadores sem CPU, P1 antes de P2. Assim a borda de descida (C2) não é consumida
 * em tick congelado por hitstop nem fora da luta.
 */
export interface FonteEntradas {
  /** `mesclado`: P1 lê teclado de P1 + P2 (modo solo/treino: readInputMerged). */
  p1(mesclado: boolean): InputFrame;
  p2(): InputFrame;
}

/** Ataque na forma que applyHit consome (golpe corpo a corpo ou projétil). */
type AtaqueAcerto = {
  dmg: number;
  kb: number;
  hs: number;
  bs: number;
  lvl: NivelGolpe;
  snd: SomGolpe;
  kind: KindGolpe | undefined;
  heavy: boolean;
  kd: boolean;
  hits: number | undefined;
  proj: boolean;
};

const textoFlutuante = (x: number, y: number, s: string, col: string, size: number): TextoFlutuante => ({ x, y, s, col, size });

const noAtaque = (mv: GolpeMontado): AtaqueAcerto => ({
  dmg: mv.dmg ?? 0,
  kb: mv.kb ?? 0,
  hs: mv.hs ?? 0,
  bs: mv.bs ?? 0,
  lvl: mv.lvl ?? 'mid',
  snd: mv.snd ?? 'punch',
  kind: mv.kind,
  heavy: !!mv.heavy,
  kd: !!mv.kd,
  hits: mv.hits,
  proj: false,
});

export type Dependencias = {
  /** Os 4 lutadores já montados (data/montar). */
  lutadores: Readonly<Record<IdLutador, LutadorMontado>>;
  /** RNG da LÓGICA (CPU). Efeitos visuais usam outro, fora de fight/. */
  rng: Rng;
};

export class Game implements LeituraLuta, PartidaParaLutador {
  readonly p1: Fighter;
  readonly p2: Fighter;
  readonly fighters: readonly [Fighter, Fighter];
  private readonly lutadores: Readonly<Record<IdLutador, LutadorMontado>>;
  private readonly rng: Rng;
  private ajustes: AjustesLuta = { rounds: 2, time: 99, shake: true };

  mode: ModoLuta = 'versus';
  training = false;
  debug = false;
  stage: IdCenario = 'jp';
  winsNeeded = 2;
  timeMax = 0;
  timeLeft = 0;
  dummy: DummyTreino = 'stand';
  round = 1;
  phase: FaseLuta = 'idle';
  t = 0;
  tick = 0;
  shake = 0;
  hitstop = 0;
  cam: CameraLeitura = { z: 1, x: LARGURA / 2 };
  projectiles: ProjetilLuta[] = [];
  winner: IndiceLutador | null = null;
  matchWinner: IndiceLutador | null = null;
  matchDone = false;
  perfect = false;
  trainInfo: InfoTreino = { hits: 0, dmg: 0 };
  events: EventoLuta[] = [];

  /** Troca de barra no tick: o `hitstop`/`shake` dela têm que sobreviver ao que o chamador grava depois. */
  private trocaDeBarraNoTick = false;
  private pid = 0;
  private tick60 = 0;
  private refillT = 0;
  private introLen = 90;
  /** Eventos emitidos fora de update() (setup/startRound); entram no primeiro update seguinte. */
  private pendentes: EventoLuta[] = [];
  private dentroDoUpdate = false;

  constructor(dep: Dependencias) {
    this.lutadores = dep.lutadores;
    this.rng = dep.rng;
    this.p1 = new Fighter(dep.lutadores.hayato, 0);
    this.p2 = new Fighter(dep.lutadores['wei-long'], 1);
    this.fighters = [this.p1, this.p2];
  }

  // ----- LeituraLuta -----
  get timer(): number {
    return this.timeLeft;
  }
  get timerMax(): number {
    return this.timeMax;
  }

  /** Há CPU em algum lado? (o P1 humano usa então o teclado mesclado.) */
  get solo(): boolean {
    return this.p1.cpu !== null || this.p2.cpu !== null;
  }

  emitir(ev: EventoLuta): void {
    (this.dentroDoUpdate ? this.events : this.pendentes).push(ev);
  }

  private clearFx(): void {
    this.projectiles = [];
    this.shake = 0;
    this.hitstop = 0;
  }

  setup(cfg: ConfigPartida, ajustes: AjustesLuta): void {
    this.ajustes = ajustes;
    this.mode = cfg.mode;
    this.training = cfg.mode === 'training';
    this.stage = cfg.stage ?? this.lutadores[cfg.c2].stage; // luta na casa do rival
    this.p1.setChar(this.lutadores[cfg.c1]);
    this.p2.setChar(this.lutadores[cfg.c2]);
    const cfgChefe = cfg.chefe ? this.lutadores[cfg.c2].chefe : undefined;
    if (cfgChefe) this.p2.virarChefe(cfgChefe);
    this.p1.cpu = cfg.p1cpu != null ? cfg.p1cpu : null;
    this.p2.cpu = cfg.cpu != null ? cfg.cpu : null;
    this.winsNeeded = cfgChefe ? 1 : ajustes.rounds;
    this.timeMax = this.training ? 0 : ajustes.time;
    this.dummy = 'stand';
    this.round = 1;
    this.matchWinner = null;
    this.matchDone = false;
    this.winner = null;
    this.p1.wins = 0;
    this.p2.wins = 0;
    if (!cfg.keepScore) this.p1.score = 0;
    this.p2.score = 0;
    this.startRound(true);
  }

  /** Troca o alvo do treino; 'cpu' liga uma CPU nível 1 no P2, os demais a desligam (UI, tecla T). */
  trocarAlvoDoTreino(d: DummyTreino): void {
    this.dummy = d;
    this.p2.cpu = d === 'cpu' ? 1 : null;
  }

  private startRound(first: boolean): void {
    const completo = first || this.round === 1;
    this.p1.reset(completo);
    this.p2.reset(completo);
    this.aplicarPerfilDoChefe(false); // todo round recomeça na fase 1
    this.clearFx();
    this.timeLeft = this.timeMax;
    this.tick60 = 0;
    this.phase = 'intro';
    this.t = 0;
    this.winner = null;
    this.perfect = false;
    this.refillT = 0;
    this.trainInfo = { hits: 0, dmg: 0 };
    this.p1.combo = { hits: 0, dmg: 0, t: 0 };
    this.p2.combo = { hits: 0, dmg: 0, t: 0 };
    this.introLen = this.training ? 40 : 90;
    if (!this.training) this.emitir({ tipo: 'round', fase: 'start', round: this.round });
  }

  /** O chefe desta luta (sempre o P2) ou null. A UI lê `fighters[i].chefe`. */
  private get chefeDaLuta(): Fighter | null {
    return this.p2.chefe ? this.p2 : null;
  }

  /** IA do chefe: nível da CPU escolhido + acréscimo da fase. Sem chefe não faz nada (os outros usam AI_LEVELS). */
  private aplicarPerfilDoChefe(fase2: boolean): void {
    const c = this.chefeDaLuta;
    if (c) c.perfilIa = perfilChefe(c.cpu ?? 1, fase2);
  }

  aoCair(f: Fighter): void {
    this.shake = Math.max(this.shake, 4);
    this.emitir({ tipo: 'dust', x: f.x, n: 14, power: 1.4 });
  }

  /** Arremesso: joga o rival por cima do ombro. */
  arremessar(a: Fighter, d: Fighter): void {
    const dmg = 12 * a.ch.pow;
    d.hp = Math.max(this.training ? 1 : 0, d.hp - dmg);
    d.dmgTaken += dmg;
    a.score += Math.round(dmg * 100);
    d.move = null;
    d.flash = 8;
    d.gotHits = 1;
    d.comboDmg = dmg;
    a.connected = true;
    a.en = Math.min(MAX_EN, a.en + 8);
    d.x = clamp(a.x + a.facing * 30, 70, LARGURA - 70);
    if (this.resolverVidaZerada(d, a)) {
      d.vx = -a.facing * 7;
    } else {
      d.knockdown(-a.facing, 6);
      d.vy = -12;
    }
    this.shake = 8;
    this.hitstop = 6;
    this.reforcarTrocaDeBarra();
    this.emitir({
      tipo: 'throw',
      atacante: a.indice,
      defensor: d.indice,
      pitch: d.ch.pitch,
      texto: textoFlutuante(a.x, a.y - SH, 'ARREMESSO!', '#ffd23f', 22),
    });
  }

  lancarProjetil(f: Fighter, mv: GolpeMontado, i: number, n: number): void {
    const sp = mv.proj;
    if (!sp) return;
    const low = !!sp.low;
    const pr: ProjetilLuta = {
      id: ++this.pid,
      x: f.x + f.facing * f.ch.spawn.x,
      y: low ? f.y - 30 : f.y - f.ch.spawn.y,
      vx: sp.sp * f.facing,
      dir: f.facing,
      dono: f.indice,
      owner: f,
      life: sp.life || 150,
      frame: 0,
      spec: sp,
      sc: sp.sc || 1,
      sy: sp.sy || sp.sc || 1,
      style: sp.style || 'orb',
      acc: sp.acc || 0,
      kd: sp.kdLast ? i === n - 1 : sp.kd !== false,
    };
    this.projectiles.push(pr);
    this.emitir({ tipo: 'projectile', lutador: f.indice, x: pr.x, y: pr.y, style: pr.style });
  }

  /** Entradas dos dois lutadores neste tick (humanos pela fonte; CPU/alvo de treino calculados aqui). */
  private inputs(fonte: FonteEntradas): [InputFrame, InputFrame] {
    const none = NO_INPUT();
    if (this.phase !== 'fight') return [none, none];
    const solo = this.solo;
    const i1 = this.p1.cpu !== null ? cpuInput(this.p1, this.p2, this, this.rng) : fonte.p1(solo || this.training);
    let i2: InputFrame;
    if (this.p2.cpu !== null) i2 = cpuInput(this.p2, this.p1, this, this.rng);
    else if (this.training) i2 = this.dummyInput();
    else i2 = fonte.p2();
    return [i1, i2];
  }

  private dummyInput(): InputFrame {
    const d = this.p2;
    const inp = NO_INPUT();
    const away = this.p1.x < d.x ? 'right' : 'left';
    if (this.dummy === 'crouch') inp.down = true;
    else if (this.dummy === 'block') inp[away] = true;
    else if (this.dummy === 'crouchblock') {
      inp[away] = true;
      inp.down = true;
    } else if (this.dummy === 'jump') {
      if (d.grounded && d.state !== 'hit' && d.age % 70 === 0) inp.up = true;
    } else if (this.dummy === 'cpu') {
      d.cpu = d.cpu ?? 1;
      return cpuInput(d, this.p1, this, this.rng);
    }
    return inp;
  }

  /** Um tick da luta. */
  update(fonte: FonteEntradas): void {
    this.events = this.pendentes;
    this.pendentes = [];
    this.dentroDoUpdate = true;
    try {
      this.passo(fonte);
    } finally {
      this.dentroDoUpdate = false;
    }
    this.p1.atualizarPose();
    this.p2.atualizarPose();
  }

  private passo(fonte: FonteEntradas): void {
    this.t++;
    if (this.hitstop > 0) {
      this.hitstop--;
      return;
    }
    this.tick++;
    if (this.shake > 0) this.shake--;
    if (this.phase === 'intro' && this.t >= this.introLen) {
      this.phase = 'fight';
      this.t = 0;
      if (!this.training) this.emitir({ tipo: 'round', fase: 'fight', round: this.round });
    }
    const fighting = this.phase === 'fight';
    const [i1, i2] = this.inputs(fonte);
    if (this.phase === 'roundend' || this.phase === 'matchend') {
      for (const p of [this.p1, this.p2]) {
        if (p.indice === this.winner && p.grounded && p.state !== 'move' && p.state !== 'hit' && p.state !== 'down' && p.state !== 'win' && this.t > 20) p.setState('win');
      }
    }
    this.p1.update(i1, this.p2, this);
    this.p2.update(i2, this.p1, this);
    this.separate();
    for (const pr of this.projectiles) {
      if (pr.acc) {
        pr.vx -= pr.dir * pr.acc;
        if (pr.dir * (pr.x - pr.owner.x) < -70 && pr.frame > 10) pr.life = 0; // bumerangue volta
      }
      pr.x += pr.vx;
      pr.life--;
      pr.frame++;
    }
    if (fighting) this.resolveHits();
    this.projectiles = this.projectiles.filter((p) => p.life > 0 && p.x > -140 && p.x < LARGURA + 140);
    for (const p of [this.p1, this.p2]) {
      if (p.hpShown > p.hp) p.hpShown = Math.max(p.hp, p.hpShown - 0.5);
      else if (p.hpShown < p.hp) p.hpShown = p.hp;
    }
    this.updateCombos();
    this.updateCamera();
    if (this.training) {
      this.updateTraining();
      return;
    }
    if (fighting && this.timeMax > 0) {
      this.tick60++;
      if (this.tick60 >= 60) {
        this.tick60 = 0;
        this.timeLeft--;
        if (this.timeLeft <= 0) {
          this.timeLeft = 0;
          this.phase = 'timeover';
          this.t = 0;
          this.emitir({ tipo: 'round', fase: 'timeover', round: this.round });
        }
      }
    }
    if (this.phase === 'cena-chefe') this.andarCenaDoChefe();
    else if (this.phase === 'fight') this.talvezIniciarCenaDoChefe();
    if ((this.phase === 'ko' || this.phase === 'timeover') && this.t >= 100) this.endRound();
    if (this.phase === 'roundend' && this.t >= 175) {
      this.round++;
      this.startRound(false);
    }
    if (this.phase === 'matchend' && this.t >= 150) this.matchDone = true;
  }

  /**
   * Dança da Águia (E3 §3.3). Começa no primeiro tick em que a luta segue em 'fight' e o chefe, com a barra já trocada
   * (`cenaPendente`), está livre no chão (depois de levantar). KO ou fim de tempo no mesmo tick vencem: a fase já não é
   * 'fight' e a cena não começa. Durante a cena: relógio parado, sem acertos, sem projéteis, sem entradas.
   */
  private talvezIniciarCenaDoChefe(): void {
    const c = this.chefeDaLuta;
    if (!c || !c.cenaPendente || !c.grounded) return;
    if (c.state !== 'idle' && c.state !== 'walk' && c.state !== 'crouch' && c.state !== 'land') return;
    c.cenaPendente = false;
    c.setState('cena');
    c.vx = 0;
    this.phase = 'cena-chefe';
    this.t = 0;
    this.projectiles = [];
    this.hitstop = 0;
    this.emitir({ tipo: 'fase-chefe', lutador: c.indice, etapa: 'danca', barrasRestantes: c.barras });
  }

  /** Fim da cena: o chefe entra na ficha da fase 2 e a luta volta a andar. A cena dura `danca.duracao` ticks. */
  private andarCenaDoChefe(): void {
    const c = this.chefeDaLuta;
    const cfg = c?.cfgChefe;
    this.projectiles = []; // um golpe do jogador que terminava durante a cena pode ter soltado projétil
    if (!c || !cfg || this.t < cfg.danca.duracao) return;
    c.trocarFicha(cfg.fichaFase2);
    c.setState('idle');
    this.aplicarPerfilDoChefe(true);
    this.phase = 'fight';
    this.t = 0;
    this.emitir({ tipo: 'fase-chefe', lutador: c.indice, etapa: 'retomada', barrasRestantes: c.barras });
  }

  private updateTraining(): void {
    const d = this.p2;
    this.p1.en = Math.min(MAX_EN, this.p1.en + 0.25);
    this.p2.en = MAX_EN;
    if (this.p1.hp < this.p1.maxHp) this.p1.hp = this.p1.maxHp;
    if (d.hp < d.maxHp && d.gotHits === 0 && (d.state === 'idle' || d.state === 'crouch')) {
      if (++this.refillT > 80) {
        d.hp = d.maxHp;
        d.hpShown = d.hp;
        this.refillT = 0;
      }
    } else this.refillT = 0;
  }

  private updateCombos(): void {
    for (const [d, c] of [
      [this.p2, this.p1.combo],
      [this.p1, this.p2.combo],
    ] as const) {
      if (d.gotHits >= 2) {
        c.hits = d.gotHits;
        c.dmg = d.comboDmg;
        c.t = 60;
      } else if (c.t > 0) c.t--;
    }
  }

  private updateCamera(): void {
    const a = this.p1;
    const b = this.p2;
    const d = Math.abs(a.x - b.x);
    const mid = (a.x + b.x) / 2;
    const tz = 1 + clamp((560 - d) / 560, 0, 1) * 0.075;
    const tx = clamp(mid, 160, LARGURA - 160);
    this.cam.z = lerp(this.cam.z, tz, 0.08);
    this.cam.x = lerp(this.cam.x, tx, 0.1);
  }

  private separate(): void {
    const a = this.p1;
    const b = this.p2;
    if (a.passing || b.passing) return;
    if ((a.untouchable && a.state !== 'win') || (b.untouchable && b.state !== 'win') || a.state === 'down' || b.state === 'down') return;
    const dx = b.x - a.x;
    const min = a.corpo + b.corpo; // 39 + 39 = 78 com o corpo padrão
    if (Math.abs(dx) < min && Math.abs(a.y - b.y) < 90) {
      const s = dx >= 0 ? 1 : -1;
      const push = (min - Math.abs(dx)) / 2;
      a.x -= push * s;
      b.x += push * s;
      a.x = clamp(a.x, 60, LARGURA - 60);
      b.x = clamp(b.x, 60, LARGURA - 60);
    }
  }

  private resolveHits(): void {
    for (const [a, d] of [
      [this.p1, this.p2],
      [this.p2, this.p1],
    ] as const) {
      const mv = a.activeMove();
      if (!mv || a.hitDone || d.untouchable) continue;
      const caixa = mv.box ? a.ch.boxes[mv.box] : undefined;
      if (!caixa) continue;
      const box = a.attackBox(caixa);
      if (overlap(box, d.hurtbox())) {
        a.hitDone = true;
        this.applyHit(a, d, noAtaque(mv), box);
      }
    }
    for (const pr of this.projectiles) {
      if (pr.life <= 0) continue;
      const d = pr.owner === this.p1 ? this.p2 : this.p1;
      const o = pr.owner;
      const box = { x: pr.x - 34 * pr.sc, y: pr.y - 30 * pr.sy, w: 68 * pr.sc, h: 60 * pr.sy };
      if (!d.untouchable && overlap(box, d.hurtbox())) {
        pr.life = 0;
        // PROJ_BASE vem DEPOIS no Object.assign do protótipo e sobrescreve lvl: o tremor rasteiro (`low`)
        // acaba como 'mid'. Preservado de propósito (zero mudança de comportamento).
        this.applyHit(
          o,
          d,
          {
            dmg: pr.spec.dmg,
            kb: pr.spec.kb,
            hs: pr.spec.hs,
            bs: PROJ_BASE.bs,
            lvl: PROJ_BASE.lvl,
            snd: PROJ_BASE.snd,
            kind: undefined,
            heavy: false,
            kd: pr.kd,
            hits: undefined,
            proj: PROJ_BASE.proj,
          },
          box,
        );
        continue;
      }
      for (const q of this.projectiles) {
        if (q !== pr && q.life > 0 && q.owner !== pr.owner && Math.abs(q.x - pr.x) < 56 * Math.max(pr.sc, q.sc) && Math.abs(q.y - pr.y) < 60) {
          q.life = 0;
          pr.life = 0;
          this.shake = 4;
          this.emitir({ tipo: 'clash', x: (q.x + pr.x) / 2, y: pr.y });
        }
      }
    }
  }

  private applyHit(a: Fighter, d: Fighter, mv: AtaqueAcerto, box: Retangulo): void {
    const blocked = d.canBlock(mv.lvl);
    const hb = d.hurtbox();
    const ox = (Math.max(box.x, hb.x) + Math.min(box.x + box.w, hb.x + hb.w)) / 2;
    const oy = (Math.max(box.y, hb.y) + Math.min(box.y + box.h, hb.y + hb.h)) / 2;
    a.connected = true;
    a.hitCount = (a.hitCount || 0) + 1;
    a.lastHitMt = a.mt;
    const cornered = d.x <= 66 || d.x >= LARGURA - 66;
    if (blocked) {
      const chip = Math.max(0.4, (mv.proj ? mv.dmg : mv.dmg * a.ch.pow) * 0.12);
      d.hp = Math.max(1, d.hp - chip);
      a.score += Math.round(chip * 50);
      d.setState('block');
      d.stun = mv.bs + (mv.proj ? 4 : 0);
      d.vx = mv.kb * 0.9 * a.facing;
      d.move = null;
      if (cornered && !mv.proj) a.vx = -a.facing * mv.kb * 0.8;
      this.shake = 2;
      this.hitstop = 2;
      a.en = Math.min(MAX_EN, a.en + 3);
      d.en = Math.min(MAX_EN, d.en + 4);
      this.emitir({
        tipo: 'block',
        atacante: a.indice,
        defensor: d.indice,
        x: ox,
        y: oy,
        dir: (-a.facing) as 1 | -1,
        texto: d.gotHits === 0 ? textoFlutuante(d.x, d.y - SH * 0.95, 'BLOQUEOU', '#9ad8ff', 18) : null,
      });
      return;
    }
    d.hitKind = mv.kind === 'punch' || mv.lvl === 'over' || mv.proj ? 'H' : 'B';
    const counter = d.state === 'move';
    if (d.armor > 0 && d.state === 'move' && d.hp - danoDeArmadura(mv.dmg, a.ch.pow, mv.proj) > 0) {
      // ARMADURA: absorve o golpe sem interromper
      const ad = danoDeArmadura(mv.dmg, a.ch.pow, mv.proj);
      d.hp -= ad;
      d.flash = 6;
      a.score += Math.round(ad * 100);
      this.hitstop = 4;
      this.shake = 4;
      this.emitir({
        tipo: 'armor',
        atacante: a.indice,
        defensor: d.indice,
        x: ox,
        y: oy,
        snd: mv.snd,
        texto: textoFlutuante(d.x, d.y - SH * 0.95, 'ARMADURA', '#ffd23f', 18),
      });
      return;
    }
    if (d.gotHits === 0) d.comboDmg = 0;
    let dmg = danoDoGolpe(mv.dmg, a.ch.pow, mv.proj, d.gotHits, counter);
    if (this.training) dmg = Math.min(dmg, d.hp - 1 > 0 ? dmg : 0);
    d.hp = Math.max(0, d.hp - dmg);
    d.gotHits++;
    d.comboDmg += dmg;
    d.dmgTaken += dmg;
    a.score += Math.round(dmg * 100);
    a.maxCombo = Math.max(a.maxCombo, d.gotHits);
    this.trainInfo = { hits: d.gotHits, dmg: d.comboDmg };
    a.en = Math.min(MAX_EN, a.en + (mv.proj ? 4 : 8));
    d.en = Math.min(MAX_EN, d.en + 5);
    d.flash = 8;
    d.move = null;
    const kill = this.resolverVidaZerada(d, a);
    if (kill) {
      // o KO já foi aplicado em resolverVidaZerada: não há reação de hit/knockdown
    } else if (mv.hits && a.hitCount < mv.hits) {
      // acertos intermediários: segura o rival no combo
      d.setState('hit');
      d.stun = mv.hs;
      d.vx = mv.kb * a.facing * 0.5;
      if (!d.grounded || a.vy < 0) {
        d.vy = Math.min(a.vy, -3);
        if (d.grounded) d.y -= 1;
      }
    } else if (mv.kd || !d.grounded || d.state === 'down') {
      d.knockdown(a.facing, mv.proj ? mv.kb : Math.max(mv.kb, 7));
    } else {
      d.setState('hit');
      d.stun = mv.hs;
      d.vx = mv.kb * a.facing;
    }
    if (cornered && !kill) a.vx = -a.facing * mv.kb * 0.8;
    this.shake = this.ajustes.shake ? (mv.heavy || mv.proj || kill ? 9 : 5) : 0;
    this.hitstop = mv.heavy || kill ? 6 : 4;
    this.reforcarTrocaDeBarra();
    this.emitir({
      tipo: 'hit',
      atacante: a.indice,
      defensor: d.indice,
      x: ox,
      y: oy,
      cor: mv.proj ? a.ch.fire[0] : '#ffd84a',
      grande: mv.proj || mv.heavy || kill,
      snd: mv.snd,
      pitch: d.ch.pitch,
      contragolpe: counter,
      projetil: mv.proj,
      acertos: d.gotHits,
      texto: counter ? textoFlutuante(ox, oy - 40, 'COUNTER!', '#ff9a3a', 24) : null,
    });
  }

  /**
   * Único lugar que decide o que acontece quando a vida de `d` chegou a 0 ou menos (golpe, projétil ou
   * arremesso). Devolve true se houve KO. Treino nunca mata: a vida fica em 1.
   *
   * Chefe com barra de sobra (E3): NÃO é KO. A barra seguinte enche, o combo é cortado, o chefe fica invulnerável
   * por 60 ticks (o combo não atravessa para a barra final) e a Dança da Águia fica pendente. Devolve false, então
   * os chamadores aplicam a reação normal (atordoamento ou derrubada). O evento `fase-chefe` sai ANTES do `hit`.
   */
  resolverVidaZerada(d: Fighter, a: Fighter): boolean {
    if (d.hp > 0) return false;
    if (this.training) {
      d.hp = 1;
      return false;
    }
    if (d.barras > 1) {
      d.barras--;
      d.hp = d.maxHp;
      d.gotHits = 0;
      d.invuln = 60;
      d.cenaPendente = true;
      this.hitstop = 20;
      this.shake = 14;
      this.trocaDeBarraNoTick = true;
      this.emitir({ tipo: 'fase-chefe', lutador: d.indice, etapa: 'troca', barrasRestantes: d.barras });
      return false;
    }
    this.ko(d, a);
    return true;
  }

  /** Reaplica hitstop/shake da troca de barra depois que `applyHit`/`arremessar` gravaram os valores do golpe comum. */
  private reforcarTrocaDeBarra(): void {
    if (!this.trocaDeBarraNoTick) return;
    this.trocaDeBarraNoTick = false;
    this.hitstop = 20;
    this.shake = this.ajustes.shake ? 14 : 0;
  }

  private ko(d: Fighter, a: Fighter): void {
    d.hp = 0;
    d.stun = 0;
    d.setState('ko');
    d.vx = 7 * a.facing;
    d.vy = -9;
    d.y -= 1;
    d.move = null;
    this.phase = 'ko';
    this.t = 0;
    this.shake = 14;
    this.hitstop = 14;
    this.emitir({ tipo: 'ko', defensor: d.indice, pitch: d.ch.pitch });
  }

  private endRound(): void {
    let w: Fighter | null = null;
    // desempate por tempo: vida somada de todas as barras (com 1 barra == hp, como no protótipo)
    if (this.p1.vidaTotal > this.p2.vidaTotal) w = this.p1;
    else if (this.p2.vidaTotal > this.p1.vidaTotal) w = this.p2;
    this.winner = w ? w.indice : null;
    this.perfect = false;
    if (w) {
      w.wins++;
      // Perfeito é sobre a barra final e exige não ter perdido nenhuma barra (barras === barrasMax: 1 === 1 nos normais).
      this.perfect = w.hp >= w.maxHp - 0.01 && w.barras === w.barrasMax;
      w.score += Math.max(0, this.timeLeft) * 100 + Math.round(w.hp) * 50 + (this.perfect ? 5000 : 0);
      // Bônus por derrotar o chefe: só quando o perdedor era o chefe da luta.
      const perdedor = w === this.p1 ? this.p2 : this.p1;
      if (perdedor.cfgChefe) w.score += perdedor.cfgChefe.bonusVitoria;
    }
    const fimDaLuta = !!w && w.wins >= this.winsNeeded;
    this.emitir({ tipo: 'round', fase: 'end', round: this.round, vencedor: this.winner, fimDaLuta });
    if (w && this.perfect) this.emitir({ tipo: 'perfect', vencedor: w.indice });
    if (w && fimDaLuta) {
      this.phase = 'matchend';
      this.matchWinner = w.indice;
    } else this.phase = 'roundend';
    this.t = 0;
  }
}

