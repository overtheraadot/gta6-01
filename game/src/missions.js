// DUSKPORT missions: a heist-getaway story chain + repeatable side jobs.
// Meet Mara → tool up → lift the getaway car → escape the block → lose the heat → free roam.
import * as THREE from 'three';

export function buildingFront(city, name) {
  const b = city.buildings.find((x) => x.name === name);
  if (!b) return new THREE.Vector3(0, 0, 0);
  const south = b.z >= 0;
  return new THREE.Vector3(b.x, 0, b.z + (south ? b.d / 2 + 3.5 : -b.d / 2 - 3.5));
}

export const STORY_MISSIONS = [
  {
    id: 'meet-mara', title: 'MEET MARA', radius: 5,
    text: 'Walk to the neon sign at Dockside Bar. Mara Voss is waiting with the plan.',
    target: (city) => buildingFront(city, 'DOCKSIDE BAR'),
    banner: ['MEET MARA', 'The plan starts at Dockside Bar'],
  },
  {
    id: 'tool-up', title: 'TOOL UP', radius: 3.5,
    text: 'Grab the pistol stash in the alley behind Volt Garage. The crew is armed tonight.',
    target: (city) => new THREE.Vector3(20, 0, -22),
    banner: ['TOOL UP', 'A pistol is waiting in the alley'],
  },
  {
    id: 'lift-car', title: 'LIFT THE GETAWAY CAR', radius: 4,
    text: 'Steal the midnight coupe parked by the garage. Press E beside it — the crew is watching.',
    target: (city) => new THREE.Vector3(33, 0, -22),
    banner: ['LIFT THE GETAWAY CAR', 'The midnight coupe is yours for the taking'],
  },
  {
    id: 'escape', title: 'ESCAPE THE BLOCK', radius: 7,
    text: 'Drive north through the cordon to the highway gate. The whole district is looking for that car.',
    target: () => new THREE.Vector3(0, 0, -104),
    banner: ['ESCAPE THE BLOCK', 'Lose the cordon — drive north'],
  },
  {
    id: 'lose-heat', title: 'LOSE THE HEAT', radius: 6,
    text: 'Shake the patrol cars, then slip back to the safehouse off Meridian Row.',
    target: () => new THREE.Vector3(0, 0, 11),
    banner: ['LOSE THE HEAT', 'Get clean, then come home'],
  },
];

export const SIDE_JOBS = [
  {
    id: 'courier', title: 'SIDE JOB: COURIER RUN', radius: 6,
    text: 'A package for the Night Market. Drive it to Pier 9 Diner — fast, no questions.',
    target: () => new THREE.Vector3(77, 0, 96), pay: 300,
  },
  {
    id: 'shakedown', title: 'SIDE JOB: SHAKEDOWN', radius: 5,
    text: 'A rival crew is muscling in by the docks. Clear them out — Mara has your back.',
    target: () => new THREE.Vector3(-77, 0, 88), pay: 450,
  },
  {
    id: 'courier2', title: 'SIDE JOB: HARBOUR DROP', radius: 6,
    text: 'Drop the crate at the Palm Motel car park. Keep it quiet.',
    target: () => new THREE.Vector3(55, 0, 22), pay: 350,
  },
];

export class MissionRunner {
  constructor(scene, city, hooks) {
    this.scene = scene; this.city = city; this.hooks = hooks;
    this.index = 0;           // index into STORY_MISSIONS, or -1 for side jobs
    this.sideIndex = 0;
    this.sideJob = null;
    this.done = false;
    this.lastHotToast = 0;
    this.beacon = new THREE.Group();
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 1.4, 26, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.28, side: THREE.DoubleSide, depthWrite: false }),
    );
    beam.position.y = 13; this.beacon.add(beam);
    const dia = new THREE.Mesh(new THREE.OctahedronGeometry(0.9),
      new THREE.MeshBasicMaterial({ color: '#ffd166' }));
    dia.position.y = 4.5; this.beacon.add(dia);
    this.beaconDiamond = dia;
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.6, 2.2, 32),
      new THREE.MeshBasicMaterial({ color: '#ffd166', transparent: true, opacity: 0.8, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = 0.08; this.beacon.add(ring);
    scene.add(this.beacon);
    this.setMission(0);
  }
  current() {
    if (this.index >= 0) return STORY_MISSIONS[this.index];
    return this.sideJob;
  }
  targetPos() {
    const m = this.current();
    return m ? m.target(this.city) : null;
  }
  setMission(i) {
    this.index = i;
    const m = this.current();
    if (!m) return;
    this.hooks.onMission(m);
    if (m.banner) this.hooks.onBanner(m.banner[0], m.banner[1]);
    const t = this.targetPos();
    if (t) this.beacon.position.set(t.x, 0, t.z);
  }
  startSideJob() {
    this.index = -1;
    this.sideJob = SIDE_JOBS[this.sideIndex % SIDE_JOBS.length];
    this.sideIndex++;
    this.hooks.onMission(this.sideJob);
    this.hooks.onBanner(this.sideJob.title, 'Side job — ' + this.sideJob.pay + ' on the line');
    const t = this.targetPos();
    if (t) this.beacon.position.set(t.x, 0, t.z);
  }
  // Called every frame; returns an event string when something happens.
  update(playerPos, state) {
    const m = this.current();
    if (!m) return null;
    this.beaconDiamond.rotation.y += 0.02;
    this.beaconDiamond.position.y = 4.5 + Math.sin(performance.now() * 0.003) * 0.5;
    const t = this.targetPos();
    if (!t) return null;
    const d = Math.hypot(playerPos.x - t.x, playerPos.z - t.z);
    if (d > m.radius) return null;
    // Arrived.
    if (this.index >= 0) {
      const arrived = m.id;
      if (arrived === 'meet-mara') { this.hooks.onMeetMara(); this.setMission(1); return 'meet-mara'; }
      if (arrived === 'tool-up') { this.hooks.onToolUp(); this.setMission(2); return 'tool-up'; }
      if (arrived === 'lift-car') { return 'at-car'; } // steal happens with E
      if (arrived === 'escape') { this.hooks.onEscape(); this.setMission(4); return 'escape'; }
      if (arrived === 'lose-heat') {
        if (state.wanted > 0) {
          const now = performance.now();
          if (now - this.lastHotToast > 3000) { this.lastHotToast = now; this.hooks.onToast('Too hot — lose the heat first!'); }
          return 'too-hot';
        }
        this.hooks.onStoryComplete();
        this.index = -2; this.done = true;
        this.startSideJob();
        return 'story-complete';
      }
    } else if (this.sideJob) {
      if (this.sideJob.id === 'shakedown' && !state.gangCleared) {
        const now = performance.now();
        if (now - this.lastHotToast > 3000) { this.lastHotToast = now; this.hooks.onToast('Clear the rival crew first!'); }
        return 'gang-remains';
      }
      this.hooks.onSideJobDone(this.sideJob.pay);
      this.startSideJob();
      return 'side-done';
    }
    return null;
  }
  completeLiftCar() {
    if (this.index === 2) { this.setMission(3); return true; }
    return false;
  }
}
