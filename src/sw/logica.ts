/**
 * Lógica PURA do service worker (T7, docs/orcamentos-2026-10-23.md; desenho em docs/service-worker.md). Sem `self`, sem `caches`, sem `fetch`:
 * o `sw.ts` só liga estas funções aos eventos, e os testes (tests/unit/service-worker.test.ts) exercitam as decisões sem navegador.
 */

/** O que o build escreve em `sw-manifesto.js` (ferramentas/sw/manifesto.mjs). Todos os caminhos são relativos ao ESCOPO (a base do site). */
export interface ManifestoSw {
  /** Identidade da versão: commit + resumo do conteúdo. Nome do cache do shell; muda quando QUALQUER arquivo muda. */
  readonly versao: string;
  /** O mesmo `{commit, data}` do `version.json` e do `__INNO_BUILD__` (a página o manda de volta para provar que é a mesma versão). */
  readonly build: { readonly commit: string; readonly data: string };
  /** Arquivo de entrada (`assets/index-XXXX.js`): o `index.html` guardado/baixado só vale se citar esta marca. */
  readonly marca: string;
  /** caminho -> revisão (hash do CONTEÚDO). Tudo o que o SW pode servir do cache; fora daqui o SW não toca. */
  readonly revisoes: Readonly<Record<string, string>>;
  /** Subconjunto de `revisoes` baixado no install (o que o título precisa). */
  readonly shell: readonly string[];
  /** SW aposentado: ao ativar apaga os caches e se desregistra (rollback de emergência por deploy). */
  readonly desligado?: boolean;
}

/** Tudo o que este SW cria começa com isto: a limpeza só toca no que é nosso. */
export const PREFIXO_CACHE = 'inno-';
/** Cache da arte e dos pedaços de JS/CSS/fontes, chaveado por revisão; compartilhado entre versões (o que não mudou não é baixado de novo). */
export const NOME_CACHE_ARTE = 'inno-arte-v1';
/** O HTML pertence à versão: um cache por versão, apagado quando ela sai. */
export const nomeCacheShell = (versao: string): string => `${PREFIXO_CACHE}shell-${versao}`;

export type Estrategia = 'ignorar' | 'navegacao' | 'revisao';

/** Arquivos que o SW NUNCA intercepta: o próprio SW, o manifesto, e o version.json (a pergunta "há versão nova?" tem de ir à rede, sem cache). */
const NUNCA = new Set(['sw.js', 'sw-manifesto.js', 'version.json']);

const tem = (o: object, k: string): boolean => Object.prototype.hasOwnProperty.call(o, k);

/**
 * Caminho de `url` relativo ao escopo (sem a barra inicial e sem `?query`/`#hash`), ou null se for de outra origem ou fora do escopo.
 * `escopo` é a URL absoluta do escopo (`registration.scope`, termina em `/`).
 */
export function caminhoNoEscopo(url: string, escopo: string): string | null {
  let u: URL;
  let e: URL;
  try {
    u = new URL(url);
    e = new URL(escopo);
  } catch {
    return null;
  }
  if (u.origin !== e.origin) return null;
  if (!u.pathname.startsWith(e.pathname)) return null;
  const resto = u.pathname.slice(e.pathname.length);
  try {
    return decodeURIComponent(resto);
  } catch {
    return resto;
  }
}

/** Chave do cache da arte: a URL sem query + a revisão. Revisão nova = chave nova, então nunca se serve conteúdo velho sob o nome novo. */
export function chaveDeRevisao(escopo: string, caminho: string, revisao: string): string {
  return `${escopo}${caminho}?__rev=${revisao}`;
}

/** Inverso de `chaveDeRevisao`; null se a chave não é nossa. */
export function lerChave(chave: string, escopo: string): { caminho: string; revisao: string } | null {
  const i = chave.lastIndexOf('?__rev=');
  if (i < 0 || !chave.startsWith(escopo)) return null;
  return { caminho: chave.slice(escopo.length, i), revisao: chave.slice(i + '?__rev='.length) };
}

export interface PedidoSw {
  readonly metodo: string;
  readonly modo: string;
  readonly caminho: string | null;
  readonly temRange: boolean;
}

/**
 * Escolhe o tratamento de um pedido:
 *  - 'navegacao': o documento (base ou index.html, qualquer `?query`, então `?trailer=`/`?residencia=`/`?motorv2=` seguem valendo) vem do shell DA VERSÃO;
 *  - 'revisao': arquivo do manifesto, cache-first por revisão;
 *  - 'ignorar': vai direto à rede (POST, Range de áudio/vídeo, fora do escopo, version.json, sw.js, arquivo que o build não conhece).
 */
