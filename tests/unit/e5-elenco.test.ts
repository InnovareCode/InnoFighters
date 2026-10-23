import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ALTURA, CENARIO_ALTURA, CENARIO_Y, GROUND, LARGURA, PES_NO_CENARIO } from '../../src/core/constantes';
import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { CENARIO_PADRAO, CENARIOS, CICLO_CENARIOS } from '../../src/data/cenarios';
import { CHEFE, FILA_DESBLOQUEIO, INICIAIS, LUTADORES, ROSTER, VITRINE } from '../../src/data/lutadores';
import { getPD } from '../../src/data/poses';
import type { IdCenario } from '../../src/data/tipos';
import {
  aplicarVitoriaArcade,
  liberados,
  montarEscada,
  progressoVazio,
  REGRAS_PADRAO,
  TAMANHO_ESCADA,
  type Regras,
} from '../../src/meta';
import { carregarDadosV2, salvarDadosV2, type ArmazenamentoLike } from '../../src/core/storage';
import { CONFIGURACOES_PADRAO } from '../../src/core/contratos';
import { perfilChefe } from '../../src/fight/cpu';
import { ateALuta, criarLuta, tipos } from './_kit-e3';
import { comBaatarChefe } from './_baatar-chefe';
import { lerManifestoC1, montarTodos } from './_lutadores';

/*
 * E5 · ligação dos 5 lutadores novos ao jogo real: ids finais, fila de desbloqueio, chefão, escada do Arcade, cenários e
 * rollback de onda. Os testes de MECÂNICA da E3 (aminu-s2, centella-s3, ...) seguem sobre o atlas do WEI LONG de propósito;
 * aqui os lutadores são montados sobre os atlas REAIS (public/assets/lutadores).
 */

const caminho = (rel: string): string => fileURLToPath(new URL(`../../${rel}`, import.meta.url));
const NOVOS = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const satisfies readonly IdLutador[];
const ORIGINAIS = ['hayato', 'wei-long', 'min-ji', 'caio'] as const satisfies readonly IdLutador[];
const real = montarTodos();
/** O mesmo elenco com o BAATAR ANTIGO (chefão) de fixtura: a mecânica de chefe do motor segue testada com a arte real dele. */
const realComChefe = comBaatarChefe(real);

describe('E5 · ids finais e papéis', () => {
  it('IDS_LUTADORES tem os 10, na ordem da grade: 4 do protótipo, a fila (o BAATAR é o último dela) e o chefão ZENON no fim', () => {
    expect([...IDS_LUTADORES]).toEqual([...ORIGINAIS, 'aminu', 'centella', 'camille', 'nila', 'baatar', 'zenon']);
    expect([...ROSTER]).toEqual([...IDS_LUTADORES]);
  });

  it('cada definição carrega o id da própria chave (sem cast que desminta o tipo)', () => {
    for (const id of IDS_LUTADORES) expect(LUTADORES[id].id).toBe(id);
    expect(Object.keys(LUTADORES)).toHaveLength(10);
  });

  it('a fila é AMINU, CENTELLA, CAMILLE, NILA, BAATAR; o chefão é o ZENON (fora da fila); os iniciais são os 4 do protótipo', () => {
    expect([...FILA_DESBLOQUEIO]).toEqual(['aminu', 'centella', 'camille', 'nila', 'baatar']);
    expect(CHEFE).toBe('zenon');
    expect(REGRAS_PADRAO.chefe).toBe('zenon');
    expect(FILA_DESBLOQUEIO).not.toContain('zenon');
    expect([...INICIAIS]).toEqual([...ORIGINAIS]);
    expect([...REGRAS_PADRAO.roster]).toEqual([...IDS_LUTADORES]);
  });

  it('a vitrine do título segue só nos 4 iniciais (os novos são surpresa)', () => {
    expect([...VITRINE]).toEqual([...ORIGINAIS]);
  });

  it('só os 4 originais têm gabarito no protótipo: a fidelidade lock-step itera só eles', () => {
    const comProto = IDS_LUTADORES.filter((id) => LUTADORES[id].idPrototipo !== undefined);
    expect(comProto).toEqual([...ORIGINAIS]);
    for (const id of NOVOS) expect(LUTADORES[id].idPrototipo, id).toBeUndefined();
  });
});

