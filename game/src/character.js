// DUSKPORT characters: detailed MMORPG-style humans built from geometry + a painted face.
// Every human has a real face (eyes, brows, nose, lips), styled hair and a street outfit —
// never a plain mannequin. Player "Rook", ally "Mara", gang and pedestrians share this rig.
import * as THREE from 'three';

function mulberry(seed) {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

// Paint a detailed face onto a canvas: skin, brows, eyes with irises, nose, lips, stubble.
export function paintFaceTexture(seed = 7, opts = {}) {
  const rnd = mulberry(seed);
  const skin = opts.skin || '#c98d64';
  const c = document.createElement('canvas'); c.width = 512; c.height = 512;
  const g = c.getContext('2d');
  // Skin base with soft radial shading (cheeks lighter, jaw darker).
  const grad = g.createRadialGradient(256, 230, 60, 256, 256, 330);
  grad.addColorStop(0, '#e8b98a'); grad.addColorStop(0.55, skin); grad.addColorStop(1, '#8a5a34');
  g.fillStyle = grad; g.fillRect(0, 0, 512, 512);
  // Jaw + cheek shading.
  g.fillStyle = 'rgba(90,45,20,0.20)';
  g.beginPath(); g.ellipse(256, 470, 150, 60, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(255,220,190,0.16)';
  g.beginPath(); g.ellipse(180, 290, 42, 60, 0.15, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(332, 290, 42, 60, -0.15, 0, Math.PI * 2); g.fill();
  // Stubble shadow on the lower face.
  g.fillStyle = 'rgba(40,25,15,0.18)';
  g.beginPath(); g.ellipse(256, 400, 130, 95, 0, 0, Math.PI); g.fill();
  // Nose: bridge shading + tip + nostrils.
  g.strokeStyle = 'rgba(90,45,20,0.45)'; g.lineWidth = 7; g.lineCap = 'round';
  g.beginPath(); g.moveTo(256, 235); g.lineTo(250, 300); g.stroke();
  g.beginPath(); g.moveTo(256, 235); g.lineTo(262, 300); g.stroke();
  g.fillStyle = 'rgba(120,60,30,0.55)';
  g.beginPath(); g.ellipse(256, 312, 26, 13, 0, 0, Math.PI * 2); g.fill();
  g.fillStyle = 'rgba(40,18,8,0.85)';
  g.beginPath(); g.ellipse(238, 316, 8, 5, 0.2, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.ellipse(274, 316, 8, 5, -0.2, 0, Math.PI * 2); g.fill();
  // Eyebrows: thick, styled, slightly angled.
  const browY = 168, browH = opts.browH || 16;
  g.fillStyle = opts.browColor || '#241609';
  g.beginPath(); g.moveTo(158, browY); g.quadraticCurveTo(205, browY - 14, 248, browY + 2);
  g.lineTo(246, browY + browH); g.quadraticCurveTo(205, browY + browH - 8, 160, browY + browH); g.fill();
  g.beginPath(); g.moveTo(354, browY); g.quadraticCurveTo(307, browY - 14, 264, browY + 2);
  g.lineTo(266, browY + browH); g.quadraticCurveTo(307, browY + browH - 8, 352, browY + browH); g.fill();
  // Eyes: white, iris, pupil, highlight, lash line.
  const irisColors = ['#4a2f16', '#2f4a2f', '#3a5a7a', '#5a3a1a'];
  const iris = irisColors[Math.floor(rnd() * irisColors.length)];
  for (const ex of [200, 312]) {
    g.fillStyle = '#f4ede2';
    g.beginPath(); g.ellipse(ex, 208, 34, 21, 0, 0, Math.PI * 2); g.fill();
    g.fillStyle = iris;
    g.beginPath(); g.arc(ex, 208, 15, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#120a04';
    g.beginPath(); g.arc(ex, 208, 7, 0, Math.PI * 2); g.fill();
    g.fillStyle = 'rgba(255,255,255,0.95)';
    g.beginPath(); g.arc(ex + 5, 202, 4, 0, Math.PI * 2); g.fill();
    g.strokeStyle = '#1c0f06'; g.lineWidth = 5;
    g.beginPath(); g.moveTo(ex - 34, 200); g.quadraticCurveTo(ex, 188, ex + 34, 200); g.stroke();
  }
  // Lips: full, slightly parted, warm tone.
  g.fillStyle = opts.lipColor || '#a34a3c';
  g.beginPath(); g.moveTo(214, 372);
  g.quadraticCurveTo(256, 352, 298, 372);
  g.quadraticCurveTo(256, 384, 214, 372); g.fill();
  g.fillStyle = '#8e352c';
  g.beginPath(); g.moveTo(216, 374);
  g.quadraticCurveTo(256, 402, 296, 374);
  g.quadraticCurveTo(256, 388, 216, 374); g.fill();
  g.strokeStyle = 'rgba(60,20,10,0.5)'; g.lineWidth = 3;
  g.beginPath(); g.moveTo(216, 373); g.quadraticCurveTo(256, 380, 296, 373); g.stroke();
  // Chin crease + ears hint.
  g.strokeStyle = 'rgba(90,45,20,0.3)'; g.lineWidth = 4;
  g.beginPath(); g.moveTo(236, 428); g.quadraticCurveTo(256, 436, 276, 428); g.stroke();
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function box(w, h, d, color, opts = {}) {
  const m = new THREE.Mesh(
    new THREE.BoxGeometry(w, h, d),
    new THREE.MeshStandardMaterial({ color, roughness: opts.rough ?? 0.85, metalness: opts.metal ?? 0.05 }),
  );
  m.castShadow = true;
  if (opts.x !== undefined) m.position.set(opts.x, opts.y, opts.z);
  return m;
}

// Build one human. opts: skin, hair, hairStyle, jacket, shirt, pants, shoes, faceSeed, female.
export function buildHuman(opts = {}) {
  const skin = opts.skin || '#c98d64';
  const g = new THREE.Group();
  const parts = {};
  const skinMat = new THREE.MeshStandardMaterial({ color: skin, roughness: 0.7 });
  const jacketMat = new THREE.MeshStandardMaterial({ color: opts.jacket || '#23262e', roughness: 0.8 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: opts.shirt || '#d8d3c8', roughness: 0.9 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: opts.pants || '#2c3a55', roughness: 0.9 });
  const hairMat = new THREE.MeshStandardMaterial({ color: opts.hair || '#17110c', roughness: 0.6 });
  const shoeMat = new THREE.MeshStandardMaterial({ color: opts.shoes || '#14100c', roughness: 0.5 });

  // Legs (pivot at hip for the walk swing).
  const legL = new THREE.Group(); legL.position.set(-0.11, 0.86, 0);
  const legR = new THREE.Group(); legR.position.set(0.11, 0.86, 0);
  const mkLeg = (leg) => {
    const thigh = box(0.16, 0.44, 0.19, opts.pants || '#2c3a55'); thigh.position.y = -0.22; leg.add(thigh);
    const shin = box(0.15, 0.4, 0.17, opts.pants || '#2c3a55'); shin.position.y = -0.64; leg.add(shin);
    const boot = box(0.16, 0.1, 0.3, opts.shoes || '#14100c'); boot.position.set(0, -0.85, 0.05); leg.add(boot);
  };
  mkLeg(legL); mkLeg(legR); g.add(legL, legR);
  parts.legL = legL; parts.legR = legR;

  // Torso: charcoal jacket, open over a shirt, collar + lapels + zipper + pockets.
  const torso = new THREE.Group(); torso.position.y = 0.86; g.add(torso);
  parts.torso = torso;
  const chest = box(0.46, 0.52, 0.26, opts.jacket || '#23262e'); chest.position.y = 0.28; torso.add(chest);
  const shirt = box(0.2, 0.46, 0.03, opts.shirt || '#d8d3c8'); shirt.position.set(0, 0.28, 0.135); torso.add(shirt);
  const zip = box(0.02, 0.5, 0.012, '#0c0d10'); zip.position.set(0.11, 0.28, 0.14); torso.add(zip);
  const collarL = box(0.12, 0.05, 0.05, '#191b20'); collarL.position.set(-0.09, 0.55, 0.13); collarL.rotation.z = 0.5; torso.add(collarL);
  const collarR = box(0.12, 0.05, 0.05, '#191b20'); collarR.position.set(0.09, 0.55, 0.13); collarR.rotation.z = -0.5; torso.add(collarR);
  const pocketL = box(0.12, 0.09, 0.02, '#191b20'); pocketL.position.set(-0.14, 0.12, 0.14); torso.add(pocketL);
  const pocketR = box(0.12, 0.09, 0.02, '#191b20'); pocketR.position.set(0.14, 0.12, 0.14); torso.add(pocketR);
  const belt = box(0.47, 0.05, 0.27, '#0c0d10'); belt.position.y = 0.02; torso.add(belt);
  // Jacket shoulder pads + epaulette stripe for a street-crew look.
  const padL = box(0.1, 0.04, 0.24, '#191b20'); padL.position.set(-0.22, 0.52, 0); torso.add(padL);
  const padR = box(0.1, 0.04, 0.24, '#191b20'); padR.position.set(0.22, 0.52, 0); torso.add(padR);

  // Arms (pivot at shoulder).
  const mkArm = (side) => {
    const arm = new THREE.Group(); arm.position.set(0.29 * side, 1.36, 0);
    const upper = box(0.13, 0.32, 0.15, opts.jacket || '#23262e'); upper.position.y = -0.16; arm.add(upper);
    const fore = box(0.11, 0.3, 0.13, opts.jacket || '#23262e'); fore.position.y = -0.46; arm.add(fore);
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.065, 10, 8), skinMat);
    hand.position.y = -0.66; hand.castShadow = true; arm.add(hand);
    return arm;
  };
  const armL = mkArm(-1), armR = mkArm(1);
  g.add(armL, armR); parts.armL = armL; parts.armR = armR;

  // Head group: skull, painted face plate, styled hair, neck.
  const head = new THREE.Group(); head.position.y = 1.62; g.add(head);
  parts.head = head;
  const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.12, 10), skinMat);
  neck.position.y = -0.12; neck.castShadow = true; head.add(neck);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.155, 20, 16), skinMat);
  skull.scale.set(0.92, 1.08, 0.98); skull.castShadow = true; head.add(skull);
  // Face plate: curved cylinder segment carrying the painted face, facing +Z.
  const faceTex = paintFaceTexture(opts.faceSeed ?? 7, { skin, lipColor: opts.lipColor, browColor: opts.browColor });
  const plate = new THREE.Mesh(
    new THREE.CylinderGeometry(0.148, 0.14, 0.3, 20, 1, true, -0.95, 1.9),
    new THREE.MeshStandardMaterial({ map: faceTex, emissiveMap: faceTex, emissive: 0xffffff, emissiveIntensity: 0.32, roughness: 0.65, transparent: false }),
  );
  plate.position.set(0, 0.01, 0.012); // segment centred on +Z: the painted face looks forward
  head.add(plate);
  // Ears.
  for (const s of [-1, 1]) {
    const ear = new THREE.Mesh(new THREE.SphereGeometry(0.035, 8, 6), skinMat);
    ear.position.set(0.145 * s, 0, 0); ear.scale.set(0.5, 1, 0.8); head.add(ear);
  }
  // Styled hair: swept cap + fringe + sideburns.
  const hairStyle = opts.hairStyle || 'swept';
  const hairCap = new THREE.Mesh(
    new THREE.SphereGeometry(0.165, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.52), hairMat);
  hairCap.scale.set(0.95, 0.85, 1.02); hairCap.position.set(0, 0.045, -0.012); hairCap.castShadow = true;
  head.add(hairCap);
  const fringe = box(0.24, 0.07, 0.06, opts.hair || '#17110c', { x: 0.02, y: 0.14, z: 0.12 });
  fringe.rotation.z = -0.18; fringe.rotation.x = -0.25; head.add(fringe);
  if (hairStyle === 'long') {
    const back = box(0.24, 0.3, 0.06, opts.hair || '#17110c', { x: 0, y: -0.08, z: -0.14 });
    head.add(back);
  } else if (hairStyle === 'mohawk') {
    const moh = box(0.06, 0.14, 0.3, opts.hair || '#17110c', { x: 0, y: 0.2, z: -0.02 });
    head.add(moh);
  }
  for (const s of [-1, 1]) {
    const burn = box(0.03, 0.12, 0.03, opts.hair || '#17110c', { x: 0.15 * s, y: -0.02, z: 0.06 });
    head.add(burn);
  }

  // Weapon mount in the right hand.
  const mount = new THREE.Group(); mount.position.set(0, -0.68, 0.06); armR.add(mount);
  parts.weaponMount = mount;

  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  return { group: g, parts, height: 1.86 };
}

