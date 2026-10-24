import { describe, expect, it } from 'vitest';
import { cfgMotorV2, MOTOR_V2_PADRAO, motorV2DaUrl, REGRAS_PADRAO, regrasComMotorV2 } from '../../src/meta';
import type { Regras } from '../../src/meta';

/*
 * V2-6: o motor v2 (entrada no hitstop, filme do especial, combos próprios) SEMPRE ligado por padrão, com um kill switch por URL só para rollback/A-B.
 * O motor em si (`ConfigPartida.motorV2` ausente) segue o de antes: é o que os testes de fidelidade fixam (tests/unit/_motor-v2.ts).
 */

const TUDO = { entradaNoHitstop: true, filmes: true, combos: true };

describe('motor v2: ligado por padrão (V2-6)', () => {
  it('REGRAS_PADRAO traz as três mecânicas ligadas', () => {
    expect(REGRAS_PADRAO.motorV2).toEqual(TUDO);
    expect(MOTOR_V2_PADRAO).toEqual(TUDO);
  });

  it('o padrão é congelado: ninguém liga/desliga uma flag mutando o objeto compartilhado', () => {
    expect(Object.isFrozen(MOTOR_V2_PADRAO)).toBe(true);
    expect(() => {
      (MOTOR_V2_PADRAO as { filmes: boolean }).filmes = false;
    }).toThrow();
    expect(MOTOR_V2_PADRAO.filmes).toBe(true);
  });

  it('a ConfigPartida das lutas montadas pela UI recebe as três flags', () => {
    expect(cfgMotorV2(REGRAS_PADRAO)).toEqual({ motorV2: TUDO });
  });

  it('sem a chave (regras de teste antigas), a cfg continua idêntica à de antes', () => {
    const { motorV2: _fora, ...semFlag } = REGRAS_PADRAO;
    void semFlag;
    expect(cfgMotorV2({})).toEqual({});
  });
});

describe('motorV2DaUrl: o kill switch', () => {
  it('sem parâmetro (ou vazio, 1, on) = tudo ligado', () => {
    for (const busca of ['', '?x=1', '?motorv2=', '?motorv2=1', '?motorv2=on', '?motorv2=true']) expect(motorV2DaUrl(busca)).toEqual(TUDO);
  });

  it('0, off, false e nao desligam as três (o motor de antes)', () => {
    for (const busca of ['?motorv2=0', '?motorv2=off', '?motorv2=false', '?motorv2=nao', '?motorv2=OFF', '?expansao=4&motorv2=0']) expect(motorV2DaUrl(busca)).toEqual({});
  });

  it('uma lista liga SÓ aquelas (A/B de uma mecânica), em qualquer ordem', () => {
    expect(motorV2DaUrl('?motorv2=filmes')).toEqual({ filmes: true });
    expect(motorV2DaUrl('?motorv2=combos,entrada')).toEqual({ entradaNoHitstop: true, combos: true });
    expect(motorV2DaUrl('?motorv2= filmes , entrada ')).toEqual({ entradaNoHitstop: true, filmes: true });
  });

  it('valor desconhecido ou lista com nome errado NÃO desliga nada por engano: cai no padrão', () => {
    for (const busca of ['?motorv2=talvez', '?motorv2=filmes,xyz', '?motorv2=,', '?motorv2=__proto__', '?motorv2=constructor']) expect(motorV2DaUrl(busca)).toEqual(TUDO);
  });

  it('devolve uma cópia: mexer no resultado não estraga o padrão', () => {
    const m = motorV2DaUrl('');
    m.filmes = false;
    expect(MOTOR_V2_PADRAO.filmes).toBe(true);
    expect(motorV2DaUrl('')).toEqual(TUDO);
  });
});

describe('regrasComMotorV2', () => {
  const { motorV2: _padrao, ...base } = REGRAS_PADRAO;
  const quatro: Regras = { ...base, chefe: null, fila: [], esquiva: false, cinematica: false, temasMusicais: false, trailer: false };

  it('vale para QUALQUER base, inclusive a do ?expansao=4 (sem a chave)', () => {
    expect(regrasComMotorV2(quatro, '').motorV2).toEqual(TUDO);
    expect(cfgMotorV2(regrasComMotorV2(quatro, ''))).toEqual({ motorV2: TUDO });
  });

  it('?motorv2=0 vence o padrão: a cfg volta a ser a de antes (sem a chave motorV2)', () => {
    const r = regrasComMotorV2(REGRAS_PADRAO, '?motorv2=0');
    expect(r.motorV2).toEqual({});
    expect(cfgMotorV2(r)).toEqual({});
  });

  it('não muta a entrada e preserva o resto das regras', () => {
    const antes = JSON.stringify(REGRAS_PADRAO);
    const r = regrasComMotorV2(REGRAS_PADRAO, '?motorv2=0');
    expect(JSON.stringify(REGRAS_PADRAO)).toBe(antes);
    expect({ ...r, motorV2: undefined }).toEqual({ ...REGRAS_PADRAO, motorV2: undefined });
  });
});
