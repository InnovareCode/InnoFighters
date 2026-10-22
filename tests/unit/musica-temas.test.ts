import { describe, expect, it } from 'vitest';
import { compilarTema } from '../../src/audio/partitura';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { duracaoDoLacoS, exigirTemasValidos, semitonsDoGrau, TEMAS, validarTema, validarTemas, VALSA_ZENON, type IdTema, type TabelaDeTemas, type TemaDef } from '../../src/data/musica';
import { partituraDoLegado, type PartituraMedida } from '../support/musica-medida';
import { chamadasDoLaco, partituraMedidaDoTema } from '../support/musica-tema';
import { distanciasBrutas, distinto, normalizar, TAU_MUSICA } from '../support/regua-musica';
import { renderizarChamadas } from '../support/render-musica';

/*
 * T2: os 9 temas em dados (o ZENON mantém a valsa de hoje). Validação no carregamento, os fatos da spec §3.4 (escala, compasso, andamento, laço),
 * a coerência com a origem, o laço sem emenda e a PROVA DE DISTINÇÃO da spec §3.7: os 45 pares entre os 10 lutadores e os 20 contra o legado
 * (`fight`, `menu`), todos com 2 de 3 dimensões >= 1,0 e D >= 1,2, com os limiares CONGELADOS na T0 (tests/support/regua-musica.ts).
 */
const LISTA = Object.entries(TEMAS).filter((e): e is [IdTema, TemaDef] => e[1] !== 'chefe');
const tema = (id: IdTema): TemaDef => TEMAS[id] as TemaDef;

describe('validação no carregamento', () => {
  it('a tabela cobre os 10 lutadores, o ZENON é a valsa e nenhum erro de validação', () => {
    expect(Object.keys(TEMAS).sort()).toEqual([...IDS_LUTADORES].sort());
    expect(TEMAS.zenon).toBe('chefe');
    expect(validarTemas(TEMAS)).toEqual([]);
    expect(() => exigirTemasValidos(TEMAS)).not.toThrow();
  });
  it('lutador sem tema, tema inventado e ZENON trocado não passam', () => {
    const { hayato: _h, ...resto } = TEMAS;
    expect(validarTemas(resto as unknown as TabelaDeTemas).join('\n')).toMatch(/hayato: lutador sem tema musical/);
    expect(validarTemas({ ...TEMAS, fantasma: TEMAS.hayato } as unknown as TabelaDeTemas).join('\n')).toMatch(/fantasma: não é um lutador/);
    expect(validarTemas({ ...TEMAS, zenon: TEMAS.hayato } as unknown as TabelaDeTemas).join('\n')).toMatch(/zenon: o tema do ZENON é a valsa/);
    expect(validarTemas({ ...TEMAS, caio: 'chefe' } as unknown as TabelaDeTemas).join('\n')).toMatch(/só o ZENON usa a valsa/);
    expect(() => exigirTemasValidos(resto as unknown as TabelaDeTemas)).toThrow(/temas musicais inválidos/);
  });
  it('escala ou tônica repetida (inclusive a da valsa) não passa', () => {
    const iguala = { ...TEMAS, caio: { ...tema('caio'), escala: tema('hayato').escala } } as unknown as TabelaDeTemas;
    expect(validarTemas(iguala).join('\n')).toMatch(/caio: a escala \{0,1,5,7,8\} é a mesma de hayato/);
    const tonica = { ...TEMAS, caio: { ...tema('caio'), tonica: tema('hayato').tonica + 12 } } as unknown as TabelaDeTemas;
    expect(validarTemas(tonica).join('\n')).toMatch(/caio: a tônica .* é a mesma de hayato/);
    const valsa = { ...TEMAS, caio: { ...tema('caio'), escala: [...VALSA_ZENON.escala] } } as unknown as TabelaDeTemas;
    expect(validarTemas(valsa).join('\n')).toMatch(/é a mesma de zenon/);
  });
  it('compasso com token errado, forma incompleta, laço fora de 10-21 s, swing sem colcheias e laço que não fecha são recusados', () => {
    const h = tema('hayato');
    const erros = (t: TemaDef): string => validarTema('x', t).join('\n');
    expect(erros({ ...h, lead: { ...h.lead, compassos: { ...h.lead.compassos, a: '3 . 2 3 | 4 . 3 2 | 1 . 0 .' } } })).toMatch(/compasso 'a' do lead: notação inválida/);
    expect(erros({ ...h, lead: { ...h.lead, forma: h.lead.forma.slice(0, 7) } })).toMatch(/forma com 7 compassos/);
    expect(erros({ ...h, lead: { ...h.lead, forma: [...h.lead.forma.slice(0, 7), 'z'] } })).toMatch(/usa o compasso 'z' que não existe/);
    expect(erros({ ...h, bpm: 60 })).toMatch(/laço de .* s fora de 10-21 s/);
    expect(erros({ ...h, swing: 0.6 })).toMatch(/swing só com 2 passos por pulso/);
    expect(erros({ ...h, harmonia: [0, 9] })).toMatch(/raiz 9 fora da escala/);
    expect(erros({ ...h, baixo: { ...h.baixo, padroes: ['0 . .'] } })).toMatch(/baixo\.padroes\[0\]/);
    expect(erros({ ...h, perc: [{ instrumento: h.perc[0]!.instrumento, padroes: '3.....2.3.......x' }] })).toMatch(/perc\[0\]\.padroes/);
    expect(erros({ ...h, fase2: { ...h.fase2, andamento: 1 } })).toMatch(/andamento da fase 2/);
    // o laço não fecha: a última nota do lead pula 13 st até a primeira
    const abertoNoFim = { ...h, lead: { ...h.lead, compassos: { ...h.lead.compassos, g: '4 . . . | 1 . 0 . | 2 . 1 . | 9 . . .' } } };
    expect(erros(abertoNoFim)).toMatch(/o laço não fecha sem emenda/);
    // instrumento fora dos limites
    expect(erros({ ...h, baixo: { ...h.baixo, instrumento: [{ k: 'T', tipo: 'sine', vol: 0.9, t: 0.1 }] } })).toMatch(/vol 0.9 fora de/);
  });
});

