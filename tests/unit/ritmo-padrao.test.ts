import { describe, expect, it } from 'vitest';
import { NOMES_RITMO, REGRAS_PADRAO, regrasComRitmo, RITMO_TUDO_LIGADO, ritmoDaUrl } from '../../src/meta';

/*
 * R-1/R-2 (docs/spec-redesenho-jogabilidade.md §4): `Regras.ritmo`, ao contrário de `Regras.motorV2` (V2-6, sempre ligado), nasce
 * DESLIGADO por padrão (cada onda vai para produção desligada; só o dono liga por `?ritmo=1` depois de jogar). Molde igual a
 * `motorV2DaUrl`/`motor-v2-padrao.test.ts`, com essa única diferença de padrão.
 */

const TUDO = { tarja: true, provocacao: true, intervalos: true, filmeRestrito: true, super: true, cadeia: true, cpu: true, impacto: true };

describe('ritmo: DESLIGADO por padrão (ao contrário do motor v2)', () => {
  it('REGRAS_PADRAO não traz `ritmo` (ausente = o jogo de hoje)', () => {
    expect(REGRAS_PADRAO.ritmo).toBeUndefined();
  });

  it('RITMO_TUDO_LIGADO tem as 8 flags do contrato (§4) e está congelado', () => {
    expect(RITMO_TUDO_LIGADO).toEqual(TUDO);
    expect(Object.isFrozen(RITMO_TUDO_LIGADO)).toBe(true);
  });

  it('NOMES_RITMO cobre as 8 flags, com `filmerestrito` (minúsculo, sem camelCase) para a URL', () => {
    expect(Object.keys(NOMES_RITMO).sort()).toEqual(['cadeia', 'cpu', 'filmerestrito', 'impacto', 'intervalos', 'provocacao', 'super', 'tarja'].sort());
    expect(NOMES_RITMO['filmerestrito']).toBe('filmeRestrito');
  });
});

describe('ritmoDaUrl: o kill switch e o A/B (?ritmo=)', () => {
  it('ausente = {} (nada ligado, o jogo de hoje) — ao contrário de motorV2DaUrl, que liga tudo por padrão', () => {
    for (const busca of ['', '?x=1', '?expansao=4']) expect(ritmoDaUrl(busca)).toEqual({});
  });

  it('1, on, true, sim, ou a chave presente mas vazia (?ritmo=) = tudo ligado (a prévia completa do dono)', () => {
    // `?ritmo=` (chave PRESENTE, valor vazio) é diferente de AUSENTE: como em motorV2DaUrl, vazio cai no mesmo branch de "1"
    for (const busca of ['?ritmo=1', '?ritmo=on', '?ritmo=true', '?ritmo=sim', '?ritmo=']) expect(ritmoDaUrl(busca)).toEqual(TUDO);
  });

  it('0, off, false, nao desligam tudo — explícito, igual ao ausente', () => {
    for (const busca of ['?ritmo=0', '?ritmo=off', '?ritmo=false', '?ritmo=nao', '?ritmo=OFF', '?expansao=4&ritmo=0']) expect(ritmoDaUrl(busca)).toEqual({});
  });

  it('uma lista liga SÓ aquelas (A/B de uma mecânica), em qualquer ordem', () => {
    expect(ritmoDaUrl('?ritmo=tarja')).toEqual({ tarja: true });
    expect(ritmoDaUrl('?ritmo=provocacao,tarja')).toEqual({ tarja: true, provocacao: true });
    expect(ritmoDaUrl('?ritmo= tarja , provocacao ')).toEqual({ tarja: true, provocacao: true });
  });

  it('valor desconhecido ou lista com nome errado NÃO liga nada por engano (ao contrário do motor v2, aqui cai em {} — nunca liga por acidente de digitação)', () => {
    for (const busca of ['?ritmo=talvez', '?ritmo=tarja,xyz', '?ritmo=,', '?ritmo=__proto__', '?ritmo=constructor']) expect(ritmoDaUrl(busca)).toEqual({});
  });

  it('devolve uma cópia: mexer no resultado não estraga RITMO_TUDO_LIGADO', () => {
    const r = ritmoDaUrl('?ritmo=1');
    r.tarja = false;
    expect(RITMO_TUDO_LIGADO.tarja).toBe(true);
    expect(ritmoDaUrl('?ritmo=1')).toEqual(TUDO);
  });
});

describe('regrasComRitmo: resolve `Regras.ritmo` pela URL em cima de qualquer base', () => {
  it('sem `?ritmo=`, a base fica com `ritmo: {}` (idêntico, na prática, a ausente — nenhuma flag true)', () => {
    const r = regrasComRitmo(REGRAS_PADRAO, '');
    expect(r.ritmo).toEqual({});
    expect(r).not.toBe(REGRAS_PADRAO); // não muta a entrada
  });

  it('`?ritmo=tarja` liga só a tarja, preservando o resto da base (motorV2 etc.)', () => {
    const r = regrasComRitmo(REGRAS_PADRAO, '?ritmo=tarja');
    expect(r.ritmo).toEqual({ tarja: true });
    expect(r.motorV2).toEqual(REGRAS_PADRAO.motorV2); // o resto da base não muda
  });

  it('`?ritmo=0` desliga tudo explicitamente (rollback)', () => {
    expect(regrasComRitmo(REGRAS_PADRAO, '?ritmo=0').ritmo).toEqual({});
  });
});
