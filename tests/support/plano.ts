/*
 * Renderiza o que um EVENTO toca de verdade no AudioSys real (plano sonoro -> tocarItem), com a identidade LIGADA e dados reais (ou os passados).
 * Serve para a regra de volume (6.3) e o pico por plano.
 */
import { AudioSys } from '../../src/audio/audio-sys';
import { planoSonoro, tocarItem, type ContextoSonoro } from '../../src/audio/identidade-sonora';
import type { EventoLuta } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { DADOS_SONS, type DadosSons } from '../../src/data/sons';
import { Contexto, comoAudioContext } from './audio-offline';
import { descrever, TAXA, type Descritores } from './descritores';

export interface Rendido {
  readonly d: Descritores;
  readonly amostras: Float32Array;
}

/** Só os itens `tocar` do plano (o que a identidade ACRESCENTA ou TROCA), sem o que `manter`. Sem atraso: tudo no tempo 0. */
export function renderPlano(ev: EventoLuta, ctx: ContextoSonoro, dados: DadosSons = DADOS_SONS, filtro: 'tudo' | 'so-voz' | 'sem-voz' = 'tudo', sfxVol = 1): Rendido {
  const c = new Contexto(TAXA);
  const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5) });
  audio.init();
  audio.setSfxVol(sfxVol);
  const plano = planoSonoro(ev, ctx, dados);
  for (const item of plano.tocar) {
    const voz = item.garganta !== undefined;
    if ((filtro === 'so-voz' && !voz) || (filtro === 'sem-voz' && voz)) continue;
    tocarItem(audio as never, item);
  }
  const amostras = c.renderizar();
  return { amostras, d: descrever(amostras) };
}

/** O que `sonsDoEvento` tocava (o som genérico), chamado pelo nome, para comparar volume. */
export function renderGenerico(tocar: (a: AudioSys) => void, sfxVol = 1): Rendido {
  const c = new Contexto(TAXA);
  const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5) });
  audio.init();
  audio.setSfxVol(sfxVol);
  tocar(audio);
  const amostras = c.renderizar();
  return { amostras, d: descrever(amostras) };
}

/** Pico no barramento de efeitos (antes do master de 0,9). */
export const picoNoBarramento = (r: Rendido): number => r.d.picoAbs / 0.9;