describe('os fatos da spec §3.4 (laço, compasso, andamento, escala)', () => {
  // [passos por compasso, passos por pulso, bpm, compassos, laço em s (spec)]. MIN-JI: a spec tinha 108 bpm (17,8 s); está em 120 (16,0 s), ver o handoff.
  const SPEC: Record<IdTema, readonly [number, number, number, number, number]> = {
    hayato: [16, 4, 144, 8, 13.3],
    'wei-long': [16, 4, 100, 8, 19.2],
    'min-ji': [12, 3, 120, 8, 16.0],
    caio: [8, 4, 132, 16, 14.5],
    aminu: [12, 6, 116, 16, 16.6],
    centella: [12, 6, 92, 16, 20.9],
    camille: [8, 2, 192, 16, 20.0],
    nila: [10, 2, 300, 16, 16.0],
    baatar: [8, 4, 120, 16, 16.0],
  };
  const ESCALAS: Record<IdTema, readonly number[]> = {
    hayato: [0, 1, 5, 7, 8],
    'wei-long': [0, 2, 4, 7, 9],
    'min-ji': [0, 3, 5, 7, 10],
    caio: [0, 2, 4, 5, 7, 9, 10],
    aminu: [0, 2, 3, 5, 7, 10],
    centella: [0, 2, 4, 5, 7, 9, 11],
    camille: [0, 2, 3, 5, 7, 8, 11],
    nila: [0, 3, 5, 8, 10],
    baatar: [0, 2, 5, 7, 10],
  };
  const TONICA_PC: Record<IdTema, number> = { hayato: 4, 'wei-long': 5, 'min-ji': 9, caio: 7, aminu: 10, centella: 0, camille: 11, nila: 6, baatar: 3 };
  it.each(LISTA)('%s: compasso, andamento, laço de 10 a 21 s, escala e tônica', (id, def) => {
    const [passos, ppp, bpm, compassos, laco] = SPEC[id];
    expect(def.compasso.passos).toBe(passos);
    expect(def.compasso.passosPorPulso).toBe(ppp);
    expect(def.bpm).toBe(bpm);
    expect(def.compassos).toBe(compassos);
    expect(duracaoDoLacoS(def)).toBeCloseTo(laco, 1);
    expect(duracaoDoLacoS(def)).toBeGreaterThanOrEqual(10);
    expect(duracaoDoLacoS(def)).toBeLessThanOrEqual(21);
    expect(def.escala).toEqual(ESCALAS[id]);
    expect(def.tonica % 12).toBe(TONICA_PC[id]);
  });
  it('os conjuntos de notas e as tônicas são todos diferentes, também da valsa do ZENON', () => {
    const escalas = new Set([...LISTA.map(([, d]) => d.escala.join(',')), VALSA_ZENON.escala.join(',')]);
    const tonicas = new Set([...LISTA.map(([, d]) => d.tonica % 12), VALSA_ZENON.tonicaPc]);
    expect(escalas.size).toBe(10);
    expect(tonicas.size).toBe(10);
  });
  it.each(LISTA)('%s: toda nota do lead, do baixo e da voz paralela está na escala do tema (por construção)', (_id, def) => {
    const t = compilarTema(def);
    const pcs = new Set(def.escala.map((s) => (((def.tonica + s) % 12) + 12) % 12));
    for (const variante of [0, 1, 2]) {
      for (const cs of t.tabela[variante]?.[0] ?? []) {
        for (const c of cs) {
          if (c.nota === undefined) continue;
          expect(pcs.has(((c.nota % 12) + 12) % 12), `nota ${c.nota}`).toBe(true);
        }
      }
    }
    expect(semitonsDoGrau(def.escala, 0)).toBe(0);
  });
});

