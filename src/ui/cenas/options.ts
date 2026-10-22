import { ALTURA, LARGURA } from '../../core/constantes';
import { CONFIGURACOES_PADRAO, type Configuracoes } from '../../core/contratos';
import { clamp } from '../../core/math';
import { AI_LEVELS } from '../../fight/cpu';
import { emTelaCheia, situacaoDaTelaCheia, ultimoResultadoTelaCheia, type SituacaoTelaCheia } from '../../platform/tela-cheia';
import { recarregarSemCache, rotuloDaVersao, verificarVersao, type EstadoDaVersao, type IdentidadeDoBuild } from '../../versao';
import { desenharFundoMenu } from '../../render/cenario';
import { MenuList } from '../menu-lista';
import type { Navegador } from '../navegador';
import type { AcaoNav, ArgsComo, Cena } from '../tipos';

type NumerosCiclicos = 'rounds' | 'time' | 'diff';

/** O que a tela explica quando a tela cheia não é um liga/desliga (o texto é o que o jogador precisa FAZER). */
export interface CartaoDeAjuda {
  readonly titulo: string;
  readonly linhas: readonly string[];
}

export const CARTAO_IOS: CartaoDeAjuda = {
  titulo: 'TELA CHEIA NO IPHONE / IPAD',
  linhas: [
    'O iPhone não deixa um site ocupar a tela toda pelo navegador (vale para o Safari e para o Chrome).',
    '1. Toque no botão Compartilhar do navegador.',
    '2. Escolha "Adicionar à Tela de Início".',
    '3. Abra o InnoFighters pelo novo ícone: ele abre sem as barras.',
  ],
};

const CARTOES: Readonly<Record<Exclude<SituacaoTelaCheia, 'disponivel'> | 'negada', CartaoDeAjuda>> = {
  ios: CARTAO_IOS,
  instalado: {
    titulo: 'TELA CHEIA',
    linhas: ['Você abriu o jogo pelo ícone da Tela de Início: ele já ocupa a tela toda, sem as barras do navegador.'],
  },
  bloqueada: {
    titulo: 'TELA CHEIA BLOQUEADA',
    linhas: ['Esta página está dentro de outra página e o navegador não deixa pedir tela cheia aqui.', 'Abra o jogo direto pelo endereço dele, numa aba própria.'],
  },
  indisponivel: {
    titulo: 'TELA CHEIA INDISPONÍVEL',
    linhas: [
      'Este navegador não oferece tela cheia para sites (comum em navegadores que vivem dentro de outros aplicativos).',
      'Abra o endereço do jogo no Chrome ou no Safari.',
    ],
  },
  negada: {
    titulo: 'O NAVEGADOR RECUSOU',
    linhas: ['O navegador não aceitou a tela cheia desta vez.', 'Toque de novo na linha TELA CHEIA. Se continuar, use o menu do navegador (Tela inteira / Instalar app).'],
  },
};

/** O que a linha mostra à direita, por situação (só `disponivel` é um liga/desliga). */
const VALOR_FIXO: Readonly<Record<Exclude<SituacaoTelaCheia, 'disponivel'>, string>> = {
  ios: 'COMO ATIVAR',
  instalado: 'JÁ ATIVA',
  bloqueada: 'INDISPONÍVEL',
  indisponivel: 'INDISPONÍVEL',
};

/** Fora do navegador (testes em Node) não há janela: a linha se comporta como num navegador com a API. */
const situacaoAgora = (): SituacaoTelaCheia => (typeof window === 'undefined' ? 'disponivel' : situacaoDaTelaCheia(window));

/**
 * Opções: volumes, rounds, tempo, dificuldade padrão, tremor, tela cheia e restaurar.
 * As frentes novas (cinemática do especial, provocações) NÃO têm chave aqui: são parte do jogo (decisão do dono); o movimento reduzido
 * do SISTEMA continua sendo respeitado por quem as desenha.
 */
