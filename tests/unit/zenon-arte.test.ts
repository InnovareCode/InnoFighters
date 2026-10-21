import { readFileSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { GROUND, SH, SH_IDLE } from '../../src/core/constantes';
import { todasAsApresentacoes } from '../../src/data/apresentacao-especiais';
import { LUTADORES } from '../../src/data/lutadores';
import { ZENON_DEF } from '../../src/data/lutadores/zenon';
import { getPD } from '../../src/data/poses';
import type { FichaDef } from '../../src/data/tipos';
import { hurtbox } from '../../src/fight/colisao';
import { APRESENTACAO } from '../../src/render/apresentacao-lutadores';
import { lerManifestoC1, montarTodos } from './_lutadores';

/*
 * ZENON · Z5: o atlas REAL (public/assets/lutadores/zenon) contra o dado dele. Toda pose que o dado cita existe, o atlas cabe no
 * teto da spec §9.4, a hurtbox em pé (`alturaEmPe`) é a MEDIDA do atlas (§9.2) e as pontas dos golpes ativos existem.
 */

const caminho = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const manifesto = lerManifestoC1('zenon');
const quadros = manifesto.quadros as Record<string, { x: number; y: number; w: number; h: number; p?: number; ponta?: readonly number[] }>;
const elenco = montarTodos();
const zenon = elenco.zenon;
const poseExiste = (n: string): boolean => quadros[n] !== undefined;

/** Todos os nomes de pose que o dado do ZENON (base e fichas) cita. */
function posesCitadas(): Map<string, string> {
  const onde = new Map<string, string>();
  const cita = (n: string, de: string): void => void (onde.has(n) || onde.set(n, de));
  const doDef = (def: { especiais: typeof ZENON_DEF.especiais; anim?: FichaDef['anim']; poseDaFicha?: FichaDef['poseDaFicha'] }, rot: string): void => {
    for (const [nome, g] of Object.entries(def.especiais)) {
      if (g.pre) cita(g.pre === 'guard' ? 'idle0' : g.pre, `${rot}.${nome}.pre`);
    }
    for (const [golpe, a] of Object.entries(def.anim ?? {})) {
      for (const n of [...a.s, ...a.a, ...(a.r ?? [])]) cita(n, `${rot}.anim.${golpe}`);
    }
    for (const [de, para] of Object.entries(def.poseDaFicha ?? {})) cita(para, `${rot}.poseDaFicha.${de}`);
  };
  doDef(ZENON_DEF, 'base');
  for (const [nome, f] of Object.entries(ZENON_DEF.fichas ?? {})) doDef({ especiais: f.especiais ?? ZENON_DEF.especiais, anim: f.anim ?? ZENON_DEF.anim, poseDaFicha: f.poseDaFicha }, nome);
  for (const p of ZENON_DEF.chefe!.cena.poses) cita(p, 'chefe.cena');
  const ap = APRESENTACAO['zenon'];
  for (const p of ap?.entrada?.poses ?? []) cita(p, 'apresentacao.entrada');
  for (const p of ap?.vitoria?.poses ?? []) cita(p, 'apresentacao.vitoria');
  for (const c of todasAsApresentacoes().filter((x) => x.id === 'zenon')) cita(c.apresentacao.quadro, `apresentacao-especiais ${c.ficha ?? 'base'}/${c.golpe}`);
  return onde;
}

describe('ZENON · o atlas real tem tudo o que o dado cita', () => {
  it('toda pose citada (cena, entrada, vitória, poseDaFicha, anim, preparo, tarja dos especiais) existe no atlas', () => {
    const citadas = posesCitadas();
    expect(citadas.size).toBeGreaterThanOrEqual(18);
    const faltando = [...citadas].filter(([n]) => !poseExiste(n)).map(([n, de]) => `${n} (${de})`);
    expect(faltando).toEqual([]);
  });

  it('o contrato de nomes da spec §12 está completo: entrada0-2, cena0-2, vitoria0-1, decreto0-2 e os de sempre', () => {
    const contrato = [
      'idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1', 'walk2', 'walk3', 'walk4', 'walk5', 'walk6', 'walk7',
      'crouch', 'block', 'cblock', 'jsquat', 'jup', 'jtop', 'jfall', 'land', 'hitH', 'hitB', 'kdAir', 'koFloor',
      'lp0', 'lp1', 'hp0', 'hp1', 'lk0', 'lk1', 'hk0', 'hk1', 'clp', 'clk', 'sweep', 'upper', 'jkick', 'jpunch',
      'sa0', 'sa1', 'sa2', 'sa3', 'sb0', 'sb1', 'sb2', 'sb3', 'sc0', 'sc1', 'win',
      'decreto0', 'decreto1', 'decreto2', 'vitoria0', 'vitoria1', 'entrada0', 'entrada1', 'entrada2', 'cena0', 'cena1', 'cena2',
      'sc2', 'grab0', 'grab1',
    ];
    expect(contrato.filter((n) => !poseExiste(n))).toEqual([]);
  });

  it('apelidos (v2): cblock = crouch, sa2 = sa1, sb2 = sb1, win = vitoria0, idle3 = idle1 (mesmo retângulo); sweep NÃO é clk (a ZR trouxe a rasteira de verdade)', () => {
    const igual = (a: string, b: string): boolean => JSON.stringify(quadros[a]) === JSON.stringify(quadros[b]);
    expect(igual('cblock', 'crouch')).toBe(true);
    expect(igual('sa2', 'sa1')).toBe(true);
    expect(igual('sb2', 'sb1')).toBe(true);
    expect(igual('win', 'vitoria0')).toBe(true);
    expect(igual('idle3', 'idle1')).toBe(true);
    expect(igual('sweep', 'clk')).toBe(false);
    expect(igual('idle1', 'idle2')).toBe(false);
  });

  it('as 3 poses da cena e as 3 da entrada são desenhos DIFERENTES (3 retângulos distintos cada)', () => {
    for (const nomes of [['cena0', 'cena1', 'cena2'], ['entrada0', 'entrada1', 'entrada2'], ['decreto0', 'decreto1', 'decreto2']]) {
      expect(new Set(nomes.map((n) => JSON.stringify(quadros[n]))).size, nomes.join()).toBe(3);
    }
  });

  it('o `getPD` do ZENON de produção resolve direto (sem cair em guard/idle) em toda pose do contrato citada pelo dado', () => {
    for (const [n] of posesCitadas()) expect(getPD(zenon, n), n).toBe(zenon.pd[n]);
  });

  it('fase 2: sc0/sc1 viram decreto0/decreto1 (poseDaFicha) e a caixa do DECRETO sai do decreto1', () => {
    const f2 = zenon.fichas['chefe2']!;
    expect(getPD(f2, 'sc0')).toBe(f2.pd['decreto0']);
    expect(getPD(f2, 'sc1')).toBe(f2.pd['decreto1']);
    expect(f2.moves.sFwd.anim.a[0]).toBe('sc1');
    expect(f2.moves.sFwd.anim.r).toEqual(['decreto2', 'idle0']);
    expect(zenon.moves.sFwd.anim.r).toEqual(['sc2', 'idle0']); // TRIBUTO termina em `sc2`
    expect(zenon.moves.throw.anim).toEqual({ s: ['grab0'], a: ['grab1'], r: ['grab1', 'grab0'] });
  });
});

describe('ZENON · limites do atlas (spec §9.4)', () => {
  it('≤ 5 páginas de 2048 de largura, ≤ 3 MB em disco, ≤ 80 MB decodificados', () => {
    expect(manifesto.imagens.length).toBeLessThanOrEqual(5);
    let bytes = 0;
    for (const arq of manifesto.imagens) bytes += statSync(caminho(`public/assets/lutadores/zenon/${arq}`)).size;
    expect(bytes).toBeLessThanOrEqual(3 * 1024 * 1024);
    const [w, h] = manifesto.tamanho;
    expect(w).toBeLessThanOrEqual(2048);
    expect(manifesto.imagens.length * w * h * 4).toBeLessThanOrEqual(80 * 1024 * 1024);
  });

  it('alturaRef 558 = altura do idle0 (410 × 1,36: a mesma densidade de pixel dos outros) e o retrato do atlas é o do retrato.json', () => {
    expect(manifesto.alturaRef).toBe(558);
    expect(quadros['idle0']!.h).toBe(558);
    const retrato = JSON.parse(readFileSync(caminho('public/assets/lutadores/zenon/retrato.json'), 'utf8')) as { recorte: number[] };
    expect([...(manifesto.retrato?.recorte ?? [])]).toEqual(retrato.recorte);
  });

  it('o laço de respiração (idle0..3) e o andar (walk0..7) têm o mesmo pé: |ax − ax(idle0)| ≤ 4 px nos idles (medido; o andar varia pela pose e é conferido a olho no contact-sheet)', () => {
    const ax = (n: string): number => (quadros[n] as unknown as { ax: number }).ax;
    for (const n of ['idle1', 'idle2', 'idle3']) expect(Math.abs(ax(n) - ax('idle0')), n).toBeLessThanOrEqual(4);
  });
});

describe('ZENON · hurtbox em pé medida do atlas (spec §9.2)', () => {
  it('alturaEmPe = round2(0,92 × altura visível do idle0 em px lógicos / 254,4) = 1,25', () => {
    const visivel = quadros['idle0']!.h * zenon.K; // = scale × SH_IDLE
    expect(visivel).toBeCloseTo(ZENON_DEF.scale * SH_IDLE, 6);
    const medido = Math.round(((0.92 * visivel) / (SH * 0.96)) * 100) / 100;
    expect(LUTADORES.zenon.alturaEmPe).toBe(medido);
    expect(medido).toBe(1.25);
  });

  it('a caixa em pé cobre 92% da altura visível do sprite (a 1,0 cobriria só ~73%) e o topo fica 5 a 10% abaixo da cabeça', () => {
    const visivel = quadros['idle0']!.h * zenon.K;
    const caixa = hurtbox({ x: 480, y: GROUND, state: 'idle', baixo: false, noChao: true, escalaEmPe: zenon.alturaEmPe as number });
    expect(caixa.h / visivel).toBeGreaterThan(0.91);
    expect(caixa.h / visivel).toBeLessThan(0.93);
    const padrao = hurtbox({ x: 480, y: GROUND, state: 'idle', baixo: false, noChao: true });
    expect(padrao.h / visivel).toBeLessThan(0.75);
    // agachado, no ar e em golpe seguem como hoje
    expect(hurtbox({ x: 480, y: GROUND, state: 'crouch', baixo: true, noChao: true, escalaEmPe: 1.25 }).h).toBeCloseTo(SH * 0.56, 9);
  });
});

describe('ZENON · pontas dos golpes ativos e a subida da COLUNA', () => {
  it('lp1, hp1, lk1, hk1, clp, clk, sweep, upper, sa1, sb1, sc1, jkick, jpunch e decreto1 têm ponta dentro do quadro', () => {
    for (const n of ['lp1', 'hp1', 'lk1', 'hk1', 'clp', 'clk', 'sweep', 'upper', 'sa1', 'sb1', 'sc1', 'jkick', 'jpunch', 'decreto1']) {
      const q = quadros[n]!;
      expect(q.ponta, n).toBeDefined();
      expect(q.ponta![0]!, n).toBeGreaterThan(0);
      expect(q.ponta![0]!, n).toBeLessThanOrEqual(q.w + 1);
      expect(q.ponta![1]!, n).toBeGreaterThanOrEqual(0);
      expect(q.ponta![1]!, n).toBeLessThanOrEqual(q.h);
    }
  });

  it('exceções de ponta: lk1 (cotovelada) é a mão, não a bota; sb1 é a palma erguida (topo do quadro); sweep e jkick pegam a bota (embaixo); jpunch o cotovelo (alto)', () => {
    expect(quadros['lk1']!.ponta![1]!).toBeLessThan(quadros['lk1']!.h * 0.4); // a cotovelada fica na altura do rosto
    expect(quadros['sb1']!.ponta![1]!).toBeLessThan(10);
    expect(quadros['sweep']!.ponta![1]!).toBeGreaterThan(quadros['sweep']!.h * 0.8);
    expect(quadros['jkick']!.ponta![1]!).toBeGreaterThan(quadros['jkick']!.h * 0.8);
    expect(quadros['jpunch']!.ponta![1]!).toBeLessThan(quadros['jpunch']!.h * 0.6);
  });

  it('o SELO nasce na mão (ponta de sa1) e a caixa de acerto de cada golpe corpo a corpo tem alcance > 0', () => {
    expect(zenon.spawn.x).toBeGreaterThan(60);
    for (const [n, c] of Object.entries(zenon.boxes)) expect(c!.w, n).toBeGreaterThanOrEqual(90);
  });

  it('a COLUNA DE ÔNIX sobe pouco o bastante para o topo do sprite ficar dentro da tela com a câmera em zoom máximo (1,075)', () => {
    const subida = (zenon.moves.sDown.vy as number) ** 2 / (2 * 0.85);
    expect(subida).toBeLessThan(80);
    for (const n of ['sb1', 'sb2']) {
      const topo = GROUND - (subida + quadros[n]!.h * zenon.K) * 1.075;
      expect(topo, n).toBeGreaterThanOrEqual(-6);
    }
  });
});

describe('ZENON · as caixas de acerto alcançam o corpo de quem tem escala 1,0 (achado do harness: o sprite alto deixava a caixa por cima da cabeça)', () => {
  const variantes = [
    ['base', zenon],
    ['chefe', zenon.fichas['chefe']!],
    ['chefe2', zenon.fichas['chefe2']!],
  ] as const;

  it.each(variantes)('%s: o fundo da caixa dos golpes em pé fica abaixo de 70% de SH (a hurtbox de um lutador de escala 1,0 vai a 96%: sobram >= 70 px de peito e cabeça)', (_nome, ch) => {
    for (const g of ['lp', 'lk', 'hp', 'hk', 'sFwd'] as const) {
      const c = ch.boxes[g]!;
      expect(c.fy - c.h, `${_nome}.${g}`).toBeLessThanOrEqual(SH * 0.7);
      expect(c.fy, `${_nome}.${g}`).toBeGreaterThan(SH * 0.9); // e o topo ainda alcança o rosto
    }
    expect(ch.boxes.clp!.fy - ch.boxes.clp!.h, `${_nome}.clp`).toBeLessThanOrEqual(SH * 0.4); // agachado: alcança quem está agachado (topo 56% de SH)
  });

  it('a fase 2 mantém o `bh` dos golpes comuns do def base (a ficha substitui `mods` por golpe: `hp: { armor: 1 }` sozinho apagava a caixa alta)', () => {
    const base = zenon;
    const f2 = zenon.fichas['chefe2']!;
    for (const g of ['lp', 'lk', 'hp', 'hk', 'clp'] as const) expect(f2.moves[g].bh, g).toBe(base.moves[g].bh);
  });

  it('o SELO nasce a meia altura (175 px, ~metade do sprite) e não a ~280 px (a mão do sa1), por cima da cabeça de todo mundo', () => {
    expect(zenon.spawn.y).toBe(175);
    expect(zenon.spawn.y).toBeLessThan(SH * 0.96);
    expect(zenon.fichas['chefe2']!.spawn.y).toBe(175);
  });
});
