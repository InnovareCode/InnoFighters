/**
 * Identidade do build (commit curto + instante da compilação), injetada pelo Vite (`define` em vite.config.ts) e publicada em
 * `version.json`. Serve para o dono PROVAR qual versão está vendo e para o jogo saber se há uma mais nova no ar.
 */

export interface IdentidadeDoBuild {
  readonly commit: string;
  /** ISO 8601 (UTC). Vazio = desconhecido. */
  readonly data: string;
  /** Havia alterações não commitadas na hora do build (só em máquina de desenvolvimento). */
  readonly sujo: boolean;
}

declare const __INNO_BUILD__: IdentidadeDoBuild | undefined;

/** O build que está rodando. Fora do Vite (teste sem `define`): 'dev'. */
export const VERSAO: IdentidadeDoBuild = typeof __INNO_BUILD__ !== 'undefined' ? __INNO_BUILD__ : { commit: 'dev', data: '', sujo: false };

/** "64f2647 · 21/10 23:08" (horário de Brasília). Data inválida ou ausente: só o commit. */
export function rotuloDaVersao(v: IdentidadeDoBuild = VERSAO): string {
  const commit = v.commit + (v.sujo ? '+' : '');
  const t = Date.parse(v.data);
  if (!Number.isFinite(t)) return commit;
  const partes = new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }).formatToParts(
    new Date(t),
  );
  const p = (tipo: string): string => partes.find((x) => x.type === tipo)?.value ?? '';
  return `${commit} · ${p('day')}/${p('month')} ${p('hour')}:${p('minute')}`;
}

export type EstadoDaVersao = 'verificando' | 'atual' | 'nova' | 'desconhecida';

/**
 * Pergunta ao servidor qual versão está no ar (`version.json`, sem cache) e compara com a que está rodando.
 * 'desconhecida' = sem rede, sem o arquivo (servidor de desenvolvimento) ou resposta que não é a esperada: nunca lança.
 */
export async function verificarVersao(
  atual: IdentidadeDoBuild = VERSAO,
  buscar: typeof fetch = fetch,
  base: string = import.meta.env.BASE_URL,
): Promise<{ readonly estado: EstadoDaVersao; readonly noAr: IdentidadeDoBuild | null }> {
  try {
    const r = await buscar(`${base}version.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!r.ok) return { estado: 'desconhecida', noAr: null };
    const j = (await r.json()) as Partial<IdentidadeDoBuild> | null;
    if (!j || typeof j.commit !== 'string' || typeof j.data !== 'string') return { estado: 'desconhecida', noAr: null };
    const noAr: IdentidadeDoBuild = { commit: j.commit, data: j.data, sujo: j.sujo === true };
    return { estado: noAr.commit === atual.commit && noAr.data === atual.data ? 'atual' : 'nova', noAr };
  } catch {
    return { estado: 'desconhecida', noAr: null };
  }
}

/**
 * Com service worker (src/platform/sw.ts), o index.html vem do shell da versão instalada: recarregar com `?v=` serviria a MESMA versão. O SW
 * registra aqui um atualizador que pede e ativa a versão nova; ele devolve true quando a troca foi feita (a página recarrega sozinha) e false quando
 * não há versão nova no SW, caso em que vale o recarregar de sempre.
 */
let atualizadorSw: (() => Promise<boolean>) | null = null;
export function definirAtualizadorSw(f: (() => Promise<boolean>) | null): void {
  atualizadorSw = f;
}

/** Recarrega a página furando o cache do index.html (parâmetro novo na URL = outra entrada de cache). */
export function recarregarSemCache(alvo: Pick<Window, 'location'> = window, noAr: IdentidadeDoBuild | null = null): void {
  if (!atualizadorSw) {
    recarregarDireto(alvo, noAr);
    return;
  }
  void atualizadorSw().then(
    (trocou) => {
      if (!trocou) recarregarDireto(alvo, noAr);
    },
    () => recarregarDireto(alvo, noAr),
  );
}

function recarregarDireto(alvo: Pick<Window, 'location'>, noAr: IdentidadeDoBuild | null): void {
  const url = new URL(alvo.location.href);
  url.searchParams.set('v', noAr?.commit ?? String(Date.now()));
  alvo.location.replace(url.toString());
}
