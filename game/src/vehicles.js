// DUSKPORT vehicles: detailed cars (cabin, glass, turning wheels, lights), traffic AI,
// police pursuit. Arcade driving: no external physics library.
import * as THREE from 'three';
import { mulberry } from './city.js';

const CAR_COLORS = ['#b02030', '#2050b0', '#d8a020', '#2a8a4a', '#6a3ab0', '#c0c8d0', '#20242e', '#c25a1a'];

export function collideCircle(pos, radius, colliders) {
  for (const c of colliders) {
    const cx = Math.max(c.minX, Math.min(pos.x, c.maxX));
    const cz = Math.max(c.minZ, Math.min(pos.z, c.maxZ));
    const dx = pos.x - cx, dz = pos.z - cz;
    const d2 = dx * dx + dz * dz;
    if (d2 < radius * radius) {
      if (d2 > 0.0001) {
        const d = Math.sqrt(d2);
        pos.x = cx + (dx / d) * radius;
        pos.z = cz + (dz / d) * radius;
      } else {
        pos.x = c.maxX + radius;
      }
      return true;
    }
  }
  if (pos.x < -112) pos.x = -112; if (pos.x > 112) pos.x = 112;
  if (pos.z < -112) pos.z = -112; if (pos.z > 112) pos.z = 112;
  return false;
}

// Build one detailed car. type: 'sedan' | 'coupe' | 'taxi' | 'van' | 'police'.
export function buildCar(type = 'sedan', color = '#b02030') {
  const g = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.55 });
  const glassMat = new THREE.MeshStandardMaterial({ color: '#0e1622', roughness: 0.15, metalness: 0.8 });
  const darkMat = new THREE.MeshStandardMaterial({ color: '#14161a', roughness: 0.7 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: '#c8ccd4', roughness: 0.25, metalness: 0.9 });
  const isVan = type === 'van';
  const L = isVan ? 5.0 : 4.3, W = 1.9, bodyH = 0.62;

  const body = new THREE.Mesh(new THREE.BoxGeometry(W, bodyH, L), bodyMat);
  body.position.y = 0.55; body.castShadow = true; g.add(body);
  // Hood + trunk shaping.
  const hood = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.16, 1.0), bodyMat);
  hood.position.set(0, 0.9, L / 2 - 0.7); hood.castShadow = true; g.add(hood);
  const trunk = new THREE.Mesh(new THREE.BoxGeometry(W - 0.12, 0.14, 0.8), bodyMat);
  trunk.position.set(0, 0.88, -L / 2 + 0.6); trunk.castShadow = true; g.add(trunk);
  // Cabin with glass.
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(W - 0.28, 0.55, isVan ? 2.6 : 1.9), glassMat);
  cabin.position.set(0, 1.12, isVan ? -0.2 : -0.15); cabin.castShadow = true; g.add(cabin);
  const roof = new THREE.Mesh(new THREE.BoxGeometry(W - 0.2, 0.08, isVan ? 2.7 : 1.7), bodyMat);
  roof.position.set(0, 1.42, isVan ? -0.2 : -0.15); roof.castShadow = true; g.add(roof);
  // Bumpers, grille, mirrors.
  const bumperF = new THREE.Mesh(new THREE.BoxGeometry(W, 0.18, 0.22), chromeMat);
  bumperF.position.set(0, 0.38, L / 2 + 0.05); g.add(bumperF);
  const bumperR = bumperF.clone(); bumperR.position.z = -L / 2 - 0.05; g.add(bumperR);
  const grille = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.16, 0.06), darkMat);
  grille.position.set(0, 0.62, L / 2 + 0.02); g.add(grille);
  for (const s of [-1, 1]) {
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.1, 0.12), bodyMat);
    mirror.position.set(s * (W / 2 + 0.06), 1.05, 0.7); g.add(mirror);
  }
  // Headlights (glowing) + taillights.
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff6c8' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#ff2a2a' });
  for (const s of [-1, 1]) {
    const hl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.06), headMat);
    hl.position.set(s * 0.6, 0.66, L / 2 + 0.03); g.add(hl);
    const tl = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.12, 0.06), tailMat);
    tl.position.set(s * 0.6, 0.66, -L / 2 - 0.03); g.add(tl);
  }
  // Type extras.
  if (type === 'coupe') {
    const spoiler = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.06, 0.3), darkMat);
    spoiler.position.set(0, 1.02, -L / 2 + 0.25); spoiler.castShadow = true; g.add(spoiler);
    const strutL = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.14, 0.08), darkMat);
    strutL.position.set(-0.6, 0.94, -L / 2 + 0.25); g.add(strutL);
    const strutR = strutL.clone(); strutR.position.x = 0.6; g.add(strutR);
  }
  if (type === 'taxi') {
    const sign = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.16, 0.3),
      new THREE.MeshBasicMaterial({ color: '#ffd166' }));
    sign.position.set(0, 1.55, -0.15); g.add(sign);
  }
  let lightBar = null;
  if (type === 'police') {
    // Black-and-white doors.
    for (const s of [-1, 1]) {
      const door = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.5, 1.3),
        new THREE.MeshStandardMaterial({ color: '#e8e8e8', roughness: 0.4, metalness: 0.4 }));
      door.position.set(s * (W / 2 + 0.01), 0.62, -0.1); g.add(door);
    }
    lightBar = new THREE.Group();
    const barBase = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.1, 0.3), darkMat);
    barBase.position.y = 0; lightBar.add(barBase);
    const red = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.28),
      new THREE.MeshBasicMaterial({ color: '#ff2020' }));
    red.position.x = -0.28; lightBar.add(red);
    const blue = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.14, 0.28),
      new THREE.MeshBasicMaterial({ color: '#2060ff' }));
    blue.position.x = 0.28; lightBar.add(blue);
    lightBar.position.set(0, 1.52, -0.15);
    lightBar.userData = { red, blue };
    g.add(lightBar);
  }
  // Wheels: turning front wheels, spinning all four.
  const wheelGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.26, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  const tireMat = new THREE.MeshStandardMaterial({ color: '#0c0c0e', roughness: 0.9 });
  const hubMat = new THREE.MeshStandardMaterial({ color: '#b8bcc4', roughness: 0.3, metalness: 0.8 });
  const wheels = [];
  const steerGroups = [];
  for (const [sx, sz] of [[-1, 1], [1, 1], [-1, -1], [1, -1]]) {
    const steer = new THREE.Group();
    steer.position.set(sx * (W / 2 - 0.08), 0.36, sz * (L / 2 - 0.85));
    const tire = new THREE.Mesh(wheelGeo, tireMat); tire.castShadow = true;
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.28, 10), hubMat);
    hub.rotation.z = Math.PI / 2;
    steer.add(tire, hub);
    g.add(steer);
    wheels.push(tire);
    if (sz > 0) steerGroups.push(steer);
  }
  return {
    group: g, wheels, steerGroups, lightBar, type,
    pos: new THREE.Vector3(), heading: 0, speed: 0, steer: 0,
    hp: 100, isPolice: type === 'police', radius: 1.6,
  };
}

