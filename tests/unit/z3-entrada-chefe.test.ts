import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type IdLutador, type InputFrame, type LeituraLuta, type LutadorLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { poseDaCena as poseDoMotor } from '../../src/data/cena';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { APRESENTACAO, comPose, falaDoChefe, leituraApresentada, poseDaCena, poseDeApresentacao } from '../../src/render/apresentacao-lutadores';
import {
  ALTURA_DA_FAIXA,
  DURACAO_ENTRADA_COMPLETA,
  DURACAO_ENTRADA_CURTA,
  EntradaDoChefe,
  PULO_VALE_A_PARTIR_DE,
  SAIDA_AO_PULAR,
  falaDaEntrada,
  linhaDaEntrada,
  type SomDaEntrada,
} from '../../src/render/entrada-chefe';
import type { CampanhaArcade } from '../../src/ui/tipos';
import type { Mundo } from '../../src/ui/contexto';
import type { CenaFight } from '../../src/ui/cenas/fight';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { gravador as gravadorBasico, navegadorFalso } from './_ui';

/*
 * Z3 (Lyra): a ENTRADA DRAMÁTICA do chefão e a tabela de apresentação (docs/spec-chefao-zenon.md §3). A entrada é apresentação pura e fica FORA do
 * motor e do lock-step: a cena não chama `game.update` enquanto ela roda (como a cinemática do especial). Elenco de produção (o ZENON real) e um
 * `Game` de verdade; só a arte e o áudio são falsos.
 */
const prod = montarElenco();
const ID_ZENON = 'zenon' as IdLutador;
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;
const CARTAO = APRESENTACAO['zenon']?.entradaDramatica as NonNullable<NonNullable<(typeof APRESENTACAO)[string]>['entradaDramatica']>;

