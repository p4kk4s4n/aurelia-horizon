import * as THREE from 'three';
import { evaluateGravity } from '../world/gravity.js';

/**
 * Third-person Explorer character that walks, sprints, jumps, and jetpack-boosts
 * across any spherical celestial body (planet or moons) with pole-safe quaternion orientation.
 */
export class Explorer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Explorer';

    this._buildPlaceholderCharacter();
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.localUp = new THREE.Vector3(0, 1, 0);
    this.grounded = false;
    this.currentBody = null;
    this.altitude = 0;
    this.walkCycle = 0;
    this.pitch = 0.22; // Camera pitch relative to character frame
    this.cameraDistance = 14;
    this.jetpackFuel = 100;
    this.scannerPulseTimer = 0;
  }

  _buildPlaceholderCharacter() {
    // Stylized sci-fi astronaut placeholder (suit torso, helmet visor, jetpack, limbs)
    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    const suitMat = new THREE.MeshStandardMaterial({
      color: 0xf8f9fa,
      roughness: 0.45,
      metalness: 0.2
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      roughness: 0.4
    });
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.7,
      roughness: 0.15,
      metalness: 0.8
    });

    // Torso
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.55, 1.0, 6, 12), suitMat);
    torso.position.y = 1.65;
    this.visualRoot.add(torso);

    // Helmet
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.52, 14, 12), suitMat);
    helmet.position.y = 2.65;
    this.visualRoot.add(helmet);

    // Visor
    const visor = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.36, 0.45), visorMat);
    visor.position.set(0, 2.66, -0.35);
    this.visualRoot.add(visor);

    // Backpack / Jetpack
    const pack = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.95, 0.48), accentMat);
    pack.position.set(0, 1.75, 0.46);
    this.visualRoot.add(pack);

    // Jetpack flame cone (visible when boosting)
    const flameGeo = new THREE.ConeGeometry(0.28, 0.95, 8);
    flameGeo.rotateX(Math.PI);
    this.jetFlame = new THREE.Mesh(
      flameGeo,
      new THREE.MeshBasicMaterial({ color: 0x00f5d4 })
    );
    this.jetFlame.position.set(0, 1.0, 0.5);
    this.jetFlame.visible = false;
    this.visualRoot.add(this.jetFlame);

    // Limbs for walking animation
    const legGeo = new THREE.CylinderGeometry(0.18, 0.16, 0.95, 8);
    this.leftLeg = new THREE.Mesh(legGeo, accentMat);
    this.leftLeg.position.set(-0.26, 0.52, 0);
    this.rightLeg = new THREE.Mesh(legGeo, accentMat);
    this.rightLeg.position.set(0.26, 0.52, 0);
    this.visualRoot.add(this.leftLeg, this.rightLeg);
  }

  spawnOnBody(body, dirVector = new THREE.Vector3(0, 1, 0)) {
    const dir = dirVector.clone().normalize();
    const surfaceR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
    const bodyPos = body.getWorldPosition();
    this.group.position.copy(bodyPos).addScaledVector(dir, surfaceR + 0.2);

    this.localUp.copy(dir);
    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.group.quaternion.copy(alignQuat);
    this.velocity.set(0, 0, 0);
    this.currentBody = body;
  }

  update(dt, input, mouseFrame, bodies) {
    // 1. Evaluate spherical gravity & dominant body
    const grav = evaluateGravity(this.group.position, bodies);
    const body = grav.body;
    this.currentBody = body;
    this.altitude = Math.max(0, grav.altitude);

    // Ride along with orbiting moon if on or near it
    if (body && body.deltaPosition) {
      this.group.position.add(body.deltaPosition);
    }

    const newUp = new THREE.Vector3(grav.up.x, grav.up.y, grav.up.z).normalize();

    // 2. Align character's local +Y with planet surface normal (pole-safe incremental rotation)
    const currentUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
    const alignDelta = new THREE.Quaternion().setFromUnitVectors(currentUp, newUp);
    this.group.quaternion.premultiply(alignDelta);
    this.group.quaternion.normalize();
    this.localUp.copy(newUp);

    // 3. Mouse yaw (around localUp) + pitch + wheel zoom
    const yawRate = -mouseFrame.dx * 0.0032;
    const keyTurn = (input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0);
    const totalYaw = yawRate + keyTurn * 1.9 * dt;
    if (Math.abs(totalYaw) > 1e-6) {
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(newUp, totalYaw);
      this.group.quaternion.premultiply(yawQuat);
    }

    this.pitch = THREE.MathUtils.clamp(this.pitch + mouseFrame.dy * 0.0026, -0.45, 1.15);
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + mouseFrame.wheel * 1.4, 6, 30);

    // 4. Local forward (-Z) and right (+X) tangent to the sphere
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();

    let moveF = 0;
    let moveR = 0;
    if (input.isDown('KeyW') || input.isDown('ArrowUp')) moveF += 1;
    if (input.isDown('KeyS') || input.isDown('ArrowDown')) moveF -= 1;
    if (input.isDown('KeyD')) moveR += 1;
    if (input.isDown('KeyA')) moveR -= 1;

    const isSprinting = input.isDown('ShiftLeft') || input.isDown('ShiftRight');
    const moveSpeed = isSprinting ? 28 : 16;

    const moveDir = new THREE.Vector3()
      .addScaledVector(forward, moveF)
      .addScaledVector(right, moveR);
    if (moveDir.lengthSq() > 0) moveDir.normalize();

    // Separate velocity into vertical (along localUp) and tangential components
    const vertSpeed = this.velocity.dot(newUp);
    const vertVel = newUp.clone().multiplyScalar(vertSpeed);
    const tangentVel = moveDir.multiplyScalar(moveSpeed);

    this.velocity.copy(tangentVel).add(vertVel);

    // 5. Gravity & Jump / Jetpack Boost
    this.velocity.x += grav.acceleration.x * dt;
    this.velocity.y += grav.acceleration.y * dt;
    this.velocity.z += grav.acceleration.z * dt;

    if (this.grounded && input.wasPressed('Space')) {
      this.velocity.addScaledVector(newUp, 15.5);
      this.grounded = false;
    } else if (!this.grounded && input.isDown('Space') && this.jetpackFuel > 0) {
      // Sci-fi jetpack boost while holding space in mid-air
      this.velocity.addScaledVector(newUp, 38 * dt);
      this.jetpackFuel = Math.max(0, this.jetpackFuel - 34 * dt);
      this.jetFlame.visible = true;
    } else {
      this.jetFlame.visible = false;
      if (this.grounded) {
        this.jetpackFuel = Math.min(100, this.jetpackFuel + 45 * dt);
      }
    }

    // 6. Integrate position & snap to procedural terrain surface
    this.group.position.addScaledVector(this.velocity, dt);

    if (body) {
      const bPos = body.getWorldPosition();
      const rel = this.group.position.clone().sub(bPos);
      const dist = rel.length() || 1;
      const dir = rel.divideScalar(dist);
      const terrainR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
      const minR = Math.max(terrainR, body.seaLevelRadius ? body.seaLevelRadius - 0.6 : terrainR);

      if (dist <= minR + 0.05) {
        this.group.position.copy(bPos).addScaledVector(dir, minR);
        const vDot = this.velocity.dot(dir);
        if (vDot < 0) {
          this.velocity.addScaledVector(dir, -vDot);
        }
        this.grounded = true;
      } else {
        this.grounded = false;
      }
    }

    // 7. Animate walking legs
    const horizSpeed = tangentVel.length();
    if (horizSpeed > 0.5 && this.grounded) {
      this.walkCycle += dt * (isSprinting ? 14 : 9);
      const swing = Math.sin(this.walkCycle) * 0.55;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
    } else {
      this.leftLeg.rotation.x *= 0.85;
      this.rightLeg.rotation.x *= 0.85;
    }

    if (this.scannerPulseTimer > 0) {
      this.scannerPulseTimer = Math.max(0, this.scannerPulseTimer - dt);
    }
  }
}
