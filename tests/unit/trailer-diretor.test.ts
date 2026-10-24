import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { DURACAO_CURTA, DURACAO_COMPLETA } from '../../src/render/cinematica';
import { DURACAO_ENTRADA_CURTA } from '../../src/render/entrada-chefe';
import { cortesDeFoco, maiorFlashEm60, validarRoteiro } from '../../src/data/trailer/validar';
import { flashNoTick } from '../../src/data/trailer/curvas';
import { DURACAO_DA_CINE, DURACAO_DA_ENTRADA_CURTA, DURACAO_TOTAL, temMotor, TICKS_POR_TEMPO, type IdPlano, type RoteiroDoTrailer, type TomadasDoTrailer } from '../../src/data/trailer/tipos';
import { LUTADORES } from '../../src/data/lutadores';
import { TEXTOS } from '../../src/data/trailer/textos';
import { DiretorDoTrailer, type QuadroDoTrailer } from '../../src/trailer/diretor';
import { impressaoDoEstado } from '../../src/trailer/impressao';
import { criarPartida, FONTE_VAZIA } from '../../src/trailer/partida';
import { ticksDoFilmeNoTrailer } from '../../src/trailer/filme';
import { casaBatida } from '../../src/trailer/ritmo';
import { planoDeCarga, residentesNoPlano, MAX_NAO_FIXOS, PESADOS } from '../../src/trailer/carga';
import { duracaoDaEstatica, quadroEstaticoNoTick } from '../../src/trailer/estatica';
import { entradaDaMusica, MAX_TICKS_POR_CHAMADA, tickAlvoDoAudio, ticksAAvancar } from '../../src/trailer/relogio';
import { correr, DESTAQUE, ELENCO, ROTEIRO, TOMADAS } from './_trailer';

/*
 * Trailer de abertura, T1/T2 (docs/spec-trailer-abertura.md §8, testes 1 a 9): determinismo, batidas, invariância à fatia, sem sorteio fora da semente, ISOLAMENTO da
 * sessão, duração e cortes, fotossensibilidade, carga e reserva, validação do roteiro. A tomada que falha diz qual plano reescalar.
 */

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const PLANOS_DE_LUTA = ROTEIRO.planos.filter(temMotor);
const reescalar = (id: string): string => `rode \`npm run trailer:escalar -- --plano ${id}\` e reaprove a tomada na prévia`;

afterEach(() => vi.restoreAllMocks());

/** O quadro do plano em que o motor chegou ao update `u` (a tomada conta updates desde o `setup`; o plano começa em `inicio`). */
function quadroDaBatida(id: IdPlano, u: number): QuadroDoTrailer | undefined {
  let feitos = TOMADAS[id]?.inicio ?? 0;
  for (const q of A.quadros) {
    if (q.plano.id !== id || !q.motorAndou) continue;
    if (++feitos === u) return q;
  }
  return undefined;
}

// uma corrida inteira reaproveitada pelos testes que só leem (cada uma custa algumas centenas de ms)
const A = correr({ guardar: true });

/** Quantos ticks o motor fica parado pelo filme que abre neste quadro (o roteiro do golpe do atacante, versão curta). */
function ticksDoFilmeDoQuadro(q: QuadroDoTrailer): number {
  const f = q.filme;
  if (!f || !temMotor(q.plano)) return 0;
  return ticksDoFilmeNoTrailer(f.ev.atacante === 0 ? q.plano.c1 : q.plano.c2, f.ev);
}

