#!/usr/bin/env node
/**
 * Medição de desempenho do trailer (T0, docs/spec-trailer-abertura.md §9 e teste 14): `npm run trailer:medir -- [opções]`.
 *
 * Mede, no Chromium (Playwright) com a CPU estrangulada (`Emulation.setCPUThrottlingRate`), o quadro da CenaFight CPU x CPU, que é o LIMITE do trailer: o quadro do
 * trailer não pode custar mais que 1,15 x o p95 da luta no mesmo perfil. A MESMA ferramenta mede a cena do trailer quando ela existir (`--cena trailer`), então a
 * comparação é feita pelo mesmo método, no mesmo aparelho e no mesmo minuto.
 *
 *   --cena fight|trailer   o que medir (padrão fight). `trailer` abre `h.ui.set('trailer', { origem: 'atrair' })`; `--prep "<js>"` troca esse preparo.
 *   --taxas 1,4            estrangulamentos de CPU (padrão 1,4)
 *   --quadros N            quadros medidos por rodada (padrão 450) depois de 120 de aquecimento
 *   --rodadas N            rodadas; reporta a MEDIANA dos p95 (padrão 3)
 *   --modo custo|intervalo|ambos
 *                          custo = update+draw+flush de um quadro (laço manual, `?manual=1`); intervalo = tempo entre quadros do requestAnimationFrame
 *                          do jogo de verdade (padrão ambos)
 *   --lutas a:b,c:d        as lutas CPU x CPU de referência (padrão hayato:min-ji,caio:wei-long: a "normal" e a dos atlas originais, a mais pesada)
 *   --canvas acelerado|cpu  acelerado (padrão) = flags `--enable-gpu-rasterization --use-angle=swiftshader`: a thread principal só grava os comandos, como num
 *                          celular com GPU (o modelo realista da E7a); cpu = o padrão do headless, que rasteriza inline (o PIOR caso)
 *   --decode               também mede o 1º drawImage de um atlas 2048x1920 do ZENON, com e sem `decode()` (decisão da spec §5.2)
 *   --url <base>           servidor já no ar (padrão http://127.0.0.1:5173; se não responder, sobe o Vite)
 *   --gravar-base          grava ferramentas/trailer/base-desempenho.json (a referência que os testes do trailer leem)
 *   --saida <arquivo>      grava o resultado completo em JSON
 *
 * Limites: Chromium headless sem GPU (SwiftShader) NÃO é o iPhone. O que sai daqui é uma RAZÃO (trailer / luta), não um valor absoluto de aparelho.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AJUDA = [
  'uso: npm run trailer:medir -- [--cena fight|trailer] [--taxas 1,4] [--quadros 450] [--rodadas 3] [--modo custo|intervalo|ambos] [--decode] [--url base] [--gravar-base] [--saida arq.json]',
  '  mede o quadro (update+draw) da cena no Chromium com CPU estrangulada; o p95 da luta a 4x é o limite do trailer (1,15 x).',
].join('\n');

function lerArgumentos(argv) {
  const a = { cena: 'fight', lutas: ['hayato:min-ji', 'caio:wei-long'], canvas: 'acelerado', taxas: [1, 4], quadros: 450, rodadas: 3, modo: 'ambos', decode: false, url: 'http://127.0.0.1:5173', gravarBase: false, saida: null, prep: null, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${t} precisa de um valor`);
      return v;
    };
    if (t === '--cena') a.cena = valor();
    else if (t === '--lutas') a.lutas = valor().split(',').map((x) => x.trim()).filter(Boolean);
    else if (t === '--canvas') a.canvas = valor();
    else if (t === '--taxas') a.taxas = valor().split(',').map(Number);
    else if (t === '--quadros') a.quadros = Number(valor());
    else if (t === '--rodadas') a.rodadas = Number(valor());
    else if (t === '--modo') a.modo = valor();
    else if (t === '--decode') a.decode = true;
    else if (t === '--so-decode') { a.decode = true; a.soDecode = true; }
    else if (t === '--url') a.url = valor();
    else if (t === '--gravar-base') a.gravarBase = true;
    else if (t === '--saida') a.saida = resolve(valor());
    else if (t === '--prep') a.prep = valor();
    else if (t === '--ajuda' || t === '-h' || t === '--help') a.ajuda = true;
    else throw new Error(`opção desconhecida: ${t}`);
  }
  if (!['fight', 'trailer'].includes(a.cena)) throw new Error('--cena: fight ou trailer');
  if (!['acelerado', 'cpu'].includes(a.canvas)) throw new Error('--canvas: acelerado ou cpu');
  if (!a.lutas.every((l) => /^[a-z-]+:[a-z-]+$/.test(l))) throw new Error('--lutas: pares id:id separados por vírgula');
  if (!['custo', 'intervalo', 'ambos'].includes(a.modo)) throw new Error('--modo: custo, intervalo ou ambos');
  if (!a.taxas.every((n) => Number.isFinite(n) && n >= 1 && n <= 20)) throw new Error('--taxas: números de 1 a 20');
  if (!Number.isInteger(a.quadros) || a.quadros < 60 || a.quadros > 5000) throw new Error('--quadros: inteiro de 60 a 5000');
  if (!Number.isInteger(a.rodadas) || a.rodadas < 1 || a.rodadas > 15) throw new Error('--rodadas: inteiro de 1 a 15');
  return a;
}

export const percentil = (v, p) => {
  const s = [...v].sort((x, y) => x - y);
  return s[Math.min(s.length - 1, Math.floor(p * s.length))] ?? 0;
};
export const mediana = (v) => percentil(v, 0.5);
const resumo = (v) => ({
  n: v.length,
  media: v.reduce((s, x) => s + x, 0) / Math.max(1, v.length),
  mediana: mediana(v),
  p95: percentil(v, 0.95),
  p99: percentil(v, 0.99),
  max: Math.max(...v),
  acima33: v.filter((x) => x > 33.4).length,
  acima50: v.filter((x) => x > 50).length,
});

// ---- o que roda DENTRO da página (strings: o Playwright as avalia) ----

/** O gancho que dispensa a provocação do round 1 (o mesmo de tests/e2e/_luta.ts): senão a luta só começa 5 s depois. */
const SEM_PROVOCACAO = "const s = h.ui.scene; if (s && s.provocacao) { s.semProvocacao = true; s.provocacao.zerar(); s.aberturaPendente = false; }";

