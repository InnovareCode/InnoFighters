import { describe, expect, it } from 'vitest';
import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import {
  criarMemoriaDeFalas,
  escolherFala,
  falasDe,
  listaDeAbertura,
  listaDeRodada,
  listaDeVitoria,
  provocacoesLigadas,
  quemFalaNaRodada,
  sortearFala,
  trocarRival,
  type Fala,
  type FalasDeProvocacao,
} from '../../src/data/provocacoes';

type Escolher = (lista: readonly Fala[], rng?: { inteiro(n: number): number }, ultima?: Fala) => Fala;

/** Oráculo da regra "não repete a última fala": 2000 sorteios encadeados, para listas de 2 a 6 itens, nunca repetem em seguida. */
function exigirSemRepeticao(escolher: Escolher): void {
  for (let n = 2; n <= 6; n++) {
    const lista = Array.from({ length: n }, (_, i) => `fala ${i}`);
    const rng = criarRng(1000 + n);
    let ultima: string | undefined;
    const vistas = new Set<string>();
    for (let i = 0; i < 2000; i++) {
      const f = escolher(lista, rng, ultima);
      if (!lista.includes(f)) throw new Error(`fora da lista: ${f}`);
      if (f === ultima) throw new Error(`repetiu "${f}" em ${n} itens`);
      vistas.add(f);
      ultima = f;
    }
    if (vistas.size !== n) throw new Error(`só usou ${vistas.size} de ${n} falas (viés)`);
    // uniformidade: dada a última, as OUTRAS n-1 saem com a mesma frequência (±15%)
    for (const u of lista) {
      const cont = new Map<string, number>();
      const amostra = 1200;
      for (let i = 0; i < amostra; i++) {
        const f = escolher(lista, rng, u);
        cont.set(f, (cont.get(f) ?? 0) + 1);
      }
      const esperado = amostra / (n - 1);
      for (const o of lista.filter((x) => x !== u)) {
        const razao = (cont.get(o) ?? 0) / esperado;
        if (razao < 0.85 || razao > 1.15) throw new Error(`viés: "${o}" saiu ${(razao * 100).toFixed(0)}% do esperado depois de "${u}"`);
      }
    }
  }
}

describe('escolherFala: não repete a mesma fala duas vezes seguidas', () => {
  it('a implementação real passa no oráculo (listas de 2 a 6, 2000 sorteios cada)', () => {
    expect(() => exigirSemRepeticao(escolherFala)).not.toThrow();
  });

  // MUTAÇÃO: cada mutante quebra UMA parte da regra e o oráculo precisa reprovar. Se algum sobreviver, o teste acima não protege nada.
  const mutantes: Array<[string, Escolher]> = [
    ['sem a regra (sorteia na lista inteira)', (l, r) => l[r ? r.inteiro(l.length) : 0] as Fala],
    ['compara com o ÍNDICE errado (filtra sempre o 1º)', (l, r, u) => { const c = u === undefined ? l : l.filter((f) => f !== l[0]); return c[r ? r.inteiro(c.length) : 0] as Fala; }],
    ['filtra só quando a lista tem MAIS de 2', (l, r, u) => { const c = l.length > 2 && u !== undefined ? l.filter((f) => f !== u) : l; return c[r ? r.inteiro(c.length) : 0] as Fala; }],
    ['sorteia no tamanho original e corrige o índice repetido para o próximo (viés: nunca usa a última da lista)', (l, r, u) => { const c = u === undefined ? l : l.filter((f) => f !== u); return c[Math.min(r ? r.inteiro(l.length) : 0, c.length - 1)] as Fala; }],
    ['sempre a primeira candidata (ignora o rng)', (l, _r, u) => (l.filter((f) => f !== u)[0] ?? l[0]) as Fala],
  ];
  it.each(mutantes)('o oráculo reprova o mutante: %s', (_nome, mutante) => {
    expect(() => exigirSemRepeticao(mutante)).toThrow();
  });

  it('lista de 1 só: repete (não há alternativa) e não trava', () => {
    expect(escolherFala(['única'], criarRng(1), 'única')).toBe('única');
  });

  it('lista vazia lança (a validação do boot impede de chegar aqui)', () => {
    expect(() => escolherFala([], criarRng(1))).toThrow(/vazia/);
  });

  it('consome EXATAMENTE um número do rng por escolha, haja ou não repetição a evitar (sequência previsível)', () => {
    const a = criarRng(77);
    const b = criarRng(77);
    escolherFala(['x', 'y', 'z'], a, 'x');
    escolherFala(['x'], a, 'x');
    escolherFala(['x', 'y'], a, undefined);
    b.proximo();
    b.proximo();
    b.proximo();
    expect(a.estado()).toBe(b.estado());
  });

  it('sem rng (testes antigos): determinístico, e ainda assim não repete a última', () => {
    expect(escolherFala(['a', 'b', 'c'])).toBe('a');
    expect(escolherFala(['a', 'b', 'c'], undefined, 'a')).toBe('b');
    expect(escolherFala(['a', 'b'], undefined, 'b')).toBe('a');
  });

  it('mesma semente = mesma sequência (reprodutível)', () => {
    const rodar = (): string[] => {
      const rng = criarRng(42);
      const lista = ['a', 'b', 'c', 'd'];
      let u: string | undefined;
      return Array.from({ length: 30 }, () => (u = escolherFala(lista, rng, u)));
    };
    expect(rodar()).toEqual(rodar());
  });
});

