import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AudioSys } from '../../src/audio/audio-sys';
import { bancoDeAmostrasAtivo, carregarCamadasSonoras, descartarAmostras, reagirDoJogo } from '../../src/audio/camadas';
import { AMOSTRAS_REALISTAS, chavesSonoras } from '../../src/audio/chaves';
import type { EventoLuta } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { desbloquearAudio } from '../../src/platform/audio-desbloqueio';
import { CenaVs } from '../../src/ui/cenas/vs';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { criarPacote, type PacoteDeTeste } from '../support/pacote-teste';

/*
 * T5 do orçamento (docs/orcamentos-2026-10-23.md §2.2): `base.mp3` (272 KiB) e as folhas dos lutadores (~50 KiB cada) SAEM DO BOOT.
 *   - boot: só o manifesto (8 KiB gzip);
 *   - etapa 2: depois do 1º gesto, com o navegador ocioso, a base;
 *   - tela VS: a base (se faltar) e os dois lutadores;
 *   - o 1º tick da luta continua pedindo o que faltar (rede de segurança).
 * E o que a troca NÃO pode custar: som que some. Sem folha, o jogo toca a síntese de hoje, golpe a golpe.
 */

const BASE = '/assets/sons/';
const luta = { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 100 } as never;

const resposta = (corpo: string | ArrayBuffer, ok = true): unknown => ({
  ok,
  status: ok ? 200 : 404,
  text: async () => (typeof corpo === 'string' ? corpo : ''),
  arrayBuffer: async () => (typeof corpo === 'string' ? new TextEncoder().encode(corpo).buffer : corpo),
});

/** `fetch` falso com o pacote de teste. `demora` segura as folhas (nunca chegam) até `liberar()`. */
function redeFalsa(pacote: PacoteDeTeste, o: { segurarFolhas?: boolean } = {}): { urls: string[]; mp3: () => string[]; liberar: () => void } {
  const urls: string[] = [];
  const presas: (() => void)[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    const caminho = url.split('?')[0] ?? '';
    if (caminho.endsWith('manifesto.json')) return resposta(JSON.stringify(pacote.manifesto));
    const arquivo = caminho.split('/').pop() ?? '';
    const bytes = pacote.arquivos.get(arquivo);
    if (!bytes) return resposta('', false);
    if (o.segurarFolhas) await new Promise<void>((r) => presas.push(r));
    return resposta(bytes.slice(0));
  });
  return {
    urls,
    mp3: () => urls.filter((u) => u.includes('.mp3')).map((u) => (u.split('?')[0] ?? '').split('/').pop() ?? ''),
    liberar: () => presas.splice(0).forEach((r) => r()),
  };
}

function audioComDecode(pacote: PacoteDeTeste): { c: Contexto; audio: AudioSys } {
  const c = new Contexto(44100);
  (c as unknown as { decodeAudioData: unknown }).decodeAudioData = (bytes: ArrayBuffer, ok: (b: unknown) => void, erro: (e: unknown) => void): void => void pacote.decodificar(c, bytes).then(ok, erro);
  const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
  return { c, audio };
}
const esperar = async (cond: () => boolean): Promise<void> => {
  for (let i = 0; i < 500 && !cond(); i++) await new Promise((r) => setTimeout(r, 0));
  expect(cond()).toBe(true);
};
const gestoFalso = (audio: AudioSys): { gesto: () => void; desfaz: () => void } => {
  const ouvintes = new Map<string, () => void>();
  const desfaz = desbloquearAudio(
    { addEventListener: (nome: string, fn: () => void): void => void ouvintes.set(nome, fn), removeEventListener: (): void => undefined },
    audio,
  );
  return { gesto: () => ouvintes.get('click')?.(), desfaz };
};

beforeAll(async () => {
  await carregarCamadasSonoras({ identidade: true });
});
afterEach(() => {
  descartarAmostras();
  vi.unstubAllGlobals();
  vi.useRealTimers();
  chavesSonoras.amostras = AMOSTRAS_REALISTAS;
});

