import type { Elenco } from '../assets/elenco';
import type { IdLutador } from '../core/contratos';
import type { LutadorMontado } from '../data/montar';
import { getPD } from '../data/poses';
import { roteiroDoFilme } from '../data/roteiros-filme';
import { resolverPoseDoFilme } from './filme';
import { larguraDoTexto } from './medida';
import type { PaletaFaixa } from './paleta-lutador';
import type { Ctx } from './tela';
import { FONTE_DO_ESPECIAL, textoArcade } from './texto';

/** Branco com contorno quase preto: contraste alto contra QUALQUER paleta de lutador (medido em paleta-lutador.test.ts). */
export const NUCLEO_DO_NOME = '#ffffff';
export const SOMBRA_DO_NOME = '#0a0604';

/*
 * FAIXA COM ROSTO (estilo X-Men vs Street Fighter, decisão do dono 24/10/2026, docs/spec-redesenho-jogabilidade.md §3.2/§3.4):
 * banda horizontal larga, laranja/amarela com listras, atravessando o terço de cima da tela; o rosto do lutador em close (de
 * perfil, gritando) entra pela esquerda com um brilho de impacto perto da boca; o cenário e os lutadores continuam visíveis
 * embaixo. Usada em DOIS lugares com a MESMA pintura: `FaixaRitmo` (especial comum, não congela) e `TarjaDoSuper` (super,
 * congela 30 ticks + linhas de velocidade). Este módulo é só a pintura PURA e a busca do rosto; nenhum dos dois estados mora aqui.
 *
 * TODO lutador precisa aparecer na faixa (pedido do dono, 24/10/2026 — "nunca vazio" não bastava): 3 níveis de busca, nessa ordem.
 * 1) A célula de "close"/grito que o filme do especial já usa (`roteiroDoFilme(...).batidas[0]`, a 1ª batida, sempre o grito,
 *    t0-t12): se essa pose for uma célula da página FILME (`f0..f5`, `resolverPoseDoFilme(...).painel`), recorta dela.
 * 2) NILA e ZENON têm o grito apontando para uma pose do MUNDO (`sa0`/`cena1`, não painel) — mas a página FILME deles TEM
 *    células de busto gritando/esforço em outro slot (`POSE_DE_ROSTO_ALTERNATIVA`, escolhida olhando `filme.webp` dos dois:
 *    NILA `f4` — busto, olhos fechados, boca aberta; ZENON `f4` — busto, careta de esforço). Mesmo enquadramento dos outros.
 * 3) Sem página FILME pronta (ainda carregando) ou sem nenhuma das duas acima: cai no `retrato.webp` do lutador (o mesmo
 *    enquadramento do HUD/seleção, `r.arte.retrato(ch.head)`) — todo lutador tem retrato, então este nível NUNCA falha.
 * `pd.rosto` (quando o manifesto traz, "centro do retrato") afina o recorte de uma célula de painel para a cabeça; sem ele,
 * usa o quadro inteiro. A página FILME só existe depois que a luta carrega (`CenaFight.carregarFolhasDoFilme`, já chamado no
 * início) — antes disso (ou se a rede falhar), os níveis 1/2 caem no retrato também.
 */

export interface RostoDaFaixa {
  readonly img: CanvasImageSource;
  readonly sx: number;
  readonly sy: number;
  readonly sw: number;
  readonly sh: number;
}

/** Nível 2: lutadores cujo grito do roteiro não é célula de painel, com a célula f0..f5 escolhida na curadoria (ver comentário acima). */
const POSE_DE_ROSTO_ALTERNATIVA: Readonly<Partial<Record<IdLutador, string>>> = Object.freeze({
  nila: 'f4',
  zenon: 'f4',
});

