// UI Color Schemes & GitHub Live Version Checker + Auto-Recacher

export const UI_COLOR_SCHEMES = {
  cyan: {
    id: 'cyan',
    name: 'Aurelia Cyan (Default)',
    primary: '#00f5d4',
    secondary: '#ff9f1c',
    bgPanel: 'rgba(8, 18, 34, 0.84)',
    border: 'rgba(0, 245, 212, 0.38)',
    textMain: '#e0fbfc',
    textMuted: '#a9d6e5',
    compass: '#9ef01a'
  },
  amber: {
    id: 'amber',
    name: 'Solar Amber',
    primary: '#ffbe0b',
    secondary: '#fb5607',
    bgPanel: 'rgba(28, 16, 8, 0.85)',
    border: 'rgba(255, 190, 11, 0.42)',
    textMain: '#fff3b0',
    textMuted: '#f4a261',
    compass: '#ffbe0b'
  },
  violet: {
    id: 'violet',
    name: 'Nebula Violet',
    primary: '#c77dff',
    secondary: '#00bbf9',
    bgPanel: 'rgba(22, 10, 38, 0.85)',
    border: 'rgba(199, 125, 255, 0.42)',
    textMain: '#f3d5b5',
    textMuted: '#e0aaff',
    compass: '#72efdd'
  },
  emerald: {
    id: 'emerald',
    name: 'Bio-Luminescent Matrix',
    primary: '#80ed99',
    secondary: '#38a3a5',
    bgPanel: 'rgba(6, 26, 20, 0.85)',
    border: 'rgba(128, 237, 153, 0.42)',
    textMain: '#e9f5db',
    textMuted: '#95d5b2',
    compass: '#b7efc5'
  },
  crimson: {
    id: 'crimson',
    name: 'Crimson Tactical',
    primary: '#ff4d6d',
    secondary: '#ffb703',
    bgPanel: 'rgba(32, 8, 16, 0.85)',
    border: 'rgba(255, 77, 109, 0.45)',
    textMain: '#ffe5ec',
    textMuted: '#ff8fa3',
    compass: '#ffb703'
  }
};

const STORAGE_THEME_KEY = 'aurelia_ui_theme';
const STORAGE_SCALE_KEY = 'aurelia_ui_scale';
const STORAGE_AUTOSCALE_KEY = 'aurelia_ui_autoscale';
const STORAGE_SHA_KEY = 'aurelia_installed_sha';
const STORAGE_VER_KEY = 'aurelia_installed_version';
const STORAGE_VITALS_POS_KEY = 'aurelia_vitals_position';
const STORAGE_DIALOG_POS_KEY = 'aurelia_dialog_position';
const GITHUB_REPO = 'p4kk4s4n/aurelia-horizon';
const GITHUB_BRANCH = 'main';

export const APP_VERSION = '1.22.1';

export function compareSemver(vA, vB) {
  if (!vA || !vB) return 0;
  const parse = (v) => String(v).replace(/^v/i, '').split('.').map((n) => parseInt(n, 10) || 0);
  const a = parse(vA);
  const b = parse(vB);
  for (let i = 0; i < 3; i++) {
    const diff = (a[i] || 0) - (b[i] || 0);
    if (diff !== 0) return diff > 0 ? 1 : -1;
  }
  return 0;
}

export function extractVersionFromCommitMessage(msg) {
  if (!msg) return null;
  const match = msg.match(/\bv?(\d+\.\d+\.\d+)\b/i);
  return match ? match[1] : null;
}

