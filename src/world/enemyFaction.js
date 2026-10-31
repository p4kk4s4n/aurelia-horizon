import * as THREE from 'three';

/**
 * Enemy Faction — Crimson Hive & Goliath Finned Pod Fleet
 * 
 * 1. EnemyPodShip: Fast finned spherical/ovoid pods defending Moon III: Goliath ONLY.
 * 2. EnemyOutpostBase: Fortified crater-crystal planetary outpost on Aurelia Prime.
 *    - Always located on high dry land (never over water).
 *    - Full walkable floor elevation (lower plaza, stairs, upper terrace).
 *    - Solid 3D obstacle collision (central power crystal, rock spires, energy conduits, cliff walls).
 * 3. BugAlienTrooper: Chitin wasp/hornet warriors guarding the outpost with:
 *    - Faceted dark-violet chitin, compound eyes, pincer mandibles, curved antennae.
 *    - 4 translucent insectoid wings, 4-ringed segmented wasp gaster.
 *    - 4 arms: right clawed arm, lower secondary arms, and left Crystal Shard Cannon.
 *    - 2 reverse-jointed digitigrade legs with stalking stride and wing-buzz hover-lunges.
 *    - Line-of-sight aiming, crystal core charging, and recoil animation.
 */

// Materials for Crimson Hive & Bug Aliens
const darkChitinMat = new THREE.MeshStandardMaterial({
  color: 0x1a1224,
  roughness: 0.52,
  metalness: 0.62,
  flatShading: true
});

const violetCarapaceMat = new THREE.MeshStandardMaterial({
  color: 0x34234c,
  roughness: 0.40,
  metalness: 0.55,
  flatShading: true
});

const redArmorMat = new THREE.MeshStandardMaterial({
  color: 0x7a112c,
  roughness: 0.38,
  metalness: 0.52,
  flatShading: true
});

const darkSpireRockMat = new THREE.MeshStandardMaterial({
  color: 0x1f162c,
  roughness: 0.82,
  metalness: 0.25,
  flatShading: true
});

const obsidianTrimMat = new THREE.MeshStandardMaterial({
  color: 0x130e1a,
  roughness: 0.48,
  metalness: 0.58,
  flatShading: true
});

const cyanCrystalMat = new THREE.MeshStandardMaterial({
  color: 0x00f5d4,
  emissive: 0x00b4d8,
  emissiveIntensity: 1.15,
  roughness: 0.18,
  metalness: 0.3,
  flatShading: true
});

const magentaCrystalMat = new THREE.MeshStandardMaterial({
  color: 0xe024ff,
  emissive: 0x9b1de8,
  emissiveIntensity: 1.35,
  roughness: 0.22,
  metalness: 0.35,
  flatShading: true
});

const amberCrystalMat = new THREE.MeshStandardMaterial({
  color: 0xff9f1c,
  emissive: 0xf77f00,
  emissiveIntensity: 1.25,
  roughness: 0.25,
  flatShading: true
});

const wingMat = new THREE.MeshStandardMaterial({
  color: 0xbdb5cc,
  transparent: true,
  opacity: 0.52,
  roughness: 0.32,
  metalness: 0.12,
  side: THREE.DoubleSide,
  depthWrite: false
});

const crimsonGlowMat = new THREE.MeshBasicMaterial({
  color: 0xff1e46
});

const cyanConduitMat = new THREE.MeshBasicMaterial({
  color: 0x00f5d4
});

const magentaGlowMat = new THREE.MeshBasicMaterial({
  color: 0xff1eff
});

const amberEyeMat = new THREE.MeshBasicMaterial({
  color: 0xffa01c
});

/**
 * Finned Pod Interceptor — Patrols only Moon III: Goliath
 */
export class EnemyPodShip {
  constructor(id, moon, orbitRadius, orbitAngle, orbitSpeed, yOffset) {
    this.id = id;
    this.moon = moon;
    this.orbitRadius = orbitRadius;
    this.orbitAngle = orbitAngle;
    this.orbitSpeed = orbitSpeed;
    this.yOffset = yOffset;

    this.maxHp = 60;
    this.hp = this.maxHp;
    this.dead = false;
    this.respawnTimer = 0;
    this.fireCooldown = Math.random() * 2.0;

    this.group = new THREE.Group();
    this.hitRadius = 2.4;
    this._buildMesh();
    this.update(0, null, null);
  }

  _buildMesh() {
    // 1. Central Ovoid Cockpit Pod
    const podGeo = new THREE.SphereGeometry(1.4, 12, 10);
    podGeo.scale(1.0, 0.85, 1.35);
    const podMesh = new THREE.Mesh(podGeo, redArmorMat);
    this.group.add(podMesh);

    // Dark underbelly armor plate
    const bellyGeo = new THREE.SphereGeometry(1.25, 10, 8);
    bellyGeo.scale(0.9, 0.45, 1.2);
    const bellyMesh = new THREE.Mesh(bellyGeo, darkChitinMat);
    bellyMesh.position.set(0, -0.45, 0);
    this.group.add(bellyMesh);

    // Glowing Crimson Ocular Visor Slit in front
    const visorGeo = new THREE.BoxGeometry(0.95, 0.22, 0.45);
    const visorMesh = new THREE.Mesh(visorGeo, crimsonGlowMat);
    visorMesh.position.set(0, 0.12, -1.25);
    this.group.add(visorMesh);

    // Monocle targeting eye
    const eyeGeo = new THREE.SphereGeometry(0.16, 8, 8);
    const eyeMesh = new THREE.Mesh(eyeGeo, amberEyeMat);
    eyeMesh.position.set(0, 0.12, -1.4);
    this.group.add(eyeMesh);

    // 2. Three Swept Aerodynamic / Ion Fins
    const dorsalFinGeo = new THREE.BoxGeometry(0.12, 1.1, 1.8);
    dorsalFinGeo.rotateX(Math.PI * 0.18);
    const dorsalFin = new THREE.Mesh(dorsalFinGeo, darkChitinMat);
    dorsalFin.position.set(0, 1.15, 0.35);
    this.group.add(dorsalFin);

    const dorsalGlowGeo = new THREE.BoxGeometry(0.14, 0.18, 1.4);
    dorsalGlowGeo.rotateX(Math.PI * 0.18);
    const dorsalGlow = new THREE.Mesh(dorsalGlowGeo, crimsonGlowMat);
    dorsalGlow.position.set(0, 1.35, 0.4);
    this.group.add(dorsalGlow);

    const portFinGeo = new THREE.BoxGeometry(1.5, 0.12, 1.6);
    portFinGeo.rotateZ(Math.PI * 0.12);
    portFinGeo.rotateY(Math.PI * 0.15);
    const portFin = new THREE.Mesh(portFinGeo, darkChitinMat);
    portFin.position.set(-1.45, -0.15, 0.25);
    this.group.add(portFin);

    const stbdFinGeo = new THREE.BoxGeometry(1.5, 0.12, 1.6);
    stbdFinGeo.rotateZ(-Math.PI * 0.12);
    stbdFinGeo.rotateY(-Math.PI * 0.15);
    const stbdFin = new THREE.Mesh(stbdFinGeo, darkChitinMat);
    stbdFin.position.set(1.45, -0.15, 0.25);
    this.group.add(stbdFin);

    // Twin Blaster Cannons under side fins
    const cannonGeo = new THREE.CylinderGeometry(0.08, 0.08, 1.2, 6);
    cannonGeo.rotateX(Math.PI / 2);
    const leftCannon = new THREE.Mesh(cannonGeo, darkChitinMat);
    leftCannon.position.set(-0.85, -0.32, -0.9);
    const rightCannon = new THREE.Mesh(cannonGeo, darkChitinMat);
    rightCannon.position.set(0.85, -0.32, -0.9);
    this.group.add(leftCannon, rightCannon);

    // Rear Propulsion Exhaust Thruster
    const nozzleGeo = new THREE.CylinderGeometry(0.38, 0.48, 0.5, 8);
    nozzleGeo.rotateX(Math.PI / 2);
    const nozzle = new THREE.Mesh(nozzleGeo, darkChitinMat);
    nozzle.position.set(0, 0, 1.35);
    this.group.add(nozzle);

    const flameGeo = new THREE.ConeGeometry(0.35, 2.2, 8);
    flameGeo.rotateX(Math.PI / 2);
    this.thrusterFlame = new THREE.Mesh(flameGeo, crimsonGlowMat);
    this.thrusterFlame.position.set(0, 0, 2.45);
    this.group.add(this.thrusterFlame);
  }

