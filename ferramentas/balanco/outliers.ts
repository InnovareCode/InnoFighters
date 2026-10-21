import type { Agregado } from './agregado';
import type { MedidaGolpe } from './frame-data';

/*
 * Sinalização automática (docs/mecanicas-e3.md 6.3): o harness MARCA, quem decide é a Íris com o Atlas (e o dono, no chefão).
 * As propostas de ajuste NÃO saem daqui: ficam no handoff, escritas por quem leu os números.
 */

/** Faixas de meta. `alerta` é a regra da E6a (35-65); `atencao` é a meta do docs (42-58). */
export const METAS = {
  taxaAlerta: [0.35, 0.65],
  taxaAtencao: [0.42, 0.58],
  /** Limite inferior de Wilson de um par acima disso = o par é desequilibrado (docs 6.3). */
  parWilson: 0.65,
  tempoEsgotado: 0.1,
  chefeJogador: [0.2, 0.4],
  chefeTrivial: 0.7,
  chefeImpossivel: 0.05,
  mashiNivel2: 0.3,
  paradeSucesso: 0.25,
  resorteAcimaDoMinimo: 0.5,
  /** Golpe usado pelo menos isto de vezes e que quase nunca conecta. */
  usosMinimos: 30,
  conexaoBaixa: 0.05,
} as const;

export type Severidade = 'alerta' | 'atencao' | 'info';

export type Achado = {
  severidade: Severidade;
  categoria: 'taxa-geral' | 'par' | 'tempo' | 'travou' | 'chefao' | 'mecanica' | 'sem-alcance' | 'nunca-acerta';
  alvo: string;
  texto: string;
};

const p1 = (x: number): string => `${(x * 100).toFixed(1)}%`;

