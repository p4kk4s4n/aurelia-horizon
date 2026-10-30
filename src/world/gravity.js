// Full Newtonian spherical gravity & dominant celestial body solver

export function evaluateGravity(worldPos, bodies) {
  let dominantBody = null;
  let bestScore = -Infinity;
  let dominantAccelVec = { x: 0, y: 0, z: 0 };
  let altitude = Infinity;
  let upVec = { x: 0, y: 1, z: 0 };
  let dominantMu = 0;
  let dominantDist = 0;

  for (const body of bodies) {
    const bPos = body.getWorldPosition();
    const dx = bPos.x - worldPos.x;
    const dy = bPos.y - worldPos.y;
    const dz = bPos.z - worldPos.z;
    const distSq = dx * dx + dy * dy + dz * dz;
    const dist = Math.sqrt(distSq) || 0.0001;

    // Normalized direction from body center to actor ("local up")
    const ux = -dx / dist;
    const uy = -dy / dist;
    const uz = -dz / dist;

    // True Newtonian gravitational parameter mu = g0 * R0^2
    const mu = body.surfaceGravity * body.radius * body.radius;

    // True Newtonian inverse-square acceleration: a = mu / r^2 = g0 * (R0 / r)^2
    const clampedDist = Math.max(dist, body.radius * 0.4);
    const pureNewtonianPull = mu / (clampedDist * clampedDist);

    // Patched-conics SOI priority: moons take over inside their SOI
    const inSOI = dist <= body.soiRadius;
    const score = inSOI ? pureNewtonianPull * (body.isMoon ? 5.0 : 1.0) : pureNewtonianPull * 0.2;

    if (score > bestScore) {
      bestScore = score;
      dominantBody = body;
      const surfaceR = body.getSurfaceRadiusAtDir(ux, uy, uz);
      altitude = dist - surfaceR;
      upVec = { x: ux, y: uy, z: uz };
      dominantDist = dist;
      dominantMu = mu;

      dominantAccelVec = {
        x: -ux * pureNewtonianPull,
        y: -uy * pureNewtonianPull,
        z: -uz * pureNewtonianPull
      };
    }
  }

  return {
    body: dominantBody,
    acceleration: dominantAccelVec,
    up: upVec,
    altitude,
    mu: dominantMu,
    dist: dominantDist
  };
}
