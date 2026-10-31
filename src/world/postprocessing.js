import * as THREE from 'three';

/**
 * Lightweight, zero-dependency selective post-processing bloom manager
 * for sci-fi neon emissives, plasma bolts, thruster plumes, and planetary atmospheres.
 */
export class PostProcessingManager {
  constructor(renderer, scene, camera, options = {}) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;

    this.enabled = options.enabled !== undefined ? options.enabled : true;
    this.bloomIntensity = options.bloomIntensity !== undefined ? options.bloomIntensity : 0.85;
    this.bloomThreshold = options.bloomThreshold !== undefined ? options.bloomThreshold : 0.72;

    const size = new THREE.Vector2();
    renderer.getSize(size);
    const pixelRatio = renderer.getPixelRatio();
    this.width = Math.max(1, Math.floor(size.x * pixelRatio));
    this.height = Math.max(1, Math.floor(size.y * pixelRatio));

    // Downscaled blur resolution for soft sci-fi diffusion and high performance
    const blurScale = 0.5;
    this.blurWidth = Math.max(1, Math.floor(this.width * blurScale));
    this.blurHeight = Math.max(1, Math.floor(this.height * blurScale));

    const renderTargetParams = {
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      format: THREE.RGBAFormat,
      type: THREE.HalfFloatType || THREE.UnsignedByteType,
      stencilBuffer: false,
      depthBuffer: true
    };

