import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { falasDe } from '../../src/data/provocacoes';
import { falaDaRodada } from '../../src/render/provocacao';
import { Game } from '../../src/fight/game';
import { TeclasVirtuais } from '../../src/input/teclas';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { desenharMundo } from '../../src/render/mundo';
import type { CenaFight } from '../../src/ui/cenas/fight';
import type { Mundo } from '../../src/ui/contexto';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { gravador, navegadorFalso } from './_ui';

/*
 * P2 (Lyra): a CENA da luta com a provocação. Elenco de produção e um `Game` de verdade (só a arte e o áudio são falsos). O que se prova aqui:
 * a provocação é apresentação PURA (o motor não anda, a foto do motor é idêntica à luta sem ela), os 3 gatilhos (round 1, round 2+, vitória), pular, e onde NÃO roda.
 */
const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

type Cfg = { mode: 'arcade' | 'cpu' | 'versus' | 'training'; c1: IdLutador; c2: IdLutador; cpu: number | null; p1cpu?: number | null; chefe?: boolean };
const CPU_DIFICIL: Cfg = { mode: 'cpu', c1: 'hayato', c2: 'caio', cpu: 2 };

function montar(cfg: Cfg = CPU_DIFICIL, set: Partial<Configuracoes> = {}, regras: Regras = REGRAS_PADRAO, opcoes: { teclasReais?: boolean; sorteio?: boolean; reduz?: boolean } = {}) {
  const n = navegadorFalso(set, regras);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  const teclas = new TeclasVirtuais();
  (n.c as { entrada: unknown }).entrada = opcoes.teclasReais
    ? { lerP1: () => teclas.lerP1(), lerP2: () => teclas.lerP2(), lerMesclado: () => teclas.lerMesclado(), fimDoTick: () => teclas.fimDoTick() }
    : { lerP1: () => ({ ...frames.p1 }), lerP2: () => ({ ...frames.p2 }), lerMesclado: () => ({ ...frames.p1 }), fimDoTick: () => undefined };
  if (opcoes.sorteio) (n.c as { sorteioDeFalas: unknown }).sorteioDeFalas = criarRng(99);
  if (opcoes.reduz !== undefined) (n.c as { reduzirMovimento: () => boolean }).reduzirMovimento = () => opcoes.reduz === true;
  const game = new Game({ lutadores: prod, rng: criarRng(5) });
  n.ui.pronto({
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: { pedir: () => undefined, usar: () => undefined, estaPronto: () => true, prebuscar: () => undefined },
    game,
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo);
  const idas: string[] = [];
  const goOriginal = n.ui.go.bind(n.ui);
  n.ui.go = (nome, args) => {
    idas.push(String(nome));
    goOriginal(nome, args);
  };
  n.ui.set('fight', { cfg: { ...cfg, esquiva: regras.esquiva } });
  const cena = n.ui.scene as unknown as CenaFight;
  /** Um tick do laço principal: a cena e depois o `fimDoTick` da entrada (as bordas só vivem um tick). */
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) {
      cena.update();
      (n.c.entrada as { fimDoTick(): void }).fimDoTick();
    }
  };
  /** Anda até `cond()` (conferida DEPOIS de cada update). Devolve quantos updates levou. */
  const ate = (cond: () => boolean, max = 40000): number => {
    for (let i = 0; i < max; i++) {
      if (cond()) return i;
      update();
    }
    throw new Error('não chegou lá');
  };
  const desenhar = () => {
    const g = gravador();
    (n.c as { ctx: unknown }).ctx = g.ctx;
    cena.draw();
    return g;
  };
  return { ...n, game, cena, frames, teclas, update, ate, idas, desenhar };
}
type T = ReturnType<typeof montar>;

/** Foto do estado que o lock-step compara: tick, relógio, os dois lutadores e o RNG da luta. */
const foto = (g: Game): string =>
  JSON.stringify({
    tick: g.tick,
    t: g.t,
    fase: g.phase,
    round: g.round,
    rng: (g as unknown as { rng: { estado?: () => unknown } }).rng.estado?.() ?? null,
    f: g.fighters.map((f) => [f.x, f.y, f.hp, f.en, f.state, f.barras, f.ficha, f.score, f.age, f.wins]),
  });

const durCompleta = (n: number, teto = 190): number => Math.min(teto, Math.max(84, 24 + Math.round(2.5 * n)));

