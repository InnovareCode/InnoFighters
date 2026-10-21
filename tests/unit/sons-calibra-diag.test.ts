import { describe, it } from 'vitest';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import type { ContextoSonoro } from '../../src/audio/identidade-sonora';
import { LUTADORES } from '../../src/data/lutadores';
import { ASSINATURAS, DADOS_SONS, type AssinaturaEspecial, type DadosSons, type PerfilVocal } from '../../src/data/sons';
import { IDS_LUTADORES } from '../../src/core/contratos';
import { picoNoBarramento, renderGenerico, renderPlano, type Rendido } from '../support/plano';

/*
 * Ferramenta de AUTORIA (SONS_DIAG=1): mede e imprime os ganhos em dB (src/data/sons/calibracao.ts) que põem cada som novo a 0 dB (RMS da região ativa)
 * do som genérico que ele substitui (spec 6.3), com pico <= 0,68 no barramento sempre que isso custa no máximo 2,8 dB. Roda com a calibração ATUAL
 * zerada no objeto `dados` que ela monta (ignora o que já estiver em calibracao.ts).
 */
type Cat = 'kiai' | 'leve' | 'pesado' | 'guarda' | 'ko';
const limpaPerfil = (p: PerfilVocal): PerfilVocal => {
  const { ganhoDb: _g, ...resto } = p;
  return resto;
};
const limpaAss = (a: AssinaturaEspecial): AssinaturaEspecial => {
  const { ganhoDb: _g, ...resto } = a;
  return resto;
};
const BASE: DadosSons = {
  perfis: Object.fromEntries(Object.entries(DADOS_SONS.perfis).map(([k, p]) => [k, limpaPerfil(p)])),
  perfisPorFicha: DADOS_SONS.perfisPorFicha,
  assinaturas: Object.fromEntries(Object.entries(ASSINATURAS).map(([k, a]) => [k, limpaAss(a)])),
};
const dados = (id: IdLutador, ganhoPerfil: Partial<Record<Cat, number>>, chave?: string, ganhoAss?: AssinaturaEspecial['ganhoDb']): DadosSons => ({
  ...BASE,
  perfis: { ...BASE.perfis, [id]: { ...(BASE.perfis[id] as PerfilVocal), ganhoDb: ganhoPerfil } },
  assinaturas: chave ? { ...BASE.assinaturas, [chave]: { ...(BASE.assinaturas[chave] as AssinaturaEspecial), ...(ganhoAss ? { ganhoDb: ganhoAss } : {}) } } : BASE.assinaturas,
});

/** Procura o ganho (dB) que leva `medida(g).rms` a `alvo`; depois recua até o pico caber (no máximo 2,8 dB). */
function resolve(medida: (g: number) => Rendido, alvo: number, teto = 0.68): number {
  let lo = -40, hi = 20;
  for (let i = 0; i < 16; i++) {
    const m = (lo + hi) / 2;
    if (medida(m).d.rmsAtivoDb > alvo) hi = m; else lo = m;
  }
  let g = (lo + hi) / 2;
  const g0 = g;
  while (picoNoBarramento(medida(g)) > teto && g0 - g < 1.0) g -= 0.25;
  return Math.round(g * 10) / 10;
}

