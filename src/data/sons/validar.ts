import { IDS_LUTADORES } from '../../core/contratos';
import { todasAsApresentacoes } from '../apresentacao-especiais';
import { LUTADORES } from '../lutadores';
import type { AssinaturaEspecial, Chamada, DadosSons, Grito } from './tipos';

/*
 * Validação dos dados de sons no CARREGAMENTO (docs/spec-sons-por-lutador.md §5.3), como as falas da provocação: falha ALTO e CEDO (lança e derruba
 * o boot) em vez de calar um lutador no meio da luta. O orçamento de FONTES por plano mora em src/audio/orcamento-sonoro.ts
 * (`validarOrcamentoDosSons`), porque contar fontes exige sintetizar o grito e `data/` não importa `audio/`.
 */

export const LIMITES = {
  f0: [80, 450],
  k: [0.8, 1.25],
  q: [3, 12],
  gritoEspecial: 0.6,
  ko: 1.2,
  vitoria: 1.0,
  gritoComum: 0.6,
  freq: [20, 12000],
  volEfeito: 1.0,
  quando: 0.6,
  chamadasPorMomento: 8,
} as const;

export interface OpcoesValidacao {
  /** S3 liga isto: o conjunto de chaves tem de ser IGUAL aos 33 especiais; antes, só proíbe chave órfã. */
  readonly exigirAssinaturasCompletas?: boolean;
  /** S2 liga isto: todo perfil precisa ter os gritos. */
  readonly exigirGritos?: boolean;
}

/** `<id>.<ficha|base>.<golpe>` de cada especial que existe nos dados dos lutadores (os 33 da tabela de apresentação). */
export function chavesDosEspeciais(): string[] {
  return todasAsApresentacoes().map((c) => `${c.id}.${c.ficha ?? 'base'}.${c.golpe}`);
}

type DefGolpe = { proj?: { style?: string } } | undefined;
type DefLutador = { especiais?: Record<string, DefGolpe>; fichas?: Record<string, { especiais?: Record<string, DefGolpe> }> };

function golpeDoLutador(id: string, ficha: string, golpe: string): DefGolpe {
  const def = (LUTADORES as unknown as Record<string, DefLutador>)[id];
  if (!def) return undefined;
  if (ficha !== 'base') {
    const g = def.fichas?.[ficha]?.especiais?.[golpe];
    if (g) return g;
  }
  return def.especiais?.[golpe];
}

function checarChamadas(onde: string, cs: readonly Chamada[] | undefined, erros: string[]): void {
  if (!cs) return;
  if (cs.length > LIMITES.chamadasPorMomento) erros.push(`${onde}: ${cs.length} chamadas (máx. ${LIMITES.chamadasPorMomento})`);
  for (const c of cs) {
    const fs = c.k === 'T' ? [c.f0, ...(c.f1 === undefined ? [] : [c.f1]), ...(c.filtro ? [c.filtro.f] : [])] : [c.f0, ...(c.f1 === undefined ? [] : [c.f1])];
    for (const f of fs) if (!(f >= LIMITES.freq[0] && f <= LIMITES.freq[1])) erros.push(`${onde}: frequência ${f} Hz fora de ${LIMITES.freq[0]}-${LIMITES.freq[1]}`);
    if (!(c.vol > 0 && c.vol <= LIMITES.volEfeito)) erros.push(`${onde}: vol ${c.vol} fora de (0, ${LIMITES.volEfeito}]`);
    if (!(c.t > 0)) erros.push(`${onde}: duração ${c.t} inválida`);
    if ((c.quando ?? 0) > LIMITES.quando || (c.quando ?? 0) < 0) erros.push(`${onde}: quando ${c.quando} fora de [0, ${LIMITES.quando}]`);
  }
}

/** Duração de um grito sem importar de audio/ (a mesma conta de `duracaoDoGrito`). */
function duracao(g: Grito): number {
  const pausa = g.pausa ?? 0.02;
  return g.silabas.reduce((s, sil) => s + sil.t + (sil.fim === 'm' || sil.fim === 'n' ? 0.08 : 0), 0) + pausa * Math.max(0, g.silabas.length - 1);
}

function checarGrito(onde: string, g: Grito | null | undefined, max: number, erros: string[]): void {
  if (!g) return;
  if (g.silabas.length === 0) erros.push(`${onde}: grito sem sílabas`);
  const d = duracao(g);
  if (d > max + 1e-9) erros.push(`${onde}: grito de ${d.toFixed(2)} s (máx. ${max} s)`);
  if ((g.vol ?? 1) > 1.5) erros.push(`${onde}: vol de voz ${g.vol} > 1,5`);
  for (const s of g.silabas) if (!(s.t > 0.03)) erros.push(`${onde}: sílaba de ${s.t} s é curta demais`);
}

