import { describe, expect, it } from 'vitest';
import {
  areaDeEncontro,
  BALAO,
  desenharBalao,
  escalaDoPop,
  LIMITES_COM_FAIXAS,
  LIMITES_COM_HUD,
  medirBalao,
  colocarBalao,
  escolherPlano,
  LARGURAS_DA_LINHA,
  retanguloDaColocacao,
  variantesDoBalao,
  RESERVA_DA_SETA,
  quebrarPorMedida,
  retanguloDaCabeca,
  type CabecaNaTela,
} from '../../src/render/balao';
import { cabecaNaTela, paraATela } from '../../src/render/provocacao';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { gravador } from './_ui';

/*
 * P2 (Lyra): o BALÃO. A quebra por medida (px), o lugar (função pura) e o desenho. A medida de verdade, com a fonte carregada, é do e2e
 * (`tests/e2e/provocacao.spec.ts`): aqui o "medidor" é 10 px por caractere, que prova a regra sem depender de fonte.
 */
const medir10 = (s: string): number => s.length * 10;

describe('quebrarPorMedida', () => {
  it('guloso por palavra até `max` px; "\\n" força a quebra', () => {
    expect(quebrarPorMedida('aaa bbb ccc', 70, medir10)).toEqual(['aaa bbb', 'ccc']);
    expect(quebrarPorMedida('aaa bbb ccc', 110, medir10)).toEqual(['aaa bbb ccc']);
    expect(quebrarPorMedida('um\ndois três', 200, medir10)).toEqual(['um', 'dois três']);
  });

  it('uma palavra maior que `max` fica sozinha numa linha (o teste de limites das falas é quem avisa o autor)', () => {
    expect(quebrarPorMedida('curto enormíssima fim', 80, medir10)).toEqual(['curto', 'enormíssima', 'fim']);
  });

  it('nenhuma linha passa de `max` quando todas as palavras cabem; nada se perde (as palavras de volta, na ordem)', () => {
    const fala = 'Cada cerejeira cai a seu tempo, e a minha já caiu faz tempo demais para eu me importar com você';
    const linhas = quebrarPorMedida(fala, 372 / 3, medir10);
    for (const l of linhas) expect(l.length * 10).toBeLessThanOrEqual(124);
    expect(linhas.join(' ')).toBe(fala);
  });
});

describe('medirBalao', () => {
  const ctx = gravador().ctx; // measureText devolve 10 px fixos por texto
  it('Tarja de Impacto: 1 linha = 62 px de altura e 2 linhas = 90 (plaquinha + texto em Bangers 24 + margens + sombra); a largura é a do texto + 2 x 16 (ou a da plaquinha + 32)', () => {
    const um = medirBalao(ctx, 'Uma linha só.', 'HAYATO');
    expect(um.linhas).toEqual(['UMA LINHA SÓ.']); // Bangers só tem caixa alta
    expect(um.h).toBe(62);
    // o medidor falso dá 10 px a qualquer texto: a plaquinha (10 + 2 x 9 + 6 = 34) + 2 x 12 + 8 = 66 manda sobre o texto (10 + 32)
    expect(um.larguraPlaca).toBe(10 + 18 + BALAO.placaInclina);
    expect(um.w).toBe(66);
    const dois = medirBalao(ctx, 'Primeira linha.\nSegunda linha.', 'CAIO');
    expect(dois.linhas).toHaveLength(2);
    expect(dois.h).toBe(90);
    expect(dois.letras).toBe('Primeira linha.'.length + 'Segunda linha.'.length);
    expect(BALAO.linhaMax).toBe(372);
  });
});

