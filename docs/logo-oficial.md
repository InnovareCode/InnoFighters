# Logo oficial do InnoFighters (v1)

Data: 2026-10-22. Autor: Apolo (direção de arte). Missão `cmvixvh0k015601p7ph6y9aw6`.

A logo enviada pelo dono substitui a logo vetorial desenhada em `src/ui/logo.ts` (paleta D1, Impact). Este documento é
o contrato de uso: arquivos, medidas, regras e o passo a passo de integração para a Lyra. Nenhum código do jogo foi
alterado; nada foi commitado.

## 1. Origem e versionamento

| Arquivo | O que é |
|---|---|
| `arte-fonte/logo/logo-oficial-dono-v1.jpg` | **Original do dono, intocado** (2576 x 1438, JPEG, sem alfa, 944.037 bytes). Nunca sobrescrever. |
| `arte-fonte/logo/logo-oficial-recorte-v1.png` | Mestre sem perda do recorte com fundo transparente (1920 x 1352). Fonte de todos os derivados. |
| `arte-fonte/logo/logo-oficial-horizontal-v1.png` | Mestre da versão sem a faixa do subtítulo. |
| `arte-fonte/logo/logo-oficial-monograma-inno-v1.png` | Mestre do monograma INNO. |
| `arte-fonte/logo/logo-oficial-placa-v1.png` | Mestre da alternativa "placa" (logo + fundo original fundido por vinheta). |
| `arte-fonte/logo/logo-oficial-icone-arte-v1.png` | Mestre da arte dos ícones (dragões + globo + INNO). |
| `arte-fonte/logo/pipeline/` | Scripts que geram tudo (seção 9). |

Regra: uma logo nova do dono entra como `logo-oficial-dono-v2.jpg`; os derivados dela ganham `-v2` no nome (inclusive
em `public/`, o que também quebra o cache do navegador sem truque de query string).

## 2. Como o fundo foi removido (e por que não há halo)

O fundo da arte não é uma cor: é um gradiente azul-marinho com vinheta e névoa de brilho ao redor da logo. Uma chave de
cor simples comeria os contornos escuros e as chamas. O recorte combina três coisas:

1. **Fundo local estimado** (convolução normalizada só sobre pixels que são fundo com certeza: escuros, lisos e pouco
   saturados), em vez de uma cor única. É ele que permite separar a névoa do brilho real.
2. **Núcleo opaco** = material sólido (dragões, placa metálica, letras, globo, faixa). Sementes por diferença de
   brilho (mais claro ou mais escuro que o fundo), fechamento de frestas de 6 px, preenchimento de buracos internos
   (miolos de letra, placa atrás de INNO/FIGHTERS, interior da faixa) e descarte de objetos pequenos. Raio azul
   saturado **não** é semente (senão a nuvem de raio virava mancha opaca). Dois buracos grandes foram marcados à mão
   como fundo de verdade (entre pescoço e garra de cada dragão) e ficam transparentes.
3. **Brilho por "color-to-alpha" com desmultiplicação**: fora do núcleo, cada pixel vira a menor opacidade que
   reproduz a cor original sobre o fundo local (`F = B + (C - B) / a`). Faíscas, raios e chamas mantêm a cor e ficam
   translúcidos na medida certa; a névoa fraca (alfa < 0,06) é cortada com degrau suave, para não virar um véu em volta
   da logo. Onde o limite do núcleo atravessa chama (zona do fogo, lado direito/baixo), a borda é alargada para ~20 px
   em vez de 1 px, para não aparecer degrau dentro da labareda.

Redimensionamentos são feitos com alfa **premultiplicado** (sharp/libvips; `RGBa` no Pillow): sem franja escura.

### Prova (medida, não dedução)

- **Reconstrução**: o recorte composto de volta sobre o fundo local reproduz o original com diferença média de
  0,08/255 dentro do núcleo; fora dele, 2,2/255 (p99 19,6), que é exatamente a névoa removida de propósito
  (`arte-fonte/capturas/logo-oficial-v1-comparacao-original.png`: original, reconstrução, diferença x4).
- **Fundos de teste** (branco, cinza, preto, magenta, xadrez, céu): `logo-oficial-v1-fundos-teste.png`. Bordas em
  resolução cheia, original x branco x magenta x verde: `logo-oficial-v1-bordas-zoom.png`.
- **No jogo real** (servidor de dev, fundo desenhado pelo motor, logo nova por cima): título sobre jp, cn, kr e br
  (`logo-oficial-v1-titulo-*.png`). O br (praia ao pôr do sol, o cenário mais claro do ciclo) era o caso de risco: a
  logo lê limpa, sem halo escuro nem véu.

