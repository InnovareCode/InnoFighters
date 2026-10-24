import { describe, expect, it } from 'vitest';
import {
  duracaoCurta,
  duracaoDoBalao,
  fimDoRoteiro,
  linhaDaProvocacao,
  modoDaProvocacao,
  montarRoteiro,
  poseDoPapel,
  PROVOCACAO,
  Provocacao,
  provocacaoLigada,
  resolverPose,
  SOM_DA_VITORIA,
  SOM_DO_BALAO,
  blip,
  type DadosDaLuta,
  type FalaDoRoteiro,
  type ModoProvocacao,
  type Roteiro,
  type SomDaProvocacao,
  type TipoProvocacao,
} from '../../src/render/provocacao';
import { ALTURA_DA_FAIXA } from '../../src/render/entrada-chefe';
import { hasPose } from '../../src/data/poses';
import { montarElenco } from '../../ferramentas/balanco/elenco';

/*
 * P2 (Lyra): a LINHA DO TEMPO PURA da provocação (docs/spec-provocacao-prerround-e-vitoria.md §3), as decisões puras (ligada? que modo?) e o controlador.
 * Os números esperados são LITERAIS da spec (nunca importados do código sob teste: teste que compara com a constante importada é tautologia).
 */

const fala = (falante: 0 | 1, n: number): FalaDoRoteiro => ({ falante, texto: 'x'.repeat(n), n });
const quem = { pitch: [1.05, 0.82] as const, nomes: ['HAYATO', 'WEI LONG'] as const, cores: ['#6fe0ff', '#d58bff'] as const };

describe('durações (spec §3)', () => {
  it('COMPLETA: clamp(24 + round(2,5 n), 84, 190): 40 car. = 124 (2,1 s), 56 car. = 164; piso 84 e teto 190', () => {
    expect(duracaoDoBalao(40)).toBe(124);
    expect(duracaoDoBalao(56)).toBe(164);
    expect(duracaoDoBalao(10)).toBe(84);
    expect(duracaoDoBalao(64)).toBe(184);
    expect(duracaoDoBalao(500)).toBe(190);
  });

  it('round 2+: a mesma fórmula com teto 126 (34 car. = 109)', () => {
    expect(duracaoDoBalao(34, 'rodada')).toBe(109);
    expect(duracaoDoBalao(60, 'rodada')).toBe(126);
    expect(duracaoDoBalao(60, 'abertura')).toBe(174);
  });

  it('CURTA: clamp(20 + round(1,6 n), 72, 120)', () => {
    expect(duracaoCurta(10)).toBe(72);
    expect(duracaoCurta(40)).toBe(84);
    expect(duracaoCurta(64)).toBe(120); // 20 + 102 = 122, no teto de 120
    expect(duracaoCurta(200)).toBe(120);
  });
});