export function placeCar(car, x, z, heading) {
  car.pos.set(x, 0, z); car.heading = heading; car.speed = 0;
  car.group.position.set(x, 0, z);
  car.group.rotation.y = heading;
}

// Arcade drive step for the player car. Returns true if it hit a building.
export function driveCar(car, input, dt, colliders, otherCars) {
  const maxSpeed = car.isPolice ? 26 : 30;
  const accel = 16, brake = 26;
  if (input.forward) car.speed += accel * dt;
  if (input.back) car.speed -= (car.speed > 0.5 ? brake : 10) * dt;
  if (!input.forward && !input.back) car.speed -= Math.sign(car.speed) * 6 * dt;
  if (Math.abs(car.speed) < 0.15 && !input.forward && !input.back) car.speed = 0;
  car.speed = Math.max(-10, Math.min(maxSpeed, car.speed));
  const steerTarget = (input.left ? 1 : 0) - (input.right ? 1 : 0);
  car.steer += (steerTarget * 0.55 - car.steer) * Math.min(1, dt * 8);
  const spd = Math.abs(car.speed);
  if (spd > 0.1) {
    car.heading += car.steer * (car.speed >= 0 ? 1 : -1) * Math.min(1, spd / 8) * 1.9 * dt;
  }
  const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
  const test = new THREE.Vector3(nx, 0, nz);
  const hit = collideCircle(test, 1.6, colliders);
  if (hit) car.speed *= 0.55;
  car.pos.copy(test);
  // Soft push from other cars.
  for (const o of otherCars) {
    if (o === car) continue;
    const dx = car.pos.x - o.pos.x, dz = car.pos.z - o.pos.z;
    const d = Math.hypot(dx, dz);
    if (d < 3.2 && d > 0.01) {
      car.pos.x = o.pos.x + (dx / d) * 3.2;
      car.pos.z = o.pos.z + (dz / d) * 3.2;
      car.speed *= 0.85;
    }
  }
  car.group.position.copy(car.pos);
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
  for (const s of car.steerGroups) s.rotation.y = car.steer * 0.5;
  return hit;
}

