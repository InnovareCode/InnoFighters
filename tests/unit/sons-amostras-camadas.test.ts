import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AudioSys } from '../../src/audio/audio-sys';
import { bancoDeAmostrasAtivo, carregarCamadasSonoras, descartarAmostras, prepararLutaSonora, reagirDoJogo } from '../../src/audio/camadas';
import { AMOSTRAS_REALISTAS, chavesSonoras } from '../../src/audio/chaves';
import type { EventoLuta } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { desbloquearAudio } from '../../src/platform/audio-desbloqueio';
import { Contexto, comoAudioContext } from '../support/audio-offline';
import { criarPacote, type PacoteDeTeste } from '../support/pacote-teste';

/*
 * A LIGAÇÃO das amostras reais ao jogo: o pedaço `amostras` baixado por `import()` em `camadas.ts`, o manifesto lido por `fetch` (aqui um `fetch` falso que serve o pacote de
 * teste), a pré-carga da base e dos dois lutadores, a decodificação no destrave do áudio, e o rollback. O caminho é o de produção; só a rede e o decodificador são do teste.
 */

const luta = { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 100 } as never;
const BASE = '/assets/sons/';

const resposta = (corpo: string | ArrayBuffer, ok = true): unknown => ({
  ok,
  status: ok ? 200 : 404,
  text: async () => (typeof corpo === 'string' ? corpo : ''),
  arrayBuffer: async () => (typeof corpo === 'string' ? new TextEncoder().encode(corpo).buffer : corpo),
});

/** `fetch` falso: serve `manifesto.json` e as folhas do pacote; o resto é 404. Registra as URLs. */
function redeFalsa(pacote: PacoteDeTeste, o: { manifesto?: string | null | 'html'; semFolhas?: string[] } = {}): string[] {
  const urls: string[] = [];
  vi.stubGlobal('fetch', async (url: string) => {
    urls.push(url);
    const caminho = url.split('?')[0] ?? '';
    if (caminho.endsWith('manifesto.json')) {
      if (o.manifesto === null) return resposta('', false);
      if (o.manifesto === 'html') return resposta('<!doctype html><html></html>');
      return resposta(o.manifesto ?? JSON.stringify(pacote.manifesto));
    }
    const arquivo = caminho.split('/').pop() ?? '';
    const bytes = pacote.arquivos.get(arquivo);
    if (!bytes || o.semFolhas?.includes(arquivo)) return resposta('', false);
    return resposta(bytes.slice(0));
  });
  return urls;
}

/** AudioSys offline cujo contexto TEM `decodeAudioData` (na forma de callback, como o WebKit antigo): exercita o `decodificarPadrao` do banco. */
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

beforeAll(async () => {
  // a identidade precisa estar carregada: sem ela as amostras não valem
  await carregarCamadasSonoras({ identidade: true });
});
afterEach(() => {
  descartarAmostras();
  vi.unstubAllGlobals();
  chavesSonoras.amostras = AMOSTRAS_REALISTAS;
});

