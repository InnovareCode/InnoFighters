import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import type { EventoLuta, IndiceLutador } from '../../src/core/contratos';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { AudioSys, fontesDaVoz, type OpcoesVozFormante } from '../../src/audio/audio-sys';
import { reagirAosEventos, sonsDoEvento } from '../../src/audio/eventos';
import { ASSINATURAS, DADOS_SONS, PERFIS_VOCAIS, exigirSonsValidos, validarSons, type AssinaturaEspecial, type DadosSons, type Grito, type PerfilVocal } from '../../src/data/sons';
import { GONGO_KO, IDENTIDADE_SONORA, planoSonoro, reagirComIdentidade, tocarItem, validarOrcamentoDosSons, variacao, type ContextoSonoro } from '../../src/audio/identidade-sonora';
import { cortarParaOrcamento, fontesDaReceita } from '../../src/audio/orcamento-sonoro';
import { tocarReceita, type ChamadaReceita } from '../../src/audio/receitas';
import { duracaoDoGrito, sintetizarGrito } from '../../src/audio/sintese-voz';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { descrever } from '../support/descritores';
import { renderizar } from '../support/render-som';

/* Sons por lutador, S1 (primitivas): N0 do grafo + dados. Os dados reais ainda não têm gritos nem assinaturas (S2/S3): o plano usa dados sintéticos. */

const VOZ: OpcoesVozFormante = { onda: 'sawtooth', f: [200, 200, 200], t: 0.3, vol: 1, formantes: [730, 1090, 2440], q: 6, ganhoF3: 0.35 };

function sistema(extra: ConstructorParameters<typeof AudioSys>[0] = {}): { audio: AudioSys; ctx: Contexto } {
  const ctx = new Contexto(22050);
  const audio = new AudioSys({ criarContexto: () => comoAudioContext(ctx), rng: criarRng(5), ...extra });
  audio.init();
  return { audio, ctx };
}

describe('vozFormante', () => {
  it('conta as fontes que cria (fontesDaVoz) e soa no tom pedido', () => {
    const cheia: OpcoesVozFormante = { ...VOZ, vib: { hz: 5, prof: 0.02, atraso: 0.05 }, asp: { hz: 40, prof: 0.3 }, sopro: 0.2, coro: { cents: 8, sub: 0.3 } };
    for (const o of [VOZ, cheia, { ...VOZ, sopro: 0.2 }, { ...VOZ, coro: { cents: 8, sub: 0.3 } }]) {
      const { audio, ctx } = sistema();
      const antes = ctx.criados.osc + ctx.criados.fonte; // o init cria o buffer de ruído, mas nenhuma fonte
      audio.vozFormante(o);
      expect(ctx.criados.osc + ctx.criados.fonte - antes).toBe(fontesDaVoz(o));
      expect(audio.fontesAtivas()).toBe(fontesDaVoz(o));
    }
    const r = renderizar((a) => a.vozFormante({ ...VOZ, f: [200, 200, 200], t: 0.4 }));
    const d = descrever(r.amostras);
    expect(d.picoAbs).toBeGreaterThan(0.01);
    expect(d.picoAbs).toBeLessThan(1);
    expect(d.vozeado).toBe(true);
    expect(d.M).toBeGreaterThan(160);
    expect(d.M).toBeLessThan(250);
  });

  it('o barramento de identidade nasce na 1ª chamada, nunca no init()', () => {
    const { audio, ctx } = sistema();
    const ganhos = ctx.criados.ganho;
    expect(audio.barramentoIdentidade()).not.toBeNull();
    expect(ctx.criados.ganho).toBe(ganhos + 1);
    expect(audio.barramentoIdentidade()).toBe(audio.barramentoIdentidade());
  });

  it('o limitador só existe com a opção ligada (o grafo do protótipo fica como está)', () => {
    expect(sistema().ctx.criados.compressor).toBe(0);
    expect(sistema({ limitador: true }).ctx.criados.compressor).toBe(1);
  });

  it('sem contexto de áudio não faz nada', () => {
    const a = new AudioSys({ criarContexto: () => null });
    a.init();
    expect(() => a.vozFormante(VOZ)).not.toThrow();
    expect(a.barramentoIdentidade()).toBeNull();
  });
});