describe('T5: o que desce em cada etapa', () => {
  it('boot: só o manifesto. Etapa 2: o 1º gesto AGENDA a base para o ocioso e só ela desce (nenhum lutador); um 2º gesto não agenda de novo', async () => {
    const pacote = criarPacote();
    const rede = redeFalsa(pacote);
    const ociosos: (() => void)[] = [];
    vi.stubGlobal('requestIdleCallback', (fn: () => void) => ociosos.push(fn));
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    await new Promise((r) => setTimeout(r, 10));
    expect(rede.urls).toHaveLength(1); // o manifesto
    expect(rede.mp3()).toEqual([]);

    const { audio } = audioComDecode(pacote);
    const { gesto, desfaz } = gestoFalso(audio);
    await new Promise((r) => setTimeout(r, 10));
    expect(rede.mp3()).toEqual([]); // sem gesto, nada
    gesto();
    expect(ociosos).toHaveLength(1);
    expect(rede.mp3()).toEqual([]); // agendou, mas o ocioso ainda não chegou
    gesto();
    gesto();
    expect(ociosos).toHaveLength(1);
    ociosos[0]?.();
    await esperar(() => rede.mp3().length === 1);
    await new Promise((r) => setTimeout(r, 10));
    expect(rede.mp3()).toEqual(['base.mp3']); // a base e MAIS NADA: os lutadores são da VS
    desfaz();
  });

  it('WebKit (iOS/Safari não têm requestIdleCallback): a etapa 2 cai num setTimeout curto, depois do gesto', async () => {
    vi.useFakeTimers();
    const pacote = criarPacote();
    const rede = redeFalsa(pacote);
    vi.stubGlobal('requestIdleCallback', undefined);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio } = audioComDecode(pacote);
    const { gesto, desfaz } = gestoFalso(audio);
    await vi.advanceTimersByTimeAsync(5000);
    expect(rede.mp3()).toEqual([]); // sem gesto, nem o timer
    gesto();
    await vi.advanceTimersByTimeAsync(300);
    expect(rede.mp3()).toEqual(['base.mp3']);
    desfaz();
  });

  it('rollback por código (`chavesSonoras.amostras = false`) antes do ocioso: a etapa 2 não baixa nada', async () => {
    const pacote = criarPacote();
    const rede = redeFalsa(pacote);
    const ociosos: (() => void)[] = [];
    vi.stubGlobal('requestIdleCallback', (fn: () => void) => ociosos.push(fn));
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio } = audioComDecode(pacote);
    const { gesto, desfaz } = gestoFalso(audio);
    gesto();
    chavesSonoras.amostras = false;
    ociosos[0]?.();
    await new Promise((r) => setTimeout(r, 10));
    expect(rede.mp3()).toEqual([]);
    desfaz();
  });

  it('a tela VS pede a base e os DOIS lutadores (uma vez por confronto) e não mexe na arte pedindo mais nada', async () => {
    const pacote = criarPacote();
    const rede = redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    expect(rede.mp3()).toEqual([]);
    const { audio } = audioComDecode(pacote);
    audio.init();
    const ui = {
      m: { arte: { estaPronto: () => true }, elenco: { 'min-ji': { ch: { stage: 'kr' } } } },
      c: { audio: { ctx: audio.ctx, uiVs: (): void => undefined } },
    };
    const vs = new CenaVs(ui as never);
    vs.enter({ cfg: { mode: 'versus', c1: 'hayato', c2: 'min-ji', cpu: null } } as never);
    await esperar(() => rede.mp3().length === 3);
    expect(rede.mp3().sort()).toEqual(['base.mp3', 'lutador-hayato.mp3', 'lutador-min-ji.mp3']);
    vs.enter({ cfg: { mode: 'versus', c1: 'hayato', c2: 'min-ji', cpu: null } } as never); // a mesma VS de novo: idempotente
    await new Promise((r) => setTimeout(r, 10));
    expect(rede.mp3()).toHaveLength(3);
  });
});