describe('o roteiro (puro): os totais da spec', () => {
  it('round 1 COMPLETA: 80 + D1 + D2; o balão do P1 abre no tick 44 e o do P2 em 54 + D1', () => {
    const n1 = 40;
    const n2 = 56;
    const d1 = 124;
    const d2 = 164;
    const r = montarRoteiro('abertura', 'completa', false, [fala(0, n1), fala(1, n2)]);
    expect(r.total).toBe(80 + d1 + d2);
    expect(r.janelas.map((j) => [j.falante, j.abre, j.fecha, j.fim])).toEqual([
      [0, 44, 44 + d1, 50 + d1],
      [1, 54 + d1, 54 + d1 + d2, 60 + d1 + d2],
    ]);
    expect(r.faixas).toBe(true);
    expect(r.hud).toBe(false);
    expect(r.overlay).toBe(false);
    expect(r.andada).toBe(true);
    expect(r.puloAPartirDe).toBe(10);
  });

  it('o teto de 7,7 s do round 1: duas falas de 64 caracteres dão 80 + 184 + 184 = 448 ticks', () => {
    expect(montarRoteiro('abertura', 'completa', false, [fala(0, 64), fala(1, 64)]).total).toBe(448);
  });

  it('round 1 CURTA: os dois balões juntos, texto inteiro; D = duracaoCurta(maior) e total = D + 6 (<= 126)', () => {
    const r = montarRoteiro('abertura', 'curta', false, [fala(0, 30), fala(1, 64)]);
    expect(r.janelas.map((j) => [j.abre, j.fecha])).toEqual([
      [0, 120],
      [0, 120],
    ]);
    expect(r.total).toBe(126);
    expect(r.faixas).toBe(false);
    expect(r.hud).toBe(true);
    expect(r.overlay).toBe(false); // o "ROUND 1" fica escondido: o balão é a abertura
    expect(r.andada).toBe(false);
    expect(r.janelas.every((j) => !j.revelar)).toBe(true);
  });

  it('round 2+: UM balão; total = D + 6 com D <= 126 (cerca de 2 s); sem faixas; HUD visível; letras a partir do tick 8', () => {
    const r = montarRoteiro('rodada', 'completa', false, [fala(1, 34)]);
    expect(r.janelas).toHaveLength(1);
    expect(r.janelas[0]).toMatchObject({ falante: 1, abre: 0, letrasEm: 8, fecha: 109, fim: 115 });
    expect(r.total).toBe(115);
    expect(r.faixas).toBe(false);
    expect(r.hud).toBe(true);
    expect(montarRoteiro('rodada', 'completa', false, [fala(0, 200)]).total).toBe(126 + 6);
  });

  it('round 2+ CURTA (cinemática CURTA/DESLIGADA): texto inteiro com fade, sem pop, duracaoCurta(n) + 6 (~2 s), HUD fica', () => {
    const r = montarRoteiro('rodada', 'curta', false, [fala(1, 34)]);
    expect(r.janelas[0]).toMatchObject({ abre: 0, letrasEm: 0, revelar: false, fecha: 74, fim: 80 });
    expect(r.total).toBe(80);
    expect(r.faixas).toBe(false);
    expect(r.hud).toBe(true);
    expect(r.overlay).toBe(false);
    const b = linhaDaProvocacao(r, 4).baloes[0];
    expect(b?.letras).toBe(Infinity);
    expect(b?.escala).toBe(1);
    expect(montarRoteiro('rodada', 'curta', false, [fala(0, 200)]).total).toBe(120 + 6);
  });

  it('vitória COMPLETA: balão em 16, fala inteira + ▶ por 30 ticks, fecha em 46 + D e a provocação acaba em 64 + D', () => {
    const d = 144; // 48 caracteres
    const r = montarRoteiro('vitoria', 'completa', false, [fala(1, 48)]);
    expect(r.janelas[0]).toMatchObject({ falante: 1, abre: 16, letrasEm: 16, fecha: 46 + d, fim: 52 + d });
    expect(r.total).toBe(64 + d);
    expect(r.faixas).toBe(true);
    expect(r.hud).toBe(false);
    expect(r.vencedor).toBe(1);
    expect(r.zoomFinal).toBe(1.08);
    expect(r.puloAPartirDe).toBe(24);
  });

  it('vitória CURTA: sem faixas e sem zoom; HUD e o título (X VENCE!) ficam; duracaoCurta(n) + 6', () => {
    const r = montarRoteiro('vitoria', 'curta', false, [fala(0, 48)]);
    expect(r.total).toBe(duracaoCurta(48) + 6);
    expect(r.total).toBeLessThanOrEqual(126);
    expect(r.faixas).toBe(false);
    expect(r.zoomFinal).toBe(1);
    expect(r.hud).toBe(true);
    expect(r.overlay).toBe(true);
  });

  it('movimento reduzido NÃO muda as durações (o tempo de leitura é o mesmo)', () => {
    const casos: Array<[TipoProvocacao, ModoProvocacao, FalaDoRoteiro[]]> = [
      ['abertura', 'completa', [fala(0, 40), fala(1, 50)]],
      ['abertura', 'curta', [fala(0, 40), fala(1, 50)]],
      ['rodada', 'completa', [fala(0, 30)]],
      ['vitoria', 'completa', [fala(1, 48)]],
      ['vitoria', 'curta', [fala(1, 48)]],
    ];
    for (const [t, m, f] of casos) expect(montarRoteiro(t, m, true, f).total, `${t} ${m}`).toBe(montarRoteiro(t, m, false, f).total);
  });
});

