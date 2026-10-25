import { identidadeAtiva, reagirDoJogo, trilhaDoJogo } from '../../audio/camadas';
import { tocarReceita, type SintetizadorLike } from '../../audio/receitas';
import { ALTURA, GROUND, LARGURA, SH } from '../../core/constantes';
import { clamp } from '../../core/math';
import { CINEMATICA_PADRAO, type EventoLuta, type IndiceLutador } from '../../core/contratos';
import { CENARIO_PADRAO } from '../../data/cenarios';
import { ESQUIVA_PADRAO } from '../../data/esquiva';
import { filmeDoGolpe } from '../../data/filmes';
import { criarMemoriaDeFalas, provocacoesLigadas } from '../../data/provocacoes';
import { roteiroDoFilme } from '../../data/roteiros-filme';
import type { DummyTreino, FonteEntradas } from '../../fight/game';
import { chefeDaLeitura } from '../../render/aura-chefe';
import { APRESENTACAO, falaDoChefe, roteiroDe } from '../../render/apresentacao-lutadores';
import { Cinematica, modoDaCinematica, type ModoCine } from '../../render/cinematica';
import { FaixaRitmo } from '../../render/faixa-ritmo';
import { HudRitmo } from '../../render/hud-ritmo';
import { TarjaDoSuper } from '../../render/tarja-super';
import { EntradaDoChefe, SOM_DAS_FAIXAS, SOM_DO_CARTAO, somDoBraseiro, type ModoEntrada } from '../../render/entrada-chefe';
import { alturaDoLutador, FilmeDoEspecial, TICKS_PARA_PULAR_RITMO, type EventoFilme, type HudDoRival, type ModoFilme } from '../../render/filme';
import { Fluidez } from '../../render/fluidez';
import { desenharLegenda } from '../../render/legenda';
import { MoedasDeDreno } from '../../render/moedas-dreno';
import {
  blip,
  falaDaRodada,
  falaDaVitoria,
  falasDaAbertura,
  modoDaProvocacao,
  montarRoteiro,
  paraATela,
  varianteDaFala,
  Provocacao,
  provocacaoLigada,
  SOM_DA_VITORIA,
  SOM_DO_BALAO,
  type DadosDeFala,
  type FalaDoRoteiro,
  type TipoProvocacao,
} from '../../render/provocacao';
import { identidadeDe, somDoAcerto } from '../../render/identidade-especiais';
import { chDaFicha } from '../../render/lutador';
import { SessaoEspecial } from '../../render/sessao-especial';
import { desenharMundo } from '../../render/mundo';
import { NOMES_ALVO_TREINO } from '../../render/hud';
import { cfgDaEtapa } from '../campanha';
import { EsperaDeArte } from '../espera-de-arte';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import { alturaDosCombos, ALTURA_DA_CAIXA_DE_COMBO, combosDoLutador, desenharCombos, desenharLinhaDoSuper, DICA_DOS_COMBOS } from '../combos-tela';
import { desenharLinhasDeGolpes, P_COL } from '../personagens';
import { NAV, type ArgsFight, type Cena } from '../tipos';
import { superDoLutador } from '../../data/supers';
import { criarContadorRitmo, motivoDoTick, registrarTickDeRitmo, type ContadorRitmo, type MotivoRitmo } from './ritmo-contador';

type Vista = 'main' | 'moves' | 'audio' | 'confirm';
const ALVOS = Object.keys(NOMES_ALVO_TREINO) as DummyTreino[];

/** A luta e o menu de pausa (continuar, lista de golpes, áudio, treino, sair). */
export class CenaFight implements Cena {
  paused = false;
  private view: Vista = 'main';
  private ended = false;
  private a: ArgsFight | null = null;
  private ultimoTick = 0;
  /** Último estado aplicado ao botão ESQ do toque (barra abaixo do custo da esquiva); null = ainda não aplicado. */
  private botaoEsqSem: boolean | null = null;
  /** Idem para o ESPECIAL (#r1): sem barra para o custo do especial (a mesma regra do "pronto" do HUD). */
  private botaoEspSem: boolean | null = null;
  /** Fim do estalo `.acendeu` do ESPECIAL (220 ms), para limpar ao sair da luta ou reacender. */
  private fimDoAcendeu: ReturnType<typeof setTimeout> | null = null;
  /** R-9 (`ritmo.super`): idem para o botão SUPER (#sup) — "pronto" só com a barra CHEIA (D-R1, `en === 100`). */
  private botaoSupSem: boolean | null = null;
  private fimDoAcendeuSup: ReturnType<typeof setTimeout> | null = null;
  /** CINEMÁTICA do especial (apresentação pura: enquanto roda a cena não chama `game.update`, como a pausa) e a sessão dos acertos dele. */
  readonly cine: Cinematica;
  /** FAIXA DO RITMO (R-2, `Regras.ritmo.tarja`): o mesmo aviso do especial, SEM pausar a cena — usada no lugar de `cine` quando a flag está ligada (§3.2). */
  readonly faixaRitmo = new FaixaRitmo();
  /** HUD do ritmo (`Regras.ritmo.tarja`): DANGER com a vida baixa, nota do combo e contador polido. O estado anda no tick (abaixo); o desenho é do `desenharHUD`. */
  readonly hudRitmo = new HudRitmo();
  /** TARJA DO SUPER (R-9, `Regras.ritmo.super`): congela 30 ticks — usada no lugar de `cine`/`faixaRitmo` quando `ev.super === true` (§3.2/§3.4). */
  readonly tarjaDoSuper: TarjaDoSuper;
  readonly sessao: SessaoEspecial;
  /** ENTRADA DRAMÁTICA do chefão (apresentação pura, antes do 1º `game.update`: o motor e o lock-step não a veem). */
  readonly entrada: EntradaDoChefe;
  /**
   * PROVOCAÇÃO (balão antes do round e na vitória; docs/spec-provocacao-prerround-e-vitoria.md): o 3º controlador fora do motor. Enquanto roda, a cena
   * NÃO chama `game.update`. A única escrita no jogo é `matchDone = true` no fim da vitória (o mesmo efeito do ENTER).
   */
  readonly provocacao: Provocacao;
  /** A provocação do round 1 ainda não começou nesta luta (espera a arte ficar pronta)? */
  private aberturaPendente = false;
  /** A provocação da vitória já foi (ou não vai ser) disparada nesta luta? */
  private vitoriaDisparada = false;
  /** O gancho do fim da luta (solta a FILME, pré-carrega o fundo dos menus) já disparou nesta luta? */
  private fimDaLutaAvisado = false;
  /** Quem venceu o round que acabou de terminar (null = empate) e se o round foi decidido por tempo: vêm dos eventos, o `Game` zera `winner` no round novo. */
  private vencedorDoRound: 0 | 1 | null = null;
  private roundPorTempo = false;
  /** O confronto (c1|c2|cenário) da luta anterior desta cena: igual = continue, reinício ou revanche (a provocação do round 1 vira CURTA). */
  private ultimoConfronto: string | null = null;
  private confrontoRepetido = false;
  /** Última fala de cada lutador nesta sessão (para não repetir). */
  private readonly memoriaDeFalas = criarMemoriaDeFalas();
  /**
   * GANCHO DE TESTE (`tests/e2e/_luta.ts` → `SEM_PROVOCACAO`): desliga a provocação pelo resto desta luta (round 1, round 2+ e vitória). Não é preferência do
   * jogador (essa é `Configuracoes.provocacoes`); volta a falso em cada `enter()`.
   */
  semProvocacao = false;
  /** O DRENO do ZENON (TRIBUTO/DECRETO) visível: moedas do golpe até a barra SUPER de quem drenou. */
  readonly moedas = new MoedasDeDreno();
  /** Interpolação entre ticks, mola e tremor do rival (V2-2): só no desenho; ligada por `Navegador.fluidez`. */
  readonly fluidez = new Fluidez();
  /** FILME do especial (V2-3d): apresentação pura, como a cinemática; o motor já resolveu tudo no tick do contato. */
  readonly filme: FilmeDoEspecial;
  /** O rival (por índice) no tick ANTERIOR ao último `game.update`: a barra do filme parte daqui. */
  private antesDoTick: [HudDoRival, HudDoRival] | null = null;
  /** Filmes já vistos nesta luta (lutador|ficha|golpe): da 2ª vez em diante toca a versão CURTA (D-V4). */
  private readonly filmesVistos = new Set<string>();
  /** O acerto/agarrão que abriu o filme (as moedas do dreno do ZENON saem dele, na batida do roteiro). */
  private acertoDoFilme: EventoLuta | null = null;
  /** Eventos do tick do contato que esperam o filme: o pó da queda (na batida da queda) e o resto (KO, troca de barra, fim de round) para o fim. */
  private adiadosNaQueda: EventoLuta[] = [];
  private adiadosNoFim: EventoLuta[] = [];
  /** GANCHO DE DESENVOLVIMENTO (`?filme=<lutador>:<golpe>[:motivo[:luta]]`): injeta um evento `filme` falso no 1º tick da fase `fight`. Só no servidor de desenvolvimento. */
  private filmeDev: ReturnType<typeof lerFilmeDev> = null;
  /** GANCHO DE DESENVOLVIMENTO (`?super=<lutador>`): simula o `special` do super (`ev.super`) no 1º tick da fase `fight` — abre a tarja de 30 ticks. Só DEV. */
  private superDev: { lutador: string } | null = null;
  /** A entrada ainda não começou nesta luta (espera a arte ficar pronta)? */
  private entradaPendente = false;
  /** A música está a 50% por causa da cinemática? */
  private musicaBaixa = false;
  /** Ainda há tarja por aquecer no cache (a abertura da luta pinta uma por tick)? */
  private aquecendo = true;
  /** A arte da luta está na memória? (a luta só anda depois) */
  readonly espera = new EsperaDeArte();
  /** R-1 (DEV): ticks por motivo desta luta (espelhado em `window.__ritmo`); `null` em produção (nunca aloca nem soma). */
  private readonly ritmo: ContadorRitmo | null = import.meta.env.DEV ? criarContadorRitmo() : null;
  private m: MenuList;
  private am: MenuList;
  private cm: MenuList;

