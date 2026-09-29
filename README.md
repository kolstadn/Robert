# Turtle Brawl — Sewer Run (fan prototype)

A playable 2D side-scrolling beat 'em up prototype inspired by *TMNT: Shredder's Revenge*.
Unofficial fan project; no assets from any game are used — all art and sound is generated in code.

## Run it
No build step, no dependencies.

```bash
# any static server works, or just open index.html in a modern browser
python3 -m http.server 8080      # then open http://localhost:8080
```

Saves go to `localStorage` (`turtleBrawl.save.v1`). Headless smoke test (needs Playwright + Chromium): `node tools/smoke-test.mjs`.

## Approach
Vanilla HTML5 Canvas + JavaScript. The game renders at 480×270 and scales up with crisp pixels; menus/HUD are DOM overlays so text stays sharp.
Art is *procedural pixel art* (rectangles drawn by code), which is what makes weapon tiers possible as real physical detail rather than recolours, and keeps the repo tiny.

```
index.html        page, HUD + menu markup/CSS
src/data.js       ALL tuning: turtles, weapon tiers, energies, XP curve, perks, enemies, stage layout
src/sprites.js    weapon / turtle / enemy / prop / background drawing
src/game.js       simulation: player, enemy AI, boss, energies, progression, camera, render
src/ui.js         HUD, upgrade menu + weapon preview, dev panel
src/audio.js      procedural WebAudio sfx
tools/smoke-test.mjs   headless bot run
```

Extending: a new turtle = an entry in `TB.TURTLES` + a `TB.WEAPONS[type]` draw routine + move tables; a new energy = an `ENERGIES` entry + `applyEnergy`/`specialEffect` branches; a new enemy = `ENEMIES` entry + `AI[type]` + `E[type]` sprite; a new stage = another `STAGE`-style table.

## Controls
| Action | Keys |
|---|---|
| Move (across width **and** depth) | Arrows / WASD |
| Light attack / combo | J or Z |
| Heavy attack | K or X |
| Jump, then jump attack | Space or C, then J/K |
| Dodge roll (brief invincibility) | L or V |
| Energy special | I or B |
| Pick up can / throw / use valve | E (J also throws) |
| Upgrade menu (only when the area is clear) | Tab |
| Pause / mute / dev panel (on title) | Esc / M / F2 |

## What's in the prototype
* **Leonardo, twin katanas** — 3-hit light combo (4-hit Crossing Fang at Lv 2), heavy Cleave, jump slash (+rising slash at Lv 3), dodge roll, Twin Cyclone (Lv 6), energy special, throwable cans, breakable crates/barrels, 2 hidden cracked walls.
* **Stage 1 "Sewer Run"** — 12 encounters + boss across three zones (sewer main → pump works → overflow chamber), checkpoints, a valve objective.
* **Enemies**, introduced one at a time: Rat Scavenger (surrounds, coordinated lunges), Mantis Fighter (flash-warned 3-hit blade combo, sidesteps), Bat Mutant (airborne swoop with a ground marker, grounded opening), Porcupine Mutant (kites, quill volleys with aim lines, thorns while charging, point-blank burst), Crocodile Grappler (short-range grab you mash out of, plus a wide tail sweep), Rhino Bruiser (armoured; locks a red charge lane; stunned when it misses). Enemy attackers are capped (max 3 melee at once) so fights stay readable.
* **Boss: Snapjaw** — 3 phases with *new* behaviour each: (1) tail sweep + grab (mash to escape), (2) leap slam with jumpable shockwave + calls rats, (3) flood lanes that force repositioning. Reduced damage except during recovery openings; never flinches.
* **Energies** — Fire (burn, finisher blast; best vs single tough targets), Lightning (chain hits; best vs groups, −10% lone damage), Ice (slow incl. slowed telegraphs, freeze after repeated hits with immunity window, heavy hits shatter; −15% damage; rhino/boss resist). Toxic and Mystic are shown as "coming soon". Specials cost energy (40, 30 at Lv 5); energy regenerates and refunds on hit; basic combat stays fully viable. Resistances only scale *status* strength, never make a fight unwinnable.
* **Weapon tiers 1–5** with distinct physical detail (see `drawKatana` in `src/sprites.js` and the upgrade menu preview): Basic → Reinforced (steel guard, blue bindings, thicker base) → Energized (glowing groove + swing trails) → Advanced (gold guard, longer blade, hamon, richer sparks) → Master (winged guard, runes, energy flame, finisher energy wave). The weapon is always a katana; the selected energy only changes glow/trail/impact colour and effects.
* **Progression** — one XP bar. Levels unlock perks and *tiers*; **scrap** bought with normal drops buys tiers/energies. Rewards are claimed once per enemy/prop/secret (no farming; retries keep progress but don't re-pay).
* **Saving** — level, XP, scrap, tier, unlocked energies, equipped energy, checkpoint and claimed rewards persist between sessions.
* **Developer testing** — title screen → *Developer Testing* (or F2): preview any level (1–8), tier, energy, start encounter, invincibility. It runs on a throw-away copy of your save, never writes to storage, and does **not** change XP rates.

## Leveling & pacing (starting targets, unvalidated)
`TB.XP_PER_MIN = 60`; thresholds = target minutes × 60 (`TB.LEVEL_MINUTES`):

| Level | Cumulative XP | Target gap |
|---|---|---|
| 2 | 240 | ~4 min |
| 3 | 600 | ~6 |
| 4 | 1020 | ~7 |
| 5 | 1560 | ~9 |
| 6 | 2160 | ~10 |
| 7 | 2820 | ~11 |
| 8 | 3600 | ~13 |

Stage 1 is budgeted at **821 XP ≈ 13.7 min** (enemies, 2 secrets, valve, clear bonuses, boss 160) so a normal run reaches Lv 3 by the boss and Lv 4 comes early in the *next* stage. Enemy stats never scale with player level — challenge comes from behaviours and combinations.

## Honest status / unfinished
* **Playtest validation**: pacing has *not* been validated with human players. A scripted bot clears the first 7 encounters in ~95 s (≈150 XP/min), i.e. far faster than a person; real pace is unknown, so expect first level-up to arrive earlier than 4 min for skilled players. Tune `XP_PER_MIN`/`LEVEL_MINUTES`/enemy `xp` in `src/data.js`; the dev panel shows real level-up times from your save.
* Only **Leonardo** is playable; Raphael/Donatello/Michelangelo (sai, bo staff, nunchaku) have data entries but no move sets or weapon art. Only one stage, so only levels 2–3 are reachable through normal play; levels 4–8 exist (perks, tiers 4–5) and are testable via the dev panel.
* Toxic and Mystic energies, mole ambushers and electric-eel enemies are not implemented.
* No gamepad, no co-op, placeholder procedural audio, art is simple programmer pixel art, no touch controls.
* Balance numbers (damage, HP, cooldowns) are first-pass and untested by humans.