describe('o lugar do balão (funções puras: colocarBalao e escolherPlano)', () => {
  const caixa = { w: 300, h: 60 };
  const cabeca = (x: number, topo: number, H = 255): CabecaNaTela => ({ x, topo, meiaLargura: 0.17 * H, altura: 0.36 * H });
  const SEM = { lado: 'cima', nivel: 'topo' } as const;

  it('lutador baixo: o balão fica EM CIMA da cabeça, sem cobri-la, com o rabicho apontando para ela', () => {
    const f = cabeca(270, 215); // HAYATO: topo em y 215
    const { plano, colocacao: c } = escolherPlano([caixa], f, [], [], LIMITES_COM_HUD);
    expect(plano).toEqual({ variante: 0, lado: 'cima', nivel: 'topo' });
    expect(c.y + c.h).toBeLessThanOrEqual(215 - BALAO.rabicho);
    expect(c.cobreFalante).toBe(0);
    expect(c.ponta.y).toBeLessThanOrEqual(215);
    expect(c.ponta.y).toBeGreaterThanOrEqual(c.base.y);
    expect(Math.abs(c.ponta.x - 270)).toBeLessThanOrEqual(BALAO.rabichoMeio * 2);
    expect(c.x + c.w / 2).toBeCloseTo(270, 6);
  });

  it('nunca sai de [12, 948] nem passa do topo mínimo (86 com HUD, 62 com faixas), em QUALQUER plano', () => {
    for (const x of [-50, 0, 40, 270, 480, 690, 920, 1010]) {
      for (const topo of [20, 100, 134, 215, 300]) {
        for (const lim of [LIMITES_COM_HUD, LIMITES_COM_FAIXAS]) {
          for (const lado of ['cima', 'direita', 'esquerda'] as const) {
            for (const nivel of ['topo', 'cabeca', 'abaixo'] as const) {
              const c = colocarBalao(caixa, { lado, nivel }, cabeca(x, topo), [], [{ x0: 300, y0: lim.topoMin, x1: 600, y1: lim.topoMin + 100 }], lim);
              const onde = `x ${x} topo ${topo} ${lado}/${nivel}`;
              expect(c.x, onde).toBeGreaterThanOrEqual(12);
              expect(c.x + c.w, onde).toBeLessThanOrEqual(948);
              expect(c.y, onde).toBeGreaterThanOrEqual(lim.topoMin);
              expect(c.y + c.h, onde).toBeLessThanOrEqual(Math.max(lim.base, lim.topoMin + c.h));
            }
          }
        }
      }
    }
    expect(LIMITES_COM_HUD.topoMin).toBe(86);
    expect(LIMITES_COM_FAIXAS.topoMin).toBe(62);
  });

  it('lutador ALTO (topo em 134, sem espaço acima): o plano vai para o LADO da cabeça em vez de cobrir o rosto', () => {
    const f = cabeca(270, 134, 336); // ZENON: 336 px de corpo
    const naCabeca = colocarBalao(caixa, SEM, f, [], [], LIMITES_COM_HUD);
    expect(naCabeca.cobreFalante).toBeGreaterThan(0);
    const { plano, colocacao: c } = escolherPlano([caixa], f, [], [], LIMITES_COM_HUD);
    expect(c.cobreFalante).toBe(0);
    expect(plano.lado).not.toBe('cima');
  });

  it('prefere o plano que não cobre o RIVAL nem o outro balão; dois balões no mesmo vão ficam EMPILHADOS (nível abaixo) com uma linha mais estreita', () => {
    const zenon = cabeca(270, 134, 336);
    const baatar = cabeca(690, 144, 326);
    const larga = { w: 400, h: 84 };
    const estreita = { w: 268, h: 108 };
    // sozinho, com o rival alto à direita: o balão largo ao lado de ZENON bate no rosto do BAATAR; a estreita cabe no vão
    const um = escolherPlano([larga, estreita], zenon, [retanguloDaCabeca(baatar)], [], LIMITES_COM_HUD);
    expect(um.colocacao.cobreFalante).toBe(0);
    expect(um.colocacao.cobreOutros).toBe(0);
    const r1 = retanguloDaColocacao(um.colocacao);
    // o segundo balão (BAATAR) joga com o primeiro já no lugar
    const dois = escolherPlano([larga, estreita], baatar, [retanguloDaCabeca(zenon)], [r1], LIMITES_COM_HUD);
    expect(dois.colocacao.cobreFalante).toBe(0);
    expect(dois.colocacao.cobreOutros).toBe(0);
    expect(dois.colocacao.cobreBaloes).toBe(0);
    expect(areaDeEncontro(retanguloDaColocacao(dois.colocacao), r1)).toBe(0);
  });

  it('o plano é UM só por balão: com o plano travado o lado e a variante não mudam, e o nível `abaixo` se apoia no balão de cima', () => {
    const f = cabeca(690, 144, 326);
    const ocupado = { x0: 340, y0: 86, x1: 608, y1: 194 };
    const c = colocarBalao({ w: 268, h: 108 }, { lado: 'esquerda', nivel: 'abaixo' }, f, [], [ocupado], LIMITES_COM_HUD);
    expect(c.lado).toBe('esquerda');
    expect(c.y).toBe(194 + 8);
    expect(c.cobreBaloes).toBe(0);
    const sem = colocarBalao({ w: 268, h: 108 }, { lado: 'esquerda', nivel: 'abaixo' }, f, [], [], LIMITES_COM_HUD);
    expect(sem.y).toBe(86); // sem balão em cima, cai para o topo permitido
  });

  it('área de encontro: zero sem sobreposição, positiva com', () => {
    expect(areaDeEncontro({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 10, y0: 0, x1: 20, y1: 10 })).toBe(0);
    expect(areaDeEncontro({ x0: 0, y0: 0, x1: 10, y1: 10 }, { x0: 5, y0: 5, x1: 20, y1: 20 })).toBe(25);
  });
});

