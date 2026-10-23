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
 *   --sem-chefe     pula as lutas contra os chefões
 *   --chefes a,b    só estes chefões (ex.: aminu,zenon); cada um contra o elenco que existe no ponto dele da progressão (39 pares no total)
 *   --sem-regulares não joga as 90 combinações regulares (só os chefões): calibração rápida. Nunca grava em docs/balanco
 *   --varrer-dano 1,0.9,0.8  roda SÓ os chefões com cada fator `danoRecebido` (30 sementes por padrão) e imprime taxa x fator por chefão e nível
 *   --so frame|sim  só a frame data, ou só a simulação
 *   --jobs N        processos em paralelo (padrão: núcleos − 1, no máximo 8)
 *   --saida <pasta> onde gravar (padrão acima)
 *   --esquiva       liga a ESQUIVA em todas as lutas (V2); com --completo grava a referência de PRODUÇÃO em docs/balanco (a rodada sem a flag vai para docs/balanco/sem-esquiva); com --rapido, em relatorios/balanco-esquiva
 *   --entrada-hitstop liga `motorV2.entradaNoHitstop` (V2-1) em todas as lutas; PROVA de que a flag não muda o harness (o hash tem de ser o mesmo); sai em relatorios/balanco-entrada-hitstop, nunca em docs/
 *   --filmes        liga `motorV2.filmes` (V2-3c: o filme do especial no motor) em todas as lutas E na frame data (ganha a coluna "Filme"); muda o resultado de propósito, então sai em relatorios/balanco-filmes, nunca em docs/ (a referência nova é da V2-6)
 *   --motor-v2 a,b  atalho para as flags do motor v2: entrada (= --entrada-hitstop), filmes (= --filmes) e combos (V2-4: os combos próprios; a CPU DIFÍCIL passa a usá-los e o verificador roda; sai em relatorios/balanco-combos, nunca em docs/), ex.: --motor-v2 entrada,filmes,combos
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
    verificar: false, worker: null, ajuda: false, ajustes: null, esquiva: false, entradaHitstop: false, filmes: false, combos: false, chefes: null, semRegulares: false, varrerDano: null,
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
    else if (t === '--entrada-hitstop') a.entradaHitstop = true;
    else if (t === '--filmes') a.filmes = true;
    else if (t === '--motor-v2') {
      for (const f of valor().split(',').map((x) => x.trim()).filter(Boolean)) {
        if (f === 'entrada') a.entradaHitstop = true;
        else if (f === 'filmes') a.filmes = true;
        else if (f === 'combos') a.combos = true;
        else throw new Error(`--motor-v2: flag desconhecida '${f}' (use entrada, filmes e/ou combos)`);
      }
    }
    else if (t === '--chefes') a.chefes = valor().split(',').map((x) => x.trim()).filter(Boolean);
    else if (t === '--sem-regulares') a.semRegulares = true;
    else if (t === '--varrer-dano') a.varrerDano = valor().split(',').map(Number);
    else if (t === '--verificar') a.verificar = true;
    else if (t === '--worker') a.worker = valor();
    else if (t === '--ajuda' || t === '-h' || t === '--help') a.ajuda = true;
    else throw new Error(`opção desconhecida: ${t}`);
  }
  if (a.varrerDano) {
    if (!a.varrerDano.every((f) => Number.isFinite(f) && f > 0 && f <= 1)) throw new Error('--varrer-dano: fatores entre 0 (exclusive) e 1, ex.: 1,0.9,0.8');
    a.semRegulares = true;
    if (a.chefe === false) throw new Error('--varrer-dano não combina com --sem-chefe');
  }
  if (a.semRegulares && a.so === null) a.so = 'sim'; // sem regulares a frame data não serve a nada: pula (o tempo vai para os chefões)
  a.sementes ??= a.varrerDano ? 30 : a.modo === 'completo' ? 100 : 6;
  a.niveis ??= [1, 2];
  if (!Number.isInteger(a.sementes) || a.sementes < 1 || a.sementes > 5000) throw new Error('--sementes: inteiro de 1 a 5000');
  if (!a.niveis.every((n) => n === 1 || n === 2)) throw new Error('--niveis: use 1 (NORMAL) e/ou 2 (DIFÍCIL)');
  if (a.so !== null && a.so !== 'frame' && a.so !== 'sim') throw new Error('--so: frame ou sim');
  // O "e se..." nunca escreve nas pastas de referência. A referência versionada é a da PRODUÇÃO (esquiva ligada) em docs/balanco;
  // a rodada sem a flag fica ao lado, em docs/balanco/sem-esquiva (o `--completo` sem `--esquiva` NÃO sobrescreve a de produção).
  // Rodada parcial (sem regulares ou só alguns chefões) NUNCA vira a referência de docs/balanco.
  const parcial = a.semRegulares || a.chefes !== null;
  // `--entrada-hitstop` é uma PROVA (o hash tem de bater com o de referência), nunca a referência: sai sempre em relatorios/
  a.saida ??= a.ajustes ? join(RAIZ, 'relatorios', 'balanco-ajustes')
    : a.filmes && a.combos ? join(RAIZ, 'relatorios', 'balanco-filmes-combos')
    : a.filmes ? join(RAIZ, 'relatorios', 'balanco-filmes')
    : a.combos ? join(RAIZ, 'relatorios', 'balanco-combos')
    : a.entradaHitstop ? join(RAIZ, 'relatorios', 'balanco-entrada-hitstop')
    : parcial ? join(RAIZ, 'relatorios', 'balanco-chefes')
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
    chefoes: await server.ssrLoadModule('/ferramentas/balanco/chefoes.ts'),
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
  return {
    sementes: a.sementes, niveis: a.niveis, base: a.base, filtro: a.pares, incluirChefe: a.chefe,
    ...(a.chefes ? { chefes: a.chefes } : {}), ...(a.semRegulares ? { semRegulares: true } : {}),
    ...(a.ajustes ? { ajustes: a.ajustes } : {}), ...(a.esquiva ? { esquiva: true } : {}),
    ...(a.entradaHitstop ? { entradaNoHitstop: true } : {}),
    ...(a.filmes ? { filmes: true } : {}),
    ...(a.combos ? { combos: true } : {}),
  };
}

