import { describe, expect, it } from 'vitest';
import { ROSTER } from '../../src/data/lutadores';
import { agregar, compararRodadas, hashDosRegistros, taxaDe } from '../../ferramentas/balanco/agregado';
import { aplicarAjustes, montarElenco } from '../../ferramentas/balanco/elenco';
import { WEI_LONG } from '../../src/data/lutadores';
import { BAATAR_CHEFE, montarBaatarChefe } from './_baatar-chefe';
import { semente32, wilson } from '../../ferramentas/balanco/estatistica';
import { medirGolpe, varrerAlcance } from '../../ferramentas/balanco/frame-data';
import { acharOutliers } from '../../ferramentas/balanco/outliers';
import { casaFiltro, lutar, montarTarefas, rodarTarefas, type ParametrosSim, type Registro } from '../../ferramentas/balanco/simulacao';

/*
 * Harness de balanceamento (E6a). O que importa provar: (1) o resultado é DETERMINÍSTICO (mesma tarefa, mesmo registro; dividir
 * ou repetir o trabalho não muda nada); (2) a frame data MEDIDA no motor bate com dois casos que se conhecem de cabeça;
 * (3) a agregação e as sinalizações fazem a conta certa sobre registros montados à mão.
 */
const elenco = montarElenco();
const PARAMS: ParametrosSim = { sementes: 2, niveis: [1, 2], base: 1, filtro: 'hayato:caio,aminu:nila', incluirChefe: false };