  update(dt, playerShipPos, onFireBolt) {
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.hp = this.maxHp;
        this.group.visible = true;
      }
      return;
    }

    const moonPos = this.moon.getWorldPosition();
    this.orbitAngle += this.orbitSpeed * dt;

    const baseLocalX = Math.cos(this.orbitAngle) * this.orbitRadius;
    const baseLocalZ = Math.sin(this.orbitAngle) * this.orbitRadius;
    const currentWorldPos = new THREE.Vector3(
      moonPos.x + baseLocalX,
      moonPos.y + this.yOffset + Math.sin(this.orbitAngle * 2.2) * 8.0,
      moonPos.z + baseLocalZ
    );

    if (this.thrusterFlame) {
      const s = 0.9 + Math.sin(performance.now() * 0.04 + this.orbitRadius) * 0.25;
      this.thrusterFlame.scale.set(s, s, s * 1.3);
    }

    if (playerShipPos) {
      const distToPlayer = currentWorldPos.distanceTo(playerShipPos);
      const distToGoliath = playerShipPos.distanceTo(moonPos);

      if (distToGoliath < (this.moon.soiRadius || 960) && distToPlayer < 550) {
        const aimDir = playerShipPos.clone().sub(currentWorldPos).normalize();
        const lookTarget = currentWorldPos.clone().add(aimDir);
        this.group.lookAt(lookTarget);

        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0 && distToPlayer < 380) {
          this.fireCooldown = 1.8 + Math.random() * 0.8;
          if (onFireBolt) {
            onFireBolt(currentWorldPos.clone(), aimDir.clone(), 65.0, 4);
          }
        }
      } else {
        const fwdDir = new THREE.Vector3(-Math.sin(this.orbitAngle), 0, Math.cos(this.orbitAngle)).normalize();
        this.group.lookAt(currentWorldPos.clone().add(fwdDir));
      }
    }

    this.group.position.copy(currentWorldPos);
  }

  takeDamage(amount) {
    if (this.dead) return { hit: false, defeated: false };
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 45.0;
      this.group.visible = false;
      return { hit: true, defeated: true };
    }
    return { hit: true, defeated: false };
  }
}

/**
 * BugAlienTrooper — Bipedal Wasp-Warrior guarding the planetary outpost
 * Matching turnaround character sheet:
 * - Faceted dark-violet/obsidian chitin armor, compound eyes, pincer mandibles, curved antennae.
 * - Broad V-taper thorax, narrow petiole waist, 4-ringed segmented wasp gaster.
 * - 4 translucent insectoid wings with high-frequency buzz kinematics.
 * - 4 arms: right clawed arm, 2 lower secondary arms, left Crystal Shard Cannon.
 * - 2 digitigrade reverse-jointed legs with stalking stride and hover-lunges.
 */
export class BugAlienTrooper {
  constructor(id, planet, baseDir, patrolOffsetAngle, patrolRadius) {
    this.id = id;
    this.planet = planet;
    this.baseDir = baseDir.clone().normalize();
    this.patrolOffsetAngle = patrolOffsetAngle;
    this.patrolRadius = patrolRadius;

    this.maxHp = 75;
    this.hp = this.maxHp;
    this.dead = false;
    this.respawnTimer = 0;
    this.fireCooldown = 0.5 + Math.random() * 1.2;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.hitRadius = 1.6;

    // Kinematic & animation states
    this.recoilOffset = 0.0;
    this.hoverProgress = 0.0;
    this.hoverTimer = 3.0 + Math.random() * 3.0;
    this.isHovering = false;

    this.group = new THREE.Group();
    this._buildMesh();
    this.update(0, null, null);
  }

