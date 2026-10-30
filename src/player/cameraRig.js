import * as THREE from 'three';

/**
 * Pole-safe third-person camera rig for both Explorer (walking/swimming on spheres)
 * and Starfighter (6DoF Newtonian flight with bounded angular lag chase camera).
 */
export class CameraRig {
  constructor(camera) {
    this.camera = camera;
    this.currentPos = new THREE.Vector3();
    this.currentLook = new THREE.Vector3();
    this.shipCamQuat = new THREE.Quaternion();
    this.initialized = false;
    this.shipInitialized = false;
  }

  updateForExplorer(explorer, dt) {
    const up = explorer.localUp.clone().normalize();
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(explorer.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(explorer.group.quaternion).normalize();

    // Rotate offset by pitch around character's right vector
    const pitchQuat = new THREE.Quaternion().setFromAxisAngle(right, -explorer.pitch);
    const camBack = forward.clone().negate().applyQuaternion(pitchQuat).normalize();

    // Slightly closer and higher camera if swimming for dramatic water vistas
    const dist = explorer.isSwimming ? Math.min(explorer.cameraDistance, 18) : explorer.cameraDistance;
    const heightOffset = explorer.isSwimming ? 2.2 : 3.2;

    const desiredPos = explorer.group.position
      .clone()
      .addScaledVector(up, heightOffset)
      .addScaledVector(camBack, dist);

    const desiredLook = explorer.group.position
      .clone()
      .addScaledVector(up, explorer.isSwimming ? 1.4 : 2.4)
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

    if (!this.shipInitialized) {
      this.shipCamQuat.copy(shipQuat);
      this.shipInitialized = true;
    } else {
      // 1. Smoothly slerp camera orientation toward ship orientation
      const smoothAlpha = 1 - Math.exp(-10.5 * dt);
      this.shipCamQuat.slerp(shipQuat, smoothAlpha);

      // 2. Strict angular lag clamp (~26° / 0.45 rad):
      // Prevents hard turns from swinging the starfighter out of frame!
      const dot = THREE.MathUtils.clamp(this.shipCamQuat.dot(shipQuat), -1, 1);
      const angle = 2 * Math.acos(Math.abs(dot));
      const maxLagAngle = 0.45; // 26 degrees max deviation

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
