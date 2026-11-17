// DUSKPORT — Neon Getaway: staged screenshot scenes.
// The game reads ?shot=<scene>&seed=<n> from its URL and sets up a fixed,
// lively moment of play — the same scenes the maker screenshots for the
// entry. Nothing here changes how the game plays; it only places the player,
// traffic and police so a single frame shows the city at its best.

'use strict';

const Shots = {
  name: null,

  read() {
    try {
      const q = new URLSearchParams(window.location.search);
      this.name = q.get('shot');
      const seed = parseInt(q.get('seed') || '1', 10);
      if (!Number.isNaN(seed)) reseed(1000 + seed);
    } catch (e) { this.name = null; }
    return this.name;
  },

  // Put a sports car under the player west of Neon Row, traffic rolling past.
  stageDrive() {
    const car = Traffic.spawnCar(800, 480, false, 1, 'sports');
    car.npc = false; car.driver = false; car.hp = 100; car.speed = 300; car.color = '#ff2e88';
    Player.car = car; Player.onFoot = false;
    Player.x = car.x; Player.y = car.y;
    Traffic.spawnCar(1500, 480, false, 1, 'taxi');
    Traffic.spawnCar(2000, 480, false, -1, 'sedan');
    Traffic.spawnCar(1440, 220, true, 1, 'van');
    Traffic.spawnCar(1440, 760, true, -1, 'truck');
    Traffic.spawnCar(2100, 480, false, 1, 'sedan');
    // Stage the run to the Docks: a mission that cannot complete itself
    // while the car coasts east, so the shot keeps its objective banner.
    Missions.startMission(2);
    Player.cash = 850;
    Wanted.reset();
  },

  // Three stars, three cruisers closing in, the player mid-escape.
  stageChase() {
    const car = Traffic.spawnCar(1120, 1120, true, 1, 'sports');
    car.npc = false; car.driver = false; car.hp = 78; car.speed = 380; car.color = '#ff2e88';
    Player.car = car; Player.onFoot = false;
    Player.x = car.x; Player.y = car.y;
    Wanted.heat = 55;
    Police.cruisers.push(
      { x: 1120, y: 880, angle: Math.PI / 2, speed: 430, hp: 80, type: CAR_TYPES.cruiser, typeName: 'cruiser', color: '#1d3a8a', npc: false, ramCooldown: 0 },
      { x: 900, y: 1120, angle: 0, speed: 410, hp: 80, type: CAR_TYPES.cruiser, typeName: 'cruiser', color: '#1d3a8a', npc: false, ramCooldown: 0 },
      { x: 1120, y: 1380, angle: -Math.PI / 2, speed: 400, hp: 80, type: CAR_TYPES.cruiser, typeName: 'cruiser', color: '#1d3a8a', npc: false, ramCooldown: 0 },
    );
    Traffic.spawnCar(800, 1104, false, 1, 'sedan');
    Traffic.spawnCar(1440, 1136, false, -1, 'taxi');
    Missions.startMission(3);
    Missions.stage = 1; Missions.stageTimer = 32;
  },

  // The Vault job: Vex on foot at the Meridian Vault, two stars, cops closing.
  stageHeist() {
    Player.x = Landmarks.vault.x + 30; Player.y = Landmarks.vault.y + 150;
    Player.onFoot = true; Player.car = null;
    Player.ammo = 12; Player.armor = 50;
    Wanted.heat = 38;
    Police.cruisers.push(
      { x: 1760, y: 800, angle: Math.PI, speed: 300, hp: 80, type: CAR_TYPES.cruiser, typeName: 'cruiser', color: '#1d3a8a', npc: false, ramCooldown: 0 },
    );
    Police.cops.push(
      { x: Landmarks.vault.x - 260, y: Landmarks.vault.y + 190, hp: 50, speed: 195, touch: 0, shootTimer: 1.2, angle: 0 },
      { x: Landmarks.vault.x + 300, y: Landmarks.vault.y + 120, hp: 50, speed: 195, touch: 0, shootTimer: 0.7, angle: 0 },
    );
    Missions.startMission(4);
    Missions.stage = 1; Missions.holdTimer = 1.4;
    Player.cash = 4850;
  },

  apply() {
    if (!this.name) return false;
    Game.state = 'playing';
    if (this.name === 'drive') this.stageDrive();
    else if (this.name === 'chase') this.stageChase();
    else if (this.name === 'heist') this.stageHeist();
    else if (this.name === 'start') Game.state = 'menu';
    return true;
  },
};
