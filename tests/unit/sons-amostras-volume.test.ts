import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BancoDeAmostras } from '../../src/audio/amostras';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { AudioSys } from '../../src/audio/audio-sys';
import { registrarBancoDeAmostras } from '../../src/audio/identidade-sonora';
import { criarRng } from '../../src/core/rng';
import { cortesDe, idsConhecidos, idsObrigatorios, validarManifesto, type ManifestoDeAmostras } from '../../src/data/sons/amostras';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { ganhoCalibrado, ganhoSugeridoDb, MASTER_DB, PICO_MAXIMO_DEPOIS_DO_GANHO_DB, referencias, TOLERANCIA_DB } from '../support/calibracao-amostras';
import { descrever, TAXA } from '../support/descritores';
import { criarPacote, type PacoteDeTeste } from '../support/pacote-teste';

/*
 * VOLUME das amostras (plano §4.2 passo 4, §6.3): o `ganhoDb` do manifesto põe o RMS de cada amostra a ±3 dB do som sintetizado que ela substitui. A régua é o RMS
 * do som de hoje (tests/support/calibracao-amostras.ts). Duas frentes:
 *  1. o pacote de teste, CALIBRADO por essa mesma régua, tocado de verdade pelo banco sobre o motor offline: o RMS que sai bate com o que o manifesto promete
 *     (prova que o ganho do banco não perde nem acrescenta decibéis escondidos);
 *  2. o pacote REAL (`public/assets/sons/manifesto.json`), quando existir: `rmsDb + ganhoDb` contra a referência, sem decodificar MP3.
 * SONS_DIAG=1 imprime o ganho sugerido de cada id do pacote real (e `CALIBRAR_ESCREVER=1` grava no manifesto.json).
 */

// calcular as referências sintéticas (119 ids no AudioSys offline) leva ~2 s sozinho e bem mais com a suíte inteira rodando em paralelo
vi.setConfig({ testTimeout: 60_000 });

const MANIFESTO_REAL = new URL('../../public/assets/sons/manifesto.json', import.meta.url);
const caminhoReal = MANIFESTO_REAL.pathname.replace(/^\/([A-Za-z]:)/, '$1');
const existeReal = existsSync(caminhoReal);

const primeiroCorte = (m: ManifestoDeAmostras, id: string): { rmsDb: number; picoDb: number; ganhoDb: number } => {
  const c = cortesDe(m.sons[id])[0];
  if (!c) throw new Error(`sem corte para ${id}`);
  return c;
};
const dentro = (x: number, alvo: number, tol: number): boolean => Math.abs(x - alvo) <= tol;

function pacoteCalibrado(): PacoteDeTeste {
  const cru = criarPacote().manifesto;
  const ganhoPorId: Record<string, number> = {};
  for (const id of idsConhecidos()) ganhoPorId[id] = ganhoSugeridoDb(id, primeiroCorte(cru, id).rmsDb);
  return criarPacote({ ganhoPorId });
}

describe('a régua de referência cobre todo id da tabela', () => {
  it('toda referência é um nível audível e plausível (-60 a -3 dBFS) e a lista de ids do plano está completa', () => {
    const refs = referencias();
    expect(refs.size).toBe(idsConhecidos().size);
    expect(refs.get('voz.camille.kiai')?.como).toMatch(/sFwd|sDown/); // a PARADE (sFire) da CAMILLE não grita: a referência acha outro golpe
    const linhas: string[] = [];
    for (const [id, r] of refs) {
      expect(r.rmsDb, id).toBeGreaterThan(-60);
      expect(r.rmsDb, id).toBeLessThan(-3);
      linhas.push(`${id.padEnd(22)} ${r.rmsDb.toFixed(1)} dBFS  (${r.como})`);
    }
    console.log(`referências sintéticas (RMS da região ativa no destino, sfx=1):\n${linhas.slice(0, 40).join('\n')}\n... (${linhas.length} ids)`);
  });
  it('o dano pesado sintetizado fica 2 a 4 dB acima do leve (a regra do plano §6.3 que a amostra herda)', () => {
    const refs = referencias();
    for (const l of ['hayato', 'caio', 'baatar', 'nila']) {
      const d = (refs.get(`voz.${l}.pesado`)?.rmsDb ?? 0) - (refs.get(`voz.${l}.leve`)?.rmsDb ?? 0);
      expect(d, l).toBeGreaterThan(1);
      expect(d, l).toBeLessThan(5);
    }
  });
});

