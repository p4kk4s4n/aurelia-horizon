import * as THREE from 'three';

export const FAUNA_SPECIES = {
  sky_manta: {
    id: 'sky_manta',
    name: 'Aurelian Sky-Manta',
    locomotion: 'flying',
    temperament: 'docile',
    maxHealth: 65,
    speed: 12.0,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 2.6,
    dropItem: 'aero_membrane',
    dropLabel: 'Aero Membrane',
    biome: 'Upper Atmosphere & Mountain Ridges',
    description: 'Wide-winged bioluminescent manta gliding effortlessly on planetary thermal currents.'
  },
  hexapod_strider: {
    id: 'hexapod_strider',
    name: 'Hexapod Strider',
    locomotion: 'walking',
    temperament: 'docile',
    maxHealth: 80,
    speed: 4.2,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 1.8,
    dropItem: 'chitin_shell',
    dropLabel: 'Chitin Shell',
    biome: 'Tropical Jungles & Highland Plateaus',
    description: 'Six-legged armored grazer that feeds on spore-ferns and flees when startled.'
  },
  spined_stalker: {
    id: 'spined_stalker',
    name: 'Spined Stalker',
    locomotion: 'walking',
    temperament: 'aggressive',
    maxHealth: 110,
    speed: 8.2,
    aggroRadius: 28.0,
    attackRange: 3.2,
    attackDamage: 14,
    hitRadius: 1.9,
    dropItem: 'apex_fang',
    dropLabel: 'Apex Fang',
    biome: 'Dense Canopy & Volcanic Lunar Ridges',
    description: 'Aggressive territorial predator armed with dual scythe claws and dorsal spines. Charges intruders on sight!'
  },
  ribbon_leviathan: {
    id: 'ribbon_leviathan',
    name: 'Ribbon Leviathan',
    locomotion: 'swimming',
    temperament: 'docile',
    maxHealth: 90,
    speed: 6.5,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 2.4,
    dropItem: 'biolum_gland',
    dropLabel: 'Bioluminescent Gland',
    biome: 'Sunlit Coral Lagoons & Mid-Ocean Shelf',
    description: 'Graceful serpentine swimmer whose glowing ventral fins illuminate shallow lagoons.'
  },
  abyssal_maw: {
    id: 'abyssal_maw',
    name: 'Abyssal Maw',
    locomotion: 'swimming',
    temperament: 'aggressive',
    maxHealth: 150,
    speed: 9.8,
    aggroRadius: 36.0,
    attackRange: 4.2,
    attackDamage: 20,
    hitRadius: 2.8,
    dropItem: 'abyssal_pearl',
    dropLabel: 'Abyssal Pearl',
    biome: 'Midnight Hadal Trenches (>30m Depth)',
    description: 'Apex deep-sea trench serpent that uses bioluminescent lures to ambush deep divers.'
  }
};

