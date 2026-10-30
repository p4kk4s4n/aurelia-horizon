import * as THREE from 'three';
import { SeededNoise } from './noise.js';
import { createCubeSphereMesh } from './cubeSphere.js';
import { populatePlanetDecor } from './decor.js';
import { createDeepOceanMesh } from './ocean.js';

export class CelestialBody {
  constructor(config) {
    this.id = config.id;
    this.name = config.name;
    this.radius = config.radius;
    this.surfaceGravity = config.surfaceGravity;
    this.soiRadius = config.soiRadius;
    this.atmosphereHeight = config.atmosphereHeight || 0;
    this.isMoon = Boolean(config.isMoon);
    this.seed = config.seed || 42;
    this.segments = config.segments || 52;
    this.heightAmplitude = config.heightAmplitude || 18;
    this.noiseFrequency = config.noiseFrequency || 2.2;
    this.hasOcean = Boolean(config.hasOcean);
    this.seaLevelRadius = this.hasOcean ? this.radius - 2.0 : 0;
    this.orbitRadius = config.orbitRadius || 0;
    this.orbitSpeed = config.orbitSpeed || 0;
    this.orbitAngle = config.orbitAngle || 0;
    this.orbitInclination = config.orbitInclination || 0;
    this.moonTheme = config.moonTheme || null;
    this.description = config.description || '';

    this.noise = new SeededNoise(this.seed);
    this.group = new THREE.Group();
    this.group.name = this.name;
    this.oceanController = null;

    this._buildMesh();
    this.updateOrbit(0);
  }

  // Deterministic terrain height at unit normal (nx, ny, nz)
  getSurfaceRadiusAtDir(nx, ny, nz) {
    const f = this.noiseFrequency;
    if (!this.isMoon) {
      // Tropical planet: continents, deep ocean trenches, lagoons, noisy hills, dramatic ridges
      const continent = this.noise.fbm(nx * f * 0.75, ny * f * 0.75, nz * f * 0.75, 4);
      const hills = this.noise.fbm(nx * f * 2.1, ny * f * 2.1, nz * f * 2.1, 4);
      const ridges = this.noise.ridged(nx * f * 1.4, ny * f * 1.4, nz * f * 1.4, 3);

      // Keep spawn zone near (0, 1, 0) guaranteed dry tropical island plateau
      const spawnDot = Math.max(0, ny);
      const spawnBias = spawnDot > 0.90 ? (spawnDot - 0.90) * 110 : 0;

      let rawElev = continent * 0.65 + hills * 0.35 + Math.max(0, ridges) * 0.25;
      if (rawElev < -0.04) {
        // Drop deep ocean basins down to 50-65m below sea level
        rawElev = -0.04 + (rawElev + 0.04) * 2.75;
      }

      const elevation = rawElev * this.heightAmplitude + spawnBias;
      return this.radius + elevation;
    } else {
      // Moon: craters + ridged highlands
      const base = this.noise.fbm(nx * f, ny * f, nz * f, 4);
      const ridge = this.noise.ridged(nx * f * 1.6, ny * f * 1.6, nz * f * 1.6, 3);
      return this.radius + (base * 0.6 + ridge * 0.4) * this.heightAmplitude;
    }
  }

  sampleBiomeColor(nx, ny, nz, r) {
    if (!this.isMoon) {
      const h = r - this.seaLevelRadius;
      if (h < -35.0) return [0.01, 0.06, 0.18]; // Deep ocean abyss
      if (h < -14.0) return [0.03, 0.16, 0.32]; // Mid ocean seabed
      if (h < -3.0)  return [0.06, 0.34, 0.44]; // Turquoise shelf lagoon
      if (h < 2.5)   return [0.95, 0.84, 0.56]; // Tropical golden coral sand
      if (h < 14.0)  return [0.11, 0.72, 0.48]; // Lush alien teal-emerald jungle
      if (h < 26.0)  return [0.06, 0.52, 0.44]; // Deep canopy
      if (h < 38.0)  return [0.36, 0.32, 0.46]; // Purple highland rock
      return [0.78, 0.92, 0.96];                // Mineral-capped peak
    }

    const theme = this.moonTheme;
    const t = (r - this.radius) / (this.heightAmplitude || 1);
    if (t < -0.15) return theme.low;
    if (t < 0.25) return theme.mid;
    return theme.high;
  }

