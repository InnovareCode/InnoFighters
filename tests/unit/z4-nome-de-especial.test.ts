import { describe, expect, it } from 'vitest';
import { LUTADORES_DO_PROTOTIPO, NOME_DE_ESPECIAL, tamanhoDoNomeDeEspecial, tamanhoDoNomeNoContexto } from '../../src/ui/personagens';

/*
 * Z4 (Lyra): nome do especial no painel da seleção. Os 4 lutadores do protótipo ficam SEMPRE a 13 px (o e2e de fidelidade compara pixel a pixel),
 * mesmo quando o nome passa da borda; só os NOVOS encolhem, de meio em meio px, até caber em 96 px (nunca abaixo de 8).
 */
// largura de brincadeira: 8 px por letra a 13 px, proporcional ao tamanho (como o texto de verdade, sem hinting)
const medir = (r: string, tam: number): number => r.length * 8 * (tam / 13);

describe('tamanhoDoNomeDeEspecial', () => {
  it('constantes literais: 13 px, 96 px de largura útil, piso de 8 px; os 4 do protótipo são hayato, wei-long, min-ji e caio', () => {
    expect(NOME_DE_ESPECIAL).toEqual({ tamanho: 13, larguraMax: 96, minimo: 8 });
    expect([...LUTADORES_DO_PROTOTIPO].sort()).toEqual(['caio', 'hayato', 'min-ji', 'wei-long']);
  });

  it('os 4 originais ficam a 13 px mesmo estourando a borda (nem chega a medir)', () => {
    let medidas = 0;
    const m = (r: string, t: number): number => {
      medidas++;
      return medir(r, t);
    };
    for (const id of ['hayato', 'wei-long', 'min-ji', 'caio']) expect(tamanhoDoNomeDeEspecial(m, id, '→ TWIO YEOP CHAGI TWIO YEOP CHAGI'), id).toBe(13);
    expect(medidas).toBe(0);
  });

  it('novo que cabe fica a 13 px (12 letras = 96 px, no limite)', () => {
    expect(tamanhoDoNomeDeEspecial(medir, 'zenon', 'TRIBUTO')).toBe(13);
    expect(tamanhoDoNomeDeEspecial(medir, 'zenon', '123456789012')).toBe(13);
  });

  it('novo que estoura encolhe de meio em meio px até caber, e nunca passa de 96 px nem desce de 8', () => {
    // 13 letras a 13 px = 104 px: 12,5 px dá 100 (estoura), 12 px dá 96 (cabe)
    expect(tamanhoDoNomeDeEspecial(medir, 'zenon', '1234567890123')).toBe(12);
    expect(tamanhoDoNomeDeEspecial(medir, 'baatar', '12345678901234')).toBe(11);
    for (const letras of [13, 15, 18, 20, 22]) {
      const t = tamanhoDoNomeDeEspecial(medir, 'nila', 'x'.repeat(letras));
      expect(t).toBeLessThanOrEqual(13);
      expect(t).toBeGreaterThanOrEqual(8);
      if (t > 8) expect(medir('x'.repeat(letras), t)).toBeLessThanOrEqual(96);
    }
    // passo de MEIO px: com 96,2 px a 13 px, 12,5 px já cabe (92,5) e é o que sai (um passo de 1 px daria 12)
    expect(tamanhoDoNomeDeEspecial((_r, tam) => 7.4 * tam, 'nila', 'qualquer')).toBe(12.5);
    // nome longo demais: o piso de 8 px vale
    expect(tamanhoDoNomeDeEspecial(medir, 'nila', 'x'.repeat(40))).toBe(8);
  });

  it('no contexto: mede com a fonte do corpo no tamanho tentado e devolve a fonte como estava', () => {
    const fontes: string[] = [];
    const ctx = {
      font: 'original',
      measureText(s: string) {
        fontes.push(this.font);
        return { width: medir(s, parseFloat(/([\d.]+)px/.exec(this.font)?.[1] ?? '0')) };
      },
    };
    expect(tamanhoDoNomeNoContexto(ctx, 'zenon', '1234567890123')).toBe(12);
    expect(ctx.font).toBe('original');
    expect(fontes[0]).toMatch(/^600 13px Barlow,/);
    expect(fontes.at(-1)).toMatch(/^600 12px Barlow,/);
    // original: não mede, não mexe na fonte
    fontes.length = 0;
    expect(tamanhoDoNomeNoContexto(ctx, 'hayato', '1234567890123456789')).toBe(13);
    expect(fontes).toEqual([]);
  });
});
