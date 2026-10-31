import * as THREE from 'three';
import { evaluateGravity } from '../world/gravity.js';

function getBodyWorldPos(body) {
  if (!body) return new THREE.Vector3();
  const raw = typeof body.getWorldPosition === 'function' ? body.getWorldPosition() : body.position;
  if (raw && typeof raw.clone === 'function') return raw.clone();
  if (raw && typeof raw.x === 'number') return new THREE.Vector3(raw.x, raw.y, raw.z);
  return new THREE.Vector3();
}

/**
 * Sci-Fi Starfighter with Full Newtonian Orbital Mechanics:
 * - True inverse-square spherical gravitational attraction: a = mu / r^2
 * - Zero vacuum drag in space (h > 140m): total conservation of linear momentum
 * - Quadratic aerodynamic drag within atmosphere (h < 140m)
 * - Real-time Keplerian orbital parameters (Apoapsis, Periapsis, Eccentricity, v_circ)
 * - 5-Mode SAS Flight Computer: STABILITY ASSIST, PROGRADE HOLD, RETROGRADE HOLD, CIRCULARIZE, and OFF (Drift)
 * - Responsive Afterburner Boost: fires forward immediately on Shift or touch button
 * - Underslung starboard chin gun turret pod with twin pulse cannon barrels & recoil
 * - Full 6DoF axial roll (Q / E / touch roll buttons) + coordinated dynamic banking into turns
 */