  constructor(private readonly ui: Navegador) {
    this.m = new MenuList([], ui.c.audio, ui.c.f);
    this.am = this.m;
    this.cm = this.m;
    const sintetizador = (): SintetizadorLike => ui.c.audio as unknown as SintetizadorLike;
    // os sons da cinemática são chamados por ela, NÃO por audio/eventos.ts: o som do evento `special` não muda (o lock-step compara sons)
    this.cine = new Cinematica({
      rng: ui.c.rngVisual,
      // identidade sonora ligada: a abertura da tarja cala (o grito e a conjuração do evento já tocaram no mesmo tick); a batida (o "pop" do nome) continua
      aoSom: (momento, id) => {
        if (momento === 'abertura' && identidadeAtiva()) return;
        tocarReceita(sintetizador(), momento === 'abertura' ? id.abertura : id.batida);
      },
    });
    this.tarjaDoSuper = new TarjaDoSuper({ rng: ui.c.rngVisual });
    this.entrada = new EntradaDoChefe({
      aoSom: (som) =>
        tocarReceita(sintetizador(), som === 'faixas' ? SOM_DAS_FAIXAS : som === 'cartao' ? SOM_DO_CARTAO : som === 'assinatura' ? this.entrada.assinatura : somDoBraseiro(som.braseiro)),
    });
    this.provocacao = new Provocacao({
      aoSom: (som) => {
        if (typeof som === 'object') tocarReceita(sintetizador(), blip(som.blip));
        else tocarReceita(sintetizador(), som === 'faixas' ? SOM_DAS_FAIXAS : som === 'balao' ? SOM_DO_BALAO : SOM_DA_VITORIA);
      },
    });
    this.filme = new FilmeDoEspecial({
      rng: ui.c.rngVisual,
      aoSom: (som, atacante, nivel) => {
        const f = ui.m.game.fighters[atacante];
        const base = somDoAcerto(f.id, f.ficha ?? null);
        if (som === 'leve') tocarReceita(sintetizador(), base.slice(0, 1), { vol: 0.7 });
        else tocarReceita(sintetizador(), base);
        if (som === 'final' || nivel >= 3) tocarReceita(sintetizador(), [{ k: 'T', tipo: 'sine', f0: 70, t: 0.4, vol: 0.7 }]);
      },
      aoImpacto: ({ x, y, cor, grande, contragolpe }) => {
        const { efeitos } = ui.m;
        efeitos.faiscas(x, y, cor, grande ? 24 : 14);
        efeitos.estrela(x, y, cor, grande);
        if (contragolpe) efeitos.textoFlutuante(x, y - 40, 'COUNTER!', '#ff9a3a', 24);
      },
      aoMoedas: () => {
        const ev = this.acertoDoFilme;
        if (ev) this.moedas.reagir(ev, ui.m.game);
      },
      aoQueda: () => {
        const lista = this.adiadosNaQueda;
        this.adiadosNaQueda = [];
        this.reagirAosEventos(lista);
      },
      // R-9 (`ritmo.super`, §3.3): pular a partir do tick 6 em vez do 10 de hoje. `Regras.ritmo` não muda durante a luta.
      ...(ui.c.regras.ritmo?.super === true ? { ticksParaPular: TICKS_PARA_PULAR_RITMO } : {}),
    });
    this.sessao = new SessaoEspecial({
      rng: ui.c.rngVisual,
      aoSom: (momento, id, dono, nivel) => {
        // identidade sonora ligada: a estampa e a defesa da assinatura (e o MASHI por nível) já tocam no evento, com ou sem cinemática
        if (identidadeAtiva()) return;
        if (momento === 'defesa') {
          tocarReceita(sintetizador(), id.batida, { abafado: true });
          return;
        }
        const f = ui.m.game.fighters[dono];
        const base = somDoAcerto(f.id, f.ficha ?? null);
        // MASHI: 1, 2 ou 3 batidas de kalangu (a cada 70 ms) conforme o nível; o 3º ainda leva o baque grave
        for (let i = 0; i < Math.max(1, nivel); i++) {
          tocarReceita(sintetizador(), base.map((c) => ({ ...c, quando: (c.quando ?? 0) + i * 0.07, ...(c.k === 'T' && nivel > 0 ? { f0: c.f0 + i * 60 } : {}) })));
        }
        if (nivel >= 3) tocarReceita(sintetizador(), [{ k: 'T', tipo: 'sine', f0: 55, t: 0.5, vol: 0.8 }]);
      },
    });
  }

  /** O aparelho pede menos movimento? A consulta do contexto (a mesma da casa aleatória da seleção); sem ela (testes), o `matchMedia`. */
  private reduzMovimento(): boolean {
    if (this.ui.c.reduzirMovimento) return this.ui.c.reduzirMovimento();
    return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  }

  /** O modo da cinemática agora (preferência + regras + movimento reduzido), ou null se não há cinemática. */
  private modoDaCine(): ModoCine | null {
    return modoDaCinematica(this.ui.c.persist.settings.cinematica, this.ui.c.regras, this.reduzMovimento());
  }

  /**
   * A entrada dramática desta luta, ou null (sem entrada): só o chefão cujo lutador tem `roteiro` em `APRESENTACAO` (o ZENON e os 5 guardiões). COMPLETA na primeira luta contra
   * o chefão de cada ARCADE; CURTA depois de um continue (ou reinício) na mesma campanha, com `prefers-reduced-motion` ou com a cinemática CURTA/DESLIGADA.
   * Regras sem cinemática (`?expansao=4`) = sem entrada. O nome do chefão aparece sempre: a entrada não some, só encolhe.
   */
  private modoDaEntrada(a: ArgsFight): ModoEntrada | null {
    if (!a.cfg.chefe || !roteiroDe(a.cfg.c2) || !this.ui.c.regras.cinematica) return null;
    const pref = this.ui.c.persist.settings.cinematica ?? (this.reduzMovimento() ? 'curta' : CINEMATICA_PADRAO);
    return pref === 'completa' && !a.run?.entradaDoChefeVista ? 'completa' : 'curta';
  }

  /** Começa a entrada (a luta já foi montada com `setup`; o motor continua parado até ela acabar). */
  private comecarEntrada(): void {
    this.entradaPendente = false;
    const a = this.a;
    const modo = a ? this.modoDaEntrada(a) : null;
    const roteiro = a ? roteiroDe(a.cfg.c2) : undefined;
    if (!a || !modo || !roteiro) return;
    if (a.run) a.run.entradaDoChefeVista = true;
    const cor = roteiro.naCorDoLutador ? this.ui.m.elenco[a.cfg.c2].ch.accent : undefined;
    this.entrada.iniciar(modo, roteiro.cartao, APRESENTACAO[a.cfg.c2]?.falas?.entrada ?? '', roteiro, cor);
  }

  /** Esta luta pode ter provocação neste momento? (regras, opção PROVOCAÇÕES, tipo de luta e o gancho de teste.) */
  private queroProvocar(momento: 'prerround' | 'vitoria'): boolean {
    const cfg = this.a?.cfg;
    if (!cfg || this.semProvocacao) return false;
    return provocacaoLigada(
      { regras: this.ui.c.regras, ligadas: provocacoesLigadas(this.ui.c.persist.settings.provocacoes), modo: cfg.mode, p1cpu: cfg.p1cpu, cpu: cfg.cpu, chefe: cfg.chefe },
      momento,
    );
  }