export class FaunaEntity {
  constructor({ id, speciesKey, body, dirVector, altitudeOffset = 0 }) {
    this.id = id;
    this.species = FAUNA_SPECIES[speciesKey] || FAUNA_SPECIES.hexapod_strider;
    this.speciesKey = this.species.id;
    this.name = this.species.name;
    this.locomotion = this.species.locomotion;
    this.temperament = this.species.temperament;
    this.body = body;

    this.maxHealth = this.species.maxHealth;
    this.health = this.maxHealth;
    this.dead = false;
    this.respawnTimer = 0;

    this.state = 'WANDER'; // 'IDLE' | 'WANDER' | 'FLEE' | 'AGGRO' | 'ATTACK' | 'DEFEATED'
    this.stateTimer = 2.0 + Math.random() * 4.0;
    this.attackCooldown = 0;
    this.flashTimer = 0;
    this.animPhase = Math.random() * Math.PI * 2;

    this.localDir = dirVector.clone().normalize();
    this.altitudeOffset = altitudeOffset;

    // Tangent heading vector
    const arbitrary = Math.abs(this.localDir.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
    this.heading = new THREE.Vector3().crossVectors(this.localDir, arbitrary).normalize();

    this.group = new THREE.Group();
    this.group.name = `Fauna_${this.id}`;
    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    this.animParts = {};
    this._buildSpeciesMesh();
    this._syncPositionToBody();
  }

  _buildSpeciesMesh() {
    const k = this.speciesKey;
    if (k === 'sky_manta') {
      const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1b4965, emissive: 0x00a896, emissiveIntensity: 0.45, roughness: 0.35 });
      const wingMat = new THREE.MeshStandardMaterial({ color: 0x00f5d4, emissive: 0x00bbf9, emissiveIntensity: 0.75, roughness: 0.3, side: THREE.DoubleSide });
      this.primaryMat = bodyMat;

      const core = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.8, 6), bodyMat);
      core.rotation.x = -Math.PI / 2;
      this.visualRoot.add(core);

      const leftWingGroup = new THREE.Group();
      const leftWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.4), wingMat);
      leftWing.position.set(-1.3, 0, 0.1);
      leftWing.rotation.y = 0.25;
      leftWingGroup.add(leftWing);

      const rightWingGroup = new THREE.Group();
      const rightWing = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.08, 1.4), wingMat);
      rightWing.position.set(1.3, 0, 0.1);
      rightWing.rotation.y = -0.25;
      rightWingGroup.add(rightWing);

      const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.01, 2.4, 5), wingMat);
      tail.rotation.x = Math.PI / 2;
      tail.position.z = 2.2;

      this.visualRoot.add(leftWingGroup, rightWingGroup, tail);
      this.animParts = { leftWingGroup, rightWingGroup, tail };
    } else if (k === 'hexapod_strider') {
      const shellMat = new THREE.MeshStandardMaterial({ color: 0x2ec4b6, emissive: 0x0f4c5c, emissiveIntensity: 0.3, roughness: 0.5 });
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1a2639, roughness: 0.7 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0x9ef01a });
      this.primaryMat = shellMat;

      const carapace = new THREE.Mesh(new THREE.SphereGeometry(0.95, 10, 8), shellMat);
      carapace.scale.set(0.85, 0.65, 1.35);
      carapace.position.y = 1.05;
      this.visualRoot.add(carapace);

      const head = new THREE.Mesh(new THREE.SphereGeometry(0.45, 8, 6), shellMat);
      head.position.set(0, 1.15, -1.15);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
      eyeL.position.set(-0.22, 1.25, -1.45);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.1, 6, 6), eyeMat);
      eyeR.position.set(0.22, 1.25, -1.45);
      this.visualRoot.add(head, eyeL, eyeR);

      this.animParts.legs = [];
      for (let i = 0; i < 6; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2) - 1;
        const legGroup = new THREE.Group();
        legGroup.position.set(side * 0.65, 0.9, row * 0.65);
        const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.04, 1.05, 5), legMat);
        legMesh.position.set(side * 0.2, -0.45, 0);
        legMesh.rotation.z = side * 0.3;
        legGroup.add(legMesh);
        this.visualRoot.add(legGroup);
        this.animParts.legs.push(legGroup);
      }
    } else if (k === 'spined_stalker') {
      const stalkerMat = new THREE.MeshStandardMaterial({ color: 0x7209b7, emissive: 0xf72585, emissiveIntensity: 0.55, roughness: 0.35 });
      const clawMat = new THREE.MeshStandardMaterial({ color: 0xff595e, emissive: 0xd90429, emissiveIntensity: 0.75, metalness: 0.6, roughness: 0.2 });
      const eyeMat = new THREE.MeshBasicMaterial({ color: 0xffbe0b });
      this.primaryMat = stalkerMat;

      const torso = new THREE.Mesh(new THREE.ConeGeometry(0.75, 2.2, 7), stalkerMat);
      torso.rotation.x = -Math.PI * 0.42;
      torso.position.set(0, 1.25, 0);
      this.visualRoot.add(torso);

      // Dorsal menacing spines
      for (let s = 0; s < 4; s++) {
        const spine = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 4), clawMat);
        spine.position.set(0, 1.65 - s * 0.1, -0.4 + s * 0.4);
        spine.rotation.x = -0.35;
        this.visualRoot.add(spine);
      }

      const head = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.5, 0.75), stalkerMat);
      head.position.set(0, 1.45, -1.1);
      const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), eyeMat);
      eyeL.position.set(-0.22, 1.55, -1.45);
      const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), eyeMat);
      eyeR.position.set(0.22, 1.55, -1.45);
      this.visualRoot.add(head, eyeL, eyeR);

      // Scythe claws
      const leftClaw = new THREE.Group();
      leftClaw.position.set(-0.6, 1.3, -0.75);
      const lBlade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.25, 4), clawMat);
      lBlade.rotation.x = -Math.PI * 0.6;
      lBlade.position.z = -0.5;
      leftClaw.add(lBlade);

      const rightClaw = new THREE.Group();
      rightClaw.position.set(0.6, 1.3, -0.75);
      const rBlade = new THREE.Mesh(new THREE.ConeGeometry(0.16, 1.25, 4), clawMat);
      rBlade.rotation.x = -Math.PI * 0.6;
      rBlade.position.z = -0.5;
      rightClaw.add(rBlade);

      this.visualRoot.add(leftClaw, rightClaw);
      this.animParts.leftClaw = leftClaw;
      this.animParts.rightClaw = rightClaw;
      this.animParts.legs = [];

      for (let i = 0; i < 4; i++) {
        const side = i % 2 === 0 ? -1 : 1;
        const row = Math.floor(i / 2) === 0 ? -0.45 : 0.45;
        const legG = new THREE.Group();
        legG.position.set(side * 0.55, 1.0, row);
        const legM = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.06, 1.15, 5), stalkerMat);
        legM.position.y = -0.5;
        legG.add(legM);
        this.visualRoot.add(legG);
        this.animParts.legs.push(legG);
      }
    } else if (k === 'ribbon_leviathan') {
      const segMat = new THREE.MeshStandardMaterial({ color: 0x00bbf9, emissive: 0x00f5d4, emissiveIntensity: 0.65, roughness: 0.25 });
      this.primaryMat = segMat;
      this.animParts.segments = [];
      for (let s = 0; s < 7; s++) {
        const r = 0.58 * (1 - s * 0.11);
        const seg = new THREE.Mesh(new THREE.SphereGeometry(r, 8, 6), segMat);
        seg.scale.set(0.85, 1.1, 1.5);
        seg.position.set(0, 0, s * 0.72 - 1.5);
        this.visualRoot.add(seg);
        this.animParts.segments.push(seg);
      }
    } else if (k === 'abyssal_maw') {
      const mawMat = new THREE.MeshStandardMaterial({ color: 0x3a0ca3, emissive: 0xf72585, emissiveIntensity: 0.85, roughness: 0.3 });
      const lureMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
      this.primaryMat = mawMat;
      this.animParts.segments = [];

      // Angler lure in front of jaws
      const lure = new THREE.Mesh(new THREE.SphereGeometry(0.24, 8, 8), lureMat);
      lure.position.set(0, 0.85, -2.1);
      this.visualRoot.add(lure);
      this.animParts.lure = lure;

      for (let s = 0; s < 8; s++) {
        const r = 0.88 * (1 - s * 0.1);
        const seg = new THREE.Mesh(new THREE.ConeGeometry(r, 1.25, 6), mawMat);
        seg.rotation.x = Math.PI / 2;
        seg.position.set(0, 0, s * 0.85 - 1.6);
        this.visualRoot.add(seg);
        this.animParts.segments.push(seg);
      }
    }
  }

  _syncPositionToBody() {
    if (!this.body) return;
    const bPos = this.body.getWorldPosition();
    const surfaceR = this.body.getSurfaceRadiusAtDir(this.localDir.x, this.localDir.y, this.localDir.z);
    const seaLevel = this.body.seaLevelRadius || this.body.radius;

    let targetR = surfaceR;
    if (this.locomotion === 'flying') {
      targetR = Math.max(surfaceR, seaLevel) + this.altitudeOffset;
    } else if (this.locomotion === 'swimming') {
      const maxR = seaLevel - 2.2;
      const minR = surfaceR + 2.0;
      targetR = Math.min(maxR, Math.max(minR, seaLevel - this.altitudeOffset));
    } else {
      targetR = surfaceR;
    }

    this.group.position.copy(bPos).addScaledVector(this.localDir, targetR);

    // Orient visual upright to localDir and looking along heading
    const up = this.localDir;
    const forward = this.heading.clone().addScaledVector(up, -this.heading.dot(up)).normalize();
    const right = new THREE.Vector3().crossVectors(forward, up).normalize();
    const rotMatrix = new THREE.Matrix4().makeBasis(right, up, forward.clone().negate());
    this.group.quaternion.setFromRotationMatrix(rotMatrix);
  }

  takeDamage(amount) {
    if (this.dead) return { hit: false, defeated: false };
    this.health = Math.max(0, this.health - amount);
    this.flashTimer = 0.22;

    if (this.temperament === 'docile') {
      this.state = 'FLEE';
      this.stateTimer = 5.0;
    } else {
      this.state = 'AGGRO';
      this.stateTimer = 8.0;
    }

    if (this.health <= 0) {
      this.dead = true;
      this.state = 'DEFEATED';
      this.respawnTimer = 28.0;
      this.group.visible = false;
      return {
        hit: true,
        defeated: true,
        dropItem: this.species.dropItem,
        dropLabel: this.species.dropLabel,
        speciesKey: this.speciesKey,
        speciesName: this.name
      };
    }

    return { hit: true, defeated: false, speciesKey: this.speciesKey, speciesName: this.name };
  }

  update(dt, explorerPos, onAttackPlayer) {
    if (this.dead) {
      this.respawnTimer -= dt;
      if (this.respawnTimer <= 0) {
        this.dead = false;
        this.health = this.maxHealth;
        this.state = 'WANDER';
        this.group.visible = true;
      }
      return;
    }

    if (this.attackCooldown > 0) this.attackCooldown -= dt;

    if (this.flashTimer > 0) {
      this.flashTimer -= dt;
      if (this.primaryMat) {
        this.primaryMat.emissiveIntensity = this.flashTimer > 0 ? 2.2 : 0.55;
      }
    }

    const distToPlayer = explorerPos ? this.group.position.distanceTo(explorerPos) : Infinity;

    // Aggro & State Machine
    if (this.temperament === 'aggressive' && distToPlayer <= this.species.aggroRadius) {
      if (distToPlayer <= this.species.attackRange) {
        this.state = 'ATTACK';
        if (this.attackCooldown <= 0 && onAttackPlayer) {
          this.attackCooldown = 1.65;
          onAttackPlayer(this.species.attackDamage, this.name, this);
        }
      } else {
        this.state = 'AGGRO';
      }

      if (explorerPos && this.body) {
        const bPos = this.body.getWorldPosition();
        const toPlayer = explorerPos.clone().sub(this.group.position);
        const tangentToPlayer = toPlayer.addScaledVector(this.localDir, -toPlayer.dot(this.localDir));
        if (tangentToPlayer.lengthSq() > 0.001) {
          this.heading.lerp(tangentToPlayer.normalize(), Math.min(1, dt * 6.0)).normalize();
        }
      }
    } else {
      if (this.state === 'AGGRO' || this.state === 'ATTACK') {
        this.state = 'WANDER';
      }
      this.stateTimer -= dt;
      if (this.stateTimer <= 0) {
        this.stateTimer = 3.0 + Math.random() * 5.0;
        // Gently turn heading
        const turnAngle = (Math.random() - 0.5) * 1.4;
        this.heading.applyAxisAngle(this.localDir, turnAngle).normalize();
      }
    }

    // Move along spherical tangent
    let moveSpeed = this.species.speed;
    if (this.state === 'AGGRO') moveSpeed *= 1.35;
    else if (this.state === 'FLEE') moveSpeed *= 1.55;
    else if (this.state === 'ATTACK') moveSpeed *= 0.25;

    const r = this.body ? this.body.radius : 720;
    const angularStep = (moveSpeed * dt) / r;
    this.localDir.addScaledVector(this.heading, angularStep).normalize();
    this.heading.addScaledVector(this.localDir, -this.heading.dot(this.localDir)).normalize();

    this._syncPositionToBody();

    // Procedural Limb / Wing / Fin Animation
    this.animPhase += dt * (this.state === 'AGGRO' ? 12.0 : 6.5);
    const s = Math.sin(this.animPhase);

    if (this.speciesKey === 'sky_manta') {
      if (this.animParts.leftWingGroup) this.animParts.leftWingGroup.rotation.z = s * 0.38;
      if (this.animParts.rightWingGroup) this.animParts.rightWingGroup.rotation.z = -s * 0.38;
    } else if (this.animParts.legs) {
      const legs = this.animParts.legs;
      for (let i = 0; i < legs.length; i++) {
        legs[i].rotation.x = (i % 2 === 0 ? s : -s) * 0.55;
      }
      if (this.animParts.leftClaw && this.animParts.rightClaw) {
        const strike = this.state === 'ATTACK' ? Math.abs(Math.sin(this.animPhase * 2)) * 0.85 : s * 0.2;
        this.animParts.leftClaw.rotation.x = strike;
        this.animParts.rightClaw.rotation.x = -strike;
      }
    } else if (this.animParts.segments) {
      const segs = this.animParts.segments;
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.x = Math.sin(this.animPhase - i * 0.7) * 0.28 * (i / segs.length);
      }
    }
  }
}

