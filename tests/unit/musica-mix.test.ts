import { describe, expect, it } from 'vitest';
import { duracaoDoLacoS, TEMAS, type IdTema, type TemaDef } from '../../src/data/musica';
import { medirMixagem, type MixagemDoLaco } from '../support/espectro';
import { partituraDoLegado } from '../support/musica-medida';
import { chamadasDoLaco, partituraMedidaDoTema } from '../support/musica-tema';
import { renderizarChamadas } from '../support/render-musica';

/*
 * T2 · mixagem (spec dos temas §3.5), medida no renderizador de referência (AudioSys real sobre o mini motor offline), laço inteiro, contra o laço da `fight`:
 *   RMS a ±1,5 dB; energia de 300 a 3000 Hz (a faixa dos gritos) <= a da `fight` + 1 dB; abaixo de 120 Hz <= + 2 dB; pico no barramento da música.
 * O "pico" é o do barramento ANTES dos ganhos (música 0,45 x master 0,9 = 0,405). A spec pedia <= 0,5; a própria `fight` de hoje tem 0,93 (o `tone()` decai
 * exponencialmente, então RMS igual ao da `fight` e pico de 0,5 só cabem juntos com um fundo sustentado). Os temas ficam <= PICO_MAX e abaixo da `fight`.
 */
const LISTA = Object.entries(TEMAS).filter((e): e is [IdTema, TemaDef] => e[1] !== 'chefe');
const PICO_ESPECIFICADO = 0.5;
const PICO_MAX = 0.7;
const GANHOS_DO_BUS = 0.45 * 0.9;

const fight = partituraDoLegado('fight');
const ref: MixagemDoLaco = medirMixagem(renderizarChamadas(chamadasDoLaco(fight), 6.4 + 0.6));
const picoBus = (m: MixagemDoLaco): number => m.pico / GANHOS_DO_BUS;

function medir(id: IdTema, def: TemaDef, laco: number, fase: 1 | 2): MixagemDoLaco {
  return medirMixagem(renderizarChamadas(chamadasDoLaco(partituraMedidaDoTema(def, id, laco, fase)), duracaoDoLacoS(def) / (fase === 2 ? def.fase2.andamento : 1) + 0.6));
}

describe('mixagem dos temas contra a `fight`', () => {
  it('referência: a `fight` de hoje', () => {
    console.log(`fight: RMS ${ref.rmsDb.toFixed(2)} dB, pico no barramento ${picoBus(ref).toFixed(2)}, grave ${ref.graveDb.toFixed(1)}, voz ${ref.vozDb.toFixed(1)}`);
    expect(picoBus(ref)).toBeGreaterThan(PICO_ESPECIFICADO); // a spec pedia 0,5 e a `fight` não cumpre: ver o handoff
  });

  describe.each(LISTA)('%s', (id, def) => {
    it.each([1, 2])('laço %i (fase 1): RMS a ±1,5 dB, voz <= +1 dB, grave <= +2 dB, pico <= teto', (laco) => {
      const m = medir(id, def, laco, 1);
      const rms = m.rmsDb - ref.rmsDb;
      const voz = m.vozDb - ref.vozDb;
      const grave = m.graveDb - ref.graveDb;
      console.log(`mix ${id} laço ${laco}: RMS ${rms >= 0 ? '+' : ''}${rms.toFixed(2)} dB, voz ${voz >= 0 ? '+' : ''}${voz.toFixed(1)}, grave ${grave >= 0 ? '+' : ''}${grave.toFixed(1)}, pico ${picoBus(m).toFixed(2)} ${picoBus(m) <= PICO_ESPECIFICADO ? '(<= 0,5)' : ''}`);
      expect(Math.abs(rms)).toBeLessThanOrEqual(1.5);
      expect(voz).toBeLessThanOrEqual(1);
      expect(grave).toBeLessThanOrEqual(2);
      expect(picoBus(m)).toBeLessThanOrEqual(PICO_MAX);
      expect(picoBus(m)).toBeLessThan(picoBus(ref));
    });
    it('fase 2 (laço 2, só no chefão): RMS de -1,5 a +2,5 dB, voz <= +1 dB, grave <= +4 dB, pico <= 0,8 e abaixo do da `fight`', () => {
      const m = medir(id, def, 2, 2);
      const rms = m.rmsDb - ref.rmsDb;
      const voz = m.vozDb - ref.vozDb;
      const grave = m.graveDb - ref.graveDb;
      console.log(`mix ${id} fase 2: RMS ${rms >= 0 ? '+' : ''}${rms.toFixed(2)} dB, voz ${voz >= 0 ? '+' : ''}${voz.toFixed(1)}, grave ${grave >= 0 ? '+' : ''}${grave.toFixed(1)}, pico ${picoBus(m).toFixed(2)}`);
      expect(rms).toBeGreaterThanOrEqual(-1.5);
      expect(rms).toBeLessThanOrEqual(2.5);
      expect(voz).toBeLessThanOrEqual(1);
      expect(grave).toBeLessThanOrEqual(4);
      expect(picoBus(m)).toBeLessThanOrEqual(0.8);
      expect(picoBus(m)).toBeLessThan(picoBus(ref));
    });
  });
});
