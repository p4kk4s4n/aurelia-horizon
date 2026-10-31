import * as THREE from 'three';
import { cubeToSphere } from './cubeSphere.js';
import { mulberry32, bezierSpine, tubeAlongSpine, shardGeometry, mergeGeometries } from './procGeo.js';

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

function createMushroomVariants(count = 6) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(1001 + v * 97);
    const height = 6.2 + rng() * 3.8;
    const bend = 0.22 + rng() * 0.26;
    const spine = bezierSpine(rng, height, bend, 8);

    const trunkGeo = tubeAlongSpine(spine, (t) => (0.75 * (1 - t * 0.42) + Math.sin(t * Math.PI) * 0.12), 6);

    const capR = 3.6 + rng() * 1.6;
    const capH = 2.2 + rng() * 1.4;
    const capGeo = new THREE.ConeGeometry(capR, capH, 8);
    capGeo.scale(0.9 + rng() * 0.3, 0.8 + rng() * 0.3, 0.9 + rng() * 0.3);

    const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), spine.tipTangent);
    capGeo.applyQuaternion(alignQ);
    capGeo.translate(spine.tip.x, spine.tip.y + capH * 0.3, spine.tip.z);

    const trunkGeos = [trunkGeo];
    const capGeos = [capGeo];

    if (rng() > 0.55) {
      const branchT = 0.45 + rng() * 0.25;
      const bIdx = Math.floor(branchT * (spine.points.length - 1));
      const branchOrigin = spine.points[bIdx];
      const bHeight = height * (0.35 + rng() * 0.2);
      const bSpine = bezierSpine(rng, bHeight, 0.45, 6);

      const bAngle = rng() * Math.PI * 2;
      const bQuat = new THREE.Quaternion().setFromAxisAngle(spine.tangents[bIdx], bAngle);
      const tilt = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 0.6 + rng() * 0.4);
      bQuat.multiply(tilt);

      const bTrunk = tubeAlongSpine(bSpine, (t) => 0.35 * (1 - t * 0.4), 5);
      bTrunk.applyQuaternion(bQuat);
      bTrunk.translate(branchOrigin.x, branchOrigin.y, branchOrigin.z);
      trunkGeos.push(bTrunk);

      const bCap = new THREE.ConeGeometry(capR * 0.5, capH * 0.5, 7);
      const bTip = bSpine.tip.clone().applyQuaternion(bQuat).add(branchOrigin);
      const bTipTang = bSpine.tipTangent.clone().applyQuaternion(bQuat);
      const bCapQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), bTipTang);
      bCap.applyQuaternion(bCapQ);
      bCap.translate(bTip.x, bTip.y, bTip.z);
      capGeos.push(bCap);
    }

    variants.push({
      trunkGeo: mergeGeometries(trunkGeos),
      capGeo: mergeGeometries(capGeos)
    });
  }
  return variants;
}

function createPalmVariants(count = 6) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(3001 + v * 83);
    const height = 8.0 + rng() * 4.2;
    const bend = 0.30 + rng() * 0.28;
    const spine = bezierSpine(rng, height, bend, 8);

    const trunk = tubeAlongSpine(spine, (t) => 0.55 * (1 - t * 0.55), 5);
    const palmParts = [trunk];

    const numFronds = 6 + Math.floor(rng() * 4);
    for (let f = 0; f < numFronds; f++) {
      const fAngle = (f / numFronds) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const fLen = 3.8 + rng() * 2.2;
      const frondSpine = bezierSpine(rng, fLen, 0.6, 6);

      const fQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), fAngle);
      const droop = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2 + rng() * 0.4);
      fQuat.multiply(droop);

      const frondGeo = tubeAlongSpine(frondSpine, (t) => (0.42 * (1 - t) + 0.08), 4);
      frondGeo.scale(1.8, 1.0, 0.35);
      frondGeo.applyQuaternion(fQuat);
      frondGeo.translate(spine.tip.x, spine.tip.y, spine.tip.z);
      palmParts.push(frondGeo);
    }

    variants.push(mergeGeometries(palmParts));
  }
  return variants;
}

