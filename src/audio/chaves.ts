/*
 * As duas chaves de ROLLBACK POR CÓDIGO da identidade sonora por lutador e dos temas musicais por lutador. Decisão do dono (2026-10-21): as duas implementações
 * ficam SEMPRE LIGADAS, sem opção no menu e sem parâmetro de URL. Quem precisar voltar ao som e à música de antes muda a constante abaixo para `false` e publica
 * (`false` = o jogo de antes: `reagirAosEventos` e a trilha `fight`/`chefe`).
 *
 * Este módulo é LEVE de propósito (nenhum import de `data/sons`, `data/musica` nem das camadas): ele entra no pacote principal, e as camadas pesadas
 * (`identidade-sonora` e `temas`) são pedaços à parte, baixados no boot por `import()` (ver `camadas.ts`). Por isso as constantes moram AQUI e as camadas só
 * as reexportam.
 *
 * `?escuta=1` abre o painel de escuta do dono (src/ui/escuta.ts): toca cada som e cada tema sem jogar. Não liga nem desliga nada.
 */

/** Rollback da identidade sonora (voz e assinatura dos especiais por lutador). Sempre ligada. */
export const IDENTIDADE_SONORA = true;
/** Rollback dos temas musicais por lutador (o ZENON mantém a valsa). Sempre ligados; `Regras.temasMusicais` os desliga só em `?expansao=4` (fidelidade). */
export const TEMAS_POR_LUTADOR = true;

/** O estado VIVO das chaves (o que o jogo consulta). Começa nas constantes acima; só `camadas.ts` (camada que não carregou) e os testes o mudam. Nunca é salvo. */
export const chavesSonoras: { identidade: boolean; temas: boolean } = { identidade: IDENTIDADE_SONORA, temas: TEMAS_POR_LUTADOR };

export interface EscutaDaUrl {
  /** `?escuta=1` */
  readonly painel: boolean;
}

/** Lê `?escuta=1` da query string. Só o valor exato `1` liga. Pura. */
export function lerEscutaDaUrl(search: string): EscutaDaUrl {
  return { painel: new URLSearchParams(search).get('escuta') === '1' };
}

/** A trilha de ANTES de uma luta: `'chefe'` no chefão que tem `trilha`, `'fight'` no resto. É o resultado de `trilhaDaLuta` com a chave desligada. */
export function trilhaDeHoje(cfg: { readonly chefe?: boolean | undefined }, trilhaDoChefe?: 'chefe'): 'fight' | 'chefe' {
  return cfg.chefe ? (trilhaDoChefe ?? 'fight') : 'fight';
}
