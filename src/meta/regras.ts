import { IDS_LUTADORES, type IdLutador } from '../core/contratos';
import type { MotorV2 } from '../core/contratos';
import { VARIANTES_DO_DANO, type VarianteDoDano } from '../data/filmes';
import type { Regras, Ritmo } from './tipos';

/**
 * Motor de luta v2 (docs/spec-revisao-motor-luta-v2.md), V2-6: as três mecânicas SEMPRE ligadas por padrão (ordem do dono), inclusive em
 * `?expansao=4` e no trailer. É o que `REGRAS_PADRAO` carrega e o que a regravação do harness (`npm run balanco`) mede. O motor em si
 * (`ConfigPartida.motorV2` ausente) continua o de antes, bit a bit: é o que os testes de fidelidade ao protótipo e o oráculo CPU x CPU fixam.
 */
export const MOTOR_V2_PADRAO: Readonly<Required<Omit<MotorV2, 'danoFilme'>>> = Object.freeze({ entradaNoHitstop: true, filmes: true, combos: true });

/** Nomes das flags na URL (`?motorv2=entrada,filmes`) e nas ferramentas, na ordem de `MotorV2`. */
export const NOMES_MOTOR_V2: Readonly<Record<string, 'entradaNoHitstop' | 'filmes' | 'combos'>> = Object.freeze({ entrada: 'entradaNoHitstop', filmes: 'filmes', combos: 'combos' });

/** Liberados de fabrica (decisao do dono): HAYATO, WEI LONG, MIN-JI, CAIO. */
export const INICIAIS: readonly IdLutador[] = ['hayato', 'wei-long', 'min-ji', 'caio'];

/**
 * Ordem aprovada pelo dono: AMINU, CENTELLA, CAMILLE, NILA, BAATAR. A cada Arcade zerado libera-se o primeiro da fila
 * ainda nao liberado (`aplicarVitoriaArcade`); as regras e os testes cobrem fila de qualquer tamanho. Quem ja liberou o
 * BAATAR ao derrota-lo como chefe nao perde nada: `proximoDaFila` pula quem ja esta liberado.
 */
export const FILA_DESBLOQUEIO: readonly IdLutador[] = ['aminu', 'centella', 'camille', 'nila', 'baatar'];

/**
 * Chefao FINAL: ZENON ARGYROS, "O Arconte" (docs/spec-chefao-zenon.md). O BAATAR virou lutador normal (5o da fila). Derrotado, o
 * ZENON e jogavel (D-Z1); jogando COM ele nao ha luta de chefe (ED7). Com `chefesDaFila`, e o chefao so quando os 5 da fila
 * ja estao liberados (`chefeDoArcade`); antes, o chefao e o proximo guardiao.
 */
export const CHEFE: IdLutador | null = 'zenon';

/** Rivais sorteados antes do chefao (ED4: 5 rivais + chefao = 6 lutas; sem chefao, a escada tem 5 etapas). */
export const TAMANHO_ESCADA = 5;

export const REGRAS_PADRAO: Regras = {
  roster: IDS_LUTADORES,
  iniciais: INICIAIS,
  fila: FILA_DESBLOQUEIO,
  chefe: CHEFE,
  tamanhoEscada: TAMANHO_ESCADA,
  travadosNaEscada: true, // ED5: vitrine, da vontade de liberar
  esquiva: true,
  cinematica: true,
  // L1: o chefao do ARCADE e o proximo guardiao da fila (`chefeDoArcade`) e derrota-lo o libera (`aplicarVitoriaArcade({ chefe })`,
  // chamado pelo fim.ts com o id da ETAPA). O ZENON so e o chefao com os 5 guardioes liberados. Chave de rollback: `false`.
  chefesDaFila: true,
  temasMusicais: true,
  // o trailer de abertura (montagem no motor do jogo); a CenaIntro de hoje segue como queda e como oráculo de pixel do ?expansao=4
  trailer: true,
  // V2-6: o motor v2 inteiro (entrada no hitstop, filme do especial, combos próprios), sempre ligado. Rollback/A-B: `?motorv2=0` (`regrasComMotorV2`).
  motorV2: MOTOR_V2_PADRAO,
};

/**
 * O pedaço da `ConfigPartida` que carrega as flags do motor v2 (`Regras.motorV2`). Sem flag nenhuma ligada devolve `{}`: a cfg fica idêntica
 * à de antes (nem a chave `motorV2` aparece), o que mantém os testes que comparam a cfg inteira.
 */
export function cfgMotorV2(regras: { readonly motorV2?: MotorV2 }): { motorV2?: MotorV2 } {
  const m = regras.motorV2;
  return m && Object.values(m).some((v) => v === true) ? { motorV2: m } : {};
}

/**
 * Chave de rollback e de A/B do motor v2 pela URL (`?motorv2=`), a ÚNICA porta de desligar uma flag em produção:
 *  - ausente, vazio ou `1` -> o padrão (tudo ligado);
 *  - `0`, `off`, `false` ou `nao` -> tudo desligado (o motor de antes, bit a bit);
 *  - lista (`entrada,filmes,combos`, em qualquer ordem) -> só essas ligadas (A/B de uma mecânica).
 * Valor desconhecido (`?motorv2=xyz`, nome de flag errado) NÃO desliga nada por engano: cai no padrão. Pura; quem a chama é o `main.ts`.
 */
