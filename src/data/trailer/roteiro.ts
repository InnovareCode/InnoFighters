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
      // PARTITURA (partitura.ts): as batidas são as medidas no motor; `alvo` é o tick do PLANO (a lenta e a tarja já na conta), `folga` pequena de propósito: um rebalanceamento que
      // escorregue um contato apareça no CI. HAYATO pula a ZHEN DI do WEI (a LONG ZHANG é grande demais para pular: o salto passa no pico da caixa), acerta o chute no ar e fecha
      // o BÁSICO `↓SF › CFT › ↓ESP` (RAIO ÀS AVESSAS).
      pede: [
        batida({ tipo: 'golpe', lutador: 0, golpe: 'jhk', alvo: 49, folga: 4 }),
        batida({ tipo: 'golpe', lutador: 0, golpe: 'hk', alvo: 94, folga: 4 }),
        batida({ tipo: 'especial', lutador: 0, golpe: 'sDown', lenta: { fator: 3, ticks: 18 }, alvo: 105, folga: 4 }),
      ],
      // o pico (1,25) chega no RAIJIN-KEN (tick 105 do plano)
      camera: [
        { t: 0, zoom: 1, foco: 'meio' },
        { t: 70, zoom: 1, foco: 'meio', curva: 'saida' },
        { t: 105, zoom: 1.25, foco: 'meio' },
        { t: 135, zoom: 1.25, foco: 'meio', curva: 'saida' },
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
      // PARTITURA: a MIN-JI conta HANA-DUL-SET (lk, lk, hk) e o CAIO DEFENDE na ginga (segurar trás); no corte do tempo 1 do compasso 2 ele responde: defende a voadora e devolve a
      // rasteira. Um HANA-DUL-SET que derrubasse deixaria o CAIO no chão por ~90 ticks, e o corte para ele cairia num lutador deitado.
      pede: [
        batida({ tipo: 'block', lutador: 0, alvo: 47, folga: 4 }),
        batida({ tipo: 'block', lutador: 0, alvo: 66, folga: 4 }),
        batida({ tipo: 'block', lutador: 0, golpe: 'sFwd', alvo: 117, folga: 4 }),
        batida({ tipo: 'golpe', lutador: 1, golpe: 'hk', lenta: { fator: 2, ticks: 12 }, alvo: 171, folga: 4 }),
      ],
      // corte seco no c7.1 (tick 96): fechado na MIN-JI -> aberto no CAIO (o corte precisa mudar o enquadramento: 1,22 -> 1,0)
      camera: [
        { t: 0, zoom: 1.04, foco: 'p1' },
        { t: 30, zoom: 1.04, foco: 'p1', curva: 'saida' },
        { t: 66, zoom: 1.22, foco: 'p1' },
        { t: 95, zoom: 1.22, foco: 'p1' },
        { t: 96, zoom: 1, foco: 'p2', curva: 'saida' },
        { t: 171, zoom: 1.18, foco: 'p2' },
        { t: 183, zoom: 1.18, foco: 'p2', curva: 'saida' },
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
      // PARTITURA: o AMINU carrega a MASHI andando; o HAYATO testa o vazio, volta e se fecha; a MASHI nível 3 QUEBRA A GUARDA (alvo no tick 92 do plano)
      pede: [
        batida({ tipo: 'carga', lutador: 0, nivel: 3, lenta: { fator: 2, ticks: 12 }, alvo: 92, folga: 4 }),
        batida({ tipo: 'golpe', lutador: 0, golpe: 'hk', alvo: 147, folga: 4 }),
      ],
      camera: empurrar(1.2, 92),
      titulos: [placa('aminu')],
    },
    {
      id: 'P4',
      tipo: 'luta',
      compassos: 2,
      c1: 'centella',
      c2: 'caio',
      stage: 'mx',
      // PARTITURA: o CAIO joga a ONDA VERDE e a CENTELLA defende; ela recua até a corda e volta no RESORTE
      pede: [
        batida({ tipo: 'block', lutador: 1, golpe: 'sFire', alvo: 56, folga: 4 }),
        batida({ tipo: 'especial', lutador: 0, golpe: 'sFwd', alvo: 121, folga: 4 }),
      ],
      camera: [
        { t: 0, zoom: 1, foco: 'p1', curva: 'saida' },
        { t: 72, zoom: 1.1, foco: 'p1' },
        { t: 121, zoom: 1.2, foco: 'p1', curva: 'entrada' },
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
      // PARTITURA: a MIN-JI ataca com o soco forte e a CAMILLE a pega na preparação (COUP D'ARRÊT), prende o chute fraco e fecha no REVERS
      pede: [
        batida({ tipo: 'contra', lutador: 0, golpe: 'sDown', lenta: { fator: 2, ticks: 16 }, alvo: 36, folga: 4 }),
        batida({ tipo: 'golpe', lutador: 0, golpe: 'lk', alvo: 74, folga: 4 }),
        batida({ tipo: 'especial', lutador: 0, golpe: 'sFwd', alvo: 98, folga: 4 }),
      ],
      camera: empurrar(1.2, 36),
      titulos: [placa('camille')],
    },
    {
      id: 'P6',
      tipo: 'luta',
      compassos: 2,
      c1: 'nila',
      c2: 'wei-long',
      stage: 'in',
      // PARTITURA: a NILA defende o tremor agachada, passa por cima (GAJA), troca de postura (VADIVU) e fecha com o BOTE da SARPA
      pede: [
        batida({ tipo: 'block', lutador: 1, golpe: 'sDown', alvo: 18, folga: 4 }),
        batida({ tipo: 'golpe', lutador: 0, golpe: 'hp', alvo: 80, folga: 4 }),
        batida({ tipo: 'especial', lutador: 0, golpe: 'sFire', alvo: 95, folga: 4 }),
        batida({ tipo: 'especial', lutador: 0, golpe: 'sFire', alvo: 153, folga: 4 }),
      ],
      camera: empurrar(1.15, 95),
      titulos: [placa('nila')],
    },
    {
      id: 'P7',
      tipo: 'luta',
      compassos: 2,
      c1: 'baatar',
      c2: 'hayato',
      stage: 'mn',
      // PARTITURA: o soco forte do BAATAR atravessa o chute do HAYATO (armadura) e o ARREMESSO DO AVARGA bate o HAYATO no chão
      pede: [
        batida({ tipo: 'golpe', lutador: 0, golpe: 'hp', alvo: 51, folga: 4 }),
        batida({ tipo: 'especial', lutador: 0, golpe: 'sFire', alvo: 86, folga: 4 }),
      ],
      camera: empurrar(1.15, 86, 4, 20),
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
      // PARTITURA: o HAYATO entra com o BÁSICO e o ZENON defende tudo; o HAYATO sobe no RAIJIN-KEN, o anfitrião cobra a conta e fecha no SUPER (CORTESIA DA CASA): tarja de 30,
      // 5 acertos presos, o último mata (`filmeRestrito`: o filme só abre no KO) e o filme CURTO toca até o último quadro do plano. O HAYATO começa com a vida baixa (`vida`)
      // para o super matar. Alvos em ticks do PLANO (a tarja de 30 já na conta).
      pede: [
        batida({ tipo: 'block', lutador: 0, alvo: 9, folga: 4 }),
        batida({ tipo: 'block', lutador: 0, golpe: 'sDown', alvo: 22, folga: 4 }),
        batida({ tipo: 'golpe', lutador: 1, golpe: 'clp', alvo: 62, folga: 4 }),
        batida({ tipo: 'super', lutador: 1, alvo: 121, folga: 4 }),
        batida({ tipo: 'ko', lutador: 1, filme: 'curta', alvo: 161, folga: 4 }),
      ],
      // teto 1,10: o ZENON é o mais alto do elenco; acima de ~1,12 a cabeça entra na faixa de cima do letterbox (medido: topo em y 45 a 1,21, com a faixa em 69)
      camera: [
        { t: 0, zoom: 1, foco: 'p2', curva: 'saida' },
        { t: 90, zoom: 1.06, foco: 'p2' },
        { t: 120, zoom: 1.1, foco: 'p2', curva: 'saida' },
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
