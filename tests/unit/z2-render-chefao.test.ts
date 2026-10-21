import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { CONFIGURACOES_PADRAO, type IdLutador, type LeituraLuta, type LutadorLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { BRASEIROS_GR, ORDEM_DE_ACENDER, VIDA_DO_RAIO, raiosVivos, retanguloDaArte, sobreposicaoDaArenaGr } from '../../src/render/arena-gr';
import { DURACAO_PADRAO_DA_CENA, chefeDaLeitura, desenharAuraChefe, rampaDaFase2 } from '../../src/render/aura-chefe';
import { SOBREPOSICOES_DE_CENARIO, desenharCenarioLuta } from '../../src/render/cenario';
import { desenharProjetil, type ProjetilVisual } from '../../src/render/efeitos';
import { ONIX, contraste, desenharAssinatura, desenharEstilo, estampaDaTarja, mistura } from '../../src/render/estilos-especiais';
import { desenharHUD, TITULO_MAX_NO_HUD } from '../../src/render/hud';
import { IDENTIDADES, identidadeDe } from '../../src/render/identidade-especiais';
import { chDaFicha, desenharLutador } from '../../src/render/lutador';
import { BARRA_DE_ENERGIA, DEFASAGEM_ENTRE_MOEDAS, MoedasDeDreno, OURO_DA_MOEDA, VIDA_DA_MOEDA, moedasDoEvento, pontaDaBarra } from '../../src/render/moedas-dreno';
import { ACHATAMENTO_ANEL, GIRO_DO_ARCO, RAIO_ANEL } from '../../src/render/projetil-anel';
import type { Ctx } from '../../src/render/tela';
import type { Elenco } from '../../src/assets/elenco';

/*
 * Z2 (Lyra): a render do chefão ZENON: projétil `anel`, estilo E12 e as 5 identidades, aura sombria e arena `gr` da fase 2 (o "escurecimento do
 * céu" que a E3 prometia nunca existiu), rótulo do HUD. Tudo contra o `ZENON_DEF` de produção montado com o atlas real dele.
 */
const prod = montarElenco();
const ID_ZENON = 'zenon' as IdLutador;
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

type Chamada = [string, ...unknown[]];
const PRIMITIVAS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'drawImage']);

/** Contexto que grava chamadas, atribuições e as paradas de cor dos degradês. */
function gravador() {
  const chamadas: Chamada[] = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return (...a: unknown[]) => {
          chamadas.push([nome, ...a]);
          return { addColorStop: (...s: unknown[]) => chamadas.push(['addColorStop', ...s]) };
        };
      }
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, typeof valor === 'object' ? '[degradê]' : valor]);
      return true;
    },
  }) as unknown as Ctx;
  return {
    ctx,
    chamadas,
    primitivas: () => chamadas.filter(([n]) => PRIMITIVAS.has(n)).length,
    proibido: () => chamadas.some(([n]) => n === '=shadowBlur' || n === '=filter' || n === 'getImageData'),
    textos: () => chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t)),
  };
}

type Estado = { fillStyle: unknown; strokeStyle: unknown; op: unknown; alfa: number };
/** Refaz o estado do contexto em cada `fill`/`stroke` (cor, modo de composição e alfa), respeitando `save`/`restore`. */
function desenhos(chamadas: readonly Chamada[]): Array<{ tipo: string; e: Estado }> {
  const pilha: Estado[] = [];
  let e: Estado = { fillStyle: '#000', strokeStyle: '#000', op: 'source-over', alfa: 1 };
  const saida: Array<{ tipo: string; e: Estado }> = [];
  for (const [n, v] of chamadas) {
    if (n === 'save') pilha.push({ ...e });
    else if (n === 'restore') e = pilha.pop() ?? e;
    else if (n === '=fillStyle') e = { ...e, fillStyle: v };
    else if (n === '=strokeStyle') e = { ...e, strokeStyle: v };
    else if (n === '=globalCompositeOperation') e = { ...e, op: v };
    else if (n === '=globalAlpha') e = { ...e, alfa: Number(v) };
    else if (n === 'fill' || n === 'stroke' || n === 'fillRect') saida.push({ tipo: n, e: { ...e } });
  }
  return saida;
}

const leitura = (cfg: { c1?: IdLutador; c2?: IdLutador; chefe?: boolean } = {}): Game => {
  const g = new Game({ lutadores: prod, rng: criarRng(5) });
  g.setup({ mode: 'arcade', c1: cfg.c1 ?? 'hayato', c2: cfg.c2 ?? ID_ZENON, cpu: 0, chefe: cfg.chefe ?? true, esquiva: true }, CONFIGURACOES_PADRAO);
  return g;
};

