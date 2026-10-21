/*
 * Ajudantes das medições de EFEITO (spec §7.2: R2, R2b, R3): as assinaturas dos especiais SEM a voz, com o tom real e sem P.
 */
import { tocarReceita, type ChamadaReceita } from '../../src/audio/receitas';
import { ASSINATURAS, type AssinaturaEspecial, type Chamada } from '../../src/data/sons';
import { descrever, type Descritores } from './descritores';
import { renderizar } from './render-som';

/** Onde começa a "estampa" na receita composta da assinatura (a conjuração vem antes, sozinha). */
export const DESLOCAMENTO_ESTAMPA = 0.45;

const desloca = (cs: readonly Chamada[], q: number): ChamadaReceita[] => cs.map((c) => ({ ...c, quando: (c.quando ?? 0) + q }) as ChamadaReceita);

/** Conjuração + (estampa, sucesso e resposta, 0,45 s depois): o que a assinatura toca, sem o grito do lutador. */
export function receitaSemVoz(a: AssinaturaEspecial): ChamadaReceita[] {
  return [...desloca(a.conjuracao, 0), ...desloca([...a.estampa, ...(a.sucesso?.chamadas ?? []), ...(a.resposta?.estampa ?? [])], DESLOCAMENTO_ESTAMPA)];
}

export function descreverReceita(r: readonly ChamadaReceita[]): Descritores {
  return descrever(renderizar((a) => void tocarReceita(a, r)).amostras);
}

export const chavesDeAssinaturas = (): string[] => Object.keys(ASSINATURAS);
export const lutadorDaChave = (chave: string): string => chave.split('.')[0] as string;
