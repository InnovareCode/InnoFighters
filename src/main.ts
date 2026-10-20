import { ALTURA, LARGURA } from './core/constantes';
import { ajustarEscala } from './platform/escala';

function iniciar(): void {
  const canvas = document.getElementById('jogo');
  if (!(canvas instanceof HTMLCanvasElement)) throw new Error('canvas #jogo nao encontrado');
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('contexto 2D indisponivel');

  ajustarEscala(canvas);
  window.addEventListener('resize', () => ajustarEscala(canvas));

  // Placeholder da Fase 0: so prova que o canvas 960x540 sobe. O jogo entra na F1.
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(0, 0, LARGURA, ALTURA);
  ctx.fillStyle = '#e94560';
  ctx.font = 'bold 48px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('InnoFighters', LARGURA / 2, ALTURA / 2);
  document.documentElement.dataset['pronto'] = 'true';
}

iniciar();
