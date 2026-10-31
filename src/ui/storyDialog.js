/**
 * StoryDialogSystem — Interactive Sci-Fi Comms Transceiver & Story Dialog Presentation.
 * Displays narrative mission briefings and tactical transmission logs.
 * Supports configurable placement: 'mid-screen', 'bottom-left', 'bottom-right'.
 */

export class StoryDialogSystem {
  constructor({ containerId = 'story-dialog-container', onNotice = null } = {}) {
    this.container = document.getElementById(containerId);
    this.onNotice = onNotice;
    this.currentChapter = null;
    this.isOpen = false;
    this.audioCtx = null;
    this.position = 'mid-screen';
    this.animFrameId = null;

    if (!this.container) {
      this.container = document.createElement('div');
      this.container.id = containerId;
      document.body.appendChild(this.container);
    }

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

  playCommsChirp() {
    if (!this.audioCtx) return;
    try {
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.exponentialRampToValueAtTime(1760, now + 0.08);
      osc.frequency.exponentialRampToValueAtTime(1320, now + 0.16);

      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.22);
    } catch (e) {}
  }

  _initDom() {
    this.container.className = `story-dialog-container pos-${this.position}`;
    this.container.innerHTML = `
      <div class="story-dialog-card" role="dialog" aria-modal="true" aria-labelledby="dialog-heading">
        <div class="story-dialog-header">
          <div class="comm-indicator">
            <span class="comm-pulse-dot"></span>
            <span class="comm-channel">INCOMING TRANSMISSION // SEC-COMMS</span>
          </div>
          <canvas class="comm-wave-canvas" width="100" height="18"></canvas>
          <button type="button" class="comm-close-btn" id="dialog-close-btn" title="Minimize Comms [ESC]">&times;</button>
        </div>
        <div class="story-dialog-body">
          <div class="speaker-row">
            <div class="speaker-avatar">
              <span class="speaker-glyph">📡</span>
            </div>
            <div class="speaker-meta">
              <div class="speaker-name" id="dialog-speaker-name">A.U.R.A. v4.2</div>
              <div class="speaker-role" id="dialog-speaker-role">AI TACTICAL COMPANION</div>
            </div>
            <div class="dialog-act-badge" id="dialog-act-badge">ACT I</div>
          </div>
          <h3 class="story-dialog-title" id="dialog-heading">Crash-Landed in Hostile Frontier</h3>
          <p class="story-dialog-text" id="dialog-text"></p>
          <div class="story-dialog-directive">
            <span class="directive-badge">DIRECTIVE</span>
            <span class="directive-summary" id="dialog-directive"></span>
          </div>
        </div>
        <div class="story-dialog-actions">
          <button type="button" class="dialog-btn dialog-btn-secondary" id="dialog-replay-btn">Replay Audio</button>
          <button type="button" class="dialog-btn dialog-btn-primary" id="dialog-confirm-btn">Confirm Directive [E]</button>
        </div>
      </div>
    `;

    this.canvas = this.container.querySelector('.comm-wave-canvas');
    this.ctx = this.canvas ? this.canvas.getContext('2d') : null;

    this.container.querySelector('#dialog-close-btn')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#dialog-confirm-btn')?.addEventListener('click', () => this.hide());
    this.container.querySelector('#dialog-replay-btn')?.addEventListener('click', () => {
      this.playCommsChirp();
      this._startWaveAnimation();
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (!this.isOpen) return;
      if (e.key === 'Escape') {
        e.preventDefault();
        this.hide();
      } else if (e.key === 'e' || e.key === 'E' || e.key === 'Enter') {
        e.preventDefault();
        this.hide();
      }
    });

    this.container.style.display = 'none';
  }

  setPosition(pos) {
    const valid = ['mid-screen', 'bottom-left', 'bottom-right'];
    if (!valid.includes(pos)) pos = 'mid-screen';
    this.position = pos;
    this.container.className = `story-dialog-container pos-${pos}`;
  }

  show(chapter) {
    if (!chapter) return;
    this.currentChapter = chapter;
    const log = chapter.storyLog || {
      speaker: 'A.U.R.A. // TACTICAL SUIT AI',
      speakerRole: 'AI COMPANION',
      title: chapter.title,
      text: 'New tactical objective received.',
      directive: chapter.tasks?.map((t) => t.label).join(' • ') || ''
    };

    const spName = this.container.querySelector('#dialog-speaker-name');
    const spRole = this.container.querySelector('#dialog-speaker-role');
    const actBadge = this.container.querySelector('#dialog-act-badge');
    const heading = this.container.querySelector('#dialog-heading');
    const bodyText = this.container.querySelector('#dialog-text');
    const directive = this.container.querySelector('#dialog-directive');

    if (spName) spName.textContent = log.speaker || 'COMMAND COMM';
    if (spRole) spRole.textContent = log.speakerRole || 'TACTICAL TRANSMISSION';
    if (actBadge) actBadge.textContent = chapter.act || chapter.shortTitle || 'MISSION';
    if (heading) heading.textContent = log.title || chapter.title;
    if (bodyText) bodyText.textContent = log.text;
    if (directive) directive.textContent = log.directive || chapter.title;

    this.container.style.display = 'flex';
    this.container.classList.add('visible');
    this.isOpen = true;

    this.playCommsChirp();
    this._startWaveAnimation();
  }

  hide() {
    this.container.classList.remove('visible');
    this.container.style.display = 'none';
    this.isOpen = false;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      this.animFrameId = null;
    }
  }

  toggle(chapter) {
    if (this.isOpen) {
      this.hide();
    } else {
      this.show(chapter || this.currentChapter);
    }
  }

  _startWaveAnimation() {
    if (!this.ctx || !this.canvas) return;
    let t = 0;
    const draw = () => {
      if (!this.isOpen) return;
      t += 0.15;
      const w = this.canvas.width;
      const h = this.canvas.height;
      this.ctx.clearRect(0, 0, w, h);

      this.ctx.strokeStyle = '#00f5d4';
      this.ctx.lineWidth = 1.5;
      this.ctx.beginPath();

      const bars = 16;
      const barWidth = w / bars;
      for (let i = 0; i < bars; i++) {
        const amp = Math.sin(t + i * 0.45) * 0.5 + 0.5;
        const barH = 3 + amp * (h - 6);
        const x = i * barWidth + 2;
        const y = (h - barH) / 2;
        this.ctx.fillStyle = i % 3 === 0 ? '#ff1eff' : '#00f5d4';
        this.ctx.fillRect(x, y, barWidth - 3, barH);
      }

      this.animFrameId = requestAnimationFrame(draw);
    };
    if (this.animFrameId) cancelAnimationFrame(this.animFrameId);
    this.animFrameId = requestAnimationFrame(draw);
  }
}
