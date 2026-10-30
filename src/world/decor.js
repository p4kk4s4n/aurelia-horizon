import * as THREE from 'three';
import { cubeToSphere } from './cubeSphere.js';
import { mulberry32, bezierSpine, tubeAlongSpine, shardGeometry, mergeGeometries } from './procGeo.js';

/**
 * Procedural Sci-Fi Flora & Branching Crystalline Minerals for Aurelia Horizon.
 * Features:
 * - Organic randomized curvature for mushroom trees and palms
 * - Recursive branching for mineral crystal clusters
 * - Seabed kelp ribbons in deep ocean basins
 * - Multiple geometry variants per species for natural biodiversity
 * - Graphics quality scaling (density multiplier)
 */

function createMushroomVariants(count = 6) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(1001 + v * 97);
    const height = 6.2 + rng() * 3.8;
    const bend = 0.22 + rng() * 0.26;
    const spine = bezierSpine(rng, height, bend, 8);

    // Trunk tube along spine
    const trunkGeo = tubeAlongSpine(spine, (t) => (0.75 * (1 - t * 0.42) + Math.sin(t * Math.PI) * 0.12), 6);

    // Main cap at spine tip tilted along tip tangent
    const capR = 3.6 + rng() * 1.6;
    const capH = 2.2 + rng() * 1.4;
    const capGeo = new THREE.ConeGeometry(capR, capH, 8);
    capGeo.scale(0.9 + rng() * 0.3, 0.8 + rng() * 0.3, 0.9 + rng() * 0.3);

    // Align cap to tip tangent
    const alignQ = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), spine.tipTangent);
    capGeo.applyQuaternion(alignQ);
    capGeo.translate(spine.tip.x, spine.tip.y + capH * 0.3, spine.tip.z);

    const trunkGeos = [trunkGeo];
    const capGeos = [capGeo];

    // 40% chance of a secondary side branch with miniature cap
    if (rng() > 0.6) {
      const branchT = 0.45 + rng() * 0.25;
      const bIdx = Math.floor(branchT * (spine.points.length - 1));
      const branchOrigin = spine.points[bIdx];
      const bHeight = height * (0.35 + rng() * 0.2);
      const bSpine = bezierSpine(rng, bHeight, 0.45, 6);

      // Rotate branch away from trunk
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

    // Slender curved trunk
    const trunk = tubeAlongSpine(spine, (t) => 0.55 * (1 - t * 0.55), 5);
    const palmParts = [trunk];

    // Arching frond ribbons from crown
    const numFronds = 6 + Math.floor(rng() * 4);
    for (let f = 0; f < numFronds; f++) {
      const fAngle = (f / numFronds) * Math.PI * 2 + (rng() - 0.5) * 0.3;
      const fLen = 3.8 + rng() * 2.2;
      const frondSpine = bezierSpine(rng, fLen, 0.6, 6);

      // Droop frond outwards and downwards
      const fQuat = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), fAngle);
      const droop = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), 1.2 + rng() * 0.4);
      fQuat.multiply(droop);

      const frondGeo = tubeAlongSpine(frondSpine, (t) => (0.42 * (1 - t) + 0.08), 4);
      frondGeo.scale(1.8, 1.0, 0.35); // flattened frond blade profile
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

    // Main primary shard
    const rootLen = 3.6 + rng() * 2.6;
    const rootRadius = 0.65 + rng() * 0.3;
    const mainShard = shardGeometry(rootLen, rootRadius, 0.35, 6);
    // Slight random lean on main shard
    const rootQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler((rng() - 0.5) * 0.22, rng() * Math.PI * 2, (rng() - 0.5) * 0.22)
    );
    mainShard.applyQuaternion(rootQuat);
    crystalParts.push(mainShard);

    // Primary branches (children emerging from parent shard)
    const numBranches = 3 + Math.floor(rng() * 3);
    for (let b = 0; b < numBranches; b++) {
      const attachT = 0.25 + rng() * 0.55;
      const bLen = rootLen * (0.45 + rng() * 0.32);
      const bRad = rootRadius * (0.45 + rng() * 0.25);
      const branchShard = shardGeometry(bLen, bRad, 0.3, 5);

      const bAzimuth = (b / numBranches) * Math.PI * 2 + (rng() - 0.5) * 0.5;
      const bElevation = 0.55 + rng() * 0.45; // 30° to 60° tilt outward

      const bQuat = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(bElevation, bAzimuth, 0, 'YXZ')
      );
      branchShard.applyQuaternion(bQuat);

      const yAttach = rootLen * attachT;
      const xAttach = Math.sin(bAzimuth) * rootRadius * 0.8;
      const zAttach = Math.cos(bAzimuth) * rootRadius * 0.8;
      branchShard.translate(xAttach, yAttach, zAttach);
      crystalParts.push(branchShard);

      // 40% chance of sub-twig branching off this branch
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

