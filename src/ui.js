/* Turtle Brawl — DOM interface: HUD, menus, upgrade preview, dev panel. Everything is keyboard-navigable. */
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

  /* ---------- screens + keyboard focus ---------- */
  var SCREENS = ['sIntro', 'sTitle', 'sSelect', 'sStages', 'sControls', 'sPause', 'sUpg', 'sOver', 'sWin', 'sDev'];
  function show(id) {
    SCREENS.forEach(function (s) { $(s).classList.toggle('on', s === id); });
    if (id) setTimeout(function () {
      var scr = $(id), f = scr.querySelector('[data-af]:not(:disabled)') || scr.querySelector('button.primary:not(:disabled)') || scr.querySelector('button:not(:disabled),select');
      if (f) f.focus({ preventScroll: true });
    }, 0);
  }
  function hideAll() { show(null); }
  function activeScreen() { return document.querySelector('.screen.on'); }
  function focusables(scr) { return [].slice.call(scr.querySelectorAll('button:not(:disabled),select,input')).filter(function (el) { return el.offsetParent !== null; }); }
  function navKey(dir) {
    var scr = activeScreen(); if (!scr) return false;
    var els = focusables(scr), cur = document.activeElement;
    if (!els.length) return true;
    if (!scr.contains(cur) || cur === document.body) { els[0].focus(); return true; }
    if (cur.tagName === 'SELECT' && (dir === 'left' || dir === 'right')) {   // left/right change the value of a focused dropdown
      var n = cur.selectedIndex + (dir === 'right' ? 1 : -1); if (n >= 0 && n < cur.options.length) { cur.selectedIndex = n; cur.dispatchEvent(new Event('change')); }
      return true;
    }
    var r = cur.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, v = { left: [-1, 0], right: [1, 0], up: [0, -1], down: [0, 1] }[dir], best = null, bs = 1e12;
    els.forEach(function (el) {
      if (el === cur) return;
      var q = el.getBoundingClientRect(), dx = q.left + q.width / 2 - cx, dy = q.top + q.height / 2 - cy, prim = dx * v[0] + dy * v[1], sec = Math.abs(dx * v[1]) + Math.abs(dy * v[0]);
      if (prim <= 1) return;
      var score = prim + sec * 2.5; if (score < bs) { bs = score; best = el; }
    });
    if (best) { best.focus(); TB.sfx('ui'); }
    return true;
  }

  ui.banner = function (txt, secs, cls) { var b = $('banner'); b.textContent = txt; b.className = 'on ' + (cls || ''); bannerT = secs || 3; };
  ui.hint = function (txt) { var h = $('hint'); h.textContent = txt; h.classList.add('on'); hintT = 6; };
  ui.levelUp = function (lv, perk) {
    var el = $('lvl'), un = [];
    for (var t = 2; t <= 5; t++) if (TB.TIER_UNLOCK_LEVEL[t] === lv) un.push('Weapon tier ' + t + ' (' + TB.TIER_NAMES[t] + ') can now be purchased for each turtle');
    var ens = TB.ENERGY_ORDER.filter(function (k) { return k !== 'none' && TB.ENERGIES[k].level === lv; });
    if (ens.length) un.push('New energy infusion' + (ens.length > 1 ? 's' : '') + ': ' + ens.map(function (k) { return TB.ENERGIES[k].name; }).join(' · '));
    el.innerHTML = '<h3>LEVEL UP! Lv ' + lv + '</h3>' + (perk ? '<p><b>' + perk.name + '</b> <span class="dim">(' + perk.kind + ')</span></p><p>' + perk.desc + '</p>' : '') +
      un.map(function (u) { return '<p class="dim">▸ ' + u + '</p>'; }).join('') + '<p class="dim">Level perks apply to the whole team. Spend scrap in the upgrade menu (Tab) when the area is clear.</p>';
    el.classList.add('on'); lvlT = 6;
  };
  ui.gameOver = function () {
    var S = G.S;
    $('overTxt').innerHTML = 'Your progress is kept: <b style="color:var(--acc)">Lv ' + S.level + '</b>, ' + Math.floor(S.xp) + ' XP, <b style="color:var(--acc)">' + S.scrap + '</b> scrap, all weapon tiers and energies.<br>' +
      'You restart at the last checkpoint. Enemies you already defeated will not pay out again. Change turtle or energy first — a different choice can change the fight!';
    show('sOver');
  };
  ui.victory = function (last) {
    fillResults(last);
    $('bWNext').style.display = last ? 'none' : '';
    show('sWin');
  };
  ui.openMenu = function (kind) {
    if (G.state !== 'play') return;
    if (kind === 'upg') {
      if (!TB.Game.safeToMenu()) { ui.banner('Finish the fight first — upgrades open when the area is clear', 2, 'warn'); return; }
      TB.Game.setState('menu'); pvTier = G.S.tier; buildUpgrade(); show('sUpg'); startPreview();
    } else { TB.Game.setState('menu'); refreshPause(); show('sPause'); }
  };
  ui.closeMenu = function () {
    stopPreview();
    if (G.upgReturn) { var r = G.upgReturn; G.upgReturn = null; G.state = r.state; if (r.screen === 'sIntro') fillIntro(); show(r.screen); return; }
    hideAll(); TB.Game.setState('play');
  };

  /* ---------- HUD ---------- */
  ui.hud = function () {
    var showHud = G.state === 'play' || G.state === 'menu' || G.state === 'dead' || G.state === 'victory';
    $('hud').classList.toggle('hidden', !showHud); $('hudR').classList.toggle('hidden', !showHud);
    if (!showHud || !G.P) { $('bossbar').classList.add('hidden'); return; }
    var P = G.P, S = G.S, st = TB.Game.stats(), xi = TB.Game.xpInfo(), T = TB.TURTLES[S.turtle], E = TB.ENERGIES[S.energy];
    setTxt('hName', T.name.toUpperCase()); setTxt('hLv', 'Lv ' + S.level);
    setTxt('hWeap', T.weaponName + ' T' + S.tier + ' · ' + TB.TIER_NAMES[S.tier]);
    setTxt('hEn', 'Energy: ' + E.name);
    var en = $('hEn'); if (cache.enc !== S.energy) { cache.enc = S.energy; en.style.borderColor = TB.glow(S.energy)[0]; en.style.color = TB.glow(S.energy)[1]; }
    var nm = $('hName'); if (cache.nmc !== S.turtle) { cache.nmc = S.turtle; nm.style.color = T.mask === '#2d63e0' ? '#8fc2ff' : T.mask; }
    setBar('hpb', P.hp / st.maxhp, Math.ceil(P.hp) + ' / ' + st.maxhp);
    setBar('enb', P.en / TB.ENERGY_MAX, Math.floor(P.en) + (P.en >= st.spCost ? ' · SPECIAL READY (I)' : ''));
    var ready = P.en >= st.spCost; if (cache.rdy !== ready) { cache.rdy = ready; $('enb').classList.toggle('ready', ready); }
    setBar('xpb', xi.max ? 1 : (xi.xp - xi.lo) / Math.max(1, xi.hi - xi.lo), xi.max ? 'MAX' : Math.floor(xi.xp - xi.lo) + ' / ' + (xi.hi - xi.lo));
    setTxt('scrap', 'SCRAP ' + S.scrap);
    setTxt('stageName', TB.STAGE.name);
    setTxt('dev', G.dev.on ? 'DEV PREVIEW' + (G.dev.god ? ' · GOD' : '') : '');
    var cb = $('combo'); if (G.combo.n >= 2) { setTxt('combo', G.combo.n + ' HITS'); cb.classList.add('on'); } else cb.classList.remove('on');
    var bs = G.arena && G.arena.boss && !G.arena.boss.dead ? G.arena.boss : null;
    $('bossbar').classList.toggle('hidden', !bs);
    if (bs) { setTxt('bossName', bs.def.name + (bs.phase > 1 ? '  · phase ' + bs.phase : '')); setBar('bbar', Math.max(0, bs.hp) / bs.maxhp, ''); }
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
  function keyOf(el) { return el ? (el.dataset.k || el.id || '') : ''; }
  function buildUpgrade() {
    var S = G.S, T = TB.TURTLES[S.turtle], focusKey = keyOf(document.activeElement);
    $('uTitle').textContent = 'Upgrades — ' + T.name + ' · ' + T.weaponName + ' (permanent signature weapon)';
    $('uScrap').textContent = 'SCRAP ' + S.scrap + '  ·  Lv ' + S.level;
    // turtle row (1-4)
    var tr = $('trow'); tr.innerHTML = '';
    TB.TURTLE_ORDER.forEach(function (id, i) {
      var t = TB.TURTLES[id], b = document.createElement('button'); b.dataset.k = 'u' + id; b.className = S.turtle === id ? 'cur' : '';
      var tierTxt = 'T' + (id === S.turtle ? S.tier : (S.tiers[id] || 1));
      b.innerHTML = '<kbd>' + (i + 1) + '</kbd> ' + t.name + '<small>' + t.weaponName + ' · ' + tierTxt + ' · ' + TB.ENERGIES[id === S.turtle ? S.energy : (S.energies[id] || 'none')].name + '</small>';
      b.onclick = function () { if (TB.Game.switchTurtle(id)) { pvTier = G.S.tier; buildUpgrade(); } };
      tr.appendChild(b);
    });
    // tier chips
    var ch = $('chips'); ch.innerHTML = '';
    for (var t = 1; t <= 5; t++) (function (t) {
      var b = document.createElement('button'), s = tierState(t); b.dataset.k = 't' + t; if (pvTier === t) b.dataset.af = '1';
      b.className = 'chip' + (pvTier === t ? ' sel' : '') + (s === 'cur' ? ' owned cur' : s === 'owned' ? ' owned' : '');
      b.innerHTML = 'T' + t + '<br>' + TB.TIER_NAMES[t] + '<small>' + (s === 'cur' ? 'equipped' : s === 'owned' ? 'owned' : s === 'locked' ? 'Lv ' + TB.TIER_UNLOCK_LEVEL[t] : TB.TIER_COST[t] + ' scrap') + '</small>';
      b.onclick = function () { pvTier = t; TB.sfx('ui'); buildUpgrade(); };
      b.onfocus = function () { if (pvTier !== t) { pvTier = t; updateTierText(); } };
      ch.appendChild(b);
    })(t);
    updateTierText();
    // energies
    var en = $('energies'); en.innerHTML = '';
    TB.ENERGY_ORDER.forEach(function (k) {
      var E = TB.ENERGIES[k], b = document.createElement('button'), owned = !!S.unlocked[k]; b.dataset.k = 'e' + k;
      b.className = 'en' + (S.energy === k ? ' cur' : '');
      var right = S.energy === k ? 'equipped' : owned ? 'equip' : S.level < E.level ? 'Lv ' + E.level : TB.ENERGY_COST + ' scrap';
      b.innerHTML = '<span class="sw" style="background:' + TB.glow(k)[0] + '"></span>' + E.name + '<em>' + right + '</em>';
      b.disabled = !owned && S.level < E.level;
      b.onmouseenter = b.onfocus = function () { showEnInfo(k); };
      b.onclick = function () { if (owned) TB.Game.setEnergy(k); else TB.Game.buyEnergy(k); buildUpgrade(); showEnInfo(k); };
      en.appendChild(b);
    });
    showEnInfo(S.energy);
    var pk = $('perks'); pk.innerHTML = '';
    for (var l = 2; l <= TB.MAX_LEVEL; l++) {
      var p = TB.PERKS[l], d = document.createElement('div'); d.className = 'perk ' + (S.level >= l ? 'got' : 'fut');
      d.innerHTML = '<b>Lv ' + l + '</b><span><u>' + p.name + '</u> · ' + p.kind + ' — ' + p.desc + '</span>'; pk.appendChild(d);
    }
    if (focusKey) { var f = $('sUpg').querySelector('[data-k="' + focusKey + '"]:not(:disabled)') || document.getElementById(focusKey); if (f && !f.disabled) f.focus({ preventScroll: true }); else { var pr = $('bBuyTier'); if (pr && !pr.disabled) pr.focus({ preventScroll: true }); else $('bUResume').focus({ preventScroll: true }); } }
  }
  function updateTierText() {
    var S = G.S, T = TB.TURTLES[S.turtle];
    $('pvTitle').textContent = 'Tier ' + pvTier + ' — ' + TB.TIER_NAMES[pvTier] + '  (previewing with ' + TB.ENERGIES[S.energy].name + ')';
    $('pvLook').innerHTML = '<b>Look:</b> ' + TB.TIER_LOOK[T.weapon][pvTier];
    $('pvStats').innerHTML = '<b>Changes:</b> ' + TB.TIER_STATS[pvTier];
    var bt = $('bBuyTier'), st = tierState(pvTier), why = TB.Game.canBuyTier(pvTier);
    if (st === 'cur') { bt.textContent = 'Currently equipped'; bt.disabled = true; }
    else if (st === 'owned') { bt.textContent = 'Already upgraded past this tier'; bt.disabled = true; }
    else if (st === 'locked') { bt.textContent = 'Reach level ' + TB.TIER_UNLOCK_LEVEL[pvTier] + ' to unlock'; bt.disabled = true; }
    else if (why === 'order') { bt.textContent = 'Upgrade tier ' + (S.tier + 1) + ' first'; bt.disabled = true; }
    else if (why === 'scrap') { bt.textContent = 'Need ' + TB.TIER_COST[pvTier] + ' scrap (have ' + S.scrap + ')'; bt.disabled = true; }
    else { bt.textContent = 'Upgrade ' + T.weaponName + ' to ' + TB.TIER_NAMES[pvTier] + ' — ' + (G.dev.on ? 'free (dev)' : TB.TIER_COST[pvTier] + ' scrap'); bt.disabled = false; }
    bt.onclick = function () { if (TB.Game.buyTier(pvTier)) buildUpgrade(); };
    var chips = $('chips').children; for (var i = 0; i < chips.length; i++) chips[i].classList.toggle('sel', i + 1 === pvTier);
  }
  function showEnInfo(k) {
    var E = TB.ENERGIES[k];
    $('enInfo').innerHTML = '<b style="color:' + TB.glow(k)[0] + '">' + E.name + '</b> — ' + E.desc + '<br><b class="pro">+ </b>' + E.pro + '<br><b class="con">– </b>' + E.con + '<br><span class="dim">Special:</span> ' + E.special;
  }
  function startPreview() { stopPreview(); pvT = 0; var last = performance.now(); (function loop(t) { pvT += (t - last) / 1000; last = t; drawPreview(); pvRAF = requestAnimationFrame(loop); })(last); }
  function stopPreview() { if (pvRAF) cancelAnimationFrame(pvRAF); pvRAF = 0; }
  function drawPreview() {
    var cv = $('pv'), c = cv.getContext('2d'), S = G.S, T = TB.TURTLES[S.turtle], WD = TB.WEAPONS[T.weapon];
    c.imageSmoothingEnabled = false; c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, 260, 150);
    c.fillStyle = 'rgba(255,255,255,0.05)'; c.fillRect(0, 130, 260, 1);
    c.save(); c.scale(3, 3);
    TB.drawShadow(c, 32, 43, 10, 0.4);
    TB.drawTurtle(c, { x: 32, y: 42, face: 1, pose: 'idle', t: pvT, weapon: T.weapon, tier: pvTier, energy: S.energy, mask: T.mask, maskDark: T.maskDark, rAng: WD.idle.r + Math.sin(pvT * 2) * 0.05, lAng: WD.idle.l, carry: false });
    c.restore();
    c.save(); c.scale(3.3, 3.3); TB.accent = T.mask;
    var sway = Math.sin(pvT * 1.5) * 0.03;
    if (WD.single) WD.draw(c, 44, 30, -0.6 + sway, pvTier, S.energy, pvT);
    else { WD.draw(c, 46, 34, -0.75 + sway, pvTier, S.energy, pvT); WD.draw(c, 70, 34, -2.39 - sway, pvTier, S.energy, pvT); }
    c.restore();
  }

  function refreshPause() {
    $('bMute').textContent = 'Sound: ' + (TB.muted ? 'off' : 'on');
    $('bPUpg').disabled = !TB.Game.safeToMenu();
  }

  /* ---------- character / stage select ---------- */
  function buildCards() {
    var box = $('cards'); box.innerHTML = '';
    TB.TURTLE_ORDER.forEach(function (id, i) {
      var T = TB.TURTLES[id], b = document.createElement('button'), cv = document.createElement('canvas'); b.className = 'card'; b.dataset.k = id;
      cv.width = 70; cv.height = 70; var c = cv.getContext('2d'), WD = TB.WEAPONS[T.weapon]; c.imageSmoothingEnabled = false; c.save(); c.scale(1.6, 1.6);
      TB.drawShadow(c, 22, 43, 9, 0.4);
      TB.drawTurtle(c, { x: 22, y: 42, face: 1, pose: 'idle', t: 0, weapon: T.weapon, tier: 2, energy: 'none', mask: T.mask, maskDark: T.maskDark, rAng: WD.idle.r, lAng: WD.idle.l, carry: false });
      c.restore();
      b.appendChild(cv);
      var d = document.createElement('div'); d.innerHTML = '<kbd>' + (i + 1) + '</kbd> <b>' + T.name + '</b><br>' + T.weaponName + '<br><small>' + T.style + '<br>HP ' + T.hp + ' · Speed ' + T.speed + '</small>'; b.appendChild(d);
      b.onclick = function () { TB.sfx('ui'); hideAll(); TB.Game.newGame(id); afterStart(); };
      box.appendChild(b);
    });
  }
  function buildStages() {
    var box = $('stageList'), un = TB.Game.unlockedStages(); box.innerHTML = '';
    var S = TB.hasSave() ? JSON.parse(localStorage.getItem('turtleBrawl.save.v2')) : null;
    TB.STAGES.forEach(function (st, i) {
      var b = document.createElement('button'), done = S && S.cleared && S.cleared[i]; b.dataset.k = 's' + i;
      b.innerHTML = st.name + '<br><small class="dim">' + (i >= un ? 'Locked — clear the previous stage' : done ? 'Cleared · replays pay no repeat rewards' : 'Available') + '</small>';
      b.disabled = i >= un;
      b.onclick = function () { hideAll(); TB.Game.startStage(i); afterStart(); };
      box.appendChild(b);
    });
  }
  function afterStart() { showIntro(); }

  /* ---------- dev panel ---------- */
  function buildDev() {
    var l = $('dLevel'), t = $('dTier'), e = $('dEn'), n = $('dEnc'), tu = $('dTurtle'), i;
    l.innerHTML = t.innerHTML = e.innerHTML = n.innerHTML = tu.innerHTML = '';
    TB.TURTLE_ORDER.forEach(function (k) { tu.innerHTML += '<option value="' + k + '">' + TB.TURTLES[k].name + ' — ' + TB.TURTLES[k].weaponName + '</option>'; });
    for (i = 1; i <= TB.MAX_LEVEL; i++) l.innerHTML += '<option value="' + i + '">Level ' + i + '</option>';
    for (i = 1; i <= 5; i++) t.innerHTML += '<option value="' + i + '">Tier ' + i + ' — ' + TB.TIER_NAMES[i] + '</option>';
    TB.ENERGY_ORDER.forEach(function (k) { e.innerHTML += '<option value="' + k + '">' + TB.ENERGIES[k].name + '</option>'; });
    TB.STAGES.forEach(function (st, si) {
      st.encounters.forEach(function (x, j) { n.innerHTML += '<option value="' + si + ':' + j + '">S' + (si + 1) + ' · ' + (x.boss ? 'Boss: ' + TB.ENEMIES[x.boss].name : 'Encounter ' + (j + 1)) + '</option>'; });
    });
    var rows = '<table class="lvtable"><tr><th>Level</th><th>Cum. XP</th><th>Target gap</th></tr>';
    for (i = 2; i <= TB.MAX_LEVEL; i++) rows += '<tr><td>' + i + '</td><td>' + TB.LEVEL_XP[i] + '</td><td>~' + TB.LEVEL_MINUTES[i] + ' min</td></tr>';
    rows += '</table>';
    var log = (function () { try { var s = JSON.parse(localStorage.getItem('turtleBrawl.save.v2')); return s && s.levelLog && s.levelLog.length ? s.levelLog.map(function (x) { return 'Lv' + x.level + '@' + Math.floor(x.sec / 60) + 'm' + (x.sec % 60) + 's'; }).join(', ') : 'none yet'; } catch (er) { return 'none yet'; } })();
    var bud = TB.STAGES.map(function (st) { var b = TB.stageXPBudget(st); return st.name.split('—')[0].trim() + ': <b style="color:var(--acc)">' + b + '</b> XP (' + (b / TB.XP_PER_MIN).toFixed(1) + ' min)'; }).join('<br>');
    $('dPace').innerHTML = '<b>Pacing budget</b> (' + TB.XP_PER_MIN + ' XP/min)<br>' + bud + rows + '<br>Your real level-up times (saved game): ' + log + '<br><br>Dev preview uses a throw-away copy of your save: everything you pick is unlocked and free, nothing is written to storage, and XP rates are unchanged. Arrows: ↑↓ move, ←→ change a value.';
  }

  /* ---------- between-level screens ---------- */
  var prevStageBack = 'sTitle';
  function openUpgFrom(screen, state) { G.upgReturn = { screen: screen, state: state }; G.state = 'menu'; pvTier = G.S.tier; buildUpgrade(); show('sUpg'); startPreview(); }
  function fillIntro() {
    var S = G.S, T = TB.TURTLES[S.turtle], st = TB.STAGE, seen = {}, names = [];
    st.encounters.forEach(function (e) { (e.waves || []).forEach(function (w) { w.forEach(function (x) { if (!seen[x[0]]) { seen[x[0]] = 1; names.push(TB.ENEMIES[x[0]].name); } }); }); if (e.boss) names.push('Boss: ' + TB.ENEMIES[e.boss].name); });
    $('inTitle').textContent = st.name; $('inSub').textContent = st.encounters.length + ' encounters' + (G.encIdx > 0 ? ' · resuming at encounter ' + (G.encIdx + 1) : '');
    $('inZones').innerHTML = st.zones.map(function (z) { return '▸ ' + z.name; }).join('<br>');
    $('inEnemies').innerHTML = names.map(function (n) { return '▸ ' + n; }).join('<br>');
    $('inTurtle').innerHTML = '<b style="color:var(--acc)">' + T.name + '</b> · ' + T.weaponName + ' T' + S.tier + ' ' + TB.TIER_NAMES[S.tier] + '<br>Energy: <b style="color:' + TB.glow(S.energy)[0] + '">' + TB.ENERGIES[S.energy].name + '</b><br>Level ' + S.level + ' · Scrap ' + S.scrap;
  }
  function showIntro() { TB.Game.setState('menu'); fillIntro(); show('sIntro'); }
  ui.showIntro = showIntro;
  function fmtTime(sec) { sec = Math.round(sec); return Math.floor(sec / 60) + 'm ' + (sec % 60) + 's'; }
  function fillResults(last) {
    var S = G.S, a = G.stageStart || { xp: 0, scrap: 0, kills: 0, secrets: 0, sec: 0, level: S.level, retries: 0 };
    var rows = [['Time', fmtTime(S.playSec - a.sec)], ['Mutants defeated', (S.kills || 0) - a.kills], ['Secrets found', ((S.secrets || 0) - a.secrets) + ' / 2'], ['XP earned', '+' + Math.floor(S.xp - a.xp)],
      ['Scrap earned', '+' + (S.scrap - a.scrap)], ['Level', a.level === S.level ? 'Lv ' + S.level : 'Lv ' + a.level + ' → Lv ' + S.level], ['Retries', G.retries - a.retries]];
    var html = '<p>' + (last ? '<b style="color:var(--green)">The last boss is down — the campaign is complete!</b>' : '<b style="color:var(--green)">' + TB.STAGE.name + ' cleared!</b>') + '</p>';
    html += '<table class="k">' + rows.map(function (r) { return '<tr><td>' + r[0] + '</td><td style="color:var(--ink)">' + r[1] + '</td></tr>'; }).join('') + '</table>';
    var gained = []; for (var l = a.level + 1; l <= S.level; l++) if (TB.PERKS[l]) gained.push('<b>Lv ' + l + ' · ' + TB.PERKS[l].name + '</b> — ' + TB.PERKS[l].desc);
    if (gained.length) html += '<h3>New perks</h3>' + gained.map(function (g) { return '<p style="font-size:1cqw">' + g + '</p>'; }).join('');
    var nxt = TB.LEVEL_XP[S.level + 1]; if (nxt !== undefined) html += '<p class="dim">Next level at ' + nxt + ' XP (you have ' + Math.floor(S.xp) + ').</p>';
    var canBuy = []; for (var t = S.tier + 1; t <= 5; t++) { if (S.level >= TB.TIER_UNLOCK_LEVEL[t] && S.scrap >= TB.TIER_COST[t]) { canBuy.push(TB.TIER_NAMES[t] + ' tier (' + TB.TIER_COST[t] + ')'); break; } }
    TB.ENERGY_ORDER.forEach(function (k) { if (k !== 'none' && !S.unlocked[k] && S.level >= TB.ENERGIES[k].level && S.scrap >= TB.ENERGY_COST) canBuy.push(TB.ENERGIES[k].name + ' energy (' + TB.ENERGY_COST + ')'); });
    if (canBuy.length) html += '<p style="color:var(--acc)">You can afford: ' + canBuy.join(', ') + ' — open Upgrades!</p>';
    if (G.dev.on) html += '<p class="dim">(Developer preview — nothing was saved.)</p>';
    $('winStats').innerHTML = html;
  }

  /* ---------- wiring ---------- */
  function goTitle() {
    stopPreview(); TB.Game.setState('title'); G.P = null; G.upgReturn = null;
    ['hint', 'lvl', 'banner'].forEach(function (i) { $(i).classList.remove('on'); });
    var has = TB.hasSave(); $('bContinue').disabled = !has; $('bContinue').textContent = has ? 'Continue' : 'Continue (no save yet)';
    $('bStages').disabled = !has; show('sTitle');
  }
  function bind(id, fn) { $(id).addEventListener('click', function () { TB.sfx('ui'); fn(); }); }
  bind('bContinue', function () { hideAll(); TB.Game.continueGame(); afterStart(); });
  bind('bNew', function () { if (TB.hasSave() && !confirm('Start a new game? This erases your saved progress.')) return; buildCards(); show('sSelect'); });
  bind('bSelBack', function () { show('sTitle'); });
  bind('bStages', function () { buildStages(); prevStageBack = 'sTitle'; show('sStages'); });
  bind('bStgBack', function () { show(prevStageBack); prevStageBack = 'sTitle'; });
  bind('bControls', function () { prevScreen = 'sTitle'; show('sControls'); });
  bind('bPCtl', function () { prevScreen = 'sPause'; show('sControls'); });
  bind('bUCtl', function () { prevScreen = 'sUpg'; show('sControls'); });
  bind('bCtlBack', function () { show(prevScreen); });
  bind('bDevT', function () { buildDev(); show('sDev'); });
  bind('bDevBack', function () { show('sTitle'); });
  bind('bDevGo', function () {
    var se = $('dEnc').value.split(':'); hideAll();
    TB.Game.devStart({ turtle: $('dTurtle').value, level: +$('dLevel').value, tier: +$('dTier').value, energy: $('dEn').value, stage: +se[0], enc: +se[1], god: $('dGod').checked });
    ui.banner('Developer preview', 2, 'warn');
  });
  bind('bResume', function () { ui.closeMenu(); });
  bind('bPUpg', function () { hideAll(); TB.Game.setState('play'); ui.openMenu('upg'); });
  bind('bMute', function () { TB.muted = !TB.muted; refreshPause(); });
  bind('bQuit', function () { goTitle(); });
  bind('bUResume', function () { ui.closeMenu(); });
  bind('bRetry', function () { hideAll(); TB.Game.retry(); });
  bind('bOUpg', function () { openUpgFrom('sOver', 'dead'); });
  bind('bOQuit', function () { goTitle(); });
  bind('bWNext', function () { hideAll(); TB.Game.nextStage(); afterStart(); });
  bind('bWUpg', function () { openUpgFrom('sWin', 'victory'); });
  bind('bWStages', function () { buildStages(); prevStageBack = 'sWin'; show('sStages'); });
  bind('bInUpg', function () { openUpgFrom('sIntro', 'menu'); });
  bind('bInStart', function () { hideAll(); TB.Game.setState('play'); ui.banner(TB.STAGE.name, 2.4); if (TB.STAGE.encounters[0] && G.encIdx === 0) ui.hint('Move: arrows/WASD · Attack: J · Heavy: K · Jump: Space · Dodge: L · Special: I'); });
  bind('bInQuit', function () { goTitle(); });
  bind('bWReplay', function () {
    hideAll();
    if (G.dev.on) TB.Game.devStart({ turtle: G.S.turtle, level: G.S.level, tier: G.S.tier, energy: G.S.energy, stage: G.stageIdx, enc: 0, god: G.dev.god });
    else { TB.Game.startStage(G.stageIdx); afterStart(); }
  });
  bind('bWQuit', function () { goTitle(); });

  addEventListener('keydown', function (e) {
    if (e.repeat && e.code !== 'ArrowLeft' && e.code !== 'ArrowRight' && e.code !== 'ArrowUp' && e.code !== 'ArrowDown') return;
    var scr = activeScreen();
    if (e.code === 'KeyM') { TB.muted = !TB.muted; ui.banner('Sound ' + (TB.muted ? 'off' : 'on'), 1); return; }
    if (e.code === 'F2' && G.state === 'title') { e.preventDefault(); buildDev(); show('sDev'); return; }
    if (scr && G.state !== 'play') {   // ---- keyboard menu navigation ----
      var dirs = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', KeyA: 'left', KeyD: 'right', KeyW: 'up', KeyS: 'down' };
      if (dirs[e.code]) { e.preventDefault(); navKey(dirs[e.code]); return; }
      if ((e.code === 'KeyJ' || e.code === 'KeyZ') && document.activeElement && document.activeElement.tagName === 'BUTTON') { e.preventDefault(); document.activeElement.click(); return; }
      var num = /^Digit([1-4])$/.exec(e.code);
      if (num) {
        var id = TB.TURTLE_ORDER[+num[1] - 1];
        if (scr.id === 'sSelect') { e.preventDefault(); var cb = $('cards').querySelector('[data-k="' + id + '"]'); if (cb) cb.click(); return; }
        if (scr.id === 'sUpg') { e.preventDefault(); if (TB.Game.switchTurtle(id)) { pvTier = G.S.tier; buildUpgrade(); } return; }
      }
    }
    if (e.code === 'Escape' || e.code === 'Backspace') {
      if (e.code === 'Backspace' && scr && scr.querySelector('select:focus')) return;
      if (G.state === 'play') { if (e.code === 'Escape') ui.openMenu('pause'); }
      else if (scr && scr.id === 'sControls') show(prevScreen);
      else if (scr && scr.id === 'sStages') { show(prevStageBack); prevStageBack = 'sTitle'; }
      else if (scr && (scr.id === 'sDev' || scr.id === 'sSelect')) show('sTitle');
      else if (scr && scr.id === 'sIntro') { /* Esc does nothing; use the buttons */ }
      else if (G.state === 'menu') ui.closeMenu();
      return;
    }
    if (e.code === 'Tab') {
      e.preventDefault();
      if (G.state === 'play') ui.openMenu('upg');
      else if (G.state === 'menu' && scr && scr.id === 'sUpg') ui.closeMenu();
    }
  });

  window.addEventListener('DOMContentLoaded', function () {
    TB.Game.init($('cv'));
    goTitle();
  });
  TB.debug = { show: show, buildUpgrade: buildUpgrade, buildCards: buildCards };
})(window.TB);