describe('round 1: antes do 1º game.update, o motor fica parado pelo roteiro inteiro', () => {
  it('COMPLETA: game.tick fica em 0 por EXATAMENTE 80 + D1 + D2 update() e anda no seguinte; o round start segue pendente', () => {
    const t = montar();
    const antes = foto(t.game);
    t.update();
    expect(t.cena.provocacao.ativa).toBe(true);
    const r = t.cena.provocacao.roteiro!;
    expect(r.tipo).toBe('abertura');
    expect(r.modo).toBe('completa');
    expect(r.janelas.map((j) => j.falante)).toEqual([0, 1]); // o P1 fala primeiro e o P2 responde (decisão do dono)
    const total = 80 + durCompleta(r.janelas[0]!.n) + durCompleta(r.janelas[1]!.n);
    expect(r.total).toBe(total);
    for (let i = 2; i <= total; i++) {
      t.update();
      expect(t.game.tick, `update ${i}`).toBe(0);
    }
    expect(t.cena.provocacao.ativa).toBe(false);
    expect(foto(t.game)).toBe(antes); // nem o relógio, nem o RNG, nem os lutadores se mexeram
    expect(t.game.phase).toBe('intro');
    t.update();
    expect(t.game.tick).toBe(1);
    // o `round start` do round 1 (que sai do motor no 1º update) NÃO abre uma provocação de "round 2+" por cima da de abertura
    for (let i = 0; i < 200 && t.game.phase !== 'fight'; i++) {
      t.update();
      expect(t.cena.provocacao.ativa, `update ${i}`).toBe(false);
    }
    expect(t.game.phase).toBe('fight');
  });

  it('as falas vêm da tabela da Vega: P1 fala com o nome do P2 no lugar de {rival}, e cada um fala com a SUA voz (hayato / caio)', () => {
    const t = montar();
    t.update();
    const [a, b] = t.cena.provocacao.roteiro!.janelas;
    const modeloA = [...falasDe('hayato').abertura, ...(falasDe('hayato').contra?.['caio']?.abertura ?? [])].map((f) => f.split('{rival}').join('CAIO'));
    const modeloB = [...falasDe('caio').abertura, ...(falasDe('caio').contra?.['hayato']?.abertura ?? [])].map((f) => f.split('{rival}').join('HAYATO'));
    expect(modeloA).toContain(a!.texto);
    expect(modeloB).toContain(b!.texto);
    expect(a!.texto + b!.texto).not.toContain('{rival}');
  });

  it('CURTA (cinemática CURTA): os dois balões juntos, D + 6 ticks, <= 126, sem faixas; DESLIGADA da cinemática também fica CURTA (opção própria)', () => {
    for (const cinematica of ['curta', 'desligada'] as const) {
      const t = montar(CPU_DIFICIL, { cinematica });
      t.update();
      const r = t.cena.provocacao.roteiro!;
      expect(r.modo, cinematica).toBe('curta');
      expect(r.total, cinematica).toBeLessThanOrEqual(126);
      expect(r.faixas).toBe(false);
      t.update(r.total - 1);
      expect(t.game.tick).toBe(0);
      expect(t.cena.provocacao.ativa).toBe(false);
      t.update();
      expect(t.game.tick).toBe(1);
    }
  });

  it('confronto REPETIDO (continue, reinício, revanche): vira CURTA mesmo com a cinemática COMPLETA', () => {
    const t = montar();
    t.update();
    expect(t.cena.provocacao.roteiro!.modo).toBe('completa');
    t.cena.enter({ cfg: { ...CPU_DIFICIL, esquiva: true } } as never); // a mesma luta de novo
    t.update();
    expect(t.cena.provocacao.roteiro!.modo).toBe('curta');
    t.cena.enter({ cfg: { ...CPU_DIFICIL, c2: 'camille', esquiva: true } } as never); // outro rival: volta a COMPLETA
    t.update();
    expect(t.cena.provocacao.roteiro!.modo).toBe('completa');
  });

  it('movimento reduzido SEM preferência de cinemática: CURTA; com COMPLETA explícita: COMPLETA sem andada, sem zoom e sem pop', () => {
    const sem = montar(CPU_DIFICIL, {}, REGRAS_PADRAO, { reduz: true });
    sem.update();
    expect(sem.cena.provocacao.roteiro!.modo).toBe('curta');

    const com = montar(CPU_DIFICIL, { cinematica: 'completa' }, REGRAS_PADRAO, { reduz: true });
    com.update();
    const r = com.cena.provocacao.roteiro!;
    expect(r.modo).toBe('completa');
    expect(r.reduz).toBe(true);
    expect(r.andada).toBe(false);
    expect(r.total).toBe(80 + durCompleta(r.janelas[0]!.n) + durCompleta(r.janelas[1]!.n)); // as durações são as mesmas
  });
});