describe('trocarRival', () => {
  it('troca todas as ocorrências do token e deixa o resto', () => {
    expect(trocarRival('Oi {rival}, {rival}!', 'CAIO')).toBe('Oi CAIO, CAIO!');
    expect(trocarRival('sem token', 'CAIO')).toBe('sem token');
  });
  it('um nome com padrões especiais de substituição (`$&`, `$1`) entra literal', () => {
    expect(trocarRival('Oi {rival}', '$&-$1')).toBe('Oi $&-$1');
  });
});

const BASE: FalasDeProvocacao = {
  abertura: ['A1', 'A2', 'A3'],
  revanche: ['R1', 'R2'],
  vitoria: ['V1', 'V2', 'V3'],
};
const RICA: FalasDeProvocacao = {
  ...BASE,
  decisivo: ['D1'],
  vitoriaPerfeita: ['P1'],
  vitoriaPorTempo: ['T1'],
  contra: { caio: { abertura: ['CA1'], vitoria: ['CV1'] }, aminu: { vitoria: ['AV1'] } },
};

describe('precedência das listas (§7.1)', () => {
  it('abertura: contra[rival].abertura > abertura; contra só com vitoria cai na genérica', () => {
    expect(listaDeAbertura(RICA, 'caio')).toEqual({ origem: 'contra.abertura', lista: ['CA1'] });
    expect(listaDeAbertura(RICA, 'aminu')).toEqual({ origem: 'abertura', lista: BASE.abertura });
    expect(listaDeAbertura(RICA, 'hayato').origem).toBe('abertura');
    expect(listaDeAbertura(BASE, 'caio').origem).toBe('abertura');
  });

  it('rodada: decisivo só quando o round é decisivo E a lista existe; senão revanche', () => {
    expect(listaDeRodada(RICA, true)).toEqual({ origem: 'decisivo', lista: ['D1'] });
    expect(listaDeRodada(RICA, false).origem).toBe('revanche');
    expect(listaDeRodada(BASE, true).origem).toBe('revanche');
    expect(listaDeRodada({ ...BASE, decisivo: [] }, true).origem).toBe('revanche');
  });

  it('vitória: contra > perfeita > por tempo > genérica, na ordem exata', () => {
    const todas = { perdedor: 'caio' as IdLutador, perfeita: true, porTempo: true };
    expect(listaDeVitoria(RICA, todas).origem).toBe('contra.vitoria');
    expect(listaDeVitoria(RICA, { ...todas, perdedor: 'hayato' }).origem).toBe('vitoriaPerfeita');
    expect(listaDeVitoria(RICA, { perdedor: 'hayato', perfeita: false, porTempo: true }).origem).toBe('vitoriaPorTempo');
    expect(listaDeVitoria(RICA, { perdedor: 'hayato' }).origem).toBe('vitoria');
    expect(listaDeVitoria(RICA, { perdedor: 'aminu', perfeita: true }).origem).toBe('contra.vitoria');
    // listas opcionais ausentes: cai na genérica mesmo com a flag ligada
    expect(listaDeVitoria(BASE, { perdedor: 'caio', perfeita: true, porTempo: true }).origem).toBe('vitoria');
  });
});

