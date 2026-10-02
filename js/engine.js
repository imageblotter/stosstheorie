'use strict';
/* Teilchen-Engine für die Stoßtheorie-Simulationen.
   Energieeinheit: kT bei 300 K = 1.  Geschwindigkeit: S0 = Standardabweichung je Komponente bei 300 K. */

const TAU = Math.PI * 2;
const S0 = 90;
const COL = { solid: '#8a9cc4', A: '#4cc9f0', B: '#f9a03f', C: '#7bd88f', site: '#ff4d6d', react: '#7bd88f', lowE: '#ffd166', badO: '#b18cff' };

const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const $ = id => document.getElementById(id);
function gauss() {
  let u = 0;
  while (!u) u = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(TAU * Math.random());
}
function angDiff(a, b) {
  let d = (a - b) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return Math.abs(d);
}

/* Canvas auf CSS-Breite anpassen, logische Koordinaten W x H */
function fit(c, W, H) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pw = Math.round((c.clientWidth || W) * dpr);
  if (c.width !== pw) { c.width = pw; c.height = Math.round(pw * H / W); }
  const ctx = c.getContext('2d');
  const s = c.width / W;
  ctx.setTransform(s, 0, 0, s, 0, 0);
  return ctx;
}

/* Slider mit Ausgabe-Element (#id-o) verbinden */
function bind(id, fmt, cb) {
  const el = $(id), out = $(id + '-o');
  const show = () => { if (out) out.textContent = fmt(+el.value); };
  el.addEventListener('input', () => { show(); cb(+el.value); });
  show();
}

function circle(ctx, x, y, r) { ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); }

/* Glänzende 3D-Kugel: Grundfarbe + Licht von links oben, dunkler Rand, Glanzpunkt, Schlagschatten */
function sphere(ctx, x, y, r, fill, o = {}) {
  if (!o.noShadow) {
    ctx.fillStyle = 'rgba(0,0,0,.38)';
    circle(ctx, x + r * .24, y + r * .3, r * 1.02); ctx.fill();
  }
  ctx.fillStyle = fill; circle(ctx, x, y, r); ctx.fill();
  const g = ctx.createRadialGradient(x - r * .4, y - r * .45, r * .05, x - r * .12, y - r * .12, r * 1.25);
  g.addColorStop(0, 'rgba(255,255,255,.8)');
  g.addColorStop(.22, 'rgba(255,255,255,.28)');
  g.addColorStop(.5, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,35,.62)');
  ctx.fillStyle = g; circle(ctx, x, y, r); ctx.fill();
  const s = ctx.createRadialGradient(x - r * .42, y - r * .48, 0, x - r * .42, y - r * .48, r * .34);
  s.addColorStop(0, 'rgba(255,255,255,.95)'); s.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = s; circle(ctx, x - r * .42, y - r * .48, r * .34); ctx.fill();
}