describe('E5 · fila de desbloqueio (regras reais; BAATAR é o 5º, sem chefão por enquanto)', () => {
  it('5 zeradas liberam AMINU, CENTELLA, CAMILLE, NILA, BAATAR, nessa ordem; a 6ª não libera nada', () => {
    let prog = progressoVazio();
    const ordem: IdLutador[] = [];
    for (let i = 0; i < 5; i++) {
      const r = aplicarVitoriaArcade(prog, { derrotouChefe: false });
      expect(r.novos).toHaveLength(1);
      ordem.push(...r.novos);
      prog = r.prog;
    }
    expect(ordem).toEqual(['aminu', 'centella', 'camille', 'nila', 'baatar']);
    expect(liberados(prog).has('baatar')).toBe(true);
    const sexta = aplicarVitoriaArcade(prog, { derrotouChefe: false });
    expect(sexta.novos).toEqual([]);
    expect(sexta.prog.zeradas).toBe(6);
  });

  it('quem já liberou o BAATAR derrotando-o como chefe não perde nada: a fila pula o BAATAR e o save segue igual', () => {
    const antigo = { desbloqueados: ['aminu', 'baatar'] as IdLutador[], zeradas: 1, chefeDerrotado: true, vistos: [] as IdLutador[] };
    let prog = antigo;
    const ordem: IdLutador[] = [];
    for (let i = 0; i < 4; i++) {
      const r = aplicarVitoriaArcade(prog, { derrotouChefe: false });
      ordem.push(...r.novos);
      prog = r.prog;
    }
    expect(ordem).toEqual(['centella', 'camille', 'nila']); // 4ª zerada: a fila acabou (o BAATAR já estava liberado)
    expect(prog.desbloqueados.filter((id) => id === 'baatar')).toHaveLength(1);
    expect(prog.chefeDerrotado).toBe(true);
    expect(liberados(antigo).has('baatar')).toBe(true);
  });

  it('sem chefão nas regras (injetado null) `derrotouChefe` não libera nem marca nada: só avança a fila', () => {
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, { ...REGRAS_PADRAO, chefe: null });
    expect(r.novos).toEqual(['aminu']);
    expect(r.prog.chefeDerrotado).toBe(false);
  });

  it('com o ZENON como chefão (regras reais) derrotá-lo libera o ZENON (D-Z1) além do próximo da fila', () => {
    const r = aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true });
    expect(r.novos).toContain('zenon');
    expect(r.novos).toContain('aminu');
    expect(liberados(r.prog).has('zenon')).toBe(true);
  });

  it('save novo: só os 4 iniciais liberados; os 5 da fila (BAATAR incluso) ficam travados', () => {
    expect([...liberados(progressoVazio())].sort()).toEqual([...ORIGINAIS].sort());
  });
});