// Procedural locomotion: walk/run swing, idle breathing, seated drive pose.
export function animateHuman(h, mode, t, speed01 = 0) {
  const p = h.parts;
  const swing = Math.sin(t * 11) * (0.25 + speed01 * 0.55);
  if (mode === 'walk' || mode === 'run') {
    p.legL.rotation.x = swing; p.legR.rotation.x = -swing;
    p.armL.rotation.x = -swing * 0.85; p.armR.rotation.x = swing * 0.85;
    p.torso.position.y = 0.86 + Math.abs(Math.sin(t * 11)) * 0.03;
    p.head.rotation.x = 0.02;
  } else if (mode === 'drive') {
    p.legL.rotation.x = -1.15; p.legR.rotation.x = -1.15;
    p.armL.rotation.x = -0.95; p.armR.rotation.x = -0.95;
    p.armL.rotation.z = 0.15; p.armR.rotation.z = -0.15;
    p.torso.position.y = 0.82;
  } else { // idle
    p.legL.rotation.x = 0; p.legR.rotation.x = 0;
    p.armL.rotation.x = Math.sin(t * 1.6) * 0.05;
    p.armR.rotation.x = -Math.sin(t * 1.6) * 0.05;
    p.torso.position.y = 0.86 + Math.sin(t * 1.6) * 0.008;
    p.torso.scale.y = 1 + Math.sin(t * 1.6) * 0.008;
    p.head.rotation.y = Math.sin(t * 0.5) * 0.25;
  }
}
