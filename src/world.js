/* Turtle Brawl — environments, props and items (vector art, pre-rendered at 2x where static). */
(function (TB) {
  'use strict';
  var A = TB.art, poly = A.poly, ell = A.ell, rrect = A.rrect, line = A.line, limb = A.limb;
  var lg = TB.lg, rg = TB.rg, lit = TB.lit, mix = TB.mix, rgba = TB.rgba, hash = TB.hash, TAU = TB.TAU;
  var W = TB.W, H = TB.H, SC = 2;   // pre-render scale

  var PAL = {
    sewer:   { a: '#22363d', b: '#2e4650', dark: '#0d171c', mortar: '#0a1216', moss: '#4a8a4a', lamp: '#ffc46a', water: '#1d8f6c', waterHi: '#7df0bf', fA: '#33444a', fB: '#3d5158', curb: '#5b747a', pipe: '#476069', fog: '#12332e', feat: 'sewer' },
    pump:    { a: '#332b3a', b: '#443a4d', dark: '#120e18', mortar: '#0c0910', moss: '#7a9a3a', lamp: '#ff9a4a', water: '#6aa82a', waterHi: '#c4f26a', fA: '#40404c', fB: '#4c4c5a', curb: '#6a6a7c', pipe: '#c26a30', fog: '#241a2c', feat: 'pump' },
    chamber: { a: '#1c3348', b: '#264660', dark: '#0a141e', mortar: '#070d14', moss: '#3a8a8a', lamp: '#8fe0ff', water: '#2a8ccc', waterHi: '#9fe6ff', fA: '#2c4054', fB: '#365068', curb: '#54789a', pipe: '#5f86a6', fog: '#0f2638', feat: 'chamber' },
    lab:     { a: '#26313c', b: '#33424f', dark: '#0d1319', mortar: '#080c10', moss: '#3a9a9a', lamp: '#c8f4ff', water: '#3ad0b0', waterHi: '#b0fff0', fA: '#34424f', fB: '#405060', curb: '#6a8aa0', pipe: '#8a9aaa', fog: '#102026', feat: 'lab' },
    foundry: { a: '#3a2820', b: '#4c3428', dark: '#170f0b', mortar: '#0d0807', moss: '#9a4a1a', lamp: '#ff8a34', water: '#e0501a', waterHi: '#ffc060', fA: '#44342c', fB: '#52403a', curb: '#7a5644', pipe: '#94502c', fog: '#2a1408', feat: 'foundry' }
  };

  function tile(w, h, fn) { var cv = document.createElement('canvas'); cv.width = w * SC; cv.height = h * SC; var c = cv.getContext('2d'); c.scale(SC, SC); fn(c); return cv; }

  function bricks(c, w, h, bw, bh, p, seed) {
    var nc = Math.round(w / bw), nr = Math.ceil(h / bh), row, col;
    c.fillStyle = p.mortar; c.fillRect(0, 0, w, h);
    for (row = 0; row < nr; row++) for (col = -1; col <= nc; col++) {
      var off = (row % 2) * bw / 2, x = col * bw + off, y = row * bh, cc = ((col % nc) + nc) % nc, hv = hash(row * 31 + cc * 7 + seed);
      var base = mix(p.a, p.b, hv);
      rrect(c, x + 0.6, y + 0.6, bw - 1.2, bh - 1.2, 1.3, lg(c, 0, y, 0, y + bh, [[0, lit(base, 0.14)], [0.5, base], [1, lit(base, -0.22)]]));
      c.fillStyle = 'rgba(255,255,255,0.06)'; c.fillRect(x + 1.5, y + 0.8, bw - 3, 0.7);
      if (hv > 0.8) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(x + hv * 4, y + 2, 2 + hv * 3, 1.5); }   // chips
      if (hv < 0.12) { ell(c, x + bw * 0.5, y + bh * 0.7, bw * 0.4, bh * 0.35, rgba(p.moss, 0.35)); }
    }
  }
  function stains(c, w, h, p, seed, n) {
    for (var i = 0; i < n; i++) {
      var x = hash(seed + i * 3) * w, y0 = hash(seed + i * 5) * h * 0.5, len = 15 + hash(seed + i * 7) * 50, ww = 2 + hash(seed + i * 11) * 5;
      c.fillStyle = lg(c, 0, y0, 0, y0 + len, [[0, 'rgba(0,0,0,0)'], [0.4, i % 3 ? 'rgba(0,0,0,0.28)' : rgba(p.moss, 0.3)], [1, 'rgba(0,0,0,0)']]);
      c.fillRect(x, y0, ww, len);
    }
  }
  function pipe(c, x0, x1, y, th, col) {
    c.fillStyle = lg(c, 0, y - th / 2, 0, y + th / 2, [[0, lit(col, 0.35)], [0.3, lit(col, 0.1)], [0.7, lit(col, -0.15)], [1, lit(col, -0.45)]]);
    c.fillRect(x0, y - th / 2, x1 - x0, th);
    c.fillStyle = 'rgba(255,255,255,0.22)'; c.fillRect(x0, y - th / 2 + th * 0.18, x1 - x0, 0.8);
  }
  function flange(c, x, y, th, col) {
    rrect(c, x - 2.5, y - th / 2 - 2, 5, th + 4, 1.2, lg(c, x - 2.5, 0, x + 2.5, 0, [[0, lit(col, 0.3)], [1, lit(col, -0.4)]]), '#000', 0.5);
    for (var b = -1; b <= 1; b += 2) ell(c, x, y + b * (th / 2 + 0.2), 0.9, 0.9, lit(col, 0.5));
  }

  /* ---------------- far layer: brick wall with a receding tunnel ---------------- */
  function makeFar(p, k) {
    return tile(240, 150, function (c) {
      bricks(c, 240, 150, 16, 8, p, k * 5);
      stains(c, 240, 150, p, k * 9, 14);
      var cx = 120, cy = 48, R = 50;
      // arch stones
      c.beginPath(); c.moveTo(cx - R - 6, 150); c.lineTo(cx - R - 6, cy); c.arc(cx, cy, R + 6, Math.PI, 0); c.lineTo(cx + R + 6, 150); c.closePath(); c.fillStyle = p.mortar; c.fill();
      for (var s = 0; s < 14; s++) {
        var a0 = Math.PI + s / 14 * Math.PI, a1 = Math.PI + (s + 1) / 14 * Math.PI, hv = hash(s + k);
        c.beginPath(); c.arc(cx, cy, R + 6, a0 + 0.01, a1 - 0.01); c.arc(cx, cy, R, a1 - 0.01, a0 + 0.01, true); c.closePath();
        c.fillStyle = mix(p.a, p.b, hv); c.fill(); c.strokeStyle = 'rgba(0,0,0,0.5)'; c.lineWidth = 0.6; c.stroke();
      }
      // tunnel depth
      c.beginPath(); c.moveTo(cx - R, 150); c.lineTo(cx - R, cy); c.arc(cx, cy, R, Math.PI, 0); c.lineTo(cx + R, 150); c.closePath();
      c.fillStyle = rg(c, cx, 105, 4, 95, [[0, mix(p.lamp, p.dark, 0.7)], [0.18, mix(p.a, p.dark, 0.55)], [0.6, p.dark], [1, '#020406']]); c.fill();
      for (var r = 1; r <= 4; r++) { var rr = R - r * 9; c.beginPath(); c.moveTo(cx - rr, 150); c.lineTo(cx - rr, cy + 8 * r * 0.4); c.arc(cx, cy + 8 * r * 0.4, rr, Math.PI, 0); c.lineTo(cx + rr, 150); c.strokeStyle = 'rgba(255,255,255,' + (0.05 + r * 0.01) + ')'; c.lineWidth = 0.8; c.stroke(); }
      A.glow(c, cx, 108, 22, p.lamp, 0.35);
      // haze near floor
      c.fillStyle = lg(c, 0, 80, 0, 150, [[0, 'rgba(0,0,0,0)'], [1, rgba(p.fog, 0.75)]]); c.fillRect(0, 80, 240, 70);
      c.fillStyle = 'rgba(6,10,16,0.3)'; c.fillRect(0, 0, 240, 150);
    });
  }

  /* ---------------- mid layer: pillar, pipes, lamp bracket + zone features ---------------- */
  function makeMid(p, k) {
    return tile(160, 150, function (c) {
      // horizontal pipes (seamless)
      pipe(c, 0, 160, 30, 8, p.pipe); pipe(c, 0, 160, 44, 5, mix(p.pipe, p.dark, 0.3));
      [20, 100].forEach(function (fx) { flange(c, fx, 30, 8, p.pipe); });
      flange(c, 140, 44, 5, p.pipe);
      // sagging cable
      c.beginPath(); c.moveTo(0, 12); c.quadraticCurveTo(80, 34, 160, 12); c.strokeStyle = '#0a0a0e'; c.lineWidth = 1.6; c.stroke();
      c.beginPath(); c.moveTo(0, 12); c.quadraticCurveTo(80, 34, 160, 12); c.strokeStyle = 'rgba(255,255,255,0.12)'; c.lineWidth = 0.5; c.stroke();
      // pillar
      var px = 62, pw = 26;
      c.fillStyle = lg(c, px, 0, px + pw, 0, [[0, lit(p.b, -0.3)], [0.25, lit(p.b, 0.12)], [0.7, p.b], [1, lit(p.b, -0.5)]]); c.fillRect(px, 0, pw, 150);
      for (var y = 6; y < 150; y += 13) { c.fillStyle = 'rgba(0,0,0,0.35)'; c.fillRect(px, y, pw, 0.9); c.fillStyle = 'rgba(255,255,255,0.07)'; c.fillRect(px, y + 1, pw, 0.6); }
      rrect(c, px - 4, 0, pw + 8, 9, 1.5, lg(c, 0, 0, 0, 9, [[0, lit(p.b, 0.25)], [1, lit(p.b, -0.35)]]), '#000', 0.5);
      rrect(c, px - 4, 138, pw + 8, 12, 1.5, lg(c, 0, 138, 0, 150, [[0, lit(p.b, 0.15)], [1, lit(p.b, -0.5)]]), '#000', 0.5);
      c.beginPath(); c.moveTo(px + 6, 40); c.lineTo(px + 10, 52); c.lineTo(px + 8, 60); c.lineTo(px + 14, 74); c.strokeStyle = 'rgba(0,0,0,0.55)'; c.lineWidth = 0.8; c.stroke();
      stains(c, 160, 150, p, k * 13, 6);
      // lamp bracket + cage
      rrect(c, 84, 62, 8, 3, 1, '#1a1a20'); rrect(c, 89, 64, 8, 12, 2, lg(c, 89, 0, 97, 0, [[0, '#2a2a32'], [1, '#101014']]), '#000', 0.5);
      rrect(c, 90.6, 66, 4.8, 8, 2, lit(p.lamp, 0.5));
      for (var g = 0; g < 3; g++) line(c, 90.5 + g * 2.2, 65.5, 90.5 + g * 2.2, 75.5, 0.4, 'rgba(0,0,0,0.6)');
      var f = p.feat;
      if (f === 'sewer') {   // drain outlet with slime
        ell(c, 130, 108, 11, 11, '#04080a', '#3a4a50', 2); ell(c, 130, 108, 8, 8, mix(p.dark, '#000', 0.5));
        c.fillStyle = lg(c, 0, 118, 0, 150, [[0, rgba(p.moss, 0.6)], [1, rgba(p.moss, 0)]]); c.fillRect(124, 116, 12, 34);
        for (var i = 0; i < 4; i++) line(c, 124 + i * 4, 100, 124 + i * 4, 116, 0.6, '#080c0e');
      } else if (f === 'pump') {   // pressure gauge, hazard strip
        ell(c, 30, 92, 12, 12, lg(c, 0, 80, 0, 104, [[0, '#d8d8de'], [1, '#8a8a94']]), '#1a1a20', 1.6);
        for (var t = 0; t < 9; t++) { var an = Math.PI * 0.8 + t / 8 * Math.PI * 1.4; line(c, 30 + Math.cos(an) * 8, 92 + Math.sin(an) * 8, 30 + Math.cos(an) * 10, 92 + Math.sin(an) * 10, 0.6, '#222'); }
        line(c, 30, 92, 36, 86, 1, '#d02020'); ell(c, 30, 92, 1.4, 1.4, '#222');
        for (var h = 0; h < 12; h++) poly(c, [[h * 13.4, 122], [h * 13.4 + 7, 122], [h * 13.4 + 12, 132], [h * 13.4 + 5, 132]], '#e8b820');
        c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 122, 160, 10);
      } else if (f === 'chamber') {   // slime pipes, window bars
        for (var w = 0; w < 4; w++) { rrect(c, 110 + w * 10, 96, 6, 54, 3, lg(c, 0, 0, 6, 0, [[0, p.pipe], [1, lit(p.pipe, -0.5)]])); c.fillStyle = rgba(p.waterHi, 0.5); c.fillRect(111 + w * 10, 96, 1, 54); }
        rrect(c, 12, 84, 26, 30, 3, '#050a10', '#4a6a86', 1.2); for (var b = 0; b < 3; b++) line(c, 17 + b * 7, 85, 17 + b * 7, 113, 1.2, '#3a5a76'); A.glow(c, 25, 99, 14, p.lamp, 0.2);
      } else if (f === 'lab') {   // tubes + monitor wall
        rrect(c, 14, 74, 24, 44, 3, '#0a1218', '#6a8aa0', 1.2);
        c.fillStyle = lg(c, 0, 78, 0, 116, [[0, rgba(p.water, 0.2)], [1, rgba(p.water, 0.75)]]); c.fillRect(16, 90, 20, 26);
        for (var bb = 0; bb < 5; bb++) ell(c, 20 + hash(bb + k) * 12, 96 + hash(bb * 3) * 16, 1.1, 1.1, 'rgba(220,255,250,0.7)');
        rrect(c, 108, 82, 34, 24, 2, '#060a0e', '#556677', 1); c.fillStyle = rgba(p.lamp, 0.35); c.fillRect(110, 84, 30, 20);
        for (var l = 0; l < 4; l++) line(c, 112, 88 + l * 4.5, 112 + 8 + hash(l + k) * 18, 88 + l * 4.5, 0.9, rgba(p.lamp, 0.8));
        for (var h2 = 0; h2 < 12; h2++) poly(c, [[h2 * 13.4, 128], [h2 * 13.4 + 6, 128], [h2 * 13.4 + 11, 136], [h2 * 13.4 + 5, 136]], '#e8e8ee');
        c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 128, 160, 8);
      } else if (f === 'foundry') {   // furnace mouth + chains
        c.beginPath(); c.moveTo(12, 150); c.lineTo(12, 96); c.arc(30, 96, 18, Math.PI, 0); c.lineTo(48, 150); c.closePath(); c.fillStyle = '#0a0503'; c.fill(); c.strokeStyle = '#5a4030'; c.lineWidth = 3; c.stroke();
        c.beginPath(); c.moveTo(17, 150); c.lineTo(17, 98); c.arc(30, 98, 13, Math.PI, 0); c.lineTo(43, 150); c.closePath();
        c.fillStyle = rg(c, 30, 130, 2, 44, [[0, '#fff2b0'], [0.3, '#ffb040'], [0.7, '#d04a10'], [1, '#3a0e04']]); c.fill();
        for (var ch = 0; ch < 2; ch++) for (var lk = 0; lk < 11; lk++) ell(c, 118 + ch * 16, 14 + lk * 6, 2.2, 3, 'rgba(0,0,0,0)', '#4a4048', 1.2, (lk % 2) * 1.5);
      }
    });
  }

  /* ---------------- floor: paving with curb ---------------- */
  function makeFloor(p, k) {
    return tile(96, 112, function (c) {
      c.fillStyle = p.mortar; c.fillRect(0, 0, 96, 112);
      var nr = 8, row, col;
      for (row = 0; row < nr; row++) {
        var y = row * 14 + 2, sw = 32, off = (row % 2) * 16;
        for (col = -1; col < 4; col++) {
          var x = col * sw + off, cc = ((col % 3) + 3) % 3, hv = hash(row * 17 + cc * 5 + k);
          var base = mix(p.fA, p.fB, hv), pers = 1 + row * 0.02;
          rrect(c, x + 0.8, y + 0.4, sw - 1.6, 13 - 0.2, 2.2, lg(c, 0, y, 0, y + 13, [[0, lit(base, 0.18)], [0.15, lit(base, 0.06)], [1, lit(base, -0.22)]]));
          c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(x + 2, y + 0.8, sw - 4, 0.8);
          if (hv > 0.75) { c.strokeStyle = 'rgba(0,0,0,0.35)'; c.lineWidth = 0.6; c.beginPath(); c.moveTo(x + 6 + hv * 8, y + 2); c.lineTo(x + 12 + hv * 8, y + 7); c.lineTo(x + 10 + hv * 8, y + 12); c.stroke(); }
          if (hv < 0.14) ell(c, x + 16, y + 9, 9, 3, rgba(p.moss, 0.3));
          if (hv > 0.9) ell(c, x + 16, y + 8, 10, 3.4, 'rgba(20,40,50,0.35)');
        }
      }
      // curb (raised strip) with cast shadow
      c.fillStyle = lg(c, 0, 0, 0, 11, [[0, lit(p.curb, 0.3)], [0.35, p.curb], [1, lit(p.curb, -0.35)]]); c.fillRect(0, 0, 96, 9);
      c.fillStyle = 'rgba(0,0,0,0.5)'; c.fillRect(0, 9, 96, 1); c.fillStyle = lg(c, 0, 10, 0, 22, [[0, 'rgba(0,0,0,0.45)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 10, 96, 12);
      for (var s = 0; s < 3; s++) { c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(s * 32 + 15.5, 0, 0.8, 9); }
    });
  }

  var BG = {}, VIG = null, MOTES = [];
  TB.buildBackgrounds = function () {
    var i = 0; for (var k in PAL) { BG[k] = { far: makeFar(PAL[k], ++i), mid: makeMid(PAL[k], i), floor: makeFloor(PAL[k], i) }; }
    VIG = tile(W, H, function (c) {
      c.fillStyle = rg(c, W / 2, H * 0.55, H * 0.35, W * 0.62, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,8,0.55)']]); c.fillRect(0, 0, W, H);
      c.fillStyle = lg(c, 0, H - 60, 0, H, [[0, 'rgba(0,0,0,0)'], [1, 'rgba(0,0,0,0.4)']]); c.fillRect(0, H - 60, W, 60);
      c.fillStyle = lg(c, 0, 0, 0, 40, [[0, 'rgba(0,0,0,0.55)'], [1, 'rgba(0,0,0,0)']]); c.fillRect(0, 0, W, 40);
    });
    for (var m = 0; m < 26; m++) MOTES.push({ x: hash(m) * W, y: hash(m + 9) * 150, s: 0.3 + hash(m + 3), p: hash(m + 5) * 6 });
  };

  function drawZone(c, z, p, cam, time) {
    var i, o, fx = p.feat;
    o = -((cam * 0.3) % 240); for (i = 0; i < 3; i++) c.drawImage(z.far, Math.round((o + i * 240) * 2) / 2, 0, 240, 150);
    // ceiling light shafts
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < 3; i++) {
      var sx = ((i * 190 - cam * 0.45) % 620 + 620) % 620 - 70, sway = Math.sin(time * 0.4 + i) * 3;
      c.fillStyle = lg(c, sx, 0, sx + 50, 150, [[0, rgba(p.lamp, 0.10)], [1, rgba(p.lamp, 0)]]);
      c.beginPath(); c.moveTo(sx + sway, 0); c.lineTo(sx + 26 + sway, 0); c.lineTo(sx + 70 + sway, 150); c.lineTo(sx + 6 + sway, 150); c.closePath(); c.fill();
    }
    c.restore();
    o = -((cam * 0.65) % 160);
    for (i = 0; i < 4; i++) c.drawImage(z.mid, Math.round((o + i * 160) * 2) / 2, 0, 160, 150);
    // animated per-tile features: lamp glows, foundry fire, lab monitors
    for (i = 0; i < 4; i++) {
      var bx = o + i * 160, lx = bx + 93, flick = 0.85 + Math.sin(time * 9 + i * 2) * 0.05 + (hash(Math.floor(time * 8) + i) - 0.5) * 0.08;
      A.glow(c, lx, 72, 62 * flick, p.lamp, 0.55 * flick);
      A.glow(c, lx, 72, 14, '#ffffff', 0.5);
      if (fx === 'foundry') { A.glow(c, bx + 30, 125, 46 + Math.sin(time * 7 + i) * 4, '#ff7a20', 0.55); }
      if (fx === 'lab') { A.glow(c, bx + 125, 94, 30, p.lamp, 0.16 + hash(Math.floor(time * 6) + i) * 0.1); }
      if (fx === 'chamber') { c.fillStyle = 'rgba(160,230,255,0.22)'; for (var w = 0; w < 4; w++) c.fillRect(bx + 111 + w * 10, 96 + ((time * 40 + w * 17) % 54), 1, 8); }
    }
    // water / coolant / lava channel
    var wy = 146, wh = 16;
    c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, mix(p.water, '#000', 0.5)], [0.4, p.water], [1, mix(p.water, '#000', 0.35)]]); c.fillRect(0, wy, W, wh);
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < 46; i++) {
      var wx = ((i * 11.7 + time * (10 + (i % 5) * 3) - cam * 0.9) % 520 + 520) % 520 - 20, wyy = wy + 2 + (i % 5) * 2.6;
      c.fillStyle = rgba(p.waterHi, 0.18 + (i % 3) * 0.06); c.fillRect(wx, wyy, 6 + (i % 4) * 3, 0.9);
    }
    for (i = 0; i < 4; i++) { var rx = o + i * 160 + 93; c.fillStyle = lg(c, 0, wy, 0, wy + wh, [[0, rgba(p.lamp, 0.35)], [1, rgba(p.lamp, 0)]]); c.fillRect(rx - 2 + Math.sin(time * 3 + i) * 1.5, wy, 4, wh); }
    c.restore();
    c.fillStyle = 'rgba(0,0,0,0.4)'; c.fillRect(0, wy, W, 1.2); c.fillStyle = rgba(p.waterHi, 0.25); c.fillRect(0, wy + wh - 1.4, W, 1);
    o = -((cam) % 96); for (i = 0; i < 6; i++) c.drawImage(z.floor, Math.round((o + i * 96) * 2) / 2, 160, 96, 112);
    // drifting particles: dust / sparks / bubbles
    c.save(); c.globalCompositeOperation = 'lighter';
    for (i = 0; i < MOTES.length; i++) {
      var m = MOTES[i], mx = ((m.x - cam * 0.5 + Math.sin(time * 0.5 + m.p) * 8) % W + W) % W;
      if (fx === 'foundry') { var my = 240 - ((time * (30 + m.s * 30) + m.p * 50) % 200); c.fillStyle = rgba('#ffaa40', 0.7); c.fillRect(mx, my, 1.2, 1.2); }
      else if (fx === 'lab') { var by = 150 - ((time * 12 * m.s + m.p * 30) % 120); c.fillStyle = rgba(p.waterHi, 0.4); ell(c, mx, by, 0.9, 0.9, 'rgba(200,255,250,0.35)'); }
      else { var dy = (m.y + time * 4 * m.s) % 150; c.fillStyle = rgba(p.lamp, 0.16 + m.s * 0.1); c.fillRect(mx, dy, 1.1, 1.1); }
    }
    c.restore();
  }

  TB.drawBackground = function (c, cam, time) {
    var zs = TB.STAGE.zones;
    for (var i = 0; i < zs.length; i++) {
      var x0 = zs[i].from - cam, x1 = (i + 1 < zs.length ? zs[i + 1].from : 1e9) - cam, cl0 = Math.max(0, x0), cl1 = Math.min(W, x1);
      if (cl1 <= cl0) continue;
      c.save(); c.beginPath(); c.rect(cl0, 0, cl1 - cl0, H); c.clip(); drawZone(c, BG[zs[i].pal], PAL[zs[i].pal], cam, time); c.restore();
    }
    for (i = 1; i < zs.length; i++) {   // bulkhead gates hide the zone seams
      var bx = Math.round(zs[i].from - cam); if (bx < -50 || bx > W + 50) continue;
      c.fillStyle = lg(c, bx - 18, 0, bx + 18, 0, [[0, '#0e1116'], [0.15, '#3a414e'], [0.5, '#242a34'], [0.85, '#3a414e'], [1, '#0a0c10']]); c.fillRect(bx - 18, 0, 36, 162);
      for (var y = 0; y < 160; y += 14) { poly(c, [[bx - 11, y], [bx - 3, y], [bx + 4, y + 7], [bx - 4, y + 7]], '#e0b020'); poly(c, [[bx + 3, y], [bx + 11, y], [bx + 11, y + 7], [bx + 4, y + 7]], '#e0b020'); poly(c, [[bx - 11, y + 7], [bx - 4, y + 7], [bx - 11, y + 14]], '#17171b'); }
      for (var r = 0; r < 8; r++) { ell(c, bx - 15, 10 + r * 20, 1.2, 1.2, '#7a8494'); ell(c, bx + 15, 10 + r * 20, 1.2, 1.2, '#7a8494'); }
      c.fillStyle = 'rgba(0,0,0,0.45)'; c.fillRect(bx + 18, 0, 8, 162); A.glow(c, bx, 6, 26, '#ff4a3a', 0.35 + Math.sin(time * 4) * 0.1);
      rrect(c, bx - 20, 158, 40, 6, 1, '#4a505c');
    }
    c.drawImage(VIG, 0, 0, W, H);
  };

  /* ---------------- props ---------------- */
  TB.drawProp = function (c, p, x, y, t) {
    x += p.shake > 0 ? Math.sin(t * 90) * 1.4 : 0;
    var col;
    c.save(); c.translate(x, y);
    if (p.type === 'crate') {
      var W1 = 24, H1 = 22;
      rrect(c, -W1 / 2, -H1, W1, H1, 1.5, lg(c, 0, -H1, 0, 0, [[0, '#c89555'], [1, '#8a5a2a']]), TB.OUT, 1);
      for (var i = 1; i < 4; i++) { c.fillStyle = 'rgba(0,0,0,0.3)'; c.fillRect(-W1 / 2 + 1, -H1 + i * 5.5, W1 - 2, 0.9); c.fillStyle = 'rgba(255,255,255,0.13)'; c.fillRect(-W1 / 2 + 1, -H1 + i * 5.5 + 1, W1 - 2, 0.6); }
      rrect(c, -W1 / 2, -H1, 3.4, H1, 1, '#5a3a1a'); rrect(c, W1 / 2 - 3.4, -H1, 3.4, H1, 1, '#5a3a1a');
      line(c, -W1 / 2 + 3, -H1 + 2, W1 / 2 - 3, -2, 2.2, '#6e4620'); line(c, -W1 / 2 + 3, -H1 + 2, W1 / 2 - 3, -2, 0.7, '#b6884c');
      [[-9.6, -19], [9.6, -19], [-9.6, -3], [9.6, -3]].forEach(function (n) { ell(c, n[0], n[1], 1.1, 1.1, '#c9ced6', '#333', 0.4); });
      rrect(c, -3, -13, 6, 4, 0.6, '#d03a2a'); c.fillStyle = '#fff'; c.fillRect(-1.5, -12, 3, 0.8);
    } else if (p.type === 'barrel') {
      var bg = lg(c, -10, 0, 10, 0, [[0, '#1c4670'], [0.3, '#4a86c0'], [0.55, '#3068a4'], [1, '#12304e']]);
      c.beginPath(); c.moveTo(-9, -1); c.bezierCurveTo(-12, -8, -12, -18, -9, -25); c.lineTo(9, -25); c.bezierCurveTo(12, -18, 12, -8, 9, -1); c.closePath(); c.fillStyle = bg; c.fill(); c.strokeStyle = TB.OUT; c.lineWidth = 1; c.stroke();
      ell(c, 0, -25, 9, 2.6, '#5a92c8', TB.OUT, 0.8); ell(c, 0, -25, 6, 1.6, '#274a70');
      [-20, -12, -5].forEach(function (yy) { c.fillStyle = lg(c, -11, 0, 11, 0, [[0, '#10233a'], [0.4, '#365a86'], [1, '#0a1622']]); c.fillRect(-11, yy, 22, 2.2); });
      c.fillStyle = '#f0c020'; c.beginPath(); c.moveTo(-3, -17); c.lineTo(3, -17); c.lineTo(4.4, -12); c.lineTo(-4.4, -12); c.closePath(); c.fill(); c.strokeStyle = '#222'; c.lineWidth = 0.5; c.stroke();
      c.fillStyle = '#222'; c.fillRect(-0.5, -16, 1, 2.4); c.fillRect(-0.5, -13.2, 1, 0.9);
    } else if (p.type === 'can') {
      c.beginPath(); c.moveTo(-8, -1); c.lineTo(-9.5, -22); c.lineTo(9.5, -22); c.lineTo(8, -1); c.closePath(); c.fillStyle = lg(c, -9, 0, 9, 0, [[0, '#4a5058'], [0.35, '#b6bec8'], [0.7, '#7c848e'], [1, '#3a4048']]); c.fill(); c.strokeStyle = TB.OUT; c.lineWidth = 1; c.stroke();
      for (var g = -5; g <= 5; g += 2.5) line(c, g, -20, g * 0.9, -3, 0.7, 'rgba(0,0,0,0.3)');
      rrect(c, -10.5, -25, 21, 4, 1.6, lg(c, 0, -25, 0, -21, [[0, '#d0d6de'], [1, '#7c848e']]), TB.OUT, 0.8); rrect(c, -2.4, -27.5, 4.8, 2.6, 1.2, '#565e68', TB.OUT, 0.6);
      ell(c, -5, -10, 1.6, 1, 'rgba(0,0,0,0.25)');
      if (p.glint) { A.glow(c, 0, -32 + Math.sin(t * 4), 9, '#ffe94a', 0.5); }
    } else if (p.type === 'secret') {
      c.beginPath(); c.moveTo(-18, 0); c.lineTo(-19, -20); c.lineTo(-10, -24); c.lineTo(8, -23); c.lineTo(19, -19); c.lineTo(18, 0); c.closePath(); c.fillStyle = lg(c, 0, -24, 0, 0, [[0, '#65777f'], [1, '#33434a']]); c.fill(); c.strokeStyle = TB.OUT; c.lineWidth = 1; c.stroke();
      c.strokeStyle = '#0a1216'; c.lineWidth = 1.2; c.beginPath(); c.moveTo(-6, -22); c.lineTo(-2, -14); c.lineTo(-7, -9); c.lineTo(-3, -2); c.moveTo(-2, -14); c.lineTo(6, -12); c.lineTo(9, -4); c.stroke();
      ell(c, 12, -6, 2.5, 1.6, '#4a5a62'); ell(c, -13, -3, 2, 1.4, '#4a5a62');
      if (Math.floor(t * 2) % 4 === 0) { A.glow(c, 12, -16, 8, '#c9f4ff', 0.7); }
    } else if (p.type === 'valve') {
      rrect(c, -7, -30, 14, 30, 2, lg(c, -7, 0, 7, 0, [[0, '#3a464e'], [0.4, '#8a9aa6'], [1, '#2a343a']]), TB.OUT, 1);
      rrect(c, -18, -40, 36, 6, 2, lg(c, 0, -40, 0, -34, [[0, '#e07a3a'], [1, '#8a3a1a']]), TB.OUT, 1);
      rrect(c, -3.5, -52, 7, 14, 2, '#b25a2a', TB.OUT, 0.8);
      var a = p.turn || 0; c.save(); c.translate(0, -44); c.rotate(a);
      c.strokeStyle = '#f0c030'; c.lineWidth = 3; c.beginPath(); c.arc(0, 0, 12, 0, TAU); c.stroke(); c.lineWidth = 2.4; for (var s = 0; s < 4; s++) { c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(s * 1.571) * 12, Math.sin(s * 1.571) * 12); c.stroke(); }
      c.strokeStyle = 'rgba(0,0,0,0.6)'; c.lineWidth = 0.7; c.beginPath(); c.arc(0, 0, 13.4, 0, TAU); c.stroke(); c.restore();
      if (!p.done) A.glow(c, 0, -62, 14 + Math.sin(t * 8) * 3, '#ff3a2a', 0.7);
      ell(c, 0, -62, 2.6, 2.6, p.done ? '#3aff6a' : '#ff3a2a', TB.OUT, 0.6);
    }
    c.restore();
  };

  TB.drawItem = function (c, it, x, y, t) {
    var by = y - Math.abs(Math.sin(t * 5 + it.seed)) * 2.5;
    c.save(); c.translate(x, by);
    if (it.type === 'pizza') {
      c.beginPath(); c.moveTo(-9, -2); c.lineTo(9, -3); c.lineTo(0, -15); c.closePath();
      c.fillStyle = lg(c, 0, -15, 0, -2, [[0, '#ffe07a'], [1, '#e0a020']]); c.fill(); c.strokeStyle = TB.OUT; c.lineWidth = 1; c.stroke();
      c.beginPath(); c.moveTo(-9, -2); c.lineTo(9, -3); c.strokeStyle = '#c07a20'; c.lineWidth = 2.6; c.stroke();
      [[-2, -6], [3, -8], [0, -11], [4, -4]].forEach(function (pp) { ell(c, pp[0], pp[1], 1.9, 1.6, '#d8402a', '#7a1a10', 0.4); });
      A.glow(c, 0, -8, 14, '#6aff8a', 0.25 + Math.sin(t * 6) * 0.08);
    } else {
      var sx = Math.cos(t * 6 + it.seed);
      c.scale(Math.max(0.25, Math.abs(sx)), 1);
      ell(c, 0, -5, 4.6, 4.6, lg(c, 0, -10, 0, 0, [[0, '#fff0a0'], [1, '#d09a10']]), '#7a5a08', 0.8); ell(c, 0, -5, 3, 3, 'rgba(0,0,0,0)', 'rgba(120,80,0,0.6)', 0.6);
      A.glow(c, 0, -5, 9, '#ffd23a', 0.25);
    }
    c.restore();
  };
})(window.TB);
