import { LARGURA } from '../core/constantes';
import type { LeituraLuta } from '../core/contratos';
import { clamp } from '../core/math';
import { FH, textoArcade, type Alinhamento, type Preenchimento } from './texto';
import { larguraDoTexto } from './medida';
import type { Ctx } from './tela';

/*
 * HUD DO RITMO (pedido do dono, 24/10/2026, referência X-Men vs Street Fighter): aviso DANGER com a vida baixa, nota do combo no fim da cadeia
 * (BOM / ÓTIMO / INCRÍVEL) e o contador de acertos que cresce a cada golpe e muda de cor por patamar. Fica atrás de `Regras.ritmo.tarja`
 * (rollback `?ritmo=0`).
 *
 * Arquitetura: o ESTADO (o "pop" de cada acerto, o fim do combo, o fôlego do DANGER) anda no TICK do motor (`avancar`, chamado pela cena), não
 * no quadro: com a fluidez o desenho roda a mais de 60 Hz e a animação não pode acelerar. O DESENHO só lê esse estado, não aloca nada por
 * quadro (paletas e textos são constantes; degradês e larguras vêm dos caches de `gradientes.ts`/`medida.ts`) e não pinta NADA quando não há
 * combo, nota nem perigo — o HUD de sempre sai pixel a pixel igual.
 */

/** Vida (da barra atual) a partir da qual o DANGER aparece: <= 25%. */
export const LIMIAR_PERIGO = 0.25;
/** Período do pulso do DANGER, em ticks (lento: 0,8 s). */
export const PERIODO_PERIGO = 48;
/** Quanto dura a nota do combo na tela, em ticks (~1 s). */
export const DURACAO_NOTA = 60;
/** Ticks do "tranco" de cada acerto novo no contador. */
export const TICKS_DO_TRANCO = 8;

/** Fração do dano total (vida máxima do rival) que promove a nota um degrau: um combo curto mas pesado também merece. */
export const DANO_QUE_PROMOVE = 0.3;

/** Patamares do combo, por número de acertos. Índice = patamar (0 = BOM). 2 acertos não tem nota nem patamar (patamar -1: o contador de sempre). */
export const NOTAS: readonly { readonly minimo: number; readonly palavra: string }[] = [
  { minimo: 3, palavra: 'BOM!' },
  { minimo: 5, palavra: 'ÓTIMO!' },
  { minimo: 7, palavra: 'INCRÍVEL!' },
];

/** Patamar do combo (-1 = sem nota): pelos acertos, e sobe um degrau se o dano passou de `DANO_QUE_PROMOVE` da vida máxima do rival. */
export function patamarDoCombo(hits: number, dmg: number, vidaMaximaDoRival: number): number {
  let p = -1;
  for (let i = 0; i < NOTAS.length; i++) if (hits >= NOTAS[i]!.minimo) p = i;
  if (p >= 0 && vidaMaximaDoRival > 0 && dmg / vidaMaximaDoRival >= DANO_QUE_PROMOVE) p = Math.min(NOTAS.length - 1, p + 1);
  return p;
}

/** Cor do contador e da nota por patamar (índice 0 = sem nota = o dourado de sempre; depois BOM, ÓTIMO, INCRÍVEL) e o contorno de cada um. */
const COR_PATAMAR: readonly (readonly [string, string])[] = [
  ['#fff6b0', '#ff7a1a'],
  ['#ffffff', '#ffd21a'],
  ['#ffe27a', '#ff5a1a'],
  ['#ffffff', '#ff2a4a'],
];
const CONTORNO_PATAMAR: readonly string[] = ['#2a0d00', '#3a2200', '#3a0d00', '#3a0010'];
const COR_PERIGO: Preenchimento = ['#fff27a', '#ff8a00'];
const CONTORNO_PERIGO = '#4a0d00';

/** Margem do HUD dos dois lados e altura do contador (as de sempre). */
const MARGEM = 24;
const Y_CONTADOR = 150;
/** Altura do DANGER: 4 px acima do contador (150) de propósito. No celular de 844x390 o botão SUPER do toque começa colado no canto direito do HUD; a 150 o texto o tocava (medido em px CSS, tests/e2e/hud-ritmo.spec.ts). */
const Y_PERIGO = 146;
/** Quanto o DANGER desce quando o contador/nota do MESMO lado está na tela (o contador ocupa y 127-200). */
const DESCIDA_DO_PERIGO = 72;
const FONTE_CONTADOR = 46;
const FONTE_NOTA = 40;
const FONTE_PERIGO = 34;
const FOLGA_NOTA = 20;

