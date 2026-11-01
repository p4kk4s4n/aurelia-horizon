import * as THREE from 'three';

/**
 * Procedural Alien Fauna Simulation System.
 * 10 Distinct Species across Land, Aquatic, and Aerial habitats:
 * 1. Colossal Behemoth (Huge, Land Quadruped, Territorial Apex)
 * 2. Bipedal Tracker (Medium, Land Raptor, Aggressive Pack Hunter)
 * 3. Armored Burrower (Small, Land 6-Leg, Defensive)
 * 4. Herding Quadruped (Medium, Land Ungulate, Docile Grazer)
 * 5. Scurrying Swarmer (Tiny, Land 6-Leg Arachnid, Aggressive Swarm)
 * 6. Leviathan Eel (Large, Aquatic Serpentine, Aggressive Deep Predator)
 * 7. Faceted Ray (Medium, Aquatic Manta, Docile Lagoon Swimmer)
 * 8. Plated Crustacean (Small, Aquatic Benthic Crab, Docile Scavenger)
 * 9. Aerial Skimmer (Medium, Flying 4-Wing Dragonfly, Docile Soarer)
 * 10. Tiny Darting Flier (Tiny, Flying Humming-Moth Dart, Docile Flitter)
 */

export const FAUNA_SPECIES = {
  // 1-5 Land Dwelling
  colossal_behemoth: {
    id: 'colossal_behemoth',
    name: 'Colossal Behemoth',
    locomotion: 'walking',
    sizeCategory: 'huge',
    temperament: 'territorial',
    maxHealth: 380,
    speed: 4.2,
    aggroRadius: 16.0,
    attackRange: 5.2,
    attackDamage: 35,
    hitRadius: 3.8,
    dropItem: 'colossal_carapace',
    dropLabel: 'Colossal Carapace',
    biome: 'Granite Highland Peaks & Lumen Crystal Canyons',
    description: 'Apex crystalline titan of colossal scale. Armored in massive basalt plates with towering dorsal quartz spires. Peaceful at a distance, but unleashes devastating seismic stomps when its domain is breached.'
  },
  bipedal_tracker: {
    id: 'bipedal_tracker',
    name: 'Bipedal Tracker',
    locomotion: 'walking',
    sizeCategory: 'medium',
    temperament: 'aggressive',
    maxHealth: 130,
    speed: 10.2,
    aggroRadius: 30.0,
    attackRange: 3.2,
    attackDamage: 18,
    hitRadius: 1.8,
    dropItem: 'apex_fang',
    dropLabel: 'Tracker Sickle-Fang',
    biome: 'Steppe Grasslands, Conifer Valleys & Pyra Volcanic Ridges',
    description: 'Relentless bipedal predator with digitigrade raptor legs and sickle foot claws. Its faceted dark-teal crest contains a compound sensor cluster that locks onto prey from extreme range.'
  },
  armored_burrower: {
    id: 'armored_burrower',
    name: 'Armored Burrower',
    locomotion: 'walking',
    sizeCategory: 'small',
    temperament: 'defensive',
    maxHealth: 110,
    speed: 6.8,
    aggroRadius: 15.0,
    attackRange: 2.6,
    attackDamage: 14,
    hitRadius: 1.4,
    dropItem: 'chitin_shell',
    dropLabel: 'Burrower Chitin Shell',
    biome: 'Rocky Steppe Plains & Pyra Caldera Borders',
    description: 'Segmented subterranean crawler protected by tiered obsidian carapace plates. Wields crushing dual front pincers and a barbed tail to defend its mineral-rich burrow territories.'
  },
  herding_quadruped: {
    id: 'herding_quadruped',
    name: 'Herding Quadruped',
    locomotion: 'walking',
    sizeCategory: 'medium',
    temperament: 'docile',
    maxHealth: 90,
    speed: 9.5,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 1.6,
    dropItem: 'prismatic_antler',
    dropLabel: 'Prismatic Antler Shard',
    biome: 'Temperate Steppe Meadows & Coastal Sand Dunes',
    description: 'Graceful crystal ungulate crowned with branching quartz antlers. Feeds peacefully in small herds on luminescent mosses, leaping into high-speed bounding sprints when approached.'
  },
  scurrying_swarmer: {
    id: 'scurrying_swarmer',
    name: 'Scurrying Swarmer',
    locomotion: 'walking',
    sizeCategory: 'tiny',
    temperament: 'aggressive',
    maxHealth: 35,
    speed: 11.5,
    aggroRadius: 18.0,
    attackRange: 1.8,
    attackDamage: 7,
    hitRadius: 0.75,
    dropItem: 'swarmer_gland',
    dropLabel: 'Resonant Swarmer Gland',
    biome: 'Conifer Forest Floor, Undergrowth & Goliath Titan Moon',
    description: 'Fierce, multi-legged arachnid swarmer that hunts in coordinated packs of 3–5. Clusters of glowing cyan abdominal nodes pulse as it scurries rapidly to overwhelm intruders.'
  },

  // 6-8 Aquatic
  leviathan_eel: {
    id: 'leviathan_eel',
    name: 'Leviathan Eel',
    locomotion: 'swimming',
    sizeCategory: 'large',
    temperament: 'aggressive',
    maxHealth: 260,
    speed: 9.2,
    aggroRadius: 38.0,
    attackRange: 4.5,
    attackDamage: 28,
    hitRadius: 2.8,
    dropItem: 'abyssal_pearl',
    dropLabel: 'Leviathan Hadal Pearl',
    biome: 'Midnight Hadal Trenches (>25m Depth) & Continental Shelves',
    description: 'Apex aquatic terror of the deep oceans. An undulating armored sea serpent spanning over 16 meters, equipped with fanged predatory jaws and glowing bioluminescent sensory tendrils.'
  },
  faceted_ray: {
    id: 'faceted_ray',
    name: 'Faceted Ray',
    locomotion: 'swimming',
    sizeCategory: 'medium',
    temperament: 'docile',
    maxHealth: 95,
    speed: 6.5,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 2.2,
    dropItem: 'biolum_gland',
    dropLabel: 'Bioluminescent Ray Organ',
    biome: 'Sunlit Oceanic Lagoons & Coral Reef Shallows (2m–25m Depth)',
    description: 'Majestic diamond-faceted manta ray adorned with amethyst crystal dorsal spines. Glides peacefully through azure shallows with fluid, rhythmic wing undulations.'
  },
  plated_crustacean: {
    id: 'plated_crustacean',
    name: 'Plated Crustacean',
    locomotion: 'swimming',
    sizeCategory: 'small',
    temperament: 'docile',
    maxHealth: 85,
    speed: 3.5,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 1.3,
    dropItem: 'crustacean_claw',
    dropLabel: 'Plated Pincer Chitin',
    biome: 'Oceanic Coral Lagoons & Submerged Bathyal Reefs (3m–40m Depth)',
    description: 'Heavily armored benthic crab dwelling along submerged reefs and table coral shelves. Uses massive faceted obsidian pincers to scavenge mineral deposits and crack shellfish.'
  },

  // 9-10 Flying
  aerial_skimmer: {
    id: 'aerial_skimmer',
    name: 'Aerial Skimmer',
    locomotion: 'flying',
    sizeCategory: 'medium',
    temperament: 'docile',
    maxHealth: 75,
    speed: 13.0,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 2.4,
    dropItem: 'aero_membrane',
    dropLabel: 'Skimmer Aero Membrane',
    biome: 'Upper Planetary Atmosphere & Mountain Peak Thermals (40m–75m Alt)',
    description: 'Spectacular four-winged crystalline dragonfly that soars on atmospheric thermal currents. Its translucent faceted cyan crystal wings beat in anti-phase synchrony above planetary canopies.'
  },
  tiny_darting_flier: {
    id: 'tiny_darting_flier',
    name: 'Tiny Darting Flier',
    locomotion: 'flying',
    sizeCategory: 'tiny',
    temperament: 'docile',
    maxHealth: 25,
    speed: 14.5,
    aggroRadius: 0,
    attackRange: 0,
    attackDamage: 0,
    hitRadius: 0.65,
    dropItem: 'darting_wing',
    dropLabel: 'Ion Dart Flier Shard',
    biome: 'Temperate Flora Groves, Meadows & Steppes (2m–12m Alt)',
    description: 'Rapidly fluttering crystal humming-moth that darts erratically among bioluminescent flora blooms. Sleek magenta crystal fuselage leaves trailing ion particle sparks.'
  }
};

