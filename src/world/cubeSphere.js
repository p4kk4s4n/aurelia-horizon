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
  colorSampler,
  grassSampler
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
  const grassWeights = new Float32Array(totalVerts);
  const uvs = new Float32Array(totalVerts * 2);
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

        const vertIdx = vOffset / 3;
        if (grassSampler) {
          grassWeights[vertIdx] = grassSampler(nx, ny, nz, radius);
        } else {
          // Fallback: green dominant hue detected as grass
          const isGreen = (g > r * 1.05 && g > b * 1.05 && g > 0.18) ? 1.0 : 0.0;
          grassWeights[vertIdx] = isGreen;
        }

        uvs[vertIdx * 2] = ix / segments;
        uvs[vertIdx * 2 + 1] = iy / segments;

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

  return { positions, colors, indices, grassWeights, uvs, totalVerts, totalIndices };
}

export function createCubeSphereMesh(options) {
  const { positions, colors, indices, grassWeights, uvs } = buildCubeSphereData(options);
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  if (grassWeights) {
    geometry.setAttribute('aGrassWeight', new THREE.BufferAttribute(grassWeights, 1));
  }
  if (uvs) {
    geometry.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
  }
  geometry.setIndex(new THREE.BufferAttribute(indices, 1));
  geometry.computeVertexNormals();

  const material = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: options.roughness ?? 0.82,
    metalness: options.metalness ?? 0.08,
    flatShading: options.flatShading ?? false,
    normalMap: options.normalMap || null,
    normalScale: options.normalScale || new THREE.Vector2(0.85, 0.85),
    roughnessMap: options.roughnessMap || null
  });

  // Triplanar Multi-Texture Splatting (Grassy texture on green surfaces, Rocky texture on all others)
  if (options.grassMap || options.rockMap) {
    const grassMap = options.grassMap;
    const grassNormalMap = options.grassNormalMap || options.normalMap;
    const rockMap = options.rockMap;
    const rockNormalMap = options.rockNormalMap || options.normalMap;
    const triplanarScale = options.triplanarScale ?? 0.45;
    const grassScale = options.grassScale ?? triplanarScale;
    const rockScale = options.rockScale ?? (triplanarScale * 0.85);
    const blendSharpness = options.blendSharpness ?? 4.0;

    material.userData.terrainUniforms = {
      uGrassMap: { value: grassMap },
      uGrassNormalMap: { value: grassNormalMap },
      uRockMap: { value: rockMap },
      uRockNormalMap: { value: rockNormalMap },
      uTriplanarScale: { value: triplanarScale },
      uGrassScale: { value: grassScale },
      uRockScale: { value: rockScale },
      uBlendSharpness: { value: blendSharpness }
    };

    material.onBeforeCompile = (shader) => {
      material.userData.shader = shader;
      Object.assign(shader.uniforms, material.userData.terrainUniforms);

      shader.vertexShader = `
        attribute float aGrassWeight;
        varying vec3 vTerrainWorldPos;
        varying vec3 vTerrainObjNormal;
        varying float vTerrainGrassWeight;
      ` + shader.vertexShader;

      shader.vertexShader = shader.vertexShader.replace(
        '#include <begin_vertex>',
        `
        #include <begin_vertex>
        vTerrainWorldPos = (modelMatrix * vec4(transformed, 1.0)).xyz;
        vTerrainObjNormal = normalize(normal);
        vTerrainGrassWeight = aGrassWeight;
        `
      );

      shader.fragmentShader = `
        uniform sampler2D uGrassMap;
        uniform sampler2D uGrassNormalMap;
        uniform sampler2D uRockMap;
        uniform sampler2D uRockNormalMap;
        uniform float uTriplanarScale;
        uniform float uGrassScale;
        uniform float uRockScale;
        uniform float uBlendSharpness;

        varying vec3 vTerrainWorldPos;
        varying vec3 vTerrainObjNormal;
        varying float vTerrainGrassWeight;

        vec4 getTriplanar(sampler2D tex, vec3 pos, vec3 norm, float scale, float sharpness) {
          vec3 uv = pos * scale;
          vec4 cx = texture2D(tex, uv.yz);
          vec4 cy = texture2D(tex, uv.zx);
          vec4 cz = texture2D(tex, uv.xy);
          vec3 w = pow(abs(norm), vec3(sharpness));
          w /= max(0.0001, (w.x + w.y + w.z));
          return cx * w.x + cy * w.y + cz * w.z;
        }
      ` + shader.fragmentShader;

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <color_fragment>',
        `
        #include <color_fragment>
        #if defined(USE_COLOR)
          // Slope attenuation: vertical cliffs expose rock face even in grassy zones
          float cliffFactor = 1.0 - smoothstep(0.48, 0.72, abs(dot(vTerrainObjNormal, normalize(vTerrainWorldPos))));
          float grassFactor = clamp(vTerrainGrassWeight * (1.0 - cliffFactor * 0.85), 0.0, 1.0);

          vec4 gColor = getTriplanar(uGrassMap, vTerrainWorldPos, vTerrainObjNormal, uGrassScale, uBlendSharpness);
          vec4 rColor = getTriplanar(uRockMap, vTerrainWorldPos, vTerrainObjNormal, uRockScale, uBlendSharpness);

          vec3 blendedDetail = mix(rColor.rgb, gColor.rgb, grassFactor);
          diffuseColor.rgb = diffuseColor.rgb * blendedDetail * 1.85;
        #endif
        `
      );

      shader.fragmentShader = shader.fragmentShader.replace(
        '#include <normal_fragment_maps>',
        `
        #include <normal_fragment_maps>
        float cFactor = 1.0 - smoothstep(0.48, 0.72, abs(dot(vTerrainObjNormal, normalize(vTerrainWorldPos))));
        float gFactor = clamp(vTerrainGrassWeight * (1.0 - cFactor * 0.85), 0.0, 1.0);

        vec4 gNorm = getTriplanar(uGrassNormalMap, vTerrainWorldPos, vTerrainObjNormal, uGrassScale, uBlendSharpness);
        vec4 rNorm = getTriplanar(uRockNormalMap, vTerrainWorldPos, vTerrainObjNormal, uRockScale, uBlendSharpness);

        vec3 detailNorm = mix(rNorm.xyz * 2.0 - 1.0, gNorm.xyz * 2.0 - 1.0, gFactor);
        normal = normalize(normal + detailNorm * 0.75);
        `
      );
    };
  }

  const mesh = new THREE.Mesh(geometry, material);
  mesh.receiveShadow = true;
  mesh.castShadow = true;
  return mesh;
}