describe('instrumentação coerente com a origem', () => {
  const camadas = (def: TemaDef, onde: 'lead' | 'baixo' | 'perc' | 'fase2') => {
    if (onde === 'lead') return [...def.lead.instrumento, ...(def.lead.impar?.instrumento ?? []), ...(def.lead.paralela?.instrumento ?? [])];
    if (onde === 'baixo') return [...def.baixo.instrumento, ...(def.acorde?.instrumento ?? [])];
    if (onde === 'perc') return def.perc.flatMap((p) => [...p.instrumento]);
    return [...def.fase2.perc.flatMap((p) => [...p.instrumento]), ...def.fase2.contracanto.instrumento];
  };
  it('BAATAR: a única voz (V) do jogo é o khöömei, com o formante extra a 1400 Hz, 1 nota a cada 2 compassos, e o galope de 3 ataques', () => {
    const b = tema('baatar');
    const vozes = LISTA.flatMap(([id, d]) => [...camadas(d, 'lead'), ...camadas(d, 'baixo'), ...camadas(d, 'perc'), ...camadas(d, 'fase2')].filter((c) => c.k === 'V').map(() => id));
    expect(new Set(vozes)).toEqual(new Set(['baatar']));
    const v = camadas(b, 'baixo').find((c) => c.k === 'V');
    expect(v?.k === 'V' && v.extra?.f).toBe(1400);
    const t = compilarTema(b);
    const porCompasso = Array.from({ length: 16 }, (_, c) => Array.from({ length: 8 }, (_, p) => partituraDoPasso(t, c * 8 + p)).flat().filter((x) => x.k === 'V').length);
    expect(porCompasso.filter((n) => n === 1)).toHaveLength(8);
    expect(porCompasso.filter((n) => n === 0)).toHaveLength(8);
    const galope = (b.perc[0]?.padroes as string).replace(/\s/g, '');
    expect([...galope].map((c, i) => (c === '.' ? -1 : i)).filter((i) => i >= 0)).toEqual([0, 2, 3, 4, 6, 7]);
  });
  it('CAMILLE: swing manouche 0,62 sem bumbo na fase 1; la pompe nos tempos 2 e 4', () => {
    const c = tema('camille');
    expect(c.swing).toBe(0.62);
    const graves = camadas(c, 'perc').filter((x) => x.k === 'T' && (x.f0 ?? 999) < 200);
    expect(graves).toHaveLength(0);
    expect((c.acorde?.padroes as string).replace(/\s/g, '')).toBe('..x...x.');
    expect(camadas(c, 'fase2').some((x) => x.k === 'T' && (x.f0 ?? 999) < 200)).toBe(true); // o bumbo só entra na fase 2
  });
  it('NILA: 5/8 khanda chapu (2+3) a 10 passos, bordão sa-pa (tônica e quinta) e gamaka (deslize de 1 st)', () => {
    const n = tema('nila');
    expect(n.compasso).toEqual({ passos: 10, passosPorPulso: 2, pulsos: [5] });
    expect(n.acorde?.semitons).toEqual([0, 7]);
    expect(n.lead.instrumento.some((x) => x.k === 'T' && x.deslize === 1)).toBe(true);
    expect((n.lead.compassos['a'] as string).split('|').map((g) => g.trim().split(/\s+/).length)).toEqual([4, 6]);
  });
  it('AMINU: o kalangu (tambor falante) cai uma quinta em 120 ms; a algaita chama e o kalangu responde (o lead cala onde o kalangu bate)', () => {
    const a = tema('aminu');
    const kalangu = a.perc.flatMap((p) => p.instrumento).find((x) => x.k === 'T' && x.f1 !== undefined && x.f0 === 220);
    expect(kalangu?.k === 'T' && (kalangu.f1 as number) / (kalangu.f0 as number)).toBeCloseTo(Math.pow(2, -7 / 12), 2);
    expect(a.compasso).toEqual({ passos: 12, passosPorPulso: 6, pulsos: [2] });
    const t = compilarTema(a);
    // nos compassos de resposta (lead só na 1ª metade) o passo 8 tem o kalangu e nenhuma nota do lead
    const passo8 = Array.from({ length: 16 }, (_, c) => partituraDoPasso(t, c * 12 + 8));
    expect(passo8.some((cs) => cs.every((x) => x.pista !== 'lead') && cs.some((x) => x.pista === 'perc'))).toBe(true);
  });
  it('CENTELLA: sesquiáltera (6/8 e 3/4 alternados, 12 passos), trompetes em terças e palmas; HAYATO: shamisen e hyoshigi em 4 e 12; CAIO: berimbau e agogô', () => {
    const c = tema('centella');
    expect(c.compasso.pulsos).toEqual([2, 3]);
    expect(c.lead.paralela?.graus).toBe(-2);
    expect(Array.isArray(c.baixo.padroes) && c.baixo.padroes.length).toBe(2);
    const h = tema('hayato');
    const hyoshigi = (h.perc[2]?.padroes as string).replace(/\s/g, '');
    expect([...hyoshigi].map((x, i) => (x === '.' ? -1 : i)).filter((i) => i >= 0)).toEqual([4, 12]);
    const caio = tema('caio');
    expect(caio.lead.instrumento.some((x) => x.k === 'T' && x.tipo === 'sine')).toBe(true);
    expect(caio.perc.some((p) => p.instrumento.some((x) => x.k === 'T' && (x.f0 ?? 0) >= 1400 && (x.f0 ?? 0) <= 2100))).toBe(true);
  });
});

