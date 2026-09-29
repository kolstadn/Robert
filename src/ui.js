/* Turtle Brawl — DOM interface: HUD, menus, upgrade preview, dev panel. */
(function (TB) {
  'use strict';
  var G = TB.G, $ = function (id) { return document.getElementById(id); };
  var ui = TB.ui = {}, cache = {}, bannerT = 0, hintT = 0, lvlT = 0, prevScreen = 'sTitle';
  var pvTier = 1, pvRAF = 0, pvT = 0;

  function setTxt(id, v) { if (cache[id] !== v) { cache[id] = v; $(id).textContent = v; } }
  function setBar(id, frac, label) {
    var b = $(id), i = b.firstElementChild, w = Math.max(0, Math.min(1, frac)) * 100 + '%';
    if (cache[id + 'w'] !== w) { cache[id + 'w'] = w; i.style.width = w; }
    if (cache[id + 'l'] !== label) { cache[id + 'l'] = label; b.lastElementChild.textContent = label; }
  }
  function hex(c) { return c; }

  /* ---------- screens ---------- */
  var SCREENS = ['sTitle', 'sControls', 'sPause', 'sUpg', 'sOver', 'sWin', 'sDev'];
  function show(id) { SCREENS.forEach(function (s) { $(s).classList.toggle('on', s === id); }); }
  function hideAll() { show(null); }

  ui.banner = function (txt, secs, cls) { var b = $('banner'); b.textContent = txt; b.className = 'on ' + (cls || ''); bannerT = secs || 3; };
  ui.hint = function (txt) { var h = $('hint'); h.textContent = txt; h.classList.add('on'); hintT = 6; };
  ui.levelUp = function (lv, perk) {
    var el = $('lvl'), st = TB.Game.stats(), un = [];
    if (TB.TIER_UNLOCK_LEVEL[G.S.tier + 1] === lv) un.push('Weapon tier ' + (G.S.tier + 1) + ' (' + TB.TIER_NAMES[G.S.tier + 1] + ') can now be purchased');
    for (var t = 2; t <= 5; t++) if (TB.TIER_UNLOCK_LEVEL[t] === lv && t !== G.S.tier + 1) un.push('Weapon tier ' + t + ' unlocked');
    if (lv === TB.ENERGY_UNLOCK_LEVEL) un.push('Energy infusions unlocked (Fire · Lightning · Ice)');
    el.innerHTML = '<h3>LEVEL UP! Lv ' + lv + '</h3>' + (perk ? '<p><b>' + perk.name + '</b> <span class="dim">(' + perk.kind + ')</span></p><p>' + perk.desc + '</p>' : '') +
      un.map(function (u) { return '<p class="dim">▸ ' + u + '</p>'; }).join('') + '<p class="dim">Health and energy restored a bit. Spend scrap at the next checkpoint (Tab).</p>';
    el.classList.add('on'); lvlT = 6;
  };
  ui.gameOver = function () {
    var S = G.S, enc = TB.STAGE.encounters[S.checkpoint] || TB.STAGE.encounters[0];
    $('overTxt').innerHTML = 'Your progress is kept: <b style="color:var(--acc)">Lv ' + S.level + '</b>, ' + Math.floor(S.xp) + ' XP, <b style="color:var(--acc)">' + S.scrap + '</b> scrap, weapon tier ' + S.tier + '.<br>' +
      'You restart at the last checkpoint. Enemies you already defeated will not pay out again. Change your energy first — a different infusion can change the fight!';
    show('sOver');
  };
  ui.victory = function () {
    var S = G.S, sec = Math.round(S.playSec), m = Math.floor(sec / 60);
    $('winTxt').innerHTML = 'Snapjaw is down and the sewer drains clear.<br>Level <b style="color:var(--acc)">' + S.level + '</b> · XP ' + Math.floor(S.xp) + ' · scrap ' + S.scrap + ' · play time ' + m + 'm ' + (sec % 60) + 's · retries ' + G.retries + '.' +
      (G.dev.on ? '<br><span class="dim">(Developer preview — nothing was saved.)</span>' : '');
    show('sWin');
  };
  ui.openMenu = function (kind) {
    if (G.state !== 'play') return;
    if (kind === 'upg') {
      if (!TB.Game.safeToMenu()) { ui.banner('Finish the fight first — upgrades open when the area is clear', 2, 'warn'); return; }
      TB.Game.setState('menu'); pvTier = G.S.tier; buildUpgrade(); show('sUpg'); startPreview();
    } else { TB.Game.setState('menu'); refreshPause(); show('sPause'); }
  };
  ui.closeMenu = function () { stopPreview(); hideAll(); TB.Game.setState('play'); };

  /* ---------- HUD ---------- */
  ui.hud = function () {
    var showHud = G.state === 'play' || G.state === 'menu' || G.state === 'dead' || G.state === 'victory';
    $('hud').classList.toggle('hidden', !showHud); $('hudR').classList.toggle('hidden', !showHud);
    if (!showHud) return;
    var P = G.P, S = G.S, st = TB.Game.stats(), xi = TB.Game.xpInfo(), T = TB.TURTLES[G.turtle], E = TB.ENERGIES[S.energy];
    setTxt('hName', T.name.toUpperCase()); setTxt('hLv', 'Lv ' + S.level);
    setTxt('hWeap', T.weaponName.split(' ').pop() + ' T' + S.tier + ' · ' + TB.TIER_NAMES[S.tier]);
    setTxt('hEn', 'Energy: ' + E.name);
    var en = $('hEn'); if (cache.enc !== S.energy) { cache.enc = S.energy; en.style.borderColor = TB.glow(S.energy)[0]; en.style.color = TB.glow(S.energy)[1]; }
    setBar('hpb', P.hp / st.maxhp, Math.ceil(P.hp) + ' / ' + st.maxhp);
    setBar('enb', P.en / TB.ENERGY_MAX, Math.floor(P.en) + (P.en >= st.spCost ? ' · SPECIAL READY (I)' : ''));
    var ready = P.en >= st.spCost; if (cache.rdy !== ready) { cache.rdy = ready; $('enb').classList.toggle('ready', ready); }
    setBar('xpb', xi.max ? 1 : (xi.xp - xi.lo) / Math.max(1, xi.hi - xi.lo), xi.max ? 'MAX' : Math.floor(xi.xp - xi.lo) + ' / ' + (xi.hi - xi.lo));
    setTxt('scrap', 'SCRAP ' + S.scrap);
    setTxt('stageName', TB.STAGE.name);
    setTxt('dev', G.dev.on ? 'DEV PREVIEW' + (G.dev.god ? ' · GOD' : '') : '');
    var cb = $('combo'); if (G.combo.n >= 2) { setTxt('combo', G.combo.n + ' HITS'); cb.classList.add('on'); } else cb.classList.remove('on');
    var dt = 1 / 60;
    if (bannerT > 0) { bannerT -= dt; if (bannerT <= 0) $('banner').classList.remove('on'); }
    if (hintT > 0 && G.state === 'play') { hintT -= dt; if (hintT <= 0) $('hint').classList.remove('on'); }
    if (lvlT > 0 && G.state === 'play') { lvlT -= dt; if (lvlT <= 0) $('lvl').classList.remove('on'); }
  };

  /* ---------- upgrade menu ---------- */
  function tierState(t) {
    var S = G.S;
    if (S.tier >= t) return S.tier === t ? 'cur' : 'owned';
    if (S.level < TB.TIER_UNLOCK_LEVEL[t]) return 'locked';
    return S.tier + 1 === t ? 'buy' : 'next';
  }
  function buildUpgrade() {
    var S = G.S, T = TB.TURTLES[G.turtle];
    $('uTitle').textContent = 'Upgrades — ' + T.name + ' · ' + T.weaponName + ' (always ' + T.weapon + ')';
    $('uScrap').textContent = 'SCRAP ' + S.scrap + '  ·  Lv ' + S.level;
    // tier chips
    var ch = $('chips'); ch.innerHTML = '';
    for (var t = 1; t <= 5; t++) (function (t) {
      var b = document.createElement('button'), s = tierState(t);
      b.className = 'chip' + (pvTier === t ? ' sel' : '') + (s === 'cur' ? ' owned cur' : s === 'owned' ? ' owned' : '');
      b.innerHTML = 'T' + t + '<br>' + TB.TIER_NAMES[t] + '<small>' + (s === 'cur' ? 'equipped' : s === 'owned' ? 'owned' : s === 'locked' ? 'Lv ' + TB.TIER_UNLOCK_LEVEL[t] : TB.TIER_COST[t] + ' scrap') + '</small>';
      b.onclick = function () { pvTier = t; TB.sfx('ui'); buildUpgrade(); };
      ch.appendChild(b);
    })(t);
    $('pvTitle').textContent = 'Tier ' + pvTier + ' — ' + TB.TIER_NAMES[pvTier] + '  (previewing with ' + TB.ENERGIES[S.energy].name + ')';
    $('pvLook').innerHTML = '<b>Look:</b> ' + TB.TIER_INFO[pvTier].look;
    $('pvStats').innerHTML = '<b>Changes:</b> ' + TB.TIER_INFO[pvTier].stats;
    var bt = $('bBuyTier'), st = tierState(pvTier), why = TB.Game.canBuyTier(pvTier);
    if (st === 'cur') { bt.textContent = 'Currently equipped'; bt.disabled = true; }
    else if (st === 'owned') { bt.textContent = 'Already upgraded past this tier'; bt.disabled = true; }
    else if (st === 'locked') { bt.textContent = 'Reach level ' + TB.TIER_UNLOCK_LEVEL[pvTier] + ' to unlock'; bt.disabled = true; }
    else if (why === 'order') { bt.textContent = 'Upgrade tier ' + (S.tier + 1) + ' first'; bt.disabled = true; }
    else if (why === 'scrap') { bt.textContent = 'Need ' + TB.TIER_COST[pvTier] + ' scrap (have ' + S.scrap + ')'; bt.disabled = true; }
    else { bt.textContent = 'Upgrade to ' + TB.TIER_NAMES[pvTier] + ' — ' + (G.dev.on ? 'free (dev)' : TB.TIER_COST[pvTier] + ' scrap'); bt.disabled = false; }
    bt.onclick = function () { if (TB.Game.buyTier(pvTier)) buildUpgrade(); };
    // energies
    var en = $('energies'); en.innerHTML = '';
    Object.keys(TB.ENERGIES).forEach(function (k) {
      var E = TB.ENERGIES[k], b = document.createElement('button'), owned = !!S.unlocked[k];
      b.className = 'en' + (S.energy === k ? ' cur' : '');
      var right = !E.implemented ? 'coming soon' : S.energy === k ? 'equipped' : owned ? 'equip' : S.level < TB.ENERGY_UNLOCK_LEVEL ? 'Lv ' + TB.ENERGY_UNLOCK_LEVEL : TB.ENERGY_COST + ' scrap';
      b.innerHTML = '<span class="sw" style="background:' + TB.glow(k)[0] + '"></span>' + E.name + '<em>' + right + '</em>';
      b.disabled = !E.implemented || (!owned && S.level < TB.ENERGY_UNLOCK_LEVEL);
      b.onmouseenter = b.onfocus = function () { showEnInfo(k); };
      b.onclick = function () {
        if (owned) TB.Game.setEnergy(k); else TB.Game.buyEnergy(k);
        buildUpgrade(); showEnInfo(k);
      };
      en.appendChild(b);
    });
    showEnInfo(S.energy);
    // perks
    var pk = $('perks'); pk.innerHTML = '';
    for (var l = 2; l <= TB.MAX_LEVEL; l++) {
      var p = TB.PERKS[l], d = document.createElement('div'); d.className = 'perk ' + (S.level >= l ? 'got' : 'fut');
      d.innerHTML = '<b>Lv ' + l + '</b><span><u>' + p.name + '</u> · ' + p.kind + ' — ' + p.desc + '</span>'; pk.appendChild(d);
    }
  }
  function showEnInfo(k) {
    var E = TB.ENERGIES[k];
    $('enInfo').innerHTML = '<b style="color:' + TB.glow(k)[0] + '">' + E.name + '</b> — ' + E.desc + '<br><b class="pro">+ </b>' + E.pro + '<br><b class="con">– </b>' + E.con + '<br><span class="dim">Special:</span> ' + E.special;
  }
  function startPreview() { stopPreview(); pvT = 0; var last = performance.now(); (function loop(t) { pvT += (t - last) / 1000; last = t; drawPreview(); pvRAF = requestAnimationFrame(loop); })(last); }
  function stopPreview() { if (pvRAF) cancelAnimationFrame(pvRAF); pvRAF = 0; }
  function drawPreview() {
    var cv = $('pv'), c = cv.getContext('2d'), S = G.S, T = TB.TURTLES[G.turtle];
    c.imageSmoothingEnabled = false; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 260, 150);
    // floor line
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, 130, 260, 1);
    c.save(); c.scale(3, 3);
    TB.drawShadow(c, 32, 43, 10, 0.4);
    TB.drawTurtle(c, { x: 32, y: 42, face: 1, pose: 'idle', t: pvT, weapon: T.weapon, tier: pvTier, energy: S.energy, mask: T.mask, maskDark: T.maskDark, rAng: -0.45 + Math.sin(pvT * 2) * 0.05, lAng: 0.4, carry: false });
    c.restore();
    c.save(); c.scale(3.3, 3.3);
    var W = TB.WEAPONS[T.weapon], sway = Math.sin(pvT * 1.5) * 0.03;
    W.draw(c, 46, 34, -0.75 + sway, pvTier, S.energy, pvT);
    W.draw(c, 70, 34, -2.39 - sway, pvTier, S.energy, pvT);
    c.restore();
  }

  function refreshPause() {
    $('bMute').textContent = 'Sound: ' + (TB.muted ? 'off' : 'on');
    $('bPUpg').disabled = !TB.Game.safeToMenu();
  }

  /* ---------- dev panel ---------- */
  function buildDev() {
    var l = $('dLevel'), t = $('dTier'), e = $('dEn'), n = $('dEnc'), i;
    l.innerHTML = t.innerHTML = e.innerHTML = n.innerHTML = '';
    for (i = 1; i <= TB.MAX_LEVEL; i++) l.innerHTML += '<option value="' + i + '">Level ' + i + '</option>';
    for (i = 1; i <= 5; i++) t.innerHTML += '<option value="' + i + '">Tier ' + i + ' — ' + TB.TIER_NAMES[i] + '</option>';
    ['none', 'fire', 'lightning', 'ice'].forEach(function (k) { e.innerHTML += '<option value="' + k + '">' + TB.ENERGIES[k].name + '</option>'; });
    TB.STAGE.encounters.forEach(function (x, j) { n.innerHTML += '<option value="' + j + '">' + (j === TB.STAGE.encounters.length - 1 ? 'Boss: Snapjaw' : 'Encounter ' + (j + 1)) + '</option>'; });
    var budget = TB.stageXPBudget(), rows = '<table class="lvtable"><tr><th>Level</th><th>Cum. XP</th><th>Target gap</th></tr>';
    for (i = 2; i <= TB.MAX_LEVEL; i++) rows += '<tr><td>' + i + '</td><td>' + TB.LEVEL_XP[i] + '</td><td>~' + TB.LEVEL_MINUTES[i] + ' min</td></tr>';
    rows += '</table>';
    var log = (function () { try { var s = JSON.parse(localStorage.getItem('turtleBrawl.save.v1')); return s && s.levelLog && s.levelLog.length ? s.levelLog.map(function (x) { return 'Lv' + x.level + '@' + Math.floor(x.sec / 60) + 'm' + (x.sec % 60) + 's'; }).join(', ') : 'none yet'; } catch (er) { return 'none yet'; } })();
    $('dPace').innerHTML = '<b>Pacing budget</b><br>Stage 1 XP available: <b style="color:var(--acc)">' + budget + '</b> (= ' + (budget / TB.XP_PER_MIN).toFixed(1) + ' min at ' + TB.XP_PER_MIN + ' XP/min)<br>' + rows + '<br>Your real level-up times (saved game): ' + log + '<br><br>Dev preview uses a throw-away copy of your save: unlocks everything you pick, gives scrap, never writes to storage, and does not change XP rates.';
  }

  /* ---------- wiring ---------- */
  function goTitle() {
    stopPreview(); TB.Game.setState('title'); G.P = null; $('hint').classList.remove('on'); $('lvl').classList.remove('on'); $('banner').classList.remove('on');
    var has = TB.hasSave(); $('bContinue').disabled = !has; $('bContinue').textContent = has ? 'Continue' : 'Continue (no save yet)'; show('sTitle');
  }
  function bind(id, fn) { $(id).addEventListener('click', function () { TB.sfx('ui'); fn(); }); }
  bind('bContinue', function () { hideAll(); TB.Game.continueGame(); ui.banner('Stage 1 — Sewer Run', 2.4); });
  bind('bNew', function () { if (TB.hasSave() && !confirm('Start a new game? This erases your saved progress.')) return; hideAll(); TB.Game.newGame(); ui.banner('Stage 1 — Sewer Run', 2.4); ui.hint('Move: arrows/WASD · Attack: J · Heavy: K · Jump: Space · Dodge: L · Special: I'); });
  bind('bControls', function () { prevScreen = 'sTitle'; show('sControls'); });
  bind('bPCtl', function () { prevScreen = 'sPause'; show('sControls'); });
  bind('bUCtl', function () { prevScreen = 'sUpg'; show('sControls'); });
  bind('bCtlBack', function () { show(prevScreen); });
  bind('bDevT', function () { buildDev(); show('sDev'); });
  bind('bDevBack', function () { show('sTitle'); });
  bind('bDevGo', function () {
    hideAll();
    TB.Game.devStart({ level: +$('dLevel').value, tier: +$('dTier').value, energy: $('dEn').value, enc: +$('dEnc').value, god: $('dGod').checked });
    ui.banner('Developer preview', 2, 'warn');
  });
  bind('bResume', function () { ui.closeMenu(); });
  bind('bPUpg', function () { hideAll(); TB.Game.setState('play'); ui.openMenu('upg'); });
  bind('bMute', function () { TB.muted = !TB.muted; refreshPause(); });
  bind('bQuit', function () { goTitle(); });
  bind('bUResume', function () { ui.closeMenu(); });
  bind('bRetry', function () { hideAll(); TB.Game.retry(); });
  bind('bOUpg', function () { G.state = 'menu'; pvTier = G.S.tier; buildUpgrade(); show('sUpg'); startPreview(); G.upgFromDeath = true; });
  bind('bOQuit', function () { goTitle(); });
  bind('bWUpg', function () { G.state = 'menu'; pvTier = G.S.tier; buildUpgrade(); show('sUpg'); startPreview(); G.upgFromWin = true; });
  bind('bWReplay', function () { hideAll(); if (G.dev.on) TB.Game.devStart({ level: G.S.level, tier: G.S.tier, energy: G.S.energy, enc: 0, god: G.dev.god }); else { G.S.checkpoint = 0; TB.Game.continueGame(); } });
  bind('bWQuit', function () { goTitle(); });
  // upgrade menu opened from defeat/win screens returns to those screens
  ui.closeMenu = function () {
    stopPreview();
    if (G.upgFromDeath) { G.upgFromDeath = false; G.state = 'dead'; show('sOver'); return; }
    if (G.upgFromWin) { G.upgFromWin = false; G.state = 'victory'; show('sWin'); return; }
    hideAll(); TB.Game.setState('play');
  };

  addEventListener('keydown', function (e) {
    if (e.repeat) return;
    if (e.code === 'KeyM') { TB.muted = !TB.muted; ui.banner('Sound ' + (TB.muted ? 'off' : 'on'), 1); return; }
    if (e.code === 'F2' && G.state === 'title') { e.preventDefault(); buildDev(); show('sDev'); return; }
    if (e.code === 'Enter' && G.state === 'title' && $('sTitle').classList.contains('on')) { (TB.hasSave() ? $('bContinue') : $('bNew')).click(); return; }
    if (e.code === 'Escape') {
      if (G.state === 'play') ui.openMenu('pause');
      else if (G.state === 'menu') { if ($('sControls').classList.contains('on')) show(prevScreen); else ui.closeMenu(); }
      else if ($('sControls').classList.contains('on') || $('sDev').classList.contains('on')) show(G.state === 'title' ? 'sTitle' : prevScreen);
      return;
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      if (G.state === 'play') ui.openMenu('upg');
      else if (G.state === 'menu' && $('sUpg').classList.contains('on')) ui.closeMenu();
    }
  });

  window.addEventListener('DOMContentLoaded', function () {
    TB.Game.init($('cv'));
    goTitle();
  });
  // dev/test hook (used by tools/smoke-test.mjs)
  TB.debug = { show: show, buildUpgrade: buildUpgrade };
})(window.TB);
