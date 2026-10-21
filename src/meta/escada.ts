import type { IdLutador } from '../core/contratos';
import type { Rng } from '../core/rng';
import { chefeDoArcade } from './chefes';
import { liberados } from './progresso';
import { REGRAS_PADRAO } from './regras';
import type { Etapa, Progresso, Regras } from './tipos';

export type ParametrosEscada = {
  /** Lutador do jogador (nunca aparece como rival). */
  c1: IdLutador;
  prog: Progresso;
  /** Use o `rngUI` com semente: mesma semente => mesma escada. */
  rng: Rng;
  /** Rivais antes do chefao; padrao `regras.tamanhoEscada`. Limitado ao que existe de candidatos. */
  tamanho?: number;
  regras?: Regras;
};

/**
 * Escada do Arcade: N rivais sorteados (Fisher-Yates com o `rng`) entre `roster − {c1, chefe, chefe da vez}` + chefao por
 * ultimo. O chefao da vez e `chefeDoArcade` (com `chefesDaFila`: o proximo guardiao, ou o Anfitriao com a fila esgotada; sem
 * ela, o `regras.chefe` fixo). O Anfitriao (`regras.chefe`) nunca e rival comum. Jogando COM o chefao nao ha luta de chefe
 * (ED7): so os rivais, nenhuma etapa com `chefe: true`. Sem chefao no jogo tambem nao ha etapa de chefe. Se `travadosNaEscada` e falso,
 * so entram rivais ja liberados (ED5). Embaralha todos os candidatos e corta, entao o prefixo da escada nao
 * depende de `tamanho`.
 */
export function montarEscada(p: ParametrosEscada): Etapa[] {
  const regras = p.regras ?? REGRAS_PADRAO;
  const tamanho = Math.max(0, Math.floor(p.tamanho ?? regras.tamanhoEscada));
  const ja = liberados(p.prog, regras);

  const chefeDaVez = chefeDoArcade(p.c1, p.prog, regras);
  const candidatos = regras.roster.filter(
    (id) => id !== p.c1 && id !== regras.chefe && id !== chefeDaVez && (regras.travadosNaEscada || ja.has(id)),
  );
  for (let i = candidatos.length - 1; i > 0; i--) {
    const j = p.rng.inteiro(i + 1);
    const a = candidatos[i] as IdLutador;
    candidatos[i] = candidatos[j] as IdLutador;
    candidatos[j] = a;
  }

  const etapas: Etapa[] = candidatos.slice(0, tamanho).map((id) => ({ id, chefe: false }));
  if (chefeDaVez !== null) etapas.push({ id: chefeDaVez, chefe: true });
  return etapas;
}
