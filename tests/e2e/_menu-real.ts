/* eslint-disable @typescript-eslint/no-explicit-any */
import { expect, type Page } from '@playwright/test';

/*
 * LUTA PELO MENU DE VERDADE, em `?manual=1` (a Iris, 2026-10-24): boot -> intro -> título -> menu -> LUTA vs CPU -> seleção -> dificuldade -> VS -> luta,
 * com as teclas reais (`window.dispatchEvent(KeyboardEvent)`, os mesmos listeners de `src/input/teclado.ts`) e `h.avancar` dirigindo o MESMO
 * `ui.update()` do jogo. É o único caminho que roda `cfgMotorV2`/`cfgRitmo` de produção (um `h.ui.set('fight', {cfg})` à mão não roda: o filme
 * "nunca disparava" por isso, R-3). SEM `?ritmo=` na URL = o PADRÃO que vai ao ar.
 *
 * Em `?manual=1` as teclas só valem nos `avancar`: dispare as DUAS bordas de um comando de 2 botões na MESMA `evaluate` (`teclas`), senão o relógio
 * não as vê juntas. `page.keyboard.down` duas vezes (ida e volta por tecla) também funcionaria aqui, porque nada anda entre as chamadas.
 */

export const hook = (page: Page, corpo: string): Promise<any> => page.evaluate(`(() => { const h = window.__inno; return (${corpo})(h); })()`);

/** Aperta (e solta, se `soltar`) teclas na MESMA evaluate: nenhum tick anda entre elas. */
export const teclas = (page: Page, tipo: 'keydown' | 'keyup', ...ks: string[]): Promise<void> =>
  page.evaluate(([t, lista]) => { for (const k of lista as string[]) window.dispatchEvent(new KeyboardEvent(t as string, { key: k })); }, [tipo, ks] as const);

const cenaPronta = (nome: string): string => `() => window.__inno.ui.name === ${JSON.stringify(nome)} && window.__inno.ui.fadeTo === null`;

/** Anda de 'passo' em 'passo' ticks até o predicado (uma função em texto) ficar verdadeiro. */
export async function avancarAte(page: Page, pred: string, passo = 6, limite = 600): Promise<void> {
  for (let i = 0; i < limite; i++) {
    if (await page.evaluate(`(${pred})()`)) return;
    await page.evaluate((n) => (window as any).__inno.avancar(n), passo);
  }
  throw new Error(`avancarAte esgotou (cena ${await page.evaluate(() => (window as any).__inno.ui.name)}): ${pred}`);
}

export interface OpcoesLuta {
  /** Lutador do P1 (o cursor da seleção vai para ele; os guardiões entram liberados). */
  p1?: string;
  /** 0 FÁCIL, 1 NORMAL, 2 DIFÍCIL (a tela de dificuldade aceita o que estiver salvo). */
  diff?: 0 | 1 | 2;
  /** `rounds` das opções = vitórias necessárias (o motor usa `winsNeeded = rounds`). */
  rounds?: number;
  /** Texto extra da URL, SEM `ritmo` por padrão (= o padrão de produção). Ex.: `&ritmo=0`. */
  query?: string;
  seed?: number;
}