const PREPARO_FIGHT = (c1, c2) => `(async () => {
  const h = window.__inno; h.ui.fade = 0; h.ui.fadeDir = 0;
  h.ui.set('fight', { cfg: { mode: 'cpu', c1: '${c1}', c2: '${c2}', cpu: 2, p1cpu: 2, esquiva: true } });
  ${SEM_PROVOCACAO}
  for (let i = 0; i < 400 && !(h.ui.scene && h.ui.scene.espera && h.ui.scene.espera.pronta); i++) await new Promise((r) => setTimeout(r, 50));
  for (let i = 0; i < 400; i++) { h.avancar(2); if (h.mundo().game.phase === 'fight') break; }
  // a luta não pode acabar no meio da medida: a vida é reposta (o custo do quadro é o mesmo)
  window.__repor = setInterval(() => { const g = h.mundo().game; if (!g) return; for (const f of [g.p1, g.p2]) { f.hp = f.maxHp; f.barras = f.barrasMax; } }, 400);
  return h.mundo().game.phase;
})()`;

const PREPARO_TRAILER = `(async () => {
  const h = window.__inno; h.ui.fade = 0; h.ui.fadeDir = 0;
  h.ui.set('trailer', { origem: 'atrair' });
  for (let i = 0; i < 400 && !(h.ui.scene && h.ui.scene.pronta !== false); i++) await new Promise((r) => setTimeout(r, 50));
  return 'trailer';
})()`;

/**
 * Custo de CPU de um quadro na thread principal: avança 1 tick e desenha. NÃO força o canvas a terminar (`getImageData` esperaria a rasterização do SwiftShader, que
 * no Chrome de um celular com GPU nem passa pela thread principal): com o canvas acelerado a thread só grava os comandos; com `--canvas cpu` a rasterização é inline
 * e já entra na conta. É o mesmo método da E7a (docs/handoff-lyra-e7a.md §7).
 */
const MEDIR_CUSTO = (n, aquecer) => `(() => {
  const h = window.__inno; const t = [];
  for (let i = 0; i < ${aquecer}; i++) { h.avancar(1); h.desenhar(); }
  for (let i = 0; i < ${n}; i++) { const t0 = performance.now(); h.avancar(1); h.desenhar(); t.push(performance.now() - t0); }
  return t;
})()`;

/** Tempo entre quadros do laço de verdade (requestAnimationFrame), com o jogo rodando sozinho. */
const MEDIR_INTERVALO = (n, aquecer) =>
  `new Promise((resolve) => { const t = []; let ultimo = 0; let k = 0; const passo = (ts) => { if (ultimo) { if (k >= ${aquecer}) t.push(ts - ultimo); k++; } else k = 0; ultimo = ts; if (t.length >= ${n}) resolve(t); else requestAnimationFrame(passo); }; requestAnimationFrame(passo); })`;