/** O recorte de uma célula `nome` (`f0..f5`) da página FILME, já cortado para a cabeça via `pd.rosto` quando o manifesto traz. Null se a célula não existe/não é painel/a imagem ainda não carregou. */
function celulaDoPainel(ch: LutadorMontado, arte: Elenco[IdLutador]['arte'], nome: string): RostoDaFaixa | null {
  const pd = (ch.pd as Record<string, { painel?: boolean } | undefined>)[nome];
  if (!pd?.painel) return null;
  const cheia = getPD(ch, nome);
  const img = arte.imagemDe(cheia);
  if (!img) return null;
  if (!cheia.rosto) return { img, sx: cheia.x, sy: cheia.y, sw: cheia.w, sh: cheia.h };
  // recorte mais justo (cabeça), centrado em `pd.rosto`, dentro dos limites do quadro inteiro
  const lado = Math.min(cheia.w, cheia.h) * 0.62;
  const cx = cheia.x + cheia.rosto[0];
  const cy = cheia.y + cheia.rosto[1];
  const sx = Math.max(cheia.x, Math.min(cheia.x + cheia.w - lado, cx - lado / 2));
  const sy = Math.max(cheia.y, Math.min(cheia.y + cheia.h - lado, cy - lado / 2));
  return { img, sx, sy, sw: lado, sh: lado };
}

/**
 * D3: qual célula f0..f5 (nível 1 ou 2) serve de rosto para `lutador/ficha/golpe`, ou null (cai no retrato). É dado ESTÁTICO (roteiro + manifesto) e
 * `roteiroDoFilme` monta arrays a cada chamada: resolvido UMA vez por (lutador, ficha, golpe) e guardado, em vez de a cada quadro da faixa/tarja.
 */
const CELULA_DO_ROSTO = new Map<string, string | null>();

function celulaDoRosto(ch: LutadorMontado, lutador: IdLutador, ficha: string | null, golpe: string): string | null {
  const chave = `${lutador}|${ficha ?? ''}|${golpe}`;
  const guardada = CELULA_DO_ROSTO.get(chave);
  if (guardada !== undefined) return guardada;
  let achada: string | null = null;
  const b0 = roteiroDoFilme(lutador, ficha, golpe, false).batidas[0];
  if (b0) {
    const resolvido = resolverPoseDoFilme(ch, b0.atacante, b0.atacanteAlt, 'idle0');
    if (resolvido.painel) achada = resolvido.painel;
  }
  if (!achada) {
    const alternativa = POSE_DE_ROSTO_ALTERNATIVA[lutador];
    if (alternativa && (ch.pd as Record<string, { painel?: boolean } | undefined>)[alternativa]?.painel) achada = alternativa;
  }
  CELULA_DO_ROSTO.set(chave, achada);
  return achada;
}

/**
 * O recorte do rosto (gritando) de `lutador/ficha/golpe` — NUNCA null com a arte pronta (nível 3, retrato, sempre existe). Só é null sem a arte
 * (`elenco[lutador]` ausente, dublê de teste). Nível 1/2 só valem com a imagem da folha FILME na memória; sem ela cai no retrato (e volta à célula
 * assim que a página chega: a escolha da célula é estática, só a imagem varia).
 */
export function rostoDoGolpe(elenco: Elenco, lutador: IdLutador, ficha: string | null, golpe: string): RostoDaFaixa | null {
  const r = elenco[lutador];
  if (!r) return null;
  const ch = r.ch as unknown as LutadorMontado;
  const celula = celulaDoRosto(ch, lutador, ficha, golpe);
  if (celula) {
    const dela = celulaDoPainel(ch, r.arte, celula);
    if (dela) return dela;
  }
  const retrato = r.arte.retrato(ch.head);
  if (!retrato) return null;
  const [sx, sy, sw, sh] = retrato.recorte;
  return { img: retrato.imagem, sx, sy, sw, sh };
}

export interface OpcoesFaixaRosto {
  readonly ctx: Ctx;
  readonly x: number;
  readonly y: number;
  readonly w: number;
  readonly h: number;
  /** 0..1: opacidade da faixa inteira (entra/sai). */
  readonly alfa: number;
  /** -w..0: desloca a faixa para a esquerda (entra/sai pelo lado esquerdo); 0 = no lugar. */
  readonly deslocaX: number;
  /** A paleta (3 tons) do LUTADOR que ataca — não do golpe (`paleta-lutador.ts`, pedido do dono: autêntica de cada um). */
  readonly paleta: PaletaFaixa;
  readonly nome: string;
  readonly rosto: RostoDaFaixa | null;
}