/** Os chefões da progressão (guardiões na ordem da fila, o final por último) e quem pode enfrentar cada um. */
const chefoesDe = (m) => m.chefoes.desafiantesDoChefe(m.regras.REGRAS_PADRAO);

// ---------------------------------------------------------------------------------------------------------------------
// Worker: roda a fatia k/n das tarefas e devolve os registros pelo canal IPC
// ---------------------------------------------------------------------------------------------------------------------
async function modoWorker(a) {
  const [k, n] = a.worker.split('/').map(Number);
  const { server, m } = await carregarModulos();
  try {
    const elenco = m.elenco.montarElenco();
    if (a.ajustes) m.elenco.aplicarAjustes(elenco, a.ajustes);
    const tarefas = m.sim.montarTarefas(m.elenco.ROSTER, chefoesDe(m), paramsDe(a)).filter((t) => t.idx % n === k);
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
    Object.assign(a, { sementes: p.sementes, niveis: p.niveis, base: p.base, pares: p.filtro, chefe: p.incluirChefe, ajustes: p.ajustes ?? null, esquiva: p.esquiva === true, entradaHitstop: p.entradaNoHitstop === true, filmes: p.filmes === true, combos: p.combos === true, chefes: p.chefes ?? null, semRegulares: p.semRegulares === true });
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
    if (a.varrerDano) {
      await varrerDano(a, m, ids, versaoDados);
      return;
    }

    if (a.verificar) {
      const amostra = m.sim.montarTarefas(ids, chefoesDe(m), { sementes: 2, niveis: [1, 2], base: a.base, filtro: 'hayato:caio,aminu:nila,*:aminu,*:zenon', incluirChefe: true });
      const h1 = m.agr.hashDosRegistros(m.sim.rodarTarefas(elenco, amostra));
      const h2 = m.agr.hashDosRegistros(m.sim.rodarTarefas(elenco, amostra));
      console.log(`verificar: ${amostra.length} lutas x 2 rodadas -> ${h1 === h2 ? 'IDÊNTICAS' : 'DIFERENTES'} (${h1} / ${h2})`);
      if (h1 !== h2) process.exitCode = 1;
    }

    // Os workers saem PRIMEIRO: o processo principal fica ocupado medindo a frame data enquanto eles jogam.
    const params = paramsDe(a);
    const chefoes = chefoesDe(m);
    const tarefas = m.sim.montarTarefas(ids, chefoes, params);
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
            frame = ids.flatMap((id) => m.frame.medirLutador(elenco, id, a.filmes ? { filmes: true } : undefined));
            writeFileSync(join(a.saida, 'frame-data.md'), m.rel.frameDataMd(frame, ids, { geradoEm: hoje, versaoDados }));
            writeFileSync(join(a.saida, 'frame-data.json'), JSON.stringify({ versaoDados, linhas: frame }, null, 1));
            console.log(`frame data: ${frame.length} linhas em ${((Date.now() - t0) / 1000).toFixed(1)} s -> ${join(relDir, 'frame-data.md')}`);
            if (a.combos) {
              // V2-4 (spec §6.2): o verificador de combos próprios, com o elenco (e os ajustes "e se") desta rodada.
              const vs = m.frame.verificarCombos(elenco, ids);
              writeFileSync(join(a.saida, 'combos-proprios.md'), m.rel.combosMd(vs, { geradoEm: hoje, versaoDados }));
              writeFileSync(join(a.saida, 'combos-proprios.json'), JSON.stringify({ versaoDados, combos: vs }, null, 1));
              const ruins = vs.filter((v) => !v.ok);
              console.log(`combos próprios: ${vs.length - ruins.length} de ${vs.length} passam no verificador -> ${join(relDir, 'combos-proprios.md')}`);
              for (const v of ruins) console.log(`  FALHA ${v.id}: ${v.falhas.join(' | ')}`);
              if (ruins.length) process.exitCode = 1;
            }
          })();

    // 2) simulação
    if (a.so === 'frame') {
      await jobFrame;
      return;
    }
    await jobFrame;
    const { registros, jobs, segundos } = await workers;
    registros.sort((x, y) => x.idx - y.idx);
    const agr = m.agr.agregar(registros, ids, chefoes, params);
    agr.danoRecebido = Object.fromEntries(chefoes.map((c) => [c.chefe, elenco[c.chefe]?.chefe?.danoRecebido ?? 1]));
    const hash = m.agr.hashDosRegistros(registros);
    const hashRegulares = m.agr.hashRegulares(registros);
    const hashChefes = m.agr.hashChefes(registros);
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
    const cab = { geradoEm: hoje, versaoDados, modo: a.modo + (a.ajustes ? " + ajustes (hipótese, não é o jogo)" : "") + (a.esquiva ? " + ESQUIVA ligada" : "") + (a.filmes ? " + FILMES ligados (motorV2.filmes)" : "") + (a.combos ? " + COMBOS PRÓPRIOS ligados (motorV2.combos)" : ""), hashRegistros: hash, hashRegulares: a.semRegulares ? undefined : hashRegulares, hashChefes, segundos, processos: jobs, lutas: registros.length };
    writeFileSync(join(a.saida, 'resultados.md'), m.rel.resultadosMd(agr, ids, achados, dif, cab));
    writeFileSync(arqJson, JSON.stringify({ parametros: params, hashRegistros: hash, hashRegulares, hashChefes, versaoDados, geradoEm: hoje, taxas, agregado: agr, achados }, null, 1));
    resumo(agr, ids, achados, dif, hash, segundos, jobs, relDir, { hashRegulares, hashChefes, semRegulares: a.semRegulares });
    if (a.combos) imprimirCombosDaCpu(registros);
  } finally {
    await server.close();
  }
}

