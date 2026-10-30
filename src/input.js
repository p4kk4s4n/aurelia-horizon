// Keyboard, mouse & touchscreen input manager with dynamic keybinding system

export function formatKeyCode(code) {
  if (!code) return 'NONE';
  if (code.startsWith('Key')) return code.slice(3).toUpperCase();
  if (code.startsWith('Digit')) return code.slice(5);
  if (code.startsWith('Numpad')) return 'NUM-' + code.slice(6);
  switch (code) {
    case 'Space': return 'SPACE';
    case 'ShiftLeft': return 'L-SHIFT';
    case 'ShiftRight': return 'R-SHIFT';
    case 'ControlLeft': return 'L-CTRL';
    case 'ControlRight': return 'R-CTRL';
    case 'AltLeft': return 'L-ALT';
    case 'AltRight': return 'R-ALT';
    case 'ArrowUp': return 'UP ↑';
    case 'ArrowDown': return 'DOWN ↓';
    case 'ArrowLeft': return 'LEFT ←';
    case 'ArrowRight': return 'RIGHT →';
    case 'Enter': return 'ENTER';
    case 'Tab': return 'TAB';
    case 'Escape': return 'ESC';
    case 'Backspace': return 'BKSP';
    default: return code.toUpperCase();
  }
}

export const DEFAULT_KEYBINDINGS = {
  // On-Foot Controls
  moveForward: { label: 'Move Forward', category: 'on_foot', primary: 'KeyW', secondary: 'ArrowUp' },
  moveBackward: { label: 'Move Backward', category: 'on_foot', primary: 'KeyS', secondary: 'ArrowDown' },
  strafeLeft: { label: 'Strafe Left', category: 'on_foot', primary: 'KeyA', secondary: 'ArrowLeft' },
  strafeRight: { label: 'Strafe Right', category: 'on_foot', primary: 'KeyD', secondary: 'ArrowRight' },
  sprint: { label: 'Sprint / Run', category: 'on_foot', primary: 'ShiftLeft', secondary: 'ShiftRight' },
  jump: { label: 'Jump / Jetpack Boost', category: 'on_foot', primary: 'Space', secondary: '' },
  dive: { label: 'Dive / Swim Down', category: 'on_foot', primary: 'KeyC', secondary: '' },
  interact: { label: 'Interact / Collect / Board', category: 'on_foot', primary: 'KeyE', secondary: '' },

  // Flight Controls
  flightThrustForward: { label: 'Forward Thrust', category: 'flight', primary: 'KeyW', secondary: 'ArrowUp' },
  flightThrustBackward: { label: 'Reverse Thrust / Brake', category: 'flight', primary: 'KeyS', secondary: 'ArrowDown' },
  flightStrafeLeft: { label: 'Strafe Left', category: 'flight', primary: 'KeyA', secondary: 'ArrowLeft' },
  flightStrafeRight: { label: 'Strafe Right', category: 'flight', primary: 'KeyD', secondary: 'ArrowRight' },
  flightAscend: { label: 'Ascend / Lift Off', category: 'flight', primary: 'Space', secondary: '' },
  flightDescend: { label: 'Descend / Land', category: 'flight', primary: 'ControlLeft', secondary: 'KeyC' },
  flightRollLeft: { label: '6DoF Roll Left', category: 'flight', primary: 'KeyQ', secondary: '' },
  flightRollRight: { label: '6DoF Roll Right', category: 'flight', primary: 'KeyE', secondary: '' },
  flightBoost: { label: 'Afterburner Boost', category: 'flight', primary: 'ShiftLeft', secondary: 'ShiftRight' },
  flightSAS: { label: 'Cycle SAS Flight Assist', category: 'flight', primary: 'KeyO', secondary: '' },
  flightCycleTarget: { label: 'Cycle Nav Target', category: 'flight', primary: 'KeyT', secondary: '' },
  flightFire: { label: 'Fire Pulse Cannons', category: 'flight', primary: 'KeyF', secondary: '' },
  flightDisembark: { label: 'Disembark (Landed)', category: 'flight', primary: 'KeyE', secondary: '' },

  // System & Fast Travel Shortcuts
  toggleSettings: { label: 'Settings & Updates', category: 'system', primary: 'KeyP', secondary: '' },
  quickRepair: { label: 'Fast Travel: Aurelia Base Camp', category: 'shortcuts', primary: 'Digit1', secondary: 'Numpad1' },
  quickOrbit: { label: 'Fast Travel: Planet Orbit View', category: 'shortcuts', primary: 'Digit2', secondary: 'Numpad2' },
  quickMoon1: { label: 'Fast Travel: Moon I (Lumen)', category: 'shortcuts', primary: 'Digit3', secondary: 'Numpad3' },
  quickMoon2: { label: 'Fast Travel: Moon II (Pyra)', category: 'shortcuts', primary: 'Digit4', secondary: 'Numpad4' },
  quickMoon3: { label: 'Fast Travel: Moon III (Goliath)', category: 'shortcuts', primary: 'Digit5', secondary: 'Numpad5' }
};

