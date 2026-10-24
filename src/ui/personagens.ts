import type { IdLutador } from '../core/contratos';
import type { LutadorMontado } from '../data/montar';
import { getPD } from '../data/poses';
import { desenharPose } from '../render/pose';
import { FB } from '../render/texto';
import type { ChegadaDeArte } from './chegada-de-arte';
import type { Ferramentas } from './ferramentas';
import type { Mundo } from './contexto';

/** Teclas mostradas na tela "Como jogar" e na lista de golpes (SCHEME do protótipo). */
export const SCHEME = {
  1: { qcf: '↓↘→', dp: '→↓↘', qcb: '↓↙←', up: '↑', down: '↓', left: '←', right: '→', fwd: '→', lp: 'Z', hp: 'X', lk: 'C', hk: 'V', sp: 'B' },
  2: { qcf: '↓↘→', dp: '→↓↘', qcb: '↓↙←', up: 'W', down: 'S', left: 'A', right: 'D', fwd: 'D', lp: 'J', hp: 'K', lk: 'U', hk: 'I', sp: 'L' },
} as const;
export type EsquemaTeclas = keyof typeof SCHEME;

/** Cores dos jogadores (P_COL). */
export const P_COL: readonly [string, string] = ['#3fa9ff', '#ff4f5e'];

/**
 * Escala máxima (`LutadorDef.scale`) que as telas de vitrine (seleção, VS, final) mostram sem corte: acima disso o lutador é reduzido na vitrine
 * para ter a altura de um de 1,1. Só o BAATAR (1,28) e o ZENON (1,36) passam; os 8 de até 1,06 (os 4 originais, de fidelidade com o protótipo,
 * inclusive) ficam EXATAMENTE como estavam. Sem isto a cabeça do ZENON sai da tela na seleção (topo em y -48), no VS (-68) e no final (-55).
 */
export const ESCALA_MAXIMA_DE_VITRINE = 1.1;

/** Fator (<= 1) que a vitrine multiplica na escala de desenho de um lutador. */
export const escalaDeVitrine = (ch: { readonly scale: number }): number => Math.min(1, ESCALA_MAXIMA_DE_VITRINE / ch.scale);

/**
 * Os 4 lutadores do protótipo. Na seleção os nomes dos especiais deles ficam SEMPRE a 13 px, pixel a pixel como no protótipo (o e2e de fidelidade os
 * compara), mesmo os que passam da borda do painel (HAYATO, WEI LONG, MIN-JI, CAIO...). Só os lutadores NOVOS encolhem a fonte para caber.
 */
export const LUTADORES_DO_PROTOTIPO: ReadonlySet<string> = new Set(['hayato', 'wei-long', 'min-ji', 'caio']);
/** Tamanho padrão do nome de especial no painel da seleção e a largura útil dele (da coluna até a borda do painel, com folga). */
export const NOME_DE_ESPECIAL = { tamanho: 13, larguraMax: 96, minimo: 8 } as const;

/**
 * Tamanho (px) do nome de especial `rotulo` no painel da seleção de `id`: 13 para todos, exceto os NOVOS cujo nome (com a seta) não cabe em
 * `larguraMax` — esses encolhem de meio em meio px até caber (nunca abaixo de `minimo`). `medir` = largura do texto em px na fonte do corpo e no tamanho dado.
 */
export function tamanhoDoNomeDeEspecial(medir: (rotulo: string, tamanho: number) => number, id: string, rotulo: string): number {
  const { tamanho, larguraMax, minimo } = NOME_DE_ESPECIAL;
  if (LUTADORES_DO_PROTOTIPO.has(id)) return tamanho;
  let t: number = tamanho;
  while (t > minimo && medir(rotulo, t) > larguraMax) t -= 0.5;
  return t;
}