describe('o desenho do round 1', () => {
  it('COMPLETA: o HUD e o "ROUND 1" somem, o balão do P1 aparece com o nome dele; depois o do P2; no fim o HUD e o ROUND 1 voltam (do motor)', () => {
    const t = montar();
    t.update();
    const r = t.cena.provocacao.roteiro!;
    const [a, b] = r.janelas as [NonNullable<typeof r.janelas[0]>, NonNullable<typeof r.janelas[0]>];
    t.update(20);
    const sem = t.desenhar().textos();
    expect(sem).not.toContain('HAYATO');
    expect(sem).not.toContain('ROUND 1');
    t.ate(() => t.cena.provocacao.tick >= a.abre + 60);
    const p1 = t.desenhar().textos();
    expect(p1).toContain('HAYATO'); // a etiqueta do balão do P1
    expect(p1).not.toContain('CAIO');
    // a fala vai em CAIXA ALTA (Bangers), palavra a palavra: alguma palavra de mais de 3 letras da fala do P1 já foi escrita
    const alta = a.texto.replace('\n', ' ').toLocaleUpperCase('pt-BR');
    expect(p1.some((x) => x.length > 3 && alta.includes(x.trim()))).toBe(true);
    t.ate(() => t.cena.provocacao.tick >= b.abre + 60);
    const p2 = t.desenhar().textos();
    expect(p2).toContain('CAIO');
    t.ate(() => !t.cena.provocacao.ativa);
    const luta = t.desenhar().textos();
    expect(luta).toContain('ROUND 1'); // a `intro` do motor segue como sempre
  });

  it('CURTA: o HUD fica (é a abertura rápida) e o "ROUND 1" fica escondido enquanto os dois balões estão abertos', () => {
    const t = montar(CPU_DIFICIL, { cinematica: 'curta' });
    t.update(30);
    const txt = t.desenhar().textos();
    expect(t.cena.provocacao.ativa).toBe(true);
    expect(txt).toContain('HAYATO');
    expect(txt).toContain('CAIO');
    expect(txt).not.toContain('ROUND 1');
  });

  it('a música cai a 50% durante a provocação e volta ao valor salvo no fim', () => {
    const t = montar(CPU_DIFICIL, { music: 0.4 });
    t.update();
    const musica = () => t.audio.chamadas.filter(([n]) => n === 'setMusicVol').map(([, v]) => v);
    expect(musica().at(-1)).toBeCloseTo(0.2, 9);
    t.ate(() => !t.cena.provocacao.ativa);
    expect(musica().at(-1)).toBeCloseTo(0.4, 9);
  });
});

