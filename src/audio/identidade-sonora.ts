import type { EventoLuta, IdLutador, IndiceLutador, LeituraLuta } from '../core/contratos';
import { DADOS_SONS } from '../data/sons';
import type { AssinaturaEspecial, Chamada, DadosSons, Grito, PerfilVocal } from '../data/sons/tipos';
import { FONTES_POR_PLANO } from './audio-sys';
import { reagirAosEventos, sonsDoEvento, type ChamadaSom, type SomPorNome } from './eventos';
import { cortarParaOrcamento, duracaoDaReceita, fontesDaReceita } from './orcamento-sonoro';
import { tocarReceita, type ChamadaReceita, type SintetizadorLike } from './receitas';
import { sintetizarGrito } from './sintese-voz';

/*
 * Camada de identidade sonora (docs/spec-sons-por-lutador.md, opção B): lê o evento da luta DEPOIS de `sonsDoEvento` e decide o que MANTER dos sons
 * genéricos e o que ACRESCENTAR (voz do lutador, assinatura do especial). `sonsDoEvento` NÃO muda (o lock-step com o protótipo compara a saída dele).
 *
 * PONTO DE LIGAÇÃO (S4, fora desta entrega; src/ui/cenas/fight.ts e src/main.ts são da Lyra):
 *   fight.ts:~438  reagirAosEventos(audio, game.events)  ->  reagirComIdentidade(audio, game.events, contextoSonoro(game, semente))
 *   main.ts:~89    new AudioSys({ rng, sementeVariacao: semente + 6, limitador: true })
 *   fight.ts:~103/116  com IDENTIDADE_SONORA ligada: a abertura da tarja e o som de acerto/defesa da SessaoEspecial não tocam.
 * Tudo atrás da chave IDENTIDADE_SONORA: falsa = o jogo de hoje.
 */

/** Chave de rollback. Só vira `true` depois da escuta do dono (S5). */
export const IDENTIDADE_SONORA = false;

/** Gongo comum do KO (3.4): é a marca do KO do JOGO, não do lutador. A mesma coisa que `ko()` toca hoje depois da voz. */
export const GONGO_KO: readonly ChamadaReceita[] = [
  { k: 'R', tipo: 'lowpass', f0: 500, f1: 80, Q: 1, t: 0.3, vol: 0.4, camada: 'corpo' },
  { k: 'T', tipo: 'sine', f0: 110, t: 1.4, vol: 0.5, quando: 0.1, camada: 'corpo' },
  { k: 'T', tipo: 'sine', f0: 221, t: 1.0, vol: 0.2, quando: 0.1, camada: 'cauda' },
];
/** O "vidro" comum da guarda quebrada (3.4). */
export const VIDRO_GUARDA: readonly ChamadaReceita[] = [
  { k: 'R', tipo: 'highpass', f0: 6000, Q: 1, t: 0.12, vol: 0.25, camada: 'ataque' },
  { k: 'T', tipo: 'triangle', f0: 3520, t: 0.08, vol: 0.08, camada: 'corpo' },
  { k: 'T', tipo: 'triangle', f0: 4186, t: 0.06, vol: 0.06, quando: 0.03, camada: 'extra' },
];
/** Atraso do kiai de vitória: cai no acorde final do jingle e no balão de vitória da provocação (D-S2, R12). */
export const ATRASO_VITORIA_MS = 950;
/** Espaço entre as batidas repetidas da estampa por nível (MASHI). */
const PASSO_NIVEL_S = 0.07;

export interface ContextoSonoro {
  readonly ids: readonly [IdLutador, IdLutador];
  readonly fichas: readonly [string | null, string | null];
  /** `sementeDaPartida + 6`. */
  readonly semente: number;
  /** Tick da luta (`Game.t`). */
  readonly tick: number;
  /** Posição do evento dentro do tick (entra na variação). */
  readonly indice?: number;
}

/** Monta o contexto a partir da leitura da luta (só lê `fighters[i].id`, `.ficha` e `t`). */
export function contextoSonoro(luta: Pick<LeituraLuta, 'fighters' | 't'>, semente: number): ContextoSonoro {
  const [a, b] = luta.fighters;
  return { ids: [a.id, b.id], fichas: [a.ficha, b.ficha], semente, tick: luta.t };
}

