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
  processarFolha: (arquivo: string, celulas: (string | string[] | null)[], opcoes?: any) => Promise<any>;
  acharFolha: (raiz: string, id: string, folha: string) => string | null;
}>('ferramentas/sprites/executar.mjs');
const poses = await carregarFerramenta<{ FOLHAS: Record<string, string[]>; MINIMAS: string[]; COM_PONTA: string[]; resolverLayout: (e: unknown) => { ids: string[]; folhas: Record<string, { grade: [number, number]; celulas: (string | string[] | null)[] }> } }>('ferramentas/sprites/poses.mjs');
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

// ---- folha 3x2 sintética (layout do chefão): célula descartada, apelido, acolchoar, fator de folha -------------------
const W6 = 900;
const H6 = 600;

/** Folha 3x2 de 900x600: 6 figuras; a primeira tem um braço que vai até x=0 (tangencia a borda esquerda). */
async function folha3x2(nome: string): Promise<string> {
  const buf = Buffer.alloc(W6 * H6 * 3);
  for (let p = 0; p < W6 * H6; p++) buf.set(FUNDO, p * 3);
  const pinta = (x0: number, y0: number, w: number, h: number, cor: number[]) => {
    for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) buf.set(cor, (y * W6 + x) * 3);
  };
  for (let i = 0; i < 6; i++) {
    const cx = (i % 3) * 300 + 120;
    const base = Math.floor(i / 3) * 300 + 270;
    const alturaCorpo = 100 + i * 6;
    pinta(cx, base - alturaCorpo, 40, alturaCorpo, [30, 30, 30]);
    pinta(cx + 8, base - alturaCorpo - 16, 24, 16, [200, 150, 110]);
    pinta(cx + 40, base - alturaCorpo + 20, 20, 8, [240, 240, 240]);
  }
  pinta(0, 200, 120, 6, [240, 240, 240]); // braço da figura 0, de x=0 até o corpo (x=120)
  const arquivo = join(tmp, nome);
  await sharp(buf, { raw: { width: W6, height: H6, channels: 3 } }).png().toFile(arquivo);
  return arquivo;
}

describe('acharFolha com o nome curto das folhas do BAATAR', () => {
  it('acha `<id>-b1-vN.png` (sem descrição), não confunde b1 com b10 e acha `br`', () => {
    const dir = join(tmp, 'arte-fonte', 'lutadores', 'big', 'folhas');
    mkdirSync(dir, { recursive: true });
    for (const n of ['big-b1-v1.png', 'big-b1-v2.png', 'big-b10-v9.png', 'big-br-v1.png', 'big-b2-v1.png']) writeFileSync(join(dir, n), '');
    expect(executar.acharFolha(tmp, 'big', 'b1')?.endsWith('big-b1-v2.png')).toBe(true);
    expect(executar.acharFolha(tmp, 'big', 'br')?.endsWith('big-br-v1.png')).toBe(true);
    expect(executar.acharFolha(tmp, 'big', 'b3')).toBeNull();
  });
});