describe('o pacote de teste calibrado: o banco toca no nível que o manifesto promete', () => {
  afterEach(() => registrarBancoDeAmostras(null));

  it('rmsDb + ganhoDb (no destino) fica a ±3 dB da referência sintética em TODOS os cortes (a calibração em si)', () => {
    const p = pacoteCalibrado();
    expect(validarManifesto(p.manifesto)).toEqual([]);
    const fora: string[] = [];
    for (const [id, v] of Object.entries(p.manifesto.sons)) {
      for (const c of cortesDe(v)) {
        const ref = referencias().get(id)?.rmsDb ?? 0;
        const d = c.rmsDb + c.ganhoDb + MASTER_DB - ref;
        if (Math.abs(d) > TOLERANCIA_DB) fora.push(`${id}: ${d.toFixed(1)} dB`);
      }
    }
    expect(fora).toEqual([]);
  });

  it('o que SAI de verdade (banco -> motor offline -> RMS da região ativa) bate com a previsão do manifesto em +-1 dB, para foley, voz e família', async () => {
    const p = pacoteCalibrado();
    const ids = ['imp.soco.leve', 'imp.chute.forte', 'defesa', 'golpe.ar.leve', 'arremesso', 'voz.hayato.kiai', 'voz.caio.pesado', 'voz.baatar.ko', 'esp.e1.raio', 'esp.e7.florete', 'magia.impacto'];
    const medidos: string[] = [];
    for (const id of ids) {
      const c = new Contexto(TAXA);
      const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5) });
      audio.init();
      audio.setSfxVol(1);
      const banco = new BancoDeAmostras(p.manifesto, { baseUrl: '/x/', buscar: p.buscar, decodificar: p.decodificar, aviso: () => undefined });
      banco.sincronizar(c as unknown as BaseAudioContext);
      const folha = (p.manifesto.sons[id] ? cortesDe(p.manifesto.sons[id])[0]?.folha : '') as string;
      banco.prepararLutadores(folha === 'base' ? [] : [folha]);
      for (let i = 0; i < 400 && banco.estadoDaFolha(folha) !== 'pronta'; i++) await new Promise((r) => setTimeout(r, 0));
      const e = banco.escolher({ ids: [id], u: 0, taxa: 1, ganho: 1 });
      if (!e) throw new Error(`sem escolha para ${id}`);
      banco.tocar(c as unknown as BaseAudioContext, e, audio.barramentoIdentidade());
      const d = descrever(c.renderizar(e.duracao + 0.05));
      const corte = primeiroCorte(p.manifesto, id);
      const previsto = corte.rmsDb + corte.ganhoDb + MASTER_DB;
      medidos.push(`${id}: saiu ${d.rmsAtivoDb.toFixed(1)} dBFS, previsto ${previsto.toFixed(1)}, referência ${(referencias().get(id)?.rmsDb ?? 0).toFixed(1)}`);
      expect(dentro(d.rmsAtivoDb, previsto, 1), medidos.at(-1)).toBe(true);
      expect(dentro(d.rmsAtivoDb, referencias().get(id)?.rmsDb ?? 0, TOLERANCIA_DB), medidos.at(-1)).toBe(true);
    }
    console.log(medidos.join('\n'));
  });
});

