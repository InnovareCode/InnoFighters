import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import type { EventoLuta, IdLutador, LeituraLuta, LutadorLeitura, ProjetilLeitura } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { montarElenco } from '../../ferramentas/balanco/elenco';
import { LIMITE_DA_SESSAO, SessaoEspecial, TICKS_DO_TOTAL } from '../../src/render/sessao-especial';
import type { Ctx } from '../../src/render/tela';

const prod = montarElenco();
const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(prod).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

function gravador() {
  const chamadas: Array<[string, ...unknown[]]> = [];
  const ctx = new Proxy({} as Record<string, unknown>, {
    get(_, nome: string) {
      if (nome === 'measureText') return () => ({ width: 10 });
      if (nome === 'createLinearGradient' || nome === 'createRadialGradient') {
        return (...a: unknown[]) => {
          chamadas.push([nome, ...a]);
          return { addColorStop: () => undefined };
        };
      }
      return (...a: unknown[]) => chamadas.push([nome, ...a]);
    },
    set(_, nome: string, valor: unknown) {
      chamadas.push([`=${nome}`, typeof valor === 'object' ? '[degradê]' : valor]);
      return true;
    },
  }) as unknown as Ctx;
  return { ctx, chamadas, textos: () => chamadas.filter(([n]) => n === 'fillText').map(([, t]) => String(t)) };
}

function lutador(id: IdLutador, indice: 0 | 1, extra: Partial<LutadorLeitura> = {}): LutadorLeitura {
  return {
    id, indice, x: indice === 0 ? 300 : 460, y: 470, facing: indice === 0 ? 1 : -1, state: 'move',
    pose: { name: 'idle0', dx: 0, dy: 0, sx: 1, sy: 1, rot: 0, glow: 0, flip: 1 }, move: 'sFire', mt: 3,
    hp: 100, maxHp: 100, hpShown: 100, en: 50, flash: 0, invuln: 0, age: 0, score: 0, wins: 0, maxCombo: 0, dmgTaken: 0,
    combo: { hits: 0, dmg: 0, t: 0 }, trail: [], cpu: null, barras: 1, barrasMax: 1, chefe: false, ficha: null, nivelCarga: 0, ...extra,
  };
}
/** `a` ataca (move = golpe do especial); `b` apanha. */
function luta(a: Partial<LutadorLeitura> = {}, b: Partial<LutadorLeitura> = {}, projeteis: ProjetilLeitura[] = [], id1: IdLutador = 'hayato', id2: IdLutador = 'caio'): LeituraLuta {
  return {
    fighters: [lutador(id1, 0, a), lutador(id2, 1, { state: 'idle', move: null, ...b })], projectiles: projeteis, timer: 99, timerMax: 99, round: 1,
    winsNeeded: 2, cam: { z: 1, x: 480 }, phase: 'fight', t: 100, tick: 100, shake: 0, hitstop: 0, mode: 'versus', training: false, stage: 'jp',
    winner: null, matchWinner: null, matchDone: false, perfect: false, trainInfo: { hits: 0, dmg: 0 }, events: [],
  };
}

const especial = (golpe = 'sFire', lutadorI: 0 | 1 = 0, extra: Partial<Extract<EventoLuta, { tipo: 'special' }>> = {}): EventoLuta => ({ tipo: 'special', lutador: lutadorI, pitch: 1, golpe, ficha: null, momento: 'inicio', ...extra });
const hit = (dano: number, extra: Record<string, unknown> = {}): EventoLuta =>
  ({ tipo: 'hit', atacante: 0, defensor: 1, x: 440, y: 360, cor: '#fff', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano, especial: true, golpe: 'sFire', ...extra }) as EventoLuta;
const block = (extra: Record<string, unknown> = {}): EventoLuta =>
  ({ tipo: 'block', atacante: 0, defensor: 1, x: 440, y: 360, dir: -1, texto: null, golpe: 'sFire', especial: true, ...extra }) as EventoLuta;