describe.runIf(process.env['SONS_DIAG'] === '1')('calibração de volume', () => {
  it('imprime calibracao.ts', () => {
    const perfis: string[] = [];
    const assin: string[] = [];
    const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
    for (const id of IDS_LUTADORES) {
      const p = LUTADORES[id].pitch;
      const outro: IdLutador = id === 'caio' ? 'hayato' : 'caio';
      const ctxA: ContextoSonoro = { ids: [id, outro], fichas: [null, null], semente: 11, tick: 100 };
      const ctxD: ContextoSonoro = { ids: [outro, id], fichas: [null, null], semente: 11, tick: 100 };
      const evLeve = { tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: p, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5 } as EventoLuta;
      const MARGEM = 1.0; // alvo 1 dB abaixo do genérico: sobra 2 dB para o pico baixar sem sair de ±3 dB
      const refS = renderGenerico((a) => a.special(p)).d.rmsAtivoDb - MARGEM;
      const refH = renderGenerico((a) => a.hurt(p)).d.rmsAtivoDb - MARGEM;
      const refG = renderGenerico((a) => a.fireballHit()).d.rmsAtivoDb - MARGEM;
      const refK = renderGenerico((a) => a.ko(p)).d.rmsAtivoDb - MARGEM;
      const refL = renderGenerico((a) => a.fireballLaunch()).d.rmsAtivoDb - MARGEM;
      const refP = renderGenerico((a) => a.punch()).d.rmsAtivoDb;
      const chaves = Object.keys(BASE.assinaturas).filter((k) => k.startsWith(`${id}.`));
      const golpeDe = (k: string): string => k.split('.')[2] as string;
      const fichaDe = (k: string): string | null => (k.split('.')[1] === 'base' ? null : (k.split('.')[1] as string));
      const evSp = (k: string): EventoLuta => ({ tipo: 'special', lutador: 0, pitch: p, golpe: golpeDe(k), ficha: fichaDe(k), momento: 'inicio' });
      const ctxF = (k: string): ContextoSonoro => ({ ...ctxA, fichas: [fichaDe(k), null] });
      // 1) kiai: o RMS médio do especial inteiro (grito + conjuração) das assinaturas com grito a 0 dB do special(p); depois o pico
      const comGrito = chaves.filter((k) => BASE.assinaturas[k]?.grito);
      const rmsMedio = (g: number): number => comGrito.reduce((m, k) => m + renderPlano(evSp(k), ctxF(k), dados(id, { kiai: g }, k), 'tudo').d.rmsAtivoDb, 0) / comGrito.length;
      const picoMax = (g: number): number => Math.max(...comGrito.map((k) => picoNoBarramento(renderPlano(evSp(k), ctxF(k), dados(id, { kiai: g }, k), 'tudo'))));
      let lo = -40, hi = 20;
      for (let i = 0; i < 16; i++) { const m = (lo + hi) / 2; if (rmsMedio(m) > refS) hi = m; else lo = m; }
      const k0 = (lo + hi) / 2;
      let kiai = k0;
      while (picoMax(kiai) > 0.68 && k0 - kiai < 1.0) kiai -= 0.25;
      kiai = Math.round(kiai * 10) / 10;
      // 2) leve = hurt; pesado = leve + 3; guarda; ko
      const leve = resolve((g) => renderPlano(evLeve, ctxD, dados(id, { leve: g }), 'so-voz'), refH);
      const leveRms = renderPlano(evLeve, ctxD, dados(id, { leve }), 'so-voz').d.rmsAtivoDb;
      const evPes = { ...evLeve, grande: true } as EventoLuta;
      const pesado = resolve((g) => renderPlano(evPes, ctxD, dados(id, { leve, pesado: g }), 'so-voz'), leveRms + 3);
      const evGuarda = { tipo: 'quebra-guarda', atacante: 0, defensor: 1, x: 0, y: 0, texto: TXT } as EventoLuta;
      const guarda = resolve((g) => renderPlano(evGuarda, ctxD, dados(id, { guarda: g }), 'tudo'), refG);
      const evKo = { tipo: 'ko', defensor: 1, pitch: p } as EventoLuta;
      const ko = resolve((g) => renderPlano(evKo, ctxD, dados(id, { ko: g }), 'tudo'), refK, 9);
      perfis.push(`  ${id.includes('-') ? `'${id}'` : id}: { kiai: ${kiai}, leve: ${leve}, pesado: ${pesado}, guarda: ${guarda}, ko: ${ko}, vitoria: ${kiai}, esforco: ${leve} },`);
      // 3) assinaturas
      for (const k of chaves) {
        const a = BASE.assinaturas[k] as AssinaturaEspecial;
        const gp = { kiai };
        let inicio: number | undefined;
        let lancamento: number | undefined;
        let estampa: number | undefined;
        if (a.grito) {
          const dif = renderPlano(evSp(k), ctxF(k), dados(id, gp, k), 'tudo').d.rmsAtivoDb - refS;
          if (Math.abs(dif) > 1.0) inicio = resolve((g) => renderPlano(evSp(k), ctxF(k), dados(id, gp, k, { inicio: g }), 'tudo'), refS, 0.68);
        }
        if (a.lancamento) {
          const evL = { tipo: 'projectile', lutador: 0, x: 0, y: 0, style: a.estilo } as EventoLuta;
          lancamento = resolve((g) => renderPlano(evL, ctxF(k), dados(id, gp, k, { lancamento: g }), 'tudo'), refL, 0.68);
        }
        if (a.estampa.length) {
          const projetil = a.lancamento !== undefined;
          const evH = { tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: projetil ? 'fireballHit' : 'punch', pitch: p, contragolpe: false, projetil, acertos: 1, texto: null, dano: 5, especial: true, golpe: golpeDe(k) } as EventoLuta;
          estampa = resolve((g) => renderPlano(evH, ctxF(k), dados(id, gp, k, { estampa: g }), 'sem-voz'), projetil ? refG : refP - 6, 0.68);
        }
        const partes = [inicio !== undefined ? `inicio: ${inicio}` : '', lancamento !== undefined ? `lancamento: ${lancamento}` : '', estampa !== undefined ? `estampa: ${estampa}` : ''].filter(Boolean);
        if (partes.length) assin.push(`  '${k}': { ${partes.join(', ')} },`);
      }
    }
    console.log(`CALPERFIS\n${perfis.join('\n')}\nCALASS\n${assin.join('\n')}`);
  }, 900000);
});