  _buildMesh() {
    // Root Torso at pelvis height (1.4m)
    this.torso = new THREE.Group();
    this.torso.position.y = 1.4;
    this.group.add(this.torso);

    // 1. Thorax: V-Tapered Chitin Pectoral & Dorsal Carapace
    const thoraxGeo = new THREE.CylinderGeometry(0.38, 0.24, 0.75, 6);
    const thoraxMesh = new THREE.Mesh(thoraxGeo, violetCarapaceMat);
    thoraxMesh.position.y = 0.22;
    this.torso.add(thoraxMesh);

    // Dorsal Carapace Crest & Shoulder Pauldrons
    const crestGeo = new THREE.ConeGeometry(0.42, 0.82, 5);
    crestGeo.rotateX(Math.PI * 0.32);
    const crestMesh = new THREE.Mesh(crestGeo, darkChitinMat);
    crestMesh.position.set(0, 0.42, 0.18);
    this.torso.add(crestMesh);

    // Narrow Wasp-Waist (Petiole)
    const petioleGeo = new THREE.CylinderGeometry(0.14, 0.16, 0.25, 6);
    const petioleMesh = new THREE.Mesh(petioleGeo, obsidianTrimMat);
    petioleMesh.position.y = -0.22;
    this.torso.add(petioleMesh);

    // 2. Segmented Wasp Abdomen (Gaster) — 4 Distinct Rings with Stinger
    this.abdomenGroup = new THREE.Group();
    this.abdomenGroup.position.set(0, -0.32, 0.12);
    this.torso.add(this.abdomenGroup);

    // Ring 1 (Base connector)
    const ring1Geo = new THREE.CylinderGeometry(0.18, 0.32, 0.3, 6);
    const ring1Mesh = new THREE.Mesh(ring1Geo, darkChitinMat);
    ring1Mesh.position.set(0, -0.12, 0.12);
    ring1Mesh.rotation.x = 0.35;
    this.abdomenGroup.add(ring1Mesh);

    // Ring 2 (Widest dorsal plate)
    const ring2Geo = new THREE.CylinderGeometry(0.34, 0.44, 0.42, 6);
    const ring2Mesh = new THREE.Mesh(ring2Geo, violetCarapaceMat);
    ring2Mesh.position.set(0, -0.36, 0.28);
    ring2Mesh.rotation.x = 0.52;
    this.abdomenGroup.add(ring2Mesh);

    // Ring 3 (Tapering segment)
    const ring3Geo = new THREE.CylinderGeometry(0.42, 0.30, 0.45, 6);
    const ring3Mesh = new THREE.Mesh(ring3Geo, darkChitinMat);
    ring3Mesh.position.set(0, -0.66, 0.46);
    ring3Mesh.rotation.x = 0.72;
    this.abdomenGroup.add(ring3Mesh);

    // Ring 4 / Stinger Apex
    const stingerGeo = new THREE.ConeGeometry(0.28, 0.55, 6);
    stingerGeo.rotateX(Math.PI * 0.78);
    const stingerMesh = new THREE.Mesh(stingerGeo, obsidianTrimMat);
    stingerMesh.position.set(0, -0.96, 0.62);
    this.abdomenGroup.add(stingerMesh);

    // 3. Head & Sensory Organs
    this.headGroup = new THREE.Group();
    this.headGroup.position.set(0, 0.68, -0.15);
    this.torso.add(this.headGroup);

    // Angular faceted head capsule
    const headCapsuleGeo = new THREE.ConeGeometry(0.32, 0.55, 6);
    headCapsuleGeo.rotateX(-Math.PI * 0.42);
    const headMesh = new THREE.Mesh(headCapsuleGeo, violetCarapaceMat);
    this.headGroup.add(headMesh);

    // Dark Slate Compound Eyes
    const eyeGeo = new THREE.SphereGeometry(0.13, 8, 8);
    eyeGeo.scale(0.8, 1.2, 1.0);
    this.leftEye = new THREE.Mesh(eyeGeo, obsidianTrimMat);
    this.leftEye.position.set(-0.19, 0.08, -0.18);
    this.leftEye.rotation.y = -0.35;
    this.rightEye = new THREE.Mesh(eyeGeo, obsidianTrimMat);
    this.rightEye.position.set(0.19, 0.08, -0.18);
    this.rightEye.rotation.y = 0.35;
    this.headGroup.add(this.leftEye, this.rightEye);

    // Articulated Curved Pincer Mandibles
    const mandibleGeo = new THREE.ConeGeometry(0.065, 0.32, 4);
    mandibleGeo.rotateX(Math.PI * 0.45);
    mandibleGeo.rotateZ(0.25);
    this.leftMandible = new THREE.Mesh(mandibleGeo, darkChitinMat);
    this.leftMandible.position.set(-0.11, -0.22, -0.26);
    this.rightMandible = new THREE.Mesh(mandibleGeo.clone(), darkChitinMat);
    this.rightMandible.geometry.rotateZ(-0.5);
    this.rightMandible.position.set(0.11, -0.22, -0.26);
    this.headGroup.add(this.leftMandible, this.rightMandible);

    // Segmented Curved Antennae arching up & out
    this.leftAntenna = new THREE.Group();
    this.leftAntenna.position.set(-0.12, 0.24, -0.15);
    const antBaseGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.42, 4);
    antBaseGeo.rotateX(-0.55);
    antBaseGeo.rotateZ(-0.35);
    this.leftAntenna.add(new THREE.Mesh(antBaseGeo, darkChitinMat));
    const antTipGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.38, 4);
    antTipGeo.rotateX(-0.95);
    antTipGeo.rotateZ(-0.55);
    antTipGeo.translate(-0.12, 0.32, -0.18);
    this.leftAntenna.add(new THREE.Mesh(antTipGeo, magentaGlowMat));
    this.headGroup.add(this.leftAntenna);

    this.rightAntenna = new THREE.Group();
    this.rightAntenna.position.set(0.12, 0.24, -0.15);
    const antBaseRGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.42, 4);
    antBaseRGeo.rotateX(-0.55);
    antBaseRGeo.rotateZ(0.35);
    this.rightAntenna.add(new THREE.Mesh(antBaseRGeo, darkChitinMat));
    const antTipRGeo = new THREE.CylinderGeometry(0.012, 0.02, 0.38, 4);
    antTipRGeo.rotateX(-0.95);
    antTipRGeo.rotateZ(0.55);
    antTipRGeo.translate(0.12, 0.32, -0.18);
    this.rightAntenna.add(new THREE.Mesh(antTipRGeo, magentaGlowMat));
    this.headGroup.add(this.rightAntenna);

    // 4. Four Translucent Insectoid Wings (2 Forewings + 2 Hindwings)
    this.wings = [];
    const wingDefs = [
      { name: 'fore_left', x: -0.18, y: 0.48, z: 0.18, len: 1.45, w: 0.32, pitch: 0.35, yaw: -0.25 },
      { name: 'fore_right', x: 0.18, y: 0.48, z: 0.18, len: 1.45, w: 0.32, pitch: 0.35, yaw: 0.25 },
      { name: 'hind_left', x: -0.14, y: 0.36, z: 0.22, len: 1.05, w: 0.26, pitch: 0.45, yaw: -0.38 },
      { name: 'hind_right', x: 0.14, y: 0.36, z: 0.22, len: 1.05, w: 0.26, pitch: 0.45, yaw: 0.38 }
    ];

    for (const wd of wingDefs) {
      const wingPivot = new THREE.Group();
      wingPivot.position.set(wd.x, wd.y, wd.z);
      wingPivot.rotation.x = wd.pitch;
      wingPivot.rotation.y = wd.yaw;

      // Thin wing blade
      const wingGeo = new THREE.BoxGeometry(wd.w, wd.len, 0.02);
      wingGeo.translate(0, -wd.len * 0.48, 0);
      const wingMesh = new THREE.Mesh(wingGeo, wingMat);
      wingPivot.add(wingMesh);

      // Leading edge vein strut
      const strutGeo = new THREE.CylinderGeometry(0.02, 0.015, wd.len, 4);
      strutGeo.translate(wd.w * 0.45, -wd.len * 0.48, 0);
      const strutMesh = new THREE.Mesh(strutGeo, darkChitinMat);
      wingPivot.add(strutMesh);

      this.torso.add(wingPivot);
      this.wings.push(wingPivot);
    }

    // 5. Four Articulated Arms
    // A) Upper Right Arm (Armored clawed arm)
    this.rightArmGroup = new THREE.Group();
    this.rightArmGroup.position.set(0.48, 0.38, -0.05);
    this.torso.add(this.rightArmGroup);

    const rPauldronGeo = new THREE.SphereGeometry(0.18, 6, 6);
    this.rightArmGroup.add(new THREE.Mesh(rPauldronGeo, violetCarapaceMat));

    const rUpperGeo = new THREE.CylinderGeometry(0.07, 0.055, 0.52, 5);
    rUpperGeo.translate(0, -0.26, 0);
    this.rightUpperMesh = new THREE.Mesh(rUpperGeo, darkChitinMat);
    this.rightArmGroup.add(this.rightUpperMesh);

    this.rightForearm = new THREE.Group();
    this.rightForearm.position.set(0, -0.48, 0);
    this.rightArmGroup.add(this.rightForearm);

    const rForeGeo = new THREE.CylinderGeometry(0.055, 0.045, 0.55, 5);
    rForeGeo.translate(0, -0.25, 0);
    this.rightForearm.add(new THREE.Mesh(rForeGeo, violetCarapaceMat));

    // 3-clawed hand
    for (let c = 0; c < 3; c++) {
      const clawGeo = new THREE.ConeGeometry(0.025, 0.18, 4);
      clawGeo.rotateX(Math.PI * 0.65);
      const claw = new THREE.Mesh(clawGeo, obsidianTrimMat);
      claw.position.set((c - 1) * 0.04, -0.54, 0.05);
      this.rightForearm.add(claw);
    }

    // B) Upper Left Arm — Fused Jagged Crystal Shard Cannon
    this.weaponArm = new THREE.Group();
    this.weaponArm.position.set(-0.48, 0.38, -0.05);
    this.torso.add(this.weaponArm);

    const lPauldronGeo = new THREE.SphereGeometry(0.18, 6, 6);
    this.weaponArm.add(new THREE.Mesh(lPauldronGeo, violetCarapaceMat));

    const lUpperGeo = new THREE.CylinderGeometry(0.07, 0.065, 0.44, 5);
    lUpperGeo.translate(0, -0.22, 0);
    this.weaponArm.add(new THREE.Mesh(lUpperGeo, darkChitinMat));

    // Cannon Barrel Body (Replaces forearm)
    this.cannonHousing = new THREE.Group();
    this.cannonHousing.position.set(0, -0.42, 0);
    this.weaponArm.add(this.cannonHousing);

    // Chitin Casing
    const barrelCasingGeo = new THREE.BoxGeometry(0.18, 0.22, 1.1);
    barrelCasingGeo.translate(0, 0, -0.45);
    const casingMesh = new THREE.Mesh(barrelCasingGeo, darkChitinMat);
    this.cannonHousing.add(casingMesh);

    // Glowing Cyan Crystalline Core & Fractures
    const coreGeo = new THREE.BoxGeometry(0.12, 0.15, 0.95);
    coreGeo.translate(0, 0, -0.45);
    this.crystalCannonCore = new THREE.Mesh(coreGeo, cyanCrystalMat);
    this.cannonHousing.add(this.crystalCannonCore);

    // Jagged Magenta Crystal Shard Spikes protruding from sides & top
    this.crystalSpikes = [];
    const spikePositions = [
      { x: -0.12, y: 0.12, z: -0.25, rotZ: 0.55 },
      { x: 0.12, y: 0.12, z: -0.45, rotZ: -0.55 },
      { x: 0.0, y: 0.15, z: -0.72, rotX: -0.35 },
      { x: -0.11, y: -0.11, z: -0.55, rotZ: 0.45 },
      { x: 0.11, y: -0.11, z: -0.35, rotZ: -0.45 }
    ];

    for (const sp of spikePositions) {
      const spGeo = new THREE.ConeGeometry(0.065, 0.38, 4);
      spGeo.rotateX(Math.PI * 0.45);
      const spMesh = new THREE.Mesh(spGeo, magentaCrystalMat);
      spMesh.position.set(sp.x, sp.y, sp.z);
      if (sp.rotZ) spMesh.rotation.z = sp.rotZ;
      if (sp.rotX) spMesh.rotation.x = sp.rotX;
      this.cannonHousing.add(spMesh);
      this.crystalSpikes.push(spMesh);
    }

    // Twin-pronged Crystal Lance Muzzle
    const prongGeo = new THREE.ConeGeometry(0.045, 0.45, 4);
    prongGeo.rotateX(-Math.PI * 0.5);
    this.cannonProngLeft = new THREE.Mesh(prongGeo, cyanCrystalMat);
    this.cannonProngLeft.position.set(-0.065, 0, -1.18);
    this.cannonProngRight = new THREE.Mesh(prongGeo.clone(), cyanCrystalMat);
    this.cannonProngRight.position.set(0.065, 0, -1.18);
    this.cannonHousing.add(this.cannonProngLeft, this.cannonProngRight);

    // C) Lower Secondary Arms (2x, emerging from ribcage)
    this.lowerLeftArm = new THREE.Group();
    this.lowerLeftArm.position.set(-0.28, 0.05, -0.12);
    this.torso.add(this.lowerLeftArm);
    const subArmGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.42, 4);
    subArmGeo.translate(0, -0.2, 0.08);
    subArmGeo.rotateX(-0.45);
    this.lowerLeftArm.add(new THREE.Mesh(subArmGeo, darkChitinMat));
    const subClawGeo = new THREE.ConeGeometry(0.02, 0.14, 4);
    subClawGeo.rotateX(Math.PI * 0.6);
    const subClawL = new THREE.Mesh(subClawGeo, obsidianTrimMat);
    subClawL.position.set(0, -0.36, 0.22);
    this.lowerLeftArm.add(subClawL);

    this.lowerRightArm = new THREE.Group();
    this.lowerRightArm.position.set(0.28, 0.05, -0.12);
    this.torso.add(this.lowerRightArm);
    const subArmRGeo = new THREE.CylinderGeometry(0.045, 0.035, 0.42, 4);
    subArmRGeo.translate(0, -0.2, 0.08);
    subArmRGeo.rotateX(-0.45);
    this.lowerRightArm.add(new THREE.Mesh(subArmRGeo, darkChitinMat));
    const subClawR = new THREE.Mesh(subClawGeo.clone(), obsidianTrimMat);
    subClawR.position.set(0, -0.36, 0.22);
    this.lowerRightArm.add(subClawR);

    // 6. Two Reverse-Jointed Digitigrade Legs
    this.legs = [];
    this.leftLegGroup = this._createDigitigradeLeg(-1);
    this.rightLegGroup = this._createDigitigradeLeg(1);
    this.group.add(this.leftLegGroup, this.rightLegGroup);
    this.legs.push(this.leftLegGroup, this.rightLegGroup);
  }

  _createDigitigradeLeg(side) {
    const legGroup = new THREE.Group();
    legGroup.position.set(side * 0.28, 1.25, 0);

    // Upper Thigh (angled forward)
    const thighGeo = new THREE.CylinderGeometry(0.12, 0.09, 0.65, 5);
    thighGeo.translate(0, -0.3, 0.1);
    thighGeo.rotateX(0.42);
    const thighMesh = new THREE.Mesh(thighGeo, violetCarapaceMat);
    legGroup.add(thighMesh);

    // Pointed Knee Cap Guard
    const kneeGeo = new THREE.ConeGeometry(0.095, 0.25, 4);
    kneeGeo.rotateX(-Math.PI * 0.45);
    const kneeMesh = new THREE.Mesh(kneeGeo, obsidianTrimMat);
    kneeMesh.position.set(0, -0.48, 0.32);
    legGroup.add(kneeMesh);

    // Reverse-Jointed Hock / Lower Leg (angled backward)
    const hockGroup = new THREE.Group();
    hockGroup.position.set(0, -0.52, 0.22);
    legGroup.add(hockGroup);

    const hockGeo = new THREE.CylinderGeometry(0.085, 0.06, 0.78, 5);
    hockGeo.translate(0, -0.38, -0.16);
    hockGeo.rotateX(-0.55);
    const hockMesh = new THREE.Mesh(hockGeo, darkChitinMat);
    hockGroup.add(hockMesh);

    // Two-Toed Clawed Foot with Rear Heel Spur
    const footGroup = new THREE.Group();
    footGroup.position.set(0, -0.72, -0.22);
    hockGroup.add(footGroup);

    // 2 Front Claws
    for (let c = 0; c < 2; c++) {
      const toeGeo = new THREE.ConeGeometry(0.04, 0.32, 4);
      toeGeo.rotateX(-Math.PI * 0.45);
      const toe = new THREE.Mesh(toeGeo, obsidianTrimMat);
      toe.position.set((c - 0.5) * 0.11, 0, -0.14);
      footGroup.add(toe);
    }

    // Rear Heel Spur
    const heelGeo = new THREE.ConeGeometry(0.035, 0.22, 4);
    heelGeo.rotateX(Math.PI * 0.45);
    const heel = new THREE.Mesh(heelGeo, obsidianTrimMat);
    heel.position.set(0, 0.02, 0.12);
    footGroup.add(heel);

    legGroup.userData = { thighMesh, hockGroup, footGroup, side };
    return legGroup;
  }

  update(dt, playerPos, onFireBolt) {
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.hp = this.maxHp;
        this.group.visible = true;
      }
      return;
    }

    const pPos = this.planet.getWorldPosition();
    this.walkCycle += dt * 3.6;

    // Periodic High-Frequency Wing-Buzz Hover-Lunge
    this.hoverTimer -= dt;
    if (this.hoverTimer <= 0) {
      this.isHovering = !this.isHovering;
      this.hoverTimer = this.isHovering ? (1.0 + Math.random() * 0.8) : (3.5 + Math.random() * 2.5);
    }

    if (this.isHovering) {
      this.hoverProgress = Math.min(1.0, this.hoverProgress + dt * 3.2);
    } else {
      this.hoverProgress = Math.max(0.0, this.hoverProgress - dt * 2.8);
    }

    // Wing buzz flutter
    const wingFreq = this.isHovering ? 0.065 : 0.02;
    const wingFlutter = Math.sin(performance.now() * wingFreq) * (this.isHovering ? 0.72 : 0.12);
    for (let i = 0; i < this.wings.length; i++) {
      const side = (i % 2 === 0) ? -1 : 1;
      this.wings[i].rotation.z = side * wingFlutter;
      this.wings[i].rotation.x = 0.35 + (this.isHovering ? 0.25 : 0);
    }

    // Calculate current patrol position on planet surface around Outpost
    const perpAxis1 = new THREE.Vector3(1, 0, 0).cross(this.baseDir).normalize();
    const perpAxis2 = this.baseDir.clone().cross(perpAxis1).normalize();

    const curAngle = this.patrolOffsetAngle + this.walkCycle * 0.14;
    const patrolOffset = perpAxis1.clone().multiplyScalar(Math.cos(curAngle) * this.patrolRadius)
      .add(perpAxis2.clone().multiplyScalar(Math.sin(curAngle) * this.patrolRadius));

    const currentDir = this.baseDir.clone().multiplyScalar(this.planet.radius || 720).add(patrolOffset).normalize();
    const surfaceElevation = this.planet.getSurfaceRadiusAtDir ?
      this.planet.getSurfaceRadiusAtDir(currentDir.x, currentDir.y, currentDir.z) :
      (this.planet.radius || 720);

    let floorElevation = surfaceElevation;
    const approxWorldPos = pPos.clone().addScaledVector(currentDir, surfaceElevation);
    if (this.planet.outpostBase && typeof this.planet.outpostBase.getFloorRadius === 'function') {
      const outpostFloor = this.planet.outpostBase.getFloorRadius(approxWorldPos);
      if (outpostFloor > floorElevation) floorElevation = outpostFloor;
    }

    // Hover lift offset
    const hoverLift = this.hoverProgress * 0.85;
    const worldPos = pPos.clone().addScaledVector(currentDir, floorElevation + hoverLift);
    this.group.position.copy(worldPos);

    // Align character up to planetary normal
    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
    const alignQ = new THREE.Quaternion().setFromUnitVectors(currentUp, currentDir);
    this.group.quaternion.premultiply(alignQ);

    // Digitigrade Bipedal Walk Cycle Kinematics
    const swing = Math.sin(this.walkCycle);
    if (this.leftLegGroup && this.rightLegGroup) {
      if (this.isHovering) {
        // Tucked raptor hover poise
        this.leftLegGroup.rotation.x = 0.42;
        this.rightLegGroup.rotation.x = 0.42;
        this.leftLegGroup.userData.hockGroup.rotation.x = -0.55;
        this.rightLegGroup.userData.hockGroup.rotation.x = -0.55;
      } else {
        // Alternating digitigrade stride
        this.leftLegGroup.rotation.x = swing * 0.52;
        this.rightLegGroup.rotation.x = -swing * 0.52;
        this.leftLegGroup.userData.hockGroup.rotation.x = Math.max(0, -swing) * 0.48;
        this.rightLegGroup.userData.hockGroup.rotation.x = Math.max(0, swing) * 0.48;
      }
    }

    // Counter-bobbing Segmented Abdomen & Torso Lean
    this.abdomenGroup.rotation.x = 0.26 + Math.sin(this.walkCycle * 2) * 0.12;
    this.torso.rotation.x = 0.10 + Math.sin(this.walkCycle * 2) * 0.04;

    // Secondary Arms Mantis Curl & Antennae Twitch
    this.lowerLeftArm.rotation.x = Math.sin(this.walkCycle * 1.5) * 0.15;
    this.lowerRightArm.rotation.x = -Math.sin(this.walkCycle * 1.5) * 0.15;
    this.leftAntenna.rotation.y = Math.sin(this.walkCycle * 2.5) * 0.12;
    this.rightAntenna.rotation.y = -Math.sin(this.walkCycle * 2.5) * 0.12;

    // Smooth decay of cannon axial recoil
    this.recoilOffset = Math.max(0, this.recoilOffset - dt * 2.2);
    this.cannonHousing.position.z = this.recoilOffset;

    if (playerPos) {
      const distToPlayer = worldPos.distanceTo(playerPos);

      // FIRE ON SIGHT AI: detects intruder within 52m line of sight
      if (distToPlayer < 52.0) {
        const aimDir = playerPos.clone().sub(worldPos).normalize();

        // Orient body towards player
        const localAim = aimDir.clone().sub(currentDir.clone().multiplyScalar(aimDir.dot(currentDir))).normalize();
        const lookTarget = worldPos.clone().add(localAim);
        this.group.lookAt(lookTarget);

        // Raise left Crystal Shard Cannon towards player
        this.weaponArm.rotation.x = -0.88;
        // Upper right clawed arm braces across chest
        this.rightArmGroup.rotation.x = 0.42;
        this.rightArmGroup.rotation.z = 0.32;

        // Flare pincer mandibles open aggressively
        this.leftMandible.rotation.y = -0.32;
        this.rightMandible.rotation.y = 0.32;

        // Crystal Charge-up Pulse (intensifies when close to firing)
        if (this.fireCooldown < 0.45) {
          const chargePulse = 1.2 + Math.sin(performance.now() * 0.04) * 0.8;
          cyanCrystalMat.emissiveIntensity = chargePulse;
          magentaCrystalMat.emissiveIntensity = chargePulse * 1.2;
        }

        // Fire Magenta-Cyan Crystal Bolt on sight
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
          this.fireCooldown = 1.35 + Math.random() * 0.45;
          this.recoilOffset = 0.28; // Axial recoil impulse

          // Snap mandibles shut on fire
          this.leftMandible.rotation.y = 0.15;
          this.rightMandible.rotation.y = -0.15;

          const muzzlePos = worldPos.clone().addScaledVector(aimDir, 1.4).add(new THREE.Vector3(0, 1.3, 0));
          if (onFireBolt) {
            onFireBolt(muzzlePos, aimDir, 42.0, 8);
          }
        }
      } else {
        // Relaxed patrol posture
        this.weaponArm.rotation.x = 0.15;
        this.rightArmGroup.rotation.x = -swing * 0.35;
        this.rightArmGroup.rotation.z = 0;
        this.leftMandible.rotation.y = 0;
        this.rightMandible.rotation.y = 0;
        cyanCrystalMat.emissiveIntensity = 1.15;
        magentaCrystalMat.emissiveIntensity = 1.35;
      }
    }
  }

  takeDamage(amount) {
    if (this.dead) return { hit: false, defeated: false };
    this.hp -= amount;
    if (this.hp <= 0) {
      this.dead = true;
      this.respawnTimer = 35.0;
      this.group.visible = false;
      return { hit: true, defeated: true, dropItem: 'chitin_shell', dropLabel: 'Chitin Shell' };
    }
    return { hit: true, defeated: false };
  }
}

