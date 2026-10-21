import type { LeituraLuta, LutadorLeitura } from '../core/contratos';
import type { CenaDef } from '../data/tipos';

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
  readonly falas?: Falas;
  /** Aviso "UM DESAFIANTE SE APROXIMA": as duas linhas de baixo do título, no lugar do texto fixo. */
  readonly aviso?: readonly [string, string];
  /** Se há, o lutador, quando é o chefão, faz a entrada dramática (`EntradaDoChefe`) antes da `intro`. */
  readonly entradaDramatica?: CartaoDeEntrada;
};

export const APRESENTACAO: Readonly<Record<string, Apresentacao>> = {
  // A Dança da Águia, que era a cena do chefão, virou só entrada e vitória do BAATAR (decisão do dono, 2026-10-21): sem provocação.
  baatar: {
    entrada: { duracao: 90, poses: ['devekh0', 'devekh1', 'devekh2'] },
    vitoria: { duracao: 60, poses: ['devekh0', 'win'] },
  },
  zenon: {
    // Jogável (derrotado o chefão): as três poses de S10 linha 1, em 90 ticks. Como CHEFE ele já fez a entrada dramática: fica em `entrada2`.
    entrada: { duracao: 90, poses: ['entrada0', 'entrada1', 'entrada2'] },
    // S9 linha 2, células 2 e 3: aplaude devagar, depois fecha os olhos com a mão no ombro do casaco.
    vitoria: { duracao: 80, poses: ['vitoria0', 'vitoria1'] },
    falas: {
      entrada: 'Bem-vindo à minha casa. Todo torneio precisa de um anfitrião... e de um último convidado.',
      fase2: 'Chega de cortesia.',
      vitoria: 'Aplausos para o convidado. A saída é pelos fundos.',
      derrota: 'Então o torneio é seu. Cuide melhor dele do que eu cuidei.',
    },
    aviso: ['O ANFITRIÃO', 'ESTÁ À SUA ESPERA'],
    entradaDramatica: { nome: 'ZENON ARGYROS', titulo: 'O ARCONTE', rodape: 'DONO DO TORNEIO' },
  },
};

/** A pose da cena no tick `t`: `poses[i]` vale de `floor(i·duracao/n)` ao próximo; a última segura até o fim. */
export function poseDaCena(cena: CenaDef, t: number): string {
  const n = cena.poses.length;
  const i = Math.min(n - 1, Math.max(0, Math.floor((t * n) / Math.max(1, cena.duracao))));
  return cena.poses[i] as string;
}

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
 * A fala que vale agora para o chefão `f` (ou null): fase 2 durante a cena, vitória no `matchend` com ele vencedor e derrota no KO dele
 * (`ko` e depois). `t` é o tempo da fase.
 */
export function falaDoChefe(luta: Pick<LeituraLuta, 'phase' | 'matchWinner' | 'winner' | 'fighters'>, f: Pick<LutadorLeitura, 'id' | 'chefe' | 'indice' | 'hp'>): string | null {
  if (!f.chefe) return null;
  const falas = APRESENTACAO[f.id]?.falas;
  if (!falas) return null;
  if (luta.phase === 'cena-chefe') return falas.fase2 ?? null;
  const vencedor = luta.matchWinner ?? luta.winner;
  if (luta.phase === 'matchend' || luta.phase === 'roundend') return vencedor === f.indice ? (falas.vitoria ?? null) : (falas.derrota ?? null);
  if (luta.phase === 'ko' && f.hp <= 0) return falas.derrota ?? null;
  return null;
}
