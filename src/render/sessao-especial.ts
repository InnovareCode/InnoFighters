import type { Elenco } from '../assets/elenco';
import { ALTURA, LARGURA, SH } from '../core/constantes';
import type { EventoLuta, IndiceLutador, LeituraLuta } from '../core/contratos';
import { criarRng, type Rng } from '../core/rng';
import { aplicarCamera } from './camera';
import { desenharAssinatura, mistura, VIDA_ASSINATURA } from './estilos-especiais';
import { identidadeDe, identidadePadrao, type Identidade } from './identidade-especiais';
import { chDaFicha } from './lutador';
import { VEU_DA_SESSAO } from './cinematica';
import type { Ctx } from './tela';
import { textoArcade } from './texto';

/*
 * Sessão do especial (spec B10/B11): do `special` (ou do SUCESSO da PARADE/GARKUWA) até o golpe acabar e não haver projétil dele no ar, em até
 * 120 ticks. Enquanto dura: vinheta de 20% e brilho do atacante. Cada acerto de especial (`hit`/`throw` com `especial: true`) do dono mostra o
 * número de dano grande, a assinatura do estilo e o contador "N HITS"; ao fechar com N >= 1 aparece "TOTAL". Rival que DEFENDEU (block,
 * quebra-guarda, parry): nenhum número, nenhum contador (só o "eco" discreto do estilo). `armor`: número cinza menor que NÃO conta.
 */

export const LIMITE_DA_SESSAO = 120;
export const TICKS_DO_TOTAL = 40;
/** O contador "N HITS" some depois deste tanto de ticks sem acerto novo. */
export const TICKS_DO_CONTADOR = 70;
const CINZA = '#9aa0b4';

interface Numero {
  x: number;
  y: number;
  dano: number;
  cinza: boolean;
  idade: number;
}
interface Marca {
  x: number;
  y: number;
  idade: number;
  eco: boolean;
  dir: 1 | -1;
}
interface Sessao {
  readonly dono: IndiceLutador;
  readonly golpe: string;
  readonly continua: string | null;
  readonly ficha: string | null;
  readonly sem: number;
  idade: number;
  hits: number;
  total: number;
  nivel: number;
  ultimoAcerto: number;
  defensor: IndiceLutador;
  numeros: Numero[];
  marcas: Marca[];
  /** > 0: fechada, mostrando o TOTAL por tantos ticks. */
  fechando: number;
  /** Pop do contador (1,4 -> 1) ao subir. */
  pop: number;
}

export interface LeituraDaSessao {
  readonly golpe: string;
  readonly aberta: boolean;
  readonly hits: number;
  readonly total: number;
  readonly nivel: number;
  /** Números de dano ainda na tela (os cinza são `armor`). */
  readonly numeros: ReadonlyArray<{ readonly dano: number; readonly cinza: boolean }>;
  /** O contador "N HITS" está visível? */
  readonly contadorVisivel: boolean;
  readonly totalVisivel: boolean;
  /** Marcas de impacto na tela: `acerto` (assinatura do estilo + anel) e `eco` (defesa: o eco discreto). */
  readonly marcas: { readonly acerto: number; readonly eco: number };
}

export interface OpcoesSessao {
  readonly rng?: Rng;
  /** Som por momento: 'acerto' (hit/throw especial), 'defesa' (block/parry/quebra-guarda de especial). */
  readonly aoSom?: (momento: 'acerto' | 'defesa', id: Identidade, dono: IndiceLutador, nivel: number) => void;
}

export class SessaoEspecial {
  private readonly sessoes: [Sessao | null, Sessao | null] = [null, null];
  private readonly rng: Rng;
  private readonly aoSom: OpcoesSessao['aoSom'];

  constructor(op: OpcoesSessao = {}) {
    this.rng = op.rng ?? criarRng(1);
    this.aoSom = op.aoSom;
  }

  /** Alguma sessão rodando (aberta, não só mostrando o TOTAL)? */
  get aberta(): boolean {
    return this.sessoes.some((s) => s !== null && s.fechando === 0);
  }

  /** O que a sessão do `dono` mostra agora (null = nenhuma). */
  leitura(dono: IndiceLutador): LeituraDaSessao | null {
    const s = this.sessoes[dono];
    if (!s) return null;
    return {
      golpe: s.golpe,
      aberta: s.fechando === 0,
      hits: s.hits,
      total: s.total,
      nivel: s.nivel,
      numeros: s.numeros.map((n) => ({ dano: n.dano, cinza: n.cinza })),
      contadorVisivel: s.hits > 0 && s.fechando === 0 && s.idade - s.ultimoAcerto < TICKS_DO_CONTADOR,
      totalVisivel: s.fechando > 0,
      marcas: { acerto: s.marcas.filter((m) => !m.eco).length, eco: s.marcas.filter((m) => m.eco).length },
    };
  }

