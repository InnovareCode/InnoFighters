/*
 * O pedaço LAZY do trailer (spec §5.2): diretor, plano de carga, relógio, versão estática e os dados do roteiro. A cena (`CenaTrailer`, Lyra) importa daqui com
 * `import()` quando `ui.ready` fica true; o pacote principal só ganha a casca. Importar `../data/trailer` valida o roteiro e as tomadas (lança se inválido).
 */
export { DiretorDoTrailer, type DependenciasDoDiretor, type QuadroDoTrailer, type TituloVisivel } from './diretor';
export { duracaoDaEstatica, quadroEstaticoNoTick, type QuadroEstaticoNoTick } from './estatica';
export { entradaDaMusica, MAX_TICKS_POR_CHAMADA, tickAlvoDoAudio, ticksAAvancar } from './relogio';
export { planoDeCarga, pedidosNoPlano, residentesNoPlano, MAX_NAO_FIXOS, PESADOS, type PedidoDeCarga } from './carga';
export { impressaoDoEstado, impressaoDoQuadro } from './impressao';
export { arranjoDaAbertura, arranjoDaEstatica, citacoesDoRoteiro, janelasDeCitacao } from './musica';
export type { Marca } from './marca';
export * from '../data/trailer';
