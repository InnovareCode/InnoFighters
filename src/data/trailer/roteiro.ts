import type { IdLutador } from '../../core/contratos';
import { TICKS_POR_COMPASSO, type BatidaPedida, type IdPlano, type Plano, type QuadroChave, type RoteiroDoTrailer, type Titulo } from './tipos';

/*
 * O roteiro do trailer: 14 planos, 25 compassos, 2400 ticks a 150 BPM (docs/spec-trailer-abertura.md §3.1). Escrito à mão; a escalação
 * (`npm run trailer:escalar`) grava em `tomadas.ts` a tomada que cumpre os golpes pedidos aqui. Mexer em `pede`, nos lutadores ou no cenário de um plano de
 * luta exige reescalar (o teste de batidas diz qual plano).
 */

const C = TICKS_POR_COMPASSO;

/** Aproximação até `pico` no tick `emT` (o acerto): fica parada em 1,0, empurra, segura e relaxa. */
function empurrar(pico: number, emT: number, foco: QuadroChave['foco'] = 'meio'): readonly QuadroChave[] {
  return [
    { t: 0, zoom: 1, foco, curva: 'entrada' },
    { t: Math.max(1, emT - 36), zoom: 1, foco, curva: 'saida' },
    { t: emT + 6, zoom: pico, foco },
    { t: emT + 56, zoom: pico, foco, curva: 'entrada' },
    { t: 2 * C - 1, zoom: 1.04, foco },
  ];
}

const placa = (lutador: IdLutador): Titulo => ({ estilo: 'placa', lutador, de: 12, ate: 96 });
const cartao = (chave: Extract<Titulo, { estilo: 'cartao' }>['chave'], de: number, ate: number): Titulo => ({ estilo: 'cartao', chave, de, ate });

const batida = (b: BatidaPedida): BatidaPedida => b;