describe('linhaDaProvocacao (pura do tick)', () => {
  const r1 = montarRoteiro('abertura', 'completa', false, [fala(0, 40), fala(1, 56)]); // D1 = 124, D2 = 164

  it('faixas: 0 -> 56 px em 20 ticks, ficam e saem nos últimos 20', () => {
    expect(ALTURA_DA_FAIXA).toBe(56);
    expect(linhaDaProvocacao(r1, 0).faixa).toBe(0);
    expect(linhaDaProvocacao(r1, 10).faixa).toBeGreaterThan(0);
    expect(linhaDaProvocacao(r1, 10).faixa).toBeLessThan(56);
    expect(linhaDaProvocacao(r1, 20).faixa).toBe(56);
    expect(linhaDaProvocacao(r1, r1.total - 20).faixa).toBe(56);
    expect(linhaDaProvocacao(r1, r1.total - 10).faixa).toBeLessThan(56);
    expect(linhaDaProvocacao(r1, r1.total).faixa).toBe(0);
  });

  it('andada: o P1 entra de dx = -260 e o P2 de +260 até 0 em 40 ticks (easeOut); depois dos 40 ficam parados', () => {
    const q0 = linhaDaProvocacao(r1, 0);
    expect(q0.deslocamento).toEqual([-260, 260]);
    expect(q0.papeis).toEqual(['andando', 'andando']);
    const q20 = linhaDaProvocacao(r1, 20);
    expect(q20.deslocamento[0]).toBeGreaterThan(-260);
    expect(q20.deslocamento[0]).toBeLessThan(0);
    expect(q20.deslocamento[1]).toBe(-q20.deslocamento[0]);
    const q40 = linhaDaProvocacao(r1, 40);
    expect(q40.deslocamento[0] === 0 && q40.deslocamento[1] === 0).toBe(true);
    expect(q40.papeis).toEqual(['parado', 'parado']);
    // monotônico: nunca recua
    let ant = -Infinity;
    for (let t = 0; t <= 40; t++) {
      const d = linhaDaProvocacao(r1, t).deslocamento[0];
      expect(d).toBeGreaterThanOrEqual(ant);
      ant = d;
    }
  });

  it('o falante está em `provoca` só enquanto o balão dele está aberto; o outro fica parado olhando', () => {
    expect(linhaDaProvocacao(r1, 43).papeis).toEqual(['parado', 'parado']);
    expect(linhaDaProvocacao(r1, 44).papeis).toEqual(['provoca', 'parado']);
    expect(linhaDaProvocacao(r1, 44 + 124 - 1).papeis).toEqual(['provoca', 'parado']);
    expect(linhaDaProvocacao(r1, 44 + 124).papeis).toEqual(['parado', 'parado']); // o balão do P1 fecha, ele volta ao idle
    expect(linhaDaProvocacao(r1, 54 + 124).papeis).toEqual(['parado', 'provoca']);
  });

  it('o balão (Tarja de Impacto): pop de 8 ticks com overshoot (escala 0,6 -> ~1,05 -> 1), alfa em 4 ticks, letras a 1,5 por tick, fecha em 6', () => {
    const b = (t: number) => linhaDaProvocacao(r1, t).baloes[0];
    expect(b(43)).toBeUndefined();
    expect(b(44)?.alfa).toBe(0);
    expect(b(44)?.escala).toBeCloseTo(0.6, 6);
    expect(b(46)?.alfa).toBeCloseTo(0.5, 6);
    expect(b(48)?.alfa).toBe(1);
    const pico = Math.max(...Array.from({ length: 9 }, (_, k) => b(44 + k)?.escala ?? 0));
    expect(pico, 'overshoot do pop (direção de arte: ~1,05 perto do tick 5)').toBeGreaterThan(1.03);
    expect(pico).toBeLessThan(1.08);
    expect(b(44 + 8)?.escala).toBe(1);
    expect(b(52)?.escala).toBe(1);
    expect(b(52)?.alfa).toBe(1);
    // a variante, os ticks desde que abriu e a saída que o desenho usa
    expect(b(50)?.variante).toBe('abertura');
    expect(b(50)?.desde).toBe(6);
    expect(b(50)?.fechando).toBe(0);
    expect(b(50)?.reduz).toBe(false);
    expect(b(44 + 124 + 3)?.fechando).toBeCloseTo(0.5, 6);
    expect(b(44 + 10)?.letras).toBeCloseTo(15, 6);
    expect(b(44 + 124 + 3)?.alfa).toBeCloseTo(0.5, 6);
    expect(b(44 + 124 + 6)).toBeUndefined();
  });

  it('dois balões nunca abertos juntos no round 1 COMPLETA (um de cada vez); na CURTA, juntos', () => {
    for (let t = 0; t <= r1.total; t++) expect(linhaDaProvocacao(r1, t).baloes.length, `tick ${t}`).toBeLessThanOrEqual(1);
    const curta = montarRoteiro('abertura', 'curta', false, [fala(0, 40), fala(1, 56)]);
    expect(linhaDaProvocacao(curta, 30).baloes).toHaveLength(2);
  });

  it('CURTA: o texto entra inteiro (letras = Infinity) com fade de 8 ticks, sem pop', () => {
    const curta = montarRoteiro('abertura', 'curta', false, [fala(0, 40), fala(1, 56)]);
    const b = linhaDaProvocacao(curta, 4).baloes[0];
    expect(b?.letras).toBe(Infinity);
    expect(b?.alfa).toBeCloseTo(0.5, 6);
    expect(b?.escala).toBe(1);
  });

  it('vitória COMPLETA: push-in de 1,00 a 1,08 em 40 ticks; só o vencedor tem papel (o perdedor fica como o motor deixou); ▶ com o texto todo', () => {
    const v = montarRoteiro('vitoria', 'completa', false, [fala(1, 48)]);
    expect(linhaDaProvocacao(v, 0).zoom).toBe(1);
    expect(linhaDaProvocacao(v, 20).zoom).toBeGreaterThan(1);
    expect(linhaDaProvocacao(v, 40).zoom).toBeCloseTo(1.08, 9);
    expect(linhaDaProvocacao(v, 100).zoom).toBeCloseTo(1.08, 9);
    expect(linhaDaProvocacao(v, 10).papeis).toEqual([null, 'vitoria']);
    expect(linhaDaProvocacao(v, 16 + 20).baloes[0]?.seta).toBe(false); // 48 car. levam 32 ticks para aparecer
    expect(linhaDaProvocacao(v, 16 + 33).baloes[0]?.seta).toBe(true);
    expect(linhaDaProvocacao(v, v.janelas[0]!.fecha).baloes[0]?.seta).toBe(false);
    expect(linhaDaProvocacao(v, 14).faixa).toBe(56);
  });

  it('pulou em `p`: acaba em `p + 6` (nunca depois do fim natural), faixas, balões e zoom se vão e a andada termina', () => {
    const v = montarRoteiro('vitoria', 'completa', false, [fala(1, 48)]);
    expect(fimDoRoteiro(v, 30)).toBe(36);
    expect(fimDoRoteiro(v, v.total - 2)).toBe(v.total);
    const q = (t: number) => linhaDaProvocacao(v, t, 30);
    expect(q(30).faixa).toBeGreaterThan(0);
    expect(q(36).faixa).toBe(0);
    expect(q(36).zoom).toBe(1);
    expect(q(33).baloes[0]?.alfa ?? 0).toBeLessThan(linhaDaProvocacao(v, 30, 30).baloes[0]?.alfa ?? 1);
    expect(q(36).baloes[0]?.alfa ?? 0).toBe(0);
    // pulou no meio da andada: os dois chegam ao lugar durante a saída
    const a = linhaDaProvocacao(r1, 14, 14);
    expect(Math.abs(a.deslocamento[0])).toBeGreaterThan(0);
    expect(linhaDaProvocacao(r1, 20, 14).deslocamento).toEqual([0, 0]);
  });

  it('MOVIMENTO REDUZIDO: em todos os quadros de todos os roteiros, deslocamento 0, zoom 1 e escala do balão 1; o texto entra inteiro', () => {
    const casos: Array<[TipoProvocacao, ModoProvocacao, FalaDoRoteiro[]]> = [
      ['abertura', 'completa', [fala(0, 40), fala(1, 56)]],
      ['abertura', 'curta', [fala(0, 40), fala(1, 56)]],
      ['rodada', 'completa', [fala(0, 30)]],
      ['vitoria', 'completa', [fala(1, 48)]],
      ['vitoria', 'curta', [fala(1, 48)]],
    ];
    for (const [t, m, f] of casos) {
      const r = montarRoteiro(t, m, true, f);
      for (let tick = 0; tick <= r.total; tick++) {
        for (const pulou of [null, 12, 30]) {
          const q = linhaDaProvocacao(r, tick, pulou);
          expect(q.deslocamento[0] === 0 && q.deslocamento[1] === 0, `${t} ${m} tick ${tick}`).toBe(true);
          expect(q.zoom, `${t} ${m} tick ${tick}`).toBe(1);
          for (const b of q.baloes) {
            expect(b.escala, `${t} ${m} tick ${tick}`).toBe(1);
            expect(b.letras).toBe(Infinity);
          }
        }
      }
      expect(r.andada, `${t} ${m}`).toBe(false);
    }
    // e sem a andada ninguém aparece como "andando" (fica em idle desde o 1º quadro)
    const r = montarRoteiro('abertura', 'completa', true, [fala(0, 40), fala(1, 56)]);
    expect(linhaDaProvocacao(r, 0).papeis).toEqual(['parado', 'parado']);
  });
});

