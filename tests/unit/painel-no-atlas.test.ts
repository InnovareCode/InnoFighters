import { describe, expect, it } from 'vitest';
import { paraManifestoV1, validarManifesto } from '../../src/assets/manifesto';
import { manifestoParaPoses } from '../../src/data/atlas';

/** O campo `painel` de um quadro (folha do filme do especial) atravessa manifesto C1 -> manifesto interno -> pose; ausente ou falso não deixa rastro. */
const manifesto = (quadros: Record<string, unknown>): unknown => ({
  versao: 1,
  lutador: 'teste',
  imagem: 'atlas.webp',
  tamanho: [200, 100],
  alturaRef: 100,
  quadros,
});

describe('quadro de painel no atlas', () => {
  it('`painel: true` chega até a pose; quadro comum e `painel: false` ficam sem o campo', () => {
    const bruto = manifesto({
      idle0: { x: 0, y: 0, w: 50, h: 100, ax: 25 },
      filme0: { x: 50, y: 0, w: 100, h: 50, ax: 50, painel: true },
      comum: { x: 150, y: 0, w: 50, h: 50, ax: 25, painel: false },
    });
    const poses = manifestoParaPoses(paraManifestoV1(validarManifesto(bruto, 'teste/atlas.json')));
    expect(poses['filme0']?.painel).toBe(true);
    expect(poses['idle0']).not.toHaveProperty('painel');
    expect(poses['comum']).not.toHaveProperty('painel');
  });

  it('`painel` que não é booleano é recusado como dado externo inválido', () => {
    const bruto = manifesto({ idle0: { x: 0, y: 0, w: 50, h: 100, ax: 25, painel: 'sim' } });
    expect(() => validarManifesto(bruto, 'teste/atlas.json')).toThrow(/painel/);
  });
});
