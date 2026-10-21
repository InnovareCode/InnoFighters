import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { IDS_LUTADORES, type IdLutador } from '../../src/core/contratos';
import {
  CARACTERES_DO_RIVAL,
  ErroDeFalas,
  LIMITES_DE_FALA,
  comRivalMedido,
  exigirFalasValidas,
  falasDe,
  problemasDaFala,
  quebrarPorCaracteres,
  validarTabelaDeFalas,
  type FalasDeProvocacao,
  type TabelaDeFalas,
} from '../../src/data/provocacoes';
import { PROVOCACOES_PT_BR, TEXTOS_PROVISORIOS } from '../../src/data/provocacoes.pt-BR';

/** Cópia profunda mutável da tabela real, para os testes de mutação (cada caso estraga UMA coisa e a validação tem de acusar). */
const clonar = (): Record<string, Record<string, unknown>> => JSON.parse(JSON.stringify(PROVOCACOES_PT_BR));
const falasDoHayato = (t: Record<string, Record<string, unknown>>): Record<string, unknown> => t['hayato'] as Record<string, unknown>;

describe('tabela real pt-BR: o que o jogo carrega', () => {
  it('a validação do boot passa e cada IdLutador tem abertura >= 3, revanche >= 2, vitoria >= 3', () => {
    expect(validarTabelaDeFalas(PROVOCACOES_PT_BR)).toEqual([]);
    expect(Object.keys(PROVOCACOES_PT_BR).sort()).toEqual([...IDS_LUTADORES].sort());
    for (const id of IDS_LUTADORES) {
      const f = falasDe(id);
      expect(f.abertura.length, `${id}.abertura`).toBeGreaterThanOrEqual(3);
      expect(f.revanche.length, `${id}.revanche`).toBeGreaterThanOrEqual(2);
      expect(f.vitoria.length, `${id}.vitoria`).toBeGreaterThanOrEqual(3);
    }
  });

  it('todas as falas respeitam os limites da §7.2 (varre TODAS as listas, inclusive opcionais e contra)', () => {
    const listas: Array<[string, readonly string[], keyof typeof LIMITES_DE_FALA]> = [];
    for (const id of IDS_LUTADORES) {
      const f: FalasDeProvocacao = falasDe(id);
      listas.push([`${id}.abertura`, f.abertura, 'abertura'], [`${id}.revanche`, f.revanche, 'revanche'], [`${id}.vitoria`, f.vitoria, 'vitoria']);
      if (f.decisivo) listas.push([`${id}.decisivo`, f.decisivo, 'decisivo']);
      if (f.vitoriaPerfeita) listas.push([`${id}.vitoriaPerfeita`, f.vitoriaPerfeita, 'vitoriaPerfeita']);
      if (f.vitoriaPorTempo) listas.push([`${id}.vitoriaPorTempo`, f.vitoriaPorTempo, 'vitoriaPorTempo']);
      for (const [rival, c] of Object.entries(f.contra ?? {})) {
        if (c?.abertura) listas.push([`${id}.contra.${rival}.abertura`, c.abertura, 'contra.abertura']);
        if (c?.vitoria) listas.push([`${id}.contra.${rival}.vitoria`, c.vitoria, 'contra.vitoria']);
      }
    }
    expect(listas.length).toBeGreaterThanOrEqual(30);
    for (const [onde, lista, cat] of listas) {
      for (const fala of lista) expect(problemasDaFala(fala, LIMITES_DE_FALA[cat]), `${onde}: "${fala}"`).toEqual([]);
    }
  });

  it('o marcador de provisório é coerente: enquanto TEXTOS_PROVISORIOS for true há `// PROVISÓRIO` no .ts; ao virar false, não pode sobrar nenhum', () => {
    const fonte = readFileSync(join(__dirname, '../../src/data/provocacoes.pt-BR.ts'), 'utf8');
    const marcadores = fonte.split('\n').filter((l) => /^\s*\/\/\s*PROVISÓRIO/.test(l)).length;
    if (TEXTOS_PROVISORIOS) expect(marcadores).toBeGreaterThanOrEqual(IDS_LUTADORES.length);
    else expect(marcadores).toBe(0);
  });
});

