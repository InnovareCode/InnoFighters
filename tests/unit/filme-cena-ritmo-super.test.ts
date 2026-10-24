import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { TICKS_PARA_PULAR, TICKS_PARA_PULAR_RITMO } from '../../src/render/filme';
import type { Mundo } from '../../src/ui/contexto';
import { lerFilmeDev, lerSuperDev, type CenaFight } from '../../src/ui/cenas/fight';
import { PROD } from './_filme';
import { navegadorFalso, arteFalsa } from './_ui';

/*
 * R-9 (docs/spec-redesenho-jogabilidade.md §3.2/§3.3/§3.4, Lyra): UI do super — tarja de 30 ticks (`ritmo.super`), modo do filme pelo
 * `motivo` do evento (§3.3: 'super' 1ª vez COMPLETO/depois CURTO; 'ko' decide-a-luta COMPLETO/round CURTO), pulo do filme a partir do
 * tick 6 com a flag (10 sem ela). A Vega ainda não entregou `src/data/supers.ts`/o evento real (R-7): os testes usam os ganchos DEV
 * (`?super=`, `?filme=lutador:golpe:motivo[:luta]`) que simulam o contrato combinado em docs/spec-redesenho-jogabilidade.md §4.
 */

const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(PROD).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

type Opcoes = { settings?: Partial<Configuracoes>; regras?: Regras; c1?: IdLutador; c2?: IdLutador; mode?: 'versus' | 'training'; filmes?: boolean; ritmoMotor?: { filmeRestrito?: boolean; intervalos?: boolean } };

const RITMO_SUPER: Regras = { ...REGRAS_PADRAO, ritmo: { ...REGRAS_PADRAO.ritmo, super: true } };

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
  const mundo = {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: arteFalsa(),
    game,
    efeitos,
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
  n.ui.pronto(mundo);
  n.ui.set('fight', { cfg: { mode: o.mode ?? 'versus', c1: o.c1 ?? 'hayato', c2: o.c2 ?? 'caio', cpu: null, esquiva: regras.esquiva, ...(o.filmes === false ? {} : { motorV2: { filmes: true } }), ...(o.ritmoMotor ? { ritmo: o.ritmoMotor } : {}) } });
  const cena = n.ui.scene as unknown as CenaFight;
  const update = (k = 1): void => {
    for (let i = 0; i < k; i++) cena.update();
  };
  const ateLutar = (): void => {
    for (let i = 0; i < 400 && game.phase !== 'fight'; i++) update();
    update(5);
  };
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
  return { ...n, game, cena, frames, update, ateLutar, bater };
}

describe('lerFilmeDev (R-9): :motivo e :luta opcionais', () => {
  it('sem motivo: igual a antes', () => {
    expect(lerFilmeDev('?filme=hayato:sFire')).toEqual({ lutador: 'hayato', golpe: 'sFire' });
  });
  it(':super', () => {
    expect(lerFilmeDev('?filme=hayato:sDown:super')).toEqual({ lutador: 'hayato', golpe: 'sDown', motivo: 'super' });
  });
  it(':ko (round) e :ko:luta (decide a partida)', () => {
    expect(lerFilmeDev('?filme=hayato:sDown:ko')).toEqual({ lutador: 'hayato', golpe: 'sDown', motivo: 'ko' });
    expect(lerFilmeDev('?filme=hayato:sDown:ko:luta')).toEqual({ lutador: 'hayato', golpe: 'sDown', motivo: 'ko', decideALuta: true });
  });
  it('motivo desconhecido: ignorado (cai no caso sem motivo)', () => {
    expect(lerFilmeDev('?filme=hayato:sDown:xyz')).toEqual({ lutador: 'hayato', golpe: 'sDown' });
  });
});

describe('lerSuperDev (R-9): `?super=<lutador>`', () => {
  it('lê a URL', () => {
    expect(lerSuperDev('?super=hayato')).toEqual({ lutador: 'hayato' });
    expect(lerSuperDev('?manual=1&super=caio')).toEqual({ lutador: 'caio' });
    expect(lerSuperDev('?super=')).toBeNull();
    expect(lerSuperDev('')).toBeNull();
  });
});

