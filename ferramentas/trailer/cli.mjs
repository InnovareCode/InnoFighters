#!/usr/bin/env node
/**
 * Escalação do trailer de abertura (M2): `npm run trailer:escalar -- [opções]`.
 *
 *   --plano P5        só este plano de luta (P1, P2, P3, P4, P5, P6, P7, P9); as outras tomadas ficam como estão
 *   --sementes N      sementes tentadas por plano (padrão 300); sobe para achar tomada mais bonita
 *   --inicio-max N    teto de updates de pré-rolagem (padrão 1500; o limite do roteiro é 2400)
 *   --niveis a,b;c,d  combinações de nível da CPU [P1,P2] (padrão 2,2;1,2;2,1)
 *   --simular         procura e imprime, mas NÃO grava tomadas.ts
 *   --verificar       não procura: só roda o diretor sobre as tomadas gravadas e confere as impressões (o que o CI faz)
 *
 * Nada aqui toca no estado do jogo: cada luta monta a PRÓPRIA `Game` em memória. O TypeScript do repositório é carregado pelo Vite (modo SSR), o mesmo
 * transformador do Vitest. Depois de escalar, o resultado PRECISA ser aprovado por olho (prévia `?trailer=Px`, Apolo/dono): a ferramenta garante que os golpes
 * pedidos caem no tempo pedido, não que a tomada é bonita.
 */
import { writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer } from 'vite';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');
const AJUDA = [
  'uso: npm run trailer:escalar -- [--plano P5] [--sementes N] [--inicio-max N] [--niveis 2,2;1,2] [--simular] [--verificar]',
  '  --plano P5       só este plano (P1 P2 P3 P4 P5 P6 P7 P9)',
  '  --sementes N     sementes por plano (padrão 300)',
  '  --inicio-max N   teto de pré-rolagem em updates (padrão 1500; limite do roteiro 2400)',
  '  --niveis a,b;c,d combinações [P1,P2] de nível da CPU (padrão 2,2;1,2;2,1)',
  '  --simular        não grava tomadas.ts',
  '  --verificar      só confere as impressões das tomadas gravadas',
].join('\n');

