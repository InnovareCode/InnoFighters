import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { GROUND } from '../../src/core/constantes';
import { INPUT_VAZIO, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { todosOsFilmes } from '../../src/data/filmes';
import { roteiroDoFilme, roteiroDaTabela, type RoteiroFilme } from '../../src/data/roteiros-filme';
import type { NomeGolpe } from '../../src/data/tipos';
import { Game, type FonteEntradas } from '../../src/fight/game';
import {
  batidasEfetivas,
  cameraDoFilme,
  danoAteAgora,
  danoDasBatidas,
  desenharPainelDeClose,
  duracaoDoFilme,
  FilmeDoEspecial,
  fimDoFilme,
  geometriaDoPainel,
  hudDoRival,
  indiceDaBatida,
  posicoesDoFilme,
  resolverPoseDoFilme,
  tempoEfetivo,
  tetoDeZoom,
  TICKS_DA_SAIDA_AO_PULAR,
  TICKS_PARA_PULAR,
  ALTURA_DO_PAINEL,
  BASE_DO_PAINEL,
  type EventoFilme,
  type HudDoRival,
  type ModoFilme,
} from '../../src/render/filme';
import { PROD } from './_filme';
import { gravador } from './_ui';

/*
 * V2-3d (spec §3.5, critérios do §9): o FILME na UI contra o motor de verdade. Para cada um dos 33 especiais com filme: o motor emite o evento `filme`, o `FilmeDoEspecial`
 * toca o roteiro (COMPLETA, CURTA e pulado), e o ÚLTIMO quadro bate com o estado do motor: posições `depois` (<= 1 px), a barra em `hp`, a soma dos números = `dano`.
 */
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(PROD).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

type Real = { g: Game; ev: EventoFilme; antes: HudDoRival };

/** Roda o golpe `golpe` do `id` contra o boneco do treino, a `d` px, até o tick do contato com filme. */
function filmeReal(id: IdLutador, ficha: string | null, golpe: string, d: number, segurar?: number): Real | null {
  const g = new Game({ lutadores: PROD, rng: criarRng(1) });
  g.setup({ mode: 'training', c1: id, c2: 'wei-long', motorV2: { filmes: true } }, { rounds: 2, time: 99, shake: false });
  g.phase = 'fight';
  g.t = 0;
  const frame: InputFrame = { ...INPUT_VAZIO };
  const fonte: FonteEntradas = { p1: () => ({ ...frame }), p2: () => ({ ...INPUT_VAZIO }) };
  const p1 = g.p1;
  const p2 = g.p2;
  if (ficha) p1.trocarFicha(ficha);
  p1.x = 480 - d / 2;
  p2.x = 480 + d / 2;
  p1.facing = 1;
  p2.facing = -1;
  p1.en = 100;
  for (let i = 0; i < 3; i++) g.update(fonte);
  const alvoNoAr = (PROD[id].moves as Record<string, { agarrao?: { alvo?: string } }>)[golpe]?.agarrao?.alvo === 'ar';
  if (alvoNoAr) {
    p2.setState('jump');
    p2.y = GROUND - 70;
    p2.vy = -3;
  }
  p1.x = 480 - d / 2;
  p2.x = 480 + d / 2;
  p2.vx = 0;
  p1.startMove(golpe as NomeGolpe, g);
  let antes: HudDoRival = { hp: p2.hp, hpShown: p2.hpShown, barras: p2.barras };
  for (let i = 0; i < 200; i++) {
    antes = { hp: p2.hp, hpShown: p2.hpShown, barras: p2.barras };
    frame.spSeg = segurar !== undefined && i < segurar;
    g.update(fonte);
    const ev = (g.events as readonly EventoLuta[]).find((e): e is EventoFilme => e.tipo === 'filme');
    if (ev) return { g, ev, antes };
    if (p2.state !== 'jump') p2.x = 480 + d / 2;
  }
  return null;
}

function acharFilme(id: IdLutador, ficha: string | null, golpe: string, nivel3: boolean): Real {
  for (let d = 80; d <= 520; d += 20) {
    const r = filmeReal(id, ficha, golpe, d, nivel3 ? 78 : undefined);
    if (r) return r;
  }
  throw new Error(`${id}/${ficha}/${golpe}: o motor não abriu filme em nenhuma distância`);
}

const iniciar = (f: FilmeDoEspecial, r: Real, modo: ModoFilme): RoteiroFilme => {
  const roteiro = roteiroDoFilme(r.g.fighters[r.ev.atacante].id, r.ev.ficha, r.ev.golpe, r.ev.projetil);
  f.iniciar({ ev: r.ev, roteiro, modo, rivalAntes: r.antes, cor: '#fff', alturaDoAtacante: 265, cameraInicial: { x: r.g.cam.x, z: r.g.cam.z } });
  return roteiro;
};

describe('V2-3d: linha do tempo pura', () => {
  it('tempo efetivo: sem pulo é o próprio tick; o pulo acelera para chegar ao fim do roteiro no ÚLTIMO quadro desenhado', () => {
    expect(tempoEfetivo(66, 0, null)).toBe(0);
    expect(tempoEfetivo(66, 40, null)).toBe(40);
    expect(tempoEfetivo(66, 90, null)).toBe(66);
    for (const pulouEm of [11, 20, 40, 60]) {
      const fim = fimDoFilme(66, pulouEm);
      expect(fim).toBe(Math.min(66, pulouEm + TICKS_DA_SAIDA_AO_PULAR));
      expect(tempoEfetivo(66, pulouEm, pulouEm)).toBe(pulouEm);
      expect(tempoEfetivo(66, fim - 1, pulouEm), `pulou em ${pulouEm}`).toBe(66);
      let anterior = -1;
      for (let t = pulouEm; t < fim; t++) {
        const v = tempoEfetivo(66, t, pulouEm);
        expect(v).toBeGreaterThanOrEqual(anterior);
        anterior = v;
      }
    }
  });

  it('o dano acumulado desce a barra gradualmente e termina exatamente no dano total', () => {
    const r = roteiroDaTabela('hayato/sFwd') as RoteiroFilme;
    const eff = batidasEfetivas(r, 'completa');
    const d = danoDasBatidas(eff, 15.5);
    expect(danoAteAgora(eff, d, 0)).toBe(0);
    expect(danoAteAgora(eff, d, 8)).toBe(0);
    const meio = danoAteAgora(eff, d, 10); // no meio da descida da 1ª batida (0,12 x 15,5 = 1,86)
    expect(meio).toBeGreaterThan(0);
    expect(meio).toBeLessThan(1.86);
    expect(danoAteAgora(eff, d, 66)).toBeCloseTo(15.5, 9);
    let anterior = -1;
    for (let t = 0; t <= 66; t += 0.5) {
      const v = danoAteAgora(eff, d, t);
      expect(v).toBeGreaterThanOrEqual(anterior);
      anterior = v;
    }
  });

  it('HUD do rival: a barra parte do estado de antes, nunca passa do hp do motor e o último quadro bate com ele', () => {
    const r = roteiroDaTabela('hayato/sFwd') as RoteiroFilme;
    const eff = batidasEfetivas(r, 'completa');
    const d = danoDasBatidas(eff, 15.5);
    const antes = { hp: 100, hpShown: 100, barras: 1 };
    const motor = { hp: 84.5, hpShown: 96, barras: 1 };
    expect(hudDoRival(eff, d, 0, antes, motor, false)).toEqual({ hp: 100, hpShown: 100, barras: 1 });
    for (let t = 0; t <= 66; t++) {
      const h = hudDoRival(eff, d, t, antes, motor, false);
      expect(h.hp).toBeGreaterThanOrEqual(motor.hp);
      expect(h.hp).toBeLessThanOrEqual(100);
      expect(h.hpShown).toBeGreaterThanOrEqual(h.hp);
    }
    const fim = hudDoRival(eff, d, 65, antes, motor, false);
    expect(fim.hp).toBeCloseTo(84.5, 9);
    expect(fim.hpShown).toBe(96); // continua do hpShown do motor: a barra vermelha não "volta" depois do filme
  });

  it('troca de barra: a barra velha esvazia (barras de antes) e a nova entra quando as batidas com dano acabam', () => {
    const r = roteiroDaTabela('hayato/sFwd') as RoteiroFilme;
    const eff = batidasEfetivas(r, 'completa');
    const d = danoDasBatidas(eff, 40);
    const antes = { hp: 40, hpShown: 40, barras: 2 };
    const motor = { hp: 120, hpShown: 120, barras: 1 };
    expect(hudDoRival(eff, d, 30, antes, motor, true).barras).toBe(2);
    expect(hudDoRival(eff, d, 37, antes, motor, true).hp).toBeGreaterThanOrEqual(0);
    expect(hudDoRival(eff, d, 45, antes, motor, true).barras).toBe(2);
    expect(hudDoRival(eff, d, 45, antes, motor, true).hp).toBe(0);
    expect(hudDoRival(eff, d, 46, antes, motor, true)).toEqual(motor);
    expect(hudDoRival(eff, d, 65, antes, motor, true)).toEqual(motor);
  });

  it('trajetória: parados em `antes` até o impacto e EXATAMENTE em `depois` da queda em diante; o rival sobe em arco', () => {
    const r = roteiroDaTabela('hayato/sFwd') as RoteiroFilme;
    const eff = batidasEfetivas(r, 'completa');
    const ev = {
      antes: { atacante: { x: 380, y: GROUND, facing: 1 as const }, defensor: { x: 520, y: GROUND, facing: -1 as const } },
      depois: { atacante: { x: 360, y: GROUND, facing: 1 as const }, defensor: { x: 510, y: GROUND, facing: -1 as const } },
      final: 'lanca' as const,
    };
    const p0 = posicoesDoFilme(r, eff, 10, ev, 265);
    expect(p0.atacante).toEqual(ev.antes.atacante);
    expect(p0.rival.x).toBe(520);
    const fim = posicoesDoFilme(r, eff, 66, ev, 265);
    expect(fim.atacante).toEqual(ev.depois.atacante);
    expect(fim.rival).toMatchObject(ev.depois.defensor);
    let pico = 0;
    for (let t = 38; t <= 58; t += 0.5) pico = Math.max(pico, GROUND - posicoesDoFilme(r, eff, t, ev, 265).rival.y);
    expect(pico).toBeGreaterThan(100);
    expect(pico).toBeLessThanOrEqual(150);
    // 'derruba' fica abaixo de 'lanca'; 'parede' não tem arco
    const arco = (final: 'derruba' | 'parede'): number => {
      let m = 0;
      for (let t = 38; t <= 58; t += 0.5) m = Math.max(m, GROUND - posicoesDoFilme(r, eff, t, { ...ev, final }, 265).rival.y);
      return m;
    };
    expect(arco('derruba')).toBeGreaterThan(40);
    expect(arco('derruba')).toBeLessThanOrEqual(70);
    expect(arco('parede')).toBe(0);
  });

  it('câmera: nunca passa do teto do lutador em foco (1,30; BAATAR 1,25; ZENON 1,10; arte antiga 1,20) e a última batida devolve a câmera da luta', () => {
    expect(tetoDeZoom('hayato', { legacy: false })).toBe(1.3);
    expect(tetoDeZoom('baatar', { legacy: false })).toBe(1.25);
    expect(tetoDeZoom('zenon', { legacy: false })).toBe(1.1);
    expect(tetoDeZoom('wei-long', { legacy: true })).toBe(1.2);
    const r = roteiroDaTabela('zenon/sFwd') as RoteiroFilme;
    const eff = batidasEfetivas(r, 'completa');
    const pos = { atacante: { x: 380, y: GROUND, facing: 1 as const }, rival: { x: 520, y: GROUND, facing: -1 as const, rot: 0 } };
    for (let t = 0; t <= 65; t++) {
      const c = cameraDoFilme(eff, t, pos, [1.1, 1.3], { x: 450, z: 1.02 }, { x: 460, z: 1.05 });
      expect(c.z).toBeLessThanOrEqual(1.3 + 1e-9);
      expect(c.z).toBeGreaterThanOrEqual(1);
    }
    expect(cameraDoFilme(eff, 65, pos, [1.1, 1.3], { x: 450, z: 1.02 }, { x: 460, z: 1.05 })).toEqual({ x: 460, z: 1.05 });
    expect(cameraDoFilme(eff, 0, pos, [1.1, 1.3], { x: 450, z: 1.02 }, { x: 460, z: 1.05 }).z).toBeCloseTo(1.02, 9);
    // a 1ª batida pede 1,30 com o ATACANTE em foco: com teto de 1,10 (ZENON) a câmera chega a 1,10 e não passa; foco no rival usa o teto do rival
    expect(cameraDoFilme(eff, 4, pos, [1.1, 1.3], { x: 450, z: 1.02 }, { x: 460, z: 1.05 }).z).toBeCloseTo(1.1, 9);
    expect(cameraDoFilme(eff, 4, pos, [1.3, 1.1], { x: 450, z: 1.02 }, { x: 460, z: 1.05 }).z).toBeCloseTo(1.3, 9);
    expect(indiceDaBatida(eff, 0)).toBe(0);
  });
});

describe('V2-3d: poses do roteiro e painel da folha FILME', () => {
  const chFalso = (pd: Record<string, unknown>) => ({ pd }) as unknown as Parameters<typeof resolverPoseDoFilme>[0];

  it('`$motor` = a pose da leitura; `fN` sem página (ou sem `painel: true`) cai no Alt; com página de painel desenha o painel e o mundo usa o Alt', () => {
    expect(resolverPoseDoFilme(chFalso({}), '$motor', undefined, 'guard')).toEqual({ mundo: 'guard', painel: null });
    expect(resolverPoseDoFilme(chFalso({}), 'lp1', undefined, 'guard')).toEqual({ mundo: 'lp1', painel: null });
    expect(resolverPoseDoFilme(chFalso({}), 'f0', 'sa2', 'guard')).toEqual({ mundo: 'sa2', painel: null });
    expect(resolverPoseDoFilme(chFalso({ f0: { x: 0, y: 0, w: 5, h: 5, ax: 2 } }), 'f0', 'sa2', 'guard')).toEqual({ mundo: 'f0', painel: null });
    expect(resolverPoseDoFilme(chFalso({ f0: { x: 0, y: 0, w: 5, h: 5, ax: 2, painel: true } }), 'f0', 'sa2', 'guard')).toEqual({ mundo: 'sa2', painel: 'f0' });
  });

  it('geometria do painel: 62% da altura da tela, encostado na base, entra deslizando e a borda de dentro tem 12 graus', () => {
    expect(ALTURA_DO_PAINEL).toBe(335);
    const g = geometriaDoPainel(true, 1);
    expect(g.base).toBe(BASE_DO_PAINEL);
    expect(g.base - g.topo).toBe(ALTURA_DO_PAINEL);
    const [, topoDentro, baseDentro] = g.pontos as readonly [number, number][];
    expect(Math.atan2((topoDentro as unknown as number[])[0]! - (baseDentro as unknown as number[])[0]!, ALTURA_DO_PAINEL) * (180 / Math.PI)).toBeCloseTo(12, 5);
    expect(geometriaDoPainel(true, 0).pontos[1]?.[0]).toBeLessThan(0); // fora da tela antes de entrar
    expect(geometriaDoPainel(false, 0).pontos[1]?.[0]).toBeGreaterThan(960);
  });

  it('desenha a célula espelhada pelo lado: o atacante olha para a direita; a reação, para a esquerda', () => {
    const id = { paleta: { nucleo: '#fff', brilho: '#0ff', sombra: '#003' } } as Parameters<typeof desenharPainelDeClose>[3];
    const pd = { x: 10, y: 20, w: 100, h: 200, ax: 50 };
    const g1 = gravador();
    desenharPainelDeClose(g1.ctx, IMG, pd, id, { atacando: true, deQuemEstaEsquerda: true, facing: 1, idade: 10 });
    expect(g1.chamadas.some(([n, ...a]) => n === 'scale' && a[0] === -1)).toBe(false);
    const g2 = gravador();
    desenharPainelDeClose(g2.ctx, IMG, pd, id, { atacando: false, deQuemEstaEsquerda: false, facing: -1, idade: 10 });
    expect(g2.chamadas.some(([n, ...a]) => n === 'scale' && a[0] === -1)).toBe(true);
    const desenho = g1.chamadas.find(([n]) => n === 'drawImage') as unknown[];
    expect(desenho.slice(2, 6)).toEqual([10, 20, 100, 200]);
    // encostada na base e cabendo no painel
    expect(Number(desenho[7]) + Number(desenho[9])).toBe(0);
    expect(Number(desenho[9])).toBeLessThanOrEqual(ALTURA_DO_PAINEL);
  });
});

describe('V2-3d: os 33 filmes tocam contra o motor de verdade e o último quadro bate com ele', () => {
  const todos = todosOsFilmes();
  for (const { id, ficha, golpe, filme } of todos) {
    const rot = `${id}${ficha ? `/${ficha}` : ''} ${golpe}`;
    it(rot, () => {
      const real = acharFilme(id, ficha, golpe, filme.danoPorNivel !== undefined);
      const { g, ev } = real;
      const defensor = g.fighters[ev.defensor];
      const atacante = g.fighters[ev.atacante];
      for (const variante of ['completa', 'curta', 'pulado'] as const) {
        const f = new FilmeDoEspecial();
        const modo: ModoFilme = variante === 'curta' ? 'curta' : 'completa';
        const roteiro = iniciar(f, real, modo);
        const ctx = gravador().ctx;
        let ultima: ReturnType<FilmeDoEspecial['vista']> | null = null;
        let ticks = 0;
        let alturaMaxDaBarra = 0;
        for (; ticks < 300; ticks++) {
          const v = f.vista(g, elenco);
          f.desenhar(ctx, v, elenco);
          ultima = v;
          alturaMaxDaBarra = Math.max(alturaMaxDaBarra, v.fighters[ev.defensor].hp);
          if (variante === 'pulado' && ticks === TICKS_PARA_PULAR - 1) expect(f.pular(), 'não pula antes do tick 10').toBe(false);
          if (variante === 'pulado' && ticks === TICKS_PARA_PULAR) expect(f.pular()).toBe(true);
          f.avancar();
          if (!f.ativo) break;
        }
        expect(f.ativo, `${rot} ${variante}: o filme fecha`).toBe(false);
        const duracao = duracaoDoFilme(roteiro, modo);
        if (variante === 'pulado') expect(ticks + 1).toBeLessThanOrEqual(TICKS_PARA_PULAR + TICKS_DA_SAIDA_AO_PULAR);
        else expect(ticks + 1, `${rot} ${variante}`).toBe(duracao);
        const v = ultima as NonNullable<typeof ultima>;
        // posições: o último quadro = `depois` do evento (<= 1 px) = o estado do motor
        for (const [quem, depois, motor] of [
          [ev.atacante, ev.depois.atacante, atacante],
          [ev.defensor, ev.depois.defensor, defensor],
        ] as const) {
          const fv = v.fighters[quem];
          expect(Math.abs(fv.x - depois.x), `${rot} ${variante} x de ${quem}`).toBeLessThanOrEqual(1);
          expect(Math.abs(fv.y - depois.y), `${rot} ${variante} y de ${quem}`).toBeLessThanOrEqual(1);
          expect(fv.facing, `${rot} ${variante} facing de ${quem}`).toBe(depois.facing);
          expect(Math.abs(fv.x - motor.x)).toBeLessThanOrEqual(1);
          expect(fv.pose.name, `${rot} ${variante}: o último quadro tem a pose do motor`).toBe(motor.pose.name);
        }
        // HUD: a barra termina em hp do motor, nunca acima da de antes, e a soma dos números é o dano
        expect(v.fighters[ev.defensor].hp, `${rot} ${variante} hp`).toBeCloseTo(defensor.hp, 9);
        expect(alturaMaxDaBarra).toBeLessThanOrEqual(real.antes.hp + 1e-9);
        expect(f.somaMostrada, `${rot} ${variante}: soma dos números`).toBe(Math.round(ev.dano));
        expect(f.danosMostrados).toBeGreaterThan(0);
        expect(v.cam.z).toBeCloseTo(g.cam.z, 9);
      }
    });
  }
});
