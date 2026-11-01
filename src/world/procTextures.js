import * as THREE from 'three';

/**
 * Procedural In-Memory PBR Texture Generator for Aurelia Horizon.
 * Hard-Surface Space Sim Realism (Elite Dangerous / Star Citizen aesthetic):
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
 * Procedural Geological Basalt & Silicate Regolith Normal Map
 * Creates stratified rock fractures, impact micro-craters, and weathered stone textures.
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

  function hash(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function noise2D(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;

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
    let a = 0.52;
    let f = 1.0;
    for (let o = 0; o < 5; o++) {
      v += a * noise2D(x * f, y * f);
      f *= 2.12;
      a *= 0.48;
    }
    return v;
  }

  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const nx = (x / size) * 8.0;
      const ny = (y / size) * 8.0;
      // Stratified ridge ridges + micro fissures
      const base = fbm(nx, ny);
      const ridges = Math.abs(fbm(nx * 2.5 + 1.2, ny * 2.5 + 3.4) - 0.5) * 1.6;
      const crag = 1.0 - Math.abs(base - 0.5) * 2.0;
      heights[y * size + x] = base * 0.6 + ridges * 0.25 + crag * 0.15;
    }
  }

  const bumpStrength = 5.2;
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

  const hexScale = 16;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x % hexScale) / hexScale;
      const v = (y % hexScale) / hexScale;

      const weaveX = Math.sin(u * Math.PI * 2) * 0.45;
      const weaveY = Math.cos(v * Math.PI * 2) * 0.45;
      const diag = Math.sin((u + v) * Math.PI * 2) * 0.25;

      const nx = weaveX + diag;
      const ny = weaveY - diag;
      const nz = 1.0;

      const len = Math.hypot(nx, ny, nz) || 1.0;
      const idx = (y * size + x) * 4;
      data[idx] = Math.round(((nx / len) * 0.5 + 0.5) * 255);
      data[idx + 1] = Math.round(((ny / len) * 0.5 + 0.5) * 255);
      data[idx + 2] = Math.round(((nz / len) * 0.5 + 0.5) * 255);
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(8, 8);
  texture.name = 'CarbonFiberNormal';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Aerospace Metal Armor Panels Normal Map (Elite Dangerous military spec)
 * Features precision CNC-milled panel seams, recessed maintenance hatches, expansion grooves, and countersunk rivets.
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
      const isLeft = px <= 2;
      const isRight = px >= panelStep - 3;
      const isTop = py <= 2;
      const isBottom = py >= panelStep - 3;

      if (isLeft || isRight || isTop || isBottom) {
        let nx = 0;
        let ny = 0;
        if (isLeft) nx = -0.75;
        if (isRight) nx = 0.75;
        if (isTop) ny = -0.75;
        if (isBottom) ny = 0.75;

        const len = Math.hypot(nx, ny, 0.75) || 1.0;
        data[idx] = Math.round((nx / len * 0.5 + 0.5) * 255);
        data[idx + 1] = Math.round((ny / len * 0.5 + 0.5) * 255);
        data[idx + 2] = Math.round((0.75 / len * 0.5 + 0.5) * 255);
      }

      // Secondary recessed expansion hatch in upper quadrant
      const isSubHatch = (px >= 18 && px <= 46 && (py === 18 || py === 46)) ||
                         (py >= 18 && py <= 46 && (px === 18 || px === 46));
      if (isSubHatch) {
        data[idx] = 110;
        data[idx + 1] = 110;
        data[idx + 2] = 240;
      }

      // Countersunk flush rivets along panel perimeter
      const isPerimeterRivet = (
        ((px === 8 || px === panelStep - 9) && py % 16 === 8) ||
        ((py === 8 || py === panelStep - 9) && px % 16 === 8)
      );

      if (isPerimeterRivet) {
        const rx = (px % 16) - 8;
        const ry = (py % 16) - 8;
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
 * Creates dual-frequency undulating capillary waves and open-water swell normals.
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

      // Realistic wind wave superposition
      const nx = Math.sin(u * 2.2 + v * 1.4) * 0.38 + Math.sin(u * 5.0 - v * 2.5) * 0.22 + Math.sin(u * 9.0 + v * 7.0) * 0.10;
      const ny = Math.cos(v * 2.2 + u * 1.4) * 0.38 + Math.cos(v * 5.0 - u * 2.5) * 0.22 + Math.cos(v * 9.0 + u * 7.0) * 0.10;
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
 * Procedural Brushed-Metal & Anisotropic Noise Roughness Map
 * Simulates micro-abrasions, CNC grain, and weather erosion on aerospace alloys.
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

  for (let y = 0; y < size; y++) {
    // Subtle horizontal brushed grain across panels
    const grain = Math.sin(y * 1.5) * 12;
    for (let x = 0; x < size; x++) {
      const noise = (Math.random() - 0.5) * 36;
      const val = Math.min(255, Math.max(0, Math.round(110 + grain + noise)));
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.name = 'NoiseRoughness';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Lush Grass Blades & Tufts Diffuse Texture
 * Creates multi-frequency organic grass blade fibers, emerald chlorophyll tones, and rich thatch.
 */