/** `tamanhoDoNomeDeEspecial` medindo no contexto 2D (fonte do corpo, `FB`). */
export function tamanhoDoNomeNoContexto(ctx: { font: string; measureText(s: string): { width: number } }, id: string, rotulo: string): number {
  const antes = ctx.font;
  const t = tamanhoDoNomeDeEspecial((r, tam) => {
    ctx.font = FB(tam);
    return ctx.measureText(r).width;
  }, id, rotulo);
  ctx.font = antes;
  return t;
}

/** Respiração do lutador nos menus. */
export const idleBob = (t: number): number => 1 + 0.012 * Math.sin(t / 16);

/** Lutador parado em menu: sombra + pose com leve respiração. Porte de showChar. */
export function mostrarLutador(
  f: Ferramentas,
  m: Mundo,
  id: IdLutador,
  x: number,
  y: number,
  scale: number,
  facing: number,
  t: number,
  pose = 'guard',
  chegada?: ChegadaDeArte,
): void {
  const { ctx } = f;
  const r = m.elenco[id];
  m.arte.pedir(id); // carga sob demanda: se o atlas não está na memória, pede (o lutador aparece quando chegar)
  // chegada suave: a arte que chega com a cena aberta sobe de 0 a 1 em 12 ticks; com a arte pronta desde o início `alfa` é 1 e nada muda no desenho
  const alfa = chegada ? chegada.alfa(id, r.arte.pronta !== false, t) : 1;
  if (alfa <= 0) return;
  ctx.save();
  if (alfa < 1) ctx.globalAlpha *= alfa;
  f.floorShadow(x, y, 70 * scale);
  ctx.translate(x, y);
  ctx.scale(1, idleBob(t));
  desenharPose(ctx, r.ch, r.arte, pose, 0, 0, scale, facing);
  ctx.restore();
}

/** Barras de atributos (FORÇA, VELOCIDADE, DEFESA, ALCANCE). Porte de statBars. */
export function barrasDeStatus(f: Ferramentas, ch: LutadorMontado, x: number, y: number, w: number): void {
  const { ctx } = f;
  const labs = ['FORÇA', 'VELOCIDADE', 'DEFESA', 'ALCANCE'];
  labs.forEach((l, i) => {
    const yy = y + i * 16;
    f.T(l, x, yy, 11, '#cfd6f5', 'left', { shadow: false });
    for (let k = 0; k < 5; k++) {
      ctx.fillStyle = k < (ch.bars[i] ?? 0) ? ch.accent : 'rgba(255,255,255,.14)';
      ctx.fillRect(x + 78 + k * ((w - 78) / 5), yy - 5, (w - 78) / 5 - 3, 10);
    }
  });
}

/** Miniatura de uma pose dentro de uma moldura com fundo degradê. Porte de drawThumb. */
export function miniatura(
  f: Ferramentas,
  m: Mundo,
  id: IdLutador,
  pose: string,
  x: number,
  y: number,
  w: number,
  h: number,
  bg?: readonly [string, string] | null,
): void {
  const { ctx } = f;
  const r = m.elenco[id];
  m.arte.pedir(id);
  ctx.save();
  ctx.beginPath();
  f.rr(x, y, w, h, 6);
  ctx.clip();
  const g = ctx.createLinearGradient(0, y, 0, y + h);
  g.addColorStop(0, bg ? bg[0] : '#2b3a70');
  g.addColorStop(1, bg ? bg[1] : '#0d1233');
  ctx.fillStyle = g;
  ctx.fillRect(x, y, w, h);
  const pd = getPD(r.ch, pose);
  const s = Math.min((h - 6) / pd.h, (w - 6) / pd.w) / r.ch.K;
  desenharPose(ctx, r.ch, r.arte, pose, x + w / 2 - (pd.ax - pd.w / 2) * r.ch.K * s, y + h - 3, s, 1);
  ctx.restore();
  f.rr(x, y, w, h, 6);
  ctx.lineWidth = 2;
  ctx.strokeStyle = 'rgba(255,255,255,.35)';
  ctx.stroke();
}