describe('E5 · escada do Arcade (5 rivais + o chefão da vez no fim; o ZENON só com a fila toda liberada; jogando COM o ZENON e tudo liberado não há chefe)', () => {
  it('TAMANHO_ESCADA é 5', () => {
    expect(TAMANHO_ESCADA).toBe(5);
  });

  it('para cada um dos 10: 5 rivais distintos sem o próprio jogador e, no fim, o chefão da vez (save vazio = AMINU; jogando COM o AMINU = CENTELLA)', () => {
    for (const c1 of IDS_LUTADORES) {
      for (const semente of [1, 2, 3, 99]) {
        const e = montarEscada({ c1, prog: progressoVazio(), rng: criarRng(semente) });
        const rivais = e.filter((x) => !x.chefe);
        const chefe = c1 === 'aminu' ? 'centella' : 'aminu'; // o 1º da fila que não é o jogador (defesa em profundidade; a UI não deixa escolher casa travada)
        expect(rivais, `${c1}/${semente}`).toHaveLength(5);
        expect(rivais.every((x) => x.id !== c1 && x.id !== 'zenon' && x.id !== chefe), `${c1}/${semente}`).toBe(true);
        expect(new Set(rivais.map((x) => x.id)).size).toBe(5);
        expect(e, `${c1}/${semente}`).toHaveLength(6);
        expect(e[5], `${c1}/${semente}`).toEqual({ id: chefe, chefe: true });
      }
    }
  });

  it('com a fila toda liberada o chefão é o ZENON (os outros 9 o enfrentam); jogando COM ele não há etapa de chefe (ED7): só os 5 rivais', () => {
    const tudo = { ...progressoVazio(), desbloqueados: [...FILA_DESBLOQUEIO] };
    for (const c1 of IDS_LUTADORES) {
      for (const semente of [1, 2, 3, 99]) {
        const e = montarEscada({ c1, prog: tudo, rng: criarRng(semente) });
        const rivais = e.filter((x) => !x.chefe);
        expect(rivais, `${c1}/${semente}`).toHaveLength(5);
        expect(rivais.every((x) => x.id !== c1 && x.id !== 'zenon'), `${c1}/${semente}`).toBe(true);
        if (c1 === 'zenon') expect(e, `${c1}/${semente}`).toHaveLength(5);
        else expect(e[5], `${c1}/${semente}`).toEqual({ id: 'zenon', chefe: true });
      }
    }
  });

  it('o BAATAR agora pode ser rival (lutador normal) e jogar COM ele não muda o tamanho da escada', () => {
    const vistos = new Set<IdLutador>();
    for (let s = 1; s <= 40; s++) for (const x of montarEscada({ c1: 'hayato', prog: progressoVazio(), rng: criarRng(s) })) vistos.add(x.id);
    expect(vistos.has('baatar')).toBe(true);
    const e = montarEscada({ c1: 'baatar', prog: progressoVazio(), rng: criarRng(7) });
    expect(e).toHaveLength(6); // 5 rivais + o chefão da vez (AMINU)
    expect(e[5]).toEqual({ id: 'aminu', chefe: true });
    expect(e.slice(0, 5).some((x) => x.chefe || x.id === 'baatar')).toBe(false);
  });

  it('com um chefão final injetado nas regras e a fila toda liberada a escada tem 5 rivais + o final no fim, e ele nunca é rival; com a regra antiga o final vem desde o save vazio', () => {
    const comChefe: Regras = { ...REGRAS_PADRAO, chefe: 'baatar' };
    const tudo = { ...progressoVazio(), desbloqueados: FILA_DESBLOQUEIO.filter((id) => id !== 'baatar') };
    for (const c1 of IDS_LUTADORES.filter((id) => id !== 'baatar')) {
      const e = montarEscada({ c1, prog: tudo, rng: criarRng(3), regras: comChefe });
      expect(e).toHaveLength(6);
      expect(e[5]).toEqual({ id: 'baatar', chefe: true });
      expect(e.slice(0, 5).some((x) => x.id === 'baatar')).toBe(false);
      const antiga = montarEscada({ c1, prog: progressoVazio(), rng: criarRng(3), regras: { ...comChefe, chefesDaFila: false } });
      expect(antiga[5]).toEqual({ id: 'baatar', chefe: true });
    }
  });

  it('rival travado entra na escada (ED5: vitrine) e a mesma semente dá a mesma escada', () => {
    const vistos = new Set<IdLutador>();
    for (let s = 1; s <= 40; s++) for (const x of montarEscada({ c1: 'hayato', prog: progressoVazio(), rng: criarRng(s) })) vistos.add(x.id);
    for (const id of FILA_DESBLOQUEIO) expect(vistos.has(id), id).toBe(true);
    const a = montarEscada({ c1: 'caio', prog: progressoVazio(), rng: criarRng(5) });
    const b = montarEscada({ c1: 'caio', prog: progressoVazio(), rng: criarRng(5) });
    expect(a).toEqual(b);
  });

  it('onda 1 (só os 4, sem chefão, regras injetadas): 3 rivais e nada de chefe', () => {
    const onda1: Regras = { ...REGRAS_PADRAO, roster: ORIGINAIS, fila: [], chefe: null };
    const e = montarEscada({ c1: 'hayato', prog: progressoVazio(), rng: criarRng(1), regras: onda1 });
    expect(e).toHaveLength(3);
    expect(e.some((x) => x.chefe)).toBe(false);
  });
});

describe('E5 · BAATAR lutador normal sobre o atlas real', () => {
  it('sem fichas (o bloco `chefe` de guardião, R1, só vale na luta de chefe); 1 barra, hp 92 e pow 0,9 (E6b), ficha base, cenário mn', () => {
    expect(LUTADORES.baatar.chefe).toMatchObject({ barras: 2, hpPorBarra: 46 });
    expect(LUTADORES.baatar.fichas).toBeUndefined();
    expect(Object.keys(real.baatar.fichas)).toEqual([]);
    expect([LUTADORES.baatar.hp, LUTADORES.baatar.pow]).toEqual([92, 0.9]);
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'baatar' }, real);
    const c = l.g.p2;
    expect([c.barras, c.barrasMax, c.maxHp, c.ficha, c.chefe]).toEqual([1, 1, 92, null, false]);
    expect(LUTADORES.baatar.stage).toBe('mn');
    expect(l.g.stage).toBe('mn');
  });

  it('`cfg.chefe` com o bloco de guardião (R1): 2 barras de 46, ficha base (sem fichaFase1), chefe true', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'baatar', chefe: true }, real);
    const c = l.g.p2;
    expect([c.barras, c.barrasMax, c.maxHp, c.ficha, c.chefe]).toEqual([2, 2, 46, null, true]);
  });

  it('`cfg.chefe` sem `LutadorDef.chefe` segue ignorado de propósito (a luta é a do normal, nunca lança): o CAIO não tem bloco', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'caio', chefe: true }, real);
    const c = l.g.p2;
    expect([c.barras, c.barrasMax, c.ficha, c.chefe]).toEqual([1, 1, null, false]);
  });

  it('o →+ESP é o MERGULHO com a arte própria (dive0/dive1), a caixa de acerto sai do dive1 e o ABRAÇO não existe mais', () => {
    const b = real.baatar;
    expect(b.moves.sFwd.name).toBe('MERGULHO DA ÁGUIA');
    expect(b.moves.sFwd.anim.s).toEqual(['sc0']);
    expect(getPD(b, 'sc0')).toBe(b.pd['dive0']);
    expect(getPD(b, 'sc1')).toBe(b.pd['dive1']);
    expect(b.sps.map((m) => m.name)).toEqual(['ARREMESSO DO AVARGA', 'QUEBRA-BASE', 'MERGULHO DA ÁGUIA']);
    expect(b.sps.some((m) => (m.name ?? '').includes('ABRAÇO'))).toBe(false);
  });

  it('o MERGULHO com a arte real ainda acerta o rival (a caixa nova não passa por cima nem por baixo)', () => {
    for (const dist of [200, 300, 450]) {
      const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'baatar' }, real);
      ateALuta(l);
      const { g } = l;
      g.p1.x = 480 - dist;
      g.p2.x = 480;
      g.p2.en = 100;
      g.p2.startMove('sFwd', g);
      const evs = [];
      for (let i = 0; i < 90; i++) evs.push(...l.passo());
      const acertou = tipos(evs, 'hit').length + tipos(evs, 'block').length;
      expect(acertou, `distância ${dist}`).toBeGreaterThan(0);
    }
  });

  it('a pose de vitória (win) e as da Dança da Águia (devekh0..2) seguem no atlas dele', () => {
    for (const n of ['win', 'devekh0', 'devekh1', 'devekh2', 'dive0', 'dive1']) expect(real.baatar.pd[n], n).toBeDefined();
  });
});

