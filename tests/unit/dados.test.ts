import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { manifestoParaPoses, type ManifestoAtlas } from '../../src/data/atlas';
import { TYPE_ANIM, BASE_ANIM } from '../../src/data/anim';
import { BASE_MOVES } from '../../src/data/base-moves';
import { LUTADORES, ROSTER } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import { ALIAS, FALLBACK, NEEDS_TILT, getPD, hasPose } from '../../src/data/poses';
import { TEM_PROTOTIPO, diferencas, posedataOriginal, trecho, type Obj } from './_prototipo';
import { defDoOraculo } from './_lutadores';

/**
 * Prova de fidelidade (nível: executado contra o protótipo real): roda no Node os trechos de
 * dados/funções puras do próprio protótipo (setupChars + buildMoves + getPD) e compara com o
 * que src/data produz a partir do atlas.json extraído.
 */
function rodarPrototipo(): Obj {
  const posedata = posedataOriginal();
  const codigo =
    trecho('const SH_IDLE = 255', 'function drawPose') +
    '\n' +
    trecho('const BASE_MOVES = {', '// ===================== 5. LUTADOR') +
    '\nsetupChars();\nreturn { CHARS, BASE_MOVES, CHAR_MODS, CHAR_SPECIALS, BASE_ANIM, TYPE_ANIM, CHAR_ANIM, FALLBACK, NEEDS_TILT, ALIAS, getPD, hasPose };';
  return new Function('POSEDATA', 'ROSTER', codigo)(posedata, ['f1', 'f2', 'f3', 'f4']) as Obj;
}

function manifesto(id: string): ManifestoAtlas {
  // HAYATO e MIN-JI: o oráculo é o atlas ORIGINAL (a arte de produção foi trocada pelas folhas novas): tests/fixtures/atlas-prototipo
  const pasta = ['hayato', 'min-ji'].includes(id) ? `tests/fixtures/atlas-prototipo/${id}` : `public/assets/lutadores/${id}`;
  const url = new URL(`../../${pasta}/atlas.json`, import.meta.url);
  return JSON.parse(readFileSync(fileURLToPath(url), 'utf8')) as ManifestoAtlas;
}

const nomeStage: Record<string, string> = { bg_jp: 'jp', bg_cn: 'cn', bg_kr: 'kr', bg_br: 'br' };

describe.skipIf(!TEM_PROTOTIPO)('src/data == protótipo', () => {
  const proto = rodarPrototipo();

  it('tabelas globais idênticas (BASE_MOVES, BASE_ANIM, TYPE_ANIM, ALIAS, FALLBACK, NEEDS_TILT)', () => {
    expect(diferencas(BASE_MOVES, proto['BASE_MOVES'])).toEqual([]);
    expect(diferencas(BASE_ANIM, proto['BASE_ANIM'])).toEqual([]);
    expect(diferencas(TYPE_ANIM, proto['TYPE_ANIM'])).toEqual([]);
    expect(diferencas(ALIAS, proto['ALIAS'])).toEqual([]);
    expect(diferencas(FALLBACK, proto['FALLBACK'])).toEqual([]);
    expect(diferencas(NEEDS_TILT, proto['NEEDS_TILT'])).toEqual([]);
  });

  it('ROSTER na ordem f1..f4', () => {
    expect(ROSTER.filter((id) => LUTADORES[id].idPrototipo).map((id) => LUTADORES[id].idPrototipo)).toEqual(['f1', 'f2', 'f3', 'f4']);
  });

  // lutadores novos (sem idPrototipo) não existem no protótipo: só quem tem entra na prova de fidelidade
  for (const id of ROSTER) {
    // Oráculo: os números do PROTÓTIPO (tests/fixtures/dados-prototipo), não os balanceados de produção (E6b).
    const def = defDoOraculo(id);
    const f = def.idPrototipo;
    if (!f) continue;

    describe(`${id} (${f})`, () => {
      it('dados estáticos, ajustes de golpes, especiais e animação idênticos', () => {
        const ch = proto['CHARS'][f] as Obj;
        const esperado: Obj = {
          id: ch['id'] === f ? id : ch['id'],
          country: ch['country'],
          stage: nomeStage[ch['stage'] as string],
          stageName: ch['stageName'],
          name: ch['name'],
          title: ch['title'],
          pitch: ch['pitch'],
          desc: ch['desc'],
          fire: ch['fire'],
          accent: ch['accent'],
          pow: ch['pow'],
          spd: ch['spd'],
          hp: ch['hp'],
          jump: ch['jump'],
          scale: ch['scale'],
          stride: ch['stride'],
          bars: ch['bars'],
        };
        if (ch['reach'] !== undefined) esperado['reach'] = ch['reach'];
        const { mods, especiais, anim, idPrototipo, ...estatico } = def;
        expect(idPrototipo).toBe(f);
        expect(diferencas(estatico, esperado)).toEqual([]);
        expect(diferencas(mods, proto['CHAR_MODS'][f])).toEqual([]);
        expect(diferencas(especiais, proto['CHAR_SPECIALS'][f])).toEqual([]);
        expect(diferencas(anim ?? {}, proto['CHAR_ANIM'][f] ?? {})).toEqual([]);
      });

      it('montarLutador(atlas.json) == setupChars+buildMoves do protótipo (K, head, spawn, alias, golpes, caixas)', () => {
        const mine = montarLutador(def, manifestoParaPoses(manifesto(id)));
        const ch = proto['CHARS'][f] as Obj;
        expect(mine.legacy).toBe(ch['legacy']);
        for (const campo of ['K', 'head', 'spawn', 'alias', 'moves', 'boxes', 'sps', 'proj', 'special'] as const) {
          expect(diferencas(mine[campo], ch[campo], campo), campo).toEqual([]);
        }
        // as caixas de ataque são o que decide acerto: conferidas golpe a golpe e com limites explícitos
        expect(Object.keys(mine.boxes).sort()).toEqual(Object.keys(ch['boxes']).sort());
      });

      it('getPD/hasPose devolvem a mesma pose que o protótipo para qualquer nome', () => {
        const mine = montarLutador(def, manifestoParaPoses(manifesto(id)));
        const ch = proto['CHARS'][f] as Obj;
        const nomes = new Set<string>([
          ...Object.keys(ch['pd']),
          ...Object.keys(ALIAS),
          ...Object.keys(FALLBACK),
          'inexistente',
          'special',
          'jumpPunch',
          'sb1',
          'sb2',
          'sc0',
          'sc1',
        ]);
        const so = (p: Obj): Obj => ({ x: p['x'], y: p['y'], w: p['w'], h: p['h'], ax: p['ax'], tipX: p['tipX'], tipY: p['tipY'] });
        const limpo = (o: Obj): Obj => Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
        for (const n of nomes) {
          expect(diferencas(limpo(so(getPD(mine, n))), limpo(so(proto['getPD'](ch, n) as Obj)), n), n).toEqual([]);
          expect(hasPose(mine, n)).toBe(proto['hasPose'](ch, n));
        }
      });
    });
  }
});
