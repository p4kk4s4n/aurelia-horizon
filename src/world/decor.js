import * as THREE from 'three';
import { cubeToSphere } from './cubeSphere.js';
import { mulberry32, bezierSpine, tubeAlongSpine, mergeGeometries } from './procGeo.js';

/**
 * Spatial Hash Grid for O(1) solid flora collision resolution on spherical worlds.
 */
export class FloraCollisionGrid {
  constructor(cellSize = 24.0) {
    this.cellSize = cellSize;
    this.cells = new Map();
    this.colliders = [];
  }

  _key(ix, iy, iz) {
    return `${ix},${iy},${iz}`;
  }

  addCollider(position, normal, radius, height, type = 'tree') {
    const col = {
      position: position.clone(),
      normal: normal.clone().normalize(),
      radius,
      height,
      type
    };
    this.colliders.push(col);
    const ix = Math.floor(position.x / this.cellSize);
    const iy = Math.floor(position.y / this.cellSize);
    const iz = Math.floor(position.z / this.cellSize);
    const key = this._key(ix, iy, iz);
    let bucket = this.cells.get(key);
    if (!bucket) {
      bucket = [];
      this.cells.set(key, bucket);
    }
    bucket.push(col);
  }

  resolveCollision(localPos, entityRadius = 0.55) {
    const ix = Math.floor(localPos.x / this.cellSize);
    const iy = Math.floor(localPos.y / this.cellSize);
    const iz = Math.floor(localPos.z / this.cellSize);
    let collided = false;

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = this.cells.get(this._key(ix + dx, iy + dy, iz + dz));
          if (!bucket) continue;

          for (let i = 0; i < bucket.length; i++) {
            const col = bucket[i];
            const diff = localPos.clone().sub(col.position);
            const hAlongAxis = diff.dot(col.normal);
            if (hAlongAxis < -1.2 || hAlongAxis > col.height) continue;

            // Tangent planar offset perpendicular to trunk axis
            const planar = diff.clone().addScaledVector(col.normal, -hAlongAxis);
            const distSq = planar.lengthSq();
            const minSep = col.radius + entityRadius;

            if (distSq < minSep * minSep) {
              const dist = Math.sqrt(distSq);
              const pushDir = dist > 0.0001
                ? planar.divideScalar(dist)
                : new THREE.Vector3(1, 0, 0).cross(col.normal).normalize();
              const pushAmt = minSep - dist;
              localPos.addScaledVector(pushDir, pushAmt);
              collided = true;
            }
          }
        }
      }
    }
    return collided;
  }
}

/**
 * Species 1: Aurelian Lucent-Mycena (Giant Neon Mushrooms)
 * Compound 3-stem cluster (dominant, secondary, tertiary) with bulbous ringed stipes,
 * dark violet pileus dome, and brilliant glowing neon-cyan lamellar gills.
 */
export function createLucentMycenaVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(1101 + v * 73);
    const triadTrunks = [];
    const triadCaps = [];
    const triadGills = [];

    const configs = [
      { h: 7.2 + rng() * 1.8, bend: 0.14, baseR: 0.72, capR: 3.4 + rng() * 0.8, capH: 1.6, offset: new THREE.Vector3(0, 0, 0), rotY: 0, tiltX: 0.05, tiltZ: 0 },
      { h: 4.8 + rng() * 1.2, bend: 0.28, baseR: 0.52, capR: 2.2 + rng() * 0.5, capH: 1.2, offset: new THREE.Vector3(-1.1 - rng() * 0.3, 0, 0.4 + rng() * 0.3), rotY: -0.6, tiltX: 0.15, tiltZ: -0.25 },
      { h: 3.2 + rng() * 0.9, bend: 0.22, baseR: 0.42, capR: 1.6 + rng() * 0.4, capH: 0.9, offset: new THREE.Vector3(0.9 + rng() * 0.3, 0, -0.4 - rng() * 0.2), rotY: 0.8, tiltX: -0.12, tiltZ: 0.2 }
    ];

    for (const cfg of configs) {
      const spine = bezierSpine(rng, cfg.h, cfg.bend, 8);
      // Stalk with swollen base and mid-height collar bulge node
      const trunkGeo = tubeAlongSpine(spine, (t) => {
        const baseBulge = 0.35 * Math.exp(-Math.pow((t - 0.1) / 0.1, 2));
        const midBulge = 0.22 * Math.exp(-Math.pow((t - 0.45) / 0.12, 2));
        return cfg.baseR * (0.85 - t * 0.35 + baseBulge + midBulge);
      }, 7);

      // Umbrella Cap Top (Faceted dark violet pileus dome)
      const capTopGeo = new THREE.ConeGeometry(cfg.capR, cfg.capH, 9);
      capTopGeo.scale(1.0, 0.75, 1.0);
      const capAlign = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), spine.tipTangent);
      capTopGeo.applyQuaternion(capAlign);
      capTopGeo.translate(spine.tip.x, spine.tip.y + cfg.capH * 0.2, spine.tip.z);

      // Glowing Underside Lamellar Gills (Emissive neon-cyan gills)
      const gillGeo = new THREE.ConeGeometry(cfg.capR * 0.92, cfg.capH * 0.35, 9, 1, true);
      gillGeo.rotateX(Math.PI);
      gillGeo.applyQuaternion(capAlign);
      gillGeo.translate(spine.tip.x, spine.tip.y + cfg.capH * 0.05, spine.tip.z);

      const gillFinGeos = [gillGeo];
      const numFins = 12;
      for (let f = 0; f < numFins; f++) {
        const theta = (f / numFins) * Math.PI * 2;
        const finGeo = new THREE.PlaneGeometry(cfg.capR * 0.82, cfg.capH * 0.28);
        finGeo.rotateX(Math.PI / 2);
        finGeo.rotateY(theta);
        finGeo.translate(0, -cfg.capH * 0.08, 0);
        finGeo.applyQuaternion(capAlign);
        finGeo.translate(spine.tip.x, spine.tip.y, spine.tip.z);
        gillFinGeos.push(finGeo);
      }
      const fullGills = mergeGeometries(gillFinGeos);

      const qTilt = new THREE.Quaternion().setFromEuler(new THREE.Euler(cfg.tiltX, cfg.rotY, cfg.tiltZ));
      trunkGeo.applyQuaternion(qTilt); trunkGeo.translate(cfg.offset.x, cfg.offset.y, cfg.offset.z);
      capTopGeo.applyQuaternion(qTilt); capTopGeo.translate(cfg.offset.x, cfg.offset.y, cfg.offset.z);
      fullGills.applyQuaternion(qTilt); fullGills.translate(cfg.offset.x, cfg.offset.y, cfg.offset.z);

      triadTrunks.push(trunkGeo);
      triadCaps.push(capTopGeo);
      triadGills.push(fullGills);
    }

    variants.push({
      trunkGeo: mergeGeometries(triadTrunks),
      capGeo: mergeGeometries(triadCaps),
      gillGeo: mergeGeometries(triadGills)
    });
  }
  return variants;
}

