/**
 * Mobile & Touchscreen Controls Manager
 * Supports:
 * 1. Dual Virtual Joysticks ('dual-sticks')
 * 2. Floating Left Stick + Right Touch-Look Area ('floating-look')
 * 3. Virtual D-Pad + Right Touch-Look Area ('dpad-look')
 * Multi-touch PointerEvents with context-aware action clusters (On-Foot vs Starfighter).
 */

const STORAGE_SCHEME_KEY = 'aurelia_touch_scheme';
const STORAGE_VIS_KEY = 'aurelia_touch_visibility';
const STORAGE_SENS_KEY = 'aurelia_touch_sensitivity';

export class TouchControlsManager {
  constructor(input, onNotice) {
    this.input = input;
    this.onNotice = onNotice;

    this.scheme = localStorage.getItem(STORAGE_SCHEME_KEY) || 'dual-sticks';
    this.visibility = localStorage.getItem(STORAGE_VIS_KEY) || 'auto';
    this.sensitivity = parseFloat(localStorage.getItem(STORAGE_SENS_KEY) || '1.0');
    this.input.touchLookSensitivity = this.sensitivity;

    this.container = document.getElementById('touch-controls');
    this.leftZone = document.getElementById('touch-left-zone');
    this.rightZone = document.getElementById('touch-right-zone');

    this.leftStickBase = document.getElementById('left-stick-base');
    this.leftStickKnob = document.getElementById('left-stick-knob');
    this.rightStickBase = document.getElementById('right-stick-base');
    this.rightStickKnob = document.getElementById('right-stick-knob');
    this.dpadContainer = document.getElementById('touch-dpad');

    this.footActions = document.getElementById('touch-foot-actions');
    this.shipActions = document.getElementById('touch-ship-actions');

    this.btnSprint = document.getElementById('btn-touch-sprint');
    this.btnJump = document.getElementById('btn-touch-jump');
    this.btnInteract = document.getElementById('btn-touch-interact');

    this.btnFire = document.getElementById('btn-touch-fire');
    this.btnBoost = document.getElementById('btn-touch-boost');
    this.btnAscend = document.getElementById('btn-touch-ascend');
    this.btnDescend = document.getElementById('btn-touch-descend');
    this.btnRollL = document.getElementById('btn-touch-roll-l');
    this.btnRollR = document.getElementById('btn-touch-roll-r');
    this.btnOrbit = document.getElementById('btn-touch-orbit');
    this.btnExit = document.getElementById('btn-touch-exit');

    // Pointer state tracking
    this.leftPointerId = null;
    this.rightPointerId = null;
    this.leftOrigin = { x: 0, y: 0 };
    this.rightOrigin = { x: 0, y: 0 };
    this.rightPrevPos = { x: 0, y: 0 };

    this.maxStickRadius = 45;
    this.sprintLatched = false;
    this.currentMode = 'EXPLORING';

    this._setupPointerEvents();
    this._setupActionButtons();
    this.applyScheme(this.scheme);
    this.applyVisibility(this.visibility);

    // Auto-detect first touch if in 'auto' mode
    window.addEventListener('touchstart', () => {
      this.input.isTouchDevice = true;
      if (this.visibility === 'auto') {
        this._updateVisibilityDisplay(true);
      }
    }, { once: true, passive: true });
  }

  setSensitivity(val) {
    this.sensitivity = Math.max(0.3, Math.min(3.0, parseFloat(val) || 1.0));
    this.input.touchLookSensitivity = this.sensitivity;
    localStorage.setItem(STORAGE_SENS_KEY, this.sensitivity.toString());
  }