describe('round 2 em diante: um balão curto, com o motor parado em intro t 0', () => {
  it('COMPLETA: fala quem PERDEU o round anterior; o motor fica em intro/t 0 por EXATAMENTE a duração do roteiro e o round 2 só anda depois', () => {
    const t = montar();
    t.ate(() => t.game.round === 2);
    // o `round start` do round 2 acabou de sair do motor: a provocação abre NO MESMO tick, com o motor em intro t 0
    expect(t.cena.provocacao.ativa).toBe(true);
    const r = t.cena.provocacao.roteiro!;
    expect(r.tipo).toBe('rodada');
    expect(t.game.phase).toBe('intro');
    expect(t.game.t).toBe(0);
    expect(r.janelas).toHaveLength(1);
    // o P1 (parado) perdeu o round 1 para a CPU
    expect(t.game.p2.wins).toBe(1);
    expect(r.janelas[0]!.falante).toBe(0);
    const modelos = [...falasDe('hayato').revanche, ...(falasDe('hayato').decisivo ?? [])].map((f) => f.split('{rival}').join('CAIO'));
    expect(modelos).toContain(r.janelas[0]!.texto);
    const total = r.total;
    expect(total).toBe(durCompleta(r.janelas[0]!.n, 126) + 6);
    expect(total).toBeLessThanOrEqual(132);
    const tick = t.game.tick;
    for (let i = 1; i <= total; i++) {
      t.update();
      expect(t.game.tick, `update ${i}`).toBe(tick);
      expect(t.game.phase).toBe('intro');
      expect(t.game.t).toBe(0);
    }
    expect(t.cena.provocacao.ativa).toBe(false);
    t.update();
    expect(t.game.tick).toBe(tick + 1);
  });

  it('decisivo (os dois a 1 vitória do fim, luta de 3 rounds): fala quem perdeu e a lista é a `decisivo` do lutador, se ele a tem', () => {
    const dados = { ids: ['hayato', 'caio'] as const, nomes: ['HAYATO', 'CAIO'] as const };
    const decisivos = (falasDe('hayato').decisivo ?? []).map((f) => f.split('{rival}').join('CAIO'));
    const revanches = falasDe('hayato').revanche.map((f) => f.split('{rival}').join('CAIO'));
    expect(decisivos.length).toBeGreaterThan(0);
    // o P2 venceu o round 2 (placar 1 x 1): o P1 perdeu e fala, na lista decisiva
    const d = falaDaRodada(dados, { round: 3, vencedorAnterior: 1, vitorias: [1, 1], vitoriasParaVencer: 2 }, {});
    expect(d[0]?.falante).toBe(0);
    expect(decisivos).toContain(d[0]?.texto);
    // 1 x 0 no round 2: não é decisivo, é revanche comum
    const r = falaDaRodada(dados, { round: 2, vencedorAnterior: 1, vitorias: [0, 1], vitoriasParaVencer: 2 }, {});
    expect(revanches).toContain(r[0]?.texto);
  });

  it('cinemática CURTA ou DESLIGADA: o round 2 TEM provocação (CURTA, 1 linha, ~2 s, quem perdeu); só a opção PROVOCAÇÕES a desliga', () => {
    for (const cinematica of ['curta', 'desligada'] as const) {
      const t = montar(CPU_DIFICIL, { cinematica });
      t.ate(() => t.game.round === 2);
      expect(t.cena.provocacao.ativa, cinematica).toBe(true);
      const r = t.cena.provocacao.roteiro!;
      expect(r.tipo).toBe('rodada');
      expect(r.modo).toBe('curta');
      expect(r.janelas[0]!.falante).toBe(0);
      expect(r.total).toBeLessThanOrEqual(126);
      const tick = t.game.tick;
      for (let i = 1; i <= r.total; i++) {
        t.update();
        expect(t.game.tick, `${cinematica} update ${i}`).toBe(tick);
      }
      t.update();
      expect(t.game.tick).toBe(tick + 1);
    }
    const off = montar(CPU_DIFICIL, { cinematica: 'curta', provocacoes: 'desligadas' });
    off.ate(() => off.game.round === 2);
    expect(off.cena.provocacao.ativa).toBe(false);
  });

  it('movimento reduzido no round 2+ (COMPLETA explícita): durações iguais, texto inteiro, sem pop', () => {
    const t = montar(CPU_DIFICIL, { cinematica: 'completa' }, REGRAS_PADRAO, { reduz: true });
    t.ate(() => t.game.round === 2);
    const r = t.cena.provocacao.roteiro!;
    expect(r.modo).toBe('completa');
    expect(r.reduz).toBe(true);
    expect(r.total).toBe(durCompleta(r.janelas[0]!.n, 126) + 6);
  });
});

