import * as THREE from 'three';
import { createSolarSystem } from './world/body.js';
import { createSkyAndSpaceTargets } from './world/sky.js';
import { InputManager } from './input.js';
import { Explorer } from './player/explorer.js';
import { CameraRig } from './player/cameraRig.js';
import { ShipRepairSystem } from './ship/repair.js';
import { Ship } from './ship/ship.js';
import { HUD } from './ui/hud.js';
import { SettingsManager } from './ui/settings.js';
import { TouchControlsManager } from './ui/touchControls.js';
import { NavMarkerSystem } from './ui/navMarkers.js';
import { MineralSystem } from './world/minerals.js';

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
const spaceFogColor = new THREE.Color(0x0b192c);
const underwaterFogColor = new THREE.Color(0x003554);
scene.fog = new THREE.FogExp2(spaceFogColor, 0.00010);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 35000);

// Build Solar System (Tropical Planet + 3 Moons of varying size)
const { planet, moons, allBodies } = createSolarSystem(scene);
const skyTargets = createSkyAndSpaceTargets(scene);
const spaceTargets = skyTargets.targets;

// Spawn Explorer & Ship on Aurelia Prime's tropical island plateau near north pole
const explorer = new Explorer(scene);
explorer.spawnOnBody(planet, new THREE.Vector3(0, 1, 0));

const ship = new Ship(scene);
ship.placeOnBody(planet, new THREE.Vector3(0.055, 0.997, 0.045));

const repairSystem = new ShipRepairSystem(scene, planet);
const mineralSystem = new MineralSystem(scene, planet, moons);
const cameraRig = new CameraRig(camera);
const input = new InputManager(canvas);
const hud = new HUD();
const touchControls = new TouchControlsManager(input, (msg, dur) => hud.showNotice(msg, dur));
const settings = new SettingsManager((msg) => hud.showNotice(msg), touchControls, input);
settings.setRenderer(renderer);
settings.setEnvironment(planet, moons);
settings.setExplorer(explorer);
settings.setShip(ship);

// WebAPK / PWA installation event listener & prompt capture
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  settings.setInstallPrompt(e);
});

window.addEventListener('appinstalled', () => {
  hud.showNotice('Aurelia Horizon WebAPK installed successfully!');
  settings._checkStandaloneStatus();
});

const navMarkers = new NavMarkerSystem(camera);
navMarkers.setBodies(allBodies);
navMarkers.onSelectTarget = (targetBody) => {
  ship.targetBody = targetBody;
  ship.sasMode = 'TARGET';
  hud.showNotice(`Nav Target Locked: ${targetBody.name.split(' (')[0]} (SAS: TARGET)`);
};

let gameMode = 'EXPLORING'; // 'EXPLORING' | 'PILOTING'
let elapsedTime = 0;

function boardShip() {
  if (!repairSystem.isShipRepaired()) {
    hud.showNotice('Ship still damaged! Collect and install all 5 ship components first.');
    return;
  }
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  const isTouch = input.isTouchDevice || touchControls.visibility === 'always' || window.innerWidth <= 960;
  hud.showNotice(isTouch
    ? 'Starfighter Systems Online! Use UP & DN to launch, BOOST for afterburners, SAS for orbit assists, and FIRE for cannons.'
    : `Starfighter Systems Online! Hold [${input.getActionKeyLabel('flightAscend')}] + [${input.getActionKeyLabel('flightThrustForward')}] to Lift Off, [${input.getActionKeyLabel('flightBoost')}] Boost, [${input.getActionKeyLabel('flightSAS')}] SAS Assist, [${input.getActionKeyLabel('flightFire')}/Click] Fire Cannons.`
  );
}

export function findSafeExitSpot(ship, body) {
  const bPos = body ? body.getWorldPosition() : new THREE.Vector3();
  const up = ship.localUp.clone().normalize();
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(ship.group.quaternion).normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.group.quaternion).normalize();

  // 4 candidate egress locations around the ship (Starboard, Port, Rear-Starboard, Rear-Port)
  const candidates = [
    right.clone().multiplyScalar(6.4).addScaledVector(fwd, -0.8),
    right.clone().multiplyScalar(-6.4).addScaledVector(fwd, -0.8),
    right.clone().multiplyScalar(4.5).addScaledVector(fwd, -4.5),
    right.clone().multiplyScalar(-4.5).addScaledVector(fwd, -4.5)
  ];

  for (const offset of candidates) {
    const testWorld = ship.group.position.clone().add(offset);
    if (!body) return { position: testWorld, up };

    const rel = testWorld.clone().sub(bPos);
    const dist = rel.length();
    const dir = rel.clone().normalize();
    const terrainR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
    const floorR = Math.max(terrainR, body.seaLevelRadius || 0);

    // Safe point resting 0.15m on solid ground
    const safePoint = bPos.clone().addScaledVector(dir, floorR + 0.15);
    const heightDelta = Math.abs((floorR + 0.15) - dist);
    if (heightDelta < 4.5) {
      return { position: safePoint, up: dir };
    }
  }

  const fallbackDir = ship.group.position.clone().add(candidates[0]).sub(bPos).normalize();
  const sR = body ? body.getSurfaceRadiusAtDir(fallbackDir.x, fallbackDir.y, fallbackDir.z) : 720;
  const fR = Math.max(sR, body ? body.seaLevelRadius || 0 : 0);
  return {
    position: bPos.clone().addScaledVector(fallbackDir, fR + 0.15),
    up: fallbackDir
  };
}

