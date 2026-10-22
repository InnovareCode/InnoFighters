import { IDS_LUTADORES } from '../../core/contratos';
import { lerAcorde, lerMelodia, lerPerc, padroesEmLista, semitonsDoGrau } from './notacao';
import type { Camada, Instrumento, PistaAcorde, PistaPerc, TabelaDeTemas, TemaDef } from './tipos';

/*
 * Validação dos temas no CARREGAMENTO (docs/spec-chefoes-progressivos-temas-e-dificuldade.md §3.2), como as falas da provocação e os sons: falha
 * ALTO e CEDO (lança e derruba o boot) em vez de calar ou desafinar um lutador no meio da luta. A tabela é `Record<IdLutador, ...>`: lutador sem
 * tema nem compila; aqui se confere também em tempo de execução (dado vindo de JSON, teste que remove uma chave) e todo o resto: notação, escala,
 * andamento, laço, instrumentos, fase 2. O orçamento de FONTES exige compilar a partitura e mora em src/audio/temas.ts (`data/` não importa `audio/`).
 */

export const LIMITES_MUSICA = {
  laco: [10, 21],
  bpm: [60, 300],
  passosPorCompasso: [4, 16],
  camadasPorInstrumento: 4,
  freq: [20, 12000],
  vol: [0.0001, 0.5],
  duracao: [0.02, 4],
  q: [0.1, 20],
  swing: [0.5, 0.75],
  andamentoFase2: [1.0001, 1.15],
  eventosDeTroca: 6,
  trocaQuando: [0, 1.5],
  abertura: [0, 4],
  /** Salto máximo (semitons) entre a última nota do lead e a primeira do laço seguinte: o laço fecha sem emenda. */
  emenda: 7,
} as const;

/** A valsa do ZENON (Ré frígio dominante): nenhum tema novo pode repetir a escala nem a tônica dela. */
export const VALSA_ZENON = { tonicaPc: 2, escala: [0, 1, 4, 5, 7, 8, 10] } as const;

const entre = (v: number, [a, b]: readonly [number, number] | readonly number[]): boolean => v >= (a as number) && v <= (b as number);

function validarCamada(onde: string, c: Camada, erros: string[]): void {
  const L = LIMITES_MUSICA;
  if (!entre(c.vol, L.vol)) erros.push(`${onde}: vol ${c.vol} fora de ${L.vol.join('-')}`);
  if (c.k === 'T') {
    if (c.f0 !== undefined && !entre(c.f0, L.freq)) erros.push(`${onde}: f0 ${c.f0} Hz fora de ${L.freq.join('-')}`);
    if (c.f1 !== undefined && !entre(c.f1, L.freq)) erros.push(`${onde}: f1 ${c.f1} Hz fora de ${L.freq.join('-')}`);
    if (c.f1 !== undefined && c.f0 === undefined) erros.push(`${onde}: f1 sem f0`);
    if (c.t === undefined && c.durNota === undefined) erros.push(`${onde}: sem duração (t ou durNota)`);
    if (c.t !== undefined && !entre(c.t, L.duracao)) erros.push(`${onde}: t ${c.t} fora de ${L.duracao.join('-')}`);
    if (c.durNota !== undefined && !(c.durNota > 0 && c.durNota <= 1.5)) erros.push(`${onde}: durNota ${c.durNota} fora de (0, 1,5]`);
    if (c.rel !== undefined && !(c.rel > 0 && c.rel <= 8)) erros.push(`${onde}: rel ${c.rel} fora de (0, 8]`);
    if (c.deslize !== undefined && !(c.deslize > 0 && c.deslize <= 5)) erros.push(`${onde}: deslize ${c.deslize} fora de (0, 5] st`);
    if (c.filtro) {
      if (c.filtro.rel ? !(c.filtro.f > 0 && c.filtro.f <= 16) : !entre(c.filtro.f, L.freq)) erros.push(`${onde}: filtro ${c.filtro.f} fora do limite`);
      if (c.filtro.Q !== undefined && !entre(c.filtro.Q, L.q)) erros.push(`${onde}: Q ${c.filtro.Q} fora de ${L.q.join('-')}`);
    }
  } else if (c.k === 'R') {
    if (!entre(c.f0, L.freq)) erros.push(`${onde}: f0 ${c.f0} Hz fora de ${L.freq.join('-')}`);
    if (c.f1 !== undefined && !entre(c.f1, L.freq)) erros.push(`${onde}: f1 ${c.f1} Hz fora de ${L.freq.join('-')}`);
    if (!entre(c.Q, L.q)) erros.push(`${onde}: Q ${c.Q} fora de ${L.q.join('-')}`);
    if (!entre(c.t, L.duracao)) erros.push(`${onde}: t ${c.t} fora de ${L.duracao.join('-')}`);
  } else {
    if (!(c.durNota > 0 && c.durNota <= 1.5)) erros.push(`${onde}: durNota ${c.durNota} fora de (0, 1,5]`);
    if (!entre(c.q, L.q)) erros.push(`${onde}: q ${c.q} fora de ${L.q.join('-')}`);
    for (const f of c.formantes) if (!entre(f, L.freq)) erros.push(`${onde}: formante ${f} Hz fora de ${L.freq.join('-')}`);
  }
}

