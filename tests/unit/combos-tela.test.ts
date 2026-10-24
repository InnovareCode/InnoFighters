import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import type { ComboProprio, NomeGolpe } from '../../src/data/tipos';
import { Game } from '../../src/fight/game';
import { progressoVazio, REGRAS_PADRAO, type Regras } from '../../src/meta';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import {
  ALTURA_DA_CAIXA_DE_COMBO, alturaDosCombos, combosDoLutador, combosLigados, desenharCombos, teclasDoGolpe, textoDoCombo, textoDoGolpe,
} from '../../src/ui/combos-tela';
import type { CenaFight } from '../../src/ui/cenas/fight';
import type { CenaHow } from '../../src/ui/cenas/how';
import type { Mundo } from '../../src/ui/contexto';
import { criarFerramentas } from '../../src/ui/ferramentas';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { gravador, navegadorFalso, arteFalsa } from './_ui';

/*
 * V2-4, UI (spec §6.2 "Onde o jogador aprende"): a lista dos combos próprios aparece no TREINO (no lugar da dica genérica) e no "Como jogar",
 * gerada do MESMO dado do motor (`combosProprios` do lutador e das fichas). Os NOMES são provisórios (o Apolo troca em src/data/lutadores/*.ts):
 * nenhum teste os fixa em literal; todos leem do dado e, para provar que a tela segue o dado, o dado é trocado por nomes inventados aqui.
 */

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elencoDe = (trocas: Partial<Record<IdLutador, Record<string, unknown>>> = {}): Elenco =>
  Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch: { ...ch, ...(trocas[id as IdLutador] ?? {}) }, arte }])) as unknown as Elenco;

const COM_COMBOS: Regras = { ...REGRAS_PADRAO, motorV2: { combos: true } };
const SEM_COMBOS: Regras = { ...REGRAS_PADRAO, motorV2: {}, ritmo: {} }; // o padrão do jogo liga o motor v2 (MOTOR_V2_PADRAO) e o ritmo com super (linha "SUPER · nome" tem TOQUE): "sem a regra" é a aba de antes dos dois
const nomesDe = (id: IdLutador): string[] => (prod[id].combosProprios ?? []).map((c) => c.nome);

describe('golpe -> botões', () => {
  it('lp/lk/hp/hk = o botão; c* = ↓ + botão; sFire = ESP; sDown = ↓ + ESP; sFwd = → + ESP', () => {
    expect(teclasDoGolpe('lp')).toEqual(['lp']);
    expect(teclasDoGolpe('hk')).toEqual(['hk']);
    expect(teclasDoGolpe('clp')).toEqual(['down', 'lp']);
    expect(teclasDoGolpe('clk')).toEqual(['down', 'lk']);
    expect(teclasDoGolpe('chp')).toEqual(['down', 'hp']);
    expect(teclasDoGolpe('chk')).toEqual(['down', 'hk']);
    expect(teclasDoGolpe('sFire')).toEqual(['sp']);
    expect(teclasDoGolpe('sDown')).toEqual(['down', 'sp']);
    expect(teclasDoGolpe('sFwd')).toEqual(['fwd', 'sp']);
  });

  it('teclado (P1 e P2) e toque dizem o mesmo golpe', () => {
    expect(textoDoGolpe('clp', 'teclado', 1)).toBe('↓ + Z');
    expect(textoDoGolpe('clp', 'teclado', 2)).toBe('S + J'); // P2: S agacha, J soco fraco
    expect(textoDoGolpe('sFwd', 'teclado', 1)).toBe('→ + B');
    expect(textoDoGolpe('sFwd', 'teclado', 2)).toBe('D + L');
    expect(textoDoGolpe('clp', 'toque')).toBe('↓ + SOCO FRACO');
    expect(textoDoGolpe('sDown', 'toque')).toBe('↓ + ESP');
    expect(textoDoCombo({ sequencia: ['clk', 'hk', 'sDown'] }, 'teclado')).toBe('↓ + C › V › ↓ + B');
    expect(textoDoCombo({ sequencia: ['clk', 'hk', 'sDown'] }, 'toque')).toBe('↓ + CHUTE FRACO › CHUTE FORTE › ↓ + ESP');
  });

  it('todo golpe que o boot aceita num combo tem botão (nenhum combo do dado sai sem tecla)', () => {
    for (const id of IDS_LUTADORES) {
      for (const lista of [prod[id].combosProprios ?? [], ...Object.values(prod[id].fichas).map((f) => f.combosProprios ?? [])]) {
        for (const c of lista) for (const g of c.sequencia) expect(teclasDoGolpe(g), `${id}.${c.id}.${g}`).not.toEqual([]);
      }
    }
  });
});

