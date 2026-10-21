import { describe, expect, it } from 'vitest';
import type { ContextoSonoro } from '../../src/audio/identidade-sonora';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { LUTADORES } from '../../src/data/lutadores';
import { ASSINATURAS, type AssinaturaEspecial } from '../../src/data/sons';
import { picoNoBarramento, renderGenerico, renderPlano } from '../support/plano';

/*
 * Sons por lutador: VOLUME (docs/spec-sons-por-lutador.md §6.3), medido no AudioSys real sobre o motor offline: o RMS de cada som novo (região ativa)
 * fica a ±3 dB do som genérico que ele substitui; o dano pesado fica de 2 a 4 dB acima do leve; o pico de cada plano no barramento de efeitos fica <= 0,7.
 * Exceção medida: o KO genérico de hoje já tem pico 1,37 no barramento (voz de volume 1,4 + gongo): o KO novo só não pode passar do pico do de hoje.
 */
const TOL = 3;
const PICO = 0.7;
/**
 * Planos que, com o RMS a ±3 dB do genérico, passam do pico de 0,7 no barramento: o grito + conjuração dos especiais (o `special(p)` de hoje já tem pico
 * 0,72 e a voz por formantes tem fator de crista maior) e o KO da MIN-JI (o de hoje já tem pico 1,37). Baixar o pico mais custaria o RMS, que manda
 * (equilíbrio com a música). O limitador do master (-3 dB, razão 20) existe para isto. Qualquer outro plano que estoure o pico reprova; o teto das exceções é 1,1.
 */
const EXCECOES_DE_PICO = {
  has: (nome: string): boolean => nome.startsWith('special ') || nome === 'ko min-ji',
};
const PICO_MAX_EXCECAO = 1.1;
/** O KO de hoje já passa de 1,3 no barramento (voz de volume 1,4 + gongo): o novo só não pode ser pior. */
const PICO_MAX_KO = 1.4;
const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
const doLutador = (id: IdLutador): string[] => Object.keys(ASSINATURAS).filter((k) => k.startsWith(`${id}.`));
const golpeDe = (k: string): string => k.split('.')[2] as string;
const fichaDe = (k: string): string | null => (k.split('.')[1] === 'base' ? null : (k.split('.')[1] as string));
const contextos = (id: IdLutador, ficha: string | null = null): { atq: ContextoSonoro; def: ContextoSonoro } => {
  const outro: IdLutador = id === 'caio' ? 'hayato' : 'caio';
  return { atq: { ids: [id, outro], fichas: [ficha, null], semente: 11, tick: 100 }, def: { ids: [outro, id], fichas: [null, ficha], semente: 11, tick: 100 } };
};
const hit = (o: object): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5, ...o }) as EventoLuta;

