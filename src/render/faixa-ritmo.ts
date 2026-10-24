import type { Elenco } from '../assets/elenco';
import { ALTURA_DA_TARJA, pintarTarja, type CanvasLike, type Cinematica } from './cinematica';
import { LARGURA } from '../core/constantes';
import type { IndiceLutador, LeituraLuta } from '../core/contratos';
import { identidadeDe, identidadePadrao } from './identidade-especiais';
import { chDaFicha } from './lutador';
import type { Ctx } from './tela';
import { FONTE_DO_ESPECIAL, textoArcade } from './texto';

/*
 * FAIXA DO RITMO (docs/spec-redesenho-jogabilidade.md §3.2, R-2, flag `Regras.ritmo.tarja`): o aviso do especial comum SEM
 * congelar a luta. Ao contrário da `Cinematica` (que faz a cena deixar de chamar `game.update` para mostrar a tarja cheia, 48/20
 * ticks parados), esta faixa é só um elemento de HUD por cima do jogo: `fight.ts` continua chamando `game.update` em TODO tick
 * enquanto ela aparece — por isso não tem veú de tela cheia, destaque do atacante nem pose: o lutador já está visível jogando.
 *
 * Reaproveita a MESMA pintura de fundo da tarja cheia (`pintarTarja`/o cache de `Cinematica.fundoDaTarja`, as mesmas
 * `MAX_TARJAS_NO_CACHE` entradas aquecidas na abertura da luta), só menor (0,55 × `ALTURA_DA_TARJA`) e numa posição FIXA no alto da
 * tela (entre o placar do HUD, que termina por volta de y=86, e a cabeça dos lutadores em pé, que começa por volta de y=200): a
 * geometria exata (não cobrir HUD nem lutador) é medida no navegador (skill `medir-antes-de-afirmar`), não deduzida aqui.
 *
 * Primeira vez de um golpe na luta: 40 ticks (entra 6, fica 28, sai 6). Repetido (2ª vez em diante do MESMO golpe, do MESMO
 * lutador/ficha, nesta luta): 24 ticks (entra 4, fica 16, sai 4) — a marca "já vi isso" do §3.2. Dois especiais quase juntos (os dois
 * lados, ou um combo rápido): o 2º entra na fila e espera o 1º acabar; nunca acumula motor parado, porque nada bloqueia o motor.
 */

export const ALTURA_FAIXA_RITMO = Math.round(ALTURA_DA_TARJA * 0.55); // ~72 px (§3.2)
export const LARGURA_FAIXA_RITMO = 640;
/** Topo fixo da faixa (px lógicos): abaixo do placar do HUD (`hud.ts`, nome/placar terminam perto de y=86). */
export const Y_TOPO_FAIXA_RITMO = 90;
export const DURACAO_FAIXA_1A_VEZ = 40;
export const DURACAO_FAIXA_REPETIDA = 24;
const ENTRA_1A_VEZ = 6;
const SAI_1A_VEZ = 6;
const ENTRA_REPETIDA = 4;
const SAI_REPETIDA = 4;

export interface EventoFaixa {
  readonly lutador: IndiceLutador;
  /** Chave de `ch.moves` do golpe. */
  readonly golpe: string;
  /** Ficha de quem atacou. Ausente = a que `luta.fighters[lutador]` tiver na hora de desenhar. */
  readonly ficha?: string | null;
}

interface Ativa {
  readonly ev: EventoFaixa;
  readonly repetida: boolean;
  readonly duracao: number;
  readonly entra: number;
  readonly sai: number;
  t: number;
}

/** Fila e desenho da faixa SEM CONGELAR de um especial por vez (como `Cinematica`, mas sem pausar a cena). */
export class FaixaRitmo {
  private atual: Ativa | null = null;
  private readonly fila: Ativa[] = [];
  /** Golpes (`lutador.ficha.golpe`) já mostrados nesta luta: a 2ª vez em diante sai a versão de 24 ticks. */
  private readonly vistos = new Set<string>();

  get ativa(): boolean {
    return this.atual !== null;
  }

  /** Estado de leitura (teste e contador de ritmo). */
  get estado(): { readonly lutador: IndiceLutador; readonly golpe: string; readonly t: number; readonly repetida: boolean } | null {
    const a = this.atual;
    return a ? { lutador: a.ev.lutador, golpe: a.ev.golpe, t: a.t, repetida: a.repetida } : null;
  }