describe('determinismo', () => {
  const tarefas = montarTarefas(ROSTER, 'baatar', PARAMS);

  it('a lista de tarefas é estável: 2 pares ordenados do filtro x 2 níveis x 2 sementes, índices 0..7, sementes todas diferentes', () => {
    expect(tarefas).toHaveLength(2 * 2 * 2); // hayato:caio e aminu:nila (A=P1) x níveis x sementes
    expect(tarefas.map((t) => t.idx)).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(montarTarefas(ROSTER, 'baatar', PARAMS)).toEqual(tarefas);
    expect(new Set(tarefas.map((t) => t.semente)).size).toBe(tarefas.length);
  });

  it('2 pares x 2 sementes rodados duas vezes dão EXATAMENTE os mesmos registros e o mesmo hash', () => {
    const um = rodarTarefas(elenco, tarefas);
    const dois = rodarTarefas(elenco, tarefas);
    expect(dois).toEqual(um);
    expect(hashDosRegistros(dois)).toBe(hashDosRegistros(um));
  });

  it('a ordem de execução não importa (a semente sai do texto da tarefa): lutar na ordem inversa dá o mesmo hash', () => {
    const normal = rodarTarefas(elenco, tarefas);
    const invertida = rodarTarefas(elenco, [...tarefas].reverse());
    expect(hashDosRegistros(invertida)).toBe(hashDosRegistros(normal));
  });

  it('o resultado de uma luta não depende da POSIÇÃO dela na lista (rodar só um filtro dá o mesmo que rodar tudo)', () => {
    const t = tarefas[3] as (typeof tarefas)[number];
    const sozinha = lutar(elenco, { ...t, idx: 0 });
    const naLista = lutar(elenco, t);
    expect({ ...sozinha, idx: 0 }).toEqual({ ...naLista, idx: 0 });
  });

  it('outra semente-base DÁ outro resultado (o hash enxerga a diferença)', () => {
    const a = rodarTarefas(elenco, tarefas);
    const b = rodarTarefas(elenco, montarTarefas(ROSTER, 'baatar', { ...PARAMS, base: 2 }));
    expect(hashDosRegistros(b)).not.toBe(hashDosRegistros(a));
  });

  it('uma luta é coerente: tem vencedor, rounds, motivo do fim e não travou', () => {
    const r = lutar(elenco, tarefas[0] as (typeof tarefas)[number]);
    expect(r.travou).toBe(false);
    expect([0, 1]).toContain(r.venc);
    expect(r.rounds).toBeGreaterThanOrEqual(2);
    expect(r.fim.length).toBeGreaterThanOrEqual(2);
    expect(r.dano[0] + r.dano[1]).toBeGreaterThan(0);
    expect(Object.keys(r.golpes[0]).length + Object.keys(r.golpes[1]).length).toBeGreaterThan(0);
  });

  it('o dano é atribuído a QUEM CAUSOU: quem venceu 2 rounds por KO tirou ao menos 2 vidas inteiras do rival', () => {
    const feitas = rodarTarefas(elenco, tarefas).filter((r) => r.fim.every((f) => f === 'ko'));
    expect(feitas.length).toBeGreaterThanOrEqual(5);
    for (const r of feitas) {
      const perdedor = (r.venc === 0 ? r.b : r.a) as keyof typeof elenco;
      expect(r.dano[r.venc as 0 | 1], `${r.a} x ${r.b} semente ${r.semente}`).toBeGreaterThanOrEqual(2 * elenco[perdedor].hp - 0.5);
    }
  });

  it('a luta de chefão usa a primitiva do chefe (round único, barras) e termina (chefão de fixtura: o BAATAR de produção não tem `chefe`)', () => {
    const [t] = montarTarefas(ROSTER, 'baatar', { ...PARAMS, filtro: 'hayato:baatar', incluirChefe: true, niveis: [1] }).filter((x) => x.tipo === 'chefe');
    expect(t).toBeDefined();
    const r = lutar({ ...elenco, baatar: montarBaatarChefe() }, t as NonNullable<typeof t>);
    expect(r.tipo).toBe('chefe');
    expect(r.travou).toBe(false);
    expect([0, 1]).toContain(r.venc);
  });

  it('sem chefão no jogo (CHEFE null) não há tarefa de chefe, mesmo pedindo `incluirChefe`; o BAATAR é um regular como os outros', () => {
    const todas = montarTarefas(ROSTER, null, { ...PARAMS, filtro: null, incluirChefe: true, sementes: 1, niveis: [1] });
    expect(todas.some((x) => x.tipo === 'chefe')).toBe(false);
    expect(todas).toHaveLength(ROSTER.length * (ROSTER.length - 1)); // todos os pares ordenados do roster
    expect(todas.some((x) => x.a === 'baatar' || x.b === 'baatar')).toBe(true);
    const agr = agregar(rodarTarefas(elenco, montarTarefas(ROSTER, null, { ...PARAMS, filtro: 'baatar:hayato,hayato:baatar', sementes: 1, niveis: [1] })), ['hayato', 'baatar'], null, PARAMS);
    expect(agr.total.chefe).toBe(0);
    expect(agr.chefe).toEqual([]);
    expect(agr.mecanicas.baatar.lutas).toBe(2);
  });
});

