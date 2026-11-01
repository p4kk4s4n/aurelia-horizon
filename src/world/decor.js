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

  addCollider(positionOrConfig, normal, radius, height, type = 'tree') {
    let position, n, r, h, t;
    if (positionOrConfig && positionOrConfig.position && positionOrConfig.position.clone) {
      position = positionOrConfig.position;
      n = positionOrConfig.normal || new THREE.Vector3(0, 1, 0);
      r = positionOrConfig.radius !== undefined ? positionOrConfig.radius : 1.0;
      h = positionOrConfig.height !== undefined ? positionOrConfig.height : 5.0;
      t = positionOrConfig.type || 'tree';
    } else {
      position = positionOrConfig;
      n = normal;
      r = radius;
      h = height;
      t = type;
    }
    const col = {
      position: position.clone(),
      normal: n.clone().normalize(),
      radius: r,
      height: h,
      type: t
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
              let pushDir;
              if (dist > 0.0001) {
                pushDir = planar.divideScalar(dist);
              } else {
                const tangentRef = Math.abs(col.normal.x) > 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0);
                pushDir = tangentRef.cross(col.normal).normalize();
              }
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

/**
 * Species 6 (Aquatic 1): Aurelian Prismatic Ribbon-Kelp (Alien Ribbon Seaweed)
 * Cluster of 4-6 undulating, twisting faceted ribbon blades rising 14m-22m
 * with floating faceted icosahedral bioluminescent spore lanterns.
 */
export function createRibbonKelpVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(7001 + v * 53);
    const bladeGeos = [];
    const sporeGeos = [];
    const numBlades = 4 + Math.floor(rng() * 3); // 4 to 6 blades per cluster

    for (let b = 0; b < numBlades; b++) {
      const bAngle = (b / numBlades) * Math.PI * 2 + (rng() - 0.5) * 0.4;
      const bRad = 0.5 + rng() * 0.8;
      const baseOffsetX = Math.cos(bAngle) * bRad;
      const baseOffsetZ = Math.sin(bAngle) * bRad;
      const height = 14.0 + rng() * 8.0;
      const twistTotal = (rng() - 0.5) * Math.PI * 3.0;
      const waveFreqX = 1.8 + rng() * 0.8;
      const waveFreqZ = 1.6 + rng() * 0.8;
      const waveAmpX = 1.2 + rng() * 1.0;
      const waveAmpZ = 1.0 + rng() * 0.8;
      const steps = 14;

      const verts = [];
      const indices = [];

      for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const y = t * height;
        const waveX = Math.sin(t * Math.PI * waveFreqX) * waveAmpX * Math.sqrt(t);
        const waveZ = Math.cos(t * Math.PI * waveFreqZ) * waveAmpZ * Math.sqrt(t);
        const cx = baseOffsetX + waveX;
        const cz = baseOffsetZ + waveZ;

        // Blade width profile: narrow base, wide undulating middle, tapered tip
        const width = (0.75 + Math.sin(t * Math.PI * 0.85) * 0.85) * (1 - t * 0.45);
        const thick = 0.16 * width;
        const twist = t * twistTotal;
        const cosT = Math.cos(twist);
        const sinT = Math.sin(twist);

        // 4 diamond cross-section vertices: Left, Front, Right, Back
        const lx = cx - width * cosT;
        const lz = cz - width * sinT;
        const rx = cx + width * cosT;
        const rz = cz + width * sinT;
        const fx = cx - thick * sinT;
        const fz = cz + thick * cosT;
        const kx = cx + thick * sinT;
        const kz = cz - thick * cosT;

        verts.push(lx, y, lz); // 4*i + 0
        verts.push(fx, y, fz); // 4*i + 1
        verts.push(rx, y, rz); // 4*i + 2
        verts.push(kx, y, kz); // 4*i + 3

        if (i > 0) {
          const p = 4 * (i - 1);
          const c = 4 * i;
          // 4 facet quads
          indices.push(p + 0, c + 0, c + 1);
          indices.push(p + 0, c + 1, p + 1);
          indices.push(p + 1, c + 1, c + 2);
          indices.push(p + 1, c + 2, p + 2);
          indices.push(p + 2, c + 2, c + 3);
          indices.push(p + 2, c + 3, p + 3);
          indices.push(p + 3, c + 3, c + 0);
          indices.push(p + 3, c + 0, p + 0);
        }
      }

      // Tip cap pyramid
      const tipIdx = verts.length / 3;
      const lastT = 1.0;
      const tipX = baseOffsetX + Math.sin(lastT * Math.PI * waveFreqX) * waveAmpX;
      const tipZ = baseOffsetZ + Math.cos(lastT * Math.PI * waveFreqZ) * waveAmpZ;
      verts.push(tipX, height + 0.8, tipZ);
      const topBase = 4 * steps;
      indices.push(topBase + 0, tipIdx, topBase + 1);
      indices.push(topBase + 1, tipIdx, topBase + 2);
      indices.push(topBase + 2, tipIdx, topBase + 3);
      indices.push(topBase + 3, tipIdx, topBase + 0);

      const bGeo = new THREE.BufferGeometry();
      bGeo.setAttribute('position', new THREE.Float32BufferAttribute(verts, 3));
      bGeo.setIndex(indices);
      bGeo.computeVertexNormals();
      bladeGeos.push(bGeo);

      // Spores floating along this blade
      const numSpores = 1 + Math.floor(rng() * 2);
      for (let s = 0; s < numSpores; s++) {
        const sT = 0.25 + rng() * 0.65;
        const sY = sT * height;
        const sX = baseOffsetX + Math.sin(sT * Math.PI * waveFreqX) * waveAmpX + (rng() - 0.5) * 1.2;
        const sZ = baseOffsetZ + Math.cos(sT * Math.PI * waveFreqZ) * waveAmpZ + (rng() - 0.5) * 1.2;
        const sporeRadius = 0.45 + rng() * 0.35;
        const sGeo = new THREE.IcosahedronGeometry(sporeRadius, 0);
        sGeo.translate(sX, sY, sZ);
        sporeGeos.push(sGeo);
      }
    }

    variants.push({
      bladeGeo: mergeGeometries(bladeGeos),
      sporeGeo: mergeGeometries(sporeGeos)
    });
  }
  return variants;
}