describe('projétil `anel` (SELO DO ARCONTE e SELO MAIOR)', () => {
  const pr = (frame: number, sc = 1.5): ProjetilVisual => ({ x: 300, y: 300, sc, sy: sc, frame, estilo: 'anel', vx: 7, dir: 1, cores: ['#d6339a', '#0c0710', '#2a0418'] });

  it('desenha com <= 12 primitivas, sem shadowBlur/filter/getImageData, e o mesmo quadro sai igual', () => {
    for (const sc of [1, 1.5, 1.9]) for (const frame of [0, 5, 30, 150]) {
      const a = gravador();
      desenharProjetil(a.ctx, pr(frame, sc));
      expect(a.primitivas(), `sc ${sc} frame ${frame}`).toBeLessThanOrEqual(12);
      expect(a.primitivas()).toBeGreaterThan(0);
      expect(a.proibido()).toBe(false);
      const b = gravador();
      desenharProjetil(b.ctx, pr(frame, sc));
      expect(b.chamadas).toEqual(a.chamadas);
      expect(a.chamadas.filter(([n]) => n === 'save').length).toBe(a.chamadas.filter(([n]) => n === 'restore').length);
    }
  });

  it('são elipses achatadas (ry = 0,45·rx), a de fora com rx = 34·sc, e a escala do projétil vale', () => {
    for (const sc of [1.5, 1.9]) {
      const g = gravador();
      desenharProjetil(g.ctx, pr(0, sc));
      const el = g.chamadas.filter(([n]) => n === 'ellipse');
      expect(el.length).toBeGreaterThanOrEqual(3);
      for (const [, , , rx, ry] of el) expect(Number(ry) / Number(rx)).toBeCloseTo(0.45, 5);
      expect(ACHATAMENTO_ANEL).toBe(0.45);
      const maior = Math.max(...el.map(([, , , rx]) => Number(rx)));
      expect(maior).toBeGreaterThan(RAIO_ANEL * sc * 1.1 - 0.5); // o núcleo de fora (1,12) é o maior; a borda de fora (1,0) vem logo abaixo
      expect(el.some(([, , , rx]) => Math.abs(Number(rx) - RAIO_ANEL * sc) < RAIO_ANEL * sc * 0.06)).toBe(true);
    }
  });

  it('o NÚCLEO é ônix em source-over (alfa <= 0,9) e a BORDA é brilho em lighter: o centro não some no modo aditivo', () => {
    const g = gravador();
    desenharProjetil(g.ctx, pr(7));
    const d = desenhos(g.chamadas);
    const nucleo = d.filter((x) => x.tipo === 'fill' && x.e.fillStyle === '#0c0710');
    expect(nucleo.length).toBeGreaterThanOrEqual(1);
    for (const n of nucleo) {
      expect(n.e.op).toBe('source-over');
      expect(n.e.alfa).toBeLessThanOrEqual(0.9);
    }
    const borda = d.filter((x) => x.tipo === 'stroke' && x.e.strokeStyle === '#d6339a');
    expect(borda.length).toBeGreaterThanOrEqual(1);
    for (const b of borda) expect(b.e.op).toBe('lighter');
  });

  it('o arco de destaque gira 0,25 rad por tick', () => {
    const inicio = (frame: number): number => {
      const g = gravador();
      desenharProjetil(g.ctx, pr(frame));
      const el = g.chamadas.filter(([n]) => n === 'ellipse');
      return Number((el[el.length - 1] as Chamada)[6]); // ellipse(x, y, rx, ry, rot, ini, fim): o último traçado é o arco
    };
    expect(GIRO_DO_ARCO).toBe(0.25);
    expect(inicio(11) - inicio(10)).toBeCloseTo(0.25, 5);
    expect(inicio(40) - inicio(30)).toBeCloseTo(2.5, 5);
  });

  it('os outros estilos continuam no desenho de antes (nenhuma elipse concêntrica de anel)', () => {
    const g = gravador();
    desenharProjetil(g.ctx, { ...pr(3), estilo: 'orb' });
    expect(g.chamadas.some(([n]) => n === 'ellipse')).toBe(false);
  });
});

