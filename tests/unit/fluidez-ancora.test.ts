import { readFileSync, writeFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
import { getPD } from '../../src/data/poses';
import type { LutadorMontado } from '../../src/data/montar';
import type { ManifestoC1, QuadroC1 } from '../../src/assets/tipos';
import { caminhoDoAtlas, lerManifestoC1, montarTodos } from './_lutadores';

/*
 * V2-2 (§7.4, critério 6): "salto de âncora". Os atlas gravam `ax` = o CENTRO DE MASSA X da figura, em px a partir do canto esquerdo do quadro
 * recortado (`ferramentas/sprites/nucleo.mjs`, `centroDeMassaX`), e o desenho põe esse ponto em `f.x` em TODO quadro. Logo o `ax` de dois quadros
 * consecutivos NUNCA aparece como salto na tela (o recorte tem larguras diferentes: Δax de dezenas de px é normal e invisível), e medir Δax não mede nada.
 * O que o jogador vê "escorregar" é o corpo em relação a esse ponto fixo: quando o braço estica, o centro de massa fica onde estava e os PÉS andam para
 * trás. Esta medida é essa: a posição dos pés (centro do alfa nas linhas de baixo do quadro) relativa ao `ax`, em px lógicos (`K`), entre dois quadros
 * consecutivos de uma animação. Atlas de PRODUÇÃO dos 10, na ordem em que a luta toca os quadros (`poseT`: idle 0-1-2-3-2-1, walk 0-7 em ciclo, cada
 * golpe preparação -> ativo -> recuperação).
 *
 * LIMITE_PX = 12 (a spec). A arte de hoje tem saltos acima disso (lista em ESCORREGOES_CONHECIDOS, do Apolo): o teste NÃO deixa piorar
 * (par novo ou valor maior que o registrado reprova) e quem consertar a arte apaga a linha. Quando a lista esvaziar, o critério 6 está cumprido.
 */

const ARQUIVO = new URL('../fixtures/escorregoes-conhecidos.json', import.meta.url);
const LIMITE_PX = 12;
const FOLGA_PX = 0.6; // a tabela guarda o valor arredondado para cima (0,1); a folga cobre arredondamento de decodificação do WebP
const FAIXA_DOS_PES = 0.06; // as 6% de baixo do quadro
const LIMIAR_ALFA = 128;

/** Páginas decodificadas (RGBA cru) por lutador, sob demanda. */
const paginas = new Map<string, Promise<{ dados: Buffer; w: number; h: number }[]>>();
function paginasDe(id: string, m: ManifestoC1): Promise<{ dados: Buffer; w: number; h: number }[]> {
  let p = paginas.get(id);
  if (!p) {
    const pasta = caminhoDoAtlas(id).replace(/atlas\.json$/, '');
    p = Promise.all(
      m.imagens.map(async (arq) => {
        const r = await sharp(readFileSync(pasta + arq)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
        return { dados: r.data, w: r.info.width, h: r.info.height };
      }),
    );
    paginas.set(id, p);
  }
  return p;
}

/** X dos pés relativo ao `ax`, em px do ATLAS (esquerda = negativo): centro do alfa nas linhas de baixo do quadro menos a âncora. */
function pesRelativosAoAx(pag: { dados: Buffer; w: number }, q: QuadroC1): number {
  const linhas = Math.max(2, Math.round(q.h * FAIXA_DOS_PES));
  let soma = 0;
  let n = 0;
  for (let y = q.y + q.h - linhas; y < q.y + q.h; y++) {
    for (let x = q.x; x < q.x + q.w; x++) {
      if ((pag.dados[(y * pag.w + x) * 4 + 3] as number) >= LIMIAR_ALFA) {
        soma += x - q.x;
        n++;
      }
    }
  }
  return n === 0 ? 0 : soma / n - q.ax;
}

type Par = { de: string; para: string; px: number };

/** Todas as sequências que a luta toca, por nome (rótulo -> quadros, com o fechamento do ciclo quando há). */
function sequenciasDe(ch: LutadorMontado): Map<string, string[]> {
  const m = new Map<string, string[]>();
  const idle = [0, 1, 2, 3, 2, 1].map((n) => `idle${n}`);
  m.set('idle', [...idle, idle[0] as string]);
  const walk = [0, 1, 2, 3, 4, 5, 6, 7].map((n) => `walk${n}`);
  m.set('walk', [...walk, walk[0] as string]);
  for (const [nome, mv] of Object.entries(ch.moves)) {
    const a = mv.anim;
    const seq = [...a.s, ...a.a, ...(a.r ?? a.a)];
    if (seq.length > 1) m.set(`golpe ${nome}`, seq);
  }
  return m;
}

/** Os escorregões ACIMA do limite de um lutador: `rótulo: de -> para` -> px (o pior valor do rótulo). */
async function escorregoes(id: string, ch: LutadorMontado): Promise<Record<string, number>> {
  const m = lerManifestoC1(id);
  const pags = await paginasDe(id, m);
  const pes = (nome: string): { x: number; k: number } => {
    const pd = getPD(ch, nome);
    // acha o quadro do manifesto que o `getPD` escolheu (alias/fallback) pela posição na página
    const q = Object.values(m.quadros).find((c) => c.x === pd.x && c.y === pd.y && c.w === pd.w && c.h === pd.h);
    if (!q) throw new Error(`${id}: quadro de "${nome}" não está no manifesto`);
    return { x: pesRelativosAoAx(pags[q.p] as { dados: Buffer; w: number }, q) * ch.K, k: ch.K };
  };
  const r: Record<string, number> = {};
  for (const [rotulo, nomes] of sequenciasDe(ch)) {
    for (let i = 0; i + 1 < nomes.length; i++) {
      const par: Par = { de: nomes[i] as string, para: nomes[i + 1] as string, px: Math.abs(pes(nomes[i] as string).x - pes(nomes[i + 1] as string).x) };
      if (par.px > LIMITE_PX) {
        const chave = `${rotulo}: ${par.de} -> ${par.para}`;
        r[chave] = Math.max(r[chave] ?? 0, Math.ceil(par.px * 10) / 10);
      }
    }
  }
  return r;
}

/** Escorregões de hoje (Apolo): lutador -> `rótulo: de -> para` -> px. Só pode ENCOLHER (a arte melhora e a linha sai). */
const ESCORREGOES_CONHECIDOS: Readonly<Record<string, Readonly<Record<string, number>>>> = JSON.parse(
  readFileSync(ARQUIVO, 'utf8'),
) as Record<string, Record<string, number>>;

describe('escorregão dos pés entre quadros consecutivos (V2-2, §7.4)', () => {
  const TODOS = montarTodos({ arteReal: true, dadosDeProducao: true });
  for (const [id, ch] of Object.entries(TODOS)) {
    it(`${id}: nenhuma animação escorrega os pés além do já registrado (limite ${LIMITE_PX} px)`, async () => {
      const achados = await escorregoes(id, ch);
      if (process.env['GERAR_ESCORREGOES']) {
        const atual = JSON.parse(readFileSync(ARQUIVO, 'utf8')) as Record<string, unknown>;
        writeFileSync(ARQUIVO, JSON.stringify({ ...atual, [id]: achados }, null, 1));
        return;
      }
      const conhecidos = ESCORREGOES_CONHECIDOS[id] ?? {};
      const novos = Object.entries(achados)
        .filter(([k, px]) => px > (conhecidos[k] ?? LIMITE_PX) + FOLGA_PX)
        .map(([k, px]) => `${k} = ${px.toFixed(1)} px (registrado: ${conhecidos[k] ?? 'nenhum'})`);
      expect(novos, novos.join('\n')).toEqual([]);
    }, 60_000);
  }

  it('o medidor enxerga o escorregão (controle negativo): os pés deslocados 30 px são reprovados', async () => {
    const id = 'hayato';
    const ch = TODOS[id];
    const m = lerManifestoC1(id);
    const pags = await paginasDe(id, m);
    const q = m.quadros['walk3'] as QuadroC1;
    const normal = pesRelativosAoAx(pags[q.p] as { dados: Buffer; w: number }, q);
    const deslocado = pesRelativosAoAx(pags[q.p] as { dados: Buffer; w: number }, { ...q, ax: q.ax - 30 / ch.K });
    expect(Math.abs(deslocado - normal) * ch.K).toBeCloseTo(30, 5);
  });
});

