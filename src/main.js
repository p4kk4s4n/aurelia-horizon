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

const canvas = document.getElementById('game-canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x050814);
scene.fog = new THREE.FogExp2(0x0b192c, 0.00018);

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.5, 16000);

// Build Solar System (Tropical Planet + 3 Moons of varying size)
const { planet, moons, allBodies } = createSolarSystem(scene);
const { targets: spaceTargets } = createSkyAndSpaceTargets(scene);

// Spawn Explorer & Ship on Aurelia Prime's tropical island plateau near north pole
const explorer = new Explorer(scene);
explorer.spawnOnBody(planet, new THREE.Vector3(0, 1, 0));

const ship = new Ship(scene);
ship.placeOnBody(planet, new THREE.Vector3(0.055, 0.997, 0.045));

const repairSystem = new ShipRepairSystem(scene, planet);
const cameraRig = new CameraRig(camera);
const input = new InputManager(canvas);
const hud = new HUD();
const touchControls = new TouchControlsManager(input, (msg, dur) => hud.showNotice(msg, dur));
const settings = new SettingsManager((msg) => hud.showNotice(msg), touchControls);

let gameMode = 'EXPLORING'; // 'EXPLORING' | 'PILOTING'
let elapsedTime = 0;

function boardShip() {
  if (!repairSystem.isShipRepaired()) {
    hud.showNotice('Ship still damaged! Collect and install all 5 ship components first.');
    return;
  }
  gameMode = 'PILOTING';
  explorer.group.visible = false;
  hud.showNotice('Starfighter Systems Online! Hold [Space] + [W] to Lift Off, [Shift] Boost, [O] Orbit Assist, [Click/F] Fire Cannons.');
}

function disembarkShip() {
  if (!ship.landed && ship.altitude > 18) {
    hud.showNotice('Land on a planet or moon surface before disembarking ([Ctrl]/[C] to descend)!');
    return;
  }
  gameMode = 'EXPLORING';
  const up = ship.localUp.clone().normalize();
  const right = new THREE.Vector3(1, 0, 0).applyQuaternion(ship.group.quaternion).normalize();
  explorer.group.position.copy(ship.group.position).addScaledVector(right, 6.5).addScaledVector(up, 1.5);
  explorer.group.quaternion.copy(ship.group.quaternion);
  explorer.velocity.set(0, 0, 0);
  explorer.group.visible = true;
  hud.showNotice(`Stepped out onto ${ship.currentBody ? ship.currentBody.name : 'surface'}.`);
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
    orbitAssist: ship.orbitAssist,
    visitedMoons: Array.from(ship.visitedMoons),
    targetsDestroyed: ship.targetsDestroyed,
    theme: settings.currentThemeId,
    settingsOpen: settings.isOpen,
    touchScheme: touchControls.scheme,
    touchVisibility: touchControls.visibility
  }),
  openSettings: (open = true) => settings.toggleModal(open),
  setTheme: (themeId) => settings.applyTheme(themeId),
  setTouchScheme: (scheme) => touchControls.applyScheme(scheme),
  setTouchVisibility: (vis) => touchControls.applyVisibility(vis),
  checkGitHubUpdate: (force = false) => settings.checkGitHubAndRecache(force),
  repairAndBoard: () => {
    repairSystem.giveAndInstallAll();
    ship.setRepairedVisual(true);
    boardShip();
  },
  enterPlanetOrbit: () => {
    repairSystem.giveAndInstallAll();
    ship.setRepairedVisual(true);
    gameMode = 'PILOTING';
    explorer.group.visible = false;
    ship.landed = false;
    ship.group.position.set(0, planet.radius + 180, 220);
    ship.group.quaternion.setFromEuler(new THREE.Euler(-0.28, 0, 0));
    ship.sasMode = 'STABILITY';
    ship.orbitAssist = false;
    // Set exact circular orbital velocity for true Newtonian orbit: v_circ = sqrt(mu / r)
    const r = ship.group.position.length();
    const mu = planet.surfaceGravity * planet.radius * planet.radius;
    const vCirc = Math.sqrt(mu / r);
    // Tangent vector in YZ plane perpendicular to r = (0, 540, 220)
    ship.velocity.set(0, -vCirc * (220 / r), -vCirc * ((planet.radius + 180) / r));
    cameraRig.initialized = false;
    hud.showNotice('Entered Stable Newtonian Orbit above Aurelia Prime! SAS: STABILITY ASSIST.');
  },
  landOnMoon: (moonIndex = 0) => {
    const moon = moons[moonIndex] || moons[0];
    repairSystem.giveAndInstallAll();
    ship.setRepairedVisual(true);
    gameMode = 'PILOTING';
    explorer.group.visible = false;
    ship.orbitAssist = false;
    ship.placeOnBody(moon, new THREE.Vector3(-0.35, 0.93, 0.1));
    ship.visitedMoons.add(moon.id);
    cameraRig.initialized = false;
    hud.showNotice(`Landed on ${moon.name}! Press [E] to step out and walk in low gravity, or [Space] to launch.`);
  },
  fireWeaponBurst: () => {
    if (gameMode !== 'PILOTING') boardShip();
    ship.fireCooldown = 0;
    ship.fireCannons();
  }
};
window.gameDebug = gameAPI;

