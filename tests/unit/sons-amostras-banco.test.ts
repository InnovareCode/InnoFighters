import { describe, expect, it } from 'vitest';
import { acharAtaque, BancoDeAmostras, decodificarPadrao, MAX_FOLHAS_DE_LUTADOR, carregarBanco } from '../../src/audio/amostras';
import { cortesDe, type PedidoAmostra } from '../../src/data/sons/amostras';
import { Biquad, Contexto, FonteBuffer, Gain, comoAudioContext } from '../support/audio-offline';
import { criarPacote, TAXA_PACOTE, type OpcoesDoPacote } from '../support/pacote-teste';

/*
 * O banco de amostras reais (src/audio/amostras.ts) com o pacote de teste: carregamento lazy, decodificação só com o contexto, ataque real, escolha determinística,
 * reprodução direta na folha (uma fonte) e as falhas (a síntese de hoje cobre). Sem navegador: o `buscar` e o `decodificar` são injetados.
 */

const aviso = (): void => undefined;
const pedido = (ids: string[], o: Partial<PedidoAmostra> = {}): PedidoAmostra => ({ ids, u: 0, taxa: 1, ganho: 1, ...o });
const esperar = async (cond: () => boolean): Promise<void> => {
  for (let i = 0; i < 500 && !cond(); i++) await new Promise((r) => setTimeout(r, 0));
  expect(cond()).toBe(true);
};

function montar(o: OpcoesDoPacote = {}, taxaCtx = TAXA_PACOTE) {
  const c = new Contexto(taxaCtx);
  const pacote = criarPacote(o);
  const banco = new BancoDeAmostras(pacote.manifesto, { baseUrl: '/assets/sons/', sufixo: '?v=t', buscar: pacote.buscar, decodificar: pacote.decodificar, aviso });
  return { c, ctx: comoAudioContext(c), pacote, banco };
}

describe('ataque real: varrer o buffer (o MP3 tem atraso de codificação)', () => {
  const taxa = 44100;
  const folha = (atrasoMs: number): Float32Array => {
    const f = new Float32Array(taxa);
    const ini = Math.round((0.1 + atrasoMs / 1000) * taxa);
    for (let i = 0; i < 2000; i++) f[ini + i] = 0.5 * Math.sin(i / 7);
    return f;
  };
  it('acha o instante do ataque com o atraso de 0, 25 e 40 ms (cada navegador tem o seu)', () => {
    for (const atraso of [0, 25, 40]) expect(acharAtaque(folha(atraso), taxa, 0.1, 0.05), `${atraso} ms`).toBeCloseTo(0.1 + atraso / 1000, 3);
  });
  it('varre desde 40 ms ANTES do início do manifesto (conteúdo que chegou adiantado) e ignora o que está abaixo de -45 dBFS', () => {
    const f = new Float32Array(taxa);
    f[Math.round(0.07 * taxa)] = 0.004; // -48 dBFS: ruído de fundo, não é ataque
    f[Math.round(0.075 * taxa)] = 0.3; // 25 ms antes do início 0,1: dentro da janela de recuo
    expect(acharAtaque(f, taxa, 0.1, 0.05)).toBeCloseTo(0.075, 3);
    const g = new Float32Array(taxa);
    g[Math.round(0.05 * taxa)] = 0.3; // 50 ms antes: fora da janela
    expect(acharAtaque(g, taxa, 0.1, 0.05)).toBe(-1);
  });
  it('com o atraso do MP3 a janela já começa dentro da CAUDA do corte vizinho: o ataque é o 1º som depois do vale de 10 ms, não a cauda', () => {
    const f = new Float32Array(taxa);
    // corte A termina 25 ms depois do nominal (atraso), com a cauda a -40 dBFS; 40 ms de silêncio; o corte B começa em 0,1 + 0,025
    const fimA = Math.round((0.1 - 0.04 + 0.025) * taxa);
    for (let i = fimA - 1500; i < fimA; i++) f[i] = 0.01 * Math.sin(i / 5);
    const iniB = Math.round((0.1 + 0.025) * taxa);
    for (let i = 0; i < 800; i++) f[iniB + i] = 0.5 * Math.sin(i / 7);
    expect(acharAtaque(f, taxa, 0.1, 0.05)).toBeCloseTo(0.125, 3);
  });
  it('trecho todo em silêncio = -1 (o corte vira "sem amostra")', () => {
    expect(acharAtaque(new Float32Array(taxa), taxa, 0.1, 0.1)).toBe(-1);
  });
});

