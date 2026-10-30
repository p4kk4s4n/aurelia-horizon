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
const STORAGE_SHA_KEY = 'aurelia_installed_sha';
const STORAGE_VER_KEY = 'aurelia_installed_version';
const GITHUB_REPO = 'p4kk4s4n/aurelia-horizon';
const GITHUB_BRANCH = 'main';

export class SettingsManager {
  constructor(onNotice, touchControls = null) {
    this.onNotice = onNotice;
    this.touchControls = touchControls;
    this.isOpen = false;
    this.currentThemeId = localStorage.getItem(STORAGE_THEME_KEY) || 'cyan';
    if (!UI_COLOR_SCHEMES[this.currentThemeId]) {
      this.currentThemeId = 'cyan';
    }

    this.modal = document.getElementById('settings-modal');
    this.btnOpen = document.getElementById('btn-open-settings');
    this.btnClose = document.getElementById('btn-close-settings');
    this.themeContainer = document.getElementById('theme-options');
    this.touchVisContainer = document.getElementById('touch-vis-options');
    this.touchSchemeContainer = document.getElementById('touch-scheme-options');
    this.touchSensSlider = document.getElementById('touch-sens-slider');
    this.touchSensVal = document.getElementById('touch-sens-val');
    this.elInstalledVer = document.getElementById('settings-installed-version');
    this.elLatestVer = document.getElementById('settings-latest-version');
    this.elUpdateStatus = document.getElementById('settings-update-status');
    this.btnCheckUpdate = document.getElementById('btn-check-update');
    this.btnForceRecache = document.getElementById('btn-force-recache');

    this._renderThemeButtons();
    this._renderTouchSettings();
    this.applyTheme(this.currentThemeId);
    this._bindEvents();
    this._initLocalVersionInfo();
  }

  setTouchControls(touchControls) {
    this.touchControls = touchControls;
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
    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.toggleModal(false);
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyP') {
        this.toggleModal(!this.isOpen);
      } else if (e.code === 'Escape' && this.isOpen) {
        this.toggleModal(false);
      }
    });

    this.btnCheckUpdate?.addEventListener('click', () => this.checkGitHubAndRecache(false));
    this.btnForceRecache?.addEventListener('click', () => this.checkGitHubAndRecache(true));
  }

  toggleModal(open) {
    this.isOpen = Boolean(open);
    if (!this.modal) return;
    if (this.isOpen) {
      if (document.pointerLockElement && document.exitPointerLock) {
        try { document.exitPointerLock(); } catch (_) {}
      }
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
