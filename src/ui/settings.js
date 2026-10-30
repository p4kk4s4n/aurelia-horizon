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
const GITHUB_REPO = 'p4kk4s4n/aurelia-horizon';
const GITHUB_BRANCH = 'main';

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

    this.autoScale = localStorage.getItem(STORAGE_AUTOSCALE_KEY) !== 'false';
    const savedScale = parseFloat(localStorage.getItem(STORAGE_SCALE_KEY));
    this.uiScale = !isNaN(savedScale) ? savedScale : this.calculateOptimalScale();
    this.applyUIScale(this.uiScale, false);

    this.currentQuality = localStorage.getItem('aurelia_graphics_quality') || 'high';
    this._renderThemeButtons();
    this._renderTouchSettings();
    this._renderGraphicsSettings();
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

  _renderGraphicsSettings() {
    if (!this.graphicsContainer) return;
    this.graphicsContainer.querySelectorAll('button').forEach((btn) => {
      const q = btn.dataset.quality;
      btn.classList.toggle('active', q === this.currentQuality);
      btn.onclick = () => {
        this.applyGraphicsQuality(q, true);
        if (this.onNotice) {
          this.onNotice(`Graphics Quality set to ${q.toUpperCase()}.`);
        }
      };
    });
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
    if (!this.modal) return;
    if (this.isOpen) {
      if (document.pointerLockElement && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      this._renderKeybindings();
      this.modal.classList.add('open');
    } else {
      this.modal.classList.remove('open');
    }
  }

  async _initLocalVersionInfo() {
    try {
      const resp = await fetch('./version.json');
      if (resp.ok) {
        const data = await resp.json();
        const savedVer = localStorage.getItem(STORAGE_VER_KEY) || data.version;
        localStorage.setItem(STORAGE_VER_KEY, data.version);
        const savedSha = localStorage.getItem(STORAGE_SHA_KEY) || 'local';
        if (this.elInstalledVer) {
          this.elInstalledVer.textContent = `v${data.version} (${savedSha})`;
        }
      }
    } catch (_) {
      if (this.elInstalledVer) {
        this.elInstalledVer.textContent = 'v1.1.0';
      }
    }
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
          remoteVersion = vData.version;
        }
      } catch (_) {}

      if (!remoteVersion) {
        try {
          const localOriginResp = await fetch(`./version.json?t=${Date.now()}`, { cache: 'no-store' });
          if (localOriginResp.ok) {
            const vData = await localOriginResp.json();
            remoteVersion = vData.version;
          }
        } catch (_) {}
      }

      const installedSha = localStorage.getItem(STORAGE_SHA_KEY);
      const installedVer = localStorage.getItem(STORAGE_VER_KEY) || '1.0.0';

      const latestLabel = `v${remoteVersion || installedVer} (${remoteSha || 'latest'})`;
      if (this.elLatestVer) {
        this.elLatestVer.textContent = latestLabel;
      }

      const hasNewSha = Boolean(remoteSha && installedSha && remoteSha !== installedSha);
      const hasNewVer = Boolean(remoteVersion && remoteVersion !== installedVer);
      const isFirstShaSync = Boolean(remoteSha && !installedSha);

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