  /** Abre a provocação do tipo `tipo` (a luta já está no ponto certo: antes do 1º update, no `intro` t 0 do round 2+ ou no `matchend`). Não anda o relógio dela. */
  private comecarProvocacao(tipo: TipoProvocacao): void {
    if (tipo === 'abertura') this.aberturaPendente = false;
    else if (tipo === 'vitoria') this.vitoriaDisparada = true;
    if (!this.a || !this.queroProvocar(tipo === 'vitoria' ? 'vitoria' : 'prerround')) return;
    const reduz = this.reduzMovimento();
    // D-R8/R-2 (`Regras.ritmo.provocacao`): a COMPLETA do round 1 só no 1º confronto do ARCADE (`run.idx === 0`) ou no chefão; sem a
    // flag, `true` preserva a regra de hoje (COMPLETA sempre que não repetido). `provocacaoLigada` já exclui o chefão do pré-round
    // (a entrada dramática ocupa o lugar), então o `cfg.chefe` aqui é defensivo, não alcançado hoje.
    const primeiroOuChefe = this.ui.c.regras.ritmo?.provocacao !== true || this.a.cfg.chefe === true || this.a.run?.idx === 0;
    const modo = modoDaProvocacao(tipo, this.ui.c.persist.settings.cinematica, reduz, this.confrontoRepetido, primeiroOuChefe);
    const { game, elenco } = this.ui.m;
    const ids = [game.p1.id, game.p2.id] as const;
    const dados: DadosDeFala = { ids, nomes: [elenco[ids[0]].ch.name, elenco[ids[1]].ch.name] };
    const sorteio = { rng: this.ui.c.sorteioDeFalas, memoria: this.memoriaDeFalas };
    let falas: FalaDoRoteiro[];
    if (tipo === 'abertura') falas = falasDaAbertura(dados, sorteio);
    else if (tipo === 'rodada') {
      falas = falaDaRodada(dados, { round: game.round, vencedorAnterior: this.vencedorDoRound, vitorias: [game.p1.wins, game.p2.wins], vitoriasParaVencer: game.winsNeeded }, sorteio);
    } else {
      if (game.matchWinner === null) return;
      falas = falaDaVitoria(dados, game.matchWinner, { perfeita: game.perfect, porTempo: this.roundPorTempo }, sorteio);
    }
    // a variante da "Tarja de Impacto" (precedência: ZENON > guardião > decisivo > revanche > vitória perfeita > vitória > abertura): quem fala com id zenon vira ZENON e o chefe
    // da luta de chefão (o guardião do ARCADE, c2) vira guardião; o resto já veio das falas
    const chefeDaLuta = this.a?.cfg.chefe ? this.a.cfg.c2 : null;
    falas = falas.map((f) => ({ ...f, variante: varianteDaFala(f.variante, ids[f.falante], chefeDaLuta !== null && ids[f.falante] === chefeDaLuta) }));
    this.provocacao.iniciar(montarRoteiro(tipo, modo, reduz, falas), {
      pitch: [elenco[ids[0]].ch.pitch, elenco[ids[1]].ch.pitch],
      nomes: dados.nomes,
      cores: [this.corDoLutador(0), this.corDoLutador(1)],
    });
    this.baixarMusica(true);
  }

  /** Um tick da provocação: a luta NÃO anda. Pular = ataque de um humano (a borda), ENTER ou toque. O fim da VITÓRIA fecha a luta (`matchDone`, como o ENTER). */
  private passoDaProvocacao(): void {
    const { game } = this.ui.m;
    if (this.alguemPulou()) this.provocacao.pular();
    this.provocacao.avancar();
    // as tarjas dos especiais se pintam durante a provocação, como na entrada (sobra tempo e o 1º especial não paga o custo de primeira vez)
    if (this.aquecendo && this.modoDaCine() !== null) this.aquecendo = this.cine.aquecer(game, this.ui.m.elenco);
    if (this.provocacao.ativa) return;
    const tipo = this.provocacao.roteiro?.tipo;
    this.baixarMusica(false);
    if (tipo === 'vitoria') {
      game.matchDone = true;
      if (!this.ended) {
        this.ended = true;
        this.finish();
      }
    }
  }

  /** A música cai para 50% enquanto a cinemática roda (e a pausa a devolve). */
  private baixarMusica(baixar: boolean): void {
    const { audio, persist } = this.ui.c;
    if (baixar === this.musicaBaixa) return;
    this.musicaBaixa = baixar;
    audio.setMusicVol?.(persist.settings.music * (baixar ? 0.5 : 1));
  }

  /** D3c: UM objeto por cena (antes um novo a cada tick); as funções leem `ui.c.entrada` na hora da chamada, como o getter lia. */
  private readonly fonte: FonteEntradas = {
    p1: (mesclado) => (mesclado ? this.ui.c.entrada.lerMesclado() : this.ui.c.entrada.lerP1()),
    p2: () => this.ui.c.entrada.lerP2(),
  };

  enter(a: ArgsFight): void {
    const { game, efeitos } = this.ui.m;
    const { persist, audio } = this.ui.c;
    this.a = a;
    this.paused = false;
    this.view = 'main';
    this.ended = false;
    this.espera.iniciar(this.ui.m, a.cfg);
    this.prebuscarProximoRival(a);
    this.filmeDev = import.meta.env.DEV && typeof window !== 'undefined' ? lerFilmeDev(window.location.search) : null;
    this.superDev = import.meta.env.DEV && typeof window !== 'undefined' ? lerSuperDev(window.location.search) : null;
    this.carregarFolhasDoFilme(a);
    game.setup(a.cfg, persist.settings);
    if (a.cfg.keepScore && a.run) game.p1.score = a.run.score;
    efeitos.limpar();
    this.fluidez.zerar();
    this.ultimoTick = game.tick;
    this.cine.zerarLuta();
    this.faixaRitmo.zerarLuta();
    this.hudRitmo.zerar();
    this.tarjaDoSuper.zerarLuta();
    this.sessao.zerarLuta();
    if (this.ritmo) {
      for (const motivo of Object.keys(this.ritmo.porMotivo) as (keyof typeof this.ritmo.porMotivo)[]) this.ritmo.porMotivo[motivo] = 0;
      this.ritmo.total = 0;
      if (typeof window !== 'undefined') window.__ritmo = this.ritmo;
    }
    this.aquecendo = true;
    this.musicaBaixa = true; // força a volta ao volume salvo (a cena anterior pode ter saído no meio de uma cinemática)
    this.baixarMusica(false);
    this.botaoEsqSem = null;
    this.botaoEspSem = null;
    this.botaoSupSem = null;
    this.atualizarBotaoEsquiva();
    this.entrada.zerar();
    this.provocacao.zerar();
    this.filme.zerar();
    this.filmesVistos.clear();
    this.acertoDoFilme = null;
    this.adiadosNaQueda = [];
    this.adiadosNoFim = [];
    this.antesDoTick = null;
    this.semProvocacao = false;
    this.vitoriaDisparada = false;
    this.fimDaLutaAvisado = false;
    this.vencedorDoRound = null;
    this.roundPorTempo = false;
    const confronto = `${a.cfg.c1}|${a.cfg.c2}|${a.cfg.stage ?? ''}`;
    this.confrontoRepetido = confronto === this.ultimoConfronto;
    this.ultimoConfronto = confronto;
    this.aberturaPendente = this.queroProvocar('prerround');
    this.moedas.zerar();
    this.entradaPendente = this.modoDaEntrada(a) !== null;
    // a trilha do chefão (valsa 3/4) é uma flag do def: tirar `trilha` de `ConfigChefe` é o rollback para a música de luta
    // sem temas: 'chefe' (a valsa) no chefão que tem `trilha`, 'fight' no resto. Com `?temas=1`: o tema do ADVERSÁRIO (c2) em todos os modos, a fase 2 do chefão via musicaDaFase(2)
    audio.startMusic(trilhaDoJogo(a.cfg, this.ui.c.regras, this.ui.m.elenco[a.cfg.c2].ch.chefe?.trilha));
    this.montarMenus();
  }

  /**
   * A folha FILME (os closes do painel do especial) dos dois lutadores, baixada DEPOIS que a luta começou e sem esperar: nunca na seleção,
   * na VS nem em `pedir`/`prebuscar` (docs/orcamentos-2026-10-23.md). Enquanto não chega (ou se der 404), `imagemDe` devolve null para f0..f5 e o
   * filme toca a pose `Alt` do mundo, sem lançar. O `?.` é dos dublês de teste do gerenciador, que não têm a folha.
   * SÓ com o filme ligado (`cfg.motorV2.filmes`, a mesma flag que faz o motor emitir o evento) ou com o gancho DEV `?filme=`: sem flag (o padrão)
   * não há rede nem memória para uma folha que nenhum especial vai usar.
   */
  private carregarFolhasDoFilme(a: ArgsFight): void {
    if (a.cfg.motorV2?.filmes !== true && this.filmeDev === null) return;
    void this.ui.m.arte.carregarFilme?.([a.cfg.c1, a.cfg.c2]);
  }

