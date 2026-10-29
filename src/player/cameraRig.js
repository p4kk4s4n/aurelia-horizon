import * as THREE from 'three';

/**
 * Pole-safe third-person camera rig for both Explorer (walking on spheres)
 * and Ship (flying in 6DoF space / atmosphere / orbit).
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.currentPos = new THREE.Vector3();
    this.currentLook = new THREE.Vector3();
    this.initialized = false;
  }

  updateForExplorer(explorer, dt) {
    const up = explorer.localUp.clone().normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(explorer.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(explorer.group.quaternion).normalize();

    // Rotate offset by pitch around character's right vector
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, -explorer.pitch);
    const camBack = forward.clone().negate().applyQuaternion(pitchQuat).normalize();

    const dist = explorer.cameraDistance;
    const desiredPos = explorer.group.position
      .clone()
      .addScaledVector(up, 3.2)
      .addScaledVector(camBack, dist);

    const desiredLook = explorer.group.position
      .clone()
      .addScaledVector(up, 2.4)
      .addScaledVector(forward, 6.0);

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
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(shipQuat).normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(shipQuat).normalize();

    const camDist = ship.isBoosting ? 30 : 24;
    const desiredPos = ship.group.position
      .clone()
      .addScaledVector(up, 7.2)
      .addScaledVector(forward, -camDist);

    const desiredLook = ship.group.position
      .clone()
      .addScaledVector(forward, 28)
      .addScaledVector(up, 1.6);

    if (!this.initialized) {
      this.currentPos.copy(desiredPos);
      this.currentLook.copy(desiredLook);
      this.initialized = true;
    } else {
      const alpha = 1 - Math.exp(-12 * dt);
      this.currentPos.lerp(desiredPos, alpha);
      this.currentLook.lerp(desiredLook, alpha);
    }

    this.camera.up.copy(up);
    this.camera.position.copy(this.currentPos);
    this.camera.lookAt(this.currentLook);
  }
}
