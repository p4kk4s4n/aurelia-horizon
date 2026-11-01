import * as THREE from 'three';

/**
 * Planetary Surface Mapping, Equirectangular Projection, and Tactical Mini-Map Avionics.
 * 
 * Features:
 * 1. Forward spherical-to-planar equirectangular projection (3D Cartesian -> Lat/Lon & [0, 1] UV).
 * 2. Reverse projection (Equirectangular UV -> 3D surface position on arbitrary terrain).
 * 3. Tangent plane heading angle calculation avoiding polar gimbal singularities.
 * 4. Local tactical radar projection relative to player heading (compass-oriented rotating radar).
 * 5. Procedurally generated topological basemaps cached per celestial body.
 * 6. Interactive full-screen Tactical Planetary Map Modal with pan, zoom, day/night terminator, and waypoint dropping.
 * 7. Dedicated HUD Planetary Surface Mini-Map with range toggling (300m / 1000m) and terrain elevation contours.
 */

// Sun position constant from sky simulation (Elite Dangerous space lighting)
const SUN_DIR = new THREE.Vector3(1, 0.65, 0.45).normalize();

/**
 * Forward projection: 3D World Cartesian -> Lat/Lon & Equirectangular UV [0, 1]
 */
export function project3DToEquirectangular(pos, bodyCenter) {
  const center = bodyCenter || new THREE.Vector3();
  const rel = new THREE.Vector3().subVectors(pos, center);
  const len = rel.length();
  if (len < 1e-6) {
    return { lat: 0, lon: 0, latRad: 0, lonRad: 0, u: 0.5, v: 0.5, radius: 0 };
  }
  const uDir = rel.clone().divideScalar(len);

  // Latitude phi: -PI/2 (South Pole) to +PI/2 (North Pole)
  const latRad = Math.asin(Math.max(-1, Math.min(1, uDir.y)));
  // Longitude lambda: -PI (180W) to +PI (180E)
  const lonRad = Math.atan2(uDir.x, uDir.z);

  const u = (lonRad + Math.PI) / (2 * Math.PI);
  const v = 0.5 - latRad / Math.PI;

  const latDeg = (latRad * 180) / Math.PI;
  const lonDeg = (lonRad * 180) / Math.PI;

  return { lat: latDeg, lon: lonDeg, latRad, lonRad, u, v, radius: len };
}

/**
 * Reverse projection: Equirectangular UV [0, 1] -> 3D World point on surface
 */
export function projectEquirectangularTo3D(u, v, body) {
  if (!body) return new THREE.Vector3();
  const clampedU = Math.max(0, Math.min(1, u));
  const clampedV = Math.max(0, Math.min(1, v));

  const lonRad = clampedU * 2 * Math.PI - Math.PI;
  const latRad = (0.5 - clampedV) * Math.PI;

  const cosLat = Math.cos(latRad);
  const sinLat = Math.sin(latRad);
  const sinLon = Math.sin(lonRad);
  const cosLon = Math.cos(lonRad);

  const nx = cosLat * sinLon;
  const ny = sinLat;
  const nz = cosLat * cosLon;

  const surfaceR = typeof body.getSurfaceRadiusAtDir === 'function'
    ? body.getSurfaceRadiusAtDir(nx, ny, nz)
    : (body.radius || 100);

  const bodyPos = typeof body.getWorldPosition === 'function'
    ? body.getWorldPosition()
    : (body.group ? body.group.position : new THREE.Vector3());

  return new THREE.Vector3(
    bodyPos.x + nx * surfaceR,
    bodyPos.y + ny * surfaceR,
    bodyPos.z + nz * surfaceR
  );
}

/**
 * Tangent plane heading angle (radians) relative to local planetary North.
 * 0 = North, PI/2 = East, PI = South, -PI/2 = West.
 */
export function computeTangentPlaneHeading(pos, forward, bodyCenter) {
  const center = bodyCenter || new THREE.Vector3();
  const rel = new THREE.Vector3().subVectors(pos, center);
  const len = rel.length();
  if (len < 1e-6) return 0;
  const n = rel.clone().divideScalar(len); // Surface normal

  // Reference pole: default +Y
  let pole = new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.y) > 0.99) {
    pole.set(0, 0, -1);
  }

  // Local North vector tangent to surface
  const poleDotN = pole.dot(n);
  const north = new THREE.Vector3().subVectors(pole, n.clone().multiplyScalar(poleDotN));
  if (north.lengthSq() < 1e-6) return 0;
  north.normalize();

  // Local East vector
  const east = new THREE.Vector3().crossVectors(north, n).normalize();

  // Project forward vector into tangent plane
  const f = forward ? forward.clone().normalize() : new THREE.Vector3(0, 0, -1);
  const fDotN = f.dot(n);
  const fTan = new THREE.Vector3().subVectors(f, n.clone().multiplyScalar(fDotN));
  if (fTan.lengthSq() < 1e-6) return 0;
  fTan.normalize();

  const fNorth = fTan.dot(north);
  const fEast = fTan.dot(east);

  // Angle clockwise from North: atan2(East, North)
  return Math.atan2(fEast, fNorth);
}

/**
 * Local Tactical Radar Projection:
 * Converts a world target position to radar screen (rx, ry) centered on player/ship,
 * oriented to player heading (so player forward is UP).
 */
