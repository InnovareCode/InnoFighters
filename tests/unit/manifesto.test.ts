import { describe, expect, it } from 'vitest';
import { validarManifesto } from '../../src/assets/manifesto';
import { ErroDeAsset } from '../../src/assets/tipos';

const valido = () => ({
  versao: 1,
  lutador: 'caio',
  imagem: 'atlas.webp',
  tamanho: [2048, 2048],
  alturaRef: 410,
  quadros: {
    idle0: { x: 8, y: 8, w: 289, h: 410, ax: 137, rosto: [150, 60] },
    hp1: { x: 1453, y: 912, w: 384, h: 421, ax: 168, ponta: [383, 120] },
  },
});

describe('validarManifesto (C1)', () => {
  it('aceita o exemplo do plano', () => {
    const m = validarManifesto(valido(), 'atlas.json');
    expect(m.lutador).toBe('caio');
    expect(m.quadros['hp1']?.ponta).toEqual([383, 120]);
    expect(m.quadros['idle0']?.rosto).toEqual([150, 60]);
  });

  it.each([
    ['nao e objeto', 42],
    ['versao errada', { ...valido(), versao: 2 }],
    ['sem lutador', { ...valido(), lutador: '' }],
    ['imagem com pasta', { ...valido(), imagem: '../segredo.png' }],
    ['imagem oculta', { ...valido(), imagem: '.env' }],
    ['tamanho invalido', { ...valido(), tamanho: [2048] }],
    ['alturaRef zero', { ...valido(), alturaRef: 0 }],
    ['sem quadros', { ...valido(), quadros: {} }],
    ['quadro sem ax', { ...valido(), quadros: { idle0: { x: 0, y: 0, w: 1, h: 1 } } }],
    ['quadro vazio', { ...valido(), quadros: { idle0: { x: 0, y: 0, w: 0, h: 1, ax: 0 } } }],
    ['ponta malformada', { ...valido(), quadros: { hp1: { x: 0, y: 0, w: 5, h: 5, ax: 0, ponta: [1, 'a'] } } }],
    ['NaN', { ...valido(), alturaRef: Number.NaN }],
  ])('rejeita: %s', (_nome, dados) => {
    expect(() => validarManifesto(dados, 'atlas.json')).toThrow(ErroDeAsset);
  });

  it('a mensagem diz qual arquivo e qual quadro', () => {
    const ruim = { ...valido(), quadros: { hp1: { x: 0, y: 0, w: 5, h: 5 } } };
    expect(() => validarManifesto(ruim, '/assets/lutadores/caio/atlas.json')).toThrow(/caio\/atlas\.json.*"hp1"/);
  });
});
