# Turtle Brawl — fan prototype

A playable 2D side-scrolling beat 'em up inspired by *TMNT: Shredder's Revenge*. Unofficial fan project; all art and sound is generated in code.
**PC / keyboard game** — every menu and the whole game work with the keyboard only.

## Run it
No build step, no dependencies.

```bash
python3 -m http.server 8080      # then open http://localhost:8080  (or just open index.html)
```

Saves go to `localStorage` (`turtleBrawl.save.v2`). Headless smoke test (Playwright + Chromium): `node tools/smoke-test.mjs`.

## Controls
| Action | Keys |
|---|---|
| Move (width **and** depth) | Arrows / WASD |
| Light attack / combo | J or Z |
| Heavy attack | K or X |
| Jump, then jump attack | Space or C, then J/K |
| Dodge roll (brief invincibility) | L or V |
| Energy special | I or B |
| Pick up can / throw / use valve or reactor | E (J also throws) |
| Upgrade menu + switch turtle (area must be clear) | Tab, then 1–4 to pick a turtle |
| Pause · mute · dev panel (title) | Esc · M · F2 |
| **Menus** | Arrow keys / WASD to move, Enter (or J) to select, Esc / Backspace back, 1–4 pick a turtle |

## What's in it
* **All four turtles**, each keeping their signature weapon for the whole game:
  Leonardo (twin katanas — balanced), Raphael (twin sai — short reach, hard hits, big lunges), Donatello (bo staff — long reach, wide sweeps, whirlwind), Michelangelo (nunchaku — fastest, 5-hit flowing combo, best roll). Each has its own light chain (extra hit at Lv 2), heavy, jump attacks and signature spin (Lv 6). Switch turtle any time the area is clear (Tab, then 1–4): health carries over proportionally.
* **Weapon tiers 1–5 for every weapon** (Basic → Reinforced → Energized → Advanced → Master) with real physical changes (guards, caps, rings, grooves, barbs, flared ends, runes, flames) — the weapon never changes type. Tiers are bought per turtle with scrap; the upgrade menu previews any tier with your equipped energy and explains what it changes.
* **Six energies** — None, Fire (burn + finisher blast), Lightning (chains to groups), Ice (slow + freeze, shatter), Toxic (stacking poison + hazard puddles), Mystic (energy pulses, knockback, shockwave finishers). Each has a special (40 energy), pros and tradeoffs (damage multipliers, enemy resistances). Resistances only weaken *status* effects, so any energy can beat any encounter; freeze/knockdown have immunity windows. Energies are unlocked with scrap once the level requirement is met (Fire/Lightning/Ice Lv 2, Toxic Lv 4, Mystic Lv 6); each turtle equips their own.
* **Two stages**
  1. *Sewer Run* — 12 encounters + boss **Snapjaw** (tail sweep/grab → leap slam + calls rats → flood lanes).
  2. *Underground Lab* — 9 harder combination encounters + boss **Ironhorn, Rhino Warlord** (charges, double charges, ground smashes, quake shockwaves, calls bats/mantis). Reactor objective, 2 secrets per stage, checkpoints.
* **Six mutant types**, each introduced alone in stage 1: Rat Scavenger, Mantis Fighter, Bat Mutant, Porcupine Mutant, Crocodile Grappler, Rhino Bruiser — each with a different silhouette, telegraph and punish window. Max 3 melee attackers at once.
* **Progression** — one shared XP bar and level for the team (Lv 1–8 perks: extra combo hit, +health, better dodge, faster energy, signature spin, more health/less hit-stun, stronger specials), one shared scrap pool. Rewards pay once per enemy/prop/secret, so retries keep progress but can't be farmed. No enemy scaling.
* **Saving** — level, XP, scrap, chosen turtle, each turtle's weapon tier and energy, unlocked energies, per-stage checkpoints and claimed rewards persist. Stage Select replays cleared stages (no repeat rewards).
* **Between-level flow** — every stage starts with an intro card (area, mutants ahead, your squad; Start / Upgrades & switch turtle / Main menu) and ends with a results screen (time, kills, secrets, XP, scrap, level-ups and new perks, what you can afford; Next stage / Upgrades & switch turtle / Replay / Stage select / Save & main menu). All keyboard-driven.
* **Developer testing** (title screen or F2): pick turtle, level, tier, energy and any encounter; runs on a throw-away copy of your save, never saves, never accelerates XP.

## Leveling & pacing (starting targets, unvalidated)
`TB.XP_PER_MIN = 60`; thresholds = target minutes × 60 (`src/data.js`):

| Level | Cum. XP | Target gap |
|---|---|---|
| 2 | 240 | ~4 min |
| 3 | 600 | ~6 |
| 4 | 1020 | ~7 |
| 5 | 1560 | ~9 |
| 6 | 2160 | ~10 |
| 7 | 2820 | ~11 |
| 8 | 3600 | ~13 |

Stage 1 pays 821 XP (~13.7 min), stage 2 pays 1054 XP (~17.6 min): normal play reaches Lv 5 by the end of stage 2 (tier 4 unlocked, Toxic available). Levels 6–8 (tier 5, Mystic, later perks) need more stages and are testable via the dev panel.

## Architecture
```
index.html      page + HUD/menu markup
src/data.js     ALL tuning: turtles, tiers, energies, XP curve, perks, enemies, stages
src/art.js      vector-art helpers (limbs, IK, gradients, glow, shadows)
src/world.js    pre-rendered 2x environments (5 palettes), props, items
src/turtles.js  weapon art (4 weapons x 5 tiers) + the turtle skeleton rig
src/enemies.js  enemy and boss sprites
src/game.js     simulation: moves, enemy AI, bosses, energies, progression, save, render
src/ui.js       HUD, keyboard-navigable menus, upgrade preview, dev panel
src/audio.js    procedural sfx
```
Rendering: the canvas is 960x540, drawn at 2x logical units. Characters are shaded, outlined vector art on a small skeleton (2-bone IK legs and arms, walk cycle, attack lean), weapons are drawn per tier with gradients and additive energy glow, environments are pre-rendered per zone with animated lighting, water, particles and light shafts. Gameplay runs at 1.3x simulation speed with faster base movement.

## Honest status / unfinished
* **Pacing not validated with humans.** A scripted bot clears content far faster than a person; expect level-ups earlier than targets for skilled players. Tune `src/data.js`.
* Only **2 stages**. Mole ambushers, electric-eel enemies, more bosses, stages 3+ and levels 9+ are not built (the data tables are designed for adding them).
* Balance numbers (damage, HP, cooldowns, move sets) are first-pass; the four turtles have not been human-playtested against each other.
* No gamepad, no co-op, placeholder procedural audio, programmer pixel art.
