import { describe, expect, it } from 'vitest';
import { AudioSys } from '../../src/audio/audio-sys';
import { planoSonoro, reagirComIdentidade, type ContextoSonoro } from '../../src/audio/identidade-sonora';
import type { EventoLuta, IndiceLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { cortarParaOrcamento, fontesDaReceita } from '../../src/audio/orcamento-sonoro';
import { ASSINATURAS } from '../../src/data/sons';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { TAXA } from '../support/descritores';
import { menorP99, p99DaFight, percentil, RUIDO_RELOGIO_MS } from '../support/orcamento-musica';

/* Sons por lutador: o jogo inteiro com os DADOS REAIS (10 vozes, 33 assinaturas) pelo caminho de produção, no AudioSys real sobre o motor offline. */
const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
const hit = (o: object): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5, ...o }) as EventoLuta;
const ctx = (a: 'hayato' | 'camille' | 'nila' | 'zenon' | 'min-ji', b: 'caio' | 'baatar' = 'caio', tick = 100): ContextoSonoro => ({ ids: [a, b], fichas: [null, null], semente: 17, tick });

describe('integração com os dados reais', () => {
  it('estresse: especial + 2 danos pesados + impacto + guarda quebrada no mesmo tick: <= 32 fontes; o KO depois passa só pelas fontes mínimas dele; o limitador segura o pico', () => {
    const c = new Contexto(TAXA);
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
    audio.init();
    const eventos: EventoLuta[] = [
      { tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' },
      hit({ grande: true }),
      hit({ grande: true, atacante: 1, defensor: 0 }),
      hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' }),
      { tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT },
    ];
    reagirComIdentidade(audio, eventos, ctx('hayato'), (fn) => fn(), true);
    expect(audio.fontesAtivas()).toBeGreaterThan(0);
    expect(audio.fontesAtivas()).toBeLessThanOrEqual(32);
    // o KO (prioridade 3) não cede: passa do teto no máximo pelas fontes que sobram depois de cortar tudo o que dá
    const ko: EventoLuta = { tipo: 'ko', defensor: 1, pitch: 1 };
    const minimas = planoSonoro(ko, ctx('hayato')).tocar.reduce((n, i) => n + fontesDaReceita(cortarParaOrcamento(i.receita, 0)), 0);
    reagirComIdentidade(audio, [ko], ctx('hayato'), (fn) => fn(), true);
    console.log(`estresse: ${audio.fontesAtivas()} fontes ativas com o KO (mínimo do KO: ${minimas})`);
    expect(audio.fontesAtivas()).toBeLessThanOrEqual(32 + minimas);
    const amostras = c.renderizar();
    let pico = 0;
    for (const v of amostras) pico = Math.max(pico, Math.abs(v));
    console.log(`estresse: pico depois do limitador (modelo simples, não o do Chromium) ${pico.toFixed(2)}`);
    expect(pico).toBeLessThanOrEqual(0.99);
  });

  it('todo evento do jogo passa pelo plano sem lançar, com qualquer par de lutadores e as duas posturas da NILA', () => {
    const golpes = ['sFire', 'sDown', 'sFwd'];
    const eventos: EventoLuta[] = [];
    for (const g of golpes) {
      eventos.push({ tipo: 'special', lutador: 0, pitch: 1, golpe: g, ficha: null, momento: 'inicio' }, { tipo: 'special', lutador: 1, pitch: 1, golpe: g, ficha: 'sarpa', momento: 'inicio' });
      eventos.push(hit({ especial: true, golpe: g }), hit({ especial: true, golpe: g, projetil: true, snd: 'fireballHit', nivelCarga: 3, dreno: 4, contraEspecial: true, acertos: 3 }));
      eventos.push({ tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: TXT, especial: true, golpe: g });
      eventos.push({ tipo: 'block', atacante: 0, defensor: 1, x: 0, y: 0, dir: 1, texto: null, golpe: g, especial: true });
      eventos.push({ tipo: 'parry', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT, golpe: g }, { tipo: 'clash', x: 0, y: 0, lutador: 1, golpe: g });
    }
    eventos.push({ tipo: 'carga', lutador: 0, nivel: 1 }, { tipo: 'carga', lutador: 0, nivel: 3 }, { tipo: 'rebote', lutador: 0, x: 0 }, { tipo: 'troca-ficha', lutador: 0, ficha: 'sarpa' }, { tipo: 'troca-ficha', lutador: 0, ficha: null });
    eventos.push({ tipo: 'armor', atacante: 0, defensor: 1, x: 0, y: 0, snd: 'punch', texto: TXT }, { tipo: 'round', fase: 'end', round: 2, vencedor: 0, fimDaLuta: true }, { tipo: 'projectile', lutador: 0, x: 0, y: 0, style: 'anel' });
    const lutadores = ['hayato', 'camille', 'nila', 'zenon', 'min-ji'] as const;
    let itens = 0;
    for (const a of lutadores)
      for (const b of ['caio', 'baatar'] as const)
        for (const fichas of [[null, null], ['sarpa', 'chefe2'], ['chefe', null]] as [string | null, string | null][])
          for (const ev of eventos) itens += planoSonoro(ev, { ...ctx(a, b), fichas }, undefined).tocar.length;
    expect(itens).toBeGreaterThan(500);
  });

  it('o plano é barato, RELATIVO à trilha `fight`: o p99 de planejar um evento não passa do p99 de um tick do `scheduler()` da `fight` de hoje (Node; o celular é do N3)', () => {
    // o absoluto `p99 < 1 ms` não vale nem para a `fight` no Chromium com CPU 4x (N3 da Íris: 9,5 ms), então a régua é a música que já está no jogo
    const p99Fight = p99DaFight();
    const ev = hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' });
    const p99 = menorP99(() => {
      const tempos: number[] = [];
      for (let tick = 0; tick < 3000; tick++) {
        const t0 = performance.now();
        planoSonoro(ev, ctx('hayato', 'caio', tick));
        tempos.push(performance.now() - t0);
      }
      return tempos;
    }, 3);
    console.log(`planoSonoro: p99 ${p99.toFixed(3)} ms (tick da fight: p99 ${p99Fight.toFixed(3)} ms)`);
    expect(p99).toBeLessThanOrEqual(p99Fight + RUIDO_RELOGIO_MS);
  });

  it('o evento inteiro (plano + montar o grafo no AudioSys real, o pior caso: especial + projétil + dano) custa, no p99, no máximo 10 x um tick da `fight` (relativo, Node)', () => {
    const p99Fight = p99DaFight();
    const ev = hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' });
    const p99 = menorP99(() => {
      const c = new Contexto(TAXA);
      const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
      audio.init();
      const tempos: number[] = [];
      for (let tick = 0; tick < 800; tick++) {
        c.currentTime = tick * 0.5; // cada evento num instante novo: as fontes do anterior já acabaram (o teto de 32 não interfere na medida)
        const t0 = performance.now();
        reagirComIdentidade(audio, [ev], ctx('hayato', 'caio', tick), (fn) => fn(), true);
        tempos.push(performance.now() - t0);
      }
      return tempos;
    }, 3);
    console.log(`evento inteiro: p99 ${p99.toFixed(3)} ms (tick da fight: p99 ${p99Fight.toFixed(3)} ms)`);
    expect(p99).toBeLessThanOrEqual(10 * p99Fight + RUIDO_RELOGIO_MS);
  });

  it('mesma semente + mesmo tick = mesmo plano (determinismo); a ordem dos outros eventos não desloca a variação', () => {
    const a = JSON.stringify(planoSonoro(hit({}), { ...ctx('hayato'), indice: 3 }));
    expect(JSON.stringify(planoSonoro(hit({}), { ...ctx('hayato'), indice: 3 }))).toBe(a);
    // o índice do evento no tick entra na variação, o resto do tick não
    expect(JSON.stringify(planoSonoro(hit({}), { ...ctx('hayato'), indice: 4 }))).not.toBe(a);
  });

  it('os 33 especiais têm assinatura e cada um toca algo no início, no sucesso ou no acerto', () => {
    expect(Object.keys(ASSINATURAS)).toHaveLength(33);
    for (const [chave, a] of Object.entries(ASSINATURAS)) {
      const algo = a.grito !== null || a.conjuracao.length > 0 || (a.sucesso?.chamadas.length ?? 0) > 0 || a.estampa.length > 0;
      expect(algo, chave).toBe(true);
    }
    void ({} as IndiceLutador);
  });
});

describe('tudo ligado (tema do adversário + identidade sonora) contra o jogo de antes (`fight` + sons genéricos), no mesmo AudioSys offline', () => {
  /** Uma luta sintética de 20 s: a música e, a cada 0,4 s, o pior pacote de eventos (especial + 2 danos pesados + impacto de projétil + guarda quebrada). */
  const rodar = (musica: 'fight' | 'tema:caio', identidade: boolean): { fontesTotaisPico: number; efeitosPico: number; nosPorSegundo: number; tickP99: number } => {
    const c = new Contexto(TAXA);
    let tick: (() => void) | null = null;
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: identidade, sementeVariacao: 23, setInterval: (fn) => ((tick = fn), 1), clearInterval: () => undefined });
    audio.init();
    const nosInit = c.nos.length;
    audio.startMusic(musica);
    const eventos: EventoLuta[] = [
      { tipo: 'special', lutador: 0, pitch: 1, golpe: 'sFire', ficha: null, momento: 'inicio' },
      hit({ grande: true }),
      hit({ grande: true, atacante: 1, defensor: 0 }),
      hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' }),
      { tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TXT },
    ];
    let efeitosPico = 0;
    const ticks: number[] = [];
    let proximo = 0.4;
    for (let t = 0; t < 20; t += 0.025) {
      c.currentTime = t;
      const a = performance.now();
      (tick as (() => void) | null)?.();
      ticks.push(performance.now() - a);
      if (t >= proximo) {
        proximo += 0.4;
        reagirComIdentidade(audio, eventos, ctx('hayato', 'caio', Math.round(t * 60)), (fn) => fn(), identidade);
      }
      efeitosPico = Math.max(efeitosPico, audio.fontesAtivas());
    }
    const fontes = c.nos.filter((n) => 'inicio' in n && (n as { inicio: number }).inicio >= 0) as unknown as { inicio: number; fim: number }[];
    const marcas = fontes.flatMap((f) => [{ t: f.inicio, d: 1 }, { t: Number.isFinite(f.fim) ? f.fim : f.inicio, d: -1 }]).sort((a, b) => a.t - b.t || a.d - b.d);
    let atual = 0;
    let pico = 0;
    for (const m of marcas) pico = Math.max(pico, (atual += m.d));
    return { fontesTotaisPico: pico, efeitosPico, nosPorSegundo: (c.nos.length - nosInit) / 20, tickP99: percentil(ticks, 0.99) };
  };

  it('o teto de 32 fontes dos efeitos vale com tudo ligado e o custo do grafo fica perto do de antes (medido; Node, sem o iOS)', () => {
    const antes = rodar('fight', false);
    const agora = rodar('tema:caio', true);
    console.log(`ANTES (fight + genéricos): fontes totais no pico ${antes.fontesTotaisPico}, efeitos ${antes.efeitosPico}, ${antes.nosPorSegundo.toFixed(0)} nós/s`);
    console.log(`AGORA (tema CAIO + identidade): fontes totais no pico ${agora.fontesTotaisPico}, efeitos ${agora.efeitosPico}, ${agora.nosPorSegundo.toFixed(0)} nós/s (${(agora.nosPorSegundo / antes.nosPorSegundo).toFixed(2)} x)`);
    expect(agora.efeitosPico).toBeLessThanOrEqual(32);
    // a música tem teto próprio (15 ativas); os efeitos, 32: o total possível é a soma, e o pior pacote de eventos de uma luta real fica abaixo disso
    expect(agora.fontesTotaisPico).toBeLessThanOrEqual(15 + 32);
    // o grafo montado por segundo (a CPU do agendamento no celular), no PIOR caso (5 eventos a cada 0,4 s): a identidade acrescenta nós por evento (a voz tem ~15 nós) e o tema tira (menos nós que a `fight`); medido 1,75 x
    expect(agora.nosPorSegundo).toBeLessThanOrEqual(2.2 * antes.nosPorSegundo);
  });
});