function validarInstrumento(onde: string, inst: Instrumento, erros: string[], exigeFreqFixa = false): void {
  if (inst.length === 0 || inst.length > LIMITES_MUSICA.camadasPorInstrumento) erros.push(`${onde}: ${inst.length} camadas (1 a ${LIMITES_MUSICA.camadasPorInstrumento})`);
  inst.forEach((c, i) => {
    validarCamada(`${onde}[${i}]`, c, erros);
    if (exigeFreqFixa && ((c.k === 'T' && c.f0 === undefined) || c.k === 'V')) erros.push(`${onde}[${i}]: percussão precisa de f0 fixo (T) ou ser ruído (R)`);
  });
}

function validarPerc(onde: string, p: PistaPerc, passos: number, compassos: number, erros: string[]): void {
  validarInstrumento(`${onde}.instrumento`, p.instrumento, erros, true);
  const l = padroesEmLista(p.padroes);
  if (l.length === 0 || compassos % l.length !== 0) erros.push(`${onde}: ${l.length} padrões não dividem ${compassos} compassos`);
  l.forEach((t, i) => {
    try {
      lerPerc(t, passos);
    } catch (e) {
      erros.push(`${onde}.padroes[${i}]: ${(e as Error).message}`);
    }
  });
}

function validarPadroes(onde: string, p: string | readonly string[], compassos: number, ler: (t: string) => unknown, erros: string[]): void {
  const l = padroesEmLista(p);
  if (l.length === 0 || compassos % l.length !== 0) erros.push(`${onde}: ${l.length} padrões não dividem ${compassos} compassos`);
  l.forEach((t, i) => {
    try {
      ler(t);
    } catch (e) {
      erros.push(`${onde}[${i}]: ${(e as Error).message}`);
    }
  });
}

/** Duração do laço, em s. */
export const duracaoDoLacoS = (t: TemaDef): number => (t.compassos * t.compasso.passos * 60) / (t.bpm * t.compasso.passosPorPulso);

