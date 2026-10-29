import * as THREE from 'three';

export const SHIP_PART_DEFS = [
  {
    id: 'fusion_core',
    name: 'Quantum Fusion Core',
    color: 0x00f5d4,
    dir: [0.16, 0.96, 0.22]
  },
  {
    id: 'thruster_nozzle',
    name: 'Plasma Thruster Manifold',
    color: 0xff9f1c,
    dir: [-0.28, 0.91, 0.29]
  },
  {
    id: 'nav_computer',
    name: 'Astronavigation Matrix',
    color: 0x9b5de5,
    dir: [0.35, 0.87, -0.34]
  },
  {
    id: 'hull_stabilizer',
    name: 'Graviton Hull Stabilizer',
    color: 0xf15bb5,
    dir: [-0.38, 0.85, -0.36]
  },
  {
    id: 'weapon_capacitor',
    name: 'Pulse Cannon Capacitor',
    color: 0xfee440,
    dir: [0.04, 0.82, -0.57]
  }
];

export class ShipRepairSystem {
  constructor(scene, planet) {
    this.scene = scene;
    this.planet = planet;
    this.parts = [];
    this.carriedParts = [];
    this.installedParts = [];

    if (scene && planet) {
      this._spawnPartsOnPlanet();
    }
  }

  _spawnPartsOnPlanet() {
    const upDefault = new THREE.Vector3(0, 1, 0);

    for (const def of SHIP_PART_DEFS) {
      const dir = new THREE.Vector3(...def.dir).normalize();
      let surfaceR = this.planet.getSurfaceRadiusAtDir(dir.x, dir.y, dir.z);
      // Ensure part isn't deep underwater
      if (this.planet.seaLevelRadius && surfaceR < this.planet.seaLevelRadius + 0.5) {
        surfaceR = this.planet.seaLevelRadius + 1.2;
      }

      const group = new THREE.Group();
      const pos = this.planet.getWorldPosition().clone().addScaledVector(dir, surfaceR + 1.4);
      group.position.copy(pos);
      group.quaternion.setFromUnitVectors(upDefault, dir);

      // Glowing module crate + vertical light beacon so player can spot it across hills
      const coreGeo = new THREE.OctahedronGeometry(1.45, 0);
      const coreMat = new THREE.MeshStandardMaterial({
        color: def.color,
        emissive: def.color,
        emissiveIntensity: 0.9,
        roughness: 0.2,
        metalness: 0.7
      });
      const coreMesh = new THREE.Mesh(coreGeo, coreMat);
      group.add(coreMesh);

      const ringGeo = new THREE.TorusGeometry(2.1, 0.14, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
      const ringMesh = new THREE.Mesh(ringGeo, ringMat);
      group.add(ringMesh);

      // Tall sky beacon beam
      const beamGeo = new THREE.CylinderGeometry(0.18, 0.65, 55, 8, 1, true);
      beamGeo.translate(0, 27.5, 0);
      const beamMat = new THREE.MeshBasicMaterial({
        color: def.color,
        transparent: true,
        opacity: 0.32,
        side: THREE.DoubleSide,
        depthWrite: false
      });
      const beamMesh = new THREE.Mesh(beamGeo, beamMat);
      group.add(beamMesh);

      this.scene.add(group);

      this.parts.push({
        ...def,
        group,
        coreMesh,
        ringMesh,
        beamMesh,
        collected: false,
        installed: false
      });
    }
  }

  update(dt, time) {
    for (const part of this.parts) {
      if (part.collected) continue;
      part.coreMesh.rotation.y = time * 1.8;
      part.ringMesh.rotation.x = time * 1.3;
      part.ringMesh.rotation.y = time * 0.9;
    }
  }

  getNearestUncollectedPart(worldPos) {
    let best = null;
    let bestDist = Infinity;
    for (const part of this.parts) {
      if (part.collected) continue;
      const d = part.group.position.distanceTo(worldPos);
      if (d < bestDist) {
        bestDist = d;
        best = part;
      }
    }
    return best ? { part: best, distance: bestDist } : null;
  }

  tryPickupPart(part) {
    if (!part || part.collected) return false;
    part.collected = true;
    if (part.group) part.group.visible = false;
    this.carriedParts.push(part);
    return true;
  }

  installCarriedParts() {
    if (this.carriedParts.length === 0) return 0;
    let count = 0;
    while (this.carriedParts.length > 0) {
      const p = this.carriedParts.pop();
      p.installed = true;
      this.installedParts.push(p);
      count++;
    }
    return count;
  }

  giveAndInstallAll() {
    for (const p of this.parts) {
      if (!p.collected) {
        p.collected = true;
        if (p.group) p.group.visible = false;
      }
      if (!p.installed) {
        p.installed = true;
        this.installedParts.push(p);
      }
    }
    this.carriedParts.length = 0;
  }

  isShipRepaired() {
    return this.installedParts.length >= SHIP_PART_DEFS.length;
  }

  getStatus() {
    const total = SHIP_PART_DEFS.length;
    const collected = this.parts.filter((p) => p.collected).length;
    const installed = this.installedParts.length;
    const carried = this.carriedParts.length;
    return {
      total,
      collected,
      installed,
      carried,
      repaired: installed >= total
    };
  }
}