describe('T5: nenhum som some no 1º golpe', () => {
  const evento = (snd: 'punch' | 'kick', grande = false): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande, snd, pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5 });
  const EVENTOS: Record<string, EventoLuta> = {
    'soco': evento('punch'),
    'chute': evento('kick'),
    'golpe forte': evento('punch', true),
    'balanço do soco': { tipo: 'swing', lutador: 0, golpe: 'punch' },
    'balanço do chute': { tipo: 'swing', lutador: 1, golpe: 'kick' },
    'nocaute': { tipo: 'ko', defensor: 1, pitch: 1 },
  };

  it('com o banco carregado e NENHUMA folha (o 1º golpe antes da etapa 2 e da VS), cada evento toca o MESMO que o jogo sem amostras: a síntese de hoje', async () => {
    const pacote = criarPacote();
    redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const banco = bancoDeAmostrasAtivo();
    expect(banco?.nomesDeFolha().every((n) => banco.estadoDaFolha(n) === 'pendente')).toBe(true);
    for (const [nome, ev] of Object.entries(EVENTOS)) {
      // (a) banco sem folha nenhuma: nada baixado, nada decodificado. Tick de VERDADE de uma luta que começou: `reagirDoJogo` pede as folhas, mas ainda não chegaram
      const a = audioComDecode(pacote);
      a.audio.init();
      const nosAntes = { ...a.c.criados };
      reagirDoJogo(a.audio, { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 1 } as never, [ev]);
      const comBanco = { osc: a.c.criados.osc - nosAntes.osc, fonte: a.c.criados.fonte - nosAntes.fonte, ganho: a.c.criados.ganho - nosAntes.ganho };
      // (b) o mesmo evento sem banco nenhum (o jogo sem a camada de amostras)
      const guardado = bancoDeAmostrasAtivo();
      expect(guardado).not.toBeNull();
      chavesSonoras.amostras = false;
      const b = audioComDecode(pacote);
      b.audio.init();
      const nosAntesB = { ...b.c.criados };
      reagirDoJogo(b.audio, { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 1 } as never, [ev]);
      const semBanco = { osc: b.c.criados.osc - nosAntesB.osc, fonte: b.c.criados.fonte - nosAntesB.fonte, ganho: b.c.criados.ganho - nosAntesB.ganho };
      chavesSonoras.amostras = AMOSTRAS_REALISTAS;
      expect(comBanco.osc + comBanco.fonte, `${nome}: tocou alguma coisa`).toBeGreaterThan(0);
      expect(comBanco, `${nome}: igual ao jogo sem amostras`).toEqual(semBanco);
    }
  });

  it('as folhas ainda a caminho (VS curta): o 1º golpe é síntese e, quando elas chegam e decodificam, o golpe seguinte já é amostra', async () => {
    const pacote = criarPacote();
    const rede = redeFalsa(pacote, { segurarFolhas: true });
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio, c } = audioComDecode(pacote);
    audio.init();
    const banco = bancoDeAmostrasAtivo();
    reagirDoJogo(audio, luta, []); // 1º tick: pede as 3 folhas, que não chegam
    await esperar(() => rede.mp3().length === 3);
    const antes = { ...c.criados };
    reagirDoJogo(audio, luta, [EVENTOS['soco'] as EventoLuta]);
    expect(c.criados.osc - antes.osc, 'sem folha: o soco é a síntese (osciladores)').toBeGreaterThan(0);
    expect(banco?.estadoDaFolha('base')).toBe('baixando');
    rede.liberar();
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => ['baixada', 'decodificando', 'pronta'].includes(banco?.estadoDaFolha(n) ?? '')));
    reagirDoJogo(audio, luta, []);
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => banco?.estadoDaFolha(n) === 'pronta'));
    const depois = { ...c.criados };
    reagirDoJogo(audio, luta, [EVENTOS['soco'] as EventoLuta]);
    expect(c.criados.osc - depois.osc, 'com a folha pronta: amostra, sem oscilador').toBe(0);
    expect(c.criados.fonte - depois.fonte, 'a amostra é uma fonte de buffer').toBeGreaterThan(0);
  });

  it('a folha de um lutador que NÃO chegou (404): o golpe dele toca a síntese e a luta segue; as outras folhas funcionam', async () => {
    const pacote = criarPacote();
    vi.stubGlobal('fetch', async (url: string) => {
      const caminho = url.split('?')[0] ?? '';
      if (caminho.endsWith('manifesto.json')) return resposta(JSON.stringify(pacote.manifesto));
      const arquivo = caminho.split('/').pop() ?? '';
      const bytes = pacote.arquivos.get(arquivo);
      return !bytes || arquivo === 'lutador-hayato.mp3' ? resposta('', false) : resposta(bytes.slice(0));
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio, c } = audioComDecode(pacote);
    audio.init();
    const banco = bancoDeAmostrasAtivo();
    reagirDoJogo(audio, luta, []);
    await esperar(() => banco?.estadoDaFolha('hayato') === 'falhou' && ['baixada', 'decodificando', 'pronta'].includes(banco?.estadoDaFolha('base') ?? ''));
    reagirDoJogo(audio, luta, []);
    await esperar(() => banco?.estadoDaFolha('base') === 'pronta');
    const antes = { ...c.criados };
    expect(() => reagirDoJogo(audio, luta, [EVENTOS['soco'] as EventoLuta, EVENTOS['nocaute'] as EventoLuta])).not.toThrow();
    expect(c.criados.osc - antes.osc + (c.criados.fonte - antes.fonte)).toBeGreaterThan(0);
    aviso.mockRestore();
  });
});