describe('E5 · mecânica de chefe do motor com a arte real do BAATAR (def ANTIGO de fixtura, tests/unit/_baatar-chefe.ts)', () => {
  const cfg = realComChefe.baatar.chefe;

  it('ConfigChefe (2 barras de 40, fichas chefe/chefe2, Dança de 90 ticks, bônus 5000) monta sobre o atlas real', () => {
    expect(cfg).toEqual({ barras: 2, hpPorBarra: 40, fichaFase1: 'chefe', fichaFase2: 'chefe2', cena: { duracao: 90, poses: ['devekh0', 'devekh1', 'devekh2'] }, bonusVitoria: 5000 });
    expect(Object.keys(realComChefe.baatar.fichas).sort()).toEqual(['chefe', 'chefe2']);
  });

  it('setup de chefe: P2 com 2 barras de 40, ficha da fase 1, round único e perfil de CPU do chefe', () => {
    const l = criarLuta({ mode: 'cpu', c1: 'hayato', c2: 'baatar', chefe: true, cpu: 1 }, realComChefe);
    const c = l.g.p2;
    expect([c.barras, c.barrasMax, c.maxHp, c.hp, c.ficha, c.chefe]).toEqual([2, 2, 40, 40, 'chefe', true]);
    expect(l.g.winsNeeded).toBe(1);
    expect(c.perfilIa).toEqual(perfilChefe(1, false));
  });

  it('luta de chefe inteira com a arte real: troca de barra, Dança (devekh0..2 do atlas) e ficha da fase 2 com MERGULHO', () => {
    const l = criarLuta({ mode: 'versus', c1: 'hayato', c2: 'baatar', chefe: true }, realComChefe);
    ateALuta(l);
    const { g } = l;
    const c = g.p2;
    c.hp = 0;
    expect(g.resolverVidaZerada(c, g.p1)).toBe(false);
    expect([c.barras, c.hp, c.cenaPendente]).toEqual([1, 40, true]);
    const evs = [];
    for (let i = 0; i < 400 && g.phase !== 'cena-chefe'; i++) evs.push(...l.passo());
    expect(g.phase).toBe('cena-chefe');
    const nomes = new Set<string>();
    let ticks = 0;
    while (g.phase === 'cena-chefe' && ticks < 200) {
      nomes.add(c.poseT().name);
      evs.push(...l.passo());
      ticks++;
    }
    expect(ticks).toBe(90);
    expect([...nomes].sort()).toEqual(['devekh0', 'devekh1', 'devekh2']);
    for (const n of nomes) expect(getPD(c.ch, n), n).toBe(realComChefe.baatar.pd[n]);
    expect(c.ficha).toBe('chefe2');
    expect(c.ch.moves.sFwd.name).toBe('MERGULHO DA ÁGUIA');
    expect(tipos(evs, 'fase-chefe').map((e) => (e.tipo === 'fase-chefe' ? e.etapa : ''))).toEqual(['troca', 'cena', 'retomada']);
  });
});

