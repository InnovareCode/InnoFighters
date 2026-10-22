import type { Navegador } from '../navegador';
import type { Cena, NomeCena } from '../tipos';
import { CenaBoot } from './boot';
import { CenaChefe } from './chefe';
import { CenaDesbloqueio } from './desbloqueio';
import { CenaDiff } from './diff';
import { CenaFight } from './fight';
import { CenaContinue, CenaEnding, CenaResult } from './fim';
import { CenaHow } from './how';
import { CenaIntro } from './intro';
import { CenaMenu } from './menu';
import { CenaOptions } from './options';
import { CenaSelect } from './select';
import { CenaTitle } from './title';
import { CenaTrailer } from './trailer';
import { CenaVs } from './vs';

/** Instancia todas as cenas do jogo (SCENES do protótipo). */
export function criarCenas(ui: Navegador): Record<NomeCena, Cena> {
  return {
    boot: new CenaBoot(ui),
    intro: new CenaIntro(ui),
    trailer: new CenaTrailer(ui),
    title: new CenaTitle(ui),
    menu: new CenaMenu(ui),
    select: new CenaSelect(ui),
    diff: new CenaDiff(ui),
    vs: new CenaVs(ui),
    fight: new CenaFight(ui),
    how: new CenaHow(ui),
    options: new CenaOptions(ui),
    result: new CenaResult(ui),
    continue: new CenaContinue(ui),
    ending: new CenaEnding(ui),
    chefe: new CenaChefe(ui),
    desbloqueio: new CenaDesbloqueio(ui),
  };
}
