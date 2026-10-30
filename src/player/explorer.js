import * as THREE from 'three';
import { evaluateGravity } from '../world/gravity.js';

/**
 * Third-person Explorer character with faithfully modeled low-poly sci-fi spacesuit:
 * - Helmet with sagittal crown crest, dark faceted visor, temple pods & collar seal
 * - Armored torso with off-white breastplate, dark harness & groin armor
 * - Crystalline Jetpack Power Core: vertical hexagonal bipyramid crystal, dark bracket & 4 cyan conduit cables
 * - Floating companion drone / crystal familiar hovering beside shoulder
 * - Articulated arms (with wrist console on left gauntlet) & legs with knee pads and boots
 */
export class Explorer {
  constructor(scene) {
    this.scene = scene;
    this.group = new THREE.Group();
    this.group.name = 'Explorer';

    this._buildCharacterFromSheet();
    scene.add(this.group);

    this.velocity = new THREE.Vector3();
    this.localUp = new THREE.Vector3(0, 1, 0);
    this.grounded = false;
    this.currentBody = null;
    this.altitude = 0;
    this.walkCycle = 0;
    this.animTime = 0;
    this.pitch = 0.22; // Camera pitch relative to character frame
    this.cameraDistance = 14;
    this.jetpackFuel = 100;
    this.scannerPulseTimer = 0;
  }