export function createGrassTexture(size = 256) {
  const key = `grass_diffuse_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  function hash(x, y) {
    const n = Math.sin(x * 17.135 + y * 93.719) * 43758.5453;
    return n - Math.floor(n);
  }

  function noise2D(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = hash(ix, iy);
    const n10 = hash(ix + 1, iy);
    const n01 = hash(ix, iy + 1);
    const n11 = hash(ix + 1, iy + 1);
    return (n00 + sx * (n10 - n00)) + sy * ((n01 + sx * (n11 - n01)) - (n00 + sx * (n10 - n00)));
  }

  function fbm(x, y) {
    let v = 0, a = 0.5, f = 1.0;
    for (let o = 0; o < 4; o++) {
      v += a * noise2D(x * f, y * f);
      f *= 2.05;
      a *= 0.5;
    }
    return v;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8.0;
      const v = (y / size) * 8.0;

      // Base soil & broad grass clumping
      const baseNoise = fbm(u, v);
      // Fine-frequency blade striations
      const bladeNoise = Math.sin(u * 14.0 + Math.sin(v * 6.0) * 2.2) * 0.5 + 0.5;
      const microFiber = hash(x, y) * 0.18;

      // Color gradation: deep thatch (dark green-brown) -> rich emerald -> vibrant lime tip
      const mixVal = baseNoise * 0.65 + bladeNoise * 0.25 + microFiber;

      // R: 38 - 85, G: 72 - 165, B: 24 - 65
      const r = Math.round(34 + mixVal * 54);
      const g = Math.round(68 + mixVal * 95);
      const b = Math.round(22 + mixVal * 42);

      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.name = 'GrassDiffuse';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Grass Blade & Foliage Normal Map
 * Creates micro blade height displacement vectors for realistic grazing sunlight response.
 */
export function createGrassNormalMap(size = 256) {
  const key = `grass_normal_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  const heights = new Float32Array(size * size);
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 12.0;
      const v = (y / size) * 12.0;
      const blade = Math.sin(u * 8.0 + Math.sin(v * 3.5) * 2.5) * 0.5 + 0.5;
      const tuft = Math.cos(u * 2.5) * Math.sin(v * 2.5) * 0.5 + 0.5;
      heights[y * size + x] = blade * 0.7 + tuft * 0.3;
    }
  }

  const bumpStrength = 4.5;
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
  texture.repeat.set(16, 16);
  texture.name = 'GrassNormal';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Craggy Granite & Basalt Rock Strata Diffuse Texture
 * Features sedimentary rock layering, fracture lines, quartz mineral specks, and weathered slate grain.
 */
export function createRockTexture(size = 256) {
  const key = `rock_diffuse_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  function hash(x, y) {
    const n = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
    return n - Math.floor(n);
  }

  function noise2D(x, y) {
    const ix = Math.floor(x);
    const iy = Math.floor(y);
    const fx = x - ix;
    const fy = y - iy;
    const sx = fx * fx * (3 - 2 * fx);
    const sy = fy * fy * (3 - 2 * fy);
    const n00 = hash(ix, iy);
    const n10 = hash(ix + 1, iy);
    const n01 = hash(ix, iy + 1);
    const n11 = hash(ix + 1, iy + 1);
    return (n00 + sx * (n10 - n00)) + sy * ((n01 + sx * (n11 - n01)) - (n00 + sx * (n10 - n00)));
  }

  function fbm(x, y) {
    let v = 0, a = 0.52, f = 1.0;
    for (let o = 0; o < 5; o++) {
      v += a * noise2D(x * f, y * f);
      f *= 2.12;
      a *= 0.48;
    }
    return v;
  }

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const u = (x / size) * 8.0;
      const v = (y / size) * 8.0;

      // Stratified geological layers with tectonic waviness
      const strata = Math.sin(v * 3.2 + fbm(u * 1.5, v * 1.5) * 3.5) * 0.5 + 0.5;
      const crackNoise = Math.abs(fbm(u * 2.8 + 1.2, v * 2.8 + 3.4) - 0.5) * 2.0;
      const grain = hash(x, y) * 0.15;

      const rockTone = strata * 0.45 + (1.0 - crackNoise) * 0.4 + grain;

      // Realistic granite/basalt neutral mineral values (100 - 170)
      const r = Math.round(92 + rockTone * 70);
      const g = Math.round(90 + rockTone * 68);
      const b = Math.round(88 + rockTone * 66);

      const idx = (y * size + x) * 4;
      data[idx] = r;
      data[idx + 1] = g;
      data[idx + 2] = b;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(16, 16);
  texture.name = 'RockDiffuse';
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Craggy Rock Normal Map
 * Creates deep stone crevices, fractures, and bevelled crag relief.
 */
export function createRockNormalMap(size = 256) {
  const key = `rock_normal_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  // Utilize the refined basalt normal generator
  const texture = createBasaltNormalMap(size);
  textureCache.set(key, texture);
  return texture;
}

/**
 * Procedural Terrain Roughness Map
 * Organic diffuse response for grass (~0.90) and polished mineral specularity for rock (~0.68).
 */
export function createTerrainRoughnessMap(size = 256) {
  const key = `terrain_roughness_${size}`;
  if (textureCache.has(key)) return textureCache.get(key);

  const canvas = createOffscreenCanvas(size, size);
  if (!canvas) return new THREE.Texture();
  const ctx = canvas.getContext('2d');
  if (!ctx) return new THREE.Texture();

  const imgData = ctx.createImageData(size, size);
  const data = imgData.data;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const grain = Math.sin(x * 0.8) * Math.cos(y * 0.8) * 20;
      const noise = (Math.random() - 0.5) * 30;
      const val = Math.min(255, Math.max(0, Math.round(180 + grain + noise)));
      const idx = (y * size + x) * 4;
      data[idx] = val;
      data[idx + 1] = val;
      data[idx + 2] = val;
      data[idx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.name = 'TerrainRoughness';
  textureCache.set(key, texture);
  return texture;
}
