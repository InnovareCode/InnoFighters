/**
 * Núcleo PURO do pipeline de sprites (F2): só funções sobre buffers, sem disco e sem `sharp`.
 * Tudo aqui é testável com imagens sintéticas (tests/unit/sprites-nucleo.test.ts).
 *
 * Convenções:
 *  - imagem RGB  = { largura, altura, dados: Uint8Array(l*a*3) }
 *  - alfa        = Uint8Array(l*a), 0 = fundo, 255 = figura
 *  - caixa       = { x0, y0, x1, y1 } com x1/y1 INCLUSIVOS (último pixel ocupado)
 *
 * Regras vindas da curadoria do Apolo (docs/handoff-apolo-folhas1-novos.md e -aminu-f2-f4.md):
 *  recorte por COMPONENTE CONEXO (nunca grade 600x597), 2 px de borda cortados antes da chave de cor,
 *  chave com tolerância + anti-halo, margem antes de normalizar, sem normalizar altura quadro a quadro.
 */

// ---------------------------------------------------------------------------------------------------------------
// 1. Borda e fundo
// ---------------------------------------------------------------------------------------------------------------

/** Remove `n` px de cada lado (a Runway deixa ruído na última linha: handoff-apolo-folhas1-novos.md, CAMILLE). */
export function cortarBorda(img, n) {
  const largura = img.largura - 2 * n;
  const altura = img.altura - 2 * n;
  if (n < 0 || largura <= 0 || altura <= 0) throw new Error(`cortarBorda(${n}): imagem ${img.largura}x${img.altura} pequena demais`);
  const dados = new Uint8Array(largura * altura * 3);
  for (let y = 0; y < altura; y++) {
    const de = ((y + n) * img.largura + n) * 3;
    dados.set(img.dados.subarray(de, de + largura * 3), y * largura * 3);
  }
  return { largura, altura, dados };
}

/**
 * Acrescenta `esquerda/direita/topo/base` px de fundo chapado (a cor `fundo`) ao redor da imagem. Serve a folhas em que
 * um traço da figura TANGENCIA a borda (a mão do BAATAR na B9 v2 toca x=0): `cortarBorda` tiraria mais 2 px da ponta
 * dos dedos, então se dá margem ANTES de cortar (a margem acolchoada, não a arte, é o que sobra cortada). Pura.
 */
export function acolchoarRgb(img, fundo, { esquerda = 0, direita = 0, topo = 0, base = 0 } = {}) {
  if ([esquerda, direita, topo, base].some((v) => !Number.isInteger(v) || v < 0)) {
    throw new Error('acolchoarRgb: margens devem ser inteiros >= 0');
  }
  const largura = img.largura + esquerda + direita;
  const altura = img.altura + topo + base;
  const dados = new Uint8Array(largura * altura * 3);
  for (let p = 0; p < largura * altura; p++) {
    dados[p * 3] = fundo[0];
    dados[p * 3 + 1] = fundo[1];
    dados[p * 3 + 2] = fundo[2];
  }
  for (let y = 0; y < img.altura; y++) {
    const de = y * img.largura * 3;
    dados.set(img.dados.subarray(de, de + img.largura * 3), ((y + topo) * largura + esquerda) * 3);
  }
  return { largura, altura, dados };
}

/**
 * Cor do fundo = mediana por canal dos pixels de uma faixa de `faixa` px ao redor da imagem (já sem a borda
 * ruidosa). A mediana ignora um pé ou punho que chegue perto da borda. O fundo da Runway NÃO é exatamente
 * #FF00FF (mediu ≈ 254,37,248 e deriva para 250,49,241 embaixo): por isso se mede, não se assume.
 */
export function estimarFundo(img, faixa = 8) {
  const { largura: l, altura: a, dados } = img;
  const f = Math.min(faixa, Math.floor(Math.min(l, a) / 2));
  const hist = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let total = 0;
  for (let y = 0; y < a; y++) {
    const naLinhaDeBorda = y < f || y >= a - f;
    for (let x = 0; x < l; x++) {
      if (!naLinhaDeBorda && x >= f && x < l - f) {
        x = l - f - 1; // pula o miolo da linha
        continue;
      }
      const i = (y * l + x) * 3;
      hist[0][dados[i]]++;
      hist[1][dados[i + 1]]++;
      hist[2][dados[i + 2]]++;
      total++;
    }
  }
  const mediana = (h) => {
    let acc = 0;
    for (let v = 0; v < 256; v++) {
      acc += h[v];
      if (acc * 2 >= total) return v;
    }
    return 255;
  };
  return [mediana(hist[0]), mediana(hist[1]), mediana(hist[2])];
}

const CHAVES = { magenta: [255, 0, 255], verde: [0, 255, 0] };

/** 'magenta' | 'verde' conforme o fundo medido estiver perto de #FF00FF ou #00FF00; null se nenhum dos dois. */
export function detectarChave(fundo, distanciaMaxima = 110) {
  let melhor = null;
  let menor = Infinity;
  for (const [nome, ref] of Object.entries(CHAVES)) {
    const d = Math.hypot(fundo[0] - ref[0], fundo[1] - ref[1], fundo[2] - ref[2]);
    if (d < menor) {
      menor = d;
      melhor = nome;
    }
  }
  return menor <= distanciaMaxima ? melhor : null;
}

