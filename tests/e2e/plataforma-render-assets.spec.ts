import { deflateSync } from 'node:zlib';
import { expect, test, type Page } from '@playwright/test';

async function abrir(page: Page): Promise<string[]> {
  const erros: string[] = [];
  page.on('pageerror', (e) => erros.push(e.message));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true');
  return erros;
}

// ---------- plataforma ----------

test.describe('plataforma', () => {
  test('tecla F entra e sai da tela cheia', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'tela cheia só é testada no desktop');
    await abrir(page);
    expect(await page.evaluate(() => document.fullscreenElement !== null)).toBe(false);
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(true);
    await page.keyboard.press('f');
    await expect.poll(() => page.evaluate(() => document.fullscreenElement !== null)).toBe(false);
  });

  test('foco e visibilidade avisam a cena (pausa automática)', async ({ page }) => {
    await abrir(page);
    const eventos = await page.evaluate(async () => {
      const { observarFoco } = await import(/* @vite-ignore */ '/src/platform/foco.ts' as string);
      const visto: string[] = [];
      const desfazer = observarFoco(window, {
        aoPerderFoco: () => visto.push('blur'),
        aoOcultar: () => visto.push('oculto'),
      });
      window.dispatchEvent(new Event('blur'));
      // aba visível: visibilitychange não avisa
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: true, configurable: true });
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'hidden', { value: false, configurable: true });
      desfazer();
      window.dispatchEvent(new Event('blur'));
      return visto;
    });
    expect(eventos).toEqual(['blur', 'oculto']);
  });

  test('erro de JavaScript aparece na caixa vermelha', async ({ page }) => {
    await abrir(page);
    await expect(page.locator('#err')).toBeHidden();
    await page.evaluate(() => window.dispatchEvent(new ErrorEvent('error', { message: 'falha simulada', lineno: 7 })));
    await expect(page.locator('#err')).toBeVisible();
    await expect(page.locator('#err')).toContainText('Erro: falha simulada (linha 7)');
  });

  test('o canvas ocupa a janela sem distorcer, em retrato e paisagem', async ({ page }) => {
    await abrir(page);
    for (const [w, h] of [
      [1280, 720],
      [800, 900],
      [2000, 600],
    ] as const) {
      await page.setViewportSize({ width: w, height: h });
      const b = await page.locator('canvas#jogo').boundingBox();
      expect(b).not.toBeNull();
      if (!b) continue;
      expect(Math.abs(b.width / b.height - 16 / 9)).toBeLessThan(0.02);
      expect(b.width).toBeLessThanOrEqual(w);
      expect(b.height).toBeLessThanOrEqual(h);
      // encosta num dos eixos (letterbox só no outro)
      expect(Math.max(w - b.width, h - b.height) <= Math.max(w, h) && (b.width >= w - 1 || b.height >= h - 1)).toBe(true);
    }
  });
});

// ---------- render (medido no navegador) ----------

