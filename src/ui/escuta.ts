import { IDS_LUTADORES, type EventoLuta, type IdLutador, type IndiceLutador, type TextoFlutuante } from '../core/contratos';
import type { AudioSys } from '../audio/audio-sys';
import { reagirComIdentidade, tocarItem, type ContextoSonoro } from '../audio/identidade-sonora';
import { sintetizarGrito } from '../audio/sintese-voz';
import { temaDoLutador } from '../audio/temas';
import { LUTADORES } from '../data/lutadores';
import { DADOS_SONS } from '../data/sons';
import type { AssinaturaEspecial } from '../data/sons/tipos';

/*
 * PAINEL DE ESCUTA (`?escuta=1`): o dono ouve, no navegador do PC ou do celular, cada som e cada tema novos SEM jogar. Não persiste nada nem mexe no
 * save: o painel chama as camadas direto (`ligada = true`), ou as de antes (caixa de comparação).
 *
 * O que sai daqui é o que o jogo toca: cada botão monta o MESMO evento de luta que o motor emitiria (`special`, `projectile`, `hit`, `ko`, `quebra-guarda`,
 * `round`...) e o entrega a `reagirComIdentidade`, que é a função que `fight.ts` usa. Os temas vão pelo `startMusic` real (e a troca de fase pelo
 * `musicaDaFase(2)`, como no chefão). Teclado: ← → trocam de lutador; 1-7 vozes; 8 tema (fase 1); 9 tema (fase 2 direto); - troca para a fase 2 ao vivo;
 * 0 ou Esc para a música; Q W E R T Y U I O P tocam a sequência de cada especial.
 */

export interface OpcoesEscuta {
  readonly audio: AudioSys;
  /** Volumes iniciais (0 a 1), os do save do jogo. */
  readonly musica: number;
  readonly sfx: number;
}

const ESTILO = `
#escuta{position:fixed;inset:0;overflow:auto;background:#0b0813;color:#eee;font:16px/1.4 system-ui,sans-serif;padding:12px 14px 40px;z-index:5;-webkit-overflow-scrolling:touch}
#escuta *{box-sizing:border-box}
#escuta h1{font-size:20px;margin:0 0 4px}
#escuta h2{font-size:15px;margin:18px 0 8px;color:#ffd84a;text-transform:uppercase;letter-spacing:.06em}
#escuta h3{font-size:15px;margin:12px 0 6px}
#escuta p{margin:4px 0;color:#bbb;font-size:14px}
#escuta .linha{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
#escuta button,#escuta a.botao{min-height:44px;min-width:44px;padding:8px 12px;border-radius:8px;border:1px solid #4a3f6b;background:#1e1736;color:#eee;font:inherit;cursor:pointer;text-decoration:none;display:inline-flex;align-items:center;gap:6px}
#escuta button:hover,#escuta a.botao:hover{background:#2c2250}
#escuta button:focus-visible,#escuta a.botao:focus-visible,#escuta input:focus-visible{outline:3px solid #ffd84a;outline-offset:2px}
#escuta button[aria-pressed=true]{background:#ffd84a;color:#16101f;border-color:#ffd84a}
#escuta button.parar{border-color:#a33;background:#3a1220}
#escuta kbd{font:12px monospace;background:#0006;border:1px solid #fff3;border-radius:4px;padding:1px 5px;color:#ffd84a}
#escuta label{display:inline-flex;align-items:center;gap:8px;min-height:44px}
#escuta input[type=range]{width:min(40vw,200px);height:44px}
#escuta input[type=checkbox]{width:24px;height:24px}
#escuta .cartao{border:1px solid #2b2342;border-radius:10px;padding:10px 12px;margin:8px 0;background:#120e20}
#escuta .estado{min-height:24px;color:#9fe;font-size:14px}
#escuta nav{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0}
`;

/** `golpe` -> nome do golpe nos dados (ou a própria chave). */
function nomeDoGolpe(id: IdLutador, ficha: string, golpe: string): string {
  type Def = { especiais?: Record<string, { name?: string } | undefined>; fichas?: Record<string, { especiais?: Record<string, { name?: string } | undefined> } | undefined> };
  const def = LUTADORES[id] as unknown as Def;
  return (ficha !== 'base' ? def.fichas?.[ficha]?.especiais?.[golpe]?.name : undefined) ?? def.especiais?.[golpe]?.name ?? golpe;
}

const TECLAS_ESPECIAIS = 'qwertyuiop';
/** O som não lê o texto flutuante; o tipo do evento o exige. */
const TEXTO_VAZIO: TextoFlutuante = { x: 0, y: 0, s: '', col: '#fff', size: 12 };