describe('sortearFala (com a tabela real pt-BR)', () => {
  it('troca {rival} pelo nome e devolve o modelo e a origem', () => {
    const r = sortearFala({ tipo: 'abertura', falante: 'zenon', rival: 'wei-long', nomeRival: 'WEI LONG' });
    expect(r.origem).toBe('contra.abertura'); // o ZENON tem abertura dirigida a cada um dos 10
    expect(r.texto).toBe(r.modelo.split('{rival}').join('WEI LONG'));
    expect(r.texto).not.toContain('{rival}');
    // com {rival} de verdade: a abertura genérica do HAYATO contra quem não tem rivalidade
    const g = sortearFala({ tipo: 'abertura', falante: 'hayato', rival: 'wei-long', nomeRival: 'WEI LONG' }, { rng: criarRng(1) });
    expect(g.origem).toBe('abertura');
    expect(g.texto).not.toContain('{rival}');
  });

  it('a mesma fala nunca vem duas vezes seguidas para o mesmo lutador (memória + rng), em todas as categorias de todos os lutadores', () => {
    for (const id of IDS_LUTADORES) {
      const rival: IdLutador = id === 'caio' ? 'aminu' : 'caio';
      for (const tipo of ['abertura', 'rodada', 'vitoria'] as const) {
        const memoria = criarMemoriaDeFalas();
        const rng = criarRng(5);
        let anterior: string | undefined;
        const pedido = tipo === 'rodada'
          ? ({ tipo, falante: id, rival, nomeRival: 'X', decisivo: false } as const)
          : ({ tipo, falante: id, rival, nomeRival: 'X' } as const);
        // lista de uma variante só (ex.: `contra.abertura` do ZENON) não tem como não repetir: a regra vale a partir de 2
        const falas = falasDe(id);
        const lista = tipo === 'abertura' ? listaDeAbertura(falas, rival).lista : tipo === 'rodada' ? listaDeRodada(falas, false).lista : listaDeVitoria(falas, { perdedor: rival }).lista;
        for (let i = 0; i < 200; i++) {
          const r = sortearFala(pedido, { rng, memoria });
          if (lista.length > 1) expect(r.modelo, `${id}/${tipo} #${i}`).not.toBe(anterior);
          else expect(r.modelo, `${id}/${tipo} #${i}`).toBe(lista[0]);
          anterior = r.modelo;
        }
      }
    }
  });

  it('a memória é por lutador: um lutador falar não afeta a "última" do outro', () => {
    const memoria = criarMemoriaDeFalas();
    sortearFala({ tipo: 'abertura', falante: 'caio', rival: 'aminu', nomeRival: 'AMINU' }, { memoria });
    expect(memoria.ultima('caio')).toBeDefined();
    expect(memoria.ultima('aminu')).toBeUndefined();
  });

  it('a memória guarda o MODELO (com {rival}): o mesmo modelo contra outro rival continua sendo repetição', () => {
    const memoria = criarMemoriaDeFalas();
    const a = sortearFala({ tipo: 'abertura', falante: 'wei-long', rival: 'caio', nomeRival: 'CAIO' }, { memoria });
    const b = sortearFala({ tipo: 'abertura', falante: 'wei-long', rival: 'aminu', nomeRival: 'AMINU' }, { memoria });
    expect(b.modelo).not.toBe(a.modelo);
  });

  it('consome só o rng que recebeu: o sorteio de falas é uma sequência própria (nenhum outro rng se mexe)', () => {
    const falas = criarRng(10 + 5);
    const outro = criarRng(10 + 2);
    const antes = outro.estado();
    for (let i = 0; i < 50; i++) sortearFala({ tipo: 'vitoria', falante: 'zenon', rival: 'caio', nomeRival: 'CAIO' }, { rng: falas, memoria: criarMemoriaDeFalas() });
    expect(outro.estado()).toBe(antes);
    expect(falas.estado()).not.toBe(criarRng(15).estado());
  });

  it('sem rng nem memória (testes antigos) funciona e é determinístico', () => {
    const p = { tipo: 'vitoria', falante: 'min-ji', rival: 'caio', nomeRival: 'CAIO' } as const;
    expect(sortearFala(p)).toEqual(sortearFala(p));
    expect(sortearFala(p).modelo).toBe(falasDe('min-ji').vitoria[0]);
  });
});