function createBranchingCrystalVariants(count = 6) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(5001 + v * 67);
    const crystalParts = [];

    const rootLen = 3.6 + rng() * 2.6;
    const rootRadius = 0.65 + rng() * 0.3;
    const mainShard = shardGeometry(rootLen, rootRadius, 0.35, 6);
    const rootQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rng() - 0.5) * 0.22, rng() * Math.PI * 2, (rng() - 0.5) * 0.22)
    );
    mainShard.applyQuaternion(rootQuat);
    crystalParts.push(mainShard);

    const numBranches = 3 + Math.floor(rng() * 3);
    for (let b = 0; b < numBranches; b++) {
      const attachT = 0.25 + rng() * 0.55;
      const bLen = rootLen * (0.45 + rng() * 0.32);
      const bRad = rootRadius * (0.45 + rng() * 0.25);
      const branchShard = shardGeometry(bLen, bRad, 0.3, 5);

      const bAzimuth = (b / numBranches) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const bElevation = 0.55 + rng() * 0.45;

      const bQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(bElevation, bAzimuth, 0, 'YXZ')
      );
      branchShard.applyQuaternion(bQuat);

      const yAttach = rootLen * attachT;
      const xAttach = Math.sin(bAzimuth) * rootRadius * 0.8;
      const zAttach = Math.cos(bAzimuth) * rootRadius * 0.8;
      branchShard.translate(xAttach, yAttach, zAttach);
      crystalParts.push(branchShard);

      if (rng() > 0.6) {
        const twigLen = bLen * 0.55;
        const twigRad = bRad * 0.5;
        const twigShard = shardGeometry(twigLen, twigRad, 0.25, 5);
        const twigQ = bQuat.clone().multiply(
          new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), 0.6)
        );
        twigShard.applyQuaternion(twigQ);
        twigShard.translate(xAttach * 1.4, yAttach + bLen * 0.4, zAttach * 1.4);
        crystalParts.push(twigShard);
      }
    }

    variants.push(mergeGeometries(crystalParts));
  }
  return variants;
}

/**
 * New Species 4: Bioluminescent Spore-Ferns (Alien Cycads with rosette fronds & glowing core)
 */
function createSporeFernVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(6101 + v * 53);
    const height = 4.2 + rng() * 2.5;
    const spine = bezierSpine(rng, height, 0.18, 6);
    const stalk = tubeAlongSpine(spine, (t) => 0.65 * (1 - t * 0.35), 5);
    const parts = [stalk];

    // Tiered fern rosette blades
    const frondCount = 7 + Math.floor(rng() * 3);
    for (let f = 0; f < frondCount; f++) {
      const angle = (f / frondCount) * Math.PI * 2;
      const fSpine = bezierSpine(rng, 2.8 + rng() * 1.4, 0.45, 5);
      const fGeo = tubeAlongSpine(fSpine, (t) => 0.38 * Math.sin(t * Math.PI) + 0.06, 4);
      fGeo.scale(2.2, 0.8, 0.3);
      const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.95 + rng() * 0.25, angle, 0, 'YXZ'));
      fGeo.applyQuaternion(q);
      fGeo.translate(spine.tip.x, spine.tip.y, spine.tip.z);
      parts.push(fGeo);
    }
    variants.push(mergeGeometries(parts));
  }
  return variants;
}

/**
 * New Species 5: Spiral Tendril Shrubs (Bulb Vines)
 */
function createTendrilShrubVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(8201 + v * 71);
    const parts = [];
    const stems = 3 + Math.floor(rng() * 3);
    for (let s = 0; s < stems; s++) {
      const h = 3.2 + rng() * 2.4;
      const spine = bezierSpine(rng, h, 0.55, 7);
      const vine = tubeAlongSpine(spine, (t) => 0.28 * (1 - t * 0.5), 5);
      const bulb = new THREE.IcosahedronGeometry(0.42 + rng() * 0.22, 0);
      bulb.translate(spine.tip.x, spine.tip.y, spine.tip.z);

      const angle = (s / stems) * Math.PI * 2 + rng() * 0.4;
      const rot = new THREE.Quaternion().setFromEuler(new THREE.Euler(0.25, angle, 0, 'YXZ'));
      vine.applyQuaternion(rot);
      bulb.applyQuaternion(rot);
      parts.push(vine, bulb);
    }
    variants.push(mergeGeometries(parts));
  }
  return variants;
}

