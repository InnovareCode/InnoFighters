import type { Elenco } from '../assets/elenco';
import type { ChamadaReceita } from '../audio/receitas';
import { ALTURA, GROUND, LARGURA } from '../core/constantes';
import { CINEMATICA_PADRAO, type IdLutador, type IndiceLutador, type LeituraLuta, type LutadorLeitura, type PreferenciaCinematica } from '../core/contratos';
import { clamp, easeOut } from '../core/math';
import { poseDaCena } from '../data/cena';
import { getPD, hasPose } from '../data/poses';
import { sortearFala, quemFalaNaRodada, type EntradaDaRodada, type OpcoesDoSorteio, type PedidoDeFala } from '../data/provocacoes';
import type { LutadorMontado } from '../data/montar';
import { APRESENTACAO } from './apresentacao-lutadores';
import {
  desenharBalao,
  escalaDoPop,
  fontesProntas,
  colocarBalao,
  escolherPlano,
  LIMITES_COM_FAIXAS,
  LIMITES_COM_HUD,
  retanguloDaCabeca,
  retanguloDaColocacao,
  RESERVA_DA_SETA,
  variantesDoBalao,
  type CabecaNaTela,
  type CaixaDoBalao,
  type PlanoDoBalao,
  type Retangulo,
} from './balao';
import { ALTURA_DA_FAIXA, PULO_VALE_A_PARTIR_DE, SAIDA_AO_PULAR } from './entrada-chefe';
import { chDaFicha } from './lutador';
import type { Ctx } from './tela';

/*
 * PROVOCAÇÃO antes do round e na vitória (docs/spec-provocacao-prerround-e-vitoria.md). É APRESENTAÇÃO PURA e fica FORA do motor e do lock-step, como a
 * entrada do chefão (`entrada-chefe.ts`) e a cinemática do especial: a cena da luta NÃO chama `game.update` enquanto ela roda, então tick, relógio, RNG da
 * luta e eventos pendentes são exatamente os de uma luta sem provocação. Este arquivo não lê nem escreve o `Game`: recebe a `LeituraLuta` só para
 * desenhar. A ÚNICA escrita (`matchDone = true` no fim da vitória) é da CENA, a mesma que o ENTER já faz.
 *
 * Quatro peças: (1) funções PURAS de decisão (`provocacaoLigada`, `modoDaProvocacao`); (2) o ROTEIRO e a linha do tempo pura do tick (`montarRoteiro`,
 * `linhaDaProvocacao`); (3) o lugar do balão em cima do lutador (`cabecaNaTela`, `balao.ts`); (4) o controlador `Provocacao` (API da `EntradaDoChefe`).
 * Decisões do dono (2026-10-21): também no VERSUS de 2 jogadores, opção própria PROVOCAÇÕES, todo round do 2º em diante (curto), P1 fala primeiro no round 1.
 */

export type TipoProvocacao = 'abertura' | 'rodada' | 'vitoria';
export type ModoProvocacao = 'completa' | 'curta';

/** Tempos da linha do tempo (60 ticks = 1 s). */
export const PROVOCACAO = {
  /** O pulo vale a partir deste tick antes do round (não engole o ENTER que confirmou o VS) e na vitória (quem deu o KO costuma estar martelando ataque). */
  puloAposDoRound: PULO_VALE_A_PARTIR_DE,
  puloAposDaVitoria: 24,
  /** Ao pular, a saída leva no máximo isto. */
  saida: SAIDA_AO_PULAR,
  /** A andada do round 1 (COMPLETA): de dx = ∓260 até 0, em 40 ticks. */
  andadaTicks: 40,
  andadaDx: 260,
  /** O 1º balão do round 1 abre neste tick (COMPLETA) e o do round 2+ revela a partir do 8. */
  primeiroBalaoEm: 44,
  /** Pausa entre os dois balões do round 1. */
  pausaEntreBaloes: 4,
  /** Pop de abertura, fecho e fade da CURTA (ticks). */
  pop: 8,
  fecha: 6,
  fade: 8,
  /** Letras reveladas por tick (COMPLETA). */
  letrasPorTick: 1.5,
  /** Faixas de cinema: round 1 (entra 20, sai 20) e vitória (entra 14, sai 12). */
  faixaDoRound: 20,
  faixaDaVitoriaEntra: 14,
  faixaDaVitoriaSai: 12,
  /** A vitória: o balão abre no tick 16, o push-in vai a 1,08 em 40 ticks. */
  vitoriaBalaoEm: 16,
  zoomDaVitoria: 1.08,
  zoomTicks: 40,
} as const;

// ---------------------------------------------------------------------------------------------------------------------------------
// Decisão: ligada? em que modo? (puras)
// ---------------------------------------------------------------------------------------------------------------------------------