// Aliases for full backward compatibility with legacy keys
FAUNA_SPECIES.sky_manta = FAUNA_SPECIES.aerial_skimmer;
FAUNA_SPECIES.hexapod_strider = FAUNA_SPECIES.herding_quadruped;
FAUNA_SPECIES.spined_stalker = FAUNA_SPECIES.bipedal_tracker;
FAUNA_SPECIES.ribbon_leviathan = FAUNA_SPECIES.faceted_ray;
FAUNA_SPECIES.abyssal_maw = FAUNA_SPECIES.leviathan_eel;

export class FaunaEntity {
  constructor({ id, speciesKey, body, dirVector, altitudeOffset = 0 }) {
    this.id = id;
    this.species = FAUNA_SPECIES[speciesKey] || FAUNA_SPECIES.herding_quadruped;
    this.speciesKey = this.species.id;
    this.name = this.species.name;
    this.locomotion = this.species.locomotion;
    this.sizeCategory = this.species.sizeCategory;
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
    switch (k) {
      case 'colossal_behemoth':
        this._buildColossalBehemoth();
        break;
      case 'bipedal_tracker':
      case 'spined_stalker':
        this._buildBipedalTracker();
        break;
      case 'armored_burrower':
        this._buildArmoredBurrower();
        break;
      case 'herding_quadruped':
      case 'hexapod_strider':
        this._buildHerdingQuadruped();
        break;
      case 'scurrying_swarmer':
        this._buildScurryingSwarmer();
        break;
      case 'leviathan_eel':
      case 'abyssal_maw':
        this._buildLeviathanEel();
        break;
      case 'faceted_ray':
      case 'ribbon_leviathan':
        this._buildFacetedRay();
        break;
      case 'plated_crustacean':
        this._buildPlatedCrustacean();
        break;
      case 'aerial_skimmer':
      case 'sky_manta':
        this._buildAerialSkimmer();
        break;
      case 'tiny_darting_flier':
        this._buildTinyDartingFlier();
        break;
      default:
        this._buildHerdingQuadruped();
        break;
    }
  }

