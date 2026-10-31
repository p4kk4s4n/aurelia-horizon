import * as THREE from 'three';
import { GLTFLoader } from '../../vendor/three/GLTFLoader.js';

/**
 * AssetManager — Production GLTF/GLB Asset Cache and Loader
 * Provides zero-downtime, offline-first 3D model loading with fallback resilience.
 */
export class AssetManager {
  constructor() {
    this.loader = new GLTFLoader();
    this.cache = new Map();
    this.inFlight = new Map();
    this.failedUrls = new Set();
  }

  /**
   * Resolves model path relative to current URL location (handles subfolders & GitHub Pages).
   */
  _resolveUrl(url) {
    if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
      return url;
    }
    const cleanUrl = url.replace(/^\.?\//, '');
    const pathname = (typeof window !== 'undefined' && window.location) ? window.location.pathname : '';
    let prefix = './';
    if (pathname.includes('/tests/') || pathname.includes('/scratch/')) {
      prefix = '../';
    }
    return prefix + cleanUrl;
  }

  /**
   * Asynchronously loads a .glb / .gltf file, returning a clone of the parsed scene.
   * Gracefully returns null if loading fails (e.g., in offline or headless environments).
   */
  async loadModel(rawUrl) {
    const url = this._resolveUrl(rawUrl);
    if (this.failedUrls.has(url)) return null;

    if (this.cache.has(url)) {
      return this._cloneGLTF(this.cache.get(url));
    }

    if (this.inFlight.has(url)) {
      const gltf = await this.inFlight.get(url);
      return gltf ? this._cloneGLTF(gltf) : null;
    }

    const loadPromise = new Promise((resolve) => {
      this.loader.load(
        url,
        (gltf) => {
          this.cache.set(url, gltf.scene);
          resolve(gltf.scene);
        },
        undefined,
        (err) => {
          console.warn(`[AssetManager] Could not load 3D model from ${url}, using procedural fallback:`, err?.message || err);
          this.failedUrls.add(url);
          resolve(null);
        }
      );
    });

    this.inFlight.set(url, loadPromise);
    const scene = await loadPromise;
    this.inFlight.delete(url);
    return scene ? this._cloneGLTF(scene) : null;
  }

  /**
   * Deep clones a GLTF scene including skinned meshes, bones and materials.
   */
  _cloneGLTF(source) {
    const clone = source.clone(true);
    // Ensure materials and shadows are cleanly cloned
    clone.traverse((child) => {
      if (child.isMesh) {
        if (child.material) {
          child.material = child.material.clone();
        }
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
    return clone;
  }
}

export const assetManager = new AssetManager();