// ---- Traffic ----
export function spawnTraffic(scene, count = 10) {
  const rnd = mulberry(99);
  const roads = [-88, -66, -44, -22, 0, 22, 44, 66, 88];
  const cars = [];
  const types = ['sedan', 'sedan', 'taxi', 'van', 'coupe'];
  for (let i = 0; i < count; i++) {
    const type = types[Math.floor(rnd() * types.length)];
    const color = type === 'taxi' ? '#f2c200' : CAR_COLORS[Math.floor(rnd() * CAR_COLORS.length)];
    const car = buildCar(type, color);
    // Rectangular loop on the road grid: corners on intersections so cars never cut blocks.
    const pick2 = () => {
      const a = roads[Math.floor(rnd() * roads.length)];
      let b = roads[Math.floor(rnd() * roads.length)];
      if (b === a) b = roads[(roads.indexOf(a) + 2) % roads.length];
      return [Math.min(a, b), Math.max(a, b)];
    };
    const [x1, x2] = pick2(), [z1, z2] = pick2();
    const loop = [
      new THREE.Vector3(x1, 0, z1), new THREE.Vector3(x2, 0, z1),
      new THREE.Vector3(x2, 0, z2), new THREE.Vector3(x1, 0, z2),
    ];
    car.loop = loop; car.loopIdx = Math.floor(rnd() * 4);
    car.cruise = 6 + rnd() * 3.5;
    const start = loop[car.loopIdx];
    placeCar(car, start.x, start.z, 0);
    scene.add(car.group);
    cars.push(car);
  }
  return cars;
}

export function updateTraffic(cars, dt, playerCar, colliders) {
  for (const car of cars) {
    const target = car.loop[car.loopIdx];
    const dx = target.x - car.pos.x, dz = target.z - car.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 3) { car.loopIdx = (car.loopIdx + 1) % car.loop.length; continue; }
    const want = Math.atan2(dx, dz);
    let diff = want - car.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    car.heading += Math.max(-1.6 * dt, Math.min(1.6 * dt, diff));
    // Slow down for the car ahead (player included).
    let slow = false;
    const aheadX = car.pos.x + Math.sin(car.heading) * 6;
    const aheadZ = car.pos.z + Math.cos(car.heading) * 6;
    if (playerCar && Math.hypot(playerCar.pos.x - aheadX, playerCar.pos.z - aheadZ) < 4) slow = true;
    for (const o of cars) {
      if (o !== car && Math.hypot(o.pos.x - aheadX, o.pos.z - aheadZ) < 4) { slow = true; break; }
    }
    const targetSpeed = slow ? 0 : car.cruise;
    car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.5);
    car.pos.x += Math.sin(car.heading) * car.speed * dt;
    car.pos.z += Math.cos(car.heading) * car.speed * dt;
    car.group.position.copy(car.pos);
    car.group.rotation.y = car.heading;
    for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
  }
}

// ---- Police pursuit ----
export function spawnPolice(scene, x, z) {
  const car = buildCar('police', '#14161a');
  placeCar(car, x, z, 0);
  scene.add(car.group);
  return car;
}

export function updatePolice(car, dt, targetPos, colliders, allCars, flashT, targetOnFoot = false) {
  // Steer toward the target with a little weave.
  const dx = targetPos.x - car.pos.x, dz = targetPos.z - car.pos.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz) + Math.sin(flashT * 1.3 + car.pos.x) * 0.25;
  let diff = want - car.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  car.heading += Math.max(-2.4 * dt, Math.min(2.4 * dt, diff));
  // Against an on-foot player the patrol car holds off at 7 units and lets foot cops
  // do the arresting — it never runs the player down.
  const targetSpeed = targetOnFoot ? (dist > 8 ? 18 : 0) : (dist > 40 ? 27 : 22);
  car.speed += (targetSpeed - car.speed) * Math.min(1, dt * 1.2);
  const nx = car.pos.x + Math.sin(car.heading) * car.speed * dt;
  const nz = car.pos.z + Math.cos(car.heading) * car.speed * dt;
  const test = new THREE.Vector3(nx, 0, nz);
  if (collideCircle(test, 1.6, colliders)) { car.speed *= 0.5; car.heading += 0.6 * dt; }
  car.pos.copy(test);
  for (const o of allCars) {
    if (o === car) continue;
    const ox = car.pos.x - o.pos.x, oz = car.pos.z - o.pos.z;
    const d = Math.hypot(ox, oz);
    if (d < 3.2 && d > 0.01) {
      car.pos.x = o.pos.x + (ox / d) * 3.2;
      car.pos.z = o.pos.z + (oz / d) * 3.2;
    }
  }
  car.group.position.copy(car.pos);
  car.group.rotation.y = car.heading;
  for (const w of car.wheels) w.rotation.x += (car.speed * dt) / 0.36;
  // Flashing light bar.
  if (car.lightBar) {
    const on = Math.floor(flashT * 4) % 2 === 0;
    car.lightBar.userData.red.material.color.set(on ? '#ff2020' : '#551010');
    car.lightBar.userData.blue.material.color.set(on ? '#101055' : '#2060ff');
  }
  return dist;
}
