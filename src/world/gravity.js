// Spherical gravity & dominant celestial body solver

export function evaluateGravity(worldPos, bodies) {
  let dominantBody = null;
  let bestScore = -Infinity;
  let dominantAccelVec = { x: 0, y: 0, z: 0 };
  let altitude = Infinity;
  let upVec = { x: 0, y: 1, z: 0 };

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

    // Effective gravity pull g * (R / d)^2, boosted inside SOI so moons cleanly take over near them
    const ratio = body.radius / Math.max(dist, body.radius * 0.5);
    const pull = body.surfaceGravity * ratio * ratio;

    // Give priority to a moon when inside its sphere of influence (SOI)
    const inSOI = dist <= body.soiRadius;
    const score = inSOI ? pull * (body.isMoon ? 4.5 : 1.0) : pull * 0.25;

    if (score > bestScore) {
      bestScore = score;
      dominantBody = body;
      const surfaceR = body.getSurfaceRadiusAtDir(ux, uy, uz);
      altitude = dist - surfaceR;
      upVec = { x: ux, y: uy, z: uz };
      const gMag = inSOI ? body.surfaceGravity * Math.min(1.0, Math.pow(body.radius / dist, 1.35)) : pull;
      dominantAccelVec = {
        x: -ux * gMag,
        y: -uy * gMag,
        z: -uz * gMag
      };
    }
  }

  return {
    body: dominantBody,
    acceleration: dominantAccelVec,
    up: upVec,
    altitude
  };
}
