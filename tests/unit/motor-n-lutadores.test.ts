import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CORPO_PADRAO } from '../../src/core/constantes';
import { INPUT_VAZIO, type EstiloProjetil, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { CENARIOS } from '../../src/data/cenarios';
import { CAIO, LUTADORES, ROSTER } from '../../src/data/lutadores';
import { montarLutador, type LutadorMontado } from '../../src/data/montar';
import type { EstiloProjetilDef } from '../../src/data/tipos';
import { Game, type FonteEntradas } from '../../src/fight/game';
import { montarTodos } from './_lutadores';

/** E1a: o motor aceita N lutadores (corpo, sem idPrototipo, vida zerada, desempate por barras) sem mudar o comportamento. */
const base = montarTodos();
const SEM_ENTRADA: FonteEntradas = { p1: () => ({ ...INPUT_VAZIO }), p2: () => ({ ...INPUT_VAZIO }) };
const AJUSTES = { rounds: 2, time: 99, shake: true };

function luta(lutadores: Record<IdLutador, LutadorMontado>, cfg: Partial<Parameters<Game['setup']>[0]> = {}): Game {
  const g = new Game({ lutadores, rng: criarRng(9) });
  g.setup({ mode: 'versus', c1: 'hayato', c2: 'caio', ...cfg }, { ...AJUSTES });
  return g;
}

describe('corpo (empurrão entre lutadores)', () => {
  it('default 39 em todos: a distância mínima continua 78', () => {
    expect(CORPO_PADRAO).toBe(39);
    for (const id of ROSTER) expect(base[id].corpo).toBe(39);
    const g = luta(base);
    g.p1.x = 400;
    g.p2.x = 410;
    g.update(SEM_ENTRADA);
    expect(Math.abs(g.p2.x - g.p1.x)).toBeCloseTo(78, 9);
  });

  it('corpo maior afasta mais (soma dos dois corpos)', () => {
    const grande: LutadorMontado = { ...base.hayato, corpo: 60 };
    const g = luta({ ...base, hayato: grande });
    g.p1.x = 400;
    g.p2.x = 410;
    g.update(SEM_ENTRADA);
    expect(Math.abs(g.p2.x - g.p1.x)).toBeCloseTo(60 + 39, 9);
  });

  it('LutadorDef.corpo sobrescreve o default na montagem', () => {
    const poses = manifestoParaPoses(
      JSON.parse(readFileSync(fileURLToPath(new URL('../../public/assets/lutadores/caio/atlas.json', import.meta.url)), 'utf8')) as ManifestoAtlas,
    );
    expect(montarLutador({ ...CAIO, corpo: 55 }, poses).corpo).toBe(55);
  });
});

describe('lutador sem idPrototipo roda no motor', () => {
  it('CPU x CPU de 1500 ticks sem erro', () => {
    const { idPrototipo, ...semProto } = CAIO;
    void idPrototipo;
    const poses = manifestoParaPoses(
      JSON.parse(readFileSync(fileURLToPath(new URL('../../public/assets/lutadores/caio/atlas.json', import.meta.url)), 'utf8')) as ManifestoAtlas,
    );
    const novo = montarLutador(semProto, poses);
    expect(novo.idPrototipo).toBeUndefined();
    const g = luta({ ...base, caio: novo }, { mode: 'cpu', c1: 'caio', c2: 'hayato', cpu: 2, p1cpu: 2 });
    for (let i = 0; i < 1500; i++) g.update(SEM_ENTRADA);
    expect(g.tick).toBeGreaterThan(1000);
  });
});

describe('resolverVidaZerada', () => {
  it('vida > 0: nada acontece', () => {
    const g = luta(base);
    g.p2.hp = 5;
    expect(g.resolverVidaZerada(g.p2, g.p1)).toBe(false);
    expect(g.p2.state).not.toBe('ko');
  });
  it('vida <= 0 fora do treino: KO (fase ko, estado ko, evento)', () => {
    const g = luta(base);
    g.update(SEM_ENTRADA);
    g.p2.hp = 0;
    expect(g.resolverVidaZerada(g.p2, g.p1)).toBe(true);
    expect(g.phase).toBe('ko');
    expect(g.p2.state).toBe('ko');
    g.update(SEM_ENTRADA); // eventos emitidos fora de update() entram no próximo tick
    expect(g.events.some((e) => e.tipo === 'ko' && e.defensor === 1)).toBe(true);
  });
  it('treino nunca mata: vida volta a 1', () => {
    const g = luta(base, { mode: 'training' });
    g.p2.hp = -3;
    expect(g.resolverVidaZerada(g.p2, g.p1)).toBe(false);
    expect(g.p2.hp).toBe(1);
    expect(g.phase).not.toBe('ko');
  });
});

describe('desempate por tempo com soma de barras', () => {
  function fimPorTempo(ajusta: (g: Game) => void): Game {
    const g = luta(base);
    g.timeMax = 1;
    g.timeLeft = 1;
    ajusta(g);
    for (let i = 0; i < 400 && g.phase !== 'roundend' && g.phase !== 'matchend'; i++) g.update(SEM_ENTRADA);
    return g;
  }
  it('1 barra: quem tem mais hp vence (comportamento atual)', () => {
    expect(fimPorTempo((g) => (g.p2.hp = 40)).winner).toBe(0);
    expect(fimPorTempo((g) => (g.p1.hp = 40)).winner).toBe(1);
    expect(fimPorTempo((g) => (g.p1.hp = g.p2.hp)).winner).toBeNull();
  });
  it('com 2 barras, hp baixo na barra final ainda vence quem tem mais vida somada', () => {
    const g = fimPorTempo((x) => {
      x.p1.barras = 2;
      x.p1.hp = 10; // vidaTotal = 10 + maxHp
      x.p2.hp = 60;
    });
    expect(g.p1.vidaTotal).toBe(10 + g.p1.maxHp);
    expect(g.winner).toBe(0);
  });
});

describe('cenários e estilos', () => {
  it('toda casa de cenário é um lutador e o lutador aponta de volta para o cenário', () => {
    for (const c of Object.values(CENARIOS)) {
      expect(LUTADORES[c.casa], c.id).toBeDefined();
      expect(LUTADORES[c.casa].stage).toBe(c.id);
    }
  });
  it('estilos de projétil: uma definição só (contratos.ts); data/tipos é alias', () => {
    const e: EstiloProjetilDef = 'boomerang';
    const mesmo: EstiloProjetil = e;
    expect(mesmo).toBe('boomerang');
  });
});
