import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { validarManifesto, type ManifestoDeAmostras } from '../../src/data/sons/amostras';
import { criarPacote, escreverWav, TAXA_PACOTE } from '../support/pacote-teste';

/*
 * O pacote de teste EM ARQUIVO (tests/fixtures/sons-pacote/): MP3 de verdade + manifesto.json, gerados pelo MESMO gerador de ondas dos testes em memória
 * (tests/support/pacote-teste.ts). Servem para o navegador decodificar MP3 e provar o atraso de codificação (a Íris, o N3). Os MP3 ficam no git (~300 KB);
 * se o gerador mudar, regenerar com `npm run sons:pacote-teste` (precisa do ffmpeg) e este teste diz se esqueceram.
 */

const PASTA = new URL('../fixtures/sons-pacote/', import.meta.url);
const caminho = (nome: string): string => new URL(nome, PASTA).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const GERAR = process.env['GERAR_PACOTE_TESTE'] === '1';

describe.runIf(GERAR)('GERADOR (GERAR_PACOTE_TESTE=1): escreve os MP3 e o manifesto em tests/fixtures/sons-pacote/', () => {
  it('codifica cada folha com o ffmpeg (MP3 CBR mono 64 kbps, 44,1 kHz, como a curadoria) e grava o manifesto com os bytes reais', () => {
    const pacote = criarPacote();
    const tmp = mkdtempSync(join(tmpdir(), 'inno-sons-'));
    try {
      mkdirSync(caminho(''), { recursive: true });
      const folhas: Record<string, { arquivo: string; bytes: number }> = {};
      for (const [nome, pcm] of pacote.pcm) {
        const arquivo = pacote.manifesto.folhas[nome]?.arquivo as string;
        const wav = join(tmp, `${nome}.wav`);
        writeFileSync(wav, escreverWav(pcm, TAXA_PACOTE));
        const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wav, '-codec:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', '-ar', String(TAXA_PACOTE), caminho(arquivo)], { encoding: 'utf8' });
        if (r.status !== 0) throw new Error(`ffmpeg falhou em ${nome}: ${r.stderr}`);
        folhas[nome] = { arquivo, bytes: statSync(caminho(arquivo)).size };
      }
      const manifesto: ManifestoDeAmostras = { ...pacote.manifesto, folhas };
      expect(validarManifesto(manifesto)).toEqual([]);
      writeFileSync(caminho('manifesto.json'), `${JSON.stringify(manifesto, null, 1)}\n`);
    } finally {
      rmSync(tmp, { recursive: true, force: true });
    }
  });
});

describe.skipIf(GERAR)('o pacote de teste em arquivo está em dia com o gerador', () => {
  const presente = existsSync(caminho('manifesto.json'));
  it.runIf(presente)('manifesto.json é válido, tem o MESMO conteúdo do pacote em memória (cortes, tempos, origem), e cada folha existe com os bytes declarados', () => {
    const doArquivo = JSON.parse(readFileSync(caminho('manifesto.json'), 'utf8')) as ManifestoDeAmostras;
    expect(validarManifesto(doArquivo)).toEqual([]);
    const memoria = criarPacote().manifesto;
    expect(doArquivo.sons).toEqual(memoria.sons);
    expect(Object.keys(doArquivo.folhas).sort()).toEqual(Object.keys(memoria.folhas).sort());
    let total = 0;
    for (const f of Object.values(doArquivo.folhas)) {
      expect(statSync(caminho(f.arquivo)).size, f.arquivo).toBe(f.bytes);
      total += f.bytes;
    }
    expect(total).toBeLessThan(1_200_000);
  });
  it.runIf(presente)('cada folha é um MP3 de verdade (cabeçalho de quadro ou ID3), não um WAV renomeado', () => {
    for (const f of Object.values((JSON.parse(readFileSync(caminho('manifesto.json'), 'utf8')) as ManifestoDeAmostras).folhas)) {
      const b = readFileSync(caminho(f.arquivo));
      const id3 = b.subarray(0, 3).toString('latin1') === 'ID3';
      const quadro = b[0] === 0xff && ((b[1] as number) & 0xe0) === 0xe0;
      expect(id3 || quadro, f.arquivo).toBe(true);
    }
  });
  it.skipIf(presente)('(pacote em arquivo ainda não gerado: rode `npm run sons:pacote-teste`)', () => {
    expect(presente).toBe(false);
  });
});
