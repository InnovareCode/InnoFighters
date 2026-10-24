import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type Configuracoes, type IdLutador, type InputFrame, type LeituraLuta, type LutadorLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, derrotouOChefe, progressoVazio, type Regras } from '../../src/meta';
import { APRESENTACAO, falaDoChefe, poseDeApresentacao, roteiroDe } from '../../src/render/apresentacao-lutadores';
import { DURACAO_PADRAO_DA_CENA, rampaDaFase2 } from '../../src/render/aura-chefe';
import { ALVO_PADRAO, LIMITE_DE_PRIMITIVAS, desenharEfeitoDeEntrada, type VistaDoEfeito } from '../../src/render/efeitos-de-entrada';
import {
  DURACAO_ENTRADA_COMPLETA,
  DURACAO_ENTRADA_CURTA,
  EntradaDoChefe,
  indiceDaBatida,
  linhaDaEntrada,
  paletaDoCartao,
  porQuadrosChave,
  PALETA_DO_ARCONTE,
  type SomDaEntrada,
} from '../../src/render/entrada-chefe';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import { desenharMundo } from '../../src/render/mundo';
import { ESCURECER_NA_FASE2, TOM_DA_FASE2, desenharVeuDeFase2 } from '../../src/render/veu-de-fase2';
import { BATIDAS_DO_ZENON, ROTEIROS_DOS_GUARDIOES, type EfeitoDeEntrada } from '../../src/render/roteiros-de-entrada';
import { TEXTOS_COMUNS, TEXTOS_DOS_CHEFOES } from '../../src/render/textos-dos-chefoes';
import { rivaisDaEscada } from '../../src/ui/escada-texto';
import type { Mundo } from '../../src/ui/contexto';
import type { CenaChefe } from '../../src/ui/cenas/chefe';
import type { CenaDesbloqueio } from '../../src/ui/cenas/desbloqueio';
import type { CenaFight } from '../../src/ui/cenas/fight';
import type { CenaSelect } from '../../src/ui/cenas/select';
import type { CenaVs } from '../../src/ui/cenas/vs';
import type { CampanhaArcade } from '../../src/ui/tipos';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { gravador, navegadorFalso, arteFalsa } from './_ui';

/*
 * L1/E1 (Lyra): os chefões progressivos na UI e as entradas por ROTEIRO dos 5 guardiões. Os 7 testes antigos que fixavam "ZENON no fim com save vazio" foram reescritos nos
 * arquivos deles; aqui ficam os testes NOVOS: textos do Apolo dentro dos limites, roteiros em dados, linha do tempo generalizada, efeitos de cena (orçamento e pureza), a rampa da
 * fase 2 sem ficha, a entrada na cena da luta (270/60 ticks, pular, lock-step) e as telas de aviso, VS, seleção e desbloqueio.
 */

const GUARDIOES = ['aminu', 'centella', 'camille', 'nila', 'baatar'] as const;
const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;
const atlasDe = (id: string): Record<string, unknown> =>
  (JSON.parse(readFileSync(fileURLToPath(new URL(`../../public/assets/lutadores/${id}/atlas.json`, import.meta.url)), 'utf8')) as { quadros: Record<string, unknown> }).quadros;

describe('textos do Apolo transcritos: limites da spec §2.5', () => {
  const t = (id: string) => TEXTOS_DOS_CHEFOES[id]!;
  it('os 5 guardiões: aviso <= 17 por linha, rodapé do aviso <= 56, cartão 14/18/20, HUD <= 16, VS <= 22, epílogo <= 56, falas dentro dos limites', () => {
    for (const id of GUARDIOES) {
      const x = t(id);
      for (const linha of x.aviso ?? []) expect(linha.length, `${id} aviso`).toBeLessThanOrEqual(17);
      expect(x.avisoRodape.length, `${id} avisoRodape`).toBeLessThanOrEqual(56);
      expect(x.cartao!.nome.length, `${id} nome`).toBeLessThanOrEqual(14);
      expect(x.cartao!.titulo.length, `${id} titulo`).toBeLessThanOrEqual(18);
      expect(x.cartao!.rodape.length, `${id} rodape`).toBeLessThanOrEqual(20);
      expect((x.tituloHud ?? '').length, `${id} tituloHud`).toBeLessThanOrEqual(16);
      expect(x.vs.length, `${id} vs`).toBeLessThanOrEqual(22);
      const f = x.falas!;
      expect(f.entrada!.length, `${id} entrada`).toBeLessThanOrEqual(96);
      expect(f.fase2!.length, `${id} fase2`).toBeLessThanOrEqual(28);
      expect(f.vitoria!.length, `${id} vitoria`).toBeLessThanOrEqual(60);
      expect(f.derrota!.length, `${id} derrota`).toBeLessThanOrEqual(72);
      for (const k of ['quem', 'porque', 'convite'] as const) expect(x.epilogo[k].length, `${id} ${k}`).toBeLessThanOrEqual(56);
    }
  });

  it('a entrada é cortada no 1º ". ": a 1ª frase (tudo o que a CURTA mostra) tem <= 46 e termina em ponto; sobra uma 2ª frase', () => {
    for (const id of GUARDIOES) {
      const fala = t(id).falas!.entrada!;
      const i = fala.indexOf('. ');
      expect(i, id).toBeGreaterThan(0);
      expect(fala.slice(0, i + 1).length, id).toBeLessThanOrEqual(46);
      expect(fala.slice(i + 2).length, id).toBeGreaterThan(0);
    }
  });

  it('nenhuma marca de revisão (†) e nenhum texto em branco; avisos e cartões em caixa alta', () => {
    const todos = JSON.stringify([TEXTOS_DOS_CHEFOES, TEXTOS_COMUNS]);
    expect(todos).not.toContain('†');
    expect(todos).not.toMatch(/""/);
    for (const id of GUARDIOES) {
      const x = t(id);
      for (const s of [...(x.aviso ?? []), x.cartao!.nome, x.cartao!.titulo, x.cartao!.rodape, x.vs]) expect(s, id).toBe(s.toLocaleUpperCase('pt-BR'));
    }
  });

  it('gênero: o VS diz "A GUARDIÃ" para CENTELLA, CAMILLE e NILA e "O GUARDIÃO" para AMINU e BAATAR; o aviso e a seleção não revelam o gênero', () => {
    for (const id of ['centella', 'camille', 'nila']) expect(t(id).vs, id).toBe('ARCADE — A GUARDIÃ');
    for (const id of ['aminu', 'baatar']) expect(t(id).vs, id).toBe('ARCADE — O GUARDIÃO');
    expect(t('zenon').vs).toBe('ARCADE — O ANFITRIÃO');
    const neutros = [...GUARDIOES.flatMap((id) => [...(t(id).aviso ?? []), t(id).avisoRodape]), ...TEXTOS_COMUNS.selecao.proximo, ...TEXTOS_COMUNS.selecao.outros];
    for (const s of neutros) expect(s, s).not.toMatch(/\b(o|a)\s+guardi[ãa]o?\b|\bderrote-[oa]\b/i);
    for (const s of [...TEXTOS_COMUNS.selecao.proximo, ...TEXTOS_COMUNS.selecao.outros]) {
      expect(s.length, s).toBeLessThanOrEqual(48);
      expect(s, s).not.toMatch(/-o\b|-a\b/);
    }
  });

  it('o ZENON: aviso de revanche, rodapé de revanche, "O ANFITRIÃO SE RENDE" sem "!" e o epílogo; o aviso da 1ª vez e as falas dele continuam as de antes', () => {
    expect(t('zenon').avisoRevanche).toEqual(['O ANFITRIÃO', 'QUER REVANCHE']);
    expect(t('zenon').desbloqueioTitulo).toBe('O ANFITRIÃO SE RENDE');
    expect(APRESENTACAO['zenon']?.avisoRevanche).toEqual(['O ANFITRIÃO', 'QUER REVANCHE']);
    expect(APRESENTACAO['zenon']?.aviso).toEqual(['O ANFITRIÃO', 'ESTÁ À SUA ESPERA']);
    expect(APRESENTACAO['zenon']?.falas?.entrada).toBe('Bem-vindo à minha casa. Todo torneio precisa de um anfitrião... e de um último convidado.');
    expect(APRESENTACAO['zenon']?.avisoRodape).toBe('A última luta do torneio: 1 round, 2 barras de vida.');
  });
});

