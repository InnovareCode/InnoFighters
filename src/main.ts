import './input/toque.css';
import './platform/aviso.css';
import './fontes.css';
import { iniciarArte } from './assets/elenco';
import { AudioSys } from './audio/audio-sys';
import { carregarCamadasSonoras } from './audio/camadas';
import { chavesSonoras, lerEscutaDaUrl } from './audio/chaves';
import { carregarDadosV2, type ArmazenamentoLike } from './core/storage';
import type { IdLutador } from './core/contratos';
import { criarRng, sementeAleatoria } from './core/rng';
import { CENARIO_PADRAO } from './data/cenarios';
// efeito colateral PROPOSITAL: valida as falas das provocações no carregamento (lutador sem falas ou fora dos limites derruba o boot, alto e cedo)
import './data/provocacoes';
import { Game } from './fight/game';
import { REGRAS_PADRAO } from './meta';
import { criarEntrada } from './input/entrada';
import { ajustarEscala } from './platform/escala';
import { verificarVersao } from './versao';
import { mostrarErrosNaTela } from './platform/erros';
import { observarFoco } from './platform/foco';
import { criarAviso } from './platform/aviso';
import { desbloquearAudio } from './platform/audio-desbloqueio';
import { carregarFontes } from './platform/fontes';
import { alternarTelaCheia } from './platform/tela-cheia';
import { criarVinheta } from './render/cenario';
import { CampoDePetalas, Efeitos } from './render/efeitos';
import { prepararCanvas } from './render/tela';
import type { Contexto, Mundo } from './ui/contexto';
import { criarFerramentas } from './ui/ferramentas';
import { iniciarMarca } from './ui/logo';
import { Navegador } from './ui/navegador';
import { criarPersistencia, MSG_NAO_SALVO } from './ui/persistencia';

/** Armazenamento local, ou uma memória descartável se o navegador o bloqueia (modo privado). */
function obterArmazenamento(): ArmazenamentoLike {
  try {
    const ls = window.localStorage;
    ls.getItem('inno-fighters-v1');
    return ls;
  } catch {
    const mem = new Map<string, string>();
    return {
      getItem: (k) => mem.get(k) ?? null,
      setItem: (k, v) => void mem.set(k, v),
      removeItem: (k) => void mem.delete(k),
    };
  }
}

/** Semente: `?seed=N` fixa tudo (testes e replays); sem ela, aleatória a cada visita. */
function lerSemente(): number {
  const bruto = new URLSearchParams(window.location.search).get('seed');
  const n = bruto === null ? Number.NaN : Number(bruto);
  return Number.isFinite(n) ? n >>> 0 : sementeAleatoria();
}

/** `prefers-reduced-motion: reduce` (consulta única, o navegador atualiza o `matches` sozinho). */
function reduzirMovimento(): () => boolean {
  const mq = typeof window.matchMedia === 'function' ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
  return () => mq?.matches ?? false;
}

