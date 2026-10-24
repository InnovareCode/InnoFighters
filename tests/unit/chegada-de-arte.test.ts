import { afterEach, describe, expect, it, vi } from 'vitest';
import { leitorDeRede } from '../../src/assets/carregador';
import { VITRINE } from '../../src/data/lutadores';
import { ChegadaDeArte, TICKS_DA_CHEGADA } from '../../src/ui/chegada-de-arte';
import type { Mundo } from '../../src/ui/contexto';
import { criarFerramentas } from '../../src/ui/ferramentas';
import { fileiraDeHerois } from '../../src/ui/logo';
import { mostrarLutador } from '../../src/ui/personagens';
import { gravador, mundoFalso } from './_ui';

/*
 * L5 da residência de memória (docs/spec-residencia-de-memoria.md §3.4 e §3.5): a chegada suave da arte (rampa de 12 ticks, só para o que chega com a cena já aberta) e a decisão de NÃO usar `decode()`
 * no leitor de rede (§3.5): medido, ele muda o pixel.
 */

const poses = vi.hoisted(() => ({ chamadas: [] as unknown[][] }));
vi.mock('../../src/render/pose', () => ({
  desenharPose: (...a: unknown[]) => void poses.chamadas.push(a.slice(1)),
}));

describe('ChegadaDeArte', () => {
  it('arte pronta quando a cena desenha pela 1ª vez: 1 em todos os ticks (o desenho é o de antes)', () => {
    const c = new ChegadaDeArte();
    for (let t = 0; t < 50; t++) expect(c.alfa('hayato', true, t)).toBe(1);
  });

  it('arte que chega depois: 0 enquanto não chegou, depois rampa linear de 12 ticks a partir do 1º tick pronto, monótona, e fica em 1', () => {
    const c = new ChegadaDeArte();
    for (let t = 0; t < 30; t++) expect(c.alfa('caio', false, t)).toBe(0);
    const rampa: number[] = [];
    for (let t = 30; t < 60; t++) rampa.push(c.alfa('caio', true, t));
    expect(rampa[0]).toBe(0); // o 1º tick pronto abre a rampa
    expect(rampa[TICKS_DA_CHEGADA]).toBe(1);
    expect(rampa[6]).toBeCloseTo(0.5, 6);
    for (let i = 1; i < rampa.length; i++) expect(rampa[i] as number).toBeGreaterThanOrEqual(rampa[i - 1] as number);
    expect(rampa.slice(TICKS_DA_CHEGADA).every((a) => a === 1)).toBe(true);
    expect(rampa.filter((a) => a > 0 && a < 1).length).toBeGreaterThanOrEqual(10);
  });

  it('cada lutador tem a sua rampa; reiniciar() zera tudo (cena nova)', () => {
    const c = new ChegadaDeArte();
    expect(c.alfa('a', false, 0)).toBe(0);
    expect(c.alfa('b', true, 0)).toBe(1);
    expect(c.alfa('a', true, 5)).toBe(0);
    expect(c.alfa('a', true, 11)).toBeCloseTo(0.5, 6);
    expect(c.alfa('b', true, 11)).toBe(1);
    c.reiniciar();
    expect(c.alfa('a', true, 12)).toBe(1); // na cena nova ele já estava pronto
  });

  it('arte solta no meio da cena e de volta: a rampa recomeça', () => {
    const c = new ChegadaDeArte();
    expect(c.alfa('a', true, 0)).toBe(1);
    expect(c.alfa('a', false, 10)).toBe(0);
    expect(c.alfa('a', true, 20)).toBe(0);
    expect(c.alfa('a', true, 26)).toBeCloseTo(0.5, 6);
  });

  it('o tempo que anda para trás (o trailer redesenha o título num tick anterior) não apaga o lutador', () => {
    const c = new ChegadaDeArte();
    c.alfa('a', false, 0);
    c.alfa('a', true, 400);
    expect(c.alfa('a', true, 10)).toBe(1);
  });

  it('não usa sorteio nem relógio: o mesmo roteiro de chamadas dá os mesmos valores', () => {
    const rodar = (): number[] => {
      const c = new ChegadaDeArte();
      return [c.alfa('x', false, 0), c.alfa('x', true, 3), c.alfa('x', true, 9), c.alfa('x', true, 20)];
    };
    expect(rodar()).toEqual(rodar());
  });
});

