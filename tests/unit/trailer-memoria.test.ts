import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { BYTES_DE_CENARIO } from '../../src/assets/gerenciador';
import { pesoDoManifesto } from '../../src/assets/carregador';
import { validarManifesto } from '../../src/assets/manifesto';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { ORCAMENTO_DO_TRAILER_MIB, PESADOS, planoDeCarga, residentesNoPlano } from '../../src/trailer/carga';
import { ROTEIRO } from './_trailer';

/*
 * T12 (docs/orcamentos-2026-10-23.md §2.3 e item 6c): o trailer cabe em 150 MiB de imagem decodificada (atlas + cenários), com a conta do jogo (largura x altura x 4 x páginas
 * do `atlas.json`, `pesoDoManifesto`) sobre os arquivos de verdade de public/. É o portão que fecha quando a arte cresce: um atlas maior, um plano novo ou uma antecedência
 * maior estouram aqui, antes do aparelho. O pico MEDIDO no navegador (a mesma conta, tick a tick, com a rede de verdade) sai de `npm run trailer:medir -- --cena trailer --modo memoria`.
 */

const MIB = 1024 * 1024;
const RAIZ = process.cwd();

const pesoDoAtlas = (id: string): number => {
  const url = join(RAIZ, 'public/assets/lutadores', id, 'atlas.json');
  return pesoDoManifesto(validarManifesto(JSON.parse(readFileSync(url, 'utf8')), url));
};
const PESOS = Object.fromEntries(IDS_LUTADORES.map((id) => [id, pesoDoAtlas(id)])) as Record<string, number>;

const PEDIDOS = planoDeCarga(ROTEIRO);
const memoriaNoPlano = (i: number): number => {
  const r = residentesNoPlano(ROTEIRO, PEDIDOS, i);
  return (r.lutadores.reduce((s, l) => s + (PESOS[l] as number), 0) + r.cenarios.length * BYTES_DE_CENARIO) / MIB;
};

describe('memória de imagem do trailer (T12)', () => {
  it('em nenhum plano a imagem decodificada (atlas + cenários residentes ou a caminho) passa de 150 MiB', () => {
    const porPlano = ROTEIRO.planos.map((p, i) => ({ id: p.id, mib: memoriaNoPlano(i) }));
    const pico = Math.max(...porPlano.map((x) => x.mib));
    expect(pico, porPlano.map((x) => `${x.id} ${x.mib.toFixed(1)}`).join(' | ')).toBeLessThanOrEqual(ORCAMENTO_DO_TRAILER_MIB);
    // a conta enxerga o trailer de verdade (não é um zero que passa): o pico é o P6 + P7 (NILA, WEI LONG, BAATAR, HAYATO e os cenários in e mn)
    expect(pico).toBeGreaterThan(120);
    expect(porPlano.find((x) => x.mib === pico)?.id).toBe('P6');
  });

  it('o desenho anterior (a vitrine e os 4 cenários dela fixos, mais 2 atlas não fixos) estourava: a conta acusa o que a T12 corrigiu', () => {
    const fixos = (['hayato', 'wei-long', 'min-ji', 'caio'] as const).reduce((s, l) => s + (PESOS[l] as number), 0) + 4 * BYTES_DE_CENARIO;
    // o pior par de atlas não fixos do roteiro que não é BAATAR e ZENON (nunca juntos): NILA (P6) e o BAATAR (P7)
    const naoFixos = (PESOS['nila'] as number) + (PESOS['baatar'] as number) + 2 * BYTES_DE_CENARIO;
    expect((fixos + naoFixos) / MIB).toBeGreaterThan(ORCAMENTO_DO_TRAILER_MIB);
  });

  it('BAATAR e ZENON nunca estão juntos na memória, em nenhum plano', () => {
    ROTEIRO.planos.forEach((p, i) => {
      const r = residentesNoPlano(ROTEIRO, PEDIDOS, i);
      expect(PESADOS.every((l) => r.lutadores.includes(l)), p.id).toBe(false);
    });
  });

  it('a folha FILME não cabe: no P6 + P7, uma folha só (a da NILA, que dá o especial do P6) já passa de 150 MiB, então o trailer segue com a pose Alt', () => {
    const i = ROTEIRO.planos.findIndex((p) => p.id === 'P6');
    const url = join(RAIZ, 'public/assets/lutadores/nila/atlas.json');
    const filme = validarManifesto(JSON.parse(readFileSync(url, 'utf8')), url).filme;
    expect(filme).toBeDefined();
    const folha = ((filme?.tamanho[0] ?? 0) * (filme?.tamanho[1] ?? 0) * 4) / MIB;
    expect(folha).toBeGreaterThan(8); // ~9 a 10 MiB por folha
    expect(memoriaNoPlano(i) + folha).toBeGreaterThan(ORCAMENTO_DO_TRAILER_MIB);
  });
});
