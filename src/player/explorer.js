import * as THREE from 'three';
import { evaluateGravity } from '../world/gravity.js';
import { createCarbonFiberNormalMap, createMetalPanelsNormalMap } from '../world/procTextures.js';

/**
 * Density presets for character polygon scaling:
 * - low: 1x baseline (retro/ultra-fast)
 * - medium: 2x density (balanced)
 * - high: 3x density (Default — Triple Density sculpted high-fidelity meshes)
 * - ultra: 4x density (max cinematic fidelity)
 */
export const DENSITY_PRESETS = {
  low: {
    mult: 1,
    cylSegs: 7,
    sphereW: 9,
    sphereH: 7,
    torusRadial: 6,
    torusTubular: 12,
    tubeRadial: 5,
    tubeTubular: 8
  },
  medium: {
    mult: 2,
    cylSegs: 14,
    sphereW: 18,
    sphereH: 14,
    torusRadial: 8,
    torusTubular: 18,
    tubeRadial: 8,
    tubeTubular: 14
  },
  high: {
    mult: 3,
    cylSegs: 22,
    sphereW: 28,
    sphereH: 20,
    torusRadial: 12,
    torusTubular: 26,
    tubeRadial: 10,
    tubeTubular: 22
  },
  ultra: {
    mult: 4,
    cylSegs: 30,
    sphereW: 36,
    sphereH: 26,
    torusRadial: 16,
    torusTubular: 32,
    tubeRadial: 12,
    tubeTubular: 28
  }
};

/**
 * Third-person Explorer character with faithfully modeled sci-fi spacesuit:
 * - Scalable polygon count density (Triple Density by default, scalable in settings)
 * - True 2-bone hierarchical articulated limbs with bending knees and elbows
 * - Athletic sprinting kinematics with 20° torso lean, high knee drive, deep back-flex, and 90° arm pumps
 * - Multi-phase dynamic jump (takeoff crouch, aerial knee tuck with balance arms, and springy landing shock absorption)
 * - Helmet with sagittal crown crest, dark faceted visor, temple pods & collar seal
 * - Armored torso with off-white breastplate, dark harness, groin plate & belt
 * - Crystalline Jetpack Power Core: vertical hexagonal bipyramid crystal, dark bracket & 4 cyan conduit cables
 * - Floating companion drone / crystal familiar hovering beside shoulder
 */
