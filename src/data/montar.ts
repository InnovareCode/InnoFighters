import { CORPO_PADRAO, MAX_EN, SH_IDLE } from '../core/constantes';
import { animFor } from './anim';
import { LADO_RETRATO } from './atlas';
import { BASE_MOVES, NOMES_GOLPES_BASE } from './base-moves';
import { validarCena } from './cena';
import { validarCombosProprios } from './combos-proprios';
import { getPD } from './poses';
import type { CaixaGolpe, DicaIa, GolpeMontado, LutadorDef, NomeEspecial, NomeGolpe, Poses, ProjetilDef } from './tipos';

/** Lutador pronto para a luta/render: dados estáticos + tudo o que deriva do atlas (setupChars + buildMoves). */
export type LutadorMontado = Omit<LutadorDef, 'fichas'> & {
  /** Meia-largura de empurrão já resolvida (def.corpo ?? CORPO_PADRAO). */
  corpo: number;
  /** Poses do atlas (formato interno; ver manifestoParaPoses). */
  pd: Poses;
  /** Arte antiga de poucas poses? (sem walk7): liga os ajustes de transformação do poseT. */
  legacy: boolean;
  /** Fator atlas -> tela: scale * SH_IDLE / altura do idle0. */
  K: number;
  /** Retrato [x, y, w, h] no atlas. */
  head: readonly [number, number, number, number];
  /** Alias de poses dos especiais (sb1/sb2/sc1/sc0). */
  alias: Record<string, string>;
  moves: Record<NomeGolpe, GolpeMontado>;
  /** Caixas de ataque por golpe (só golpes com `box`: sem projétil nem lag). */
  boxes: Partial<Record<NomeGolpe, CaixaGolpe>>;
  sps: readonly [GolpeMontado, GolpeMontado, GolpeMontado];
  /** Projétil do especial principal + custo/velocidade (ch.proj). */
  proj: ProjetilDef & { cost: number; speed: number };
  /** Nome do especial principal (ch.special). */
  special: string;
  /** De onde o projétil nasce em relação aos pés (px lógicos, já na escala do lutador). */
  spawn: { x: number; y: number };
  /**
   * Fichas montadas (mesmas poses do atlas, dados da ficha por cima). Vazio = só a base. Cada ficha é um
   * `LutadorMontado` completo (com `fichas` vazio), então `Fighter.trocarFicha` só troca a referência.
   */
  fichas: Record<string, LutadorMontado>;
  /** Golpes que declaram `ia` (dica de CPU). Vazio = a CPU não gasta RNG extra por causa deste lutador. */
  dicasIa: readonly { golpe: NomeGolpe; dica: DicaIa }[];
};

const ESPECIAIS: readonly NomeEspecial[] = ['sFire', 'sDown', 'sFwd'];

/** Projétil de mentira do ESP que não solta projétil: nunca é lançado (o golpe não é `type: 'fire'`). */
const PROJ_NEUTRO: ProjetilDef = { dmg: 0, sp: 0, kb: 0, hs: 0, kd: false, style: 'orb', sc: 1, life: 1 };

/**
 * Dados de E3 que o motor ainda não sabe executar (ou que não fazem sentido) falham ALTO no boot, em vez de virar um
 * golpe que silenciosamente não faz o que o dado diz. Cada fatia que implementa a mecânica tira a sua recusa daqui.
 */
