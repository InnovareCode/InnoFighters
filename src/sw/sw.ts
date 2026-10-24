/**
 * Service worker do InnoFighters (T7). Compilado à parte pelo plugin de vite.config.ts para `dist/sw.js` (IIFE) e registrado por src/platform/sw.ts.
 * Desenho e motivos: docs/service-worker.md. As decisões estão em ./logica.ts (testadas sem navegador); aqui só ficam os eventos.
 *
 * Em uma frase: o HTML e a arte de uma versão andam juntos (o index.html vem do shell DA VERSÃO; cada arquivo do manifesto é cache-first na
 * revisão que ESTE SW conhece), e uma versão nova só assume quando a página pede (nunca no meio de uma luta), então arte velha e nova não se misturam.
 */
import {
  NOME_CACHE_ARTE,
  cachesNossos,
  chaveDeRevisao,
  caminhoNoEscopo,
  escolherEstrategia,
  htmlEhDestaVersao,
  mesmaVersaoDoBuild,
  nomeCacheShell,
  planoDeLimpeza,
  respostaGuardavel,
  usadosParaGuardar,
  type ManifestoSw,
} from './logica';

// Tipos mínimos do escopo de worker (o tsconfig do projeto usa a lib DOM, que não traz ServiceWorkerGlobalScope).
interface EventoEstendido {
  waitUntil(p: Promise<unknown>): void;
}
interface EventoFetch extends EventoEstendido {
  readonly request: Request;
  respondWith(r: Promise<Response> | Response): void;
}
interface EventoMensagem extends EventoEstendido {
  readonly data: unknown;
  readonly source: { postMessage(m: unknown): void } | null;
}
interface ClienteSw {
  navigate(url: string): Promise<unknown>;
  readonly url: string;
}
interface EscopoSw {
  readonly registration: { readonly scope: string; unregister(): Promise<boolean> };
  readonly clients: { claim(): Promise<void>; matchAll(o?: { type?: string }): Promise<readonly ClienteSw[]> };
  skipWaiting(): Promise<void>;
  addEventListener(tipo: 'install' | 'activate', f: (e: EventoEstendido) => void): void;
  addEventListener(tipo: 'fetch', f: (e: EventoFetch) => void): void;
  addEventListener(tipo: 'message', f: (e: EventoMensagem) => void): void;
}
declare function importScripts(...urls: string[]): void;
declare const self: EscopoSw & { __INNO_MANIFESTO__?: ManifestoSw };

// O manifesto de revisões é um arquivo À PARTE: o navegador compara os bytes dele ao checar atualização, então arte nova = SW novo.
importScripts('sw-manifesto.js');
const M: ManifestoSw = self.__INNO_MANIFESTO__ ?? falhaSemManifesto();
function falhaSemManifesto(): never {
  throw new Error('sw-manifesto.js nao definiu __INNO_MANIFESTO__');
}

const ESCOPO = self.registration.scope;
const URL_INDEX = `${ESCOPO}index.html`;

self.addEventListener('install', (e) => e.waitUntil(instalar()));
self.addEventListener('activate', (e) => e.waitUntil(ativar()));
self.addEventListener('fetch', (e) => {
  if (M.desligado) return;
  const estrategia = escolherEstrategia(
    { metodo: e.request.method, modo: e.request.mode, caminho: caminhoNoEscopo(e.request.url, ESCOPO), temRange: e.request.headers.has('range') },
    M.revisoes,
  );
  if (estrategia === 'navegacao') e.respondWith(doShell(e.request));
  else if (estrategia === 'revisao') e.respondWith(daRevisao(e));
});
self.addEventListener('message', (e) => {
  const d = e.data as { tipo?: unknown; versao?: unknown; urls?: unknown } | null;
  if (!d || typeof d !== 'object') return;
  if (d.tipo === 'ativar') {
    // a página só pede isto fora de uma luta (src/platform/sw.ts)
    e.waitUntil(self.skipWaiting());
  } else if (d.tipo === 'versao') {
    e.source?.postMessage({ tipo: 'versao', versao: M.versao, desligado: M.desligado === true });
  } else if (d.tipo === 'usados' && !M.desligado && Array.isArray(d.urls) && mesmaVersaoDoBuild(M, (d.versao ?? {}) as { commit?: unknown; data?: unknown })) {
    e.waitUntil(guardarUsados(d.urls));
  }
});