export const ROTEIRO: RoteiroDoTrailer = {
  bpm: 150,
  ticksPorTempo: 24,
  sementeVisual: 7021417,
  planos: [
    {
      id: 'P0',
      tipo: 'frio',
      compassos: 2,
      lutador: 'hayato',
      stage: 'jp',
      camera: [
        { t: 0, zoom: 1, foco: 'meio' },
        { t: 2 * C - 1, zoom: 1.12, foco: 'meio' },
      ],
      titulos: [cartao('dez-mestres', C, 2 * C - 12)],
    },
    {
      id: 'P1',
      tipo: 'luta',
      compassos: 2,
      c1: 'hayato',
      c2: 'wei-long',
      stage: 'cn',
      pede: [batida({ tipo: 'especial', lutador: 0, cine: 'curta', lenta: { fator: 3, ticks: 18 }, alvo: 96, folga: 48 })],
      camera: [
        { t: 0, zoom: 1, foco: 'meio' },
        { t: 60, zoom: 1, foco: 'meio', curva: 'saida' },
        { t: 110, zoom: 1.25, foco: 'meio' },
        { t: 160, zoom: 1.25, foco: 'meio', curva: 'entrada' },
        { t: 2 * C - 1, zoom: 1.05, foco: 'meio' },
      ],
    },
    { id: 'C1', tipo: 'cartao', compassos: 1, fundo: 'kr', titulos: [cartao('dez-nacoes', 0, 80)] },
    {
      id: 'P2',
      tipo: 'luta',
      compassos: 2,
      c1: 'min-ji',
      c2: 'caio',
      stage: 'br',
      pede: [
        batida({ tipo: 'especial', lutador: 0, lenta: { fator: 2, ticks: 12 }, alvo: 60, folga: 36 }),
        batida({ tipo: 'especial', lutador: 1, lenta: { fator: 2, ticks: 12 }, alvo: 140, folga: 36 }),
      ],
      // corte seco no c7.1 (tick 96): a câmera troca o foco do P1 para o P2
      camera: [
        { t: 0, zoom: 1.05, foco: 'p1' },
        { t: 95, zoom: 1.18, foco: 'p1' },
        { t: 96, zoom: 1.18, foco: 'p2' },
        { t: 2 * C - 1, zoom: 1.05, foco: 'p2' },
      ],
    },
    { id: 'C2', tipo: 'cartao', compassos: 1, fundo: 'cn', titulos: [cartao('um-torneio', 0, 80)] },
    {
      id: 'P3',
      tipo: 'luta',
      compassos: 2,
      c1: 'aminu',
      c2: 'hayato',
      stage: 'ng',
      pede: [batida({ tipo: 'carga', lutador: 0, nivel: 3, lenta: { fator: 2, ticks: 12 }, alvo: 96, folga: 60 })],
      camera: empurrar(1.22, 96),
      titulos: [placa('aminu')],
    },
    {
      id: 'P4',
      tipo: 'luta',
      compassos: 2,
      c1: 'centella',
      c2: 'caio',
      stage: 'mx',
      pede: [batida({ tipo: 'especial', lutador: 0, golpe: 'sFwd', alvo: 110, folga: 60 })],
      // a câmera acompanha o percurso do RESORTE: o foco fica na CENTELLA
      camera: [
        { t: 0, zoom: 1, foco: 'meio', curva: 'saida' },
        { t: 72, zoom: 1.1, foco: 'p1' },
        { t: 140, zoom: 1.2, foco: 'p1', curva: 'entrada' },
        { t: 2 * C - 1, zoom: 1.04, foco: 'p1' },
      ],
      titulos: [placa('centella')],
    },
    { id: 'C3', tipo: 'cartao', compassos: 1, fundo: 'preto', titulos: [cartao('cinco-guardioes', 0, 80)] },
    {
      id: 'P5',
      tipo: 'luta',
      compassos: 2,
      c1: 'camille',
      c2: 'min-ji',
      stage: 'fr',
      pede: [batida({ tipo: 'contra', lutador: 0, golpe: 'sDown', lenta: { fator: 2, ticks: 16 }, alvo: 96, folga: 60 })],
      camera: empurrar(1.2, 96),
      titulos: [placa('camille')],
    },
    {
      id: 'P6',
      tipo: 'luta',
      compassos: 2,
      c1: 'nila',
      c2: 'wei-long',
      stage: 'in',
      pede: [batida({ tipo: 'especial', lutador: 0, alvo: 96, folga: 60 })],
      camera: empurrar(1.15, 96),
      titulos: [placa('nila')],
    },
    {
      id: 'P7',
      tipo: 'luta',
      compassos: 2,
      c1: 'baatar',
      c2: 'hayato',
      stage: 'mn',
      pede: [batida({ tipo: 'especial', lutador: 0, golpe: 'sFwd', alvo: 100, folga: 60 })],
      camera: empurrar(1.25, 100),
      titulos: [placa('baatar')],
    },
    {
      id: 'P8',
      tipo: 'retratos',
      compassos: 2,
      ordem: ['hayato', 'wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar'],
      titulos: [cartao('quem-chega-ao-topo', C, 2 * C - 12)],
    },
    {
      id: 'P9',
      tipo: 'arconte',
      compassos: 2,
      c1: 'hayato',
      c2: 'zenon',
      stage: 'gr',
      pede: [batida({ tipo: 'especial', lutador: 1, lenta: { fator: 3, ticks: 18 }, alvo: 172, folga: 16 })],
      camera: [
        { t: 0, zoom: 1, foco: 'p2', curva: 'saida' },
        { t: 156, zoom: 1.2, foco: 'p2' },
        { t: 2 * C - 1, zoom: 1.3, foco: 'p2' },
      ],
    },
    { id: 'P10', tipo: 'logo', compassos: 2 },
  ] satisfies readonly Plano[],
  estatica: {
    quadros: [
      { lutadores: ['hayato'], stage: 'jp', titulo: 'dez-mestres' },
      { lutadores: ['hayato', 'wei-long'], stage: 'cn' },
      { lutadores: ['min-ji', 'caio'], stage: 'br', titulo: 'um-torneio' },
      { lutadores: [], retratos: ['aminu', 'centella', 'camille'], stage: 'mx', titulo: 'cinco-guardioes' },
      { lutadores: [], retratos: ['nila', 'baatar', 'zenon'], stage: 'gr', titulo: 'quem-chega-ao-topo' },
      { lutadores: [], stage: 'jp', logo: true },
    ],
    ticksPorQuadro: C,
    dissolucao: 18,
    compassosDaMusica: [0, 1, 7, 12, 20, 23],
  },
};

/**
 * Em qual plano cada lutador é o DESTAQUE (a placa e a citação do tema dele na música). `Record<IdLutador, IdPlano>`: um lutador novo sem plano NÃO COMPILA.
 * A validação confere que o lutador está em campo no plano indicado.
 */
export const DESTAQUE: Readonly<Record<IdLutador, IdPlano>> = {
  hayato: 'P1',
  'wei-long': 'P1',
  'min-ji': 'P2',
  caio: 'P2',
  aminu: 'P3',
  centella: 'P4',
  camille: 'P5',
  nila: 'P6',
  baatar: 'P7',
  zenon: 'P9',
};