export function motorV2DaUrl(busca: string): MotorV2 {
  const bruto = new URLSearchParams(busca).get('motorv2');
  if (bruto === null) return { ...MOTOR_V2_PADRAO };
  const v = bruto.trim().toLowerCase();
  if (v === '' || v === '1' || v === 'on' || v === 'true' || v === 'sim') return { ...MOTOR_V2_PADRAO };
  if (v === '0' || v === 'off' || v === 'false' || v === 'nao' || v === 'não') return {};
  const nomes = v.split(',').map((x) => x.trim()).filter(Boolean);
  if (nomes.length === 0 || !nomes.every((n) => Object.hasOwn(NOMES_MOTOR_V2, n))) return { ...MOTOR_V2_PADRAO };
  const m: MotorV2 = {};
  for (const n of nomes) m[NOMES_MOTOR_V2[n]!] = true;
  return m;
}

/**
 * As regras do jogo com o motor v2 resolvido pela URL (`dev` libera o A/B `?dano-filme=`). Vale para QUALQUER base (`REGRAS_PADRAO`, `?expansao=1`, `?expansao=4`): a flag do motor
 * não depende do modo de elenco. Não muta a entrada.
 */
export function regrasComMotorV2(regras: Regras, busca: string, dev = false): Regras {
  const motor = motorV2DaUrl(busca);
  const ab = dev ? danoFilmeDaUrl(busca) : undefined;
  return { ...regras, motorV2: ab ? { ...motor, danoFilme: ab } : motor };
}

/** Nomes das flags de `Ritmo` na URL (`?ritmo=tarja,provocacao`), na ordem do contrato (docs/spec-redesenho-jogabilidade.md §4). */
export const NOMES_RITMO: Readonly<Record<string, keyof Ritmo>> = Object.freeze({
  tarja: 'tarja',
  provocacao: 'provocacao',
  intervalos: 'intervalos',
  filmerestrito: 'filmeRestrito',
  super: 'super',
  cadeia: 'cadeia',
  cpu: 'cpu',
  impacto: 'impacto',
});

/** Todas as flags do ritmo ligadas (`?ritmo=1`, prévia do dono). */
export const RITMO_TUDO_LIGADO: Readonly<Required<Ritmo>> = Object.freeze({
  tarja: true,
  provocacao: true,
  intervalos: true,
  filmeRestrito: true,
  super: true,
  cadeia: true,
  cpu: true,
  impacto: true,
});

/**
 * Kill switch e A/B do redesenho de ritmo pela URL (`?ritmo=`), no mesmo molde de `motorV2DaUrl` — com uma diferença: o PADRÃO
 * (ausente) é tudo DESLIGADO (o jogo de hoje), porque cada onda nasce em produção desligada e só o dono a liga depois de jogar:
 *  - ausente -> `{}` (nada ligado, o jogo de hoje);
 *  - `1`, `on`, `true` ou `sim` -> tudo ligado (a prévia completa);
 *  - `0`, `off`, `false`, `nao` ou `não` -> `{}` (explícito, igual ao ausente);
 *  - lista (`tarja,provocacao`, em qualquer ordem) -> só essas ligadas (A/B de uma mecânica).
 * Valor desconhecido (`?ritmo=xyz`, nome de flag errado) cai em `{}`: nunca liga nada por acidente de digitação.
 */
export function ritmoDaUrl(busca: string): Ritmo {
  const bruto = new URLSearchParams(busca).get('ritmo');
  if (bruto === null) return {};
  const v = bruto.trim().toLowerCase();
  if (v === '' || v === '1' || v === 'on' || v === 'true' || v === 'sim') return { ...RITMO_TUDO_LIGADO };
  if (v === '0' || v === 'off' || v === 'false' || v === 'nao' || v === 'não') return {};
  const nomes = v.split(',').map((x) => x.trim()).filter(Boolean);
  if (nomes.length === 0 || !nomes.every((n) => Object.hasOwn(NOMES_RITMO, n))) return {};
  const r: Ritmo = {};
  for (const n of nomes) r[NOMES_RITMO[n]!] = true;
  return r;
}

/** As regras com o ritmo resolvido pela URL. Vale para QUALQUER base, como `regrasComMotorV2`. Não muta a entrada. */
export function regrasComRitmo(regras: Regras, busca: string): Regras {
  return { ...regras, ritmo: ritmoDaUrl(busca) };
}

/**
 * A/B do dano do filme pela URL (`?dano-filme=hoje|v2|forte`, D-V3): ferramenta de desenvolvimento, por isso o `main.ts` só passa `dev` em `import.meta.env.DEV`.
 * Valor desconhecido = ignorado (a tabela decidida). `v2` é o padrão e não vira chave.
 */
export function danoFilmeDaUrl(busca: string): VarianteDoDano | undefined {
  const v = new URLSearchParams(busca).get('dano-filme')?.trim().toLowerCase();
  return v && v !== 'v2' && (VARIANTES_DO_DANO as readonly string[]).includes(v) ? (v as VarianteDoDano) : undefined;
}
