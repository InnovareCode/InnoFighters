import type { IdLutador } from '../core/contratos';

/*
 * FILME DO ESPECIAL (docs/spec-revisao-motor-luta-v2.md §3.4 e §4, fatia V2-3a): o dano de CADA especial que acerta e os ticks de
 * recuperação do atacante depois do filme. Só DADOS: nada no motor lê este arquivo ainda (a Vega liga na V2-3c). Fica FORA de
 * `LutadorDef.especiais` de propósito, como `apresentacao-especiais.ts`: o oráculo de fidelidade compara os especiais dos 4
 * originais com o protótipo campo a campo.
 *
 * Chave: `<lutador>` + ficha opcional + golpe. A ficha é procurada primeiro (NILA em SARPA, ZENON em `chefe2`); sem registro, vale o
 * da base (a ficha `chefe` do ZENON cai na base). `sResp` é o FOUETTÉ da CAMILLE (a resposta da PARADE). Sem linha, de propósito:
 * PARADE (sem acerto) e os dois VADIVU (troca de postura): não machucam, então nunca abrem filme.
 *
 * `dano` é o valor BASE: o efetivo da tabela do §4.3 dividido por `pow` da ficha (projétil não usa `pow`: o efetivo é o próprio
 * valor). O efetivo aprovado vai no comentário de cada linha, com o dano de hoje para comparar. A base tem 2 casas, então
 * `dano × pow` fica a menos de 0,01 do efetivo da tabela. Quem rebalancear mexe aqui, e `tests/unit/filmes-regra.test.ts` refaz a
 * conta das duas regras do §4.2 (>= 1,10 × hk da ficha e <= 26 por golpe) sobre estes números.
 *
 * `recuperacao` (spec §3.3) = 48 - clamp(vantagem no acerto de hoje, +16, +40), com a coluna "Vant. acerto" de
 * `docs/balanco/frame-data.json` (versão `FRAME_DATA_VERSAO`); especial que hoje não derruba entra como +16 (recuperação 32).
 * Projétil não usa: o atacante não é tocado pelo filme (§3.3); o valor existe só para o contrato ficar uniforme.
 *
 * Exceções com razão conhecida (pendência D-V2, o dono aprovou com o harness vigiando): GARKUWA, GOLPE MARMA e MASHI nível 1
 * sobem 1,8x a 2,9x porque a regra "maior que os normais" (>= 1,10 × hk) manda: escudo, atordoamento e toque sem carga têm dano
 * baixo por desenho. COUP D'ARRÊT está em 14,5 (a tabela do §4.3 trazia 14,0): 1,10 × hk da CAMILLE é 14,014, e 14,0 reprovava a
 * regra por 0,014; 14,5 é o próximo passo de 0,5.
 *
 * V2-6 (recalibração dos 10 com o motor v2 ligado, docs/balanco-motor-v2.md): o `pow` mudou em CAMILLE (0,98 -> 0,94), WEI LONG (0,93 -> 0,95), MIN-JI (0,90 -> 0,92),
 * CENTELLA (0,94 -> 0,95) e NILA GAJA (1,18 -> 1,15). As bases dos especiais que NÃO são projétil foram refeitas (efetivo da tabela ÷ pow novo) para que o efetivo decidido
 * (D-V3) continue o mesmo; projétil não usa `pow` e a SARPA não mudou. Exceções: COUP D'ARRÊT cai de 14,5 para 13,5 (o piso 1,10 × hk da CAMILLE caiu de 14,0 para 13,4) e os dois da NILA GAJA de 19,5 para 19,0 (piso 18,97).
 */

/** Versão dos dados/motor (`versaoDados`) do `frame-data.json` de onde saíram as `recuperacao`. */
export const FRAME_DATA_VERSAO = 'f6b9952cee5e';

/** Golpes que podem ter filme: os 3 especiais e a resposta da PARADE. */
export type GolpeComFilme = 'sFire' | 'sDown' | 'sFwd' | 'sResp';

export type FilmeDoGolpe = {
  /** Dano BASE do filme inteiro (antes de `pow`; projétil não usa `pow`). Uma linha da tabela do §4.3. */
  dano: number;
  /** MASHI: dano base por nível de carga (1..3); substitui `dano` quando o golpe tem `carga`. `dano` repete o nível 1. */
  danoPorNivel?: readonly [number, number, number];
  /** Distância final entre os dois (px). Padrão 150. */
  distancia?: number;
  /**
   * Dano BASE de HOJE (sem filme: a coluna "Hoje" do §4.3 ÷ o `pow` de antes da V2-6), na mesma convenção de `dano`. Só o A/B `?dano-filme=hoje|forte` e o
   * `--dano-filme` do harness leem; o padrão (`v2`) usa `dano`. MASHI: `hojePorNivel` por nível de carga.
   */
  hoje?: number;
  hojePorNivel?: readonly [number, number, number];
  /** Ticks do atacante depois do filme (§3.3). */
  recuperacao: number;
  /** Só visual (a UI escolhe a cena final); o motor trata as três como queda. */
  final?: 'derruba' | 'parede' | 'lanca';
};

