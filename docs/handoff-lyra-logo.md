# Handoff Lyra: logo oficial do dono integrada

Missão `cmviz65ng019g01p7lf0d5hw0`. Base: HEAD 64f2647 + trabalho em curso de outras frentes (não commitado). Contrato de arte: `docs/logo-oficial.md` (Apolo). Decisão do Atlas: **recorte transparente** (não a placa). A D1 vetorial (Impact, emblema, anel) saiu.

## O que mudou
- `src/ui/logo.ts`: a logo passou a ser **imagem**. Saíram `PALAVRAS`, `obterLogo`, a máscara vetorial, `desenharEmblema`, `LOGO_S`, `LOGO_Y` e as cores da D1 (`PALETA_MARCA` agora só tem `brasas` e `brilho`). Entraram:
  - `iniciarMarca(base)` (chamada em `main.ts` logo depois de preparar o canvas, em paralelo com fontes/áudio/arte): baixa splash 1920x1080 (123 KB), principal 1600 (242 KB) e horizontal 600 (76 KB) = **441 KB** (o que a Apolo orçou).
  - Pré-redimensionamento **uma vez** por canvas fora da tela (937 px de largura para a principal, 307 para a horizontal, `imageSmoothingQuality 'high'`); desenhada reduzida usa a versão pronta, ampliada (o impacto da abertura chega a 3,2x) usa a original.
  - `marca = { desenharLogo, desenharLogoHorizontal, desenharSplash }`, cada uma devolvendo `false` enquanto a imagem não chegou (a cena cai no que desenhava antes). Varredura de luz (`shine` 0..1): camada `source-in` sobre a própria imagem, soma com `lighter`, só durante a varredura.
  - `LOGO_ALTURA = 330`, `LAYOUT_DA_MARCA.y = 169` (topo y 4 + metade; objeto mutável só porque o oráculo do protótipo o reajusta), `LOGO_MENU = {altura 86, x 124, y 50}`, `retanguloDaMarca`, `marcaPronta`, `reiniciarMarcaParaTeste`.
- Cenas: `title.ts` (logo 330 de altura com flutuação de 3 px; subtítulo desenhado e emblema **removidos**; faixa de luz do CTA em y 337..367, CTA em y 352, recorde em y 381), `menu.ts` (horizontal 86, centro 124,50), `boot.ts` (splash em tela cheia; antes de chegar, o gradiente de antes; a barra e os textos ficam onde estavam: a arte do splash termina em y ~348 e a barra começa em 350), `intro.ts` (mesmo retângulo x escala do impacto; sem emblema; faíscas e onda de choque nascem em `LAYOUT_DA_MARCA.y`).
- `index.html`: `theme-color #070b15`; favicon (`.ico` + png 32 + 16, o "IF" legível), `apple-touch-icon` 180 novo, `preload` do splash, metas `og:title/description/type` e `twitter:card` **sem `og:image`** (exige URL absoluta; arquivo pronto em `public/assets/ui/logo/og-v1-1200x630.jpg`, entra no domínio definitivo). `public/favicon.ico` = o mesmo `.ico`.
- `public/manifest.webmanifest`: cores `#070b15` e os 3 ícones novos (192 e 512 `any`, 512 `maskable`). **`public/icons/` removido** (os provisórios que eu tinha gerado).
- `src/input/toque.css` (`#rot`): o aviso "vire o aparelho" virou **tela cheia** com a logo de 720 acima do texto, `z-index: 50` (acima da camada de toque, que é 5), `pointer-events: none` mantido.
- `src/main.ts` (pedido do Atlas): `iniciarMarca(...)` e `verificarVersao()` no boot, com `avisar('NOVA VERSÃO NO AR. Abra as Opções e toque em atualizar.')` quando há versão mais nova.

## Medido no navegador (jogo real, Chromium; desktop 1280x720 e Pixel 7 emulado 915x412 e 844x390)
Pixels visíveis da logo (alfa > 8) em px lógicos; tela de 960x540.
| Peça | Caixa visível | Dentro da tela | Folga até o controle de toque mais próximo (px CSS) |
|---|---|---|---|
| Título (altura 330, centro 480,169) | x 248,5..711,5, y 7,5..331 | sim (flutuando +-3 px: 337 no máximo, a faixa do CTA começa em 337) | 915x412: 162,8 (soco forte); 844x390: 142,6 |
| Menu (horizontal 86, centro 124,50) | x 47,5..200, y 8..92,5 | sim; termina antes da 1ª opção (y 100) | 915x412: 190 (joystick); 844x390: 179,2 |
Retângulos: título 468,5 x 330 (topo y 4); menu 153,6 x 86 (topo y 7). Nenhum texto do menu passa por dentro da logo; nenhum controle encosta nela nos 3 perfis. Capturas em `arte-fonte/capturas/logo-oficial-integrada-{boot,abertura-impacto-t137,abertura-t151,titulo,titulo-brilho,menu}-{1280x720,915x412,844x390}.png`.
- **Imagens**: 3 arquivos 200 e `image/webp`; total <= 460 KB (medido na resposta). Bundle JS: 319,7 KB (era 318,0): o vetor saiu, o carregamento entrou. `dist/` ganha ~1,6 MB de `assets/ui/logo`, dos quais ~835 KB são variantes que o jogo NÃO usa hoje (placa, 720.png, 360, 1200, monograma, splash-960, og): ficam por contrato do Apolo (se o peso do Pages importar, mover as não usadas para `arte-fonte`).
- **Varredura de luz**: A/B de pixels com controle negativo (dois desenhos iguais = 0 pixel de diferença): 0 pixel aceso fora da logo no título e no menu; muda >2000 px no título e >150 no menu. **Impacto da abertura** com a imagem: t 121 = 2,9x a 3,2x, t 129 < 1,4x, t 160 = exatamente 330 (o tamanho do título); 0 chamadas a `createConicGradient` (anel/emblema) em boot, abertura, título e menu.
- **Boot**: a arte do splash termina antes da faixa da barra (y 350..364, x 320..640 tem < 2% de pixels de arte); antes da imagem chegar o gradiente de antes pinta e nada lança.