/**
 * `--varrer-dano 1,0.9,0.8`: só os chefões, uma rodada por fator `danoRecebido` (aplicado em memória a TODOS os chefões do filtro).
 * Imprime taxa x fator por chefão e nível. Sanidade (spec §4.4 item 5): a taxa tem de CAIR quando o fator cai; se o menor fator
 * não der taxa menor que o maior, há bug no motor, e o comando falha.
 */
async function varrerDano(a, m, ids, versaoDados) {
  const chefoes = chefoesDe(m).filter((c) => !a.chefes || a.chefes.includes(c.chefe));
  const fatores = a.varrerDano;
  console.log(`varredura: ${chefoes.map((c) => c.chefe).join(', ')} x fatores ${fatores.join(', ')} (${a.sementes} sementes, níveis ${a.niveis.join(',')})`);
  const celulas = {};
  for (const f of fatores) {
    const ajustes = { ...(a.ajustes ?? {}) };
    for (const c of chefoes) ajustes[c.chefe] = { ...(ajustes[c.chefe] ?? {}), chefe: { ...(ajustes[c.chefe]?.chefe ?? {}), danoRecebido: f } };
    const af = { ...a, ajustes };
    const tarefas = m.sim.montarTarefas(ids, chefoes, paramsDe(af));
    const { registros } = await rodarWorkers(af, tarefas.length);
    registros.sort((x, y) => x.idx - y.idx);
    const agr = m.agr.agregar(registros, ids, chefoes, paramsDe(af));
    for (const s of agr.resumoChefes) celulas[`${s.chefe}|${s.nivel}|${f}`] = s;
    console.log(`  fator ${f}: ${registros.length} lutas`);
  }
  const pc = (x) => `${(x * 100).toFixed(1).padStart(5)}%`;
  let falhou = false;
  const saida = [];
  for (const nivel of a.niveis) {
    console.log(`\n${nivel === 1 ? 'NORMAL' : 'DIFÍCIL'} (jogador vence / KO / duração) por fator`);
    console.log(`chefão     meta    ${fatores.map((f) => String(f).padStart(15)).join('')}`);
    for (const c of chefoes) {
      const linha = fatores.map((f) => celulas[`${c.chefe}|${nivel}|${f}`]);
      if (linha.some((x) => !x)) continue;
      const meta = linha[0].meta;
      console.log(
        `${c.chefe.padEnd(10)} ${String(Math.round(meta[0] * 100)).padStart(2)}-${String(Math.round(meta[1] * 100)).padEnd(2)}%  ${linha
          .map((s) => `${pc(s.jogador.taxa)} ${(s.porKo * 100).toFixed(0).padStart(3)}% ${s.duracaoSeg.toFixed(0).padStart(3)}s${s.ok.taxa ? '*' : ' '}`.padStart(15))
          .join('')}`,
      );
      const primeiro = linha[0].jogador.taxa;
      const ultimo = linha[linha.length - 1].jogador.taxa;
      const decrescente = fatores.length < 2 || fatores[0] <= fatores[fatores.length - 1] || ultimo < primeiro;
      if (!decrescente) {
        falhou = true;
        console.log(`  SANIDADE FALHOU: ${c.chefe} ${nivel === 1 ? 'NORMAL' : 'DIFÍCIL'} não cai quando o fator cai (${pc(primeiro)} -> ${pc(ultimo)})`);
      }
      saida.push({ chefe: c.chefe, nivel, meta, pontos: fatores.map((f, i) => ({ fator: f, taxa: linha[i].jogador.taxa, n: linha[i].jogador.n, ko: linha[i].porKo, duracao: linha[i].duracaoSeg, pior: linha[i].pior, melhor: linha[i].melhor })) });
    }
  }
  console.log('\n* = dentro da meta da rampa. Aproximação CPU x CPU: não é a taxa de uma pessoa.');
  writeFileSync(join(a.saida, 'varredura.json'), JSON.stringify({ versaoDados, parametros: paramsDe(a), fatores, resultado: saida }, null, 1));
  if (falhou) process.exitCode = 1;
}

