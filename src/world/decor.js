import * as THREE from 'three';
import { cubeToSphere } from './cubeSphere.js';

/**
 * Instanced sci-fi flora & crystalline minerals on celestial body surfaces,
 * plus destructible crystal nodes / orbital asteroids for ship & player interaction.
 */
export function populatePlanetDecor(body, noise) {
  const group = new THREE.Group();
  const dummy = new THREE.Object3D();
  const upDefault = new THREE.Vector3(0, 1, 0);
  const normal = new THREE.Vector3();
  const quat = new THREE.Quaternion();

  // 1. Glowing Bioluminescent Mushroom Trees (trunk + glowing cap)
  const trunkGeo = new THREE.CylinderGeometry(0.45, 0.85, 6.5, 6);
  trunkGeo.translate(0, 3.25, 0);
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x3b2d54,
    roughness: 0.8,
    flatShading: true
  });

  const capGeo = new THREE.ConeGeometry(4.2, 3.0, 8);
  capGeo.translate(0, 6.8, 0);
  const capMat = new THREE.MeshStandardMaterial({
    color: 0x00f5d4,
    emissive: 0x00a896,
    emissiveIntensity: 0.75,
    roughness: 0.35,
    flatShading: true
  });

  // 2. Tropical Alien Spiral Palm Fronds (stacked cones)
  const palmGeo = new THREE.ConeGeometry(2.6, 8.5, 5);
  palmGeo.translate(0, 4.25, 0);
  const palmMat = new THREE.MeshStandardMaterial({
    color: 0x2ec4b6,
    emissive: 0x0b525b,
    emissiveIntensity: 0.3,
    roughness: 0.6,
    flatShading: true
  });

  // 3. Glowing Sci-Fi Mineral Crystal Clusters
  const crystalGeo = new THREE.OctahedronGeometry(1.9, 0);
  crystalGeo.scale(0.65, 2.4, 0.65);
  crystalGeo.translate(0, 1.8, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: 0xff4dff,
    emissive: 0xd9048e,
    emissiveIntensity: 0.9,
    roughness: 0.2,
    metalness: 0.5,
    flatShading: true
  });

  // 4. Floating Bioluminescent Spore Orbs
  const sporeGeo = new THREE.IcosahedronGeometry(0.95, 0);
  const sporeMat = new THREE.MeshBasicMaterial({
    color: 0x9ef01a
  });

  const mushroomCount = body.isMoon ? 0 : 320;
  const palmCount = body.isMoon ? 0 : 380;
  const crystalCount = body.isMoon ? 110 : 220;
  const sporeCount = body.isMoon ? 35 : 160;

  const trunks = mushroomCount ? new THREE.InstancedMesh(trunkGeo, trunkMat, mushroomCount) : null;
  const caps = mushroomCount ? new THREE.InstancedMesh(capGeo, capMat, mushroomCount) : null;
  const palms = palmCount ? new THREE.InstancedMesh(palmGeo, palmMat, palmCount) : null;
  const crystals = new THREE.InstancedMesh(crystalGeo, body.isMoon ? crystalMat.clone() : crystalMat, crystalCount);
  if (body.isMoon && body.moonTheme) {
    crystals.material.color.setHex(body.moonTheme.crystalColor);
    crystals.material.emissive.setHex(body.moonTheme.crystalEmissive);
  }
  const spores = new THREE.InstancedMesh(sporeGeo, sporeMat, sporeCount);

  let mIdx = 0;
  let pIdx = 0;
  let cIdx = 0;
  let sIdx = 0;

  const totalSamples = (mushroomCount + palmCount + crystalCount + sporeCount) * 3;
  for (let i = 0; i < totalSamples; i++) {
    // Quasi-random point on cube then spherify
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
    const surfaceR = body.getSurfaceRadiusAtDir(nx, ny, uzOrNz(nz));
    const seaLevel = body.seaLevelRadius || 0;

    // Skip underwater points
    if (surfaceR < seaLevel + 1.2) continue;

    normal.set(nx, ny, nz);
    quat.setFromUnitVectors(upDefault, normal);
    const spin = new THREE.Quaternion().setFromAxisAngle(normal, noise.hash(i * 43) * Math.PI * 2);
    quat.premultiply(spin);

    const scale = 0.75 + noise.hash(i * 59) * 1.15;
    dummy.position.set(nx * surfaceR, ny * surfaceR, nz * surfaceR);
    dummy.quaternion.copy(quat);
    dummy.scale.setScalar(scale);
    dummy.updateMatrix();

    const selector = i % 4;
    if (selector === 0 && trunks && mIdx < mushroomCount) {
      trunks.setMatrixAt(mIdx, dummy.matrix);
      caps.setMatrixAt(mIdx, dummy.matrix);
      mIdx++;
    } else if (selector === 1 && palms && pIdx < palmCount) {
      palms.setMatrixAt(pIdx, dummy.matrix);
      pIdx++;
    } else if (selector === 2 && cIdx < crystalCount) {
      crystals.setMatrixAt(cIdx, dummy.matrix);
      cIdx++;
    } else if (sIdx < sporeCount) {
      const floatHeight = surfaceR + 5 + noise.hash(i * 71) * 10;
      dummy.position.set(nx * floatHeight, ny * floatHeight, nz * floatHeight);
      dummy.scale.setScalar(0.6 + noise.hash(i * 83) * 0.9);
      dummy.updateMatrix();
      spores.setMatrixAt(sIdx, dummy.matrix);
      sIdx++;
    }
  }

  if (trunks) {
    trunks.count = mIdx;
    caps.count = mIdx;
    group.add(trunks, caps);
  }
  if (palms) {
    palms.count = pIdx;
    group.add(palms);
  }
  crystals.count = cIdx;
  spores.count = sIdx;
  group.add(crystals, spores);

  return { group, crystalMat: crystals.material, capMat };
}

function uzOrNz(nz) {
  return nz;
}