export class FaunaSystem {
  constructor(scene, planet, moons = []) {
    this.scene = scene;
    this.planet = planet;
    this.moons = moons;
    this.entities = [];
    this.group = new THREE.Group();
    this.group.name = 'FaunaSystem';
    this.scene.add(this.group);

    this._populateFauna();
  }

  _populateFauna() {
    let idx = 0;
    const addEntity = (speciesKey, body, dir, alt = 0) => {
      const entity = new FaunaEntity({
        id: `${speciesKey}_${idx++}`,
        speciesKey,
        body,
        dirVector: dir,
        altitudeOffset: alt
      });
      this.entities.push(entity);
      this.group.add(entity.group);
      return entity;
    };

    if (this.planet) {
      // Spawn guaranteed encounter fauna near Aurelia Prime base camp (0, 1, 0)
      addEntity('hexapod_strider', this.planet, new THREE.Vector3(0.03, 0.999, -0.025).normalize(), 0);
      addEntity('hexapod_strider', this.planet, new THREE.Vector3(-0.04, 0.998, 0.03).normalize(), 0);
      addEntity('spined_stalker', this.planet, new THREE.Vector3(-0.045, 0.998, -0.035).normalize(), 0);
      addEntity('sky_manta', this.planet, new THREE.Vector3(0.02, 0.999, -0.04).normalize(), 38);
      addEntity('sky_manta', this.planet, new THREE.Vector3(-0.03, 0.999, 0.02).normalize(), 48);

      // Distribute across planet land & ocean
      for (let i = 0; i < 44; i++) {
        const theta = (i * 2.39996) % (Math.PI * 2);
        const y = 1 - (i / 43) * 1.85;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const dir = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize();
        const surfR = this.planet.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
        const depth = (this.planet.seaLevelRadius || 718) - surfR;

        if (depth > 28) {
          addEntity('abyssal_maw', this.planet, dir, Math.min(depth * 0.65, 65));
        } else if (depth > 4) {
          addEntity('ribbon_leviathan', this.planet, dir, Math.min(depth * 0.5, 16));
        } else {
          if (i % 4 === 0) {
            addEntity('sky_manta', this.planet, dir, 45 + (i % 3) * 18);
          } else if (i % 3 === 0) {
            addEntity('spined_stalker', this.planet, dir, 0);
          } else {
            addEntity('hexapod_strider', this.planet, dir, 0);
          }
        }
      }
    }

    // Populate moons with tough lunar Stalkers & Striders
    for (let m = 0; m < this.moons.length; m++) {
      const moon = this.moons[m];
      addEntity('spined_stalker', moon, new THREE.Vector3(0.15, 0.98, 0.08).normalize(), 0);
      addEntity('hexapod_strider', moon, new THREE.Vector3(-0.12, 0.98, -0.1).normalize(), 0);
      for (let j = 0; j < 6; j++) {
        const a = (j / 6) * Math.PI * 2;
        const d = new THREE.Vector3(Math.cos(a) * 0.6, Math.sin(a * 2) * 0.5, Math.sin(a) * 0.6).normalize();
        addEntity(j % 2 === 0 ? 'spined_stalker' : 'hexapod_strider', moon, d, 0);
      }
    }
  }