describe('roteiros de entrada em dados', () => {
  it('os 5 guardiões e o ZENON têm roteiro; cada um dos 5 com o cartão dos textos, o efeito próprio e as cores do lutador', () => {
    const efeitos: Record<string, EfeitoDeEntrada> = { aminu: 'vapor', centella: 'holofotes', camille: 'neblina', nila: 'luar', baatar: 'vento' };
    for (const id of GUARDIOES) {
      const r = roteiroDe(id)!;
      expect(r, id).toBeDefined();
      expect(r.efeito, id).toBe(efeitos[id]);
      expect(r.cartao, id).toEqual(TEXTOS_DOS_CHEFOES[id]!.cartao);
      expect(r.naCorDoLutador, id).toBe(true);
      expect((r.som ?? []).length, `${id} som`).toBeGreaterThan(0);
    }
    expect(roteiroDe('zenon')!.efeito).toBe('braseiros-gr');
    expect(roteiroDe('zenon')!.naCorDoLutador).toBeUndefined();
    expect(roteiroDe('zenon')!.cartao).toBe(APRESENTACAO['zenon']!.entradaDramatica);
    expect(roteiroDe('caio')).toBeUndefined();
    expect(roteiroDe('hayato')).toBeUndefined();
  });

  it('só poses que JÁ existem nos atlas reais (arte nova entra trocando o nome da pose, sem código)', () => {
    for (const id of [...GUARDIOES, 'zenon']) {
      const quadros = atlasDe(id);
      for (const b of roteiroDe(id)!.batidas) expect(quadros[b.pose], `${id}: ${b.pose}`).toBeDefined();
    }
  });

  it('batidas em ordem crescente, a 1ª em 0, a última antes do fim da COMPLETA; zoom entre 0,95 e 1,15 e dx só na CAMILLE', () => {
    for (const id of [...GUARDIOES, 'zenon']) {
      const b = roteiroDe(id)!.batidas;
      expect(b[0]!.em, id).toBe(0);
      for (let i = 1; i < b.length; i++) expect(b[i]!.em, `${id} #${i}`).toBeGreaterThan(b[i - 1]!.em);
      expect(b[b.length - 1]!.em, id).toBeLessThan(DURACAO_ENTRADA_COMPLETA);
      for (const x of b) if (x.zoom !== undefined) expect(x.zoom, `${id} zoom`).toBeGreaterThanOrEqual(0.95);
      for (const x of b) if (x.zoom !== undefined) expect(x.zoom, `${id} zoom`).toBeLessThanOrEqual(1.15);
    }
    expect(roteiroDe('camille')!.batidas.some((x) => x.dx !== undefined)).toBe(true);
    for (const id of ['aminu', 'centella', 'nila', 'baatar', 'zenon']) expect(roteiroDe(id)!.batidas.some((x) => x.dx !== undefined), id).toBe(false);
  });

  it('o cartão (144) e a fala (150) entram na batida 3: o cartão começa na última batida de cada guardião ou depois dela', () => {
    for (const id of GUARDIOES) {
      const b = roteiroDe(id)!.batidas;
      expect(indiceDaBatida(b, 143), id).toBeLessThan(indiceDaBatida(b, 144) + 1);
      expect(b.some((x) => x.em === 144), `${id}: uma batida abre o cartão em 144`).toBe(true);
    }
  });

  it('as poses citadas na ordem do spec §2.2 (conferência de transcrição, uma a uma)', () => {
    const poses = (id: string) => [...new Set(roteiroDe(id)!.batidas.map((b) => b.pose))];
    expect(poses('aminu')).toEqual(['block', 'sa0', 'sa1', 'sa2']);
    expect(poses('centella')).toEqual(['jtop', 'land', 'win']);
    expect(poses('camille')).toEqual(['walk0', 'walk1', 'walk2', 'walk3', 'block', 'hk1']);
    expect(poses('nila')).toEqual(['idle0', 'crouch', 'sarpaIdle0', 'sarpaIdle1', 'sarpaIdle2', 'sarpaIdle3']);
    expect(poses('baatar')).toEqual(['devekh0', 'devekh1', 'devekh2']);
    expect(Object.keys(ROTEIROS_DOS_GUARDIOES).sort()).toEqual([...GUARDIOES].sort());
  });
});