/**
 * EnemyOutpostBase — Fortified Crater-Crystal Planetary Outpost on Aurelia Prime
 * Matching Hive Base Cutaway / Cross-Section Reference Sheet:
 * - Ring of jagged dark-purple/obsidian rock spires enclosing tiered crater.
 * - Deep subterranean rock foundation skirt (-18m to +2m).
 * - Walkable Lower Entry Plaza (y = 2.0m) & front entrance ramp.
 * - Walkable Grand Central Staircase & side steps (y = 2.0m to 8.5m).
 * - Twin glowing cyan energy conduit pipes flanking the staircase like power banisters.
 * - Walkable Upper Sanctum Terrace (y = 8.5m).
 * - Giant Central Cyan-to-Magenta Power Crystal Monolith with base magenta shards.
 * - Hexagonal purple bio-comb hatchery wall cells & left terrace stasis alcoves.
 * - Solid 3D collision blocking crystal, spires, conduits, bio-comb walls, and cliff faces.
 */
export class EnemyOutpostBase {
  constructor(planet, direction) {
    this.planet = planet;
    this.direction = direction.clone().normalize();
    this.group = new THREE.Group();
    this.group.name = 'EnemyOutpostBase';

    this.baseSurfaceRadius = planet.getSurfaceRadiusAtDir ?
      planet.getSurfaceRadiusAtDir(this.direction.x, this.direction.y, this.direction.z) :
      (planet.radius || 720);

    this.spireColliders = [];
    this._buildMesh();
    this._placeOnPlanet();
  }

