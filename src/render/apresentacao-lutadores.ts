import type { LeituraLuta, LutadorLeitura } from '../core/contratos';
import { poseDaCena } from '../data/cena';
import type { CenaDef } from '../data/tipos';
import { BATIDAS_DO_ZENON, ROTEIROS_DOS_GUARDIOES, type RoteiroDeEntrada } from './roteiros-de-entrada';
import { TEXTOS_DOS_CHEFOES, type EpilogoDoChefe } from './textos-dos-chefoes';

/*
 * Apresentação dos lutadores (docs/spec-chefao-zenon.md §2.2 e §3): pose de ENTRADA (na `intro` do 1º round), pose de VITÓRIA (no estado `win`),
 * falas em legenda, aviso antes do VS e dados da entrada dramática do chefão. É só DESENHO: nada disto vai ao motor nem ao lock-step. Fica FORA do
 * `LutadorDef` (o mesmo princípio de `identidade-especiais.ts` e de `data/apresentacao-especiais.ts`); chave = id do lutador (string: o `zenon`
 * ainda não está em `IdLutador`, entra no flip da Z5). Nome de pose que falta no atlas cai na cadeia de `getPD` (atlas provisório).
 */

/** Textos em legenda (letreiro com `texto()`, sem voz). */
export type Falas = {
  /** Na entrada dramática do chefão. */
  readonly entrada?: string;
  /** Durante a cena da fase 2. */
  readonly fase2?: string;
  /** Quando o chefão vence a luta (`matchend`). */
  readonly vitoria?: string;
  /** No KO final do chefão (e na cena do final). */
  readonly derrota?: string;
};

/** O cartão da entrada dramática: o nome, o título e o rodapé ("dono do torneio"). */
export type CartaoDeEntrada = { readonly nome: string; readonly titulo: string; readonly rodape: string };

export type Apresentacao = {
  readonly entrada?: CenaDef;
  readonly vitoria?: CenaDef;
  /** Pose de quem FALA na provocação (balão do pré-round e da vitória). Ausente = `provoca0` (alias de `win` até o Apolo entregar o quadro). */
  readonly provoca?: CenaDef;
  readonly falas?: Falas;
  /** Aviso "UM DESAFIANTE SE APROXIMA": as duas linhas de baixo do título, no lugar do texto fixo. */
  readonly aviso?: readonly [string, string];
  /** O cartão da entrada dramática do ZENON (legado: o `roteiro.cartao` dele é este mesmo objeto). Os guardiões usam só `roteiro`. */
  readonly entradaDramatica?: CartaoDeEntrada;
  /**
   * Se há, o lutador, quando é o chefão, faz a entrada dramática (`EntradaDoChefe`) antes da `intro`: batidas de pose, zoom, efeito de cena, som e cartão (spec dos chefões
   * progressivos §2.3). É a fonte única da entrada; o ZENON e os 5 guardiões têm um.
   */
  readonly roteiro?: RoteiroDeEntrada;
  /** O rodapé do aviso antes do chefão (hoje: "1 round, 2 barras de vida"). Ausente = o texto fixo de sempre. */
  readonly avisoRodape?: string;
  /** ZENON já derrotado (D-A3): o aviso e o rodapé de revanche. */
  readonly avisoRevanche?: readonly [string, string];
  readonly avisoRodapeRevanche?: string;
  /** Título curto do HUD do chefão (<= 16, D-A5). Ausente = o título do lutador. */
  readonly tituloHud?: string;
  /** Rótulo da tela de VS ("ARCADE — A GUARDIÃ"). Ausente = o rótulo genérico do guardião / Anfitrião. */
  readonly vs?: string;
  /** Título do cartão de desbloqueio quando ele tem um próprio ("O ANFITRIÃO SE RENDE"). */
  readonly desbloqueioTitulo?: string;
  /** O epílogo do desbloqueio: quem é, por que guardava o selo e o convite. */
  readonly epilogo?: EpilogoDoChefe;
};