export class SettingsManager {
  constructor(onNotice, touchControls = null, input = null) {
    this.onNotice = onNotice;
    this.touchControls = touchControls;
    this.input = input;
    this.isOpen = false;
    this.listeningBinding = null;
    this.currentThemeId = localStorage.getItem(STORAGE_THEME_KEY) || 'cyan';
    if (!UI_COLOR_SCHEMES[this.currentThemeId]) {
      this.currentThemeId = 'cyan';
    }

    this.modal = document.getElementById('settings-modal');
    this.btnOpen = document.getElementById('btn-open-settings');
    this.btnClose = document.getElementById('btn-close-settings');
    this.themeContainer = document.getElementById('theme-options');
    this.uiScaleSlider = document.getElementById('ui-scale-slider');
    this.uiScaleVal = document.getElementById('ui-scale-val');
    this.uiScaleBadge = document.getElementById('ui-scale-badge');
    this.uiScalePresets = document.getElementById('ui-scale-presets');
    this.btnResetKeybinds = document.getElementById('btn-reset-keybindings');
    this.onfootGrid = document.getElementById('keybinds-onfoot-grid');
    this.flightGrid = document.getElementById('keybinds-flight-grid');
    this.systemGrid = document.getElementById('keybinds-system-grid');
    this.touchVisContainer = document.getElementById('touch-vis-options');
    this.touchSchemeContainer = document.getElementById('touch-scheme-options');
    this.touchSensSlider = document.getElementById('touch-sens-slider');
    this.touchSensVal = document.getElementById('touch-sens-val');
    this.graphicsContainer = document.getElementById('graphics-quality-options');
    this.elInstalledVer = document.getElementById('settings-installed-version');
    this.elLatestVer = document.getElementById('settings-latest-version');
    this.elUpdateStatus = document.getElementById('settings-update-status');
    this.btnCheckUpdate = document.getElementById('btn-check-update');
    this.btnForceRecache = document.getElementById('btn-force-recache');
    this.btnInstallWebapk = document.getElementById('btn-install-webapk');
    this.btnQuickInstall = document.getElementById('btn-quick-install-webapk');
    this.elWebapkStatus = document.getElementById('webapk-install-status');
    this.deferredInstallPrompt = null;

    this.landingAssistContainer = document.getElementById('landing-assist-options');
    this.throttleModeContainer = document.getElementById('throttle-mode-options');
    this.autoLandingAssist = localStorage.getItem('aurelia_auto_landing_assist') !== 'false';
    this.throttleMode = localStorage.getItem('aurelia_throttle_mode') || 'direct';

    this.autoScale = localStorage.getItem(STORAGE_AUTOSCALE_KEY) !== 'false';
    const savedScale = parseFloat(localStorage.getItem(STORAGE_SCALE_KEY));
    this.uiScale = !isNaN(savedScale) ? savedScale : this.calculateOptimalScale();
    this.applyUIScale(this.uiScale, false);

    this.currentQuality = localStorage.getItem('aurelia_graphics_quality') || 'high';
    this.vitalsPosContainer = document.getElementById('vitals-pos-options');
    this.vitalsPosition = localStorage.getItem(STORAGE_VITALS_POS_KEY) || 'top-center';
    this.applyVitalsPosition(this.vitalsPosition, false);

    this.dialogPosContainer = document.getElementById('dialog-pos-options');
    this.dialogPosition = localStorage.getItem(STORAGE_DIALOG_POS_KEY) || 'mid-screen';
    this.applyDialogPosition(this.dialogPosition, false);

    this.storyDialog = null;
    this.objectiveSystem = null;
    this.btnResetCampaign = document.getElementById('btn-reset-campaign');

    this.planet = null;
    this.moons = [];
    this.allBodies = [];
    this._renderThemeButtons();
    this._renderTouchSettings();
    this._renderGraphicsSettings();
    this._renderFlightSettings();
    this._renderVitalsSettings();
    this._renderDialogSettings();
    this._renderKeybindings();
    this.applyTheme(this.currentThemeId);
    this._bindEvents();
    this._checkStandaloneStatus();
    this._initLocalVersionInfo();

    if (this.input) {
      this.input.onBindingsChanged(() => this._renderKeybindings());
    }
  }

  calculateOptimalScale() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const aspect = w / Math.max(1, h);

