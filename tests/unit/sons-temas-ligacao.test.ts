import { readFileSync } from 'node:fs';
import { afterEach, beforeAll, describe, expect, it } from 'vitest';
import { AudioSys, FOLGA_PRIMEIRO_PASSO_TEMA } from '../../src/audio/audio-sys';
import { carregarCamadasSonoras, identidadeAtiva, reagirDoJogo, trilhaDoJogo } from '../../src/audio/camadas';
import { AMOSTRAS_REALISTAS, chavesSonoras, IDENTIDADE_SONORA, lerEscutaDaUrl, TEMAS_POR_LUTADOR, trilhaDeHoje } from '../../src/audio/chaves';
import { IDENTIDADE_SONORA as IDENTIDADE_REEXPORTADA } from '../../src/audio/identidade-sonora';
import { TEMAS_POR_LUTADOR as TEMAS_REEXPORTADO } from '../../src/audio/temas';
import { IDS_LUTADORES, type EventoLuta } from '../../src/core/contratos';
import { criarRng } from '../../src/core/rng';
import { REGRAS_PADRAO } from '../../src/meta';
import { desbloquearAudio } from '../../src/platform/audio-desbloqueio';
import { Contexto, Oscilador, comoAudioContext } from '../support/audio-offline';

/*
 * Ligação dos sons por lutador (S4) e dos temas (T3) ao jogo. Decisão do dono: as duas camadas estão SEMPRE LIGADAS (as constantes são só rollback por código,
 * sem menu e sem URL); `?escuta=1` é só o painel de escuta. As camadas pesadas entram em pedaços separados (o pacote principal não as importa estaticamente).
 * Correções do N3 só no ramo de tema; desbloqueio do áudio no iOS.
 */
const resetar = (): void => {
  chavesSonoras.identidade = IDENTIDADE_SONORA;
  chavesSonoras.temas = TEMAS_POR_LUTADOR;
  chavesSonoras.amostras = AMOSTRAS_REALISTAS;
};
afterEach(resetar);

const ler = (caminho: string): string => readFileSync(new URL(`../../${caminho}`, import.meta.url), 'utf8');

describe('as chaves (rollback por código) e o painel de escuta', () => {
  it('as duas constantes são true (sempre ligadas) e as camadas reexportam a MESMA constante', () => {
    expect(IDENTIDADE_SONORA).toBe(true);
    expect(TEMAS_POR_LUTADOR).toBe(true);
    expect(IDENTIDADE_REEXPORTADA).toBe(IDENTIDADE_SONORA);
    expect(TEMAS_REEXPORTADO).toBe(TEMAS_POR_LUTADOR);
    expect(AMOSTRAS_REALISTAS).toBe(true); // 3ª chave: as amostras reais (docs/plano-sons-realistas.md), também só rollback por código
    expect(chavesSonoras).toEqual({ identidade: true, temas: true, amostras: true });
    expect(REGRAS_PADRAO.temasMusicais).toBe(true);
  });

  it('a URL só abre o painel (`?escuta=1`, valor exato); `?sons` e `?temas` já não existem: o jogo não os lê', () => {
    expect(lerEscutaDaUrl('')).toEqual({ painel: false });
    expect(lerEscutaDaUrl('?escuta=1')).toEqual({ painel: true });
    expect(lerEscutaDaUrl('?escuta=1&seed=3')).toEqual({ painel: true });
    for (const ruim of ['?escuta=0', '?escuta=', '?escuta=true', '?sons=1', '?temas=1']) expect(lerEscutaDaUrl(ruim).painel, ruim).toBe(false);
    const main = ler('src/main.ts');
    expect(main).not.toContain("'sons'");
    expect(main).not.toContain("'temas'");
  });

  it('nada do módulo das chaves toca em armazenamento, save ou cookie', () => {
    const fonte = ler('src/audio/chaves.ts');
    for (const proibido of ['localStorage', 'sessionStorage', 'document.cookie', 'persist.', 'salvar(']) expect(fonte.includes(proibido), proibido).toBe(false);
  });

  it('sem opção no menu: a tela de Opções não fala de sons por lutador nem de temas', () => {
    const opcoes = ler('src/ui/cenas/options.ts');
    for (const proibido of ['IDENTIDADE_SONORA', 'TEMAS_POR_LUTADOR', 'chavesSonoras', 'temasMusicais']) expect(opcoes.includes(proibido), proibido).toBe(false);
  });
});