/** A pintura da faixa (fundo listrado na paleta do LUTADOR, o rosto à esquerda com o brilho de impacto, o nome). Pura: não muda estado. */
export function desenharFaixaComRosto(o: OpcoesFaixaRosto): void {
  const { ctx, paleta: p } = o;
  const x = o.x + o.deslocaX;
  ctx.save();
  ctx.globalAlpha = o.alfa;
  ctx.beginPath();
  ctx.rect(o.x, o.y, o.w, o.h); // o clip fica na posição FIXA (a faixa desliza por dentro dele, sem vazar)
  ctx.clip();
  // fundo: gradiente vertical escuro -> médio -> claro (o "miolo" vivo) -> médio -> escuro, nos 3 tons do LUTADOR
  const g = ctx.createLinearGradient(0, o.y, 0, o.y + o.h);
  g.addColorStop(0, p.escuro);
  g.addColorStop(0.16, p.medio);
  g.addColorStop(0.5, p.claro);
  g.addColorStop(0.84, p.medio);
  g.addColorStop(1, p.escuro);
  ctx.fillStyle = g;
  ctx.fillRect(x, o.y, o.w, o.h);
  // listras horizontais escuras, finas (a textura "arranhada" da referência)
  ctx.fillStyle = 'rgba(0,0,0,.16)';
  const faixas = 7;
  for (let i = 1; i < faixas; i++) {
    const ly = o.y + (o.h * i) / faixas;
    ctx.fillRect(x, ly - 1, o.w, 2);
  }
  // o rosto, encostado na borda de baixo, à esquerda
  let xRosto = x + o.w * 0.12;
  if (o.rosto) {
    const escala = (o.h * 0.98) / o.rosto.sh;
    const dw = o.rosto.sw * escala;
    const dh = o.rosto.sh * escala;
    const dx = x + 6;
    const dy = o.y + o.h - dh;
    ctx.drawImage(o.rosto.img, o.rosto.sx, o.rosto.sy, o.rosto.sw, o.rosto.sh, dx, dy, dw, dh);
    // brilho de impacto (vermelho) perto da "boca": canto superior direito do recorte (o perfil olha para a direita)
    const gx = dx + dw * 0.82;
    const gy = dy + dh * 0.38;
    const glow = ctx.createRadialGradient(gx, gy, 0, gx, gy, dh * 0.22);
    glow.addColorStop(0, 'rgba(255,90,60,.95)');
    glow.addColorStop(1, 'rgba(255,90,60,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(gx, gy, dh * 0.22, 0, Math.PI * 2);
    ctx.fill();
    xRosto = dx + dw + 14;
  }
  // o nome: à direita do rosto (ou centralizado na faixa, sem rosto)
  const nx = o.rosto ? xRosto : x + o.w / 2;
  const tamanho = tamanhoDoNomeNaFaixaRosto(ctx, o.nome, o.rosto ? x + o.w - nx - 10 : o.w * 0.7, Math.min(34, Math.round(o.h * 0.26)));
  textoArcade(ctx, o.nome, nx, o.y + o.h / 2, tamanho, NUCLEO_DO_NOME, SOMBRA_DO_NOME, o.rosto ? 'left' : 'center', 1, 1, FONTE_DO_ESPECIAL(tamanho));
  ctx.restore();
}

/** Nome em até `max` px; encolhe (nunca abaixo de 16) se não couber na largura livre. */
function tamanhoDoNomeNaFaixaRosto(ctx: Ctx, nome: string, livre: number, max = 34): number {
  ctx.save();
  ctx.font = FONTE_DO_ESPECIAL(max);
  const w = larguraDoTexto(ctx, nome);
  ctx.restore();
  return w > livre && livre > 0 ? Math.max(16, Math.floor((max * livre) / w)) : max;
}