### Limites honestos do recorte

- Sobre **branco puro** o brilho aditivo (raio, chama) vira uma névoa clara tingida: é física, brilho não existe sobre
  branco. Por isso existe a placa (seção 3) para fundos claros e chapados.
- Em 3 ou 4 pontos da borda interna dos dragões (frestas fechadas pelo núcleo) sobra um entalhe azul-marinho de
  poucos px, visível só sobre branco/magenta em zoom. Nos cenários do jogo some no escuro do contorno.
- O recorte limpo **foi possível em todas as regiões**; a placa não é remendo de falha, é variante de uso.

## 3. Arquivos entregues x em uso (2026-10-22)

**Em uso (ficam em `public/assets/ui/logo/`, são o que vai para o site; varredura de referências no `src`, `index.html`, manifest e testes):** as linhas da tabela abaixo.

**Entregues e NÃO usadas pelo jogo** (movidas para `arte-fonte/logo/webp-entregues-nao-usadas/`, fora do `public/` para não pesar no build; voltam para `public/` quando uma tela passar a usá-las, e então ganham referência no código e teste): a lista fica depois da tabela. Peso de `public/assets/ui/logo`: **1592 KB -> 744 KB**.

Tabela dos arquivos EM USO:

KB = KiB (bytes/1024). Todos medidos no arquivo final (`sharp.metadata` + tamanho em disco).

| Arquivo | Dimensões | KB | Alfa | Uso |
|---|---|---|---|---|
| `logo-v1-1600.webp` | 1600 x 1127 | 242,2 | sim | **Principal**: título, abertura (2x da maior área de desenho) |
| `logo-v1-720.webp` | 720 x 507 | 114,3 | sim | Média: **aviso de orientação (`#rot`)**; também pausa e créditos, se vierem |
| `logo-horizontal-v1-600.webp` | 600 x 336 | 76,4 | sim | Sem a faixa, **menu** |
| `splash-v1-1920x1080.webp` | 1920 x 1080 | 122,8 | não | Tela de carregamento (boot), logo no terço de cima |
| `icones/apple-touch-icon-v1-180.png` | 180 x 180 | 13,9 | não | Ícone do iPhone/iPad |
| `icones/icone-v1-192.png` | 192 x 192 | 15,5 | não | Manifest, `purpose: any` |
| `icones/icone-v1-512.png` | 512 x 512 | 71,3 | não | Manifest, `purpose: any` |
| `icones/icone-mascaravel-v1-512.png` | 512 x 512 | 50,0 | não | Manifest, `purpose: maskable` |
| `icones/favicon-v1-32.png` | 32 x 32 | 2,0 | sim | Favicon |
| `icones/favicon-v1-16.png` | 16 x 16 | 0,8 | sim | Favicon |
| `icones/favicon-v1.ico` | 16 + 32 + 48 | 6,7 | sim | `/favicon.ico` (contêiner ICO com PNG dentro) |

### Entregues e fora do `public/` (não usadas hoje)