// ---------------------------------------------------------------------------------------------------------------
// 2. Chave de cor com anti-halo
// ---------------------------------------------------------------------------------------------------------------

/**
 * Alfa por distância euclidiana ao fundo: <= tolerancia => 0; >= tolerancia + suavidade => 255; rampa linear no meio.
 * A rampa é o que dá borda suave (sem serrilhado) e é a primeira metade do anti-halo.
 */
export function calcularAlfa(img, fundo, { tolerancia = 48, suavidade = 70 } = {}) {
  const { largura: l, altura: a, dados } = img;
  const alfa = new Uint8Array(l * a);
  const [fr, fg, fb] = fundo;
  const t0 = tolerancia * tolerancia;
  const faixa = suavidade;
  for (let p = 0, i = 0; p < alfa.length; p++, i += 3) {
    const dr = dados[i] - fr;
    const dg = dados[i + 1] - fg;
    const db = dados[i + 2] - fb;
    const d2 = dr * dr + dg * dg + db * db;
    if (d2 <= t0) continue;
    const d = Math.sqrt(d2) - tolerancia;
    alfa[p] = d >= faixa ? 255 : Math.round((d / faixa) * 255);
  }
  return alfa;
}

/** Dilatação por caixa (Chebyshev) de raio `r` sobre uma máscara 0/1 (separável: O(n)). */
export function dilatar(mascara, largura, altura, r) {
  if (r <= 0) return Uint8Array.from(mascara);
  const meio = new Uint8Array(mascara.length);
  for (let y = 0; y < altura; y++) {
    const linha = y * largura;
    for (let x = 0; x < largura; x++) {
      if (!mascara[linha + x]) continue;
      const de = Math.max(0, x - r);
      const ate = Math.min(largura - 1, x + r);
      for (let k = de; k <= ate; k++) meio[linha + k] = 1;
    }
  }
  const saida = new Uint8Array(mascara.length);
  for (let x = 0; x < largura; x++) {
    for (let y = 0; y < altura; y++) {
      if (!meio[y * largura + x]) continue;
      const de = Math.max(0, y - r);
      const ate = Math.min(altura - 1, y + r);
      for (let k = de; k <= ate; k++) saida[k * largura + x] = 1;
    }
  }
  return saida;
}

/** Quanto do fundo "vaza" num pixel: magenta => min(R,B) - G; verde => G - max(R,B). Sempre >= 0. */
export function vazamento(r, g, b, chave) {
  return chave === 'magenta' ? Math.max(0, Math.min(r, b) - g) : Math.max(0, g - Math.max(r, b));
}

/**
 * Despill (anti-halo, 2ª metade): na faixa de `raio` px junto à borda da figura (e em todo pixel semitransparente)
 * remove o vazamento da cor do fundo. Magenta: tira de R e B o excesso sobre G (pixel 200,60,190 vira 70,60,60:
 * um cinza escuro, não um rosa). Pele/branco/amarelo não têm esse excesso, então ficam intactos. FORA da borda não
 * mexe em nada: o verde da faixa do HAYATO só seria afetado se a chave fosse verde, e a chave dele é magenta.
 * Devolve uma CÓPIA da imagem.
 */
export function despill(img, alfa, chave, raio = 2) {
  const { largura: l, altura: a } = img;
  const dados = Uint8Array.from(img.dados);
  const naoOpaco = new Uint8Array(l * a);
  for (let p = 0; p < naoOpaco.length; p++) naoOpaco[p] = alfa[p] < 255 ? 1 : 0;
  const perto = dilatar(naoOpaco, l, a, raio);
  for (let p = 0; p < perto.length; p++) {
    if (!perto[p] || alfa[p] === 0) continue;
    const i = p * 3;
    const v = vazamento(dados[i], dados[i + 1], dados[i + 2], chave);
    if (v === 0) continue;
    if (chave === 'magenta') {
      dados[i] -= v;
      dados[i + 2] -= v;
    } else {
      dados[i + 1] -= v;
    }
  }
  return { largura: l, altura: a, dados };
}

/**
 * Métrica de halo: entre os pixels de borda (alfa > 0 e a até `raio` px de um pixel transparente), a fração cuja cor
 * ainda vaza o fundo acima de `limiar`. 0 = borda limpa. Usada pelo relatório e pelos testes.
 */
export function medirHalo(img, alfa, chave, { raio = 2, limiar = 30 } = {}) {
  const { largura: l, altura: a, dados } = img;
  const transparente = new Uint8Array(l * a);
  for (let p = 0; p < transparente.length; p++) transparente[p] = alfa[p] === 0 ? 1 : 0;
  const perto = dilatar(transparente, l, a, raio);
  let borda = 0;
  let sujos = 0;
  for (let p = 0; p < perto.length; p++) {
    if (!perto[p] || alfa[p] === 0) continue;
    borda++;
    const i = p * 3;
    if (vazamento(dados[i], dados[i + 1], dados[i + 2], chave) > limiar) sujos++;
  }
  return { borda, sujos, fracao: borda === 0 ? 0 : sujos / borda };
}

// ---------------------------------------------------------------------------------------------------------------
// 3. Componentes conexos
// ---------------------------------------------------------------------------------------------------------------

