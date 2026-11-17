// DUSKPORT pedestrians: crowds on the sidewalks, plus police on foot.
// Lightweight human rig (fewer meshes than the hero) so a crowd stays cheap.
import * as THREE from 'three';
import { paintFaceTexture } from './character.js';
import { mulberry, WORLD } from './city.js';
import { collideCircle } from './vehicles.js';

const SKINS = ['#c98d64', '#8a5a34', '#e8b98a', '#6b4423', '#d8a077'];
const JACKETS = ['#3a4a6b', '#6b3a3a', '#3a6b4a', '#5a5a5a', '#7a5a2e', '#4a3a6b'];
const PANTS = ['#2c3a55', '#3a3a3a', '#4a3a2e', '#2e4a3a'];

function buildPedestrian(seed) {
  const rnd = mulberry(seed);
  const skin = SKINS[Math.floor(rnd() * SKINS.length)];
  const g = new THREE.Group();
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.75 });
  const jacket = JACKETS[Math.floor(rnd() * JACKETS.length)];
  const pants = PANTS[Math.floor(rnd() * PANTS.length)];
  const hair = ['#17110c', '#3a2410', '#5a5a5a', '#1a1a2e'][Math.floor(rnd() * 4)];
  // Legs.
  const legL = new THREE.Group(); legL.position.set(-0.1, 0.85, 0);
  const legR = new THREE.Group(); legR.position.set(0.1, 0.85, 0);
  for (const leg of [legL, legR]) {
    const l = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.8, 0.17),
      new THREE.MeshStandardMaterial({ color: pants, roughness: 0.9 }));
    l.position.y = -0.42; l.castShadow = true; leg.add(l);
  }
  g.add(legL, legR);
  // Torso + arms.
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.55, 0.26),
    new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.85 }));
  torso.position.y = 1.12; torso.castShadow = true; g.add(torso);
  const armL = new THREE.Group(); armL.position.set(-0.28, 1.36, 0);
  const armR = new THREE.Group(); armR.position.set(0.28, 1.36, 0);
  for (const arm of [armL, armR]) {
    const a = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.62, 0.14),
      new THREE.MeshStandardMaterial({ color: jacket, roughness: 0.85 }));
    a.position.y = -0.31; a.castShadow = true; arm.add(a);
  }
  g.add(armL, armR);
  // Head with a real painted face + hair.
  const head = new THREE.Group(); head.position.y = 1.6; g.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.15, 14, 12), skinMat);
  skull.scale.set(0.92, 1.08, 0.98); skull.castShadow = true; head.add(skull);
  const faceTex = paintFaceTexture(seed, { skin });
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.143, 0.135, 0.28, 16, 1, true, -0.95, 1.9),
    new THREE.MeshStandardMaterial({ map: faceTex, emissiveMap: faceTex, emissive: 0xffffff, emissiveIntensity: 0.25, roughness: 0.7 }),
  );
  plate.position.set(0, 0.01, 0.012); head.add(plate);
  const hairCap = new THREE.Mesh(new THREE.SphereGeometry(0.16, 12, 8, 0, Math.PI * 2, 0, Math.PI * 0.5),
    new THREE.MeshStandardMaterial({ color: hair, roughness: 0.6 }));
  hairCap.scale.set(0.95, 0.85, 1.02); hairCap.position.set(0, 0.04, -0.01); head.add(hairCap);
  return { group: g, legL, legR, armL, armR, head };
}

export function spawnPedestrians(scene, count = 14) {
  const rnd = mulberry(4242);
  const peds = [];
  for (let i = 0; i < count; i++) {
    const p = buildPedestrian(1000 + i * 17);
    const x = -100 + rnd() * 200, z = -100 + rnd() * 92;
    p.group.position.set(x, 0, z);
    p.group.rotation.y = rnd() * Math.PI * 2;
    scene.add(p.group);
    peds.push({
      ...p, pos: p.group.position, heading: p.group.rotation.y,
      speed: 1.1 + rnd() * 0.7, target: new THREE.Vector3(x, 0, z),
      walkPhase: rnd() * 10, fleeing: false, state: 'walk',
    });
  }
  return peds;
}

