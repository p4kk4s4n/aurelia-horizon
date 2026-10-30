import * as THREE from 'three';

/**
 * Procedural Geometry Toolkit for Aurelia Horizon
 * Zero-dependency helpers for deterministic spline curves, lofted tubes,
 * faceted crystals, and geometry merging.
 */

// Deterministic 32-bit pseudo-random number generator
export function mulberry32(seed) {
  let s = Math.floor(seed) >>> 0;
  return function() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Generate a curved Bézier spline spine with randomized lateral offsets.
 * Produces points along +Y with organic bending/S-curves.
 */
export function bezierSpine(rng, height, bendFactor = 0.35, steps = 10) {
  const angle = rng() * Math.PI * 2;
  const bendDirX = Math.cos(angle);
  const bendDirZ = Math.sin(angle);

  // Control points: base at (0,0,0), tip at height with random lateral displacement
  const maxOffset = height * bendFactor;
  const p0 = new THREE.Vector3(0, 0, 0);
  const p1 = new THREE.Vector3(
    bendDirX * maxOffset * (0.3 + rng() * 0.5),
    height * 0.33,
    bendDirZ * maxOffset * (0.3 + rng() * 0.5)
  );
  // Secondary inflection for S-curve
  const sAngle = angle + (rng() - 0.5) * Math.PI;
  const p2 = new THREE.Vector3(
    p1.x + Math.cos(sAngle) * maxOffset * (0.4 + rng() * 0.6),
    height * 0.66,
    p1.z + Math.sin(sAngle) * maxOffset * (0.4 + rng() * 0.6)
  );
  const p3 = new THREE.Vector3(
    p2.x + Math.cos(angle) * maxOffset * 0.3,
    height,
    p2.z + Math.sin(angle) * maxOffset * 0.3
  );

  const points = [];
  const tangents = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    // Cubic Bézier formula
    const x = mt*mt*mt * p0.x + 3*mt*mt*t * p1.x + 3*mt*t*t * p2.x + t*t*t * p3.x;
    const y = mt*mt*mt * p0.y + 3*mt*mt*t * p1.y + 3*mt*t*t * p2.y + t*t*t * p3.y;
    const z = mt*mt*mt * p0.z + 3*mt*mt*t * p1.z + 3*mt*t*t * p2.z + t*t*t * p3.z;
    points.push(new THREE.Vector3(x, y, z));

    // Tangent derivative
    const tx = 3*mt*mt*(p1.x - p0.x) + 6*mt*t*(p2.x - p1.x) + 3*t*t*(p3.x - p2.x);
    const ty = 3*mt*mt*(p1.y - p0.y) + 6*mt*t*(p2.y - p1.y) + 3*t*t*(p3.y - p2.y);
    const tz = 3*mt*mt*(p1.z - p0.z) + 6*mt*t*(p2.z - p1.z) + 3*t*t*(p3.z - p2.z);
    tangents.push(new THREE.Vector3(tx, ty, tz).normalize());
  }

  return { points, tangents, tip: points[points.length - 1], tipTangent: tangents[tangents.length - 1] };
}

/**
 * Generate a lofted tube mesh geometry along a spine with parallel-transport frames
 * to prevent twisting, with a radial profile function radius(t).
 */