describe('pipeline sintético 3x2 (layout do chefão)', () => {
  const CELULAS_B1 = [['idle0', 'idle2'], 'idle3', 'idle1', null, 'walk0', 'walk1'];

  it('processarFolha: célula null some, apelido viaja junto com o desenho, 6 figuras na grade 3x2', async () => {
    const arquivo = await folha3x2('baatar-t-b1-v1.png');
    const r = await executar.processarFolha(arquivo, CELULAS_B1, { grade: [3, 2], acolchoar: { esquerda: 8 } });
    expect(r.quadros.map((q: { nome: string }) => q.nome)).toEqual(['idle0', 'idle3', 'idle1', 'walk0', 'walk1']); // r2c1 descartada
    expect(r.quadros[0].apelidos).toEqual(['idle2']);
    expect(r.quadros[1].apelidos).toEqual([]);
    // a folha tem 6 figuras: uma grade 4x3 (12 células) não casa e é recusada com mensagem clara
    await expect(executar.processarFolha(arquivo, poses.FOLHAS['f1']!)).rejects.toThrow(/esperava 12/);
    await expect(executar.processarFolha(arquivo, ['a', 'b'], { grade: [3, 2] })).rejects.toThrow(/2 celulas para uma grade 3x2/);
  });

  it('acolchoar: o traço que tangencia x=0 não perde os 2 px do corte de borda e não avisa "encosta"', async () => {
    const arquivo = await folha3x2('baatar-t-b1-v1.png');
    const sem = await executar.processarFolha(arquivo, CELULAS_B1, { grade: [3, 2] });
    const com = await executar.processarFolha(arquivo, CELULAS_B1, { grade: [3, 2], acolchoar: { esquerda: 8 } });
    // a figura 0 vai de x=0 até x=179 (corpo em 120..159 e braço da frente até 179): 180 px inteiros só com o acolchoamento
    expect(com.quadros[0].larguraFigura).toBe(180);
    expect(sem.quadros[0].larguraFigura).toBe(178);
    expect(sem.avisos.some((a: string) => /encosta na borda/.test(a))).toBe(true);
    expect(com.avisos.some((a: string) => /encosta na borda/.test(a))).toBe(false);
    expect(com.avisos.some((a: string) => /acolchoada/.test(a))).toBe(true);
  });

  it('gerarLutador (layout chefe): alturaRef do lutadores.json, apelido = mesmo retângulo, retrato 190x190, manifesto válido', async () => {
    const arquivo = await folha3x2('baatar-t-b1-v1.png');
    const saida = join(tmp, 'saida-chefe');
    const r = await executar.gerarLutador({
      raiz: tmp, id: 'chefe-teste', folhas: ['b1'], saida, arquivos: { b1: arquivo },
      excecoes: { layout: 'chefe', alturaRef: 205, acolchoar: { b1: { esquerda: 8 } } },
    });
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'chefe-teste/atlas.json');
    expect(Object.keys(m.quadros)).toEqual(['idle0', 'idle1', 'idle2', 'idle3', 'walk0', 'walk1']);
    expect(Math.abs(m.alturaRef - 205)).toBeLessThanOrEqual(1);
    expect(m.quadros['idle0']!.h).toBe(m.alturaRef);
    const { p, x, y, w, h, ax } = m.quadros['idle0']!;
    expect(m.quadros['idle2']).toEqual({ p, x, y, w, h, ax }); // apelido: o mesmo desenho, sem rosto
    expect(m.quadros['idle0']!.rosto).toBeDefined();
    expect(r.relatorio.atlas).toMatchObject({ quadros: 6, desenhos: 5 });
    expect(r.relatorio.quadros['idle2'].apelidoDe).toBe('idle0');
    // alturaRef 205 = k 0,5: a janela do retrato é 95 px do atlas, entregue reduzida a 190x190
    const retrato = await sharp(join(saida, 'retrato.png')).metadata();
    expect([retrato.width, retrato.height]).toEqual([190, 190]);
    expect(m.retrato).toMatchObject({ arquivo: 'retrato.png' });
  });

  it('gerarLutador: pose em `ponta` fora de COM_PONTA ganha ponta; folha desconhecida é erro', async () => {
    const arquivo = await folha3x2('baatar-t-b1-v1.png');
    const saida = join(tmp, 'saida-chefe-ponta');
    await executar.gerarLutador({
      raiz: tmp, id: 'chefe-teste', folhas: ['b1'], saida, arquivos: { b1: arquivo },
      excecoes: { layout: 'chefe', ponta: { walk1: 'direita' } },
    });
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'x');
    expect(m.quadros['walk1']!.ponta).toBeDefined();
    expect(m.quadros['walk0']!.ponta).toBeUndefined();
    await expect(
      executar.gerarLutador({ raiz: tmp, id: 'chefe-teste', folhas: ['zz'], saida, arquivos: {}, excecoes: { layout: 'chefe' } }),
    ).rejects.toThrow(/folha desconhecida/);
  });

  it('fatorFolha multiplica a escala só da folha indicada (idle0 continua a referência)', async () => {
    const a1 = await folha3x2('baatar-t-b1-v1.png');
    const a2 = await folha3x2('baatar-t-b2-v1.png');
    const saida = join(tmp, 'saida-chefe-fator');
    const r = await executar.gerarLutador({
      raiz: tmp, id: 'chefe-teste', folhas: ['b1', 'b2'], saida, arquivos: { b1: a1, b2: a2 },
      excecoes: { layout: 'chefe', alturaRef: 200, fatorFolha: { b2: 0.5 } },
    });
    const q = r.relatorio.quadros;
    // walk2 = r1c1 da b2 = o mesmo desenho do idle0 (r1c1 da b1), mas com metade da escala
    expect(q['idle0'].h).toBe(200);
    expect(Math.abs(q['walk2'].h - 100)).toBeLessThanOrEqual(2);
    expect(r.relatorio.avisos.some((x: string) => /b2: escala da folha x0.5/.test(x))).toBe(true);
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


// ---- lutadores novos: arte real (arte-fonte é gitignored; sem ela os testes pulam) ---------------------------------
const existe = (...partes: string[]) => existsSync(join(RAIZ, 'arte-fonte', 'lutadores', ...partes));

describe.skipIf(!existe('baatar', 'folhas', 'baatar-b9-v2.png'))('BAATAR (arte real, grade 3x2, escala própria)', () => {
  it('atlas completo: 54 poses, alturaRef 525 = idle0, mínimas, ponta, apelido do idle e margem à esquerda na B9', async () => {
    const saida = join(tmp, 'baatar');
    const r = await executar.gerarLutador({ raiz: RAIZ, id: 'baatar', saida });
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'baatar/atlas.json');
    expect(Object.keys(m.quadros)).toHaveLength(54);
    expect(r.relatorio.atlas.desenhos).toBe(53); // idle2 é o mesmo desenho do idle0
    expect(m.alturaRef).toBe(525);
    expect(m.quadros['idle0']!.h).toBe(525);
    for (const n of poses.MINIMAS) expect(m.quadros[n], n).toBeDefined();
    for (const n of [...poses.COM_PONTA, 'dive1']) expect(m.quadros[n]?.ponta, `ponta de ${n}`).toBeDefined();
    for (const n of ['devekh0', 'devekh1', 'devekh2', 'dive0', 'dive1']) expect(m.quadros[n], n).toBeDefined();
    // laço do idle: idle0 e idle2 são o mesmo retângulo; idle1 e idle3 são desenhos diferentes
    expect(m.quadros['idle2']).toMatchObject({ p: m.quadros['idle0']!.p, x: m.quadros['idle0']!.x, y: m.quadros['idle0']!.y });
    expect(m.quadros['idle1']!.x === m.quadros['idle3']!.x && m.quadros['idle1']!.y === m.quadros['idle3']!.y).toBe(false);
    // agachar vem da reposição (BR): ~84% do idle, e não os 98,6% da B3 original
    expect(m.quadros['crouch']!.h / m.alturaRef).toBeLessThan(0.9);
    expect(m.quadros['crouch']!.h / m.alturaRef).toBeGreaterThan(0.75);
    // a B9 tem figura tangenciando x=0: acolchoada, sem aviso de "encosta na borda"
    expect(r.relatorio.avisos.some((a: string) => /b9: acolchoada/.test(a))).toBe(true);
    expect(r.relatorio.avisos.some((a: string) => /encosta na borda/.test(a))).toBe(false);
    for (const f of ['b1', 'b2', 'b3', 'br', 'b4', 'b5', 'b6', 'b7', 'b8', 'b9']) expect(r.relatorio.folhas[f].haloDepois, f).toBe(0);
    expect(r.relatorio.folhas['b9'].arquivo).toBe('baatar-b9-v2.png'); // maior versão
    expect(r.relatorio.folhas['b2'].arquivo).toBe('baatar-b2-v2.png');
    // golpes: soco na altura do tronco/rosto, rasteira rente ao chão, antiaéreo no alto; jkick pelo pé (não pela mão)
    expect(m.quadros['lp1']!.ponta![1]).toBeLessThan(m.quadros['lp1']!.h * 0.5);
    expect(m.quadros['sweep']!.ponta![1]).toBeGreaterThan(m.quadros['sweep']!.h * 0.7);
    expect(m.quadros['upper']!.ponta![1]).toBeLessThan(m.quadros['upper']!.h * 0.1);
    expect(m.quadros['jkick']!.ponta![1]).toBeGreaterThan(m.quadros['jkick']!.h * 0.55);
    // nenhum desenho sai da página nem encosta em outro (o apelido repete o retângulo: conta uma vez)
    const paginas = m.imagens.map((_, i) => {
      const unicos = new Map(Object.values(m.quadros).filter((q) => q.p === i).map((q) => [`${q.x},${q.y}`, { nome: `${q.x},${q.y}`, w: q.w, h: q.h, x: q.x, y: q.y }]));
      return [...unicos.values()];
    });
    expect(empacotador.validarEmpacotamento({ tamanho: m.tamanho, paginas }, 4)).toEqual([]);
    expect(m.tamanho[0]).toBeLessThanOrEqual(2048);
    expect(m.tamanho[1]).toBeLessThanOrEqual(2048);
  }, 180000);
});

describe.skipIf(!existe('centella', 'folhas', 'centella-f1-base-v1.png'))('CENTELLA f1 (respiração em 3 quadros, par r2c3/r3c3 colado)', () => {
  it('12 poses de 11 desenhos: idle em laço 1-2-4-2 sem a r1c3', async () => {
    const saida = join(tmp, 'centella');
    const r = await executar.gerarLutador({ raiz: RAIZ, id: 'centella', saida, folhas: ['f1'] });
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'centella/atlas.json');
    expect(Object.keys(m.quadros)).toHaveLength(12);
    const { x, y } = m.quadros['idle1']!;
    expect(m.quadros['idle3']).toMatchObject({ x, y }); // idle1 e idle3 = r1c2
    expect(r.relatorio.atlas.desenhos).toBe(11);
    // sem o salto de 26 px da r1c3: o idle nunca passa de ~3% da altura do idle0
    for (const n of ['idle1', 'idle2', 'idle3']) expect(Math.abs(m.quadros[n]!.h - m.alturaRef), n).toBeLessThanOrEqual(0.03 * m.alturaRef);
  }, 120000);
});

