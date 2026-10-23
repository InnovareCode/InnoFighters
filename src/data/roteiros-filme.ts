import type { EstiloId } from '../render/estilos-especiais';

/*
 * ROTEIROS DO FILME DO ESPECIAL (docs/spec-revisao-motor-luta-v2.md §3.6, docs/roteiros-filme-especiais.md, fatia V2-3d). Só UI: o motor não importa
 * este arquivo (ele não sabe quanto o filme dura). A tabela do §4 do Apolo (31 especiais + as 2 variantes do ZENON) está em `LINHAS`; cada linha declara
 * o MODELO do tipo (`chao`, `aereo`, `projetil`, `agarrao`) e preenche os encaixes (PREP, IMPACTO...) com poses que os atlas JÁ têm. `expandir` monta o
 * `RoteiroFilme` completo. Sem linha para um golpe, `roteiroDoFilme` cai no modelo genérico do tipo (a UI nunca fica sem filme).
 *
 * Adições do Apolo ao formato do §3.6 (docs/roteiros-filme-especiais.md §1.2):
 *  - `tc`: o tick da batida na versão CURTA (sem `tc` a batida não toca; o peso dela soma na primeira batida que toca);
 *  - pose `'$motor'`: a pose que a leitura do motor dá ao lutador no fim (garante que o último quadro bate com a luta que volta);
 *  - pose de página FILME (`f0..f5`) é PAINEL (`painel: true` no JSON da página); sem a página, cai no `Alt` e o roteiro não muda;
 *  - `peso: 0` é válido (grito, disparo, queda): o contador de acertos conta só batidas com `peso > 0`.
 */

export const POSE_DO_MOTOR = '$motor';

export type FocoDaCamera = 'atacante' | 'rival' | 'meio';
export type SomDaBatida = 'leve' | 'pesado' | 'final';
export type TipoDeFilme = 'chao' | 'aereo' | 'projetil' | 'agarrao';

/** Onde o RIVAL fica numa batida de agarrão, relativo ao atacante: `dx` à frente (no sentido do olhar), `dy` acima do chão, `dyAltura` somado em fração da altura dele, `rot` em radianos. */
export type DesvioDoRival = { readonly dx: number; readonly dy?: number; readonly dyAltura?: number; readonly rot?: number };

export type BatidaFilme = {
  /** Tick de início da batida na versão COMPLETA. */
  readonly t: number;
  /** Tick de início na versão CURTA; ausente = a batida não toca na CURTA. */
  readonly tc?: number;
  /** Pose (nome de atlas, `f0..f5` da página FILME ou `'$motor'`) e a pose de reserva (cadeia de queda). */
  readonly atacante: string;
  readonly atacanteAlt?: string;
  readonly rival: string;
  readonly rivalAlt?: string;
  /** Fração do dano mostrada nesta batida (soma 1). 0 = sem número. */
  readonly peso: number;
  readonly camera?: { readonly zoom: number; readonly foco: FocoDaCamera };
  readonly som?: SomDaBatida;
  /** Close do retrato do atacante (1ª batida, em geral). */
  readonly retrato?: boolean;
  /** Agarrão: o rival é posto na mão do atacante (o atlas desenha o agarrão sem o rival). */
  readonly rivalPos?: DesvioDoRival;
  /** Desenha o projétil do golpe parado no ponto de acerto, dissolvendo até o fim da batida. */
  readonly projetil?: boolean;
  /** HOERI CHAGI: a pose do atacante inverte o lado a cada 3 ticks (como o `spin` do motor). */
  readonly alternaFlip?: boolean;
  /** TRIBUTO do ZENON: as moedas do dreno saem nesta batida. */
  readonly moedas?: boolean;
};

