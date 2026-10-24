import type { Registro } from './simulacao';

/*
 * Portões do §4.5 da spec do motor v2 (docs/spec-revisao-motor-luta-v2.md), medidos sobre os registros do harness. Só LÊ `Registro.medidas` (que não entra no hash).
 * Cada medida sai por nível da CPU, só nas lutas REGULARES (os chefões têm a régua própria da rampa).
 *
 *  - duração: ticks de jogo por round (queda máxima de 20% contra a referência sem motor v2);
 *  - fatia do dano que vem de especial: no máximo +10 pontos percentuais sobre a referência e entre 25% e 40% em valor absoluto;
 *  - tempo parado (estimado): (especiais x 48 + soma da duração dos roteiros de filme) / ticks de jogo <= 15%.
 *
 * Os dois primeiros comparam com a referência (`referencia`, lida do `portoes-v2.json` da rodada sem motor v2); sem ela, só valem os limites absolutos.
 */

export type MedidaDoNivel = {
  nivel: number;
  lutas: number;
  ticksPorRound: number;
  fatiaEspecial: number;
  paradoFracao: number;
  especiaisPorLuta: number;
  filmesPorLuta: number;
};

export type PortoesV2 = { medidas: MedidaDoNivel[] };

export type VeredictoDoNivel = {
  nivel: number;
  agora: MedidaDoNivel;
  antes: MedidaDoNivel | null;
  duracao: { ok: boolean; variacao: number | null };
  fatia: { ok: boolean; deltaPontos: number | null; absolutoOk: boolean };
  parado: { ok: boolean };
};

const soma = (xs: readonly number[]): number => xs.reduce((s, x) => s + x, 0);

export function medirPortoes(registros: readonly Registro[]): PortoesV2 {
  const niveis = [...new Set(registros.filter((r) => r.tipo === 'regular').map((r) => r.nivel))].sort();
  const medidas: MedidaDoNivel[] = [];
  for (const nivel of niveis) {
    const rs = registros.filter((r) => r.tipo === 'regular' && r.nivel === nivel && r.medidas && !r.travou);
    if (!rs.length) continue;
    const ticks = soma(rs.map((r) => r.ticks));
    const rounds = soma(rs.map((r) => r.rounds));
    const dano = soma(rs.map((r) => r.dano[0] + r.dano[1]));
    const danoEsp = soma(rs.map((r) => (r.medidas as NonNullable<Registro['medidas']>).danoEspecial[0] + (r.medidas as NonNullable<Registro['medidas']>).danoEspecial[1]));
    const parado = soma(rs.map((r) => (r.medidas as NonNullable<Registro['medidas']>).paradoTicks));
    const esp = soma(rs.map((r) => (r.medidas as NonNullable<Registro['medidas']>).especiais[0] + (r.medidas as NonNullable<Registro['medidas']>).especiais[1]));
    const fil = soma(rs.map((r) => (r.medidas as NonNullable<Registro['medidas']>).filmes[0] + (r.medidas as NonNullable<Registro['medidas']>).filmes[1]));
    medidas.push({
      nivel,
      lutas: rs.length,
      ticksPorRound: rounds ? ticks / rounds : 0,
      fatiaEspecial: dano ? danoEsp / dano : 0,
      paradoFracao: ticks ? parado / ticks : 0,
      especiaisPorLuta: esp / rs.length,
      filmesPorLuta: fil / rs.length,
    });
  }
  return { medidas };
}

/** Confronta com a referência (sem motor v2). `antes` ausente = só os limites absolutos. */
export function veredictoDosPortoes(agora: PortoesV2, antes: PortoesV2 | null): VeredictoDoNivel[] {
  return agora.medidas.map((m) => {
    const ref = antes?.medidas.find((x) => x.nivel === m.nivel) ?? null;
    const variacao = ref && ref.ticksPorRound > 0 ? m.ticksPorRound / ref.ticksPorRound - 1 : null;
    const delta = ref ? (m.fatiaEspecial - ref.fatiaEspecial) * 100 : null;
    const absolutoOk = m.fatiaEspecial >= 0.25 && m.fatiaEspecial <= 0.4;
    return {
      nivel: m.nivel,
      agora: m,
      antes: ref,
      duracao: { ok: variacao === null || variacao >= -0.2, variacao },
      fatia: { ok: absolutoOk && (delta === null || delta <= 10), deltaPontos: delta, absolutoOk },
      parado: { ok: m.paradoFracao <= 0.15 },
    };
  });
}

const pc = (x: number, casas = 1): string => `${(x * 100).toFixed(casas)}%`;

export function portoesV2Md(vs: readonly VeredictoDoNivel[], cab: { geradoEm: string; versaoDados: string }): string {
  const o: string[] = ['# Portões do §4.5 (motor v2)', ''];
  o.push(`Gerado em ${cab.geradoEm} · versão dos dados/motor \`${cab.versaoDados}\`. Lutas regulares, CPU x CPU. Aproximação, não a taxa de uma pessoa.`, '');
  o.push('| Nível | Lutas | Ticks/round | Variação | Fatia do dano de especial | Δ pontos | Tempo parado | Especiais/luta | Filmes/luta |', '|---|---:|---:|---:|---:|---:|---:|---:|---:|');
  for (const v of vs) {
    const m = v.agora;
    o.push(
      `| ${m.nivel === 1 ? 'NORMAL' : 'DIFÍCIL'} | ${m.lutas} | ${m.ticksPorRound.toFixed(0)} | ${v.duracao.variacao === null ? '–' : pc(v.duracao.variacao)} ${v.duracao.ok ? '✓' : '✗'} | ${pc(m.fatiaEspecial)} ${v.fatia.ok ? '✓' : '✗'} | ${v.fatia.deltaPontos === null ? '–' : v.fatia.deltaPontos.toFixed(1)} | ${pc(m.paradoFracao)} ${v.parado.ok ? '✓' : '✗'} | ${m.especiaisPorLuta.toFixed(1)} | ${m.filmesPorLuta.toFixed(1)} |`,
    );
  }
  o.push('', 'Limites: duração com queda de no máximo 20% contra a referência; fatia do dano de especial entre 25% e 40% e no máximo +10 pontos sobre a referência; tempo parado (especiais x 48 + roteiros dos filmes) até 15% dos ticks de jogo.', '');
  return o.join('\n');
}
