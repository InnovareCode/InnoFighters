import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { afterAll, describe, expect, it } from 'vitest';
import { paraManifestoV1, validarManifesto } from '../../src/assets/manifesto';
import { manifestoParaPoses } from '../../src/data/atlas';
import { carregarFerramenta } from './_ferramenta';

/*
 * Pipeline de sprites de ponta a ponta (ferramentas/sprites/executar.mjs): uma folha SINTÉTICA 4x3 com o fundo da
 * Runway (254,37,248, com lixo na última linha) -> atlas C1 v2 em disco -> relido e conferido. E, se a arte-fonte
 * existir nesta máquina (é gitignored), a folha real do HAYATO e a do AMINU (fundo verde).
 */
/* eslint-disable @typescript-eslint/no-explicit-any */
const executar = await carregarFerramenta<{
  gerarLutador: (p: any) => Promise<any>;
  processarFolha: (arquivo: string, nomes: string[], opcoes?: any) => Promise<any>;
  acharFolha: (raiz: string, id: string, folha: string) => string | null;
}>('ferramentas/sprites/executar.mjs');
const poses = await carregarFerramenta<{ FOLHAS: Record<string, string[]>; MINIMAS: string[]; COM_PONTA: string[] }>('ferramentas/sprites/poses.mjs');
const empacotador = await carregarFerramenta<{ validarEmpacotamento: (r: any, espaco?: number) => string[] }>('ferramentas/sprites/empacotar.mjs');

const RAIZ = fileURLToPath(new URL('../../', import.meta.url));
const tmp = mkdtempSync(join(tmpdir(), 'sprites-teste-'));
sharp.cache(false); // no Windows o cache do libvips segura os arquivos abertos e a limpeza falha com EPERM
afterAll(() => {
  try {
    rmSync(tmp, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
  } catch {
    // lixo em %TEMP% não reprova o teste
  }
});

const W = 800;
const H = 600;
const FUNDO = [254, 37, 248] as const;

/** Folha 4x3 de 800x600: cada figura = tronco + cabeça + um braço que cresce com o índice (alguns passam da célula). */
async function folhaSintetica(): Promise<{ arquivo: string; figuras: { x0: number; y0: number; x1: number; y1: number }[] }> {
  const buf = Buffer.alloc(W * H * 3);
  for (let p = 0; p < W * H; p++) buf.set(FUNDO, p * 3);
  const figuras: { x0: number; y0: number; x1: number; y1: number }[] = [];
  const pinta = (x0: number, y0: number, w: number, h: number, cor: number[]) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) buf.set(cor, (y * W + x) * 3);
  };
  for (let i = 0; i < 12; i++) {
    const col = i % 4;
    const lin = Math.floor(i / 4);
    const cx = col * 200 + 70;
    const base = lin * 200 + 190; // pés (a última fileira fica a 10 px do lixo da borda)
    const alturaCorpo = i === 0 ? 100 : 80 + (i % 5) * 4; // idle0 = 100 px (referência da escala)
    const bracoLargura = i * 6; // o último braço passa de 60 px para a direita
    pinta(cx, base - alturaCorpo, 30, alturaCorpo, [30, 30, 30]); // tronco/pernas
    pinta(cx + 5, base - alturaCorpo - 14, 20, 14, [200, 150, 110]); // cabeça (cor de pele)
    pinta(cx + 30, base - alturaCorpo + 20, 10 + bracoLargura, 8, [240, 240, 240]); // braço enfaixado de branco
    figuras.push({ x0: cx, y0: base - alturaCorpo - 14, x1: cx + 30 + 9 + bracoLargura, y1: base - 1 });
  }
  // lixo da Runway nas 2 últimas linhas (não é fundo, não é figura)
  for (let y = H - 2; y < H; y++) for (let x = 300; x < 700; x++) buf.set([(x * 37) % 256, (x * 91) % 256, (x * 13) % 256], (y * W + x) * 3);
  const arquivo = join(tmp, 'sintetico-f1-base-v1.png');
  await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(arquivo);
  return { arquivo, figuras };
}

const gerado = (async () => {
  const { arquivo, figuras } = await folhaSintetica();
  const saida = join(tmp, 'saida');
  const r = await executar.gerarLutador({ raiz: tmp, id: 'sintetico', folhas: ['f1'], saida, arquivos: { f1: arquivo } });
  return { figuras, saida, r };
})();

