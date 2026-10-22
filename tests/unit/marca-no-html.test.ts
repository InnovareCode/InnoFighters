import { existsSync, readFileSync, statSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

/*
 * A logo oficial nos metadados do site (docs/logo-oficial.md §7): favicon, apple-touch-icon, splash pré-carregado, theme-color, Open Graph sem imagem absoluta
 * (o site atual é de teste e noindex), e o manifest do app na tela de início apontando para os ícones novos. Tudo que o HTML e o manifest citam tem que EXISTIR em public/.
 */
const html = readFileSync('index.html', 'utf8');
const manifest = JSON.parse(readFileSync('public/manifest.webmanifest', 'utf8')) as {
  background_color: string;
  theme_color: string;
  icons: Array<{ src: string; sizes: string; type: string; purpose: string }>;
};
const noPublic = (caminho: string): string => `public/${caminho.replace(/^\/+/, '')}`;

describe('index.html: a marca nova', () => {
  it('favicon (ico + png 32 e 16), apple-touch-icon de 180 e o splash pré-carregado apontam para arquivos que existem', () => {
    const hrefs = [...html.matchAll(/<link rel="(?:icon|apple-touch-icon|preload)"[^>]*href="([^"]+)"/g)].map((m) => m[1]!);
    expect(hrefs).toEqual(
      expect.arrayContaining([
        '/assets/ui/logo/icones/favicon-v1.ico',
        '/assets/ui/logo/icones/favicon-v1-32.png',
        '/assets/ui/logo/icones/favicon-v1-16.png',
        '/assets/ui/logo/icones/apple-touch-icon-v1-180.png',
        '/assets/ui/logo/splash-v1-1920x1080.webp',
      ]),
    );
    for (const h of hrefs.filter((h) => h.startsWith('/assets/ui/logo/'))) expect(existsSync(noPublic(h)), h).toBe(true);
    expect(html).toMatch(/<link rel="preload" href="\/assets\/ui\/logo\/splash-v1-1920x1080\.webp" as="image" type="image\/webp"/);
    expect(html).toMatch(/<link rel="apple-touch-icon" sizes="180x180"/);
  });

  it('o /favicon.ico da raiz é o mesmo arquivo do .ico da marca (os navegadores o pedem sozinhos)', () => {
    expect(readFileSync('public/favicon.ico').equals(readFileSync('public/assets/ui/logo/icones/favicon-v1.ico'))).toBe(true);
  });

  it('theme-color #070b15 (o azul-marinho do ícone) e Open Graph sem og:image absoluta por ora', () => {
    expect(html).toContain('<meta name="theme-color" content="#070b15" />');
    expect(html).not.toContain('content="#000000"');
    expect(html).toContain('<meta property="og:title" content="InnoFighters" />');
    expect(html).toContain('<meta name="twitter:card" content="summary_large_image" />');
    expect(html).not.toMatch(/<meta[^>]*og:image/); // exige URL absoluta: só no domínio definitivo
  });

  it('as metas do iPhone e o manifest continuam (tela cheia): capable, status bar, título, manifest', () => {
    expect(html).toContain('<meta name="apple-mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<meta name="mobile-web-app-capable" content="yes" />');
    expect(html).toContain('<link rel="manifest" href="/manifest.webmanifest" />');
  });
});

describe('manifest.webmanifest: ícones e cores da marca nova', () => {
  it('cores #070b15 e os 3 ícones novos (192 e 512 "any", 512 "maskable"), todos existentes e com o tamanho declarado', () => {
    expect([manifest.background_color, manifest.theme_color]).toEqual(['#070b15', '#070b15']);
    expect(manifest.icons.map((i) => [i.src, i.sizes, i.purpose])).toEqual([
      ['assets/ui/logo/icones/icone-v1-192.png', '192x192', 'any'],
      ['assets/ui/logo/icones/icone-v1-512.png', '512x512', 'any'],
      ['assets/ui/logo/icones/icone-mascaravel-v1-512.png', '512x512', 'maskable'],
    ]);
    for (const i of manifest.icons) {
      expect(existsSync(noPublic(i.src)), i.src).toBe(true);
      expect(i.type).toBe('image/png');
      // PNG: a largura e a altura moram nos bytes 16..23 do IHDR
      const png = readFileSync(noPublic(i.src));
      expect(`${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`, i.src).toBe(i.sizes);
    }
  });

  it('os ícones provisórios (emblema + IF) foram removidos: nada em public/icons e nada no código os cita', () => {
    expect(existsSync('public/icons')).toBe(false);
    for (const f of ['index.html', 'public/manifest.webmanifest', 'src/input/toque.css', 'src/ui/logo.ts']) expect(readFileSync(f, 'utf8'), f).not.toMatch(/\/icons\/icone|icons\/icone/);
  });
});

describe('peso da marca (orçamento do Apolo, docs/logo-oficial.md §3)', () => {
  const kb = (arq: string): number => statSync(`public/assets/ui/logo/${arq}`).size / 1024;
  it('o que o jogo baixa na abertura (splash + logo completa + horizontal) fica em ~441 KB, e a principal sob o teto de 250 KB', () => {
    const total = kb('splash-v1-1920x1080.webp') + kb('logo-v1-1600.webp') + kb('logo-horizontal-v1-600.webp');
    expect(kb('logo-v1-1600.webp')).toBeLessThanOrEqual(250);
    expect(total).toBeLessThanOrEqual(460);
    expect(total).toBeGreaterThan(300); // se encolheu demais, alguém trocou o arquivo: reavaliar
  });

  it('o CSS do aviso de orientação usa a logo de 720 (114 KB), não a de 1600', () => {
    expect(readFileSync('src/input/toque.css', 'utf8')).toContain('url(/assets/ui/logo/logo-v1-720.webp)');
    expect(kb('logo-v1-720.webp')).toBeLessThan(130);
  });
});
