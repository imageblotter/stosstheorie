'use strict';
/* Abschnitt 1 (Intro) und Abschnitt 3 (Labor) */

(() => {
  /* ---- Intro ---- */
  const ic = $('introCanvas');
  const isim = Runner.add(new Sim(ic, { nA: 18, nB: 18, T: 330, Ea: 1.8, alpha: 80, recycle: true, speed: 2 }), ic);
  setInterval(() => {
    const s = isim.stat;
    $('iAB').textContent = s.ab;
    $('iEff').textContent = s.eff;
    $('iPct').textContent = s.ab ? Math.round(100 * s.eff / s.ab) + ' %' : '–';
  }, 300);

  /* ---- Labor ---- */
  const mc = $('mainCanvas');
  const sim = Runner.add(new Sim(mc, { nA: 30, nB: 30, T: 300, Ea: 1.5, alpha: 90, speed: 3 }), mc);

  bind('mT', v => v + ' K', v => sim.setT(v));
  bind('mN', v => v, v => { sim.nA = sim.nB = v; sim.reset(); });
  bind('mV', v => v + ' %', v => sim.setVol(v / 100));
  bind('mEa', v => v.toFixed(1) + ' kT', v => { sim.Ea = v; });
  $('mCat').addEventListener('change', e => { sim.catalyst = e.target.checked; });
  $('mOr').addEventListener('change', e => { sim.useOrient = e.target.checked; });
  $('mSpeed').addEventListener('change', e => { sim.speed = +e.target.value; });
  $('mPause').addEventListener('click', e => {
    sim.paused = !sim.paused;
    e.target.textContent = sim.paused ? '▶ Weiter' : '⏸ Pause';
  });
  $('mReset').addEventListener('click', () => sim.reset());

  setInterval(() => {
    const r = sim.rates(), s = sim.stat;
    $('sAB').textContent = r.ab.toFixed(1);
    $('sEff').textContent = r.eff.toFixed(2);
    $('sPct').textContent = s.ab ? Math.round(100 * s.eff / s.ab) + ' %' : '–';
    $('sC').textContent = sim.count('C');
  }, 300);

  const cc = $('mainChart');
  Runner.add({
    tick() {
      const h = sim.hist;
      lineChart(cc, 600, 260, {
        series: [{ d: h.A, color: COL.A, name: 'A' }, { d: h.B, color: COL.B, name: 'B' }, { d: h.C, color: COL.C, name: 'C (Produkt)' }],
        dt: 0.25, xLabel: 'Zeit t (s)', yLabel: 'Teilchenzahl'
      });
    }
  }, cc);
})();
