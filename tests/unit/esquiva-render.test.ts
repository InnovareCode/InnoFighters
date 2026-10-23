import { describe, expect, it } from 'vitest';
import type { ArteLutador } from '../../src/assets/elenco';
import type { LutadorLeitura } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { ALFA_FANTASMA, ehPoseDeEsquiva, esquivaNaJanela, silhuetaTingida } from '../../src/render/esquiva';
import { Efeitos } from '../../src/render/efeitos';
import { desenharLutador } from '../../src/render/lutador';
import { criarRng } from '../../src/core/rng';
import type { Ctx } from '../../src/render/tela';

/** Contexto falso que grava chamadas, atribuições e os `addColorStop` de cada degradê. */
function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return (...a: unknown[]) => {
          chamadas.push([nome, ...a]);
          return { addColorStop: (...s: unknown[]) => chamadas.push(['addColorStop', ...s]) };
        };
      }
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas, chamou: (n: string) => chamadas.filter(([c]) => c === n).length };
}

const quadro = (x: number, y: number, w: number, h: number, ax: number) => ({ x, y, w, h, ax });
const poses: Poses = {
  idle0: quadro(8, 8, 289, 410, 137),
  guard: quadro(8, 8, 289, 410, 137),
  crouch: quadro(8, 500, 200, 300, 100),
  land: quadro(300, 500, 200, 300, 100),
  walk3: quadro(600, 500, 200, 300, 100),
};
const hayato = montarLutador(LUTADORES.hayato, poses);
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const SIL = { tag: 'silhueta' } as unknown as CanvasImageSource;
const arte: ArteLutador = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => SIL, retrato: () => null };

const pose = { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 } as const;
function lutador(extra: Partial<LutadorLeitura> = {}): LutadorLeitura {
  return {
    id: 'hayato', indice: 0, x: 300, y: 470, facing: 1, state: 'idle', pose, move: null, mt: 0,
    hp: 100, maxHp: 100, hpShown: 100, en: 0, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0,
    dmgTaken: 0, combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null,
    barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  };
}
const NA_JANELA = { state: 'esquiva', esquiva: -1, invuln: 8, pose: { ...pose, name: 'crouch', rot: -0.12 } } as const;
const NA_RECUPERACAO = { state: 'esquiva', esquiva: -1, invuln: 0, pose: { ...pose, name: 'land' } } as const;
const rastro = (name: string) => ({ x: 280, y: 470, name, f: 1 as const, life: 8 });