  /**
   * Fim da luta (residência por peso, uma vez por luta): no 1º tick com `matchend`, vencedor definido e o filme parado (um KO por especial termina de tocar antes), as
   * folhas FILME saem e o fundo dos menus (`jp`) começa a voltar em segundo plano, para o resultado já nascer com fundo e o pico não subir (-FILME +7,9). Em `'fixa'` não faz nada.
   * O `?.` é dos dublês de teste do gerenciador.
   */
  private aoFimDaLuta(): void {
    if (this.fimDaLutaAvisado) return;
    const { game, arte } = this.ui.m;
    if (game.phase !== 'matchend' || game.matchWinner === null || this.filme.ativo) return;
    this.fimDaLutaAvisado = true;
    if (arte.politica !== 'por-peso') return;
    arte.soltarFilme?.();
    arte.preferir?.({ cenarios: [CENARIO_PADRAO] });
  }

  /** Saiu da luta (para a VS, o resultado, o menu...): a folha FILME sai da memória. Obrigatório: o HAYATO é fixo da vitrine, `liberarLutador` não o solta. */
  exit(): void {
    this.ui.m.arte.soltarFilme?.();
  }

  /** ARCADE: baixa (sem decodificar) a arte do próximo rival enquanto esta luta acontece. */
  private prebuscarProximoRival(a: ArgsFight): void {
    const prox = a.run?.etapas[a.run.idx + 1]?.id;
    if (prox) this.ui.m.arte.prebuscar({ lutadores: [prox], cenarios: [this.ui.m.elenco[prox].ch.stage] });
  }

  /** Zera projéteis, tremor e congelamento (clearFx do protótipo, sem as partículas que moram no render). */
  private limparEfeitos(): void {
    const { game, efeitos } = this.ui.m;
    game.projectiles = [];
    game.shake = 0;
    game.hitstop = 0;
    efeitos.limpar();
  }

  private montarMenus(): void {
    const { game } = this.ui.m;
    const { audio, f } = this.ui.c;
    const tr = game.training;
    const itens = [
      { label: 'CONTINUAR', onOk: () => this.resume() },
      { label: 'LISTA DE GOLPES', onOk: () => { this.view = 'moves'; } },
      { label: 'ÁUDIO', onOk: () => { this.view = 'audio'; this.am.sel = 0; } },
    ] as ConstructorParameters<typeof MenuList>[0];
    if (tr) {
      itens.push({
        label: 'ALVO DO TREINO',
        value: () => NOMES_ALVO_TREINO[game.dummy],
        onAdjust: (d) => {
          const i = (ALVOS.indexOf(game.dummy) + d + ALVOS.length) % ALVOS.length;
          game.trocarAlvoDoTreino(ALVOS[i] ?? 'stand');
        },
      });
      itens.push({
        label: 'REPOSICIONAR',
        onOk: () => {
          game.p1.reset(false);
          game.p2.reset(false);
          game.p1.hp = game.p1.maxHp;
          game.p2.hp = game.p2.maxHp;
          this.limparEfeitos();
          this.resume();
        },
      });
    }
    itens.push({
      label: tr ? 'TROCAR PERSONAGENS' : 'REINICIAR LUTA',
      onOk: () => {
        this.paused = false;
        if (tr) this.ui.go('select', { mode: 'training' });
        else this.ui.go(this.a?.run ? 'vs' : 'fight', this.a);
      },
    });
    itens.push({ label: 'MENU PRINCIPAL', onOk: () => { this.view = 'confirm'; this.cm.sel = 1; } });
    this.m = new MenuList(itens, audio, f);
    this.am = new MenuList(
      [
        { label: 'MÚSICA', slider: () => this.ui.c.persist.settings.music, onAdjust: (d) => this.vol('music', d), onSet: (v) => this.setVol('music', v) },
        { label: 'EFEITOS', slider: () => this.ui.c.persist.settings.sfx, onAdjust: (d) => this.vol('sfx', d), onSet: (v) => this.setVol('sfx', v) },
        { label: 'VOLTAR', onOk: () => { this.view = 'main'; } },
      ],
      audio,
      f,
    );
    this.cm = new MenuList(
      [
        { label: 'SIM, SAIR', onOk: () => { this.paused = false; audio.startMusic('menu'); this.ui.go('menu'); } },
        { label: 'NÃO, CONTINUAR', onOk: () => { this.view = 'main'; } },
      ],
      audio,
      f,
    );
  }

  private vol(k: 'music' | 'sfx', d: number): void {
    this.setVol(k, clamp(Math.round((this.ui.c.persist.settings[k] + d * 0.1) * 10) / 10, 0, 1));
  }

  private setVol(k: 'music' | 'sfx', v: number): void {
    const { persist, audio } = this.ui.c;
    persist.settings[k] = v;
    if (k === 'music') audio.setMusicVol(v);
    else audio.setSfxVol(v);
    persist.salvar();
  }

  pause(): void {
    if (this.paused || this.ui.m.game.matchDone) return;
    this.paused = true;
    this.view = 'main';
    this.m.sel = 0;
    this.baixarMusica(false);
    this.ui.c.audio.uiPause();
  }

  private resume(): void {
    this.paused = false;
    if (this.cine.ativa || this.provocacao.ativa) this.baixarMusica(true);
    this.ui.c.audio.uiPause();
  }

  /** Qualquer botão de ataque (ou o especial) de um humano pula a cinemática. As teclas seguradas continuam valendo depois. */
  private alguemPulou(): boolean {
    const { entrada } = this.ui.c;
    const { game } = this.ui.m;
    const ataque = (i: { lp: boolean; hp: boolean; lk: boolean; hk: boolean; sp: boolean } | undefined): boolean => !!i && (i.lp || i.hp || i.lk || i.hk || i.sp);
    // treino e solo (um humano contra a CPU) leem os dois mapas de teclado juntos, como a própria luta
    if (game.training || (game.p1.cpu === null && game.p2.cpu !== null)) return ataque(entrada.lerMesclado?.());
    return (game.p1.cpu === null && ataque(entrada.lerP1?.())) || (game.p2.cpu === null && ataque(entrada.lerP2?.()));
  }

  /** Um tick da cinemática: a luta NÃO anda (o motor não congela; a cena só não o chama). */
  private passoDaCinematica(): void {
    if (this.alguemPulou()) this.cine.pular();
    this.cine.avancar();
    if (!this.cine.ativa) this.baixarMusica(false);
  }

  /** R-1: registra o motivo deste tick no contador (só DEV; em produção `this.ritmo` é `null` e não custa nada). */
  private registrarRitmo(motivo: MotivoRitmo): void {
    if (this.ritmo) registrarTickDeRitmo(this.ritmo, motivo);
  }

  /** Os eventos do tick: a sessão dos acertos e a abertura da cinemática (no início do golpe, ou no SUCESSO da PARADE/GARKUWA). */
  private reagirAoEspecial(ev: EventoLuta): void {
    if (this.reagirAoSuper(ev)) return;
    const modo = this.modoDaCine();
    if (modo === null) return;
    const { game, elenco } = this.ui.m;
    this.sessao.reagir(ev, game, elenco);
    let abrir: Parameters<Cinematica['iniciar']>[0] | null = null;
    if (ev.tipo === 'special' && ev.momento !== 'sucesso' && ev.golpe !== undefined) {
      abrir = { lutador: ev.lutador, golpe: ev.golpe, ficha: ev.ficha ?? null, ...(ev.quadro ? { quadro: ev.quadro } : {}), ...(ev.entrada ? { entrada: ev.entrada } : {}) };
    } else if (ev.tipo === 'parry' && ev.golpe !== undefined) {
      abrir = { lutador: ev.defensor, golpe: ev.golpe, ficha: game.fighters[ev.defensor].ficha ?? null, ...(ev.quadro ? { quadro: ev.quadro } : {}), ...(ev.entrada ? { entrada: ev.entrada } : {}) };
    } else if (ev.tipo === 'clash' && ev.lutador !== undefined && ev.golpe !== undefined) {
      abrir = { lutador: ev.lutador, golpe: ev.golpe, ficha: game.fighters[ev.lutador].ficha ?? null, ...(ev.quadro ? { quadro: ev.quadro } : {}), ...(ev.entrada ? { entrada: ev.entrada } : {}) };
    }
    if (!abrir) return;
    // R-2 (`Regras.ritmo.tarja`): o especial comum deixa de congelar — a MESMA faixa, sem pausar a cena (o super, acima, nunca cai aqui:
    // `reagirAoSuper` já tratou e voltou antes de chegar neste ponto).
    if (this.ui.c.regras.ritmo?.tarja === true) {
      this.faixaRitmo.iniciar({ lutador: abrir.lutador, golpe: abrir.golpe, ficha: abrir.ficha ?? null });
      return;
    }
    this.cine.iniciar(abrir, modo);
    this.baixarMusica(true);
  }

