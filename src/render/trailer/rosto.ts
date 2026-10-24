import type { LutadorRender } from '../../assets/elenco';
import type { Ferramentas } from '../../ui/ferramentas';
import { desenharRetrato } from '../retrato';
import type { Ctx } from '../tela';

/*
 * O rosto de um lutador NUNCA sai vazio no trailer. Os retratos são da etapa 1 do boot (chegam depois do `data-pronto`) e numa rede lenta, ou nos primeiros segundos de uma
 * 1ª visita, o cartão de reserva e os quadros estáticos os desenhariam como um quadrado de degradê sem nada dentro. Sem o retrato, a PLACA tipográfica: o mesmo degradê com as
 * iniciais grandes na cor do lutador (o nome já vem escrito abaixo/ao lado, como no cartão de reserva).
 */

/** As iniciais da placa: duas palavras ("WEI LONG" -> "WL"), ou as duas primeiras letras ("HAYATO" -> "HA"). */
export function iniciaisDe(nome: string): string {
  const palavras = nome.split(/[\s-]+/).filter(Boolean);
  if (palavras.length >= 2) return `${palavras[0]?.[0] ?? ''}${palavras[1]?.[0] ?? ''}`.toUpperCase();
  return (palavras[0] ?? '?').slice(0, 2).toUpperCase();
}

/** O retrato do lutador, ou a placa tipográfica se ele ainda não chegou. Devolve true se desenhou o retrato de verdade. */
export function desenharRostoOuPlaca(ctx: Ctx, f: Ferramentas, l: LutadorRender, x: number, y: number, lado: number, espelhar: boolean, fundo: readonly [string, string]): boolean {
  const rosto = l.arte.retrato(l.ch.head);
  desenharRetrato(ctx, rosto, x, y, lado, espelhar, fundo);
  if (rosto) return true;
  ctx.save();
  ctx.beginPath();
  ctx.rect(x, y, lado, lado);
  ctx.clip();
  // uma faixa na cor do lutador na base e as iniciais grandes: legível mesmo a 150 px
  ctx.globalAlpha = 0.85;
  ctx.fillStyle = l.ch.fire[0];
  ctx.fillRect(x, y + lado - lado * 0.12, lado, lado * 0.12);
  ctx.restore();
  f.A(iniciaisDe(l.ch.name), x + lado / 2, y + lado * 0.64, Math.round(lado * 0.46), ['#ffffff', l.ch.fire[0]], '#000');
  return false;
}
