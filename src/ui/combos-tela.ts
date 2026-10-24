import type { MotorV2 } from '../core/contratos';
import type { LutadorMontado } from '../data/montar';
import type { ComboProprio, FinalDoCombo, NomeGolpe } from '../data/tipos';
import { posturaDe } from '../render/postura';
import type { Ferramentas } from './ferramentas';
import { SCHEME, type EsquemaTeclas } from './personagens';

/*
 * Onde o jogador aprende os COMBOS PRÓPRIOS (docs/spec-revisao-motor-luta-v2.md §6.2): a lista do TREINO (pausa > lista de golpes) e a aba
 * GOLPES do "Como jogar". Tudo sai do MESMO dado do motor (`LutadorDef.combosProprios`, e `fichas[ficha].combosProprios` na NILA): trocar o
 * dado troca a tela. Os NOMES e as linhas de efeito são do Apolo (docs/combos-proprios.md) e moram em `src/data/lutadores/*.ts`: nada aqui os fixa.
 * A linha de efeito é `ComboProprio.efeito` quando existe; senão a do `final` ("lança o rival"...) ou "fecha com o especial". Ela divide a
 * altura da caixa com o nome (folga mínima medida: 20,6 px); `validarCombosProprios` limita o texto a EFEITO_MAX_CARACTERES. Só aparece com
 * `Regras.motorV2.combos` ligada (a mesma flag que liga os combos no motor). Este módulo é puro, menos `desenharCombos`.
 */

/** As teclas lógicas de um golpe de combo (chaves do `SCHEME`: `down`, `fwd`, `lp`...). */
export type TeclaLogica = 'down' | 'fwd' | 'lp' | 'lk' | 'hp' | 'hk' | 'sp';

/**
 * lp/lk/hp/hk = o botão; clp/clk/chp/chk = ↓ + o botão; sFire = ESP; sDown = ↓ + ESP; sFwd = → + ESP. Golpe que um combo não pode ter
 * (a validação do boot recusa) cai em nenhuma tecla.
 */
export function teclasDoGolpe(golpe: NomeGolpe): readonly TeclaLogica[] {
  switch (golpe) {
    case 'lp': case 'lk': case 'hp': case 'hk':
      return [golpe];
    case 'clp': return ['down', 'lp'];
    case 'clk': return ['down', 'lk'];
    case 'chp': return ['down', 'hp'];
    case 'chk': return ['down', 'hk'];
    case 'sFire': return ['sp'];
    case 'sDown': return ['down', 'sp'];
    case 'sFwd': return ['fwd', 'sp'];
    default: return [];
  }
}

export type Entrada = 'teclado' | 'toque';

const ROTULO_NO_TOQUE: Readonly<Record<TeclaLogica, string>> = {
  down: '↓', fwd: '→', lp: 'SOCO FRACO', lk: 'CHUTE FRACO', hp: 'SOCO FORTE', hk: 'CHUTE FORTE', sp: 'ESP',
};

/** O rótulo de uma tecla lógica: a letra do teclado do jogador `esquema`, ou o nome do botão na tela de toque. */
export function rotuloDaTecla(tecla: TeclaLogica, entrada: Entrada, esquema: EsquemaTeclas = 1): string {
  return entrada === 'toque' ? ROTULO_NO_TOQUE[tecla] : SCHEME[esquema][tecla];
}

/** Um golpe como texto: "↓ + Z" (teclado) ou "↓ + SOCO FRACO" (toque). */
export function textoDoGolpe(golpe: NomeGolpe, entrada: Entrada, esquema: EsquemaTeclas = 1): string {
  return teclasDoGolpe(golpe).map((t) => rotuloDaTecla(t, entrada, esquema)).join(' + ');
}

/** O combo todo como texto, golpe a golpe: "Z › ↓ + V › → + B". */
export function textoDoCombo(combo: Pick<ComboProprio, 'sequencia'>, entrada: Entrada, esquema: EsquemaTeclas = 1): string {
  return combo.sequencia.map((g) => textoDoGolpe(g, entrada, esquema)).join(' › ');
}

const EFEITO_DO_FINAL: Readonly<Record<FinalDoCombo, string>> = {
  derruba: 'derruba o rival',
  lanca: 'lança o rival',
  parede: 'empurra o rival para a parede',
  cruza: 'troca de lado com o rival',
};
const ESPECIAIS = ['sFire', 'sDown', 'sFwd'] as const satisfies readonly NomeGolpe[];

