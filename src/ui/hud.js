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
    this.elMissionBadge = document.getElementById('hud-mission-badge');
    this.elObjectiveTasks = document.getElementById('hud-objective-tasks');
    this.elCrosshair = document.getElementById('hud-crosshair');
    this.elHitmarker = document.getElementById('hud-hitmarker');
    this.elTargetInfo = document.getElementById('hud-target-info');
    this.elThreatWarning = document.getElementById('hud-threat-warning');
    this.elSuitHealthBlock = document.getElementById('hud-suit-health-block');
    this.elSuitHealthBar = document.getElementById('hud-suit-health-bar');
    this.elSuitHealthVal = document.getElementById('hud-suit-health-val');
    this.elOrbitTelemetry = document.getElementById('hud-orbit-telemetry');
    this.elAp = document.getElementById('hud-ap');
    this.elPe = document.getElementById('hud-pe');
    this.elEcc = document.getElementById('hud-ecc');
    this.elSasMode = document.getElementById('hud-sas-mode');
    this.elOxygenBlock = document.getElementById('hud-oxygen-block');
    this.elOxygenBar = document.getElementById('hud-oxygen-bar');
    this.elOxygenVal = document.getElementById('hud-oxygen-val');
    this.elMinerals = document.getElementById('hud-minerals');
    this.elHullBlock = document.getElementById('hud-hull-block');
    this.elHullBar = document.getElementById('hud-hull-bar');
    this.elHullVal = document.getElementById('hud-hull-val');
    this.elAmmoBlock = document.getElementById('hud-ammo-block');
    this.elAmmoBar = document.getElementById('hud-ammo-bar');
    this.elAmmoVal = document.getElementById('hud-ammo-val');
    this.elBoostBlock = document.getElementById('hud-boost-block');
    this.elBoostVal = document.getElementById('hud-boost-val');
    this.elVertSpd = document.getElementById('hud-vert-spd');
    this.elLandingStatus = document.getElementById('hud-landing-status');
    this.radarCanvas = document.getElementById('radar-canvas');
    this.radarCtx = this.radarCanvas ? this.radarCanvas.getContext('2d') : null;

    this.noticeTimer = 0;
    this.hitmarkerTimer = 0;
    this.noticesList = [];
  }

  triggerHitmarker(duration = 0.22) {
    this.hitmarkerTimer = duration;
    if (this.elHitmarker) {
      this.elHitmarker.classList.add('active');
    }
  }

  updateMinerals(inventory) {
    if (this.elMinerals && inventory) {
      this.elMinerals.textContent = `${inventory.titanium || 0} Ti • ${inventory.crystal || 0} Cry`;
    }
  }

  showNotice(text, duration = 4.0) {
    if (!this.elNotice) return;

    // Avoid duplicate spam: refresh remaining duration if identical to latest
    if (this.noticesList.length > 0) {
      const latest = this.noticesList[this.noticesList.length - 1];
      if (latest.text === text && !latest.fading) {
        latest.remaining = duration;
        return;
      }
    }

    // Limit maximum stacked toasts to 3: drop the oldest if at capacity
    while (this.noticesList.length >= 3) {
      const oldest = this.noticesList.shift();
      if (oldest.el && oldest.el.parentNode) {
        oldest.el.remove();
      }
    }

    const pill = document.createElement('div');
    pill.className = 'toast-pill';
    pill.textContent = text;
    this.elNotice.appendChild(pill);

    // Trigger smooth entrance animation
    requestAnimationFrame(() => {
      pill.classList.add('visible');
    });

    this.noticesList.push({
      text,
      duration,
      remaining: duration,
      el: pill,
      fading: false
    });

    this.noticeTimer = duration;
    this.elNotice.classList.add('visible');
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
      compassText,
      input,
      cameraRig,
      objectiveSystem,
      targetedFauna,
      nearbyHostile
    } = state;

    if (this.hitmarkerTimer > 0) {
      this.hitmarkerTimer -= dt;
      if (this.hitmarkerTimer <= 0 && this.elHitmarker) {
        this.elHitmarker.classList.remove('active');
      }
    }

    if (this.noticesList.length > 0) {
      for (let i = this.noticesList.length - 1; i >= 0; i--) {
        const item = this.noticesList[i];
        item.remaining -= dt;
        if (item.remaining <= 0.35 && !item.fading) {
          item.fading = true;
          if (item.el) {
            item.el.classList.add('fade-out');
            item.el.classList.remove('visible');
          }
        }
        if (item.remaining <= 0) {
          if (item.el && item.el.parentNode) {
            item.el.remove();
          }
          this.noticesList.splice(i, 1);
        }
      }
      this.noticeTimer = this.noticesList.length > 0 ? this.noticesList[0].remaining : 0;
      if (this.noticesList.length === 0 && this.elNotice) {
        this.elNotice.classList.remove('visible');
      }
    } else if (this.noticeTimer > 0) {
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
      if (mode === 'PILOTING') {
        this.elMode.textContent = 'STARFIGHTER COCKPIT';
      } else {
        this.elMode.textContent = cameraRig?.firstPerson ? 'ON FOOT (1ST PERSON)' : 'ON FOOT (3RD PERSON)';
      }
    }
    if (this.elBody) {
      this.elBody.textContent = activeBody ? activeBody.name : 'Deep Space';
    }
    if (this.elPhase) {
      if (mode === 'PILOTING') {
        this.elPhase.textContent = ship.flightPhase;
      } else if (explorer.isSubmerged) {
        this.elPhase.textContent = `UNDERWATER DIVE (-${Math.round(explorer.waterDepth)}m)`;
      } else if (explorer.isSwimming) {
        this.elPhase.textContent = 'SWIMMING (OCEAN SURFACE)';
      } else {
        this.elPhase.textContent = explorer.grounded ? 'SURFACE EXPLORATION' : 'JETPACK / AIRBORNE';
      }
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
      const pct = Math.round(mode === 'PILOTING' ? ship.boostEnergy : explorer.jetpackFuel);
      this.elBoostBar.style.width = `${pct}%`;
      if (this.elBoostVal) this.elBoostVal.textContent = `${pct}%`;
    }
    if (this.elOxygenBlock && this.elOxygenBar) {
      const showOxygen = (mode !== 'PILOTING' && (explorer.isSwimming || explorer.oxygen < 99.5));
      this.elOxygenBlock.style.display = showOxygen ? 'block' : 'none';
      if (showOxygen) {
        const ox = Math.round(explorer.oxygen);
        this.elOxygenBar.style.width = `${ox}%`;
        this.elOxygenBar.style.background = ox < 25 ? '#ff4d6d' : '#00f5d4';
        if (this.elOxygenVal) this.elOxygenVal.textContent = `${ox}%`;
      }
    }
    if (this.elMinerals && explorer.inventory) {
      this.elMinerals.textContent = `${explorer.inventory.titanium} Ti • ${explorer.inventory.crystal} Cry`;
    }

    if (this.elSuitHealthBlock && this.elSuitHealthBar) {
      this.elSuitHealthBlock.style.display = mode === 'PILOTING' ? 'none' : 'block';
      const maxHp = explorer.maxSuitHealth || 100;
      const hpPct = Math.round(((explorer.suitHealth ?? 100) / maxHp) * 100);
      this.elSuitHealthBar.style.width = `${Math.max(0, Math.min(100, hpPct))}%`;
      this.elSuitHealthBar.style.background = hpPct < 30 ? '#ff4d6d' : (hpPct < 65 ? '#ffbe0b' : '#00f5d4');
      if (this.elSuitHealthVal) this.elSuitHealthVal.textContent = `${hpPct}%`;
    }

    if (this.elAmmoBlock && this.elAmmoBar) {
      this.elAmmoBlock.style.display = mode === 'PILOTING' ? 'none' : 'block';
      const ammo = explorer.ammo ?? 0;
      const maxAmmo = explorer.maxAmmo ?? 60;
      const ammoPct = Math.round((ammo / maxAmmo) * 100);
      this.elAmmoBar.style.width = `${Math.max(0, Math.min(100, ammoPct))}%`;
      this.elAmmoBar.style.background = ammo <= 10 ? '#ff4d6d' : (ammo <= 20 ? '#ffbe0b' : '#00f5d4');
      if (this.elAmmoVal) this.elAmmoVal.textContent = `${ammo} / ${maxAmmo}`;
    }

    if (this.elHullBlock && this.elHullBar) {
      const showHull = mode === 'PILOTING' || ship.hullIntegrity < 99.5;
      this.elHullBlock.style.display = showHull ? 'block' : 'none';
      if (showHull) {
        const hPct = Math.round(ship.hullIntegrity);
        this.elHullBar.style.width = `${hPct}%`;
        this.elHullBar.style.background = hPct < 35 ? '#ff4d6d' : (hPct < 70 ? '#ffbe0b' : '#00f5d4');
        if (this.elHullVal) this.elHullVal.textContent = `${hPct}%`;
      }
    }

    if (this.elCrosshair) {
      this.elCrosshair.style.display = 'block';
      this.elCrosshair.classList.remove('target-hostile', 'target-docile');
      if (mode !== 'PILOTING' && targetedFauna && !targetedFauna.dead) {
        const isHostile = targetedFauna.temperament === 'aggressive';
        this.elCrosshair.classList.add(isHostile ? 'target-hostile' : 'target-docile');
        if (this.elTargetInfo) {
          const hpPct = Math.round((targetedFauna.health / targetedFauna.maxHealth) * 100);
          this.elTargetInfo.style.display = 'block';
          this.elTargetInfo.textContent = `${targetedFauna.name} (${hpPct}% HP)`;
        }
      } else if (this.elTargetInfo) {
        this.elTargetInfo.style.display = 'none';
      }
    }

    if (this.elThreatWarning) {
      const showThreat = mode !== 'PILOTING' && nearbyHostile && !nearbyHostile.dead && (nearbyHostile.state === 'AGGRO' || nearbyHostile.state === 'ATTACK');
      this.elThreatWarning.style.display = showThreat ? 'block' : 'none';
      if (showThreat) {
        this.elThreatWarning.textContent = `⚠ HOSTILE ${nearbyHostile.name.toUpperCase()} ENGAGED!`;
      }
    }

    // Keplerian Orbital & Flight Landing Telemetry Readouts
    if (this.elOrbitTelemetry) {
      const showOrbit = (mode === 'PILOTING' && !ship.landed);
      this.elOrbitTelemetry.style.display = showOrbit ? 'block' : 'none';

      if (showOrbit) {
        if (ship.orbitalData) {
          if (this.elAp) this.elAp.textContent = `${ship.orbitalData.ap}${typeof ship.orbitalData.ap === 'number' ? ' m' : ''}`;
          if (this.elPe) this.elPe.textContent = `${ship.orbitalData.pe} m`;
          if (this.elEcc) this.elEcc.textContent = `${ship.orbitalData.eccentricity}`;
          if (this.elSasMode) this.elSasMode.textContent = ship.sasMode || 'STABILITY';
        }

        if (this.elVertSpd) {
          const vVert = ship.vRelVert || 0;
          const vHoriz = ship.vRelHoriz || 0;
          const arrow = vVert < -0.2 ? '↓' : (vVert > 0.2 ? '↑' : '•');
          const sign = vVert >= 0 ? '+' : '';
          this.elVertSpd.textContent = `${sign}${vVert.toFixed(1)} m/s ${arrow} (H:${Math.round(vHoriz)})`;
          this.elVertSpd.style.color = Math.abs(vVert) > 12.0 ? '#ff4d6d' : (Math.abs(vVert) > 6.0 ? '#ffd166' : '#00f5d4');
        }

        if (this.elLandingStatus) {
          if (ship.landed) {
            this.elLandingStatus.textContent = 'TOUCHDOWN CONFIRMED';
            this.elLandingStatus.style.color = '#00f5d4';
          } else if (ship.altitude < 120) {
            const vVert = Math.abs(ship.vRelVert || 0);
            const vHoriz = ship.vRelHoriz || 0;
            if (vVert <= 12.0 && vHoriz <= 14.0) {
              this.elLandingStatus.textContent = 'SAFE TOUCHDOWN (APPROACH)';
              this.elLandingStatus.style.color = '#00f5d4';
            } else if (vVert > 12.0) {
              this.elLandingStatus.textContent = `CAUTION: FAST (${Math.round(vVert)} m/s)`;
              this.elLandingStatus.style.color = '#ff4d6d';
            } else {
              this.elLandingStatus.textContent = 'CAUTION: REDUCE DRIFT';
              this.elLandingStatus.style.color = '#ffd166';
            }
          } else {
            this.elLandingStatus.textContent = 'CRUISE / ORBIT';
            this.elLandingStatus.style.color = 'var(--hud-text)';
          }
        }
      }
    }

    // Objective guidance & multi-chapter checklist
    if (objectiveSystem && this.elObjectiveText) {
      const summary = objectiveSystem.getBannerSummary();
      if (this.elMissionBadge) {
        this.elMissionBadge.textContent = summary.badge;
      }
      this.elObjectiveText.textContent = summary.headline;
      if (this.elObjectiveTasks) {
        this.elObjectiveTasks.innerHTML = summary.tasks.map((t) => `
          <div class="obj-task-pill ${t.done ? 'done' : ''}">
            <span>${t.done ? '✓' : '•'} ${t.label}</span>
            <strong>${t.progress}</strong>
          </div>
        `).join('');
      }
    } else if (this.elObjectiveText) {
      const isTouch = input?.isTouchDevice;
      const actKey = input?.getActionKeyLabel ? input.getActionKeyLabel('interact') : 'E';
      const fwdKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightThrustForward') : 'W';
      const bwdKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightThrustBackward') : 'S';
      const boostKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightBoost') : 'Shift';
      const sasKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightSAS') : 'O';
      const rollLKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightRollLeft') : 'Q';
      const rollRKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightRollRight') : 'E';
      const exitKey = input?.getActionKeyLabel ? input.getActionKeyLabel('flightDisembark') : 'E';

      if (!rep.repaired) {
        if (rep.collected < rep.total) {
          this.elObjectiveText.textContent = `1. Explore Aurelia Prime & collect ship components (${rep.collected}/${rep.total} found). Follow glowing sky beacons!`;
        } else {
          this.elObjectiveText.textContent = `2. Return to your Starfighter and ${isTouch ? 'tap ACT' : `press [${actKey}]`} to install the remaining components.`;
        }
      } else if (mode !== 'PILOTING' && ship.visitedMoons.size === 0) {
        this.elObjectiveText.textContent = `3. Ship Repaired! Approach the Starfighter and ${isTouch ? 'tap ACT' : `press [${actKey}]`} to board and take off into orbit.`;
      } else if (ship.visitedMoons.size < moons.length) {
        this.elObjectiveText.textContent = isTouch
          ? `4. Spaceflight: Fly to and land on all 3 Moons (${ship.visitedMoons.size}/3)! Use BOOST for afterburners & SAS for autopilot.`
          : `4. Newtonian Spaceflight: Prograde [${fwdKey}], Retro-Brake [${bwdKey}], Boost [${boostKey}], Cycle SAS [${sasKey}], Roll [${rollLKey}/${rollRKey}], land on all 3 Moons (${ship.visitedMoons.size}/3)!`;
      } else {
        this.elObjectiveText.textContent = `MISSION COMPLETE! All 3 Moons explored! Free-fly, step out on any moon ${isTouch ? '[EXIT]' : `[${exitKey}]`}, or dogfight orbital drones.`;
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

    const actorPos = mode === 'PILOTING' ? ship?.group?.position : explorer?.group?.position;
    if (actorPos && planet && moons) {
      this._drawOrbitalRadar(actorPos, planet, moons, ship);
    }
  }

  _drawOrbitalRadar(actorPos, planet, moons, ship) {
    const ctx = this.radarCtx;
    if (!ctx || !actorPos || !planet || !moons) return;
    const w = this.radarCanvas.width;
    const h = this.radarCanvas.height;
    const cx = w / 2;
    const cy = h / 2;
    const maxOrbit = Math.max(5000, ...moons.map(m => (m.orbitRadius || 0) * 1.15));
    const scale = (w * 0.44) / maxOrbit; // Dynamically fits outermost moon orbit

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