  /**
   * R-9 (`Regras.ritmo.super`, §3.2/§3.4): o `special` do super (os dois botões juntos, barra cheia) abre a `TarjaDoSuper` —
   * congela 30 ticks fixos, SEMPRE, mesmo com a cinemática do jogador desligada (K3: a tensão do super é aceita, não é
   * cosmética). Devolve se tratou o evento (a cinemática/faixa comuns ficam de fora dele).
   */
  private reagirAoSuper(ev: EventoLuta): boolean {
    if (this.ui.c.regras.ritmo?.super !== true) return false;
    if (ev.tipo !== 'special' || ev.golpe === undefined) return false;
    if (ev.super !== true) return false;
    const { game } = this.ui.m;
    const f = game.fighters[ev.lutador];
    const ficha = ev.ficha ?? f.ficha ?? null;
    const nome = superDoLutador(f.id, ficha)?.nome ?? ev.golpe;
    this.tarjaDoSuper.iniciar({ lutador: ev.lutador, golpe: ev.golpe, ficha, nome });
    this.baixarMusica(true);
    return true;
  }

  update(): void {
    // o estado de ANTES do tick, para o desenho interpolar; em toda chamada (pausa, cinemática, provocação, entrada), então nada desliza quando nada anda
    if (this.ui.fluidez && this.espera.pronta) this.fluidez.gravar(this.ui.m.game, this.ui.m.elenco, { tremor: this.ui.c.persist.settings.shake });
    if (this.paused || !this.espera.pronta) return;
    this.aoFimDaLuta();
    if (this.entradaPendente) this.comecarEntrada();
    if (this.entrada.ativa) {
      // a entrada anda no lugar do motor: `game.update` NÃO é chamado (nada do lock-step muda). Qualquer ataque de um humano pula (depois do tick 10).
      if (this.alguemPulou()) this.entrada.pular();
      this.entrada.avancar();
      // as tarjas dos especiais se pintam durante a entrada (sobra tempo aqui e o 1º especial não paga o custo de primeira vez)
      if (this.aquecendo && this.modoDaCine() !== null) this.aquecendo = this.cine.aquecer(this.ui.m.game, this.ui.m.elenco);
      this.registrarRitmo('entrada-chefe');
      return;
    }
    // PROVOCAÇÃO do round 1: antes do 1º `game.update` (o motor fica em `intro` t 0; o `round start` segue pendente e sai no 1º update depois dela).
    // R-2 (`Regras.ritmo.provocacao`): a CURTA do round 1 passa a correr por CIMA da contagem — `sobreposta` deixa de retornar aqui e cai
    // no fluxo normal abaixo, que chama `game.update` no MESMO tick (o balão continua desenhando por cima, em `draw()`, sem mudar nada
    // ali). A COMPLETA (1º confronto do ARCADE/chefão, D-R8) continua bloqueando como hoje: é rara e intencional, como a entrada do chefão.
    if (this.aberturaPendente) this.comecarProvocacao('abertura');
    if (this.provocacao.ativa) {
      const sobreposta = this.ui.c.regras.ritmo?.provocacao === true && this.provocacao.roteiro?.tipo === 'abertura' && this.provocacao.roteiro?.modo === 'curta';
      this.passoDaProvocacao();
      if (!sobreposta) {
        this.registrarRitmo('provocacao');
        return;
      }
    }
    // FILME do especial: o motor não anda (como a cinemática); KO, troca de barra e fim de round esperam o último quadro
    if (this.filme.ativo) {
      this.registrarRitmo('filme');
      this.passoDoFilme();
      return;
    }
    // TARJA DO SUPER (R-9, `ritmo.super`): congela, como a cinemática — mas é uma classe à parte (visual diferente, §3.2/§3.4).
    // Não pula: 30 ticks já é o orçamento curto do §5.1 G3 (ao contrário do FILME, que vem depois e É pulável).
    if (this.tarjaDoSuper.ativa) {
      this.registrarRitmo('flash-super');
      this.tarjaDoSuper.avancar();
      return;
    }
    if (this.cine.ativa) {
      this.registrarRitmo('tarja');
      this.passoDaCinematica();
      return;
    }
    const { game, efeitos, petalasLuta } = this.ui.m;
    // abertura da luta: pinta as tarjas dos especiais (uma por tick), fora do caminho do primeiro especial
    if (this.aquecendo && this.modoDaCine() !== null) this.aquecendo = this.cine.aquecer(game, this.ui.m.elenco);
    if (this.superDev && game.phase === 'fight') {
      this.dispararSuperDev();
      return;
    }
    if (this.filmeDev && game.phase === 'fight') {
      this.dispararFilmeDev();
      return;
    }
    // FAIXA DO RITMO (R-2): nunca bloqueia, então anda em TODO tick que chega até aqui (a luta anda igual, com ou sem ela ativa).
    this.faixaRitmo.avancar();
    this.antesDoTick = [game.fighters[0], game.fighters[1]].map((f) => ({ hp: f.hp, hpShown: f.hpShown, barras: f.barras })) as [HudDoRival, HudDoRival];
    const t0 = game.t;
    game.update(this.fonte);
    this.registrarRitmo(motivoDoTick({ entradaChefeAtiva: false, provocacaoBloqueando: false, filmeAtivo: false, tarjaBloqueando: false, tarjaDoSuper: false, fase: game.phase, hitstop: game.hitstop }));
    petalasLuta.avancar(t0);
    // eventos -> som e efeitos visuais; depois os efeitos andam um tick (só se a luta andou: hitstop congela).
    // Tick com FILME: o acerto que o abriu e os sons/efeitos dele são do filme (por batida); KO, troca de barra, fim de round e o pó da queda esperam.
    const filme = game.events.find((e): e is EventoFilme => e.tipo === 'filme');
    const agora: EventoLuta[] = [];
    this.adiadosNaQueda = [];
    this.adiadosNoFim = [];
    for (const ev of game.events) {
      if (!filme) agora.push(ev);
      else if ((ev.tipo === 'hit' || ev.tipo === 'throw') && ev.filme === true) this.acertoDoFilme = ev;
      else if (ev.tipo === 'filme') continue;
      else if (ev.tipo === 'dust') this.adiadosNaQueda.push(ev);
      else if (ev.tipo === 'ko' || ev.tipo === 'round' || ev.tipo === 'perfect' || ev.tipo === 'fase-chefe') this.adiadosNoFim.push(ev);
      else agora.push(ev);
    }
    this.reagirAosEventos(agora);
    if (filme) this.comecarFilme(filme);
    if (game.tick !== this.ultimoTick) {
      this.ultimoTick = game.tick;
      efeitos.avancar();
      this.sessao.avancar(game);
      this.hudRitmo.avancar(game);
      this.moedas.avancar();
    }
    this.atualizarBotaoEsquiva();
    // PROVOCAÇÃO da vitória: do tick 56 do `matchend` (o título já apareceu), com o vencedor em `win` (ou t >= 100, a garantia). Depois o motor fica parado.
    if (!this.vitoriaDisparada && !game.matchDone && game.phase === 'matchend' && game.matchWinner !== null && game.t >= 56 && (game.t >= 100 || game.fighters[game.matchWinner].state === 'win')) {
      this.comecarProvocacao('vitoria');
    }
    if (game.matchDone && !this.ended) {
      this.ended = true;
      this.finish();
    }
  }

  /** Os eventos de um tick (ou os que esperaram o filme): som, efeitos, sessão do especial, moedas do dreno, rodada e a fase 2 do chefão. */
  private reagirAosEventos(eventos: readonly EventoLuta[]): void {
    const { game, efeitos } = this.ui.m;
    reagirDoJogo(this.ui.c.audio, game, eventos);
    for (const ev of eventos) {
      if (ev.tipo === 'round' && ev.fase === 'start') efeitos.limpar();
      this.anotarRound(ev);
      efeitos.reagir(ev, (i) => game.fighters[i], (i) => this.corDoLutador(i));
      this.reagirAoEspecial(ev);
      this.moedas.reagir(ev, game);
      // O chefe sai em 3 etapas (troca, danca, retomada): o flash e o "FASE 2!" são só da troca de barra, senão disparam 3 vezes.
      // danca/retomada ainda não têm efeito visual próprio (não há overlay de cena do chefe no HUD; por ora só o filtro).
      if (ev.tipo === 'fase-chefe' && ev.etapa === 'troca') this.aoFaseDoChefe(ev.lutador);
    }
  }

  /**
   * O modo do filme: COMPLETA, ou CURTA na repetição do mesmo especial na luta (D-V4), no TREINO (D-R5/D-V5) e com a cinemática CURTA, DESLIGADA
   * ou movimento reduzido. R-9 (§3.3): quando o evento traz `motivo` (Vega, `ritmo.filmeRestrito`/`ritmo.super`), a tabela do §3.3 manda em
   * vez da heurística de hoje — KO que DECIDE A LUTA (`ev.decideALuta`, calculado pelo motor no tick do KO: `game.matchWinner` só é
   * preenchido em `endRound`, ~100 ticks DEPOIS do acerto, então não serve) = COMPLETO; 'super': COMPLETO na 1ª vez DAQUELE super na luta,
   * CURTO depois (marca de "visto" por motivo: um super reaproveita o golpe de um especial que já tenha aberto filme de KO); 'ko' de
   * round = CURTO. TREINO é sempre CURTO (o motor nunca mata em treino; só o 'super' chega, e cai nesta regra).
   */
  private modoDoFilme(chave: string, ev: EventoFilme): ModoFilme {
    const repetido = this.filmesVistos.has(chave);
    this.filmesVistos.add(chave);
    const { game } = this.ui.m;
    if (this.modoDaCine() !== 'completa' || game.training) return 'curta';
    if (ev.decideALuta === true) return 'completa';
    if (ev.motivo === 'super') return repetido ? 'curta' : 'completa';
    if (ev.motivo === 'ko') return 'curta';
    return repetido ? 'curta' : 'completa';
  }