describe('fantasma e rastro da ESQUIVA (só na janela invulnerável)', () => {
  it('janela: corpo com alfa 0,55, faixa de velocidade na cor fire[0] do lutador, sem shadowBlur', () => {
    const g = gravador();
    desenharLutador(g.ctx, lutador({ ...NA_JANELA }), hayato, arte);
    const iCorpo = g.chamadas.findIndex(([n, v]) => n === '=globalAlpha' && v === ALFA_FANTASMA);
    expect(iCorpo).toBeGreaterThan(-1);
    // o desenho do corpo vem logo depois do alfa fantasma
    expect(g.chamadas[iCorpo + 1]?.[0]).toBe('drawImage');
    const gradientes = g.chamadas.filter(([n]) => n === 'createLinearGradient');
    expect(gradientes).toHaveLength(1);
    expect(g.chamadas.some(([n, off, cor]) => n === 'addColorStop' && off === 0 && cor === hayato.fire[0])).toBe(true);
    expect(g.chamadas.some(([n]) => n === '=shadowBlur' || n === '=filter')).toBe(false);
  });

  it('a faixa fica atrás: recuo (para trás) com o lutador olhando à direita deixa a faixa à direita; avanço, à esquerda', () => {
    const faixa = (esquiva: 1 | -1) => {
      const g = gravador();
      desenharLutador(g.ctx, lutador({ ...NA_JANELA, esquiva }), hayato, arte);
      const fill = g.chamadas.filter(([n]) => n === 'fillRect').at(-1)!;
      return fill[1] as number;
    };
    // x do lutador = 300; faixa de 150 px
    expect(faixa(-1)).toBe(300); // recuo: se desloca para a esquerda, a faixa vai de 300 a 450
    expect(faixa(1)).toBe(150); // avanço: se desloca para a direita, a faixa vai de 150 a 300
  });

  it('recuperação: corpo sólido, sem faixa e sem rastro (vulnerável, punível)', () => {
    const g = gravador();
    desenharLutador(g.ctx, lutador({ ...NA_RECUPERACAO, trail: [rastro('crouch'), rastro('land')] }), hayato, arte);
    expect(g.chamadas.some(([n, v]) => n === '=globalAlpha' && v === ALFA_FANTASMA)).toBe(false);
    expect(g.chamou('createLinearGradient')).toBe(0);
    // só o reflexo do piso e o corpo desenham imagem: nenhuma silhueta de rastro
    const base = gravador();
    desenharLutador(base.ctx, lutador({ ...NA_RECUPERACAO }), hayato, arte);
    expect(g.chamou('drawImage')).toBe(base.chamou('drawImage'));
  });

  it('janela: o rastro (silhuetas dos últimos ticks) aparece', () => {
    const sem = gravador();
    desenharLutador(sem.ctx, lutador({ ...NA_JANELA }), hayato, arte);
    const com = gravador();
    desenharLutador(com.ctx, lutador({ ...NA_JANELA, trail: [rastro('crouch'), rastro('crouch')] }), hayato, arte);
    expect(com.chamou('drawImage')).toBe(sem.chamou('drawImage') + 2);
  });

  it('resto de esquiva (crouch/land no rastro) some assim que a janela acaba; rastro de corrida (walk) continua', () => {
    const base = gravador();
    desenharLutador(base.ctx, lutador(), hayato, arte);
    const resto = gravador();
    desenharLutador(resto.ctx, lutador({ trail: [rastro('crouch'), rastro('land')] }), hayato, arte);
    expect(resto.chamou('drawImage')).toBe(base.chamou('drawImage'));
    const corrida = gravador();
    desenharLutador(corrida.ctx, lutador({ trail: [rastro('walk3')] }), hayato, arte);
    expect(corrida.chamou('drawImage')).toBe(base.chamou('drawImage') + 1);
  });

  it('sem a mecânica (campo ausente ou 0): o quadro é idêntico ao de sempre', () => {
    const a = gravador();
    desenharLutador(a.ctx, lutador(), hayato, arte);
    const b = gravador();
    desenharLutador(b.ctx, lutador({ esquiva: 0, invuln: 12 }), hayato, arte); // invulnerável por outro motivo (levantar): não é fantasma
    expect(b.chamadas).toEqual(a.chamadas);
  });

  it('esquivaNaJanela e ehPoseDeEsquiva', () => {
    expect(esquivaNaJanela({ esquiva: 1, invuln: 3 })).toBe(true);
    expect(esquivaNaJanela({ esquiva: 1, invuln: 0 })).toBe(false);
    expect(esquivaNaJanela({ esquiva: 0, invuln: 3 })).toBe(false);
    expect(esquivaNaJanela({ invuln: 3 })).toBe(false);
    expect(ehPoseDeEsquiva('crouch') && ehPoseDeEsquiva('land')).toBe(true);
    expect(ehPoseDeEsquiva('walk3')).toBe(false);
  });
});