/** Máscara 0/1 = alfa >= limiar (o "miolo" que decide a conectividade; a franja suave fica de fora). */
export function mascaraDeAlfa(alfa, limiar = 64) {
  const m = new Uint8Array(alfa.length);
  for (let p = 0; p < alfa.length; p++) m[p] = alfa[p] >= limiar ? 1 : 0;
  return m;
}

/**
 * Rotula componentes conexos (8-vizinhança) de uma máscara 0/1, com pilha explícita (sem recursão: a figura tem
 * centenas de milhares de pixels). Rótulos começam em 1; 0 = fundo.
 */
export function rotular(mascara, largura, altura) {
  const rotulos = new Int32Array(mascara.length);
  const componentes = [];
  const pilha = new Int32Array(mascara.length);
  for (let inicio = 0; inicio < mascara.length; inicio++) {
    if (!mascara[inicio] || rotulos[inicio]) continue;
    const id = componentes.length + 1;
    const c = { id, area: 0, x0: largura, y0: altura, x1: -1, y1: -1, somaX: 0, somaY: 0 };
    let topo = 0;
    pilha[topo++] = inicio;
    rotulos[inicio] = id;
    while (topo > 0) {
      const p = pilha[--topo];
      const y = (p / largura) | 0;
      const x = p - y * largura;
      c.area++;
      c.somaX += x;
      c.somaY += y;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= altura) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= largura || (dx === 0 && dy === 0)) continue;
          const q = ny * largura + nx;
          if (mascara[q] && !rotulos[q]) {
            rotulos[q] = id;
            pilha[topo++] = q;
          }
        }
      }
    }
    componentes.push(c);
  }
  return { rotulos, componentes };
}

/** Distância (Chebyshev) entre as caixas de dois componentes; 0 se se tocam ou se sobrepõem. */
export function distanciaEntreCaixas(a, b) {
  const dx = Math.max(0, a.x0 - b.x1, b.x0 - a.x1);
  const dy = Math.max(0, a.y0 - b.y1, b.y0 - a.y1);
  return Math.max(dx, dy);
}

/**
 * Agrupa componentes em FIGURAS. Componente "grande" = área >= `fracao` da área do esperado-ésimo maior (o
 * 12º, numa folha de 12 poses). Pedaços pequenos (dedo solto, ponta de cabelo, fita) a até `raioFusao` px de uma
 * figura entram nela; o resto é ruído e vai para `descartados`. Não decide quantas figuras há: devolve o que achou
 * e quem chama confere (`avisos` do executor).
 */
export function agruparFiguras(componentes, { esperado = 12, fracao = 0.1, raioFusao = 24 } = {}) {
  const porArea = [...componentes].sort((a, b) => b.area - a.area);
  if (porArea.length === 0) return { figuras: [], descartados: [], limiarArea: 0 };
  const ref = porArea[Math.min(esperado, porArea.length) - 1].area;
  const limiarArea = Math.max(1, Math.floor(ref * fracao));
  const figuras = porArea
    .filter((c) => c.area >= limiarArea)
    .map((c) => ({ ids: [c.id], x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, area: c.area, somaX: c.somaX, somaY: c.somaY }));
  const descartados = [];
  for (const c of porArea.filter((p) => p.area < limiarArea)) {
    let alvo = null;
    let menor = Infinity;
    for (const f of figuras) {
      const d = distanciaEntreCaixas(c, f);
      if (d < menor) {
        menor = d;
        alvo = f;
      }
    }
    if (alvo && menor <= raioFusao) {
      alvo.ids.push(c.id);
      alvo.x0 = Math.min(alvo.x0, c.x0);
      alvo.y0 = Math.min(alvo.y0, c.y0);
      alvo.x1 = Math.max(alvo.x1, c.x1);
      alvo.y1 = Math.max(alvo.y1, c.y1);
      alvo.area += c.area;
      alvo.somaX += c.somaX;
      alvo.somaY += c.somaY;
    } else {
      descartados.push(c);
    }
  }
  return { figuras, descartados, limiarArea };
}

/**
 * Ordena as figuras na ordem de leitura da grade (linha a linha, esquerda para a direita). As linhas NÃO se
 * decidem por y fixo (os golpes passam da linha 597): ordena pelo centro de massa vertical, parte em `linhas` grupos
 * de `colunas` e ordena cada grupo pelo centro de massa horizontal. `separadas` = false quando uma linha "invade"
 * a seguinte (sinal de que o agrupamento errou).
 */
export function ordenarGrade(figuras, colunas = 4, linhas = 3) {
  if (figuras.length !== colunas * linhas) {
    throw new Error(`ordenarGrade: esperava ${colunas * linhas} figuras, recebi ${figuras.length}`);
  }
  const cy = (f) => f.somaY / f.area;
  const cx = (f) => f.somaX / f.area;
  const porY = [...figuras].sort((a, b) => cy(a) - cy(b));
  const resultado = [];
  const faixas = [];
  for (let r = 0; r < linhas; r++) {
    const grupo = porY.slice(r * colunas, (r + 1) * colunas).sort((a, b) => cx(a) - cx(b));
    faixas.push([Math.min(...grupo.map(cy)), Math.max(...grupo.map(cy))]);
    resultado.push(...grupo);
  }
  let separadas = true;
  for (let r = 0; r + 1 < linhas; r++) if (faixas[r][1] >= faixas[r + 1][0]) separadas = false;
  return { figuras: resultado, separadas };
}

