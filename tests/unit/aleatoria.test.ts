import { describe, expect, it } from 'vitest';
import type { IdLutador } from '../../src/core/contratos';
import { criarRng, type Rng } from '../../src/core/rng';
import { aplicarVitoriaArcade, progressoVazio, REGRAS_PADRAO } from '../../src/meta';
import type { CenaSelect } from '../../src/ui/cenas/select';
import type { Mundo } from '../../src/ui/contexto';
import {
  embaralhar,
  PASSOS_DA_ROLAGEM,
  passoDaRolagem,
  rostoEmRepouso,
  rostosDaRolagem,
  sortear,
  TICKS_DA_REVELACAO,
  TICKS_DA_ROLAGEM,
  TICKS_POR_ROSTO_EM_REPOUSO,
} from '../../src/ui/aleatoria';
import { regrasDeQuatro } from '../../src/ui/dev-expansao';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import type { Elenco } from '../../src/assets/elenco';
import { mundoFalso, navegadorFalso } from './_ui';

// elenco de produção (com a arte falsa): o painel do lutador sorteado precisa dos dados de verdade para desenhar
const prod = montarElenco();
const IMG0 = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte0 = { pronta: true, imagemDe: () => IMG0, silhuetaDe: () => IMG0, retrato: () => null };
const elencoReal = Object.fromEntries(Object.entries(prod).map(([k, ch]) => [k, { ch, arte: arte0 }])) as unknown as Elenco;

/*
 * A casa ALEATÓRIA ("RANDOM") da seleção. A lógica pura (aleatoria.ts) e a cena (select.ts) com o navegador falso. O desenho em pixels, o toque no
 * celular e o movimento reduzido de verdade estão em tests/e2e/selecao-aleatoria.spec.ts.
 */
const id = (s: string): IdLutador => s as IdLutador;
const QUATRO = ['hayato', 'wei-long', 'min-ji', 'caio'].map(id);
const ZENON = id('zenon');

describe('lógica pura do sorteio', () => {
  it('embaralhar devolve uma permutação, não mexe na lista de entrada e repete com a mesma semente', () => {
    const lista = ['a', 'b', 'c', 'd', 'e', 'f'];
    const copia = [...lista];
    const r = embaralhar(lista, criarRng(3));
    expect(lista).toEqual(copia);
    expect([...r].sort()).toEqual(copia);
    expect(embaralhar(lista, criarRng(3))).toEqual(r);
    expect(embaralhar(lista, criarRng(4))).not.toEqual(r);
  });

  it('sortear escolhe SÓ entre os elegíveis, alcança todos, e lista vazia dá null sem consumir o rng', () => {
    const rng = criarRng(11);
    const antes = rng.estado();
    expect(sortear([], rng)).toBeNull();
    expect(rng.estado()).toBe(antes);
    const vistos = new Set<string>();
    for (let i = 0; i < 400; i++) vistos.add(sortear(QUATRO, rng) ?? 'nulo');
    expect([...vistos].sort()).toEqual([...QUATRO].sort());
  });

  it('a rolagem tem um rosto por passo, todos da ordem dada, e o ÚLTIMO é o sorteado (qualquer posição e qualquer tamanho de elenco)', () => {
    for (const n of [1, 2, 4, 9, 10]) {
      const ordem = Array.from({ length: n }, (_, i) => id(`l${i}`));
      for (const escolhido of ordem) {
        const r = rostosDaRolagem(ordem, escolhido);
        expect(r, `${n}/${escolhido}`).toHaveLength(PASSOS_DA_ROLAGEM.length);
        expect(r.at(-1)).toBe(escolhido);
        for (const x of r) expect(ordem).toContain(x);
      }
    }
  });

  it('a rolagem anda pela ordem embaralhada em sequência (cada rosto é o seguinte do anterior na ordem)', () => {
    const ordem = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l'].map(id);
    const r = rostosDaRolagem(ordem, id('e'));
    for (let k = 1; k < r.length; k++) expect(ordem.indexOf(r[k]!), `passo ${k}`).toBe((ordem.indexOf(r[k - 1]!) + 1) % ordem.length);
  });

  it('o passo da rolagem muda nas fronteiras exatas (3,3,3,3,4,4,5,5,6,7 = 43 ticks) e o último passo vale para sempre', () => {
    expect(TICKS_DA_ROLAGEM).toBe(43);
    expect([0, 2, 3, 5, 6, 8, 9, 11, 12, 15, 16, 19, 20, 24, 25, 29, 30, 35, 36, 42].map(passoDaRolagem)).toEqual([0, 0, 1, 1, 2, 2, 3, 3, 4, 4, 5, 5, 6, 6, 7, 7, 8, 8, 9, 9]);
    expect(passoDaRolagem(43)).toBe(9);
    expect(passoDaRolagem(9999)).toBe(9);
    // cada passo é mais lento que o anterior (a roleta desacelera)
    for (let k = 1; k < PASSOS_DA_ROLAGEM.length; k++) expect(PASSOS_DA_ROLAGEM[k]!).toBeGreaterThanOrEqual(PASSOS_DA_ROLAGEM[k - 1]!);
    expect(TICKS_DA_REVELACAO).toBe(30);
  });

  it('o rosto em repouso troca a cada 12 ticks, passa por TODOS na ordem e nunca devolve quem não está na lista', () => {
    const ordem = ['a', 'b', 'c'].map(id);
    expect(TICKS_POR_ROSTO_EM_REPOUSO).toBe(12);
    expect([0, 11, 12, 23, 24, 36].map((t) => rostoEmRepouso(ordem, t))).toEqual(['a', 'a', 'b', 'b', 'c', 'a']);
    expect(rostoEmRepouso([], 5)).toBeNull();
  });
});