describe('silhuetaTingida', () => {
  it('pinta a silhueta com a cor do lutador (source-in) e guarda por quadro e cor', () => {
    const chamadas: Array<[string, ...unknown[]]> = [];
    let criados = 0;
    const criar = (w: number, h: number) => {
      criados++;
      const g = new Proxy({} as Record<string, unknown>, {
        get: (_, n: string) => (...a: unknown[]) => chamadas.push([n, ...a]),
        set: (_, n: string, v: unknown) => (chamadas.push([`=${n}`, v]), true),
      });
      return { width: w, height: h, getContext: () => g } as unknown as HTMLCanvasElement;
    };
    const pd = { x: 5, y: 6, w: 20, h: 30, ax: 10 };
    const a = silhuetaTingida(SIL, pd, '#6fe0ff', criar);
    expect(a).not.toBeNull();
    expect(chamadas.find(([n]) => n === 'drawImage')).toEqual(['drawImage', SIL, 1, 1, 20, 30, 0, 0, 20, 30]); // a silhueta é do quadro com 1 px de margem: a fonte começa em 1,1
    expect(chamadas.some(([n, v]) => n === '=globalCompositeOperation' && v === 'source-in')).toBe(true);
    expect(chamadas.some(([n, v]) => n === '=fillStyle' && v === '#6fe0ff')).toBe(true);
    expect(silhuetaTingida(SIL, pd, '#6fe0ff', criar)).toBe(a);
    expect(criados).toBe(1);
    silhuetaTingida(SIL, pd, '#ff6a9a', criar); // outra cor = outro recorte
    expect(criados).toBe(2);
  });

  it('sem DOM devolve null (o desenho cai na silhueta branca)', () => {
    expect(silhuetaTingida(SIL, { x: 0, y: 0, w: 4, h: 4, ax: 2 }, '#fff', () => null)).toBeNull();
  });
});

describe('Efeitos: esquiva e esquivou', () => {
  const posicao = () => ({ x: 300, y: 470 });
  it('esquiva: flash curto na cor do lutador, no corpo dele', () => {
    const e = new Efeitos(criarRng(1));
    e.reagir({ tipo: 'esquiva', lutador: 0, dir: -1, x: 300 }, posicao, () => '#6fe0ff');
    expect(e.impactos).toHaveLength(1);
    expect(e.impactos[0]?.col).toBe('#6fe0ff');
    expect(e.particulas.length).toBeGreaterThan(0);
  });
  it('esquivou: ESQUIVOU! #bfe9ff, 20, no lutador que esquivou, e mais nada (sem número, sem estrela)', () => {
    const e = new Efeitos(criarRng(1));
    e.reagir({ tipo: 'esquivou', lutador: 1, atacante: 0, x: 500, y: 380, projetil: false }, () => ({ x: 640, y: 470 }));
    expect(e.textos).toHaveLength(1);
    expect(e.textos[0]).toMatchObject({ s: 'ESQUIVOU!', col: '#bfe9ff', size: 20, x: 640 });
    expect(e.impactos).toHaveLength(0);
  });
  it('o contragolpe especial (COUP D\'ARRÊT) usa o prata-azulado #c7d3ff, não o ciano #7fe3ff do HAYATO', () => {
    const e = new Efeitos(criarRng(1));
    e.reagir({
      tipo: 'hit', atacante: 0, defensor: 1, x: 500, y: 380, cor: '#ffd84a', grande: false, snd: 'punch', pitch: 1, contragolpe: true,
      projetil: false, acertos: 1, texto: null, contraEspecial: true,
    });
    const cores = e.impactos.map((i) => i.col);
    expect(cores).toContain('#c7d3ff');
    expect(cores).not.toContain('#7fe3ff');
  });
});

// ---- HUD: marcador de custo e selo ESQ ----
import type { Elenco } from '../../src/assets/elenco';
import type { LeituraLuta } from '../../src/core/contratos';
import { ESQUIVA_PADRAO } from '../../src/data/esquiva';
import { desenharHUD, SELO_ESQ } from '../../src/render/hud';

function luta(a: Partial<LutadorLeitura> = {}, b: Partial<LutadorLeitura> = {}): LeituraLuta {
  return {
    fighters: [lutador(a), lutador({ id: 'wei-long', indice: 1, x: 660, facing: -1, ...b })],
    projectiles: [], timer: 99, timerMax: 99, round: 1, winsNeeded: 2, cam: { z: 1, x: 480 }, phase: 'fight', t: 100,
    tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp', winner: null, matchWinner: null,
    matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [],
  };
}
const wei = montarLutador(LUTADORES['wei-long'], poses);
const elenco = { hayato: { ch: hayato, arte }, 'wei-long': { ch: wei, arte } } as unknown as Elenco;

