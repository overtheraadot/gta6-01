# DUSKPORT — Neon Getaway

[![make.fun](https://img.shields.io/badge/make.fun-Make%20GTA%206-ff2e88)](https://make.fun/bounty/gta6-01)
[![prize](https://img.shields.io/badge/prize-%241%2C666%20USDC-ffd166)](https://make.fun/bounty/gta6-01)
[![license](https://img.shields.io/badge/license-MIT-37e08b)](./LICENSE)
[![offline](https://img.shields.io/badge/plays-offline-22d3ee)](./game/index.html)

An original open-world crime game built for the make.fun **"Make GTA 6"** bounty
($1,666 total, 1st $500). Dusk falls on the Industrial District of **Duskport**: one
contact, one stolen getaway car, one way out — lose the heat and make the harbour yours.

**Play it:** serve `game/` with any static server (`node serve.ts`, then open
http://localhost:8080) — it runs fully offline, no network requests at runtime.

## The story

Rook, wheelman for hire, meets **Mara Voss** at Dockside Bar. The job: tool up in the
alley, lift the midnight coupe, escape the police cordon to the north, lose the heat and
slip back to the safehouse. After the heist, side jobs keep coming — courier runs and
docks shakedowns — and Mara fights beside you once you hand her a weapon.

## What's in the world

- **A city on foot and by car** — grid streets, a beach coast with palms and sea, a hotel
  tower, a parking garage, neon storefronts with original names (Neon Noodle, Volt Garage,
  Kairo Coffee, Night Market…), rooftop water towers and antennas.
- **Traffic and pedestrians** — cars loop the road grid, crowds walk the sidewalks and
  flee gunfire and speeding cars.
- **Steal cars and drive** — detailed cars with cabins, glass, turning wheels and glowing
  lights; hot-wire any parked car (the law notices).
- **Wanted system + police** — 1–5 stars, patrol cars with flashing light bars chase and
  ram, foot cops move in when the heat is high; lay low to lose the tail.
- **Missions + story** — a five-beat heist chain with a beacon, banners and a mission
  tracker, then repeatable side jobs.
- **Combat** — knife and pistol pickups, muzzle flash and tracers, armed rival crews, and
  a give-weapon-to-ally interaction (Q) so Mara fights alongside you.
- **HUD** — cash, health, weapon + ammo, wanted stars, speed, and a **circular minimap**
  with the mission marker, police, traffic and enemies.
- **Start + save** — title screen with Rook front and centre, progress auto-saves at the
  safehouse, Continue on return. Synthesized WebAudio only: engine, sirens, gunshots and
  a dusk synthwave loop — no audio files.

## Controls

| Key | Action |
| --- | --- |
| WASD | Move / drive (camera-relative) |
| SHIFT | Run |
| E | Interact / steal the getaway car |
| F | Enter / exit car |
| Mouse click | Shoot (pistol) / swing (knife) — drag to look around |
| Q | Give your pistol to Mara (ally) |
| ESC | Pause · M mute |

## Originality

Everything here is original: the city of Duskport, Rook, Mara, the story, the names, the
art and the music. No Rockstar Games names, characters, maps or assets — nothing from
Grand Theft Auto. Three.js is vendored under `game/vendor/` (MIT).

## Layout

- `game/` — the playable game (static files, `index.html` + `src/` modules)
- `game/src/` — one file per system: `main.js` (loop/camera/save), `city.js`,
  `character.js` (painted-face humans), `vehicles.js` (cars/traffic/police),
  `pedestrians.js`, `missions.js`, `combat.js`, `hud.js` (minimap), `audio.js`,
  `shots.js` (screenshot staging)
- `screenshots/` — 4 real renders of the game: start, getaway chase, docks combat, city drive
- `main.ts` — the make.fun program: copies `game/` + `screenshots/` to `/output` and
  writes `dossier.json`
- `LICENSE` — MIT
