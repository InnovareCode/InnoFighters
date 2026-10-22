import { describe, it } from 'vitest';
import { compilarArranjo } from '../../src/audio/abertura';
import { TEMAS, type IdTema, type TemaDef } from '../../src/data/musica';
import { ABERTURA } from '../../src/data/trailer/abertura';
import { distancia } from '../support/descritores';
import { partituraDaSecao } from '../support/musica-abertura';
import { partituraDoLegado, type TrilhaLegado } from '../support/musica-medida';
import { partituraMedidaDoTema } from '../support/musica-tema';
import { descritoresDePistas, distanciasBrutas, normalizar, PISTAS, TAU_MUSICA } from '../support/regua-musica';
import { ESCALAS_EFEITO } from '../support/regua-sons';

/*
 * DIAGNÓSTICO da régua da abertura (só com TRAILER_DIAG=1): mostra, por seção e por referência, as três dimensões normalizadas e a distância S de cada PISTA
 * (lead, baixo, percussão), para saber qual instrumento puxa o dT para baixo ao compor. Não afirma nada; o critério está em trailer-musica.test.ts.
 */
const LISTA = Object.entries(TEMAS).filter((e): e is [IdTema, TemaDef] => e[1] !== 'chefe');
const TRILHAS: readonly TrilhaLegado[] = ['fight', 'menu', 'chefe'];
const ligado = process.env['TRAILER_DIAG'] !== undefined;

describe.skipIf(!ligado)('diagnóstico da régua da abertura', () => {
  it('por pista', () => {
    const sem = compilarArranjo(ABERTURA);
    const alvos = (process.env['TRAILER_DIAG'] ?? '').split(',').filter((x) => x !== '' && x !== '1');
    const refs = [...LISTA.map(([id, d]) => ({ nome: id, p: partituraMedidaDoTema(d, id) })), ...TRILHAS.map((t) => ({ nome: t, p: partituraDoLegado(t) }))].filter((r) => alvos.length === 0 || alvos.includes(r.nome));
    const linhas: string[] = [];
    ABERTURA.secoes.forEach((s, i) => {
      const p = partituraDaSecao(ABERTURA, i, sem);
      const da = descritoresDePistas(p);
      for (const r of refs) {
        const db = descritoresDePistas(r.p);
        const por = PISTAS.map((k) => distancia(da[k], db[k], ESCALAS_EFEITO).S);
        const n = normalizar(distanciasBrutas(p, r.p), TAU_MUSICA);
        linhas.push(`${s.nome.padEnd(12)} x ${r.nome.padEnd(8)} lead ${por[0]?.toFixed(2)} baixo ${por[1]?.toFixed(2)} perc ${por[2]?.toFixed(2)} | dM ${n.dM.toFixed(2)} dR ${n.dR.toFixed(2)} dT ${n.dT.toFixed(2)} D ${n.D.toFixed(2)}`);
      }
    });
    console.log(linhas.join('\n'));
  }, 300_000);
});

describe.skipIf(!ligado)('diagnóstico do orçamento da abertura', () => {
  it('passos acima de 8 fontes e o pico de fontes ativas', async () => {
    const { arranjoDaAbertura } = await import('../../src/trailer/musica');
    const { fontesDaChamadaMusical, FOLGA_STOP } = await import('../../src/audio/partitura');
    const a = arranjoDaAbertura();
    const linhas: string[] = [];
    a.tabela.forEach((cs, i) => {
      const n = cs.reduce((s, c) => s + fontesDaChamadaMusical(c), 0);
      if (n > 8) linhas.push(`passo ${i} (c${Math.floor(i / 16) + 1}.${(i % 16) + 1}): ${n} fontes: ${cs.map((c) => `${c.pista}:${c.k}${fontesDaChamadaMusical(c)}`).join(' ')}`);
    });
    // ativas por passo (início de cada passo)
    const ativas: number[] = a.tabela.map((_, i) => {
      const t = i * a.passo + 1e-6;
      let s = 0;
      a.tabela.forEach((cs, j) => {
        for (const c of cs) {
          const ini = j * a.passo + (c.quando ?? 0);
          if (ini <= t && t < ini + c.t + FOLGA_STOP) s += fontesDaChamadaMusical(c);
        }
      });
      return s;
    });
    const altos = ativas.map((n, i) => (n > 15 ? `${i}:${n}` : '')).filter(Boolean);
    const quem = (i: number): string => {
      const t = i * a.passo + 1e-6;
      const r: string[] = [];
      a.tabela.forEach((cs, j) => {
        for (const c of cs) {
          const ini = j * a.passo + (c.quando ?? 0);
          if (ini <= t && t < ini + c.t + FOLGA_STOP) r.push(`${c.pista}:${c.k}${fontesDaChamadaMusical(c)}@${j}(${c.t.toFixed(2)}s)`);
        }
      });
      return r.join(' ');
    };
    for (const i of ativas.map((n, k) => (n > 15 ? k : -1)).filter((k) => k >= 0)) console.log(`passo ${i}: ${quem(i)}`);
    console.log(`PASSOS >8:\n${linhas.join('\n')}\nATIVAS >15 (passo:n): ${altos.join(' ')}\npico ativas ${Math.max(...ativas)}`);
  });
});
