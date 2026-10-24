/**
 * Orquestração do pipeline de sprites (F2): lê as folhas 4x3, recorta por componente conexo, tira o fundo,
 * normaliza com UMA escala por lutador, mede âncora/ponta/rosto, empacota em páginas e grava o atlas C1 v2.
 * As decisões geométricas e de cor moram em nucleo.mjs (puro e testado); aqui fica o disco e o `sharp`.
 */
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import sharp from 'sharp';
import { ARQUIVO_RETRATO, OPCOES_WEBP } from '../gerar-retratos.mjs';
import { empacotar, validarEmpacotamento } from './empacotar.mjs';
import {
  acolchoarRgb, agruparFiguras, caixaOpaca, calcularAlfa, centroDeMassaX, cortarBorda, cortarRgba, despill, detectarChave,
  espelharRgba, estimarFundo, janelaRgba, mascaraDeAlfa, medirHalo, meioDosPes, modoDeAncora, montarManifesto, ordenarGrade, pontaCima, pontaDireita,
  recortarFigura, rostoDoQuadro, rotular, separarFundidas, validarBlocoFilme,
} from './nucleo.mjs';
import { COM_PONTA, FAIXA_DOS_PES, FRACAO_PE, GRADE_PADRAO, MINIMAS, MODO_PONTA, ORDEM_COMPLETA, nomesDaCelula, resolverLayout } from './poses.mjs';

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