test.describe('render', () => {
  test('textoArcade desenha centrado, com contorno e dentro do canvas', async ({ page }) => {
    await abrir(page);
    const r = await page.evaluate(async () => {
      const { textoArcade } = await import(/* @vite-ignore */ '/src/render/texto.ts' as string);
      const c = document.createElement('canvas');
      c.width = 960;
      c.height = 540;
      const ctx = c.getContext('2d')!;
      textoArcade(ctx, 'K.O.', 480, 250, 130, ['#ffffff', '#ff2a2a'], '#2a0000');
      const { data } = ctx.getImageData(0, 0, 960, 540);
      let x0 = 960;
      let x1 = -1;
      let y0 = 540;
      let y1 = -1;
      let topoBranco = 0;
      let baseVermelha = 0;
      for (let y = 0; y < 540; y++) {
        for (let x = 0; x < 960; x++) {
          const i = (y * 960 + x) * 4;
          if (data[i + 3]! > 0) {
            x0 = Math.min(x0, x);
            x1 = Math.max(x1, x);
            y0 = Math.min(y0, y);
            y1 = Math.max(y1, y);
            // preenchimento degradê: topo claro, base avermelhada
            if (data[i]! > 240 && data[i + 1]! > 240 && data[i + 2]! > 240) topoBranco = Math.max(topoBranco, 540 - y);
            if (data[i]! > 200 && data[i + 1]! < 90) baseVermelha = Math.max(baseVermelha, y);
          }
        }
      }
      return { x0, x1, y0, y1, topoBranco, baseVermelha };
    });
    expect(r.x1).toBeGreaterThan(r.x0); // desenhou algo
    expect((r.x0 + r.x1) / 2).toBeGreaterThan(470);
    expect((r.x0 + r.x1) / 2).toBeLessThan(490);
    expect((r.y0 + r.y1) / 2).toBeGreaterThan(240);
    expect((r.y0 + r.y1) / 2).toBeLessThan(260);
    expect(r.x0).toBeGreaterThan(0);
    expect(r.x1).toBeLessThan(960);
    expect(r.y1 - r.y0).toBeGreaterThan(60); // texto de 130px tem altura de verdade
    // degradê: o branco puro fica acima do vermelho
    const ySuperiorBranco = 540 - r.topoBranco;
    expect(ySuperiorBranco).toBeLessThan(r.baseVermelha);
  });

  test('vinheta: transparente no centro, escura nos cantos', async ({ page }) => {
    await abrir(page);
    const a = await page.evaluate(async () => {
      const { criarVinheta } = await import(/* @vite-ignore */ '/src/render/cenario.ts' as string);
      const v = criarVinheta();
      const g = v.getContext('2d')!;
      return { w: v.width, h: v.height, centro: g.getImageData(240, 135, 1, 1).data[3]!, canto: g.getImageData(1, 1, 1, 1).data[3]! };
    });
    expect(a.w).toBe(480);
    expect(a.h).toBe(270);
    expect(a.centro).toBe(0);
    expect(a.canto).toBeGreaterThan(0.3 * 255);
    expect(a.canto).toBeLessThan(0.6 * 255);
  });

  test('efeitos desenham no canvas e somem com o tempo', async ({ page }) => {
    await abrir(page);
    const r = await page.evaluate(async () => {
      const { Efeitos, desenharProjetil } = await import(/* @vite-ignore */ '/src/render/efeitos.ts' as string);
      const { criarRng } = await import(/* @vite-ignore */ '/src/core/rng.ts' as string);
      const { prepararCanvas, limparQuadro } = await import(/* @vite-ignore */ '/src/render/tela.ts' as string);
      const c = document.createElement('canvas');
      const ctx = prepararCanvas(c);
      const pintados = () => {
        const { data } = ctx.getImageData(0, 0, c.width, c.height);
        let n = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i]! > 0) n++;
        return n;
      };
      const e = new Efeitos(criarRng(5));
      limparQuadro(ctx);
      const vazio = pintados();
      e.faiscas(480, 300, '#ff0', 40);
      e.estrela(300, 300, '#fa0', true);
      e.escudo(600, 300, 1);
      e.poeira(480, 8);
      e.textoFlutuante(480, 200, 'PERFECT', '#fff');
      limparQuadro(ctx);
      e.desenharParticulas(ctx);
      e.desenharImpactos(ctx);
      e.desenharTextos(ctx);
      const comEfeitos = pintados();
      limparQuadro(ctx);
      desenharProjetil(ctx, { x: 480, y: 270, sc: 1, sy: 1, frame: 3, estilo: 'boomerang', vx: 5, dir: 1, cores: ['#c8ff3a', '#fffde0', '#2fb52f'] });
      const comProjetil = pintados();
      for (let i = 0; i < 60; i++) e.avancar();
      limparQuadro(ctx);
      e.desenharParticulas(ctx);
      e.desenharImpactos(ctx);
      e.desenharTextos(ctx);
      return { vazio, comEfeitos, comProjetil, depois: pintados(), tamanho: [c.width, c.height] };
    });
    expect(r.tamanho).toEqual([1920, 1080]);
    expect(r.vazio).toBe(0);
    expect(r.comEfeitos).toBeGreaterThan(2000);
    expect(r.comProjetil).toBeGreaterThan(2000);
    expect(r.depois).toBe(0);
  });
});

// ---------- assets (rede real do navegador, arquivos de fixture) ----------

