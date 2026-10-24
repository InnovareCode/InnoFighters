import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it, vi } from 'vitest';
import { ALTURA, LARGURA } from '../../src/core/constantes';
import { criarRng } from '../../src/core/rng';
import { ALTURA_LETTERBOX, DURACAO_TOTAL, TICKS_POR_COMPASSO, temMotor } from '../../src/data/trailer/tipos';
import { entradaDoRetrato } from '../../src/data/trailer/curvas';
import { CORTES_COM_SMEAR, smearNoTick, TICKS_DO_SMEAR } from '../../src/render/trailer/grade';
import { alfaDoCartao, alfaDaPlaca, alfaDoTituloNaFaixa, escalaDoCartao, partesDoCartao, PLACA, reflexoDoCartao, TAMANHO_DO_CARTAO, Y_DA_FAIXA } from '../../src/render/trailer/titulos';
import { alfaDaLogo, ATRASO_DO_TITULO, brilhoDaLogo, escalaDaBatida, fagulha, FAGULHAS, tDoTituloNaRevelacao, tremorDoImpacto } from '../../src/render/trailer/logo-revelacao';
import { animacaoDoRetrato, colunasDaMontagem, layoutDosPaineis, PAINEL } from '../../src/render/trailer/retratos';
import { CENARIOS_DO_TITULO, LUTADORES_FIXOS, planoDeCarga, residentesNoPlano, type PedidoDeCarga } from '../../src/trailer/carga';
import { CargaEscalonada, type GerenciadorDaCarga } from '../../src/ui/trailer/arte';
import { conexaoDoNavegador, economiaDeDados, MINIMO_DE_TICKS_POR_QUADRO, prerolarNoOrcamento } from '../../src/ui/trailer/ambiente';
import { ROTEIRO } from './_trailer';

/*
 * Trailer de abertura, T4/T5 (a cena): carga escalonada da arte (spec §5.2 e critério 8), decisões do aparelho, transições, títulos, revelação da logo e a regra de que
 * nada do trailer sorteia fora da semente. O desenho em si (pixels) é provado no navegador (tests/e2e/trailer.spec.ts).
 */

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));

// ------------------------------------------------------------------------------------------------------------------------------ carga escalonada

/** Um gerenciador falso: só guarda o que "está na memória" e deixa o teste decidir quando cada carga termina. Imita a regra do de verdade: `soltar` não solta o que está em uso. */
class GerenciadorFalso implements GerenciadorDaCarga {
  readonly cenarios = new Map<string, unknown>();
  readonly lutadores = new Set<string>();
  /** Um item por chamada de `garantir`: o atlas ("hayato") ou "cen:jp" para os cenários. */
  readonly pedidosFeitos: string[] = [];
  readonly prebuscas: string[] = [];
  emUsoLut = new Set<string>();
  emUsoCen = new Set<string>();
  /** O maior número de atlas e de cenários ao mesmo tempo na memória. */
  maxLutadores = 0;
  maxCenarios = 0;
  noAr = 0;
  maxNoAr = 0;
  pendentes: Array<() => void> = [];
  /** Lutadores cuja carga nunca resolve (aparelho lento / rede ruim) ou falha. */
  travados = new Set<string>();
  falham = new Set<string>();