type Tabela = Partial<Record<IdLutador, Partial<Record<string, FilmeDoGolpe>>>>;

const T: Tabela = {
  hayato: {
    sFire: { dano: 17.5, recuperacao: 8, hoje: 15.0 }, // RAIJIN-DAN, projétil, ef. 17,5 (hoje 15,0)
    sDown: { dano: 20.09, recuperacao: 32, hoje: 15.98 }, // RAIJIN-KEN, aéreo, ef. 21,5 (hoje 17,1)
    sFwd: { dano: 14.49, recuperacao: 32, hoje: 11.03 }, // KAMINARI-STEP, chão, ef. 15,5 (hoje 11,8)
  },
  'wei-long': {
    sFire: { dano: 23, recuperacao: 8, hoje: 20.0 }, // LONG ZHANG, projétil, ef. 23,0 (hoje 20,0)
    sDown: { dano: 15, recuperacao: 8, hoje: 13.0 }, // ZHEN DI, projétil, ef. 15,0 (hoje 13,0)
    sFwd: { dano: 23.16, recuperacao: 11, hoje: 19.03 }, // TIE SHAN KAO, chão, ef. 22,0 (hoje 17,7)
  },
  'min-ji': {
    sFire: { dano: 17.5, recuperacao: 8, hoje: 15.2 }, // BULKKOT (2 tiros), projétil, ef. 17,5 (hoje 15,2)
    sDown: { dano: 20.11, recuperacao: 8, hoje: 16.22 }, // HOERI CHAGI (3 acertos), aéreo, ef. 18,5 (hoje 14,6)
    sFwd: { dano: 14.67, recuperacao: 32, hoje: 12.0 }, // TWIO YEOP CHAGI, aéreo, ef. 13,5 (hoje 10,8)
  },
  caio: {
    sFire: { dano: 16, recuperacao: 8, hoje: 14.0 }, // ONDA VERDE, projétil, ef. 16,0 (hoje 14,0)
    sDown: { dano: 16.49, recuperacao: 8, hoje: 12.99 }, // RABO-DE-ARRAIA, chão, ef. 16,0 (hoje 12,6)
    sFwd: { dano: 17.53, recuperacao: 32, hoje: 14.02 }, // MEIA-LUA, aéreo, ef. 17,0 (hoje 13,6)
  },
  aminu: {
    // MASHI: ef. 17,0 / 22,0 / 26,0 (hoje 9,4 / 17,7 / 26,0). `recuperacao` é a do nível 2 (derruba, +46 em
    // `frame-data`); o nível 1 não derruba hoje e daria 32 pela regra do §3.3 (ver pendência no handoff da V2-3a).
    sFire: { dano: 14.41, danoPorNivel: [14.41, 18.64, 22.03], recuperacao: 8, hoje: 7.97, hojePorNivel: [7.97, 15.0, 22.03] },
    sDown: { dano: 14.41, recuperacao: 32, hoje: 5.0 }, // GARKUWA (acerto), chão, ef. 17,0 (hoje 5,9) ⚠ D-V2
    sFwd: { dano: 14.41, recuperacao: 32, hoje: 10.0 }, // PASSO DO LEÃO, chão, ef. 17,0 (hoje 11,8)
  },
  centella: {
    sFire: { dano: 17.37, recuperacao: 32, hoje: 14.04 }, // PLANCHA, aéreo, ef. 16,5 (hoje 13,2)
    sDown: { dano: 22.11, recuperacao: 32, hoje: 17.98 }, // HURACANRANA, agarrão, ef. 21,0 (hoje 16,9)
    sFwd: { dano: 19.47, recuperacao: 8, hoje: 15.53 }, // RESORTE, chão, ef. 18,5 (hoje 14,6)
  },
  camille: {
    sResp: { dano: 15.96, recuperacao: 8, hoje: 12.04 }, // PARADE -> FOUETTÉ, chão, ef. 15,0 (hoje 11,8)
    sDown: { dano: 14.36, recuperacao: 32, hoje: 8.57 }, // COUP D'ARRÊT, chão, ef. 13,5 (hoje 8,4; piso 1,10 × hk = 13,4 depois do pow 0,94 da V2-6; era 14,5 com pow 0,98)
    sFwd: { dano: 17.02, recuperacao: 32, hoje: 12.96 }, // REVERS, chão, ef. 16,0 (hoje 12,7)
  },
  nila: {
    // GAJA (ficha base, pow 1,18)
    sFire: { dano: 16.52, recuperacao: 32, hoje: 5.93 }, // GOLPE MARMA, chão, ef. 19,0 (hoje 7,0; era 19,5 com pow 1,18; piso 1,10 × hk = 19,0 com pow 1,15) ⚠ D-V2
    sFwd: { dano: 16.52, recuperacao: 32, hoje: 11.78 }, // PASSO DO ELEFANTE, chão, ef. 19,0 (hoje 13,9; era 19,5 com pow 1,18)
    // SARPA (pow 0,9)
    'sarpa/sFire': { dano: 11.11, recuperacao: 9, hoje: 8.0 }, // BOTE, chão, ef. 10,0 (hoje 7,2)
    'sarpa/sFwd': { dano: 17.78, recuperacao: 30, hoje: 14.0 }, // SALTO DA SERPENTE, aéreo, ef. 16,0 (hoje 12,6)
  },
  baatar: {
    sFire: { dano: 27.78, recuperacao: 10, hoje: 22.0 }, // ARREMESSO DO AVARGA, agarrão, ef. 25,0 (hoje 19,8)
    sDown: { dano: 17.78, recuperacao: 8, hoje: 14.0 }, // QUEBRA-BASE, chão, ef. 16,0 (hoje 12,6)
    sFwd: { dano: 16.67, recuperacao: 32, hoje: 10.0 }, // MERGULHO DA ÁGUIA, aéreo, ef. 15,0 (hoje 9,0)
  },
  zenon: {
    sFire: { dano: 16, recuperacao: 8, hoje: 14.0 }, // SELO DO ARCONTE, projétil, ef. 16,0 (hoje 14,0)
    sDown: { dano: 19, recuperacao: 23, hoje: 15.0 }, // COLUNA DE ÔNIX, aéreo, ef. 19,0 (hoje 15,0)
    sFwd: { dano: 14.5, recuperacao: 32, hoje: 10.0 }, // TRIBUTO, chão, ef. 14,5 (hoje 10,0)
    // Variantes da ficha de chefão (fase 2); a `chefe` (fase 1) cai na base. Não contam nas 33 linhas da tabela.
    'chefe2/sFire': { dano: 18.5, recuperacao: 8, hoje: 16.0 }, // SELO MAIOR, projétil, ef. 18,5 (hoje 16,0)
    'chefe2/sFwd': { dano: 17.5, recuperacao: 32, hoje: 14.0 }, // DECRETO, chão, ef. 17,5 (hoje 14,0)
  },
};

