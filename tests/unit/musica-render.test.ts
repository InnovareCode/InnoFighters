import { describe, expect, it } from 'vitest';
import { tocarReceita } from '../../src/audio/receitas';
import { partituraDoLegado } from '../support/musica-medida';
import { renderizarChamadas } from '../support/render-musica';
import { renderizar } from '../support/render-som';

/* O renderizador por chamada (overlap-add) tem de dar o mesmo som que renderizar tudo junto no AudioSys real: é ele que sustenta o dT e a mixagem. */
describe('render-musica: overlap-add == render direto', () => {
  it.each(['fight', 'menu', 'chefe'] as const)('um compasso de %s', (trilha) => {
    const p = partituraDoLegado(trilha);
    const i0 = p.passosPorCompasso * 1;
    const t0 = i0 * p.spb;
        // +10 µs em tudo: o mini motor tem um estalo de 1 amostra quando o início cai a menos de 5e-11 s ANTES de um quadro (ex. 1,2000000000000002 s) e o
    // ganho ainda vale o padrão 1; o renderizador por chamada (começa em 0) não tem esse defeito, então a comparação foge desse caso de borda.
    const cs = p.porPasso.slice(i0, i0 + p.passosPorCompasso).flat().map((c) => ({ ...c, quando: (c.quando ?? 0) - t0 + 1e-5 }));
    const dur = p.passosPorCompasso * p.spb + 0.4;
    const direto = renderizar((a) => void tocarReceita(a, cs, { destino: 'musica' }), {}, dur).amostras;
    const soma = renderizarChamadas(cs, dur);
    let dif = 0;
    let pico = 0;
    for (let i = 0; i < soma.length; i++) {
      dif = Math.max(dif, Math.abs((direto[i] ?? 0) - (soma[i] as number)));
      pico = Math.max(pico, Math.abs(direto[i] ?? 0));
    }
    console.log(`render ${trilha}: pico ${pico.toFixed(3)} dif máx ${dif.toExponential(2)}`);
    expect(pico).toBeGreaterThan(0.05);
    expect(dif / pico).toBeLessThan(0.01);
  }, 60000);
});