describe('1 · determinismo', () => {
  it('dois diretores com o mesmo roteiro dão os mesmos 2400 quadros (impressão por tick)', () => {
    const B = correr();
    expect(A.hashes).toHaveLength(DURACAO_TOTAL);
    expect(B.hashes).toEqual(A.hashes);
    expect(A.reservas).toEqual([]);
  });

  it.each(PLANOS_DE_LUTA.map((p) => p.id))('%s: a impressão do plano é a gravada em tomadas.ts', (id) => {
    expect(A.impressoes.get(id), `${id}: a luta desta tomada mudou (balanço, CPU ou atlas). ${reescalar(id)}`).toBe(TOMADAS[id]?.impressao);
  });

  it('irPara em saltos de 1 a 6 ticks chega ao mesmo estado que avançar de 1 em 1, e não perde eventos', () => {
    const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores: ELENCO, criarRng });
    let alvo = 0;
    let n = 0;
    let eventos = 0;
    while (!d.fim) {
      d.prerolar(0);
      d.prerolar(Number.POSITIVE_INFINITY);
      alvo = Math.min(DURACAO_TOTAL - 1, alvo + 1 + (n++ % MAX_TICKS_POR_CHAMADA));
      const q = d.irPara(alvo);
      eventos += q.eventos.length;
      expect(q.tick).toBe(Math.min(alvo, DURACAO_TOTAL - 1));
      if (alvo === DURACAO_TOTAL - 1) break;
    }
    // todo plano de luta terminou (a impressão só existe se o último tick do plano passou por `produzir`) e a impressão é a mesma
    for (const p of PLANOS_DE_LUTA) expect(d.impressaoDoPlano(p.id)).toBe(A.impressoes.get(p.id));
    expect(eventos).toBe(A.quadros.reduce((s, q) => s + q.eventos.length, 0));
  });

  it('depois do fim devolve o último quadro e `fim` é verdadeiro', () => {
    const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores: ELENCO, criarRng });
    d.prerolar(Number.POSITIVE_INFINITY);
    const q = d.irPara(DURACAO_TOTAL + 50);
    expect(q.tick).toBe(DURACAO_TOTAL - 1);
    expect(d.fim).toBe(true);
    expect(d.avancar()).toBe(d.avancar());
  });
});