export interface PassoDaTela {
  readonly golpe: NomeGolpe;
  readonly teclas: readonly TeclaLogica[];
  /** O especial que fecha o combo (destaque dourado). */
  readonly especial: boolean;
}

/** Um combo pronto para a tela. */
export interface ComboDaTela {
  readonly id: string;
  readonly nome: string;
  /** Postura/ficha a que pertence (NILA: GAJA, SARPA); null quando o lutador tem uma lista só. */
  readonly postura: string | null;
  readonly passos: readonly PassoDaTela[];
  /** O que o combo faz de diferente da cadeia universal, em português; null se não há o que dizer. */
  readonly efeito: string | null;
}

const idsDe = (lista: readonly ComboProprio[]): string => lista.map((c) => c.id).join('|');

/**
 * Os combos de um lutador, base e fichas, na ordem do dado. Ficha que herda a lista da base (o ZENON) não repete; ficha com lista própria (a
 * NILA: um combo por postura) vem etiquetada com a postura.
 */
export function combosDoLutador(ch: Pick<LutadorMontado, 'combosProprios' | 'fichas'>): ComboDaTela[] {
  const base = ch.combosProprios ?? [];
  const grupos: Array<{ ficha: string | null; lista: readonly ComboProprio[] }> = [{ ficha: null, lista: base }];
  for (const [ficha, fch] of Object.entries(ch.fichas)) {
    const lista = fch.combosProprios ?? [];
    if (lista.length > 0 && idsDe(lista) !== idsDe(base)) grupos.push({ ficha, lista });
  }
  const etiquetar = grupos.length > 1;
  const saida: ComboDaTela[] = [];
  for (const { ficha, lista } of grupos) {
    const postura = etiquetar ? (posturaDe(ch as LutadorMontado, ficha)?.toUpperCase() ?? ficha?.toUpperCase() ?? null) : null;
    for (const c of lista) {
      const ultimo = c.sequencia[c.sequencia.length - 1];
      const fechaComEspecial = ultimo !== undefined && (ESPECIAIS as readonly NomeGolpe[]).includes(ultimo);
      saida.push({
        id: c.id,
        nome: c.nome,
        postura,
        passos: c.sequencia.map((golpe, i) => ({ golpe, teclas: teclasDoGolpe(golpe), especial: fechaComEspecial && i === c.sequencia.length - 1 })),
        efeito: c.efeito ?? (c.final ? EFEITO_DO_FINAL[c.final] : fechaComEspecial ? 'fecha com o especial' : null),
      });
    }
  }
  return saida;
}

/** A lista só existe para o jogador com a regra dos combos próprios ligada (a mesma flag do motor). */
export const combosLigados = (regras: { readonly motorV2?: MotorV2 }): boolean => regras.motorV2?.combos === true;

// ------------------------------------------------------------------------------------------------------------------------ desenho
/** Altura de uma caixa de combo e o vão entre linhas. */
export const ALTURA_DA_CAIXA_DE_COMBO = 46;
const VAO = 4;
const TECLA = 26;
const COLUNAS = 2;

/** A altura que `n` combos ocupam (2 por linha). */
export function alturaDosCombos(n: number): number {
  if (n <= 0) return 0;
  const linhas = Math.ceil(n / COLUNAS);
  return linhas * ALTURA_DA_CAIXA_DE_COMBO + (linhas - 1) * VAO;
}

/** O texto da legenda da pausa do treino (no lugar da dica genérica da cadeia universal). */
export const DICA_DOS_COMBOS = 'COMBOS PRÓPRIOS: cada golpe precisa ACERTAR; aperte os botões na ordem';

/**
 * Desenha os combos em 2 colunas a partir de (x, y), em `largura` px. Cada caixa: nome (cor do lutador) e o efeito à esquerda, as teclas do
 * teclado à direita (o especial em dourado) e, embaixo, o mesmo combo nos botões da tela de toque. Devolve a altura usada.
 */