describe('mostrarLutador e fileiraDeHerois com a chegada', () => {
  function cenario(pronta: boolean) {
    poses.chamadas.length = 0;
    const g = gravador();
    const f = criarFerramentas(g.ctx);
    const m = mundoFalso();
    const estado = { pronta };
    for (const e of Object.values(m.elenco)) {
      Object.defineProperty(e.arte, 'pronta', { get: () => estado.pronta, configurable: true });
      (e.ch as unknown as { fire: string[] }).fire = ['#ff0000', '#ffff00', '#ffffff'];
    }
    return { f, m: m as Mundo, g, estado };
  }

  it('arte que ainda não chegou: nada é desenhado (nem a sombra); quando chega, sobe pela rampa', () => {
    const a = cenario(false);
    const c = new ChegadaDeArte();
    mostrarLutador(a.f, a.m, 'hayato', 100, 100, 1, 1, 0, 'guard', c);
    expect(a.g.chamadas).toEqual([]);
    expect(poses.chamadas).toEqual([]);
    a.estado.pronta = true;
    mostrarLutador(a.f, a.m, 'hayato', 100, 100, 1, 1, 1, 'guard', c); // 1º tick pronto: alfa 0, nada ainda
    expect(poses.chamadas).toEqual([]);
    mostrarLutador(a.f, a.m, 'hayato', 100, 100, 1, 1, 7, 'guard', c);
    expect(poses.chamadas).toHaveLength(1);
  });

  it('pronta desde o início: o desenho é IDÊNTICO ao de antes (mesmas chamadas, na mesma ordem)', () => {
    const sem = cenario(true);
    mostrarLutador(sem.f, sem.m, 'hayato', 100, 100, 1, 1, 7);
    const com = cenario(true);
    mostrarLutador(com.f, com.m, 'hayato', 100, 100, 1, 1, 7, 'guard', new ChegadaDeArte());
    expect(JSON.stringify(com.g.chamadas)).toBe(JSON.stringify(sem.g.chamadas));
    expect(sem.g.chamadas.length).toBeGreaterThan(0);
  });

  it('fileiraDeHerois: com a vitrine pronta desde o início o desenho é idêntico ao sem a chegada; sem a arte, nenhum herói é desenhado', () => {
    const sem = cenario(true);
    fileiraDeHerois(sem.f, sem.m, 12, VITRINE[0] as never);
    const antes = poses.chamadas.length;
    const com = cenario(true);
    fileiraDeHerois(com.f, com.m, 12, VITRINE[0] as never, 1, new ChegadaDeArte());
    expect(JSON.stringify(com.g.chamadas)).toBe(JSON.stringify(sem.g.chamadas));
    expect(poses.chamadas.length).toBeGreaterThan(0);
    expect(antes).toBeGreaterThan(0);

    const vazio = cenario(false);
    fileiraDeHerois(vazio.f, vazio.m, 12, VITRINE[0] as never, 1, new ChegadaDeArte());
    expect(vazio.g.chamadas).toEqual([]);
    expect(poses.chamadas).toEqual([]);
  });
});

describe('leitorDeRede.imagem: SEM decode() antecipado (muda o pixel: ver o comentário no carregador)', () => {
  const original = (globalThis as { Image?: unknown }).Image;
  afterEach(() => {
    (globalThis as { Image?: unknown }).Image = original;
  });

  function falsaImagem(falha = false): string[] {
    const chamadas: string[] = [];
    class Falsa {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      decode = () => {
        chamadas.push('decode');
        return Promise.resolve();
      };
      set src(_: string) {
        chamadas.push('src');
        queueMicrotask(() => (falha ? this.onerror?.() : this.onload?.()));
      }
    }
    (globalThis as { Image?: unknown }).Image = Falsa;
    return chamadas;
  }

  it('resolve no onload e nunca chama decode() (a decodificação antecipada mudou o pixel no fidelidade-prototipo)', async () => {
    const chamadas = falsaImagem();
    await expect(leitorDeRede.imagem('x.webp')).resolves.toBeDefined();
    expect(chamadas).toEqual(['src']);
  });

  it('erro de rede continua rejeitando', async () => {
    falsaImagem(true);
    await expect(leitorDeRede.imagem('x.webp')).rejects.toThrow(/Falha ao carregar/);
  });
});