export interface DadosDaLuta {
  readonly regras: { readonly cinematica: boolean };
  /** `Configuracoes.provocacoes` já resolvida (ligadas?). */
  readonly ligadas: boolean;
  readonly modo: string;
  readonly p1cpu: number | null | undefined;
  readonly cpu: number | null | undefined;
  readonly chefe: boolean | undefined;
}

/**
 * A provocação existe nesta luta? Só EXCLUI: `?expansao=4` (`regras.cinematica` falso), a opção PROVOCAÇÕES desligada, TREINO, CPU×CPU (só nos testes) e, no
 * PRÉ-ROUND, a luta de chefão (a entrada dramática do ZENON é o round 1 dele). A VITÓRIA vale no chefão. ARCADE, LUTA vs CPU e VERSUS de 2 jogadores: sim.
 */
export function provocacaoLigada(d: DadosDaLuta, momento: 'prerround' | 'vitoria'): boolean {
  if (!d.regras.cinematica || !d.ligadas) return false;
  if (d.modo === 'training') return false;
  if (d.p1cpu != null && d.cpu != null) return false;
  if (momento === 'prerround' && d.chefe) return false;
  return true;
}

/**
 * COMPLETA, CURTA ou nada. A preferência de CINEMÁTICA só escolhe o jeito (decisão do dono: ligar e desligar é a opção PROVOCAÇÕES):
 * - round 1: COMPLETA na 1ª vez do confronto com cinemática COMPLETA; CURTA se o confronto se repete (continue, reinício, revanche) ou a cinemática é CURTA/DESLIGADA;
 * - round 2+: um balão curto de 1 linha SEMPRE (decisão do dono: "sempre antes dos rounds"; a opção PROVOCAÇÕES é quem liga e desliga): COMPLETA com a cinemática
 *   COMPLETA (letra a letra, com pop), CURTA nas demais (texto inteiro com fade, sem pop);
 * - vitória: COMPLETA com a cinemática COMPLETA, senão CURTA.
 * Sem preferência salva: COMPLETA, ou CURTA se o aparelho pede menos movimento (a mesma regra da cinemática do especial).
 */
