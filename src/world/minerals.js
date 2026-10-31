import * as THREE from 'three';
import { mulberry32, shardGeometry } from './procGeo.js';

/**
 * Procedural Interactive Mineral Deposits for Aurelia Horizon.
 * Types:
 * - 'titanium': Heavy bronze-gold metallic ore veins
 * - 'crystal': Radiant luminescent silica crystals
 */

export class MineralDeposit {
  constructor(config) {
    this.id = config.id || `mineral_${Math.random().toString(36).substr(2, 9)}`;
    this.type = config.type || 'titanium'; // 'titanium' | 'crystal' | 'void_crystal'
    this.name = this.type === 'titanium' ? 'Titanium Ore Vein' : (this.type === 'void_crystal' ? 'Void Aetherium Crystal' : 'Silica Crystal Node');
    this.body = config.body;
    this.localDir = config.localDir.clone().normalize();
    this.position = new THREE.Vector3();
    this.maxHealth = this.type === 'titanium' ? 80 : (this.type === 'void_crystal' ? 80 : 60);
    this.health = this.maxHealth;
    this.isDepleted = false;
    this.respawnTimer = 0;
    this.respawnCooldown = 90; // Respawn after 90 seconds
    this.yieldPerHit = 1;
    this.totalYield = this.type === 'titanium' ? 8 : 6;
    this.harvestedSoFar = 0;
    this.flashTimer = 0;

    this.group = new THREE.Group();
    this._buildMesh();
    this.updatePosition();
  }

  _buildMesh() {
    if (this.type === 'titanium') {
      // Titanium: Faceted bronze-gold metallic jagged cluster
      const baseGeo = new THREE.DodecahedronGeometry(1.4, 0);
      const veinMat = new THREE.MeshStandardMaterial({
        color: 0xcd7f32,
        roughness: 0.35,
        metalness: 0.85,
        emissive: 0x5a2d0c,
        emissiveIntensity: 0.4,
        flatShading: true
      });
      const rockMesh = new THREE.Mesh(baseGeo, veinMat);
      rockMesh.scale.set(1.2, 0.85, 1.1);
      this.group.add(rockMesh);

      // Embedded metallic nuggets
      const nuggetGeo = new THREE.OctahedronGeometry(0.55, 0);
      const nuggetMat = new THREE.MeshStandardMaterial({
        color: 0xffd166,
        roughness: 0.2,
        metalness: 0.95,
        emissive: 0xff9f1c,
        emissiveIntensity: 0.65,
        flatShading: true
      });
      const nugget1 = new THREE.Mesh(nuggetGeo, nuggetMat);
      nugget1.position.set(0.65, 0.45, 0.35);
      const nugget2 = new THREE.Mesh(nuggetGeo, nuggetMat);
      nugget2.position.set(-0.55, 0.35, -0.45);
      nugget2.scale.set(0.75, 0.75, 0.75);
      this.group.add(nugget1, nugget2);
      this.mainMaterial = veinMat;
      this.nuggetMaterial = nuggetMat;
    } else if (this.type === 'void_crystal') {
      // Void Aetherium: Hyper-resonant royal-violet & deep-magenta obelisk spires with levitating cyan aether diamond
      const voidGroup = new THREE.Group();

      // Obsidian basal rock matrix
      const baseRockGeo = new THREE.DodecahedronGeometry(1.5, 0);
      const baseMat = new THREE.MeshStandardMaterial({
        color: 0x150f21,
        roughness: 0.72,
        metalness: 0.45,
        flatShading: true
      });
      const rockMesh = new THREE.Mesh(baseRockGeo, baseMat);
      rockMesh.scale.set(1.4, 0.65, 1.3);
      rockMesh.position.y = 0.35;
      voidGroup.add(rockMesh);

      // Multi-shard violet-magenta crystal cluster
      const voidMat = new THREE.MeshStandardMaterial({
        color: 0x9b2226,
        emissive: 0xd900ff,
        emissiveIntensity: 1.5,
        roughness: 0.18,
        metalness: 0.42,
        transparent: true,
        opacity: 0.94,
        flatShading: true
      });

      const heights = [2.6, 2.1, 1.7, 1.4, 1.1];
      const angles = [0.2, 1.5, 2.8, 4.1, 5.3];
      const radii = [0.42, 0.35, 0.30, 0.26, 0.22];

      for (let i = 0; i < heights.length; i++) {
        const shard = new THREE.Mesh(shardGeometry(heights[i], radii[i]), voidMat);
        const a = angles[i];
        shard.position.set(Math.cos(a) * 0.55, 0.35, Math.sin(a) * 0.55);
        shard.rotation.z = (Math.random() - 0.5) * 0.32;
        shard.rotation.x = (Math.random() - 0.5) * 0.32;
        voidGroup.add(shard);
      }

      // Levitating Central Cyan Aether Core
      const aetherGeo = new THREE.OctahedronGeometry(0.46, 0);
      const aetherMat = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        emissive: 0x00f5d4,
        emissiveIntensity: 2.2,
        roughness: 0.12,
        metalness: 0.3,
        flatShading: true
      });
      const aetherCore = new THREE.Mesh(aetherGeo, aetherMat);
      aetherCore.position.set(0, 1.85, 0);
      voidGroup.add(aetherCore);

