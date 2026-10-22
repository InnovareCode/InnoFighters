import { ALTURA, LARGURA } from '../../core/constantes';
import type { Navegador } from '../navegador';
import type { ArgsTrailer, Cena } from '../tipos';
import type { ControladorDoTrailer } from '../trailer';

/*
 * CenaTrailer: a CASCA FINA do trailer de abertura (docs/spec-trailer-abertura.md §7.1, R10). O peso (diretor, roteiro, render, música, carga da arte) mora no pedaço
 * LAZY `src/ui/trailer`, que o navegador importa quando `ui.ready` fica true, enquanto o boot espera o gesto. O pacote principal só ganha este arquivo.
 *
 * O boot pergunta `disponivel()`: sem o pedaço (ainda baixando, falhou ao validar o roteiro, `Regras.trailer` falso ou `?trailer=0` em desenvolvimento) o gesto vai
 * para a `CenaIntro` de hoje: o boot NUNCA espera o trailer. Quem já entrou aqui com o pedaço a caminho (a ferramenta de medição, um gancho de teste) espera na tela preta.
 */

type EstadoDaCarga = 'nao' | 'carregando' | 'pronto' | 'falhou';

/** `?trailer=` (SÓ em desenvolvimento): `0` desliga o trailer (os e2e antigos que esperam `boot -> intro`); `P5` abre no plano (prévia para aprovar o corte). */
export function parametroDoTrailer(): string | null {
  if (!import.meta.env.DEV || typeof window === 'undefined') return null;
  return new URLSearchParams(window.location.search).get('trailer');
}

export class CenaTrailer implements Cena {
  private estado: EstadoDaCarga = 'nao';
  private ctl: ControladorDoTrailer | null = null;
  /** Entrou antes de o pedaço chegar: começa assim que ele chegar. */
  private pendente: ArgsTrailer | null = null;
  /** Quantas vezes o modo atrair rodou desde o último gesto do jogador (a música só toca na 1ª; D-T4). */
  repeticoesDoAtrair = 0;

  constructor(private readonly ui: Navegador) {}

  /** O trailer está ligado nas regras e não foi desligado por `?trailer=0`? */
  ligado(): boolean {
    return this.ui.c.regras.trailer && parametroDoTrailer() !== '0';
  }

  /** O pedaço lazy chegou e o roteiro é válido? */
  get carregado(): boolean {
    return this.estado === 'pronto';
  }

  /** O jogador agiu (tecla, clique, toque): a próxima repetição do modo atrair volta a ter música. */
  registrarGesto(): void {
    this.repeticoesDoAtrair = 0;
  }

  /** O boot e o título só abrem o trailer se for verdade (senão: a abertura de hoje). */
  disponivel(): boolean {
    return this.ligado() && this.carregado;
  }

  /** A cena já tem o que desenhar? (a ferramenta de medição espera por isto) */
  get pronta(): boolean {
    return this.ctl !== null && this.ctl.pronta;
  }

  /** Chamado por `Navegador.pronto()`: começa a baixar o pedaço, se o trailer está ligado. */
  precarregar(): void {
    if (this.ligado()) this.carregar();
  }

  carregar(): void {
    if (this.estado !== 'nao') return;
    this.estado = 'carregando';
    import('../trailer')
      .then((m) => {
        this.ctl = m.criarControlador(this.ui);
        this.estado = 'pronto';
        const args = this.pendente;
        this.pendente = null;
        if (args && this.ui.scene === this) this.abrir(args);
      })
      .catch((e: unknown) => {
        // roteiro inválido (validarRoteiro lança ao importar) ou rede: o trailer é opcional, o jogo segue com a abertura de hoje
        console.error('trailer indisponível:', e);
        this.estado = 'falhou';
        if (this.ui.scene === this && this.pendente) this.ui.set('intro');
        this.pendente = null;
      });
  }

  /** Diagnóstico para os testes e a ferramenta de medição (tick, plano, arte residente, memória aproximada). */
  diagnostico(): unknown {
    return this.ctl?.diagnostico() ?? null;
  }

  enter(args: ArgsTrailer): void {
    this.pendente = null;
    if (this.estado === 'falhou') {
      this.ui.set('intro');
      return;
    }
    if (this.estado !== 'pronto') {
      this.pendente = args;
      this.carregar();
      return;
    }
    this.abrir(args);
  }

  private abrir(args: ArgsTrailer): void {
    try {
      (this.ctl as ControladorDoTrailer).entrar(args);
    } catch (e) {
      console.error('trailer: falha ao abrir; segue com a abertura de hoje', e);
      this.ctl?.sair();
      this.ui.set('intro');
    }
  }

  exit(): void {
    this.pendente = null;
    this.ctl?.sair();
  }

  update(): void {
    this.ctl?.update();
  }

  draw(): void {
    if (this.ctl?.ativo) {
      this.ctl.draw();
      return;
    }
    const { ctx } = this.ui.c;
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, LARGURA, ALTURA);
  }

  key(k: string): boolean {
    if (k === 'f' || k === 'm') return false;
    return this.ctl?.ativo ? this.ctl.key() : true;
  }

  click(): void {
    if (this.ctl?.ativo) this.ctl.key();
  }

  blur(): void {
    this.ctl?.blur();
  }
}