describe('carregamento: lazy, decodificação só depois que o contexto existe', () => {
  it('baixar a folha NÃO decodifica; sem contexto nada fica pronto; com o contexto, decodifica e `escolher` encontra', async () => {
    const { banco, pacote, ctx } = montar();
    expect(banco.estadoDaFolha('base')).toBe('pendente');
    await banco.baixarFolha('base');
    expect(banco.estadoDaFolha('base')).toBe('baixada');
    expect(pacote.pedidos).toEqual(['/assets/sons/base.mp3?v=t']);
    expect(banco.pronta('imp.soco.leve')).toBe(false);
    expect(banco.escolher(pedido(['imp.soco.leve']))).toBeNull(); // baixada, mas sem buffer decodificado: o jogo toca a síntese
    banco.sincronizar(ctx);
    expect(banco.estadoDaFolha('base')).toBe('decodificando');
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    expect(banco.escolher(pedido(['imp.soco.leve']))).not.toBeNull();
  });

  it('o contexto que nasce DEPOIS do download decodifica no destrave (sincronizar), e o que chega depois do contexto decodifica sozinho', async () => {
    const { banco, ctx } = montar();
    banco.sincronizar(ctx); // contexto antes dos bytes
    banco.prepararLutadores(['hayato', 'caio']);
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => banco.estadoDaFolha(n) === 'pronta'));
    expect(banco.resumo()).toContain('hayato: pronta');
  });

  it('`folhasEmEspera` (a escuta só faz A/B quando a base e os lutadores acabaram): lista o que falta, esvazia ao ficar pronta, e folha que FALHOU não segura', async () => {
    const { banco, ctx } = montar();
    expect(banco.folhasEmEspera(['hayato', 'caio'])).toEqual(['base', 'hayato', 'caio']); // nada pedido ainda
    banco.prepararLutadores(['hayato', 'caio']);
    expect(banco.folhasEmEspera(['hayato', 'caio'])).toEqual(['base', 'hayato', 'caio']); // baixando
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => banco.estadoDaFolha(n) === 'baixada'));
    expect(banco.folhasEmEspera(['hayato', 'caio'])).toEqual(['base', 'hayato', 'caio']); // baixada, ainda sem contexto: não está pronta
    banco.sincronizar(ctx);
    await esperar(() => banco.folhasEmEspera(['hayato', 'caio']).length === 0);
    expect(banco.resumo()).toContain('base: pronta');
    expect(banco.folhasEmEspera(['hayato', 'zenon'])).toEqual(['zenon']); // outro lutador: só ele falta
    expect(banco.folhasEmEspera()).toEqual([]); // só a base
    const pacote = criarPacote();
    const falho = new BancoDeAmostras(pacote.manifesto, {
      baseUrl: '/x/',
      aviso,
      buscar: async (url) => {
        if (url.includes('caio')) throw new TypeError('rede');
        return pacote.buscar(url);
      },
    });
    falho.prepararLutadores(['caio']);
    await esperar(() => falho.estadoDaFolha('caio') === 'falhou');
    expect(falho.folhasEmEspera(['caio'])).not.toContain('caio');
  });

  it('só baixa o que a luta pede: a base e os DOIS lutadores; as outras 8 folhas seguem pendentes', async () => {
    const { banco, pacote } = montar();
    banco.prepararLutadores(['hayato', 'caio']);
    await esperar(() => pacote.pedidos.length === 3);
    expect(pacote.pedidos.map((u) => u.split('/').pop()).sort()).toEqual(['base.mp3?v=t', 'lutador-caio.mp3?v=t', 'lutador-hayato.mp3?v=t']);
    expect(banco.estadoDaFolha('zenon')).toBe('pendente');
    banco.prepararLutadores(['hayato', 'caio']); // idempotente
    await new Promise((r) => setTimeout(r, 5));
    expect(pacote.pedidos).toHaveLength(3);
  });

  it('decodifica UMA folha por vez (fila): nunca duas em andamento', async () => {
    const { banco, ctx, pacote } = montar();
    let emAndamento = 0;
    let maximo = 0;
    const decod = pacote.decodificar;
    const b2 = new BancoDeAmostras(pacote.manifesto, {
      baseUrl: '/x/',
      buscar: pacote.buscar,
      aviso,
      decodificar: async (cx, bytes) => {
        emAndamento++;
        maximo = Math.max(maximo, emAndamento);
        await new Promise((r) => setTimeout(r, 2));
        const r = await decod(cx, bytes);
        emAndamento--;
        return r;
      },
    });
    b2.sincronizar(ctx);
    b2.prepararLutadores(['hayato', 'caio']);
    await esperar(() => ['base', 'hayato', 'caio'].every((n) => b2.estadoDaFolha(n) === 'pronta'));
    expect(maximo).toBe(1);
    void banco;
  });

  it('usa o ataque real: com 25 ms de atraso de MP3 o deslocamento acompanha o conteúdo, e o recorte continua a ter a duração do corte', async () => {
    for (const atraso of [0, 25]) {
      const { banco, ctx, pacote } = montar({ atrasoMs: atraso });
      banco.sincronizar(ctx);
      banco.prepararLutadores([]);
      await esperar(() => banco.estadoDaFolha('base') === 'pronta');
      const corte = cortesDe(pacote.manifesto.sons['defesa'])[0];
      if (!corte) throw new Error('sem corte');
      const e = banco.escolher(pedido(['defesa']));
      expect(e, String(atraso)).not.toBeNull();
      // o conteúdo está em `inicio + atraso`; começa 2 ms antes do ataque (pré-roll)
      expect(e?.offset).toBeCloseTo(corte.inicio + atraso / 1000 - 0.002, 2);
      expect(e?.duracaoNoBuffer).toBeCloseTo(corte.dur + 0.002, 2);
    }
  });
});