function disembarkShip() {
  if (!ship.landed && ship.altitude > 18) {
    const dsc = input.getActionKeyLabel('flightDescend');
    hud.showNotice(`Land on a planet or moon surface before disembarking ([${dsc}] to descend)!`);
    return;
  }
  gameMode = 'EXPLORING';
  const targetBody = ship.currentBody || planet;
  const exit = findSafeExitSpot(ship, targetBody);

  explorer.group.position.copy(exit.position);
  explorer.localUp.copy(exit.up);
  explorer.group.quaternion.copy(ship.group.quaternion);
  explorer.velocity.set(0, 0, 0);
  explorer.currentBody = targetBody;
  explorer.grounded = true;
  explorer.jumpPhase = 'idle';
  explorer.group.visible = true;

  hud.showNotice(`Stepped out onto ${targetBody.name}.`);
}

function computeCompassText() {
  if (gameMode === 'EXPLORING') {
    const nearest = repairSystem.getNearestUncollectedPart(explorer.group.position);
    const distToShip = explorer.group.position.distanceTo(ship.group.position);
    if (nearest && repairSystem.carriedParts.length === 0) {
      return `Nearest Component: ${nearest.part.name} (${Math.round(nearest.distance)}m) | Ship: ${Math.round(distToShip)}m`;
    }
    if (nearest) {
      return `Carrying ${repairSystem.carriedParts.length} Component(s) — Ship: ${Math.round(distToShip)}m | Next: ${nearest.part.name} (${Math.round(nearest.distance)}m)`;
    }
    return `All Components Collected! Return to Starfighter (${Math.round(distToShip)}m)`;
  } else {
    // In ship: show distances to the 3 moons
    const moonDists = moons.map((m) => {
      const d = Math.max(0, Math.round(ship.group.position.distanceTo(m.getWorldPosition()) - m.radius));
      const tag = ship.visitedMoons.has(m.id) ? '✓' : '';
      return `${m.name.split(':')[0]} (${m.id.toUpperCase()})${tag}: ${d}m`;
    });
    return moonDists.join('  •  ');
  }
}