/**
 * Species 7 (Aquatic 2): Crystalline Staghorn Branch-Coral
 * Arborescent multi-branching antler/staghorn coral cluster with vibrant violet-purple
 * limbs and glowing neon-pink faceted termination crystal pyramid caps.
 */
export function createStaghornCoralVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(8101 + v * 37);
    const branchGeos = [];
    const tipGeos = [];

    // Base trunk
    const baseRadius = 0.65 + rng() * 0.2;
    const baseHeight = 1.4 + rng() * 0.5;
    const trunkGeo = new THREE.CylinderGeometry(baseRadius * 0.85, baseRadius, baseHeight, 6);
    trunkGeo.translate(0, baseHeight * 0.5, 0);
    branchGeos.push(trunkGeo);

    // Primary antler limbs branching out
    const numPrimary = 5 + Math.floor(rng() * 3); // 5 to 7 primary limbs
    for (let p = 0; p < numPrimary; p++) {
      const pAngle = (p / numPrimary) * Math.PI * 2 + (rng() - 0.5) * 0.35;
      const flareAngle = 0.55 + rng() * 0.35; // ~32 to 52 degrees upward flare
      const pLen = 2.4 + rng() * 1.6;
      const pRadius = 0.36 + rng() * 0.12;

      const pGeo = new THREE.CylinderGeometry(pRadius * 0.75, pRadius, pLen, 6);
      pGeo.translate(0, pLen * 0.5, 0);

      const dirP = new THREE.Vector3(
        Math.cos(pAngle) * Math.sin(flareAngle),
        Math.cos(flareAngle),
        Math.sin(pAngle) * Math.sin(flareAngle)
      ).normalize();

      const qP = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirP);
      pGeo.applyQuaternion(qP);
      pGeo.translate(0, baseHeight, 0);
      branchGeos.push(pGeo);

      const pTipPos = new THREE.Vector3(0, baseHeight, 0).addScaledVector(dirP, pLen);

      // Sub-branches from primary tip
      const numSub = 2 + Math.floor(rng() * 2); // 2 or 3 sub-branches
      for (let s = 0; s < numSub; s++) {
        const sSubAngle = pAngle + (s - (numSub - 1) * 0.5) * 0.8 + (rng() - 0.5) * 0.25;
        const sFlare = flareAngle * 0.75 + (rng() - 0.5) * 0.25;
        const sLen = 1.8 + rng() * 1.4;
        const sRadius = pRadius * 0.65;

        const dirS = new THREE.Vector3(
          Math.cos(sSubAngle) * Math.sin(sFlare),
          Math.cos(sFlare) + 0.35,
          Math.sin(sSubAngle) * Math.sin(sFlare)
        ).normalize();

        const sGeo = new THREE.CylinderGeometry(sRadius * 0.6, sRadius, sLen, 5);
        sGeo.translate(0, sLen * 0.5, 0);
        const qS = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dirS);
        sGeo.applyQuaternion(qS);
        sGeo.translate(pTipPos.x, pTipPos.y, pTipPos.z);
        branchGeos.push(sGeo);

        // Terminal Crystal Pyramid Cap
        const tipPos = pTipPos.clone().addScaledVector(dirS, sLen);
        const tipRadius = sRadius * 0.85;
        const tipLen = 0.95 + rng() * 0.55;
        const tipGeo = new THREE.CylinderGeometry(0, tipRadius, tipLen, 6);
        tipGeo.translate(0, tipLen * 0.5, 0);
        tipGeo.applyQuaternion(qS);
        tipGeo.translate(tipPos.x, tipPos.y, tipPos.z);
        tipGeos.push(tipGeo);
      }
    }

    variants.push({
      branchGeo: mergeGeometries(branchGeos),
      tipGeo: mergeGeometries(tipGeos)
    });
  }
  return variants;
}