    try {
      this.sceneRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height, renderTargetParams);
      this.brightRenderTarget = new THREE.WebGLRenderTarget(this.blurWidth, this.blurHeight, {
        ...renderTargetParams,
        depthBuffer: false
      });
      this.blurTargetH = new THREE.WebGLRenderTarget(this.blurWidth, this.blurHeight, {
        ...renderTargetParams,
        depthBuffer: false
      });
      this.blurTargetV = new THREE.WebGLRenderTarget(this.blurWidth, this.blurHeight, {
        ...renderTargetParams,
        depthBuffer: false
      });
    } catch (e) {
      console.warn('WebGLRenderTarget creation fallback:', e);
      this.enabled = false;
    }

    // Full-screen quad setup
    this.quadCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
    this.quadGeo = new THREE.PlaneGeometry(2, 2);
    this.quadScene = new THREE.Scene();

    // 1. Bright-pass shader (extracts neon glow above threshold)
    this.brightMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uThreshold: { value: this.bloomThreshold }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform float uThreshold;
        varying vec2 vUv;
        void main() {
          vec4 col = texture2D(tDiffuse, vUv);
          // Perceptual luminance calculation
          float lum = dot(col.rgb, vec3(0.2126, 0.7152, 0.0722));
          float factor = clamp((lum - uThreshold) / max(0.001, 1.0 - uThreshold), 0.0, 1.0);
          gl_FragColor = vec4(col.rgb * factor, 1.0);
        }
      `,
      depthTest: false,
      depthWrite: false
    });

    // 2. Gaussian blur shader (separable)
    this.blurMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        uDirection: { value: new THREE.Vector2(1.0, 0.0) },
        uResolution: { value: new THREE.Vector2(this.blurWidth, this.blurHeight) }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform vec2 uDirection;
        uniform vec2 uResolution;
        varying vec2 vUv;
        void main() {
          vec2 invSize = 1.0 / uResolution;
          vec4 sum = vec4(0.0);
          // 9-tap Gaussian kernel
          sum += texture2D(tDiffuse, vUv - 4.0 * uDirection * invSize) * 0.051;
          sum += texture2D(tDiffuse, vUv - 3.0 * uDirection * invSize) * 0.0918;
          sum += texture2D(tDiffuse, vUv - 2.0 * uDirection * invSize) * 0.12245;
          sum += texture2D(tDiffuse, vUv - 1.0 * uDirection * invSize) * 0.1531;
          sum += texture2D(tDiffuse, vUv) * 0.1633;
          sum += texture2D(tDiffuse, vUv + 1.0 * uDirection * invSize) * 0.1531;
          sum += texture2D(tDiffuse, vUv + 2.0 * uDirection * invSize) * 0.12245;
          sum += texture2D(tDiffuse, vUv + 3.0 * uDirection * invSize) * 0.0918;
          sum += texture2D(tDiffuse, vUv + 4.0 * uDirection * invSize) * 0.051;
          gl_FragColor = sum;
        }
      `,
      depthTest: false,
      depthWrite: false
    });

    // 3. Composite additive shader
    this.compositeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null },
        tBloom: { value: null },
        uBloomIntensity: { value: this.bloomIntensity }
      },
      vertexShader: `
        varying vec2 vUv;
        void main() {
          vUv = uv;
          gl_Position = vec4(position.xy, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D tDiffuse;
        uniform sampler2D tBloom;
        uniform float uBloomIntensity;
        varying vec2 vUv;
        void main() {
          vec4 base = texture2D(tDiffuse, vUv);
          vec4 bloom = texture2D(tBloom, vUv);
          // Additive blend with soft tone saturation
          vec3 outCol = base.rgb + bloom.rgb * uBloomIntensity;
          gl_FragColor = vec4(outCol, base.a);
        }
      `,
      depthTest: false,
      depthWrite: false
    });

    this.quadMesh = new THREE.Mesh(this.quadGeo, this.brightMaterial);
    this.quadScene.add(this.quadMesh);
  }

  setSize(width, height) {
    const pixelRatio = this.renderer.getPixelRatio ? this.renderer.getPixelRatio() : 1;
    this.width = Math.max(1, Math.floor(width * pixelRatio));
    this.height = Math.max(1, Math.floor(height * pixelRatio));
    this.blurWidth = Math.max(1, Math.floor(this.width * 0.5));
    this.blurHeight = Math.max(1, Math.floor(this.height * 0.5));

    if (this.sceneRenderTarget) this.sceneRenderTarget.setSize(this.width, this.height);
    if (this.brightRenderTarget) this.brightRenderTarget.setSize(this.blurWidth, this.blurHeight);
    if (this.blurTargetH) this.blurTargetH.setSize(this.blurWidth, this.blurHeight);
    if (this.blurTargetV) this.blurTargetV.setSize(this.blurWidth, this.blurHeight);

    if (this.blurMaterial) {
      this.blurMaterial.uniforms.uResolution.value.set(this.blurWidth, this.blurHeight);
    }
  }

  setEnabled(enabled) {
    this.enabled = !!enabled;
  }

  setBloomIntensity(intensity) {
    this.bloomIntensity = intensity;
    if (this.compositeMaterial) {
      this.compositeMaterial.uniforms.uBloomIntensity.value = intensity;
    }
  }

  setBloomThreshold(threshold) {
    this.bloomThreshold = threshold;
    if (this.brightMaterial) {
      this.brightMaterial.uniforms.uThreshold.value = threshold;
    }
  }

  render(scene, camera) {
    const activeScene = scene || this.scene;
    const activeCamera = camera || this.camera;

    if (!this.enabled || !this.sceneRenderTarget) {
      this.renderer.setRenderTarget(null);
      this.renderer.render(activeScene, activeCamera);
      return;
    }

    // Step 1: Render scene to sceneRenderTarget
    this.renderer.setRenderTarget(this.sceneRenderTarget);
    this.renderer.render(activeScene, activeCamera);

    // Step 2: Bright pass filter
    this.quadMesh.material = this.brightMaterial;
    this.brightMaterial.uniforms.tDiffuse.value = this.sceneRenderTarget.texture;
    this.brightMaterial.uniforms.uThreshold.value = this.bloomThreshold;
    this.renderer.setRenderTarget(this.brightRenderTarget);
    this.renderer.render(this.quadScene, this.quadCamera);

    // Step 3: Horizontal Gaussian Blur
    this.quadMesh.material = this.blurMaterial;
    this.blurMaterial.uniforms.tDiffuse.value = this.brightRenderTarget.texture;
    this.blurMaterial.uniforms.uDirection.value.set(1.0, 0.0);
    this.renderer.setRenderTarget(this.blurTargetH);
    this.renderer.render(this.quadScene, this.quadCamera);

    // Step 4: Vertical Gaussian Blur
    this.blurMaterial.uniforms.tDiffuse.value = this.blurTargetH.texture;
    this.blurMaterial.uniforms.uDirection.value.set(0.0, 1.0);
    this.renderer.setRenderTarget(this.blurTargetV);
    this.renderer.render(this.quadScene, this.quadCamera);

    // Step 5: Composite back to default canvas buffer
    this.quadMesh.material = this.compositeMaterial;
    this.compositeMaterial.uniforms.tDiffuse.value = this.sceneRenderTarget.texture;
    this.compositeMaterial.uniforms.tBloom.value = this.blurTargetV.texture;
    this.compositeMaterial.uniforms.uBloomIntensity.value = this.bloomIntensity;
    this.renderer.setRenderTarget(null);
    this.renderer.render(this.quadScene, this.quadCamera);
  }

  dispose() {
    if (this.sceneRenderTarget) this.sceneRenderTarget.dispose();
    if (this.brightRenderTarget) this.brightRenderTarget.dispose();
    if (this.blurTargetH) this.blurTargetH.dispose();
    if (this.blurTargetV) this.blurTargetV.dispose();
    if (this.quadGeo) this.quadGeo.dispose();
    if (this.brightMaterial) this.brightMaterial.dispose();
    if (this.blurMaterial) this.blurMaterial.dispose();
    if (this.compositeMaterial) this.compositeMaterial.dispose();
  }
}