/**
 * Species 2: Prismatic Lithocactus (Spiky Crystal Cacti)
 * Clustered hexagonal columnar crystal prisms with pointed tips and radiating neon pink needle-spines.
 */
export function createPrismaticLithocactusVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(3101 + v * 89);
    const bodyGeos = [];
    const spineGeos = [];

    const numColumns = 6 + Math.floor(rng() * 2);
    for (let c = 0; c < numColumns; c++) {
      const isCenter = c === 0;
      const height = isCenter ? (5.8 + rng() * 1.8) : (2.6 + rng() * 2.8);
      const radius = isCenter ? (0.62 + rng() * 0.15) : (0.35 + rng() * 0.18);
      const apexH = radius * (1.6 + rng() * 0.5);

      const colBody = new THREE.CylinderGeometry(radius, radius * 1.05, height, 6);
      colBody.translate(0, height * 0.5, 0);

      const colApex = new THREE.ConeGeometry(radius, apexH, 6);
      colApex.translate(0, height + apexH * 0.5, 0);

      const colMerged = mergeGeometries([colBody, colApex]);
      const colSpines = [];

      // Needle Spikes along facet ridges
      const needleCount = Math.floor(3 + rng() * 4);
      for (let n = 0; n < needleCount; n++) {
        const needleH = height * (0.22 + (n / needleCount) * 0.68);
        const facetAngle = Math.floor(rng() * 6) * (Math.PI / 3);
        const needleGeo = new THREE.ConeGeometry(0.06, 0.45, 4);
        needleGeo.rotateZ(-Math.PI / 2); // point outward +X
        needleGeo.rotateX(0.35); // tilt upward ~20 deg
        needleGeo.rotateY(facetAngle);
        needleGeo.translate(Math.cos(facetAngle) * radius * 0.95, needleH, Math.sin(facetAngle) * radius * 0.95);
        colSpines.push(needleGeo);
      }

      // Column placement & splay tilt
      if (!isCenter) {
        const angle = (c / (numColumns - 1)) * Math.PI * 2 + (rng() - 0.5) * 0.4;
        const dist = 0.65 + rng() * 0.55;
        const splayAngle = 0.12 + rng() * 0.18;
        const qSplay = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(Math.sin(angle) * splayAngle, rng() * Math.PI, -Math.cos(angle) * splayAngle)
        );
        colMerged.applyQuaternion(qSplay);
        colMerged.translate(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);

        for (const sp of colSpines) {
          sp.applyQuaternion(qSplay);
          sp.translate(Math.cos(angle) * dist, 0, Math.sin(angle) * dist);
        }
      }

      bodyGeos.push(colMerged);
      spineGeos.push(...colSpines);
    }

    variants.push({
      bodyGeo: mergeGeometries(bodyGeos),
      spineGeo: mergeGeometries(spineGeos)
    });
  }
  return variants;
}

/**
 * Species 3: Cyan Serrata-Fern (Bioluminescent Ferns)
 * Concentric tiered rosettes of saw-toothed fronds with dark jade axial ribs and bright cyan luminescent margins.
 */