// ---------------------------------------------------------------------------------------------------------------
// 4. Recorte de uma figura
// ---------------------------------------------------------------------------------------------------------------

/**
 * Recorta uma figura da folha como RGBA, com `margem` px de transparência ao redor (margem ANTES de normalizar:
 * a reamostragem precisa de chão para não comer a ponta de um pé). Só entra o que pertence à figura: os pixels dos
 * rótulos dela dilatados em `franja` px (para guardar o anti-alias); o que é de outra figura cujo retângulo
 * invade este (nocaute mais largo que 600 px, golpes entre fileiras) vira transparente.
 * `img` já deve estar com despill; `alfa` e `rotulos` são os da folha inteira.
 */
export function recortarFigura(img, alfa, rotulos, figura, { margem = 8, franja = 3 } = {}) {
  const { largura: L, altura: A, dados } = img;
  const x0 = figura.x0 - margem;
  const y0 = figura.y0 - margem;
  const w = figura.x1 - figura.x0 + 1 + 2 * margem;
  const h = figura.y1 - figura.y0 + 1 + 2 * margem;
  const meus = new Set(figura.ids);
  // máscara dos rótulos da figura, na janela do recorte, dilatada pela franja
  const mascara = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= A) continue;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= L) continue;
      if (meus.has(rotulos[sy * L + sx])) mascara[y * w + x] = 1;
    }
  }
  const dono = dilatar(mascara, w, h, franja);
  const rgba = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= A) continue;
    for (let x = 0; x < w; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= L || !dono[y * w + x]) continue;
      const s = sy * L + sx;
      const o = (y * w + x) * 4;
      const a = alfa[s];
      rgba[o] = dados[s * 3];
      rgba[o + 1] = dados[s * 3 + 1];
      rgba[o + 2] = dados[s * 3 + 2];
      rgba[o + 3] = a;
    }
  }
  return { largura: w, altura: h, rgba };
}

/** Caixa dos pixels com alfa >= limiar num RGBA; null se não houver nenhum. */
export function caixaOpaca(rgba, largura, altura, limiar = 16) {
  let x0 = largura;
  let y0 = altura;
  let x1 = -1;
  let y1 = -1;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      if (rgba[(y * largura + x) * 4 + 3] >= limiar) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }
  return x1 < 0 ? null : { x0, y0, x1, y1 };
}

/** Corta o RGBA na caixa dada (inclusiva). */
export function cortarRgba(rgba, largura, caixa) {
  const w = caixa.x1 - caixa.x0 + 1;
  const h = caixa.y1 - caixa.y0 + 1;
  const saida = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const de = ((caixa.y0 + y) * largura + caixa.x0) * 4;
    saida.set(rgba.subarray(de, de + w * 4), y * w * 4);
  }
  return { largura: w, altura: h, rgba: saida };
}

/** Espelha um RGBA horizontalmente (para consertar uma figura virada para o lado errado sem passar pelo gerador). */
export function espelharRgba(rgba, largura, altura) {
  const saida = new Uint8Array(rgba.length);
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const de = (y * largura + x) * 4;
      const para = (y * largura + (largura - 1 - x)) * 4;
      saida[para] = rgba[de];
      saida[para + 1] = rgba[de + 1];
      saida[para + 2] = rgba[de + 2];
      saida[para + 3] = rgba[de + 3];
    }
  }
  return saida;
}

// ---------------------------------------------------------------------------------------------------------------
// 5. Âncora, ponta e rosto (medidos no quadro FINAL, já normalizado e aparado)
// ---------------------------------------------------------------------------------------------------------------

/**
 * Âncora horizontal = centro de massa X da figura (média das colunas ponderada pelo alfa), em px a partir do
 * canto esquerdo do quadro. A âncora vertical são os pés: base do quadro aparado (`y + h`), que é o contrato do C1.
 */
export function centroDeMassaX(rgba, largura, altura) {
  let soma = 0;
  let massa = 0;
  for (let y = 0; y < altura; y++) {
    for (let x = 0; x < largura; x++) {
      const a = rgba[(y * largura + x) * 4 + 3];
      if (a === 0) continue;
      soma += (x + 0.5) * a;
      massa += a;
    }
  }
  if (massa === 0) throw new Error('centroDeMassaX: quadro vazio');
  return soma / massa;
}

/**
 * Âncora horizontal pelos PÉS: meio do vão entre o pixel mais à esquerda e o mais à direita das últimas `faixa` linhas
 * da figura (a partir da linha mais baixa ocupada). Serve a quadro que balança o tronco sobre pés plantados (idle da
 * ginga): a âncora no centro de massa acompanharia o tronco e os pés patinariam no laço. Em px a partir do canto
 * esquerdo do quadro (borda do pixel: o meio de [x0, x1] ocupado é (x0 + x1 + 1) / 2).
 */
export function meioDosPes(rgba, largura, altura, { faixa = 20, limiar = 128 } = {}) {
  let base = -1;
  for (let y = altura - 1; y >= 0 && base < 0; y--) {
    for (let x = 0; x < largura; x++) if (rgba[(y * largura + x) * 4 + 3] >= limiar) { base = y; break; }
  }
  if (base < 0) throw new Error('meioDosPes: quadro vazio');
  let x0 = largura;
  let x1 = -1;
  for (let y = Math.max(0, base - Math.max(1, faixa) + 1); y <= base; y++) {
    for (let x = 0; x < largura; x++) {
      if (rgba[(y * largura + x) * 4 + 3] >= limiar) { if (x < x0) x0 = x; if (x > x1) x1 = x; }
    }
  }
  return (x0 + x1 + 1) / 2;
}