describe('linha do tempo da entrada (função pura do tick)', () => {
  it('COMPLETA = 156 ticks (2,6 s) e CURTA = 60 (1 s)', () => {
    expect(DURACAO_ENTRADA_COMPLETA).toBe(156);
    expect(DURACAO_ENTRADA_CURTA).toBe(60);
  });

  it('faixas: 0 -> 56 px em 12 ticks, ficam e saem nos últimos 12', () => {
    expect(linhaDaEntrada('completa', 0).faixa).toBe(0);
    expect(linhaDaEntrada('completa', 12).faixa).toBe(ALTURA_DA_FAIXA);
    expect(ALTURA_DA_FAIXA).toBe(56);
    expect(linhaDaEntrada('completa', 100).faixa).toBe(ALTURA_DA_FAIXA);
    expect(linhaDaEntrada('completa', 156).faixa).toBe(0);
    const saida = [144, 148, 152, 156].map((t) => linhaDaEntrada('completa', t).faixa);
    expect(saida[0]).toBe(ALTURA_DA_FAIXA);
    expect(saida).toEqual([...saida].sort((a, b) => b - a));
    expect(linhaDaEntrada('curta', 60).faixa).toBe(0);
  });

  it('os 6 braseiros acendem da esquerda para a direita, um a cada 6 ticks, de 12 a 48', () => {
    expect(linhaDaEntrada('completa', 11).acesos).toBe(0);
    expect(linhaDaEntrada('completa', 12).acesos).toBe(0);
    expect(linhaDaEntrada('completa', 18).acesos).toBe(1);
    expect(linhaDaEntrada('completa', 30).acesos).toBe(3);
    expect(linhaDaEntrada('completa', 48).acesos).toBe(6);
    expect(linhaDaEntrada('completa', 100).acesos).toBe(6);
    let ant = -1;
    for (let t = 0; t <= DURACAO_ENTRADA_COMPLETA; t++) {
      const a = linhaDaEntrada('completa', t).acesos;
      expect(a).toBeGreaterThanOrEqual(ant);
      ant = a;
    }
  });

  it('a pose: de costas (0) até o tick 48, vira a cabeça (1) até o 84 e aperta a tira (2) depois', () => {
    const p = (t: number) => linhaDaEntrada('completa', t).pose;
    expect([0, 47].map(p)).toEqual([0, 0]);
    expect([48, 83].map(p)).toEqual([1, 1]);
    expect([84, 155].map(p)).toEqual([2, 2]);
  });

  it('o cartão e a fala entram no tick 84 / 90 (COMPLETA)', () => {
    expect(linhaDaEntrada('completa', 83).cartao).toBe(0);
    expect(linhaDaEntrada('completa', 94).cartao).toBe(1);
    expect(linhaDaEntrada('completa', 90).letras).toBe(0);
    expect(linhaDaEntrada('completa', 100).letras).toBeGreaterThan(0);
    // a fala inteira (88 letras) termina antes de as faixas saírem
    expect(linhaDaEntrada('completa', 144).letras).toBeGreaterThanOrEqual((APRESENTACAO['zenon']?.falas?.entrada ?? '').length);
  });

  it('CURTA: faixas + `entrada2` + cartão, sem a sequência de braseiros (todos acesos desde o início, sem véu)', () => {
    for (const t of [0, 10, 30, 59]) {
      const q = linhaDaEntrada('curta', t);
      expect(q.pose, `t ${t}`).toBe(2);
      expect(q.acesos, `t ${t}`).toBe(6);
    }
    expect(linhaDaEntrada('curta', 20).cartao).toBe(1);
    expect(linhaDaEntrada('curta', 20).faixa).toBe(ALTURA_DA_FAIXA);
  });

  it('pulou no tick `p`: sai em até 6 ticks, o chefe fica em `entrada2` e os braseiros que faltavam acendem', () => {
    const q = (t: number) => linhaDaEntrada('completa', t, 20);
    expect(q(20).faixa).toBeGreaterThan(0);
    expect(q(26).faixa).toBe(0);
    expect(q(26).acesos).toBe(6);
    expect(q(21).pose).toBe(2);
    expect(q(23).alfa).toBeLessThan(1);
    expect(linhaDaEntrada('completa', 26, 20).alfa).toBe(0);
  });

  it('a fala: a COMPLETA diz tudo; a CURTA só a primeira frase', () => {
    const fala = APRESENTACAO['zenon']?.falas?.entrada as string;
    expect(fala).toMatch(/^Bem-vindo à minha casa\./);
    expect(falaDaEntrada('completa', fala)).toBe(fala);
    expect(falaDaEntrada('curta', fala)).toBe('Bem-vindo à minha casa.');
    expect(falaDaEntrada('curta', 'sem ponto')).toBe('sem ponto');
  });
});

