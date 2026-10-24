import { describe, expect, it } from 'vitest';
import { criarContadorRitmo, MOTIVOS_RITMO, motivoDoTick, registrarTickDeRitmo, type EstadoParaRitmo, type MotivoRitmo } from '../../src/ui/cenas/ritmo-contador';

const base: EstadoParaRitmo = {
  entradaChefeAtiva: false,
  provocacaoBloqueando: false,
  filmeAtivo: false,
  tarjaBloqueando: false,
  tarjaDoSuper: false,
  fase: 'fight',
  hitstop: 0,
};

describe('motivoDoTick (R-1, §5.2.1): classificação pura, mutuamente exclusiva', () => {
  it('jogável: fase fight, sem hitstop, nada bloqueando', () => {
    expect(motivoDoTick(base)).toBe('jogavel');
  });

  it('hitstop: fase fight com hitstop > 0', () => {
    expect(motivoDoTick({ ...base, hitstop: 4 })).toBe('hitstop');
  });

  it('as fases do motor (intro, ko, timeover -> ko, roundend, matchend, cena-chefe) vencem o hitstop', () => {
    expect(motivoDoTick({ ...base, fase: 'intro', hitstop: 3 })).toBe('intro');
    expect(motivoDoTick({ ...base, fase: 'ko', hitstop: 3 })).toBe('ko');
    expect(motivoDoTick({ ...base, fase: 'timeover', hitstop: 3 })).toBe('ko'); // mesma espera de 100 ticks do KO (game.ts)
    expect(motivoDoTick({ ...base, fase: 'roundend' })).toBe('roundend');
    expect(motivoDoTick({ ...base, fase: 'matchend' })).toBe('matchend');
    expect(motivoDoTick({ ...base, fase: 'cena-chefe' })).toBe('cena-chefe');
  });

  it('idle (nunca deveria ocorrer depois do 1º setup): cai no mesmo balde de fight/hitstop, não quebra', () => {
    expect(motivoDoTick({ ...base, fase: 'idle' })).toBe('jogavel');
    expect(motivoDoTick({ ...base, fase: 'idle', hitstop: 1 })).toBe('hitstop');
  });

  it('a tarja (congelando) vence a fase do motor; sem o flag de super, é sempre `tarja`', () => {
    expect(motivoDoTick({ ...base, fase: 'intro', tarjaBloqueando: true })).toBe('tarja');
    expect(motivoDoTick({ ...base, tarjaBloqueando: true, tarjaDoSuper: true })).toBe('flash-super');
  });

  it('a tarja SEM bloquear (R-2 ligado) não aparece aqui: o motivo vem só da fase/hitstop', () => {
    expect(motivoDoTick({ ...base, tarjaBloqueando: false, fase: 'fight', hitstop: 0 })).toBe('jogavel');
  });

  it('a ordem de prioridade é a mesma do `CenaFight.update()`: entrada > provocação > filme > tarja > fase/hitstop', () => {
    expect(motivoDoTick({ ...base, entradaChefeAtiva: true, provocacaoBloqueando: true, filmeAtivo: true, tarjaBloqueando: true })).toBe('entrada-chefe');
    expect(motivoDoTick({ ...base, provocacaoBloqueando: true, filmeAtivo: true, tarjaBloqueando: true })).toBe('provocacao');
    expect(motivoDoTick({ ...base, filmeAtivo: true, tarjaBloqueando: true })).toBe('filme');
  });
});

describe('o contador (`criarContadorRitmo`/`registrarTickDeRitmo`): soma dos motivos = total', () => {
  it('nasce zerado, com TODOS os motivos presentes (soma = 0)', () => {
    const c = criarContadorRitmo();
    expect(c.total).toBe(0);
    expect(Object.keys(c.porMotivo).sort()).toEqual([...MOTIVOS_RITMO].sort());
    expect(Object.values(c.porMotivo).reduce((a, b) => a + b, 0)).toBe(0);
  });

  it('cada tick registrado soma 1 no motivo e no total; a soma dos motivos nunca passa do total', () => {
    const c = criarContadorRitmo();
    const sequencia: MotivoRitmo[] = ['intro', 'intro', 'jogavel', 'jogavel', 'jogavel', 'hitstop', 'tarja', 'provocacao', 'ko', 'roundend', 'matchend'];
    for (const m of sequencia) registrarTickDeRitmo(c, m);
    expect(c.total).toBe(sequencia.length);
    expect(Object.values(c.porMotivo).reduce((a, b) => a + b, 0)).toBe(c.total);
    expect(c.porMotivo.intro).toBe(2);
    expect(c.porMotivo.jogavel).toBe(3);
    expect(c.porMotivo.hitstop).toBe(1);
  });

  it('uma luta simulada tick a tick (motivoDoTick -> registrarTickDeRitmo): a soma dos motivos é exatamente o nº de ticks simulados', () => {
    const c = criarContadorRitmo();
    const estados: EstadoParaRitmo[] = [
      ...Array.from({ length: 90 }, () => ({ ...base, fase: 'intro' as const })), // intro (round 1)
      ...Array.from({ length: 5 }, () => ({ ...base, fase: 'fight' as const })), // jogável
      { ...base, fase: 'fight', tarjaBloqueando: true }, // especial comum, flag OFF: congela
      ...Array.from({ length: 3 }, () => ({ ...base, fase: 'fight' as const, hitstop: 6 })), // hitstop do acerto
      ...Array.from({ length: 60 }, () => ({ ...base, fase: 'ko' as const })), // KO
      ...Array.from({ length: 90 }, () => ({ ...base, fase: 'roundend' as const })), // fim de round
    ];
    for (const e of estados) registrarTickDeRitmo(c, motivoDoTick(e));
    expect(c.total).toBe(estados.length);
    expect(Object.values(c.porMotivo).reduce((a, b) => a + b, 0)).toBe(estados.length);
    expect(c.porMotivo.intro).toBe(90);
    expect(c.porMotivo.jogavel).toBe(5);
    expect(c.porMotivo.tarja).toBe(1);
    expect(c.porMotivo.hitstop).toBe(3);
    expect(c.porMotivo.ko).toBe(60);
    expect(c.porMotivo.roundend).toBe(90);
  });
});