describe('escolha: determinística, em cadeia, por variante', () => {
  it('mesma entrada, mesma escolha; `u` percorre as variantes (imp.soco.leve tem 2 no pacote de teste)', async () => {
    const { banco, ctx } = montar();
    banco.sincronizar(ctx);
    banco.prepararLutadores([]);
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    const a = banco.escolher(pedido(['imp.soco.leve'], { u: 0.1 }));
    const b = banco.escolher(pedido(['imp.soco.leve'], { u: 0.1 }));
    const c = banco.escolher(pedido(['imp.soco.leve'], { u: 0.9 }));
    expect(a).toEqual(b);
    expect(a?.offset).not.toBe(c?.offset); // outra variante
    expect(banco.escolher(pedido(['imp.soco.leve'], { u: 0.999999 }))?.offset).toBe(c?.offset);
  });

  it('cadeia de preferência: o 1º id com amostra pronta vence; sem nenhum, `senao` (com a transformação própria); sem tudo, null', async () => {
    const { banco, ctx } = montar({ sem: ['voz.hayato.guarda'] });
    banco.sincronizar(ctx);
    banco.prepararLutadores(['hayato']);
    await esperar(() => banco.estadoDaFolha('hayato') === 'pronta');
    // guarda não existe no pacote: cai no dano pesado
    expect(banco.escolher(pedido(['voz.hayato.guarda', 'voz.hayato.pesado']))?.id).toBe('voz.hayato.pesado');
    expect(banco.escolher(pedido(['voz.hayato.guarda', 'voz.hayato.pesado']))?.id).not.toBe('voz.hayato.guarda');
    const reserva = banco.escolher(pedido(['nao.existe'], { senao: pedido(['voz.hayato.kiai'], { taxa: 1.06 }) }));
    expect(reserva?.id).toBe('voz.hayato.kiai');
    expect(reserva?.taxa).toBeCloseTo(1.06, 5);
    expect(banco.escolher(pedido(['nao.existe']))).toBeNull();
    // o lutador cuja folha NÃO foi pedida não tem amostra pronta
    expect(banco.escolher(pedido(['voz.zenon.kiai']))).toBeNull();
  });

  it('`leve2` e `pesado2` entram como variantes de `leve` e `pesado`', async () => {
    const { banco, ctx } = montar();
    banco.sincronizar(ctx);
    banco.prepararLutadores(['hayato']);
    await esperar(() => banco.estadoDaFolha('hayato') === 'pronta');
    const a = banco.escolher(pedido(['voz.hayato.leve'], { u: 0 }));
    const b = banco.escolher(pedido(['voz.hayato.leve'], { u: 0.99 }));
    expect(a?.id).toBe('voz.hayato.leve');
    expect(a?.offset).not.toBe(b?.offset);
  });

  it('o A/B da escuta (`ligado = false`) cala o banco inteiro; a taxa do corte e o do toque se multiplicam; o ganho junta manifesto, toque e volume', async () => {
    const { banco, ctx } = montar({ ganhoDb: -6 });
    banco.sincronizar(ctx);
    banco.prepararLutadores([]);
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    banco.volume = 0.5;
    const e = banco.escolher(pedido(['defesa'], { taxa: 1.03, ganho: 0.9 }));
    expect(e?.taxa).toBeCloseTo(1.03, 6);
    expect(e?.ganho).toBeCloseTo(Math.pow(10, -6 / 20) * 0.9 * 0.5, 6);
    banco.ligado = false;
    expect(banco.escolher(pedido(['defesa']))).toBeNull();
  });

  it('as metades do especial: `inicio` e `fim` somam o corte inteiro e não se sobrepõem', async () => {
    const { banco, ctx } = montar();
    banco.sincronizar(ctx);
    banco.prepararLutadores(['hayato']);
    await esperar(() => banco.estadoDaFolha('hayato') === 'pronta');
    const t = banco.escolher(pedido(['esp.e1.raio']));
    const a = banco.escolher(pedido(['esp.e1.raio'], { parte: 'inicio' }));
    const b = banco.escolher(pedido(['esp.e1.raio'], { parte: 'fim' }));
    if (!t || !a || !b) throw new Error('sem escolha');
    expect(a.duracaoNoBuffer).toBeCloseTo(t.duracaoNoBuffer / 2, 9);
    expect(a.offset).toBeCloseTo(t.offset, 9);
    expect(b.offset).toBeCloseTo(t.offset + t.duracaoNoBuffer / 2, 9);
  });
});