  private abrir(dono: IndiceLutador, golpe: string, continua: string | null, ficha: string | null): void {
    this.sessoes[dono] = { dono, golpe, continua, ficha, sem: Math.floor(this.rng.proximo() * 4294967296), idade: 0, hits: 0, total: 0, nivel: 0, ultimoAcerto: -999, defensor: dono === 0 ? 1 : 0, numeros: [], marcas: [], fechando: 0, pop: 0 };
  }

  private identidade(s: Sessao, luta: LeituraLuta, elenco: Elenco): Identidade {
    const f = luta.fighters[s.dono];
    const feita = identidadeDe(f.id, s.ficha, s.golpe);
    if (feita) return feita;
    const ch = chDaFicha(elenco[f.id].ch, s.ficha);
    const mv = (ch.moves as Record<string, { name?: string } | undefined>)[s.golpe];
    return identidadePadrao(mv?.name ?? s.golpe, ch.fire);
  }

  /** Um evento da luta. A cena só chama quando a cinemática está ligada (regras + preferência). */
  reagir(ev: EventoLuta, luta: LeituraLuta, elenco: Elenco): void {
    switch (ev.tipo) {
      case 'special':
        // PARADE e GARKUWA só abrem no SUCESSO (parry / clash): o `special` delas só toca o som e gasta energia
        if (ev.momento !== 'sucesso') this.abrir(ev.lutador, ev.golpe ?? 'sFire', null, ev.ficha ?? luta.fighters[ev.lutador].ficha ?? null);
        break;
      case 'parry': {
        // o defensor que aparou é o dono da sessão dele; o FOUETTÉ (`continua`) segue a mesma sessão
        const dono = ev.defensor;
        this.abrir(dono, ev.golpe ?? 'sFire', ev.continua ?? null, luta.fighters[dono].ficha ?? null);
        // e o especial de quem foi aparado, se havia, ganha o eco de defesa
        this.defendido(ev.atacante, ev.x, ev.y, luta, elenco, ev.defensor);
        break;
      }
      case 'clash':
        if (ev.lutador !== undefined) this.abrir(ev.lutador, ev.golpe ?? 'sDown', null, luta.fighters[ev.lutador].ficha ?? null);
        break;
      case 'hit':
      case 'throw': {
        if (ev.especial !== true) break;
        const s = this.sessoes[ev.atacante];
        if (!s || s.fechando > 0) break;
        const def = luta.fighters[ev.defensor];
        const x = ev.tipo === 'hit' ? ev.x : def.x;
        const y = ev.tipo === 'hit' ? ev.y : def.y - SH * 0.6;
        const dano = Math.max(0, Math.round(ev.dano ?? 0));
        s.hits++;
        s.total += dano;
        s.defensor = ev.defensor;
        s.ultimoAcerto = s.idade;
        s.pop = 1;
        if (ev.tipo === 'hit' && ev.nivelCarga !== undefined) s.nivel = Math.max(s.nivel, ev.nivelCarga);
        s.numeros.push({ x, y: y - 30, dano, cinza: false, idade: 0 });
        s.marcas.push({ x, y, idade: 0, eco: false, dir: luta.fighters[ev.atacante].facing });
        this.aoSom?.('acerto', this.identidade(s, luta, elenco), s.dono, s.nivel);
        break;
      }
      case 'armor': {
        if (ev.especial !== true) break;
        const s = this.sessoes[ev.atacante];
        if (!s || s.fechando > 0) break;
        // o chefe/WEI LONG absorveu: o número aparece em cinza e NÃO conta como acerto
        s.numeros.push({ x: ev.x, y: ev.y - 30, dano: Math.max(0, Math.round(ev.dano ?? 0)), cinza: true, idade: 0 });
        break;
      }
      case 'block':
      case 'quebra-guarda':
        if (ev.especial === true) this.defendido(ev.atacante, ev.x, ev.y, luta, elenco, ev.defensor);
        break;
      default:
        break;
    }
  }

  /** O rival defendeu um especial de `atacante`: só o eco do estilo (nenhum número, nenhum contador). */
  private defendido(atacante: IndiceLutador, x: number, y: number, luta: LeituraLuta, elenco: Elenco, defensor: IndiceLutador): void {
    const s = this.sessoes[atacante];
    if (!s || s.fechando > 0) return;
    s.marcas.push({ x, y, idade: 0, eco: true, dir: luta.fighters[atacante].facing });
    s.defensor = defensor;
    this.aoSom?.('defesa', this.identidade(s, luta, elenco), s.dono, s.nivel);
  }

