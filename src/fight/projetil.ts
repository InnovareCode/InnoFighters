import type { IndiceLutador, ProjetilLeitura } from '../core/contratos';
import type { ProjetilDef } from '../data/tipos';
import type { Fighter } from './fighter';

/**
 * Projétil em voo (item de Game.projectiles). É um ProjetilLeitura (o que render lê) mais o
 * que só a lógica usa: dono como referência, definição (`spec`), vida restante e se derruba.
 */
export type ProjetilLuta = ProjetilLeitura & {
  dono: IndiceLutador;
  owner: Fighter;
  spec: ProjetilDef;
  life: number;
  /** Aceleração contrária (bumerangue); 0 = nenhuma. */
  acc: number;
  /** Derruba ao acertar (kdLast: só o último tiro). */
  kd: boolean;
  /** V1: chave do golpe que o lançou (`sFire`...). `especial` (herdado de ProjetilLeitura) só existe quando o golpe é de ESPECIAL. */
  golpe: string;
};
