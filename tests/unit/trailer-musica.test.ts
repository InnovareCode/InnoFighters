import { describe, expect, it } from 'vitest';
import { compilarArranjo, orcamentoDoArranjo, validarArranjo } from '../../src/audio/abertura';
import { AudioSys } from '../../src/audio/audio-sys';
import { compilarTema, partituraDoPasso } from '../../src/audio/partitura';
import { FONTES_ATIVAS_MAX, FONTES_NOVAS_POR_PASSO_MAX, VOZ_POR_COMPASSO_MAX, VOZ_PASSOS_MINIMOS } from '../../src/audio/temas';
import { criarRng } from '../../src/core/rng';
import { TEMAS, type IdTema, type TemaDef } from '../../src/data/musica';
import { ABERTURA } from '../../src/data/trailer/abertura';
import { DESTAQUE, ROTEIRO } from '../../src/data/trailer/roteiro';
import { arranjoDaAbertura, arranjoDaEstatica, citacaoDaDef, citacaoDaValsa, citacaoDoTema, citacoesDoRoteiro, deslocamentoDaCitacao, extrasDeCitacao, janelasDeCitacao, VALSA_DO_CHEFE } from '../../src/trailer/musica';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { medirMixagem, type MixagemDoLaco } from '../support/espectro';
import { partituraDaSecao } from '../support/musica-abertura';
import { notasDoLead, distanciasBrutas, distinto, normalizar, TAU_MUSICA } from '../support/regua-musica';
import { partituraDoLegado, type TrilhaLegado } from '../support/musica-medida';
import { partituraMedidaDoTema } from '../support/musica-tema';
import { renderizarChamadas } from '../support/render-musica';

/*
 * T3 · a música da abertura (docs/spec-trailer-abertura.md §7.5 e §8 teste 10): arranjo linear de 25 compassos a 150 BPM, citando os 8 primeiros passos do lead do tema de
 * cada lutador, no MESMO orçamento de fontes dos temas, com a régua musical (limiares CONGELADOS na T0) medida fora das janelas de citação, a API aditiva do AudioSys e a
 * mixagem contra a `fight`. A régua foi calibrada com as 3 trilhas de hoje antes de existir qualquer tema (tests/unit/musica-regua.test.ts); nada foi ajustado para a abertura passar.
 */

const LISTA = Object.entries(TEMAS).filter((e): e is [IdTema, TemaDef] => e[1] !== 'chefe');
const TRILHAS: readonly TrilhaLegado[] = ['fight', 'menu', 'chefe'];
const SEM_CITACAO = compilarArranjo(ABERTURA);
const COM = arranjoDaAbertura();

describe('o arranjo (dado)', () => {
  it('é válido: notação, 25 compassos a 150 BPM, 400 passos de 0,1 s = 40 s = 2400 ticks', () => {
    expect(validarArranjo(ABERTURA)).toEqual([]);
    expect(COM.compassos).toBe(25);
    expect(COM.passosTotais).toBe(400);
    expect(COM.passo).toBeCloseTo(0.1, 12);
    expect(COM.compasso).toBeCloseTo(1.6, 12);
    expect(COM.passosTotais * COM.passo * 60).toBeCloseTo(2400, 6);
    expect(ABERTURA.secoes.map((s) => s.compassos)).toEqual([2, 6, 11, 2, 2, 2]);
  });
  it('as seções seguem os atos do trailer: c1-2, c3-8, c9-19, c20-21, c22-23, c24-25', () => {
    let c = 1;
    const faixas = ABERTURA.secoes.map((s) => {
      const f = `${s.nome} c${c}-c${c + s.compassos - 1}`;
      c += s.compassos;
      return f;
    });
    expect(faixas).toEqual(['frio c1-c2', 'quatro c3-c8', 'desafiantes c9-c19', 'montagem c20-c21', 'arconte c22-c23', 'logo c24-c25']);
  });
  it('é determinístico: compilar duas vezes dá as mesmas chamadas', () => {
    expect(JSON.stringify(compilarArranjo(ABERTURA, { extras: extrasDeCitacao(), janelas: janelasDeCitacao() }).tabela)).toBe(JSON.stringify(COM.tabela));
  });
  it('a tônica e a escala não repetem as de nenhum tema nem a da valsa (a abertura tem a identidade dela)', () => {
    const tonicas = new Set([...LISTA.map(([, d]) => d.tonica % 12), 2 /* Ré, a valsa */]);
    expect(tonicas.has(ABERTURA.tonica % 12)).toBe(false);
    expect(LISTA.some(([, d]) => d.escala.join(',') === ABERTURA.escala.join(','))).toBe(false);
  });
  it('a versão estática é o mesmo arranjo cortado em 6 compassos (c1, c2, c8, c13, c21, c24)', () => {
    const e = arranjoDaEstatica();
    expect(e.compassos).toBe(6);
    expect(e.passosTotais).toBe(96);
    const P = COM.passosPorCompasso;
    ROTEIRO.estatica.compassosDaMusica.forEach((bar, i) => {
      expect(JSON.stringify(e.tabela.slice(i * P, (i + 1) * P))).toBe(JSON.stringify(COM.tabela.slice(bar * P, (bar + 1) * P)));
    });
  });
});