function pickTarget(ped, rnd) {
  const a = rnd() * Math.PI * 2, d = 8 + rnd() * 22;
  ped.target.set(
    Math.max(-105, Math.min(105, ped.pos.x + Math.cos(a) * d)),
    0,
    Math.max(-105, Math.min(95, ped.pos.z + Math.sin(a) * d)),
  );
}

export function updatePedestrians(peds, dt, colliders, threats = []) {
  const rnd = Math.random;
  for (const ped of peds) {
    let speed = ped.speed;
    // Flee from nearby threats (gunfire, speeding car).
    let flee = false;
    for (const t of threats) {
      const d = Math.hypot(ped.pos.x - t.x, ped.pos.z - t.z);
      if (d < t.radius) {
        flee = true;
        const a = Math.atan2(ped.pos.x - t.x, ped.pos.z - t.z);
        ped.target.set(ped.pos.x + Math.sin(a) * 18, 0, ped.pos.z + Math.cos(a) * 18);
        break;
      }
    }
    if (flee) speed = ped.speed * 2.6;
    const dx = ped.target.x - ped.pos.x, dz = ped.target.z - ped.pos.z;
    const dist = Math.hypot(dx, dz);
    if (dist < 1.2) { pickTarget(ped, rnd); continue; }
    const want = Math.atan2(dx, dz);
    let diff = want - ped.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;
    ped.heading += Math.max(-2.5 * dt, Math.min(2.5 * dt, diff));
    const nx = ped.pos.x + Math.sin(ped.heading) * speed * dt;
    const nz = ped.pos.z + Math.cos(ped.heading) * speed * dt;
    const test = new THREE.Vector3(nx, 0, nz);
    collideCircle(test, 0.5, colliders);
    ped.pos.copy(test);
    ped.group.position.copy(ped.pos);
    ped.group.rotation.y = ped.heading;
    ped.walkPhase += dt * (flee ? 11 : 7);
    const s = Math.sin(ped.walkPhase) * (flee ? 0.7 : 0.45);
    ped.legL.rotation.x = s; ped.legR.rotation.x = -s;
    ped.armL.rotation.x = -s * 0.8; ped.armR.rotation.x = s * 0.8;
  }
}

// ---- Police on foot ----
export function spawnFootCop(scene, x, z) {
  const p = buildPedestrian(777);
  // Recolour to Duskport PD navy + cap.
  p.group.traverse((o) => {
    if (o.isMesh && o.material && o.material.color) {
      if (o.material.color.getHexString() === '3a4a6b' || true) { /* keep */ }
    }
  });
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.17, 0.07, 12),
    new THREE.MeshStandardMaterial({ color: '#101828', roughness: 0.6 }));
  cap.position.set(0, 0.17, 0); p.head.add(cap);
  const brim = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.14),
    new THREE.MeshStandardMaterial({ color: '#101828', roughness: 0.6 }));
  brim.position.set(0, 0.14, 0.16); p.head.add(brim);
  p.group.position.set(x, 0, z);
  scene.add(p.group);
  return { ...p, pos: p.group.position, heading: 0, walkPhase: 0, hp: 60, isCop: true };
}

export function updateFootCop(cop, dt, playerPos, colliders) {
  const dx = playerPos.x - cop.pos.x, dz = playerPos.z - cop.pos.z;
  const dist = Math.hypot(dx, dz);
  const want = Math.atan2(dx, dz);
  let diff = want - cop.heading;
  while (diff > Math.PI) diff -= Math.PI * 2;
  while (diff < -Math.PI) diff += Math.PI * 2;
  cop.heading += Math.max(-3 * dt, Math.min(3 * dt, diff));
  if (dist > 1.4) {
    const sp = 3.4;
    const nx = cop.pos.x + Math.sin(cop.heading) * sp * dt;
    const nz = cop.pos.z + Math.cos(cop.heading) * sp * dt;
    const test = new THREE.Vector3(nx, 0, nz);
    collideCircle(test, 0.5, colliders);
    cop.pos.copy(test);
  }
  cop.group.position.copy(cop.pos);
  cop.group.rotation.y = cop.heading;
  cop.walkPhase += dt * 10;
  const s = Math.sin(cop.walkPhase) * 0.6;
  cop.legL.rotation.x = s; cop.legR.rotation.x = -s;
  cop.armL.rotation.x = -s * 0.8; cop.armR.rotation.x = s * 0.8;
  return dist;
}
