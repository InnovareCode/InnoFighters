import { describe, expect, it } from 'vitest';
import { LUTADORES } from '../../src/data/lutadores';
import { montarLutador } from '../../src/data/montar';
import type { Poses } from '../../src/data/tipos';
import { criarFerramentas } from '../../src/ui/ferramentas';
import { MenuList, type ItemMenu } from '../../src/ui/menu-lista';
import { linhasDeGolpes } from '../../src/ui/personagens';
import { NAV } from '../../src/ui/tipos';
import type { CenaContinue } from '../../src/ui/cenas/fim';
import type { CenaDiff } from '../../src/ui/cenas/diff';
import type { CenaSelect } from '../../src/ui/cenas/select';
import { audioFalso, gravador, mundoFalso, navegadorFalso } from './_ui';

function menu(itens: ItemMenu[]) {
  const g = gravador();
  const a = audioFalso();
  const m = new MenuList(itens, a.audio, criarFerramentas(g.ctx));
  return { m, g, a };
}

describe('MenuList (navegação)', () => {
  it('começa no primeiro item habilitado', () => {
    const { m } = menu([{ label: 'A', disabled: true }, { label: 'B' }, { label: 'C' }]);
    expect(m.sel).toBe(1);
  });

  it('move com volta ao início/fim, pula itens desabilitados e só toca som se mudou', () => {
    const { m, a } = menu([{ label: 'A' }, { label: 'B', disabled: true }, { label: 'C' }]);
    m.move(1);
    expect(m.sel).toBe(2); // pulou o B
    m.move(1);
    expect(m.sel).toBe(0); // deu a volta
    m.move(-1);
    expect(m.sel).toBe(2);
    expect(a.nomes()).toEqual(['uiMove', 'uiMove', 'uiMove']);
    const so = menu([{ label: 'A' }, { label: 'B', disabled: true }]);
    so.m.move(1); // só há um item possível: não muda, não toca
    expect(so.m.sel).toBe(0);
    expect(so.a.nomes()).toEqual([]);
  });

  it('ok: toca uiOk e chama onOk; item só com ajuste ajusta +1 em silêncio; desabilitado não faz nada', () => {
    const feito: string[] = [];
    const { m, a } = menu([
      { label: 'A', onOk: () => feito.push('ok') },
      { label: 'B', onAdjust: (d) => feito.push(`ajuste ${d}`) },
      { label: 'C', disabled: true, onOk: () => feito.push('nao') },
    ]);
    m.ok();
    m.sel = 1;
    m.ok();
    m.sel = 2;
    m.ok();
    expect(feito).toEqual(['ok', 'ajuste 1']);
    expect(a.nomes()).toEqual(['uiOk']);
  });

  it('nav traduz as ações; "back" não é de menu', () => {
    const feito: number[] = [];
    const { m } = menu([{ label: 'A', onAdjust: (d) => feito.push(d) }, { label: 'B' }]);
    expect(m.nav('left')).toBe(true);
    expect(m.nav('right')).toBe(true);
    expect(feito).toEqual([-1, 1]);
    expect(m.nav('down')).toBe(true);
    expect(m.sel).toBe(1);
    expect(m.nav('up')).toBe(true);
    expect(m.sel).toBe(0);
    expect(m.nav('ok')).toBe(true);
    expect(m.nav('back')).toBe(false);
  });

  it('draw registra uma caixa por item; hover e clique usam essas caixas', () => {
    const feito: string[] = [];
    const { m, g, a } = menu([
      { label: 'ARCADE', onOk: () => feito.push('arcade') },
      { label: 'OPÇÕES', onOk: () => feito.push('opcoes') },
      { label: 'X', disabled: true, onOk: () => feito.push('x') },
    ]);
    m.draw(30, 100, 380, 54, { size: 25 });
    expect(m.rects).toEqual([
      { x: 30, y: 100, w: 380, h: 50, i: 0 },
      { x: 30, y: 154, w: 380, h: 50, i: 1 },
      { x: 30, y: 208, w: 380, h: 50, i: 2 },
    ]);
    expect(g.textos()).toEqual(['ARCADE', 'OPÇÕES', 'X']);
    expect(m.hover(100, 170)).toBe(true);
    expect(m.sel).toBe(1);
    expect(m.hover(100, 170)).toBe(true); // já estava: sem novo som
    expect(a.nomes()).toEqual(['uiMove']);
    expect(m.hover(5, 5)).toBe(false);
    expect(m.hover(100, 230)).toBe(false); // desabilitado
    expect(m.click(100, 120)).toBe(true);
    expect(feito).toEqual(['arcade']);
    expect(m.click(100, 230)).toBe(false);
  });

  it('clique em controle deslizante: dentro da barra define o valor, fora dela ajusta ±1', () => {
    const feito: string[] = [];
    const { m } = menu([
      { label: 'MÚSICA', slider: () => 0.5, onAdjust: (d) => feito.push(`ajuste ${d}`), onSet: (v) => feito.push(`valor ${v.toFixed(2)}`) },
    ]);
    m.draw(100, 100, 400, 46, { size: 21 });
    const r = m.rects[0]!;
    expect(r.sx).toBe(100 + 400 - 152 - 24); // largura da barra = min(190, 38% de 400) = 152
    expect(r.sw).toBe(152);
    m.click(r.sx! + r.sw! / 2, 120);
    expect(feito).toEqual(['valor 0.50']);
    m.click(r.x + r.w - 2, 120); // depois da barra, à direita: clamp em 1
    expect(feito.at(-1)).toBe('valor 1.00');
    m.click(r.x + 5, 120); // à esquerda da barra: meia linha esquerda => -1
    expect(feito.at(-1)).toBe('ajuste -1');
  });

  it('item com valor mostra setas só quando dá para ajustar', () => {
    const { m, g } = menu([
      { label: 'ROUNDS', value: () => '2', onAdjust: () => undefined },
      { label: 'FIXO', value: () => 'X' },
    ]);
    m.draw(0, 0, 600, 40);
    expect(g.textos()).toContain('◀  2  ▶');
    expect(g.textos()).toContain('X');
  });
});