describe('estilo E12 MEANDRO E ANEL e as 5 identidades do ZENON', () => {
  const IDENTIDADES_ZENON = Object.fromEntries(Object.entries(IDENTIDADES).filter(([k]) => k.startsWith('zenon.')));
  const CHAVES = Object.keys(IDENTIDADES_ZENON);

  it('são 5 (SELO, COLUNA, TRIBUTO na base; SELO MAIOR e DECRETO na chefe2) e o título é o mv.name EXATO dos dados de produção', () => {
    expect(CHAVES.sort()).toEqual(['zenon.base.sDown', 'zenon.base.sFire', 'zenon.base.sFwd', 'zenon.chefe2.sFire', 'zenon.chefe2.sFwd']);
    for (const chave of CHAVES) {
      const [, fichaS, golpe] = chave.split('.') as [string, string, string];
      const ch = chDaFicha(prod[ID_ZENON], fichaS === 'base' ? null : fichaS);
      const mv = (ch.moves as Record<string, { name?: string }>)[golpe];
      expect(mv, chave).toBeDefined();
      expect(IDENTIDADES_ZENON[chave]?.titulo, chave).toBe(mv?.name);
    }
  });

  it('E12 é exclusivo do ZENON (nenhum dos 28 de produção o usa) e é o único estilo dele', () => {
    for (const [chave, id] of Object.entries(IDENTIDADES).filter(([k]) => !k.startsWith('zenon.'))) expect(id.estilo, chave).not.toBe('E12');
    for (const [chave, id] of Object.entries(IDENTIDADES_ZENON)) expect(id.estilo, chave).toBe('E12');
  });

  it('nenhum par dos 33 é igual (estilo + variante + brilho + recorte + faixa) e o contraste do nome é >= 3:1 nos 5', () => {
    const vistos = new Set<string>();
    for (const [chave, id] of Object.entries(IDENTIDADES)) {
      const assinatura = [id.estilo, id.variante, id.paleta.brilho, id.recorte, id.faixa.posicao, id.faixa.angulo].join('|');
      expect(vistos.has(assinatura), chave).toBe(false);
      vistos.add(assinatura);
    }
    for (const [chave, id] of Object.entries(IDENTIDADES_ZENON)) {
      const { nucleo, brilho, sombra } = id.paleta;
      const fundo = mistura(sombra, brilho, 0.35);
      expect(contraste(nucleo, fundo), `${chave} topo`).toBeGreaterThanOrEqual(3);
      expect(contraste(mistura(nucleo, brilho, 0.4), fundo), `${chave} base`).toBeGreaterThanOrEqual(3);
    }
  });

  it('identidadeDe: a fase 1 (ficha `chefe`) cai na base; a chefe2 troca o SELO e o →+ESP e herda a COLUNA', () => {
    expect(identidadeDe(ID_ZENON, null, 'sFire')?.titulo).toBe('SELO DO ARCONTE');
    expect(identidadeDe(ID_ZENON, 'chefe', 'sFire')?.titulo).toBe('SELO DO ARCONTE');
    expect(identidadeDe(ID_ZENON, 'chefe', 'sFwd')?.titulo).toBe('TRIBUTO');
    expect(identidadeDe(ID_ZENON, 'chefe2', 'sFire')?.titulo).toBe('SELO MAIOR');
    expect(identidadeDe(ID_ZENON, 'chefe2', 'sFwd')?.titulo).toBe('DECRETO');
    expect(identidadeDe(ID_ZENON, 'chefe2', 'sDown')?.titulo).toBe('COLUNA DE ÔNIX');
    expect(identidadeDe('hayato', null, 'sFire')?.titulo).toBe('RAIJIN-DAN'); // as 28 de produção seguem achando as suas
  });

  it('cada variante: <= 24 primitivas por quadro (<= 12 na rajada da CURTA), sem shadowBlur/filter/getImageData, pura e sem vida = nada', () => {
    for (const [chave, id] of Object.entries(IDENTIDADES_ZENON)) {
      for (const [t, vida] of [[8, 0.2], [14, 1], [22, 1], [30, 1], [37, 0.5]] as const) {
        for (const escala of [1, 0.5]) {
          const rodar = () => {
            const g = gravador();
            desenharEstilo(id.estilo, { ctx: g.ctx, t, vida, p: id.paleta, c: { x: 250, y: 0, w: 700, h: id.faixa.h }, sem: 12345, variante: id.variante, escala, pesado: id.ritmo === 'PESADO' });
            return g;
          };
          const a = rodar();
          expect(a.primitivas(), `${chave} t=${t} escala=${escala}`).toBeLessThanOrEqual(escala < 1 ? 12 : 24);
          expect(a.proibido(), chave).toBe(false);
          expect(rodar().chamadas, `${chave} t=${t}: pura`).toEqual(a.chamadas);
          if (t === 22) expect(a.primitivas(), `${chave} desenha algo no meio do golpe`).toBeGreaterThan(0);
        }
      }
      const vazio = gravador();
      desenharEstilo(id.estilo, { ctx: vazio.ctx, t: 3, vida: 0, p: id.paleta, c: { x: 250, y: 0, w: 700, h: 132 }, sem: 1, variante: id.variante, escala: 1, pesado: false });
      expect(vazio.chamadas).toEqual([]);
    }
  });

  it('o núcleo ônix (#0c0710) é desenhado em source-over com alfa <= 0,85; só o brilho usa lighter (um núcleo quase preto não soma nada no aditivo)', () => {
    expect(ONIX).toBe('#0c0710');
    for (const [chave, id] of Object.entries(IDENTIDADES_ZENON)) {
      const g = gravador();
      desenharEstilo(id.estilo, { ctx: g.ctx, t: 22, vida: 1, p: id.paleta, c: { x: 250, y: 0, w: 700, h: id.faixa.h }, sem: 7, variante: id.variante, escala: 1, pesado: id.ritmo === 'PESADO' });
      const d = desenhos(g.chamadas);
      const onix = d.filter((x) => x.tipo === 'fill' && x.e.fillStyle === ONIX);
      expect(onix.length, `${chave}: núcleo`).toBeGreaterThanOrEqual(1);
      for (const o of onix) {
        expect(o.e.op, chave).toBe('source-over');
        expect(o.e.alfa, chave).toBeLessThanOrEqual(0.85);
      }
      expect(d.some((x) => x.tipo === 'stroke' && x.e.op === 'lighter' && x.e.strokeStyle === id.paleta.brilho), `${chave}: borda em brilho`).toBe(true);
    }
  });

  it('a linha de meandro (ângulos retos, módulo de 24 px) corre pela faixa: só segmentos horizontais e verticais', () => {
    const g = gravador();
    const id = IDENTIDADES_ZENON['zenon.base.sFire'] as NonNullable<(typeof IDENTIDADES_ZENON)[string]>;
    desenharEstilo('E12', { ctx: g.ctx, t: 20, vida: 1, p: id.paleta, c: { x: 250, y: 0, w: 700, h: 132 }, sem: 3, variante: 'selo', escala: 1, pesado: false });
    const pts = g.chamadas.filter(([n]) => n === 'moveTo' || n === 'lineTo');
    let ant: [number, number] | null = null;
    let retos = 0;
    for (const [n, x, y] of pts) {
      if (n === 'lineTo' && ant) {
        const dx = Math.abs(Number(x) - ant[0]);
        const dy = Math.abs(Number(y) - ant[1]);
        expect(dx === 0 || dy === 0, `segmento torto (${dx}, ${dy})`).toBe(true);
        retos++;
      }
      ant = [Number(x), Number(y)];
    }
    expect(retos).toBeGreaterThan(20);
  });

  it('a assinatura do acerto: o anel se fecha e solta moedas douradas; na defesa (eco) são 4 segmentos retos, sem moedas', () => {
    const base = { estilo: 'E12', variante: 'tributo', p: (IDENTIDADES_ZENON['zenon.base.sFwd'] as NonNullable<(typeof IDENTIDADES_ZENON)[string]>).paleta, x: 500, y: 250, sem: 9, dir: 1 as const } as const;
    for (const idade of [2, 8, 14]) {
      const acerto = gravador();
      desenharAssinatura({ ctx: acerto.ctx, idade, ...base });
      expect(acerto.primitivas(), `idade ${idade}`).toBeLessThanOrEqual(16);
      expect(acerto.proibido()).toBe(false);
    }
    const a = gravador();
    desenharAssinatura({ ctx: a.ctx, idade: 12, ...base });
    expect(desenhos(a.chamadas).some((d) => d.tipo === 'fill' && d.e.fillStyle === '#d9b25a')).toBe(true); // as moedas
    const eco = gravador();
    desenharAssinatura({ ctx: eco.ctx, idade: 8, eco: true, ...base });
    expect(desenhos(eco.chamadas).some((d) => d.e.fillStyle === '#d9b25a')).toBe(false);
    expect(eco.chamadas.filter(([n]) => n === 'moveTo').length).toBe(4);
    expect(eco.primitivas()).toBeLessThan(a.primitivas());
  });

  it('a estampa da tarja a 10% de alfa não quebra e é um traçado só', () => {
    const g = gravador();
    estampaDaTarja(g.ctx, 'E12', '#d6339a', 1000, 132);
    expect(g.chamadas.filter(([n]) => n === 'stroke')).toHaveLength(1);
    expect(g.chamadas).toContainEqual(['=globalAlpha', 0.1]);
  });
});