  /** Um tick da luta que andou (a luta congelada pela cinemática ou pela pausa NÃO chama). */
  avancar(luta: LeituraLuta): void {
    for (const dono of [0, 1] as const) {
      const s = this.sessoes[dono];
      if (!s) continue;
      for (const n of s.numeros) n.idade++;
      for (const m of s.marcas) m.idade++;
      s.numeros = s.numeros.filter((n) => n.idade < 46);
      s.marcas = s.marcas.filter((m) => m.idade < VIDA_ASSINATURA);
      s.pop = Math.max(0, s.pop - 1 / 8);
      if (s.fechando > 0) {
        if (--s.fechando === 0) this.sessoes[dono] = null;
        continue;
      }
      s.idade++;
      const f = luta.fighters[dono];
      const vivo = f.move === s.golpe || (s.continua !== null && f.move === s.continua) || luta.projectiles.some((p) => p.dono === dono && p.especial === true);
      if ((!vivo && s.idade > 2) || s.idade > LIMITE_DA_SESSAO || luta.phase !== 'fight') {
        if (s.hits >= 1 && luta.phase === 'fight') s.fechando = TICKS_DO_TOTAL;
        else this.sessoes[dono] = null;
      }
    }
  }

  zerarLuta(): void {
    this.sessoes[0] = null;
    this.sessoes[1] = null;
  }

  desenhar(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
    const ativas = this.sessoes.filter((s): s is Sessao => s !== null);
    if (ativas.length === 0) return;
    if (ativas.some((s) => s.fechando === 0)) {
      // a vinheta da sessão (20%) que sucede o escurecimento da cinemática
      ctx.fillStyle = `rgba(6,3,16,${VEU_DA_SESSAO})`;
      ctx.fillRect(0, 0, LARGURA, ALTURA);
    }
    ctx.save();
    aplicarCamera(ctx, luta.cam, 0, this.rng);
    for (const s of ativas) {
      const id = this.identidade(s, luta, elenco);
      const f = luta.fighters[s.dono];
      const def = luta.fighters[s.defensor];
      if (s.fechando === 0) {
        // brilho do atacante durante a sessão
        const cx = f.x;
        const cy = f.y - SH * 0.5;
        const g = ctx.createRadialGradient(cx, cy, 20, cx, cy, 170);
        g.addColorStop(0, id.paleta.brilho);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(cx, cy, 170, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
      for (const m of s.marcas) {
        desenharAssinatura({ ctx, idade: m.idade, estilo: id.estilo, variante: id.variante, p: id.paleta, x: m.x, y: m.y, sem: s.sem, dir: m.dir, eco: m.eco, pesado: id.ritmo === 'PESADO' });
      }
      const contorno = mistura(id.paleta.sombra, '#000000', 0.45);
      for (const n of s.numeros) {
        const k = n.idade / 46;
        const pop = n.idade < 6 ? 1.4 - (n.idade / 6) * 0.4 : 1;
        const alfa = Math.min(1, (46 - n.idade) / 14);
        if (n.cinza) textoArcade(ctx, `${n.dano}`, n.x, n.y - n.idade * 0.7, 22, CINZA, '#1a1c24', 'center', pop, alfa);
        else textoArcade(ctx, `-${n.dano}`, n.x, n.y - 10 - k * 40, 34, id.paleta.brilho, contorno, 'center', pop, alfa);
      }
      if (s.fechando === 0 && s.hits > 0 && s.idade - s.ultimoAcerto < TICKS_DO_CONTADOR) {
        const alfa = Math.min(1, (TICKS_DO_CONTADOR - (s.idade - s.ultimoAcerto)) / 14);
        textoArcade(ctx, `${s.hits} ${s.hits === 1 ? 'HIT' : 'HITS'}`, def.x, def.y - SH - 26, 40, [id.paleta.nucleo, id.paleta.brilho], contorno, 'center', 1 + s.pop * 0.4, alfa);
        if (s.nivel > 0) textoArcade(ctx, `NÍVEL ${s.nivel}`, def.x, def.y - SH + 2, 18, id.paleta.nucleo, contorno, 'center', 1, alfa);
      }
      if (s.fechando > 0) {
        textoArcade(ctx, `TOTAL ${s.total}`, def.x, def.y - SH - 26, 34, [id.paleta.nucleo, id.paleta.brilho], contorno, 'center', 1, Math.min(1, s.fechando / 10));
      }
    }
    ctx.restore();
  }
}