describe('poses (só nomes que as poses atuais já têm)', () => {
  const prod = montarElenco();

  it('andada = walk0..7 (um quadro a cada 5 ticks); parado = idle0..3 (um a cada 8)', () => {
    expect([0, 4, 5, 39].map((t) => poseDoPapel('andando', 'hayato', t))).toEqual(['walk0', 'walk0', 'walk1', 'walk7']);
    expect([0, 7, 8, 31, 32].map((t) => poseDoPapel('parado', 'hayato', t))).toEqual(['idle0', 'idle0', 'idle1', 'idle3', 'idle0']);
  });

  it('quem fala: BAATAR devekh2, ZENON entrada2 e os demais provoca0 (que cai em `win`: sem arte nova, decisão do dono)', () => {
    expect(poseDoPapel('provoca', 'baatar', 50, 44)).toBe('devekh2');
    expect(poseDoPapel('provoca', 'zenon', 50, 44)).toBe('entrada2');
    expect(poseDoPapel('provoca', 'hayato', 50, 44)).toBe('provoca0');
    for (const id of Object.keys(prod)) {
      const ch = prod[id as keyof typeof prod];
      expect(hasPose(ch, 'provoca0'), `${id} ainda não tem provoca0 no atlas`).toBe(false);
      expect(resolverPose(ch, 'provoca0'), id).toBe('win');
      expect(resolverPose(ch, 'idle0'), id).toBe('idle0');
    }
  });

  it('o vencedor: a vitória do APRESENTACAO (BAATAR devekh0 -> win; ZENON vitoria0 -> vitoria1) ou provoca0 -> win', () => {
    expect([0, 29, 30, 99].map((t) => poseDoPapel('vitoria', 'baatar', t))).toEqual(['devekh0', 'devekh0', 'win', 'win']);
    expect([0, 39, 40, 99].map((t) => poseDoPapel('vitoria', 'zenon', t))).toEqual(['vitoria0', 'vitoria0', 'vitoria1', 'vitoria1']);
    expect([0, 19, 20, 99].map((t) => poseDoPapel('vitoria', 'caio', t))).toEqual(['provoca0', 'provoca0', 'win', 'win']);
  });

  it('o quadro provoca0 do Apolo, quando existir no atlas, vence sozinho (sem mudar código)', () => {
    const ch = { ...prod['hayato'], pd: { ...prod['hayato'].pd, provoca0: prod['hayato'].pd['win'] ?? prod['hayato'].pd['guard'] } } as typeof prod.hayato;
    expect(resolverPose(ch, 'provoca0')).toBe('provoca0');
  });
});