/**
 * Species 8 (Aquatic 3): Bioluminescent Strata-Plate Coral
 * Horizontally stepped tiered shelf plates with dark obsidian/indigo slate bodies
 * and glowing electric-cyan perimeter border rings.
 */
export function createStrataPlateCoralVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(9201 + v * 47);
    const plateGeos = [];
    const edgeGeos = [];

    const numTiers = 4 + Math.floor(rng() * 3); // 4 to 6 tiers
    let currentY = 0.35;
    const baseRadius = 2.8 + rng() * 1.2;

    for (let k = 0; k < numTiers; k++) {
      const tierT = k / (numTiers - 1);
      const tierRadius = baseRadius * (1.0 - tierT * 0.45) * (0.85 + rng() * 0.3);
      const tierThick = 0.32 + rng() * 0.18;
      const segs = 12;

      const pVerts = [];
      const pIndices = [];
      const eVerts = [];
      const eIndices = [];

      const phase = rng() * Math.PI * 2;
      const waveFreq = 2.0 + Math.floor(rng() * 2);

      pVerts.push(0, currentY + tierThick * 0.5, 0); // 0: center top
      pVerts.push(0, currentY - tierThick * 0.5, 0); // 1: center bottom

      for (let j = 0; j < segs; j++) {
        const a = (j / segs) * Math.PI * 2;
        const r = tierRadius * (1.0 + 0.18 * Math.sin(a * waveFreq + phase));
        const px = Math.cos(a) * r;
        const pz = Math.sin(a) * r;

        pVerts.push(px, currentY + tierThick * 0.5, pz);
        pVerts.push(px, currentY - tierThick * 0.5, pz);

        const er = r * 1.04;
        eVerts.push(Math.cos(a) * er, currentY + tierThick * 0.45, Math.sin(a) * er);
        eVerts.push(Math.cos(a) * er, currentY - tierThick * 0.45, Math.sin(a) * er);

        const curT = 2 + 2 * j;
        const curB = 2 + 2 * j + 1;
        const nxtT = 2 + 2 * ((j + 1) % segs);
        const nxtB = 2 + 2 * ((j + 1) % segs) + 1;

        pIndices.push(0, curT, nxtT);
        pIndices.push(1, nxtB, curB);
        pIndices.push(curT, curB, nxtB);
        pIndices.push(curT, nxtB, nxtT);

        const eCurT = 2 * j;
        const eCurB = 2 * j + 1;
        const eNxtT = 2 * ((j + 1) % segs);
        const eNxtB = 2 * ((j + 1) % segs) + 1;
        eIndices.push(eCurT, eCurB, eNxtB);
        eIndices.push(eCurT, eNxtB, eNxtT);
      }

      const pGeo = new THREE.BufferGeometry();
      pGeo.setAttribute('position', new THREE.Float32BufferAttribute(pVerts, 3));
      pGeo.setIndex(pIndices);
      pGeo.computeVertexNormals();
      plateGeos.push(pGeo);

      const eGeo = new THREE.BufferGeometry();
      eGeo.setAttribute('position', new THREE.Float32BufferAttribute(eVerts, 3));
      eGeo.setIndex(eIndices);
      eGeo.computeVertexNormals();
      edgeGeos.push(eGeo);

      currentY += tierThick + 0.35 + rng() * 0.3;
    }

    const stemGeo = new THREE.CylinderGeometry(baseRadius * 0.4, baseRadius * 0.6, currentY, 6);
    stemGeo.translate(0, currentY * 0.5, 0);
    plateGeos.push(stemGeo);

    variants.push({
      plateGeo: mergeGeometries(plateGeos),
      edgeGeo: mergeGeometries(edgeGeos)
    });
  }
  return variants;
}

/**
 * Species 9 (Aquatic 4): Volcanic Hadal Vent-Spire
 * Clustered vertical hollow hexagonal chimney columns with open top bores,
 * dark volcanic basalt exterior, and glowing hydrothermal lip rims.
 */