/** Índices (na lista COMPLETA) das batidas que ancoram a trajetória (docs/roteiros-filme-especiais.md §1.3). */
export type MarcosDoFilme = {
  /** A partir daqui o atacante vai em linha reta até `depois`. */
  readonly impacto: number;
  /** O rival recua 12 px e começa o arco até `depois`. */
  readonly reacao: number;
  /** Pico do arco (e o `facing` de `depois` vale a partir daqui). */
  readonly lancamento: number;
  /** O rival chega em `depois`. */
  readonly queda: number;
  /** O aéreo pousa aqui (por padrão, igual a `queda`). */
  readonly pouso?: number;
};

export type RoteiroFilme = {
  readonly duracao: number;
  readonly curta: number;
  readonly tipo: TipoDeFilme;
  /** E1..E12 de `render/estilos-especiais.ts`. */
  readonly estilo?: EstiloId;
  readonly batidas: readonly BatidaFilme[];
  readonly marcos: MarcosDoFilme;
};

const CAM = (zoom: number, foco: FocoDaCamera) => ({ zoom, foco });

// ------------------------------------------------------------------------------------------------------------- encaixes
export type Encaixes = {
  /** Rajada do lutador (R1, R2, R3). No projétil são os 3 quadros do próprio disparo. */
  readonly r: readonly [string, string, string];
  readonly prep: string;
  readonly impacto: string;
  readonly imp2?: string;
  readonly subida?: string;
  readonly queda?: string;
  readonly pega?: string;
  readonly giro?: string;
  readonly slam?: string;
};

type Desvio = Partial<Pick<BatidaFilme, 'atacante' | 'atacanteAlt' | 'rival' | 'rivalAlt' | 'rivalPos' | 'projetil' | 'alternaFlip' | 'moedas' | 'camera'>>;

type Linha = {
  readonly tipo: TipoDeFilme;
  readonly estilo: EstiloId;
  /** O close do especial (`f0..f3`). */
  readonly fK: 'f0' | 'f1' | 'f2' | 'f3';
  readonly enc: Omit<Encaixes, 'r'> & { readonly r?: Encaixes['r'] };
  /** Pose do GRITO quando não é `f3` com o encaixe como reserva (NILA não tem `f3`; ZENON usa `cena1`). */
  readonly grito?: { readonly pose: string; readonly alt?: string };
  /** Desvios por índice de batida (COMPLETA). */
  readonly desvios?: Readonly<Record<number, Desvio>>;
};

// ------------------------------------------------------------------------------------------------------------- modelos (§2)
function modeloChao(e: Encaixes, fK: string, grito: Linha['grito']): readonly BatidaFilme[] {
  const imp2 = e.imp2 ?? e.impacto;
  const g = grito ?? { pose: 'f3', alt: e.prep };
  return [
    { t: 0, atacante: g.pose, ...(g.alt ? { atacanteAlt: g.alt } : {}), rival: 'hitH', peso: 0, camera: CAM(1.3, 'atacante'), retrato: true },
    { t: 8, atacante: e.r[0], rival: 'hitH', peso: 0.12, camera: CAM(1.2, 'meio'), som: 'leve' },
    { t: 14, atacante: e.r[1], rival: 'hitB', peso: 0.12, camera: CAM(1.2, 'meio'), som: 'leve' },
    { t: 20, atacante: e.r[2], rival: 'hitH', peso: 0.16, camera: CAM(1.25, 'meio'), som: 'pesado' },
    { t: 28, tc: 0, atacante: fK, atacanteAlt: e.impacto, rival: 'hitB', peso: 0.35, camera: CAM(1.3, 'atacante'), som: 'pesado' },
    { t: 38, tc: 10, atacante: imp2, rival: 'f4', rivalAlt: 'hitH', peso: 0.25, camera: CAM(1.3, 'rival'), som: 'final' },
    { t: 48, tc: 18, atacante: imp2, rival: 'f5', rivalAlt: 'kdAir', peso: 0, camera: CAM(1.15, 'rival') },
    { t: 58, tc: 24, atacante: POSE_DO_MOTOR, rival: 'koFloor', peso: 0, camera: CAM(1, 'meio') },
  ];
}