function lerArgumentos(argv) {
  const a = { planos: [], sementes: 300, inicioMax: 1500, niveis: null, simular: false, verificar: false, ajuda: false };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${t} precisa de um valor`);
      return v;
    };
    if (t === '--plano') a.planos.push(...valor().split(',').map((x) => x.trim()).filter(Boolean));
    else if (t === '--sementes') a.sementes = Number(valor());
    else if (t === '--inicio-max') a.inicioMax = Number(valor());
    else if (t === '--niveis') a.niveis = valor().split(';').map((par) => par.split(',').map(Number));
    else if (t === '--simular') a.simular = true;
    else if (t === '--verificar') a.verificar = true;
    else if (t === '--ajuda' || t === '-h' || t === '--help') a.ajuda = true;
    else throw new Error(`opção desconhecida: ${t}`);
  }
  if (!Number.isInteger(a.sementes) || a.sementes < 1 || a.sementes > 20000) throw new Error('--sementes: inteiro de 1 a 20000');
  if (!Number.isInteger(a.inicioMax) || a.inicioMax < 100 || a.inicioMax > 2400) throw new Error('--inicio-max: inteiro de 100 a 2400');
  if (a.niveis && !a.niveis.every((p) => p.length === 2 && p.every((n) => n === 0 || n === 1 || n === 2))) throw new Error('--niveis: pares "a,b" com 0, 1 ou 2, separados por ;');
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
    const tipos = await server.ssrLoadModule('/src/data/trailer/tipos.ts');
    const roteiro = dados.ROTEIRO;
    const elenco = elencoMod.montarElenco();
    const atuais = { ...tomadasMod.TOMADAS };
    const planosDeLuta = roteiro.planos.filter(tipos.temMotor);
    const desconhecidos = a.planos.filter((id) => !planosDeLuta.some((p) => p.id === id));
    if (desconhecidos.length) throw new Error(`plano(s) sem motor ou inexistente(s): ${desconhecidos.join(', ')} (válidos: ${planosDeLuta.map((p) => p.id).join(' ')})`);
    const alvos = planosDeLuta.filter((p) => a.planos.length === 0 || a.planos.includes(p.id));

    if (!a.verificar) {
      const t0 = Date.now();
      let falhou = 0;
      for (const plano of alvos) {
        const r = esc.escalarPlano(elenco, plano, {
          sementes: a.sementes, cpus: a.niveis ?? esc.CPUS_PADRAO, inicioMaximo: a.inicioMax, planos: a.planos, aoProgredir: (m) => console.log(m),
        });
        if (!r.tomada) {
          falhou++;
          console.error(`\n${plano.id}: NENHUMA tomada cumpre o pedido (${r.simulacoes} simulações, ${r.comTodasAsBatidas} com todas as batidas).`);
          plano.pede.forEach((b, i) => console.error(`  batida ${i} (${b.tipo} do lutador ${b.lutador}${b.golpe ? ' ' + b.golpe : ''}): apareceu em ${r.porBatida[i]} de ${r.simulacoes} simulações`));
          const top = [...r.recusas.entries()].sort((x, y) => y[1] - x[1]).slice(0, 5);
          for (const [m, n] of top) console.error(`  recusa (${n}x): ${m}`);
          console.error('  -> aumente --sementes / --inicio-max, afrouxe `folga` ou `alvo` no roteiro, ou troque a exigência do plano.');
          continue;
        }
        atuais[plano.id] = { ...r.tomada, impressao: '00000000' };
        console.log(`${plano.id}: semente ${r.tomada.semente} cpu [${r.tomada.cpu}] inicio ${r.tomada.inicio} batidas nos ticks do plano ${JSON.stringify(r.taus)} acertos ${r.acertos} vidaMin ${r.vidaMin.toFixed(2)} score ${r.score.toFixed(2)} (${r.comTodasAsBatidas}/${r.simulacoes} simulações tinham todas as batidas)`);
      }
      console.log(`\nbusca: ${((Date.now() - t0) / 1000).toFixed(1)} s`);
      // impressões: o diretor REAL roda o trailer inteiro sobre as tomadas
      const { impressoes, reservas } = esc.impressoesDoDiretor(roteiro, atuais, elenco);
      for (const p of planosDeLuta) {
        const t = atuais[p.id];
        const imp = impressoes.get(p.id);
        if (t && imp) atuais[p.id] = { ...t, impressao: imp };
      }
      if (reservas.length) console.error(`aviso: planos em reserva no diretor (sem tomada ou pré-rolagem incompleta): ${reservas.join(', ')}`);
      if (a.simular) console.log('--simular: nada foi gravado.');
      else {
        const arquivo = join(RAIZ, 'src', 'data', 'trailer', 'tomadas.ts');
        writeFileSync(arquivo, esc.textoDasTomadas(roteiro, atuais), 'utf8');
        console.log(`gravado ${arquivo}`);
      }
      return falhou ? 2 : 0;
    }

    // --verificar: o que o CI faz
    const { impressoes, reservas } = esc.impressoesDoDiretor(roteiro, atuais, elenco);
    let ruim = 0;
    for (const p of planosDeLuta) {
      const t = atuais[p.id];
      const imp = impressoes.get(p.id);
      const ok = t && imp === t.impressao;
      if (!ok) ruim++;
      console.log(`${p.id}: ${ok ? 'confere' : `DIFERENTE (gravada ${t?.impressao ?? '-'}, agora ${imp ?? '-'}) -> rode npm run trailer:escalar -- --plano ${p.id}`}`);
    }
    if (reservas.length) console.error(`planos em reserva: ${reservas.join(', ')}`);
    return ruim || reservas.length ? 1 : 0;
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