describe.skipIf(!existe('nila', 'folhas', 'nila-f1-base-v3.png'))('AMINU, CAMILLE, NILA, HAYATO e MIN-JI: versões aprovadas (maior -vN) e folhas completas', () => {
  const ESPERADAS: Record<string, Record<string, string>> = {
    aminu: { f1: 'aminu-f1-base-v1.png', f2: 'aminu-f2-reacoes-v2.png', f3: 'aminu-f3-golpes-v3.png', f4: 'aminu-f4-especiais-v1.png' },
    camille: { f1: 'camille-f1-base-v1.png', f2: 'camille-f2-reacoes-v2.png', f3: 'camille-f3-golpes-v1.png', f4: 'camille-f4-especiais-v2.png' },
    nila: { f1: 'nila-f1-base-v3.png', f2: 'nila-f2-reacoes-v2.png', f3: 'nila-f3-golpes-v1.png', f4: 'nila-f4-especiais-v1.png' },
    hayato: { f1: 'hayato-f1-base-v2.png', f2: 'hayato-f2-reacoes-v2.png', f3: 'hayato-f3-golpes-v1.png', f4: 'hayato-f4-especiais-v1.png' },
    'min-ji': { f1: 'min-ji-f1-base-v1.png', f2: 'min-ji-f2-reacoes-v2.png', f3: 'min-ji-f3-golpes-v1.png', f4: 'min-ji-f4-especiais-v1.png' },
  };
  for (const [id, folhas] of Object.entries(ESPERADAS)) {
    it(`${id}: o acharFolha pega as versões aprovadas e cada folha dá 12 figuras com halo zerado`, async () => {
      for (const [f, nome] of Object.entries(folhas)) {
        const arquivo = executar.acharFolha(RAIZ, id, f)!;
        expect(arquivo.split(/[\\/]/).pop(), `${id} ${f}`).toBe(nome);
        const r = await executar.processarFolha(arquivo, poses.FOLHAS[f]!);
        expect(r.quadros, `${id} ${f}`).toHaveLength(12);
        expect(r.info.haloDepois, `${id} ${f}`).toBe(0);
      }
    }, 120000);
  }
});