// Quick-test / Debug helpers exposed on window and toolbar buttons
export const gameAPI = {
  getState: () => ({
    gameMode,
    repaired: repairSystem.isShipRepaired(),
    repairStatus: repairSystem.getStatus(),
    currentBody: (gameMode === 'PILOTING' ? ship.currentBody : explorer.currentBody)?.id,
    altitude: Math.round(gameMode === 'PILOTING' ? ship.altitude : explorer.altitude),
    speed: Math.round(gameMode === 'PILOTING' ? ship.speed : explorer.velocity.length()),
    sasMode: ship.sasMode,
    targetBody: ship.targetBody?.id,
    orbitAssist: ship.orbitAssist,
    visitedMoons: Array.from(ship.visitedMoons),
    targetsDestroyed: ship.targetsDestroyed,
    theme: settings.currentThemeId,
    graphicsQuality: settings.currentQuality,
    settingsOpen: settings.isOpen,
    touchScheme: touchControls.scheme,
    touchVisibility: touchControls.visibility
  }),
  openSettings: (open = true) => settings.toggleModal(open),
  setTheme: (themeId) => settings.applyTheme(themeId),
  setGraphicsQuality: (q) => settings.applyGraphicsQuality(q),
  setTouchScheme: (scheme) => touchControls.applyScheme(scheme),
  setTouchVisibility: (vis) => touchControls.applyVisibility(vis),
  cycleTarget: () => ship.cycleTargetBody(allBodies, (msg) => hud.showNotice(msg)),
  checkGitHubUpdate: (force = false) => settings.checkGitHubAndRecache(force),
  teleportToBase: () => {
    repairSystem.giveAndInstallAll();
    ship.setRepairedVisual(true);
    // Position Starfighter safely on Aurelia Prime base camp
    ship.placeOnBody(planet, new THREE.Vector3(0.055, 0.997, 0.045));
    // Position Explorer standing right beside Starfighter on the plateau
    explorer.spawnOnBody(planet, new THREE.Vector3(0.048, 0.998, 0.055));
    explorer.group.visible = true;
    gameMode = 'EXPLORING';
    cameraRig.initialized = false;
    hud.showNotice('Fast Traveled to Aurelia Prime Base Camp (On-Foot Explorer)!');
  },
  teleportToOrbit: () => {
    repairSystem.giveAndInstallAll();
    ship.setRepairedVisual(true);
    gameMode = 'PILOTING';
    explorer.group.visible = false;
    ship.landed = false;
    const orbitAlt = planet.radius + 320;
    ship.group.position.set(0, orbitAlt, 320);
    ship.group.quaternion.setFromEuler(new THREE.Euler(-0.28, 0, 0));
    ship.sasMode = 'STABILITY';
    ship.orbitAssist = false;
    const r = ship.group.position.length();
    const mu = planet.surfaceGravity * planet.radius * planet.radius;
    const vCirc = Math.sqrt(mu / r);
    ship.velocity.set(0, -vCirc * (320 / r), -vCirc * (orbitAlt / r));
    cameraRig.initialized = false;
    hud.showNotice('Fast Traveled to Stable Newtonian Orbit above Aurelia Prime! SAS: STABILITY ASSIST.');
  },
  teleportToMoon: (moonIndex = 0) => {
    const moon = moons[moonIndex] || moons[0];
    repairSystem.giveAndInstallAll();
    ship.setRepairedVisual(true);
    ship.orbitAssist = false;
    const moonDir = new THREE.Vector3(-0.35, 0.93, 0.1);
    ship.placeOnBody(moon, moonDir);
    ship.visitedMoons.add(moon.id);

    // Synchronize Explorer right beside the ship on the moon using safe ground egress
    const exit = findSafeExitSpot(ship, moon);
    explorer.group.position.copy(exit.position);
    explorer.localUp.copy(exit.up);
    explorer.group.quaternion.copy(ship.group.quaternion);
    explorer.velocity.set(0, 0, 0);
    explorer.currentBody = moon;
    explorer.grounded = true;
    explorer.jumpPhase = 'idle';

    // If already in starfighter on this moon, toggle disembark to foot!
    if (gameMode === 'PILOTING' && ship.currentBody === moon) {
      gameMode = 'EXPLORING';
      explorer.group.visible = true;
      cameraRig.initialized = false;
      hud.showNotice(`Stepped out onto ${moon.name}! Walking in low gravity.`);
      return;
    }

    gameMode = 'PILOTING';
    explorer.group.visible = false;
    cameraRig.initialized = false;
    const isTouch = input.isTouchDevice || touchControls.visibility === 'always' || window.innerWidth <= 960;
    hud.showNotice(isTouch
      ? `Landed on ${moon.name}! Tap EXIT to step out and walk in low gravity, or UP to launch.`
      : `Landed on ${moon.name}! Press [${input.getActionKeyLabel('flightDisembark')}] to step out on foot, or [${input.getActionKeyLabel('flightAscend')}] to launch.`
    );
  },
  // Maintain backward-compatible aliases:
  repairAndBoard: () => gameAPI.teleportToBase(),
  enterPlanetOrbit: () => gameAPI.teleportToOrbit(),
  landOnMoon: (i = 0) => gameAPI.teleportToMoon(i),
  fireWeaponBurst: () => {
    if (gameMode !== 'PILOTING') boardShip();
    ship.fireCooldown = 0;
    ship.fireCannons();
  }
};
window.gameDebug = gameAPI;

// Bind fast-travel UI buttons
document.getElementById('btn-quick-repair')?.addEventListener('click', () => gameAPI.teleportToBase());
document.getElementById('btn-quick-orbit')?.addEventListener('click', () => gameAPI.teleportToOrbit());
document.getElementById('btn-moon-1')?.addEventListener('click', () => gameAPI.teleportToMoon(0));
document.getElementById('btn-moon-2')?.addEventListener('click', () => gameAPI.teleportToMoon(1));
document.getElementById('btn-moon-3')?.addEventListener('click', () => gameAPI.teleportToMoon(2));

