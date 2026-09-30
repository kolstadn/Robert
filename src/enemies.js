/* Turtle Brawl — enemy sprites (vector art). Facing RIGHT, origin at the feet. */
(function (TB) {
  'use strict';
  var A = TB.art, poly = A.poly, ell = A.ell, rrect = A.rrect, line = A.line, limb = A.limb, ik = A.ik, glowAt = A.glow;
  var lg = TB.lg, rg = TB.rg, lit = TB.lit, mix = TB.mix, rgba = TB.rgba, OUT = TB.OUT, TAU = TB.TAU, hash = TB.hash;
  var E = {};

  TB.drawEnemy = function (c, e, x, y) {
    var down = e.state === 'down' || e.state === 'lying' || e.state === 'dying';
    c.save(); c.translate(x, y); if (e.face < 0) c.scale(-1, 1);
    if (down) { c.translate(-e.hw * 0.4, -e.hw * 0.7); c.rotate(-1.45); }
    e.limp = down;
    E[e.type](c, e, TB.G.time + e.seed);
    c.restore();
  };

  function fur(c, y0, y1, col) { return lg(c, 0, y0, 0, y1, [[0, lit(col, 0.3)], [0.5, col], [1, lit(col, -0.35)]]); }
  function hfur(c, x0, x1, col) { return lg(c, x0, 0, x1, 0, [[0, lit(col, -0.3)], [0.5, col], [1, lit(col, 0.28)]]); }
  function eye(c, x, y, r, col, pupil) { ell(c, x, y, r, r * 0.9, col, OUT, 0.5); ell(c, x + r * 0.25, y, r * 0.4, r * 0.55, pupil || '#111'); ell(c, x + r * 0.4, y - r * 0.3, r * 0.2, r * 0.2, '#fff'); }
  function claw(c, x, y, ang, len, col) { c.save(); c.translate(x, y); c.rotate(ang); poly(c, [[0, -1.1], [len, 0], [0, 1.1]], col || '#f2eedc', OUT, 0.4); c.restore(); }

  /* ------------------------------ RAT SCAVENGER ------------------------------ */
  E.rat = function (c, e, t) {
    var st = e.state, run = (st === 'circle' || st === 'lunge') ? Math.sin(t * 20) : 0, tele = st === 'tele', lunge = st === 'lunge', shake = tele ? Math.sin(t * 70) * 0.7 : 0;
    var FUR = '#84705f', FURD = '#5a4a3e';
    c.save(); c.translate(shake, -10); c.rotate(tele ? -0.4 : lunge ? 0.35 : e.limp ? 0 : 0.02);
    // tail
    var tw = Math.sin(t * 6) * 3; c.beginPath(); c.moveTo(-9, 3); c.bezierCurveTo(-15, 6 + tw, -20, -3, -26, 1 + tw); c.strokeStyle = OUT; c.lineWidth = 3.6; c.lineCap = 'round'; c.stroke(); c.strokeStyle = '#e0a4ac'; c.lineWidth = 2; c.stroke();
    // legs
    var lp = run * 4;
    limb(c, -5, 4, -6 + lp, 10, 5.4, 3.8, hfur(c, -9, -3, FURD), OUT, 0.8); ell(c, -4.6 + lp, 10.6, 3.4, 1.6, '#b48a86', OUT, 0.5);
    limb(c, 3, 5, 4 - lp, 10, 5.4, 3.8, hfur(c, 0, 6, FUR), OUT, 0.8); ell(c, 5.4 - lp, 10.6, 3.4, 1.6, '#c89a96', OUT, 0.5);
    // body
    ell(c, 0, 0, 10.4, 7.4, fur(c, -8, 8, FUR), OUT, 1, -0.15);
    ell(c, 1.4, 2.8, 6.4, 4, '#cdbcab');
    // vest + patch
    c.beginPath(); c.moveTo(-3, -6.6); c.lineTo(5.6, -6.4); c.lineTo(6.4, 4); c.lineTo(-4, 4.6); c.closePath(); c.fillStyle = lg(c, 0, -7, 0, 5, [[0, '#4a86bc'], [1, '#274e78']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.7; c.stroke();
    rrect(c, 0, -2.4, 3.2, 3.2, 0.5, '#c0402e', OUT, 0.4); line(c, 0, -2.4, 3.2, 0.8, 0.4, '#f0d8a8');
    // arm + shiv
    var aa = tele ? -1.9 : lunge ? -0.1 : -0.7 + Math.sin(t * 5) * 0.2, ax = 4 + Math.cos(aa) * 6.4, ay = -3 + Math.sin(aa) * 6.4;
    limb(c, 4, -3, ax, ay, 3.8, 3, hfur(c, 2, 10, FUR), OUT, 0.7); ell(c, ax, ay, 2.1, 2, '#c89a96', OUT, 0.5);
    c.save(); c.translate(ax, ay); c.rotate(aa + 0.3); poly(c, [[-1, -1.1], [10, -0.4], [12, 0.6], [-1, 1.4]], lg(c, 0, -1, 0, 2, [[0, '#f0f4f8'], [1, '#8a96a2']]), OUT, 0.5); rrect(c, -3.6, -1.6, 3.4, 3.2, 0.8, '#5a3a20', OUT, 0.4); c.restore();
    // head
    ell(c, 10, -3, 6.2, 5.2, fur(c, -8, 2, FUR), OUT, 0.9, 0.2);
    ell(c, 15.4, -1.6, 3.6, 2.6, fur(c, -4, 1, '#9a8676'), OUT, 0.7, 0.25); ell(c, 18.4, -1.2, 1.5, 1.3, '#f0a0ae', OUT, 0.4);
    ell(c, 7.6, -8.6, 3.6, 4.2, fur(c, -13, -5, FUR), OUT, 0.8); ell(c, 7.8, -8.4, 2, 2.8, '#e8a0a8');
    rrect(c, 15, 0.6, 1.4, 2.4, 0.4, '#fff', OUT, 0.3); rrect(c, 16.6, 0.6, 1.4, 2.4, 0.4, '#fff', OUT, 0.3);
    eye(c, 11.8, -4.4, 1.6, tele ? '#ff5a4a' : '#f4ecd0', '#111'); if (tele) glowAt(c, 12, -4.4, 6, '#ff3a2a', 0.7);
    // bandana
    poly(c, [[4.4, -1.8], [10, 1.6], [9, 3.6], [3.4, 0.6]], '#c8382a', OUT, 0.5); poly(c, [[4.4, -1.6], [1, 1], [3.6, 2.6]], '#a02a20', OUT, 0.4);
    c.restore();
  };

  /* ------------------------------ MANTIS FIGHTER ------------------------------ */
  E.mantis = function (c, e, t) {
    var st = e.state, k = e.tele || 0, walk = st === 'approach' ? Math.sin(t * 10) : 0, G1 = '#7fca3a', G2 = '#4c8f22', G3 = '#b7ee72';
    var lean = st === 'slash' ? 0.18 : st === 'tele' ? -0.12 : 0;
    var hipY = -27, bob = st === 'approach' ? -Math.abs(walk) * 1.2 : Math.sin(t * 3) * 0.5;
    // legs (digitigrade)
    [[-1, 1], [1, 0]].forEach(function (d) {
      var ph = walk * d[0] * 8, ft = [d[0] * 3 + ph, 0], hp = [d[0] * 2, hipY + bob], kk = ik(hp[0], hp[1], ft[0], ft[1], 14, 14, -1);
      var dk = d[1] === 1; limb(c, hp[0], hp[1], kk.kx, kk.ky, 6.4, 3.8, fur(c, hp[1], kk.ky, dk ? G2 : G1), OUT, 0.8); limb(c, kk.kx, kk.ky, kk.ex, kk.ey, 3.8, 2.6, fur(c, kk.ky, kk.ey, dk ? G2 : G1), OUT, 0.8);
      poly(c, [[kk.ex - 2, kk.ey - 1], [kk.ex + 6, kk.ey + 0.6], [kk.ex - 2, kk.ey + 1]], '#3a6a1a', OUT, 0.5);
    });
    c.save(); c.translate(0, bob); c.translate(0, hipY); c.rotate(lean); c.translate(0, -hipY);
    // wings
    [[-7, -41, 0.5, 0.35], [-4, -40, 0.35, 0.5]].forEach(function (w, i) {
      c.save(); c.translate(w[0], w[1]); c.rotate(-0.55 + i * 0.16 + (st === 'slash' ? 0.2 : 0));
      c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-5, 10, -3, 26, 3, 30); c.bezierCurveTo(7, 20, 6, 8, 0, 0); c.closePath(); c.fillStyle = 'rgba(200,255,190,' + (0.32 + i * 0.1) + ')'; c.fill(); c.strokeStyle = 'rgba(80,140,60,0.7)'; c.lineWidth = 0.6; c.stroke();
      c.beginPath(); c.moveTo(0, 0); c.lineTo(1, 28); c.moveTo(0, 6); c.lineTo(-3, 22); c.moveTo(1, 7); c.lineTo(5, 18); c.strokeStyle = 'rgba(80,140,60,0.5)'; c.lineWidth = 0.4; c.stroke(); c.restore();
    });
    // abdomen (tapered, trailing back)
    c.beginPath(); c.moveTo(-1, -30); c.bezierCurveTo(-10, -28, -17, -22, -21, -14); c.bezierCurveTo(-15, -14, -8, -20, 1, -25); c.closePath(); c.fillStyle = lg(c, 0, -30, 0, -14, [[0, G1], [1, G2]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke();
    for (var i = 0; i < 4; i++) line(c, -5 - i * 4, -27 + i * 3.4, -3.6 - i * 4, -21 + i * 3.4, 0.5, 'rgba(20,50,10,0.6)');
    // thorax / armor
    c.beginPath(); c.moveTo(-5, -28); c.bezierCurveTo(-6, -38, -3, -47, 2, -48); c.bezierCurveTo(8, -47, 9, -38, 7, -28); c.closePath(); c.fillStyle = hfur(c, -6, 9, G1); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    ell(c, 3, -38, 3.4, 8, 'rgba(210,255,140,0.5)'); for (i = 0; i < 4; i++) line(c, -2, -42 + i * 3.6, 7, -42 + i * 3.6, 0.5, 'rgba(30,70,10,0.55)');
    rrect(c, -5, -33, 12, 3, 1, '#3a2a48', OUT, 0.5); ell(c, 1, -31.5, 1.3, 1.3, '#e0b83a');   // belt
    // neck + head
    limb(c, 3, -47, 5, -51, 3, 2.6, G2, OUT, 0.6);
    c.save(); c.translate(6, -54); c.rotate(0.12 + Math.sin(t * 4) * 0.03);
    poly(c, [[-4, -3], [6, -4.4], [11, 2], [3, 6], [-4, 3]], hfur(c, -5, 11, G3), OUT, 0.9);
    ell(c, 3.4, -0.6, 4.6, 4.1, lg(c, 0, -5, 0, 4, [[0, '#f4f08a'], [1, '#b0b02a']]), OUT, 0.8, -0.3); ell(c, 4.8, -0.2, 1.5, 2.6, '#111'); ell(c, 5.2, -1.4, 0.5, 0.5, '#fff');
    for (i = 0; i < 4; i++) ell(c, 1 + i * 1.3, -2.6 + (i % 2), 0.4, 0.4, 'rgba(0,0,0,0.25)');
    line(c, 8, 4, 12, 7, 1.2, '#2a5a10'); line(c, 6, 5, 8, 8.4, 1.2, '#2a5a10');
    c.beginPath(); c.moveTo(1, -5); c.bezierCurveTo(2, -12, 8, -14, 12, -10); c.moveTo(-1, -4); c.bezierCurveTo(-3, -12, 2, -15, 6, -14); c.strokeStyle = '#2a5a10'; c.lineWidth = 0.7; c.stroke();
    if (st === 'tele' || st === 'windup') glowAt(c, 4, -1, 8, '#ffe94a', 0.35);
    c.restore();
    // scythe arms
    var a1, a2, p = e.slashP || 0, sn = e.slashN || 0;
    if (st === 'tele') { a1 = -2.15; a2 = -1.95; }
    else if (st === 'slash') { a1 = sn % 2 ? 0.8 - p * 2.5 : -1.9 + p * 2.6; a2 = a1 - 0.25; }
    else if (st === 'windup') { a1 = sn % 2 ? 1.0 : -2.0; a2 = a1 - 0.15; }
    else if (e.limp) { a1 = 1.4; a2 = 1.7; }
    else { a1 = -0.75 + Math.sin(t * 3) * 0.08; a2 = 0.3; }
    [[a2, G2, true], [a1, G1, false]].forEach(function (a) {
      var sx = 3, sy = -42, ang = a[0], ux = sx + Math.cos(ang) * 11, uy = sy + Math.sin(ang) * 11;
      limb(c, sx, sy, ux, uy, 4.4, 3.4, a[1], OUT, 0.8);
      c.save(); c.translate(ux, uy); c.rotate(ang + 0.55);
      var bl = (st === 'tele' || st === 'slash' || st === 'windup') ? 26 : 21;
      c.beginPath(); c.moveTo(0, -1.6); c.quadraticCurveTo(bl * 0.55, -6, bl, -1); c.lineTo(bl - 4, 1.4); c.quadraticCurveTo(bl * 0.5, 0.4, 0, 2); c.closePath();
      c.fillStyle = lg(c, 0, -6, 0, 2, [[0, '#f4f8fc'], [0.5, '#b8c6d4'], [1, '#7a8a9a']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke();
      for (var j = 1; j < 6; j++) { var tx = j * bl / 6.4; c.beginPath(); c.moveTo(tx, 0.5); c.lineTo(tx + 1, 2.4); c.lineTo(tx + 2, 0.4); c.strokeStyle = '#4a5a6a'; c.lineWidth = 0.5; c.stroke(); }
      if (a[2] === false && (st === 'slash' || st === 'tele')) { c.save(); c.globalCompositeOperation = 'lighter'; c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 1.4; c.beginPath(); c.moveTo(2, -1.4); c.quadraticCurveTo(bl * 0.55, -5.4, bl, -1); c.stroke(); c.restore(); }
      c.restore();
    });
    c.restore();
  };

  /* ------------------------------ BAT MUTANT ------------------------------ */
  E.bat = function (c, e, t) {
    var st = e.state, grounded = st === 'exposed' || e.limp, flap = grounded ? 0.1 : Math.sin(t * (st === 'swoop' ? 24 : 15)), tele = st === 'tele', FUR = '#6a4a8c';
    c.save(); c.translate(0, -14);
    if (st === 'swoop') c.rotate(0.5); if (tele) c.rotate(-0.25);
    function wing(back) {
      var up = grounded ? -0.3 : flap, sx = -1, sy = -3;
      var tipx = -6 + up * 4, tipy = -30 * (0.3 + 0.7 * (up * 0.5 + 0.5)) + (grounded ? 26 : 0), midx = -20, midy = -14 * (0.5 + up * 0.5) + (grounded ? 12 : 0);
      c.save(); if (back) { c.translate(-2, -1); c.scale(0.9, 0.9); }
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(-8, tipy * 0.7, tipx, tipy);
      c.quadraticCurveTo(tipx - 4, tipy * 0.35, midx, midy); c.quadraticCurveTo(midx + 2, midy * 0.3, -18, 2 + (grounded ? 4 : 0)); c.quadraticCurveTo(-10, 4, sx + 1, 5); c.closePath();
      c.fillStyle = lg(c, 0, tipy, 0, 6, [[0, back ? '#3a2456' : '#5a3a7c'], [1, back ? '#22143a' : '#3a2456']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke();
      c.beginPath(); c.moveTo(sx, sy); c.quadraticCurveTo(-8, tipy * 0.7, tipx, tipy); c.moveTo(sx, sy); c.quadraticCurveTo(-12, midy * 0.5, midx, midy); c.moveTo(sx, sy); c.lineTo(-17, 3 + (grounded ? 4 : 0)); c.strokeStyle = back ? '#2a1a40' : '#8a6aac'; c.lineWidth = 0.9; c.stroke(); c.restore();
    }
    wing(true);
    ell(c, 0, 0, 7.6, 8.6, fur(c, -9, 9, FUR), OUT, 1); ell(c, 1.8, 2, 4.4, 5.4, '#a48ac4');
    poly(c, [[-4, 5], [3, 6], [8, 12 + Math.sin(t * 8) * 1.2], [0, 9], [-6, 11]], '#3a2456', OUT, 0.5);   // legs/feet tucked
    claw(c, 6, 12.6, 1.4, 3.6, '#e8e0f0'); claw(c, 2, 11.6, 1.5, 3.4, '#e8e0f0');
    // scarf
    poly(c, [[-3, -6], [5, -5], [4.6, -2.6], [-3, -3]], '#d84a2a', OUT, 0.5); poly(c, [[-3, -5], [-11, -3 + Math.sin(t * 9) * 3], [-10, 0 + Math.sin(t * 9) * 3], [-3, -2.6]], '#b03a20', OUT, 0.5);
    // head
    c.save(); c.translate(9, -7); c.rotate(tele ? 0.3 : 0);
    poly(c, [[-4, -3], [-6, -11], [-1, -6]], FUR, OUT, 0.7); poly(c, [[2, -5], [4, -13], [7, -5]], FUR, OUT, 0.7); poly(c, [[-4.2, -4], [-5.4, -9], [-2, -6]], '#c8a0d0'); poly(c, [[2.8, -6], [4, -11], [5.6, -6]], '#c8a0d0');
    ell(c, 0, 0, 6.6, 5.8, fur(c, -6, 6, '#7a5a9c'), OUT, 0.9); ell(c, 5.2, 2, 3.6, 2.8, '#a48ac4', OUT, 0.6); ell(c, 8, 0.8, 1.2, 1, '#2a1030');
    eye(c, 2.6, -1.6, 1.8, tele ? '#ffff5a' : '#ff5a5a', '#300'); if (tele) glowAt(c, 2.6, -1.6, 8, '#ffe040', 0.7);
    poly(c, [[4.6, 4], [5.6, 7.4], [6.6, 4]], '#fff', OUT, 0.3); poly(c, [[7.2, 3.6], [8.2, 6.8], [9, 3.4]], '#fff', OUT, 0.3);
    poly(c, [[-2, -2.6], [7, -3.6], [6.6, -1.8], [-2, -0.8]], '#c8382a', OUT, 0.4);    // goggles strap
    if (tele) { c.save(); c.globalCompositeOperation = 'lighter'; [-1, 0, 1].forEach(function (k) { line(c, 9, 2 + k * 2.6, 14, 2 + k * 4, 0.7, 'rgba(255,255,255,0.8)'); }); c.restore(); }
    c.restore();
    wing(false);
    c.restore();
  };

  /* ------------------------------ PORCUPINE MUTANT ------------------------------ */
  E.porcupine = function (c, e, t) {
    var st = e.state, raise = (st === 'tele' || st === 'burstT') ? 1 : 0, walk = st === 'reposition' ? Math.sin(t * 8) : 0, FUR = '#8c6a48', hot = raise ? '#ff5a3a' : '#2a1a10';
    var sh = raise ? Math.sin(t * 60) * 0.8 : 0, rec = st === 'recover';
    c.save(); c.translate(sh, 0);
    // legs
    [[-6, 1], [6, 0]].forEach(function (l) { var ph = walk * l[0] * 0.5; limb(c, l[0], -14, l[0] + ph, -2, 8.6, 6.4, hfur(c, l[0] - 5, l[0] + 5, l[1] ? '#5e4630' : FUR), OUT, 0.9); rrect(c, l[0] + ph - 5, -3, 12, 4, 2, '#2a2018', OUT, 0.6); });
    // back quills (behind body)
    for (var i = 0; i < 20; i++) {
      var u = i / 19, ang = -2.75 + u * 2.1, bx = Math.cos(ang) * 15 - 1, by = -27 + Math.sin(ang) * 14.5;
      var len = 9 + hash(i * 3 + e.seed) * 6 + raise * 9 + (raise ? Math.sin(t * 14 + i) * 1.6 : 0), qa = ang - 0.15 + Math.sin(t * 2 + i) * 0.03 - (raise ? 0.18 * (u - 0.5) * 2 : 0);
      c.save(); c.translate(bx, by); c.rotate(qa); c.beginPath(); c.moveTo(0, -1.5); c.lineTo(len * 0.7, -0.6); c.lineTo(len, 0); c.lineTo(len * 0.7, 0.6); c.lineTo(0, 1.5); c.closePath();
      c.fillStyle = lg(c, 0, 0, len, 0, [[0, '#e8dcb8'], [0.7, '#c8b888'], [1, hot]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.5; c.stroke(); c.restore();
    }
    if (raise) glowAt(c, -2, -30, 26, '#ff4a2a', 0.2);
    // body
    ell(c, 0, -25, 16.4, 14.6, fur(c, -40, -10, FUR), OUT, 1.1); ell(c, 5, -21, 10.6, 8.6, '#d8b890');
    c.strokeStyle = 'rgba(60,30,10,0.35)'; c.lineWidth = 0.5; for (i = 0; i < 6; i++) { c.beginPath(); c.moveTo(-8 + i * 3, -36); c.quadraticCurveTo(-6 + i * 3, -30, -8 + i * 3.4, -22); c.stroke(); }
    // studded vest
    c.beginPath(); c.moveTo(-3, -36); c.lineTo(9, -34); c.lineTo(11, -14); c.lineTo(-1, -14); c.closePath(); c.fillStyle = lg(c, 0, -36, 0, -14, [[0, '#3a3a44'], [1, '#1a1a20']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke();
    for (i = 0; i < 5; i++) ell(c, 0.5 + i * 2, -31 + (i % 2) * 6, 0.8, 0.8, '#d0d4dc');
    line(c, 4, -34, 4, -15, 0.8, '#5a5a66');
    // arm/fist
    var fa = rec ? 0.9 : raise ? -1.1 : 0.2, ax = 8 + Math.cos(fa) * 12, ay = -26 + Math.sin(fa) * 12;
    limb(c, 8, -28, ax, ay, 7, 6, hfur(c, 6, 20, FUR), OUT, 0.9); ell(c, ax + 1, ay, 4.6, 4.2, '#2a2a32', OUT, 0.8); for (i = 0; i < 3; i++) poly(c, [[ax + 2 + i * 1.6, ay - 4.2], [ax + 3 + i * 1.6, ay - 6.8], [ax + 4 + i * 1.6, ay - 4.2]], '#c8ccd4', OUT, 0.3);
    // head
    c.save(); c.translate(15, -33); c.rotate(raise ? -0.2 : 0);
    ell(c, 0, 0, 9.6, 8.6, fur(c, -9, 9, '#a48258'), OUT, 1); ell(c, 8, 3, 6.4, 4.6, fur(c, -1, 8, '#c8a878'), OUT, 0.9); ell(c, 13, 1.8, 2.4, 2, '#1a1010', OUT, 0.4);
    ell(c, -4.6, -7, 2.8, 2.6, '#8c6a48', OUT, 0.6); ell(c, -4.6, -7, 1.4, 1.2, '#d0a0a0');
    eye(c, 3.6, -1.6, 2, raise ? '#ff6a4a' : '#f8f0d8', '#111'); poly(c, [[0.4, -4.8], [7, -3], [6.6, -2.4], [0.4, -3.6]], '#3a2a1a', OUT, 0.3);
    poly(c, [[9.4, 5.6], [10.4, 8.4], [11.4, 5.4]], '#fff', OUT, 0.3);
    // mohawk quills
    for (i = 0; i < 4; i++) { poly(c, [[-3 + i * 2, -7.4], [-4 + i * 2.4, -13 - i * 0.6 - raise * 4], [-1 + i * 2.2, -7.6]], '#e8dcb8', OUT, 0.4); }
    c.restore();
    if (rec) { c.save(); c.globalCompositeOperation = 'lighter'; for (i = 0; i < 3; i++) { var sa = t * 5 + i * 2.1; ell(c, 15 + Math.cos(sa) * 9, -48 + Math.sin(sa) * 2.4, 1.4, 1.4, '#ffe94a'); } c.restore(); }
    c.restore();
  };

  /* ------------------------------ RHINO BRUISER / WARLORD ------------------------------ */
  function rhino(c, e, t, war) {
    var st = e.state, tele = st === 'tele', charge = st === 'charge', walk = st === 'approach' || st === 'idle' ? Math.sin(t * 6) : 0;
    var GR = war ? '#8a7060' : '#7c8a98', GD = war ? '#5a4438' : '#4a5664', PL = war ? '#d8a82a' : '#3c4652', PLD = war ? '#8a6414' : '#20282f';
    var lean = charge ? 0.22 : tele ? -0.08 : 0, stomp = tele ? Math.abs(Math.sin(t * 14)) * 3 : 0;
    // legs
    [[-9, 1], [8, 0]].forEach(function (l) {
      var ph = walk * l[0] * 0.1 * (l[1] ? -1 : 1), lift = l[1] ? 0 : stomp;
      limb(c, l[0], -30, l[0] + ph, -6 - lift, 15, 12, hfur(c, l[0] - 8, l[0] + 8, l[1] ? GD : GR), OUT, 1.1);
      rrect(c, l[0] + ph - 8, -7 - lift, 18, 8, 3, lg(c, 0, -7, 0, 1, [[0, PL], [1, PLD]]), OUT, 0.9);
      rrect(c, l[0] + ph - 9, -14 - lift, 17, 5, 2, lg(c, 0, -14, 0, -9, [[0, PL], [1, PLD]]), OUT, 0.7);
    });
    c.save(); c.translate(0, -30); c.rotate(lean); c.translate(0, 30);
    if (war) { c.beginPath(); c.moveTo(-14, -66); c.bezierCurveTo(-30, -50, -32, -20, -26, -4 + Math.sin(t * 3) * 2); c.lineTo(-10, -8); c.lineTo(-8, -60); c.closePath(); c.fillStyle = lg(c, -30, 0, -8, 0, [[0, '#6a0e14'], [1, '#a8202a']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke(); }
    // back arm
    var ba = st === 'swipe' ? 0.4 : 1.2; limb(c, -2, -62, -2 + Math.cos(ba) * 20, -62 + Math.sin(ba) * 20, 15, 12, hfur(c, -12, 12, GD), OUT, 1); ell(c, -2 + Math.cos(ba) * 20, -62 + Math.sin(ba) * 20, 8, 8, lg(c, 0, -10, 0, 10, [[0, PL], [1, PLD]]), OUT, 0.9);
    // torso
    c.beginPath(); c.moveTo(-18, -32); c.bezierCurveTo(-26, -46, -24, -64, -12, -72); c.bezierCurveTo(-2, -78, 14, -76, 20, -66); c.bezierCurveTo(26, -52, 22, -40, 16, -32); c.closePath();
    c.fillStyle = hfur(c, -24, 24, GR); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3; c.stroke();
    c.beginPath(); c.moveTo(-8, -33); c.bezierCurveTo(-10, -46, -6, -60, 2, -64); c.bezierCurveTo(12, -60, 14, -46, 12, -33); c.closePath(); c.fillStyle = lg(c, 0, -64, 0, -33, [[0, lit(GR, 0.3)], [1, lit(GR, -0.1)]]); c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.3)'; c.lineWidth = 0.7; for (var i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-8, -38 - i * 6.4); c.quadraticCurveTo(2, -36 - i * 6.4, 12, -38 - i * 6.4); c.stroke(); }
    // chest plate / harness
    if (war) { poly(c, [[-14, -50], [2, -46], [18, -50], [14, -68], [-12, -70]], lg(c, 0, -70, 0, -46, [[0, '#f0cc50'], [1, '#a87a10']]), OUT, 1); ell(c, 2, -58, 4, 4, '#c0182a', OUT, 0.8); glowAt(c, 2, -58, 12, '#ff3a2a', 0.5); }
    else { line(c, -14, -66, 12, -36, 4, '#3a2a1e'); line(c, 14, -66, -10, -36, 4, '#2a1e14'); ell(c, 1, -52, 3, 3, '#c8cdd6', OUT, 0.6); }
    // belt
    rrect(c, -19, -37, 38, 7, 2, lg(c, 0, -37, 0, -30, [[0, '#6a4a2a'], [1, '#2a1a0a']]), OUT, 0.9); rrect(c, -4, -38, 10, 9, 2, lg(c, 0, -38, 0, -29, [[0, '#f0d060'], [1, '#a07a10']]), OUT, 0.8);
    // head
    c.save(); c.translate(18, charge ? -58 : tele ? -64 : -66); c.rotate(charge ? 0.32 : tele ? -0.08 : 0);
    var HD = lg(c, 0, -12, 0, 12, [[0, lit(GR, 0.25)], [1, lit(GR, -0.3)]]);
    poly(c, [[-8, -8], [14, -10], [24, -2], [22, 8], [10, 12], [-8, 8]], HD, OUT, 1.2);
    ell(c, 21, 3, 5, 4, lg(c, 0, -2, 0, 8, [[0, lit(GR, 0.15)], [1, lit(GR, -0.3)]]), OUT, 0.9); ell(c, 23.4, 1.8, 1.3, 1.6, '#1a1210'); ell(c, 21, 5.4, 1.2, 1.4, '#1a1210');
    ell(c, -5, -9, 3.6, 3.4, GD, OUT, 0.8); ell(c, -5, -9, 1.8, 1.6, '#d8a0a0');
    // horns
    poly(c, [[15, -8], [22, -22], [27, -19], [22, -6]], lg(c, 0, -22, 0, -6, [[0, '#f8f2dc'], [1, '#b0a37c']]), OUT, 0.9);
    poly(c, [[9, -9], [12, -16], [15, -10]], '#e8e0c4', OUT, 0.7);
    // eyes
    poly(c, [[7, -3], [16, -6], [16, -2], [7, 0]], '#0a0808'); ell(c, 12, -2.4, 2.1, 1.6, tele || war ? '#ff3a2a' : '#f5efcf', OUT, 0.5); ell(c, 12.6, -2.4, 0.8, 0.9, '#111');
    if (tele || war) glowAt(c, 12, -2.4, 9, '#ff2a1a', tele ? 0.9 : 0.5);
    if (war) { poly(c, [[-9, -6], [10, -12], [12, -8], [-8, -1]], lg(c, 0, -12, 0, -1, [[0, '#f0cc50'], [1, '#a87a10']]), OUT, 0.8); }
    line(c, 18, 9, 22, 8.6, 1.4, '#3a2a20'); if (charge || tele) { c.save(); c.globalCompositeOperation = 'lighter'; ell(c, 27 + Math.sin(t * 30) * 2, 3, 4, 2, 'rgba(255,255,255,0.4)'); c.restore(); }
    c.restore();
    // pauldron + front arm
    var fa = st === 'stele' ? -2.2 : st === 'swipe' ? 0.1 : charge ? 0.8 : 0.9;
    var sx = 6, sy = -64, hx = sx + Math.cos(fa) * 24, hy = sy + Math.sin(fa) * 24;
    limb(c, sx, sy, hx, hy, 17, 14, hfur(c, -10, 30, GR), OUT, 1.2); ell(c, hx, hy, 9, 9, lg(c, 0, hy - 9, 0, hy + 9, [[0, PL], [1, PLD]]), OUT, 1);
    for (i = 0; i < 3; i++) line(c, hx + 5 + i * 0.4, hy - 3 + i * 3, hx + 9, hy - 3 + i * 3, 1.2, lit(PL, 0.3));
    c.beginPath(); c.arc(sx - 1, sy - 2, 13, Math.PI * 1.05, Math.PI * 1.98); c.lineTo(sx + 12, sy + 6); c.lineTo(sx - 12, sy + 4); c.closePath(); c.fillStyle = lg(c, 0, sy - 15, 0, sy + 5, [[0, lit(PL, 0.25)], [1, PLD]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    for (i = 0; i < 3; i++) poly(c, [[sx - 8 + i * 8, sy - 12 - Math.sin(i) * 1], [sx - 6 + i * 8, sy - 20 - i * 0.6], [sx - 3 + i * 8, sy - 12]], war ? '#efe6cc' : '#aab2bc', OUT, 0.6);
    c.restore();
    if (st === 'stun') { c.save(); c.globalCompositeOperation = 'lighter'; for (i = 0; i < 3; i++) { var a = t * 5 + i * 2.1; ell(c, 20 + Math.cos(a) * 15, -84 + Math.sin(a) * 4, 2.2, 2.2, '#ffe94a'); glowAt(c, 20 + Math.cos(a) * 15, -84 + Math.sin(a) * 4, 6, '#ffe94a', 0.5); } c.restore(); }
    if (e.opening && war && Math.floor(t * 12) % 2) glowAt(c, 6, -90, 14, '#ffe94a', 0.6);
  }
  E.rhino = function (c, e, t) { rhino(c, e, t, false); };
  E.warlord = function (c, e, t) { rhino(c, e, t, true); };

  /* ------------------------------ CROCODILE (grappler + Snapjaw boss) ------------------------------ */
  function croc(c, e, t, boss) {
    var st = e.state, k = boss ? 1.4 : 1, walk = st === 'approach' || st === 'idle' ? Math.sin(t * 6) : 0;
    var GR = boss ? '#4f7f30' : '#7b8f3a', GD = boss ? '#2f5a1a' : '#55682a', BEL = '#d4cc8a';
    var grabby = e.atk === 'grab' && (st === 'tele' || st === 'active'), tailAtk = e.atk === 'tail', jaw = 3.4;
    var tailAng = Math.sin(t * 2) * 2; if (tailAtk && st === 'tele') tailAng = -10 - Math.min(1, e.st / 0.8) * 8; if (tailAtk && st === 'active') tailAng = 16;
    if (grabby) jaw = 9; if (st === 'roar') jaw = 11 + Math.sin(t * 30); if (st === 'holding') jaw = 8;
    var crouch = (boss && st === 'tele' && e.atk === 'leap') ? 7 : 0, lean = grabby ? 0.2 : 0;
    c.save(); c.scale(k, k);
    // tail
    c.beginPath(); c.moveTo(-10, -20 + crouch * 0.3); c.bezierCurveTo(-24, -20 + tailAng * 0.5, -36, -14 + tailAng, -50, -8 + tailAng * 1.6); c.bezierCurveTo(-38, -4 + tailAng, -24, -6, -10, -6);
    c.closePath(); c.fillStyle = lg(c, 0, -22, 0, -4, [[0, GR], [1, GD]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.3 / k; c.stroke();
    for (var i = 0; i < 6; i++) { var u = i / 6; poly(c, [[-14 - u * 30, -19 + tailAng * u * 0.8 - u * 3], [-16 - u * 30, -23 + tailAng * u * 0.8 - u * 4], [-18 - u * 30, -19 + tailAng * u * 0.8 - u * 3]], GD, OUT, 0.5 / k); }
    // legs
    [[-7, 1], [7, 0]].forEach(function (l) { var ph = walk * l[0] * 0.2; limb(c, l[0], -16, l[0] + ph, -2, 10, 8, hfur(c, l[0] - 5, l[0] + 5, l[1] ? GD : GR), OUT, 1 / k); poly(c, [[l[0] + ph - 5, -1], [l[0] + ph + 8, -1], [l[0] + ph + 7, 1.6], [l[0] + ph - 5, 1.6]], '#2a3a14', OUT, 0.5 / k); for (var j = 0; j < 3; j++) claw(c, l[0] + ph + 4 + j * 2, 1, 0, 3, '#f2eedc'); });
    c.save(); c.translate(0, -16 + crouch); c.rotate(lean); c.translate(0, 16 - crouch);
    // torso
    c.beginPath(); c.moveTo(-13, -14); c.bezierCurveTo(-20, -26, -16, -44, -4, -50); c.bezierCurveTo(8, -54, 18, -46, 17, -32); c.bezierCurveTo(16, -22, 12, -16, 8, -14); c.closePath(); c.fillStyle = hfur(c, -18, 18, GR); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1.2 / k; c.stroke();
    c.beginPath(); c.moveTo(0, -16); c.bezierCurveTo(-2, -28, 0, -42, 6, -46); c.bezierCurveTo(14, -42, 15, -28, 12, -16); c.closePath(); c.fillStyle = lg(c, 0, -46, 0, -16, [[0, lit(BEL, 0.2)], [1, lit(BEL, -0.25)]]); c.fill();
    c.strokeStyle = 'rgba(90,80,30,0.55)'; c.lineWidth = 0.6 / k; for (i = 0; i < 5; i++) { c.beginPath(); c.moveTo(1, -20 - i * 5.4); c.quadraticCurveTo(7, -18 - i * 5.4, 13, -20 - i * 5.4); c.stroke(); }
    // scale pattern on back
    c.fillStyle = 'rgba(20,50,10,0.35)'; for (i = 0; i < 9; i++) ell(c, -12 + (i % 3) * 4, -22 - Math.floor(i / 3) * 8, 1.6, 1.2, 'rgba(20,50,10,0.35)');
    if (boss) {   // warden armor vest + spiked collar
      poly(c, [[-13, -46], [12, -50], [15, -22], [-12, -20]], lg(c, 0, -50, 0, -20, [[0, '#5a5a66'], [1, '#26262e']]), OUT, 1.2 / k);
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 0.6 / k; c.beginPath(); c.moveTo(-10, -44); c.lineTo(11, -47); c.stroke(); for (i = 0; i < 5; i++) ell(c, -8 + i * 5, -25 - (i % 2) * 2, 0.9, 0.9, '#c8ccd4');
      rrect(c, -2, -40, 9, 10, 1.5, lg(c, 0, -40, 0, -30, [[0, '#ffe07a'], [1, '#a87a10']]), OUT, 0.8 / k); poly(c, [[2.5, -38], [4.5, -32], [0.5, -32]], '#26262e');
      for (i = 0; i < 4; i++) poly(c, [[-4 + i * 5, -48 - (i % 2)], [-2 + i * 5, -56 - (i % 2)], [1 + i * 5, -48]], '#c8ccd4', OUT, 0.6 / k);
      line(c, 0, -24, 14, -30, 0.8 / k, 'rgba(0,0,0,0.5)');
      c.strokeStyle = '#d8d0b0'; c.lineWidth = 0.7 / k; c.beginPath(); c.moveTo(8, -50); c.lineTo(14, -40); c.stroke();   // scar
    } else {
      poly(c, [[-6, -46], [6, -49], [12, -42], [10, -20], [-5, -22]], 'rgba(60,60,72,0.9)', OUT, 0.9); line(c, 0, -46, 6, -22, 0.7, 'rgba(255,255,255,0.15)'); ell(c, 9, -34, 1.4, 1.4, '#e0b83a'); // ragged tank top
      c.strokeStyle = '#8a8a96'; c.lineWidth = 1.2; c.beginPath(); c.arc(4, -46, 7, 0.2, Math.PI - 0.2); c.stroke();   // chain
    }
    // head with long jaw
    c.save(); c.translate(15, -46); c.rotate(grabby ? 0.12 : st === 'roar' ? -0.3 : 0);
    var up = -Math.floor(jaw / 3);
    poly(c, [[-8, -6], [12, -8 + up], [30, -5 + up], [31, -1 + up * 0.6], [-6, 3]], lg(c, 0, -9, 0, 3, [[0, lit(GR, 0.22)], [1, lit(GR, -0.15)]]), OUT, 1.2 / k);
    poly(c, [[-4, 3], [30, -1 + up * 0.5], [28, 3 + jaw], [-3, 7 + jaw * 0.6]], lg(c, 0, 0, 0, 8 + jaw, [[0, lit(GR, -0.1)], [1, lit(GD, -0.2)]]), OUT, 1.1 / k);
    poly(c, [[-3, 4], [28, 1 + up * 0.4], [26, 3 + jaw * 0.8], [-2, 6 + jaw * 0.5]], '#8a2a2a');   // mouth interior
    for (i = 0; i < 7; i++) { poly(c, [[3 + i * 3.6, -1 + up * 0.5], [4.6 + i * 3.6, 2.6 + up * 0.3], [6 + i * 3.6, -1 + up * 0.5]], '#fbfaf0', OUT, 0.3); poly(c, [[4 + i * 3.6, 4 + jaw * 0.7], [5.4 + i * 3.6, 0.6 + jaw * 0.45], [7 + i * 3.6, 4 + jaw * 0.7]], '#fbfaf0', OUT, 0.3); }
    ell(c, 29, -3 + up * 0.7, 1.2, 1, '#1a2a0a'); ell(c, 2, -8, 6, 4.6, lg(c, 0, -12, 0, -4, [[0, lit(GR, 0.2)], [1, GD]]), OUT, 0.9);
    ell(c, 3, -8.4, 3.2, 2.7, tailAtk || st === 'tele' || st === 'roar' ? '#ff5a3a' : '#f0e040', OUT, 0.6); ell(c, 3.8, -8.4, 0.8, 2.3, '#111');
    if (st === 'tele' || st === 'roar') glowAt(c, 3, -8.4, 9, '#ff3a2a', 0.6);
    for (i = 0; i < 3; i++) ell(c, -3 + i * 3, -11.4, 1.3, 0.9, GD);
    c.restore();
    // arms
    var arm = grabby ? (st === 'active' ? 8 : -4) : 0, ax = 12 + arm, ay = -34 + crouch * 0.2;
    limb(c, 6, -40, ax, ay, 9, 7, hfur(c, 4, 20, GR), OUT, 1 / k); ell(c, ax + 1, ay, 4.4, 4, hfur(c, ax - 4, ax + 6, GD), OUT, 0.8 / k);
    for (i = 0; i < 3; i++) claw(c, ax + 4, ay - 2 + i * 2, 0.15 * (i - 1), 5, '#f6f0d8');
    c.restore();
    if (boss && e.opening && Math.floor(t * 12) % 2) glowAt(c, 8, -68, 14, '#ffe94a', 0.7);
    c.restore();
  }
  E.grappler = function (c, e, t) { croc(c, e, t, false); };
  E.boss = function (c, e, t) { croc(c, e, t, true); };
})(window.TB);