describe('vitória: o motor para em matchend t 56..100 e o fim da provocação fecha a luta', () => {
  /** Anda até a provocação da vitória abrir. */
  const ateAVitoria = (t: T): void => {
    t.ate(() => t.cena.provocacao.ativa && t.cena.provocacao.roteiro?.tipo === 'vitoria');
  };

  it('COMPLETA: congela em matchend com t entre 56 e 100; no fim matchDone vem UMA vez, finish() uma vez, sem game.update no tick final', () => {
    const t = montar();
    ateAVitoria(t);
    const r = t.cena.provocacao.roteiro!;
    expect(t.game.phase).toBe('matchend');
    expect(t.game.t).toBeGreaterThanOrEqual(56);
    expect(t.game.t).toBeLessThanOrEqual(100);
    expect(t.game.matchDone).toBe(false);
    expect(r.vencedor).toBe(1); // a CPU venceu o jogador parado
    expect(r.janelas[0]!.falante).toBe(1);
    const congelado = foto(t.game);
    for (let i = 1; i < r.total; i++) {
      t.update();
      expect(foto(t.game), `update ${i}`).toBe(congelado);
      expect(t.game.matchDone).toBe(false);
    }
    expect(t.idas).toEqual([]);
    t.update(); // o último
    expect(t.game.matchDone).toBe(true);
    expect(foto(t.game)).toBe(congelado); // nenhum game.update no tick final
    expect(t.idas).toEqual(['result']);
    t.update(5);
    expect(t.idas).toEqual(['result']); // finish() só uma vez
  });

  it('o título "X VENCE!" e o HUD somem sob as faixas; o balão do vencedor leva o nome dele; sem legenda de chefão', () => {
    const t = montar();
    ateAVitoria(t);
    t.update(60);
    const txt = t.desenhar().textos();
    expect(txt).toContain('CAIO');
    expect(txt).not.toContain('CAIO VENCE!');
    expect(txt).not.toContain('VITÓRIA FINAL');
  });

  it('CURTA: sem faixas e sem zoom; o título e o HUD ficam; dura duracaoCurta(n) + 6 e fecha a luta', () => {
    const t = montar(CPU_DIFICIL, { cinematica: 'curta' });
    ateAVitoria(t);
    const r = t.cena.provocacao.roteiro!;
    expect(r.modo).toBe('curta');
    expect(r.total).toBeLessThanOrEqual(126);
    const txt = t.desenhar().textos();
    expect(txt).toContain('CAIO VENCE!');
    t.update(r.total);
    expect(t.game.matchDone).toBe(true);
    expect(t.idas).toEqual(['result']);
  });

  it('ENTER encerra em <= 6 ticks (depois do tick 24); antes disso o ENTER é consumido e NÃO pula', () => {
    const t = montar();
    ateAVitoria(t);
    t.update(10);
    expect(t.cena.key('Enter')).toBe(true);
    expect(t.cena.provocacao.pulouEm).toBeNull();
    expect(t.game.matchDone).toBe(false);
    t.update(20);
    expect(t.cena.key('Enter')).toBe(true);
    expect(t.cena.provocacao.pulouEm).not.toBeNull();
    let n = 0;
    while (!t.game.matchDone && n < 20) {
      t.update();
      n++;
    }
    expect(n).toBeLessThanOrEqual(6);
    expect(t.idas).toEqual(['result']);
  });

  it('ZENON vencendo (chefão): a legenda antiga some e o balão novo entra com a fala dele; o jogador vencendo o chefão: a legenda de derrota some quando o balão abre', () => {
    const t = montar({ mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: 2, chefe: true }, { cinematica: 'desligada' });
    t.cena.entrada.zerar();
    (t.cena as unknown as { entradaPendente: boolean }).entradaPendente = false; // sem a entrada dramática: o assunto é a vitória
    // o pré-round do chefão NUNCA tem provocação (a entrada dramática é o round 1 dele)
    t.update();
    expect(t.cena.provocacao.ativa).toBe(false);
    expect(t.game.tick).toBe(1);
    ateAVitoria(t);
    const r = t.cena.provocacao.roteiro!;
    expect(r.vencedor).toBe(1);
    const z = falasDe('zenon');
    const dele = [...z.vitoria, ...(z.vitoriaPerfeita ?? []), ...(z.vitoriaPorTempo ?? []), ...(z.contra?.['hayato']?.vitoria ?? [])];
    expect(dele.map((f) => f.split('{rival}').join('HAYATO'))).toContain(r.janelas[0]!.texto);
    t.update(60);
    expect(t.desenhar().textos()).not.toContain('Aplausos para o convidado. A saída é pelos fundos.');
    // antes de a provocação abrir (matchend t < 56) a legenda de vitória dele TAMBÉM não aparece (o balão a substitui)
    const u = montar({ mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: 2, chefe: true }, { cinematica: 'desligada' });
    (u.cena as unknown as { entradaPendente: boolean }).entradaPendente = false;
    u.ate(() => u.game.phase === 'matchend');
    u.update(5); // a legenda sobe com o tempo da fase (alfa 0 em t 0): com 5 ticks ela já seria desenhada
    expect(u.cena.provocacao.ativa).toBe(false);
    expect(u.desenhar().textos()).not.toContain('Aplausos para o convidado. A saída é pelos fundos.');
    // com a opção PROVOCAÇÕES desligada a legenda de hoje continua como estava
    const v = montar({ mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: 2, chefe: true }, { cinematica: 'desligada', provocacoes: 'desligadas' });
    (v.cena as unknown as { entradaPendente: boolean }).entradaPendente = false;
    v.ate(() => v.game.phase === 'matchend');
    v.update(5);
    expect(v.desenhar().textos()).toContain('Aplausos para o convidado. A saída é pelos fundos.');
  });

  it('o jogador vencendo o chefão: a legenda de DERROTA do ZENON fica no KO e no matchend até o balão abrir (t 56); depois só o balão do jogador', () => {
    const DERROTA = 'Então o torneio é seu. Cuide melhor dele do que eu cuidei.';
    const t = montar({ mode: 'arcade', c1: 'hayato', c2: 'zenon', cpu: 0, chefe: true }, { cinematica: 'desligada' });
    (t.cena as unknown as { entradaPendente: boolean }).entradaPendente = false;
    t.ate(() => t.game.phase === 'fight');
    // o KO final do chefão (luta de 1 round): o jogador vence
    t.game.p2.barras = 1;
    (t.game as unknown as { ko(d: unknown, a: unknown): void }).ko(t.game.p2, t.game.p1);
    t.update(20);
    expect(t.game.phase).toBe('ko');
    expect(t.desenhar().textos(), 'no KO final').toContain(DERROTA);
    t.ate(() => t.game.phase === 'matchend');
    t.update(10);
    expect(t.cena.provocacao.ativa).toBe(false);
    expect(t.desenhar().textos(), 'no matchend, antes do balão').toContain(DERROTA);
    t.ate(() => t.cena.provocacao.ativa);
    const r = t.cena.provocacao.roteiro!;
    expect(r.tipo).toBe('vitoria');
    expect(r.vencedor).toBe(0); // o jogador (HAYATO) provoca o chefão caído
    t.update(60);
    const txt = t.desenhar().textos();
    expect(txt).not.toContain(DERROTA);
    expect(txt).toContain('HAYATO');
  });
});