/** Preenchimentos (fillStyle) usados logo antes de cada fillRect/fill que cai dentro do retângulo [x, x+w] x [y, y+h]. */
function pintadoEm(chamadas: Array<[string, ...unknown[]]>, x: number, y: number, w: number, h: number): string[] {
  const cores: string[] = [];
  let fill = '';
  for (const [n, ...a] of chamadas) {
    if (n === '=fillStyle') fill = String(a[0]);
    if (n === 'fillRect' && (a[0] as number) >= x && (a[0] as number) <= x + w && (a[1] as number) >= y && (a[1] as number) <= y + h) cores.push(fill);
  }
  return cores;
}

describe('HUD da ESQUIVA (Regras.esquiva)', () => {
  const LUGAR_SELO_P1 = { x: 128 + 240 + 12, y: 540 - 34 - 1 };
  const textos = (g: ReturnType<typeof gravador>) => g.chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t));

  it('sem a opção (padrão): nem selo ESQ nem marcador ciano — o HUD é o do protótipo', () => {
    const g = gravador();
    desenharHUD(g.ctx, luta({ en: 80 }), elenco);
    expect(textos(g)).not.toContain('ESQ');
    expect(g.chamadas.some(([n, v]) => n === '=fillStyle' && v === '#7fe3ff')).toBe(false);
  });

  it('com a opção: o selo ESQ aparece nos dois lados', () => {
    const g = gravador();
    desenharHUD(g.ctx, luta({ en: 80 }, { en: 80 }), elenco, { esquiva: true });
    expect(textos(g).filter((t) => t === 'ESQ')).toHaveLength(2);
  });

  it('selo apagado com en < custo e aceso (ciano, pulsando) com en >= custo; o limite é exatamente o custo', () => {
    const corDoSelo = (en: number, t = 100) => {
      const g = gravador();
      desenharHUD(g.ctx, { ...luta({ en }), t }, elenco, { esquiva: true });
      // o selo é o 1º retângulo arredondado preenchido depois da barra; pega o fillStyle do fill logo antes do texto ESQ
      const iTexto = g.chamadas.findIndex(([n, s]) => n === 'fillText' && s === 'ESQ');
      const antes = g.chamadas.slice(0, iTexto).filter(([n]) => n === '=fillStyle').map(([, v]) => String(v));
      return { corTexto: antes.at(-1), todas: g.chamadas };
    };
    expect(ESQUIVA_PADRAO.custo).toBe(20);
    const apagado = corDoSelo(ESQUIVA_PADRAO.custo - 1);
    const aceso = corDoSelo(ESQUIVA_PADRAO.custo);
    expect(apagado.corTexto).toBe('#7f8fbf');
    expect(aceso.corTexto).toBe('#04243a');
    // pulsa: o fundo do selo alterna entre #ffffff e #7fe3ff conforme o tick
    const fundo = (t: number) => {
      const g = gravador();
      desenharHUD(g.ctx, { ...luta({ en: 50 }), t }, elenco, { esquiva: true });
      const fills = g.chamadas.filter(([n]) => n === '=fillStyle').map(([, v]) => String(v));
      return fills.includes('#ffffff') ? 'branco' : 'ciano';
    };
    expect(new Set([fundo(0), fundo(7)]).size).toBe(2);
  });

  it('o selo cabe na tela, longe das barras e do centro', () => {
    expect(LUGAR_SELO_P1.x + SELO_ESQ.w).toBeLessThan(480);
    expect(LUGAR_SELO_P1.y + SELO_ESQ.h).toBeLessThanOrEqual(540);
  });

  it('marcador ciano do custo 20 a 20% da barra SUPER, ao lado do dourado e com borda escura (a barra cheia também é ciano)', () => {
    const g = gravador();
    desenharHUD(g.ctx, luta({ en: 100 }), elenco, { esquiva: true });
    const retangulos = g.chamadas.filter(([n, ...a]) => n === 'fillRect' && a[3] === 16 && a[2] === 2);
    // barra do P1: ex = 128, ew = 240 -> 20% = 48 px
    const ciano = retangulos.filter(([, x]) => (x as number) >= 128 + 40 && (x as number) <= 128 + 52);
    expect(ciano.length).toBeGreaterThanOrEqual(2); // dourado + ciano (cada um com 2 px de largura)
    expect(pintadoEm(g.chamadas, 128, 506, 240, 16)).toContain('#7fe3ff');
  });
});