export function createCyanSerrataFernVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(4101 + v * 61);
    const frondGeos = [];

    const frondConfigs = [];
    const outerCount = 9;
    for (let i = 0; i < outerCount; i++) {
      const angle = (i / outerCount) * Math.PI * 2 + (rng() - 0.5) * 0.25;
      frondConfigs.push({
        len: 4.4 + rng() * 1.6,
        droop: 0.65 + rng() * 0.15,
        angle,
        teeth: 7 + Math.floor(rng() * 3),
        maxW: 0.65 + rng() * 0.2
      });
    }
    const innerCount = 5;
    for (let i = 0; i < innerCount; i++) {
      const angle = (i / innerCount) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      frondConfigs.push({
        len: 2.8 + rng() * 1.0,
        droop: 0.32 + rng() * 0.12,
        angle,
        teeth: 5 + Math.floor(rng() * 2),
        maxW: 0.48 + rng() * 0.15
      });
    }

    for (const fc of frondConfigs) {
      const numSegments = fc.teeth * 2;
      const positions = [];
      const normals = [];
      const indices = [];

      for (let s = 0; s <= numSegments; s++) {
        const t = s / numSegments;
        const y = Math.sin(t * Math.PI * 0.5) * fc.len * Math.cos(fc.droop * t);
        const z = Math.sin(fc.droop * t) * fc.len;
        const isPeak = s % 2 === 1;
        const profile = Math.sin(t * Math.PI) * (1.0 - t * 0.3);
        const w = (isPeak ? fc.maxW : fc.maxW * 0.45) * profile;

        positions.push(0, y, z);
        normals.push(0, Math.cos(fc.droop * t + Math.PI / 2), Math.sin(fc.droop * t + Math.PI / 2));

        positions.push(-w, y, z);
        normals.push(0, Math.cos(fc.droop * t + Math.PI / 2), Math.sin(fc.droop * t + Math.PI / 2));

        positions.push(w, y, z);
        normals.push(0, Math.cos(fc.droop * t + Math.PI / 2), Math.sin(fc.droop * t + Math.PI / 2));
      }

      for (let s = 0; s < numSegments; s++) {
        const row0 = s * 3;
        const row1 = (s + 1) * 3;
        indices.push(row0 + 0, row0 + 1, row1 + 1);
        indices.push(row0 + 0, row1 + 1, row1 + 0);
        indices.push(row0 + 0, row1 + 0, row1 + 2);
        indices.push(row0 + 0, row1 + 2, row0 + 2);
      }

      const frondGeo = new THREE.BufferGeometry();
      frondGeo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      frondGeo.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
      frondGeo.setIndex(indices);

      const qRot = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), fc.angle);
      frondGeo.applyQuaternion(qRot);
      frondGeos.push(frondGeo);
    }

    variants.push(mergeGeometries(frondGeos));
  }
  return variants;
}

/**
 * Species 4: Cobalt Strata-Arbor (Alien Palm Trees)
 * Curved twin-trunk structure with segmented horizontal node rings and a crown of faceted crystalline cobalt fronds.
 */
export function createCobaltStrataArborVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(5101 + v * 97);
    const trunkGeos = [];
    const frondGeos = [];

    const trunkConfigs = [
      { h: 11.2 + rng() * 2.8, bend: 0.18, r: 0.58, leanAngle: 0.05, leanDir: 0, numFronds: 9, frondLen: 4.8 + rng() * 1.2 },
      { h: 6.8 + rng() * 1.6, bend: 0.28, r: 0.42, leanAngle: 0.35 + rng() * 0.1, leanDir: rng() * Math.PI * 2, numFronds: 7, frondLen: 3.6 + rng() * 0.8 }
    ];

    for (const tc of trunkConfigs) {
      const numNodes = 10;
      const trunkParts = [];
      for (let n = 0; n < numNodes; n++) {
        const t0 = n / numNodes;
        const segH = tc.h / numNodes;
        const segR = tc.r * (1.1 - t0 * 0.5);

        const segGeo = new THREE.CylinderGeometry(segR * 0.92, segR, segH, 6);
        segGeo.translate(0, segH * 0.5 + n * segH, 0);

        const ringGeo = new THREE.CylinderGeometry(segR * 1.15, segR * 1.12, segH * 0.18, 6);
        ringGeo.translate(0, n * segH, 0);

        trunkParts.push(segGeo, ringGeo);
      }
      const singleTrunk = mergeGeometries(trunkParts);

      const qLean = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(Math.sin(tc.leanDir) * tc.leanAngle, 0, Math.cos(tc.leanDir) * tc.leanAngle)
      );
      singleTrunk.applyQuaternion(qLean);
      if (tc.leanAngle > 0.1) {
        singleTrunk.translate(Math.sin(tc.leanDir) * 0.85, 0, Math.cos(tc.leanDir) * 0.85);
      }
      trunkGeos.push(singleTrunk);

      const apexPos = new THREE.Vector3(0, tc.h, 0).applyQuaternion(qLean);
      if (tc.leanAngle > 0.1) {
        apexPos.add(new THREE.Vector3(Math.sin(tc.leanDir) * 0.85, 0, Math.cos(tc.leanDir) * 0.85));
      }

      for (let f = 0; f < tc.numFronds; f++) {
        const fAngle = (f / tc.numFronds) * Math.PI * 2 + (rng() - 0.5) * 0.2;
        const fDroop = 0.85 + rng() * 0.35;
        const fLen = tc.frondLen;
        const fWidth = fLen * 0.26;

        const leafGeo = new THREE.BufferGeometry();
        const pts = [
          0, 0, 0,
          -fWidth * 0.5, fLen * 0.45, -0.15,
          0, fLen * 0.5, 0.12,
          fWidth * 0.5, fLen * 0.45, -0.15,
          0, fLen, -0.35
        ];
        const leafIndices = [
          0, 1, 2,
          0, 2, 3,
          2, 1, 4,
          2, 4, 3
        ];
        leafGeo.setAttribute('position', new THREE.Float32BufferAttribute(pts, 3));
        leafGeo.setIndex(leafIndices);
        leafGeo.computeVertexNormals();

        const qFrond = new THREE.Quaternion().setFromEuler(
          new THREE.Euler(fDroop, fAngle, 0, 'YXZ')
        );
        leafGeo.applyQuaternion(qFrond);
        leafGeo.translate(apexPos.x, apexPos.y, apexPos.z);
        frondGeos.push(leafGeo);
      }
    }

    variants.push({
      trunkGeo: mergeGeometries(trunkGeos),
      frondGeo: mergeGeometries(frondGeos)
    });
  }
  return variants;
}