describe('NAV (tecla -> ação, idêntico ao protótipo)', () => {
  it('setas e WASD navegam; Enter, espaço, Z, C, J confirmam; Esc, X, V, K e Backspace voltam', () => {
    expect([NAV['ArrowUp'], NAV['w'], NAV['ArrowDown'], NAV['s'], NAV['ArrowLeft'], NAV['a'], NAV['ArrowRight'], NAV['d']]).toEqual([
      'up', 'up', 'down', 'down', 'left', 'left', 'right', 'right',
    ]);
    for (const k of ['Enter', ' ', 'z', 'c', 'j']) expect(NAV[k]).toBe('ok');
    for (const k of ['Escape', 'x', 'v', 'k', 'Backspace']) expect(NAV[k]).toBe('back');
    expect(NAV['q']).toBeUndefined();
  });
});

describe('linhasDeGolpes (textos da lista, iguais aos do protótipo)', () => {
  const q = (x: number, tip?: [number, number]) => ({ x, y: 0, w: 100, h: 100, ax: 50, ...(tip ? { tipX: tip[0], tipY: tip[1] } : {}) });
  const poses: Poses = { guard: q(0), idle0: q(0), punch: q(100, [100, 100]), kick: q(200, [100, 100]), special: q(300, [100, 100]), jumpPunch: q(400), crouch: q(500) };
  const ch = montarLutador(LUTADORES.hayato, poses);

  it('4 golpes comuns + 3 especiais do lutador, com as teclas certas', () => {
    const l = linhasDeGolpes(ch);
    expect(l.map((r) => r.name)).toEqual(['Soco fraco', 'Chute fraco', 'Soco forte', 'Chute forte', 'RAIJIN-DAN', 'RAIJIN-KEN', 'KAMINARI-STEP']);
    expect(l.map((r) => r.keys.join('+'))).toEqual(['lp', 'lk', 'hp', 'hk', 'qcf+lp', 'dp+lp', 'qcb+lk']);
    expect(l.slice(4).every((r) => r.special)).toBe(true);
  });

  it('descrição dos especiais: info + "Ou <atalho>. Custo N."', () => {
    const l = linhasDeGolpes(ch);
    expect(l[4]?.desc).toBe('Esfera de trovão em linha reta. O clássico projétil. Ou ESP parado. Custo 40.');
    expect(l[5]?.desc).toContain('Ou ↓ + ESP. Custo 30.');
    expect(l[6]?.desc).toContain('Ou → + ESP. Custo 20.');
  });
});

