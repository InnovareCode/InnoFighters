import './input/toque.css';
import './platform/aviso.css';
import { iniciarArte } from './assets/elenco';
import { AudioSys } from './audio/audio-sys';
import { carregarDadosV2, type ArmazenamentoLike } from './core/storage';
import type { IdLutador } from './core/contratos';
import { criarRng, sementeAleatoria } from './core/rng';
import { CENARIO_PADRAO } from './data/cenarios';
import { Game } from './fight/game';
import { REGRAS_PADRAO } from './meta';
import { criarEntrada } from './input/entrada';
import { ajustarEscala } from './platform/escala';
import { mostrarErrosNaTela } from './platform/erros';
import { observarFoco } from './platform/foco';
import { criarAviso } from './platform/aviso';
import { alternarTelaCheia } from './platform/tela-cheia';
import { criarVinheta } from './render/cenario';
import { CampoDePetalas, Efeitos } from './render/efeitos';
import { prepararCanvas } from './render/tela';
import type { Contexto, Mundo } from './ui/contexto';
import { criarFerramentas } from './ui/ferramentas';
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

async function iniciar(): Promise<void> {
  const canvas = document.getElementById('jogo');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #jogo nao encontrado');
  const ctx = prepararCanvas(canvas);
  mostrarErrosNaTela(window);
  ajustarEscala(canvas);
  window.addEventListener('resize', () => ajustarEscala(canvas));

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
  const persist = criarPersistencia(armazenamento, salvos, regras, () => avisar(MSG_NAO_SALVO));

  // ---- áudio: só ganha contexto depois do primeiro gesto (a cena de abertura chama iniciarAudio) ----
  const audio = new AudioSys({ rng: criarRng(semente + 3) });

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
    regras,
    alternarTelaCheia,
    temToque: () => document.body.classList.contains('touch'),
  };
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
      ui.draw();
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
        desenhar: () => ui.draw(),
        mundo: () => ui.m,
      },
    });
  }
  if (!manual) requestAnimationFrame(quadro);
}

iniciar().catch((e: unknown) => console.error(e));
