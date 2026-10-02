'use strict';
/* Abschnitt 2 (Bedingungen, geskriptete Szenen) und Abschnitt 4 (Faktoren) */

/* ================= Abschnitt 2: geskriptete Szenen ================= */
(() => {
  const R = 16, LOOP = 7;

  function arrow(ctx, x, y, len, color) {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2.5;
    const d = Math.sign(len);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x + len + 7 * d, y); ctx.lineTo(x + len, y - 5); ctx.lineTo(x + len, y + 5); ctx.fill();
  }

  /* c: cx, cy, d (Startabstand), out (react|bounce|miss), thA, thB, dy, label, good */
  function lane(ctx, u, c) {
    const e = Math.min(1, u / 0.5);
    let xa, xb, ya = c.cy, yb = c.cy + (c.dy || 0);
    const alpha = Math.min(1, u / 0.07) * Math.min(1, (1 - u) / 0.12);
    if (c.out === 'miss') {
      const span = R + c.d;
      xa = c.cx - span + 2 * span * u; xb = c.cx + span - 2 * span * u;
    } else if (u < 0.5) {
      xa = c.cx - R - c.d * (1 - e); xb = c.cx + R + c.d * (1 - e);
    } else if (c.out === 'bounce') {
      const e2 = (u - 0.5) / 0.5;
      xa = c.cx - R - c.d * e2; xb = c.cx + R + c.d * e2;
    }
    const ctxA = ctx; ctxA.globalAlpha = alpha;
    const contact = c.out !== 'miss' && u >= 0.5;
    if (c.out === 'react' && contact) {
      const k = (u - 0.5) / 0.5, x = c.cx + k * 40;
      const pulse = 1 + 0.12 * Math.max(0, 1 - k * 4);
      sphere(ctx, x, c.cy, R * 1.5 * pulse, COL.C);
      ctx.fillStyle = 'rgba(8,12,28,.8)'; ctx.font = '700 22px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('C', x, c.cy + 3);
    } else {
      const wob = contact ? Math.sin((u - 0.5) * 40) * 0.15 : 0;
      drawMol(ctx, xa, ya, R, 'A', c.thA + wob);
      drawMol(ctx, xb, yb, R, 'B', c.thB - wob);
      if (u < 0.45) {
        arrow(ctx, xa + R + 4, ya - R - 8, 10 + c.d * 0.28, '#dfe6f7');
        arrow(ctx, xb - R - 4, yb - R - 8, -(10 + c.d * 0.28), '#dfe6f7');
      }
    }
    if (contact && c.out === 'react') {
      ctx.globalAlpha = alpha;
      reactionEcho(ctx, c.cx, c.cy, Math.min(1, (u - 0.5) / 0.4), 0);
    } else if (contact && u < 0.75) {
      const k = (u - 0.5) / 0.25;
      ctx.globalAlpha = alpha * (1 - k);
      ctx.strokeStyle = c.ring; ctx.lineWidth = 3;
      circle(ctx, c.cx, c.cy, R + 4 + k * 34); ctx.stroke();
    }
    ctx.globalAlpha = alpha * Math.min(1, Math.max(0, (u - 0.5) / 0.12));
    ctx.fillStyle = c.good ? COL.react : c.ring || '#ffd166';
    ctx.font = '600 14px system-ui'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(c.label, c.cx, c.cy + 72);
    ctx.globalAlpha = 1;
  }

  function scene(id, lanes) {
    const cv = $(id);
    let t = 0;
    Runner.add({
      tick(dt) {
        t += dt;
        const u = (t % LOOP) / LOOP, ctx = fit(cv, 360, 300);
        ctx.fillStyle = '#0e1526'; ctx.fillRect(0, 0, 360, 300);
        ctx.strokeStyle = 'rgba(147,160,189,.2)'; ctx.beginPath(); ctx.moveTo(20, 155); ctx.lineTo(340, 155); ctx.stroke();
        lanes.forEach(l => lane(ctx, u, Object.assign({ cx: 180, thA: 0, thB: Math.PI }, l)));
      }
    }, cv);
  }

  scene('sc1', [
    { cy: 65, d: 120, out: 'react', label: '✓ Zusammenstoß → Reaktion', good: true },
    { cy: 205, d: 120, out: 'miss', dy: 2 * R + 10, label: '✗ Vorbeiflug → nichts passiert', ring: '#9aa7c2' }
  ]);
  scene('sc2', [
    { cy: 65, d: 130, out: 'react', label: '✓ E ≥ E_A → Reaktion', good: true },
    { cy: 205, d: 45, out: 'bounce', label: '✗ E < E_A → prallt ab', ring: COL.lowE }
  ]);
  scene('sc3', [
    { cy: 65, d: 110, out: 'react', label: '✓ Stellen treffen sich → Reaktion', good: true },
    { cy: 205, d: 110, out: 'bounce', thA: -Math.PI / 2, thB: 0, label: '✗ falsch orientiert → prallt ab', ring: COL.badO }
  ]);
})();