// Bind quick-action UI buttons for instant play-testing of phases
document.getElementById('btn-quick-repair')?.addEventListener('click', () => gameAPI.repairAndBoard());
document.getElementById('btn-quick-orbit')?.addEventListener('click', () => gameAPI.enterPlanetOrbit());
document.getElementById('btn-moon-1')?.addEventListener('click', () => gameAPI.landOnMoon(0));
document.getElementById('btn-moon-2')?.addEventListener('click', () => gameAPI.landOnMoon(1));
document.getElementById('btn-moon-3')?.addEventListener('click', () => gameAPI.landOnMoon(2));

// Support URL query parameter ?phase=orbit|moon1|moon2|moon3|board|settings for instant phase entry
const params = new URLSearchParams(window.location.search);
const urlPhase = params.get('phase');
if (urlPhase === 'board') gameAPI.repairAndBoard();
else if (urlPhase === 'orbit') gameAPI.enterPlanetOrbit();
else if (urlPhase === 'moon1') gameAPI.landOnMoon(0);
else if (urlPhase === 'moon2') gameAPI.landOnMoon(1);
else if (urlPhase === 'moon3') gameAPI.landOnMoon(2);
else if (urlPhase === 'settings') settings.toggleModal(true);
if (params.get('theme')) settings.applyTheme(params.get('theme'));
if (params.get('touch')) touchControls.applyVisibility(params.get('touch'));
if (params.get('scheme')) touchControls.applyScheme(params.get('scheme'));

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
}

// Collapsible HUD panels on small screens
const panelLeft = document.getElementById('hud-left');
const panelRight = document.getElementById('hud-right');
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

