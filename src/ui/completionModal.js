/**
 * CompletionModal & WarpSequenceController for Aurelia Horizon.
 * Renders the Campaign Victory debrief modal and full-screen 60fps Hyperspace Warp Jump.
 */

export class CompletionModal {
  constructor({ onWarpComplete = null, onResumeFreeRoam = null } = {}) {
    this.onWarpComplete = onWarpComplete;
    this.onResumeFreeRoam = onResumeFreeRoam;
    this.modalEl = null;
    this.warpOverlayEl = null;
    this.warpCanvas = null;
    this.warpCtx = null;
    this.warpAnimId = null;
    this.audioCtx = null;

    this._initDom();
    this._initAudio();
  }

  _initAudio() {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.audioCtx = new AudioCtx();
      }
    } catch (e) {}
  }

  playWarpBoom() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;

      // Deep sub-bass whoosh & rumble
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(65, now);
      osc.frequency.exponentialRampToValueAtTime(240, now + 1.2);
      osc.frequency.exponentialRampToValueAtTime(40, now + 2.8);

      gain.gain.setValueAtTime(0.01, now);
      gain.gain.linearRampToValueAtTime(0.25, now + 1.0);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 3.2);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 3.2);

      // Noise generator for hypersonic rush
      const bufferSize = this.audioCtx.sampleRate * 2.5;
      const noiseBuffer = this.audioCtx.createBuffer(1, bufferSize, this.audioCtx.sampleRate);
      const output = noiseBuffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        output[i] = Math.random() * 2 - 1;
      }

      const whiteNoise = this.audioCtx.createBufferSource();
      whiteNoise.buffer = noiseBuffer;
      const noiseFilter = this.audioCtx.createBiquadFilter();
      noiseFilter.type = 'bandpass';
      noiseFilter.frequency.setValueAtTime(400, now);
      noiseFilter.frequency.exponentialRampToValueAtTime(3200, now + 1.5);

      const noiseGain = this.audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.01, now);
      noiseGain.gain.linearRampToValueAtTime(0.18, now + 1.2);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 2.6);

      whiteNoise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(this.audioCtx.destination);
      whiteNoise.start(now + 0.2);
      whiteNoise.stop(now + 2.8);
    } catch (e) {}
  }

  _initDom() {
    // 1. Victory Completion Modal
    this.modalEl = document.getElementById('completion-modal');
    if (!this.modalEl) {
      this.modalEl = document.createElement('div');
      this.modalEl.id = 'completion-modal';
      this.modalEl.className = 'modal-backdrop';
      this.modalEl.style.display = 'none';
      document.body.appendChild(this.modalEl);
    }

    this.modalEl.innerHTML = `
      <div class="completion-card" role="dialog" aria-modal="true" aria-labelledby="completion-title">
        <div class="completion-header">
          <div class="victory-ribbon">
            <span class="ribbon-star">★</span>
            <span>SYSTEM LIBERATION ACHIEVED</span>
            <span class="ribbon-star">★</span>
          </div>
          <h2 class="completion-title" id="completion-title">VICTORY OVER THE CRIMSON SWARM</h2>
          <div class="completion-subtitle">Vanguard Hero Commendation • Sector 4-B Secure</div>
        </div>
        <div class="completion-body">
          <div class="outro-narrative">
            <p><strong>Commander Vance</strong>, against overwhelming odds, you survived the hostile wilderness of Aurelia Prime and turned a catastrophic crash landing into a decisive system-wide liberation.</p>
            <p>The Crimson Chrysalis Swarm's planetary outpost is demolished, their orbital interceptor fleet neutralized, and their Void Aetherium bastions on Moon III: Goliath pulverized.</p>
            <p class="highlight-line">With the Aurelia system secured and hyperdrive jump cores fully charged, your starfighter is cleared to jump back home and reinforce the main Terran fleet in the battle for Earth's frontier.</p>
          </div>
          <div class="debrief-grid" id="completion-stats-grid">
            <!-- Populated dynamically -->
          </div>
        </div>
        <div class="completion-actions">
          <button type="button" class="btn btn-secondary" id="completion-freeroam-btn">Resume Free Roam</button>
          <button type="button" class="btn btn-primary warp-btn" id="completion-warp-btn">
            <span class="btn-icon">⚡</span>
            <span>ENGAGE HYPERDRIVE WARP DRIVE</span>
          </button>
        </div>
      </div>
    `;

    // 2. Hyperspace Warp Overlay
    this.warpOverlayEl = document.getElementById('warp-screen-overlay');
    if (!this.warpOverlayEl) {
      this.warpOverlayEl = document.createElement('div');
      this.warpOverlayEl.id = 'warp-screen-overlay';
      this.warpOverlayEl.className = 'warp-screen-overlay';
      this.warpOverlayEl.style.display = 'none';
      document.body.appendChild(this.warpOverlayEl);
    }

    this.warpOverlayEl.innerHTML = `
      <canvas id="warp-canvas"></canvas>
      <div class="warp-hud">
        <div class="warp-status-text">ENGAGING HYPERDRIVE WARP JUMP...</div>
        <div class="warp-coordinates">VECTOR: SOL-SYSTEM // TRANSIT TIME: INSTANTANEOUS</div>
      </div>
      <div class="warp-outro-card" id="warp-outro-card" style="display: none;">
        <h2>HYPERSPACE JUMP SUCCESSFUL</h2>
        <p>You have returned to the Terran Home Fleet with the secrets of Void Aetherium.</p>
        <button type="button" class="btn btn-primary" id="warp-return-btn">RETURN TO FREE FLIGHT</button>
      </div>
    `;

    this.warpCanvas = this.warpOverlayEl.querySelector('#warp-canvas');
    this.warpCtx = this.warpCanvas ? this.warpCanvas.getContext('2d') : null;

    // Events
    this.modalEl.querySelector('#completion-freeroam-btn')?.addEventListener('click', () => {
      this.hide();
      if (this.onResumeFreeRoam) this.onResumeFreeRoam();
    });

    this.modalEl.querySelector('#completion-warp-btn')?.addEventListener('click', () => {
      this.hide();
      this.startWarpSequence();
    });

    this.warpOverlayEl.querySelector('#warp-return-btn')?.addEventListener('click', () => {
      this.stopWarpSequence();
      if (this.onResumeFreeRoam) this.onResumeFreeRoam();
    });
  }

  show(stats = {}) {
    const grid = this.modalEl.querySelector('#completion-stats-grid');
    if (grid) {
      grid.innerHTML = `
        <div class="debrief-stat"><span class="stat-label">Enemies Neutralized</span><strong class="stat-val">${(stats.bugAliensDefeated || 0) + (stats.enemyPodsDestroyed || 0) + (stats.faunaDefeated || 0)}</strong></div>
        <div class="debrief-stat"><span class="stat-label">Pods Destroyed</span><strong class="stat-val">${stats.enemyPodsDestroyed || 0}</strong></div>
        <div class="debrief-stat"><span class="stat-label">Wasp-Warriors Slain</span><strong class="stat-val">${stats.bugAliensDefeated || 0}</strong></div>
        <div class="debrief-stat"><span class="stat-label">Minerals Harvested</span><strong class="stat-val">${stats.mineralsHarvested || 0}</strong></div>
        <div class="debrief-stat"><span class="stat-label">Void Crystals Mined</span><strong class="stat-val">${stats.voidCrystalsHarvested || 0}</strong></div>
        <div class="debrief-stat"><span class="stat-label">Upgrades Crafted</span><strong class="stat-val">${stats.upgradesCrafted || 0}</strong></div>
      `;
    }
    this.modalEl.style.display = 'flex';
  }

  hide() {
    this.modalEl.style.display = 'none';
  }

  startWarpSequence() {
    this.warpOverlayEl.style.display = 'flex';
    const outroCard = this.warpOverlayEl.querySelector('#warp-outro-card');
    if (outroCard) outroCard.style.display = 'none';

    this.playWarpBoom();

    if (!this.warpCanvas || !this.warpCtx) return;

    const canvas = this.warpCanvas;
    const ctx = this.warpCtx;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const stars = [];
    const numStars = 400;
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    for (let i = 0; i < numStars; i++) {
      stars.push({
        x: (Math.random() - 0.5) * canvas.width * 2,
        y: (Math.random() - 0.5) * canvas.height * 2,
        z: Math.random() * canvas.width,
        pz: Math.random() * canvas.width,
        color: i % 4 === 0 ? '#ff1eff' : (i % 3 === 0 ? '#00f5d4' : '#e0fbfc')
      });
    }

    let speed = 4;
    let elapsed = 0;
    let startTime = performance.now();

    const animateWarp = (now) => {
      elapsed = (now - startTime) / 1000;
      speed = Math.min(130, 4 + elapsed * 38);

      ctx.fillStyle = 'rgba(4, 7, 17, 0.28)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = 0; i < numStars; i++) {
        const s = stars[i];
        s.pz = s.z;
        s.z -= speed;

        if (s.z <= 0) {
          s.z = canvas.width;
          s.pz = canvas.width;
          s.x = (Math.random() - 0.5) * canvas.width * 2;
          s.y = (Math.random() - 0.5) * canvas.height * 2;
        }

        const k = 250 / s.z;
        const px = s.x * k + cx;
        const py = s.y * k + cy;

        const pk = 250 / s.pz;
        const prevX = s.x * pk + cx;
        const prevY = s.y * pk + cy;

        ctx.strokeStyle = s.color;
        ctx.lineWidth = Math.min(4.5, (1 - s.z / canvas.width) * 4.0);
        ctx.beginPath();
        ctx.moveTo(prevX, prevY);
        ctx.lineTo(px, py);
        ctx.stroke();
      }

      // Central tunnel pulse
      const pulseR = (elapsed * 90) % 200;
      ctx.strokeStyle = `rgba(0, 245, 212, ${Math.max(0, 1 - pulseR / 200)})`;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(cx, cy, pulseR, 0, Math.PI * 2);
      ctx.stroke();

      if (elapsed < 3.8) {
        this.warpAnimId = requestAnimationFrame(animateWarp);
      } else {
        // Flash to white/blue and reveal outro card
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        setTimeout(() => {
          ctx.fillStyle = '#040711';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          if (outroCard) outroCard.style.display = 'flex';
          if (this.onWarpComplete) this.onWarpComplete();
        }, 300);
      }
    };

    if (this.warpAnimId) cancelAnimationFrame(this.warpAnimId);
    this.warpAnimId = requestAnimationFrame(animateWarp);
  }

  stopWarpSequence() {
    if (this.warpAnimId) {
      cancelAnimationFrame(this.warpAnimId);
      this.warpAnimId = null;
    }
    this.warpOverlayEl.style.display = 'none';
  }
}
