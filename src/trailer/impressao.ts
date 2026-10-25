import type { LeituraLuta } from '../core/contratos';
import type { QuadroDoTrailer } from './diretor';

/*
 * Impressões digitais (hash) do estado: servem ao CI (a tomada gravada ainda produz a mesma luta?) e ao teste de determinismo (dois diretores, os mesmos
 * 2400 quadros). FNV-1a de 32 bits sobre um texto estável: números com 3 casas, para que a mesma conta dê o mesmo texto em qualquer máquina.
 */

/** FNV-1a de 32 bits em hexadecimal (8 dígitos). Estável e sem dependência. */
export function hashDeTexto(texto: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < texto.length; i++) {
    h ^= texto.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

const n = (x: number): string => x.toFixed(3);

/** O estado do motor que decide o que se vê: lutadores, projéteis, câmera, fase e relógio. */
export function impressaoDoEstado(g: LeituraLuta): string {
  const partes: string[] = [g.phase, String(g.round), String(g.tick), String(g.t), n(g.timer), n(g.shake), String(g.hitstop), n(g.cam.x), n(g.cam.z)];
  for (const f of g.fighters) {
    partes.push(f.id, n(f.x), n(f.y), String(f.facing), f.state, f.move ?? '-', String(f.mt), n(f.hp), n(f.en), String(f.barras), String(f.flash), n(f.invuln), f.pose.name, String(f.nivelCarga), String(f.combo.hits));
  }
  for (const p of g.projectiles) partes.push(String(p.id), n(p.x), n(p.y), n(p.vx), String(p.frame));
  return hashDeTexto(partes.join('|'));
}

/**
 * A impressão de um QUADRO do trailer inteiro (o que o diretor decide: plano, câmera, letterbox, flash, títulos, tarja e o estado do motor). Dois diretores com
 * o mesmo roteiro e as mesmas tomadas dão a mesma sequência de 2400 impressões (teste de determinismo).
 */
export function impressaoDoQuadro(q: QuadroDoTrailer): string {
  const partes: string[] = [
    String(q.tick),
    q.plano.id,
    String(q.tickNoPlano),
    String(q.compasso),
    String(q.tempo),
    q.motorAndou ? '1' : '0',
    String(q.lenta),
    q.zoom.fator.toFixed(4),
    q.zoom.x.toFixed(2),
    q.letterbox.toFixed(4),
    q.flash.toFixed(4),
    q.titulos.map((t) => `${t.estilo}:${t.texto}:${t.alfa.toFixed(3)}`).join(','),
    q.cine ? `${q.cine.modo}:${q.cine.ev.tipo}` : '-',
    q.tarjaSuper ? 'S' : '-',
    q.arconte ? `${q.arconte.acesos}:${q.arconte.entrada ? 1 : 0}:${q.arconte.tickDaEntrada}:${JSON.stringify(q.arconte.poses)}` : '-',
    q.frio ? `${q.frio.pose}:${q.frio.raio.toFixed(3)}` : '-',
    q.retratos ? `${q.retratos.entraram}:${q.retratos.risco.toFixed(3)}` : '-',
    q.logo ? `${q.logo.t}:${q.logo.prompt ? 1 : 0}` : '-',
    q.reserva ? 'R' : '-',
    q.eventos.map((e) => e.tipo).join(','),
    q.luta ? impressaoDoEstado(q.luta) : '-',
  ];
  return hashDeTexto(partes.join('|'));
}