  /** Abre o filme de um evento `filme` do motor (ou do gancho de desenvolvimento). A luta já está no estado final; a cena só deixa de chamar `game.update`. */
  private comecarFilme(ev: EventoFilme, antes?: HudDoRival): void {
    const { game, elenco } = this.ui.m;
    const fa = game.fighters[ev.atacante];
    const ch = chDaFicha(elenco[fa.id].ch, ev.ficha);
    const roteiro = roteiroDoFilme(fa.id, ev.ficha, ev.golpe, ev.projetil);
    const rival = game.fighters[ev.defensor];
    this.fluidez.zerar();
    this.filme.iniciar({
      ev,
      roteiro,
      modo: this.modoDoFilme(`${fa.id}|${ev.ficha ?? ''}|${ev.golpe}|${ev.motivo ?? ''}`, ev),
      rivalAntes: antes ?? this.antesDoTick?.[ev.defensor] ?? { hp: rival.hp, hpShown: rival.hpShown, barras: rival.barras },
      cor: identidadeDe(fa.id, ev.ficha, ev.golpe)?.paleta.brilho ?? ch.fire[0],
      alturaDoAtacante: alturaDoLutador(ch),
      cameraInicial: { x: game.cam.x, z: game.cam.z },
    });
  }

  /** Um tick do filme: a luta NÃO anda. Pular = ataque de um humano depois do tick 10. */
  private passoDoFilme(): void {
    const { efeitos } = this.ui.m;
    if (this.alguemPulou()) this.filme.pular();
    this.filme.avancar();
    efeitos.avancar();
    this.moedas.avancar();
    if (this.filme.ativo) return;
    // fechou: a interpolação parte do estado final (nada desliza) e o que esperou o filme acontece agora
    this.fluidez.zerar();
    this.acertoDoFilme = null;
    const lista = [...this.adiadosNaQueda, ...this.adiadosNoFim];
    this.adiadosNaQueda = [];
    this.adiadosNoFim = [];
    this.reagirAosEventos(lista);
  }

  /**
   * GANCHO DE DESENVOLVIMENTO (`?filme=<lutador>:<golpe>`): faz o que o motor faria no contato (dados de `src/data/filmes.ts`) e abre o filme com um evento falso.
   * O estado final é aplicado nos lutadores (posição, vida, queda) para o mundo que volta ser coerente com o último quadro.
   */
  private dispararFilmeDev(): void {
    if (!import.meta.env.DEV) return; // o corpo inteiro sai do bundle de produção
    const alvo = this.filmeDev;
    this.filmeDev = null;
    if (!alvo) return;
    const { game } = this.ui.m;
    const indice: IndiceLutador = game.p2.id === alvo.lutador && game.p1.id !== alvo.lutador ? 1 : 0;
    const a = game.fighters[indice];
    const d = game.fighters[indice === 0 ? 1 : 0];
    const def = filmeDoGolpe(a.id, a.ficha ?? null, alvo.golpe);
    if (!def) return;
    const roteiro = roteiroDoFilme(a.id, a.ficha ?? null, alvo.golpe, false);
    const projetil = roteiro.tipo === 'projetil';
    const lado: 1 | -1 = indice === 0 ? 1 : -1;
    a.x = projetil ? 240 : 380;
    d.x = projetil ? 720 : 520;
    if (indice === 1) [a.x, d.x] = [960 - a.x, 960 - d.x];
    a.facing = lado;
    d.facing = lado === 1 ? -1 : 1;
    a.y = GROUND;
    d.y = GROUND;
    const pos = (f: typeof a) => ({ x: f.x, y: f.y, facing: f.facing });
    const antes = { atacante: pos(a), defensor: pos(d) };
    const hpAntes = { hp: d.hp, hpShown: d.hpShown, barras: d.barras };
    const dano = Math.min(def.dano, Math.max(0, d.hp - 1));
    d.hp -= dano;
    d.setState('down');
    d.phase = 'lie';
    d.st = 0;
    d.x = clamp(a.x + a.facing * (def.distancia ?? 150), 150, 810);
    if (!projetil) a.x = clamp(d.x - a.facing * (def.distancia ?? 150), 60, 900);
    const depois = { atacante: pos(a), defensor: pos(d) };
    // R-9 (DEV): `?filme=lutador:golpe:super` ou `:ko[:luta]` simula o `motivo` do R-6/R-7 (ainda sem o motor real) para provar `modoDoFilme`.
    const ev: EventoFilme = {
      tipo: 'filme',
      atacante: a.indice,
      defensor: d.indice,
      golpe: alvo.golpe,
      ficha: a.ficha ?? null,
      projetil,
      dano,
      contragolpe: false,
      ko: alvo.motivo === 'ko',
      ...(alvo.decideALuta ? { decideALuta: true } : {}),
      trocaDeBarra: false,
      final: def.final ?? 'derruba',
      antes,
      depois,
      ...(alvo.motivo ? { motivo: alvo.motivo } : {}),
    };
    this.comecarFilme(ev, hpAntes);
  }

  /**
   * GANCHO DE DESENVOLVIMENTO (`?super=<lutador>`): simula o `special` do super (barra cheia, os dois botões) e entrega a `reagirAoSuper` —
   * a MESMA tarja que o jogo real abriria quando `ev.super === true` chegar (R-7). Não toca o `hp`/`en` do motor: só a tarja, para medir e
   * capturar a geometria/tempo dela sem depender do motor real. Precisa de `Regras.ritmo.super` (`?ritmo=super` ou `?ritmo=1`) para aparecer.
   */
  private dispararSuperDev(): void {
    if (!import.meta.env.DEV) return; // o corpo inteiro sai do bundle de produção
    const alvo = this.superDev;
    this.superDev = null;
    if (!alvo) return;
    const { game } = this.ui.m;
    const indice: IndiceLutador = game.p2.id === alvo.lutador && game.p1.id !== alvo.lutador ? 1 : 0;
    const a = game.fighters[indice];
    const golpe = superDoLutador(a.id, a.ficha ?? null)?.golpe;
    if (!golpe) return;
    this.reagirAoSuper({ tipo: 'special', lutador: indice, pitch: 0, golpe, ficha: a.ficha ?? null, super: true });
  }

  /** Guarda o que a provocação precisa dos eventos: quem ganhou o round, se foi por tempo e a abertura do round 2+ (abre no mesmo tick, com o motor parado). */
  private anotarRound(ev: EventoLuta): void {
    if (ev.tipo !== 'round') return;
    if (ev.fase === 'end') this.vencedorDoRound = ev.vencedor ?? null;
    else if (ev.fase === 'timeover') this.roundPorTempo = true;
    else if (ev.fase === 'start') {
      this.roundPorTempo = false;
      if (ev.round >= 2) this.comecarProvocacao('rodada');
    }
  }

  /** Cor principal (`fire[0]`) do lutador `i`, na ficha em que ele está (NILA em SARPA, BAATAR na fase 2). */
  private corDoLutador(i: 0 | 1): string {
    const f = this.ui.m.game.fighters[i];
    return chDaFicha(this.ui.m.elenco[f.id].ch, f.ficha).fire[0];
  }

  /**
   * Botões ESQ e ESPECIAL do toque: apagam (`.sem`) quando a barra do P1 está abaixo do custo (da esquiva e do especial, o mesmo "pronto" do HUD). Ao o
   * ESPECIAL ficar pronto ganha `.acendeu` por 220 ms (um estalo; o pulso de "pronto" é CSS). Só mexe no DOM quando o estado muda.
   */
  private atualizarBotaoEsquiva(): void {
    if (typeof document === 'undefined') return;
    const p1 = this.ui.m.game.p1;
    const semEsq = p1.en < ESQUIVA_PADRAO.custo;
    if (semEsq !== this.botaoEsqSem) {
      this.botaoEsqSem = semEsq;
      document.getElementById('esq')?.classList.toggle('sem', semEsq);
    }
    const custo = chDaFicha(this.ui.m.elenco[p1.id].ch, p1.ficha).proj.cost;
    const semEsp = p1.en < custo;
    if (semEsp !== this.botaoEspSem) {
      const acendeu = this.botaoEspSem === true && !semEsp;
      this.botaoEspSem = semEsp;
      this.fimDoAcendeu = this.atualizarBotaoComAcendeu('r1', semEsp, acendeu, this.fimDoAcendeu);
    }
    // R-9 (`ritmo.super`): o SUPER só "pronto" com a barra CHEIA (D-R1, `en === 100` — o custo do super inteiro, não o do especial).
    if (this.ui.c.regras.ritmo?.super === true) {
      const semSup = p1.en < 100;
      if (semSup !== this.botaoSupSem) {
        const acendeu = this.botaoSupSem === true && !semSup;
        this.botaoSupSem = semSup;
        this.fimDoAcendeuSup = this.atualizarBotaoComAcendeu('sup', semSup, acendeu, this.fimDoAcendeuSup);
      }
    }
  }

