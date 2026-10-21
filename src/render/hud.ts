import type { Elenco } from '../assets/elenco';
import { ALTURA, LARGURA, MAX_EN } from '../core/constantes';
import type { ExtensaoChefeLeitura, LeituraLuta, LutadorLeitura } from '../core/contratos';
import { clamp } from '../core/math';
import { ESQUIVA_PADRAO } from '../data/esquiva';
import { zoomIn } from './animacao';
import { chDaFicha } from './lutador';
import { ETIQUETA_POSTURA, desenharPostura, posturaDe, type Postura } from './postura';
import { desenharRetratoMoldurado } from './retrato';
import type { Ctx } from './tela';
import { caminhoInclinado, painel, retanguloArredondado, texto, textoArcade } from './texto';

/** Comportamento do boneco de treino (`g.dummy` do protótipo). Ainda não faz parte do C3. */
export type AlvoTreino = 'stand' | 'crouch' | 'block' | 'crouchblock' | 'jump' | 'cpu';

export const NOMES_ALVO_TREINO: Readonly<Record<AlvoTreino, string>> = {
  stand: 'PARADO',
  crouch: 'AGACHADO',
  block: 'BLOQUEANDO (EM PÉ)',
  crouchblock: 'BLOQUEANDO (AGACHADO)',
  jump: 'PULANDO',
  cpu: 'CPU NORMAL',
};

export interface OpcoesHud {
  /** Só no modo treino: mostra "Alvo: ..." no painel. */
  readonly alvoTreino?: AlvoTreino;
  /**
   * `Regras.esquiva`: mostra o marcador de custo da ESQUIVA na barra SUPER e o selo ESQ (apagado com en < custo, aceso e pulsando com
   * en >= custo). Padrão false: sem a mecânica (`?expansao=4`) o HUD é o do protótipo, pixel a pixel.
   */
  readonly esquiva?: boolean;
}

/** Máximo de marcadores de round por lado (a UI oferece 1 a 3; o resto é defesa em profundidade). */
export const MAX_MARCADORES_ROUND = 5;

/** Corpo (px lógicos) do rótulo "CHEFÃO  000000": 14 dava 10,7 px CSS no celular deitado (E7a); 18 dá 13,7 / 13,0. Só o chefão: as linhas dos lutadores comuns seguem as do protótipo. */
export const FONTE_ROTULO_CHEFE = 18;

/** Título do chefão que cabe na linha do rótulo ("O ARCONTE" = 9); mais longo, o rótulo fica só "CHEFÃO" (a linha tem 332 px, junto do placar). */
export const TITULO_MAX_NO_HUD = 16;

const DOURADO: readonly [string, string] = ['#fff6b0', '#ff9a1a'];