/** Uma linha da lista de golpes. */
export type LinhaDeGolpe = { pose: string; name: string; keys: readonly string[]; desc: string; special?: boolean; air?: boolean };

/** 4 golpes comuns + 3 especiais exclusivos do lutador. Porte de moveRows (textos idênticos). */
export function linhasDeGolpes(ch: LutadorMontado): LinhaDeGolpe[] {
  const [f, d, w] = ch.sps;
  const info = (sp: { info?: string; cost?: number }, alt: string): string => `${sp.info ?? ''} Ou ${alt}. Custo ${sp.cost ?? 0}.`;
  return [
    { pose: 'punch', name: 'Soco fraco', keys: ['lp'], desc: 'Rápido. Inicia o combo e pode ser repetido.' },
    { pose: 'kick', name: 'Chute fraco', keys: ['lk'], desc: 'Rápido, com bom alcance. Encadeia em golpes fortes.' },
    { pose: 'punch', name: 'Soco forte', keys: ['hp'], desc: 'Avança e machuca. Com ↓ lança o rival para o alto.' },
    { pose: 'kick', name: 'Chute forte', keys: ['hk'], desc: 'Derruba o rival. Final de combo. Com ↓ vira rasteira.' },
    { pose: f.pose, name: f.name ?? '', keys: ['qcf', 'lp'], desc: info(f, 'ESP parado'), special: true },
    { pose: d.pose, name: d.name ?? '', keys: ['dp', 'lp'], desc: info(d, '↓ + ESP'), special: true },
    { pose: w.pose, name: w.name ?? '', keys: ['qcb', 'lk'], desc: info(w, '→ + ESP'), special: true },
  ];
}

/** Teclas de um golpe: tecla desenhada (1 a 2 caracteres) ou texto (setas de comando). Porte de keyRow. */
export function linhaDeTeclas(f: Ferramentas, keys: readonly string[], scheme: EsquemaTeclas, x: number, y: number): void {
  let cx = x;
  const S = SCHEME[scheme] as Record<string, string>;
  keys.forEach((k, i) => {
    const lab = S[k] ?? k;
    if (lab.length > 2) {
      f.T(lab, cx, y + 17, 15, '#ffd23f', 'left');
      cx += 46;
    } else {
      f.keycap(lab, cx, y, 34, 34);
      cx += 34;
    }
    if (i < keys.length - 1) {
      f.T('+', cx + 8, y + 17, 16, '#fff', 'center');
      cx += 16;
    }
  });
}

/** Lista de golpes de um lutador (tela "Como jogar" e pausa). Porte de drawMoveRows. */
export function desenharLinhasDeGolpes(f: Ferramentas, m: Mundo, id: IdLutador, x: number, y: number, w: number, scheme: EsquemaTeclas, rowH = 48): void {
  const ch = m.elenco[id].ch;
  const narrow = w < 600;
  const descW = w - 76 - (narrow ? 132 : 150);
  linhasDeGolpes(ch).forEach((r, i) => {
    const yy = y + i * rowH;
    f.panel(x, yy, w, rowH - 5, { r: 6, c0: 'rgba(22,16,48,.85)', c1: 'rgba(10,8,26,.85)', lw: 1 });
    miniatura(f, m, id, r.pose, x + 4, yy + 3, 62, rowH - 11, r.air ? ['#3a5a9a', '#101a40'] : null);
    f.T(r.name, x + 76, yy + (narrow ? 11 : 12), 16, r.special ? ch.fire[0] : '#fff', 'left');
    if (narrow) f.wrap(r.desc, x + 76, yy + 25, descW, 12, 11, '#cfd6f5');
    else f.T(r.desc, x + 76, yy + 31, 12, '#cfd6f5', 'left', { shadow: false });
    linhaDeTeclas(f, r.keys, scheme, x + w - (narrow ? 118 : 124), yy + 4);
  });
}
