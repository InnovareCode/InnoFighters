import { IDS_LUTADORES, type IdLutador } from '../core/contratos';
import type { FluidezMotor, MotorV2, RitmoMotor } from '../core/contratos';
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

/**
 * Redesenho de ritmo (docs/spec-redesenho-jogabilidade.md §4): o dono jogou com `?ritmo=1`, aprovou, e as 4 ondas já entregues e
 * provadas (R-1/R-2 tarja+provocação, R-6 intervalos+filmeRestrito) viram PADRÃO — molde igual a `MOTOR_V2_PADRAO` acima. Por ordem do dono
 * (24/10/2026) o super (R-7/R-7b) e a CPU do super (R-10) entram no padrão também, sob prova final da Íris (se o super reprovar, voltam
 * a sair daqui). A cadeia por força (R-8) entrou no padrão com o R-12 (25/10/2026): combos de 3+ golpes em 55% (NORMAL) e 93% (DIFÍCIL) das lutas
 * da CPU, os 10 lutadores em 44-57% e os chefões na rampa (docs/balanco-motor-v2.md). Só `impacto` (R-17, opcional) segue desligada; entra por `?ritmo=1`
 * (prévia completa, `RITMO_TUDO_LIGADO`) ou por nome na lista. `?ritmo=0` continua o rollback total (`ritmoDaUrl` abaixo).
 */
export const RITMO_PADRAO: Readonly<Ritmo> = Object.freeze({ tarja: true, provocacao: true, intervalos: true, filmeRestrito: true, super: true, cadeia: true, cpu: true });

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

/**
 * Fluidez do motor (auditoria de 24/10/2026): o dono sentiu "golpes com muitos delays" no Android e mandou deixar tudo LIGADO. Molde de `MOTOR_V2_PADRAO`: ausente = o motor
 * de antes, bit a bit; rollback/A-B pela URL (`?fluidez=0`, `?fluidez=par,dash`).
 *  - parSuper (M1): o forte do par do super sai no mesmo tick (antes esperava 3 ticks com a barra cheia) e é promovido a super se o par fecha;
 *  - dashCancela (M2): ataque cancela o dash e o buffer não expira dentro dele (antes um golpe nos 8 primeiros ticks do dash se perdia);
 *  - semDashNoToque (M5): no celular o humano não tem duplo toque de dash (a esquiva cobre);
 *  - fila (M3): buffer de 2 vagas, em ordem de chegada;
 *  - agarraoPar (M6): SOCO FRACO + CHUTE FRACO agarram (no teclado/controle o → + SOCO FORTE segue valendo);
 *  - dados (D1): BAATAR ARREMESSO DO AVARGA R 36 -> 28.
 * `semAgarraoPorFrente` (M6, tira o → + SOCO FORTE do humano no toque) fica DESLIGADO até existir o botão AGARRAR no toque (`data-k="z,c"`): sem ele o celular perderia o agarrão.
 */
export const FLUIDEZ_PADRAO: Readonly<Required<Omit<FluidezMotor, 'toque'>>> = Object.freeze({
  parSuper: true,
  dashCancela: true,
  semDashNoToque: true,
  fila: true,
  agarraoPar: true,
  semAgarraoPorFrente: false,
  dados: true,
});

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
  // redesenho de ritmo: tarja, provocação, intervalos, filmeRestrito, super e cpu sempre ligados (ordem do dono, 24/10/2026). Rollback/A-B: `?ritmo=0`/`?ritmo=<lista>` (`regrasComRitmo`).
  ritmo: RITMO_PADRAO,
  // fluidez do motor: par do super sem espera, dash cancelável, fila de botões, agarrão por par, dados do BAATAR (ordem do dono, 24/10/2026). Rollback/A-B: `?fluidez=0` (`regrasComFluidez`).
  fluidez: FLUIDEZ_PADRAO,
};

/**
 * O pedaço da `ConfigPartida` que carrega as flags do motor v2 (`Regras.motorV2`). Sem flag nenhuma ligada devolve `{}`: a cfg fica idêntica
 * à de antes (nem a chave `motorV2` aparece), o que mantém os testes que comparam a cfg inteira.
 */
