import { describe, expect, it } from 'vitest';
import { AudioSys } from '../../src/audio/audio-sys';
import { planoSonoro, reagirComIdentidade, type ContextoSonoro } from '../../src/audio/identidade-sonora';
import type { EventoLuta, IndiceLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { cortarParaOrcamento, fontesDaReceita } from '../../src/audio/orcamento-sonoro';
import { ASSINATURAS } from '../../src/data/sons';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { TAXA } from '../support/descritores';

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

  it('o plano é barato: p99 < 1 ms por evento (Node; o orçamento do celular é medido no Chromium, N3)', () => {
    const ev = hit({ especial: true, golpe: 'sFire', projetil: true, snd: 'fireballHit' });
    const tempos: number[] = [];
    for (let tick = 0; tick < 3000; tick++) {
      const t0 = performance.now();
      planoSonoro(ev, ctx('hayato', 'caio', tick));
      tempos.push(performance.now() - t0);
    }
    tempos.sort((a, b) => a - b);
    const p99 = tempos[Math.floor(tempos.length * 0.99)] as number;
    console.log(`planoSonoro: p50 ${(tempos[1500] as number).toFixed(3)} ms, p99 ${p99.toFixed(3)} ms`);
    expect(p99).toBeLessThan(1);
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
