// DUSKPORT — Neon Getaway. Main game: dusk open-world crime game.
// Original city "Duskport", hero "Rook", contact "Mara Voss". No Rockstar content.
import * as THREE from 'three';
import { buildCity, WORLD } from './city.js';
import { buildHuman, animateHuman } from './character.js';
import { buildCar, placeCar, driveCar, spawnTraffic, updateTraffic, spawnPolice, updatePolice, collideCircle } from './vehicles.js';
import { spawnPedestrians, updatePedestrians, spawnFootCop, updateFootCop } from './pedestrians.js';
import { MissionRunner, SIDE_JOBS } from './missions.js';
import { Combat, buildPistol, buildKnife } from './combat.js';
import { Hud } from './hud.js';
import { GameAudio } from './audio.js';
import { getShotParam, stageShot } from './shots.js';

const $ = (id) => document.getElementById(id);
const SAVE_KEY = 'duskport-save-v1';
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function duskSkyTexture() {
  const c = document.createElement('canvas'); c.width = 16; c.height = 512;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, '#0b1030');
  grad.addColorStop(0.45, '#3a2358');
  grad.addColorStop(0.62, '#8a3a5c');
  grad.addColorStop(0.72, '#ff7a3c');
  grad.addColorStop(0.78, '#ffb35c');
  grad.addColorStop(1, '#2a1a2e');
  g.fillStyle = grad; g.fillRect(0, 0, 16, 512);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

class Game {
  constructor() {
    this.state = 'menu'; // menu | play | paused | dead
    this.time = 0;
    this.cash = 120;
    this.health = 100;
    this.wanted = 0;
    this.wantedTimer = 0;
    this.crimeCooldown = 0;
    this.inCar = false;
    this.playerCar = null;
    this.camYaw = 0;
    this.camDrag = 0;
    this.keys = {};
    this.mouseDown = false;
    this.mouseMoved = 0;
    this.policeCars = [];
    this.footCops = [];
    this.parkedCars = [];
    this.heatLoss = 0;
    this.hud = new Hud();
    this.audio = new GameAudio();
    window.__gameError = null;
    window.__gameReady = false;
  }