describe('Navegador (transições e roteamento)', () => {
  it('go() liga o fade e só aceita uma troca por vez; o fade troca a cena no meio', () => {
    const { ui } = navegadorFalso();
    const chamadas: string[] = [];
    (ui.cenas as Record<string, unknown>)['menu'] = { draw() {}, enter: (a: unknown) => chamadas.push(`menu ${JSON.stringify(a)}`) };
    (ui.cenas as Record<string, unknown>)['title'] = { draw() {}, enter: () => chamadas.push('title') };
    ui.fade = 0;
    ui.fadeDir = 0;
    ui.go('menu', { x: 1 });
    ui.go('title'); // ignorado: já há uma troca
    expect(ui.fadeTo).toBe('menu');
    let ticks = 0;
    while (ui.name !== 'menu' && ticks < 30) {
      ui.update();
      ticks++;
    }
    expect(ticks).toBe(9); // 0,12 por tick até 1
    expect(chamadas).toEqual(['menu {"x":1}']);
    expect(ui.fadeTo).toBeNull();
    expect(ui.fadeDir).toBe(-1);
    for (let i = 0; i < 13; i++) ui.update();
    expect(ui.fade).toBe(0);
    expect(ui.fadeDir).toBe(0);
  });

  it('set() recomeça o contador e toca a música de menu nas telas de menu (se há áudio)', () => {
    const { ui, audio } = navegadorFalso();
    (ui.cenas as Record<string, unknown>)['menu'] = { draw() {} };
    (ui.cenas as Record<string, unknown>)['fight'] = { draw() {} };
    ui.t = 99;
    ui.set('menu');
    expect(ui.t).toBe(0);
    expect(audio.nomes()).toEqual([]); // sem contexto de áudio (antes do 1º gesto) nada toca
    (audio.audio as unknown as { ctx: unknown }).ctx = {};
    ui.set('menu');
    ui.set('fight');
    expect(audio.chamadas).toEqual([['startMusic', 'menu']]);
  });

  it('tecla: a cena trata primeiro; se não tratou, vira ação de menu; durante o fade é ignorada', () => {
    const { ui } = navegadorFalso();
    const log: string[] = [];
    (ui.cenas as Record<string, unknown>)['menu'] = {
      draw() {},
      key: (k: string) => (log.push(`key ${k}`), k === 'p'),
      nav: (a: string) => log.push(`nav ${a}`),
    };
    ui.set('menu');
    ui.key('p'); // tratada
    ui.key('ArrowDown'); // não tratada -> nav
    ui.key('q'); // sem ação
    expect(log).toEqual(['key p', 'key ArrowDown', 'nav down', 'key q']);
    ui.fadeTo = 'title';
    ui.key('Enter');
    expect(log).toHaveLength(4);
  });

  it('clique: ignorado durante o fade e na luta em andamento; toque faz hover antes', () => {
    const { ui } = navegadorFalso();
    const log: string[] = [];
    const cena = { draw() {}, paused: false, hover: (x: number, y: number) => log.push(`hover ${x},${y}`), click: (x: number, y: number) => log.push(`click ${x},${y}`) };
    (ui.cenas as Record<string, unknown>)['fight'] = cena;
    ui.set('fight');
    ui.click(1, 2); // luta rolando: ignora
    expect(log).toEqual([]);
    cena.paused = true;
    ui.click(1, 2);
    ui.toque(3, 4);
    expect(log).toEqual(['click 1,2', 'hover 3,4', 'click 3,4']);
    ui.fadeTo = 'menu';
    ui.hover(9, 9);
    ui.click(9, 9);
    expect(log).toHaveLength(3);
  });

  it('get m falha com mensagem clara antes de a arte carregar', () => {
    const { ui } = navegadorFalso();
    expect(() => ui.m).toThrow(/ainda nao carregou/);
    ui.pronto(mundoFalso());
    expect(ui.ready).toBe(true);
    expect(() => ui.m).not.toThrow();
  });
});

