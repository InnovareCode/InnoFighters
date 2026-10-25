/** Espião do `AudioContext` injetado ANTES do código da página (`page.addInitScript(ESPIAO)`): guarda os contextos criados e conta fontes, osciladores e falhas de decodificação em `window.__aud`. Só observa. */
export const ESPIAO = `(() => {
  const L = (window.__aud = { ctxs: [], decodeOk: 0, decodeErr: [], fontes: 0, osc: 0 });
  const Orig = window.AudioContext || window.webkitAudioContext;
  if (!Orig) return;
  function Espia(...a) {
    const c = new Orig(...a);
    L.ctxs.push(c);
    const oc = c.createBufferSource.bind(c); c.createBufferSource = () => { L.fontes++; return oc(); };
    const oo = c.createOscillator.bind(c); c.createOscillator = () => { L.osc++; return oo(); };
    const od = c.decodeAudioData.bind(c);
    c.decodeAudioData = (buf, ok, err) => { const p = od(buf, ok, err); p.then(() => L.decodeOk++, (e) => L.decodeErr.push(String(e))); return p; };
    return c;
  }
  Espia.prototype = Orig.prototype;
  window.AudioContext = Espia;
  if (window.webkitAudioContext) window.webkitAudioContext = Espia;
})();`;