describe('2 · batidas: cada golpe pedido cai onde a tomada gravou e no tempo que o roteiro pede', () => {
  it.each(PLANOS_DE_LUTA.map((p) => [p.id, p] as const))('%s', (id, plano) => {
    const tomada = TOMADAS[id];
    expect(tomada, `${id} sem tomada. ${reescalar(id)}`).toBeDefined();
    if (!tomada) return;
    // (a) a luta gravada, reconstruída do zero, tem o acerto no update gravado
    const g = criarPartida(plano, tomada, ELENCO, criarRng);
    const porUpdate: (readonly import('../../src/core/contratos').EventoLuta[])[] = [[]];
    const ate = Math.max(...tomada.batidas.map((b) => b.tickMotor));
    for (let u = 1; u <= ate; u++) {
      g.update(FONTE_VAZIA);
      porUpdate.push(g.events.slice());
    }
    plano.pede.forEach((pedida, i) => {
      const gravada = tomada.batidas[i];
      expect(gravada?.pedida, `${id}: batida ${i}`).toBe(i);
      const evs = porUpdate[gravada?.tickMotor ?? 0] ?? [];
      expect(
        evs.some((ev) => casaBatida(pedida, ev)),
        `${id}: o ${pedida.tipo} do lutador ${pedida.lutador} não acontece mais no update ${gravada?.tickMotor}. ${reescalar(id)}`,
      ).toBe(true);
      // (b) no trailer inteiro, cai no tick do plano pedido
      const q = quadroDaBatida(id, gravada?.tickMotor ?? 0);
      expect(q, `${id}: a batida ${i} não aparece nos quadros. ${reescalar(id)}`).toBeDefined();
      const alvo = pedida.alvo ?? (plano.compassos * 96) / 2;
      const folga = pedida.folga ?? 60;
      expect(Math.abs((q?.tickNoPlano ?? -999) - alvo), `${id}: a batida ${i} cai no tick ${q?.tickNoPlano} (alvo ${alvo} ± ${folga}). ${reescalar(id)}`).toBeLessThanOrEqual(folga);
    });
  });

  it('P1: a tarja abre uma vez (CURTA), o motor congela exatamente 20 ticks e a câmera lenta ×3 anda 6 updates em 18 ticks', () => {
    const q1 = A.quadros.filter((q) => q.plano.id === 'P1');
    const comTarja = q1.filter((q) => q.cine);
    expect(comTarja).toHaveLength(1);
    const t0 = comTarja[0]?.tickNoPlano ?? -1;
    expect(comTarja[0]?.cine?.modo).toBe('curta');
    expect(comTarja[0]?.cine?.ev.tipo).toBe('special');
    expect(q1.slice(t0 + 1, t0 + 1 + DURACAO_DA_CINE.curta).every((q) => !q.motorAndou)).toBe(true);
    expect(q1[t0 + 1 + DURACAO_DA_CINE.curta]?.motorAndou).toBe(true);
    const acerto = quadroDaBatida('P1', TOMADAS['P1']?.batidas[0]?.tickMotor ?? 0);
    expect(acerto?.eventos.some((ev) => ev.tipo === 'hit' && ev.especial === true)).toBe(true);
    const i = acerto?.tickNoPlano ?? 0;
    // com o motor v2 ligado o acerto do especial abre o FILME (D-V6): o motor congela pelos ticks dele e a câmera lenta começa DEPOIS
    const filmeNoAcerto = acerto?.filme ?? null;
    const congelado = acerto && filmeNoAcerto ? ticksDoFilmeDoQuadro(acerto) : 0;
    const lenta = q1.slice(i + 1 + congelado, i + 1 + congelado + 18);
    expect(lenta.length).toBe(18);
    expect(lenta.every((q) => q.lenta === 3)).toBe(true);
    expect(lenta.filter((q) => q.motorAndou)).toHaveLength(6);
    expect(q1[i + 1 + congelado + 18]?.lenta).toBe(1);
  });

  it('FILME (D-V6): cada evento `filme` do motor abre o filme no tick do contato e segura o motor pelos ticks do roteiro, em todos os planos de luta', () => {
    let total = 0;
    for (const p of ['P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P9'] as const) {
      const qs = A.quadros.filter((q) => q.plano.id === p);
      const abre = qs.filter((q) => q.filme);
      for (const q of abre) {
        total++;
        const d = ticksDoFilmeDoQuadro(q);
        expect(d, `${p}: o roteiro do filme dura mais de 0 ticks`).toBeGreaterThan(0);
        expect(q.motorAndou, `${p}: o tick do contato é um update do motor`).toBe(true);
        expect(q.filme?.modo).toBe('curta');
        // os `d` ticks seguintes (dentro do plano) estão congelados; um filme que o plano corta no meio só congela até o fim dele
        const seguintes = qs.slice(q.tickNoPlano + 1, q.tickNoPlano + 1 + d);
        expect(seguintes.every((x) => !x.motorAndou), `${p}: motor parado durante o filme`).toBe(true);
        expect(seguintes.every((x) => !x.filme), `${p}: nenhum filme novo dentro do filme`).toBe(true);
      }
    }
    expect(total, 'pelo menos um filme no trailer (a tomada escalada tem especial)').toBeGreaterThan(0);
  });

  it('batida esperada que não veio: o plano segue sem tarja nem câmera lenta, a duração é a mesma e nada lança', () => {
    const t = TOMADAS['P1'];
    if (!t) throw new Error('sem tomada P1');
    const quebrada: TomadasDoTrailer = { ...TOMADAS, P1: { ...t, batidas: t.batidas.map((b) => ({ ...b, tickMotor: b.tickMotor + 1, tickInicio: b.tickInicio + 1 })) } };
    const c = correr({ tomadas: quebrada, guardar: true });
    expect(c.hashes).toHaveLength(DURACAO_TOTAL);
    const q1 = c.quadros.filter((q) => q.plano.id === 'P1');
    expect(q1.some((q) => q.cine)).toBe(false);
    expect(q1.every((q) => q.lenta === 1)).toBe(true);
    // o único congelamento que sobra é o do FILME (D-V6): cada evento `filme` segura o motor pelos ticks do roteiro, e nada além disso
    const filmes = q1.filter((q) => q.filme);
    const esperados = filmes.reduce((n, q) => n + ticksDoFilmeDoQuadro(q), 0);
    expect(q1.filter((q) => !q.motorAndou)).toHaveLength(esperados);
  });

  it('as durações da tarja e da entrada curta são as da render (o diretor não importa a render, então o teste importa)', () => {
    expect(DURACAO_DA_CINE.curta).toBe(DURACAO_CURTA);
    expect(DURACAO_DA_CINE.completa).toBe(DURACAO_COMPLETA);
    expect(DURACAO_DA_ENTRADA_CURTA).toBe(DURACAO_ENTRADA_CURTA);
  });

  it('P9: o motor só anda depois da entrada do chefão (tick 156), os braseiros acendem em colcheias e a entrada dura 60 ticks', () => {
    const q9 = A.quadros.filter((q) => q.plano.id === 'P9');
    expect(q9.slice(0, 156).every((q) => !q.motorAndou)).toBe(true);
    expect(q9[156]?.motorAndou).toBe(true);
    expect(q9.map((q) => q.arconte?.acesos)).toEqual(q9.map((_, t) => (t < 24 ? 0 : Math.min(6, Math.floor((t - 24) / 12) + 1))));
    expect(q9.filter((q) => q.arconte?.entrada)).toHaveLength(60);
    expect(q9[96]?.arconte?.tickDaEntrada).toBe(0);
    expect(q9[155]?.arconte?.tickDaEntrada).toBe(59);
  });
});

