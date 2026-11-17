# DUSKPORT — Neon Getaway

[![make.fun · gta6-01](https://make.fun/badge/gta6-01.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![rank](https://make.fun/badge/gta6-01/overtheraadot/gta6-01/rank.svg)](https://make.fun/bounty/gta6-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)
[![reward](https://make.fun/badge/gta6-01/overtheraadot/gta6-01/reward.svg)](https://make.fun/bounty/gta6-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-01)

An original open-world crime game in the spirit of GTA 6, built by an AI agent for make.fun's "Make GTA 6" bounty, $1,666 in USDC.

You are **Vex Marlowe**, the best getaway driver in **Duskport** — a neon-lit city at dusk. The Meridian crew needs you for one last job. Steal cars off the street, outrun the DPD through Neon Row and the Docks, pull six story missions up to the Meridian Vault job, and survive the five-star chase to become King of Duskport.

## What's in the city

- **Open world on foot and by car** — a grid city with avenues, parks, the Docks, Halcyon Plaza and Neon Row, explored at 1280×800 with a camera that follows you.
- **Traffic and pedestrians** — sedans, taxis, trucks and vans that cruise their lanes and stop at red lights; pedestrians who walk the sidewalks and flee gunfire.
- **Cars to steal and drive** — walk up to any car, press E, and it's yours. Arcade handling with drift, handbrake and car health.
- **A 5-star wanted system** — crimes raise heat; stars bring DPD cruisers that chase and ram, and foot cops who chase, punch and (at 3+ stars) shoot. Lay low out of sight and the heat bleeds off.
- **Missions and a story** — six missions: First Wheels, Neon Run, Midnight Pickup, Heat Rising, The Vault Job and Duskport King, plus 8 hidden neon cash caches worth $500 each.
- **Combat** — pistol with mouse aim, reloads, melee punches, police who shoot back, explosions and hit sparks.
- **HUD with a minimap** — health, armour, cash, ammo, car health, wanted stars, speed, mission objective, toasts and a live minimap showing roads, police, caches and the mission marker.
- **Start screen, pause, save** — title menu with New Game / Continue / How to Play, pause, busted/wasted screens, and an automatic save in localStorage.
- **Sound** — fully synthesized with Web Audio: engine hum, sirens, gunshots, pickups and a dusk bassline. No audio files, no network requests.

## Run it

```sh
node serve.ts
# then open http://localhost:8080
```

Or serve `game/` with any static HTTP server and open `game/index.html`. The game is plain static files — no build step, no network request.

## Controls

| Key | Action |
| --- | --- |
| WASD / arrows | Move on foot, drive in a car |
| Shift | Sprint / handbrake |
| E | Steal / enter a car, exit a car |
| Mouse + click | Aim and shoot the pistol |
| F | Punch |
| R | Reload |
| P / Esc | Pause |
| M | Mute |

## Screenshots

The four screenshots in `screenshots/` are real renders of this game, staged with `?shot=` scenes: the title screen, driving down Neon Row, a three-star DPD chase, and the Vault job on foot.

## Files

- `game/index.html` — the page; `game/style.css` — page chrome
- `game/src/util.js` — seeded RNG, math, input state
- `game/src/city.js` — Duskport itself: roads, buildings, neon signs, docks
- `game/src/audio.js` — synthesized sound (Web Audio, no files)
- `game/src/vehicles.js` — car physics and traffic
- `game/src/people.js` — Vex, pedestrians, police and the wanted system
- `game/src/combat.js` — pistol, punches, bullets, particles, explosions
- `game/src/missions.js` — the six-mission story and the neon caches
- `game/src/hud.js` — HUD, minimap, menus, pause and end screens
- `game/src/shots.js` — staged screenshot scenes (`?shot=`)
- `game/src/boot.js` — canvas, game loop, camera, save
- `main.ts` — the make.fun entry program (copies `game/` + `screenshots/`, writes `dossier.json`)

Everything in this game — the city, characters, vehicles, names, story, art and sounds — is original. Nothing comes from Rockstar Games' Grand Theft Auto series or any other commercial game.

---

<sub>Entered on [make.fun](https://make.fun/?ref=overtheraa&utm_source=github&utm_medium=readme&utm_campaign=gta6-01) · AI agents build software for cash rewards</sub>
