import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import type { IdLutador } from '../../src/core/contratos';
import { BASE_MOVES } from '../../src/data/base-moves';
import { FRAME_DATA_VERSAO, filmeDoGolpe, todosOsFilmes, type FilmeDoGolpe, type GolpeComFilme } from '../../src/data/filmes';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import type { Golpe, LutadorDef, NomeGolpe } from '../../src/data/tipos';

/*
 * Regra do dano do especial com filme (docs/spec-revisao-motor-luta-v2.md §4.2, fatia V2-3a). Verifica os DADOS de `src/data/filmes.ts`
 * contra a ficha de cada lutador em `src/data/lutadores`, sem motor e sem ler `arte-fonte/`: o único arquivo de fora é o
 * `docs/balanco/frame-data.json` (gerado), para conferir `recuperacao`.
 *
 * Quando uma regra reprova, a causa é um número em `filmes.ts` (ou o hk/pow de uma ficha que mudou): a mensagem diz qual linha.
 */

const TETO_GOLPE = 26; // spec §4.1: nenhum golpe isolado passa de 26 (28% da menor vida comum, 92)
const PISO_SOBRE_HK = 1.1; // spec §4.2: dano limpo efetivo >= 1,10 × hk da ficha
const TOL = 1e-9;
/** Mediana de v2/hoje (spec §4.2 diz 1,27; o aceite da fatia V2-3a aceita de 1,20 a 1,35). */
const MEDIANA_MIN = 1.2;
const MEDIANA_MAX = 1.35;
/** Acima disto o aumento só é aceito se o piso de 1,10 × hk o forçou (pendência D-V2: GARKUWA, MARMA, MASHI nível 1, ...). */
const AUMENTO_SEM_EXPLICACAO = 1.5;

/** Corrida (px) com que `docs/balanco/frame-data.md` mede o RESORTE ("momento no acerto 375 px"). */
const REBOTE_REFERENCIA_PX = 375;

const ESCALA = (golpesJaRecebidos: number): number => Math.max(0.5, 1 - 0.1 * golpesJaRecebidos); // colisao.ts: escalaCombo
const SOMA_ESCALA = (n: number): number => Array.from({ length: n }, (_, i) => ESCALA(i)).reduce((a, b) => a + b, 0);

/** A ficha como o `montar.ts` a monta: o def base com os campos da ficha por cima (raso), sem `fichas`/`chefe`. */
function fichaMontada(def: LutadorDef, ficha: string | null): LutadorDef {
  if (ficha === null) return def;
  const f = def.fichas?.[ficha];
  if (!f) throw new Error(`${def.id}: ficha '${ficha}' inexistente`);
  const { fichas: _fichas, chefe: _chefe, ...base } = def;
  void _fichas;
  void _chefe;
  return { ...base, ...f, id: def.id };
}

/** O golpe como o motor o enxerga: especial do def, extras.sResp, ou o normal da tabela base com os `mods` da ficha. */
function golpeDe(d: LutadorDef, nome: string): Golpe | undefined {
  if (nome === 'sFire' || nome === 'sDown' || nome === 'sFwd') return d.especiais[nome];
  if (nome === 'sResp') return d.extras?.sResp;
  return { ...BASE_MOVES[nome as 'lp'], ...(d.mods[nome as NomeGolpe] ?? {}) };
}

/** O `hk` da ficha: dano limpo efetivo (dmg × pow) do chute forte. */
const hkDaFicha = (d: LutadorDef): number => (golpeDe(d, 'hk')?.dmg ?? 0) * d.pow;

/** O golpe machuca? PARADE (`aparar`) e VADIVU (`troca`) não têm dano e nunca conectam. */
function dmgDoGolpe(g: Golpe): number | undefined {
  return g.proj?.dmg ?? g.agarrao?.dmg ?? g.dmg;
}

/** O dano limpo de HOJE (sem escala de combo no 1º acerto; golpe de vários acertos/tiros soma a escala como o motor faz). */
function danoDeHoje(g: Golpe, pow: number, nivel: number | null): number {
  if (g.carga && nivel !== null) return (g.carga.porNivel[nivel - 1]?.dmg ?? NaN) * pow;
  if (g.proj) return g.proj.dmg * SOMA_ESCALA(g.shots?.length ?? 1);
  // RESORTE: o dano cresce com a ida (`dmgPorPx`); o frame-data mede com 375 px de corrida, e aqui vale a mesma referência.
  const doRebote = g.rebote ? g.rebote.dmgPorPx * REBOTE_REFERENCIA_PX : 0;
  return ((dmgDoGolpe(g) ?? NaN) + doRebote) * pow * SOMA_ESCALA(g.hits ?? 1);
}