function animate(now) {
  requestAnimationFrame(animate);
  const dt = Math.min(0.05, (now - lastTime) / 1000);
  lastTime = now;
  elapsedTime += dt;

  // 1. Update moon orbits
  for (const moon of moons) {
    moon.updateOrbit(dt);
  }

  // 2. Update rotating repair parts & projectiles
  repairSystem.update(dt, elapsedTime);
  ship.updateProjectilesAndTargets(dt, spaceTargets);

  let promptText = '';

  if (settings.isOpen) {
    input.consumeFrame();
    renderer.render(scene, camera);
    return;
  }

  // Keyboard shortcuts for quick testing (1: Repair+Board, 2: Planet Orbit, 3/4/5: Moons)
  if (input.wasPressed('Digit1')) gameAPI.repairAndBoard();
  if (input.wasPressed('Digit2')) gameAPI.enterPlanetOrbit();
  if (input.wasPressed('Digit3')) gameAPI.landOnMoon(0);
  if (input.wasPressed('Digit4')) gameAPI.landOnMoon(1);
  if (input.wasPressed('Digit5')) gameAPI.landOnMoon(2);

  if (gameMode === 'EXPLORING') {
    const mouseFrame = input.consumeFrame();
    explorer.update(dt, input, mouseFrame, allBodies);
    cameraRig.updateForExplorer(explorer, dt);

    // Check proximity to uncollected repair parts
    const isTouch = input.isTouchDevice || touchControls.visibility === 'always' || window.innerWidth <= 960;
    const nearest = repairSystem.getNearestUncollectedPart(explorer.group.position);
    if (nearest && nearest.distance < 9.5) {
      promptText = isTouch ? `Tap ACT to collect ${nearest.part.name}` : `Press [E] to collect ${nearest.part.name}`;
      if (input.wasPressed('KeyE') || nearest.distance < 4.2) {
        repairSystem.tryPickupPart(nearest.part);
        const st = repairSystem.getStatus();
        hud.showNotice(`Collected ${nearest.part.name}! (${st.collected}/${st.total} found)`);
      }
    }

    // Check proximity to Starfighter
    const shipDist = explorer.group.position.distanceTo(ship.group.position);
    if (shipDist < 13.5) {
      if (repairSystem.carriedParts.length > 0) {
        promptText = isTouch
          ? `Tap ACT to install ${repairSystem.carriedParts.length} component(s) into Starfighter`
          : `Press [E] to install ${repairSystem.carriedParts.length} component(s) into Starfighter`;
        if (input.wasPressed('KeyE')) {
          const installedCount = repairSystem.installCarriedParts();
          const st = repairSystem.getStatus();
          if (st.repaired) {
            ship.setRepairedVisual(true);
            hud.showNotice(`Installed ${installedCount} component(s)! Starfighter 100% Repaired — ${isTouch ? 'Tap ACT' : 'Press [E]'} to board!`);
          } else {
            hud.showNotice(`Installed ${installedCount} component(s) (${st.installed}/${st.total} installed). Find the remaining parts!`);
          }
        }
      } else if (repairSystem.isShipRepaired()) {
        promptText = isTouch ? 'Tap ACT to board Starfighter' : 'Press [E] to board Starfighter';
        if (input.wasPressed('KeyE')) {
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
    if (ship.landed || ship.altitude < 16) {
      promptText = isTouch
        ? `Tap EXIT to disembark onto ${ship.currentBody ? ship.currentBody.name : 'surface'} | Hold UP to Launch`
        : `Press [E] to disembark onto ${ship.currentBody ? ship.currentBody.name : 'surface'} | Hold [Space]+[W] to Launch`;
      if (input.wasPressed('KeyE')) {
        disembarkShip();
      }
    } else if (ship.altitude > 100) {
      promptText = isTouch
        ? `Tap SAS to cycle Flight Computer (${ship.sasMode}) • BOOST for afterburners`
        : `Press [O] to cycle SAS Flight Computer (${ship.sasMode}) • [Shift] Boost • [Q/E] 6DoF Roll`;
    }
  }

  // Adjust atmospheric sky tint based on altitude above planet
  const activePos = gameMode === 'PILOTING' ? ship.group.position : explorer.group.position;
  const distFromPlanetSurface = activePos.distanceTo(planet.getWorldPosition()) - planet.radius;
  const atmoFactor = THREE.MathUtils.clamp(1 - distFromPlanetSurface / 220, 0, 1);
  const spaceColor = new THREE.Color(0x040711);
  const tropicalSkyColor = new THREE.Color(0x16425b);
  scene.background.copy(spaceColor).lerp(tropicalSkyColor, atmoFactor * 0.65);

  hud.update(dt, {
    mode: gameMode,
    explorer,
    ship,
    repairSystem,
    planet,
    moons,
    promptText,
    compassText: computeCompassText()
  });

  touchControls.update(gameMode, {
    ship,
    explorer,
    promptText
  });

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