| Arquivo (`arte-fonte/logo/webp-entregues-nao-usadas/`) | Dimensões | KB | Alfa | Uso previsto |
|---|---|---|---|---|
| `logo-v1-360.webp` | 360 x 254 | 47,2 | sim | Pequena: aviso de orientação em celular baixo, HTML |
| `logo-v1-720.png` | 720 x 507 | 141,4 | sim | Reserva PNG (256 cores) onde WebP não entra |
| `logo-horizontal-v1-1200.webp` | 1200 x 673 | 154,1 | sim | Sem a faixa do subtítulo, grande |
| `logo-monograma-inno-v1-800.webp` | 800 x 318 | 47,2 | sim | Monograma INNO (selos, HUD, marca d'água) |
| `logo-monograma-inno-v1-400.webp` | 400 x 159 | 15,3 | sim | Monograma pequeno |
| `logo-placa-v1-1600.webp` | 1600 x 1127 | 211,9 | sim | Alternativa: logo + fundo escuro fundido (fundos claros/chapados) |
| `splash-v1-960x540.webp` | 960 x 540 | 44,0 | não | Mesmo splash, metade (pré-carga leve, se preferir) |
| `og-v1-1200x630.jpg` | 1200 x 630 | 173,9 | não | Imagem de compartilhamento (Open Graph/Twitter) |

Orçamento: principal 242,2 KB (teto 250). O que o jogo baixa na abertura com a troca proposta: splash 122,8 +
principal 242,2 + horizontal-600 76,4 = **441 KB** (a logo vetorial antiga custava 0 KB, mas dependia da fonte Impact,
que não existe em Android/Linux).

Qualidade: o 1600 está em WebP q54/alfa q55 (PSNR ~33,6 dB contra o mestre, sobre escuro e sobre cinza; erro de alfa
máx 16/255, médio 0,8). Ele é desenhado reduzido a ~0,6x no título, o que esconde a compressão. Os ícones de 512 usam
paleta de 256 cores com dithering leve (sem banda visível no gradiente).

Favicon: a arte inteira é ilegível em 16/32 px. O favicon é um derivado: **"IF"** na Barlow Condensed 800 itálica do
jogo, I no azul-metal de INNO e F na brasa de FIGHTERS, sobre placa azul-marinho com aro dourado (sem aro no 16),
rasterizado direto em 16/32/48 (sem reduzir de grande). Lê nas abas clara e escura
(`logo-oficial-v1-favicon.png`).

## 4. Proporção e ancoragem

| Peça | Proporção (L:A) | Ancoragem |
|---|---|---|
| Principal (e placa) | 1,4201 (1920 x 1352) | **Centro da imagem.** A massa opaca (alfa > 200) vai de x 14..1902, y 37..1331 no mestre: centro (958, 684) contra o centro geométrico (960, 676), desvio de 0,6% para baixo, desprezível. Respiro transparente embutido: ~3% no topo, ~2% embaixo (faíscas). |
| Horizontal | 1,7831 (1200 x 673) | Centro da imagem. A parte de baixo some em degradê nas laterais (caudas e chamas) e é cortada firme sob FIGHTERS. |
| Monograma INNO | 2,516 (800 x 318) | Centro. Paralelogramo itálico da placa de INNO. |
| Ícones | 1:1 | Arte centrada; no máscaravel a arte cabe no círculo de raio 0,4 x lado. |

Medida do máscaravel (arquivo final, pixels que diferem do fundo): arte em x 81..429, y 166..345; raio máximo a partir
do centro **180,9 px**, limite da zona segura **204,8 px** (80% do diâmetro). Previsto e conferido nas máscaras
círculo, squircle e gota (`logo-oficial-v1-icone-mascaravel.png`). O `icone-v1-512` (any) usa 92% da largura e passa da
zona segura de propósito: por isso não pode ser declarado como maskable.

## 5. Regras de uso

- **Respiro mínimo**: 6% da altura da logo em volta da caixa da imagem, sem texto, botão ou HUD (faíscas podem invadir,
  são brilho).
- **Fundo**: o recorte foi validado sobre os 4 cenários do ciclo do título (jp, cn, kr, br) com a gradação do título.
  Sobre fundo claro chapado (branco, céu limpo, papel), ou atrás de padrões de alto contraste, use a **placa**. Não
  coloque sobre azul saturado na faixa do INNO (#2f74ff..#8cc4ff) sem placa.
- **Tamanho mínimo**: logo completa com altura >= 100 px lógicos (200 px de canvas); abaixo disso a faixa
  "TORNEIO MUNDIAL..." não lê. Entre 40 e 100 px lógicos, use a **horizontal**. Abaixo de 40, monograma INNO; abaixo de
  24, o "IF" do favicon.
- **Nunca**: recolorir, distorcer, girar, aplicar contorno/sombra extra, recortar os dragões, redesenhar com fonte, pôr
  o emblema/anel antigo (`desenharEmblema`) atrás (a arte já tem globo e dragões), escrever o subtítulo de novo por
  cima ou embaixo (ele está na faixa).
- **Desenho no canvas**: `ctx.imageSmoothingQuality = 'high'` ao reduzir; escolha a menor variante cuja largura seja
  >= largura desenhada x RS (RS = 2).

## 6. Layout proposto por tela (px lógicos 960 x 540, RS = 2)

Valores usados nas prévias renderizadas no jogo real. A Lyra deve medir no navegador antes de dar por pronto
(skill `medir-antes-de-afirmar`); são a direção de arte, não uma medida do código dela.

| Tela | Peça | Retângulo | Observações |
|---|---|---|---|
| Título | `logo-v1-1600.webp` | altura 330, largura 468,6, centro x 480, topo y 4 (+ flutuação `sin(t/45)*3`) | Remover o subtítulo desenhado (y 284 e traços) e o `desenharEmblema`. "PRESSIONE ENTER" desce para y 352 (faixa 337..367). Os raios de luz podem nascer no globo (y ~50) em vez de `LOGO_Y` 142. Prévias: `logo-oficial-v1-titulo-{jp,cn,kr,br}.png`. |
| Menu | `logo-horizontal-v1-600.webp` | altura 86, largura 153,3, centro (124, 50) | Cabe acima dos itens (que começam em y 100). Prévia: `logo-oficial-v1-menu.png`. |
| Carregamento (boot) | `splash-v1-1920x1080.webp` | tela cheia (0, 0, 960, 540) | Substitui gradiente roxo + emblema + logo. Medido no arquivo: a arte do splash (pixels saturados ou claros) vai de y 28 a 696 de 1080, ou seja, y 14..348 lógicos; a barra (y 350..364) e o "Carregando arte..." (y 390) ficam livres, com 2 px de folga sob a ponta do escudo (se a barra descer 6 a 10 px, respira melhor). Prévia: `logo-oficial-v1-carregamento.png`. |
| Abertura (intro) | `logo-v1-1600.webp` | mesmo retângulo do título, multiplicado pelo `sc` da animação de impacto | As faíscas do impacto continuam na família brasa. |
| Aviso de orientação (HTML `#rot`) | `logo-v1-720.webp` | `min(86vw, 420px)` de largura, acima do texto | CSS na seção 7. Precisa ficar ACIMA da camada de toque (`#touch`); hoje o `#rot` tem `z-index: 4` e os botões aparecem por cima. Prévia: `logo-oficial-v1-aviso-orientacao.png` (iPhone 13, 390 x 844). |
| Título, variante | `logo-placa-v1-1600.webp` | igual ao título | Opcional. Mais "contida" no br; perde um pouco da integração com o cenário. Prévias: `-titulo-br-placa.png`, `-titulo-jp-placa.png`. Recomendação: **recorte**. |

## 7. Passo a passo para a Lyra

1. **Carga**: a logo passa a ser imagem. Entrar no carregador de recursos do jogo como prioridade (antes da arte de
   lutadores). O boot desenha o splash ENQUANTO carrega o resto, então o splash precisa existir antes: pré-carga no
   `index.html` e, até decodificar, cair no gradiente atual. Pré-redimensionar uma vez para o tamanho desenhado
   (`createImageBitmap` com `resizeWidth`/`resizeQuality: 'high'`, ou canvas fora da tela) evita reduzir 1600 px a
   cada quadro no celular.
2. **`src/ui/logo.ts`**: trocar `obterLogo`/`PALAVRAS`/máscara vetorial pela imagem. Sugestão de API:
   `desenharLogo(ctx, x, y, altura, shine, alpha)` centrada em (x, y), escolhendo a variante pela largura em canvas.
   O brilho que atravessa (`shine`) é opcional: se mantido, faça num canvas do tamanho desenhado com
   `source-atop` (só onde há logo), faixa `rgba(236,244,255,.35)`, somente durante a varredura. `desenharEmblema` sai de
   título, boot e abertura. `PALETA_MARCA.brasas` continua valendo (é o fogo de FIGHTERS). `GAME_NAME`, `STAGE_OF`,
   ciclo de cenários, `Brasas`, `fileiraDeHerois` não mudam.
3. **Cenas**: `cenas/title.ts` (seção 6; tirar o subtítulo desenhado, mover CTA e recorde), `cenas/menu.ts`
   (horizontal), `cenas/boot.ts` (splash), `cenas/intro.ts` (novo tamanho no impacto).
4. **Aviso de orientação** (`src/input/toque.css`, regra `#rot`), validado na prévia:
   ```css
   #rot { top: 0; bottom: 0; display: none; flex-direction: column; align-items: center; justify-content: center;
          gap: 28px; padding: 0 24px; z-index: 50; color: #e8ecff;
          background: radial-gradient(120% 70% at 50% 38%, #26324a 0%, #0b1120 55%, #05070d 100%); }
   #rot::before { content: ''; width: min(86vw, 420px); aspect-ratio: 1600 / 1127;
                  background: url(/assets/ui/logo/logo-v1-720.webp) center / contain no-repeat; }
   @media (orientation: portrait) { #rot { display: flex; } }
   ```
   (`z-index` acima da camada `#touch`; conferir o valor real dela.)
5. **`index.html`** (`<head>`):
   ```html
   <link rel="icon" href="/assets/ui/logo/icones/favicon-v1.ico" sizes="16x16 32x32 48x48" />
   <link rel="icon" type="image/png" sizes="32x32" href="/assets/ui/logo/icones/favicon-v1-32.png" />
   <link rel="icon" type="image/png" sizes="16x16" href="/assets/ui/logo/icones/favicon-v1-16.png" />
   <link rel="apple-touch-icon" sizes="180x180" href="/assets/ui/logo/icones/apple-touch-icon-v1-180.png" />
   <link rel="preload" href="/assets/ui/logo/splash-v1-1920x1080.webp" as="image" type="image/webp" />
   <meta name="theme-color" content="#070b15" />
   <meta property="og:title" content="InnoFighters" />
   <meta property="og:description" content="Torneio Mundial de Artes Marciais. Jogo de luta 2D no navegador." />
   <meta property="og:image" content="https://<DOMINIO-FINAL>/assets/ui/logo/og-v1-1200x630.jpg" />
   <meta property="og:image:width" content="1200" /><meta property="og:image:height" content="630" />
   <meta name="twitter:card" content="summary_large_image" />
   ```
   Substitui o `apple-touch-icon` atual (`/icons/icone-180.png`). `og:image` exige URL absoluta: só faz sentido no
   domínio definitivo (o site atual é teste com `noindex`). Copiar `favicon-v1.ico` também para `public/favicon.ico`
   (navegadores pedem `/favicon.ico` sozinhos). Se o site rodar em subpasta, ajustar os caminhos ao `base` do Vite.
6. **`public/manifest.webmanifest`**: ícones → `assets/ui/logo/icones/icone-v1-192.png` (any),
   `icone-v1-512.png` (any), `icone-mascaravel-v1-512.png` (maskable); `background_color` e `theme_color` → `#070b15`
   (o azul-marinho do ícone; o splash do Android é montado com eles). Os antigos em `public/icons/` ficam órfãos:
   remover depois da troca.
7. **CSP**: nada muda (`img-src 'self'` cobre tudo; os arquivos são do próprio site).
8. **Testes que quebram de propósito** (avisar a Íris): `tests/e2e/logo.spec.ts` e `tests/unit/logo.test.ts` medem a
   logo vetorial (0 pixel frio, horizonte, paleta, Impact) e devem ser reescritos para a imagem (carregou, dimensões,
   retângulo desenhado, ausência do subtítulo duplicado). `tests/e2e/fidelidade-ui.spec.ts` desliga `marca.*` e
   compara o resto com o protótipo: título (CTA movido, subtítulo removido), boot (splash) e menu passam a divergir.

## 8. O que NÃO foi medido

- Instalação real em iPhone/Android (o ícone de iPhone e as máscaras são simulações em Python com a geometria das
  plataformas; o 180 px está em tamanho real 3x).
- Prévia de compartilhamento em WhatsApp/Facebook/X (só o arquivo 1200 x 630 foi conferido).
- O brilho que atravessa (`shine`) e a animação de impacto da abertura com a imagem nova.
- Custo por quadro de desenhar a imagem em celular fraco; memória decodificada: principal 7,2 MB, placa 7,2 MB,
  splash 8,3 MB (RGBA). Daí a recomendação de pré-redimensionar.
- Cenários além dos 4 da vitrine do título (os novos lutadores têm cenários próprios; o título só cicla a vitrine).

## 9. Como regenerar (`arte-fonte/logo/pipeline/`)

Requer Python com Pillow + numpy e o `sharp`/`playwright` do projeto. Rodar fora do projeto (pasta temporária) e
apontar a saída:

1. `python recorte.py <original.jpg> <tmp>` → `recorte_rgba.png` (chama `componentes.mjs` para rotular buracos).
2. `python mestres.py <tmp>/recorte_rgba.png <original.jpg> <tmp>/m` → mestres PNG (principal, horizontal, monograma,
   placa, ícones, og, splash).
3. `node favicon.mjs <tmp>/m` → "IF" em 16/32/48/256.
4. `node gerar.mjs <tmp>/m <projeto>/public/assets/ui/logo <projeto>/arte-fonte/logo` → WebP/PNG/JPG/ICO + mestres.
5. Prévias: `previa.mjs` e `aviso.mjs` (servidor de dev em `127.0.0.1:5191`, nunca 5173/5174), `icones_previa.py`,
   `fundos.py`, `zoom.py`.

Parâmetros de direção de arte que estão no código e mudam com uma logo nova: pontos de fundo real
(`EXCL` em `recorte.py`), zona das chamas (polígono em `recorte.py`), polígono do INNO, corte da horizontal e caixa do
ícone (`mestres.py`).