describe('3 · invariância à fatia da pré-rolagem', () => {
  it('pré-rolar 1 update por vez ou 10 000 dá os mesmos quadros e as mesmas impressões', () => {
    const lenta = correr({ fatia: 1 });
    const rapida = correr({ fatia: 10_000 });
    expect(lenta.impressoes).toEqual(rapida.impressoes);
    expect(lenta.hashes).toEqual(rapida.hashes);
    expect(lenta.reservas).toEqual([]);
  });
});

function semComentarios(src: string): string {
  return src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');
}
function arquivosTs(dir: string): string[] {
  return readdirSync(join(RAIZ, dir), { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? arquivosTs(join(dir, e.name)) : e.name.endsWith('.ts') ? [join(dir, e.name)] : []));
}

describe('4 · nada de sorteio nem relógio de parede', () => {
  it('Math.random lança durante o trailer inteiro e ele passa', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => {
      throw new Error('Math.random dentro do trailer');
    });
    expect(() => correr()).not.toThrow();
    expect(spy).not.toHaveBeenCalled();
  });

  it('busca estática: sem Math.random, Date.now, new Date nem performance.now em src/trailer, src/data/trailer e src/audio', () => {
    const arquivos = [...arquivosTs('src/trailer'), ...arquivosTs('src/data/trailer'), ...arquivosTs('src/audio')];
    expect(arquivos.length).toBeGreaterThan(15);
    const achados: string[] = [];
    for (const f of arquivos) {
      const src = semComentarios(readFileSync(join(RAIZ, f), 'utf8'));
      for (const m of src.matchAll(/Math\.random|Date\.now|new Date\(|performance\.now/g)) achados.push(`${f}: ${m[0]}`);
    }
    expect(achados).toEqual([]);
  });
});

