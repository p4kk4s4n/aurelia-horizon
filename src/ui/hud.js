/**
 * HUD controller: updates mission objectives, telemetry, compass, boost/weapons gauges,
 * interaction prompts, and 2D orbital radar map.
 */
export class HUD {
  constructor() {
    this.elMode = document.getElementById('hud-mode');
    this.elBody = document.getElementById('hud-body');
    this.elPhase = document.getElementById('hud-phase');
    this.elAltitude = document.getElementById('hud-altitude');
    this.elSpeed = document.getElementById('hud-speed');
    this.elParts = document.getElementById('hud-parts');
    this.elMoons = document.getElementById('hud-moons');
    this.elTargets = document.getElementById('hud-targets');
    this.elBoostBar = document.getElementById('hud-boost-bar');
    this.elPrompt = document.getElementById('hud-prompt');
    this.elNotice = document.getElementById('hud-notice');
    this.elCompass = document.getElementById('hud-compass');
    this.elObjectiveText = document.getElementById('hud-objective-text');
    this.elCrosshair = document.getElementById('hud-crosshair');
    this.elOrbitTelemetry = document.getElementById('hud-orbit-telemetry');
    this.elAp = document.getElementById('hud-ap');
    this.elPe = document.getElementById('hud-pe');
    this.elEcc = document.getElementById('hud-ecc');
    this.elSasMode = document.getElementById('hud-sas-mode');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.noticeTimer = 0;
  }

  showNotice(text, duration = 4.0) {
    if (!this.elNotice) return;
    this.elNotice.textContent = text;
    this.elNotice.classList.add('visible');
    this.noticeTimer = duration;
  }

  update(dt, state) {
    const {
      mode,
      explorer,
      ship,
      repairSystem,
      planet,
      moons,
      promptText,
      compassText
    } = state;

    if (this.noticeTimer > 0) {
      this.noticeTimer -= dt;
      if (this.noticeTimer <= 0 && this.elNotice) {
        this.elNotice.classList.remove('visible');
      }
    }

    const rep = repairSystem.getStatus();
    const activeBody = mode === 'PILOTING' ? ship.currentBody : explorer.currentBody;
    const alt = mode === 'PILOTING' ? ship.altitude : explorer.altitude;
    const spd = mode === 'PILOTING' ? ship.speed : explorer.velocity.length();

    if (this.elMode) {
      this.elMode.textContent = mode === 'PILOTING' ? 'STARFIGHTER COCKPIT' : 'ON FOOT (3RD PERSON)';
    }
    if (this.elBody) {
      this.elBody.textContent = activeBody ? activeBody.name : 'Deep Space';
    }
    if (this.elPhase) {
      this.elPhase.textContent = mode === 'PILOTING' ? ship.flightPhase : (explorer.grounded ? 'SURFACE EXPLORATION' : 'JETPACK / AIRBORNE');
    }
    if (this.elAltitude) {
      this.elAltitude.textContent = `${Math.round(alt)} m`;
    }
    if (this.elSpeed) {
      this.elSpeed.textContent = `${Math.round(spd)} m/s`;
    }
    if (this.elParts) {
      this.elParts.textContent = `${rep.installed}/${rep.total} Installed (${rep.carried} Carried)`;
    }
    if (this.elMoons) {
      this.elMoons.textContent = `${ship.visitedMoons.size} / ${moons.length} Moons Landed`;
    }
    if (this.elTargets) {
      this.elTargets.textContent = `${ship.targetsDestroyed} Destroyed`;
    }
    if (this.elBoostBar) {
      const pct = mode === 'PILOTING' ? ship.boostEnergy : explorer.jetpackFuel;
      this.elBoostBar.style.width = `${Math.round(pct)}%`;
    }
    if (this.elCrosshair) {
      this.elCrosshair.style.display = mode === 'PILOTING' ? 'block' : 'none';
    }

    // Keplerian Orbital Telemetry Readouts
    if (this.elOrbitTelemetry) {
      const showOrbit = (mode === 'PILOTING' && !ship.landed);
      this.elOrbitTelemetry.style.display = showOrbit ? 'block' : 'none';

      if (showOrbit && ship.orbitalData) {
        if (this.elAp) this.elAp.textContent = `${ship.orbitalData.ap}${typeof ship.orbitalData.ap === 'number' ? ' m' : ''}`;
        if (this.elPe) this.elPe.textContent = `${ship.orbitalData.pe} m`;
        if (this.elEcc) this.elEcc.textContent = `${ship.orbitalData.eccentricity}`;
        if (this.elSasMode) this.elSasMode.textContent = ship.sasMode || 'STABILITY';
      }
    }

    // Objective guidance
    if (this.elObjectiveText) {
      if (!rep.repaired) {
        if (rep.collected < rep.total) {
          this.elObjectiveText.textContent = `1. Explore Aurelia Prime & collect ship components (${rep.collected}/${rep.total} found). Follow glowing sky beacons!`;
        } else {
          this.elObjectiveText.textContent = `2. Return to your Starfighter and press [E] to install the remaining components.`;
        }
      } else if (mode !== 'PILOTING' && ship.visitedMoons.size === 0) {
        this.elObjectiveText.textContent = `3. Ship Repaired! Approach the Starfighter and press [E] to board and take off into orbit.`;
      } else if (ship.visitedMoons.size < moons.length) {
        this.elObjectiveText.textContent = `4. Newtonian Spaceflight: Prograde [W], Retro-Brake [S], Boost [Shift], Cycle SAS [O], Roll [Q/E], land on all 3 Moons (${ship.visitedMoons.size}/3)!`;
      } else {
        this.elObjectiveText.textContent = `MISSION COMPLETE! All 3 Moons explored! Free-fly, step out on any moon [E], or dogfight orbital drones.`;
      }
    }

    if (this.elPrompt) {
      if (promptText) {
        this.elPrompt.textContent = promptText;
        this.elPrompt.classList.add('visible');
      } else {
        this.elPrompt.classList.remove('visible');
      }
    }

    if (this.elCompass) {
      this.elCompass.textContent = compassText || '';
    }

    this._drawOrbitalRadar(mode === 'PILOTING' ? ship.group.position : explorer.group.position, planet, moons, ship);
  }

