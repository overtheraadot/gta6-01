// DUSKPORT city: an original dusk/neon Industrial District with a beach coast.
// Grid streets, varied buildings with lit windows, ground-floor storefronts with awnings
// and neon signs (original names only), rooftop props, landmarks, street props.
import * as THREE from 'three';

export function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

export const WORLD = 120; // half-size of the playable city (x,z in [-120, 120])
export const STORE_NAMES = [
  'NEON NOODLE', 'VOLT GARAGE', 'DOCKSIDE BAR', 'PALM MOTEL', 'LUCKY 7 PAWN',
  'TIDE LAUNDRY', 'EMBER TATTOO', 'KAIRO COFFEE', 'NIGHT MARKET', 'HARBOUR HOTEL',
  'RUST ANCHOR', 'PIER 9 DINER', 'VICE VINYL', 'GULL WELDING', 'SALT AIR SURF',
];
const NEON_COLORS = ['#ff2e88', '#22d3ee', '#ffd166', '#7dff9e', '#ff7a3c', '#c084fc'];

function facadeTexture(seed, base) {
  const rnd = mulberry(seed);
  const c = document.createElement('canvas'); c.width = 256; c.height = 512;
  const g = c.getContext('2d');
  g.fillStyle = base; g.fillRect(0, 0, 256, 512);
  g.fillStyle = 'rgba(0,0,0,0.25)';
  for (let i = 0; i < 40; i++) g.fillRect(rnd() * 256, rnd() * 512, 30 + rnd() * 60, 3);
  const cols = 6, rows = 12, ww = 30, hh = 26, gx = 14, gy = 14;
  for (let r = 0; r < rows; r++) {
    for (let col = 0; col < cols; col++) {
      const x = gx + col * ((256 - 2 * gx - ww) / (cols - 1));
      const y = gy + r * ((512 - 2 * gy - hh) / (rows - 1));
      const lit = rnd() < 0.42;
      g.fillStyle = lit ? (rnd() < 0.7 ? '#ffd27a' : '#9fd8ff') : '#10131c';
      g.fillRect(x, y, ww, hh);
      g.fillStyle = 'rgba(255,255,255,0.12)';
      g.fillRect(x, y, ww, 4);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function neonSignTexture(name, color) {
  const c = document.createElement('canvas'); c.width = 512; c.height = 128;
  const g = c.getContext('2d');
  g.clearRect(0, 0, 512, 128);
  g.font = '900 52px Arial, sans-serif';
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.shadowColor = color; g.shadowBlur = 26;
  g.strokeStyle = color; g.lineWidth = 3;
  g.strokeText(name, 256, 64);
  g.fillStyle = '#ffffff'; g.fillText(name, 256, 64);
  g.shadowBlur = 8; g.fillStyle = color; g.fillText(name, 256, 64);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function groundTexture() {
  const S = 2048, c = document.createElement('canvas'); c.width = S; c.height = S;
  const g = c.getContext('2d');
  const px = (v) => ((v + WORLD + 8) / (2 * (WORLD + 8))) * S; // world -> canvas px
  g.fillStyle = '#3d4254'; g.fillRect(0, 0, S, S); // sidewalk base
  // City blocks (slightly lighter slabs).
  const roads = [-88, -66, -44, -22, 0, 22, 44, 66, 88];
  g.fillStyle = '#444a5e';
  for (let i = 0; i < roads.length - 1; i++) {
    for (let j = 0; j < roads.length - 1; j++) {
      g.fillRect(px(roads[i] + 2.5), px(roads[j] + 2.5), px(roads[i + 1] - 2.5) - px(roads[i] + 2.5), px(roads[j + 1] - 2.5) - px(roads[j] + 2.5));
    }
  }
  // Beach sand at the south edge (z > 96).
  const sand = g.createLinearGradient(0, px(96), 0, S);
  sand.addColorStop(0, '#c9a86a'); sand.addColorStop(1, '#a8824e');
  g.fillStyle = sand; g.fillRect(0, px(96), S, S - px(96));
  g.fillStyle = 'rgba(255,255,255,0.25)';
  for (let i = 0; i < 60; i++) g.fillRect(Math.random() * S, px(96) + Math.random() * (S - px(96)), 3, 3);
  // Roads.
  g.fillStyle = '#262a35';
  for (const r of roads) {
    g.fillRect(px(r - 2.5), 0, px(r + 2.5) - px(r - 2.5), px(96));
    g.fillRect(0, px(r - 2.5), S, px(r + 2.5) - px(r - 2.5));
  }
  // Lane dashes.
  g.fillStyle = '#d8b13c';
  for (const r of roads) {
    for (let v = -110; v < 96; v += 8) {
      g.fillRect(px(r) - 2, px(v), 4, 14);
      g.fillRect(px(v), px(r) - 2, 14, 4);
    }
  }
  // Crosswalks at main intersections.
  g.fillStyle = 'rgba(240,240,240,0.85)';
  for (const rx of [-44, 0, 44]) for (const rz of [-44, 0, 44]) {
    for (let k = -2; k <= 2; k++) {
      g.fillRect(px(rx + k * 1.1) - 3, px(rz - 5.5), 6, 26);
      g.fillRect(px(rx - 5.5), px(rz + k * 1.1) - 3, 26, 6);
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

export function buildCity(scene) {
  const rnd = mulberry(20261117);
  const colliders = [];
  const addCollider = (x, z, hw, hd) => colliders.push({ minX: x - hw, maxX: x + hw, minZ: z - hd, maxZ: z + hd });
  const group = new THREE.Group();
  scene.add(group);

  // Ground: one textured plane (streets, blocks, beach).
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry((WORLD + 8) * 2, (WORLD + 8) * 2),
    new THREE.MeshStandardMaterial({ map: groundTexture(), roughness: 0.95 }),
  );
  ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true;
  group.add(ground);

  // Sea beyond the beach (south, z > 112).
  const sea = new THREE.Mesh(
    new THREE.PlaneGeometry(600, 220),
    new THREE.MeshStandardMaterial({ color: '#0e3a5c', roughness: 0.25, metalness: 0.35, transparent: true, opacity: 0.92 }),
  );
  sea.rotation.x = -Math.PI / 2; sea.position.set(0, -0.15, 112 + 110);
  group.add(sea);
  addCollider(0, 118, 200, 8); // invisible wall at the waterline

  const facadeMats = [];
  const bases = ['#3a3f55', '#4a3a44', '#37424e', '#4e4034', '#2f3a4a', '#453550'];
  for (let i = 0; i < 6; i++) {
    const tex = facadeTexture(100 + i, bases[i]);
    facadeMats.push(new THREE.MeshStandardMaterial({
      map: tex, emissiveMap: tex, emissive: 0xffffff, emissiveIntensity: 0.5, roughness: 0.9,
    }));
  }
  const roofMat = new THREE.MeshStandardMaterial({ color: '#22242e', roughness: 1 });
  const awningColors = ['#c22e4a', '#1d7a5c', '#b8860b', '#27408b', '#7a2e8b'];

  const buildings = [];
  let signIdx = 0;
  const blockCenters = [-77, -55, -33, -11, 11, 33, 55, 77];
  for (const bx of blockCenters) {
    for (const bz of blockCenters) {
      if (bz > 88) continue;
      // Landmark overrides.
      let h, w, d;
      if (bx === 55 && bz === -55) { // HARBOUR HOTEL tower
        h = 58; w = 16; d = 16;
      } else if (bx === -55 && bz === 55) { // parking garage (low, wide, open decks)
        h = 12; w = 18; d = 18;
      } else {
        h = 7 + rnd() * 22; w = 9 + rnd() * 7; d = 9 + rnd() * 7;
        if (rnd() < 0.18) h += 14; // occasional tall block
      }
      const mat = facadeMats[Math.floor(rnd() * facadeMats.length)];
      const b = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      b.position.set(bx, h / 2, bz);
      b.castShadow = true; b.receiveShadow = true;
      group.add(b);
      // Roof slab + parapet.
      const roof = new THREE.Mesh(new THREE.BoxGeometry(w + 0.6, 0.5, d + 0.6), roofMat);
      roof.position.set(bx, h + 0.25, bz); roof.castShadow = true; group.add(roof);
      // Rooftop props: water tower on tall buildings, AC units everywhere.
      if (h > 16 && rnd() < 0.6) {
        const tower = new THREE.Group();
        const tank = new THREE.Mesh(new THREE.CylinderGeometry(1.4, 1.6, 2.6, 10),
          new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 0.9 }));
        tank.position.y = 3.4; tank.castShadow = true; tower.add(tank);
        const cone = new THREE.Mesh(new THREE.ConeGeometry(1.6, 1.2, 10),
          new THREE.MeshStandardMaterial({ color: '#4a3421', roughness: 0.9 }));
        cone.position.y = 5.3; tower.add(cone);
        for (let l = 0; l < 4; l++) {
          const leg = new THREE.Mesh(new THREE.BoxGeometry(0.18, 2.4, 0.18),
            new THREE.MeshStandardMaterial({ color: '#33302a' }));
          leg.position.set(Math.cos(l * Math.PI / 2 + Math.PI / 4) * 1.1, 1.2, Math.sin(l * Math.PI / 2 + Math.PI / 4) * 1.1);
          tower.add(leg);
        }
        tower.position.set(bx + w * 0.2, h + 0.5, bz - d * 0.15);
        group.add(tower);
      }
      const acCount = 1 + Math.floor(rnd() * 3);
      for (let a = 0; a < acCount; a++) {
        const ac = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 1.2),
          new THREE.MeshStandardMaterial({ color: '#8a8f98', roughness: 0.7, metalness: 0.4 }));
        ac.position.set(bx + (rnd() - 0.5) * (w - 2), h + 0.85, bz + (rnd() - 0.5) * (d - 2));
        ac.castShadow = true; group.add(ac);
      }
      if (rnd() < 0.4) { // antenna
        const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.09, 5, 6),
          new THREE.MeshStandardMaterial({ color: '#222222', metalness: 0.7, roughness: 0.4 }));
        ant.position.set(bx - w * 0.3, h + 3, bz + d * 0.25); group.add(ant);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6),
          new THREE.MeshBasicMaterial({ color: '#ff4040' }));
        tip.position.set(bx - w * 0.3, h + 5.6, bz + d * 0.25); group.add(tip);
      }
      // Ground-floor storefront: awning + neon sign on the road-facing side.
      const name = STORE_NAMES[signIdx % STORE_NAMES.length];
      const color = NEON_COLORS[signIdx % NEON_COLORS.length];
      signIdx++;
      const faceSouth = bz >= 0; // face the nearest road (south side if in south half)
      const signTex = neonSignTexture(name, color);
      const sign = new THREE.Mesh(new THREE.PlaneGeometry(7.5, 1.9),
        new THREE.MeshBasicMaterial({ map: signTex, transparent: true }));
      sign.position.set(bx, 3.6, bz + (faceSouth ? d / 2 + 0.08 : -d / 2 - 0.08));
      if (!faceSouth) sign.rotation.y = Math.PI;
      group.add(sign);
      const awn = new THREE.Mesh(new THREE.BoxGeometry(8.4, 0.18, 1.6),
        new THREE.MeshStandardMaterial({ color: awningColors[signIdx % awningColors.length], roughness: 0.9 }));
      awn.position.set(bx, 2.7, bz + (faceSouth ? d / 2 + 0.8 : -d / 2 - 0.8));
      awn.rotation.x = faceSouth ? 0.25 : -0.25;
      awn.castShadow = true; group.add(awn);
      // Storefront glass glow.
      const glass = new THREE.Mesh(new THREE.PlaneGeometry(w - 2, 2.2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color(color).multiplyScalar(0.55) }));
      glass.position.set(bx, 1.35, bz + (faceSouth ? d / 2 + 0.03 : -d / 2 - 0.03));
      if (!faceSouth) glass.rotation.y = Math.PI;
      group.add(glass);

      addCollider(bx, bz, w / 2 + 0.3, d / 2 + 0.3);
      buildings.push({ x: bx, z: bz, w, h, d, name });
    }
  }

  // Parking garage decks (open levels, drivable look).
  const garage = new THREE.Group();
  for (let lvl = 0; lvl < 3; lvl++) {
    const deck = new THREE.Mesh(new THREE.BoxGeometry(18, 0.4, 18),
      new THREE.MeshStandardMaterial({ color: '#3c3f4a', roughness: 0.95 }));
    deck.position.set(-55, 3 + lvl * 3.4, 55); deck.receiveShadow = true; garage.add(deck);
  }
  group.add(garage);

  // Streetlights along the main roads.
  const poleMat = new THREE.MeshStandardMaterial({ color: '#1c1e24', metalness: 0.6, roughness: 0.5 });
  const lampMat = new THREE.MeshBasicMaterial({ color: '#ffd9a0' });
  for (const r of [-66, -22, 22, 66]) {
    for (let v = -88; v <= 88; v += 22) {
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.12, 5.4, 8), poleMat);
      pole.position.set(r + 3.2, 2.7, v); pole.castShadow = true; group.add(pole);
      const arm = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.1, 0.1), poleMat);
      arm.position.set(r + 2.5, 5.35, v); group.add(arm);
      const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.12, 0.3), lampMat);
      lamp.position.set(r + 1.8, 5.3, v); group.add(lamp);
    }
  }
  // Traffic lights at the four main intersections.
  for (const [ix, iz] of [[-44, -44], [44, -44], [-44, 44], [44, 44]]) {
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 6, 8), poleMat);
    pole.position.set(ix + 3.4, 3, iz + 3.4); group.add(pole);
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.2, 0.5),
      new THREE.MeshStandardMaterial({ color: '#111111', roughness: 0.6 }));
    head.position.set(ix + 3.4, 6.2, iz + 3.4); group.add(head);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6),
      new THREE.MeshBasicMaterial({ color: '#37e08b' }));
    light.position.set(ix + 3.4, 6.45, iz + 3.65); group.add(light);
  }
  // Palm trees along the beach promenade.
  for (let i = 0; i < 9; i++) {
    const px = -88 + i * 22 + (rnd() - 0.5) * 6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 5.5, 8),
      new THREE.MeshStandardMaterial({ color: '#6b4a2f', roughness: 1 }));
    trunk.position.set(px, 2.75, 99); trunk.rotation.z = (rnd() - 0.5) * 0.14; trunk.castShadow = true;
    group.add(trunk);
    for (let f = 0; f < 6; f++) {
      const frond = new THREE.Mesh(new THREE.ConeGeometry(0.5, 3.2, 4),
        new THREE.MeshStandardMaterial({ color: '#2f7a3d', roughness: 0.9 }));
      frond.position.set(px, 5.6, 99);
      frond.rotation.set(Math.PI / 2.4, 0, (f / 6) * Math.PI * 2);
      frond.translateY(1.2);
      group.add(frond);
    }
  }
  // Crates + dumpsters (street props, some are colliders).
  for (let i = 0; i < 14; i++) {
    const cx = -90 + rnd() * 180, cz = -90 + rnd() * 180;
    const crate = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.4, 1.4),
      new THREE.MeshStandardMaterial({ color: '#7a5a2e', roughness: 1 }));
    crate.position.set(cx, 0.7, cz); crate.rotation.y = rnd() * Math.PI;
    crate.castShadow = true; group.add(crate);
    addCollider(cx, cz, 0.8, 0.8);
  }

  return {
    colliders, buildings, group,
    spawns: {
      safehouse: { x: -8, z: 8 },
      bar: { x: -11, z: -33 },        // Dockside Bar storefront (block -11,-33 faces a road)
      garage: { x: 33, z: -11 },      // getaway car spot
      beach: { x: 0, z: 100 },
      plaza: { x: 0, z: 0 },
    },
  };
}