  _buildCharacterFromSheet() {
    this.visualRoot = new THREE.Group();
    this.group.add(this.visualRoot);

    // 1. Materials Palette matching concept character sheet
    // Bone / Off-White Primary Armor
    const armorMat = new THREE.MeshStandardMaterial({
      color: 0xd8dad3,
      roughness: 0.58,
      metalness: 0.12,
      flatShading: true
    });

    // Dark Slate / Charcoal Harness, Joints & Undersuit
    const darkMat = new THREE.MeshStandardMaterial({
      color: 0x2c353b,
      roughness: 0.68,
      metalness: 0.22,
      flatShading: true
    });

    // Faceted Dark Teal-Slate Visor Plate
    const visorMat = new THREE.MeshStandardMaterial({
      color: 0x16242c,
      emissive: 0x08151c,
      roughness: 0.22,
      metalness: 0.82,
      flatShading: true
    });

    // Glowing Cyan Crystal Power Core
    this.crystalMat = new THREE.MeshStandardMaterial({
      color: 0x00f5d4,
      emissive: 0x00bbf9,
      emissiveIntensity: 0.92,
      roughness: 0.18,
      metalness: 0.35,
      flatShading: true
    });

    // Glowing Neon Conduit Cable Material
    const conduitMat = new THREE.MeshBasicMaterial({
      color: 0x00f5d4
    });

    // Wrist Communicator Screen / Status Accent
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0x48cae4,
      emissive: 0x0096c7,
      emissiveIntensity: 0.6,
      roughness: 0.3,
      flatShading: true
    });

    // Boot Soles
    const soleMat = new THREE.MeshStandardMaterial({
      color: 0x1c2227,
      roughness: 0.88,
      flatShading: true
    });

    // Crest Material (slight warm tint matching the crown ridge)
    const crestMat = new THREE.MeshStandardMaterial({
      color: 0xc4c8bf,
      roughness: 0.6,
      flatShading: true
    });

    // 2. Torso & Abdomen
    this.torso = new THREE.Group();
    this.torso.position.y = 1.55;
    this.visualRoot.add(this.torso);

    // Chest Breastplate (faceted upper torso)
    const chestGeo = new THREE.CylinderGeometry(0.44, 0.36, 0.62, 7);
    chestGeo.rotateY(Math.PI / 7);
    const chestMesh = new THREE.Mesh(chestGeo, armorMat);
    chestMesh.position.y = 0.28;
    this.torso.add(chestMesh);

    // Dark shoulder straps / collar armor
    const strapGeo = new THREE.BoxGeometry(0.78, 0.16, 0.44);
    const strapMesh = new THREE.Mesh(strapGeo, darkMat);
    strapMesh.position.set(0, 0.54, 0);
    this.torso.add(strapMesh);

    // Abdomen & Spine Flex Joint (dark midsection)
    const midriffGeo = new THREE.CylinderGeometry(0.32, 0.34, 0.36, 6);
    const midriffMesh = new THREE.Mesh(midriffGeo, darkMat);
    midriffMesh.position.y = -0.15;
    this.torso.add(midriffMesh);

    // Belt Ring with side buckle clips
    const beltGeo = new THREE.CylinderGeometry(0.36, 0.36, 0.12, 8);
    const beltMesh = new THREE.Mesh(beltGeo, darkMat);
    beltMesh.position.y = -0.32;
    this.torso.add(beltMesh);

    // Pelvis Armor
    const pelvisGeo = new THREE.CylinderGeometry(0.35, 0.28, 0.28, 6);
    const pelvisMesh = new THREE.Mesh(pelvisGeo, armorMat);
    pelvisMesh.position.y = -0.50;
    this.torso.add(pelvisMesh);

    // Dark triangular groin armor plate in front
    const groinGeo = new THREE.ConeGeometry(0.18, 0.28, 3);
    groinGeo.rotateX(Math.PI);
    const groinMesh = new THREE.Mesh(groinGeo, darkMat);
    groinMesh.position.set(0, -0.48, -0.24);
    this.torso.add(groinMesh);

    // 3. Head & Helmet
    this.head = new THREE.Group();
    this.head.position.y = 0.76;
    this.torso.add(this.head);

    // Collar seal ring
    const collarGeo = new THREE.TorusGeometry(0.24, 0.05, 6, 12);
    collarGeo.rotateX(Math.PI / 2);
    const collarMesh = new THREE.Mesh(collarGeo, darkMat);
    collarMesh.position.y = -0.12;
    this.head.add(collarMesh);

    // Helmet Dome
    const domeGeo = new THREE.SphereGeometry(0.38, 9, 7);
    domeGeo.scale(0.95, 1.05, 1.05);
    const domeMesh = new THREE.Mesh(domeGeo, armorMat);
    this.head.add(domeMesh);

    // Crown Crest (sagittal crest ridge sweeping over the crown)
    const crestGroup = new THREE.Group();
    const crestSeg1 = new THREE.Mesh(new THREE.ConeGeometry(0.09, 0.35, 4), crestMat);
    crestSeg1.rotation.set(Math.PI * 0.35, 0, 0);
    crestSeg1.position.set(0, 0.35, 0.05);

    const crestSeg2 = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.32, 4), crestMat);
    crestSeg2.rotation.set(Math.PI * 0.18, 0, 0);
    crestSeg2.position.set(0, 0.38, -0.12);

    const crestSeg3 = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.18, 0.48), crestMat);
    crestSeg3.position.set(0, 0.32, -0.04);

    crestGroup.add(crestSeg1, crestSeg2, crestSeg3);
    this.head.add(crestGroup);

    // Dark Faceted Visor Plate (angled front faceplate)
    const visorGeo = new THREE.BoxGeometry(0.44, 0.28, 0.28);
    const visorMesh = new THREE.Mesh(visorGeo, visorMat);
    visorMesh.position.set(0, 0.02, -0.24);
    visorMesh.rotation.x = -0.16;
    this.head.add(visorMesh);

    // Visor chin guard / lower jaw rim
    const chinGeo = new THREE.BoxGeometry(0.34, 0.12, 0.26);
    const chinMesh = new THREE.Mesh(chinGeo, darkMat);
    chinMesh.position.set(0, -0.16, -0.22);
    this.head.add(chinMesh);

    // Temple Sensor Pods (left & right ears)
    const podGeo = new THREE.OctahedronGeometry(0.09, 0);
    podGeo.scale(0.8, 1.2, 1.0);
    const leftPod = new THREE.Mesh(podGeo, darkMat);
    leftPod.position.set(-0.36, 0.02, 0);
    const rightPod = new THREE.Mesh(podGeo, darkMat);
    rightPod.position.set(0.36, 0.02, 0);
    this.head.add(leftPod, rightPod);

    // 4. Backpack Power Core ("Crystalline Jetpack")
    this.jetpack = new THREE.Group();
    this.jetpack.position.set(0, 0.22, 0.32);
    this.torso.add(this.jetpack);

    // Dark mounting frame / bracket
    const frameGeo = new THREE.BoxGeometry(0.46, 0.62, 0.22);
    const frameMesh = new THREE.Mesh(frameGeo, darkMat);
    this.jetpack.add(frameMesh);

    // Dual vertical glowing cyan power bars on the frame back
    const barGeo = new THREE.BoxGeometry(0.035, 0.46, 0.02);
    const leftBar = new THREE.Mesh(barGeo, conduitMat);
    leftBar.position.set(-0.14, 0, 0.115);
    const rightBar = new THREE.Mesh(barGeo, conduitMat);
    rightBar.position.set(0.14, 0, 0.115);
    this.jetpack.add(leftBar, rightBar);

    // Vertical Hexagonal Crystal Bipyramid
    const crystalGroup = new THREE.Group();
    crystalGroup.position.set(0, 0, 0.06);

    const hexShaftGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.65, 6);
    const hexShaft = new THREE.Mesh(hexShaftGeo, this.crystalMat);

    const hexTopGeo = new THREE.ConeGeometry(0.18, 0.38, 6);
    const hexTop = new THREE.Mesh(hexTopGeo, this.crystalMat);
    hexTop.position.y = 0.515;

    const hexBottomGeo = new THREE.ConeGeometry(0.18, 0.38, 6);
    hexBottomGeo.rotateX(Math.PI);
    const hexBottom = new THREE.Mesh(hexBottomGeo, this.crystalMat);
    hexBottom.position.y = -0.515;

    crystalGroup.add(hexShaft, hexTop, hexBottom);
    this.crystalCore = crystalGroup;
    this.jetpack.add(crystalGroup);

    // 4 Curved Glowing Conduit Cables (looping from crystal casing around to character ribs)
    const buildConduitCurve = (p0, p1, p2) => {
      const curve = new THREE.QuadraticBezierCurve3(p0, p1, p2);
      const tubeGeo = new THREE.TubeGeometry(curve, 8, 0.022, 5, false);
      return new THREE.Mesh(tubeGeo, conduitMat);
    };

    // Upper left & right cables
    const cableUL = buildConduitCurve(
      new THREE.Vector3(-0.16, 0.18, 0.06),
      new THREE.Vector3(-0.36, 0.12, -0.05),
      new THREE.Vector3(-0.28, 0.04, -0.22)
    );
    const cableUR = buildConduitCurve(
      new THREE.Vector3(0.16, 0.18, 0.06),
      new THREE.Vector3(0.36, 0.12, -0.05),
      new THREE.Vector3(0.28, 0.04, -0.22)
    );
    // Lower left & right cables
    const cableLL = buildConduitCurve(
      new THREE.Vector3(-0.16, -0.16, 0.06),
      new THREE.Vector3(-0.38, -0.22, -0.05),
      new THREE.Vector3(-0.24, -0.25, -0.22)
    );
    const cableLR = buildConduitCurve(
      new THREE.Vector3(0.16, -0.16, 0.06),
      new THREE.Vector3(0.38, -0.22, -0.05),
      new THREE.Vector3(0.24, -0.25, -0.22)
    );
    this.jetpack.add(cableUL, cableUR, cableLL, cableLR);

    // Dual Jetpack Thruster Nozzles & Boost Flames
    const nozzleGeo = new THREE.CylinderGeometry(0.08, 0.06, 0.18, 6);
    nozzleGeo.rotateX(Math.PI);
    const leftNozzle = new THREE.Mesh(nozzleGeo, darkMat);
    leftNozzle.position.set(-0.14, -0.42, 0);
    const rightNozzle = new THREE.Mesh(nozzleGeo, darkMat);
    rightNozzle.position.set(0.14, -0.42, 0);
    this.jetpack.add(leftNozzle, rightNozzle);

    const flameGeo = new THREE.ConeGeometry(0.14, 0.85, 8);
    flameGeo.rotateX(Math.PI);
    const flameMat = new THREE.MeshBasicMaterial({ color: 0x00f5d4, transparent: true, opacity: 0.9 });

    this.jetFlameLeft = new THREE.Mesh(flameGeo, flameMat);
    this.jetFlameLeft.position.set(-0.14, -0.92, 0);
    this.jetFlameLeft.visible = false;

    this.jetFlameRight = new THREE.Mesh(flameGeo, flameMat);
    this.jetFlameRight.position.set(0.14, -0.92, 0);
    this.jetFlameRight.visible = false;

    this.jetpack.add(this.jetFlameLeft, this.jetFlameRight);

    // 5. Floating Companion Drone ("Hovering Crystal Familiar")
    this.companionDrone = new THREE.Group();
    this.companionDrone.position.set(0.62, 2.38, -0.18);
    this.visualRoot.add(this.companionDrone);

    const droneCoreGeo = new THREE.OctahedronGeometry(0.13, 0);
    const droneCore = new THREE.Mesh(droneCoreGeo, this.crystalMat);
    const droneHaloGeo = new THREE.TorusGeometry(0.20, 0.02, 5, 14);
    droneHaloGeo.rotateX(Math.PI * 0.35);
    const droneHalo = new THREE.Mesh(droneHaloGeo, darkMat);
    this.companionDrone.add(droneCore, droneHalo);

    // 6. Articulated Arms
    // Left Arm (with Wrist Communicator Console)
    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.46, 0.44, 0);
    this.torso.add(this.leftArm);

    const armUpperGeo = new THREE.CylinderGeometry(0.11, 0.09, 0.42, 6);
    armUpperGeo.translate(0, -0.21, 0);
    const leftUpperArm = new THREE.Mesh(armUpperGeo, armorMat);
    this.leftArm.add(leftUpperArm);

    // Left Elbow Joint (dark band)
    const elbowGeo = new THREE.SphereGeometry(0.10, 6, 6);
    const leftElbow = new THREE.Mesh(elbowGeo, darkMat);
    leftElbow.position.set(0, -0.42, 0);
    this.leftArm.add(leftElbow);

    // Left Forearm with Wrist Communicator
    const armForeGeo = new THREE.CylinderGeometry(0.10, 0.08, 0.44, 6);
    armForeGeo.translate(0, -0.22, 0);
    const leftForearm = new THREE.Mesh(armForeGeo, armorMat);
    leftForearm.position.y = -0.42;
    this.leftArm.add(leftForearm);

    // Wrist console / communicator pad on left forearm (as in character sheet)
    const wristPadGeo = new THREE.BoxGeometry(0.08, 0.16, 0.07);
    const wristPad = new THREE.Mesh(wristPadGeo, accentMat);
    wristPad.position.set(-0.08, -0.62, 0.02);
    this.leftArm.add(wristPad);

    // Left Tactical Glove (dark hand)
    const handGeo = new THREE.BoxGeometry(0.09, 0.15, 0.12);
    handGeo.translate(0, -0.075, 0);
    const leftHand = new THREE.Mesh(handGeo, darkMat);
    leftHand.position.y = -0.86;
    this.leftArm.add(leftHand);

    // Right Arm
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.46, 0.44, 0);
    this.torso.add(this.rightArm);

    const rightUpperArm = new THREE.Mesh(armUpperGeo, armorMat);
    this.rightArm.add(rightUpperArm);

    const rightElbow = new THREE.Mesh(elbowGeo, darkMat);
    rightElbow.position.set(0, -0.42, 0);
    this.rightArm.add(rightElbow);

    const rightForearm = new THREE.Mesh(armForeGeo, armorMat);
    rightForearm.position.y = -0.42;
    this.rightArm.add(rightForearm);

    const rightHand = new THREE.Mesh(handGeo, darkMat);
    rightHand.position.y = -0.86;
    this.rightArm.add(rightHand);

    // 7. Articulated Legs
    // Left Leg
    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.21, 0.95, 0);
    this.visualRoot.add(this.leftLeg);

    const thighGeo = new THREE.CylinderGeometry(0.14, 0.11, 0.48, 6);
    thighGeo.translate(0, -0.24, 0);
    const leftThigh = new THREE.Mesh(thighGeo, armorMat);
    this.leftLeg.add(leftThigh);

    // Left Knee Pad (dark hexagonal knee guard in front)
    const kneeGeo = new THREE.BoxGeometry(0.16, 0.14, 0.08);
    const leftKnee = new THREE.Mesh(kneeGeo, darkMat);
    leftKnee.position.set(0, -0.48, -0.08);
    this.leftLeg.add(leftKnee);

    // Left Shin / Calf (armored lower leg)
    const shinGeo = new THREE.CylinderGeometry(0.11, 0.10, 0.42, 6);
    shinGeo.translate(0, -0.21, 0);
    const leftShin = new THREE.Mesh(shinGeo, armorMat);
    leftShin.position.y = -0.48;
    this.leftLeg.add(leftShin);

    // Left Ankle Cuff (dark band)
    const cuffGeo = new THREE.CylinderGeometry(0.11, 0.11, 0.08, 6);
    const leftCuff = new THREE.Mesh(cuffGeo, darkMat);
    leftCuff.position.set(0, -0.90, 0);
    this.leftLeg.add(leftCuff);

    // Left Boot with dark sole pointing forward (-Z)
    const bootGeo = new THREE.BoxGeometry(0.17, 0.14, 0.28);
    bootGeo.translate(0, -0.07, -0.05);
    const leftBoot = new THREE.Mesh(bootGeo, armorMat);
    leftBoot.position.y = -0.92;

    const soleGeo = new THREE.BoxGeometry(0.18, 0.04, 0.30);
    soleGeo.translate(0, -0.02, -0.05);
    const leftSole = new THREE.Mesh(soleGeo, soleMat);
    leftSole.position.y = -1.04;
    this.leftLeg.add(leftBoot, leftSole);

    // Right Leg
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.21, 0.95, 0);
    this.visualRoot.add(this.rightLeg);

    const rightThigh = new THREE.Mesh(thighGeo, armorMat);
    this.rightLeg.add(rightThigh);

    const rightKnee = new THREE.Mesh(kneeGeo, darkMat);
    rightKnee.position.set(0, -0.48, -0.08);
    this.rightLeg.add(rightKnee);

    const rightShin = new THREE.Mesh(shinGeo, armorMat);
    rightShin.position.y = -0.48;
    this.rightLeg.add(rightShin);

    const rightCuff = new THREE.Mesh(cuffGeo, darkMat);
    rightCuff.position.set(0, -0.90, 0);
    this.rightLeg.add(rightCuff);

    const rightBoot = new THREE.Mesh(bootGeo, armorMat);
    rightBoot.position.y = -0.92;
    const rightSole = new THREE.Mesh(soleGeo, soleMat);
    rightSole.position.y = -1.04;
    this.rightLeg.add(rightBoot, rightSole);
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
    this.animTime += dt;

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

    // 3. Mouse yaw (around localUp) + pitch + wheel zoom + stick look
    const stickYaw = (input.lookVelX || 0) * 2.4 * dt;
    const yawRate = -mouseFrame.dx * 0.0032 - stickYaw;
    const keyTurn = (input.isDown('ArrowLeft') ? 1 : 0) - (input.isDown('ArrowRight') ? 1 : 0);
    const totalYaw = yawRate + keyTurn * 1.9 * dt;
    if (Math.abs(totalYaw) > 1e-6) {
      const yawQuat = new THREE.Quaternion().setFromAxisAngle(newUp, totalYaw);
      this.group.quaternion.premultiply(yawQuat);
    }

    const stickPitch = (input.lookVelY || 0) * 1.8 * dt;
    this.pitch = THREE.MathUtils.clamp(this.pitch + mouseFrame.dy * 0.0026 + stickPitch, -0.45, 1.15);
    this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + mouseFrame.wheel * 1.4, 6, 30);

    // 4. Local forward (-Z) and right (+X) tangent to the sphere
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(this.group.quaternion).normalize();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.group.quaternion).normalize();

    let moveF = input.moveY || 0;
    let moveR = input.moveX || 0;
    const isFwd = (input.isActionDown ? input.isActionDown('moveForward') : false) || input.isDown('KeyW') || input.isDown('ArrowUp');
    const isBwd = (input.isActionDown ? input.isActionDown('moveBackward') : false) || input.isDown('KeyS') || input.isDown('ArrowDown');
    const isRight = (input.isActionDown ? input.isActionDown('strafeRight') : false) || input.isDown('KeyD') || input.isDown('ArrowRight');
    const isLeft = (input.isActionDown ? input.isActionDown('strafeLeft') : false) || input.isDown('KeyA') || input.isDown('ArrowLeft');

    if (isFwd) moveF += 1;
    if (isBwd) moveF -= 1;
    if (isRight) moveR += 1;
    if (isLeft) moveR -= 1;

    const stickMag = Math.hypot(input.moveX || 0, input.moveY || 0);
    const isSprinting = ((input.isActionDown ? input.isActionDown('sprint') : false) || input.isDown('ShiftLeft') || input.isDown('ShiftRight')) || stickMag > 0.88;
    const baseSpeed = isSprinting ? 28 : 16;
    const speedScale = stickMag > 0 ? Math.min(1.0, Math.max(0.4, stickMag)) : 1.0;
    const moveSpeed = baseSpeed * speedScale;

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

    let isBoosting = false;
    const wantsJump = (input.wasActionPressed ? input.wasActionPressed('jump') : false) || input.wasPressed('Space');
    const holdingJump = (input.isActionDown ? input.isActionDown('jump') : false) || input.isDown('Space');

    if (this.jumpCooldown === undefined) this.jumpCooldown = 0;
    if (this.jumpCooldown > 0) this.jumpCooldown -= dt;

    if (this.grounded && (wantsJump || (holdingJump && this.jumpCooldown <= 0))) {
      this.velocity.addScaledVector(newUp, 15.5);
      this.grounded = false;
      this.jumpCooldown = 0.25;
    } else if (!this.grounded && holdingJump && this.jetpackFuel > 0) {
      // Sci-fi jetpack boost while holding space in mid-air
      this.velocity.addScaledVector(newUp, 38 * dt);
      this.jetpackFuel = Math.max(0, this.jetpackFuel - 34 * dt);
      isBoosting = true;
    } else {
      if (this.grounded) {
        this.jetpackFuel = Math.min(100, this.jetpackFuel + 45 * dt);
      }
    }

    // Jetpack flame cones & crystal power surge
    if (this.jetFlameLeft && this.jetFlameRight) {
      this.jetFlameLeft.visible = isBoosting;
      this.jetFlameRight.visible = isBoosting;
      if (isBoosting) {
        const flamePulse = 1.0 + Math.sin(this.animTime * 28) * 0.2;
        this.jetFlameLeft.scale.set(1, flamePulse, 1);
        this.jetFlameRight.scale.set(1, flamePulse, 1);
        this.crystalMat.emissiveIntensity = 1.6;
      } else {
        this.crystalMat.emissiveIntensity = 0.92;
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

    // 7. Animate walking limbs & companion drone
    const horizSpeed = tangentVel.length();
    if (horizSpeed > 0.5 && this.grounded) {
      this.walkCycle += dt * (isSprinting ? 14 : 9);
      const swing = Math.sin(this.walkCycle) * 0.62;
      this.leftLeg.rotation.x = swing;
      this.rightLeg.rotation.x = -swing;
      // Arms counter-swing opposite to legs
      this.leftArm.rotation.x = -swing * 0.65;
      this.rightArm.rotation.x = swing * 0.65;
      this.torso.rotation.y = swing * 0.08;
    } else if (isBoosting) {
      // In-flight jetpack pose: legs angle slightly back, arms back
      this.leftLeg.rotation.x = -0.35;
      this.rightLeg.rotation.x = -0.32;
      this.leftArm.rotation.x = 0.35;
      this.rightArm.rotation.x = 0.35;
      this.torso.rotation.y *= 0.85;
    } else {
      this.leftLeg.rotation.x *= 0.82;
      this.rightLeg.rotation.x *= 0.82;
      this.leftArm.rotation.x *= 0.82;
      this.rightArm.rotation.x *= 0.82;
      this.torso.rotation.y *= 0.85;
    }

    // Animate Floating Companion Drone (gentle hover bob & yaw spin)
    if (this.companionDrone) {
      this.companionDrone.position.y = 2.38 + Math.sin(this.animTime * 3.2) * 0.08;
      this.companionDrone.rotation.y = this.animTime * 1.8;
      this.companionDrone.rotation.z = Math.sin(this.animTime * 2.2) * 0.15;
    }

    if (this.scannerPulseTimer > 0) {
      this.scannerPulseTimer = Math.max(0, this.scannerPulseTimer - dt);
    }
  }
}