export function acharOutliers(agr: Agregado, frame: readonly MedidaGolpe[]): Achado[] {
  const r: Achado[] = [];
  const ids = Object.keys(agr.porLutador);

  for (const id of ids) {
    const l = agr.porLutador[id];
    if (!l) continue;
    const t = l.geral.taxa;
    if (t < METAS.taxaAlerta[0] || t > METAS.taxaAlerta[1]) {
      r.push({ severidade: 'alerta', categoria: 'taxa-geral', alvo: id, texto: `taxa de vitória ${p1(t)} (IC95 ${p1(l.geral.lo)}-${p1(l.geral.hi)}), fora de 35-65%` });
    } else if (t < METAS.taxaAtencao[0] || t > METAS.taxaAtencao[1]) {
      r.push({ severidade: 'atencao', categoria: 'taxa-geral', alvo: id, texto: `taxa de vitória ${p1(t)}, fora da meta 42-58%` });
    }
    if (l.lutasPorTempo > METAS.tempoEsgotado) {
      r.push({ severidade: 'atencao', categoria: 'tempo', alvo: id, texto: `${p1(l.lutasPorTempo)} das lutas acabam por tempo (meta < 10%)` });
    }
    if (l.travadas > 0) r.push({ severidade: 'alerta', categoria: 'travou', alvo: id, texto: `${l.travadas} luta(s) passaram do teto de 6 minutos` });
  }

  for (const a of ids) {
    for (const b of ids) {
      if (a === b) continue;
      const c = agr.matriz[a]?.[b];
      if (c && c.lo > METAS.parWilson) {
        r.push({ severidade: 'alerta', categoria: 'par', alvo: `${a} x ${b}`, texto: `${a} vence ${p1(c.taxa)} (n=${c.n}, limite inferior de Wilson ${p1(c.lo)} > 65%)` });
      }
    }
  }

  if (agr.total.travadas > 0) r.push({ severidade: 'alerta', categoria: 'travou', alvo: 'geral', texto: `${agr.total.travadas} luta(s) travadas no total` });
  if (agr.total.lutasPorTempo > METAS.tempoEsgotado) {
    r.push({ severidade: 'atencao', categoria: 'tempo', alvo: 'geral', texto: `${p1(agr.total.lutasPorTempo)} das lutas terminam por tempo (meta < 10%)` });
  }

  for (const nivel of new Set(agr.chefe.map((c) => c.nivel))) {
    const linhas = agr.chefe.filter((c) => c.nivel === nivel);
    const n = linhas.reduce((s, c) => s + c.jogador.n, 0);
    const k = linhas.reduce((s, c) => s + c.jogador.k, 0);
    const t = n ? k / n : 0;
    const rotulo = nivel === 1 ? 'NORMAL' : nivel === 2 ? 'DIFÍCIL' : `nível ${nivel}`;
    if (t > METAS.chefeTrivial) r.push({ severidade: 'alerta', categoria: 'chefao', alvo: `chefão ${rotulo}`, texto: `TRIVIAL: o jogador vence ${p1(t)} (n=${n})` });
    else if (t < METAS.chefeImpossivel) r.push({ severidade: 'alerta', categoria: 'chefao', alvo: `chefão ${rotulo}`, texto: `IMPOSSÍVEL: o jogador vence ${p1(t)} (n=${n})` });
    else if (t < METAS.chefeJogador[0] || t > METAS.chefeJogador[1]) {
      r.push({ severidade: 'atencao', categoria: 'chefao', alvo: `chefão ${rotulo}`, texto: `o jogador vence ${p1(t)} (n=${n}), fora da meta 20-40% (só vale para NORMAL)` });
    }
    for (const c of linhas) {
      if (c.jogador.taxa === 0 && c.jogador.n >= 10) r.push({ severidade: 'info', categoria: 'chefao', alvo: `${c.desafiante} x chefão ${rotulo}`, texto: 'nunca vence o chefão' });
      if (c.jogador.taxa >= 0.9 && c.jogador.n >= 10) r.push({ severidade: 'info', categoria: 'chefao', alvo: `${c.desafiante} x chefão ${rotulo}`, texto: `vence ${p1(c.jogador.taxa)} do chefão` });
    }
  }

  const m = agr.mecanicas;
  if (m.aminu.seguraram + m.aminu.usosMashi > 0 && m.aminu.pctNivel2OuMais < METAS.mashiNivel2) {
    r.push({ severidade: 'atencao', categoria: 'mecanica', alvo: 'AMINU MASHI', texto: `só ${p1(m.aminu.pctNivel2OuMais)} das cargas da CPU chegam ao nível 2+ (meta ≥ 30%): dica de CPU` });
  }
  if (m.camille.usosParade > 0 && m.camille.sucesso < METAS.paradeSucesso) {
    r.push({ severidade: 'atencao', categoria: 'mecanica', alvo: 'CAMILLE PARADE', texto: `${p1(m.camille.sucesso)} dos usos aparam algo (meta ≥ 25%): dica de CPU` });
  }
  if (m.centella.acertos > 0 && m.centella.pctAcimaDoMinimo < METAS.resorteAcimaDoMinimo) {
    r.push({ severidade: 'atencao', categoria: 'mecanica', alvo: 'CENTELLA RESORTE', texto: `${p1(m.centella.pctAcimaDoMinimo)} dos acertos têm momento ≥ 10% (meta ≥ 50%): dica de CPU` });
  }

  for (const f of frame) {
    if (f.alcance === null) continue; // golpe de efeito sem acerto
    const nome = `${f.lutador}${f.ficha ? `/${f.ficha}` : ''} ${f.golpe}${f.variante ? ` (${f.variante})` : ''}`;
    if (f.alcance.min === null) {
      r.push({ severidade: 'alerta', categoria: 'sem-alcance', alvo: nome, texto: 'não conecta em NENHUMA distância de 78 a 780 px' });
    } else if ((f.alcance.max as number) <= 80) {
      r.push({ severidade: 'alerta', categoria: 'sem-alcance', alvo: nome, texto: `só conecta encostado (alcance máximo ${f.alcance.max} px, o mínimo entre corpos é 78)` });
    }
  }

  for (const id of ids) {
    const lista = agr.golpes[id] ?? {};
    for (const [chave, [usos, acertos, blocos]] of Object.entries(lista)) {
      if (usos < METAS.usosMinimos || chave === 'parado') continue;
      const tipoSemAcerto = chave.endsWith('sDown') && id === 'nila'; // VADIVU: troca de postura, não acerta por desenho
      const parade = id === 'camille' && chave === 'sFire';
      if (tipoSemAcerto || parade) continue;
      const contatos = acertos + blocos;
      if (contatos === 0) {
        r.push({ severidade: 'alerta', categoria: 'nunca-acerta', alvo: `${id} ${chave}`, texto: `usado ${usos}x pela CPU e NUNCA tocou o rival` });
      } else if (contatos / usos < METAS.conexaoBaixa) {
        r.push({ severidade: 'atencao', categoria: 'nunca-acerta', alvo: `${id} ${chave}`, texto: `usado ${usos}x e só ${contatos} contato(s) (${p1(contatos / usos)})` });
      }
    }
  }
  return r;
}