describe('E5 · poses dos dados × atlas real', () => {
  it('toda pose citada pela animação dos golpes (base e fichas) resolve para um quadro REAL, não para o idle0 de último recurso', () => {
    for (const id of IDS_LUTADORES) {
      const ch = real[id];
      const ultimo = ch.pd['guard'] ?? ch.pd['idle0'];
      for (const m of [ch, ...Object.values(ch.fichas)]) {
        for (const [golpe, mv] of Object.entries(m.moves)) {
          const a = mv.anim;
          const nomes = [...a.s, ...a.a, ...(a.r ?? []), ...(a.fall ? [a.fall] : [])];
          for (const n of nomes) {
            const p = getPD(m, n);
            const ehUltimoRecurso = p === ultimo && n !== 'idle0' && n !== 'guard';
            expect(ehUltimoRecurso, `${id} ${golpe}: pose "${n}" caiu no último recurso`).toBe(false);
          }
        }
      }
    }
  });

  it('atlas novo sem jumpPunch/crouchPunch: o soco aéreo vira jkick e o preparo da BOTE vira clp (ponte por lutador); os 4 originais seguem sem ponte', () => {
    for (const id of ['aminu', 'centella', 'camille', 'nila'] as const) {
      expect(real[id].alias['jpunch'], id).toBe('jkick');
      expect(getPD(real[id], 'jpunch'), id).toBe(real[id].pd['jkick']);
      expect(real[id].alias['crouchPunch'], id).toBe('clp');
    }
    for (const id of ORIGINAIS) {
      expect(real[id].alias['jpunch'], id).toBeUndefined();
      expect(Object.keys(real[id].alias).sort(), id).toEqual(['sb1', 'sb2', 'sc0', 'sc1']);
    }
    // o BAATAR tem o jpunch próprio (folha B8), mas não o crouchPunch legado
    expect(real.baatar.alias['jpunch']).toBeUndefined();
    expect(real.baatar.alias['crouchPunch']).toBe('clp');
  });

  it('BAATAR: 54 quadros, alturaRef 525 e escala única (K = 1,28 × 255 / 525); apelido idle0/idle2 é o mesmo retângulo', () => {
    const m = lerManifestoC1('baatar');
    expect(Object.keys(m.quadros)).toHaveLength(54);
    expect(m.alturaRef).toBe(525);
    for (const n of ['jpunch', 'devekh0', 'devekh1', 'devekh2', 'dive0', 'dive1']) expect(m.quadros[n], n).toBeDefined();
    expect(real.baatar.K).toBeCloseTo((1.28 * 255) / 525, 9);
    const ret = (n: string) => ((p) => [p?.x, p?.y, p?.w, p?.h, p?.ax])(real.baatar.pd[n]);
    expect(ret('idle2')).toEqual(ret('idle0'));
  });

  it('os outros 4 novos: alturaRef 410 e K = scale × 255 / 410; 48 quadros (a NILA tem 60: as 12 da folha 5 da SARPA)', () => {
    for (const id of ['aminu', 'centella', 'camille', 'nila'] as const) {
      const m = lerManifestoC1(id);
      expect(Object.keys(m.quadros), id).toHaveLength(id === 'nila' ? 60 : 48);
      expect(m.alturaRef, id).toBe(410);
      expect(real[id].K, id).toBeCloseTo((LUTADORES[id].scale * 255) / 410, 9);
    }
    const ret = (n: string) => ((p) => [p?.x, p?.y, p?.w, p?.h, p?.ax])(real.centella.pd[n]);
    expect(ret('idle3')).toEqual(ret('idle1')); // apelido da CENTELLA
  });

  it('NILA: as 12 poses sarpa* (folha 5 v2) estão no atlas e a SARPA desenha com elas; a GAJA não muda', () => {
    const sarpa = real.nila.fichas['sarpa']!;
    const nomes = Object.keys(real.nila.pd).filter((n) => n.startsWith('sarpa')).sort();
    expect(nomes).toEqual([
      'sarpaBlock', 'sarpaIdle0', 'sarpaIdle1', 'sarpaIdle2', 'sarpaIdle3', 'sarpaLeap0', 'sarpaLeap1', 'sarpaLeap2',
      'sarpaSlide0', 'sarpaSlide1', 'sarpaWalk0', 'sarpaWalk1',
    ]);
    for (const n of ['idle0', 'idle1', 'idle2', 'idle3']) expect(getPD(sarpa, n), n).toBe(real.nila.pd['sarpa' + 'Idle' + n.slice(-1)]);
    for (let i = 0; i < 8; i++) expect(getPD(sarpa, 'walk' + i), `walk${i}`).toBe(real.nila.pd['sarpaWalk' + (i % 2)]);
    expect(getPD(sarpa, 'block')).toBe(real.nila.pd['sarpaBlock']);
    expect(getPD(sarpa, 'cblock')).toBe(real.nila.pd['sarpaBlock']);
    expect(getPD(sarpa, 'crouchPunch')).toBe(real.nila.pd['sarpaSlide0']);
    expect(getPD(sarpa, 'sweep')).toBe(real.nila.pd['sarpaSlide1']);
    expect(getPD(sarpa, 'sc0')).toBe(real.nila.pd['sarpaLeap0']);
    expect(getPD(sarpa, 'sc1')).toBe(real.nila.pd['sarpaLeap2']);
    // a GAJA (ficha base) segue com as poses canônicas
    for (const n of ['idle0', 'block', 'sweep', 'sc1']) expect(getPD(real.nila, n), n).toBe(real.nila.pd[n]);
  });

  it('NILA: as folhas f2/f3/f4 entram na escala da cabeça da f1 v3 (fatorFolha 1,2 / 1,15 / 1,1): guardas e defesa do tamanho do idle, não 15% menores', () => {
    const pd = real.nila.pd;
    const idle = pd['idle0']!.h;
    expect(lerManifestoC1('nila').imagens).toHaveLength(3);
    for (const n of ['lp0', 'hp0', 'sa0', 'sb0']) expect(Math.abs(pd[n]!.h - idle) / idle, n).toBeLessThanOrEqual(0.05);
    // em pé e de guarda alta, a defesa é um pouco mais alta que o idle (que é base larga), nunca mais baixa que ele
    expect(pd['block']!.h).toBeGreaterThanOrEqual(idle);
    expect(pd['block']!.h).toBeLessThanOrEqual(1.15 * idle);
  });

  it('NILA: a serpente é baixa e larga (idle mais largo que alto, menor que o idle da GAJA) e a ondulação do idle varia a altura', () => {
    const pd = real.nila.pd;
    const alturas = [0, 1, 2, 3].map((i) => pd['sarpaIdle' + i]!.h);
    for (const i of [0, 1, 2, 3]) {
      const q = pd['sarpaIdle' + i]!;
      expect(q.w, `sarpaIdle${i}`).toBeGreaterThanOrEqual(q.h);
      expect(q.h, `sarpaIdle${i}`).toBeLessThanOrEqual(0.85 * pd['idle0']!.h);
    }
    expect(Math.max(...alturas) - Math.min(...alturas)).toBeGreaterThanOrEqual(10); // há ondulação (medido: 22 px)
    // o deslize ativo é o quadro mais baixo e mais largo; tem `ponta` (a caixa do BOTE sai dela)
    expect(pd['sarpaSlide1']!.w).toBeGreaterThan(2 * pd['sarpaSlide1']!.h);
    expect(pd['sarpaSlide1']!.tipX).toBeGreaterThan(0);
    expect(pd['sarpaLeap2']!.tipX).toBeGreaterThan(0);
  });
});