function sessaoAberta(sons: string[] = []) {
  const s = new SessaoEspecial({ rng: criarRng(1), aoSom: (m) => sons.push(m) });
  const l = luta();
  s.reagir(especial(), l, elenco);
  return { s, l, sons };
}

describe('SessaoEspecial: contar só o que acertou', () => {
  it('especial + 3 hits especiais: contador 3, 3 números e total igual à soma de dano', () => {
    const { s, l } = sessaoAberta();
    for (const d of [14, 11, 9]) s.reagir(hit(d), l, elenco);
    const r = s.leitura(0);
    expect(r).toMatchObject({ aberta: true, hits: 3, total: 34, contadorVisivel: true });
    expect(r?.numeros).toEqual([{ dano: 14, cinza: false }, { dano: 11, cinza: false }, { dano: 9, cinza: false }]);
    expect(r?.marcas).toEqual({ acerto: 3, eco: 0 });
  });

  it('especial + 3 blocks (rival defendeu): ZERO números, ZERO contador; só o eco do estilo', () => {
    const { s, l } = sessaoAberta();
    for (let i = 0; i < 3; i++) s.reagir(block(), l, elenco);
    const r = s.leitura(0);
    expect(r).toMatchObject({ hits: 0, total: 0, contadorVisivel: false });
    expect(r?.numeros).toEqual([]);
    expect(r?.marcas).toEqual({ acerto: 0, eco: 3 });
    // e na tela: nenhum número e nenhum "HITS"
    const g = gravador();
    s.desenhar(g.ctx, l, elenco);
    expect(g.textos().filter((t) => /HIT|^-?\d/.test(t))).toEqual([]);
  });

  it('quebra-guarda também é defesa: nenhum número nem contador', () => {
    const { s, l } = sessaoAberta();
    s.reagir({ tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 440, y: 360, texto: { x: 0, y: 0, s: '', col: '', size: 1 }, golpe: 'sFire', especial: true }, l, elenco);
    expect(s.leitura(0)).toMatchObject({ hits: 0, contadorVisivel: false, numeros: [] });
  });

  it('hit de golpe comum (sem `especial`) é ignorado', () => {
    const { s, l } = sessaoAberta();
    s.reagir(hit(8, { especial: undefined }), l, elenco);
    expect(s.leitura(0)).toMatchObject({ hits: 0, total: 0, numeros: [] });
  });

  it('armor: o número aparece em cinza e NÃO conta como acerto', () => {
    const { s, l } = sessaoAberta();
    s.reagir({ tipo: 'armor', atacante: 0, defensor: 1, x: 440, y: 360, snd: 'punch', texto: { x: 0, y: 0, s: '', col: '', size: 1 }, dano: 6, golpe: 'sFire', especial: true }, l, elenco);
    const r = s.leitura(0);
    expect(r).toMatchObject({ hits: 0, total: 0, contadorVisivel: false });
    expect(r?.numeros).toEqual([{ dano: 6, cinza: true }]);
  });

  it('esquivou não mostra nada', () => {
    const { s, l } = sessaoAberta();
    s.reagir({ tipo: 'esquivou', lutador: 1, atacante: 0, x: 440, y: 360, projetil: false }, l, elenco);
    expect(s.leitura(0)).toMatchObject({ hits: 0, numeros: [], marcas: { acerto: 0, eco: 0 } });
  });

  it('o agarrão de especial (throw) conta como acerto e soma o dano; o arremesso comum (sem `especial`) não', () => {
    const { s, l } = sessaoAberta();
    const t: EventoLuta = { tipo: 'throw', atacante: 0, defensor: 1, pitch: 1, texto: { x: 0, y: 0, s: '', col: '', size: 1 }, dano: 18, especial: true, golpe: 'sFire' };
    s.reagir(t, l, elenco);
    s.reagir({ ...t, especial: undefined, dano: 9 } as unknown as EventoLuta, l, elenco);
    expect(s.leitura(0)).toMatchObject({ hits: 1, total: 18 });
  });

  it('o nível da carga do MASHI aparece nos acertos', () => {
    const { s, l } = sessaoAberta();
    s.reagir(hit(12, { nivelCarga: 2 }), l, elenco);
    expect(s.leitura(0)?.nivel).toBe(2);
    const g = gravador();
    s.desenhar(g.ctx, l, elenco);
    expect(g.textos()).toContain('NÍVEL 2');
  });

  it('um acerto sem sessão aberta (golpe fora do especial) não abre nada', () => {
    const s = new SessaoEspecial();
    s.reagir(hit(10), luta(), elenco);
    expect(s.leitura(0)).toBeNull();
  });
});