describe('seleção de lutadores (máquina de estados)', () => {
  function select(mode: 'versus' | 'cpu' | 'arcade' | 'training') {
    const t = navegadorFalso();
    t.ui.pronto(mundoFalso());
    const s = t.ui.cenas.select as CenaSelect;
    s.enter({ mode });
    const ir: string[] = [];
    t.ui.go = ((n: string, a: unknown) => ir.push(`${n} ${JSON.stringify(a)}`)) as never;
    return { ...t, s, ir };
  }
  const rodar = (s: CenaSelect, n: number) => {
    for (let i = 0; i < n; i++) s.update();
  };

  it('CPU: 1ª confirmação escolhe o seu lutador, a 2ª o adversário (sugerido = próximo), depois vai à dificuldade', () => {
    const { s, ir, audio } = select('cpu');
    s.key('ArrowRight'); // HAYATO -> WEI LONG
    s.key('ArrowDown'); // -> CAIO
    expect(s.cur[0]).toBe(3);
    s.key('Enter');
    expect(s.step).toBe(2);
    expect(s.cur[1]).toBe(0); // (3 + 1) % 4
    s.key('Enter');
    rodar(s, 59);
    expect(ir).toEqual([]);
    rodar(s, 1);
    expect(ir).toEqual(['diff {"mode":"cpu","c1":"caio","c2":"hayato"}']);
    expect(audio.nomes().filter((n) => n === 'uiSelect')).toHaveLength(2);
  });

  it('voltar da etapa 2 destrava o jogador; voltar da etapa 1 vai ao menu', () => {
    const { s, ir } = select('cpu');
    s.key('Enter');
    expect(s.step).toBe(2);
    s.key('Escape');
    expect(s.step).toBe(1);
    expect(s.lock[0]).toBe(false);
    s.key('Escape');
    expect(ir).toEqual(['menu undefined']);
  });

  it('ARCADE e TREINO: arcade vai direto depois de 1 escolha; treino escolhe o alvo e vai à luta', () => {
    const a = select('arcade');
    a.s.key('z');
    rodar(a.s, 60);
    expect(a.ir[0]).toMatch(/^diff \{"mode":"arcade","c1":"hayato"/);
    const t = select('training');
    t.s.key('z');
    t.s.key('z');
    rodar(t.s, 60);
    expect(t.ir).toEqual(['fight {"cfg":{"mode":"training","c1":"hayato","c2":"wei-long","cpu":null}}']);
  });

  it('VERSUS: P1 usa setas/Z e P2 usa WASD/J; só começa com os dois travados; X desfaz', () => {
    const { s, ir } = select('versus');
    s.key('ArrowRight'); // P1 -> WEI LONG
    s.key('a'); // P2 (estava em WEI LONG) -> HAYATO
    expect(s.cur).toEqual([1, 0]);
    s.key('z');
    expect(s.lock).toEqual([true, false]);
    s.key('ArrowDown'); // P1 travado não anda
    expect(s.cur[0]).toBe(1);
    s.key('j');
    rodar(s, 69);
    expect(ir).toEqual([]);
    s.key('x'); // P1 desfaz... mas a tela já está contando para sair (done > 0): ignorado
    rodar(s, 1);
    expect(ir).toEqual(['vs {"cfg":{"mode":"versus","c1":"wei-long","c2":"hayato","cpu":null}}']);
  });

  it('mouse: passar por cima move o cursor; clicar confirma o quadrado', () => {
    const { s } = select('cpu');
    s.hover(360 + 132 + 10, 92 + 10); // quadrado 1
    expect(s.cur[0]).toBe(1);
    s.click(360 + 10, 92 + 132 + 10); // quadrado 2
    expect(s.cur[0]).toBe(2);
    expect(s.lock[0]).toBe(true);
    expect(s.step).toBe(2);
  });
});

describe('dificuldade e campanha ARCADE', () => {
  it('ARCADE: sorteia a ordem dos 3 rivais (sem repetir o seu lutador) e abre a campanha com 3 créditos', () => {
    const t = navegadorFalso();
    t.ui.pronto(mundoFalso());
    const d = t.ui.cenas.diff as CenaDiff;
    const ir: Array<[string, unknown]> = [];
    t.ui.go = ((n: string, a: unknown) => ir.push([n, a])) as never;
    d.enter({ mode: 'arcade', c1: 'caio', c2: 'hayato' });
    d.nav('down'); // NORMAL (o cursor começa na dificuldade salva: 1)
    d.nav('ok');
    expect(t.persist.settings.diff).toBe(2);
    expect(t.salvou.n).toBe(1);
    const run = t.ui.run!;
    expect(run.etapas.map((e) => e.id).sort()).toEqual(['hayato', 'min-ji', 'wei-long']);
    expect(run.etapas.some((e) => e.chefe)).toBe(false); // sem chefão em produção
    expect(run).toMatchObject({ c1: 'caio', idx: 0, score: 0, continues: 3, diff: 2, cont: 0 });
    expect(ir[0]?.[0]).toBe('vs');
    expect((ir[0]?.[1] as { cfg: { c2: string; cpu: number } }).cfg).toMatchObject({ mode: 'arcade', c1: 'caio', c2: run.etapas[0]?.id, cpu: 2 });
  });

  it('padrão da dificuldade: o cursor começa na dificuldade salva', () => {
    const t = navegadorFalso({ diff: 2 });
    t.ui.pronto(mundoFalso());
    const d = t.ui.cenas.diff as CenaDiff;
    d.enter({ mode: 'cpu', c1: 'hayato', c2: 'caio' });
    expect((d as unknown as { m: MenuList }).m.sel).toBe(2);
  });
});

describe('CONTINUAR? (ARCADE)', () => {
  function cont(continues = 2, score = 800) {
    const t = navegadorFalso();
    t.ui.pronto(mundoFalso());
    const c = t.ui.cenas.continue as CenaContinue;
    const run = { c1: 'caio' as const, etapas: (['hayato', 'wei-long', 'min-ji'] as const).map((id) => ({ id: id as 'hayato', chefe: false })), idx: 1, score, continues, diff: 1, cont: 0 };
    const ir: Array<[string, unknown]> = [];
    t.ui.go = ((n: string, a: unknown) => ir.push([n, a])) as never;
    c.enter({ run, a: { cfg: { mode: 'arcade', c1: 'caio', c2: 'wei-long', cpu: 1 }, run } });
    return { ...t, c, run, ir };
  }

  it('conta 10 s (600 ticks) tocando um tique por segundo; ao zerar vira GAME OVER e grava o recorde', () => {
    const { c, audio, persist, salvou } = cont(2, 9000);
    for (let i = 0; i < 599; i++) c.update();
    expect(c.over).toBe(false);
    expect(audio.nomes().filter((n) => n === 'uiTick')).toHaveLength(9); // 9..1 segundos
    c.update();
    expect(c.over).toBe(true);
    expect(persist.hi).toBe(9000);
    expect(salvou.n).toBe(1);
  });

  it('Z/Enter gasta um crédito e volta ao confronto da mesma luta, mantendo a pontuação', () => {
    const { c, run, ir } = cont(2, 800);
    c.key('z');
    expect(run).toMatchObject({ continues: 1, cont: 1 });
    expect(ir).toEqual([['vs', { cfg: { mode: 'arcade', c1: 'caio', c2: 'wei-long', cpu: 1, keepScore: true }, run }]]);
  });

  it('sem créditos: não continua e encerra no próximo tick; ESC encerra na hora (sem recorde se for menor)', () => {
    const sem = cont(0, 500);
    sem.c.key('z');
    expect(sem.ir).toEqual([]);
    sem.c.update();
    expect(sem.c.over).toBe(true);
    const esc = cont(2, 700);
    esc.persist.hi = 1000;
    esc.c.key('Escape');
    expect(esc.c.over).toBe(true);
    expect(esc.persist.hi).toBe(1000);
    expect(esc.salvou.n).toBe(0);
  });

  it('depois do GAME OVER, 150 ticks e volta ao título', () => {
    const { c, ir, ui, audio } = cont(0, 100);
    c.update(); // game over em ui.t = 0
    expect(c.over).toBe(true);
    ui.t = 150;
    c.update();
    expect(ir).toEqual([]);
    ui.t = 151;
    c.update();
    expect(ir).toEqual([['title', undefined]]);
    expect(audio.chamadas.at(-1)).toEqual(['startMusic', 'menu']);
  });
});