describe('HAYATO, MIN-JI, CAIO e WEI LONG: arte nova (folhas do pipeline) em produção, atlas original só como oráculo', () => {
  const nova = montarTodos({ arteReal: true });
  const DOIS = ['hayato', 'min-ji', 'caio', 'wei-long'] as const;

  it('atlas de produção: v2 de 2 páginas, 48 quadros canônicos, alturaRef 410 = idle0, K = scale × 255 / 410 (igual ao do protótipo)', () => {
    for (const id of DOIS) {
      const m = lerManifestoC1(id);
      expect(m.versao, id).toBe(2);
      expect(m.imagens, id).toEqual(['atlas-0.webp', 'atlas-1.webp']);
      expect(Object.keys(m.quadros), id).toHaveLength(id === 'wei-long' ? 49 : 48); // WEI LONG: + jpunch (folha de reposição wr)
      expect(m.alturaRef, id).toBe(410);
      expect(m.quadros['idle0']!.h, id).toBe(410);
      expect(nova[id].K, id).toBeCloseTo((LUTADORES[id].scale * 255) / 410, 9);
      expect(nova[id].K, id).toBeCloseTo(real[id].K, 9); // a escala do jogo não muda com a troca de arte
      expect(existsSync(caminho(`public/assets/lutadores/${id}/retrato.png`)), id).toBe(true);
    }
  });

  it('o oráculo segue com o atlas ORIGINAL (nomes legados, 1 imagem); a arte real não tem punch/kick/special', () => {
    for (const id of DOIS) {
      expect(real[id].pd['punch'], `${id} oráculo`).toBeDefined();
      expect(nova[id].pd['punch'], `${id} arte real`).toBeUndefined();
      expect(existsSync(caminho(`tests/fixtures/atlas-prototipo/${id}/atlas.webp`)), id).toBe(true);
    }
  });

  it('toda pose citada pelos golpes resolve para um quadro REAL; o soco aéreo vira jkick e o preparo do clp vira clp (ponte por lutador)', () => {
    for (const id of DOIS) {
      const ch = nova[id];
      const ultimo = ch.pd['guard'] ?? ch.pd['idle0'];
      for (const [golpe, mv] of Object.entries(ch.moves)) {
        const a = mv.anim;
        for (const n of [...a.s, ...a.a, ...(a.r ?? []), ...(a.fall ? [a.fall] : [])]) {
          const p = getPD(ch, n);
          expect(p === ultimo && n !== 'idle0' && n !== 'guard', `${id} ${golpe}: pose "${n}" caiu no último recurso`).toBe(false);
        }
      }
      // WEI LONG tem o jpunch no atlas (folha wr): o motor usa o dele, sem a ponte para o jkick
      expect(ch.alias['jpunch'], id).toBe(id === 'wei-long' ? undefined : 'jkick');
      expect(ch.alias['crouchPunch'], id).toBe('clp');
      expect(ch.legacy, id).toBe(false);
    }
  });

  it('os golpes ativos têm ponta (tipX/tipY) e a caixa de cada golpe sai do desenho novo: alcance > 0 e dentro de 2x o do protótipo', () => {
    for (const id of DOIS) {
      for (const p of ['lp1', 'hp1', 'lk1', 'hk1', 'clp', 'clk', 'sweep', 'upper', 'sa1', 'sb1', 'sb2', 'sc1', 'jkick']) {
        if (id === 'caio' && p === 'sb2') continue; // CAIO sb2: ponta 'nenhuma' (lutadores.json); só o rastro dependia dela
        expect(nova[id].pd[p]?.tipX, `${id} ${p}`).toBeTypeOf('number');
        expect(nova[id].pd[p]?.tipY, `${id} ${p}`).toBeTypeOf('number');
      }
      for (const [n, caixa] of Object.entries(nova[id].boxes)) {
        const antes = (real[id].boxes as Record<string, { w: number }>)[n]!;
        expect(caixa!.w, `${id} ${n}`).toBeGreaterThanOrEqual(90);
        expect(caixa!.w, `${id} ${n}`).toBeLessThanOrEqual(2 * antes.w);
      }
    }
  });
});