/**
 * Species 5: Abyssal Tendril-Pod (Wavy Alien Bush Plants)
 * Undulating sinusoidal ribbon foliage, upright floral stalks, crowning seed pod capsules, and floating bioluminescent spore motes.
 */
export function createAbyssalTendrilPodVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(6101 + v * 83);
    const foliageGeos = [];
    const podGeos = [];

    const numRibbons = 18 + Math.floor(rng() * 6);
    for (let r = 0; r < numRibbons; r++) {
      const rAngle = (r / numRibbons) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const rRadius = 0.5 + rng() * 0.9;
      const rHeight = 1.8 + rng() * 1.1;

      const points = [];
      const tangents = [];
      const numPts = 8;
      const waveFreq = 2.5 + rng() * 0.8;
      const waveAmp = 0.28 + rng() * 0.15;

      for (let p = 0; p <= numPts; p++) {
        const t = p / numPts;
        const y = t * rHeight;
        const lateral = Math.sin(t * Math.PI * waveFreq) * waveAmp * (1.0 - t * 0.2);
        points.push(new THREE.Vector3(lateral, y, 0));
        tangents.push(new THREE.Vector3(0, 1, 0));
      }

      const spine = { points, tangents, tip: points[numPts], tipTangent: tangents[numPts] };
      const ribbon = tubeAlongSpine(spine, (t) => 0.22 * (1.0 - t * 0.45), 4);
      ribbon.scale(1.8, 1.0, 0.35);

      const qRad = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.25 + rng() * 0.25, rAngle, 0, 'YXZ')
      );
      ribbon.applyQuaternion(qRad);
      ribbon.translate(Math.cos(rAngle) * rRadius, 0, Math.sin(rAngle) * rRadius);
      foliageGeos.push(ribbon);
    }

    const numPods = 4 + Math.floor(rng() * 3);
    for (let p = 0; p < numPods; p++) {
      const pAngle = (p / numPods) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const pDist = 0.45 + rng() * 0.5;
      const stalkH = 3.4 + rng() * 1.4;
      const stalkSpine = bezierSpine(rng, stalkH, 0.2, 7);
      const stalkGeo = tubeAlongSpine(stalkSpine, (t) => 0.12 * (1.0 - t * 0.3), 4);

      const podBody = new THREE.CylinderGeometry(0.32, 0.46, 0.72, 6);
      podBody.translate(0, 0.36, 0);

      const crownGeo = new THREE.ConeGeometry(0.36, 0.28, 6);
      crownGeo.rotateX(Math.PI);
      crownGeo.translate(0, 0.85, 0);

      const podLantern = mergeGeometries([podBody, crownGeo]);
      const podAlign = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), stalkSpine.tipTangent);
      podLantern.applyQuaternion(podAlign);
      podLantern.translate(stalkSpine.tip.x, stalkSpine.tip.y, stalkSpine.tip.z);

      const stalkCombined = mergeGeometries([stalkGeo]);

      const qStalk = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(0.12 + rng() * 0.15, pAngle, 0, 'YXZ')
      );
      stalkCombined.applyQuaternion(qStalk);
      podLantern.applyQuaternion(qStalk);

      stalkCombined.translate(Math.cos(pAngle) * pDist, 0, Math.sin(pAngle) * pDist);
      podLantern.translate(Math.cos(pAngle) * pDist, 0, Math.sin(pAngle) * pDist);

      foliageGeos.push(stalkCombined);
      podGeos.push(podLantern);
    }

    variants.push({
      foliageGeo: mergeGeometries(foliageGeos),
      podGeo: mergeGeometries(podGeos)
    });
  }
  return variants;
}

export function createKelpVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(7001 + v * 41);
    const height = 10.0 + rng() * 8.5;
    const spine = bezierSpine(rng, height, 0.45, 8);
    const kelpGeo = tubeAlongSpine(spine, (t) => 0.42 * (1 - t * 0.5), 4);
    kelpGeo.scale(2.4, 1.0, 0.2);
    variants.push(kelpGeo);
  }
  return variants;
}