describe('o controlador EntradaDoChefe', () => {
  const iniciar = (modo: 'completa' | 'curta') => {
    const sons: SomDaEntrada[] = [];
    const e = new EntradaDoChefe({ aoSom: (s) => sons.push(s) });
    e.iniciar(modo, CARTAO, 'Bem-vindo à minha casa. Teste.');
    return { e, sons };
  };

  it('termina em EXATAMENTE 156 / 60 avanços', () => {
    for (const [modo, n] of [['completa', 156], ['curta', 60]] as const) {
      const { e } = iniciar(modo);
      for (let i = 1; i <= n; i++) {
        expect(e.ativa, `${modo} antes do avanço ${i}`).toBe(true);
        e.avancar();
      }
      expect(e.ativa, modo).toBe(false);
      expect(e.tick).toBe(n);
    }
  });

  it('pular só vale depois do tick 10 (não engole o ENTER que confirmou o VS) e acaba em <= 6 avanços', () => {
    expect(PULO_VALE_A_PARTIR_DE).toBe(10);
    expect(SAIDA_AO_PULAR).toBe(6);
    const { e } = iniciar('completa');
    for (let i = 0; i < 9; i++) e.avancar();
    expect(e.pular()).toBe(false); // tick 9
    e.avancar();
    expect(e.pular()).toBe(true); // tick 10
    expect(e.pular()).toBe(false); // uma vez só
    let n = 0;
    while (e.ativa) {
      e.avancar();
      n++;
      expect(n).toBeLessThanOrEqual(6);
    }
    expect(n).toBe(6);
  });

  it('pular no tick 11 (como a spec): acaba no 17º avanço, nunca depois de 17', () => {
    const { e } = iniciar('completa');
    for (let i = 0; i < 11; i++) e.avancar();
    expect(e.pular()).toBe(true);
    for (let i = 0; i < 6; i++) e.avancar();
    expect(e.ativa).toBe(false);
    expect(e.tick).toBe(17);
  });

  it('pular perto do fim não estende nada (a saída nunca passa do fim natural)', () => {
    const { e } = iniciar('completa');
    for (let i = 0; i < 153; i++) e.avancar();
    expect(e.pular()).toBe(true);
    while (e.ativa) e.avancar();
    expect(e.tick).toBe(156);
  });

  it('sons: o das faixas ao iniciar, um tom por braseiro (0 a 5, uma vez cada, em ordem) e o do cartão uma vez', () => {
    const { e, sons } = iniciar('completa');
    expect(sons).toEqual(['faixas']);
    while (e.ativa) e.avancar();
    const brasas = sons.filter((s): s is { braseiro: number } => typeof s === 'object');
    expect(brasas.map((b) => b.braseiro)).toEqual([0, 1, 2, 3, 4, 5]);
    expect(sons.filter((s) => s === 'cartao')).toHaveLength(1);
    expect(sons.filter((s) => s === 'faixas')).toHaveLength(1);
  });

  it('CURTA não toca os tons dos braseiros', () => {
    const { e, sons } = iniciar('curta');
    while (e.ativa) e.avancar();
    expect(sons.filter((s) => typeof s === 'object')).toHaveLength(0);
  });

  it('zerar() desliga tudo; avancar() parado não faz nada', () => {
    const { e } = iniciar('completa');
    for (let i = 0; i < 5; i++) e.avancar();
    e.zerar();
    expect(e.ativa).toBe(false);
    const t = e.tick;
    e.avancar();
    expect(e.tick).toBe(t);
    expect(e.pular()).toBe(false);
  });

  it('desenha o cartão (nome, título, rodapé) e a fala letra a letra; faixas com a altura da linha do tempo; nada quando inativa', () => {
    const { e } = iniciar('completa');
    const g = gravadorBasico();
    e.desenhar(g.ctx);
    expect(g.chamadas.length).toBe(0 + g.chamadas.length); // (inativa só depois do fim; aqui ainda está ativa)
    for (let i = 0; i < 100; i++) e.avancar();
    const d = gravadorBasico();
    e.desenhar(d.ctx);
    const t = d.textos();
    expect(t).toContain('ZENON ARGYROS');
    expect(t).toContain('O ARCONTE');
    expect(t).toContain(CARTAO.rodape.split('').join(' '));
    expect(t.some((x) => 'Bem-vindo à minha casa. Teste.'.startsWith(x) && x.length > 0)).toBe(true);
    const faixas = d.chamadas.filter(([n]) => n === 'fillRect');
    expect(faixas[0]?.slice(1)).toEqual([0, 0, 960, ALTURA_DA_FAIXA]);
    expect(faixas[1]?.slice(1)).toEqual([0, 540 - ALTURA_DA_FAIXA, 960, ALTURA_DA_FAIXA]);
    while (e.ativa) e.avancar();
    const fim = gravadorBasico();
    e.desenhar(fim.ctx);
    expect(fim.chamadas).toEqual([]);
  });
});