const MEDIR_DECODE = (url, reps, sal) => `(async () => {
  const carregar = (u) => new Promise((ok, erro) => { const im = new Image(); im.onload = () => ok(im); im.onerror = () => erro(new Error('imagem')); im.src = u; });
  const um = async (usar, n) => {
    const im = await carregar('${url}?teste=${sal}-' + usar + '-' + n);
    if (usar) await im.decode();
    const c = document.createElement('canvas'); c.width = 960; c.height = 540; const x = c.getContext('2d');
    const t0 = performance.now(); x.drawImage(im, 0, 0); x.getImageData(0, 0, 1, 1); return { primeiroDraw: performance.now() - t0, largura: im.naturalWidth, altura: im.naturalHeight };
  };
  const sem = [], com = []; let dim = null;
  for (let i = 0; i < ${reps}; i++) { const a = await um(false, i); sem.push(a.primeiroDraw); dim = a; const b = await um(true, i); com.push(b.primeiroDraw); }
  return { sem, com, dim };
})()`;

/** Uma avaliação na página com prazo: se a página travar, a ferramenta diz onde em vez de ficar parada para sempre. */
function comPrazo(promessa, ms, rotulo) {
  let id;
  const prazo = new Promise((_, erro) => {
    id = setTimeout(() => erro(new Error(`a página travou (${rotulo}, mais de ${ms / 1000} s)`)), ms);
  });
  return Promise.race([promessa, prazo]).finally(() => clearTimeout(id));
}

async function servidorNoAr(url) {
  try {
    const r = await fetch(url, { signal: AbortSignal.timeout(2500) });
    return r.ok;
  } catch {
    return false;
  }
}