describe('SessaoEspecial: quando abre e quando fecha', () => {
  it('PARADE e GARKUWA (momento: sucesso) NÃO abrem no special; abrem no parry / clash; o FOUETTÉ segue a mesma sessão', () => {
    const s = new SessaoEspecial();
    const l = luta({ id: undefined } as never);
    const camille = luta({}, { move: 'sResp', state: 'move' }, [], 'hayato', 'camille');
    s.reagir(especial('sFire', 1, { momento: 'sucesso' }), camille, elenco);
    expect(s.leitura(1)).toBeNull();
    s.reagir({ tipo: 'parry', atacante: 0, defensor: 1, x: 440, y: 360, texto: { x: 0, y: 0, s: 'PARADA!', col: '', size: 1 }, golpe: 'sFire', continua: 'sResp' }, camille, elenco);
    expect(s.leitura(1)).toMatchObject({ aberta: true, golpe: 'sFire' });
    // o hit do FOUETTÉ (atacante = CAMILLE = índice 1)
    s.reagir(hit(13, { atacante: 1, defensor: 0, golpe: 'sResp' }), camille, elenco);
    expect(s.leitura(1)).toMatchObject({ hits: 1, total: 13 });
    // enquanto ela estiver em sResp a sessão vive; ao sair, fecha mostrando o total
    s.avancar(camille);
    s.avancar(camille);
    s.avancar(camille);
    expect(s.leitura(1)?.aberta).toBe(true);
    s.avancar({ ...camille, fighters: [camille.fighters[0], { ...camille.fighters[1], move: null, state: 'idle' }] });
    expect(s.leitura(1)).toMatchObject({ aberta: false, totalVisivel: true, total: 13 });
    void l;
  });

  it('GARKUWA: clash com dono abre a sessão dele; clash entre projéteis (sem dono) não abre nada', () => {
    const s = new SessaoEspecial();
    const l = luta({ move: 'sDown' }, {}, [], 'aminu', 'hayato');
    s.reagir({ tipo: 'clash', x: 400, y: 300 }, l, elenco);
    expect(s.leitura(0)).toBeNull();
    s.reagir({ tipo: 'clash', x: 400, y: 300, lutador: 0, golpe: 'sDown' }, l, elenco);
    expect(s.leitura(0)).toMatchObject({ aberta: true, golpe: 'sDown' });
  });

  it('fecha quando o golpe acaba e não há projétil dele no ar; sem acertos some sem mostrar total', () => {
    const { s } = sessaoAberta();
    const parado = luta({ move: null, state: 'idle' });
    for (let i = 0; i < 5; i++) s.avancar(parado);
    expect(s.leitura(0)).toBeNull();
  });

  it('com acertos, fecha mostrando TOTAL por 40 ticks e depois some', () => {
    const { s, l } = sessaoAberta();
    s.reagir(hit(10), l, elenco);
    s.reagir(hit(7), l, elenco);
    const parado = luta({ move: null, state: 'idle' });
    for (let i = 0; i < 4; i++) s.avancar(parado);
    expect(s.leitura(0)).toMatchObject({ aberta: false, totalVisivel: true, total: 17 });
    const g = gravador();
    s.desenhar(g.ctx, parado, elenco);
    expect(g.textos()).toContain('TOTAL 17');
    for (let i = 0; i < TICKS_DO_TOTAL + 2; i++) s.avancar(parado);
    expect(s.leitura(0)).toBeNull();
  });

  it('um projétil de especial dele no ar mantém a sessão aberta mesmo com o golpe acabado', () => {
    const { s } = sessaoAberta();
    const proj = { id: 1, x: 400, y: 300, vx: 6, dir: 1, dono: 0, style: 'orb', sc: 1, sy: 1, frame: 3, especial: true } as ProjetilLeitura;
    const solto = luta({ move: null, state: 'idle' }, {}, [proj]);
    for (let i = 0; i < 30; i++) s.avancar(solto);
    expect(s.leitura(0)?.aberta).toBe(true);
    const semProj = luta({ move: null, state: 'idle' });
    for (let i = 0; i < 3; i++) s.avancar(semProj);
    expect(s.leitura(0)).toBeNull();
  });

  it(`o limite é de ${LIMITE_DA_SESSAO} ticks; sair da fase de luta (KO) também fecha`, () => {
    const { s } = sessaoAberta();
    const em = luta();
    for (let i = 0; i < LIMITE_DA_SESSAO; i++) s.avancar(em);
    expect(s.leitura(0)?.aberta).toBe(true);
    for (let i = 0; i < 3; i++) s.avancar(em);
    expect(s.leitura(0)).toBeNull();
    const k = sessaoAberta();
    k.s.reagir(hit(10), k.l, elenco);
    k.s.avancar({ ...k.l, phase: 'ko' });
    expect(k.s.leitura(0)).toBeNull();
  });

  it('zerarLuta limpa tudo; as sessões dos dois lados são independentes', () => {
    const s = new SessaoEspecial();
    const l = luta();
    s.reagir(especial('sFire', 0), l, elenco);
    s.reagir(especial('sDown', 1), l, elenco);
    expect(s.leitura(0)?.golpe).toBe('sFire');
    expect(s.leitura(1)?.golpe).toBe('sDown');
    s.reagir(hit(10), l, elenco); // só o lado 0
    expect(s.leitura(0)?.hits).toBe(1);
    expect(s.leitura(1)?.hits).toBe(0);
    s.zerarLuta();
    expect(s.leitura(0)).toBeNull();
    expect(s.leitura(1)).toBeNull();
  });
});

