import type { IdLutador } from '../../core/contratos';
import type { AssinaturaEspecial, PerfilVocal } from './tipos';

/*
 * CALIBRAÇÃO DE VOLUME dos sons por lutador (docs/spec-sons-por-lutador.md §6.3): ganho em dB que põe o RMS (região ativa, AudioSys real sobre o motor
 * offline de teste) de cada som novo a 1 dB abaixo do som genérico que ele substitui (a margem deixa 2 dB para o pico baixar sem sair de ±3 dB):
 * grito + conjuração x special(p), dano leve x hurt(p), KO (voz + gongo) x ko(p), guarda quebrada (voz + vidro) x fireballHit(), lançamento x
 * fireballLaunch(), impacto de projétil x fireballHit(); a estampa que se soma ao punch/kick fica 6 dB abaixo do punch; o dano pesado fica 3 dB acima
 * do leve. O pico no barramento de efeitos fica <= 0,68 sempre que isso custa no máximo 1,0 dB (o RMS manda; o que ainda passa do teto está listado em sons-volume.test.ts).
 * Gerado por `SONS_DIAG=1 npx vitest run tests/unit/sons-calibra-diag.test.ts --silent=false` e conferido por tests/unit/sons-volume.test.ts. Mudou um grito,
 * uma assinatura ou a síntese de voz: rode a ferramenta de novo e cole aqui.
 */
type GanhoPerfil = NonNullable<PerfilVocal['ganhoDb']>;
type GanhoAssinatura = NonNullable<AssinaturaEspecial['ganhoDb']>;

export const CALIBRACAO_PERFIL: Readonly<Record<IdLutador, GanhoPerfil>> = {
  hayato: { kiai: -2.8, leve: -8.3, pesado: -3.7, guarda: -6, ko: -0.8, vitoria: -2.8, esforco: -8.3 },
  'wei-long': { kiai: -5.3, leve: -9, pesado: -7.7, guarda: -9, ko: -0.9, vitoria: -5.3, esforco: -9 },
  'min-ji': { kiai: -4.6, leve: -6.3, pesado: -10, guarda: -8.7, ko: -0.1, vitoria: -4.6, esforco: -6.3 },
  caio: { kiai: -5.8, leve: -6.5, pesado: -4.6, guarda: -7.7, ko: -0.7, vitoria: -5.8, esforco: -6.5 },
  aminu: { kiai: -7.3, leve: -8.1, pesado: -5, guarda: -9.5, ko: -0.6, vitoria: -7.3, esforco: -8.1 },
  centella: { kiai: -4.2, leve: -8.1, pesado: -4.9, guarda: -8.2, ko: -2.3, vitoria: -4.2, esforco: -8.1 },
  camille: { kiai: -0.6, leve: -8, pesado: -4.7, guarda: -6.8, ko: 2.4, vitoria: -0.6, esforco: -8 },
  nila: { kiai: -3.5, leve: -5.5, pesado: -2.2, guarda: -4.5, ko: 0.3, vitoria: -3.5, esforco: -5.5 },
  baatar: { kiai: -3.3, leve: -7, pesado: -5.7, guarda: -5.4, ko: -0.8, vitoria: -3.3, esforco: -7 },
  zenon: { kiai: -4.5, leve: -5.6, pesado: -3.8, guarda: -6.4, ko: -1.9, vitoria: -4.5, esforco: -5.6 },
};

export const CALIBRACAO_ASSINATURA: Readonly<Record<string, GanhoAssinatura>> = {
  'hayato.base.sFire': { inicio: 1, lancamento: 2.2, estampa: -1.1 },
  'hayato.base.sDown': { inicio: 1, estampa: -5.8 },
  'hayato.base.sFwd': { inicio: -1.1, estampa: 1.8 },
  'wei-long.base.sFire': { lancamento: -4.1, estampa: -3.4 },
  'wei-long.base.sDown': { inicio: -1.7, lancamento: -4.7, estampa: -3.6 },
  'wei-long.base.sFwd': { inicio: 2, estampa: -8.2 },
  'min-ji.base.sFire': { lancamento: 6.8, estampa: 1.9 },
  'min-ji.base.sDown': { inicio: 1.4, estampa: 8.4 },
  'min-ji.base.sFwd': { estampa: -5.3 },
  'caio.base.sFire': { lancamento: -0.8, estampa: 0.4 },
  'caio.base.sDown': { inicio: 0.3, estampa: 2.3 },
  'caio.base.sFwd': { estampa: -5.8 },
  'aminu.base.sFire': { estampa: -4.5 },
  'aminu.base.sFwd': { estampa: -4.2 },
  'centella.base.sFire': { inicio: 2.2, estampa: -2.4 },
  'centella.base.sDown': { estampa: 4.5 },
  'centella.base.sFwd': { estampa: -5.7 },
  'camille.base.sDown': { inicio: 0.3, estampa: -5.8 },
  'camille.base.sFwd': { inicio: -1.1, estampa: 8.4 },
  'nila.base.sFire': { inicio: -2.4, estampa: 0.6 },
  'nila.base.sFwd': { inicio: 1, estampa: -5.8 },
  'nila.sarpa.sFire': { inicio: 1, estampa: 4.3 },
  'nila.sarpa.sFwd': { inicio: 0, estampa: -1.8 },
  'baatar.base.sFire': { inicio: 0.5, estampa: -6.5 },
  'baatar.base.sDown': { estampa: -4 },
  'baatar.base.sFwd': { inicio: 0.7, estampa: -9.4 },
  'zenon.base.sFire': { inicio: 0.7, lancamento: 9.5, estampa: -2.2 },
  'zenon.base.sDown': { inicio: 0.5, estampa: -7 },
  'zenon.base.sFwd': { estampa: -8.2 },
  'zenon.chefe2.sFire': { inicio: 0.4, lancamento: 5.2, estampa: -2.2 },
  'zenon.chefe2.sFwd': { estampa: -8.3 },
};