describe('modoDoFilme por `motivo` (§3.3): super 1ª vez COMPLETO depois CURTO; ko decide-a-luta COMPLETO, ko de round CURTO', () => {
  it('motivo "super": COMPLETO na 1ª vez, CURTO na repetição (mesmo golpe, mesma marca de "visto")', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'super' };
    t.update(2);
    expect(t.cena.filme.ativo).toBe(true);
    expect(t.cena.filme.estado?.modo).toBe('completa');
    while (t.cena.filme.ativo) t.update();
    t.update(70);
    t.game.p2.hp = t.game.p2.maxHp;
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'super' };
    t.update(2);
    expect(t.cena.filme.estado?.modo).toBe('curta');
  });

  it('motivo "ko" de round (sem decidir a luta): CURTO', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'ko' };
    t.update(2);
    expect(t.cena.filme.ativo).toBe(true);
    expect(t.cena.filme.estado?.modo).toBe('curta');
  });

  it('motivo "ko" que decide a luta (`ev.decideALuta`, do motor; `game.matchWinner` só sai ~100 ticks depois): COMPLETO', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'ko', decideALuta: true };
    t.update(2);
    expect(t.cena.filme.ativo).toBe(true);
    expect(t.cena.filme.estado?.modo).toBe('completa');
    expect(t.game.matchWinner, 'o dado NÃO vem de matchWinner (ainda nulo no tick do acerto)').toBeNull();
  });

  it('KO que decide a luta COMPLETO mesmo repetindo o golpe (decideALuta vence a marca de "visto"); TREINO continua CURTO (D-R5)', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'ko' };
    t.update(2);
    expect(t.cena.filme.estado?.modo).toBe('curta');
    while (t.cena.filme.ativo) t.update();
    t.update(70);
    t.game.p2.hp = t.game.p2.maxHp;
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'ko', decideALuta: true };
    t.update(2);
    expect(t.cena.filme.estado?.modo).toBe('completa');
    const tr = montar({ regras: RITMO_SUPER, mode: 'training' });
    tr.ateLutar();
    (tr.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'ko', decideALuta: true };
    tr.update(2);
    expect(tr.cena.filme.estado?.modo).toBe('curta');
  });

  it('CAMINHO REAL (motor com ritmo.filmeRestrito): o KO que fecha a luta abre COMPLETO; o KO de round abre CURTO', () => {
    const ko = (venceLuta: boolean) => {
      const t = montar({ regras: RITMO_SUPER, ritmoMotor: { filmeRestrito: true } });
      t.ateLutar();
      if (venceLuta) t.game.p1.wins = t.game.winsNeeded - 1;
      t.game.p2.hp = 1;
      t.bater('sFwd');
      const ev = t.game.events.find((e) => e.tipo === 'filme');
      return { modo: t.cena.filme.estado?.modo, decide: ev && ev.tipo === 'filme' ? ev.decideALuta : undefined, ativo: t.cena.filme.ativo };
    };
    const luta = ko(true);
    expect(luta.ativo).toBe(true);
    expect(luta.decide).toBe(true);
    expect(luta.modo).toBe('completa');
    const round = ko(false);
    expect(round.ativo).toBe(true);
    expect(round.modo).toBe('curta');
  });

  it('super na 1ª vez é COMPLETO mesmo que o MESMO golpe já tenha aberto um filme "ko" de round antes (motivo entra na marca de "visto")', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'ko' };
    t.update(2);
    expect(t.cena.filme.estado?.modo).toBe('curta'); // ko de round é sempre curto
    while (t.cena.filme.ativo) t.update();
    t.update(70);
    t.game.p2.hp = t.game.p2.maxHp;
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'super' };
    t.update(2);
    expect(t.cena.filme.estado?.modo).toBe('completa'); // 1ª vez DESTE motivo, apesar do golpe já ter aberto filme antes
  });

  it('TREINO: sempre CURTO, mesmo no motivo "super" (D-V5, §3.3 "TREINO: só o super, CURTO")', () => {
    const t = montar({ regras: RITMO_SUPER, mode: 'training' });
    t.ateLutar();
    (t.cena as unknown as { filmeDev: unknown }).filmeDev = { lutador: 'hayato', golpe: 'sDown', motivo: 'super' };
    t.update(2);
    expect(t.cena.filme.estado?.modo).toBe('curta');
  });

  it('sem `ritmo.super`/`filmeRestrito` (motivo ausente): a heurística de hoje, intocada', () => {
    const t = montar();
    t.ateLutar();
    t.bater('sFwd');
    expect(t.cena.filme.estado?.modo).toBe('completa');
  });
});

