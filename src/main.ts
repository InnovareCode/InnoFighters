import './input/toque.css';
import { ALTURA, LARGURA } from './core/constantes';
import { criarEntrada } from './input/entrada';
import { ajustarEscala } from './platform/escala';
import { mostrarErrosNaTela } from './platform/erros';
import { alternarTelaCheia } from './platform/tela-cheia';
import { prepararCanvas, usarEspacoLogico } from './render/tela';

function iniciar(): void {
  const canvas = document.getElementById('jogo');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #jogo nao encontrado');
  const ctx = prepararCanvas(canvas);

  mostrarErrosNaTela(window);
  ajustarEscala(canvas);
  window.addEventListener('resize', () => ajustarEscala(canvas));

  // Atalhos globais. As cenas (ui/, Fase 1b) assumem o resto: UI.key, mudo (M) etc.
  // A tela cheia (F) fica bloqueada na seleção de personagem no protótipo; isso entra com as cenas.
  const entrada = criarEntrada({
    alvo: window,
    canvas,
    aoTecla: (tecla) => {
      if (tecla === 'f') alternarTelaCheia();
    },
  });

  // Placeholder da Fase 0: so prova que o canvas 960x540 sobe. O jogo entra na F1.
  usarEspacoLogico(ctx);
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('InnoFighters', LARGURA / 2, ALTURA / 2);

  // Gancho de teste (só no servidor de desenvolvimento): o e2e lê o InputFrame real.
  if (import.meta.env.DEV) Object.assign(window, { __inno: { entrada } });

  document.documentElement.dataset['pronto'] = 'true';
}

iniciar();