const STORAGE_KEYBINDINGS = 'aurelia_keybindings';

export class InputManager {
  constructor(domElement) {
    this.domElement = domElement;
    this.keys = new Set();
    this.justPressed = new Set();
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    this.touchLookSensitivity = 1.0;
    this.mouseDown = false;
    this.rightMouseDown = false;
    this.pointerLocked = false;
    this.wheelDelta = 0;

    // Analog axes from touch / gamepad (range: -1 to 1)
    this.moveX = 0;
    this.moveY = 0;
    // Continuous look rates from right joystick (yaw/pitch speed)
    this.lookVelX = 0;
    this.lookVelY = 0;
    // Direct roll rate (-1 for roll left, +1 for roll right)
    this.rollRate = 0;

    // Virtual action states (from touch buttons or custom triggers)
    this.virtualActionsDown = new Set();
    this.virtualActionsPressed = new Set();

    // Keybindings & change listeners
    this.bindingsChangeListeners = [];
    this.keybindings = this._loadKeybindings();

    // Flag indicating if user recently touched the screen
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    window.addEventListener('keydown', (e) => {
      const code = e.code || e.key;
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);

      // Prevent scrolling on navigation keys during gameplay unless in input fields
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        if (!e.target.matches('input, textarea, select')) {
          e.preventDefault();
        }
      }
    });

    window.addEventListener('keyup', (e) => {
      const code = e.code || e.key;
      this.keys.delete(code);
    });

    domElement.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'touch') {
        this.isTouchDevice = true;
        return; // Don't lock pointer for touch taps on canvas
      }
      if (e.button === 0) this.mouseDown = true;
      if (e.button === 2) this.rightMouseDown = true;
      if (!this.pointerLocked && domElement.requestPointerLock) {
        try {
          domElement.requestPointerLock();
        } catch (_) {
          // Fallback to drag if pointer lock is blocked
        }
      }
    });

    window.addEventListener('pointerup', (e) => {
      if (e.pointerType === 'touch') return;
      if (e.button === 0) this.mouseDown = false;
      if (e.button === 2) this.rightMouseDown = false;
    });

    window.addEventListener('contextmenu', (e) => e.preventDefault());

    document.addEventListener('pointerlockchange', () => {
      this.pointerLocked = document.pointerLockElement === domElement;
    });

    window.addEventListener('mousemove', (e) => {
      if (this.pointerLocked || this.mouseDown || this.rightMouseDown) {
        this.mouseDeltaX += e.movementX || 0;
        this.mouseDeltaY += e.movementY || 0;
      }
    });

    window.addEventListener('wheel', (e) => {
      this.wheelDelta += Math.sign(e.deltaY);
    }, { passive: true });
  }

  // --- Dynamic Keybindings Management ---

  _loadKeybindings() {
    const bindings = {};
    for (const [action, def] of Object.entries(DEFAULT_KEYBINDINGS)) {
      bindings[action] = { ...def };
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEYBINDINGS);
      if (saved) {
        const parsed = JSON.parse(saved);
        for (const [action, keys] of Object.entries(parsed)) {
          if (bindings[action]) {
            if (typeof keys.primary === 'string') bindings[action].primary = keys.primary;
            if (typeof keys.secondary === 'string') bindings[action].secondary = keys.secondary;
          }
        }
      }
    } catch (_) {}

    return bindings;
  }

  _saveKeybindings() {
    try {
      const toSave = {};
      for (const [action, def] of Object.entries(this.keybindings)) {
        toSave[action] = { primary: def.primary, secondary: def.secondary };
      }
      localStorage.setItem(STORAGE_KEYBINDINGS, JSON.stringify(toSave));
    } catch (_) {}
  }

  onBindingsChanged(fn) {
    this.bindingsChangeListeners.push(fn);
  }

  notifyBindingsChanged() {
    for (const fn of this.bindingsChangeListeners) {
      try { fn(this.keybindings); } catch (_) {}
    }
  }

  rebindAction(actionName, newCode, slot = 'primary') {
    if (!this.keybindings[actionName]) return false;
    this.keybindings[actionName][slot] = newCode;
    this._saveKeybindings();
    this.notifyBindingsChanged();
    return true;
  }

  resetKeybindings() {
    for (const [action, def] of Object.entries(DEFAULT_KEYBINDINGS)) {
      this.keybindings[action] = { ...def };
    }
    this._saveKeybindings();
    this.notifyBindingsChanged();
  }

  getActionKeyLabel(actionName, slot = 'primary') {
    const binding = this.keybindings[actionName];
    if (!binding) return '';
    return formatKeyCode(binding[slot]);
  }

  getActionDisplayString(actionName) {
    const binding = this.keybindings[actionName];
    if (!binding) return '';
    const prim = formatKeyCode(binding.primary);
    const sec = binding.secondary ? formatKeyCode(binding.secondary) : '';
    return sec && sec !== 'NONE' ? `${prim} / ${sec}` : prim;
  }

  isActionDown(actionName) {
    if (this.virtualActionsDown.has(actionName)) return true;
    const b = this.keybindings[actionName];
    if (!b) return false;
    return (b.primary && this.keys.has(b.primary)) || (b.secondary && this.keys.has(b.secondary));
  }

  wasActionPressed(actionName) {
    if (this.virtualActionsPressed.has(actionName)) return true;
    const b = this.keybindings[actionName];
    if (!b) return false;
    return (b.primary && this.justPressed.has(b.primary)) || (b.secondary && this.justPressed.has(b.secondary));
  }

  setVirtualAction(actionName, isDown) {
    if (isDown) {
      if (!this.virtualActionsDown.has(actionName)) {
        this.virtualActionsPressed.add(actionName);
      }
      this.virtualActionsDown.add(actionName);
    } else {
      this.virtualActionsDown.delete(actionName);
    }
  }

  triggerVirtualAction(actionName) {
    this.virtualActionsPressed.add(actionName);
  }

  // --- Virtual Raw Key API (Backwards-compatibility & Touch) ---

  setVirtualKey(code, isDown) {
    if (isDown) {
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);
    } else {
      this.keys.delete(code);
    }
  }

  triggerVirtualPress(code) {
    this.justPressed.add(code);
  }

  addTouchLookDelta(dx, dy) {
    this.touchLookDeltaX += dx * this.touchLookSensitivity;
    this.touchLookDeltaY += dy * this.touchLookSensitivity;
  }

  isDown(code) {
    return this.keys.has(code);
  }

  wasPressed(code) {
    return this.justPressed.has(code);
  }

  consumeFrame() {
    const dx = this.mouseDeltaX + this.touchLookDeltaX;
    const dy = this.mouseDeltaY + this.touchLookDeltaY;
    const wheel = this.wheelDelta;
    this.mouseDeltaX = 0;
    this.mouseDeltaY = 0;
    this.touchLookDeltaX = 0;
    this.touchLookDeltaY = 0;
    this.wheelDelta = 0;
    // NOTE: do NOT clear justPressed here so updates throughout the entire frame can read it!
    return { dx, dy, wheel };
  }

  endFrame() {
    this.justPressed.clear();
    this.virtualActionsPressed.clear();
  }
}
