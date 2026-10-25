import { IDS_LUTADORES, type IdLutador } from '../../core/contratos';
import { flashNoTick, TICK_DO_FLASH } from './curvas';
import { PLACAS, TEXTOS } from './textos';
import {
  BPM,
  COMPASSOS_TOTAIS,
  DURACAO_TOTAL,
  INICIO_MAXIMO,
  PLACA_MAX_TICKS,
  PLANOS_ID,
  temMotor,
  TICKS_POR_COMPASSO,
  TICKS_POR_TEMPO,
  TITULO_MAX,
  ZOOM_MAXIMO,
  ZOOM_MINIMO,
  type Plano,
  type RoteiroDoTrailer,
  type TomadasDoTrailer,
} from './tipos';

/*
 * Validação do roteiro e das tomadas (spec §7.2). Roda quando o pedaço do trailer carrega (`exigirRoteiroValido`), no padrão das provocações e dos temas. Se algo
 * falhar o trailer NÃO abre (a cena vai para a abertura de hoje) e o console registra: o boot não cai, porque o trailer é opcional. `validarRoteiro` devolve a lista
 * de erros (vazia = válido) para os testes poderem recusar roteiros ruins um a um.
 */

const MAX_FLASHES_EM_60 = 3;
const LIMIAR_DO_FLASH = 0.3;

export interface OpcoesDaValidacao {
  /** Exige tomada para todo plano com motor (padrão). Falso só para validar o roteiro sozinho. */
  readonly exigirTomadas?: boolean;
  /** Em que plano cada lutador é o destaque (roteiro.ts). Se passado, o lutador precisa estar em campo nesse plano. */
  readonly destaque?: Readonly<Record<IdLutador, string>>;
}

const comMotor = (r: RoteiroDoTrailer): Extract<Plano, { tipo: 'luta' | 'arconte' }>[] => r.planos.filter(temMotor);

/** Subidas acima do limiar na curva de flash, numa janela de 60 ticks que começa em cada tick. */
export function maiorFlashEm60(duracao = DURACAO_TOTAL): number {
  const subidas: number[] = [];
  for (let t = 1; t < duracao; t++) if (flashNoTick(t) > LIMIAR_DO_FLASH && flashNoTick(t - 1) <= LIMIAR_DO_FLASH) subidas.push(t);
  if (flashNoTick(0) > LIMIAR_DO_FLASH) subidas.unshift(0);
  let maior = 0;
  for (const s of subidas) maior = Math.max(maior, subidas.filter((x) => x >= s && x < s + 60).length);
  return maior;
}

