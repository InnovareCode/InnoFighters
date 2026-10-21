#!/usr/bin/env node
/**
 * Harness de balanceamento (E6a): `npm run balanco -- [--rapido | --completo] [opções]`.
 *
 *   --rapido        (padrão) 6 sementes por combinação; sai em relatorios/balanco/ (ignorado pelo git). Uns 30 s.
 *   --completo      100 sementes por combinação; grava a referência em docs/balanco/. Poucos minutos (usa vários núcleos).
 *   --sementes N    número de sementes por combinação (vale sobre o modo)
 *   --niveis 1,2    níveis da CPU (1 = NORMAL, 2 = DIFÍCIL)
 *   --pares a:b,... filtro de pares (curinga *), ex.: aminu:*,*:nila
 *   --base N        muda TODAS as sementes de uma vez (padrão 1)
 *   --sem-chefe     pula as lutas contra o chefão (sem efeito enquanto CHEFE for null)
 *   --so frame|sim  só a frame data, ou só a simulação
 *   --jobs N        processos em paralelo (padrão: núcleos − 1, no máximo 8)
 *   --saida <pasta> onde gravar (padrão acima)
 *   --esquiva       liga a ESQUIVA em todas as lutas (V2); com --completo grava a referência de PRODUÇÃO em docs/balanco (a rodada sem a flag vai para docs/balanco/sem-esquiva); com --rapido, em relatorios/balanco-esquiva
 *   --ajustes <json> "e se...": ajustes em memória, ex. '{"wei-long":{"hp":100,"pow":1.08}}' (não grava dados; saída em relatorios/)
 *   --verificar     antes de tudo, joga uma amostra duas vezes e exige resultado idêntico (determinismo)
 *
 * Nada aqui toca no estado do jogo: cada luta/ensaio monta a PRÓPRIA `Game` em memória e não escreve em disco, exceto os
 * relatórios. O TypeScript do repositório é carregado pelo Vite (modo SSR), o mesmo transformador do Vitest.
 */