function validarParametrosE3(id: string, nome: NomeGolpe, mv: GolpeMontado, fichas: readonly string[]): void {
  const onde = `${id}.${nome}`;
  const alvo = mv.agarrao?.alvo;
  if (alvo !== undefined && alvo !== 'chao' && alvo !== 'ar' && alvo !== 'ambos') throw new Error(`${onde}: agarrao.alvo '${String(alvo)}' desconhecido`);
  if (mv.agarrao && !mv.throw) throw new Error(`${onde}: agarrao exige throw: 1 (sem ele o golpe não agarra)`);
  if (mv.vxAlvo !== undefined && mv.type !== 'leap' && mv.type !== 'rise') throw new Error(`${onde}: vxAlvo só vale em leap/rise`);
  const c = mv.carga;
  if (mv.type === 'carga' && !c) throw new Error(`${onde}: type 'carga' sem carga`);
  if (c) {
    const ok = c.niveis.length >= 1 && c.niveis.length <= 3 && c.niveis[0] === 0 && c.porNivel.length === c.niveis.length && c.max > 0;
    if (!ok) throw new Error(`${onde}: carga inválida (1 a 3 níveis, niveis[0] = 0, porNivel do mesmo tamanho, max > 0)`);
    if (mv.S < 2) throw new Error(`${onde}: carga exige S >= 2 (segura em mt = S−1)`);
  }
  // S3 (RESORTE): o golpe `rebote` corre até a parede e volta; sem números válidos ele nunca voltaria.
  const r = mv.rebote;
  if (mv.type === 'rebote' && !r) throw new Error(`${onde}: type 'rebote' sem rebote`);
  if (r) {
    const ok = mv.type === 'rebote' && r.vel > 0 && r.maxTicks > 0 && r.vy < 0 && r.maxDist > 0 && r.vxBase >= 0 && r.vxPorPx >= 0 && r.dmgPorPx >= 0;
    if (!ok) throw new Error(`${onde}: rebote inválido (type 'rebote', vel > 0, maxTicks > 0, vy < 0, maxDist > 0, vxBase/vxPorPx/dmgPorPx >= 0)`);
  }
  // S4 (PARADE): janela de aparar com ao menos um nível de golpe; a resposta (`sResp`) é conferida em montarLutador.
  const p = mv.parry;
  if (mv.type === 'aparar' && !p) throw new Error(`${onde}: type 'aparar' sem parry`);
  if (p && (mv.type !== 'aparar' || p.niveis.length === 0 || !(p.atordoaAtacante > 0) || mv.A <= 0)) {
    throw new Error(`${onde}: parry inválido (type 'aparar', niveis não vazio, atordoaAtacante > 0, A > 0)`);
  }
  if (mv.contra && !(mv.contra.mult >= 1 && mv.contra.hs >= 0)) throw new Error(`${onde}: contra inválido (mult >= 1, hs >= 0)`);
  // S5 (VADIVU): troca de ficha tem que apontar para uma ficha que existe (null = a base).
  const t = mv.troca;
  if (mv.type === 'troca' && !t) throw new Error(`${onde}: type 'troca' sem troca`);
  if (t) {
    if (mv.type !== 'troca') throw new Error(`${onde}: troca só vale em type 'troca'`);
    if (t.ficha !== null && !fichas.includes(t.ficha)) throw new Error(`${onde}: troca para ficha desconhecida '${t.ficha}'`);
  }
  // ZENON (TRIBUTO/DECRETO): `drenaEnergia` só nos dois ramos de applyHit que mexem em `en` (acerto e bloqueio) e em golpe de UM acerto
  // corpo a corpo. Projétil, vários acertos e agarrão (que não passa por applyHit) falham ALTO: senão o dado dizia "drena" e não drenava.
  const dr = mv.drenaEnergia;
  if (dr) {
    const ok = Number.isFinite(dr.acerto) && Number.isFinite(dr.defesa) && dr.acerto >= 0 && dr.acerto <= MAX_EN && dr.defesa >= 0 && dr.defesa <= dr.acerto;
    if (!ok) throw new Error(`${onde}: drenaEnergia inválida (números finitos, 0 <= defesa <= acerto <= ${MAX_EN})`);
    if (mv.proj || mv.type === 'fire') throw new Error(`${onde}: drenaEnergia não vale em projétil`);
    if (mv.hits !== undefined && mv.hits > 1) throw new Error(`${onde}: drenaEnergia não vale em golpe de vários acertos (hits > 1)`);
    if (mv.throw || mv.agarrao) throw new Error(`${onde}: drenaEnergia não vale em agarrão (ele não passa pelo ramo de acerto/bloqueio)`);
  }
}