describe('pular: ataque de um humano, ENTER ou toque, só depois do tick 10 (pré-round) e em <= 6 ticks', () => {
  it('cada botão de ataque pula depois do tick 10 e nenhum pula antes; as setas não pulam', () => {
    for (const botao of ['lp', 'hp', 'lk', 'hk', 'sp'] as const) {
      const t = montar();
      t.update(5);
      t.frames.p1 = { ...INPUT_VAZIO, [botao]: true };
      t.update(3);
      expect(t.cena.provocacao.pulouEm, `${botao} cedo`).toBeNull();
      t.frames.p1 = { ...INPUT_VAZIO, left: true, right: true, up: true, down: true };
      t.update(10);
      expect(t.cena.provocacao.pulouEm, 'setas').toBeNull();
      t.frames.p1 = { ...INPUT_VAZIO, [botao]: true };
      t.update();
      t.frames.p1 = { ...INPUT_VAZIO };
      expect(t.cena.provocacao.pulouEm, botao).not.toBeNull();
      let n = 0;
      while (t.cena.provocacao.ativa) {
        t.update();
        n++;
      }
      expect(n, botao).toBeLessThanOrEqual(6);
    }
  });

  it('uma tecla SEGURADA desde antes da provocação não pula (é borda); apertar de novo pula', () => {
    const t = montar(CPU_DIFICIL, {}, REGRAS_PADRAO, { teclasReais: true });
    t.teclas.definir('z', true); // P1: soco fraco, apertado ANTES e mantido
    t.update(); // a borda é consumida no 1º tick (a provocação ainda está nos primeiros ticks)
    t.update(40);
    expect(t.cena.provocacao.ativa).toBe(true);
    expect(t.cena.provocacao.pulouEm).toBeNull();
    t.teclas.definir('z', false);
    t.teclas.definir('z', true);
    t.update();
    expect(t.cena.provocacao.pulouEm).not.toBeNull();
  });

  it('SEM ECO: o golpe que pulou a provocação não vira ataque no 1º tick de luta (o fimDoTick consome a borda)', () => {
    const t = montar(CPU_DIFICIL, {}, REGRAS_PADRAO, { teclasReais: true });
    t.update(30);
    t.teclas.definir('z', true);
    t.update(); // pulou
    t.teclas.definir('z', false);
    t.ate(() => t.game.tick === 1);
    expect(t.game.p1.move).toBeNull();
    expect(t.game.p1.state).not.toBe('move');
  });

  it('ENTER pula (depois do 10); o clique/toque no canvas também, inclusive pelo Navegador (que ignora o clique na luta em andamento)', () => {
    const e = montar();
    e.update(5);
    expect(e.cena.key('Enter')).toBe(true);
    expect(e.cena.provocacao.pulouEm).toBeNull(); // antes do 10: consumido, não pula
    e.update(10);
    expect(e.cena.key('Enter')).toBe(true);
    expect(e.cena.provocacao.pulouEm).not.toBeNull();
    let n = 0;
    while (e.cena.provocacao.ativa) {
      e.update();
      n++;
    }
    expect(n).toBeLessThanOrEqual(6);

    const c = montar();
    c.update(15);
    c.ui.click(480, 270); // pelo Navegador
    expect(c.cena.provocacao.pulouEm).not.toBeNull();
    // fora da provocação o clique continua sendo ignorado na luta em andamento
    c.ate(() => !c.cena.provocacao.ativa);
    c.ate(() => c.game.phase === 'fight');
    expect(c.cena.aceitaToqueNaLuta()).toBe(false);
    const aberto = c.cena.paused;
    c.ui.click(480, 270);
    expect(c.cena.paused).toBe(aberto);
  });

  it('a pausa (ESC / perda de foco) congela a provocação e ela continua de onde parou; reiniciar a luta zera tudo', () => {
    const t = montar();
    t.update(30);
    const tick = t.cena.provocacao.tick;
    t.cena.key('Escape');
    expect(t.cena.paused).toBe(true);
    t.update(40);
    expect(t.cena.provocacao.tick).toBe(tick);
    expect(t.game.tick).toBe(0);
    t.cena.key('Escape');
    t.update(5);
    expect(t.cena.provocacao.tick).toBe(tick + 5);
    t.cena.blur();
    t.update(10);
    expect(t.cena.provocacao.tick).toBe(tick + 5);
    t.cena.enter({ cfg: { ...CPU_DIFICIL, esquiva: true } } as never);
    expect(t.cena.provocacao.ativa).toBe(false);
  });
});