/**
 * Modo de âncora de uma pose segundo `ancora` do lutadores.json ({ "idle*": "pes" }; `*` casa qualquer sufixo, sem `*`
 * o nome é exato; vale a primeira chave que casa). Padrão 'massa' (centro de massa X). Modo desconhecido é erro: a
 * âncora errada some do olho e só aparece como pé deslizando no jogo.
 */
export function modoDeAncora(nome, ancora) {
  for (const [padrao, modo] of Object.entries(ancora ?? {})) {
    if (modo !== 'massa' && modo !== 'pes') throw new Error(`ancora "${padrao}": modo "${modo}" desconhecido (massa | pes)`);
  }
  for (const [padrao, modo] of Object.entries(ancora ?? {})) {
    const casa = padrao.endsWith('*') ? nome.startsWith(padrao.slice(0, -1)) : nome === padrao;
    if (casa) return modo;
  }
  return 'massa';
}

/**
 * Ponta do golpe: o ponto MAIS À DIREITA da figura (ela sempre olha para a direita), com y = média das linhas
 * ocupadas nas últimas `faixa` colunas (centro do punho/pé, não o canto do pixel). Em px do quadro, relativos ao
 * canto superior esquerdo. `yMax` ignora as linhas de baixo (o modo 'mao' tira a faixa dos pés). É o que o motor usa: `tipX` = alcance à frente, `tipY` = altura do golpe (data/montar.ts).
 */
export function pontaDireita(rgba, largura, altura, { faixa = 10, limiar = 128, yMax = altura, yMin = 0 } = {}) {
  const ate = Math.min(altura, Math.max(1, yMax));
  const de0 = Math.max(0, Math.min(yMin, ate - 1));
  let xMax = -1;
  for (let x = largura - 1; x >= 0 && xMax < 0; x--) {
    for (let y = de0; y < ate; y++) {
      if (rgba[(y * largura + x) * 4 + 3] >= limiar) {
        xMax = x;
        break;
      }
    }
  }
  if (xMax < 0) throw new Error('pontaDireita: quadro vazio');
  // linhas ocupadas nas últimas `faixa` colunas; fica só o grupo contíguo (vão <= 2 linhas) que contém o ponto mais
  // à direita, senão a mão e o pé que terminam na mesma coluna dariam uma média no vazio entre os dois
  const ocupada = new Uint8Array(ate);
  let yAncora = 0;
  for (let y = de0; y < ate; y++) if (rgba[(y * largura + xMax) * 4 + 3] >= limiar) { yAncora = y; break; }
  for (let x = Math.max(0, xMax - faixa + 1); x <= xMax; x++) {
    for (let y = de0; y < ate; y++) if (rgba[(y * largura + x) * 4 + 3] >= limiar) ocupada[y] = 1;
  }
  let de = yAncora;
  let ateY = yAncora;
  for (let y = yAncora - 1, vao = 0; y >= de0 && vao <= 2; y--) { if (ocupada[y]) { de = y; vao = 0; } else vao++; }
  for (let y = yAncora + 1, vao = 0; y < ate && vao <= 2; y++) { if (ocupada[y]) { ateY = y; vao = 0; } else vao++; }
  let somaY = 0;
  let n = 0;
  for (let x = Math.max(0, xMax - faixa + 1); x <= xMax; x++) {
    for (let y = de; y <= ateY; y++) {
      if (rgba[(y * largura + x) * 4 + 3] >= limiar) {
        somaY += y + 0.5;
        n++;
      }
    }
  }
  return [xMax + 1, somaY / n];
}

/**
 * `rosto` (C1) = centro do retrato quadrado de 190 px, relativo ao canto do quadro, no mesmo padrão do protótipo:
 * [headX + 6, 91] (o +6/-4 do retrato do protótipo já embutido; ver data/atlas.ts). headX = mediana das colunas
 * ocupadas nas linhas do topo (cabeça), onde as fitas da faixa pesam pouco. Escala por `alturaRef/410`.
 */
export function rostoDoQuadro(rgba, largura, altura, alturaRef, { limiar = 128 } = {}) {
  const k = alturaRef / 410;
  const linhas = Math.max(1, Math.round(0.16 * alturaRef));
  const xs = [];
  for (let y = 0; y < Math.min(linhas, altura); y++) {
    for (let x = 0; x < largura; x++) if (rgba[(y * largura + x) * 4 + 3] >= limiar) xs.push(x);
  }
  if (xs.length === 0) throw new Error('rostoDoQuadro: topo vazio');
  xs.sort((a, b) => a - b);
  const headX = xs[xs.length >> 1] + 0.5;
  return [headX + 6 * k, 91 * k];
}

// ---------------------------------------------------------------------------------------------------------------
// 6. Janela de retrato e manifesto C1 v2
// ---------------------------------------------------------------------------------------------------------------

