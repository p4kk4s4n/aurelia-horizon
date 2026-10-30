import * as THREE from 'three';
import { evaluateGravity } from '../world/gravity.js';

/**
 * Sci-Fi Starfighter with Arcade Flight, Afterburner Boost, Orbit-Hold Assist,
 * Twin Plasma Cannons, and Moon Landing Detection.
 */
export class Ship {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Starfighter';

    this._buildShipMesh();
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.localUp = new THREE.Vector3(0, 1, 0);
    this.currentBody = null;
    this.altitude = 0;
    this.speed = 0;
    this.landed = true;
    this.flightPhase = 'SURFACE (DOCKED)';
    this.orbitAssist = false;
    this.autoLevel = true;

    // Boost & Weapons state
    this.boostEnergy = 100;
    this.isBoosting = false;
    this.weaponHeat = 0;
    this.fireCooldown = 0;
    this.projectiles = [];
    this.explosions = [];
    this.targetsDestroyed = 0;
    this.visitedMoons = new Set();
    this.hullIntegrity = 100;
  }

  _buildShipMesh() {
    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    const hullMat = new THREE.MeshStandardMaterial({
      color: 0xd8e2dc,
      roughness: 0.35,
      metalness: 0.55,
      flatShading: true
    });
    const wingMat = new THREE.MeshStandardMaterial({
      color: 0x2b2d42,
      roughness: 0.45,
      metalness: 0.6,
      flatShading: true
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xff6b35,
      emissive: 0x9e2a2b,
      emissiveIntensity: 0.3,
      roughness: 0.4
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x00bbf9,
      emissive: 0x0077b6,
      emissiveIntensity: 0.5,
      roughness: 0.1,
      metalness: 0.85,
      transparent: true,
      opacity: 0.88
    });

    // Nose & Fuselage (pointing along -Z)
    const noseGeo = new THREE.ConeGeometry(2.1, 7.5, 6);
    noseGeo.rotateX(-Math.PI / 2);
    noseGeo.translate(0, 1.8, -3.2);
    const nose = new THREE.Mesh(noseGeo, hullMat);
    this.visualRoot.add(nose);

    const bodyGeo = new THREE.BoxGeometry(3.6, 1.8, 6.2);
    bodyGeo.translate(0, 1.8, 1.6);
    const bodyMesh = new THREE.Mesh(bodyGeo, hullMat);
    this.visualRoot.add(bodyMesh);

    // Cockpit Canopy
    const canopyGeo = new THREE.BoxGeometry(2.1, 1.25, 3.8);
    canopyGeo.translate(0, 2.75, -0.6);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    this.visualRoot.add(canopy);

    // Swept Wings
    const wingGeo = new THREE.BoxGeometry(11.6, 0.38, 3.4);
    wingGeo.translate(0, 1.6, 1.8);
    const wings = new THREE.Mesh(wingGeo, wingMat);
    this.visualRoot.add(wings);

    // Wingtip Laser Pods
    const podGeo = new THREE.CylinderGeometry(0.32, 0.32, 4.4, 8);
    podGeo.rotateX(Math.PI / 2);
    const leftPod = new THREE.Mesh(podGeo, accentMat);
    leftPod.position.set(-5.5, 1.65, 1.2);
    const rightPod = new THREE.Mesh(podGeo, accentMat);
    rightPod.position.set(5.5, 1.65, 1.2);
    this.visualRoot.add(leftPod, rightPod);

    // Twin Engine Thruster Glow Cones
    const flameGeo = new THREE.ConeGeometry(0.95, 4.2, 10);
    flameGeo.rotateX(Math.PI / 2);
    this.flameMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });
    this.leftFlame = new THREE.Mesh(flameGeo, this.flameMat);
    this.leftFlame.position.set(-1.2, 1.75, 6.4);
    this.rightFlame = new THREE.Mesh(flameGeo, this.flameMat);
    this.rightFlame.position.set(1.2, 1.75, 6.4);
    this.leftFlame.visible = false;
    this.rightFlame.visible = false;
    this.visualRoot.add(this.leftFlame, this.rightFlame);

    // Ship status beacon ring around landing pad
    const beaconGeo = new THREE.TorusGeometry(6.8, 0.16, 8, 36);
    beaconGeo.rotateX(Math.PI / 2);
    this.beaconMat = new THREE.MeshBasicMaterial({ color: 0xff595e });
    this.beaconRing = new THREE.Mesh(beaconGeo, this.beaconMat);
    this.beaconRing.position.y = 0.25;
    this.visualRoot.add(this.beaconRing);
  }

  setRepairedVisual(repaired) {
    this.beaconMat.color.setHex(repaired ? 0x00f5d4 : 0xff595e);
  }

  placeOnBody(body, dirVector = new THREE.Vector3(0.03, 0.998, 0.05)) {
    const dir = dirVector.clone().normalize();
    const surfaceR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
    const bPos = body.getWorldPosition();
    this.group.position.copy(bPos).addScaledVector(dir, surfaceR + 0.35);

    const alignQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.group.quaternion.copy(alignQuat);
    this.localUp.copy(dir);
    this.velocity.set(0, 0, 0);
    this.landed = true;
    this.currentBody = body;
  }

  fireCannons() {
    if (this.fireCooldown > 0) return;
    this.fireCooldown = 0.14;
    this.weaponHeat = Math.min(100, this.weaponHeat + 8);

    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();

    const boltGeo = new THREE.SphereGeometry(0.65, 8, 8);
    boltGeo.scale(0.7, 0.7, 3.8);
    const boltMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4 });

    for (const side of [-5.4, 5.4]) {
      const mesh = new THREE.Mesh(boltGeo, boltMat);
      const spawnPos = this.group.position
        .clone()
        .addScaledVector(right, side)
        .addScaledVector(up, 1.65)
        .addScaledVector(forward, 3.5);

      mesh.position.copy(spawnPos);
      mesh.quaternion.copy(this.group.quaternion);
      this.scene.add(mesh);

      const boltVel = forward.clone().multiplyScalar(420).add(this.velocity);
      this.projectiles.push({
        mesh,
        velocity: boltVel,
        life: 2.4
      });
    }
  }

  _spawnExplosion(pos, colorHex = 0xff9f1c) {
    const geo = new THREE.IcosahedronGeometry(3.2, 1);
    const mat = new THREE.MeshBasicMaterial({
      color: colorHex,
      wireframe: true,
      transparent: true,
      opacity: 1
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.explosions.push({ mesh, age: 0, maxAge: 0.55 });
  }

  updateProjectilesAndTargets(dt, spaceTargets) {
    if (this.fireCooldown > 0) this.fireCooldown = Math.max(0, this.fireCooldown - dt);
    if (this.weaponHeat > 0) this.weaponHeat = Math.max(0, this.weaponHeat - 28 * dt);

    // Update orbital asteroids & drones
    if (spaceTargets) {
      for (const t of spaceTargets) {
        if (t.destroyed) {
          t.respawnTimer -= dt;
          if (t.respawnTimer <= 0) {
            t.destroyed = false;
            t.hp = t.isDrone ? 30 : 40;
            t.mesh.visible = true;
          }
          continue;
        }
        t.orbitAngle += t.orbitSpeed * dt;
        t.mesh.position.set(
          Math.cos(t.orbitAngle) * t.orbitRadius,
          t.yOffset,
          Math.sin(t.orbitAngle) * t.orbitRadius
        );
        t.mesh.rotation.x += dt * 0.8;
        t.mesh.rotation.y += dt * 1.1;
      }
    }

    // Update plasma bolts & hit detection
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      p.life -= dt;
      p.mesh.position.addScaledVector(p.velocity, dt);

      let hit = false;
      if (spaceTargets) {
        for (const t of spaceTargets) {
          if (t.destroyed) continue;
          const dist = p.mesh.position.distanceTo(t.mesh.position);
          if (dist <= t.radius + 4.5) {
            t.hp -= 20;
            hit = true;
            this._spawnExplosion(p.mesh.position, 0x00f5d4);
            if (t.hp <= 0) {
              t.destroyed = true;
              t.respawnTimer = 18;
              t.mesh.visible = false;
              this.targetsDestroyed++;
              this._spawnExplosion(t.mesh.position, t.isDrone ? 0xff2a85 : 0xff9f1c);
            }
            break;
          }
        }
      }

      if (hit || p.life <= 0) {
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Animate explosion bursts
    for (let i = this.explosions.length - 1; i >= 0; i--) {
      const ex = this.explosions[i];
      ex.age += dt;
      const k = ex.age / ex.maxAge;
      ex.mesh.scale.setScalar(1 + k * 5.5);
      ex.mesh.material.opacity = Math.max(0, 1 - k);
      if (ex.age >= ex.maxAge) {
        this.scene.remove(ex.mesh);
        this.explosions.splice(i, 1);
      }
    }
  }

  updateFlight(dt, input, mouseFrame, bodies, onNotice) {
    const grav = evaluateGravity(this.group.position, bodies);
    const body = grav.body;
    this.currentBody = body;
    this.altitude = Math.max(0, grav.altitude);
    const newUp = new THREE.Vector3(grav.up.x, grav.up.y, grav.up.z).normalize();
    this.localUp.copy(newUp);

    // Move with orbiting moon when within its SOI
    if (body && body.isMoon && body.deltaPosition && this.altitude < body.soiRadius) {
      this.group.position.add(body.deltaPosition);
    }

    // Toggle Orbit Assist (O)
    if (input.wasPressed('KeyO')) {
      this.orbitAssist = !this.orbitAssist;
      if (onNotice) {
        onNotice(this.orbitAssist ? 'Arcade Orbit-Assist ENGAGED' : 'Arcade Orbit-Assist OFF');
      }
    }

    // Weapons fire (Left Mouse or F)
    if (input.mouseDown || input.isDown('KeyF')) {
      this.fireCannons();
    }

    // Rotation controls (Mouse Pitch/Yaw + Stick Pitch/Yaw + Q/E Roll)
    const stickPitch = (input.lookVelY || 0) * 1.8 * dt;
    const stickYaw = (input.lookVelX || 0) * 2.2 * dt;
    const pitchInput = -mouseFrame.dy * 0.0028 - stickPitch + ((input.isDown('ArrowDown') ? 1 : 0) - (input.isDown('ArrowUp') ? 1 : 0)) * 1.4 * dt;
    const yawInput = -mouseFrame.dx * 0.0028 - stickYaw + ((input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0)) * 1.4 * dt;
    const rollInput = ((input.isDown('KeyQ') ? 1 : 0) - (input.isDown('KeyR') ? 1 : 0)) * 2.1 * dt;

    if (!this.landed) {
      const rotDelta = new THREE.Quaternion().setFromEuler(
        new THREE.Euler(pitchInput, yawInput, rollInput, 'YXZ')
      );
      this.group.quaternion.multiply(rotDelta);

      // Gentle horizon auto-level when near surface or when Orbit Assist is active
      if (this.altitude < 180 || this.orbitAssist) {
        const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
        const levelQuat = new THREE.Quaternion().setFromUnitVectors(shipUp, newUp);
        const slerpTarget = this.group.quaternion.clone().premultiply(levelQuat);
        this.group.quaternion.slerp(slerpTarget, Math.min(1, dt * (this.orbitAssist ? 4.0 : 1.8)));
      }
      this.group.quaternion.normalize();
    } else {
      // While landed, align cleanly to surface normal and allow yaw turn
      const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();
      const align = new THREE.Quaternion().setFromUnitVectors(shipUp, newUp);
      this.group.quaternion.premultiply(align);
    }

    const shipForward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const shipRight = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();
    const shipUp = new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize();

    // Thrust controls
    let thrustForward = input.moveY || 0;
    let thrustRight = (input.moveX || 0) * 0.75;
    let thrustUp = 0;

    if (input.isDown('KeyW')) thrustForward += 1;
    if (input.isDown('KeyS')) thrustForward -= 0.7;
    if (input.isDown('KeyD')) thrustRight += 0.65;
    if (input.isDown('KeyA')) thrustRight -= 0.65;
    if (input.isDown('Space')) thrustUp += 1;
    if (input.isDown('ControlLeft') || input.isDown('KeyC')) thrustUp -= 0.85;

    // Takeoff from landed state
    if (this.landed && (thrustUp > 0 || thrustForward > 0)) {
      this.landed = false;
      this.velocity.addScaledVector(newUp, 22);
    }

    // Afterburner Boost (Shift)
    const wantsBoost = (input.isDown('ShiftLeft') || input.isDown('ShiftRight')) && !this.landed && (thrustForward > 0.1 || input.isDown('KeyW'));
    if (wantsBoost && this.boostEnergy > 2) {
      this.isBoosting = true;
      this.boostEnergy = Math.max(0, this.boostEnergy - 28 * dt);
    } else {
      this.isBoosting = false;
      this.boostEnergy = Math.min(100, this.boostEnergy + 18 * dt);
    }

    if (!this.landed) {
      const forwardAccel = this.isBoosting ? 240 : 105;
      const verticalAccel = 82;
      const strafeAccel = 55;

      this.velocity.addScaledVector(shipForward, thrustForward * forwardAccel * dt);
      this.velocity.addScaledVector(shipUp, thrustUp * verticalAccel * dt);
      this.velocity.addScaledVector(shipRight, thrustRight * strafeAccel * dt);

      if (this.orbitAssist && body) {
        // Arcade Orbit Assist: hold altitude and cruise tangentially around the body
        const tangent = shipForward.clone().sub(newUp.clone().multiplyScalar(shipForward.dot(newUp)));
        if (tangent.lengthSq() > 0.001) {
          tangent.normalize();
          const orbitSpeed = this.isBoosting ? 185 : 95;
          const desiredVel = tangent.multiplyScalar(orbitSpeed);
          this.velocity.lerp(desiredVel, Math.min(1, dt * 3.5));
        }
      } else {
        // Apply reduced arcade gravity so hovering & orbital injection feel responsive
        const gravScale = this.altitude > 140 ? 0.35 : 0.65;
        this.velocity.x += grav.acceleration.x * gravScale * dt;
        this.velocity.y += grav.acceleration.y * gravScale * dt;
        this.velocity.z += grav.acceleration.z * gravScale * dt;

        // Arcade space damping for tight control
        const damping = Math.exp(-0.55 * dt);
        this.velocity.multiplyScalar(damping);
      }

      this.group.position.addScaledVector(this.velocity, dt);
    } else {
      this.velocity.set(0, 0, 0);
    }

    // Terrain collision & landing check on dominant body
    if (body) {
      const bPos = body.getWorldPosition();
      const rel = this.group.position.clone().sub(bPos);
      const dist = rel.length() || 1;
      const dir = rel.divideScalar(dist);
      const terrainR = body.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
      const surfaceLimit = Math.max(terrainR, body.seaLevelRadius || 0) + 0.4;

      if (dist <= surfaceLimit) {
        const impactSpeed = Math.abs(this.velocity.dot(dir));
        this.group.position.copy(bPos).addScaledVector(dir, surfaceLimit);

        if (impactSpeed > 95) {
          // Hard landing: shield absorbs impact, ship bounces slightly
          this.hullIntegrity = Math.max(20, this.hullIntegrity - 25);
          this.velocity.reflect(dir).multiplyScalar(0.35);
          if (onNotice) onNotice(`Hard Impact (${Math.round(impactSpeed)} m/s)! Slow down below 95 m/s to land.`);
        } else if (thrustUp <= 0) {
          // Successful touchdown!
          this.landed = true;
          this.orbitAssist = false;
          this.velocity.set(0, 0, 0);
          this.hullIntegrity = 100;
          const align = new THREE.Quaternion().setFromUnitVectors(
            new THREE.Vector3(0, 1, 0).applyQuaternion(this.group.quaternion).normalize(),
            dir
          );
          this.group.quaternion.premultiply(align);

          if (body.isMoon && !this.visitedMoons.has(body.id)) {
            this.visitedMoons.add(body.id);
            if (onNotice) onNotice(`LANDED ON ${body.name.toUpperCase()}! (${this.visitedMoons.size}/3 Moons Explored)`);
          }
        }
      }
    }

    this.speed = this.velocity.length();

    // Update engine flame visuals
    const thrustActive = !this.landed && (Math.abs(thrustForward) > 0.05 || thrustUp > 0.05 || this.isBoosting || this.orbitAssist);
    this.leftFlame.visible = thrustActive;
    this.rightFlame.visible = thrustActive;
    if (thrustActive) {
      const flameScale = this.isBoosting ? 2.2 : 1.0 + Math.sin(performance.now() * 0.03) * 0.15;
      this.leftFlame.scale.set(1, 1, flameScale);
      this.rightFlame.scale.set(1, 1, flameScale);
      this.flameMat.color.setHex(this.isBoosting ? 0xff9f1c : 0x00f5d4);
    }

    // Update Flight Phase label
    if (this.landed) {
      this.flightPhase = body && body.isMoon ? `LANDED (${body.name})` : 'SURFACE (LANDED)';
    } else if (body && body.isMoon && this.altitude < 90) {
      this.flightPhase = `MOON APPROACH (${body.name})`;
    } else if (body && !body.isMoon && this.altitude < body.atmosphereHeight) {
      this.flightPhase = 'ATMOSPHERE FLIGHT';
    } else if (this.orbitAssist) {
      this.flightPhase = `STABLE ORBIT (${body ? body.name : 'SPACE'})`;
    } else {
      this.flightPhase = 'DEEP SPACE / ORBITAL TRANSFER';
    }
  }
}
