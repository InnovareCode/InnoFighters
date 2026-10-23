import type { IdLutador } from '../../src/core/contratos';
import type { Agregado, Diferenca } from './agregado';
import { pct } from './estatistica';
import type { MedidaGolpe } from './frame-data';
import type { Achado } from './outliers';

/** Textos em Markdown dos dois relatórios. Funções puras: o CLI só decide onde gravar. */

const AVISO = '> Arquivo GERADO por `npm run balanco`. Não edite à mão: rode o comando de novo.';
const num = (x: number | null, casas = 0): string => (x === null || Number.isNaN(x) ? '–' : x.toFixed(casas));
const sinal = (x: number | null): string => (x === null ? '–' : x > 0 ? `+${x}` : String(x));

export type CabecalhoFrame = { geradoEm: string; versaoDados: string };

export function frameDataMd(linhas: readonly MedidaGolpe[], ids: readonly IdLutador[], cab: CabecalhoFrame): string {
  const o: string[] = [];
  o.push('# Frame data medida no motor', '', AVISO, '');
  o.push(`Gerado em ${cab.geradoEm} · versão dos dados/motor \`${cab.versaoDados}\` · arte de PRODUÇÃO (\`public/assets/lutadores\`).`, '');
  o.push('Como ler (todos os tempos em ticks de jogo, 60 por segundo; cada número foi medido numa `Game` em modo treino, não lido da tabela):', '');
  o.push(
    '- **Nominal S/A/R**: o que o dado declara. **Início/Ativos/Recup.**: o que o motor fez (início = ticks até a 1ª caixa de acerto válida; ativos = ticks com a caixa válida; recup. = do fim dos ativos até o atacante poder agir). Golpe aéreo: ativos vão até pousar. Projétil: início = tick do 1º tiro.',
    '- **Dano**: queda de vida de um boneco cheio no 1º contato (já com `pow`, sem escala de combo). **Hitstun**: ticks do boneco em `hit`. **KD**: o golpe derruba; a vantagem vira o tempo até o boneco levantar.',
    '- **Vant. acerto / bloq.**: (tick em que o defensor fica livre) − (tick em que o atacante fica livre), medida a 90 px (ou na menor distância em que o golpe conecta). Positivo = o atacante age primeiro.',
    '- **Nível**: o declarado → o medido contra `block` e `crouchblock` (`mid` bloqueia nos dois; `low` só agachado; `over` só em pé; `–` = não bloqueável). "alto" = erra o boneco agachado.',
    '- **Caixa**: alcance estático da caixa (`fx + w`, px a partir do x do atacante; sai da `ponta` do atlas). **Alcance medido**: distância entre os dois x em que o golpe conecta (varredura de 6 px, bordas a 1 px). O mínimo entre corpos é 78; o teto da varredura é 780 (`+`).',
    '',
  );
  // V2-3c: a coluna "Filme" só existe quando a medida foi feita com `motorV2.filmes` (`--filmes`); sem a flag o arquivo é o de sempre.
  const comFilme = linhas.some((l) => l.filme === true || l.filme === false);
  if (comFilme) {
    o.splice(o.length - 1, 0, '- **Filme** (medido com `--filmes`, V2-3c): ✓ = o 1º contato limpo do golpe abre o filme do especial (e o **Dano** passa a ser o do filme, §4.1 da spec v2); – = não abre (golpe comum, PARADE, VADIVU).');
  }
  for (const id of ids) {
    const doLutador = linhas.filter((l) => l.lutador === id);
    if (!doLutador.length) continue;
    o.push(`## ${id.toUpperCase()}`, '');
    const fichas = [...new Set(doLutador.map((l) => l.ficha))];
    for (const ficha of fichas) {
      const pow = doLutador.find((l) => l.ficha === ficha)?.nominal.pow;
      o.push(ficha === null && fichas.length === 1 ? `_pow ${pow}_` : `### ficha ${ficha ?? 'base'} _(pow ${pow})_`, '');
      o.push(`| Golpe | Nome | Nível | S/A/R nominal | Início/Ativ./Recup. | Dano |${comFilme ? ' Filme |' : ''} Hitstun | Vant. acerto | Blockstun | Vant. bloq. | Caixa | Alcance medido | Notas |`);
      o.push(`|---|---|---|---|---|---|${comFilme ? '---|' : ''}---|---|---|---|---|---|---|`);
      for (const l of doLutador.filter((x) => x.ficha === ficha)) {
        const lv = l.bloqueioMedido === null ? l.nominal.lvl : l.bloqueioMedido === 'nenhum' ? `${l.nominal.lvl}→–` : l.bloqueioMedido === l.nominal.lvl ? l.nominal.lvl : `${l.nominal.lvl}→**${l.bloqueioMedido}**`;
        const a = l.alcance;
        const alc = a === null ? '–' : a.min === null ? '**nunca**' : `${a.min}–${a.max}${a.noTeto ? '+' : ''}${a.furos ? '*' : ''}`;
        const dano = l.dano === null ? '–' : `${num(l.dano, 1)}${l.acertos && l.acertos > 1 ? ` (${l.acertos}x)` : ''}`;
        const va = l.derruba ? `KD ${sinal(l.vantagemAcerto)}` : sinal(l.vantagemAcerto);
        const notas = l.notas.filter((n) => !n.startsWith('nível medido') && !n.startsWith('erra o boneco agachado')).join('; ');
        const alto = l.notas.some((n) => n.startsWith('erra o boneco agachado')) ? ' (alto)' : '';
        o.push(
          [
            `${l.golpe}${l.variante ? ` (${l.variante})` : ''}`,
            l.nome ?? '',
            `${lv}${alto}`,
            `${l.nominal.S}/${l.nominal.A}/${l.nominal.R}`,
            l.inicio === null ? '–' : `${l.inicio}/${l.ativos}/${l.recuperacao ?? '–'}`,
            dano,
            ...(comFilme ? [l.filme === true ? '✓' : '–'] : []),
            num(l.hitstun),
            va,
            num(l.blockstun),
            sinal(l.vantagemBloqueio),
            l.caixa ? num(l.caixa.alcanceEstatico) : '–',
            alc,
            notas,
          ].join(' | ').replace(/^/, '| ').replace(/$/, ' |'),
        );
      }
      o.push('');
    }
  }
  o.push('`*` = a faixa de alcance tem furos na varredura de 6 px (o golpe não conecta em todas as distâncias entre o mínimo e o máximo).', '');
  return o.join('\n');
}