describe('reprodução: start(quando, deslocamento, duração) direto na folha, uma fonte por amostra', () => {
  it('uma fonte de buffer + um ganho (+ um filtro só se o pedido traz), com taxa, recorte e saída suave; devolve o instante do fim', async () => {
    const { banco, ctx, c } = montar();
    banco.sincronizar(ctx);
    banco.prepararLutadores([]);
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    const dest = c.createGain();
    const antes = { ...c.criados };
    c.currentTime = 2;
    const e = banco.escolher(pedido(['defesa'], { taxa: 1.1 }));
    if (!e) throw new Error('sem escolha');
    const fim = banco.tocar(ctx, e, dest as unknown as AudioNode);
    expect(c.criados.fonte - antes.fonte).toBe(1);
    expect(c.criados.ganho - antes.ganho).toBe(1);
    expect(c.criados.biquad - antes.biquad).toBe(0);
    expect(fim).toBeCloseTo(2 + e.duracaoNoBuffer / 1.1, 9);
    const fonte = c.nos.filter((n): n is FonteBuffer => n instanceof FonteBuffer).at(-1);
    expect(fonte?.playbackRate.value).toBeCloseTo(1.1, 9);
    expect(fonte?.inicio).toBe(2);
    // com filtro: +1 biquad
    const comFiltro = banco.escolher(pedido(['defesa'], { filtro: { tipo: 'lowpass', f: 1800 } }));
    if (!comFiltro) throw new Error('sem escolha');
    banco.tocar(ctx, comFiltro, dest as unknown as AudioNode);
    expect(c.nos.filter((n) => n instanceof Biquad)).toHaveLength(1);
    expect(c.nos.some((n) => n instanceof Gain)).toBe(true);
  });

  it('o som que sai é o do corte (energia dentro da janela), na taxa pedida, e acaba no fim (sem sobra depois da saída suave)', async () => {
    const { banco, ctx, c } = montar();
    banco.sincronizar(ctx);
    banco.prepararLutadores([]);
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    const dest = c.createGain();
    dest.connect(c.destination);
    c.currentTime = 0;
    const e = banco.escolher(pedido(['defesa']));
    if (!e) throw new Error('sem escolha');
    banco.tocar(ctx, e, dest as unknown as AudioNode);
    const saida = c.renderizar(e.duracao + 0.1);
    const n = Math.round(e.duracao * TAXA_PACOTE);
    let dentro = 0;
    let fora = 0;
    for (let i = 0; i < saida.length; i++) (i < n ? (dentro += (saida[i] as number) ** 2) : (fora += (saida[i] as number) ** 2));
    expect(dentro).toBeGreaterThan(0.01);
    expect(fora).toBeLessThan(dentro * 1e-6);
  });

  it('sem destino (sem barramento) não cria nada e devolve o fim', async () => {
    const { banco, ctx, c } = montar();
    banco.sincronizar(ctx);
    banco.prepararLutadores([]);
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    const antes = c.criados.fonte;
    const e = banco.escolher(pedido(['defesa']));
    if (!e) throw new Error('sem escolha');
    expect(banco.tocar(ctx, e, null)).toBeGreaterThan(0);
    expect(c.criados.fonte).toBe(antes);
  });
});