export function validarTema(id: string, t: TemaDef): string[] {
  const erros: string[] = [];
  const L = LIMITES_MUSICA;
  const e = (m: string): void => void erros.push(`${id}: ${m}`);
  const n = t.escala.length;
  // escala e tônica
  if (n < 5 || n > 7) e(`escala com ${n} notas (5 a 7)`);
  if (t.escala[0] !== 0) e('a escala começa na tônica (0)');
  t.escala.forEach((s, i) => {
    if (!Number.isInteger(s) || s < 0 || s > 11) e(`semitom ${s} fora de 0-11`);
    if (i > 0 && s <= (t.escala[i - 1] as number)) e('a escala precisa ser crescente');
  });
  if (!Number.isInteger(t.tonica) || t.tonica < 36 || t.tonica > 84) e(`tônica MIDI ${t.tonica} fora de 36-84`);
  // compasso, andamento e laço
  const P = t.compasso.passos;
  if (!Number.isInteger(P) || !entre(P, L.passosPorCompasso)) e(`${P} passos por compasso (4 a 16)`);
  if (!Number.isInteger(t.compasso.passosPorPulso) || t.compasso.passosPorPulso < 1) e('passosPorPulso inválido');
  if (t.compasso.pulsos.length === 0 || t.compasso.pulsos.some((v) => !(v > 0))) e('pulsos inválidos');
  if (!entre(t.bpm, L.bpm)) e(`bpm ${t.bpm} fora de ${L.bpm.join('-')}`);
  if (t.compassos !== 8 && t.compassos !== 16) e(`${t.compassos} compassos (8 ou 16)`);
  const laco = duracaoDoLacoS(t);
  if (!entre(laco, L.laco)) e(`laço de ${laco.toFixed(2)} s fora de ${L.laco.join('-')} s`);
  if (t.swing !== undefined) {
    if (!entre(t.swing, L.swing)) e(`swing ${t.swing} fora de ${L.swing.join('-')}`);
    if (t.compasso.passosPorPulso !== 2) e('swing só com 2 passos por pulso (colcheias)');
  }
  const ab = t.abertura ?? 2;
  if (!Number.isInteger(ab) || !entre(ab, L.abertura)) e(`abertura ${ab} fora de ${L.abertura.join('-')}`);
  if (!(t.volume > 0 && t.volume <= 4)) e(`volume ${t.volume} fora de (0, 4]`);
  for (const [pista, g] of Object.entries(t.mix ?? {})) if (!(typeof g === 'number' && g >= 0.1 && g <= 4)) e(`mix.${pista} ${g} fora de 0,1-4`);
  // harmonia
  if (t.harmonia.length === 0 || t.compassos % t.harmonia.length !== 0) e(`harmonia com ${t.harmonia.length} raízes não divide ${t.compassos} compassos`);
  for (const g of t.harmonia) if (!Number.isInteger(g) || g < 0 || g >= n) e(`raiz ${g} fora da escala (0-${n - 1})`);
  // lead
  validarInstrumento(`${id}.lead.instrumento`, t.lead.instrumento, erros);
  if (t.lead.impar?.instrumento) validarInstrumento(`${id}.lead.impar.instrumento`, t.lead.impar.instrumento, erros);
  if (t.lead.paralela) validarInstrumento(`${id}.lead.paralela.instrumento`, t.lead.paralela.instrumento, erros);
  if (t.lead.forma.length !== t.compassos) e(`forma com ${t.lead.forma.length} compassos, o tema tem ${t.compassos}`);
  const lidos = new Map<string, ReturnType<typeof lerMelodia>>();
  for (const [nome, texto] of Object.entries(t.lead.compassos)) {
    try {
      lidos.set(nome, lerMelodia(texto, P, n));
    } catch (err) {
      e(`compasso '${nome}' do lead: ${(err as Error).message}`);
    }
  }
  for (const nome of t.lead.forma) if (!(nome in t.lead.compassos)) e(`a forma usa o compasso '${nome}' que não existe`);
  for (const nome of Object.keys(t.lead.compassos)) if (!t.lead.forma.includes(nome)) e(`o compasso '${nome}' não entra na forma`);
  for (const [nome, notas] of lidos) {
    for (const nota of notas) if (nota.grau < -n || nota.grau >= 2 * n) e(`compasso '${nome}': grau ${nota.grau} muito longe da tônica`);
  }
  // emenda do laço: última nota do lead -> primeira nota do laço seguinte
  const seq = t.lead.forma.flatMap((nome) => lidos.get(nome) ?? []);
  const primeira = seq[0];
  const ultima = seq[seq.length - 1];
  if (primeira && ultima) {
    const salto = Math.abs(semitonsDoGrau(t.escala, ultima.grau) - semitonsDoGrau(t.escala, primeira.grau));
    if (salto > L.emenda) e(`o laço não fecha sem emenda: salto de ${salto} st entre a última e a primeira nota do lead (máx. ${L.emenda})`);
  } else e('o lead não tem nota');
  // baixo, acorde, percussão
  validarInstrumento(`${id}.baixo.instrumento`, t.baixo.instrumento, erros);
  validarPadroes(`${id}.baixo.padroes`, t.baixo.padroes, t.compassos, (x) => lerMelodia(x, P, n), erros);
  if (t.acorde) {
    const a: PistaAcorde = t.acorde;
    validarInstrumento(`${id}.acorde.instrumento`, a.instrumento, erros);
    validarPadroes(`${id}.acorde.padroes`, a.padroes, t.compassos, (x) => lerAcorde(x, P), erros);
    if (a.voicing.length === 0 && !a.semitons?.length) e('acorde sem voicing nem semitons');
    for (const g of a.voicing) if (!Number.isInteger(g) || g < 0 || g > 2 * n) e(`voicing ${g} fora de 0-${2 * n}`);
  }
  if (t.perc.length === 0) e('sem percussão');
  t.perc.forEach((p, i) => validarPerc(`${id}.perc[${i}]`, p, P, t.compassos, erros));
  // fase 2
  const f = t.fase2;
  if (!entre(f.andamento, L.andamentoFase2)) e(`andamento da fase 2 ${f.andamento} fora de ${L.andamentoFase2.join('-')}`);
  for (const [pista, g] of Object.entries(f.mix ?? {})) if (!(typeof g === 'number' && g >= 0.05 && g <= 4)) e(`fase2.mix.${pista} ${g} fora de 0,05-4`);
  if (!Number.isInteger(f.baixoOitava) || f.baixoOitava > 0 || f.baixoOitava < -2) e('baixoOitava da fase 2 deve ser 0, -1 ou -2');
  if (f.perc.length === 0) e('a fase 2 precisa de percussão extra (bumbo em todos os tempos)');
  f.perc.forEach((p, i) => validarPerc(`${id}.fase2.perc[${i}]`, p, P, t.compassos, erros));
  validarInstrumento(`${id}.fase2.contracanto.instrumento`, f.contracanto.instrumento, erros);
  if (!Number.isInteger(f.contracanto.atraso) || f.contracanto.atraso < 0 || f.contracanto.atraso > P) e(`atraso do contracanto ${f.contracanto.atraso} fora de 0-${P}`);
  if (!Number.isInteger(f.contracanto.graus) || Math.abs(f.contracanto.graus) > 4) e('graus do contracanto fora de -4..4');
  if (f.troca.length === 0 || f.troca.length > L.eventosDeTroca) e(`${f.troca.length} eventos de troca (1 a ${L.eventosDeTroca})`);
  f.troca.forEach((c, i) => {
    validarCamada(`${id}.fase2.troca[${i}]`, c, erros);
    if (!entre(c.quando, L.trocaQuando)) e(`troca[${i}]: quando ${c.quando} fora de ${L.trocaQuando.join('-')}`);
    if (c.k === 'V') e(`troca[${i}]: voz não entra no trecho de troca`);
    if (c.k === 'T' && c.f0 === undefined && c.semi === undefined) e(`troca[${i}]: tom sem f0 nem semi`);
    if (c.k === 'T' && c.t === undefined) e(`troca[${i}]: tom sem t`);
  });
  return erros;
}