function modeloAereo(e: Encaixes, fK: string, grito: Linha['grito']): readonly BatidaFilme[] {
  const g = grito ?? { pose: 'f3', alt: e.prep };
  return [
    { t: 0, atacante: g.pose, ...(g.alt ? { atacanteAlt: g.alt } : {}), rival: 'hitH', peso: 0, camera: CAM(1.3, 'atacante'), retrato: true },
    { t: 8, atacante: e.r[0], rival: 'hitH', peso: 0.12, camera: CAM(1.2, 'meio'), som: 'leve' },
    { t: 14, atacante: e.r[1], rival: 'hitB', peso: 0.12, camera: CAM(1.2, 'meio'), som: 'leve' },
    { t: 20, atacante: e.subida ?? e.impacto, rival: 'hitH', peso: 0.16, camera: CAM(1.25, 'meio'), som: 'pesado' },
    { t: 28, tc: 0, atacante: fK, atacanteAlt: e.impacto, rival: 'hitB', peso: 0.35, camera: CAM(1.3, 'atacante'), som: 'pesado' },
    { t: 38, tc: 10, atacante: e.impacto, rival: 'f4', rivalAlt: 'hitH', peso: 0.25, camera: CAM(1.3, 'rival'), som: 'final' },
    { t: 48, tc: 18, atacante: e.queda ?? e.impacto, rival: 'f5', rivalAlt: 'kdAir', peso: 0, camera: CAM(1.15, 'rival') },
    { t: 58, tc: 24, atacante: POSE_DO_MOTOR, rival: 'koFloor', peso: 0, camera: CAM(1, 'meio') },
  ];
}

// Curadoria do Apolo (docs/curadoria-filme-hayato-v1.md 6.2.1): o grito vai de t0 a t12 numa batida só. Com a batida de t6 (sa1) ele durava 6 ticks e 4 eram o
// painel deslizando para dentro: o close nem chegava a ser lido. Vale para os 6 projéteis (o modelo é um só).
function modeloProjetil(e: Encaixes, fK: string, grito: Linha['grito']): readonly BatidaFilme[] {
  const g = grito ?? { pose: 'f3', alt: e.r[0] };
  return [
    { t: 0, atacante: g.pose, ...(g.alt ? { atacanteAlt: g.alt } : {}), rival: 'hitH', peso: 0, camera: CAM(1.25, 'atacante'), retrato: true },
    { t: 12, tc: 0, atacante: fK, atacanteAlt: e.r[2], rival: 'hitH', peso: 0, camera: CAM(1.3, 'atacante'), som: 'pesado' },
    { t: 22, tc: 6, atacante: e.r[2], rival: 'hitH', peso: 0.3, camera: CAM(1.3, 'rival'), som: 'pesado', projetil: true },
    { t: 28, tc: 11, atacante: e.r[2], rival: 'hitB', peso: 0.2, camera: CAM(1.3, 'rival'), som: 'leve' },
    { t: 34, tc: 16, atacante: e.r[2], rival: 'f4', rivalAlt: 'hitH', peso: 0.5, camera: CAM(1.3, 'rival'), som: 'final' },
    { t: 44, tc: 21, atacante: POSE_DO_MOTOR, rival: 'f5', rivalAlt: 'kdAir', peso: 0, camera: CAM(1.15, 'rival') },
    { t: 54, tc: 26, atacante: POSE_DO_MOTOR, rival: 'koFloor', peso: 0, camera: CAM(1, 'meio') },
  ];
}