  update(dt, explorerPos, onAttackPlayer) {
    for (let i = 0; i < this.entities.length; i++) {
      this.entities[i].update(dt, explorerPos, onAttackPlayer);
    }
  }

  getNearestFauna(position, maxDistance = 35, onlyAggressive = false) {
    let best = null;
    let bestDist = maxDistance;
    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.dead) continue;
      if (onlyAggressive && e.temperament !== 'aggressive') continue;
      const d = e.group.position.distanceTo(position);
      if (d < bestDist) {
        bestDist = d;
        best = e;
      }
    }
    return best;
  }

  raycastFauna(origin, direction, maxDistance = 75) {
    const dir = direction.clone().normalize();
    let bestEntity = null;
    let bestDist = maxDistance;

    for (let i = 0; i < this.entities.length; i++) {
      const e = this.entities[i];
      if (e.dead) continue;
      const center = e.group.position.clone().addScaledVector(e.localDir, 1.0);
      const toCenter = center.sub(origin);
      const proj = toCenter.dot(dir);
      if (proj < 0 || proj > bestDist) continue;

      const perpDistSq = toCenter.lengthSq() - proj * proj;
      const hitR = e.species.hitRadius;
      if (perpDistSq <= hitR * hitR) {
        bestDist = proj;
        bestEntity = e;
      }
    }
    return bestEntity;
  }
}