describe('falhas: a síntese de hoje cobre, nada derruba o jogo', () => {
  it('folha que não baixa fica `falhou`, não lança, avisa, e tenta de novo no PRÓXIMO pedido (o confronto seguinte), no máximo 3 vezes no total, sem relógio', async () => {
    const pacote = criarPacote();
    let chamadas = 0;
    const avisos: string[] = [];
    const banco = new BancoDeAmostras(pacote.manifesto, {
      baseUrl: '/x/',
      aviso: (m) => void avisos.push(m),
      buscar: async () => {
        chamadas++;
        throw new TypeError('rede');
      },
    });
    for (let i = 0; i < 6; i++) await banco.baixarFolha('base');
    expect(banco.estadoDaFolha('base')).toBe('falhou');
    expect(chamadas).toBe(3); // três tentativas e pára
    expect(avisos).toHaveLength(3);
    expect(banco.escolher(pedido(['imp.soco.leve']))).toBeNull();
  });

  it('decodificação que falha (arquivo corrompido, formato que o navegador não lê) deixa só aquela folha na síntese', async () => {
    const pacote = criarPacote();
    const banco = new BancoDeAmostras(pacote.manifesto, {
      baseUrl: '/x/',
      buscar: pacote.buscar,
      aviso,
      decodificar: async (cx, bytes) => {
        if (bytes.byteLength > 0 && !(cx as unknown as { __ruim?: boolean }).__ruim) return pacote.decodificar(cx, bytes);
        throw new Error('EncodingError');
      },
    });
    const c = new Contexto(TAXA_PACOTE);
    (c as unknown as { __ruim: boolean }).__ruim = true;
    banco.sincronizar(comoAudioContext(c));
    banco.prepararLutadores(['hayato']);
    await esperar(() => banco.estadoDaFolha('base') === 'falhou' && banco.estadoDaFolha('hayato') === 'falhou');
    expect(banco.escolher(pedido(['imp.soco.leve']))).toBeNull();
    expect(banco.escolher(pedido(['voz.hayato.kiai']))).toBeNull();
  });

  it('corte todo em silêncio na folha (arquivo errado) é tratado como sem amostra, sem derrubar os outros cortes', async () => {
    const pacote = criarPacote();
    const banco = new BancoDeAmostras(pacote.manifesto, {
      baseUrl: '/x/',
      buscar: pacote.buscar,
      aviso,
      decodificar: async (cx, bytes) => {
        const cru = new Float32Array(bytes.slice(0));
        const corte = cortesDe(pacote.manifesto.sons['defesa'])[0];
        if (corte) cru.fill(0, Math.floor(corte.inicio * TAXA_PACOTE), Math.ceil((corte.inicio + corte.dur) * TAXA_PACOTE));
        return pacote.decodificar(cx, cru.buffer as ArrayBuffer);
      },
    });
    const c = new Contexto(TAXA_PACOTE);
    banco.sincronizar(comoAudioContext(c));
    banco.prepararLutadores([]);
    await esperar(() => banco.estadoDaFolha('base') === 'pronta');
    expect(banco.pronta('defesa')).toBe(false);
    expect(banco.pronta('arremesso')).toBe(true);
  });

  it('`decodificarPadrao` aceita o WebKit antigo (só callback, devolve undefined) e o moderno (promessa), e rejeita pelo callback de erro', async () => {
    const buf = { duration: 1 } as AudioBuffer;
    const antigo = { decodeAudioData: (_b: ArrayBuffer, ok: (x: AudioBuffer) => void) => void ok(buf) } as unknown as BaseAudioContext;
    const moderno = { decodeAudioData: () => Promise.resolve(buf) } as unknown as BaseAudioContext;
    const ruim = { decodeAudioData: (_b: ArrayBuffer, _ok: unknown, erro: (e: unknown) => void) => void erro(new Error('x')) } as unknown as BaseAudioContext;
    expect(await decodificarPadrao(antigo, new ArrayBuffer(1))).toBe(buf);
    expect(await decodificarPadrao(moderno, new ArrayBuffer(1))).toBe(buf);
    await expect(decodificarPadrao(ruim, new ArrayBuffer(1))).rejects.toThrow('x');
  });

  it(`guarda no máximo ${MAX_FOLHAS_DE_LUTADOR} folhas de lutador: a mais antiga sai, as da luta atual ficam, a base nunca sai`, async () => {
    const { banco, ctx } = montar();
    banco.sincronizar(ctx);
    const prontas = async (nomes: string[]): Promise<void> => esperar(() => nomes.every((n) => banco.estadoDaFolha(n) === 'pronta'));
    banco.prepararLutadores(['hayato', 'caio']);
    await prontas(['base', 'hayato', 'caio']);
    banco.prepararLutadores(['wei-long', 'min-ji']);
    await prontas(['wei-long', 'min-ji']);
    banco.prepararLutadores(['aminu', 'baatar']); // passa de 4: sai a mais antiga (hayato) e depois o caio
    await prontas(['aminu', 'baatar']);
    const deLutador = banco.nomesDeFolha().filter((n) => n !== 'base' && banco.estadoDaFolha(n) === 'pronta');
    expect(deLutador.length).toBeLessThanOrEqual(MAX_FOLHAS_DE_LUTADOR);
    expect(banco.estadoDaFolha('aminu')).toBe('pronta');
    expect(banco.estadoDaFolha('baatar')).toBe('pronta');
    expect(banco.estadoDaFolha('base')).toBe('pronta');
    expect(banco.estadoDaFolha('hayato')).toBe('pendente');
    expect(banco.pronta('voz.hayato.kiai')).toBe(false); // a memória foi solta
  });
});