describe('fase 2: a rampa vem do ESTADO, não de um evento', () => {
  const ch = prod[ID_ZENON];
  const f = (extra: Partial<LutadorLeitura>): LutadorLeitura => ({ ...(leitura().p2 as unknown as LutadorLeitura), ...extra }) as LutadorLeitura;
  const luta = (phase: LeituraLuta['phase'], t: number): LeituraLuta => ({ phase, t }) as unknown as LeituraLuta;

  it('0 fora do chefão e com todas as barras; 0 entre a troca de barra e a cena (ele ainda está caído)', () => {
    expect(rampaDaFase2(luta('fight', 0), f({ chefe: false, barras: 1, barrasMax: 1 }), ch)).toBe(0);
    expect(rampaDaFase2(luta('cena-chefe', 50), f({ chefe: false, barras: 1, barrasMax: 2 }), ch)).toBe(0);
    expect(rampaDaFase2(luta('fight', 100), f({ chefe: true, barras: 2, barrasMax: 2, ficha: 'chefe' }), ch)).toBe(0);
    expect(rampaDaFase2(luta('fight', 100), f({ chefe: true, barras: 1, barrasMax: 2, ficha: 'chefe' }), ch)).toBe(0);
  });

  it('sobe de 0 a 1 ao longo dos 90 ticks da cena e segura 1 (para sempre) com a ficha da fase 2 ativa', () => {
    const cena = f({ chefe: true, barras: 1, barrasMax: 2, ficha: 'chefe' });
    expect(rampaDaFase2(luta('cena-chefe', 0), cena, ch)).toBe(0);
    expect(rampaDaFase2(luta('cena-chefe', 45), cena, ch)).toBeCloseTo(0.5, 5);
    expect(rampaDaFase2(luta('cena-chefe', 90), cena, ch)).toBe(1);
    expect(rampaDaFase2(luta('cena-chefe', 400), cena, ch)).toBe(1);
    const dois = f({ chefe: true, barras: 1, barrasMax: 2, ficha: 'chefe2' });
    for (const fase of ['fight', 'ko', 'roundend', 'matchend', 'timeover'] as const) expect(rampaDaFase2(luta(fase, 7), dois, ch), fase).toBe(1);
    expect(ch.chefe?.cena.duracao).toBe(90);
  });

  it('sem o def (leitura fabricada) usa a duração padrão da cena e nunca passa de 1', () => {
    expect(DURACAO_PADRAO_DA_CENA).toBe(90);
    expect(rampaDaFase2(luta('cena-chefe', 45), f({ chefe: true, barras: 1, barrasMax: 2 }), undefined)).toBeCloseTo(0.5, 5);
    expect(rampaDaFase2(luta('fight', 5), f({ chefe: true, barras: 1, barrasMax: 2, ficha: 'chefe2' }), undefined)).toBe(0);
  });

  it('chefeDaLeitura acha o chefe ou null', () => {
    const g = leitura();
    expect(chefeDaLeitura(g)?.id).toBe(ID_ZENON);
    expect(chefeDaLeitura(leitura({ chefe: false }))).toBeNull();
  });
});

