import type { IdLutador } from '../../core/contratos';
import { TICKS_POR_COMPASSO, type BatidaPedida, type IdPlano, type Plano, type QuadroChave, type RoteiroDoTrailer, type Titulo } from './tipos';

/*
 * O roteiro do trailer: 14 planos, 25 compassos, 2400 ticks a 150 BPM (docs/spec-trailer-abertura.md §3.1). Escrito à mão; a escalação
 * (`npm run trailer:escalar`) grava em `tomadas.ts` a tomada que cumpre os golpes pedidos aqui. Mexer em `pede`, nos lutadores ou no cenário de um plano de
 * luta exige reescalar (o teste de batidas diz qual plano).
 */

const C = TICKS_POR_COMPASSO;

/**
 * Aproximação até `pico` no tick `emT` (o ACERTO gravado na tomada): parada em 1,0, empurra em 34 ticks, segura `segura` ticks e SOLTA até 1,0
 * em `solta` ticks. Direção de arte (docs/direcao-arte-trailer.md §5): depois do acerto o rival voa e quem acertou salta; segurar o zoom ali
 * corta cabeças sob a faixa do letterbox (medido no jogo: AMINU, BAATAR e ZENON passavam de y 69). O pico mora no acerto, nunca depois dele.
 * `emT` = tick do acerto NA TOMADA (tomadas.ts), não o `alvo` pedido: se a escalação mudar a tomada, a câmera precisa acompanhar.
 */
function empurrar(pico: number, emT: number, segura = 18, solta = 30, foco: QuadroChave['foco'] = 'meio'): readonly QuadroChave[] {
  const fim = 2 * C - 1;
  const q: QuadroChave[] = [
    { t: 0, zoom: 1, foco },
    { t: Math.max(1, emT - 30), zoom: 1, foco, curva: 'saida' },
    { t: Math.min(fim - 2, emT + 4), zoom: pico, foco },
    { t: Math.min(fim - 1, emT + 4 + segura), zoom: pico, foco, curva: 'saida' },
  ];
  if (emT + 4 + segura + solta < fim) q.push({ t: emT + 4 + segura + solta, zoom: 1, foco });
  q.push({ t: fim, zoom: q.length === 5 ? 1 : pico, foco });
  return q;
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
      // o pico (1,25) chega no acerto (tick 96 da tomada, depois da tarja), não 14 ticks depois
      camera: [
        { t: 0, zoom: 1, foco: 'meio' },
        { t: 56, zoom: 1, foco: 'meio', curva: 'saida' },
        { t: 98, zoom: 1.25, foco: 'meio' },
        { t: 140, zoom: 1.25, foco: 'meio', curva: 'saida' },
        { t: 2 * C - 1, zoom: 1.04, foco: 'meio' },
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
      // corte seco no c7.1 (tick 96): fechado na MIN-JI -> aberto no CAIO. Só trocar o foco com o mesmo zoom não se vê (os dois estão perto:
      // medido, o quadro 95 e o 96 saíam iguais); o corte precisa mudar o enquadramento (1,22 -> 1,0) para existir.
      camera: [
        { t: 0, zoom: 1.04, foco: 'p1' },
        { t: 30, zoom: 1.04, foco: 'p1', curva: 'saida' },
        { t: 64, zoom: 1.22, foco: 'p1' },
        { t: 95, zoom: 1.22, foco: 'p1' },
        { t: 96, zoom: 1, foco: 'p2', curva: 'saida' },
        { t: 140, zoom: 1.18, foco: 'p2' },
        { t: 160, zoom: 1.18, foco: 'p2', curva: 'saida' },
        { t: 2 * C - 1, zoom: 1.02, foco: 'p2' },
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
      camera: empurrar(1.2, 50), // MASHI nível 3 acerta no tick 50 da tomada
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
      // a câmera acompanha o percurso do RESORTE: o foco fica na CENTELLA desde o 1º quadro (a troca meio -> p1 no tick 72 era um corte
      // que não se via: medido, o quadro 71 e o 72 saíam iguais)
      camera: [
        { t: 0, zoom: 1, foco: 'p1', curva: 'saida' },
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
      camera: empurrar(1.2, 141), // COUP D'ARRÊT no tick 141 da tomada
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
      camera: empurrar(1.15, 91), // especial da NILA no tick 91 da tomada
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
      // pico 1,15 (era 1,25) e solta logo: o MERGULHO acerta no tick 129 da tomada e o BAATAR salta de novo ~20 ticks depois. O ápice
      // desse salto (tick ~152) passa sob a faixa de cima MESMO a 1,0 (medido: topo em y 38); aceito, é saída de quadro em movimento. O
      // quadro do acerto fica inteiro na tela.
      camera: empurrar(1.15, 129, 4, 20),
      titulos: [placa('baatar')],
    },
    {
      id: 'P8',
      tipo: 'retratos',
      compassos: 2,
      // 8 retratos, 1 por tempo (2,5 cortes/s, o teto): o HAYATO fica de fora de propósito. Ele é quem "sobe ao topo" e reaparece no corte
      // seguinte, diante do Arconte (P9). Grade 4x2: 1ª fileira no c20, 2ª no c21, o BAATAR (o último selo) no último tempo antes do silêncio.
      ordem: ['wei-long', 'min-ji', 'caio', 'aminu', 'centella', 'camille', 'nila', 'baatar'],
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
      // teto 1,10 (era 1,30): o ZENON é o mais alto do elenco; acima de ~1,12 a cabeça entra na faixa de cima do letterbox (medido: topo
      // em y 45 a 1,21, com a faixa em 69). A grandeza vem da contraluz, dos braseiros e da câmera baixa, não do zoom.
      camera: [
        { t: 0, zoom: 1, foco: 'p2', curva: 'saida' },
        { t: 150, zoom: 1.06, foco: 'p2' },
        { t: 172, zoom: 1.1, foco: 'p2', curva: 'saida' },
        { t: 2 * C - 1, zoom: 1.1, foco: 'p2' },
      ],
    },
    { id: 'P10', tipo: 'logo', compassos: 2 },
  ] satisfies readonly Plano[],
  estatica: {
    quadros: [
      { lutadores: ['hayato'], stage: 'jp', titulo: 'dez-mestres' },
      { lutadores: ['hayato', 'wei-long'], stage: 'cn' },
      { lutadores: ['min-ji', 'caio'], stage: 'br', titulo: 'um-torneio' },
      // só cenários RESIDENTES (padrão, jp, cn, kr, br): 'mx' e 'gr' não ficam na memória e a estática não carrega nada (spec §6.3)
      { lutadores: [], retratos: ['aminu', 'centella', 'camille'], stage: 'kr', titulo: 'cinco-guardioes' },
      { lutadores: [], retratos: ['nila', 'baatar', 'zenon'], stage: 'cn', titulo: 'quem-chega-ao-topo' },
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