export type CabecalhoRes = {
  geradoEm: string;
  versaoDados: string;
  modo: string;
  hashRegistros: string;
  /** Hash só das lutas regulares / só das de chefe (a regular tem de ser idêntica antes e depois de mexer em chefão). */
  hashRegulares?: string;
  hashChefes?: string;
  segundos: number;
  processos: number;
  lutas: number;
};

export function resultadosMd(agr: Agregado, ids: readonly IdLutador[], achados: readonly Achado[], dif: Diferenca | null, cab: CabecalhoRes): string {
  const o: string[] = [];
  const p = agr.parametros;
  o.push('# Resultados do balanceamento (CPU x CPU)', '', AVISO, '');
  o.push('## Entradas desta rodada', '');
  o.push(`- Modo **${cab.modo}**: ${p.sementes} sementes por combinação, níveis da CPU ${p.niveis.map((n) => (n === 1 ? 'NORMAL' : n === 2 ? 'DIFÍCIL' : String(n))).join(' e ')}, semente-base ${p.base}${p.filtro ? `, filtro \`${p.filtro}\`` : ''}.`);
  o.push('- Partida: 2 rounds, 99 s, os DOIS lados de cada par (A como P1 e como P2), espelho fora; teto de 21 600 ticks por luta.');
  o.push(`- Total: ${cab.lutas} lutas (${agr.total.regulares} regulares + ${agr.total.chefe} contra os chefões), ${cab.segundos.toFixed(0)} s em ${cab.processos} processo(s).`);
  o.push(`- Versão dos dados/motor: \`${cab.versaoDados}\` (hash de \`src/data\`, \`src/fight\`, \`src/core\` e dos \`atlas.json\`). Gerado em ${cab.geradoEm}.`);
  o.push('- A CPU joga todos os lados: mecânicas de leitura (PARADE, postura da NILA) tendem a parecer mais fracas do que são nas mãos de uma pessoa.', '');

  o.push('## Determinismo (diferença entre rodadas)', '');
  o.push(`Hash do resultado desta rodada: \`${cab.hashRegistros}\`.`);
  if (cab.hashRegulares !== undefined) o.push(`Hash só das lutas regulares: \`${cab.hashRegulares}\` (tem de ser igual antes e depois de qualquer ajuste de chefão); só das lutas de chefe: \`${cab.hashChefes ?? '–'}\`.`);
  if (!dif) o.push('Não havia rodada anterior com os mesmos parâmetros neste diretório: esta passa a ser a referência.');
  else if (dif.igual) o.push(`**IDÊNTICA** à rodada anterior com os mesmos parâmetros (hash \`${dif.hashAntes}\`): mesma semente, mesmo código, mesmo resultado.`);
  else {
    o.push(
      dif.mesmaVersao
        ? `**DIFERENTE com a MESMA versão** (antes \`${dif.hashAntes}\`, agora \`${dif.hashAgora}\`, versão \`${dif.versaoAgora}\`): isto é NÃO DETERMINISMO, um bug do motor ou do harness.`
        : `**DIFERENTE** da rodada anterior (antes \`${dif.hashAntes}\`, agora \`${dif.hashAgora}\`), e a versão dos dados/motor/harness mudou (\`${dif.versaoAntes}\` -> \`${dif.versaoAgora}\`): diferença esperada.`,
      '',
    );
    o.push('| Lutador | Taxa antes | Taxa agora |', '|---|---|---|');
    for (const m of dif.mudancas) o.push(`| ${m.id} | ${Number.isNaN(m.antes) ? '–' : pct(m.antes)} | ${pct(m.agora)} |`);
  }
  o.push('');

  o.push('## Sinalizações (outliers)', '');
  if (!achados.length) o.push('Nenhuma.', '');
  else {
    o.push('| Severidade | Categoria | Alvo | O quê |', '|---|---|---|---|');
    const ordem = { alerta: 0, atencao: 1, info: 2 } as const;
    for (const a of [...achados].sort((x, y) => ordem[x.severidade] - ordem[y.severidade])) o.push(`| ${a.severidade.toUpperCase()} | ${a.categoria} | ${a.alvo} | ${a.texto} |`);
    o.push('');
  }

  o.push('## Taxa de vitória por lutador', '');
  o.push('Contra os outros 8, os dois lados e os níveis somados. IC = intervalo de Wilson 95%.', '');
  o.push('| Lutador | Lutas | Vitórias | Taxa | IC95 | Como P1 | Como P2 | NORMAL | DIFÍCIL | Duração média | Lutas por tempo | Dano/luta | Perfeitos |');
  o.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const id of ids) {
    const l = agr.porLutador[id];
    if (!l) continue;
    o.push(
      `| ${id} | ${l.lutas} | ${l.vitorias} | **${pct(l.geral.taxa)}** | ${pct(l.geral.lo, 0)}-${pct(l.geral.hi, 0)} | ${pct(l.comoP1.taxa)} | ${pct(l.comoP2.taxa)} | ${pct(l.porNivel['1']?.taxa ?? 0)} | ${pct(l.porNivel['2']?.taxa ?? 0)} | ${l.duracaoSeg.toFixed(0)} s | ${pct(l.lutasPorTempo)} | ${l.danoPorLuta.toFixed(0)} | ${l.perfeitos} |`,
    );
  }
  o.push('');
  o.push(`Vantagem de lado: o P1 vence ${pct(agr.lado.p1.taxa)} das lutas (n=${agr.lado.p1.n}). Duração média ${agr.total.duracaoSegMedia.toFixed(0)} s; ${pct(agr.total.lutasPorTempo)} das lutas decididas por TEMPO (${pct(agr.total.roundsPorTempo)} dos rounds); ${agr.total.empates} round(s) empatado(s); ${agr.total.travadas} luta(s) travada(s).`, '');

  o.push('## Matriz (linha vence coluna)', '');
  o.push('% de vitórias da LINHA contra a COLUNA somando os dois lados. `!` = limite inferior de Wilson > 65% (par desequilibrado).', '');
  o.push(`| | ${ids.join(' | ')} |`, `|---|${ids.map(() => '---').join('|')}|`);
  for (const a of ids) {
    const cels = ids.map((b) => {
      if (a === b) return '·';
      const c = agr.matriz[a]?.[b];
      return c ? `${(c.taxa * 100).toFixed(0)}${c.lo > 0.65 ? '!' : ''}` : '–';
    });
    o.push(`| **${a}** | ${cels.join(' | ')} |`);
  }
  o.push('');

  o.push('## Chefões (CPU do nível indicado nos dois lados; cada chefão contra o elenco que existe no ponto dele da progressão)', '');
  if (!agr.chefe.length) o.push('Não rodado nesta rodada.', '');
  else {
    o.push('"Jogador" = a CPU do desafiante como P1, no lugar de uma pessoa (uma APROXIMAÇÃO, não a taxa de uma pessoa). Round único, 2 barras; empate repete o round.', '');
    o.push('Metas: rampa aprovada pelo dono (AMINU ~26-30% no NORMAL descendo até ZENON ~15-19%; DIFÍCIL proporcionalmente menor, centro x 0,575 ± 3 pontos). Acompanham: KO >= 90%, duração <= 75 s (NORMAL) / 90 s (DIFÍCIL), pior desafiante >= 5% e melhor <= 40% no NORMAL, 0 travadas, `danoRecebido` >= 0,60.', '');
    const dr = (c: string): string => agr.danoRecebido?.[c] === undefined ? '1' : String(agr.danoRecebido[c]);
    o.push('### Resumo', '');
    o.push('| Chefão | Desafiantes | Fator `danoRecebido` | Nível | Jogador vence | IC95 | Meta | Na meta | Terminou por KO | Por tempo | Duração | Pior desafiante | Melhor desafiante | Travadas |');
    o.push('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
    for (const s of agr.resumoChefes) {
      const metaTxt = `${Math.round(s.meta[0] * 100)}-${Math.round(s.meta[1] * 100)}%`;
      const crit = [s.ok.ko && s.ok.duracao && s.ok.pior && s.ok.melhor && s.ok.travadas ? '' : ' (critério fora)'].join('');
      o.push(
        `| **${s.chefe}** | ${s.desafiantes} | ${dr(s.chefe)} | ${s.nivel === 1 ? 'NORMAL' : 'DIFÍCIL'} | **${pct(s.jogador.taxa)}** (${s.jogador.k}/${s.jogador.n}) | ${pct(s.jogador.lo, 0)}-${pct(s.jogador.hi, 0)} | ${metaTxt} | ${s.ok.taxa ? 'sim' : '**NÃO**'}${crit} | ${pct(s.porKo, 0)} | ${pct(s.porTempo, 0)} | ${s.duracaoSeg.toFixed(0)} s | ${s.pior.desafiante} ${pct(s.pior.taxa, 0)} | ${s.melhor.desafiante} ${pct(s.melhor.taxa, 0)} | ${s.travadas} |`,
      );
    }
    o.push('');
    for (const chefe of [...new Set(agr.chefe.map((c) => c.chefe))]) {
      o.push(`### Chefão ${chefe}`, '');
      o.push('| Desafiante | Nível | Jogador vence | IC95 | Duração | Rounds | Chegou à 2ª barra | Viu a cena | Terminou por KO | Terminou por tempo |');
      o.push('|---|---|---|---|---|---|---|---|---|---|');
      for (const c of agr.chefe.filter((x) => x.chefe === chefe)) {
        o.push(
          `| ${c.desafiante} | ${c.nivel === 1 ? 'NORMAL' : 'DIFÍCIL'} | **${pct(c.jogador.taxa)}** (${c.jogador.k}/${c.jogador.n}) | ${pct(c.jogador.lo, 0)}-${pct(c.jogador.hi, 0)} | ${c.duracaoSeg.toFixed(0)} s | ${c.roundsMedios.toFixed(1)} | ${pct(c.trocouBarra, 0)} | ${pct(c.fezCena, 0)} | ${pct(c.porKo, 0)} | ${pct(c.porTempo, 0)} |`,
        );
      }
      o.push('');
    }
  }

  o.push('## Uso das mecânicas pela CPU', '');
  const m = agr.mecanicas;
  o.push('| Mecânica | Medida | Valor | Meta |', '|---|---|---|---|');
  o.push(`| AMINU MASHI | cargas que chegam ao nível 2+ / ao 3 (de ${m.aminu.seguraram} seguradas em ${m.aminu.usosMashi} usos) | ${pct(m.aminu.pctNivel2OuMais)} / ${pct(m.aminu.pctNivel3)} | ≥ 30% |`);
  o.push(`| CAMILLE PARADE | usos que aparam algo (${m.camille.paradas} em ${m.camille.usosParade}) | ${pct(m.camille.sucesso)} | ≥ 25% |`);
  o.push(`| CENTELLA RESORTE | acertos com momento ≥ 10% de maxDist (${m.centella.acertos} acertos; faixas <10/10-25/25-50/≥50%: ${m.centella.faixas.join('/')}) | ${pct(m.centella.pctAcimaDoMinimo)} | ≥ 50% |`);
  o.push(`| NILA troca de postura | trocas por luta | ${m.nila.trocasPorLuta.toFixed(2)} | – |`);
  o.push(`| BAATAR agarrões | agarrões em ${m.baatar.lutas} lutas | ${m.baatar.agarroes} | – |`);
  if (m.esquiva.porLuta > 0) o.push(`| ESQUIVA (V2) | esquivas por luta / golpes e projéteis esquivados por luta | ${m.esquiva.porLuta.toFixed(2)} / ${m.esquiva.esquivadosPorLuta.toFixed(2)} | – |`);
  o.push('');

  o.push('## Golpes que a CPU usa (usos / acertos / bloqueios+paradas)', '');
  o.push('Acertos e bloqueios são EVENTOS (golpe de vários acertos conta cada um). Projétil entra no golpe que o solta. Golpes aéreos e agachados raros não aparecem porque a CPU quase não os usa.', '');
  for (const id of ids) {
    const g = agr.golpes[id] ?? {};
    const chaves = Object.keys(g).sort();
    if (!chaves.length) continue;
    o.push(`**${id}**: ${chaves.map((c) => { const [u, a, b] = g[c] as [number, number, number]; return `${c} ${u}/${a}/${b}`; }).join(' · ')}`, '');
  }
  return o.join('\n');
}