describe('aura sombria do chefe (só a fase 2)', () => {
  const f = leitura().p2 as unknown as LutadorLeitura;

  it('rampa 0 (fase 1, lutador comum): ZERO chamadas ao contexto', () => {
    const g = gravador();
    desenharAuraChefe(g.ctx, f, 0, '#e0249a', 1.36);
    expect(g.chamadas).toEqual([]);
  });

  it('desenharLutador com aura 0 faz exatamente as mesmas chamadas de antes (e com aura > 0 faz mais)', () => {
    const sem = gravador();
    desenharLutador(sem.ctx, f, prod[ID_ZENON], arte);
    const zero = gravador();
    desenharLutador(zero.ctx, f, prod[ID_ZENON], arte, 0);
    expect(zero.chamadas).toEqual(sem.chamadas);
    const com = gravador();
    desenharLutador(com.ctx, f, prod[ID_ZENON], arte, 1);
    expect(com.chamadas.length).toBeGreaterThan(sem.chamadas.length);
  });

  it('com rampa 1: <= 16 primitivas, sem shadowBlur/filter/getImageData; núcleo ônix em source-over <= 0,55 e borda em lighter <= 0,35', () => {
    const g = gravador();
    desenharAuraChefe(g.ctx, f, 1, '#e0249a', 1.36);
    expect(g.primitivas()).toBeGreaterThan(0);
    expect(g.primitivas()).toBeLessThanOrEqual(16);
    expect(g.proibido()).toBe(false);
    const d = desenhos(g.chamadas);
    const onix = d.filter((x) => x.tipo === 'fill' && x.e.op === 'source-over');
    expect(onix.length).toBeGreaterThan(0);
    for (const o of onix) expect(o.e.alfa).toBeLessThanOrEqual(0.55);
    const borda = d.filter((x) => x.tipo === 'fill' && x.e.op === 'lighter');
    expect(borda.length).toBeGreaterThan(0);
    for (const b of borda) expect(b.e.alfa).toBeLessThanOrEqual(0.35);
  });

  it('respira: o desenho muda com a idade e a rampa escala o alfa (meia rampa = metade do alfa do núcleo)', () => {
    const a = gravador();
    desenharAuraChefe(a.ctx, { ...f, age: 0 }, 1, '#e0249a', 1.36);
    const b = gravador();
    desenharAuraChefe(b.ctx, { ...f, age: 28 }, 1, '#e0249a', 1.36);
    expect(b.chamadas).not.toEqual(a.chamadas);
    const meia = gravador();
    desenharAuraChefe(meia.ctx, f, 0.5, '#e0249a', 1.36);
    const cheia = gravador();
    desenharAuraChefe(cheia.ctx, f, 1, '#e0249a', 1.36);
    const alfaDoNucleo = (g: ReturnType<typeof gravador>): number => (desenhos(g.chamadas).find((x) => x.tipo === 'fill' && x.e.op === 'source-over') as { e: Estado }).e.alfa;
    expect(alfaDoNucleo(meia)).toBeCloseTo(alfaDoNucleo(cheia) / 2, 5);
  });
});

