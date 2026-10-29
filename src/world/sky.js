import * as THREE from 'three';

/**
 * Starfield, lighting, and destructible orbital asteroid / sentinel drone targets
 * so ship weapons and boost have exciting gameplay in orbit and moon transfer.
 */
export function createSkyAndSpaceTargets(scene) {
  // Starfield
  const starCount = 3500;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 6500 + Math.random() * 4000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);

    const tint = Math.random();
    starCol[i * 3] = tint > 0.7 ? 0.75 : 1.0;
    starCol[i * 3 + 1] = tint > 0.3 ? 0.92 : 0.78;
    starCol[i * 3 + 2] = 1.0;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: 16,
    vertexColors: true,
    sizeAttenuation: true
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // Sun visual sphere + directional & hemisphere lighting
  const sunDir = new THREE.Vector3(1, 0.65, 0.45).normalize();
  const sunLight = new THREE.DirectionalLight(0xfff4d6, 2.2);
  sunLight.position.copy(sunDir).multiplyScalar(4500);
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x72efdd, 0x1b1433, 0.75);
  scene.add(hemiLight);

  const sunGeo = new THREE.SphereGeometry(220, 24, 24);
  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffe66d });
  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunMesh.position.copy(sunDir).multiplyScalar(5800);
  scene.add(sunMesh);

  // Destructible orbital asteroids & rogue sentinel drones for ship weapons
  const targets = [];
  const astGeo = new THREE.DodecahedronGeometry(12, 1);
  const droneCoreGeo = new THREE.OctahedronGeometry(7.5, 0);

  for (let i = 0; i < 42; i++) {
    const isDrone = i % 3 === 0;
    const angle = (i / 42) * Math.PI * 2 + (i % 5) * 0.13;
    const bandRadius = 640 + (i % 7) * 240;
    const yOff = Math.sin(i * 1.9) * 140;

    const mat = new THREE.MeshStandardMaterial({
      color: isDrone ? 0xff2a85 : 0x7b6d8d,
      emissive: isDrone ? 0xb5179e : 0x241934,
      emissiveIntensity: isDrone ? 0.85 : 0.25,
      roughness: 0.55,
      flatShading: true
    });

    const mesh = new THREE.Mesh(isDrone ? droneCoreGeo : astGeo, mat);
    const scale = isDrone ? 1.1 : 0.8 + (i % 4) * 0.45;
    mesh.scale.setScalar(scale);
    mesh.position.set(Math.cos(angle) * bandRadius, yOff, Math.sin(angle) * bandRadius);
    scene.add(mesh);

    targets.push({
      mesh,
      isDrone,
      hp: isDrone ? 30 : 40,
      radius: (isDrone ? 9 : 13) * scale,
      orbitRadius: bandRadius,
      orbitAngle: angle,
      orbitSpeed: (isDrone ? 0.028 : 0.009) * (i % 2 === 0 ? 1 : -1),
      yOffset: yOff,
      destroyed: false,
      respawnTimer: 0
    });
  }

  return {
    stars,
    sunLight,
    hemiLight,
    targets
  };
}