export function validarRoteiro(r: RoteiroDoTrailer, tomadas: TomadasDoTrailer, o: OpcoesDaValidacao = {}): string[] {
  const erros: string[] = [];
  const e = (msg: string): void => void erros.push(msg);

  // --- estrutura e duração ---
  if (r.bpm !== BPM) e(`bpm ${r.bpm} (esperado ${BPM})`);
  if (r.ticksPorTempo !== TICKS_POR_TEMPO) e(`ticksPorTempo ${r.ticksPorTempo} (esperado ${TICKS_POR_TEMPO})`);
  if (!Number.isInteger(r.sementeVisual) || r.sementeVisual < 0) e('sementeVisual precisa ser um inteiro >= 0 e CONSTANTE');
  const ids = r.planos.map((p) => p.id);
  if (ids.join(',') !== PLANOS_ID.join(',')) e(`os planos deveriam estar na ordem ${PLANOS_ID.join(',')} (vieram ${ids.join(',')})`);
  const compassos = r.planos.reduce((s, p) => s + p.compassos, 0);
  if (compassos !== COMPASSOS_TOTAIS) e(`${compassos} compassos (esperado ${COMPASSOS_TOTAIS})`);
  for (const p of r.planos) if (!Number.isInteger(p.compassos) || p.compassos < 1) e(`${p.id}: compassos inválido (${p.compassos})`);
  if (compassos * TICKS_POR_COMPASSO !== DURACAO_TOTAL) e(`duração ${compassos * TICKS_POR_COMPASSO} ticks (esperado ${DURACAO_TOTAL})`);

  // --- cobertura dos 10 lutadores ---
  const emCampo = new Map<IdLutador, Set<string>>();
  const marca = (id: IdLutador, plano: string): void => void emCampo.set(id, (emCampo.get(id) ?? new Set<string>()).add(plano));
  for (const p of r.planos) {
    if (p.tipo === 'frio') marca(p.lutador, p.id);
    else if (p.tipo === 'luta' || p.tipo === 'arconte') {
      marca(p.c1, p.id);
      marca(p.c2, p.id);
    }
    else if (p.tipo === 'retratos') for (const id of p.ordem) marca(id, p.id);
  }
  for (const id of IDS_LUTADORES) if (!emCampo.has(id)) e(`${id}: não aparece em nenhum plano`);
  if (o.destaque) for (const id of IDS_LUTADORES) if (!emCampo.get(id)?.has(o.destaque[id])) e(`${id}: o destaque é ${o.destaque[id]}, mas ele não está em campo nesse plano`);

  // --- planos com motor ---
  for (const p of comMotor(r)) {
    if (p.c1 === p.c2) e(`${p.id}: o lutador luta consigo mesmo (${p.c1})`);
    const plen = p.compassos * TICKS_POR_COMPASSO;
    if (p.pede.length === 0) e(`${p.id}: plano de luta sem nenhuma batida pedida`);
    p.pede.forEach((b, i) => {
      if (b.lenta) {
        if (![2, 3, 4].includes(b.lenta.fator)) e(`${p.id}.pede[${i}]: câmera lenta ×${b.lenta.fator} (só ×2, ×3 ou ×4)`);
        if (!Number.isInteger(b.lenta.ticks) || b.lenta.ticks < 1 || b.lenta.ticks > TICKS_POR_TEMPO) e(`${p.id}.pede[${i}]: câmera lenta de ${b.lenta.ticks} ticks (1 a ${TICKS_POR_TEMPO})`);
      }
      if (b.alvo !== undefined && (b.alvo < 0 || b.alvo >= plen)) e(`${p.id}.pede[${i}]: alvo ${b.alvo} fora do plano`);
      if (b.tipo === 'ko' && b.cine) e(`${p.id}.pede[${i}]: KO não abre tarja`);
    });
    if (p.camera.length === 0) e(`${p.id}: câmera sem quadros-chave`);
    let anterior = -1;
    p.camera.forEach((q, i) => {
      if (q.zoom < ZOOM_MINIMO || q.zoom > ZOOM_MAXIMO) e(`${p.id}.camera[${i}]: zoom ${q.zoom} fora de ${ZOOM_MINIMO}..${ZOOM_MAXIMO}`);
      if (q.t < anterior || q.t >= plen) e(`${p.id}.camera[${i}]: t=${q.t} fora de ordem ou do plano`);
      anterior = q.t;
    });
    cortesDeFoco(p.camera).forEach((t) => {
      if (t % TICKS_POR_TEMPO !== 0) e(`${p.id}: troca de foco no tick ${t} (o corte cai no tempo: múltiplo de ${TICKS_POR_TEMPO})`);
    });
    if (o.exigirTomadas !== false) {
      const t = tomadas[p.id];
      if (!t) e(`${p.id}: sem tomada (rode \`npm run trailer:escalar -- --plano ${p.id}\`)`);
      else {
        if (t.inputs.p1.length === 0 || t.inputs.p2.length === 0) e(`${p.id}: a partitura não tem entradas`);
        if (t.inputs.p1.length !== t.inputs.p2.length) e(`${p.id}: as entradas dos dois lutadores têm tamanhos diferentes`);
        for (const en of t.energia ?? []) if (!(en >= 0 && en <= 100)) e(`${p.id}: energia ${en} fora de 0..100`);
        for (const v of t.vida ?? []) if (!(v > 0 && v <= 1)) e(`${p.id}: vida ${v} fora de (0, 1]`);
        p.pede.forEach((b, i) => {
          if (b.tipo === 'super' && (t.energia?.[b.lutador] ?? 0) < 100) e(`${p.id}.pede[${i}]: o super precisa da barra cheia (energia 100) no 1º update`);
        });        if (!Number.isInteger(t.inicio) || t.inicio < 0 || t.inicio > INICIO_MAXIMO) e(`${p.id}: inicio ${t.inicio} fora de 0..${INICIO_MAXIMO}`);
        if (t.batidas.length !== p.pede.length) e(`${p.id}: a tomada tem ${t.batidas.length} batidas e o roteiro pede ${p.pede.length} (reescale)`);
        t.batidas.forEach((b, i) => {
          if (b.pedida !== i) e(`${p.id}: batida ${i} da tomada aponta para o pedido ${b.pedida}`);
          if (!(b.tickInicio >= 1 && b.tickInicio <= b.tickMotor)) e(`${p.id}: batida ${i} com tickInicio ${b.tickInicio} > tickMotor ${b.tickMotor}`);
          if (b.tickMotor <= t.inicio) e(`${p.id}: batida ${i} cai na pré-rolagem (tickMotor ${b.tickMotor} <= inicio ${t.inicio})`);
        });
        if (!/^[0-9a-f]{8}$/.test(t.impressao)) e(`${p.id}: impressão inválida`);
      }
    }
  }
  if (o.exigirTomadas !== false) for (const id of Object.keys(tomadas)) if (!comMotor(r).some((p) => p.id === id)) e(`tomada de "${id}", que não é plano de luta`);

  // --- câmera dos planos sem batida (frio) ---
  for (const p of r.planos) {
    if (p.tipo !== 'frio') continue;
    for (const q of p.camera) if (q.zoom < ZOOM_MINIMO || q.zoom > ZOOM_MAXIMO) e(`${p.id}: zoom ${q.zoom} fora de ${ZOOM_MINIMO}..${ZOOM_MAXIMO}`);
  }

  // --- títulos ---
  for (const p of r.planos) {
    const plen = p.compassos * TICKS_POR_COMPASSO;
    for (const t of p.titulos ?? []) {
      if (!(t.de >= 0 && t.ate > t.de && t.ate <= plen)) e(`${p.id}: título com janela inválida (${t.de}..${t.ate} em ${plen})`);
      if (t.estilo === 'cartao') {
        const texto = TEXTOS[t.chave];
        if (texto === undefined) e(`${p.id}: texto "${t.chave}" não existe`);
        else {
          if (texto.length > TITULO_MAX) e(`${p.id}: título "${texto}" tem ${texto.length} caracteres (máx. ${TITULO_MAX})`);
          if (texto !== texto.toLocaleUpperCase('pt-BR')) e(`${p.id}: título "${texto}" precisa estar em caixa alta`);
        }
      } else {
        if (t.ate - t.de > PLACA_MAX_TICKS) e(`${p.id}: placa de ${t.ate - t.de} ticks (máx. ${PLACA_MAX_TICKS} = 1,5 s)`);
        if (!PLACAS[t.lutador]) e(`${p.id}: placa de "${t.lutador}" sem texto`);
      }
    }
  }
  for (const id of IDS_LUTADORES) {
    const pl = PLACAS[id];
    if (!pl) e(`${id}: lutador sem placa`);
    else if (pl.nome !== pl.nome.toLocaleUpperCase('pt-BR') || pl.pais !== pl.pais.toLocaleUpperCase('pt-BR')) e(`${id}: nome e país da placa em caixa alta`);
  }

  // --- retratos ---
  for (const p of r.planos) if (p.tipo === 'retratos' && p.ordem.length < 1) e(`${p.id}: montagem sem retratos`);

  // --- fotossensibilidade ---
  if (maiorFlashEm60() > MAX_FLASHES_EM_60) e(`mais de ${MAX_FLASHES_EM_60} flashes numa janela de 60 ticks`);
  let cheios = 0;
  for (let t = 0; t < DURACAO_TOTAL; t++) if (flashNoTick(t) >= 0.99) cheios++;
  if (cheios !== 1) e(`${cheios} flashes de tela cheia (esperado exatamente 1)`);
  if (flashNoTick(TICK_DO_FLASH) < 0.99) e('o flash de tela cheia deveria ser no c24.1');

  // --- versão estática ---
  const est = r.estatica;
  const duracaoEst = est.quadros.length * est.ticksPorQuadro;
  if (duracaoEst > 600) e(`versão estática de ${duracaoEst} ticks (máx. 600 = 10 s)`);
  if (est.quadros.length !== est.compassosDaMusica.length) e('a versão estática precisa de um compasso de música por quadro');
  est.quadros.forEach((q, i) => {
    if (q.titulo !== undefined && TEXTOS[q.titulo].length > TITULO_MAX) e(`estática[${i}]: título longo demais`);
    if (q.lutadores.length > 2) e(`estática[${i}]: no máximo 2 lutadores por quadro`);
  });
  return erros;
}

/** Ticks do plano onde o foco da câmera troca (o corte seco). */
export function cortesDeFoco(camera: readonly { readonly t: number; readonly foco: string }[]): number[] {
  const r: number[] = [];
  for (let i = 1; i < camera.length; i++) if ((camera[i] as { foco: string }).foco !== (camera[i - 1] as { foco: string }).foco) r.push((camera[i] as { t: number }).t);
  return r;
}

export function exigirRoteiroValido(r: RoteiroDoTrailer, tomadas: TomadasDoTrailer, o: OpcoesDaValidacao = {}): void {
  const erros = validarRoteiro(r, tomadas, o);
  if (erros.length) throw new Error(`roteiro do trailer inválido:\n  ${erros.join('\n  ')}`);
}