/** Devolve a lista de problemas (vazia = válido). */
export function validarSons(dados: DadosSons, op: OpcoesValidacao = {}): string[] {
  const erros: string[] = [];
  // 1. todo lutador tem perfil + 5. limites do perfil
  for (const id of IDS_LUTADORES) {
    const p = dados.perfis[id];
    if (!p) {
      erros.push(`sons: ${id} sem perfil vocal`);
      continue;
    }
    if (!(p.f0 >= LIMITES.f0[0] && p.f0 <= LIMITES.f0[1])) erros.push(`${id}: f0 ${p.f0} fora de ${LIMITES.f0[0]}-${LIMITES.f0[1]} Hz`);
    if (!(p.k >= LIMITES.k[0] && p.k <= LIMITES.k[1])) erros.push(`${id}: k ${p.k} fora de ${LIMITES.k[0]}-${LIMITES.k[1]}`);
    if (!(p.q >= LIMITES.q[0] && p.q <= LIMITES.q[1])) erros.push(`${id}: q ${p.q} fora de ${LIMITES.q[0]}-${LIMITES.q[1]}`);
    const g = p.gritos;
    if (op.exigirGritos && !g) erros.push(`${id}: perfil sem gritos`);
    if (g) {
      checarGrito(`${id}.kiai`, g.kiai, LIMITES.gritoEspecial, erros);
      checarGrito(`${id}.vitoria`, g.vitoria, LIMITES.vitoria, erros);
      checarGrito(`${id}.ko`, g.ko, LIMITES.ko, erros);
      g.leve.forEach((x, i) => checarGrito(`${id}.leve${i}`, x, LIMITES.gritoComum, erros));
      g.pesado.forEach((x, i) => checarGrito(`${id}.pesado${i}`, x, LIMITES.gritoComum, erros));
      checarGrito(`${id}.guarda`, g.guarda, LIMITES.gritoComum, erros);
      checarGrito(`${id}.esforco`, g.esforco, LIMITES.gritoComum, erros);
      if (g.leve.length === 0 || g.pesado.length === 0) erros.push(`${id}: precisa de ao menos 1 grito leve e 1 pesado`);
    }
    for (const [k, v] of Object.entries(p.troca ?? {})) checarChamadas(`${id}.troca.${k}`, v, erros);
  }
  for (const [chave, p] of Object.entries(dados.perfisPorFicha)) {
    const [id] = chave.split('.');
    if (!(IDS_LUTADORES as readonly string[]).includes(id ?? '')) erros.push(`perfisPorFicha: lutador desconhecido em '${chave}'`);
    if (p.f0 !== undefined && !(p.f0 >= LIMITES.f0[0] && p.f0 <= LIMITES.f0[1])) erros.push(`${chave}: f0 ${p.f0} fora de ${LIMITES.f0[0]}-${LIMITES.f0[1]} Hz`);
  }
  // 2. chaves das assinaturas x especiais dos dados
  const reais = new Set(chavesDosEspeciais());
  const chaves = Object.keys(dados.assinaturas);
  for (const c of chaves) if (!reais.has(c)) erros.push(`assinaturas: chave órfã '${c}' (não é um especial dos dados)`);
  if (op.exigirAssinaturasCompletas) for (const c of reais) if (!(c in dados.assinaturas)) erros.push(`assinaturas: falta '${c}'`);
  // 3. projétil <-> lancamento, estilo conferido contra os dados
  for (const c of chaves) {
    const a: AssinaturaEspecial | undefined = dados.assinaturas[c];
    if (!a) continue;
    const [id, ficha, golpe] = c.split('.') as [string, string, string];
    const proj = golpeDoLutador(id, ficha, golpe)?.proj;
    if (proj && !a.lancamento) erros.push(`${c}: o golpe tem projétil e a assinatura não tem 'lancamento'`);
    if (!proj && a.lancamento) erros.push(`${c}: 'lancamento' em golpe sem projétil`);
    if (proj && a.lancamento && a.estilo !== proj.style) erros.push(`${c}: estilo '${a.estilo}' difere do 'proj.style' '${proj.style}' dos dados`);
    checarGrito(`${c}.grito`, a.grito, LIMITES.gritoEspecial, erros);
    checarGrito(`${c}.sucesso.grito`, a.sucesso?.grito, LIMITES.gritoEspecial, erros);
    checarGrito(`${c}.resposta.grito`, a.resposta?.grito, LIMITES.gritoEspecial, erros);
    checarChamadas(`${c}.conjuracao`, a.conjuracao, erros);
    checarChamadas(`${c}.lancamento`, a.lancamento, erros);
    checarChamadas(`${c}.estampa`, a.estampa, erros);
    checarChamadas(`${c}.sucesso`, a.sucesso?.chamadas, erros);
    checarChamadas(`${c}.comDreno`, a.comDreno, erros);
    checarChamadas(`${c}.contraEspecial`, a.contraEspecial, erros);
    checarChamadas(`${c}.rebote`, a.rebote, erros);
    checarChamadas(`${c}.resposta.estampa`, a.resposta?.estampa, erros);
    a.carga?.forEach((cs, i) => checarChamadas(`${c}.carga${i + 1}`, cs, erros));
  }
  // 4. dois projéteis do mesmo lutador e ficha com o mesmo style tornariam o lançamento ambíguo (sai de id, ficha, style)
  for (const id of IDS_LUTADORES) {
    const def = LUTADORES[id] as unknown as DefLutador;
    const grupos: [string, Record<string, DefGolpe> | undefined][] = [['base', def.especiais]];
    for (const [f, d] of Object.entries(def.fichas ?? {})) grupos.push([f, d.especiais]);
    for (const [ficha, esp] of grupos) {
      const vistos = new Map<string, string>();
      for (const [golpe, g] of Object.entries(esp ?? {})) {
        const st = g?.proj?.style;
        if (!st) continue;
        const outro = vistos.get(st);
        if (outro) erros.push(`${id}.${ficha}: ${outro} e ${golpe} usam o mesmo style '${st}' (o lançamento ficaria ambíguo)`);
        vistos.set(st, golpe);
      }
    }
  }
  return erros;
}

export function exigirSonsValidos(dados: DadosSons, op: OpcoesValidacao = {}): void {
  const erros = validarSons(dados, op);
  if (erros.length) throw new Error(`dados de sons inválidos:\n - ${erros.join('\n - ')}`);
}