  _buildMesh() {
    this.terrainMesh = createCubeSphereMesh({
      segments: this.segments,
      heightSampler: (nx, ny, nz) => this.getSurfaceRadiusAtDir(nx, ny, nz),
      colorSampler: (nx, ny, nz, r) => this.sampleBiomeColor(nx, ny, nz, r)
    });
    this.group.add(this.terrainMesh);

    // Procedural deep ocean sphere with depth shading and animated waves
    if (this.hasOcean) {
      this.oceanController = createDeepOceanMesh(this, 72);
      if (this.oceanController) {
        this.oceanMesh = this.oceanController.mesh;
        this.group.add(this.oceanMesh);
      }
    }

    // Atmosphere halo shell
    if (this.atmosphereHeight > 0) {
      const atmoGeo = new THREE.SphereGeometry(this.radius + this.atmosphereHeight, 44, 32);
      const atmoMat = new THREE.MeshBasicMaterial({
        color: this.isMoon ? 0x90e0ef : 0x48bfe3,
        transparent: true,
        opacity: 0.12,
        side: THREE.BackSide,
        depthWrite: false
      });
      this.atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
      this.group.add(this.atmoMesh);
    }

    // Optional ring for largest moon
    if (this.moonTheme && this.moonTheme.hasRing) {
      const ringGeo = new THREE.RingGeometry(this.radius * 1.45, this.radius * 2.15, 64);
      ringGeo.rotateX(Math.PI * 0.42);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0xc77dff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.38
      });
      this.ringMesh = new THREE.Mesh(ringGeo, ringMat);
      this.group.add(this.ringMesh);
    }

    // Sci-fi flora & minerals
    this.decor = populatePlanetDecor(this, this.noise);
    this.group.add(this.decor.group);
  }

  updateOcean(time) {
    if (this.oceanController) {
      this.oceanController.update(time);
    }
  }

  updateOrbit(dt) {
    this.prevPosition = this.group.position.clone();
    if (this.orbitRadius > 0) {
      this.orbitAngle += this.orbitSpeed * dt;
      const x = Math.cos(this.orbitAngle) * this.orbitRadius;
      const z = Math.sin(this.orbitAngle) * this.orbitRadius;
      const y = Math.sin(this.orbitAngle) * Math.sin(this.orbitInclination) * this.orbitRadius * 0.25;
      this.group.position.set(x, y, z);
    }
    this.deltaPosition = this.group.position.clone().sub(this.prevPosition || this.group.position);
  }

  getWorldPosition() {
    return this.group.position;
  }
}

export function createSolarSystem(scene) {
  // 1. Aurelia Prime (2x scale: radius 720, atmosphere 220, SOI 2300)
  const planet = new CelestialBody({
    id: 'aurelia',
    name: 'Aurelia Prime (Tropical Planet)',
    description: 'Lush bioluminescent archipelago world with deep ocean trenches',
    radius: 720,
    surfaceGravity: 26,
    soiRadius: 2300,
    atmosphereHeight: 220,
    isMoon: false,
    seed: 1042,
    segments: 88,
    heightAmplitude: 38,
    noiseFrequency: 2.3,
    hasOcean: true
  });
  scene.add(planet.group);

  // 2. Three Moons (2x radius and proportional orbits)
  const moons = [
    new CelestialBody({
      id: 'lumen',
      name: 'Moon I: Lumen (Small Crystal Moon)',
      description: 'Compact low-gravity ice & cyan-quartz satellite',
      radius: 130,
      surfaceGravity: 9.5,
      soiRadius: 460,
      atmosphereHeight: 0,
      isMoon: true,
      seed: 2088,
      segments: 40,
      heightAmplitude: 11.0,
      noiseFrequency: 2.6,
      orbitRadius: 1960,
      orbitSpeed: 0.009,
      orbitAngle: 0.4,
      orbitInclination: 0.15,
      moonTheme: {
        low: [0.14, 0.28, 0.42],
        mid: [0.35, 0.68, 0.84],
        high: [0.78, 0.96, 1.0],
        crystalColor: 0x00f5d4,
        crystalEmissive: 0x00bbf9
      }
    }),
    new CelestialBody({
      id: 'pyra',
      name: 'Moon II: Pyra (Medium Amber-Basalt Moon)',
      description: 'Medium volcanic sulfur ridges and obsidian craters',
      radius: 210,
      surfaceGravity: 14.5,
      soiRadius: 680,
      atmosphereHeight: 44,
      isMoon: true,
      seed: 3099,
      segments: 44,
      heightAmplitude: 17.0,
      noiseFrequency: 2.3,
      orbitRadius: 3120,
      orbitSpeed: 0.0055,
      orbitAngle: 2.35,
      orbitInclination: -0.2,
      moonTheme: {
        low: [0.22, 0.11, 0.14],
        mid: [0.58, 0.27, 0.14],
        high: [0.96, 0.64, 0.22],
        crystalColor: 0xff9f1c,
        crystalEmissive: 0xf72585
      }
    }),
    new CelestialBody({
      id: 'goliath',
      name: 'Moon III: Goliath (Large Ringed Titan)',
      description: 'Massive violet-ringed outer moon with deep basins',
      radius: 310,
      surfaceGravity: 19.5,
      soiRadius: 960,
      atmosphereHeight: 76,
      isMoon: true,
      seed: 4177,
      segments: 48,
      heightAmplitude: 23.0,
      noiseFrequency: 2.1,
      orbitRadius: 4560,
      orbitSpeed: 0.0035,
      orbitAngle: 4.4,
      orbitInclination: 0.28,
      moonTheme: {
        low: [0.18, 0.14, 0.32],
        mid: [0.38, 0.28, 0.58],
        high: [0.76, 0.62, 0.94],
        crystalColor: 0x9b5de5,
        crystalEmissive: 0x7209b7,
        hasRing: true
      }
    })
  ];

  for (const moon of moons) {
    scene.add(moon.group);
    // Visible orbital path line around planet
    const pts = [];
    const steps = 140;
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * Math.PI * 2;
      const x = Math.cos(a) * moon.orbitRadius;
      const z = Math.sin(a) * moon.orbitRadius;
      const y = Math.sin(a) * Math.sin(moon.orbitInclination) * moon.orbitRadius * 0.25;
      pts.push(new THREE.Vector3(x, y, z));
    }
    const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x3a86ff,
      transparent: true,
      opacity: 0.25
    });
    scene.add(new THREE.Line(lineGeo, lineMat));
  }

  return { planet, moons, allBodies: [planet, ...moons] };
}
