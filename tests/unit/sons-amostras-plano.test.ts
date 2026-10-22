import { afterEach, describe, expect, it, vi } from 'vitest';
import { BancoDeAmostras } from '../../src/audio/amostras';
import { AudioSys, FONTES_SIMULTANEAS } from '../../src/audio/audio-sys';
import { chavesSonoras } from '../../src/audio/chaves';
import { ATRASO_VITORIA_MS, planoSonoro, reagirComIdentidade, registrarBancoDeAmostras, type ContextoSonoro, type Plano } from '../../src/audio/identidade-sonora';
import { fontesDaReceita } from '../../src/audio/orcamento-sonoro';
import { type EventoLuta, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { ASSINATURAS, chavesDosEspeciais } from '../../src/data/sons';
import {
  AMOSTRAS_POR_EVENTO,
  ATRASO_QUEDA_KO_MS,
  ESPELHO_TAXA,
  GANHO_VARIACAO_MIN,
  PESO_MAXIMO_BYTES,
  VARIACAO_TAXA,
  familiaDaAssinatura,
  idsConhecidos,
  idsObrigatorios,
  validarManifesto,
  type PedidoAmostra,
} from '../../src/data/sons/amostras';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { TAXA } from '../support/descritores';
import { criarPacote, idsDoPacote, type OpcoesDoPacote } from '../support/pacote-teste';

/*
 * O PLANO das amostras reais (puro) e a EXECUÇÃO que decide ao tocar: com o buffer decodificado toca a amostra; sem ele toca a síntese de hoje. O pacote de teste tem o
 * MESMO manifesto do pacote real. O banco em si (carregamento, ataque, escolha) está em sons-amostras-banco.test.ts.
 */

const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
const hit = (o: object): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5, ...o }) as EventoLuta;
const ctxSom = (a: IdLutador = 'hayato', b: IdLutador = 'caio', tick = 100, fichas: [string | null, string | null] = [null, null]): ContextoSonoro => ({ ids: [a, b], fichas, semente: 17, tick });

afterEach(() => {
  registrarBancoDeAmostras(null);
  chavesSonoras.amostras = true;
});