describe('frame data medida no motor: dois casos conhecidos', () => {
  it('HAYATO lp (tabela base: S3 A3 R7, dano 4, hs 14, bs 8): início 3, ativos 3, recup 7, hitstun 14, +4 no acerto, -2 no bloqueio', () => {
    const m = medirGolpe(elenco, 'hayato', null, 'lp');
    expect([m.inicio, m.ativos, m.recuperacao, m.total]).toEqual([3, 3, 7, 13]);
    expect(m.hitstun).toBe(14);
    expect(m.vantagemAcerto).toBe(14 - 3 - 7); // hs - (A + R): o defensor volta a agir 4 ticks DEPOIS do atacante
    expect(m.vantagemAcerto).toBe(4);
    expect(m.blockstun).toBe(8);
    expect(m.vantagemBloqueio).toBe(8 - 3 - 7);
    expect(m.dano).toBeCloseTo(4 * elenco.hayato.pow, 6);
    expect(m.bloqueioMedido).toBe('mid');
    expect(m.alcance?.min).toBe(78); // colado: os corpos não chegam a menos de 78
    expect(m.derruba).toBe(false);
  });

  it('WEI LONG hk (S12 A5 R22, dano 14 depois da E6b) e seu golpe baixo: início/ativos/recup do motor = tabela; derruba; chk é baixo', () => {
    const m = medirGolpe(elenco, 'wei-long', null, 'hk');
    expect([m.inicio, m.ativos, m.recuperacao]).toEqual([12, 5, 22]);
    expect(m.dano).toBeCloseTo(14 * 0.95, 6); // dado de produção da E6b: dmg 14 x pow 0,95 (V2-6)
    expect(m.derruba).toBe(true); // hk tem `kd`
    const baixo = medirGolpe(elenco, 'wei-long', null, 'clk');
    expect(baixo.bloqueioMedido).toBe('low');
  });

  it('o alcance medido segue a caixa: golpe de caixa maior alcança mais longe (hk > lp, no HAYATO)', () => {
    const lp = medirGolpe(elenco, 'hayato', null, 'lp');
    const hk = medirGolpe(elenco, 'hayato', null, 'hk');
    expect((hk.alcance?.max ?? 0)).toBeGreaterThan(lp.alcance?.max ?? 0);
  });

  it('a varredura de alcance acha as bordas a 1 px (função sintética: conecta de 91 a 153)', () => {
    const a = varrerAlcance((d) => d >= 91 && d <= 153);
    expect([a.min, a.max, a.noTeto, a.furos]).toEqual([91, 153, false, 0]);
    expect(varrerAlcance(() => false).min).toBeNull();
    const furo = varrerAlcance((d) => (d >= 90 && d <= 200 && !(d >= 120 && d <= 130)) || d === 78);
    expect(furo.furos).toBeGreaterThan(0);
  });
});