  _buildMesh() {
    // 1. Deep Subterranean Rock Foundation Skirt (-18m to +2m)
    // Guarantees zero floating edges on uneven terrain slopes
    const skirtGeo = new THREE.CylinderGeometry(28, 32, 20, 16);
    skirtGeo.translate(0, -8.0, 0);
    const skirtMesh = new THREE.Mesh(skirtGeo, obsidianTrimMat);
    this.group.add(skirtMesh);

    // 2. Lower Entry Plaza Deck (y = 2.0m)
    const lowerDeckGeo = new THREE.CylinderGeometry(24, 26, 1.4, 12);
    lowerDeckGeo.translate(0, 1.3, 4.0);
    const lowerDeckMesh = new THREE.Mesh(lowerDeckGeo, darkSpireRockMat);
    this.group.add(lowerDeckMesh);

    // Front Entry Ramp (connecting terrain to lower plaza)
    const rampGeo = new THREE.BoxGeometry(14, 1.2, 10);
    rampGeo.rotateX(0.22);
    rampGeo.translate(0, 0.9, 21.0);
    const rampMesh = new THREE.Mesh(rampGeo, darkChitinMat);
    this.group.add(rampMesh);

    // 3. Outer Ring of 14 Jagged Rock Spires + Towering Rear Spire
    for (let i = 0; i < 14; i++) {
      const angle = (i * Math.PI * 2) / 16 + 0.35;
      const r = 24.5 + ((i % 3) - 1) * 2.2;
      const sx = Math.cos(angle) * r;
      const sz = Math.sin(angle) * r;

      // Skip the front entrance gap (around z > 15m)
      if (sz > 16.0) continue;

      const isRear = (sz < -18.0 && Math.abs(sx) < 6.0);
      const h = isRear ? 28.0 : (10.0 + (i % 4) * 3.2);
      const rad = isRear ? 4.8 : (2.4 + (i % 3) * 0.6);

      const spireGeo = new THREE.ConeGeometry(rad, h, 5);
      spireGeo.translate(0, h * 0.5, 0);
      const spireMesh = new THREE.Mesh(spireGeo, isRear ? obsidianTrimMat : darkSpireRockMat);
      spireMesh.position.set(sx, 1.0, sz);
      spireMesh.rotation.y = (i * 0.7);
      this.group.add(spireMesh);

      // Register spire collision cylinder
      this.spireColliders.push({ x: sx, z: sz, r: rad * 0.85, h: h + 2.0 });
    }

    // 4. Upper Sanctum Terrace Deck (y = 8.5m)
    const upperDeckGeo = new THREE.CylinderGeometry(18, 19, 1.6, 8);
    upperDeckGeo.translate(0, 7.7, -6.5);
    const upperDeckMesh = new THREE.Mesh(upperDeckGeo, darkSpireRockMat);
    this.group.add(upperDeckMesh);

    // 5. Grand Central Staircase & Side Steps (y = 2.0m to 8.5m)
    const stepCount = 8;
    for (let s = 0; s < stepCount; s++) {
      const t = s / (stepCount - 1);
      const stepY = 2.0 + t * 6.5;
      const stepZ = 8.0 - t * 9.5;
      const stepGeo = new THREE.BoxGeometry(6.8, 0.82, 1.4);
      const stepMesh = new THREE.Mesh(stepGeo, violetCarapaceMat);
      stepMesh.position.set(0, stepY - 0.41, stepZ);
      this.group.add(stepMesh);
    }

    // Side Steps / Stone Balustrades
    for (const side of [-1, 1]) {
      const balustradeGeo = new THREE.BoxGeometry(1.6, 7.5, 12);
      balustradeGeo.rotateX(0.58);
      balustradeGeo.translate(side * 4.8, 4.6, 3.2);
      const balustrade = new THREE.Mesh(balustradeGeo, darkChitinMat);
      this.group.add(balustrade);
    }

    // 6. Giant Central Cyan-to-Magenta Power Crystal Monolith
    const crystalCenter = new THREE.Vector3(0, 8.5, -6.5);

    // Octagonal tiered dark-chitin pedestal
    const pedestalGeo = new THREE.CylinderGeometry(4.2, 4.8, 1.6, 8);
    const pedestalMesh = new THREE.Mesh(pedestalGeo, obsidianTrimMat);
    pedestalMesh.position.set(crystalCenter.x, 9.3, crystalCenter.z);
    this.group.add(pedestalMesh);

    // Lower Magenta Crystal Base
    const lowerCryGeo = new THREE.CylinderGeometry(2.2, 2.8, 6.2, 6);
    this.crystalLower = new THREE.Mesh(lowerCryGeo, magentaCrystalMat);
    this.crystalLower.position.set(crystalCenter.x, 12.8, crystalCenter.z);
    this.group.add(this.crystalLower);

    // Upper Cyan Crystal Spire Monolith
    const upperCryGeo = new THREE.ConeGeometry(2.2, 11.0, 6);
    this.hiveCore = new THREE.Mesh(upperCryGeo, cyanCrystalMat);
    this.hiveCore.position.set(crystalCenter.x, 20.2, crystalCenter.z);
    this.group.add(this.hiveCore);

    // 8 Peripheral Angled Magenta Crystal Shards radiating around base
    for (let i = 0; i < 8; i++) {
      const a = (i * Math.PI * 2) / 8;
      const shardGeo = new THREE.ConeGeometry(0.55, 3.2, 4);
      shardGeo.rotateX(0.55);
      const shardMesh = new THREE.Mesh(shardGeo, magentaCrystalMat);
      shardMesh.position.set(
        crystalCenter.x + Math.cos(a) * 3.4,
        9.8,
        crystalCenter.z + Math.sin(a) * 3.4
      );
      shardMesh.rotation.y = a;
      this.group.add(shardMesh);
    }

    // 7. Twin Glowing Cyan Energy Conduit Pipes (Power Banisters)
    for (const side of [-1, 1]) {
      const pipeGeo = new THREE.CylinderGeometry(0.42, 0.42, 12.8, 6);
      pipeGeo.rotateX(0.62);
      const pipeMesh = new THREE.Mesh(pipeGeo, cyanConduitMat);
      pipeMesh.position.set(side * 3.7, 5.2, 2.8);
      this.group.add(pipeMesh);

      // Dark Chitin Conduit Collar Rings
      for (let c = 0; c < 4; c++) {
        const ringGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.35, 6);
        ringGeo.rotateX(0.62);
        const ringMesh = new THREE.Mesh(ringGeo, obsidianTrimMat);
        ringMesh.position.set(side * 3.7, 3.2 + c * 1.8, 5.8 - c * 2.8);
        this.group.add(ringMesh);
      }
    }