describe('quando a provocação existe (provocacaoLigada) e em que modo (modoDaProvocacao)', () => {
  const base: DadosDaLuta = { regras: { cinematica: true }, ligadas: true, modo: 'arcade', p1cpu: undefined, cpu: 1, chefe: false };
  const com = (o: Partial<DadosDaLuta>): DadosDaLuta => ({ ...base, ...o });

  it('liga no ARCADE, na LUTA vs CPU e no VERSUS de 2 jogadores (decisão do dono), no pré-round e na vitória', () => {
    for (const d of [com({}), com({ modo: 'cpu' }), com({ modo: 'versus', cpu: null })]) {
      expect(provocacaoLigada(d, 'prerround'), d.modo).toBe(true);
      expect(provocacaoLigada(d, 'vitoria'), d.modo).toBe(true);
    }
  });

  it('desliga: ?expansao=4, a opção PROVOCAÇÕES desligada, TREINO e CPU×CPU', () => {
    for (const d of [com({ regras: { cinematica: false } }), com({ ligadas: false }), com({ modo: 'training', cpu: null }), com({ p1cpu: 1, cpu: 1 })]) {
      expect(provocacaoLigada(d, 'prerround')).toBe(false);
      expect(provocacaoLigada(d, 'vitoria')).toBe(false);
    }
  });

  it('chefão: sem pré-round (a entrada do ZENON é o round 1 dele), com vitória', () => {
    const d = com({ chefe: true });
    expect(provocacaoLigada(d, 'prerround')).toBe(false);
    expect(provocacaoLigada(d, 'vitoria')).toBe(true);
  });

  it('o modo: round 1 COMPLETA na 1ª vez (CURTA se repetido); round 2+ só com a cinemática COMPLETA; vitória COMPLETA ou CURTA; movimento reduzido sem preferência = CURTA', () => {
    expect(modoDaProvocacao('abertura', 'completa', false, false)).toBe('completa');
    expect(modoDaProvocacao('abertura', 'completa', false, true)).toBe('curta');
    expect(modoDaProvocacao('abertura', 'curta', false, false)).toBe('curta');
    expect(modoDaProvocacao('abertura', 'desligada', false, false)).toBe('curta'); // a provocação é opção própria: a cinemática só escolhe o jeito
    expect(modoDaProvocacao('abertura', undefined, false, false)).toBe('completa');
    expect(modoDaProvocacao('abertura', undefined, true, false)).toBe('curta');
    expect(modoDaProvocacao('abertura', 'completa', true, false)).toBe('completa'); // preferência explícita vale; o movimento reduzido tira só andada, zoom e pop
    expect(modoDaProvocacao('rodada', 'completa', false, false)).toBe('completa');
    expect(modoDaProvocacao('rodada', 'completa', false, true)).toBe('completa'); // repetido só vale para o round 1
    // round 2+ SEMPRE (decisão do dono): a opção PROVOCAÇÕES liga e desliga; a cinemática só escolhe COMPLETA ou CURTA
    expect(modoDaProvocacao('rodada', 'curta', false, false)).toBe('curta');
    expect(modoDaProvocacao('rodada', 'desligada', false, false)).toBe('curta');
    expect(modoDaProvocacao('rodada', undefined, true, false)).toBe('curta');
    expect(modoDaProvocacao('rodada', undefined, false, false)).toBe('completa');
    expect(modoDaProvocacao('vitoria', 'completa', false, true)).toBe('completa');
    expect(modoDaProvocacao('vitoria', 'curta', false, false)).toBe('curta');
    expect(modoDaProvocacao('vitoria', 'desligada', false, false)).toBe('curta');
  });

  it('R-2/D-R8: `primeiroOuChefe` só restringe a COMPLETA do round 1; omitido (padrão `true`) é o comportamento de hoje', () => {
    // omitido = true: idêntico às linhas de cima (nenhuma regressão para quem chama com 4 args)
    expect(modoDaProvocacao('abertura', 'completa', false, false)).toBe('completa');
    // explícito true: mesma coisa
    expect(modoDaProvocacao('abertura', 'completa', false, false, true)).toBe('completa');
    // false (não é o 1º confronto do ARCADE nem o chefão, com `Regras.ritmo.provocacao` ligada): cai para CURTA mesmo sem repetir
    expect(modoDaProvocacao('abertura', 'completa', false, false, false)).toBe('curta');
    // repetido já bastava para CURTA; `primeiroOuChefe` não muda isso (continua curta nos dois casos)
    expect(modoDaProvocacao('abertura', 'completa', false, true, true)).toBe('curta');
    expect(modoDaProvocacao('abertura', 'completa', false, true, false)).toBe('curta');
    // round 2+ e vitória: `primeiroOuChefe` não entra (só vale para 'abertura', R-2 é só o round 1)
    expect(modoDaProvocacao('rodada', 'completa', false, false, false)).toBe('completa');
    expect(modoDaProvocacao('vitoria', 'completa', false, false, false)).toBe('completa');
  });
});

