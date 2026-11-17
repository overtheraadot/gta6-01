// DUSKPORT — Neon Getaway: boot, game loop, camera, save.
// Wires the canvas, input, save file and the main loop; every other module
// plugs in here. The loop runs at the display's refresh rate, updates the
// world while playing, and draws the city, the people, the cars, the HUD and
// whichever screen (title, pause, busted, win) is showing.

'use strict';

const Game = {
  canvas: null, ctx: null,
  state: 'menu', // menu | howto | playing | paused | gameover | won
  gameoverKind: 'wasted',
  time: 0, frame: 0,
  cam: { x: 0, y: 0, visible(x, y, w, h) { return x + w > this.x - 80 && x < this.x + 1360 && y + h > this.y - 80 && y < this.y + 880; } },
  hasSave: false,
  saveTimer: 0,
  shotMode: false,

  mouseWorld() {
    const r = this.canvas.getBoundingClientRect();
    const sx = (Input.mouse.x - r.left) * (1280 / r.width);
    const sy = (Input.mouse.y - r.top) * (800 / r.height);
    return { x: sx + this.cam.x, y: sy + this.cam.y };
  },

  mouseScreen() {
    const r = this.canvas.getBoundingClientRect();
    return {
      x: (Input.mouse.x - r.left) * (1280 / r.width),
      y: (Input.mouse.y - r.top) * (800 / r.height),
    };
  },

  saveKey: 'duskport-save-v1',

  save() {
    try {
      const data = {
        cash: Player.cash, mission: Missions.index, armor: Player.armor,
        caches: Object.keys(Missions.cachesTaken).map(Number),
        health: Player.health,
      };
      window.localStorage.setItem(this.saveKey, JSON.stringify(data));
      this.hasSave = true;
    } catch (e) {}
  },

  load() {
    try {
      const raw = window.localStorage.getItem(this.saveKey);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) { return null; }
  },

  newGame() {
    Player.reset(Landmarks.garage.x, Landmarks.garage.y + 170);
    Traffic.reset(); Pedestrians.reset(); Police.reset(); Combat.reset();
    Wanted.reset(); Missions.reset();
    this.state = 'playing';
    this.save();
    Toasts.push('Welcome to Duskport, Vex. First job: steal a car.');
  },

  continueGame() {
    const s = this.load();
    if (!s) { this.newGame(); return; }
    Player.reset(Landmarks.garage.x, Landmarks.garage.y + 170);
    Traffic.reset(); Pedestrians.reset(); Police.reset(); Combat.reset();
    Wanted.reset(); Missions.reset();
    Player.cash = s.cash || 0; Player.armor = s.armor || 0; Player.health = s.health || 100;
    for (const i of (s.caches || [])) Missions.cachesTaken[i] = true;
    Missions.startMission(Math.min(s.mission || 0, MISSION_DEFS.length - 1));
    this.state = 'playing';
    Toasts.push('Welcome back to Duskport, Vex.');
  },

  respawn() {
    const lost = Player.busted ? Math.floor(Player.cash * 0.1) : 0;
    Player.cash -= lost;
    Player.reset(Landmarks.garage.x, Landmarks.garage.y + 170);
    Police.reset(); Combat.reset();
    Wanted.reset();
    Missions.restartCurrent();
    this.state = 'playing';
    if (lost > 0) Toasts.push('Bail paid: -$' + lost + '. The crew still needs you.');
    else Toasts.push('Back on the street. The city is waiting.');
    this.save();
  },

  clickMenu(sx, sy) {
    for (const b of Hud.menuButtons) {
      if (sx >= b.x && sx <= b.x + b.w && sy >= b.y && sy <= b.y + b.h) {
        if (b.action === 'new') this.newGame();
        else if (b.action === 'continue') this.continueGame();
        else if (b.action === 'howto') this.state = 'howto';
        else if (b.action === 'menu') this.state = 'menu';
        else if (b.action === 'resume') this.state = 'playing';
        else if (b.action === 'respawn') this.respawn();
        else if (b.action === 'freeroam') { this.state = 'playing'; Missions.done = true; }
        return true;
      }
    }
    return false;
  },

  update(dt) {
    this.time += dt;
    Toasts.update(dt);
    if (this.state === 'playing') {
      // Exit the car.
      if (Player.car && Input.wasPressed('KeyE')) Player.exitCar();
      if (Input.wasPressed('KeyP') || Input.wasPressed('Escape')) { this.state = 'paused'; this.save(); return; }
      if (Input.wasPressed('KeyM')) {
        const m = AudioSys.toggleMute();
        Toasts.push(m ? 'Sound off' : 'Sound on');
      }
      Player.update(dt);
      const p = Player.pos();
      Traffic.maintain(p.x, p.y);
      Traffic.update(dt, this.time, p.x, p.y);
      Pedestrians.update(dt);
      Police.update(dt, this.time);
      Wanted.update(dt);
      Missions.update(dt);
      Combat.update(dt);
      AudioSys.music(dt);
      AudioSys.setEngine(Player.car ? Player.car.speed / 560 : 0, !!Player.car);
      // Camera follows the player with a little look-ahead.
      const look = Player.car ? 0.25 : 0.1;
      const tx = p.x + (Player.car ? Math.cos(Player.car.angle) * 90 * look * 4 : 0) - 640;
      const ty = p.y + (Player.car ? Math.sin(Player.car.angle) * 90 * look * 4 : 0) - 400;
      this.cam.x = lerp(this.cam.x, clamp(tx, -80, WORLD_W - 1200), clamp(dt * 5, 0, 1));
      this.cam.y = lerp(this.cam.y, clamp(ty, -80, WORLD_H - 720), clamp(dt * 5, 0, 1));
      // Death / busted transitions.
      if (Player.dead) { this.gameoverKind = 'wasted'; this.state = 'gameover'; AudioSys.setEngine(0, false); }
      if (Player.busted) { this.gameoverKind = 'busted'; this.state = 'gameover'; AudioSys.setEngine(0, false); }
      this.saveTimer += dt;
      if (this.saveTimer > 12) { this.saveTimer = 0; this.save(); }
    } else if (this.state === 'menu' || this.state === 'howto' || this.state === 'paused' || this.state === 'gameover' || this.state === 'won') {
      if (Input.wasPressed('KeyP') && this.state === 'paused') this.state = 'playing';
      if (Input.wasPressed('Escape') && this.state === 'paused') this.state = 'playing';
    }
    // Keep the menu backdrop alive.
    if (this.state === 'menu' || this.state === 'won') {
      const p = Player.pos();
      Traffic.update(dt, this.time, p.x, p.y);
    }
  },

  draw() {
    const ctx = this.ctx, cam = this.cam;
    if (this.state === 'menu') { Hud.drawMenu(ctx, this.hasSave); return; }
    if (this.state === 'howto') { Hud.drawHowTo(ctx); return; }
    if (this.state === 'won') { Hud.drawWin(ctx); return; }
    City.draw(ctx, cam, this.time);
    Missions.draw(ctx, cam, this.time);
    Traffic.draw(ctx, cam, this.time);
    Police.draw(ctx, cam, this.time);
    Pedestrians.draw(ctx, cam);
    Player.draw(ctx, cam);
    Combat.draw(ctx, cam);
    if (this.state === 'playing') Hud.drawPlaying(ctx, this.time);
    else if (this.state === 'paused') { Hud.drawPlaying(ctx, this.time); Hud.drawPaused(ctx); }
    else if (this.state === 'gameover') { Hud.drawPlaying(ctx, this.time); Hud.drawGameOver(ctx, this.gameoverKind); }
  },

  loop(ts) {
    const now = ts / 1000;
    let dt = Math.min(0.05, now - (this._last || now));
    this._last = now;
    this.frame++;
    this.update(dt);
    this.draw();
    Input.pressed = {};
    Input.mouse.clicked = false;
    window.requestAnimationFrame((t) => this.loop(t));
  },

  init() {
    this.canvas = document.getElementById('game');
    this.ctx = this.canvas.getContext('2d');
    City.build();
    this.hasSave = !!this.load();
    // Input wiring.
    window.addEventListener('keydown', (e) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
      if (!Input.keys[e.code]) Input.pressed[e.code] = true;
      Input.keys[e.code] = true;
      AudioSys.init();
    });
    window.addEventListener('keyup', (e) => { Input.keys[e.code] = false; });
    this.canvas.addEventListener('mousemove', (e) => { Input.mouse.x = e.clientX; Input.mouse.y = e.clientY; });
    this.canvas.addEventListener('mousedown', (e) => {
      Input.mouse.x = e.clientX; Input.mouse.y = e.clientY;
      Input.mouse.down = true; Input.mouse.clicked = true;
      AudioSys.init();
      if (this.state !== 'playing') {
        const m = this.mouseScreen();
        this.clickMenu(m.x, m.y);
      }
    });
    window.addEventListener('mouseup', () => { Input.mouse.down = false; });
    // Fresh world for the title backdrop, then the staged scene if asked.
    Player.reset(Landmarks.garage.x, Landmarks.garage.y + 170);
    Traffic.reset(); Pedestrians.reset(); Police.reset(); Combat.reset();
    Wanted.reset(); Missions.reset();
    this.cam.x = clamp(Player.x - 640, -80, WORLD_W - 1200);
    this.cam.y = clamp(Player.y - 400, -80, WORLD_H - 720);
    this.shotMode = !!Shots.read();
    if (this.shotMode) {
      // Screenshots: the canvas fills the 1280x800 window exactly, no hint bar.
      const hint = document.getElementById('hint');
      if (hint) hint.style.display = 'none';
      this.canvas.style.width = '1280px';
      this.canvas.style.height = '800px';
    }
    if (this.shotMode) Shots.apply();
    if (this.shotMode && this.state === 'playing') {
      // Fast-forward the scene so the capture is mid-action, not frame zero:
      // traffic rolling, police closing in, the camera settled on the player.
      // The driving scenes hold W so the car is at speed when the shot lands.
      // The heist fast-forwards only briefly — the cops are already close.
      const p0 = Player.pos();
      this.cam.x = clamp(p0.x - 640, -80, WORLD_W - 1200);
      this.cam.y = clamp(p0.y - 400, -80, WORLD_H - 720);
      if (Shots.name === 'drive' || Shots.name === 'chase') Input.keys['KeyW'] = true;
      const steps = Shots.name === 'heist' ? 50 : (Shots.name === 'chase' ? 70 : 70);
      for (let i = 0; i < steps; i++) this.update(1 / 60);
      Input.keys['KeyW'] = false;
      Input.pressed = {};
    }
    window.__duskport = this;
    window.requestAnimationFrame((t) => this.loop(t));
  },
};

document.addEventListener('DOMContentLoaded', () => Game.init());