/** Barra de vida, energia, nome, placar e rounds de UM lado. Porte do `bar()` de drawHUD. */
function desenharLado(
  ctx: Ctx,
  luta: LeituraLuta,
  p: LutadorLeitura,
  nome: string,
  custoEspecial: number,
  lado: 1 | 2,
  postura: Postura | null = null,
  esquiva = false,
  titulo = '',
): void {
  const x = lado === 1 ? 104 : 524;
  const w = 332;
  const y = 24;
  const h = 26;
  const sk = 12;
  const pct = p.hp / p.maxHp;
  const rastroPct = p.hpShown / p.maxHp;
  // luta de chefe (C3 aditivo, plano 2.5): barras de vida empilhadas. Campos ausentes = 1 barra, desenho de sempre.
  const ext = p as LutadorLeitura & ExtensaoChefeLeitura;
  const barras = ext.barras ?? 1;
  const barrasMax = ext.barrasMax ?? 1;
  const empilhada = barrasMax > 1 && barras > 1;

  caminhoInclinado(ctx, x - 4, y - 4, w + 8, h + 8, sk, lado);
  ctx.fillStyle = '#05060f';
  ctx.fill();
  ctx.save();
  caminhoInclinado(ctx, x, y, w, h, sk, lado);
  ctx.clip();
  if (empilhada) {
    // a barra de baixo (a que vem depois) aparece inteira por trás da barra atual, em outra cor
    const gp = ctx.createLinearGradient(0, y, 0, y + h);
    gp.addColorStop(0, '#c58aff');
    gp.addColorStop(1, '#5a1fb0');
    ctx.fillStyle = gp;
  } else ctx.fillStyle = '#4a0d12';
  ctx.fillRect(x, y, w, h);
  const fx = (f: number): number => (lado === 1 ? x + w - w * f : x);
  ctx.fillStyle = '#e03a2e';
  ctx.fillRect(fx(rastroPct), y, w * rastroPct, h);
  const baixa = pct < 0.25 && Math.floor(luta.t / 6) % 2 === 1;
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, baixa ? '#fff3c4' : '#fff59a');
  gr.addColorStop(0.5, baixa ? '#ff9a2e' : '#ffd51f');
  gr.addColorStop(1, baixa ? '#d94a10' : '#e89a00');
  ctx.fillStyle = gr;
  ctx.fillRect(fx(pct), y, w * pct, h);
  ctx.fillStyle = 'rgba(255,255,255,.35)';
  ctx.fillRect(fx(pct), y + 2, w * pct, 5);
  ctx.fillStyle = 'rgba(0,0,0,.18)';
  for (let i = 1; i < 20; i++) ctx.fillRect(x + (w * i) / 20, y, 1, h);
  ctx.restore();
  caminhoInclinado(ctx, x, y, w, h, sk, lado);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#f4f7ff';
  ctx.stroke();

  const alinha = lado === 1 ? 'left' : 'right';
  const ancora = lado === 1 ? x + 6 : x + w - 6;
  textoArcade(ctx, nome, ancora, 66, 22, '#fff', '#05060f', alinha);
  // o chefão leva o título do def (ZENON: "O ARCONTE"): "CHEFÃO · O ARCONTE", logo acima do nome
  const rotulo = ext.chefe === true ? (titulo && titulo.length <= TITULO_MAX_NO_HUD ? `CHEFÃO · ${titulo.toLocaleUpperCase('pt-BR')}` : 'CHEFÃO') : p.cpu !== null ? 'CPU' : lado === 1 ? '1P' : '2P';
  const placar = String(p.score).padStart(6, '0');
  const chefao = ext.chefe === true;
  textoArcade(ctx, lado === 1 ? `${rotulo}  ${placar}` : `${placar}  ${rotulo}`, ancora, chefao ? 12 : 11, chefao ? FONTE_ROTULO_CHEFE : 14, '#cfe6ff', '#05060f', alinha);

  if (postura) {
    // postura atual (NILA: GAJA/SARPA), na faixa livre entre o nome e as bolinhas de round
    const { w, h } = ETIQUETA_POSTURA;
    desenharPostura(ctx, postura, lado === 1 ? 236 : LARGURA - 236 - w, 66 - h / 2);
  }
  if (barrasMax > 1) {
    // contador de barras (×2, ×1) no meio, entre o nome e as bolinhas de round
    textoArcade(ctx, `×${barras}`, x + w / 2, 66, 22, barras > 1 ? ['#e6c8ff', '#9a4cff'] : ['#fff6b0', '#ff9a1a'], '#05060f', 'center');
  }
  if (!luta.training) {
    // teto: o valor vem da luta (hoje 1..3); defesa em profundidade contra um winsNeeded absurdo travar o quadro
    for (let i = 0, n = Math.min(luta.winsNeeded, MAX_MARCADORES_ROUND); i < n; i++) {
      const cx = lado === 1 ? 424 - i * 20 : 536 + i * 20;
      ctx.beginPath();
      ctx.arc(cx, 66, 7, 0, Math.PI * 2);
      ctx.fillStyle = i < p.wins ? '#ffd23f' : '#1b1f33';
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
    }
  }

  // energia (SUPER)
  const ex = lado === 1 ? 128 : 592;
  const ew = 240;
  const ey = ALTURA - 34;
  const eh = 16;
  const ef = clamp(p.en / MAX_EN, 0, 1);
  textoArcade(ctx, 'SUPER', lado === 1 ? 14 : LARGURA - 14, ALTURA - 26, 30, ['#fff35a', '#ff7a00'], '#4a1200', alinha);
  caminhoInclinado(ctx, ex - 3, ey - 3, ew + 6, eh + 6, 7, lado);
  ctx.fillStyle = '#05060f';
  ctx.fill();
  ctx.save();
  caminhoInclinado(ctx, ex, ey, ew, eh, 7, lado);
  ctx.clip();
  ctx.fillStyle = '#10264a';
  ctx.fillRect(ex, ey, ew, eh);
  const pronta = p.en >= custoEspecial;
  const pulso = pronta && Math.floor(luta.t / 7) % 2 === 0;
  const eg = ctx.createLinearGradient(0, ey, 0, ey + eh);
  eg.addColorStop(0, pulso ? '#ffffff' : '#a6efff');
  eg.addColorStop(1, pulso ? '#7fe3ff' : '#1e6fe8');
  ctx.fillStyle = eg;
  ctx.fillRect(lado === 1 ? ex : ex + ew - ew * ef, ey, ew * ef, eh);
  ctx.fillStyle = 'rgba(0,0,0,.35)';
  for (let i = 1; i < 10; i++) ctx.fillRect(ex + (ew * i) / 10, ey, 2, eh);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(lado === 1 ? ex + (ew * custoEspecial) / MAX_EN : ex + ew - (ew * custoEspecial) / MAX_EN, ey, 2, eh);
  if (esquiva) {
    // marcador do custo da ESQUIVA (ciano, 2 px) com 1 px de borda escura de cada lado: a barra cheia também é ciano, sem a borda ele sumiria.
    // Fica ao lado do dourado (do lado da origem da barra), então nos lutadores de custo 20 os dois não se cobrem.
    const xe = lado === 1 ? ex + (ew * ESQUIVA_PADRAO.custo) / MAX_EN - 3 : ex + ew - (ew * ESQUIVA_PADRAO.custo) / MAX_EN + 4;
    ctx.fillStyle = '#05060f';
    ctx.fillRect(xe - 1, ey, 4, eh);
    ctx.fillStyle = '#7fe3ff';
    ctx.fillRect(xe, ey, 2, eh);
  }
  ctx.restore();
  caminhoInclinado(ctx, ex, ey, ew, eh, 7, lado);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#9fc6ff';
  ctx.stroke();
  if (esquiva) desenharSeloEsquiva(ctx, luta, p.en >= ESQUIVA_PADRAO.custo, lado === 1 ? ex + ew + 12 : ex - 12 - SELO_ESQ.w, ey - 1);
}