describe('SessaoEspecial: desenho e som', () => {
  it('mostra o número de dano grande, o contador "N HITS" e a vinheta de 20%; sem shadowBlur/filter/getImageData', () => {
    const { s, l } = sessaoAberta();
    s.reagir(hit(14), l, elenco);
    s.reagir(hit(11), l, elenco);
    const g = gravador();
    s.desenhar(g.ctx, l, elenco);
    const textos = g.textos();
    expect(textos).toContain('-14');
    expect(textos).toContain('-11');
    expect(textos).toContain('2 HITS');
    expect(g.chamadas.some(([n, ...a]) => n === 'fillRect' && a[2] === 960 && a[3] === 540)).toBe(true);
    expect(g.chamadas.some(([n]) => n === '=shadowBlur' || n === '=filter' || n === 'getImageData')).toBe(false);
  });

  it('o contador some depois de uns ticks sem acerto novo, com a sessão ainda aberta', () => {
    const { s, l } = sessaoAberta();
    s.reagir(hit(14), l, elenco);
    for (let i = 0; i < 90; i++) s.avancar(l);
    const g = gravador();
    s.desenhar(g.ctx, l, elenco);
    expect(g.textos().some((t) => /HIT/.test(t))).toBe(false);
  });

  it('os sons: acerto no hit/throw, defesa no block, nenhum no armor', () => {
    const sons: string[] = [];
    const { s, l } = sessaoAberta(sons);
    s.reagir(hit(10), l, elenco);
    s.reagir(block(), l, elenco);
    s.reagir({ tipo: 'armor', atacante: 0, defensor: 1, x: 1, y: 1, snd: 'punch', texto: { x: 0, y: 0, s: '', col: '', size: 1 }, dano: 4, golpe: 'sFire', especial: true }, l, elenco);
    expect(sons).toEqual(['acerto', 'defesa']);
  });
});
