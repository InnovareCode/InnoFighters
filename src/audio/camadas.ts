import type { EventoLuta, IdLutador, LeituraLuta } from '../core/contratos';
import { aoGestoDeAudio } from '../platform/audio-desbloqueio';
import { VERSAO } from '../versao';
import type { BancoDeAmostras } from './amostras';
import type { TrilhaMusica } from './audio-sys';
import { chavesSonoras, trilhaDeHoje } from './chaves';
import { reagirAosEventos, type SomPorNome } from './eventos';

/*
 * Ponte entre o jogo (fight.ts, main.ts) e as duas camadas PESADAS: a identidade sonora (`identidade-sonora`, que puxa `data/sons` e a síntese de voz) e os
 * temas (`temas`, que puxa `data/musica` e o compilador). Entram no pacote como pedaços separados, baixados por `import()` no boot (o pacote principal fica
 * menor e o rollback por código continua barato). Este módulo é LEVE (só tipos e `eventos`/`chaves`).
 *
 * `main.ts` chama `carregarCamadasSonoras` ANTES da primeira cena (a chamada é assíncrona, o jogo não). Se o pedaço não carregar (rede, cache), a chave volta a
 * `false` e o jogo segue com os sons e a música de antes. Enquanto a camada não estiver carregada (testes de cena, por exemplo) o comportamento é o de antes.
 */

type CamadaIdentidade = typeof import('./identidade-sonora');
type CamadaTemas = typeof import('./temas');
type CamadaAmostras = typeof import('./amostras');
let identidade: CamadaIdentidade | null = null;
let temas: CamadaTemas | null = null;
let amostras: CamadaAmostras | null = null;
let banco: BancoDeAmostras | null = null;
let desfazOuvinte: (() => void) | null = null;
let ultimoPar = '';
let ultimoTick = 0;
let etapa2Agendada = false;

export interface QuaisCamadas {
  readonly identidade?: boolean;
  readonly temas?: boolean;
  /** As amostras reais (samples de impacto, voz e família de especial): só valem com a identidade carregada. */
  readonly amostras?: boolean;
  /** Pasta do manifesto e das folhas (padrão: `<BASE_URL>assets/sons/`). Para teste. */
  readonly baseDasAmostras?: string;
  /**
   * Manifesto de amostras INVÁLIDO (parseia, mas não passa na validação): `true` relança (derruba o boot; é o padrão em DEV/CI, para pegar manifesto ruim), `false` cai na
   * síntese (chave `amostras` desligada na sessão) e devolve `false`. Padrão: `import.meta.env.DEV`, ou seja, produção nunca derruba o boot por causa de som.
   */
  readonly falharAlto?: boolean;
}

/**
 * Baixa (e, ao carregar, VALIDA: os dois módulos lançam se um lutador estiver sem voz, sem tema ou fora do orçamento) as camadas pedidas.
 * Falha de REDE (o `import()` rejeita com `TypeError`): desliga a chave correspondente e devolve `false` (o jogo segue com o som e a música de antes).
 * Dados inválidos de sons e temas (qualquer outro erro): relança, e o boot cai. EXCEÇÃO: as amostras reais (pacote opcional) só relançam em DEV/CI (`falharAlto`);
 * em produção o erro vira `console.error` + síntese e a função devolve `false`.
 */
