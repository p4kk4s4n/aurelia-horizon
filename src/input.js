// Keyboard, mouse & touchscreen input manager with pointer-lock + touch controls support

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

    // Flag indicating if user recently touched the screen
    this.isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

    window.addEventListener('keydown', (e) => {
      const code = e.code;
      if (!this.keys.has(code)) {
        this.justPressed.add(code);
      }
      this.keys.add(code);
      if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(code)) {
        e.preventDefault();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);
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
    this.justPressed.clear();
    return { dx, dy, wheel };
  }
}
