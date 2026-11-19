[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/fadliferdian28/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/fadliferdian28/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

# LUMEN BAY

A sun-soaked open-world crime game set in Lumen Bay, a coastal city of palm-lined beaches, neon-lit streets, and winding mountain roads. Play as Kai Marlow, a getaway driver pulled back into the underworld by fixer Nadia Voss. Complete 7 story missions, evade the LBPD with their helicopter pursuit, and cruise the coastline at sunset.

## Features

- **Procedural City**: 12×12 block grid with roads, sidewalks, varied buildings, palm trees, beach, ocean, pier, and a rotating ferris wheel
- **On-Foot Gameplay**: Third-person movement, sprinting, mouse aim, weapon switching (pistol/rifle/shotgun)
- **Driving Physics**: 5 distinct vehicles (Falcon GT, Bay Breeze, Streetfox, Harbor Hauler, LBPD Interceptor) with arcade handling, handbrake drifting, chase/hood/cinematic cameras
- **Traffic & Pedestrians**: AI cars following lanes, honking on near-miss; walkers on sidewalks fleeing from danger
- **Wanted System**: 5-star LBPD response with named units (GULL-1, MARLIN-11, etc.), pursuit/ramming/spotlight/roadblock behaviors, police helicopter
- **7 Story Missions**: Waypoints, vehicle theft, combat, survival, escape objectives
- **Combat**: Hitscan shooting with spread, damage to peds/vehicles/police
- **Full HUD**: Minimap with blips, wanted stars, mission panel, health/armour, money/REP, weapon/ammo, speedometer, radio, clock, location, dialogue
- **WebAudio Synthesis**: 3 procedural radio stations, SFX for shooting, engines, horns, explosions
- **Save/Load**: 3 save slots with full state persistence
- **Photo Mode**: `?shot=chase|start|foot|coast&seed=1` for staged screenshots

## Run It

```bash
# Serve the game
node serve.ts
# Open http://localhost:8080
```

Or with Python:
```bash
cd game && python3 -m http.server 8080
```

## Screenshots

Generate competition screenshots:
```bash
# Run the shot helper (requires Playwright + headless Chrome)
node .scratch/take-shots.js
```

Shots:
- `1-chase.jpg` — Police chase at wanted 4, Falcon GT + 4 interceptors + helicopter
- `2-start.jpg` — Start screen with logo, menu, character roster, HOW TO PLAY panel
- `3-foot.jpg` — On-foot combat with pedestrians and traffic
- `4-coast.jpg` — Coastal drive at sunset with ferris wheel

## Build

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

Produces `out/` with `game/`, `screenshots/`, and `dossier.json`.

## Controls

| Key | Action |
|-----|--------|
| WASD | Move / Drive |
| Shift | Sprint |
| Mouse | Look / Aim |
| Left Click | Shoot |
| F | Enter/Exit Vehicle |
| E | Interact |
| Space | Handbrake (driving) |
| V | Switch Camera |
| 1/2/3 | Switch Weapon |
| Esc | Pause Menu |

## Credits

Built for make.fun gta6-01 "Make GTA 6" competition.
Three.js r160 (vendored).
All code, design, and assets original.
