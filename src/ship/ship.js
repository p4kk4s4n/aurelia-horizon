import * as THREE from 'three';
import { evaluateGravity } from '../world/gravity.js';

/**
 * Sci-Fi Starfighter matching concept model sheet (SPPSHIP MODEL SHEET):
 * - Faceted off-white upper lifting-body wedge (#d8dad3)
 * - Dark slate perimeter chine & ventral boat-tail hull (#242e36) with twin ventral fins
 * - Elongated dark stealth cockpit canopy with beveled glass facets
 * - Flared shoulders with dual hovering outrigger canard fins (upper & lower stabilizers)
 * - Recessed spine power channel with cyan glowing conduits leading to 3 hexagonal crystal drives
 * - Underslung starboard chin gun turret pod with dual cyan optic sensors & twin pulse barrels
 * - 6DoF axial roll (Q/E keyboard, tactile mobile touch buttons) + dynamic aerodynamic banking into turns
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
    this.orbitAssist = false;
    this.autoLevel = true;

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
    // Beveled faceted wedge tapering to nose
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
    // Center windshield & roof
    const canopyGeo = new THREE.BoxGeometry(1.22, 0.64, 2.8);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(0, 1.76, -1.6);
    this.visualRoot.add(canopy);

    // Slanted forward canopy facet
    const canopySlantGeo = new THREE.ConeGeometry(0.85, 2.0, 4);
    canopySlantGeo.rotateX(-Math.PI / 2);
    canopySlantGeo.rotateZ(Math.PI / 4);
    canopySlantGeo.scale(1.18, 0.48, 1.0);
    const canopySlant = new THREE.Mesh(canopySlantGeo, canopyMat);
    canopySlant.position.set(0, 1.62, -3.2);
    this.visualRoot.add(canopySlant);

    // Dark canopy frame border & roof ridge
    const canopyRidgeGeo = new THREE.BoxGeometry(0.2, 0.12, 3.2);
    const canopyRidge = new THREE.Mesh(canopyRidgeGeo, darkMat);
    canopyRidge.position.set(0, 2.1, -1.8);
    this.visualRoot.add(canopyRidge);

    // 3. RECESSED SPINE POWER CHANNEL & REAR 3-CRYSTAL PROPULSION ARRAY
    // Recessed dark well along spine (Z = 0.6 to 3.8)
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

    thrusterLayout.forEach((pos, idx) => {
      // Dark propulsion collar ring
      const collarGeo = new THREE.CylinderGeometry(0.48, 0.58, 0.65, 8);
      collarGeo.rotateX(Math.PI / 2);
      const collar = new THREE.Mesh(collarGeo, darkMat);
      collar.position.set(pos.x, pos.y, pos.z - 0.2);
      this.visualRoot.add(collar);

      // Hexagonal Crystal Bipyramid
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

    // Backwards-compatible flame handles
    this.leftFlame = this.engineFlames[1];
    this.rightFlame = this.engineFlames[2];

    // 4. FLOATING OUTRIGGER CANARD FINS
    // Concept design features detached floating fins on left and right flanks
    this.floatingFins = [];

    const createFloatingFinPair = (side) => {
      const finGroup = new THREE.Group();
      finGroup.position.set(side * 3.45, 1.3, 1.2);

      // Upper stabilizer fin (angled outward/upward ~32°)
      const upperBladeGeo = new THREE.BoxGeometry(0.12, 0.65, 2.5);
      const upperBlade = new THREE.Mesh(upperBladeGeo, armorMat);
      upperBlade.position.set(side * 0.2, 0.28, 0);
      upperBlade.rotation.z = side * -0.36;
      upperBlade.rotation.y = side * -0.08;
      finGroup.add(upperBlade);

      // Lower stabilizer fin (angled outward/downward ~28°)
      const lowerBladeGeo = new THREE.BoxGeometry(0.1, 0.48, 1.8);
      const lowerBlade = new THREE.Mesh(lowerBladeGeo, darkMat);
      lowerBlade.position.set(side * 0.15, -0.42, 0.2);
      lowerBlade.rotation.z = side * 0.32;
      finGroup.add(lowerBlade);

      // Floating cyan hover energy nodes between hull and fins
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
    // Forward-mounted turret pod with dual cyan optics and twin barrels under starboard chin
    this.chinGunPod = new THREE.Group();
    this.chinGunPod.position.set(0.72, 0.45, this.chinPodBaseZ);

    // Streamlined pod housing
    const podBodyGeo = new THREE.BoxGeometry(0.68, 0.46, 2.2);
    const podBody = new THREE.Mesh(podBodyGeo, gunMetalMat);
    this.chinGunPod.add(podBody);

    // Front beveled optic sensor face
    const opticFaceGeo = new THREE.ConeGeometry(0.36, 0.6, 4);
    opticFaceGeo.rotateX(-Math.PI / 2);
    const opticFace = new THREE.Mesh(opticFaceGeo, darkMat);
    opticFace.position.set(0, 0, -1.2);
    this.chinGunPod.add(opticFace);

    // Dual Glowing Cyan Optic Sensor Eyes (as highlighted in concept sheet front view)
    const opticLensGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.1, 8);
    opticLensGeo.rotateX(Math.PI / 2);
    const leftOptic = new THREE.Mesh(opticLensGeo, opticMat);
    leftOptic.position.set(-0.14, 0.08, -1.38);
    const rightOptic = new THREE.Mesh(opticLensGeo, opticMat);
    rightOptic.position.set(0.14, 0.08, -1.38);
    this.chinGunPod.add(leftOptic, rightOptic);

    // Twin Projecting Pulse Cannon Barrels
    this.gunBarrels = [];
    const barrelGeo = new THREE.CylinderGeometry(0.075, 0.075, 1.8, 8);
    barrelGeo.rotateX(Math.PI / 2);

    const barrelOffset = 0.15;
    for (const bOffset of [-barrelOffset, barrelOffset]) {
      const barrel = new THREE.Mesh(barrelGeo, gunMetalMat);
      barrel.position.set(bOffset, -0.06, -1.65);
      this.chinGunPod.add(barrel);
      this.gunBarrels.push(barrel);

      // Glowing emitter optic tip
      const tipGeo = new THREE.CylinderGeometry(0.078, 0.078, 0.12, 8);
      tipGeo.rotateX(Math.PI / 2);
      const tip = new THREE.Mesh(tipGeo, opticMat);
      tip.position.set(bOffset, -0.06, -2.55);
      this.chinGunPod.add(tip);
    }

    // Muzzle Flash Burst Mesh
    const flashGeo = new THREE.OctahedronGeometry(0.42, 0);
    const flashMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, wireframe: true });
    this.muzzleFlash = new THREE.Mesh(flashGeo, flashMat);
    this.muzzleFlash.position.set(0, -0.06, -2.7);
    this.muzzleFlash.visible = false;
    this.chinGunPod.add(this.muzzleFlash);

    this.visualRoot.add(this.chinGunPod);

    // 6. LANDING BEACON RING (Docked state indicator)
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

  placeOnBody(body, dirVector = new THREE.Vector3(0.03, 0.998, 0.05)) {
    const dir = dirVector.clone().normalize();
    const surfaceR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
    const bPos = body.getWorldPosition();
    this.group.position.copy(bPos).addScaledVector(dir, surfaceR + 0.35);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.group.quaternion.copy(alignQuat);
    this.localUp.copy(dir);
    this.velocity.set(0, 0, 0);
    this.landed = true;
    this.currentBody = body;
    if (this.beaconRing) this.beaconRing.visible = true;
  }

  fireCannons() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = 0.13;
    this.weaponHeat = Math.min(100, this.weaponHeat + 7);

    // Trigger chin pod recoil kick and muzzle flash
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

    // Spawn twin plasma bolts directly from the two barrels of the underslung starboard chin turret pod
    const barrelOffsets = [-0.15, 0.15];
    const podX = 0.72;
    const podY = 0.45;
    const muzzleZ = -5.65; // Chin pod position + barrel projection

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

  updateProjectilesAndTargets(dt, spaceTargets) {
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.weaponHeat > 0) this.weaponHeat = Math.max(0, this.weaponHeat - 28 * dt);

    // Update orbital asteroids & drones
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

    // Update plasma bolts & hit detection
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

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Animate explosion bursts
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

    // Move with orbiting moon when within its SOI
    if (body && body.isMoon && body.deltaPosition && this.altitude < body.soiRadius) {
      this.group.position.add(body.deltaPosition);
    }

    // Toggle Orbit Assist (O)
    if (input.wasPressed('KeyO')) {
      this.orbitAssist = !this.orbitAssist;
      if (onNotice) {
        onNotice(this.orbitAssist ? 'Arcade Orbit-Assist ENGAGED' : 'Arcade Orbit-Assist OFF');
      }
    }

    // Weapons fire (Left Mouse or F)
    if (input.mouseDown || input.isDown('KeyF')) {
      this.fireCannons();
    }

    // Rotation controls:
    // Pitch & Yaw via Mouse, Stick, and Arrow Keys
    const stickPitch = (input.lookVelY || 0) * 1.8 * dt;
    const stickYaw = (input.lookVelX || 0) * 2.2 * dt;
    const pitchInput = -mouseFrame.dy * 0.0028 - stickPitch + ((input.isDown('ArrowDown') ? 1 : 0) - (input.isDown('ArrowUp') ? 1 : 0)) * 1.4 * dt;
    const yawInput = -mouseFrame.dx * 0.0028 - stickYaw + ((input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0)) * 1.4 * dt;

    // 6DoF Axial Roll:
    // Q: roll left (+Z) | E: roll right (-Z) when airborne/in space | rollRate: mobile touch buttons / analog triggers
    let rollDir = 0;
    if (input.isDown('KeyQ')) rollDir += 1;
    if (!this.landed && (this.altitude >= 16 || !this.currentBody) && input.isDown('KeyE')) rollDir -= 1;
    if (input.rollRate) rollDir -= input.rollRate;

    const rollSpeed = 2.5;
    const rollDelta = rollDir * rollSpeed * dt;

    if (!this.landed) {
      const rotDelta = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitchInput, yawInput, rollDelta, 'YXZ')
      );
      this.group.quaternion.multiply(rotDelta);

      // Decoupled horizon auto-level:
      // Only gently levels when pilot is NOT actively performing rolls, pitches, or yaws
      const pilotActive = Math.abs(rollDir) > 0.05 || Math.abs(yawInput) > 0.02 || Math.abs(pitchInput) > 0.02;
      if ((this.altitude < 180 || this.orbitAssist) && !pilotActive) {
        const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
        const levelQuat = new THREE.Quaternion().setFromUnitVectors(shipUp, newUp);
        const slerpTarget = this.group.quaternion.clone().premultiply(levelQuat);
        this.group.quaternion.slerp(slerpTarget, Math.min(1, dt * (this.orbitAssist ? 3.5 : 1.4)));
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

    // Thrust controls
    let thrustForward = input.moveY || 0;
    let thrustRight = (input.moveX || 0) * 0.75;
    let thrustUp = 0;

    if (input.isDown('KeyW')) thrustForward += 1;
    if (input.isDown('KeyS')) thrustForward -= 0.7;
    if (input.isDown('KeyD')) thrustRight += 0.65;
    if (input.isDown('KeyA')) thrustRight -= 0.65;
    if (input.isDown('Space')) thrustUp += 1;
    if (input.isDown('ControlLeft') || input.isDown('KeyC')) thrustUp -= 0.85;

    // Coordinated dynamic aerodynamic visual banking into strafe & yaw turns
    const targetBank = THREE.MathUtils.clamp(-thrustRight * 0.45 - yawInput * 6.5, -0.65, 0.65);
    this.visualBank = THREE.MathUtils.lerp(this.visualBank, targetBank, Math.min(1, 10 * dt));
    this.visualRoot.rotation.z = this.visualBank;

    if (Math.abs(thrustForward) > 0.1 || Math.abs(thrustRight) > 0.1 || thrustUp > 0.1) {
      if (this.visualRoot.rotation.y !== 0) this.visualRoot.rotation.y = 0;
      if (this.visualRoot.rotation.x !== 0) this.visualRoot.rotation.x = 0;
      if (this.visualRoot.position.z !== 0) this.visualRoot.position.set(0, 0, 0);
    }

    // Takeoff from landed state
    if (this.landed && (thrustUp > 0 || thrustForward > 0)) {
      this.landed = false;
      this.velocity.addScaledVector(newUp, 22);
    }

    // Hide landing beacon ring when in flight
    if (this.beaconRing) {
      this.beaconRing.visible = this.landed;
    }

    // Afterburner Boost (Shift)
    const wantsBoost = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && !this.landed && (thrustForward > 0.1 || input.isDown('KeyW'));
    if (wantsBoost && this.boostEnergy > 2) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - 28 * dt);
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(100, this.boostEnergy + 18 * dt);
    }

    if (!this.landed) {
      const forwardAccel = this.isBoosting ? 240 : 105;
      const verticalAccel = 82;
      const strafeAccel = 55;

      this.velocity.addScaledVector(shipForward, thrustForward * forwardAccel * dt);
      this.velocity.addScaledVector(shipUp, thrustUp * verticalAccel * dt);
      this.velocity.addScaledVector(shipRight, thrustRight * strafeAccel * dt);

      if (this.orbitAssist && body) {
        // Arcade Orbit Assist: hold altitude and cruise tangentially around the body
        const tangent = shipForward.clone().sub(newUp.clone().multiplyScalar(shipForward.dot(newUp)));
        if (tangent.lengthSq() > 0.001) {
          tangent.normalize();
          const orbitSpeed = this.isBoosting ? 185 : 95;
          const desiredVel = tangent.multiplyScalar(orbitSpeed);
          this.velocity.lerp(desiredVel, Math.min(1, dt * 3.5));
        }
      } else {
        // Apply reduced arcade gravity so hovering & orbital injection feel responsive
        const gravScale = this.altitude > 140 ? 0.35 : 0.65;
        this.velocity.x += grav.acceleration.x * gravScale * dt;
        this.velocity.y += grav.acceleration.y * gravScale * dt;
        this.velocity.z += grav.acceleration.z * gravScale * dt;

        // Arcade space damping for tight control
        const damping = Math.exp(-0.55 * dt);
        this.velocity.multiplyScalar(damping);
      }

      this.group.position.addScaledVector(this.velocity, dt);
    } else {
      this.velocity.set(0, 0, 0);
    }

    // Terrain collision & landing check on dominant body
    if (body) {
      const bPos = body.getWorldPosition();
      const rel = this.group.position.clone().sub(bPos);
      const dist = rel.length() || 1;
      const dir = rel.divideScalar(dist);
      const terrainR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
      const surfaceLimit = Math.max(terrainR, body.seaLevelRadius || 0) + 0.4;

      if (dist <= surfaceLimit) {
        const impactSpeed = Math.abs(this.velocity.dot(dir));
        this.group.position.copy(bPos).addScaledVector(dir, surfaceLimit);

        if (impactSpeed > 95) {
          // Hard landing: shield absorbs impact, ship bounces slightly
          this.hullIntegrity = Math.max(20, this.hullIntegrity - 25);
          this.velocity.reflect(dir).multiplyScalar(0.35);
          if (onNotice) onNotice(`Hard Impact (${Math.round(impactSpeed)} m/s)! Slow down below 95 m/s to land.`);
        } else if (thrustUp <= 0) {
          // Successful touchdown!
          this.landed = true;
          this.orbitAssist = false;
          this.velocity.set(0, 0, 0);
          this.hullIntegrity = 100;
          const align = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize(),
            dir
          );
          this.group.quaternion.premultiply(align);
          if (this.beaconRing) this.beaconRing.visible = true;

          if (body.isMoon && !this.visitedMoons.has(body.id)) {
            this.visitedMoons.add(body.id);
            if (onNotice) onNotice(`LANDED ON ${body.name.toUpperCase()}! (${this.visitedMoons.size}/3 Moons Explored)`);
          }
        }
      }
    }

    this.speed = this.velocity.length();

    // Animate rear 3-crystal propulsion exhaust flames
    const thrustActive = !this.landed && (Math.abs(thrustForward) > 0.05 || thrustUp > 0.05 || this.isBoosting || this.orbitAssist);
    for (let i = 0; i < this.engineFlames.length; i++) {
      const flame = this.engineFlames[i];
      flame.visible = thrustActive;
      if (thrustActive) {
        const flameScale = this.isBoosting ? 2.4 : 1.0 + Math.sin(performance.now() * 0.035 + i * 1.8) * 0.18;
        flame.scale.set(1, 1, flameScale);
      }
    }
    this.flameMat.color.setHex(this.isBoosting ? 0xff9f1c : 0x00f5d4);

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

    // Update Flight Phase label
    if (this.landed) {
      this.flightPhase = body && body.isMoon ? `LANDED (${body.name})` : 'SURFACE (LANDED)';
    } else if (body && body.isMoon && this.altitude < 90) {
      this.flightPhase = `MOON APPROACH (${body.name})`;
    } else if (body && !body.isMoon && this.altitude < body.atmosphereHeight) {
      this.flightPhase = 'ATMOSPHERE FLIGHT';
    } else if (this.orbitAssist) {
      this.flightPhase = `STABLE ORBIT (${body ? body.name : 'SPACE'})`;
    } else {
      this.flightPhase = 'DEEP SPACE / ORBITAL TRANSFER';
    }
  }
}