/** A parte de `Apresentacao` que vem dos textos do Apolo + o roteiro de um GUARDIÃO (aviso, rodapé, HUD, VS, falas, epílogo e a entrada). */
function doGuardiao(id: string): Apresentacao {
  const t = TEXTOS_DOS_CHEFOES[id];
  const r = ROTEIROS_DOS_GUARDIOES[id];
  if (!t || !r || !t.cartao || !t.aviso || !t.falas) throw new Error(`guardião sem textos ou roteiro: ${id}`);
  return {
    falas: t.falas,
    aviso: t.aviso,
    avisoRodape: t.avisoRodape,
    ...(t.tituloHud ? { tituloHud: t.tituloHud } : {}),
    vs: t.vs,
    epilogo: t.epilogo,
    roteiro: { cartao: t.cartao, ...r, naCorDoLutador: true },
  };
}

const CARTAO_DO_ZENON: CartaoDeEntrada = { nome: 'ZENON ARGYROS', titulo: 'O ARCONTE', rodape: 'DONO DO TORNEIO' };
const TEXTOS_DO_ZENON = TEXTOS_DOS_CHEFOES['zenon'];

export const APRESENTACAO: Readonly<Record<string, Apresentacao>> = {
  aminu: doGuardiao('aminu'),
  centella: doGuardiao('centella'),
  camille: doGuardiao('camille'),
  nila: doGuardiao('nila'),
  // A Dança da Águia, que era a cena do chefão, virou só entrada e vitória do BAATAR (decisão do dono, 2026-10-21). A PROVOCAÇÃO com balão (render/provocacao.ts) é outra coisa: usa `provoca` e `vitoria` daqui.
  // Como GUARDIÃO (5º selo) ele tem roteiro, textos e falas próprios; a Dança entra de novo na entrada dramática dele (devekh0-2).
  baatar: {
    entrada: { duracao: 90, poses: ['devekh0', 'devekh1', 'devekh2'] },
    vitoria: { duracao: 60, poses: ['devekh0', 'win'] },
    provoca: { duracao: 30, poses: ['devekh2'] },
    ...doGuardiao('baatar'),
  },
  zenon: {
    // Jogável (derrotado o chefão): as três poses de S10 linha 1, em 90 ticks. Como CHEFE ele já fez a entrada dramática: fica em `entrada2`.
    entrada: { duracao: 90, poses: ['entrada0', 'entrada1', 'entrada2'] },
    // S9 linha 2, células 2 e 3: aplaude devagar, depois fecha os olhos com a mão no ombro do casaco.
    vitoria: { duracao: 80, poses: ['vitoria0', 'vitoria1'] },
    // aperta a tira sorrindo (a pose da entrada dramática): é o gesto de quem provoca
    provoca: { duracao: 30, poses: ['entrada2'] },
    falas: {
      entrada: 'Bem-vindo à minha casa. Todo torneio precisa de um anfitrião... e de um último convidado.',
      fase2: 'Chega de cortesia.',
      vitoria: 'Aplausos para o convidado. A saída é pelos fundos.',
      derrota: 'Então o torneio é seu. Cuide melhor dele do que eu cuidei.',
    },
    aviso: ['O ANFITRIÃO', 'ESTÁ À SUA ESPERA'],
    entradaDramatica: CARTAO_DO_ZENON,
    // as batidas dão exatamente o 0/1/2 de antes (entrada0 de costas, entrada1 vira a cabeça, entrada2 aperta a tira); os braseiros da arena `gr` são o efeito
    roteiro: { cartao: CARTAO_DO_ZENON, batidas: BATIDAS_DO_ZENON, efeito: 'braseiros-gr' },
    ...(TEXTOS_DO_ZENON
      ? {
          avisoRodape: TEXTOS_DO_ZENON.avisoRodape,
          ...(TEXTOS_DO_ZENON.avisoRevanche ? { avisoRevanche: TEXTOS_DO_ZENON.avisoRevanche } : {}),
          ...(TEXTOS_DO_ZENON.avisoRodapeRevanche ? { avisoRodapeRevanche: TEXTOS_DO_ZENON.avisoRodapeRevanche } : {}),
          vs: TEXTOS_DO_ZENON.vs,
          ...(TEXTOS_DO_ZENON.desbloqueioTitulo ? { desbloqueioTitulo: TEXTOS_DO_ZENON.desbloqueioTitulo } : {}),
          epilogo: TEXTOS_DO_ZENON.epilogo,
        }
      : {}),
  },
};

