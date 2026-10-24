/**
 * Registro do service worker (T7; desenho em docs/service-worker.md). Só em produção: o `vite dev` e os servidores do e2e (hmr/watch desligados) NÃO registram,
 * para o SW não contaminar a medição de memória nem servir arquivo velho a quem edita.
 *
 * Kill switch por URL: `?sw=0` desregistra, apaga os caches `inno-*` e FICA desligado nas próximas visitas (flag no localStorage) até `?sw=1`.
 * Troca de versão: a versão nova instala em segundo plano e espera; ela só assume quando esta página pede (no boot, ou no botão "atualizar" das Opções),
 * nunca no meio de uma luta, e a página recarrega ao trocar. Sem a troca, arte nova e JS velho se misturariam.
 */
import { definirAtualizadorSw, type IdentidadeDoBuild } from '../versao';

export type AcaoSw = 'registrar' | 'desligar' | 'ignorar';
export interface DecisaoSw {
  readonly acao: AcaoSw;
  /** O que fazer com a flag persistente: gravar '0', apagar, ou deixar como está. */
  readonly flag: 'gravar-desligado' | 'apagar' | 'manter';
}

const CHAVE_FLAG = 'inno-sw';
const CHAVE_TROCA = 'inno-sw-troca';
/** Até quando, desde a abertura da página, uma versão nova pode assumir sozinha (a abertura e o título; a luta fica muito depois). */
const JANELA_DE_BOOT_MS = 20_000;

/** Decisão pura: o que fazer nesta visita. */
export function decidirSw(e: { producao: boolean; temSuporte: boolean; search: string; flag: string | null }): DecisaoSw {
  if (!e.producao || !e.temSuporte) return { acao: 'ignorar', flag: 'manter' };
  const sw = new URLSearchParams(e.search).get('sw');
  if (sw === '0') return { acao: 'desligar', flag: 'gravar-desligado' };
  if (sw === '1') return { acao: 'registrar', flag: 'apagar' };
  return e.flag === '0' ? { acao: 'desligar', flag: 'manter' } : { acao: 'registrar', flag: 'manter' };
}

/** A troca já foi tentada há pouco nesta aba? (trava contra laço de recarga se a versão nova não assumir) */
export function trocaRecente(registro: string | null, agora: number, janelaMs = 15_000): boolean {
  const t = registro === null ? Number.NaN : Number(registro);
  return Number.isFinite(t) && agora - t >= 0 && agora - t < janelaMs;
}

function lerFlag(): string | null {
  try {
    return window.localStorage.getItem(CHAVE_FLAG);
  } catch {
    return null;
  }
}
function gravarFlag(valor: string | null): void {
  try {
    if (valor === null) window.localStorage.removeItem(CHAVE_FLAG);
    else window.localStorage.setItem(CHAVE_FLAG, valor);
  } catch {
    /* armazenamento bloqueado: o ?sw=0 vale só nesta visita */
  }
}

async function desligar(escopo: string): Promise<void> {
  const regs = await navigator.serviceWorker.getRegistrations();
  await Promise.all(regs.filter((r) => r.scope.startsWith(escopo)).map((r) => r.unregister()));
  if (typeof caches !== 'undefined') await Promise.all((await caches.keys()).filter((n) => n.startsWith('inno-')).map((n) => caches.delete(n)));
}

/** Espera o worker que está instalando terminar (installed) ou falhar; null se estourar o tempo. */
function esperarInstalacao(w: ServiceWorker | null, ms: number): Promise<ServiceWorker | null> {
  if (!w) return Promise.resolve(null);
  return new Promise((resolve) => {
    const fim = setTimeout(() => resolve(null), ms);
    w.addEventListener('statechange', () => {
      if (w.state === 'installed') {
        clearTimeout(fim);
        resolve(w);
      } else if (w.state === 'redundant') {
        clearTimeout(fim);
        resolve(null);
      }
    });
  });
}

/**
 * Registra (ou desliga) o SW. Nunca lança: um navegador sem SW, um modo privado que o bloqueia ou uma falha de rede deixam o jogo rodando como antes.
 * @param base `import.meta.env.BASE_URL` (o escopo do SW é a base do site: `/` no EasyPanel, `/InnoFighters/` no Pages)
 * @param versao a identidade embutida neste JS; vai ao SW para ele só guardar o que esta MESMA versão já baixou
 */