## Testes (atualizados conscientemente, sem `-u`)
- `tests/unit/logo.test.ts` (reescrito, 18): API das peças, retângulos e proporções exatos, pré-redimensionamento, carregamento e falha, varredura, geometria do título, ausência do desenho antigo no código.
- `tests/unit/marca-no-html.test.ts` (novo, 8): favicon/apple-touch/preload/theme-color/OG, `favicon.ico` igual ao da marca, manifest e ícones com o tamanho declarado, `public/icons` removido, peso da marca.
- `tests/e2e/logo.spec.ts` (reescrito, 11): título e menu nos 3 perfis (retângulo, CTA y 352, recorde y 381, sem subtítulo desenhado, dentro da tela, sem cobrir botão), imagens 200 e orçamento, splash/barra, abertura, varredura A/B.
- `tests/e2e/fidelidade-ui.spec.ts`: **quinta exceção** documentada no cabeçalho. As 3 peças da marca viram no-op do lado do jogo (como antes o logo e o emblema); `LAYOUT_DA_MARCA.y = 142` no oráculo (raios, onda de choque e faíscas seguem comparáveis); só os 4 casos de TÍTULO têm uma faixa de 560x130 px lógicos (x 200..760, y 270..400) **fora** da comparação (o subtítulo saiu, o CTA e o recorde desceram); o resto continua pixel a pixel. Controle negativo: mover o texto "Carregando arte..." 2 px e o rodapé do título 2 px derrubou o teste (restaurado).
- Ajustados por mudança de desenho: `celular-e7a.spec` (o aviso agora cobre a tela: confere caixa = janela, z-index > camada de toque, logo `min(86vw, 420px)` na proporção 1600:1127, texto abaixo), `toque-arte.spec` (`#rot` é `flex`), `tipografia.spec` (sem exceção de Impact: o canvas só usa Barlow), `fumaca.spec` (o canto do boot é o splash ou o gradiente), `tests/e2e-build/pwa-versao.spec.ts` (regex do apple-touch-icon).

## Verificação
`tsc` limpo; `vitest` 2201 verdes; `npm run build` ok; `test:e2e:build` 7/7; e2e completo (porta própria, 7,1 min, 253 testes ativos): tudo verde exceto `tipografia.spec.ts:39` (porta 5173 escrita no teste, artefato do ambiente; verde numa instância em 5173) e dois flakes de layout (`fumaca`, `plataforma-render-assets`) que passaram na repetição isolada, o primeiro depois do ajuste acima.
**Dois arquivos de outra frente estavam com linhas DUPLICADAS idênticas que quebravam o `tsc`** (`src/input/gamepad.ts`: `l1/l2`; `src/input/teclas.ts`: `esq` x2 e a linha do comentário): removi só as cópias, o diff desses dois arquivos contra o HEAD ficou vazio.

## Não provado / limites
- iPhone e Android reais: ícone na tela de início, favicon em abas claras e escuras, splash do Android (monta com `background_color`/`theme_color` do manifest), prévia de compartilhamento (sem `og:image` por ora).
- Custo por quadro da imagem em celular fraco não foi medido (só a decisão de reduzir uma vez); memória decodificada: principal 7,2 MB, splash 8,3 MB, horizontal e pré-reduzidas ~3 MB.
- Os 4 cenários da vitrine; os cenários novos dos lutadores novos não aparecem no título.

## Para o próximo
- Íris: no celular real, título/menu/abertura (brilho e impacto), aviso de orientação em retrato (logo no topo, botões NÃO aparecem por cima), favicon e ícone da tela de início, e se o splash aparece sem piscar o gradiente em conexão lenta.
- Atlas: definir o domínio final para pôr `og:image` absoluto; decidir se as variantes não usadas ficam no `public/`.
- Alexandria: README/CHANGELOG (logo oficial; `public/icons` removido).
