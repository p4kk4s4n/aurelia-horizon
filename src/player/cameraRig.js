import * as THREE from 'three';

/**
 * Pole-safe camera rig supporting First-Person View (1PV) and Third-Person View (3PV)
 * for Explorer, plus 6DoF bounded angular lag chase camera for Starfighter.
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.currentPos = new THREE.Vector3();
    this.currentLook = new THREE.Vector3();
    this.shipCamQuat = new THREE.Quaternion();
    this.initialized = false;
    this.shipInitialized = false;
    this.firstPerson = false;
  }

  setFirstPerson(enabled, explorer = null) {
    this.firstPerson = Boolean(enabled);
    this.initialized = false;
    if (explorer && typeof explorer.setFirstPersonVisual === 'function') {
      explorer.setFirstPersonVisual(this.firstPerson);
    }
    return this.firstPerson;
  }

  toggleFirstPerson(explorer = null, onNotice = null) {
    this.setFirstPerson(!this.firstPerson, explorer);
    if (onNotice) {
      onNotice(this.firstPerson ? 'Camera View: FIRST-PERSON (Helmet Visor)' : 'Camera View: THIRD-PERSON (Orbital Chase)', 2.5);
    }
    return this.firstPerson;
  }

  getAimRay(explorer) {
    const up = explorer.localUp.clone().normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(explorer.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(explorer.group.quaternion).normalize();
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, -explorer.pitch);
    const aimDir = forward.clone().applyQuaternion(pitchQuat).normalize();

    if (this.firstPerson) {
      const origin = explorer.group.position
        .clone()
        .addScaledVector(up, explorer.isSwimming ? 1.55 : 2.15)
        .addScaledVector(forward, 0.25);
      return { origin, direction: aimDir };
    }

    const origin = explorer.group.position
      .clone()
      .addScaledVector(up, 1.55)
      .addScaledVector(right, 0.35)
      .addScaledVector(forward, 0.45);
    return { origin, direction: aimDir };
  }

  updateForExplorer(explorer, dt) {
    const up = explorer.localUp.clone().normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(explorer.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(explorer.group.quaternion).normalize();
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, -explorer.pitch);

    if (this.firstPerson) {
      if (typeof explorer.setFirstPersonVisual === 'function') {
        explorer.setFirstPersonVisual(true);
      }
      const eyeHeight = explorer.isSwimming ? 1.55 : 2.18;
      const eyePos = explorer.group.position
        .clone()
        .addScaledVector(up, eyeHeight)
        .addScaledVector(forward, 0.24);
      const lookDir = forward.clone().applyQuaternion(pitchQuat).normalize();
      const targetLook = eyePos.clone().addScaledVector(lookDir, 40.0);

      this.currentPos.copy(eyePos);
      this.currentLook.copy(targetLook);
      this.initialized = true;

      this.camera.up.copy(up);
      this.camera.position.copy(this.currentPos);
      this.camera.lookAt(this.currentLook);
      return;
    }

    if (typeof explorer.setFirstPersonVisual === 'function') {
      explorer.setFirstPersonVisual(false);
    }

    const camBack = forward.clone().negate().applyQuaternion(pitchQuat).normalize();
    const dist = explorer.isSwimming ? Math.min(explorer.cameraDistance, 18) : explorer.cameraDistance;
    const heightOffset = explorer.isSwimming ? 2.2 : 3.2;

    const desiredPos = explorer.group.position
      .clone()
      .addScaledVector(up, heightOffset)
      .addScaledVector(camBack, dist);

    const lookDir = forward.clone().applyQuaternion(pitchQuat).normalize();
    const desiredLook = explorer.group.position
      .clone()
      .addScaledVector(up, explorer.isSwimming ? 1.4 : 2.2)
      .addScaledVector(lookDir, 8.0);

    if (!this.initialized) {
      this.currentPos.copy(desiredPos);
      this.currentLook.copy(desiredLook);
      this.initialized = true;
    } else {
      const alpha = 1 - Math.exp(-14 * dt);
      this.currentPos.lerp(desiredPos, alpha);
      this.currentLook.lerp(desiredLook, alpha);
    }

    this.camera.up.copy(up);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }

  updateForShip(ship, dt) {
    const shipQuat = ship.group.quaternion;

    if (!this.shipInitialized) {
      this.shipCamQuat.copy(shipQuat);
      this.shipInitialized = true;
    } else {
      const smoothAlpha = 1 - Math.exp(-10.5 * dt);
      this.shipCamQuat.slerp(shipQuat, smoothAlpha);

      const dot = THREE.MathUtils.clamp(this.shipCamQuat.dot(shipQuat), -1, 1);
      const angle = 2 * Math.acos(Math.abs(dot));
      const maxLagAngle = 0.45;

      if (angle > maxLagAngle) {
        this.shipCamQuat.rotateTowards(shipQuat, angle - maxLagAngle);
      }
    }

    const camUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.shipCamQuat).normalize();
    const camForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.shipCamQuat).normalize();

    const camDist = ship.isBoosting ? 26 : 21;
    const camHeight = 5.4;

    const targetPos = ship.group.position
      .clone()
      .addScaledVector(camUp, camHeight)
      .addScaledVector(camForward, -camDist);

    const targetLook = ship.group.position
      .clone()
      .addScaledVector(camForward, 26)
      .addScaledVector(camUp, 1.3);

    this.currentPos.copy(targetPos);
    this.currentLook.copy(targetLook);

    this.camera.up.copy(camUp);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }
}