describe('garganta, anti-metralhadora e KO', () => {
  it('a voz nova do mesmo lutador desliga a anterior em ~15 ms; outro lutador não é afetado', () => {
    const { audio, ctx } = sistema();
    const g1 = audio.abrirGarganta(0, 0.5);
    const g2 = audio.abrirGarganta(1, 0.5);
    expect(g1).not.toBeNull();
    expect(g2).not.toBeNull();
    ctx.currentTime = 0.1;
    const g3 = audio.abrirGarganta(0, 0.5);
    expect(g3).not.toBe(g1);
    // a garganta 0 antiga foi silenciada: setTargetAtTime(0, 0.1, 5 ms) -> ~0 aos 20 ms; a do lutador 1 segue 1
    const gain = (g: AudioNode | null): number => ((g as unknown as { gain: { computar(n: number): Float32Array } }).gain.computar(Math.ceil(0.2 * 22050))[Math.floor(0.125 * 22050)] ?? NaN);
    expect(gain(g1)).toBeLessThan(0.02);
    expect(gain(g2)).toBe(1);
  });

  it('enquanto o KO toca nenhuma outra voz daquele lutador entra; depois entra', () => {
    const { audio, ctx } = sistema();
    expect(audio.abrirGarganta(0, 1.0, { ko: true })).not.toBeNull();
    ctx.currentTime = 0.5;
    expect(audio.abrirGarganta(0, 0.2)).toBeNull();
    expect(audio.abrirGarganta(1, 0.2)).not.toBeNull();
    ctx.currentTime = 1.01;
    expect(audio.abrirGarganta(0, 0.2)).not.toBeNull();
  });

  it('voz de dano do mesmo lutador não volta antes de 80 ms', () => {
    const { audio, ctx } = sistema();
    expect(audio.abrirGarganta(0, 0.2, { dano: true })).not.toBeNull();
    ctx.currentTime = 0.05;
    expect(audio.abrirGarganta(0, 0.2, { dano: true })).toBeNull();
    expect(audio.abrirGarganta(0, 0.2)).not.toBeNull(); // grito de especial não é metralhado
    ctx.currentTime = 0.2;
    expect(audio.abrirGarganta(0, 0.2, { dano: true })).not.toBeNull();
  });
});

describe('orçamento de fontes', () => {
  const T = (camada: 'ataque' | 'corpo' | 'cauda' | 'extra', quando = 0): ChamadaReceita => ({ k: 'T', tipo: 'sine', f0: 100 + quando * 1000, t: 0.1, vol: 0.1, quando, camada });
  const V: ChamadaReceita = { k: 'V', ...VOZ, vib: { hz: 5, prof: 0.02, atraso: 0.05 }, asp: { hz: 40, prof: 0.3 }, sopro: 0.2, coro: { cents: 8, sub: 0.3 }, camada: 'corpo' };

  it('corta extra, depois cauda, sopro, coro, aspereza, vibrato e corpo secundário, nessa ordem; nunca o ataque nem a voz', () => {
    const base = [T('ataque'), V, T('corpo', 0.01), T('corpo', 0.02), T('cauda', 0.03), T('extra', 0.04)];
    expect(fontesDaReceita(base)).toBe(1 + 6 + 2 + 1 + 1);
    const sem = (limite: number): ChamadaReceita[] => cortarParaOrcamento(base, limite);
    expect(sem(10)).toHaveLength(5); // só o extra saiu
    expect(sem(9)).toHaveLength(4); // + cauda
    const semSopro = sem(8)[1] as Extract<ChamadaReceita, { k: 'V' }>;
    expect(semSopro.sopro).toBeUndefined();
    expect(semSopro.coro).toBeDefined();
    const semCoro = sem(6)[1] as Extract<ChamadaReceita, { k: 'V' }>;
    expect(semCoro.coro).toBeUndefined();
    expect(semCoro.asp).toBeDefined();
    const minimo = sem(1);
    expect(minimo.filter((c) => c.k === 'V')).toHaveLength(1);
    expect(minimo.filter((c) => c.camada === 'ataque')).toHaveLength(1);
    expect(minimo.filter((c) => c.k === 'T' && c.camada === 'corpo')).toHaveLength(1); // o primeiro corpo fica
    const v = minimo.find((c) => c.k === 'V') as Extract<ChamadaReceita, { k: 'V' }>;
    expect(v.vib ?? v.asp ?? v.sopro ?? v.coro).toBeUndefined();
  });

  it('é determinístico (mesma entrada, mesma saída)', () => {
    const base = [T('ataque'), V, T('corpo', 0.01), T('cauda', 0.03)];
    expect(JSON.stringify(cortarParaOrcamento(base, 4))).toBe(JSON.stringify(cortarParaOrcamento(base, 4)));
  });

  it('tocarItem: sem espaço, só o de prioridade 3 (KO, vitória) toca; os outros cedem', () => {
    const { audio } = sistema();
    audio.registrarFontes(31, 100); // sobra 1 fonte
    const item = (prioridade: 0 | 1 | 2 | 3) => ({ receita: [T('ataque'), T('corpo', 0.01)], prioridade }) as const;
    expect(tocarItem(audio as never, item(1))).toBe(false);
    expect(tocarItem(audio as never, item(2))).toBe(false);
    expect(tocarItem(audio as never, item(3))).toBe(true);
  });

  it('sfx em 0: nenhum nó é criado', () => {
    const { audio, ctx } = sistema();
    audio.setSfxVol(0);
    const n = ctx.nos.length;
    expect(tocarItem(audio as never, { receita: [T('ataque')], prioridade: 3 })).toBe(false);
    expect(ctx.nos.length).toBe(n);
  });
});

