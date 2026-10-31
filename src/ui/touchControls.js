/**
 * Mobile & Touchscreen Controls Manager with Inactivity Auto-Hide:
 * - 3 Selectable Control Layouts (Dual Sticks, Floating Stick + Look, Virtual D-Pad + Look)
 * - Context-aware action button clusters for On-Foot & Starfighter
 * - 3-Second Idle Auto-Hide: smoothly fades controls out when untouched for 3s, wakes instantly on any touch
 * - Robust Pointer Capture on hold buttons (Boost, Jump/Jet, Fire)
 */

const STORAGE_SCHEME_KEY = 'aurelia_touch_scheme';
const STORAGE_VIS_KEY = 'aurelia_touch_visibility';
const STORAGE_SENS_KEY = 'aurelia_touch_sensitivity';

export class TouchControlsManager {
  constructor(inputManager, onNotice = null) {
    this.input = inputManager;
    this.onNotice = onNotice;

    this.scheme = localStorage.getItem(STORAGE_SCHEME_KEY) || 'dual-sticks';
    this.visibility = localStorage.getItem(STORAGE_VIS_KEY) || 'auto';
    this.sensitivity = parseFloat(localStorage.getItem(STORAGE_SENS_KEY)) || 1.0;
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
    this.btnDive = document.getElementById('btn-touch-dive');
    this.btnInteract = document.getElementById('btn-touch-interact');
    this.btnFootFire = document.getElementById('btn-touch-foot-fire');
    this.btnTouchView = document.getElementById('btn-touch-view');
    this.btnTouchInv = document.getElementById('btn-touch-inv');

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
    this.uiScale = 1.0;
    this.sprintLatched = false;
    this.currentMode = 'EXPLORING';

    // 3-second inactivity auto-hide state
    this.idleTimer = null;
    this.activePointerCount = 0;
    this.isIdleFade = false;

    this._setupPointerEvents();
    this._setupActionButtons();
    this._setupIdleAutoHide();
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

  setUIScale(scale) {
    this.uiScale = Math.max(0.65, Math.min(1.4, parseFloat(scale) || 1.0));
    this.maxStickRadius = 45 * this.uiScale;
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
        this.leftStickBase.style.left = '';
        this.leftStickBase.style.bottom = '';
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

  _setupIdleAutoHide() {
    const onUserTouch = () => {
      this.wakeFromIdle();
      this.resetIdleTimer();
    };

    window.addEventListener('pointerdown', onUserTouch, { passive: true });
    window.addEventListener('touchstart', onUserTouch, { passive: true });
    window.addEventListener('pointermove', () => {
      if (this.activePointerCount > 0) {
        this.resetIdleTimer();
      }
    }, { passive: true });

    this.resetIdleTimer();
  }

  wakeFromIdle() {
    if (this.isIdleFade) {
      this.isIdleFade = false;
      if (this.container) {
        this.container.classList.remove('idle-fade');
      }
    }
  }

  resetIdleTimer() {
    if (this.idleTimer) {
      clearTimeout(this.idleTimer);
      this.idleTimer = null;
    }

    // Do not auto-hide while active touches are held down
    if (this.activePointerCount > 0) return;

    this.idleTimer = setTimeout(() => {
      if (this.activePointerCount === 0) {
        const modal = document.getElementById('settings-modal');
        if (!modal || !modal.classList.contains('open')) {
          this.isIdleFade = true;
          if (this.container && this.container.classList.contains('visible')) {
            this.container.classList.add('idle-fade');
          }
        }
      }
    }, 3000);
  }

  _setupPointerEvents() {
    // Left Touch Zone (Movement / Thrust)
    this.leftZone?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.dpad-btn') || e.target.closest('.touch-btn')) return;
      if (this.leftPointerId !== null) return;
      this.leftPointerId = e.pointerId;
      this.activePointerCount++;
      this.wakeFromIdle();

      try { this.leftZone.setPointerCapture(e.pointerId); } catch (_) {}

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
        this.activePointerCount = Math.max(0, this.activePointerCount - 1);
        try { this.leftZone.releasePointerCapture(e.pointerId); } catch (_) {}
        this._resetLeftStick();
        this.resetIdleTimer();
      }
    };
    this.leftZone?.addEventListener('pointerup', endLeft);
    this.leftZone?.addEventListener('pointercancel', endLeft);

    // Right Touch Zone (Camera Look / Steering)
    this.rightZone?.addEventListener('pointerdown', (e) => {
      if (e.target.closest('.touch-btn')) return;
      if (this.rightPointerId !== null) return;
      this.rightPointerId = e.pointerId;
      this.activePointerCount++;
      this.wakeFromIdle();

      try { this.rightZone.setPointerCapture(e.pointerId); } catch (_) {}

      if (this.scheme === 'dual-sticks') {
        const baseRect = this.rightStickBase.getBoundingClientRect();
        this.rightOrigin = {
          x: baseRect.left + baseRect.width / 2,
          y: baseRect.top + baseRect.height / 2
        };
        this._updateRightStickPos(e.clientX, e.clientY);
      } else {
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
        this.activePointerCount = Math.max(0, this.activePointerCount - 1);
        try { this.rightZone.releasePointerCapture(e.pointerId); } catch (_) {}
        this._resetRightStick();
        this.resetIdleTimer();
      }
    };
    this.rightZone?.addEventListener('pointerup', endRight);
    this.rightZone?.addEventListener('pointercancel', endRight);

    // Virtual D-Pad buttons
    if (this.dpadContainer) {
      const dirs = [
        { id: 'dpad-up', dx: 0, dy: 1 },
        { id: 'dpad-down', dx: 0, dy: -1 },
        { id: 'dpad-left', dx: -1, dy: 0 },
        { id: 'dpad-right', dx: 1, dy: 0 }
      ];
      dirs.forEach(({ id, dx, dy }) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        btn.addEventListener('pointerdown', (e) => {
          e.preventDefault();
          this.activePointerCount++;
          this.wakeFromIdle();
          this.input.moveX = dx;
          this.input.moveY = dy;
          btn.classList.add('active');
        });
        const end = (e) => {
          e.preventDefault();
          this.activePointerCount = Math.max(0, this.activePointerCount - 1);
          if (this.input.moveX === dx) this.input.moveX = 0;
          if (this.input.moveY === dy) this.input.moveY = 0;
          btn.classList.remove('active');
          this.resetIdleTimer();
        };
        btn.addEventListener('pointerup', end);
        btn.addEventListener('pointercancel', end);
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
    this.input.moveY = -Math.sin(angle) * norm;
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
    const bindHold = (btn, code, action = null) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        this.activePointerCount++;
        this.wakeFromIdle();
        this.input.setVirtualKey(code, true);
        if (action && this.input.setVirtualAction) this.input.setVirtualAction(action, true);
        btn.classList.add('active');
      });
      const end = (e) => {
        e.preventDefault();
        try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
        this.activePointerCount = Math.max(0, this.activePointerCount - 1);
        this.input.setVirtualKey(code, false);
        if (action && this.input.setVirtualAction) this.input.setVirtualAction(action, false);
        btn.classList.remove('active');
        this.resetIdleTimer();
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    };

    const bindTap = (btn, code, action = null) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        this.wakeFromIdle();
        this.input.triggerVirtualPress(code);
        if (action && this.input.triggerVirtualAction) this.input.triggerVirtualAction(action);
        btn.classList.add('active');
      });
      const end = (e) => {
        e.preventDefault();
        btn.classList.remove('active');
        this.resetIdleTimer();
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    };