describe.runIf(existeReal)('o pacote REAL (public/assets/sons): origem, licença CC0, cobertura e volume a ±3 dB do som sintetizado', () => {
  const m = existeReal ? (JSON.parse(readFileSync(caminhoReal, 'utf8')) as ManifestoDeAmostras) : ({} as ManifestoDeAmostras);
  it('o manifesto passa na validação (peso <= 1,2 MB, ids da tabela, todo corte com origem e CC0)', () => {
    expect(validarManifesto(m)).toEqual([]);
  });
  it('cada arquivo de folha existe e tem os bytes declarados', () => {
    for (const f of Object.values(m.folhas)) {
      const c = new URL(`../../public/assets/sons/${f.arquivo}`, import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
      expect(existsSync(c), f.arquivo).toBe(true);
      expect(readFileSync(c).length, f.arquivo).toBe(f.bytes);
    }
  });
  it('o núcleo do plano está presente (foley compartilhado e, por lutador, kiai, dano leve, dano pesado e KO); o que falta de fora do núcleo cai na síntese', () => {
    const faltam = idsObrigatorios().filter((id) => m.sons[id] === undefined);
    const lacunas = [...idsConhecidos()].filter((id) => m.sons[id] === undefined && !idsObrigatorios().includes(id));
    console.log(`pacote real: ${Object.keys(m.sons).length} ids; lacunas (síntese): ${lacunas.join(', ') || 'nenhuma'}`);
    expect(faltam).toEqual([]);
  });
  it('o dano pesado fica de 2 a 4 dB acima do leve em cada lutador (plano §6.3), na média dos cortes depois do ganho', () => {
    const nivel = (id: string): number | null => {
      const cs = cortesDe(m.sons[id]);
      return cs.length ? cs.reduce((n, c) => n + c.rmsDb + c.ganhoDb, 0) / cs.length : null;
    };
    for (const l of IDS_LUTADORES) {
      const leve = nivel(`voz.${l}.leve`);
      const pesado = nivel(`voz.${l}.pesado`);
      if (leve === null || pesado === null) continue;
      expect(pesado - leve, l).toBeGreaterThanOrEqual(2 - 0.3);
      expect(pesado - leve, l).toBeLessThanOrEqual(4 + 0.3);
    }
  });
  it('ganhoDb calibrado: rmsDb + ganhoDb a ±3 dB do som sintetizado que o corte substitui; o que fica abaixo é só o transiente seco que o teto de pico segura (+1,5 dBFS)', () => {
    const fora: string[] = [];
    const limitados: string[] = [];
    for (const [id, v] of Object.entries(m.sons)) {
      const ref = referencias().get(id);
      if (!ref) continue;
      for (const c of cortesDe(v)) {
        const d = c.rmsDb + c.ganhoDb + MASTER_DB - ref.rmsDb;
        const g = ganhoCalibrado(id, c.rmsDb, c.picoDb);
        // aceito: dentro de ±3 dB, OU abaixo da referência porque o pico não deixa subir mais (o ganho está no teto)
        const presoNoPico = g.limitadoPeloPico && d < 0 && c.ganhoDb >= g.ganhoDb - 0.15;
        if (presoNoPico && Math.abs(d) > TOLERANCIA_DB) limitados.push(`${id} (${d.toFixed(1)} dB)`);
        if (Math.abs(d) > TOLERANCIA_DB && !presoNoPico) fora.push(`${id}: ${d.toFixed(1)} dB do som sintético (sugestão de ganhoDb: ${g.ganhoDb})`);
        if (c.picoDb + c.ganhoDb > PICO_MAXIMO_DEPOIS_DO_GANHO_DB + 0.1) fora.push(`${id}: pico ${c.picoDb} dBFS + ganho ${c.ganhoDb} dB passa de ${PICO_MAXIMO_DEPOIS_DO_GANHO_DB} dBFS`);
      }
    }
    console.log(`cortes abaixo da síntese por causa do pico (${limitados.length}): ${limitados.join(', ') || 'nenhum'}`);
    expect(fora).toEqual([]);
  });
});

describe.runIf(process.env['SONS_DIAG'] === '1' && existeReal)('DIAGNÓSTICO (SONS_DIAG=1): ganhoDb sugerido para o pacote real', () => {
  it('imprime (e, com CALIBRAR_ESCREVER=1, grava no manifesto.json) o ganho que põe cada corte na referência sintética', () => {
    const m = JSON.parse(readFileSync(caminhoReal, 'utf8')) as { sons: Record<string, Record<string, unknown> | Record<string, unknown>[]> };
    const linhas: string[] = [];
    for (const [id, v] of Object.entries(m.sons)) {
      for (const c of Array.isArray(v) ? v : [v]) {
        const g = ganhoCalibrado(id, c['rmsDb'] as number, c['picoDb'] as number);
        linhas.push(`${id}: ganhoDb ${String(c['ganhoDb'])} -> ${g.ganhoDb}${g.limitadoPeloPico ? ' (preso no pico)' : ''}`);
        if (process.env['CALIBRAR_ESCREVER'] === '1') c['ganhoDb'] = g.ganhoDb;
      }
    }
    console.log(linhas.join('\n'));
    if (process.env['CALIBRAR_ESCREVER'] === '1') writeFileSync(caminhoReal, `${JSON.stringify(m, null, 1)}\n`);
  });
});