      this.group.add(voidGroup);
      this.mainMaterial = voidMat;
      this.aetherMaterial = aetherMat;
    } else {
      // Crystal: High-luminescence cyan/violet crystalline spire cluster
      const crystalGroup = new THREE.Group();
      const cryMat = new THREE.MeshStandardMaterial({
        color: 0x00f5d4,
        emissive: 0x00f5d4,
        emissiveIntensity: 1.2,
        roughness: 0.15,
        metalness: 0.4,
        transparent: true,
        opacity: 0.92,
        flatShading: true
      });

      const heights = [2.2, 1.6, 1.3, 0.9];
      const angles = [0, 1.4, 2.9, 4.5];
      const radii = [0.35, 0.28, 0.24, 0.2];

      for (let i = 0; i < heights.length; i++) {
        const shard = new THREE.Mesh(shardGeometry(heights[i], radii[i]), cryMat);
        const a = angles[i];
        shard.position.set(Math.cos(a) * 0.45, 0, Math.sin(a) * 0.45);
        shard.rotation.z = (Math.random() - 0.5) * 0.35;
        shard.rotation.x = (Math.random() - 0.5) * 0.35;
        crystalGroup.add(shard);
      }
      this.group.add(crystalGroup);
      this.mainMaterial = cryMat;
    }
  }

  updatePosition() {
    if (!this.body) return;
    const bPos = this.body.getWorldPosition();
    const surfaceR = this.body.getSurfaceRadiusAtDir(this.localDir.x, this.localDir.y, this.localDir.z);
    const floorR = Math.max(surfaceR, this.body.seaLevelRadius || 0);

    // Anchor precisely to terrain surface
    this.position.copy(bPos).addScaledVector(this.localDir, floorR + 0.1);
    this.group.position.copy(this.position);

    // Orient surface normal
    const up = this.localDir.clone();
    const align = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    this.group.quaternion.copy(align);
  }

  takeMiningDamage(damageAmount) {
    if (this.isDepleted) return { harvested: false, amount: 0, type: this.type, depleted: true };

    this.health -= damageAmount;
    this.flashTimer = 0.15;

    // Flash material on hit
    if (this.mainMaterial) {
      this.mainMaterial.emissiveIntensity = 2.4;
    }

    let harvestedAmount = 0;
    const progress = 1 - (this.health / this.maxHealth);
    const targetHarvest = Math.floor(progress * this.totalYield);
    if (targetHarvest > this.harvestedSoFar) {
      harvestedAmount = targetHarvest - this.harvestedSoFar;
      this.harvestedSoFar = targetHarvest;
    }

    if (this.health <= 0) {
      this.isDepleted = true;
      this.respawnTimer = this.respawnCooldown;
      this.group.visible = false;
      return {
        harvested: true,
        amount: Math.max(1, harvestedAmount + (this.totalYield - this.harvestedSoFar)),
        type: this.type,
        depleted: true
      };
    }

    return {
      harvested: harvestedAmount > 0,
      amount: harvestedAmount,
      type: this.type,
      depleted: false
    };
  }

  update(dt) {
    // Keep aligned with moving moon or planet
    if (this.body && this.body.deltaPosition) {
      this.updatePosition();
    }

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.flashTimer <= 0 && this.mainMaterial) {
        this.mainMaterial.emissiveIntensity = this.type === 'titanium' ? 0.4 : (this.type === 'void_crystal' ? 1.5 : 1.2);
      }
    }

    // Respawn logic
    if (this.isDepleted) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.isDepleted = false;
        this.health = this.maxHealth;
        this.harvestedSoFar = 0;
        this.group.visible = true;
      }
    }
  }
}

export class MineralSystem {
  constructor(scene, planet, moons) {
    this.scene = scene;
    this.planet = planet;
    this.moons = moons || [];
    this.deposits = [];
    this.group = new THREE.Group();
    this.scene.add(this.group);

    this.sparkMat = new THREE.PointsMaterial({
      color: 0x00f5d4,
      size: 0.35,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending
    });
    this.sparkGeo = new THREE.BufferGeometry();
    const sparkCount = 32;
    const sparkPositions = new Float32Array(sparkCount * 3);
    this.sparkGeo.setAttribute('position', new THREE.BufferAttribute(sparkPositions, 3));
    this.sparkPoints = new THREE.Points(this.sparkGeo, this.sparkMat);
    this.sparkPoints.visible = false;
    this.scene.add(this.sparkPoints);

    this._spawnDeposits();
  }