function modeloAgarrao(e: Encaixes, fK: string, grito: Linha['grito']): readonly BatidaFilme[] {
  const g = grito ?? { pose: 'f3', alt: e.prep };
  return [
    { t: 0, atacante: g.pose, ...(g.alt ? { atacanteAlt: g.alt } : {}), rival: 'hitH', peso: 0, camera: CAM(1.3, 'atacante'), retrato: true },
    { t: 8, tc: 0, atacante: e.pega ?? e.impacto, rival: 'hitB', peso: 0.15, camera: CAM(1.25, 'meio'), som: 'pesado' },
    { t: 16, tc: 6, atacante: fK, atacanteAlt: e.giro ?? e.impacto, rival: 'kdAir', peso: 0.25, camera: CAM(1.3, 'atacante'), som: 'pesado' },
    { t: 28, tc: 13, atacante: e.slam ?? e.impacto, rival: 'koFloor', peso: 0.6, camera: CAM(1.2, 'meio'), som: 'final' },
    { t: 38, tc: 19, atacante: e.slam ?? e.impacto, rival: 'f4', rivalAlt: 'koFloor', peso: 0, camera: CAM(1.15, 'rival') },
    { t: 48, tc: 25, atacante: POSE_DO_MOTOR, rival: 'koFloor', peso: 0, camera: CAM(1, 'meio') },
  ];
}

const DURACOES: Readonly<Record<TipoDeFilme, { duracao: number; curta: number; marcos: MarcosDoFilme }>> = {
  chao: { duracao: 66, curta: 30, marcos: { impacto: 4, reacao: 5, lancamento: 6, queda: 7 } },
  aereo: { duracao: 66, curta: 30, marcos: { impacto: 4, reacao: 5, lancamento: 6, queda: 7, pouso: 6 } },
  projetil: { duracao: 62, curta: 30, marcos: { impacto: 2, reacao: 4, lancamento: 5, queda: 6 } }, // 7 batidas: o grito de t0 a t12 (sem a de t6)
  agarrao: { duracao: 58, curta: 30, marcos: { impacto: 1, reacao: 3, lancamento: 3, queda: 4 } },
};

/** Mescla desvios por índice sobre as batidas do modelo. */
function aplicar(batidas: readonly BatidaFilme[], desvios: Linha['desvios']): readonly BatidaFilme[] {
  if (!desvios) return batidas;
  return batidas.map((b, i) => {
    const d = desvios[i];
    return d ? ({ ...b, ...d } as BatidaFilme) : b;
  });
}

/** Monta o roteiro completo de uma linha da tabela (ou do modelo genérico). */
export function expandir(l: Linha, enc: Encaixes): RoteiroFilme {
  const d = DURACOES[l.tipo];
  const base =
    l.tipo === 'chao' ? modeloChao(enc, l.fK, l.grito) : l.tipo === 'aereo' ? modeloAereo(enc, l.fK, l.grito) : l.tipo === 'projetil' ? modeloProjetil(enc, l.fK, l.grito) : modeloAgarrao(enc, l.fK, l.grito);
  return { duracao: d.duracao, curta: d.curta, tipo: l.tipo, estilo: l.estilo, batidas: aplicar(base, l.desvios), marcos: d.marcos };
}

// ------------------------------------------------------------------------------------------------------------- a tabela do §4
/** Rajada por lutador (§3.1 do Apolo). A NILA em SARPA tem a dela. */
const RAJADA: Readonly<Record<string, readonly [string, string, string]>> = {
  hayato: ['lp1', 'hp1', 'hk1'],
  'wei-long': ['hp1', 'lk1', 'hk1'],
  'min-ji': ['lk1', 'hp1', 'hk1'],
  caio: ['lk1', 'hk1', 'sweep'],
  aminu: ['lp1', 'lk1', 'upper'],
  centella: ['lp1', 'lk1', 'hk1'],
  camille: ['lp1', 'lk1', 'hp1'],
  nila: ['lk1', 'hp1', 'hk1'],
  'nila/sarpa': ['sarpaSlide0', 'clk', 'sarpaLeap1'],
  baatar: ['lp1', 'hp1', 'hk1'],
  zenon: ['lp1', 'hp1', 'hk1'],
};
const SELO = ['sa0', 'sa1', 'sa2'] as const;
const CENA1 = { pose: 'cena1' } as const;
const SEM_F3 = (prep: string) => ({ pose: prep });