describe('a faixa do ▶: só o balão de VITÓRIA reserva espaço embaixo do texto', () => {
  const reservas = (t: T): number[] => ((t.cena.provocacao as unknown as { variantes: Map<number, { caixas: Array<{ reserva: number }> }> }).variantes.get(0)?.caixas ?? []).map((c) => c.reserva);
  it('vitória: reserva 14 px em todas as variantes; abertura e round 2+: 0', () => {
    const v = montar();
    v.ate(() => v.cena.provocacao.ativa && v.cena.provocacao.roteiro?.tipo === 'vitoria');
    v.update(30);
    v.desenhar();
    expect(reservas(v).length).toBeGreaterThan(0);
    expect(reservas(v).every((r) => r === 14)).toBe(true);
    const a = montar();
    a.update(60);
    a.desenhar();
    expect(a.cena.provocacao.roteiro?.tipo).toBe('abertura');
    expect(reservas(a).every((r) => r === 0)).toBe(true);
  });
});

describe('o plano do balão é escolhido UMA vez e não pula', () => {
  it('ZENON x BAATAR (balão ao lado da cabeça): mexer nos lutadores DEPOIS do 1º quadro não troca o lado nem a largura da linha', () => {
    const t = montar({ mode: 'versus', c1: 'zenon', c2: 'baatar', cpu: null });
    t.update();
    expect(t.cena.provocacao.ativa).toBe(true);
    t.update(60); // o balão do P1 aberto
    t.desenhar();
    const p1 = t.cena.provocacao.planoDe(0);
    expect(p1, 'o plano existe depois do 1º quadro desenhado').toBeDefined();
    expect(p1?.lado, 'lutador alto: o balão não fica em cima da cabeça').not.toBe('cima');
    // o rival encosta no lutador: um plano refeito agora mudaria; o escolhido no 1º quadro tem de ficar
    t.game.p2.x = t.game.p1.x + 120;
    t.desenhar();
    t.update(3);
    t.desenhar();
    expect(t.cena.provocacao.planoDe(0)).toEqual(p1);
  });
});

describe('onde a provocação NÃO roda', () => {
  const nuncaIniciou = (t: T, ticks = 400): void => {
    for (let i = 0; i < ticks; i++) {
      t.update();
      expect(t.cena.provocacao.ativa, `update ${i + 1}`).toBe(false);
    }
    expect(t.game.tick).toBeGreaterThan(0);
  };

  it('TREINO, CPU×CPU e ?expansao=4 (regras sem cinemática)', () => {
    nuncaIniciou(montar({ mode: 'training', c1: 'hayato', c2: 'caio', cpu: null }));
    nuncaIniciou(montar({ mode: 'versus', c1: 'hayato', c2: 'caio', cpu: 1, p1cpu: 1 }));
    nuncaIniciou(montar(CPU_DIFICIL, {}, { ...REGRAS_PADRAO, cinematica: false }));
  });

  it('a opção PROVOCAÇÕES desligada e o gancho SEM_PROVOCACAO (pelo resto da luta: round 1, round 2+ e vitória)', () => {
    nuncaIniciou(montar(CPU_DIFICIL, { provocacoes: 'desligadas' }));
    const t = montar();
    t.cena.semProvocacao = true;
    nuncaIniciou(t, 100);
    let abriu = false;
    t.ate(() => {
      abriu = abriu || t.cena.provocacao.ativa;
      return t.game.matchDone;
    });
    expect(abriu).toBe(false);
    expect(t.idas).toEqual(['result']);
  });

  it('o VERSUS de 2 jogadores TAMBÉM tem provocação (decisão do dono) e qualquer um dos dois pula', () => {
    const t = montar({ mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null });
    t.update();
    expect(t.cena.provocacao.ativa).toBe(true);
    t.update(15);
    t.frames.p2 = { ...INPUT_VAZIO, hk: true }; // o P2 aperta
    t.update();
    expect(t.cena.provocacao.pulouEm).not.toBeNull();
  });

  it('o ARCADE e a LUTA vs CPU têm; o ZENON JOGÁVEL (não chefão) tem pré-round com as falas dele', () => {
    const t = montar({ mode: 'arcade', c1: 'zenon', c2: 'caio', cpu: 1 });
    t.update();
    expect(t.cena.provocacao.ativa).toBe(true);
    expect(t.cena.provocacao.roteiro!.janelas.map((j) => j.falante)).toEqual([0, 1]);
  });
});