describe('variantesDoBalao (a mesma fala em linhas mais estreitas)', () => {
  const ctx = gravador().ctx;
  it('a primeira é sempre a de 372 px; as outras só entram se quebram de outro jeito', () => {
    expect(LARGURAS_DA_LINHA).toEqual([372, 300, 240]);
    // com o medidor falso (10 px por texto) tudo cabe em 1 linha: uma variante só
    expect(variantesDoBalao(ctx, 'Uma fala curta.', 'HAYATO')).toHaveLength(1);
  });
});

describe('a cabeça na tela (câmera e zoom de apresentação)', () => {
  const prod = montarElenco();
  const f = (_id: string) => ({ x: 270, y: 470, facing: 1 as const, ficha: null, pose: { name: 'idle', flip: 1, dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0 } }) as never;

  it('o topo do frame de HAYATO em idle0, sem câmera, é o medido no navegador (y 215); com câmera e zoom segue a mesma conta do desenharMundo', () => {
    const sem = cabecaNaTela(f('hayato'), prod['hayato'], 'idle0', { x: 480, z: 1 });
    expect(sem.topo).toBeCloseTo(215, 0);
    expect(sem.x).toBe(270);
    const cam = cabecaNaTela(f('hayato'), prod['hayato'], 'idle0', { x: 480, z: 1.05 });
    expect(cam.topo).toBeCloseTo(470 - (470 - 215) * 1.05, 0);
    expect(cam.x).toBeCloseTo(480 + (270 - 480) * 1.05, 6);
    const zoom = cabecaNaTela(f('hayato'), prod['hayato'], 'idle0', { x: 480, z: 1 }, 0, { fator: 1.08, x: 270 });
    expect(zoom.topo).toBeCloseTo(470 - (470 - 215) * 1.08, 0);
    expect(zoom.x).toBe(270); // ancorado no x dele
  });

  it('o ZENON (escala 1,32) tem o topo mais alto que todos: a razão de o balão ir para o lado', () => {
    const topos = Object.keys(prod).map((id) => [id, cabecaNaTela(f(id), prod[id as keyof typeof prod], 'idle0', { x: 480, z: 1 }).topo] as const);
    const menor = topos.reduce((a, b) => (b[1] < a[1] ? b : a));
    expect(['zenon', 'baatar']).toContain(menor[0]);
    expect(menor[1]).toBeLessThan(150);
  });

  it('paraATela: a câmera e depois o zoom, ancorados no chão (y 470)', () => {
    expect(paraATela(270, 470, { x: 480, z: 1.1 })).toEqual({ x: 480 + (270 - 480) * 1.1, y: 470 });
    const p = paraATela(270, 300, { x: 480, z: 1 }, { fator: 1.08, x: 270 });
    expect(p.x).toBe(270);
    expect(p.y).toBeCloseTo(470 + (300 - 470) * 1.08, 9);
  });
});