  async init() {
    const setProgress = (p, label) => {
      $('loading-fill').style.width = p + '%';
      if (label) $('loading-label').textContent = label;
    };
    const tick = () => new Promise((r) => setTimeout(r, 30));
    try {
      setProgress(8, 'LOADING DUSKPORT…');
      const canvas = $('scene');
      this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
      await tick();

      this.scene = new THREE.Scene();
      this.scene.fog = new THREE.Fog('#241a33', 60, 240);
      // Dusk sky dome.
      const sky = new THREE.Mesh(
        new THREE.SphereGeometry(420, 24, 16),
        new THREE.MeshBasicMaterial({ map: duskSkyTexture(), side: THREE.BackSide, fog: false }),
      );
      this.scene.add(sky);
      // Low dusk sun disc.
      const sun = new THREE.Mesh(new THREE.CircleGeometry(18, 24),
        new THREE.MeshBasicMaterial({ color: '#ffb35c', fog: false }));
      sun.position.set(-180, 42, -260); sun.lookAt(0, 30, 0);
      this.scene.add(sun);
      setProgress(22, 'LIGHTING THE DUSK…');
      await tick();

      // Lights: warm low sun + purple dusk ambient, bright enough to read on a phone.
      const hemi = new THREE.HemisphereLight('#8a7ac8', '#2a2018', 1.25);
      this.scene.add(hemi);
      const sunLight = new THREE.DirectionalLight('#ffb070', 1.9);
      sunLight.position.set(-90, 70, -60);
      sunLight.castShadow = true;
      sunLight.shadow.mapSize.set(2048, 2048);
      sunLight.shadow.camera.left = -130; sunLight.shadow.camera.right = 130;
      sunLight.shadow.camera.top = 130; sunLight.shadow.camera.bottom = -130;
      sunLight.shadow.camera.far = 400;
      this.scene.add(sunLight);
      // Neon glow points at key spots.
      for (const [x, z, color] of [[-77, -33, '#ff2e88'], [55, -55, '#22d3ee'], [33, -11, '#ffd166'], [0, 100, '#ff7a3c']]) {
        const pl = new THREE.PointLight(color, 30, 26, 1.6);
        pl.position.set(x, 4.5, z);
        this.scene.add(pl);
      }
      // Warm fill light on the start-screen showcase so Rook's face reads clearly.
      const fill = new THREE.PointLight('#ffe0b8', 26, 16, 1.4);
      fill.position.set(1.5, 3.2, 4.6);
      this.scene.add(fill);
      setProgress(38, 'BUILDING DUSKPORT…');
      await tick();

      this.city = buildCity(this.scene);
      setProgress(55, 'PARKING THE CARS…');
      await tick();

      // Hero: Rook, charcoal jacket, styled hair, painted face.
      this.hero = buildHuman({
        skin: '#c98d64', jacket: '#23262e', shirt: '#d8d3c8', pants: '#2c3a55',
        shoes: '#14100c', hair: '#17110c', faceSeed: 7,
      });
      this.hero.group.position.set(0, 0, 8);
      this.scene.add(this.hero.group);
      this.playerPos = this.hero.group.position;
      this.playerHeading = Math.PI; // face the menu camera
      this.walkPhase = 0;

      // Parked cars (stealable). The midnight coupe is the mission getaway car.
      const parked = [
        { type: 'coupe', color: '#b02030', x: 33, z: -22, mission: true },
        { type: 'sedan', color: '#2050b0', x: -44, z: 22 },
        { type: 'taxi', color: '#f2c200', x: 22, z: -66 },
        { type: 'van', color: '#2a8a4a', x: 66, z: 44 },
      ];
      for (const p of parked) {
        const car = buildCar(p.type, p.color);
        placeCar(car, p.x, p.z, p.mission ? Math.PI / 2 : (Math.random() * Math.PI * 2));
        car.parked = true; car.missionCar = !!p.mission;
        this.scene.add(car.group);
        this.parkedCars.push(car);
      }
      this.traffic = spawnTraffic(this.scene, 10);
      this.peds = spawnPedestrians(this.scene, 14);
      setProgress(72, 'CASTING THE CREW…');
      await tick();

      this.combat = new Combat(this.scene, this.audio, {
        onCash: (n) => { this.cash += n; this.hud.setCash(this.cash); },
        onToast: (m) => this.hud.toast(m),
        onHeal: (n) => { this.health = Math.min(100, this.health + n); this.hud.setHealth(this.health); },
        onDamage: (n) => this.damagePlayer(n),
        onHitMarker: () => this.hud.hitFlash(),
      });
      // Stash pickups: pistol + knife on the road by the garage, medkit at the safehouse, ammo by the docks.
      this.combat.spawnPickup('pistol', 20, -22);
      this.combat.spawnPickup('knife', 14, -22);
      this.combat.spawnPickup('health', -22, 0);
      this.combat.spawnPickup('ammo', -77, 86);

      this.missions = new MissionRunner(this.scene, this.city, {
        onMission: (m) => this.hud.setMission(m.title, m.text),
        onBanner: (t, s) => this.hud.banner(t, s),
        onToast: (m) => this.hud.toast(m),
        onMeetMara: () => {
          const at = this.missions.targetPos();
          const mara = this.combat.spawnAlly(at.x + 2, at.z + 2);
          this.hud.toast('MARA joined you — press Q near her to hand her a weapon');
          this.audio.missionDone();
        },
        onToolUp: () => {
          this.combat.spawnGang(30, -22, 2);
          this.hud.toast('Rival crew is guarding the coupe!');
        },
        onEscape: () => { this.addWanted(1); this.hud.toast('Cordon broken — now lose the tail'); },
        onStoryComplete: () => {
          this.cash += 1500;
          this.hud.setCash(this.cash);
          this.hud.banner('HEIST COMPLETE', 'The getaway is yours — $1,500 banked');
          this.audio.missionDone();
          this.saveGame();
        },
        onSideJobDone: (pay) => {
          this.cash += pay;
          this.hud.setCash(this.cash);
          this.hud.banner('JOB DONE', '+$' + pay + ' — Mara is impressed');
          this.audio.missionDone();
          this.saveGame();
        },
      });
      setProgress(88, 'TUNING THE SOUND…');
      await tick();

      this.camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 900);
      this.clock = new THREE.Clock();
      this.bindInput();
      this.bindButtons();
      this.loadSaveButton();
      setProgress(100, 'DUSKPORT IS READY');
      await tick();
      $('loading').classList.add('hidden');
      $('start-content').classList.remove('hidden');

      // Screenshot staging (?shot=...) — the live game, posed by the maker.
      const shot = getShotParam();
      if (shot) this.timeScale = 40;
      if (shot && shot !== 'start') {
        stageShot(shot, this);
      }
      this.renderer.setAnimationLoop(() => this.frame());
      window.__gameReady = true;
    } catch (err) {
      window.__gameError = String(err && err.stack || err);
      $('loading-label').textContent = 'FAILED TO LOAD — ' + String(err && err.message || err);
      throw err;
    }
  }

  // ---- save / load ----
  saveGame() {
    try {
      const m = this.missions.current();
      localStorage.setItem(SAVE_KEY, JSON.stringify({
        cash: this.cash, health: this.health,
        mission: this.missions.index, side: this.missions.sideIndex,
        x: this.playerPos.x, z: this.playerPos.z, weapon: this.combat.weapon, ammo: this.combat.ammo,
        savedAt: Date.now(),
      }));
    } catch (e) { /* storage unavailable */ }
  }
  loadSaveButton() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      $('btn-continue').classList.remove('hidden');
      $('continue-label').textContent = '$' + s.cash + ' · ' + (s.mission >= 0 ? 'MISSION ' + (s.mission + 1) : 'FREE ROAM');
      $('btn-continue').onclick = () => {
        this.cash = s.cash; this.health = s.health || 100;
        this.hud.setCash(this.cash); this.hud.setHealth(this.health);
        this.beginPlay();
        this.teleportOnFoot(s.x || 0, s.z || 11, Math.PI);
        if (s.weapon === 'pistol' || s.weapon === 'knife') this.equipWeapon(s.weapon, s.ammo || 0);
        if (s.mission >= 0) this.missions.setMission(s.mission);
        else { this.missions.index = -1; this.missions.startSideJob(); }
      };
    } catch (e) { /* ignore */ }
  }

  // ---- UI wiring ----
  bindButtons() {
    $('btn-start').onclick = () => { this.audio.init(); this.beginPlay(); };
    $('btn-fullscreen').onclick = () => {
      const el = document.documentElement;
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen();
    };
    $('btn-resume').onclick = () => this.setPaused(false);
    $('btn-save-quit').onclick = () => { this.saveGame(); this.quitToMenu(); };
    $('btn-retry').onclick = () => this.respawn();
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });
  }
  bindInput() {
    window.addEventListener('keydown', (e) => {
      this.keys[e.code] = true;
      if (e.code === 'KeyM') { const m = this.audio.toggleMute(); this.hud.toast(m ? 'Sound muted' : 'Sound on'); }
      if (e.code === 'Escape' && this.state === 'play') this.setPaused(true);
      else if (e.code === 'Escape' && this.state === 'paused') this.setPaused(false);
      if (e.code === 'KeyE' && this.state === 'play') this.interact();
      if (e.code === 'KeyF' && this.state === 'play') this.toggleCar();
      if (e.code === 'KeyQ' && this.state === 'play') this.giveWeapon();
      if (['Space', 'ArrowUp', 'ArrowDown'].includes(e.code)) e.preventDefault();
    });
    window.addEventListener('keyup', (e) => { this.keys[e.code] = false; });
    const cv = $('scene');
    cv.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return;
      this.mouseDown = true; this.mouseMoved = 0; this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mousemove', (e) => {
      if (!this.mouseDown) return;
      const dx = e.clientX - (this.lastMouse?.x ?? e.clientX);
      const dy = e.clientY - (this.lastMouse?.y ?? e.clientY);
      this.mouseMoved += Math.abs(dx) + Math.abs(dy);
      this.camDrag = clamp(this.camDrag - dx * 0.004, -0.9, 0.9);
      this.lastMouse = { x: e.clientX, y: e.clientY };
    });
    window.addEventListener('mouseup', (e) => {
      if (e.button !== 0) return;
      if (this.mouseDown && this.mouseMoved < 6 && this.state === 'play' && !this.inCar) {
        this.tryAttack();
      }
      this.mouseDown = false;
    });
    // Hold-to-fire while the button stays down.
    setInterval(() => {
      if (this.mouseDown && this.state === 'play' && !this.inCar && this.combat.weapon === 'pistol') this.tryAttack();
    }, 300);
  }

  beginPlay() {
    this.state = 'play';
    $('start-screen').classList.add('hidden');
    $('hud').classList.remove('hidden');
    this.hud.setCash(this.cash);
    this.hud.setHealth(this.health);
    this.hud.setStars(this.wanted);
    this.hud.setWeapon('FISTS', '👊', null);
    const m = this.missions.current();
    if (m) this.hud.setMission(m.title, m.text);
    if (!window.__shotStaged) this.hud.banner('DUSKPORT', 'Meet Mara at Dockside Bar');
  }
  quitToMenu() {
    this.state = 'menu';
    this.setPaused(false);
    $('hud').classList.add('hidden');
    $('start-screen').classList.remove('hidden');
    this.loadSaveButton();
    if (this.inCar) this.exitCar();
    this.teleportOnFoot(0, 8, Math.PI);
  }
  setPaused(p) {
    this.state = p ? 'paused' : 'play';
    $('pause-menu').classList.toggle('hidden', !p);
  }
  respawn() {
    $('dead-screen').classList.add('hidden');
    this.health = 100; this.wanted = 0; this.clearPolice();
    this.hud.setHealth(100); this.hud.setStars(0); this.hud.setHeat('');
    if (this.inCar) this.exitCar();
    this.teleportOnFoot(0, 11, Math.PI);
    this.state = 'play';
    this.hud.banner('BACK ON YOUR FEET', 'The safehouse patch-up is free — this time');
  }

  // ---- player actions ----
  teleportOnFoot(x, z, heading) {
    if (this.inCar) this.exitCar();
    this.playerPos.set(x, 0, z);
    this.playerHeading = heading;
    this.hero.group.position.set(x, 0, z);
    this.hero.group.rotation.y = heading;
    this.camYaw = heading;
  }
  teleportIntoCar(x, z, heading, type, color, useMissionCar = true) {
    let car = useMissionCar ? this.parkedCars.find((c) => c.missionCar) : null;
    if (!car) { car = buildCar(type || 'sedan', color || '#b02030'); this.scene.add(car.group); this.parkedCars.push(car); }
    placeCar(car, x, z, heading);
    car.parked = false;
    this.enterCar(car);
  }
  enterCar(car) {
    this.playerCar = car; this.inCar = true;
    car.parked = false;
    this.hero.group.visible = false;
    this.audio.setEngine(0, true);
    this.hud.showCrosshair(false);
  }
  exitCar() {
    if (!this.playerCar) return;
    const car = this.playerCar;
    const side = car.pos.clone();
    side.x += Math.cos(car.heading) * 2.4;
    side.z -= Math.sin(car.heading) * 2.4;
    collideCircle(side, 0.6, this.city.colliders);
    this.playerPos.copy(side);
    this.playerHeading = car.heading;
    this.hero.group.visible = true;
    this.hero.group.position.copy(this.playerPos);
    this.inCar = false; this.playerCar = null;
    this.audio.setEngine(0, false);
  }
  toggleCar() {
    if (this.inCar) { this.exitCar(); return; }
    let best = null, bestD = 4;
    for (const car of this.parkedCars) {
      const d = Math.hypot(car.pos.x - this.playerPos.x, car.pos.z - this.playerPos.z);
      if (d < bestD) { best = car; bestD = d; }
    }
    if (!best) { this.hud.toast('No car in reach — find a parked one'); return; }
    if (best.missionCar && this.missions.index === 2) {
      this.addWanted(2);
      this.missions.completeLiftCar();
      this.combat.spawnGang(30, -22, 2);
      this.hud.banner('CAR STOLEN', 'The whole district just heard that alarm');
      this.audio.missionDone();
    } else if (best.parked) {
      this.addWanted(1);
      this.hud.toast('Hot-wired — the owner will notice');
    }
    this.enterCar(best);
  }
  interact() {
    const m = this.missions.current();
    if (m && m.id === 'lift-car') {
      let best = null, bestD = 4.5;
      for (const car of this.parkedCars) {
        if (!car.missionCar) continue;
        const d = Math.hypot(car.pos.x - this.playerPos.x, car.pos.z - this.playerPos.z);
        if (d < bestD) { best = car; bestD = d; }
      }
      if (best) { this.toggleCar(); return; }
    }
    if (this.combat.ally) {
      const a = this.combat.ally;
      if (Math.hypot(a.pos.x - this.playerPos.x, a.pos.z - this.playerPos.z) < 3) {
        this.hud.toast('MARA: "Get the car. I will cover the street."');
        return;
      }
    }
  }
  giveWeapon() {
    if (!this.combat.ally) { this.hud.toast('Mara has not joined you yet'); return; }
    const a = this.combat.ally;
    if (Math.hypot(a.pos.x - this.playerPos.x, a.pos.z - this.playerPos.z) > 4) {
      this.hud.toast('Get closer to Mara to hand her a weapon'); return;
    }
    if (this.combat.giveWeaponToAlly()) {
      this.hud.toast('MARA is armed — she fights beside you now');
      this.audio.pickup();
      this.refreshWeaponHud();
    } else {
      this.hud.toast('You need a pistol with at least 6 rounds to share');
    }
  }
  tryAttack() {
    if (this.combat.weapon === 'pistol') {
      this.combat.playerShoot(this.camera, this.playerPos);
      this.refreshWeaponHud();
    } else if (this.combat.weapon === 'knife') {
      this.combat.playerMelee(this.playerPos, this.playerHeading);
    }
  }
  equipWeapon(w, ammo) {
    this.combat.weapon = w;
    this.combat.ammo = ammo;
    // Show it in Rook's hand.
    this.hero.parts.weaponMount.clear();
    if (w === 'pistol') this.hero.parts.weaponMount.add(buildPistol());
    if (w === 'knife') this.hero.parts.weaponMount.add(buildKnife());
    this.refreshWeaponHud();
  }
  refreshWeaponHud() {
    const w = this.combat.weapon;
    if (w === 'pistol') this.hud.setWeapon('PISTOL', '🔫', this.combat.ammo);
    else if (w === 'knife') this.hud.setWeapon('KNIFE', '🔪', null);
    else this.hud.setWeapon('FISTS', '👊', null);
    this.hud.showCrosshair(w === 'pistol' && !this.inCar);
  }
  damagePlayer(n) {
    if (this.state !== 'play') return;
    this.health -= n;
    this.hud.setHealth(this.health);
    this.hud.hitFlash();
    if (this.health <= 0) {
      this.state = 'dead';
      $('dead-screen').classList.remove('hidden');
      this.audio.setEngine(0, false);
    }
  }
  addWanted(n) {
    this.wanted = clamp(this.wanted + n, 0, 5);
    this.hud.setStars(this.wanted);
    this.crimeCooldown = 15;
    this.heatLoss = 0;
  }
  setWanted(n) { this.wanted = clamp(n, 0, 5); this.hud.setStars(this.wanted); this.crimeCooldown = 12; }
  playerCarSpeed(s) { if (this.playerCar) this.playerCar.speed = s; }
  setCameraMode(m) { this.camMode = m; }
  setMissionIndex(i) {
    if (i >= 0) this.missions.setMission(i);
    else this.missions.index = -1;
  }
  startSideJobById(id) {
    const job = SIDE_JOBS.find((j) => j.id === id);
    if (!job) return;
    this.missions.index = -1;
    this.missions.sideJob = job;
    this.hud.setMission(job.title, job.text);
    this.hud.banner(job.title, 'Side job — $' + job.pay + ' on the line');
    const t = this.missions.targetPos();
    if (t) this.missions.beacon.position.set(t.x, 0, t.z);
  }
  spawnAllyAt(x, z, armed) {
    const a = this.combat.spawnAlly(x, z);
    if (armed && !this.combat.allyArmed) {
      this.combat.allyArmed = true;
      a.parts.weaponMount.add(buildPistol());
    }
    return a;
  }
  spawnGangAt(x, z, n) { return this.combat.spawnGang(x, z, n); }
  spawnPoliceChase(n) {
    // Patrol cars close behind the player so the chase reads in frame.
    for (let i = 0; i < n; i++) {
      const behind = this.inCar ? this.playerHeading + Math.PI : Math.PI;
      const bx = this.playerPos.x + Math.sin(behind) * (13 + i * 7) + (i ? 4 : -4);
      const bz = this.playerPos.z + Math.cos(behind) * (13 + i * 7);
      const car = spawnPolice(this.scene, bx, bz);
      this.policeCars.push(car);
    }
  }
  clearPolice() {
    for (const c of this.policeCars) this.scene.remove(c.group);
    this.policeCars = [];
    for (const c of this.footCops) this.scene.remove(c.group);
    this.footCops = [];
  }

  // ---- per-frame ----
  frame() {
    // Fixed-step substepping: the game advances in stable 0.05 s steps. Staging
    // (?shot=) runs several steps per rendered frame so scenes develop in slow
    // headless renderers; normal play runs one step per frame.
    this.clock.getDelta();
    const steps = this.timeScale || 1;
    for (let s = 0; s < steps; s++) this.step(0.05, s === steps - 1);
  }
  step(dt, renderIt) {
    this.time += dt;
    if (this.state === 'menu') {
      // Start-screen showcase: Rook front and centre-right at the road crossing,
      // slowly turning so the face stays visible, street vista behind him.
      this.hero.group.position.set(0, 0, 0);
      this.hero.group.rotation.y = Math.sin(this.time * 0.35) * 0.7;
      animateHuman(this.hero, 'idle', this.time, 0);
      this.camera.position.set(2.6, 1.8, 4.6);
      this.camera.lookAt(0, 1.35, 0);
      this.audio.update(dt);
      if (renderIt) this.renderer.render(this.scene, this.camera);
      return;
    }
    if (this.state !== 'play') { if (renderIt) this.renderer.render(this.scene, this.camera); return; }

    const k = this.keys;
    const moving = k['KeyW'] || k['KeyA'] || k['KeyS'] || k['KeyD'];
    if (this.inCar && this.playerCar) {
      const car = this.playerCar;
      const hit = driveCar(car, {
        forward: !!k['KeyW'], back: !!k['KeyS'],
        left: !!k['KeyA'], right: !!k['KeyD'],
      }, dt, this.city.colliders, [...this.traffic, ...this.policeCars, ...this.parkedCars.filter((c) => c !== car)]);
      if (hit && Math.abs(car.speed) > 8) { this.audio.crash(); this.damagePlayer(2); }
      this.playerPos.copy(car.pos);
      this.playerHeading = car.heading;
      this.audio.setEngine(Math.abs(car.speed) / 30, true);
      this.hud.setSpeed(car.speed * 3.2, true);
      // Run over pedestrians.
      for (let i = this.peds.length - 1; i >= 0; i--) {
        const p = this.peds[i];
        if (Math.hypot(p.pos.x - car.pos.x, p.pos.z - car.pos.z) < 2 && Math.abs(car.speed) > 5) {
          p.group.rotation.x = -Math.PI / 2; p.group.position.y = 0.2;
          this.scene.remove(p.group);
          this.peds.splice(i, 1);
          this.addWanted(1);
          this.hud.toast('Pedestrian down — the heat is rising');
          this.audio.crash();
        }
      }
    } else {
      // On foot: WASD relative to the camera, angled 3/4 follow.
      const run = k['ShiftLeft'] || k['ShiftRight'];
      const speed = run ? 7.2 : 4.2;
      let mx = 0, mz = 0;
      const cy = this.camYaw;
      if (k['KeyW']) { mx += Math.sin(cy); mz += Math.cos(cy); }
      if (k['KeyS']) { mx -= Math.sin(cy); mz -= Math.cos(cy); }
      if (k['KeyD']) { mx -= Math.cos(cy); mz += Math.sin(cy); }
      if (k['KeyA']) { mx += Math.cos(cy); mz -= Math.sin(cy); }
      const len = Math.hypot(mx, mz);
      if (len > 0.01) {
        mx /= len; mz /= len;
        const nx = this.playerPos.x + mx * speed * dt;
        const nz = this.playerPos.z + mz * speed * dt;
        const test = new THREE.Vector3(nx, 0, nz);
        collideCircle(test, 0.55, this.city.colliders);
        this.playerPos.copy(test);
        const targetHeading = Math.atan2(mx, mz);
        let diff = targetHeading - this.playerHeading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        this.playerHeading += diff * Math.min(1, dt * 12);
        this.walkPhase += dt * (run ? 12 : 9);
        animateHuman(this.hero, run ? 'run' : 'walk', this.walkPhase, run ? 1 : 0.5);
      } else {
        animateHuman(this.hero, 'idle', this.time, 0);
      }
      this.hero.group.position.copy(this.playerPos);
      this.hero.group.rotation.y = this.playerHeading;
      // Melee swing pose.
      if (this.combat.meleeAnim > 0) {
        this.hero.parts.armR.rotation.x = -1.6 + (0.45 - this.combat.meleeAnim) * 3;
      }
      this.audio.setEngine(0, false);
      this.hud.setSpeed(0, false);
    }

    // Camera: angled 3/4 third-person, diagonal offset, level horizon — never any roll.
    const targetYaw = this.playerHeading + this.camDrag;
    let dy = targetYaw - this.camYaw;
    while (dy > Math.PI) dy -= Math.PI * 2;
    while (dy < -Math.PI) dy += Math.PI * 2;
    this.camYaw += dy * Math.min(1, dt * (this.inCar ? 4 : 6));
    if (this.inCar) {
      const cx = this.playerPos.x - Math.sin(this.camYaw) * 10 + Math.cos(this.camYaw) * 1.6;
      const cz = this.playerPos.z - Math.cos(this.camYaw) * 10 - Math.sin(this.camYaw) * 1.6;
      this.camera.position.set(cx, 4.4, cz);
      this.camera.lookAt(this.playerPos.x, 1.4, this.playerPos.z);
    } else {
      const cx = this.playerPos.x - Math.sin(this.camYaw) * 7.2 + Math.cos(this.camYaw) * 2.4;
      const cz = this.playerPos.z - Math.cos(this.camYaw) * 7.2 - Math.sin(this.camYaw) * 2.4;
      this.camera.position.set(cx, 3.6, cz);
      this.camera.lookAt(this.playerPos.x, 1.5, this.playerPos.z);
    }
    this.camera.up.set(0, 1, 0);

    // World systems.
    updateTraffic(this.traffic, dt, this.playerCar, this.city.colliders);
    const threats = [];
    if (this.combat.weapon === 'pistol' && this.combat.shootCooldown > 0.2) threats.push({ x: this.playerPos.x, z: this.playerPos.z, radius: 14 });
    if (this.inCar && this.playerCar && Math.abs(this.playerCar.speed) > 8) threats.push({ x: this.playerPos.x, z: this.playerPos.z, radius: 10 });
    updatePedestrians(this.peds, dt, this.city.colliders, threats);
    this.combat.update(dt, this.playerPos, this.playerHeading, this.camera, this.inCar, this.city.colliders);
    if (this.combat.weapon !== 'fists' && !this.hero.parts.weaponMount.children.length) {
      this.equipWeapon(this.combat.weapon, this.combat.ammo);
    }
    this.refreshWeaponHud();

    // Missions.
    const ev = this.missions.update(this.playerPos, { wanted: this.wanted, gangCleared: this.combat.aliveEnemies() === 0 });
    if (ev === 'at-car') this.hud.prompt('Press E — STEAL THE GETAWAY CAR');
    else if (ev === 'too-hot') this.hud.prompt(null);
    else if (this.missions.current() && this.missions.current().id === 'lift-car') {
      const t = this.missions.targetPos();
      if (t && Math.hypot(this.playerPos.x - t.x, this.playerPos.z - t.z) < 6) this.hud.prompt('Press E — STEAL THE GETAWAY CAR');
      else this.hud.prompt(null);
    } else {
      const near = this.nearestParkedCar();
      if (near && !this.inCar) this.hud.prompt('Press F — ENTER ' + near.type.toUpperCase());
      else if (this.inCar) this.hud.prompt('Press F — EXIT CAR');
      else this.hud.prompt(null);
    }

    // Wanted + police.
    this.updateWanted(dt);
    this.audio.setSiren(this.policeCars.length > 0);
    this.audio.update(dt);

    // Minimap + HUD.
    this.hud.drawMinimap({
      player: this.playerPos, heading: this.playerHeading,
      buildings: this.city.buildings,
      target: this.missions.targetPos(),
      traffic: this.traffic, police: this.policeCars,
      enemies: this.combat.enemies, ally: this.combat.ally,
    });
    if (renderIt) this.renderer.render(this.scene, this.camera);
  }

  nearestParkedCar() {
    let best = null, bestD = 4;
    for (const car of this.parkedCars) {
      const d = Math.hypot(car.pos.x - this.playerPos.x, car.pos.z - this.playerPos.z);
      if (d < bestD) { best = car; bestD = d; }
    }
    return best;
  }

  updateWanted(dt) {
    this.crimeCooldown = Math.max(0, this.crimeCooldown - dt);
    // Police cars: one per wanted star (max 3).
    const wantCars = this.wanted > 0 ? Math.min(this.wanted, 3) : 0;
    while (this.policeCars.length < wantCars) {
      const a = Math.random() * Math.PI * 2;
      const car = spawnPolice(this.scene,
        clamp(this.playerPos.x + Math.sin(a) * 45, -110, 110),
        clamp(this.playerPos.z + Math.cos(a) * 45, -110, 110));
      this.policeCars.push(car);
    }
    while (this.policeCars.length > wantCars) {
      const c = this.policeCars.pop();
      this.scene.remove(c.group);
    }
    const allCars = [...this.traffic, ...this.policeCars, ...this.parkedCars];
    for (const car of this.policeCars) {
      const dist = updatePolice(car, dt, this.playerPos, this.city.colliders, allCars, this.time, !this.inCar);
      if (dist < 3.4 && this.inCar && this.playerCar) {
        this.playerCar.speed *= 0.92;
      }
    }
    // Foot cops when the heat is high and Rook is on foot.
    const wantCops = (!this.inCar && this.wanted >= 2) ? Math.min(this.wanted - 1, 2) : 0;
    while (this.footCops.length < wantCops) {
      const cop = spawnFootCop(this.scene, this.playerPos.x + 10, this.playerPos.z + 8);
      this.footCops.push(cop);
    }
    while (this.footCops.length > wantCops) {
      const c = this.footCops.pop();
      this.scene.remove(c.group);
    }
    for (const cop of this.footCops) {
      const d = updateFootCop(cop, dt, this.playerPos, this.city.colliders);
      if (d < 1.5) this.damagePlayer(6 * dt * 2);
    }
    // Heat decay: no crime for a while and no police close → lose a star.
    let nearestPolice = 999;
    for (const c of this.policeCars) nearestPolice = Math.min(nearestPolice, Math.hypot(c.pos.x - this.playerPos.x, c.pos.z - this.playerPos.z));
    if (this.wanted > 0 && this.crimeCooldown <= 0 && nearestPolice > 45) {
      this.heatLoss += dt;
      this.hud.setHeat('LOSING THE HEAT…');
      if (this.heatLoss > 6) {
        this.wanted--;
        this.hud.setStars(this.wanted);
        this.heatLoss = 0;
        if (this.wanted === 0) { this.hud.setHeat(''); this.hud.toast('Clean — the heat is off'); }
      }
    } else if (this.wanted > 0) {
      this.hud.setHeat('WANTED');
    } else {
      this.hud.setHeat('');
    }
    // Slow health regen when clean.
    if (this.wanted === 0 && this.health < 100 && this.health > 0) {
      this.health = Math.min(100, this.health + dt * 1.5);
      this.hud.setHealth(this.health);
    }
  }
}

const game = new Game();
window.__game = game;
game.init();
