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
    leo:   { name: 'Leonardo',     weapon: 'katana',   weaponName: 'Twin Katanas', implemented: true,  style: 'Balanced speed, reach and damage', mask: '#2d63e0', maskDark: '#1f46a8' },
    raph:  { name: 'Raphael',      weapon: 'sai',      weaponName: 'Twin Sai',     implemented: false, style: 'Powerful close-range, aggressive combos', mask: '#d8352a', maskDark: '#9c2019' },
    don:   { name: 'Donatello',    weapon: 'bo',       weaponName: 'Bo Staff',     implemented: false, style: 'Long reach, strong crowd control', mask: '#8a4fd0', maskDark: '#5e2f96' },
    mike:  { name: 'Michelangelo', weapon: 'nunchaku', weaponName: 'Nunchaku',     implemented: false, style: 'Fast attacks, mobility, flowing combos', mask: '#f08a1c', maskDark: '#b5620e' }
  };

  /* ---------------- Weapon tiers (5 visual stages) ---------------- */
  TB.TIER_NAMES = ['', 'Basic', 'Reinforced', 'Energized', 'Advanced', 'Master'];
  TB.TIER_UNLOCK_LEVEL = [0, 1, 2, 3, 5, 7];       // character level required to buy the tier
  TB.TIER_COST = [0, 0, 60, 120, 220, 380];         // scrap
  TB.TIER_DMG = [0, 1.0, 1.12, 1.25, 1.40, 1.60];
  TB.TIER_REACH = [0, 1.0, 1.05, 1.10, 1.14, 1.20];
  TB.TIER_POTENCY = [0, 1.0, 1.0, 1.15, 1.3, 1.5]; // energy effect strength
  TB.TIER_INFO = {
    1: { look: 'Plain steel blades with leather-wrapped grips.', stats: 'Baseline damage and reach.' },
    2: { look: 'Steel guards, blue bindings, capped pommels, thicker blade base.', stats: '+12% damage, +5% reach.' },
    3: { look: 'Glowing energy groove along each blade and a visible energy trail on every swing.', stats: '+25% damage, +10% reach, +15% energy potency.' },
    4: { look: 'Gold-inlaid guards, longer tempered blades with a wavy hamon, richer energy sparks.', stats: '+40% damage, +14% reach, +30% potency. Lightning chains further, ice freezes sooner.' },
    5: { look: 'Ornate winged guards, rune-etched blades, an energy flame along the spine.', stats: '+60% damage, +20% reach, +50% potency. Finishers release an energy wave.' }
  };

  /* ---------------- Energies ---------------- */
  TB.ENERGY_UNLOCK_LEVEL = 2;
  TB.ENERGY_COST = 50;
  TB.ENERGIES = {
    none:    { name: 'None', colors: ['#c9d2db', '#ffffff', '#ffffff'], implemented: true,
               desc: 'Pure steel. No effects, but no tradeoffs: full damage and the plain Spin Slash special.',
               pro: 'Full single-target damage.', con: 'No status effects.', special: 'Spin Slash' },
    fire:    { name: 'Fire', colors: ['#ff5a1f', '#ffb347', '#fff3b0'], implemented: true,
               desc: 'Hits set enemies burning; finishing attacks detonate in a small blast.',
               pro: 'Best against single tough targets (rhinos, bosses).', con: 'Weak against crowds; no crowd control.', special: 'Inferno Spin: burning ring around you.' },
    lightning: { name: 'Lightning', colors: ['#ffe94a', '#fff9b0', '#ffffff'], implemented: true,
               desc: 'Strikes arc to nearby enemies, rewarding attacks on groups.',
               pro: 'Best against groups and swarms.', con: '10% less damage on a lone target.', special: 'Storm Chain: bolts leap between up to six foes and briefly stun.' },
    ice:     { name: 'Ice', colors: ['#4fd5ff', '#bdf0ff', '#ffffff'], implemented: true,
               desc: 'Hits chill and slow enemies (and their attack telegraphs); repeated hits freeze them briefly.',
               pro: 'Slows fast, dangerous attackers; heavy hits shatter frozen foes.', con: '15% less damage; thick-hided foes resist it.', special: 'Frost Nova: wide chilling burst that can freeze.' },
    toxic:   { name: 'Toxic', colors: ['#7be34a', '#d0ff8a', '#f2ffd6'], implemented: false,
               desc: 'Damage over time and small lingering hazard puddles.', pro: 'Area denial.', con: 'Slow to kill.', special: 'Planned' },
    mystic:  { name: 'Mystic', colors: ['#c05cff', '#f0c9ff', '#ffffff'], implemented: false,
               desc: 'Energy pulses, knockback and shockwave finishers.', pro: 'Space control.', con: 'Low raw damage.', special: 'Planned' }
  };
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
    2: { name: 'Fourth Strike',   kind: 'Combo',     desc: 'Light combo gains a 4th hit: the Crossing Fang finisher. Energy infusions unlock.' },
    3: { name: 'Iron Shell',      kind: 'Survival',  desc: '+25 max health. Jump attack gains a rising second slash.' },
    4: { name: 'Shadow Step',     kind: 'Movement',  desc: 'Dodge roll travels farther, recovers faster, and moving speed +8%.' },
    5: { name: 'Deep Focus',      kind: 'Energy',    desc: 'Energy regenerates 40% faster; specials cost 10 less.' },
    6: { name: 'Twin Cyclone',    kind: 'Combo',     desc: 'Heavy attack right after a dodge becomes a spinning Cyclone that hits all around.' },
    7: { name: "Master's Resolve", kind: 'Survival', desc: '+30 max health and shorter hit-stun.' },
    8: { name: 'Perfect Edge',    kind: 'Energy',    desc: 'Energy specials deal +35% damage; hits refund more energy.' }
  };

  /* ---------------- Enemies ---------------- */
  // resist: multiplier on energy status potency (0 = immune). Damage itself is never resisted, so any energy stays viable.
  TB.ENEMIES = {
    rat:      { name: 'Rat Scavenger',    hp: 18,  hw: 8,  h: 16, speed: 66, xp: 8,  scrap: 3,  resist: { fire: 1, ice: 1, lightning: 1 } },
    mantis:   { name: 'Mantis Fighter',   hp: 46,  hw: 9,  h: 40, speed: 52, xp: 20, scrap: 6,  resist: { fire: 0.6, ice: 1.3, lightning: 1 } },
    bat:      { name: 'Bat Mutant',       hp: 24,  hw: 10, h: 22, speed: 70, xp: 15, scrap: 5,  resist: { fire: 1.3, ice: 1, lightning: 1.2 } },
    porcupine:{ name: 'Porcupine Mutant', hp: 44,  hw: 12, h: 36, speed: 38, xp: 20, scrap: 6,  resist: { fire: 1.3, ice: 1, lightning: 0.5 } },
    rhino:    { name: 'Rhino Bruiser',    hp: 110, hw: 16, h: 54, speed: 34, xp: 40, scrap: 12, resist: { fire: 1, ice: 0.4, lightning: 1 } },
    boss:     { name: 'Snapjaw, Sewer Warden', hp: 360, hw: 24, h: 62, speed: 30, xp: 160, scrap: 60, resist: { fire: 1, ice: 0.4, lightning: 1 } }
  };
  TB.CLEAR_BONUS_XP = 2;
  TB.VALVE_XP = 60;
  TB.SECRET_XP = 40;

  /* ---------------- Stage 1: "Sewer Run" ---------------- */
  var R = function (t, s) { return [t, s]; };
  TB.STAGE = {
    name: 'Stage 1 — Sewer Run', length: 7100,
    zones: [
      { name: 'Old Sewer Main',   from: 0,    pal: 'sewer' },
      { name: 'Pump Works',       from: 3140, pal: 'pump' },
      { name: 'Overflow Chamber', from: 5940, pal: 'chamber' }
    ],
    encounters: [
      { id: 'e1',  x: 380,  waves: [[R('rat','R'), R('rat','R'), R('rat','L')]], hint: 'Rats surround you. Tap J to chain a combo!' },
      { id: 'e2',  x: 940,  waves: [[R('rat','R'), R('rat','R'), R('rat','L'), R('rat','L')]], hint: 'Smash crates for scrap and pizza. E picks up cans to throw.' },
      { id: 'e3',  x: 1500, waves: [[R('mantis','R')]], cp: true, hint: 'MANTIS — a white flash means a 3-hit blade combo is coming. Dodge (L), then punish.' },
      { id: 'e4',  x: 2060, waves: [[R('mantis','L')], [R('rat','R'), R('rat','R'), R('rat','L')]] },
      { id: 'e5',  x: 2620, waves: [[R('bat','R')]], hint: 'BAT — dodge the red marker, then hit it while it is grounded. Jump attacks reach it in the air.' },
      { id: 'e6',  x: 3180, waves: [[R('bat','R'), R('bat','L')], [R('rat','R'), R('rat','L')]], cp: true },
      { id: 'e7',  x: 3740, waves: [[R('porcupine','R')]], hint: 'PORCUPINE — leave its firing line or jump the quills. Raised quills hurt if you hit it!' },
      { id: 'e8',  x: 4300, waves: [[R('porcupine','L')], [R('rat','R'), R('rat','R'), R('rat','L')]] },
      { id: 'e9',  x: 4860, waves: [[R('rhino','R')]], cp: true, hint: 'RHINO — step out of the red charge lane. It is stunned when it misses!' },
      { id: 'e10', x: 5420, waves: [[R('rhino','L'), R('porcupine','R')]] },
      { id: 'e11', x: 5980, waves: [[R('mantis','L'), R('bat','R')], [R('rat','R'), R('rat','R'), R('rat','L')]], valve: true, cp: true, hint: 'Clear the room, then turn the flood valve (E).' },
      { id: 'boss', x: 6560, boss: true, waves: [], hint: 'SNAPJAW — learn each warning. Attack when he is recovering.' }
    ],
    props: [
      ['crate', 700, 200], ['barrel', 760, 230], ['can', 1240, 215], ['crate', 1300, 190], ['barrel', 1330, 240],
      ['crate', 1820, 200], ['barrel', 1880, 226], ['can', 2340, 232], ['crate', 2400, 205], ['barrel', 2900, 214],
      ['crate', 3000, 198], ['can', 3480, 200], ['crate', 3960, 190], ['barrel', 4020, 236], ['crate', 4560, 205],
      ['can', 5100, 215], ['crate', 5180, 232], ['barrel', 5720, 200], ['crate', 5780, 226],
      ['secret', 1130, 174], ['secret', 4640, 174]
    ]
  };

  /* Budget helper: total XP available in the stage (used by README table and dev panel). */
  TB.stageXPBudget = function () {
    var xp = 0, st = TB.STAGE;
    st.encounters.forEach(function (e) {
      xp += TB.CLEAR_BONUS_XP;
      (e.waves || []).forEach(function (w) { w.forEach(function (s) { xp += TB.ENEMIES[s[0]].xp; }); });
      if (e.valve) xp += TB.VALVE_XP;
      if (e.boss) xp += TB.ENEMIES.boss.xp;
    });
    st.props.forEach(function (p) { if (p[0] === 'secret') xp += TB.SECRET_XP; });
    return xp;
  };
})(window.TB);
