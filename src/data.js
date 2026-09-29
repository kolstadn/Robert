/* Turtle Brawl — data layer.
 * Everything tunable lives here: turtles, weapon tiers, energies, level curve, enemies, stage.
 * Adding a turtle / energy / enemy / stage should only need new entries here plus a draw routine.
 */
window.TB = window.TB || {};
(function (TB) {
  'use strict';
  TB.W = 480; TB.H = 270;
  TB.FLOOR_TOP = 172; TB.FLOOR_BOT = 250;

  /* ---------------- Turtles (weapon type is permanent per turtle) ---------------- */
  TB.TURTLES = {
    leo:   { name: 'Leonardo',     weapon: 'katana',   weaponName: 'Twin Katanas', implemented: true, style: 'Balanced speed, reach and damage', mask: '#2d63e0', maskDark: '#1f46a8', hp: 100, speed: 78, dmg: 1.0,  roll: 1.0 },
    raph:  { name: 'Raphael',      weapon: 'sai',      weaponName: 'Twin Sai',     implemented: true, style: 'Powerful close-range attacks, aggressive combos', mask: '#d8352a', maskDark: '#9c2019', hp: 115, speed: 80, dmg: 1.1,  roll: 1.0 },
    don:   { name: 'Donatello',    weapon: 'bo',       weaponName: 'Bo Staff',     implemented: true, style: 'Long reach, wide sweeps, strong crowd control', mask: '#8a4fd0', maskDark: '#5e2f96', hp: 100, speed: 70, dmg: 0.95, roll: 0.9 },
    mike:  { name: 'Michelangelo', weapon: 'nunchaku', weaponName: 'Nunchaku',     implemented: true, style: 'Fast attacks, mobility, long flowing combos', mask: '#f08a1c', maskDark: '#b5620e', hp: 95,  speed: 90, dmg: 0.9,  roll: 1.25 }
  };
  TB.TURTLE_ORDER = ['leo', 'raph', 'don', 'mike'];

  /* ---------------- Weapon tiers (5 visual stages, shared by every weapon type) ---------------- */
  TB.TIER_NAMES = ['', 'Basic', 'Reinforced', 'Energized', 'Advanced', 'Master'];
  TB.TIER_UNLOCK_LEVEL = [0, 1, 2, 3, 5, 7];       // character level required to buy the tier
  TB.TIER_COST = [0, 0, 60, 120, 220, 380];         // scrap (paid per turtle: each weapon is upgraded separately)
  TB.TIER_DMG = [0, 1.0, 1.12, 1.25, 1.40, 1.60];
  TB.TIER_REACH = [0, 1.0, 1.05, 1.10, 1.14, 1.20];
  TB.TIER_POTENCY = [0, 1.0, 1.0, 1.15, 1.3, 1.5]; // energy effect strength
  TB.TIER_STATS = {
    1: 'Baseline damage and reach.',
    2: '+12% damage, +5% reach.',
    3: '+25% damage, +10% reach, +15% energy potency. Energy trail on every swing.',
    4: '+40% damage, +14% reach, +30% potency. Lightning chains further, ice freezes sooner.',
    5: '+60% damage, +20% reach, +50% potency. Finishers release an energy wave.'
  };
  TB.TIER_LOOK = {
    katana: {
      1: 'Plain steel blades with leather-wrapped grips.',
      2: 'Steel guards, blue bindings, capped pommels, thicker blade base.',
      3: 'Glowing energy groove along each blade.',
      4: 'Gold-inlaid guards, longer tempered blades with a wavy hamon.',
      5: 'Ornate winged guards, rune-etched blades, an energy flame along the spine.' },
    sai: {
      1: 'Plain steel sai with dark-wrapped grips.',
      2: 'Thicker steel prongs, brass guard ring, red bindings.',
      3: 'Energy glowing in the blade and prong tips.',
      4: 'Gold crossguard, longer curved prongs, a ridged blade.',
      5: 'Barbed winged prongs, rune-etched blade, energy flame along the prongs.' },
    bo: {
      1: 'Plain hardwood staff.',
      2: 'Metal end caps and bindings around the grip.',
      3: 'Glowing energy inlay along the shaft and caps.',
      4: 'Gold rings, wrapped grip, spiked ferrule caps, double inlay.',
      5: 'Flared reinforced ends, rune-etched shaft, energy flame at both tips.' },
    nunchaku: {
      1: 'Wooden handles on a plain cord chain.',
      2: 'Metal end caps, steel chain, coloured bands.',
      3: 'Glowing inlay in the handles and energy-lit chain links.',
      4: 'Gold bands, spiral-wrapped handles, richer sparks.',
      5: 'Metal-cored handles with glowing runes and a chain of pure energy.' }
  };

  /* ---------------- Energies (shared across the team; each turtle equips one) ---------------- */
  TB.ENERGY_COST = 50;
  TB.ENERGIES = {
    none:    { name: 'None', level: 1, colors: ['#c9d2db', '#ffffff', '#ffffff'], implemented: true,
               desc: 'Pure steel. No effects, but no tradeoffs: full damage and the plain Spin Slash special.',
               pro: 'Full single-target damage.', con: 'No status effects.', special: 'Spin Slash' },
    fire:    { name: 'Fire', level: 2, colors: ['#ff5a1f', '#ffb347', '#fff3b0'], implemented: true,
               desc: 'Hits set enemies burning; finishing attacks detonate in a small blast.',
               pro: 'Best against single tough targets (rhinos, bosses).', con: 'Weak against crowds; no crowd control.', special: 'Inferno Spin: burning ring around you.' },
    lightning: { name: 'Lightning', level: 2, colors: ['#ffe94a', '#fff9b0', '#ffffff'], implemented: true,
               desc: 'Strikes arc to nearby enemies, rewarding attacks on groups.',
               pro: 'Best against groups and swarms.', con: '10% less damage on a lone target.', special: 'Storm Chain: bolts leap between up to six foes and briefly stun.' },
    ice:     { name: 'Ice', level: 2, colors: ['#4fd5ff', '#bdf0ff', '#ffffff'], implemented: true,
               desc: 'Hits chill and slow enemies (and their attack telegraphs); repeated hits freeze them briefly.',
               pro: 'Slows fast, dangerous attackers; heavy hits shatter frozen foes.', con: '15% less damage; thick-hided foes resist it.', special: 'Frost Nova: wide chilling burst that can freeze.' },
    toxic:   { name: 'Toxic', level: 4, colors: ['#7be34a', '#d0ff8a', '#f2ffd6'], implemented: true,
               desc: 'Hits poison enemies (stacking damage over time) and heavy hits leave toxic puddles that hurt enemies standing in them.',
               pro: 'Area denial; great when you retreat and kite.', con: 'Slow to kill; 10% less direct damage; swamp beasts resist it.', special: 'Toxic Burst: poison cloud and three puddles ahead of you.' },
    mystic:  { name: 'Mystic', level: 6, colors: ['#c05cff', '#f0c9ff', '#ffffff'], implemented: true,
               desc: 'Every hit releases an energy pulse that shoves nearby enemies; finishers send out a shockwave.',
               pro: 'Space control; protects you from being surrounded.', con: '20% less direct damage; heavy foes resist knockback.', special: 'Mystic Shockwave: big ring that knocks enemies down.' }
  };
  TB.ENERGY_ORDER = ['none', 'fire', 'lightning', 'ice', 'toxic', 'mystic'];
  TB.SPECIAL_COST = 40;
  TB.ENERGY_MAX = 100;

  /* ---------------- Leveling: XP curve is derived from target minutes per level ----------------
   * XP_PER_MIN is the intended XP income of normal play. The stage below is budgeted to pay ~XP_PER_MIN * its
   * intended length. Level thresholds = target minutes * XP_PER_MIN. These are STARTING targets to be
   * validated with playtesting (see README: the Dev panel logs real level-up times).
   */
  TB.XP_PER_MIN = 60;
  TB.MAX_LEVEL = 8;
  TB.LEVEL_MINUTES = { 2: 4, 3: 6, 4: 7, 5: 9, 6: 10, 7: 11, 8: 13 }; // minutes of normal play between level n-1 and n
  TB.LEVEL_XP = (function () {
    var a = { 1: 0 }, s = 0;
    for (var l = 2; l <= TB.MAX_LEVEL; l++) { s += TB.LEVEL_MINUTES[l] * TB.XP_PER_MIN; a[l] = s; }
    return a;
  })();
  TB.PERKS = {
    2: { name: 'Fourth Strike',   kind: 'Combo',     desc: 'Light combo gains an extra hit and a stronger finisher. Fire, Lightning and Ice infusions unlock.' },
    3: { name: 'Iron Shell',      kind: 'Survival',  desc: '+25 max health. Jump attack gains a second strike.' },
    4: { name: 'Shadow Step',     kind: 'Movement',  desc: 'Dodge roll travels farther, recovers faster, and moving speed +8%.' },
    5: { name: 'Deep Focus',      kind: 'Energy',    desc: 'Energy regenerates 40% faster; specials cost 10 less.' },
    6: { name: 'Signature Spin',   kind: 'Combo',     desc: 'Heavy attack right after a dodge becomes a spinning attack that hits all around. Toxic unlocks at level 4, Mystic at level 6.' },
    7: { name: "Master's Resolve", kind: 'Survival', desc: '+30 max health and shorter hit-stun.' },
    8: { name: 'Perfect Edge',    kind: 'Energy',    desc: 'Energy specials deal +35% damage; hits refund more energy.' }
  };

  /* ---------------- Enemies ---------------- */
  // resist: multiplier on energy status potency (0 = immune). Damage itself is never resisted, so any energy stays viable.
  TB.ENEMIES = {
    rat:      { name: 'Rat Scavenger',    hp: 18,  hw: 8,  h: 16, speed: 66, xp: 8,  scrap: 3,  resist: { fire: 1, ice: 1, lightning: 1, toxic: 1.3, mystic: 1 } },
    mantis:   { name: 'Mantis Fighter',   hp: 46,  hw: 9,  h: 40, speed: 52, xp: 20, scrap: 6,  resist: { fire: 0.6, ice: 1.3, lightning: 1, toxic: 0.7, mystic: 1 } },
    bat:      { name: 'Bat Mutant',       hp: 24,  hw: 10, h: 22, speed: 70, xp: 15, scrap: 5,  resist: { fire: 1.3, ice: 1, lightning: 1.2, toxic: 1, mystic: 1.3 } },
    porcupine:{ name: 'Porcupine Mutant', hp: 44,  hw: 12, h: 36, speed: 38, xp: 20, scrap: 6,  resist: { fire: 1.3, ice: 1, lightning: 0.5, toxic: 0.6, mystic: 1 } },
    rhino:    { name: 'Rhino Bruiser',    hp: 110, hw: 16, h: 54, speed: 34, xp: 40, scrap: 12, resist: { fire: 1, ice: 0.4, lightning: 1, toxic: 1.2, mystic: 0.5 } },
    grappler: { name: 'Crocodile Grappler', hp: 76, hw: 15, h: 44, speed: 36, xp: 28, scrap: 8, resist: { fire: 1, ice: 0.7, lightning: 1, toxic: 0.3, mystic: 1 } },
    boss:     { name: 'Snapjaw, Sewer Warden', hp: 360, hw: 24, h: 62, speed: 30, xp: 160, scrap: 60, resist: { fire: 1, ice: 0.4, lightning: 1, toxic: 0.5, mystic: 0.5 } },
    warlord:  { name: 'Ironhorn, Rhino Warlord', hp: 480, hw: 22, h: 62, speed: 34, xp: 240, scrap: 90, resist: { fire: 1, ice: 0.4, lightning: 1, toxic: 0.8, mystic: 0.4 } }
  };
  TB.CLEAR_BONUS_XP = 2;
  TB.VALVE_XP = 60;
  TB.SECRET_XP = 40;

  /* ---------------- Stages ---------------- */
  var R = function (t, s) { return [t, s]; };
  var S1 = {
    name: 'Stage 1 — Sewer Run', length: 7700, bossType: 'boss',
    zones: [
      { name: 'Old Sewer Main',   from: 0,    pal: 'sewer' },
      { name: 'Pump Works',       from: 3140, pal: 'pump' },
      { name: 'Overflow Chamber', from: 6500, pal: 'chamber' }
    ],
    encounters: [
      { id: 'e1',  waves: [[R('rat','R'), R('rat','R'), R('rat','L')]], hint: 'Rats surround you. Tap J to chain a combo!' },
      { id: 'e2',  waves: [[R('rat','R'), R('rat','R'), R('rat','L'), R('rat','L')]], hint: 'Smash crates for scrap and pizza. E picks up cans to throw.' },
      { id: 'e3',  waves: [[R('mantis','R')]], cp: true, hint: 'MANTIS — a white flash means a 3-hit blade combo is coming. Dodge (L), then punish.' },
      { id: 'e4',  waves: [[R('mantis','L')], [R('rat','R'), R('rat','R'), R('rat','L')]] },
      { id: 'e5',  waves: [[R('bat','R')]], hint: 'BAT — dodge the red marker, then hit it while it is grounded. Jump attacks reach it in the air.' },
      { id: 'e6',  waves: [[R('bat','R'), R('bat','L')], [R('rat','R'), R('rat','L')]], cp: true },
      { id: 'e7',  waves: [[R('porcupine','R')]], hint: 'PORCUPINE — leave its firing line or jump the quills. Raised quills hurt if you hit it!' },
      { id: 'g1',  waves: [[R('grappler','R')]], hint: 'CROCODILE — short-range grab (mash attack to break free) and a wide tail sweep. Step out and punish the recovery.' },
      { id: 'e8',  waves: [[R('porcupine','L')], [R('grappler','R'), R('rat','L'), R('rat','L')]] },
      { id: 'e9',  waves: [[R('rhino','R')]], cp: true, hint: 'RHINO — step out of the red charge lane. It is stunned when it misses!' },
      { id: 'e10', waves: [[R('rhino','L'), R('porcupine','R')], [R('grappler','R'), R('bat','L')]] },
      { id: 'e11', waves: [[R('mantis','L'), R('bat','R')], [R('rat','R'), R('rat','R'), R('rat','L')]], valve: 'Turn the flood valve (E)', cp: true, hint: 'Clear the room, then turn the flood valve (E).' },
      { id: 'boss', boss: 'boss', waves: [], hint: 'SNAPJAW — learn each warning. Attack when he is recovering.' }
    ],
    props: [
      ['crate', 700, 200], ['barrel', 760, 230], ['can', 1240, 215], ['crate', 1300, 190], ['barrel', 1330, 240],
      ['crate', 1820, 200], ['barrel', 1880, 226], ['can', 2340, 232], ['crate', 2400, 205], ['barrel', 2900, 214],
      ['crate', 3000, 198], ['can', 3480, 200], ['crate', 3960, 190], ['barrel', 4580, 236], ['crate', 5120, 205],
      ['can', 5660, 215], ['crate', 5740, 232], ['barrel', 6280, 200], ['crate', 6340, 226],
      ['secret', 1130, 174], ['crate', 4400, 205], ['barrel', 4460, 236], ['can', 4520, 214], ['crate', 6180, 200], ['barrel', 6240, 230], ['crate', 6900, 205], ['can', 6960, 232], ['secret', 5200, 174]
    ]
  };
  var S2 = {
    name: 'Stage 2 — Underground Lab', length: 6300, bossType: 'warlord',
    zones: [
      { name: 'Research Wing', from: 0,    pal: 'lab' },
      { name: 'Foundry Floor', from: 3140, pal: 'foundry' }
    ],
    encounters: [
      { id: 'l1',  waves: [[R('mantis','R'), R('mantis','L')]], hint: 'Two mantises: keep moving and dodge their combos one at a time.' },
      { id: 'l2',  waves: [[R('bat','R'), R('bat','L')], [R('grappler','R')]] },
      { id: 'l3',  waves: [[R('porcupine','R'), R('porcupine','L')]], cp: true, hint: 'Two porcupines cross-fire. Close the distance on one, then the other.' },
      { id: 'l4',  waves: [[R('rhino','R')], [R('rat','R'), R('rat','R'), R('rat','L'), R('rat','L')]] },
      { id: 'l5',  waves: [[R('grappler','L'), R('mantis','R')], [R('bat','R'), R('bat','L')]] },
      { id: 'l6',  waves: [[R('porcupine','R'), R('rhino','L')]], cp: true },
      { id: 'l7',  waves: [[R('mantis','L'), R('mantis','R'), R('porcupine','R')], [R('rat','R'), R('rat','R'), R('rat','L')]] },
      { id: 'l8',  waves: [[R('rhino','L'), R('grappler','R'), R('bat','R')]] },
      { id: 'l9',  waves: [[R('rat','R'), R('rat','L'), R('mantis','R'), R('bat','L'), R('porcupine','R')], [R('grappler','L'), R('rhino','R')]], valve: 'Shut down the reactor (E)', cp: true, hint: 'Clear the room, then shut down the reactor (E).' },
      { id: 'boss2', boss: 'warlord', waves: [], hint: 'IRONHORN — double charges, ground smashes and quakes. Jump the shockwaves!' }
    ],
    props: [
      ['crate', 700, 200], ['barrel', 760, 230], ['can', 1240, 215], ['crate', 1300, 190], ['can', 1820, 200], ['barrel', 1880, 226],
      ['crate', 2340, 232], ['barrel', 2400, 205], ['can', 2900, 214], ['crate', 3000, 198], ['barrel', 3480, 200], ['crate', 3960, 190],
      ['can', 4080, 230], ['crate', 4580, 236], ['barrel', 5120, 205], ['crate', 5180, 232], ['can', 5560, 214],
      ['secret', 1690, 174], ['secret', 4420, 174]
    ]
  };
  TB.STAGES = [S1, S2];
  TB.STAGES.forEach(function (st) { st.encounters.forEach(function (e, i) { e.x = 380 + 560 * i; }); });
  TB.STAGE = S1;   // the active stage; swapped by the game when a stage starts

  /* Budget helper: total XP available in a stage (used by README table and dev panel). */
  TB.stageXPBudget = function (st) {
    var xp = 0; st = st || TB.STAGE;
    st.encounters.forEach(function (e) {
      xp += TB.CLEAR_BONUS_XP;
      (e.waves || []).forEach(function (w) { w.forEach(function (s) { xp += TB.ENEMIES[s[0]].xp; }); });
      if (e.valve) xp += TB.VALVE_XP;
      if (e.boss) xp += TB.ENEMIES[e.boss].xp;
    });
    st.props.forEach(function (p) { if (p[0] === 'secret') xp += TB.SECRET_XP; });
    return xp;
  };
})(window.TB);