async function iniciar(): Promise<void> {
  const canvas = document.getElementById('jogo');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #jogo nao encontrado');
  const ctx = prepararCanvas(canvas);
  mostrarErrosNaTela(window);
  ajustarEscala(canvas);
  window.addEventListener('resize', () => ajustarEscala(canvas));
  // a logo oficial (splash, logo completa e horizontal) começa a baixar JÁ, em paralelo com as fontes, o áudio e a arte: o boot desenha o splash enquanto o resto carrega
  iniciarMarca(import.meta.env.BASE_URL);

  // ---- semente e sorteios (a lógica e os efeitos visuais nunca dividem a mesma sequência) ----
  const semente = lerSemente();
  const rngLogica = criarRng(semente);
  const rngVisual = criarRng(semente + 1);
  const rngUI = criarRng(semente + 2);

  // `?expansao=1` (SÓ em desenvolvimento): os 10 lutadores reais TODOS liberados, para ver os novos jogando sem zerar o
  // ARCADE. `?expansao=4`: só os 4 de antes da E5 (fidelidade com o protótipo e o ARCADE de 3 lutas). O import dinâmico fica
  // fora do bundle de produção.
  const params = new URLSearchParams(window.location.search);
  const modoExpansao = import.meta.env.DEV ? params.get('expansao') : null;
  const fixture = modoExpansao === '1' || modoExpansao === '4' ? await import('./ui/dev-expansao') : null;
  const regras = !fixture ? REGRAS_PADRAO : modoExpansao === '4' ? fixture.regrasDeQuatro() : fixture.regrasExpansao();
  // sem a mecânica da ESQUIVA (?expansao=4) o botão ESQ do toque some (a casa fica; ver toque.css)
  document.body.classList.toggle('sem-esquiva', !regras.esquiva);

  // ---- configurações, recorde e progresso (C4 v2, com a migração da v1 e da chave antiga) ----
  const armazenamento = obterArmazenamento();
  const salvos = carregarDadosV2(armazenamento, regras);
  const avisar = criarAviso(document.getElementById('aviso'));
  // o Pages guarda o index.html por 10 min: se há versão mais nova no ar, avisa já no boot (o toque em Opções > aviso recarrega furando o cache)
  void verificarVersao().then((r) => {
    if (r.estado === 'nova') avisar('NOVA VERSÃO NO AR. Abra as Opções e toque em atualizar.');
  });
  const persist = criarPersistencia(armazenamento, salvos, regras, () => avisar(MSG_NAO_SALVO));

  // ---- áudio: só ganha contexto depois do primeiro gesto (a cena de abertura chama iniciarAudio; desbloquearAudio cobre o iOS) ----
  // A identidade sonora e os temas por lutador estão SEMPRE ligados (decisão do dono); `chavesSonoras` é só rollback por código. `?escuta=1` abre o painel de escuta.
  const escuta = lerEscutaDaUrl(window.location.search);
  // `sementeVariacao` = semente + 6 (a variação dos sons por lutador; nunca o RNG da lógica nem o visual). O limitador do master (D-S6) acompanha as camadas novas:
  // é na soma da voz, dos efeitos e da música que o pico estoura.
  const audio = new AudioSys({ rng: criarRng(semente + 3), sementeVariacao: semente + 6, limitador: chavesSonoras.identidade || chavesSonoras.temas || escuta.painel });
  // As camadas (voz e assinatura dos especiais; temas) são pedaços à parte, baixados já no boot em paralelo com as fontes. O carregamento VALIDA os dados
  // (lutador sem voz/tema, ou fora do orçamento, derruba o boot, alto e cedo). No servidor de desenvolvimento carregam mesmo com a chave em `false`.
  const camadas = carregarCamadasSonoras({
    identidade: import.meta.env.DEV || chavesSonoras.identidade || escuta.painel,
    temas: import.meta.env.DEV || chavesSonoras.temas || escuta.painel,
    amostras: import.meta.env.DEV || chavesSonoras.amostras || escuta.painel,
  });
  if (escuta.painel) {
    // painel de escuta: não joga, só toca cada som e cada tema (src/ui/escuta.ts)
    await camadas;
    const { abrirEscuta } = await import('./ui/escuta');
    abrirEscuta({ audio, musica: persist.settings.music, sfx: persist.settings.sfx });
    return;
  }
  // iOS/WebKit: o AudioContext só destrava num gesto que ele reconhece (toque terminado, clique, tecla); o `touchstart` do canvas não conta
  desbloquearAudio(window, audio);

  // ---- entrada: tudo passa pelo navegador de cenas ----
  let nav: Navegador | null = null;
  const entrada = criarEntrada({
    alvo: window,
    canvas,
    aoTecla: (tecla) => {
      if (tecla === 'f' && nav?.name !== 'select') {
        alternarTelaCheia();
        return;
      }
      if (tecla === 'm') {
        audio.toggleMute();
        return;
      }
      nav?.key(tecla);
    },
    aoMouseMover: (x, y) => nav?.hover(x, y),
    aoMouseBaixo: (x, y) => nav?.click(x, y),
    aoToqueCanvas: (x, y) => nav?.toque(x, y),
  });

  const contexto: Contexto = {
    ctx,
    f: criarFerramentas(ctx),
    audio,
    persist,
    entrada,
    rngVisual,
    rngUI,
    sorteioDaSelecao: criarRng(semente + 4),
    sorteioDeFalas: criarRng(semente + 5),
    reduzirMovimento: reduzirMovimento(),
    regras,
    alternarTelaCheia,
    temToque: () => document.body.classList.contains('touch'),
  };
  // as fontes do canvas (Barlow, auto-hospedadas) ANTES do 1º quadro: sem isto o texto nasce na fonte de reserva e pisca ao trocar
  const [fontesOk] = await Promise.all([carregarFontes(), camadas]);
  document.documentElement.dataset['fontes'] = fontesOk ? 'ok' : 'reserva';
  const ui = new Navegador(contexto);
  nav = ui;
  ui.set('boot');
  observarFoco(window, { aoPerderFoco: () => ui.blur(), aoOcultar: () => ui.blur() });

  // ---- carregamento da arte (barra de progresso na abertura) ----
  // `?precarga=minima` (só em desenvolvimento) não carrega nenhum atlas no boot: tudo sob demanda, para testar essa via.
  const precarga = import.meta.env.DEV && new URLSearchParams(window.location.search).get('precarga') === 'minima' ? [] : undefined;
  void iniciarArte({ baseUrl: import.meta.env.BASE_URL, aoProgredir: (p) => (ui.loadProg = p), ...(precarga ? { precarregar: precarga } : {}) })
    .then(({ elenco, arte }) => {
      const lutadores = {} as Record<IdLutador, (typeof elenco)[IdLutador]['ch']>;
      for (const id of Object.keys(elenco) as IdLutador[]) lutadores[id] = elenco[id].ch;
      const mundo: Mundo = {
        rec: {
          elenco,
          cenarios: arte.cenarios,
          cenarioPadrao: arte.cenarios.get(CENARIO_PADRAO) as CanvasImageSource,
          vinheta: criarVinheta(),
        },
        elenco,
        arte,
        game: new Game({ lutadores, rng: rngLogica }),
        efeitos: new Efeitos(rngVisual),
        petalasLuta: new CampoDePetalas(rngVisual, 'luta'),
      };
      ui.pronto(mundo);
      document.documentElement.dataset['pronto'] = 'true';
    })
    .catch((e: unknown) => {
      console.error(e);
      ui.erroCarga = e instanceof Error ? e.message : String(e);
    });

  // ---- laço de passo fixo: 60 ticks de lógica por segundo, desenho a cada quadro ----
  const PASSO = 1000 / 60;
  const avancar = (ticks: number): void => {
    for (let i = 0; i < ticks; i++) {
      ui.update();
      entrada.fimDoTick();
    }
  };
  let ultimo = performance.now();
  let acc = 0;
  let avisou = false;
  const quadro = (agora: number): void => {
    acc += Math.min(agora - ultimo, 100);
    ultimo = agora;
    entrada.consultarGamepads();
    try {
      while (acc >= PASSO) {
        ui.update();
        entrada.fimDoTick();
        acc -= PASSO;
      }
      // alfa = a fração do próximo tick que já passou: a luta desenha entre o tick anterior e o atual (monitores de 90, 120, 144 Hz ficam lisos)
      ui.draw(acc / PASSO);
    } catch (e) {
      acc = 0;
      if (!avisou) {
        avisou = true;
        console.error(e);
      }
    }
    requestAnimationFrame(quadro);
  };

  // Ganchos de teste (só no servidor de desenvolvimento). `?manual=1` desliga o laço em tempo real:
  // o teste avança os ticks e desenha quando quiser, para comparar quadros com o protótipo.
  const manual = import.meta.env.DEV && new URLSearchParams(window.location.search).get('manual') === '1';
  if (import.meta.env.DEV) {
    Object.assign(window, {
      __inno: {
        entrada,
        ui,
        semente,
        persist,
        avancar,
        desenhar: (alfa?: number) => ui.draw(alfa),
        mundo: () => ui.m,
      },
    });
  }
  // fluidez do desenho da luta (interpolação, mola, tremor do rival, tecla H): ligada no tempo real; em `?manual=1` só com `&fluidez=1` (DEV)
  ui.fluidez = !manual || (import.meta.env.DEV && new URLSearchParams(window.location.search).get('fluidez') === '1');
  if (!manual) requestAnimationFrame(quadro);
}

iniciar().catch((e: unknown) => console.error(e));