describe('combosDoLutador (do dado do motor)', () => {
  it('cada lutador mostra exatamente os combos do dado, na ordem, com os passos da sequência', () => {
    for (const id of IDS_LUTADORES) {
      const dado = prod[id].combosProprios ?? [];
      const tela = combosDoLutador(prod[id]).filter((c) => dado.some((d) => d.id === c.id));
      expect(tela.map((c) => c.id), id).toEqual(dado.map((c) => c.id));
      tela.forEach((c, i) => {
        expect(c.nome).toBe(dado[i]!.nome);
        expect(c.passos.map((p) => p.golpe)).toEqual(dado[i]!.sequencia);
      });
    }
  });

  it('o especial que fecha o combo vem marcado (dourado); só o último passo', () => {
    const c = combosDoLutador({ combosProprios: [{ id: 'x', nome: 'X', sequencia: ['lp', 'hk', 'sFire'] }], fichas: {} })[0]!;
    expect(c.passos.map((p) => p.especial)).toEqual([false, false, true]);
    expect(c.efeito).toBe('fecha com o especial');
  });

  it('NILA: uma lista por postura, etiquetadas GAJA e SARPA; ZENON: as fichas que herdam a lista da base não a repetem', () => {
    const nila = combosDoLutador(prod.nila);
    const gaja = prod.nila.combosProprios ?? [];
    const sarpa = prod.nila.fichas['sarpa']?.combosProprios ?? [];
    expect(gaja.length).toBeGreaterThan(0);
    expect(sarpa.length).toBeGreaterThan(0);
    expect(nila.map((c) => c.id)).toEqual([...gaja, ...sarpa].map((c) => c.id));
    expect(nila.filter((c) => gaja.some((g) => g.id === c.id)).every((c) => c.postura === 'GAJA')).toBe(true);
    expect(nila.filter((c) => sarpa.some((g) => g.id === c.id)).every((c) => c.postura === 'SARPA')).toBe(true);
    const zenon = combosDoLutador(prod.zenon);
    expect(zenon.map((c) => c.id)).toEqual((prod.zenon.combosProprios ?? []).map((c) => c.id));
    expect(zenon.every((c) => c.postura === null)).toBe(true);
  });

  it('o efeito do final aparece em português', () => {
    const f = (final: ComboProprio['final']) =>
      combosDoLutador({ combosProprios: [{ id: 'x', nome: 'X', sequencia: ['lk', 'hp'] as NomeGolpe[], ...(final ? { final } : {}) }], fichas: {} })[0]!.efeito;
    expect(f('parede')).toMatch(/parede/);
    expect(f('cruza')).toMatch(/lado/);
    expect(f('lanca')).toMatch(/lan/);
    expect(f(undefined)).toBeNull();
  });

  it('efeito do dado vence o texto padrão; sem efeito, o padrão (final ou "fecha com o especial") segue; trocar o dado troca a tela', () => {
    const um = (extra: Partial<ComboProprio>, sequencia: NomeGolpe[]) => combosDoLutador({ combosProprios: [{ id: 'x', nome: 'X', sequencia, ...extra }], fichas: {} })[0]!.efeito;
    expect(um({ efeito: 'texto do dado' }, ['lp', 'hk', 'sFire'])).toBe('texto do dado');
    expect(um({ efeito: 'outro texto' }, ['lp', 'hk', 'sFire'])).toBe('outro texto');
    expect(um({}, ['lp', 'hk', 'sFire'])).toBe('fecha com o especial');
    expect(um({ final: 'parede' }, ['lp', 'hk'])).toBe('empurra o rival para a parede');
    expect(um({ final: 'parede', efeito: 'muralha' }, ['lp', 'hk'])).toBe('muralha');
  });

  it('os combos que fecham com especial mostram a linha do Apolo (do dado, nunca o "fecha com o especial" genérico); os de `final` seguem com o texto do final', () => {
    let comEspecial = 0;
    for (const id of IDS_LUTADORES) {
      const listas = [prod[id].combosProprios ?? [], ...Object.values(prod[id].fichas).map((f) => f.combosProprios ?? [])];
      const vistos = new Set<string>();
      for (const c of listas.flat()) {
        if (vistos.has(c.id)) continue;
        vistos.add(c.id);
        const ultimo = c.sequencia[c.sequencia.length - 1]!;
        const tela = combosDoLutador(prod[id]).find((t) => t.id === c.id)!;
        if (['sFire', 'sDown', 'sFwd'].includes(ultimo)) {
          comEspecial++;
          expect(c.efeito, c.id).toBeTruthy();
          expect(tela.efeito, c.id).toBe(c.efeito);
          expect(tela.efeito, c.id).not.toBe('fecha com o especial');
        } else {
          expect(c.efeito, c.id).toBeUndefined();
          expect(tela.efeito, c.id).not.toBeNull();
        }
      }
    }
    expect(comEspecial).toBe(11); // 9 lutadores com 1 + NILA com 2 (uma por postura)
  });

  it('ZENON não cita o nome do especial (na fase 2 o →+ESP é o DECRETO); NILA não repete a postura que a tela já põe antes', () => {
    for (const c of prod.zenon.combosProprios ?? []) {
      if (c.efeito === undefined) continue;
      expect(c.efeito).not.toMatch(/TRIBUTO|DECRETO/); // o nome do especial é em caixa alta; "cobra o tributo" (substantivo) vale para os dois
    }
    for (const c of [...(prod.nila.combosProprios ?? []), ...(prod.nila.fichas['sarpa']?.combosProprios ?? [])]) {
      expect(c.efeito ?? '', c.id).not.toMatch(/GAJA|SARPA/i);
    }
    const sub = combosDoLutador(prod.nila).map((c) => [c.postura, c.efeito].filter(Boolean).join(' · '));
    expect(sub).toEqual(expect.arrayContaining(['GAJA · do soco forte ao PASSO DO ELEFANTE', 'SARPA · três toques e o BOTE']));
  });

  it('só vale com a regra motorV2.combos ligada', () => {
    expect(combosLigados(SEM_COMBOS)).toBe(false);
    expect(combosLigados({ motorV2: { filmes: true } })).toBe(false);
    expect(combosLigados(COM_COMBOS)).toBe(true);
  });
});