/** Copia uma janela x0,y0,lado x lado de um RGBA; o que cai fora do quadro fica transparente. */
export function janelaRgba(rgba, largura, altura, x0, y0, lado) {
  const saida = new Uint8Array(lado * lado * 4);
  for (let y = 0; y < lado; y++) {
    const sy = y0 + y;
    if (sy < 0 || sy >= altura) continue;
    for (let x = 0; x < lado; x++) {
      const sx = x0 + x;
      if (sx < 0 || sx >= largura) continue;
      const de = (sy * largura + sx) * 4;
      saida.set(rgba.subarray(de, de + 4), (y * lado + x) * 4);
    }
  }
  return saida;
}

const arredonda = (v, casas = 2) => Math.round(v * 10 ** casas) / 10 ** casas;

/**
 * Monta o JSON do atlas C1 v2 (src/assets/manifesto.ts#validarManifesto). `quadros`: { nome: {p,x,y,w,h,ax,ponta?,rosto?} }
 * na ordem canônica. Números com 2 casas (o manifesto é lido uma vez; não vale guardar 15 casas de ruído).
 */
export function montarManifesto({ lutador, imagens, tamanho, alturaRef, quadros, retrato, filme }) {
  const saida = {};
  for (const [nome, q] of Object.entries(quadros)) {
    const o = { p: q.p, x: q.x, y: q.y, w: q.w, h: q.h, ax: arredonda(q.ax) };
    if (q.ponta) o.ponta = [arredonda(q.ponta[0]), arredonda(q.ponta[1])];
    if (q.rosto) o.rosto = [arredonda(q.rosto[0]), arredonda(q.rosto[1])];
    saida[nome] = o;
  }
  const m = { versao: 2, lutador, imagens, tamanho, alturaRef, quadros: saida };
  if (retrato) m.retrato = retrato;
  if (filme) m.filme = filme;
  return m;
}

/** Quadros da página FILME (src/assets/manifesto.ts#validarFilme): f0..f5, todos `painel: true`. */
export const QUADROS_FILME = ['f0', 'f1', 'f2', 'f3', 'f4', 'f5'];

/**
 * Confere o bloco `filme` de lutadores.json ANTES de ele ir para o atlas.json (mesmas regras do validarFilme do jogo, para o
 * erro aparecer na geração e não na luta). A página FILME NÃO é gerada pelo pipeline: vem pronta da curadoria
 * (public/assets/lutadores/<id>/filme.webp); o pipeline só repõe o bloco que o atlas.json novo perderia.
 * Devolve a lista de problemas (vazia = válido).
 */
export function validarBlocoFilme(filme) {
  const erros = [];
  if (!filme || typeof filme !== 'object') return ['filme nao e um objeto'];
  if (typeof filme.imagem !== 'string' || !/^[A-Za-z0-9._-]+\.webp$/.test(filme.imagem)) erros.push('imagem: nome de .webp sem pasta');
  if (/^atlas(-\d+)?\.webp$/.test(filme.imagem ?? '')) erros.push('imagem: nao pode ser uma pagina do atlas');
  const t = filme.tamanho;
  const [W, H] = Array.isArray(t) ? t : [];
  if (!Array.isArray(t) || t.length !== 2 || !Number.isInteger(W) || !Number.isInteger(H) || W <= 0 || H <= 0) erros.push('tamanho: [largura, altura] inteiros positivos');
  const qs = filme.quadros;
  if (!qs || typeof qs !== 'object' || Object.keys(qs).length === 0) return [...erros, 'quadros: vazio'];
  for (const [nome, q] of Object.entries(qs)) {
    if (!QUADROS_FILME.includes(nome)) { erros.push(`quadro ${nome}: so f0..f5`); continue; }
    if (q.painel !== true) erros.push(`${nome}: painel precisa ser true`);
    if ('p' in q) erros.push(`${nome}: sem campo p (a pagina e uma so)`);
    for (const c of ['x', 'y', 'w', 'h', 'ax']) if (!Number.isFinite(q[c])) erros.push(`${nome}.${c}: numero`);
    if (q.w > 0 && q.h > 0 && Number.isFinite(W) && Number.isFinite(H) && (q.x < 0 || q.y < 0 || q.x + q.w > W || q.y + q.h > H)) erros.push(`${nome}: sai da pagina ${W}x${H}`);
  }
  return erros;
}

// ---------------------------------------------------------------------------------------------------------------
// 7. Figuras coladas (o pé de uma encosta no cabelo da de baixo)
// ---------------------------------------------------------------------------------------------------------------

/** Recalcula área, caixa e somas de um componente varrendo a caixa dada (só pixels com o rótulo `id`). */
function medirRotulo(rotulos, largura, id, x0, y0, x1, y1) {
  const c = { id, area: 0, x0: Infinity, y0: Infinity, x1: -1, y1: -1, somaX: 0, somaY: 0 };
  for (let y = y0; y <= y1; y++) {
    for (let x = x0; x <= x1; x++) {
      if (rotulos[y * largura + x] !== id) continue;
      c.area++;
      c.somaX += x;
      c.somaY += y;
      if (x < c.x0) c.x0 = x;
      if (x > c.x1) c.x1 = x;
      if (y < c.y0) c.y0 = y;
      if (y > c.y1) c.y1 = y;
    }
  }
  return c;
}