describe('Pulo do filme a partir do tick 6 com `ritmo.super` (10 sem a flag — filme-jogo.spec.ts fixa isso no jogo real)', () => {
  it('com a flag: qualquer botão pula a partir do tick 6, não antes', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    t.bater('sFwd');
    t.update(TICKS_PARA_PULAR_RITMO); // até o tick 6 nada foi apertado
    expect(t.cena.filme.estado?.pulouEm, 'ainda não chegou ao tick do pulo').toBeNull();
    t.frames.p1 = { ...INPUT_VAZIO, hp: true };
    t.update();
    expect(t.cena.filme.estado?.pulouEm, 'no tick 6 pula').not.toBeNull();
    t.frames.p1 = { ...INPUT_VAZIO };
  });

  it('antes do tick 6 (com a flag) a borda não pula, mesmo segurando o botão', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    t.bater('sFwd');
    t.frames.p1 = { ...INPUT_VAZIO, hp: true };
    t.update(TICKS_PARA_PULAR_RITMO - 1);
    expect(t.cena.filme.estado?.pulouEm).toBeNull();
    t.frames.p1 = { ...INPUT_VAZIO };
  });

  it('sem a flag: continua exigindo o tick 10 (TICKS_PARA_PULAR), como hoje', () => {
    const t = montar();
    t.ateLutar();
    t.bater('sFwd');
    t.update(TICKS_PARA_PULAR); // até o tick 10 nada foi apertado
    expect(t.cena.filme.estado?.pulouEm).toBeNull();
    t.frames.p1 = { ...INPUT_VAZIO, hp: true };
    t.update();
    expect(t.cena.filme.estado?.pulouEm).not.toBeNull();
  });
});

describe('`?super=<lutador>` (DEV): abre a tarja de 30 ticks via `reagirAoSuper` — a MESMA que `ev.super===true` abriria no jogo real', () => {
  it('só com `Regras.ritmo.super`; sem ela o gancho dispara mas `reagirAoSuper` devolve false e nada abre', () => {
    const t = montar({ regras: { ...REGRAS_PADRAO, ritmo: {} } }); // SEM ritmo.super (o padrão do jogo agora o liga)
    t.ateLutar();
    (t.cena as unknown as { superDev: unknown }).superDev = { lutador: 'hayato' };
    t.update(2);
    expect(t.cena.tarjaDoSuper.ativa).toBe(false);
  });

  it('com a flag: abre `tarjaDoSuper`, 30 ticks, e NÃO move o motor (como qualquer tarja que congela)', () => {
    const t = montar({ regras: RITMO_SUPER });
    t.ateLutar();
    const tick = t.game.tick;
    (t.cena as unknown as { superDev: unknown }).superDev = { lutador: 'hayato' };
    // o 1º update() só dispara o gancho (`reagirAoSuper` chama `tarjaDoSuper.iniciar`, t=0); a partir do 2º, cada update() é um `avancar()`.
    t.update();
    expect(t.cena.tarjaDoSuper.ativa).toBe(true);
    expect(t.cena.tarjaDoSuper.estado?.nome).toBeTruthy();
    expect(t.cena.tarjaDoSuper.duracao).toBe(30);
    let n = 0;
    while (t.cena.tarjaDoSuper.ativa && n < 60) {
      t.update();
      n++;
    }
    expect(n).toBe(30);
    expect(t.game.tick).toBe(tick); // o motor não andou durante a tarja
  });
});
