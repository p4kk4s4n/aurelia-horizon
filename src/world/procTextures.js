import * as THREE from 'three';

/**
 * Procedural In-Memory PBR Texture Generator for Aurelia Horizon.
 * Generates seamless high-performance normal, roughness, and micro-detail textures
 * directly in memory using HTML5 Canvas. Zero external network payload!
 */

const textureCache = new Map();

function createOffscreenCanvas(width, height) {
  if (typeof document !== 'undefined' && document.createElement) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }
  if (typeof OffscreenCanvas !== 'undefined') {
    return new OffscreenCanvas(width, height);
  }
  return null;
}

/**
 * Procedural Volcanic Basalt Rock Normal Map
 * Creates organic micro-crags, fissures, and rugged rocky relief for terrain.
 */
export function createBasaltNormalMap(size = 256) {
  const key = `basalt_normal_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Simple pseudo-random hash generator for 2D height field
  function hash(x, y) {
    let n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function noise2D(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

    // Smoothstep interpolation
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);

    const n00 = hash(ix, iy);
    const n10 = hash(ix + 1, iy);
    const n01 = hash(ix, iy + 1);
    const n11 = hash(ix + 1, iy + 1);

    const nx0 = n00 + sx * (n10 - n00);
    const nx1 = n01 + sx * (n11 - n01);
    return nx0 + sy * (nx1 - nx0);
  }

  function fbm(x, y) {
    let v = 0;
    let a = 0.55;
    let f = 1.0;
    for (let o = 0; o < 4; o++) {
      v += a * noise2D(x * f, y * f);
      f *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  // Precompute height grid (with seamless wrapping)
  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      // Periodic domain for seamless tiling
      const nx = (x / size) * 8.0;
      const ny = (y / size) * 8.0;
      // Wrap coordinates around 8.0 period
      const h = fbm(nx, ny) + 0.35 * Math.abs(fbm(nx * 2, ny * 2) - 0.5);
      heights[y * size + x] = h;
    }
  }

  // Compute Sobel normal vectors from height field
  const bumpStrength = 4.2;
  for (let y = 0; y < size; y++) {
    const ym = (y - 1 + size) % size;
    const yp = (y + 1) % size;
    for (let x = 0; x < size; x++) {
      const xm = (x - 1 + size) % size;
      const xp = (x + 1) % size;

      const hL = heights[y * size + xm];
      const hR = heights[y * size + xp];
      const hU = heights[ym * size + x];
      const hD = heights[yp * size + x];

      const dx = (hR - hL) * bumpStrength;
      const dy = (hD - hU) * bumpStrength;
      const dz = 1.0;

      const len = Math.hypot(dx, dy, dz) || 1.0;
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = dz / len;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.name = 'BasaltRockNormal';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Carbon-Fiber Weave Normal Map
 * Creates micro-hexagonal / twill composite weave for the Exosuit and Jetpack.
 */
export function createCarbonFiberNormalMap(size = 128) {
  const key = `carbon_normal_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const tileSize = 8;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const tx = (x % tileSize) / tileSize;
      const ty = (y % tileSize) / tileSize;
      const tileX = Math.floor(x / tileSize);
      const tileY = Math.floor(y / tileSize);
      const isAlt = (tileX + tileY) % 2 === 0;

      let dx = 0;
      let dy = 0;
      if (isAlt) {
        // Horizontal weave strand
        dy = Math.sin(ty * Math.PI * 2) * 0.6;
        dx = (tx - 0.5) * 0.35;
      } else {
        // Vertical weave strand
        dx = Math.sin(tx * Math.PI * 2) * 0.6;
        dy = (ty - 0.5) * 0.35;
      }

      const len = Math.hypot(dx, dy, 1.0) || 1.0;
      const nx = -dx / len;
      const ny = -dy / len;
      const nz = 1.0 / len;

      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(12, 12);
  texture.name = 'CarbonFiberNormal';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Sci-Fi Metal Armor Panels Normal Map
 * Creates beveled plating lines, panel seams, and perimeter rivets for Starfighters and Alien Craft.
 */
export function createMetalPanelsNormalMap(size = 256) {
  const key = `metal_panels_normal_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  // Background flat normal is (128, 128, 255) -> (0, 0, 1)
  data.fill(128);
  for (let i = 2; i < data.length; i += 4) {
    data[i] = 255;   // Z normal
    data[i + 1] = 255; // Alpha
  }

  const panelStep = 64;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const px = x % panelStep;
      const py = y % panelStep;
      const idx = (y * size + x) * 4;

      // Beveled seam line around panel borders
      if (px <= 2 || py <= 2 || px >= panelStep - 3 || py >= panelStep - 3) {
        // Seam groove
        const isLeft = px <= 2;
        const isRight = px >= panelStep - 3;
        const isTop = py <= 2;
        const isBottom = py >= panelStep - 3;

        let nx = 0;
        let ny = 0;
        if (isLeft) nx = -0.7;
        if (isRight) nx = 0.7;
        if (isTop) ny = -0.7;
        if (isBottom) ny = 0.7;

        const len = Math.hypot(nx, ny, 0.75) || 1.0;
        data[idx] = Math.round((nx / len * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny / len * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((0.75 / len * 0.5 + 0.5) * 255);
      }

      // Corner rivets
      const isCornerRivet = (
        (Math.abs(px - 8) < 3 && Math.abs(py - 8) < 3) ||
        (Math.abs(px - (panelStep - 8)) < 3 && Math.abs(py - 8) < 3) ||
        (Math.abs(px - 8) < 3 && Math.abs(py - (panelStep - 8)) < 3) ||
        (Math.abs(px - (panelStep - 8)) < 3 && Math.abs(py - (panelStep - 8)) < 3)
      );

      if (isCornerRivet) {
        const rx = (px % 8) - 4;
        const ry = (py % 8) - 4;
        const dist = Math.hypot(rx, ry);
        if (dist < 3.2) {
          const rnx = rx / 3.2 * 0.5;
          const rny = ry / 3.2 * 0.5;
          data[idx] = Math.round((rnx * 0.5 + 0.5) * 255);
          data[idx + 1] = Math.round((rny * 0.5 + 0.5) * 255);
          data[idx + 2] = 230;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(4, 4);
  texture.name = 'MetalPanelsNormal';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Dynamic Ocean Wave Normal Map
 * Creates dual-frequency undulating ripples for water displacement and specular highlights.
 */
export function createWaterNormalMap(size = 256) {
  const key = `water_normal_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * Math.PI * 4;
      const v = (y / size) * Math.PI * 4;

      // Superposition of wave normals
      const nx = Math.sin(u * 2.0 + v * 1.5) * 0.35 + Math.sin(u * 4.0 - v * 2.0) * 0.2;
      const ny = Math.cos(v * 2.0 + u * 1.5) * 0.35 + Math.cos(v * 4.0 - u * 2.0) * 0.2;
      const nz = 1.0;

      const len = Math.hypot(nx, ny, nz) || 1.0;
      const idx = (y * size + x) * 4;
      data[idx] = Math.round((nx / len * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round((ny / len * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round((nz / len * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.name = 'WaterWaveNormal';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Noise Roughness Map
 * Adds subtle surface imperfection to metallic and matte surfaces.
 */
export function createNoiseRoughnessMap(size = 128) {
  const key = `roughness_noise_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const val = 140 + Math.round((Math.random() - 0.5) * 50);
    data[i] = val;
    data[i + 1] = val;
    data[i + 2] = val;
    data[i + 3] = 255;
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.name = 'NoiseRoughness';
  textureCache.set(key, texture);
  return texture;
}
