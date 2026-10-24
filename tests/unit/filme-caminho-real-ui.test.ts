import { describe, expect, it } from 'vitest';
import type { Elenco } from '../../src/assets/elenco';
import { INPUT_VAZIO, type EventoLuta, type IdLutador, type InputFrame } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { Game } from '../../src/fight/game';
import { REGRAS_PADRAO, cfgMotorV2 } from '../../src/meta/regras';
import { Efeitos, CampoDePetalas } from '../../src/render/efeitos';
import type { Mundo } from '../../src/ui/contexto';
import type { CenaFight } from '../../src/ui/cenas/fight';
import { PROD } from './_filme';
import { navegadorFalso, arteFalsa } from './_ui';

/*
 * R-3 (docs/spec-redesenho-jogabilidade.md §3.3): o diagnóstico de sensação (docs/diagnostico-sensacao-2026-10-24.md §3)
 * viu 0 filmes em 46 acertos reais (incluindo especiais limpos) no jogo publicado, mesmo com `motorV2.filmes` ligado por
 * padrão. A pista do Atlas: "a diferença entre o harness e o jogo". Os testes existentes de `filme` (filmes-motor.test.ts,
 * filme-cena.test.ts, filme-jogo.spec.ts) NUNCA passam pelo caminho de cfg real da UI: todos constroem `motorV2: { filmes:
 * true }` NA MÃO, nunca `cfgMotorV2(regras)` como `select.ts`/`diff.ts`/`campanha.ts` realmente fazem. Este teste fecha essa
 * lacuna: monta a cena de luta (`CenaFight`, a mesma classe da UI real, só a arte/áudio são falsos) com a cfg EXATA que
 * `diff.ts` monta no modo `cpu` (`{ mode: 'cpu', cpu: nível, esquiva, ...cfgMotorV2(REGRAS_PADRAO) }`), dirige a luta até o
 * fim com um "jogador" reativo (anda até o rival, ataca perto, foge/defende quando o rival ataca — o mesmo padrão descrito
 * no diagnóstico) contra a CPU real, e conta quantos especiais conectam limpo e quantos desses viram `filme`.
 *
 * RESULTADO DESTA INVESTIGAÇÃO (não um teste que falha hoje — ver o handoff da Vega para o Atlas):
 * reproduzi os 3 confrontos exatos do diagnóstico (HAYATO×CAIO NORMAL, CAIO×MIN-JI DIFÍCIL, NILA×BAATAR NORMAL), com
 * `rounds:1` como o diagnóstico usou, em dezenas de sementes, pelo caminho de cfg REAL (`cfgMotorV2`) E pela CENA REAL
 * (`CenaFight`, que inclui a TARJA/`Cinematica` — a cena que congela `game.update` enquanto a faixa do especial anima,
 * suspeita óbvia de interação com o filme): 100% dos especiais que conectam limpo abrem filme, sem UMA falha, em mais de
 * 1000 especiais somados. A ligação `cfgMotorV2` -> `ConfigPartida.motorV2` -> `Game.filmesLigados` -> `filmeDaExecucao`
 * está correta e não é a causa. A causa do diagnóstico fica sem reprodução nesta camada (motor + cena, sem DOM/canvas real);
 * ver o handoff para as hipóteses restantes (específicas de navegador real) e o que falta para fechar o R-3.
 */

const IMG = { tag: 'atlas' } as unknown as CanvasImageSource;
const arte = { pronta: true, imagemDe: () => IMG, silhuetaDe: () => IMG, retrato: () => null };
const elenco = Object.fromEntries(Object.entries(PROD).map(([id, ch]) => [id, { ch, arte }])) as unknown as Elenco;

/** Monta a cena `fight` REAL (CenaFight) com a cfg EXATA que `diff.ts` monta no modo `cpu` (linha 42), via `cfgMotorV2`. */
function montarCenaCpu(c1: IdLutador, c2: IdLutador, nivel: number, semente: number) {
  const regras = REGRAS_PADRAO;
  const n = navegadorFalso({ provocacoes: 'desligadas' }, regras);
  const frames: { p1: InputFrame; p2: InputFrame } = { p1: { ...INPUT_VAZIO }, p2: { ...INPUT_VAZIO } };
  (n.c as { entrada: unknown }).entrada = {
    lerP1: () => ({ ...frames.p1 }),
    lerP2: () => ({ ...frames.p2 }),
    lerMesclado: () => ({ ...frames.p1 }),
    fimDoTick: () => undefined,
    consultarGamepads: () => undefined,
  };
  const game = new Game({ lutadores: PROD, rng: criarRng(semente) });
  const efeitos = new Efeitos(criarRng(1));
  const mundo = {
    rec: { elenco, cenarios: new Map(), cenarioPadrao: IMG, vinheta: IMG },
    elenco,
    arte: arteFalsa(),
    game,
    efeitos,
    petalasLuta: new CampoDePetalas(criarRng(2), 'luta'),
  } as unknown as Mundo;
  n.ui.pronto(mundo);
  // A MESMA cfg de `diff.ts:42` para o modo 'cpu' (p1 humano, p2 CPU): mode, c1, c2, cpu, esquiva, ...cfgMotorV2(regras).
  const cfg = { mode: 'cpu' as const, c1, c2, cpu: nivel, esquiva: regras.esquiva, ...cfgMotorV2(regras) };
  n.ui.set('fight', { cfg });
  const cena = n.ui.scene as unknown as CenaFight;
  for (let i = 0; i < 400 && game.phase !== 'fight'; i++) cena.update();
  for (let i = 0; i < 5; i++) cena.update();
  return { game, cena, frames };
}