export function createVentSpireVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(10301 + v * 61);
    const chimneyGeos = [];
    const rimGeos = [];

    const numPipes = 6 + Math.floor(rng() * 4); // 6 to 9 chimneys per cluster
    for (let p = 0; p < numPipes; p++) {
      const pAngle = (p / numPipes) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const pDist = 0.6 + (p > 0 ? (0.6 + rng() * 1.5) : 0);
      const px = Math.cos(pAngle) * pDist;
      const pz = Math.sin(pAngle) * pDist;

      const pHeight = 4.0 + (p === 0 ? 6.0 : (rng() * 7.5));
      const rOuter = 0.55 + rng() * 0.45;
      const rInner = rOuter * 0.65;
      const segs = 6;

      const cVerts = [];
      const cIndices = [];
      const rVerts = [];
      const rIndices = [];

      for (let s = 0; s < segs; s++) {
        const a = (s / segs) * Math.PI * 2;
        const ox = px + Math.cos(a) * rOuter;
        const oz = pz + Math.sin(a) * rOuter;
        const ix = px + Math.cos(a) * rInner;
        const iz = pz + Math.sin(a) * rInner;

        cVerts.push(ox, 0, oz);
        cVerts.push(ox, pHeight, oz);
        cVerts.push(ix, pHeight, iz);
        cVerts.push(ix, Math.max(0.5, pHeight - 2.5), iz);

        const curOB = 4 * s + 0;
        const curOT = 4 * s + 1;
        const curIT = 4 * s + 2;
        const curIB = 4 * s + 3;

        const nxt = (s + 1) % segs;
        const nxtOB = 4 * nxt + 0;
        const nxtOT = 4 * nxt + 1;
        const nxtIT = 4 * nxt + 2;
        const nxtIB = 4 * nxt + 3;

        cIndices.push(curOB, curOT, nxtOT);
        cIndices.push(curOB, nxtOT, nxtOB);

        cIndices.push(curOT, curIT, nxtIT);
        cIndices.push(curOT, nxtIT, nxtOT);

        cIndices.push(curIT, curIB, nxtIB);
        cIndices.push(curIT, nxtIB, nxtIT);

        rVerts.push(ox, pHeight + 0.05, oz);
        rVerts.push(ix, pHeight + 0.05, iz);
        const rCurO = 2 * s + 0;
        const rCurI = 2 * s + 1;
        const rNxtO = 2 * nxt + 0;
        const rNxtI = 2 * nxt + 1;
        rIndices.push(rCurO, rCurI, rNxtI);
        rIndices.push(rCurO, rNxtI, rNxtO);
      }

      const plugIdx = cVerts.length / 3;
      cVerts.push(px, Math.max(0.5, pHeight - 2.5), pz);
      for (let s = 0; s < segs; s++) {
        const curIB = 4 * s + 3;
        const nxtIB = 4 * ((s + 1) % segs) + 3;
        cIndices.push(curIB, plugIdx, nxtIB);
      }

      const cGeo = new THREE.BufferGeometry();
      cGeo.setAttribute('position', new THREE.Float32BufferAttribute(cVerts, 3));
      cGeo.setIndex(cIndices);
      cGeo.computeVertexNormals();
      chimneyGeos.push(cGeo);

      const rGeo = new THREE.BufferGeometry();
      rGeo.setAttribute('position', new THREE.Float32BufferAttribute(rVerts, 3));
      rGeo.setIndex(rIndices);
      rGeo.computeVertexNormals();
      rimGeos.push(rGeo);
    }

    variants.push({
      chimneyGeo: mergeGeometries(chimneyGeos),
      rimGeo: mergeGeometries(rimGeos)
    });
  }
  return variants;
}