describe('arena gr: sobreposição procedural da fase 2', () => {
  it('só a arena `gr` tem sobreposição (o `mn` não: o gancho nunca escureceu o céu dele)', () => {
    expect(SOBREPOSICOES_DE_CENARIO['gr']).toBe(sobreposicaoDaArenaGr);
    for (const id of ['jp', 'cn', 'kr', 'br', 'ng', 'mx', 'fr', 'in', 'mn']) expect(SOBREPOSICOES_DE_CENARIO[id], id).toBeUndefined();
  });

  it('o retângulo da arte é o mesmo que `desenharCenarioLuta` usa (paralaxe de 5% da câmera)', () => {
    for (const camX of [160, 480, 800]) {
      const g = gravador();
      desenharCenarioLuta(g.ctx, IMG, camX);
      const [, , x, y, w, h] = g.chamadas.find(([n]) => n === 'drawImage') as Chamada;
      expect(retanguloDaArte(camX)).toEqual({ x, y, w, h });
    }
  });

  it('fase 1 (rampa 0): braseiros laranja, sem véu no céu, sem chama púrpura e sem raio; fase 2: púrpura, véu, chama e raio', () => {
    const f1 = gravador();
    sobreposicaoDaArenaGr(f1.ctx, { rampa: 0, t: 100, camX: 480 });
    const cores1 = f1.chamadas.filter(([n]) => n === 'addColorStop').map(([, , c]) => String(c)).filter((c) => c.endsWith('cc'));
    expect(cores1.filter((c) => c.startsWith('#ff8a2a')).length).toBe(6); // 6 focos, na cor laranja
    expect(cores1.some((c) => c.startsWith('#b02a7e'))).toBe(false);
    expect(f1.chamadas.filter(([n]) => n === 'createLinearGradient')).toHaveLength(0); // sem véu
    expect(f1.primitivas()).toBe(6);

    const f2 = gravador();
    sobreposicaoDaArenaGr(f2.ctx, { rampa: 1, t: 100, camX: 480 });
    const cores2 = f2.chamadas.filter(([n]) => n === 'addColorStop').map(([, , c]) => String(c)).filter((c) => c.endsWith('cc'));
    expect(cores2.filter((c) => c.startsWith('#b02a7e')).length).toBeGreaterThanOrEqual(6);
    expect(cores2.some((c) => c.startsWith('#ff8a2a'))).toBe(false);
    expect(f2.chamadas.some(([n]) => n === 'createLinearGradient')).toBe(true); // o véu do céu
    expect(f2.primitivas()).toBeGreaterThan(f1.primitivas());
  });

  it('a mistura é contínua: meia rampa fica entre o laranja e o púrpura', () => {
    const g = gravador();
    sobreposicaoDaArenaGr(g.ctx, { rampa: 0.5, t: 100, camX: 480 });
    const c = g.chamadas.find(([n, , cor]) => n === 'addColorStop' && String(cor).endsWith('cc')) as Chamada;
    expect(String(c[2]).slice(0, 7)).toBe(mistura('#ff8a2a', '#b02a7e', 0.5));
  });

  it('orçamento: <= 24 primitivas por quadro em qualquer tick, rampa e acendimento; sem shadowBlur/filter/getImageData; pura', () => {
    let comRaio = 0;
    for (const rampa of [0, 0.3, 1]) for (let t = 0; t < 700; t += 3) for (const acesos of [undefined, 0, 2.5, 6]) {
      const rodar = () => {
        const g = gravador();
        sobreposicaoDaArenaGr(g.ctx, { rampa, t, camX: 480, ...(acesos === undefined ? {} : { acesos }) });
        return g;
      };
      const a = rodar();
      expect(a.primitivas(), `rampa ${rampa} t ${t} acesos ${String(acesos)}`).toBeLessThanOrEqual(24);
      expect(a.proibido()).toBe(false);
      if (t % 30 === 0) expect(rodar().chamadas).toEqual(a.chamadas);
      if (rampa === 1 && raiosVivos(t).length > 0) comRaio++;
    }
    expect(comRaio).toBeGreaterThan(0);
  });

  it('os raios: de 1 a 2 por evento, a cada 90 a 150 ticks, duram 7 ticks, deterministas e só na fase 2', () => {
    const ini: number[] = [];
    for (let t = 0; t < 4000; t++) {
      const v = raiosVivos(t);
      expect(raiosVivos(t)).toEqual(v);
      expect(v.length).toBeLessThanOrEqual(2);
      for (const r of v) {
        expect(r.idade).toBeGreaterThanOrEqual(0);
        expect(r.idade).toBeLessThan(VIDA_DO_RAIO);
        expect(r.fx).toBeGreaterThanOrEqual(0.12);
        expect(r.fx).toBeLessThanOrEqual(0.88);
      }
      if (v.some((r) => r.idade === 0) && !raiosVivos(t - 1).some((r) => r.idade >= 0 && r.sem % 2 === 0 && v.some((q) => q.sem === r.sem))) ini.push(t);
    }
    expect(ini.length).toBeGreaterThan(20);
    for (let i = 1; i < ini.length; i++) {
      const d = (ini[i] as number) - (ini[i - 1] as number);
      expect(d, `evento ${i}`).toBeGreaterThanOrEqual(90);
      expect(d, `evento ${i}`).toBeLessThanOrEqual(150);
    }
    // fase 1: nenhum traço de raio (nenhum `stroke` em lighter com a cor do raio)
    const f1 = gravador();
    sobreposicaoDaArenaGr(f1.ctx, { rampa: 0, t: ini[0] as number, camX: 480 });
    expect(f1.chamadas.filter(([n]) => n === 'stroke')).toHaveLength(0);
    const f2 = gravador();
    sobreposicaoDaArenaGr(f2.ctx, { rampa: 1, t: ini[0] as number, camX: 480 });
    expect(f2.chamadas.filter(([n]) => n === 'stroke')).toHaveLength(2);
  });

  it('a entrada dramática: os braseiros acendem da esquerda para a direita e o véu da arena some quando o último acende', () => {
    expect(ORDEM_DE_ACENDER.map((i) => BRASEIROS_GR[i]?.fx)).toEqual([...BRASEIROS_GR.map((b) => b.fx)].sort((p, q) => p - q));
    const brilhos = (acesos: number): number => {
      const g = gravador();
      sobreposicaoDaArenaGr(g.ctx, { rampa: 0, t: 50, camX: 480, acesos });
      return g.chamadas.filter(([n]) => n === 'createRadialGradient').length;
    };
    expect([0, 0.5, 1, 2.5, 5, 6].map(brilhos)).toEqual([0, 1, 1, 3, 5, 6]);
    const veu = (acesos: number): number => {
      const g = gravador();
      sobreposicaoDaArenaGr(g.ctx, { rampa: 0, t: 50, camX: 480, acesos });
      const i = g.chamadas.findIndex(([n, v]) => n === '=fillStyle' && String(v).startsWith('rgba(4,2,12,'));
      return i < 0 ? 0 : Number(/rgba\(4,2,12,([\d.]+)\)/.exec(String(g.chamadas[i]?.[1]))?.[1]);
    };
    expect(veu(6)).toBe(0);
    expect(veu(0)).toBeCloseTo(0.55, 5);
    expect(veu(3)).toBeCloseTo(0.275, 3);
  });

  it('os 6 braseiros da arte: o centro da chama que o Apolo mediu bate com o do arquivo cenario-gr.webp (a medida mora no disco, não só no texto)', async () => {
    const sharp = (await import('sharp')).default;
    const arq = fileURLToPath(new URL('../../public/assets/cenarios/cenario-gr.webp', import.meta.url));
    const { data, info } = await sharp(readFileSync(arq)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    expect([info.width, info.height]).toEqual([1920, 1080]);
    for (const b of BRASEIROS_GR) {
      const cx = Math.round(b.fx * info.width);
      const cy = Math.round(b.fy * info.height);
      let sx = 0;
      let sy = 0;
      let n = 0;
      for (let y = cy - 70; y < cy + 70; y++) for (let x = cx - 70; x < cx + 70; x++) {
        const i = (y * info.width + x) * 3;
        const r = data[i] as number;
        const g = data[i + 1] as number;
        const bl = data[i + 2] as number;
        if (r > 225 && g > 110 && g < 235 && bl < 120 && r - bl > 140) {
          sx += x;
          sy += y;
          n++;
        }
      }
      expect(n, `braseiro ${b.fx},${b.fy}: pixels de chama`).toBeGreaterThan(200);
      expect(Math.hypot(sx / n - cx, sy / n - cy), `braseiro ${b.fx},${b.fy}`).toBeLessThan(14);
    }
  });
});

describe('HUD do chefão: nome, título "O ARCONTE", barras e ×2/×1', () => {
  const textosDo = (g: Game): string[] => {
    const r = gravador();
    desenharHUD(r.ctx, g, elenco, { esquiva: true });
    return r.textos();
  };

  it('o rótulo do chefão leva o título do def ("CHEFÃO · O ARCONTE"), o nome e o ×2; na fase 2 vira ×1', () => {
    const g = leitura();
    const t = textosDo(g);
    expect(t).toContain('000000  CHEFÃO · O ARCONTE');
    expect(t).toContain('ZENON');
    expect(t).toContain('×2');
    g.p2.barras = 1;
    expect(textosDo(g)).toContain('×1');
  });

  it('título longo (acima de 16 letras) não entra: o rótulo fica só "CHEFÃO" (a linha tem 332 px junto do placar)', () => {
    expect('O ARCONTE'.length).toBeLessThanOrEqual(TITULO_MAX_NO_HUD);
    const g = leitura({ c2: 'baatar' }); // BAATAR: "O Avarga das Estepes" (20 letras); a luta de chefe só liga com o def de chefão, então só o rótulo importa
    g.p2.chefe = true;
    expect(textosDo(g)).toContain('000000  CHEFÃO');
  });

  it('lutador comum: rótulos de sempre (1P / CPU), sem ×N e sem título', () => {
    const g = leitura({ c1: 'hayato', c2: 'caio', chefe: false });
    const t = textosDo(g);
    expect(t.some((x) => x.includes('CHEFÃO'))).toBe(false);
    expect(t.some((x) => x.startsWith('×'))).toBe(false);
    expect(t).toContain('1P  000000');
  });
});

describe('o DRENO visível: moedas do golpe até a barra SUPER de quem drenou', () => {
  const luta = { cam: { x: 480, z: 1 }, fighters: [{ en: 100 }, { en: 40 }] } as unknown as LeituraLuta;
  const hit = (dreno: number | undefined, tipo: 'hit' | 'block' = 'hit') => ({ tipo, atacante: 1, defensor: 0, x: 300, y: 330, dir: 1, texto: null, ...(dreno === undefined ? {} : { dreno }) }) as unknown as import('../../src/core/contratos').EventoLuta;

  it('uma moeda por ~4 de energia (de 1 a 6); na defesa, metade; sem `dreno` nada', () => {
    expect([1, 4, 8, 12, 20, 40].map((d) => moedasDoEvento(d, false))).toEqual([1, 1, 2, 3, 5, 6]);
    expect([1, 4, 8, 12, 20, 40].map((d) => moedasDoEvento(d, true))).toEqual([1, 1, 1, 2, 3, 3]);
    const m = new MoedasDeDreno();
    m.reagir(hit(undefined), luta);
    m.reagir(hit(0), luta);
    m.reagir({ tipo: 'parry' } as never, luta);
    expect(m.ativas).toBe(0);
    m.reagir(hit(20), luta);
    expect(m.ativas).toBe(5);
    m.reagir(hit(10, 'block'), luta);
    expect(m.ativas).toBe(5 + 2);
  });

  it('as moedas voam do ponto do golpe (na câmera de agora) até a ponta da barra do ATACANTE e somem em <= 28 + defasagens ticks', () => {
    const m = new MoedasDeDreno();
    m.reagir(hit(20), { cam: { x: 480, z: 1.075 } } as never);
    const alvo = pontaDaBarra(1, 40);
    expect(alvo).toEqual({ x: BARRA_DE_ENERGIA.direita.x + BARRA_DE_ENERGIA.direita.w - BARRA_DE_ENERGIA.direita.w * 0.4, y: BARRA_DE_ENERGIA.y });
    expect(pontaDaBarra(0, 100)).toEqual({ x: 128 + 240, y: BARRA_DE_ENERGIA.y });
    const p0 = MoedasDeDreno.posicao({ x0: 100, y0: 300, idade: 0, lado: 1 }, alvo);
    expect([p0.x, p0.y]).toEqual([100, 300]);
    const pf = MoedasDeDreno.posicao({ x0: 100, y0: 300, idade: VIDA_DA_MOEDA, lado: 1 }, alvo);
    expect(pf.x).toBeCloseTo(alvo.x, 5);
    expect(pf.y).toBeCloseTo(alvo.y, 5);
    expect(pf.alfa).toBe(0);
    let t = 0;
    while (m.ativas > 0) {
      m.avancar();
      t++;
      expect(t).toBeLessThanOrEqual(VIDA_DA_MOEDA + 5 * DEFASAGEM_ENTRE_MOEDAS);
    }
    expect(t).toBeGreaterThanOrEqual(VIDA_DA_MOEDA);
  });

  it('desenho: losangos dourados em lighter, um preenchimento por moeda no ar, sem shadowBlur/filter; nada sem moedas; zerar() limpa', () => {
    const m = new MoedasDeDreno();
    const vazio = gravador();
    m.desenhar(vazio.ctx, luta);
    expect(vazio.chamadas).toEqual([]);
    m.reagir(hit(20), luta);
    for (let i = 0; i < 12; i++) m.avancar();
    const g = gravador();
    m.desenhar(g.ctx, luta);
    const fills = desenhos(g.chamadas).filter((d) => d.tipo === 'fill');
    expect(fills.length).toBeGreaterThan(0);
    expect(fills.length).toBeLessThanOrEqual(5);
    for (const f of fills) {
      expect(f.e.fillStyle).toBe(OURO_DA_MOEDA);
      expect(f.e.op).toBe('lighter');
    }
    expect(g.proibido()).toBe(false);
    m.zerar();
    expect(m.ativas).toBe(0);
  });
});