describe('texto definitivo do Apolo (transcrito em 2026-10-21): o que a tabela tem de ter', () => {
  const todasAsFalas = (): string[] =>
    IDS_LUTADORES.flatMap((id) => {
      const f = falasDe(id);
      const contra = Object.values(f.contra ?? {}).flatMap((c) => [...(c?.abertura ?? []), ...(c?.vitoria ?? [])]);
      return [...f.abertura, ...f.revanche, ...(f.decisivo ?? []), ...f.vitoria, ...(f.vitoriaPerfeita ?? []), ...(f.vitoriaPorTempo ?? []), ...contra];
    });

  it('não é mais provisório: nada de marcador, nada de † (marca de revisão do .md), 232 balões', () => {
    expect(TEXTOS_PROVISORIOS).toBe(false);
    const todas = todasAsFalas();
    expect(todas).toHaveLength(232);
    for (const fala of todas) expect(fala, fala).not.toMatch(/†/);
  });

  it('cada um dos 10 ids tem as 3 listas obrigatórias, decisivo, vitoriaPerfeita e vitoriaPorTempo', () => {
    expect(IDS_LUTADORES).toHaveLength(10);
    for (const id of IDS_LUTADORES) {
      const f = falasDe(id);
      expect(f.abertura.length, `${id}.abertura`).toBeGreaterThanOrEqual(3);
      expect(f.revanche.length, `${id}.revanche`).toBeGreaterThanOrEqual(2);
      expect(f.vitoria.length, `${id}.vitoria`).toBeGreaterThanOrEqual(3);
      expect(f.decisivo?.length ?? 0, `${id}.decisivo`).toBeGreaterThanOrEqual(2);
      expect(f.vitoriaPerfeita?.length ?? 0, `${id}.vitoriaPerfeita`).toBeGreaterThanOrEqual(2);
      expect(f.vitoriaPorTempo?.length ?? 0, `${id}.vitoriaPorTempo`).toBeGreaterThanOrEqual(2);
    }
  });

  it('os 9 não-chefões têm contra.zenon (abertura e vitória); o ZENON tem contra para os 10 (inclusive o espelho)', () => {
    for (const id of IDS_LUTADORES.filter((x) => x !== 'zenon')) {
      const c = falasDe(id).contra?.zenon;
      expect(c?.abertura?.length ?? 0, `${id}.contra.zenon.abertura`).toBeGreaterThanOrEqual(1);
      expect(c?.vitoria?.length ?? 0, `${id}.contra.zenon.vitoria`).toBeGreaterThanOrEqual(1);
    }
    const doZenon = falasDe('zenon').contra ?? {};
    expect(Object.keys(doZenon).sort()).toEqual([...IDS_LUTADORES].sort());
    for (const id of IDS_LUTADORES) {
      expect(doZenon[id]?.abertura?.length ?? 0, `zenon.contra.${id}.abertura`).toBeGreaterThanOrEqual(1);
      // a vitória do ZENON chefão vira o balão novo: 2 variantes por rival (o espelho tem 1), para quem tenta de novo não ler a mesma duas vezes
      expect(doZenon[id]?.vitoria?.length ?? 0, `zenon.contra.${id}.vitoria`).toBeGreaterThanOrEqual(id === 'zenon' ? 1 : 2);
    }
  });
});