  // 1) Colossal Behemoth (Huge, Land Quadruped)
  _buildColossalBehemoth() {
    const scale = 2.4;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1c192e, roughness: 0.38, metalness: 0.55 });
    const crystalMat = new THREE.MeshStandardMaterial({ color: 0x4c2882, emissive: 0x00f5d4, emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.7 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.primaryMat = bodyMat;

    // Massive faceted torso
    const torso = new THREE.Mesh(new THREE.CylinderGeometry(1.4 * scale, 1.8 * scale, 3.8 * scale, 7), bodyMat);
    torso.rotation.x = Math.PI / 2;
    torso.position.set(0, 1.8 * scale, 0);
    torso.scale.set(1.1, 0.85, 1.0);
    this.visualRoot.add(torso);

    // Towering dorsal crystal spires (7 spires along spine)
    const spireCoords = [
      { x: 0, y: 2.8 * scale, z: -1.0 * scale, h: 2.2 * scale, r: 0.35 * scale },
      { x: 0.45 * scale, y: 3.1 * scale, z: -0.4 * scale, h: 2.8 * scale, r: 0.45 * scale },
      { x: -0.45 * scale, y: 3.2 * scale, z: 0.1 * scale, h: 3.2 * scale, r: 0.5 * scale },
      { x: 0, y: 3.0 * scale, z: 0.6 * scale, h: 2.6 * scale, r: 0.4 * scale },
      { x: -0.35 * scale, y: 2.6 * scale, z: 1.1 * scale, h: 1.9 * scale, r: 0.35 * scale },
      { x: 0.35 * scale, y: 2.5 * scale, z: 1.4 * scale, h: 1.6 * scale, r: 0.3 * scale },
      { x: 0, y: 2.2 * scale, z: 1.7 * scale, h: 1.3 * scale, r: 0.25 * scale }
    ];
    spireCoords.forEach(c => {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(c.r, c.h, 5), crystalMat);
      sp.position.set(c.x, c.y, c.z);
      sp.rotation.x = 0.15;
      sp.rotation.z = (c.x > 0 ? 0.2 : (c.x < 0 ? -0.2 : 0));
      this.visualRoot.add(sp);
    });

    // Armored Head with recurved cheek horns
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.6 * scale, -2.1 * scale);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4 * scale, 1.2 * scale, 1.8 * scale), bodyMat);
    headGroup.add(headMesh);

    // Cheek horns
    const hornL = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 1.4 * scale, 4), crystalMat);
    hornL.position.set(-0.85 * scale, -0.2 * scale, 0.4 * scale);
    hornL.rotation.set(0.4, 0, -0.6);
    const hornR = new THREE.Mesh(new THREE.ConeGeometry(0.3 * scale, 1.4 * scale, 4), crystalMat);
    hornR.position.set(0.85 * scale, -0.2 * scale, 0.4 * scale);
    hornR.rotation.set(0.4, 0, 0.6);
    headGroup.add(hornL, hornR);

    // Glowing eyes
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 6, 6), eyeMat);
    eyeL.position.set(-0.6 * scale, 0.25 * scale, -0.8 * scale);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 6, 6), eyeMat);
    eyeR.position.set(0.6 * scale, 0.25 * scale, -0.8 * scale);
    headGroup.add(eyeL, eyeR);

    this.visualRoot.add(headGroup);
    this.animParts.head = headGroup;

    // 4 Heavy columnar legs with basalt knuckle armor
    this.animParts.legs = [];
    const legPositions = [
      { x: -1.2 * scale, z: -1.2 * scale },
      { x: 1.2 * scale, z: -1.2 * scale },
      { x: -1.3 * scale, z: 1.2 * scale },
      { x: 1.3 * scale, z: 1.2 * scale }
    ];
    legPositions.forEach(lp => {
      const legGroup = new THREE.Group();
      legGroup.position.set(lp.x, 1.5 * scale, lp.z);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * scale, 0.5 * scale, 1.6 * scale, 6), bodyMat);
      upper.position.y = -0.75 * scale;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.9 * scale, 0.45 * scale, 1.0 * scale), crystalMat);
      foot.position.y = -1.4 * scale;
      legGroup.add(upper, foot);
      this.visualRoot.add(legGroup);
      this.animParts.legs.push(legGroup);
    });

    // Segmented armored tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.6 * scale, 1.8 * scale);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.7 * scale, 2.4 * scale, 5), bodyMat);
    tailMesh.rotation.x = Math.PI / 2;
    tailMesh.position.z = 1.1 * scale;
    tailGroup.add(tailMesh);
    this.visualRoot.add(tailGroup);
    this.animParts.tail = tailGroup;
  }

  // 2) Bipedal Tracker (Medium, Land Raptor)
  _buildBipedalTracker() {
    const scale = 1.35;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0c303f, roughness: 0.35, metalness: 0.5 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, emissive: 0x00f5d4, emissiveIntensity: 0.45, roughness: 0.25 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, metalness: 0.7, roughness: 0.2 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.primaryMat = bodyMat;

    // Torso angled forward
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.6 * scale, 2.2 * scale, 6), bodyMat);
    torso.rotation.x = -Math.PI * 0.42;
    torso.position.set(0, 1.5 * scale, -0.2 * scale);
    this.visualRoot.add(torso);

    // Balance tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.4 * scale, 0.6 * scale);
    const tailMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.25 * scale, 0.05 * scale, 2.6 * scale, 5), bodyMat);
    tailMesh.rotation.x = Math.PI / 2;
    tailMesh.position.z = 1.25 * scale;
    tailGroup.add(tailMesh);
    this.visualRoot.add(tailGroup);
    this.animParts.tail = tailGroup;

    // Head with faceted crest and sensor cluster
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.9 * scale, -1.2 * scale);
    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.55 * scale, 0.48 * scale, 0.95 * scale), bodyMat);
    headGroup.add(headMesh);

    const crest = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 1.1 * scale, 4), crestMat);
    crest.rotation.x = -0.55;
    crest.position.set(0, 0.45 * scale, -0.1 * scale);
    headGroup.add(crest);

    // Multi-eye sensor cluster (4 glowing nodules)
    [-0.22, 0.22].forEach(x => {
      const e1 = new THREE.Mesh(new THREE.SphereGeometry(0.08 * scale, 5, 5), eyeMat);
      e1.position.set(x * scale, 0.12 * scale, -0.45 * scale);
      const e2 = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 5, 5), eyeMat);
      e2.position.set(x * scale * 1.15, 0.22 * scale, -0.28 * scale);
      headGroup.add(e1, e2);
    });
    this.visualRoot.add(headGroup);
    this.animParts.head = headGroup;

    // Grasping forearms
    [-0.45, 0.45].forEach(x => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.04 * scale, 0.8 * scale, 4), bodyMat);
      arm.position.set(x * scale, 1.35 * scale, -0.85 * scale);
      arm.rotation.x = -0.65;
      arm.rotation.z = x > 0 ? 0.3 : -0.3;
      this.visualRoot.add(arm);
    });

    // 2 Digitigrade Legs with sickle claws
    this.animParts.legs = [];
    [-0.55, 0.55].forEach((x, idx) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(x * scale, 1.4 * scale, 0.1 * scale);

      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.24 * scale, 0.16 * scale, 1.0 * scale, 5), bodyMat);
      thigh.position.set(0, -0.45 * scale, 0);
      thigh.rotation.x = 0.25;

      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.14 * scale, 0.09 * scale, 1.1 * scale, 5), bodyMat);
      shin.position.set(0, -1.05 * scale, 0.15 * scale);
      shin.rotation.x = -0.35;

      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.1 * scale, 0.65 * scale), bodyMat);
      foot.position.set(0, -1.45 * scale, -0.15 * scale);

      // Sickle claw
      const claw = new THREE.Mesh(new THREE.ConeGeometry(0.1 * scale, 0.45 * scale, 4), clawMat);
      claw.rotation.x = -Math.PI * 0.65;
      claw.position.set(0, -1.35 * scale, -0.45 * scale);

      legGroup.add(thigh, shin, foot, claw);
      this.visualRoot.add(legGroup);
      this.animParts.legs.push(legGroup);
    });
  }

  // 3) Armored Burrower (Small, Land 6-Leg)
  _buildArmoredBurrower() {
    const scale = 1.05;
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x241738, roughness: 0.4, metalness: 0.6 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x581c87, metalness: 0.7, roughness: 0.3 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf72585 });
    this.primaryMat = shellMat;

    // Segmented dome carapace (4 overlapping shells)
    for (let s = 0; s < 4; s++) {
      const shell = new THREE.Mesh(new THREE.SphereGeometry(0.65 * scale - s * 0.06 * scale, 7, 5), shellMat);
      shell.scale.set(1.15, 0.6, 0.85);
      shell.position.set(0, 0.65 * scale, -0.45 * scale + s * 0.45 * scale);
      this.visualRoot.add(shell);
    }

    // Glowing magenta eye nodes (6 nodes)
    for (let e = 0; e < 6; e++) {
      const side = e % 2 === 0 ? -1 : 1;
      const row = Math.floor(e / 2);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 5, 5), eyeMat);
      eye.position.set(side * (0.28 + row * 0.08) * scale, 0.75 * scale, -0.55 * scale + row * 0.25 * scale);
      this.visualRoot.add(eye);
    }

    // Dual front crushing pincers
    this.animParts.pincers = [];
    [-0.45, 0.45].forEach(x => {
      const pincerGroup = new THREE.Group();
      pincerGroup.position.set(x * scale, 0.45 * scale, -0.75 * scale);

      const clawUpper = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.95 * scale, 4), clawMat);
      clawUpper.rotation.set(-0.35, 0, x > 0 ? 0.4 : -0.4);
      clawUpper.position.set(x > 0 ? 0.15 * scale : -0.15 * scale, 0, -0.4 * scale);

      const clawLower = new THREE.Mesh(new THREE.ConeGeometry(0.14 * scale, 0.75 * scale, 4), clawMat);
      clawLower.rotation.set(0.2, 0, x > 0 ? 0.2 : -0.2);
      clawLower.position.set(0, -0.1 * scale, -0.3 * scale);

      pincerGroup.add(clawUpper, clawLower);
      this.visualRoot.add(pincerGroup);
      this.animParts.pincers.push(pincerGroup);
    });

    // 6 Jointed crawling legs
    this.animParts.legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2) - 1;
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.55 * scale, 0.45 * scale, row * 0.42 * scale);

      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.07 * scale, 0.03 * scale, 0.75 * scale, 4), shellMat);
      legMesh.position.set(side * 0.2 * scale, -0.3 * scale, 0);
      legMesh.rotation.z = side * 0.45;
      legGroup.add(legMesh);
      this.visualRoot.add(legGroup);
      this.animParts.legs.push(legGroup);
    }
  }

  // 4) Herding Quadruped (Medium, Land Ungulate)
  _buildHerdingQuadruped() {
    const scale = 1.35;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.4 });
    const flankMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, roughness: 0.35, metalness: 0.5 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.5 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, emissive: 0xc084fc, emissiveIntensity: 0.6, roughness: 0.2, metalness: 0.7 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x38bdf8 });
    this.primaryMat = bodyMat;

    // Slender torso with crystal faceted flank plates
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.75 * scale, 0.85 * scale, 1.85 * scale), bodyMat);
    torso.position.set(0, 1.45 * scale, 0);
    this.visualRoot.add(torso);

    // Spine ridge
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.25 * scale, 0.2 * scale, 1.9 * scale), spineMat);
    spine.position.set(0, 1.95 * scale, 0);
    this.visualRoot.add(spine);

    // Flank crystals
    [-0.4, 0.4].forEach(x => {
      const flank = new THREE.Mesh(new THREE.ConeGeometry(0.22 * scale, 1.1 * scale, 4), flankMat);
      flank.rotation.x = Math.PI / 2;
      flank.position.set(x * scale, 1.45 * scale, 0.1 * scale);
      this.visualRoot.add(flank);
    });

    // Neck & Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.7 * scale, -0.9 * scale);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.22 * scale, 0.32 * scale, 0.95 * scale, 5), bodyMat);
    neck.position.set(0, 0.35 * scale, -0.25 * scale);
    neck.rotation.x = -0.45;
    headGroup.add(neck);

    const headMesh = new THREE.Mesh(new THREE.BoxGeometry(0.42 * scale, 0.4 * scale, 0.75 * scale), bodyMat);
    headMesh.position.set(0, 0.75 * scale, -0.55 * scale);
    headGroup.add(headMesh);

    // Glowing cyan eyes
    [-0.22, 0.22].forEach(x => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.06 * scale, 5, 5), eyeMat);
      eye.position.set(x * scale, 0.85 * scale, -0.65 * scale);
      headGroup.add(eye);
    });

    // Multi-branched crystal quartz antlers (2 main beams splitting into 3 crystal tines each)
    [-0.18, 0.18].forEach(x => {
      const antlerBeam = new THREE.Mesh(new THREE.ConeGeometry(0.08 * scale, 1.25 * scale, 4), antlerMat);
      antlerBeam.position.set(x * scale, 1.35 * scale, -0.45 * scale);
      antlerBeam.rotation.set(-0.25, 0, x > 0 ? 0.3 : -0.3);

      const tine1 = new THREE.Mesh(new THREE.ConeGeometry(0.05 * scale, 0.65 * scale, 4), antlerMat);
      tine1.position.set(x * scale * 1.5, 1.2 * scale, -0.35 * scale);
      tine1.rotation.set(0.15, 0, x > 0 ? 0.6 : -0.6);

      const tine2 = new THREE.Mesh(new THREE.ConeGeometry(0.04 * scale, 0.45 * scale, 4), antlerMat);
      tine2.position.set(x * scale * 0.8, 1.5 * scale, -0.25 * scale);
      tine2.rotation.set(-0.5, 0, x > 0 ? 0.2 : -0.2);

      headGroup.add(antlerBeam, tine1, tine2);
    });

    this.visualRoot.add(headGroup);
    this.animParts.head = headGroup;

    // 4 Slender hooved legs
    this.animParts.legs = [];
    const legCoords = [
      { x: -0.38 * scale, z: -0.65 * scale },
      { x: 0.38 * scale, z: -0.65 * scale },
      { x: -0.38 * scale, z: 0.65 * scale },
      { x: 0.38 * scale, z: 0.65 * scale }
    ];
    legCoords.forEach(c => {
      const legGroup = new THREE.Group();
      legGroup.position.set(c.x, 1.2 * scale, c.z);
      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.09 * scale, 0.05 * scale, 1.4 * scale, 5), bodyMat);
      legMesh.position.y = -0.7 * scale;
      const hoof = new THREE.Mesh(new THREE.BoxGeometry(0.12 * scale, 0.15 * scale, 0.16 * scale), spineMat);
      hoof.position.y = -1.35 * scale;
      legGroup.add(legMesh, hoof);
      this.visualRoot.add(legGroup);
      this.animParts.legs.push(legGroup);
    });
  }

  // 5) Scurrying Swarmer (Tiny, Land 6-Leg Arachnid)
  _buildScurryingSwarmer() {
    const scale = 0.65;
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x22133a, roughness: 0.45, metalness: 0.55 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.3 });
    const nodeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.primaryMat = shellMat;

    // Spined dome carapace
    const dome = new THREE.Mesh(new THREE.SphereGeometry(0.55 * scale, 6, 5), shellMat);
    dome.scale.set(1.0, 0.7, 1.2);
    dome.position.set(0, 0.45 * scale, 0);
    this.visualRoot.add(dome);

    // Needle spines radiating from back
    for (let sp = 0; sp < 5; sp++) {
      const a = (sp / 5) * Math.PI * 2;
      const spine = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.45 * scale, 4), spineMat);
      spine.position.set(Math.cos(a) * 0.35 * scale, 0.7 * scale, Math.sin(a) * 0.45 * scale);
      spine.rotation.set(Math.sin(a) * 0.4, 0, Math.cos(a) * 0.4);
      this.visualRoot.add(spine);
    }

    // 6 Glowing cyan bioluminescent nodes on abdomen
    for (let n = 0; n < 6; n++) {
      const side = n % 2 === 0 ? -1 : 1;
      const row = Math.floor(n / 2);
      const node = new THREE.Mesh(new THREE.SphereGeometry(0.07 * scale, 4, 4), nodeMat);
      node.position.set(side * 0.28 * scale, 0.55 * scale, -0.2 * scale + row * 0.22 * scale);
      this.visualRoot.add(node);
    }

    // 6 Fast scuttling legs
    this.animParts.legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2) - 1;
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.45 * scale, 0.35 * scale, row * 0.32 * scale);

      const legMesh = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * scale, 0.02 * scale, 0.65 * scale, 4), shellMat);
      legMesh.position.set(side * 0.18 * scale, -0.25 * scale, 0);
      legMesh.rotation.z = side * 0.65;
      legGroup.add(legMesh);
      this.visualRoot.add(legGroup);
      this.animParts.legs.push(legGroup);
    }
  }

  // 6) Leviathan Eel (Large, Aquatic Serpentine)
  _buildLeviathanEel() {
    const scale = 2.0;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.28, metalness: 0.45 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0x0891b2, emissive: 0x22d3ee, emissiveIntensity: 0.6, roughness: 0.2 });
    const toothMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const whiskerMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.primaryMat = bodyMat;

    // Articulated sinuous spine (10 segments)
    this.animParts.segments = [];
    for (let s = 0; s < 10; s++) {
      const r = 0.85 * scale * (1.0 - s * 0.075);
      const segMesh = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.85, r, 1.25 * scale, 6), bodyMat);
      segMesh.rotation.x = Math.PI / 2;
      segMesh.position.set(0, 0, s * 1.15 * scale - 4.5 * scale);

      // Dorsal glowing spine crest on each segment
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.18 * scale, 0.75 * scale, 4), spineMat);
      fin.position.set(0, r + 0.35 * scale, 0);
      fin.rotation.x = 0.25;
      segMesh.add(fin);

      this.visualRoot.add(segMesh);
      this.animParts.segments.push(segMesh);
    }

    // Predatory fanged head (attached to segment 0)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0, -4.8 * scale);
    const headMesh = new THREE.Mesh(new THREE.ConeGeometry(0.85 * scale, 1.8 * scale, 6), bodyMat);
    headMesh.rotation.x = -Math.PI / 2;
    headGroup.add(headMesh);

    // Glowing cyan whiskers
    [-0.55, 0.55].forEach(x => {
      const whisker = new THREE.Mesh(new THREE.CylinderGeometry(0.04 * scale, 0.01 * scale, 1.8 * scale, 4), whiskerMat);
      whisker.position.set(x * scale, -0.2 * scale, -0.6 * scale);
      whisker.rotation.set(0.4, 0, x > 0 ? 0.6 : -0.6);
      headGroup.add(whisker);
    });

    // Fangs in jaw
    for (let t = 0; t < 6; t++) {
      const fang = new THREE.Mesh(new THREE.ConeGeometry(0.06 * scale, 0.25 * scale, 3), toothMat);
      fang.position.set((t % 2 === 0 ? -0.35 : 0.35) * scale, -0.3 * scale, -0.4 * scale - Math.floor(t / 2) * 0.25 * scale);
      fang.rotation.x = Math.PI;
      headGroup.add(fang);
    }

    this.visualRoot.add(headGroup);
    this.animParts.head = headGroup;
  }

  // 7) Faceted Ray (Medium, Aquatic Manta)
  _buildFacetedRay() {
    const scale = 1.6;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8, roughness: 0.32, metalness: 0.5 });
    const spineMat = new THREE.MeshStandardMaterial({ color: 0xc084fc, emissive: 0xf43f5e, emissiveIntensity: 0.5, roughness: 0.25, metalness: 0.6 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0xf43f5e, emissive: 0xf43f5e, emissiveIntensity: 0.7, side: THREE.DoubleSide });
    this.primaryMat = bodyMat;

    // Diamond faceted core
    const core = new THREE.Mesh(new THREE.ConeGeometry(0.85 * scale, 2.6 * scale, 5), bodyMat);
    core.scale.set(1.4, 0.35, 1.0);
    core.rotation.x = -Math.PI / 2;
    core.position.set(0, 0, 0);
    this.visualRoot.add(core);

    // Spine crystal cluster
    for (let i = 0; i < 4; i++) {
      const sp = new THREE.Mesh(new THREE.ConeGeometry(0.12 * scale, 0.65 * scale, 4), spineMat);
      sp.position.set(0, 0.25 * scale, -0.6 * scale + i * 0.45 * scale);
      sp.rotation.x = 0.25;
      this.visualRoot.add(sp);
    }

    // Articulated Left and Right Pectoral Wings
    this.animParts.leftWingGroup = new THREE.Group();
    this.animParts.leftWingGroup.position.set(-0.75 * scale, 0, 0);
    const leftWing = new THREE.Mesh(new THREE.ConeGeometry(1.6 * scale, 2.2 * scale, 4), bodyMat);
    leftWing.scale.set(0.12, 1.0, 0.85);
    leftWing.rotation.set(Math.PI / 2, 0, Math.PI / 2);
    leftWing.position.set(-0.95 * scale, 0, 0);
    this.animParts.leftWingGroup.add(leftWing);

    // Glowing trim on wing margin
    const leftTrim = new THREE.Mesh(new THREE.BoxGeometry(2.1 * scale, 0.05 * scale, 0.1 * scale), trimMat);
    leftTrim.position.set(-1.0 * scale, 0, 0.65 * scale);
    leftTrim.rotation.y = 0.45;
    this.animParts.leftWingGroup.add(leftTrim);
    this.visualRoot.add(this.animParts.leftWingGroup);

    this.animParts.rightWingGroup = new THREE.Group();
    this.animParts.rightWingGroup.position.set(0.75 * scale, 0, 0);
    const rightWing = new THREE.Mesh(new THREE.ConeGeometry(1.6 * scale, 2.2 * scale, 4), bodyMat);
    rightWing.scale.set(0.12, 1.0, 0.85);
    rightWing.rotation.set(Math.PI / 2, 0, -Math.PI / 2);
    rightWing.position.set(0.95 * scale, 0, 0);
    this.animParts.rightWingGroup.add(rightWing);

    const rightTrim = new THREE.Mesh(new THREE.BoxGeometry(2.1 * scale, 0.05 * scale, 0.1 * scale), trimMat);
    rightTrim.position.set(1.0 * scale, 0, 0.65 * scale);
    rightTrim.rotation.y = -0.45;
    this.animParts.rightWingGroup.add(rightTrim);
    this.visualRoot.add(this.animParts.rightWingGroup);

    // Whip tail with terminal crystal barb
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * scale, 0.01 * scale, 2.4 * scale, 4), spineMat);
    tail.rotation.x = Math.PI / 2;
    tail.position.set(0, 0, 2.2 * scale);
    this.visualRoot.add(tail);
    this.animParts.tail = tail;
  }

  // 8) Plated Crustacean (Small, Aquatic Benthic Crab)
  _buildPlatedCrustacean() {
    const scale = 1.1;
    const shellMat = new THREE.MeshStandardMaterial({ color: 0x1f162b, roughness: 0.38, metalness: 0.55 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0x6b21a8, roughness: 0.3, metalness: 0.65 });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0xf43f5e });
    this.primaryMat = shellMat;

    // Faceted dome carapace
    const carapace = new THREE.Mesh(new THREE.CylinderGeometry(0.85 * scale, 1.15 * scale, 0.65 * scale, 7), shellMat);
    carapace.scale.set(1.3, 1.0, 0.95);
    carapace.position.set(0, 0.55 * scale, 0);
    this.visualRoot.add(carapace);

    // Glowing eye slit
    const eye = new THREE.Mesh(new THREE.BoxGeometry(0.7 * scale, 0.08 * scale, 0.15 * scale), eyeMat);
    eye.position.set(0, 0.65 * scale, -0.6 * scale);
    this.visualRoot.add(eye);

    // Oversized crushing claws (dual pincers)
    this.animParts.claws = [];
    [-0.85, 0.85].forEach((x, idx) => {
      const clawGroup = new THREE.Group();
      clawGroup.position.set(x * scale, 0.45 * scale, -0.65 * scale);

      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale, 0.14 * scale, 0.75 * scale, 5), shellMat);
      arm.rotation.z = x > 0 ? -0.8 : 0.8;
      arm.position.set(x > 0 ? 0.3 * scale : -0.3 * scale, 0.15 * scale, -0.15 * scale);

      const pincer = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 1.1 * scale, 4), clawMat);
      pincer.rotation.set(-0.35, 0, x > 0 ? 0.45 : -0.45);
      pincer.position.set(x > 0 ? 0.65 * scale : -0.65 * scale, 0.25 * scale, -0.45 * scale);

      clawGroup.add(arm, pincer);
      this.visualRoot.add(clawGroup);
      this.animParts.claws.push(clawGroup);
    });

    // 6 Jointed walking legs (3 left, 3 right)
    this.animParts.legs = [];
    for (let i = 0; i < 6; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const row = Math.floor(i / 2) - 1;
      const legG = new THREE.Group();
      legG.position.set(side * 0.95 * scale, 0.45 * scale, row * 0.35 * scale);

      const legM = new THREE.Mesh(new THREE.CylinderGeometry(0.08 * scale, 0.04 * scale, 0.85 * scale, 4), shellMat);
      legM.position.set(side * 0.3 * scale, -0.35 * scale, 0);
      legM.rotation.z = side * 0.55;
      legG.add(legM);
      this.visualRoot.add(legG);
      this.animParts.legs.push(legG);
    }
  }

  // 9) Aerial Skimmer (Medium, Flying 4-Wing Dragonfly)
  _buildAerialSkimmer() {
    const scale = 1.45;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x083344, roughness: 0.35, metalness: 0.6 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x22d3ee,
      emissive: 0x00f5d4,
      emissiveIntensity: 0.55,
      transparent: true,
      opacity: 0.82,
      roughness: 0.15,
      side: THREE.DoubleSide
    });
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.primaryMat = bodyMat;

    // Segmented fuselage & head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.35 * scale, 6, 6), bodyMat);
    head.position.set(0, 0, -1.1 * scale);
    const eyeL = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 5, 5), eyeMat);
    eyeL.position.set(-0.25 * scale, 0.1 * scale, -1.25 * scale);
    const eyeR = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 5, 5), eyeMat);
    eyeR.position.set(0.25 * scale, 0.1 * scale, -1.25 * scale);
    this.visualRoot.add(head, eyeL, eyeR);

    // Thorax
    const thorax = new THREE.Mesh(new THREE.CylinderGeometry(0.3 * scale, 0.38 * scale, 0.95 * scale, 6), bodyMat);
    thorax.rotation.x = Math.PI / 2;
    thorax.position.set(0, 0, -0.45 * scale);
    this.visualRoot.add(thorax);

    // Long segmented abdominal tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0, 0.1 * scale);
    for (let s = 0; s < 5; s++) {
      const seg = new THREE.Mesh(new THREE.CylinderGeometry(0.18 * scale - s * 0.02 * scale, 0.22 * scale - s * 0.02 * scale, 0.65 * scale, 5), bodyMat);
      seg.rotation.x = Math.PI / 2;
      seg.position.set(0, 0, s * 0.65 * scale + 0.35 * scale);
      tailGroup.add(seg);
    }
    // Terminal crystal tail fluke
    const fluke = new THREE.Mesh(new THREE.ConeGeometry(0.25 * scale, 0.85 * scale, 4), wingMat);
    fluke.position.set(0, 0, 3.8 * scale);
    fluke.rotation.x = Math.PI / 2;
    tailGroup.add(fluke);
    this.visualRoot.add(tailGroup);
    this.animParts.tail = tailGroup;

    // 4 Translucent Faceted Crystal Wings (Forewings and Hindwings)
    this.animParts.foreWingL = new THREE.Group();
    this.animParts.foreWingL.position.set(-0.35 * scale, 0.15 * scale, -0.6 * scale);
    const fwL = new THREE.Mesh(new THREE.BoxGeometry(2.4 * scale, 0.04 * scale, 0.65 * scale), wingMat);
    fwL.position.set(-1.2 * scale, 0, 0.15 * scale);
    fwL.rotation.y = 0.2;
    this.animParts.foreWingL.add(fwL);

    this.animParts.foreWingR = new THREE.Group();
    this.animParts.foreWingR.position.set(0.35 * scale, 0.15 * scale, -0.6 * scale);
    const fwR = new THREE.Mesh(new THREE.BoxGeometry(2.4 * scale, 0.04 * scale, 0.65 * scale), wingMat);
    fwR.position.set(1.2 * scale, 0, 0.15 * scale);
    fwR.rotation.y = -0.2;
    this.animParts.foreWingR.add(fwR);

    this.animParts.hindWingL = new THREE.Group();
    this.animParts.hindWingL.position.set(-0.35 * scale, 0.15 * scale, -0.2 * scale);
    const hwL = new THREE.Mesh(new THREE.BoxGeometry(2.1 * scale, 0.04 * scale, 0.55 * scale), wingMat);
    hwL.position.set(-1.05 * scale, 0, 0.1 * scale);
    hwL.rotation.y = 0.1;
    this.animParts.hindWingL.add(hwL);

    this.animParts.hindWingR = new THREE.Group();
    this.animParts.hindWingR.position.set(0.35 * scale, 0.15 * scale, -0.2 * scale);
    const hwR = new THREE.Mesh(new THREE.BoxGeometry(2.1 * scale, 0.04 * scale, 0.55 * scale), wingMat);
    hwR.position.set(1.05 * scale, 0, 0.1 * scale);
    hwR.rotation.y = -0.1;
    this.animParts.hindWingR.add(hwR);

    this.visualRoot.add(this.animParts.foreWingL, this.animParts.foreWingR, this.animParts.hindWingL, this.animParts.hindWingR);
  }

  // 10) Tiny Darting Flier (Tiny, Flying Humming-Moth)
  _buildTinyDartingFlier() {
    const scale = 0.55;
    const bodyMat = new THREE.MeshStandardMaterial({ color: 0x701a75, roughness: 0.25, metalness: 0.7 });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0xe879f9,
      emissive: 0xf43f5e,
      emissiveIntensity: 0.75,
      transparent: true,
      opacity: 0.85,
      side: THREE.DoubleSide
    });
    const thrusterMat = new THREE.MeshBasicMaterial({ color: 0xfae8ff });
    this.primaryMat = bodyMat;

    // Sleek triangular crystal fuselage
    const body = new THREE.Mesh(new THREE.ConeGeometry(0.35 * scale, 1.4 * scale, 5), bodyMat);
    body.rotation.x = -Math.PI / 2;
    this.visualRoot.add(body);

    // Glowing ion thruster spark
    const thruster = new THREE.Mesh(new THREE.SphereGeometry(0.12 * scale, 5, 5), thrusterMat);
    thruster.position.set(0, 0, 0.75 * scale);
    this.visualRoot.add(thruster);

    // Dual delta crystal wings
    this.animParts.leftWingGroup = new THREE.Group();
    this.animParts.leftWingGroup.position.set(-0.25 * scale, 0, 0);
    const wingL = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.03 * scale, 0.75 * scale), wingMat);
    wingL.position.set(-0.6 * scale, 0, 0);
    wingL.rotation.y = 0.35;
    this.animParts.leftWingGroup.add(wingL);

    this.animParts.rightWingGroup = new THREE.Group();
    this.animParts.rightWingGroup.position.set(0.25 * scale, 0, 0);
    const wingR = new THREE.Mesh(new THREE.BoxGeometry(1.2 * scale, 0.03 * scale, 0.75 * scale), wingMat);
    wingR.position.set(0.6 * scale, 0, 0);
    wingR.rotation.y = -0.35;
    this.animParts.rightWingGroup.add(wingR);

    this.visualRoot.add(this.animParts.leftWingGroup, this.animParts.rightWingGroup);
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
        this.primaryMat.emissiveIntensity = this.flashTimer > 0 ? 2.2 : 0.5;
      }
    }

    const distToPlayer = explorerPos ? this.group.position.distanceTo(explorerPos) : Infinity;

    // Aggro & Behavior State Machine
    const isHostile = this.temperament === 'aggressive' || (this.temperament === 'territorial' && distToPlayer <= this.species.aggroRadius) || (this.temperament === 'defensive' && distToPlayer <= this.species.aggroRadius);

    if (isHostile && distToPlayer <= this.species.aggroRadius) {
      if (distToPlayer <= this.species.attackRange) {
        this.state = 'ATTACK';
        if (this.attackCooldown <= 0 && onAttackPlayer) {
          this.attackCooldown = this.species.sizeCategory === 'huge' ? 2.8 : 1.6;
          onAttackPlayer(this.species.attackDamage, this.name, this);
        }
      } else {
        this.state = 'AGGRO';
      }

      if (explorerPos && this.body) {
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
        // Turn heading
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

    // Procedural Locomotion Animations
    const animMultiplier = this.species.sizeCategory === 'tiny' ? 24.0 : (this.species.sizeCategory === 'huge' ? 3.5 : (this.state === 'AGGRO' ? 12.0 : 6.5));
    this.animPhase += dt * animMultiplier;
    const s = Math.sin(this.animPhase);

    // 1. Legs Animation (Bipedal, Quadruped, 6-Leg Crawling)
    if (this.animParts.legs) {
      const legs = this.animParts.legs;
      if (legs.length === 2) {
        // Bipedal raptor stride
        legs[0].rotation.x = s * 0.75;
        legs[1].rotation.x = -s * 0.75;
      } else if (legs.length === 4) {
        // Quadruped gait (diagonal pairs)
        legs[0].rotation.x = s * 0.5;
        legs[1].rotation.x = -s * 0.5;
        legs[2].rotation.x = -s * 0.5;
        legs[3].rotation.x = s * 0.5;
      } else if (legs.length === 6) {
        // Hexapod tripod gait
        legs[0].rotation.x = s * 0.6;
        legs[1].rotation.x = -s * 0.6;
        legs[2].rotation.x = -s * 0.6;
        legs[3].rotation.x = s * 0.6;
        legs[4].rotation.x = s * 0.6;
        legs[5].rotation.x = -s * 0.6;
      }
    }

    // 2. Head / Pincers / Claws Strike Animation
    if (this.animParts.head) {
      this.animParts.head.rotation.y = Math.sin(this.animPhase * 0.5) * 0.12;
    }
    if (this.animParts.pincers) {
      const pSnap = this.state === 'ATTACK' ? Math.abs(Math.sin(this.animPhase * 2.5)) * 0.5 : Math.sin(this.animPhase) * 0.15;
      this.animParts.pincers.forEach((p, idx) => {
        p.rotation.y = idx === 0 ? pSnap : -pSnap;
      });
    }
    if (this.animParts.claws) {
      const cSnap = this.state === 'ATTACK' ? Math.abs(Math.sin(this.animPhase * 2.5)) * 0.6 : Math.sin(this.animPhase) * 0.2;
      this.animParts.claws.forEach((c, idx) => {
        c.rotation.x = idx === 0 ? cSnap : -cSnap;
      });
    }

    // 3. Serpentine Spine Undulation (Leviathan Eel)
    if (this.animParts.segments) {
      const segs = this.animParts.segments;
      for (let i = 0; i < segs.length; i++) {
        segs[i].position.x = Math.sin(this.animPhase - i * 0.6) * 0.35 * (i / segs.length);
      }
    }

    // 4. Manta Wing Flapping (Faceted Ray)
    if (this.animParts.leftWingGroup && this.animParts.rightWingGroup) {
      const wingAmp = this.speciesKey === 'tiny_darting_flier' ? 0.65 : 0.38;
      this.animParts.leftWingGroup.rotation.z = s * wingAmp;
      this.animParts.rightWingGroup.rotation.z = -s * wingAmp;
    }

    // 5. 4-Wing Anti-Phase Dragonfly Flutter (Aerial Skimmer)
    if (this.animParts.foreWingL && this.animParts.foreWingR && this.animParts.hindWingL && this.animParts.hindWingR) {
      this.animParts.foreWingL.rotation.z = s * 0.45;
      this.animParts.foreWingR.rotation.z = -s * 0.45;
      this.animParts.hindWingL.rotation.z = -s * 0.45; // Anti-phase
      this.animParts.hindWingR.rotation.z = s * 0.45;
    }

    // 6. Tail Sway
    if (this.animParts.tail) {
      this.animParts.tail.rotation.y = Math.sin(this.animPhase * 0.8) * 0.22;
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
      // 1. Guaranteed encounter near Aurelia Prime base camp (0, 1, 0)
      // Peaceful herding quadrupeds
      addEntity('herding_quadruped', this.planet, new THREE.Vector3(0.02, 0.999, -0.025).normalize(), 0);
      addEntity('herding_quadruped', this.planet, new THREE.Vector3(-0.03, 0.998, 0.03).normalize(), 0);
      // Hostile bipedal tracker patrolling valley
      addEntity('bipedal_tracker', this.planet, new THREE.Vector3(-0.045, 0.998, -0.035).normalize(), 0);
      // Defensive armored burrower near rocks
      addEntity('armored_burrower', this.planet, new THREE.Vector3(0.04, 0.998, 0.04).normalize(), 0);
      // Swarm cluster of scurrying swarmers (pack of 4)
      for (let k = 0; k < 4; k++) {
        const off = (k - 1.5) * 0.008;
        addEntity('scurrying_swarmer', this.planet, new THREE.Vector3(0.025 + off, 0.998, -0.04 + off).normalize(), 0);
      }
      // Fliers overhead
      addEntity('aerial_skimmer', this.planet, new THREE.Vector3(0.02, 0.999, -0.04).normalize(), 48);
      addEntity('tiny_darting_flier', this.planet, new THREE.Vector3(-0.015, 0.999, 0.025).normalize(), 8);
      addEntity('tiny_darting_flier', this.planet, new THREE.Vector3(0.035, 0.999, 0.015).normalize(), 10);

      // Guaranteed oceanic encounters in Aurelia Prime marine biomes
      const seaLevel = this.planet.seaLevelRadius || 718;
      let shallowDir = null;
      let deepDir = null;
      let maxD = 0;
      let minLagoonDiff = Infinity;

      for (let u = -1; u <= 1; u += 0.35) {
        for (let v = -1; v <= 1; v += 0.35) {
          for (let w = -1; w <= 1; w += 0.35) {
            const d = new THREE.Vector3(u, v, w);
            if (d.lengthSq() < 0.1) continue;
            d.normalize();
            const surfR = this.planet.getSurfaceRadiusAtDir(d.x, d.y, d.z);
            const dep = seaLevel - surfR;
            if (dep > maxD) {
              maxD = dep;
              deepDir = d;
            }
            if (dep > 4 && dep < 24) {
              const diff = Math.abs(dep - 12);
              if (diff < minLagoonDiff) {
                minLagoonDiff = diff;
                shallowDir = d;
              }
            }
          }
        }
      }

      if (shallowDir) {
        addEntity('faceted_ray', this.planet, shallowDir, 6);
        addEntity('plated_crustacean', this.planet, shallowDir, 0);
      }
      if (deepDir) {
        addEntity('leviathan_eel', this.planet, deepDir, Math.min(maxD * 0.65, 60));
      }

      // 2. Global distribution across Aurelia Prime (Land, Shallows, Hadal Abyss, Sky)
      for (let i = 0; i < 54; i++) {
        const theta = (i * 2.39996 + 0.35) % (Math.PI * 2);
        const y = 0.94 - (i / 53) * 1.88;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const dir = new THREE.Vector3(Math.cos(theta) * r, y, Math.sin(theta) * r).normalize();
        const surfR = this.planet.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
        const depth = (this.planet.seaLevelRadius || 718) - surfR;

        if (depth > 22) {
          // Deep Hadal trenches (>22m depth): Leviathan Eel apex predator
          addEntity('leviathan_eel', this.planet, dir, Math.min(depth * 0.65, 75));
        } else if (depth > 3) {
          // Sunlit Lagoons & Coral Reefs (3m - 22m depth): Faceted Rays & Plated Crustaceans
          if (i % 2 === 0) {
            addEntity('faceted_ray', this.planet, dir, Math.min(depth * 0.45, 14));
          } else {
            addEntity('plated_crustacean', this.planet, dir, 0);
          }
        } else {
          // Dry Land
          const landSlot = i % 8;
          if (landSlot === 0) {
            // Colossal Behemoth on highland plateaus
            addEntity('colossal_behemoth', this.planet, dir, 0);
          } else if (landSlot === 1 || landSlot === 2) {
            // Bipedal Tracker pack hunter
            addEntity('bipedal_tracker', this.planet, dir, 0);
          } else if (landSlot === 3) {
            // Armored Burrower
            addEntity('armored_burrower', this.planet, dir, 0);
          } else if (landSlot === 4) {
            // Herding Quadruped
            addEntity('herding_quadruped', this.planet, dir, 0);
          } else if (landSlot === 5) {
            // Scurrying Swarmer pack (cluster of 3)
            for (let p = 0; p < 3; p++) {
              const pDir = dir.clone().add(new THREE.Vector3((p - 1) * 0.01, 0, (p - 1) * 0.01)).normalize();
              addEntity('scurrying_swarmer', this.planet, pDir, 0);
            }
          } else if (landSlot === 6) {
            // Aerial Skimmer high above peaks
            addEntity('aerial_skimmer', this.planet, dir, 52 + (i % 3) * 16);
          } else {
            // Tiny Darting Flier
            addEntity('tiny_darting_flier', this.planet, dir, 6 + (i % 3) * 4);
          }
        }
      }
    }

    // 3. Populate Moons with specialized native lunar fauna
    for (let m = 0; m < this.moons.length; m++) {
      const moon = this.moons[m];
      if (moon.id === 'lumen') {
        // Moon I (Lumen): Prismatic Crystal Moon
        addEntity('colossal_behemoth', moon, new THREE.Vector3(0.12, 0.98, 0.08).normalize(), 0);
        addEntity('herding_quadruped', moon, new THREE.Vector3(-0.15, 0.98, -0.06).normalize(), 0);
        addEntity('herding_quadruped', moon, new THREE.Vector3(0.05, 0.98, -0.16).normalize(), 0);
      } else if (moon.id === 'pyra') {
        // Moon II (Pyra): Volcanic Moon
        addEntity('bipedal_tracker', moon, new THREE.Vector3(0.18, 0.97, 0.09).normalize(), 0);
        addEntity('armored_burrower', moon, new THREE.Vector3(-0.16, 0.98, -0.08).normalize(), 0);
        addEntity('armored_burrower', moon, new THREE.Vector3(0.08, 0.97, -0.18).normalize(), 0);
      } else if (moon.id === 'goliath') {
        // Moon III (Goliath): Titan Violet Fungal Moon
        addEntity('colossal_behemoth', moon, new THREE.Vector3(0.15, 0.98, 0.12).normalize(), 0);
        for (let s = 0; s < 4; s++) {
          addEntity('scurrying_swarmer', moon, new THREE.Vector3(-0.12 + s * 0.01, 0.98, -0.15 + s * 0.01).normalize(), 0);
        }
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
      if (onlyAggressive && (e.temperament !== 'aggressive' && e.temperament !== 'territorial' && e.temperament !== 'defensive')) continue;
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
