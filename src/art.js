/* Turtle Brawl — vector art helpers. The game canvas is 960x540 drawn at 2x, so all art uses logical 480x270 units
 * with smooth shading, outlines and gradients instead of hard pixels. */
window.TB = window.TB || {};
(function (TB) {
  'use strict';
  var TAU = Math.PI * 2;
  TB.TAU = TAU;
  TB.hash = function (n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); };

  /* ---- colour ---- */
  function rgb(h) {
    if (h.charAt(0) === '#') { if (h.length === 4) h = '#' + h[1] + h[1] + h[2] + h[2] + h[3] + h[3]; var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
    var m = h.match(/[\d.]+/g); return [+m[0], +m[1], +m[2]];
  }
  function rgba(h, a) { var c = rgb(h); return 'rgba(' + Math.round(c[0]) + ',' + Math.round(c[1]) + ',' + Math.round(c[2]) + ',' + a + ')'; }
  function mix(a, b, t) { var x = rgb(a), y = rgb(b); return 'rgb(' + Math.round(x[0] + (y[0] - x[0]) * t) + ',' + Math.round(x[1] + (y[1] - x[1]) * t) + ',' + Math.round(x[2] + (y[2] - x[2]) * t) + ')'; }
  function lit(h, t) { return t >= 0 ? mix(h, '#ffffff', t) : mix(h, '#000000', -t); }
  TB.rgba = rgba; TB.mix = mix; TB.lit = lit;

  /* ---- gradients ---- */
  function lg(c, x0, y0, x1, y1, stops) { var g = c.createLinearGradient(x0, y0, x1, y1); for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]); return g; }
  function rg(c, x, y, r0, r1, stops) { var g = c.createRadialGradient(x, y, r0, x, y, r1); for (var i = 0; i < stops.length; i++) g.addColorStop(stops[i][0], stops[i][1]); return g; }
  TB.lg = lg; TB.rg = rg;
  /* simple 3-stop vertical shading: light top, base, dark bottom */
  function vshade(c, y0, y1, col, k) { k = k || 0.28; return lg(c, 0, y0, 0, y1, [[0, lit(col, k)], [0.55, col], [1, lit(col, -k)]]); }
  TB.vshade = vshade;

  /* ---- paths & shapes ---- */
  function fillStroke(c, fill, stroke, lw) {
    if (fill) { c.fillStyle = fill; c.fill(); }
    if (stroke) { c.strokeStyle = stroke; c.lineWidth = lw || 1; c.lineJoin = 'round'; c.lineCap = 'round'; c.stroke(); }
  }
  function poly(c, pts, fill, stroke, lw) {
    c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (var i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); fillStroke(c, fill, stroke, lw);
  }
  function ell(c, x, y, rx, ry, fill, stroke, lw, rot) { c.beginPath(); c.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, TAU); fillStroke(c, fill, stroke, lw); }
  function rrect(c, x, y, w, h, r, fill, stroke, lw) {
    r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); fillStroke(c, fill, stroke, lw);
  }
  function line(c, x0, y0, x1, y1, w, col) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.stroke(); }
  /* tapered capsule between two points */
  function limb(c, x0, y0, x1, y1, w0, w1, fill, stroke, lw) {
    var a = Math.atan2(y1 - y0, x1 - x0), nx = -Math.sin(a), ny = Math.cos(a);
    c.beginPath();
    c.moveTo(x0 + nx * w0 / 2, y0 + ny * w0 / 2); c.lineTo(x1 + nx * w1 / 2, y1 + ny * w1 / 2);
    c.arc(x1, y1, w1 / 2, a + Math.PI / 2, a - Math.PI / 2, true);
    c.lineTo(x0 - nx * w0 / 2, y0 - ny * w0 / 2);
    c.arc(x0, y0, w0 / 2, a - Math.PI / 2, a + Math.PI / 2, true);
    c.closePath(); fillStroke(c, fill, stroke, lw);
  }
  /* two-bone IK: returns knee/elbow (kx,ky) and the reachable end point (ex,ey). bend = +1 / -1 picks the side */
  function ik(x0, y0, x1, y1, l1, l2, bend) {
    var dx = x1 - x0, dy = y1 - y0, d = Math.min(Math.hypot(dx, dy), l1 + l2 - 0.02), a = Math.atan2(dy, dx);
    d = Math.max(d, Math.abs(l1 - l2) + 0.05);
    var A = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + d * d - l2 * l2) / (2 * l1 * d)))) * bend;
    return { kx: x0 + Math.cos(a + A) * l1, ky: y0 + Math.sin(a + A) * l1, ex: x0 + Math.cos(a) * d, ey: y0 + Math.sin(a) * d };
  }
  /* additive soft glow */
  function glow(c, x, y, r, col, a) {
    c.save(); c.globalCompositeOperation = 'lighter';
    c.fillStyle = rg(c, x, y, 0, r, [[0, rgba(col, a)], [1, rgba(col, 0)]]); c.fillRect(x - r, y - r, r * 2, r * 2); c.restore();
  }
  /* soft ground shadow */
  TB.drawShadow = function (c, x, y, hw, alpha) {
    c.save(); c.translate(x, y); c.scale(1, 0.3);
    c.fillStyle = rg(c, 0, 0, 0, hw * 1.15, [[0, 'rgba(0,0,0,' + (alpha || 0.4) * 1.5 + ')'], [0.6, 'rgba(0,0,0,' + (alpha || 0.4) + ')'], [1, 'rgba(0,0,0,0)']]);
    c.beginPath(); c.arc(0, 0, hw * 1.15, 0, TAU); c.fill(); c.restore();
  };

  /* legacy pixel helpers (still used by a few HUD-level effects) */
  TB.R = function (c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(x, y, w, h); };
  TB.pline = function (c, x, y, ang, len, w, col) { c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len); c.stroke(); };

  TB.art = { poly: poly, ell: ell, rrect: rrect, line: line, limb: limb, ik: ik, glow: glow, fs: fillStroke };
  TB.glowColors = function (en) { return en === 'none' ? ['#8fd0ff', '#e6f6ff', '#ffffff'] : TB.ENERGIES[en].colors; };
  TB.glow = TB.glowColors;
  TB.accent = '#2f5fbf';
  TB.OUT = '#0a1410';   // outline colour for characters
})(window.TB);