export function abrirEscuta(o: OpcoesEscuta): void {
  const { audio } = o;
  const doc = document;
  // some o jogo (a tela do canvas, o toque, o aviso de orientação): aqui só se ouve
  for (const id of ['jogo', 'touch', 'rot', 'aviso']) {
    const el = doc.getElementById(id);
    if (el) el.style.display = 'none';
  }
  const estilo = doc.createElement('style');
  estilo.textContent = ESTILO;
  doc.head.appendChild(estilo);
  const raiz = doc.createElement('div');
  raiz.id = 'escuta';
  doc.body.appendChild(raiz);

  let sel: IdLutador = IDS_LUTADORES[0];
  let hoje = false; // true = toca o som/a música de HOJE (genérico), para comparar
  let tick = 1;
  let tocandoAgora = '';
  const teclas = new Map<string, () => void>();
  let estadoEl: HTMLElement | null = null;
  const timers = new Set<ReturnType<typeof setTimeout>>();

  const garantirAudio = (): boolean => {
    if (!audio.ctx) {
      audio.init();
      audio.setMusicVol(o.musica);
      audio.setSfxVol(o.sfx);
    }
    audio.resume();
    if (!audio.ctx) {
      dizer('Este navegador não tem Web Audio: nada para ouvir aqui.');
      return false;
    }
    return true;
  };
  const dizer = (texto: string): void => {
    tocandoAgora = texto;
    if (estadoEl) estadoEl.textContent = texto;
  };
  const depois = (ms: number, fn: () => void): void => {
    const t = setTimeout(() => {
      timers.delete(t);
      fn();
    }, ms);
    timers.add(t);
  };
  const outroLutador = (id: IdLutador): IdLutador => IDS_LUTADORES[(IDS_LUTADORES.indexOf(id) + 1) % IDS_LUTADORES.length] as IdLutador;

  /** Contexto do jogo: lutador 0 = o escolhido (na ficha pedida), lutador 1 = um rival qualquer. */
  const contexto = (ficha: string | null): ContextoSonoro => ({ ids: [sel, outroLutador(sel)], fichas: [ficha, null], semente: audio.sementeVariacao || 1, tick: tick++ });
  const pitch = (): number => LUTADORES[sel].pitch;
  const tocar = (eventos: readonly EventoLuta[], ficha: string | null, texto: string): void => {
    if (!garantirAudio()) return;
    reagirComIdentidade(audio, eventos, contexto(ficha), undefined, !hoje);
    dizer(`${hoje ? 'DE ANTES' : 'ATUAL'}: ${texto}`);
  };

  // ---- eventos de luta, como o motor os emite (só os campos que o som lê, mais os obrigatórios do tipo) ----
  const evHit = (campos: Partial<Extract<EventoLuta, { tipo: 'hit' }>>): EventoLuta => ({
    tipo: 'hit', atacante: 1, defensor: 0, x: 0, y: 0, cor: '#ffd84a', grande: false, snd: 'punch', pitch: pitch(), contragolpe: false, projetil: false, acertos: 1, texto: null, ...campos,
  });
  const evSpecial = (golpe: string, ficha: string | null): EventoLuta => ({ tipo: 'special', lutador: 0, pitch: pitch(), golpe, ficha });
  const evProjetil = (style: NonNullable<AssinaturaEspecial['estilo']>): EventoLuta => ({ tipo: 'projectile', lutador: 0, x: 0, y: 0, style });

  // ---- construção da tela ----
  const el = <K extends keyof HTMLElementTagNameMap>(tag: K, texto?: string, classe?: string): HTMLElementTagNameMap[K] => {
    const e = doc.createElement(tag);
    if (texto !== undefined) e.textContent = texto;
    if (classe) e.className = classe;
    return e;
  };
  const botao = (pai: HTMLElement, texto: string, tecla: string | null, acao: () => void): HTMLButtonElement => {
    const b = el('button', texto);
    b.type = 'button';
    if (tecla) {
      const k = el('kbd', tecla === 'Escape' ? 'Esc' : tecla.toUpperCase());
      b.appendChild(k);
      teclas.set(tecla, acao);
    }
    b.addEventListener('click', acao);
    pai.appendChild(b);
    return b;
  };

  const pararMusica = (): void => {
    audio.stopMusic();
    dizer('Música parada.');
  };
  const tocarTrilha = (trilha: Parameters<AudioSys['startMusic']>[0], fase2: boolean, texto: string): void => {
    if (!garantirAudio()) return;
    audio.stopMusic(); // recomeça mesmo que seja a mesma trilha (startMusic ignora o mesmo tipo já tocando)
    audio.startMusic(trilha);
    if (fase2) audio.musicaDaFase(2);
    dizer(texto);
  };

  const desenhar = (): void => {
    teclas.clear();
    for (const t of timers) clearTimeout(t);
    timers.clear();
    raiz.replaceChildren();
    const id = sel;
    const def = LUTADORES[id];
    const perfil = DADOS_SONS.perfis[id];
    const gritos = perfil?.gritos;

    raiz.appendChild(el('h1', 'Escuta · InnoFighters'));
    raiz.appendChild(el('p', 'Toque (ou use o teclado) para ouvir o que o jogo toca. Nada aqui altera o jogo nem o seu progresso. A caixa abaixo compara com o som e a música de ANTES (genéricos).'));

    // volumes, comparação com o som de hoje
    const barra = el('div', undefined, 'linha');
    const vol = (rotulo: string, ini: number, aplicar: (v: number) => void): void => {
      const l = el('label', rotulo);
      const r = el('input');
      r.type = 'range';
      r.min = '0';
      r.max = '1';
      r.step = '0.05';
      r.value = String(ini);
      r.setAttribute('aria-label', rotulo);
      r.addEventListener('input', () => {
        garantirAudio();
        aplicar(Number(r.value));
      });
      l.appendChild(r);
      barra.appendChild(l);
    };
    vol('Música', audio.musicVol, (v) => audio.setMusicVol(v));
    vol('Efeitos', audio.sfxVol, (v) => audio.setSfxVol(v));
    const lh = el('label', 'Comparar: tocar o som/a música de ANTES (genéricos)');
    const ch = el('input');
    ch.type = 'checkbox';
    ch.checked = hoje;
    ch.addEventListener('change', () => {
      hoje = ch.checked;
      dizer(hoje ? 'Modo comparação: toca o som e a música de antes.' : 'Modo atual: toca a identidade sonora e os temas do jogo.');
    });
    lh.prepend(ch);
    barra.appendChild(lh);
    raiz.appendChild(barra);

    // lutadores
    const nav = el('nav');
    nav.setAttribute('aria-label', 'Lutadores');
    for (const outro of IDS_LUTADORES) {
      const b = el('button', LUTADORES[outro].name);
      b.type = 'button';
      b.setAttribute('aria-pressed', String(outro === sel));
      b.addEventListener('click', () => {
        sel = outro;
        desenhar();
      });
      nav.appendChild(b);
    }
    raiz.appendChild(nav);
    teclas.set('ArrowRight', () => {
      sel = IDS_LUTADORES[(IDS_LUTADORES.indexOf(sel) + 1) % IDS_LUTADORES.length] as IdLutador;
      desenhar();
    });
    teclas.set('ArrowLeft', () => {
      sel = IDS_LUTADORES[(IDS_LUTADORES.indexOf(sel) + IDS_LUTADORES.length - 1) % IDS_LUTADORES.length] as IdLutador;
      desenhar();
    });
    raiz.appendChild(el('h2', `${def.name}`));
    estadoEl = el('div', tocandoAgora, 'estado');
    estadoEl.setAttribute('role', 'status');
    raiz.appendChild(estadoEl);

    // ---- vozes ----
    raiz.appendChild(el('h2', 'Voz'));
    const vozes = el('div', undefined, 'linha');
    if (gritos && perfil) {
      botao(vozes, 'Kiai', '1', () => {
        if (!garantirAudio()) return;
        if (hoje) audio.special(pitch());
        else tocarItem(audio, { receita: sintetizarGrito(perfil, gritos.kiai), prioridade: 3, garganta: 0 as IndiceLutador, tipo: 'voz' });
        dizer(`${hoje ? 'DE ANTES' : 'ATUAL'}: kiai`);
      });
      botao(vozes, 'Dano leve', '2', () => tocar([evHit({})], null, 'dano leve'));
      botao(vozes, 'Dano pesado', '3', () => tocar([evHit({ grande: true, dano: 16 })], null, 'dano pesado'));
      botao(vozes, 'Guarda quebrada', '4', () => tocar([{ tipo: 'quebra-guarda', atacante: 1, defensor: 0, x: 0, y: 0, texto: TEXTO_VAZIO }], null, 'guarda quebrada'));
      botao(vozes, 'KO', '5', () => tocar([{ tipo: 'ko', defensor: 0, pitch: pitch() }], null, 'KO'));
      botao(vozes, 'Vitória (grito atrasa ~1 s, como no fim da luta)', '6', () => tocar([{ tipo: 'round', fase: 'end', round: 1, vencedor: 0, fimDaLuta: true }], null, 'vitória'));
      if (gritos.esforco) botao(vozes, 'Esforço (armadura)', '7', () => tocar([{ tipo: 'armor', atacante: 1, defensor: 0, x: 0, y: 0, snd: 'punch', texto: TEXTO_VAZIO }], null, 'esforço da armadura'));
    } else vozes.appendChild(el('p', 'Este lutador não tem voz nos dados (cai nos sons genéricos).'));
    raiz.appendChild(vozes);

    // ---- especiais ----
    raiz.appendChild(el('h2', 'Especiais'));
    const chaves = Object.keys(DADOS_SONS.assinaturas)
      .filter((c) => c.startsWith(`${id}.`))
      .sort();
    let indiceTecla = 0;
    for (const chave of chaves) {
      const a = DADOS_SONS.assinaturas[chave] as AssinaturaEspecial;
      const [, ficha = 'base', golpe = ''] = chave.split('.');
      const fichaEv = ficha === 'base' ? null : ficha;
      const cartao = el('div', undefined, 'cartao');
      cartao.appendChild(el('h3', `${nomeDoGolpe(id, ficha, golpe)} · ${ficha === 'base' ? 'ficha base' : `ficha ${ficha}`} · ${golpe}`));
      const linha = el('div', undefined, 'linha');
      const impacto = (campos: Partial<Extract<EventoLuta, { tipo: 'hit' }>> = {}): EventoLuta =>
        evHit({ atacante: 0, defensor: 1, especial: true, golpe, snd: a.lancamento ? 'fireballHit' : 'punch', projetil: !!a.lancamento, grande: true, dano: 20, ...campos });
      const sequencia = (): void => {
        tocar([evSpecial(golpe, fichaEv)], fichaEv, `${golpe}: início`);
        let t = 0.45;
        if (a.lancamento && a.estilo) {
          const estilo = a.estilo;
          depois(t * 1000, () => tocar([evProjetil(estilo)], fichaEv, `${golpe}: lançamento`));
          t = 0.9;
        }
        depois(t * 1000, () => tocar([impacto(a.porNivel ? { nivelCarga: 3 } : {})], fichaEv, `${golpe}: impacto`));
      };
      const tecla = indiceTecla < TECLAS_ESPECIAIS.length ? (TECLAS_ESPECIAIS[indiceTecla] as string) : null;
      indiceTecla++;
      botao(linha, 'Sequência', tecla, sequencia);
      botao(linha, 'Início (grito + conjuração)', null, () => tocar([evSpecial(golpe, fichaEv)], fichaEv, `${golpe}: início`));
      if (a.lancamento && a.estilo) {
        const estilo = a.estilo;
        botao(linha, 'Lançamento', null, () => tocar([evProjetil(estilo)], fichaEv, `${golpe}: lançamento`));
      }
      if (a.porNivel) for (const n of [1, 2, 3] as const) botao(linha, `Impacto nível ${n}`, null, () => tocar([impacto({ nivelCarga: n })], fichaEv, `${golpe}: impacto nível ${n}`));
      else if (a.porAcerto && a.porAcerto.length > 1) for (let n = 1; n <= a.porAcerto.length; n++) botao(linha, `Impacto ${n}º acerto`, null, () => tocar([impacto({ acertos: n })], fichaEv, `${golpe}: ${n}º acerto`));
      else botao(linha, 'Impacto', null, () => tocar([impacto()], fichaEv, `${golpe}: impacto`));
      if (a.comDreno) botao(linha, 'Impacto com dreno', null, () => tocar([impacto({ dreno: 6 })], fichaEv, `${golpe}: impacto com dreno`));
      if (a.contraEspecial) botao(linha, 'Contra-especial', null, () => tocar([impacto({ contraEspecial: true })], fichaEv, `${golpe}: contra-especial`));
      if (a.sucesso) {
        botao(linha, 'Sucesso (aparou/absorveu)', null, () =>
          tocar(
            golpe === 'sDown'
              ? [{ tipo: 'clash', x: 0, y: 0, lutador: 0, golpe }]
              : [{ tipo: 'parry', atacante: 1, defensor: 0, x: 0, y: 0, texto: TEXTO_VAZIO, golpe }],
            fichaEv,
            `${golpe}: sucesso`,
          ),
        );
      }
      if (a.resposta) botao(linha, 'Resposta (FOUETTÉ)', null, () => tocar([evHit({ atacante: 0, defensor: 1, especial: true, golpe: 'sResp', grande: true, dano: 14 })], fichaEv, `${golpe}: resposta`));
      if (a.carga) a.carga.forEach((_, i) => botao(linha, `Carga nível ${i + 1}`, null, () => tocar([{ tipo: 'carga', lutador: 0, nivel: (i + 1) as 1 | 2 | 3 }], fichaEv, `${golpe}: carga ${i + 1}`)));
      if (a.rebote) botao(linha, 'Rebote', null, () => tocar([{ tipo: 'rebote', lutador: 0, x: 0 }], fichaEv, `${golpe}: rebote`));
      botao(linha, 'Defesa (o rival bloqueia)', null, () => tocar([{ tipo: 'block', atacante: 0, defensor: 1, x: 0, y: 0, dir: 1, texto: null, golpe, especial: true }], fichaEv, `${golpe}: defendido`));
      cartao.appendChild(linha);
      raiz.appendChild(cartao);
    }
    const troca = perfil?.troca;
    if (troca) {
      const linha = el('div', undefined, 'linha');
      for (const f of Object.keys(troca)) botao(linha, `Troca de ficha → ${f}`, null, () => tocar([{ tipo: 'troca-ficha', lutador: 0, ficha: f === 'base' ? null : f }], null, `troca de ficha → ${f}`));
      raiz.appendChild(linha);
    }

    // ---- música ----
    raiz.appendChild(el('h2', 'Música'));
    const tema = temaDoLutador(id);
    const mus = el('div', undefined, 'linha');
    if (tema) {
      raiz.appendChild(el('p', `Tema: ${tema.nome} (${tema.origem}) · ${tema.bpm} bpm`));
      botao(mus, hoje ? 'Música de luta de antes' : 'Tema · fase 1', '8', () => (hoje ? tocarTrilha('fight', false, 'música de luta de antes') : tocarTrilha(`tema:${id as Exclude<IdLutador, 'zenon'>}`, false, `tema de ${def.name}, fase 1`)));
      botao(mus, 'Tema · fase 2 (direto)', '9', () => tocarTrilha(`tema:${id as Exclude<IdLutador, 'zenon'>}`, true, `tema de ${def.name}, fase 2`));
      botao(mus, 'Trocar para a fase 2 ao vivo', '-', () => {
        if (!garantirAudio()) return;
        audio.musicaDaFase(2);
        dizer('Pediu a fase 2: vira no início do próximo compasso, com o trecho de troca.');
      });
    } else {
      raiz.appendChild(el('p', 'O ZENON não tem tema próprio: toca a valsa do chefão (a mesma do jogo).'));
      botao(mus, 'Valsa · fase 1', '8', () => tocarTrilha('chefe', false, 'valsa do chefão, fase 1'));
      botao(mus, 'Valsa · fase 2', '9', () => tocarTrilha('chefe', true, 'valsa do chefão, fase 2'));
      botao(mus, 'Trocar para a fase 2 ao vivo', '-', () => {
        if (!garantirAudio()) return;
        audio.musicaDaFase(2);
        dizer('Pediu a fase 2: vira no início do próximo compasso.');
      });
    }
    botao(mus, 'Música de luta de antes (referência)', null, () => tocarTrilha('fight', false, 'música de luta de antes'));
    botao(mus, 'Música do menu', null, () => tocarTrilha('menu', false, 'música do menu'));
    const parar = botao(mus, 'Parar a música', '0', pararMusica);
    parar.classList.add('parar');
    teclas.set('Escape', pararMusica);
    raiz.appendChild(mus);

    // ---- rodapé: voltar ao jogo (que já toca tudo isto) ----
    const rodape = el('div', undefined, 'linha');
    const volta = el('a', 'Voltar ao jogo', 'botao');
    volta.href = location.pathname;
    rodape.appendChild(volta);
    raiz.appendChild(rodape);
  };

  doc.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    const alvo = e.target as HTMLElement | null;
    if (alvo && alvo.tagName === 'INPUT' && (alvo as HTMLInputElement).type === 'range') return; // setas movem o controle de volume
    const acao = teclas.get(e.key.length === 1 ? e.key.toLowerCase() : e.key);
    if (!acao) return;
    e.preventDefault();
    acao();
  });
  desenhar();
  raiz.querySelector('button')?.focus({ preventScroll: true });
}
