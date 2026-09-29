/* Turtle Brawl — game simulation and rendering. */
(function (TB) {
  'use strict';
  var W = TB.W, H = TB.H, FT = TB.FLOOR_TOP, FB = TB.FLOOR_BOT, STAGE = TB.STAGE;
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var lerp = function (a, b, t) { return a + (b - a) * t; };
  var SAVE_KEY = 'turtleBrawl.save.v2';

  var G = TB.G = {
    state: 'title', time: 0, P: null, ents: [], props: [], items: [], proj: [], haz: [], fx: [], texts: [], trail: [],
    cam: { x: 0, max: 0, shake: 0 }, encIdx: 0, arena: null, hitstop: 0, S: null, dev: { on: false, god: false },
    combo: { n: 0, t: 0 }, sessionSec: 0, banner: null, flow: { needValve: false, valve: null }, turtle: 'leo', slowmo: 0, goArrow: 0, retries: 0, puddles: [], stageIdx: 0
  };

  /* ============================== INPUT ============================== */
  var KEYMAP = { ArrowLeft: 'left', KeyA: 'left', ArrowRight: 'right', KeyD: 'right', ArrowUp: 'up', KeyW: 'up', ArrowDown: 'down', KeyS: 'down',
    KeyJ: 'light', KeyZ: 'light', KeyK: 'heavy', KeyX: 'heavy', Space: 'jump', KeyC: 'jump', KeyL: 'dodge', KeyV: 'dodge', KeyI: 'special', KeyB: 'special', KeyE: 'use' };
  var down = {}, buf = {};
  addEventListener('keydown', function (e) {
    var a = KEYMAP[e.code]; if (!a) return;
    if (G.state === 'play') e.preventDefault();
    if (!down[a]) buf[a] = G.time; down[a] = 1;
  });
  addEventListener('keyup', function (e) { var a = KEYMAP[e.code]; if (a) down[a] = 0; });
  addEventListener('blur', function () { for (var k in down) down[k] = 0; if (G.state === 'play') TB.ui && TB.ui.openMenu('pause'); });
  function consume(a) { if (buf[a] !== undefined && G.time - buf[a] < 0.18) { buf[a] = undefined; return true; } return false; }
  function clearInput() { for (var k in down) down[k] = 0; buf = {}; }
  TB.input = { press: function (a) { down[a] = 1; buf[a] = G.time; }, release: function (a) { down[a] = 0; }, clear: clearInput };

  /* ============================== SAVE / STATS ============================== */
  function defaultSave() {
    var tiers = {}, ens = {}; TB.TURTLE_ORDER.forEach(function (k) { tiers[k] = 1; ens[k] = 'none'; });
    return { v: 2, level: 1, xp: 0, scrap: 0, turtle: 'leo', tier: 1, energy: 'none', tiers: tiers, energies: ens, unlocked: { none: true },
      stage: 0, checkpoints: [0, 0], cleared: [false, false], claimed: {}, playSec: 0, levelLog: [], kills: 0, secrets: 0, started: false };
  }
  function loadSave() {
    try {
      var s = JSON.parse(localStorage.getItem(SAVE_KEY));
      if (s && s.v === 2) { s = Object.assign(defaultSave(), s); s.tier = s.tiers[s.turtle] || 1; s.energy = s.energies[s.turtle] || 'none'; return s; }
    } catch (e) { /* ignore */ }
    return null;
  }
  function saveGame() {
    if (G.dev.on || !G.S) return;
    G.S.tiers[G.S.turtle] = G.S.tier; G.S.energies[G.S.turtle] = G.S.energy;
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(G.S)); } catch (e) { /* storage unavailable */ }
  }
  TB.hasSave = function () { var s = loadSave(); return !!(s && s.started); };
  TB.wipeSave = function () { try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* */ } };

  function stats() {
    var S = G.S, l = S.level, t = S.tier, T = TB.TURTLES[S.turtle || 'leo'];
    return {
      level: l, tier: t,
      maxhp: T.hp + (l >= 3 ? 25 : 0) + (l >= 7 ? 30 : 0),
      speed: T.speed * (l >= 4 ? 1.08 : 1),
      dmg: TB.TIER_DMG[t] * T.dmg, reach: TB.TIER_REACH[t], potency: TB.TIER_POTENCY[t],
      enRegen: 5 * (l >= 5 ? 1.4 : 1), spCost: TB.SPECIAL_COST - (l >= 5 ? 10 : 0),
      spDmg: l >= 8 ? 1.35 : 1, hitEn: l >= 8 ? 5 : 3, hitstun: l >= 7 ? 0.7 : 1,
      rollDur: l >= 4 ? 0.27 : 0.33, rollSpeed: (l >= 4 ? 250 : 200) * T.roll,
      energyDmg: { none: 1, fire: 1, lightning: 0.9, ice: 0.85, toxic: 0.9, mystic: 0.8 }[S.energy] || 1
    };
  }
  G.stats = stats;

  /* ============================== WORLD SETUP ============================== */
  function newPlayer(x, y) {
    var st = stats();
    return { x: x, y: y, z: 0, vx: 0, vy: 0, vz: 0, face: 1, hp: st.maxhp, en: 50, state: 'free', st: 0, combo: 0, comboT: 0, inv: 0, rollCd: 0, atk: null, hit: null,
      carry: false, mash: 0, flash: 0, rollWin: 0, airHits: 0, t: 0, walkT: 0, moving: false, airAtkN: 0, dead: false, deadT: 0 };
  }

  function setStage(i) { G.stageIdx = i; STAGE = TB.STAGES[i]; TB.STAGE = STAGE; }
  function resOf(e, en) { var r = e.def.resist[en]; return r === undefined ? 1 : r; }
  function isBoss(e) { return e.type === 'boss' || e.type === 'warlord'; }

  function spawnProps(fromX) {
    G.props = [];
    STAGE.props.forEach(function (d, i) {
      var key = 'p' + G.stageIdx + '_' + i, type = d[0];
      if (G.S.claimed[key] && type !== 'can') return;
      if (d[1] < fromX - 60) return;
      G.props.push({ type: type, x: d[1], y: d[2], key: key, hp: type === 'secret' ? 3 : 2, shake: 0, z: 0, glint: type === 'can' && i % 2 === 0 });
    });
  }

  function beginStage(encIdx, opts) {
    opts = opts || {};
    setStage(G.S.stage || 0); G.turtle = G.S.turtle; G.puddles = [];
    if (!opts.retry) G.stageStart = { xp: G.S.xp, scrap: G.S.scrap, kills: G.S.kills || 0, secrets: G.S.secrets || 0, sec: G.S.playSec, level: G.S.level, retries: G.retries };
    G.encIdx = encIdx; G.arena = null; G.ents = []; G.items = []; G.proj = []; G.haz = []; G.fx = []; G.texts = []; G.trail = [];
    G.flow = { needValve: false, valve: null }; G.combo = { n: 0, t: 0 }; G.slowmo = 0; G.victory = false;
    var startX = encIdx <= 0 ? 0 : Math.max(0, STAGE.encounters[encIdx].x - 300);
    G.cam.x = startX; G.cam.shake = 0;
    setCamMax();
    G.P = newPlayer(startX + 70, 212);
    spawnProps(startX);
    clearInput();
  }
  function setCamMax() {
    var e = STAGE.encounters[G.encIdx];
    G.cam.max = e ? e.x : STAGE.length - W;
  }

  /* ============================== FX HELPERS ============================== */
  function spark(x, y, z, col, n, spd) {
    for (var i = 0; i < n; i++) { var a = Math.random() * 6.28, s = rnd(0.3, 1) * (spd || 90); G.fx.push({ k: 'p', x: x, y: y, z: z, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.4, vz: rnd(20, 90), life: rnd(0.2, 0.4), max: 0.4, col: col, sz: 1 + (Math.random() < 0.3 ? 1 : 0) }); }
  }
  function ring(x, y, col, maxr, life, z) { G.fx.push({ k: 'ring', x: x, y: y, z: z || 0, r: 2, maxr: maxr, life: life, max: life, col: col }); }
  function bolt(x0, y0, x1, y1, col) { G.fx.push({ k: 'bolt', x0: x0, y0: y0, x1: x1, y1: y1, life: 0.16, max: 0.16, col: col, seed: Math.random() * 99 }); }
  function text(x, y, str, col, big) { G.texts.push({ x: x, y: y, str: String(str), col: col, life: 0.9, big: big }); }
  function shake(a) { G.cam.shake = Math.max(G.cam.shake, a); }
  function banner(txt, secs, cls) { if (TB.ui) TB.ui.banner(txt, secs || 3, cls); }
  function energyCol() { return TB.glow(G.S.energy); }

  /* ============================== PROGRESSION ============================== */
  function awardXP(n, x, y) {
    if (n <= 0) return;
    var S = G.S; S.xp += n; text(x, y - 34, '+' + n, '#7fdcff', true);
    while (S.level < TB.MAX_LEVEL && S.xp >= TB.LEVEL_XP[S.level + 1]) levelUp();
  }
  function levelUp() {
    var S = G.S; S.level++;
    S.levelLog.push({ level: S.level, sec: Math.round(S.playSec) });
    var st = stats(), P = G.P;
    if (P) { P.hp = Math.min(st.maxhp, P.hp + st.maxhp * 0.4); P.en = TB.ENERGY_MAX; }
    TB.sfx('level'); ring(P.x, P.y, '#ffe94a', 60, 0.6); spark(P.x, P.y, 20, '#ffe94a', 20, 120);
    if (TB.ui) TB.ui.levelUp(S.level, TB.PERKS[S.level]);
    saveGame();
  }
  function awardScrap(n, x, y) { if (n <= 0) return; G.S.scrap += n; text(x, y - 20, '+' + n, '#ffd23a'); }
  function claim(key) { if (G.S.claimed[key]) return false; G.S.claimed[key] = 1; return true; }

  TB.Game = {};
  TB.Game.tierOwned = function (t) { return G.S.tier >= t; };
  TB.Game.canBuyTier = function (t) {
    if (G.S.tier + 1 !== t) return 'order'; if (G.S.level < TB.TIER_UNLOCK_LEVEL[t]) return 'level';
    if (G.S.scrap < TB.TIER_COST[t] && !G.dev.on) return 'scrap'; return 'ok';
  };
  TB.Game.buyTier = function (t) {
    if (TB.Game.canBuyTier(t) !== 'ok') return false;
    if (!G.dev.on) G.S.scrap -= TB.TIER_COST[t]; G.S.tier = t; TB.sfx('level'); saveGame(); return true;
  };
  TB.Game.canBuyEnergy = function (k) {
    var e = TB.ENERGIES[k]; if (!e.implemented || G.S.unlocked[k]) return 'no'; if (G.S.level < e.level) return 'level';
    if (G.S.scrap < TB.ENERGY_COST && !G.dev.on) return 'scrap'; return 'ok';
  };
  TB.Game.buyEnergy = function (k) {
    if (TB.Game.canBuyEnergy(k) !== 'ok') return false;
    if (!G.dev.on) G.S.scrap -= TB.ENERGY_COST; G.S.unlocked[k] = true; G.S.energy = k; TB.sfx('pickup'); saveGame(); return true;
  };
  TB.Game.setEnergy = function (k) { if (G.S.unlocked[k]) { G.S.energy = k; TB.sfx('ui'); saveGame(); return true; } return false; };
  TB.Game.switchTurtle = function (id) {
    var S = G.S; if (!TB.TURTLES[id] || S.turtle === id) return false;
    var ratio = G.P ? G.P.hp / stats().maxhp : 1;
    S.tiers[S.turtle] = S.tier; S.energies[S.turtle] = S.energy;
    S.turtle = id; S.tier = S.tiers[id] || 1; S.energy = S.energies[id] || 'none'; if (!S.unlocked[S.energy]) S.energy = 'none';
    G.turtle = id; G.trail = [];
    if (G.P) { G.P.hp = Math.max(1, Math.ceil(ratio * stats().maxhp)); G.P.combo = 0; G.P.carry = false; }
    TB.sfx('ui'); saveGame(); return true;
  };

  /* ============================== PLAYER ============================== */
  /* Per-turtle move sets. Each turtle keeps its own weapon type; the chains grow at level 2. */
  function mv(n, wind, act, rec, dmg, reach, kb, lunge, a0, a1, hand, extra) {
    var m = { n: n, wind: wind, act: act, rec: rec, dmg: dmg, reach: reach, kb: kb, hs: 0.045 + (extra && extra.finisher ? 0.05 : 0), lunge: lunge, a0: a0, a1: a1, hand: hand };
    for (var k in (extra || {})) m[k] = extra[k];
    return m;
  }
  var MOVES = {
    leo: {
      light: [mv('Slash', .05, .07, .11, 8, 30, 50, 70, -1.4, .55, 'R'), mv('Counter', .05, .07, .11, 8, 30, 50, 70, 1.0, -.5, 'L'), mv('Cross', .06, .08, .14, 11, 34, 70, 90, -1.5, .7, 'RL'),
        mv('Crossing Fang', .10, .10, .28, 16, 40, 160, 130, -1.8, .9, 'RL', { launch: true, finisher: true }), mv('Twin Cut', .10, .10, .26, 14, 38, 150, 120, -1.8, .9, 'RL', { launch: true, finisher: true })],
      chainLow: [0, 1, 4], chainHigh: [0, 1, 2, 3],
      heavy: mv('Cleave', .22, .10, .30, 18, 42, 190, 60, -2.3, .9, 'RL', { launch: true, wide: true, heavy: true, finisher: true, hs: .10 }),
      air: mv('Dive Slash', .03, .20, .10, 12, 30, 90, 0, -1.6, 1.0, 'R', { air: true, wide: true }), air2: mv('Rising Slash', .03, .18, .10, 10, 30, 60, 0, 1.2, -1.6, 'L', { air: true, wide: true }),
      cyclone: mv('Cyclone', .04, .30, .22, 8, 46, 100, 0, 0, 12, 'RL', { spin: true, aoe: true, multi: .09 })
    },
    raph: {   // short reach, hits hard, big lunges
      light: [mv('Stab', .04, .06, .10, 9, 26, 40, 85, -.55, .15, 'R'), mv('Stab', .04, .06, .10, 9, 26, 40, 85, -.35, .3, 'L'), mv('Double Thrust', .05, .07, .13, 11, 28, 70, 105, -.7, .2, 'RL'),
        mv('Sai Crash', .09, .10, .26, 20, 32, 170, 150, -1.6, .5, 'RL', { launch: true, finisher: true }), mv('Sai Fury', .09, .10, .24, 17, 30, 160, 140, -1.6, .5, 'RL', { launch: true, finisher: true })],
      chainLow: [0, 1, 4], chainHigh: [0, 1, 2, 3],
      heavy: mv('Sai Crush', .18, .10, .28, 24, 34, 210, 100, -2.2, .5, 'RL', { launch: true, heavy: true, finisher: true, hs: .11 }),
      air: mv('Plunge Stab', .03, .20, .10, 13, 26, 90, 0, -1.4, 1.1, 'R', { air: true, wide: true }), air2: mv('Rising Stab', .03, .18, .10, 11, 26, 60, 0, 1.0, -1.4, 'L', { air: true, wide: true }),
      cyclone: mv('Sai Storm', .04, .30, .22, 9, 36, 100, 0, 0, 12, 'RL', { spin: true, aoe: true, multi: .09 })
    },
    don: {    // long reach, wide sweeps
      light: [mv('Bo Strike', .07, .09, .13, 7, 48, 60, 35, -1.3, .5, 'R', { wide: true }), mv('Back Sweep', .07, .09, .13, 7, 48, 60, 35, .8, -.7, 'R', { wide: true }), mv('Overhead', .08, .09, .14, 8, 52, 80, 40, -1.6, .6, 'R', { wide: true }),
        mv('Vault Smash', .13, .12, .30, 15, 56, 190, 60, -2.0, .9, 'R', { launch: true, finisher: true, wide: true }), mv('Bo Slam', .12, .11, .28, 13, 54, 180, 55, -2.0, .9, 'R', { launch: true, finisher: true, wide: true })],
      chainLow: [0, 1, 4], chainHigh: [0, 1, 2, 3],
      heavy: mv('Staff Sweep', .26, .14, .34, 16, 62, 200, 40, -2.4, 1.0, 'R', { launch: true, wide: true, heavy: true, finisher: true, hs: .10 }),
      air: mv('Pole Drop', .03, .20, .10, 11, 44, 90, 0, -1.6, 1.0, 'R', { air: true, wide: true }), air2: mv('Pole Lift', .03, .18, .10, 9, 44, 60, 0, 1.2, -1.6, 'R', { air: true, wide: true }),
      cyclone: mv('Whirlwind', .04, .34, .22, 7, 58, 110, 0, 0, 12, 'R', { spin: true, aoe: true, multi: .09 })
    },
    mike: {   // fast, flowing 5-hit combo
      light: [mv('Snap', .035, .06, .075, 6, 30, 35, 60, -1.4, .6, 'R'), mv('Flick', .035, .06, .075, 6, 30, 35, 60, 1.1, -.6, 'L'), mv('Cross Spin', .04, .06, .08, 6.5, 32, 40, 70, -1.5, .8, 'RL'),
        mv('Over-Under', .04, .07, .09, 7, 32, 45, 70, -1.7, .8, 'R'), mv('Nunchaku Flurry', .08, .10, .24, 13, 36, 150, 110, -1.8, .9, 'RL', { launch: true, finisher: true })],
      chainLow: [0, 1, 2, 4], chainHigh: [0, 1, 2, 3, 4],
      heavy: mv('Chain Whirl', .10, .18, .22, 11, 40, 130, 20, 0, 12, 'RL', { spin: true, aoe: true, multi: .09, heavy: true, hs: .06 }),
      air: mv('Chain Drop', .03, .20, .10, 10, 30, 90, 0, -1.6, 1.0, 'R', { air: true, wide: true }), air2: mv('Chain Flick', .03, .18, .10, 8, 30, 60, 0, 1.2, -1.6, 'L', { air: true, wide: true }),
      cyclone: mv('Whirl Dash', .04, .30, .22, 6, 42, 100, 0, 0, 12, 'RL', { spin: true, aoe: true, multi: .08 })
    }
  };
  function M() { return MOVES[G.S.turtle || 'leo']; }

  function startAttack(def) {
    var P = G.P; P.state = 'attack'; P.atk = def; P.st = 0; P.hit = new Set(); P.nextHit = 0; TB.sfx(def.heavy ? 'roll' : 'swing');
    if (def.finisher || def.heavy) TB.sfx('swing');
  }
  function lightChain() { var m = M(); return G.S.level >= 2 ? m.chainHigh : m.chainLow; }

  function playerBox(def) {
    var r = def.reach * stats().reach, P = G.P;
    return { x0: P.face > 0 ? P.x - 6 : P.x - r, x1: P.face > 0 ? P.x + r : P.x + 6, dy: def.wide ? 22 : 15 };
  }
  function boxHit(b, t) { return t.x + (t.hw || 8) > b.x0 && t.x - (t.hw || 8) < b.x1 && Math.abs(t.y - G.P.y) < b.dy && Math.abs((t.z || 0) - G.P.z) < 30; }

  function dmgOf(def, extra) { var st = stats(); return def.dmg * st.dmg * st.energyDmg * (extra || 1); }

  function doAttackHits(def) {
    var P = G.P, S = G.S, hitAny = false, i, e;
    if (def.aoe) {   // Cyclone: hits all around
      for (i = 0; i < G.ents.length; i++) {
        e = G.ents[i]; if (!targetable(e)) continue;
        var rr = def.reach * stats().reach;
        if (Math.abs(e.x - P.x) < rr + e.hw && Math.abs(e.y - P.y) < rr * 0.5 + 8 && Math.abs(e.z - P.z) < 34) {
          hitEnemy(e, dmgOf(def), { kb: def.kb, dir: e.x >= P.x ? 1 : -1, hs: def.hs, src: 'melee' }); hitAny = true;
        }
      }
      return hitAny;
    }
    var box = playerBox(def);
    for (i = 0; i < G.ents.length; i++) {
      e = G.ents[i]; if (!targetable(e) || P.hit.has(e)) continue;
      if (boxHit(box, e)) {
        P.hit.add(e);
        if (e.thorns) { hurtPlayer(4, e.x, { soft: true }); spark(P.x, P.y, 20, '#ff5a3a', 6); }
        hitEnemy(e, dmgOf(def), { kb: def.kb, dir: P.face, launch: def.launch, stagger: def.heavy || def.finisher, hs: def.hs, src: 'melee', finisher: def.finisher, heavy: def.heavy });
        hitAny = true;
        if (def.finisher && S.tier >= 5) energyWave();
      }
    }
    for (i = 0; i < G.props.length; i++) {
      var p = G.props[i]; if (P.hit.has(p) || p.type === 'can' || p.type === 'valve') continue;
      if (boxHit(box, { x: p.x, y: p.y, hw: 9, z: 0 })) { P.hit.add(p); hitProp(p); hitAny = true; }
    }
    return hitAny;
  }
  function energyWave() {   // Master tier: finishers release a small energy wave
    var P = G.P, col = energyCol();
    G.proj.push({ kind: 'wave', x: P.x + P.face * 20, y: P.y, z: 14, vx: P.face * 200, vy: 0, dmg: 10 * stats().dmg * stats().energyDmg, life: 0.45, col: col, hit: new Set() });
  }

  function hurtPlayer(dmg, srcX, o) {
    o = o || {}; var P = G.P, st = stats();
    if (P.dead || P.inv > 0 || G.dev.god || G.state !== 'play') return false;
    P.hp -= dmg; P.flash = 0.12; G.hitstop = Math.max(G.hitstop, 0.06); shake(o.soft ? 1 : 3); TB.sfx('hurt');
    G.combo.n = 0; G.combo.t = 0;
    spark(P.x, P.y, 20, '#fff', 8, 100); text(P.x, P.y - 10, Math.round(dmg), '#ff6a6a');
    var dir = P.x >= srcX ? 1 : -1;
    if (P.carry) { P.carry = false; G.props.push({ type: 'can', x: P.x + dir * 12, y: P.y, hp: 1, shake: 0, z: 0, key: 'drop' + G.time }); }
    if (P.hp <= 0) { P.hp = 0; P.dead = true; P.state = 'dead'; P.st = 0; P.vz = 120; P.vx = dir * 90; shake(5); return true; }
    if (o.soft) { P.inv = 0.25; return true; }
    if (o.knock) { P.state = 'down'; P.st = 0; P.vz = 130; P.vx = dir * 130; P.vy = 0; P.inv = 0.5; }
    else { P.state = 'hurt'; P.st = 0; P.hurtDur = 0.3 * st.hitstun; P.vx = dir * 70; P.inv = 0.7; }
    P.atk = null;
    return true;
  }

  function startSpecial() {
    var P = G.P, st = stats();
    P.en -= st.spCost; P.state = 'special'; P.st = 0; P.spDone = false; P.inv = 0.5; P.atk = null; P.vx = 0; P.vy = 0;
    TB.sfx('special'); shake(2);
  }
  function specialEffect() {
    var P = G.P, S = G.S, st = stats(), en = S.energy, col = energyCol(), i, e, base = st.spDmg * st.dmg;
    if (en === 'lightning') {
      TB.sfx('zap');
      var tg = G.ents.filter(function (t) { return targetable(t) && Math.abs(t.x - P.x) < 190 && Math.abs(t.y - P.y) < 90; })
        .sort(function (a, b) { return Math.abs(a.x - P.x) - Math.abs(b.x - P.x); }).slice(0, 6);
      var px = P.x, py = P.y, pz = 20;
      tg.forEach(function (t, k) {
        bolt(px, py - pz, t.x, t.y - t.z - t.h * 0.5, col[1]);
        hitEnemy(t, 17 * base, { kb: 30, dir: t.x >= P.x ? 1 : -1, src: 'special', noEnergyFx: true, stunLite: true, hs: 0.03 });
        px = t.x; py = t.y; pz = t.z + t.h * 0.5;
      });
      G.props.forEach(function (p) { if (p.type !== 'can' && p.type !== 'valve' && Math.abs(p.x - P.x) < 70 && Math.abs(p.y - P.y) < 30) hitProp(p); });
      ring(P.x, P.y, col[0], 40, 0.3);
    } else if (en === 'toxic') {
      TB.sfx('fire'); ring(P.x, P.y, col[0], 55, 0.4); spark(P.x, P.y, 14, col[1], 16, 100);
      for (i = 0; i < 3; i++) addPuddle(P.x + P.face * (34 + i * 38), clamp(P.y + (i - 1) * 8, FT, FB), 26 + st.tier * 2, 5, (3 + st.tier) * st.potency);
      G.ents.forEach(function (t) {
        if (targetable(t) && Math.abs(t.x - P.x) < 60 + t.hw && Math.abs(t.y - P.y) < 40 && Math.abs(t.z - P.z) < 60) { hitEnemy(t, 12 * base, { kb: 60, dir: t.x >= P.x ? 1 : -1, src: 'special', noEnergyFx: true, hs: 0.04 }); applyPoison(t, 1.6); }
      });
    } else if (en === 'mystic') {
      TB.sfx('boom'); ring(P.x, P.y, col[0], 105, 0.45); ring(P.x, P.y, col[1], 70, 0.3); shake(3);
      G.ents.forEach(function (t) {
        if (!targetable(t)) return;
        if (Math.abs(t.x - P.x) < 105 + t.hw && Math.abs(t.y - P.y) < 62 && Math.abs(t.z - P.z) < 60) {
          var dm = t.x >= P.x ? 1 : -1, rm2 = resOf(t, 'mystic');
          hitEnemy(t, 14 * base, { kb: 160, dir: dm, src: 'special', noEnergyFx: true, hs: 0.05 });
          if (!t.dead && t.state !== 'dying' && t.stunImm <= 0 && rm2 >= 0.6 && t.armor < 2) { knockDown(t, dm, 150); t.stunImm = 2.5; }
        }
      });
      G.props.forEach(function (p) { if (p.type !== 'can' && p.type !== 'valve' && Math.abs(p.x - P.x) < 100 && Math.abs(p.y - P.y) < 50) hitProp(p); });
    } else {
      var rad = en === 'ice' ? 90 : en === 'fire' ? 58 : 50, dmg = en === 'ice' ? 9 : en === 'fire' ? 24 : 16;
      TB.sfx(en === 'fire' ? 'fire' : en === 'ice' ? 'ice' : 'heavy');
      ring(P.x, P.y, col[0], rad, 0.4); ring(P.x, P.y, col[1], rad * 0.7, 0.3);
      if (en === 'fire') for (i = 0; i < 24; i++) { var a = i / 24 * 6.28; G.fx.push({ k: 'p', x: P.x + Math.cos(a) * 20, y: P.y + Math.sin(a) * 8, z: 12, vx: Math.cos(a) * 90, vy: Math.sin(a) * 30, vz: rnd(20, 50), life: 0.5, max: 0.5, col: i % 2 ? col[0] : col[1], sz: 2 }); }
      if (en === 'ice') for (i = 0; i < 20; i++) { var b = i / 20 * 6.28; G.fx.push({ k: 'p', x: P.x, y: P.y, z: 8, vx: Math.cos(b) * 150, vy: Math.sin(b) * 60, vz: 10, life: 0.4, max: 0.4, col: i % 2 ? col[1] : col[0], sz: 2 }); }
      G.ents.forEach(function (t) {
        if (!targetable(t)) return;
        if (Math.abs(t.x - P.x) < rad + t.hw && Math.abs(t.y - P.y) < rad * 0.55 + 8 && Math.abs(t.z - P.z) < 60) {
          hitEnemy(t, dmg * base, { kb: en === 'ice' ? 60 : 140, dir: t.x >= P.x ? 1 : -1, launch: en === 'none', src: 'special', special: true, hs: 0.05, stagger: true });
        }
      });
      G.props.forEach(function (p) { if (p.type !== 'can' && p.type !== 'valve' && Math.abs(p.x - P.x) < rad && Math.abs(p.y - P.y) < rad * 0.5) hitProp(p); });
    }
  }

  function updatePlayer(dt) {
    var P = G.P, st = stats(), S = G.S, i;
    P.t += dt; P.inv = Math.max(0, P.inv - dt); P.flash = Math.max(0, P.flash - dt); P.rollCd = Math.max(0, P.rollCd - dt);
    P.rollWin = Math.max(0, P.rollWin - dt);
    if (P.combo > 0 && P.state === 'free') { P.comboT += dt; if (P.comboT > 0.55) { P.combo = 0; P.comboT = 0; } }
    if (!P.dead) P.en = clamp(P.en + st.enRegen * dt, 0, TB.ENERGY_MAX);
    if (P.hp > st.maxhp) P.hp = st.maxhp;
    var mx = (down.right ? 1 : 0) - (down.left ? 1 : 0), my = (down.down ? 1 : 0) - (down.up ? 1 : 0);
    P.st += dt; P.moving = false;
    switch (P.state) {
      case 'free': {
        var sp = st.speed * (P.carry ? 0.85 : 1);
        if (mx || my) { P.moving = true; P.walkT += dt; }
        if (mx) P.face = mx;
        P.vx = mx * sp; P.vy = my * sp * 0.68;
        if (consume('special') && P.en >= st.spCost) { startSpecial(); break; }
        if (consume('dodge') && P.rollCd <= 0) { startRoll(mx, my); break; }
        if (consume('jump')) { P.state = 'air'; P.st = 0; P.vz = 205; P.airAtkN = 0; P.vx = mx * sp; TB.sfx('roll'); break; }
        if (P.carry) { if (consume('light') || consume('use') || consume('heavy')) throwCarry(); break; }
        if (consume('use')) { useAction(); break; }
        if (consume('heavy')) { if (P.rollWin > 0 && S.level >= 6) startAttack(M().cyclone); else startAttack(M().heavy); break; }
        if (consume('light')) {
          var ch = lightChain(), idx = P.combo % ch.length; P.combo = idx + 1; P.comboT = 0;
          startAttack(M().light[ch[idx]]); if (idx === ch.length - 1) P.combo = 0; break;
        }
        break;
      }
      case 'attack': {
        var d = P.atk, tot = d.wind + d.act + d.rec, actEnd = d.wind + d.act;
        if (P.st < actEnd) { P.vx = P.face * (d.lunge || 0) * (1 - P.st / actEnd); P.vy = my * 20; } else { P.vx = 0; P.vy = 0; }
        if (P.st >= d.wind && P.st < actEnd) {
          if (d.multi) { P.nextHit -= dt; if (P.nextHit <= 0) { P.nextHit = d.multi; P.hit = new Set(); if (doAttackHits(d)) { onPlayerHit(d); } } }
          else if (doAttackHits(d)) onPlayerHit(d);
        }
        // cancel windows keep the game responsive
        if (P.st >= d.wind + d.act * 0.6) {
          if (consume('dodge') && P.rollCd <= 0) { startRoll(mx, my); break; }
          if (consume('special') && P.en >= st.spCost) { startSpecial(); break; }
          if (!d.heavy && !d.aoe && consume('light')) {
            var ch2 = lightChain(), idx2 = P.combo % ch2.length; P.combo = idx2 + 1; P.comboT = 0; if (mx) P.face = mx;
            startAttack(M().light[ch2[idx2]]); if (idx2 === ch2.length - 1) P.combo = 0; break;
          }
        }
        if (P.st >= tot) { P.state = 'free'; P.atk = null; P.comboT = 0; }
        break;
      }
      case 'air': case 'airatk': {
        var sp2 = st.speed;
        P.vx = mx * sp2 * (P.state === 'airatk' ? 0.5 : 1); P.vy = my * sp2 * 0.4; if (mx) P.face = mx;
        P.vz -= 520 * dt; P.z += P.vz * dt;
        if (P.state === 'air') {
          if (consume('light') || consume('heavy')) { P.state = 'airatk'; P.atk = M().air; P.st = 0; P.hit = new Set(); TB.sfx('swing'); P.airAtkN = 1; }
        } else {
          var da = P.atk;
          if (P.st >= da.wind && P.st < da.wind + da.act) { if (doAttackHits(da)) onPlayerHit(da); }
          if (P.st >= da.wind + da.act * 0.6 && P.airAtkN === 1 && S.level >= 3 && (consume('light') || consume('heavy'))) { P.atk = M().air2; P.st = 0; P.hit = new Set(); P.airAtkN = 2; P.vz = Math.max(P.vz, 60); TB.sfx('swing'); }
          else if (P.st >= da.wind + da.act + da.rec) { P.state = 'air'; P.atk = null; }
        }
        if (P.z <= 0) { P.z = 0; P.vz = 0; P.state = 'free'; P.atk = null; P.vx = 0; if (S.energy !== 'none' && false) { /* no landing fx */ } }
        break;
      }
      case 'roll': {
        P.vx = P.rollDirX * st.rollSpeed * (1 - P.st / (st.rollDur * 1.6)); P.vy = P.rollDirY * st.rollSpeed * 0.6 * (1 - P.st / (st.rollDur * 1.6));
        if (P.st >= st.rollDur) { P.state = 'free'; P.vx = 0; P.vy = 0; P.rollWin = 0.35; P.rollCd = 0.28; }
        break;
      }
      case 'special': {
        P.vx = 0; P.vy = 0;
        if (!P.spDone && P.st >= 0.14) { P.spDone = true; specialEffect(); }
        if (P.st >= (S.energy === 'lightning' ? 0.4 : 0.5)) { P.state = 'free'; }
        break;
      }
      case 'hurt': P.vx *= 0.9; if (P.st >= P.hurtDur) { P.state = 'free'; P.vx = 0; } break;
      case 'down': {
        P.vz -= 520 * dt; P.z += P.vz * dt; if (P.z <= 0) { P.z = 0; P.vz = 0; P.vx *= 0.4; P.state = 'lying'; P.st = 0; }
        break;
      }
      case 'lying': P.vx *= 0.85; if (P.st >= 0.5) { P.state = 'getup'; P.st = 0; P.inv = Math.max(P.inv, 0.5); } break;
      case 'getup': P.vx = 0; if (P.st >= 0.25) P.state = 'free'; break;
      case 'grabbed': {
        P.vx = 0; P.vy = 0;
        if (!G.ents.some(function (h) { return h.state === 'holding' && !h.dead; })) { P.state = 'free'; break; }
        if (consume('light') || consume('heavy') || consume('jump')) { P.mash++; spark(P.x, P.y, 25, '#fff', 3); }
        break;
      }
      case 'dead': {
        P.vz -= 520 * dt; P.z = Math.max(0, P.z + P.vz * dt); if (P.z === 0) { P.vx *= 0.8; }
        P.deadT += dt; if (P.deadT > 1.6 && G.state === 'play') { G.state = 'dead'; if (TB.ui) TB.ui.gameOver(); }
        break;
      }
    }
    // integrate & bounds
    P.x += P.vx * dt; P.y += P.vy * dt;
    P.y = clamp(P.y, FT + 2, FB);
    P.x = clamp(P.x, G.cam.x + 14, G.cam.x + W - 14);
    P.x = clamp(P.x, 14, STAGE.length - 14);
    // trail sampling (weapon tip positions)
    if ((P.state === 'attack' || P.state === 'airatk' || P.state === 'special') && P.atk !== null || P.state === 'special') sampleTrail();
    // items pickup
    for (i = G.items.length - 1; i >= 0; i--) {
      var it = G.items[i], dx = it.x - P.x, dy = it.y - P.y;
      if (it.type === 'coin' && Math.abs(dx) < 46 && Math.abs(dy) < 30) { it.x -= dx * Math.min(1, dt * 8); it.y -= dy * Math.min(1, dt * 8); }
      if (Math.abs(dx) < 12 && Math.abs(dy) < 12 && P.z < 16 && !P.dead) {
        if (it.type === 'pizza') { if (P.hp >= st.maxhp) continue; P.hp = Math.min(st.maxhp, P.hp + 30); text(P.x, P.y - 40, '+30', '#6aff8a'); spark(P.x, P.y, 20, '#6aff8a', 8); }
        else { awardScrapRaw(it.val || 1, P.x, P.y); }
        TB.sfx('pickup'); G.items.splice(i, 1);
      }
    }
  }
  function awardScrapRaw(n, x, y) { G.S.scrap += n; text(x, y - 22, '+' + n, '#ffd23a'); }
  function startRoll(mx, my) {
    var P = G.P, st = stats();
    P.state = 'roll'; P.st = 0; P.inv = st.rollDur + 0.05; P.atk = null; TB.sfx('roll');
    var dx = mx, dy = my; if (!dx && !dy) dx = P.face; if (dx) P.face = dx;
    var n = Math.hypot(dx, dy * 0.6) || 1; P.rollDirX = dx / n; P.rollDirY = dy / n;
    spark(P.x, P.y, 4, '#aab', 4, 40);
  }
  function onPlayerHit(def) {
    var P = G.P, st = stats();
    P.en = Math.min(TB.ENERGY_MAX, P.en + (def.heavy ? st.hitEn * 1.5 : st.hitEn));
  }
  function useAction() {
    var P = G.P, i;
    for (i = 0; i < G.props.length; i++) {
      var p = G.props[i];
      if (p.type === 'can' && Math.abs(p.x - P.x) < 26 && Math.abs(p.y - P.y) < 16) { P.carry = true; G.props.splice(i, 1); TB.sfx('pickup'); return; }
      if (p.type === 'valve' && !p.done && Math.abs(p.x - P.x) < 34 && Math.abs(p.y - P.y) < 20) { p.turning = 1.6; TB.sfx('warn'); banner('Working…', 1.6); return; }
    }
  }
  function throwCarry() {
    var P = G.P; P.carry = false; TB.sfx('swing');
    G.proj.push({ kind: 'can', x: P.x + P.face * 14, y: P.y, z: 26, vx: P.face * 240, vy: 0, vz: 30, dmg: 24 * stats().dmg, life: 1.2, hit: new Set() });
  }

  /* trail: store tip positions in world coords with age */
  function armPose() {  // returns {rAng,lAng,rShow,lShow}
    var P = G.P, t = P.t, idle = TB.WEAPONS[TB.TURTLES[G.S.turtle].weapon].idle, r = idle.r + Math.sin(t * 4) * 0.05, l = idle.l;
    if (P.state === 'attack' && P.atk) {
      var d = P.atk, p = P.st, a;
      if (d.spin) { a = P.st * 26; return { rAng: a, lAng: a + Math.PI }; }
      if (p < d.wind) a = lerp(d.a0 + 0.6, d.a0, p / d.wind);
      else if (p < d.wind + d.act) a = lerp(d.a0, d.a1, (p - d.wind) / d.act);
      else a = lerp(d.a1, d.a1 - 0.3, Math.min(1, (p - d.wind - d.act) / d.rec));
      var res = { rAng: r, lAng: l };
      if (d.hand === 'R' || d.hand === 'RL') res.rAng = a;
      if (d.hand === 'L') res.lAng = a;
      if (d.hand === 'RL') res.lAng = a + 0.35;
      return res;
    }
    if (P.state === 'airatk' && P.atk) {
      var d2 = P.atk, p2 = P.st, a2 = p2 < d2.wind ? d2.a0 : lerp(d2.a0, d2.a1, clamp((p2 - d2.wind) / d2.act, 0, 1));
      return d2.hand === 'L' ? { rAng: r, lAng: a2 } : { rAng: a2, lAng: 0.4 };
    }
    if (P.state === 'special') { var s = P.st * 30; return { rAng: s, lAng: s + Math.PI }; }
    if (P.state === 'air') return { rAng: -1.0, lAng: -0.2 };
    if (P.state === 'hurt') return { rAng: 0.9, lAng: 1.1 };
    if (P.state === 'grabbed') return { rAng: 1.2, lAng: 1.3 };
    return { rAng: r, lAng: l };
  }
  function sampleTrail() {
    var P = G.P, S = G.S, a = armPose(), len = TB.WEAPONS[TB.TURTLES[S.turtle].weapon].len[S.tier], by = P.y - P.z;
    var addTip = function (ang) {
      var sx = 3, sy = -23, hx = sx + Math.cos(ang) * 8, hy = sy + Math.sin(ang) * 8, tx = hx + Math.cos(ang) * len, ty = hy + Math.sin(ang) * len;
      G.trail.push({ x: P.x + P.face * tx, y: by + ty, bx: P.x + P.face * hx, by: by + hy, life: 0.2, max: 0.2, hand: 0 });
    };
    var d = P.atk, act = P.state === 'special' || (d && P.st >= Math.max(0, d.wind - 0.02) && P.st < d.wind + d.act + 0.06);
    if (!act) return;
    if (P.state === 'special' || !d || d.hand === 'R' || d.hand === 'RL') addTip(a.rAng);
    if (P.state === 'special' || (d && (d.hand === 'L' || d.hand === 'RL'))) addTip(a.lAng);
  }

  /* ============================== TARGETS / DAMAGE ============================== */
  function targetable(e) { return !e.dead && e.state !== 'dying' && e.inv <= 0 && !(e.state === 'getup'); }

  function hitProp(p) {
    p.hp--; p.shake = 0.15; TB.sfx('hit'); spark(p.x, p.y, 10, '#c9a060', 6, 70); G.hitstop = Math.max(G.hitstop, 0.03);
    if (p.hp > 0) return;
    TB.sfx('break_'); shake(2); spark(p.x, p.y, 10, p.type === 'barrel' ? '#3a6ea5' : '#9a6a34', 14, 110);
    G.props.splice(G.props.indexOf(p), 1);
    if (!claim(p.key)) return;
    if (p.type === 'secret') { G.S.secrets = (G.S.secrets || 0) + 1; awardXP(TB.SECRET_XP, p.x, p.y); banner('Secret found!', 2.5, 'good'); TB.sfx('level'); for (var i = 0; i < 6; i++) G.items.push({ type: 'coin', val: 5, x: p.x + rnd(-14, 14), y: clamp(p.y + rnd(2, 16), FT, FB), seed: Math.random() * 6 }); G.items.push({ type: 'pizza', x: p.x, y: p.y + 14, seed: 1 }); return; }
    var n = p.type === 'barrel' ? 2 : 3;
    for (var j = 0; j < n; j++) G.items.push({ type: 'coin', val: 2, x: p.x + rnd(-12, 12), y: clamp(p.y + rnd(-4, 8), FT, FB), seed: Math.random() * 6 });
    var roll = (parseInt(p.key.split('_')[1], 10) * 37 % 100) / 100;
    if (roll < (p.type === 'barrel' ? 0.6 : 0.35)) G.items.push({ type: 'pizza', x: p.x, y: p.y + 6, seed: 2 });
  }

  function hitEnemy(e, dmg, o) {
    if (!targetable(e)) return false;
    var P = G.P, st = stats(), isDot = o.src === 'dot';
    if (e.state === 'stun' && e.type === 'rhino') dmg *= 1.5;
    if (e.frozen > 0 && !isDot) { dmg *= 1.25; if (o.heavy || o.finisher || o.special) { e.frozen = 0; dmg *= 1.15; ring(e.x, e.y, '#bdf0ff', 26, 0.25, e.z + 10); spark(e.x, e.y, e.h * 0.5, '#bdf0ff', 14, 120); TB.sfx('ice'); } }
    if (isBoss(e) && !e.opening && !isDot) dmg *= 0.6;
    e.hp -= dmg; e.flash = 0.09;
    if (!isDot) text(e.x + rnd(-6, 6), e.y - e.h - e.z + 4, Math.max(1, Math.round(dmg)), '#ffffff');
    if (isDot) { if (Math.random() < 0.3) text(e.x, e.y - e.h - e.z, Math.max(1, Math.round(dmg)), '#ff9a4a'); }
    if (!isDot) {
      var col = TB.glow(G.S.energy);
      spark(e.x, e.y, e.h * 0.55 + e.z, G.S.energy === 'none' ? '#ffffff' : col[1], o.heavy ? 12 : 7, o.heavy ? 130 : 90);
      G.hitstop = Math.max(G.hitstop, o.hs || 0.05); shake(o.heavy ? 3 : 1);
      TB.sfx(o.heavy || o.launch ? 'heavy' : 'hit');
      if (o.src === 'melee') { G.combo.n++; G.combo.t = 1.4; }
      if (!o.noEnergyFx && (o.src === 'melee' || o.src === 'thrown')) applyEnergy(e, dmg, o);
      if (o.src === 'special' && G.S.energy === 'ice') applyEnergy(e, dmg, { special: true });
      if (o.src === 'special' && G.S.energy === 'fire') applyBurn(e, 1.6);
      if (o.stunLite) applyStun(e, 0.45);
    }
    if (e.hp <= 0) { killEnemy(e, o); return true; }
    if (isDot) return true;
    // reaction
    var armor = e.armor || 0, stagger = o.stagger || o.launch, react = 'none';
    if (armor === 0) react = o.launch ? 'down' : 'hurt';
    else if (armor === 1 && stagger) react = o.launch ? 'down' : 'hurt';
    if (isBoss(e)) react = 'none';
    if (react === 'down') knockDown(e, o.dir, o.kb);
    else if (react === 'hurt') { e.state = 'hurt'; e.st = 0; e.hurtDur = 0.26; e.vx = o.dir * (o.kb || 40) * 0.9; e.attacking = false; e.thorns = false; e.tele = 0; e.lane = null; e.mark = null; }
    else e.x += o.dir * (o.kb || 0) * 0.02;
    return true;
  }
  function knockDown(e, dir, kb) {
    e.state = 'down'; e.st = 0; e.vz = 120; e.vx = dir * (kb || 100) * 0.9; e.attacking = false; e.thorns = false; e.tele = 0; e.lane = null; e.mark = null; e.opening = false;
  }
  function applyStun(e, sec) {
    if (e.stunImm > 0 || e.armor === 2 || isBoss(e)) return;
    e.state = 'hurt'; e.st = 0; e.hurtDur = sec; e.attacking = false; e.stunImm = 2.2; e.vx = 0; e.thorns = false; e.tele = 0;
  }
  function applyBurn(e, mult) {
    var st = stats(), res = e.def.resist.fire; if (res <= 0) return;
    e.burn = { t: 3 + 0.4 * st.tier, dps: (2.5 + st.tier * 0.9) * st.potency * res * (mult || 1), acc: 0 };
  }
  function applyEnergy(e, dmg, o) {
    var S = G.S, st = stats(), en = S.energy, i, t;
    if (en === 'fire') {
      applyBurn(e, 1);
      if (o.finisher) {
        var col = TB.glow('fire'); ring(e.x, e.y, col[0], 38, 0.3, e.z + 8); spark(e.x, e.y, e.h * 0.5, col[1], 14, 130); TB.sfx('fire');
        G.ents.forEach(function (t2) { if (t2 !== e && targetable(t2) && Math.abs(t2.x - e.x) < 42 && Math.abs(t2.y - e.y) < 24) { hitEnemy(t2, 7 * st.potency * st.dmg, { src: 'blast', dir: t2.x >= e.x ? 1 : -1, kb: 60, hs: 0.02 }); applyBurn(t2, 1); } });
        e.hp -= 8 * st.potency; if (e.hp <= 0) killEnemy(e, o);
      }
    } else if (en === 'lightning') {
      var n = st.tier < 3 ? 1 : st.tier < 5 ? 2 : 3, rng = 78 + st.tier * 8, col2 = TB.glow('lightning'), res = e.def.resist.lightning, done = 0;
      if (res <= 0) return;
      var cand = G.ents.filter(function (t2) { return t2 !== e && targetable(t2) && Math.abs(t2.x - e.x) < rng && Math.abs(t2.y - e.y) < rng * 0.6; })
        .sort(function (a, b) { return Math.abs(a.x - e.x) - Math.abs(b.x - e.x); });
      var from = e;
      for (i = 0; i < cand.length && done < n; i++) {
        t = cand[i]; done++;
        bolt(from.x, from.y - from.z - from.h * 0.5, t.x, t.y - t.z - t.h * 0.5, col2[1]);
        hitEnemy(t, dmg * (0.45 + 0.03 * st.tier) * st.potency * res, { src: 'chain', dir: t.x >= from.x ? 1 : -1, kb: 20, hs: 0.02 });
        from = t;
      }
      if (done) TB.sfx('zap');
      if (o.heavy || o.finisher) applyStun(e, 0.35 * res);
    } else if (en === 'toxic') {
      var rt = resOf(e, 'toxic'); if (rt <= 0) return;
      applyPoison(e, 1);
      if (o.finisher || o.heavy || Math.random() < 0.18) addPuddle(e.x, e.y, 20 + 2 * st.tier, 4 + 0.4 * st.tier, (2.5 + st.tier * 0.8) * st.potency);
      if (Math.random() < 0.5) spark(e.x, e.y, e.h * 0.5, '#7be34a', 3, 50);
    } else if (en === 'mystic') {
      var rm = resOf(e, 'mystic'); if (rm <= 0) return;
      var pr = 40 + st.tier * 3, col3 = TB.glow('mystic');
      ring(e.x, e.y, col3[0], pr, 0.2, e.z + 8);
      G.ents.forEach(function (t2) {
        if (!targetable(t2) || Math.abs(t2.x - e.x) > pr || Math.abs(t2.y - e.y) > pr * 0.6) return;
        var dp = t2.x >= e.x ? 1 : -1;
        if (t2 !== e) hitEnemy(t2, 2.5 * st.potency * st.dmg, { src: 'pulse', dir: dp, kb: 50, hs: 0.01 });
        if (!t2.dead && t2.armor < 2) t2.x += dp * 12 * resOf(t2, 'mystic');
      });
      if (o.finisher || o.heavy) {
        TB.sfx('boom'); ring(e.x, e.y, col3[1], 70 + 8 * st.tier, 0.35, e.z + 6);
        G.ents.forEach(function (t2) {
          if (!targetable(t2) || Math.abs(t2.x - e.x) > 70 + 8 * st.tier || Math.abs(t2.y - e.y) > 40) return;
          var dp2 = t2.x >= e.x ? 1 : -1, r2 = resOf(t2, 'mystic');
          hitEnemy(t2, 6 * st.potency * st.dmg, { src: 'pulse', dir: dp2, kb: 90, hs: 0.02 });
          if (!t2.dead && t2.state !== 'dying' && t2.stunImm <= 0 && r2 >= 0.6 && t2.armor < 2) { knockDown(t2, dp2, 120); t2.stunImm = 2.5; }
        });
      }
    } else if (en === 'ice') {
      var res2 = e.def.resist.ice; if (res2 <= 0) return;
      e.chill += res2 >= 0.6 ? 1 : 0.4; e.chillT = 3; e.slow = 1 - Math.min(0.55, (0.28 + 0.04 * st.tier) * res2);
      var need = st.tier >= 4 ? 3 : 4;
      if (e.chill >= need && e.freezeImm <= 0) freeze(e, (0.9 + 0.1 * st.tier) * Math.min(1, res2));
      else if (Math.random() < 0.5) spark(e.x, e.y, e.h * 0.5, '#bdf0ff', 3, 50);
    }
  }
  function applyPoison(e, mult) {
    var st = stats(), r = resOf(e, 'toxic'); if (r <= 0) return;
    var pd = (1.8 + 0.6 * st.tier) * st.potency * r * (mult || 1);
    e.poison = e.poison ? { t: 4 + 0.4 * st.tier, dps: Math.min(pd * 3, e.poison.dps + pd * 0.5), acc: e.poison.acc } : { t: 4 + 0.4 * st.tier, dps: pd, acc: 0 };
  }
  function addPuddle(x, y, r, life, dps) { if (G.puddles.length > 8) G.puddles.shift(); G.puddles.push({ x: x, y: clamp(y, FT + 2, FB), r: r, life: life, max: life, dps: dps, tick: 0.3 }); }
  function freeze(e, sec) {
    if (isBoss(e)) sec *= 0.7;
    e.frozen = sec; e.freezeImm = 4.5 + sec; e.chill = 0; e.attacking = false; e.thorns = false; e.tele = 0; e.lane = null; e.mark = null;
    if (e.state !== 'dying') { e.frozenState = e.state; }
    spark(e.x, e.y, e.h * 0.5, '#bdf0ff', 12, 100); TB.sfx('ice');
    if (e.state === 'tele' || e.state === 'charge' || e.state === 'lunge' || e.state === 'swoop' || e.state === 'windup' || e.state === 'slash') { e.state = e.home; e.st = 0; e.vx = 0; e.vy = 0; }
  }

  function killEnemy(e, o) {
    if (e.dead || e.state === 'dying') return;
    e.state = 'dying'; e.st = 0; e.hp = 0; e.attacking = false; e.thorns = false; e.frozen = 0; e.lane = null; e.mark = null; e.burn = null;
    e.vz = Math.max(e.vz, 100); e.vx = (o && o.dir ? o.dir : 1) * 100;
    var d = e.def;
    TB.sfx('heavy'); shake(isBoss(e) ? 6 : 2); spark(e.x, e.y, e.h * 0.5, '#fff', 14, 140); G.hitstop = Math.max(G.hitstop, 0.09);
    if (claim(e.key)) {
      G.S.kills = (G.S.kills || 0) + 1;
      awardXP(d.xp, e.x, e.y);
      var n = Math.max(1, Math.round(d.scrap / 2));
      for (var i = 0; i < n; i++) G.items.push({ type: 'coin', val: Math.ceil(d.scrap / n), x: e.x + rnd(-14, 14), y: clamp(e.y + rnd(-6, 8), FT, FB), seed: Math.random() * 6 });
      if ((e.type === 'rhino' || e.type === 'porcupine') && Math.random() < 0.5) G.items.push({ type: 'pizza', x: e.x, y: e.y, seed: 3 });
    }
    if (isBoss(e)) { G.slowmo = 1.0; }
  }

  /* ============================== ENEMIES ============================== */
  function newEnemy(type, x, y, key, opts) {
    var d = TB.ENEMIES[type];
    var e = { type: type, def: d, x: x, y: y, z: 0, vx: 0, vy: 0, vz: 0, face: -1, hp: d.hp, maxhp: d.hp, hw: d.hw, h: d.h, state: 'approach', home: 'approach', st: 0, tele: 0, flash: 0,
      seed: Math.random() * 10, burn: null, chill: 0, chillT: 0, slow: 1, frozen: 0, freezeImm: 0, stunImm: 0, inv: 0, cd: rnd(0.6, 1.6), armor: 0, key: key, dead: false,
      attacking: false, thorns: false, opening: false, ang: Math.random() * 6.28, dir: Math.random() < 0.5 ? 1 : -1, rad: 42 + Math.random() * 22, hurtDur: 0.26, phase: 1 };
    if (type === 'rat') { e.state = 'circle'; e.home = 'circle'; }
    if (type === 'bat') { e.state = 'hover'; e.home = 'rise'; e.z = 52; e.cd = rnd(1.2, 2.4); }
    if (type === 'porcupine') { e.state = 'reposition'; e.home = 'reposition'; e.burstCd = 3; }
    if (type === 'grappler') { e.home = 'approach'; }
    if (type === 'boss' || type === 'warlord') { e.state = 'intro'; e.home = 'idle'; e.cd = 1; e.phase = 1; e.lastAtk = ''; }
    return e;
  }
  function P_() { return G.P; }
  function faceP(e) { e.face = G.P.x >= e.x ? 1 : -1; }
  function moveTo(e, tx, ty, sp, dt) {
    var dx = tx - e.x, dy = ty - e.y, d = Math.hypot(dx, dy);
    if (d < 2) return d;
    var s = Math.min(d, sp * dt); e.x += dx / d * s; e.y += dy / d * s * (e.type === 'bat' ? 1 : 1);
    return d;
  }
  function attackerCount() { var n = 0; for (var i = 0; i < G.ents.length; i++) if (G.ents[i].attacking) n++; return n; }
  function canAttack(e) { return e.cd <= 0 && attackerCount() < 3 && !G.P.dead && G.P.state !== 'grabbed'; }
  function touchP(e, rx, ry) { var P = G.P; return Math.abs(P.x - e.x) < rx && Math.abs(P.y - e.y) < ry && P.z < e.z + e.h * 0.8; }
  function setS(e, s) { e.state = s; e.st = 0; }
  function clampArena(e) { e.x = clamp(e.x, G.cam.x + 10, G.cam.x + W - 10); e.y = clamp(e.y, FT + 2, FB); }
  function bounds() { return { l: G.cam.x + 24, r: G.cam.x + W - 24 }; }

  var AI = {};
  AI.rat = function (e, dt) {
    var P = G.P, dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy);
    switch (e.state) {
      case 'circle':
        e.ang += dt * 0.55 * e.dir;
        moveTo(e, P.x + Math.cos(e.ang) * e.rad * 1.5, P.y + Math.sin(e.ang) * e.rad * 0.55, e.def.speed, dt); faceP(e);
        e.cd -= dt;
        if (e.cd <= 0 && dist < 150 && canAttack(e)) { setS(e, 'tele'); e.attacking = true; e.tele = 1; TB.sfx('warn'); }
        break;
      case 'tele': faceP(e); if (e.st >= 0.36) { setS(e, 'lunge'); e.tele = 0; var n = Math.hypot(dx, dy * 1.5) || 1; e.vx = dx / n * 230; e.vy = dy / n * 150; e.did = false; } break;
      case 'lunge':
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (!e.did && touchP(e, 13, 11)) { e.did = true; hurtPlayer(6, e.x, {}); }
        if (e.st >= 0.28) { setS(e, 'recover'); e.vx = e.vy = 0; }
        break;
      case 'recover': if (e.st >= 0.7) { e.attacking = false; e.cd = rnd(1.0, 2.2); setS(e, 'circle'); } break;
    }
  };

  AI.mantis = function (e, dt) {
    var P = G.P, dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy);
    e.dodgeCd = (e.dodgeCd || 0) - dt;
    switch (e.state) {
      case 'approach': {
        e.armor = 0; faceP(e);
        var side = e.x < P.x ? -1 : 1;
        moveTo(e, P.x + side * 30, P.y, e.def.speed, dt);
        e.cd -= dt;
        if (Math.abs(dx) < 46 && Math.abs(dy) < 12 && canAttack(e)) { setS(e, 'tele'); e.attacking = true; e.tele = 1; TB.sfx('warn'); }
        else if (e.dodgeCd <= 0 && P.state === 'attack' && dist < 70 && Math.random() < 0.03) { setS(e, 'sidestep'); e.vy = (Math.random() < 0.5 ? -1 : 1) * 150; e.inv = 0.22; e.dodgeCd = 3.5; }
        break;
      }
      case 'sidestep': e.y += e.vy * dt; if (e.st >= 0.24) { e.vy = 0; setS(e, 'approach'); } break;
      case 'tele': e.armor = 1; if (e.st < 0.25) faceP(e); if (e.st >= 0.42) { setS(e, 'windup'); e.slashN = 0; e.tele = 0; } break;
      case 'windup': e.armor = 1; if (e.st >= (e.slashN === 0 ? 0.03 : 0.1)) { setS(e, 'slash'); e.slashHit = false; TB.sfx('swing'); } break;
      case 'slash': {
        e.armor = 1; e.slashP = clamp(e.st / 0.16, 0, 1); e.x += e.face * 70 * dt;
        if (!e.slashHit && e.st > 0.05) {
          var bx0 = e.face > 0 ? e.x - 4 : e.x - 44, bx1 = e.face > 0 ? e.x + 44 : e.x + 4;
          if (P.x > bx0 && P.x < bx1 && Math.abs(P.y - e.y) < 14 && P.z < 28) { e.slashHit = true; hurtPlayer([7, 7, 11][e.slashN], e.x, { knock: e.slashN === 2 }); }
        }
        if (e.st >= 0.16) { e.slashN++; if (e.slashN >= 3) { setS(e, 'recover'); e.armor = 0; } else setS(e, 'windup'); }
        break;
      }
      case 'recover': e.armor = 0; e.opening = true; if (e.st >= 0.8) { e.opening = false; e.attacking = false; e.cd = rnd(0.9, 1.8); setS(e, 'approach'); } break;
    }
  };

  AI.bat = function (e, dt) {
    var P = G.P;
    switch (e.state) {
      case 'hover': {
        e.armor = 0; e.z = lerp(e.z, 52 + Math.sin(G.time * 3 + e.seed) * 3, Math.min(1, dt * 6));
        e.ang += dt * 0.9 * e.dir;
        moveTo(e, P.x + Math.cos(e.ang) * 120, clamp(P.y + Math.sin(e.ang) * 32, FT + 6, FB), e.def.speed, dt); faceP(e);
        e.cd -= dt;
        if (e.cd <= 0 && canAttack(e)) { setS(e, 'tele'); e.attacking = true; e.tele = 1; TB.sfx('warn'); e.mx = P.x; e.my = P.y; }
        break;
      }
      case 'tele':
        faceP(e); e.z = lerp(e.z, 60, Math.min(1, dt * 5));
        if (e.st < 0.38) { e.mx = P.x; e.my = P.y; }
        e.mark = { x: e.mx, y: e.my, r: 14 };
        if (e.st >= 0.62) { setS(e, 'swoop'); e.sx = e.x; e.sy = e.y; e.sz = e.z; e.did = false; e.tele = 0; }
        break;
      case 'swoop': {
        var p = clamp(e.st / 0.5, 0, 1);
        e.x = lerp(e.sx, e.mx, p); e.y = lerp(e.sy, e.my, p); e.z = e.sz * (1 - p) * (1 - p);
        e.face = e.mx >= e.sx ? 1 : -1;
        if (!e.did && e.z < 26 && touchP(e, 16, 12)) { e.did = true; hurtPlayer(9, e.x, {}); }
        if (p >= 1) { setS(e, 'exposed'); e.mark = null; e.z = 0; }
        break;
      }
      case 'exposed': e.z = 0; e.opening = true; if (e.st >= 0.95) { e.opening = false; setS(e, 'rise'); } break;
      case 'rise': e.z = lerp(e.z, 52, Math.min(1, dt * 5)); e.mark = null; if (e.st >= 0.35) { e.attacking = false; e.cd = rnd(2.0, 3.4); e.home = 'rise'; setS(e, 'hover'); } break;
    }
  };

  AI.porcupine = function (e, dt) {
    var P = G.P, dx = P.x - e.x, dy = P.y - e.y, dist = Math.hypot(dx, dy), bd = bounds();
    e.burstCd -= dt;
    switch (e.state) {
      case 'reposition': {
        e.armor = 0; faceP(e);
        var sgn = e.x < P.x ? -1 : 1, tx = P.x + sgn * 160;
        if (tx < bd.l || tx > bd.r) { sgn = -sgn; tx = P.x + sgn * 160; }
        tx = clamp(tx, bd.l, bd.r);
        moveTo(e, tx, P.y, e.def.speed, dt);
        e.cd -= dt;
        if (dist < 60 && e.burstCd <= 0) { setS(e, 'burstT'); e.thorns = true; e.tele = 1; e.attacking = true; TB.sfx('warn'); }
        else if (e.cd <= 0 && Math.abs(dy) < 14 && dist > 80 && dist < 280 && attackerCount() < 4 && !P.dead) { setS(e, 'tele'); e.thorns = true; e.tele = 1; e.attacking = true; TB.sfx('warn'); }
        break;
      }
      case 'tele': e.armor = 1; faceP(e); e.aimY = e.y; if (e.st >= 0.78) { setS(e, 'fire'); e.tele = 0; } break;
      case 'fire':
        if (e.st === 0 || !e.fired) { e.fired = true; TB.sfx('shoot'); for (var k = -1; k <= 1; k++) G.proj.push({ kind: 'quill', x: e.x + e.face * 20, y: e.y + k * 13, z: 14, vx: e.face * 200, vy: 0, dmg: 6, life: 3 }); }
        if (e.st >= 0.12) { e.fired = false; e.thorns = false; setS(e, 'recover'); }
        break;
      case 'burstT': e.armor = 1; if (e.st >= 0.55) { setS(e, 'burst'); e.tele = 0; } break;
      case 'burst':
        if (!e.fired) { e.fired = true; TB.sfx('boom'); ring(e.x, e.y, '#e8d8b0', 50, 0.3); spark(e.x, e.y, 14, '#e8d8b0', 14, 130); shake(2);
          if (Math.abs(P.x - e.x) < 52 && Math.abs(P.y - e.y) < 26 && P.z < 24) hurtPlayer(8, e.x, { knock: true }); e.burstCd = 5; }
        if (e.st >= 0.1) { e.fired = false; e.thorns = false; setS(e, 'recover'); }
        break;
      case 'recover': e.armor = 0; e.opening = true; e.thorns = false; if (e.st >= 0.95) { e.opening = false; e.attacking = false; e.cd = rnd(1.5, 2.6); setS(e, 'reposition'); } break;
    }
  };

  AI.rhino = function (e, dt) {
    var P = G.P, dx = P.x - e.x, dy = P.y - e.y, bd = bounds();
    switch (e.state) {
      case 'approach': {
        e.armor = 2; faceP(e);
        moveTo(e, P.x - e.face * 34, P.y, e.def.speed, dt); e.cd -= dt;
        if (e.cd <= 0 && canAttack(e)) {
          if (Math.abs(dx) < 52 && Math.abs(dy) < 16) { setS(e, 'stele'); e.attacking = true; e.tele = 1; TB.sfx('warn'); }
          else if (Math.abs(dx) > 100) { setS(e, 'tele'); e.attacking = true; e.tele = 1; TB.sfx('warn'); e.laneLocked = false; }
        }
        break;
      }
      case 'tele': {
        e.armor = 2;
        if (e.st < 0.55) { faceP(e); e.y += clamp(P.y - e.y, -90 * dt, 90 * dt); }
        else if (!e.laneLocked) { e.laneLocked = true; e.ly = e.y; TB.sfx('warn'); }
        e.lane = { y: e.y, x0: e.x, x1: e.x + e.face * 330, locked: e.laneLocked };
        if (e.st >= 0.95) { setS(e, 'charge'); e.dist = 0; e.didHit = false; e.tele = 0; e.lane = null; }
        break;
      }
      case 'charge': {
        e.armor = 2; var step = 270 * dt; e.x += e.face * step; e.dist += step;
        if (Math.random() < 0.5) spark(e.x - e.face * 14, e.y, 2, '#aab', 1, 40);
        if (!e.didHit && touchP(e, 22, 13)) { e.didHit = true; hurtPlayer(16, e.x, { knock: true }); }
        for (var i = G.props.length - 1; i >= 0; i--) { var p = G.props[i]; if (p.type !== 'valve' && Math.abs(p.x - e.x) < 22 && Math.abs(p.y - e.y) < 14) { p.hp = 1; hitProp(p); } }
        if (e.x <= bd.l || e.x >= bd.r) { e.x = clamp(e.x, bd.l, bd.r); setS(e, 'stun'); e.stunDur = 1.9; shake(5); TB.sfx('boom'); spark(e.x, e.y, 30, '#8a96a2', 16, 140); banner('Rhino is stunned!', 1.2, 'good'); }
        else if (e.dist > 340) { if (e.didHit) { setS(e, 'recover'); e.armor = 0; } else { setS(e, 'stun'); e.stunDur = 1.3; } }
        break;
      }
      case 'stun': e.armor = 0; e.opening = true; if (e.st >= e.stunDur) { e.opening = false; e.attacking = false; e.cd = rnd(1.4, 2.4); setS(e, 'approach'); } break;
      case 'recover': e.armor = 0; e.opening = true; if (e.st >= 0.65) { e.opening = false; e.attacking = false; e.cd = rnd(1.2, 2.0); setS(e, 'approach'); } break;
      case 'stele': e.armor = 2; if (e.st < 0.3) faceP(e); if (e.st >= 0.55) { setS(e, 'swipe'); e.tele = 0; e.did = false; TB.sfx('swing'); } break;
      case 'swipe':
        e.armor = 2;
        if (!e.did && e.st > 0.04) { e.did = true; var bx0 = e.face > 0 ? e.x : e.x - 50, bx1 = e.face > 0 ? e.x + 50 : e.x; if (P.x > bx0 && P.x < bx1 && Math.abs(P.y - e.y) < 18 && P.z < 30) hurtPlayer(11, e.x, { knock: true }); }
        if (e.st >= 0.14) setS(e, 'recover2');
        break;
      case 'recover2': e.armor = 0; e.opening = true; if (e.st >= 0.6) { e.opening = false; e.attacking = false; e.cd = rnd(1.0, 1.8); setS(e, 'approach'); } break;
    }
  };


  AI.grappler = function (e, dt) {
    var P = G.P, dx = P.x - e.x, dy = P.y - e.y;
    function rec(d) { setS(e, 'recover'); e.recDur = d; }
    switch (e.state) {
      case 'approach':
        e.armor = 1; faceP(e); moveTo(e, P.x - e.face * 38, P.y, e.def.speed, dt); e.cd -= dt;
        if (Math.abs(dx) < 60 && Math.abs(dy) < 14 && canAttack(e)) { e.atk = Math.random() < 0.5 ? 'grab' : 'tail'; setS(e, 'tele'); e.attacking = true; e.tele = 1; TB.sfx('warn'); }
        break;
      case 'tele': e.armor = 1; if (e.st < 0.25) faceP(e); if (e.st >= (e.atk === 'grab' ? 0.5 : 0.65)) { setS(e, 'active'); e.did = false; e.tele = 0; TB.sfx('swing'); } break;
      case 'active':
        if (e.atk === 'grab') {
          e.x += e.face * 170 * dt;
          if (!e.did && touchP(e, 34, 13) && P.inv <= 0 && !G.dev.god && !P.dead && P.state !== 'grabbed') { e.did = true; setS(e, 'holding'); P.state = 'grabbed'; P.mash = 0; P.st = 0; P.atk = null; TB.sfx('hurt'); banner('MASH attack to break free!', 1.2, 'warn'); }
          else if (e.st >= 0.18) rec(0.9);
        } else {
          if (!e.did && e.st > 0.04) { e.did = true; TB.sfx('heavy'); ring(e.x, e.y, '#cfe8a0', 58, 0.25); shake(2); if (Math.abs(P.x - e.x) < 60 && Math.abs(P.y - e.y) < 18 && P.z < 24) hurtPlayer(10, e.x, { knock: true }); }
          if (e.st >= 0.2) rec(0.95);
        }
        break;
      case 'holding':
        e.armor = 2; P.x = e.x + e.face * 24; P.y = e.y;
        if (P.mash >= 3) { P.state = 'free'; P.inv = 0.5; P.vx = e.face * 80; rec(0.9); banner('Broke free!', 1, 'good'); }
        else if (e.st >= 0.9) { P.state = 'free'; P.inv = 0; hurtPlayer(14, e.x, { knock: true }); shake(3); rec(1.0); }
        break;
      case 'recover': e.armor = 0; e.opening = true; if (e.st >= e.recDur) { e.opening = false; e.attacking = false; e.cd = rnd(1.2, 2.2); setS(e, 'approach'); } break;
    }
  };

  /* ---------- Boss: Snapjaw ---------- */
  function bossPhaseCheck(e) {
    var r = e.hp / e.maxhp;
    if (e.phase === 1 && r < 0.66) { e.phase = 2; bossRoar(e, 'Snapjaw calls the pack!'); }
    else if (e.phase === 2 && r < 0.33) { e.phase = 3; bossRoar(e, 'The sewer floods!'); }
  }
  function bossRoar(e, msg) {
    setS(e, 'roar'); e.inv = 1.5; e.attacking = false; e.opening = false; e.tele = 0; e.mark = null; e.lane = null; TB.sfx('roar'); shake(4); banner(msg, 2.6, 'warn');
    var adds = e.type === 'warlord' ? (e.phase === 2 ? ['bat', 'bat'] : ['mantis', 'rat']) : ['rat', 'rat'];
    adds.forEach(function (t, i) { spawnEnemy(t, i ? 'L' : 'R', i, 'add' + e.type + e.phase + i); });
    clearHaz(); if (G.P.state === 'grabbed') { G.P.state = 'free'; }
  }
  function clearHaz() { G.haz = []; }
  AI.boss = function (e, dt) {
    var P = G.P, dx = P.x - e.x, dy = P.y - e.y, dist = Math.abs(dx), bd = bounds();
    if (e.state !== 'roar' && e.state !== 'intro' && e.state !== 'dying') bossPhaseCheck(e);
    e.armor = 2;
    switch (e.state) {
      case 'intro': e.x = lerp(e.x, G.cam.x + 360, Math.min(1, dt * 1.5)); if (e.st >= 1.4) { banner('SNAPJAW', 2, 'warn'); setS(e, 'idle'); } break;
      case 'idle': {
        e.opening = false; faceP(e);
        moveTo(e, P.x - e.face * 56, P.y, e.def.speed, dt); e.cd -= dt;
        if (e.cd <= 0 && !P.dead) bossChoose(e, dist);
        break;
      }
      case 'tele': {
        var A = e.atk;
        if (A === 'tail') { if (e.st >= 0.85) { setS(e, 'active'); e.did = false; TB.sfx('swing'); } }
        else if (A === 'grab') { if (e.st < 0.3) faceP(e); if (e.st >= 0.55) { setS(e, 'active'); e.did = false; TB.sfx('swing'); } }
        else if (A === 'leap') {
          if (e.st < 0.5) { e.tx = P.x; e.ty = P.y; } e.mark = { x: e.tx, y: e.ty, r: 22 };
          if (e.st >= 0.8) { setS(e, 'active'); e.sx = e.x; e.sy = e.y; TB.sfx('roll'); }
        } else if (A === 'flood') {
          if (e.st < 0.25) { var sy = clamp(P.y, FT + 10, FB - 10); e.lanes = [sy, sy < 211 ? sy + 38 : sy - 38]; e.floodDir = P.x > G.cam.x + W / 2 ? -1 : 1; }
          e.lane = null; G.haz = e.lanes.map(function (ly) { return { kind: 'lane', y: ly, x0: G.cam.x, x1: G.cam.x + W, tel: true, dir: e.floodDir }; });
          if (e.st >= 1.1) { setS(e, 'active'); e.did = false; TB.sfx('boom'); G.haz.forEach(function (h) { h.tel = false; h.t = 0; h.hit = false; }); }
        }
        break;
      }
      case 'active': {
        var A2 = e.atk;
        if (A2 === 'tail') {
          if (!e.did && e.st > 0.04) { e.did = true; shake(3); TB.sfx('heavy'); ring(e.x, e.y, '#cfe8a0', 70, 0.25);
            if (Math.abs(P.x - e.x) < 72 && Math.abs(P.y - e.y) < 20 && P.z < 26) hurtPlayer(14, e.x, { knock: true }); }
          if (e.st >= 0.22) bossRecover(e, 1.3);
        } else if (A2 === 'grab') {
          e.x += e.face * 260 * dt;
          if (!e.did && Math.abs(P.x - e.x) < 42 && Math.abs(P.y - e.y) < 15 && P.z < 24 && P.inv <= 0 && !G.dev.god && !P.dead) {
            e.did = true; setS(e, 'holding'); P.state = 'grabbed'; P.mash = 0; P.st = 0; P.atk = null; TB.sfx('hurt'); banner('MASH attack to break free!', 1.2, 'warn');
          }
          if (e.st >= 0.2 && e.state === 'active') bossRecover(e, 1.0);
        } else if (A2 === 'leap') {
          var p = clamp(e.st / 0.6, 0, 1); e.x = lerp(e.sx, e.tx, p); e.y = lerp(e.sy, e.ty, p); e.z = 70 * 4 * p * (1 - p) * 0.9;
          if (p >= 1) { e.z = 0; e.mark = null; shake(6); TB.sfx('boom');
            G.proj.push({ kind: 'ring', x: e.x, y: e.y, r: 0, maxr: 160, dmg: 14, hit: false }); spark(e.x, e.y, 4, '#8a7a5a', 16, 150); bossRecover(e, 1.4); }
        } else if (A2 === 'flood') {
          var done = true;
          G.haz.forEach(function (h) {
            h.t += dt; var pp = clamp(h.t / 0.75, 0, 1), head = h.dir > 0 ? G.cam.x + pp * (W + 60) - 30 : G.cam.x + W - pp * (W + 60) + 30; h.head = head;
            if (!h.hit && Math.abs(P.x - head) < 34 && Math.abs(P.y - h.y) < 13 && P.z < 14) { h.hit = true; hurtPlayer(12, head - h.dir * 40, { knock: true }); }
            if (pp < 1) done = false;
          });
          if (done) { clearHaz(); bossRecover(e, 1.1); }
        }
        break;
      }
      case 'holding': {
        e.armor = 2; P.x = e.x + e.face * 28; P.y = e.y;
        if (P.mash >= 4) { P.state = 'free'; P.inv = 0.5; P.vx = e.face * 90; bossRecover(e, 1.0); banner('Broke free!', 1, 'good'); }
        else if (e.st >= 1.0) { P.state = 'free'; P.inv = 0; hurtPlayer(20, e.x, { knock: true }); shake(5); bossRecover(e, 1.2); }
        break;
      }
      case 'recover': e.opening = true; e.armor = 0; if (e.st >= e.recDur) { e.opening = false; e.cd = rnd(0.5, 1.0); setS(e, 'idle'); } break;
      case 'roar': e.opening = false; if (e.st >= 1.5) { e.cd = 0.5; setS(e, 'idle'); } break;
    }
    e.x = clamp(e.x, G.cam.x + 30, G.cam.x + W - 30);
  };

  /* ---------- Boss 2: Ironhorn the Rhino Warlord (reuses rhino states so the sprite reads the same) ---------- */
  AI.warlord = function (e, dt) {
    var P = G.P, dx = P.x - e.x, bd = bounds();
    if (e.state !== 'roar' && e.state !== 'intro') bossPhaseCheck(e);
    e.armor = 2;
    switch (e.state) {
      case 'intro': e.x = lerp(e.x, G.cam.x + 360, Math.min(1, dt * 1.5)); if (e.st >= 1.4) { banner('IRONHORN', 2, 'warn'); setS(e, 'idle'); } break;
      case 'idle':
        e.opening = false; faceP(e); moveTo(e, P.x - e.face * 60, P.y, e.def.speed, dt); e.cd -= dt;
        if (e.cd <= 0 && !P.dead) {
          var pool = Math.abs(dx) > 110 ? ['charge', 'charge', 'smash'] : ['smash', 'smash', 'charge'];
          if (e.phase >= 3) pool.push('quake', 'quake');
          pool = pool.filter(function (a) { return a !== e.lastAtk; }); if (!pool.length) pool = ['smash'];
          e.atk = pool[Math.floor(Math.random() * pool.length)]; e.lastAtk = e.atk; e.tele = 1; TB.sfx('warn');
          if (e.atk === 'charge') { setS(e, 'tele'); e.laneLocked = false; e.chargesLeft = e.phase >= 2 ? 1 : 0; } else setS(e, 'stele');
        }
        break;
      case 'tele':
        if (e.st < 0.55) { faceP(e); e.y += clamp(P.y - e.y, -100 * dt, 100 * dt); } else if (!e.laneLocked) { e.laneLocked = true; TB.sfx('warn'); }
        e.lane = { y: e.y, x0: e.x, x1: e.x + e.face * 420, locked: e.laneLocked };
        if (e.st >= 0.95) { setS(e, 'charge'); e.dist = 0; e.didHit = false; e.tele = 0; e.lane = null; }
        break;
      case 'charge': {
        var step = 300 * dt; e.x += e.face * step; e.dist += step;
        if (Math.random() < 0.5) spark(e.x - e.face * 14, e.y, 2, '#aab', 1, 40);
        if (!e.didHit && touchP(e, 26, 14)) { e.didHit = true; hurtPlayer(18, e.x, { knock: true }); }
        for (var i = G.props.length - 1; i >= 0; i--) { var p = G.props[i]; if (p.type !== 'valve' && Math.abs(p.x - e.x) < 24 && Math.abs(p.y - e.y) < 14) { p.hp = 1; hitProp(p); } }
        if (e.x <= bd.l || e.x >= bd.r) {
          e.x = clamp(e.x, bd.l, bd.r); shake(5); TB.sfx('boom'); spark(e.x, e.y, 30, '#8a96a2', 14, 140);
          if (e.chargesLeft > 0) { e.chargesLeft--; e.face = -e.face; setS(e, 'tele'); e.st = 0.35; e.laneLocked = false; e.tele = 1; e.didHit = false; }
          else { setS(e, 'stun'); e.stunDur = 1.7; banner('Ironhorn is stunned!', 1.2, 'good'); }
        } else if (e.dist > 440) { setS(e, 'stun'); e.stunDur = 1.2; }
        break;
      }
      case 'stun': e.armor = 0; e.opening = true; if (e.st >= e.stunDur) { e.opening = false; e.cd = rnd(0.7, 1.2); setS(e, 'idle'); } break;
      case 'stele': if (e.st < 0.3) faceP(e); if (e.st >= (e.atk === 'quake' ? 0.85 : 0.65)) { setS(e, 'swipe'); e.tele = 0; e.did = false; e.qN = 0; TB.sfx('swing'); } break;
      case 'swipe':
        if (e.atk === 'smash') {
          if (!e.did && e.st > 0.04) { e.did = true; shake(5); TB.sfx('boom'); G.proj.push({ kind: 'ring', x: e.x + e.face * 30, y: e.y, r: 0, maxr: 120, dmg: 13, hit: false }); spark(e.x + e.face * 30, e.y, 4, '#8a7a5a', 12, 140); if (Math.abs(P.x - e.x - e.face * 24) < 30 && Math.abs(P.y - e.y) < 16 && P.z < 24) hurtPlayer(15, e.x, { knock: true }); }
          if (e.st >= 0.3) bossRecover(e, 1.3);
        } else {
          if (e.qN < 3 && e.st >= 0.04 + e.qN * 0.5) { e.qN++; shake(4); TB.sfx('boom'); G.proj.push({ kind: 'ring', x: e.x, y: e.y, r: 0, maxr: 200, dmg: 13, hit: false, vr: 160 }); }
          if (e.qN >= 3 && e.st >= 1.7) bossRecover(e, 1.5);
        }
        break;
      case 'recover': e.opening = true; e.armor = 0; if (e.st >= e.recDur) { e.opening = false; e.cd = rnd(0.5, 1.0); setS(e, 'idle'); } break;
      case 'roar': e.opening = false; if (e.st >= 1.5) { e.cd = 0.5; setS(e, 'idle'); } break;
    }
    e.x = clamp(e.x, G.cam.x + 30, G.cam.x + W - 30);
  };

  function bossRecover(e, d) { setS(e, 'recover'); e.recDur = d; e.opening = true; e.mark = null; e.lane = null; e.z = 0; }
  function bossChoose(e, dist) {
    var pool = [];
    if (dist < 100) { pool.push('tail', 'tail', 'grab', 'grab'); }
    else { pool.push('grab'); if (e.phase >= 2) pool.push('leap', 'leap'); }
    if (e.phase >= 2 && dist < 100) pool.push('leap');
    if (e.phase >= 3) pool.push('flood', 'flood');
    pool = pool.filter(function (a) { return a !== e.lastAtk; }); if (!pool.length) pool = ['tail'];
    var a = pool[Math.floor(Math.random() * pool.length)]; e.atk = a; e.lastAtk = a;
    setS(e, 'tele'); e.tele = 1; e.attacking = false; TB.sfx('warn');
    if (a === 'leap') e.tx = G.P.x;
  }

  function spawnEnemy(type, side, idx, key) {
    var x = side === 'R' ? G.cam.x + W + 24 + idx * 26 : G.cam.x - 24 - idx * 26, y = rnd(FT + 8, FB - 4);
    var e = newEnemy(type, x, y, key); e.face = side === 'R' ? -1 : 1; G.ents.push(e); return e;
  }

  function updateEnemy(e, dt) {
    var P = G.P;
    e.flash = Math.max(0, e.flash - dt); e.inv = Math.max(0, e.inv - dt); e.freezeImm = Math.max(0, e.freezeImm - dt); e.stunImm = Math.max(0, e.stunImm - dt);
    e.st += dt;
    if (e.burn) {   // burning: damage over time
      e.burn.t -= dt; e.burn.acc += e.burn.dps * dt;
      if (Math.random() < dt * 14) G.fx.push({ k: 'p', x: e.x + rnd(-6, 6), y: e.y, z: e.h * rnd(0.2, 0.9) + e.z, vx: 0, vy: 0, vz: 30, life: 0.35, max: 0.35, col: Math.random() < 0.5 ? '#ff5a1f' : '#ffb347', sz: 2 });
      if (e.burn.acc >= 1) { var d = Math.floor(e.burn.acc); e.burn.acc -= d; hitEnemy(e, d, { src: 'dot' }); if (e.dead || e.state === 'dying') return; }
      if (e.burn.t <= 0) e.burn = null;
    }
    if (e.poison) {
      e.poison.t -= dt; e.poison.acc += e.poison.dps * dt;
      if (Math.random() < dt * 8) G.fx.push({ k: 'p', x: e.x + rnd(-6, 6), y: e.y, z: e.h * rnd(0.2, 0.9) + e.z, vx: 0, vy: 0, vz: 24, life: 0.4, max: 0.4, col: Math.random() < 0.5 ? '#7be34a' : '#d0ff8a', sz: 2 });
      if (e.poison.acc >= 1) { var pdm = Math.floor(e.poison.acc); e.poison.acc -= pdm; hitEnemy(e, pdm, { src: 'dot' }); if (e.dead || e.state === 'dying') return; }
      if (e.poison && e.poison.t <= 0) e.poison = null;
    }
    if (e.chillT > 0) { e.chillT -= dt; if (e.chillT <= 0) { e.chill = 0; e.slow = 1; } }
    if (e.state === 'dying') {
      e.vz -= 500 * dt; e.z = Math.max(0, e.z + e.vz * dt); e.x += e.vx * dt * (e.z > 0 ? 1 : 0.2); e.vx *= 0.96;
      if (e.st > (isBoss(e) ? 1.6 : 0.55)) { e.dead = true; }
      return;
    }
    if (e.frozen > 0) { e.frozen -= dt; if (e.frozen <= 0) { e.slow = 1; spark(e.x, e.y, e.h * 0.5, '#bdf0ff', 8, 80); } return; }
    var edt = dt * e.slow;
    if (e.state === 'hurt') {
      e.x += e.vx * dt; e.vx *= 0.9; if (e.type === 'bat') e.z = lerp(e.z, 0, Math.min(1, dt * 8));
      if (e.st >= e.hurtDur) { e.state = e.home; e.st = 0; if (e.type === 'bat') { e.state = 'rise'; } if (e.type === 'porcupine') e.state = 'reposition'; e.attacking = false; if (e.cd < 0.6) e.cd = 0.6; }
    } else if (e.state === 'down') {
      e.vz -= 520 * dt; e.z += e.vz * dt; e.x += e.vx * dt; e.vx *= 0.97;
      if (e.z <= 0 && e.vz < 0) { e.z = 0; e.vz = 0; e.state = 'lying'; e.st = 0; e.vx *= 0.3; }
    } else if (e.state === 'lying') { e.vx *= 0.85; e.x += e.vx * dt; if (e.st >= 0.65) { e.state = 'getup'; e.st = 0; e.inv = 0.4; } }
    else if (e.state === 'getup') { if (e.st >= 0.35) { e.state = e.type === 'bat' ? 'rise' : e.home; e.st = 0; if (e.type === 'rat') e.state = 'circle'; e.cd = Math.max(e.cd, 0.6); } }
    else AI[e.type](e, edt);
    if (!isBoss(e) && e.state !== 'charge') clampArena(e); else e.y = clamp(e.y, FT + 2, FB);
    // enemies can be nudged apart to avoid stacking
    if (e.type !== 'bat' && e.state !== 'charge') for (var i = 0; i < G.ents.length; i++) { var o = G.ents[i]; if (o === e || o.type === 'bat' || o.dead) continue; var ox = e.x - o.x, oy = e.y - o.y; if (Math.abs(ox) < e.hw + o.hw && Math.abs(oy) < 6) { e.x += (ox >= 0 ? 1 : -1) * 30 * dt; e.y += (oy >= 0 ? 1 : -1) * 20 * dt; } }
  }

  /* ============================== PROJECTILES / HAZARDS ============================== */
  function updateProj(dt) {
    var P = G.P;
    for (var i = G.proj.length - 1; i >= 0; i--) {
      var q = G.proj[i], kill = false;
      if (q.kind === 'quill') {
        q.x += q.vx * dt; q.life -= dt;
        if (Math.abs(P.x - q.x) < 9 && Math.abs(P.y - q.y) < 9 && P.z < 26 && !P.dead) { if (hurtPlayer(q.dmg, q.x - Math.sign(q.vx) * 10, {})) kill = true; }
        if (q.life <= 0 || q.x < G.cam.x - 20 || q.x > G.cam.x + W + 20) kill = true;
      } else if (q.kind === 'can') {
        q.x += q.vx * dt; q.vz -= 300 * dt; q.z = Math.max(4, q.z + q.vz * dt); q.life -= dt;
        for (var j = 0; j < G.ents.length; j++) { var e = G.ents[j]; if (targetable(e) && !q.hit.has(e) && Math.abs(e.x - q.x) < e.hw + 8 && Math.abs(e.y - q.y) < 15 && Math.abs(e.z - q.z + 16) < 40) { q.hit.add(e); hitEnemy(e, q.dmg * stats().energyDmg, { kb: 160, dir: Math.sign(q.vx), launch: true, src: 'thrown', hs: 0.08, heavy: true }); kill = true; break; } }
        if (q.life <= 0) kill = true;
        if (kill) { spark(q.x, q.y, 10, '#aab0b8', 10, 110); TB.sfx('break_'); }
      } else if (q.kind === 'wave') {
        q.x += q.vx * dt; q.life -= dt;
        for (var k = 0; k < G.ents.length; k++) { var t = G.ents[k]; if (targetable(t) && !q.hit.has(t) && Math.abs(t.x - q.x) < t.hw + 10 && Math.abs(t.y - q.y) < 20) { q.hit.add(t); hitEnemy(t, q.dmg, { kb: 60, dir: Math.sign(q.vx), src: 'wave', hs: 0.03 }); } }
        if (Math.random() < 0.6) G.fx.push({ k: 'p', x: q.x, y: q.y + rnd(-8, 8), z: q.z + rnd(-6, 6), vx: 0, vy: 0, vz: 0, life: 0.25, max: 0.25, col: q.col[Math.random() < 0.5 ? 0 : 1], sz: 2 });
        if (q.life <= 0) kill = true;
      } else if (q.kind === 'ring') {
        q.r += (q.vr || 190) * dt;
        var ex = (P.x - q.x) / q.r, ey = (P.y - q.y) / (q.r * 0.5), dd = Math.hypot(ex, ey);
        if (!q.hit && q.r > 8 && Math.abs(dd - 1) < 0.12 && P.z < 10 && !P.dead) { if (hurtPlayer(q.dmg, q.x, { knock: true })) q.hit = true; }
        if (q.r >= q.maxr) kill = true;
      }
      if (kill) G.proj.splice(i, 1);
    }
  }

  /* ============================== FLOW: encounters, checkpoints ============================== */
  function startArena(enc) {
    G.arena = { enc: enc, wave: -1, spawnT: 0.4, clearedAll: false, idx: 0, keys: 0 };
    TB.sfx('warn');
    if (enc.hint && TB.ui) TB.ui.hint(enc.hint);
    if (enc.boss) { var b = newEnemy(enc.boss, G.cam.x + W + 60, 214, enc.boss); b.face = -1; G.ents.push(b); G.arena.boss = b; G.arena.clearedAll = false; G.arena.wave = 0; G.arena.spawnT = 99; }
  }
  function spawnWave(a) {
    var wv = a.enc.waves[a.wave], cnt = { R: 0, L: 0 };
    wv.forEach(function (s, i) { spawnEnemy(s[0], s[1], cnt[s[1]]++, a.enc.id + ':' + a.wave + ':' + i); });
  }
  function aliveCount() { var n = 0; for (var i = 0; i < G.ents.length; i++) { var e = G.ents[i]; if (!e.dead && e.state !== 'dying') n++; } return n; }

  function updateFlow(dt) {
    var a = G.arena, P = G.P, enc;
    if (!a) {
      enc = STAGE.encounters[G.encIdx];
      if (enc && G.cam.x >= enc.x - 0.5 && !P.dead) startArena(enc);
      return;
    }
    enc = a.enc;
    if (enc.boss) {
      if (a.boss.dead && !G.victory) { G.victory = true; G.S.cleared[G.stageIdx] = true; G.S.checkpoints[G.stageIdx] = 0; saveGame(); var lastStage = G.stageIdx >= TB.STAGES.length - 1; setTimeout(function () { if (G.state === 'play') { G.state = 'victory'; if (TB.ui) TB.ui.victory(lastStage); } }, 900); }
      return;
    }
    if (a.wave < enc.waves.length && (a.wave < 0 || aliveCount() === 0)) {
      a.spawnT -= dt;
      if (a.spawnT <= 0) { a.wave++; if (a.wave < enc.waves.length) { spawnWave(a); a.spawnT = 0.8; } }
    }
    if (a.wave >= enc.waves.length && aliveCount() === 0 && !a.done) {
      a.done = true;
      if (claim('clear:' + enc.id)) awardXP(TB.CLEAR_BONUS_XP, P.x, P.y);
      if (enc.valve && !(G.S.claimed['valve:' + enc.id])) { G.flow.needValve = true; var v = { type: 'valve', x: G.cam.x + 240, y: 205, hp: 99, shake: 0, z: 0, done: false, turn: 0 }; G.props.push(v); G.flow.valve = v; banner('Area clear — ' + enc.valve, 3.5, 'good'); return; }
      finishEncounter();
    }
    if (G.flow.needValve && G.flow.valve) {
      var vv = G.flow.valve;
      if (vv.turning > 0) { vv.turning -= dt; vv.turn += dt * 6; if (vv.turning <= 0) { vv.done = true; G.flow.needValve = false; if (claim('valve:' + G.arena.enc.id)) awardXP(TB.VALVE_XP, vv.x, vv.y); TB.sfx('boom'); shake(3); finishEncounter(); } }
    }
  }
  function finishEncounter() {
    var enc = G.arena.enc; G.arena = null; G.encIdx++;
    setCamMax(); G.goArrow = 4;
    if (enc.cp) {
      G.S.checkpoints[G.stageIdx] = G.encIdx; P_().hp = Math.min(stats().maxhp, P_().hp + 25); P_().en = TB.ENERGY_MAX; saveGame();
      banner('CHECKPOINT — press TAB to change energy & upgrade', 4, 'good'); TB.sfx('level');
    } else banner('GO!', 1.6);
  }

  /* ============================== MAIN UPDATE ============================== */
  function step(dt) {
    G.time += dt;
    if (G.slowmo > 0) { G.slowmo -= dt; dt *= 0.35; }
    if (G.hitstop > 0) { G.hitstop -= dt; return; }
    G.S.playSec += dt; G.sessionSec += dt;
    if (G.combo.t > 0) { G.combo.t -= dt; if (G.combo.t <= 0) G.combo.n = 0; }
    var P = G.P, i;
    G.goArrow = Math.max(0, G.goArrow - dt);
    // camera follows player; cannot go backwards; stops at next arena
    var target = P.x - 210;
    if (target > G.cam.x) G.cam.x = Math.min(G.cam.max, target);
    G.cam.x = clamp(G.cam.x, 0, Math.max(0, STAGE.length - W));
    updateFlow(dt);
    // props
    for (i = G.props.length - 1; i >= 0; i--) { var p = G.props[i]; if (p.shake > 0) p.shake -= dt; }
    updatePlayer(dt);
    for (i = 0; i < G.ents.length; i++) updateEnemy(G.ents[i], dt);
    for (i = G.ents.length - 1; i >= 0; i--) if (G.ents[i].dead) G.ents.splice(i, 1);
    updateProj(dt);
    for (i = G.puddles.length - 1; i >= 0; i--) {
      var pu = G.puddles[i]; pu.life -= dt; pu.tick -= dt;
      if (pu.tick <= 0) {
        pu.tick = 0.5;
        G.ents.forEach(function (t) { if (targetable(t) && t.z < 20 && Math.pow((t.x - pu.x) / pu.r, 2) + Math.pow((t.y - pu.y) / (pu.r * 0.5), 2) <= 1) { hitEnemy(t, pu.dps * 0.5, { src: 'dot' }); if (t.state !== 'dying') { if (t.poison) t.poison.t = Math.max(t.poison.t, 1.5); else applyPoison(t, 0.5); } } });
      }
      if (pu.life <= 0) G.puddles.splice(i, 1);
    }
    // fx
    for (i = G.fx.length - 1; i >= 0; i--) {
      var f = G.fx[i]; f.life -= dt;
      if (f.k === 'p') { f.x += f.vx * dt; f.y += f.vy * dt; f.z += f.vz * dt; f.vz -= 240 * dt; if (f.z < 0) { f.z = 0; f.vz *= -0.3; } }
      else if (f.k === 'ring') f.r += (f.maxr - f.r) * Math.min(1, dt * 10);
      if (f.life <= 0) G.fx.splice(i, 1);
    }
    for (i = G.trail.length - 1; i >= 0; i--) { G.trail[i].life -= dt; if (G.trail[i].life <= 0) G.trail.splice(i, 1); }
    for (i = G.texts.length - 1; i >= 0; i--) { var tx = G.texts[i]; tx.life -= dt; tx.y -= 14 * dt; if (tx.life <= 0) G.texts.splice(i, 1); }
    G.cam.shake = Math.max(0, G.cam.shake - dt * 14);
  }

  /* ============================== RENDER ============================== */
  var cv, ctx, tc, tcx;
  var DIG = { '0': '111101101101111', '1': '010110010010111', '2': '111001111100111', '3': '111001111001111', '4': '101101111001001', '5': '111100111001111', '6': '111100111101111', '7': '111001001001001', '8': '111101111101111', '9': '111101111001111', '+': '000010111010000' };
  function drawNum(c, str, x, y, col, big) {
    var s = big ? 2 : 1, cx = Math.round(x - str.length * 2 * s), i, j, k;
    for (var pass = 0; pass < 2; pass++) {
      for (i = 0; i < str.length; i++) {
        var g = DIG[str[i]]; if (!g) continue;
        for (j = 0; j < 15; j++) if (g[j] === '1') {
          var gx = cx + i * 4 * s + (j % 3) * s, gy = Math.round(y) + Math.floor(j / 3) * s;
          if (pass === 0) { c.fillStyle = '#000'; c.fillRect(gx - 1, gy, s + 2, s); c.fillRect(gx, gy - 1, s, s + 2); } else { c.fillStyle = col; c.fillRect(gx, gy, s, s); }
        }
      }
    }
  }
  function drawTinted(fn, x, y, col, alpha) {
    tcx.clearRect(0, 0, 200, 150); fn(tcx, 100, 120);
    tcx.globalCompositeOperation = 'source-atop'; tcx.globalAlpha = alpha; tcx.fillStyle = col; tcx.fillRect(0, 0, 200, 150);
    tcx.globalAlpha = 1; tcx.globalCompositeOperation = 'source-over';
    ctx.drawImage(tc, Math.round(x) - 100, Math.round(y) - 120);
  }

  function playerPose() {
    var P = G.P;
    switch (P.state) {
      case 'roll': return 'roll';
      case 'hurt': return 'hurt';
      case 'down': case 'lying': return 'down';
      case 'dead': return P.z > 0 ? 'hurt' : 'dead';
      case 'air': case 'airatk': return 'air';
      case 'special': return 'spin';
      case 'grabbed': return 'hurt';
      default: return P.moving ? 'walk' : 'idle';
    }
  }
  function turtleDrawSpec(sx, sy) {
    var P = G.P, S = G.S, T = TB.TURTLES[G.turtle], a = armPose();
    return { x: sx, y: sy, face: P.face, pose: playerPose(), t: P.walkT > 0 && P.moving ? P.walkT : P.t, weapon: T.weapon, tier: S.tier, energy: S.energy, mask: T.mask, maskDark: T.maskDark, rAng: a.rAng, lAng: a.lAng, carry: P.carry };
  }

  function drawTrails(c) {
    var S = G.S, tier = S.tier, col = TB.glow(S.energy), i;
    if (G.trail.length < 2) return;
    for (i = 1; i < G.trail.length; i++) {
      var a = G.trail[i - 1], b = G.trail[i]; if (Math.abs(a.x - b.x) > 40 || Math.abs(a.y - b.y) > 40) continue;
      var k = clamp(b.life / b.max, 0, 1), ax = a.x - G.cam.x, bx = b.x - G.cam.x;
      var w = tier >= 5 ? 3 : tier >= 3 ? 2 : 1;
      c.globalAlpha = k * (tier >= 3 ? 0.85 : 0.5);
      TB.pline(c, ax, a.y, Math.atan2(b.y - a.y, bx - ax), Math.hypot(bx - ax, b.y - a.y), w, tier >= 3 || S.energy !== 'none' ? col[0] : '#ffffff');
      if (tier >= 3) { c.globalAlpha = k * 0.6; TB.pline(c, ax, a.y, Math.atan2(b.y - a.y, bx - ax), Math.hypot(bx - ax, b.y - a.y), 1, col[1]); }
      if (tier >= 5 && Math.random() < 0.15) G.fx.push({ k: 'p', x: b.x, y: G.P.y, z: G.P.z + (G.P.y - b.y) * -1 + 0, vx: rnd(-20, 20), vy: 0, vz: 30, life: 0.3, max: 0.3, col: col[2], sz: 1, wy: b.y });
    }
    c.globalAlpha = 1;
  }

  function drawWorldTelegraphs(c) {
    var cx = G.cam.x, i, e;
    for (i = 0; i < G.ents.length; i++) {
      e = G.ents[i];
      if (e.lane) {   // rhino charge lane
        var x0 = Math.min(e.lane.x0, e.lane.x1) - cx, x1 = Math.max(e.lane.x0, e.lane.x1) - cx, on = Math.floor(G.time * (e.lane.locked ? 16 : 8)) % 2;
        c.fillStyle = 'rgba(255,50,40,' + (e.lane.locked ? (on ? 0.5 : 0.28) : 0.18) + ')'; c.fillRect(Math.round(x0), Math.round(e.lane.y - 12), Math.round(x1 - x0), 24);
        c.fillStyle = 'rgba(255,220,200,0.7)'; c.fillRect(Math.round(x0), Math.round(e.lane.y - 12), Math.round(x1 - x0), 1); c.fillRect(Math.round(x0), Math.round(e.lane.y + 11), Math.round(x1 - x0), 1);
      }
      if (e.mark) {
        var mx = e.mark.x - cx, my = e.mark.y, r = e.mark.r, on2 = Math.floor(G.time * 14) % 2;
        c.fillStyle = on2 ? 'rgba(255,60,50,0.55)' : 'rgba(255,60,50,0.3)';
        c.fillRect(Math.round(mx - r), Math.round(my - 2), r * 2, 4); c.fillRect(Math.round(mx - r * 0.7), Math.round(my - 4), r * 1.4, 8); c.fillRect(Math.round(mx - r * 0.4), Math.round(my - 5), r * 0.8, 10);
      }
      if (e.type === 'porcupine' && e.state === 'tele') {
        c.fillStyle = 'rgba(255,90,60,' + (Math.floor(G.time * 12) % 2 ? 0.45 : 0.2) + ')';
        var ax = e.face > 0 ? e.x - cx + 18 : 0, aw = e.face > 0 ? W - (e.x - cx + 18) : e.x - cx - 18;
        for (var q = -1; q <= 1; q++) c.fillRect(Math.round(ax), Math.round(e.y + q * 13 - 1), Math.round(Math.max(0, aw)), 2);
      }
      if (e.type === 'porcupine' && e.state === 'burstT') { c.strokeStyle = 'rgba(255,90,60,0.6)'; c.strokeRect(Math.round(e.x - cx - 52), Math.round(e.y - 14), 104, 28); }
      if (isBoss(e) && e.state === 'tele' && e.atk === 'tail') { c.strokeStyle = 'rgba(255,90,60,' + (Math.floor(G.time * 12) % 2 ? 0.7 : 0.3) + ')'; c.strokeRect(Math.round(e.x - cx - 72), Math.round(e.y - 18), 144, 36); }
    }
    G.haz.forEach(function (h) {
      if (h.tel) { c.fillStyle = 'rgba(80,190,255,' + (Math.floor(G.time * 10) % 2 ? 0.4 : 0.18) + ')'; c.fillRect(0, Math.round(h.y - 12), W, 24); c.fillStyle = 'rgba(200,240,255,0.7)'; c.fillRect(0, Math.round(h.y - 12), W, 1); c.fillRect(0, Math.round(h.y + 11), W, 1); }
      else if (h.head !== undefined) {
        var hx = h.head - cx, gr = c.createLinearGradient(hx - 60 * h.dir, 0, hx, 0); c.fillStyle = 'rgba(90,200,255,0.65)';
        c.fillRect(Math.round(Math.min(hx, hx - 70 * h.dir)), Math.round(h.y - 12), 70, 24); c.fillStyle = 'rgba(230,250,255,0.9)'; c.fillRect(Math.round(hx - (h.dir > 0 ? 6 : 0)), Math.round(h.y - 14), 6, 28);
      }
    });
    G.puddles.forEach(function (pu) {
      var a = Math.min(1, pu.life / 1.0), px = pu.x - cx;
      c.fillStyle = 'rgba(110,210,50,' + (0.3 * a) + ')'; c.beginPath(); c.ellipse(Math.round(px), Math.round(pu.y), pu.r, pu.r * 0.5, 0, 0, 6.29); c.fill();
      c.strokeStyle = 'rgba(200,255,120,' + (0.7 * a) + ')'; c.beginPath(); c.ellipse(Math.round(px), Math.round(pu.y), pu.r, pu.r * 0.5, 0, 0, 6.29); c.stroke();
      for (var b = 0; b < 3; b++) { var bt = (G.time * 1.5 + b * 0.33) % 1; TB.R(c, px + Math.cos(b * 2.1) * pu.r * 0.5, pu.y - bt * 8, 2, 2, 'rgba(220,255,160,' + (1 - bt) * a + ')'); }
    });
    G.proj.forEach(function (q) {
      if (q.kind === 'ring') { c.strokeStyle = 'rgba(255,220,120,0.9)'; c.lineWidth = 2; c.beginPath(); c.ellipse(Math.round(q.x - cx), Math.round(q.y), q.r, q.r * 0.5, 0, 0, 6.29); c.stroke(); c.lineWidth = 1; }
    });
  }

  function drawExclaim(c, x, y) {
    var on = Math.floor(G.time * 16) % 2;
    TB.R(c, x - 3, y - 2, 6, 12, '#000'); TB.R(c, x - 2, y - 1, 4, 7, on ? '#ff3a3a' : '#ffe94a'); TB.R(c, x - 2, y + 7, 4, 3, on ? '#ff3a3a' : '#ffe94a');
  }

  function render() {
    var c = ctx, cx = G.cam.x, ox = 0, oy = 0, i;
    if (G.cam.shake > 0.05) { ox = Math.round((Math.random() - 0.5) * G.cam.shake); oy = Math.round((Math.random() - 0.5) * G.cam.shake); }
    c.save(); c.translate(ox, oy);
    TB.drawBackground(c, cx, G.time);
    drawWorldTelegraphs(c);
    // gather drawables
    var list = [], P = G.P;
    G.props.forEach(function (p) { list.push({ y: p.y, k: 'prop', o: p }); });
    G.items.forEach(function (it) { list.push({ y: it.y - 0.5, k: 'item', o: it }); });
    G.ents.forEach(function (e) { list.push({ y: e.y, k: 'ent', o: e }); });
    if (P) list.push({ y: P.y, k: 'player', o: P });
    G.proj.forEach(function (q) { if (q.kind !== 'ring') list.push({ y: q.y, k: 'proj', o: q }); });
    list.sort(function (a, b) { return a.y - b.y; });
    // shadows first
    list.forEach(function (d) {
      var o = d.o;
      if (d.k === 'ent') TB.drawShadow(c, o.x - cx, o.y, Math.max(6, o.hw + 2 - Math.min(6, o.z / 10)), o.state === 'dying' ? 0.2 : 0.35);
      else if (d.k === 'player') TB.drawShadow(c, o.x - cx, o.y, 10 - Math.min(4, o.z / 10), 0.35);
      else if (d.k === 'prop') TB.drawShadow(c, o.x - cx, o.y, o.type === 'secret' ? 15 : 9, 0.3);
      else if (d.k === 'proj' && o.kind === 'can') TB.drawShadow(c, o.x - cx, o.y, 6, 0.3);
    });
    list.forEach(function (d) {
      var o = d.o, sx = o.x - cx, sy;
      if (d.k === 'prop') TB.drawProp(c, o, sx, o.y, G.time);
      else if (d.k === 'item') TB.drawItem(c, o, sx, o.y, G.time);
      else if (d.k === 'proj') {
        if (o.kind === 'quill') { TB.R(c, sx - 6, o.y - o.z, 12, 1, '#e8d8b0'); TB.R(c, o.vx > 0 ? sx + 5 : sx - 7, o.y - o.z - 1, 2, 3, '#ff5a3a'); }
        else if (o.kind === 'can') { TB.R(c, sx - 6, o.y - o.z - 10, 12, 14, '#8a9099'); TB.R(c, sx - 7, o.y - o.z - 11, 14, 2, '#aab0b8'); }
        else if (o.kind === 'wave') { var wc = o.col; TB.R(c, sx - 3, o.y - o.z - 8, 6, 16, wc[0]); TB.R(c, sx - 1, o.y - o.z - 6, 3, 12, wc[1]); TB.R(c, sx + (o.vx > 0 ? 3 : -6), o.y - o.z - 4, 3, 8, wc[2]); }
      } else if (d.k === 'ent') {
        sy = o.y - o.z;
        var fn = function (cc, x, y) { TB.drawEnemy(cc, o, x, y); };
        if (o.state === 'dying') { c.globalAlpha = clamp(1 - o.st / (isBoss(o) ? 1.6 : 0.55), 0, 1); }
        if (o.frozen > 0) { drawTinted(fn, sx, sy, '#8fe0ff', 0.6); TB.R(c, sx - o.hw - 2, sy - o.h - 2, o.hw * 2 + 4, 2, '#e8fbff'); }
        else if (o.flash > 0) drawTinted(fn, sx, sy, '#ffffff', 0.85);
        else if (o.tele > 0 && Math.floor(G.time * 16) % 2 && o.type !== 'rat') drawTinted(fn, sx, sy, '#ffffff', 0.35);
        else if (o.burn && Math.floor(G.time * 12) % 2) drawTinted(fn, sx, sy, '#ff7a2a', 0.3);
        else if (o.poison && Math.floor(G.time * 8) % 2) drawTinted(fn, sx, sy, '#7be34a', 0.3);
        else if (o.chillT > 0 && o.slow < 1) drawTinted(fn, sx, sy, '#4fd5ff', 0.22);
        else fn(c, sx, sy);
        c.globalAlpha = 1;
        if (o.tele > 0 && o.state !== 'dying') drawExclaim(c, Math.round(sx), Math.round(sy - o.h - 14));
        if (o.state === 'stun' || (o.opening && !isBoss(o) && Math.floor(G.time * 6) % 2 === 0 && false)) { /* stars drawn in sprite */ }
        if (o.hp < o.maxhp && !isBoss(o) && o.state !== 'dying') { var bw = Math.max(14, o.hw * 2); TB.R(c, sx - bw / 2, sy - o.h - 8 - (o.tele > 0 ? 0 : 0), bw, 3, '#000'); TB.R(c, sx - bw / 2 + 1, sy - o.h - 7, Math.max(0, (bw - 2) * o.hp / o.maxhp), 1, o.frozen > 0 ? '#8fe0ff' : '#ff5a4a'); }
      } else if (d.k === 'player') {
        sy = o.y - o.z;
        var spec = turtleDrawSpec(sx, sy);
        var pf = function (cc, x, y) { spec.x = x; spec.y = y; TB.drawTurtle(cc, spec); };
        if (o.inv > 0 && o.state !== 'roll' && !o.dead && Math.floor(G.time * 20) % 2) c.globalAlpha = 0.5;
        if (o.flash > 0) drawTinted(pf, sx, sy, '#ffffff', 0.8);
        else { spec.x = sx; spec.y = sy; TB.drawTurtle(c, spec); }
        c.globalAlpha = 1;
      }
    });
    drawTrails(c);
    // fx
    G.fx.forEach(function (f) {
      var a = clamp(f.life / f.max, 0, 1);
      if (f.k === 'p') { c.globalAlpha = Math.min(1, a * 1.6); var py = f.wy !== undefined ? f.wy : f.y - f.z; TB.R(c, f.x - cx, py, f.sz, f.sz, f.col); c.globalAlpha = 1; }
      else if (f.k === 'ring') { c.strokeStyle = f.col; c.globalAlpha = a; c.lineWidth = 2; c.beginPath(); c.ellipse(Math.round(f.x - cx), Math.round(f.y - f.z), f.r, f.r * 0.5, 0, 0, 6.29); c.stroke(); c.globalAlpha = 1; c.lineWidth = 1; }
      else if (f.k === 'bolt') {
        var x0 = f.x0 - cx, y0 = f.y0, x1 = f.x1 - cx, y1 = f.y1, n = 6, px = x0, py2 = y0;
        for (var i2 = 1; i2 <= n; i2++) {
          var tx = lerp(x0, x1, i2 / n) + (i2 < n ? (TB.hash(f.seed + i2) - 0.5) * 12 : 0), ty = lerp(y0, y1, i2 / n) + (i2 < n ? (TB.hash(f.seed + i2 * 3) - 0.5) * 12 : 0);
          TB.pline(c, px, py2, Math.atan2(ty - py2, tx - px), Math.hypot(tx - px, ty - py2), 2, f.col); TB.pline(c, px, py2, Math.atan2(ty - py2, tx - px), Math.hypot(tx - px, ty - py2), 1, '#fff'); px = tx; py2 = ty;
        }
      }
    });
    G.texts.forEach(function (t) { drawNum(c, t.str, t.x - cx, t.y - 24 - (1 - Math.min(1, t.life)) * 0, t.col, t.big); });
    c.restore();
    // vignette / low-hp
    if (P && P.hp < stats().maxhp * 0.25 && !P.dead && Math.floor(G.time * 3) % 2) { c.fillStyle = 'rgba(255,0,0,0.08)'; c.fillRect(0, 0, W, H); }
    if (G.state === 'play' && G.goArrow > 0 && !G.arena && Math.floor(G.time * 3) % 2) { TB.R(c, W - 40, 70, 24, 6, '#ffe94a'); for (var g = 0; g < 8; g++) TB.R(c, W - 16 + g, 62 + g, 1, 22 - g * 2, '#ffe94a'); TB.R(c, W - 44, 68, 30, 10, 'rgba(0,0,0,0)'); }
  }

  /* ============================== LOOP / API ============================== */
  var last = 0, acc = 0;
  function frame(ts) {
    var dt = Math.min(0.1, (ts - last) / 1000); last = ts; acc += dt;
    var guard = 0;
    while (acc >= 1 / 60 && guard++ < 6) {
      acc -= 1 / 60;
      if (G.state === 'play') step(1 / 60);
      else if (G.state === 'dead' || G.state === 'victory') { G.time += 1 / 60; for (var i = 0; i < G.fx.length; i++) G.fx[i].life -= 1 / 60; }
      else G.time += 1 / 60;
    }
    if (G.state === 'title') drawTitleBg(); else if (G.P) render();
    if (TB.ui) TB.ui.hud();
    requestAnimationFrame(frame);
  }
  function drawTitleBg() {
    ctx.clearRect(0, 0, W, H); TB.drawBackground(ctx, (G.time * 20) % 2800, G.time);
  }

  TB.Game.init = function (canvas) {
    cv = canvas; ctx = cv.getContext('2d'); ctx.imageSmoothingEnabled = false;
    tc = document.createElement('canvas'); tc.width = 200; tc.height = 150; tcx = tc.getContext('2d');
    TB.buildBackgrounds();
    G.S = loadSave() || defaultSave();
    requestAnimationFrame(function (t) { last = t; frame(t); });
  };
  TB.Game.newGame = function (turtle) {
    TB.wipeSave(); G.dev = { on: false, god: false }; G.S = defaultSave(); G.S.started = true; G.S.turtle = turtle || 'leo'; G.retries = 0;
    beginStage(0); G.state = 'play'; saveGame();
  };
  TB.Game.continueGame = function () {
    var s = loadSave(); if (!s) return TB.Game.newGame();
    G.dev = { on: false, god: false }; G.S = s; G.S.started = true;
    beginStage(G.S.checkpoints[G.S.stage] || 0); G.state = 'play';
  };
  TB.Game.unlockedStages = function () { var S = G.S || loadSave() || defaultSave(), n = 1; while (n < TB.STAGES.length && S.cleared[n - 1]) n++; return n; };
  TB.Game.startStage = function (i) {
    var s = G.dev.on ? G.S : (loadSave() || G.S); if (!G.dev.on) { G.S = s; G.dev = { on: false, god: false }; }
    G.S.started = true; G.S.stage = i; beginStage(G.S.checkpoints[i] || 0); G.state = 'play'; saveGame();
  };
  TB.Game.nextStage = function () {
    var i = Math.min(G.stageIdx + 1, TB.STAGES.length - 1); G.S.stage = i; G.S.checkpoints[i] = 0; beginStage(0); G.state = 'play'; saveGame();
  };
  TB.Game.devStart = function (o) {
    var base = loadSave() || defaultSave();
    G.dev = { on: true, god: !!o.god };
    G.S = JSON.parse(JSON.stringify(base)); G.S.level = o.level; G.S.turtle = o.turtle || 'leo'; G.S.tier = o.tier; G.S.energy = o.energy || 'none'; G.S.scrap = 999; G.S.claimed = {};
    TB.TURTLE_ORDER.forEach(function (k) { G.S.tiers[k] = o.tier; G.S.energies[k] = 'none'; }); G.S.energies[G.S.turtle] = G.S.energy;
    TB.ENERGY_ORDER.forEach(function (k) { if (TB.ENERGIES[k].implemented) G.S.unlocked[k] = true; });
    G.S.xp = TB.LEVEL_XP[o.level]; G.S.levelLog = []; G.S.playSec = 0; G.S.stage = o.stage || 0; G.S.kills = 0; G.S.secrets = 0;
    beginStage(o.enc || 0); G.state = 'play';
  };
  TB.Game.retry = function () {
    G.retries++; G.state = 'play'; var idx = G.dev.on ? G.encIdx : (G.S.checkpoints[G.stageIdx] || 0);
    if (idx < 0 || idx >= STAGE.encounters.length) idx = 0;
    beginStage(idx, { retry: true });
  };
  TB.Game.setState = function (s) { G.state = s; clearInput(); };
  TB.Game.stats = stats;
  TB.Game.xpInfo = function () {
    var S = G.S, l = S.level, lo = TB.LEVEL_XP[l], hi = TB.LEVEL_XP[l + 1];
    return { level: l, xp: S.xp, lo: lo, hi: hi === undefined ? lo : hi, max: l >= TB.MAX_LEVEL };
  };
  TB.Game.encounterName = function () { var e = STAGE.encounters[G.encIdx]; return e ? e.id : 'done'; };
  TB.Game.safeToMenu = function () { return G.state === 'play' && (!G.arena || aliveCount() === 0); };
  TB.Game.previewPose = function () { return armPose(); };
})(window.TB);