export class CenaOptions implements Cena {
  private m: MenuList;
  /** Cartão de ajuda aberto sobre a tela (tela cheia que não é liga/desliga); qualquer ação o fecha. */
  private cartao: CartaoDeAjuda | null = null;
  /** A versão que está rodando x a que está no ar (consultada ao abrir a tela): prova, para o dono, qual build ele vê. */
  private versao: { estado: EstadoDaVersao; noAr: IdentidadeDoBuild | null } = { estado: 'verificando', noAr: null };
  /** Instante do último resultado "negada" já mostrado (cada recusa abre o cartão uma vez). */
  private visto = Date.now();

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
    const situacao = situacaoAgora();
    const toque = this.ui.c.temToque();
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
      // Tela cheia: onde a plataforma permite, liga e desliga; onde não, a linha EXPLICA (cartão) em vez de ficar morta.
      situacao === 'disponivel'
        ? {
            label: toque ? 'TELA CHEIA' : 'TELA CHEIA (F)',
            value: () => (emTelaCheia() ? 'LIGADA' : 'DESLIGADA'),
            onAdjust: () => this.pedirTelaCheia(),
          }
        : {
            label: toque ? 'TELA CHEIA' : 'TELA CHEIA (F)',
            value: () => VALOR_FIXO[situacao],
            onOk: () => {
              this.cartao = CARTOES[situacao];
            },
          },
      {
        label: 'RESTAURAR PADRÕES',
        onOk: () => {
          Object.assign(S, CONFIGURACOES_PADRAO);
          // preferências de versões antigas (cinemática, provocações) já não existem como opção: nada a restaurar
          delete S.cinematica;
          delete S.provocacoes;
          audio.setMusicVol(S.music);
          audio.setSfxVol(S.sfx);
          persist.salvar();
        },
      },
      { label: 'VOLTAR', onOk: () => this.ui.go('menu') },
    ];
    return new MenuList(itens, audio, f);
  }

  /** Pede a tela cheia; se o navegador recusar, o `draw` abre o cartão (ver `ultimoResultadoTelaCheia`) em vez de a linha parecer morta. */
  private pedirTelaCheia(): void {
    void Promise.resolve(this.ui.c.alternarTelaCheia());
  }

  enter(_a: ArgsComo): void {
    this.cartao = null;
    this.versao = { estado: 'verificando', noAr: null };
    void verificarVersao().then((r) => {
      this.versao = r;
    });
    this.m = this.criarMenu();
  }

  private desenharCartao(): void {
    const c = this.cartao;
    if (!c) return;
    const { ctx, f } = this.ui.c;
    ctx.save();
    ctx.fillStyle = 'rgba(4,2,12,.72)';
    ctx.fillRect(0, 0, LARGURA, 540);
    ctx.restore();
    const x = 110;
    const w = LARGURA - 220;
    const y = 120;
    const h = 322;
    f.panel(x, y, w, h, { r: 14, c0: 'rgba(32,22,66,.97)', c1: 'rgba(10,6,28,.98)', stroke: 'rgba(255,196,60,.55)', lw: 2 });
    f.A(c.titulo, LARGURA / 2, y + 44, 30, ['#ffffff', '#ffc27a'], '#1a0a00');
    let yy = y + 100;
    c.linhas.forEach((l, i) => {
      const n = f.wrap(l, x + 36, yy, w - 72, 28, 20, i === 0 && c.linhas.length > 1 ? '#cfd6f5' : '#ffffff');
      yy += n * 28 + 10;
    });
    f.T('Toque, Enter ou Esc para fechar', LARGURA / 2, y + h - 22, 15, '#ffd23f', 'center');
  }

  draw(): void {
    const { ctx, f } = this.ui.c;
    const m = this.ui.m;
    desenharFundoMenu(ctx, m.rec.cenarioPadrao, m.rec.vinheta, this.ui.t, 0.6);
    this.ui.desenharPetalas();
    f.A('OPÇÕES', LARGURA / 2, 52, 52, ['#ffffff', '#ffc27a'], '#1a0a00');
    this.m.draw(LARGURA / 2 - 330, 100, 660, 46, { size: 21 });
    f.hint('↑ ↓ escolher     ← → ajustar     ESC voltar');
    // o pedido recusado (inclusive a nova tentativa depois do fim do toque) vira cartão, uma vez por recusa
    const u = ultimoResultadoTelaCheia();
    if (u && u.resultado === 'negada' && u.em > this.visto) {
      this.visto = u.em;
      this.cartao ??= CARTOES.negada;
    }
    this.desenharVersao();
    this.desenharCartao();
  }

  /** Canto direito da barra de baixo (a dica fica no centro): o rótulo do build, ou o aviso de versão nova com o toque para atualizar. */
  private desenharVersao(): void {
    const { f } = this.ui.c;
    if (this.versao.estado === 'nova') f.T('NOVA VERSÃO NO AR · TOQUE AQUI PARA ATUALIZAR', LARGURA - 14, ALTURA - 15, 13, '#ffd23f', 'right');
    else f.T(`versão ${rotuloDaVersao()}`, LARGURA - 14, ALTURA - 15, 12, '#aab2d6', 'right', { shadow: false });
  }

  private atualizar(): void {
    recarregarSemCache(window, this.versao.noAr);
  }

  key(tecla: string): boolean {
    if (this.cartao || tecla !== 'u' || this.versao.estado !== 'nova') return false;
    this.atualizar();
    return true;
  }

  nav(a: AcaoNav): void {
    if (this.cartao) {
      this.cartao = null;
      return;
    }
    if (a === 'back') {
      this.ui.go('menu');
      this.ui.c.audio.uiBack();
    } else this.m.nav(a);
  }

  hover(x: number, y: number): void {
    if (!this.cartao) this.m.hover(x, y);
  }

  click(x: number, y: number): void {
    if (this.cartao) {
      this.cartao = null;
      return;
    }
    if (this.versao.estado === 'nova' && y >= ALTURA - 30 && x >= LARGURA / 2 + 120) {
      this.atualizar();
      return;
    }
    this.m.click(x, y);
  }
}