/** Todos os erros da tabela: lutador sem tema, ZENON diferente de 'chefe', tema inválido, escalas ou tônicas repetidas. */
export function validarTemas(tabela: TabelaDeTemas): string[] {
  const erros: string[] = [];
  const t = tabela as Readonly<Record<string, TemaDef | 'chefe' | undefined>>;
  for (const id of IDS_LUTADORES) if (t[id] === undefined) erros.push(`${id}: lutador sem tema musical`);
  for (const id of Object.keys(t)) if (!(IDS_LUTADORES as readonly string[]).includes(id)) erros.push(`${id}: não é um lutador`);
  if (t['zenon'] !== 'chefe') erros.push("zenon: o tema do ZENON é a valsa de hoje ('chefe')");
  const temas: [string, TemaDef][] = [];
  for (const [id, v] of Object.entries(t)) {
    if (v === undefined) continue;
    if (v === 'chefe') {
      if (id !== 'zenon') erros.push(`${id}: só o ZENON usa a valsa ('chefe')`);
      continue;
    }
    temas.push([id, v]);
    erros.push(...validarTema(id, v));
  }
  // distintos por construção: as escalas (como conjuntos) e as tônicas (classe de altura), inclusive contra a valsa
  const chave = (escala: readonly number[]): string => escala.join(',');
  const escalas = new Map<string, string>([[chave(VALSA_ZENON.escala), 'zenon']]);
  const tonicas = new Map<number, string>([[VALSA_ZENON.tonicaPc, 'zenon']]);
  for (const [id, v] of temas) {
    const ke = chave(v.escala);
    const a = escalas.get(ke);
    if (a) erros.push(`${id}: a escala {${ke}} é a mesma de ${a}`);
    else escalas.set(ke, id);
    const pc = ((v.tonica % 12) + 12) % 12;
    const b = tonicas.get(pc);
    if (b) erros.push(`${id}: a tônica (classe ${pc}) é a mesma de ${b}`);
    else tonicas.set(pc, id);
  }
  return erros;
}

export function exigirTemasValidos(tabela: TabelaDeTemas): void {
  const erros = validarTemas(tabela);
  if (erros.length) throw new Error(`temas musicais inválidos:\n  ${erros.join('\n  ')}`);
}