/* Molekül zeichnen: 3D-Kugel, Buchstabe, roter Punkt = reaktive Stelle */
function drawMol(ctx, x, y, r, type, th, o = {}) {
  sphere(ctx, x, y, r, o.fill || COL[type]);
  if (!o.noLetter) {
    ctx.fillStyle = 'rgba(8,12,28,.8)';
    ctx.font = `700 ${Math.round(r * 1.05)}px system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(type, x + r * .05, y + r * .12);
  }
  if (th != null) {
    sphere(ctx, x + Math.cos(th) * r * .88, y + Math.sin(th) * r * .88, Math.max(2.6, r * .3), COL.site, { noShadow: true });
  }
}

/* Gemeinsamer Animations-Läufer: nur sichtbare Elemente werden aktualisiert */
const Runner = (() => {
  const items = new Map();
  const io = new IntersectionObserver(es => es.forEach(e => {
    (items.get(e.target) || []).forEach(it => { it.visible = e.isIntersecting; });
  }));
  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (!document.hidden) items.forEach(list => list.forEach(it => { if (it.visible) it.tick(dt); }));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
  return {
    /* el: beobachtetes Element (bei Vergleichs-Paaren der gemeinsame Container) */
    add(item, el) {
      item.visible = false;
      if (!items.has(el)) { items.set(el, []); io.observe(el); }
      items.get(el).push(item);
      return item;
    }
  };
})();

/* ---------------------------------------------------------------- Gas-Simulation */
class Sim {
  constructor(canvas, o = {}) {
    this.canvas = canvas;
    Object.assign(this, {
      W: 600, H: 400, nA: 25, nB: 25, T: 300, Ea: 2, alpha: 80, useOrient: true,
      recycle: false, colorBySpeed: false, catalyst: false, speed: 1, r: 8, vol: 1, paused: false
    }, o);
    this.reset();
  }
  reset() {
    this.t = 0; this.acc = 0; this.ps = []; this.flashes = []; this.pending = [];
    this.stat = { ab: 0, eff: 0, eE: 0, eO: 0 };
    this.evAB = []; this.evEff = [];
    this.hist = { A: [], B: [], C: [] }; this.nextH = 0;
    for (let i = 0; i < this.nA; i++) this.spawn('A');
    for (let i = 0; i < this.nB; i++) this.spawn('B');
  }
  eaEff() { return this.Ea * (this.catalyst ? 0.5 : 1); }
  mb() { const s = S0 * Math.sqrt(this.T / 300); return [gauss() * s, gauss() * s]; }
  spawn(type, x, y) {
    const r = this.r, wx = this.W * this.vol;
    let px = x, py = y;
    if (px == null) {
      for (let k = 0; k < 60; k++) {
        px = rand(r, wx - r); py = rand(r, this.H - r);
        if (!this.ps.some(p => (p.x - px) ** 2 + (p.y - py) ** 2 < (2 * r) ** 2)) break;
      }
    }
    const [vx, vy] = this.mb();
    const p = { x: px, y: py, vx, vy, type, th: rand(0, TAU), om: rand(-2.5, 2.5), r, dead: false };
    this.ps.push(p);
    return p;
  }
  setT(T) {
    const f = Math.sqrt(T / this.T);
    this.ps.forEach(p => { p.vx *= f; p.vy *= f; });
    this.T = T;
  }
  setVol(v) {
    this.vol = v;
    const wx = this.W * v - this.r;
    this.ps.forEach(p => { if (p.x > wx) p.x = wx; });
  }
  count(t) { let n = 0; for (const p of this.ps) if (p.type === t) n++; return n; }
  rates() {
    const w = 8, t = this.t, prune = a => { while (a.length && a[0] < t - w) a.shift(); };
    prune(this.evAB); prune(this.evEff);
    const span = Math.max(0.5, Math.min(w, t));
    return { ab: this.evAB.length / span, eff: this.evEff.length / span };
  }
  orientOK(a, b, nx, ny) {
    const al = this.alpha * Math.PI / 180, dir = Math.atan2(ny, nx);
    return angDiff(a.th, dir) < al && angDiff(b.th, dir + Math.PI) < al;
  }
  collide(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const d = Math.hypot(dx, dy) || 1e-6, nx = dx / d, ny = dy / d;
    const ov = (a.r + b.r - d) / 2;
    a.x -= nx * ov; a.y -= ny * ov; b.x += nx * ov; b.y += ny * ov;
    const vn = (a.vx - b.vx) * nx + (a.vy - b.vy) * ny;
    if (vn <= 0) return;
    if ((a.type === 'A' && b.type === 'B') || (a.type === 'B' && b.type === 'A')) {
      this.stat.ab++; this.evAB.push(this.t);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      const E = 0.25 * vn * vn / (S0 * S0);
      let kind = 'R';
      if (E < this.eaEff()) kind = 'E';
      else if (this.useOrient && !this.orientOK(a, b, nx, ny)) kind = 'O';
      const life = kind === 'R' ? 2.6 : 0.7;
      this.flashes.push({ x: mx, y: my, life, max: life, kind, ghost: this.recycle });
      if (kind === 'R') {
        this.stat.eff++; this.evEff.push(this.t);
        a.dead = b.dead = true;
        this.pending.push({ x: mx, y: my });
        if (this.onReact) this.onReact();
        return;
      }
      kind === 'E' ? this.stat.eE++ : this.stat.eO++;
      a.om = rand(-2.5, 2.5); b.om = rand(-2.5, 2.5);
    }
    a.vx -= vn * nx; a.vy -= vn * ny; b.vx += vn * nx; b.vy += vn * ny;
  }
  step(dt) {
    const ps = this.ps, wx = this.W * this.vol, H = this.H;
    for (const p of ps) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.th += p.om * dt;
      if (p.x < p.r) { p.x = p.r; p.vx = Math.abs(p.vx); }
      else if (p.x > wx - p.r) { p.x = wx - p.r; p.vx = -Math.abs(p.vx); }
      if (p.y < p.r) { p.y = p.r; p.vy = Math.abs(p.vy); }
      else if (p.y > H - p.r) { p.y = H - p.r; p.vy = -Math.abs(p.vy); }
    }
    const n = ps.length;
    for (let i = 0; i < n; i++) {
      const a = ps[i];
      if (a.dead) continue;
      for (let j = i + 1; j < n; j++) {
        const b = ps[j];
        if (b.dead) continue;
        const dx = b.x - a.x, dy = b.y - a.y, rr = a.r + b.r;
        if (dx * dx + dy * dy < rr * rr) { this.collide(a, b); if (a.dead) break; }
      }
    }
    if (this.pending.length) {
      this.ps = ps.filter(p => !p.dead);
      for (const q of this.pending) {
        if (this.recycle) { this.spawn('A'); this.spawn('B'); }
        else { const c = this.spawn('C', q.x, q.y); c.r = this.r * 1.25; }
      }
      this.pending.length = 0;
    }
    this.t += dt;
    if (this.t >= this.nextH) {
      this.nextH += 0.25;
      const h = this.hist;
      h.A.push(this.count('A')); h.B.push(this.count('B')); h.C.push(this.count('C'));
    }
  }
  tick(dt) {
    if (!this.paused) {
      this.acc += dt * this.speed;
      const h = 1 / 120;
      while (this.acc >= h) { this.step(h); this.acc -= h; }
    }
    this.flashes.forEach(f => f.life -= dt);
    this.flashes = this.flashes.filter(f => f.life > 0);
    this.draw();
  }
  draw() {
    const { W, H } = this, ctx = fit(this.canvas, W, H), wx = W * this.vol;
    ctx.fillStyle = '#0e1526'; ctx.fillRect(0, 0, W, H);
    if (this.vol < 1) {
      ctx.fillStyle = '#1a2440'; ctx.fillRect(wx, 0, W - wx, H);
      ctx.fillStyle = '#93a6cc'; ctx.fillRect(wx, 0, 5, H);
      ctx.fillRect(wx + 5, H / 2 - 5, 24, 10);
    }
    for (const p of this.ps) {
      const o = {};
      if (this.colorBySpeed) {
        const f = Math.min(1, Math.hypot(p.vx, p.vy) / (S0 * 3.2));
        o.fill = `hsl(${Math.round(215 - 215 * f)} 85% 58%)`;
      }
      drawMol(ctx, p.x, p.y, p.r, p.type, (this.useOrient && p.type !== 'C') ? p.th : null, o);
    }
    for (const f of this.flashes) {
      const k = 1 - f.life / f.max;
      if (f.kind === 'R') reactionEcho(ctx, f.x, f.y, k, f.ghost ? this.r * 1.25 : 0);
      else {
        ctx.strokeStyle = f.kind === 'E' ? COL.lowE : COL.badO;
        ctx.globalAlpha = (1 - k) * .75; ctx.lineWidth = 1.8;
        circle(ctx, f.x, f.y, 10 + k * 16); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}

/* Wirksamer Stoß: Lichtblitz, drei nachhallende Ringe und (optional) aufsteigendes Produktteilchen. k = 0..1 */
function reactionEcho(ctx, x, y, k, ghostR, sc = 1) {
  ctx.save();
  const gl = Math.max(0, 1 - k * 2.4);
  if (gl > 0) {
    const g = ctx.createRadialGradient(x, y, 0, x, y, 64 * sc);
    g.addColorStop(0, `rgba(200,255,215,${.9 * gl})`); g.addColorStop(.4, `rgba(123,216,143,${.45 * gl})`); g.addColorStop(1, 'rgba(123,216,143,0)');
    ctx.fillStyle = g; circle(ctx, x, y, 64 * sc); ctx.fill();
  }
  ctx.shadowColor = COL.react; ctx.shadowBlur = 10; ctx.strokeStyle = COL.react;
  for (let i = 0; i < 3; i++) {
    const kk = k * 1.35 - i * .27;
    if (kk <= 0 || kk >= 1) continue;
    ctx.globalAlpha = Math.pow(1 - kk, 1.3); ctx.lineWidth = 4.5 - i * 1.2;
    circle(ctx, x, y, (12 + kk * (62 + i * 16)) * sc); ctx.stroke();
  }
  ctx.restore();
  if (ghostR) {
    ctx.save();
    ctx.globalAlpha = Math.min(1, k * 6) * Math.pow(1 - k, .7);
    const gy = y - k * 40;
    sphere(ctx, x, gy, ghostR, COL.C);
    ctx.fillStyle = 'rgba(8,12,28,.8)'; ctx.font = `700 ${Math.round(ghostR * 1.05)}px system-ui,sans-serif`;
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('C', x, gy + ghostR * .12);
    ctx.restore();
  }
}

/* ---------------------------------------------------------------- Feststoff-Simulation (Zerteilungsgrad) */
class SolidSim {
  constructor(canvas, o = {}) {
    this.canvas = canvas;
    Object.assign(this, { W: 400, H: 300, pieces: 1, nGas: 50, T: 300, Ea: 1.2, p: 0.5, speed: 2, r: 6, cell: 12 }, o);
    this.reset();
  }
  reset() {
    const { W, H, cell: c } = this;
    this.t = 0; this.acc = 0; this.flashes = []; this.cells = []; this.hist = []; this.nextH = 0;
    const n = Math.round(Math.sqrt(this.pieces)), m = 12 / n;
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
      const x0 = (i + .5) * W / n - m * c / 2, y0 = (j + .5) * H / n - m * c / 2;
      for (let a = 0; a < m; a++) for (let b = 0; b < m; b++) this.cells.push({ x: x0 + a * c, y: y0 + b * c, alive: true });
    }
    this.total = this.alive = this.cells.length;
    this.gas = [];
    for (let k = 0; k < this.nGas; k++) this.spawnGas(true);
  }
  spawnGas(anywhere) {
    const r = this.r, s = S0 * Math.sqrt(this.T / 300);
    let x, y;
    for (let k = 0; k < 80; k++) {
      x = anywhere ? rand(r, this.W - r) : (Math.random() < .5 ? r + 1 : this.W - r - 1);
      y = rand(r, this.H - r);
      if (!this.cells.some(c => c.alive && x > c.x - 2 * r && x < c.x + this.cell + 2 * r && y > c.y - 2 * r && y < c.y + this.cell + 2 * r)) break;
    }
    const g = { x, y, vx: gauss() * s, vy: gauss() * s };
    if (!anywhere) g.vx = x < this.W / 2 ? Math.abs(g.vx) : -Math.abs(g.vx);
    this.gas.push(g);
    return g;
  }
  get consumed() { return 100 * (1 - this.alive / this.total); }
  step(dt) {
    const { W, H, r, cell: c } = this;
    for (let gi = 0; gi < this.gas.length; gi++) {
      const g = this.gas[gi];
      g.x += g.vx * dt; g.y += g.vy * dt;
      /* thermische Wände: Teilchen nehmen die Wandtemperatur an, sonst verarmt das Gas an schnellen Teilchen */
      const sg = S0 * Math.sqrt(this.T / 300), fl = () => sg * Math.sqrt(-2 * Math.log(1 - Math.random()));
      if (g.x < r) { g.x = r; g.vx = fl(); g.vy = gauss() * sg; } else if (g.x > W - r) { g.x = W - r; g.vx = -fl(); g.vy = gauss() * sg; }
      if (g.y < r) { g.y = r; g.vy = fl(); g.vx = gauss() * sg; } else if (g.y > H - r) { g.y = H - r; g.vy = -fl(); g.vx = gauss() * sg; }
      const rc = c / 2, rr = r + rc;
      for (const cl of this.cells) {
        if (!cl.alive) continue;
        const cx = cl.x + rc, cy = cl.y + rc, dx = g.x - cx, dy = g.y - cy;
        if (dx > rr || dx < -rr || dy > rr || dy < -rr) continue;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr) continue;
        let nx, ny, d = Math.sqrt(d2);
        if (d < 1e-6) { const sp = Math.hypot(g.vx, g.vy) || 1; nx = -g.vx / sp; ny = -g.vy / sp; d = 0; }
        else { nx = dx / d; ny = dy / d; }
        const qx = cx + nx * rc, qy = cy + ny * rc;
        const vn = g.vx * nx + g.vy * ny;
        if (vn < 0) {
          const E = 0.5 * vn * vn / (S0 * S0);
          if (E >= this.Ea && Math.random() < this.p) {
            cl.alive = false; this.alive--;
            this.flashes.push({ x: qx, y: qy, life: 2, max: 2, ok: true, cx, cy });
            this.gas.splice(gi, 1); this.spawnGas(false); gi--;
          } else {
            g.vx -= 2 * vn * nx; g.vy -= 2 * vn * ny;
            g.x += nx * (rr - d); g.y += ny * (rr - d);
            this.flashes.push({ x: qx, y: qy, life: .35, max: .35, ok: false });
          }
        }
        break;
      }
    }
    this.t += dt;
    if (this.t >= this.nextH) { this.nextH += 0.5; this.hist.push(this.consumed); }
  }
  tick(dt) {
    if (!this.paused) {
      this.acc += dt * this.speed;
      while (this.acc >= 1 / 120) { this.step(1 / 120); this.acc -= 1 / 120; }
    }
    this.flashes.forEach(f => f.life -= dt);
    this.flashes = this.flashes.filter(f => f.life > 0);
    this.draw();
  }
  draw() {
    const { W, H, cell: c } = this, ctx = fit(this.canvas, W, H);
    ctx.fillStyle = '#0e1526'; ctx.fillRect(0, 0, W, H);
    const rc = c / 2;
    for (const cl of this.cells) if (cl.alive) sphere(ctx, cl.x + rc, cl.y + rc, rc * .97, COL.solid);
    for (const g of this.gas) sphere(ctx, g.x, g.y, this.r, COL.B);
    for (const f of this.flashes) {
      const k = 1 - f.life / f.max;
      if (f.ok) {
        reactionEcho(ctx, f.cx, f.cy, k, 0, .55);
        const a = Math.max(0, 1 - k * 5);
        if (a > 0) { ctx.globalAlpha = a; sphere(ctx, f.cx, f.cy, rc * .97 * (1 + k * 1.5), COL.solid, { noShadow: true }); }
        ctx.globalAlpha = 1;
      } else {
        ctx.globalAlpha = (1 - k) * .7; ctx.strokeStyle = '#aab4cf'; ctx.lineWidth = 1.5;
        circle(ctx, f.x, f.y, 5 + k * 10); ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }
}