describe('desenharCombos', () => {
  it('uma caixa por combo, duas por linha, e devolve a altura que ocupou', () => {
    const g = gravador();
    const f = criarFerramentas(g.ctx);
    const lista = combosDoLutador(prod.hayato);
    const h = desenharCombos(f, lista, '#fff', 60, 451, 840);
    expect(h).toBe(alturaDosCombos(lista.length));
    expect(alturaDosCombos(2)).toBe(ALTURA_DA_CAIXA_DE_COMBO);
    expect(alturaDosCombos(3)).toBe(2 * ALTURA_DA_CAIXA_DE_COMBO + 4);
    expect(alturaDosCombos(0)).toBe(0);
    expect(g.chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t))).toContain(lista[0]!.nome);
  });
});

// ---------------------------------------------------------------------------------------------------------------- cenas
function mundo(elenco: Elenco, game?: Game): Mundo {
  return {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: arteFalsa(),
    game: game ?? new Game({ lutadores: prod, rng: criarRng(5) }),
    efeitos: new Efeitos(criarRng(1)),
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
}

const COMBOS_INVENTADOS: Record<string, unknown> = {
  combosProprios: [
    { id: 'hayato-teste-a', nome: 'ZZ SENTENCA ALFA', sequencia: ['clp', 'hk', 'sDown'], semQueda: [1] },
    { id: 'hayato-teste-b', nome: 'ZZ SENTENCA BETA', sequencia: ['lk', 'lk', 'hp'], final: 'parede' },
  ],
};

describe('"Como jogar" > GOLPES', () => {
  function comoJogar(regras: Regras, trocas: Partial<Record<IdLutador, Record<string, unknown>>> = {}, id: IdLutador = 'hayato') {
    const n = navegadorFalso({}, regras);
    n.persist.prog = { ...progressoVazio(), desbloqueados: [...IDS_LUTADORES] };
    n.ui.pronto(mundo(elencoDe(trocas)));
    const how = n.ui.cenas.how as CenaHow;
    how.enter({ from: 'menu' });
    how.tab = 2;
    how.cid = (how as unknown as { lista(): IdLutador[] }).lista().indexOf(id);
    const textos = (): string[] => {
      n.g.chamadas.length = 0;
      how.draw();
      return n.g.textos();
    };
    return { textos };
  }

  it('sem a regra: nenhum combo na tela (a aba é a de antes)', () => {
    const { textos } = comoJogar(SEM_COMBOS);
    const t = textos().join('\n');
    for (const nome of nomesDe('hayato')) expect(t).not.toContain(nome);
    expect(t).not.toContain('TOQUE:');
    expect(t).toContain('Teclas do Jogador 1 (Jogador 2: W A S D + J K U I L)');
  });

  it('com a regra: cada combo do dado, com o teclado e o toque', () => {
    const { textos } = comoJogar(COM_COMBOS);
    const t = textos();
    for (const c of prod.hayato.combosProprios ?? []) {
      expect(t).toContain(c.nome);
      expect(t).toContain(`TOQUE: ${textoDoCombo(c, 'toque')}`);
    }
  });

  it('muda o dado, muda o texto (nomes e botões vêm do dado, não da tela)', () => {
    const { textos } = comoJogar(COM_COMBOS, { hayato: COMBOS_INVENTADOS });
    const t = textos();
    expect(t).toContain('ZZ SENTENCA ALFA');
    expect(t.filter((s) => s === 'Z').length).toBeGreaterThan(0); // a tecla do teclado do clp
    expect(t).toContain('ZZ SENTENCA BETA');
    expect(t).toContain('TOQUE: ↓ + SOCO FRACO › CHUTE FORTE › ↓ + ESP');
    expect(t).toContain('TOQUE: CHUTE FRACO › CHUTE FRACO › SOCO FORTE');
    expect(t).toContain('empurra o rival para a parede');
    for (const nome of nomesDe('hayato')) expect(t).not.toContain(nome); // os do dado de verdade saíram
  });

  it('NILA mostra as duas posturas', () => {
    const { textos } = comoJogar(COM_COMBOS, {}, 'nila');
    const t = textos();
    for (const c of [...(prod.nila.combosProprios ?? []), ...(prod.nila.fichas['sarpa']?.combosProprios ?? [])]) expect(t).toContain(c.nome);
    expect(t.join('\n')).toMatch(/GAJA/);
    expect(t.join('\n')).toMatch(/SARPA/);
  });
});

describe('TREINO: lista de golpes da pausa', () => {
  function pausa(cfg: { mode: 'training' | 'versus' | 'cpu'; cpu?: number | null }, regras: Regras, trocas: Partial<Record<IdLutador, Record<string, unknown>>> = {}) {
    const n = navegadorFalso({}, regras);
    const elenco = elencoDe(trocas);
    const game = new Game({ lutadores: Object.fromEntries(IDS_LUTADORES.map((id) => [id, elenco[id].ch])) as never, rng: criarRng(5) });
    n.ui.pronto(mundo(elenco, game));
    n.ui.set('fight', { cfg: { mode: cfg.mode, c1: 'hayato', c2: 'caio', cpu: cfg.cpu ?? null, esquiva: regras.esquiva, ...(regras.motorV2 ? { motorV2: regras.motorV2 } : {}) } } as never);
    const cena = n.ui.scene as unknown as CenaFight;
    cena.paused = true;
    (cena as unknown as { view: string }).view = 'moves';
    const textos = (): string[] => {
      n.g.chamadas.length = 0;
      cena.draw();
      return n.g.textos();
    };
    return { textos, game };
  }
  const DICA_GENERICA = 'COMBO: soco fraco → chute fraco → soco forte → chute forte → especial (aperte o próximo botão ao acertar)     ESC voltar';

  it('treino + regra ligada: os combos do dado no lugar da dica genérica', () => {
    const { textos, game } = pausa({ mode: 'training' }, COM_COMBOS);
    expect(game.combosLigados).toBe(true);
    const t = textos();
    for (const c of prod.hayato.combosProprios ?? []) {
      expect(t).toContain(c.nome);
      expect(t).toContain(`TOQUE: ${textoDoCombo(c, 'toque')}`);
    }
    expect(t).not.toContain(DICA_GENERICA);
    expect(t.some((s) => s.startsWith('COMBOS PRÓPRIOS'))).toBe(true);
  });

  it('muda o dado, muda a pausa do treino', () => {
    const t = pausa({ mode: 'training' }, COM_COMBOS, { hayato: COMBOS_INVENTADOS }).textos();
    expect(t).toContain('ZZ SENTENCA ALFA');
    expect(t).toContain('ZZ SENTENCA BETA');
    for (const nome of nomesDe('hayato')) expect(t).not.toContain(nome);
  });

  it('treino SEM a regra: a dica genérica de antes, nenhum combo próprio', () => {
    const t = pausa({ mode: 'training' }, SEM_COMBOS).textos();
    expect(t).toContain(DICA_GENERICA);
    for (const nome of nomesDe('hayato')) expect(t).not.toContain(nome);
  });

  it('fora do treino (luta contra a CPU) a dica genérica continua, mesmo com a regra ligada', () => {
    const t = pausa({ mode: 'cpu', cpu: 1 }, COM_COMBOS).textos();
    expect(t).toContain(DICA_GENERICA);
    for (const nome of nomesDe('hayato')) expect(t).not.toContain(nome);
  });
});