/** Selo ESQ ao lado da barra SUPER. Apagado = sem barra para esquivar; aceso e pulsando = pode esquivar (en >= custo). */
export const SELO_ESQ = { w: 36, h: 18 } as const;
function desenharSeloEsquiva(ctx: Ctx, luta: LeituraLuta, pronta: boolean, x: number, y: number): void {
  const pulso = pronta && Math.floor(luta.t / 7) % 2 === 0;
  ctx.save();
  retanguloArredondado(ctx, x, y, SELO_ESQ.w, SELO_ESQ.h, 5);
  ctx.fillStyle = pronta ? (pulso ? '#ffffff' : '#7fe3ff') : '#10264a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = pronta ? '#e9fbff' : '#4a5a8a';
  ctx.stroke();
  ctx.restore();
  texto(ctx, 'ESQ', x + SELO_ESQ.w / 2, y + SELO_ESQ.h / 2 + 1, 12, pronta ? '#04243a' : '#7f8fbf', 'center', { shadow: false });
}

/** HUD de luta: barras, retratos, KO, cronômetro e contadores de combo. Porte de drawHUD. */
export function desenharHUD(ctx: Ctx, luta: LeituraLuta, elenco: Elenco, opcoes: OpcoesHud = {}): void {
  const [a, b] = luta.fighters;
  const ra = elenco[a.id];
  const rb = elenco[b.id];
  desenharLado(ctx, luta, a, ra.ch.name, chDaFicha(ra.ch, a.ficha).proj.cost, 1, posturaDe(ra.ch, a.ficha), opcoes.esquiva === true, ra.ch.title);
  desenharLado(ctx, luta, b, rb.ch.name, chDaFicha(rb.ch, b.ficha).proj.cost, 2, posturaDe(rb.ch, b.ficha), opcoes.esquiva === true, rb.ch.title);
  desenharRetratoMoldurado(ctx, ra.arte.retrato(ra.ch.head), 8, 8, 88, false);
  desenharRetratoMoldurado(ctx, rb.arte.retrato(rb.ch.head), LARGURA - 96, 8, 88, true);

  // medalhão do KO e cronômetro
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(450, 6);
  ctx.lineTo(510, 6);
  ctx.lineTo(524, 28);
  ctx.lineTo(510, 50);
  ctx.lineTo(450, 50);
  ctx.lineTo(436, 28);
  ctx.closePath();
  const bg = ctx.createLinearGradient(0, 6, 0, 50);
  bg.addColorStop(0, '#2a3f86');
  bg.addColorStop(1, '#0a1030');
  ctx.fillStyle = bg;
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = '#f4f7ff';
  ctx.stroke();
  ctx.restore();
  textoArcade(ctx, 'KO', 480, 29, 30, ['#ffffff', '#ff5a4a'], '#3a0a0a');
  const semLimite = luta.timerMax === 0;
  const tl = semLimite ? '∞' : String(Math.max(0, luta.timer)).padStart(2, '0');
  const urgente = !semLimite && luta.timer <= 10;
  textoArcade(ctx, tl, 480, 74, semLimite ? 54 : 46, urgente ? ['#ffffff', '#ff3b3b'] : ['#fff0a0', '#ff8a00'], '#3a1500');

  // contador de combo (o combo que ESTE lutador aplicou no rival)
  for (const [c, lado] of [[a.combo, 1], [b.combo, 2]] as const) {
    if (c.t <= 0) continue;
    const alfa = Math.min(1, c.t / 20);
    const x = lado === 1 ? 24 : LARGURA - 24;
    const alinha = lado === 1 ? 'left' : 'right';
    const pop = 1 + Math.max(0, c.t - 52) * 0.05;
    textoArcade(ctx, `${c.hits} HITS`, x, 150, 46, ['#fff6b0', '#ff7a1a'], '#2a0d00', alinha, pop, alfa);
    textoArcade(ctx, `DANO ${Math.round(c.dmg)}`, x, 188, 20, '#fff', '#000', alinha, 1, alfa);
  }
  if (luta.training) desenharHudTreino(ctx, luta, opcoes);
}

