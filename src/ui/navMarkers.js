import * as THREE from 'three';

/**
 * Screen-Space Planetary & Lunar Navigation Markers with Off-Screen Edge Indicators.
 * Features:
 * - On-screen diamond target reticles with body name and distance
 * - Off-screen edge arrows indicating direction to planet and moons
 * - Click / tap to lock target and engage TARGET homing autopilot
 * - Scaled dynamically with --ui-scale
 */

export class NavMarkerSystem {
  constructor(camera, container = document.body) {
    this.camera = camera;
    this.container = container;
    this.markers = new Map();
    this.activeTarget = null;
    this.onSelectTarget = null;

    this.navLayer = document.createElement('div');
    this.navLayer.id = 'hud-nav-markers';
    this.navLayer.className = 'nav-markers-layer';
    this.container.appendChild(this.navLayer);

    this.progradeEl = null;
    this.retrogradeEl = null;
    this._initVectorReticles();
  }

  _initVectorReticles() {
    this.progradeEl = document.createElement('div');
    this.progradeEl.className = 'flight-vector-marker prograde-marker';
    this.progradeEl.innerHTML = '<div class="vector-symbol">&#10753;</div><div class="vector-label">PROGRADE</div>';
    this.navLayer.appendChild(this.progradeEl);

    this.retrogradeEl = document.createElement('div');
    this.retrogradeEl.className = 'flight-vector-marker retrograde-marker';
    this.retrogradeEl.innerHTML = '<div class="vector-symbol">&#8855;</div><div class="vector-label">RETROGRADE</div>';
    this.navLayer.appendChild(this.retrogradeEl);
  }

  setBodies(bodies) {
    this.navLayer.querySelectorAll('.nav-marker').forEach(m => m.remove());
    this.markers.clear();

    bodies.forEach((body, idx) => {
      const el = document.createElement('div');
      el.className = 'nav-marker';
      el.dataset.bodyId = body.id;

      const arrow = document.createElement('div');
      arrow.className = 'nav-arrow';

      const reticle = document.createElement('div');
      reticle.className = 'nav-reticle';

      const label = document.createElement('div');
      label.className = 'nav-label';

      el.appendChild(arrow);
      el.appendChild(reticle);
      el.appendChild(label);

      el.addEventListener('pointerdown', (e) => {
        e.stopPropagation();
        this.selectTarget(body);
      });

      this.navLayer.appendChild(el);
      this.markers.set(body.id, { body, el, arrow, reticle, label });
    });
  }

  selectTarget(body) {
    this.activeTarget = body;
    this.markers.forEach((data) => {
      data.el.classList.toggle('active-target', data.body.id === body.id);
    });
    if (this.onSelectTarget) {
      this.onSelectTarget(body);
    }
  }

  update(actorPos, mode, shipTargetBody = null, ship = null) {
    if (shipTargetBody && this.activeTarget !== shipTargetBody) {
      this.activeTarget = shipTargetBody;
      this.markers.forEach((data) => {
        data.el.classList.toggle('active-target', data.body.id === shipTargetBody.id);
      });
    }

    const w = window.innerWidth;
    const h = window.innerHeight;
    const cx = w / 2;
    const cy = h / 2;

    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();

    // Render Flight Trajectory Vectors (Prograde & Retrograde)
    if (mode === 'PILOTING' && ship && ship.relativeVelocity && ship.relativeVelocity.length() > 2.0 && !ship.landed) {
      const vNorm = ship.relativeVelocity.clone().normalize();
      const pWorld = ship.group.position.clone().addScaledVector(vNorm, 120);
      const rWorld = ship.group.position.clone().addScaledVector(vNorm, -120);

      this._projectVectorMarker(this.progradeEl, pWorld, w, h);
      this._projectVectorMarker(this.retrogradeEl, rWorld, w, h);
    } else {
      if (this.progradeEl) this.progradeEl.style.display = 'none';
      if (this.retrogradeEl) this.retrogradeEl.style.display = 'none';
    }

    this.markers.forEach(({ body, el, arrow, reticle, label }) => {
      const bodyPos = body.getWorldPosition();
      const dist = Math.max(0, actorPos.distanceTo(bodyPos) - body.radius);

      // Hide marker for the body the actor is currently standing on
      if (dist < 40 && mode === 'EXPLORING') {
        el.style.display = 'none';
        return;
      }
      el.style.display = 'block';

      const toBody = bodyPos.clone().sub(this.camera.position);

      const isBehind = camForward.dot(toBody) <= 0;

      // Project into normalized device coordinates [-1, 1]
      const proj = bodyPos.clone().project(this.camera);

      let screenX = (proj.x * 0.5 + 0.5) * w;
      let screenY = (-proj.y * 0.5 + 0.5) * h;

      if (isBehind) {
        // Invert when behind camera plane
        screenX = w - screenX;
        screenY = h - screenY;
      }

      // Check if inside comfortable viewport boundaries (margin 50px)
      const marginX = 55;
      const marginY = 65;
      const onScreen = !isBehind && (screenX >= marginX && screenX <= w - marginX && screenY >= marginY && screenY <= h - marginY);

      const distStr = dist >= 1000 ? `${(dist / 1000).toFixed(1)} km` : `${Math.round(dist)} m`;
      label.textContent = `${body.name.split(' (')[0]} · ${distStr}`;

      if (onScreen) {
        // Direct reticle placed over celestial body
        el.style.transform = `translate3d(${screenX}px, ${screenY}px, 0)`;
        el.classList.remove('off-screen');
        el.classList.add('on-screen');
        arrow.style.display = 'none';
        reticle.style.display = 'block';
      } else {
        // Clamp to screen perimeter and rotate arrow pointer
        el.classList.remove('on-screen');
        el.classList.add('off-screen');
        arrow.style.display = 'block';
        reticle.style.display = 'none';

        // Direction vector from screen center
        let dx = screenX - cx;
        let dy = screenY - cy;
        const len = Math.hypot(dx, dy) || 1;
        dx /= len;
        dy /= len;

        // Bounding box intersection with screen border
        const clampW = w / 2 - marginX;
        const clampH = h / 2 - marginY;

        const scaleX = clampW / Math.max(1e-4, Math.abs(dx));
        const scaleY = clampH / Math.max(1e-4, Math.abs(dy));
        const scale = Math.min(scaleX, scaleY);

        const edgeX = cx + dx * scale;
        const edgeY = cy + dy * scale;

        el.style.transform = `translate3d(${edgeX}px, ${edgeY}px, 0)`;

        // Rotate arrow towards off-screen body
        const angleRad = Math.atan2(dy, dx);
        arrow.style.transform = `rotate(${angleRad}rad)`;
      }
    });
  }

  _projectVectorMarker(el, worldPos, w, h) {
    if (!el) return;
    const toMarker = worldPos.clone().sub(this.camera.position);
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.camera.quaternion).normalize();
    if (camForward.dot(toMarker) <= 0) {
      el.style.display = 'none';
      return;
    }
    const proj = worldPos.clone().project(this.camera);
    const sx = (proj.x * 0.5 + 0.5) * w;
    const sy = (-proj.y * 0.5 + 0.5) * h;
    if (sx < 20 || sx > w - 20 || sy < 20 || sy > h - 20) {
      el.style.display = 'none';
      return;
    }
    el.style.display = 'flex';
    el.style.transform = `translate3d(${sx}px, ${sy}px, 0)`;
  }
}