type LinhaTabela = Linha & { readonly rajada?: string };

const L = (l: LinhaTabela): LinhaTabela => l;

/** Chave: `<lutador>/<golpe>` ou `<lutador>/<ficha>/<golpe>`. */
const LINHAS: Readonly<Record<string, LinhaTabela>> = {
  // HAYATO (E1)
  'hayato/sFire': L({ tipo: 'projetil', estilo: 'E1', fK: 'f0', enc: { r: SELO, prep: 'sa0', impacto: 'sa2' } }),
  'hayato/sDown': L({ tipo: 'aereo', estilo: 'E1', fK: 'f1', enc: { prep: 'sb0', subida: 'sb1', impacto: 'sb2', queda: 'jfall' } }),
  'hayato/sFwd': L({ tipo: 'chao', estilo: 'E1', fK: 'f2', enc: { prep: 'sc0', impacto: 'sc1' } }),
  // WEI LONG (E2)
  'wei-long/sFire': L({ tipo: 'projetil', estilo: 'E2', fK: 'f0', enc: { r: SELO, prep: 'sa0', impacto: 'sa2' } }),
  'wei-long/sDown': L({ tipo: 'projetil', estilo: 'E2', fK: 'f1', enc: { r: ['sb0', 'sb1', 'sb2'], prep: 'sb0', impacto: 'sb2' }, desvios: { 2: { rival: 'hitB' } } }),
  'wei-long/sFwd': L({ tipo: 'chao', estilo: 'E2', fK: 'f2', enc: { prep: 'sc0', impacto: 'sc1' } }),
  // MIN-JI (E3)
  'min-ji/sFire': L({ tipo: 'projetil', estilo: 'E3', fK: 'f0', enc: { r: SELO, prep: 'sa0', impacto: 'sa2' }, desvios: { 3: { projetil: true } } }),
  'min-ji/sDown': L({ tipo: 'aereo', estilo: 'E3', fK: 'f1', enc: { prep: 'sb0', subida: 'sb1', impacto: 'sb2', queda: 'sb3' }, desvios: { 3: { alternaFlip: true }, 4: { alternaFlip: true } } }),
  'min-ji/sFwd': L({ tipo: 'aereo', estilo: 'E3', fK: 'f2', enc: { prep: 'sc0', subida: 'jup', impacto: 'sc1', queda: 'land' } }),
  // CAIO (E4)
  'caio/sFire': L({ tipo: 'projetil', estilo: 'E4', fK: 'f0', enc: { r: SELO, prep: 'sa0', impacto: 'sa2' }, desvios: { 4: { projetil: true } } }),
  'caio/sDown': L({ tipo: 'chao', estilo: 'E4', fK: 'f1', enc: { prep: 'sb0', impacto: 'sb1', imp2: 'sb2' } }),
  'caio/sFwd': L({ tipo: 'aereo', estilo: 'E4', fK: 'f2', enc: { prep: 'sc0', subida: 'jup', impacto: 'sc1', queda: 'land' } }),
  // AMINU (E5)
  'aminu/sFire': L({ tipo: 'chao', estilo: 'E5', fK: 'f0', enc: { prep: 'hp0', impacto: 'hp1' } }),
  'aminu/sDown': L({ tipo: 'chao', estilo: 'E5', fK: 'f1', enc: { prep: 'sb0', impacto: 'sb1', imp2: 'sb2' } }),
  'aminu/sFwd': L({ tipo: 'chao', estilo: 'E5', fK: 'f2', enc: { prep: 'sc0', impacto: 'sc1' } }),
  // CENTELLA (E6)
  'centella/sFire': L({
    tipo: 'aereo',
    estilo: 'E6',
    fK: 'f0',
    enc: { prep: 'sa0', subida: 'sa1', impacto: 'sa1', queda: 'sa3' },
    desvios: { 5: { atacante: 'sa2', rivalAlt: 'hitB' }, 6: { rivalAlt: 'koFloor' } },
  }),
  'centella/sDown': L({
    tipo: 'agarrao',
    estilo: 'E6',
    fK: 'f1',
    enc: { prep: 'sb0', pega: 'sb1', giro: 'sb2', slam: 'sb3', impacto: 'sb1' },
    // b1 na ponta do pé dela; b2 de cabeça para baixo ao lado dela (o Apolo pediu a cabeça 30 px acima da dela, mas os dois empilhados dão ~560 px e a tela tem 540: o rival fica na altura do peito dela e a câmera abre para 1,05); b3 no chão a 90 px à frente
    desvios: { 1: { rivalPos: { dx: 55 } }, 2: { rivalPos: { dx: 38, dyAltura: 0.5, dy: 26, rot: Math.PI }, camera: CAM(1.05, 'atacante') }, 3: { rivalPos: { dx: 90 } } },
  }),
  'centella/sFwd': L({ tipo: 'chao', estilo: 'E6', fK: 'f2', enc: { prep: 'sc0', impacto: 'sc1' } }),
  // CAMILLE (E7)
  'camille/sResp': L({ tipo: 'chao', estilo: 'E7', fK: 'f0', enc: { prep: 'sa1', impacto: 'sa2' } }),
  'camille/sDown': L({ tipo: 'chao', estilo: 'E7', fK: 'f1', enc: { prep: 'sb0', impacto: 'sb1', imp2: 'sb2' } }),
  'camille/sFwd': L({ tipo: 'chao', estilo: 'E7', fK: 'f2', enc: { prep: 'sc0', impacto: 'sc1' } }),
  // NILA (E8 GAJA, E9 SARPA)
  'nila/sFire': L({ tipo: 'chao', estilo: 'E8', fK: 'f0', enc: { prep: 'sa0', impacto: 'sa2' }, grito: SEM_F3('sa0') }),
  'nila/sFwd': L({ tipo: 'chao', estilo: 'E8', fK: 'f1', enc: { prep: 'sc0', impacto: 'sc1' }, grito: SEM_F3('sc0') }),
  'nila/sarpa/sFire': L({ tipo: 'chao', estilo: 'E9', fK: 'f2', enc: { prep: 'sarpaSlide0', impacto: 'sarpaSlide1' }, grito: SEM_F3('sarpaSlide0'), rajada: 'nila/sarpa' }),
  'nila/sarpa/sFwd': L({
    tipo: 'aereo',
    estilo: 'E9',
    fK: 'f3',
    enc: { prep: 'sarpaLeap0', subida: 'sarpaLeap1', impacto: 'sarpaLeap2', queda: 'sarpaLeap0' },
    grito: SEM_F3('sarpaLeap0'),
    rajada: 'nila/sarpa',
  }),
  // BAATAR (E10, E11)
  'baatar/sFire': L({
    tipo: 'agarrao',
    estilo: 'E10',
    fK: 'f0',
    enc: { prep: 'sa0', pega: 'sa1', giro: 'sa2', slam: 'sa3', impacto: 'sa1' },
    // b1 nas mãos dele, na altura do peito; b2 por cima do ombro (a pose `kdAir` já é quase deitada: de pé ele passaria da altura da tela); b3 no chão a 70 px à frente
    desvios: { 1: { rivalPos: { dx: 44, dyAltura: 0.3, rot: -0.5 } }, 2: { rivalPos: { dx: 0, dyAltura: 0.55, rot: 0.25 }, camera: CAM(1.05, 'atacante') }, 3: { rivalPos: { dx: 70 } } },
  }),
  'baatar/sDown': L({ tipo: 'chao', estilo: 'E10', fK: 'f1', enc: { prep: 'sb0', impacto: 'sb2', imp2: 'sb1' } }),
  'baatar/sFwd': L({ tipo: 'aereo', estilo: 'E11', fK: 'f2', enc: { prep: 'jsquat', subida: 'dive0', impacto: 'dive1', queda: 'land' } }),
  // ZENON (E12): o GRITO é a `cena1` (a `f3` dele é o DECRETO)
  'zenon/sFire': L({ tipo: 'projetil', estilo: 'E12', fK: 'f0', enc: { r: SELO, prep: 'sa0', impacto: 'sa2' }, grito: CENA1 }),
  'zenon/sDown': L({ tipo: 'aereo', estilo: 'E12', fK: 'f1', enc: { prep: 'sb0', subida: 'sb1', impacto: 'sb2', queda: 'sb3' }, grito: CENA1 }),
  'zenon/sFwd': L({ tipo: 'chao', estilo: 'E12', fK: 'f2', enc: { prep: 'sc0', impacto: 'sc1', imp2: 'sc2' }, grito: CENA1, desvios: { 5: { moedas: true } } }),
  'zenon/chefe2/sFire': L({ tipo: 'projetil', estilo: 'E12', fK: 'f0', enc: { r: SELO, prep: 'sa0', impacto: 'sa2' }, grito: CENA1 }),
  'zenon/chefe2/sFwd': L({ tipo: 'chao', estilo: 'E12', fK: 'f3', enc: { prep: 'decreto0', impacto: 'decreto1', imp2: 'decreto2' }, grito: CENA1 }),
};