import { fork } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { availableParallelism } from 'node:os';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function lerArgumentos(argv, env) {
  const a = {
    modo: 'rapido', sementes: null, niveis: null, pares: env.BALANCO_PARES ?? null, base: 1, chefe: true, so: null, jobs: null, saida: null,
    verificar: false, worker: null, ajuda: false, ajustes: null, esquiva: false,
  };
  if (env.BALANCO_SEMENTES) a.sementes = Number(env.BALANCO_SEMENTES);
  if (env.BALANCO_NIVEIS) a.niveis = env.BALANCO_NIVEIS.split(',').map(Number);
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${t} precisa de um valor`);
      return v;
    };
    if (t === '--rapido') a.modo = 'rapido';
    else if (t === '--completo') a.modo = 'completo';
    else if (t === '--sementes') a.sementes = Number(valor());
    else if (t === '--niveis') a.niveis = valor().split(',').map(Number);
    else if (t === '--pares') a.pares = valor();
    else if (t === '--base') a.base = Number(valor());
    else if (t === '--sem-chefe') a.chefe = false;
    else if (t === '--so') a.so = valor();
    else if (t === '--jobs') a.jobs = Number(valor());
    else if (t === '--saida') a.saida = resolve(valor());
    else if (t === '--ajustes') a.ajustes = JSON.parse(valor());
    else if (t === '--esquiva') a.esquiva = true;
    else if (t === '--verificar') a.verificar = true;
    else if (t === '--worker') a.worker = valor();
    else if (t === '--ajuda' || t === '-h' || t === '--help') a.ajuda = true;
    else throw new Error(`opção desconhecida: ${t}`);
  }
  a.sementes ??= a.modo === 'completo' ? 100 : 6;
  a.niveis ??= [1, 2];
  if (!Number.isInteger(a.sementes) || a.sementes < 1 || a.sementes > 5000) throw new Error('--sementes: inteiro de 1 a 5000');
  if (!a.niveis.every((n) => n === 1 || n === 2)) throw new Error('--niveis: use 1 (NORMAL) e/ou 2 (DIFÍCIL)');
  if (a.so !== null && a.so !== 'frame' && a.so !== 'sim') throw new Error('--so: frame ou sim');
  // O "e se..." nunca escreve nas pastas de referência. A referência versionada é a da PRODUÇÃO (esquiva ligada) em docs/balanco;
  // a rodada sem a flag fica ao lado, em docs/balanco/sem-esquiva (o `--completo` sem `--esquiva` NÃO sobrescreve a de produção).
  a.saida ??= a.ajustes ? join(RAIZ, 'relatorios', 'balanco-ajustes')
    : a.modo === 'completo' ? join(RAIZ, 'docs', 'balanco', a.esquiva ? '' : 'sem-esquiva')
    : join(RAIZ, 'relatorios', a.esquiva ? 'balanco-esquiva' : 'balanco');
  return a;
}

async function carregarModulos() {
  const server = await createServer({
    root: RAIZ, configFile: false, appType: 'custom', logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] },
  });
  const m = {
    elenco: await server.ssrLoadModule('/ferramentas/balanco/elenco.ts'),
    frame: await server.ssrLoadModule('/ferramentas/balanco/frame-data.ts'),
    sim: await server.ssrLoadModule('/ferramentas/balanco/simulacao.ts'),
    agr: await server.ssrLoadModule('/ferramentas/balanco/agregado.ts'),
    out: await server.ssrLoadModule('/ferramentas/balanco/outliers.ts'),
    rel: await server.ssrLoadModule('/ferramentas/balanco/relatorio.ts'),
    regras: await server.ssrLoadModule('/src/meta/regras.ts'),
  };
  return { server, m };
}

/** Hash do que decide o resultado: dados, motor, núcleo e atlas de produção (fim de linha normalizado). */
function versaoDosDados() {
  const h = createHash('sha256');
  const pasta = (dir) => {
    for (const nome of readdirSync(dir).sort()) {
      const p = join(dir, nome);
      if (statSync(p).isDirectory()) pasta(p);
      else if (/\.(ts|json)$/.test(nome)) h.update(relative(RAIZ, p) + '\n').update(readFileSync(p, 'utf8').replace(/\r\n/g, '\n'));
    }
  };
  for (const d of ['src/data', 'src/fight', 'src/core', 'src/meta', 'ferramentas/balanco']) pasta(join(RAIZ, d));
  const lut = join(RAIZ, 'public', 'assets', 'lutadores');
  for (const id of readdirSync(lut).sort()) {
    const atlas = join(lut, id, 'atlas.json');
    if (existsSync(atlas)) h.update(`atlas/${id}\n`).update(readFileSync(atlas, 'utf8').replace(/\r\n/g, '\n'));
  }
  return h.digest('hex').slice(0, 12);
}

function paramsDe(a) {
  return { sementes: a.sementes, niveis: a.niveis, base: a.base, filtro: a.pares, incluirChefe: a.chefe, ...(a.ajustes ? { ajustes: a.ajustes } : {}), ...(a.esquiva ? { esquiva: true } : {}) };
}

// ---------------------------------------------------------------------------------------------------------------------
// Worker: roda a fatia k/n das tarefas e devolve os registros pelo canal IPC
// ---------------------------------------------------------------------------------------------------------------------
async function modoWorker(a) {
  const [k, n] = a.worker.split('/').map(Number);
  const { server, m } = await carregarModulos();
  try {
    const elenco = m.elenco.montarElenco();
    if (a.ajustes) m.elenco.aplicarAjustes(elenco, a.ajustes);
    const tarefas = m.sim.montarTarefas(m.elenco.ROSTER, m.regras.CHEFE, paramsDe(a)).filter((t) => t.idx % n === k);
    const registros = m.sim.rodarTarefas(elenco, tarefas);
    await new Promise((ok, falha) => process.send({ registros }, (e) => (e ? falha(e) : ok())));
  } finally {
    await server.close();
  }
}

function rodarWorkers(a, total) {
  const jobs = Math.max(1, Math.min(a.jobs ?? Math.min(8, availableParallelism() - 1), total));
  const todos = [];
  let feitos = 0;
  const inicio = Date.now();
  return new Promise((ok, falha) => {
    for (let k = 0; k < jobs; k++) {
      const filho = fork(fileURLToPath(import.meta.url), ['--worker', `${k}/${jobs}`], {
        env: { ...process.env, BALANCO_PARAMS: JSON.stringify(paramsDe(a)) }, stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
      });
      filho.on('message', (msg) => {
        for (const r of msg.registros) todos.push(r);
      });
      filho.on('error', falha);
      filho.on('exit', (code) => {
        if (code !== 0) return falha(new Error(`worker ${k} saiu com código ${code}`));
        if (++feitos === jobs) ok({ registros: todos, jobs, segundos: (Date.now() - inicio) / 1000 });
      });
    }
  });
}

// ---------------------------------------------------------------------------------------------------------------------
// Principal
// ---------------------------------------------------------------------------------------------------------------------
async function principal() {
  const a = lerArgumentos(process.argv.slice(2), process.env);
  if (a.ajuda) {
    const cabecalho = readFileSync(fileURLToPath(import.meta.url), 'utf8').split('*/')[0] ?? '';
    console.log(cabecalho.replace(/^#!.*\n/, '').replace(/^\/\*\*\n/, '').replace(/^ \* ?/gm, ''));
    return;
  }
  if (a.worker) {
    // os parâmetros chegam do processo principal, já validados (a linha de comando do worker só leva o --worker)
    const p = JSON.parse(process.env.BALANCO_PARAMS ?? '{}');
    Object.assign(a, { sementes: p.sementes, niveis: p.niveis, base: p.base, pares: p.filtro, chefe: p.incluirChefe, ajustes: p.ajustes ?? null, esquiva: p.esquiva === true });
    return modoWorker(a);
  }

  const { server, m } = await carregarModulos();
  try {
    const hoje = new Date().toISOString().slice(0, 10);
    const versaoDados = versaoDosDados();
    const ids = m.elenco.ROSTER;
    mkdirSync(a.saida, { recursive: true });
    const elenco = m.elenco.montarElenco();
    if (a.ajustes) m.elenco.aplicarAjustes(elenco, a.ajustes);
    const relDir = relative(RAIZ, a.saida) || '.';
    console.log(`balanco: modo ${a.modo}, saída em ${relDir}, dados ${versaoDados}${a.ajustes ? `, AJUSTES ${JSON.stringify(a.ajustes)}` : ''}`);

    if (a.verificar) {
      const amostra = m.sim.montarTarefas(ids, m.regras.CHEFE, { sementes: 2, niveis: [1, 2], base: a.base, filtro: 'hayato:caio,aminu:nila', incluirChefe: true });
      const h1 = m.agr.hashDosRegistros(m.sim.rodarTarefas(elenco, amostra));
      const h2 = m.agr.hashDosRegistros(m.sim.rodarTarefas(elenco, amostra));
      console.log(`verificar: ${amostra.length} lutas x 2 rodadas -> ${h1 === h2 ? 'IDÊNTICAS' : 'DIFERENTES'} (${h1} / ${h2})`);
      if (h1 !== h2) process.exitCode = 1;
    }

    // Os workers saem PRIMEIRO: o processo principal fica ocupado medindo a frame data enquanto eles jogam.
    const params = paramsDe(a);
    const tarefas = m.sim.montarTarefas(ids, m.regras.CHEFE, params);
    let workers = null;
    if (a.so !== 'frame') {
      console.log(`simulação: ${tarefas.length} lutas (${a.sementes} sementes, níveis ${a.niveis.join(',')})`);
      workers = rodarWorkers(a, tarefas.length);
      workers.catch(() => undefined); // o erro é tratado no `await` abaixo; isto só evita rejeição não tratada enquanto o frame data bloqueia
    }

    // 1) frame data (no processo principal enquanto os workers jogam)
    let frame = null;
    const jobFrame =
      a.so === 'sim'
        ? Promise.resolve()
        : (async () => {
            const t0 = Date.now();
            frame = ids.flatMap((id) => m.frame.medirLutador(elenco, id));
            writeFileSync(join(a.saida, 'frame-data.md'), m.rel.frameDataMd(frame, ids, { geradoEm: hoje, versaoDados }));
            writeFileSync(join(a.saida, 'frame-data.json'), JSON.stringify({ versaoDados, linhas: frame }, null, 1));
            console.log(`frame data: ${frame.length} linhas em ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${join(relDir, 'frame-data.md')}`);
          })();

    // 2) simulação
    if (a.so === 'frame') {
      await jobFrame;
      return;
    }
    await jobFrame;
    const { registros, jobs, segundos } = await workers;
    registros.sort((x, y) => x.idx - y.idx);
    const agr = m.agr.agregar(registros, ids, m.regras.CHEFE, params);
    const hash = m.agr.hashDosRegistros(registros);
    const achados = m.out.acharOutliers(agr, frame ?? []);
    const taxas = Object.fromEntries(ids.map((id) => [id, agr.porLutador[id].geral.taxa]));
    const arqJson = join(a.saida, 'resultados.json');
    let dif = null;
    if (existsSync(arqJson)) {
      try {
        const antes = JSON.parse(readFileSync(arqJson, 'utf8'));
        if (JSON.stringify(antes.parametros) === JSON.stringify(params)) dif = m.agr.compararRodadas({ hash: antes.hashRegistros, versao: antes.versaoDados ?? '?', taxas: antes.taxas }, { hash, versao: versaoDados, taxas });
      } catch {
        dif = null;
      }
    }
    const cab = { geradoEm: hoje, versaoDados, modo: a.modo + (a.ajustes ? " + ajustes (hipótese, não é o jogo)" : "") + (a.esquiva ? " + ESQUIVA ligada" : ""), hashRegistros: hash, segundos, processos: jobs, lutas: registros.length };
    writeFileSync(join(a.saida, 'resultados.md'), m.rel.resultadosMd(agr, ids, achados, dif, cab));
    writeFileSync(arqJson, JSON.stringify({ parametros: params, hashRegistros: hash, versaoDados, geradoEm: hoje, taxas, agregado: agr, achados }, null, 1));
    resumo(agr, ids, achados, dif, hash, segundos, jobs, relDir);
  } finally {
    await server.close();
  }
}

function resumo(agr, ids, achados, dif, hash, segundos, jobs, relDir) {
  const pc = (x) => `${(x * 100).toFixed(1).padStart(5)}%`;
  console.log('\nlutador     lutas  vitórias   taxa  IC95        duração  tempo');
  for (const id of ids) {
    const l = agr.porLutador[id];
    console.log(
      `${id.padEnd(10)} ${String(l.lutas).padStart(6)} ${String(l.vitorias).padStart(9)} ${pc(l.geral.taxa)}  ${(l.geral.lo * 100).toFixed(0).padStart(3)}-${(l.geral.hi * 100).toFixed(0).padEnd(3)}   ${l.duracaoSeg.toFixed(0).padStart(5)} s  ${pc(l.lutasPorTempo)}`,
    );
  }
  for (const nivel of [...new Set(agr.chefe.map((c) => c.nivel))]) {
    const ls = agr.chefe.filter((c) => c.nivel === nivel);
    const n = ls.reduce((s, c) => s + c.jogador.n, 0);
    const k = ls.reduce((s, c) => s + c.jogador.k, 0);
    console.log(`chefão ${nivel === 1 ? 'NORMAL ' : 'DIFÍCIL'}: jogador vence ${pc(n ? k / n : 0)} (${k}/${n})`);
  }
  const cont = { alerta: 0, atencao: 0, info: 0 };
  for (const x of achados) cont[x.severidade]++;
  console.log(`\nsinalizações: ${cont.alerta} alerta(s), ${cont.atencao} atenção, ${cont.info} info (veja ${relDir}/resultados.md)`);
  for (const x of achados.filter((y) => y.severidade === 'alerta').slice(0, 12)) console.log(`  ALERTA ${x.categoria}: ${x.alvo} - ${x.texto}`);
  console.log(`${agr.total.regulares + agr.total.chefe} lutas em ${segundos.toFixed(0)} s (${jobs} processo(s)); ${agr.total.travadas} travada(s); hash ${hash}`);
  if (!dif) console.log('determinismo: sem rodada anterior com os mesmos parâmetros (esta é a referência)');
  else if (dif.igual) console.log(`determinismo: IDÊNTICA à rodada anterior (${dif.hashAntes})`);
  else if (dif.mesmaVersao) console.log(`determinismo: DIFERENTE COM A MESMA VERSÃO (${dif.hashAntes} -> ${dif.hashAgora}): NÃO DETERMINISMO, é bug`);
  else console.log(`determinismo: diferente da rodada anterior (${dif.hashAntes} -> ${dif.hashAgora}), mas a versão dos dados/motor/harness mudou (${dif.versaoAntes} -> ${dif.versaoAgora}); ${dif.mudancas.length} lutador(es) mudaram de taxa`);
}

principal().catch((e) => {
  console.error(`ERRO: ${e.stack ?? e.message}`);
  process.exit(1);
});