export function iniciarSw(opcoes: { base: string; versao: IdentidadeDoBuild; producao?: boolean }): void {
  const producao = opcoes.producao ?? import.meta.env.PROD;
  const temSuporte = typeof navigator !== 'undefined' && 'serviceWorker' in navigator;
  const d = decidirSw({ producao, temSuporte, search: window.location.search, flag: lerFlag() });
  if (d.acao === 'ignorar') return;
  if (d.flag === 'gravar-desligado') gravarFlag('0');
  else if (d.flag === 'apagar') gravarFlag(null);
  const escopo = new URL(opcoes.base, window.location.href).href;

  if (d.acao === 'desligar') {
    const controlada = navigator.serviceWorker.controller !== null;
    void desligar(escopo)
      .then(() => {
        // esta página veio do shell do SW; recarrega uma vez para sair do controle e vir da rede
        if (controlada && !trocaRecente(sessionStorageSeguro(CHAVE_TROCA), Date.now())) {
          marcarTroca();
          window.location.reload();
        }
      })
      .catch(() => undefined);
    return;
  }

  // o Resource Timing guarda 250 entradas por padrão; a captura da 1ª visita precisa de todas
  if (typeof performance.setResourceTimingBufferSize === 'function') performance.setResourceTimingBufferSize(1500);
  const tinhaControlador = navigator.serviceWorker.controller !== null;
  let recarregando = false;
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    // 1ª instalação (sem controlador antes): a página só passa a ser controlada, não precisa recarregar
    if (!tinhaControlador || recarregando) return;
    recarregando = true;
    marcarTroca();
    window.location.reload();
  });

  void (async () => {
    const reg = await navigator.serviceWorker.register(new URL('sw.js', escopo).href, { scope: escopo, updateViaCache: 'none' });
    definirAtualizadorSw(() => atualizarAgora(reg));
    // Versão esperando (instalada na visita anterior, ou que acabou de instalar): no boot é o momento seguro para trocar, antes de qualquer luta.
    // Depois da janela de boot ela só é aplicada no botão "atualizar" ou na próxima visita, nunca no meio da partida.
    const trocarSeSeguro = (w: ServiceWorker | null): void => {
      if (!tinhaControlador || !w || performance.now() > JANELA_DE_BOOT_MS) return;
      if (trocaRecente(sessionStorageSeguro(CHAVE_TROCA), Date.now())) return;
      w.postMessage({ tipo: 'ativar' });
    };
    trocarSeSeguro(reg.waiting);
    reg.addEventListener('updatefound', () => {
      const novo = reg.installing;
      novo?.addEventListener('statechange', () => {
        if (novo.state === 'installed') trocarSeSeguro(reg.waiting);
      });
    });
    if (reg.installing) void esperarInstalacao(reg.installing, JANELA_DE_BOOT_MS).then(trocarSeSeguro);
    const pronto = await navigator.serviceWorker.ready;
    trocarSeSeguro(reg.waiting); // segunda olhada: cobre o navegador que só preenche `waiting` depois do registro
    // 1ª visita: o que a página baixou ANTES de o SW assumir não passou por ele. Captura agora e mais duas vezes (a arte vai chegando).
    const enviar = (): void => {
      const urls = performance.getEntriesByType('resource').map((r) => r.name);
      pronto.active?.postMessage({ tipo: 'usados', versao: { commit: opcoes.versao.commit, data: opcoes.versao.data }, urls });
    };
    enviar();
    window.setTimeout(enviar, 8_000);
    window.setTimeout(enviar, 30_000);
  })().catch((e: unknown) => console.warn('[sw] registro falhou; o jogo segue sem service worker:', e));
}

/** Botão "atualizar": pede ao SW a versão nova e a ativa. true = a troca foi pedida e a página recarrega sozinha; false = não há versão nova no SW. */
export async function atualizarAgora(reg: ServiceWorkerRegistration): Promise<boolean> {
  await reg.update();
  const novo = reg.waiting ?? (await esperarInstalacao(reg.installing, 15_000));
  if (!novo) return false;
  const trocou = new Promise<boolean>((resolve) => {
    const fim = setTimeout(() => resolve(false), 8_000);
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      clearTimeout(fim);
      resolve(true);
    });
  });
  novo.postMessage({ tipo: 'ativar' });
  return trocou;
}

function sessionStorageSeguro(chave: string): string | null {
  try {
    return window.sessionStorage.getItem(chave);
  } catch {
    return null;
  }
}
function marcarTroca(): void {
  try {
    window.sessionStorage.setItem(CHAVE_TROCA, String(Date.now()));
  } catch {
    /* sem sessionStorage: sem a trava, mas a troca só acontece uma vez por versão nova */
  }
}