describe('a citação do tema de cada lutador', () => {
  it('cai no primeiro compasso do plano em que ele é o destaque (c1, c2 e o ZENON no 2º compasso do P9)', () => {
    expect(citacoesDoRoteiro(ROTEIRO, DESTAQUE).map((c) => [c.lutador, c.compasso, c.passo])).toEqual([
      ['hayato', 2, 0],
      ['wei-long', 3, 0],
      ['min-ji', 5, 0],
      ['caio', 6, 0],
      ['aminu', 8, 0],
      ['centella', 10, 0],
      ['camille', 13, 0],
      ['nila', 15, 0],
      ['baatar', 17, 0],
      ['zenon', 22, 8],
    ]);
  });
  it.each(LISTA)('%s: 8 passos, notas do lead transpostas (os intervalos se mantêm), no registro alto e na grade de 0,1 s', (id, def) => {
    const cit = citacaoDoTema(id);
    expect(cit).toHaveLength(8);
    const t = compilarTema(def);
    const escala = 0.1 / (t.passo[0] as number);
    const semi = deslocamentoDaCitacao(def.tonica, ABERTURA.tonica);
    let notas = 0;
    for (let p = 0; p < 8; p++) {
      const orig = partituraDoPasso(t, p, 2, 1).filter((c) => c.pista === 'lead');
      expect(cit[p]).toHaveLength(orig.length);
      orig.forEach((o, i) => {
        const c = (cit[p] as readonly typeof o[])[i] as typeof o;
        expect(c.pista).toBe('lead');
        expect(c.t).toBeCloseTo(o.t * escala, 9);
        if (o.nota !== undefined) {
          notas++;
          expect((((c.nota as number) - o.nota - semi) % 12 + 12) % 12, `${id} passo ${p}`).toBe(0);
          expect(c.nota).toBeGreaterThanOrEqual(62);
          expect(c.nota).toBeLessThanOrEqual(86);
        }
      });
    }
    expect(notas, `${id}: a citação precisa ter notas`).toBeGreaterThanOrEqual(3);
  });
  it('a citação sai do dado: mudar a primeira nota do lead do tema muda a citação', () => {
    const h = TEMAS.hayato as TemaDef;
    const outro: TemaDef = { ...h, lead: { ...h.lead, compassos: { ...h.lead.compassos, a: '5 . 2 3 | 4 . 3 2 | 1 . 0 . | 0 . . .' } } };
    const antes = JSON.stringify(citacaoDoTema('hayato'));
    expect(JSON.stringify(citacaoDaDef(outro))).not.toBe(antes);
    expect(JSON.stringify(citacaoDaDef(h))).toBe(antes);
  });
  it('a valsa do ZENON: as 3 primeiras notas do cravo da trilha `chefe` de hoje (74, 70, 69 nos passos 0, 4 e 6), transpostas', () => {
    const chefe = partituraDoLegado('chefe');
    expect(notasDoLead(chefe).slice(0, 3)).toEqual(VALSA_DO_CHEFE.map((n) => n.nota));
    const passosComNota = chefe.porPasso.map((cs, i) => (cs.some((c) => c.nota !== undefined) ? i : -1)).filter((i) => i >= 0);
    expect(passosComNota.slice(0, 3)).toEqual(VALSA_DO_CHEFE.map((n) => n.passo));
    const v = citacaoDaValsa();
    expect(v).toHaveLength(8);
    expect(v.map((cs, i) => (cs.length ? i : -1)).filter((i) => i >= 0)).toEqual([0, 4, 6]);
    // o cravo são 2 camadas por nota (a segunda desafinada): conta a 1ª de cada passo
    const notas = v.filter((cs) => cs.length).map((cs) => (cs[0] as { nota?: number }).nota as number);
    expect(notas).toHaveLength(3);
    // Ré, Si bemol, Lá viram C#, A, G# (a tônica da valsa vai para a da abertura)
    expect(notas.map((n) => ((n % 12) + 12) % 12)).toEqual([1, 9, 8]);
  });
  it('nos 8 passos de uma citação o lead do ARRANJO cala: só o tema do lutador fala (e fora deles o lead do arranjo toca)', () => {
    const P = SEM_CITACAO.passosPorCompasso;
    for (const c of citacoesDoRoteiro(ROTEIRO, DESTAQUE)) {
      const esperado = c.lutador === 'zenon' ? citacaoDaValsa() : citacaoDoTema(c.lutador as IdTema);
      for (let p = 0; p < 8; p++) {
        const abs = c.compasso * P + c.passo + p;
        const lead = (COM.tabela[abs] ?? []).filter((x) => x.pista === 'lead');
        expect(lead, `${c.lutador}: passo ${abs}`).toEqual([...(esperado[p] ?? [])]);
      }
    }
    // fora das janelas o arranjo tem lead (a abertura não fica muda de melodia)
    const janelas = janelasDeCitacao();
    const emJanela = (i: number): boolean => janelas.some(([de, ate]) => i >= de && i < ate);
    const leadsFora = COM.tabela.filter((cs, i) => !emJanela(i) && cs.some((x) => x.pista === 'lead')).length;
    expect(leadsFora).toBeGreaterThan(100);
  });
  it('cada citação está de fato na música montada: os passos têm as chamadas do tema', () => {
    const P = COM.passosPorCompasso;
    for (const c of citacoesDoRoteiro(ROTEIRO, DESTAQUE)) {
      const esperado = c.lutador === 'zenon' ? citacaoDaValsa() : citacaoDoTema(c.lutador as IdTema);
      esperado.forEach((cs, i) => {
        const abs = c.compasso * P + c.passo + i;
        for (const x of cs) expect(COM.tabela[abs]).toContainEqual(x);
      });
    }
  });
});