describe('lutador sem falas não compila e falha o boot', () => {
  it('tipo: uma tabela com lutador faltando é erro de compilação (@ts-expect-error quebra o tsc se ISSO passar a compilar)', () => {
    const { hayato: _fora, ...semHayato } = PROVOCACOES_PT_BR;
    void _fora;
    // @ts-expect-error falta `hayato`: Record<IdLutador, …> exige todos
    const incompleta: TabelaDeFalas = semHayato;
    expect(Object.keys(incompleta)).toHaveLength(IDS_LUTADORES.length - 1);
  });

  it('runtime: sem um lutador, exigirFalasValidas LANÇA ErroDeFalas citando o id', () => {
    const t = clonar();
    delete t['zenon'];
    const problemas = validarTabelaDeFalas(t);
    expect(problemas.some((p) => p.startsWith('zenon: SEM FALAS'))).toBe(true);
    expect(() => exigirFalasValidas(t, 'teste')).toThrow(ErroDeFalas);
    expect(() => exigirFalasValidas(t, 'teste')).toThrow(/zenon/);
  });

  it('um id novo no elenco (ex.: "novo") sem falas derruba o boot mesmo com a tabela antiga', () => {
    expect(validarTabelaDeFalas(PROVOCACOES_PT_BR, [...IDS_LUTADORES, 'novo']).some((p) => p.startsWith('novo: SEM FALAS'))).toBe(true);
  });

  it('o módulo falha no carregamento quando a tabela real é inválida (a validação roda no import, não só nos testes)', () => {
    const fonte = readFileSync(join(__dirname, '../../src/data/provocacoes.ts'), 'utf8');
    expect(fonte).toMatch(/for \(const idioma of Object\.keys\(TABELAS\)[^\n]*exigirFalasValidas\(TABELAS\[idioma\], idioma\)/);
  });
});

describe('mutação nas regras de validação: cada defeito plantado tem de ser acusado', () => {
  const casos: Array<[string, (t: Record<string, Record<string, unknown>>) => void, RegExp]> = [
    ['abertura com 2 variantes', (t) => ((falasDoHayato(t)['abertura'] as string[]).length = 2), /hayato\.abertura: 2 variante/],
    ['revanche com 1 variante', (t) => ((falasDoHayato(t)['revanche'] as string[]).length = 1), /hayato\.revanche: 1 variante/],
    ['vitoria com 2 variantes', (t) => ((falasDoHayato(t)['vitoria'] as string[]).length = 2), /hayato\.vitoria: 2 variante/],
    ['abertura ausente', (t) => delete falasDoHayato(t)['abertura'], /hayato\.abertura: lista ausente/],
    ['decisivo presente mas vazio', (t) => (falasDoHayato(t)['decisivo'] = []), /hayato\.decisivo: 0 variante/],
    ['revanche com 2 linhas (\\n)', (t) => ((falasDoHayato(t)['revanche'] as string[])[0] = 'Uma\nduas'), /revanche\[0\]: 2 linhas/],
    ['revanche com 35 caracteres', (t) => ((falasDoHayato(t)['revanche'] as string[])[0] = 'a'.repeat(35)), /revanche\[0\]: .*35 caracteres/],
    ['abertura com 65 caracteres em palavras', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'palavra '.repeat(8) + 'z'), /abertura\[0\]/],
    ['abertura que quebra em 3 linhas', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb ccc'), /3 linhas/],
    ['palavra única de 40 letras', (t) => ((falasDoHayato(t)['revanche'] as string[])[0] = 'x'.repeat(40)), /linha com 40 caracteres/],
    ['{rival} conta 8: 27 letras + token = 35', (t) => ((falasDoHayato(t)['revanche'] as string[])[0] = 'a'.repeat(26) + ' {rival}'), /revanche\[0\]/],
    ['emoji', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'Vem 😀'), /caractere fora do permitido/],
    ['caractere fora do Latin-1 (CJK)', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'Vem 勝'), /caractere fora do permitido/],
    ['token inventado {nome}', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'Oi {nome}'), /só o token \{rival\}/],
    ['chave solta', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'Oi }'), /só o token \{rival\}/],
    ['espaço sobrando', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = ' Oi'), /espaço sobrando/],
    ['espaços duplos', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'Oi  você'), /espaços duplos/],
    ['fala vazia', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = '   '), /fala vazia/],
    ['fala que não é texto', (t) => ((falasDoHayato(t)['abertura'] as unknown[])[0] = 42), /não é texto/],
    ['linha vazia por \\n duplo', (t) => ((falasDoHayato(t)['abertura'] as string[])[0] = 'a\n\nb'), /linha vazia/],
    ['duplicada na mesma lista (ignora caixa)', (t) => ((falasDoHayato(t)['abertura'] as string[])[1] = (falasDoHayato(t)['abertura'] as string[])[0]!.toUpperCase()), /repetida na mesma lista/],
    ['contra um lutador que não existe', (t) => (falasDoHayato(t)['contra'] = { fantasma: { abertura: ['Oi.'] } }), /rival desconhecido/],
    ['contra sem abertura nem vitoria', (t) => (falasDoHayato(t)['contra'] = { 'wei-long': {} }), /sem abertura nem vitoria/],
    ['contra com fala fora do limite', (t) => (falasDoHayato(t)['contra'] = { 'wei-long': { vitoria: ['z'.repeat(70)] } }), /contra\[wei-long\]\.vitoria\[0\]/],
    ['lutador desconhecido sobrando na tabela', (t) => (t['fantasma'] = t['hayato']!), /fantasma: lutador desconhecido/],
    ['lutador com valor nulo', (t) => ((t as Record<string, unknown>)['caio'] = null), /caio: SEM FALAS/],
  ];

  it.each(casos)('acusa: %s', (_nome, estragar, esperado) => {
    const t = clonar();
    estragar(t);
    const problemas = validarTabelaDeFalas(t);
    expect(problemas.length).toBeGreaterThan(0);
    expect(problemas.join('\n')).toMatch(esperado);
    expect(() => exigirFalasValidas(t, 'mutante')).toThrow(ErroDeFalas);
  });

  it('o controle: a tabela sem estrago NÃO é acusada (os casos acima não passam por acaso)', () => {
    expect(validarTabelaDeFalas(clonar())).toEqual([]);
  });

  it('o espelho é aceito: `contra[id]` dentro do próprio `id` (o ZENON tem fala contra ele mesmo)', () => {
    const t = clonar();
    falasDoHayato(t)['contra'] = { hayato: { abertura: ['Oi, eu.'] } };
    expect(validarTabelaDeFalas(t)).toEqual([]);
  });

  it('o ErroDeFalas junta TODOS os problemas numa mensagem só', () => {
    const t = clonar();
    delete t['zenon'];
    delete t['caio'];
    try {
      exigirFalasValidas(t, 'dois');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ErroDeFalas);
      expect((e as ErroDeFalas).problemas).toHaveLength(2);
      expect((e as Error).message).toMatch(/zenon[\s\S]*caio|caio[\s\S]*zenon/);
    }
  });
});