function createKelpVariants(count = 4) {
  const variants = [];
  for (let v = 0; v < count; v++) {
    const rng = mulberry32(7001 + v * 41);
    const height = 9.0 + rng() * 6.5;
    const spine = bezierSpine(rng, height, 0.45, 8);
    const kelpGeo = tubeAlongSpine(spine, (t) => 0.4 * (1 - t * 0.5), 4);
    kelpGeo.scale(2.4, 1.0, 0.2); // flat wavy sea ribbon
    variants.push(kelpGeo);
  }
  return variants;
}

/**
 * Main decor population function for celestial bodies.
 */
export function populatePlanetDecor(body, noise, qualityOverride = null) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const upDefault = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  // Read graphics quality setting from override or localStorage: 'low' (0.5), 'medium' (0.8), 'high' (1.0), 'ultra' (1.4)
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

  // Base counts scaled for double-size world (720m planet, 130-310m moons)
  const mushroomCount = body.isMoon ? 0 : Math.round(920 * densityMult);
  const palmCount = body.isMoon ? 0 : Math.round(1050 * densityMult);
  const crystalCount = body.isMoon ? Math.round(340 * densityMult) : Math.round(540 * densityMult);
  const sporeCount = body.isMoon ? Math.round(60 * densityMult) : Math.round(280 * densityMult);
  const kelpCount = body.hasOcean ? Math.round(420 * densityMult) : 0;

  // Generate species geometry variants
  const mushroomVariants = body.isMoon ? [] : createMushroomVariants(6);
  const palmVariants = body.isMoon ? [] : createPalmVariants(6);
  const crystalVariants = createBranchingCrystalVariants(6);
  const kelpVariants = body.hasOcean ? createKelpVariants(4) : [];
  const sporeGeo = new THREE.IcosahedronGeometry(1.2, 0);

  // Instanced meshes partitioned per variant
  const mVariantCount = mushroomVariants.length || 1;
  const pVariantCount = palmVariants.length || 1;
  const cVariantCount = crystalVariants.length || 1;
  const kVariantCount = kelpVariants.length || 1;

  const mushroomTrunkMeshes = mushroomVariants.map(v => new THREE.InstancedMesh(v.trunkGeo, trunkMat, Math.ceil(mushroomCount / mVariantCount)));
  const mushroomCapMeshes = mushroomVariants.map(v => new THREE.InstancedMesh(v.capGeo, capMat, Math.ceil(mushroomCount / mVariantCount)));
  const palmMeshes = palmVariants.map(geo => new THREE.InstancedMesh(geo, palmMat, Math.ceil(palmCount / pVariantCount)));

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
  const cIndices = new Array(cVariantCount).fill(0);
  const kIndices = new Array(kVariantCount).fill(0);
  let sIdx = 0;

  const totalSamples = (mushroomCount + palmCount + crystalCount + sporeCount + kelpCount) * 4;

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

    // Subtle random tilt off surface normal (≤ 8°)
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
      // Undersea kelp in ocean depths (3m to 45m deep)
      if (depthBelowSea >= 2.5 && depthBelowSea <= 50 && kelpCount > 0) {
        const kVar = (i + Math.floor(noise.hash(i * 79) * 10)) % kVariantCount;
        const curIdx = kIndices[kVar];
        if (curIdx < kelpMeshes[kVar].count) {
          kelpMeshes[kVar].setMatrixAt(curIdx, dummy.matrix);
          kIndices[kVar]++;
        }
      }
      continue;
    }

    // Land species distribution
    const selector = i % 4;

    if (selector === 0 && mushroomCount > 0) {
      const mVar = (i + Math.floor(noise.hash(i * 79) * 10)) % mVariantCount;
      const curIdx = mIndices[mVar];
      if (curIdx < mushroomTrunkMeshes[mVar].count) {
        mushroomTrunkMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mushroomCapMeshes[mVar].setMatrixAt(curIdx, dummy.matrix);
        mIndices[mVar]++;
      }
    } else if (selector === 1 && palmCount > 0) {
      const pVar = (i + Math.floor(noise.hash(i * 83) * 10)) % pVariantCount;
      const curIdx = pIndices[pVar];
      if (curIdx < palmMeshes[pVar].count) {
        palmMeshes[pVar].setMatrixAt(curIdx, dummy.matrix);
        pIndices[pVar]++;
      }
    } else if (selector === 2 && crystalCount > 0) {
      const cVar = (i + Math.floor(noise.hash(i * 89) * 10)) % cVariantCount;
      const curIdx = cIndices[cVar];
      if (curIdx < crystalMeshes[cVar].count) {
        crystalMeshes[cVar].setMatrixAt(curIdx, dummy.matrix);
        cIndices[cVar]++;
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
    crystalMat: effectiveCrystalMat,
    capMat
  };
}