describe('pipeline sintético (folha 4x3 -> atlas C1 v2)', () => {
  it('gera atlas, manifesto válido, retrato, e mede âncora/rosto; lixo da borda não vira figura', async () => {
    const { figuras, saida, r } = await gerado;

    // 12 quadros nomeados na ordem da folha 1
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'sintetico/atlas.json');
    expect(Object.keys(m.quadros)).toEqual(poses.FOLHAS['f1']);
    expect(m.versao).toBe(2);
    expect(m.imagens.length).toBeGreaterThanOrEqual(1);
    for (const nome of m.imagens) expect(existsSync(join(saida, nome))).toBe(true);

    // UMA escala: o idle0 vira 410 e as outras mantêm a proporção (não normaliza altura quadro a quadro)
    expect(Math.abs(m.alturaRef - 410)).toBeLessThanOrEqual(1);
    expect(m.quadros['idle0']!.h).toBe(m.alturaRef); // contrato C1: alturaRef = altura do idle0
    const escala = r.relatorio.escala;
    expect(escala).toBeCloseTo(410 / (figuras[0]!.y1 - figuras[0]!.y0 + 1), 1);
    for (const [i, nome] of poses.FOLHAS['f1']!.entries()) {
      const f = figuras[i]!;
      const hEsperado = (f.y1 - f.y0 + 1) * escala;
      expect(Math.abs(m.quadros[nome]!.h - hEsperado), nome).toBeLessThanOrEqual(4); // ressalto da reamostragem num upscale de 4x
    }
    // o menor quadro é de fato menor que o idle0 (prova de que não houve normalização por quadro)
    expect(Math.min(...Object.values(m.quadros).map((q) => q.h))).toBeLessThan(410);

    // sem aviso de "encosta na borda" (o lixo das 2 últimas linhas foi cortado antes da chave de cor)
    expect(r.relatorio.avisos.filter((a: string) => /borda/.test(a))).toEqual([]);

    // âncora dentro do quadro; rosto só no idle0; retrato 190x190 com alfa
    for (const q of Object.values(m.quadros)) {
      expect(q.ax).toBeGreaterThan(0);
      expect(q.ax).toBeLessThan(q.w);
    }
    expect(m.quadros['idle0']!.rosto).toBeDefined();
    expect(m.quadros['idle1']!.rosto).toBeUndefined();
    const retrato = await sharp(join(saida, 'retrato.png')).metadata();
    expect([retrato.width, retrato.height, retrato.channels]).toEqual([190, 190, 4]);

    // relê as páginas do disco: o interior de cada quadro tem pixels opacos e a pele não ficou rosa
    for (const [nome, q] of Object.entries(m.quadros)) {
      const pagina = await sharp(join(saida, m.imagens[q.p]!)).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
      expect(pagina.info.width).toBe(m.tamanho[0]);
      expect(pagina.info.height).toBe(m.tamanho[1]);
      let opacos = 0;
      let rosados = 0;
      for (let y = q.y; y < q.y + q.h; y++) {
        for (let x = q.x; x < q.x + q.w; x++) {
          const i = (y * pagina.info.width + x) * 4;
          if (pagina.data[i + 3]! > 200) {
            opacos++;
            const rr = pagina.data[i]!;
            const gg = pagina.data[i + 1]!;
            const bb = pagina.data[i + 2]!;
            if (Math.min(rr, bb) - gg > 60) rosados++; // vaza magenta
          }
        }
      }
      expect(opacos, nome).toBeGreaterThan(q.w * q.h * 0.2);
      expect(rosados, `${nome}: halo magenta`).toBe(0);
      // a última coluna e a última linha do quadro tocam a figura (quadro aparado, pés na base)
    }
  });

  it('o manifesto gerado é consumido pelo jogo (v2 -> v1 -> poses)', async () => {
    const { saida } = await gerado;
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'sintetico');
    const p = manifestoParaPoses(paraManifestoV1(m));
    expect(Object.keys(p)).toHaveLength(12);
    expect(p['idle0']!.rosto).toBeDefined();
  });

  it('recusa folha com número de figuras diferente de 12 (não chuta)', async () => {
    const buf = Buffer.alloc(W * H * 3);
    for (let p = 0; p < W * H; p++) buf.set(FUNDO, p * 3);
    for (let y = 100; y < 200; y++) for (let x = 100; x < 160; x++) buf.set([30, 30, 30], (y * W + x) * 3);
    const arquivo = join(tmp, 'uma-figura.png');
    await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(arquivo);
    await expect(executar.processarFolha(arquivo, poses.FOLHAS['f1']!)).rejects.toThrow(/esperava 12/);
  });

  it('recusa fundo que não é verde nem magenta', async () => {
    const buf = Buffer.alloc(W * H * 3).fill(120);
    const arquivo = join(tmp, 'cinza.png');
    await sharp(buf, { raw: { width: W, height: H, channels: 3 } }).png().toFile(arquivo);
    await expect(executar.processarFolha(arquivo, poses.FOLHAS['f1']!)).rejects.toThrow(/nem magenta|verde/);
  });

  it('acharFolha escolhe a maior versão -vN', () => {
    const dir = join(tmp, 'arte-fonte', 'lutadores', 'zed', 'folhas');
    mkdirSync(dir, { recursive: true });
    for (const n of ['zed-f2-reacoes-v1.png', 'zed-f2-reacoes-v2.png', 'zed-f2-reacoes-v10.png', 'zed-f1-base-v1.png']) writeFileSync(join(dir, n), '');
    expect(executar.acharFolha(tmp, 'zed', 'f2')?.endsWith('zed-f2-reacoes-v10.png')).toBe(true);
    expect(executar.acharFolha(tmp, 'zed', 'f3')).toBeNull();
    expect(executar.acharFolha(tmp, 'ninguem', 'f1')).toBeNull();
  });
});