function partituraDoPasso(t: ReturnType<typeof compilarTema>, passo: number) {
  return t.tabela[2]?.[0]?.[passo] ?? [];
}

describe('laço sem emenda', () => {
  /** Energia (dB) de uma janela de 200 ms centrada em `t` s. */
  const janela = (x: Float32Array, t: number): number => {
    const sr = 22050;
    const a = Math.max(0, Math.round((t - 0.1) * sr));
    const b = Math.min(x.length, Math.round((t + 0.1) * sr));
    let e = 0;
    for (let i = a; i < b; i++) e += (x[i] as number) ** 2;
    return 10 * Math.log10(e / Math.max(1, b - a) + 1e-12);
  };
  it.each(LISTA)('%s: a última nota do lead cai a <= 7 st da primeira, e a emenda entre dois laços não é buraco nem pancada (a energia está dentro da dos limites internos de compasso)', (id, def) => {
    const lacoS = duracaoDoLacoS(def);
    const um = partituraMedidaDoTema(def, id, 1);
    const dois = partituraMedidaDoTema(def, id, 2);
    // dois laços encadeados: o 2º começa onde o 1º termina
    const cs = [...chamadasDoLaco(um), ...chamadasDoLaco(dois).map((c) => ({ ...c, quando: (c.quando ?? 0) + lacoS }))];
    const x = renderizarChamadas(cs, 2 * lacoS + 0.6);
    const barra = lacoS / def.compassos;
    const internos = Array.from({ length: def.compassos * 2 - 1 }, (_, i) => janela(x, (i + 1) * barra)).filter((_, i) => i + 1 !== def.compassos);
    const emenda = janela(x, lacoS);
    console.log(`emenda ${id}: ${emenda.toFixed(1)} dB; limites internos ${Math.min(...internos).toFixed(1)}..${Math.max(...internos).toFixed(1)} dB`);
    expect(emenda).toBeGreaterThanOrEqual(Math.min(...internos) - 3);
    expect(emenda).toBeLessThanOrEqual(Math.max(...internos) + 3);
    // as notas do lead de uma ponta e da outra
    const seq = um.porPasso.flatMap((c) => c.filter((y) => y.nota !== undefined).map((y) => y.nota as number));
    expect(Math.abs((seq[seq.length - 1] as number) - (seq[0] as number))).toBeLessThanOrEqual(7 + 12 * 0); // mesmo laço (ímpar) e mesma oitava
  });
});