export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Starfighter';

    this.chinPodBaseZ = -3.1;
    this.visualBank = 0;
    this.flashTimer = 0;

    this._buildShipMesh();
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.localUp = new THREE.Vector3(0, 1, 0);
    this.currentBody = null;
    this.altitude = 0;
    this.speed = 0;
    this.landed = true;
    this.flightPhase = 'SURFACE (DOCKED)';

    // Full Newtonian SAS flight computer modes:
    // 'STABILITY' | 'PROGRADE' | 'RETROGRADE' | 'TARGET' | 'CIRCULARIZE' | 'OFF'
    this.sasMode = 'STABILITY';
    this.targetBody = null;
    this.angularVelocity = new THREE.Vector3(0, 0, 0);
    this.orbitAssist = false;
    this.orbitalData = null;

    // Boost & Weapons state
    this.boostEnergy = 100;
    this.isBoosting = false;
    this.weaponHeat = 0;
    this.fireCooldown = 0;
    this.projectiles = [];
    this.explosions = [];
    this.targetsDestroyed = 0;
    this.visitedMoons = new Set();
    this.hullIntegrity = 100;
    this.maxHullIntegrity = 100;

    // Landing & Moon Orbit Anchor State
    this.landedBody = null;
    this.landedDir = new THREE.Vector3(0, 1, 0);
    this.autoLandingAssist = true;
    this.throttleMode = 'direct'; // 'direct' | 'persistent'
    this.throttle = 0.0;
    this.relativeVelocity = new THREE.Vector3();
    this.relativeSpeed = 0;
    this.vRelVert = 0;
    this.vRelHoriz = 0;
  }

  _buildShipMesh() {
    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    // Concept Materials
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0xd8dad3,
      roughness: 0.35,
      metalness: 0.42,
      flatShading: true
    });
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x242e36,
      roughness: 0.48,
      metalness: 0.65,
      flatShading: true
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xde7938,
      emissive: 0x8a3808,
      emissiveIntensity: 0.25,
      roughness: 0.4,
      metalness: 0.4
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x121c24,
      emissive: 0x08141d,
      emissiveIntensity: 0.35,
      roughness: 0.12,
      metalness: 0.92,
      transparent: true,
      opacity: 0.94
    });
    const crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00f5d4,
      emissiveIntensity: 1.6,
      roughness: 0.12,
      metalness: 0.25
    });
    const conduitMat = new THREE.MeshStandardMaterial({
      color: 0x48cae4,
      emissive: 0x00b4d8,
      emissiveIntensity: 1.1,
      roughness: 0.2
    });
    const gunMetalMat = new THREE.MeshStandardMaterial({
      color: 0x181f26,
      roughness: 0.32,
      metalness: 0.88,
      flatShading: true
    });
    const opticMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4
    });

    // 1. MAIN WEDGE FUSELAGE & CHINE (Lifting-Body Arrowhead)
    // Dark Slate Nose Bumper Cap (Z = -5.4 to -4.6)
    const noseCapGeo = new THREE.BoxGeometry(1.2, 0.52, 1.1);
    const noseCap = new THREE.Mesh(noseCapGeo, darkMat);
    noseCap.position.set(0, 1.08, -5.0);
    this.visualRoot.add(noseCap);

    // Off-White Forward Upper Wedge Deck (Z = -4.6 to -1.0)
    const foreDeckGeo = new THREE.BoxGeometry(2.2, 0.68, 4.2);
    const foreDeck = new THREE.Mesh(foreDeckGeo, armorMat);
    foreDeck.position.set(0, 1.25, -2.8);
    this.visualRoot.add(foreDeck);

    // Forward deck nose bevel (Cone wedge)
    const foreBevelGeo = new THREE.ConeGeometry(1.4, 3.4, 4);
    foreBevelGeo.rotateX(-Math.PI / 2);
    foreBevelGeo.rotateZ(Math.PI / 4);
    foreBevelGeo.scale(1.35, 0.48, 1.0);
    const foreBevel = new THREE.Mesh(foreBevelGeo, armorMat);
    foreBevel.position.set(0, 1.18, -3.8);
    this.visualRoot.add(foreBevel);

    // Mid-Body Flared Shoulders (Z = -1.0 to 2.8, Width flares out to 4.8)
    const shoulderGeo = new THREE.BoxGeometry(3.6, 0.88, 3.8);
    const shoulder = new THREE.Mesh(shoulderGeo, armorMat);
    shoulder.position.set(0, 1.34, 0.9);
    this.visualRoot.add(shoulder);

    // Left and right beveled shoulder armor flares
    const leftFlareGeo = new THREE.BoxGeometry(1.2, 0.55, 3.2);
    const leftFlare = new THREE.Mesh(leftFlareGeo, armorMat);
    leftFlare.position.set(-2.2, 1.25, 1.1);
    leftFlare.rotation.y = -0.16;
    const rightFlare = new THREE.Mesh(leftFlareGeo, armorMat);
    rightFlare.position.set(2.2, 1.25, 1.1);
    rightFlare.rotation.y = 0.16;
    this.visualRoot.add(leftFlare, rightFlare);

    // Dark Slate Ventral Chine & Belly (Bottom hull running Z = -5.1 to +4.2)
    const ventralGeo = new THREE.BoxGeometry(3.2, 0.62, 9.0);
    const ventral = new THREE.Mesh(ventralGeo, darkMat);
    ventral.position.set(0, 0.72, -0.4);
    this.visualRoot.add(ventral);

    // Perimeter Chine Bevel Strips along flanks
    const chineStripGeo = new THREE.BoxGeometry(0.35, 0.42, 6.4);
    const leftChine = new THREE.Mesh(chineStripGeo, darkMat);
    leftChine.position.set(-1.8, 0.88, -0.6);
    const rightChine = new THREE.Mesh(chineStripGeo, darkMat);
    rightChine.position.set(1.8, 0.88, -0.6);
    this.visualRoot.add(leftChine, rightChine);

    // Twin Ventral Downward Fins (as seen in side & front views of concept)
    const vFinGeo = new THREE.BoxGeometry(0.18, 0.75, 1.8);
    const leftVFin = new THREE.Mesh(vFinGeo, darkMat);
    leftVFin.position.set(-1.45, 0.32, 2.2);
    leftVFin.rotation.z = -0.32;
    leftVFin.rotation.x = -0.18;
    const rightVFin = new THREE.Mesh(vFinGeo, darkMat);
    rightVFin.position.set(1.45, 0.32, 2.2);
    rightVFin.rotation.z = 0.32;
    rightVFin.rotation.x = -0.18;
    this.visualRoot.add(leftVFin, rightVFin);

    // 2. ELONGATED FACETED COCKPIT CANOPY
    const canopyGeo = new THREE.BoxGeometry(1.22, 0.64, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 1.76, -1.6);
    this.visualRoot.add(canopy);

    const canopySlantGeo = new THREE.ConeGeometry(0.85, 2.0, 4);
    canopySlantGeo.rotateX(-Math.PI / 2);
    canopySlantGeo.rotateZ(Math.PI / 4);
    canopySlantGeo.scale(1.18, 0.48, 1.0);
    const canopySlant = new THREE.Mesh(canopySlantGeo, canopyMat);
    canopySlant.position.set(0, 1.62, -3.2);
    this.visualRoot.add(canopySlant);

    const canopyRidgeGeo = new THREE.BoxGeometry(0.2, 0.12, 3.2);
    const canopyRidge = new THREE.Mesh(canopyRidgeGeo, darkMat);
    canopyRidge.position.set(0, 2.1, -1.8);
    this.visualRoot.add(canopyRidge);

    // 3. RECESSED SPINE POWER CHANNEL & REAR 3-CRYSTAL PROPULSION ARRAY
    const spineWellGeo = new THREE.BoxGeometry(1.65, 0.32, 3.4);
    const spineWell = new THREE.Mesh(spineWellGeo, darkMat);
    spineWell.position.set(0, 1.62, 2.1);
    this.visualRoot.add(spineWell);

    // 4 Cyan Glowing Conduits running along the spine well into the thrusters
    const conduitGeo = new THREE.CylinderGeometry(0.065, 0.065, 3.2, 6);
    conduitGeo.rotateX(Math.PI / 2);
    for (const cx of [-0.48, -0.16, 0.16, 0.48]) {
      const tube = new THREE.Mesh(conduitGeo, conduitMat);
      tube.position.set(cx, 1.74, 2.1);
      this.visualRoot.add(tube);
    }

    // Rear manifold stern bulkhead
    const sternBulkheadGeo = new THREE.BoxGeometry(3.6, 1.1, 1.2);
    const sternBulkhead = new THREE.Mesh(sternBulkheadGeo, darkMat);
    sternBulkhead.position.set(0, 1.35, 3.8);
    this.visualRoot.add(sternBulkhead);

    // 3 Hexagonal Crystal Engine Thrusters
    this.crystalEngines = [];
    this.engineFlames = [];

    const thrusterLayout = [
      { x: 0, y: 1.82, z: 4.3 },      // Top-Center
      { x: -0.98, y: 1.08, z: 4.3 },  // Lower-Left
      { x: 0.98, y: 1.08, z: 4.3 }    // Lower-Right
    ];

    this.flameMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    thrusterLayout.forEach((pos) => {
      const collarGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.65, 8);
      collarGeo.rotateX(Math.PI / 2);
      const collar = new THREE.Mesh(collarGeo, darkMat);
      collar.position.set(pos.x, pos.y, pos.z - 0.2);
      this.visualRoot.add(collar);

      const crystalGroup = new THREE.Group();
      crystalGroup.position.set(pos.x, pos.y, pos.z);

      const cryShaftGeo = new THREE.CylinderGeometry(0.28, 0.42, 0.9, 6);
      cryShaftGeo.rotateX(Math.PI / 2);
      const cryShaft = new THREE.Mesh(cryShaftGeo, crystalMat);
      crystalGroup.add(cryShaft);

      const cryTipGeo = new THREE.ConeGeometry(0.42, 1.2, 6);
      cryTipGeo.rotateX(Math.PI / 2);
      const cryTip = new THREE.Mesh(cryTipGeo, crystalMat);
      cryTip.position.set(0, 0, 0.9);
      crystalGroup.add(cryTip);

      this.visualRoot.add(crystalGroup);
      this.crystalEngines.push(crystalGroup);

      // Dynamic Exhaust Flame Plume
      const flameGeo = new THREE.ConeGeometry(0.55, 3.6, 8);
      flameGeo.rotateX(Math.PI / 2);
      const flame = new THREE.Mesh(flameGeo, this.flameMat);
      flame.position.set(pos.x, pos.y, pos.z + 2.4);
      flame.visible = false;
      this.visualRoot.add(flame);
      this.engineFlames.push(flame);
    });

    this.leftFlame = this.engineFlames[1];
    this.rightFlame = this.engineFlames[2];

    // 3B. Directional RCS Thrusters (Ventral Lift, Dorsal Retro, Port & Starboard Strafe)
    this.rcsFlames = {
      ventral: [],
      dorsal: [],
      port: [],
      starboard: []
    };

    const rcsNozzleMat = darkMat;
    const rcsFlameMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.88 });

    // Helper to create an RCS thruster nozzle with plume
    const addRcsThruster = (pos, dirVec, category) => {
      const thrusterGroup = new THREE.Group();
      thrusterGroup.position.set(pos.x, pos.y, pos.z);

      const nozzleGeo = new THREE.CylinderGeometry(0.12, 0.16, 0.22, 6);
      const nozzle = new THREE.Mesh(nozzleGeo, rcsNozzleMat);
      thrusterGroup.add(nozzle);

      const pGeo = new THREE.ConeGeometry(0.16, 1.1, 6);
      pGeo.translate(0, 0.55, 0);
      const plume = new THREE.Mesh(pGeo, rcsFlameMat);
      plume.visible = false;
      thrusterGroup.add(plume);

      // Orient thruster along dirVec
      const defaultDir = new THREE.Vector3(0, 1, 0);
      const q = new THREE.Quaternion().setFromUnitVectors(defaultDir, dirVec.clone().normalize());
      thrusterGroup.quaternion.copy(q);

      this.visualRoot.add(thrusterGroup);
      this.rcsFlames[category].push(plume);
    };

    // Ventral (Bottom) Lift Thrusters (Plumes shoot -Y downward, pushing ship +Y upward)
    addRcsThruster({ x: -1.4, y: 0.35, z: -0.6 }, new THREE.Vector3(0, -1, 0), 'ventral');
    addRcsThruster({ x: 1.4, y: 0.35, z: -0.6 }, new THREE.Vector3(0, -1, 0), 'ventral');
    addRcsThruster({ x: -1.2, y: 0.35, z: 2.2 }, new THREE.Vector3(0, -1, 0), 'ventral');
    addRcsThruster({ x: 1.2, y: 0.35, z: 2.2 }, new THREE.Vector3(0, -1, 0), 'ventral');

    // Dorsal (Top) Retro-Descent Thrusters (Plumes shoot +Y upward, pushing ship -Y downward)
    addRcsThruster({ x: -1.1, y: 1.82, z: 0.6 }, new THREE.Vector3(0, 1, 0), 'dorsal');
    addRcsThruster({ x: 1.1, y: 1.82, z: 0.6 }, new THREE.Vector3(0, 1, 0), 'dorsal');

    // Port (Left) Thrusters (Plumes shoot -X to port, pushing ship +X to starboard)
    addRcsThruster({ x: -2.3, y: 1.05, z: -0.4 }, new THREE.Vector3(-1, 0, 0), 'port');
    addRcsThruster({ x: -2.2, y: 1.05, z: 1.4 }, new THREE.Vector3(-1, 0, 0), 'port');

    // Starboard (Right) Thrusters (Plumes shoot +X to starboard, pushing ship -X to port)
    addRcsThruster({ x: 2.3, y: 1.05, z: -0.4 }, new THREE.Vector3(1, 0, 0), 'starboard');
    addRcsThruster({ x: 2.2, y: 1.05, z: 1.4 }, new THREE.Vector3(1, 0, 0), 'starboard');

    // 4. FLOATING OUTRIGGER CANARD FINS
    this.floatingFins = [];

    const createFloatingFinPair = (side) => {
      const finGroup = new THREE.Group();
      finGroup.position.set(side * 3.45, 1.3, 1.2);

      const upperBladeGeo = new THREE.BoxGeometry(0.12, 0.65, 2.5);
      const upperBlade = new THREE.Mesh(upperBladeGeo, armorMat);
      upperBlade.position.set(side * 0.2, 0.28, 0);
      upperBlade.rotation.z = side * -0.36;
      upperBlade.rotation.y = side * -0.08;
      finGroup.add(upperBlade);

      const lowerBladeGeo = new THREE.BoxGeometry(0.1, 0.48, 1.8);
      const lowerBlade = new THREE.Mesh(lowerBladeGeo, darkMat);
      lowerBlade.position.set(side * 0.15, -0.42, 0.2);
      lowerBlade.rotation.z = side * 0.32;
      finGroup.add(lowerBlade);

      const nodeGeo = new THREE.SphereGeometry(0.12, 8, 8);
      const hoverNode = new THREE.Mesh(nodeGeo, crystalMat);
      hoverNode.position.set(-side * 0.32, 0, 0);
      finGroup.add(hoverNode);

      this.visualRoot.add(finGroup);
      return finGroup;
    };

    const leftFin = createFloatingFinPair(-1);
    const rightFin = createFloatingFinPair(1);
    this.floatingFins.push(leftFin, rightFin);

    // 5. UNDERSLUNG STARBOARD CHIN GUN TURRET POD
    this.chinGunPod = new THREE.Group();
    this.chinGunPod.position.set(0.72, 0.45, this.chinPodBaseZ);

    const podBodyGeo = new THREE.BoxGeometry(0.68, 0.46, 2.2);
    const podBody = new THREE.Mesh(podBodyGeo, gunMetalMat);
    this.chinGunPod.add(podBody);

    const opticFaceGeo = new THREE.ConeGeometry(0.36, 0.6, 4);
    opticFaceGeo.rotateX(-Math.PI / 2);
    const opticFace = new THREE.Mesh(opticFaceGeo, darkMat);
    opticFace.position.set(0, 0, -1.2);
    this.chinGunPod.add(opticFace);

    const opticLensGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.1, 8);
    opticLensGeo.rotateX(Math.PI / 2);
    const leftOptic = new THREE.Mesh(opticLensGeo, opticMat);
    leftOptic.position.set(-0.14, 0.08, -1.38);
    const rightOptic = new THREE.Mesh(opticLensGeo, opticMat);
    rightOptic.position.set(0.14, 0.08, -1.38);
    this.chinGunPod.add(leftOptic, rightOptic);

    this.gunBarrels = [];
    const barrelGeo = new THREE.CylinderGeometry(0.075, 0.075, 1.8, 8);
    barrelGeo.rotateX(Math.PI / 2);

    const barrelOffset = 0.15;
    for (const bOffset of [-barrelOffset, barrelOffset]) {
      const barrel = new THREE.Mesh(barrelGeo, gunMetalMat);
      barrel.position.set(bOffset, -0.06, -1.65);
      this.chinGunPod.add(barrel);
      this.gunBarrels.push(barrel);

      const tipGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.12, 8);
      tipGeo.rotateX(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, opticMat);
      tip.position.set(bOffset, -0.06, -2.55);
      this.chinGunPod.add(tip);
    }

    const flashGeo = new THREE.OctahedronGeometry(0.42, 0);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, wireframe: true });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.position.set(0, -0.06, -2.7);
    this.muzzleFlash.visible = false;
    this.chinGunPod.add(this.muzzleFlash);

    this.visualRoot.add(this.chinGunPod);

    // 6. LANDING BEACON RING
    const beaconGeo = new THREE.TorusGeometry(6.6, 0.14, 8, 36);
    beaconGeo.rotateX(Math.PI / 2);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xff595e });
    this.beaconRing = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.beaconRing.position.y = 0.22;
    this.visualRoot.add(this.beaconRing);
  }

  setRepairedVisual(repaired) {
    this.beaconMat.color.setHex(repaired ? 0x00f5d4 : 0xff595e);
  }

  repairHull(amount = 25) {
    this.hullIntegrity = Math.min(this.maxHullIntegrity || 100, this.hullIntegrity + amount);
    return this.hullIntegrity;
  }

  _resolveGroundContact(body, dirVector = null) {
    if (!body) return { elevation: 720, groundNormal: new THREE.Vector3(0, 1, 0), tiltAngle: 0, maxSurfaceR: 720 };
    const bPos = getBodyWorldPos(body);
    const centerDir = dirVector ? dirVector.clone().normalize() : this.group.position.clone().sub(bPos).normalize();

    let shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    // Project forward vector onto the tangent plane perpendicular to centerDir
    shipForward.addScaledVector(centerDir, -shipForward.dot(centerDir));
    if (shipForward.lengthSq() < 0.001) {
      shipForward.set(0, 0, -1);
    } else {
      shipForward.normalize();
    }
    const shipRight = centerDir.clone().cross(shipForward).normalize();
    shipForward = shipRight.clone().cross(centerDir).normalize();

    // 5-Point Footprint Samples (Center, Nose, Tail, Port Wing, Starboard Wing)
    const footprintSamples = [
      { name: 'center', offset: new THREE.Vector3(0, 0, 0) },
      { name: 'nose', offset: shipForward.clone().multiplyScalar(4.5) },
      { name: 'tail', offset: shipForward.clone().multiplyScalar(-3.8) },
      { name: 'port', offset: shipRight.clone().multiplyScalar(-2.8) },
      { name: 'starboard', offset: shipRight.clone().multiplyScalar(2.8) }
    ];

    let maxSurfaceR = -Infinity;
    const groundPoints = [];

    for (const sample of footprintSamples) {
      const sampleWorld = bPos.clone().addScaledVector(centerDir, body.radius).add(sample.offset);
      const sampleDir = sampleWorld.clone().sub(bPos).normalize();
      const terrainR = body.getSurfaceRadiusAtDir(sampleDir.x, sampleDir.y, sampleDir.z);
      const floorR = Math.max(terrainR, body.seaLevelRadius || 0);
      const pt = bPos.clone().addScaledVector(sampleDir, floorR);
      groundPoints.push({ name: sample.name, point: pt, floorR });
      if (floorR > maxSurfaceR) {
        maxSurfaceR = floorR;
      }
    }

    // Ground surface normal calculated from footprint samples
    const nosePt = groundPoints[1].point;
    const tailPt = groundPoints[2].point;
    const portPt = groundPoints[3].point;
    const stbdPt = groundPoints[4].point;

    const vLong = nosePt.clone().sub(tailPt).normalize();
    const vLat = stbdPt.clone().sub(portPt).normalize();
    let groundNormal = vLat.clone().cross(vLong).normalize();
    if (groundNormal.dot(centerDir) < 0) {
      groundNormal.negate();
    }

    const tiltCos = THREE.MathUtils.clamp(groundNormal.dot(centerDir), -1, 1);
    const tiltAngle = Math.acos(tiltCos) * (180 / Math.PI);

    // Height offset so the bottom ventral plate sits cleanly above highest terrain feature
    const clearance = 0.42;
    const finalCenterRadius = maxSurfaceR + clearance;

    return {
      elevation: finalCenterRadius,
      groundNormal,
      tiltAngle,
      maxSurfaceR
    };
  }

  placeOnBody(body, dirVector = new THREE.Vector3(0.03, 0.998, 0.05)) {
    const dir = dirVector.clone().normalize();
    const bPos = getBodyWorldPos(body);
    this.landed = true;
    this.currentBody = body;
    this.landedBody = body;
    this.landedDir = dir.clone();

    // Align initially to surface radial up
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.group.quaternion.copy(alignQuat);
    this.localUp.copy(dir);
    this.velocity.set(0, 0, 0);

    // Resolve 5-point ground contact for zero clipping
    const contact = this._resolveGroundContact(body, dir);
    this.group.position.copy(bPos).addScaledVector(dir, contact.elevation);

    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
    const align = new THREE.Quaternion().setFromUnitVectors(currentUp, contact.groundNormal);
    this.group.quaternion.premultiply(align);
    this.localUp.copy(contact.groundNormal);

    if (this.beaconRing) this.beaconRing.visible = true;
  }

  updateParked(dt, bodies) {
    if (!this.landed || !this.landedBody) return;
    const body = this.landedBody;
    this.currentBody = body;
    this.velocity.set(0, 0, 0);
    this.throttle = 0.0;

    // Anchor securely to the orbiting moon/planet surface with 5-point ground resolution
    const bPos = getBodyWorldPos(body);
    const contact = this._resolveGroundContact(body, this.landedDir);
    this.group.position.copy(bPos).addScaledVector(this.landedDir, contact.elevation);

    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
    const align = new THREE.Quaternion().setFromUnitVectors(currentUp, contact.groundNormal);
    this.group.quaternion.premultiply(align);
    this.localUp.copy(contact.groundNormal);

    // Ensure engine and RCS flames are off while parked
    for (let i = 0; i < this.engineFlames.length; i++) {
      this.engineFlames[i].visible = false;
    }
    if (this.rcsFlames) {
      for (const k in this.rcsFlames) {
        for (let i = 0; i < this.rcsFlames[k].length; i++) {
          this.rcsFlames[k][i].visible = false;
        }
      }
    }
    if (this.beaconRing) {
      this.beaconRing.visible = true;
    }
  }

  cycleSASMode(onNotice) {
    const modes = ['STABILITY', 'PROGRADE', 'RETROGRADE', 'TARGET', 'CIRCULARIZE', 'OFF'];
    const idx = modes.indexOf(this.sasMode);
    this.sasMode = modes[(idx + 1) % modes.length];
    this.orbitAssist = (this.sasMode === 'CIRCULARIZE');

    if (onNotice) {
      const labels = {
        'STABILITY': 'SAS: STABILITY ASSIST (Angular Damping)',
        'PROGRADE': 'SAS: PROGRADE HOLD (Nose Aligned with Velocity)',
        'RETROGRADE': 'SAS: RETROGRADE HOLD (Nose Aligned Opposite Velocity)',
        'TARGET': 'SAS: TARGET LOCK (Homing Nose on Target Body)',
        'CIRCULARIZE': 'SAS: ORBIT CIRCULARIZE (Auto-burn engaged)',
        'OFF': 'SAS: OFF (Full Newtonian Coast)'
      };
      onNotice(labels[this.sasMode] || `SAS: ${this.sasMode}`);
    }
  }

  cycleTargetBody(bodies, onNotice) {
    if (!bodies || bodies.length === 0) return;
    const curIdx = bodies.indexOf(this.targetBody);
    this.targetBody = bodies[(curIdx + 1) % bodies.length];
    if (onNotice) {
      onNotice(`Nav Target: ${this.targetBody.name}`);
    }
  }

  calculateOrbitParameters(body, grav) {
    if (!body || !grav || grav.altitude < 0) return null;
    const mu = grav.mu || (body.surfaceGravity * body.radius * body.radius);
    const bPos = getBodyWorldPos(body);
    const rVec = this.group.position.clone().sub(bPos);
    const r = rVec.length();
    const v = this.velocity.length();
    if (r < 1) return null;

    // Specific orbital energy: epsilon = v^2/2 - mu/r
    const epsilon = (v * v) * 0.5 - mu / r;
    const vCirc = Math.sqrt(mu / r);

    let a = 0;
    let e = 0;
    let ap = 0;
    let pe = 0;

    if (Math.abs(epsilon) > 1e-4) {
      a = -mu / (2 * epsilon);
      const hVec = new THREE.Vector3().crossVectors(rVec, this.velocity);
      const vCrossH = new THREE.Vector3().crossVectors(this.velocity, hVec);
      const eVec = vCrossH.divideScalar(mu).sub(rVec.clone().divideScalar(r));
      e = eVec.length();

      if (e < 1.0 && a > 0) {
        const rAp = a * (1 + e);
        const rPe = a * (1 - e);
        ap = Math.max(0, rAp - body.radius);
        pe = rPe - body.radius;
      } else {
        pe = (a !== 0) ? (a * (1 - e) - body.radius) : (r - body.radius);
        ap = Infinity;
      }
    }

    let trajectory = 'SUB-ORBITAL TRAJECTORY';
    const atmoH = body.atmosphereHeight || 0;
    if (this.altitude < atmoH) {
      trajectory = 'ATMOSPHERIC FLIGHT / RE-ENTRY';
    } else if (e >= 1.0) {
      trajectory = 'ESCAPE TRAJECTORY';
    } else if (pe > atmoH) {
      trajectory = e < 0.05 ? 'STABLE CIRCULAR ORBIT' : 'STABLE ELLIPTICAL ORBIT';
    } else if (pe > 0) {
      trajectory = 'DECAYING SUB-ORBIT';
    }

    return {
      ap: isFinite(ap) ? Math.round(ap) : 'ESCAPE',
      pe: Math.round(pe),
      eccentricity: parseFloat(e.toFixed(3)),
      vCirc: Math.round(vCirc),
      speed: Math.round(v),
      trajectory,
      isOrbiting: pe > atmoH && e < 1.0 && this.altitude >= atmoH
    };
  }

  fireCannons() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = 0.13;
    this.weaponHeat = Math.min(100, this.weaponHeat + 7);

    if (this.chinGunPod) {
      this.chinGunPod.position.z = this.chinPodBaseZ + 0.15;
    }
    if (this.muzzleFlash) {
      this.muzzleFlash.visible = true;
      this.flashTimer = 0.06;
    }

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();

    const boltGeo = new THREE.SphereGeometry(0.55, 8, 8);
    boltGeo.scale(0.65, 0.65, 3.6);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    const barrelOffsets = [-0.15, 0.15];
    const podX = 0.72;
    const podY = 0.45;
    const muzzleZ = -5.65;

    for (const bX of barrelOffsets) {
      const mesh = new THREE.Mesh(boltGeo, boltMat);
      const spawnPos = this.group.position
        .clone()
        .addScaledVector(right, podX + bX)
        .addScaledVector(up, podY)
        .addScaledVector(forward, -muzzleZ);

      mesh.position.copy(spawnPos);
      mesh.quaternion.copy(this.group.quaternion);
      this.scene.add(mesh);

      const boltVel = forward.clone().multiplyScalar(440).add(this.velocity);
      this.projectiles.push({
        mesh,
        velocity: boltVel,
        life: 2.5
      });
    }
  }

  _spawnExplosion(pos, colorHex = 0xff9f1c) {
    const geo = new THREE.IcosahedronGeometry(3.2, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.explosions.push({ mesh, age: 0, maxAge: 0.55 });
  }

  updateProjectilesAndTargets(dt, spaceTargets, enemyFaction = null, onEnemyHit = null) {
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.weaponHeat > 0) this.weaponHeat = Math.max(0, this.weaponHeat - 28 * dt);

    if (spaceTargets) {
      for (const t of spaceTargets) {
        if (t.destroyed) {
          t.respawnTimer -= dt;
          if (t.respawnTimer <= 0) {
            t.destroyed = false;
            t.hp = t.isDrone ? 30 : 40;
            t.mesh.visible = true;
          }
          continue;
        }
        t.orbitAngle += t.orbitSpeed * dt;
        t.mesh.position.set(
          Math.cos(t.orbitAngle) * t.orbitRadius,
          t.yOffset,
          Math.sin(t.orbitAngle) * t.orbitRadius
        );
        t.mesh.rotation.x += dt * 0.8;
        t.mesh.rotation.y += dt * 1.1;
      }
    }

    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      let hit = false;
      if (spaceTargets) {
        for (const t of spaceTargets) {
          if (t.destroyed) continue;
          const dist = p.mesh.position.distanceTo(t.mesh.position);
          if (dist <= t.radius + 4.5) {
            t.hp -= 20;
            hit = true;
            this._spawnExplosion(p.mesh.position, 0x00f5d4);
            if (t.hp <= 0) {
              t.destroyed = true;
              t.respawnTimer = 18;
              t.mesh.visible = false;
              this.targetsDestroyed++;
              this._spawnExplosion(t.mesh.position, t.isDrone ? 0xff2a85 : 0xff9f1c);
            }
            break;
          }
        }
      }

      if (!hit && enemyFaction && typeof enemyFaction.takeDamageAtPoint === 'function') {
        const eHit = enemyFaction.takeDamageAtPoint(p.mesh.position, 4.0, 35);
        if (eHit && eHit.hit) {
          hit = true;
          this._spawnExplosion(p.mesh.position, 0x00f5d4);
          if (eHit.defeated) {
            this._spawnExplosion(p.mesh.position, 0xff1e46);
            if (eHit.targetType === 'enemy_pod') {
              this.targetsDestroyed++;
            }
          }
          if (onEnemyHit) onEnemyHit(eHit);
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += dt;
      const k = ex.age / ex.maxAge;
      ex.mesh.scale.setScalar(1 + k * 5.5);
      ex.mesh.material.opacity = Math.max(0, 1 - k);
      if (ex.age >= ex.maxAge) {
        this.scene.remove(ex.mesh);
        this.explosions.splice(i, 1);
      }
    }
  }

  updateFlight(dt, input, mouseFrame, bodies, onNotice) {
    const grav = evaluateGravity(this.group.position, bodies);
    const body = grav.body;
    this.currentBody = body;
    this.altitude = Math.max(0, grav.altitude);
    const newUp = new THREE.Vector3(grav.up.x, grav.up.y, grav.up.z).normalize();
    this.localUp.copy(newUp);

    // Calculate body-relative velocity & kinematics inside moon/planet SOI
    const bVel = (body && body.isMoon && body.deltaPosition && dt > 0)
      ? body.deltaPosition.clone().divideScalar(dt)
      : new THREE.Vector3();

    this.relativeVelocity = this.velocity.clone().sub(bVel);
    this.relativeSpeed = this.relativeVelocity.length();
    this.vRelVert = this.relativeVelocity.dot(newUp);
    this.vRelHoriz = this.relativeVelocity.clone().sub(newUp.clone().multiplyScalar(this.vRelVert)).length();

    // Keep orbiting moon position delta inside its SOI
    if (body && body.isMoon && body.deltaPosition && this.altitude < body.soiRadius) {
      this.group.position.add(body.deltaPosition);
    }

    // Toggle / Cycle Flight Computer / SAS Mode
    const wantsSAS = (input.wasActionPressed ? input.wasActionPressed('flightSAS') : false) || input.wasPressed('KeyO');
    if (wantsSAS) {
      this.cycleSASMode(onNotice);
    }

    // Weapons fire (Left Mouse, touch button, or flightFire action / KeyF)
    const wantsFire = input.mouseDown || (input.isActionDown ? input.isActionDown('flightFire') : false) || input.isDown('KeyF');
    if (wantsFire) {
      this.fireCannons();
    }

    // Rotation controls: Pitch, Yaw, and 6DoF Axial Roll (Smoothed & Rate-Limited)
    const mousePitchRate = THREE.MathUtils.clamp(-mouseFrame.dy * 0.16, -1.6, 1.6);
    const mouseYawRate = THREE.MathUtils.clamp(-mouseFrame.dx * 0.16, -1.6, 1.6);
    const targetPitch = THREE.MathUtils.clamp(
      mousePitchRate - (input.lookVelY || 0) * 1.8 + ((input.isDown('ArrowDown') ? 1 : 0) - (input.isDown('ArrowUp') ? 1 : 0)) * 1.4,
      -1.85, 1.85
    );
    const targetYaw = THREE.MathUtils.clamp(
      mouseYawRate - (input.lookVelX || 0) * 2.2 + ((input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0)) * 1.4,
      -1.85, 1.85
    );

    let rollDir = 0;
    const isRollL = (input.isActionDown ? input.isActionDown('flightRollLeft') : false) || input.isDown('KeyQ');
    const isRollR = (input.isActionDown ? input.isActionDown('flightRollRight') : false) || input.isDown('KeyE');
    if (isRollL) rollDir += 1;
    if (!this.landed && (this.altitude >= 16 || !this.currentBody) && isRollR) rollDir -= 1;
    if (input.rollRate) rollDir -= input.rollRate;

    const targetRoll = rollDir * 2.5;

    // Exponential smoothing on angular rates
    const rotDamp = 1 - Math.exp(-18.0 * dt);
    this.angularVelocity.x += (targetPitch - this.angularVelocity.x) * rotDamp;
    this.angularVelocity.y += (targetYaw - this.angularVelocity.y) * rotDamp;
    this.angularVelocity.z += (targetRoll - this.angularVelocity.z) * rotDamp;

    const pilotActive = Math.abs(rollDir) > 0.05 || Math.abs(this.angularVelocity.x) > 0.05 || Math.abs(this.angularVelocity.y) > 0.05;

    if (!this.landed) {
      // 1. Manual pilot angular rotation
      const rotDelta = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(this.angularVelocity.x * dt, this.angularVelocity.y * dt, this.angularVelocity.z * dt, 'YXZ')
      );
      this.group.quaternion.multiply(rotDelta);

      // 2. SAS Flight Computer Autopilot Alignments
      const curSpeed = this.velocity.length();

      if (this.sasMode === 'PROGRADE' && curSpeed > 2.0 && !pilotActive) {
        // Smoothly point nose forward along velocity vector
        const progradeDir = this.velocity.clone().normalize();
        const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(shipForward, progradeDir);
        const targetQuat = this.group.quaternion.clone().premultiply(alignQuat);
        this.group.quaternion.slerp(targetQuat, Math.min(1, 4.0 * dt));
      } else if (this.sasMode === 'RETROGRADE' && curSpeed > 2.0 && !pilotActive) {
        // Smoothly point nose opposite to velocity vector
        const retrogradeDir = this.velocity.clone().negate().normalize();
        const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
        const alignQuat = new THREE.Quaternion().setFromUnitVectors(shipForward, retrogradeDir);
        const targetQuat = this.group.quaternion.clone().premultiply(alignQuat);
        this.group.quaternion.slerp(targetQuat, Math.min(1, 4.0 * dt));
      } else if (this.sasMode === 'TARGET' && !pilotActive) {
        // Homing: smoothly lock starfighter nose toward selected celestial body
        const targetObj = this.targetBody || (bodies && bodies[0]);
        if (targetObj) {
          const toTarget = targetObj.getWorldPosition().clone().sub(this.group.position).normalize();
          const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
          const alignQuat = new THREE.Quaternion().setFromUnitVectors(shipForward, toTarget);
          const targetQuat = this.group.quaternion.clone().premultiply(alignQuat);
          this.group.quaternion.slerp(targetQuat, Math.min(1, 3.8 * dt));
        }
      } else if (this.sasMode === 'STABILITY' && !pilotActive && this.altitude < (body ? (body.atmosphereHeight || 220) : 220)) {
        // Gentle surface leveling only near ground when hands off controls
        const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
        const levelQuat = new THREE.Quaternion().setFromUnitVectors(shipUp, newUp);
        const slerpTarget = this.group.quaternion.clone().premultiply(levelQuat);
        this.group.quaternion.slerp(slerpTarget, Math.min(1, dt * 1.5));
      }

      this.group.quaternion.normalize();
    } else {
      // While landed, align cleanly to surface normal and allow yaw turn
      const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
      const align = new THREE.Quaternion().setFromUnitVectors(shipUp, newUp);
      this.group.quaternion.premultiply(align);
    }

    const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const shipRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();
    const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();

    // Thrust & Throttle controls
    let thrustForward = input.moveY || 0;
    let thrustRight = (input.moveX || 0) * 0.75;
    let thrustUp = 0;

    const isThrustFwd = (input.isActionDown ? input.isActionDown('flightThrustForward') : false) || input.isDown('KeyW') || input.isDown('ArrowUp');
    const isThrustBwd = (input.isActionDown ? input.isActionDown('flightThrustBackward') : false) || input.isDown('KeyS') || input.isDown('ArrowDown');
    const isStrafeR = (input.isActionDown ? input.isActionDown('flightStrafeRight') : false) || input.isDown('KeyD') || input.isDown('ArrowRight');
    const isStrafeL = (input.isActionDown ? input.isActionDown('flightStrafeLeft') : false) || input.isDown('KeyA') || input.isDown('ArrowLeft');
    const isAscend = (input.isActionDown ? input.isActionDown('flightAscend') : false) || input.isDown('Space');
    const isDescend = (input.isActionDown ? input.isActionDown('flightDescend') : false) || input.isDown('ControlLeft') || input.isDown('KeyC');

    if (this.throttleMode === 'persistent') {
      const isThrottleUp = input.isDown('KeyZ') || (input.isActionDown ? input.isActionDown('flightThrottleUp') : false);
      const isThrottleDown = input.isDown('KeyX') || (input.isActionDown ? input.isActionDown('flightThrottleDown') : false);
      const isThrottleCut = input.wasPressed('Backspace') || (input.wasActionPressed ? input.wasActionPressed('flightThrottleCut') : false);

      if (isThrottleCut) {
        this.throttle = 0.0;
      } else if (isThrottleUp) {
        this.throttle = Math.min(1.0, this.throttle + 0.45 * dt);
      } else if (isThrottleDown) {
        this.throttle = Math.max(0.0, this.throttle - 0.45 * dt);
      }

      if (isThrustFwd) thrustForward = Math.max(this.throttle, 1.0);
      else if (isThrustBwd) thrustForward = -0.7;
      else thrustForward = this.throttle;
    } else {
      if (isThrustFwd) thrustForward += 1;
      if (isThrustBwd) thrustForward -= 0.7;
      this.throttle = isThrustFwd ? 1.0 : (this.isBoosting ? 1.0 : 0.0);
    }

    if (isStrafeR) thrustRight += 0.65;
    if (isStrafeL) thrustRight -= 0.65;
    if (isAscend) thrustUp += 1;
    if (isDescend) thrustUp -= 0.85;

    // Auto-Safe Landing Assist: regulates descent rate and cancels lateral drift below 70m
    if (this.autoLandingAssist && body && this.altitude < 70 && !this.landed && thrustUp <= 0.1) {
      // Dampen horizontal drift over the surface
      const horizVec = this.relativeVelocity.clone().sub(newUp.clone().multiplyScalar(this.vRelVert));
      if (horizVec.length() > 0.1) {
        this.velocity.sub(horizVec.multiplyScalar(Math.min(1, 3.8 * dt)));
      }
      // Regulate descent rate to gentle touchdown (< 4 m/s)
      if (this.vRelVert < -3.8) {
        const brakeAccel = Math.min(65, Math.abs(this.vRelVert - (-3.0)) * 14.0);
        this.velocity.addScaledVector(newUp, brakeAccel * dt);
      }
      // Gently level upright with surface normal
      const shipUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
      const levelQuat = new THREE.Quaternion().setFromUnitVectors(shipUpVector, newUp);
      this.group.quaternion.slerp(this.group.quaternion.clone().premultiply(levelQuat), Math.min(1, 4.0 * dt));
    }

    // Afterburner Boost (Shift, touch BOOST, or flightBoost action)
    const isBoostDown = (input.isActionDown ? input.isActionDown('flightBoost') : false) || input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const wantsBoost = isBoostDown && !this.landed;
    if (wantsBoost && this.boostEnergy > 2) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - 32 * dt);
      thrustForward = Math.max(thrustForward, 1.0); // Full forward afterburner!
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(100, this.boostEnergy + 18 * dt);
    }

    // Coordinated dynamic aerodynamic visual banking into strafe & yaw turns
    const targetBank = THREE.MathUtils.clamp(-thrustRight * 0.45 - (this.angularVelocity.y || 0) * 0.25, -0.65, 0.65);
    this.visualBank = THREE.MathUtils.lerp(this.visualBank, targetBank, Math.min(1, 10 * dt));
    this.visualRoot.rotation.z = this.visualBank;

    if (Math.abs(thrustForward) > 0.1 || Math.abs(thrustRight) > 0.1 || thrustUp > 0.1) {
      if (this.visualRoot.rotation.y !== 0) this.visualRoot.rotation.y = 0;
      if (this.visualRoot.rotation.x !== 0) this.visualRoot.rotation.x = 0;
      if (this.visualRoot.position.z !== 0) this.visualRoot.position.set(0, 0, 0);
    }

    // Takeoff from landed state (inherits body orbital velocity for zero discontinuity)
    if (this.landed && (thrustUp > 0 || thrustForward > 0)) {
      this.landed = false;
      this.landedBody = null;
      this.landedDir = null;
      this.velocity.copy(bVel).addScaledVector(newUp, 22);
    }

    // Hide landing beacon ring when in flight
    if (this.beaconRing) {
      this.beaconRing.visible = this.landed;
    }

    if (!this.landed) {
      const forwardAccel = this.isBoosting ? 180 : 75;
      const verticalAccel = 65;
      const strafeAccel = 45;

      // 1. Apply pilot thruster forces
      this.velocity.addScaledVector(shipForward, thrustForward * forwardAccel * dt);
      this.velocity.addScaledVector(shipUp, thrustUp * verticalAccel * dt);
      this.velocity.addScaledVector(shipRight, thrustRight * strafeAccel * dt);

      // 2. Full Newtonian Gravitational Acceleration (Inverse-square law)
      this.velocity.x += grav.acceleration.x * dt;
      this.velocity.y += grav.acceleration.y * dt;
      this.velocity.z += grav.acceleration.z * dt;

      // 3. SAS CIRCULARIZE ASSIST: computes exact circular velocity v_circ = sqrt(mu/r) and performs delta-v burn
      if (this.sasMode === 'CIRCULARIZE' && body && grav.mu && this.altitude >= (body.atmosphereHeight || 0)) {
        const tangent = shipForward.clone().sub(newUp.clone().multiplyScalar(shipForward.dot(newUp)));
        if (tangent.lengthSq() > 0.001) {
          tangent.normalize();
          const targetSpeed = Math.sqrt(grav.mu / Math.max(1, grav.dist));
          const desiredVel = tangent.multiplyScalar(targetSpeed);
          const diff = desiredVel.clone().sub(this.velocity);
          this.velocity.lerp(desiredVel, Math.min(1, dt * 2.8));

          if (diff.length() < 1.4) {
            this.sasMode = 'STABILITY';
            this.orbitAssist = false;
            if (onNotice) onNotice('ORBIT CIRCULARIZED! SAS switched to STABILITY ASSIST.');
          }
        }
      }

      // 4. Realistic Atmospheric Drag (Aurelia Prime h < 140m)
      const atmoH = (body && !body.isMoon) ? (body.atmosphereHeight || 140) : 0;
      if (atmoH > 0 && this.altitude < atmoH) {
        const atmoDensity = Math.pow(Math.max(0, 1 - this.altitude / atmoH), 2);
        const curSpd = this.velocity.length();
        if (curSpd > 0.05) {
          const dragAccel = 0.0085 * atmoDensity * curSpd * curSpd;
          this.velocity.addScaledVector(this.velocity.clone().normalize(), -Math.min(curSpd, dragAccel * dt));
        }
      }
      // In vacuum space (h > atmoH or near moons): ZERO DRAG (damping = 1.0)! Momentum is strictly conserved!

      this.group.position.addScaledVector(this.velocity, dt);
    } else {
      this.velocity.set(0, 0, 0);
    }

    // Terrain collision & landing check on dominant body with 5-point footprint
    if (body) {
      const bPos = getBodyWorldPos(body);
      const rel = this.group.position.clone().sub(bPos);
      const dist = rel.length() || 1;
      const dir = rel.divideScalar(dist);

      const contact = this._resolveGroundContact(body, dir);
      const surfaceLimit = contact.elevation;

      if (dist <= surfaceLimit + 0.15) {
        this.group.position.copy(bPos).addScaledVector(dir, surfaceLimit);

        const impactSpeed = Math.abs(this.vRelVert) + 0.35 * this.vRelHoriz;
        const shipUpVector = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
        const tiltAngle = Math.acos(THREE.MathUtils.clamp(shipUpVector.dot(contact.groundNormal), -1, 1)) * (180 / Math.PI);

        // Safe landing criteria: relative impact speed <= 16.5 m/s and surface tilt <= 32 deg
        const isSafeLanding = impactSpeed <= 16.5 && tiltAngle <= 32.0;

        if (isSafeLanding && thrustUp <= 0) {
          // Clean Touchdown
          this.landed = true;
          this.landedBody = body;
          this.landedDir = dir.clone();
          this.orbitAssist = false;
          this.sasMode = 'STABILITY';
          this.velocity.set(0, 0, 0);
          this.throttle = 0.0;

          // Align cleanly to footprint ground normal
          const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
          const align = new THREE.Quaternion().setFromUnitVectors(currentUp, contact.groundNormal);
          this.group.quaternion.premultiply(align);
          this.localUp.copy(contact.groundNormal);

          if (this.beaconRing) this.beaconRing.visible = true;

          if (body.isMoon && !this.visitedMoons.has(body.id)) {
            this.visitedMoons.add(body.id);
            if (onNotice) onNotice(`TOUCHDOWN ON ${body.name.toUpperCase()}! (${this.visitedMoons.size}/3 Moons Explored)`);
          } else {
            if (onNotice) onNotice(`Touchdown confirmed on ${body.name}. Safe landing!`);
          }
        } else if (thrustUp <= 0) {
          // Unsafe Touchdown / Hard Impact (reduced damage tolerance)
          const excessSpeed = Math.max(0, impactSpeed - 16.5);
          const tiltDamage = tiltAngle > 32.0 ? Math.round((tiltAngle - 32.0) * 0.35) : 0;
          const speedDamage = Math.round(excessSpeed * 0.65);
          const dmg = Math.min(22, Math.max(3, speedDamage + tiltDamage));

          this.hullIntegrity = Math.max(10, this.hullIntegrity - dmg);
          this.velocity.reflect(contact.groundNormal).multiplyScalar(0.38);

          const reason = impactSpeed > 16.5 ? `Too Fast (${Math.round(impactSpeed)} m/s)` : `Excessive Tilt (${Math.round(tiltAngle)}°)`;
          if (onNotice) onNotice(`Hard Impact: ${reason}! Hull -${dmg}% (Integrity: ${this.hullIntegrity}%). Gather minerals to repair.`);
        }
      }
    }

    this.speed = this.velocity.length();

    // Calculate real-time Keplerian orbital telemetry
    this.orbitalData = this.calculateOrbitParameters(body, grav);

    // Animate rear 3-crystal propulsion exhaust flames with dynamic pulsing boost
    const thrustActive = !this.landed && (Math.abs(thrustForward) > 0.05 || thrustUp > 0.05 || this.isBoosting || this.sasMode === 'CIRCULARIZE');
    const tNow = performance.now();
    for (let i = 0; i < this.engineFlames.length; i++) {
      const flame = this.engineFlames[i];
      flame.visible = thrustActive;
      if (thrustActive) {
        let flameScale = 1.0;
        let flameWidth = 1.0;
        if (this.isBoosting) {
          flameScale = 2.45 + Math.sin(tNow * 0.055 + i * 1.9) * 0.42 + Math.cos(tNow * 0.09) * 0.18;
          flameWidth = 1.35 + Math.sin(tNow * 0.04 + i) * 0.18;
        } else {
          flameScale = 1.0 + Math.sin(tNow * 0.035 + i * 1.8) * 0.18;
          flameWidth = 1.0;
        }
        flame.scale.set(flameWidth, flameWidth, flameScale);
      }
    }
    this.flameMat.color.setHex(this.isBoosting ? 0xff9f1c : 0x00f5d4);

    // Animate directional RCS thrusters (ventral lift, dorsal descent, port/starboard strafe)
    if (this.rcsFlames) {
      const rcsAscend = !this.landed && thrustUp > 0.05;
      const rcsDescend = !this.landed && thrustUp < -0.05;
      const rcsStrafeRight = !this.landed && thrustRight > 0.05;
      const rcsStrafeLeft = !this.landed && thrustRight < -0.05;

      for (let i = 0; i < this.rcsFlames.ventral.length; i++) {
        const f = this.rcsFlames.ventral[i];
        f.visible = rcsAscend;
        if (rcsAscend) {
          const s = 0.85 + Math.sin(tNow * 0.05 + i * 1.2) * 0.25;
          f.scale.set(s, s * (1.0 + thrustUp * 0.4), s);
        }
      }
      for (let i = 0; i < this.rcsFlames.dorsal.length; i++) {
        const f = this.rcsFlames.dorsal[i];
        f.visible = rcsDescend;
        if (rcsDescend) {
          const s = 0.85 + Math.sin(tNow * 0.05 + i * 1.2) * 0.25;
          f.scale.set(s, s * (1.0 + Math.abs(thrustUp) * 0.4), s);
        }
      }
      for (let i = 0; i < this.rcsFlames.port.length; i++) {
        const f = this.rcsFlames.port[i];
        f.visible = rcsStrafeRight;
        if (rcsStrafeRight) {
          const s = 0.85 + Math.sin(tNow * 0.05 + i * 1.2) * 0.25;
          f.scale.set(s, s * (1.0 + thrustRight * 0.4), s);
        }
      }
      for (let i = 0; i < this.rcsFlames.starboard.length; i++) {
        const f = this.rcsFlames.starboard[i];
        f.visible = rcsStrafeLeft;
        if (rcsStrafeLeft) {
          const s = 0.85 + Math.sin(tNow * 0.05 + i * 1.2) * 0.25;
          f.scale.set(s, s * (1.0 + Math.abs(thrustRight) * 0.4), s);
        }
      }
    }

    // Animate floating outrigger canard fins with hover bob
    if (this.floatingFins && this.floatingFins.length === 2) {
      const bob = performance.now() * 0.0035;
      this.floatingFins[0].position.y = 1.3 + Math.sin(bob) * 0.045;
      this.floatingFins[1].position.y = 1.3 + Math.cos(bob) * 0.045;
    }

    // Recover chin gun pod recoil kick & muzzle flash timer
    if (this.chinGunPod) {
      this.chinGunPod.position.z = THREE.MathUtils.lerp(this.chinGunPod.position.z, this.chinPodBaseZ, Math.min(1, 14 * dt));
    }
    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0 && this.muzzleFlash) {
        this.muzzleFlash.visible = false;
      }
    }

    // Update Flight Phase label based on Keplerian orbital trajectory
    if (this.landed) {
      this.flightPhase = body && body.isMoon ? `LANDED (${body.name})` : 'SURFACE (LANDED)';
    } else if (body && body.isMoon && this.altitude < 90) {
      this.flightPhase = `MOON APPROACH (${body.name})`;
    } else if (this.orbitalData) {
      if (this.orbitalData.isOrbiting) {
        this.flightPhase = `${this.orbitalData.trajectory} (Ap:${this.orbitalData.ap}m Pe:${this.orbitalData.pe}m)`;
      } else {
        this.flightPhase = `${this.orbitalData.trajectory} (v:${Math.round(this.speed)} m/s)`;
      }
    } else {
      this.flightPhase = 'DEEP SPACE / NEWTONIAN COAST';
    }
  }
}