/** Acha `<id>-<folha>[-descricao]-vN.png` com o maior N em arte-fonte/lutadores/<id>/folhas/. null se não houver. */
export function acharFolha(raiz, id, folha) {
  const dir = join(raiz, 'arte-fonte', 'lutadores', id, 'folhas');
  if (!existsSync(dir)) return null;
  const re = new RegExp(`^${id}-${folha}(?:-.*)?-v(\\d+)\\.png$`);
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

/**
 * `arquivos` em lutadores.json: { folha: "nome.png" } fixa a versão de uma folha (dentro de folhas/), no lugar da maior -vN. Serve
 * quando a maior é de OUTRA geração (WEI LONG: as f4 -v2..-v4 antigas, do traje velho, ganhariam da f4 -v1 nova). Arquivo que não
 * existe é erro, não "pula a folha".
 */
function arquivoFixado(raiz, id, folha, excecoes) {
  const nome = excecoes.arquivos?.[folha];
  if (!nome) return null;
  const caminho = join(raiz, 'arte-fonte', 'lutadores', id, 'folhas', nome);
  if (!existsSync(caminho)) throw new Error(`lutadores.json: arquivos.${folha} = "${nome}" nao existe em arte-fonte/lutadores/${id}/folhas/`);
  return caminho;
}

async function lerRgb(arquivo) {
  const { data, info } = await sharp(arquivo).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { largura: info.width, altura: info.height, dados: new Uint8Array(data.buffer, data.byteOffset, data.length) };
}

/**
 * Reposição do bloco `filme` (lutadores.json, chave `filme`) no atlas gerado. Sem a chave: nada muda (o lutador não tem página
 * FILME). Com a chave: o bloco é validado (lança se inválido) e, se a imagem existir em public/assets/lutadores/<id>/, o tamanho
 * do cabeçalho tem que bater com o declarado (lança se não) e ela é copiada para `dirSaida`. Imagem ausente é só aviso: o jogo
 * cai no Alt sem a FILME, mas o atlas.json fica com o bloco para a imagem entrar depois.
 */
async function prepararFilme({ raiz, id, filme, dirSaida, relatorio }) {
  if (!filme) return undefined;
  const erros = validarBlocoFilme(filme);
  if (erros.length > 0) throw new Error(`lutadores.json: filme de ${id} invalido: ${erros.join('; ')}`);
  const origem = join(raiz, 'public', 'assets', 'lutadores', id, filme.imagem);
  if (!existsSync(origem)) {
    relatorio.avisos.push(`filme: ${filme.imagem} nao existe em public/assets/lutadores/${id}/ (o bloco entrou no atlas.json; sem a imagem o jogo usa o Alt)`);
    return filme;
  }
  const meta = await sharp(origem).metadata();
  if (meta.width !== filme.tamanho[0] || meta.height !== filme.tamanho[1]) {
    throw new Error(`lutadores.json: filme de ${id} declara ${filme.tamanho.join('x')}, mas ${filme.imagem} tem ${meta.width}x${meta.height}`);
  }
  copyFileSync(origem, join(dirSaida, filme.imagem));
  return filme;
}

/**
 * Processa UMA folha até os quadros recortados (RGBA, resolução original, com margem), na ordem das poses.
 * `celulas` = uma entrada por figura, em ordem de leitura: nome da pose, lista de nomes (apelidos: mesmo desenho) ou
 * null (figura descartada). `opcoes.grade` = [colunas, linhas] (padrão 4x3); `opcoes.acolchoar` = margens de fundo
 * acrescentadas antes de cortar a borda (figura que tangencia a borda). Lança com mensagem clara se o número de
 * figuras achadas não bater com o de células.
 */
export async function processarFolha(arquivo, celulas, opcoes = {}) {
  const o = { ...PADROES, ...opcoes };
  const espelhar = new Set(opcoes.espelhar ?? []);
  const grade = opcoes.grade ?? GRADE_PADRAO;
  if (celulas.length !== grade[0] * grade[1]) throw new Error(`${arquivo}: ${celulas.length} celulas para uma grade ${grade.join('x')}`);
  const nomes = celulas.map((c) => nomesDaCelula(c));
  const avisos = [];
  let bruta = await lerRgb(arquivo);
  if (opcoes.acolchoar) {
    bruta = acolchoarRgb(bruta, estimarFundo(bruta), opcoes.acolchoar);
    avisos.push(`acolchoada com fundo (${Object.entries(opcoes.acolchoar).map(([k, v]) => `${k} ${v}px`).join(', ')}): figura tangencia a borda`);
  }
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
  const { figuras: ordenadas, separadas } = ordenarGrade(figuras, grade[0], grade[1]);
  if (!separadas) avisos.push('as linhas da grade se misturam pelo centro de massa vertical: confira a ordem das poses');
  if (descartados.length > 0) {
    avisos.push(`${descartados.length} componente(s) pequeno(s) descartado(s) (ruido; maior com ${Math.max(...descartados.map((c) => c.area))} px)`);
  }

  const quadros = [];
  ordenadas.forEach((fig, i) => {
    const [nome, ...apelidos] = nomes[i];
    if (!nome) return; // figura descartada de propósito (célula null)
    const r = recortarFigura(limpa, alfa, rotulos, fig, { margem: o.margem });
    let rgba = r.rgba;
    if (espelhar.has(nome)) rgba = espelharRgba(rgba, r.largura, r.altura);
    if (fig.x0 === 0 || fig.y0 === 0 || fig.x1 === img.largura - 1 || fig.y1 === img.altura - 1) {
      avisos.push(`${nome}: encosta na borda da folha (pode estar cortado)`);
    }
    quadros.push({
      nome,
      apelidos,
      largura: r.largura,
      altura: r.altura,
      rgba,
      alturaFigura: fig.y1 - fig.y0 + 1,
      larguraFigura: fig.x1 - fig.x0 + 1,
      baseY: fig.y1 + o.borda - (opcoes.acolchoar?.topo ?? 0),
    });
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
 *
 * Exceções por lutador (ferramentas/sprites/lutadores.json): `layout` ('padrao' 4x3 | 'chefe' 3x2), `celulas` (troca
 * as células de uma folha), `alturaRef`, `acolchoar` (por folha), `fatorFolha` (multiplicador de escala por folha, para
 * uma folha que o gerador desenhou em outro tamanho), `ancora` ({ "idle*": "pes" }: ax no meio dos pés em vez do centro
 * de massa; padrão 'massa') e `ponta` (modo por pose; pose fora de COM_PONTA entra também; 'nenhuma' = quadro sem ponta).
 */
export async function gerarLutador({ raiz, id, folhas, saida, arquivos = {}, espelhar = {}, opcoes = {}, excecoes: excecoesDadas, log = () => {} }) {
  const excecoes = excecoesDadas ?? lerExcecoes(id); // `excecoes` explícito = teste; senão o lutadores.json
  const layout = resolverLayout(excecoes);
  const o = { ...PADROES, ...(excecoes.alturaRef > 0 ? { alturaRef: excecoes.alturaRef } : {}), ...opcoes };
  const usar = folhas && folhas.length > 0 ? folhas : layout.ids;
  const relatorio = { lutador: id, folhas: {}, quadros: {}, avisos: [] };
  const brutos = {};
  const apelidoDe = {}; // apelido -> pose que tem o desenho (o mesmo retângulo do atlas serve aos dois)

  for (const f of usar) {
    const def = layout.folhas[f];
    if (!def) throw new Error(`folha desconhecida para ${id}: ${f} (as dele: ${layout.ids.join(', ')})`);
    const arquivo = arquivos[f] ?? arquivoFixado(raiz, id, f, excecoes) ?? acharFolha(raiz, id, f);
    if (!arquivo) {
      relatorio.avisos.push(`folha ${f}: nenhum arquivo ${id}-${f}-*-vN.png em arte-fonte/lutadores/${id}/folhas/ (pulada)`);
      continue;
    }
    log(`  ${f}: ${arquivo}`);
    const r = await processarFolha(arquivo, def.celulas, {
      ...o, grade: def.grade, espelhar: espelhar[f] ?? [], acolchoar: excecoes.acolchoar?.[f],
    });
    const fator = excecoes.fatorFolha?.[f] ?? 1;
    if (fator !== 1) relatorio.avisos.push(`${f}: escala da folha x${fator} (lutadores.json: fatorFolha)`);
    for (const q of r.quadros) {
      brutos[q.nome] = { ...q, fator };
      for (const a of q.apelidos) apelidoDe[a] = q.nome;
    }
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

  const finais = {};
  // poses fora do mapa do motor (folhasExtras, ex.: `sarpa*` da NILA) entram depois das 54, na ordem das células
  const nomesLayout = layout.ids.flatMap((f) => layout.folhas[f].celulas.flatMap(nomesDaCelula));
  const ordem = [...ORDEM_COMPLETA, ...nomesLayout.filter((n) => !ORDEM_COMPLETA.includes(n))];
  for (const nome of ordem) {
    const q = brutos[nome];
    if (!q) continue;
    finais[nome] = { nome, ...(await reamostrar(q, escala * q.fator)), baseYOriginal: q.baseY, alturaOriginal: q.alturaFigura, apelidos: q.apelidos };
  }
  const alturaRef = finais['idle0'] ? finais['idle0'].altura : Math.round(o.alturaRef);

  // retrato/rosto: a janela nunca encolhe abaixo de 190 px (ferramentas/gerar-retratos.mjs#ladoDoRetrato faz o mesmo); com alturaRef < 410
  // (CAIO, 396) o rosto a 91 * k ficaria 3 px acima do topo da pagina e o recorte do retrato sairia da imagem
  const alturaDoRetrato = Math.max(alturaRef, 410);
  const comPonta = new Set([...COM_PONTA, ...Object.keys(excecoes.ponta ?? {})]);
  for (const [nome, q] of Object.entries(finais)) {
    q.modoAncora = modoDeAncora(nome, excecoes.ancora);
    q.ax = q.modoAncora === 'pes' ? meioDosPes(q.rgba, q.largura, q.altura, { faixa: Math.round(0.05 * alturaRef) }) : centroDeMassaX(q.rgba, q.largura, q.altura);
    if (comPonta.has(nome)) {
      const modo = excecoes.ponta?.[nome] ?? MODO_PONTA[nome] ?? 'direita';
      q.modoPonta = modo;
      if (modo === 'nenhuma') { /* sem ponta: o quadro nao ancora rastro (ver poses.mjs) e nao conta como "sem ponta" no aviso */ }
      else if (modo === 'cima') q.ponta = pontaCima(q.rgba, q.largura, q.altura);
      else if (modo === 'mao') q.ponta = pontaDireita(q.rgba, q.largura, q.altura, { yMax: q.altura - Math.round(FAIXA_DOS_PES * alturaRef) });
      else if (/^mao:\d*\.?\d+$/.test(modo)) {
        // 'mao:0.5' = só as linhas ACIMA de 50% da altura do quadro (ombrada: o joelho da frente, abaixo disso, ganhava do ombro)
        const fracao = Number(modo.split(':')[1]);
        if (!(fracao > 0 && fracao <= 1)) throw new Error(`ponta ${nome}: "${modo}" precisa de uma fração entre 0 e 1`);
        q.ponta = pontaDireita(q.rgba, q.largura, q.altura, { yMax: Math.max(1, Math.round(fracao * q.altura)) });
      }
      else if (/^pe(:\d*\.?\d+)?$/.test(modo)) {
        // 'pe' = abaixo de FRACAO_PE da altura; 'pe:0.75' = abaixo de 75% (a bota quando a mao tambem fica na metade de baixo)
        const fracao = modo.includes(':') ? Number(modo.split(':')[1]) : FRACAO_PE;
        q.ponta = pontaDireita(q.rgba, q.largura, q.altura, { yMin: Math.round(Math.min(0.95, fracao) * q.altura) });
      }
      else q.ponta = pontaDireita(q.rgba, q.largura, q.altura);
    }
    if (nome === 'idle0') q.rosto = rostoDoQuadro(q.rgba, q.largura, q.altura, alturaDoRetrato);
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

  // manifesto: na ordem do motor; um apelido repete p/x/y/w/h/ax (e ponta) do quadro que tem o desenho
  const quadros = {};
  for (const nome of ordem) {
    const f = finais[nome] ?? finais[apelidoDe[nome]];
    if (!f) continue;
    const pos = posicoes[f.nome];
    quadros[nome] = {
      ...pos, w: f.largura, h: f.altura, ax: f.ax,
      ...(f.ponta ? { ponta: f.ponta } : {}),
      ...(f.rosto && nome === f.nome ? { rosto: f.rosto } : {}),
    };
  }

  // retrato: janela do idle0 centrada no `rosto`, sempre entregue em 190x190 (WebP quase sem perdas, com alfa; era PNG até a T6 do orçamento). Com alturaRef maior que
  // 410 (BAATAR) a janela é `190 * k` px do atlas e é reduzida a 190, para enquadrar como nos outros lutadores.
  let retrato;
  const idleFinal = finais['idle0'];
  if (idleFinal?.rosto) {
    const k = alturaDoRetrato / 410;
    const lado = Math.round(LADO_RETRATO * k);
    const x0 = Math.floor(idleFinal.rosto[0] - lado / 2);
    const y0 = Math.floor(idleFinal.rosto[1] - lado / 2);
    const rgba = janelaRgba(idleFinal.rgba, idleFinal.largura, idleFinal.altura, x0, y0, lado);
    let png = sharp(Buffer.from(rgba), { raw: { width: lado, height: lado, channels: 4 } });
    if (lado !== LADO_RETRATO) png = png.resize(LADO_RETRATO, LADO_RETRATO, { kernel: 'lanczos3' });
    await png.webp(OPCOES_WEBP).toFile(join(dirSaida, ARQUIVO_RETRATO));
    // o rosto fica no centro da janela; se o arredondamento deslocou, o recorte compensa em fração (em px do retrato)
    const sobra = (centro, ini) => (centro - lado / 2 - ini) * (LADO_RETRATO / lado);
    retrato = { arquivo: ARQUIVO_RETRATO, recorte: [sobra(idleFinal.rosto[0], x0), sobra(idleFinal.rosto[1], y0), LADO_RETRATO, LADO_RETRATO] };
    retrato.recorte = retrato.recorte.map((v) => Math.round(v * 100) / 100);
  }

  // página FILME: o atlas.json novo não sabe dela, então o bloco `filme` volta de lutadores.json (fonte versionada) e a imagem
  // (public/assets/lutadores/<id>/filme.webp, também versionada) é copiada ao lado, para a pasta de saída sair completa.
  const filme = await prepararFilme({ raiz, id, filme: excecoes.filme, dirSaida, relatorio });
  const manifesto = montarManifesto({ lutador: id, imagens, tamanho: pacote.tamanho, alturaRef, quadros, retrato, filme });
  writeFileSync(join(dirSaida, 'atlas.json'), `${JSON.stringify(manifesto, null, 2)}\n`);

  // relatório e conferências de contrato
  const presentes = Object.keys(quadros);
  const faltandoMinimas = MINIMAS.filter((n) => !quadros[n]);
  const faltandoPonta = [...comPonta].filter((n) => finais[n] && !finais[n].ponta && finais[n].modoPonta !== 'nenhuma');
  const semFolhaCompleta = usar.length === layout.ids.length && Object.keys(relatorio.folhas).length === layout.ids.length;
  if (semFolhaCompleta && faltandoMinimas.length > 0) relatorio.avisos.push(`faltam poses minimas: ${faltandoMinimas.join(', ')}`);
  if (faltandoPonta.length > 0) relatorio.avisos.push(`sem ponta: ${faltandoPonta.join(', ')}`);
  if (!semFolhaCompleta) relatorio.avisos.push(`rodada PARCIAL (${Object.keys(relatorio.folhas).join(', ')}): atlas incompleto, so para teste`);
  for (const nome of presentes) {
    const f = finais[nome] ?? finais[apelidoDe[nome]];
    relatorio.quadros[nome] = {
      w: f.largura, h: f.altura, ax: Math.round(f.ax * 10) / 10,
      ...(f.modoAncora === 'pes' ? { ancora: 'pes' } : {}),
      alturaOriginal: f.alturaOriginal, baseYOriginal: f.baseYOriginal,
      ...(f.ponta ? { ponta: f.ponta.map((v) => Math.round(v * 10) / 10), modoPonta: f.modoPonta } : {}),
      ...(nome !== f.nome ? { apelidoDe: f.nome } : {}),
    };
  }
  relatorio.escala = Math.round(escala * 10000) / 10000;
  relatorio.alturaRef = alturaRef;
  relatorio.atlas = { tamanho: pacote.tamanho, paginas: imagens.length, quadros: presentes.length, desenhos: Object.keys(finais).length };
  writeFileSync(join(dirSaida, 'relatorio.json'), `${JSON.stringify(relatorio, null, 2)}\n`);
  return { dirSaida, manifesto, relatorio, finais };
}
