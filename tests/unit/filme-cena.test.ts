import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { todosOsFilmes } from '../../src/data/filmes';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { TICKS_DA_SAIDA_AO_PULAR, TICKS_PARA_PULAR } from '../../src/render/filme';
import type { Mundo } from '../../src/ui/contexto';
import { lerFilmeDev, type CenaFight } from '../../src/ui/cenas/fight';
import { PROD } from './_filme';
import { navegadorFalso, arteFalsa } from './_ui';

/*
 * V2-3d: a CENA da luta com o filme. Enquanto ele roda a cena não chama `game.update` (como a cinemática); KO, pó da queda e troca de barra esperam o último quadro;
 * pular não muda um bit do motor; o filme é CURTO na repetição (D-V4) e no treino (D-V5). Luta de verdade (motor com `motorV2.filmes`), só a arte e o áudio são falsos.
 */
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(PROD).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

type Opcoes = { settings?: Partial<Configuracoes>; regras?: Regras; c1?: IdLutador; c2?: IdLutador; mode?: 'versus' | 'training'; filmes?: boolean };

function montar(o: Opcoes = {}) {
  const regras = o.regras ?? REGRAS_PADRAO;
  const n = navegadorFalso({ provocacoes: 'desligadas', ...o.settings }, regras);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  (n.c as { entrada: unknown }).entrada = {
    lerP1: () => ({ ...frames.p1 }),
    lerP2: () => ({ ...frames.p2 }),
    lerMesclado: () => ({ ...frames.p1 }),
    fimDoTick: () => undefined,
  };
  const game = new Game({ lutadores: PROD, rng: criarRng(5) });
  const efeitos = new Efeitos(criarRng(1));
  const vistos: { tipo: string; filme?: true }[] = [];
  const reagir = efeitos.reagir.bind(efeitos);
  efeitos.reagir = (ev: EventoLuta, ...resto: never[]): void => {
    vistos.push({ tipo: ev.tipo, ...((ev.tipo === 'hit' || ev.tipo === 'throw') && ev.filme ? { filme: true as const } : {}) });
    (reagir as (e: EventoLuta, ...r: never[]) => void)(ev, ...resto);
  };
  const mundo = {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: arteFalsa(),
    game,
    efeitos,
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
  n.ui.pronto(mundo);
  n.ui.set('fight', { cfg: { mode: o.mode ?? 'versus', c1: o.c1 ?? 'hayato', c2: o.c2 ?? 'caio', cpu: null, esquiva: regras.esquiva, ...(o.filmes === false ? {} : { motorV2: { filmes: true } }) } });
  const cena = n.ui.scene as unknown as CenaFight;
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  const ateLutar = (): void => {
    for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
    update(5);
  };
  /** O P1 solta o `golpe` a 140 px do P2 e anda até o filme abrir (devolve os eventos do tick do contato). */
  const bater = (golpe: 'sFwd' | 'sDown' | 'sFire' = 'sFwd'): EventoLuta[] => {
    game.p1.en = 100;
    game.p1.x = 380;
    game.p2.x = 520;
    game.p1.facing = 1;
    game.p2.facing = -1;
    game.p1.startMove(golpe, game);
    for (let i = 0; i < 200 && !cena.filme.ativo; i++) update();
    return [...game.events];
  };
  return { ...n, game, cena, frames, update, ateLutar, bater, vistos };
}

const resumo = (g: Game) => ({ tick: g.tick, fase: g.phase, round: g.round, hp: [g.p1.hp, g.p2.hp], x: [g.p1.x, g.p2.x], y: [g.p1.y, g.p2.y], estado: [g.p1.state, g.p2.state], en: [g.p1.en, g.p2.en] });

describe('V2-3d cena: o filme congela a CENA, não o motor', () => {
  it('abre no tick do contato, a luta NÃO anda durante a COMPLETA (66 updates) e volta a andar no seguinte', () => {
    const t = montar();
    t.ateLutar();
    const ev = t.bater('sFwd');
    expect(ev.map((e) => e.tipo).filter((x) => x === 'hit' || x === 'filme')).toEqual(['hit', 'filme']);
    expect(t.cena.filme.ativo).toBe(true);
    expect(t.cena.filme.estado?.modo).toBe('completa');
    const tick = t.game.tick;
    const duracao = t.cena.filme.duracao;
    expect(duracao).toBe(66);
    for (let i = 0; i < duracao; i++) {
      expect(t.cena.filme.ativo, `update ${i + 1}`).toBe(true);
      t.update();
      expect(t.game.tick, `update ${i + 1}`).toBe(tick);
    }
    expect(t.cena.filme.ativo).toBe(false);
    // o hitstop do acerto (4 a 6 ticks) segue valendo depois do filme: a luta anda em poucos updates
    t.update(8);
    expect(t.game.tick).toBeGreaterThan(tick);
  });

  it('sem a flag do motor (ausente) nenhum filme abre e o HOERI bate como sempre', () => {
    const t = montar({ filmes: false });
    t.ateLutar();
    t.bater('sFwd');
    expect(t.cena.filme.ativo).toBe(false);
    expect(t.game.events.some((e) => e.tipo === 'filme')).toBe(false);
  });

  it('o acerto que abriu o filme não gera efeito nem sessão no tick do contato; KO e pó da queda esperam (pó na batida da queda, KO no fim)', () => {
    const t = montar();
    t.ateLutar();
    t.game.p2.hp = 6; // o filme mata
    t.bater('sFwd');
    expect(t.game.events.some((e) => e.tipo === 'ko')).toBe(true); // o motor já resolveu
    expect(t.game.phase).toBe('ko');
    const noContato = t.vistos.map((v) => v.tipo);
    expect(t.vistos.some((v) => v.filme === true), 'hit{filme} nunca vai para os efeitos de acerto').toBe(false);
    expect(noContato).not.toContain('ko');
    expect(noContato).not.toContain('dust');
    // a batida da queda (b7 da COMPLETA = tick 58) solta o pó; o KO só no último update
    t.update(57);
    expect(t.vistos.map((v) => v.tipo)).not.toContain('dust');
    t.update(1);
    expect(t.vistos.map((v) => v.tipo)).toContain('dust');
    expect(t.vistos.map((v) => v.tipo)).not.toContain('ko');
    while (t.cena.filme.ativo) t.update();
    expect(t.vistos.map((v) => v.tipo)).toContain('ko');
  });

  it('pular (borda de um ataque depois do tick 10) encurta o filme em no máximo 6 updates e NÃO muda um bit do motor', () => {
    const jogar = (pular: boolean) => {
      const t = montar();
      t.ateLutar();
      t.bater('sFwd');
      let n = 0;
      if (pular) {
        t.update(TICKS_PARA_PULAR); // até o tick 10 nada foi apertado
        t.frames.p1 = { ...INPUT_VAZIO, hp: true };
        t.update();
        n = TICKS_PARA_PULAR + 1;
        expect(t.cena.filme.estado?.pulouEm, 'no tick 10 pula').not.toBeNull();
        t.frames.p1 = { ...INPUT_VAZIO };
      }
      while (t.cena.filme.ativo && n < 200) {
        t.update();
        n++;
      }
      t.update(30); // e a luta segue
      return { n, estado: resumo(t.game) };
    };
    const inteiro = jogar(false);
    const pulado = jogar(true);
    expect(inteiro.n).toBe(66);
    expect(pulado.n).toBeLessThanOrEqual(TICKS_PARA_PULAR + TICKS_DA_SAIDA_AO_PULAR);
    expect(pulado.estado).toEqual(inteiro.estado);
  });

  it('antes do tick 10 a borda não pula; segurar direção/botão sem borda também não', () => {
    const t = montar();
    t.ateLutar();
    t.bater('sFwd');
    t.frames.p1 = { ...INPUT_VAZIO, hp: true };
    t.update(TICKS_PARA_PULAR - 1);
    expect(t.cena.filme.estado?.pulouEm).toBeNull();
    t.frames.p1 = { ...INPUT_VAZIO, left: true, down: true, spSeg: true };
    t.update(30);
    expect(t.cena.filme.estado?.pulouEm).toBeNull();
    expect(t.cena.filme.ativo).toBe(true);
  });

  it('Enter pula o filme (depois do tick 10), como a entrada do chefão', () => {
    const t = montar();
    t.ateLutar();
    t.bater('sFwd');
    expect(t.cena.key('Enter')).toBe(true);
    expect(t.cena.filme.estado?.pulouEm).toBeNull();
    t.update(TICKS_PARA_PULAR);
    t.cena.key('Enter');
    expect(t.cena.filme.estado?.pulouEm).not.toBeNull();
  });
});

describe('V2-3d cena: COMPLETA, CURTA na repetição (D-V4), no treino (D-V5) e sem cinemática COMPLETA', () => {
  it('o 1º especial que conecta é COMPLETO; o MESMO de novo na luta é CURTO (30 updates)', () => {
    const t = montar();
    t.ateLutar();
    t.bater('sFwd');
    expect(t.cena.filme.estado?.modo).toBe('completa');
    while (t.cena.filme.ativo) t.update();
    t.update(70); // o rival levanta
    t.game.p2.hp = t.game.p2.maxHp;
    t.bater('sFwd');
    expect(t.cena.filme.estado?.modo).toBe('curta');
    expect(t.cena.filme.duracao).toBe(30);
    // e um especial DIFERENTE ainda é completo
    while (t.cena.filme.ativo) t.update();
    t.update(70);
    t.bater('sDown');
    expect(t.cena.filme.estado?.modo).toBe('completa');
  });

  it('treino: sempre CURTO', () => {
    const t = montar({ mode: 'training' });
    t.ateLutar();
    t.bater('sFwd');
    expect(t.cena.filme.estado?.modo).toBe('curta');
  });

  it('cinemática CURTA ou DESLIGADA nas preferências, e regras sem cinemática: o filme é CURTO', () => {
    for (const settings of [{ cinematica: 'curta' as const }, { cinematica: 'desligada' as const }]) {
      const t = montar({ settings });
      t.ateLutar();
      t.bater('sFwd');
      expect(t.cena.filme.estado?.modo, JSON.stringify(settings)).toBe('curta');
    }
    const sem = montar({ regras: { ...REGRAS_PADRAO, cinematica: false } });
    sem.ateLutar();
    sem.bater('sFwd');
    expect(sem.cena.filme.estado?.modo).toBe('curta');
  });
});

describe('V2-3d: gancho de desenvolvimento ?filme=<lutador>:<golpe>', () => {
  it('lê a URL', () => {
    expect(lerFilmeDev('?filme=hayato:sFire')).toEqual({ lutador: 'hayato', golpe: 'sFire' });
    expect(lerFilmeDev('?manual=1&filme=wei-long:sDown')).toEqual({ lutador: 'wei-long', golpe: 'sDown' });
    expect(lerFilmeDev('?filme=hayato')).toBeNull();
    expect(lerFilmeDev('?filme=')).toBeNull();
    expect(lerFilmeDev('')).toBeNull();
  });

  it('os 33 filmes tocam pelo gancho, sem depender do motor: o evento falso termina com os lutadores onde o filme os deixa', () => {
    const vistos: string[] = [];
    for (const { id, ficha, golpe } of todosOsFilmes()) {
      const rot = `${id}${ficha ? `/${ficha}` : ''} ${golpe}`;
      const t = montar({ c1: id, c2: id === 'caio' ? 'hayato' : 'caio', filmes: false });
      (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: id, golpe };
      t.ateLutar();
      if (ficha) {
        // a ficha precisa estar ativa antes de o gancho disparar: reinicia a luta já com ela
        t.game.p1.trocarFicha(ficha);
        (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: id, golpe };
      }
      t.update(2);
      expect(t.cena.filme.ativo, rot).toBe(true);
      const ev = t.cena.filme.estado;
      expect(ev?.golpe, rot).toBe(golpe);
      let n = 0;
      while (t.cena.filme.ativo && n < 200) {
        t.update();
        n++;
      }
      expect(t.cena.filme.ativo, rot).toBe(false);
      vistos.push(rot);
      // o rival termina caído, no chão, e com a vida mexida (o gancho aplicou o estado final)
      expect(t.game.p2.state, rot).toBe('down');
      expect(t.game.p2.hp, rot).toBeLessThan(t.game.p2.maxHp);
    }
    expect(vistos).toHaveLength(33);
  });
});
