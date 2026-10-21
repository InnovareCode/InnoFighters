import { describe, expect, it, vi } from 'vitest';
import { criarAviso, DURACAO_AVISO_MS, type ElementoAviso } from '../../src/platform/aviso';
import { CHAVE_STORAGE_V2, CONFIGURACOES_PADRAO } from '../../src/core/contratos';
import { carregarDadosV2, type ArmazenamentoLike } from '../../src/core/storage';
import { REGRAS_PADRAO } from '../../src/meta';
import { MSG_NAO_SALVO, criarPersistencia } from '../../src/ui/persistencia';

/** Relógio falso: guarda o que foi agendado e deixa o teste "passar o tempo". */
function relogio() {
  const fila = new Map<number, { fn: () => void; ms: number }>();
  let n = 0;
  return {
    agendar: (fn: () => void, ms: number) => {
      fila.set(++n, { fn, ms });
      return n;
    },
    cancelar: (id: unknown) => void fila.delete(id as number),
    pendentes: () => fila.size,
    prazos: () => [...fila.values()].map((x) => x.ms),
    disparar: () => {
      for (const [id, x] of [...fila]) {
        fila.delete(id);
        x.fn();
      }
    },
  };
}

const elemento = (): ElementoAviso => ({ textContent: '', hidden: true });

describe('criarAviso', () => {
  it('mostra a mensagem, e some sozinho depois do prazo (6 s por padrão)', () => {
    const el = elemento();
    const r = relogio();
    const avisar = criarAviso(el, r);
    avisar('oi');
    expect(el).toEqual({ textContent: 'oi', hidden: false });
    expect(r.prazos()).toEqual([DURACAO_AVISO_MS]);
    expect(DURACAO_AVISO_MS).toBe(6000);
    r.disparar();
    expect(el).toEqual({ textContent: '', hidden: true });
  });

  it('repetir enquanto visível só renova o prazo: um único timer, sem empilhar nem sumir antes', () => {
    const el = elemento();
    const r = relogio();
    const avisar = criarAviso(el, r);
    avisar('a');
    avisar('a');
    avisar('a');
    expect(r.pendentes()).toBe(1);
    expect(el.hidden).toBe(false);
    r.disparar();
    expect(el.hidden).toBe(true);
    avisar('a');
    expect(el.hidden).toBe(false);
    expect(r.pendentes()).toBe(1);
  });

  it('sem o elemento no HTML vira no-op (não derruba o jogo)', () => {
    const r = relogio();
    expect(() => criarAviso(null, r)('x')).not.toThrow();
    expect(r.pendentes()).toBe(0);
  });

  it('duração configurável', () => {
    const r = relogio();
    criarAviso(elemento(), { ...r, duracaoMs: 250 })('x');
    expect(r.prazos()).toEqual([250]);
  });
});

function armazenamento(opcoes: { falhaAoGravar?: boolean; inicial?: Record<string, string> } = {}): ArmazenamentoLike & { mem: Map<string, string> } {
  const mem = new Map<string, string>(Object.entries(opcoes.inicial ?? {}));
  return {
    mem,
    getItem: (k) => mem.get(k) ?? null,
    setItem: (k, v) => {
      if (opcoes.falhaAoGravar) throw new Error('QuotaExceededError');
      mem.set(k, v);
    },
    removeItem: (k) => void mem.delete(k),
  };
}

describe('criarPersistencia: salvar() devolve o resultado e avisa só quando NÃO gravou', () => {
  it('gravou: devolve true, não avisa, e o disco recebe o estado atual', () => {
    const arm = armazenamento();
    const falhou = vi.fn();
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, falhou);
    p.hi = 4200;
    expect(p.salvar()).toBe(true);
    expect(falhou).not.toHaveBeenCalled();
    expect(carregarDadosV2(arm, REGRAS_PADRAO).hi).toBe(4200);
  });

  it('cota cheia / modo privado (setItem lança): devolve false e avisa', () => {
    const arm = armazenamento({ falhaAoGravar: true });
    const falhou = vi.fn();
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, falhou);
    expect(p.salvar()).toBe(false);
    expect(falhou).toHaveBeenCalledTimes(1);
    p.salvar();
    expect(falhou).toHaveBeenCalledTimes(2);
  });

  it('v2 de um build mais novo no disco (v:3): recusa, devolve false, avisa e NÃO toca no disco', () => {
    const futura = JSON.stringify({ v: 3, s: { rounds: 3 }, hi: 777, prog: { novo: true } });
    const arm = armazenamento({ inicial: { [CHAVE_STORAGE_V2]: futura } });
    const falhou = vi.fn();
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, falhou);
    p.hi = 5;
    expect(p.salvar()).toBe(false);
    expect(falhou).toHaveBeenCalledTimes(1);
    expect(arm.mem.get(CHAVE_STORAGE_V2)).toBe(futura);
  });

  it('salva o que está em `settings`/`hi`/`prog` NO MOMENTO da chamada (não o inicial)', () => {
    const arm = armazenamento();
    const p = criarPersistencia(arm, carregarDadosV2(arm, REGRAS_PADRAO), REGRAS_PADRAO, () => undefined);
    p.settings.rounds = 3;
    p.hi = 99;
    expect(p.salvar()).toBe(true);
    const lido = carregarDadosV2(arm, REGRAS_PADRAO);
    expect([lido.s.rounds, lido.hi]).toEqual([3, 99]);
    expect(CONFIGURACOES_PADRAO.rounds).not.toBe(3);
  });

  it('a mensagem do aviso é a esperada', () => {
    expect(MSG_NAO_SALVO).toBe('Progresso não salvo neste aparelho');
  });
});