/** Uma linha por chefão e nível: taxa do jogador contra a meta da rampa, KO, duração e o pior/melhor desafiante. */
function imprimirChefoes(agr) {
  const pc = (x) => `${(x * 100).toFixed(1).padStart(5)}%`;
  if (!agr.resumoChefes.length) return;
  console.log('\nchefão     fator nível   jogador vence  meta     KO     tempo  duração  pior            melhor');
  for (const s of agr.resumoChefes) {
    const f = agr.danoRecebido?.[s.chefe] ?? 1;
    const bandeira = s.ok.taxa ? 'ok ' : 'FORA';
    const crit = s.ok.ko && s.ok.duracao && s.ok.pior && s.ok.melhor && s.ok.travadas ? '' : ' [critério fora]';
    console.log(
      `${s.chefe.padEnd(10)} ${String(Number(f.toFixed(3))).padEnd(5)} ${s.nivel === 1 ? 'NORMAL ' : 'DIFÍCIL'} ${pc(s.jogador.taxa)} (${String(s.jogador.k).padStart(3)}/${String(s.jogador.n).padEnd(3)}) ${String(Math.round(s.meta[0] * 100)).padStart(2)}-${String(Math.round(s.meta[1] * 100)).padEnd(2)}% ${bandeira} ${pc(s.porKo)} ${pc(s.porTempo)} ${s.duracaoSeg.toFixed(0).padStart(4)} s  ${(s.pior.desafiante + ' ' + (s.pior.taxa * 100).toFixed(0) + '%').padEnd(15)} ${s.melhor.desafiante} ${(s.melhor.taxa * 100).toFixed(0)}%${crit}`,
    );
  }
}