  estaPronto(p: { lutadores?: readonly string[]; cenarios?: readonly string[] }): boolean {
    return (p.lutadores ?? []).every((id) => this.lutadores.has(id)) && (p.cenarios ?? []).every((id) => this.cenarios.has(id));
  }
  garantir(p: { lutadores?: readonly string[]; cenarios?: readonly string[] }): Promise<void> {
    // como o de verdade: o que já está na memória não é carregado de novo
    const ids = (p.lutadores ?? []).filter((i) => !this.lutadores.has(i));
    const cens = (p.cenarios ?? []).filter((c) => !this.cenarios.has(c));
    if (ids.length + cens.length === 0) return Promise.resolve();
    this.pedidosFeitos.push(ids.length > 0 ? ids.join(',') : `cen:${cens.join(',')}`);
    this.noAr++;
    this.maxNoAr = Math.max(this.maxNoAr, this.noAr);
    return new Promise<void>((resolve, reject) => {
      const fim = (): void => {
        this.noAr--;
        if (ids.some((i) => this.falham.has(i))) return reject(new Error('rede'));
        for (const i of ids) this.lutadores.add(i);
        for (const c of cens) this.cenarios.set(c, 1);
        this.maxLutadores = Math.max(this.maxLutadores, this.lutadores.size);
        this.maxCenarios = Math.max(this.maxCenarios, this.cenarios.size);
        resolve();
      };
      if (ids.some((i) => this.travados.has(i))) return; // nunca resolve
      this.pendentes.push(fim);
    });
  }
  prebuscar(p: { lutadores?: readonly string[]; cenarios?: readonly string[] }): void {
    this.prebuscas.push(`${(p.lutadores ?? []).join(',')}|${(p.cenarios ?? []).join(',')}`);
  }
  usar(p: { lutadores?: readonly string[]; cenarios?: readonly string[] }): void {
    this.emUsoLut = new Set(p.lutadores ?? []);
    this.emUsoCen = new Set(p.cenarios ?? []);
  }
  soltar(p: { lutadores?: readonly string[]; cenarios?: readonly string[] }): void {
    for (const i of p.lutadores ?? []) if (!this.emUsoLut.has(i)) this.lutadores.delete(i);
    for (const c of p.cenarios ?? []) if (!this.emUsoCen.has(c)) this.cenarios.delete(c);
  }
  liberarLutador(id: string): void {
    if (!this.emUsoLut.has(id) && !LUTADORES_FIXOS.has(id as never)) this.lutadores.delete(id);
  }
  liberarCenario(id: string): void {
    if (!this.emUsoCen.has(id) && !CENARIOS_DO_TITULO.includes(id as never)) this.cenarios.delete(id);
  }
  lutadoresResidentes(): string[] {
    return [...this.lutadores];
  }
  /** Termina todas as cargas pendentes, uma de cada vez (como a rede), e deixa as promessas correrem. */
  async resolverTudo(): Promise<void> {
    // só microtarefas (a cadeia de cargas é de promessas): sem timers, que no Windows custam ~15 ms cada
    const virar = async (): Promise<void> => {
      for (let i = 0; i < 12; i++) await Promise.resolve();
    };
    for (let i = 0; i < 40; i++) {
      await virar();
      const fim = this.pendentes.shift();
      if (fim) fim();
    }
    await virar();
  }
}

const PEDIDOS = planoDeCarga(ROTEIRO);
const indiceDe = (id: string): number => ROTEIRO.planos.findIndex((p) => p.id === id);
const pedidoDoPlano = (id: string): PedidoDeCarga => PEDIDOS.find((p) => p.prontoEm === id && p.lutadores.length > 0) ?? (PEDIDOS.find((p) => p.prontoEm === id) as PedidoDeCarga);
const arteDe = (p: PedidoDeCarga): { lutadores: readonly string[]; cenarios: readonly string[] } => ({ lutadores: p.lutadores, cenarios: p.cenarios });