/**
 * Variação sem estado: hash inteiro + um passo de mulberry32. Mesma entrada, mesmo número, em Node ou no navegador, e a ordem/quantidade de sons
 * tocados não desloca nada (não consome o RNG da lógica nem o `rngVisual`). Devolve [0, 1).
 */
export function variacao(semente: number, tick: number, indice: number, lutador: number, canal: number): number {
  let a = Math.imul(semente | 0, 0x9e3779b1) ^ Math.imul(tick | 0, 0x85ebca6b) ^ Math.imul((indice | 0) + 1, 0xc2b2ae35) ^ Math.imul((lutador | 0) + 1, 0x27d4eb2f) ^ Math.imul((canal | 0) + 1, 0x165667b1);
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export type PrioridadeSom = 0 | 1 | 2 | 3;
type CategoriaGrito = 'kiai' | 'leve' | 'pesado' | 'guarda' | 'ko' | 'vitoria' | 'esforco';
/** KO e vitória (3) > grito e sucesso (2) > dano e impacto (1) > o resto (0). */
export interface ItemDoPlano {
  readonly receita: readonly ChamadaReceita[];
  readonly prioridade: PrioridadeSom;
  /** Lutador cuja garganta a voz usa (uma voz por vez por lutador). */
  readonly garganta?: IndiceLutador;
  readonly tipo?: 'voz' | 'dano' | 'ko';
  /** Defesa de especial: a estampa abafada (passa-baixa 1200 Hz, x0,4). */
  readonly abafado?: true;
  readonly atrasoMs?: number;
  /** Multiplica o volume do item inteiro (o ganho em dB dos dados, já convertido). Ausente = 1. */
  readonly vol?: number;
}
export interface Plano {
  /** O que continua vindo de `sonsDoEvento`, pelo nome do método (a mesma forma). */
  readonly manter: readonly ChamadaSom[];
  readonly tocar: readonly ItemDoPlano[];
}

const comoReceita = (cs: readonly Chamada[], mudar?: (c: Chamada) => ChamadaReceita, quando = 0): ChamadaReceita[] =>
  cs.map((c) => {
    const r = mudar ? mudar(c) : (c as ChamadaReceita);
    return quando ? { ...r, quando: (r.quando ?? 0) + quando } : r;
  });

// --- resolução dos dados ---
function perfilDe(dados: DadosSons, ctx: ContextoSonoro, i: IndiceLutador): PerfilVocal | undefined {
  const id = ctx.ids[i];
  const base = dados.perfis[id];
  if (!base) return undefined;
  const ficha = ctx.fichas[i];
  const sobre = ficha ? dados.perfisPorFicha[`${id}.${ficha}`] : undefined;
  return sobre ? { ...base, ...sobre } : base;
}

/** A assinatura da ficha ativa, senão a da base (a ficha `chefe` do ZENON cai na base). */
function assinaturaDe(dados: DadosSons, id: IdLutador, ficha: string | null, golpe: string | undefined): AssinaturaEspecial | undefined {
  if (golpe === undefined) return undefined;
  return dados.assinaturas[`${id}.${ficha ?? 'base'}.${golpe}`] ?? dados.assinaturas[`${id}.base.${golpe}`];
}

/** Procura, entre as assinaturas do lutador na ficha ativa (e na base), a que cumpre `serve`. */
function assinaturaOnde(dados: DadosSons, id: IdLutador, ficha: string | null, serve: (a: AssinaturaEspecial) => boolean): AssinaturaEspecial | undefined {
  for (const f of ficha ? [ficha, 'base'] : ['base']) {
    const prefixo = `${id}.${f}.`;
    for (const [chave, a] of Object.entries(dados.assinaturas)) if (chave.startsWith(prefixo) && serve(a)) return a;
  }
  return undefined;
}

/**
 * O plano sonoro de UM evento. PURA: (evento, contexto, dados) -> plano. Mesmo evento + mesma semente + mesmo tick = mesmo plano.
 * Lutador sem voz (ou golpe sem assinatura) cai nos sons genéricos de hoje: `manter` = `sonsDoEvento(ev)` inteiro e nada a acrescentar.
 */
export function planoSonoro(ev: EventoLuta, ctx: ContextoSonoro, dados: DadosSons = DADOS_SONS): Plano {
  const base = sonsDoEvento(ev);
  let manter: ChamadaSom[] = [...base];
  const tocar: ItemDoPlano[] = [];
  const tira = (...metodos: string[]): void => {
    manter = manter.filter((c) => !metodos.includes(c.metodo));
  };
  const indice = ctx.indice ?? 0;
  const v = (lutador: number, canal: number): number => variacao(ctx.semente, ctx.tick, indice, lutador, canal);
  const espelho = (i: IndiceLutador): boolean => i === 1 && ctx.ids[0] === ctx.ids[1];
  const gDb = (db: number | undefined): number => (db === undefined ? 1 : Math.pow(10, db / 20));
  const voz = (i: IndiceLutador, g: Grito, prioridade: PrioridadeSom, tipo: 'voz' | 'dano' | 'ko', atrasoMs?: number, cat: CategoriaGrito = 'kiai', extraDb?: number): boolean => {
    const perfil = perfilDe(dados, ctx, i);
    if (!perfil) return false;
    const receita = sintetizarGrito(perfil, g, { tom: 1 + (v(i, 0) * 2 - 1) * 0.03, vol: (0.9 + 0.1 * v(i, 1)) * gDb(perfil.ganhoDb?.[cat]) * gDb(extraDb), espelho: espelho(i) });
    tocar.push({ receita, prioridade, garganta: i, tipo, ...(atrasoMs ? { atrasoMs } : {}) });
    return true;
  };
  const efeito = (cs: readonly Chamada[] | undefined, prioridade: PrioridadeSom, extra: Partial<ItemDoPlano> = {}, quando = 0, ganho?: number): void => {
    if (cs && cs.length) tocar.push({ receita: comoReceita(cs, undefined, quando), prioridade, ...(ganho !== undefined && ganho !== 1 ? { vol: ganho } : {}), ...extra });
  };
  /** Dano do defensor `i`: leve ou pesado, a variante escolhida por `variacao`. Troca o `hurt` genérico. */
  const dano = (i: IndiceLutador, pesado: boolean): void => {
    const g = perfilDe(dados, ctx, i)?.gritos;
    if (!g) return;
    const lista = pesado ? g.pesado : g.leve;
    const grito = lista[Math.min(lista.length - 1, Math.floor(v(i, 2) * lista.length))];
    if (grito && voz(i, grito, 1, 'dano', undefined, pesado ? 'pesado' : 'leve')) tira('hurt');
  };

  switch (ev.tipo) {
    case 'special': {
      const a = assinaturaDe(dados, ctx.ids[ev.lutador], ctx.fichas[ev.lutador], ev.golpe);
      if (!a) break;
      tira('special');
      if (a.grito) voz(ev.lutador, a.grito, 2, 'voz', undefined, 'kiai', a.ganhoDb?.inicio);
      efeito(a.conjuracao, 2, {}, 0, gDb(a.ganhoDb?.inicio));
      break;
    }
    case 'projectile': {
      const id = ctx.ids[ev.lutador];
      const a = assinaturaOnde(dados, id, ctx.fichas[ev.lutador], (x) => x.estilo === ev.style && x.lancamento !== undefined);
      if (!a?.lancamento) break;
      tira('fireballLaunch');
      efeito(a.lancamento, 1, {}, 0, gDb(a.ganhoDb?.lancamento));
      break;
    }
    case 'hit':
    case 'throw': {
      const pesado = ev.tipo === 'throw' || ev.grande || (ev.dano ?? 0) >= 12 || ev.contragolpe;
      dano(ev.defensor, pesado);
      if (!ev.especial) break;
      const dono = ctx.ids[ev.atacante];
      const ficha = ctx.fichas[ev.atacante];
      if (ev.golpe === 'sResp') {
        const a = assinaturaOnde(dados, dono, ficha, (x) => x.resposta?.golpe === 'sResp');
        if (a?.resposta) {
          voz(ev.atacante, a.resposta.grito, 2, 'voz', undefined, 'kiai', a.ganhoDb?.estampa);
          efeito(a.resposta.estampa, 1, {}, 0, gDb(a.ganhoDb?.estampa));
        }
        break;
      }
      const a = assinaturaDe(dados, dono, ficha, ev.golpe);
      if (!a) break;
      const projetil = ev.tipo === 'hit' && ev.projetil;
      if (projetil) tira(ev.snd);
      const repete = ev.tipo === 'hit' && a.porNivel && ev.nivelCarga ? ev.nivelCarga : 1;
      const fator = ev.tipo === 'hit' && a.porAcerto && a.porAcerto.length ? (a.porAcerto[Math.min(a.porAcerto.length, Math.max(1, ev.acertos)) - 1] ?? 1) : 1;
      const muda = fator === 1 ? undefined : (c: Chamada): ChamadaReceita => (c.k === 'T' ? { ...c, f0: c.f0 * fator, ...(c.f1 === undefined ? {} : { f1: c.f1 * fator }) } : c);
      const ge = gDb(a.ganhoDb?.estampa);
      for (let n = 0; n < repete; n++) tocar.push({ receita: comoReceita(a.estampa, muda, n * PASSO_NIVEL_S), prioridade: 1, ...(ge === 1 ? {} : { vol: ge }) });
      if (ev.tipo === 'hit' && ev.contraEspecial) efeito(a.contraEspecial, 1, {}, 0, ge);
      if (ev.tipo === 'hit' && (ev.dreno ?? 0) > 0) efeito(a.comDreno, 1, {}, 0, ge);
      break;
    }
    case 'ko': {
      const g = perfilDe(dados, ctx, ev.defensor)?.gritos;
      if (!g) break;
      if (voz(ev.defensor, g.ko, 3, 'ko', undefined, 'ko')) {
        tira('ko');
        tocar.push({ receita: GONGO_KO, prioridade: 3 });
      }
      break;
    }
    case 'quebra-guarda': {
      const g = perfilDe(dados, ctx, ev.defensor)?.gritos;
      if (!g) break;
      if (voz(ev.defensor, g.guarda, 2, 'voz', undefined, 'guarda')) {
        tira('fireballHit');
        tocar.push({ receita: VIDRO_GUARDA, prioridade: 1 });
      }
      break;
    }
    case 'armor': {
      const e = perfilDe(dados, ctx, ev.defensor)?.gritos?.esforco;
      if (e) voz(ev.defensor, e, 1, 'dano', undefined, 'esforco');
      break;
    }
    case 'round': {
      if (ev.fase !== 'end' || !ev.fimDaLuta || ev.vencedor === null || ev.vencedor === undefined) break;
      const g = perfilDe(dados, ctx, ev.vencedor)?.gritos;
      if (g) voz(ev.vencedor, g.vitoria, 3, 'voz', ATRASO_VITORIA_MS, 'vitoria');
      break;
    }
    case 'parry': {
      const a = assinaturaDe(dados, ctx.ids[ev.defensor], ctx.fichas[ev.defensor], ev.golpe ?? 'sFire');
      if (!a?.sucesso) break;
      if (a.sucesso.grito) voz(ev.defensor, a.sucesso.grito, 2, 'voz', undefined, 'kiai', a.ganhoDb?.inicio);
      efeito(a.sucesso.chamadas, 2, {}, 0, gDb(a.ganhoDb?.inicio));
      break;
    }
    case 'clash': {
      if (ev.lutador === undefined) break;
      const a = assinaturaDe(dados, ctx.ids[ev.lutador], ctx.fichas[ev.lutador], ev.golpe);
      if (!a?.sucesso) break;
      if (a.sucesso.grito) voz(ev.lutador, a.sucesso.grito, 2, 'voz', undefined, 'kiai', a.ganhoDb?.inicio);
      efeito(a.sucesso.chamadas, 2, {}, 0, gDb(a.ganhoDb?.inicio));
      break;
    }
    case 'block': {
      if (!ev.especial) break;
      const a = assinaturaDe(dados, ctx.ids[ev.atacante], ctx.fichas[ev.atacante], ev.golpe);
      if (a) efeito(a.estampa, 0, { abafado: true }, 0, gDb(a.ganhoDb?.estampa));
      break;
    }
    case 'carga': {
      const a = assinaturaOnde(dados, ctx.ids[ev.lutador], ctx.fichas[ev.lutador], (x) => x.carga !== undefined);
      const batidas = a?.carga?.[ev.nivel - 1];
      if (!batidas) break;
      tira('uiSelect');
      efeito(batidas, 1);
      break;
    }
    case 'rebote': {
      const a = assinaturaOnde(dados, ctx.ids[ev.lutador], ctx.fichas[ev.lutador], (x) => x.rebote !== undefined);
      efeito(a?.rebote, 1);
      break;
    }
    case 'troca-ficha': {
      const t = perfilDe(dados, ctx, ev.lutador)?.troca;
      efeito(t?.[ev.ficha ?? 'base'], 1);
      break;
    }
    default:
      break;
  }
  return { manter, tocar };
}

// --- execução ---

/** O que `reagirComIdentidade` precisa do AudioSys, além de tocar por nome. */
export interface AudioIdentidade extends SintetizadorLike {
  readonly ctx?: unknown;
  readonly sfxVol?: number;
  barramentoIdentidade?(): AudioNode | null;
  abrirGarganta?(i: number, duracao: number, o?: { ko?: boolean; dano?: boolean }): AudioNode | null;
  fontesLivres?(): number;
  registrarFontes?(n: number, fim: number): void;
}

/**
 * Toca um item do plano com garganta, corte por orçamento e prioridade (3 = KO e vitória nunca cedem; 2, 1 e 0 cedem quando não cabem). Devolve true se tocou. Sem áudio (ou `sfx` em 0) não cria nó nenhum.
 */
export function tocarItem(audio: AudioIdentidade, item: ItemDoPlano): boolean {
  if (!audio.ctx || (audio.sfxVol ?? 1) <= 0) return false;
  const duracao = duracaoDaReceita(item.receita);
  let dest: AudioNode | null = audio.barramentoIdentidade?.() ?? null;
  if (item.garganta !== undefined) {
    const g = audio.abrirGarganta?.(item.garganta, duracao, { ko: item.tipo === 'ko', dano: item.tipo === 'dano' });
    if (g === null) return false; // KO em andamento, ou voz de dano dentro de 80 ms: o impacto toca, a voz não
    if (g) dest = g;
  }
  const livres = audio.fontesLivres?.() ?? FONTES_POR_PLANO;
  const receita = cortarParaOrcamento(item.receita, Math.min(FONTES_POR_PLANO, livres));
  const fontes = fontesDaReceita(receita);
  // sem espaço nem cortando camadas: só KO e vitória (3) tocam mesmo assim; o resto (grito, sucesso, dano, impacto) cede, para o teto de 32 valer
  if (fontes > livres && item.prioridade < 3) return false;
  tocarReceita(audio, receita, { dest, ...(item.abafado ? { abafado: true } : {}), ...(item.vol === undefined ? {} : { vol: item.vol }) });
  // a voz se registra sozinha (`vozFormante`); aqui entram só as fontes dos T/R
  const soTR = receita.filter((c) => c.k !== 'V');
  audio.registrarFontes?.(fontesDaReceita(soTR), ((audio.ctx as { currentTime?: number }).currentTime ?? 0) + duracao + 0.1);
  return true;
}

/**
 * Como `reagirAosEventos`, mas com a identidade sonora. `ligada` falsa (o padrão é `IDENTIDADE_SONORA`) = IDÊNTICO a `reagirAosEventos`.
 * O volume `sfx` em 0 não monta plano nenhum.
 */
export function reagirComIdentidade(
  audio: AudioIdentidade,
  eventos: readonly EventoLuta[],
  ctx: ContextoSonoro,
  agendar: (fn: () => void, ms: number) => unknown = (fn, ms) => setTimeout(fn, ms),
  ligada: boolean = IDENTIDADE_SONORA,
  dados: DadosSons = DADOS_SONS,
): void {
  const porNome = audio as unknown as SomPorNome;
  if (!ligada) {
    reagirAosEventos(porNome, eventos, agendar);
    return;
  }
  eventos.forEach((ev, indice) => {
    if ((audio.sfxVol ?? 1) <= 0) {
      reagirAosEventos(porNome, [ev], agendar);
      return;
    }
    const plano = planoSonoro(ev, { ...ctx, indice }, dados);
    for (const c of plano.manter) {
      const f = porNome[c.metodo];
      if (typeof f !== 'function') continue;
      const tocar = (): void => {
        (f as (...a: number[]) => void).apply(audio, c.args as number[]);
      };
      if (c.atrasoMs) agendar(tocar, c.atrasoMs);
      else tocar();
    }
    for (const item of plano.tocar) {
      if (item.atrasoMs) agendar(() => void tocarItem(audio, item), item.atrasoMs);
      else tocarItem(audio, item);
    }
  });
}

// --- orçamento dos dados (validação no carregamento, junto da de data/sons) ---

/**
 * Confere que NENHUM plano de evento passa de 12 fontes DEPOIS do corte por camada (spec §5.3 regra 5). Mora aqui, e não em data/sons/validar.ts,
 * porque contar fontes exige sintetizar o grito e `data/` não importa `audio/`. Devolve a lista de problemas.
 */
export function validarOrcamentoDosSons(dados: DadosSons): string[] {
  const erros: string[] = [];
  const conta = (r: readonly ChamadaReceita[]): number => fontesDaReceita(cortarParaOrcamento(r, FONTES_POR_PLANO));
  const confere = (onde: string, r: readonly ChamadaReceita[]): void => {
    const n = conta(r);
    if (n > FONTES_POR_PLANO) erros.push(`${onde}: ${n} fontes depois do corte (máx. ${FONTES_POR_PLANO})`);
  };
  let danoMax = 0;
  for (const [id, perfil] of Object.entries(dados.perfis)) {
    const g = perfil.gritos;
    if (!g) continue;
    for (const [nome, grito] of [['kiai', g.kiai], ['vitoria', g.vitoria], ['guarda', g.guarda], ...(g.esforco ? [['esforco', g.esforco] as const] : [])] as const) confere(`${id}.${nome}`, sintetizarGrito(perfil, grito));
    confere(`${id}.ko`, [...sintetizarGrito(perfil, g.ko), ...GONGO_KO]);
    for (const grito of [...g.leve, ...g.pesado]) danoMax = Math.max(danoMax, conta(sintetizarGrito(perfil, grito)));
  }
  const perfilDoDono = (chave: string): PerfilVocal | undefined => dados.perfis[chave.split('.')[0] ?? ''];
  for (const [chave, a] of Object.entries(dados.assinaturas)) {
    const perfil = perfilDoDono(chave);
    const voz = (g: Grito | null | undefined): ChamadaReceita[] => (g && perfil ? sintetizarGrito(perfil, g) : []);
    confere(`${chave} (início)`, [...voz(a.grito), ...comoReceita(a.conjuracao)]);
    if (a.lancamento) confere(`${chave} (lançamento)`, comoReceita(a.lancamento));
    confere(`${chave} (acerto)`, [...comoReceita(a.estampa), ...comoReceita(a.comDreno ?? []), ...comoReceita(a.contraEspecial ?? [])]);
    if (a.sucesso) confere(`${chave} (sucesso)`, [...voz(a.sucesso.grito), ...comoReceita(a.sucesso.chamadas)]);
    if (a.resposta) confere(`${chave} (resposta)`, [...voz(a.resposta.grito), ...comoReceita(a.resposta.estampa)]);
    // o acerto também toca a voz de dano do defensor: pior caso
    const acerto = conta([...comoReceita(a.estampa), ...comoReceita(a.comDreno ?? [])]);
    if (acerto + danoMax > FONTES_POR_PLANO + 4) erros.push(`${chave}: estampa (${acerto}) + voz de dano (${danoMax}) passa do teto de um tick`);
  }
  return erros;
}

const _erros = validarOrcamentoDosSons(DADOS_SONS);
if (_erros.length) throw new Error(`dados de sons inválidos (orçamento):${_erros.map((e) => `
 - ${e}`).join('')}`);