/**
 * A/B do dano do filme (D-V3, spec §4.5): `hoje` = o dano de antes do filme (a tabela `hoje`); `v2` = a tabela decidida (`dano`, o padrão); `forte` = o maior de
 * `hoje x 1,4` (projétil: `x 1,2`) e `1,2 x hk` da ficha. Ferramenta de A/B (URL `?dano-filme=` só em desenvolvimento; `--dano-filme` no harness): NÃO é o jogo.
 */
export type VarianteDoDano = 'hoje' | 'v2' | 'forte';
export const VARIANTES_DO_DANO: readonly VarianteDoDano[] = ['hoje', 'v2', 'forte'];

/**
 * O dano BASE (antes de `pow`; projétil não usa `pow`) do filme na variante pedida. `nivelCarga` 1..3 escolhe a entrada da MASHI; `pow` e `hkDmg` são os do atacante
 * (a base e o `dmg` do `hk` da ficha ativa). Pura. Sem `hoje` no dado (linha nova esquecida), `hoje` e `forte` caem em `v2`.
 */
export function danoBaseDaVariante(filme: FilmeDoGolpe, variante: VarianteDoDano, nivelCarga: number, projetil: boolean, pow: number, hkDmg: number): number {
  const nivel = Math.min(3, Math.max(1, nivelCarga)) - 1;
  const v2 = filme.danoPorNivel && nivelCarga >= 1 ? (filme.danoPorNivel[nivel] as number) : filme.dano;
  if (variante === 'v2') return v2;
  const hoje = filme.hojePorNivel && nivelCarga >= 1 ? (filme.hojePorNivel[nivel] as number) : (filme.hoje ?? v2);
  if (variante === 'hoje') return hoje;
  const fator = projetil ? 1 : pow;
  const efetivo = Math.max(hoje * fator * (projetil ? 1.2 : 1.4), 1.2 * hkDmg * pow);
  return efetivo / fator;
}

/** O filme do especial `golpe` do lutador `id` na ficha `ficha` (null = base), ou undefined se não há (PARADE e VADIVU não têm). */
export function filmeDoGolpe(id: IdLutador, ficha: string | null, golpe: string): FilmeDoGolpe | undefined {
  const t = T[id];
  if (!t) return undefined;
  if (ficha !== null) {
    const daFicha = t[`${ficha}/${golpe}`];
    if (daFicha) return daFicha;
  }
  return t[golpe];
}

/** Todos os registros, para teste e para quem quiser listar (id, ficha|null, golpe, filme). */
export function todosOsFilmes(): { id: IdLutador; ficha: string | null; golpe: GolpeComFilme; filme: FilmeDoGolpe }[] {
  const saida: { id: IdLutador; ficha: string | null; golpe: GolpeComFilme; filme: FilmeDoGolpe }[] = [];
  for (const [id, t] of Object.entries(T) as [IdLutador, Partial<Record<string, FilmeDoGolpe>>][]) {
    for (const [chave, filme] of Object.entries(t)) {
      if (!filme) continue;
      const [a, b] = chave.split('/');
      const ficha = b === undefined ? null : (a as string);
      const golpe = (b === undefined ? a : b) as GolpeComFilme;
      saida.push({ id, ficha, golpe, filme });
    }
  }
  return saida;
}