describe('o pacote principal não carrega as camadas pesadas de forma estática (import tardio, em pedaços à parte)', () => {
  // só imports de VALOR contam: `import type` some na compilação e não carrega nada
  const estaticos = (fonte: string): string[] => [...fonte.matchAll(/^\s*(?:import|export)\s+(?!type\s)[^;]*?from\s+'([^']+)'/gm)].map((m) => m[1] as string);
  const PESADOS = [/identidade-sonora/, /\/amostras$/, /plano-amostras/, /\/temas$/, /\/partitura$/, /data\/sons/, /data\/musica/, /sintese-voz/, /orcamento-sonoro/, /\/escuta$/];
  it.each(['src/main.ts', 'src/ui/cenas/fight.ts', 'src/audio/audio-sys.ts', 'src/audio/camadas.ts', 'src/audio/chaves.ts', 'src/audio/receitas.ts', 'src/audio/eventos.ts'])('%s não importa os pesados de forma estática', (arq) => {
    const importados = estaticos(ler(arq));
    for (const re of PESADOS) for (const i of importados) expect(re.test(i), `${arq} importa ${i}`).toBe(false);
  });
  it('main.ts e camadas.ts os carregam por import() já no boot (e o desbloqueio do áudio está ligado)', () => {
    const main = ler('src/main.ts');
    expect(main).toContain("import('./ui/escuta')");
    expect(main).toMatch(/carregarCamadasSonoras\(\{/);
    expect(main).toMatch(/desbloquearAudio\(window, audio\)/);
    expect(main).toMatch(/Promise\.all\(\[carregarFontes\(\), camadas\]\)/);
    const camadas = ler('src/audio/camadas.ts');
    expect(camadas).toContain("import('./identidade-sonora')");
    expect(camadas).toContain("import('./temas')");
    expect(camadas).toContain("import('./amostras')");
    expect(main).toMatch(/amostras: import\.meta\.env\.DEV \|\| chavesSonoras\.amostras/);
  });
});

describe('rollback por código: com a chave desligada (ou antes de a camada carregar) o jogo é o de antes', () => {
  const luta = { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 100 } as never;
  const ko: EventoLuta = { tipo: 'ko', defensor: 1, pitch: 1 };
  const gravador = (): { audio: Record<string, unknown>; nomes: string[] } => {
    const nomes: string[] = [];
    const audio: Record<string, unknown> = { ctx: null, sementeVariacao: 23 };
    for (const m of ['ko', 'hurt', 'special', 'victory', 'musicaDaFase']) audio[m] = () => void nomes.push(m);
    return { audio, nomes };
  };

  it('camada ainda não carregada (a chave, sozinha, não basta): reagirDoJogo chama exatamente os métodos de antes e a trilha é a `fight`/`chefe`', () => {
    // (as camadas só carregam nos blocos abaixo; este bloco roda antes, no mesmo arquivo)
    expect(identidadeAtiva()).toBe(false);
    const g = gravador();
    reagirDoJogo(g.audio, luta, [ko, { tipo: 'special', lutador: 0, pitch: 1.1 }]);
    expect(g.nomes).toEqual(['ko', 'special']);
    for (const c2 of IDS_LUTADORES) {
      expect(trilhaDoJogo({ c2 }, REGRAS_PADRAO), c2).toBe('fight');
      expect(trilhaDoJogo({ c2, chefe: true }, REGRAS_PADRAO, 'chefe'), c2).toBe('chefe');
    }
    expect(trilhaDeHoje({ chefe: false }, 'chefe')).toBe('fight');
  });
});

describe('camadas carregadas (o jogo de produção: tudo ligado por padrão)', () => {
  beforeAll(async () => {
    expect(await carregarCamadasSonoras({ identidade: IDENTIDADE_SONORA, temas: TEMAS_POR_LUTADOR })).toBe(true);
  });

  it('o rollback por código: chave desligada com a camada carregada volta ao som e à música de antes', () => {
    chavesSonoras.identidade = false;
    chavesSonoras.temas = false;
    expect(identidadeAtiva()).toBe(false);
    expect(trilhaDoJogo({ c2: 'caio' }, REGRAS_PADRAO)).toBe('fight');
    expect(trilhaDoJogo({ c2: 'zenon', chefe: true }, REGRAS_PADRAO, 'chefe')).toBe('chefe');
  });

  it('por padrão, sem tocar em chave nenhuma: identidade ativa', () => {
    expect(identidadeAtiva()).toBe(true);
  });

  it('o tema do ADVERSÁRIO (c2) em todos os modos; o ZENON toca a valsa; `?expansao=4` (sem temas) volta à música de antes; a fase 2 do chefão segue por musicaDaFase', () => {
    const regras = REGRAS_PADRAO;
    for (const c2 of IDS_LUTADORES) {
      const esperado = c2 === 'zenon' ? 'chefe' : `tema:${c2}`;
      expect(trilhaDoJogo({ c2 }, regras), c2).toBe(esperado);
      expect(trilhaDoJogo({ c2, chefe: true }, regras, c2 === 'zenon' ? 'chefe' : undefined), `${c2} chefão`).toBe(esperado);
    }
    expect(trilhaDoJogo({ c2: 'caio' }, { temasMusicais: false })).toBe('fight');
    expect(trilhaDoJogo({ c2: 'zenon', chefe: true }, { temasMusicais: false }, 'chefe')).toBe('chefe');
  });

  it('identidade ligada: o KO do lutador troca o `ko()` genérico pela voz dele (o método de hoje NÃO é chamado) e o resto segue', () => {
    chavesSonoras.identidade = true;
    expect(identidadeAtiva()).toBe(true);
    const c = new Contexto(22050);
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
    audio.init();
    const chamados: string[] = [];
    for (const m of ['ko', 'hurt', 'victory'] as const) {
      const orig = audio[m].bind(audio) as (...a: number[]) => void;
      (audio as unknown as Record<string, unknown>)[m] = (...a: number[]) => {
        chamados.push(m);
        orig(...a);
      };
    }
    const luta = { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 100 } as never;
    reagirDoJogo(audio, luta, [{ tipo: 'ko', defensor: 1, pitch: 1 }]);
    expect(chamados).not.toContain('ko');
    expect(audio.fontesAtivas()).toBeGreaterThan(0);
    // com a chave desligada o mesmo evento chama o `ko` de hoje
    chavesSonoras.identidade = false;
    reagirDoJogo(audio, luta, [{ tipo: 'ko', defensor: 1, pitch: 1 }]);
    expect(chamados).toContain('ko');
  });

  it('kiai de vitória só no fim da luta: o fim de um round que não encerra a luta não grita', () => {
    chavesSonoras.identidade = true;
    const c = new Contexto(22050);
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), limitador: true, sementeVariacao: 23 });
    audio.init();
    const agendados: number[] = [];
    const luta = { fighters: [{ id: 'hayato', ficha: null }, { id: 'caio', ficha: null }], t: 100 } as never;
    const vitoria = (fimDaLuta: boolean): EventoLuta => ({ tipo: 'round', fase: 'end', round: 1, vencedor: 0, fimDaLuta });
    // o grito de vitória chega com 950 ms de atraso (agendado); o jingle `victory` toca em todo fim de round
    const antes = (globalThis as { setTimeout: typeof setTimeout }).setTimeout;
    (globalThis as { setTimeout: unknown }).setTimeout = ((_fn: () => void, ms: number) => {
      agendados.push(ms);
      return antes(() => undefined, 0);
    }) as typeof setTimeout;
    try {
      reagirDoJogo(audio, luta, [vitoria(false)]);
      expect(agendados.filter((ms) => ms >= 900)).toEqual([]);
      reagirDoJogo(audio, luta, [vitoria(true)]);
      expect(agendados.filter((ms) => ms >= 900)).toHaveLength(1);
    } finally {
      (globalThis as { setTimeout: unknown }).setTimeout = antes;
    }
  });
});