describe('prova de distinção (spec §3.7), com a régua congelada na T0', () => {
  const legado = { fight: partituraDoLegado('fight'), menu: partituraDoLegado('menu'), chefe: partituraDoLegado('chefe') };
  const todos: PartituraMedida[] = (IDS_LUTADORES as readonly string[]).map((id) => {
    const t = TEMAS[id as keyof typeof TEMAS];
    return t === 'chefe' ? { ...legado.chefe, nome: id } : partituraMedidaDoTema(t, id);
  });
  const linhas: { a: string; b: string; d: ReturnType<typeof distanciasBrutas>; n: ReturnType<typeof normalizar> }[] = [];
  for (let i = 0; i < todos.length; i++) {
    for (let j = i + 1; j < todos.length; j++) {
      const d = distanciasBrutas(todos[i] as PartituraMedida, todos[j] as PartituraMedida);
      linhas.push({ a: (todos[i] as PartituraMedida).nome, b: (todos[j] as PartituraMedida).nome, d, n: normalizar(d, TAU_MUSICA) });
    }
  }
  const noLegado: typeof linhas = [];
  for (const p of todos) {
    for (const l of [legado.fight, legado.menu]) {
      const d = distanciasBrutas(p, l);
      noLegado.push({ a: p.nome, b: l.nome, d, n: normalizar(d, TAU_MUSICA) });
    }
  }

  it('45 pares entre os 10 lutadores: 2 de 3 dimensões >= 1,0 e D >= 1,2 (imprime a matriz e o par mais próximo)', () => {
    expect(linhas).toHaveLength(45);
    const nomes = todos.map((p) => p.nome);
    const cab = nomes.map((n) => n.slice(0, 5).padStart(6)).join('');
    const mat = nomes.map((a, i) => `${a.padEnd(9)}${nomes.map((b, j) => (i === j ? '     -' : (linhas.find((l) => (l.a === a && l.b === b) || (l.a === b && l.b === a))?.n.D.toFixed(1) ?? '?').padStart(6))).join('')}`);
    console.log(`D normalizada (45 pares)\n         ${cab}\n${mat.join('\n')}`);
    const pior = [...linhas].sort((x, y) => x.n.D - y.n.D).slice(0, 5);
    for (const l of pior) console.log(`par próximo ${l.a} x ${l.b}: dM ${l.n.dM.toFixed(2)} dR ${l.n.dR.toFixed(2)} dT ${l.n.dT.toFixed(2)} D ${l.n.D.toFixed(2)} (${l.n.dimensoesAcima} de 3 >= 1,0)`);
    console.log(`mínimo por dimensão: dM ${Math.min(...linhas.map((l) => l.n.dM)).toFixed(2)} dR ${Math.min(...linhas.map((l) => l.n.dR)).toFixed(2)} dT ${Math.min(...linhas.map((l) => l.n.dT)).toFixed(2)}; D mínimo ${Math.min(...linhas.map((l) => l.n.D)).toFixed(2)}; menos de 3 dimensões >= 1,0 em ${linhas.filter((l) => l.n.dimensoesAcima < 3).length} pares`);
    for (const l of linhas) {
      expect(l.n.dimensoesAcima, `${l.a} x ${l.b}`).toBeGreaterThanOrEqual(2);
      expect(l.n.D, `${l.a} x ${l.b}`).toBeGreaterThanOrEqual(1.2);
      expect(distinto(l.n), `${l.a} x ${l.b}`).toBe(true);
    }
  });
  it('20 pares dos 10 lutadores contra a `fight` e contra o `menu`', () => {
    expect(noLegado).toHaveLength(20);
    const pior = [...noLegado].sort((x, y) => x.n.D - y.n.D).slice(0, 4);
    for (const l of pior) console.log(`legado ${l.a} x ${l.b}: dM ${l.n.dM.toFixed(2)} dR ${l.n.dR.toFixed(2)} dT ${l.n.dT.toFixed(2)} D ${l.n.D.toFixed(2)} (${l.n.dimensoesAcima} de 3)`);
    for (const l of noLegado) {
      expect(l.n.dimensoesAcima, `${l.a} x ${l.b}`).toBeGreaterThanOrEqual(2);
      expect(l.n.D, `${l.a} x ${l.b}`).toBeGreaterThanOrEqual(1.2);
    }
  });
  it('o ZENON (a valsa de hoje) é o legado `chefe`: contra si mesmo é 0, e o tema novo mais próximo dele passa', () => {
    const z = todos[IDS_LUTADORES.indexOf('zenon')] as PartituraMedida;
    expect(distanciasBrutas(z, z)).toEqual({ dM: 0, dR: 0, dT: 0 });
    const dele = linhas.filter((l) => l.a === 'zenon' || l.b === 'zenon');
    expect(dele).toHaveLength(9);
  });
  it('a medida enxerga um tema como ele mesmo transposto e na oitava de cima (controle dos próprios temas): dM = 0', () => {
    const a = partituraMedidaDoTema(tema('caio'), 'caio');
    const t = compilarTema({ ...tema('caio'), tonica: tema('caio').tonica + 5 });
    expect(t.passosTotais).toBe(128);
    const b = partituraMedidaDoTema({ ...tema('caio'), tonica: tema('caio').tonica + 5 }, 'caio+5');
    expect(distanciasBrutas(a, b).dM).toBe(0);
    expect(distanciasBrutas(a, b).dT).toBeLessThan(0.4 * TAU_MUSICA.dT);
    const par = partituraMedidaDoTema(tema('caio'), 'caio-par', 2);
    const impar = partituraMedidaDoTema(tema('caio'), 'caio-impar', 1);
    expect(distanciasBrutas(par, impar).dM).toBe(0); // o laço ímpar sobe uma oitava: os intervalos são os mesmos
  });
});