describe('variacao: hash sem estado', () => {
  it('mesma entrada = mesmo número, em [0, 1), e cada argumento muda o resultado', () => {
    expect(variacao(7, 100, 0, 0, 0)).toBe(variacao(7, 100, 0, 0, 0));
    const base = variacao(7, 100, 0, 0, 0);
    expect(base).toBeGreaterThanOrEqual(0);
    expect(base).toBeLessThan(1);
    for (const outro of [variacao(8, 100, 0, 0, 0), variacao(7, 101, 0, 0, 0), variacao(7, 100, 1, 0, 0), variacao(7, 100, 0, 1, 0), variacao(7, 100, 0, 0, 1)]) expect(outro).not.toBe(base);
    let soma = 0;
    for (let t = 0; t < 2000; t++) soma += variacao(7, t, 0, 0, 0);
    expect(soma / 2000).toBeGreaterThan(0.45);
    expect(soma / 2000).toBeLessThan(0.55);
  });

  it('nenhum Math.random em src/audio nem em src/data/sons', () => {
    const lista = (dir: string): string[] => readdirSync(dir).flatMap((n) => (statSync(join(dir, n)).isDirectory() ? lista(join(dir, n)) : [join(dir, n)]));
    for (const f of [...lista('src/audio'), ...lista('src/data/sons')].filter((x) => x.endsWith('.ts'))) {
      const texto = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
      expect(texto, f).not.toMatch(/Math\.random/);
    }
  });
});

describe('sintetizarGrito', () => {
  const perfil: PerfilVocal = PERFIS_VOCAIS.hayato;
  const grito: Grito = { silabas: [{ c: 'k', v: 'a', v2: 'i', t: 0.2 }, { v: 'u', t: 0.15, fim: 'm' }], pausa: 0.03 };
  it('uma V por vogal, consoantes e finais como R, e o tom segue o perfil', () => {
    const r = sintetizarGrito(perfil, grito);
    expect(r.filter((c) => c.k === 'V')).toHaveLength(3); // a->i, u, e o 'm' final
    expect(r.filter((c) => c.k === 'R')).toHaveLength(1);
    const v0 = r.find((c) => c.k === 'V') as Extract<ChamadaReceita, { k: 'V' }>;
    expect(v0.f[0]).toBeCloseTo(perfil.f0, 5);
    expect(v0.formantes[0]).toBeCloseTo(730 * perfil.k, 5);
    expect(v0.formantes2?.[0]).toBeCloseTo(270 * perfil.k, 5);
    expect(duracaoDoGrito(grito)).toBeCloseTo(0.2 + 0.15 + 0.08 + 0.03, 6);
  });
  it('espelho: -1 st e trato x0,97; tom e volume de variação entram multiplicando', () => {
    const [n, e] = [sintetizarGrito(perfil, grito), sintetizarGrito(perfil, grito, { espelho: true, tom: 1.03, vol: 0.9 })];
    const vn = n.find((c) => c.k === 'V') as Extract<ChamadaReceita, { k: 'V' }>;
    const ve = e.find((c) => c.k === 'V') as Extract<ChamadaReceita, { k: 'V' }>;
    expect(ve.f[0] / vn.f[0]).toBeCloseTo(1.03 * Math.pow(2, -1 / 12), 6);
    expect(ve.formantes[0] / vn.formantes[0]).toBeCloseTo(0.97, 6);
    expect(ve.vol / vn.vol).toBeCloseTo(0.9, 6);
  });
  it('é pura: mesma entrada, mesma saída', () => {
    expect(JSON.stringify(sintetizarGrito(perfil, grito))).toBe(JSON.stringify(sintetizarGrito(perfil, grito)));
  });
  it('tocarReceita encaminha V para vozFormante com o volume escalado e o destino', () => {
    const chamadas: OpcoesVozFormante[] = [];
    const dest = {} as AudioNode;
    tocarReceita({ vozFormante: (o) => chamadas.push(o) }, sintetizarGrito(perfil, grito), { vol: 0.5, dest });
    expect(chamadas).toHaveLength(3);
    expect(chamadas[0]?.dest).toBe(dest);
    expect(chamadas[0]?.vol).toBeCloseTo(1.2 * 0.5, 6);
    expect(chamadas[0]?.when).toBeCloseTo(0.015, 6); // atraso da vogal depois da plosiva
  });
});