function desenharHudTreino(ctx: Ctx, luta: LeituraLuta, opcoes: OpcoesHud): void {
  painel(ctx, LARGURA / 2 - 150, 98, 300, 58, { r: 8 });
  texto(ctx, 'MODO TREINO', LARGURA / 2, 112, 15, '#ffd23f', 'center');
  const { hits, dmg } = luta.trainInfo;
  texto(ctx, `Último combo: ${hits} ${hits === 1 ? 'golpe' : 'golpes'} — ${Math.round(dmg)} de dano`, LARGURA / 2, 134, 13, '#fff', 'center');
  if (opcoes.alvoTreino) texto(ctx, `Alvo: ${NOMES_ALVO_TREINO[opcoes.alvoTreino]}`, LARGURA / 2, 150, 12, '#9fc6ff', 'center');
}

/** Faixas e títulos grandes da luta (ROUND 1, FIGHT!, K.O., vencedor...). Porte de drawOverlay. */
export function desenharOverlay(ctx: Ctx, luta: LeituraLuta, elenco: Elenco): void {
  const y = 250;
  const faixa = (a: number): void => {
    const gr = ctx.createLinearGradient(0, y - 70, 0, y + 70);
    gr.addColorStop(0, 'rgba(0,0,0,0)');
    gr.addColorStop(0.5, `rgba(0,0,0,${a})`);
    gr.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, y - 70, LARGURA, 140);
  };
  const { phase, t } = luta;
  const centro = LARGURA / 2;
  if (luta.training) {
    if (phase === 'intro') textoArcade(ctx, 'TREINO', centro, y, 70, DOURADO, '#2a1000', 'center', zoomIn(t));
    return;
  }
  if (phase === 'intro' && t < 76) {
    faixa(0.45);
    textoArcade(ctx, `ROUND ${luta.round}`, centro, y, 78, DOURADO, '#2a1000', 'center', zoomIn(t));
  }
  if (phase === 'fight' && t < 45) textoArcade(ctx, 'FIGHT!', centro, y, 110, ['#ffffff', '#ff4b3a'], '#2a0505', 'center', 1 + t * 0.012, 1 - t / 45);
  if (phase === 'ko') {
    faixa(0.5);
    textoArcade(ctx, 'K.O.', centro, y, 130, ['#ffffff', '#ff2a2a'], '#2a0000', 'center', zoomIn(t));
  }
  if (phase === 'timeover') {
    faixa(0.5);
    textoArcade(ctx, 'TEMPO ESGOTADO', centro, y, 70, DOURADO, '#2a1000', 'center', zoomIn(t));
  }
  if (phase === 'roundend' || phase === 'matchend') {
    faixa(0.55);
    const vencedor = luta.winner === null ? null : luta.fighters[luta.winner];
    const titulo = vencedor ? `${elenco[vencedor.id].ch.name} VENCE!` : 'EMPATE!';
    textoArcade(ctx, titulo, centro, y, 76, DOURADO, '#2a1000', 'center', zoomIn(t));
    if (luta.perfect && t > 8) textoArcade(ctx, 'PERFECT!', centro, y + 66, 44, ['#ffffff', '#6fe0ff'], '#04243a', 'center', 1 + Math.sin(t / 5) * 0.04);
    else if (phase === 'matchend' && t > 50) textoArcade(ctx, 'VITÓRIA FINAL', centro, y + 66, 34, '#fff', '#000');
  }
}