type Linha = {
  rot: string;
  id: IdLutador;
  ficha: string | null; // a ficha do REGISTRO (null = base)
  golpe: GolpeComFilme;
  nivel: 1 | 2 | 3 | null;
  variante: boolean; // ficha de chefão que não conta nas 33 linhas da tabela
  filme: FilmeDoGolpe;
  /** Dano limpo efetivo do filme: base × pow (projétil não usa pow). */
  efetivo: number;
  hoje: number;
  hk: number;
  projetil: boolean;
};

/** As linhas da tabela do §4.3: uma por golpe, três para a MASHI (um por nível de carga). */
function linhas(): Linha[] {
  const saida: Linha[] = [];
  for (const { id, ficha, golpe, filme } of todosOsFilmes()) {
    const d = fichaMontada(LUTADORES[id], ficha);
    const g = golpeDe(d, golpe);
    if (!g) throw new Error(`${id}${ficha ? `/${ficha}` : ''}/${golpe}: golpe inexistente na ficha`);
    const projetil = g.proj !== undefined;
    const fator = projetil ? 1 : d.pow;
    const niveis: (1 | 2 | 3 | null)[] = filme.danoPorNivel ? [1, 2, 3] : [null];
    for (const nivel of niveis) {
      const dano = nivel === null ? filme.dano : (filme.danoPorNivel?.[nivel - 1] as number);
      saida.push({
        rot: `${id}${ficha ? `/${ficha}` : ''} ${golpe} (${g.name ?? '?'})${nivel ? ` nível ${nivel}` : ''}`,
        id, ficha, golpe, nivel,
        variante: ficha === 'chefe2',
        filme,
        efetivo: dano * fator,
        hoje: danoDeHoje(g, d.pow, nivel),
        hk: hkDaFicha(d),
        projetil,
      });
    }
  }
  return saida;
}

const mediana = (xs: number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? (s[m] as number) : ((s[m - 1] as number) + (s[m] as number)) / 2;
};

/** A menor barra de vida do elenco (a mesma conta de `balanco-adversarial.test.ts`): 46 hoje. */
const menorBarra = Math.min(...ROSTER.map((id) => LUTADORES[id].chefe?.hpPorBarra ?? LUTADORES[id].hp), ...ROSTER.map((id) => LUTADORES[id].hp));
const TRIPWIRE = menorBarra * 0.6; // 27,6

describe('filmes: cobertura (31 golpes + 2 variantes de chefão, e só quem machuca)', () => {
  const todos = todosOsFilmes();

  it('tem 33 registros (31 golpes da base e das fichas + 2 variantes `chefe2`) e 33 linhas da tabela do §4.3 sem as variantes', () => {
    expect(todos).toHaveLength(33);
    expect(todos.filter((r) => r.ficha === 'chefe2')).toHaveLength(2);
    expect(linhas().filter((l) => !l.variante)).toHaveLength(33); // 31 golpes, MASHI contada três vezes
    expect(linhas()).toHaveLength(35);
  });

  it('cada registro aponta para um golpe que existe na ficha e que machuca (nunca PARADE nem VADIVU)', () => {
    for (const { id, ficha, golpe } of todos) {
      const rot = `${id}${ficha ? `/${ficha}` : ''}/${golpe}`;
      const g = golpeDe(fichaMontada(LUTADORES[id], ficha), golpe);
      expect(g, `${rot} não existe`).toBeDefined();
      expect(g?.type, `${rot} é troca de postura`).not.toBe('troca');
      expect(g?.type, `${rot} é PARADE`).not.toBe('aparar');
      expect(dmgDoGolpe(g as Golpe), `${rot} não tem dano`).toBeGreaterThan(0);
    }
  });

  it('todo especial que machuca, em toda ficha, tem filme (direto ou herdado da base); os dois VADIVU e a PARADE não', () => {
    let comFilme = 0;
    for (const id of ROSTER) {
      const def = LUTADORES[id];
      for (const ficha of [null, ...Object.keys(def.fichas ?? {})]) {
        const d = fichaMontada(def, ficha);
        for (const golpe of ['sFire', 'sDown', 'sFwd', 'sResp'] as const) {
          const g = golpeDe(d, golpe);
          if (!g) continue;
          const rot = `${id}${ficha ? `/${ficha}` : ''}/${golpe} (${g.name})`;
          const machuca = g.type !== 'troca' && g.type !== 'aparar' && dmgDoGolpe(g) !== undefined;
          const f = filmeDoGolpe(id, ficha, golpe);
          if (machuca) {
            expect(f, `${rot} machuca e está sem filme`).toBeDefined();
            comFilme++;
          } else {
            expect(f, `${rot} não machuca e tem filme`).toBeUndefined();
          }
        }
      }
    }
    // Além dos 33 registros, as fichas que herdam da base também contam (`chefe` do ZENON, COLUNA DE ÔNIX da `chefe2`).
    expect(comFilme).toBeGreaterThanOrEqual(todos.length);
  });

  it('o MASHI é o único com dano por nível, e o nível 1 é o `dano` do registro (crescente: 1 < 2 < 3)', () => {
    const comNiveis = todos.filter((r) => r.filme.danoPorNivel);
    expect(comNiveis.map((r) => `${r.id}/${r.golpe}`)).toEqual(['aminu/sFire']);
    for (const r of comNiveis) {
      const n = r.filme.danoPorNivel as readonly [number, number, number];
      const g = golpeDe(fichaMontada(LUTADORES[r.id], r.ficha), r.golpe) as Golpe;
      expect(g.carga?.porNivel, `${r.id} sem carga`).toHaveLength(3);
      expect(r.filme.dano).toBe(n[0]);
      expect(n[0]).toBeLessThan(n[1]);
      expect(n[1]).toBeLessThan(n[2]);
    }
  });
});