describe('quemFalaNaRodada (round >= 2)', () => {
  const base = { vitoriasParaVencer: 2 } as const;
  it('fala quem PERDEU o round anterior', () => {
    expect(quemFalaNaRodada({ ...base, round: 2, vencedorAnterior: 0, vitorias: [1, 0] }).falante).toBe(1);
    expect(quemFalaNaRodada({ ...base, round: 2, vencedorAnterior: 1, vitorias: [0, 1] }).falante).toBe(0);
  });
  it('empate no anterior: P1 nos rounds ímpares, P2 nos pares', () => {
    expect(quemFalaNaRodada({ ...base, round: 3, vencedorAnterior: null, vitorias: [1, 1] }).falante).toBe(0);
    expect(quemFalaNaRodada({ ...base, round: 2, vencedorAnterior: null, vitorias: [0, 0] }).falante).toBe(1);
    expect(quemFalaNaRodada({ ...base, round: 5, vencedorAnterior: null, vitorias: [1, 1] }).falante).toBe(0);
  });
  it('decisivo = os dois a 1 vitória do fim (melhor de 3 e de 5); melhor de 1 nunca', () => {
    expect(quemFalaNaRodada({ ...base, round: 3, vencedorAnterior: 0, vitorias: [1, 1] }).decisivo).toBe(true);
    expect(quemFalaNaRodada({ ...base, round: 2, vencedorAnterior: 0, vitorias: [1, 0] }).decisivo).toBe(false);
    expect(quemFalaNaRodada({ vitoriasParaVencer: 3, round: 4, vencedorAnterior: 0, vitorias: [2, 2] }).decisivo).toBe(true);
    expect(quemFalaNaRodada({ vitoriasParaVencer: 3, round: 4, vencedorAnterior: 0, vitorias: [1, 1] }).decisivo).toBe(false);
    expect(quemFalaNaRodada({ vitoriasParaVencer: 3, round: 4, vencedorAnterior: 0, vitorias: [2, 1] }).decisivo).toBe(false);
    expect(quemFalaNaRodada({ vitoriasParaVencer: 1, round: 2, vencedorAnterior: null, vitorias: [0, 0] }).decisivo).toBe(false);
  });
});

describe('preferência provocacoes', () => {
  it('ausente = ligadas (padrão do dono); desligadas desliga', () => {
    expect(provocacoesLigadas(undefined)).toBe(true);
    expect(provocacoesLigadas('ligadas')).toBe(true);
    expect(provocacoesLigadas('desligadas')).toBe(false);
  });
});