export function desenharCombos(f: Ferramentas, combos: readonly ComboDaTela[], cor: string, x: number, y: number, largura: number, esquema: EsquemaTeclas = 1): number {
  const coluna = (largura - VAO * 2) / COLUNAS;
  combos.forEach((c, i) => {
    const cx = x + (i % COLUNAS) * (coluna + VAO * 2);
    const cy = y + Math.floor(i / COLUNAS) * (ALTURA_DA_CAIXA_DE_COMBO + VAO);
    f.panel(cx, cy, coluna, ALTURA_DA_CAIXA_DE_COMBO, { r: 6, c0: 'rgba(22,16,48,.9)', c1: 'rgba(10,8,26,.9)', stroke: cor, lw: 1 });
    f.T(c.nome, cx + 10, cy + 13, 15, cor, 'left');
    const sub = [c.postura, c.efeito].filter((s): s is string => s !== null).join(' · ');
    if (sub) f.T(sub, cx + 10, cy + 27, 10, '#cfd6f5', 'left', { shadow: false });
    // teclas do teclado, alinhadas à direita da caixa
    const passos = c.passos.map((p) => ({ ...p, rotulos: p.teclas.map((t) => rotuloDaTecla(t, 'teclado', esquema)) }));
    const larguraDoPasso = (n: number): number => n * TECLA + Math.max(0, n - 1) * 10;
    const total = passos.reduce((s, p) => s + larguraDoPasso(p.rotulos.length), 0) + Math.max(0, passos.length - 1) * 14;
    let tx = cx + coluna - 10 - total;
    passos.forEach((p, k) => {
      p.rotulos.forEach((r, j) => {
        f.keycap(r, tx, cy + 4, TECLA, TECLA, p.especial && j === p.rotulos.length - 1);
        tx += TECLA;
        if (j < p.rotulos.length - 1) {
          f.T('+', tx + 5, cy + 4 + TECLA / 2, 11, '#fff', 'center');
          tx += 10;
        }
      });
      if (k < passos.length - 1) {
        f.T('›', tx + 7, cy + 4 + TECLA / 2, 16, '#ffd23f', 'center');
        tx += 14;
      }
    });
    f.T(`TOQUE: ${textoDoCombo({ sequencia: c.passos.map((p) => p.golpe) }, 'toque', esquema)}`, cx + 10, cy + 39, 10, '#7fe3ff', 'left', { shadow: false });
  });
  return alturaDosCombos(combos.length);
}

/** As duas teclas do SUPER (D-R1): SOCO FORTE + CHUTE FORTE juntas, com a barra cheia. */
export const TECLAS_DO_SUPER: readonly TeclaLogica[] = ['hp', 'hk'];
const COR_DO_SUPER = '#ff6ad5';

/**
 * A linha "SUPER · <nome>" (R-9, docs/spec-redesenho-jogabilidade.md §3.4): uma caixa do tamanho de uma caixa de combo, abaixo da lista deles,
 * no TREINO e na aba GOLPES do "Como jogar" — mesma fonte/tamanho (Barlow 600, 15 px) e larguras medidas no navegador por Apolo
 * (docs/supers-e-combos-v2.md §2: o maior nome, 20 caracteres, mede 164 px; sobra mais de 100 px para as duas teclas). Só aparece com
 * `Regras.ritmo.super` (quem chama decide). Devolve a altura usada (igual a uma caixa de combo, para somar com `alturaDosCombos`).
 */
export function desenharLinhaDoSuper(f: Ferramentas, nome: string, x: number, y: number, largura: number, esquema: EsquemaTeclas = 1): number {
  const altura = ALTURA_DA_CAIXA_DE_COMBO;
  f.panel(x, y, largura, altura, { r: 6, c0: 'rgba(48,10,40,.9)', c1: 'rgba(20,4,18,.9)', stroke: COR_DO_SUPER, lw: 1 });
  f.T(`SUPER · ${nome}`, x + 10, y + 13, 15, COR_DO_SUPER, 'left');
  f.T('barra cheia', x + 10, y + 27, 10, '#cfd6f5', 'left', { shadow: false });
  const rotulos = TECLAS_DO_SUPER.map((t) => rotuloDaTecla(t, 'teclado', esquema));
  const total = rotulos.length * TECLA + Math.max(0, rotulos.length - 1) * 10;
  let tx = x + largura - 10 - total;
  rotulos.forEach((r, j) => {
    f.keycap(r, tx, y + 4, TECLA, TECLA, true);
    tx += TECLA;
    if (j < rotulos.length - 1) {
      f.T('+', tx + 5, y + 4 + TECLA / 2, 11, '#fff', 'center');
      tx += 10;
    }
  });
  const toque = TECLAS_DO_SUPER.map((t) => rotuloDaTecla(t, 'toque', esquema)).join(' + ');
  f.T(`TOQUE: ${toque}`, x + 10, y + 39, 10, '#7fe3ff', 'left', { shadow: false });
  return altura;
}