export function tubeAlongSpine(spine, radiusFn, radialSegments = 6) {
  const { points, tangents } = spine;
  const numRings = points.length;
  
  // Compute parallel-transport reference frames
  const normals = [];
  const binormals = [];
  
  // Initial normal perpendicular to tangent[0]
  let initNormal = new THREE.Vector3(1, 0, 0);
  if (Math.abs(tangents[0].dot(initNormal)) > 0.9) {
    initNormal = new THREE.Vector3(0, 0, 1);
  }
  let currentNormal = initNormal.clone().cross(tangents[0]).cross(tangents[0]).negate().normalize();
  normals.push(currentNormal.clone());
  binormals.push(tangents[0].clone().cross(currentNormal).normalize());

  for (let i = 1; i < numRings; i++) {
    const prevT = tangents[i - 1];
    const curT = tangents[i];
    const axis = prevT.clone().cross(curT);
    const dot = THREE.MathUtils.clamp(prevT.dot(curT), -1, 1);
    const angle = Math.acos(dot);
    
    if (axis.lengthSq() > 1e-6 && angle > 1e-5) {
      axis.normalize();
      const q = new THREE.Quaternion().setFromAxisAngle(axis, angle);
      currentNormal.applyQuaternion(q).normalize();
    }
    normals.push(currentNormal.clone());
    binormals.push(curT.clone().cross(currentNormal).normalize());
  }

  const vertices = [];
  const uvs = [];
  const indices = [];

  for (let r = 0; r < numRings; r++) {
    const t = r / (numRings - 1);
    const radius = radiusFn(t);
    const center = points[r];
    const N = normals[r];
    const B = binormals[r];

    for (let s = 0; s <= radialSegments; s++) {
      const theta = (s / radialSegments) * Math.PI * 2;
      const cos = Math.cos(theta);
      const sin = Math.sin(theta);

      const vx = center.x + (N.x * cos + B.x * sin) * radius;
      const vy = center.y + (N.y * cos + B.y * sin) * radius;
      const vz = center.z + (N.z * cos + B.z * sin) * radius;

      vertices.push(vx, vy, vz);
      uvs.push(s / radialSegments, t);
    }
  }

  const stride = radialSegments + 1;
  for (let r = 0; r < numRings - 1; r++) {
    for (let s = 0; s < radialSegments; s++) {
      const a = r * stride + s;
      const b = (r + 1) * stride + s;
      const c = (r + 1) * stride + (s + 1);
      const d = r * stride + (s + 1);

      indices.push(a, b, d);
      indices.push(b, c, d);
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Create a faceted tapered crystal shard geometry pointing along +Y with pointed apex.
 */
export function shardGeometry(length = 2.0, baseRadius = 0.5, taper = 0.25, segments = 6) {
  const vertices = [];
  const indices = [];

  // Base point at (0, 0, 0)
  vertices.push(0, 0, 0); // index 0

  // Ring 1: lower-mid facet
  const y1 = length * 0.2;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2;
    vertices.push(Math.cos(a) * baseRadius, y1, Math.sin(a) * baseRadius);
  }

  // Ring 2: upper facet
  const y2 = length * 0.75;
  const r2 = baseRadius * taper;
  for (let i = 0; i < segments; i++) {
    const a = (i / segments) * Math.PI * 2 + (Math.PI / segments); // slight twist for facet look
    vertices.push(Math.cos(a) * r2, y2, Math.sin(a) * r2);
  }

  // Apex tip point
  const tipIdx = 1 + segments * 2;
  vertices.push(0, length, 0);

  // Bottom cap triangles
  for (let i = 0; i < segments; i++) {
    const cur = 1 + i;
    const nxt = 1 + ((i + 1) % segments);
    indices.push(0, nxt, cur);
  }

  // Mid facet quads
  for (let i = 0; i < segments; i++) {
    const b1 = 1 + i;
    const b2 = 1 + ((i + 1) % segments);
    const t1 = 1 + segments + i;
    const t2 = 1 + segments + ((i + 1) % segments);
    indices.push(b1, b2, t1);
    indices.push(b2, t2, t1);
  }

  // Top tip triangles
  for (let i = 0; i < segments; i++) {
    const t1 = 1 + segments + i;
    const t2 = 1 + segments + ((i + 1) % segments);
    indices.push(t1, t2, tipIdx);
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return geo;
}

/**
 * Merge multiple BufferGeometries into a single BufferGeometry.
 */
export function mergeGeometries(geos) {
  if (!geos || geos.length === 0) return new THREE.BufferGeometry();
  if (geos.length === 1) return geos[0].clone();

  let totalVerts = 0;
  let totalIndices = 0;

  for (const g of geos) {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    totalVerts += nonIndexed.attributes.position.count;
  }

  const positions = new Float32Array(totalVerts * 3);
  const normals = new Float32Array(totalVerts * 3);
  let vOffset = 0;

  for (const g of geos) {
    const nonIndexed = g.index ? g.toNonIndexed() : g;
    const pos = nonIndexed.attributes.position.array;
    const norm = nonIndexed.attributes.normal ? nonIndexed.attributes.normal.array : null;

    positions.set(pos, vOffset * 3);
    if (norm) {
      normals.set(norm, vOffset * 3);
    }
    vOffset += nonIndexed.attributes.position.count;
  }

  const merged = new THREE.BufferGeometry();
  merged.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  merged.setAttribute('normal', new THREE.BufferAttribute(normals, 3));
  return merged;
}