/** Abre a página e navega pelo menu até a cena `fight`. Devolve quando a cena existe (a fase pode ainda ser `intro`). */
export async function irAteALuta(page: Page, o: OpcoesLuta = {}): Promise<void> {
  const { p1 = 'hayato', diff = 1, rounds = 2, query = '', seed = 21 } = o;
  await page.addInitScript(
    ([d, r]) => {
      window.localStorage.setItem(
        'inno-fighters-v2',
        JSON.stringify({
          v: 2,
          s: { music: 0, sfx: 0, rounds: r, time: 99, diff: d, shake: true },
          hi: 0,
          prog: { desbloqueados: ['aminu', 'centella', 'camille', 'nila', 'baatar'], zeradas: 5, chefeDerrotado: true, vistos: [] },
        }),
      );
    },
    [diff, rounds] as const,
  );
  await page.goto(`/?seed=${seed}&trailer=0&manual=1${query}`);
  await expect(page.locator('html')).toHaveAttribute('data-pronto', 'true', { timeout: 60_000 });
  await avancarAte(page, cenaPronta('boot'));
  await teclas(page, 'keydown', 'Enter');
  await teclas(page, 'keyup', 'Enter');
  await avancarAte(page, cenaPronta('intro'));
  await page.evaluate(() => (window as any).__inno.avancar(30));
  const apertar = async (k: string): Promise<void> => {
    await teclas(page, 'keydown', k);
    await teclas(page, 'keyup', k);
  };
  await apertar('Enter');
  await avancarAte(page, cenaPronta('title'));
  await apertar('Enter');
  await avancarAte(page, cenaPronta('menu'));
  await apertar('ArrowDown');
  await apertar('ArrowDown');
  await apertar('Enter'); // LUTA vs CPU
  await avancarAte(page, cenaPronta('select'));
  await avancarAte(page, '() => (window.__inno.ui.scene.grade?.length ?? 0) > 0', 4);
  await page.evaluate((id) => { const s = (window as any).__inno.ui.scene; s.cur[0] = s.grade.indexOf(id); }, p1);
  await apertar('Enter'); // confirma o P1
  await apertar('Enter'); // o adversário sugerido
  await avancarAte(page, cenaPronta('diff'));
  await apertar('Enter');
  await avancarAte(page, cenaPronta('vs'));
  await page.evaluate(() => (window as any).__inno.avancar(60));
  await apertar('Enter'); // pula o confronto
  await avancarAte(page, cenaPronta('fight'));
}

/** Anda até a fase `fight` (o jogador tem controle). */
export const ateOControle = (page: Page): Promise<void> => avancarAte(page, "() => window.__inno.mundo().game.phase === 'fight'", 4, 200);

/** Os dois lutadores de pé, no chão, parados, a `dist` px um do outro (P1 à esquerda), sem IA no P2, vida do P1 alta e barra do P1 como pedido. */
export const prepararDuelo = (page: Page, o: { en?: number; hp2?: number; wins1?: number; dist?: number } = {}): Promise<void> =>
  page.evaluate((a) => {
    const g = (window as any).__inno.mundo().game;
    g.p2.cpu = null;
    g.p1.hp = 1000; g.p1.hpShown = 1000;
    g.p2.hp = a.hp2 ?? 1000; g.p2.hpShown = a.hp2 ?? 1000;
    g.p1.en = a.en ?? 100;
    if (a.wins1 !== undefined) g.p1.wins = a.wins1;
    for (const f of [g.p1, g.p2]) { f.move = null; f.state = 'idle'; f.y = 470; f.vx = 0; f.vy = 0; f.grounded = true; f.stun = 0; }
    g.p1.x = 480 - (a.dist ?? 60) / 2;
    g.p2.x = 480 + (a.dist ?? 60) / 2;
  }, o);

/** Instala o espião de eventos do motor (`window.__ev`): hits do super, filmes (com o modo lido no instante em que abrem), swings, blocks... */
export const espiarMotor = (page: Page): Promise<void> =>
  page.evaluate(() => {
    const w = window as any;
    const h = w.__inno;
    const g = h.mundo().game;
    w.__ev = [];
    const orig = g.emitir.bind(g);
    g.emitir = (ev: any) => {
      w.__ev.push({ tick: g.tick, tipo: ev.tipo, super: ev.super === true, acertos: ev.acertos, dano: ev.dano, motivo: ev.motivo, decideALuta: ev.decideALuta === true });
      return orig(ev);
    };
  });

export const eventos = (page: Page, tipo: string): Promise<any[]> => page.evaluate((t) => (window as any).__ev.filter((e: any) => e.tipo === t), tipo);