describe('correções do N3, só no ramo de tema', () => {
  const montar = (): { c: Contexto; audio: AudioSys; passos: { step: number; t: number }[] } => {
    const c = new Contexto(22050);
    const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5), setInterval: () => 1, clearInterval: () => undefined });
    audio.init();
    const passos: { step: number; t: number }[] = [];
    const orig = audio.playTema.bind(audio);
    audio.playTema = (tema, step, t) => {
      passos.push({ step, t });
      orig(tema, step, t);
    };
    return { c, audio, passos };
  };

  beforeAll(async () => {
    await carregarCamadasSonoras({ temas: true });
  });

  it('o 1º passo do tema nasce com folga maior (0,12 s) e já é agendado no startMusic, sem esperar o 1º tique do intervalo', () => {
    const m = montar();
    m.c.currentTime = 3;
    m.audio.startMusic('tema:hayato');
    expect(m.passos[0]).toMatchObject({ step: 0 });
    expect((m.passos[0] as { t: number }).t).toBeCloseTo(3 + FOLGA_PRIMEIRO_PASSO_TEMA, 9);
    expect(FOLGA_PRIMEIRO_PASSO_TEMA).toBeGreaterThan(0.05);
  });

  it('as trilhas FIXAS não mudam: `fight` e `menu` seguem com nextTime = agora + 0,05 e sem passo agendado no startMusic (lock-step)', () => {
    for (const k of ['fight', 'menu', 'chefe'] as const) {
      const m = montar();
      m.c.currentTime = 3;
      m.audio.startMusic(k);
      expect(m.audio.nextTime, k).toBeCloseTo(3.05, 9);
      expect(m.audio.step, k).toBe(0);
      expect(m.passos, k).toHaveLength(0);
    }
  });

  it('a voz formante da música é agendada no instante ABSOLUTO do passo, e não relê o relógio (o `currentTime` andou 80 ms entre agendar e tocar)', () => {
    const m = montar();
    m.c.currentTime = 1;
    m.audio.vozFormante({ onda: 'sawtooth', f: [100, 100, 100], t: 1, vol: 0.1, formantes: [500, 1000, 2500], q: 5, ganhoF3: 0.3, inicioAbs: 2.5, registrar: false });
    const oscs = m.c.nos.filter((n): n is Oscilador => n instanceof Oscilador && n.inicio >= 0);
    expect(oscs.length).toBeGreaterThan(0);
    for (const o of oscs) expect(o.inicio).toBeCloseTo(2.5, 9);
    // o caminho antigo (`when` relativo) continua igual para os efeitos
    const n = montar();
    n.c.currentTime = 1;
    n.audio.vozFormante({ onda: 'sawtooth', f: [100, 100, 100], t: 1, vol: 0.1, formantes: [500, 1000, 2500], q: 5, ganhoF3: 0.3, when: 0.5 });
    for (const o of n.c.nos.filter((x): x is Oscilador => x instanceof Oscilador && x.inicio >= 0)) expect(o.inicio).toBeCloseTo(1.5, 9);
  });

  it('o BAATAR (khöömei) usa a voz na música: a chamada chega com o instante absoluto do passo e sem `when`', () => {
    const m = montar();
    const chamadas: Record<string, unknown>[] = [];
    const orig = m.audio.vozFormante.bind(m.audio);
    m.audio.vozFormante = (o) => {
      chamadas.push(o as unknown as Record<string, unknown>);
      orig(o);
    };
    m.audio.startMusic('tema:baatar');
    for (let t = 0; t < 40; t += 0.025) {
      m.c.currentTime = t;
      m.audio.scheduler();
    }
    expect(chamadas.length).toBeGreaterThan(0);
    for (const o of chamadas) {
      expect(typeof o['inicioAbs']).toBe('number');
      expect(o).not.toHaveProperty('when');
      expect(o['registrar']).toBe(false);
    }
  });
});