  _spawnDeposits() {
    const rng = mulberry32(4048);

    // 1. Aurelia Prime deposits (~28 nodes)
    for (let i = 0; i < 28; i++) {
      const u = rng() * 2 - 1;
      const theta = rng() * Math.PI * 2;
      const r = Math.sqrt(1 - u * u);
      const dir = new THREE.Vector3(r * Math.cos(theta), Math.abs(u), r * Math.sin(theta)).normalize();

      // Ensure land node
      const sR = this.planet.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
      if (sR > (this.planet.seaLevelRadius || 718) + 2.0) {
        const type = (i % 2 === 0) ? 'titanium' : 'crystal';
        const dep = new MineralDeposit({
          id: `aurelia_min_${i}`,
          type,
          body: this.planet,
          localDir: dir
        });
        this.deposits.push(dep);
        this.group.add(dep.group);
      }
    }

    // 2. Moon deposits
    this.moons.forEach((moon, mIdx) => {
      if (moon.id === 'goliath') {
        // High concentration of Void Aetherium Crystals on Moon III: Goliath (30 nodes)
        // A) 18 Nodes clustered around Goliath Hive Bases (3 nodes per base)
        const goliathBaseDirs = [
          new THREE.Vector3(0.18, 0.95, 0.22).normalize(),
          new THREE.Vector3(0.92, 0.15, 0.35).normalize(),
          new THREE.Vector3(-0.85, 0.22, 0.48).normalize(),
          new THREE.Vector3(-0.22, 0.38, -0.89).normalize(),
          new THREE.Vector3(0.38, -0.32, -0.86).normalize(),
          new THREE.Vector3(-0.16, -0.94, 0.28).normalize()
        ];

        let nodeIndex = 0;
        for (let b = 0; b < goliathBaseDirs.length; b++) {
          const bDir = goliathBaseDirs[b];
          const refUp = Math.abs(bDir.y) < 0.92 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
          const right = new THREE.Vector3().crossVectors(bDir, refUp).normalize();
          const fwd = new THREE.Vector3().crossVectors(right, bDir).normalize();

          for (let k = 0; k < 3; k++) {
            const angle = (k * Math.PI * 2) / 3 + b * 0.5;
            const dist = 34.0 + k * 10.0; // 34m to 54m from base center
            const offset = right.clone().multiplyScalar(Math.cos(angle) * dist)
              .add(fwd.clone().multiplyScalar(Math.sin(angle) * dist));
            const nodePos = bDir.clone().multiplyScalar(moon.radius || 310).add(offset);
            const nodeDir = nodePos.normalize();

            const dep = new MineralDeposit({
              id: `goliath_hive_void_${nodeIndex++}`,
              type: 'void_crystal',
              body: moon,
              localDir: nodeDir
            });
            this.deposits.push(dep);
            this.group.add(dep.group);
          }
        }

        // B) 12 Nodes scattered across craters and mineral ridges of Goliath
        for (let i = 0; i < 12; i++) {
          const u = rng() * 2 - 1;
          const theta = rng() * Math.PI * 2;
          const r = Math.sqrt(1 - u * u);
          const dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta)).normalize();

          const dep = new MineralDeposit({
            id: `goliath_crater_void_${i}`,
            type: 'void_crystal',
            body: moon,
            localDir: dir
          });
          this.deposits.push(dep);
          this.group.add(dep.group);
        }
      } else {
        // Lumen and Pyra standard mineral deposits
        for (let i = 0; i < 12; i++) {
          const u = rng() * 2 - 1;
          const theta = rng() * Math.PI * 2;
          const r = Math.sqrt(1 - u * u);
          const dir = new THREE.Vector3(r * Math.cos(theta), u, r * Math.sin(theta)).normalize();

          const type = (i % 2 === 0) ? 'titanium' : 'crystal';
          const dep = new MineralDeposit({
            id: `moon_${mIdx}_min_${i}`,
            type,
            body: moon,
            localDir: dir
          });
          this.deposits.push(dep);
          this.group.add(dep.group);
        }
      }
    });
  }

  getNearestDeposit(position, maxDistance = 18.0) {
    let nearest = null;
    let minDist = maxDistance;

    for (const dep of this.deposits) {
      if (dep.isDepleted) continue;
      const d = position.distanceTo(dep.position);
      if (d < minDist) {
        minDist = d;
        nearest = { deposit: dep, distance: d };
      }
    }
    return nearest;
  }

  update(dt) {
    for (const dep of this.deposits) {
      dep.update(dt);
    }
  }
}