export class Explorer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Explorer';

    this.currentDensity = 'high'; // Default: Triple Density (3x)
    this._initMaterials();
    this._buildCharacterFromSheet();
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.localUp = new THREE.Vector3(0, 1, 0);
    this.grounded = false;
    this.currentBody = null;
    this.altitude = 0;
    this.walkCycle = 0;
    this.animTime = 0;
    this.pitch = 0.22;
    this.cameraDistance = 14;
    this.jetpackFuel = 100;
    this.oxygen = 100;
    this.maxOxygen = 100;
    this.isSwimming = false;
    this.isSubmerged = false;
    this.waterDepth = 0;
    this.scannerPulseTimer = 0;

    // Jump & landing kinematics tracking
    this.jumpPhase = 'idle'; // 'idle' | 'crouch' | 'ascent' | 'descent' | 'land'
    this.jumpCooldown = 0;
    this.landingCompression = 0;
    this.wasGroundedLastFrame = true;
    this.prevVertSpeed = 0;

    // Suit Health, Combat & Upgrades
    this.maxSuitHealth = 100;
    this.suitHealth = 100;
    this.blasterDamage = 38;
    this.blasterCooldown = 0;
    this.plasmaProjectiles = [];
    this.firstPersonMode = false;

    // Weapon Ammunition Mechanic (Replenished by mining Silica Crystals)
    this.maxAmmo = 60;
    this.ammo = 40;

    // Void Aetherium & Exosuit Stat Boosts
    this.speedBoostMult = 1.0;
    this.jumpBoostMult = 1.0;
    this.voidCrystalsMined = 0;

    this.craftedUpgrades = {
      exosuit: false,
      rebreather: false,
      blasterOvercharge: false,
      shipPlating: false,
      goliathOverdrive: false
    };

    // Mineral & Xenology Resource Inventory
    this.inventory = {
      titanium: 0,
      crystal: 0,
      void_crystal: 0,
      chitin_shell: 0,
      apex_fang: 0,
      biolum_gland: 0,
      abyssal_pearl: 0,
      aero_membrane: 0
    };

    // Mining Laser Tool
    this.isMining = false;
    this.miningTarget = null;
    this._initMiningBeam();
  }

  /**
   * Applies cumulative Exosuit stat boosts from mining Void Aetherium on Goliath
   * and crafting the Aetherium Exosuit Overdrive upgrade:
   * - Movement & sprint speed multiplier (up to +70%)
   * - Jump impulse & jetpack thrust multiplier (up to +55%)
   * - Maximum shield strength (maxSuitHealth up to 275+ HP)
   * - Maximum oxygen capacity (maxOxygen up to 300+ O2)
   */
  applyVoidCrystalBoosts(addedCount = 1) {
    this.voidCrystalsMined += addedCount;
    const hasOverdrive = Boolean(this.craftedUpgrades.goliathOverdrive);

    // 1. Movement Speed Boost (+3% per crystal up to +45%, +25% with Overdrive)
    const passiveSpeed = Math.min(0.45, this.voidCrystalsMined * 0.03);
    this.speedBoostMult = 1.0 + passiveSpeed + (hasOverdrive ? 0.25 : 0.0);

    // 2. Jump & Jetpack Power Boost (+2.5% per crystal up to +35%, +20% with Overdrive)
    const passiveJump = Math.min(0.35, this.voidCrystalsMined * 0.025);
    this.jumpBoostMult = 1.0 + passiveJump + (hasOverdrive ? 0.20 : 0.0);

    // 3. Shield Strength (+5 Max HP per crystal up to +75, +50 with Overdrive, +50 with exosuit carapace)
    const baseHealth = 100 + (this.craftedUpgrades.exosuit ? 50 : 0);
    const passiveShield = Math.min(75, this.voidCrystalsMined * 5);
    const prevMax = this.maxSuitHealth;
    this.maxSuitHealth = baseHealth + passiveShield + (hasOverdrive ? 50 : 0);
    this.suitHealth = Math.min(this.maxSuitHealth, this.suitHealth + (this.maxSuitHealth - prevMax) + addedCount * 3);

    // 4. Oxygen Capacity (+8 Max O2 per crystal up to +120, +80 with Overdrive, +100 with rebreather)
    const baseO2 = 100 + (this.craftedUpgrades.rebreather ? 100 : 0);
    const passiveO2 = Math.min(120, this.voidCrystalsMined * 8);
    const prevMaxO2 = this.maxOxygen;
    this.maxOxygen = baseO2 + passiveO2 + (hasOverdrive ? 80 : 0);
    this.oxygen = Math.min(this.maxOxygen, this.oxygen + (this.maxOxygen - prevMaxO2) + addedCount * 5);

    if (hasOverdrive && this.maxAmmo < 90) {
      this.maxAmmo = 90;
      this.ammo = Math.min(this.maxAmmo, this.ammo + 20);
    }

    return {
      speedBoost: Math.round((this.speedBoostMult - 1.0) * 100),
      jumpBoost: Math.round((this.jumpBoostMult - 1.0) * 100),
      maxShield: this.maxSuitHealth,
      maxOxygen: this.maxOxygen,
      maxAmmo: this.maxAmmo
    };
  }

  setFirstPersonVisual(isFirstPerson) {
    this.firstPersonMode = Boolean(isFirstPerson);
    if (!this.visualRoot) return;
    if (this.head) this.head.visible = !this.firstPersonMode;
    if (this.companionDrone) this.companionDrone.visible = !this.firstPersonMode;
    if (this.leftLeg) this.leftLeg.visible = !this.firstPersonMode;
    if (this.rightLeg) this.rightLeg.visible = !this.firstPersonMode;
    if (this.torso) {
      this.torso.children.forEach((child) => {
        if (child !== this.rightArm) {
          child.visible = !this.firstPersonMode;
        } else {
          child.visible = true;
        }
      });
    }
  }

  takeDamage(amount = 10) {
    const mitigation = this.craftedUpgrades.exosuit ? 0.65 : 1.0;
    const damageTaken = Math.round(amount * mitigation);
    this.suitHealth = Math.max(0, this.suitHealth - damageTaken);
    const respawned = this.suitHealth <= 0;
    if (respawned) {
      this.suitHealth = this.maxSuitHealth;
    }
    return { damageTaken, respawned, suitHealth: this.suitHealth };
  }

  replenishAmmo(amount = 20) {
    const prev = this.ammo;
    this.ammo = Math.min(this.maxAmmo, this.ammo + amount);
    return this.ammo - prev;
  }

  firePlasmaBlaster(origin, direction) {
    if (this.ammo <= 0) {
      return { outOfAmmo: true, bolt: null };
    }
    if (this.blasterCooldown > 0) return null;
    this.ammo = Math.max(0, this.ammo - 1);
    this.blasterCooldown = this.craftedUpgrades.blasterOvercharge ? 0.16 : 0.24;

    const boltGeo = new THREE.SphereGeometry(0.16, 8, 8);
    boltGeo.scale(0.8, 0.8, 2.8);
    const boltColor = this.craftedUpgrades.blasterOvercharge ? 0xf72585 : 0x00f5d4;
    const boltMat = new THREE.MeshBasicMaterial({ color: boltColor });
    const mesh = new THREE.Mesh(boltGeo, boltMat);

    const startPos = origin
      ? origin.clone()
      : this.group.position.clone().addScaledVector(this.localUp, 1.55);
    const dir = direction
      ? direction.clone().normalize()
      : new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();

    mesh.position.copy(startPos).addScaledVector(dir, 0.7);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
    this.scene.add(mesh);

    const speed = this.craftedUpgrades.blasterOvercharge ? 88 : 68;
    const bolt = {
      mesh,
      velocity: dir.clone().multiplyScalar(speed),
      life: 1.8,
      damage: this.craftedUpgrades.blasterOvercharge ? 58 : this.blasterDamage
    };
    this.plasmaProjectiles.push(bolt);

    if (this.rightArm) {
      this.rightArm.rotation.x = -1.55;
    }
    return bolt;
  }

  updatePlasmaProjectiles(dt, faunaSystem, onHitFauna, enemyFaction = null) {
    if (this.blasterCooldown > 0) {
      this.blasterCooldown = Math.max(0, this.blasterCooldown - dt);
    }

    for (let i = this.plasmaProjectiles.length - 1; i >= 0; i--) {
      const b = this.plasmaProjectiles[i];
      b.life -= dt;
      const step = b.velocity.clone().multiplyScalar(dt);
      b.mesh.position.add(step);

      let hit = false;
      if (faunaSystem && Array.isArray(faunaSystem.entities)) {
        for (let j = 0; j < faunaSystem.entities.length; j++) {
          const e = faunaSystem.entities[j];
          if (e.dead) continue;
          const center = e.group.position.clone().addScaledVector(e.localDir, 1.0);
          const dist = b.mesh.position.distanceTo(center);
          if (dist <= (e.species.hitRadius || 2.0) + 0.45) {
            const res = e.takeDamage(b.damage);
            hit = true;
            if (onHitFauna) onHitFauna(res, e);
            break;
          }
        }
      }

      if (!hit && enemyFaction && typeof enemyFaction.takeDamageAtPoint === 'function') {
        const eHit = enemyFaction.takeDamageAtPoint(b.mesh.position, 1.2, b.damage);
        if (eHit && eHit.hit) {
          hit = true;
          if (onHitFauna) onHitFauna(eHit, eHit.target);
        }
      }

      if (hit || b.life <= 0) {
        this.scene.remove(b.mesh);
        if (b.mesh.geometry) b.mesh.geometry.dispose();
        if (b.mesh.material) b.mesh.material.dispose();
        this.plasmaProjectiles.splice(i, 1);
      }
    }
  }

  _initMiningBeam() {
    const beamGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.0, 8);
    beamGeo.translate(0, 0.5, 0);
    beamGeo.rotateX(Math.PI / 2);
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4,
      transparent: true,
      opacity: 0.88,
      blending: THREE.AdditiveBlending
    });
    this.miningBeamMesh = new THREE.Mesh(beamGeo, beamMat);
    this.miningBeamMesh.visible = false;
    this.scene.add(this.miningBeamMesh);
  }

  setMiningTarget(targetPos, isMining = true) {
    this.isMining = isMining;
    this.miningTarget = targetPos ? targetPos.clone() : null;
    if (!this.miningBeamMesh) return;

    if (this.isMining && this.miningTarget) {
      const start = this.group.position.clone().addScaledVector(this.localUp, 1.25);
      const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion);
      start.addScaledVector(right, 0.38);

      const toTarget = this.miningTarget.clone().sub(start);
      const dist = toTarget.length();
      if (dist > 0.001) {
        this.miningBeamMesh.position.copy(start);
        this.miningBeamMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), toTarget.clone().normalize());
        this.miningBeamMesh.scale.set(1.0 + Math.sin(performance.now() * 0.03) * 0.25, 1.0 + Math.cos(performance.now() * 0.03) * 0.25, dist);
        this.miningBeamMesh.visible = true;
      }
    } else {
      this.miningBeamMesh.visible = false;
    }
  }

  resolveShipCollision(ship) {
    if (!ship || !ship.landed) return;
    const d = this.group.position.distanceTo(ship.group.position);
    if (d > 9.5) return;

    // Transform explorer position into ship's local coordinate frame
    const localPos = ship.group.worldToLocal(this.group.position.clone());

    // Starfighter bounding box half-extents in local frame:
    // X: [-2.6, 2.6], Y: [0.0, 2.4], Z: [-5.2, 4.2]
    const minX = -2.6, maxX = 2.6;
    const minY = 0.0, maxY = 2.4;
    const minZ = -5.2, maxZ = 4.2;

    if (localPos.x > minX && localPos.x < maxX &&
        localPos.y > minY && localPos.y < maxY &&
        localPos.z > minZ && localPos.z < maxZ) {
      // Find shortest penetration escape axis
      const dx1 = localPos.x - minX;
      const dx2 = maxX - localPos.x;
      const dz1 = localPos.z - minZ;
      const dz2 = maxZ - localPos.z;

      const minPen = Math.min(dx1, dx2, dz1, dz2);
      if (minPen === dx1) localPos.x = minX - 0.12;
      else if (minPen === dx2) localPos.x = maxX + 0.12;
      else if (minPen === dz1) localPos.z = minZ - 0.12;
      else localPos.z = maxZ + 0.12;

      // Transform back to world space
      this.group.position.copy(ship.group.localToWorld(localPos));
    }
  }

  _initMaterials() {
    let carbonFiberMap = null;
    let metalPanelsMap = null;
    try {
      carbonFiberMap = createCarbonFiberNormalMap();
      metalPanelsMap = createMetalPanelsNormalMap();
    } catch (e) {
      console.warn('Proc textures not available in environment:', e);
    }

    // Faithfully matching Model Sheet Input 1:
    // Warm off-white / bone-cream composite armor plates, dark slate joints, dark smoky visor, radiant cyan power crystal
    this.armorMat = new THREE.MeshStandardMaterial({
      color: 0xdcd7cf,
      roughness: 0.38,
      metalness: 0.62,
      normalMap: carbonFiberMap,
      normalScale: carbonFiberMap ? new THREE.Vector2(0.4, 0.4) : undefined,
      flatShading: false
    });

    this.darkMat = new THREE.MeshStandardMaterial({
      color: 0x2b363e,
      roughness: 0.65,
      metalness: 0.25,
      normalMap: carbonFiberMap,
      normalScale: carbonFiberMap ? new THREE.Vector2(0.5, 0.5) : undefined,
      flatShading: false
    });

    this.visorMat = new THREE.MeshStandardMaterial({
      color: 0x1f2830,
      emissive: 0x081018,
      emissiveIntensity: 0.15,
      roughness: 0.12,
      metalness: 0.96,
      flatShading: false
    });

    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00d2b4,
      emissiveIntensity: 1.3,
      roughness: 0.15,
      metalness: 0.40,
      flatShading: false
    });

    this.conduitMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4
    });

    this.accentMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00c4aa,
      emissiveIntensity: 0.55,
      roughness: 0.30,
      flatShading: false
    });

    this.soleMat = new THREE.MeshStandardMaterial({
      color: 0x202930,
      roughness: 0.85,
      flatShading: false
    });

    this.crestMat = new THREE.MeshStandardMaterial({
      color: 0xd5d0c7,
      roughness: 0.35,
      metalness: 0.65,
      normalMap: metalPanelsMap,
      normalScale: metalPanelsMap ? new THREE.Vector2(0.4, 0.4) : undefined,
      flatShading: false
    });
  }

  setPolygonDensity(densityKey = 'high') {
    if (!DENSITY_PRESETS[densityKey]) densityKey = 'high';
    if (this.currentDensity === densityKey && this.visualRoot) return;
    this.currentDensity = densityKey;
    this._rebuildCharacterMeshes();
  }

  _rebuildCharacterMeshes() {
    if (this.visualRoot) {
      // Dispose old geometries
      this.visualRoot.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          obj.geometry.dispose();
        }
      });
      this.group.remove(this.visualRoot);
      this.visualRoot = null;
    }
    this._buildCharacterFromSheet();
  }

  getPolygonCount() {
    let triangles = 0;
    let vertices = 0;
    if (this.visualRoot) {
      this.visualRoot.traverse((obj) => {
        if (obj.isMesh && obj.geometry) {
          if (obj.geometry.index) {
            triangles += obj.geometry.index.count / 3;
          } else if (obj.geometry.attributes.position) {
            triangles += obj.geometry.attributes.position.count / 3;
          }
          if (obj.geometry.attributes.position) {
            vertices += obj.geometry.attributes.position.count;
          }
        }
      });
    }
    return { triangles: Math.round(triangles), vertices };
  }

  _buildCharacterFromSheet() {
    const preset = DENSITY_PRESETS[this.currentDensity] || DENSITY_PRESETS.high;
    const { cylSegs, sphereW, sphereH, torusRadial, torusTubular, tubeRadial, tubeTubular } = preset;

    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    const armorMat = this.armorMat;
    const darkMat = this.darkMat;
    const visorMat = this.visorMat;
    const conduitMat = this.conduitMat;
    const accentMat = this.accentMat;
    const soleMat = this.soleMat;
    const crestMat = this.crestMat;

    // 1. Torso & Abdomen
    this.torso = new THREE.Group();
    this.torso.position.y = 1.55;
    this.visualRoot.add(this.torso);

    // Chest Breastplate (high density contoured upper torso)
    const chestGeo = new THREE.CylinderGeometry(0.44, 0.36, 0.62, cylSegs);
    chestGeo.rotateY(Math.PI / cylSegs);
    const chestMesh = new THREE.Mesh(chestGeo, armorMat);
    chestMesh.position.y = 0.28;
    this.torso.add(chestMesh);

    // Dark shoulder straps / collar armor
    const strapGeo = new THREE.BoxGeometry(0.78, 0.16, 0.44);
    const strapMesh = new THREE.Mesh(strapGeo, darkMat);
    strapMesh.position.set(0, 0.54, 0);
    this.torso.add(strapMesh);

    // Abdomen & Spine Flex Joint (dark contoured midsection)
    const midriffGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.36, cylSegs);
    const midriffMesh = new THREE.Mesh(midriffGeo, darkMat);
    midriffMesh.position.y = -0.15;
    this.torso.add(midriffMesh);

    // Belt Ring with side buckle clips
    const beltGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.12, cylSegs);
    const beltMesh = new THREE.Mesh(beltGeo, darkMat);
    beltMesh.position.y = -0.32;
    this.torso.add(beltMesh);

    // Pelvis Armor
    const pelvisGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.28, cylSegs);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, armorMat);
    pelvisMesh.position.y = -0.50;
    this.torso.add(pelvisMesh);

    // Dark triangular groin armor plate in front
    const groinGeo = new THREE.ConeGeometry(0.18, 0.28, Math.max(4, Math.floor(cylSegs / 4)));
    groinGeo.rotateX(Math.PI);
    const groinMesh = new THREE.Mesh(groinGeo, darkMat);
    groinMesh.position.set(0, -0.48, -0.24);
    this.torso.add(groinMesh);

    // 2. Head & Helmet (High density smooth dome)
    this.head = new THREE.Group();
    this.head.position.y = 0.76;
    this.torso.add(this.head);

    // Collar seal ring
    const collarGeo = new THREE.TorusGeometry(0.24, 0.05, torusRadial, torusTubular);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, darkMat);
    collarMesh.position.y = -0.12;
    this.head.add(collarMesh);

    // Helmet Dome
    const domeGeo = new THREE.SphereGeometry(0.38, sphereW, sphereH);
    domeGeo.scale(0.95, 1.05, 1.05);
    const domeMesh = new THREE.Mesh(domeGeo, armorMat);
    this.head.add(domeMesh);

    // Crown Crest (ornamental 3-pronged sagittal fan crest matching Model Sheet Input 1)
    const crestGroup = new THREE.Group();
    const crestSeg1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, Math.max(4, Math.floor(cylSegs / 3))), crestMat);
    crestSeg1.rotation.set(Math.PI * 0.35, 0, 0);
    crestSeg1.position.set(0, 0.35, 0.05);

    const crestSeg2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, Math.max(4, Math.floor(cylSegs / 3))), crestMat);
    crestSeg2.rotation.set(Math.PI * 0.18, 0, 0);
    crestSeg2.position.set(0, 0.38, -0.12);

    const crestSeg3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.48), crestMat);
    crestSeg3.position.set(0, 0.32, -0.04);

    // Left and right flaring forehead crown ridges (as seen in Input 1 front view)
    const sideCrestGeo = new THREE.ConeGeometry(0.065, 0.28, 4);
    sideCrestGeo.rotateX(Math.PI * 0.30);
    sideCrestGeo.rotateZ(0.35);
    const leftCrestFin = new THREE.Mesh(sideCrestGeo, crestMat);
    leftCrestFin.position.set(-0.11, 0.33, -0.08);

    const rightCrestFin = new THREE.Mesh(sideCrestGeo.clone(), crestMat);
    rightCrestFin.geometry.rotateZ(-0.70);
    rightCrestFin.position.set(0.11, 0.33, -0.08);

    crestGroup.add(crestSeg1, crestSeg2, crestSeg3, leftCrestFin, rightCrestFin);
    this.head.add(crestGroup);

    // Dark Faceted Visor Plate (angled front faceplate)
    const visorGeo = new THREE.BoxGeometry(0.44, 0.28, 0.28);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.02, -0.24);
    visorMesh.rotation.x = -0.16;
    this.head.add(visorMesh);

    // Visor chin guard / lower jaw rim
    const chinGeo = new THREE.BoxGeometry(0.34, 0.12, 0.26);
    const chinMesh = new THREE.Mesh(chinGeo, darkMat);
    chinMesh.position.set(0, -0.16, -0.22);
    this.head.add(chinMesh);

    // Temple Sensor Pods (triangular faceted ear nodules matching Input 1)
    const podGeo = new THREE.ConeGeometry(0.09, 0.15, 3);
    podGeo.rotateZ(Math.PI / 2);
    const leftPod = new THREE.Mesh(podGeo, darkMat);
    leftPod.position.set(-0.36, 0.02, 0);
    const rightPod = new THREE.Mesh(podGeo.clone(), darkMat);
    rightPod.geometry.rotateZ(Math.PI);
    rightPod.position.set(0.36, 0.02, 0);
    this.head.add(leftPod, rightPod);

    // 3. Backpack Power Core ("Crystalline Jetpack")
    this.jetpack = new THREE.Group();
    this.jetpack.position.set(0, 0.22, 0.32);
    this.torso.add(this.jetpack);

    // Dark mounting frame / bracket
    const frameGeo = new THREE.BoxGeometry(0.46, 0.62, 0.22);
    const frameMesh = new THREE.Mesh(frameGeo, darkMat);
    this.jetpack.add(frameMesh);

    // Dual vertical glowing cyan power bars on frame back
    const barGeo = new THREE.BoxGeometry(0.035, 0.46, 0.02);
    const leftBar = new THREE.Mesh(barGeo, conduitMat);
    leftBar.position.set(-0.14, 0, 0.115);
    const rightBar = new THREE.Mesh(barGeo, conduitMat);
    rightBar.position.set(0.14, 0, 0.115);
    this.jetpack.add(leftBar, rightBar);

    // Vertical Hexagonal Crystal Bipyramid
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(0, 0, 0.06);

    const hexShaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, Math.max(6, Math.floor(cylSegs * 0.75)));
    const hexShaft = new THREE.Mesh(hexShaftGeo, this.crystalMat);

    const hexTopGeo = new THREE.ConeGeometry(0.18, 0.38, Math.max(6, Math.floor(cylSegs * 0.75)));
    const hexTop = new THREE.Mesh(hexTopGeo, this.crystalMat);
    hexTop.position.y = 0.515;

    const hexBottomGeo = new THREE.ConeGeometry(0.18, 0.38, Math.max(6, Math.floor(cylSegs * 0.75)));
    hexBottomGeo.rotateX(Math.PI);
    const hexBottom = new THREE.Mesh(hexBottomGeo, this.crystalMat);
    hexBottom.position.y = -0.515;

    crystalGroup.add(hexShaft, hexTop, hexBottom);
    this.crystalCore = crystalGroup;
    this.jetpack.add(crystalGroup);

    // 4 Curved Glowing Conduit Cables
    const buildConduitCurve = (p0, p1, p2) => {
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, tubeTubular, 0.022, tubeRadial, false);
      return new THREE.Mesh(tubeGeo, conduitMat);
    };

    const cableUL = buildConduitCurve(
      new THREE.Vector3(-0.16, 0.18, 0.06),
      new THREE.Vector3(-0.36, 0.12, -0.05),
      new THREE.Vector3(-0.28, 0.04, -0.22)
    );
    const cableUR = buildConduitCurve(
      new THREE.Vector3(0.16, 0.18, 0.06),
      new THREE.Vector3(0.36, 0.12, -0.05),
      new THREE.Vector3(0.28, 0.04, -0.22)
    );
    const cableLL = buildConduitCurve(
      new THREE.Vector3(-0.16, -0.16, 0.06),
      new THREE.Vector3(-0.38, -0.22, -0.05),
      new THREE.Vector3(-0.24, -0.25, -0.22)
    );
    const cableLR = buildConduitCurve(
      new THREE.Vector3(0.16, -0.16, 0.06),
      new THREE.Vector3(0.38, -0.22, -0.05),
      new THREE.Vector3(0.24, -0.25, -0.22)
    );
    this.jetpack.add(cableUL, cableUR, cableLL, cableLR);

    // Dual Jetpack Thruster Nozzles & Boost Flames
    const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.18, cylSegs);
    nozzleGeo.rotateX(Math.PI);
    const leftNozzle = new THREE.Mesh(nozzleGeo, darkMat);
    leftNozzle.position.set(-0.14, -0.42, 0);
    const rightNozzle = new THREE.Mesh(nozzleGeo, darkMat);
    rightNozzle.position.set(0.14, -0.42, 0);
    this.jetpack.add(leftNozzle, rightNozzle);

    const flameGeo = new THREE.ConeGeometry(0.14, 0.85, cylSegs);
    flameGeo.rotateX(Math.PI);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.9 });

    this.jetFlameLeft = new THREE.Mesh(flameGeo, flameMat);
    this.jetFlameLeft.position.set(-0.14, -0.92, 0);
    this.jetFlameLeft.visible = false;

    this.jetFlameRight = new THREE.Mesh(flameGeo, flameMat);
    this.jetFlameRight.position.set(0.14, -0.92, 0);
    this.jetFlameRight.visible = false;

    this.jetpack.add(this.jetFlameLeft, this.jetFlameRight);

    // 4. Floating Companion Drone ("Hovering Crystal Familiar")
    this.companionDrone = new THREE.Group();
    this.companionDrone.position.set(0.62, 2.38, -0.18);
    this.visualRoot.add(this.companionDrone);

    const droneCoreGeo = new THREE.OctahedronGeometry(0.13, Math.max(0, Math.floor(preset.mult - 1)));
    const droneCore = new THREE.Mesh(droneCoreGeo, this.crystalMat);
    const droneHaloGeo = new THREE.TorusGeometry(0.20, 0.02, torusRadial, torusTubular);
    droneHaloGeo.rotateX(Math.PI * 0.35);
    const droneHalo = new THREE.Mesh(droneHaloGeo, darkMat);
    this.companionDrone.add(droneCore, droneHalo);

    // 5. Articulated 2-Bone Arms with Bending Elbows
    // Left Arm (Shoulder Joint)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.44, 0);
    this.torso.add(this.leftArm);

    // Shoulder Pauldron Guard
    const pauldronGeo = new THREE.SphereGeometry(0.14, sphereW, sphereH);
    pauldronGeo.scale(1.1, 0.75, 1.0);
    const leftPauldron = new THREE.Mesh(pauldronGeo, armorMat);
    leftPauldron.position.set(-0.02, 0.02, 0);
    this.leftArm.add(leftPauldron);

    // Upper Arm (bicep/tricep)
    const armUpperGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.38, cylSegs);
    armUpperGeo.translate(0, -0.19, 0);
    const leftUpperArm = new THREE.Mesh(armUpperGeo, armorMat);
    this.leftArm.add(leftUpperArm);

    // Left Forearm Group (Elbow Joint Child)
    this.leftForearmGroup = new THREE.Group();
    this.leftForearmGroup.position.set(0, -0.38, 0);
    this.leftArm.add(this.leftForearmGroup);

    // Left Elbow Joint (dark flex sleeve)
    const elbowGeo = new THREE.SphereGeometry(0.095, sphereW, sphereH);
    const leftElbow = new THREE.Mesh(elbowGeo, darkMat);
    this.leftForearmGroup.add(leftElbow);

    // Left Forearm Gauntlet
    const armForeGeo = new THREE.CylinderGeometry(0.10, 0.08, 0.40, cylSegs);
    armForeGeo.translate(0, -0.20, 0);
    const leftForearm = new THREE.Mesh(armForeGeo, armorMat);
    this.leftForearmGroup.add(leftForearm);

    // Wrist console / communicator pad on left forearm (matching Model Sheet Input 1)
    const wristPadHousing = new THREE.BoxGeometry(0.08, 0.16, 0.07);
    const wristHousingMesh = new THREE.Mesh(wristPadHousing, darkMat);
    wristHousingMesh.position.set(-0.08, -0.20, 0.02);
    this.leftForearmGroup.add(wristHousingMesh);

    const wristScreenGeo = new THREE.BoxGeometry(0.02, 0.11, 0.045);
    const wristScreen = new THREE.Mesh(wristScreenGeo, accentMat);
    wristScreen.position.set(-0.125, -0.20, 0.02);
    this.leftForearmGroup.add(wristScreen);

    // Left Tactical Glove
    const handGeo = new THREE.BoxGeometry(0.09, 0.14, 0.12);
    handGeo.translate(0, -0.07, 0);
    const leftHand = new THREE.Mesh(handGeo, darkMat);
    leftHand.position.y = -0.40;
    this.leftForearmGroup.add(leftHand);

    // Right Arm (Shoulder Joint)
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.44, 0);
    this.torso.add(this.rightArm);

    const rightPauldron = new THREE.Mesh(pauldronGeo, armorMat);
    rightPauldron.position.set(0.02, 0.02, 0);
    this.rightArm.add(rightPauldron);

    const rightUpperArm = new THREE.Mesh(armUpperGeo, armorMat);
    this.rightArm.add(rightUpperArm);

    // Right Forearm Group (Elbow Joint Child)
    this.rightForearmGroup = new THREE.Group();
    this.rightForearmGroup.position.set(0, -0.38, 0);
    this.rightArm.add(this.rightForearmGroup);

    const rightElbow = new THREE.Mesh(elbowGeo, darkMat);
    this.rightForearmGroup.add(rightElbow);

    const rightForearm = new THREE.Mesh(armForeGeo, armorMat);
    this.rightForearmGroup.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, darkMat);
    rightHand.position.y = -0.40;
    this.rightForearmGroup.add(rightHand);

    // 6. Articulated 2-Bone Legs with Bending Knees
    // Left Leg (Hip Joint)
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.21, 0.95, 0);
    this.visualRoot.add(this.leftLeg);

    // Left Thigh
    const thighGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.46, cylSegs);
    thighGeo.translate(0, -0.23, 0);
    const leftThigh = new THREE.Mesh(thighGeo, armorMat);
    this.leftLeg.add(leftThigh);

    // Left Lower Leg Group (Knee Joint Child)
    this.leftLowerLegGroup = new THREE.Group();
    this.leftLowerLegGroup.position.set(0, -0.46, 0);
    this.leftLeg.add(this.leftLowerLegGroup);

    // Left Knee Joint Sphere
    const kneeJointGeo = new THREE.SphereGeometry(0.105, sphereW, sphereH);
    const leftKneeJoint = new THREE.Mesh(kneeJointGeo, darkMat);
    this.leftLowerLegGroup.add(leftKneeJoint);

    // Left Knee Pad (armored hexagonal guard in front)
    const kneePadGeo = new THREE.BoxGeometry(0.16, 0.14, 0.08);
    const leftKneePad = new THREE.Mesh(kneePadGeo, darkMat);
    leftKneePad.position.set(0, 0, -0.08);
    this.leftLowerLegGroup.add(leftKneePad);

    // Left Shin / Calf
    const shinGeo = new THREE.CylinderGeometry(0.11, 0.098, 0.42, cylSegs);
    shinGeo.translate(0, -0.21, 0);
    const leftShin = new THREE.Mesh(shinGeo, armorMat);
    this.leftLowerLegGroup.add(leftShin);

    // Left Ankle Cuff
    const cuffGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, cylSegs);
    const leftCuff = new THREE.Mesh(cuffGeo, darkMat);
    leftCuff.position.set(0, -0.42, 0);
    this.leftLowerLegGroup.add(leftCuff);

    // Left Boot & Sole
    const bootGeo = new THREE.BoxGeometry(0.17, 0.14, 0.28);
    bootGeo.translate(0, -0.07, -0.05);
    const leftBoot = new THREE.Mesh(bootGeo, armorMat);
    leftBoot.position.y = -0.44;

    const soleGeo = new THREE.BoxGeometry(0.18, 0.04, 0.30);
    soleGeo.translate(0, -0.02, -0.05);
    const leftSole = new THREE.Mesh(soleGeo, soleMat);
    leftSole.position.y = -0.56;
    this.leftLowerLegGroup.add(leftBoot, leftSole);

    // Right Leg (Hip Joint)
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.21, 0.95, 0);
    this.visualRoot.add(this.rightLeg);

    const rightThigh = new THREE.Mesh(thighGeo, armorMat);
    this.rightLeg.add(rightThigh);

    // Right Lower Leg Group (Knee Joint Child)
    this.rightLowerLegGroup = new THREE.Group();
    this.rightLowerLegGroup.position.set(0, -0.46, 0);
    this.rightLeg.add(this.rightLowerLegGroup);

    const rightKneeJoint = new THREE.Mesh(kneeJointGeo, darkMat);
    this.rightLowerLegGroup.add(rightKneeJoint);

    const rightKneePad = new THREE.Mesh(kneePadGeo, darkMat);
    rightKneePad.position.set(0, 0, -0.08);
    this.rightLowerLegGroup.add(rightKneePad);

    const rightShin = new THREE.Mesh(shinGeo, armorMat);
    this.rightLowerLegGroup.add(rightShin);

    const rightCuff = new THREE.Mesh(cuffGeo, darkMat);
    rightCuff.position.set(0, -0.42, 0);
    this.rightLowerLegGroup.add(rightCuff);

    const rightBoot = new THREE.Mesh(bootGeo, armorMat);
    rightBoot.position.y = -0.44;
    const rightSole = new THREE.Mesh(soleGeo, soleMat);
    rightSole.position.y = -0.56;
    this.rightLowerLegGroup.add(rightBoot, rightSole);

    this.visualRoot.traverse((child) => {
      if (child.isMesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  spawnOnBody(body, dirVector = new THREE.Vector3(0, 1, 0)) {
    const dir = dirVector.clone().normalize();
    const surfaceR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
    const bodyPos = body.getWorldPosition();
    this.group.position.copy(bodyPos).addScaledVector(dir, surfaceR + 0.15);

    this.localUp.copy(dir);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.group.quaternion.copy(alignQuat);
    this.velocity.set(0, 0, 0);
    this.currentBody = body;
    this.grounded = true;
    this.jumpPhase = 'idle';
  }

  update(dt, input, mouseFrame, bodies, ship = null) {
    this.animTime += dt;

    // 1. Evaluate spherical gravity & dominant body
    const grav = evaluateGravity(this.group.position, bodies);
    const body = grav.body;
    this.currentBody = body;
    this.altitude = Math.max(0, grav.altitude);

    // Ride along with orbiting moon if on or near it
    if (body && body.deltaPosition) {
      this.group.position.add(body.deltaPosition);
    }

    const newUp = new THREE.Vector3(grav.up.x, grav.up.y, grav.up.z).normalize();

    // 2. Align character's local +Y with planet surface normal (pole-safe incremental rotation)
    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
    const alignDelta = new THREE.Quaternion().setFromUnitVectors(currentUp, newUp);
    this.group.quaternion.premultiply(alignDelta);
    this.group.quaternion.normalize();
    this.localUp.copy(newUp);

    // 3. Mouse yaw (around localUp) + pitch + wheel zoom + stick look
    const stickYaw = (input.lookVelX || 0) * 2.4 * dt;
    const yawRate = -mouseFrame.dx * 0.0032 - stickYaw;
    const keyTurn = (input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0);
    const totalYaw = yawRate + keyTurn * 1.9 * dt;
    if (Math.abs(totalYaw) > 1e-6) {
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(newUp, totalYaw);
      this.group.quaternion.premultiply(yawQuat);
    }

    const stickPitch = (input.lookVelY || 0) * 1.8 * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch + mouseFrame.dy * 0.0026 + stickPitch, -0.45, 1.15);
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + mouseFrame.wheel * 1.4, 6, 30);

    // 4. Local forward (-Z) and right (+X) tangent to the sphere
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();

    let moveF = input.moveY || 0;
    let moveR = input.moveX || 0;
    const isFwd = (input.isActionDown ? input.isActionDown('moveForward') : false) || input.isDown('KeyW') || input.isDown('ArrowUp');
    const isBwd = (input.isActionDown ? input.isActionDown('moveBackward') : false) || input.isDown('KeyS') || input.isDown('ArrowDown');
    const isRight = (input.isActionDown ? input.isActionDown('strafeRight') : false) || input.isDown('KeyD') || input.isDown('ArrowRight');
    const isLeft = (input.isActionDown ? input.isActionDown('strafeLeft') : false) || input.isDown('KeyA') || input.isDown('ArrowLeft');

    if (isFwd) moveF += 1;
    if (isBwd) moveF -= 1;
    if (isRight) moveR += 1;
    if (isLeft) moveR -= 1;

    const stickMag = Math.hypot(input.moveX || 0, input.moveY || 0);
    const isSprinting = ((input.isActionDown ? input.isActionDown('sprint') : false) || input.isDown('ShiftLeft') || input.isDown('ShiftRight')) || stickMag > 0.88;
    const baseSpeed = isSprinting ? 28 : 16;
    const speedScale = stickMag > 0 ? Math.min(1.0, Math.max(0.4, stickMag)) : 1.0;
    const moveSpeed = baseSpeed * speedScale * (this.speedBoostMult || 1.0);

    // Detect water depth on bodies with an ocean
    let inWater = false;
    let distFromCenter = 0;
    let seaR = 0;
    let terrainHeight = 0;

    if (body) {
      const bPos = body.getWorldPosition();
      distFromCenter = this.group.position.distanceTo(bPos);
      const rel = this.group.position.clone().sub(bPos);
      const dirNorm = rel.clone().normalize();
      terrainHeight = body.getSurfaceRadiusAtDir(dirNorm.x, dirNorm.y, dirNorm.z);
      const bases = body.outpostBases || (body.outpostBase ? [body.outpostBase] : []);
      for (let i = 0; i < bases.length; i++) {
        if (typeof bases[i].getFloorRadius === 'function') {
          const outpostR = bases[i].getFloorRadius(this.group.position);
          if (outpostR > terrainHeight) {
            terrainHeight = outpostR;
          }
        }
      }
      seaR = body.seaLevelRadius || 0;

      if (body.hasOcean && seaR > 0) {
        this.waterDepth = Math.max(0, seaR - distFromCenter);
        inWater = (distFromCenter <= seaR + 0.35 && terrainHeight < seaR);
        this.isSwimming = inWater && (this.waterDepth > 0.4 || (distFromCenter < seaR - 0.2));
        this.isSubmerged = inWater && (this.waterDepth > 1.65);
      } else {
        this.waterDepth = 0;
        this.isSwimming = false;
        this.isSubmerged = false;
      }
    }

    // Oxygen consumption and replenishment
    if (this.isSubmerged) {
      this.oxygen = Math.max(0, this.oxygen - 3.34 * dt);
    } else {
      this.oxygen = Math.min(this.maxOxygen, this.oxygen + 38.0 * dt);
    }

    // Move direction in tangent plane
    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveF)
      .addScaledVector(right, moveR);
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    // In water, swimming forward can pitch down if looking downwards
    if (this.isSwimming && moveF > 0 && this.pitch < 0) {
      const divePitchStrength = -this.pitch * 0.75;
      moveDir.addScaledVector(newUp, -divePitchStrength).normalize();
    }

    // Tangential & vertical velocity components
    const vertSpeed = this.velocity.dot(newUp);
    const vertVel = newUp.clone().multiplyScalar(vertSpeed);
    const swimSpeedMult = this.isSwimming ? 0.65 : 1.0;
    const tangentVel = moveDir.multiplyScalar(moveSpeed * swimSpeedMult);

    this.velocity.copy(tangentVel).add(vertVel);

    // 5. Gravity, Buoyancy & Jump / Dive / Jetpack
    let isBoosting = false;
    const wantsJump = (input.wasActionPressed ? input.wasActionPressed('jump') : false) || input.wasPressed('Space');
    const holdingJump = (input.isActionDown ? input.isActionDown('jump') : false) || input.isDown('Space');
    const wantsDive = (input.isActionDown ? input.isActionDown('dive') : false) || input.isDown('KeyC');

    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    if (this.isSwimming) {
      const targetSurfaceR = seaR - 0.45;
      const buoyancyDelta = targetSurfaceR - distFromCenter;
      if (buoyancyDelta > 0) {
        this.velocity.addScaledVector(newUp, Math.min(22.0, buoyancyDelta * 14.0) * dt);
      }
      this.velocity.multiplyScalar(Math.exp(-3.2 * dt));

      if (holdingJump) {
        this.velocity.addScaledVector(newUp, 22.0 * dt);
        if (distFromCenter >= targetSurfaceR - 0.25 && wantsJump) {
          this.velocity.addScaledVector(newUp, 14.5 * (this.jumpBoostMult || 1.0));
          this.jumpCooldown = 0.35;
          this.jumpPhase = 'ascent';
        }
      } else if (wantsDive) {
        this.velocity.addScaledVector(newUp, -24.0 * dt);
      }

      if (this.oxygen <= 0.01) {
        this.velocity.addScaledVector(newUp, 42.0 * dt);
      }

      this.velocity.x += grav.acceleration.x * 0.25 * dt;
      this.velocity.y += grav.acceleration.y * 0.25 * dt;
      this.velocity.z += grav.acceleration.z * 0.25 * dt;
    } else {
      // Standard dry land gravity & jumping / jetpack
      this.velocity.x += grav.acceleration.x * dt;
      this.velocity.y += grav.acceleration.y * dt;
      this.velocity.z += grav.acceleration.z * dt;

      if (this.grounded && (wantsJump || (holdingJump && this.jumpCooldown <= 0))) {
        this.velocity.addScaledVector(newUp, 15.5 * (this.jumpBoostMult || 1.0));
        this.grounded = false;
        this.jumpCooldown = 0.25;
        this.jumpPhase = 'ascent';
      } else if (!this.grounded && holdingJump && this.jetpackFuel > 0) {
        this.velocity.addScaledVector(newUp, 38 * (this.jumpBoostMult || 1.0) * dt);
        this.jetpackFuel = Math.max(0, this.jetpackFuel - 34 * dt);
        isBoosting = true;
      } else {
        if (this.grounded) {
          this.jetpackFuel = Math.min(100, this.jetpackFuel + 45 * dt);
        }
      }
    }

    // Jetpack flame cones & crystal power surge
    if (this.jetFlameLeft && this.jetFlameRight) {
      this.jetFlameLeft.visible = isBoosting;
      this.jetFlameRight.visible = isBoosting;
      if (isBoosting) {
        const flamePulse = 1.0 + Math.sin(this.animTime * 28) * 0.2;
        this.jetFlameLeft.scale.set(1, flamePulse, 1);
        this.jetFlameRight.scale.set(1, flamePulse, 1);
        this.crystalMat.emissiveIntensity = 1.6;
      } else {
        this.crystalMat.emissiveIntensity = 0.92;
      }
    }

    // 6. Integrate position, resolve solid flora collision & snap to terrain / seabed
    this.group.position.addScaledVector(this.velocity, dt);
    this.suitHealth = Math.min(this.maxSuitHealth, this.suitHealth + 1.5 * dt);

    if (body) {
      if (typeof body.resolveFloraCollision === 'function') {
        body.resolveFloraCollision(this.group.position, 0.55);
      }
      const bases = body.outpostBases || (body.outpostBase ? [body.outpostBase] : []);
      for (let i = 0; i < bases.length; i++) {
        if (typeof bases[i].resolveCollision === 'function') {
          bases[i].resolveCollision(this.group.position, 0.55);
        }
      }

      const bPos = body.getWorldPosition();
      const rel = this.group.position.clone().sub(bPos);
      const dist = rel.length() || 1;
      const dir = rel.divideScalar(dist);
      const terrainR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
      let effectiveFloorR = terrainR;
      for (let i = 0; i < bases.length; i++) {
        if (typeof bases[i].getFloorRadius === 'function') {
          const outpostR = bases[i].getFloorRadius(this.group.position);
          if (outpostR > effectiveFloorR) {
            effectiveFloorR = outpostR;
          }
        }
      }
      const floorLimit = effectiveFloorR + 0.15;

      if (dist <= floorLimit + 0.05) {
        this.group.position.copy(bPos).addScaledVector(dir, floorLimit);
        const vDot = this.velocity.dot(dir);
        if (vDot < 0) {
          this.velocity.addScaledVector(dir, -vDot);
        }
        if (!this.grounded && !this.isSwimming) {
          // Landing impact detection
          if (this.prevVertSpeed < -2.0) {
            this.landingCompression = Math.min(0.28, Math.abs(this.prevVertSpeed) * 0.018);
            this.jumpPhase = 'land';
          }
        }
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    // Resolve collision against parked Starfighter hull
    if (ship) {
      this.resolveShipCollision(ship);
    }

    // 7. Motion Kinematics & Procedural Articulation
    const horizSpeed = tangentVel.length();
    const currentVertSpeed = this.velocity.dot(newUp);

    // Update in-air jump phase
    if (!this.grounded && !this.isSwimming && !isBoosting) {
      if (currentVertSpeed > 1.0) {
        this.jumpPhase = 'ascent';
      } else {
        this.jumpPhase = 'descent';
      }
    }

    // Smooth landing recovery compression decay
    if (this.landingCompression > 0) {
      this.landingCompression = Math.max(0, this.landingCompression - dt * 2.2);
      if (this.landingCompression <= 0.005) {
        this.landingCompression = 0;
        if (this.jumpPhase === 'land') this.jumpPhase = 'idle';
      }
    }

    if (this.isSwimming) {
      // True prone horizontal streamline swimming animation (body pitched ~-80° forward into water)
      if (this.visualRoot) {
        const swimTargetPitch = -1.38 + (this.pitch || 0) * 0.45;
        this.visualRoot.rotation.x = THREE.MathUtils.lerp(this.visualRoot.rotation.x, swimTargetPitch, Math.min(1, 10 * dt));
        this.visualRoot.position.y = THREE.MathUtils.lerp(this.visualRoot.position.y, -0.65, Math.min(1, 10 * dt));
        this.visualRoot.position.z = THREE.MathUtils.lerp(this.visualRoot.position.z, 0.35, Math.min(1, 10 * dt));
      }
      if (this.head) {
        // Raise head to look forward along swimming direction
        this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, 0.55, Math.min(1, 10 * dt));
      }

      this.walkCycle += dt * (isSprinting ? 12 : 7);
      const stroke = Math.sin(this.walkCycle);
      this.torso.rotation.x = 0.05; // Streamlined spine continuous with pelvis
      this.torso.position.y = 1.55;

      // Leg flutter kick with streamlined horizontal alignment and knee flexion
      this.leftLeg.rotation.x = stroke * 0.28;
      this.rightLeg.rotation.x = -stroke * 0.28;
      this.leftLowerLegGroup.rotation.x = -(0.20 + Math.max(0, -stroke) * 0.35);
      this.rightLowerLegGroup.rotation.x = -(0.20 + Math.max(0, stroke) * 0.35);

      // Arm crawl / breaststroke pull-through reaching forward along -Z and sweeping back
      this.leftArm.rotation.x = -2.2 + stroke * 0.85;
      this.rightArm.rotation.x = -2.2 - stroke * 0.85;
      this.leftArm.rotation.z = -0.22;
      this.rightArm.rotation.z = 0.22;
      this.leftForearmGroup.rotation.x = 0.45 + Math.max(0, stroke) * 0.45;
      this.rightForearmGroup.rotation.x = 0.45 + Math.max(0, -stroke) * 0.45;
      this.torso.rotation.y = stroke * 0.08;
    } else {
      // Smoothly restore visualRoot orientation and position to neutral upright when not swimming
      if (this.visualRoot) {
        this.visualRoot.rotation.x = THREE.MathUtils.lerp(this.visualRoot.rotation.x, 0, Math.min(1, 10 * dt));
        this.visualRoot.position.y = THREE.MathUtils.lerp(this.visualRoot.position.y, 0, Math.min(1, 10 * dt));
        this.visualRoot.position.z = THREE.MathUtils.lerp(this.visualRoot.position.z, 0, Math.min(1, 10 * dt));
      }
      if (this.head && this.head.rotation.x !== 0) {
        this.head.rotation.x = THREE.MathUtils.lerp(this.head.rotation.x, 0, Math.min(1, 10 * dt));
      }

      if (isBoosting) {
      // Jetpack flight attitude: legs trailing back, knees soft backward, arms forward/down
      this.torso.rotation.x = 0.08;
      this.torso.position.y = 1.55;
      this.leftLeg.rotation.x = -0.35;
      this.rightLeg.rotation.x = -0.35;
      this.leftLowerLegGroup.rotation.x = -0.25;
      this.rightLowerLegGroup.rotation.x = -0.25;
      this.leftArm.rotation.x = 0.35;
      this.rightArm.rotation.x = 0.35;
      this.leftArm.rotation.z = -0.15;
      this.rightArm.rotation.z = 0.15;
      this.leftForearmGroup.rotation.x = 0.50;
      this.rightForearmGroup.rotation.x = 0.50;
      this.torso.rotation.y *= 0.85;
    } else if (!this.grounded) {
      // In-Air Dynamic Jump Motion: ascent tuck vs descent reach
      this.torso.position.y = 1.55;
      if (this.jumpPhase === 'ascent') {
        // High Jump Tuck: thighs drive forward/up, knees bend backward under thighs, arms splayed for balance
        this.torso.rotation.x = 0.16;
        this.leftLeg.rotation.x = 0.45;
        this.rightLeg.rotation.x = 0.35;
        this.leftLowerLegGroup.rotation.x = -0.85; // Knees flex backward tightly
        this.rightLowerLegGroup.rotation.x = -0.70;
        this.leftArm.rotation.x = -0.35;
        this.rightArm.rotation.x = -0.35;
        this.leftArm.rotation.z = -0.35;
        this.rightArm.rotation.z = 0.35;
        this.leftForearmGroup.rotation.x = 0.65; // Bending elbows in jump
        this.rightForearmGroup.rotation.x = 0.65;
      } else {
        // Descent Reach: legs extend downward reaching for terrain, knees softly prepared, arms raised
        this.torso.rotation.x = 0.06;
        this.leftLeg.rotation.x = 0.12;
        this.rightLeg.rotation.x = 0.10;
        this.leftLowerLegGroup.rotation.x = -0.20;
        this.rightLowerLegGroup.rotation.x = -0.20;
        this.leftArm.rotation.x = -0.55;
        this.rightArm.rotation.x = -0.55;
        this.leftArm.rotation.z = -0.28;
        this.rightArm.rotation.z = 0.28;
        this.leftForearmGroup.rotation.x = 0.45;
        this.rightForearmGroup.rotation.x = 0.45;
      }
      this.torso.rotation.y *= 0.85;
    } else if (horizSpeed > 0.5 && this.grounded) {
      // Ground Locomotion: Distinct Sprint vs Walk
      if (isSprinting) {
        // High-Fidelity Athletic Sprint
        this.walkCycle += dt * 13.5;
        const swing = Math.sin(this.walkCycle);

        // Forward Torso Lean (~20° athletic pitch into the run)
        this.torso.rotation.x = 0.35;
        // Dynamic vertical stride spring bounce
        this.torso.position.y = 1.55 + Math.sin(this.walkCycle * 2) * 0.07;
        // Torso counter-twist
        this.torso.rotation.y = -swing * 0.16;

        // High Knee Drive & Thigh Swing
        this.leftLeg.rotation.x = swing * 0.85;
        this.rightLeg.rotation.x = -swing * 0.85;

        // Deep Knee Flexion on Backswing (heel kicks backward toward glutes up to 85° bend!)
        const leftKneeBend = swing < 0 ? Math.min(1.5, Math.pow(-swing, 1.2) * 1.5) : Math.max(0.1, (1.0 - swing) * 0.35);
        const rightKneeBend = swing > 0 ? Math.min(1.5, Math.pow(swing, 1.2) * 1.5) : Math.max(0.1, (1.0 + swing) * 0.35);
        this.leftLowerLegGroup.rotation.x = -leftKneeBend;
        this.rightLowerLegGroup.rotation.x = -rightKneeBend;

        // 90° Bent Arm Pumping Carriage
        this.leftForearmGroup.rotation.x = 1.35 + Math.sin(this.walkCycle) * 0.15;
        this.rightForearmGroup.rotation.x = 1.35 - Math.sin(this.walkCycle) * 0.15;
        this.leftArm.rotation.x = -swing * 0.85;
        this.rightArm.rotation.x = swing * 0.85;
        this.leftArm.rotation.z = -0.15;
        this.rightArm.rotation.z = 0.15;
      } else {
        // Natural Walking Gait
        this.walkCycle += dt * 8.5;
        const swing = Math.sin(this.walkCycle);

        // Upright torso with subtle vertical bob
        this.torso.rotation.x = 0.04;
        this.torso.position.y = 1.55 + Math.sin(this.walkCycle * 2) * 0.025;
        this.torso.rotation.y = -swing * 0.06;

        // Moderate Thigh Swing
        this.leftLeg.rotation.x = swing * 0.45;
        this.rightLeg.rotation.x = -swing * 0.45;

        // Natural knee flexion on backswing (heel kicks backward)
        const leftKneeBend = swing < 0 ? Math.min(0.75, -swing * 0.8) : 0.05;
        const rightKneeBend = swing > 0 ? Math.min(0.75, swing * 0.8) : 0.05;
        this.leftLowerLegGroup.rotation.x = -leftKneeBend;
        this.rightLowerLegGroup.rotation.x = -rightKneeBend;

        // Relaxed ~30° elbow carry with natural swing
        this.leftForearmGroup.rotation.x = 0.40 + Math.max(0, -swing) * 0.25;
        this.rightForearmGroup.rotation.x = 0.40 + Math.max(0, swing) * 0.25;
        this.leftArm.rotation.x = -swing * 0.45;
        this.rightArm.rotation.x = swing * 0.45;
        this.leftArm.rotation.z = -0.06;
        this.rightArm.rotation.z = 0.06;
      }
    } else {
      // Standing Idle (with springy landing shock absorption)
      let targetY = 1.55;
      let extraKnee = 0;
      let extraPitch = 0;
      let extraThigh = 0;

      if (this.landingCompression > 0) {
        targetY = 1.55 - this.landingCompression * 0.55;
        extraPitch = this.landingCompression * 0.45;
        extraThigh = this.landingCompression * 0.65;
        extraKnee = -this.landingCompression * 1.85; // Knees flex backward on crouch/landing!
      }

      this.torso.position.y = THREE.MathUtils.lerp(this.torso.position.y, targetY, 0.25);
      this.torso.rotation.x = THREE.MathUtils.lerp(this.torso.rotation.x, extraPitch, 0.25);
      this.torso.rotation.y *= 0.82;

      this.leftLeg.rotation.x = THREE.MathUtils.lerp(this.leftLeg.rotation.x, extraThigh, 0.25);
      this.rightLeg.rotation.x = THREE.MathUtils.lerp(this.rightLeg.rotation.x, extraThigh, 0.25);
      this.leftLowerLegGroup.rotation.x = THREE.MathUtils.lerp(this.leftLowerLegGroup.rotation.x, extraKnee, 0.25);
      this.rightLowerLegGroup.rotation.x = THREE.MathUtils.lerp(this.rightLowerLegGroup.rotation.x, extraKnee, 0.25);

      this.leftArm.rotation.x *= 0.82;
      this.rightArm.rotation.x *= 0.82;
      this.leftArm.rotation.z = THREE.MathUtils.lerp(this.leftArm.rotation.z, -0.04, 0.15);
      this.rightArm.rotation.z = THREE.MathUtils.lerp(this.rightArm.rotation.z, 0.04, 0.15);
      this.leftForearmGroup.rotation.x = THREE.MathUtils.lerp(this.leftForearmGroup.rotation.x, 0.25, 0.15);
      this.rightForearmGroup.rotation.x = THREE.MathUtils.lerp(this.rightForearmGroup.rotation.x, 0.25, 0.15);
    }
  }

    // Aim right arm forward when firing gauntlet mining laser
    if (this.isMining && this.rightArm && this.rightForearmGroup) {
      this.rightArm.rotation.x = -1.45;
      this.rightArm.rotation.z = 0.12;
      this.rightForearmGroup.rotation.x = 0.15;
    }

    // Animate Floating Companion Drone (gentle hover bob & yaw spin)
    if (this.companionDrone) {
      this.companionDrone.position.y = 2.38 + Math.sin(this.animTime * 3.2) * 0.08;
      this.companionDrone.rotation.y = this.animTime * 1.8;
      this.companionDrone.rotation.z = Math.sin(this.animTime * 2.2) * 0.15;
    }

    if (this.scannerPulseTimer > 0) {
      this.scannerPulseTimer = Math.max(0, this.scannerPulseTimer - dt);
    }

    this.prevVertSpeed = currentVertSpeed;
    this.wasGroundedLastFrame = this.grounded;
  }
}
