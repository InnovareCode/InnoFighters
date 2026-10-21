#!/usr/bin/env node
/**
 * Pipeline de sprites (F2): folhas 4x3 em arte-fonte/lutadores/<id>/folhas/ -> atlas C1 v2 em sprites-gerados/<id>/.
 *
 * Uso:  npm run sprites -- <id> [opções]
 *   --folhas f1,f4         só estas folhas (rodada parcial, para teste); padrão: todas que existirem
 *   --folha f2=arquivo.png usa este arquivo (dentro de folhas/) em vez da maior versão -vN
 *   --espelhar f2:koFloor  espelha o quadro (ex.: nocaute com a cabeça do lado errado); repetível
 *   --saida <pasta>        padrão: sprites-gerados/<id>   (NUNCA a pasta de produção public/assets)
 *   --altura-ref <px>      altura do idle0 no atlas (padrão 410, igual ao legado)
 *   --escala <n>           escala fixa (obrigatória se não houver f1)
 *   --tolerancia <n>       distância de cor até o fundo puro (padrão 48)
 *   --sem-contato          não gera o contact-sheet
 *
 * Saída: atlas-0.webp, atlas-1.webp..., atlas.json (C1 v2), retrato.png, relatorio.json e, em
 * arte-fonte/lutadores/<id>/, contact-sheet-<id>.png (fundo escuro) e contact-sheet-<id>-claro.png.
 */
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gerarContato } from './contato.mjs';
import { gerarLutador } from './executar.mjs';

const RAIZ = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

function lerArgumentos(argv) {
  const a = { id: null, folhas: null, arquivos: {}, espelhar: {}, saida: null, opcoes: {}, contato: true };
  for (let i = 0; i < argv.length; i++) {
    const t = argv[i];
    const valor = () => {
      const v = argv[++i];
      if (v === undefined) throw new Error(`${t} precisa de um valor`);
      return v;
    };
    if (t === '--folhas') a.folhas = valor().split(',').filter(Boolean);
    else if (t === '--folha') {
      const [f, nome] = valor().split('=');
      if (!f || !nome) throw new Error('--folha espera f2=arquivo.png');
      a.arquivos[f] = nome;
    } else if (t === '--espelhar') {
      const [f, pose] = valor().split(':');
      if (!f || !pose) throw new Error('--espelhar espera f2:koFloor');
      (a.espelhar[f] ??= []).push(pose);
    } else if (t === '--saida') a.saida = resolve(valor());
    else if (t === '--altura-ref') a.opcoes.alturaRef = Number(valor());
    else if (t === '--escala') a.opcoes.escala = Number(valor());
    else if (t === '--tolerancia') a.opcoes.tolerancia = Number(valor());
    else if (t === '--sem-contato') a.contato = false;
    else if (t.startsWith('--')) throw new Error(`opcao desconhecida: ${t}`);
    else if (!a.id) a.id = t;
    else throw new Error(`argumento sobrando: ${t}`);
  }
  if (!a.id || !/^[a-z0-9-]+$/.test(a.id)) throw new Error('uso: npm run sprites -- <id> [opcoes]   (ex.: hayato)');
  for (const [f, nome] of Object.entries(a.arquivos)) a.arquivos[f] = join(RAIZ, 'arte-fonte', 'lutadores', a.id, 'folhas', nome);
  return a;
}

async function principal() {
  const a = lerArgumentos(process.argv.slice(2));
  const saida = a.saida ?? join(RAIZ, 'sprites-gerados', a.id);
  if (/public[\\/]assets/.test(saida)) throw new Error('recuso gravar em public/assets: gere em sprites-gerados/ e a integracao (F3) copia');
  console.log(`sprites: ${a.id} -> ${saida}`);
  const r = await gerarLutador({
    raiz: RAIZ, id: a.id, folhas: a.folhas, saida, arquivos: a.arquivos, espelhar: a.espelhar,
    opcoes: a.opcoes, log: (s) => console.log(s),
  });
  const rel = r.relatorio;
  console.log(`escala ${rel.escala} (alturaRef ${rel.alturaRef}); atlas ${rel.atlas.tamanho.join('x')} em ${rel.atlas.paginas} pagina(s), ${rel.atlas.quadros} quadros`);
  for (const [f, i] of Object.entries(rel.folhas)) {
    console.log(`  ${f}: fundo ${i.fundo.join(',')} (${i.chave}), ${i.componentes} componentes, halo ${(i.haloAntes * 100).toFixed(1)}% -> ${(i.haloDepois * 100).toFixed(1)}%, altura mediana ${i.alturaMediana}px`);
  }
  for (const av of rel.avisos) console.log(`  AVISO: ${av}`);
  if (a.contato) {
    const dirContato = join(RAIZ, 'arte-fonte', 'lutadores', a.id);
    const e = await gerarContato({ dirAtlas: saida, arquivoSaida: join(dirContato, `contact-sheet-${a.id}.png`) });
    await gerarContato({ dirAtlas: saida, arquivoSaida: join(dirContato, `contact-sheet-${a.id}-claro.png`), fundo: '#f2efe6' });
    console.log(`contact-sheet: arte-fonte/lutadores/${a.id}/contact-sheet-${a.id}.png (${e.largura}x${e.altura}) e -claro.png`);
  }
}

principal().catch((e) => {
  console.error(`ERRO: ${e.message}`);
  process.exit(1);
});