export function projectToLocalRadar(targetPos, actorPos, actorForward, bodyCenter, scanRange, radarRadius) {
  const center = bodyCenter || new THREE.Vector3();
  const rel = new THREE.Vector3().subVectors(actorPos, center);
  const len = rel.length();
  if (len < 1e-6) return { x: 0, y: 0, dist: 0, inRange: false, bearing: 0, relAngle: 0 };
  const n = rel.clone().divideScalar(len);

  let pole = new THREE.Vector3(0, 1, 0);
  if (Math.abs(n.y) > 0.99) pole.set(0, 0, -1);

  const north = new THREE.Vector3().subVectors(pole, n.clone().multiplyScalar(pole.dot(n))).normalize();
  const east = new THREE.Vector3().crossVectors(north, n).normalize();

  // Actor tangent plane heading
  const f = actorForward ? actorForward.clone().normalize() : new THREE.Vector3(0, 0, -1);
  const fTan = new THREE.Vector3().subVectors(f, n.clone().multiplyScalar(f.dot(n))).normalize();
  const actorHeading = Math.atan2(fTan.dot(east), fTan.dot(north));

  // Target displacement relative to actor
  const delta = new THREE.Vector3().subVectors(targetPos, actorPos);
  // Tangent projection of delta
  const deltaTan = new THREE.Vector3().subVectors(delta, n.clone().multiplyScalar(delta.dot(n)));
  const dist = deltaTan.length();

  const dNorth = deltaTan.dot(north);
  const dEast = deltaTan.dot(east);
  const targetBearing = Math.atan2(dEast, dNorth);

  // Relative bearing so that actor's heading is 0 (UP)
  const relAngle = targetBearing - actorHeading;

  // Normalized distance on radar
  const normDist = dist / scanRange;
  const inRange = normDist <= 1.0;
  const clampedNorm = Math.min(1.0, normDist);

  // Radar screen coordinate: angle 0 is UP (x: 0, y: -r)
  const rx = Math.sin(relAngle) * clampedNorm * radarRadius;
  const ry = -Math.cos(relAngle) * clampedNorm * radarRadius;

  return { x: rx, y: ry, dist, inRange, bearing: targetBearing, relAngle };
}

// Global cached offscreen basemap canvases
const basemapCache = new Map();

/**
 * Generates an equirectangular procedural topological basemap canvas for a given celestial body.
 */