/** Uma amostra de cada evento que a luta emite (os que têm som). */
const BATERIA: EventoLuta[] = [
  { tipo: 'swing', lutador: 0, golpe: 'punch' },
  { tipo: 'swing', lutador: 1, golpe: 'kick' },
  { tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' },
  { tipo: 'special', lutador: 0, pitch: 1, golpe: 'sDown', ficha: null, momento: 'inicio' },
  { tipo: 'jump', lutador: 0 },
  { tipo: 'land', lutador: 0 },
  { tipo: 'projectile', lutador: 0, x: 0, y: 0, style: 'orb' },
  { tipo: 'clash', x: 0, y: 0 },
  { tipo: 'block', atacante: 1, defensor: 0, x: 0, y: 0, dir: 1, texto: null },
  { tipo: 'armor', atacante: 1, defensor: 0, x: 0, y: 0, snd: 'kick', texto: TXT },
  hit({}),
  hit({ snd: 'kick', grande: true }),
  hit({ snd: 'punch', dano: 14 }),
  hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit', grande: true }),
  hit({ especial: true, golpe: 'sFwd' }),
  { tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: TXT },
  { tipo: 'ko', defensor: 1, pitch: 1 },
  { tipo: 'round', fase: 'end', round: 2, vencedor: 0, fimDaLuta: true },
  { tipo: 'parry', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT, golpe: 'sFire' },
  { tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT },
  { tipo: 'rebote', lutador: 0, x: 0 },
  { tipo: 'troca-ficha', lutador: 0, ficha: null },
  { tipo: 'esquiva', lutador: 0, dir: 1, x: 0 },
];

const semCampoDeAmostra = (p: Plano): unknown => ({ manter: p.manter, tocar: p.tocar.map(({ amostra: _a, amostraModo: _m, tag: _t, ...resto }) => resto).filter((i) => i.receita.length > 0) });

describe('o plano com `amostras = false` é o de antes, byte a byte (o lock-step e os testes do plano seguem valendo)', () => {
  it('o padrão é `false`: nenhum campo de amostra, nem em `manter`, nem em `tocar`, nem `trocas`', () => {
    for (const ev of BATERIA) {
      const p = planoSonoro(ev, ctxSom());
      expect(JSON.stringify(p), ev.tipo).not.toMatch(/amostra|trocas|vidro-guarda/);
      expect(p.trocas).toBeUndefined();
    }
  });
  it('com `true`, o que já existia (manter e itens de síntese) continua IGUAL: a amostra só anota e acrescenta itens de amostra pura', () => {
    for (const ev of BATERIA) {
      const antes = planoSonoro(ev, ctxSom('hayato', 'caio', 100));
      const depois = planoSonoro(ev, ctxSom('hayato', 'caio', 100), undefined, true);
      expect(semCampoDeAmostra(depois), ev.tipo).toEqual(semCampoDeAmostra(antes));
    }
  });
});

describe('o plano das amostras é PURO e determinístico (sem Math.random)', () => {
  it('mesma entrada = mesmo plano; outro tick ou outro evento do tick varia o pedido; Math.random nunca é chamado', () => {
    const espiao = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random proibido no plano sonoro');
    });
    try {
      for (const ev of BATERIA) expect(JSON.stringify(planoSonoro(ev, ctxSom(), undefined, true)), ev.tipo).toBe(JSON.stringify(planoSonoro(ev, ctxSom(), undefined, true)));
      const u = (tick: number): number => (planoSonoro(hit({}), ctxSom('hayato', 'caio', tick), undefined, true).trocas?.[0]?.pedido as PedidoAmostra).u;
      expect(new Set(Array.from({ length: 30 }, (_, i) => u(i))).size).toBeGreaterThan(20);
      expect(espiao).not.toHaveBeenCalled();
    } finally {
      espiao.mockRestore();
    }
  });
  it('a variação respeita as faixas do plano: taxa 0,97 a 1,03 e ganho 0,9 a 1,0 em milhares de toques; o espelho canta -1 semitom', () => {
    let tmin = 9;
    let tmax = 0;
    let gmin = 9;
    let gmax = 0;
    for (let tick = 0; tick < 3000; tick++) {
      for (const p of [planoSonoro(hit({}), ctxSom('hayato', 'caio', tick), undefined, true)]) {
        for (const x of [...(p.trocas ?? []).map((t) => t.pedido), ...p.tocar.flatMap((i) => (i.amostra ? [i.amostra] : []))]) {
          tmin = Math.min(tmin, x.taxa);
          tmax = Math.max(tmax, x.taxa);
          gmin = Math.min(gmin, x.ganho);
          gmax = Math.max(gmax, x.ganho);
        }
      }
    }
    expect(tmin).toBeGreaterThanOrEqual(1 - VARIACAO_TAXA - 1e-9);
    expect(tmax).toBeLessThanOrEqual(1 + VARIACAO_TAXA + 1e-9);
    expect(tmax - tmin).toBeGreaterThan(0.05);
    expect(gmin).toBeGreaterThanOrEqual(GANHO_VARIACAO_MIN - 1e-9);
    expect(gmax).toBeLessThanOrEqual(1);
    // espelho: o lutador do índice 1 sai 1 semitom mais grave (a mesma regra D-S7 da síntese)
    const voz = (c: ContextoSonoro): PedidoAmostra => planoSonoro(hit({ atacante: 0, defensor: 1 }), c, undefined, true).tocar.find((i) => i.garganta === 1)?.amostra as PedidoAmostra;
    const normal = voz(ctxSom('hayato', 'caio'));
    const espelho = voz(ctxSom('hayato', 'hayato'));
    expect(espelho.taxa / normal.taxa).toBeCloseTo(ESPELHO_TAXA, 6);
    expect(ESPELHO_TAXA).toBeCloseTo(0.9439, 4);
  });
});