interface Lado {
  /** O combo está rolando (t == 60: o motor renova a cada tick em que o rival ainda está preso)? */
  viva: boolean;
  /** Já avaliado (fim do round no meio do combo): não avalia de novo enquanto o motor mantiver t == 60. */
  avaliado: boolean;
  hits: number;
  dmg: number;
  /** Ticks que faltam do tranco do último acerto (TICKS_DO_TRANCO -> 0). */
  tranco: number;
  /** Nota no ar: patamar (índice de NOTAS), acertos finais, ticks que faltam e a largura (px lógicos) do contador onde ela ancora (-1 = medir no desenho). */
  nota: number;
  notaHits: number;
  notaTicks: number;
  notaX: number;
  /** DANGER: presença 0..1, relógio do pulso e quanto desceu (0..1) por haver contador ao lado. */
  perigo: number;
  relogio: number;
  desceu: number;
}

const novoLado = (): Lado => ({ viva: false, avaliado: false, hits: 0, dmg: 0, tranco: 0, nota: -1, notaHits: 0, notaTicks: 0, notaX: -1, perigo: 0, relogio: 0, desceu: 0 });

export class HudRitmo {
  private readonly lados: [Lado, Lado] = [novoLado(), novoLado()];

  /** Zera tudo (nova luta). */
  zerar(): void {
    this.lados[0] = novoLado();
    this.lados[1] = novoLado();
  }

  /** Há alguma coisa para pintar? (para os testes e para a cena saber que o HUD está mudo) */
  get algoVisivel(): boolean {
    for (const s of this.lados) if (s.notaTicks > 0 || s.perigo > 0) return true;
    return false;
  }

  /** A nota do lado `i` (0 = P1): patamar e ticks restantes. `patamar` -1 = nenhuma. Só leitura (testes). */
  nota(i: 0 | 1): { patamar: number; hits: number; ticks: number } {
    const s = this.lados[i];
    return { patamar: s.notaTicks > 0 ? s.nota : -1, hits: s.notaHits, ticks: s.notaTicks };
  }

  /** Presença 0..1 do DANGER do lutador `i`. Só leitura (testes). */
  perigo(i: 0 | 1): number {
    return this.lados[i].perigo;
  }

  /** Um tick do motor (depois de `game.update`). `luta` é a leitura do motor, não a interpolada. */
  avancar(luta: LeituraLuta): void {
    const lutando = luta.phase === 'fight';
    for (let i = 0; i < 2; i++) {
      const f = luta.fighters[i as 0 | 1];
      const rival = luta.fighters[(1 - i) as 0 | 1];
      const s = this.lados[i as 0 | 1];
      const c = f.combo;

      // --- combo: tranco a cada acerto novo e nota quando a cadeia acaba ---
      const rolando = c.t === 60 && c.hits >= 2 && !s.avaliado;
      if (c.t !== 60) s.avaliado = false;
      if (rolando) {
        if (c.hits > s.hits || !s.viva) s.tranco = TICKS_DO_TRANCO;
        s.hits = c.hits;
        s.dmg = c.dmg;
        s.viva = true;
        // o round acabou no meio do combo (KO, tempo): a nota vem já, não quando o motor zerar o contador no round seguinte
        if (!lutando) this.avaliar(s, rival.maxHp);
      } else if (s.viva) {
        // o contador começou a cair (ou foi zerado): a cadeia acabou. No `intro` é o zero do round novo, não um fim de combo.
        if (lutando) this.avaliar(s, rival.maxHp);
        else s.viva = false;
      }
      if (s.tranco > 0) s.tranco--;
      if (s.notaTicks > 0 && --s.notaTicks === 0) s.notaX = -1;

      // --- DANGER: vida da barra atual <= 25%, só lutando (some ao curar e no fim do round) ---
      const perigoso = lutando && !luta.training && f.hp > 0 && f.hp / f.maxHp <= LIMIAR_PERIGO;
      if (perigoso) s.perigo = Math.min(1, s.perigo + 1 / 6);
      else s.perigo = Math.max(0, s.perigo - 1 / 8);
      if (s.perigo > 0) s.relogio = (s.relogio + 1) % PERIODO_PERIGO;
      else s.relogio = 0;
      // sobe/desce da altura do contador quando há contador ou nota ao lado (o DANGER não pode cobrir os dois)
      const ocupado = c.t > 0 || s.notaTicks > 0;
      s.desceu = ocupado ? Math.min(1, s.desceu + 1 / 6) : Math.max(0, s.desceu - 1 / 6);
    }
  }

  private avaliar(s: Lado, vidaDoRival: number): void {
    s.viva = false;
    s.avaliado = true;
    const p = patamarDoCombo(s.hits, s.dmg, vidaDoRival);
    if (p < 0) return;
    s.nota = p;
    s.notaHits = s.hits;
    s.notaTicks = DURACAO_NOTA;
    s.notaX = -1;
  }