export const createKelpVariants = createRibbonKelpVariants;

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

  // Aquatic Xenobotanical Materials (Aurelia Prime Ocean)
  // Species 6 (Aquatic 1): Aurelian Prismatic Ribbon-Kelp
  const ribbonKelpBladeMat = new THREE.MeshStandardMaterial({
    color: 0x059669,
    emissive: 0x064e3b,
    emissiveIntensity: 0.35,
    roughness: 0.32,
    metalness: 0.15,
    side: THREE.DoubleSide
  });
  const ribbonKelpSporeMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: 0x00f5d4,
    emissiveIntensity: 2.6,
    roughness: 0.2
  });

  // Species 7 (Aquatic 2): Crystalline Staghorn Branch-Coral
  const staghornBranchMat = new THREE.MeshStandardMaterial({
    color: 0x7c3aed,
    roughness: 0.38,
    metalness: 0.25,
    flatShading: false
  });
  const staghornTipMat = new THREE.MeshStandardMaterial({
    color: 0xf43f5e,
    emissive: 0xf43f5e,
    emissiveIntensity: 2.8,
    roughness: 0.18
  });

  // Species 8 (Aquatic 3): Bioluminescent Strata-Plate Coral
  const strataPlateBodyMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    roughness: 0.62,
    metalness: 0.2,
    flatShading: false
  });
  const strataPlateEdgeMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: 0x00f5d4,
    emissiveIntensity: 3.2,
    roughness: 0.2
  });

  // Species 9 (Aquatic 4): Volcanic Hadal Vent-Spire
  const ventChimneyMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.85,
    metalness: 0.1,
    flatShading: false
  });
  const ventRimMat = new THREE.MeshStandardMaterial({
    color: 0x818cf8,
    emissive: 0x818cf8,
    emissiveIntensity: 2.6,
    roughness: 0.25
  });

  // Dry Lunar Counterpart Materials (Pyra Volcanic Fumaroles & Lumen Crystal Antlers)
  const pyraVentChimneyMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.9,
    metalness: 0.05,
    flatShading: false
  });
  const pyraVentRimMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xd97706,
    emissiveIntensity: 2.8,
    roughness: 0.2
  });

  const lumenStaghornBranchMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.35,
    flatShading: false
  });
  const lumenStaghornTipMat = new THREE.MeshStandardMaterial({
    color: 0x78dcca,
    emissive: 0x2a9d8f,
    emissiveIntensity: 2.8,
    roughness: 0.2
  });

  // Oceanic Floating Spore Particles
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

  // Terrestrial & Marine Species Counts
  let mycenaCount = 0;
  let arborCount = 0;
  let cactusCount = 0;
  let fernCount = 0;
  let tendrilCount = 0;
  let sporeCount = 0;

  // Aquatic species on Aurelia Prime
  let ribbonKelpCount = 0;
  let staghornCount = 0;
  let strataPlateCount = 0;
  let ventSpireCount = 0;

  // Dry lunar counterpart species on moons
  let pyraVentSpireCount = 0;
  let lumenStaghornCount = 0;

  if (body.isMoon) {
    if (isLumen) {
      cactusCount = Math.round(380 * densityMult);
      lumenStaghornCount = Math.round(200 * densityMult);
    } else if (isPyra) {
      tendrilCount = Math.round(340 * densityMult);
      pyraVentSpireCount = Math.round(200 * densityMult);
      sporeCount = Math.round(80 * densityMult);
    } else {
      // Goliath (default largest moon): strictly giant Lucent-Mycena titan neon fungi
      mycenaCount = Math.round(480 * densityMult);
      sporeCount = Math.round(60 * densityMult);
    }
  } else {
    // Aurelia Prime (Planet): All 5 terrestrial species + 4 marine species
    arborCount = Math.round(520 * densityMult);
    fernCount = Math.round(680 * densityMult);
    mycenaCount = Math.round(580 * densityMult);
    tendrilCount = Math.round(440 * densityMult);
    cactusCount = Math.round(340 * densityMult);
    sporeCount = Math.round(220 * densityMult);

    if (body.hasOcean) {
      ribbonKelpCount = Math.round(380 * densityMult);
      staghornCount = Math.round(280 * densityMult);
      strataPlateCount = Math.round(340 * densityMult);
      ventSpireCount = Math.round(260 * densityMult);
    }
  }

  // 3. Generate Geometry Variants
  const mycenaVariants = mycenaCount > 0 ? createLucentMycenaVariants(4) : [];
  const arborVariants = arborCount > 0 ? createCobaltStrataArborVariants(4) : [];
  const cactusVariants = cactusCount > 0 ? createPrismaticLithocactusVariants(4) : [];
  const fernVariants = fernCount > 0 ? createCyanSerrataFernVariants(4) : [];
  const tendrilVariants = tendrilCount > 0 ? createAbyssalTendrilPodVariants(4) : [];

  const ribbonKelpVariants = ribbonKelpCount > 0 ? createRibbonKelpVariants(4) : [];
  const staghornVariants = (staghornCount > 0 || lumenStaghornCount > 0) ? createStaghornCoralVariants(4) : [];
  const strataPlateVariants = strataPlateCount > 0 ? createStrataPlateCoralVariants(4) : [];
  const ventSpireVariants = (ventSpireCount > 0 || pyraVentSpireCount > 0) ? createVentSpireVariants(4) : [];
  const sporeGeo = new THREE.IcosahedronGeometry(0.85, 0);

  const mVCount = mycenaVariants.length || 1;
  const aVCount = arborVariants.length || 1;
  const cVCount = cactusVariants.length || 1;
  const fVCount = fernVariants.length || 1;
  const tVCount = tendrilVariants.length || 1;

  const rkVCount = ribbonKelpVariants.length || 1;
  const stgVCount = staghornVariants.length || 1;
  const spVCount = strataPlateVariants.length || 1;
  const vsVCount = ventSpireVariants.length || 1;

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

  // Marine Meshes
  const ribbonKelpBladeMeshes = ribbonKelpVariants.map(v => new THREE.InstancedMesh(v.bladeGeo, ribbonKelpBladeMat, Math.ceil(ribbonKelpCount / rkVCount)));
  const ribbonKelpSporeMeshes = ribbonKelpVariants.map(v => new THREE.InstancedMesh(v.sporeGeo, ribbonKelpSporeMat, Math.ceil(ribbonKelpCount / rkVCount)));

  const staghornBranchMeshes = staghornCount > 0 ? staghornVariants.map(v => new THREE.InstancedMesh(v.branchGeo, staghornBranchMat, Math.ceil(staghornCount / stgVCount))) : [];
  const staghornTipMeshes = staghornCount > 0 ? staghornVariants.map(v => new THREE.InstancedMesh(v.tipGeo, staghornTipMat, Math.ceil(staghornCount / stgVCount))) : [];

  const strataPlateBodyMeshes = strataPlateVariants.map(v => new THREE.InstancedMesh(v.plateGeo, strataPlateBodyMat, Math.ceil(strataPlateCount / spVCount)));
  const strataPlateEdgeMeshes = strataPlateVariants.map(v => new THREE.InstancedMesh(v.edgeGeo, strataPlateEdgeMat, Math.ceil(strataPlateCount / spVCount)));

  const ventChimneyMeshes = ventSpireCount > 0 ? ventSpireVariants.map(v => new THREE.InstancedMesh(v.chimneyGeo, ventChimneyMat, Math.ceil(ventSpireCount / vsVCount))) : [];
  const ventRimMeshes = ventSpireCount > 0 ? ventSpireVariants.map(v => new THREE.InstancedMesh(v.rimGeo, ventRimMat, Math.ceil(ventSpireCount / vsVCount))) : [];

  // Dry Lunar Counterpart Meshes
  const lumenStaghornBranchMeshes = lumenStaghornCount > 0 ? staghornVariants.map(v => new THREE.InstancedMesh(v.branchGeo, lumenStaghornBranchMat, Math.ceil(lumenStaghornCount / stgVCount))) : [];
  const lumenStaghornTipMeshes = lumenStaghornCount > 0 ? staghornVariants.map(v => new THREE.InstancedMesh(v.tipGeo, lumenStaghornTipMat, Math.ceil(lumenStaghornCount / stgVCount))) : [];

  const pyraVentChimneyMeshes = pyraVentSpireCount > 0 ? ventSpireVariants.map(v => new THREE.InstancedMesh(v.chimneyGeo, pyraVentChimneyMat, Math.ceil(pyraVentSpireCount / vsVCount))) : [];
  const pyraVentRimMeshes = pyraVentSpireCount > 0 ? ventSpireVariants.map(v => new THREE.InstancedMesh(v.rimGeo, pyraVentRimMat, Math.ceil(pyraVentSpireCount / vsVCount))) : [];

  const sporeMesh = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount);

  const mIndices = new Array(mVCount).fill(0);
  const aIndices = new Array(aVCount).fill(0);
  const cIndices = new Array(cVCount).fill(0);
  const fIndices = new Array(fVCount).fill(0);
  const tIndices = new Array(tVCount).fill(0);

  const rkIndices = new Array(rkVCount).fill(0);
  const stgIndices = new Array(stgVCount).fill(0);
  const spIndices = new Array(spVCount).fill(0);
  const vsIndices = new Array(vsVCount).fill(0);

  const lstgIndices = new Array(stgVCount).fill(0);
  const pvsIndices = new Array(vsVCount).fill(0);
  let sIdx = 0;

  const totalFloraCount = mycenaCount + arborCount + cactusCount + fernCount + tendrilCount +
    ribbonKelpCount + staghornCount + strataPlateCount + ventSpireCount +
    lumenStaghornCount + pyraVentSpireCount + sporeCount;
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
      if (depthBelowSea >= 2.0 && depthBelowSea <= 160) {
        const uRand = noise.hash(i * 109);
        let underseaSpecies = null;

        if (depthBelowSea < 45.0) {
          // Shallows & Submerged Shelves (2m - 45m): Ribbon-Kelp (40%), Staghorn Coral (35%), Strata-Plate (25%)
          if (uRand < 0.40) underseaSpecies = 'ribbonKelp';
          else if (uRand < 0.75) underseaSpecies = 'staghorn';
          else underseaSpecies = 'strataPlate';
        } else {
          // Midnight Hadal Abyss (45m - 160m): Hadal Vent-Spires (50%), Strata-Plates (35%), Deep Ribbon-Kelp (15%)
          if (uRand < 0.50) underseaSpecies = 'ventSpire';
          else if (uRand < 0.85) underseaSpecies = 'strataPlate';
          else underseaSpecies = 'ribbonKelp';
        }

        // Guarantee balanced representation across all underwater depth zones
        const uMod = i % 12;
        if (uMod === 1 && staghornCount > 0) underseaSpecies = 'staghorn';
        else if (uMod === 3 && ribbonKelpCount > 0) underseaSpecies = 'ribbonKelp';
        else if (uMod === 5 && strataPlateCount > 0) underseaSpecies = 'strataPlate';
        else if (uMod === 7 && ventSpireCount > 0) underseaSpecies = 'ventSpire';

        if (underseaSpecies === 'ribbonKelp' && ribbonKelpCount > 0) {
          const rkVar = (i + Math.floor(noise.hash(i * 79) * 10)) % rkVCount;
          const curIdx = rkIndices[rkVar];
          if (curIdx < ribbonKelpBladeMeshes[rkVar].count) {
            ribbonKelpBladeMeshes[rkVar].setMatrixAt(curIdx, dummy.matrix);
            ribbonKelpSporeMeshes[rkVar].setMatrixAt(curIdx, dummy.matrix);
            rkIndices[rkVar]++;
          }
        } else if (underseaSpecies === 'staghorn' && staghornCount > 0) {
          const stgVar = (i + Math.floor(noise.hash(i * 83) * 10)) % stgVCount;
          const curIdx = stgIndices[stgVar];
          if (curIdx < staghornBranchMeshes[stgVar].count) {
            staghornBranchMeshes[stgVar].setMatrixAt(curIdx, dummy.matrix);
            staghornTipMeshes[stgVar].setMatrixAt(curIdx, dummy.matrix);
            stgIndices[stgVar]++;
          }
        } else if (underseaSpecies === 'strataPlate' && strataPlateCount > 0) {
          const spVar = (i + Math.floor(noise.hash(i * 89) * 10)) % spVCount;
          const curIdx = spIndices[spVar];
          if (curIdx < strataPlateBodyMeshes[spVar].count) {
            strataPlateBodyMeshes[spVar].setMatrixAt(curIdx, dummy.matrix);
            strataPlateEdgeMeshes[spVar].setMatrixAt(curIdx, dummy.matrix);
            spIndices[spVar]++;
            collisionGrid.addCollider(dummy.position, normal, 1.85 * scale, 3.5 * scale, 'plate');
          }
        } else if (underseaSpecies === 'ventSpire' && ventSpireCount > 0) {
          const vsVar = (i + Math.floor(noise.hash(i * 97) * 10)) % vsVCount;
          const curIdx = vsIndices[vsVar];
          if (curIdx < ventChimneyMeshes[vsVar].count) {
            ventChimneyMeshes[vsVar].setMatrixAt(curIdx, dummy.matrix);
            ventRimMeshes[vsVar].setMatrixAt(curIdx, dummy.matrix);
            vsIndices[vsVar]++;
            collisionGrid.addCollider(dummy.position, normal, 1.25 * scale, 9.0 * scale, 'vent');
          }
        }
      }
      continue;
    }

    // 5. Biome Elevation Zoning
    let targetSpecies = null;

    if (body.isMoon) {
      if (isLumen) {
        // Moon I (Lumen): Prismatic Lithocactus (65%) + Dry Crystalline Staghorn Branch-Coral (35%)
        const mRand = noise.hash(i * 113);
        targetSpecies = (mRand < 0.35 && lumenStaghornCount > 0) ? 'lumenStaghorn' : 'cactus';
      } else if (isPyra) {
        // Moon II (Pyra): Abyssal Tendril-Pod (65%) + Dry Volcanic Fumarole Vent-Spires (35%)
        const mRand = noise.hash(i * 113);
        targetSpecies = (mRand < 0.35 && pyraVentSpireCount > 0) ? 'pyraVent' : 'tendril';
      } else {
        // Moon III (Goliath): Exclusively Aurelian Lucent-Mycena titan neon fungi
        targetSpecies = 'mycena';
      }
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
    } else if (targetSpecies === 'lumenStaghorn' && lumenStaghornCount > 0) {
      const stgVar = (i + Math.floor(noise.hash(i * 83) * 10)) % stgVCount;
      const curIdx = lstgIndices[stgVar];
      if (curIdx < lumenStaghornBranchMeshes[stgVar].count) {
        lumenStaghornBranchMeshes[stgVar].setMatrixAt(curIdx, dummy.matrix);
        lumenStaghornTipMeshes[stgVar].setMatrixAt(curIdx, dummy.matrix);
        lstgIndices[stgVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.85 * scale, 5.5 * scale, 'crystal');
      }
    } else if (targetSpecies === 'pyraVent' && pyraVentSpireCount > 0) {
      const vsVar = (i + Math.floor(noise.hash(i * 97) * 10)) % vsVCount;
      const curIdx = pvsIndices[vsVar];
      if (curIdx < pyraVentChimneyMeshes[vsVar].count) {
        pyraVentChimneyMeshes[vsVar].setMatrixAt(curIdx, dummy.matrix);
        pyraVentRimMeshes[vsVar].setMatrixAt(curIdx, dummy.matrix);
        pvsIndices[vsVar]++;
        collisionGrid.addCollider(dummy.position, normal, 1.25 * scale, 9.0 * scale, 'vent');
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

  // Marine Meshes
  for (let v = 0; v < rkVCount; v++) {
    if (ribbonKelpBladeMeshes[v] && rkIndices[v] > 0) {
      ribbonKelpBladeMeshes[v].count = rkIndices[v];
      ribbonKelpSporeMeshes[v].count = rkIndices[v];
      ribbonKelpBladeMeshes[v].instanceMatrix.needsUpdate = true;
      ribbonKelpSporeMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(ribbonKelpBladeMeshes[v], ribbonKelpSporeMeshes[v]);
    }
  }

  for (let v = 0; v < stgVCount; v++) {
    if (staghornBranchMeshes[v] && stgIndices[v] > 0) {
      staghornBranchMeshes[v].count = stgIndices[v];
      staghornTipMeshes[v].count = stgIndices[v];
      staghornBranchMeshes[v].instanceMatrix.needsUpdate = true;
      staghornTipMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(staghornBranchMeshes[v], staghornTipMeshes[v]);
    }
  }

  for (let v = 0; v < spVCount; v++) {
    if (strataPlateBodyMeshes[v] && spIndices[v] > 0) {
      strataPlateBodyMeshes[v].count = spIndices[v];
      strataPlateEdgeMeshes[v].count = spIndices[v];
      strataPlateBodyMeshes[v].instanceMatrix.needsUpdate = true;
      strataPlateEdgeMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(strataPlateBodyMeshes[v], strataPlateEdgeMeshes[v]);
    }
  }

  for (let v = 0; v < vsVCount; v++) {
    if (ventChimneyMeshes[v] && vsIndices[v] > 0) {
      ventChimneyMeshes[v].count = vsIndices[v];
      ventRimMeshes[v].count = vsIndices[v];
      ventChimneyMeshes[v].instanceMatrix.needsUpdate = true;
      ventRimMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(ventChimneyMeshes[v], ventRimMeshes[v]);
    }
  }

  // Dry Lunar Counterpart Meshes
  for (let v = 0; v < stgVCount; v++) {
    if (lumenStaghornBranchMeshes[v] && lstgIndices[v] > 0) {
      lumenStaghornBranchMeshes[v].count = lstgIndices[v];
      lumenStaghornTipMeshes[v].count = lstgIndices[v];
      lumenStaghornBranchMeshes[v].instanceMatrix.needsUpdate = true;
      lumenStaghornTipMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(lumenStaghornBranchMeshes[v], lumenStaghornTipMeshes[v]);
    }
  }

  for (let v = 0; v < vsVCount; v++) {
    if (pyraVentChimneyMeshes[v] && pvsIndices[v] > 0) {
      pyraVentChimneyMeshes[v].count = pvsIndices[v];
      pyraVentRimMeshes[v].count = pvsIndices[v];
      pyraVentChimneyMeshes[v].instanceMatrix.needsUpdate = true;
      pyraVentRimMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(pyraVentChimneyMeshes[v], pyraVentRimMeshes[v]);
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
    ribbonKelpMat: { blade: ribbonKelpBladeMat, spore: ribbonKelpSporeMat },
    staghornMat: { branch: staghornBranchMat, tip: staghornTipMat },
    strataPlateMat: { body: strataPlateBodyMat, edge: strataPlateEdgeMat },
    ventSpireMat: { chimney: ventChimneyMat, rim: ventRimMat },
    lumenStaghornMat: { branch: lumenStaghornBranchMat, tip: lumenStaghornTipMat },
    pyraVentMat: { chimney: pyraVentChimneyMat, rim: pyraVentRimMat },
    // Backwards-compatible references for existing tests
    crystalMat: cactusBodyMat,
    capMat: mycenaCapMat,
    kelpMat: ribbonKelpBladeMat
  };
}
