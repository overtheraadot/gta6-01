// DUSKPORT — Neon Getaway: cars, traffic and driving.
// Arcade car physics for the player (accelerate, brake/reverse, steering
// that bites harder at speed, a little drift) and the city's traffic: sedans,
// taxis, trucks and vans that cruise their lanes, stop at red lights and
// turn at intersections. Cars are stealable — walk up to one and press E.

'use strict';

const CAR_TYPES = {
  sedan: { w: 46, h: 22, accel: 420, top: 430, color: '#c94f5e' },
  taxi: { w: 46, h: 22, accel: 400, top: 410, color: '#f2b705' },
  sports: { w: 48, h: 21, accel: 640, top: 560, color: '#ff2e88' },
  truck: { w: 62, h: 26, accel: 300, top: 330, color: '#5a6b7a' },
  van: { w: 54, h: 24, accel: 340, top: 360, color: '#7a8a99' },
  cruiser: { w: 48, h: 22, accel: 560, top: 520, color: '#1d3a8a' },
};

const TRAFFIC_COLORS = ['#c94f5e', '#4f7ac9', '#c9a44f', '#6a4fc9', '#4fc98a', '#c9c9c9', '#8a4f4f', '#3a6a8a'];

const Traffic = {
  cars: [],
  spawnTimer: 0,

  reset() { this.cars = []; this.spawnTimer = 0; },

  spawnCar(x, y, vertical, dir, typeName) {
    const type = CAR_TYPES[typeName || choice(['sedan', 'sedan', 'taxi', 'van', 'truck'])];
    // Snap onto the correct lane of the nearest road: right-hand traffic.
    if (vertical) {
      const road = ROADS_X.reduce((a, b) => (Math.abs(b - x) < Math.abs(a - x) ? b : a));
      x = road + (dir > 0 ? 16 : -16);
    } else {
      const road = ROADS_Y.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
      y = road + (dir > 0 ? 16 : -16);
    }
    const car = {
      x, y, angle: vertical ? (dir > 0 ? Math.PI / 2 : -Math.PI / 2) : (dir > 0 ? 0 : Math.PI),
      speed: rand(90, 150), type, typeName: typeName || 'sedan',
      color: typeName === 'taxi' ? '#f2b705' : choice(TRAFFIC_COLORS),
      vertical, dir, lane: dir > 0 ? 16 : -16, driver: true, npc: true,
      stuck: 0, turnAt: null,
    };
    this.cars.push(car);
    return car;
  },

  // Keep the streets busy near the player, thin out far away.
  maintain(px, py) {
    this.spawnTimer -= 1 / 60;
    if (this.spawnTimer <= 0 && this.cars.length < 16) {
      this.spawnTimer = rand(0.4, 1.1);
      const vertical = chance(0.5);
      const roads = vertical ? ROADS_X : ROADS_Y;
      const road = choice(roads);
      const dir = chance(0.5) ? 1 : -1;
      const along = rand(0, vertical ? WORLD_H : WORLD_W);
      const x = vertical ? road + (dir > 0 ? 16 : -16) : along;
      const y = vertical ? along : road + (dir > 0 ? 16 : -16);
      if (dist(x, y, px, py) > 320 && dist(x, y, px, py) < 1100) this.spawnCar(x, y, vertical, dir);
    }
    this.cars = this.cars.filter(c => !c.npc || dist(c.x, c.y, px, py) < 1400);
  },

  update(dt, t, px, py) {
    for (const c of this.cars) {
      if (!c.npc) continue;
      // Red light: stop before the intersection.
      let want = 130;
      const nearX = ROADS_X.find(rx => Math.abs(c.x - rx) < 26);
      const nearY = ROADS_Y.find(ry => Math.abs(c.y - ry) < 26);
      if (c.vertical && nearY !== undefined) {
        const ix = ROADS_X.indexOf(nearX !== undefined ? nearX : ROADS_X[0]);
        const green = City.lightGreenVertical(t, ix, ROADS_Y.indexOf(nearY));
        const dStop = (nearY - c.y) * c.dir;
        if (!green && dStop > 0 && dStop < 90) want = 0;
      }
      if (!c.vertical && nearX !== undefined) {
        const green = City.lightGreenVertical(t, ROADS_X.indexOf(nearX), ROADS_Y.indexOf(nearY !== undefined ? nearY : ROADS_Y[0]));
        const dStop = (nearX - c.x) * c.dir;
        if (green && dStop > 0 && dStop < 90) want = 0;
      }
      // Car ahead: slow down.
      for (const o of this.cars) {
        if (o === c) continue;
        const dx = o.x - c.x, dy = o.y - c.y;
        const ahead = c.vertical ? dy * c.dir : dx * c.dir;
        const side = c.vertical ? Math.abs(dx) : Math.abs(dy);
        if (ahead > 0 && ahead < 78 && side < 26) { want = Math.min(want, 40); break; }
      }
      c.speed = lerp(c.speed, want, clamp(dt * 1.6, 0, 1));
      // Random turn at an intersection, into the correct lane.
      const onCrossX = ROADS_X.some(rx => Math.abs(c.x - rx) < 8);
      const onCrossY = ROADS_Y.some(ry => Math.abs(c.y - ry) < 8);
      if (c.vertical && onCrossY && chance(dt * 0.25)) {
        c.vertical = false; c.dir = chance(0.5) ? 1 : -1;
        c.angle = c.dir > 0 ? 0 : Math.PI;
        c.y = ROADS_Y.find(ry => Math.abs(c.y - ry) < 8) + (c.dir > 0 ? 16 : -16);
      } else if (!c.vertical && onCrossX && chance(dt * 0.25)) {
        c.vertical = true; c.dir = chance(0.5) ? 1 : -1;
        c.angle = c.dir > 0 ? Math.PI / 2 : -Math.PI / 2;
        c.x = ROADS_X.find(rx => Math.abs(c.x - rx) < 8) + (c.dir > 0 ? 16 : -16);
      }
      const step = c.speed * dt * c.dir;
      if (c.vertical) c.y += step; else c.x += step;
      c.x = clamp(c.x, 40, WORLD_W - 40); c.y = clamp(c.y, 40, WORLD_H - 40);
    }
  },

  // Player driving physics. Returns nothing; mutates the car.
  drive(car, dt) {
    const type = car.type;
    const fwd = (Input.isDown('KeyW') || Input.isDown('ArrowUp')) ? 1 : 0;
    const back = (Input.isDown('KeyS') || Input.isDown('ArrowDown')) ? 1 : 0;
    const left = (Input.isDown('KeyA') || Input.isDown('ArrowLeft')) ? 1 : 0;
    const right = (Input.isDown('KeyD') || Input.isDown('ArrowRight')) ? 1 : 0;
    if (fwd) car.speed += type.accel * dt;
    if (back) car.speed -= (car.speed > 20 ? type.accel * 1.1 : type.accel * 0.55) * dt;
    if (!fwd && !back) car.speed -= Math.sign(car.speed) * Math.min(Math.abs(car.speed), 240 * dt);
    car.speed = clamp(car.speed, -190, type.top);
    const steer = (left ? -1 : 0) + (right ? 1 : 0);
    const grip = clamp(Math.abs(car.speed) / 160, 0.25, 1);
    car.angle += steer * 2.3 * grip * dt * Math.sign(car.speed || 1);
    const nx = car.x + Math.cos(car.angle) * car.speed * dt;
    const ny = car.y + Math.sin(car.angle) * car.speed * dt;
    car.x = nx; car.y = ny;
    car.x = clamp(car.x, 30, WORLD_W - 30); car.y = clamp(car.y, 30, WORLD_H - 30);
    const hit = City.collideCircle(car, 24);
    if (hit) {
      if (Math.abs(car.speed) > 260) { AudioSys.crash(); car.speed *= -0.25; }
      else car.speed *= 0.5;
    }
    // Bumping traffic.
    for (const o of this.cars) {
      if (o === car || !o.npc) continue;
      const d = dist(car.x, car.y, o.x, o.y);
      if (d < 46 && d > 0.01) {
        const push = (46 - d) / 2;
        const ux = (o.x - car.x) / d, uy = (o.y - car.y) / d;
        o.x += ux * push; o.y += uy * push;
        car.x -= ux * push * 0.4; car.y -= uy * push * 0.4;
        if (Math.abs(car.speed) > 200) { AudioSys.crash(); Wanted.addHeat(2); }
        car.speed *= 0.82;
      }
    }
  },

  nearestStealable(x, y, maxD) {
    let best = null, bd = maxD || 70;
    for (const c of this.cars) {
      const d = dist(x, y, c.x, c.y);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  },

  draw(ctx, cam, t) {
    for (const c of this.cars) {
      if (!cam.visible(c.x - 60, c.y - 60, 120, 120)) continue;
      ctx.save();
      ctx.translate(c.x - cam.x, c.y - cam.y);
      ctx.rotate(c.angle);
      const type = c.type;
      // Headlight cones into the dusk.
      const hg = ctx.createLinearGradient(type.w / 2, 0, type.w / 2 + 110, 0);
      hg.addColorStop(0, 'rgba(255, 240, 180, 0.20)'); hg.addColorStop(1, 'rgba(255, 240, 180, 0)');
      ctx.fillStyle = hg;
      ctx.beginPath(); ctx.moveTo(type.w / 2, -10); ctx.lineTo(type.w / 2 + 110, -26); ctx.lineTo(type.w / 2 + 110, 26); ctx.lineTo(type.w / 2, 10); ctx.closePath(); ctx.fill();
      // Body.
      ctx.fillStyle = '#0a0812';
      ctx.fillRect(-type.w / 2 - 2, -type.h / 2 - 2, type.w + 4, type.h + 4);
      ctx.fillStyle = c.color;
      ctx.fillRect(-type.w / 2, -type.h / 2, type.w, type.h);
      // Roof + windshield.
      ctx.fillStyle = 'rgba(20, 24, 40, 0.9)';
      ctx.fillRect(-type.w / 6, -type.h / 2 + 3, type.w / 3, type.h - 6);
      ctx.fillStyle = 'rgba(160, 220, 255, 0.75)';
      ctx.fillRect(type.w / 4, -type.h / 2 + 4, 6, type.h - 8);
      if (c.typeName === 'taxi') {
        ctx.fillStyle = '#111';
        for (let k = 0; k < 5; k++) ctx.fillRect(-type.w / 2 + 6 + k * 8, -type.h / 2 + 2, 4, 4);
        ctx.fillStyle = '#ffe14d';
        ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
        ctx.fillText('TAXI', 0, -type.h / 2 - 5);
      }
      if (c.typeName === 'cruiser') {
        const flash = Math.floor(t * 6) % 2 === 0;
        ctx.fillStyle = flash ? '#ff2e4d' : '#2e7bff';
        ctx.fillRect(-6, -type.h / 2 - 2, 12, 5);
        ctx.fillStyle = flash ? '#2e7bff' : '#ff2e4d';
        ctx.fillRect(-6, type.h / 2 - 3, 12, 5);
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 8px Arial'; ctx.textAlign = 'center';
        ctx.fillText('DPD', 0, 3);
      }
      // Taillights.
      ctx.fillStyle = '#ff2e4d';
      ctx.fillRect(-type.w / 2, -type.h / 2 + 2, 3, 4);
      ctx.fillRect(-type.w / 2, type.h / 2 - 6, 3, 4);
      ctx.restore();
    }
  },
};
