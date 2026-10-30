import * as THREE from 'three';

/**
 * Procedural Sky, Radiant Animated Sun with Solar Corona & Solar Flares,
 * Starfield, and Destructible Orbital Targets.
 */
export function createSkyAndSpaceTargets(scene) {
  // 1. Starfield (large radius, dense twinkling stars)
  const starCount = 4200;
  const starPos = new Float32Array(starCount * 3);
  const starCol = new Float32Array(starCount * 3);

  for (let i = 0; i < starCount; i++) {
    const r = 18000 + Math.random() * 8000;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    starPos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
    starPos[i * 3 + 2] = r * Math.cos(phi);

    const tint = Math.random();
    starCol[i * 3] = tint > 0.7 ? 0.75 : 1.0;
    starCol[i * 3 + 1] = tint > 0.3 ? 0.92 : 0.82;
    starCol[i * 3 + 2] = 1.0;
  }

  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  starGeo.setAttribute('color', new THREE.BufferAttribute(starCol, 3));
  const starMat = new THREE.PointsMaterial({
    size: 22,
    vertexColors: true,
    sizeAttenuation: true,
    fog: false
  });
  const stars = new THREE.Points(starGeo, starMat);
  scene.add(stars);

  // 2. Solar Direction & Atmospheric Lighting
  const sunDir = new THREE.Vector3(1, 0.65, 0.45).normalize();
  const sunDistance = 12500;
  const sunCenter = sunDir.clone().multiplyScalar(sunDistance);

  const sunLight = new THREE.DirectionalLight(0xfff5dd, 2.3);
  sunLight.position.copy(sunDir).multiplyScalar(9000);
  scene.add(sunLight);

  const hemiLight = new THREE.HemisphereLight(0x72efdd, 0x1b1433, 0.8);
  scene.add(hemiLight);

  // 3. Radiant Animated Sun Surface (Shader with moving solar granules and plasma flares)
  const sunRadius = 480;
  const sunGeo = new THREE.SphereGeometry(sunRadius, 40, 40);

  const sunUniforms = {
    uTime: { value: 0 },
    uColorCore: { value: new THREE.Color(0xffffff) },
    uColorInner: { value: new THREE.Color(0xffe066) },
    uColorEdge: { value: new THREE.Color(0xff5400) },
    uColorDark: { value: new THREE.Color(0xd00000) }
  };

  const sunMat = new THREE.ShaderMaterial({
    uniforms: sunUniforms,
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPosition = position;
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      varying vec3 vPosition;
      varying vec2 vUv;
      uniform float uTime;
      uniform vec3 uColorCore;
      uniform vec3 uColorInner;
      uniform vec3 uColorEdge;
      uniform vec3 uColorDark;

      // Fast simplex noise approximation
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i  = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + C.xxx;
        vec3 x2 = x0 - i2 + C.yyy;
        vec3 x3 = x0 - D.yyy;
        i = mod289(i);
        vec4 p = permute(permute(permute(
                  i.z + vec4(0.0, i1.z, i2.z, 1.0))
                + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 0.142857142857;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ *ns.x + ns.yyyy;
        vec4 y = y_ *ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }

      void main() {
        // Multi-frequency animated solar churning
        vec3 posNorm = normalize(vPosition);
        float t = uTime * 0.35;
        float n1 = snoise(posNorm * 3.2 + vec3(0.0, t * 0.8, t * 0.4));
        float n2 = snoise(posNorm * 7.5 - vec3(t * 0.6, 0.0, t * 0.9)) * 0.5;
        float n3 = snoise(posNorm * 14.0 + vec3(t * 1.2, t * 1.0, 0.0)) * 0.25;
        float plasma = (n1 + n2 + n3 + 1.75) * 0.28;

        // Limb darkening toward periphery of sphere
        float viewDot = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        float limb = pow(viewDot, 0.55);

        vec3 col = mix(uColorDark, uColorEdge, smoothstep(0.15, 0.5, plasma));
        col = mix(col, uColorInner, smoothstep(0.45, 0.75, plasma));
        col = mix(col, uColorCore, smoothstep(0.75, 1.0, plasma));

        // Flare brightening in core
        col *= (0.8 + limb * 0.45);

        gl_FragColor = vec4(col * 1.35, 1.0);
      }
    `,
    fog: false
  });

  const sunGroup = new THREE.Group();
  sunGroup.position.copy(sunCenter);

  const sunMesh = new THREE.Mesh(sunGeo, sunMat);
  sunGroup.add(sunMesh);

  // 4. Multi-Layer Pulsing Solar Corona Glow Billboards
  const coronaCanvas = document.createElement('canvas');
  coronaCanvas.width = 256;
  coronaCanvas.height = 256;
  const cCtx = coronaCanvas.getContext('2d');
  const radGrad = cCtx.createRadialGradient(128, 128, 20, 128, 128, 128);
  radGrad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
  radGrad.addColorStop(0.15, 'rgba(255, 235, 120, 0.95)');
  radGrad.addColorStop(0.35, 'rgba(255, 140, 20, 0.65)');
  radGrad.addColorStop(0.65, 'rgba(255, 60, 0, 0.25)');
  radGrad.addColorStop(1.0, 'rgba(255, 30, 0, 0.0)');
  cCtx.fillStyle = radGrad;
  cCtx.fillRect(0, 0, 256, 256);

  const coronaTex = new THREE.CanvasTexture(coronaCanvas);

  const coronaInnerMat = new THREE.SpriteMaterial({
    map: coronaTex,
    color: 0xffe6aa,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.92,
    fog: false
  });
  const coronaInner = new THREE.Sprite(coronaInnerMat);
  coronaInner.scale.set(sunRadius * 4.2, sunRadius * 4.2, 1);
  sunGroup.add(coronaInner);

  const coronaOuterMat = new THREE.SpriteMaterial({
    map: coronaTex,
    color: 0xff6600,
    blending: THREE.AdditiveBlending,
    transparent: true,
    opacity: 0.55,
    fog: false
  });
  const coronaOuter = new THREE.Sprite(coronaOuterMat);
  coronaOuter.scale.set(sunRadius * 8.5, sunRadius * 8.5, 1);
  sunGroup.add(coronaOuter);

  // 5. Radiating Solar Flare Rays / Ray Spikes
  const rayGroup = new THREE.Group();
  const rayCount = 14;
  const rayGeo = new THREE.PlaneGeometry(sunRadius * 0.35, sunRadius * 5.5);
  rayGeo.translate(0, sunRadius * 2.75, 0);

  const rayCanvas = document.createElement('canvas');
  rayCanvas.width = 64;
  rayCanvas.height = 256;
  const rCtx = rayCanvas.getContext('2d');
  const rGrad = rCtx.createLinearGradient(0, 0, 0, 256);
  rGrad.addColorStop(0.0, 'rgba(255, 240, 180, 0.9)');
  rGrad.addColorStop(0.4, 'rgba(255, 160, 40, 0.55)');
  rGrad.addColorStop(0.8, 'rgba(255, 70, 0, 0.2)');
  rGrad.addColorStop(1.0, 'rgba(255, 30, 0, 0.0)');
  rCtx.fillStyle = rGrad;
  rCtx.fillRect(0, 0, 64, 256);

  const rayTex = new THREE.CanvasTexture(rayCanvas);
  const rayMat = new THREE.MeshBasicMaterial({
    map: rayTex,
    color: 0xffcc44,
    transparent: true,
    opacity: 0.65,
    blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide,
    depthWrite: false,
    fog: false
  });

  const rays = [];
  for (let i = 0; i < rayCount; i++) {
    const mesh = new THREE.Mesh(rayGeo, rayMat);
    const angle = (i / rayCount) * Math.PI * 2;
    mesh.rotation.z = angle;
    rayGroup.add(mesh);
    rays.push({
      mesh,
      baseScaleY: 0.8 + (i % 3) * 0.35,
      speed: (i % 2 === 0 ? 1 : -1) * (0.015 + (i % 4) * 0.01)
    });
  }
  // Face the ray disc toward origin
  rayGroup.lookAt(new THREE.Vector3(0, 0, 0).sub(sunCenter));
  sunGroup.add(rayGroup);

  scene.add(sunGroup);

  // 6. Destructible Orbital Asteroids & Rogue Sentinel Drones (rescaled for 2x planetary system)
  const targets = [];
  const astGeo = new THREE.DodecahedronGeometry(22, 1);
  const droneCoreGeo = new THREE.OctahedronGeometry(14, 0);

  for (let i = 0; i < 48; i++) {
    const isDrone = i % 3 === 0;
    const angle = (i / 48) * Math.PI * 2 + (i % 5) * 0.13;
    const bandRadius = 1450 + (i % 7) * 450;
    const yOff = Math.sin(i * 1.9) * 280;

    const mat = new THREE.MeshStandardMaterial({
      color: isDrone ? 0xff2a85 : 0x7b6d8d,
      emissive: isDrone ? 0xb5179e : 0x241934,
      emissiveIntensity: isDrone ? 0.95 : 0.3,
      roughness: 0.55,
      flatShading: true
    });

    const mesh = new THREE.Mesh(isDrone ? droneCoreGeo : astGeo, mat);
    const scale = isDrone ? 1.2 : 0.9 + (i % 4) * 0.5;
    mesh.scale.setScalar(scale);
    mesh.position.set(Math.cos(angle) * bandRadius, yOff, Math.sin(angle) * bandRadius);
    scene.add(mesh);

    targets.push({
      mesh,
      isDrone,
      hp: isDrone ? 35 : 50,
      radius: (isDrone ? 16 : 24) * scale,
      orbitRadius: bandRadius,
      orbitAngle: angle,
      orbitSpeed: (isDrone ? 0.022 : 0.007) * (i % 2 === 0 ? 1 : -1),
      yOffset: yOff,
      destroyed: false,
      respawnTimer: 0
    });
  }

  return {
    stars,
    sunLight,
    hemiLight,
    sunGroup,
    targets,
    update: (time, camera) => {
      // 1. Update sun shader animation
      sunUniforms.uTime.value = time;

      // 2. Pulse corona scale & glow
      const pulse1 = 1.0 + Math.sin(time * 1.6) * 0.08;
      const pulse2 = 1.0 + Math.cos(time * 1.1) * 0.12;
      coronaInner.scale.set(sunRadius * 4.2 * pulse1, sunRadius * 4.2 * pulse1, 1);
      coronaOuter.scale.set(sunRadius * 8.5 * pulse2, sunRadius * 8.5 * pulse2, 1);

      // 3. Rotate and breath solar flare rays
      rayGroup.rotation.z += 0.008;
      rays.forEach((r, idx) => {
        const rayPulse = r.baseScaleY * (1.0 + Math.sin(time * 2.4 + idx) * 0.22);
        r.mesh.scale.set(1.0, rayPulse, 1.0);
      });

      // 4. Subtle directional light intensity breathing
      sunLight.intensity = 2.3 + Math.sin(time * 2.8) * 0.12;

      // 5. Keep starfield centered around active camera so it never clips or drifts
      if (camera) {
        stars.position.copy(camera.position);
      }
    }
  };
}