/**
 * P1 reativo (como o bot do diagnóstico, `src/input/teclado.ts` via campos REAIS de `InputFrame`): anda até o rival e
 * ataca perto (golpe normal ou especial, alternando), segura a direção contrária quando o rival está em `move`. Aperta
 * um botão só na BORDA (um tick, quando o golpe anterior já acabou) — como um jogador de verdade, não segurado.
 */
function jogarUmaLuta(c1: IdLutador, c2: IdLutador, nivel: number, semente: number): { especiais: number; filmes: number; especiaisDoP1: number } {
  const { game, cena, frames } = montarCenaCpu(c1, c2, nivel, semente);
  let especiais = 0;
  let filmes = 0;
  let especiaisDoP1 = 0;
  let golpe = 0;
  for (let i = 0; i < 21_600 && !game.matchDone; i++) {
    const d = game.p2.x - game.p1.x;
    const perto = Math.abs(d) < 150;
    const rivalAtacando = game.p2.state === 'move';
    const livre = game.p1.move === null;
    const atacar = perto && !rivalAtacando && livre;
    golpe = atacar ? (golpe + 1) % 6 : golpe;
    // 0..3: os 4 golpes normais; 4: sp + down = sDown; 5: sp sozinho (sFire, ou sFwd se a direção de frente estiver segurada)
    frames.p1 = {
      ...INPUT_VAZIO,
      left: d < 0 || rivalAtacando,
      right: d > 0 && !rivalAtacando,
      down: atacar && golpe === 4,
      lp: atacar && golpe === 0,
      hp: atacar && golpe === 1,
      lk: atacar && golpe === 2,
      hk: atacar && golpe === 3,
      sp: atacar && golpe >= 4,
    };
    cena.update();
    for (const e of game.events as EventoLuta[]) {
      if (e.tipo === 'filme') filmes++;
      if ((e.tipo === 'hit' || e.tipo === 'throw') && e.especial) {
        especiais++;
        if (e.atacante === 0) especiaisDoP1++;
      }
    }
  }
  return { especiais, filmes, especiaisDoP1 };
}

describe('R-3: caminho de cfg REAL da UI (cfgMotorV2) + cena REAL (CenaFight, com a TARJA/Cinematica)', () => {
  it('guarda: cfgMotorV2(REGRAS_PADRAO) carrega motorV2.filmes=true na cfg que a UI monta (como select.ts/diff.ts/campanha.ts)', () => {
    const cfg = { mode: 'cpu' as const, c1: 'hayato' as const, c2: 'caio' as const, cpu: 1, esquiva: REGRAS_PADRAO.esquiva, ...cfgMotorV2(REGRAS_PADRAO) };
    expect(cfg.motorV2).toEqual({ entradaNoHitstop: true, filmes: true, combos: true });
  });

  const PARES: [IdLutador, IdLutador, number, string][] = [
    ['hayato', 'caio', 1, 'NORMAL'],
    ['caio', 'min-ji', 2, 'DIFÍCIL'],
    ['nila', 'baatar', 1, 'NORMAL'],
  ];
  for (const [c1, c2, nivel, rotulo] of PARES) {
    it(`${c1} x ${c2} (${rotulo}, os 3 confrontos exatos do diagnóstico): todo especial limpo vira filme, em 20 sementes`, () => {
      const falhas: string[] = [];
      let especiaisTotal = 0;
      let filmesTotal = 0;
      let especiaisDoP1Total = 0;
      for (let semente = 1; semente <= 20; semente++) {
        const { especiais, filmes, especiaisDoP1 } = jogarUmaLuta(c1, c2, nivel, semente);
        especiaisTotal += especiais;
        filmesTotal += filmes;
        especiaisDoP1Total += especiaisDoP1;
        if (especiais > 0 && filmes < especiais) falhas.push(`semente ${semente}: ${especiais} especiais, só ${filmes} filmes`);
      }
      expect(especiaisTotal, 'a amostra tem que gerar especiais de verdade').toBeGreaterThan(0);
      // o P1 aqui é o "jogador" (como o bot do diagnóstico): tem que ter lançado especial de verdade, não só a CPU (P2).
      expect(especiaisDoP1Total, 'o P1 (jogador/humano) tem que ter lançado especial pelo menos uma vez').toBeGreaterThan(0);
      expect(falhas, `${filmesTotal}/${especiaisTotal} especiais viraram filme (${especiaisDoP1Total} do P1)`).toEqual([]);
    });
  }
});