    // 8. Hexagonal Purple Bio-Comb Hatchery Wall Cells
    for (const side of [-1, 1]) {
      const bioCombGroup = new THREE.Group();
      bioCombGroup.position.set(side * 11.5, 10.8, -12.5);

      for (let row = 0; row < 3; row++) {
        for (let col = 0; col < 3; col++) {
          const cellGeo = new THREE.CylinderGeometry(0.9, 0.9, 1.4, 6);
          cellGeo.rotateX(Math.PI / 2);
          const cellMesh = new THREE.Mesh(cellGeo, magentaCrystalMat);
          cellMesh.position.set((col - 1) * 1.55 + (row % 2) * 0.75, (row - 1) * 1.4, 0);
          bioCombGroup.add(cellMesh);

          const innerGlowGeo = new THREE.CylinderGeometry(0.45, 0.45, 1.45, 6);
          innerGlowGeo.rotateX(Math.PI / 2);
          const innerMesh = new THREE.Mesh(innerGlowGeo, cyanConduitMat);
          innerMesh.position.copy(cellMesh.position);
          bioCombGroup.add(innerMesh);
        }
      }
      this.group.add(bioCombGroup);
    }

    // 9. Left Terrace Domed Stasis Alcoves
    const stasisGroup = new THREE.Group();
    stasisGroup.position.set(-11.0, 8.5, -5.5);
    for (let a = 0; a < 2; a++) {
      const domeGeo = new THREE.SphereGeometry(2.1, 8, 8, 0, Math.PI);
      domeGeo.rotateZ(Math.PI / 2);
      const domeMesh = new THREE.Mesh(domeGeo, darkChitinMat);
      domeMesh.position.set(0, 1.8, a * 3.2);
      stasisGroup.add(domeMesh);

      // Glowing Cyan Vertical Doorway Portal
      const doorGeo = new THREE.BoxGeometry(0.15, 2.4, 1.1);
      const doorMesh = new THREE.Mesh(doorGeo, cyanConduitMat);
      doorMesh.position.set(1.9, 1.2, a * 3.2);
      stasisGroup.add(doorMesh);
    }
    this.group.add(stasisGroup);