// Update dynamic keybinding labels across HUD footer & sidebar buttons
function updateDynamicUIControls() {
  const footer = document.getElementById('hud-controls');
  if (footer) {
    const fwd = input.getActionKeyLabel('moveForward');
    const left = input.getActionKeyLabel('strafeLeft');
    const bwd = input.getActionKeyLabel('moveBackward');
    const right = input.getActionKeyLabel('strafeRight');
    const sprint = input.getActionKeyLabel('sprint');
    const jump = input.getActionKeyLabel('jump');
    const act = input.getActionKeyLabel('interact');

    const fThrust = input.getActionKeyLabel('flightThrustForward');
    const rThrust = input.getActionKeyLabel('flightThrustBackward');
    const sLeft = input.getActionKeyLabel('flightStrafeLeft');
    const sRight = input.getActionKeyLabel('flightStrafeRight');
    const rollL = input.getActionKeyLabel('flightRollLeft');
    const rollR = input.getActionKeyLabel('flightRollRight');
    const asc = input.getActionKeyLabel('flightAscend');
    const dsc = input.getActionKeyLabel('flightDescend');
    const boost = input.getActionKeyLabel('flightBoost');
    const sas = input.getActionKeyLabel('flightSAS');
    const fire = input.getActionKeyLabel('flightFire');
    const exit = input.getActionKeyLabel('flightDisembark');

    footer.innerHTML = `
      <div><strong>ON FOOT:</strong> [${fwd}/${left}/${bwd}/${right}] Move &bull; [${sprint}] Sprint &bull; [${jump}] Jump / Jetpack &bull; [Mouse] Look &bull; [${act}] Collect / Install / Board</div>
      <div><strong>STARFIGHTER (NEWTONIAN):</strong> [${fThrust}/${rThrust}] Thrust &bull; [${sLeft}/${sRight}] Strafe &bull; [${rollL}/${rollR}] 6DoF Roll &bull; [${asc}/${dsc}] Ascend/Descend &bull; [${boost}] Boost &bull; [${sas}] SAS Assist &bull; [${fire}/Click] Pulse Cannons &bull; [${exit}] Disembark</div>
    `;
  }

  const btnBase = document.getElementById('btn-quick-repair');
  if (btnBase) btnBase.textContent = `[${input.getActionKeyLabel('quickRepair')}] Base`;
  const btnOrbit = document.getElementById('btn-quick-orbit');
  if (btnOrbit) btnOrbit.textContent = `[${input.getActionKeyLabel('quickOrbit')}] Orbit`;
  const btnM1 = document.getElementById('btn-moon-1');
  if (btnM1) btnM1.textContent = `[${input.getActionKeyLabel('quickMoon1')}] M-I`;
  const btnM2 = document.getElementById('btn-moon-2');
  if (btnM2) btnM2.textContent = `[${input.getActionKeyLabel('quickMoon2')}] M-II`;
  const btnM3 = document.getElementById('btn-moon-3');
  if (btnM3) btnM3.textContent = `[${input.getActionKeyLabel('quickMoon3')}] M-III`;
  const btnSettings = document.getElementById('btn-open-settings');
  if (btnSettings) btnSettings.innerHTML = `&#9881; Settings &amp; Updates [${input.getActionKeyLabel('toggleSettings')}]`;
}

input.onBindingsChanged(updateDynamicUIControls);
updateDynamicUIControls();

// Support URL query parameter ?phase=orbit|moon1|moon2|moon3|board|settings for instant phase entry
const params = new URLSearchParams(window.location.search);
const urlPhase = params.get('phase');
if (urlPhase === 'board') gameAPI.repairAndBoard();
else if (urlPhase === 'orbit') gameAPI.enterPlanetOrbit();
else if (urlPhase === 'moon1') gameAPI.landOnMoon(0);
else if (urlPhase === 'moon1_foot') {
  gameAPI.landOnMoon(0);
  disembarkShip();
}
else if (urlPhase === 'moon2') gameAPI.landOnMoon(1);
else if (urlPhase === 'moon3') gameAPI.landOnMoon(2);
else if (urlPhase === 'settings') settings.toggleModal(true);
if (params.get('theme')) settings.applyTheme(params.get('theme'));
if (params.get('touch')) touchControls.applyVisibility(params.get('touch'));
if (params.get('scheme')) touchControls.applyScheme(params.get('scheme'));
if (params.get('scale')) settings.applyUIScale(parseFloat(params.get('scale')), false);