describe('E5 · cenários', () => {
  const ids = Object.keys(CENARIOS) as IdCenario[];
  const ferramenta = async () =>
    (await import(/* @vite-ignore */ pathToFileURL(caminho('ferramentas/extrair-prototipo.mjs')).href)) as { dimensoesWebp: (b: Buffer) => [number, number] };

  it('10 cenários: jp, cn, kr, br + ng, mx, fr, in, mn + gr (o do chefão); cada um com a sua casa', () => {
    expect(ids.sort()).toEqual(['br', 'cn', 'fr', 'gr', 'in', 'jp', 'kr', 'mn', 'mx', 'ng']);
    const casas: Record<string, IdLutador> = { jp: 'hayato', cn: 'wei-long', kr: 'min-ji', br: 'caio', ng: 'aminu', mx: 'centella', fr: 'camille', in: 'nila', mn: 'baatar', gr: 'zenon' };
    for (const id of ids) expect(CENARIOS[id].casa, id).toBe(casas[id]);
  });

  it('cada lutador aponta para o cenário cuja casa é ele (bijeção 10 × 10)', () => {
    for (const id of IDS_LUTADORES) {
      const c = CENARIOS[LUTADORES[id].stage];
      expect(c.casa, id).toBe(id);
    }
    expect(new Set(IDS_LUTADORES.map((id) => LUTADORES[id].stage)).size).toBe(10);
  });

  it('os arquivos existem e são imagens de verdade (WebP ou JPEG, 16:9 aproximado)', async () => {
    const { dimensoesWebp } = await ferramenta();
    for (const id of ids) {
      const arq = CENARIOS[id].arquivo;
      const bytes = readFileSync(caminho(`public/${arq}`));
      if (arq.endsWith('.webp')) {
        expect(bytes.subarray(0, 4).toString('latin1'), arq).toBe('RIFF');
        expect(bytes.subarray(8, 12).toString('latin1'), arq).toBe('WEBP');
        const [w, h] = dimensoesWebp(bytes);
        expect(w / h, arq).toBeGreaterThan(1.6);
        expect(w / h, arq).toBeLessThan(1.95);
      } else {
        expect([...bytes.subarray(0, 3)], arq).toEqual([0xff, 0xd8, 0xff]);
      }
    }
  });

  it('o nome do arquivo é cenario-<sigla>.webp nos dez (cn, kr e br trocaram o .jpg do protótipo na T1)', () => {
    for (const id of ['jp', 'ng', 'mx', 'fr', 'in', 'mn', 'gr', 'cn', 'kr', 'br'] as const) expect(CENARIOS[id].arquivo).toBe(`assets/cenarios/cenario-${id}.webp`);
  });

  it('os pés ficam a 84,5% da altura da imagem em todos (não os 87% da tela) e a constante bate com a render', () => {
    expect(PES_NO_CENARIO).toBeCloseTo(0.8448, 4);
    expect(PES_NO_CENARIO).toBeCloseTo((GROUND + 20) / (ALTURA + 40), 12);
    for (const id of ids) expect(CENARIOS[id].pes, id).toBe(PES_NO_CENARIO);
    // a render desenha o fundo em y = -20 com ALTURA + 40 de altura: se mudar lá, a linha dos pés mudou
    const fonte = readFileSync(caminho('src/render/cenario.ts'), 'utf8');
    expect(fonte).toContain(`${CENARIO_Y}, LARGURA + 60, ALTURA + 40)`);
    expect(CENARIO_ALTURA).toBe(ALTURA + 40);
    expect(LARGURA).toBe(960);
  });

  it('título e menus: o ciclo e o fundo padrão ficam nos 4 iniciais (sem entregar os novos)', () => {
    expect([...CICLO_CENARIOS]).toEqual(['jp', 'cn', 'kr', 'br']);
    expect(CENARIO_PADRAO).toBe('jp');
  });
});