// ---- arte real (só roda onde a arte-fonte existe; ela é gitignored) ---------------------------------------------
const hayatoF1 = join(RAIZ, 'arte-fonte/lutadores/hayato/folhas/hayato-f1-base-v2.png');
const aminuF4 = join(RAIZ, 'arte-fonte/lutadores/aminu/folhas/aminu-f4-especiais-v1.png');
const hayatoF3 = join(RAIZ, 'arte-fonte/lutadores/hayato/folhas/hayato-f3-golpes-v1.png');

describe.skipIf(!existsSync(hayatoF1))('arte real (arte-fonte local)', () => {
  it('HAYATO f1 v2 (fundo magenta): 12 figuras, pés inteiros (nenhuma passa da borda), halo zerado', async () => {
    const r = await executar.processarFolha(hayatoF1, poses.FOLHAS['f1']!);
    expect(r.quadros).toHaveLength(12);
    expect(r.info.chave).toBe('magenta');
    expect(r.info.haloDepois).toBe(0);
    expect(r.info.haloAntes).toBeGreaterThan(0.1); // a chave crua deixa halo: o despill é necessário
    expect(r.avisos).toEqual([]);
    // os pés da fileira 1 passam da linha de grade 597 (a razão do recorte por componente)
    const idle0 = r.quadros[0];
    expect(idle0.baseY).toBeGreaterThan(597);
    // altura do idle0 na folha original: ~600 px
    expect(idle0.alturaFigura).toBeGreaterThan(560);
    expect(idle0.alturaFigura).toBeLessThan(640);
  });

  it('HAYATO completo (f1..f4): atlas C1 v2 passa nos critérios do PLANO (13 mínimas, ponta nos golpes, <= 1,2 MB, <= 2048)', async () => {
    const saida = join(tmp, 'hayato');
    const r = await executar.gerarLutador({ raiz: RAIZ, id: 'hayato', saida });
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'hayato/atlas.json');
    expect(Object.keys(m.quadros)).toHaveLength(48);
    for (const n of poses.MINIMAS) expect(m.quadros[n], n).toBeDefined();
    for (const n of poses.COM_PONTA.filter((x) => x !== 'jpunch')) expect(m.quadros[n]?.ponta, `ponta de ${n}`).toBeDefined();
    expect(m.tamanho[0]).toBeLessThanOrEqual(2048);
    expect(m.tamanho[1]).toBeLessThanOrEqual(2048);
    for (const nome of m.imagens) expect(statSync(join(saida, nome)).size, nome).toBeLessThanOrEqual(1.2 * 1024 * 1024);
    // nenhum quadro sai da página nem encosta em outro
    const paginas = m.imagens.map((_, i) => Object.entries(m.quadros).filter(([, q]) => q.p === i).map(([nome, q]) => ({ nome, w: q.w, h: q.h, x: q.x, y: q.y })));
    expect(empacotador.validarEmpacotamento({ tamanho: m.tamanho, paginas }, 4)).toEqual([]);
    // a ponta fica dentro do quadro e não é o canto do pé quando o golpe é de mão
    for (const n of poses.COM_PONTA.filter((x) => x !== 'jpunch')) {
      const q = m.quadros[n]!;
      expect(q.ponta![0], n).toBeLessThanOrEqual(q.w);
      expect(q.ponta![1], n).toBeLessThanOrEqual(q.h);
    }
    expect(m.quadros['lp1']!.ponta![1]).toBeLessThan(m.quadros['lp1']!.h * 0.5); // soco: ponta na altura do rosto
    expect(m.quadros['sweep']!.ponta![1]).toBeGreaterThan(m.quadros['sweep']!.h * 0.7); // rasteira: rente ao chão
    expect(m.quadros['upper']!.ponta![1]).toBeLessThan(m.quadros['upper']!.h * 0.2); // antiaéreo: punho no alto
    expect(r.relatorio.atlas.quadros).toBe(48);
  }, 120000);

  it.skipIf(!existsSync(hayatoF3))('HAYATO f3 v1: o pé de uma figura encostando no cabelo da de baixo é separado (11 -> 12 figuras)', async () => {
    const r = await executar.processarFolha(hayatoF3, poses.FOLHAS['f3']!);
    expect(r.quadros).toHaveLength(12);
    expect(r.avisos.some((a: string) => /coladas separadas/.test(a))).toBe(true);
  });

  it.skipIf(!existsSync(aminuF4))('AMINU f4 (fundo verde): 12 figuras e halo zerado', async () => {
    const r = await executar.processarFolha(aminuF4, poses.FOLHAS['f4']!);
    expect(r.quadros).toHaveLength(12);
    expect(r.info.chave).toBe('verde');
    expect(r.info.haloDepois).toBe(0);
  });
});