export function cfgMotorV2(regras: { readonly motorV2?: MotorV2; readonly fluidez?: FluidezMotor }): { motorV2?: MotorV2; fluidez?: FluidezMotor } {
  const m = regras.motorV2;
  return { ...(m && Object.values(m).some((v) => v === true) ? { motorV2: m } : {}), ...cfgFluidez(regras) };
}

/**
 * O pedaço de `Regras.fluidez` que o motor lê (`ConfigPartida.fluidez`). Sem flag nenhuma ligada (só `toque` não conta, ele sozinho não muda nada) devolve `{}`: a cfg fica idêntica
 * à de antes. `cfgMotorV2` já o inclui: os três lugares que montam a `ConfigPartida` (`select.ts`, `diff.ts`, `campanha.ts`) herdam a fluidez sem mudar.
 */
export function cfgFluidez(regras: { readonly fluidez?: FluidezMotor }): { fluidez?: FluidezMotor } {
  const f = regras.fluidez;
  return f && Object.entries(f).some(([k, v]) => k !== 'toque' && v === true) ? { fluidez: f } : {};
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

/** Nomes das flags de `FluidezMotor` na URL (`?fluidez=par,dash`). */
export const NOMES_FLUIDEZ: Readonly<Record<string, keyof FluidezMotor>> = Object.freeze({
  par: 'parSuper',
  dash: 'dashCancela',
  semdash: 'semDashNoToque',
  fila: 'fila',
  agarrao: 'agarraoPar',
  semfrente: 'semAgarraoPorFrente',
  dados: 'dados',
});

/**
 * Kill switch e A/B da fluidez pela URL (`?fluidez=`), no molde de `motorV2DaUrl`:
 *  - ausente, vazio, `1`, `on`, `true` ou `sim` -> o padrão (`FLUIDEZ_PADRAO`);
 *  - `0`, `off`, `false`, `nao` ou `não` -> `{}` (o motor de antes, bit a bit);
 *  - lista (`par,dash,fila,agarrao,semdash,semfrente,dados`, em qualquer ordem) -> só essas ligadas;
 *  - valor desconhecido NÃO desliga nada por engano: cai no padrão.
 */
export function fluidezDaUrl(busca: string): FluidezMotor {
  const bruto = new URLSearchParams(busca).get('fluidez');
  if (bruto === null) return { ...FLUIDEZ_PADRAO };
  const v = bruto.trim().toLowerCase();
  if (v === '' || v === '1' || v === 'on' || v === 'true' || v === 'sim') return { ...FLUIDEZ_PADRAO };
  if (v === '0' || v === 'off' || v === 'false' || v === 'nao' || v === 'não') return {};
  const nomes = v.split(',').map((x) => x.trim()).filter(Boolean);
  if (nomes.length === 0 || !nomes.every((n) => Object.hasOwn(NOMES_FLUIDEZ, n))) return { ...FLUIDEZ_PADRAO };
  const f: FluidezMotor = {};
  for (const n of nomes) f[NOMES_FLUIDEZ[n]!] = true;
  return f;
}

/**
 * As regras com a fluidez resolvida pela URL. `toque` = o aparelho tem tela de toque (`temToque(window)`): vira `fluidez.toque` quando há alguma flag ligada, e é o sinal que
 * faz valer `semDashNoToque`/`semAgarraoPorFrente`. Vale para QUALQUER base (`?expansao=4` inclusive). Não muta a entrada.
 */
export function regrasComFluidez(regras: Regras, busca: string, toque = false): Regras {
  const f = fluidezDaUrl(busca);
  return { ...regras, fluidez: toque && Object.keys(f).length > 0 ? { ...f, toque: true } : f };
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
 * Kill switch e A/B do redesenho de ritmo pela URL (`?ritmo=`), no mesmo molde de `motorV2DaUrl` desde que o dono aprovou jogando com
 * `?ritmo=1` (24/10/2026): o PADRÃO (ausente) passou a ser `RITMO_PADRAO`, não mais `{}`.
 *  - ausente -> `{ ...RITMO_PADRAO }` (tarja, provocação, intervalos, filmeRestrito, super, cadeia, cpu — o jogo aprovado);
 *  - `1`, `on`, `true` ou `sim` -> tudo ligado (`RITMO_TUDO_LIGADO`, inclusive o impacto, que o motor ainda não implementa);
 *  - `0`, `off`, `false`, `nao` ou `não` -> `{}` (rollback total);
 *  - lista (`tarja,provocacao`, em qualquer ordem) -> só essas ligadas (A/B de uma mecânica), substituindo o padrão inteiro.
 * Valor desconhecido (`?ritmo=xyz`, nome de flag errado) cai no PADRÃO (`RITMO_PADRAO`): nunca liga o que não foi provado por
 * acidente de digitação, mas também não desliga sozinho o que já é produção.
 */
export function ritmoDaUrl(busca: string): Ritmo {
  const bruto = new URLSearchParams(busca).get('ritmo');
  if (bruto === null) return { ...RITMO_PADRAO };
  const v = bruto.trim().toLowerCase();
  if (v === '' || v === '1' || v === 'on' || v === 'true' || v === 'sim') return { ...RITMO_TUDO_LIGADO };
  if (v === '0' || v === 'off' || v === 'false' || v === 'nao' || v === 'não') return {};
  const nomes = v.split(',').map((x) => x.trim()).filter(Boolean);
  if (nomes.length === 0 || !nomes.every((n) => Object.hasOwn(NOMES_RITMO, n))) return { ...RITMO_PADRAO };
  const r: Ritmo = {};
  for (const n of nomes) r[NOMES_RITMO[n]!] = true;
  return r;
}

/** As regras com o ritmo resolvido pela URL. Vale para QUALQUER base, como `regrasComMotorV2`. Não muta a entrada. */
export function regrasComRitmo(regras: Regras, busca: string): Regras {
  return { ...regras, ritmo: ritmoDaUrl(busca) };
}

/** Nomes das 6 flags de `RitmoMotor` (as de `Ritmo` que o motor lê), para `cfgRitmo` não listar `tarja`/`provocacao` (só UI) duas vezes. */
const NOMES_RITMO_MOTOR = ['intervalos', 'filmeRestrito', 'super', 'cadeia', 'cpu', 'impacto'] as const satisfies readonly (keyof RitmoMotor)[];

/**
 * R-6: o pedaço de `Regras.ritmo` que o MOTOR lê (`ConfigPartida.ritmo`), no molde de `cfgMotorV2` — só as 6 flags de
 * `RitmoMotor` (`tarja`/`provocacao` ficam de fora: são só UI, lidas direto de `Regras.ritmo` por `fight.ts`, como já
 * está). Sem flag nenhuma ligada devolve `{}`: a cfg fica idêntica à de antes (nem a chave `ritmo` aparece), o que mantém
 * os hashes/snapshots de hoje. Chame junto de `cfgMotorV2(regras)` nos mesmos lugares que montam `ConfigPartida`
 * (`select.ts`, `diff.ts`, `campanha.ts`).
 */
export function cfgRitmo(regras: { readonly ritmo?: Ritmo }): { ritmo?: RitmoMotor } {
  const r = regras.ritmo;
  if (!r) return {};
  const m: RitmoMotor = {};
  for (const n of NOMES_RITMO_MOTOR) if (r[n] === true) m[n] = true;
  return Object.keys(m).length > 0 ? { ritmo: m } : {};
}

/**
 * A/B do dano do filme pela URL (`?dano-filme=hoje|v2|forte`, D-V3): ferramenta de desenvolvimento, por isso o `main.ts` só passa `dev` em `import.meta.env.DEV`.
 * Valor desconhecido = ignorado (a tabela decidida). `v2` é o padrão e não vira chave.
 */
export function danoFilmeDaUrl(busca: string): VarianteDoDano | undefined {
  const v = new URLSearchParams(busca).get('dano-filme')?.trim().toLowerCase();
  return v && v !== 'v2' && (VARIANTES_DO_DANO as readonly string[]).includes(v) ? (v as VarianteDoDano) : undefined;
}