/**
 * Depois de um corte reto, sobram pedaços do lado errado: a ponta do pé de cima que passou da linha, a ponta do cabelo
 * de baixo que ficou acima dela. Cada lado é rotulado de novo SEPARADAMENTE; todo pedaço que não é o corpo principal
 * do seu lado e encosta na linha de corte vai para o outro lado (onde ele se liga de verdade).
 */
function devolverPedacos(rotulos, largura, caixa, idCima, idBaixo, eixo, em) {
  const w = caixa.x1 - caixa.x0 + 1;
  const h = caixa.y1 - caixa.y0 + 1;
  const trocar = (de, para, encostaNaLinha) => {
    const mascara = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) mascara[y * w + x] = rotulos[(caixa.y0 + y) * largura + caixa.x0 + x] === de ? 1 : 0;
    }
    const { rotulos: sub, componentes } = rotular(mascara, w, h);
    if (componentes.length < 2) return;
    const principal = componentes.reduce((m, c) => (c.area > m.area ? c : m));
    const trocados = new Set(
      componentes.filter((c) => c.id !== principal.id && encostaNaLinha(c)).map((c) => c.id),
    );
    if (trocados.size === 0) return;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (trocados.has(sub[y * w + x])) rotulos[(caixa.y0 + y) * largura + caixa.x0 + x] = para;
      }
    }
  };
  const linha = em - (eixo === 'y' ? caixa.y0 : caixa.x0); // posição da linha de corte dentro da janela
  // lado de cima/esquerda: encosta na linha se a última linha/coluna dele é a anterior ao corte
  trocar(idCima, idBaixo, (c) => (eixo === 'y' ? c.y1 : c.x1) >= linha - 1);
  trocar(idBaixo, idCima, (c) => (eixo === 'y' ? c.y0 : c.x0) <= linha);
}

/**
 * Separa um componente fundido ERODINDO a máscara (raio 1, 2, 3...) até a ponte fina entre duas figuras quebrar e
 * sobrarem >= 2 miolos grandes; aí cada pixel do componente vai para o miolo mais perto (BFS multi-fonte dentro da
 * máscara), então dedo do pé e ponta de cabelo ficam com a figura a que pertencem, sem corte reto. Devolve
 * { raio, ids } (ids dos miolos; o primeiro mantém o rótulo original) ou null se nenhum raio até `raioMax` separa.
 */
function separarPorErosao(rotulos, largura, comp, novoIdInicial, limiarArea, raioMax = 12) {
  for (let r = 1; r <= raioMax; r++) {
    const x0 = comp.x0 - r - 1;
    const y0 = comp.y0 - r - 1;
    const w = comp.x1 - comp.x0 + 1 + 2 * (r + 1);
    const h = comp.y1 - comp.y0 + 1 + 2 * (r + 1);
    const alturaImg = rotulos.length / largura;
    const dentro = (x, y) => x >= 0 && y >= 0 && x < largura && y < alturaImg;
    const mascara = new Uint8Array(w * h);
    const inversa = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx = x0 + x;
        const sy = y0 + y;
        const eh = dentro(sx, sy) && rotulos[sy * largura + sx] === comp.id;
        mascara[y * w + x] = eh ? 1 : 0;
        inversa[y * w + x] = eh ? 0 : 1;
      }
    }
    const comida = dilatar(inversa, w, h, r);
    const miolo = new Uint8Array(w * h);
    for (let p = 0; p < miolo.length; p++) miolo[p] = mascara[p] && !comida[p] ? 1 : 0;
    const { rotulos: sub, componentes } = rotular(miolo, w, h);
    const grandes = componentes.filter((c) => c.area >= limiarArea).sort((a, b) => b.area - a.area);
    if (grandes.length < 2) continue;
    // BFS multi-fonte: cada pixel da máscara herda o miolo grande mais perto
    const dono = new Int32Array(w * h);
    const fila = new Int32Array(w * h);
    let ini = 0;
    let fim = 0;
    const idDe = new Map(grandes.map((c, i) => [c.id, i === 0 ? comp.id : novoIdInicial + i - 1]));
    for (let p = 0; p < miolo.length; p++) {
      const idSub = sub[p];
      if (idSub && idDe.has(idSub)) {
        dono[p] = idDe.get(idSub);
        fila[fim++] = p;
      }
    }
    while (ini < fim) {
      const p = fila[ini++];
      const y = (p / w) | 0;
      const x = p - y * w;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = ny * w + nx;
        if (mascara[q] && !dono[q]) {
          dono[q] = dono[p];
          fila[fim++] = q;
        }
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const p = y * w + x;
        if (mascara[p] && dono[p]) rotulos[(y0 + y) * largura + x0 + x] = dono[p];
      }
    }
    return { raio: r, ids: grandes.map((_, i) => (i === 0 ? comp.id : novoIdInicial + i - 1)) };
  }
  return null;
}

/**
 * Procura, na janela [de, ate] do eixo ('y' = linhas, 'x' = colunas), a linha/coluna com MENOS pixels do componente
 * (o "pescoço" por onde as duas figuras se tocam). Empate: a mais perto de `centro`.
 */
export function acharCorte(rotulos, largura, comp, eixo, de, ate, centro) {
  let melhor = -1;
  let menor = Infinity;
  for (let t = de; t <= ate; t++) {
    let n = 0;
    if (eixo === 'y') {
      for (let x = comp.x0; x <= comp.x1; x++) if (rotulos[t * largura + x] === comp.id) n++;
    } else {
      for (let y = comp.y0; y <= comp.y1; y++) if (rotulos[y * largura + t] === comp.id) n++;
    }
    if (n < menor || (n === menor && Math.abs(t - centro) < Math.abs(melhor - centro))) {
      menor = n;
      melhor = t;
    }
  }
  return { em: melhor, pixels: menor };
}