/**
 * V2-4 (spec §9, aceite): quantos combos próprios COMPLETOS a CPU fez por luta. As duas CPUs têm o mesmo nível, então "por luta" soma os dois
 * lados e "por lado" divide por dois. Só conta lutas jogadas com `--motor-v2 combos` (o `Registro` tem `combosProprios`).
 */
function imprimirCombosDaCpu(registros) {
  const rotulo = (n) => (n === 1 ? 'NORMAL ' : n === 2 ? 'DIFÍCIL' : `nível ${n}`);
  console.log('\ncombos próprios completos da CPU (V2-4)   lutas  por luta  por lado  lutas com >= 1');
  for (const tipo of ['regular', 'chefe']) {
    for (const nivel of [...new Set(registros.map((r) => r.nivel))].sort()) {
      const rs = registros.filter((r) => r.tipo === tipo && r.nivel === nivel && r.combosProprios);
      if (!rs.length) continue;
      const total = rs.reduce((s, r) => s + r.combosProprios[0] + r.combosProprios[1], 0);
      const com = rs.filter((r) => r.combosProprios[0] + r.combosProprios[1] >= 1).length;
      console.log(`  ${tipo.padEnd(8)} ${rotulo(nivel)}                      ${String(rs.length).padStart(5)}  ${(total / rs.length).toFixed(2).padStart(8)}  ${(total / rs.length / 2).toFixed(2).padStart(9)}  ${((com / rs.length) * 100).toFixed(0).padStart(5)}%`);
    }
  }
}

function resumo(agr, ids, achados, dif, hash, segundos, jobs, relDir, hashes) {
  const pc = (x) => `${(x * 100).toFixed(1).padStart(5)}%`;
  if (!hashes.semRegulares) console.log('\nlutador     lutas  vitórias   taxa  IC95        duração  tempo');
  for (const id of hashes.semRegulares ? [] : ids) {
    const l = agr.porLutador[id];
    console.log(
      `${id.padEnd(10)} ${String(l.lutas).padStart(6)} ${String(l.vitorias).padStart(9)} ${pc(l.geral.taxa)}  ${(l.geral.lo * 100).toFixed(0).padStart(3)}-${(l.geral.hi * 100).toFixed(0).padEnd(3)}   ${l.duracaoSeg.toFixed(0).padStart(5)} s  ${pc(l.lutasPorTempo)}`,
    );
  }
  imprimirChefoes(agr);
  console.log(`hash das lutas regulares ${hashes.semRegulares ? '(não jogadas)' : hashes.hashRegulares}; das de chefe ${hashes.hashChefes}`);
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
