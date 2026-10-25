#!/usr/bin/env node
/**
 * Conferência do trailer de abertura (R-14): `npm run trailer:escalar -- [opções]`.
 *
 * O nome ficou, mas a ferramenta NÃO escala mais: os dois lutadores são humanos e a luta é a PARTITURA (src/data/trailer/partitura.ts, escrita à mão). Ela roda o diretor REAL sobre as tomadas
 * compiladas e CONFERE: cada batida cai no tick do plano que o roteiro pede e no tick do motor que a partitura declara; as regras de ritmo (ninguém parado mais de 30 ticks, os dois nunca parados
 * juntos mais de 12, nada congela além da tarja do super, nenhum plano termina em nocaute imóvel); e a impressão (hash) de cada plano contra a gravada na partitura. Sai com 0 se tudo confere.
 *
 *   --plano P5        só este plano de luta (P1, P2, P3, P4, P5, P6, P7, P9)
 *   --rastro          imprime o RASTRO do plano (tick a tick: estados, distância, vida, energia, contatos): o instrumento de afinar a partitura à mão
 *   --de N --ate N    recorta o rastro (ticks do plano, 0 a 191)
 *   --verificar       só o que o CI faz (impressões); apelido do modo padrão, mantido por compatibilidade
 *
 * Nada aqui toca no estado do jogo: cada luta monta a PRÓPRIA `Game` em memória. O TypeScript do repositório é carregado pelo Vite (modo SSR), o mesmo transformador do Vitest.
 * Depois de afinar, o resultado PRECISA ser aprovado por olho (prévia `?trailer=Px`, Apolo/dono): a ferramenta garante que os golpes caem no tempo, não que a luta é bonita.
 */
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AJUDA = [
  'uso: npm run trailer:escalar -- [--plano P5] [--rastro [--de N] [--ate N]] [--verificar]',
  '  (sem opções)     confere batidas, regras de ritmo e impressão de todos os planos de luta',
  '  --plano P5       só este plano (P1 P2 P3 P4 P5 P6 P7 P9)',
  '  --rastro         imprime o rastro tick a tick do plano (afinar a partitura)',
  '  --de N --ate N   recorta o rastro (ticks do plano)',
  '  --verificar      só confere as impressões das tomadas (o que o CI faz)',
].join('\n');