describe('carga escalonada da arte do trailer (T12: sem arte fixa)', () => {
  it('carrega UM atlas por vez, BAATAR e ZENON nunca juntos, e na memória só o plano atual e o seguinte (no máximo 4 atlas e 5 cenários)', async () => {
    const g = new GerenciadorFalso();
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    c.limparSobras();
    for (let k = 0; k < ROTEIRO.planos.length; k++) {
      c.entrouNoPlano(k);
      await g.resolverTudo();
      expect(g.lutadores.has('baatar') && g.lutadores.has('zenon'), `BAATAR e ZENON juntos no plano ${ROTEIRO.planos[k]?.id}`).toBe(false);
      // o que está na memória é o que a tabela de carga diz para este plano
      const r = residentesNoPlano(ROTEIRO, PEDIDOS, k);
      expect([...g.lutadores].sort(), `atlas no plano ${ROTEIRO.planos[k]?.id}`).toEqual([...r.lutadores].sort());
      expect([...g.cenarios.keys()].sort(), `cenários no plano ${ROTEIRO.planos[k]?.id}`).toEqual([...r.cenarios].sort());
    }
    expect(g.maxNoAr).toBe(1);
    expect(g.maxLutadores).toBe(4); // NILA, WEI LONG, BAATAR e HAYATO: o P6 e o P7 juntos, o pior instante
    expect(g.maxCenarios).toBe(5); // o P9 (gr) mais os 4 do título que a logo pede com antecedência
    // a ordem dos pedidos: o do plano e, dentro dele, os cenários primeiro e depois um atlas por vez
    expect(g.pedidosFeitos.slice(0, 6)).toEqual(['cen:jp', 'hayato', 'cen:cn', 'wei-long', 'cen:kr', 'cen:br']);
  });

  it('todo plano de luta está pronto no começo dele, e o que ele usou sai depois (menos o que um pedido seguinte ainda segura)', async () => {
    const g = new GerenciadorFalso();
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    for (let k = 0; k < ROTEIRO.planos.length; k++) {
      c.entrouNoPlano(k);
      await g.resolverTudo();
      for (const p of PEDIDOS) {
        if (indiceDe(p.prontoEm) === k && p.lutadores.length > 0 && indiceDe(p.comecaEm) < k) expect(c.pronto(arteDe(p)), `${p.lutadores.join('+')} no ${p.prontoEm}`).toBe(true);
      }
      const seguros = residentesNoPlano(ROTEIRO, PEDIDOS, k);
      for (const p of PEDIDOS) {
        if (indiceDe(p.soltarAoFimDe) >= k) continue;
        for (const l of p.lutadores) if (!seguros.lutadores.includes(l)) expect(g.lutadores.has(l), `${l} depois do ${p.soltarAoFimDe}`).toBe(false);
      }
    }
  });

  it('o HAYATO do P0 ao P1 e do P7 ao P9 NÃO é solto e recarregado (o pedido seguinte começa antes de o anterior terminar)', async () => {
    const g = new GerenciadorFalso();
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    for (let k = 0; k <= indiceDe('P1'); k++) {
      c.entrouNoPlano(k);
      await g.resolverTudo();
    }
    expect(g.pedidosFeitos.filter((x) => x === 'hayato')).toHaveLength(1);
    for (let k = indiceDe('P1') + 1; k <= indiceDe('P10'); k++) {
      c.entrouNoPlano(k);
      await g.resolverTudo();
    }
    // P0+P1, P3, P7+P9 (o P8 não tem arte) e a vitrine da logo: o P9 já o segura, então a logo não o pede de novo
    expect(g.pedidosFeitos.filter((x) => x === 'hayato')).toHaveLength(3);
  });

  it('pré-busca os pedidos que vão esperar na fila e o seguinte, uma vez por pedido, sem decodificar', async () => {
    const g = new GerenciadorFalso();
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    c.entrouNoPlano(0);
    c.entrouNoPlano(0);
    // o P0 começa já; o pedido do P1 espera na fila e baixa enquanto o P0 carrega (sem o HAYATO, que o P0 já traz); o seguinte, o cartão C1, ainda nem começou
    expect(g.prebuscas).toEqual(['wei-long|cn', '|kr']);
    await g.resolverTudo();
  });

  it('com um leitor que nunca resolve a AMINU, o plano dela NÃO está pronto (a cena força a reserva) e a carga seguinte espera na fila, sem exceção', async () => {
    const g = new GerenciadorFalso();
    g.travados.add('aminu');
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    for (let k = 0; k < indiceDe('P3') + 1; k++) c.entrouNoPlano(k);
    await g.resolverTudo();
    expect(c.pronto(arteDe(pedidoDoPlano('P3')))).toBe(false);
    // série: o atlas seguinte da fila não começou, porque a AMINU ainda segura a fila (o P4 só começa no P3)
    expect(g.pedidosFeitos).not.toContain('centella');
    expect(g.pedidosFeitos.at(-1)).toBe('aminu');
  });

  it('uma carga que falha vira "não pronto" para sempre (reserva), sem derrubar as outras', async () => {
    const g = new GerenciadorFalso();
    g.falham.add('aminu');
    const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    for (let k = 0; k <= indiceDe('P4'); k++) {
      c.entrouNoPlano(k);
      await g.resolverTudo();
    }
    expect(c.falhas.has('aminu')).toBe(true);
    expect(c.pronto({ lutadores: ['aminu', 'hayato'], cenarios: ['ng'] })).toBe(false);
    expect(c.pronto({ lutadores: ['centella', 'caio'], cenarios: ['mx'] })).toBe(true);
    erro.mockRestore();
  });

  it('ao sair solta TUDO, inclusive o que ainda estava a caminho (solta quando chega), menos a vitrine e os cenários do título que o destino pede', async () => {
    const g = new GerenciadorFalso();
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    for (let k = 0; k <= indiceDe('P3'); k++) c.entrouNoPlano(k);
    await Promise.resolve();
    c.liberarTudo(); // a AMINU ainda está carregando
    await g.resolverTudo();
    for (const l of g.lutadores) expect(LUTADORES_FIXOS.has(l as never), `${l} é da vitrine`).toBe(true);
    expect(g.lutadores.has('aminu')).toBe(false);
    for (const cen of g.cenarios.keys()) expect(CENARIOS_DO_TITULO.includes(cen as never), `${cen} é do título`).toBe(true);
    expect(g.cenarios.has('ng')).toBe(false);
  });

  it('uma prévia que abre no meio (?trailer=P7) não carrega o que já passou e solta as sobras', async () => {
    const g = new GerenciadorFalso();
    g.lutadores.add('aminu'); // sobra de um jogo anterior
    const c = new CargaEscalonada(ROTEIRO, PEDIDOS, g);
    c.limparSobras();
    c.entrouNoPlano(indiceDe('P7'));
    await g.resolverTudo();
    expect(g.pedidosFeitos).toEqual(['cen:mn', 'baatar', 'hayato']);
    expect([...g.lutadores].sort()).toEqual(['baatar', 'hayato']);
  });

  it('o plano de carga continua coerente com o roteiro (o ZENON sai 1 plano antes do uso)', () => {
    const arconte = PEDIDOS.find((p) => p.lutadores.includes('zenon')) as PedidoDeCarga;
    expect(indiceDe(arconte.comecaEm)).toBeLessThan(indiceDe(arconte.prontoEm));
  });
});

