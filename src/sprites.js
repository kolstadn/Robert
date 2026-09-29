/* Turtle Brawl — procedural pixel art. All art is drawn with 1px rectangles so it stays crisp when scaled.
 * Sprites are drawn facing RIGHT with the origin at the feet; callers flip with scale(-1,1).
 */
(function (TB) {
  'use strict';
  var R = function (c, x, y, w, h, col) { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
  function pline(c, x, y, ang, len, w, col) {
    c.fillStyle = col; var cs = Math.cos(ang), sn = Math.sin(ang), o = w / 2;
    for (var i = 0; i <= len; i++) c.fillRect(Math.round(x + cs * i - o), Math.round(y + sn * i - o), w, w);
  }
  function hash(n) { n = Math.sin(n * 127.1 + 311.7) * 43758.5453; return n - Math.floor(n); }
  TB.R = R; TB.pline = pline; TB.hash = hash;

  /* ---- energy colours; "none" gets a soft neutral glow so Energized+ tiers still read ---- */
  TB.glow = function (en) { return en === 'none' ? ['#8fd0ff', '#e6f6ff', '#ffffff'] : TB.ENERGIES[en].colors; };

  /* =================== WEAPONS (type never changes; tier changes physical detail) =================== */
  TB.WEAPONS = { katana: { len: [0, 27, 27, 27, 29, 32], draw: drawKatana } };

  function drawKatana(c, x, y, ang, tier, en, t) {
    var cs = Math.cos(ang), sn = Math.sin(ang), ec = TB.glow(en), len = TB.WEAPONS.katana.len[tier];
    function seg(u0, u1, w0, w1, col) {
      c.fillStyle = col;
      for (var u = u0; u < u1; u += 0.5) for (var w = w0; w < w1; w += 0.5)
        c.fillRect(Math.round(x + u * cs - w * sn), Math.round(y + u * sn + w * cs), 1, 1);
    }
    function dot(u, w, col) { c.fillStyle = col; c.fillRect(Math.round(x + u * cs - w * sn), Math.round(y + u * sn + w * cs), 1, 1); }
    var u;
    // grip: wrap colour and binding by tier
    seg(-8, -1, -1, 1, tier >= 5 ? '#1c2a6e' : '#5b3d24');
    for (u = -8; u < -1; u += 2) seg(u, u + 1, -1, 1, tier >= 4 ? '#e0b83a' : tier >= 2 ? '#2f5fbf' : '#3a2616');
    // pommel
    if (tier === 1) seg(-9, -8, -1, 1, '#3a3a40');
    else { seg(-10, -8, -1.5, 1.5, '#a0a6b0'); if (tier >= 3) dot(-9.5, 0, ec[1]); if (tier >= 4) seg(-11, -10, -1, 1, tier >= 5 ? ec[2] : '#e0b83a'); }
    // guard (tsuba)
    if (tier === 1) seg(-1, 0.5, -2.5, 2.5, '#2a2a30');
    else if (tier === 2 || tier === 3) { seg(-1.5, 1, -3.5, 3.5, '#8a8f98'); dot(0, -3.5, '#cfd4da'); dot(0, 3, '#cfd4da'); if (tier === 3) dot(-0.5, 0, ec[1]); }
    else if (tier === 4) { seg(-1.5, 1, -4.5, 4.5, '#e0b83a'); seg(-3, -1.5, -5.5, -3.5, '#e0b83a'); seg(-3, -1.5, 3.5, 5.5, '#e0b83a'); dot(-0.5, 0, ec[1]); }
    else { seg(-2, 1.5, -5, 5, '#f0cf5a'); seg(1.5, 4.5, -5.5, -4.5, '#f0cf5a'); seg(1.5, 4.5, 4.5, 5.5, '#f0cf5a'); seg(-3.5, -2, -6, -4, '#f0cf5a'); seg(-3.5, -2, 4, 6, '#f0cf5a'); dot(-0.5, -3, ec[2]); dot(-0.5, 3, ec[2]); dot(-0.5, 0, ec[0]); }
    // blade body
    var steel = tier >= 5 ? '#dfeaf3' : tier >= 4 ? '#c4d0dc' : '#cfd8e0';
    seg(1, len - 3, -1, 0, tier >= 4 ? '#f7fbff' : '#f2f6fa');   // sharp edge
    seg(1, len - 3, 0, 1, tier >= 5 ? '#7a8896' : '#9aa7b4');       // spine
    if (tier >= 2) { seg(1, 8, -1.5, 1.5, steel); seg(1, 8, 1.5, 2, '#5a6470'); dot(9, 0, '#3a4350'); }
    if (tier >= 4) { seg(8, 16, -1.5, 1, steel); for (u = 3; u < len - 4; u++) dot(u, Math.sin(u * 1.1) > 0 ? -0.5 : 0.5, '#e9f1f7'); }
    seg(len - 3, len, -1, 0, '#f2f6fa');                            // tip
    // energy groove / runes / flame
    if (tier >= 3) {
      for (u = 4; u < len - 3; u++) {
        var ph = (Math.floor(u / 2 + t * 10)) % 3;
        dot(u, 0, ph === 0 ? ec[1] : ec[0]);
        if (tier >= 4) dot(u, -1, ph === 1 ? ec[1] : ec[0]);
      }
      dot(len, -0.5, ec[2]); dot(len + 1, -0.5, ec[0]);
    }
    if (tier >= 5) {
      [8, 13, 18, 23].forEach(function (r) { dot(r, 0.5, ec[2]); dot(r, -1.5, ec[2]); });
      for (u = 6; u < len - 1; u += 2) {
        var h = 1 + Math.floor((Math.sin(t * 12 + u) + 1) * 1.6);
        for (var k = 1; k <= h; k++) dot(u, 1 + k, k === 1 ? ec[0] : ec[1]);
      }
    }
  }
  TB.weaponTip = function (weapon, tier, x, y, ang) {
    var L = TB.WEAPONS[weapon].len[tier];
    return { x: x + Math.cos(ang) * L, y: y + Math.sin(ang) * L };
  };

  /* =================== TURTLE =================== */
  var SKIN = '#3fae3a', SKIN_D = '#2a7d2b', SKIN_L = '#6fd35f', SHELL = '#8b5a2b', SHELL_L = '#b5793b', PLAST = '#e8d27a';

  /* s: {x,y (feet, screen), face, pose, t, legPhase, rAng, lAng, tier, energy, weapon, mask, maskDark, carry}
   * poses: idle walk air roll hurt down dead spin */
  TB.drawTurtle = function (c, s) {
    c.save(); c.translate(Math.round(s.x), Math.round(s.y)); if (s.face < 0) c.scale(-1, 1);
    var t = s.t, pose = s.pose, dy = 0, dx = 0, mask = s.mask, maskD = s.maskDark;
    var wdraw = TB.WEAPONS[s.weapon].draw;
    if (pose === 'roll') {
      var f = Math.floor(t * 20) % 4;
      R(c, -9, -19, 18, 16, SHELL); R(c, -7, -21, 14, 2, SHELL); R(c, -7, -3, 14, 2, SHELL);
      R(c, -6, -17, 12, 12, SHELL_L);
      R(c, -6 + (f % 2) * 6, -17, 3, 12, SHELL); R(c, -6, -17 + (f % 2) * 6, 12, 3, SHELL);
      R(c, 4, -15, 5, 4, SKIN); R(c, 7, -14, 2, 2, mask);
      R(c, -12, -12, 3, 2, mask); R(c, -15, -10, 3, 2, maskD);
      c.restore(); return;
    }
    if (pose === 'down' || pose === 'dead') {
      R(c, -18, -8, 26, 8, SHELL); R(c, -14, -7, 16, 3, SHELL_L);
      R(c, 8, -9, 10, 9, SKIN); R(c, 9, -6, 9, 3, mask); R(c, 14, -6, 2, 2, pose === 'dead' ? '#111' : '#fff');
      R(c, -12, -3, 22, 3, SKIN_D); R(c, 14, -2, 8, 3, SKIN);
      if (pose === 'dead') R(c, -24, -4, 6, 2, maskD);
      c.restore(); return;
    }
    var bob = (pose === 'idle') ? Math.round(Math.sin(t * 4) * 0.7) : (pose === 'walk' ? -Math.abs(Math.round(Math.sin(t * 14) * 1.2)) : 0);
    dy = -bob;
    if (pose === 'hurt') { dx = -3; }
    var air = pose === 'air' || pose === 'spin';
    // legs
    var lp = pose === 'walk' ? Math.sin(t * 14) : 0, lift1 = lp > 0.4 ? 2 : 0, lift2 = lp < -0.4 ? 2 : 0;
    if (air) {
      R(c, -4 + dx, -10, 4, 6, SKIN_D); R(c, -3 + dx, -5, 6, 3, SKIN_D);
      R(c, 1 + dx, -9, 4, 6, SKIN); R(c, 2 + dx, -4, 6, 3, SKIN);
    } else {
      R(c, -5 + Math.round(-lp * 3) + dx, -11 + lift2, 4, 11 - lift2, SKIN_D); R(c, -5 + Math.round(-lp * 3) + dx, -3 - lift2, 6, 3, SKIN_D);
      R(c, 1 + Math.round(lp * 3) + dx, -11 + lift1, 4, 11 - lift1, SKIN); R(c, 1 + Math.round(lp * 3) + dx, -3 - lift1, 6, 3, SKIN);
    }
    var by = dy + (air ? -3 : 0);
    // back arm & weapon
    var sx = 3 + dx, sy = -23 + by;
    var la = s.lAng, ra = s.rAng;
    if (s.lShow !== false) {
      var lx = sx + Math.cos(la) * 8, ly = sy + Math.sin(la) * 8;
      pline(c, sx, sy, la, 8, 3, SKIN_D); R(c, lx - 1, ly - 1, 3, 3, SKIN_D); wdraw(c, lx, ly, la, s.tier, s.energy, t);
    }
    // shell, torso, belt
    R(c, -10 + dx, -26 + by, 7, 15, SHELL); R(c, -9 + dx, -24 + by, 5, 2, SHELL_L); R(c, -9 + dx, -19 + by, 5, 2, SHELL_L);
    R(c, -3 + dx, -26 + by, 10, 13, SKIN); R(c, -3 + dx, -26 + by, 10, 2, SKIN_L);
    R(c, 3 + dx, -25 + by, 5, 11, PLAST); R(c, 3 + dx, -21 + by, 5, 1, '#b9a24d'); R(c, 3 + dx, -17 + by, 5, 1, '#b9a24d');
    R(c, -7 + dx, -14 + by, 15, 2, '#6b4a2b'); R(c, 3 + dx, -14 + by, 3, 2, '#e0b83a');
    // head, mask, tails
    var hy = by + (pose === 'hurt' ? 1 : 0);
    R(c, -2 + dx, -37 + hy, 11, 10, SKIN); R(c, -2 + dx, -37 + hy, 11, 2, SKIN_L);
    R(c, -3 + dx, -34 + hy, 13, 4, mask);
    if (pose === 'hurt') { R(c, 5 + dx, -33 + hy, 3, 1, '#fff'); R(c, 6 + dx, -32 + hy, 1, 1, '#111'); } else { R(c, 5 + dx, -33 + hy, 3, 2, '#fff'); R(c, 7 + dx, -33 + hy, 1, 2, '#111'); }
    R(c, 6 + dx, -29 + hy, 3, 1, SKIN_D);
    var fl = Math.round(Math.sin(t * 9) * 1) + (pose === 'walk' ? 1 : 0) + (air ? 2 : 0);
    R(c, -8 + dx, -33 + hy + fl, 6, 2, mask); R(c, -12 + dx, -31 + hy + fl * 2, 5, 2, maskD);
    // front arm & weapon
    if (s.rShow !== false) {
      var rx = sx + Math.cos(ra) * 8, ry = sy + Math.sin(ra) * 8;
      pline(c, sx, sy, ra, 8, 3, SKIN); R(c, rx - 1, ry - 1, 3, 3, SKIN_L); wdraw(c, rx, ry, ra, s.tier, s.energy, t);
    }
    if (s.carry) { // holding a throwable overhead
      R(c, -5 + dx, -52 + by, 12, 14, '#8a9099'); R(c, -6 + dx, -53 + by, 14, 2, '#aab0b8'); R(c, -3 + dx, -49 + by, 1, 8, '#5a6068'); R(c, 2 + dx, -49 + by, 1, 8, '#5a6068');
      pline(c, sx, sy, -1.5, 8, 3, SKIN);
    }
    c.restore();
  };

  /* =================== ENEMIES ===================
   * draw(c, e, t): origin at feet, facing right. e.state / e.st (state time) / e.tele / e.ang give pose.
   */
  var E = {};
  TB.drawEnemy = function (c, e, x, y) {
    c.save(); c.translate(Math.round(x), Math.round(y)); if (e.face < 0) c.scale(-1, 1);
    E[e.type](c, e, TB.G.time + e.seed);
    c.restore();
  };

  E.rat = function (c, e, t) {
    var st = e.state, run = (st === 'circle' || st === 'lunge' || st === 'flee') ? Math.sin(t * 22) : 0, lean = st === 'tele' ? -2 : 0;
    var shake = st === 'tele' ? Math.round(Math.sin(t * 60)) : 0;
    if (st === 'down' || st === 'lying') { R(c, -8, -6, 16, 6, '#7a6a5a'); R(c, 8, -7, 7, 5, '#8a7a6a'); R(c, 13, -5, 2, 2, '#f2a0b0'); R(c, -14, -2, 6, 1, '#d9a0a0'); R(c, 10, -6, 2, 2, '#fff'); return; }
    var body = st === 'lunge' ? -1 : 0;
    R(c, -7 + shake, -10 + lean, 14, 7, '#7a6a5a'); R(c, -4 + shake, -6 + lean, 8, 4, '#b8a898');
    R(c, -3 + shake, -10 + lean, 8, 3, '#3a6a9a');
    R(c, 5 + shake, -12 + lean, 8, 7, '#8a7a6a'); R(c, 12 + shake, -10 + lean, 3, 3, '#8a7a6a'); R(c, 14 + shake, -10 + lean, 2, 2, '#f2a0b0');
    R(c, 9 + shake, -11 + lean, 2, 2, '#fff'); R(c, 10 + shake, -11 + lean, 1, 1, st === 'tele' ? '#f33' : '#000');
    R(c, 6 + shake, -16 + lean, 3, 4, '#8a7a6a'); R(c, 7 + shake, -15 + lean, 1, 2, '#e8a0a8');
    R(c, -11 + shake, -7 + lean, 4, 1, '#d9a0a0'); R(c, -14 + shake, -9 + lean, 3, 1, '#d9a0a0'); R(c, -16 + shake, -11 + lean, 2, 1, '#d9a0a0');
    R(c, -5 + Math.round(run * 2), -3, 3, 3, '#5a4a3a'); R(c, 3 - Math.round(run * 2), -3, 3, 3, '#5a4a3a');
    if (st === 'tele' || st === 'lunge') { R(c, 12 + body, -6, 8, 1, '#e8e8e8'); R(c, 11 + body, -7, 2, 3, '#6a4a2a'); }
  };

  E.mantis = function (c, e, t) {
    var st = e.state, k = e.tele || 0, run = st === 'approach' ? Math.sin(t * 10) : 0;
    if (st === 'down' || st === 'lying') { R(c, -16, -10, 30, 9, '#8fd04a'); R(c, 14, -12, 9, 9, '#9be050'); R(c, 20, -10, 3, 3, '#f2e04a'); R(c, -18, -6, 6, 4, '#7fbf3a'); return; }
    R(c, -4 + Math.round(run * 2), -14, 2, 14, '#5aa02a'); R(c, 2 - Math.round(run * 2), -14, 2, 14, '#5aa02a');
    R(c, -6 + Math.round(run * 2), -2, 5, 2, '#4a8a20'); R(c, 1 - Math.round(run * 2), -2, 5, 2, '#4a8a20');
    R(c, -12, -24, 9, 11, '#6fb030'); R(c, -14, -20, 4, 6, '#5aa02a');            // abdomen
    R(c, -4, -34, 9, 20, '#8fd04a'); R(c, -1, -30, 4, 12, '#b7e878');             // thorax
    R(c, -9, -33, 6, 14, 'rgba(210,255,210,0.55)');                                // wing
    R(c, 0, -44, 10, 10, '#9be050'); R(c, 6, -42, 4, 4, '#f2e04a'); R(c, 8, -41, 1, 2, '#111'); R(c, 7, -35, 3, 1, '#4a8a20');
    R(c, 5, -49, 1, 5, '#5aa02a'); R(c, 9, -50, 1, 6, '#5aa02a');
    // scythe arms
    var a1, a2;
    if (st === 'tele') { a1 = -2.2; a2 = -2.0; }
    else if (st === 'slash') { var p = e.slashP; a1 = -1.7 + p * 2.4; a2 = a1 - 0.2; if (e.slashN % 2) { a1 = 0.7 - p * 2.4; a2 = a1 - 0.2; } }
    else if (st === 'windup') { a1 = e.slashN % 2 ? 0.9 : -1.8; a2 = a1 - 0.1; }
    else { a1 = -0.8 + Math.sin(t * 3) * 0.1; a2 = 0.3; }
    [[a1, '#7fbf3a'], [a2, '#6fb030']].forEach(function (a, i) {
      var sx = 3, sy = -30, ex = sx + Math.cos(a[0]) * 7, ey = sy + Math.sin(a[0]) * 7;
      pline(c, sx, sy, a[0], 7, 2, a[1]);
      var bl = st === 'tele' || st === 'slash' || st === 'windup';
      pline(c, ex, ey, a[0] + 0.5, bl ? 17 : 13, 2, '#cfdae4'); pline(c, ex, ey - 1, a[0] + 0.5, bl ? 17 : 13, 1, '#ffffff');
    });
    if (k > 0 && st === 'tele' && Math.floor(t * 20) % 2) { R(c, -6, -46, 18, 46, 'rgba(255,255,255,0.35)'); }
  };

  E.bat = function (c, e, t) {
    var st = e.state, flap = (st === 'exposed' || st === 'down' || st === 'lying') ? 0.15 : Math.sin(t * (st === 'swoop' ? 24 : 16));
    if (st === 'down' || st === 'lying') { R(c, -8, -6, 16, 6, '#5a3d7a'); R(c, 8, -8, 8, 7, '#6a4a8a'); R(c, 12, -6, 2, 2, '#ff5a5a'); R(c, -14, -3, 10, 3, '#3f2a5a'); return; }
    for (var i = 0; i < 14; i++) {  // far & near wings as membrane strips
      var top = -9 - flap * (i / 13) * 15 - i * 0.2, h = 7 - i * 0.35;
      R(c, -3 - i, top, 1, h, '#3f2a5a'); R(c, -3 - i, top, 1, 1, '#7a5aa0');
    }
    R(c, -6, -11, 11, 9, '#5a3d7a'); R(c, -3, -7, 6, 4, '#8a6aaa');
    R(c, 4, -13, 8, 8, '#6a4a8a'); R(c, 5, -17, 2, 4, '#6a4a8a'); R(c, 10, -17, 2, 4, '#6a4a8a');
    R(c, 9, -11, 2, 2, e.state === 'tele' ? '#ffff5a' : '#ff5a5a'); R(c, 8, -6, 1, 2, '#fff'); R(c, 11, -6, 1, 2, '#fff');
    for (i = 0; i < 10; i++) { var top2 = -8 - flap * (i / 9) * 12, h2 = 6 - i * 0.4; R(c, 1 - i, top2, 1, h2, '#4f3570'); }
    if (e.state === 'tele') { R(c, 12, -10, 5, 1, '#fff'); R(c, 13, -13, 4, 1, '#fff'); R(c, 13, -7, 4, 1, '#fff'); }
  };

  E.porcupine = function (c, e, t) {
    var st = e.state, raise = (st === 'tele' || st === 'burstT') ? 1 : 0, hot = raise ? '#ff5a3a' : '#3a2a1a', walk = st === 'reposition' ? Math.sin(t * 8) : 0;
    if (st === 'down' || st === 'lying') { R(c, -14, -12, 28, 12, '#8a6a4a'); R(c, 14, -10, 9, 9, '#a88a68'); for (var q = 0; q < 8; q++) R(c, -12 + q * 3, -18 - (q % 2) * 2, 2, 7, '#e8d8b0'); return; }
    var sh = raise ? Math.round(Math.sin(t * 50)) : 0;
    for (var i = 0; i < 10; i++) {
      var qx = -13 + i * 2.6, ql = 7 + (i % 3) * 2 + raise * 7 + (raise ? Math.round(Math.sin(t * 12 + i)) : 0);
      R(c, qx + sh, -24 - ql, 2, ql, '#e8d8b0'); R(c, qx + sh, -24 - ql, 2, 2, hot);
    }
    R(c, -12 + sh, -26, 24, 18, '#8a6a4a'); R(c, -2 + sh, -16, 13, 7, '#d8b890');
    R(c, 9, -28, 11, 11, '#a88a68'); R(c, 18, -24, 5, 5, '#3a2a1a'); R(c, 13, -26, 2, 2, '#fff'); R(c, 14, -26, 1, 2, raise ? '#f33' : '#000');
    R(c, 11, -30, 3, 3, '#8a6a4a');
    R(c, -8 + Math.round(walk * 2), -9, 6, 9, '#6a4a2a'); R(c, 4 - Math.round(walk * 2), -9, 6, 9, '#7a5a3a');
    R(c, -9, -1, 8, 2, '#3a2a1a'); R(c, 4, -1, 8, 2, '#3a2a1a');
    R(c, 10, -16, 8, 3, '#8a6a4a');
    if (st === 'recover') { R(c, 12, -36, 2, 3, '#ffe94a'); R(c, 9, -38, 2, 2, '#ffe94a'); }
  };

  E.rhino = function (c, e, t) {
    var st = e.state, k = e.tele || 0, lean = (st === 'charge') ? 5 : 0, walk = st === 'approach' ? Math.sin(t * 6) : 0;
    if (st === 'down' || st === 'lying') { R(c, -22, -20, 44, 20, '#7d8a96'); R(c, 20, -18, 16, 14, '#8b98a4'); R(c, 34, -14, 8, 4, '#e8e2d0'); R(c, -24, -12, 6, 4, '#6a7480'); return; }
    var stomp = st === 'tele' ? Math.round(Math.abs(Math.sin(t * 14)) * 2) : 0;
    R(c, -13 + Math.round(walk * 2), -17, 10, 17 - stomp, '#6a7480'); R(c, 5 - Math.round(walk * 2), -17, 10, 17, '#7d8a96');
    R(c, -15 + Math.round(walk * 2), -3, 13, 3, '#3a444e'); R(c, 4 - Math.round(walk * 2), -3, 13, 3, '#3a444e');
    R(c, -17 + lean, -42, 34, 27, '#7d8a96'); R(c, -14 + lean, -30, 26, 12, '#a5b0ba');
    R(c, -3 + lean, -45, 17, 9, '#3a444e'); R(c, -1 + lean, -43, 2, 2, '#8a96a2'); R(c, 8 + lean, -43, 2, 2, '#8a96a2');
    R(c, -17 + lean, -20, 34, 3, '#4a3a2a'); R(c, -2 + lean, -20, 5, 3, '#e0b83a');
    var hy = st === 'charge' ? 4 : (st === 'tele' ? 2 : 0);
    R(c, 12 + lean, -46 + hy, 17, 17, '#8b98a4'); R(c, 26 + lean, -38 + hy, 9, 6, '#6e7b87');
    R(c, 28 + lean, -45 + hy, 5, 7, '#efe8d4'); R(c, 32 + lean, -46 + hy, 3, 4, '#efe8d4');
    R(c, 20 + lean, -41 + hy, 3, 3, st === 'tele' ? '#ff4a3a' : '#f5f0d0'); R(c, 18 + lean, -43 + hy, 7, 1, '#222');
    R(c, 13 + lean, -50 + hy, 4, 5, '#6e7b87');
    var fa = st === 'swipe' ? 3 : 0;
    R(c, 14 + lean + fa * 4, -30 - (st === 'stele' ? 8 : 0), 9, 9, '#6e7b87'); R(c, 20 + lean + fa * 4, -28 - (st === 'stele' ? 8 : 0), 4, 3, '#4a5560');
    if (st === 'stun') for (var i = 0; i < 3; i++) { var a = t * 5 + i * 2.1; R(c, 20 + Math.cos(a) * 12, -56 + Math.sin(a) * 4, 3, 3, '#ffe94a'); }
    if (st === 'tele' && Math.floor(t * 14) % 2) R(c, 12, -47, 18, 3, 'rgba(255,60,60,0.7)');
  };

  E.boss = function (c, e, t) {
    var st = e.state, tt = e.st, jaw = 3, tailAng = Math.sin(t * 2) * 3, arm = 0;
    if (st === 'tele' && e.atk === 'tail') { tailAng = -6 - Math.min(1, tt / 0.8) * 8; }
    if (st === 'active' && e.atk === 'tail') { tailAng = 12; }
    if (st === 'active' && e.atk === 'grab') { jaw = 8; arm = 6; }
    if (st === 'tele' && e.atk === 'grab') { jaw = 9; arm = -4; }
    if (st === 'roar') { jaw = 11 + Math.round(Math.sin(t * 30)); }
    var crouch = (st === 'tele' && e.atk === 'leap') ? 6 : 0, air = e.z > 4 ? 0 : 0;
    if (st === 'down' || st === 'lying') { R(c, -28, -22, 54, 22, '#5b8a3a'); R(c, 26, -20, 26, 12, '#6b9a44'); R(c, -30, -10, 18, 6, '#4b7a2a'); return; }
    // tail
    for (var i = 0; i < 9; i++) {
      var tx = -20 - i * 6, ty = -20 - crouch * 0.3 + Math.sin(i * 0.5 + t * 2) * 1 + tailAng * (i / 8) * (e.atk === 'tail' && st !== 'idle' ? 2 : 1);
      R(c, tx, ty, 8, 12 - i, '#4b7a2a'); R(c, tx, ty, 8, 2, '#6b9a44');
    }
    R(c, -13, -17, 10, 17, '#4b7a2a'); R(c, 3, -17, 11, 17, '#5b8a3a');
    R(c, -13, -3, 12, 3, '#2a4a1a'); R(c, 3, -3, 13, 3, '#2a4a1a');
    R(c, -19, -50 + crouch, 38, 34, '#5b8a3a'); R(c, -12, -38 + crouch, 26, 20, '#c9c27a');
    R(c, -18, -50 + crouch, 36, 5, '#6b9a44');
    // warden vest
    R(c, -12, -49 + crouch, 24, 15, '#4a4a52'); R(c, -10, -47 + crouch, 20, 3, '#6a6a76'); R(c, 0, -41 + crouch, 6, 6, '#e0b83a'); R(c, 2, -39 + crouch, 2, 2, '#4a4a52');
    // head
    R(c, 12, -54 + crouch, 32, 11 - Math.floor(jaw / 3), '#6b9a44'); R(c, 14, -43 + crouch + jaw - 3, 28, 6, '#5b8a3a');
    R(c, 42, -53 + crouch, 4, 3, '#4b7a2a');
    for (var k = 0; k < 6; k++) { R(c, 16 + k * 5, -44 + crouch - Math.floor(jaw / 3) + 1, 2, 3, '#fff'); R(c, 17 + k * 5, -40 + crouch + jaw - 4, 2, 2, '#fff'); }
    R(c, 22, -58 + crouch, 6, 5, '#6b9a44'); R(c, 24, -57 + crouch, 3, 3, st === 'tele' || st === 'roar' ? '#ff4a3a' : '#f0e040'); R(c, 25, -57 + crouch, 1, 3, '#111');
    // arms & claws
    R(c, 12 + arm, -34 + crouch, 12, 7, '#5b8a3a'); R(c, 22 + arm, -35 + crouch, 5, 9, '#c9c27a'); R(c, 25 + arm, -34 + crouch, 4, 2, '#fff'); R(c, 25 + arm, -30 + crouch, 4, 2, '#fff');
    if (e.opening && Math.floor(t * 12) % 2) { R(c, 30, -68, 3, 3, '#ffe94a'); R(c, 24, -70, 3, 3, '#ffe94a'); R(c, 36, -66, 3, 3, '#ffe94a'); }
  };

  /* =================== PROPS / ITEMS =================== */
  TB.drawProp = function (c, p, x, y, t) {
    x = Math.round(x); y = Math.round(y);
    var shake = p.shake > 0 ? Math.round(Math.sin(t * 60) * 1) : 0;
    x += shake;
    if (p.type === 'crate') {
      R(c, x - 9, y - 16, 18, 16, '#9a6a34'); R(c, x - 9, y - 16, 18, 2, '#b98a4a'); R(c, x - 9, y - 2, 18, 2, '#6a4a22');
      R(c, x - 9, y - 16, 2, 16, '#6a4a22'); R(c, x + 7, y - 16, 2, 16, '#6a4a22'); pline(c, x - 8, y - 15, 0.75, 20, 2, '#7a5424');
    } else if (p.type === 'barrel') {
      R(c, x - 8, y - 20, 16, 20, '#3a6ea5'); R(c, x - 9, y - 16, 18, 12, '#3a6ea5'); R(c, x - 8, y - 18, 16, 2, '#6a9ad0');
      R(c, x - 9, y - 15, 18, 2, '#22405f'); R(c, x - 9, y - 6, 18, 2, '#22405f'); R(c, x - 2, y - 12, 4, 4, '#ffd23a'); R(c, x - 1, y - 11, 2, 2, '#22405f');
    } else if (p.type === 'can') {
      R(c, x - 7, y - 18, 14, 18, '#8a9099'); R(c, x - 8, y - 20, 16, 3, '#aab0b8'); R(c, x - 4, y - 15, 1, 12, '#5a6068'); R(c, x, y - 15, 1, 12, '#5a6068'); R(c, x + 4, y - 15, 1, 12, '#5a6068');
      if (p.glint) R(c, x - 2, y - 26 + Math.round(Math.sin(t * 4) * 1), 4, 4, '#ffe94a');
    } else if (p.type === 'secret') {
      R(c, x - 16, y - 20, 32, 20, '#3a4a50'); R(c, x - 16, y - 20, 32, 3, '#5a6a72');
      pline(c, x - 4, y - 18, 1.1, 10, 1, '#121a1e'); pline(c, x + 4, y - 10, -0.6, 8, 1, '#121a1e'); pline(c, x - 10, y - 8, 0.4, 8, 1, '#121a1e');
      if (Math.floor(t * 2) % 4 === 0) R(c, x + 10, y - 16, 2, 2, '#c9f4ff');
    } else if (p.type === 'valve') {
      R(c, x - 5, y - 26, 10, 26, '#5a6a72'); R(c, x - 14, y - 36, 28, 4, '#c06a2b'); R(c, x - 3, y - 44, 6, 12, '#c06a2b');
      var a = p.turn || 0; pline(c, x, y - 34, a, 12, 3, '#e0b83a'); pline(c, x, y - 34, a + Math.PI, 12, 3, '#e0b83a'); pline(c, x, y - 34, a + 1.57, 12, 3, '#e0b83a'); pline(c, x, y - 34, a - 1.57, 12, 3, '#e0b83a');
      if (!p.done && Math.floor(t * 3) % 2) R(c, x - 3, y - 58, 6, 8, '#ff4a3a');
    }
  };
  TB.drawItem = function (c, it, x, y, t) {
    x = Math.round(x); y = Math.round(y - Math.abs(Math.sin(t * 5 + it.seed)) * 2);
    if (it.type === 'pizza') { R(c, x - 6, y - 8, 12, 8, '#f0c040'); R(c, x - 5, y - 9, 10, 1, '#c8862a'); R(c, x - 3, y - 6, 3, 3, '#d8402a'); R(c, x + 2, y - 4, 3, 3, '#d8402a'); R(c, x - 6, y - 1, 12, 1, '#c8862a'); }
    else { R(c, x - 3, y - 6, 6, 6, '#ffd23a'); R(c, x - 2, y - 5, 4, 4, '#ffea7a'); R(c, x - 1, y - 4, 2, 2, '#c8962a'); }
  };
  TB.drawShadow = function (c, x, y, hw, alpha) {
    x = Math.round(x); y = Math.round(y);
    c.fillStyle = 'rgba(0,0,0,' + (alpha || 0.35) + ')';
    c.fillRect(x - hw, y - 1, hw * 2, 3); c.fillRect(x - hw + 2, y - 2, hw * 2 - 4, 1); c.fillRect(x - hw + 2, y + 2, hw * 2 - 4, 1);
  };

  /* =================== BACKGROUNDS =================== */
  var PAL = {
    sewer:   { dark: '#141f26', a: '#1f313a', b: '#243a44', mortar: '#0f171c', moss: '#2e5a3d', lamp: '#ffb454', water: '#1f9e74', waterHi: '#5be0a8', fA: '#2c3a40', fB: '#33444b', curb: '#4a5f66', pipe: '#3d5560' },
    pump:    { dark: '#1d1a24', a: '#2c2632', b: '#342d3a', mortar: '#15121b', moss: '#4a5a2a', lamp: '#ff9a3c', water: '#6cae2c', waterHi: '#b8ec5a', fA: '#3a3a44', fB: '#42424e', curb: '#5a5a68', pipe: '#b8652b' },
    chamber: { dark: '#0f1d2b', a: '#1a2f43', b: '#203850', mortar: '#0a141e', moss: '#2a5a5a', lamp: '#7fd8ff', water: '#2b8fd0', waterHi: '#8fe0ff', fA: '#28384a', fB: '#30435a', curb: '#4b6a8a', pipe: '#5a7a99' }
  };
  function tile(w, h, fn) { var cv = document.createElement('canvas'); cv.width = w; cv.height = h; fn(cv.getContext('2d')); return cv; }
  var BG = {};
  function buildZone(name) {
    var p = PAL[name], z = {};
    z.far = tile(240, 150, function (c) {
      R(c, 0, 0, 240, 150, p.dark);
      for (var row = 0; row < 25; row++) for (var col = -1; col < 21; col++) {
        var off = (row % 2) * 6, hh = hash(row * 31 + col * 7 + name.length);
        R(c, col * 12 + off, row * 6, 11, 5, hh > 0.6 ? p.b : p.a);
        if (hh > 0.93) R(c, col * 12 + off, row * 6 + 3, 11, 2, p.moss);
      }
      R(c, 70, 40, 100, 110, p.mortar); R(c, 76, 34, 88, 8, p.mortar); R(c, 84, 28, 72, 8, p.mortar);   // tunnel arch
      R(c, 78, 46, 84, 104, p.dark); R(c, 92, 40, 56, 8, p.dark);
      for (var i = 0; i < 14; i++) R(c, 86 + i * 5, 60 + i * 4, 4, 2, 'rgba(255,255,255,0.05)');
      R(c, 0, 0, 240, 150, 'rgba(8,12,20,0.35)');
    });
    z.mid = tile(160, 150, function (c) {
      R(c, 66, 0, 16, 150, p.b); R(c, 66, 0, 3, 150, p.a); R(c, 79, 0, 3, 150, p.mortar);
      for (var y = 0; y < 150; y += 12) R(c, 66, y, 16, 1, p.mortar);
      R(c, 0, 30, 160, 7, p.pipe); R(c, 0, 30, 160, 2, 'rgba(255,255,255,0.15)'); R(c, 0, 35, 160, 2, 'rgba(0,0,0,0.3)');
      R(c, 0, 44, 160, 5, p.pipe); R(c, 0, 44, 160, 1, 'rgba(255,255,255,0.15)');
      R(c, 62, 27, 24, 13, p.pipe); R(c, 62, 27, 24, 2, 'rgba(255,255,255,0.15)');
      R(c, 76, 66, 8, 6, '#2a2a30'); R(c, 78, 70, 4, 9, p.lamp); R(c, 79, 71, 2, 6, '#fff3d0');
      for (var m = 0; m < 6; m++) R(c, 66 + hash(m) * 12, 120 + m * 4, 3, 2, p.moss);
      R(c, 110, 60, 3, 90, 'rgba(0,0,0,0.25)'); R(c, 12, 70, 3, 80, 'rgba(0,0,0,0.25)');
    });
    z.floor = tile(48, 112, function (c) {
      R(c, 0, 0, 48, 112, p.fA);
      for (var row = 0; row < 8; row++) for (var col = 0; col < 3; col++) {
        var hh = hash(row * 13 + col * 5 + name.length);
        R(c, col * 16 + (row % 2) * 8 - 8, row * 14, 16, 14, hh > 0.5 ? p.fB : p.fA);
        R(c, col * 16 + (row % 2) * 8 - 8, row * 14, 16, 1, 'rgba(0,0,0,0.25)');
        R(c, col * 16 + (row % 2) * 8 - 8, row * 14, 1, 14, 'rgba(0,0,0,0.25)');
      }
      R(c, 0, 0, 48, 4, p.curb); R(c, 0, 4, 48, 2, 'rgba(0,0,0,0.4)');
    });
    return z;
  }
  TB.buildBackgrounds = function () { for (var k in PAL) BG[k] = buildZone(k); };

  function drawZoneLayers(c, z, p, cam, time) {
    var i, o;
    o = -((cam * 0.35) % 240); for (i = 0; i < 3; i++) c.drawImage(z.far, Math.round(o + i * 240), 0);
    o = -((cam * 0.7) % 160);
    for (i = 0; i < 4; i++) {
      c.drawImage(z.mid, Math.round(o + i * 160), 0);
      var lx = Math.round(o + i * 160 + 80), g = c.globalAlpha;
      c.globalCompositeOperation = 'lighter'; var rad = 44 + Math.round(Math.sin(time * 3 + i) * 1);
      var gr = c.createRadialGradient(lx, 74, 2, lx, 74, rad); gr.addColorStop(0, hex2rgba(p.lamp, 0.35)); gr.addColorStop(1, hex2rgba(p.lamp, 0));
      c.fillStyle = gr; c.fillRect(lx - rad, 74 - rad, rad * 2, rad * 2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = g;
    }
    // water channel (animated)
    R(c, 0, 146, 480, 16, p.water);
    for (i = 0; i < 40; i++) { var wx = (i * 13 + Math.floor(time * 12 + hash(i) * 40)) % 480; R(c, wx, 148 + (i % 4) * 3, 7, 1, p.waterHi); }
    R(c, 0, 146, 480, 2, 'rgba(0,0,0,0.35)');
    o = -(cam % 48); for (i = 0; i < 11; i++) c.drawImage(z.floor, Math.round(o + i * 48), 160);
  }
  function hex2rgba(h, a) { var n = parseInt(h.slice(1), 16); return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')'; }

  TB.drawBackground = function (c, cam, time) {
    var zs = TB.STAGE.zones;
    for (var i = 0; i < zs.length; i++) {
      var x0 = zs[i].from - cam, x1 = (i + 1 < zs.length ? zs[i + 1].from : 1e9) - cam;
      var cl0 = Math.max(0, x0), cl1 = Math.min(TB.W, x1);
      if (cl1 <= cl0) continue;
      c.save(); c.beginPath(); c.rect(cl0, 0, cl1 - cl0, TB.H); c.clip();
      drawZoneLayers(c, BG[zs[i].pal], PAL[zs[i].pal], cam, time);
      c.restore();
    }
    for (i = 1; i < zs.length; i++) { // bulkhead gates hide the zone seams
      var bx = Math.round(zs[i].from - cam);
      if (bx < -40 || bx > TB.W + 40) continue;
      R(c, bx - 14, 0, 28, 160, '#22262e'); R(c, bx - 14, 0, 3, 160, '#3a404c'); R(c, bx + 11, 0, 3, 160, '#0c0e12');
      for (var y = 0; y < 160; y += 16) { R(c, bx - 10, y, 20, 8, '#e0b83a'); R(c, bx - 10 + ((y / 16) % 2) * 6, y, 6, 8, '#1a1a1a'); }
      R(c, bx - 14, 156, 28, 6, '#4a505c');
    }
    R(c, 0, 0, 480, 18, 'rgba(0,0,0,0.3)');
  };
})(window.TB);