export function generateBasemapTexture(body, width = 512, height = 256) {
  if (!body) return null;
  const key = `${body.id || body.name}_${width}x${height}`;
  if (basemapCache.has(key)) {
    return basemapCache.get(key);
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  const imgData = ctx.createImageData(width, height);
  const data = imgData.data;

  const isMoon = Boolean(body.isMoon);
  const hasOcean = Boolean(body.hasOcean);
  const seaRadius = body.seaLevelRadius || 0;

  for (let y = 0; y < height; y++) {
    const v = y / (height - 1);
    const latRad = (0.5 - v) * Math.PI;
    const cosLat = Math.cos(latRad);
    const sinLat = Math.sin(latRad);

    for (let x = 0; x < width; x++) {
      const u = x / (width - 1);
      const lonRad = u * 2 * Math.PI - Math.PI;
      const sinLon = Math.sin(lonRad);
      const cosLon = Math.cos(lonRad);

      const nx = cosLat * sinLon;
      const ny = sinLat;
      const nz = cosLat * cosLon;

      const r = typeof body.getSurfaceRadiusAtDir === 'function'
        ? body.getSurfaceRadiusAtDir(nx, ny, nz)
        : (body.radius || 100);

      let rgb;
      if (typeof body.sampleBiomeColor === 'function') {
        rgb = body.sampleBiomeColor(nx, ny, nz, r);
      } else {
        rgb = [0.4, 0.4, 0.4];
      }

      // Elevation-based hillshading
      let rElev = r - (body.radius || 100);
      let shade = 1.0;
      if (!isMoon && hasOcean && r < seaRadius) {
        // Deep ocean trench bathymetry shading
        const depth = seaRadius - r;
        const depthFactor = Math.min(1.0, depth / 120.0);
        rgb = [
          rgb[0] * (1.0 - depthFactor * 0.7),
          rgb[1] * (1.0 - depthFactor * 0.5) + 0.05 * (1.0 - depthFactor),
          rgb[2] * (1.0 - depthFactor * 0.3) + 0.18 * (1.0 - depthFactor)
        ];
      } else {
        shade = 0.85 + Math.min(0.35, Math.max(-0.25, rElev / 35.0));
      }

      const pIdx = (y * width + x) * 4;
      data[pIdx] = Math.min(255, Math.max(0, Math.round(rgb[0] * shade * 255)));
      data[pIdx + 1] = Math.min(255, Math.max(0, Math.round(rgb[1] * shade * 255)));
      data[pIdx + 2] = Math.min(255, Math.max(0, Math.round(rgb[2] * shade * 255)));
      data[pIdx + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  basemapCache.set(key, canvas);
  return canvas;
}

/**
 * Dedicated HUD Planetary Surface Mini-Map (Bottom-Left Corner).
 */
export class PlanetaryMiniMap {
  constructor({ container, onOpenFullMap }) {
    this.container = container;
    this.onOpenFullMap = onOpenFullMap;
    this.scanRange = 300; // 300m default, toggles to 1000m
    this.collapsed = false;

    this.panel = document.getElementById('hud-minimap');
    this.canvas = document.getElementById('minimap-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.elTitle = document.getElementById('minimap-title');
    this.btnRange = document.getElementById('btn-minimap-range');
    this.btnExpand = document.getElementById('btn-minimap-expand');
    this.btnToggle = document.getElementById('btn-toggle-minimap');

    this._bindEvents();
  }

  _bindEvents() {
    this.btnRange?.addEventListener('click', () => {
      this.scanRange = this.scanRange === 300 ? 1000 : 300;
      if (this.btnRange) {
        this.btnRange.textContent = `${this.scanRange}m`;
      }
    });

    this.btnExpand?.addEventListener('click', () => {
      if (typeof this.onOpenFullMap === 'function') {
        this.onOpenFullMap();
      }
    });

    this.btnToggle?.addEventListener('click', () => {
      this.collapsed = !this.collapsed;
      if (this.panel) {
        this.panel.classList.toggle('collapsed', this.collapsed);
      }
      if (this.btnToggle) {
        this.btnToggle.textContent = this.collapsed ? '+' : '−';
      }
    });
  }

  update({ actorPos, actorForward, dominantBody, ship, repairSystem, mineralSystem, enemyFaction, customWaypoint }) {
    if (!this.ctx || !this.canvas || this.collapsed) return;
    if (!actorPos || !dominantBody) return;

    const w = this.canvas.width;
    const h = this.canvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const rRadar = w * 0.44;

    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);

    const bodyPos = typeof dominantBody.getWorldPosition === 'function'
      ? dominantBody.getWorldPosition()
      : (dominantBody.group ? dominantBody.group.position : new THREE.Vector3());

    const heading = computeTangentPlaneHeading(actorPos, actorForward, bodyPos);

    // Update title
    if (this.elTitle) {
      const bodyName = dominantBody.name ? dominantBody.name.split(' (')[0].toUpperCase() : 'SURFACE';
      this.elTitle.textContent = `${bodyName} SCANNER`;
    }

    // 1. Radar Circular Background
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, rRadar, 0, Math.PI * 2);
    ctx.clip();

    ctx.fillStyle = 'rgba(6, 14, 28, 0.88)';
    ctx.fillRect(0, 0, w, h);

    // 2. Local Terrain Elevation / Water Contour Rings
    this._drawLocalTerrainContours(ctx, cx, cy, rRadar, actorPos, bodyPos, dominantBody, heading);

    // 3. Concentric Range Rings
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.18)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);

    // 50% range ring
    ctx.beginPath();
    ctx.arc(cx, cy, rRadar * 0.5, 0, Math.PI * 2);
    ctx.stroke();

    // 100% range ring
    ctx.beginPath();
    ctx.arc(cx, cy, rRadar * 0.98, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Crosshairs
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.12)';
    ctx.beginPath();
    ctx.moveTo(cx - rRadar, cy);
    ctx.lineTo(cx + rRadar, cy);
    ctx.moveTo(cx, cy - rRadar);
    ctx.lineTo(cx, cy + rRadar);
    ctx.stroke();

    // 4. Tactical Markers
    // A) Starfighter (Ship)
    if (ship && ship.group) {
      const shipPos = ship.group.position;
      const distToShip = actorPos.distanceTo(shipPos);
      if (distToShip > 1.5) { // Only show if not directly aboard/standing on it
        const proj = projectToLocalRadar(shipPos, actorPos, actorForward, bodyPos, this.scanRange, rRadar);
        this._drawShipMarker(ctx, cx + proj.x, cy + proj.y, proj.inRange, distToShip);
      }
    }

    // B) Ship Repair Components (Aurelia Prime)
    if (repairSystem && repairSystem.parts && !dominantBody.isMoon) {
      repairSystem.parts.forEach((p) => {
        if (!p.collected) {
          const partPos = p.mesh ? p.mesh.position : p.group?.position;
          if (partPos) {
            const proj = projectToLocalRadar(partPos, actorPos, actorForward, bodyPos, this.scanRange, rRadar);
            this._drawPartMarker(ctx, cx + proj.x, cy + proj.y, proj.inRange, p.color || 0x00f5d4);
          }
        }
      });
    }

    // C) Mineral Deposits
    if (mineralSystem && mineralSystem.deposits) {
      mineralSystem.deposits.forEach((dep) => {
        if (dep.body === dominantBody && !dep.depleted) {
          const depPos = typeof dep.getPosition === 'function' ? dep.getPosition() : (dep.group ? dep.group.position : null);
          if (depPos) {
            const proj = projectToLocalRadar(depPos, actorPos, actorForward, bodyPos, this.scanRange, rRadar);
            if (proj.inRange) {
              this._drawMineralMarker(ctx, cx + proj.x, cy + proj.y, dep.type);
            }
          }
        }
      });
    }

    // D) Enemy Outpost / Hive Bases
    if (enemyFaction) {
      if (!dominantBody.isMoon && enemyFaction.outpost && enemyFaction.outpost.group) {
        const outPos = enemyFaction.outpost.group.position;
        const proj = projectToLocalRadar(outPos, actorPos, actorForward, bodyPos, this.scanRange, rRadar);
        this._drawBaseMarker(ctx, cx + proj.x, cy + proj.y, proj.inRange, 'OUTPOST');
      } else if (dominantBody.id === 'goliath' && enemyFaction.goliathBases) {
        enemyFaction.goliathBases.forEach((gb) => {
          const bPos = gb.group ? gb.group.position : (gb.basePos || null);
          if (bPos) {
            const proj = projectToLocalRadar(bPos, actorPos, actorForward, bodyPos, this.scanRange, rRadar);
            this._drawBaseMarker(ctx, cx + proj.x, cy + proj.y, proj.inRange, 'HIVE');
          }
        });
      }
    }

    // E) Custom Waypoint
    if (customWaypoint && customWaypoint.body === dominantBody && customWaypoint.pos) {
      const proj = projectToLocalRadar(customWaypoint.pos, actorPos, actorForward, bodyPos, this.scanRange, rRadar);
      this._drawWaypointMarker(ctx, cx + proj.x, cy + proj.y, proj.inRange, proj.dist);
    }

    // 5. Center Player Chevron & Vision Cone
    this._drawPlayerCenter(ctx, cx, cy);

    ctx.restore();

    // 6. Outer Tactical Bezel & Rotating Compass Cardinal Rim
    this._drawCompassRim(ctx, cx, cy, rRadar, heading);

    // Range scale label
    ctx.fillStyle = 'rgba(0, 245, 212, 0.70)';
    ctx.font = '9px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${this.scanRange}m`, cx + rRadar - 4, cy + rRadar - 4);
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(this.scanRange / 2)}m`, cx + 4, cy - (rRadar * 0.5) + 9);
  }

  _drawLocalTerrainContours(ctx, cx, cy, rRadar, actorPos, bodyPos, dominantBody, heading) {
    if (typeof dominantBody.getSurfaceRadiusAtDir !== 'function') return;

    // Sample radial terrain around the player at current heading
    const rel = new THREE.Vector3().subVectors(actorPos, bodyPos);
    const n = rel.clone().normalize();
    let pole = new THREE.Vector3(0, 1, 0);
    if (Math.abs(n.y) > 0.99) pole.set(0, 0, -1);
    const north = new THREE.Vector3().subVectors(pole, n.clone().multiplyScalar(pole.dot(n))).normalize();
    const east = new THREE.Vector3().crossVectors(north, n).normalize();

    const seaR = dominantBody.seaLevelRadius || 0;
    const hasOcean = Boolean(dominantBody.hasOcean);
    const samples = 16;
    const sampleDist = this.scanRange * 0.65;

    ctx.save();
    for (let i = 0; i < samples; i++) {
      const bearing = (i / samples) * Math.PI * 2;
      const relAngle = bearing - heading;

      const offsetDir = north.clone().multiplyScalar(Math.cos(bearing))
        .add(east.clone().multiplyScalar(Math.sin(bearing))).normalize();

      const samplePos = actorPos.clone().addScaledVector(offsetDir, sampleDist);
      const sDir = samplePos.clone().sub(bodyPos).normalize();
      const sRadius = dominantBody.getSurfaceRadiusAtDir(sDir.x, sDir.y, sDir.z);

      const sx = cx + Math.sin(relAngle) * rRadar * 0.65;
      const sy = cy - Math.cos(relAngle) * rRadar * 0.65;

      if (hasOcean && sRadius < seaR) {
        // Water contour blip
        ctx.fillStyle = 'rgba(8, 145, 178, 0.40)';
        ctx.beginPath();
        ctx.arc(sx, sy, 7, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Land/Ridge contour blip
        ctx.fillStyle = 'rgba(22, 163, 74, 0.20)';
        ctx.beginPath();
        ctx.arc(sx, sy, 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  _drawPlayerCenter(ctx, cx, cy) {
    // Translucent forward vision cone
    const coneGrad = ctx.createRadialGradient(cx, cy, 2, cx, cy - 35, 35);
    coneGrad.addColorStop(0, 'rgba(0, 245, 212, 0.35)');
    coneGrad.addColorStop(1, 'rgba(0, 245, 212, 0.0)');
    ctx.fillStyle = coneGrad;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, 38, -Math.PI / 2 - 0.38, -Math.PI / 2 + 0.38);
    ctx.closePath();
    ctx.fill();

    // Center player chevron pointing UP
    ctx.fillStyle = '#00f5d4';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(cx, cy - 7);
    ctx.lineTo(cx + 5, cy + 5);
    ctx.lineTo(cx, cy + 2);
    ctx.lineTo(cx - 5, cy + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawShipMarker(ctx, x, y, inRange, dist) {
    ctx.fillStyle = inRange ? '#ff9f1c' : 'rgba(255, 159, 28, 0.65)';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    // Delta-wing starfighter icon
    ctx.beginPath();
    ctx.moveTo(x, y - 5);
    ctx.lineTo(x + 5, y + 5);
    ctx.lineTo(x, y + 2);
    ctx.lineTo(x - 5, y + 5);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (inRange) {
      ctx.fillStyle = '#ff9f1c';
      ctx.font = '8px sans-serif';
      ctx.fillText(`${Math.round(dist)}m`, x + 6, y + 3);
    }
  }

  _drawPartMarker(ctx, x, y, inRange, colorHex) {
    const colStr = typeof colorHex === 'string' ? colorHex : `#${colorHex.toString(16).padStart(6, '0')}`;
    ctx.fillStyle = colStr;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;

    // Diamond beacon
    ctx.beginPath();
    ctx.moveTo(x, y - 4);
    ctx.lineTo(x + 4, y);
    ctx.lineTo(x, y + 4);
    ctx.lineTo(x - 4, y);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  _drawMineralMarker(ctx, x, y, type) {
    if (type === 'titanium') ctx.fillStyle = '#4cc9f0';
    else if (type === 'void_crystal') ctx.fillStyle = '#d900ff';
    else ctx.fillStyle = '#f72585';

    ctx.beginPath();
    ctx.arc(x, y, 2.5, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBaseMarker(ctx, x, y, inRange, label) {
    ctx.fillStyle = '#ef4444';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;

    // Hexagonal threat marker
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2;
      const px = x + Math.cos(a) * 5;
      const py = y + Math.sin(a) * 5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    if (inRange) {
      ctx.fillStyle = '#f87171';
      ctx.font = '8px sans-serif';
      ctx.fillText(label, x + 7, y + 3);
    }
  }

  _drawWaypointMarker(ctx, x, y, inRange, dist) {
    // Pulsing tactical waypoint beacon
    ctx.fillStyle = '#eab308';
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    // Flag or pin mast
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x, y - 8);
    ctx.lineTo(x + 5, y - 5);
    ctx.lineTo(x, y - 2);
    ctx.fillStyle = '#fef08a';
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = '8px monospace';
    ctx.fillText(`${Math.round(dist)}m`, x + 7, y + 2);
  }

  _drawCompassRim(ctx, cx, cy, rRadar, heading) {
    // Glowing perimeter bezel
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--hud-primary').trim() || '#00f5d4';
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.arc(cx, cy, rRadar, 0, Math.PI * 2);
    ctx.stroke();

    // Cardinal tick marks & letters: N, E, S, W
    // On rotating radar, North is at angle -heading
    const cardinals = [
      { label: 'N', angle: -heading, color: '#ff2a85', bold: true },
      { label: 'E', angle: -heading + Math.PI / 2, color: primaryColor, bold: false },
      { label: 'S', angle: -heading + Math.PI, color: primaryColor, bold: false },
      { label: 'W', angle: -heading - Math.PI / 2, color: primaryColor, bold: false }
    ];

    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    cardinals.forEach(({ label, angle, color }) => {
      const tx = cx + Math.sin(angle) * (rRadar + 8);
      const ty = cy - Math.cos(angle) * (rRadar + 8);

      ctx.fillStyle = color;
      ctx.fillText(label, tx, ty);

      // Bezel tick
      const bx1 = cx + Math.sin(angle) * (rRadar - 3);
      const by1 = cy - Math.cos(angle) * (rRadar - 3);
      const bx2 = cx + Math.sin(angle) * (rRadar + 2);
      const by2 = cy - Math.cos(angle) * (rRadar + 2);

      ctx.strokeStyle = color;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(bx1, by1);
      ctx.lineTo(bx2, by2);
      ctx.stroke();
    });
  }
}

/**
 * Expandable Full-Screen Tactical Planetary Map Modal.
 */
export class PlanetaryMapModal {
  constructor({ allBodies, onNotice, onWaypointChanged }) {
    this.allBodies = allBodies || [];
    this.onNotice = onNotice;
    this.onWaypointChanged = onWaypointChanged;

    this.isOpen = false;
    this.selectedBody = this.allBodies[0] || null;
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isDragging = false;
    this.dragStart = { x: 0, y: 0 };
    this.customWaypoint = null;

    // Filters
    this.filters = {
      player: true,
      ship: true,
      parts: true,
      minerals: true,
      bases: true,
      waypoint: true
    };

    // DOM Elements
    this.modal = document.getElementById('planetary-map-modal');
    this.canvas = document.getElementById('planetary-map-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;
    this.container = document.getElementById('map-canvas-container');
    this.btnClose = document.getElementById('btn-close-map');
    this.bodyTabsContainer = document.getElementById('map-body-tabs');

    this.elTelemetryBody = document.getElementById('map-telemetry-body');
    this.elTelemetryLat = document.getElementById('map-telemetry-lat');
    this.elTelemetryLon = document.getElementById('map-telemetry-lon');
    this.elTelemetryAlt = document.getElementById('map-telemetry-alt');
    this.elTelemetryBiome = document.getElementById('map-telemetry-biome');
    this.elTelemetryWaypoint = document.getElementById('map-telemetry-waypoint');
    this.elCursorTelemetry = document.getElementById('map-cursor-telemetry');
    this.elTooltip = document.getElementById('map-tooltip');

    this._bindEvents();
  }

  _bindEvents() {
    this.btnClose?.addEventListener('click', () => this.toggle(false));

    this.bodyTabsContainer?.querySelectorAll('.map-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const bodyId = btn.dataset.bodyId;
        const found = this.allBodies.find((b) => (b.id || '').toLowerCase() === bodyId.toLowerCase());
        if (found) {
          this.selectBody(found);
        }
      });
    });

    // Zoom & Reset buttons
    document.getElementById('btn-map-zoom-in')?.addEventListener('click', () => this._adjustZoom(0.35));
    document.getElementById('btn-map-zoom-out')?.addEventListener('click', () => this._adjustZoom(-0.35));
    document.getElementById('btn-map-reset')?.addEventListener('click', () => this.resetView());
    document.getElementById('btn-map-center-player')?.addEventListener('click', () => this.centerOnPlayer());
    document.getElementById('btn-map-clear-waypoint')?.addEventListener('click', () => this.clearWaypoint());

    // Filter toggles
    ['player', 'ship', 'parts', 'minerals', 'bases', 'waypoint'].forEach((fKey) => {
      const chk = document.getElementById(`filter-map-${fKey}`);
      chk?.addEventListener('change', (e) => {
        this.filters[fKey] = e.target.checked;
        this.render();
      });
    });

    // Mouse drag pan & wheel zoom on canvas container
    if (this.container && this.canvas) {
      this.canvas.addEventListener('mousedown', (e) => {
        if (e.button === 0) {
          this.isDragging = true;
          this.dragStart = { x: e.clientX - this.panX, y: e.clientY - this.panY };
        }
      });

      window.addEventListener('mousemove', (e) => {
        if (this.isOpen && this.isDragging) {
          this.panX = e.clientX - this.dragStart.x;
          this.panY = e.clientY - this.dragStart.y;
          this._clampPan();
          this.render();
        }

        if (this.isOpen && this.canvas) {
          const rect = this.canvas.getBoundingClientRect();
          const cx = e.clientX - rect.left;
          const cy = e.clientY - rect.top;
          if (cx >= 0 && cx <= rect.width && cy >= 0 && cy <= rect.height) {
            this._updateCursorTelemetry(cx, cy);
          }
        }
      });

      window.addEventListener('mouseup', (e) => {
        if (this.isDragging) {
          this.isDragging = false;
        }
      });

      this.canvas.addEventListener('wheel', (e) => {
        e.preventDefault();
        const delta = e.deltaY < 0 ? 0.25 : -0.25;
        this._adjustZoom(delta);
      }, { passive: false });

      // Click to set custom waypoint
      this.canvas.addEventListener('click', (e) => {
        if (!this.selectedBody) return;
        const rect = this.canvas.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const clickY = e.clientY - rect.top;

        // Invert pan and zoom
        const mapW = this.canvas.width;
        const mapH = this.canvas.height;
        const scaleX = mapW * this.zoom;
        const scaleY = mapH * this.zoom;

        const imgX = (clickX - (mapW / 2 + this.panX)) / this.zoom + mapW / 2;
        const imgY = (clickY - (mapH / 2 + this.panY)) / this.zoom + mapH / 2;

        if (imgX >= 0 && imgX <= mapW && imgY >= 0 && imgY <= mapH) {
          const u = imgX / mapW;
          const v = imgY / mapH;

          const worldPos = projectEquirectangularTo3D(u, v, this.selectedBody);
          const bodyPos = typeof this.selectedBody.getWorldPosition === 'function'
            ? this.selectedBody.getWorldPosition()
            : (this.selectedBody.group ? this.selectedBody.group.position : new THREE.Vector3());

          const { lat, lon } = project3DToEquirectangular(worldPos, bodyPos);

          this.setWaypoint({
            body: this.selectedBody,
            pos: worldPos,
            lat,
            lon,
            u,
            v
          });

          if (typeof this.onNotice === 'function') {
            this.onNotice(`Custom Tactical Waypoint locked at Lat ${lat.toFixed(1)}°, Lon ${lon.toFixed(1)}°`, 3.5);
          }
        }
      });

      // Right-click clears waypoint
      this.canvas.addEventListener('contextmenu', (e) => {
        e.preventDefault();
        this.clearWaypoint();
      });
    }
  }

  setWaypoint(wp) {
    this.customWaypoint = wp;
    if (this.elTelemetryWaypoint) {
      this.elTelemetryWaypoint.textContent = wp ? `Lat ${wp.lat.toFixed(1)}°, Lon ${wp.lon.toFixed(1)}°` : 'None';
    }
    if (typeof this.onWaypointChanged === 'function') {
      this.onWaypointChanged(this.customWaypoint);
    }
    this.render();
  }

  clearWaypoint() {
    this.customWaypoint = null;
    if (this.elTelemetryWaypoint) {
      this.elTelemetryWaypoint.textContent = 'None';
    }
    if (typeof this.onWaypointChanged === 'function') {
      this.onWaypointChanged(null);
    }
    if (typeof this.onNotice === 'function') {
      this.onNotice('Tactical Waypoint cleared.', 2.0);
    }
    this.render();
  }

  selectBody(body) {
    if (!body) return;
    this.selectedBody = body;
    this.bodyTabsContainer?.querySelectorAll('.map-tab-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.bodyId.toLowerCase() === (body.id || '').toLowerCase());
    });
    this.resetView();
    this.render();
  }

  resetView() {
    this.zoom = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.render();
  }

  _adjustZoom(amount) {
    this.zoom = Math.max(1.0, Math.min(5.0, this.zoom + amount));
    this._clampPan();
    this.render();
  }

  _clampPan() {
    const maxPanX = (this.canvas.width * (this.zoom - 1)) / 2;
    const maxPanY = (this.canvas.height * (this.zoom - 1)) / 2;
    this.panX = Math.max(-maxPanX, Math.min(maxPanX, this.panX));
    this.panY = Math.max(-maxPanY, Math.min(maxPanY, this.panY));
  }

  centerOnPlayer() {
    if (!this.cachedState || !this.cachedState.actorPos || !this.selectedBody) return;
    const bodyPos = typeof this.selectedBody.getWorldPosition === 'function'
      ? this.selectedBody.getWorldPosition()
      : (this.selectedBody.group ? this.selectedBody.group.position : new THREE.Vector3());

    const { u, v } = project3DToEquirectangular(this.cachedState.actorPos, bodyPos);
    const mapW = this.canvas.width;
    const mapH = this.canvas.height;

    this.zoom = Math.max(2.0, this.zoom);
    this.panX = (0.5 - u) * mapW * this.zoom;
    this.panY = (0.5 - v) * mapH * this.zoom;
    this._clampPan();
    this.render();
  }

  toggle(forceState, currentDominantBody) {
    this.isOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;

    if (this.modal) {
      this.modal.classList.toggle('open', this.isOpen);
      this.modal.setAttribute('aria-hidden', this.isOpen ? 'false' : 'true');
    }

    if (this.isOpen) {
      if (document.pointerLockElement) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      document.body.classList.add('modal-open');

      // Auto-select current body if player is orbiting or landed on it
      if (currentDominantBody) {
        this.selectBody(currentDominantBody);
      }
      this.render();
    } else {
      const otherModalOpen = document.getElementById('settings-modal')?.classList.contains('open') ||
        document.getElementById('inventory-modal')?.classList.contains('open');
      if (!otherModalOpen) {
        document.body.classList.remove('modal-open');
      }
    }

    return this.isOpen;
  }

  updateState(state) {
    this.cachedState = state;
    if (this.isOpen) {
      this.render();
    }
  }

  _updateCursorTelemetry(canvasX, canvasY) {
    const mapW = this.canvas.width;
    const mapH = this.canvas.height;
    const imgX = (canvasX - (mapW / 2 + this.panX)) / this.zoom + mapW / 2;
    const imgY = (canvasY - (mapH / 2 + this.panY)) / this.zoom + mapH / 2;

    if (imgX >= 0 && imgX <= mapW && imgY >= 0 && imgY <= mapH) {
      const u = imgX / mapW;
      const v = imgY / mapH;
      const lon = u * 360 - 180;
      const lat = (0.5 - v) * 180;
      if (this.elCursorTelemetry) {
        this.elCursorTelemetry.textContent = `CURSOR: Lat ${lat.toFixed(1)}° | Lon ${lon.toFixed(1)}°`;
      }
    }
  }

  render() {
    if (!this.ctx || !this.canvas || !this.selectedBody) return;
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.clearRect(0, 0, w, h);

    ctx.save();
    // Apply pan and zoom centered on canvas
    ctx.translate(w / 2 + this.panX, h / 2 + this.panY);
    ctx.scale(this.zoom, this.zoom);
    ctx.translate(-w / 2, -h / 2);

    // 1. Draw procedural topological basemap
    const basemap = generateBasemapTexture(this.selectedBody, w, h);
    if (basemap) {
      ctx.drawImage(basemap, 0, 0, w, h);
    } else {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);
    }

    // 2. Day / Night Terminator Shading Overlay
    this._drawDayNightTerminator(ctx, w, h, this.selectedBody);

    // 3. Graticule (Equator, Tropics, Meridians)
    this._drawGraticule(ctx, w, h);

    // 4. Markers
    const state = this.cachedState;
    if (state) {
      const bodyPos = typeof this.selectedBody.getWorldPosition === 'function'
        ? this.selectedBody.getWorldPosition()
        : (this.selectedBody.group ? this.selectedBody.group.position : new THREE.Vector3());

      const isCurrentBody = state.dominantBody === this.selectedBody;

      // A) Enemy Bases / Outposts
      if (this.filters.bases && state.enemyFaction) {
        if (!this.selectedBody.isMoon && state.enemyFaction.outpost) {
          const outPos = state.enemyFaction.outpost.group?.position;
          if (outPos) {
            const { u, v } = project3DToEquirectangular(outPos, bodyPos);
            this._drawModalMarker(ctx, u * w, v * h, '#ef4444', 'OUTPOST BASE');
          }
        } else if (this.selectedBody.id === 'goliath' && state.enemyFaction.goliathBases) {
          state.enemyFaction.goliathBases.forEach((gb, idx) => {
            const bPos = gb.group ? gb.group.position : (gb.basePos || null);
            if (bPos) {
              const { u, v } = project3DToEquirectangular(bPos, bodyPos);
              this._drawModalMarker(ctx, u * w, v * h, '#f43f5e', `HIVE ${idx + 1}`);
            }
          });
        }
      }

      // B) Mineral Deposits
      if (this.filters.minerals && state.mineralSystem && state.mineralSystem.deposits) {
        state.mineralSystem.deposits.forEach((dep) => {
          if (dep.body === this.selectedBody && !dep.depleted) {
            const depPos = typeof dep.getPosition === 'function' ? dep.getPosition() : (dep.group ? dep.group.position : null);
            if (depPos) {
              const { u, v } = project3DToEquirectangular(depPos, bodyPos);
              const col = dep.type === 'titanium' ? '#4cc9f0' : (dep.type === 'void_crystal' ? '#d900ff' : '#f72585');
              ctx.fillStyle = col;
              ctx.beginPath();
              ctx.arc(u * w, v * h, 3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        });
      }

      // C) Ship Components (Aurelia Prime)
      if (this.filters.parts && state.repairSystem && state.repairSystem.parts && !this.selectedBody.isMoon) {
        state.repairSystem.parts.forEach((p, idx) => {
          const partPos = p.mesh ? p.mesh.position : p.group?.position;
          if (partPos) {
            const { u, v } = project3DToEquirectangular(partPos, bodyPos);
            const col = p.collected ? '#10b981' : (p.color ? `#${p.color.toString(16).padStart(6, '0')}` : '#00f5d4');
            ctx.fillStyle = col;
            ctx.strokeStyle = '#ffffff';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(u * w, v * h - 5);
            ctx.lineTo(u * w + 5, v * h);
            ctx.lineTo(u * w, v * h + 5);
            ctx.lineTo(u * w - 5, v * h);
            ctx.closePath();
            ctx.fill();
            ctx.stroke();

            ctx.fillStyle = '#ffffff';
            ctx.font = '9px monospace';
            ctx.fillText(`PART ${idx + 1}`, u * w + 6, v * h + 3);
          }
        });
      }

      // D) Starfighter (Ship)
      if (this.filters.ship && state.ship && state.ship.group) {
        const shipPos = state.ship.group.position;
        const { u, v } = project3DToEquirectangular(shipPos, bodyPos);
        ctx.fillStyle = '#ff9f1c';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(u * w, v * h - 6);
        ctx.lineTo(u * w + 6, v * h + 6);
        ctx.lineTo(u * w, v * h + 3);
        ctx.lineTo(u * w - 6, v * h + 6);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#ff9f1c';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('SHIP', u * w + 7, v * h + 3);
      }

      // E) Player Position & Heading
      if (this.filters.player && isCurrentBody && state.actorPos) {
        const { u, v, lat, lon } = project3DToEquirectangular(state.actorPos, bodyPos);
        const heading = computeTangentPlaneHeading(state.actorPos, state.actorForward, bodyPos);

        // Player directional arrow
        ctx.save();
        ctx.translate(u * w, v * h);
        ctx.rotate(heading);

        // Cyan glow circle
        ctx.fillStyle = 'rgba(0, 245, 212, 0.35)';
        ctx.beginPath();
        ctx.arc(0, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        ctx.fillStyle = '#00f5d4';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.moveTo(0, -7);
        ctx.lineTo(5, 5);
        ctx.lineTo(0, 2);
        ctx.lineTo(-5, 5);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        ctx.restore();

        ctx.fillStyle = '#00f5d4';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('YOU', u * w + 8, v * h + 3);

        // Update telemetry bar
        if (this.elTelemetryBody) this.elTelemetryBody.textContent = this.selectedBody.name.split(' (')[0];
        if (this.elTelemetryLat) this.elTelemetryLat.textContent = `${lat.toFixed(1)}°`;
        if (this.elTelemetryLon) this.elTelemetryLon.textContent = `${lon.toFixed(1)}°`;
        if (this.elTelemetryAlt) this.elTelemetryAlt.textContent = `${Math.round(state.altitude || 0)}m`;
        if (this.elTelemetryBiome) this.elTelemetryBiome.textContent = state.biomeName || 'Surface';
      }

      // F) Custom Waypoint
      if (this.filters.waypoint && this.customWaypoint && this.customWaypoint.body === this.selectedBody) {
        const { u, v } = this.customWaypoint;
        ctx.fillStyle = '#eab308';
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;

        ctx.beginPath();
        ctx.arc(u * w, v * h, 5, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(u * w, v * h);
        ctx.lineTo(u * w, v * h - 10);
        ctx.lineTo(u * w + 6, v * h - 7);
        ctx.lineTo(u * w, v * h - 4);
        ctx.fillStyle = '#fef08a';
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = '#facc15';
        ctx.font = 'bold 9px monospace';
        ctx.fillText('WAYPOINT', u * w + 8, v * h - 4);
      }
    }

    ctx.restore();
  }

  _drawDayNightTerminator(ctx, w, h, body) {
    const bodyPos = typeof body.getWorldPosition === 'function'
      ? body.getWorldPosition()
      : (body.group ? body.group.position : new THREE.Vector3());

    // Sun vector relative to body
    const sunVector = SUN_DIR.clone().normalize();

    // Sample across grid columns
    const cols = 64;
    const rows = 32;
    const colW = w / cols;
    const rowH = h / rows;

    for (let r = 0; r < rows; r++) {
      const v = (r + 0.5) / rows;
      const latRad = (0.5 - v) * Math.PI;
      const cosLat = Math.cos(latRad);
      const sinLat = Math.sin(latRad);

      for (let c = 0; c < cols; c++) {
        const u = (c + 0.5) / cols;
        const lonRad = u * 2 * Math.PI - Math.PI;

        const nx = cosLat * Math.sin(lonRad);
        const ny = sinLat;
        const nz = cosLat * Math.cos(lonRad);

        const dot = nx * sunVector.x + ny * sunVector.y + nz * sunVector.z;
        if (dot < 0.15) {
          const darkFactor = Math.min(0.68, Math.max(0, (-dot + 0.15) * 1.4));
          ctx.fillStyle = `rgba(4, 8, 18, ${darkFactor.toFixed(3)})`;
          ctx.fillRect(c * colW, r * rowH, colW + 0.5, rowH + 0.5);
        }
      }
    }
  }

  _drawGraticule(ctx, w, h) {
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)';
    ctx.lineWidth = 1;

    // Equator
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    // Tropics (+30, -30)
    ctx.setLineDash([4, 4]);
    ctx.beginPath();
    ctx.moveTo(0, h / 3);
    ctx.lineTo(w, h / 3);
    ctx.moveTo(0, (2 * h) / 3);
    ctx.lineTo(w, (2 * h) / 3);
    ctx.stroke();

    // Meridians (-90, 0, +90)
    ctx.beginPath();
    ctx.moveTo(w / 4, 0);
    ctx.lineTo(w / 4, h);
    ctx.moveTo(w / 2, 0);
    ctx.lineTo(w / 2, h);
    ctx.moveTo((3 * w) / 4, 0);
    ctx.lineTo((3 * w) / 4, h);
    ctx.stroke();
    ctx.setLineDash([]);

    // Border
    ctx.strokeStyle = 'rgba(0, 245, 212, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(0, 0, w, h);
  }

  _drawModalMarker(ctx, x, y, color, label) {
    ctx.fillStyle = color;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.2;

    ctx.beginPath();
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = color;
    ctx.font = 'bold 9px monospace';
    ctx.fillText(label, x + 6, y + 3);
  }
}

/**
 * Top-level Orchestrator: Combines Mini-Map, Modal, and Waypoint State.
 */
export class PlanetaryMapSystem {
  constructor({ allBodies, onNotice }) {
    this.allBodies = allBodies || [];
    this.onNotice = onNotice;
    this.customWaypoint = null;

    this.miniMap = new PlanetaryMiniMap({
      onOpenFullMap: () => this.toggleModal(true)
    });

    this.modal = new PlanetaryMapModal({
      allBodies: this.allBodies,
      onNotice: this.onNotice,
      onWaypointChanged: (wp) => {
        this.customWaypoint = wp;
      }
    });
  }

  toggleModal(forceState, currentDominantBody) {
    return this.modal.toggle(forceState, currentDominantBody);
  }

  get isOpen() {
    return this.modal.isOpen;
  }

  update(dt, state) {
    // 1. Update Mini-Map
    this.miniMap.update({
      actorPos: state.actorPos,
      actorForward: state.actorForward,
      dominantBody: state.dominantBody,
      ship: state.ship,
      repairSystem: state.repairSystem,
      mineralSystem: state.mineralSystem,
      enemyFaction: state.enemyFaction,
      customWaypoint: this.customWaypoint
    });

    // 2. Update Modal State
    this.modal.updateState({
      actorPos: state.actorPos,
      actorForward: state.actorForward,
      dominantBody: state.dominantBody,
      altitude: state.altitude,
      biomeName: state.biomeName,
      ship: state.ship,
      repairSystem: state.repairSystem,
      mineralSystem: state.mineralSystem,
      enemyFaction: state.enemyFaction
    });
  }
}
