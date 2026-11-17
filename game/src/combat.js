// DUSKPORT — Neon Getaway: combat.
// The pistol, the punch, and everything that flies, flashes and falls over:
// bullets with tracers, muzzle flash, hit sparks, smoke, and the explosion
// that ends a car whose health hits zero. Fists and bullets both count as
// crimes when the DPD is watching.

'use strict';

const Combat = {
  bullets: [],
  particles: [],

  reset() { this.bullets = []; this.particles = []; },

  fireBullet(x, y, angle, fromPlayer) {
    this.bullets.push({
      x, y, vx: Math.cos(angle) * 940, vy: Math.sin(angle) * 940,
      life: 1.1, fromPlayer,
    });
    this.sparks(x + Math.cos(angle) * 20, y + Math.sin(angle) * 20, 4, '#ffe14d');
    AudioSys.gunshot();
    if (fromPlayer) Pedestrians.fleeFrom(x, y, 320);
  },

  punch(x, y, angle) {
    AudioSys.noise(0.08, 0.2, 700);
    let hitAny = false;
    for (const ped of Pedestrians.list) {
      if (ped.down > 0) continue;
      const d = dist(x, y, ped.x, ped.y);
      if (d < 52 && Math.abs(angleDiff(angle, angleTo(x, y, ped.x, ped.y))) < 0.9) {
        ped.down = 3; ped.flee = 2;
        Wanted.addHeat(8);
        this.sparks(ped.x, ped.y, 6, '#ffd166');
        hitAny = true;
      }
    }
    for (const cop of Police.cops) {
      const d = dist(x, y, cop.x, cop.y);
      if (d < 52 && Math.abs(angleDiff(angle, angleTo(x, y, cop.x, cop.y))) < 0.9) {
        cop.hp -= 26;
        this.sparks(cop.x, cop.y, 8, '#ff2e4d');
        Wanted.addHeat(12);
        hitAny = true;
        if (cop.hp <= 0) { Wanted.addHeat(25); Toasts.push('Cop down! That will bring the whole DPD.'); }
      }
    }
    if (hitAny) AudioSys.blip(180, 0.08, 'square', 0.15);
  },

  sparks(x, y, n, color) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2), sp = rand(60, 260);
      this.particles.push({ x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: rand(0.2, 0.5), max: 0.5, color, size: rand(2, 4) });
    }
  },

  smoke(x, y, n) {
    for (let i = 0; i < n; i++) {
      this.particles.push({ x: x + rand(-14, 14), y: y + rand(-10, 10), vx: rand(-14, 14), vy: rand(-40, -12), life: rand(0.7, 1.4), max: 1.4, color: '#8a8a96', size: rand(6, 12) });
    }
  },

  explodeCar(car) {
    const p = Player.pos();
    this.sparks(car.x, car.y, 26, '#ff6b35');
    this.sparks(car.x, car.y, 14, '#ffe14d');
    this.smoke(car.x, car.y, 12);
    AudioSys.noise(0.7, 0.5, 300);
    AudioSys.blip(60, 0.5, 'sawtooth', 0.3);
    Wanted.addHeat(10);
    Toasts.push('Your car blew up! Get out of the street.');
    Traffic.cars = Traffic.cars.filter(c => c !== car);
    Police.cruisers = Police.cruisers.filter(c => c !== car);
    Player.x = car.x + 50; Player.y = car.y + 50;
    if (dist(p.x, p.y, car.x, car.y) < 90) Player.takeDamage(25, 'explosion');
  },

  update(dt) {
    // Bullets fly, hit walls, peds, cops and the player.
    for (const b of this.bullets) {
      b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
      if (b.life <= 0) continue;
      let dead = false;
      for (const bd of City.buildings) {
        if (b.x > bd.x && b.x < bd.x + bd.w && b.y > bd.y && b.y < bd.y + bd.h) {
          this.sparks(b.x, b.y, 3, '#c9c9d4'); dead = true; break;
        }
      }
      if (dead) { b.life = 0; continue; }
      if (b.fromPlayer) {
        for (const ped of Pedestrians.list) {
          if (ped.down > 0) continue;
          if (dist(b.x, b.y, ped.x, ped.y) < 14) {
            ped.down = 4; ped.flee = 2; Wanted.addHeat(12);
            this.sparks(b.x, b.y, 6, '#ff6b6b'); b.life = 0; break;
          }
        }
        if (b.life > 0) for (const cop of Police.cops) {
          if (dist(b.x, b.y, cop.x, cop.y) < 14) {
            cop.hp -= 34; this.sparks(b.x, b.y, 8, '#ff2e4d');
            Wanted.addHeat(14); b.life = 0;
            if (cop.hp <= 0) { Wanted.addHeat(25); Toasts.push('Cop down! That will bring the whole DPD.'); }
            break;
          }
        }
        if (b.life > 0) for (const c of Police.cruisers) {
          if (dist(b.x, b.y, c.x, c.y) < 26) {
            c.hp = (c.hp || 80) - 20; this.sparks(b.x, b.y, 6, '#9be7ff'); b.life = 0;
            Wanted.addHeat(8);
            if (c.hp <= 0) { this.explodeCar(c); }
            break;
          }
        }
      } else {
        const pp = Player.pos();
        if (Player.onFoot && dist(b.x, b.y, pp.x, pp.y) < 14) {
          Player.takeDamage(8, 'police');
          this.sparks(b.x, b.y, 5, '#ff6b6b'); b.life = 0;
        }
      }
    }
    this.bullets = this.bullets.filter(b => b.life > 0);
    for (const pt of this.particles) {
      pt.x += pt.vx * dt; pt.y += pt.vy * dt; pt.life -= dt;
      pt.vx *= 0.96; pt.vy *= 0.96;
    }
    this.particles = this.particles.filter(pt => pt.life > 0);
    // Smoking wreck warning on the player's car.
    if (Player.car && Player.car.hp !== undefined && Player.car.hp < 35 && chance(dt * 6)) {
      this.smoke(Player.car.x, Player.car.y, 1);
    }
  },

  draw(ctx, cam) {
    for (const b of this.bullets) {
      ctx.strokeStyle = '#ffe14d'; ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(b.x - b.vx * 0.016 - cam.x, b.y - b.vy * 0.016 - cam.y);
      ctx.lineTo(b.x - cam.x, b.y - cam.y);
      ctx.stroke();
    }
    for (const pt of this.particles) {
      ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1);
      ctx.fillStyle = pt.color;
      ctx.fillRect(pt.x - pt.size / 2 - cam.x, pt.y - pt.size / 2 - cam.y, pt.size, pt.size);
    }
    ctx.globalAlpha = 1;
    // Crosshair at the mouse when on foot.
    if (Player.onFoot && !Player.dead && !Player.busted && Game.state === 'playing') {
      const m = Game.mouseScreen();
      ctx.strokeStyle = '#ff2e88'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(m.x, m.y, 10, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(m.x - 14, m.y); ctx.lineTo(m.x - 6, m.y);
      ctx.moveTo(m.x + 6, m.y); ctx.lineTo(m.x + 14, m.y);
      ctx.moveTo(m.x, m.y - 14); ctx.lineTo(m.x, m.y - 6);
      ctx.moveTo(m.x, m.y + 6); ctx.lineTo(m.x, m.y + 14);
      ctx.stroke();
    }
  },
};
