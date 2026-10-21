/**
 * Empacotador de atlas em páginas (C1 v2). Puro: recebe tamanhos, devolve posições.
 *
 * Estratégia: prateleiras (shelf) com os quadros ordenados por altura decrescente; `espaco` px de vão entre
 * quadros e na borda (o jogo desenha em posição fracionária, e sem vão a amostragem puxa o vizinho). Acha o menor
 * número de páginas na largura/altura máximas e depois ENCOLHE a altura da página (em degraus) enquanto o mesmo
 * número de páginas ainda couber, porque o manifesto tem um só `tamanho` para todas as páginas.
 */

/** Tenta empacotar numa página de largura x altura. Devolve { colocados, sobras }. */
function preencherPagina(itens, largura, altura, espaco) {
  const colocados = [];
  const sobras = [];
  let x = espaco;
  let y = espaco;
  let alturaDaPrateleira = 0;
  for (const it of itens) {
    const w = it.w;
    const h = it.h;
    if (w + 2 * espaco > largura || h + 2 * espaco > altura) {
      sobras.push(it);
      continue;
    }
    if (x + w + espaco > largura) {
      // nova prateleira
      y += alturaDaPrateleira + espaco;
      x = espaco;
      alturaDaPrateleira = 0;
    }
    if (y + h + espaco > altura) {
      sobras.push(it);
      continue;
    }
    colocados.push({ ...it, x, y });
    x += w + espaco;
    if (h > alturaDaPrateleira) alturaDaPrateleira = h;
  }
  return { colocados, sobras };
}

/** Empacota em `n` páginas (n livre) de largura x altura; null se algum item não cabe nem numa página vazia. */
function empacotarEm(itens, largura, altura, espaco) {
  const ordenados = [...itens].sort((a, b) => b.h - a.h || b.w - a.w || (a.nome < b.nome ? -1 : 1));
  const paginas = [];
  let resto = ordenados;
  while (resto.length > 0) {
    const { colocados, sobras } = preencherPagina(resto, largura, altura, espaco);
    if (colocados.length === 0) return null;
    paginas.push(colocados);
    resto = sobras;
  }
  return paginas;
}

/**
 * @param {{nome:string,w:number,h:number}[]} itens
 * @param {{largura?:number, altura?:number, espaco?:number, degrau?:number}} [opcoes]
 * @returns {{ tamanho:[number,number], paginas:{nome:string,w:number,h:number,x:number,y:number}[][] }}
 */
export function empacotar(itens, { largura = 2048, altura = 2048, espaco = 4, degrau = 64 } = {}) {
  if (itens.length === 0) throw new Error('empacotar: nada para empacotar');
  const cheio = empacotarEm(itens, largura, altura, espaco);
  if (!cheio) throw new Error(`empacotar: ha quadro maior que a pagina ${largura}x${altura}`);
  const n = cheio.length;
  let melhor = cheio;
  let alturaMelhor = altura;
  for (let h = altura - degrau; h >= degrau; h -= degrau) {
    const tentativa = empacotarEm(itens, largura, h, espaco);
    if (!tentativa || tentativa.length > n) break;
    melhor = tentativa;
    alturaMelhor = h;
  }
  return { tamanho: [largura, alturaMelhor], paginas: melhor };
}

/** Confere que nenhum quadro sai da página nem encosta/sobrepõe outro (usado nos testes e no relatório). */
export function validarEmpacotamento(resultado, espaco = 4) {
  const [L, A] = resultado.tamanho;
  const erros = [];
  resultado.paginas.forEach((pagina, p) => {
    for (const a of pagina) {
      if (a.x < 0 || a.y < 0 || a.x + a.w > L || a.y + a.h > A) erros.push(`${a.nome}: fora da pagina ${p}`);
    }
    for (let i = 0; i < pagina.length; i++) {
      for (let j = i + 1; j < pagina.length; j++) {
        const a = pagina[i];
        const b = pagina[j];
        const separadosX = a.x + a.w + espaco <= b.x || b.x + b.w + espaco <= a.x;
        const separadosY = a.y + a.h + espaco <= b.y || b.y + b.h + espaco <= a.y;
        if (!separadosX && !separadosY) erros.push(`${a.nome} e ${b.nome}: sobrepostos/colados na pagina ${p}`);
      }
    }
  });
  return erros;
}
