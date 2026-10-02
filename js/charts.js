'use strict';
/* Diagramme: Liniendiagramm, Maxwell-Boltzmann-Verteilung, Energieprofil */

const AX = '#93a0bd', GRID = 'rgba(147,160,189,.18)', TXT = '#c9d3ea';

function niceMax(v) {
  if (v <= 0) return 1;
  const e = Math.pow(10, Math.floor(Math.log10(v))), f = v / e;
  return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10) * e;
}

function frame(ctx, W, H, p, xLabel, yLabel) {
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0e1526'; ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = AX; ctx.lineWidth = 1.2;
  ctx.beginPath(); ctx.moveTo(p.l, p.t); ctx.lineTo(p.l, H - p.b); ctx.lineTo(W - p.r, H - p.b); ctx.stroke();
  ctx.fillStyle = TXT; ctx.font = '12px system-ui,sans-serif';
  ctx.textAlign = 'right'; ctx.textBaseline = 'top';
  ctx.fillText(xLabel, W - p.r, H - 16);
  ctx.save(); ctx.translate(13, p.t + 2); ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'right'; ctx.fillText(yLabel, 0, 0); ctx.restore();
}

/* Zeitverlauf mehrerer Größen */
function lineChart(canvas, W, H, o) {
  const ctx = fit(canvas, W, H), p = { l: 46, r: 14, t: 14, b: 30 };
  frame(ctx, W, H, p, o.xLabel || 't', o.yLabel || '');
  let n = 0, mx = 0;
  o.series.forEach(s => { n = Math.max(n, s.d.length); s.d.forEach(v => { if (v > mx) mx = v; }); });
  const tmax = Math.max(o.tMin || 20, n * o.dt), ymax = o.yMax || niceMax(mx * 1.05);
  const X = t => p.l + (t / tmax) * (W - p.l - p.r), Y = v => H - p.b - (v / ymax) * (H - p.t - p.b);
  ctx.font = '11px system-ui,sans-serif'; ctx.fillStyle = AX;
  for (let i = 0; i <= 4; i++) {
    const v = ymax * i / 4, y = Y(v);
    ctx.strokeStyle = GRID; ctx.beginPath(); ctx.moveTo(p.l, y); ctx.lineTo(W - p.r, y); ctx.stroke();
    ctx.textAlign = 'right'; ctx.textBaseline = 'middle'; ctx.fillText(Math.round(v * 10) / 10, p.l - 5, y);
  }
  const tstep = niceMax(tmax / 5) / (tmax / 5 > niceMax(tmax / 5) * 0.7 ? 1 : 2);
  ctx.textAlign = 'center'; ctx.textBaseline = 'top';
  for (let t = 0; t <= tmax; t += tstep) ctx.fillText(Math.round(t), X(t), H - p.b + 4);
  o.series.forEach((s, k) => {
    ctx.strokeStyle = s.color; ctx.lineWidth = 2.2; ctx.beginPath();
    s.d.forEach((v, i) => { i ? ctx.lineTo(X(i * o.dt), Y(v)) : ctx.moveTo(X(0), Y(v)); });
    ctx.stroke();
    ctx.fillStyle = s.color; ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'middle';
    ctx.fillRect(W - p.r - 110 + 0, p.t + 9 + k * 16 - 2, 14, 4);
    ctx.fillText(s.name, W - p.r - 90, p.t + 9 + k * 16);
  });
}

/* Maxwell-Boltzmann-Energieverteilung (3D), Energie in Einheiten kT(300 K) */
const mbf = (E, kT) => 1.1284 * Math.sqrt(E) * Math.pow(kT, -1.5) * Math.exp(-E / kT);
function tailFraction(Ea, kT) {
  let s = 0; const dE = 0.01;
  for (let E = Ea + dE / 2; E < Ea + 40 * kT; E += dE) s += mbf(E, kT) * dE;
  return s;
}