export async function carregarCamadasSonoras(quais: QuaisCamadas): Promise<boolean> {
  let ok = true;
  if (quais.identidade) {
    try {
      identidade = await import('./identidade-sonora');
    } catch (e) {
      if (!(e instanceof TypeError)) throw e; // dados inválidos (validação no carregamento): derruba o boot, alto e cedo
      ok = false;
      chavesSonoras.identidade = false;
      console.error('identidade sonora não carregou; seguindo com os sons de hoje', e);
    }
  }
  if (quais.temas) {
    try {
      temas = await import('./temas');
    } catch (e) {
      if (!(e instanceof TypeError)) throw e; // dados inválidos (validação no carregamento): derruba o boot, alto e cedo
      ok = false;
      chavesSonoras.temas = false;
      console.error('temas musicais não carregaram; seguindo com a música de hoje', e);
    }
  }
  if (quais.amostras && identidade) {
    // Em PRODUÇÃO som nunca derruba o boot: o pacote é opcional e pode estar fora de sincronia com o JS (o GitHub Pages guarda o JS por 10 min; um deploy que muda o
    // manifesto, com o JS antigo em cache, dá "id fora da tabela"). Em DEV/CI (`falharAlto`) o erro sobe, para os testes e o desenvolvedor pegarem manifesto ruim.
    const falharAlto = quais.falharAlto ?? import.meta.env.DEV;
    try {
      try {
        amostras = await import('./amostras');
      } catch (e) {
        if (!(e instanceof TypeError)) throw e;
        ok = false;
        chavesSonoras.amostras = false;
        console.error('amostras reais não carregaram; seguindo com os sons sintetizados', e);
      }
      if (amostras) {
        // manifesto ausente/ilegível (404, rede, HTML) = null (síntese total, sem erro); manifesto que parseia mas é INVÁLIDO lança
        banco = await amostras.carregarBanco({ baseUrl: quais.baseDasAmostras ?? `${import.meta.env.BASE_URL}assets/sons/`, sufixo: `?v=${VERSAO.commit}` });
        if (banco) {
          identidade.registrarBancoDeAmostras(banco);
          const b = banco;
          etapa2Agendada = false; // banco novo, etapa 2 nova
          desfazOuvinte?.();
          // O AudioContext nasce no 1º gesto: a base já baixada decodifica nesse instante, não no meio da 1ª luta. É também o gatilho da ETAPA 2 do boot (T5 do orçamento):
          // nada de som é baixado antes do gesto, e a base (272 KiB) só começa a descer quando o navegador está ocioso.
          desfazOuvinte = aoGestoDeAudio((a) => {
            b.sincronizar(a.ctx as BaseAudioContext | null);
            agendarEtapa2(b);
          });
        }
      }
    } catch (e) {
      if (falharAlto) throw e;
      ok = false;
      banco = null;
      amostras = null;
      identidade.registrarBancoDeAmostras(null);
      chavesSonoras.amostras = false; // para a sessão: nada de pedir folha, nada de amostra; a síntese de hoje toca tudo
      console.error('pacote de amostras inválido ou fora de sincronia com o jogo; seguindo com os sons sintetizados', e);
    }
  }
  return ok;
}

/** O banco de amostras reais, se o manifesto existe e carregou (senão o jogo toca a síntese). */
export function bancoDeAmostrasAtivo(): BancoDeAmostras | null {
  return banco;
}

/** Desliga e esquece as amostras (testes). */
export function descartarAmostras(): void {
  desfazOuvinte?.();
  desfazOuvinte = null;
  identidade?.registrarBancoDeAmostras(null);
  banco = null;
  amostras = null;
  ultimoPar = '';
  ultimoTick = 0;
  etapa2Agendada = false;
}

/** `requestIdleCallback` onde existe; no WebKit (iOS/Safari não o têm) um `setTimeout` curto. Nada de relógio de parede em `src/audio`. */
function noOcio(fn: () => void): void {
  const g = globalThis as { requestIdleCallback?: (f: () => void, o?: { timeout: number }) => number };
  if (typeof g.requestIdleCallback === 'function') g.requestIdleCallback(fn, { timeout: 3000 });
  else setTimeout(fn, 200);
}

/**
 * ETAPA 2 do boot (docs/orcamentos-2026-10-23.md §2.2, T5): depois do 1º gesto e com o navegador ocioso, baixa a folha `base` (só bytes; decodifica quando há contexto). Uma vez
 * por banco. As folhas dos lutadores NÃO vêm aqui: sobem na tela VS (`prepararLutaSonora`) e, no mais tardar, no 1º tick da luta (`reagirDoJogo`). Até chegarem, o jogo toca a
 * síntese de hoje: o 1º golpe nunca fica mudo.
 */
