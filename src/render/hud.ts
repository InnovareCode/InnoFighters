import type { Elenco } from '../assets/elenco';
import { ALTURA, LARGURA, MAX_EN } from '../core/constantes';
import type { LeituraLuta, LutadorLeitura } from '../core/contratos';
import { clamp } from '../core/math';
import { zoomIn } from './animacao';
import { desenharRetratoMoldurado } from './retrato';
import type { Ctx } from './tela';
import { caminhoInclinado, painel, texto, textoArcade } from './texto';

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
}

const DOURADO: readonly [string, string] = ['#fff6b0', '#ff9a1a'];

/** Barra de vida, energia, nome, placar e rounds de UM lado. Porte do `bar()` de drawHUD. */
function desenharLado(ctx: Ctx, luta: LeituraLuta, p: LutadorLeitura, nome: string, custoEspecial: number, lado: 1 | 2): void {
  const x = lado === 1 ? 104 : 524;
  const w = 332;
  const y = 24;
  const h = 26;
  const sk = 12;
  const pct = p.hp / p.maxHp;
  const rastroPct = p.hpShown / p.maxHp;

  caminhoInclinado(ctx, x - 4, y - 4, w + 8, h + 8, sk, lado);
  ctx.fillStyle = '#05060f';
  ctx.fill();
  ctx.save();
  caminhoInclinado(ctx, x, y, w, h, sk, lado);
  ctx.clip();
  ctx.fillStyle = '#4a0d12';
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
  const rotulo = p.cpu !== null ? 'CPU' : lado === 1 ? '1P' : '2P';
  const placar = String(p.score).padStart(6, '0');
  textoArcade(ctx, lado === 1 ? `${rotulo}  ${placar}` : `${placar}  ${rotulo}`, ancora, 11, 14, '#cfe6ff', '#05060f', alinha);

  if (!luta.training) {
    for (let i = 0; i < luta.winsNeeded; i++) {
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
  ctx.restore();
  caminhoInclinado(ctx, ex, ey, ew, eh, 7, lado);
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#9fc6ff';
  ctx.stroke();
}

/** HUD de luta: barras, retratos, KO, cronômetro e contadores de combo. Porte de drawHUD. */
export function desenharHUD(ctx: Ctx, luta: LeituraLuta, elenco: Elenco, opcoes: OpcoesHud = {}): void {
  const [a, b] = luta.fighters;
  const ra = elenco[a.id];
  const rb = elenco[b.id];
  desenharLado(ctx, luta, a, ra.ch.name, ra.ch.proj.cost, 1);
  desenharLado(ctx, luta, b, rb.ch.name, rb.ch.proj.cost, 2);
  desenharRetratoMoldurado(ctx, ra.arte.imagem, ra.ch.head, 8, 8, 88, false);
  desenharRetratoMoldurado(ctx, rb.arte.imagem, rb.ch.head, LARGURA - 96, 8, 88, true);

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