export function modoDaProvocacao(tipo: TipoProvocacao, pref: PreferenciaCinematica | undefined, reduzMovimento: boolean, repetido: boolean): ModoProvocacao {
  const p = pref ?? (reduzMovimento ? 'curta' : CINEMATICA_PADRAO);
  if (tipo === 'abertura') return p === 'completa' && !repetido ? 'completa' : 'curta';
  return p === 'completa' ? 'completa' : 'curta';
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Durações (puras)
// ---------------------------------------------------------------------------------------------------------------------------------

/** COMPLETA: ticks de um balão de `n` caracteres (revelação + leitura): 40 car. = 124 (2,1 s). No round 2+ o teto é 126. */
export function duracaoDoBalao(n: number, tipo: TipoProvocacao = 'abertura'): number {
  return clamp(24 + Math.round(2.5 * n), 84, tipo === 'rodada' ? 126 : 190);
}

/** CURTA: o texto entra inteiro; 72 a 120 ticks (1,2 a 2 s). */
export function duracaoCurta(n: number): number {
  return clamp(20 + Math.round(1.6 * n), 72, 120);
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Roteiro e linha do tempo (puros)
// ---------------------------------------------------------------------------------------------------------------------------------

export interface FalaDoRoteiro {
  readonly falante: IndiceLutador;
  /** Texto final (com `{rival}` trocado). */
  readonly texto: string;
  /** Caracteres do texto (conta a duração). */
  readonly n: number;
}

export interface JanelaDeBalao extends FalaDoRoteiro {
  /** Tick em que abre, em que as letras começam, em que começa a fechar e em que some. */
  readonly abre: number;
  readonly letrasEm: number;
  readonly fecha: number;
  readonly fim: number;
  /** Letra a letra e pop (COMPLETA sem movimento reduzido) ou texto inteiro com fade? */
  readonly revelar: boolean;
}

export interface Roteiro {
  readonly tipo: TipoProvocacao;
  readonly modo: ModoProvocacao;
  readonly reduz: boolean;
  /** Ticks até a provocação acabar sem ninguém pular. */
  readonly total: number;
  readonly janelas: readonly JanelaDeBalao[];
  /** Faixas de cinema (COMPLETA do round 1 e da vitória) e quantos ticks levam para entrar e sair. */
  readonly faixas: boolean;
  readonly faixaEntra: number;
  readonly faixaSai: number;
  /** O HUD fica? (some só com as faixas) e o texto de fase (ROUND N / X VENCE!)? */
  readonly hud: boolean;
  readonly overlay: boolean;
  /** Os dois andam até a posição no começo do round 1 (COMPLETA, sem movimento reduzido). */
  readonly andada: boolean;
  /** Push-in da vitória (1 = sem). */
  readonly zoomFinal: number;
  readonly vencedor: IndiceLutador | null;
  /** O pulo só vale a partir deste tick. */
  readonly puloAPartirDe: number;
}

/** Monta o roteiro de uma provocação. `falas`: abertura = [P1, P2]; rodada = [quem fala]; vitória = [o vencedor]. */
export function montarRoteiro(tipo: TipoProvocacao, modo: ModoProvocacao, reduz: boolean, falas: readonly FalaDoRoteiro[]): Roteiro {
  const P = PROVOCACAO;
  const completa = modo === 'completa';
  const revelar = completa && !reduz;
  const janela = (f: FalaDoRoteiro, abre: number, letrasEm: number, dur: number): JanelaDeBalao => ({ ...f, abre, letrasEm, fecha: abre + dur, fim: abre + dur + P.fecha, revelar });
  const base = { tipo, modo, reduz, vencedor: tipo === 'vitoria' ? (falas[0]?.falante ?? null) : null };

  if (tipo === 'abertura' && completa) {
    const janelas: JanelaDeBalao[] = [];
    let t = P.primeiroBalaoEm;
    for (const f of falas) {
      const j = janela(f, t, t, duracaoDoBalao(f.n));
      janelas.push(j);
      t = j.fim + P.pausaEntreBaloes;
    }
    const ultimo = janelas[janelas.length - 1];
    const total = (ultimo ? ultimo.fim : P.primeiroBalaoEm) + P.faixaDoRound;
    return { ...base, total, janelas, faixas: true, faixaEntra: P.faixaDoRound, faixaSai: P.faixaDoRound, hud: false, overlay: false, andada: !reduz, zoomFinal: 1, puloAPartirDe: P.puloAposDoRound };
  }
  if (tipo === 'abertura') {
    // CURTA: os dois balões juntos, texto inteiro com fade
    const dur = duracaoCurta(Math.max(0, ...falas.map((f) => f.n)));
    const janelas = falas.map((f) => janela(f, 0, 0, dur));
    return { ...base, total: dur + P.fecha, janelas, faixas: false, faixaEntra: 1, faixaSai: 1, hud: true, overlay: false, andada: false, zoomFinal: 1, puloAPartirDe: P.puloAposDoRound };
  }
  if (tipo === 'rodada') {
    const f = falas[0] as FalaDoRoteiro;
    // COMPLETA: revela a partir do tick 8, até 126 ticks; CURTA: texto inteiro com fade, 72 a 120 ticks (também ~2 s)
    const j = completa ? janela(f, 0, P.pop, duracaoDoBalao(f.n, 'rodada')) : janela(f, 0, 0, duracaoCurta(f.n));
    return { ...base, total: j.fim, janelas: [j], faixas: false, faixaEntra: 1, faixaSai: 1, hud: true, overlay: false, andada: false, zoomFinal: 1, puloAPartirDe: P.puloAposDoRound };
  }
  // vitória
  const f = falas[0] as FalaDoRoteiro;
  if (completa) {
    // 16 -> 16+D: letra a letra e leitura; mais 30 ticks com a fala inteira e o ▶; o balão fecha em 46+D
    const j = janela(f, P.vitoriaBalaoEm, P.vitoriaBalaoEm, 30 + duracaoDoBalao(f.n));
    const total = j.fim + P.faixaDaVitoriaSai;
    return { ...base, total, janelas: [j], faixas: true, faixaEntra: P.faixaDaVitoriaEntra, faixaSai: P.faixaDaVitoriaSai, hud: false, overlay: false, andada: false, zoomFinal: reduz ? 1 : P.zoomDaVitoria, puloAPartirDe: P.puloAposDaVitoria };
  }
  const j = janela(f, 0, 0, duracaoCurta(f.n));
  return { ...base, total: j.fim, janelas: [j], faixas: false, faixaEntra: 1, faixaSai: 1, hud: true, overlay: true, andada: false, zoomFinal: 1, puloAPartirDe: P.puloAposDaVitoria };
}

export type Papel = 'andando' | 'parado' | 'provoca' | 'vitoria';

export interface BalaoDoQuadro {
  /** Índice da janela no roteiro. */
  readonly janela: number;
  readonly falante: IndiceLutador;
  readonly letras: number;
  readonly escala: number;
  readonly alfa: number;
  /** Texto todo revelado e o balão ainda aberto: mostra o ▶ (na vitória). */
  readonly seta: boolean;
}

export interface QuadroDaProvocacao {
  /** Altura de cada faixa de cinema (0 a 56). */
  readonly faixa: number;
  readonly hud: boolean;
  readonly overlay: boolean;
  /** Deslocamento visual de cada lutador (a andada). */
  readonly deslocamento: readonly [number, number];
  /** O papel de cada lutador (null = a pose do motor, p. ex. o perdedor da vitória). */
  readonly papeis: readonly [Papel | null, Papel | null];
  /** Zoom de apresentação (1 = nenhum). */
  readonly zoom: number;
  readonly baloes: readonly BalaoDoQuadro[];
}

/**
 * A linha do tempo (pura): o que aparece no tick `tick`. `pulouEm` = o tick em que alguém pulou (null = não): dali a saída leva `SAIDA_AO_PULAR` ticks, as
 * faixas e os balões se vão, o zoom volta e a andada termina. Movimento reduzido: `deslocamento` = 0, `zoom` = 1 e `escala` = 1 em TODOS os quadros.
 */
export function linhaDaProvocacao(r: Roteiro, tick: number, pulouEm: number | null = null): QuadroDaProvocacao {
  const P = PROVOCACAO;
  const fim = fimDoRoteiro(r, pulouEm);
  const saindo = pulouEm === null ? 0 : clamp((tick - pulouEm) / Math.max(1, fim - pulouEm), 0, 1);

  let faixa = 0;
  if (r.faixas) {
    const entra = Math.min(1, tick / r.faixaEntra);
    const saiNat = clamp((tick - (r.total - r.faixaSai)) / r.faixaSai, 0, 1);
    faixa = ALTURA_DA_FAIXA * easeOut(entra) * (1 - saiNat) * (1 - saindo);
  }

  // andada: dx de ∓260 até 0; se pulou, o que falta se resolve durante a saída
  let andou = 1;
  if (r.andada) {
    const k = Math.min(1, tick / P.andadaTicks);
    const nat = easeOut(k);
    andou = pulouEm === null ? nat : nat + (1 - nat) * saindo;
  }
  const dx = (1 - andou) * P.andadaDx;
  const andandoAinda = r.andada && andou < 1;

  // zoom da vitória
  let zoom = 1;
  if (r.zoomFinal > 1) {
    const z = 1 + (r.zoomFinal - 1) * easeOut(Math.min(1, tick / P.zoomTicks));
    zoom = 1 + (z - 1) * (1 - saindo);
  }

  const baloes: BalaoDoQuadro[] = [];
  r.janelas.forEach((j, i) => {
    if (tick < j.abre || tick >= j.fim) return;
    const abriu = tick - j.abre;
    let alfa = j.revelar ? Math.min(1, abriu / P.pop) : Math.min(1, abriu / P.fade);
    if (tick >= j.fecha) alfa *= 1 - (tick - j.fecha) / P.fecha;
    alfa *= 1 - saindo;
    const escala = j.revelar ? escalaDoPop(abriu / P.pop) : 1;
    const letras = j.revelar ? Math.max(0, (tick - j.letrasEm) * P.letrasPorTick) : Infinity;
    const completo = letras >= j.n;
    baloes.push({ janela: i, falante: j.falante, letras, escala, alfa: Math.max(0, alfa), seta: r.tipo === 'vitoria' && completo && tick < j.fecha && pulouEm === null });
  });

  // papéis: quem fala está em `provoca` enquanto o balão está aberto
  const papel = (i: IndiceLutador): Papel | null => {
    if (r.tipo === 'vitoria') return i === r.vencedor ? 'vitoria' : null;
    if (r.janelas.some((j) => j.falante === i && tick >= j.abre && tick < j.fecha)) return 'provoca';
    return andandoAinda ? 'andando' : 'parado';
  };
  return { faixa, hud: r.hud, overlay: r.overlay, deslocamento: [dx === 0 ? 0 : -dx, dx], papeis: [papel(0), papel(1)], zoom, baloes };
}

/** Em que tick a provocação acaba (pulada ou não). */
export function fimDoRoteiro(r: Roteiro, pulouEm: number | null): number {
  return pulouEm === null ? r.total : Math.min(r.total, pulouEm + PROVOCACAO.saida);
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Poses e lugar do balão
// ---------------------------------------------------------------------------------------------------------------------------------

/**
 * `provoca0/1` ainda não existem no atlas de ninguém (o Apolo as entrega depois, spec §6): sem o quadro a pose é `win`. A troca mora AQUI, na render, e não no
 * `ALIAS` global de `data/poses.ts`, porque o teste de fidelidade (`dados.test.ts`) exige que `getPD` responda como o protótipo a todo nome do alias. Quando o
 * quadro existir, ele vence sozinho, sem mudar código.
 */
export function resolverPose(ch: Parameters<typeof hasPose>[0], nome: string): string {
  return /^provoca\d$/.test(nome) && !hasPose(ch, nome) ? 'win' : nome;
}

/** Pose DESENHADA de quem tem um papel (só os nomes que as poses atuais já têm; `provoca0` cai em `win` até o Apolo entregar o quadro, ver `resolverPose`). */
export function poseDoPapel(papel: Papel, id: string, tick: number, desde = 0): string {
  const ap = APRESENTACAO[id];
  switch (papel) {
    case 'andando':
      return `walk${Math.floor(tick / 5) % 8}`;
    case 'parado':
      return `idle${Math.floor(tick / 8) % 4}`;
    case 'provoca':
      return poseDaCena(ap?.provoca ?? { duracao: 30, poses: ['provoca0'] }, tick - desde);
    case 'vitoria':
      return poseDaCena(ap?.vitoria ?? { duracao: 40, poses: ['provoca0', 'win'] }, tick - desde);
  }
}

/** Mapeia um ponto do mundo para a TELA: câmera da luta e depois o zoom de apresentação (o mesmo que `desenharMundo` faz). */
export function paraATela(x: number, y: number, cam: { readonly x: number; readonly z: number }, zoom?: { readonly fator: number; readonly x: number }): { x: number; y: number } {
  let sx = cam.x + (x - cam.x) * cam.z;
  let sy = GROUND + (y - GROUND) * cam.z;
  if (zoom && zoom.fator !== 1) {
    sx = zoom.x + (sx - zoom.x) * zoom.fator;
    sy = GROUND + (sy - GROUND) * zoom.fator;
  }
  return { x: sx, y: sy };
}

/**
 * A cabeça de `f` NA TELA com a pose `pose`: o topo vem do quadro desenhado (pés − altura × K, que é o topo real do corpo: medido pixel a pixel nos 10
 * lutadores), e a região "da cabeça" (que o balão não deve cobrir) é a fração de cima do corpo.
 */
export function cabecaNaTela(
  f: Pick<LutadorLeitura, 'x' | 'y' | 'facing' | 'ficha' | 'pose'>,
  ch: LutadorMontado,
  pose: string,
  cam: { readonly x: number; readonly z: number },
  dx = 0,
  zoom?: { readonly fator: number; readonly x: number },
): CabecaNaTela {
  const base = chDaFicha(ch, f.ficha);
  const pd = getPD(base, pose);
  const P = f.pose;
  const alturaNoMundo = pd.h * base.K * (P.sy || 1);
  const pes = f.y + P.dy;
  const xMundo = f.x + dx + f.facing * (P.dx || 0);
  const cabeca = paraATela(xMundo, pes - alturaNoMundo, cam, zoom);
  const chao = paraATela(xMundo, pes, cam, zoom);
  const H = Math.max(1, chao.y - cabeca.y);
  return { x: cabeca.x, topo: cabeca.y, meiaLargura: 0.17 * H, altura: 0.36 * H };
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Falas (cola entre a tabela da Vega e o roteiro)
// ---------------------------------------------------------------------------------------------------------------------------------

export interface DadosDeFala {
  readonly ids: readonly [IdLutador, IdLutador];
  readonly nomes: readonly [string, string];
}

const comoFala = (falante: IndiceLutador, texto: string): FalaDoRoteiro => ({ falante, texto, n: texto.length });

/** Round 1: o P1 fala primeiro e o P2 responde (decisão do dono). */
export function falasDaAbertura(d: DadosDeFala, op: OpcoesDoSorteio): FalaDoRoteiro[] {
  return ([0, 1] as const).map((i) => {
    const o = i === 0 ? 1 : 0;
    const pedido: PedidoDeFala = { tipo: 'abertura', falante: d.ids[i], rival: d.ids[o], nomeRival: d.nomes[o] };
    return comoFala(i, sortearFala(pedido, op).texto);
  });
}

/** Round 2+: fala quem perdeu o round anterior (empate: P1 nos ímpares, P2 nos pares); `decisivo` troca a lista. */
export function falaDaRodada(d: DadosDeFala, e: EntradaDaRodada, op: OpcoesDoSorteio): FalaDoRoteiro[] {
  const { falante, decisivo } = quemFalaNaRodada(e);
  const o = falante === 0 ? 1 : 0;
  const pedido: PedidoDeFala = { tipo: 'rodada', falante: d.ids[falante], rival: d.ids[o], nomeRival: d.nomes[o], decisivo };
  return [comoFala(falante, sortearFala(pedido, op).texto)];
}

/** Fim da luta: o vencedor provoca o perdedor. */
export function falaDaVitoria(d: DadosDeFala, vencedor: IndiceLutador, c: { perfeita?: boolean; porTempo?: boolean }, op: OpcoesDoSorteio): FalaDoRoteiro[] {
  const o = vencedor === 0 ? 1 : 0;
  const pedido: PedidoDeFala = { tipo: 'vitoria', falante: d.ids[vencedor], rival: d.ids[o], nomeRival: d.nomes[o], perfeita: c.perfeita, porTempo: c.porTempo };
  return [comoFala(vencedor, sortearFala(pedido, op).texto)];
}

// ---------------------------------------------------------------------------------------------------------------------------------
// Som (só `tone`/`noise`, D8; o `audio/eventos.ts` NÃO muda: o lock-step compara os sons de evento)
// ---------------------------------------------------------------------------------------------------------------------------------

export const SOM_DO_BALAO: readonly ChamadaReceita[] = [{ k: 'R', tipo: 'bandpass', f0: 600, f1: 1800, Q: 1.2, t: 0.08, vol: 0.12 }];
export const blip = (pitch: number): readonly ChamadaReceita[] => [{ k: 'T', tipo: 'triangle', f0: 420 * pitch, t: 0.04, vol: 0.05 }];
export const SOM_DA_VITORIA: readonly ChamadaReceita[] = [
  { k: 'T', tipo: 'triangle', f0: 523, t: 0.1, vol: 0.1 },
  { k: 'T', tipo: 'triangle', f0: 659, t: 0.1, vol: 0.1, quando: 0.1 },
  { k: 'T', tipo: 'triangle', f0: 784, t: 0.14, vol: 0.1, quando: 0.2 },
];

export type SomDaProvocacao = 'faixas' | 'balao' | 'vitoria' | { readonly blip: number };

export interface OpcoesProvocacao {
  readonly aoSom?: (som: SomDaProvocacao) => void;
}

/** O que a cena entrega ao `desenharMundo` e ao `desenhar` neste quadro. */
export interface VistaDaProvocacao {
  readonly quadro: QuadroDaProvocacao;
  readonly poses: Partial<Record<0 | 1, string>>;
  readonly deslocamento: Partial<Record<0 | 1, number>>;
  readonly zoom: { readonly fator: number; readonly x: number } | undefined;
}

/** Letras que não são espaço dentro dos primeiros `n` caracteres (um "blip" a cada 3). */
const letrasQueSoam = (texto: string, n: number): number => {
  let c = 0;
  for (let i = 0; i < Math.min(n, texto.length); i++) if (texto[i] !== ' ' && texto[i] !== '\n') c++;
  return c;
};

/**
 * O controlador. API da `EntradaDoChefe`: `iniciar`, `ativa`, `avancar`, `pular`, `zerar`, `desenhar`. A cena chama `avancar()` UMA vez por tick no lugar de
 * `game.update`, `vista(luta)` para dizer ao `desenharMundo` como desenhar o mundo, e `desenhar()` por cima.
 */
export class Provocacao {
  ativa = false;
  roteiro: Roteiro | null = null;
  /** Ticks que já andaram desde `iniciar` (0 no começo). */
  tick = 0;
  pulouEm: number | null = null;
  private pitch: readonly [number, number] = [1, 1];
  private somDoBalao: boolean[] = [];
  private blipsDados: number[] = [];
  /** As variantes de largura de cada balão (medidas UMA vez), o plano escolhido (UMA vez, com a geometria final) e o retângulo final dele (para os balões seguintes). */
  private variantes = new Map<number, { caixas: CaixaDoBalao[]; fontesOk: boolean }>();
  private planos = new Map<number, PlanoDoBalao>();
  private finais = new Map<number, Retangulo>();
  private nomes: readonly [string, string] = ['', ''];
  private cores: readonly [string, string] = ['#ffd9a6', '#ffd9a6'];

  constructor(private readonly op: OpcoesProvocacao = {}) {}

  /** Começa a provocação. `pitch`, `nomes` e `cores` vêm dos dois lutadores (índice 0 = P1). */
  iniciar(r: Roteiro, quem: { readonly pitch: readonly [number, number]; readonly nomes: readonly [string, string]; readonly cores: readonly [string, string] }): void {
    this.ativa = true;
    this.roteiro = r;
    this.tick = 0;
    this.pulouEm = null;
    this.pitch = quem.pitch;
    this.nomes = quem.nomes;
    this.cores = quem.cores;
    this.somDoBalao = r.janelas.map(() => false);
    this.blipsDados = r.janelas.map(() => 0);
    this.variantes.clear();
    this.planos.clear();
    this.finais.clear();
    if (r.faixas) this.op.aoSom?.('faixas');
  }

  /** Para tudo (a luta foi reiniciada, a cena saiu ou um teste desligou a provocação). */
  zerar(): void {
    this.ativa = false;
    this.roteiro = null;
    this.tick = 0;
    this.pulouEm = null;
    this.variantes.clear();
    this.planos.clear();
    this.finais.clear();
  }

  /** O quadro de agora. */
  quadro(): QuadroDaProvocacao | null {
    return this.roteiro ? linhaDaProvocacao(this.roteiro, this.tick, this.pulouEm) : null;
  }

  /** Quanto falta para acabar (ticks). */
  restante(): number {
    return this.roteiro ? Math.max(0, fimDoRoteiro(this.roteiro, this.pulouEm) - this.tick) : 0;
  }

  /** Pula a provocação INTEIRA (os dois balões). Só vale depois do tick 10 (antes do round) ou 24 (vitória), e uma vez. Devolve se valeu. */
  pular(): boolean {
    const r = this.roteiro;
    if (!this.ativa || !r || this.pulouEm !== null || this.tick < r.puloAPartirDe) return false;
    this.pulouEm = this.tick;
    return true;
  }

  /** Um tick: anda o relógio da provocação (nunca o da luta) e dispara os sons. Ao chegar ao fim, `ativa` vira false. */
  avancar(): void {
    const r = this.roteiro;
    if (!this.ativa || !r) return;
    this.tick++;
    if (this.pulouEm === null || this.tick <= this.pulouEm) {
      r.janelas.forEach((j, i) => {
        if (!this.somDoBalao[i] && this.tick >= j.abre) {
          this.somDoBalao[i] = true;
          this.op.aoSom?.('balao');
          if (r.tipo === 'vitoria') this.op.aoSom?.('vitoria');
        }
        if (j.revelar && this.tick >= j.letrasEm && this.tick < j.fecha) {
          const revelado = Math.floor((this.tick - j.letrasEm) * PROVOCACAO.letrasPorTick);
          const devidos = Math.floor(letrasQueSoam(j.texto, revelado) / 3);
          // no máximo UM blip por tick: o ritmo da fala, nunca uma rajada
          if (devidos > (this.blipsDados[i] ?? 0)) {
            this.blipsDados[i] = (this.blipsDados[i] ?? 0) + 1;
            this.op.aoSom?.({ blip: this.pitch[j.falante] });
          }
        }
      });
    }
    if (this.tick >= fimDoRoteiro(r, this.pulouEm)) this.ativa = false;
  }

  /** O plano escolhido para o balão da janela `i` (só existe depois do 1º quadro desenhado). Leitura, para os testes provarem que ele não pula. */
  planoDe(i: number): PlanoDoBalao | undefined {
    return this.planos.get(i);
  }

  /** Como o mundo é desenhado neste quadro (poses, andada, zoom, HUD e overlay). `null` se parada. */
  vista(luta: Pick<LeituraLuta, 'fighters' | 'cam'>, elenco: Elenco): VistaDaProvocacao | null {
    const r = this.roteiro;
    const q = this.quadro();
    if (!this.ativa || !r || !q) return null;
    const poses: Partial<Record<0 | 1, string>> = {};
    for (const i of [0, 1] as const) {
      const papel = q.papeis[i];
      if (!papel) continue;
      const desde = papel === 'provoca' ? (r.janelas.find((j) => j.falante === i && this.tick >= j.abre && this.tick < j.fecha)?.abre ?? 0) : 0;
      const id = luta.fighters[i].id;
      poses[i] = resolverPose(elenco[id].ch, poseDoPapel(papel, id, this.tick, desde));
    }
    let zoom: VistaDaProvocacao['zoom'];
    if (q.zoom > 1 && r.vencedor !== null) {
      const f = luta.fighters[r.vencedor];
      zoom = { fator: q.zoom, x: paraATela(f.x, f.y, luta.cam).x };
    }
    return { quadro: q, poses, deslocamento: { 0: q.deslocamento[0], 1: q.deslocamento[1] }, zoom };
  }

  private variantesDe(ctx: Ctx, i: number, j: JanelaDeBalao): CaixaDoBalao[] {
    const r0 = this.roteiro as Roteiro;
    const guardada = this.variantes.get(i);
    if (guardada && (guardada.fontesOk || !fontesProntas())) return guardada.caixas;
    // a fonte do corpo ainda não chegou na 1ª medida: remede quando chegar (risco R5) e escolhe o plano de novo
    // a vitória reserva a faixa do ▶ embaixo do texto (o ▶ não pode cobrir a última letra)
    const caixas = variantesDoBalao(ctx, j.texto, this.nomes[j.falante], r0.tipo === 'vitoria' ? RESERVA_DA_SETA : 0);
    this.variantes.set(i, { caixas, fontesOk: fontesProntas() });
    this.planos.delete(i);
    this.finais.delete(i);
    return caixas;
  }

  /**
   * As poses de cada lutador NO MOMENTO EM QUE O BALÃO ESTÁ ABERTO (a geometria FINAL, sobre a qual se escolhe o plano): quem fala em `provoca` ou `vitoria`, quem
   * escuta em `idle`, o perdedor da vitória como o motor o deixou. Assim o plano não depende do quadro em que o balão nasceu (a andada, o pop).
   */
  private posesFinais(luta: Pick<LeituraLuta, 'fighters'>, elenco: Elenco, r: Roteiro, j: JanelaDeBalao): [string, string] {
    const nome = (i: 0 | 1): string => {
      const f = luta.fighters[i];
      const ch = elenco[f.id].ch;
      if (r.tipo === 'vitoria') return i === r.vencedor ? resolverPose(ch, poseDoPapel('vitoria', f.id, j.abre + 60)) : f.pose.name;
      const fala = r.janelas.some((o) => o.falante === i && o.abre < j.fim && o.fim > j.abre);
      return resolverPose(ch, fala ? poseDoPapel('provoca', f.id, j.abre + 10, j.abre) : poseDoPapel('parado', f.id, 0));
    };
    return [nome(0), nome(1)];
  }

  /** O zoom que a provocação terá no fim (o push-in da vitória); ancorado no vencedor. */
  private zoomFinal(luta: Pick<LeituraLuta, 'fighters' | 'cam'>, r: Roteiro): VistaDaProvocacao['zoom'] {
    if (r.zoomFinal <= 1 || r.vencedor === null) return undefined;
    const f = luta.fighters[r.vencedor];
    return { fator: r.zoomFinal, x: paraATela(f.x, f.y, luta.cam).x };
  }

  /** As faixas e os balões, por cima do mundo que a cena desenhou com `vista`. */
  desenhar(ctx: Ctx, luta: Pick<LeituraLuta, 'fighters' | 'cam'>, elenco: Elenco, vista: VistaDaProvocacao): void {
    const r = this.roteiro;
    if (!this.ativa || !r) return;
    const q = vista.quadro;
    if (q.faixa > 0) {
      ctx.save();
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, LARGURA, q.faixa);
      ctx.fillRect(0, ALTURA - q.faixa, LARGURA, q.faixa);
      ctx.restore();
    }
    const limites = r.faixas ? LIMITES_COM_FAIXAS : LIMITES_COM_HUD;
    const ocupados: Retangulo[] = [];
    for (const b of q.baloes) {
      const j = r.janelas[b.janela] as JanelaDeBalao;
      const caixas = this.variantesDe(ctx, b.janela, j);
      const outro = j.falante === 0 ? 1 : 0;
      let plano = this.planos.get(b.janela);
      if (!plano) {
        // o plano é escolhido UMA vez, com a geometria FINAL (balão aberto, zoom final, andada terminada): nada pula de lugar durante o push-in
        const zf = this.zoomFinal(luta, r);
        const poses = this.posesFinais(luta, elenco, r, j);
        const fal = this.cabecaDe(luta, elenco, j.falante, poses[j.falante], zf, 0);
        const out = this.cabecaDe(luta, elenco, outro, poses[outro], zf, 0);
        // os balões abertos AO MESMO TEMPO que este, já planejados (a CURTA do round 1 abre os dois juntos)
        const juntos = [...this.finais].filter(([i]) => i < b.janela && (r.janelas[i] as JanelaDeBalao).fim > j.abre && (r.janelas[i] as JanelaDeBalao).abre < j.fim).map(([, rect]) => rect);
        const escolha = escolherPlano(caixas, fal, [retanguloDaCabeca(out)], juntos, limites);
        plano = escolha.plano;
        this.planos.set(b.janela, plano);
        this.finais.set(b.janela, retanguloDaColocacao(escolha.colocacao));
      }
      const caixa = caixas[plano.variante] as CaixaDoBalao;
      const poseAgora = (i: 0 | 1): string => vista.poses[i] ?? luta.fighters[i].pose.name;
      const falanteAgora = this.cabecaDe(luta, elenco, j.falante, poseAgora(j.falante), vista.zoom, vista.deslocamento[j.falante] ?? 0);
      const outroAgora = this.cabecaDe(luta, elenco, outro, poseAgora(outro), vista.zoom, vista.deslocamento[outro] ?? 0);
      const col = colocarBalao(caixa, plano, falanteAgora, [retanguloDaCabeca(outroAgora)], ocupados, limites);
      ocupados.push(retanguloDaColocacao(col));
      desenharBalao(ctx, caixa, col, { letras: b.letras, escala: b.escala, alfa: b.alfa, seta: b.seta, tick: this.tick, piscar: !r.reduz, corDoNome: this.cores[j.falante] });
    }
  }

  private cabecaDe(luta: Pick<LeituraLuta, 'fighters' | 'cam'>, elenco: Elenco, i: 0 | 1, pose: string, zoom: VistaDaProvocacao['zoom'], dx: number): CabecaNaTela {
    const f = luta.fighters[i];
    return cabecaNaTela(f, elenco[f.id].ch, pose, luta.cam, dx, zoom);
  }
}