describe('estatística e agregação', () => {
  it('Wilson: 75/100 = [0,657, 0,825]; 0/n e n/n ficam em 0 e 1 nas pontas', () => {
    const [lo, hi] = wilson(75, 100);
    expect(lo).toBeCloseTo(0.6569, 3);
    expect(hi).toBeCloseTo(0.8250, 3);
    expect(wilson(0, 10)[0]).toBe(0);
    expect(wilson(10, 10)[1]).toBe(1);
    expect(taxaDe(3, 4).taxa).toBe(0.75);
  });

  it('a semente depende só do texto, é de 32 bits e muda com qualquer campo', () => {
    expect(semente32('a|b')).toBe(semente32('a|b'));
    expect(semente32('a|b')).not.toBe(semente32('a|c'));
    expect(semente32('x')).toBeGreaterThanOrEqual(0);
    expect(semente32('x')).toBeLessThan(2 ** 32);
  });

  it('a comparação entre rodadas diz IGUAL, DIFERENTE esperado (versão mudou) ou DIFERENTE com a mesma versão (bug)', () => {
    const base = { hash: 'aaa', versao: 'v1', taxas: { hayato: 0.5 } };
    expect(compararRodadas(base, { ...base })).toMatchObject({ igual: true, mudancas: [] });
    const mudou = compararRodadas(base, { hash: 'bbb', versao: 'v2', taxas: { hayato: 0.6 } });
    expect(mudou).toMatchObject({ igual: false, mesmaVersao: false });
    expect(mudou.mudancas).toEqual([{ id: 'hayato', antes: 0.5, agora: 0.6 }]);
    expect(compararRodadas(base, { hash: 'bbb', versao: 'v1', taxas: { hayato: 0.5 } })).toMatchObject({ igual: false, mesmaVersao: true });
  });

  it('o filtro de pares aceita curinga dos dois lados e lista', () => {
    expect(casaFiltro(null, 'a', 'b')).toBe(true);
    expect(casaFiltro('aminu:*', 'aminu', 'nila')).toBe(true);
    expect(casaFiltro('aminu:*', 'nila', 'aminu')).toBe(false);
    expect(casaFiltro('*:nila,hayato:caio', 'caio', 'nila')).toBe(true);
    expect(casaFiltro('hayato:caio', 'caio', 'hayato')).toBe(false);
  });

  const reg = (idx: number, a: string, b: string, venc: 0 | 1, extra: Partial<Registro> = {}): Registro => ({
    idx, tipo: 'regular', a: a as never, b: b as never, nivel: 1, semente: idx, venc, travou: false, updates: 6000, ticks: 6000, rounds: 2, fim: ['ko', 'ko'],
    empates: 0, perfeitos: [0, 0], dano: [100, 80], golpes: [{ lp: [10, 6, 2] }, { lp: [8, 4, 1] }], chefe: [0, 0, 0], trocaFicha: [0, 0], parry: [0, 0], quebra: [0, 0],
    agarroes: [0, 0], clash: 0, carga: [[0, 0, 0], [0, 0, 0]], rebote: [0, 0], esquivas: [0, 0], esquivou: [0, 0], reboteFaixas: [[0, 0, 0, 0], [0, 0, 0, 0]], ...extra,
  });

  it('A vence B em 3 de 4 (um lado cada): taxa 75% dos DOIS lados somados; o outro, 25%', () => {
    const regs = [
      reg(0, 'hayato', 'caio', 0), // hayato P1 vence
      reg(1, 'hayato', 'caio', 0),
      reg(2, 'caio', 'hayato', 1), // hayato P2 vence
      reg(3, 'caio', 'hayato', 0), // caio P1 vence
    ];
    const agr = agregar(regs, ['hayato', 'caio'], 'baatar', PARAMS);
    expect(agr.matriz['hayato']?.['caio']?.taxa).toBe(0.75);
    expect(agr.matriz['caio']?.['hayato']?.taxa).toBe(0.25);
    expect(agr.porLutador['hayato']?.geral).toMatchObject({ k: 3, n: 4 });
    expect(agr.porLutador['hayato']?.comoP1).toMatchObject({ k: 2, n: 2 });
    expect(agr.porLutador['hayato']?.comoP2).toMatchObject({ k: 1, n: 2 });
    expect(agr.lado.p1).toMatchObject({ k: 3, n: 4 });
    expect(agr.golpes['hayato']?.['lp']).toEqual([36, 20, 6]); // 2 lutas como P1 (10/6/2 cada) + 2 como P2 (8/4/1 cada)
  });

  it('luta travada não conta vitória nem derrota', () => {
    const regs = [reg(0, 'hayato', 'caio', 0), reg(1, 'hayato', 'caio', 0, { travou: true, venc: null as never })];
    const agr = agregar(regs, ['hayato', 'caio'], 'baatar', PARAMS);
    expect(agr.porLutador['hayato']).toMatchObject({ lutas: 2, travadas: 1 });
    expect(agr.porLutador['hayato']?.geral).toMatchObject({ k: 1, n: 1 });
    expect(agr.total.travadas).toBe(1);
  });

  it('sinaliza taxa fora de 35-65%, par com Wilson > 65% e golpe usado e nunca conectado', () => {
    const regs: Registro[] = [];
    for (let i = 0; i < 40; i++) regs.push(reg(i, 'hayato', 'caio', 0, { golpes: [{ hp: [1, 0, 0] }, {}] }));
    const agr = agregar(regs, ['hayato', 'caio'], 'baatar', PARAMS);
    const a = acharOutliers(agr, []);
    expect(a.some((x) => x.categoria === 'taxa-geral' && x.alvo === 'hayato' && x.severidade === 'alerta')).toBe(true);
    expect(a.some((x) => x.categoria === 'par' && x.alvo === 'hayato x caio')).toBe(true);
    expect(a.some((x) => x.categoria === 'nunca-acerta' && x.alvo === 'hayato hp')).toBe(true);
  });
});