describe('orçamento de fontes (o mesmo dos temas)', () => {
  it.each([
    ['abertura completa', COM],
    ['versão estática', arranjoDaEstatica()],
  ] as const)('%s: <= 8 fontes novas por passo, <= 15 ativas, voz <= 1 por compasso e >= 4 passos', (_n, a) => {
    const o = orcamentoDoArranjo(a);
    console.log(`orçamento ${_n}: ${o.porPasso} novas/passo (passo ${o.passoDoPico}; máx. ${FONTES_NOVAS_POR_PASSO_MAX}), ${o.ativas} ativas (máx. ${FONTES_ATIVAS_MAX}), ${o.vozesPorCompasso} vozes/compasso`);
    expect(o.porPasso).toBeLessThanOrEqual(FONTES_NOVAS_POR_PASSO_MAX);
    expect(o.ativas).toBeLessThanOrEqual(FONTES_ATIVAS_MAX);
    expect(o.vozesPorCompasso).toBeLessThanOrEqual(VOZ_POR_COMPASSO_MAX);
    if (o.vozesPorCompasso > 0) expect(o.vozMaisCurta).toBeGreaterThanOrEqual(VOZ_PASSOS_MINIMOS);
  });
});

describe('régua musical: fora das janelas de citação a abertura é distante de cada um dos 9 temas e das 3 trilhas (limiares CONGELADOS na T0)', () => {
  const secoes = ABERTURA.secoes.map((s, i) => ({ nome: s.nome, p: partituraDaSecao(ABERTURA, i, SEM_CITACAO) }));
  const referencias = [
    ...LISTA.map(([id, def]) => ({ nome: id, p: partituraMedidaDoTema(def, id) })),
    ...TRILHAS.map((t) => ({ nome: t, p: partituraDoLegado(t) })),
  ];
  const fmt = (n: ReturnType<typeof normalizar>): string => `dM ${n.dM.toFixed(2)} dR ${n.dR.toFixed(2)} dT ${n.dT.toFixed(2)} D ${n.D.toFixed(2)}`;

  it.each(secoes.map((s) => [s.nome, s.p] as const))('seção %s: 2 de 3 dimensões >= 1,0 e D >= 1,2 contra os 12', (nome, p) => {
    const ruins: string[] = [];
    const linhas: string[] = [];
    for (const r of referencias) {
      const n = normalizar(distanciasBrutas(p, r.p), TAU_MUSICA);
      linhas.push(`${r.nome}: ${fmt(n)}${distinto(n) ? '' : '  <-- NÃO distinta'}`);
      if (!distinto(n)) ruins.push(`${r.nome} (${fmt(n)})`);
    }
    if (process.env['TRAILER_DIAG']) console.log(`régua ${nome}:\n  ${linhas.join('\n  ')}`);
    expect(ruins, `seção ${nome}`).toEqual([]);
  }, 180_000);
});