  /** Começa (ou enfileira, se já há uma rodando) a faixa de `ev`. Marca o golpe como visto. */
  iniciar(ev: EventoFaixa): void {
    const chave = chaveDoGolpe(ev);
    const repetida = this.vistos.has(chave);
    this.vistos.add(chave);
    const nova: Ativa = {
      ev,
      repetida,
      duracao: repetida ? DURACAO_FAIXA_REPETIDA : DURACAO_FAIXA_1A_VEZ,
      entra: repetida ? ENTRA_REPETIDA : ENTRA_1A_VEZ,
      sai: repetida ? SAI_REPETIDA : SAI_1A_VEZ,
      t: 0,
    };
    if (this.atual) this.fila.push(nova);
    else this.atual = nova;
  }

  /** Um tick da faixa (a luta anda no mesmo tick: quem chama também chama `game.update`). */
  avancar(): void {
    const a = this.atual;
    if (!a) return;
    a.t++;
    if (a.t >= a.duracao) this.atual = this.fila.shift() ?? null;
  }

  /** Zera a fila e o que já foi visto; chamar ao começar e ao acabar a luta (como `Cinematica.zerarLuta`). */
  zerarLuta(): void {
    this.atual = null;
    this.fila.length = 0;
    this.vistos.clear();
  }

  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco, cine: Cinematica): void {
    const a = this.atual;
    if (!a) return;
    const f = luta.fighters[a.ev.lutador];
    const ficha = a.ev.ficha === undefined ? (f.ficha ?? null) : a.ev.ficha;
    const r = elenco[f.id];
    const ch = chDaFicha(r.ch, ficha);
    const feita = identidadeDe(f.id, ficha, a.ev.golpe);
    const nome = (ch.moves as Record<string, { name?: string } | undefined>)[a.ev.golpe]?.name ?? a.ev.golpe;
    const id = feita ?? identidadePadrao(nome, ch.fire);

    const entraK = a.entra > 0 ? Math.min(1, a.t / a.entra) : 1;
    const saiIni = a.duracao - a.sai;
    const saiK = a.t <= saiIni || a.sai <= 0 ? 0 : Math.min(1, (a.t - saiIni) / a.sai);
    const alfa = entraK * (1 - saiK);
    // entra deslizando de cima (como a faixa cheia); sai pelo mesmo lado — nunca os dois ao mesmo tempo (entraK já é 1 quando saiK começa)
    const deslocaY = -Math.max(1 - entraK, saiK) * (ALTURA_FAIXA_RITMO + 16);

    const W = LARGURA_FAIXA_RITMO;
    const H = ALTURA_FAIXA_RITMO;
    const x = (LARGURA - W) / 2;
    const y = Y_TOPO_FAIXA_RITMO + deslocaY;
    const chave = chaveDoGolpe(a.ev);
    const fundo = cine.fundoDaTarja(chave, id);

    ctx.save();
    ctx.globalAlpha = alfa;
    if (fundo) ctx.drawImage(fundo as unknown as CanvasImageSource, 0, 0, fundo.width, fundo.height, x, y, W, H);
    else {
      ctx.save();
      ctx.translate(x, y);
      pintarTarja(ctx, id, W, H);
      ctx.restore();
    }
    const tamanho = tamanhoDoNomeNaFaixa(ctx, nome, W);
    textoArcade(ctx, nome, x + W / 2, y + H / 2, tamanho, id.paleta.nucleo, id.paleta.sombra, 'center', 1, 1, FONTE_DO_ESPECIAL(tamanho));
    ctx.restore();
  }
}

const chaveDoGolpe = (ev: EventoFaixa): string => `${ev.lutador}.${ev.ficha ?? 'base'}.${ev.golpe}`;

/** Nome em até 30 px; encolhe se não couber nos 70% centrais da faixa (a mesma ideia de `Cinematica`, escala menor). */
function tamanhoDoNomeNaFaixa(ctx: Ctx, nome: string, larguraDaFaixa: number): number {
  ctx.save();
  ctx.font = FONTE_DO_ESPECIAL(30);
  const w = ctx.measureText(nome).width;
  ctx.restore();
  const livre = larguraDaFaixa * 0.7;
  return w > livre ? Math.max(16, Math.floor((30 * livre) / w)) : 30;
}

export type { CanvasLike };