// --- plano sonoro com dados sintéticos ---
const GRITO: Grito = { silabas: [{ v: 'a', t: 0.12 }] };
const G = (n: number): Grito => ({ silabas: [{ v: 'a', t: n }] });
const perfilComVoz = (id: string): PerfilVocal => ({
  ...PERFIS_VOCAIS[id as keyof typeof PERFIS_VOCAIS],
  gritos: { kiai: G(0.3), vitoria: G(0.5), ko: G(0.9), leve: [G(0.12), G(0.13), G(0.14)], pesado: [G(0.22), G(0.25)], guarda: G(0.18), ...(id === 'wei-long' ? { esforco: G(0.1) } : {}) },
});
const t = (f0: number, camada: 'ataque' | 'corpo' | 'cauda' | 'extra' = 'corpo', quando?: number) => ({ k: 'T' as const, tipo: 'sine' as const, f0, t: 0.1, vol: 0.2, camada, ...(quando === undefined ? {} : { quando }) });
const ASSIN: Record<string, AssinaturaEspecial> = {
  'hayato.base.sFire': { grito: GRITO, conjuracao: [t(300)], lancamento: [t(400)], estilo: 'orb', estampa: [t(500)] },
  'aminu.base.sFire': { grito: GRITO, conjuracao: [t(180)], estampa: [t(180)], porNivel: true, carga: [[t(180)], [t(240)], [t(300)]] },
  'aminu.base.sDown': { grito: null, conjuracao: [t(260)], estampa: [], sucesso: { grito: GRITO, chamadas: [t(90)] } },
  'camille.base.sFire': { grito: null, conjuracao: [t(2637)], estampa: [], sucesso: { grito: GRITO, chamadas: [t(3136)] }, resposta: { golpe: 'sResp', grito: GRITO, estampa: [t(2637)] } },
  'camille.base.sDown': { grito: GRITO, conjuracao: [t(900)], estampa: [t(190)], contraEspecial: [t(880)] },
  'min-ji.base.sDown': { grito: GRITO, conjuracao: [t(900)], estampa: [t(1000)], porAcerto: [1, 1.26, 1.5] },
  'zenon.base.sFwd': { grito: GRITO, conjuracao: [t(147)], estampa: [t(1175)], comDreno: [t(2637)] },
  'centella.base.sFwd': { grito: GRITO, conjuracao: [t(98)], estampa: [t(220)], rebote: [t(140)] },
};
const SINT: DadosSons = {
  perfis: Object.fromEntries(IDS_LUTADORES.map((id) => [id, perfilComVoz(id)])),
  perfisPorFicha: PERFIS_VOCAIS ? { 'nila.sarpa': { f0: 258 } } : {},
  assinaturas: ASSIN,
};
const SINT_NILA: DadosSons = { ...SINT, perfis: { ...SINT.perfis, nila: { ...perfilComVoz('nila'), troca: { sarpa: [t(2000)], base: [t(140)] } } } };
const ctx = (a: (typeof IDS_LUTADORES)[number], b: (typeof IDS_LUTADORES)[number], fichas: [string | null, string | null] = [null, null]): ContextoSonoro => ({ ids: [a, b], fichas, semente: 11, tick: 100 });
const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
const hit = (o: Partial<Extract<EventoLuta, { tipo: 'hit' }>> = {}): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5, ...o });
const metodos = (p: { manter: readonly { metodo: string }[] }): string[] => p.manter.map((c) => c.metodo);

/** Lutadores sem voz e sem assinaturas: tudo cai nos sons genéricos de hoje. */
const SEM_VOZ: DadosSons = {
  perfis: Object.fromEntries(IDS_LUTADORES.map((id) => [id, (({ gritos: _g, troca: _t, ...resto }) => resto)(PERFIS_VOCAIS[id])])),
  perfisPorFicha: {},
  assinaturas: {},
};