const urlView = params.get('view');
if (urlView === 'char_back') {
  explorer.cameraDistance = 5.0;
  explorer.pitch = 0.08;
  explorer.visualRoot.rotation.y = 0;
} else if (urlView === 'char_front') {
  explorer.cameraDistance = 5.0;
  explorer.pitch = 0.08;
  explorer.visualRoot.rotation.y = Math.PI * 0.92;
} else if (urlView === 'char_boost') {
  explorer.cameraDistance = 5.6;
  explorer.pitch = 0.12;
  explorer.grounded = false;
  explorer.visualRoot.rotation.y = 0;
  explorer.velocity.set(0, 8, -5);
  explorer.jetFlameLeft.visible = true;
  explorer.jetFlameRight.visible = true;
} else if (urlView === 'char_jump') {
  explorer.cameraDistance = 5.2;
  explorer.pitch = 0.08;
  explorer.grounded = false;
  explorer.jumpPhase = 'ascent';
  explorer.visualRoot.rotation.y = Math.PI * 0.85;
  explorer.velocity.set(0, 8, -4);
  explorer.torso.rotation.x = 0.16;
  explorer.leftLeg.rotation.x = 0.45;
  explorer.rightLeg.rotation.x = 0.35;
  explorer.leftLowerLegGroup.rotation.x = -0.85;
  explorer.rightLowerLegGroup.rotation.x = -0.70;
  explorer.leftArm.rotation.x = -0.35;
  explorer.rightArm.rotation.x = -0.35;
  explorer.leftArm.rotation.z = -0.35;
  explorer.rightArm.rotation.z = 0.35;
  explorer.leftForearmGroup.rotation.x = 0.65;
  explorer.rightForearmGroup.rotation.x = 0.65;
} else if (urlView === 'char_sprint') {
  explorer.cameraDistance = 5.2;
  explorer.pitch = 0.08;
  explorer.grounded = true;
  explorer.visualRoot.rotation.y = Math.PI * 0.72;
  explorer.walkCycle = Math.PI * 0.65;
  explorer.torso.rotation.x = 0.35;
  explorer.leftLeg.rotation.x = -0.75;
  explorer.rightLeg.rotation.x = 0.75;
  explorer.leftLowerLegGroup.rotation.x = -1.35;
  explorer.rightLowerLegGroup.rotation.x = -0.15;
  explorer.leftForearmGroup.rotation.x = 1.35;
  explorer.rightForearmGroup.rotation.x = 1.35;
  explorer.leftArm.rotation.x = 0.75;
  explorer.rightArm.rotation.x = -0.75;
} else if (urlView === 'ship_front') {
  repairSystem.giveAndInstallAll();
  ship.setRepairedVisual(true);
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  ship.landed = false;
  ship.group.position.set(0, planet.radius + 160, 200);
  ship.group.quaternion.setFromEuler(new THREE.Euler(-0.15, 0, 0));
  ship.visualRoot.rotation.y = Math.PI - 0.45;
  ship.visualRoot.rotation.x = -0.12;
  ship.visualRoot.position.z = 6.0;
} else if (urlView === 'ship_rear') {
  repairSystem.giveAndInstallAll();
  ship.setRepairedVisual(true);
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  ship.landed = false;
  ship.group.position.set(0, planet.radius + 160, 200);
  ship.group.quaternion.setFromEuler(new THREE.Euler(-0.25, 0, 0));
  ship.visualRoot.rotation.y = -0.26;
  ship.visualRoot.position.z = 4.0;
  ship.engineFlames.forEach(f => f.visible = true);
} else if (urlView === 'ship_roll') {
  repairSystem.giveAndInstallAll();
  ship.setRepairedVisual(true);
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  ship.landed = false;
  ship.group.position.set(0, planet.radius + 160, 200);
  ship.group.quaternion.setFromEuler(new THREE.Euler(-0.2, 0, 0));
  ship.visualBank = -0.52;
  ship.visualRoot.rotation.z = -0.52;
  ship.engineFlames.forEach(f => f.visible = true);
  ship.fireCooldown = 0;
  ship.fireCannons();
} else if (urlView === 'dive') {
  let minR = Infinity;
  let oceanDir = new THREE.Vector3(1, 0, 0);
  for (let u = -1; u <= 1; u += 0.25) {
    for (let v = -1; v <= 1; v += 0.25) {
      for (let w = -1; w <= 1; w += 0.25) {
        const d = new THREE.Vector3(u, v, w);
        if (d.lengthSq() < 0.1) continue;
        d.normalize();
        const r = planet.getSurfaceRadiusAtDir(d.x, d.y, d.z);
        if (r < minR) {
          minR = r;
          oceanDir = d;
        }
      }
    }
  }
  explorer.spawnOnBody(planet, oceanDir);
  explorer.group.position.copy(oceanDir).multiplyScalar(planet.seaLevelRadius - 12);
  explorer.cameraDistance = 7.5;
  explorer.pitch = 0.15;
  explorer.oxygen = 68;
} else if (urlView === 'sun') {
  repairSystem.giveAndInstallAll();
  ship.setRepairedVisual(true);
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  ship.landed = false;
  ship.group.position.set(0, planet.radius + 700, 1000);
  const sunPos = new THREE.Vector3(6000, 4000, 9500);
  ship.group.lookAt(sunPos);
  ship.sasMode = 'STABILITY';
  ship.velocity.set(0, 0, 0);
  cameraRig.initialized = false;
} else if (urlView === 'mining') {
  explorer.cameraDistance = 5.8;
  explorer.pitch = 0.12;
  const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(explorer.group.quaternion);
  const targetPos = explorer.group.position.clone().addScaledVector(fwd, 6.0);
  explorer.inventory.titanium = 18;
  explorer.inventory.crystal = 9;
  explorer.setMiningTarget(targetPos, true);
  hud.updateMinerals(explorer.inventory);
} else if (urlView === 'flight_hud') {
  repairSystem.giveAndInstallAll();
  ship.setRepairedVisual(true);
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  ship.landed = false;
  ship.group.position.set(0, planet.radius + 60, 0);
  ship.relativeVelocity.set(4.2, -4.8, -32.0);
  ship.vRelVert = -4.8;
  ship.vRelHoriz = 32.2;
  ship.hullIntegrity = 82;
  hud.updateMinerals({ titanium: 18, crystal: 9 });
}

