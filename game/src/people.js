// DUSKPORT — Neon Getaway: people.
// Vex Marlowe on foot, the city's pedestrians, and the Duskport Police
// Department — plus the wanted system that ties them together. Crimes raise
// heat; heat becomes stars; stars bring cruisers, and cruisers bring foot
// cops. Lay low out of sight and the heat bleeds away.

'use strict';

const Player = {
  x: Landmarks.garage.x, y: Landmarks.garage.y + 170,
  angle: 0, health: 100, armor: 0, cash: 250,
  car: null, onFoot: true, sprint: false,
  walkBob: 0, dead: false, busted: false, bustTimer: 0,
  fireTimer: 0, reloadTimer: 0, ammo: 12, magSize: 12,
  punchTimer: 0, hurtFlash: 0,

  reset(x, y) {
    this.x = x; this.y = y; this.angle = 0;
    this.health = 100; this.armor = 0; this.cash = 250;
    this.car = null; this.onFoot = true; this.dead = false; this.busted = false;
    this.ammo = 12; this.fireTimer = 0; this.reloadTimer = 0; this.punchTimer = 0;
  },

  pos() { return this.car ? { x: this.car.x, y: this.car.y } : { x: this.x, y: this.y }; },

  speedNow() { return this.car ? Math.abs(this.car.speed) : 0; },

  update(dt) {
    if (this.dead || this.busted) return;
    this.fireTimer -= dt; this.reloadTimer -= dt; this.punchTimer -= dt;
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
    if (this.car) {
      Traffic.drive(this.car, dt);
      if (this.car.hp !== undefined && this.car.hp <= 0) {
        Combat.explodeCar(this.car);
        this.car = null; this.onFoot = true;
        this.x = clamp(this.x, 40, WORLD_W - 40); this.y = clamp(this.y, 40, WORLD_H - 40);
      }
      return;
    }
    // On foot: WASD / arrows, Shift to sprint.
    let mx = 0, my = 0;
    if (Input.isDown('KeyW') || Input.isDown('ArrowUp')) my -= 1;
    if (Input.isDown('KeyS') || Input.isDown('ArrowDown')) my += 1;
    if (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) mx -= 1;
    if (Input.isDown('KeyD') || Input.isDown('ArrowRight')) mx += 1;
    this.sprint = Input.isDown('ShiftLeft') || Input.isDown('ShiftRight');
    const len = Math.hypot(mx, my);
    if (len > 0) {
      const sp = this.sprint ? 265 : 175;
      this.x += (mx / len) * sp * dt;
      this.y += (my / len) * sp * dt;
      this.angle = Math.atan2(my, mx);
      this.walkBob += dt * 11;
    }
    this.x = clamp(this.x, 30, WORLD_W - 30);
    this.y = clamp(this.y, 30, WORLD_H - 30);
    City.collideCircle(this, 14);
    // Bumped by traffic.
    for (const c of Traffic.cars) {
      const d = dist(this.x, this.y, c.x, c.y);
      if (d < 34 && d > 0.01) {
        const ux = (this.x - c.x) / d, uy = (this.y - c.y) / d;
        this.x += ux * (34 - d); this.y += uy * (34 - d);
        if (Math.abs(c.speed) > 120) { this.takeDamage(12, 'traffic'); Wanted.addHeat(4); }
      }
    }
    // Steal / enter a car.
    if (Input.wasPressed('KeyE')) {
      const car = Traffic.nearestStealable(this.x, this.y, 74);
      if (car) {
        this.car = car; this.onFoot = false;
        car.npc = false; car.driver = false;
        if (car.hp === undefined) car.hp = 100;
        if (car.typeName !== 'cruiser') { Wanted.addHeat(15); Toasts.push('Car stolen — the DPD noticed.'); }
        AudioSys.blip(330, 0.1, 'square', 0.15);
      }
    }
    // Punch.
    if (Input.wasPressed('KeyF') && this.punchTimer <= 0) {
      this.punchTimer = 0.45;
      Combat.punch(this.x, this.y, this.angle);
    }
    // Reload.
    if (Input.wasPressed('KeyR') && this.reloadTimer <= 0 && this.ammo < this.magSize) {
      this.reloadTimer = 0.9; this.ammo = this.magSize;
      AudioSys.blip(440, 0.07, 'square', 0.12);
    }
    // Shoot toward the mouse.
    if (Input.mouse.down && this.fireTimer <= 0 && this.reloadTimer <= 0) {
      this.fireTimer = 0.19;
      if (this.ammo > 0) {
        this.ammo--;
        const m = Game.mouseWorld();
        Combat.fireBullet(this.x, this.y, angleTo(this.x, this.y, m.x, m.y), true);
        if (Wanted.stars() > 0) Wanted.addHeat(3);
      } else {
        AudioSys.blip(140, 0.05, 'square', 0.1);
        this.reloadTimer = 0.9; this.ammo = this.magSize;
      }
    }
  },

  exitCar() {
    if (!this.car) return;
    const car = this.car;
    this.car = null; this.onFoot = true;
    this.x = car.x + Math.cos(car.angle + Math.PI / 2) * 44;
    this.y = car.y + Math.sin(car.angle + Math.PI / 2) * 44;
    this.x = clamp(this.x, 30, WORLD_W - 30); this.y = clamp(this.y, 30, WORLD_H - 30);
    car.npc = true; car.driver = true;
  },

  takeDamage(n, source) {
    if (this.dead || this.busted) return;
    let rest = n;
    if (this.armor > 0) { const ab = Math.min(this.armor, rest); this.armor -= ab; rest -= ab; }
    this.health -= rest;
    this.hurtFlash = 0.35;
    if (this.health <= 0) { this.health = 0; this.dead = true; AudioSys.busted(); }
  },

  heal(n) { this.health = clamp(this.health + n, 0, 100); },

  draw(ctx, cam) {
    if (this.car || this.dead) return;
    const px = this.x - cam.x, py = this.y - cam.y;
    const bob = Math.sin(this.walkBob) * 2;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(this.angle);
    // Shadow.
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 4, 13, 9, 0, 0, Math.PI * 2); ctx.fill();
    // Vex: magenta jacket, dark jeans, facing the aim direction.
    ctx.fillStyle = '#ff2e88';
    ctx.beginPath(); ctx.arc(0, bob * 0.3, 12, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d2436';
    ctx.fillRect(-8, -5 + bob * 0.3, 12, 10);
    ctx.fillStyle = '#ffd9ec';
    ctx.beginPath(); ctx.arc(8, bob * 0.3, 6, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#1d2436';
    ctx.fillRect(10, -2 + bob * 0.3, 7, 4);
    ctx.restore();
  },
};

// The wanted system: heat 0..100, stars = ceil(heat / 20).
const Wanted = {
  heat: 0, lastCrimeAt: -99,

  stars() { return this.heat <= 0 ? 0 : Math.ceil(this.heat / 20); },
  addHeat(n) { this.heat = clamp(this.heat + n, 0, 100); this.lastCrimeAt = Game.time; },
  reset() { this.heat = 0; this.lastCrimeAt = -99; },

  update(dt) {
    const p = Player.pos();
    const near = Police.nearestDist(p.x, p.y);
    const quiet = Game.time - this.lastCrimeAt > 5;
    if (this.heat > 0 && quiet && near > 520) this.heat = Math.max(0, this.heat - 5 * dt);
    else if (this.heat > 0 && quiet && near > 300) this.heat = Math.max(0, this.heat - 1.5 * dt);
  },
};

const Pedestrians = {
  list: [],

  reset() {
    this.list = [];
    reseed(777);
    for (let i = 0; i < 26; i++) this.spawn();
  },

  spawn(x, y) {
    const vertical = chance(0.5);
    const road = vertical ? choice(ROADS_X) : choice(ROADS_Y);
    const along = rand(0, vertical ? WORLD_H : WORLD_W);
    const p = {
      x: x !== undefined ? x : (vertical ? road + choice([-44, 44]) : along),
      y: y !== undefined ? y : (vertical ? along : road + choice([-44, 44])),
      vertical, dir: chance(0.5) ? 1 : -1, speed: rand(34, 62),
      color: choice(['#e8e6f0', '#ffd166', '#7ad9ff', '#ff9d76', '#b7ff9d', '#f0a6ff']),
      down: 0, flee: 0, bob: rand(0, 6),
    };
    this.list.push(p);
    return p;
  },

  update(dt) {
    const p = Player.pos();
    for (const ped of this.list) {
      ped.bob += dt * 8;
      if (ped.down > 0) { ped.down -= dt; continue; }
      if (ped.flee > 0) {
        ped.flee -= dt;
        const a = angleTo(p.x, p.y, ped.x, ped.y);
        ped.x += Math.cos(a) * 150 * dt; ped.y += Math.sin(a) * 150 * dt;
        continue;
      }
      const step = ped.speed * ped.dir * dt;
      if (ped.vertical) ped.y += step; else ped.x += step;
      if (ped.vertical && (ped.y < 60 || ped.y > WORLD_H - 60)) ped.dir *= -1;
      if (!ped.vertical && (ped.x < 60 || ped.x > WORLD_W - 60)) ped.dir *= -1;
      // Turn at an intersection sometimes.
      const onCross = ped.vertical
        ? ROADS_Y.some(ry => Math.abs(ped.y - ry) < 6)
        : ROADS_X.some(rx => Math.abs(ped.x - rx) < 6);
      if (onCross && chance(dt * 0.3)) {
        ped.vertical = !ped.vertical; ped.dir = chance(0.5) ? 1 : -1;
      }
      // A car bearing down makes them dive aside; a close one knocks them down.
      for (const c of Traffic.cars) {
        const d = dist(ped.x, ped.y, c.x, c.y);
        if (d < 30 && Math.abs(c.speed) > 60) {
          ped.down = 3; Wanted.addHeat(10);
          Toasts.push('Pedestrian hit! The DPD is on its way.');
          AudioSys.noise(0.2, 0.25, 500);
          break;
        } else if (d < 90 && Math.abs(c.speed) > 60) {
          ped.flee = 0.8;
        }
      }
      if (dist(ped.x, ped.y, p.x, p.y) < 120 && Player.car) ped.flee = 0.5;
    }
    // Keep the sidewalks populated near the player.
    if (this.list.length < 26 && chance(dt * 0.8)) {
      const a = rand(0, Math.PI * 2), d = rand(420, 700);
      this.spawn(clamp(p.x + Math.cos(a) * d, 60, WORLD_W - 60), clamp(p.y + Math.sin(a) * d, 60, WORLD_H - 60));
    }
    this.list = this.list.filter(pd => dist(pd.x, pd.y, p.x, p.y) < 1500);
  },

  fleeFrom(x, y, radius) {
    for (const ped of this.list) {
      if (dist(ped.x, ped.y, x, y) < radius) ped.flee = 1.6;
    }
  },

  draw(ctx, cam) {
    for (const ped of this.list) {
      if (!cam.visible(ped.x - 20, ped.y - 20, 40, 40)) continue;
      const px = ped.x - cam.x, py = ped.y - cam.y;
      ctx.save(); ctx.translate(px, py);
      if (ped.down > 0) {
        ctx.rotate(1.35);
        ctx.fillStyle = ped.color;
        ctx.fillRect(-11, -5, 22, 10);
        ctx.fillStyle = '#f0c8a0';
        ctx.beginPath(); ctx.arc(13, 0, 5, 0, Math.PI * 2); ctx.fill();
      } else {
        const bob = Math.sin(ped.bob) * 2;
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath(); ctx.ellipse(0, 5, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = ped.color;
        ctx.beginPath(); ctx.arc(0, bob * 0.3, 8, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#2a2f45';
        ctx.fillRect(-6, 4 + bob * 0.3, 12, 7);
        ctx.fillStyle = '#f0c8a0';
        ctx.beginPath(); ctx.arc(0, -3 + bob * 0.3, 5, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
  },
};

const Police = {
  cruisers: [],
  cops: [],
  sirenTimer: 0,

  reset() { this.cruisers = []; this.cops = []; },

  nearestDist(x, y) {
    let bd = 1e9;
    for (const c of this.cruisers) bd = Math.min(bd, dist(x, y, c.x, c.y));
    for (const c of this.cops) bd = Math.min(bd, dist(x, y, c.x, c.y));
    return bd;
  },

  update(dt, t) {
    const stars = Wanted.stars();
    const p = Player.pos();
    // Siren wail while any cruiser is close.
    this.sirenTimer -= dt;
    if (stars > 0 && this.nearestDist(p.x, p.y) < 700 && this.sirenTimer <= 0) {
      this.sirenTimer = 0.9; AudioSys.siren(t);
    }
    // Keep the right number of cruisers on the street.
    const wantCruisers = Math.min(4, stars);
    while (this.cruisers.length < wantCruisers) {
      const a = rand(0, Math.PI * 2), d = rand(620, 900);
      const road = City.nearestRoad(clamp(p.x + Math.cos(a) * d, 80, WORLD_W - 80), clamp(p.y + Math.sin(a) * d, 80, WORLD_H - 80));
      const car = {
        x: road.x, y: road.y, angle: 0, speed: 0, hp: 80,
        type: CAR_TYPES.cruiser, typeName: 'cruiser', color: '#1d3a8a',
        npc: false, ramCooldown: 0,
      };
      this.cruisers.push(car);
    }
    if (stars === 0) {
      for (const c of this.cruisers) { c.speed = lerp(c.speed, 0, dt); }
      this.cruisers = this.cruisers.filter(c => dist(c.x, c.y, p.x, p.y) < 900);
      this.cops = [];
    }
    for (const c of this.cruisers) {
      c.ramCooldown -= dt;
      const targetAngle = angleTo(c.x, c.y, p.x, p.y);
      const top = 470 + stars * 26;
      c.angle = angleLerp(c.angle, targetAngle, clamp(dt * 2.2, 0, 1));
      c.speed = lerp(c.speed, top, clamp(dt * 1.1, 0, 1));
      c.x += Math.cos(c.angle) * c.speed * dt;
      c.y += Math.sin(c.angle) * c.speed * dt;
      c.x = clamp(c.x, 30, WORLD_W - 30); c.y = clamp(c.y, 30, WORLD_H - 30);
      City.collideCircle(c, 24);
      const d = dist(c.x, c.y, p.x, p.y);
      if (Player.car && d < 52 && c.ramCooldown <= 0) {
        c.ramCooldown = 0.8;
        Player.car.hp = (Player.car.hp || 100) - 9;
        Player.car.speed *= 0.55;
        AudioSys.crash();
        Combat.sparks(p.x, p.y, 8, '#ffd166');
      }
      if (!Player.car && d < 60 && this.cops.length < stars + 1) {
        this.cops.push({
          x: c.x + rand(-30, 30), y: c.y + rand(-30, 30), hp: 50,
          speed: 195, touch: 0, shootTimer: rand(0.5, 1.5), angle: 0,
        });
      }
    }
    // Foot cops chase, punch, and at 3+ stars shoot.
    for (const cop of this.cops) {
      cop.shootTimer -= dt;
      const d = dist(cop.x, cop.y, p.x, p.y);
      if (Player.onFoot) {
        cop.angle = angleTo(cop.x, cop.y, p.x, p.y);
        if (d > 30) {
          cop.x += Math.cos(cop.angle) * cop.speed * dt;
          cop.y += Math.sin(cop.angle) * cop.speed * dt;
        }
        if (d < 30) {
          cop.touch += dt;
          if (cop.touch > 1.2) { Player.busted = true; AudioSys.busted(); }
        } else cop.touch = Math.max(0, cop.touch - dt * 2);
        if (stars >= 3 && d < 420 && d > 60 && cop.shootTimer <= 0) {
          cop.shootTimer = rand(0.9, 1.6);
          Combat.fireBullet(cop.x, cop.y, angleTo(cop.x, cop.y, p.x, p.y) + rand(-0.14, 0.14), false);
        }
      } else {
        // Player drove off: the cop runs back to a cruiser and despawns.
        const c0 = this.cruisers[0];
        if (c0) {
          const a = angleTo(cop.x, cop.y, c0.x, c0.y);
          cop.x += Math.cos(a) * cop.speed * dt; cop.y += Math.sin(a) * cop.speed * dt;
          if (dist(cop.x, cop.y, c0.x, c0.y) < 40) cop.hp = 0;
        }
      }
      City.collideCircle(cop, 12);
    }
    this.cops = this.cops.filter(c => c.hp > 0 && dist(c.x, c.y, p.x, p.y) < 1100);
  },

  draw(ctx, cam, t) {
    for (const c of this.cruisers) {
      if (!cam.visible(c.x - 80, c.y - 80, 160, 160)) continue;
      ctx.save();
      ctx.translate(c.x - cam.x, c.y - cam.y);
      ctx.rotate(c.angle);
      const type = c.type;
      const hg = ctx.createLinearGradient(type.w / 2, 0, type.w / 2 + 110, 0);
      hg.addColorStop(0, 'rgba(255, 240, 180, 0.20)'); hg.addColorStop(1, 'rgba(255, 240, 180, 0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(type.w / 2, -10); ctx.lineTo(type.w / 2 + 110, -26); ctx.lineTo(type.w / 2 + 110, 26); ctx.lineTo(type.w / 2, 10); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#0a0812'; ctx.fillRect(-type.w / 2 - 2, -type.h / 2 - 2, type.w + 4, type.h + 4);
      ctx.fillStyle = '#e8ecf4'; ctx.fillRect(-type.w / 2, -type.h / 2, type.w, type.h);
      ctx.fillStyle = '#1d3a8a'; ctx.fillRect(-type.w / 2, -type.h / 2, type.w, 7);
      ctx.fillStyle = 'rgba(20, 24, 40, 0.9)'; ctx.fillRect(-type.w / 6, -type.h / 2 + 3, type.w / 3, type.h - 6);
      const flash = Math.floor(t * 6) % 2 === 0;
      ctx.fillStyle = flash ? '#ff2e4d' : '#2e7bff'; ctx.fillRect(-6, -type.h / 2 - 2, 12, 5);
      ctx.fillStyle = flash ? '#2e7bff' : '#ff2e4d'; ctx.fillRect(-6, type.h / 2 - 3, 12, 5);
      ctx.fillStyle = '#111'; ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
      ctx.fillText('DPD', 0, 3);
      ctx.restore();
      // Flashing halo.
      const col = flash ? '255, 46, 77' : '46, 123, 255';
      const halo = ctx.createRadialGradient(c.x - cam.x, c.y - cam.y, 4, c.x - cam.x, c.y - cam.y, 60);
      halo.addColorStop(0, 'rgba(' + col + ', 0.22)'); halo.addColorStop(1, 'rgba(' + col + ', 0)');
      ctx.fillStyle = halo; ctx.beginPath(); ctx.arc(c.x - cam.x, c.y - cam.y, 60, 0, Math.PI * 2); ctx.fill();
    }
    for (const cop of this.cops) {
      if (!cam.visible(cop.x - 20, cop.y - 20, 40, 40)) continue;
      const px = cop.x - cam.x, py = cop.y - cam.y;
      ctx.save(); ctx.translate(px, py); ctx.rotate(cop.angle);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath(); ctx.ellipse(0, 5, 9, 6, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#1d3a8a';
      ctx.beginPath(); ctx.arc(0, 0, 11, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#f0c8a0';
      ctx.beginPath(); ctx.arc(7, 0, 5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#0e1a3a';
      ctx.fillRect(9, -2, 6, 4);
      ctx.restore();
      if (cop.touch > 0.4) {
        ctx.fillStyle = '#ff2e4d'; ctx.font = 'bold 13px Arial'; ctx.textAlign = 'center';
        ctx.fillText('BUSTED?', px, py - 22);
      }
    }
  },
};
