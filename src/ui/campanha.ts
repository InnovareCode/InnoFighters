import { cfgMotorV2, cfgRitmo, type Etapa, type Regras } from '../meta';
import type { CampanhaArcade, ConfigPartidaUI } from './tipos';

/** Configuração de partida da etapa `run.idx` do ARCADE (a 1ª não mantém pontuação; as seguintes sim). */
export function cfgDaEtapa(run: CampanhaArcade, manterPontos: boolean, regras: Pick<Regras, 'esquiva' | 'motorV2' | 'ritmo'>): ConfigPartidaUI {
  const e = run.etapas[run.idx] as Etapa;
  return {
    mode: 'arcade',
    c1: run.c1,
    c2: e.id,
    cpu: run.diff,
    esquiva: regras.esquiva,
    ...cfgMotorV2(regras),
    ...cfgRitmo(regras),
    ...(manterPontos ? { keepScore: true } : {}),
    ...(e.chefe ? { chefe: true } : {}),
  };
}

/** A etapa atual é a luta de chefe? */
export const etapaEhChefe = (run: CampanhaArcade): boolean => run.etapas[run.idx]?.chefe === true;
