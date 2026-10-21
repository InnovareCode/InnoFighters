import { describe, it } from 'vitest';
import type { EventoLuta, IdLutador } from '../../src/core/contratos';
import { IDS_LUTADORES } from '../../src/core/contratos';
import type { ContextoSonoro } from '../../src/audio/identidade-sonora';
import { LUTADORES } from '../../src/data/lutadores';
import { ASSINATURAS } from '../../src/data/sons';
import { renderGenerico, renderPlano, picoNoBarramento } from '../support/plano';

describe.runIf(process.env['SONS_DIAG'] === '1')('diagnóstico de volume', () => {
  it('RMS novo - RMS do genérico, por categoria', () => {
    const ctx = (id: IdLutador): ContextoSonoro => ({ ids: [id, id === 'caio' ? 'hayato' : 'caio'], fichas: [null, null], semente: 11, tick: 100 });
    const ctxD = (id: IdLutador): ContextoSonoro => ({ ids: [id === 'caio' ? 'hayato' : 'caio', id], fichas: [null, null], semente: 11, tick: 100 });
    const TXT = { x: 0, y: 0, s: '', col: '', size: 1 };
    const hit = (o: object): EventoLuta => ({ tipo: 'hit', atacante: 0, defensor: 1, x: 0, y: 0, cor: '', grande: false, snd: 'punch', pitch: 1, contragolpe: false, projetil: false, acertos: 1, texto: null, dano: 5, ...o }) as EventoLuta;
    for (const id of IDS_LUTADORES) {
      const p = LUTADORES[id].pitch;
      const sp = Object.keys(ASSINATURAS).find((k) => k.startsWith(`${id}.base.`) && ASSINATURAS[k]?.grito) as string;
      const golpe = sp.split('.')[2] as string;
      const linhas: string[] = [];
      const cmp = (nome: string, novo: { d: { rmsAtivoDb: number; picoAbs: number } }, gen: { d: { rmsAtivoDb: number } }, extra = ''): void => {
        linhas.push(`${nome} ${(novo.d.rmsAtivoDb - gen.d.rmsAtivoDb).toFixed(1)} dB${extra}`);
      };
      const esp = renderPlano({ tipo: 'special', lutador: 0, pitch: p, golpe, ficha: null, momento: 'inicio' }, ctx(id));
      cmp('special', esp, renderGenerico((a) => a.special(p)), ` (pico ${picoNoBarramento(esp).toFixed(2)})`);
      const leve = renderPlano(hit({}), ctxD(id), undefined, 'so-voz');
      cmp('leve', leve, renderGenerico((a) => a.hurt(p)), ` (pico ${picoNoBarramento(leve).toFixed(2)})`);
      const pes = renderPlano(hit({ grande: true }), ctxD(id), undefined, 'so-voz');
      linhas.push(`pesado-leve ${(pes.d.rmsAtivoDb - leve.d.rmsAtivoDb).toFixed(1)} dB`);
      const ko = renderPlano({ tipo: 'ko', defensor: 1, pitch: p }, ctxD(id));
      cmp('ko', ko, renderGenerico((a) => a.ko(p)), ` (pico ${picoNoBarramento(ko).toFixed(2)})`);
      const proj = Object.entries(ASSINATURAS).find(([k, a]) => k.startsWith(`${id}.base.`) && a.lancamento);
      if (proj) {
        const g = proj[0].split('.')[2] as string;
        const lan = renderPlano({ tipo: 'projectile', lutador: 0, x: 0, y: 0, style: proj[1].estilo as never }, ctx(id));
        cmp('lanç', lan, renderGenerico((a) => a.fireballLaunch()));
        const imp = renderPlano(hit({ especial: true, golpe: g, projetil: true, snd: 'fireballHit' }), ctx(id), undefined, 'sem-voz');
        cmp('impacto', imp, renderGenerico((a) => a.fireballHit()), ` (pico ${picoNoBarramento(imp).toFixed(2)})`);
      }
      void TXT;
      console.log(`VOL ${id}: ${linhas.join(' | ')}`);
    }
  }, 300000);
});