describe('planoSonoro (puro)', () => {
  it('sem vozes nem assinaturas (lutador novo ainda mudo) o plano é o de sonsDoEvento e não acrescenta nada', () => {
    const eventos: EventoLuta[] = [
      { tipo: 'swing', lutador: 0, golpe: 'punch' }, { tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' }, hit(), hit({ projetil: true, snd: 'fireballHit' }),
      { tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: TXT }, { tipo: 'ko', defensor: 1, pitch: 1 }, { tipo: 'round', fase: 'end', round: 1, vencedor: 0, fimDaLuta: true },
      { tipo: 'projectile', lutador: 0, x: 0, y: 0, style: 'orb' }, { tipo: 'carga', lutador: 0, nivel: 2 }, { tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT },
      { tipo: 'rebote', lutador: 0, x: 0 }, { tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' }, { tipo: 'parry', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT },
    ];
    for (const ev of eventos) {
      const p = planoSonoro(ev, ctx('hayato', 'caio'), SEM_VOZ);
      expect(p.manter, ev.tipo).toEqual(sonsDoEvento(ev));
      expect(p.tocar, ev.tipo).toEqual([]);
    }
  });

  it('é puro: mesmo evento + contexto + dados = mesmo plano; a semente muda a variação', () => {
    const a = JSON.stringify(planoSonoro(hit(), ctx('hayato', 'caio'), SINT));
    expect(JSON.stringify(planoSonoro(hit(), ctx('hayato', 'caio'), SINT))).toBe(a);
    expect(JSON.stringify(planoSonoro(hit(), { ...ctx('hayato', 'caio'), semente: 12 }, SINT))).not.toBe(a);
  });

  it('dano: leve troca o hurt pela voz do DEFENSOR (garganta dele), pesado para golpe grande, dano >= 12, contragolpe e throw', () => {
    const leve = planoSonoro(hit(), ctx('hayato', 'caio'), SINT);
    expect(metodos(leve)).toEqual(['punch']);
    expect(leve.tocar).toHaveLength(1);
    expect(leve.tocar[0]).toMatchObject({ garganta: 1, prioridade: 1, tipo: 'dano' });
    const dur = (p: ReturnType<typeof planoSonoro>): number => (p.tocar[0]?.receita[0] as { t: number }).t;
    expect(dur(leve)).toBeLessThan(0.17);
    for (const ev of [hit({ grande: true }), hit({ dano: 12 }), hit({ contragolpe: true }), { tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: TXT } as EventoLuta]) {
      expect(dur(planoSonoro(ev, ctx('hayato', 'caio'), SINT)), ev.tipo).toBeGreaterThan(0.2);
    }
  });

  it('espelho: o P2 do mesmo lutador fica -1 st e com trato x0,97; o P1 não muda', () => {
    const c = ctx('hayato', 'hayato');
    const p2 = planoSonoro(hit({ atacante: 1, defensor: 1 }), c, SINT).tocar[0]?.receita[0] as Extract<ChamadaReceita, { k: 'V' }>;
    const p1 = planoSonoro(hit({ atacante: 0, defensor: 0 }), c, SINT).tocar[0]?.receita[0] as Extract<ChamadaReceita, { k: 'V' }>;
    expect(p2.formantes[0] / p1.formantes[0]).toBeCloseTo(0.97, 6);
    expect(p2.f[0]).toBeLessThan(p1.f[0] * 0.96);
  });

  it('special: troca o HA-DOU por grito + conjuração; sem assinatura, mantém o genérico', () => {
    const p = planoSonoro({ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' }, ctx('hayato', 'caio'), SINT);
    expect(metodos(p)).toEqual([]);
    expect(p.tocar.map((i) => [i.prioridade, i.garganta])).toEqual([[2, 0], [2, undefined]]);
    const sem = planoSonoro({ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFwd', ficha: null, momento: 'inicio' }, ctx('hayato', 'caio'), SINT);
    expect(metodos(sem)).toEqual(['special']);
  });

  it('special de sucesso (GARKUWA): sem grito no início; o grito vem no clash com `lutador`', () => {
    const ini = planoSonoro({ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sDown', ficha: null, momento: 'sucesso' }, ctx('aminu', 'caio'), SINT);
    expect(ini.tocar).toHaveLength(1); // só a postura
    expect(ini.tocar[0]?.garganta).toBeUndefined();
    const ok = planoSonoro({ tipo: 'clash', x: 0, y: 0, lutador: 0, golpe: 'sDown' }, ctx('aminu', 'caio'), SINT);
    expect(metodos(ok)).toEqual(['fireballHit']);
    expect(ok.tocar.map((i) => i.garganta)).toEqual([0, undefined]);
    const entreProjeteis = planoSonoro({ tipo: 'clash', x: 0, y: 0 }, ctx('aminu', 'caio'), SINT);
    expect(entreProjeteis.tocar).toEqual([]);
  });

  it('projétil: o lançamento sai de (id, ficha, style) e troca o fireballLaunch; o impacto troca o fireballHit', () => {
    const l = planoSonoro({ tipo: 'projectile', lutador: 0, x: 0, y: 0, style: 'orb' }, ctx('hayato', 'caio'), SINT);
    expect(metodos(l)).toEqual([]);
    expect(l.tocar).toHaveLength(1);
    expect(metodos(planoSonoro({ tipo: 'projectile', lutador: 0, x: 0, y: 0, style: 'blade' }, ctx('hayato', 'caio'), SINT))).toEqual(['fireballLaunch']);
    const i = planoSonoro(hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' }), ctx('hayato', 'caio'), SINT);
    expect(metodos(i)).toEqual([]);
    expect(i.tocar.map((x) => x.garganta)).toEqual([1, undefined]); // voz de dano do defensor + estampa
  });

  it('estampa de corpo a corpo soma ao punch/kick (não troca); MASHI repete por nível; HOERI sobe por acerto; ZENON só com dreno', () => {
    const corpo = planoSonoro(hit({ especial: true, golpe: 'sDown' }), ctx('camille', 'caio'), SINT);
    expect(metodos(corpo)).toEqual(['punch']);
    const mashi = planoSonoro(hit({ especial: true, golpe: 'sFire', nivelCarga: 3 }), ctx('aminu', 'caio'), SINT);
    expect(mashi.tocar.filter((x) => x.garganta === undefined).map((x) => (x.receita[0] as { quando?: number }).quando)).toEqual([0, 0.07, 0.14].map((q) => q || undefined));
    const f0 = (acertos: number): number => {
      const p = planoSonoro(hit({ especial: true, golpe: 'sDown', acertos }), ctx('min-ji', 'caio'), SINT);
      return (p.tocar.find((x) => x.garganta === undefined)?.receita[0] as { f0: number }).f0;
    };
    expect([f0(1), f0(2), f0(3), f0(9)]).toEqual([1000, 1260, 1500, 1500]);
    const semDreno = planoSonoro(hit({ especial: true, golpe: 'sFwd' }), ctx('zenon', 'caio'), SINT);
    const comDreno = planoSonoro(hit({ especial: true, golpe: 'sFwd', dreno: 5 }), ctx('zenon', 'caio'), SINT);
    expect(comDreno.tocar.length).toBe(semDreno.tocar.length + 1);
    const contra = planoSonoro(hit({ especial: true, golpe: 'sDown', contraEspecial: true }), ctx('camille', 'caio'), SINT);
    expect(contra.tocar.length).toBe(corpo.tocar.length + 1);
  });

  it('PARADE (parry) toca o sucesso do DEFENSOR; FOUETTÉ (hit sResp) usa a voz da CAMILLE e a resposta', () => {
    const p = planoSonoro({ tipo: 'parry', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT, golpe: 'sFire' }, ctx('camille', 'caio'), SINT);
    expect(metodos(p)).toEqual(['block']);
    expect(p.tocar.map((x) => x.garganta)).toEqual([0, undefined]);
    const f = planoSonoro(hit({ atacante: 0, defensor: 1, especial: true, golpe: 'sResp' }), ctx('camille', 'caio'), SINT);
    expect(f.tocar.map((x) => x.garganta)).toEqual([1, 0, undefined]);
  });

  it('defesa de especial (block com especial): a estampa abafada, prioridade 0', () => {
    const p = planoSonoro({ tipo: 'block', atacante: 0, defensor: 1, x: 0, y: 0, dir: 1, texto: null, golpe: 'sDown', especial: true }, ctx('camille', 'caio'), SINT);
    expect(metodos(p)).toEqual(['block']);
    expect(p.tocar[0]).toMatchObject({ abafado: true, prioridade: 0 });
  });

  it('KO: voz de KO (prioridade 3, garganta do defensor) + o gongo comum, no lugar de ko(p)', () => {
    const p = planoSonoro({ tipo: 'ko', defensor: 1, pitch: 1 }, ctx('hayato', 'caio'), SINT);
    expect(metodos(p)).toEqual([]);
    expect(p.tocar.map((x) => [x.prioridade, x.tipo, x.garganta])).toEqual([[3, 'ko', 1], [3, undefined, undefined]]);
    expect(p.tocar[1]?.receita).toBe(GONGO_KO);
  });

  it('guarda quebrada: grunhido + vidro, no lugar do fireballHit; armor: esforço só de quem tem', () => {
    const q = planoSonoro({ tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT }, ctx('hayato', 'caio'), SINT);
    expect(metodos(q)).toEqual([]);
    expect(q.tocar).toHaveLength(2);
    const armor = (def: 'wei-long' | 'caio') => planoSonoro({ tipo: 'armor', atacante: 0, defensor: 1, x: 0, y: 0, snd: 'punch', texto: TXT }, ctx('hayato', def), SINT);
    expect(armor('wei-long').tocar).toHaveLength(1);
    expect(armor('caio').tocar).toHaveLength(0);
  });

  it('vitória: só no fim da luta, 950 ms depois, voz do vencedor; o victory() de hoje continua', () => {
    const fim = planoSonoro({ tipo: 'round', fase: 'end', round: 2, vencedor: 1, fimDaLuta: true }, ctx('hayato', 'caio'), SINT);
    expect(metodos(fim)).toEqual(['victory']);
    expect(fim.tocar[0]).toMatchObject({ garganta: 1, prioridade: 3, atrasoMs: 950 });
    for (const ev of [{ tipo: 'round', fase: 'end', round: 1, vencedor: 1, fimDaLuta: false }, { tipo: 'round', fase: 'end', round: 1, vencedor: null, fimDaLuta: true }, { tipo: 'round', fase: 'start', round: 1 }] as EventoLuta[]) {
      expect(planoSonoro(ev, ctx('hayato', 'caio'), SINT).tocar).toEqual([]);
    }
  });

  it('carga troca o uiSelect pela batida do nível; rebote e troca-ficha ACRESCENTAM (land e jump ficam)', () => {
    const c = planoSonoro({ tipo: 'carga', lutador: 0, nivel: 2 }, ctx('aminu', 'caio'), SINT);
    expect(metodos(c)).toEqual([]);
    expect((c.tocar[0]?.receita[0] as { f0: number }).f0).toBe(240);
    const r = planoSonoro({ tipo: 'rebote', lutador: 0, x: 0 }, ctx('centella', 'caio'), SINT);
    expect(metodos(r)).toEqual(['land']);
    expect(r.tocar).toHaveLength(1);
    const tf = planoSonoro({ tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' }, ctx('nila', 'caio'), SINT_NILA);
    expect(metodos(tf)).toEqual(['jump']);
    expect((tf.tocar[0]?.receita[0] as { f0: number }).f0).toBe(2000);
    expect((planoSonoro({ tipo: 'troca-ficha', lutador: 0, ficha: null }, ctx('nila', 'caio'), SINT_NILA).tocar[0]?.receita[0] as { f0: number }).f0).toBe(140);
  });

  it('a ficha da NILA troca o perfil (SARPA mais aguda)', () => {
    const gaja = planoSonoro(hit({ defensor: 0, atacante: 1 }), ctx('nila', 'caio'), SINT).tocar[0]?.receita[0] as Extract<ChamadaReceita, { k: 'V' }>;
    const sarpa = planoSonoro(hit({ defensor: 0, atacante: 1 }), ctx('nila', 'caio', ['sarpa', null]), SINT).tocar[0]?.receita[0] as Extract<ChamadaReceita, { k: 'V' }>;
    expect(sarpa.f[0]).toBeGreaterThan(gaja.f[0]);
  });

  it('o tom varia no máximo ±3% e o volume fica em [0,9; 1,0] x o base', () => {
    const base = sintetizarGrito(SINT.perfis['hayato'] as PerfilVocal, G(0.12))[0] as Extract<ChamadaReceita, { k: 'V' }>;
    for (let tick = 0; tick < 300; tick++) {
      const v = planoSonoro(hit({ atacante: 1, defensor: 0, grande: false }), { ...ctx('hayato', 'caio'), tick }, SINT).tocar[0]?.receita[0] as Extract<ChamadaReceita, { k: 'V' }>;
      expect(v.f[0] / base.f[0]).toBeGreaterThanOrEqual(0.97 - 1e-9);
      expect(v.f[0] / base.f[0]).toBeLessThanOrEqual(1.03 + 1e-9);
      const trim = Math.pow(10, ((SINT.perfis['hayato'] as PerfilVocal).ganhoDb?.leve ?? 0) / 20); // o ganho calibrado do dano leve
      expect(v.vol / base.vol / trim).toBeGreaterThanOrEqual(0.9 - 1e-9);
      expect(v.vol / base.vol / trim).toBeLessThanOrEqual(1 + 1e-9);
    }
  });
});

// --- execução ---
type Chamada = [string, ...unknown[]];
function gravador(): { audio: Record<string, unknown>; log: Chamada[] } {
  const log: Chamada[] = [];
  const audio: Record<string, unknown> = {
    ctx: {},
    sfxVol: 0.8,
    barramentoIdentidade: () => ({ barramento: true }),
    abrirGarganta: (i: number, d: number, o: unknown) => {
      log.push(['garganta', i, Number(d.toFixed(3)), o]);
      return { garganta: i };
    },
    fontesLivres: () => 32,
    registrarFontes: () => undefined,
    tone: (o: { f0: number; dest?: unknown }) => log.push(['tone', o.f0, o.dest]),
    noise: () => log.push(['noise']),
    vozFormante: (o: { dest?: unknown }) => log.push(['voz', o.dest]),
  };
  for (const m of ['swing', 'special', 'deny', 'jump', 'land', 'fireballLaunch', 'fireballHit', 'block', 'punch', 'kick', 'hurt', 'ko', 'roundStart', 'fight', 'timeOver', 'victory', 'uiPerfect', 'uiSelect', 'introWhoosh', 'musicaDaFase'])
    audio[m] = (...a: unknown[]) => log.push([m, ...a]);
  return { audio, log };
}

describe('reagirComIdentidade', () => {
  const eventos: EventoLuta[] = [
    { tipo: 'swing', lutador: 0, golpe: 'punch' }, { tipo: 'special', lutador: 0, pitch: 1.05, golpe: 'sFire', ficha: null, momento: 'inicio' }, hit(), { tipo: 'ko', defensor: 1, pitch: 1 },
    { tipo: 'round', fase: 'end', round: 1, vencedor: 0, fimDaLuta: true }, { tipo: 'perfect', vencedor: 0 },
  ];
  it('IDENTIDADE_SONORA está DESLIGADA por padrão (rollback) e, desligada, o log é igual ao de reagirAosEventos', () => {
    expect(IDENTIDADE_SONORA).toBe(false);
    const a = gravador();
    const b = gravador();
    const agenda: number[][] = [[], []];
    reagirAosEventos(a.audio, eventos, (fn, ms) => (agenda[0]?.push(ms), fn()));
    reagirComIdentidade(b.audio as never, eventos, ctx('hayato', 'caio'), (fn, ms) => (agenda[1]?.push(ms), fn()), IDENTIDADE_SONORA, SINT);
    expect(b.log).toEqual(a.log);
    expect(agenda[1]).toEqual(agenda[0]);
  });

  it('ligada, sem vozes, também é igual ao de hoje', () => {
    const a = gravador();
    const b = gravador();
    reagirAosEventos(a.audio, eventos, (fn) => fn());
    reagirComIdentidade(b.audio as never, eventos, ctx('hayato', 'caio'), (fn) => fn(), true, SEM_VOZ);
    expect(b.log).toEqual(a.log);
  });

  it('ligada, com vozes: mantém o que o plano manda, toca o resto pela garganta e agenda a vitória em 950 ms', () => {
    const g = gravador();
    const agenda: number[] = [];
    reagirComIdentidade(g.audio as never, eventos, ctx('hayato', 'caio'), (fn, ms) => (agenda.push(ms), fn()), true, SINT);
    const nomes = g.log.map((c) => c[0]);
    expect(nomes).not.toContain('special'); // trocado pelo grito
    expect(nomes).not.toContain('hurt');
    expect(nomes).not.toContain('ko');
    expect(nomes).toContain('swing');
    expect(nomes).toContain('victory');
    expect(g.log.filter((c) => c[0] === 'garganta').map((c) => c[1])).toEqual([0, 1, 1, 0]); // kiai, dano, KO, vitória
    expect(agenda).toEqual([950, 700]); // vitória e o uiPerfect de hoje
    expect(g.log.filter((c) => c[0] === 'voz').every((c) => (c[1] as { garganta?: number }).garganta !== undefined)).toBe(true);
  });

  it('sfx em 0: toca só o que tocava (nenhuma garganta, nenhum nó novo)', () => {
    const g = gravador();
    g.audio['sfxVol'] = 0;
    reagirComIdentidade(g.audio as never, eventos, ctx('hayato', 'caio'), (fn) => fn(), true, SINT);
    expect(g.log.some((c) => c[0] === 'garganta' || c[0] === 'voz')).toBe(false);
  });

  it('o jogo real: o plano toca no AudioSys offline sem lançar e fica dentro do teto de 32 fontes', () => {
    const { audio } = sistema({ limitador: true, sementeVariacao: 17 });
    const muitos: EventoLuta[] = [];
    for (let i = 0; i < 12; i++) muitos.push(hit({ grande: i % 2 === 0, atacante: (i % 2) as IndiceLutador, defensor: ((i + 1) % 2) as IndiceLutador }));
    muitos.push({ tipo: 'ko', defensor: 1, pitch: 1 });
    reagirComIdentidade(audio, muitos, ctx('hayato', 'caio'), (fn) => fn(), true, SINT);
    expect(audio.fontesAtivas()).toBeLessThanOrEqual(32);
    expect(audio.fontesAtivas()).toBeGreaterThan(0);
  });
});

describe('validação dos dados de sons (boot)', () => {
  it('os dados reais passam; lutador sem perfil, chave órfã, limites e estilo errado reprovam', () => {
    expect(() => exigirSonsValidos(DADOS_SONS)).not.toThrow();
    expect(validarOrcamentoDosSons(DADOS_SONS)).toEqual([]);
    expect(validarSons({ ...DADOS_SONS, perfis: { ...DADOS_SONS.perfis, hayato: undefined as never } }).join('|')).toMatch(/hayato sem perfil/);
    expect(validarSons({ ...DADOS_SONS, assinaturas: { 'fantasma.base.sFire': ASSIN['hayato.base.sFire'] as AssinaturaEspecial } }).join('|')).toMatch(/órfã/);
    const ruim = (p: Partial<PerfilVocal>): string => validarSons({ ...DADOS_SONS, perfis: { ...DADOS_SONS.perfis, hayato: { ...PERFIS_VOCAIS.hayato, ...p } } }).join('|');
    expect(ruim({ f0: 40 })).toMatch(/f0 40/);
    expect(ruim({ k: 2 })).toMatch(/k 2/);
    expect(ruim({ q: 20 })).toMatch(/q 20/);
    expect(ruim({ gritos: { ...(SINT.perfis['hayato'] as PerfilVocal).gritos!, kiai: G(0.7) } })).toMatch(/kiai: grito de 0.70 s/);
    expect(ruim({ gritos: { ...(SINT.perfis['hayato'] as PerfilVocal).gritos!, ko: G(1.3) } })).toMatch(/ko: grito de 1.30/);
    const e = (a: AssinaturaEspecial): string => validarSons({ ...DADOS_SONS, assinaturas: { 'hayato.base.sFire': a } }).join('|');
    const ok = ASSIN['hayato.base.sFire'] as AssinaturaEspecial;
    expect(e(ok)).toBe('');
    expect(e({ ...ok, estilo: 'blade' })).toMatch(/estilo 'blade' difere/);
    expect(e({ ...ok, lancamento: undefined } as never)).toMatch(/não tem 'lancamento'/);
    expect(e({ ...ok, conjuracao: [{ ...t(300), vol: 1.5 }] })).toMatch(/vol 1.5/);
    expect(e({ ...ok, conjuracao: [{ ...t(30000) }] })).toMatch(/frequência 30000/);
    expect(e({ ...ok, conjuracao: [{ ...t(300, 'corpo', 0.9) }] })).toMatch(/quando 0.9/);
    expect(e({ ...ok, conjuracao: Array.from({ length: 9 }, () => t(300)) })).toMatch(/9 chamadas/);
    expect(validarSons({ ...DADOS_SONS, assinaturas: { 'camille.base.sFwd': { ...ok, lancamento: [t(300)] } } }).join('|')).toMatch(/lancamento' em golpe sem projétil/);
  });
  it('o boot exige as 33 assinaturas e os 10 perfis com gritos: a tabela vazia reprova', () => {
    expect(validarSons(SEM_VOZ, { exigirAssinaturasCompletas: true }).filter((x) => x.startsWith('assinaturas: falta'))).toHaveLength(33);
    expect(validarSons(SEM_VOZ, { exigirGritos: true }).filter((x) => x.endsWith('perfil sem gritos'))).toHaveLength(10);
    expect(Object.keys(ASSINATURAS)).toHaveLength(33);
    expect(validarSons(DADOS_SONS, { exigirAssinaturasCompletas: true, exigirGritos: true })).toEqual([]);
    const sem = { ...ASSINATURAS };
    delete sem['hayato.base.sFire'];
    expect(validarSons({ ...DADOS_SONS, assinaturas: sem }, { exigirAssinaturasCompletas: true })).toEqual(["assinaturas: falta 'hayato.base.sFire'"]);
  });
  it('o orçamento reprova um plano que não cabe em 12 fontes depois do corte', () => {
    const ataques = (): ReturnType<typeof t>[] => Array.from({ length: 8 }, (_, i) => t(100 + i, 'ataque'));
    const muito: AssinaturaEspecial = { ...(ASSIN['hayato.base.sFire'] as AssinaturaEspecial), estampa: ataques(), comDreno: ataques() };
    const erros = validarOrcamentoDosSons({ ...SINT, assinaturas: { 'hayato.base.sFire': muito } });
    expect(erros.join('|')).toMatch(/fontes depois do corte/);
  });
});