    // 10. Warm Amber Cavern Crystals at lower plaza cliff base
    for (const side of [-1, 1]) {
      const amberGroup = new THREE.Group();
      amberGroup.position.set(side * 13.5, 2.0, 9.5);
      for (let c = 0; c < 4; c++) {
        const ambGeo = new THREE.ConeGeometry(0.45 + (c % 2) * 0.2, 2.4 + c * 0.4, 5);
        const ambMesh = new THREE.Mesh(ambGeo, amberCrystalMat);
        ambMesh.position.set((c - 1.5) * 0.65, 1.2, (c % 2) * 0.4);
        ambMesh.rotation.z = side * 0.35 + (c - 1.5) * 0.15;
        amberGroup.add(ambMesh);
      }
      this.group.add(amberGroup);
    }
  }

  _placeOnPlanet() {
    const pPos = this.planet.getWorldPosition();
    this.position = pPos.clone().addScaledVector(this.direction, this.baseSurfaceRadius);
    this.group.position.copy(this.position);

    const up = this.direction.clone();
    const currentUp = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(currentUp, up);
    this.group.quaternion.copy(q);
  }

  /**
   * Returns exact walkable floor spherical radius at worldPos across base tiers:
   * - Front Ramp: smooth slope from terrain level (y = 0m) up to lower plaza (y = 2m).
   * - Lower Plaza: y = 2.0m.
   * - Grand Staircase: smooth stepped slope from y = 2.0m up to upper terrace (y = 8.5m).
   * - Upper Terrace: y = 8.5m.
   * - Subterranean Skirt: provides rock baseline so player never sinks below base deck.
   */
  getFloorRadius(worldPos) {
    const local = this.group.worldToLocal(worldPos.clone());
    const horizDist = Math.hypot(local.x, local.z);

    if (horizDist > 30.0) return 0;

    let localFloorY = 0;

    if (local.z <= -2.0) {
      // Upper Sanctum Terrace
      localFloorY = 8.5;
    } else if (local.z < 8.0) {
      // Grand Central Staircase & Side Stairs (slope from y = 8.5 at z = -2 to y = 2.0 at z = 8)
      const t = (8.0 - local.z) / 10.0;
      localFloorY = 2.0 + t * 6.5;
    } else if (local.z <= 18.0) {
      // Lower Entry Plaza
      localFloorY = 2.0;
    } else if (local.z <= 26.0) {
      // Front Entry Ramp (slope from y = 2.0 at z = 18 to y = 0.0 at z = 26)
      const t = (26.0 - local.z) / 8.0;
      localFloorY = Math.max(0, t * 2.0);
    } else {
      localFloorY = 0;
    }

    return this.baseSurfaceRadius + localFloorY;
  }

  /**
   * Resolves solid 3D collision against:
   * - Central Giant Power Crystal Monolith & Pedestal.
   * - 14 Outer Jagged Rock Spires.
   * - Twin Glowing Cyan Energy Conduit Pipes flanking staircase.
   * - Stasis Alcoves on left terrace.
   * - Terrace Cliff Face (blocks walking through cliff wall from lower plaza to upper terrace).
   */
  resolveCollision(worldPos, entityRadius = 0.55) {
    const local = this.group.worldToLocal(worldPos.clone());
    const horizDist = Math.hypot(local.x, local.z);
    if (horizDist > 34.0) return false;

    let pushed = false;

    // 1. Central Giant Power Crystal & Pedestal
    // Located at (0, 8.5, -6.5)
    if (local.y >= 8.2 && local.y <= 27.0) {
      const cx = 0;
      const cz = -6.5;
      const dx = local.x - cx;
      const dz = local.z - cz;
      const cDist = Math.hypot(dx, dz);
      const cRadius = 4.4 + entityRadius;
      if (cDist < cRadius) {
        if (cDist < 0.001) {
          local.z = cz + cRadius;
        } else {
          const factor = cRadius / cDist;
          local.x = cx + dx * factor;
          local.z = cz + dz * factor;
        }
        pushed = true;
      }
    }

    // 2. Outer Jagged Rock Spires
    for (let i = 0; i < this.spireColliders.length; i++) {
      const sp = this.spireColliders[i];
      if (local.y <= sp.h) {
        const dx = local.x - sp.x;
        const dz = local.z - sp.z;
        const d = Math.hypot(dx, dz);
        const minDist = sp.r + entityRadius;
        if (d < minDist) {
          if (d < 0.001) {
            local.z = sp.z + minDist;
          } else {
            const factor = minDist / d;
            local.x = sp.x + dx * factor;
            local.z = sp.z + dz * factor;
          }
          pushed = true;
        }
      }
    }

    // 3. Twin Conduit Pipes flanking staircase (x = -3.7 and +3.7, z in [-2.0, 8.0])
    if (local.z >= -2.0 && local.z <= 8.0 && local.y >= 1.5 && local.y <= 10.0) {
      const pipeR = 0.65 + entityRadius;
      for (const px of [-3.7, 3.7]) {
        const dx = local.x - px;
        if (Math.abs(dx) < pipeR) {
          local.x = px + (dx >= 0 ? pipeR : -pipeR);
          pushed = true;
        }
      }
    }

    // 4. Stasis Alcoves on left terrace (x = -11.0, z = -5.5)
    if (local.y >= 8.2 && local.y <= 13.5) {
      const ax = -11.0;
      const az = -5.5;
      const aDist = Math.hypot(local.x - ax, local.z - az);
      const aRadius = 2.8 + entityRadius;
      if (aDist < aRadius && aDist > 0.001) {
        const factor = aRadius / aDist;
        local.x = ax + (local.x - ax) * factor;
        local.z = az + (local.z - az) * factor;
        pushed = true;
      }
    }

    // 5. Terrace Cliff Face
    // Grand stairs are between x = -3.4 and x = +3.4. Outside that corridor, z = 8.0 is a 6.5m vertical cliff wall!
    if (local.y < 7.8 && local.z < 8.0 && Math.abs(local.x) > 3.4 && horizDist <= 24.0) {
      local.z = 8.0;
      pushed = true;
    }

    if (pushed) {
      worldPos.copy(this.group.localToWorld(local));
      return true;
    }
    return false;
  }

  update(dt) {
    if (this.hiveCore) {
      const scale = 1.0 + Math.sin(performance.now() * 0.005) * 0.08;
      this.hiveCore.scale.set(scale, scale, scale);
    }
    if (this.crystalLower) {
      const pulse = 1.0 + Math.sin(performance.now() * 0.007) * 0.05;
      this.crystalLower.scale.set(pulse, 1.0, pulse);
    }
  }
}