describe('5 · isolamento da sessão', () => {
  // a sessão (main.ts): lógica = semente, visual +1, UI +2, ruído do áudio +3, seleção +4, falas +5, variação dos sons +6
  const SEMENTE = 5;
  const sessao = () => Array.from({ length: 7 }, (_, k) => criarRng(SEMENTE + k));
  const sorteios = (rs: ReturnType<typeof sessao>): number[][] => rs.map((r) => Array.from({ length: 100 }, () => r.proximo()));

  it('depois do trailer inteiro os próximos 100 valores de cada RNG da sessão (+0 a +6) são os de um controle que não rodou o trailer', () => {
    const controle = sorteios(sessao());
    const emUso = sessao();
    correr();
    expect(sorteios(emUso)).toEqual(controle);
  });

  it('o diretor só pede RNG com as sementes das tomadas (constantes do roteiro), nunca com a da sessão', () => {
    const permitidas = new Set(Object.values(TOMADAS).map((t) => t?.semente));
    expect(A.sementesPedidas.length).toBe(PLANOS_DE_LUTA.length);
    for (const s of A.sementesPedidas) expect(permitidas.has(s)).toBe(true);
    expect(Number.isInteger(ROTEIRO.sementeVisual)).toBe(true);
  });

  it('o `Game` da sessão fica intocado: mesma impressão, antes e depois, de um controle que não viu o trailer', () => {
    const mundo = () => {
      const g = new Game({ lutadores: ELENCO, rng: criarRng(SEMENTE) });
      g.setup({ mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2, p1cpu: 1, esquiva: true }, { rounds: 2, time: 99, shake: false });
      return g;
    };
    const sessaoGame = mundo();
    const controle = mundo();
    for (let i = 0; i < 400; i++) (sessaoGame.update(FONTE_VAZIA), controle.update(FONTE_VAZIA));
    const antes = impressaoDoEstado(sessaoGame);
    expect(antes).toBe(impressaoDoEstado(controle));
    correr();
    expect(impressaoDoEstado(sessaoGame)).toBe(antes);
    for (let i = 0; i < 300; i++) (sessaoGame.update(FONTE_VAZIA), controle.update(FONTE_VAZIA));
    expect(impressaoDoEstado(sessaoGame)).toBe(impressaoDoEstado(controle));
  });

  it('busca estática: o diretor e os dados não conhecem o mundo, os RNG da sessão nem as sementes +4/+5/+6', () => {
    const proibidos = /\bmundo\b|rngLogica|rngVisual|rngUI|sorteioDaSelecao|sorteioDeFalas|sementeVariacao|\bsemente\s*\+\s*\d|\bui\.m\b/;
    const achados: string[] = [];
    for (const f of [...arquivosTs('src/trailer'), ...arquivosTs('src/data/trailer')]) {
      const src = semComentarios(readFileSync(join(RAIZ, f), 'utf8'));
      for (const linha of src.split('\n')) if (proibidos.test(linha)) achados.push(`${f}: ${linha.trim()}`);
    }
    expect(achados).toEqual([]);
  });

  it('o diretor nunca tem mais de 2 `Game` vivos', () => {
    expect(A.maxVivos).toBeLessThanOrEqual(2);
    expect(A.maxVivos).toBeGreaterThanOrEqual(1);
  });
});

describe('6 · duração e cortes', () => {
  it('duracao 2400, todo plano começa num múltiplo de 24 (e de 96) e as trocas de foco caem no tempo', () => {
    const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores: ELENCO, criarRng });
    expect(d.duracao).toBe(DURACAO_TOTAL);
    let inicio = 0;
    for (const p of ROTEIRO.planos) {
      expect(inicio % TICKS_POR_TEMPO, p.id).toBe(0);
      inicio += p.compassos * 96;
      if (temMotor(p) || p.tipo === 'frio') for (const t of cortesDeFoco(p.camera)) expect(t % TICKS_POR_TEMPO, `${p.id} corta no tick ${t}`).toBe(0);
    }
    expect(inicio).toBe(DURACAO_TOTAL);
  });
  it('a versão estática tem no máximo 600 ticks, nada se mexe e o último quadro é a logo com o prompt', () => {
    expect(duracaoDaEstatica(ROTEIRO)).toBeLessThanOrEqual(600);
    const n = duracaoDaEstatica(ROTEIRO);
    for (let t = 0; t < n; t++) {
      const q = quadroEstaticoNoTick(ROTEIRO, t);
      expect(q.zoom.fator).toBe(1);
      expect(q.flash).toBe(0);
      expect(q.letterbox).toBe(1);
      expect(q.dissolucao).toBeGreaterThanOrEqual(0);
      expect(q.dissolucao).toBeLessThanOrEqual(1);
    }
    const ultimo = quadroEstaticoNoTick(ROTEIRO, n - 1);
    expect(ultimo.quadro.logo).toBe(true);
    expect(ultimo.prompt).toBe(true);
  });
});

describe('7 · fotossensibilidade', () => {
  it('no máximo 3 subidas de flash acima de 0,3 em qualquer janela de 60 ticks e exatamente 1 flash de tela cheia, no c24.1', () => {
    expect(maiorFlashEm60()).toBeLessThanOrEqual(3);
    const flash = A.quadros.map((q) => q.flash);
    expect(flash).toEqual(Array.from({ length: DURACAO_TOTAL }, (_, t) => flashNoTick(t)));
    const cheios = flash.map((f, t) => (f >= 0.99 ? t : -1)).filter((t) => t >= 0);
    expect(cheios).toEqual([23 * 96]);
    for (let t = 0; t + 60 <= DURACAO_TOTAL; t++) {
      let subidas = 0;
      for (let k = t; k < t + 60; k++) if ((flash[k] as number) > 0.3 && (k === 0 || (flash[k - 1] as number) <= 0.3)) subidas++;
      expect(subidas).toBeLessThanOrEqual(3);
    }
  });
});

