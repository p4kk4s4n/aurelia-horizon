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
const settings = new SettingsManager((msg) => hud.showNotice(msg));

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
    settingsOpen: settings.isOpen
  }),
  openSettings: (open = true) => settings.toggleModal(open),
  setTheme: (themeId) => settings.applyTheme(themeId),
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
    ship.group.position.set(0, planet.radius + 175, 220);
    ship.group.quaternion.setFromEuler(new THREE.Euler(-0.28, 0, 0));
    ship.orbitAssist = true;
    ship.velocity.set(0, 0, -95);
    cameraRig.initialized = false;
    hud.showNotice('Entered High Orbit above Aurelia Prime! Orbit-Assist Active.');
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
    const nearest = repairSystem.getNearestUncollectedPart(explorer.group.position);
    if (nearest && nearest.distance < 9.5) {
      promptText = `Press [E] to collect ${nearest.part.name}`;
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
        promptText = `Press [E] to install ${repairSystem.carriedParts.length} component(s) into Starfighter`;
        if (input.wasPressed('KeyE')) {
          const installedCount = repairSystem.installCarriedParts();
          const st = repairSystem.getStatus();
          if (st.repaired) {
            ship.setRepairedVisual(true);
            hud.showNotice(`Installed ${installedCount} component(s)! Starfighter 100% Repaired — Press [E] to board!`);
          } else {
            hud.showNotice(`Installed ${installedCount} component(s) (${st.installed}/${st.total} installed). Find the remaining parts!`);
          }
        }
      } else if (repairSystem.isShipRepaired()) {
        promptText = 'Press [E] to board Starfighter';
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

    if (ship.landed || ship.altitude < 16) {
      promptText = `Press [E] to disembark onto ${ship.currentBody ? ship.currentBody.name : 'surface'} | Hold [Space]+[W] to Launch`;
      if (input.wasPressed('KeyE')) {
        disembarkShip();
      }
    } else if (ship.altitude > 110 && !ship.orbitAssist) {
      promptText = 'Press [O] to engage Arcade Orbit-Assist | [Shift] Boost | [Click/F] Twin Plasma Cannons';
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

  renderer.render(scene, camera);
}

requestAnimationFrame(animate);