describe('FOTO DO MOTOR: a luta com provocação é idêntica à luta sem ela, tick a tick', () => {
  /** Roda a luta inteira (CPU vence o jogador parado) e devolve a foto de cada (tick, t, fase). */
  const fotos = (set: Partial<Configuracoes>, sorteio = false): Map<string, string> => {
    const t = montar(CPU_DIFICIL, set, REGRAS_PADRAO, { sorteio });
    const m = new Map<string, string>();
    let ultimo = 0;
    for (let i = 0; i < 60000 && !t.game.matchDone; i++) {
      t.update();
      if (t.game.tick === ultimo) continue; // só os ticks em que o MOTOR andou: com o motor parado não há o que comparar
      ultimo = t.game.tick;
      m.set(`${t.game.round}|${t.game.phase}|${t.game.tick}|${t.game.t}`, foto(t.game));
    }
    expect(t.game.matchDone).toBe(true);
    return m;
  };

  it('toda foto da luta com provocação (COMPLETA, CURTA, com sorteio de falas) é igual à da luta sem, até o matchend t 56..100 em que ela fecha a luta', () => {
    const controle = fotos({ provocacoes: 'desligadas' });
    for (const [rotulo, set, sorteio] of [
      ['COMPLETA', {}, false],
      ['CURTA', { cinematica: 'curta' as const }, false],
      ['COMPLETA com sorteio', {}, true],
    ] as const) {
      const f = fotos(set, sorteio);
      let comparadas = 0;
      for (const [k, v] of f) {
        const c = controle.get(k);
        expect(c, `${rotulo}: ${k} existe na luta de controle`).toBeDefined();
        expect(v, `${rotulo}: ${k}`).toBe(c);
        comparadas++;
      }
      // a luta inteira até a vitória foi comparada (round 1, round 2 e o começo do matchend)
      expect(comparadas, rotulo).toBeGreaterThan(300);
      expect([...f.keys()].some((k) => k.includes('|matchend|'))).toBe(true);
      expect(f.size).toBeLessThan(controle.size); // o matchend acaba mais cedo: a provocação fecha a luta
    }
  });

  it('o sorteio das falas não consome o RNG da luta: a sequência do RNG é a mesma com e sem `sorteioDeFalas`', () => {
    const a = fotos({}, false);
    const b = fotos({}, true);
    for (const [k, v] of a) expect(b.get(k), k).toBe(v);
  });
});

describe('desenharMundo: as opções novas são aditivas', () => {
  const desenhar = (op: Parameters<typeof desenharMundo>[6]) => {
    const t = montar(CPU_DIFICIL, { provocacoes: 'desligadas' });
    t.update(2);
    const m = t.ui.m;
    const rng = criarRng(1);
    const g = gravador();
    desenharMundo(g.ctx, m.game, m.rec, m.efeitos, m.petalasLuta, rng, { tremor: false, ...op });
    return g;
  };

  it('sem as opções novas, o desenho é o de hoje; `overlay: false` esconde só o texto de fase (o HUD fica)', () => {
    const base = desenhar({});
    const sem = desenhar({ overlay: false });
    expect(base.textos()).toContain('ROUND 1');
    expect(sem.textos()).not.toContain('ROUND 1');
    expect(sem.textos()).toContain('HAYATO');
    expect(desenhar({ hud: false }).textos()).not.toContain('HAYATO');
  });

  it('`deslocamento` move só o lutador pedido (translate(dx, 0) em volta dele) e `zoom` escala em torno de (x, chão) por fora da câmera', () => {
    const base = desenhar({}).chamadas.filter(([n]) => n === 'translate').length;
    const g = desenhar({ deslocamento: { 0: -123 } });
    expect(g.chamadas.some(([n, x, y]) => n === 'translate' && x === -123 && y === 0)).toBe(true);
    expect(g.chamadas.filter(([n]) => n === 'translate').length).toBe(base + 1);
    expect(desenhar({ deslocamento: { 0: 0, 1: 0 } }).chamadas.filter(([n]) => n === 'translate').length).toBe(base);
    const z = desenhar({ zoom: { fator: 1.08, x: 300 } });
    const i = z.chamadas.findIndex(([n, a, b]) => n === 'translate' && a === 300 && b === 470);
    expect(i).toBeGreaterThan(-1);
    expect(z.chamadas[i + 1]).toEqual(['scale', 1.08, 1.08]);
    expect(desenhar({ zoom: { fator: 1, x: 300 } }).chamadas.some(([n, a]) => n === 'translate' && a === 300)).toBe(false);
  });
});