describe('8 · carga da arte e reserva', () => {
  const pedidos = planoDeCarga(ROTEIRO);
  const idx = (id: IdPlano): number => ROTEIRO.planos.findIndex((p) => p.id === id);
  it('a tabela de carga da spec §5.2: quem, quando começa e quando precisa estar pronto', () => {
    expect(pedidos.map((p) => [p.lutador, p.cenario, p.comecaEm, p.prontoEm])).toEqual([
      ['aminu', 'ng', 'P0', 'P3'],
      ['centella', 'mx', 'P3', 'P4'],
      ['camille', 'fr', 'P4', 'P5'],
      ['nila', 'in', 'P5', 'P6'],
      ['baatar', 'mn', 'P6', 'P7'],
      ['zenon', 'gr', 'P8', 'P9'],
    ]);
  });
  it('todo pedido sai pelo menos 1 plano antes do uso, em nenhum plano há mais de 2 atlas não fixos e BAATAR e ZENON nunca estão juntos', () => {
    for (const p of pedidos) expect(idx(p.comecaEm), p.lutador).toBeLessThan(idx(p.prontoEm));
    ROTEIRO.planos.forEach((_, i) => {
      const r = residentesNoPlano(ROTEIRO, pedidos, i);
      expect(r.length, `plano ${i}`).toBeLessThanOrEqual(MAX_NAO_FIXOS);
      expect(PESADOS.every((id) => r.includes(id)), `plano ${i}`).toBe(false);
    });
  });
  it('o plano do diretor pede a arte do plano atual e do próximo, e solta o que já foi usado', () => {
    const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores: ELENCO, criarRng });
    expect(d.pedidosDeArte().proximo.lutadores).toEqual(['aminu']);
    d.prerolar(Number.POSITIVE_INFINITY);
    d.irPara(6 * 96 - 1 + 96 * 2); // dentro do P3 (c9..c10 = ticks 768..959)
    const p = d.pedidosDeArte();
    expect(p.agora.lutadores).toEqual(['aminu']);
    expect(p.proximo.lutadores).toContain('centella');
    expect(p.soltar).toEqual([]);
  });
  it('arte que não chegou: o plano vira cartão de reserva, a duração continua 2400, não há exceção e os outros planos não mudam', () => {
    const c = correr({ reservaForcada: ['P3'], guardar: true });
    expect(c.hashes).toHaveLength(DURACAO_TOTAL);
    expect(c.reservas).toEqual(['P3']);
    const q3 = c.quadros.filter((q) => q.plano.id === 'P3');
    expect(q3).toHaveLength(192);
    expect(q3.every((q) => q.reserva && q.luta === null && !q.motorAndou)).toBe(true);
    for (const p of PLANOS_DE_LUTA) if (p.id !== 'P3') expect(c.impressoes.get(p.id), p.id).toBe(TOMADAS[p.id]?.impressao);
  });
  it('plano de luta sem tomada também vira reserva, sem lançar', () => {
    const { P5: _fora, ...resto } = TOMADAS;
    const c = correr({ tomadas: resto });
    expect(c.hashes).toHaveLength(DURACAO_TOTAL);
    expect(c.reservas).toEqual(['P5']);
  });
  it('pré-rolagem que não ficou pronta a tempo (aparelho lento) também vira reserva', () => {
    const d = new DiretorDoTrailer(ROTEIRO, TOMADAS, { lutadores: ELENCO, criarRng });
    // ninguém chama `prerolar`: o P1 começa sem estar pronto
    for (let t = 0; t < 192; t++) expect(d.avancar().plano.id).toBe('P0');
    const q = d.avancar();
    expect(q.plano.id).toBe('P1');
    expect(q.reserva).toBe(true);
    expect(q.luta).toBeNull();
    expect(d.planosEmReserva()).toEqual(['P1']);
  });
});

