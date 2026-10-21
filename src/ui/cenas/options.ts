import { LARGURA } from '../../core/constantes';
import { CINEMATICA_PADRAO, CINEMATICAS_VALIDAS, CONFIGURACOES_PADRAO, type Configuracoes, type PreferenciaCinematica } from '../../core/contratos';
import { provocacoesLigadas } from '../../data/provocacoes';
import { clamp } from '../../core/math';
import { AI_LEVELS } from '../../fight/cpu';
import { desenharFundoMenu } from '../../render/cenario';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import type { AcaoNav, ArgsComo, Cena } from '../tipos';

type NumerosCiclicos = 'rounds' | 'time' | 'diff';

const NOMES_CINEMATICA: Readonly<Record<PreferenciaCinematica, string>> = { completa: 'COMPLETA', curta: 'CURTA', desligada: 'DESLIGADA' };

/** O que vale agora: o salvo, ou (sem preferência salva) COMPLETA — CURTA se o aparelho pede menos movimento (B15). */
export function cinematicaResolvida(salva: PreferenciaCinematica | undefined, reduzMovimento: boolean): PreferenciaCinematica {
  return salva ?? (reduzMovimento ? 'curta' : CINEMATICA_PADRAO);
}

const pedeMenosMovimento = (): boolean => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;

/** Opções: volumes, rounds, tempo, dificuldade padrão, tremor, tela cheia e restaurar. */
export class CenaOptions implements Cena {
  private m: MenuList;
  /** Há a linha da cinemática (só com `Regras.cinematica`; sem ela, `?expansao=4`, a tela é a do protótipo). */
  private linhas = 9;

  constructor(private readonly ui: Navegador) {
    this.m = this.criarMenu();
  }

  private criarMenu(): MenuList {
    const { persist, audio, f } = this.ui.c;
    const S: Configuracoes = persist.settings;
    const vol = (k: 'music' | 'sfx', d: number): void => {
      S[k] = clamp(Math.round((S[k] + d * 0.1) * 10) / 10, 0, 1);
      if (k === 'music') audio.setMusicVol(S[k]);
      else {
        audio.setSfxVol(S[k]);
        audio.punch();
      }
      persist.salvar();
    };
    const setv = (k: 'music' | 'sfx', v: number): void => {
      S[k] = v;
      if (k === 'music') audio.setMusicVol(v);
      else audio.setSfxVol(v);
      persist.salvar();
    };
    const cyc = (key: NumerosCiclicos, lista: readonly number[], d: number): void => {
      const i = (lista.indexOf(S[key]) + d + lista.length) % lista.length;
      S[key] = lista[i] ?? S[key];
      persist.salvar();
    };
    const itens: ConstructorParameters<typeof MenuList>[0] = [
        { label: 'MÚSICA', slider: () => S.music, onAdjust: (d) => vol('music', d), onSet: (v) => setv('music', v) },
        { label: 'EFEITOS SONOROS', slider: () => S.sfx, onAdjust: (d) => vol('sfx', d), onSet: (v) => setv('sfx', v) },
        {
          label: 'ROUNDS PARA VENCER',
          value: () => S.rounds + (S.rounds === 1 ? ' (melhor de 1)' : S.rounds === 2 ? ' (melhor de 3)' : ' (melhor de 5)'),
          onAdjust: (d) => cyc('rounds', [1, 2, 3], d),
        },
        { label: 'TEMPO DO ROUND', value: () => (S.time ? `${S.time} s` : 'SEM LIMITE'), onAdjust: (d) => cyc('time', [30, 60, 99, 0], d) },
        { label: 'DIFICULDADE PADRÃO', value: () => AI_LEVELS[S.diff]?.name ?? '', onAdjust: (d) => cyc('diff', [0, 1, 2], d) },
        {
          label: 'TREMOR DE TELA',
          value: () => (S.shake ? 'LIGADO' : 'DESLIGADO'),
          onAdjust: () => {
            S.shake = !S.shake;
            persist.salvar();
          },
        },
        ...(this.ui.c.regras.cinematica
          ? [
              {
                label: 'CINEMÁTICA DO ESPECIAL',
                value: () => NOMES_CINEMATICA[cinematicaResolvida(S.cinematica, pedeMenosMovimento())],
                onAdjust: (d: number) => {
                  // ao escolher, o valor passa a ser a preferência explícita (deixa de depender do movimento reduzido)
                  const n = CINEMATICAS_VALIDAS.length;
                  const i = (CINEMATICAS_VALIDAS.indexOf(cinematicaResolvida(S.cinematica, pedeMenosMovimento())) + d + n) % n;
                  S.cinematica = CINEMATICAS_VALIDAS[i] ?? CINEMATICA_PADRAO;
                  persist.salvar();
                },
              },
            ]
          : []),
        // PROVOCAÇÕES (balões antes do round e na vitória): opção PRÓPRIA, separada da cinemática. Sem `Regras.cinematica` (?expansao=4) ela não existe (a tela é a do protótipo).
        ...(this.ui.c.regras.cinematica
          ? [
              {
                label: 'PROVOCAÇÕES',
                value: () => (provocacoesLigadas(S.provocacoes) ? 'LIGADAS' : 'DESLIGADAS'),
                onAdjust: () => {
                  S.provocacoes = provocacoesLigadas(S.provocacoes) ? 'desligadas' : 'ligadas';
                  persist.salvar();
                },
              },
            ]
          : []),
        {
          label: 'TELA CHEIA (F)',
          value: () => (document.fullscreenElement ? 'LIGADA' : 'DESLIGADA'),
          onAdjust: () => this.ui.c.alternarTelaCheia(),
        },
        {
          label: 'RESTAURAR PADRÕES',
          onOk: () => {
            Object.assign(S, CONFIGURACOES_PADRAO);
            // o padrão NÃO tem `cinematica` (ausente = o padrão do aparelho): o Object.assign não a apaga, então apaga aqui
            delete S.cinematica;
            delete S.provocacoes; // idem: o padrão (ligadas) é a AUSÊNCIA do campo
            audio.setMusicVol(S.music);
            audio.setSfxVol(S.sfx);
            persist.salvar();
          },
        },
        { label: 'VOLTAR', onOk: () => this.ui.go('menu') },
    ];
    this.linhas = itens.length;
    return new MenuList(itens, audio, f);
  }

  enter(_a: ArgsComo): void {
    this.m = this.criarMenu();
  }

  draw(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, this.ui.t, 0.6);
    this.ui.desenharPetalas();
    f.A('OPÇÕES', LARGURA / 2, 52, 52, ['#ffffff', '#ffc27a'], '#1a0a00');
    // 10 linhas (com a cinemática) não cabem a 46 px de altura na tela de 540: 40 px; as 11 (com as provocações), 36 px
    this.m.draw(LARGURA / 2 - 330, this.linhas > 10 ? 98 : 100, 660, this.linhas > 10 ? 36 : this.linhas > 9 ? 40 : 46, { size: this.linhas > 10 ? 20 : 21 });
    f.hint('↑ ↓ escolher     ← → ajustar     ESC voltar');
  }

  nav(a: AcaoNav): void {
    if (a === 'back') {
      this.ui.go('menu');
      this.ui.c.audio.uiBack();
    } else this.m.nav(a);
  }

  hover(x: number, y: number): void {
    this.m.hover(x, y);
  }

  click(x: number, y: number): void {
    this.m.click(x, y);
  }
}
