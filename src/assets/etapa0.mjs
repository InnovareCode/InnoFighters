/*
 * ETAPA 0 do boot (docs/orcamentos-2026-10-23.md §2.2, T4): o que o jogador espera para ver a tela de "CLIQUE OU PRESSIONE UMA TECLA" (`data-pronto`). Meta 4: <= 1,5 MiB
 * pela rede (a conta está em tests/e2e-build/boot-peso.spec.ts).
 *
 * UM módulo manda nisto, e dois lados o leem (contrato T4/T7):
 *  - o BOOT (`iniciarArte`, `iniciarMarca`, o carregador) monta as URLs a partir daqui: os manifestos dos 10 atlas e os três arquivos da marca;
 *  - o BUILD (`vite.config.ts`) passa `arquivosDaEtapa0(dist)` ao `extras` de `gerarManifesto`, e o service worker baixa tudo isto no `install`.
 * Assim a lista do boot e a do SW não divergem: arquivo da etapa 0 que o build não gera derruba o build; um teste (tests/unit/etapa0.test.ts) confere o resto.
 *
 * É .mjs de propósito (Node puro, sem DOM, sem `import.meta.env`, sem importar TS): o vite.config.ts o importa em Node como faz com ferramentas/sw/manifesto.mjs, e o
 * Vite avisa quando a config importa .ts sem extensão. Os lutadores saem do próprio dist (cada `assets/lutadores/<id>/atlas.json`), então lutador novo entra sozinho.
 * Caminhos relativos à BASE do site (sem barra inicial), como as chaves de `revisoes` do manifesto do SW.
 */

/** Pasta (sob a base) dos arquivos da marca. */
export const PASTA_DA_MARCA = 'assets/ui/logo/';

/**
 * Os arquivos da marca (versão no nome: uma logo nova do dono vira `-v2`). O splash é a 1ª coisa que o jogo desenha; a logo completa e a horizontal entram no título e no
 * menu, mas baixam junto (326 KiB) para a abertura nunca aparecer sem elas. Quem os desenha é `src/ui/logo.ts`.
 */
export const ARQUIVOS_DA_MARCA = {
  splash: 'splash-v1-1920x1080.webp',
  principal: 'logo-v1-1600.webp',
  horizontal: 'logo-horizontal-v1-600.webp',
};

/** As faces do canvas (declaradas em src/fontes.css e pré-carregadas no index.html; um teste confere os três lados). */
export const ARQUIVOS_DAS_FONTES = [
  'assets/fontes/barlow-condensed-800-italic-latin.woff2',
  'assets/fontes/barlow-600-latin.woff2',
  'assets/fontes/bangers-latin-400-normal.woff2',
];

/** O manifesto do pacote de amostras de som (baixado e validado no boot; as folhas `.mp3` NÃO são da etapa 0: ficam para o primeiro gesto e a VS). */
export const MANIFESTO_DE_SONS = 'assets/sons/manifesto.json';

/** O fundo dos menus (`CENARIOS[CENARIO_PADRAO].arquivo` em src/data/cenarios.ts; um teste confere). */
export const CENARIO_PADRAO_DA_ETAPA0 = 'assets/cenarios/cenario-jp.webp';

/**
 * Pedaços de JS (por nome, sem o hash) que o boot importa antes da 1ª cena: as camadas sonoras (`carregarCamadasSonoras`) e o que elas puxam. O pedaço do trailer NÃO
 * está aqui: baixa DEPOIS do `data-pronto` (etapa 1).
 */
export const PEDACOS_DA_ETAPA0 = ['identidade-sonora', 'partitura', 'amostras', 'temas'];

/** `atlas.json` do lutador (poucos KB): a etapa 0 lê os dez para montar todos os `LutadorMontado`; as imagens vêm depois. */
export const caminhoDoManifestoDoLutador = (id) => `assets/lutadores/${id}/atlas.json`;

/** Os arquivos FIXOS da etapa 0 para os `ids` dados (menos os pedaços de JS, que têm hash no nome). */
export function arquivosFixosDaEtapa0(ids) {
  return [
    ...Object.values(ARQUIVOS_DA_MARCA).map((a) => `${PASTA_DA_MARCA}${a}`),
    ...ARQUIVOS_DAS_FONTES,
    MANIFESTO_DE_SONS,
    ...ids.map(caminhoDoManifestoDoLutador),
    CENARIO_PADRAO_DA_ETAPA0,
  ];
}

/**
 * A lista completa para o `extras` do manifesto do SW, a partir dos caminhos do dist (relativos, com `/`): os fixos (os lutadores são os que têm `atlas.json` no dist) +
 * os pedaços de JS que existem nele. Lança se um pedaço da etapa 0 não existe no dist (renomeado ou removido): o build avisa em vez de o SW pré-carregar menos do que o
 * boot baixa.
 */
export function arquivosDaEtapa0(arquivosDoDist) {
  const ids = [];
  for (const c of arquivosDoDist) {
    const m = /^assets\/lutadores\/([^/]+)\/atlas\.json$/.exec(c);
    if (m) ids.push(m[1]);
  }
  if (ids.length === 0) throw new Error('etapa 0: nenhum assets/lutadores/<id>/atlas.json no dist');
  const achados = [];
  for (const nome of PEDACOS_DA_ETAPA0) {
    const ex = new RegExp(`^assets/${nome}-[^/]+\\.js$`);
    const dele = arquivosDoDist.filter((c) => ex.test(c));
    if (dele.length === 0) throw new Error(`etapa 0: o pedaco de JS "${nome}" nao existe no dist (src/assets/etapa0.mjs, PEDACOS_DA_ETAPA0)`);
    achados.push(...dele);
  }
  return [...new Set([...arquivosFixosDaEtapa0(ids), ...achados])].sort();
}