// ------------------------------------------------------------------------------------------------------------------------------ aparelho

describe('decisões do aparelho', () => {
  it('economia de dados e rede 2g/3g viram a versão estática; rede boa, ausência da API (WebKit) e saveData falso não', () => {
    expect(economiaDeDados({ saveData: true })).toBe(true);
    for (const t of ['slow-2g', '2g', '3g']) expect(economiaDeDados({ effectiveType: t })).toBe(true);
    expect(economiaDeDados({ effectiveType: '4g', saveData: false })).toBe(false);
    expect(economiaDeDados(undefined)).toBe(false);
    expect(economiaDeDados(null)).toBe(false);
    expect(conexaoDoNavegador()).toBeNull(); // Node: sem navigator
  });

  it('a pré-rolagem anda no mínimo 8 ticks por quadro e mais enquanto o orçamento de 2 ms deixar; para quando não há mais o que rolar', () => {
    let restante = 100;
    const rolar = (n: number): number => {
      const f = Math.min(n, restante);
      restante -= f;
      return f;
    };
    // relógio que gasta 1 ms por consulta: cabe a 1ª fatia e mais uma
    let agora = 0;
    const feitos = prerolarNoOrcamento(rolar, () => agora++);
    expect(feitos).toBeGreaterThanOrEqual(MINIMO_DE_TICKS_POR_QUADRO);
    expect(feitos).toBeLessThanOrEqual(24);
    // relógio parado: roda tudo (o orçamento nunca estoura)
    restante = 100;
    expect(prerolarNoOrcamento(rolar, () => 0)).toBe(100);
    // sem nada a rolar: devolve 0
    expect(prerolarNoOrcamento(rolar, () => 0)).toBe(0);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------ transições e títulos

describe('smear nos cortes luta -> luta', () => {
  it('só 3 cortes, 2 ticks de cada lado, na direção do giro e do lado oposto na entrada', () => {
    expect(CORTES_COM_SMEAR.map((c) => `${c.sai}>${c.entra}`)).toEqual(['P3>P4', 'P5>P6', 'P6>P7']);
    const total = 2 * TICKS_POR_COMPASSO;
    for (const c of CORTES_COM_SMEAR) {
      expect(smearNoTick(c.sai, total - 3, total)).toBe(0);
      expect(smearNoTick(c.sai, total - TICKS_DO_SMEAR, total)).toBe(c.dir);
      expect(smearNoTick(c.sai, total - 1, total)).toBe(c.dir);
      expect(smearNoTick(c.entra, 0, total)).toBe(-c.dir);
      expect(smearNoTick(c.entra, TICKS_DO_SMEAR - 1, total)).toBe(-c.dir);
      expect(smearNoTick(c.entra, TICKS_DO_SMEAR, total)).toBe(0);
    }
    // a direção alterna (-> <- ->) e nenhum outro plano tem smear
    expect(CORTES_COM_SMEAR.map((c) => c.dir)).toEqual([1, -1, 1]);
    for (const p of ROTEIRO.planos) if (!CORTES_COM_SMEAR.some((c) => c.sai === p.id || c.entra === p.id)) for (let t = 0; t < p.compassos * TICKS_POR_COMPASSO; t++) expect(smearNoTick(p.id, t, p.compassos * TICKS_POR_COMPASSO)).toBe(0);
  });
});

describe('títulos', () => {
  it('o corte é no último espaço (a última palavra vai em fogo)', () => {
    expect(partesDoCartao('DEZ NAÇÕES.')).toEqual(['DEZ ', 'NAÇÕES.']);
    expect(partesDoCartao('QUEM SOBE AO TOPO…')).toEqual(['QUEM SOBE AO ', 'TOPO…']);
    expect(partesDoCartao('UM SÓ CINTURÃO.')).toEqual(['UM SÓ ', 'CINTURÃO.']);
    expect(partesDoCartao('PALAVRA')).toEqual(['', 'PALAVRA']);
  });

  it('cartão: acende em 3 ticks, bate de 1,30 a 1,00 em 6 e apaga nos 6 últimos; o reflexo corre do tick 8 ao 26', () => {
    expect(alfaDoCartao(0, 0, 80)).toBeCloseTo(1 / 3, 5);
    expect(alfaDoCartao(2, 0, 80)).toBe(1);
    expect(alfaDoCartao(79, 0, 80)).toBeCloseTo(1 / 6, 5);
    expect(escalaDoCartao(0, 0, 80)).toBeCloseTo(1.3, 5);
    expect(escalaDoCartao(6, 0, 80)).toBeCloseTo(1, 5);
    expect(escalaDoCartao(79, 0, 80)).toBeLessThanOrEqual(1.025);
    expect(reflexoDoCartao(7, 0)).toBe(-1);
    expect(reflexoDoCartao(8, 0)).toBe(0);
    expect(reflexoDoCartao(26, 0)).toBe(1);
    expect(reflexoDoCartao(27, 0)).toBe(-1);
  });

  it('o título na faixa e a placa respeitam o roteiro: aparecem na janela, a placa dura <= 1,5 s', () => {
    expect(alfaDoTituloNaFaixa(5, 6, 100)).toBe(0);
    expect(alfaDoTituloNaFaixa(9, 6, 100)).toBe(1);
    expect(alfaDaPlaca(12, 12, 96)).toBe(0);
    expect(alfaDaPlaca(24, 12, 96)).toBe(1);
    for (const p of ROTEIRO.planos) for (const t of p.titulos ?? []) if (t.estilo === 'placa') expect(t.ate - t.de).toBeLessThanOrEqual(90);
  });

  it('a placa mora INTEIRA dentro da faixa de baixo do letterbox (y 487..523 numa faixa que vai de 471 a 540)', () => {
    const faixaTopo = ALTURA - ALTURA_LETTERBOX;
    expect(PLACA.y).toBeGreaterThanOrEqual(faixaTopo);
    expect(PLACA.y + PLACA.altura).toBeLessThanOrEqual(ALTURA);
    expect(PLACA.y).toBe(487);
    expect(PLACA.y + PLACA.altura).toBe(523);
    // o título na faixa fica centrado nela (505,5) e o cartão do meio cabe nos 540
    expect(Y_DA_FAIXA).toBe(505.5);
    expect(TAMANHO_DO_CARTAO).toBe(64);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------ montagem e logo

describe('montagem P8', () => {
  it('8 retratos = grade 4x2 de painéis 240x190 dentro das faixas do letterbox, fileira 1 em y 76 e fileira 2 em y 274', () => {
    const n = (ROTEIRO.planos.find((p) => p.id === 'P8') as { ordem: readonly string[] }).ordem.length;
    expect(n).toBe(8);
    expect(colunasDaMontagem(n)).toBe(4);
    const ps = layoutDosPaineis(n);
    expect(ps.map((p) => [p.coluna, p.linha])).toEqual([[0, 0], [1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1], [3, 1]]);
    expect(new Set(ps.map((p) => p.y))).toEqual(new Set([76, 274]));
    for (const p of ps) {
      expect(p.w).toBe(PAINEL.largura);
      expect(p.h).toBe(PAINEL.altura);
      expect(p.y).toBeGreaterThanOrEqual(ALTURA_LETTERBOX);
      expect(p.y + p.h).toBeLessThanOrEqual(ALTURA - ALTURA_LETTERBOX);
    }
    expect(ps[3] ? ps[3].x + ps[3].w : 0).toBe(LARGURA);
  });

  it('1 retrato por tempo (2,5 cortes/s) e a entrada acende em 8 ticks', () => {
    for (let i = 1; i < 8; i++) expect(entradaDoRetrato(i) - entradaDoRetrato(i - 1)).toBe(24);
    expect(animacaoDoRetrato(-1).alfa).toBe(0);
    expect(animacaoDoRetrato(20).escala).toBe(1);
  });
});

describe('revelação da logo (P10)', () => {
  it('o último quadro do trailer (tl 191) é o do título em t 119: o título nasce em 120', () => {
    expect(tDoTituloNaRevelacao(191)).toBe(119);
    expect(tDoTituloNaRevelacao(0)).toBe(0);
    expect(tDoTituloNaRevelacao(ATRASO_DO_TITULO)).toBe(0);
    expect(2 * TICKS_POR_COMPASSO - 1).toBe(191);
  });

  it('a logo bate de 1,6x a 1x em 8 ticks, acende em ~7 e o tremor some no tick 22', () => {
    expect(escalaDaBatida(0)).toBeCloseTo(1.6, 5);
    expect(escalaDaBatida(8)).toBeCloseTo(1.04, 2);
    expect(escalaDaBatida(20)).toBe(1);
    expect(escalaDaBatida(120)).toBe(1);
    expect(alfaDaLogo(0)).toBe(0);
    expect(alfaDaLogo(7)).toBe(1);
    expect(tremorDoImpacto(0)).toBeCloseTo(13.2, 5);
    expect(tremorDoImpacto(22)).toBe(0);
    expect(brilhoDaLogo(16)).toBe(-1);
  });

  it('as fagulhas são função fechada do tick (a mesma em toda visita) e acabam em 60 ticks', () => {
    for (let i = 0; i < FAGULHAS; i++) {
      expect(fagulha(i, 12)).toEqual(fagulha(i, 12));
      expect(fagulha(i, 61)).toBeNull();
      expect(fagulha(i, -1)).toBeNull();
    }
    const a = fagulha(3, 20);
    expect(a?.alfa).toBeGreaterThan(0);
    expect(fagulha(3, 0)?.x).toBe(LARGURA / 2);
  });
});

// ------------------------------------------------------------------------------------------------------------------------------ sem sorteio

/** O código sem os comentários (os comentários explicam o que NÃO se faz e citam os nomes proibidos). */
const semComentarios = (t: string): string =>
  t
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
    .replace(/\s\/\/ .*$/gm, '');

function listar(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? listar(join(dir, e.name)) : /\.ts$/.test(e.name) ? [join(dir, e.name)] : []));
}

describe('nada do trailer sorteia nem lê o relógio fora do que a spec permite', () => {
  const arquivos = [...listar(join(RAIZ, 'src/ui/trailer')), ...listar(join(RAIZ, 'src/render/trailer')), join(RAIZ, 'src/ui/cenas/trailer.ts')];
  it('sem Math.random, Date.now nem new Date em src/ui/trailer, src/render/trailer e na casca', () => {
    expect(arquivos.length).toBeGreaterThan(8);
    for (const f of arquivos) {
      const t = semComentarios(readFileSync(f, 'utf8'));
      expect(t, f).not.toMatch(/Math\.random|Date\.now|new Date\b/);
    }
  });

  it('performance.now só no orçamento da pré-rolagem (a fatia decide QUANTOS ticks andam, nunca o resultado) e nas marcas de medição', () => {
    const com = arquivos.filter((f) => /performance\.now/.test(semComentarios(readFileSync(f, 'utf8')))).map((f) => f.replace(RAIZ, '').replace(/\\/g, '/'));
    expect(com).toEqual(['src/ui/trailer/trailer.ts']);
    const linhas = semComentarios(readFileSync(join(RAIZ, 'src/ui/trailer/trailer.ts'), 'utf8')).split('\n').filter((l) => /performance\.now/.test(l));
    expect(linhas.length).toBe(1);
    expect(linhas[0]).toMatch(/prerolarNoOrcamento/);
  });

  it('o roteiro tem 2400 ticks e a casca usa criarRng só com sementes do roteiro', () => {
    expect(DURACAO_TOTAL).toBe(2400);
    const t = semComentarios(readFileSync(join(RAIZ, 'src/ui/trailer/trailer.ts'), 'utf8'));
    // toda chamada a criarRng no pedaço do trailer parte de ROTEIRO.sementeVisual (ou de uma constante), nunca de rngVisual/rngUI/rngLogica da sessão
    for (const m of t.matchAll(/criarRng\(([^)]*)\)/g)) expect(m[1], m[0]).toMatch(/ROTEIRO\.sementeVisual|^\d+$|semente|2654435761/);
    expect(t).not.toMatch(/rngVisual|rngUI|rngLogica|sorteioDaSelecao|sorteioDeFalas/);
    expect(criarRng(1).proximo()).toBeTypeOf('number');
    expect(ROTEIRO.planos.filter(temMotor).length).toBe(8);
  });
});