describe('mixagem contra a `fight` (RMS, voz, grave, pico)', () => {
  const fight = medirMixagem(renderizarChamadas(partituraDoLegado('fight').porPasso.flat(), 6.4 + 0.6));
  const GANHOS_DO_BUS = 0.45 * 0.9;
  const picoBus = (m: MixagemDoLaco): number => m.pico / GANHOS_DO_BUS;
  const secao = (i: number): MixagemDoLaco => {
    const barra0 = ABERTURA.secoes.slice(0, i).reduce((s, x) => s + x.compassos, 0);
    const n = (ABERTURA.secoes[i] as { compassos: number }).compassos;
    const t0 = barra0 * COM.compasso;
    const chamadas = COM.tabela.flatMap((cs, k) => cs.map((c) => ({ ...c, quando: k * COM.passo + (c.quando ?? 0) })));
    return medirMixagem(renderizarChamadas(chamadas.filter((c) => (c.quando ?? 0) >= t0 && (c.quando ?? 0) < t0 + n * COM.compasso), n * COM.compasso + 0.6, t0));
  };
  it.each(ABERTURA.secoes.map((s, i) => [s.nome, i] as const))('seção %s: RMS <= +1,5 dB da `fight`, voz <= +1 dB, grave <= +2 dB, pico abaixo do da `fight`', (nome, i) => {
    const m = secao(i);
    const rms = m.rmsDb - fight.rmsDb;
    const voz = m.vozDb - fight.vozDb;
    const grave = m.graveDb - fight.graveDb;
    console.log(`mix ${nome}: RMS ${rms >= 0 ? '+' : ''}${rms.toFixed(2)} dB, voz ${voz >= 0 ? '+' : ''}${voz.toFixed(1)}, grave ${grave >= 0 ? '+' : ''}${grave.toFixed(1)}, pico ${picoBus(m).toFixed(2)} (fight ${picoBus(fight).toFixed(2)})`);
    expect(rms).toBeLessThanOrEqual(1.5);
    expect(voz).toBeLessThanOrEqual(1);
    expect(grave).toBeLessThanOrEqual(nome === 'logo' ? 4 : 2); // o impacto da logo é o único momento em que o grave pode passar um pouco
    expect(picoBus(m)).toBeLessThan(picoBus(fight));
    if (['quatro', 'desafiantes', 'montagem'].includes(nome)) expect(rms).toBeGreaterThanOrEqual(-3); // os atos de ação não ficam fracos
  }, 120_000);
});