describe.skipIf(!existe('nila', 'folhas', 'nila-f5-extras-v2.png'))('NILA f5 (serpente, v2): folha extra, fatorFolha da f4 e ponta por fração', () => {
  it('o acharFolha pega a v2 e a folha dá 12 figuras com halo zerado, pelo mapa de lutadores.json', async () => {
    const arquivo = executar.acharFolha(RAIZ, 'nila', 'f5')!;
    expect(arquivo.split(/[\\/]/).pop()).toBe('nila-f5-extras-v2.png');
    const exc = JSON.parse(readFileSync(join(RAIZ, 'ferramentas', 'sprites', 'lutadores.json'), 'utf8')).nila;
    const layout = poses.resolverLayout(exc);
    expect(layout.ids).toEqual(['f1', 'f2', 'f3', 'f4', 'f5']);
    const f5 = layout.folhas['f5']!;
    const r = await executar.processarFolha(arquivo, f5.celulas, { grade: f5.grade });
    expect(r.quadros.map((q: { nome: string }) => q.nome)).toEqual([
      'sarpaIdle0', 'sarpaIdle1', 'sarpaIdle2', 'sarpaIdle3', 'sarpaWalk0', 'sarpaWalk1', 'sarpaSlide0', 'sarpaSlide1',
      'sarpaLeap0', 'sarpaLeap1', 'sarpaLeap2', 'sarpaBlock',
    ]);
    expect(r.info.haloDepois).toBe(0);
    expect(r.info.componentes).toBe(12);
  }, 120000);

  it('atlas da NILA (f1..f5): sarpa* depois das 48 canônicas, idle da serpente mais largo que alto, pontas do deslize e do chute, fatorFolha f2 1,2 / f3 1,15 / f4 1,1 (cabeça igual à da f1 v3)', async () => {
    const saida = join(tmp, 'nila-f5');
    const r = await executar.gerarLutador({ raiz: RAIZ, id: 'nila', saida, folhas: ['f1', 'f2', 'f3', 'f4', 'f5'] });
    const m = validarManifesto(JSON.parse(readFileSync(join(saida, 'atlas.json'), 'utf8')), 'nila/atlas.json');
    const nomes = Object.keys(m.quadros);
    expect(nomes.slice(-12)).toEqual([
      'sarpaIdle0', 'sarpaIdle1', 'sarpaIdle2', 'sarpaIdle3', 'sarpaWalk0', 'sarpaWalk1', 'sarpaSlide0', 'sarpaSlide1',
      'sarpaLeap0', 'sarpaLeap1', 'sarpaLeap2', 'sarpaBlock',
    ]);
    expect(nomes.indexOf('win')).toBeLessThan(nomes.indexOf('sarpaIdle0'));
    for (const i of [0, 1, 2, 3]) {
      const q = m.quadros['sarpaIdle' + i]!;
      expect(q.w, `sarpaIdle${i}`).toBeGreaterThanOrEqual(q.h);
    }
    // ponta: o deslize pelo pe (fração 0,75: abaixo da mão), o chute descendente pelo ponto mais à direita
    expect(r.relatorio.quadros['sarpaSlide1'].modoPonta).toBe('pe:0.75');
    expect(m.quadros['sarpaSlide1']!.ponta![1]).toBeGreaterThan(0.75 * m.quadros['sarpaSlide1']!.h);
    expect(r.relatorio.quadros['sarpaLeap2'].modoPonta).toBe('direita');
    expect(r.relatorio.quadros['sarpaIdle0'].ponta).toBeUndefined(); // pose sem golpe: sem ponta
    // fatorFolha medido na cabeça (topo-queixo) contra a f1 v3: f2 ~95 px, f3 ~100, f4 ~104 contra ~115; cada quadro sai na escala da folha dele
    for (const [folha, fator, pose] of [['f2', 1.2, 'block'], ['f3', 1.15, 'lp0'], ['f4', 1.1, 'sa0']] as const) {
      expect(r.relatorio.avisos.some((a: string) => a.startsWith(`${folha}: escala da folha x${fator}`)), folha).toBe(true);
      const q = r.relatorio.quadros[pose];
      expect(q.h / q.alturaOriginal, `${folha} ${pose}`).toBeCloseTo(fator * r.relatorio.escala, 1);
    }
    expect(r.relatorio.avisos.some((a: string) => /^f[15]: escala da folha/.test(a))).toBe(false); // f1 e f5 não têm fator
    // a guarda da f3 (lp0) e a da f4 (sa0) têm o tamanho do idle0 da f1 (410 px, +-5%)
    for (const n of ['lp0', 'sa0']) expect(Math.abs(m.quadros[n]!.h - m.alturaRef), n).toBeLessThanOrEqual(0.05 * m.alturaRef);
  }, 180000);
});