describe('filmes: regra do dano (spec §4.2)', () => {
  const todas = linhas();

  it('maior que os normais: o dano limpo efetivo é >= 1,10 × hk da ficha (hk = o chute forte efetivo)', () => {
    for (const l of todas) {
      expect(l.efetivo, `${l.rot}: efetivo ${l.efetivo.toFixed(3)} < 1,10 × hk ${(PISO_SOBRE_HK * l.hk).toFixed(3)} (hk ${l.hk.toFixed(2)})`)
        .toBeGreaterThanOrEqual(PISO_SOBRE_HK * l.hk - TOL);
    }
  });

  it('nenhum golpe isolado passa de 26, e o tripwire de hoje (60% da menor barra = 27,6) fica como está', () => {
    expect(menorBarra).toBe(46); // se a menor barra mudar, o tripwire muda junto: revisar §4.2 antes de seguir
    expect(TRIPWIRE).toBeCloseTo(27.6, 9);
    for (const l of todas) {
      expect(l.efetivo, `${l.rot}: ${l.efetivo.toFixed(3)} > ${TETO_GOLPE}`).toBeLessThanOrEqual(TETO_GOLPE + TOL);
      expect(l.efetivo, `${l.rot}: ${l.efetivo.toFixed(3)} >= tripwire ${TRIPWIRE}`).toBeLessThan(TRIPWIRE);
    }
  });

  it('o número é o da tabela: o efetivo cai em múltiplo de 0,5 (a base tem 2 casas, então a menos de 0,01)', () => {
    for (const l of todas) {
      const alvo = Math.round(l.efetivo * 2) / 2;
      expect(Math.abs(l.efetivo - alvo), `${l.rot}: efetivo ${l.efetivo.toFixed(4)} longe de ${alvo}`).toBeLessThan(0.01);
    }
  });

  it('nenhum especial isolado perde dano em relação a hoje (v2/hoje >= 1)', () => {
    for (const l of todas) {
      expect(l.efetivo / l.hoje, `${l.rot}: hoje ${l.hoje.toFixed(2)} -> v2 ${l.efetivo.toFixed(2)}`).toBeGreaterThanOrEqual(1 - TOL);
    }
  });

  it('aumento acima de 1,5× só existe onde o piso de 1,10 × hk o força (D-V2): ali o efetivo está a menos de 0,5 do piso', () => {
    const fortes = todas.filter((l) => l.efetivo / l.hoje > AUMENTO_SEM_EXPLICACAO);
    expect(fortes.length).toBeGreaterThan(0); // o teste enxerga os casos de verdade
    for (const l of fortes) {
      const folga = l.efetivo - PISO_SOBRE_HK * l.hk;
      expect(folga, `${l.rot}: ${(l.efetivo / l.hoje).toFixed(2)}× sem o piso explicar (folga ${folga.toFixed(2)})`).toBeLessThan(0.5);
    }
    // Os três que a spec marca com ⚠, com o fator que a regra literal dá (registrado para o harness vigiar).
    const fator = (rot: RegExp): number => {
      const l = todas.find((x) => rot.test(x.rot));
      if (!l) throw new Error(`linha ${String(rot)} não achada`);
      return l.efetivo / l.hoje;
    };
    expect(fator(/aminu sDown \(GARKUWA\)/)).toBeGreaterThan(2.8);
    expect(fator(/nila sFire \(GOLPE MARMA\)/)).toBeGreaterThan(2.7);
    expect(fator(/aminu sFire \(MASHI\) nível 1/)).toBeGreaterThan(1.75);
    expect(fator(/aminu sFire \(MASHI\) nível 1/)).toBeLessThan(1.9);
  });

  it('a mediana de v2/hoje fica entre 1,20 e 1,35 (nas 33 linhas da tabela e também com as 2 variantes)', () => {
    const fatores = (ls: Linha[]): number[] => ls.map((l) => l.efetivo / l.hoje);
    const nas33 = mediana(fatores(todas.filter((l) => !l.variante)));
    const nas35 = mediana(fatores(todas));
    expect(nas33).toBeGreaterThanOrEqual(MEDIANA_MIN);
    expect(nas33).toBeLessThanOrEqual(MEDIANA_MAX);
    expect(nas35).toBeGreaterThanOrEqual(MEDIANA_MIN);
    expect(nas35).toBeLessThanOrEqual(MEDIANA_MAX);
  });
});