/**
 * Se há MENOS figuras grandes que `esperado`, parte o componente mais "alto" ou mais "largo" que o normal (>= 1.5x a
 * mediana das figuras grandes) no pescoço mais fino perto de 1/k do seu tamanho. Os pixels da linha de corte e dos
 * seguintes passam a ser de um rótulo novo; perde-se uns poucos px de pé/cabelo na junção (o handoff do Apolo
 * aceitou ~3 a 6 px de sola). Devolve a lista de componentes nova e os cortes feitos (para o relatório). Não mexe
 * em nada quando a contagem já bate.
 */
export function separarFundidas(rotulos, componentes, largura, altura, { esperado = 12, fracao = 0.1, razao = 1.5 } = {}) {
  const comps = componentes.map((c) => ({ ...c }));
  const cortes = [];
  for (let volta = 0; volta < esperado; volta++) {
    const { limiarArea } = agruparFiguras(comps, { esperado });
    const grandes = comps.filter((c) => c.area >= limiarArea);
    if (grandes.length >= esperado || grandes.length === 0) break;
    const mediana = (v) => [...v].sort((a, b) => a - b)[v.length >> 1];
    const mh = mediana(grandes.map((c) => c.y1 - c.y0 + 1));
    const mw = mediana(grandes.map((c) => c.x1 - c.x0 + 1));
    let alvo = null;
    let eixo = 'y';
    let k = 1;
    let pior = razao;
    for (const c of grandes) {
      const rh = (c.y1 - c.y0 + 1) / mh;
      const rw = (c.x1 - c.x0 + 1) / mw;
      if (rh >= pior) { pior = rh; alvo = c; eixo = 'y'; k = Math.round(rh); }
      if (rw >= pior) { pior = rw; alvo = c; eixo = 'x'; k = Math.round(rw); }
    }
    if (!alvo || k < 2) break;
    const proximoId = comps.reduce((m, c) => Math.max(m, c.id), 0) + 1;
    const porErosao = separarPorErosao(rotulos, largura, alvo, proximoId, limiarArea);
    if (porErosao) {
      const novos = porErosao.ids.map((id) => medirRotulo(rotulos, largura, id, alvo.x0, alvo.y0, alvo.x1, alvo.y1));
      comps.splice(comps.indexOf(alvo), 1, ...novos);
      cortes.push({ metodo: 'erosao', raio: porErosao.raio, pedacos: novos.length, area: alvo.area });
      continue;
    }
    const ini = eixo === 'y' ? alvo.y0 : alvo.x0;
    const tam = (eixo === 'y' ? alvo.y1 - alvo.y0 : alvo.x1 - alvo.x0) + 1;
    const centro = Math.round(ini + tam / k);
    const folga = Math.round(tam / k / 4);
    const { em, pixels } = acharCorte(rotulos, largura, alvo, eixo, Math.max(ini + 1, centro - folga), Math.min(ini + tam - 2, centro + folga), centro);
    const novoId = comps.reduce((m, c) => Math.max(m, c.id), 0) + 1;
    for (let y = alvo.y0; y <= alvo.y1; y++) {
      for (let x = alvo.x0; x <= alvo.x1; x++) {
        const p = y * largura + x;
        if (rotulos[p] === alvo.id && (eixo === 'y' ? y >= em : x >= em)) rotulos[p] = novoId;
      }
    }
    const caixa = { x0: alvo.x0, y0: alvo.y0, x1: alvo.x1, y1: alvo.y1 };
    devolverPedacos(rotulos, largura, caixa, alvo.id, novoId, eixo, em);
    const a = medirRotulo(rotulos, largura, alvo.id, caixa.x0, caixa.y0, caixa.x1, caixa.y1);
    const b = medirRotulo(rotulos, largura, novoId, caixa.x0, caixa.y0, caixa.x1, caixa.y1);
    comps.splice(comps.indexOf(alvo), 1, a, b);
    cortes.push({ metodo: 'corte-reto', eixo, em, pixels, area: alvo.area });
  }
  void altura;
  return { componentes: comps, cortes };
}

/** Ponta "para cima" (uppercut, soco ao céu): a linha ocupada mais alta; x = média das colunas nas `faixa` linhas do topo. */
export function pontaCima(rgba, largura, altura, { faixa = 10, limiar = 128 } = {}) {
  let yMin = -1;
  for (let y = 0; y < altura && yMin < 0; y++) {
    for (let x = 0; x < largura; x++) {
      if (rgba[(y * largura + x) * 4 + 3] >= limiar) {
        yMin = y;
        break;
      }
    }
  }
  if (yMin < 0) throw new Error('pontaCima: quadro vazio');
  let somaX = 0;
  let n = 0;
  for (let y = yMin; y < Math.min(altura, yMin + faixa); y++) {
    for (let x = 0; x < largura; x++) {
      if (rgba[(y * largura + x) * 4 + 3] >= limiar) {
        somaX += x + 0.5;
        n++;
      }
    }
  }
  return [somaX / n, yMin];
}