describe('9 · validarRoteiro', () => {
  const ok = (r: RoteiroDoTrailer = ROTEIRO, t: TomadasDoTrailer = TOMADAS) => validarRoteiro(r, t, { destaque: DESTAQUE });
  it('o roteiro e as tomadas do repositório passam', () => {
    expect(ok()).toEqual([]);
  });
  it('recusa 24 compassos, título longo, zoom 1,4 e roteiro sem um lutador', () => {
    const planos = [...ROTEIRO.planos];
    expect(ok({ ...ROTEIRO, planos: planos.filter((p) => p.id !== 'C3') }).join('\n')).toMatch(/24 compassos/);
    expect(ok({ ...ROTEIRO, planos: planos.map((p) => (p.id === 'P1' && p.tipo === 'luta' ? { ...p, camera: [{ t: 0, zoom: 1.4, foco: 'meio' as const }] } : p)) }).join('\n')).toMatch(/P1\.camera\[0\]: zoom 1\.4/);
    const textos = TEXTOS as Record<string, string>;
    const original = textos['dez-nacoes'] as string;
    expect(original.length).toBeLessThanOrEqual(18);
    textos['dez-nacoes'] = 'DEZ NAÇÕES DO MUNDO!'; // 20 caracteres
    try {
      expect(ok().join('\n')).toMatch(/tem 20 caracteres \(máx\. 18\)/);
    } finally {
      textos['dez-nacoes'] = original;
    }
    expect(ok()).toEqual([]);
    const semBaatar = planos.map((p) => {
      if (p.id === 'P8' && p.tipo === 'retratos') return { ...p, ordem: p.ordem.filter((id) => id !== 'baatar') };
      if (p.id === 'P7' && p.tipo === 'luta') return { ...p, c1: 'caio' as const };
      return p;
    });
    expect(ok({ ...ROTEIRO, planos: semBaatar }).join('\n')).toMatch(/baatar: não aparece em nenhum plano/);
  });
  it('recusa tomada ausente, com batida a menos, inicio acima de 2400 e tomada de plano que não é de luta', () => {
    const { P2: _p2, ...semP2 } = TOMADAS;
    expect(ok(ROTEIRO, semP2).join('\n')).toMatch(/P2: sem tomada/);
    const p3 = TOMADAS['P3'];
    if (!p3) throw new Error('P3');
    expect(ok(ROTEIRO, { ...TOMADAS, P3: { ...p3, batidas: [] } }).join('\n')).toMatch(/P3: a tomada tem 0 batidas e o roteiro pede 1/);
    expect(ok(ROTEIRO, { ...TOMADAS, P3: { ...p3, inicio: 2401 } }).join('\n')).toMatch(/P3: inicio 2401/);
    expect(ok(ROTEIRO, { ...TOMADAS, C1: p3 } as TomadasDoTrailer).join('\n')).toMatch(/tomada de "C1"/);
  });
  it('cada lutador aparece nos planos e o destaque dele está em campo', () => {
    for (const id of Object.keys(LUTADORES)) expect(DESTAQUE[id as keyof typeof DESTAQUE], id).toBeDefined();
  });
});

describe('relógio (puro)', () => {
  it('o relógio do áudio decide o tick; sem áudio o laço manda; atraso grande pula o motor', () => {
    expect(tickAlvoDoAudio(null)).toBeNull();
    expect(tickAlvoDoAudio(1.0)).toBe(60);
    expect(tickAlvoDoAudio(-0.5)).toBe(0);
    expect(tickAlvoDoAudio(999)).toBe(DURACAO_TOTAL);
    expect(ticksAAvancar(10, null)).toEqual({ ticks: 1, pular: false });
    expect(ticksAAvancar(10, 12)).toEqual({ ticks: 2, pular: false });
    expect(ticksAAvancar(10, 10)).toEqual({ ticks: 0, pular: false });
    expect(ticksAAvancar(10, 5)).toEqual({ ticks: 0, pular: false });
    expect(ticksAAvancar(10, 10 + MAX_TICKS_POR_CHAMADA + 1)).toEqual({ ticks: MAX_TICKS_POR_CHAMADA + 1, pular: true });
  });
  it('a música entra no próximo compasso', () => {
    expect(entradaDaMusica(0)).toEqual({ compasso: 1, emSegundos: 1.6 });
    expect(entradaDaMusica(95)).toEqual({ compasso: 1, emSegundos: 1 / 60 });
    expect(entradaDaMusica(96).compasso).toBe(2);
  });
});