  applyVisibility(vis) {
    this.visibility = ['auto', 'always', 'hidden'].includes(vis) ? vis : 'auto';
    localStorage.setItem(STORAGE_VIS_KEY, this.visibility);

    if (this.visibility === 'always') {
      this._updateVisibilityDisplay(true);
    } else if (this.visibility === 'hidden') {
      this._updateVisibilityDisplay(false);
    } else {
      // auto
      const isTouch = this.input.isTouchDevice || ('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || window.innerWidth <= 960;
      this._updateVisibilityDisplay(isTouch);
    }
  }

  _updateVisibilityDisplay(show) {
    if (!this.container) return;
    this.container.classList.toggle('visible', Boolean(show));

    // Also hide the desktop keyboard controls footer when touch controls are shown
    const keyboardFooter = document.getElementById('hud-controls');
    if (keyboardFooter) {
      keyboardFooter.style.display = show ? 'none' : 'flex';
    }
  }

  applyScheme(scheme) {
    this.scheme = ['dual-sticks', 'floating-look', 'dpad-look'].includes(scheme) ? scheme : 'dual-sticks';
    localStorage.setItem(STORAGE_SCHEME_KEY, this.scheme);

    if (!this.container) return;
    this.container.dataset.scheme = this.scheme;

    // Reset joystick knobs & positions
    this._resetLeftStick();
    this._resetRightStick();

    // Toggle DOM elements
    if (this.dpadContainer) {
      this.dpadContainer.style.display = (this.scheme === 'dpad-look') ? 'grid' : 'none';
    }
    if (this.leftStickBase) {
      this.leftStickBase.style.display = (this.scheme === 'dpad-look') ? 'none' : 'block';
      if (this.scheme === 'floating-look') {
        this.leftStickBase.classList.add('floating');
        this.leftStickBase.style.opacity = '0';
      } else {
        this.leftStickBase.classList.remove('floating');
        this.leftStickBase.style.opacity = '1';
        this.leftStickBase.style.left = '35px';
        this.leftStickBase.style.bottom = '35px';
        this.leftStickBase.style.transform = 'none';
      }
    }
    if (this.rightStickBase) {
      this.rightStickBase.style.display = (this.scheme === 'dual-sticks') ? 'block' : 'none';
    }
  }

  _resetLeftStick() {
    this.input.moveX = 0;
    this.input.moveY = 0;
    if (this.leftStickKnob) {
      this.leftStickKnob.style.transform = 'translate(0px, 0px)';
    }
    if (this.scheme === 'floating-look' && this.leftStickBase) {
      this.leftStickBase.style.opacity = '0';
    }
  }

  _resetRightStick() {
    this.input.lookVelX = 0;
    this.input.lookVelY = 0;
    if (this.rightStickKnob) {
      this.rightStickKnob.style.transform = 'translate(0px, 0px)';
    }
  }

  _setupPointerEvents() {
    if (!this.container) return;

    // Left Touch Zone (Movement)
    this.leftZone?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('#touch-dpad')) return; // D-Pad handled separately
      if (this.leftPointerId !== null) return;
      this.leftPointerId = e.pointerId;
      this.leftZone.setPointerCapture(e.pointerId);

      const rect = this.leftZone.getBoundingClientRect();
      const clientX = e.clientX;
      const clientY = e.clientY;

      if (this.scheme === 'floating-look') {
        this.leftOrigin = { x: clientX, y: clientY };
        this.leftStickBase.style.left = `${clientX - rect.left}px`;
        this.leftStickBase.style.top = `${clientY - rect.top}px`;
        this.leftStickBase.style.bottom = 'auto';
        this.leftStickBase.style.opacity = '1';
      } else if (this.leftStickBase) {
        const baseRect = this.leftStickBase.getBoundingClientRect();
        this.leftOrigin = {
          x: baseRect.left + baseRect.width / 2,
          y: baseRect.top + baseRect.height / 2
        };
      }
      this._updateLeftStickPos(clientX, clientY);
    });

    this.leftZone?.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.leftPointerId) return;
      this._updateLeftStickPos(e.clientX, e.clientY);
    });

    const endLeft = (e) => {
      if (e.pointerId === this.leftPointerId) {
        this.leftPointerId = null;
        this._resetLeftStick();
      }
    };
    this.leftZone?.addEventListener('pointerup', endLeft);
    this.leftZone?.addEventListener('pointercancel', endLeft);

    // Right Touch Zone (Camera Look / Steering)
    this.rightZone?.addEventListener('pointerdown', (e) => {
      // Ignore if clicking an action button
      if (e.target.closest('.touch-btn')) return;
      if (this.rightPointerId !== null) return;
      this.rightPointerId = e.pointerId;
      this.rightZone.setPointerCapture(e.pointerId);

      if (this.scheme === 'dual-sticks') {
        const baseRect = this.rightStickBase.getBoundingClientRect();
        this.rightOrigin = {
          x: baseRect.left + baseRect.width / 2,
          y: baseRect.top + baseRect.height / 2
        };
        this._updateRightStickPos(e.clientX, e.clientY);
      } else {
        // Trackpad drag look
        this.rightPrevPos = { x: e.clientX, y: e.clientY };
      }
    });

    this.rightZone?.addEventListener('pointermove', (e) => {
      if (e.pointerId !== this.rightPointerId) return;

      if (this.scheme === 'dual-sticks') {
        this._updateRightStickPos(e.clientX, e.clientY);
      } else {
        const dx = e.clientX - this.rightPrevPos.x;
        const dy = e.clientY - this.rightPrevPos.y;
        this.rightPrevPos = { x: e.clientX, y: e.clientY };
        this.input.addTouchLookDelta(dx, dy);
      }
    });

    const endRight = (e) => {
      if (e.pointerId === this.rightPointerId) {
        this.rightPointerId = null;
        this._resetRightStick();
      }
    };
    this.rightZone?.addEventListener('pointerup', endRight);
    this.rightZone?.addEventListener('pointercancel', endRight);

    // D-Pad buttons
    if (this.dpadContainer) {
      const dirs = [
        { id: 'dpad-up', dx: 0, dy: 1 },
        { id: 'dpad-down', dx: 0, dy: -1 },
        { id: 'dpad-left', dx: -1, dy: 0 },
        { id: 'dpad-right', dx: 1, dy: 0 }
      ];
      dirs.forEach(({ id, dx, dy }) => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.input.moveX = dx;
          this.input.moveY = dy;
          el.classList.add('active');
        });
        const release = (e) => {
          e.preventDefault();
          if (this.input.moveX === dx) this.input.moveX = 0;
          if (this.input.moveY === dy) this.input.moveY = 0;
          el.classList.remove('active');
        };
        el.addEventListener('pointerup', release);
        el.addEventListener('pointercancel', release);
      });
    }
  }

  _updateLeftStickPos(clientX, clientY) {
    const dx = clientX - this.leftOrigin.x;
    const dy = clientY - this.leftOrigin.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxStickRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (this.leftStickKnob) {
      this.leftStickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    const norm = clampedDist / this.maxStickRadius;
    this.input.moveX = Math.cos(angle) * norm;
    this.input.moveY = -Math.sin(angle) * norm; // Screen Y is inverted from Forward (+Z)
  }

  _updateRightStickPos(clientX, clientY) {
    const dx = clientX - this.rightOrigin.x;
    const dy = clientY - this.rightOrigin.y;
    const dist = Math.hypot(dx, dy);
    const clampedDist = Math.min(dist, this.maxStickRadius);
    const angle = Math.atan2(dy, dx);

    const knobX = Math.cos(angle) * clampedDist;
    const knobY = Math.sin(angle) * clampedDist;

    if (this.rightStickKnob) {
      this.rightStickKnob.style.transform = `translate(${knobX}px, ${knobY}px)`;
    }

    const norm = (clampedDist / this.maxStickRadius) * this.sensitivity;
    this.input.lookVelX = Math.cos(angle) * norm;
    this.input.lookVelY = Math.sin(angle) * norm;
  }

  _setupActionButtons() {
    const bindHold = (btn, code) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.setVirtualKey(code, true);
        btn.classList.add('active');
      });
      const end = (e) => {
        e.preventDefault();
        this.input.setVirtualKey(code, false);
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    };

    const bindTap = (btn, code) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.triggerVirtualPress(code);
        btn.classList.add('active');
      });
      const end = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    };

    // On-Foot actions
    bindHold(this.btnJump, 'Space'); // Hold for jetpack, tap for jump
    bindTap(this.btnInteract, 'KeyE');

    // Sprint toggle button
    this.btnSprint?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.sprintLatched = !this.sprintLatched;
      this.input.setVirtualKey('ShiftLeft', this.sprintLatched);
      this.btnSprint.classList.toggle('active', this.sprintLatched);
      if (this.onNotice) {
        this.onNotice(this.sprintLatched ? 'Sprint Lock ON' : 'Sprint Lock OFF', 1.5);
      }
    });

    // Starfighter actions
    bindHold(this.btnFire, 'KeyF');
    bindHold(this.btnBoost, 'ShiftLeft');
    bindHold(this.btnAscend, 'Space');
    bindHold(this.btnDescend, 'ControlLeft');

    // Starfighter 6DoF Axial Roll buttons
    const bindRoll = (btn, rate) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.input.rollRate = rate;
        btn.classList.add('active');
      });
      const end = (e) => {
        e.preventDefault();
        if (this.input.rollRate === rate) this.input.rollRate = 0;
        btn.classList.remove('active');
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('pointerleave', end);
    };

    bindRoll(this.btnRollL, -1);
    bindRoll(this.btnRollR, 1);

    bindTap(this.btnOrbit, 'KeyO');
    bindTap(this.btnExit, 'KeyE');

    // Also clicking the center HUD prompt pill acts as [E]
    const centerPrompt = document.getElementById('hud-prompt');
    centerPrompt?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.input.triggerVirtualPress('KeyE');
    });
  }

  update(mode, state) {
    this.currentMode = mode;
    const isPiloting = (mode === 'PILOTING');

    if (this.footActions) {
      this.footActions.style.display = isPiloting ? 'none' : 'flex';
    }
    if (this.shipActions) {
      this.shipActions.style.display = isPiloting ? 'flex' : 'none';
    }

    if (isPiloting) {
      // Highlight Orbit Assist button when active
      if (this.btnOrbit) {
        this.btnOrbit.classList.toggle('latched', Boolean(state.ship.orbitAssist));
      }
      // Highlight Exit button when landed or hovering low
      if (this.btnExit) {
        const canExit = state.ship.landed || state.ship.altitude < 18;
        this.btnExit.style.opacity = canExit ? '1' : '0.4';
      }
    } else {
      // Highlight Interact button if near a component or ship
      if (this.btnInteract) {
        const hasPrompt = Boolean(state.promptText);
        this.btnInteract.classList.toggle('pulse', hasPrompt);
      }
    }
  }
}