  _drawOrbitalRadar(actorPos, planet, moons, ship) {
    const ctx = this.radarCtx;
    if (!ctx) return;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const scale = (w * 0.44) / 2500; // Fits outer moon orbit

    ctx.clearRect(0, 0, w, h);

    // Radar background
    const primaryColor = getComputedStyle(document.documentElement).getPropertyValue('--hud-primary').trim() || '#00f5d4';
    ctx.fillStyle = 'rgba(8, 16, 32, 0.78)';
    ctx.beginPath();
    ctx.arc(cx, cy, w * 0.48, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = primaryColor;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    // Moon orbit rings & moons
    const moonColors = ['#00f5d4', '#ff9f1c', '#c77dff'];
    moons.forEach((m, idx) => {
      const r = m.orbitRadius * scale;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();

      const mp = m.getWorldPosition();
      const mx = cx + mp.x * scale;
      const my = cy + mp.z * scale;
      ctx.fillStyle = moonColors[idx % moonColors.length];
      ctx.beginPath();
      ctx.arc(mx, my, Math.max(3.5, m.radius * scale * 1.4), 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#e0fbfc';
      ctx.font = '10px sans-serif';
      ctx.fillText(m.id.toUpperCase(), mx + 5, my - 4);
    });

    // Planet Aurelia at center
    ctx.fillStyle = '#2ec4b6';
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(8, planet.radius * scale), 0, Math.PI * 2);
    ctx.fill();

    // Player / Ship marker
    const px = cx + actorPos.x * scale;
    const py = cy + actorPos.z * scale;
    ctx.fillStyle = '#ff2a85';
    ctx.beginPath();
    ctx.arc(px, py, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
  }
}
