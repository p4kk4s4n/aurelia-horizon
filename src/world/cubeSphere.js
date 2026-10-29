import * as THREE from 'three';

/**
 * Cube-Sphere geometry builder with deterministic terrain displacement and biome vertex colors.
 * A cube of 6 faces is subdivided into `segments x segments` per face, spherified using
 * analytical cube-to-sphere mapping (fewer distortions at cube corners), and displaced
 * radially via `heightSampler(nx, ny, nz)`.
 */

// Spherify a point on the unit cube [-1, 1]^3 onto the unit sphere
export function cubeToSphere(x, y, z) {
  const x2 = x * x;
  const y2 = y * y;
  const z2 = z * z;
  const sx = x * Math.sqrt(Math.max(0, 1 - y2 * 0.5 - z2 * 0.5 + (y2 * z2) / 3));
  const sy = y * Math.sqrt(Math.max(0, 1 - z2 * 0.5 - x2 * 0.5 + (z2 * x2) / 3));
  const sz = z * Math.sqrt(Math.max(0, 1 - x2 * 0.5 - y2 * 0.5 + (x2 * y2) / 3));
  const len = Math.hypot(sx, sy, sz) || 1;
  return [sx / len, sy / len, sz / len];
}

export function buildCubeSphereData({
  segments = 48,
  heightSampler,
  colorSampler
}) {
  const faces = [
    // [right, up, forward (face normal)]
    { u: [0, 0, -1], v: [0, 1, 0], w: [1, 0, 0] },   // +X
    { u: [0, 0, 1],  v: [0, 1, 0], w: [-1, 0, 0] },  // -X
    { u: [1, 0, 0],  v: [0, 0, -1], w: [0, 1, 0] },  // +Y
    { u: [1, 0, 0],  v: [0, 0, 1],  w: [0, -1, 0] }, // -Y
    { u: [1, 0, 0],  v: [0, 1, 0],  w: [0, 0, 1] },  // +Z
    { u: [-1, 0, 0], v: [0, 1, 0],  w: [0, 0, -1] }  // -Z
  ];

  const vertsPerFace = (segments + 1) * (segments + 1);
  const totalVerts = vertsPerFace * 6;
  const trisPerFace = segments * segments * 2;
  const totalIndices = trisPerFace * 3 * 6;

  const positions = new Float32Array(totalVerts * 3);
  const colors = new Float32Array(totalVerts * 3);
  const indices = new Uint32Array(totalIndices);

  let vOffset = 0;
  let iOffset = 0;

  for (let f = 0; f < 6; f++) {
    const { u, v, w } = faces[f];
    const baseVertex = f * vertsPerFace;

    for (let iy = 0; iy <= segments; iy++) {
      const ty = (iy / segments) * 2 - 1;
      for (let ix = 0; ix <= segments; ix++) {
        const tx = (ix / segments) * 2 - 1;

        const cx = w[0] + tx * u[0] + ty * v[0];
        const cy = w[1] + tx * u[1] + ty * v[1];
        const cz = w[2] + tx * u[2] + ty * v[2];

        const [nx, ny, nz] = cubeToSphere(cx, cy, cz);
        const radius = heightSampler(nx, ny, nz);

        positions[vOffset] = nx * radius;
        positions[vOffset + 1] = ny * radius;
        positions[vOffset + 2] = nz * radius;

        const [r, g, b] = colorSampler(nx, ny, nz, radius);
        colors[vOffset] = r;
        colors[vOffset + 1] = g;
        colors[vOffset + 2] = b;

        vOffset += 3;
      }
    }

    const row = segments + 1;
    for (let iy = 0; iy < segments; iy++) {
      for (let ix = 0; ix < segments; ix++) {
        const a = baseVertex + iy * row + ix;
        const b = baseVertex + iy * row + (ix + 1);
        const c = baseVertex + (iy + 1) * row + ix;
        const d = baseVertex + (iy + 1) * row + (ix + 1);

        indices[iOffset++] = a;
        indices[iOffset++] = b;
        indices[iOffset++] = d;

        indices[iOffset++] = a;
        indices[iOffset++] = d;
        indices[iOffset++] = c;
      }
    }
  }

  return { positions, colors, indices, totalVerts, totalIndices };
}

export function createCubeSphereMesh(options) {
  const { positions, colors, indices } = buildCubeSphereData(options);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.08,
    flatShading: true
  });

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