async function principal() {
  const a = lerArgumentos(process.argv.slice(2));
  if (a.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  const { chromium } = await import('@playwright/test');
  let servidor = null;
  if (!(await servidorNoAr(a.url))) {
    const { createServer } = await import('vite');
    servidor = await createServer({ root: RAIZ, configFile: join(RAIZ, 'vite.config.ts'), logLevel: 'error', server: { host: '127.0.0.1' } });
    await servidor.listen();
    console.log('servidor de desenvolvimento subido pela ferramenta');
  }
  const navegador = await chromium.launch(a.canvas === 'acelerado' ? { args: ['--enable-gpu-rasterization', '--use-angle=swiftshader'] } : {});
  const saida = { data: new Date().toISOString(), navegador: navegador.version(), canvas: a.canvas, cena: a.cena, quadros: a.quadros, rodadas: a.rodadas, lutas: {} };
  const alvos = a.soDecode ? [] : a.cena === 'fight' ? a.lutas : ['trailer'];
  try {
    for (const alvo of alvos) {
      const [c1, c2] = alvo.split(':');
      saida.lutas[alvo] = {};
      for (const taxa of a.taxas) {
        const porModo = {};
        for (const modo of a.modo === 'ambos' ? ['custo', 'intervalo'] : [a.modo]) {
          const rodadas = [];
          for (let r = 0; r < a.rodadas; r++) {
            const ctx = await navegador.newContext({ viewport: { width: 960, height: 540 } });
            const page = await ctx.newPage();
            const erros = [];
            page.on('pageerror', (e) => erros.push(e.message));
            // o modo `custo` precisa do laço manual (?manual=1); o `intervalo` deixa o laço do jogo rodar sozinho
            await page.goto(`${a.url}/?seed=7&expansao=1${modo === 'custo' ? '&manual=1' : ''}`);
            await page.waitForSelector('html[data-pronto="true"]', { timeout: 90_000 });
            const cdp = await ctx.newCDPSession(page);
            const preparo = a.prep ?? (a.cena === 'fight' ? PREPARO_FIGHT(c1, c2) : PREPARO_TRAILER);
            const fase = await comPrazo(page.evaluate(preparo), 90_000, `preparo da ${alvo}`);
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: taxa });
            const amostras = await comPrazo(page.evaluate(modo === 'custo' ? MEDIR_CUSTO(a.quadros, 120) : MEDIR_INTERVALO(a.quadros, 120)), 240_000, `medida ${modo} ${alvo} ${taxa}x`);
            console.log(`  rodada ${r + 1}/${a.rodadas} (${alvo}, ${taxa}x, ${modo}): fase ${fase}, ${amostras.length} quadros`);
            await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
            rodadas.push({ fase, ...resumo(amostras), erros: erros.length });
            await ctx.close();
          }
          porModo[modo] = { rodadas, p95: mediana(rodadas.map((x) => x.p95)), mediana: mediana(rodadas.map((x) => x.mediana)), p99: mediana(rodadas.map((x) => x.p99)), acima33: mediana(rodadas.map((x) => x.acima33)) };
          console.log(`${alvo} (canvas ${a.canvas}) CPU ${taxa}x ${modo}: p95 ${porModo[modo].p95.toFixed(2)} ms, mediana ${porModo[modo].mediana.toFixed(2)} ms, p99 ${porModo[modo].p99.toFixed(2)} ms, quadros > 33 ms: ${porModo[modo].acima33} (p95 por rodada: ${rodadas.map((x) => x.p95.toFixed(1)).join(' / ')})`);
        }
        saida.lutas[alvo][taxa] = porModo;
      }
    }
    if (a.decode) {
      const ctx = await navegador.newContext({ viewport: { width: 960, height: 540 } });
      const page = await ctx.newPage();
      await page.goto(`${a.url}/?seed=7&manual=1&expansao=1`);
      await page.waitForSelector('html[data-pronto="true"]', { timeout: 90_000 });
      const cdp = await ctx.newCDPSession(page);
      saida.decode = {};
      for (const taxa of a.taxas) {
        await cdp.send('Emulation.setCPUThrottlingRate', { rate: taxa });
        const d = await page.evaluate(MEDIR_DECODE('/assets/lutadores/zenon/atlas-0.webp', 6, `t${taxa}`));
        saida.decode[taxa] = { semDecode: mediana(d.sem), comDecode: mediana(d.com), dimensoes: `${d.dim.largura}x${d.dim.altura}`, amostrasSem: d.sem.map((x) => +x.toFixed(1)), amostrasCom: d.com.map((x) => +x.toFixed(1)) };
        console.log(`1º drawImage de ${d.dim.largura}x${d.dim.altura} a ${taxa}x: sem decode() ${saida.decode[taxa].semDecode.toFixed(1)} ms, com decode() ${saida.decode[taxa].comDecode.toFixed(1)} ms (medianas de 6; Chromium, NÃO é o WebKit do iPhone)`);
      }
      await cdp.send('Emulation.setCPUThrottlingRate', { rate: 1 });
      await ctx.close();
    }
  } finally {
    await navegador.close();
    if (servidor) await servidor.close();
  }
  if (a.saida) {
    mkdirSync(dirname(a.saida), { recursive: true });
    writeFileSync(a.saida, JSON.stringify(saida, null, 2) + '\n', 'utf8');
    console.log(`gravado ${a.saida}`);
  }
  if (a.gravarBase && !a.soDecode) {
    if (a.cena !== 'fight') throw new Error('--gravar-base só vale para a luta (a referência é a CenaFight)');
    const lutas = Object.fromEntries(Object.entries(saida.lutas).map(([l, tx]) => [l, Object.fromEntries(Object.entries(tx).map(([t, m]) => [t, Object.fromEntries(Object.entries(m).map(([modo, v]) => [modo, { p95: +v.p95.toFixed(3), mediana: +v.mediana.toFixed(3), p99: +v.p99.toFixed(3), acima33: v.acima33 }]))]))]));
    // o limite do trailer: 1,15 x o p95 da PIOR luta de referência no perfil mais duro medido (o trailer herda o custo dos sprites de cada plano)
    const taxaMaior = String(Math.max(...a.taxas));
    const limite = {};
    for (const modo of a.modo === 'ambos' ? ['custo', 'intervalo'] : [a.modo]) {
      const p95s = Object.values(lutas).map((tx) => tx[taxaMaior]?.[modo]?.p95 ?? 0);
      limite[modo] = +(1.15 * Math.max(...p95s)).toFixed(3);
    }
    const base = {
      gerado: saida.data,
      navegador: saida.navegador,
      canvas: a.canvas,
      quadros: a.quadros,
      rodadas: a.rodadas,
      taxaDeReferencia: Number(taxaMaior),
      aviso: 'Chromium headless (SwiftShader), máquina compartilhada: vale como RAZÃO entre cenas medidas no mesmo perfil e no mesmo minuto, não como número de aparelho.',
      lutas,
      razaoMaximaDoTrailer: 1.15,
      limiteDoTrailerP95Ms: limite,
    };
    const alvo = join(RAIZ, 'ferramentas', 'trailer', 'base-desempenho.json');
    writeFileSync(alvo, JSON.stringify(base, null, 2) + '\n', 'utf8');
    console.log(`gravado ${alvo}`);
  }
  return 0;
}

// só roda como script (os testes importam este módulo para checar a sintaxe e as funções puras)
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  principal().then(
    (c) => process.exit(c),
    (e) => {
      console.error(e instanceof Error ? e.message : e);
      process.exit(1);
    },
  );
}