describe('o controlador Provocacao', () => {
  const iniciar = (r: Roteiro) => {
    const sons: SomDaProvocacao[] = [];
    const p = new Provocacao({ aoSom: (s) => sons.push(s) });
    p.iniciar(r, quem);
    return { p, sons };
  };
  const rodar = (p: Provocacao): number => {
    let n = 0;
    while (p.ativa && n < 5000) {
      p.avancar();
      n++;
    }
    return n;
  };

  it('termina em EXATAMENTE `total` avanços (round 1 COMPLETA, CURTA, round 2+ e vitória)', () => {
    const casos: Roteiro[] = [
      montarRoteiro('abertura', 'completa', false, [fala(0, 40), fala(1, 56)]),
      montarRoteiro('abertura', 'curta', false, [fala(0, 40), fala(1, 56)]),
      montarRoteiro('rodada', 'completa', false, [fala(0, 30)]),
      montarRoteiro('vitoria', 'completa', false, [fala(1, 48)]),
      montarRoteiro('vitoria', 'curta', false, [fala(0, 48)]),
    ];
    for (const r of casos) {
      const { p } = iniciar(r);
      expect(p.ativa).toBe(true);
      expect(rodar(p), `${r.tipo} ${r.modo}`).toBe(r.total);
      expect(p.ativa).toBe(false);
    }
  });

  it('pular antes do tick 10 (pré-round) ou 24 (vitória) NÃO vale; depois vale uma vez e acaba em <= 6 avanços', () => {
    for (const [r, limite] of [
      [montarRoteiro('abertura', 'completa', false, [fala(0, 40), fala(1, 56)]), 10],
      [montarRoteiro('rodada', 'completa', false, [fala(0, 30)]), 10],
      [montarRoteiro('vitoria', 'completa', false, [fala(1, 48)]), 24],
      [montarRoteiro('abertura', 'curta', false, [fala(0, 40), fala(1, 56)]), 10],
    ] as const) {
      const { p } = iniciar(r);
      for (let i = 0; i < limite - 1; i++) p.avancar();
      expect(p.pular(), `${r.tipo} antes do ${limite}`).toBe(false);
      p.avancar();
      expect(p.tick).toBe(limite);
      expect(p.pular(), `${r.tipo} no ${limite}`).toBe(true);
      expect(p.pular(), 'uma vez só').toBe(false);
      expect(rodar(p), `${r.tipo} saída`).toBeLessThanOrEqual(PROVOCACAO.saida);
      expect(p.ativa).toBe(false);
    }
  });

  it('UM pulo encerra a provocação INTEIRA, não só o balão da vez (os dois balões do round 1)', () => {
    const r = montarRoteiro('abertura', 'completa', false, [fala(0, 40), fala(1, 56)]);
    const { p } = iniciar(r);
    for (let i = 0; i < 60; i++) p.avancar(); // dentro do balão do P1
    expect(p.pular()).toBe(true);
    const resto = rodar(p);
    expect(resto).toBeLessThanOrEqual(6);
    expect(p.tick).toBeLessThan(70);
    expect(p.tick).toBeLessThan(54 + 124); // o balão do P2 nem chegou a abrir
  });

  it('pular perto do fim não estende nada (nunca passa do total)', () => {
    const r = montarRoteiro('rodada', 'completa', false, [fala(0, 30)]);
    const { p } = iniciar(r);
    for (let i = 0; i < r.total - 2; i++) p.avancar();
    expect(p.pular()).toBe(true);
    rodar(p);
    expect(p.tick).toBe(r.total);
  });

  it('sons: faixas ao iniciar (só com faixas), um som por balão que abre (a vitória toca o arpejo), blips a cada 3 letras no tom de quem fala, no máximo um por tick', () => {
    const r = montarRoteiro('abertura', 'completa', false, [{ falante: 0, texto: 'abcdefghi jklmno', n: 16 }, { falante: 1, texto: 'pqrstu vwxyz', n: 12 }]);
    const { p, sons } = iniciar(r);
    expect(sons).toEqual(['faixas']);
    let maxPorTick = 0;
    while (p.ativa) {
      const antes = sons.filter((s) => typeof s === 'object').length;
      p.avancar();
      maxPorTick = Math.max(maxPorTick, sons.filter((s) => typeof s === 'object').length - antes);
    }
    expect(maxPorTick).toBeLessThanOrEqual(1);
    expect(sons.filter((s) => s === 'balao')).toHaveLength(2);
    expect(sons.filter((s) => s === 'faixas')).toHaveLength(1);
    const blips = sons.filter((s): s is { blip: number } => typeof s === 'object').map((s) => s.blip);
    // 15 letras que não são espaço no P1 => 5 blips (a cada 3) com o tom dele; 11 no P2 => 3 blips com o tom dele
    expect(blips.filter((b) => b === 1.05)).toHaveLength(5);
    expect(blips.filter((b) => b === 0.82)).toHaveLength(3);

    const v = iniciar(montarRoteiro('vitoria', 'completa', false, [fala(1, 48)]));
    rodar(v.p);
    expect(v.sons.filter((s) => s === 'vitoria')).toHaveLength(1);
    const curta = iniciar(montarRoteiro('abertura', 'curta', false, [fala(0, 40), fala(1, 56)]));
    rodar(curta.p);
    expect(curta.sons.filter((s) => typeof s === 'object')).toHaveLength(0); // texto inteiro: nada de blip
    expect(curta.sons).not.toContain('faixas');
    // movimento reduzido: o texto entra inteiro, sem blips
    const reduz = iniciar(montarRoteiro('rodada', 'completa', true, [fala(0, 30)]));
    rodar(reduz.p);
    expect(reduz.sons.filter((s) => typeof s === 'object')).toHaveLength(0);
  });

  it('zerar() desliga tudo; avancar() e pular() parados não fazem nada', () => {
    const { p } = iniciar(montarRoteiro('rodada', 'completa', false, [fala(0, 30)]));
    for (let i = 0; i < 20; i++) p.avancar();
    p.zerar();
    expect(p.ativa).toBe(false);
    const t = p.tick;
    p.avancar();
    expect(p.tick).toBe(t);
    expect(p.pular()).toBe(false);
    expect(p.quadro()).toBeNull();
  });

  it('as receitas de som só usam tone/noise (D8): tons do balão, do blip e da vitória', () => {
    expect(SOM_DO_BALAO.every((c) => c.k === 'R')).toBe(true);
    expect(blip(1.5)[0]).toMatchObject({ k: 'T', tipo: 'triangle', f0: 630, t: 0.04, vol: 0.05 });
    expect(SOM_DA_VITORIA.map((c) => c.k)).toEqual(['T', 'T', 'T']);
    expect(SOM_DA_VITORIA.map((c) => c.quando ?? 0)).toEqual([0, 0.1, 0.2]);
  });
});
