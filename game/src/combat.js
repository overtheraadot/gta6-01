// DUSKPORT combat: knife + pistol pickups, shooting with tracers and muzzle flash,
// armed gang NPCs, and an ally (Mara) who fights alongside once you hand her a weapon.
import * as THREE from 'three';
import { buildHuman, animateHuman } from './character.js';

export function buildPistol() {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: '#1a1c20', roughness: 0.35, metalness: 0.7 });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.09, 0.24), mat);
  g.add(body);
  const barrel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.12), mat);
  barrel.position.set(0, 0.02, 0.16); g.add(barrel);
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.12, 0.06), mat);
  grip.position.set(0, -0.08, -0.08); grip.rotation.x = 0.3; g.add(grip);
  return g;
}

export function buildKnife() {
  const g = new THREE.Group();
  const blade = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.05, 0.3),
    new THREE.MeshStandardMaterial({ color: '#c8ccd4', roughness: 0.2, metalness: 0.95 }));
  blade.position.z = 0.18; g.add(blade);
  const handle = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.06, 0.12),
    new THREE.MeshStandardMaterial({ color: '#2a1a10', roughness: 0.8 }));
  handle.position.z = -0.02; g.add(handle);
  return g;
}

export class Combat {
  constructor(scene, audio, hooks) {
    this.scene = scene; this.audio = audio; this.hooks = hooks;
    this.pickups = [];
    this.enemies = [];
    this.ally = null;
    this.allyArmed = false;
    this.weapon = 'fists'; // 'fists' | 'knife' | 'pistol'
    this.ammo = 0;
    this.shootCooldown = 0;
    this.meleeCooldown = 0;
    this.meleeAnim = 0;
    // Muzzle flash light (reused).
    this.flash = new THREE.PointLight('#ffe9a8', 0, 9);
    scene.add(this.flash);
    this.tracers = [];
  }
  spawnPickup(type, x, z) {
    const g = new THREE.Group();
    const color = type === 'pistol' ? '#ffd166' : type === 'knife' ? '#c8ccd4' : type === 'health' ? '#37e08b' : '#22d3ee';
    const gem = new THREE.Mesh(new THREE.OctahedronGeometry(0.42),
      new THREE.MeshBasicMaterial({ color }));
    gem.position.y = 1.1; g.add(gem);
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.55, 0.75, 24),
      new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.7, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.06; g.add(ring);
    if (type === 'pistol') g.add(buildPistol());
    if (type === 'knife') { const k = buildKnife(); k.position.y = 1.1; g.add(k); }
    g.position.set(x, 0, z);
    this.scene.add(g);
    this.pickups.push({ type, group: g, gem, x, z });
  }
  spawnGang(x, z, n = 3) {
    const spawned = [];
    for (let i = 0; i < n; i++) {
      const h = buildHuman({
        skin: ['#c98d64', '#8a5a34', '#e8b98a'][i % 3],
        jacket: '#4a1a1a', shirt: '#222222', pants: '#1e1e26', hair: '#0c0c0c',
        hairStyle: i === 0 ? 'mohawk' : 'swept', faceSeed: 31 + i * 13,
      });
      const px = x + (i - 1) * 2.4, pz = z + (i % 2) * 2;
      h.group.position.set(px, 0, pz);
      this.scene.add(h.group);
      const gun = buildPistol();
      h.parts.weaponMount.add(gun);
      const e = { ...h, pos: h.group.position, heading: 0, hp: 50, cooldown: 1 + i * 0.4, walkPhase: i, dead: false, deathT: 0 };
      this.enemies.push(e);
      spawned.push(e);
    }
    return spawned;
  }
  spawnAlly(x, z) {
    if (this.ally) return this.ally;
    const h = buildHuman({
      skin: '#e8b98a', jacket: '#5a1a3a', shirt: '#ffd166', pants: '#1e2430', hair: '#6b1a1a',
      hairStyle: 'long', faceSeed: 77, lipColor: '#c23a4a',
    });
    h.group.position.set(x, 0, z);
    this.scene.add(h.group);
    this.ally = { ...h, pos: h.group.position, heading: 0, walkPhase: 0, cooldown: 0 };
    return this.ally;
  }
  giveWeaponToAlly() {
    if (!this.ally || this.allyArmed) return false;
    if (this.weapon !== 'pistol' || this.ammo < 6) return false;
    this.ammo -= 6;
    this.allyArmed = true;
    this.ally.parts.weaponMount.add(buildPistol());
    return true;
  }
  // Player fires the pistol toward the camera forward. Returns true if it hit an enemy.
  playerShoot(camera, playerPos) {
    if (this.weapon !== 'pistol' || this.ammo <= 0 || this.shootCooldown > 0) return false;
    this.shootCooldown = 0.28;
    this.ammo--;
    this.audio.gunshot();
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const origin = camera.position.clone();
    // Muzzle flash at the player's hand (approx: player pos + up).
    this.flash.position.set(playerPos.x, playerPos.y + 1.4, playerPos.z);
    this.flash.intensity = 14;
    let best = null, bestD = 34;
    for (const e of this.enemies) {
      if (e.dead) continue;
      const to = new THREE.Vector3(e.pos.x - origin.x, 1.3 - origin.y, e.pos.z - origin.z);
      const d = to.length();
      if (d > 34) continue;
      const ang = to.normalize().angleTo(dir);
      if (ang < 0.14 && d < bestD) { best = e; bestD = d; }
    }
    let end;
    if (best) {
      best.hp -= 26;
      end = new THREE.Vector3(best.pos.x, 1.3, best.pos.z);
      if (best.hp <= 0) this.killEnemy(best);
      this.hooks.onHitMarker();
    } else {
      end = origin.clone().add(dir.clone().multiplyScalar(30));
      end.y = Math.max(0.2, end.y);
    }
    this.spawnTracer(origin, end);
    return !!best;
  }
  playerMelee(playerPos, playerHeading) {
    if (this.weapon !== 'knife' || this.meleeCooldown > 0) return;
    this.meleeCooldown = 0.45;
    this.meleeAnim = 0.45;
    this.audio.knifeSwing();
    for (const e of this.enemies) {
      if (e.dead) continue;
      const d = Math.hypot(e.pos.x - playerPos.x, e.pos.z - playerPos.z);
      if (d > 2.4) continue;
      const ang = Math.atan2(e.pos.x - playerPos.x, e.pos.z - playerPos.z);
      let diff = ang - playerHeading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      if (Math.abs(diff) < 1.1) {
        e.hp -= 34;
        this.hooks.onHitMarker();
        if (e.hp <= 0) this.killEnemy(e);
      }
    }
  }
  killEnemy(e) {
    e.dead = true; e.deathT = 0;
    e.group.rotation.x = -Math.PI / 2;
    e.group.position.y = 0.25;
    this.hooks.onCash(50);
    this.hooks.onToast('Crew member down — +$50');
  }
  spawnTracer(a, b) {
    const geo = new THREE.BufferGeometry().setFromPoints([a, b]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffe9a8', transparent: true, opacity: 0.95 }));
    this.scene.add(line);
    this.tracers.push({ line, t: 0.07 });
  }
  update(dt, playerPos, playerHeading, camera, inCar, colliders) {
    this.shootCooldown = Math.max(0, this.shootCooldown - dt);
    this.meleeCooldown = Math.max(0, this.meleeCooldown - dt);
    this.meleeAnim = Math.max(0, this.meleeAnim - dt);
    this.flash.intensity = Math.max(0, this.flash.intensity - dt * 90);
    for (const tr of this.tracers) tr.t -= dt;
    this.tracers = this.tracers.filter((tr) => {
      if (tr.t <= 0) { this.scene.remove(tr.line); tr.line.geometry.dispose(); return false; }
      return true;
    });
    // Pickups bob + collect.
    for (let i = this.pickups.length - 1; i >= 0; i--) {
      const p = this.pickups[i];
      p.gem.rotation.y += dt * 2.4;
      p.gem.position.y = 1.1 + Math.sin(performance.now() * 0.003 + p.x) * 0.15;
      if (!inCar && Math.hypot(playerPos.x - p.x, playerPos.z - p.z) < 1.7) {
        if (p.type === 'pistol') { this.weapon = 'pistol'; this.ammo += 24; this.hooks.onToast('PISTOL picked up — 24 rounds'); }
        if (p.type === 'knife') { this.weapon = 'knife'; this.hooks.onToast('KNIFE picked up — LMB to swing'); }
        if (p.type === 'health') { this.hooks.onHeal(40); this.hooks.onToast('MEDKIT +40 HP'); }
        if (p.type === 'ammo') { this.ammo += 24; this.hooks.onToast('AMMO +24 rounds'); }
        this.audio.pickup();
        this.scene.remove(p.group);
        this.pickups.splice(i, 1);
      }
    }
    // Enemies: approach + shoot.
    for (const e of this.enemies) {
      if (e.dead) {
        e.deathT += dt;
        if (e.deathT > 3) { e.group.position.y -= dt * 0.5; if (e.deathT > 4) this.scene.remove(e.group); }
        continue;
      }
      const dx = playerPos.x - e.pos.x, dz = playerPos.z - e.pos.z;
      const dist = Math.hypot(dx, dz);
      const want = Math.atan2(dx, dz);
      let diff = want - e.heading;
      while (diff > Math.PI) diff -= Math.PI * 2;
      while (diff < -Math.PI) diff += Math.PI * 2;
      e.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
      e.group.rotation.y = e.heading;
      if (dist > 11 && dist < 40) {
        const sp = 2.6;
        e.pos.x += Math.sin(e.heading) * sp * dt;
        e.pos.z += Math.cos(e.heading) * sp * dt;
        e.walkPhase += dt * 9;
        animateHuman(e, 'walk', e.walkPhase, 0.4);
      } else {
        animateHuman(e, 'idle', performance.now() * 0.001 + e.walkPhase, 0);
      }
      e.cooldown -= dt;
      if (e.cooldown <= 0 && dist < 26 && !inCar) {
        e.cooldown = 1.1 + Math.random() * 0.7;
        const from = new THREE.Vector3(e.pos.x, 1.35, e.pos.z);
        const to = new THREE.Vector3(playerPos.x, 1.3, playerPos.z);
        this.spawnTracer(from, to);
        this.audio.gunshot();
        if (Math.random() < 0.2) this.hooks.onDamage(5 + Math.floor(Math.random() * 5));
      }
    }
    this.enemies = this.enemies.filter((e) => e.deathT < 4.5);
    // Ally: follow + fight.
    if (this.ally) {
      const a = this.ally;
      const dx = playerPos.x - a.pos.x, dz = playerPos.z - a.pos.z;
      const dist = Math.hypot(dx, dz);
      if (dist > 4.5) {
        const want = Math.atan2(dx, dz);
        let diff = want - a.heading;
        while (diff > Math.PI) diff -= Math.PI * 2;
        while (diff < -Math.PI) diff += Math.PI * 2;
        a.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
        a.pos.x += Math.sin(a.heading) * 3.6 * dt;
        a.pos.z += Math.cos(a.heading) * 3.6 * dt;
        a.walkPhase += dt * 9;
        animateHuman(a, 'walk', a.walkPhase, 0.4);
      } else {
        animateHuman(a, 'idle', performance.now() * 0.001, 0);
      }
      a.group.position.copy(a.pos);
      a.group.rotation.y = a.heading;
      a.cooldown -= dt;
      if (this.allyArmed && a.cooldown <= 0) {
        let best = null, bestD = 30;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = Math.hypot(e.pos.x - a.pos.x, e.pos.z - a.pos.z);
          if (d < bestD) { best = e; bestD = d; }
        }
        if (best) {
          a.cooldown = 0.9;
          const from = new THREE.Vector3(a.pos.x, 1.35, a.pos.z);
          const to = new THREE.Vector3(best.pos.x, 1.3, best.pos.z);
          this.spawnTracer(from, to);
          this.audio.gunshot();
          best.hp -= 12;
          if (best.hp <= 0) this.killEnemy(best);
        }
      }
    }
  }
  aliveEnemies() { return this.enemies.filter((e) => !e.dead).length; }
}