describe('carregarCamadasSonoras({ amostras })', () => {
  it('baixa o manifesto (com ?v=<commit> contra cache velho), valida, cria o banco e já pede só a BASE (bytes, sem decodificar)', async () => {
    const pacote = criarPacote();
    const urls = redeFalsa(pacote);
    expect(await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE })).toBe(true);
    const banco = bancoDeAmostrasAtivo();
    expect(banco).not.toBeNull();
    await esperar(() => banco?.estadoDaFolha('base') === 'baixada');
    expect(urls[0]).toMatch(/^\/assets\/sons\/manifesto\.json\?v=/);
    expect(urls.filter((u) => u.includes('.mp3')).map((u) => u.split('?')[0])).toEqual(['/assets/sons/base.mp3']);
    expect(banco?.estadoDaFolha('hayato')).toBe('pendente');
  });

  it('sem manifesto (404, ou o servidor devolve a página no lugar do JSON): o jogo segue 100% na síntese, sem erro e sem banco', async () => {
    for (const manifesto of [null, 'html'] as const) {
      redeFalsa(criarPacote(), { manifesto });
      const aviso = vi.spyOn(console, 'info').mockImplementation(() => undefined);
      expect(await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE }), String(manifesto)).toBe(true);
      aviso.mockRestore();
      expect(bancoDeAmostrasAtivo()).toBeNull();
      descartarAmostras();
    }
  });

  it('rede caída (o `fetch` lança TypeError): sem banco, sem exceção', async () => {
    vi.stubGlobal('fetch', async () => {
      throw new TypeError('Failed to fetch');
    });
    const aviso = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE })).toBe(true);
    aviso.mockRestore();
    expect(bancoDeAmostrasAtivo()).toBeNull();
  });

  it('manifesto INVÁLIDO (corte sem CC0) derruba o carregamento: erro alto e cedo, como os dados de sons', async () => {
    const pacote = criarPacote();
    const m = JSON.parse(JSON.stringify(pacote.manifesto)) as { sons: Record<string, { licenca: string }> };
    (m.sons['defesa'] as { licenca: string }).licenca = 'proprietaria';
    redeFalsa(pacote, { manifesto: JSON.stringify(m) });
    await expect(carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE })).rejects.toThrow(/licenca 'proprietaria'/);
  });

  it('DEV/CI relança manifesto que parseia mas é inválido (`{}`, JSON de erro, versão antiga com id novo): o teste e o desenvolvedor pegam; `falharAlto: true` também', async () => {
    const pacote = criarPacote();
    const velho = JSON.parse(JSON.stringify(pacote.manifesto)) as { sons: Record<string, unknown> };
    velho.sons['imp.id.de.deploy.novo'] = velho.sons['defesa'];
    for (const manifesto of ['{}', '{"error":"Bad Gateway","status":502}', JSON.stringify(velho)]) {
      redeFalsa(pacote, { manifesto });
      await expect(carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE }), manifesto.slice(0, 30)).rejects.toThrow(/manifesto de amostras inválido/);
      descartarAmostras();
      await expect(carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE, falharAlto: true }), manifesto.slice(0, 30)).rejects.toThrow(/inválido/);
    }
  });

  it('PRODUÇÃO (`falharAlto: false`): manifesto `{}`, JSON de erro de proxy, `[]`, `null`, versão antiga com id novo ou peso estourado NUNCA derrubam o boot: síntese, chave desligada, console.error, sem pedir folha', async () => {
    const pacote = criarPacote();
    const velho = JSON.parse(JSON.stringify(pacote.manifesto)) as { sons: Record<string, unknown> };
    velho.sons['imp.id.de.deploy.novo'] = velho.sons['defesa']; // o JS antigo em cache não conhece este id
    const pesado = JSON.parse(JSON.stringify(pacote.manifesto)) as { folhas: Record<string, { bytes: number }> };
    (pesado.folhas['base'] as { bytes: number }).bytes = 5_000_000;
    for (const manifesto of ['{}', '{"error":"Bad Gateway","status":502}', '[]', 'null', '"oi"', '123', JSON.stringify(velho), JSON.stringify(pesado)]) {
      const urls = redeFalsa(pacote, { manifesto });
      const erro = vi.spyOn(console, 'error').mockImplementation(() => undefined);
      const resultado = await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE, falharAlto: false });
      expect(erro, manifesto.slice(0, 30)).toHaveBeenCalledTimes(1);
      erro.mockRestore();
      expect(resultado, manifesto.slice(0, 30)).toBe(false); // houve falha (o chamador sabe), mas nada lançou
      expect(bancoDeAmostrasAtivo()).toBeNull();
      expect(chavesSonoras.amostras).toBe(false);
      // o jogo segue: nenhum pedido de folha e o 1º soco é a síntese de hoje
      const { audio, c } = audioComDecode(pacote);
      audio.init();
      reagirDoJogo(audio, luta, [{ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5 }]);
      expect(c.criados.osc).toBeGreaterThan(0);
      expect(urls.filter((u) => u.includes('.mp3'))).toEqual([]);
      descartarAmostras();
      chavesSonoras.amostras = AMOSTRAS_REALISTAS;
    }
  });

  it('PRODUÇÃO: manifesto ausente/HTML segue devolvendo `true` (não é falha, é pacote que não existe); manifesto bom continua carregando normalmente com `falharAlto: false`', async () => {
    redeFalsa(criarPacote(), { manifesto: 'html' });
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    expect(await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE, falharAlto: false })).toBe(true);
    info.mockRestore();
    expect(bancoDeAmostrasAtivo()).toBeNull();
    expect(chavesSonoras.amostras).toBe(AMOSTRAS_REALISTAS);
    descartarAmostras();
    redeFalsa(criarPacote());
    expect(await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE, falharAlto: false })).toBe(true);
    expect(bancoDeAmostrasAtivo()).not.toBeNull();
  });

  it('sem `amostras` na chamada, nada é baixado (a chave desligada no main.ts = o jogo de antes, sem pedido de rede)', async () => {
    const urls = redeFalsa(criarPacote());
    expect(await carregarCamadasSonoras({ identidade: true })).toBe(true);
    expect(urls).toEqual([]);
    expect(bancoDeAmostrasAtivo()).toBeNull();
  });
});

