// DUSKPORT screenshot staging: ?shot=start|chase|combat|city puts the live game into a
// photogenic state for the maker's screenshots. The game itself is never faked —
// staging only moves the real player, spawns real systems and lets them run.
export function getShotParam() {
  try {
    const q = new URLSearchParams(window.location.search).get('shot');
    return q && ['start', 'chase', 'combat', 'city'].includes(q) ? q : null;
  } catch (e) { return null; }
}

export function stageShot(name, G) {
  if (!name || name === 'start') return;
  G.beginPlay();
  if (name === 'chase') {
    // Mid-escape: player driving the getaway coupe north, wanted 3, two patrol cars on the tail.
    G.setMissionIndex(3);
    G.teleportIntoCar(0, 20, Math.PI, 'coupe', '#b02030');
    G.setWanted(3);
    G.spawnPoliceChase(2);
    G.playerCarSpeed(14);
    G.setCameraMode('chase');
  } else if (name === 'combat') {
    // Docks shakedown: Rook on foot with a pistol, Mara fighting beside him, rival crew ahead.
    // Staged on the open beach so the fight, the sea and the city skyline all read —
    // the camera sits on empty sand, clear of traffic and buildings.
    G.setMissionIndex(-1);
    G.startSideJobById('shakedown');
    G.teleportOnFoot(-38, 100, Math.PI);
    G.equipWeapon('pistol', 48);
    G.spawnAllyAt(-40, 98, true);
    G.spawnGangAt(-38, 90, 3);
    G.setWanted(1);
    G.setCameraMode('follow');
  } else if (name === 'city') {
    // City street: driving the blue sedan north through the heart of Duskport,
    // tower and neon storefronts on both sides, traffic ahead.
    G.setMissionIndex(0);
    G.teleportIntoCar(0, 66, Math.PI, 'sedan', '#2050b0', false);
    G.playerCarSpeed(12);
    G.setWanted(0);
    G.setCameraMode('chase');
  }
  window.__shotReady = true;
}