describe('desenharBalao', () => {
  const ctx0 = gravador().ctx;
  const caixa = medirBalao(ctx0, 'Frase de teste.\nSegunda linha.', 'HAYATO');
  const col = colocarBalao(caixa, { lado: 'cima', nivel: 'topo' }, { x: 270, topo: 215, meiaLargura: 43, altura: 92 }, [], [], LIMITES_COM_HUD);
  const quadro = { letras: Infinity, escala: 1, alfa: 1, seta: false, tick: 0, corDoNome: '#6fe0ff', variante: 'abertura' as const };
  /** Só o texto da fala (as sombras duras impressas saem em dobro: cada palavra é escrita duas vezes, a sombra e a letra). */
  const fala = (g: ReturnType<typeof gravador>) => g.chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t));

  it('escreve a plaquinha com o nome e as palavras em CAIXA ALTA, uma a uma, cada uma com a sombra dura impressa (inteiras com letras = Infinity); alfa 0 não desenha nada', () => {
    const g = gravador();
    desenharBalao(g.ctx, caixa, col, quadro);
    // a plaquinha (nome, 1x) e depois, por palavra, a sombra e a letra
    expect(fala(g)).toEqual(['HAYATO', 'FRASE', 'FRASE', 'DE', 'DE', 'TESTE.', 'TESTE.', 'SEGUNDA', 'SEGUNDA', 'LINHA.', 'LINHA.']);
    const vazio = gravador();
    desenharBalao(vazio.ctx, caixa, col, { ...quadro, alfa: 0 });
    expect(vazio.chamadas).toEqual([]);
  });

  it('revela letra a letra, atravessando as linhas: com 20 letras, a 1ª linha inteira e 5 da 2ª (palavra parcial: só as letras já reveladas)', () => {
    const g = gravador();
    desenharBalao(g.ctx, caixa, col, { ...quadro, letras: 20 });
    expect([...new Set(fala(g))]).toEqual(['HAYATO', 'FRASE', 'DE', 'TESTE.', 'SEGUN']);
    const antes = gravador();
    desenharBalao(antes.ctx, caixa, col, { ...quadro, letras: 0 });
    expect(fala(antes)).toEqual(['HAYATO']);
  });

  it('o ▶ é um triângulo DESENHADO (a fonte não tem o glifo): nenhum fillText o escreve; fica na faixa reservada e balança 2 px (parado no movimento reduzido)', () => {
    const comSeta = gravador();
    desenharBalao(comSeta.ctx, caixa, col, { ...quadro, seta: true });
    expect(fala(comSeta).some((t) => t.includes('▶'))).toBe(false);
    const fills = (g: ReturnType<typeof gravador>) => g.chamadas.filter(([n]) => n === 'fill').length;
    const sem = gravador();
    desenharBalao(sem.ctx, caixa, col, quadro);
    expect(fills(comSeta)).toBe(fills(sem) + 1);
    // a ponta do triângulo (o 2º vértice) anda com o tick; no movimento reduzido fica parada
    const ponta = (tick: number, reduz: boolean): number => {
      const g = gravador();
      desenharBalao(g.ctx, caixa, col, { ...quadro, seta: true, tick, reduz });
      const pts = g.chamadas.filter(([n]) => n === 'moveTo' || n === 'lineTo').slice(-3) as Array<[string, number, number]>;
      return pts[1]?.[1] ?? NaN;
    };
    const xs = [0, 7, 14, 21, 28].map((t) => ponta(t, false));
    expect(Math.max(...xs) - Math.min(...xs)).toBeGreaterThan(2);
    expect(Math.max(...xs) - Math.min(...xs)).toBeLessThanOrEqual(4);
    expect(new Set([0, 7, 14, 21, 28].map((t) => ponta(t, true))).size).toBe(1);
  });

  it('o pop: escala 0,6 -> overshoot -> 1 em torno da ponta do rabicho', () => {
    expect(escalaDoPop(0)).toBeCloseTo(0.6, 9);
    expect(escalaDoPop(1)).toBe(1);
    expect(escalaDoPop(0.6)).toBeGreaterThan(1);
    const g = gravador();
    desenharBalao(g.ctx, caixa, col, { ...quadro, escala: 0.9 });
    expect(g.chamadas.some(([n, a]) => n === 'scale' && a === 0.9)).toBe(true);
  });
});

describe('a faixa reservada ao ▶ da vitória (o ▶ não cobre a última letra)', () => {
  const ctx0 = gravador().ctx;
  it('medirBalao com reserva: a altura cresce `reserva` px e a largura não muda (balão <= 400 continua valendo)', () => {
    const sem = medirBalao(ctx0, 'Frase de teste.', 'HAYATO');
    const com = medirBalao(ctx0, 'Frase de teste.', 'HAYATO', 372, RESERVA_DA_SETA);
    expect(RESERVA_DA_SETA).toBe(14);
    expect(com.h).toBe(sem.h + 14);
    expect(com.w).toBe(sem.w);
    expect(com.reserva).toBe(14);
    expect(sem.reserva).toBe(0);
    expect(variantesDoBalao(ctx0, 'Uma fala.', 'X', RESERVA_DA_SETA)[0]?.h).toBe(62 + 14);
  });

  it('o triângulo é desenhado DENTRO da faixa reservada: todos os pontos dele ficam abaixo da última linha de texto', () => {
    const caixa = medirBalao(ctx0, 'Frase de teste.\nSegunda linha.', 'HAYATO', 372, RESERVA_DA_SETA);
    const col = colocarBalao(caixa, { lado: 'cima', nivel: 'topo' }, { x: 270, topo: 215, meiaLargura: 43, altura: 92 }, [], [], LIMITES_COM_HUD);
    const g = gravador();
    desenharBalao(g.ctx, caixa, col, { letras: Infinity, escala: 1, alfa: 1, seta: true, tick: 0, reduz: true, corDoNome: '#ffffff' });
    const pontos = g.chamadas.filter(([n]) => n === 'moveTo' || n === 'lineTo').slice(-3) as Array<[string, number, number]>;
    expect(pontos).toHaveLength(3);
    // a última linha de base (Bangers: as letras sobem 0,727 em e descem ~5 px: Ç e vírgula) e a borda de baixo do painel
    const ultimaBase = col.y + BALAO.placaAltura + 1 + BALAO.acento * BALAO.corpo + BALAO.linha * (caixa.linhas.length - 1);
    for (const [, , y] of pontos) {
      expect(y, 'topo do ▶ abaixo da última linha de base (direção de arte §6)').toBeGreaterThanOrEqual(ultimaBase + 3);
      expect(y).toBeLessThanOrEqual(col.y + col.h - BALAO.sombra - BALAO.margemBase + 8);
    }
  });
});