/** O roteiro da entrada dramática de `id` (ou undefined: o lutador não faz entrada). */
export const roteiroDe = (id: string): RoteiroDeEntrada | undefined => APRESENTACAO[id]?.roteiro;

/** O mesmo lutador com outra pose desenhada (cópia rasa: o `Fighter` e a leitura original não mudam). */
export function comPose(f: LutadorLeitura, nome: string): LutadorLeitura {
  return f.pose.name === nome ? f : { ...f, pose: { ...f.pose, name: nome } };
}

/**
 * O nome da pose a desenhar no lugar da do motor, ou null se vale a do motor:
 * - `intro` do 1º round: a pose de ENTRADA do lutador (o chefão com entrada dramática fica na ÚLTIMA pose da entrada: ele já a fez);
 * - `win` em `roundend`/`matchend`: a pose de VITÓRIA, pelo tempo da fase.
 * Zero tempo a mais: a `intro` de 90 ticks e a vitória são as do motor; só muda o desenho.
 */
export function poseDeApresentacao(luta: Pick<LeituraLuta, 'phase' | 'round' | 't'>, f: Pick<LutadorLeitura, 'id' | 'state' | 'chefe'>): string | null {
  const ap = APRESENTACAO[f.id];
  if (!ap) return null;
  if (luta.phase === 'intro' && luta.round === 1 && ap.entrada) {
    if (f.chefe && ap.entradaDramatica) return ap.entrada.poses[ap.entrada.poses.length - 1] as string;
    // guardião com entrada própria (BAATAR): a Dança dele já foi a entrada; no ROUND 1 ele volta ao motor (guarda), sem repetir a Dança
    if (f.chefe && ap.roteiro) return null;
    return poseDaCena(ap.entrada, luta.t);
  }
  if ((luta.phase === 'roundend' || luta.phase === 'matchend') && f.state === 'win' && ap.vitoria) return poseDaCena(ap.vitoria, luta.t);
  return null;
}

/** A leitura com a pose de apresentação aplicada (a mesma, se não há). */
export function leituraApresentada(luta: LeituraLuta, f: LutadorLeitura): LutadorLeitura {
  const nome = poseDeApresentacao(luta, f);
  return nome === null ? f : comPose(f, nome);
}

/**
 * A fala que vale agora para o chefão `f` (ou null). Só três momentos: fase 2 durante a cena; vitória SÓ no `matchend` com ele vencedor; derrota SÓ no KO
 * FINAL dele (o `ko` que decide a luta, e fica até o `matchend` dele perdido por KO; perder por tempo não fala). Nunca em `roundend` (decisão do dono, 2026-10-21): perder ou ganhar um
 * round sem decidir a luta, inclusive por tempo, não fala. `t` é o tempo da fase.
 */
export function falaDoChefe(
  luta: Pick<LeituraLuta, 'phase' | 'matchWinner' | 'fighters' | 'winsNeeded'>,
  f: Pick<LutadorLeitura, 'id' | 'chefe' | 'indice' | 'hp'>,
): string | null {
  if (!f.chefe) return null;
  const falas = APRESENTACAO[f.id]?.falas;
  if (!falas) return null;
  if (luta.phase === 'cena-chefe') return falas.fase2 ?? null;
  if (luta.phase === 'matchend') {
    if (luta.matchWinner === f.indice) return falas.vitoria ?? null;
    // perdeu a luta: a derrota só fala se foi por KO (a vida dele zerou); perder por tempo não fala
    return luta.matchWinner !== null && f.hp <= 0 ? (falas.derrota ?? null) : null;
  }
  if (luta.phase === 'ko' && f.hp <= 0) {
    // KO FINAL = o adversário fecha a luta com este round (o `wins` dele só sobe no `endRound`, depois do KO)
    const rival = luta.fighters[f.indice === 0 ? 1 : 0];
    return rival.wins + 1 >= luta.winsNeeded ? (falas.derrota ?? null) : null;
  }
  return null;
}