/** Baixa o shell. Falhou qualquer parte = o install falha e a versão anterior continua valendo (não existe shell pela metade). */
async function instalar(): Promise<void> {
  if (M.desligado) {
    await self.skipWaiting();
    return;
  }
  // `reload`: ignora o cache HTTP (o Pages guarda o index.html por 10 min e serviria um index de outra versão).
  const html = await fetch(URL_INDEX, { cache: 'reload' });
  if (!html.ok) throw new Error(`index.html: HTTP ${html.status}`);
  if (!htmlEhDestaVersao(await html.clone().text(), M.marca)) throw new Error('o index.html no ar nao e desta versao do SW (deploy no meio?)');
  const arte = await caches.open(NOME_CACHE_ARTE);
  await Promise.all(M.shell.map((c) => baixarParaArte(arte, c)));
  // o index.html só entra no cache DEPOIS de o resto estar guardado: shell completo ou nada
  await (await caches.open(nomeCacheShell(M.versao))).put(URL_INDEX, html);
}

/** Guarda `caminho` na revisão do manifesto, se ainda não está. Sempre revalida (`no-cache`): o cache HTTP pode ter a arte da versão anterior. */
async function baixarParaArte(arte: Cache, caminho: string, modo: RequestCache = 'no-cache'): Promise<void> {
  const rev = M.revisoes[caminho];
  if (rev === undefined) return;
  const chave = chaveDeRevisao(ESCOPO, caminho, rev);
  if (await arte.match(chave)) return;
  const r = await fetch(`${ESCOPO}${caminho}`, { cache: modo });
  if (!respostaGuardavel({ status: r.status, tipoConteudo: r.headers.get('content-type'), caminho })) throw new Error(`${caminho}: HTTP ${r.status}`);
  await arte.put(chave, r);
}

async function ativar(): Promise<void> {
  if (M.desligado) {
    await Promise.all(cachesNossos(await caches.keys()).map((n) => caches.delete(n)));
    await self.registration.unregister();
    // as páginas abertas saem do controle recarregando (sem SW, rede normal)
    for (const c of await self.clients.matchAll({ type: 'window' })) void c.navigate(c.url).catch(() => undefined);
    return;
  }
  const arte = await caches.open(NOME_CACHE_ARTE);
  const plano = planoDeLimpeza({
    caches: await caches.keys(),
    chavesDaArte: (await arte.keys()).map((r) => r.url),
    versao: M.versao,
    escopo: ESCOPO,
    revisoes: M.revisoes,
  });
  await Promise.all([...plano.apagarCaches.map((n) => caches.delete(n)), ...plano.apagarChaves.map((k) => arte.delete(k))]);
  // 1ª instalação: a página que já está aberta passa a ser controlada (para guardar o que ela pedir daqui em diante). Troca de versão: só chega aqui
  // depois do `ativar` da página, que recarrega no `controllerchange`.
  await self.clients.claim();
}

/** Navegação: o index.html guardado com esta versão (o mesmo para `?trailer=`, `?residencia=`, `?v=`...). Sem shell (cache expulso): rede. */
async function doShell(req: Request): Promise<Response> {
  const hit = await (await caches.open(nomeCacheShell(M.versao))).match(URL_INDEX);
  return hit ?? fetch(req);
}

/** Arquivo do manifesto: cache-first pela chave de revisão; no miss baixa (revalidando), responde e guarda o que for resposta completa. */
async function daRevisao(e: EventoFetch): Promise<Response> {
  const caminho = caminhoNoEscopo(e.request.url, ESCOPO) ?? '';
  const rev = M.revisoes[caminho];
  if (rev === undefined) return fetch(e.request);
  const chave = chaveDeRevisao(ESCOPO, caminho, rev);
  const arte = await caches.open(NOME_CACHE_ARTE);
  const hit = await arte.match(chave);
  if (hit) return hit;
  const r = await fetch(e.request, { cache: 'no-cache' });
  if (respostaGuardavel({ status: r.status, tipoConteudo: r.headers.get('content-type'), caminho })) e.waitUntil(arte.put(chave, r.clone()).catch(() => undefined));
  return r;
}

/** O que a página já tinha baixado antes de o SW assumir (1ª visita): guarda só isso, nada além do usado. Falha de um arquivo não derruba os outros. */
async function guardarUsados(urls: readonly unknown[]): Promise<void> {
  const arte = await caches.open(NOME_CACHE_ARTE);
  const ja = new Set((await arte.keys()).map((r) => r.url));
  const faltam = usadosParaGuardar(urls, ESCOPO, M.revisoes, ja);
  // `default`: o arquivo acabou de ser baixado por esta mesma versão, então o cache HTTP é fresco (e evita baixar tudo de novo)
  for (let i = 0; i < faltam.length; i += 6) {
    await Promise.all(faltam.slice(i, i + 6).map((c) => baixarParaArte(arte, c, 'default').catch(() => undefined)));
  }
}