function agendarEtapa2(b: BancoDeAmostras): void {
  if (etapa2Agendada) return;
  etapa2Agendada = true;
  noOcio(() => {
    if (banco === b && chavesSonoras.amostras) void b.baixarFolha('base');
  });
}

/**
 * O confronto foi decidido: pede a folha da base e as dos dois lutadores (só bytes; a decodificação espera o contexto e vai em fila). Idempotente. A tela VS chama isto ao
 * entrar (a espera dela, de 0,5 a 3 s, é o que paga o download de ~50 KiB por lutador); `reagirDoJogo` repete no 1º tick de cada confronto, como rede de segurança.
 */
export function prepararLutaSonora(ids: readonly string[], ctx?: unknown): void {
  if (!banco) return;
  banco.prepararLutadores(ids);
  banco.sincronizar(ctx as BaseAudioContext | null | undefined);
}

/** A identidade sonora está ligada E carregada? É o que manda a abertura da tarja e o som da sessão do especial calarem. */
export function identidadeAtiva(): boolean {
  return chavesSonoras.identidade && identidade !== null;
}

/** O AudioSys visto pela ponte: por nome (os sons de hoje) e, se a identidade estiver ligada, a semente da variação (`semente + 6`). */
export type AudioDoJogo = { readonly sementeVariacao?: number; readonly ctx?: unknown };

/**
 * Os sons dos eventos de um tick. Identidade desligada = `reagirAosEventos`, exatamente como antes. Ligada = `reagirComIdentidade` com o contexto
 * da luta (ids, fichas, tick) e a semente da variação do AudioSys. Kiai de vitória só no fim da luta (o plano lê `round.fimDaLuta`).
 */
export function reagirDoJogo(audio: AudioDoJogo, luta: Pick<LeituraLuta, 'fighters' | 't'>, eventos: readonly EventoLuta[]): void {
  if (banco && chavesSonoras.amostras) {
    // 1º tick de um confronto novo: baixa as folhas dos dois lutadores; todo tick: decodifica o que já chegou (barato quando não há nada pendente).
    // Confronto novo = par diferente OU o relógio da luta voltou para trás (a revanche do MESMO par recomeça em t=0): `prepararLutadores` é idempotente e RETENTA a
    // folha que falhou (no máximo 3 pedidos por folha, ver `MAX_TENTATIVAS`), então a revanche tem a 2ª chance sem martelar a rede a cada tick.
    const ids = [luta.fighters[0].id, luta.fighters[1].id];
    const par = ids.join('|');
    if (par !== ultimoPar || luta.t < ultimoTick) {
      ultimoPar = par;
      banco.prepararLutadores(ids);
    }
    ultimoTick = luta.t;
    banco.sincronizar(audio.ctx as BaseAudioContext | null | undefined);
  }
  if (identidade && chavesSonoras.identidade) {
    identidade.reagirComIdentidade(audio as unknown as Parameters<CamadaIdentidade['reagirComIdentidade']>[0], eventos, identidade.contextoSonoro(luta, typeof audio.sementeVariacao === 'number' ? audio.sementeVariacao : 0), undefined, true);
    return;
  }
  reagirAosEventos(audio as unknown as SomPorNome, eventos);
}

/**
 * A trilha de uma luta. Temas desligados (ou ainda não carregados) = a de hoje (`'chefe'` no chefão que tem `trilha`, `'fight'` no resto);
 * ligados = `trilhaDaLuta` (o tema do ADVERSÁRIO, `c2`, em todos os modos; o ZENON toca a valsa).
 */
export function trilhaDoJogo(cfg: { readonly c2: IdLutador; readonly chefe?: boolean | undefined }, regras: { readonly temasMusicais: boolean }, trilhaDoChefe?: 'chefe'): TrilhaMusica {
  if (temas && chavesSonoras.temas) return temas.trilhaDaLuta(cfg, regras, true, trilhaDoChefe);
  return trilhaDeHoje(cfg, trilhaDoChefe);
}