describe('a linha do tempo generalizada', () => {
  it('o ZENON reproduz o 0/1/2 de antes (índice da batida) e a ausência de zoom e de deslocamento', () => {
    expect(BATIDAS_DO_ZENON.map((b) => [b.em, b.pose])).toEqual([[0, 'entrada0'], [96, 'entrada1'], [144, 'entrada2']]);
    const p = (t: number) => linhaDaEntrada('completa', t).pose;
    expect([0, 95, 96, 143, 144, 269].map(p)).toEqual([0, 0, 1, 1, 2, 2]);
    for (const t of [0, 50, 100, 200, 269]) {
      const q = linhaDaEntrada('completa', t);
      expect(q.zoom, `t${t}`).toBe(1);
      expect(q.dx, `t${t}`).toBe(0);
    }
    expect(linhaDaEntrada('completa', 30).acesos).toBe(0);
    expect(linhaDaEntrada('completa', 60).acesos).toBe(3);
  });

  it('cada guardião: o índice da batida sobe só para frente; a CURTA e o pulo ficam na ÚLTIMA batida, com o zoom e o dx finais', () => {
    for (const id of GUARDIOES) {
      const r = roteiroDe(id)!;
      let ant = -1;
      for (let t = 0; t < DURACAO_ENTRADA_COMPLETA; t++) {
        const q = linhaDaEntrada('completa', t, null, r);
        expect(q.pose, `${id} t${t}`).toBeGreaterThanOrEqual(ant);
        expect(q.pose, `${id} t${t}`).toBeLessThan(r.batidas.length);
        ant = q.pose;
        expect(q.acesos, `${id} sem sequência de braseiros`).toBe(6);
      }
      expect(linhaDaEntrada('completa', 269, null, r).pose, id).toBe(r.batidas.length - 1);
      for (const t of [0, 10, 30, 59]) {
        const c = linhaDaEntrada('curta', t, null, r);
        expect(c.pose, `${id} curta t${t}`).toBe(r.batidas.length - 1);
        expect(c.zoom, `${id} curta zoom`).toBe(porQuadrosChave(r.batidas, 'zoom', 1, Infinity));
        expect(c.dx, `${id} curta dx`).toBe(0);
        expect(c.efeito, `${id} curta efeito`).toBe(1);
      }
      const pulou = linhaDaEntrada('completa', 26, 20, r);
      expect(pulou.pose, `${id} pulou`).toBe(r.batidas.length - 1);
      expect(pulou.zoom, `${id} pulou zoom no fim da saída`).toBeCloseTo(porQuadrosChave(r.batidas, 'zoom', 1, Infinity), 9);
      expect(pulou.dx, `${id} pulou dx no fim da saída`).toBeCloseTo(0, 9);
    }
  });

  it('o zoom anda por quadros-chave (AMINU fecha no punho em 120, volta a 1 até o 214; CENTELLA parte de 1,15; BAATAR parte do plano aberto 0,95) e nunca fora do intervalo dos quadros', () => {
    const z = (id: string, t: number) => linhaDaEntrada('completa', t, null, roteiroDe(id)!).zoom;
    expect(z('aminu', 0)).toBe(1);
    expect(z('aminu', 120)).toBeCloseTo(1.12, 9);
    expect(z('aminu', 100)).toBeGreaterThan(1);
    expect(z('aminu', 100)).toBeLessThan(1.12);
    expect(z('aminu', 214)).toBe(1);
    expect(z('aminu', 269)).toBe(1);
    expect(z('centella', 0)).toBeCloseTo(1.15, 9);
    expect(z('centella', 96)).toBe(1);
    expect(z('baatar', 0)).toBeCloseTo(0.95, 9);
    expect(z('baatar', 144)).toBe(1);
    for (const id of GUARDIOES) for (let t = 0; t < 270; t++) expect(z(id, t), `${id} t${t}`).toBeGreaterThanOrEqual(0.95);
  });

  it('a CAMILLE entra andando: dx cai de 300 a 0 até o tick 96 e fica; nada de pulo (monotônico)', () => {
    const r = roteiroDe('camille')!;
    const dx = (t: number) => linhaDaEntrada('completa', t, null, r).dx;
    expect(dx(0)).toBe(300);
    expect(dx(96)).toBe(0);
    expect(dx(200)).toBe(0);
    let ant = 301;
    for (let t = 0; t <= 96; t++) {
      expect(dx(t)).toBeLessThanOrEqual(ant);
      ant = dx(t);
    }
  });

  it('a CURTA e o pulo ficam no zoom e no dx FINAIS do roteiro (dados em que o final não é 1 nem 0)', () => {
    const r = { efeito: 'vapor' as const, batidas: [{ em: 0, pose: 'a', zoom: 1, dx: 40 }, { em: 100, pose: 'b', zoom: 1.2, dx: 10 }] };
    expect(linhaDaEntrada('curta', 5, null, r).zoom).toBeCloseTo(1.2, 9);
    expect(linhaDaEntrada('curta', 5, null, r).dx).toBeCloseTo(10, 9);
    expect(linhaDaEntrada('completa', 26, 20, r).zoom).toBeCloseTo(1.2, 9); // saída de 6 ticks: chegou ao final
    expect(linhaDaEntrada('completa', 26, 20, r).dx).toBeCloseTo(10, 9);
    const meio = linhaDaEntrada('completa', 22, 20, r);
    expect(meio.zoom).toBeGreaterThan(linhaDaEntrada('completa', 20, 20, r).zoom - 1e-9);
    expect(meio.zoom).toBeLessThan(1.2);
  });

  it('porQuadrosChave: sem quadros devolve o neutro; antes do 1º parte do neutro; no infinito devolve o último', () => {
    expect(porQuadrosChave([{ em: 0, pose: 'a' }], 'zoom', 1, 50)).toBe(1);
    const b = [{ em: 10, pose: 'a', zoom: 2 }, { em: 20, pose: 'b', zoom: 4 }];
    expect(porQuadrosChave(b, 'zoom', 1, 0)).toBe(1);
    expect(porQuadrosChave(b, 'zoom', 1, 10)).toBe(2);
    expect(porQuadrosChave(b, 'zoom', 1, 15)).toBeCloseTo(3, 9);
    expect(porQuadrosChave(b, 'zoom', 1, Infinity)).toBe(4);
  });
});