/** Piso do `ConfigChefe.danoRecebido`: abaixo de 0,60 o chefão deixa de ser mais duro e passa a ser esponja de dano (spec chefões R5). */
export const DANO_RECEBIDO_MIN = 0.6;

/** `danoRecebido` fora de 0,60 a 1 (ou NaN/Infinity) é erro de dados: falha alto na montagem, não no meio da luta. */
function validarDanoRecebido(onde: string, x: number | undefined): void {
  if (x === undefined) return;
  if (!Number.isFinite(x) || x < DANO_RECEBIDO_MIN || x > 1) {
    throw new Error(`${onde}: danoRecebido deve estar entre ${DANO_RECEBIDO_MIN} e 1 (veio ${String(x)})`);
  }
}

/**
 * Monta um lutador a partir dos dados estáticos e das poses do atlas. Função pura: porte
 * literal de setupChars() + buildMoves() do protótipo (linhas 387-395 e 597-615).
 */
export function montarLutador(def: LutadorDef, pd: Poses, fichasDoLutador?: readonly string[]): LutadorMontado {
  // `fichasDoLutador` só é passado na recursão das fichas: uma ficha não tem `fichas` próprias, mas o VADIVU dela aponta
  // para as do lutador (ou para a base, null).
  const nomesDeFichas = fichasDoLutador ?? Object.keys(def.fichas ?? {});
  if (def.chefe) {
    validarCena(`${def.id}.chefe`, def.chefe.cena);
    validarDanoRecebido(`${def.id}.chefe`, def.chefe.danoRecebido);
    validarDanoRecebido(`${def.id}.chefe (DIFÍCIL)`, def.chefe.danoRecebidoDificil);
  }
  const idle = pd['idle0'] ?? pd['guard'];
  if (!idle) throw new Error(`${def.id}: atlas sem idle0/guard`);
  const g = pd['guard'] ?? pd['idle0'];
  if (!g) throw new Error(`${def.id}: atlas sem guard/idle0`);

  const moves = {} as Record<NomeGolpe, GolpeMontado>;
  const semAnim = { s: [], a: [] };
  for (const n of NOMES_GOLPES_BASE) {
    moves[n] = { ...BASE_MOVES[n], ...(def.mods[n] ?? {}), id: n, anim: semAnim };
  }
  for (const n of ESPECIAIS) moves[n] = { ...def.especiais[n], id: n, anim: semAnim };
  if (def.extras?.sResp) moves.sResp = { ...def.extras.sResp, id: 'sResp', anim: semAnim };

  const alias: Record<string, string> = {
    sb1: def.especiais.sDown.pose,
    sb2: def.especiais.sDown.pose,
    sc1: def.especiais.sFwd.pose,
    sc0: def.especiais.sFwd.pre || 'guard',
  };
  // Atlas novo (as 48 poses canônicas das folhas 1 a 4, sem os nomes legados `jumpPunch`/`crouchPunch`/`punch`): o FALLBACK do
  // protótipo não alcança nenhuma pose (`punch` também não existe) e o soco aéreo / o preparo da BOTE caíam no idle0. Ponte
  // por lutador, só quando FALTA o quadro (os 4 originais têm os dois, então o alias deles não muda; `getPD` acha o direto).
  if (!pd['jpunch'] && !pd['jumpPunch'] && pd['jkick']) alias['jpunch'] = 'jkick';
  if (!pd['crouchPunch'] && pd['clp']) alias['crouchPunch'] = 'clp';

  const parcial = { ...def, pd, alias };
  const R = def.reach || 1;
  const boxes: Partial<Record<NomeGolpe, CaixaGolpe>> = {};
  const nomes = Object.keys(moves) as NomeGolpe[];
  for (const n of nomes) {
    const mv = moves[n];
    mv.anim = animFor(n, mv, def.anim);
    if (mv.type === 'fire' || mv.kind === 'lag') continue;
    mv.box = n;
    // RESORTE: a caixa é a da voadora da volta (a[1]); a[0] é só a corrida de costas da ida.
    const primeiro = (mv.rebote ? mv.anim.a[1] : undefined) ?? mv.anim.a[0] ?? 'idle0';
    const t = getPD(parcial, primeiro);
    const rm = mv.rm ?? 1;
    const h = mv.bh ?? 0;
    if (mv.tall) {
      boxes[n] = { fx: 6, fy: h + 30, w: Math.max(100, ((t.tipX || 140) * def.scale * 0.6 + 40) * rm), h };
      continue;
    }
    const minReach = mv.crouch && /^(clp|clk|sweep|sb1)$/.test(primeiro) ? 150 : 0;
    const reach = Math.max(minReach, (t.tipX || 140) * def.scale * R + 28) * rm;
    boxes[n] = { fx: 20, fy: (t.tipY || 150) * def.scale + h / 2, w: Math.max(90, reach - 20), h };
  }

  const dicasIa: { golpe: NomeGolpe; dica: DicaIa }[] = [];
  for (const n of nomes) {
    const dica = moves[n].ia;
    if (dica) dicasIa.push({ golpe: n, dica });
  }

  for (const n of nomes) validarParametrosE3(def.id, n, moves[n], nomesDeFichas);
  validarCombosProprios(def.id, def.combosProprios, moves);
  if (nomes.some((n) => moves[n].parry) && !moves.sResp) throw new Error(`${def.id}: golpe com parry exige extras.sResp (a resposta)`);

  const sFire = moves.sFire;
  // ESP sem projétil (E3: ARREMESSO do BAATAR, MASHI da AMINU): `proj` vira um projétil neutro só para `ch.proj.cost`
  // (a barra de energia) e `ch.spawn`. Quem tem `type: 'fire'` continua obrigado a declarar `proj`.
  const projDef = sFire.proj ?? (sFire.type === 'fire' ? undefined : PROJ_NEUTRO);
  if (!projDef) throw new Error(`${def.id}: sFire sem proj`);
  const ponta = pd['special'] ?? pd['sa1'] ?? g;

  // Fichas: cada uma é o def base com os campos da ficha por cima, montada sobre as MESMAS poses (sem `fichas`/`chefe`
  // próprios: não há ficha de ficha). `id` é o do lutador, então a render continua achando o elenco certo.
  const { fichas: fichasDef, ...defSemFichas } = def;
  const { chefe: _chefe, ...defParaFicha } = defSemFichas;
  void _chefe;
  const fichas: Record<string, LutadorMontado> = {};
  for (const [nome, f] of Object.entries(fichasDef ?? {})) {
    fichas[nome] = montarLutador({ ...defParaFicha, ...f, id: def.id }, pd, nomesDeFichas);
  }

  return {
    ...defSemFichas,
    corpo: def.corpo ?? CORPO_PADRAO,
    pd,
    legacy: !pd['walk7'],
    K: (def.scale * SH_IDLE) / idle.h,
    head: [
      g.x + (g.rosto?.[0] ?? 0) - LADO_RETRATO / 2,
      g.y + (g.rosto?.[1] ?? 0) - LADO_RETRATO / 2,
      LADO_RETRATO,
      LADO_RETRATO,
    ],
    alias,
    moves,
    boxes,
    sps: [moves.sFire, moves.sDown, moves.sFwd],
    proj: { ...projDef, cost: sFire.cost ?? 0, speed: projDef.sp },
    special: sFire.name ?? '',
    spawn: { x: ((ponta.tipX ?? 150) - 30) * def.scale, y: def.alturaDoProjetil ?? (ponta.tipY ?? 150) * def.scale },
    fichas,
    dicasIa,
  };
}