describe('"e se..." (--ajustes): ajusta em memória, não mexe nos dados do jogo', () => {
  it('muda hp/pow/golpe/projétil/chefe SÓ no elenco montado pedido; a definição estática e um elenco novo ficam intactos', () => {
    const outro = montarElenco();
    outro.baatar = montarBaatarChefe(); // os ajustes de `chefe` só valem em quem tem `chefe` (o BAATAR de produção não tem mais)
    aplicarAjustes(outro, {
      'wei-long': { hp: 90, pow: 1.01, moves: { hk: { dmg: 1 }, sFire: { proj: { dmg: 3 } }, sFwd: { armor: 0 } } },
      baatar: { chefe: { hpPorBarra: 33 } },
      'baatar/chefe': { pow: 0.5 },
    });
    expect(outro['wei-long'].hp).toBe(90);
    expect(outro['wei-long'].pow).toBe(1.01);
    expect(outro['wei-long'].moves.hk.dmg).toBe(1);
    expect(outro['wei-long'].moves.sFire.proj?.dmg).toBe(3);
    expect(outro['wei-long'].moves.sFire.proj?.sp).toBe(6.2); // o resto do projétil segue
    expect(outro['wei-long'].moves.sFwd.armor).toBe(0);
    expect(outro.baatar.chefe?.hpPorBarra).toBe(33);
    expect(outro.baatar.fichas['chefe']?.pow).toBe(0.5);
    // nada vazou para os dados estáticos nem para o elenco do outro teste
    expect(WEI_LONG.hp).toBe(101);
    expect(WEI_LONG.mods.hk?.dmg).toBe(14);
    expect((WEI_LONG.especiais.sFire.proj as { dmg: number }).dmg).toBe(20);
    expect(BAATAR_CHEFE.chefe?.hpPorBarra).toBe(40);
    expect(elenco['wei-long'].hp).toBe(101);
    expect(elenco['wei-long'].moves.sFire.proj?.dmg).toBe(20);
    expect(elenco.baatar.chefe?.hpPorBarra).toBe(46); // o elenco de produção: BAATAR guardião (R1), não o chefão antigo de 40
  });

  it('o ajuste muda o resultado da luta (e ajuste vazio não muda)', () => {
    const t = montarTarefas(ROSTER, 'baatar', { ...PARAMS, filtro: 'wei-long:hayato', sementes: 3 });
    const base = hashDosRegistros(rodarTarefas(elenco, t));
    const igual = montarElenco();
    aplicarAjustes(igual, {});
    expect(hashDosRegistros(rodarTarefas(igual, t))).toBe(base);
    const fraco = montarElenco();
    aplicarAjustes(fraco, { 'wei-long': { hp: 20 } });
    expect(hashDosRegistros(rodarTarefas(fraco, t))).not.toBe(base);
  });

  it('chave desconhecida falha ALTO (lutador, ficha, campo, golpe, valor inválido)', () => {
    const e = montarElenco();
    expect(() => aplicarAjustes(e, { fulano: { hp: 1 } })).toThrow(/desconhecido/);
    expect(() => aplicarAjustes(e, { 'nila/lagarto': { hp: 1 } })).toThrow(/ficha/);
    expect(() => aplicarAjustes(e, { hayato: { hp: -1 } })).toThrow(/número/);
    expect(() => aplicarAjustes(e, { hayato: { moves: { zzz: { dmg: 1 } } } })).toThrow(/golpe/);
    expect(() => aplicarAjustes(e, { hayato: { chefe: { hpPorBarra: 1 } } })).toThrow(/chefe/);
    expect(() => aplicarAjustes(e, { caio: { chefe: { hpPorBarra: 1 } } })).toThrow(/só vale na ficha base de quem é chefe/); // CAIO não tem bloco de chefe
    expect(() => aplicarAjustes(e, { baatar: { chefe: { danoRecebido: 0.8 } } })).not.toThrow(); // o BAATAR guardião (R1) tem
    e.baatar = montarBaatarChefe();
    expect(() => aplicarAjustes(e, { 'baatar/chefe': { chefe: { hpPorBarra: 1 } } })).toThrow(/só vale na ficha base de quem é chefe/);
    expect(() => aplicarAjustes(e, { hayato: { voar: 1 } as never })).toThrow(/campo/);
  });
});
