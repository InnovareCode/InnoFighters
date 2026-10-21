import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GROUND, LARGURA, MAX_EN } from '../../src/core/constantes';
import { INPUT_VAZIO, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import type { Fighter } from '../../src/fight/fighter';
import { Game, type ConfigPartida, type FonteEntradas } from '../../src/fight/game';
import { AJUSTES, tipos, type Quadro } from './_kit-e3';
import { comBaatarChefe } from './_baatar-chefe';
import { elenco, nova, rngContador } from './_esquiva-qa';

/*
 * QA adversarial da ESQUIVA, parte 4: invariantes por fuzz, "sem a flag nada muda e nenhum RNG novo", determinismo, estado reaproveitado
 * entre lutas e a forma dos eventos novos (Íris). Convenção `it.fails` = bug real conhecido.
 */
const ELENCO_9: IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar'];

/** Gerador de "mãos humanas" determinístico: a sequência de ESQ vem de um RNG À PARTE, então tirar a esquiva não desloca o resto. */
function gerador(semente: number, comEsq: boolean, pEsq = 0.06): () => InputFrame {
  const r = criarRng(semente * 7919 + 13);
  const rEsq = criarRng(semente * 104729 + 7);
  let dir = 0;
  let seg = 0;
  let down = false;
  return () => {
    if (seg-- <= 0) {
      dir = r.inteiro(3) - 1;
      seg = 4 + r.inteiro(14);
      down = r.proximo() < 0.1;
    }
    const f = { ...INPUT_VAZIO } as Quadro;
    f.left = dir < 0;
    f.right = dir > 0;
    f.down = down;
    f.up = r.proximo() < 0.03;
    const a = r.proximo();
    if (a < 0.05) f.lp = true;
    else if (a < 0.09) f.hp = true;
    else if (a < 0.13) f.lk = true;
    else if (a < 0.16) f.hk = true;
    else if (a < 0.19) f.sp = true;
    const e = rEsq.proximo();
    if (comEsq && e < pEsq) f.esq = true;
    return f;
  };
}

type Passo = { g: Game; ev: EventoLuta[]; processado: boolean; antes: { hp: [number, number]; fase: string } };

/** Roda `ticks` ticks chamando `aoPasso` depois de cada um. `humanos`: quem joga com o gerador (o resto é CPU conforme `cfg`). */
function rodar(
  cfg: ConfigPartida,
  semente: number,
  ticks: number,
  aoPasso: (p: Passo) => void,
  opc: { esq?: boolean; pEsq?: number; rng?: Rng; lut?: typeof elenco } = {},
): Game {
  const g = new Game({ lutadores: opc.lut ?? elenco, rng: opc.rng ?? criarRng(semente) });
  g.setup(cfg, { ...AJUSTES });
  const g1 = gerador(semente, opc.esq ?? true, opc.pEsq);
  const g2 = gerador(semente + 1000, opc.esq ?? true, opc.pEsq);
  const fonte: FonteEntradas = { p1: () => g1(), p2: () => g2() };
  for (let i = 0; i < ticks; i++) {
    const antes = { hp: [g.p1.hp, g.p2.hp] as [number, number], fase: g.phase };
    const processado = g.hitstop === 0;
    g.update(fonte);
    aoPasso({ g, ev: [...g.events], processado, antes });
  }
  return g;
}

/** Estado de acompanhamento de um lutador no fuzz. */
class Vigia {
  k = -1; // ticks PROCESSADOS desde que a esquiva começou (0 = o tick do início)
  seguidos = 0;
  inicios = 0;
  eventos = 0;
}

/** Confere as invariantes de um tick. Acumula as violações em `falhas` (muito mais rápido que um expect por campo por tick). */
function checar(p: Passo, vigias: [Vigia, Vigia], falhas: string[], opc: { chefe?: boolean }): void {
  const { g, ev, processado } = p;
  const ruim = (rot: string, cond: boolean, msg: string): void => {
    if (!cond && falhas.length < 20) falhas.push(rot + ': ' + msg);
  };
  g.fighters.forEach((f: Fighter, i) => {
    const v = vigias[i as 0 | 1];
    const rot = 'P' + (i + 1) + ' ' + f.ch.id + ' tick ' + g.tick;
    ruim(rot, Number.isFinite(f.x) && Number.isFinite(f.y) && Number.isFinite(f.en) && Number.isFinite(f.hp), 'valor não finito');
    ruim(rot, f.en >= 0 && f.en <= MAX_EN, 'en fora de [0, 100]: ' + f.en);
    ruim(rot, f.invuln >= 0, 'invuln negativa');
    ruim(rot, f.hp >= 0, 'hp negativa');
    if (f.state !== 'ko' && f.state !== 'down') ruim(rot, f.x >= 60 && f.x <= LARGURA - 60, 'x fora da arena: ' + f.x);
    if (f.state === 'esquiva') {
      ruim(rot, f.y === GROUND, 'esquiva fora do chão');
      ruim(rot, f.esquiva === 1 || f.esquiva === -1, 'leitura esquiva inválida');
    } else ruim(rot, f.esquiva === 0, 'leitura esquiva != 0 fora do estado');

    const comecou = ev.find((e) => e.tipo === 'esquiva' && e.lutador === i);
    if (comecou && comecou.tipo === 'esquiva') {
      v.eventos++;
      v.inicios++;
      // o ARRANQUE do avanço é vulnerável: um acerto no mesmo tick pode já ter tirado o lutador do estado
      const tiradoPorAcerto = ev.some((e) => (e.tipo === 'hit' || e.tipo === 'throw' || e.tipo === 'armor' || e.tipo === 'block' || e.tipo === 'quebra-guarda' || e.tipo === 'parry') && e.defensor === i);
      if (f.state === 'esquiva') ruim(rot, comecou.dir === f.esquiva, 'dir do evento != leitura');
      else ruim(rot, tiradoPorAcerto && comecou.dir === 1, 'evento esquiva sem estado e sem acerto no arranque do avanço (estado ' + f.state + ')');
      v.k = f.state === 'esquiva' ? 0 : -1;
      v.seguidos = f.state === 'esquiva' ? 1 : 0;
    } else if (f.state === 'esquiva') {
      ruim(rot, v.k >= 0, 'estado esquiva sem evento de início');
      if (processado) {
        v.k++;
        v.seguidos++;
      }
    } else {
      v.k = -1;
      v.seguidos = 0;
    }
    if (f.state === 'esquiva') {
      const tr = f.esquiva === 1 ? ESQUIVA_PADRAO.frente : ESQUIVA_PADRAO.tras;
      ruim(rot, v.seguidos <= tr.dur, 'esquiva presa há ' + v.seguidos + ' ticks');
      if (!opc.chefe && processado) {
        // invulnerável só na janela [invIni, invFim); e a janela é sempre invulnerável
        if (f.invuln > 0) ruim(rot, v.k < tr.invFim, 'invulnerável fora da janela (k=' + v.k + ')');
        if (v.k >= tr.invIni && v.k < tr.invFim) ruim(rot, f.invuln > 0, 'janela sem invulnerabilidade (k=' + v.k + ')');
      }
    }
  });

  for (const e of ev) {
    const rot = 'tick ' + g.tick;
    if (e.tipo === 'esquivou') {
      const d = g.fighters[e.lutador];
      ruim(rot, e.atacante !== e.lutador, 'esquivou do próprio golpe');
      ruim(rot, d.state === 'esquiva' && d.invuln > 0, 'esquivou com o defensor fora da janela');
      ruim(rot, typeof e.projetil === 'boolean', 'esquivou sem o campo projetil');
    }
    if (e.tipo === 'block' || e.tipo === 'quebra-guarda') ruim(rot, !('dano' in e), 'defesa publicou dano');
    if (e.tipo === 'hit') ruim(rot, (e.dano ?? 0) > 0, 'hit sem dano: ' + e.dano);
    if (e.tipo === 'throw') ruim(rot, (e.dano ?? 0) > 0, 'throw sem dano: ' + e.dano);
  }

  if (!opc.chefe) {
    // a vida que sai é EXATAMENTE a que os eventos publicam (menos o raspão do bloqueio, que não publica número)
    const temRound = ev.some((e) => e.tipo === 'round');
    g.fighters.forEach((f, i) => {
      const perdeu = Math.max(0, p.antes.hp[i as 0 | 1] - f.hp);
      let soma = 0;
      let defendeu = false;
      for (const e of ev) {
        if ((e.tipo === 'hit' || e.tipo === 'throw' || e.tipo === 'armor') && e.defensor === i) soma += e.dano ?? 0;
        if ((e.tipo === 'block' || e.tipo === 'quebra-guarda') && e.defensor === i) defendeu = true;
      }
      if (!defendeu && !temRound) ruim('P' + (i + 1) + ' tick ' + g.tick, Math.abs(perdeu - soma) < 1e-9, 'vida perdida ' + perdeu + ' != dano publicado ' + soma);
    });
  }
}

// ---------------------------------------------------------------------------------------------------------------------
describe('fuzz de invariantes (mãos aleatórias, 9 lutadores, esquiva ligada)', () => {
  it('en nunca negativa, invulnerável só na janela, esquiva sempre volta ao livre, eventos coerentes e vida publicada = vida perdida', () => {
    let esquivas = 0;
    let esquivou = 0;
    const falhas: string[] = [];
    for (let i = 0; i < ELENCO_9.length; i++) {
      for (const semente of [11, 12]) {
        const c1 = ELENCO_9[i] as IdLutador;
        const c2 = ELENCO_9[(i + 4) % ELENCO_9.length] as IdLutador;
        const vigias: [Vigia, Vigia] = [new Vigia(), new Vigia()];
        const g = rodar({ mode: 'versus', c1, c2, esquiva: true }, semente, 1800, (p) => {
          checar(p, vigias, falhas, {});
          esquivou += tipos(p.ev, 'esquivou').length;
        }, { pEsq: 0.08 });
        esquivas += vigias[0].inicios + vigias[1].inicios;
        expect(g.tick).toBeGreaterThan(1000);
      }
    }
    expect(falhas).toEqual([]);
    expect(esquivas).toBeGreaterThan(100);
    expect(esquivou).toBeGreaterThan(5); // o fuzz de fato esbarra em golpes durante a janela
  }, 120_000);

  it('CPU DIFÍCIL x CPU DIFÍCIL com esquiva (3 pares x 2 sementes): as mesmas invariantes, a CPU esquiva e pune', () => {
    let esquivas = 0;
    const falhas: string[] = [];
    for (const [c1, c2] of [['hayato', 'camille'], ['wei-long', 'nila'], ['aminu', 'caio']] as const) {
      for (const semente of [21, 22]) {
        const vigias: [Vigia, Vigia] = [new Vigia(), new Vigia()];
        rodar({ mode: 'cpu', c1, c2, cpu: 2, p1cpu: 2, esquiva: true }, semente, 4000, (p) => checar(p, vigias, falhas, {}), { esq: false });
        esquivas += vigias[0].inicios + vigias[1].inicios;
      }
    }
    expect(falhas).toEqual([]);
    expect(esquivas).toBeGreaterThan(20);
  }, 120_000);

  it('contra o CHEFÃO (BAATAR ANTIGO de fixtura com a arte real, CPU DIFÍCIL): invariantes gerais, a troca vem antes da dança e o chefe nunca esquiva durante a cena', () => {
    let trocas = 0;
    const falhas: string[] = [];
    for (const semente of [31, 32, 33]) {
      const vigias: [Vigia, Vigia] = [new Vigia(), new Vigia()];
      let naCena = false;
      rodar({ mode: 'versus', c1: 'hayato', c2: 'baatar', chefe: true, cpu: 2, p1cpu: 2, esquiva: true }, semente, 5000, (p) => {
        checar(p, vigias, falhas, { chefe: true });
        for (const e of p.ev) {
          if (e.tipo === 'fase-chefe' && e.etapa === 'troca') trocas++;
          if (e.tipo === 'fase-chefe' && e.etapa === 'danca') naCena = true;
          if (e.tipo === 'fase-chefe' && e.etapa === 'retomada') naCena = false;
          if (naCena && e.tipo === 'esquiva') falhas.push('esquiva do lutador ' + e.lutador + ' durante a Dança, tick ' + p.g.tick);
        }
        if (p.g.p2.barras < 1 || p.g.p2.barras > 2) falhas.push('barras fora de [1, 2] no tick ' + p.g.tick);
      }, { esq: false, lut: comBaatarChefe(elenco) });
    }
    expect(falhas).toEqual([]);
    expect(trocas).toBeGreaterThan(0);
  }, 120_000);
});

// ---------------------------------------------------------------------------------------------------------------------
describe('SEM a flag: nenhum efeito e nenhum RNG novo', () => {
  /** Resumo tick a tick (hash) + número de chamadas ao RNG da lógica. */
  function assinatura(cfg: ConfigPartida, semente: number, ticks: number, esq: boolean) {
    const { rng, chamadas } = rngContador(semente);
    let h = 17;
    const mistura = (s: string): void => {
      for (let i = 0; i < s.length; i++) h = (Math.imul(h, 31) + s.charCodeAt(i)) | 0;
    };
    rodar(cfg, semente, ticks, (p) => {
      const { g } = p;
      mistura(
        [g.phase, g.p1.state, g.p2.state, g.p1.x.toFixed(3), g.p2.x.toFixed(3), g.p1.hp.toFixed(3), g.p2.hp.toFixed(3), g.p1.en.toFixed(3), g.p2.en.toFixed(3), p.ev.map((e) => e.tipo).join('.')].join('|'),
      );
    }, { esq, rng });
    return { h, rnd: chamadas() };
  }

  it('humano espremendo ESQ a cada ~16 ticks contra CPU DIFÍCIL: com a flag desligada a luta e a contagem de rnd são idênticas às da luta sem ESQ (3 sementes)', () => {
    for (const semente of [1, 2, 3]) {
      const cfg: ConfigPartida = { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: 2, esquiva: false };
      const com = assinatura(cfg, semente, 2500, true);
      const sem = assinatura(cfg, semente, 2500, false);
      expect(com, `semente ${semente}`).toEqual(sem);
    }
  });

  it('`esquiva` ausente na config = `esquiva: false`: mesma luta, mesmo rnd', () => {
    const { esquiva: _e, ...semFlag } = { mode: 'versus', c1: 'wei-long', c2: 'min-ji', cpu: 2, p1cpu: 1, esquiva: false } as ConfigPartida;
    void _e;
    expect(assinatura(semFlag as ConfigPartida, 4, 2500, true)).toEqual(assinatura({ ...semFlag, esquiva: false } as ConfigPartida, 4, 2500, true));
  });

  it('flag LIGADA com as duas CPUs FÁCIL (esq = 0, punir = 0): a luta inteira e o rnd são IDÊNTICOS aos da flag desligada (3 sementes)', () => {
    for (const semente of [5, 6, 7]) {
      const base: ConfigPartida = { mode: 'cpu', c1: 'aminu', c2: 'centella', cpu: 0, p1cpu: 0, esquiva: false };
      const off = assinatura(base, semente, 3000, false);
      const on = assinatura({ ...base, esquiva: true }, semente, 3000, false);
      expect(on, `semente ${semente}`).toEqual(off);
    }
  });

  it('flag LIGADA com CPU NORMAL/DIFÍCIL: a luta MUDA (a flag liga mesmo; as duas trajetórias divergem, então o rnd não é comparável)', () => {
    for (const semente of [5, 6, 7]) {
      const base: ConfigPartida = { mode: 'cpu', c1: 'aminu', c2: 'centella', cpu: 2, p1cpu: 2, esquiva: false };
      const off = assinatura(base, semente, 3000, false);
      const on = assinatura({ ...base, esquiva: true }, semente, 3000, false);
      expect(on.h, 'semente ' + semente).not.toBe(off.h);
      expect(on.rnd, 'semente ' + semente).not.toBe(off.rnd);
    }
  });

  it('o snapshot antigo (fight.test.ts.snap) não tem esquiva nenhuma e o novo (esquiva-cpu.test.ts.snap) tem', () => {
    const ler = (rel: string): string => readFileSync(fileURLToPath(new URL(`./__snapshots__/${rel}`, import.meta.url)), 'utf8');
    expect(existsSync(fileURLToPath(new URL('./__snapshots__/fight.test.ts.snap', import.meta.url)))).toBe(true);
    expect(ler('fight.test.ts.snap')).not.toMatch(/esquiv/i);
    expect(ler('esquiva-cpu.test.ts.snap')).toMatch(/"esquiva": \d+/);
    expect(ler('esquiva-cpu.test.ts.snap')).toMatch(/"esquivou": \d+/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('determinismo', () => {
  it('mesma semente, mesma saída; semente diferente, saída diferente (CPU x CPU, esquiva ligada, 4000 ticks)', () => {
    const roda = (semente: number): string => {
      let s = '';
      rodar({ mode: 'cpu', c1: 'hayato', c2: 'nila', cpu: 2, p1cpu: 2, esquiva: true }, semente, 4000, (p) => {
        if (p.ev.length) s += p.g.tick + ':' + p.ev.map((e) => e.tipo + (e.tipo === 'esquiva' ? e.dir : '')).join(',') + ';';
        s += p.g.p1.x.toFixed(2) + ',' + p.g.p2.x.toFixed(2) + ',' + p.g.p1.hp.toFixed(2) + ',' + p.g.p2.hp.toFixed(2) + ';';
      }, { esq: false });
      return s;
    };
    const a = roda(42);
    expect(roda(42)).toBe(a);
    expect(roda(43)).not.toBe(a);
    expect(a).toContain('esquiva');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('estado do Fighter reaproveitado entre lutas e rounds', () => {
  const limpo = (f: Fighter, rot: string): void => {
    expect(f.state, rot).toBe('idle');
    expect(f.esquiva, rot).toBe(0);
    expect(f.invuln, rot).toBe(0);
    expect(f.esquivaId, rot).toBe(0);
    expect(f.esquivaPunivel, rot).toBe(false);
    expect(f['bufEsq'], rot).toBe(0);
    expect(f['esqT'], rot).toBe(0);
    expect(f.ai.puniuEsquiva ?? 0, rot).toBe(0);
    expect(f.trail, rot).toHaveLength(0);
  };

  it('um setup novo no MEIO de uma esquiva (com botão guardado) deixa os dois lutadores limpos, com a flag ligada ou desligada', () => {
    for (const novaFlag of [true, false]) {
      const g = new Game({ lutadores: elenco, rng: criarRng(9) });
      g.setup({ mode: 'versus', c1: 'hayato', c2: 'caio', esquiva: true }, { ...AJUSTES });
      const quadros = { p1: { ...INPUT_VAZIO } as Quadro, p2: { ...INPUT_VAZIO } as Quadro };
      const fonte: FonteEntradas = { p1: () => ({ ...quadros.p1 }), p2: () => ({ ...quadros.p2 }) };
      for (let t = 0; t < 400 && g.phase !== 'fight'; t++) g.update(fonte);
      g.p1.en = 100;
      g.p2.en = 100;
      quadros.p1.esq = true;
      quadros.p2.esq = true;
      g.update(fonte);
      quadros.p1.esq = false;
      quadros.p2.esq = false;
      g.update(fonte);
      expect(g.p1.state).toBe('esquiva');
      quadros.p1.esq = true; // e deixa uma esquiva guardada
      g.update(fonte);
      expect(g.p1['bufEsq']).toBeGreaterThan(0);

      g.setup({ mode: 'versus', c1: 'min-ji', c2: 'camille', esquiva: novaFlag }, { ...AJUSTES });
      limpo(g.p1, `flag ${novaFlag} P1`);
      limpo(g.p2, `flag ${novaFlag} P2`);
      expect(g.esquivaLigada).toBe(novaFlag);
    }
  });

  it('a luta seguinte num Game REUSADO é idêntica, tick a tick, à mesma luta num Game novo (CPU x CPU, com esquiva)', () => {
    const cfg2: ConfigPartida = { mode: 'cpu', c1: 'caio', c2: 'aminu', cpu: 2, p1cpu: 2, esquiva: true };
    const SEM: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
    const trilha = (g: Game, n: number): string => {
      let s = '';
      for (let i = 0; i < n; i++) {
        g.update(SEM);
        s += [g.phase, g.p1.state, g.p2.state, g.p1.x.toFixed(2), g.p2.x.toFixed(2), g.p1.hp.toFixed(2), g.p2.hp.toFixed(2), g.p1.en.toFixed(2), g.events.map((e) => e.tipo).join('.')].join('|') + '\n';
      }
      return s;
    };
    // RNG que podemos "religar" na semente da 2ª luta, para o Game reusado e o novo sortearem a mesma sequência
    let interno = criarRng(100);
    const rng: Rng = { proximo: () => interno.proximo(), entre: (a, b) => a + rng.proximo() * (b - a), inteiro: (k) => Math.floor(rng.proximo() * k), escolher: (xs) => xs[Math.floor(rng.proximo() * xs.length)] as (typeof xs)[number], estado: () => interno.estado() };
    const reusado = new Game({ lutadores: elenco, rng });
    reusado.setup({ mode: 'cpu', c1: 'hayato', c2: 'wei-long', cpu: 2, p1cpu: 2, esquiva: true }, { ...AJUSTES });
    let vistaEsquiva = false;
    for (let t = 0; t < 3000 && !vistaEsquiva; t++) {
      reusado.update(SEM);
      vistaEsquiva = reusado.p1.state === 'esquiva' || reusado.p2.state === 'esquiva';
    }
    expect(vistaEsquiva).toBe(true); // parou NO MEIO de uma esquiva
    interno = criarRng(77);
    reusado.setup(cfg2, { ...AJUSTES });
    const a = trilha(reusado, 2500);

    const novoRng = criarRng(77);
    const novo = new Game({ lutadores: elenco, rng: novoRng });
    novo.setup(cfg2, { ...AJUSTES });
    expect(trilha(novo, 2500)).toBe(a);
  });

  it('`startRound` entre rounds limpa a esquiva (estado, botão guardado, id da esquiva e o marcador de punição da CPU)', () => {
    const l = nova(true);
    l.g.p2.en = 100;
    l.frame.p1.esq = true;
    l.frame.p2.esq = true;
    l.passo();
    l.frame.p1.esq = false;
    l.frame.p2.esq = false;
    l.passo(3);
    l.g.p1.ai.puniuEsquiva = 5;
    l.frame.p1.esq = true;
    l.passo();
    expect(l.g.p2.esquivaId).toBeGreaterThan(0);
    l.g['startRound'](false);
    limpo(l.g.p1, 'round 2 P1');
    limpo(l.g.p2, 'round 2 P2');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('eventos: campos esperados em cenas montadas à mão', () => {
  it('arremesso comum: `throw` com dano = vida perdida, golpe "throw" e SEM `especial`; agarrão de especial (ARREMESSO DO AVARGA): com `especial: true` e golpe sFire', () => {
    const comum = nova(true, 'hayato', 'caio', 300, 360);
    const hp0 = comum.g.p2.hp;
    comum.g.p1.startMove('throw', comum.g);
    const ev = comum.passo(12);
    const t = tipos(ev, 'throw')[0];
    expect(t).toMatchObject({ tipo: 'throw', atacante: 0, defensor: 1, golpe: 'throw' });
    expect(t).not.toHaveProperty('especial');
    expect(t?.tipo === 'throw' && t.dano).toBeGreaterThan(0);
    expect(t?.tipo === 'throw' && t.dano).toBeCloseTo(hp0 - comum.g.p2.hp, 9);

    const esp = nova(true, 'baatar', 'caio', 300, 400);
    esp.g.p1.en = 100;
    const hp1 = esp.g.p2.hp;
    esp.g.p1.startMove('sFire', esp.g);
    const ev2 = esp.passo(30);
    const t2 = tipos(ev2, 'throw')[0];
    expect(t2).toMatchObject({ tipo: 'throw', golpe: 'sFire', especial: true });
    expect(t2?.tipo === 'throw' && t2.dano).toBeCloseTo(hp1 - esp.g.p2.hp, 9);
  });

  it('o escudo da GARKUWA (AMINU sDown) que absorve o projétil: `clash` com lutador, golpe sDown e quadro; sem dano; o choque entre projéteis NÃO leva esses campos', () => {
    let viu = false;
    for (let atraso = 0; atraso < 12 && !viu; atraso++) {
      const l = nova(true, 'aminu', 'hayato', 300, 700);
      l.g.p1.en = 100;
      l.g.lancarProjetil(l.g.p2, l.g.p2.ch.moves.sFire, 0, 1);
      const ev: EventoLuta[] = [];
      for (let t = 0; t < 70; t++) {
        l.frame.p1.sp = t === atraso;
        l.frame.p1.down = t === atraso;
        ev.push(...l.passo());
      }
      const c = ev.find((e) => e.tipo === 'clash' && e.lutador !== undefined);
      if (c) {
        viu = true;
        expect(c).toMatchObject({ tipo: 'clash', lutador: 0, golpe: 'sDown' });
        expect(c).toHaveProperty('quadro');
        expect(tipos(ev, 'hit').filter((e) => e.tipo === 'hit' && e.defensor === 0)).toHaveLength(0);
      }
    }
    expect(viu).toBe(true);
  });

  it('projétil de especial leva `especial: true` no hit; golpe comum não leva; `armor` e bloqueio de especial não publicam número de acerto', () => {
    const l = nova(true, 'hayato', 'caio', 300, 700);
    l.g.p1.en = 100;
    l.g.p1.startMove('sFire', l.g);
    const ev = l.passo(80);
    const h = ev.find((e) => e.tipo === 'hit');
    expect(h).toMatchObject({ tipo: 'hit', atacante: 0, projetil: true, especial: true, golpe: 'sFire' });

    const c = nova(true, 'hayato', 'caio', 300, 360);
    c.g.p1.startMove('hp', c.g);
    const h2 = c.passo(20).find((e) => e.tipo === 'hit');
    expect(h2).toMatchObject({ tipo: 'hit', golpe: 'hp' });
    expect(h2).not.toHaveProperty('especial');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('arte e treino', () => {
  it('os quadros da esquiva (crouch na janela, land na recuperação) existem NO ATLAS DE PRODUÇÃO dos 9 lutadores, e getPD não lança', async () => {
    const { montarTodos } = await import('./_lutadores');
    const { getPD, hasPose } = await import('../../src/data/poses');
    const real = montarTodos({ arteReal: true });
    const sem: string[] = [];
    for (const id of ELENCO_9) {
      const ch = real[id];
      for (const nome of ['crouch', 'land']) {
        expect(() => getPD(ch, nome), id + ' ' + nome).not.toThrow();
        if (!hasPose(ch, nome)) sem.push(id + ':' + nome);
      }
    }
    expect(sem).toEqual([]);
  });

  it('modo TREINO com o alvo "CPU" e a esquiva ligada: o alvo esquiva, ninguém trava e o jogador nunca perde vida', () => {
    const g = new Game({ lutadores: elenco, rng: criarRng(3) });
    g.setup({ mode: 'training', c1: 'hayato', c2: 'caio', esquiva: true }, { ...AJUSTES });
    g.trocarAlvoDoTreino('cpu');
    const gen = gerador(9, true, 0.04);
    const fonte: FonteEntradas = { p1: () => gen(), p2: () => ({ ...INPUT_VAZIO }) };
    let esquivas = 0;
    let preso = 0;
    let maxPreso = 0;
    for (let t = 0; t < 4000; t++) {
      g.update(fonte);
      esquivas += g.events.filter((e) => e.tipo === 'esquiva' && e.lutador === 1).length;
      preso = g.p2.state === 'esquiva' ? preso + 1 : 0;
      maxPreso = Math.max(maxPreso, preso);
      expect(g.p1.hp).toBe(g.p1.maxHp);
      expect(g.p2.hp).toBeGreaterThanOrEqual(1);
      expect(g.p2.en).toBeLessThanOrEqual(MAX_EN);
    }
    expect(esquivas).toBeGreaterThan(0);
    expect(maxPreso).toBeLessThanOrEqual(ESQUIVA_PADRAO.frente.dur + 2);
  }, 60_000);
});
