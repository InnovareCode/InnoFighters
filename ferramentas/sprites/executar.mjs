/**
 * Orquestração do pipeline de sprites (F2): lê as folhas 4x3, recorta por componente conexo, tira o fundo,
 * normaliza com UMA escala por lutador, mede âncora/ponta/rosto, empacota em páginas e grava o atlas C1 v2.
 * As decisões geométricas e de cor moram em nucleo.mjs (puro e testado); aqui fica o disco e o `sharp`.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';
import { empacotar, validarEmpacotamento } from './empacotar.mjs';
import {
  agruparFiguras, caixaOpaca, calcularAlfa, centroDeMassaX, cortarBorda, cortarRgba, despill, detectarChave,
  espelharRgba, estimarFundo, janelaRgba, mascaraDeAlfa, medirHalo, montarManifesto, ordenarGrade, pontaCima, pontaDireita,
  recortarFigura, rostoDoQuadro, rotular, separarFundidas,
} from './nucleo.mjs';
import { COM_PONTA, FOLHAS, IDS_FOLHA, FAIXA_DOS_PES, MINIMAS, MODO_PONTA, ORDEM_CANONICA } from './poses.mjs';

const AQUI = dirname(fileURLToPath(import.meta.url));
/** Exceções por lutador (ferramentas/sprites/lutadores.json); ausente = só os padrões. */
export function lerExcecoes(id) {
  const arq = join(AQUI, 'lutadores.json');
  if (!existsSync(arq)) return {};
  const todas = JSON.parse(readFileSync(arq, 'utf8'));
  return todas[id] ?? {};
}

// sem cache do libvips: o processo lê/grava dezenas de imagens grandes uma vez só, e o cache só seguraria arquivos abertos
sharp.cache(false);

export const LADO_RETRATO = 190;

export const PADROES = {
  /** px cortados de cada borda da folha antes da chave de cor. */
  borda: 2,
  /** Distância de cor (RGB) até a qual o pixel é fundo puro; depois dela o alfa sobe em rampa por `suavidade`. */
  tolerancia: 48,
  suavidade: 70,
  /** Transparência extra ao redor de cada figura antes de reamostrar. */
  margem: 8,
  /** Altura do idle0 no atlas, em px (igual à do atlas legado: o K do jogo não muda). */
  alturaRef: 410,
  paginaMax: 2048,
  espaco: 4,
  qualidadeWebp: 85,
};

/** Acha `<id>-<folha>-*-vN.png` com o maior N em arte-fonte/lutadores/<id>/folhas/. null se não houver. */
export function acharFolha(raiz, id, folha) {
  const dir = join(raiz, 'arte-fonte', 'lutadores', id, 'folhas');
  if (!existsSync(dir)) return null;
  const re = new RegExp(`^${id}-${folha}-.*-v(\\d+)\\.png$`);
  let melhor = null;
  let maior = -1;
  for (const nome of readdirSync(dir)) {
    const m = re.exec(nome);
    if (m && Number(m[1]) > maior) {
      maior = Number(m[1]);
      melhor = nome;
    }
  }
  return melhor ? join(dir, melhor) : null;
}