/* ================= 4.1 Konzentration / Druck ================= */
(() => {
  const opt = { nA: 10, nB: 10, Ea: 1, alpha: 90, recycle: true, speed: 2 };
  const cl = $('kcL'), cr = $('kcR');
  const L = Runner.add(new Sim(cl, opt), cl.closest('.duo')), R = Runner.add(new Sim(cr, opt), cl.closest('.duo'));

  bind('kcN', v => v, v => { R.nA = R.nB = v; R.reset(); });
  bind('kcV', v => v + ' %', v => R.setVol(v / 100));

  setInterval(() => {
    const a = L.rates(), b = R.rates();
    $('kcL-ab').textContent = a.ab.toFixed(1); $('kcL-rx').textContent = a.eff.toFixed(2);
    $('kcR-ab').textContent = b.ab.toFixed(1); $('kcR-rx').textContent = b.eff.toFixed(2);
    const conc = (R.nA / R.vol) / (L.nA / L.vol);
    $('kcInfo').innerHTML = `Konzentration im Vergleich zur Referenz: <strong>${conc.toFixed(1)}×</strong> &nbsp;·&nbsp; theoretisch ${(conc * conc).toFixed(1)}× so viele Stöße (∝ c(A)·c(B)).`;
  }, 400);
})();

/* ================= 4.2 Temperatur ================= */
(() => {
  const cs = $('tSim'), cc = $('tChart');
  const sim = Runner.add(new Sim(cs, { nA: 25, nB: 25, Ea: 1.5, alpha: 90, recycle: true, speed: 2, colorBySpeed: true }), cs);
  let T = 300, Ea = 1.5;
  const upd = () => {
    const f0 = tailFraction(Ea, 1), f1 = tailFraction(Ea, T / 300);
    $('tF0').textContent = (100 * f0).toFixed(1) + ' %';
    $('tF1').textContent = (100 * f1).toFixed(1) + ' %';
    $('tX').textContent = '× ' + (f1 / f0).toFixed(1);
  };
  bind('tT', v => v + ' K', v => { T = v; sim.setT(v); upd(); });
  bind('tEa', v => v.toFixed(1) + ' kT', v => { Ea = v; sim.Ea = v; upd(); });
  upd();
  Runner.add({ tick() { drawMaxwell(cc, 600, 400, T, Ea); } }, cc);
  setInterval(() => {
    const r = sim.rates();
    $('tAB').textContent = r.ab.toFixed(1);
    $('tEff').textContent = r.eff.toFixed(2);
    $('tPct').textContent = sim.stat.ab ? Math.round(100 * sim.stat.eff / sim.stat.ab) + ' %' : '–';
  }, 400);

  /* Arrhenius-Rechner */
  const calc = () => {
    const Ea = +$('arEa').value * 1000, T1 = +$('arT1').value, T2 = +$('arT2').value;
    $('arRes').textContent = Math.exp(Ea / 8.314 * (1 / T1 - 1 / T2)).toFixed(2);
  };
  bind('arEa', v => v + ' kJ/mol', calc);
  bind('arT1', v => v + ' K', calc);
  bind('arT2', v => v + ' K', calc);
  calc();
})();

/* ================= 4.3 Zerteilungsgrad ================= */
(() => {
  const cl = $('zL'), cr = $('zR'), cc = $('zChart');
  const L = Runner.add(new SolidSim(cl, { pieces: 1 }), cl.closest('.duo'));
  const R = Runner.add(new SolidSim(cr, { pieces: 9 }), cl.closest('.duo'));
  const names = { 1: 'ein großer Block', 2: '4 Stücke', 3: '9 Stücke', 4: '16 Stücke' };
  const setPieces = n => { R.pieces = n * n; R.reset(); L.reset(); $('zR-h').textContent = 'Zerteilt in ' + names[n]; };
  bind('zZ', v => names[v], setPieces);
  setPieces(3);
  $('zReset').addEventListener('click', () => { L.reset(); R.reset(); });
  setInterval(() => {
    $('zL-p').textContent = Math.round(L.consumed) + ' %';
    $('zR-p').textContent = Math.round(R.consumed) + ' %';
  }, 300);
  Runner.add({
    tick() {
      lineChart(cc, 600, 260, {
        series: [{ d: L.hist, color: '#aab4cf', name: 'ein Block' }, { d: R.hist, color: COL.C, name: 'zerteilt' }],
        dt: 0.5, tMin: 40, yMax: 100, xLabel: 'Zeit t (s)', yLabel: 'umgesetzt (%)'
      });
    }
  }, cc);
})();

/* ================= 4.4 Katalysator ================= */
(() => {
  const cl = $('kaL'), cr = $('kaR'), cc = $('kaChart');
  const opt = { nA: 22, nB: 22, T: 300, Ea: 2.5, alpha: 90, recycle: true, speed: 2 };
  const L = Runner.add(new Sim(cl, opt), cl.closest('.duo'));
  const R = Runner.add(new Sim(cr, Object.assign({ catalyst: true }, opt)), cl.closest('.duo'));
  let Ea = 2.5, tt = 0;
  bind('kaEa', v => v.toFixed(1) + ' kT', v => { Ea = v; L.Ea = R.Ea = v; });
  Runner.add({ tick(dt) { tt += dt; drawProfile(cc, 600, 300, Ea, tt); } }, cc);
  setInterval(() => {
    for (const [s, k] of [[L, 'kaL'], [R, 'kaR']]) {
      $(k + '-pct').textContent = s.stat.ab ? Math.round(100 * s.stat.eff / s.stat.ab) + ' %' : '–';
      $(k + '-rx').textContent = s.rates().eff.toFixed(2);
    }
  }, 400);
})();