// Collapsible HUD panels on small screens
const panelLeft = document.getElementById('hud-left');
const panelRight = document.getElementById('hud-right');

// Auto-collapse telemetry panel on mobile viewports for clean, open screen
if (window.innerWidth <= 960 || window.innerHeight <= 540) {
  panelLeft?.classList.add('collapsed');
  const btn = document.getElementById('btn-toggle-left');
  if (btn) btn.textContent = '+';
}

document.getElementById('btn-toggle-left')?.addEventListener('click', (e) => {
  e.stopPropagation();
  panelLeft?.classList.toggle('collapsed');
  const btn = document.getElementById('btn-toggle-left');
  if (btn) btn.textContent = panelLeft?.classList.contains('collapsed') ? '+' : '−';
});
document.getElementById('btn-toggle-right')?.addEventListener('click', (e) => {
  e.stopPropagation();
  panelRight?.classList.toggle('collapsed');
  const btn = document.getElementById('btn-toggle-right');
  if (btn) btn.textContent = panelRight?.classList.contains('collapsed') ? '+' : '−';
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

let lastTime = performance.now();
let snapshotFrames = 0;

function animate(now) {
  if (params.has('snapshot') && snapshotFrames >= 4) {
    return;
  }
  snapshotFrames++;
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsedTime += dt;

  // 1. Update moon orbits
  for (const moon of moons) {
    moon.updateOrbit(dt);
  }

  // 2. Update ocean wave displacement, animated sun plasma, and solar flares
  planet.updateOcean(elapsedTime);
  skyTargets.update(elapsedTime, camera);

  // 3. Update rotating repair parts, mineral nodes & projectiles
  repairSystem.update(dt, elapsedTime);
  mineralSystem.update(dt);
  ship.updateProjectilesAndTargets(dt, spaceTargets);

  let promptText = '';

  if (settings.isOpen) {
    navMarkers.navLayer.style.display = 'none';
    input.consumeFrame();
    renderer.render(scene, camera);
    input.endFrame();
    return;
  }
  navMarkers.navLayer.style.display = 'block';

  // Dynamic Keyboard shortcuts for Fast Travel (1: Base, 2: Planet Orbit, 3/4/5: Moons I-III)
  if (input.wasActionPressed('quickRepair') || input.wasPressed('Digit1') || input.wasPressed('Numpad1')) gameAPI.teleportToBase();
  if (input.wasActionPressed('quickOrbit') || input.wasPressed('Digit2') || input.wasPressed('Numpad2')) gameAPI.teleportToOrbit();
  if (input.wasActionPressed('quickMoon1') || input.wasPressed('Digit3') || input.wasPressed('Numpad3')) gameAPI.teleportToMoon(0);
  if (input.wasActionPressed('quickMoon2') || input.wasPressed('Digit4') || input.wasPressed('Numpad4')) gameAPI.teleportToMoon(1);
  if (input.wasActionPressed('quickMoon3') || input.wasPressed('Digit5') || input.wasPressed('Numpad5')) gameAPI.teleportToMoon(2);

  if (gameMode === 'EXPLORING') {
    const mouseFrame = input.consumeFrame();
    // Keep parked Starfighter firmly anchored to orbiting moons with 5-point ground contact
    ship.updateParked(dt, allBodies);

    if (!urlView || (urlView !== 'char_front' && urlView !== 'char_jump' && urlView !== 'char_sprint')) {
      explorer.update(dt, input, mouseFrame, allBodies, ship);
    }
    cameraRig.updateForExplorer(explorer, dt);

    const isTouch = input.isTouchDevice || touchControls.visibility === 'always' || window.innerWidth <= 960;
    const actKeyLabel = input.getActionKeyLabel('interact');
    const wantsAct = (input.wasActionPressed ? input.wasActionPressed('interact') : false) || input.wasPressed('KeyE');

    // Check proximity to interactive mineral deposits & mining laser
    const nearestDeposit = mineralSystem.getNearestDeposit(explorer.group.position, 16.0);
    const isMiningKey = input.mouseDown || (input.isActionDown ? input.isActionDown('mine') : false) || input.isDown('KeyF');

    if (nearestDeposit && nearestDeposit.distance < 14.0) {
      if (isMiningKey) {
        explorer.setMiningTarget(nearestDeposit.deposit.position, true);
        const harvest = nearestDeposit.deposit.takeMiningDamage(52 * dt);
        if (harvest.harvested) {
          if (harvest.type === 'titanium') {
            explorer.inventory.titanium += harvest.amount;
          } else {
            explorer.inventory.crystal += harvest.amount;
          }
          hud.showNotice(`Harvested +${harvest.amount} ${harvest.type === 'titanium' ? 'Titanium Alloy' : 'Silica Crystal'}!`);
        }
      } else {
        explorer.setMiningTarget(null, false);
        promptText = isTouch
          ? `Tap FIRE/ACT to Mine ${nearestDeposit.deposit.name}`
          : `Hold [Left Click / Key F] to Mine ${nearestDeposit.deposit.name}`;
      }
    } else {
      explorer.setMiningTarget(null, false);
    }

    // Check proximity to uncollected repair parts
    const nearest = repairSystem.getNearestUncollectedPart(explorer.group.position);
    if (nearest && nearest.distance < 9.5) {
      promptText = isTouch ? `Tap ACT to collect ${nearest.part.name}` : `Press [${actKeyLabel}] to collect ${nearest.part.name}`;
      if (wantsAct || nearest.distance < 4.2) {
        repairSystem.tryPickupPart(nearest.part);
        const st = repairSystem.getStatus();
        hud.showNotice(`Collected ${nearest.part.name}! (${st.collected}/${st.total} found)`);
      }
    }

    // Check proximity to Starfighter
    const shipDist = explorer.group.position.distanceTo(ship.group.position);
    if (shipDist < 13.5) {
      if (ship.hullIntegrity < 100) {
        const repairCostTi = 5;
        const repairCostCry = 3;
        promptText = isTouch
          ? `Tap ACT to repair Starfighter Hull (${ship.hullIntegrity}%) [Cost: ${repairCostTi} Ti, ${repairCostCry} Cry]`
          : `Press [${actKeyLabel}] to repair Starfighter Hull (${ship.hullIntegrity}%) [Cost: ${repairCostTi} Ti, ${repairCostCry} Cry]`;
        if (wantsAct) {
          if (explorer.inventory.titanium >= repairCostTi && explorer.inventory.crystal >= repairCostCry) {
            explorer.inventory.titanium -= repairCostTi;
            explorer.inventory.crystal -= repairCostCry;
            const newIntegrity = ship.repairHull(25);
            hud.showNotice(`Repaired Starfighter Hull to ${newIntegrity}%! (-${repairCostTi} Titanium, -${repairCostCry} Crystal)`);
          } else {
            hud.showNotice(`Need ${repairCostTi} Titanium & ${repairCostCry} Crystal to repair hull! Mine nearby nodes.`);
          }
        }
      } else if (repairSystem.carriedParts.length > 0) {
        promptText = isTouch
          ? `Tap ACT to install ${repairSystem.carriedParts.length} component(s) into Starfighter`
          : `Press [${actKeyLabel}] to install ${repairSystem.carriedParts.length} component(s) into Starfighter`;
        if (wantsAct) {
          const installedCount = repairSystem.installCarriedParts();
          const st = repairSystem.getStatus();
          if (st.repaired) {
            ship.setRepairedVisual(true);
            hud.showNotice(`Installed ${installedCount} component(s)! Starfighter 100% Repaired — ${isTouch ? 'Tap ACT' : `Press [${actKeyLabel}]`} to board!`);
          } else {
            hud.showNotice(`Installed ${installedCount} component(s) (${st.installed}/${st.total} installed). Find the remaining parts!`);
          }
        }
      } else if (repairSystem.isShipRepaired()) {
        promptText = isTouch ? 'Tap ACT to board Starfighter' : `Press [${actKeyLabel}] to board Starfighter`;
        if (wantsAct) {
          boardShip();
        }
      } else {
        const st = repairSystem.getStatus();
        promptText = `Starfighter Damaged (${st.installed}/${st.total} parts installed) — Explore tropical hills for glowing beacons`;
      }
    }
  } else {
    // PILOTING mode
    const mouseFrame = input.consumeFrame();
    ship.updateFlight(dt, input, mouseFrame, allBodies, (msg) => hud.showNotice(msg));
    cameraRig.updateForShip(ship, dt);

    const isTouch = input.isTouchDevice || touchControls.visibility === 'always' || window.innerWidth <= 960;
    const exitKeyLabel = input.getActionKeyLabel('flightDisembark');
    const wantsExit = (input.wasActionPressed ? input.wasActionPressed('flightDisembark') : false) || input.wasPressed('KeyE');

    if (ship.landed || ship.altitude < 16) {
      const ascKey = input.getActionKeyLabel('flightAscend');
      const fwdKey = input.getActionKeyLabel('flightThrustForward');
      promptText = isTouch
        ? `Tap EXIT to disembark onto ${ship.currentBody ? ship.currentBody.name : 'surface'} | Hold UP to Launch`
        : `Press [${exitKeyLabel}] to disembark onto ${ship.currentBody ? ship.currentBody.name : 'surface'} | Hold [${ascKey}]+[${fwdKey}] to Launch`;
      if (wantsExit) {
        disembarkShip();
      }
    } else if (ship.altitude > 100) {
      const sasKey = input.getActionKeyLabel('flightSAS');
      const boostKey = input.getActionKeyLabel('flightBoost');
      const rollLKey = input.getActionKeyLabel('flightRollLeft');
      const rollRKey = input.getActionKeyLabel('flightRollRight');
      const targetKey = input.getActionKeyLabel('flightCycleTarget');
      promptText = isTouch
        ? `Tap SAS to cycle Flight Computer (${ship.sasMode}) • BOOST for afterburners`
        : `Press [${sasKey}] to cycle SAS (${ship.sasMode}) • [${targetKey}] Target • [${boostKey}] Boost • [${rollLKey}/${rollRKey}] Roll`;
    }

    // Cycle Nav Target (Key T or dynamic key)
    const wantsCycleTarget = (input.wasActionPressed ? input.wasActionPressed('flightCycleTarget') : false) || input.wasPressed('KeyT');
    if (wantsCycleTarget) {
      ship.cycleTargetBody(allBodies, (msg) => hud.showNotice(msg));
    }
  }

  // Adjust atmospheric sky tint based on altitude above planet
  const activePos = gameMode === 'PILOTING' ? ship.group.position : explorer.group.position;
  const distFromPlanetSurface = activePos.distanceTo(planet.getWorldPosition()) - planet.radius;
  const atmoFactor = THREE.MathUtils.clamp(1 - distFromPlanetSurface / 220, 0, 1);
  const spaceColor = new THREE.Color(0x040711);
  const tropicalSkyColor = new THREE.Color(0x16425b);
  scene.background.copy(spaceColor).lerp(tropicalSkyColor, atmoFactor * 0.65);

  // Dynamic fog adjustment: turquoise underwater fog vs space fog
  const camDistToPlanetCenter = camera.position.distanceTo(planet.getWorldPosition());
  const isCamUnderwater = camDistToPlanetCenter < (planet.seaLevelRadius || planet.radius);
  if (isCamUnderwater) {
    scene.fog.color.copy(underwaterFogColor);
    scene.fog.density = 0.0035;
  } else {
    scene.fog.color.copy(spaceFogColor);
    scene.fog.density = 0.00010;
  }

  // Update planetary nav reticles, off-screen edge arrows, and flight vectors
  navMarkers.update(activePos, gameMode, ship.targetBody, ship);

  hud.update(dt, {
    mode: gameMode,
    explorer,
    ship,
    repairSystem,
    planet,
    moons,
    promptText,
    compassText: computeCompassText(),
    input
  });

  touchControls.update(gameMode, {
    ship,
    explorer,
    promptText
  });

  renderer.render(scene, camera);
  input.endFrame();
}

requestAnimationFrame(animate);