function lerArgumentos(argv) {
  const a = { planos: [], rastro: false, de: 0, ate: 191, verificar: false, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${t} precisa de um valor`);
      return v;
    };
    if (t === '--plano') a.planos.push(...valor().split(',').map((x) => x.trim()).filter(Boolean));
    else if (t === '--rastro') a.rastro = true;
    else if (t === '--de') a.de = Number(valor());
    else if (t === '--ate') a.ate = Number(valor());
    else if (t === '--verificar') a.verificar = true;
    else if (t === '--ajuda' || t === '-h' || t === '--help') a.ajuda = true;
    else throw new Error(`opção desconhecida: ${t}`);
  }
  if (!Number.isInteger(a.de) || !Number.isInteger(a.ate) || a.de < 0 || a.ate < a.de) throw new Error('--de/--ate: inteiros, 0 <= de <= ate');
  return a;
}

async function principal() {
  const a = lerArgumentos(process.argv.slice(2));
  if (a.ajuda) {
    console.log(AJUDA);
    return 0;
  }
  const server = await createServer({
    root: RAIZ, configFile: false, appType: 'custom', logLevel: 'error',
    server: { middlewareMode: true, hmr: false, ws: false }, optimizeDeps: { noDiscovery: true, include: [] },
  });
  try {
    const esc = await server.ssrLoadModule('/ferramentas/trailer/escalar.ts');
    const elencoMod = await server.ssrLoadModule('/ferramentas/balanco/elenco.ts');
    const dados = await server.ssrLoadModule('/src/data/trailer/roteiro.ts');
    const tomadasMod = await server.ssrLoadModule('/src/data/trailer/tomadas.ts');
    const partituraMod = await server.ssrLoadModule('/src/data/trailer/partitura.ts');
    const tipos = await server.ssrLoadModule('/src/data/trailer/tipos.ts');
    const roteiro = dados.ROTEIRO;
    const elenco = elencoMod.montarElenco();
    const tomadas = tomadasMod.TOMADAS;
    const planosDeLuta = roteiro.planos.filter(tipos.temMotor);
    const desconhecidos = a.planos.filter((id) => !planosDeLuta.some((p) => p.id === id));
    if (desconhecidos.length) throw new Error(`plano(s) sem motor ou inexistente(s): ${desconhecidos.join(', ')} (válidos: ${planosDeLuta.map((p) => p.id).join(' ')})`);
    const alvos = planosDeLuta.filter((p) => a.planos.length === 0 || a.planos.includes(p.id));

    const { amostras, impressoes, reservas } = esc.percorrer(roteiro, tomadas, elenco);
    let ruim = 0;
    for (const plano of alvos) {
      const t = tomadas[plano.id];
      const am = amostras.get(plano.id) ?? [];
      const imp = impressoes.get(plano.id);
      const gravada = partituraMod.PARTITURA[plano.id]?.impressao;
      const impressaoOk = t !== undefined && imp === gravada;
      console.log(`\n== ${plano.id}  ${plano.c1} x ${plano.c2}  (inicio ${t?.inicio ?? '-'}, ${t ? t.inputs.p1.length : 0} updates de entrada)`);
      if (a.rastro) {
        for (const l of esc.rastroDoPlano(am, a.de, a.ate)) console.log(l);
        console.log('');
      }
      if (!a.verificar && t) {
        const bs = esc.medirBatidas(plano, t, am);
        for (const b of bs) {
          if (!b.ok) ruim++;
          console.log(`  batida ${b.i} ${b.tipo}: declarada no motor ${b.declarado}, real ${b.real ?? '-'}, tick do plano ${b.tau ?? '-'} (alvo ${b.alvo} +-${b.folga}) ${b.ok ? 'ok' : 'FORA'}`);
        }
        const r = esc.medirRegras(am);
        const regras = [
          [`parado max ${r.paradoMax[0]}/${r.paradoMax[1]} (<= 30)`, r.paradoMax[0] <= 30 && r.paradoMax[1] <= 30],
          [`os dois parados juntos max ${r.paradosJuntosMax} (<= 12)`, r.paradosJuntosMax <= 12],
          [`congelado max ${r.congeladoMax} (<= ${plano.pede.some((b) => b.tipo === 'super') ? 66 : 0})`, r.congeladoMax <= (plano.pede.some((b) => b.tipo === 'super') ? 66 : 0)],
          [`ultimo quadro ${r.ultimo.join('/')} ${r.ultimoEmMovimento ? 'em movimento' : 'IMOVEL'}`, r.ultimoEmMovimento],
        ];
        for (const [txt, ok] of regras) {
          if (!ok) ruim++;
          console.log(`  regra: ${txt} ${ok ? 'ok' : 'FORA'}`);
        }
      }
      if (!impressaoOk) ruim++;
      console.log(`  impressao ${imp ?? '-'} ${impressaoOk ? '(confere com a partitura)' : `DIFERENTE da gravada na partitura (${gravada ?? '-'}): copie ${imp ?? '-'} para PARTITURA.${plano.id}.impressao se a luta mudou de propósito`}`);
    }
    if (reservas.length) {
      console.error(`planos em reserva: ${reservas.join(', ')}`);
      ruim++;
    }
    console.log(ruim ? `\n${ruim} item(ns) fora.` : '\ntudo confere.');
    return ruim ? 1 : 0;
  } finally {
    await server.close();
  }
}

principal().then(
  (c) => process.exit(c),
  (e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  },
);