describe('a luta: pré-carga das folhas dos 2 lutadores e decodificação', () => {
  it('o 1º tick de um confronto pede a base e os DOIS lutadores; confronto igual não pede de novo; outro confronto pede os novos', async () => {
    const pacote = criarPacote();
    const urls = redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio } = audioComDecode(pacote);
    const mp3 = (): string[] => urls.filter((u) => u.includes('.mp3')).map((u) => (u.split('?')[0] ?? '').split('/').pop() ?? '');
    reagirDoJogo(audio, luta, []);
    await esperar(() => mp3().length === 3);
    expect(mp3().sort()).toEqual(['base.mp3', 'lutador-caio.mp3', 'lutador-hayato.mp3']);
    reagirDoJogo(audio, luta, []);
    reagirDoJogo(audio, luta, []);
    expect(mp3()).toHaveLength(3);
    reagirDoJogo(audio, { fighters: [{ id: 'nila', ficha: null }, { id: 'zenon', ficha: null }], t: 5 } as never, []);
    await esperar(() => mp3().length === 5);
  });

  it('com o contexto criado, o tick decodifica o que já chegou (decodeAudioData na forma de callback) e o 1º soco já sai como amostra', async () => {
    const pacote = criarPacote();
    redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio, c } = audioComDecode(pacote);
    audio.init();
    const banco = bancoDeAmostrasAtivo();
    const evento: EventoLuta = { tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5 };
    reagirDoJogo(audio, luta, []);
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => banco?.estadoDaFolha(n) === 'baixada' || banco?.estadoDaFolha(n) === 'decodificando' || banco?.estadoDaFolha(n) === 'pronta'));
    reagirDoJogo(audio, luta, []); // outro tick: decodifica o que chegou
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => banco?.estadoDaFolha(n) === 'pronta'));
    const chamadas: string[] = [];
    const punch = audio.punch.bind(audio);
    audio.punch = () => {
      chamadas.push('punch');
      punch();
    };
    reagirDoJogo(audio, luta, [evento]);
    expect(chamadas).toEqual([]); // o soco foi a amostra
    expect(c.criados.fonte).toBe(2); // soco + voz de dano
    expect(c.criados.osc).toBe(0);
  });

  it('a REVANCHE do mesmo par (o relógio da luta volta a 0) retenta a folha que falhou, no máximo 3 pedidos por folha; sem revanche, tick a tick não martela a rede', async () => {
    const pacote = criarPacote();
    const urls: string[] = [];
    let hayatoNoAr = false;
    vi.stubGlobal('fetch', async (url: string) => {
      urls.push(url);
      const caminho = url.split('?')[0] ?? '';
      if (caminho.endsWith('manifesto.json')) return resposta(JSON.stringify(pacote.manifesto));
      const arquivo = caminho.split('/').pop() ?? '';
      if (arquivo === 'lutador-hayato.mp3' && !hayatoNoAr) return resposta('', false);
      const bytes = pacote.arquivos.get(arquivo);
      return bytes ? resposta(bytes.slice(0)) : resposta('', false);
    });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio } = audioComDecode(pacote);
    audio.init();
    const banco = bancoDeAmostrasAtivo();
    const pedidosDe = (nome: string): number => urls.filter((u) => u.includes(nome)).length;
    const lutaEm = (t: number): never => ({ fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t }) as never;
    reagirDoJogo(audio, lutaEm(1), []);
    await esperar(() => banco?.estadoDaFolha('hayato') === 'falhou');
    expect(pedidosDe('lutador-hayato')).toBe(1);
    for (let t = 2; t < 200; t++) reagirDoJogo(audio, lutaEm(t), []); // a mesma luta, 200 ticks: nada de pedir de novo
    await new Promise((r) => setTimeout(r, 5));
    expect(pedidosDe('lutador-hayato')).toBe(1);
    // revanche: o mesmo par, o relógio recomeça
    hayatoNoAr = true;
    reagirDoJogo(audio, lutaEm(1), []);
    await esperar(() => banco?.estadoDaFolha('hayato') === 'baixada' || banco?.estadoDaFolha('hayato') === 'decodificando' || banco?.estadoDaFolha('hayato') === 'pronta');
    expect(pedidosDe('lutador-hayato')).toBe(2);
    reagirDoJogo(audio, lutaEm(2), []);
    await esperar(() => banco?.estadoDaFolha('hayato') === 'pronta');
    // as folhas que já estavam prontas não foram pedidas de novo
    expect(pedidosDe('lutador-caio')).toBe(1);
    expect(pedidosDe('base.mp3')).toBe(1);
    // limite: uma folha que nunca chega para de ser pedida no 3º pedido, por mais revanches que haja
    hayatoNoAr = false;
    descartarAmostras();
    urls.length = 0;
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    for (let rodada = 0; rodada < 6; rodada++) {
      reagirDoJogo(audio, lutaEm(50), []); // a luta anda...
      reagirDoJogo(audio, lutaEm(1), []); // ...e a revanche recomeça o relógio
      await new Promise((r) => setTimeout(r, 5));
    }
    expect(pedidosDe('lutador-hayato')).toBe(3);
    aviso.mockRestore();
  });

  it('ANTES de a folha chegar o jogo toca a síntese de hoje (o 1º soco da partida nunca fica mudo)', async () => {
    const pacote = criarPacote();
    redeFalsa(pacote, { semFolhas: ['base.mp3', 'lutador-hayato.mp3', 'lutador-caio.mp3'] });
    const aviso = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const { audio, c } = audioComDecode(pacote);
    audio.init();
    const evento: EventoLuta = { tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5 };
    reagirDoJogo(audio, luta, [evento]);
    expect(c.criados.osc).toBeGreaterThan(0); // o punch() de hoje + a voz formante
    await esperar(() => bancoDeAmostrasAtivo()?.estadoDaFolha('base') === 'falhou');
    aviso.mockRestore();
  });

  it('rollback por código (`chavesSonoras.amostras = false`): nem pede folha de lutador nem toca amostra, mesmo com o banco carregado', async () => {
    const pacote = criarPacote();
    const urls = redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    chavesSonoras.amostras = false;
    const { audio } = audioComDecode(pacote);
    audio.init();
    const antes = urls.length;
    reagirDoJogo(audio, luta, [{ tipo: 'swing', lutador: 0, golpe: 'punch' }]);
    await new Promise((r) => setTimeout(r, 10));
    expect(urls.length).toBe(antes);
  });

  it('`prepararLutaSonora` (para quem montar a luta antes, como o arcade com o próximo rival) é idempotente e sem banco não faz nada', async () => {
    expect(() => prepararLutaSonora(['hayato', 'caio'])).not.toThrow();
    const pacote = criarPacote();
    const urls = redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    prepararLutaSonora(['min-ji', 'camille']);
    prepararLutaSonora(['min-ji', 'camille']);
    await esperar(() => urls.filter((u) => u.includes('.mp3')).length === 3);
    await new Promise((r) => setTimeout(r, 5));
    expect(urls.filter((u) => u.includes('.mp3'))).toHaveLength(3);
  });
});