describe('o manifesto no boot: ausente = síntese, inválido = derruba', () => {
  const base = '/assets/sons/';
  it('manifesto ausente, rede caída ou página no lugar do JSON: null (o jogo fica 100% na síntese), sem lançar', async () => {
    expect(await carregarBanco({ baseUrl: base, aviso, buscarManifesto: async () => null })).toBeNull();
    expect(await carregarBanco({ baseUrl: base, aviso, buscarManifesto: async () => { throw new TypeError('rede'); } })).toBeNull();
    expect(await carregarBanco({ baseUrl: base, aviso, buscarManifesto: async () => '<!doctype html><html></html>' })).toBeNull();
  });
  it('manifesto inválido LANÇA com todos os problemas (id fora da tabela, sem CC0, sem origem)', async () => {
    const m = structuredClone(criarPacote().manifesto) as unknown as { sons: Record<string, Record<string, unknown>> };
    (m.sons['defesa'] as Record<string, unknown>)['licenca'] = 'Runway';
    (m.sons['arremesso'] as Record<string, unknown>)['origem'] = '';
    m.sons['som.inventado'] = m.sons['defesa'] as Record<string, unknown>;
    const falha = carregarBanco({ baseUrl: base, aviso, buscarManifesto: async () => JSON.stringify(m) });
    await expect(falha).rejects.toThrow(/licenca 'Runway'/);
    await expect(falha).rejects.toThrow(/origem ausente/);
    await expect(falha).rejects.toThrow(/som\.inventado/);
  });
  it('manifesto válido: devolve o banco SEM pedir folha nenhuma (T5: a base sobe na etapa 2, os lutadores na VS); a base só desce quando pedida (só os bytes)', async () => {
    const pacote = criarPacote();
    const banco = await carregarBanco({ baseUrl: base, sufixo: '?v=abc', aviso, buscar: pacote.buscar, decodificar: pacote.decodificar, buscarManifesto: async (url) => (url === `${base}manifesto.json?v=abc` ? JSON.stringify(pacote.manifesto) : null) });
    expect(banco).not.toBeNull();
    await new Promise((r) => setTimeout(r, 10));
    expect(pacote.pedidos).toEqual([]);
    expect(banco?.nomesDeFolha().every((n) => banco.estadoDaFolha(n) === 'pendente')).toBe(true);
    void banco?.baixarFolha('base');
    await esperar(() => banco?.estadoDaFolha('base') === 'baixada');
    expect(pacote.pedidos).toEqual(['/assets/sons/base.mp3?v=abc']);
  });
});