  /** `#r1`/`#sup`: alterna `.sem` e, ao ficar pronto (`acendeu`), reinicia o estalo `.acendeu` (220 ms). Devolve o novo timer (para o campo do chamador). */
  private atualizarBotaoComAcendeu(id: string, sem: boolean, acendeu: boolean, timerAtual: ReturnType<typeof setTimeout> | null): ReturnType<typeof setTimeout> | null {
    const el = document.getElementById(id);
    el?.classList.toggle('sem', sem);
    if (timerAtual !== null) clearTimeout(timerAtual);
    el?.classList.remove('acendeu');
    if (!acendeu || !el) return null;
    // reinicia a animação mesmo se a classe já tivesse estado ligada (força o recálculo de estilo antes de pô-la de volta)
    void el.offsetWidth;
    el.classList.add('acendeu');
    return setTimeout(() => {
      if (id === 'r1') this.fimDoAcendeu = null;
      else this.fimDoAcendeuSup = null;
      el.classList.remove('acendeu');
    }, 220);
  }

  /**
   * Até onde o balão da provocação pode ir à direita, em px lógicos: 948 na tela de sempre; no celular deitado estreito (844x390) o botão de pausa (canto de cima à direita)
   * entra na área do jogo, e o balão para antes dele (8 px de respiro). Lê a caixa do #bp e a do canvas (só com toque).
   */
  private limiteDireitoDosBaloes(): number | undefined {
    if (typeof document === 'undefined' || !this.ui.c.temToque()) return undefined;
    const bp = document.getElementById('bp')?.getBoundingClientRect();
    const cv = document.getElementById('jogo')?.getBoundingClientRect();
    if (!bp || !cv || bp.width === 0 || cv.width === 0) return undefined;
    const k = cv.width / LARGURA;
    const esquerdaDoBotao = (bp.left - cv.left) / k;
    return esquerdaDoBotao < LARGURA ? esquerdaDoBotao - 8 : undefined;
  }

  /** O chefe passou para a 2ª barra: flash e faíscas nele e o aviso na tela (o som e o tremor são da luta). */
  private aoFaseDoChefe(indice: 0 | 1): void {
    const { game, efeitos } = this.ui.m;
    const f = game.fighters[indice];
    efeitos.faiscas(f.x, f.y - 120, '#ffffff', 40);
    efeitos.estrela(f.x, f.y - 120, '#e6c8ff', true);
    efeitos.textoFlutuante(f.x, f.y - SH, 'FASE 2!', '#ff9a3a', 28);
  }

  private finish(): void {
    const { game } = this.ui.m;
    const a = this.a;
    if (!a) return;
    const win = game.matchWinner;
    const run = a.run;
    if (a.cfg.mode === 'arcade' && run) {
      run.score = game.p1.score;
      if (win === 0) {
        run.idx++;
        const prox = run.etapas[run.idx];
        if (!prox) this.ui.go('ending', { run });
        else if (prox.chefe) this.ui.go('chefe', { cfg: cfgDaEtapa(run, true, this.ui.c.regras), run }); // aviso de chefe, depois o VS do chefão
        else this.ui.go('vs', { cfg: cfgDaEtapa(run, true, this.ui.c.regras), run });
      } else this.ui.go('continue', { run, a });
      return;
    }
    this.ui.go('result', {
      a,
      winner: win === 0 ? 1 : 2,
      st: { r1: game.p1.wins, r2: game.p2.wins, c1: game.p1.maxCombo, c2: game.p2.maxCombo, s1: game.p1.score, s2: game.p2.score },
    });
  }

  key(k: string): boolean {
    const { game } = this.ui.m;
    const { audio } = this.ui.c;
    if (this.paused) {
      const act = NAV[k];
      if (this.view === 'moves') {
        if (act === 'back' || act === 'ok' || k === 'p') {
          this.view = 'main';
          audio.uiBack();
        }
        return true;
      }
      const menu = this.menuFor() ?? this.m;
      if (k === 'p') {
        if (this.view === 'main') this.resume();
        else this.view = 'main';
        return true;
      }
      if (act === 'back') {
        if (this.view === 'main') this.resume();
        else {
          this.view = 'main';
          audio.uiBack();
        }
        return true;
      }
      if (act) menu.nav(act);
      return true;
    }
    if (k === 'Escape' || k === 'p') {
      this.pause();
      return true;
    }
    if (k === 'Enter' && this.filme.ativo) {
      this.filme.pular();
      return true;
    }
    if (k === 'Enter' && this.entrada.ativa) {
      this.entrada.pular();
      return true;
    }
    // ENTER durante a provocação pula (depois do tick 10 / 24); antes disso é consumido: não vira "pular o fim da luta" por engano
    if (k === 'Enter' && this.provocacao.ativa) {
      this.provocacao.pular();
      return true;
    }
    if (k === 'Enter' && game.phase === 'matchend' && game.t > 40) {
      game.matchDone = true;
      return true;
    }
    if (k === 'h') {
      game.debug = !game.debug;
      return true;
    }
    if (k === 'r' && game.training) {
      game.p1.reset(false);
      game.p2.reset(false);
      this.limparEfeitos();
      game.phase = 'fight';
      return true;
    }
    if (game.training && k === 't') {
      game.trocarAlvoDoTreino(ALVOS[(ALVOS.indexOf(game.dummy) + 1) % ALVOS.length] ?? 'stand');
      return true;
    }
    return false;
  }

  private menuFor(): MenuList | null {
    return this.view === 'audio' ? this.am : this.view === 'confirm' ? this.cm : this.view === 'main' ? this.m : null;
  }

  hover(x: number, y: number): void {
    if (this.paused) this.menuFor()?.hover(x, y);
  }

  /** O Navegador só entrega clique/toque à luta em andamento quando isto é verdade: a provocação ativa (pular com o mouse ou o dedo no canvas). */
  aceitaToqueNaLuta(): boolean {
    return this.provocacao.ativa;
  }

  click(x: number, y: number): void {
    if (!this.paused) {
      if (this.provocacao.ativa) this.provocacao.pular();
      return;
    }
    const m = this.menuFor();
    if (m) m.click(x, y);
    else this.view = 'main';
  }

  blur(): void {
    this.pause();
  }