/** Um contexto 2D que conta as operações de desenho e anota o que o código usou (para o orçamento e as proibições). */
function contador() {
  const operacoes: string[] = [];
  const proibidos: string[] = [];
  /** Toda chamada com os argumentos, as paradas de cor dos gradientes e as atribuições de estilo: o "filme" do quadro. */
  const tudo: unknown[] = [];
  const estado: Record<string, unknown> = {};
  const DESENHO = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage']);
  const ctx = new Proxy(estado, {
    get(_, n: string) {
      if (n === 'measureText') return () => ({ width: 10 });
      if (n === 'createLinearGradient' || n === 'createRadialGradient') {
        return (...a: unknown[]) => {
          tudo.push([n, ...a]);
          return { addColorStop: (...p: unknown[]) => tudo.push(['stop', ...p]) };
        };
      }
      if (n === 'getImageData' || n === 'putImageData') {
        proibidos.push(n);
        return () => undefined;
      }
      if (DESENHO.has(n)) return (...a: unknown[]) => (tudo.push([n, ...a]), operacoes.push(n));
      if (n in estado) return estado[n];
      return (...a: unknown[]) => tudo.push([n, ...a]);
    },
    set(_, n: string, v: unknown) {
      if (n === 'shadowBlur' || n === 'filter') proibidos.push(n);
      tudo.push(['=' + n, typeof v === 'object' ? 'obj' : v]);
      estado[n] = v;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { ctx, operacoes, proibidos, tudo };
}

describe('efeitos de cena da entrada (orçamento e pureza)', () => {
  const EFEITOS: readonly EfeitoDeEntrada[] = ['vapor', 'holofotes', 'neblina', 'luar', 'vento'];
  const vista = (efeito: EfeitoDeEntrada, tick: number, extra: Partial<VistaDoEfeito> = {}): VistaDoEfeito => ({
    efeito,
    progresso: Math.min(1, tick / 90),
    tick,
    alfa: 1,
    cor: '#d9822b',
    alvo: ALVO_PADRAO,
    ...extra,
  });

  it(`no máximo ${LIMITE_DE_PRIMITIVAS} primitivas por quadro, sem shadowBlur, filter nem getImageData, em todos os ticks da entrada`, () => {
    for (const e of EFEITOS) {
      let maior = 0;
      for (let t = 0; t <= DURACAO_ENTRADA_COMPLETA; t++) {
        const c = contador();
        desenharEfeitoDeEntrada(c.ctx, vista(e, t));
        maior = Math.max(maior, c.operacoes.length);
        expect(c.proibidos, `${e} t${t}`).toEqual([]);
      }
      expect(maior, e).toBeGreaterThan(0);
      expect(maior, e).toBeLessThanOrEqual(LIMITE_DE_PRIMITIVAS);
    }
  });

  it('puro do tick: o mesmo quadro desenha exatamente as mesmas chamadas (nenhum sorteio, nenhum estado escondido)', () => {
    for (const e of EFEITOS) {
      const a = contador();
      const b = contador();
      desenharEfeitoDeEntrada(a.ctx, vista(e, 137));
      desenharEfeitoDeEntrada(b.ctx, vista(e, 137));
      expect(JSON.stringify(a.tudo), e).toBe(JSON.stringify(b.tudo));
      const c = contador();
      desenharEfeitoDeEntrada(c.ctx, vista(e, 138));
      expect(JSON.stringify(c.tudo), `${e} anda com o tick`).not.toBe(JSON.stringify(a.tudo));
    }
  });

  it('nada para os braseiros da `gr` (moram na arena), nada sem alfa nem sem progresso', () => {
    const g = gravador();
    desenharEfeitoDeEntrada(g.ctx, vista('braseiros-gr', 100));
    expect(g.chamadas).toEqual([]);
    for (const e of EFEITOS) {
      const sem = gravador();
      desenharEfeitoDeEntrada(sem.ctx, vista(e, 100, { alfa: 0 }));
      desenharEfeitoDeEntrada(sem.ctx, vista(e, 100, { progresso: 0 }));
      expect(sem.chamadas, e).toEqual([]);
    }
  });

  it('os holofotes e o luar seguem o alvo (x) do chefão', () => {
    for (const e of ['holofotes', 'luar'] as const) {
      const perto = gravador();
      const longe = gravador();
      desenharEfeitoDeEntrada(perto.ctx, vista(e, 200, { alvo: { x: 300, chao: 470 } }));
      desenharEfeitoDeEntrada(longe.ctx, vista(e, 200, { alvo: { x: 760, chao: 470 } }));
      expect(JSON.stringify(perto.chamadas), e).not.toBe(JSON.stringify(longe.chamadas));
    }
  });
});

describe('o controlador EntradaDoChefe com os roteiros dos guardiões', () => {
  const iniciar = (id: string, modo: 'completa' | 'curta') => {
    const sons: SomDaEntrada[] = [];
    const e = new EntradaDoChefe({ aoSom: (s) => sons.push(s) });
    const r = roteiroDe(id)!;
    const x = TEXTOS_DOS_CHEFOES[id]!;
    e.iniciar(modo, r.cartao, x.falas!.entrada, r, prod[id as IdLutador].accent);
    return { e, sons };
  };

  it('termina em EXATAMENTE 270 / 60 avanços, para cada guardião', () => {
    for (const id of GUARDIOES) {
      for (const [modo, n] of [['completa', 270], ['curta', 60]] as const) {
        const { e } = iniciar(id, modo);
        for (let i = 1; i <= n; i++) {
          expect(e.ativa, `${id} ${modo} antes do avanço ${i}`).toBe(true);
          e.avancar();
        }
        expect(e.ativa, `${id} ${modo}`).toBe(false);
        expect(e.tick).toBe(modo === 'completa' ? DURACAO_ENTRADA_COMPLETA : DURACAO_ENTRADA_CURTA);
      }
    }
  });

  it('pular só vale depois do tick 10 e sai em <= 6 avanços; o pulo no tick 11 acaba no 17º', () => {
    for (const id of GUARDIOES) {
      const { e } = iniciar(id, 'completa');
      for (let i = 0; i < 9; i++) e.avancar();
      expect(e.pular(), `${id} tick 9`).toBe(false);
      e.avancar();
      e.avancar();
      expect(e.pular(), `${id} tick 11`).toBe(true);
      while (e.ativa) e.avancar();
      expect(e.tick, id).toBe(17);
    }
  });

  it('o som da assinatura toca UMA vez (COMPLETA e CURTA); os tons dos braseiros são só do ZENON; o cartão bate uma vez', () => {
    for (const id of GUARDIOES) {
      for (const modo of ['completa', 'curta'] as const) {
        const { e, sons } = iniciar(id, modo);
        while (e.ativa) e.avancar();
        expect(sons.filter((s) => s === 'assinatura'), `${id} ${modo}`).toHaveLength(1);
        expect(sons.filter((s) => s === 'cartao'), `${id} ${modo}`).toHaveLength(1);
        expect(sons.filter((s) => typeof s === 'object'), `${id} ${modo} sem braseiros`).toHaveLength(0);
        expect(e.assinatura.length, id).toBeGreaterThan(0);
      }
    }
    const z = new EntradaDoChefe({ aoSom: () => undefined });
    z.iniciar('completa', APRESENTACAO['zenon']!.entradaDramatica!, '');
    expect(z.assinatura).toEqual([]);
  });

  it('a assinatura não toca se o pulo vem antes dela? (ela está no tick 8, antes do 1º pulo possível, no 10): sempre toca', () => {
    const { e, sons } = iniciar('aminu', 'completa');
    for (let i = 0; i < 10; i++) e.avancar();
    e.pular();
    while (e.ativa) e.avancar();
    expect(sons.filter((s) => s === 'assinatura')).toHaveLength(1);
  });

  it('o cartão e o efeito levam a cor do guardião (accent); o do ZENON segue na paleta do Arconte', () => {
    expect(paletaDoCartao(undefined)).toBe(PALETA_DO_ARCONTE);
    expect(paletaDoCartao('xyz')).toBe(PALETA_DO_ARCONTE);
    const cores = new Set<string>();
    for (const id of GUARDIOES) {
      const p = paletaDoCartao(prod[id as IdLutador].accent);
      expect(p, id).not.toEqual(PALETA_DO_ARCONTE);
      expect(p.fio, id).not.toBe(PALETA_DO_ARCONTE.fio);
      cores.add(p.nome[1]);
    }
    expect(cores.size, 'cinco cartões diferentes').toBe(5);
    const { e } = iniciar('aminu', 'completa');
    for (let i = 0; i < 200; i++) e.avancar();
    const g = gravador();
    e.desenhar(g.ctx);
    expect(g.textos()).toContain('AMINU');
    expect(g.textos()).toContain('A LANÇA DE KANO');
    expect(g.textos()).toContain('SELO DA PACIÊNCIA'.split('').join(' '));
  });

  it('o controlador aplica a paleta ao desenhar: o fio do cartão do guardião é o dele e o do ZENON continua ouro', () => {
    const fios = (id: string): string[] => {
      const { e } = iniciar(id, 'completa');
      for (let i = 0; i < 200; i++) e.avancar();
      const c = contador();
      e.desenhar(c.ctx);
      return c.tudo.filter((x) => Array.isArray(x) && x[0] === '=fillStyle' && typeof x[1] === 'string').map((x) => String((x as unknown[])[1]));
    };
    for (const id of GUARDIOES) {
      const fio = paletaDoCartao(prod[id as IdLutador].accent).fio;
      expect(fios(id), id).toContain(fio);
      expect(fios(id), id).not.toContain(PALETA_DO_ARCONTE.fio);
    }
    const z = new EntradaDoChefe({ aoSom: () => undefined });
    z.iniciar('completa', APRESENTACAO['zenon']!.entradaDramatica!, 'x. y', APRESENTACAO['zenon']!.roteiro);
    for (let i = 0; i < 200; i++) z.avancar();
    const c = contador();
    z.desenhar(c.ctx);
    expect(c.tudo.filter((x) => Array.isArray(x) && x[0] === '=fillStyle')).toContainEqual(['=fillStyle', PALETA_DO_ARCONTE.fio]);
  });

  it('o efeito de cena só aparece com as faixas: no tick 0 não desenha nada além do que as faixas pedem', () => {
    const { e } = iniciar('baatar', 'completa');
    const g = contador();
    e.desenhar(g.ctx);
    expect(g.operacoes.filter((o) => o !== 'fillRect' && o !== 'fill')).toEqual([]);
    for (let i = 0; i < 100; i++) e.avancar();
    const depois = contador();
    e.desenhar(depois.ctx);
    expect(depois.operacoes.length).toBeGreaterThan(g.operacoes.length);
    expect(depois.proibidos).toEqual([]);
  });
});

describe('rampaDaFase2 sem ficha da fase 2 (os guardiões)', () => {
  const luta = (phase: LeituraLuta['phase'], t: number): LeituraLuta => ({ phase, t }) as unknown as LeituraLuta;
  const f = (extra: Partial<LutadorLeitura>): LutadorLeitura => ({ id: 'aminu', chefe: true, barras: 2, barrasMax: 2, ficha: null, ...extra }) as unknown as LutadorLeitura;

  it('cada guardião tem o bloco de chefe SEM fichaFase2 (a premissa desta regra)', () => {
    for (const id of GUARDIOES) expect(prod[id as IdLutador].chefe?.fichaFase2, id).toBeUndefined();
    expect(prod['zenon' as IdLutador].chefe?.fichaFase2).toBe('chefe2');
  });

  it('com todas as barras: 0; depois da troca de barra: 1 em qualquer fase da luta, inclusive na cena (a aura acende uma vez só)', () => {
    for (const id of GUARDIOES) {
      const ch = prod[id as IdLutador];
      for (const fase of ['intro', 'fight', 'ko', 'roundend', 'matchend', 'timeover'] as const) {
        expect(rampaDaFase2(luta(fase, 7), f({ id: id as IdLutador, barras: 2 }), ch), `${id} ${fase} cheio`).toBe(0);
        expect(rampaDaFase2(luta(fase, 7), f({ id: id as IdLutador, barras: 1 }), ch), `${id} ${fase} fase 2`).toBe(1);
      }
      for (const t of [0, 1, 30, 59, 60, 400]) expect(rampaDaFase2(luta('cena-chefe', t), f({ id: id as IdLutador, barras: 1 }), ch), `${id} cena t${t}`).toBe(1);
    }
  });

  it('a NILA em SARPA (outra ficha) continua com a aura: a ficha não manda mais; um lutador que não é o chefe nunca tem aura', () => {
    expect(rampaDaFase2(luta('fight', 7), f({ id: 'nila' as IdLutador, barras: 1, ficha: 'sarpa' }), prod['nila' as IdLutador]), 'sarpa').toBe(1);
    expect(rampaDaFase2(luta('fight', 7), f({ id: 'nila' as IdLutador, barras: 1, ficha: null }), prod['nila' as IdLutador]), 'gaja').toBe(1);
    expect(rampaDaFase2(luta('fight', 7), f({ id: 'nila' as IdLutador, chefe: false, barras: 1, barrasMax: 1 }), prod['nila' as IdLutador])).toBe(0);
  });

  it('o ZENON continua como era: a ficha da fase 2 manda e a rampa sobe na cena (sem o def, usa a duração padrão)', () => {
    const z = prod['zenon' as IdLutador];
    expect(rampaDaFase2(luta('fight', 100), f({ id: 'zenon' as IdLutador, barras: 1, ficha: 'chefe' }), z)).toBe(0);
    expect(rampaDaFase2(luta('fight', 100), f({ id: 'zenon' as IdLutador, barras: 1, ficha: 'chefe2' }), z)).toBe(1);
    expect(rampaDaFase2(luta('cena-chefe', 45), f({ id: 'zenon' as IdLutador, barras: 1, ficha: 'chefe' }), z)).toBeCloseTo(0.5, 9);
    expect(rampaDaFase2(luta('cena-chefe', DURACAO_PADRAO_DA_CENA / 2), f({ barras: 1 }), undefined)).toBeCloseTo(0.5, 9);
  });
});

describe('véu de chefão da fase 2 (spec §1.7)', () => {
  it('no máximo 2 primitivas, sem shadowBlur/filter/getImageData, nada com rampa 0 e o alfa sobe com a rampa', () => {
    const zero = contador();
    desenharVeuDeFase2(zero.ctx, 0, '#d9822b');
    expect(zero.tudo).toEqual([]);
    const c = contador();
    desenharVeuDeFase2(c.ctx, 1, '#d9822b');
    expect(c.operacoes).toEqual(['fillRect', 'fillRect']);
    expect(c.proibidos).toEqual([]);
    const estilos = c.tudo.filter((x) => Array.isArray(x) && x[0] === '=fillStyle').map((x) => String((x as unknown[])[1]));
    expect(estilos[0]).toContain(`${ESCURECER_NA_FASE2.toFixed(3)})`);
    expect(estilos[1]).toBe(`rgba(217,130,43,${TOM_DA_FASE2.toFixed(3)})`);
    const meia = contador();
    desenharVeuDeFase2(meia.ctx, 0.5, '#d9822b');
    expect(String((meia.tudo.find((x) => Array.isArray(x) && x[0] === '=fillStyle') as unknown[])[1])).toContain(`${(ESCURECER_NA_FASE2 / 2).toFixed(3)})`);
  });

  it('o mundo desenha o véu só na fase 2 do guardião (arena sem sobreposição própria); o ZENON na `gr` e o jogador comum não', () => {
    const veu = (c2: string, barras: number): number => {
      const g = new Game({ lutadores: prod, rng: criarRng(5) });
      g.setup({ mode: 'arcade', c1: 'hayato', c2: c2 as IdLutador, cpu: 0, chefe: true, esquiva: true } as never, { rounds: 1, time: 99, shake: false } as unknown as Configuracoes);
      g.p2.barras = barras;
      const c = contador();
      desenharMundo(c.ctx, g as unknown as LeituraLuta, { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG }, new Efeitos(criarRng(1)), new CampoDePetalas(criarRng(2), 'luta'), criarRng(3), { hud: false });
      return c.tudo.filter((x) => Array.isArray(x) && x[0] === 'fillRect' && x[1] === -2400).length;
    };
    for (const id of GUARDIOES) {
      expect(veu(id, 1), `${id} fase 2`).toBe(2);
      expect(veu(id, 2), `${id} fase 1`).toBe(0);
    }
    expect(veu('zenon', 1), 'ZENON: a arena gr tem a sobreposição dela').toBe(0);
  });
});

describe('falas e poses dos guardiões na luta', () => {
  const luta = (phase: LeituraLuta['phase'], extra: Partial<LeituraLuta> = {}, rivalWins = 0) =>
    ({ phase, matchWinner: null, winsNeeded: 1, fighters: [{ wins: rivalWins }, { wins: 0 }], round: 1, t: 10, ...extra }) as unknown as Pick<LeituraLuta, 'phase' | 'matchWinner' | 'fighters' | 'winsNeeded'>;
  const chefe = (id: string, hp = 10): Pick<LutadorLeitura, 'id' | 'chefe' | 'indice' | 'hp'> => ({ id: id as IdLutador, chefe: true, indice: 1, hp });

  it('cada guardião fala na fase 2, ao vencer e ao cair por KO (a derrota só no KO final); o texto é o do Apolo', () => {
    for (const id of GUARDIOES) {
      const x = TEXTOS_DOS_CHEFOES[id]!.falas!;
      expect(falaDoChefe(luta('cena-chefe'), chefe(id)), `${id} fase2`).toBe(x.fase2);
      expect(falaDoChefe(luta('matchend', { matchWinner: 1 }), chefe(id)), `${id} vitoria`).toBe(x.vitoria);
      expect(falaDoChefe(luta('ko'), chefe(id, 0)), `${id} derrota no KO`).toBe(x.derrota);
      expect(falaDoChefe(luta('matchend', { matchWinner: 0 }), chefe(id, 0)), `${id} derrota no fim`).toBe(x.derrota);
      expect(falaDoChefe(luta('fight'), chefe(id)), `${id} luta`).toBeNull();
    }
  });

  it('o BAATAR guardião não repete a Dança no ROUND 1 (volta ao motor); o BAATAR jogável e o ZENON seguem como eram', () => {
    const l = { phase: 'intro', round: 1, t: 5 } as Pick<LeituraLuta, 'phase' | 'round' | 't'>;
    expect(poseDeApresentacao(l, { id: 'baatar' as IdLutador, state: 'idle', chefe: true })).toBeNull();
    expect(poseDeApresentacao(l, { id: 'baatar' as IdLutador, state: 'idle', chefe: false })).toBe('devekh0');
    expect(poseDeApresentacao(l, { id: 'zenon' as IdLutador, state: 'idle', chefe: true })).toBe('entrada2');
    expect(poseDeApresentacao(l, { id: 'aminu' as IdLutador, state: 'idle', chefe: true })).toBeNull();
  });
});

describe('a CENA da luta com a entrada de cada guardião: o motor e o lock-step não a veem', () => {
  const settings = (s: Partial<Configuracoes>): Partial<Configuracoes> => ({ provocacoes: 'desligadas', ...s });
  type Frames = { p1: InputFrame; p2: InputFrame };

  function montar(c2: IdLutador, set: Partial<Configuracoes> = {}, regras: Regras = REGRAS_PADRAO, run?: CampanhaArcade, chefe = true) {
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
      arte: arteFalsa(),
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
  const run = (c2: IdLutador): CampanhaArcade => ({ c1: 'hayato', etapas: [{ id: c2, chefe: true }], idx: 0, score: 0, continues: 3, diff: 0, cont: 0 });
  const foto = (g: Game): string =>
    JSON.stringify({ tick: g.tick, t: g.t, fase: g.phase, rng: (g as unknown as { rng: { estado?: () => unknown } }).rng.estado?.() ?? null, f: g.fighters.map((f) => [f.x, f.y, f.hp, f.en, f.state, f.barras, f.ficha, f.score, f.age]) });

  it('COMPLETA: game.tick fica em 0 por 270 update() e anda no 271º; a pose desenhada é a da batida em vigor', () => {
    for (const id of GUARDIOES) {
      const t = montar(id, {}, REGRAS_PADRAO, run(id));
      for (let i = 1; i <= 270; i++) {
        t.update();
        expect(t.game.tick, `${id} update ${i}`).toBe(0);
      }
      expect(t.cena.entrada.ativa, id).toBe(false);
      expect(t.cena.entrada.modo, id).toBe('completa');
      t.update();
      expect(t.game.tick, id).toBe(1);
    }
  });

  it('CURTA (continue, reinício ou preferência): 60 updates e a luta anda no 61º', () => {
    for (const id of GUARDIOES) {
      const r = run(id);
      r.entradaDoChefeVista = true;
      const t = montar(id, {}, REGRAS_PADRAO, r);
      for (let i = 1; i <= 60; i++) {
        t.update();
        expect(t.game.tick, `${id} update ${i}`).toBe(0);
      }
      expect(t.cena.entrada.modo, id).toBe('curta');
      t.update();
      expect(t.game.tick, id).toBe(1);
    }
  });

  it('pular: nenhum ataque antes do tick 10 pula; depois dele a luta anda em <= 8 updates', () => {
    for (const id of GUARDIOES) {
      const t = montar(id, {}, REGRAS_PADRAO, run(id));
      t.update(5);
      t.frames.p1 = { ...INPUT_VAZIO, lp: true };
      t.update(3);
      expect(t.cena.entrada.pulouEm, `${id} cedo`).toBeNull();
      t.frames.p1 = { ...INPUT_VAZIO };
      t.update(8);
      t.frames.p1 = { ...INPUT_VAZIO, hp: true };
      t.update();
      t.frames.p1 = { ...INPUT_VAZIO };
      expect(t.cena.entrada.pulouEm, id).not.toBeNull();
      let n = 0;
      while (t.game.tick === 0 && n < 30) {
        t.update();
        n++;
      }
      expect(n, id).toBeLessThanOrEqual(8);
    }
  });

  it('DETERMINISMO: COMPLETA, CURTA e pulada deixam tick, relógio, os dois lutadores e o RNG IGUAIS a uma luta sem entrada, depois de 400 ticks', () => {
    for (const id of GUARDIOES) {
      const ate = (t: ReturnType<typeof montar>, n: number, aoUpdate?: (i: number) => void): void => {
        let i = 0;
        while (t.game.tick < n && i < 5000) {
          i++;
          aoUpdate?.(i);
          t.update();
        }
        expect(t.game.tick, id).toBe(n);
      };
      const controle = montar(id, {}, { ...REGRAS_PADRAO, cinematica: false });
      ate(controle, 400);
      const alvo = foto(controle.game);
      const completa = montar(id, { cinematica: 'completa' }, REGRAS_PADRAO, run(id));
      ate(completa, 400);
      const curta = montar(id, { cinematica: 'curta' }, REGRAS_PADRAO, run(id));
      ate(curta, 400);
      const pulada = montar(id, { cinematica: 'completa' }, REGRAS_PADRAO, run(id));
      ate(pulada, 400, (i) => {
        pulada.frames.p1 = i === 12 ? { ...INPUT_VAZIO, lp: true } : { ...INPUT_VAZIO };
      });
      expect(foto(completa.game), `${id} completa`).toBe(alvo);
      expect(foto(curta.game), `${id} curta`).toBe(alvo);
      expect(foto(pulada.game), `${id} pulada`).toBe(alvo);
    }
  });

  it('o desenho: durante a entrada o HUD some e o cartão do guardião aparece; depois voltam o HUD e o "ROUND 1" e o título curto do HUD', () => {
    for (const id of GUARDIOES) {
      const t = montar(id, {}, REGRAS_PADRAO, run(id));
      t.update(200);
      const durante = gravador();
      (t.c as { ctx: unknown }).ctx = durante.ctx;
      t.cena.draw();
      const txt = durante.textos();
      const cartao = TEXTOS_DOS_CHEFOES[id]!.cartao!;
      expect(txt, id).toContain(cartao.nome);
      expect(txt, id).toContain(cartao.titulo);
      expect(txt, id).not.toContain('HAYATO');
      t.update(100);
      expect(t.cena.entrada.ativa, id).toBe(false);
      const depois = gravador();
      (t.c as { ctx: unknown }).ctx = depois.ctx;
      t.cena.draw();
      expect(depois.textos(), id).toContain('HAYATO');
      expect(depois.textos(), id).toContain('ROUND 1');
      expect(depois.textos(), id).toContain(`000000  CHEFÃO · ${TEXTOS_DOS_CHEFOES[id]!.tituloHud}`);
    }
  });

  it('sem roteiro (CAIO como chefe) e sem chefe (BAATAR comum) não há entrada; regras sem cinemática = nenhuma, para cada guardião', () => {
    for (const [c2, chefe] of [['caio', true], ['baatar', false], ['aminu', false]] as const) {
      const t = montar(c2, {}, REGRAS_PADRAO, run(c2), chefe);
      t.update();
      expect(t.cena.entrada.ativa, `${c2} chefe=${String(chefe)}`).toBe(false);
      expect(t.game.tick, c2).toBe(1);
    }
    for (const id of GUARDIOES) {
      const t = montar(id, { cinematica: 'completa' }, { ...REGRAS_PADRAO, cinematica: false }, run(id));
      t.update();
      expect(t.cena.entrada.ativa, id).toBe(false);
    }
  });
});

describe('telas: aviso, VS, seleção e desbloqueio', () => {
  /** O elenco de produção (dados reais) com a arte falsa: as telas desenham de verdade num contexto que grava. */
  const mundoReal = (): Mundo =>
    ({
      rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
      elenco,
      arte: arteFalsa(),
      game: new Game({ lutadores: prod, rng: criarRng(5) }),
      efeitos: new Efeitos(criarRng(1)),
      petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
    }) as unknown as Mundo;
  const UI = (regras: Regras = REGRAS_PADRAO) => {
    const t = navegadorFalso({}, regras);
    t.ui.pronto(mundoReal());
    return t;
  };
  const argsDe = (g: string) => ({ cfg: { mode: 'arcade' as const, c1: 'hayato' as IdLutador, c2: g as IdLutador, cpu: 1, esquiva: true, chefe: true }, run: { c1: 'hayato' as IdLutador, etapas: [{ id: g as IdLutador, chefe: true }], idx: 0, score: 0, continues: 3, diff: 1, cont: 0 } });

  it('aviso: cada guardião mostra o aviso e o rodapé do Apolo (e não o rodapé do ZENON); o ZENON mostra o de sempre, e o de revanche depois de derrotado', () => {
    for (const g of GUARDIOES) {
      const t = UI();
      const c = t.ui.cenas.chefe as CenaChefe;
      c.enter(argsDe(g) as never);
      expect(c.textoDoAviso(), g).toEqual({ aviso: TEXTOS_DOS_CHEFOES[g]!.aviso, rodape: TEXTOS_DOS_CHEFOES[g]!.avisoRodape });
      t.ui.t = 100;
      c.draw();
      const txt = t.g.textos();
      expect(txt, g).toContain(TEXTOS_DOS_CHEFOES[g]!.aviso![0]);
      expect(txt, g).toContain(TEXTOS_DOS_CHEFOES[g]!.avisoRodape);
      expect(txt, g).not.toContain('A última luta do torneio: 1 round, 2 barras de vida.');
    }
    const z = UI();
    const c = z.ui.cenas.chefe as CenaChefe;
    c.enter(argsDe('zenon') as never);
    expect(c.textoDoAviso()).toEqual({ aviso: ['O ANFITRIÃO', 'ESTÁ À SUA ESPERA'], rodape: 'A última luta do torneio: 1 round, 2 barras de vida.' });
    z.persist.prog = { ...progressoVazio(), desbloqueados: ['zenon' as IdLutador], chefesDerrotados: ['zenon'], chefeDerrotado: true };
    expect(derrotouOChefe(z.persist.prog, 'zenon')).toBe(true);
    expect(c.textoDoAviso()).toEqual({ aviso: ['O ANFITRIÃO', 'QUER REVANCHE'], rodape: 'A casa reabriu para você: 1 round, 2 barras de vida.' });
    const sem = UI();
    const cs = sem.ui.cenas.chefe as CenaChefe;
    cs.enter(argsDe('caio') as never);
    expect(cs.textoDoAviso().aviso).toEqual(['UM DESAFIANTE', 'SE APROXIMA']);
  });

  it('VS: o rótulo vem do dado ("A GUARDIÃ" para as 3 mulheres, "O GUARDIÃO", "O ANFITRIÃO") e a luta de chefe NÃO diz "Vença N rounds"', () => {
    const rotulos: Record<string, string> = { aminu: 'ARCADE — O GUARDIÃO', centella: 'ARCADE — A GUARDIÃ', camille: 'ARCADE — A GUARDIÃ', nila: 'ARCADE — A GUARDIÃ', baatar: 'ARCADE — O GUARDIÃO', zenon: 'ARCADE — O ANFITRIÃO' };
    for (const [g, esperado] of Object.entries(rotulos)) {
      const t = UI();
      const v = t.ui.cenas.vs as CenaVs;
      v.enter(argsDe(g) as never);
      t.ui.t = 100;
      v.draw();
      const txt = t.g.textos();
      expect(txt, g).toContain(esperado);
      expect(txt.some((s) => s.startsWith('Vença')), g).toBe(false);
    }
    // luta comum (não é de chefe): o texto de sempre continua
    const c = UI();
    const v = c.ui.cenas.vs as CenaVs;
    v.enter({ cfg: { mode: 'versus', c1: 'hayato', c2: 'caio', cpu: null, esquiva: true } } as never);
    c.ui.t = 100;
    v.draw();
    expect(c.g.textos().some((s) => s.startsWith('Vença 2 rounds'))).toBe(true);
  });

  it('seleção: o PRÓXIMO guardião e os outros têm linhas diferentes e sem nome nem gênero; o ZENON diz que só recebe quem traz os Cinco Selos', () => {
    const t = UI();
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: 'arcade' } as never);
    expect(s.textosDeCasaFechada('aminu' as IdLutador)).toEqual({ nome: '???', linhas: [...TEXTOS_COMUNS.selecao.proximo] });
    expect(s.textosDeCasaFechada('nila' as IdLutador)).toEqual({ nome: '???', linhas: [...TEXTOS_COMUNS.selecao.outros] });
    expect(s.textosDeCasaFechada('zenon' as IdLutador)).toEqual({ nome: '???', linhas: [...TEXTOS_COMUNS.selecao.anfitriao] });
    // com o AMINU liberado o próximo passa a ser a CENTELLA
    t.persist.prog = { ...progressoVazio(), desbloqueados: ['aminu' as IdLutador] };
    expect(s.textosDeCasaFechada('centella' as IdLutador).linhas).toEqual([...TEXTOS_COMUNS.selecao.proximo]);
    expect(s.textosDeCasaFechada('camille' as IdLutador).linhas).toEqual([...TEXTOS_COMUNS.selecao.outros]);
    // a regra antiga (chave desligada) mantém os textos de antes
    const antiga = UI({ ...REGRAS_PADRAO, chefesDaFila: false });
    const sa = antiga.ui.cenas.select as CenaSelect;
    sa.enter({ mode: 'arcade' } as never);
    expect(sa.textosDeCasaFechada('aminu' as IdLutador).linhas).toEqual(['Zere o ARCADE para liberar.', 'É o próximo a ser liberado.']);
    expect(sa.textosDeCasaFechada('zenon' as IdLutador).linhas).toEqual(['Aparece no fim do ARCADE.', 'Derrote-o para liberar.']);
  });

  it('desbloqueio: "<NOME> SE JUNTA A VOCÊ!" e o epílogo de 3 linhas no lugar da descrição; o ZENON "O ANFITRIÃO SE RENDE"; a reserva "SELO ENTREGUE!" se o título não couber', () => {
    for (const g of GUARDIOES) {
      const t = UI();
      const d = t.ui.cenas.desbloqueio as CenaDesbloqueio;
      d.enter({ novos: [g] } as never);
      t.ui.t = 100;
      d.draw();
      const txt = t.g.textos();
      const nome = (t.ui.m.elenco[g].ch as { name: string }).name;
      expect(txt, g).toContain(`${nome} SE JUNTA A VOCÊ!`);
      const ep = TEXTOS_DOS_CHEFOES[g]!.epilogo;
      expect(txt, g).toContain(ep.quem);
      expect(txt, g).toContain(ep.porque);
      expect(txt, g).toContain(`“${ep.convite}”`);
      expect(txt, g).not.toContain('NOVO LUTADOR LIBERADO!');
    }
    const z = UI();
    const d = z.ui.cenas.desbloqueio as CenaDesbloqueio;
    d.enter({ novos: ['zenon'] } as never);
    z.ui.t = 100;
    d.draw();
    expect(z.g.textos()).toContain('O ANFITRIÃO SE RENDE');
    expect(z.g.textos()).toContain(TEXTOS_DOS_CHEFOES['zenon']!.epilogo.convite.length > 0 ? `“${TEXTOS_DOS_CHEFOES['zenon']!.epilogo.convite}”` : '');
    // medida de verdade no navegador: o dublê mede 10 px por texto; um texto "largo demais" cai na reserva
    const largo = UI();
    (largo.c as { ctx: unknown }).ctx = new Proxy({}, { get: (_, n: string) => (n === 'measureText' ? () => ({ width: 5000 }) : () => undefined) });
    const dl = largo.ui.cenas.desbloqueio as CenaDesbloqueio;
    expect(dl.titulo('centella', 'CENTELLA')).toBe('SELO ENTREGUE!');
    expect(d.titulo('centella', 'CENTELLA')).toBe('CENTELLA SE JUNTA A VOCÊ!');
  });

  it('desbloqueio com a regra antiga (chave desligada): o cartão de sempre, "NOVO LUTADOR LIBERADO!" e a descrição, sem epílogo', () => {
    const t = UI({ ...REGRAS_PADRAO, chefesDaFila: false });
    const d = t.ui.cenas.desbloqueio as CenaDesbloqueio;
    d.enter({ novos: ['aminu'] } as never);
    t.ui.t = 100;
    d.draw();
    expect(t.g.textos()).toContain('NOVO LUTADOR LIBERADO!');
    expect(t.g.textos().some((s) => s.includes('SE JUNTA A VOCÊ'))).toBe(false);
  });

  it('a escada de rivais desconta o chefão final E o guardião da vez: 10 lutadores = 7 candidatos e a escada continua com 5', () => {
    expect(rivaisDaEscada(REGRAS_PADRAO)).toBe(5);
    const poucos: Regras = { ...REGRAS_PADRAO, roster: REGRAS_PADRAO.roster.slice(0, 6) };
    // 6 lutadores - o final (nem está no roster cortado) - o guardião da vez - o jogador = 4; com a regra antiga seriam 5
    expect(rivaisDaEscada(poucos)).toBe(Math.min(5, 6 - 1 - 1));
    expect(rivaisDaEscada({ ...poucos, chefesDaFila: false })).toBe(Math.min(5, 6 - 1));
  });
});