describe('medida de texto (funções puras da validação)', () => {
  it('{rival} conta 8 e a quebra é gulosa por palavra, respeitando \\n', () => {
    expect(CARACTERES_DO_RIVAL).toBe(8);
    expect(comRivalMedido('Oi {rival} e {rival}')).toBe('Oi XXXXXXXX e XXXXXXXX');
    expect(quebrarPorCaracteres('aaa bbb ccc', 7)).toEqual(['aaa bbb', 'ccc']);
    expect(quebrarPorCaracteres('aaa bbb ccc', 8)).toEqual(['aaa bbb', 'ccc']);
    expect(quebrarPorCaracteres('aaa bbb ccc', 11)).toEqual(['aaa bbb ccc']);
    expect(quebrarPorCaracteres('um\ndois tres', 20)).toEqual(['um', 'dois tres']);
  });

  it('fronteira dos limites: 34 passa e 35 não (linha); 64 passa e 65 não (total)', () => {
    const uma = LIMITES_DE_FALA.revanche;
    expect(problemasDaFala('a'.repeat(34), uma)).toEqual([]);
    expect(problemasDaFala('a'.repeat(35), uma).length).toBeGreaterThan(0);
    const duas = LIMITES_DE_FALA.abertura;
    const l32 = 'a'.repeat(32); // 32 + "\n" + 31 = 64
    expect(problemasDaFala(`${l32}\n${'b'.repeat(31)}`, duas)).toEqual([]);
    expect(problemasDaFala(`${l32}\n${'b'.repeat(32)}`, duas).join()).toMatch(/65 caracteres/);
  });

  it('aceita acentos, cedilha, til e os travessões/aspas permitidos', () => {
    expect(problemasDaFala('Coração, ação… “não” — ‘sim’ ÀÉÎÕÜ', LIMITES_DE_FALA.abertura)).toEqual([]);
  });
});

describe('o motor continua intocado', () => {
  const varrer = (dir: string): string[] =>
    readdirSync(dir).flatMap((n) => {
      const p = join(dir, n);
      return statSync(p).isDirectory() ? varrer(p) : p.endsWith('.ts') ? [p] : [];
    });

  it('nenhum arquivo de src/fight menciona provocação ou sorteioDeFalas (apresentação fica fora do lock-step)', () => {
    for (const arq of varrer(join(__dirname, '../../src/fight'))) {
      expect(readFileSync(arq, 'utf8'), arq).not.toMatch(/provoca|sorteioDeFalas|PROVOCACOES/i);
    }
  });

  it('as falas não importam nada do motor nem do rng da luta', () => {
    for (const nome of ['provocacoes.ts', 'provocacoes.pt-BR.ts']) {
      const fonte = readFileSync(join(__dirname, '../../src/data', nome), 'utf8');
      expect(fonte, nome).not.toMatch(/from '\.\.\/fight|game\.rng|Math\.random/);
    }
  });

  it('o sorteio de falas tem a semente + 5 e nenhuma outra sequência usa a mesma', () => {
    const main = readFileSync(join(__dirname, '../../src/main.ts'), 'utf8');
    expect(main).toMatch(/sorteioDeFalas:\s*criarRng\(semente \+ 5\)/);
    const somas = [...main.matchAll(/criarRng\(semente(?: \+ (\d+))?\)/g)].map((m) => m[1] ?? '0');
    expect(new Set(somas).size).toBe(somas.length);
  });
});

// o tipo do id continua sendo o do contrato (guarda contra um `string` frouxo na tabela)
const _ids: IdLutador[] = [...IDS_LUTADORES];
void _ids;