    if (h <= 500 && aspect >= 1.7) {
      return 0.75;
    }
    if (h <= 600 && aspect >= 1.5) {
      return 0.85;
    }
    if (w <= 500 && aspect <= 0.85) {
      return 0.80;
    }
    if (w <= 1024 || h <= 700) {
      return 0.90;
    }
    return 1.0;
  }

  applyUIScale(scale, save = true) {
    this.uiScale = Math.max(0.65, Math.min(1.40, parseFloat(scale) || 1.0));
    if (save) {
      localStorage.setItem(STORAGE_SCALE_KEY, this.uiScale.toFixed(2));
    }
    document.documentElement.style.setProperty('--ui-scale', this.uiScale.toFixed(2));
    if (this.touchControls?.setUIScale) {
      this.touchControls.setUIScale(this.uiScale);
    }
    this._renderScaleControls();
  }

  _renderScaleControls() {
    if (this.uiScaleSlider) {
      this.uiScaleSlider.value = this.uiScale.toFixed(2);
    }
    const pct = `${Math.round(this.uiScale * 100)}%`;
    if (this.uiScaleVal) this.uiScaleVal.textContent = `${this.uiScale.toFixed(2)}x (${pct})`;
    if (this.uiScaleBadge) this.uiScaleBadge.textContent = pct;

    if (this.uiScalePresets) {
      this.uiScalePresets.querySelectorAll('button').forEach((btn) => {
        const preset = btn.dataset.preset;
        const isActive = (preset === 'auto' && this.autoScale) ||
          (preset === 'compact' && Math.abs(this.uiScale - 0.75) < 0.03 && !this.autoScale) ||
          (preset === 'standard' && Math.abs(this.uiScale - 1.0) < 0.03 && !this.autoScale) ||
          (preset === 'large' && Math.abs(this.uiScale - 1.20) < 0.03 && !this.autoScale);
        btn.classList.toggle('active', isActive);
      });
    }
  }

  setInput(input) {
    this.input = input;
    this._renderKeybindings();
    if (this.input) {
      this.input.onBindingsChanged(() => this._renderKeybindings());
    }
  }

  _renderKeybindings() {
    if (!this.input || !this.input.keybindings) return;

    if (this.onfootGrid) this.onfootGrid.innerHTML = '';
    if (this.flightGrid) this.flightGrid.innerHTML = '';
    if (this.systemGrid) this.systemGrid.innerHTML = '';

    for (const [action, def] of Object.entries(this.input.keybindings)) {
      const row = document.createElement('div');
      row.className = 'keybind-row';

      const label = document.createElement('span');
      label.className = 'keybind-label';
      label.textContent = def.label;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'keybind-btn';
      btn.dataset.action = action;
      btn.dataset.slot = 'primary';
      btn.textContent = this.input.getActionKeyLabel(action, 'primary');

      if (this.listeningBinding && this.listeningBinding.action === action) {
        btn.classList.add('listening');
        btn.textContent = 'PRESS KEY...';
      }

      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        this._startListeningKeybind(action, 'primary', btn);
      });

      row.appendChild(label);
      row.appendChild(btn);

      if (def.category === 'on_foot' && this.onfootGrid) {
        this.onfootGrid.appendChild(row);
      } else if (def.category === 'flight' && this.flightGrid) {
        this.flightGrid.appendChild(row);
      } else if (this.systemGrid) {
        this.systemGrid.appendChild(row);
      }
    }
  }

  _startListeningKeybind(action, slot, btn) {
    if (this.listeningBinding && this.listeningBinding.button) {
      this.listeningBinding.button.classList.remove('listening');
      this.listeningBinding.button.textContent = this.input.getActionKeyLabel(this.listeningBinding.action, this.listeningBinding.slot);
    }
    this.listeningBinding = { action, slot, button: btn };
    btn.classList.add('listening');
    btn.textContent = 'PRESS KEY...';
  }

  setTouchControls(touchControls) {
    this.touchControls = touchControls;
    if (this.touchControls?.setUIScale) {
      this.touchControls.setUIScale(this.uiScale);
    }
    this._renderTouchSettings();
  }

  _renderTouchSettings() {
    if (!this.touchControls) return;

    // Visibility buttons
    if (this.touchVisContainer) {
      this.touchVisContainer.querySelectorAll('button').forEach((btn) => {
        const vis = btn.dataset.vis;
        btn.classList.toggle('active', vis === this.touchControls.visibility);
        btn.onclick = () => {
          this.touchControls.applyVisibility(vis);
          this._renderTouchSettings();
          if (this.onNotice) this.onNotice(`Touch Controls set to: ${vis.toUpperCase()}`);
        };
      });
    }

    // Scheme buttons
    if (this.touchSchemeContainer) {
      this.touchSchemeContainer.querySelectorAll('button').forEach((btn) => {
        const scheme = btn.dataset.scheme;
        btn.classList.toggle('active', scheme === this.touchControls.scheme);
        btn.onclick = () => {
          this.touchControls.applyScheme(scheme);
          this._renderTouchSettings();
          if (this.onNotice) this.onNotice(`Touch Layout set to: ${scheme.replace('-', ' ').toUpperCase()}`);
        };
      });
    }

    // Sensitivity slider
    if (this.touchSensSlider) {
      this.touchSensSlider.value = this.touchControls.sensitivity;
      if (this.touchSensVal) {
        this.touchSensVal.textContent = `${this.touchControls.sensitivity.toFixed(1)}x`;
      }
      this.touchSensSlider.oninput = (e) => {
        const val = parseFloat(e.target.value);
        this.touchControls.setSensitivity(val);
        if (this.touchSensVal) this.touchSensVal.textContent = `${val.toFixed(1)}x`;
      };
    }
  }

  setRenderer(renderer) {
    this.renderer = renderer;
    this.applyGraphicsQuality(this.currentQuality, false);
  }

  setPostProcessing(postProcessing) {
    this.postProcessing = postProcessing;
    this.applyGraphicsQuality(this.currentQuality, false);
  }

  setEnvironment(planet, moons) {
    this.planet = planet;
    this.moons = Array.isArray(moons) ? moons : [];
    this.allBodies = [this.planet, ...this.moons].filter(Boolean);
    if (this.allBodies.length > 0) {
      for (const body of this.allBodies) {
        if (typeof body.setQuality === 'function') {
          body.setQuality(this.currentQuality);
        }
      }
    }
    this._renderGraphicsSettings();
  }

  setExplorer(explorer) {
    this.explorer = explorer;
    // Explorer character model stays at constant sculpted high-fidelity mesh (~12,600+ tris)
    this._renderGraphicsSettings();
  }

  getEnvironmentPolygonCount() {
    let triangles = 0;
    let vertices = 0;
    if (this.allBodies && this.allBodies.length > 0) {
      for (const body of this.allBodies) {
        if (typeof body.getPolygonCount === 'function') {
          const counts = body.getPolygonCount();
          triangles += counts.triangles;
          vertices += counts.vertices;
        }
      }
    }
    return { triangles, vertices };
  }

  setShip(ship) {
    this.ship = ship;
    if (this.ship) {
      this.ship.autoLandingAssist = this.autoLandingAssist;
      this.ship.throttleMode = this.throttleMode;
    }
    this._renderFlightSettings();
  }

  applyAutoLandingAssist(enabled, save = true) {
    this.autoLandingAssist = !!enabled;
    if (save) {
      localStorage.setItem('aurelia_auto_landing_assist', this.autoLandingAssist ? 'true' : 'false');
    }
    if (this.ship) {
      this.ship.autoLandingAssist = this.autoLandingAssist;
    }
    this._renderFlightSettings();
  }

  applyThrottleMode(mode, save = true) {
    this.throttleMode = mode === 'persistent' ? 'persistent' : 'direct';
    if (save) {
      localStorage.setItem('aurelia_throttle_mode', this.throttleMode);
    }
    if (this.ship) {
      this.ship.throttleMode = this.throttleMode;
    }
    this._renderFlightSettings();
  }

  _renderFlightSettings() {
    if (this.landingAssistContainer) {
      this.landingAssistContainer.querySelectorAll('button').forEach((btn) => {
        const val = btn.dataset.assist === 'true';
        btn.classList.toggle('active', val === this.autoLandingAssist);
        btn.onclick = () => {
          this.applyAutoLandingAssist(val, true);
          if (this.onNotice) {
            this.onNotice(`Auto-Safe Landing Assist: ${val ? 'ENABLED (Dampens drift & brakes descent)' : 'DISABLED (Manual touchdown)'}`);
          }
        };
      });
    }

    if (this.throttleModeContainer) {
      this.throttleModeContainer.querySelectorAll('button').forEach((btn) => {
        const mode = btn.dataset.throttle;
        btn.classList.toggle('active', mode === this.throttleMode);
        btn.onclick = () => {
          this.applyThrottleMode(mode, true);
          if (this.onNotice) {
            this.onNotice(`Throttle Mode: ${mode === 'persistent' ? 'PERSISTENT (Z/X to adjust, Backspace to cut)' : 'STANDARD (Hold W/S)'}`);
          }
        };
      });
    }
  }

  applyVitalsPosition(pos, save = true) {
    const valid = ['top-center', 'top-left', 'top-right'];
    if (!valid.includes(pos)) pos = 'top-center';
    this.vitalsPosition = pos;
    if (save) {
      localStorage.setItem(STORAGE_VITALS_POS_KEY, pos);
    }
    document.body.dataset.vitalsPos = pos;
    const vitalsEl = document.getElementById('hud-vitals');
    if (vitalsEl) {
      vitalsEl.classList.remove('pos-top-center', 'pos-top-left', 'pos-top-right');
      vitalsEl.classList.add(`pos-${pos}`);

      // Dynamically reparent vitals panel into its designated zone for natural, collision-free flex flow
      if (pos === 'top-center') {
        const zone = document.getElementById('zone-top-center');
        const noticeStack = document.getElementById('hud-notice');
        if (zone) {
          if (noticeStack && noticeStack.parentNode === zone) {
            zone.insertBefore(vitalsEl, noticeStack);
          } else {
            zone.appendChild(vitalsEl);
          }
        }
      } else if (pos === 'top-left') {
        const zone = document.getElementById('zone-left');
        const hudLeft = document.getElementById('hud-left');
        if (zone) {
          if (hudLeft && hudLeft.parentNode === zone) {
            zone.insertBefore(vitalsEl, hudLeft);
          } else {
            zone.prepend(vitalsEl);
          }
        }
      } else if (pos === 'top-right') {
        const zone = document.getElementById('zone-right');
        const hudRight = document.getElementById('hud-right');
        if (zone) {
          if (hudRight && hudRight.parentNode === zone) {
            zone.insertBefore(vitalsEl, hudRight);
          } else {
            zone.prepend(vitalsEl);
          }
        }
      }
    }
    this._renderVitalsSettings();
  }

  _renderVitalsSettings() {
    if (!this.vitalsPosContainer) return;
    this.vitalsPosContainer.querySelectorAll('button').forEach((btn) => {
      const pos = btn.dataset.pos;
      btn.classList.toggle('active', pos === this.vitalsPosition);
      btn.onclick = () => {
        this.applyVitalsPosition(pos, true);
        if (this.onNotice) {
          this.onNotice(`Vitals HUD moved to ${btn.textContent.trim()}`, 1800);
        }
      };
    });
  }

  setStoryDialog(storyDialog) {
    this.storyDialog = storyDialog;
    if (this.storyDialog) {
      this.storyDialog.setPosition(this.dialogPosition);
    }
  }

  setObjectiveSystem(objectiveSystem) {
    this.objectiveSystem = objectiveSystem;
  }

  applyDialogPosition(pos, save = true) {
    const valid = ['mid-screen', 'bottom-left', 'bottom-right'];
    if (!valid.includes(pos)) pos = 'mid-screen';
    this.dialogPosition = pos;
    if (save) {
      localStorage.setItem(STORAGE_DIALOG_POS_KEY, pos);
    }
    document.body.dataset.dialogPos = pos;
    if (this.storyDialog) {
      this.storyDialog.setPosition(pos);
    }
    const dialogEl = document.getElementById('story-dialog-container');
    if (dialogEl) {
      dialogEl.classList.remove('pos-mid-screen', 'pos-bottom-left', 'pos-bottom-right');
      dialogEl.classList.add(`pos-${pos}`);
    }
    this._renderDialogSettings();
  }

  _renderDialogSettings() {
    if (!this.dialogPosContainer) return;
    this.dialogPosContainer.querySelectorAll('button').forEach((btn) => {
      const pos = btn.dataset.dialogPos;
      btn.classList.toggle('active', pos === this.dialogPosition);
      btn.onclick = () => {
        this.applyDialogPosition(pos, true);
        if (this.onNotice) {
          this.onNotice(`Story Dialog placed at ${btn.textContent.trim()}`, 1800);
        }
      };
    });
  }

  resetCampaignProgress() {
    if (this.objectiveSystem) {
      this.objectiveSystem.resetProgress();
    } else {
      try {
        localStorage.removeItem('aurelia_campaign_save');
        localStorage.removeItem('aurelia_achievements_save');
      } catch (e) {}
      if (this.onNotice) {
        this.onNotice('Campaign progress and achievements reset to Day 1.', 2500);
      }
    }
  }

  _renderGraphicsSettings() {
    if (!this.graphicsContainer) return;
    this.graphicsContainer.querySelectorAll('button').forEach((btn) => {
      const q = btn.dataset.quality;
      btn.classList.toggle('active', q === this.currentQuality);
      btn.onclick = () => {
        this.applyGraphicsQuality(q, true);
        if (this.onNotice) {
          const desc = q === 'high' ? 'HIGH (88-seg Terrain • 1.0x Flora)' : q.toUpperCase();
          this.onNotice(`Environment Graphics Quality set to ${desc}.`);
        }
      };
    });

    const densityNote = document.getElementById('settings-poly-density');
    if (densityNote) {
      const envPoly = this.getEnvironmentPolygonCount();
      const countStr = envPoly && envPoly.triangles > 0 ? ` (~${envPoly.triangles.toLocaleString()} Polygons)` : '';
      const labels = {
        low: `Environment Mesh: Low (${countStr} • 52-seg Terrain & 0.5x Flora)`,
        medium: `Environment Mesh: Medium (${countStr} • 68-seg Terrain & 0.8x Flora)`,
        high: `Environment Mesh: High (${countStr} • 88-seg Terrain & 1.0x Flora • Default)`,
        ultra: `Environment Mesh: Ultra (${countStr} • 108-seg Terrain & 1.4x Flora • Cinematic)`
      };
      densityNote.textContent = labels[this.currentQuality] || `Environment Mesh: ${this.currentQuality.toUpperCase()}`;
    }
  }

  applyGraphicsQuality(quality, save = true) {
    this.currentQuality = quality || 'high';
    if (save) {
      localStorage.setItem('aurelia_graphics_quality', this.currentQuality);
    }
    if (this.renderer) {
      let maxPr = 2.0;
      if (this.currentQuality === 'low') maxPr = 1.0;
      else if (this.currentQuality === 'medium') maxPr = 1.25;
      else if (this.currentQuality === 'high') maxPr = 1.75;
      else if (this.currentQuality === 'ultra') maxPr = 2.5;
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, maxPr));
      this.renderer.setSize(window.innerWidth, window.innerHeight);

      if (this.renderer.shadowMap) {
        this.renderer.shadowMap.enabled = this.currentQuality !== 'low';
      }
    }
    if (this.postProcessing) {
      if (this.currentQuality === 'low') {
        this.postProcessing.setEnabled(false);
      } else if (this.currentQuality === 'medium') {
        this.postProcessing.setEnabled(true);
        this.postProcessing.setBloomIntensity(0.35);
      } else if (this.currentQuality === 'high') {
        this.postProcessing.setEnabled(true);
        this.postProcessing.setBloomIntensity(0.55);
      } else if (this.currentQuality === 'ultra') {
        this.postProcessing.setEnabled(true);
        this.postProcessing.setBloomIntensity(0.85);
      }
      this.postProcessing.setSize(window.innerWidth, window.innerHeight);
    }
    // Scale polygon density for the ENVIRONMENT (planet and moons), NOT the character
    if (this.allBodies && this.allBodies.length > 0) {
      for (const body of this.allBodies) {
        if (typeof body.setQuality === 'function') {
          body.setQuality(this.currentQuality);
        }
      }
    }
    this._renderGraphicsSettings();
  }

  _renderThemeButtons() {
    if (!this.themeContainer) return;
    this.themeContainer.innerHTML = '';

    for (const scheme of Object.values(UI_COLOR_SCHEMES)) {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'theme-option-btn';
      btn.dataset.themeId = scheme.id;
      btn.innerHTML = `
        <span class="theme-swatch" style="background: linear-gradient(135deg, ${scheme.primary}, ${scheme.secondary});"></span>
        <span class="theme-label">${scheme.name}</span>
      `;
      btn.addEventListener('click', () => {
        this.applyTheme(scheme.id);
        if (this.onNotice) {
          this.onNotice(`UI Theme switched to ${scheme.name}`);
        }
      });
      this.themeContainer.appendChild(btn);
    }
  }

  applyTheme(themeId) {
    const scheme = UI_COLOR_SCHEMES[themeId] || UI_COLOR_SCHEMES.cyan;
    this.currentThemeId = scheme.id;
    localStorage.setItem(STORAGE_THEME_KEY, scheme.id);

    const root = document.documentElement;
    root.style.setProperty('--hud-primary', scheme.primary);
    root.style.setProperty('--hud-secondary', scheme.secondary);
    root.style.setProperty('--hud-bg', scheme.bgPanel);
    root.style.setProperty('--hud-border', scheme.border);
    root.style.setProperty('--hud-text', scheme.textMain);
    root.style.setProperty('--hud-muted', scheme.textMuted);
    root.style.setProperty('--hud-compass', scheme.compass);

    const metaTheme = document.querySelector('meta[name="theme-color"]');
    if (metaTheme) metaTheme.setAttribute('content', scheme.primary);

    if (this.themeContainer) {
      for (const btn of this.themeContainer.querySelectorAll('.theme-option-btn')) {
        btn.classList.toggle('active', btn.dataset.themeId === scheme.id);
      }
    }
  }

  getActiveScheme() {
    return UI_COLOR_SCHEMES[this.currentThemeId] || UI_COLOR_SCHEMES.cyan;
  }

  _bindEvents() {
    this.btnOpen?.addEventListener('click', () => this.toggleModal(true));
    this.btnClose?.addEventListener('click', () => this.toggleModal(false));
    this.btnResetCampaign?.addEventListener('click', () => {
      const confirmed = window.confirm('Reset all campaign progress, objectives, and achievements to Day 1?');
      if (confirmed) {
        this.resetCampaignProgress();
      }
    });
    this.btnResetKeybinds?.addEventListener('click', () => {
      if (this.input) {
        this.input.resetKeybindings();
        this._renderKeybindings();
        if (this.onNotice) this.onNotice('All controls reset to defaults.');
      }
    });

    if (this.uiScaleSlider) {
      this.uiScaleSlider.addEventListener('input', (e) => {
        this.autoScale = false;
        localStorage.setItem(STORAGE_AUTOSCALE_KEY, 'false');
        this.applyUIScale(parseFloat(e.target.value), true);
      });
    }

    if (this.uiScalePresets) {
      this.uiScalePresets.querySelectorAll('button').forEach((btn) => {
        btn.addEventListener('click', () => {
          const preset = btn.dataset.preset;
          if (preset === 'auto') {
            this.autoScale = true;
            localStorage.setItem(STORAGE_AUTOSCALE_KEY, 'true');
            const opt = this.calculateOptimalScale();
            this.applyUIScale(opt, false);
            if (this.onNotice) this.onNotice(`UI Scale set to Auto Aspect Fit (${Math.round(opt * 100)}%)`);
          } else if (preset === 'compact') {
            this.autoScale = false;
            localStorage.setItem(STORAGE_AUTOSCALE_KEY, 'false');
            this.applyUIScale(0.75, true);
            if (this.onNotice) this.onNotice('UI Scale set to Compact (75%)');
          } else if (preset === 'standard') {
            this.autoScale = false;
            localStorage.setItem(STORAGE_AUTOSCALE_KEY, 'false');
            this.applyUIScale(1.0, true);
            if (this.onNotice) this.onNotice('UI Scale set to Standard (100%)');
          } else if (preset === 'large') {
            this.autoScale = false;
            localStorage.setItem(STORAGE_AUTOSCALE_KEY, 'false');
            this.applyUIScale(1.20, true);
            if (this.onNotice) this.onNotice('UI Scale set to Large (120%)');
          }
        });
      });
    }

    window.addEventListener('resize', () => {
      if (this.autoScale) {
        const opt = this.calculateOptimalScale();
        this.applyUIScale(opt, false);
      }
    });

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.toggleModal(false);
    });

    window.addEventListener('keydown', (e) => {
      if (this.listeningBinding) {
        e.preventDefault();
        e.stopPropagation();
        const { action, slot } = this.listeningBinding;
        this.listeningBinding = null;
        if (e.code === 'Escape') {
          this._renderKeybindings();
          return;
        }
        if (this.input) {
          this.input.rebindAction(action, e.code, slot);
          this._renderKeybindings();
          const def = this.input.keybindings[action];
          if (this.onNotice) {
            this.onNotice(`Control "${def?.label || action}" bound to [${this.input.getActionKeyLabel(action, slot)}]`);
          }
        }
        return;
      }

      const toggleCode = this.input?.keybindings?.toggleSettings?.primary || 'KeyP';
      if (e.code === toggleCode) {
        this.toggleModal(!this.isOpen);
      } else if (e.code === 'Escape' && this.isOpen) {
        this.toggleModal(false);
      }
    }, true);

    this.btnCheckUpdate?.addEventListener('click', () => this.checkGitHubAndRecache(false));
    this.btnForceRecache?.addEventListener('click', () => this.checkGitHubAndRecache(true));
    this.btnInstallWebapk?.addEventListener('click', () => this.triggerInstallPrompt());
    this.btnQuickInstall?.addEventListener('click', () => this.triggerInstallPrompt());
  }

  _checkStandaloneStatus() {
    const isStandalone = (typeof window !== 'undefined') &&
      ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator?.standalone === true);
    if (isStandalone) {
      if (this.elWebapkStatus) {
        this.elWebapkStatus.textContent = 'App is running in standalone WebAPK mode.';
        this.elWebapkStatus.className = 'update-status updated';
      }
      if (this.btnInstallWebapk) {
        this.btnInstallWebapk.textContent = '✓ Running as Installed WebAPK';
        this.btnInstallWebapk.disabled = true;
      }
      if (this.btnQuickInstall) {
        this.btnQuickInstall.style.display = 'none';
      }
    }
  }

  setInstallPrompt(promptEvent) {
    this.deferredInstallPrompt = promptEvent;
    const isStandalone = (typeof window !== 'undefined') &&
      ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator?.standalone === true);
    if (isStandalone) return;

    if (this.elWebapkStatus) {
      this.elWebapkStatus.textContent = 'WebAPK installation prompt ready! Tap "Install WebAPK App" to add to your device.';
      this.elWebapkStatus.className = 'update-status ready';
    }
    if (this.btnInstallWebapk) {
      this.btnInstallWebapk.disabled = false;
      this.btnInstallWebapk.textContent = '⬇ Install WebAPK App';
    }
    if (this.btnQuickInstall) {
      this.btnQuickInstall.style.display = 'block';
    }
    if (this.onNotice) {
      this.onNotice('WebAPK install prompt ready! Open Settings [P] or tap "Install WebAPK App" to add to home screen.', 6000);
    }
  }

  async triggerInstallPrompt() {
    if (this.deferredInstallPrompt) {
      try {
        this.deferredInstallPrompt.prompt();
        const choice = await this.deferredInstallPrompt.userChoice;
        if (choice && choice.outcome === 'accepted') {
          if (this.onNotice) this.onNotice('WebAPK installation accepted! Android will install Aurelia Horizon.');
          if (this.elWebapkStatus) {
            this.elWebapkStatus.textContent = 'WebAPK installation accepted! Android is installing the app.';
            this.elWebapkStatus.className = 'update-status updated';
          }
          this.deferredInstallPrompt = null;
          if (this.btnQuickInstall) this.btnQuickInstall.style.display = 'none';
        } else {
          if (this.onNotice) this.onNotice('Installation dismissed.');
        }
      } catch (err) {
        console.warn('triggerInstallPrompt error:', err);
      }
    } else {
      const isStandalone = (typeof window !== 'undefined') &&
        ((window.matchMedia && window.matchMedia('(display-mode: standalone)').matches) || window.navigator?.standalone === true);
      if (isStandalone) {
        if (this.onNotice) this.onNotice('Aurelia Horizon is already running in standalone WebAPK mode!');
      } else {
        if (this.onNotice) this.onNotice('In Android Chrome, tap ⋮ -> "Add to Home screen" or "Install App".');
        if (this.elWebapkStatus) {
          this.elWebapkStatus.textContent = 'Browser install prompt pending. In Chrome, tap menu (⋮) -> "Add to Home screen" or "Install app".';
        }
      }
    }
  }

  toggleModal(open) {
    this.isOpen = Boolean(open);
    if (this.listeningBinding) {
      this.listeningBinding = null;
      this._renderKeybindings();
    }
    if (!this.modal) {
      this.modal = document.getElementById('settings-modal');
    }
    if (!this.modal) {
      this.modal = document.createElement('div');
      this.modal.id = 'settings-modal';
      this.modal.className = 'modal-backdrop';
      document.body.appendChild(this.modal);
    }
    if (this.isOpen) {
      if (document.pointerLockElement && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      this._renderKeybindings();
      this.modal.classList.add('open');
      document.body.classList.add('modal-open');
      this.storyDialog?.stashForModal();
    } else {
      this.modal.classList.remove('open');
      const invOpen = document.getElementById('inventory-modal')?.classList.contains('open');
      if (!invOpen) {
        document.body.classList.remove('modal-open');
        this.storyDialog?.restoreFromModal();
      }
    }
  }

  async _initLocalVersionInfo() {
    let resolvedVer = APP_VERSION;
    const savedSha = localStorage.getItem(STORAGE_SHA_KEY) || 'latest';

    try {
      const resp = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (resp.ok) {
        const data = await resp.json();
        if (data && data.version) {
          if (compareSemver(data.version, resolvedVer) > 0) {
            resolvedVer = data.version;
          }
        }
      }
    } catch (_) {}

    const savedVer = localStorage.getItem(STORAGE_VER_KEY);
    if (savedVer && compareSemver(savedVer, resolvedVer) > 0) {
      resolvedVer = savedVer;
    }
    localStorage.setItem(STORAGE_VER_KEY, resolvedVer);

    if (this.elInstalledVer) {
      this.elInstalledVer.textContent = `v${resolvedVer} (${savedSha})`;
    }

    // Proactively query GitHub main branch commit quietly so latest build is visible immediately
    this._checkRemoteCommitQuietly();
  }

  async _checkRemoteCommitQuietly() {
    try {
      const apiResp = await fetch(
        `https://api.github.com/repos/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
        { cache: 'no-store', headers: { Accept: 'application/vnd.github.v3+json' } }
      );
      if (apiResp.ok) {
        const commitData = await apiResp.json();
        if (commitData && commitData.sha) {
          const remoteSha = commitData.sha.slice(0, 7);
          const commitMsg = (commitData.commit?.message || '').split('\n')[0];
          const parsedVer = extractVersionFromCommitMessage(commitMsg);
          const currentVer = localStorage.getItem(STORAGE_VER_KEY) || APP_VERSION;
          let latestVer = currentVer;
          if (parsedVer && compareSemver(parsedVer, latestVer) > 0) {
            latestVer = parsedVer;
          }
          if (this.elLatestVer) {
            this.elLatestVer.textContent = `v${latestVer} (${remoteSha})`;
          }
          const installedSha = localStorage.getItem(STORAGE_SHA_KEY);
          if (!installedSha || installedSha === 'local' || installedSha === 'latest') {
            localStorage.setItem(STORAGE_SHA_KEY, remoteSha);
            if (this.elInstalledVer) {
              this.elInstalledVer.textContent = `v${latestVer} (${remoteSha})`;
            }
          }
        }
      }
    } catch (_) {}
  }

  _setStatus(msg, stateClass = '') {
    if (!this.elUpdateStatus) return;
    this.elUpdateStatus.textContent = msg;
    this.elUpdateStatus.className = `update-status ${stateClass}`;
  }

  async checkGitHubAndRecache(forceRecache = false) {
    if (this.btnCheckUpdate) this.btnCheckUpdate.disabled = true;
    if (this.btnForceRecache) this.btnForceRecache.disabled = true;

    this._setStatus('Checking GitHub (p4kk4s4n/aurelia-horizon@main) for latest build...', 'checking');

    try {
      let remoteSha = null;
      let remoteCommitMsg = '';
      let remoteVersion = null;

      // 1. Query GitHub REST API for latest commit on main
      try {
        const apiResp = await fetch(
          `https://api.github.com/repos/${GITHUB_REPO}/commits/${GITHUB_BRANCH}`,
          { cache: 'no-store', headers: { Accept: 'application/vnd.github.v3+json' } }
        );
        if (apiResp.ok) {
          const commitData = await apiResp.json();
          if (commitData && commitData.sha) {
            remoteSha = commitData.sha.slice(0, 7);
            remoteCommitMsg = (commitData.commit?.message || '').split('\n')[0];
            const parsedCommitVer = extractVersionFromCommitMessage(remoteCommitMsg);
            if (parsedCommitVer) {
              remoteVersion = parsedCommitVer;
            }
          }
        }
      } catch (_) {
        // Fallback if offline or rate-limited
      }

      // 2. Query remote version.json from raw.githubusercontent.com or origin with cache-busting
      try {
        const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/version.json?t=${Date.now()}`;
        const verResp = await fetch(rawUrl, { cache: 'no-store' });
        if (verResp.ok) {
          const vData = await verResp.json();
          if (vData && vData.version) {
            if (!remoteVersion || compareSemver(vData.version, remoteVersion) > 0) {
              remoteVersion = vData.version;
            }
          }
        }
      } catch (_) {}

      if (!remoteVersion) {
        try {
          const localOriginResp = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
          if (localOriginResp.ok) {
            const vData = await localOriginResp.json();
            if (vData && vData.version) {
              remoteVersion = vData.version;
            }
          }
        } catch (_) {}
      }

      if (!remoteVersion || compareSemver(APP_VERSION, remoteVersion) > 0) {
        remoteVersion = APP_VERSION;
      }

      const installedSha = localStorage.getItem(STORAGE_SHA_KEY);
      const installedVer = localStorage.getItem(STORAGE_VER_KEY) || APP_VERSION;

      const latestLabel = `v${remoteVersion || installedVer} (${remoteSha || 'latest'})`;
      if (this.elLatestVer) {
        this.elLatestVer.textContent = latestLabel;
      }

      const hasNewSha = Boolean(remoteSha && installedSha && remoteSha !== installedSha);
      const hasNewVer = Boolean(remoteVersion && compareSemver(remoteVersion, installedVer) > 0);
      const isFirstShaSync = Boolean(remoteSha && (!installedSha || installedSha === 'local' || installedSha === 'latest'));

      if (!forceRecache && !hasNewSha && !hasNewVer) {
        if (isFirstShaSync) {
          localStorage.setItem(STORAGE_SHA_KEY, remoteSha);
          if (remoteVersion) localStorage.setItem(STORAGE_VER_KEY, remoteVersion);
          if (this.elInstalledVer) {
            this.elInstalledVer.textContent = `v${remoteVersion || installedVer} (${remoteSha})`;
          }
        }
        this._setStatus(
          `Up to date! Running latest GitHub version ${latestLabel}${remoteCommitMsg ? ` — "${remoteCommitMsg}"` : ''}.`,
          'up-to-date'
        );
        if (this.onNotice) this.onNotice(`Already on latest GitHub version (${latestLabel}).`);
        return;
      }

      // Perform full recaching!
      this._setStatus(
        forceRecache
          ? `Re-fetching & recaching all game files from ${GITHUB_REPO}...`
          : `New version found (${latestLabel})! Recaching all assets now...`,
        'updating'
      );

      await this._performFullRecache();

      if (remoteSha) localStorage.setItem(STORAGE_SHA_KEY, remoteSha);
      if (remoteVersion) localStorage.setItem(STORAGE_VER_KEY, remoteVersion);

      this._setStatus(`Update complete (${latestLabel})! Reloading into latest version...`, 'up-to-date');
      if (this.onNotice) {
        this.onNotice(`Recached latest version (${latestLabel})! Reloading...`);
      }

      setTimeout(() => {
        const url = new URL(window.location.href);
        url.searchParams.set('v', remoteSha || Date.now());
        window.location.replace(url.toString());
      }, 900);
    } catch (err) {
      this._setStatus(`Update check failed: ${err.message || err}`, 'error');
    } finally {
      if (this.btnCheckUpdate) this.btnCheckUpdate.disabled = false;
      if (this.btnForceRecache) this.btnForceRecache.disabled = false;
    }
  }

  async _performFullRecache() {
    // 1. Ask active Service Worker to purge & recache with cache: 'reload'
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      await new Promise((resolve) => {
        const channel = new MessageChannel();
        const timer = setTimeout(resolve, 4000);
        channel.port1.onmessage = () => {
          clearTimeout(timer);
          resolve();
        };
        navigator.serviceWorker.controller.postMessage({ type: 'RECACHE_ALL' }, [channel.port2]);
      });
    } else if ('caches' in window) {
      const keys = await caches.keys();
      await Promise.all(keys.map((k) => caches.delete(k)));
    }

    // 2. Also trigger ServiceWorkerRegistration.update()
    if ('serviceWorker' in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        try {
          await reg.update();
          if (reg.waiting) {
            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
          }
        } catch (_) {}
      }
    }
  }
}