describe('o destrave do áudio (iOS) decodifica a base no 1º gesto, não no meio da 1ª luta', () => {
  it('o gesto cria o contexto (como já fazia) e, com a base baixada, dispara a decodificação; gestos seguintes só conferem', async () => {
    const pacote = criarPacote();
    redeFalsa(pacote);
    await carregarCamadasSonoras({ identidade: true, amostras: true, baseDasAmostras: BASE });
    const banco = bancoDeAmostrasAtivo();
    await esperar(() => banco?.estadoDaFolha('base') === 'baixada');
    const { audio, c } = audioComDecode(pacote);
    const ouvintes = new Map<string, () => void>();
    const alvo = {
      addEventListener: (nome: string, fn: () => void): void => void ouvintes.set(nome, fn),
      removeEventListener: (): void => undefined,
    };
    const desfaz = desbloquearAudio(alvo, audio);
    expect(audio.ctx).toBeNull();
    expect(banco?.estadoDaFolha('base')).toBe('baixada'); // sem gesto, sem contexto: não decodifica
    ouvintes.get('touchend')?.();
    expect(audio.ctx).not.toBeNull();
    expect(banco?.estadoDaFolha('base')).toBe('decodificando');
    await esperar(() => banco?.estadoDaFolha('base') === 'pronta');
    ouvintes.get('click')?.(); // contexto já running: só confere, não recria nada
    expect(c.criados.compressor).toBe(1);
    desfaz();
  });
});

describe('arquitetura: o pedaço das amostras é à parte e as regras do projeto valem', () => {
  const ler = (caminho: string): string => readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8');
  const semComentarios = (s: string): string => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1');
  it('nenhum arquivo das amostras usa Math.random, Date.now ou performance.now', () => {
    for (const f of ['src/audio/amostras.ts', 'src/audio/plano-amostras.ts', 'src/data/sons/amostras.ts', 'src/audio/identidade-sonora.ts']) {
      expect(semComentarios(ler(f)), f).not.toMatch(/Math\.random|Date\.now|performance\.now/);
    }
  });
  it('a chave é constante interna: sem opção no menu, sem URL, sem armazenamento', () => {
    for (const f of ['src/ui/cenas/options.ts', 'src/audio/chaves.ts']) {
      const t = ler(f);
      if (f.endsWith('options.ts')) expect(t).not.toContain('AMOSTRAS_REALISTAS');
      else for (const proibido of ['localStorage', 'sessionStorage', 'URLSearchParams(search).get(\'amostras']) expect(t.includes(proibido), proibido).toBe(false);
    }
    expect(AMOSTRAS_REALISTAS).toBe(true);
  });
  it('fight.ts não mudou por causa das amostras (a ligação mora em camadas.ts)', () => {
    expect(ler('src/ui/cenas/fight.ts')).not.toMatch(/amostra/i);
  });
});