/** PNG RGBA mínimo: metade esquerda vermelha opaca, metade direita transparente. */
function png(largura: number, altura: number): Buffer {
  const tabela = Array.from({ length: 256 }, (_, n) => {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    return c >>> 0;
  });
  const crc = (b: Buffer): number => {
    let c = 0xffffffff;
    for (const x of b) c = tabela[(c ^ x) & 0xff]! ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const bloco = (tipo: string, dados: Buffer): Buffer => {
    const t = Buffer.concat([Buffer.from(tipo, 'ascii'), dados]);
    const len = Buffer.alloc(4);
    len.writeUInt32BE(dados.length);
    const sum = Buffer.alloc(4);
    sum.writeUInt32BE(crc(t));
    return Buffer.concat([len, t, sum]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(largura, 0);
  ihdr.writeUInt32BE(altura, 4);
  ihdr[8] = 8; // 8 bits
  ihdr[9] = 6; // RGBA
  const linhas: Buffer[] = [];
  for (let y = 0; y < altura; y++) {
    const linha = Buffer.alloc(1 + largura * 4); // filtro 0
    for (let x = 0; x < largura / 2; x++) {
      linha[1 + x * 4] = 255;
      linha[1 + x * 4 + 3] = 255;
    }
    linhas.push(linha);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    bloco('IHDR', ihdr),
    bloco('IDAT', deflateSync(Buffer.concat(linhas))),
    bloco('IEND', Buffer.alloc(0)),
  ]);
}

const manifestoDeTeste = {
  versao: 1,
  lutador: 'teste',
  imagem: 'atlas.png',
  tamanho: [64, 32],
  alturaRef: 32,
  quadros: { idle0: { x: 0, y: 0, w: 32, h: 32, ax: 16, rosto: [16, 5] }, hp1: { x: 0, y: 0, w: 32, h: 32, ax: 16, ponta: [30, 10] } },
};

test.describe('loader de assets', () => {
  test('carrega manifesto + atlas + cenário com progresso e cria a silhueta só sob demanda', async ({ page }) => {
    await abrir(page);
    await page.route('**/assets/lutadores/teste/atlas.json', (rota) => rota.fulfill({ json: manifestoDeTeste }));
    await page.route('**/assets/lutadores/teste/atlas.png', (rota) => rota.fulfill({ contentType: 'image/png', body: png(64, 32) }));
    await page.route('**/assets/cenarios/palco.png', (rota) => rota.fulfill({ contentType: 'image/png', body: png(16, 9) }));

    const r = await page.evaluate(async () => {
      const { carregarRecursos } = await import(/* @vite-ignore */ '/src/assets/carregador.ts' as string);
      const marcos: number[] = [];
      const rec = await carregarRecursos({ baseUrl: '/', lutadores: ['teste'], cenarios: [{ id: 'palco', arquivo: 'assets/cenarios/palco.png' }] }, { aoProgredir: (f: number) => marcos.push(f) });
      const atlas = rec.lutadores.get('teste')!;
      const sil = atlas.silhueta();
      const px = (x: number, y: number) => Array.from(sil.getContext('2d')!.getImageData(x, y, 1, 1).data);
      const original = document.createElement('canvas');
      original.width = 64;
      original.height = 32;
      const og = original.getContext('2d')!;
      og.drawImage(atlas.imagem, 0, 0);
      return {
        marcos,
        tamanhoAtlas: [atlas.imagem.width, atlas.imagem.height],
        cenario: [rec.cenarios.get('palco')!.width, rec.cenarios.get('palco')!.height],
        silhuetaOpaca: px(10, 10),
        silhuetaTransparente: px(50, 10),
        originalOpaco: Array.from(og.getImageData(10, 10, 1, 1).data),
        mesma: atlas.silhueta() === sil,
        poseHp1: atlas.poses()['hp1'],
      };
    });
    expect(r.marcos).toHaveLength(3);
    expect(r.marcos[2]).toBe(1);
    expect(r.tamanhoAtlas).toEqual([64, 32]);
    expect(r.cenario).toEqual([16, 9]);
    expect(r.originalOpaco).toEqual([255, 0, 0, 255]);
    expect(r.silhuetaOpaca).toEqual([255, 255, 255, 255]); // pixel opaco vira branco
    expect(r.silhuetaTransparente[3]).toBe(0); // transparente continua transparente
    expect(r.mesma).toBe(true);
    // K = 255 / 32; tipX = (30 - 16) * K; tipY = (32 - 10) * K (via manifestoParaPoses)
    expect(r.poseHp1?.tipX).toBeCloseTo((14 * 255) / 32, 6);
    expect(r.poseHp1?.tipY).toBeCloseTo((22 * 255) / 32, 6);
  });

  test('arquivo ausente (404) rejeita dizendo qual', async ({ page }) => {
    await abrir(page);
    await page.route('**/assets/lutadores/sumiu/atlas.json', (rota) => rota.fulfill({ status: 404, body: 'nada' }));
    const msg = await page.evaluate(async () => {
      const { carregarRecursos } = await import(/* @vite-ignore */ '/src/assets/carregador.ts' as string);
      try {
        await carregarRecursos({ baseUrl: '/', lutadores: ['sumiu'], cenarios: [] });
        return 'carregou';
      } catch (e) {
        return String((e as Error).message);
      }
    });
    expect(msg).toMatch(/lutadores\/sumiu\/atlas\.json.*404/);
  });
});