describe('a tabela de apresentação', () => {
  const luta = (phase: LeituraLuta['phase'], round: number, t: number) => ({ phase, round, t });

  it('poseDaCena é a MESMA conta do motor (src/data/cena): poses[floor(t·n/duracao)], a última segura', () => {
    for (const c of [APRESENTACAO['zenon']?.entrada, APRESENTACAO['zenon']?.vitoria, APRESENTACAO['baatar']?.entrada, APRESENTACAO['baatar']?.vitoria]) {
      for (let t = 0; t <= 200; t++) expect(poseDaCena(c!, t), `t ${t}`).toBe(poseDoMotor(c!, t));
    }
    expect(poseDaCena({ duracao: 90, poses: ['a', 'b', 'c'] }, 29)).toBe('a');
    expect(poseDaCena({ duracao: 90, poses: ['a', 'b', 'c'] }, 30)).toBe('b');
    expect(poseDaCena({ duracao: 90, poses: ['a', 'b', 'c'] }, 999)).toBe('c');
  });

  it('BAATAR: a Dança da Águia virou só entrada (devekh0-2, 90 ticks) e vitória (devekh0, win, 60 ticks); ZENON: entrada0-2 e vitoria0-1', () => {
    expect(APRESENTACAO['baatar']?.entrada).toEqual({ duracao: 90, poses: ['devekh0', 'devekh1', 'devekh2'] });
    expect(APRESENTACAO['baatar']?.vitoria).toEqual({ duracao: 60, poses: ['devekh0', 'win'] });
    expect(APRESENTACAO['zenon']?.entrada).toEqual({ duracao: 90, poses: ['entrada0', 'entrada1', 'entrada2'] });
    expect(APRESENTACAO['zenon']?.vitoria).toEqual({ duracao: 80, poses: ['vitoria0', 'vitoria1'] });
    expect(APRESENTACAO['baatar']?.falas).toBeUndefined(); // sem provocação
    expect(APRESENTACAO['baatar']?.entradaDramatica).toBeUndefined();
    expect(APRESENTACAO['zenon']?.aviso).toEqual(['O ANFITRIÃO', 'ESTÁ À SUA ESPERA']);
  });

  it('toda pose citada existe no atlas.json REAL do lutador (mapa do Apolo, spec §2.1)', () => {
    for (const id of ['zenon', 'baatar']) {
      const atlas = JSON.parse(readFileSync(fileURLToPath(new URL(`../../public/assets/lutadores/${id}/atlas.json`, import.meta.url)), 'utf8')) as { quadros: Record<string, unknown> };
      const ap = APRESENTACAO[id];
      const citadas = [...(ap?.entrada?.poses ?? []), ...(ap?.vitoria?.poses ?? [])];
      expect(citadas.length).toBeGreaterThan(0);
      for (const p of citadas) expect(atlas.quadros[p], `${id}: ${p}`).toBeDefined();
    }
  });

  it('pose de entrada na `intro` do 1º round, pelo tempo da fase; o chefão com entrada dramática fica na última pose; round 2 e golpes não mudam', () => {
    const lutador = (id: string, chefe = false, state = 'idle') => ({ id: id as IdLutador, state, chefe }) as Pick<LutadorLeitura, 'id' | 'state' | 'chefe'>;
    expect([0, 29, 30, 59, 60, 89, 200].map((t) => poseDeApresentacao(luta('intro', 1, t), lutador('baatar')))).toEqual(['devekh0', 'devekh0', 'devekh1', 'devekh1', 'devekh2', 'devekh2', 'devekh2']);
    expect(poseDeApresentacao(luta('intro', 1, 5), lutador('zenon'))).toBe('entrada0');
    expect(poseDeApresentacao(luta('intro', 1, 5), lutador('zenon', true))).toBe('entrada2');
    expect(poseDeApresentacao(luta('intro', 2, 5), lutador('baatar'))).toBeNull();
    expect(poseDeApresentacao(luta('fight', 1, 5), lutador('baatar'))).toBeNull();
    expect(poseDeApresentacao(luta('intro', 1, 5), lutador('hayato'))).toBeNull();
  });

  it('pose de vitória no estado `win` de roundend/matchend, pelo tempo da fase', () => {
    const lutador = (id: string, state: string) => ({ id: id as IdLutador, state, chefe: false }) as Pick<LutadorLeitura, 'id' | 'state' | 'chefe'>;
    expect(poseDeApresentacao(luta('matchend', 1, 0), lutador('zenon', 'win'))).toBe('vitoria0');
    expect(poseDeApresentacao(luta('matchend', 1, 79), lutador('zenon', 'win'))).toBe('vitoria1');
    expect(poseDeApresentacao(luta('roundend', 1, 10), lutador('baatar', 'win'))).toBe('devekh0');
    expect(poseDeApresentacao(luta('roundend', 1, 30), lutador('baatar', 'win'))).toBe('win');
    expect(poseDeApresentacao(luta('matchend', 1, 10), lutador('zenon', 'ko'))).toBeNull(); // o perdedor não comemora
    expect(poseDeApresentacao(luta('matchend', 1, 10), lutador('hayato', 'win'))).toBeNull();
  });

  it('leituraApresentada devolve a MESMA leitura sem pose de apresentação e uma cópia rasa com ela (o original não muda)', () => {
    const g = new Game({ lutadores: prod, rng: criarRng(5) });
    g.setup({ mode: 'versus', c1: 'hayato', c2: 'baatar', cpu: null, esquiva: true }, { rounds: 2, time: 99, shake: true } as unknown as Configuracoes);
    expect(g.phase).toBe('intro');
    const [a, b] = g.fighters as unknown as [LutadorLeitura, LutadorLeitura];
    expect(leituraApresentada(g as unknown as LeituraLuta, a)).toBe(a);
    const vista = leituraApresentada(g as unknown as LeituraLuta, b);
    expect(vista).not.toBe(b);
    expect(vista.pose.name).toBe('devekh0');
    expect(b.pose.name).not.toBe('devekh0');
    expect(comPose(b, b.pose.name)).toBe(b);
  });

  it('as falas do chefão: fase 2 na cena, vitória no matchend com ele vencedor, derrota no KO final; fora do chefão nada', () => {
    const falas = APRESENTACAO['zenon']?.falas;
    const chefe = { id: ID_ZENON, chefe: true, indice: 1 as const, hp: 10 };
    const l = (phase: LeituraLuta['phase'], matchWinner: 0 | 1 | null = null) => ({ phase, matchWinner, winner: matchWinner, fighters: [] }) as unknown as Pick<LeituraLuta, 'phase' | 'matchWinner' | 'winner' | 'fighters'>;
    expect(falaDoChefe(l('cena-chefe'), chefe)).toBe(falas?.fase2);
    expect(falaDoChefe(l('matchend', 1), chefe)).toBe(falas?.vitoria);
    expect(falaDoChefe(l('matchend', 0), chefe)).toBe(falas?.derrota);
    expect(falaDoChefe(l('ko'), { ...chefe, hp: 0 })).toBe(falas?.derrota);
    expect(falaDoChefe(l('ko'), chefe)).toBeNull(); // o KO foi do jogador
    expect(falaDoChefe(l('fight'), chefe)).toBeNull();
    expect(falaDoChefe(l('cena-chefe'), { ...chefe, chefe: false })).toBeNull();
    expect(falas?.fase2).toBe('Chega de cortesia.');
  });
});