async function lerRgb(arquivo) {
  const { data, info } = await sharp(arquivo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { largura: info.width, altura: info.height, dados: new Uint8Array(data.buffer, data.byteOffset, data.length) };
}

/**
 * Processa UMA folha até os quadros recortados (RGBA, resolução original, com margem), na ordem das poses.
 * Lança com mensagem clara se não achar exatamente 12 figuras.
 */
export async function processarFolha(arquivo, nomes, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const espelhar = new Set(opcoes.espelhar ?? []);
  const avisos = [];
  const bruta = await lerRgb(arquivo);
  const img = cortarBorda(bruta, o.borda);
  const fundo = estimarFundo(img);
  const chave = detectarChave(fundo);
  if (!chave) throw new Error(`${arquivo}: fundo ${fundo.join(',')} nao e verde nem magenta`);
  const alfa = calcularAlfa(img, fundo, { tolerancia: o.tolerancia, suavidade: o.suavidade });
  const haloAntes = medirHalo(img, alfa, chave).fracao;
  const limpa = despill(img, alfa, chave);
  const haloDepois = medirHalo(limpa, alfa, chave).fracao;

  const rot = rotular(mascaraDeAlfa(alfa), img.largura, img.altura);
  const rotulos = rot.rotulos;
  // figuras coladas (pe de uma encostando no cabelo da de baixo) sao partidas no pescoco mais fino
  const sep = separarFundidas(rotulos, rot.componentes, img.largura, img.altura, { esperado: nomes.length });
  const componentes = sep.componentes;
  for (const c of sep.cortes) {
    avisos.push(
      c.metodo === 'erosao'
        ? `figuras coladas separadas por erosao (raio ${c.raio}px, ${c.pedacos} pedacos): sem perda de pixels`
        : `figuras coladas separadas por corte reto em ${c.eixo}=${c.em + o.borda} (${c.pixels} px no pescoco): perda de poucos px na juncao`,
    );
  }
  const { figuras, descartados } = agruparFiguras(componentes, { esperado: nomes.length });
  if (figuras.length !== nomes.length) {
    throw new Error(`${arquivo}: achei ${figuras.length} figuras (esperava ${nomes.length}); figuras coladas ou ruido grande?`);
  }
  const { figuras: ordenadas, separadas } = ordenarGrade(figuras);
  if (!separadas) avisos.push('as linhas da grade se misturam pelo centro de massa vertical: confira a ordem das poses');
  if (descartados.length > 0) {
    avisos.push(`${descartados.length} componente(s) pequeno(s) descartado(s) (ruido; maior com ${Math.max(...descartados.map((c) => c.area))} px)`);
  }

  const quadros = ordenadas.map((fig, i) => {
    const nome = nomes[i];
    const r = recortarFigura(limpa, alfa, rotulos, fig, { margem: o.margem });
    let rgba = r.rgba;
    if (espelhar.has(nome)) rgba = espelharRgba(rgba, r.largura, r.altura);
    if (fig.x0 === 0 || fig.y0 === 0 || fig.x1 === img.largura - 1 || fig.y1 === img.altura - 1) {
      avisos.push(`${nome}: encosta na borda da folha (pode estar cortado)`);
    }
    return {
      nome,
      largura: r.largura,
      altura: r.altura,
      rgba,
      alturaFigura: fig.y1 - fig.y0 + 1,
      larguraFigura: fig.x1 - fig.x0 + 1,
      baseY: fig.y1 + o.borda,
    };
  });
  return {
    arquivo,
    quadros,
    avisos,
    info: { fundo, chave, haloAntes, haloDepois, componentes: componentes.length, tamanho: [bruta.largura, bruta.altura] },
  };
}

/** Reamostra um RGBA (lanczos3; o sharp pré-multiplica o alfa, então a borda não sangra) e apara pelo alfa. */
export async function reamostrar(q, escala) {
  const w = Math.max(1, Math.round(q.largura * escala));
  const h = Math.max(1, Math.round(q.altura * escala));
  const { data } = await sharp(Buffer.from(q.rgba), { raw: { width: q.largura, height: q.altura, channels: 4 } })
    .resize(w, h, { kernel: 'lanczos3', fit: 'fill' })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const rgba = new Uint8Array(data.buffer, data.byteOffset, data.length);
  const caixa = caixaOpaca(rgba, w, h);
  if (!caixa) throw new Error(`${q.nome}: quadro vazio depois de reamostrar`);
  return { ...cortarRgba(rgba, w, caixa) };
}

/**
 * Pipeline completo de um lutador.
 * @param {{raiz:string, id:string, folhas?:string[], saida?:string, arquivos?:Record<string,string>, espelhar?:Record<string,string[]>}} p
 */
export async function gerarLutador({ raiz, id, folhas, saida, arquivos = {}, espelhar = {}, opcoes = {}, log = () => {} }) {
  const o = { ...PADROES, ...opcoes };
  const usar = folhas && folhas.length > 0 ? folhas : IDS_FOLHA;
  const relatorio = { lutador: id, folhas: {}, quadros: {}, avisos: [] };
  const brutos = {};

  for (const f of usar) {
    const arquivo = arquivos[f] ?? acharFolha(raiz, id, f);
    if (!arquivo) {
      relatorio.avisos.push(`folha ${f}: nenhum arquivo ${id}-${f}-*-vN.png em arte-fonte/lutadores/${id}/folhas/ (pulada)`);
      continue;
    }
    log(`  ${f}: ${arquivo}`);
    const r = await processarFolha(arquivo, FOLHAS[f], { ...o, espelhar: espelhar[f] ?? [] });
    for (const q of r.quadros) brutos[q.nome] = q;
    const alturas = r.quadros.map((q) => q.alturaFigura).sort((a, b) => a - b);
    relatorio.folhas[f] = {
      arquivo: arquivo.replace(/^.*[\\/]/, ''),
      ...r.info,
      alturaMediana: alturas[alturas.length >> 1],
    };
    for (const a of r.avisos) relatorio.avisos.push(`${f}: ${a}`);
  }

  const idle = brutos['idle0'];
  if (!idle && !(opcoes.escala > 0)) {
    throw new Error('sem idle0 (folha f1) nao ha como calcular a escala: processe a f1 ou passe --escala');
  }
  // UMA escala para o lutador inteiro: a do idle0. Altura quadro a quadro NAO se normaliza (agachar e mais baixo).
  let escala = opcoes.escala > 0 ? opcoes.escala : o.alturaRef / idle.alturaFigura;
  if (!(opcoes.escala > 0)) {
    // a figura mede-se em alfa >= 64 e o quadro final apara em alfa >= 16: corrige o resto para o idle0 sair exato
    for (let volta = 0; volta < 6; volta++) {
      const teste = await reamostrar(idle, escala);
      if (teste.altura === o.alturaRef) break;
      escala *= o.alturaRef / teste.altura;
    }
  }

  const excecoes = lerExcecoes(id);
  const finais = {};
  for (const nome of ORDEM_CANONICA) {
    const q = brutos[nome];
    if (!q) continue;
    finais[nome] = { nome, ...(await reamostrar(q, escala)), baseYOriginal: q.baseY, alturaOriginal: q.alturaFigura };
  }
  const alturaRef = finais['idle0'] ? finais['idle0'].altura : Math.round(o.alturaRef);

  for (const [nome, q] of Object.entries(finais)) {
    q.ax = centroDeMassaX(q.rgba, q.largura, q.altura);
    if (COM_PONTA.includes(nome)) {
      const modo = excecoes.ponta?.[nome] ?? MODO_PONTA[nome] ?? 'direita';
      q.modoPonta = modo;
      if (modo === 'cima') q.ponta = pontaCima(q.rgba, q.largura, q.altura);
      else if (modo === 'mao') q.ponta = pontaDireita(q.rgba, q.largura, q.altura, { yMax: q.altura - Math.round(FAIXA_DOS_PES * alturaRef) });
      else q.ponta = pontaDireita(q.rgba, q.largura, q.altura);
    }
    if (nome === 'idle0') q.rosto = rostoDoQuadro(q.rgba, q.largura, q.altura, alturaRef);
  }

  const itens = Object.values(finais).map((q) => ({ nome: q.nome, w: q.largura, h: q.altura }));
  const pacote = empacotar(itens, { largura: o.paginaMax, altura: o.paginaMax, espaco: o.espaco });
  const erros = validarEmpacotamento(pacote, o.espaco);
  if (erros.length > 0) throw new Error(`empacotamento invalido: ${erros.join('; ')}`);

  const dirSaida = saida ?? join(raiz, 'sprites-gerados', id);
  mkdirSync(dirSaida, { recursive: true });
  const imagens = [];
  const posicoes = {};
  const [PL, PA] = pacote.tamanho;
  for (let p = 0; p < pacote.paginas.length; p++) {
    const nomeArquivo = `atlas-${p}.webp`;
    imagens.push(nomeArquivo);
    const camadas = pacote.paginas[p].map((c) => {
      posicoes[c.nome] = { p, x: c.x, y: c.y };
      const f = finais[c.nome];
      return { input: Buffer.from(f.rgba), raw: { width: f.largura, height: f.altura, channels: 4 }, left: c.x, top: c.y };
    });
    const arquivoPagina = join(dirSaida, nomeArquivo);
    await sharp({ create: { width: PL, height: PA, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
      .composite(camadas)
      .webp({ quality: o.qualidadeWebp, alphaQuality: 100, effort: 5 })
      .toFile(arquivoPagina);
  }

  const quadros = {};
  for (const nome of ORDEM_CANONICA) {
    const f = finais[nome];
    if (!f) continue;
    const pos = posicoes[nome];
    quadros[nome] = { ...pos, w: f.largura, h: f.altura, ax: f.ax, ...(f.ponta ? { ponta: f.ponta } : {}), ...(f.rosto ? { rosto: f.rosto } : {}) };
  }

  // retrato: janela 190x190 do idle0 centrada no `rosto` (px inteiros), PNG com alfa
  let retrato;
  const idleFinal = finais['idle0'];
  if (idleFinal?.rosto) {
    const x0 = Math.floor(idleFinal.rosto[0] - LADO_RETRATO / 2);
    const y0 = Math.floor(idleFinal.rosto[1] - LADO_RETRATO / 2);
    const rgba = janelaRgba(idleFinal.rgba, idleFinal.largura, idleFinal.altura, x0, y0, LADO_RETRATO);
    await sharp(Buffer.from(rgba), { raw: { width: LADO_RETRATO, height: LADO_RETRATO, channels: 4 } })
      .png({ compressionLevel: 9 })
      .toFile(join(dirSaida, 'retrato.png'));
    // o rosto fica no centro da janela; se o arredondamento deslocou, o recorte compensa em fração
    retrato = { arquivo: 'retrato.png', recorte: [idleFinal.rosto[0] - 95 - x0, idleFinal.rosto[1] - 95 - y0, LADO_RETRATO, LADO_RETRATO] };
    retrato.recorte = retrato.recorte.map((v) => Math.round(v * 100) / 100);
  }

  const manifesto = montarManifesto({ lutador: id, imagens, tamanho: pacote.tamanho, alturaRef, quadros, retrato });
  writeFileSync(join(dirSaida, 'atlas.json'), `${JSON.stringify(manifesto, null, 2)}\n`);

  // relatório e conferências de contrato
  const presentes = Object.keys(finais);
  const faltandoMinimas = MINIMAS.filter((n) => !finais[n]);
  const faltandoPonta = COM_PONTA.filter((n) => finais[n] && !finais[n].ponta);
  const semFolhaCompleta = usar.length === IDS_FOLHA.length && Object.keys(relatorio.folhas).length === IDS_FOLHA.length;
  if (semFolhaCompleta && faltandoMinimas.length > 0) relatorio.avisos.push(`faltam poses minimas: ${faltandoMinimas.join(', ')}`);
  if (faltandoPonta.length > 0) relatorio.avisos.push(`sem ponta: ${faltandoPonta.join(', ')}`);
  if (!semFolhaCompleta) relatorio.avisos.push(`rodada PARCIAL (${Object.keys(relatorio.folhas).join(', ')}): atlas incompleto, so para teste`);
  for (const nome of presentes) {
    const f = finais[nome];
    relatorio.quadros[nome] = {
      w: f.largura, h: f.altura, ax: Math.round(f.ax * 10) / 10,
      alturaOriginal: f.alturaOriginal, baseYOriginal: f.baseYOriginal,
      ...(f.ponta ? { ponta: f.ponta.map((v) => Math.round(v * 10) / 10), modoPonta: f.modoPonta } : {}),
    };
  }
  relatorio.escala = Math.round(escala * 10000) / 10000;
  relatorio.alturaRef = alturaRef;
  relatorio.atlas = { tamanho: pacote.tamanho, paginas: imagens.length, quadros: presentes.length };
  writeFileSync(join(dirSaida, 'relatorio.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
  return { dirSaida, manifesto, relatorio, finais };
}