  draw(alfa = 1): void {
    const { ctx, f, persist, rngVisual } = this.ui.c;
    const m = this.ui.m;
    const { game } = m;
    // a leitura a desenhar: com a fluidez ligada, a posição entre o tick anterior e o atual + a mola; senão o próprio motor (o oráculo de pixel não vê diferença)
    // FILME do especial: a leitura é a do roteiro (trajetória, poses, HUD descendo por batida e câmera); o mundo e o HUD são os de sempre
    const vistaDoFilme = this.filme.ativo ? this.filme.vista(game, m.elenco) : null;
    const luta = vistaDoFilme ?? (this.ui.fluidez ? this.fluidez.vista(game, alfa, m.elenco, { tremor: persist.settings.shake }) : game);
    const W = LARGURA;
    const H = ALTURA;
    // entrada dramática: o mundo sem HUD, o chefe na pose da vez e os braseiros acendendo; as faixas, o cartão e a fala vêm por cima
    const q = this.entrada.ativa ? this.entrada.quadro() : null;
    const pv = this.provocacao.ativa ? this.provocacao.vista(game, m.elenco) : null;
    const chefe = q ? chefeDaLeitura(game) : null;
    const poseDaEntrada = q && chefe ? this.entrada.batidas[q.pose]?.pose : undefined;
    // zoom e deslocamento da entrada do guardião (roteiro): o zoom é ancorado no chão perto do chefão, mas nunca fora do miolo da tela (o plano aberto < 1 não mostra borda)
    const zoomDaEntrada = q && chefe && q.zoom !== 1 ? { fator: q.zoom, x: clamp(paraATela(chefe.x + q.dx, GROUND, game.cam).x, 390, 570) } : undefined;
    desenharMundo(ctx, luta, m.rec, m.efeitos, m.petalasLuta, rngVisual, {
      tremor: persist.settings.shake,
      // tecla H: as caixas de dano e de acerto, só no treino do servidor de desenvolvimento (conferência a olho; não existe no jogo publicado)
      ...(import.meta.env.DEV && game.training && game.debug ? { caixas: game } : {}),
      alvoTreino: game.dummy,
      esquiva: this.ui.c.regras.esquiva,
      ...(this.ui.c.regras.ritmo?.tarja === true ? { ritmo: this.hudRitmo } : {}),
      ...(q ? { hud: false, acesos: q.acesos } : {}),
      ...(vistaDoFilme ? { overlay: false } : {}),
      ...(zoomDaEntrada ? { zoom: zoomDaEntrada } : {}),
      ...(q && chefe && q.dx !== 0 ? { deslocamento: { [chefe.indice]: q.dx } } : {}),
      ...(pv ? { hud: pv.quadro.hud, overlay: pv.quadro.overlay, poses: pv.poses, deslocamento: pv.deslocamento, ...(pv.zoom ? { zoom: pv.zoom } : {}) } : {}),
      ...(chefe && poseDaEntrada ? { poses: { [chefe.indice]: poseDaEntrada } } : {}),
    });
    if (q) {
      // onde o chefão está NA TELA (câmera, deslocamento e zoom da entrada): os efeitos de cena o seguem
      const onde = chefe ? paraATela(chefe.x + q.dx, chefe.y, game.cam, zoomDaEntrada) : null;
      this.entrada.desenhar(ctx, onde ? { x: onde.x, chao: onde.y } : undefined);
    }
    else if (!pv) this.moedas.desenhar(ctx, game);
    if (!this.espera.pronta) {
      f.T(this.espera.falhou ? 'Não foi possível carregar os lutadores.' : `Carregando lutadores... ${this.espera.percentual}%`, W / 2, H / 2, 20, '#fff', 'center');
    }
    // a cinemática por cima do mundo; fora dela, a sessão dos acertos (números, "N HITS" e a vinheta de 20%)
    if (vistaDoFilme) this.filme.desenhar(ctx, vistaDoFilme, m.elenco);
    else if (pv) this.provocacao.desenhar(ctx, game, m.elenco, pv, this.limiteDireitoDosBaloes());
    else if (this.tarjaDoSuper.ativa) this.tarjaDoSuper.desenhar(ctx, game, m.elenco);
    else if (this.cine.ativa) this.cine.desenhar(ctx, game, m.elenco);
    else if (!q) {
      this.sessao.desenhar(ctx, game, m.elenco);
      // fala do chefão em legenda: fase 2 (na cena), vitória (matchend) e derrota (no KO final)
      const c = chefeDaLeitura(game);
      let fala = c ? falaDoChefe(game, c) : null;
      // o ZENON vencendo fala pelo balão da provocação (decisão do dono): a legenda de vitória dele só fica se a provocação não vai existir
      if (fala && c && game.phase === 'matchend' && game.matchWinner === c.indice && !game.matchDone && this.queroProvocar('vitoria')) fala = null;
      if (fala) desenharLegenda(ctx, fala, Math.min(1, game.t / 12));
    }
    // FAIXA DO RITMO (R-2): por cima de tudo, independente do resto (a luta continua jogável enquanto ela aparece; `cine`, `tarjaDoSuper`
    // e `pv` nunca coexistem com ela, porque `reagirAoEspecial`/`reagirAoSuper` escolhem um só pela flag).
    this.faixaRitmo.desenhar(ctx, game, m.elenco);
    if (!this.paused) {
      if (game.training && game.phase === 'fight' && game.t < 400) {
        f.T('ESC pausa  •  R reposiciona  •  T troca o alvo', W / 2, H - 56, 13, '#cfd6f5', 'center', { alpha: 1 - game.t / 400 });
      }
      return;
    }
    ctx.fillStyle = 'rgba(6,3,16,.72)';
    ctx.fillRect(0, 0, W, H);
    if (this.view === 'moves') {
      ctx.fillStyle = 'rgba(6,3,16,.8)';
      ctx.fillRect(0, 0, W, H);
      this.desenharGolpes();
      return;
    }
    f.A('PAUSADO', W / 2, 62, 64, ['#ffffff', '#ffc27a'], '#1a0a00');
    if (this.view === 'main') {
      this.m.draw(W / 2 - 190, 110, 380, 50, { size: 24, align: 'center' });
      f.hint('↑ ↓ navegar     ENTER / Z selecionar     ESC continuar');
    } else if (this.view === 'audio') {
      f.A('ÁUDIO', W / 2, 130, 36, '#fff', '#000');
      this.am.draw(W / 2 - 230, 170, 460, 56, { size: 24 });
      f.hint('↑ ↓ escolher     ← → ajustar     ESC voltar');
    } else if (this.view === 'confirm') {
      f.A('SAIR PARA O MENU?', W / 2, 150, 40, '#fff', '#000');
      f.T('O progresso desta luta será perdido.', W / 2, 192, 17, '#ffd9a6', 'center');
      this.cm.draw(W / 2 - 170, 230, 340, 56, { size: 26, align: 'center' });
      f.hint('↑ ↓ escolher     ENTER confirmar     ESC voltar');
    }
  }

  private desenharGolpes(): void {
    const { f } = this.ui.c;
    const m = this.ui.m;
    const { game } = m;
    const W = LARGURA;
    f.A('LISTA DE GOLPES', W / 2, 40, 44, ['#ffffff', '#ffc27a'], '#1a0a00');
    if (game.mode === 'versus') {
      const colunas = [
        [game.p1, 1, 14],
        [game.p2, 2, W / 2 + 6],
      ] as const;
      for (const [p, s, x] of colunas) {
        f.A(p.ch.name + (s === 1 ? '  (P1)' : '  (P2)'), x + (W / 2 - 20) / 2, 80, 22, P_COL[s - 1] ?? '#fff', '#000');
        desenharLinhasDeGolpes(f, m, p.ch.id, x, 100, W / 2 - 20, s, 50);
      }
    } else {
      f.A(game.p1.ch.name, W / 2, 80, 24, P_COL[0], '#000');
      // V2-4 (§6.2): no TREINO com a regra dos combos próprios ligada, a lista dos combos do lutador ocupa o lugar da dica genérica
      const combos = game.training && game.combosLigados ? combosDoLutador(m.elenco[game.p1.ch.id].ch) : [];
      // R-9 (`ritmo.super`, §3.3 "TREINO: só o super"): a linha "SUPER · <nome>" soma à altura dos combos (nome vem de `src/data/supers.ts` (Vega, R-7)).
      const superNome = game.training && this.ui.c.regras.ritmo?.super === true ? superDoLutador(game.p1.ch.id, game.p1.ficha ?? null)?.nome ?? null : null;
      const alturaExtra = alturaDosCombos(combos.length) + (combos.length > 0 && superNome ? 6 : 0) + (superNome ? ALTURA_DA_CAIXA_DE_COMBO : 0);
      const rowH = alturaExtra > 0 ? Math.min(50, Math.floor((500 - alturaExtra - 6 - 100 + 5) / 7)) : 50;
      desenharLinhasDeGolpes(f, m, game.p1.ch.id, 60, 100, W - 120, 1, rowH);
      if (alturaExtra > 0) {
        let y = 100 + 7 * rowH - 5 + 6;
        if (combos.length > 0) {
          desenharCombos(f, combos, game.p1.ch.accent, 60, y, W - 120, 1);
          y += alturaDosCombos(combos.length) + 6;
        }
        if (superNome) desenharLinhaDoSuper(f, superNome, 60, y, W - 120, 1);
        f.hint((combos.length > 0 ? DICA_DOS_COMBOS : 'COMBO: soco fraco → chute fraco → soco forte → chute forte → especial (aperte o próximo botão ao acertar)') + '     ESC voltar');
        return;
      }
    }
    f.hint('COMBO: soco fraco → chute fraco → soco forte → chute forte → especial (aperte o próximo botão ao acertar)     ESC voltar');
  }
}

/**
 * `?filme=<lutador>:<golpe>` (ex.: `?filme=hayato:sFire`) -> o alvo do gancho de desenvolvimento, ou null. R-9 (DEV, enquanto `src/data/supers.ts`
 * não existe): dois segmentos extras simulam o `motivo` do evento `filme` (R-6/R-7) sem precisar do motor real — `:super` (ex.
 * `?filme=hayato:sDown:super`) ou `:ko` (KO de round) / `:ko:luta` (KO que decide a partida, `ex. ?filme=hayato:sDown:ko:luta`).
 */
export function lerFilmeDev(busca: string): { lutador: string; golpe: string; motivo?: 'super' | 'ko'; decideALuta?: boolean } | null {
  const bruto = new URLSearchParams(busca).get('filme');
  if (!bruto) return null;
  const [lutador, golpe, motivoBruto, luta] = bruto.split(':');
  if (!lutador || !golpe) return null;
  const motivo = motivoBruto === 'super' || motivoBruto === 'ko' ? motivoBruto : undefined;
  return { lutador, golpe, ...(motivo ? { motivo } : {}), ...(motivo === 'ko' && luta === 'luta' ? { decideALuta: true } : {}) };
}

/** `?super=<lutador>` (ex.: `?super=hayato`) -> o alvo do gancho de desenvolvimento do super (R-9), ou null. */
export function lerSuperDev(busca: string): { lutador: string } | null {
  const lutador = new URLSearchParams(busca).get('super');
  return lutador ? { lutador } : null;
}
