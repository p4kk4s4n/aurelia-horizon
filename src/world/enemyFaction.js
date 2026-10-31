import * as THREE from 'three';

/**
 * Enemy Faction — Crimson Hive & Goliath Finned Pod Fleet
 * 
 * 1. EnemyPodShip: Fast finned spherical/ovoid pods defending Moon III: Goliath ONLY.
 * 2. EnemyOutpostBase: Fortified single planetary outpost on Aurelia Prime.
 * 3. BugAlienTrooper: Chitin insectoids guarding the outpost that fire bio-plasma bolts ON SIGHT.
 */

// Materials for Crimson Hive & Bug Aliens
const darkChitinMat = new THREE.MeshStandardMaterial({
  color: 0x1f1418,
  roughness: 0.45,
  metalness: 0.65,
  flatShading: true
});

const redArmorMat = new THREE.MeshStandardMaterial({
  color: 0x801026,
  roughness: 0.38,
  metalness: 0.52,
  flatShading: true
});

const crimsonGlowMat = new THREE.MeshBasicMaterial({
  color: 0xff1e46
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
    // Dorsal Fin (swept backward above cockpit)
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

    // Port Fin (swept out and back)
    const portFinGeo = new THREE.BoxGeometry(1.5, 0.12, 1.6);
    portFinGeo.rotateZ(Math.PI * 0.12);
    portFinGeo.rotateY(Math.PI * 0.15);
    const portFin = new THREE.Mesh(portFinGeo, darkChitinMat);
    portFin.position.set(-1.45, -0.15, 0.25);
    this.group.add(portFin);

    // Starboard Fin (swept out and back)
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

    // Base position orbiting Goliath
    const baseLocalX = Math.cos(this.orbitAngle) * this.orbitRadius;
    const baseLocalZ = Math.sin(this.orbitAngle) * this.orbitRadius;
    const currentWorldPos = new THREE.Vector3(
      moonPos.x + baseLocalX,
      moonPos.y + this.yOffset + Math.sin(this.orbitAngle * 2.2) * 8.0,
      moonPos.z + baseLocalZ
    );

    // Thruster pulse
    if (this.thrusterFlame) {
      const s = 0.9 + Math.sin(performance.now() * 0.04 + this.orbitRadius) * 0.25;
      this.thrusterFlame.scale.set(s, s, s * 1.3);
    }

    if (playerShipPos) {
      const distToPlayer = currentWorldPos.distanceTo(playerShipPos);
      const distToGoliath = playerShipPos.distanceTo(moonPos);

      // Engages only when player is near Goliath (within Goliath SOI / defense perimeter)
      if (distToGoliath < (this.moon.soiRadius || 960) && distToPlayer < 550) {
        // Dogfight tracking: turn towards player
        const aimDir = playerShipPos.clone().sub(currentWorldPos).normalize();
        const lookTarget = currentWorldPos.clone().add(aimDir);
        this.group.lookAt(lookTarget);

        // Fire crimson bolts at player
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0 && distToPlayer < 380) {
          this.fireCooldown = 1.8 + Math.random() * 0.8;
          if (onFireBolt) {
            onFireBolt(currentWorldPos.clone(), aimDir.clone(), 65.0, 4);
          }
        }
      } else {
        // Regular orbit facing along velocity
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
 * BugAlienTrooper — Insectoid biped/hexapod guarding the planetary outpost
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

    this.group = new THREE.Group();
    this._buildMesh();
    this.update(0, null, null);
  }

  _buildMesh() {
    // 1. Thorax & Segmented Abdomen
    this.torso = new THREE.Group();
    this.torso.position.y = 1.45;
    this.group.add(this.torso);

    const thoraxGeo = new THREE.CylinderGeometry(0.42, 0.32, 0.75, 6);
    const thoraxMesh = new THREE.Mesh(thoraxGeo, darkChitinMat);
    this.torso.add(thoraxMesh);

    const carapaceGeo = new THREE.ConeGeometry(0.48, 0.85, 6);
    carapaceGeo.rotateX(Math.PI * 0.35);
    const carapaceMesh = new THREE.Mesh(carapaceGeo, redArmorMat);
    carapaceMesh.position.set(0, 0.15, 0.28);
    this.torso.add(carapaceMesh);

    // Segmented insect abdomen drooping behind
    const abdomenGeo = new THREE.SphereGeometry(0.55, 8, 8);
    abdomenGeo.scale(0.85, 0.75, 1.4);
    const abdomenMesh = new THREE.Mesh(abdomenGeo, darkChitinMat);
    abdomenMesh.position.set(0, -0.42, 0.65);
    this.torso.add(abdomenMesh);

    // 2. Insectoid Head with Compound Crimson Eyes & Antennae
    this.head = new THREE.Group();
    this.head.position.set(0, 0.55, -0.22);
    this.torso.add(this.head);

    const headGeo = new THREE.ConeGeometry(0.34, 0.58, 6);
    headGeo.rotateX(-Math.PI * 0.45);
    const headMesh = new THREE.Mesh(headGeo, redArmorMat);
    this.head.add(headMesh);

    // Compound red eyes
    const eyeGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const leftEye = new THREE.Mesh(eyeGeo, crimsonGlowMat);
    leftEye.position.set(-0.16, 0.12, -0.32);
    const rightEye = new THREE.Mesh(eyeGeo, crimsonGlowMat);
    rightEye.position.set(0.16, 0.12, -0.32);
    this.head.add(leftEye, rightEye);

    // Twitching antennae
    const antGeo = new THREE.CylinderGeometry(0.02, 0.03, 0.65, 4);
    antGeo.rotateX(-Math.PI * 0.3);
    const leftAnt = new THREE.Mesh(antGeo, crimsonGlowMat);
    leftAnt.position.set(-0.14, 0.32, -0.22);
    leftAnt.rotation.z = -0.25;
    const rightAnt = new THREE.Mesh(antGeo, crimsonGlowMat);
    rightAnt.position.set(0.14, 0.32, -0.22);
    rightAnt.rotation.z = 0.25;
    this.head.add(leftAnt, rightAnt);

    // 3. Articulated Chitin Legs (4 legs)
    this.legs = [];
    const legPositions = [
      { x: -0.42, z: 0.15, side: -1 },
      { x: 0.42, z: 0.15, side: 1 },
      { x: -0.38, z: -0.25, side: -1 },
      { x: 0.38, z: -0.25, side: 1 }
    ];

    for (const lp of legPositions) {
      const legGroup = new THREE.Group();
      legGroup.position.set(lp.x, 0.95, lp.z);

      const upperGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.65, 5);
      upperGeo.translate(0, -0.32, 0);
      upperGeo.rotateZ(lp.side * 0.35);
      const upper = new THREE.Mesh(upperGeo, darkChitinMat);
      legGroup.add(upper);

      const lowerGeo = new THREE.CylinderGeometry(0.06, 0.04, 0.72, 5);
      lowerGeo.translate(0, -0.36, 0);
      lowerGeo.rotateZ(lp.side * -0.25);
      const lower = new THREE.Mesh(lowerGeo, redArmorMat);
      lower.position.set(lp.side * 0.22, -0.6, 0);
      legGroup.add(lower);

      this.group.add(legGroup);
      this.legs.push(legGroup);
    }

    // 4. Bio-Plasma Needle Rifle Arm
    this.weaponArm = new THREE.Group();
    this.weaponArm.position.set(0.48, 0.28, -0.2);
    this.torso.add(this.weaponArm);

    const rifleGeo = new THREE.BoxGeometry(0.14, 0.22, 1.4);
    const rifleMesh = new THREE.Mesh(rifleGeo, darkChitinMat);
    rifleMesh.position.set(0, -0.15, -0.55);
    this.weaponArm.add(rifleMesh);

    const barrelGeo = new THREE.CylinderGeometry(0.05, 0.05, 0.65, 6);
    barrelGeo.rotateX(Math.PI / 2);
    const barrel = new THREE.Mesh(barrelGeo, crimsonGlowMat);
    barrel.position.set(0, -0.15, -1.35);
    this.weaponArm.add(barrel);
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
    this.walkCycle += dt * 3.5;

    // Calculate current patrol position on planet surface around the Outpost
    const perpAxis1 = new THREE.Vector3(1, 0, 0).cross(this.baseDir).normalize();
    const perpAxis2 = this.baseDir.clone().cross(perpAxis1).normalize();

    const curAngle = this.patrolOffsetAngle + this.walkCycle * 0.15;
    const patrolOffset = perpAxis1.clone().multiplyScalar(Math.cos(curAngle) * this.patrolRadius)
      .add(perpAxis2.clone().multiplyScalar(Math.sin(curAngle) * this.patrolRadius));

    const currentDir = this.baseDir.clone().multiplyScalar(this.planet.radius || 360).add(patrolOffset).normalize();
    const surfaceElevation = this.planet.getSurfaceElevation ? this.planet.getSurfaceElevation(currentDir) : (this.planet.radius || 360);
    const worldPos = pPos.clone().addScaledVector(currentDir, surfaceElevation);

    this.group.position.copy(worldPos);

    // Align character up to planetary normal
    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion);
    const alignQ = new THREE.Quaternion().setFromUnitVectors(currentUp, currentDir);
    this.group.quaternion.premultiply(alignQ);

    // Leg walk cycle animation
    const swing = Math.sin(this.walkCycle);
    if (this.legs.length === 4) {
      this.legs[0].rotation.x = swing * 0.45;
      this.legs[1].rotation.x = -swing * 0.45;
      this.legs[2].rotation.x = -swing * 0.45;
      this.legs[3].rotation.x = swing * 0.45;
    }

    if (playerPos) {
      const distToPlayer = worldPos.distanceTo(playerPos);

      // FIRE ON SIGHT AI: detects intruder within 48m line of sight
      if (distToPlayer < 48.0) {
        const aimDir = playerPos.clone().sub(worldPos).normalize();

        // Orient body towards player
        const localAim = aimDir.clone().sub(currentDir.clone().multiplyScalar(aimDir.dot(currentDir))).normalize();
        const lookTarget = worldPos.clone().add(localAim);
        this.group.lookAt(lookTarget);

        // Raise rifle arm towards player
        this.weaponArm.rotation.x = -0.85;

        // Fire crimson bio-plasma bolt on sight
        this.fireCooldown -= dt;
        if (this.fireCooldown <= 0) {
          this.fireCooldown = 1.35 + Math.random() * 0.4;
          const muzzlePos = worldPos.clone().addScaledVector(aimDir, 1.2).add(new THREE.Vector3(0, 1.2, 0));
          if (onFireBolt) {
            onFireBolt(muzzlePos, aimDir, 36.0, 8);
          }
        }
      } else {
        this.weaponArm.rotation.x = 0.15;
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
 * EnemyOutpostBase — Single planetary base on Aurelia Prime
 */
export class EnemyOutpostBase {
  constructor(planet, direction) {
    this.planet = planet;
    this.direction = direction.clone().normalize();
    this.group = new THREE.Group();
    this._buildMesh();
    this._placeOnPlanet();
  }

  _buildMesh() {
    // 1. Hexagonal Fortified Chitin Foundation
    const baseGeo = new THREE.CylinderGeometry(15, 17, 2.8, 6);
    const baseMesh = new THREE.Mesh(baseGeo, darkChitinMat);
    baseMesh.position.y = 1.4;
    this.group.add(baseMesh);

    // 2. Central Hive Spire
    const spireGeo = new THREE.ConeGeometry(4.2, 22, 6);
    const spireMesh = new THREE.Mesh(spireGeo, redArmorMat);
    spireMesh.position.y = 11.5;
    this.group.add(spireMesh);

    // Glowing energy conduit ridges running down spire
    for (let i = 0; i < 6; i++) {
      const ridgeGeo = new THREE.BoxGeometry(0.25, 18, 0.65);
      const ridge = new THREE.Mesh(ridgeGeo, crimsonGlowMat);
      ridge.position.y = 10.0;
      ridge.rotation.y = (i * Math.PI) / 3;
      ridge.translateZ(2.1);
      this.group.add(ridge);
    }

    // Pulsing Crimson Hive Core / beacon sphere at top of spire
    const coreGeo = new THREE.SphereGeometry(1.6, 12, 10);
    this.hiveCore = new THREE.Mesh(coreGeo, crimsonGlowMat);
    this.hiveCore.position.y = 22.8;
    this.group.add(this.hiveCore);

    // 3. Perimeter Defense Pylons (3x)
    for (let i = 0; i < 3; i++) {
      const angle = (i * Math.PI * 2) / 3;
      const pylonGroup = new THREE.Group();
      pylonGroup.position.set(Math.cos(angle) * 11.5, 0, Math.sin(angle) * 11.5);

      const pylonGeo = new THREE.CylinderGeometry(0.8, 1.2, 7.5, 6);
      const pylonMesh = new THREE.Mesh(pylonGeo, darkChitinMat);
      pylonMesh.position.y = 3.75;
      pylonGroup.add(pylonMesh);

      const pylonTipGeo = new THREE.ConeGeometry(0.85, 2.2, 6);
      const pylonTip = new THREE.Mesh(pylonTipGeo, crimsonGlowMat);
      pylonTip.position.y = 8.5;
      pylonGroup.add(pylonTip);

      this.group.add(pylonGroup);
    }

    // 4. Landed Decorative Pod Ship on Docking Bay
    const dockedPod = new THREE.Group();
    dockedPod.position.set(0, 3.2, -7.5);
    const podHullGeo = new THREE.SphereGeometry(1.6, 10, 8);
    podHullGeo.scale(1, 0.8, 1.3);
    const podHull = new THREE.Mesh(podHullGeo, redArmorMat);
    dockedPod.add(podHull);

    const finGeo = new THREE.BoxGeometry(0.1, 1.1, 1.6);
    finGeo.rotateX(0.4);
    const dFin = new THREE.Mesh(finGeo, darkChitinMat);
    dFin.position.set(0, 1.0, 0.2);
    dockedPod.add(dFin);

    this.group.add(dockedPod);
  }

  _placeOnPlanet() {
    const pPos = this.planet.getWorldPosition();
    const elev = this.planet.getSurfaceElevation ? this.planet.getSurfaceElevation(this.direction) : (this.planet.radius || 360);
    this.position = pPos.clone().addScaledVector(this.direction, elev);
    this.group.position.copy(this.position);

    const up = this.direction.clone();
    const currentUp = new THREE.Vector3(0, 1, 0);
    const q = new THREE.Quaternion().setFromUnitVectors(currentUp, up);
    this.group.quaternion.copy(q);
  }

  update(dt) {
    if (this.hiveCore) {
      const scale = 1.0 + Math.sin(performance.now() * 0.005) * 0.15;
      this.hiveCore.scale.set(scale, scale, scale);
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

    this.crimsonBoltGeo = new THREE.CylinderGeometry(0.12, 0.12, 2.2, 6);
    this.crimsonBoltGeo.rotateX(Math.PI / 2);
    this.crimsonBoltMat = new THREE.MeshBasicMaterial({ color: 0xff1e46 });

    this._initFaction();
  }

  _initFaction() {
    // 1. Single Planetary Base on Aurelia Prime
    const outpostDir = new THREE.Vector3(0.28, 0.94, -0.19).normalize();
    this.outpost = new EnemyOutpostBase(this.planet, outpostDir);
    this.scene.add(this.outpost.group);

    // 2. Six Bug-Alien Troopers guarding the Outpost
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI * 2) / 6;
      const radius = 18.0 + (i % 2) * 12.0;
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