function drawMaxwell(canvas, W, H, T, Ea) {
  const ctx = fit(canvas, W, H), p = { l: 46, r: 14, t: 16, b: 32 }, Emax = 10, ymax = 0.55;
  frame(ctx, W, H, p, 'Energie E der Teilchen →', 'Anteil der Teilchen');
  const X = E => p.l + E / Emax * (W - p.l - p.r), Y = v => H - p.b - v / ymax * (H - p.t - p.b);
  const curve = (kT, color, shade) => {
    if (shade) {
      ctx.fillStyle = shade; ctx.beginPath(); ctx.moveTo(X(Ea), Y(0));
      for (let E = Ea; E <= Emax; E += 0.05) ctx.lineTo(X(E), Y(mbf(E, kT)));
      ctx.lineTo(X(Emax), Y(0)); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = color; ctx.lineWidth = 2.4; ctx.beginPath();
    for (let E = 0.01; E <= Emax; E += 0.05) E < 0.02 ? ctx.moveTo(X(E), Y(mbf(E, kT))) : ctx.lineTo(X(E), Y(mbf(E, kT)));
    ctx.stroke();
  };
  curve(1, '#4cc9f0', 'rgba(76,201,240,.28)');
  const kT = T / 300;
  if (Math.abs(T - 300) > 1) curve(kT, '#ff6b6b', 'rgba(255,107,107,.30)');
  ctx.strokeStyle = '#ffd166'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
  ctx.beginPath(); ctx.moveTo(X(Ea), Y(0)); ctx.lineTo(X(Ea), Y(ymax * .93)); ctx.stroke(); ctx.setLineDash([]);
  ctx.fillStyle = '#ffd166'; ctx.font = '600 13px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'top';
  ctx.fillText('E_A', X(Ea) + 5, Y(ymax * .96));
  ctx.font = '12px system-ui,sans-serif';
  ctx.fillStyle = '#4cc9f0'; ctx.fillText('300 K', W - p.r - 90, p.t + 2);
  if (Math.abs(T - 300) > 1) { ctx.fillStyle = '#ff6b6b'; ctx.fillText(Math.round(T) + ' K', W - p.r - 90, p.t + 18); }
}

/* Energieprofil einer Reaktion mit/ohne Katalysator, laufende Punkte zeigen den Weg */
function drawProfile(canvas, W, H, Ea, tt) {
  const ctx = fit(canvas, W, H), p = { l: 46, r: 16, t: 16, b: 32 };
  frame(ctx, W, H, p, 'Reaktionsverlauf →', 'Energie');
  const R = 1, P = 0.3, ymax = R + Ea + 0.5;
  const X = x => p.l + x * (W - p.l - p.r), Y = e => H - p.b - e / ymax * (H - p.t - p.b);
  const prof = (x, ea) => {
    const s = x * x * (3 - 2 * x), base = R + (P - R) * s, h = R + ea - (R + P) / 2;
    return base + h * Math.exp(-(((x - .5) / .16) ** 2));
  };
  const path = (ea, color, dash) => {
    ctx.strokeStyle = color; ctx.lineWidth = 3; ctx.setLineDash(dash || []); ctx.beginPath();
    for (let i = 0; i <= 120; i++) { const x = i / 120; i ? ctx.lineTo(X(x), Y(prof(x, ea))) : ctx.moveTo(X(x), Y(prof(x, ea))); }
    ctx.stroke(); ctx.setLineDash([]);
  };
  ctx.strokeStyle = GRID; ctx.setLineDash([3, 4]); ctx.beginPath(); ctx.moveTo(p.l, Y(R)); ctx.lineTo(W - p.r, Y(R)); ctx.stroke(); ctx.setLineDash([]);
  path(Ea, '#ff8fa3'); path(Ea / 2, '#7bd88f');
  const arrow = (x, e0, e1, color, label, side) => {
    ctx.strokeStyle = color; ctx.fillStyle = color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(X(x), Y(e0)); ctx.lineTo(X(x), Y(e1)); ctx.stroke();
    const d = e1 > e0 ? 1 : -1;
    ctx.beginPath(); ctx.moveTo(X(x), Y(e1)); ctx.lineTo(X(x) - 5, Y(e1) + 9 * d); ctx.lineTo(X(x) + 5, Y(e1) + 9 * d); ctx.fill();
    ctx.font = '600 12px system-ui,sans-serif'; ctx.textBaseline = 'middle';
    ctx.textAlign = side > 0 ? 'left' : 'right';
    ctx.fillText(label, X(x) + 8 * side, Y((e0 + e1) / 2));
  };
  arrow(.5 - .2, R, R + Ea, '#ff8fa3', 'E_A (ohne Kat.)', -1);
  arrow(.5 + .2, R, R + Ea / 2, '#7bd88f', 'E_A (mit Kat.)', 1);
  ctx.fillStyle = TXT; ctx.font = '12px system-ui,sans-serif'; ctx.textAlign = 'left'; ctx.textBaseline = 'bottom';
  ctx.fillText('Edukte A + B', X(0) + 4, Y(R) - 22);
  ctx.textAlign = 'right'; ctx.fillText('Produkt C', X(1) - 4, Y(P) - 10);
  const dot = (ea, color, phase) => {
    let x = ((tt * .18 + phase) % 1);
    x = x * x * (3 - 2 * x);
    sphere(ctx, X(x), Y(prof(x, ea)), 8, color);
  };
  dot(Ea, '#ff8fa3', 0); dot(Ea / 2, '#7bd88f', 0.0);
}