describe('desbloqueio do áudio no iOS/WebKit (o `touchstart` do canvas não destrava; `touchend`, `click` e tecla destravam)', () => {
  const montarAlvo = () => {
    const ouvintes = new Map<string, EventListener[]>();
    const alvo = {
      addEventListener: (tipo: string, fn: EventListener) => void (ouvintes.get(tipo) ?? ouvintes.set(tipo, []).get(tipo))?.push(fn),
      removeEventListener: (tipo: string, fn: EventListener) => void ouvintes.set(tipo, (ouvintes.get(tipo) ?? []).filter((f) => f !== fn)),
    };
    const disparar = (tipo: string): void => (ouvintes.get(tipo) ?? []).forEach((f) => f({} as Event));
    return { alvo, disparar, ouvintes };
  };
  const audioFalso = () => {
    const a = {
      ctx: null as { state: string } | null,
      chamadas: [] as string[],
      init() {
        a.chamadas.push('init');
        a.ctx ??= { state: 'suspended' };
      },
      resume() {
        a.chamadas.push('resume');
        if (a.ctx) a.ctx.state = 'running';
      },
    };
    return a;
  };

  it('escuta os gestos que o WebKit reconhece; o `touchstart` não entra', () => {
    const { alvo, ouvintes } = montarAlvo();
    desbloquearAudio(alvo, audioFalso());
    for (const g of ['touchend', 'pointerup', 'mouseup', 'click', 'keydown']) expect(ouvintes.get(g), g).toHaveLength(1);
    expect(ouvintes.has('touchstart')).toBe(false);
  });

  it('o 1º gesto cria o contexto e o põe a rodar; depois, com o contexto `running`, os gestos não fazem nada', () => {
    const { alvo, disparar } = montarAlvo();
    const a = audioFalso();
    desbloquearAudio(alvo, a);
    disparar('touchend');
    expect(a.chamadas).toEqual(['init', 'resume']);
    expect(a.ctx?.state).toBe('running');
    disparar('click');
    disparar('keydown');
    expect(a.chamadas).toEqual(['init', 'resume']);
  });

  it('o estado `interrupted` do iOS (ligação, volta do segundo plano) é religado no próximo gesto', () => {
    const { alvo, disparar } = montarAlvo();
    const a = audioFalso();
    desbloquearAudio(alvo, a);
    disparar('touchend');
    (a.ctx as { state: string }).state = 'interrupted';
    disparar('touchend');
    expect(a.chamadas).toEqual(['init', 'resume', 'init', 'resume']);
    expect(a.ctx?.state).toBe('running');
  });

  it('o AudioSys real religa `interrupted` e `suspended` (e não mexe em `running`)', () => {
    for (const [estado, chama] of [['suspended', true], ['interrupted', true], ['running', false]] as const) {
      const c = new Contexto(22050);
      const audio = new AudioSys({ criarContexto: () => comoAudioContext(c), rng: criarRng(5) });
      audio.init();
      let resumes = 0;
      const ctx = audio.ctx as unknown as { state: string; resume: () => Promise<void> };
      ctx.state = estado;
      ctx.resume = () => {
        resumes++;
        return Promise.resolve();
      };
      audio.resume();
      expect(resumes > 0, estado).toBe(chama);
    }
  });

  it('o desfazer remove os ouvintes', () => {
    const { alvo, ouvintes } = montarAlvo();
    const desfazer = desbloquearAudio(alvo, audioFalso());
    desfazer();
    for (const g of ['touchend', 'pointerup', 'mouseup', 'click', 'keydown']) expect(ouvintes.get(g), g).toHaveLength(0);
  });
});
