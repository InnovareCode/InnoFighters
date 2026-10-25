import { describe, expect, it } from 'vitest';
import { NOMES_RITMO, REGRAS_PADRAO, regrasComRitmo, RITMO_PADRAO, RITMO_TUDO_LIGADO, ritmoDaUrl } from '../../src/meta';

/*
 * R-1/R-2/R-6/R-7/R-10 (docs/spec-redesenho-jogabilidade.md §4): o dono jogou com `?ritmo=1`, aprovou, e tarja, provocação, intervalos e
 * filmeRestrito viraram PADRÃO (24/10/2026); no mesmo dia, por ordem dele, super e cpu entraram também (sob a prova final da Íris). Molde igual a
 * `Regras.motorV2` (V2-6, sempre ligado). A cadeia por força (R-8) entrou no padrão com o R-12; o impacto ainda não existe no motor e segue fora. `?ritmo=0` é o rollback TOTAL.
 */

const TUDO = { tarja: true, provocacao: true, intervalos: true, filmeRestrito: true, super: true, cadeia: true, cpu: true, impacto: true };
const PADRAO = { tarja: true, provocacao: true, intervalos: true, filmeRestrito: true, super: true, cadeia: true, cpu: true };

describe('ritmo: 7 flags ligadas por padrão (tarja, provocação, intervalos, filmeRestrito, super, cadeia, cpu); o impacto ainda não existe no motor', () => {
  it('RITMO_PADRAO tem só as 7 e está congelado (sem impacto)', () => {
    expect(RITMO_PADRAO).toEqual(PADRAO);
    expect(RITMO_PADRAO.cadeia).toBe(true);
    expect(RITMO_PADRAO.impacto).toBeUndefined();
    expect(Object.isFrozen(RITMO_PADRAO)).toBe(true);
  });

  it('REGRAS_PADRAO traz `ritmo: RITMO_PADRAO` (não as 8 de RITMO_TUDO_LIGADO, nem ausente)', () => {
    expect(REGRAS_PADRAO.ritmo).toEqual(PADRAO);
    expect(REGRAS_PADRAO.ritmo).not.toEqual(TUDO);
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
  it('ausente = RITMO_PADRAO (as 7) — ao contrário de "nada ligado"', () => {
    for (const busca of ['', '?x=1', '?expansao=4']) expect(ritmoDaUrl(busca)).toEqual(PADRAO);
  });

  it('1, on, true, sim, ou a chave presente mas vazia (?ritmo=) = tudo ligado (a prévia completa, inclusive o não provado)', () => {
    // `?ritmo=` (chave PRESENTE, valor vazio) é diferente de AUSENTE: como em motorV2DaUrl, vazio cai no mesmo branch de "1"
    for (const busca of ['?ritmo=1', '?ritmo=on', '?ritmo=true', '?ritmo=sim', '?ritmo=']) expect(ritmoDaUrl(busca)).toEqual(TUDO);
  });

  it('0, off, false, nao desligam TUDO — rollback total, inclusive as 4 já aprovadas', () => {
    for (const busca of ['?ritmo=0', '?ritmo=off', '?ritmo=false', '?ritmo=nao', '?ritmo=OFF', '?expansao=4&ritmo=0']) expect(ritmoDaUrl(busca)).toEqual({});
  });

  it('uma lista liga SÓ aquelas (A/B de uma mecânica), em qualquer ordem — substitui o padrão inteiro, não soma a ele', () => {
    expect(ritmoDaUrl('?ritmo=tarja')).toEqual({ tarja: true });
    expect(ritmoDaUrl('?ritmo=super')).toEqual({ super: true }); // A/B de uma flag ainda não provada: só ela, nada mais
    expect(ritmoDaUrl('?ritmo=provocacao,tarja')).toEqual({ tarja: true, provocacao: true });
    expect(ritmoDaUrl('?ritmo= tarja , provocacao ')).toEqual({ tarja: true, provocacao: true });
  });

  it('valor desconhecido ou lista com nome errado cai no PADRÃO (não liga o que não foi provado, mas também não desliga o que já é produção)', () => {
    for (const busca of ['?ritmo=talvez', '?ritmo=tarja,xyz', '?ritmo=,', '?ritmo=__proto__', '?ritmo=constructor']) expect(ritmoDaUrl(busca)).toEqual(PADRAO);
  });

  it('devolve uma cópia: mexer no resultado não estraga RITMO_TUDO_LIGADO nem RITMO_PADRAO', () => {
    const r = ritmoDaUrl('?ritmo=1');
    r.tarja = false;
    expect(RITMO_TUDO_LIGADO.tarja).toBe(true);
    expect(ritmoDaUrl('?ritmo=1')).toEqual(TUDO);
    const p = ritmoDaUrl('');
    p.tarja = false;
    expect(RITMO_PADRAO.tarja).toBe(true);
    expect(ritmoDaUrl('')).toEqual(PADRAO);
  });
});

describe('regrasComRitmo: resolve `Regras.ritmo` pela URL em cima de qualquer base', () => {
  it('sem `?ritmo=`, a base fica com `ritmo: RITMO_PADRAO`', () => {
    const r = regrasComRitmo(REGRAS_PADRAO, '');
    expect(r.ritmo).toEqual(PADRAO);
    expect(r).not.toBe(REGRAS_PADRAO); // não muta a entrada
  });

  it('`?ritmo=tarja` liga só a tarja (substitui o padrão, não soma), preservando o resto da base (motorV2 etc.)', () => {
    const r = regrasComRitmo(REGRAS_PADRAO, '?ritmo=tarja');
    expect(r.ritmo).toEqual({ tarja: true });
    expect(r.motorV2).toEqual(REGRAS_PADRAO.motorV2); // o resto da base não muda
  });

  it('`?ritmo=0` desliga tudo explicitamente (rollback total)', () => {
    expect(regrasComRitmo(REGRAS_PADRAO, '?ritmo=0').ritmo).toEqual({});
  });
});