function createKelpVariants(count = 4) {
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

/**
 * Main decor population function for celestial bodies with FloraCollisionGrid.
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

  // Materials
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3b2d54,
    roughness: 0.8,
    flatShading: true
  });

  const capMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: 0x00a896,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    flatShading: true
  });

  const palmMat = new THREE.MeshStandardMaterial({
    color: 0x2ec4b6,
    emissive: 0x0b525b,
    emissiveIntensity: 0.35,
    roughness: 0.6,
    flatShading: true
  });

  const fernMat = new THREE.MeshStandardMaterial({
    color: 0x80ed99,
    emissive: 0x38b000,
    emissiveIntensity: 0.45,
    roughness: 0.5,
    flatShading: true
  });

  const tendrilMat = new THREE.MeshStandardMaterial({
    color: 0xff9f1c,
    emissive: 0xf72585,
    emissiveIntensity: 0.65,
    roughness: 0.4,
    flatShading: true
  });

  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xff4dff,
    emissive: 0xd9048e,
    emissiveIntensity: 0.95,
    roughness: 0.2,
    metalness: 0.55,
    flatShading: true
  });

  const sporeMat = new THREE.MeshBasicMaterial({
    color: 0x9ef01a
  });

  const kelpMat = new THREE.MeshStandardMaterial({
    color: 0x058c7e,
    emissive: 0x005f73,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    transparent: true,
    opacity: 0.85,
    side: THREE.DoubleSide
  });

  // Base counts scaled for expanded biodiversity
  const mushroomCount = body.isMoon ? 0 : Math.round(780 * densityMult);
  const palmCount = body.isMoon ? 0 : Math.round(880 * densityMult);
  const fernCount = body.isMoon ? 0 : Math.round(520 * densityMult);
  const tendrilCount = body.isMoon ? Math.round(160 * densityMult) : Math.round(440 * densityMult);
  const crystalCount = body.isMoon ? Math.round(360 * densityMult) : Math.round(520 * densityMult);
  const sporeCount = body.isMoon ? Math.round(60 * densityMult) : Math.round(280 * densityMult);
  const kelpCount = body.hasOcean ? Math.round(560 * densityMult) : 0;

  // Generate species geometry variants
  const mushroomVariants = body.isMoon ? [] : createMushroomVariants(6);
  const palmVariants = body.isMoon ? [] : createPalmVariants(6);
  const fernVariants = body.isMoon ? [] : createSporeFernVariants(4);
  const tendrilVariants = createTendrilShrubVariants(4);
  const crystalVariants = createBranchingCrystalVariants(6);
  const kelpVariants = body.hasOcean ? createKelpVariants(4) : [];
  const sporeGeo = new THREE.IcosahedronGeometry(1.2, 0);

  const mVariantCount = mushroomVariants.length || 1;
  const pVariantCount = palmVariants.length || 1;
  const fVariantCount = fernVariants.length || 1;
  const tVariantCount = tendrilVariants.length || 1;
  const cVariantCount = crystalVariants.length || 1;
  const kVariantCount = kelpVariants.length || 1;

  const mushroomTrunkMeshes = mushroomVariants.map(v => new THREE.InstancedMesh(v.trunkGeo, trunkMat, Math.ceil(mushroomCount / mVariantCount)));
  const mushroomCapMeshes = mushroomVariants.map(v => new THREE.InstancedMesh(v.capGeo, capMat, Math.ceil(mushroomCount / mVariantCount)));
  const palmMeshes = palmVariants.map(geo => new THREE.InstancedMesh(geo, palmMat, Math.ceil(palmCount / pVariantCount)));
  const fernMeshes = fernVariants.map(geo => new THREE.InstancedMesh(geo, fernMat, Math.ceil(fernCount / fVariantCount)));
  const tendrilMeshes = tendrilVariants.map(geo => new THREE.InstancedMesh(geo, tendrilMat, Math.ceil(tendrilCount / tVariantCount)));

  const effectiveCrystalMat = body.isMoon ? crystalMat.clone() : crystalMat;
  if (body.isMoon && body.moonTheme) {
    effectiveCrystalMat.color.setHex(body.moonTheme.crystalColor);
    effectiveCrystalMat.emissive.setHex(body.moonTheme.crystalEmissive);
  }
  const crystalMeshes = crystalVariants.map(geo => new THREE.InstancedMesh(geo, effectiveCrystalMat, Math.ceil(crystalCount / cVariantCount)));
  const kelpMeshes = kelpVariants.map(geo => new THREE.InstancedMesh(geo, kelpMat, Math.ceil(kelpCount / kVariantCount)));
  const sporeMesh = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount);

  const mIndices = new Array(mVariantCount).fill(0);
  const pIndices = new Array(pVariantCount).fill(0);
  const fIndices = new Array(fVariantCount).fill(0);
  const tIndices = new Array(tVariantCount).fill(0);
  const cIndices = new Array(cVariantCount).fill(0);
  const kIndices = new Array(kVariantCount).fill(0);
  let sIdx = 0;

  const totalSamples = (mushroomCount + palmCount + fernCount + tendrilCount + crystalCount + sporeCount + kelpCount) * 4;

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

    normal.set(nx, ny, nz);
    quat.setFromUnitVectors(upDefault, normal);
    const spin = new THREE.Quaternion().setFromAxisAngle(normal, noise.hash(i * 43) * Math.PI * 2);
    quat.premultiply(spin);

    const tiltAxis = new THREE.Vector3(noise.hash(i * 101) - 0.5, 0, noise.hash(i * 103) - 0.5).normalize();
    if (tiltAxis.lengthSq() > 0.1) {
      const tiltAngle = noise.hash(i * 107) * 0.14;
      const surfaceTilt = new THREE.Quaternion().setFromAxisAngle(tiltAxis, tiltAngle);
      quat.multiply(surfaceTilt);
    }

    const scale = 0.8 + noise.hash(i * 59) * 1.35;
    dummy.position.set(nx * surfaceR, ny * surfaceR, nz * surfaceR);
    dummy.quaternion.copy(quat);
    dummy.scale.set(
      scale * (0.9 + noise.hash(i * 61) * 0.2),
      scale * (0.85 + noise.hash(i * 67) * 0.3),
      scale * (0.9 + noise.hash(i * 71) * 0.2)
    );
    dummy.updateMatrix();

    if (isUndersea) {
      // Undersea kelp and abyssal tendrils down to 110m deep
      if (depthBelowSea >= 2.5 && depthBelowSea <= 110 && kelpCount > 0) {
        const kVar = (i + Math.floor(noise.hash(i * 79) * 10)) % kVariantCount;
        const curIdx = kIndices[kVar];
        if (curIdx < kelpMeshes[kVar].count) {
          kelpMeshes[kVar].setMatrixAt(curIdx, dummy.matrix);
          kIndices[kVar]++;
        }
      }
      continue;
    }

    // Land species distribution across 6 categories
    const selector = i % 6;

    if (selector === 0 && mushroomCount > 0) {
      const mVar = (i + Math.floor(noise.hash(i * 79) * 10)) % mVariantCount;
      const curIdx = mIndices[mVar];
      if (curIdx < mushroomTrunkMeshes[mVar].count) {
        mushroomTrunkMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mushroomCapMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mIndices[mVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.85 * scale, 8.0 * scale, 'mushroom');
      }
    } else if (selector === 1 && palmCount > 0) {
      const pVar = (i + Math.floor(noise.hash(i * 83) * 10)) % pVariantCount;
      const curIdx = pIndices[pVar];
      if (curIdx < palmMeshes[pVar].count) {
        palmMeshes[pVar].setMatrixAt(curIdx, dummy.matrix);
        pIndices[pVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.72 * scale, 9.0 * scale, 'palm');
      }
    } else if (selector === 2 && crystalCount > 0) {
      const cVar = (i + Math.floor(noise.hash(i * 89) * 10)) % cVariantCount;
      const curIdx = cIndices[cVar];
      if (curIdx < crystalMeshes[cVar].count) {
        crystalMeshes[cVar].setMatrixAt(curIdx, dummy.matrix);
        cIndices[cVar]++;
        collisionGrid.addCollider(dummy.position, normal, 1.05 * scale, 6.0 * scale, 'crystal');
      }
    } else if (selector === 3 && fernCount > 0) {
      const fVar = (i + Math.floor(noise.hash(i * 97) * 10)) % fVariantCount;
      const curIdx = fIndices[fVar];
      if (curIdx < fernMeshes[fVar].count) {
        fernMeshes[fVar].setMatrixAt(curIdx, dummy.matrix);
        fIndices[fVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.75 * scale, 5.0 * scale, 'fern');
      }
    } else if (selector === 4 && tendrilCount > 0) {
      const tVar = (i + Math.floor(noise.hash(i * 101) * 10)) % tVariantCount;
      const curIdx = tIndices[tVar];
      if (curIdx < tendrilMeshes[tVar].count) {
        tendrilMeshes[tVar].setMatrixAt(curIdx, dummy.matrix);
        tIndices[tVar]++;
        collisionGrid.addCollider(dummy.position, normal, 0.68 * scale, 4.5 * scale, 'tendril');
      }
    } else if (sporeCount > 0 && sIdx < sporeCount) {
      const floatHeight = surfaceR + 6 + noise.hash(i * 71) * 16;
      dummy.position.set(nx * floatHeight, ny * floatHeight, nz * floatHeight);
      dummy.scale.setScalar(0.7 + noise.hash(i * 83) * 1.1);
      dummy.updateMatrix();
      sporeMesh.setMatrixAt(sIdx, dummy.matrix);
      sIdx++;
    }
  }

  // Set final instance counts & add to group
  for (let v = 0; v < mVariantCount; v++) {
    if (mushroomTrunkMeshes[v]) {
      mushroomTrunkMeshes[v].count = mIndices[v];
      mushroomCapMeshes[v].count = mIndices[v];
      mushroomTrunkMeshes[v].instanceMatrix.needsUpdate = true;
      mushroomCapMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(mushroomTrunkMeshes[v], mushroomCapMeshes[v]);
    }
  }

  for (let v = 0; v < pVariantCount; v++) {
    if (palmMeshes[v]) {
      palmMeshes[v].count = pIndices[v];
      palmMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(palmMeshes[v]);
    }
  }

  for (let v = 0; v < fVariantCount; v++) {
    if (fernMeshes[v]) {
      fernMeshes[v].count = fIndices[v];
      fernMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(fernMeshes[v]);
    }
  }

  for (let v = 0; v < tVariantCount; v++) {
    if (tendrilMeshes[v]) {
      tendrilMeshes[v].count = tIndices[v];
      tendrilMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(tendrilMeshes[v]);
    }
  }

  for (let v = 0; v < cVariantCount; v++) {
    if (crystalMeshes[v]) {
      crystalMeshes[v].count = cIndices[v];
      crystalMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(crystalMeshes[v]);
    }
  }

  for (let v = 0; v < kVariantCount; v++) {
    if (kelpMeshes[v]) {
      kelpMeshes[v].count = kIndices[v];
      kelpMeshes[v].instanceMatrix.needsUpdate = true;
      group.add(kelpMeshes[v]);
    }
  }

  if (sporeCount > 0) {
    sporeMesh.count = sIdx;
    sporeMesh.instanceMatrix.needsUpdate = true;
    group.add(sporeMesh);
  }

  return {
    group,
    collisionGrid,
    crystalMat: effectiveCrystalMat,
    capMat
  };
}
