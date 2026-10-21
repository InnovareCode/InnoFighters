import type { Anim, Golpe, LutadorDef, NomeGolpe } from './tipos';

/*
 * Animação de cada golpe (BASE_ANIM / TYPE_ANIM / CHAR_ANIM do protótipo, linhas 570-594).
 * s = quadros da preparação, a = ativos, r = recuperação (distribuídos pela duração de
 * cada fase). loop = troca de quadro a cada N ticks na fase ativa; fall = quadro ao cair
 * (golpes aéreos).
 */
export const BASE_ANIM: Readonly<Partial<Record<NomeGolpe, Anim>>> = {
  lp: { s: ['lp0'], a: ['lp1'], r: ['lp1', 'lp0'] },
  hp: { s: ['hp0'], a: ['hp1'], r: ['hp1', 'hp1', 'hp0'] },
  lk: { s: ['lk0'], a: ['lk1'], r: ['lk1', 'lk0'] },
  hk: { s: ['hk0'], a: ['hk1'], r: ['hk1', 'hk1', 'hk0'] },
  clp: { s: ['crouch'], a: ['clp'], r: ['clp', 'crouch'] },
  clk: { s: ['crouch'], a: ['clk'], r: ['clk', 'crouch'] },
  chp: { s: ['crouch'], a: ['upper'], r: ['upper', 'crouch'] },
  chk: { s: ['crouch'], a: ['sweep'], r: ['sweep', 'sweep', 'crouch'] },
  jlp: { s: ['jtop'], a: ['jpunch'] },
  jhp: { s: ['jtop'], a: ['jpunch'] },
  jlk: { s: ['jtop'], a: ['jkick'] },
  jhk: { s: ['jtop'], a: ['jkick'] },
  _lag: { s: ['land'], a: ['land'], r: ['land', 'crouch'] },
  throw: { s: ['hp0'], a: ['hp1'], r: ['hp1', 'hp0'] },
  sFire: { s: ['sa0'], a: ['sa1'], r: ['sa2', 'sa3'] },
};

export const TYPE_ANIM = {
  rise: { s: ['sb0'], a: ['sb1', 'sb2'], fall: 'sb3' },
  melee: { s: ['sb0'], a: ['sb1', 'sb2'], loop: 4, r: ['sb3'] },
  fireDown: { s: ['sb0'], a: ['sb1'], r: ['sb2', 'sb3'] },
  rush: { s: ['sc0'], a: ['sc1'], r: ['sc1', 'idle0'] },
  leap: { s: ['sc0'], a: ['sc1'] },
} as const satisfies Record<string, Anim>;

/*
 * E3: animações dos golpes novos. FICAM FORA de BASE_ANIM/TYPE_ANIM de propósito: essas duas são as tabelas do protótipo e
 * a fidelidade (luta-fidelidade.test.ts) as compara chave a chave.
 */
/** Fouetté da PARADE (CAMILLE): poses que todo atlas resolve; a arte própria (sa2) vem na E5 via `anim.sResp`. */
const ANIM_RESP: Anim = { s: ['hk0'], a: ['hk1'], r: ['hk1', 'hk0'] };
export const TYPE_ANIM_E3 = {
  // RESORTE (CENTELLA): a[0] = corrida de costas da ida (flip −1), a[1] = voadora da volta. Arte própria via `anim.sFwd`.
  rebote: { s: ['sc0'], a: ['sc0', 'sc1'], r: ['sc1', 'idle0'] },
  // VADIVU (NILA): troca de postura, sem golpe de verdade.
  troca: { s: ['sb0'], a: ['sb0'], r: ['sb0', 'idle0'] },
} as const satisfies Record<string, Anim>;

type TipoComAnim = keyof typeof TYPE_ANIM | keyof typeof TYPE_ANIM_E3;
const TODOS_TYPE_ANIM: Readonly<Record<string, Anim>> = { ...TYPE_ANIM, ...TYPE_ANIM_E3 };
const temAnimDeTipo = (t: string | undefined): t is TipoComAnim => t !== undefined && t in TODOS_TYPE_ANIM;

/** Animação do golpe `n` de um lutador (animFor do protótipo; `anim` = LutadorDef.anim). */
export function animFor(n: NomeGolpe, mv: Golpe, anim: LutadorDef['anim']): Anim {
  const doLutador = n === 'sFire' || n === 'sDown' || n === 'sFwd' || n === 'sResp' || n === 'throw' ? anim?.[n] : undefined;
  if (doLutador) return doLutador;
  const base = BASE_ANIM[n];
  if (base) return base;
  if (n === 'sResp') return ANIM_RESP;
  if (n === 'sDown') {
    return mv.type === 'fire' ? TYPE_ANIM.fireDown : temAnimDeTipo(mv.type) ? (TODOS_TYPE_ANIM[mv.type] as Anim) : TYPE_ANIM.melee;
  }
  if (n === 'sFwd') return temAnimDeTipo(mv.type) ? (TODOS_TYPE_ANIM[mv.type] as Anim) : TYPE_ANIM.rush;
  return { s: ['idle0'], a: ['idle0'] };
}