// Backwards-compatible aliases for legacy imports
export const createMushroomVariants = createLucentMycenaVariants;
export const createPalmVariants = createCobaltStrataArborVariants;
export const createBranchingCrystalVariants = createPrismaticLithocactusVariants;
export const createSporeFernVariants = createCyanSerrataFernVariants;
export const createTendrilShrubVariants = createAbyssalTendrilPodVariants;

/**
 * Main decor population function with 5 high-fidelity flora species,
 * strict 1-species-per-moon allocation, and planetary biome elevation zoning.
 */
export function populatePlanetDecor(body, noise, qualityOverride = null) {
  const group = new THREE.Group();
  const collisionGrid = new FloraCollisionGrid(24.0);
  const dummy = new THREE.Object3D();
  const upDefault = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  let qualitySetting = qualityOverride || 'high';
  if (!qualityOverride) {
    try {
      qualitySetting = localStorage.getItem('aurelia_graphics_quality') || 'high';
    } catch (e) {}
  }

  let densityMult = 1.0;
  if (qualitySetting === 'low') densityMult = 0.5;
  else if (qualitySetting === 'medium') densityMult = 0.8;
  else if (qualitySetting === 'ultra') densityMult = 1.4;

  // 1. Materials for the 5 High-Fidelity Xenobotanical Species
  // Species 1: Aurelian Lucent-Mycena
  const mycenaTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x242038,
    roughness: 0.82,
    flatShading: false
  });
  const mycenaCapMat = new THREE.MeshStandardMaterial({
    color: 0x311b54,
    roughness: 0.48,
    flatShading: false
  });
  const mycenaGillMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: 0x00f5d4,
    emissiveIntensity: 2.6,
    roughness: 0.25,
    side: THREE.DoubleSide
  });

  // Species 2: Prismatic Lithocactus
  const cactusBodyMat = new THREE.MeshStandardMaterial({
    color: 0xc026d3,
    emissive: 0x701a75,
    emissiveIntensity: 0.45,
    roughness: 0.2,
    metalness: 0.45,
    flatShading: false
  });
  const cactusSpineMat = new THREE.MeshStandardMaterial({
    color: 0xf472b6,
    emissive: 0xf43f5e,
    emissiveIntensity: 2.8,
    roughness: 0.2
  });

  // Species 3: Cyan Serrata-Fern
  const fernMat = new THREE.MeshStandardMaterial({
    color: 0x06b6d4,
    emissive: 0x0891b2,
    emissiveIntensity: 1.4,
    roughness: 0.35,
    side: THREE.DoubleSide
  });

  // Species 4: Cobalt Strata-Arbor
  const arborTrunkMat = new THREE.MeshStandardMaterial({
    color: 0x18181b,
    roughness: 0.88,
    flatShading: false
  });
  const arborFrondMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.55,
    roughness: 0.24,
    metalness: 0.35,
    side: THREE.DoubleSide
  });

  // Species 5: Abyssal Tendril-Pod
  const tendrilFoliageMat = new THREE.MeshStandardMaterial({
    color: 0x3b0764,
    roughness: 0.62,
    flatShading: false
  });
  const tendrilPodMat = new THREE.MeshStandardMaterial({
    color: 0x6b21a8,
    emissive: 0xa855f7,
    emissiveIntensity: 2.2,
    roughness: 0.35
  });

  // Oceanic Kelp & Floating Spore Particles
  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0x058c7e,
    emissive: 0x005f73,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });
  const sporeMat = new THREE.MeshBasicMaterial({
    color: 0xa855f7
  });

  // 2. Moon vs Planet Species Allocation
  const bodyName = (body.name || '').toLowerCase();
  const isLumen = body.isMoon && (bodyName.includes('lumen') || (body.moonTheme && body.moonTheme.crystalColor === 0x78dcca) || body.radius < 50);
  const isPyra = body.isMoon && (bodyName.includes('pyra') || (body.moonTheme && body.moonTheme.crystalColor === 0xf59e0b) || body.radius === 68);
  const isGoliath = body.isMoon && (bodyName.includes('goliath') || (body.moonTheme && body.moonTheme.crystalColor === 0x818cf8) || body.radius > 100);

  // Apply moon palette overrides if present
  if (isLumen && body.moonTheme) {
    cactusBodyMat.color.setHex(body.moonTheme.crystalColor);
    cactusBodyMat.emissive.setHex(body.moonTheme.crystalEmissive);
  } else if (isPyra && body.moonTheme) {
    tendrilPodMat.color.setHex(body.moonTheme.crystalColor);
    tendrilPodMat.emissive.setHex(body.moonTheme.crystalEmissive);
    sporeMat.color.setHex(body.moonTheme.crystalColor);
  } else if (isGoliath && body.moonTheme) {
    mycenaGillMat.color.setHex(body.moonTheme.crystalColor);
    mycenaGillMat.emissive.setHex(body.moonTheme.crystalEmissive);
  }

  // Strict Moon Species Counts: exactly 1 species per moon
  let mycenaCount = 0;
  let arborCount = 0;
  let cactusCount = 0;
  let fernCount = 0;
  let tendrilCount = 0;
  let kelpCount = 0;
  let sporeCount = 0;

  if (body.isMoon) {
    if (isLumen) {
      cactusCount = Math.round(440 * densityMult);
    } else if (isPyra) {
      tendrilCount = Math.round(380 * densityMult);
      sporeCount = Math.round(80 * densityMult);
    } else {
      // Goliath (default largest moon)
      mycenaCount = Math.round(480 * densityMult);
      sporeCount = Math.round(60 * densityMult);
    }
  } else {
    // Aurelia Prime (Planet): All 5 species distributed across elevation biomes
    arborCount = Math.round(520 * densityMult);
    fernCount = Math.round(680 * densityMult);
    mycenaCount = Math.round(580 * densityMult);
    tendrilCount = Math.round(440 * densityMult);
    cactusCount = Math.round(340 * densityMult);
    kelpCount = body.hasOcean ? Math.round(480 * densityMult) : 0;
    sporeCount = Math.round(220 * densityMult);
  }

  // 3. Generate Geometry Variants
  const mycenaVariants = mycenaCount > 0 ? createLucentMycenaVariants(4) : [];
  const arborVariants = arborCount > 0 ? createCobaltStrataArborVariants(4) : [];
  const cactusVariants = cactusCount > 0 ? createPrismaticLithocactusVariants(4) : [];
  const fernVariants = fernCount > 0 ? createCyanSerrataFernVariants(4) : [];
  const tendrilVariants = tendrilCount > 0 ? createAbyssalTendrilPodVariants(4) : [];
  const kelpVariants = kelpCount > 0 ? createKelpVariants(4) : [];
  const sporeGeo = new THREE.IcosahedronGeometry(0.85, 0);

  const mVCount = mycenaVariants.length || 1;
  const aVCount = arborVariants.length || 1;
  const cVCount = cactusVariants.length || 1;
  const fVCount = fernVariants.length || 1;
  const tVCount = tendrilVariants.length || 1;
  const kVCount = kelpVariants.length || 1;

  // 4. Instantiate Meshes for Each Component
  const mycenaTrunkMeshes = mycenaVariants.map(v => new THREE.InstancedMesh(v.trunkGeo, mycenaTrunkMat, Math.ceil(mycenaCount / mVCount)));
  const mycenaCapMeshes = mycenaVariants.map(v => new THREE.InstancedMesh(v.capGeo, mycenaCapMat, Math.ceil(mycenaCount / mVCount)));
  const mycenaGillMeshes = mycenaVariants.map(v => new THREE.InstancedMesh(v.gillGeo, mycenaGillMat, Math.ceil(mycenaCount / mVCount)));

  const arborTrunkMeshes = arborVariants.map(v => new THREE.InstancedMesh(v.trunkGeo, arborTrunkMat, Math.ceil(arborCount / aVCount)));
  const arborFrondMeshes = arborVariants.map(v => new THREE.InstancedMesh(v.frondGeo, arborFrondMat, Math.ceil(arborCount / aVCount)));

  const cactusBodyMeshes = cactusVariants.map(v => new THREE.InstancedMesh(v.bodyGeo, cactusBodyMat, Math.ceil(cactusCount / cVCount)));
  const cactusSpineMeshes = cactusVariants.map(v => new THREE.InstancedMesh(v.spineGeo, cactusSpineMat, Math.ceil(cactusCount / cVCount)));

  const fernMeshes = fernVariants.map(geo => new THREE.InstancedMesh(geo, fernMat, Math.ceil(fernCount / fVCount)));

  const tendrilFoliageMeshes = tendrilVariants.map(v => new THREE.InstancedMesh(v.foliageGeo, tendrilFoliageMat, Math.ceil(tendrilCount / tVCount)));
  const tendrilPodMeshes = tendrilVariants.map(v => new THREE.InstancedMesh(v.podGeo, tendrilPodMat, Math.ceil(tendrilCount / tVCount)));

  const kelpMeshes = kelpVariants.map(geo => new THREE.InstancedMesh(geo, kelpMat, Math.ceil(kelpCount / kVCount)));
  const sporeMesh = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount);

  const mIndices = new Array(mVCount).fill(0);
  const aIndices = new Array(aVCount).fill(0);
  const cIndices = new Array(cVCount).fill(0);
  const fIndices = new Array(fVCount).fill(0);
  const tIndices = new Array(tVCount).fill(0);
  const kIndices = new Array(kVCount).fill(0);
  let sIdx = 0;

  const totalFloraCount = mycenaCount + arborCount + cactusCount + fernCount + tendrilCount + kelpCount + sporeCount;
  const totalSamples = totalFloraCount * 5;

  for (let i = 0; i < totalSamples; i++) {
    const face = i % 6;
    const u = noise.hash(i * 17 + 3) * 2 - 1;
    const v = noise.hash(i * 31 + 11) * 2 - 1;
    let cx = 0, cy = 0, cz = 0;
    if (face === 0) { cx = 1; cy = u; cz = v; }
    else if (face === 1) { cx = -1; cy = u; cz = v; }
    else if (face === 2) { cx = u; cy = 1; cz = v; }
    else if (face === 3) { cx = u; cy = -1; cz = v; }
    else if (face === 4) { cx = u; cy = v; cz = 1; }
    else { cx = u; cy = v; cz = -1; }

    const [nx, ny, nz] = cubeToSphere(cx, cy, cz);
    const surfaceR = body.getSurfaceRadiusAtDir(nx, ny, nz);
    const seaLevel = body.seaLevelRadius || 0;
    const isUndersea = surfaceR < seaLevel;
    const depthBelowSea = seaLevel - surfaceR;
    const elev = surfaceR - seaLevel;

    normal.set(nx, ny, nz);
    quat.setFromUnitVectors(upDefault, normal);
    const spin = new THREE.Quaternion().setFromAxisAngle(normal, noise.hash(i * 43) * Math.PI * 2);
    quat.premultiply(spin);

    const tiltAxis = new THREE.Vector3(noise.hash(i * 101) - 0.5, 0, noise.hash(i * 103) - 0.5).normalize();
    if (tiltAxis.lengthSq() > 0.1) {
      const tiltAngle = noise.hash(i * 107) * 0.12;
      const surfaceTilt = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAngle);
      quat.multiply(surfaceTilt);
    }

    const scale = 0.8 + noise.hash(i * 59) * 0.95;
    dummy.position.set(nx * surfaceR, ny * surfaceR, nz * surfaceR);
    dummy.quaternion.copy(quat);
    dummy.scale.set(
      scale * (0.92 + noise.hash(i * 61) * 0.16),
      scale * (0.90 + noise.hash(i * 67) * 0.20),
      scale * (0.92 + noise.hash(i * 71) * 0.16)
    );
    dummy.updateMatrix();

    if (isUndersea) {
      if (depthBelowSea >= 2.5 && depthBelowSea <= 110 && kelpCount > 0) {
        const kVar = (i + Math.floor(noise.hash(i * 79) * 10)) % kVCount;
        const curIdx = kIndices[kVar];
        if (curIdx < kelpMeshes[kVar].count) {
          kelpMeshes[kVar].setMatrixAt(curIdx, dummy.matrix);
          kIndices[kVar]++;
        }
      }
      continue;
    }

    // 5. Biome Elevation Zoning
    let targetSpecies = null;

    if (body.isMoon) {
      // Moon: strictly 1 species per moon
      if (isLumen) targetSpecies = 'cactus';
      else if (isPyra) targetSpecies = 'tendril';
      else targetSpecies = 'mycena';
    } else {
      // Aurelia Prime Elevation Partitioning with natural biome zoning
      const bioRand = noise.hash(i * 93);
      if (elev < 2.8) {
        // Coastal Beaches & Lowlands: predominantly Cobalt Strata-Arbors (Palms)
        targetSpecies = (bioRand < 0.85) ? 'arbor' : 'fern';
      } else if (elev < 8.0) {
        // Lowland Steppe Plains: Cyan Serrata-Ferns (65%), Palms (20%), Lucent-Mycena (15%)
        if (bioRand < 0.65) targetSpecies = 'fern';
        else if (bioRand < 0.85) targetSpecies = 'arbor';
        else targetSpecies = 'mycena';
      } else if (elev < 16.0) {
        // Conifer Forest & Highland Canopies: Lucent-Mycena (50%), Abyssal Tendril-Pods (35%), Ferns (15%)
        if (bioRand < 0.50) targetSpecies = 'mycena';
        else if (bioRand < 0.85) targetSpecies = 'tendril';
        else targetSpecies = 'fern';
      } else {
        // Granite Highland Shield & Mountain Ridges: Prismatic Lithocactus (70%), Tendril-Pods (30%)
        targetSpecies = (bioRand < 0.70) ? 'cactus' : 'tendril';
      }

      // Guarantee balanced xenobotanical presence across land mass
      const fallbackMod = i % 10;
      if (fallbackMod === 2 && elev > 6.0 && cactusCount > 0) targetSpecies = 'cactus';
      if (fallbackMod === 4 && elev > 4.5 && tendrilCount > 0) targetSpecies = 'tendril';
    }

    if (targetSpecies === 'mycena' && mycenaCount > 0) {
      const mVar = (i + Math.floor(noise.hash(i * 79) * 10)) % mVCount;
      const curIdx = mIndices[mVar];
      if (curIdx < mycenaTrunkMeshes[mVar].count) {
        mycenaTrunkMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mycenaCapMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mycenaGillMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mIndices[mVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.95 * scale, 8.5 * scale, 'mushroom');
      }
    } else if (targetSpecies === 'arbor' && arborCount > 0) {
      const aVar = (i + Math.floor(noise.hash(i * 83) * 10)) % aVCount;
      const curIdx = aIndices[aVar];
      if (curIdx < arborTrunkMeshes[aVar].count) {
        arborTrunkMeshes[aVar].setMatrixAt(curIdx, dummy.matrix);
        arborFrondMeshes[aVar].setMatrixAt(curIdx, dummy.matrix);
        aIndices[aVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.85 * scale, 11.0 * scale, 'palm');
      }
    } else if (targetSpecies === 'cactus' && cactusCount > 0) {
      const cVar = (i + Math.floor(noise.hash(i * 89) * 10)) % cVCount;
      const curIdx = cIndices[cVar];
      if (curIdx < cactusBodyMeshes[cVar].count) {
        cactusBodyMeshes[cVar].setMatrixAt(curIdx, dummy.matrix);
        cactusSpineMeshes[cVar].setMatrixAt(curIdx, dummy.matrix);
        cIndices[cVar]++;
        collisionGrid.addCollider(dummy.position, normal, 1.25 * scale, 6.5 * scale, 'crystal');
      }
    } else if (targetSpecies === 'fern' && fernCount > 0) {
      const fVar = (i + Math.floor(noise.hash(i * 97) * 10)) % fVCount;
      const curIdx = fIndices[fVar];
      if (curIdx < fernMeshes[fVar].count) {
        fernMeshes[fVar].setMatrixAt(curIdx, dummy.matrix);
        fIndices[fVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.65 * scale, 4.0 * scale, 'fern');
      }
    } else if (targetSpecies === 'tendril' && tendrilCount > 0) {
      const tVar = (i + Math.floor(noise.hash(i * 101) * 10)) % tVCount;
      const curIdx = tIndices[tVar];
      if (curIdx < tendrilFoliageMeshes[tVar].count) {
        tendrilFoliageMeshes[tVar].setMatrixAt(curIdx, dummy.matrix);
        tendrilPodMeshes[tVar].setMatrixAt(curIdx, dummy.matrix);
        tIndices[tVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.80 * scale, 4.2 * scale, 'tendril');
      }
    }

    // Ambient floating spores above bioluminescent flora
    if (sporeCount > 0 && sIdx < sporeCount && (targetSpecies === 'mycena' || targetSpecies === 'tendril')) {
      const floatH = surfaceR + 3.5 + noise.hash(i * 71) * 10.0;
      dummy.position.set(nx * floatH, ny * floatH, nz * floatH);
      dummy.scale.setScalar(0.5 + noise.hash(i * 83) * 0.8);
      dummy.updateMatrix();
      sporeMesh.setMatrixAt(sIdx, dummy.matrix);
      sIdx++;
    }
  }

  // 6. Set Final Counts & Add to Group
  for (let v = 0; v < mVCount; v++) {
    if (mycenaTrunkMeshes[v] && mIndices[v] > 0) {
      mycenaTrunkMeshes[v].count = mIndices[v];
      mycenaCapMeshes[v].count = mIndices[v];
      mycenaGillMeshes[v].count = mIndices[v];
      mycenaTrunkMeshes[v].instanceMatrix.needsUpdate = true;
      mycenaCapMeshes[v].instanceMatrix.needsUpdate = true;
      mycenaGillMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(mycenaTrunkMeshes[v], mycenaCapMeshes[v], mycenaGillMeshes[v]);
    }
  }

  for (let v = 0; v < aVCount; v++) {
    if (arborTrunkMeshes[v] && aIndices[v] > 0) {
      arborTrunkMeshes[v].count = aIndices[v];
      arborFrondMeshes[v].count = aIndices[v];
      arborTrunkMeshes[v].instanceMatrix.needsUpdate = true;
      arborFrondMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(arborTrunkMeshes[v], arborFrondMeshes[v]);
    }
  }

  for (let v = 0; v < cVCount; v++) {
    if (cactusBodyMeshes[v] && cIndices[v] > 0) {
      cactusBodyMeshes[v].count = cIndices[v];
      cactusSpineMeshes[v].count = cIndices[v];
      cactusBodyMeshes[v].instanceMatrix.needsUpdate = true;
      cactusSpineMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(cactusBodyMeshes[v], cactusSpineMeshes[v]);
    }
  }

  for (let v = 0; v < fVCount; v++) {
    if (fernMeshes[v] && fIndices[v] > 0) {
      fernMeshes[v].count = fIndices[v];
      fernMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(fernMeshes[v]);
    }
  }

  for (let v = 0; v < tVCount; v++) {
    if (tendrilFoliageMeshes[v] && tIndices[v] > 0) {
      tendrilFoliageMeshes[v].count = tIndices[v];
      tendrilPodMeshes[v].count = tIndices[v];
      tendrilFoliageMeshes[v].instanceMatrix.needsUpdate = true;
      tendrilPodMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(tendrilFoliageMeshes[v], tendrilPodMeshes[v]);
    }
  }

  for (let v = 0; v < kVCount; v++) {
    if (kelpMeshes[v] && kIndices[v] > 0) {
      kelpMeshes[v].count = kIndices[v];
      kelpMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(kelpMeshes[v]);
    }
  }

  if (sporeCount > 0 && sIdx > 0) {
    sporeMesh.count = sIdx;
    sporeMesh.instanceMatrix.needsUpdate = true;
    group.add(sporeMesh);
  }

  return {
    group,
    collisionGrid,
    mycenaMat: { trunk: mycenaTrunkMat, cap: mycenaCapMat, gills: mycenaGillMat },
    cactusMat: { body: cactusBodyMat, spines: cactusSpineMat },
    fernMat,
    arborMat: { trunk: arborTrunkMat, fronds: arborFrondMat },
    tendrilMat: { foliage: tendrilFoliageMat, pods: tendrilPodMat },
    // Backwards-compatible references for existing tests
    crystalMat: cactusBodyMat,
    capMat: mycenaCapMat
  };
}
