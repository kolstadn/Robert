/* Turtle Brawl — weapons and the turtle skeleton rig (vector art). Sprites face RIGHT, origin at the feet. */
(function (TB) {
  'use strict';
  var A = TB.art, poly = A.poly, ell = A.ell, rrect = A.rrect, line = A.line, limb = A.limb, ik = A.ik, glowAt = A.glow;
  var lg = TB.lg, rg = TB.rg, lit = TB.lit, mix = TB.mix, rgba = TB.rgba, OUT = TB.OUT, TAU = TB.TAU;

  /* geometry shared with the game (trail sampling): shoulder relative to the feet, arm reach */
  TB.RIG = { shoulder: [4, -44], arm: 15 };

  /* ============================== WEAPONS ==============================
   * Each draw(c, tier, en, t) draws at the hand (origin), blade/shaft along +x. Tier changes physical build;
   * the energy only tints glow/particles. */
  var STEEL = ['#f6fafe', '#c5cfda', '#8492a2'];
  function glowStroke(c, pathFn, ec, t, w, dash) {
    c.save(); c.globalCompositeOperation = 'lighter'; c.lineCap = 'round';
    pathFn(); c.strokeStyle = rgba(ec[0], 0.35); c.lineWidth = w * 2.2; c.stroke();
    pathFn(); c.strokeStyle = ec[0]; c.lineWidth = w; c.stroke();
    pathFn(); c.strokeStyle = ec[1]; c.lineWidth = w * 0.45; c.stroke();
    if (dash) { c.setLineDash([5, 13]); c.lineDashOffset = -t * 42; pathFn(); c.strokeStyle = ec[2]; c.lineWidth = w * 0.8; c.stroke(); c.setLineDash([]); }
    c.restore();
  }
  function flame(c, x, y, h, w, ec, a) {
    c.save(); c.globalCompositeOperation = 'lighter';
    c.beginPath(); c.moveTo(x - w, y); c.quadraticCurveTo(x - w * 0.4, y - h * 0.5, x + w * 0.3, y - h); c.quadraticCurveTo(x + w * 1.1, y - h * 0.4, x + w, y); c.closePath();
    c.fillStyle = rgba(ec[0], a); c.fill();
    c.beginPath(); c.moveTo(x - w * 0.5, y); c.quadraticCurveTo(x - w * 0.2, y - h * 0.4, x + w * 0.2, y - h * 0.7); c.quadraticCurveTo(x + w * 0.6, y - h * 0.3, x + w * 0.5, y); c.closePath();
    c.fillStyle = rgba(ec[1], a); c.fill(); c.restore();
  }

  function katana(c, tier, en, t) {
    var ec = TB.glow(en), acc = TB.accent, L = TB.WEAPONS.katana.len[tier], i;
    // grip with diamond wrap
    rrect(c, -13, -1.9, 13.8, 3.8, 1.7, lg(c, 0, -2, 0, 2, [[0, '#3a2a1a'], [1, '#100a05']]), OUT, 0.7);
    c.strokeStyle = tier >= 5 ? '#4a62d8' : tier >= 4 ? '#e8c040' : tier >= 2 ? lit(acc, 0.25) : '#d8d0bc'; c.lineWidth = 0.9;
    for (i = -12; i < 0; i += 2.8) { c.beginPath(); c.moveTo(i, -1.7); c.lineTo(i + 1.4, 0); c.lineTo(i, 1.7); c.moveTo(i + 2.8, -1.7); c.lineTo(i + 1.4, 0); c.lineTo(i + 2.8, 1.7); c.stroke(); }
    ell(c, -13.4, 0, 1.7, 2.3, tier >= 4 ? '#e8c040' : tier >= 2 ? '#a8b0ba' : '#3a3a42', OUT, 0.6); if (tier >= 5) ell(c, -13.4, 0, 0.9, 0.9, ec[1]);
    if (tier >= 2) rrect(c, 0.6, -2.2, 2.4, 4.4, 0.7, tier >= 4 ? '#e8c040' : '#c9a24a', OUT, 0.5);
    // tsuba (guard)
    if (tier === 1) ell(c, 3.6, 0, 1.3, 4.6, '#2a2a32', OUT, 0.7);
    else if (tier <= 3) { ell(c, 3.6, 0, 1.6, 5.4, lg(c, 0, -5, 0, 5, [[0, '#d0d6de'], [1, '#6a727e']]), OUT, 0.7); if (tier === 3) glowAt(c, 3.6, 0, 5, ec[0], 0.8); }
    else if (tier === 4) { ell(c, 3.6, 0, 1.8, 6, lg(c, 0, -6, 0, 6, [[0, '#ffe07a'], [1, '#a87a10']]), OUT, 0.7); ell(c, 3.6, -3.6, 1.5, 1.6, '#a87a10'); ell(c, 3.6, 3.6, 1.5, 1.6, '#a87a10'); ell(c, 3.6, 0, 0.9, 0.9, ec[1]); }
    else {
      poly(c, [[2.6, -7.6], [6.2, -4.5], [5.4, 0], [6.2, 4.5], [2.6, 7.6], [1.6, 3], [1.6, -3]], lg(c, 0, -8, 0, 8, [[0, '#fff0a0'], [1, '#b8860a']]), OUT, 0.7);
      ell(c, 3.6, 0, 1.2, 1.2, ec[0]); glowAt(c, 3.6, 0, 7, ec[0], 0.8);
    }
    // blade
    var x0 = 4.6, curv = 0;
    function bladePath() { c.beginPath(); c.moveTo(x0, 1.5); c.lineTo(x0, -1.7); c.quadraticCurveTo(L * 0.5, -2.5, L, -4.3); c.lineTo(L + 2.6, -5.1); c.quadraticCurveTo(L * 0.55, 2.0, x0, 1.5); c.closePath(); }
    if (tier >= 3) { glowStroke(c, function () { c.beginPath(); c.moveTo(x0 + 2, -0.1); c.quadraticCurveTo(L * 0.5, -0.4, L - 1, -3.2); }, ec, t, 0.9, false); }
    bladePath(); c.fillStyle = lg(c, 0, -4, 0, 2, [[0, STEEL[0]], [0.5, tier >= 4 ? '#d4dde6' : STEEL[1]], [1, STEEL[2]]]); c.fill();
    c.strokeStyle = 'rgba(15,25,35,0.65)'; c.lineWidth = 0.6; c.stroke();
    c.beginPath(); c.moveTo(x0 + 1, -1.2); c.quadraticCurveTo(L * 0.5, -1.9, L - 2, -3.6); c.strokeStyle = 'rgba(255,255,255,0.85)'; c.lineWidth = 0.5; c.stroke();     // spine shine
    c.beginPath(); c.moveTo(x0, 1.4); c.quadraticCurveTo(L * 0.55, 1.9, L + 2.4, -4.9); c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 0.45; c.stroke();  // cutting edge
    if (tier >= 2) { rrect(c, x0, -1.9, 7, 3.6, 0.8, 'rgba(60,72,88,0.55)'); c.beginPath(); c.moveTo(x0 + 7, -1.8); c.lineTo(x0 + 7, 1.6); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.5; c.stroke(); }
    if (tier >= 3) glowStroke(c, function () { c.beginPath(); c.moveTo(x0 + 8, -0.4); c.quadraticCurveTo(L * 0.5, -0.6, L - 3, -2.9); }, ec, t, 0.7, true);
    if (tier >= 4) {   // wavy hamon
      c.beginPath(); for (i = x0 + 6; i < L - 2; i += 1) { var yy = 0.7 - (i / L) * 3.4 * (i / L) + Math.sin(i * 0.7) * 0.35; if (i === x0 + 6) c.moveTo(i, yy); else c.lineTo(i, yy); }
      c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 0.55; c.stroke();
      c.save(); c.globalCompositeOperation = 'lighter'; for (i = 0; i < 3; i++) { var sp = ((t * 30 + i * 13) % 40) / 40; c.fillStyle = rgba(ec[1], 1 - sp); c.fillRect(L * (0.5 + sp * 0.5), -3 - sp * 6 - i, 1, 1); } c.restore();
    }
    if (tier >= 5) {
      glowStroke(c, function () { c.beginPath(); c.moveTo(x0 + 3, -0.1); c.quadraticCurveTo(L * 0.5, -0.5, L, -4); }, [ec[0], ec[0], ec[1]], t, 2.6, false);
      for (i = 0; i < 9; i++) { var fx = 10 + i * 4.3, fy = -2.1 - (fx / L) * 2.0 * (fx / L) * 1.6, fh = 3.4 + (Math.sin(t * 11 + i * 1.7) + 1) * 2.4; flame(c, fx, fy - 0.6, fh, 1.5, ec, 0.75); }
      c.save(); c.globalCompositeOperation = 'lighter'; [11, 18, 25, 32].forEach(function (rx, k) { c.fillStyle = rgba(ec[2], 0.9); c.fillRect(rx, -0.5 - rx / L * 1.2, 0.8, 1.6); c.fillRect(rx + 1.5, -1 - rx / L * 1.2, 0.6, 0.6); }); c.restore();
    }
  }

  function sai(c, tier, en, t) {
    var ec = TB.glow(en), acc = TB.accent, L = TB.WEAPONS.sai.len[tier], pl = tier >= 4 ? 17 : tier >= 2 ? 15 : 14, s, i;
    rrect(c, -13, -1.8, 13.4, 3.6, 1.6, lg(c, 0, -2, 0, 2, [[0, '#33261a'], [1, '#0e0a06']]), OUT, 0.7);
    c.strokeStyle = tier >= 4 ? '#e8c040' : tier >= 2 ? lit(acc, 0.3) : '#8a7a62'; c.lineWidth = 0.9;
    for (i = -12; i < -1; i += 2.6) { c.beginPath(); c.moveTo(i, -1.7); c.lineTo(i + 1.3, 1.7); c.stroke(); }
    ell(c, -14.4, 0, 2.2, 2.8, 'rgba(0,0,0,0)', tier >= 2 ? '#c0c8d2' : '#6a727e', 1.2); if (tier >= 3) ell(c, -14.4, 0, 1, 1.4, ec[1]);
    rrect(c, -0.6, -3.4, 3.6, 6.8, 1.2, tier >= 4 ? lg(c, 0, -3, 0, 3, [[0, '#ffe07a'], [1, '#a87a10']]) : tier >= 2 ? '#b8c0ca' : '#7a8590', OUT, 0.6);
    var th = tier >= 4 ? 3.2 : tier >= 2 ? 2.8 : 2.2, pc = tier >= 4 ? '#e8c040' : tier >= 2 ? '#c4ccd6' : '#8a95a2';
    for (s = -1; s <= 1; s += 2) {
      var pp = function () { c.beginPath(); c.moveTo(2, s * 2.6); c.bezierCurveTo(4, s * 9, 11, s * 10, pl, s * 5.6); };
      pp(); c.strokeStyle = OUT; c.lineWidth = th + 1.2; c.lineCap = 'round'; c.stroke();
      pp(); c.strokeStyle = pc; c.lineWidth = th; c.stroke();
      pp(); c.strokeStyle = 'rgba(255,255,255,0.6)'; c.lineWidth = th * 0.28; c.stroke();
      poly(c, [[pl - 0.5, s * (5.6 + th / 2)], [pl + 3.6, s * 4.6], [pl - 0.5, s * (5.6 - th / 2)]], pc, OUT, 0.5);
      if (tier >= 5) { poly(c, [[6, s * 8.6], [8.8, s * 12], [10, s * 9.6]], pc, OUT, 0.4); poly(c, [[10, s * 9.8], [12.8, s * 12.6], [13.8, s * 9.4]], pc, OUT, 0.4); }
      if (tier >= 3) glowAt(c, pl + 2, s * 4.9, 6, ec[0], 0.85);
      if (tier >= 5) for (i = 0; i < 3; i++) flame(c, 6 + i * 3.4, s * (9.6 + i * 0.4), 3 + (Math.sin(t * 12 + i) + 1) * 1.6, 1, ec, 0.6);
    }
    function bp() { c.beginPath(); c.moveTo(2, -2.1); c.lineTo(L - 6, -1.2); c.lineTo(L, 0); c.lineTo(L - 6, 1.2); c.lineTo(2, 2.1); c.closePath(); }
    if (tier >= 3) glowStroke(c, function () { c.beginPath(); c.moveTo(4, 0); c.lineTo(L - 2, 0); }, ec, t, 0.8, false);
    bp(); c.fillStyle = lg(c, 0, -2.2, 0, 2.2, [[0, STEEL[0]], [0.5, STEEL[1]], [1, STEEL[2]]]); c.fill(); c.strokeStyle = 'rgba(15,25,35,0.7)'; c.lineWidth = 0.6; c.stroke();
    c.beginPath(); c.moveTo(3, 0); c.lineTo(L - 2, 0); c.strokeStyle = 'rgba(255,255,255,0.7)'; c.lineWidth = 0.5; c.stroke();
    if (tier >= 3) glowStroke(c, function () { c.beginPath(); c.moveTo(6, 0); c.lineTo(L - 3, 0); }, ec, t, 0.55, true);
    if (tier >= 4) for (i = 6; i < L - 4; i += 3) { c.fillStyle = 'rgba(255,255,255,0.5)'; c.fillRect(i, -1.5, 0.7, 0.9); }
    if (tier >= 5) { c.save(); c.globalCompositeOperation = 'lighter'; [8, 13, 18].forEach(function (rx) { c.fillStyle = rgba(ec[2], 0.9); c.fillRect(rx, -1.6, 0.7, 1); c.fillRect(rx, 0.7, 0.7, 1); }); c.restore(); flame(c, L - 4, -1, 4 + (Math.sin(t * 13) + 1) * 2, 1.2, ec, 0.7); }
  }

  function bo(c, tier, en, t) {
    var ec = TB.glow(en), acc = TB.accent, a0 = -26, L = TB.WEAPONS.bo.len[tier], th = tier >= 3 ? 3.8 : 3.2, i;
    function shaft() { c.beginPath(); c.moveTo(a0, -th / 2); c.lineTo(L, -th / 2); c.arc(L, 0, th / 2, -Math.PI / 2, Math.PI / 2); c.lineTo(a0, th / 2); c.arc(a0, 0, th / 2, Math.PI / 2, -Math.PI / 2); c.closePath(); }
    if (tier >= 5) glowStroke(c, function () { c.beginPath(); c.moveTo(a0 + 4, 0); c.lineTo(L - 4, 0); }, [ec[0], ec[0], ec[1]], t, 2.6, false);
    shaft(); c.fillStyle = lg(c, 0, -th / 2, 0, th / 2, [[0, tier >= 4 ? '#b07a44' : '#d8a260'], [0.45, tier >= 4 ? '#7a4a22' : '#966030'], [1, '#452812']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke();
    c.strokeStyle = 'rgba(40,20,5,0.4)'; c.lineWidth = 0.4; for (i = 0; i < 4; i++) { c.beginPath(); c.moveTo(a0 + 4 + i * 3, -0.9 + i * 0.4); c.bezierCurveTo(a0 + 20, -1 + i * 0.5, a0 + 40, 0.6 - i * 0.4, L - 4, -0.5 + i * 0.3); c.stroke(); }
    c.beginPath(); c.moveTo(a0 + 2, -th / 2 + 0.6); c.lineTo(L - 2, -th / 2 + 0.6); c.strokeStyle = 'rgba(255,240,210,0.5)'; c.lineWidth = 0.5; c.stroke();
    if (tier >= 2) {
      rrect(c, a0 - 0.8, -th / 2 - 0.5, 6, th + 1, 1.4, lg(c, 0, -th / 2, 0, th / 2, [[0, '#dfe4ea'], [1, '#6a727e']]), OUT, 0.6); rrect(c, L - 5.2, -th / 2 - 0.5, 6, th + 1, 1.4, lg(c, 0, -th / 2, 0, th / 2, [[0, '#dfe4ea'], [1, '#6a727e']]), OUT, 0.6);
      for (i = -8; i < 7; i += 2.6) rrect(c, i, -th / 2 - 0.15, 1.5, th + 0.3, 0.4, tier >= 4 ? '#e8c040' : acc);
    }
    if (tier >= 3) { glowStroke(c, function () { c.beginPath(); c.moveTo(a0 + 8, 0); c.lineTo(-10, 0); c.moveTo(8, 0); c.lineTo(L - 8, 0); }, ec, t, 0.75, true); }
    if (tier >= 4) {
      [-16, 18].forEach(function (rx) { rrect(c, rx, -th / 2 - 0.9, 2.2, th + 1.8, 0.8, lg(c, 0, -3, 0, 3, [[0, '#ffe07a'], [1, '#a87a10']]), OUT, 0.5); });
      poly(c, [[L + 1.4, -1.4], [L + 5.4, 0], [L + 1.4, 1.4]], '#e8c040', OUT, 0.5); poly(c, [[a0 - 1.4, -1.4], [a0 - 5.4, 0], [a0 - 1.4, 1.4]], '#e8c040', OUT, 0.5);
      glowStroke(c, function () { c.beginPath(); c.moveTo(12, -1.1); c.lineTo(L - 9, -1.1); }, ec, t, 0.35, false);
    }
    if (tier >= 5) {
      poly(c, [[L - 6, -th / 2], [L - 1, -th - 1.4], [L + 3, -th - 1.4], [L + 4, 0], [L + 3, th + 1.4], [L - 1, th + 1.4], [L - 6, th / 2]], lg(c, 0, -5, 0, 5, [[0, '#fff0a0'], [1, '#b8860a']]), OUT, 0.6);
      poly(c, [[a0 + 6, -th / 2], [a0 + 1, -th - 1.4], [a0 - 3, -th - 1.4], [a0 - 4, 0], [a0 - 3, th + 1.4], [a0 + 1, th + 1.4], [a0 + 6, th / 2]], lg(c, 0, -5, 0, 5, [[0, '#fff0a0'], [1, '#b8860a']]), OUT, 0.6);
      c.save(); c.globalCompositeOperation = 'lighter'; [-19, 4, 12, 24].forEach(function (rx) { c.fillStyle = rgba(ec[2], 0.9); c.fillRect(rx, -1.6, 0.8, 1.2); c.fillRect(rx + 1.6, -0.5, 0.6, 1.4); }); c.restore();
      for (i = 0; i < 3; i++) { flame(c, L + 5 + i * 1.6, 0, 4 + (Math.sin(t * 14 + i) + 1) * 1.8, 1.2, ec, 0.7); c.save(); c.translate(a0 - 5 - i * 1.6, 0); c.rotate(Math.PI); flame(c, 0, 0, 4 + (Math.sin(t * 13 + i) + 1) * 1.8, 1.2, ec, 0.7); c.restore(); }
    }
  }

  function nunchaku(c, tier, en, t) {
    var ec = TB.glow(en), acc = TB.accent, sway = TB.nSway !== undefined ? TB.nSway : 0.9 + Math.sin(t * 9) * 0.35, HL = 17, i;
    function handle(x0, x1) {
      var th = tier >= 4 ? 4.4 : 3.8;
      rrect(c, x0, -th / 2, x1 - x0, th, th / 2 - 0.3, lg(c, 0, -th / 2, 0, th / 2, [[0, tier >= 4 ? '#c0844a' : '#dea866'], [0.5, tier >= 4 ? '#8a5228' : '#a8703a'], [1, '#4e2f14']]), OUT, 0.8);
      c.strokeStyle = 'rgba(40,20,5,0.4)'; c.lineWidth = 0.4; for (var k = x0 + 4; k < x1 - 2; k += 4) { c.beginPath(); c.moveTo(k, -th / 2 + 0.3); c.lineTo(k + 0.7, th / 2 - 0.3); c.stroke(); }
      c.beginPath(); c.moveTo(x0 + 2, -th / 2 + 0.6); c.lineTo(x1 - 2, -th / 2 + 0.6); c.strokeStyle = 'rgba(255,240,210,0.5)'; c.lineWidth = 0.5; c.stroke();
      if (tier >= 2) { rrect(c, x1 - 3.2, -th / 2 - 0.4, 3.6, th + 0.8, 1, lg(c, 0, -3, 0, 3, [[0, '#dfe4ea'], [1, '#6a727e']]), OUT, 0.5); rrect(c, x0 - 0.4, -th / 2 - 0.4, 3, th + 0.8, 1, '#8a929e', OUT, 0.5); rrect(c, x0 + 5.4, -th / 2 - 0.2, 1.7, th + 0.4, 0.5, tier >= 4 ? '#e8c040' : acc); }
      if (tier >= 3) glowStroke(c, function () { c.beginPath(); c.moveTo(x0 + 5, 0); c.lineTo(x1 - 4, 0); }, ec, t, 0.7, true);
      if (tier >= 4) { rrect(c, x0 + 8.4, -th / 2 - 0.5, 1.6, th + 1, 0.5, '#e8c040', OUT, 0.4); }
      if (tier >= 5) { c.save(); c.globalCompositeOperation = 'lighter'; c.fillStyle = rgba(ec[2], 0.9); c.fillRect(x0 + 5, -1.3, 0.7, 1); c.fillRect(x0 + 10, 0.4, 0.7, 1); c.restore(); glowAt(c, x1, 0, 6, ec[0], 0.6); }
    }
    handle(-4, 13);
    var mx = 13 + Math.cos(sway * 0.5) * 6.5, my = Math.sin(sway * 0.5) * 6.5;
    for (i = 0; i <= 4; i++) {
      var u = i / 4, lx = 13 + (mx - 13) * u, ly = my * u + Math.sin(u * Math.PI) * 1.6;
      ell(c, lx, ly, 1.6, 1.1, 'rgba(0,0,0,0)', tier >= 5 ? ec[i % 2 ? 1 : 0] : tier >= 2 ? '#aab4c0' : '#d0d0d0', 0.9, (i % 2) * 1.2 + sway * 0.5);
      if (tier >= 3 && i % 2) glowAt(c, lx, ly, 3.4, ec[0], 0.7);
    }
    c.save(); c.translate(mx, my); c.rotate(sway); handle(-1, HL); c.restore();
  }

  TB.WEAPONS = {
    katana:   { len: [0, 38, 38, 38, 41, 45], draw: katana,   idle: { r: -0.45, l: 0.5 } },
    sai:      { len: [0, 26, 26, 26, 28, 30], draw: sai,      idle: { r: -0.3, l: 0.55 } },
    bo:       { len: [0, 40, 40, 40, 42, 44], draw: bo,       idle: { r: -1.25, l: 0 }, single: true },
    nunchaku: { len: [0, 34, 34, 34, 35, 36], draw: nunchaku, idle: { r: -0.75, l: 0.45 } }
  };
  TB.drawWeapon = function (c, weapon, x, y, ang, tier, en, t) {
    c.save(); c.translate(x, y); c.rotate(ang); TB.WEAPONS[weapon].draw(c, tier, en, t); c.restore();
  };

  /* ============================== TURTLE RIG ============================== */
  var SK = '#67bd42', SKD = '#3a7c2a', SKL = '#a4e874', SHELL = '#8a5a2b';

  function skinG(c, y0, y1, dark) { return lg(c, 0, y0, 0, y1, [[0, dark ? '#4c9a34' : SKL], [0.4, dark ? '#3f8a2c' : SK], [1, dark ? '#28601c' : SKD]]); }
  function foot(c, x, y, dark) {
    c.beginPath(); c.moveTo(x - 4.6, y - 3.2); c.quadraticCurveTo(x - 1, y - 5.2, x + 3, y - 3.6); c.quadraticCurveTo(x + 8.4, y - 3.4, x + 8.6, y - 0.6); c.quadraticCurveTo(x + 8, y + 0.9, x + 3, y + 0.9); c.lineTo(x - 4.2, y + 0.9); c.quadraticCurveTo(x - 5.6, y - 1, x - 4.6, y - 3.2); c.closePath();
    c.fillStyle = skinG(c, y - 5, y + 1, dark); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.lineJoin = 'round'; c.stroke();
    c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.5; c.beginPath(); c.moveTo(x + 4.2, y - 3.2); c.lineTo(x + 4.6, y + 0.6); c.moveTo(x + 6.6, y - 3); c.lineTo(x + 6.8, y + 0.4); c.stroke();
  }
  function leg(c, hx, hy, fx, fy, mask, dark) {
    var k = ik(hx, hy, fx, fy, 11, 11, -1);
    limb(c, hx, hy, k.kx, k.ky, 9, 7.4, skinG(c, hy, k.ky, dark), OUT, 0.9);
    limb(c, k.kx, k.ky, k.ex, k.ey, 7.4, 5.8, skinG(c, k.ky, k.ey, dark), OUT, 0.9);
    foot(c, k.ex, k.ey + 0.4, dark);
    ell(c, k.kx + 0.6, k.ky, 4.3, 3.9, dark ? lit(mask, -0.35) : lg(c, 0, k.ky - 4, 0, k.ky + 4, [[0, lit(mask, 0.3)], [1, lit(mask, -0.3)]]), OUT, 0.8);
  }
  function arm(c, sx, sy, ang, reach, mask, dark) {
    var hx = sx + Math.cos(ang) * reach, hy = sy + Math.sin(ang) * reach, k1 = ik(sx, sy, hx, hy, 9, 9, 1), k2 = ik(sx, sy, hx, hy, 9, 9, -1), k = k1.ky > k2.ky ? k1 : k2;
    limb(c, sx, sy, k.kx, k.ky, 6.6, 5.6, skinG(c, sy, k.ky, dark), OUT, 0.9);
    limb(c, k.kx, k.ky, k.ex, k.ey, 5.6, 4.6, skinG(c, k.ky, k.ey, dark), OUT, 0.9);
    ell(c, k.kx, k.ky, 3, 2.8, dark ? lit(mask, -0.35) : lit(mask, 0), OUT, 0.7);
    var wx = k.kx + (k.ex - k.kx) * 0.62, wy = k.ky + (k.ey - k.ky) * 0.62, wa = Math.atan2(k.ey - k.ky, k.ex - k.kx);
    ell(c, wx, wy, 2.2, 3.1, dark ? '#a89a76' : '#e6dcc0', OUT, 0.6, wa + Math.PI / 2);
    ell(c, k.ex, k.ey, 3.1, 3.1, skinG(c, k.ey - 3, k.ey + 3, dark), OUT, 0.8);
    return { x: k.ex, y: k.ey };
  }

  function torsoAndHead(c, s, t, hurt, lean) {
    var id = s.id, mask = s.mask, maskD = s.maskDark, sway = Math.sin(t * 8) * 1.4 + (s.pose === 'walk' ? 2 : 0) + (s.pose === 'air' ? 3 : 0);
    // shell (behind)
    c.save(); c.translate(-9, -14); c.rotate(-0.15);
    ell(c, 0, 0, 11.6, 16.6, lg(c, -12, 0, 12, 0, [[0, '#4a2c10'], [0.45, '#9a6634'], [1, '#5c3818']]), OUT, 1);
    ell(c, -0.5, -0.5, 8.8, 13.4, rg(c, -2, -5, 1, 14, [[0, '#c48a4a'], [1, '#7a4c22']]), 'rgba(40,20,5,0.7)', 0.7);
    c.strokeStyle = 'rgba(50,25,6,0.85)'; c.lineWidth = 0.8; c.beginPath();
    for (var i = 0; i < 6; i++) { var a = i / 6 * TAU + 0.5; c.lineTo(Math.cos(a) * 5.4, Math.sin(a) * 6.4); } c.closePath(); c.stroke();
    for (i = 0; i < 6; i++) { a = i / 6 * TAU + 0.5; c.beginPath(); c.moveTo(Math.cos(a) * 5.4, Math.sin(a) * 6.4); c.lineTo(Math.cos(a) * 11, Math.sin(a) * 13.6); c.stroke(); }
    ell(c, -3, -6, 3.2, 5, 'rgba(255,220,160,0.22)', null, 0, -0.4);
    c.restore();
    // torso
    c.beginPath(); c.moveTo(-6, 1); c.lineTo(7.4, 1); c.bezierCurveTo(9.6, -6, 10.6, -14, 8.6, -21); c.bezierCurveTo(6.6, -25.4, -2, -26.4, -5.4, -22); c.bezierCurveTo(-8.4, -15, -8.4, -7, -6, 1); c.closePath();
    c.fillStyle = lg(c, -8, 0, 10, 0, [[0, SKD], [0.5, SK], [1, SKL]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
    // plastron
    c.beginPath(); c.moveTo(0.2, -0.6); c.lineTo(7.4, -0.6); c.bezierCurveTo(8.8, -7, 9.2, -14, 7.6, -20.4); c.lineTo(1.4, -22.2); c.bezierCurveTo(-0.8, -15, -1, -7, 0.2, -0.6); c.closePath();
    c.fillStyle = lg(c, 0, -22, 8, 0, [[0, '#f8e79c'], [1, '#cfae52']]); c.fill(); c.strokeStyle = '#6a5818'; c.lineWidth = 0.7; c.stroke();
    c.strokeStyle = 'rgba(100,80,20,0.7)'; c.lineWidth = 0.6; c.beginPath(); [-6, -11.5, -17].forEach(function (yy) { c.moveTo(-0.2, yy); c.quadraticCurveTo(4, yy - 1.2, 8.4, yy); }); c.moveTo(4.4, -1); c.lineTo(4.6, -21); c.stroke();
    // identity gear
    if (id === 'leo') { c.beginPath(); c.moveTo(-5, -22); c.lineTo(-2.6, -22.4); c.lineTo(8.6, -3); c.lineTo(5.8, -2); c.closePath(); c.fillStyle = '#5a3a20'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke(); ell(c, 3, -12, 1.2, 1.2, '#e0b83a'); }
    if (id === 'don') { c.beginPath(); c.moveTo(-5, -22); c.lineTo(-2.6, -22.4); c.lineTo(8.4, -4); c.lineTo(5.6, -3); c.closePath(); c.fillStyle = '#6a4a8a'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke(); rrect(c, 3, -8, 6, 5, 1, '#4a3a5a', OUT, 0.6); }
    // belt
    rrect(c, -7.4, -4.4, 16, 4.4, 1.2, lg(c, 0, -4.4, 0, 0, [[0, '#8a5a2a'], [1, '#4a2c12']]), OUT, 0.8);
    if (id === 'mike') { c.beginPath(); c.arc(2.6, -2.2, 3.6, 0, TAU); c.fillStyle = mask; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke(); ell(c, 2.6, -2.2, 1.7, 1.7, '#ffe07a'); }
    else rrect(c, 0.4, -4.9, 5, 5.4, 0.9, lg(c, 0, -5, 0, 0.5, [[0, '#ffe07a'], [1, '#b8860a']]), OUT, 0.6);
    if (id === 'raph') { line(c, 3, -3.6, 3, -0.8, 0.8, '#a0000a'); }
    // neck + head
    ell(c, 3.4, -25, 3.8, 3.4, SKD, OUT, 0.7);
    c.save(); c.translate(4.4, -34.6); c.rotate(hurt ? -0.35 : 0.04 + Math.sin(t * 3) * 0.02);
    ell(c, 0, 0, 9, 8.2, lg(c, -9, -8, 9, 8, [[0, SKL], [0.5, SK], [1, SKD]]), OUT, 1);
    ell(c, 5.6, 1.6, 4.4, 3.8, lg(c, 0, -2, 0, 5, [[0, SK], [1, SKD]]), OUT, 0.9);
    ell(c, -1, 2.6, 5, 3.2, 'rgba(0,0,0,0.12)');
    // mask band
    c.beginPath(); c.moveTo(-9.2, -3.4); c.bezierCurveTo(-3, -7.4, 6, -7.2, 9.2, -3); c.lineTo(9, 1.6); c.bezierCurveTo(4, 2.4, -4, 2, -9, 0.6); c.closePath();
    c.fillStyle = lg(c, 0, -7, 0, 2, [[0, lit(mask, 0.3)], [0.5, mask], [1, maskD]]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.9; c.stroke();
    c.beginPath(); c.moveTo(-8, -3.2); c.bezierCurveTo(-2, -6.4, 5, -6.3, 8.4, -3.1); c.strokeStyle = 'rgba(255,255,255,0.28)'; c.lineWidth = 0.6; c.stroke();
    // eyes
    if (hurt) { line(c, 1.8, -3.2, 5.4, -0.4, 0.9, OUT); line(c, 5.4, -3.2, 1.8, -0.4, 0.9, OUT); }
    else {
      var ex = 3.6, ey = -1.2;
      c.beginPath(); c.moveTo(ex - 3.4, ey + 1.6); c.quadraticCurveTo(ex - 0.4, ey - 3.2, ex + 4, ey - 1.2); c.quadraticCurveTo(ex + 3.4, ey + 2.6, ex - 3.4, ey + 1.6); c.closePath();
      c.fillStyle = '#ffffff'; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.6; c.stroke();
      ell(c, ex + 1.5, ey + 0.2, 1.3, 1.5, '#111'); ell(c, ex + 1.9, ey - 0.3, 0.45, 0.45, '#fff');
      if (id === 'raph') line(c, ex - 3.4, ey - 1.4, ex + 4.4, ey + 0.6, 1.1, maskD);
    }
    // mouth / nose
    ell(c, 9.4, 0.4, 0.6, 0.5, 'rgba(0,0,0,0.5)');
    c.beginPath(); if (hurt) { c.moveTo(6.4, 4.4); c.lineTo(9.6, 4.6); } else if (id === 'mike') { c.moveTo(5.6, 3.4); c.quadraticCurveTo(8.4, 6.4, 10.6, 3.2); } else { c.moveTo(6, 4.2); c.quadraticCurveTo(8.4, 5.4, 10.4, 4); }
    c.strokeStyle = 'rgba(20,50,20,0.9)'; c.lineWidth = 0.7; c.stroke();
    // tails
    var tsw1 = Math.sin(t * 7) * 1.8 + sway * 0.5, tsw2 = Math.sin(t * 7 + 1.4) * 2.2 + sway * 0.7;
    c.beginPath(); c.moveTo(-8.6, -2.6); c.bezierCurveTo(-14, -4 + tsw1 * 0.3, -19, -1 + tsw1, -25, 2 + tsw1 * 1.4); c.lineTo(-24, 5.4 + tsw1 * 1.4); c.bezierCurveTo(-18, 2.6 + tsw1, -13, 0, -8.4, 0.2); c.closePath();
    c.fillStyle = mask; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke();
    c.beginPath(); c.moveTo(-8.4, -0.4); c.bezierCurveTo(-13, 0 + tsw2 * 0.3, -17, 3 + tsw2, -21, 7 + tsw2 * 1.4); c.lineTo(-19.6, 9 + tsw2 * 1.4); c.bezierCurveTo(-15, 6 + tsw2, -12, 3, -8.2, 1.6); c.closePath();
    c.fillStyle = maskD; c.fill(); c.strokeStyle = OUT; c.lineWidth = 0.8; c.stroke();
    c.restore();
  }

  function body(c, s, pose) {
    var t = s.t, hurt = pose === 'hurt', air = pose === 'air' || pose === 'spin', walk = pose === 'walk', atk = pose === 'atk';
    var ph = t * 13, bob = pose === 'idle' ? Math.sin(t * 3.2) * 0.8 : walk ? -Math.abs(Math.sin(ph)) * 1.6 : 0;
    var lean = s.lean || 0; if (hurt) lean = -0.28; if (walk) lean += 0.06; if (air) lean += 0.1;
    var hx = -1, hy = -22 + bob, mask = s.mask, WD = TB.WEAPONS[s.weapon];
    // foot targets (relative to feet line y=0)
    var bf, ff;
    if (pose === 'idle') { bf = [-8, 0]; ff = [7, 0]; }
    else if (walk) { bf = [-1 - Math.sin(ph) * 10, -Math.max(0, -Math.cos(ph)) * 6]; ff = [-1 + Math.sin(ph) * 10, -Math.max(0, Math.cos(ph)) * 6]; }
    else if (air) { bf = [-5, -10]; ff = [8, -14]; }
    else if (hurt) { bf = [-11, 0]; ff = [3, 0]; }
    else { bf = [-11, 0]; ff = [10, 0]; }   // attack / spin stance
    if (pose === 'spin') { bf = [-8, -6]; ff = [8, -6]; }
    var cl = Math.cos(lean), sl = Math.sin(lean);
    function W2(px, py) { return [hx + px * cl - py * sl, hy + px * sl + py * cl]; }   // torso-local -> world
    var sh = W2(3.4, -22), S = TB.RIG;
    var ra = s.rAng, la = s.lAng;
    if (s.carry) { ra = -1.5; la = -1.75; }
    // ---- back arm, back leg
    if (!WD.single || s.carry) { var lh = arm(c, sh[0] - 1.5, sh[1] + 1, la, S.arm, mask, true); if (!s.carry) { c.save(); c.translate(lh.x, lh.y); c.rotate(la); WD.draw(c, s.tier, s.energy, t); c.restore(); } }
    leg(c, hx - 2.4, hy + 2, bf[0], bf[1], mask, true);
    // ---- torso
    c.save(); c.translate(hx, hy); c.rotate(lean); torsoAndHead(c, s, t, hurt, lean); c.restore();
    leg(c, hx + 2.6, hy + 2, ff[0], ff[1], mask, false);
    // ---- front arm + weapon
    var rh;
    if (WD.single && !s.carry) {   // rear hand grips the shaft behind the front hand
      var hxw = sh[0] + Math.cos(ra) * S.arm, hyw = sh[1] + Math.sin(ra) * S.arm, gx = hxw - Math.cos(ra) * 13, gy = hyw - Math.sin(ra) * 13;
      var rk = ik(sh[0] - 1, sh[1] + 1, gx, gy, 9, 9, ra > -1 ? 1 : -1);
      // staff drawn between the hands (behind the front hand)
      c.save(); c.translate(hxw, hyw); c.rotate(ra); WD.draw(c, s.tier, s.energy, t); c.restore();
      limb(c, sh[0] - 1, sh[1] + 1, rk.kx, rk.ky, 6.4, 5.4, skinG(c, sh[1], rk.ky, true), OUT, 0.9); limb(c, rk.kx, rk.ky, rk.ex, rk.ey, 5.4, 4.6, skinG(c, rk.ky, rk.ey, true), OUT, 0.9); ell(c, rk.ex, rk.ey, 3.1, 3.1, skinG(c, rk.ey - 3, rk.ey + 3, true), OUT, 0.8);
    }
    rh = arm(c, sh[0], sh[1], ra, S.arm, mask, false);
    if (!WD.single && !s.carry) { c.save(); c.translate(rh.x, rh.y); c.rotate(ra); WD.draw(c, s.tier, s.energy, t); c.restore(); }
    if (s.carry) {   // heavy object held overhead
      var cx = (rh.x + sh[0]) / 2 + 2, cy = rh.y - 2;
      c.beginPath(); c.moveTo(cx - 8, cy); c.lineTo(cx - 9.5, cy - 22); c.lineTo(cx + 9.5, cy - 22); c.lineTo(cx + 8, cy); c.closePath(); c.fillStyle = lg(c, cx - 9, 0, cx + 9, 0, [[0, '#4a5058'], [0.35, '#b6bec8'], [1, '#3a4048']]); c.fill(); c.strokeStyle = OUT; c.lineWidth = 1; c.stroke();
      rrect(c, cx - 10.5, cy - 25, 21, 4, 1.6, '#d0d6de', OUT, 0.8);
    }
  }

  TB.drawTurtle = function (c, s) {
    c.save(); c.translate(s.x, s.y); if (s.face < 0) c.scale(-1, 1);
    TB.accent = s.mask;
    if (s.nsway !== undefined) TB.nSway = s.nsway; else TB.nSway = undefined;
    var pose = s.pose, t = s.t;
    if (pose === 'roll') {
      var ang = t * 24;
      c.save(); c.translate(0, -12); c.rotate(ang);
      ell(c, 0, 0, 12, 12, lg(c, -12, -12, 12, 12, [[0, '#c48a4a'], [1, '#4a2c10']]), OUT, 1);
      c.strokeStyle = 'rgba(50,25,6,0.85)'; c.lineWidth = 0.9; c.beginPath(); for (var i = 0; i < 6; i++) { var a = i / 6 * TAU; c.lineTo(Math.cos(a) * 5.6, Math.sin(a) * 5.6); } c.closePath(); c.stroke();
      for (i = 0; i < 6; i++) { a = i / 6 * TAU; c.beginPath(); c.moveTo(Math.cos(a) * 5.6, Math.sin(a) * 5.6); c.lineTo(Math.cos(a) * 12, Math.sin(a) * 12); c.stroke(); }
      c.restore();
      ell(c, 8, -16, 4.6, 4, SK, OUT, 0.8); ell(c, 9.6, -16.6, 1.6, 1.4, '#fff'); rrect(c, 5, -19, 8, 2.6, 1, s.mask, OUT, 0.6);
      c.save(); c.globalAlpha = 0.35; for (i = 0; i < 4; i++) line(c, -14 - i * 4, -6 - i * 3, -22 - i * 4, -6 - i * 3, 1.4, '#ffffff'); c.restore();
      c.restore(); return;
    }
    if (pose === 'down' || pose === 'dead') {
      c.save(); c.translate(-4, -2); c.rotate(-1.52);
      var s2 = Object.assign({}, s, { rAng: 1.2, lAng: 1.4, lean: 0, carry: false }); body(c, s2, 'hurt');
      c.restore(); c.restore(); return;
    }
    body(c, s, pose);
    c.restore();
  };
})(window.TB);
