// Monta docs/prompts/*.md a partir dos blocos de docs/prompts-arte.md (fonte única), sem transcrição manual.
import fs from 'node:fs';
import path from 'node:path';

const RAIZ = 'C:/Projetos/Web/InnoGames/InnoFighters';
const FONTE = path.join(RAIZ, 'docs/prompts-arte.md');
const SAIDA = path.join(RAIZ, 'docs/prompts');
const md = fs.readFileSync(FONTE, 'utf8').replace(/\r\n/g, '\n');
const linhas = md.split('\n');

// ---------- 1. extrair blocos de código com o contexto (último ### / #### e última linha em negrito) ----------
const blocos = [];
let sec = '', sub = '', negrito = '', dentro = false, buf = [];
for (const l of linhas) {
  if (l.startsWith('```')) {
    if (dentro) { blocos.push({ sec, sub, negrito, txt: buf.join('\n').trim() }); buf = []; dentro = false; }
    else dentro = true;
    continue;
  }
  if (dentro) { buf.push(l); continue; }
  if (/^## /.test(l)) { sec = l; sub = ''; }
  else if (/^### /.test(l)) sub = l;
  else if (/^\*\*.+\*\*/.test(l) || /^\d+\. \*\*/.test(l)) negrito = l;
}
const um = (pred, nome) => {
  const r = blocos.filter(pred);
  if (r.length !== 1) throw new Error(`esperava 1 bloco para ${nome}, achei ${r.length}`);
  return r[0].txt;
};
const A = um(b => b.txt.startsWith('2D fighting game character sprite sheet') && b.txt.includes('Exactly 12 poses') && !b.txt.includes('CHARACTER'), 'A');
const A_BAATAR = um(b => b.txt.startsWith('2D fighting game character sprite sheet') && b.txt.includes('Exactly 6 poses'), 'A_BAATAR');
const C1 = um(b => b.txt.startsWith('SHEET 1 — BASE.'), 'C1');
const C2 = um(b => b.txt.startsWith('SHEET 2 —'), 'C2');
const C3 = um(b => b.txt.startsWith('SHEET 3 —'), 'C3');
const C5 = um(b => b.txt.startsWith('SHEET 5 — EXTRAS.'), 'C5');
const NILA5 = um(b => b.txt.startsWith('SHEET 5 — SERPENT POSTURE.'), 'NILA5');
const MESTRA = um(b => b.txt.startsWith('Character reference image'), 'MESTRA');
const WEI_1A = um(b => b.txt.startsWith('Edit this sprite sheet. Change ONLY what is listed'), 'WEI_1A');
const WEI_1B = um(b => b.txt.startsWith('Edit this sprite sheet. Change ONLY the tunic'), 'WEI_1B');
const WEI_VEREDITO = (() => {
  const m = md.match(/<!-- veredito-wei:inicio -->\n([\s\S]*?)\n<!-- veredito-wei:fim -->/);
  if (!m) throw new Error('veredito do WEI LONG não achado');
  return m[1].trim();
})();
const CEN = um(b => b.txt.startsWith('Wide 2D fighting game stage'), 'CEN');
const FX = um(b => b.txt.startsWith('2D fighting game visual effect sprite'), 'FX');

const charBlock = nome => blocos.filter(b => b.txt.startsWith(`CHARACTER — ${nome}:`));
const B = {
  'wei-long': um(b => b.txt.startsWith('CHARACTER — WEI LONG:'), 'B wei'),
  'min-ji': um(b => b.txt.startsWith('CHARACTER — MIN-JI:') && !b.txt.includes('SHEET'), 'B minji'),
  hayato: um(b => b.txt.startsWith('CHARACTER — HAYATO:'), 'B hayato (traje A2)'),
  aminu: um(b => b.txt.startsWith('CHARACTER — AMINU:'), 'B aminu'),
  centella: um(b => b.txt.startsWith('CHARACTER — CENTELLA:'), 'B centella'),
  camille: um(b => b.txt.startsWith('CHARACTER — CAMILLE:'), 'B camille'),
  nila: um(b => b.txt.startsWith('CHARACTER — NILA:'), 'B nila'),
  baatar: um(b => b.txt.startsWith('CHARACTER — BAATAR:'), 'B baatar'),
};
void charBlock;
const C4de = trecho => um(b => b.txt.startsWith('SHEET 4 — SPECIAL MOVES.') && b.sub.includes(trecho), `C4 ${trecho}`);
const C4 = {
  'min-ji': C4de('MIN-JI'), hayato: C4de('HAYATO'), aminu: C4de('AMINU'),
  centella: C4de('CENTELLA'), camille: C4de('CAMILLE'), nila: C4de('NILA'),
};

// linha 3 da folha 5 por lutador (crase inline logo após "Linha 3 da folha 5")
const secaoTexto = titulo => {
  const i = md.indexOf(titulo);
  if (i < 0) throw new Error('seção não achada: ' + titulo);
  const j = md.indexOf('\n### ', i + 5);
  return md.slice(i, j < 0 ? undefined : j);
};
const extraRow3 = titulo => {
  const s = secaoTexto(titulo);
  const m = s.match(/\*\*Linha 3 da folha 5[^\n]*\n?\s*`([^`]+)`/);
  if (!m) throw new Error('linha 3 extras não achada em ' + titulo);
  return m[1].trim();
};
const ROW3_PADRAO = (() => {
  const m = C5.match(/se a ficha não tiver, use: ([^\]]+)\]/);
  if (!m) throw new Error('padrão da linha 3 não achado');
  return m[1].trim();
})();
const folha5 = row3 => C5.replace(/\[EXTRAS DO LUTADOR[^\]]*\]/, row3.replace(/\.$/, ''));

// Baatar B1..B9
const BAATAR_FOLHAS = {};
for (const m of md.matchAll(/^\| (B\d) \| `(.+)` \|$/gm)) BAATAR_FOLHAS[m[1]] = m[2].trim();
if (Object.keys(BAATAR_FOLHAS).length !== 9) throw new Error('esperava 9 folhas do BAATAR');

// cenários: rótulo numerado + bloco STAGE
const CENARIOS = blocos.filter(b => b.txt.startsWith('STAGE:')).map(b => {
  const m = b.negrito.match(/^\d+\. \*\*(.+?)\*\* \(`(\w+)`(.*)\)/);
  if (!m) throw new Error('rótulo de cenário: ' + b.negrito);
  return { rotulo: m[1], sigla: m[2], nota: m[3].replace(/^,\s*/, '').trim(), txt: b.txt };
});
if (CENARIOS.length !== 6) throw new Error('esperava 6 cenários');

// efeitos
const FX_EF = {};
const nomesFx = { 'WEI LONG': 'wei-long', HAYATO: 'hayato', 'MIN-JI': 'min-ji', AMINU: 'aminu', CENTELLA: 'centella', CAMILLE: 'camille', NILA: 'nila', BAATAR: 'baatar' };
for (const m of md.matchAll(/^\| (WEI LONG|HAYATO|MIN-JI|AMINU|CENTELLA|CAMILLE|NILA|BAATAR) \| `(.+)` \|$/gm)) FX_EF[nomesFx[m[1]]] = m[2];
if (Object.keys(FX_EF).length !== 8) throw new Error('esperava 8 efeitos');
const fxPrompt = id => FX.replace('[EFFECT]', FX_EF[id]);

// fundos (tabela da seção 4)
const FUNDO = {};
const nomesFundo = { 'WEI LONG': 'wei-long', 'MIN-JI': 'min-ji', HAYATO: 'hayato', AMINU: 'aminu', CENTELLA: 'centella', CAMILLE: 'camille', NILA: 'nila', BAATAR: 'baatar' };
for (const m of md.matchAll(/^\| (WEI LONG|MIN-JI|HAYATO|AMINU|CENTELLA|CAMILLE|NILA|BAATAR) \| (magenta|verde) `(#[0-9A-F]{6})` \| (.+) \|$/gm)) {
  FUNDO[nomesFundo[m[1]]] = { nome: m[2], hex: m[3], porque: m[4].trim() };
}
if (Object.keys(FUNDO).length !== 8) throw new Error('esperava 8 fundos');

// correções (tabela da seção 9)
const CORR = [];
{
  const s = md.slice(md.indexOf('## 9.'), md.indexOf('## 10.'));
  for (const m of s.matchAll(/^\| ([^|`]+) \| `(.+)` \|$/gm)) CORR.push({ defeito: m[1].trim(), txt: m[2].trim() });
}
if (CORR.length !== 14) throw new Error('esperava 14 correções, achei ' + CORR.length);

// ---------- 2. dados por lutador (o que não está em blocos de código) ----------
const MESTRA_REF = {
  'wei-long': null,
  'min-ji': '`arte-fonte/lutadores/min-ji/folhas/Woman_doing_taekwondo_stances_2K_20261020154418.jpg`',
  hayato: null,
};
const TRAJE = {
  'wei-long': { pt: 'painel longo até a canela, braçadeiras pretas, coque branco', en: 'long front panel reaching the shins, plain black cloth wrist bracers, white hair tied in a topknot bun' },
  'min-ji': { pt: 'laço vermelho no rabo de cavalo, gola preta no dobok branco, luvas vermelhas', en: 'red ribbon bow on the high ponytail, black collar trim on the white dobok, red fingerless sparring gloves' },
  hayato: { pt: 'gi cinza-grafite (nunca branco) com gola e barra amarelo-elétrico, raio amarelo no peito esquerdo, mecha de raio amarela no cabelo, faixa verde com duas pontas, faixa preta de bordas amarelas, mãos enfaixadas de branco, descalço', en: 'charcoal-graphite gi (never white) with electric-yellow trim on the collar and jacket hem, small yellow lightning-bolt emblem on the left chest, yellow lightning streak in the hair, green headband with two tails, black belt with yellow edges, white cloth hand wraps' },
  aminu: { pt: 'corda só na mão de TRÁS, mão da frente nua e aberta, faixa creme com bordado cobre, calção índigo', en: 'rope wrap only on the REAR fist, bare open lead hand, cream waist sash with copper embroidery, indigo shorts' },
  centella: { pt: 'máscara turquesa SEMPRE, botas altas turquesa e prata, joelheiras pretas', en: 'full turquoise-jade mask with the silver spark design always on, high turquoise-and-silver boots, black knee pads' },
  camille: { pt: 'sapatos brancos SEMPRE, macacão azul-marinho com faixas prata, luvas prata', en: 'white savate shoes always on, navy sleeveless suit with thin silver side stripes, silver boxing gloves' },
  nila: { pt: 'trança longa única, faixa de cintura vermelho-terra, barra dourada na roupa off-white', en: 'single long braid, laterite red-brown waist wrap, thin gold border on the off-white clothes' },
  baatar: { pt: 'casaco vermelho aberto no peito, calção azul-escuro, botas de bico virado, SEM chapéu', en: 'deep red zodog jacket open on the chest, dark blue shuudag briefs, upturned gutal boots, no hat' },
};
const CHECK4 = {
  'min-ji': 'linha 1: dois chutes em meia-lua com pernas diferentes; linha 2: chute tornado no ar; linha 3: voadora com o corpo na horizontal, chute aéreo e vitória com punho erguido.',
  hayato: 'linha 1: palmas juntas empurrando para a frente (sem esfera desenhada); linha 2: soco ascendente subindo, com o punho acima da cabeça no ar; linha 3: investida com soco, chute aéreo e vitória.',
  aminu: 'linha 1: soco da mão com corda, recuado e depois estendido; linha 2: palma aberta da mão nua empurrando para a frente; a corda continua na mão de trás em todas as células.',
  centella: 'linha 1: salto e corpo horizontal de barriga para baixo; linha 2: pernas cruzadas como numa tesoura, sem adversário desenhado; máscara em todas as células.',
  camille: 'linha 1: guarda de aparar, desvio com o antebraço e chute alto com a ponta do sapato; linha 2: chute baixo com a sola na altura da canela; sapatos em todas as células.',
  nila: 'linha 1: toque com dois dedos; linha 2: transição do elefante (baixa e larga) para a serpente (quase deitada); linha 3: empurrão com as duas palmas.',
};
const ROW3 = {
  'min-ji': ROW3_PADRAO, hayato: ROW3_PADRAO,
  aminu: extraRow3('### 6.1'), centella: extraRow3('### 6.2'), camille: extraRow3('### 6.3'),
};

// ---------- 3. helpers de escrita ----------
const SPEC_PAUSA = '**PARE AQUI: mostre esta imagem ao dono e espere o OK dele antes de seguir.**';
// "NÃO GERE AINDA" caiu em 2026-10-20: o dono aprovou as mecânicas ED-M1 a ED-M10 (docs/mecanicas-e3.md).
const OPCIONAL = '*Opcional: recomendada, mas não bloqueia a entrada do lutador no jogo.*';
const REF_UNICA = 'só esta imagem, nunca duas: com duas, o modelo devolve uma delas';
const junta = (...partes) => partes.join('\n\n');
const cod = t => '```\n' + t + '\n```';

function promptMd(n, p) {
  const r = [`### Prompt ${n} — ${p.titulo}`, ''];
  if (p.status) r.push(p.status, '');
  r.push(`- **Anexar:** ${p.anexar}`);
  r.push(`- **Salvar como:** ${p.salvar}`);
  r.push(`- **Checagem rápida:** ${p.check}`);
  if (p.pausa) r.push('', SPEC_PAUSA);
  r.push('', cod(p.txt), '');
  return r.join('\n');
}

function correcoesMd(id, trajeKey, baatar) {
  const f = FUNDO[id];
  const cor = `${f.hex}`;
  const t = TRAJE[trajeKey];
  const r = ['## Prompts de correção (já com o traje e o fundo deste lutador)', '',
    'No Runway, passe **só a imagem com defeito** como referência (uma imagem por prompt). **Um defeito por vez.** Onde aparecer',
    '`[R]` e `[C]`, troque pelo número da linha e da coluna da figura com problema, contando de 1 a partir do canto superior esquerdo.', '',
    '**Nocaute com a cabeça à direita, ou figura que só precisa ser espelhada ou movida: não use prompt.** A edição pontual no',
    'Runway ignora a instrução e cria artefatos (cabeça fantasma na MIN-JI). O Atlas espelha a figura por código e salva como versão nova.', ''];
  let k = 0;
  for (const c of CORR) {
    if (c.defeito.startsWith('AMINU') && id !== 'aminu') continue;
    if (c.defeito.startsWith('CENTELLA') && id !== 'centella') continue;
    let txt = c.txt.replaceAll('[COR]', cor);
    txt = txt.replace(/\[descreva o detalhe[^\]]*\]/, t.en);
    if (txt.includes('(6 figures in 3 columns and 2 rows for BAATAR)')) {
      txt = baatar
        ? txt.replace('exactly 12 figures in 4 columns and 3 rows (6 figures in 3 columns and 2 rows for BAATAR)', 'exactly 6 figures in 3 columns and 2 rows')
        : txt.replace(' (6 figures in 3 columns and 2 rows for BAATAR)', '');
    }
    if (baatar) txt = txt.replace('row 1, column 1', 'row 1, column 1');
    k++;
    r.push(`#### Correção ${k} — ${c.defeito}`, '', cod(txt), '');
  }
  r.push('Se uma edição mudar a imagem inteira (rosto novo, poses novas), descarte o resultado e volte à versão anterior.', '');
  return { md: r.join('\n'), n: k };
}

function checklistMd(id, trajeKey, baatar) {
  const t = TRAJE[trajeKey];
  return ['## Checklist de aceite (confira antes de enviar cada folha)', '',
    baatar
      ? '- [ ] 6 figuras em 3 colunas × 2 linhas, bem espaçadas, nenhuma encostando em outra nem na borda.'
      : '- [ ] 12 figuras em 4 colunas × 3 linhas, bem espaçadas, nenhuma encostando em outra nem na borda.',
    '- [ ] Faixa vazia entre as fileiras e nas bordas de cima e de baixo; nenhum pé, dedo ou punho cortado.',
    '- [ ] No andar, pelo menos um pé no chão em cada quadro (passo, nunca pulo).',
    '- [ ] Todas viradas para a **direita** (as quedas caem para a esquerda, como pedido).',
    '- [ ] Nocaute com a cabeça à **esquerda**. Se vier à direita, não corrija pelo gerador: o Atlas espelha a figura por código.',
    '- [ ] Todas do mesmo tamanho; os pés de cada linha na mesma altura.',
    `- [ ] Fundo de **uma cor só** (${FUNDO[id].nome} \`${FUNDO[id].hex}\`), chapada, sem degradê, sem chão, sem sombra, sem xadrez.`,
    '- [ ] Nenhum texto, número, linha de grade ou moldura.',
    '- [ ] Nenhum efeito: brilho, fogo, raio, faísca, rastro, poeira.',
    `- [ ] Mesmo rosto, cabelo e traje ${id === 'wei-long' ? 'da folha de referência 153007' : 'da imagem-mestra'} em **todas** as células: ${t.pt}.`,
    '- [ ] Mãos com 5 dedos, nenhum membro a mais ou faltando, nada cortado.',
    '- [ ] Arquivo original baixado do Runway (nunca print), salvo com o nome indicado no prompt, sem sobrescrever versão anterior.', ''].join('\n');
}

function cabecalho(num, nome, id, pais, extra) {
  const f = FUNDO[id];
  return [`# ${num} — ${nome}`, '',
    `Gerado por script a partir de \`docs/prompts-arte.md\` (fonte). Cada prompt abaixo está **completo**: copie o bloco inteiro.`,
    'Gerador: **Runway, Nano Banana 2.1, paisagem 4:3, 2K** (a imagem-mestra é retrato 3:4). **Uma só imagem de referência**',
    'por prompt, a indicada em "Anexar". Nunca peça "fundo transparente". Todo prompt de folha nova já traz o bloco IMPORTANT',
    'SPACING (figura com cerca de 70% da fileira, faixa vazia de pelo menos 8%, pés nunca cortados) e a regra de pelo menos',
    'um pé no chão no andar.', '',
    '| Campo | Valor |', '|---|---|',
    `| id | \`${id}\` |`,
    `| País / estilo | ${pais} |`,
    `| Cor de fundo | ${f.nome} \`${f.hex}\` — ${f.porque} |`,
    `| Pasta das folhas | \`arte-fonte/lutadores/${id}/folhas/\` |`,
    `| Pasta dos efeitos | \`arte-fonte/lutadores/${id}/fx/\` |`,
    `| Versões corrigidas | troque \`-v1\` por \`-v2\`, \`-v3\`; não apague as anteriores |`,
    ...(extra ? ['', extra] : []), ''].join('\n');
}

// prompts padrão de lutador (mestra, f1-f4, f5, fx)
function promptsLutador(id, bKey, opts) {
  const b = B[bKey];
  const a = opts.a ?? A;
  const ref = MESTRA_REF[id];
  const mestraAnexo = ref ? `${ref} (${REF_UNICA})` : 'nada (é a primeira imagem deste lutador)';
  // uma só referência em toda folha: a imagem-mestra aprovada (a folha 1 só entra no lugar dela, nunca junto)
  const comMestra = `\`${id}-mestra-v1.png\` (a aprovada; ${REF_UNICA})`;
  const comMestraF = `\`${id}-mestra-v1.png\` (a aprovada; ${REF_UNICA}. Se o estilo ou a escala variarem, troque pela \`${id}-f1-base\` aprovada, também sozinha)`;
  const st = opts.status ?? {};
  const ps = [
    { titulo: 'imagem-mestra', anexar: mestraAnexo, salvar: `\`${id}-mestra-v1.png\``, check: 'um único desenho de corpo inteiro, virado para a direita, traje correto, fundo chapado. Mostre ao dono antes de seguir.', txt: junta(MESTRA, b), pausa: true, status: st.mestra },
    { titulo: 'folha 1 — base (respiração e andar)', anexar: comMestra, salvar: `\`${id}-f1-base-v1.png\``, check: 'linha 1 com os pés parados nas 4 figuras; linhas 2 e 3 formam um passo contínuo, sempre com um pé no chão (nenhum quadro de pulo); nenhum pé cortado na fileira de baixo. É a folha que valida o traje.', txt: junta(a, b, C1), pausa: true, status: st.f1 },
    { titulo: 'folha 2 — movimento e reações', anexar: comMestraF, salvar: `\`${id}-f2-reacoes-v1.png\``, check: 'linha 3: os golpes recebidos jogam o corpo para a ESQUERDA, e no nocaute a cabeça fica à ESQUERDA. Se o nocaute vier com a cabeça à direita, não gere de novo nem corrija pelo gerador: o Atlas espelha só essa figura por código e salva como `-v2`.', txt: junta(a, b, C2), status: st.f2 },
    { titulo: 'folha 3 — golpes normais', anexar: comMestraF, salvar: `\`${id}-f3-golpes-v1.png\``, check: 'golpes bem estendidos sem encostar na figura vizinha; na linha 3, a rasteira com a perna esticada rente ao chão.', txt: junta(a, b, C3), status: st.f3 },
    { titulo: 'folha 4 — golpes especiais', anexar: comMestraF, salvar: `\`${id}-f4-especiais-v1.png\``, check: opts.check4, txt: junta(a, b, opts.c4), status: st.f4 },
    { titulo: opts.titulo5 ?? 'folha 5 — extras (opcional)', anexar: comMestraF, salvar: `\`${id}-f5-extras-v1.png\``, check: opts.check5 ?? 'linha 1 começa com o soco no ar; linha 2 com o agarrão sem adversário desenhado.', txt: junta(a, b, opts.c5), status: opts.f5status ?? OPCIONAL },
  ];
  return ps;
}
const fxP = (id, status) => ({ titulo: 'efeito à parte (opcional; a Lyra decide se usa)', anexar: 'nada', salvar: `\`${id}-fx-v1.png\` na pasta \`fx/\``, check: 'fundo preto puro, 4 quadros em fila, nenhum personagem.', txt: fxPrompt(id), status: status ?? '*Opcional: só gere se o Atlas pedir.*' });
const GERADA = arq => `**JÁ GERADA** (Runway, 2026-10-20): ${arq} em \`arte-fonte/\`. Não gere de novo; o estado de aprovação está no \`PROGRESSO.md\`.`;

// ---------- 4. montar arquivos ----------
fs.mkdirSync(SAIDA, { recursive: true });
const indice = [];
const contagem = {};

function escrever(arquivo, conteudo, nPrompts, nCorr) {
  fs.writeFileSync(path.join(SAIDA, arquivo), conteudo.replace(/\n{3,}/g, '\n\n'), 'utf8');
  contagem[arquivo] = { prompts: nPrompts, correcoes: nCorr };
}

function arquivoLutador(num, arquivo, nome, id, pais, ps, extraCab, baatar) {
  let corpo = cabecalho(num, nome, id, pais, extraCab);
  // veredito de curadoria fica no TOPO (logo abaixo do título), quando houver
  if (id === 'wei-long') corpo = corpo.replace(/^(# .+\n)/, `$1\n## Veredito da curadoria\n\n${WEI_VEREDITO}\n\n---\n`);
  corpo += '\n## Prompts, na ordem de geração\n\n';
  ps.forEach((p, i) => { corpo += promptMd(p.rotulo ?? i + 1, p) + '\n'; });
  const c = correcoesMd(id, id, baatar);
  corpo += c.md + '\n' + checklistMd(id, id, baatar);
  escrever(arquivo, corpo, ps.length, c.n);
}

// 01 WEI LONG
{
  const id = 'wei-long';
  const ps = [
    { rotulo: '1A', titulo: 'edição da folha de especiais, etapa A: só remover os efeitos', anexar: '**UMA imagem só**: `arte-fonte/lutadores/wei-long/folhas/Kung_fu_master_sprite_sheet_2K_20261020153054.jpg` (a folha de especiais, com a bola lilás e a cabeça de dragão). Não anexe nenhuma outra.', salvar: '`wei-long-f4-especiais-v2.png`', check: 'as 12 figuras continuam as mesmas (bola de energia nas mãos, palmas empurrando, pisão, ombrada, chute, braços cruzados), sem brilho lilás, sem cabeça de dragão, sem aura e sem chão rachado; as mãos que estavam cobertas pelo efeito aparecem normais. A túnica ainda curta é esperada nesta etapa. Se vier a folha de andar (4 parados + 8 andando), a imagem anexada foi a errada: confira o nome do arquivo.', txt: WEI_1A, pausa: true, status: '**CONCLUÍDO** (Runway, 2026-10-20): aprovado pelo dono e salvo como `wei-long-f4-especiais-v2.png`. Não gere de novo.' },
    { rotulo: '1B', titulo: 'edição da folha de especiais, etapa B: só alongar a túnica', anexar: '**UMA imagem só**: a imagem aprovada da etapa 1A (`wei-long-f4-especiais-v2.png`). Não anexe a folha de andar como referência.', salvar: '`wei-long-f4-especiais-v3.png`', check: 'em TODAS as 12 figuras, o colete azul continua abaixo da cintura num painel da frente até o meio da canela, com borda dourada, por cima da calça preta; nada mais mudou (rostos, poses, braçadeiras pretas, sapatos, fundo magenta). Se mudar rosto ou pose, descarte e repita a 1B.', txt: WEI_1B, status: '**CONCLUÍDO** (Runway, 2026-10-20): a 1B saiu como `-v3` e uma etapa extra 1C (cor do painel mais escura) como `-v4`, a versão final. Ressalva registrada no `PROGRESSO.md`: a figura toda escureceu e a calça ficou levemente marrom-arroxeada. Não gere de novo.' },
    { ...fxP(id, '**JÁ GERADO E APROVADO** (imagem `1bcee91a`). Não gere de novo: só salve o arquivo original do Gemini com o nome abaixo.'), rotulo: '2' },
  ];
  arquivoLutador('01', '01-wei-long.md', 'WEI LONG', id, 'China / kung fu', ps,
    'WEI LONG está **completo**: a edição da folha de especiais terminou em `wei-long-f4-especiais-v4.png` e as outras 3 folhas canônicas já estavam aprovadas (`docs/proposta-wei-long.md`). Os prompts 1A e 1B ficam como registro. São edições de uma folha existente, por isso não levam o bloco IMPORTANT SPACING (pediriam para mover as figuras). A troca do quadro L3C2 por ombrada e os extras (soco no ar etc.) foram adiados pelo dono e não estão aqui.');
}
// 02 MIN-JI
{
  const id = 'min-ji';
  const status = {
    mestra: GERADA('`min-ji-mestra-v1.png`'), f1: GERADA('`min-ji-f1-base-v1.png`'),
    f2: GERADA('`min-ji-f2-reacoes-v1.png` e `-v2` (a v2 é a v1 com o nocaute espelhado por código)'),
    f3: GERADA('`min-ji-f3-golpes-v1.png`'), f4: GERADA('`min-ji-f4-especiais-v1.png`'),
  };
  const ps = [...promptsLutador(id, 'min-ji', { c4: C4['min-ji'], check4: CHECK4['min-ji'], c5: folha5(ROW3['min-ji']), status }), fxP(id)];
  arquivoLutador('02', '02-min-ji.md', 'MIN-JI', id, 'Coreia do Sul / taekwondo', ps,
    'Folhas novas (decisão D3): fundo verde, grade regular e sem efeitos. Substituem as 4 folhas atuais. Mestra e folhas 1 a 4 já geradas; faltam só a folha 5 e o efeito, ambos opcionais.');
}
// 03 HAYATO (traje A2, escolhido pelo dono em 2026-10-20; A1 e B descartadas)
{
  const id = 'hayato';
  const status = {
    mestra: '**JÁ GERADA E APROVADA PELO DONO** (Runway, 2026-10-20): `hayato-mestra-v1.png`, traje A2, fundo ≈ `#FD2BFA` uniforme. Não gere de novo: ela é a referência única das folhas. O texto abaixo fica só como registro.',
    f1: GERADA('`hayato-f1-base-v1.png` (pés da fileira de baixo cortados, andar virando pulo) e `-v2` (com o bloco de espaçamento: nenhum pé cortado, passos de verdade)'),
    f2: GERADA('`hayato-f2-reacoes-v1.png` (nocaute com a cabeça à direita) e `-v2` (nocaute com a cabeça à esquerda)'),
    f3: GERADA('`hayato-f3-golpes-v1.png`'), f4: GERADA('`hayato-f4-especiais-v1.png`'),
  };
  const ps = [...promptsLutador(id, 'hayato', { c4: C4.hayato, check4: CHECK4.hayato, c5: folha5(ROW3.hayato), status }), fxP(id)];
  arquivoLutador('03', '03-hayato.md', 'HAYATO', id, 'Japão / karatê', ps, [
    '**Traje A2, escolhido pelo dono.** O pedido foi a versão A sem nenhuma semelhança com um personagem famoso de outra franquia de luta; a A1 (gi branco) ainda lembrava, e a A2 foi a escolhida. A A1 e a B saíram deste arquivo.',
    '',
    'O que está nas imagens aprovadas, e que tem de se repetir em toda célula:',
    '- cabelo preto espetado para cima e para trás, com uma **mecha amarelo-elétrico em forma de raio** na frente;',
    '- **faixa verde** na testa com duas pontas longas esvoaçando para trás;',
    '- **gi cinza-grafite, nunca branco**: mangas curtas dobradas acima do cotovelo, gola em V aberta, **debrum amarelo-elétrico** na gola e na barra do casaco (com fendas laterais);',
    '- **raio amarelo pequeno no peito esquerdo** e um raio amarelo maior no alto das costas (aparece quando ele vira o tronco);',
    '- **faixa preta com bordas amarelas**, nó na frente e duas pontas longas; calça cinza-grafite larga, sem debrum;',
    '- **mãos e antebraços enfaixados de branco** dos nós dos dedos ao meio do antebraço (sem luvas); descalço;',
    '- guarda: base larga de karatê, um punho erguido à frente na altura do queixo, o outro protegendo o peito.',
    '',
    'O cenário do Japão está em `09-cenarios.md`.'].join('\n'));
}
// 04-07 novos
const novos = [
  ['04', '04-aminu.md', 'AMINU', 'aminu', 'Nigéria (Kano) / dambe'],
  ['05', '05-centella.md', 'CENTELLA', 'centella', 'México (Cidade do México) / lucha libre'],
  ['06', '06-camille.md', 'CAMILLE', 'camille', 'França (Marselha) / savate'],
  ['07', '07-nila.md', 'NILA', 'nila', 'Índia (Kerala) / kalaripayattu'],
];
for (const [num, arq, nome, id, pais] of novos) {
  const opts = { c4: C4[id], check4: CHECK4[id] };
  if (id === 'nila') { opts.c5 = NILA5; opts.titulo5 = 'folha 5 — postura de serpente (obrigatória)'; opts.f5status = '**Obrigatória para a NILA:** o dono aprovou a ED-M1 (posturas GAJA e SARPA). O BOTE usa a linha 2, células 3 e 4; o SALTO DA SERPENTE, a linha 3.'; opts.check5 = 'postura de serpente: corpo quase deitado em todas as células, trança visível, nenhuma figura encostando na de baixo.'; }
  else if (id === 'centella') { opts.c5 = folha5(ROW3[id]); opts.check5 = 'linha 3: duas variações de guarda, provocação de braços cruzados e reverência; máscara em todas as células. (O salto na parede foi cortado pela ED-M2.)'; }
  else opts.c5 = folha5(ROW3[id]);
  const ps = [...promptsLutador(id, id, opts), fxP(id)];
  const f = FUNDO[id];
  arquivoLutador(num, arq, nome, id, pais, ps,
    `Ficha completa (personalidade, cultura, mecânicas) em \`docs/proposta-expansao.md\` §2.3 e \`docs/mecanicas-e3.md\`. **Tudo liberado** (mecânicas ED-M1 a ED-M10 aprovadas pelo dono em 2026-10-20). Fundo **${f.nome}** \`${f.hex}\` em toda imagem deste lutador.`);
}
// 08 BAATAR
{
  const id = 'baatar';
  const b = B.baatar;
  const ps = [{ titulo: 'imagem-mestra', anexar: 'nada (é a primeira imagem deste lutador)', salvar: '`baatar-mestra-v1.png`', check: 'um único desenho de corpo inteiro, enorme e pesado, virado para a direita, sem chapéu, fundo verde chapado. Mostre ao dono antes de seguir.', txt: junta(MESTRA, b), pausa: true }];
  const checks = {
    B1: 'idle com os pés parados; 2 primeiros quadros do andar.', B2: 'andar pesado e lento, 6 quadros em sequência.',
    B3: 'agachar, defesas e início do pulo.', B4: 'quedas para a ESQUERDA, nocaute com a cabeça à ESQUERDA (se vier à direita, o Atlas espelha só essa figura por código).',
    B5: 'tapa, cotovelada/antebraço e joelhada.', B6: 'chute pisando, golpes agachados e rasteira rente ao chão.',
    B7: 'agarrão sem adversário desenhado; mãos fechadas à frente na altura do peito.', B8: 'abraço de urso sem adversário; golpes aéreos.',
    B9: 'dança da águia digna e lenta (braços como asas), mergulho e vitória com a mão no peito.',
  };
  for (const k of Object.keys(BAATAR_FOLHAS)) {
    ps.push({ titulo: `folha ${k}`, anexar: k === 'B1' ? `\`baatar-mestra-v1.png\` (a aprovada; ${REF_UNICA})` : `\`baatar-mestra-v1.png\` (a aprovada; ${REF_UNICA}. Se o estilo ou a escala variarem, troque pela \`baatar-b1\` aprovada, também sozinha)`, salvar: `\`baatar-${k.toLowerCase()}-v1.png\``, check: checks[k], txt: junta(A_BAATAR, b, BAATAR_FOLHAS[k]), pausa: k === 'B1', status: k === 'B9' ? '*Usada só na luta de chefe (fase 2) e no final; o BAATAR jogável não usa a B9 (ED-M4).*' : undefined });
  }
  ps.push(fxP(id));
  arquivoLutador('08', '08-baatar.md', 'BAATAR (chefão)', id, 'Mongólia / bökh', ps,
    'BAATAR aparece no jogo 1,28 vez maior que os outros. Por isso as folhas dele têm **6 poses (3 colunas × 2 linhas)** em vez de 12, e cada pose sai cerca de 1,5 vez maior: são 9 folhas. No Runway, 4K custa 12 créditos por imagem (2K custa 6): 4K no BAATAR só com o OK do dono, por causa do saldo. Fundo **verde** `#00FF00`. A divisão em páginas de atlas é trabalho da equipe (`docs/prompts-arte.md` §7); você não precisa fazer nada.', true);
}
// 09 cenários
{
  let corpo = ['# 09 — Cenários (6 imagens)', '',
    'Gerado por script a partir de `docs/prompts-arte.md`. Cada prompt está **completo**. Gerador: Runway (Nano Banana 2.1),',
    'paisagem **16:9** (os cenários medem 2752 × 1536). Pasta: `arte-fonte/cenarios/`. Uma geração por cenário, com no máximo',
    'uma imagem de referência.', '',
    '**Os 6 já foram gerados** (Runway, 2026-10-20) e salvos como `cenario-{jp,ng,mx,fr,in,mn}-v1.png`, conferidos pelo Atlas',
    'com linhas-guia a 70% e 87% da altura. Falta a curadoria do Apolo. Os prompts ficam para correções e versões novas.', '',
    '**Linha do chão:** no jogo, os pés ficam a 87% da altura (de cima para baixo). O chão precisa ser plano e livre da faixa',
    'de 70% da altura até embaixo, como no cenário atual do Japão.', '', '## Prompts', ''].join('\n');
  CENARIOS.forEach((c, i) => {
    corpo += promptMd(i + 1, {
      titulo: `${c.rotulo}${c.nota ? ' (' + c.nota + ')' : ''}`,
      anexar: c.sigla === 'jp' ? 'opcional: `public/assets/cenarios/jp.jpg` como referência de composição' : 'nada',
      salvar: `\`cenario-${c.sigla}-v1.png\``,
      check: 'sem pessoas em primeiro plano, sem texto legível, chão plano e livre de 70% da altura até embaixo.',
      txt: junta(CEN, c.txt),
    }) + '\n';
  });
  corpo += ['## Correções de cenário', '',
    '#### Correção 1 — objetos no chão', '', cod('Edit this image: remove every object standing on the floor between 70% of the image height and the bottom edge, except at the far left and far right edges. Keep the floor flat and open. Do not change the background.'), '',
    '#### Correção 2 — pessoas ou texto', '', cod('Edit this image: remove all people, characters and any readable text or signs with words. Keep everything else exactly the same.'), '',
    '#### Correção 3 — chão inclinado ou curto', '', cod('Edit this image: make the floor a flat, level, open surface whose back edge is at about 70% of the image height and which continues to the bottom edge. Keep the background landmarks.'), '',
    '## Checklist de aceite', '',
    '- [ ] 16:9, maior resolução disponível.', '- [ ] Sem pessoas em primeiro plano, sem texto legível.',
    '- [ ] Chão plano e livre da faixa de 70% da altura até embaixo; a linha a 87% cai em chão limpo de ponta a ponta.',
    '- [ ] Área central atrás dos lutadores sem poluição visual.', '- [ ] Arquivo original do Runway, salvo com o nome indicado, sem sobrescrever versão anterior.', ''].join('\n');
  escrever('09-cenarios.md', corpo, CENARIOS.length, 3);
}

// 00 índice
{
  const linhasIdx = [
    ['1', 'WEI LONG — edição da folha de especiais', '01-wei-long.md', '3 edições (1A, 1B e 1C); efeito já entregue', 'CONCLUÍDO: `wei-long-f4-especiais-v4.png` é a final · efeito APROVADO, falta salvar o original'],
    ['2', 'MIN-JI — 4 folhas novas', '02-min-ji.md', '1 mestra + 4 folhas (+1 opcional, +1 efeito)', 'mestra e folhas 1-4 GERADAS (f2 com nocaute espelhado por código) · folha 5 e efeito: opcionais'],
    ['3', 'HAYATO — 4 folhas novas, traje A2', '03-hayato.md', '1 mestra + 4 folhas (+1 opcional, +1 efeito)', 'mestra A2 APROVADA pelo dono · folhas 1-4 GERADAS (f1 e f2 com v2), aprovação no `PROGRESSO.md` · folha 5 e efeito: opcionais'],
    ['3', 'Cenário do Japão', '09-cenarios.md (prompt 1)', '1', 'GERADO (`cenario-jp-v1.png`), falta curadoria'],
    ['4', 'AMINU (fundo verde)', '04-aminu.md', '1 mestra + 4 folhas (+1 opcional, +1 efeito)', 'pronto para gerar (tudo liberado)'],
    ['4', 'CENTELLA (fundo magenta)', '05-centella.md', '1 mestra + 4 folhas (+1 opcional, +1 efeito)', 'pronto para gerar (tudo liberado; folha 5 sem salto na parede, ED-M2)'],
    ['4', 'CAMILLE (fundo verde)', '06-camille.md', '1 mestra + 4 folhas (+1 opcional, +1 efeito)', 'pronto para gerar (tudo liberado)'],
    ['4', 'NILA (fundo verde)', '07-nila.md', '1 mestra + 5 folhas (+1 efeito)', 'pronto para gerar (tudo liberado; folha 5 da serpente é obrigatória, ED-M1)'],
    ['5', 'BAATAR, chefão (fundo verde)', '08-baatar.md', '1 mestra + 9 folhas (+1 efeito)', 'pronto para gerar (tudo liberado)'],
    ['6', '5 cenários novos (Nigéria, México, França, Índia, Mongólia)', '09-cenarios.md (prompts 2-6)', '5', 'GERADOS (`-v1`), falta curadoria'],
  ];
  const idx = ['# Prompts de arte — índice', '',
    'Um arquivo por personagem, cada prompt já **completo**: é só copiar o bloco inteiro. Não é preciso montar nada.',
    'Fonte técnica: `docs/prompts-arte.md` (estes arquivos são gerados a partir dela por `ferramentas/prompts/montar-prompts.mjs`',
    'e conferidos por `ferramentas/prompts/verificar-prompts.mjs`; mude a fonte, nunca estes arquivos à mão).', '',
    '**Gerador atual: Runway, modelo Nano Banana 2.1, paisagem 4:3, 2K** (6 créditos por imagem; 4K custa 12). A imagem-mestra',
    'é retrato 3:4 e os cenários são 16:9. Quem gera é o Atlas, com o dono sabendo do saldo a cada lote.', '',
    '## Ordem de geração', '',
    '| Prioridade | O quê | Arquivo | Quantas imagens | Status |', '|---|---|---|---|---|',
    ...linhasIdx.map(l => `| ${l.join(' | ')} |`), '',
    'As antigas marcas de espera caíram em 2026-10-20: o dono aprovou as mecânicas ED-M1 a ED-M10 (`docs/mecanicas-e3.md`),',
    'e com isso as folhas 4, as folhas 5, as folhas B7 a B9 do BAATAR e os efeitos estão liberados.', '',
    '## Regras que valem para tudo', '',
    '1. **Uma só imagem de referência por prompt**, a indicada em "Anexar" (nas folhas, a imagem-mestra aprovada). Com duas',
    '   anexadas, o modelo devolve uma delas em vez de gerar a folha nova (aconteceu no WEI LONG).',
    '2. **Bloco IMPORTANT SPACING em todo prompt de folha nova** (já vem dentro do texto): figura com cerca de 70% da altura',
    '   da fileira, faixa vazia de pelo menos 8% entre as fileiras e nas bordas, pés e dedos nunca cortados. Junto vem a',
    '   regra do andar: **pelo menos um pé no chão em todo quadro**, para o passo não virar pulo.',
    '3. **Fundo por lutador**, sempre uma cor chapada (nunca "transparente"): **verde** `#00FF00` para MIN-JI, AMINU, CAMILLE,',
    '   NILA e BAATAR; **magenta** `#FF00FF` para WEI LONG, HAYATO e CENTELLA. O recorte mede o fundo real por pixel.',
    '4. **Nocaute com a cabeça à ESQUERDA.** Se vier à direita (aconteceu com a MIN-JI e com o HAYATO), não gere de novo',
    '   nem corrija pelo gerador: o Atlas espelha só essa figura por código e salva como versão nova (`-v2`).',
    '5. Dentro de cada personagem, siga a numeração dos prompts. Depois da imagem-mestra e da folha 1, **pare e espere o OK do dono**.',
    '6. Se a folha vier quase boa, use os prompts de correção do próprio arquivo, **um defeito por vez**. Não gere do zero.',
    '7. Baixe o resultado para uma pasta temporária, meça (fundo, vãos, pés na borda) e só então copie para `arte-fonte/`',
    '   com o nome indicado e a versão no nome. Nunca sobrescreva uma versão anterior.', '',
    '## Contagem de prompts por arquivo', '',
    '| Arquivo | Prompts numerados | Prompts de correção |', '|---|---|---|',
    ...Object.entries(contagem).map(([a, c]) => `| ${a} | ${c.prompts} | ${c.correcoes} |`), '',
    '## Finais do Arcade dos 4 atuais', '',
    'O rascunho para aprovação está em `docs/prompts-arte.md` §13 (não é prompt de imagem).', ''].join('\n');
  fs.writeFileSync(path.join(SAIDA, '00-indice.md'), idx, 'utf8');
}
console.log(JSON.stringify(contagem, null, 1));