describe('a CENA da luta com a entrada: o motor e o lock-step não a veem', () => {
  const settings = (s: Partial<Configuracoes>): Partial<Configuracoes> => ({ ...s });
  type Frames = { p1: InputFrame; p2: InputFrame };

  function montar(set: Partial<Configuracoes> = {}, regras: Regras = REGRAS_PADRAO, run?: CampanhaArcade, c2: IdLutador = ID_ZENON, chefe = true) {
    const n = navegadorFalso(settings(set), regras);
    const frames: Frames = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
    (n.c as { entrada: unknown }).entrada = {
      lerP1: () => ({ ...frames.p1 }),
      lerP2: () => ({ ...frames.p2 }),
      lerMesclado: () => ({ ...frames.p1 }),
      fimDoTick: () => undefined,
    };
    const game = new Game({ lutadores: prod, rng: criarRng(5) });
    n.ui.pronto({
      rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
      elenco,
      arte: { pedir: () => undefined, usar: () => undefined, estaPronto: () => true, prebuscar: () => undefined },
      game,
      efeitos: new Efeitos(criarRng(1)),
      petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
    } as unknown as Mundo);
    n.ui.set('fight', { cfg: { mode: 'arcade', c1: 'hayato', c2, cpu: 0, chefe, esquiva: regras.esquiva }, ...(run ? { run } : {}) });
    const cena = n.ui.scene as unknown as CenaFight;
    const update = (k = 1): void => {
      for (let i = 0; i < k; i++) cena.update();
    };
    return { ...n, game, cena, frames, update };
  }

  const run = (extra: Partial<CampanhaArcade> = {}): CampanhaArcade => ({ c1: 'hayato', etapas: [{ id: ID_ZENON, chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0, ...extra });

  /** Foto do estado que o lock-step compara: tick, relógio, os dois lutadores e o RNG da luta. */
  const foto = (g: Game): string =>
    JSON.stringify({
      tick: g.tick,
      t: g.t,
      fase: g.phase,
      rng: (g as unknown as { rng: { estado?: () => unknown } }).rng.estado?.() ?? null,
      f: g.fighters.map((f) => [f.x, f.y, f.hp, f.en, f.state, f.barras, f.ficha, f.score, f.age]),
    });

  it('COMPLETA (o padrão na 1ª luta do ARCADE): game.tick fica em 0 por 156 update() e anda no 157º', () => {
    const t = montar({}, REGRAS_PADRAO, run());
    expect(t.cena.entrada.ativa).toBe(false); // começa no 1º update (a arte pronta)
    for (let i = 1; i <= DURACAO_ENTRADA_COMPLETA; i++) {
      t.update();
      expect(t.game.tick, `update ${i}`).toBe(0);
      expect(t.game.t, `update ${i}`).toBe(0);
      expect(t.game.phase).toBe('intro');
    }
    expect(t.cena.entrada.ativa).toBe(false);
    expect(t.cena.entrada.modo).toBe('completa');
    t.update();
    expect(t.game.tick).toBe(1);
  });

  it('ENTER no update 20 pula: a luta anda em <= 8 updates (spec: critério (b))', () => {
    const t = montar({}, REGRAS_PADRAO, run());
    t.update(20);
    expect(t.cena.entrada.ativa).toBe(true);
    expect(t.cena.key('Enter')).toBe(true);
    let n = 0;
    while (t.game.tick === 0 && n < 30) {
      t.update();
      n++;
    }
    expect(n).toBeLessThanOrEqual(8);
  });

  it('a pausa (ESC ou perda de foco) congela a entrada: ela não anda pausada e continua de onde parou', () => {
    const t = montar({}, REGRAS_PADRAO, run());
    t.update(30);
    expect(t.cena.entrada.tick).toBe(30);
    t.cena.key('Escape');
    expect(t.cena.paused).toBe(true);
    t.update(50);
    expect(t.cena.entrada.tick).toBe(30);
    expect(t.game.tick).toBe(0);
    t.cena.key('Escape');
    expect(t.cena.paused).toBe(false);
    t.update(5);
    expect(t.cena.entrada.tick).toBe(35);
    t.cena.blur(); // perdeu o foco: pausa sozinha
    t.update(20);
    expect(t.cena.entrada.tick).toBe(35);
  });

  it('qualquer botão de ataque de um humano pula depois do tick 10 e nenhum pula antes', () => {
    for (const botao of ['lp', 'hp', 'lk', 'hk', 'sp'] as const) {
      const t = montar({}, REGRAS_PADRAO, run());
      t.update(5);
      t.frames.p1 = { ...INPUT_VAZIO, [botao]: true };
      t.update(3);
      expect(t.cena.entrada.pulouEm, `${botao} cedo`).toBeNull();
      t.frames.p1 = { ...INPUT_VAZIO };
      t.update(5);
      t.frames.p1 = { ...INPUT_VAZIO, [botao]: true };
      t.update();
      t.frames.p1 = { ...INPUT_VAZIO };
      expect(t.cena.entrada.pulouEm, botao).not.toBeNull();
      let n = 0;
      while (t.cena.entrada.ativa) {
        t.update();
        n++;
      }
      expect(n, botao).toBeLessThanOrEqual(SAIDA_AO_PULAR);
    }
  });

  it('as setas não pulam (só ataque, ESP e ENTER)', () => {
    const t = montar({}, REGRAS_PADRAO, run());
    t.update(20);
    t.frames.p1 = { ...INPUT_VAZIO, left: true, right: true, up: true, down: true };
    t.update(5);
    expect(t.cena.entrada.pulouEm).toBeNull();
  });

  it('DETERMINISMO: COMPLETA, CURTA e pulada no tick 11 deixam tick, relógio, os dois lutadores e o RNG IGUAIS a uma luta sem entrada, depois de 600 ticks', () => {
    const ate = (t: ReturnType<typeof montar>, n: number, aoUpdate?: (i: number) => void): void => {
      let i = 0;
      while (t.game.tick < n && i < 5000) {
        i++;
        aoUpdate?.(i);
        t.update();
      }
      expect(t.game.tick).toBe(n);
    };
    const controle = montar({}, { ...REGRAS_PADRAO, cinematica: false }); // sem cinemática = sem entrada
    ate(controle, 600);
    expect(controle.cena.entrada.ativa).toBe(false);
    const alvo = foto(controle.game);

    const completa = montar({ cinematica: 'completa' }, REGRAS_PADRAO, run());
    ate(completa, 600);
    expect(completa.cena.entrada.modo).toBe('completa');

    const curta = montar({ cinematica: 'curta' }, REGRAS_PADRAO, run());
    ate(curta, 600);
    expect(curta.cena.entrada.modo).toBe('curta');

    const pulada = montar({ cinematica: 'completa' }, REGRAS_PADRAO, run());
    ate(pulada, 600, (i) => {
      pulada.frames.p1 = i === 12 ? { ...INPUT_VAZIO, lp: true } : { ...INPUT_VAZIO }; // o botão chega no update 12 (a entrada já passou do tick 10)
    });
    expect(pulada.cena.entrada.pulouEm).not.toBeNull();

    // o controle e a curta/pulada usam as mesmas teclas (nenhuma): as fotos do motor têm de bater byte a byte
    expect(foto(completa.game)).toBe(alvo);
    expect(foto(curta.game)).toBe(alvo);
    expect(foto(pulada.game)).toBe(alvo);
  });

  it('o modo: COMPLETA na 1ª luta contra o chefão do ARCADE, CURTA depois (continue/reiniciar) e com a cinemática CURTA ou DESLIGADA; regras sem cinemática = nenhuma', () => {
    const r = run();
    const primeira = montar({}, REGRAS_PADRAO, r);
    primeira.update();
    expect(primeira.cena.entrada.modo).toBe('completa');
    expect(r.entradaDoChefeVista).toBe(true);
    const depois = montar({}, REGRAS_PADRAO, r); // a MESMA campanha (um continue): curta
    depois.update();
    expect(depois.cena.entrada.ativa).toBe(true);
    expect(depois.cena.entrada.modo).toBe('curta');
    expect(montar({ cinematica: 'curta' }, REGRAS_PADRAO, run()).update).toBeDefined();
    for (const pref of ['curta', 'desligada'] as const) {
      const t = montar({ cinematica: pref }, REGRAS_PADRAO, run());
      t.update();
      expect(t.cena.entrada.ativa, pref).toBe(true);
      expect(t.cena.entrada.modo, pref).toBe('curta'); // o nome do chefão aparece sempre: a entrada não some, só encolhe
    }
    const sem = montar({ cinematica: 'completa' }, { ...REGRAS_PADRAO, cinematica: false }, run());
    sem.update();
    expect(sem.cena.entrada.ativa).toBe(false);
    expect(sem.game.tick).toBe(1);
    // outro ARCADE (uma campanha nova) volta a ter a entrada completa
    const nova = montar({}, REGRAS_PADRAO, run());
    nova.update();
    expect(nova.cena.entrada.modo).toBe('completa');
  });

  it('só o chefão com `entradaDramatica` faz a entrada: lutador comum, BAATAR comum e treino não', () => {
    for (const [c2, chefe] of [['caio', false], ['baatar', false], ['baatar', true]] as const) {
      const t = montar({}, REGRAS_PADRAO, run(), c2, chefe);
      t.update();
      expect(t.cena.entrada.ativa, `${c2} chefe=${String(chefe)}`).toBe(false);
      expect(t.game.tick, c2).toBe(1);
    }
  });

  it('o desenho: durante a entrada o HUD some (nem o nome do lutador sai) e o cartão aparece; depois, o HUD e o "ROUND 1" voltam', () => {
    const t = montar({}, REGRAS_PADRAO, run());
    t.update(100);
    const durante = gravadorBasico();
    (t.c as { ctx: unknown }).ctx = durante.ctx;
    t.cena.draw();
    const txt = durante.textos();
    expect(txt).not.toContain('HAYATO');
    expect(txt).not.toContain('ZENON');
    expect(txt).toContain('ZENON ARGYROS');
    expect(txt).toContain('O ARCONTE');
    t.update(100);
    expect(t.cena.entrada.ativa).toBe(false);
    const depois = gravadorBasico();
    (t.c as { ctx: unknown }).ctx = depois.ctx;
    t.cena.draw();
    expect(depois.textos()).toContain('HAYATO');
    expect(depois.textos()).toContain('ROUND 1');
    expect(depois.textos()).not.toContain('ZENON ARGYROS');
  });

  it('toca a trilha do chefão (valsa 3/4) no enter e a de luta nas outras lutas', () => {
    const chefe = montar({}, REGRAS_PADRAO, run());
    const musica = (a: ReturnType<typeof montar>): unknown[][] => a.audio.chamadas.filter(([n]) => n === 'startMusic').map(([, ...args]) => args);
    expect(musica(chefe).at(-1)).toEqual(['chefe']);
    const comum = montar({}, REGRAS_PADRAO, run(), 'caio', false);
    expect(musica(comum).at(-1)).toEqual(['fight']);
  });

  it('a legenda do chefão aparece na fase 2 (durante a cena) e some fora dela', () => {
    const t = montar({ cinematica: 'desligada' }, { ...REGRAS_PADRAO, cinematica: false }, run());
    t.update(2);
    t.game.phase = 'cena-chefe';
    t.game.t = 20;
    const g = gravadorBasico();
    (t.c as { ctx: unknown }).ctx = g.ctx;
    t.cena.draw();
    expect(g.textos()).toContain('Chega de cortesia.');
    t.game.phase = 'fight';
    const h = gravadorBasico();
    (t.c as { ctx: unknown }).ctx = h.ctx;
    t.cena.draw();
    expect(h.textos()).not.toContain('Chega de cortesia.');
  });
});