/**
 * EnemyFactionSystem — Coordinates Goliath Pod Fleet, Outpost Base & Bug Aliens
 */
export class EnemyFactionSystem {
  constructor(scene, planet, moons, onNotice) {
    this.scene = scene;
    this.planet = planet;
    this.moons = moons;
    this.onNotice = onNotice;

    // Largest moon is Moon III: Goliath
    this.goliathMoon = moons.find((m) => m.id === 'goliath') || moons[2] || moons[moons.length - 1];

    this.pods = [];
    this.bugAliens = [];
    this.projectiles = [];
    this.outpost = null;

    // Magenta-cyan crystal bolt projectile
    this.crimsonBoltGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6);
    this.crimsonBoltGeo.rotateX(Math.PI / 2);
    this.crimsonBoltMat = new THREE.MeshBasicMaterial({ color: 0xff1eff });

    this._initFaction();
  }

  /**
   * Evaluates candidate highland locations on Aurelia Prime to guarantee that
   * the Outpost Base and its entire 38m patrol footprint are on high dry land
   * (strictly >= seaLevelRadius + 8.0m, never over water).
   */
  _findDryHighlandDirection(planet) {
    if (!planet || typeof planet.getSurfaceRadiusAtDir !== 'function') {
      return new THREE.Vector3(0.28, 0.94, -0.19).normalize();
    }

    const seaLevel = planet.seaLevelRadius || (planet.radius - 2.0);
    const candidates = [
      new THREE.Vector3(0.28, 0.94, -0.19),
      new THREE.Vector3(0.25, 0.94, -0.22),
      new THREE.Vector3(0.32, 0.92, -0.20),
      new THREE.Vector3(0.18, 0.96, -0.20),
      new THREE.Vector3(-0.25, 0.94, 0.22),
      new THREE.Vector3(-0.30, 0.92, -0.24),
      new THREE.Vector3(0.35, 0.91, 0.20),
      new THREE.Vector3(0.15, 0.98, 0.12),
      new THREE.Vector3(-0.18, 0.97, -0.15)
    ];

    let bestDir = null;
    let bestScore = -Infinity;

    for (const cand of candidates) {
      const dir = cand.clone().normalize();
      const pR = planet.radius || 720;
      const refUp = Math.abs(dir.y) < 0.95 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
      const right = new THREE.Vector3().crossVectors(dir, refUp).normalize();
      const fwd = new THREE.Vector3().crossVectors(right, dir).normalize();

      let minElev = Infinity;
      let maxElev = -Infinity;
      let valid = true;

      // Sample center + 3 concentric rings (r = 12m, 24m, 38m) across the full footprint
      const sampleRadii = [0, 12, 24, 38];
      for (const rad of sampleRadii) {
        const count = rad === 0 ? 1 : 8;
        for (let i = 0; i < count; i++) {
          const a = (i * Math.PI * 2) / count;
          const offset = right.clone().multiplyScalar(Math.cos(a) * rad)
            .add(fwd.clone().multiplyScalar(Math.sin(a) * rad));
          const samplePos = dir.clone().multiplyScalar(pR).add(offset);
          const sampleDir = samplePos.clone().normalize();
          const r = planet.getSurfaceRadiusAtDir(sampleDir.x, sampleDir.y, sampleDir.z);
          const hAboveSea = r - seaLevel;
          if (hAboveSea < 8.0) {
            valid = false;
            break;
          }
          if (r < minElev) minElev = r;
          if (r > maxElev) maxElev = r;
        }
        if (!valid) break;
      }

      if (valid) {
        const slopeVariance = maxElev - minElev;
        const score = minElev - slopeVariance * 2.0;
        if (score > bestScore) {
          bestScore = score;
          bestDir = dir;
        }
      }
    }

    return bestDir || candidates[0].clone().normalize();
  }

  _initFaction() {
    // 1. Single Planetary Base on Aurelia Prime (Dry Highland Guaranteed)
    const outpostDir = this._findDryHighlandDirection(this.planet);
    this.outpost = new EnemyOutpostBase(this.planet, outpostDir);
    this.planet.outpostBase = this.outpost;
    this.scene.add(this.outpost.group);

    // 2. Six Wasp-Warrior Bug-Alien Troopers guarding the Outpost
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const radius = 18.0 + (i % 2) * 10.0;
      const trooper = new BugAlienTrooper(`bug_trooper_${i}`, this.planet, outpostDir, angle, radius);
      this.scene.add(trooper.group);
      this.bugAliens.push(trooper);
    }

    // 3. Eight Finned Pod Interceptors patrolling ONLY Moon III: Goliath
    if (this.goliathMoon) {
      const gRadius = this.goliathMoon.radius || 310;
      for (let i = 0; i < 8; i++) {
        const orbitRad = gRadius + 45 + (i % 3) * 22;
        const orbitAngle = (i * Math.PI * 2) / 8;
        const orbitSpeed = 0.08 + (i % 2) * 0.04;
        const yOffset = ((i % 4) - 1.5) * 26;
        const pod = new EnemyPodShip(`goliath_pod_${i}`, this.goliathMoon, orbitRad, orbitAngle, orbitSpeed, yOffset);
        this.scene.add(pod.group);
        this.pods.push(pod);
      }
    }
  }

  spawnCrimsonBolt(origin, direction, speed, damage) {
    const mesh = new THREE.Mesh(this.crimsonBoltGeo, this.crimsonBoltMat);
    mesh.position.copy(origin);
    mesh.lookAt(origin.clone().add(direction));
    this.scene.add(mesh);

    this.projectiles.push({
      mesh,
      velocity: direction.clone().multiplyScalar(speed),
      life: 4.5,
      damage
    });
  }

  update(dt, gameMode, explorer, ship, onPlayerDamaged) {
    if (this.outpost) this.outpost.update(dt);

    const playerPos = (gameMode === 'EXPLORING' && explorer) ? explorer.group.position : (ship ? ship.group.position : null);

    // Update Bug-Alien Troopers
    for (let i = 0; i < this.bugAliens.length; i++) {
      this.bugAliens[i].update(dt, playerPos, (muzzle, dir, spd, dmg) => {
        this.spawnCrimsonBolt(muzzle, dir, spd, dmg);
      });
    }

    // Update Goliath Finned Pod Fleet
    for (let i = 0; i < this.pods.length; i++) {
      this.pods[i].update(dt, playerPos, (muzzle, dir, spd, dmg) => {
        this.spawnCrimsonBolt(muzzle, dir, spd, dmg);
      });
    }

    // Update projectiles & damage player
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      let hit = false;
      if (playerPos) {
        const dist = p.mesh.position.distanceTo(playerPos);
        const threshold = (gameMode === 'PILOTING') ? 5.8 : 2.2;
        if (dist <= threshold) {
          hit = true;
          if (onPlayerDamaged) {
            onPlayerDamaged(p.damage, gameMode);
          }
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }
  }

  takeDamageAtPoint(point, radius, damage) {
    // Check hit on bug aliens
    for (let i = 0; i < this.bugAliens.length; i++) {
      const b = this.bugAliens[i];
      if (b.dead) continue;
      if (b.group.position.distanceTo(point) <= radius + b.hitRadius) {
        const res = b.takeDamage(damage);
        return { hit: true, targetType: 'bug_alien', target: b, defeated: res.defeated };
      }
    }

    // Check hit on finned pod ships
    for (let i = 0; i < this.pods.length; i++) {
      const p = this.pods[i];
      if (p.dead) continue;
      if (p.group.position.distanceTo(point) <= radius + p.hitRadius) {
        const res = p.takeDamage(damage);
        return { hit: true, targetType: 'enemy_pod', target: p, defeated: res.defeated };
      }
    }

    return { hit: false };
  }
}