    // On-Foot actions
    bindHold(this.btnJump, 'Space', 'jump');
    bindHold(this.btnDive, 'KeyC', 'dive');
    bindHold(this.btnFootFire, 'KeyF', 'fireWeapon');
    bindTap(this.btnInteract, 'KeyE', 'interact');
    bindTap(this.btnTouchView, 'KeyV', 'toggleCameraView');
    bindTap(this.btnTouchInv, 'KeyI', 'openInventory');

    // Sprint toggle button
    this.btnSprint?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.wakeFromIdle();
      this.sprintLatched = !this.sprintLatched;
      this.input.setVirtualKey('ShiftLeft', this.sprintLatched);
      if (this.input.setVirtualAction) this.input.setVirtualAction('sprint', this.sprintLatched);
      this.btnSprint.classList.toggle('active', this.sprintLatched);
      if (this.onNotice) {
        this.onNotice(this.sprintLatched ? 'Sprint Lock ON' : 'Sprint Lock OFF', 1.5);
      }
      this.resetIdleTimer();
    });

    // Starfighter actions
    bindHold(this.btnFire, 'KeyF', 'flightFire');
    bindHold(this.btnBoost, 'ShiftLeft', 'flightBoost');
    bindHold(this.btnAscend, 'Space', 'flightAscend');
    bindHold(this.btnDescend, 'ControlLeft', 'flightDescend');

    // Starfighter 6DoF Axial Roll buttons
    const bindRoll = (btn, rate, action = null) => {
      if (!btn) return;
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (_) {}
        this.activePointerCount++;
        this.wakeFromIdle();
        this.input.rollRate = rate;
        if (action && this.input.setVirtualAction) this.input.setVirtualAction(action, true);
        btn.classList.add('active');
      });
      const end = (e) => {
        e.preventDefault();
        try { btn.releasePointerCapture(e.pointerId); } catch (_) {}
        this.activePointerCount = Math.max(0, this.activePointerCount - 1);
        if (this.input.rollRate === rate) this.input.rollRate = 0;
        if (action && this.input.setVirtualAction) this.input.setVirtualAction(action, false);
        btn.classList.remove('active');
        this.resetIdleTimer();
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
    };

    bindRoll(this.btnRollL, -1, 'flightRollLeft');
    bindRoll(this.btnRollR, 1, 'flightRollRight');

    bindTap(this.btnOrbit, 'KeyO', 'flightSAS');
    bindTap(this.btnExit, 'KeyE', 'flightDisembark');

    // Center HUD prompt pill tap
    const centerPrompt = document.getElementById('hud-prompt');
    centerPrompt?.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      this.wakeFromIdle();
      this.input.triggerVirtualPress('KeyE');
      if (this.input.triggerVirtualAction) {
        this.input.triggerVirtualAction('interact');
        this.input.triggerVirtualAction('flightDisembark');
      }
      this.resetIdleTimer();
    });
  }

  update(mode, state) {
    this.currentMode = mode;
    const isPiloting = (mode === 'PILOTING');

    if (this.footActions) {
      this.footActions.style.display = isPiloting ? 'none' : 'flex';
      if (this.btnDive) {
        this.btnDive.style.display = (!isPiloting && state.explorer?.isSwimming) ? 'flex' : 'none';
      }
    }
    if (this.shipActions) {
      this.shipActions.style.display = isPiloting ? 'grid' : 'none';
    }

    if (isPiloting) {
      // Highlight SAS / Orbit button when flight assist is engaged
      if (this.btnOrbit) {
        const sasActive = state.ship && state.ship.sasMode && state.ship.sasMode !== 'OFF';
        this.btnOrbit.classList.toggle('latched', Boolean(sasActive));
        const sasLabel = state.ship?.sasMode || 'SAS';
        const labelEl = this.btnOrbit.querySelector('small');
        if (labelEl) labelEl.textContent = sasLabel;
      }
      // Highlight Exit button when landed or hovering low
      if (this.btnExit) {
        const canExit = state.ship.landed || state.ship.altitude < 18;
        this.btnExit.style.opacity = canExit ? '1' : '0.38';
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