describe('E5 · rollback de onda com os ids finais', () => {
  type Falso = ArmazenamentoLike & { dados: Map<string, string> };
  const falso = (): Falso => {
    const dados = new Map<string, string>();
    return { dados, getItem: (k) => dados.get(k) ?? null, setItem: (k, v) => void dados.set(k, v), removeItem: (k) => void dados.delete(k) };
  };
  const ONDA1: Pick<Regras, 'roster' | 'iniciais'> = { roster: ORIGINAIS, iniciais: ORIGINAIS };
  const base = { s: { ...CONFIGURACOES_PADRAO }, hi: 10 };

  it('os 5 ids novos têm a forma de id aceita pelos "desconhecidos" (o build antigo os preserva)', () => {
    const st = falso();
    salvarDadosV2(st, { ...base, prog: { desbloqueados: [...NOVOS], zeradas: 5, chefeDerrotado: true, vistos: [...NOVOS] } });
    const velho = carregarDadosV2(st, ONDA1);
    expect(velho.prog.desbloqueados).toEqual([]);
    expect(velho.prog.desconhecidos).toEqual([...NOVOS]);
  });

  it('build de 9 grava -> build de 4 (rollback) joga e salva -> build de 9 recupera todos os ganhos', () => {
    const st = falso();
    salvarDadosV2(st, { ...base, prog: { desbloqueados: ['aminu', 'centella', 'nila', 'baatar'], zeradas: 3, chefeDerrotado: true, vistos: ['aminu'] } });
    const velho = carregarDadosV2(st, ONDA1);
    expect(salvarDadosV2(st, { ...velho, hi: 99 }, ONDA1)).toBe(true);
    const novo = carregarDadosV2(st);
    expect(novo.prog.desbloqueados).toEqual(['aminu', 'centella', 'nila', 'baatar']);
    expect(novo.prog.desconhecidos).toBeUndefined();
    expect(novo.prog.chefeDerrotado).toBe(true);
    expect(novo.hi).toBe(99);
  });

  it('build de 4 ignora o ganho na UI: nada liberado além dos iniciais', () => {
    const st = falso();
    salvarDadosV2(st, { ...base, prog: { desbloqueados: ['aminu', 'baatar'], zeradas: 1, chefeDerrotado: true, vistos: [] } });
    const velho = carregarDadosV2(st, ONDA1);
    expect([...liberados(velho.prog, { ...REGRAS_PADRAO, ...ONDA1, fila: [], chefe: null })].sort()).toEqual([...ORIGINAIS].sort());
  });
});

describe('E5 · fumaça: CPU × CPU com a arte real', () => {
  it.each(NOVOS)('%s contra o WEI LONG: 3000 ticks sem exceção, com acertos e dano', (id) => {
    const cfg = { mode: 'cpu', c1: id, c2: 'wei-long', cpu: 2, p1cpu: 2 } as const;
    const l = criarLuta(cfg, real, criarRng(42));
    const evs = [];
    for (let i = 0; i < 3000; i++) evs.push(...l.passo());
    expect(tipos(evs, 'hit').length + tipos(evs, 'block').length, id).toBeGreaterThan(5);
    expect(l.g.p1.hp < l.g.p1.maxHp || l.g.p2.hp < l.g.p2.maxHp || l.g.p1.barras !== l.g.p1.barrasMax || l.g.p2.barras !== l.g.p2.barrasMax, id).toBe(true);
  });
});