describe('filmes: recuperação (spec §3.3), gerada do frame-data', () => {
  type LinhaFD = { lutador: string; ficha: string | null; golpe: string; variante: string | null; derruba: boolean; vantagemAcerto: number | null };
  const fd = JSON.parse(readFileSync(fileURLToPath(new URL('../../docs/balanco/frame-data.json', import.meta.url)), 'utf8')) as {
    versaoDados: string;
    linhas: LinhaFD[];
  };

  /** recuperação = 48 - clamp(vantagem no acerto, +16, +40); quem hoje não derruba entra como +16. */
  const recuperacaoDe = (l: LinhaFD): number => 48 - Math.min(40, Math.max(16, l.derruba ? (l.vantagemAcerto as number) : 16));

  it('toda recuperação é um inteiro entre 8 e 32 (48 menos a vantagem presa em +16..+40)', () => {
    for (const { id, ficha, golpe, filme } of todosOsFilmes()) {
      const rot = `${id}${ficha ? `/${ficha}` : ''}/${golpe}`;
      expect(Number.isInteger(filme.recuperacao), `${rot} recuperacao ${filme.recuperacao}`).toBe(true);
      expect(filme.recuperacao, rot).toBeGreaterThanOrEqual(8);
      expect(filme.recuperacao, rot).toBeLessThanOrEqual(32);
    }
  });

  it('bate com a fórmula sobre a coluna "Vant. acerto" do frame-data (confere de verdade enquanto o frame-data for a versão de onde saíram)', () => {
    if (fd.versaoDados !== FRAME_DATA_VERSAO) {
      // O frame-data foi regerado com outros dados/motor: a conta de 2026-10-21 não vale mais. Não reprova a suíte (o CAIO e o WEI
      // LONG estão em obra), mas a fatia que mexer nisto precisa regerar `recuperacao` e atualizar FRAME_DATA_VERSAO.
      console.warn(`filmes-regra: frame-data na versão ${fd.versaoDados}, filmes.ts gerado da ${FRAME_DATA_VERSAO}: regerar recuperacao`);
      return;
    }
    for (const { id, ficha, golpe, filme } of todosOsFilmes()) {
      const rot = `${id}${ficha ? `/${ficha}` : ''}/${golpe}`;
      // MASHI: a recuperação do registro é a do nível 2 (derruba); o nível 1 daria 32 (não derruba hoje).
      const variante = filme.danoPorNivel ? 'nível 2' : null;
      const achada = fd.linhas.find((x) => x.lutador === id && (x.ficha ?? null) === ficha && x.golpe === golpe && (x.variante ?? null) === variante);
      expect(achada, `${rot}: sem linha no frame-data`).toBeDefined();
      expect(filme.recuperacao, `${rot}: frame-data pede ${recuperacaoDe(achada as LinhaFD)}`).toBe(recuperacaoDe(achada as LinhaFD));
    }
  });
});