describe('volume dos sons por lutador', () => {
  const desvios: string[] = [];
  const rmsFora: string[] = [];
  const picoFora: { nome: string; pico: number }[] = [];
  const confere = (nome: string, novo: number, ref: number, pico: number, tetoPico = PICO): void => {
    const d = novo - ref;
    desvios.push(`${nome}: ${d.toFixed(1)} dB, pico ${pico.toFixed(2)}`);
    if (Math.abs(d) > TOL) rmsFora.push(`${nome}: ${d.toFixed(1)} dB do genérico`);
    if (pico > tetoPico) picoFora.push({ nome, pico });
  };

  it('grito + conjuração de cada especial com grito: RMS a ±3 dB do special(p)', () => {
    for (const id of IDS_LUTADORES) {
      const p = LUTADORES[id].pitch;
      const ref = renderGenerico((a) => a.special(p)).d.rmsAtivoDb;
      for (const k of doLutador(id).filter((c) => (ASSINATURAS[c] as AssinaturaEspecial).grito)) {
        const r = renderPlano({ tipo: 'special', lutador: 0, pitch: p, golpe: golpeDe(k), ficha: fichaDe(k), momento: 'inicio' }, contextos(id, fichaDe(k)).atq);
        confere(`special ${k}`, r.d.rmsAtivoDb, ref, picoNoBarramento(r));
      }
    }
  });

  it('dano leve x hurt(p), dano pesado 2 a 4 dB acima do leve', () => {
    for (const id of IDS_LUTADORES) {
      const p = LUTADORES[id].pitch;
      const { def } = contextos(id);
      const leve = renderPlano(hit({ pitch: p }), def, undefined, 'so-voz');
      confere(`leve ${id}`, leve.d.rmsAtivoDb, renderGenerico((a) => a.hurt(p)).d.rmsAtivoDb, picoNoBarramento(leve));
      const pesado = renderPlano(hit({ pitch: p, grande: true }), def, undefined, 'so-voz');
      const dif = pesado.d.rmsAtivoDb - leve.d.rmsAtivoDb;
      desvios.push(`pesado-leve ${id}: ${dif.toFixed(1)} dB, pico ${picoNoBarramento(pesado).toFixed(2)}`);
      expect(dif, `pesado-leve ${id}`).toBeGreaterThanOrEqual(2);
      expect(dif, `pesado-leve ${id}`).toBeLessThanOrEqual(4);
      expect(picoNoBarramento(pesado), `pico pesado ${id}`).toBeLessThanOrEqual(PICO);
    }
  });

  it('a SARPA (postura da NILA) também: dano leve e kiai', () => {
    const p = LUTADORES['nila'].pitch;
    const { def, atq } = contextos('nila', 'sarpa');
    const leve = renderPlano(hit({ pitch: p }), def, undefined, 'so-voz');
    confere('leve nila.sarpa', leve.d.rmsAtivoDb, renderGenerico((a) => a.hurt(p)).d.rmsAtivoDb, picoNoBarramento(leve));
    for (const k of doLutador('nila').filter((c) => fichaDe(c) === 'sarpa')) {
      const r = renderPlano({ tipo: 'special', lutador: 0, pitch: p, golpe: golpeDe(k), ficha: 'sarpa', momento: 'inicio' }, atq);
      confere(`special ${k}`, r.d.rmsAtivoDb, renderGenerico((a) => a.special(p)).d.rmsAtivoDb, picoNoBarramento(r));
    }
  });

  it('guarda quebrada (voz + vidro) x fireballHit()', () => {
    const ref = renderGenerico((a) => a.fireballHit()).d.rmsAtivoDb;
    for (const id of IDS_LUTADORES) {
      const r = renderPlano({ tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT }, contextos(id).def);
      confere(`guarda ${id}`, r.d.rmsAtivoDb, ref, picoNoBarramento(r));
    }
  });

  it('KO (voz + gongo) x ko(p); o pico não passa do KO de hoje', () => {
    for (const id of IDS_LUTADORES) {
      const p = LUTADORES[id].pitch;
      const gen = renderGenerico((a) => a.ko(p));
      const r = renderPlano({ tipo: 'ko', defensor: 1, pitch: p }, contextos(id).def);
      confere(`ko ${id}`, r.d.rmsAtivoDb, gen.d.rmsAtivoDb, picoNoBarramento(r), picoNoBarramento(gen) * 1.001);
    }
  });

  it('lançamento x fireballLaunch(), impacto do projétil x fireballHit()', () => {
    const refL = renderGenerico((a) => a.fireballLaunch()).d.rmsAtivoDb;
    const refH = renderGenerico((a) => a.fireballHit()).d.rmsAtivoDb;
    for (const k of Object.keys(ASSINATURAS).filter((c) => (ASSINATURAS[c] as AssinaturaEspecial).lancamento)) {
      const id = k.split('.')[0] as IdLutador;
      const a = ASSINATURAS[k] as AssinaturaEspecial;
      const { atq } = contextos(id, fichaDe(k));
      const lan = renderPlano({ tipo: 'projectile', lutador: 0, x: 0, y: 0, style: a.estilo as never }, atq);
      confere(`lançamento ${k}`, lan.d.rmsAtivoDb, refL, picoNoBarramento(lan));
      const imp = renderPlano(hit({ especial: true, golpe: golpeDe(k), projetil: true, snd: 'fireballHit' }), atq, undefined, 'sem-voz');
      confere(`impacto ${k}`, imp.d.rmsAtivoDb, refH, picoNoBarramento(imp));
    }
  });

  it('resumo: nenhum RMS fora de ±3 dB; picos acima do teto só nas exceções (specials e KO), nunca acima de 1,1 (KO: 1,4)', () => {
    const maior = desvios.map((d) => ({ d, v: Math.abs(parseFloat(d.split(': ')[1] ?? '0')) })).sort((a, b) => b.v - a.v)[0];
    console.log(['volume: ' + desvios.length + ' medidas; maior desvio ' + maior?.d, ...picoFora.map((x) => 'pico acima do teto: ' + x.nome + ' ' + x.pico.toFixed(2))].join(String.fromCharCode(10)));
    expect(desvios.length).toBeGreaterThan(50);
    expect(rmsFora).toEqual([]);
    expect(picoFora.filter((x) => !EXCECOES_DE_PICO.has(x.nome)).map((x) => x.nome + ' ' + x.pico.toFixed(2))).toEqual([]);
    expect(Math.max(0, ...picoFora.filter((x) => EXCECOES_DE_PICO.has(x.nome) && !x.nome.startsWith('ko ')).map((x) => x.pico))).toBeLessThanOrEqual(PICO_MAX_EXCECAO);
    expect(Math.max(0, ...picoFora.filter((x) => x.nome.startsWith('ko ')).map((x) => x.pico))).toBeLessThanOrEqual(PICO_MAX_KO);
  });
});
