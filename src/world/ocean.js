import * as THREE from 'three';
import { cubeToSphere } from './cubeSphere.js';

/**
 * Procedural Deep Ocean for Aurelia Prime.
 * Features:
 * - Real per-vertex water depth calculation (seaLevel - terrainHeight)
 * - Dynamic color gradient: shimmering turquoise shallows -> deep abyssal navy
 * - Animated wave displacement vertex shader
 * - Shoreline white water foam edge
 * - Double-sided rendering for underwater swimming views
 */

export function createDeepOceanMesh(body, segments = 80) {
  const seaRadius = body.seaLevelRadius;
  if (!seaRadius) return null;

  // We build a cube-sphere ocean mesh to match the planetary topology perfectly
  const numVertsPerFace = (segments + 1) * (segments + 1);
  const totalVerts = numVertsPerFace * 6;
  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  const depths = new Float32Array(totalVerts); // water depth in meters
  const uvs = new Float32Array(totalVerts * 2);

  const numQuadsPerFace = segments * segments;
  const totalIndices = numQuadsPerFace * 6 * 6;
  const indices = new (totalVerts > 65535 ? Uint32Array : Uint16Array)(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (let face = 0; face < 6; face++) {
    const faceBaseIndex = vOffset;

    for (let j = 0; j <= segments; j++) {
      const v = (j / segments) * 2 - 1;
      for (let i = 0; i <= segments; i++) {
        const u = (i / segments) * 2 - 1;

        let cx = 0, cy = 0, cz = 0;
        if (face === 0) { cx = 1; cy = -v; cz = -u; }
        else if (face === 1) { cx = -1; cy = -v; cz = u; }
        else if (face === 2) { cx = u; cy = 1; cz = v; }
        else if (face === 3) { cx = u; cy = -1; cz = -v; }
        else if (face === 4) { cx = u; cy = -v; cz = 1; }
        else if (face === 5) { cx = -u; cy = -v; cz = -1; }

        const [nx, ny, nz] = cubeToSphere(cx, cy, cz);
        const terrainR = body.getSurfaceRadiusAtDir(nx, ny, nz);
        const depth = Math.max(0, seaRadius - terrainR);

        positions[vOffset * 3] = nx * seaRadius;
        positions[vOffset * 3 + 1] = ny * seaRadius;
        positions[vOffset * 3 + 2] = nz * seaRadius;

        normals[vOffset * 3] = nx;
        normals[vOffset * 3 + 1] = ny;
        normals[vOffset * 3 + 2] = nz;

        depths[vOffset] = depth;
        uvs[vOffset * 2] = i / segments;
        uvs[vOffset * 2 + 1] = j / segments;

        vOffset++;
      }
    }

    const row = segments + 1;
    for (let j = 0; j < segments; j++) {
      for (let i = 0; i < segments; i++) {
        const a = faceBaseIndex + j * row + i;
        const b = faceBaseIndex + (j + 1) * row + i;
        const c = faceBaseIndex + (j + 1) * row + (i + 1);
        const d = faceBaseIndex + j * row + (i + 1);

        indices[iOffset++] = a;
        indices[iOffset++] = b;
        indices[iOffset++] = d;

        indices[iOffset++] = b;
        indices[iOffset++] = c;
        indices[iOffset++] = d;
      }
    }
  }

  const oceanGeo = new THREE.BufferGeometry();
  oceanGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  oceanGeo.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  oceanGeo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  oceanGeo.setAttribute('aDepth', new THREE.BufferAttribute(depths, 1));
  oceanGeo.setIndex(new THREE.BufferAttribute(indices, 1));

  // Custom Shader Material for realistic depth coloring and wave motion
  const oceanUniforms = {
    uTime: { value: 0 },
    uShallowColor: { value: new THREE.Color(0x00f5d4) }, // Vivid alien cyan shallows
    uMidColor: { value: new THREE.Color(0x0077b6) },     // Rich tropical azure
    uDeepColor: { value: new THREE.Color(0x03071e) },    // Abyssal trench navy
    uFoamColor: { value: new THREE.Color(0xffffff) },
    uSunDir: { value: new THREE.Vector3(1, 0.65, 0.45).normalize() }
  };

  const oceanMat = new THREE.ShaderMaterial({
    uniforms: oceanUniforms,
    vertexShader: `
      attribute float aDepth;
      varying float vDepth;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      uniform float uTime;

      void main() {
        vDepth = aDepth;
        vNormal = normalize(normalMatrix * normal);
        vUv = uv;

        // Wave displacements (calmer near shallow shores)
        float waveStrength = smoothstep(0.5, 5.0, aDepth);
        vec3 displacedPos = position;

        float w1 = sin(position.x * 0.08 + uTime * 1.8) * cos(position.z * 0.08 + uTime * 1.5);
        float w2 = sin(position.y * 0.12 + uTime * 2.4) * 0.5;
        float totalWave = (w1 + w2) * 0.45 * waveStrength;

        displacedPos += normal * totalWave;
        vec4 worldP = modelMatrix * vec4(displacedPos, 1.0);
        vWorldPos = worldP.xyz;
        gl_Position = projectionMatrix * viewMatrix * worldP;
      }
    `,
    fragmentShader: `
      varying float vDepth;
      varying vec3 vNormal;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uShallowColor;
      uniform vec3 uMidColor;
      uniform vec3 uDeepColor;
      uniform vec3 uFoamColor;
      uniform vec3 uSunDir;

      void main() {
        // Depth gradient: 0m (shore) -> 6m (shallows) -> 25m (mid) -> 60m+ (deep)
        float shallowFactor = smoothstep(0.0, 7.0, vDepth);
        float deepFactor = smoothstep(6.0, 48.0, vDepth);

        vec3 waterColor = mix(uShallowColor, uMidColor, shallowFactor);
        waterColor = mix(waterColor, uDeepColor, deepFactor);

        // Shoreline white foam pulse
        float foamNoise = sin(vWorldPos.x * 0.35 + uTime * 3.0) * cos(vWorldPos.z * 0.35 + uTime * 2.5);
        float foamThreshold = 0.9 + foamNoise * 0.3;
        float isFoam = step(vDepth, foamThreshold) * (1.0 - step(vDepth, 0.05));
        waterColor = mix(waterColor, uFoamColor, isFoam * 0.75);

        // Specular sun reflection glint
        vec3 N = normalize(vNormal);
        vec3 V = normalize(cameraPosition - vWorldPos);
        vec3 H = normalize(uSunDir + V);
        float spec = pow(max(0.0, dot(N, H)), 64.0) * 0.85;

        // Opacity increases smoothly with water depth
        float alpha = mix(0.68, 0.94, deepFactor);

        gl_FragColor = vec4(waterColor + vec3(spec), alpha);
      }
    `,
    transparent: true,
    side: THREE.DoubleSide,
    depthWrite: true
  });

  const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
  oceanMesh.name = 'ProceduralDeepOcean';

  return {
    mesh: oceanMesh,
    update: (time) => {
      oceanUniforms.uTime.value = time;
    }
  };
}