describe('a casa aleatória na cena de seleção', () => {
  function select(opcoes: { prog?: ReturnType<typeof progressoVazio>; modo?: 'versus' | 'cpu' | 'arcade' | 'training'; semente?: number; reduzir?: boolean; regras?: typeof REGRAS_PADRAO; real?: boolean } = {}) {
    const { prog = progressoVazio(), modo = 'arcade', semente = 5, reduzir = false, regras = REGRAS_PADRAO, real = false } = opcoes;
    const t = navegadorFalso({}, regras);
    t.persist.prog = prog;
    const c = t.c as { sorteioDaSelecao?: Rng; reduzirMovimento?: () => boolean };
    c.sorteioDaSelecao = criarRng(semente);
    if (reduzir) c.reduzirMovimento = () => true;
    const IMG = { tag: 'img' } as unknown as CanvasImageSource;
    t.ui.pronto({ ...mundoFalso(), ...(real ? { elenco: elencoReal } : {}), rec: { cenarioPadrao: IMG, vinheta: IMG } } as unknown as Mundo);
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: modo });
    const ir: string[] = [];
    t.ui.go = ((n: string, a: unknown) => ir.push(`${n} ${JSON.stringify(a)}`)) as never;
    return { ...t, s, ir };
  }
  const ticks = (s: CenaSelect, n: number): void => {
    for (let i = 0; i < n; i++) s.update();
  };

  it('só a grade de 10 tem a casa aleatória; nas de 4 e 9 casas o layout e a navegação são os de sempre', () => {
    expect(select().s.aleatoria).toBe(10);
    const q = select({ regras: regrasDeQuatro() });
    expect(q.s.aleatoria).toBe(-1);
    q.s.cur[0] = 3;
    q.s.key('ArrowDown');
    expect(q.s.cur[0]).toBe(1);
    q.s.click(374, 378); // onde ficaria a casa aleatória na grade de 10: nada
    expect(q.s.rolando).toEqual([null, null]);
  });

  it('Enter na casa aleatória NÃO escolhe na hora: sorteia, a roleta gira, pousa no sorteado (cursor + som), mostra por 30 ticks e só então trava', () => {
    const { s, audio, ir } = select();
    s.cur[0] = 10;
    s.key('Enter');
    const r = s.rolando[0]!;
    expect(r).not.toBeNull();
    expect(s.lock[0]).toBe(false);
    expect(s.cur[0]).toBe(10); // ainda na casa aleatória: a roleta está girando
    expect(s.elegiveis()).toContain(r.id);
    ticks(s, TICKS_DA_ROLAGEM - 1);
    expect(s.cur[0]).toBe(10);
    expect(r.pousouEm).toBeNull();
    expect(audio.nomes()).not.toContain('uiSelect');
    ticks(s, 1);
    expect(r.pousouEm).toBe(TICKS_DA_ROLAGEM);
    expect(s.grade[s.cur[0]]).toBe(r.id); // o cursor foi para a casa do sorteado
    expect(s.flash[0]).toBeGreaterThan(0);
    expect(audio.nomes().filter((n) => n === 'uiSelect')).toHaveLength(1);
    expect(s.lock[0]).toBe(false); // mostrando o escolhido: ainda não vale
    ticks(s, TICKS_DA_REVELACAO - 1);
    expect(s.lock[0]).toBe(false);
    expect(ir).toEqual([]);
    ticks(s, 1);
    expect(s.lock[0]).toBe(true);
    expect(s.rolando[0]).toBeNull();
    expect(s.grade[s.pick[0]]).toBe(r.id);
    expect(audio.nomes().filter((n) => n === 'uiSelect')).toHaveLength(1); // o som de seleção toca uma vez só (no pouso)
    ticks(s, 60);
    expect(ir[0]).toMatch(new RegExp(`^diff \\{"mode":"arcade","c1":"${r.id}"`));
  });

  it('o sorteio é determinístico pela semente do RNG da seleção e sai do conjunto dos LIBERADOS (progresso vazio = os 4 de fábrica), alcançando todos', () => {
    const sorteados = (semente: number, n: number): string[] => {
      const { s } = select({ semente });
      const r: string[] = [];
      for (let i = 0; i < n; i++) {
        s.rolando = [null, null];
        s.lock = [false, false];
        s.cur[0] = 10;
        s.key('Enter');
        r.push(s.rolando[0]!.id);
      }
      return r;
    };
    expect(sorteados(8, 30)).toEqual(sorteados(8, 30));
    expect(sorteados(8, 30)).not.toEqual(sorteados(9, 30));
    const vistos = new Set(sorteados(1, 400));
    expect([...vistos].sort()).toEqual([...QUATRO].sort()); // nunca um travado nem o ZENON oculto
  });

  it('o ZENON só pode sair no sorteio depois de derrotado (e então sai)', () => {
    const livre = select({ prog: aplicarVitoriaArcade(progressoVazio(), { derrotouChefe: true }, REGRAS_PADRAO).prog });
    expect(livre.s.elegiveis()).toContain(ZENON);
    const vistos = new Set<string>();
    for (let i = 0; i < 600; i++) {
      livre.s.rolando = [null, null];
      livre.s.cur[0] = 10;
      livre.s.key('Enter');
      vistos.add(livre.s.rolando[0]!.id);
    }
    expect(vistos.has('zenon')).toBe(true);
    expect(select().s.elegiveis()).not.toContain(ZENON);
  });

  it('o sorteio NÃO consome o RNG da luta nem o visual nem o rngUI (ordem dos rivais): só o RNG próprio da seleção', () => {
    const t = select({ modo: 'arcade', semente: 21 });
    const antes = { visual: t.c.rngVisual.estado(), ui: t.c.rngUI.estado(), proprio: (t.c as { sorteioDaSelecao: Rng }).sorteioDaSelecao.estado() };
    for (let i = 0; i < 20; i++) {
      t.s.rolando = [null, null];
      t.s.cur[0] = 10;
      t.s.key('Enter');
      ticks(t.s, 5);
    }
    expect(t.c.rngVisual.estado()).toBe(antes.visual);
    expect(t.c.rngUI.estado()).toBe(antes.ui);
    expect((t.c as { sorteioDaSelecao: Rng }).sorteioDaSelecao.estado()).not.toBe(antes.proprio);
  });

  it('sem o RNG próprio (contexto antigo) cai no rngUI, nunca no Math.random', () => {
    const t = navegadorFalso({}, REGRAS_PADRAO);
    const IMG = { tag: 'img' } as unknown as CanvasImageSource;
    t.ui.pronto({ ...mundoFalso(), rec: { cenarioPadrao: IMG, vinheta: IMG } } as unknown as Mundo);
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode: 'arcade' });
    const antes = t.c.rngUI.estado();
    s.cur[0] = 10;
    s.key('Enter');
    expect(t.c.rngUI.estado()).not.toBe(antes);
    expect(QUATRO).toContain(s.rolando[0]!.id);
  });

  it('com movimento reduzido não há roleta: pousa no ato (sem rostos para girar), mostra 30 ticks e trava', () => {
    const { s, ir } = select({ reduzir: true });
    s.cur[0] = 10;
    s.key('Enter');
    const r = s.rolando[0]!;
    expect(r.rostos).toEqual([]);
    expect(r.pousouEm).toBe(0);
    expect(s.grade[s.cur[0]]).toBe(r.id);
    expect(s.lock[0]).toBe(false);
    ticks(s, TICKS_DA_REVELACAO - 1);
    expect(s.lock[0]).toBe(false);
    ticks(s, 1);
    expect(s.lock[0]).toBe(true);
    ticks(s, 60);
    expect(ir[0]).toMatch(/^diff /);
  });

  it('enquanto sorteia: setas, Enter e mouse de quem sorteia são ignorados; X cancela e devolve o controle', () => {
    const { s, ir, audio } = select();
    s.cur[0] = 10;
    s.key('Enter');
    const r = s.rolando[0]!;
    s.key('ArrowUp');
    s.key('ArrowLeft');
    s.hover(400, 100);
    s.click(400, 100);
    s.key('Enter');
    expect(s.cur[0]).toBe(10);
    expect(s.rolando[0]).toBe(r);
    expect(s.lock[0]).toBe(false);
    ticks(s, 10);
    s.key('x');
    expect(s.rolando[0]).toBeNull();
    expect(audio.nomes()).toContain('uiBack');
    expect(ir).toEqual([]); // cancelar o sorteio não sai da tela
    ticks(s, 200);
    expect(s.lock[0]).toBe(false); // e nada trava depois do cancelamento
    s.key('ArrowUp'); // o cursor volta a andar
    expect(s.cur[0]).toBe(6);
  });

  it('versus: cada jogador sorteia o seu, independentes; com os dois travados a tela segue para o VS com os dois sorteados', () => {
    const { s, ir } = select({ modo: 'versus', semente: 2 });
    s.cur[0] = 10;
    s.cur[1] = 10;
    s.key('Enter'); // P1
    ticks(s, 7);
    s.key('j'); // P2 entra depois
    const [r1, r2] = [s.rolando[0]!, s.rolando[1]!];
    expect(r1).not.toBeNull();
    expect(r2).not.toBeNull();
    expect(r1.t).toBeGreaterThan(r2.t);
    ticks(s, TICKS_DA_ROLAGEM + TICKS_DA_REVELACAO);
    expect(s.lock).toEqual([true, true]);
    ticks(s, 70);
    const m = /^vs \{"cfg":\{"mode":"versus","c1":"([^"]+)","c2":"([^"]+)"/.exec(ir[0] ?? '');
    expect(m).not.toBeNull();
    expect([m![1], m![2]]).toEqual([r1.id, r2.id]);
  });

  it('versus: P2 anda enquanto P1 sorteia', () => {
    const { s } = select({ modo: 'versus' });
    s.cur[0] = 10;
    s.cur[1] = 0;
    s.key('Enter');
    s.key('d');
    expect(s.cur[1]).toBe(1);
    expect(s.rolando[0]).not.toBeNull();
  });

  it('CPU/treino: o sorteio do 1º jogador leva à etapa do rival depois da revelação; o rival também pode sortear', () => {
    for (const modo of ['cpu', 'training'] as const) {
      const { s, ir } = select({ modo });
      s.cur[0] = 10;
      s.key('Enter');
      ticks(s, TICKS_DA_ROLAGEM + TICKS_DA_REVELACAO);
      expect(s.step, modo).toBe(2);
      expect(s.lock[0], modo).toBe(true);
      const primeiro = s.grade[s.pick[0]];
      s.cur[1] = 10;
      s.key('Enter');
      ticks(s, TICKS_DA_ROLAGEM + TICKS_DA_REVELACAO + 60);
      const m = /"c1":"([^"]+)","c2":"([^"]+)"/.exec(ir[0] ?? '');
      expect(m, modo).not.toBeNull();
      expect(m![1], modo).toBe(primeiro);
      expect(QUATRO, modo).toContain(m![2]);
    }
  });

  it('mouse e toque: o quadradinho (e a folga de 4 px dele) põe o cursor nele e confirma; o vão até a honra e o painel não', () => {
    const { s } = select();
    s.cur[0] = 0;
    s.hover(374, 378); // meio da casa (352..396 x 356..400)
    expect(s.cur[0]).toBe(10);
    s.cur[0] = 0;
    s.hover(349, 378); // a folga da esquerda (348..352)
    expect(s.cur[0]).toBe(10);
    s.cur[0] = 0;
    s.hover(402, 378); // já é a honra (404 em diante tem a casa de honra; 400..404 é o vão)
    expect(s.cur[0]).toBe(0);
    s.hover(420, 378);
    expect(s.cur[0]).toBe(9);
    s.cur[0] = 0;
    s.click(374, 378);
    expect(s.cur[0]).toBe(10);
    expect(s.rolando[0]).not.toBeNull();
  });

  it('o desenho: sem erro em repouso, girando, no pouso e com movimento reduzido; o painel diz ALEATÓRIO enquanto o cursor está na casa e passa ao sorteado no pouso', () => {
    for (const reduzir of [false, true]) {
      const t = select({ reduzir, real: true });
      const quadro = (): string[] => {
        const antes = t.g.chamadas.length;
        t.ui.t++;
        t.s.draw();
        return t.g.chamadas.slice(antes).filter(([n]) => n === 'fillText').map(([, x]) => String(x));
      };
      t.s.cur[0] = 10;
      const repouso = quadro();
      expect(repouso, `repouso ${reduzir}`).toContain('ALEATÓRIO');
      expect(repouso).toContain('VOCÊ');
      t.s.key('Enter');
      const sorteado = t.s.rolando[0]!.id;
      const nome = elencoReal[sorteado]!.ch.name;
      if (!reduzir) {
        ticks(t.s, 10);
        expect(quadro(), 'girando').toContain('ALEATÓRIO');
        ticks(t.s, TICKS_DA_ROLAGEM);
      }
      const pousou = quadro();
      expect(pousou, `pousou ${reduzir}`).not.toContain('ALEATÓRIO');
      expect(pousou).toContain(nome);
      expect(pousou).toContain('VOCÊ');
    }
  });
});