export function escolherEstrategia(p: PedidoSw, revisoes: Readonly<Record<string, string>>): Estrategia {
  if (p.metodo !== 'GET' || p.caminho === null || p.temRange) return 'ignorar';
  if (p.modo === 'navigate') return p.caminho === '' || p.caminho === 'index.html' ? 'navegacao' : 'ignorar';
  if (NUNCA.has(p.caminho)) return 'ignorar';
  return tem(revisoes, p.caminho) ? 'revisao' : 'ignorar';
}

/**
 * Só se guarda resposta completa e verdadeira: 200 (não 206 nem opaca), e nada de HTML no lugar de um arquivo de dados (um servidor com
 * "fallback de SPA" responde 200 + index.html para arquivo inexistente; guardar isso sob a chave da arte a envenenaria até a próxima versão).
 */
export function respostaGuardavel(r: { status: number; tipoConteudo: string | null; caminho: string }): boolean {
  if (r.status !== 200) return false;
  const ehHtml = /^text\/html/i.test(r.tipoConteudo ?? '');
  return !ehHtml || /\.html?$/i.test(r.caminho);
}

/** O `index.html` baixado é desta versão? (cita o arquivo de entrada com hash que o manifesto lista). */
export function htmlEhDestaVersao(html: string, marca: string): boolean {
  const nome = marca.slice(marca.lastIndexOf('/') + 1);
  return nome.length > 0 && html.includes(nome);
}

/** A página que pede a captura roda exatamente esta versão? (senão o que ela já baixou pode ser de outra e não entra sob as revisões deste SW). */
export function mesmaVersaoDoBuild(m: Pick<ManifestoSw, 'build'>, pagina: { commit?: unknown; data?: unknown }): boolean {
  return pagina.commit === m.build.commit && pagina.data === m.build.data;
}

/** Das URLs que a página já carregou (Resource Timing), as que o SW deve guardar: do escopo, no manifesto, e ainda ausentes do cache. */
export function usadosParaGuardar(
  urls: readonly unknown[],
  escopo: string,
  revisoes: Readonly<Record<string, string>>,
  jaGuardadas: ReadonlySet<string>,
  limite = 600,
): string[] {
  const vistos = new Set<string>();
  const saida: string[] = [];
  for (const u of urls) {
    if (typeof u !== 'string') continue;
    const c = caminhoNoEscopo(u, escopo);
    if (c === null || NUNCA.has(c) || !tem(revisoes, c) || vistos.has(c)) continue;
    vistos.add(c);
    const rev = revisoes[c];
    if (rev === undefined || jaGuardadas.has(chaveDeRevisao(escopo, c, rev))) continue;
    saida.push(c);
    if (saida.length >= limite) break;
  }
  return saida;
}

export interface PlanoDeLimpeza {
  readonly apagarCaches: string[];
  readonly apagarChaves: string[];
}

/**
 * Ao ativar: apaga os caches de shell de outras versões, os caches `inno-*` que não conhecemos (formato antigo) e, dentro do cache da arte,
 * toda entrada cuja revisão não é mais a do manifesto (arquivo mudou) ou cujo caminho saiu do build. Não toca em cache de outro dono.
 */
export function planoDeLimpeza(entrada: {
  caches: readonly string[];
  chavesDaArte: readonly string[];
  versao: string;
  escopo: string;
  revisoes: Readonly<Record<string, string>>;
}): PlanoDeLimpeza {
  const manter = new Set([NOME_CACHE_ARTE, nomeCacheShell(entrada.versao)]);
  const apagarCaches = entrada.caches.filter((n) => n.startsWith(PREFIXO_CACHE) && !manter.has(n));
  const apagarChaves = entrada.chavesDaArte.filter((chave) => {
    const k = lerChave(chave, entrada.escopo);
    if (!k) return true;
    return !tem(entrada.revisoes, k.caminho) || entrada.revisoes[k.caminho] !== k.revisao;
  });
  return { apagarCaches, apagarChaves };
}

/** Aposentadoria: todos os caches que este SW criou. */
export const cachesNossos = (todos: readonly string[]): string[] => todos.filter((n) => n.startsWith(PREFIXO_CACHE));
