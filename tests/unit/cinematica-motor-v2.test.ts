import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { cfgMotorV2, MOTOR_V2_PADRAO, REGRAS_PADRAO, regrasComMotorV2, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { DURACAO_COMPLETA } from '../../src/render/cinematica';
import type { Mundo } from '../../src/ui/contexto';
import type { CenaFight } from '../../src/ui/cenas/fight';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { navegadorFalso, arteFalsa } from './_ui';

/*
 * Causa raiz investigada (pedido do Atlas, 2026-10-24): o dono não viu a TARJA de apresentação do especial no HEAD publicado. `cena-luta-cinematica.test.ts`
 * (a suíte "oficial" da cinemática) e `tests/e2e/cinematica.spec.ts` (os 28 especiais) nunca passam `motorV2` no `cfg` — o motor v2 inteiro (filmes, entrada no
 * hitstop, combos), que a V2-6 deixou SEMPRE ligado em produção (`MOTOR_V2_PADRAO`, `src/meta/regras.ts`), nunca entra nesses testes. Era um buraco de
 * cobertura real: uma regressão na interação cine x filme (`src/ui/cenas/fight.ts`) ou uma flag sobrescrita por engano em `cfgMotorV2`/`regrasComMotorV2`
 * passaria batida. Testado manualmente (dev server + build de produção, treino e CPU, entrada lateral e baixo): a tarja aparece e completa as 48 ticks. Este
 * arquivo fecha o buraco: o MESMO cfg que `select.ts`/`diff.ts`/`campanha.ts` produzem de verdade (via `cfgMotorV2`), com a cinemática inteira.
 */
const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

function montar(opts: { c1?: IdLutador; c2?: IdLutador; mode?: 'versus' | 'training' | 'cpu'; regras?: Regras } = {}) {
  // R-9: esta suíte testa a Cinematica (que CONGELA) de verdade; `ritmo.tarja` (ligado por padrão em REGRAS_PADRAO desde a aprovação do
  // dono) trocaria a tarja pela FaixaRitmo (que NÃO congela) — fora do escopo deste arquivo (ver cinematica-motor-v2 vs faixa-ritmo).
  const regras = opts.regras ?? { ...REGRAS_PADRAO, ritmo: {} };
  const n = navegadorFalso({ provocacoes: 'desligadas' } as Partial<Configuracoes>, regras);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  (n.c as { entrada: unknown }).entrada = {
    lerP1: () => ({ ...frames.p1 }),
    lerP2: () => ({ ...frames.p2 }),
    lerMesclado: () => ({ ...frames.p1 }),
    fimDoTick: () => undefined,
  };
  const game = new Game({ lutadores: prod, rng: criarRng(5) });
  const mundo = {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: arteFalsa(),
    game,
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
  n.ui.pronto(mundo);
  // o MESMO cfg que select.ts/diff.ts/campanha.ts geram de verdade (nunca na mão): cfgMotorV2(regras) injeta o motorV2 inteiro, ligado por padrão.
  const cfg = { mode: opts.mode ?? 'versus', c1: opts.c1 ?? 'hayato', c2: opts.c2 ?? 'caio', cpu: opts.mode === 'cpu' ? 0 : null, esquiva: regras.esquiva, ...cfgMotorV2(regras) };
  n.ui.set('fight', { cfg });
  const cena = n.ui.scene as unknown as CenaFight;
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  const ateLutar = (): void => {
    for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
    for (let i = 0; i < 5; i++) update();
  };
  const soltarEspecial = (golpe: 'sFire' | 'sDown' = 'sFire', pertoDoRival = false): EventoLuta[] => {
    game.p1.en = 100;
    game.p1.x = pertoDoRival ? 460 : 200;
    game.p2.x = pertoDoRival ? 540 : 800;
    game.p1.facing = 1;
    game.p2.facing = -1;
    frames.p1 = golpe === 'sDown' ? { ...INPUT_VAZIO, down: true, sp: true } : { ...INPUT_VAZIO, sp: true };
    update();
    frames.p1 = { ...INPUT_VAZIO };
    return [...game.events];
  };
  return { ...n, game, cena, cfg, frames, update, ateLutar, soltarEspecial };
}

describe('tarja do especial COM o motor v2 ligado de verdade (cfgMotorV2, como select.ts/diff.ts entregam)', () => {
  it('o cfg desta suíte realmente tem o motor v2 inteiro ligado (filmes, entrada no hitstop, combos) — senão o teste não prova nada', () => {
    const t = montar();
    expect(t.cfg.motorV2).toEqual(MOTOR_V2_PADRAO);
    expect(t.cfg.motorV2).toEqual({ entradaNoHitstop: true, filmes: true, combos: true });
  });

  it('entrada LATERAL (hayato sFire, a maioria dos especiais): a cinemática abre e roda as 48 ticks da COMPLETA com filmes+combos+entrada no hitstop ligados', () => {
    const t = montar();
    t.ateLutar();
    const ev = t.soltarEspecial('sFire');
    expect(ev.some((e) => e.tipo === 'special')).toBe(true);
    expect(t.cena.cine.ativa, 'a cinemática abriu').toBe(true);
    expect(t.cena.cine.estado?.modo).toBe('completa');
    const tick = t.game.tick;
    for (let i = 0; i < DURACAO_COMPLETA; i++) {
      expect(t.cena.cine.ativa, `update ${i + 1}: a tarja não pode sumir antes da hora`).toBe(true);
      t.update();
      expect(t.game.tick, 'o motor não anda enquanto a tarja roda').toBe(tick);
    }
    expect(t.cena.cine.ativa).toBe(false);
    expect(t.cena.filme.ativo, 'o filme (se vier) só começa DEPOIS da tarja terminar, nunca junto').toBe(false);
  });

  it('a tarja realmente DESENHA algo na tela (não só o estado): o nome do golpe sai em `fillText`, mesmo com o motor v2 ligado', () => {
    const t = montar();
    t.ateLutar();
    t.soltarEspecial('sFire');
    expect(t.cena.cine.ativa).toBe(true);
    t.update(20); // o "pop" do nome do golpe só vem com o quadro em andamento (como o e2e: tick 20)
    t.g.chamadas.length = 0; // só o que o draw() DESTA cena pinta a partir daqui
    t.cena.draw();
    expect(t.g.chamadas.length, 'o draw() da cinemática desenhou alguma coisa').toBeGreaterThan(0);
    expect(t.g.textos(), 'o nome do golpe (RAIJIN-DAN) foi pintado na tarja').toContain('RAIJIN-DAN');
  });

  it('entrada BAIXO (hayato sDown, geometria customizada): a tarja também abre e completa as 48 ticks', () => {
    const t = montar();
    t.ateLutar();
    t.soltarEspecial('sDown');
    expect(t.cena.cine.ativa).toBe(true);
    expect(t.cena.cine.estado).toMatchObject({ modo: 'completa', golpe: 'sDown' });
    let n = 0;
    while (t.cena.cine.ativa && n < DURACAO_COMPLETA + 5) {
      t.update();
      n++;
    }
    expect(n).toBe(DURACAO_COMPLETA);
  });

  it('especial disparado perto do rival (contato possível logo): a tarja ainda roda inteira ANTES do filme do acerto abrir — nunca ao mesmo tempo', () => {
    const t = montar();
    t.ateLutar();
    t.soltarEspecial('sFire', true);
    expect(t.cena.cine.ativa).toBe(true);
    const tick = t.game.tick;
    for (let i = 0; i < DURACAO_COMPLETA; i++) {
      expect(t.cena.cine.ativa || t.cena.filme.ativo, `update ${i + 1}: algo tem que estar segurando a cena`).toBe(true);
      expect(t.cena.cine.ativa && t.cena.filme.ativo, `update ${i + 1}: tarja e filme nunca ao mesmo tempo`).toBe(false);
      t.update();
      expect(t.game.tick, 'o motor não anda enquanto tarja OU filme rodam').toBe(tick);
    }
    expect(t.cena.cine.ativa, 'a tarja já fechou neste ponto (48 ticks correram)').toBe(false);
  });

  it('todo modo que joga de verdade mostra a tarja com o motor v2 ligado: versus, cpu e treino', () => {
    for (const mode of ['versus', 'cpu', 'training'] as const) {
      const t = montar({ mode });
      t.ateLutar();
      t.soltarEspecial('sFire');
      expect(t.cena.cine.ativa, mode).toBe(true);
      expect(t.cena.cine.estado?.modo, mode).toBe('completa');
    }
  });

  it('a flag `cinematica` das regras não é tocada pelo motor v2: regrasComMotorV2/cfgMotorV2 mexem só em `motorV2`', () => {
    expect(REGRAS_PADRAO.cinematica).toBe(true);
    expect(regrasComMotorV2(REGRAS_PADRAO, '').cinematica).toBe(true);
    expect(regrasComMotorV2(REGRAS_PADRAO, '?motorv2=0').cinematica).toBe(true);
    expect(cfgMotorV2(REGRAS_PADRAO)).not.toHaveProperty('cinematica');
  });
});