describe('o que cada evento pede (ids, em cadeia)', () => {
  const trocas = (ev: EventoLuta, c = ctxSom()): [string, string[]][] => (planoSonoro(ev, c, undefined, true).trocas ?? []).map((t) => [t.metodo, [...t.pedido.ids]]);
  const itens = (ev: EventoLuta, c = ctxSom()): { ids: string[]; modo?: string; atrasoMs?: number; vazio: boolean; garganta?: number }[] =>
    planoSonoro(ev, c, undefined, true).tocar.flatMap((i) => (i.amostra ? [{ ids: [...i.amostra.ids], ...(i.amostraModo ? { modo: i.amostraModo } : {}), ...(i.atrasoMs ? { atrasoMs: i.atrasoMs } : {}), vazio: i.receita.length === 0, ...(i.garganta === undefined ? {} : { garganta: i.garganta }) }] : []));

  it('golpe no ar, esquiva, pouso e salto trocam o método genérico', () => {
    expect(trocas({ tipo: 'swing', lutador: 0, golpe: 'punch' })).toEqual([['swing', ['golpe.ar.leve']]]);
    expect(trocas({ tipo: 'swing', lutador: 0, golpe: 'kick' })).toEqual([['swing', ['golpe.ar.forte']]]);
    expect(trocas({ tipo: 'esquiva', lutador: 0, dir: 1, x: 0 })).toEqual([['swing', ['esquiva']]]);
    expect(trocas({ tipo: 'land', lutador: 0 })).toEqual([['land', ['pouso']]]);
    expect(trocas({ tipo: 'rebote', lutador: 0, x: 0 })).toEqual([['land', ['pouso']]]);
    expect(trocas({ tipo: 'jump', lutador: 0 })).toEqual([['jump', ['salto']]]);
    expect(trocas({ tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' })).toEqual([['jump', ['salto']]]);
  });

  it('o soco/chute leve ou pesado segue a MESMA regra do dano pesado de hoje (grande, dano >= 12, contragolpe; arremesso sempre)', () => {
    expect(trocas(hit({}))).toEqual([['punch', ['imp.soco.leve']]]);
    expect(trocas(hit({ dano: 12 }))).toEqual([['punch', ['imp.soco.forte']]]);
    expect(trocas(hit({ grande: true, snd: 'kick' }))).toEqual([['kick', ['imp.chute.forte']]]);
    expect(trocas(hit({ contragolpe: true }))).toEqual([['punch', ['imp.soco.forte']]]);
    expect(trocas(hit({ snd: 'kick', dano: 11 }))).toEqual([['kick', ['imp.chute.leve']]]);
    expect(trocas(hit({ snd: 'fireballHit' }))).toEqual([['fireballHit', ['magia.impacto']]]);
    expect(trocas({ tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: TXT })).toEqual([['kick', ['arremesso']]]);
    expect(trocas({ tipo: 'armor', atacante: 1, defensor: 0, x: 0, y: 0, snd: 'punch', texto: TXT })).toEqual([['punch', ['imp.soco.leve']]]);
    // a voz de dano do defensor: leve ou pesado, pela garganta do defensor
    expect(itens(hit({}))).toEqual([{ ids: ['voz.caio.leve'], vazio: false, garganta: 1 }]);
    expect(itens(hit({ grande: true }))).toEqual([{ ids: ['voz.caio.pesado'], vazio: false, garganta: 1 }]);
  });

  it('defesa e parry usam `defesa`; a guarda quebrada soma voz (guarda, senão pesado), o vidro com o pedido da quebra e o método genérico como reserva', () => {
    expect(trocas({ tipo: 'block', atacante: 1, defensor: 0, x: 0, y: 0, dir: 1, texto: null })).toEqual([['block', ['defesa']]]);
    expect(trocas({ tipo: 'parry', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT, golpe: 'sFire' }, ctxSom('camille'))).toEqual([['block', ['defesa']]]);
    const qg: EventoLuta = { tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT };
    const p = planoSonoro(qg, ctxSom(), undefined, true);
    expect(p.tocar.map((i) => i.amostra?.ids)).toEqual([['voz.hayato.guarda', 'voz.hayato.pesado'], ['guarda.quebra']]);
    expect(p.tocar[1]?.tag).toBe('vidro-guarda');
    expect(p.tocar[1]?.amostraModo).toBe('sobrepor');
    expect(p.manter.map((c) => c.metodo)).toEqual([]); // com a voz, o `fireballHit` genérico já saía (o vidro é quem ficou)
  });

  it('KO: voz de KO, gongo sintetizado (sem amostra) e a queda do corpo depois do golpe; vitória: a voz de vitória, depois o kiai, e o riso do ZENON primeiro', () => {
    const ko = planoSonoro({ tipo: 'ko', defensor: 1, pitch: 1 }, ctxSom(), undefined, true).tocar;
    expect(ko.map((i) => i.amostra?.ids)).toEqual([['voz.caio.ko'], undefined, ['ko.queda']]);
    expect(ko[2]?.atrasoMs).toBe(ATRASO_QUEDA_KO_MS);
    expect(ko[2]?.receita).toEqual([]);
    expect(ko[2]?.prioridade).toBe(2); // o KO e a vitória (3) são os únicos que passam do teto de fontes; a queda cede se não houver espaço
    const fim = (v: IdLutador): string[] => planoSonoro({ tipo: 'round', fase: 'end', round: 2, vencedor: 0, fimDaLuta: true }, ctxSom(v, 'caio'), undefined, true).tocar[0]?.amostra?.ids.slice() ?? [];
    expect(fim('hayato')).toEqual(['voz.hayato.vitoria', 'voz.hayato.kiai']);
    expect(fim('zenon')).toEqual(['voz.zenon.riso', 'voz.zenon.vitoria', 'voz.zenon.kiai']);
    expect(planoSonoro({ tipo: 'round', fase: 'end', round: 2, vencedor: 0, fimDaLuta: true }, ctxSom(), undefined, true).tocar[0]?.atrasoMs).toBe(ATRASO_VITORIA_MS);
  });

  it('o especial: kiai do lutador + a conjuração = 1ª metade da família SOBRE a assinatura sintetizada; o lançamento = 2ª metade + o corpo comum da magia', () => {
    const sp = planoSonoro({ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' }, ctxSom(), undefined, true).tocar;
    expect(sp[0]?.amostra?.ids).toEqual(['voz.hayato.kiai']);
    expect(sp[1]?.amostra).toMatchObject({ ids: ['esp.e1.raio'], parte: 'inicio', taxa: expect.any(Number) });
    expect(sp[1]?.amostraModo).toBe('sobrepor');
    expect(sp[1]?.receita.length).toBeGreaterThan(0); // a assinatura sintetizada continua no item
    const pr = planoSonoro({ tipo: 'projectile', lutador: 0, x: 0, y: 0, style: 'orb' }, ctxSom(), undefined, true).tocar;
    expect(pr.map((i) => [i.amostra?.ids[0], i.amostra?.parte, i.receita.length > 0])).toEqual([['magia.lanca', undefined, false], ['esp.e1.raio', 'fim', true]]);
  });

  it('o golpe transforma a família: sFire inteiro, sDown grave e abafado (0,84 + passa-baixa 1,8 kHz), sFwd agudo e fino (1,12 + passa-alta 400 Hz)', () => {
    const taxaBase = (g: string): PedidoAmostra => planoSonoro({ tipo: 'special', lutador: 0, pitch: 1, golpe: g, ficha: null, momento: 'inicio' }, ctxSom(), undefined, true).tocar[1]?.amostra as PedidoAmostra;
    const f = taxaBase('sFire');
    const d = taxaBase('sDown');
    const w = taxaBase('sFwd');
    expect(d.taxa / f.taxa).toBeCloseTo(0.84, 1);
    expect(w.taxa / f.taxa).toBeCloseTo(1.12, 1);
    expect(f.filtro).toBeUndefined();
    expect(d.filtro).toEqual({ tipo: 'lowpass', f: 1800 });
    expect(w.filtro).toEqual({ tipo: 'highpass', f: 400 });
  });

  it('a família tem dono: as 33 assinaturas mapeiam para uma das 12 famílias (NILA base = E8, SARPA = E9; BAATAR: MERGULHO = E11, o resto = E10)', () => {
    const chaves = chavesDosEspeciais();
    expect(chaves).toHaveLength(33);
    for (const c of chaves) expect(familiaDaAssinatura(c)?.id, c).toMatch(/^esp\.e\d+\./);
    expect(new Set(chaves.map((c) => familiaDaAssinatura(c)?.id)).size).toBe(12);
    expect(familiaDaAssinatura('nila.base.sFire')?.id).toBe('esp.e8.chenda');
    expect(familiaDaAssinatura('nila.sarpa.sFwd')?.id).toBe('esp.e9.serpente');
    expect(familiaDaAssinatura('baatar.base.sFwd')?.id).toBe('esp.e11.aguia');
    expect(familiaDaAssinatura('baatar.base.sDown')?.id).toBe('esp.e10.estepe');
    expect(familiaDaAssinatura('zenon.chefe2.sFwd')?.id).toBe('esp.e12.selo');
    expect(Object.keys(ASSINATURAS)).toEqual(expect.arrayContaining(chaves));
  });

  it('o acerto do especial: a estampa leva a família (inteira); no projétil o corpo comum da magia entra; MASHI repete a batida a cada 70 ms com a amostra no mesmo passo', () => {
    const proj = itens(hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit', grande: true }));
    expect(proj.map((i) => i.ids[0])).toEqual(['voz.caio.pesado', 'magia.impacto', 'esp.e1.raio']);
    expect(proj[1]?.vazio).toBe(true);
    const mashi = planoSonoro(hit({ especial: true, golpe: 'sFire', nivelCarga: 3 }), ctxSom('aminu', 'caio'), undefined, true).tocar.filter((i) => i.amostra?.ids[0] === 'esp.e5.tambor');
    expect(mashi.map((i) => i.amostra?.quando ?? 0)).toEqual([0, 0.07, 0.14]);
    // o tambor do evento `carga` sobe de tom a cada nível
    const nivel = (n: 1 | 2 | 3): number => (planoSonoro({ tipo: 'carga', lutador: 0, nivel: n }, ctxSom('aminu', 'caio'), undefined, true).tocar[0]?.amostra as PedidoAmostra).taxa;
    expect(nivel(1)).toBeLessThan(nivel(2));
    expect(nivel(2)).toBeLessThan(nivel(3));
  });

  it('a SARPA (ficha da NILA) fala mais aguda e filtrada; o `SSSA` próprio tem prioridade; a voz de dano também', () => {
    const c = ctxSom('nila', 'caio', 100, ['sarpa', null]);
    const kiai = planoSonoro({ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: 'sarpa', momento: 'inicio' }, c, undefined, true).tocar[0]?.amostra as PedidoAmostra;
    expect(kiai.ids).toEqual(['voz.nila.sarpa.kiai']);
    expect(kiai.senao?.ids).toEqual(['voz.nila.kiai']);
    expect(kiai.senao?.filtro).toEqual({ tipo: 'highpass', f: 300 });
    expect(kiai.senao?.taxa).toBeCloseTo(kiai.taxa * 1.06, 6);
    const dano = planoSonoro(hit({ atacante: 1, defensor: 0 }), c, undefined, true).tocar[0]?.amostra as PedidoAmostra;
    expect(dano.ids).toEqual(['voz.nila.leve']);
    expect(dano.filtro).toEqual({ tipo: 'highpass', f: 300 });
  });
});

describe('o mapa evento -> amostra e o manifesto', () => {
  it('todo padrão do mapa acerta ao menos um id da tabela (nenhum evento aponta para o vazio)', () => {
    const todos = [...idsConhecidos()];
    for (const [tipo, padroes] of Object.entries(AMOSTRAS_POR_EVENTO)) {
      if (padroes === 'sintese') continue;
      for (const p of padroes) {
        const re = new RegExp(`^${p.replace(/\./g, '\\.').replace(/\*/g, '[^.]+(?:\\.[^.]+)*')}$`);
        expect(todos.some((id) => re.test(id)), `${tipo}: ${p}`).toBe(true);
      }
    }
  });
  it('os eventos de jingle, interface e aviso ficam sintetizados DE PROPÓSITO (a marca do jogo)', () => {
    const sinteticos = Object.entries(AMOSTRAS_POR_EVENTO).filter(([, v]) => v === 'sintese').map(([k]) => k).sort();
    expect(sinteticos).toEqual(['deny', 'dust', 'esquivou', 'fase-chefe', 'perfect']);
  });
  it('o pacote de teste cobre todos os ids da tabela (menos nenhum) e o núcleo obrigatório; o manifesto dele passa na validação', () => {
    const pacote = criarPacote();
    expect(validarManifesto(pacote.manifesto)).toEqual([]);
    expect(Object.keys(pacote.manifesto.sons).sort()).toEqual([...idsConhecidos()].sort());
    for (const id of idsObrigatorios()) expect(pacote.manifesto.sons[id], id).toBeDefined();
    expect(idsDoPacote().length).toBeGreaterThan(100);
    expect(Object.values(pacote.manifesto.folhas).reduce((n, f) => n + f.bytes, 0)).toBeLessThan(PESO_MAXIMO_BYTES * 3);
  });
  it('a validação reprova: versão, taxa, id fora da tabela, folha inexistente, origem vazia, licença que não é CC0, ganho absurdo, peso e arquivo que não é .mp3', () => {
    const base = JSON.parse(JSON.stringify(criarPacote().manifesto)) as { versao: number; taxa: number; folhas: Record<string, { arquivo: string; bytes: number }>; sons: Record<string, Record<string, unknown> | Record<string, unknown>[]> };
    const com = (mudar: (m: typeof base) => void): string[] => {
      const m = JSON.parse(JSON.stringify(base)) as typeof base;
      mudar(m);
      return validarManifesto(m);
    };
    expect(validarManifesto(base)).toEqual([]);
    expect(com((m) => (m.versao = 2)).join()).toMatch(/versao/);
    expect(com((m) => (m.taxa = 8000)).join()).toMatch(/taxa/);
    expect(com((m) => (m.sons['som.fantasma'] = m.sons['defesa'] as Record<string, unknown>)).join()).toMatch(/som\.fantasma.*fora da tabela/);
    expect(com((m) => ((m.sons['defesa'] as Record<string, unknown>)['folha'] = 'nao-existe')).join()).toMatch(/folha 'nao-existe' não existe/);
    expect(com((m) => ((m.sons['defesa'] as Record<string, unknown>)['origem'] = '  ')).join()).toMatch(/origem ausente/);
    expect(com((m) => ((m.sons['defesa'] as Record<string, unknown>)['licenca'] = 'CC-BY')).join()).toMatch(/licenca 'CC-BY'/);
    expect(com((m) => ((m.sons['defesa'] as Record<string, unknown>)['ganhoDb'] = 40)).join()).toMatch(/ganhoDb/);
    expect(com((m) => ((m.sons['defesa'] as Record<string, unknown>)['dur'] = 5)).join()).toMatch(/dur/);
    expect(com((m) => ((m.folhas['base'] as { bytes: number }).bytes = PESO_MAXIMO_BYTES + 1)).join()).toMatch(/peso/);
    expect(com((m) => ((m.folhas['base'] as { arquivo: string }).arquivo = '../base.wav')).join()).toMatch(/arquivo inválido/);
    expect(validarManifesto(null)).toEqual(['manifesto: não é um objeto']);
    expect(validarManifesto({ versao: 1, taxa: 44100, folhas: base.folhas, sons: {} }).join()).toMatch(/sons vazio/);
  });
  it('lacunas são aceitas (família sem sample livre fica na síntese), mas o núcleo obrigatório aparece na lista do que falta', () => {
    const pacote = criarPacote({ sem: ['esp.e4.ginga', 'esp.e5.tambor', 'esp.e12.selo'] });
    expect(validarManifesto(pacote.manifesto)).toEqual([]);
    expect(idsObrigatorios().filter((id) => pacote.manifesto.sons[id] === undefined)).toEqual([]);
    expect(pacote.manifesto.sons['esp.e4.ginga']).toBeUndefined();
  });
});

// ---------- execução no AudioSys real, sobre o motor offline ----------
interface Cena {
  readonly c: Contexto;
  readonly audio: AudioSys;
  readonly banco: BancoDeAmostras | null;
  readonly chamadas: string[];
}
async function cena(o: { pacote?: OpcoesDoPacote; banco?: boolean; folhas?: IdLutador[]; taxaCtx?: number } = {}): Promise<Cena> {
  const c = new Contexto(o.taxaCtx ?? TAXA);
  const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
  audio.init();
  registrarBancoDeAmostras(null); // cada cena começa sem banco; `banco !== false` registra o seu
  const chamadas: string[] = [];
  for (const m of ['punch', 'kick', 'block', 'swing', 'fireballHit', 'fireballLaunch', 'land', 'jump', 'hurt', 'special', 'ko'] as const) {
    const original = audio[m].bind(audio) as (...a: number[]) => void;
    (audio as unknown as Record<string, unknown>)[m] = (...a: number[]): void => {
      chamadas.push(m);
      original(...a);
    };
  }
  let banco: BancoDeAmostras | null = null;
  if (o.banco !== false) {
    const pacote = criarPacote(o.pacote);
    banco = new BancoDeAmostras(pacote.manifesto, { baseUrl: '/assets/sons/', buscar: pacote.buscar, decodificar: pacote.decodificar, aviso: () => undefined });
    registrarBancoDeAmostras(banco);
    const nomes = ['base', ...(o.folhas ?? ['hayato', 'caio'])];
    banco.prepararLutadores(o.folhas ?? ['hayato', 'caio']);
    banco.sincronizar(c as unknown as BaseAudioContext);
    for (let i = 0; i < 500 && !nomes.every((n) => banco?.estadoDaFolha(n) === 'pronta'); i++) await new Promise((r) => setTimeout(r, 0));
    expect(nomes.every((n) => banco?.estadoDaFolha(n) === 'pronta')).toBe(true);
  }
  return { c, audio, banco, chamadas };
}
const tocar = (s: Cena, eventos: EventoLuta[], ctx: ContextoSonoro = ctxSom()): void => reagirComIdentidade(s.audio, eventos, ctx, (fn) => fn(), true);

describe('execução: com o buffer decodificado toca a amostra; sem ele, a síntese de hoje', () => {
  it('banco ausente, ou folhas ainda no ar: o som é IDÊNTICO ao de hoje (mesmos métodos chamados, mesma forma de onda, bit a bit)', { timeout: 30_000 }, async () => {
    const referencia = await cena({ banco: false });
    tocar(referencia, BATERIA);
    const ref = referencia.c.renderizar(3);
    // banco registrado, mas NENHUMA folha decodificada (rede lenta, 1ª luta): nada muda
    const s = await cena({ folhas: [] });
    s.banco?.sincronizar(null);
    const c = new Contexto(TAXA);
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
    audio.init();
    const vazio = new BancoDeAmostras(criarPacote().manifesto, { baseUrl: '/x/', buscar: async () => { throw new TypeError('rede'); }, aviso: () => undefined });
    registrarBancoDeAmostras(vazio);
    reagirComIdentidade(audio, BATERIA, ctxSom(), (fn) => fn(), true);
    const obtido = c.renderizar(3);
    expect(obtido.length).toBe(ref.length);
    let diferentes = 0;
    for (let i = 0; i < ref.length; i++) if (obtido[i] !== ref[i]) diferentes++;
    expect(diferentes).toBe(0);
    expect(c.criados).toEqual(referencia.c.criados);
  });

  it('chave `AMOSTRAS_REALISTAS` desligada (rollback) = o som de hoje mesmo com o banco cheio', async () => {
    const referencia = await cena({ banco: false });
    tocar(referencia, BATERIA);
    const s = await cena();
    chavesSonoras.amostras = false;
    tocar(s, BATERIA);
    expect(s.c.criados).toEqual(referencia.c.criados);
    expect(s.chamadas).toEqual(referencia.chamadas);
  });

  it('banco cheio: o `punch` NÃO toca junto do `imp.soco.*` (a amostra toma o lugar), e a voz de dano é a amostra, não a síntese', async () => {
    const s = await cena();
    tocar(s, [hit({})]);
    expect(s.chamadas).not.toContain('punch');
    expect(s.chamadas).not.toContain('hurt');
    expect(s.c.criados.fonte).toBe(2); // o soco e a voz do CAIO: uma fonte de buffer cada
    expect(s.c.criados.osc).toBe(0); // nenhum oscilador: nem síntese do soco, nem voz formante
    const sintese = await cena({ banco: false });
    tocar(sintese, [hit({})]);
    expect(sintese.c.criados.osc).toBeGreaterThan(3);
  });

  it('cada método genérico trocado por amostra deixa de ser chamado; o que NÃO tem amostra segue sendo chamado', async () => {
    const s = await cena();
    tocar(s, [
      { tipo: 'swing', lutador: 0, golpe: 'punch' },
      { tipo: 'swing', lutador: 1, golpe: 'kick' },
      { tipo: 'block', atacante: 1, defensor: 0, x: 0, y: 0, dir: 1, texto: null },
      { tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: TXT },
      { tipo: 'jump', lutador: 0 },
      { tipo: 'land', lutador: 0 },
      { tipo: 'clash', x: 0, y: 0 },
      { tipo: 'esquiva', lutador: 0, dir: 1, x: 0 },
    ]);
    expect(s.chamadas).toEqual([]);
    const f = await cena();
    tocar(f, [{ tipo: 'deny', lutador: 0 }, { tipo: 'perfect', vencedor: 0 }]);
    expect(f.c.criados.osc + f.c.criados.fonte).toBeGreaterThan(0); // aviso e jingle: síntese de propósito
  });

  it('lacuna no pacote (sem `defesa` nem `esp.e1.raio`): só aquele som cai na síntese, o resto segue com amostra', async () => {
    const s = await cena({ pacote: { sem: ['defesa', 'esp.e1.raio'] } });
    tocar(s, [{ tipo: 'block', atacante: 1, defensor: 0, x: 0, y: 0, dir: 1, texto: null }, hit({})]);
    expect(s.chamadas).toEqual(['block']);
    const spA = await cena({ pacote: { sem: ['esp.e1.raio'] } });
    tocar(spA, [{ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' }]);
    const comFamilia = await cena();
    tocar(comFamilia, [{ tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' }]);
    // com a família: 1 fonte a mais (a amostra) por cima da assinatura reduzida a ataque+corpo a -6 dB
    expect(comFamilia.c.criados.fonte).toBeGreaterThan(spA.c.criados.fonte);
  });

  it('a família sobrepõe a assinatura a -6 dB, só com `ataque` e `corpo` (a cauda e o extra saem); sem a família a assinatura toca inteira', async () => {
    const ev: EventoLuta = hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit', grande: true });
    const com = await cena();
    const sem = await cena({ pacote: { sem: ['esp.e1.raio', 'magia.impacto'] } });
    tocar(com, [ev]);
    tocar(sem, [ev]);
    const plano = planoSonoro(ev, ctxSom(), undefined, true);
    const estampa = plano.tocar.find((i) => i.amostra?.ids[0] === 'esp.e1.raio');
    if (!estampa) throw new Error('sem estampa');
    const inteira = fontesDaReceita(estampa.receita);
    const reduzida = fontesDaReceita(estampa.receita.filter((c) => c.k === 'V' || (c.camada ?? 'corpo') === 'ataque' || (c.camada ?? 'corpo') === 'corpo'));
    expect(reduzida).toBeLessThan(inteira); // a assinatura do HAYATO tem cauda/extra: sob a família ela encolhe
    expect(com.c.criados.osc + com.c.criados.fonte).toBeLessThan(sem.c.criados.osc + sem.c.criados.fonte + 4);
  });

  it('A/B da escuta: `ligado = false` devolve a síntese de hoje; o vidro da guarda pode ser calado quando a amostra toca', async () => {
    const referencia = await cena({ banco: false });
    const s = await cena();
    if (!s.banco) throw new Error('sem banco');
    s.banco.ligado = false;
    tocar(referencia, BATERIA);
    tocar(s, BATERIA);
    expect(s.c.criados).toEqual(referencia.c.criados);
    const qg: EventoLuta = { tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT };
    const com = await cena();
    tocar(com, [qg]);
    const mudo = await cena();
    if (!mudo.banco) throw new Error('sem banco');
    mudo.banco.vidroSobreGuarda = false;
    tocar(mudo, [qg]);
    expect(mudo.c.criados.osc + mudo.c.criados.fonte).toBeLessThan(com.c.criados.osc + com.c.criados.fonte);
  });

  it('a voz-amostra passa pela GARGANTA do lutador: a anti-metralhadora (80 ms) segura o 2º dano, e o KO não é interrompido por outra voz do mesmo lutador', async () => {
    const s = await cena();
    tocar(s, [hit({}), hit({})]); // dois danos no mesmo instante no CAIO: a voz do 2º cede, os impactos tocam
    expect(s.c.criados.fonte).toBe(3); // 2 socos + 1 voz
    const k = await cena();
    tocar(k, [{ tipo: 'ko', defensor: 1, pitch: 1 }]);
    const antes = k.c.criados.fonte;
    tocar(k, [hit({ atacante: 0, defensor: 1 })]); // o CAIO já caiu: o dano não canta por cima do KO
    expect(k.c.criados.fonte - antes).toBe(1); // só o soco
  });

  it('o KO: voz-amostra, queda do corpo (agendada), e o gongo sintetizado continua (a marca do KO do jogo)', async () => {
    const s = await cena();
    const agendados: number[] = [];
    reagirComIdentidade(s.audio, [{ tipo: 'ko', defensor: 1, pitch: 1 }], ctxSom(), (fn, ms) => {
      agendados.push(ms);
      fn();
    }, true);
    expect(agendados).toEqual([ATRASO_QUEDA_KO_MS]);
    expect(s.c.criados.fonte).toBe(3); // a voz do KO, a queda e o ruído passa-baixa do gongo (que é fonte de buffer)
    expect(s.c.criados.osc).toBe(2); // o gongo: 2 senos
    expect(s.chamadas).not.toContain('ko');
  });

  it('o taxa de amostragem do contexto (iOS roda a 48 kHz) não muda o recorte: a duração tocada é a do corte', async () => {
    const a = await cena({ taxaCtx: 44100 });
    const b = await cena({ taxaCtx: 48000 });
    const pedido: PedidoAmostra = { ids: ['defesa'], u: 0, taxa: 1, ganho: 1 };
    const ea = a.banco?.escolher(pedido);
    const eb = b.banco?.escolher(pedido);
    expect(ea?.duracao).toBeCloseTo(eb?.duracao ?? -1, 2);
    expect(ea?.offset).toBeCloseTo(eb?.offset ?? -1, 3);
  });
});

describe('orçamento: cada amostra conta 1 fonte e o teto de 32 vale', () => {
  it('estresse "tudo ligado" com o banco cheio: o pior pacote de eventos 8 vezes seguidas fica nas 32 fontes, com menos nós que a síntese', async () => {
    const eventos: EventoLuta[] = [
      { tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' },
      hit({ grande: true }),
      hit({ grande: true, atacante: 1, defensor: 0 }),
      hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' }),
      { tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT },
      { tipo: 'swing', lutador: 0, golpe: 'kick' },
    ];
    const medir = async (comBanco: boolean): Promise<{ fontesPico: number; nos: number; osc: number; fonte: number }> => {
      const s = await cena({ banco: comBanco });
      let pico = 0;
      for (let i = 0; i < 8; i++) {
        s.c.currentTime = i * 0.05; // rajada: os pacotes se sobrepõem
        tocar(s, eventos, ctxSom('hayato', 'caio', 100 + i));
        pico = Math.max(pico, s.audio.fontesAtivas());
      }
      return { fontesPico: pico, nos: s.c.nos.length, osc: s.c.criados.osc, fonte: s.c.criados.fonte };
    };
    const com = await medir(true);
    const sem = await medir(false);
    console.log(`estresse com amostras: fontes no pico ${com.fontesPico} (síntese: ${sem.fontesPico}); nós criados ${com.nos} (síntese: ${sem.nos}); osciladores ${com.osc} (${sem.osc})`);
    expect(com.fontesPico).toBeLessThanOrEqual(FONTES_SIMULTANEAS);
    expect(sem.fontesPico).toBeLessThanOrEqual(FONTES_SIMULTANEAS);
    expect(com.nos).toBeLessThan(sem.nos); // a amostra alivia o orçamento (~3 nós contra ~15 de uma sílaba de voz formante)
  });

  it('rodada de 200 eventos misturados com o banco cheio: sem KO nem vitória nunca passa de 32 fontes; com eles, só pelo que a regra de hoje já permite (nada a mais que a síntese)', async () => {
    const semPrioridade3 = BATERIA.filter((e) => e.tipo !== 'ko' && e.tipo !== 'round');
    const rodar = async (comBanco: boolean, lista: EventoLuta[]): Promise<number> => {
      const s = await cena({ folhas: ['hayato', 'caio'], banco: comBanco });
      let pico = 0;
      for (let i = 0; i < 200; i++) {
        s.c.currentTime = i * 0.02;
        tocar(s, [lista[(i * 7) % lista.length] as EventoLuta, lista[(i * 11 + 3) % lista.length] as EventoLuta], ctxSom('hayato', 'caio', 100 + i));
        pico = Math.max(pico, s.audio.fontesAtivas());
      }
      return pico;
    };
    expect(await rodar(true, semPrioridade3)).toBeLessThanOrEqual(FONTES_SIMULTANEAS);
    const comTudo = await rodar(true, BATERIA);
    const sintese = await rodar(false, BATERIA);
    console.log(`200 eventos: pico com amostras ${comTudo}, síntese ${sintese}`);
    expect(comTudo).toBeLessThanOrEqual(Math.max(sintese, FONTES_SIMULTANEAS) + 2);
  });

  it('o custo por evento com o banco cheio não passa o da síntese (o plano com `amostras` é barato; Node, relativo)', async () => {
    const ev = hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' });
    const medir = (amostras: boolean): number => {
      const t: number[] = [];
      for (let rep = 0; rep < 3; rep++) {
        const tempos: number[] = [];
        for (let tick = 0; tick < 3000; tick++) {
          const t0 = performance.now();
          planoSonoro(ev, ctxSom('hayato', 'caio', tick), undefined, amostras);
          tempos.push(performance.now() - t0);
        }
        tempos.sort((a, b) => a - b);
        t.push(tempos[Math.floor(tempos.length * 0.99)] as number);
      }
      return Math.min(...t);
    };
    const com = medir(true);
    const sem = medir(false);
    console.log(`planoSonoro p99: com amostras ${com.toFixed(3)} ms, sem ${sem.toFixed(3)} ms`);
    expect(com).toBeLessThanOrEqual(sem * 3 + 0.2);
  });
});