  /** Contador de acertos (o combo que cada lutador aplicou no rival) + nota. Substitui o laço do contador de `desenharHUD`. */
  desenharCombos(ctx: Ctx, luta: LeituraLuta, comNota = true): void {
    for (let i = 0; i < 2; i++) {
      const s = this.lados[i as 0 | 1];
      const c = luta.fighters[i as 0 | 1].combo;
      const lado = i === 0 ? 1 : 2;
      const x = lado === 1 ? MARGEM : LARGURA - MARGEM;
      const alinha: Alinhamento = lado === 1 ? 'left' : 'right';
      if (c.t > 0) {
        const alfa = Math.min(1, c.t / 20);
        const cor = corDoPatamar(patamarDoCombo(c.hits, c.dmg, luta.fighters[(1 - i) as 0 | 1].maxHp) + 1);
        const tranco = s.tranco / TICKS_DO_TRANCO;
        // cresce com a cadeia (e encolhe de volta quando ela acaba, nos 8 ticks depois do último acerto, como o contador de sempre) + tranco a cada acerto
        const escala = 1 + clamp((c.t - 52) / 8, 0, 1) * crescimentoDaCadeia(c.hits) + 0.3 * tranco * tranco;
        textoArcade(ctx, `${c.hits} HITS`, x, Y_CONTADOR, FONTE_CONTADOR, COR_PATAMAR[cor]!, CONTORNO_PATAMAR[cor]!, alinha, escala, alfa);
        textoArcade(ctx, `DANO ${Math.round(c.dmg)}`, x, 188, 20, '#fff', '#000', alinha, 1, alfa);
      }
      if (comNota && s.notaTicks > 0) this.desenharNota(ctx, s, lado, x, alinha);
    }
  }

  private desenharNota(ctx: Ctx, s: Lado, lado: 1 | 2, xBorda: number, alinha: Alinhamento): void {
    if (s.notaX < 0) {
      // ao lado do contador: mede "N HITS" uma vez (medida em cache) e ancora a nota depois dele
      ctx.save();
      ctx.font = FH(FONTE_CONTADOR);
      s.notaX = larguraDoTexto(ctx, `${s.notaHits} HITS`) * (1 + crescimentoDaCadeia(s.notaHits)) + FOLGA_NOTA;
      ctx.restore();
    }
    const idade = DURACAO_NOTA - s.notaTicks;
    const entrada = clamp(idade / 8, 0, 1); // 0..1 nos 8 primeiros ticks: a nota "cai" de grande para o tamanho final
    const escala = 1 + 0.9 * (1 - entrada) * (1 - entrada);
    const alfa = Math.min(1, s.notaTicks / 15, (idade + 1) / 3);
    const x = lado === 1 ? xBorda + s.notaX : xBorda - s.notaX;
    const cor = corDoPatamar(s.nota + 1);
    textoArcade(ctx, NOTAS[s.nota]!.palavra, x, Y_CONTADOR, FONTE_NOTA, COR_PATAMAR[cor]!, CONTORNO_PATAMAR[cor]!, alinha, escala, alfa);
  }

  /** DANGER dos dois lados (do lutador com a vida baixa), na altura do contador. Pulso lento em alfa e escala. */
  desenharPerigo(ctx: Ctx): void {
    for (let i = 0; i < 2; i++) {
      const s = this.lados[i as 0 | 1];
      if (s.perigo <= 0) continue;
      const lado = i === 0 ? 1 : 2;
      const pulso = 0.5 - 0.5 * Math.cos((s.relogio / PERIODO_PERIGO) * Math.PI * 2);
      const y = Y_PERIGO + DESCIDA_DO_PERIGO * s.desceu;
      textoArcade(
        ctx,
        'DANGER',
        lado === 1 ? MARGEM : LARGURA - MARGEM,
        y,
        FONTE_PERIGO,
        COR_PERIGO,
        CONTORNO_PERIGO,
        lado === 1 ? 'left' : 'right',
        (0.9 + 0.1 * s.perigo) * (1 + 0.06 * pulso),
        s.perigo * (0.68 + 0.32 * pulso),
      );
    }
  }
}

/** Quanto o contador fica maior enquanto a cadeia rola: 12% com 2 acertos, +3,5% por acerto até 10 (o de sempre ficava parado em 40%). */
function crescimentoDaCadeia(hits: number): number {
  return 0.12 + 0.035 * clamp(hits - 2, 0, 8);
}

/** Índice (0 = dourado de sempre) para a paleta, a partir do patamar + 1. */
function corDoPatamar(i: number): number {
  return clamp(i, 0, COR_PATAMAR.length - 1);
}