describe('AudioSys: tocarAbertura / posicaoDaAbertura / pararAbertura (API aditiva)', () => {
  function criar(estado: string = 'running') {
    const ctx = new Contexto(22050);
    ctx.state = estado;
    let tick: (() => void) | null = null;
    let limpou = 0;
    const audio = new AudioSys({
      criarContexto: () => comoAudioContext(ctx),
      rng: criarRng(5),
      setInterval: (fn) => {
        tick = fn;
        return 1;
      },
      clearInterval: () => void limpou++,
    });
    audio.init();
    return { ctx, audio, tick: () => (tick as (() => void) | null)?.(), limpou: () => limpou };
  }

  it('contexto que não está `running` (iOS antes do gesto, modo atrair com áudio suspenso): devolve false e não agenda nada', () => {
    const { ctx, audio } = criar('suspended');
    const nos = ctx.nos.length;
    expect(audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM })).toBe(false);
    expect(ctx.nos.length).toBe(nos);
    expect(audio.posicaoDaAbertura()).toBeNull();
    expect(() => audio.pararAbertura()).not.toThrow();
  });

  it('sem `init()` (sem contexto) também devolve false', () => {
    const audio = new AudioSys({ criarContexto: () => null });
    expect(audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM })).toBe(false);
    expect(audio.posicaoDaAbertura()).toBeNull();
  });

  it('toca a abertura inteira passo a passo no relógio do contexto e a posição acompanha o AudioContext', () => {
    const { ctx, audio, tick } = criar();
    expect(audio.posicaoDaAbertura()).toBeNull();
    expect(audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM, emSegundos: 0.5 })).toBe(true);
    expect(audio.posicaoDaAbertura()).toBeCloseTo(-0.5, 9);
    ctx.currentTime = 2;
    expect(audio.posicaoDaAbertura()).toBeCloseTo(1.5, 9);
    const fontes0 = ctx.nos.length;
    for (let t = 0; t < 43; t += 0.025) {
      ctx.currentTime = t;
      tick();
    }
    expect(ctx.nos.length).toBeGreaterThan(fontes0);
    // todo o arranjo foi agendado: o 1º ataque do bumbo do c2 (passo 16 + 8) está no tempo certo
    const inicios = ctx.nos.filter((n) => 'inicio' in n && Number.isFinite((n as unknown as { inicio: number }).inicio)).map((n) => (n as unknown as { inicio: number }).inicio);
    expect(Math.max(...inicios)).toBeGreaterThan(38); // o acorde final do c25 (38,4 s + a folga de 0,5 s)
    expect(Math.min(...inicios)).toBeGreaterThanOrEqual(0.5 - 1e-9);
  });

  it('entra no compasso pedido: aPartirDoCompasso 5 com 0,3 s de folga põe o compasso 5 a 0,3 s e a posição em 8,0 - 0,3', () => {
    const { ctx, audio, tick } = criar();
    ctx.currentTime = 10;
    expect(audio.tocarAbertura({ aPartirDoCompasso: 5, arranjo: COM, emSegundos: 0.3 })).toBe(true);
    expect(audio.posicaoDaAbertura()).toBeCloseTo(5 * 1.6 - 0.3, 9);
    const antes = ctx.nos.length;
    ctx.currentTime = 10.2;
    tick();
    const primeiros = ctx.nos.slice(antes).filter((n) => 'inicio' in n).map((n) => (n as unknown as { inicio: number }).inicio);
    expect(Math.min(...primeiros)).toBeGreaterThanOrEqual(10.3 - 1e-9);
  });

  it('os efeitos caem a 60% durante a abertura e voltam ao volume do jogador ao parar; o volume salvo não muda', () => {
    const { audio } = criar();
    const sfx = (audio.sfx as unknown as { gain: { value: number } }).gain;
    audio.setSfxVol(0.8);
    expect(sfx.value).toBeCloseTo(0.8, 9);
    audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM });
    expect(sfx.value).toBeCloseTo(0.8 * 0.6, 9);
    audio.setSfxVol(0.5); // mexer no volume no meio continua valendo os 60%
    expect(sfx.value).toBeCloseTo(0.5 * 0.6, 9);
    expect(audio.sfxVol).toBe(0.5);
    audio.pararAbertura(0.3);
    expect(sfx.value).toBeCloseTo(0.5, 9);
    expect(audio.sfxVol).toBe(0.5);
    expect(audio.posicaoDaAbertura()).toBeNull();
  });

  it('pararAbertura: para o agendador, tira a posição e não lança duas vezes; tocar de novo recomeça do zero', () => {
    const { audio, limpou } = criar();
    audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM });
    audio.pararAbertura(0);
    expect(limpou()).toBeGreaterThan(0);
    expect(() => audio.pararAbertura(0.3)).not.toThrow();
    expect(audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM })).toBe(true);
    expect(audio.posicaoDaAbertura()).not.toBeNull();
  });

  it('para a música de menu ou de luta que estiver tocando (as duas não convivem)', () => {
    const { audio } = criar();
    audio.startMusic('menu');
    expect(audio.musicOn).toBe(true);
    audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM });
    expect(audio.musicOn).toBe(false);
  });

  it('o orçamento vale no agendador de verdade: nenhum passo cria mais de 8 fontes e a música não gasta o teto de 32 dos efeitos', () => {
    const { ctx, audio, tick } = criar();
    audio.tocarAbertura({ aPartirDoCompasso: 0, arranjo: COM, emSegundos: 0 });
    for (let t = 0; t < 42; t += 0.025) {
      ctx.currentTime = t;
      tick();
    }
    expect(audio.fontesAtivas()).toBe(0);
  });
});
