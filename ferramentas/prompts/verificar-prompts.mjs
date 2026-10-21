// Verifica docs/prompts/*.md de forma independente do montador.
import fs from 'node:fs';
import path from 'node:path';

const DIR = 'C:/Projetos/Web/InnoGames/InnoFighters/docs/prompts';
const arquivos = fs.readdirSync(DIR).filter(f => f.endsWith('.md')).sort();
const falhas = [];
const PROIBIDOS = ['[BLOCO', 'BLOCO A', 'BLOCO B', 'BLOCO C', 'cole o bloco', '<id>', 'TODO', '[COR]', '[EFFECT]', '[EXTRAS', '[descreva', 'undefined', 'null', 'NaN', '[object'];
const NOMES = ['WEI LONG', 'MIN-JI', 'HAYATO', 'AMINU', 'CENTELLA', 'CAMILLE', 'NILA', 'BAATAR'];

const idx = fs.readFileSync(path.join(DIR, '00-indice.md'), 'utf8');
const esperado = {};
for (const m of idx.matchAll(/^\| (\d\d-[\w-]+\.md) \| (\d+) \| (\d+) \|$/gm)) esperado[m[1]] = { p: +m[2], c: +m[3] };

const resumo = {};
for (const f of arquivos) {
  const t = fs.readFileSync(path.join(DIR, f), 'utf8').replace(/\r\n/g, '\n');
  // sensível a maiúsculas (evita falso positivo como "pe-nnan-t"), exceto "cole o bloco" e "bloco"
  for (const p of PROIBIDOS) if (t.includes(p)) falhas.push(`${f}: marcador proibido "${p}"`);
  for (const p of ['cole o bloco', 'bloco a', 'bloco b', 'bloco c', 'todo:']) if (t.toLowerCase().includes(p)) falhas.push(`${f}: marcador proibido "${p}" (sem caixa)`);
  if (/[^.]\.\.(\s|$)/m.test(t)) falhas.push(`${f}: ponto duplo ".." no texto`);
  if ((t.match(/```/g) || []).length % 2) falhas.push(`${f}: cercas de código desbalanceadas`);
  if (t.includes('NÃO GERE AINDA')) falhas.push(`${f}: marca "NÃO GERE AINDA" (liberada pelo dono em 2026-10-20)`);
  // o veredito do WEI LONG e o efeito já aprovado são registro histórico da época do Gemini
  const semHistorico = t.replace(/## Veredito da curadoria[\s\S]*?\n---\n/, '').replace(/arquivo original do Gemini/g, '');
  if (/\bGemini\b/.test(semHistorico)) falhas.push(`${f}: cita o Gemini como gerador (agora é o Runway)`);
  if (f === '00-indice.md') continue;
  if (f === '03-hayato.md' && (/VERSÃO B|versão B|white karate gi|dark navy/.test(t) || !t.includes('charcoal-graphite'))) falhas.push(`${f}: HAYATO não está só no traje A2`);

  // secciona por cabeçalhos ### Prompt e #### Correção
  const secoes = t.split(/\n(?=#{2,4} )/);
  const prompts = secoes.filter(s => /^### Prompt \d+[A-Z]? — /.test(s));
  const corr = secoes.filter(s => /^#### Correção \d+ — /.test(s));
  // sequência: números crescem de 0 ou 1 a cada passo, começando em 1; número repetido só com letras em ordem (1A, 1B)
  let ant = { n: 0, l: '' };
  prompts.forEach((s, i) => {
    const mm = s.match(/^### Prompt (\d+)([A-Z]?)/);
    const n = +mm[1], l = mm[2];
    const ok = (n === ant.n + 1 && (l === '' || l === 'A')) || (n === ant.n && l && ant.l && l.charCodeAt(0) === ant.l.charCodeAt(0) + 1);
    if (!ok) falhas.push(`${f}: prompt fora de sequência (${n}${l} depois de ${ant.n}${ant.l}, posição ${i + 1})`);
    ant = { n, l };
    const cods = [...s.matchAll(/```\n([\s\S]*?)\n```/g)].map(m => m[1].trim());
    if (cods.length !== 1) falhas.push(`${f}: prompt ${n} com ${cods.length} blocos de código`);
    else if (cods[0].length < 80) falhas.push(`${f}: prompt ${n} vazio ou curto (${cods[0].length})`);
    for (const campo of ['**Anexar:**', '**Salvar como:**', '**Checagem rápida:**']) if (!s.includes(campo)) falhas.push(`${f}: prompt ${n} sem ${campo}`);
    // regras do Runway (2026-10-20): uma só referência; folha nova com espaçamento e pé no chão; nocaute à esquerda
    const anexo = s.match(/\*\*Anexar:\*\* (.*)/)?.[1] ?? '';
    const imgsAnexo = new Set((anexo.match(/`[^`]+\.(?:png|jpe?g|webp)`/g) || []).map(x => x.replace(/-v\d+\.png`$/, '`')));
    if (imgsAnexo.size > 1 && !/troque pela/.test(anexo)) falhas.push(`${f}: prompt ${n} anexa ${imgsAnexo.size} imagens (regra: uma só)`);
    if (/ e `[^`]+\.(?:png|jpe?g|webp)`/.test(anexo)) falhas.push(`${f}: prompt ${n} manda anexar duas imagens juntas`);
    // só geração de folha nova (as edições 1A/1B do WEI LONG mantêm as figuras no lugar, não levam o bloco)
    if (cods[0] && cods[0].startsWith('2D fighting game character sprite sheet')) {
      if (!cods[0].includes('IMPORTANT SPACING')) falhas.push(`${f}: prompt ${n} folha sem IMPORTANT SPACING`);
      if (!/at least one foot is flat on the baseline/.test(cods[0])) falhas.push(`${f}: prompt ${n} folha sem "um pé no chão"`);
      if (/knocked out/.test(cods[0]) && !/head on the LEFT side/.test(cods[0])) falhas.push(`${f}: prompt ${n} nocaute sem cabeça à esquerda`);
    }
    // coerência de personagem e fundo
    if (cods[0]) {
      const pers = NOMES.filter(nm => cods[0].includes(`CHARACTER — ${nm}:`));
      if (pers.length > 1) falhas.push(`${f}: prompt ${n} mistura personagens ${pers}`);
      if (pers.length === 1) {
        const hexCab = t.match(/\| Cor de fundo \| \w+ `(#[0-9A-F]{6})`/)?.[1];
        const hexP = cods[0].match(/Background color: solid flat [\w ]*?(#[0-9A-F]{6})/)?.[1];
        if (!hexCab || hexP !== hexCab) falhas.push(`${f}: prompt ${n} fundo ${hexP} difere do cabeçalho ${hexCab}`);
        if (/SHEET/.test(cods[0]) && !/sprite sheet/.test(cods[0])) falhas.push(`${f}: prompt ${n} folha sem regras gerais`);
      }
    }
  });
  corr.forEach(s => {
    const cods = [...s.matchAll(/```\n([\s\S]*?)\n```/g)].map(m => m[1].trim());
    if (cods.length !== 1 || cods[0].length < 40) falhas.push(`${f}: correção vazia ou malformada: ${s.slice(0, 40)}`);
  });
  if (f === '01-wei-long.md') {
    const topo = t.split('\n').slice(0, 5).join('\n');
    if (!topo.includes('## Veredito da curadoria')) falhas.push(`${f}: veredito não está no topo`);
    for (const k of ['REPROVADA', 'APROVADA', '8b788295', '1bcee91a']) if (!t.includes(k)) falhas.push(`${f}: veredito sem "${k}"`);
    const anexos = prompts.filter(s => /^### Prompt 1[AB]/.test(s)).map(s => s.match(/\*\*Anexar:\*\* (.*)/)[1]);
    if (anexos.length !== 2 || anexos.some(a => !a.includes('UMA imagem só'))) falhas.push(`${f}: etapas 1A/1B sem "UMA imagem só"`);
  }
  resumo[f] = { prompts: prompts.length, correcoes: corr.length, naoGere: (t.match(/\*\*NÃO GERE AINDA\*\*/g) || []).length };
  const e = esperado[f];
  if (!e) falhas.push(`${f}: ausente da tabela de contagem do índice`);
  else {
    if (e.p !== prompts.length) falhas.push(`${f}: índice diz ${e.p} prompts, arquivo tem ${prompts.length}`);
    if (e.c !== corr.length) falhas.push(`${f}: índice diz ${e.c} correções, arquivo tem ${corr.length}`);
  }
}
for (const f of Object.keys(esperado)) if (!arquivos.includes(f)) falhas.push(`índice cita ${f}, que não existe`);
const esperados = ['00-indice.md', '01-wei-long.md', '02-min-ji.md', '03-hayato.md', '04-aminu.md', '05-centella.md', '06-camille.md', '07-nila.md', '08-baatar.md', '09-cenarios.md'];
for (const f of esperados) if (!arquivos.includes(f)) falhas.push(`falta o arquivo ${f}`);

console.log(JSON.stringify(resumo, null, 1));
console.log(falhas.length ? 'FALHAS:\n' + falhas.join('\n') : 'OK: nenhuma falha');
process.exitCode = falhas.length ? 1 : 0;