/** Chaves da tabela (31 especiais que conectam + SELO MAIOR e DECRETO do chefão). */
export const CHAVES_DE_ROTEIRO: readonly string[] = Object.keys(LINHAS);

/** O lutador de uma chave (`nila/sarpa/sFire` -> `nila`, `nila/sarpa`). */
function rajadaDe(chave: string, l: LinhaTabela): readonly [string, string, string] {
  const k = l.rajada ?? chave.split('/')[0] ?? '';
  return RAJADA[k] ?? ['lp1', 'hp1', 'hk1'];
}

const montados = new Map<string, RoteiroFilme>();

function montarDaTabela(chave: string): RoteiroFilme | undefined {
  const pronto = montados.get(chave);
  if (pronto) return pronto;
  const l = LINHAS[chave];
  if (!l) return undefined;
  const r = l.enc.r ?? rajadaDe(chave, l);
  const rot = expandir(l, { ...l.enc, r });
  montados.set(chave, rot);
  return rot;
}

/** O roteiro de uma chave da tabela, ou undefined. */
export const roteiroDaTabela = (chave: string): RoteiroFilme | undefined => montarDaTabela(chave);

/** O modelo genérico do tipo, com as poses comuns do golpe (`sFire` -> `sa*`, `sDown` -> `sb*`, `sFwd` -> `sc*`; `sResp` -> `sa*`). */
export function roteiroGenerico(tipo: TipoDeFilme, golpe: string): RoteiroFilme {
  const letra = golpe === 'sDown' ? 'b' : golpe === 'sFwd' ? 'c' : 'a';
  const s = (n: number): string => `s${letra}${n}`;
  const enc: Encaixes = { r: [s(0), s(1), s(2)], prep: s(0), impacto: s(1), subida: s(1), queda: 'land', pega: s(1), giro: s(2), slam: s(2) };
  return expandir({ tipo, estilo: 'E6', fK: 'f0', enc }, enc);
}

/**
 * O roteiro do filme de um golpe: a ficha do atacante primeiro (`nila/sarpa/sFire`), depois a base (`hayato/sFire`; a ficha `chefe` do ZENON cai aqui),
 * depois o modelo genérico do tipo (`projetil` do evento; o resto é corpo a corpo no chão).
 */
export function roteiroDoFilme(lutador: string, ficha: string | null, golpe: string, projetil: boolean): RoteiroFilme {
  const daFicha = ficha ? montarDaTabela(`${lutador}/${ficha}/${golpe}`) : undefined;
  return daFicha ?? montarDaTabela(`${lutador}/${golpe}`) ?? roteiroGenerico(projetil ? 'projetil' : 'chao', golpe);
}
