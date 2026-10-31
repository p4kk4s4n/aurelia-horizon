/**
 * Multi-Chapter Objective & Xenology Progression System for Aurelia Horizon.
 */
export class ObjectiveSystem {
  constructor(onNotice) {
    this.onNotice = onNotice;

    this.stats = {
      partsInstalled: 0,
      mineralsHarvested: 0,
      faunaDefeated: 0,
      moonsVisited: 0,
      maxDepthReached: 0,
      upgradesCrafted: 0,
      inventoryOpened: false
    };

    this.discoveredSpecies = new Set(['hexapod_strider']);
    this.completedChapters = new Set();

    this.chapters = [
      {
        id: 'ch1_salvage',
        title: 'Phase I: Starfighter Salvage & Resource Mining',
        shortTitle: 'SALVAGE & MINING',
        tasks: [
          {
            id: 'parts',
            label: 'Install 5 Starfighter Components',
            getProgress: (s) => `${Math.min(5, s.partsInstalled)}/5`,
            isDone: (s) => s.partsInstalled >= 5
          },
          {
            id: 'minerals',
            label: 'Mine 6 Titanium or Silica Crystals ([F] / Left-Click)',
            getProgress: (s) => `${Math.min(6, s.mineralsHarvested)}/6`,
            isDone: (s) => s.mineralsHarvested >= 6
          }
        ]
      },
      {
        id: 'ch2_xenology',
        title: 'Phase II: Predator Defense & Xenology Survey',
        shortTitle: 'XENOLOGY & COMBAT',
        tasks: [
          {
            id: 'fauna',
            label: 'Neutralize 2 Alien Fauna with On-Foot Plasma Blaster',
            getProgress: (s) => `${Math.min(2, s.faunaDefeated)}/2`,
            isDone: (s) => s.faunaDefeated >= 2
          },
          {
            id: 'craft',
            label: 'Open Inventory ([I]) or Craft 1 Exosuit Upgrade',
            getProgress: (s) => (s.inventoryOpened || s.upgradesCrafted > 0 ? '1/1' : '0/1'),
            isDone: (s) => s.inventoryOpened || s.upgradesCrafted > 0
          }
        ]
      },
      {
        id: 'ch3_moons',
        title: 'Phase III: Lunar Monolith Expeditions',
        shortTitle: 'LUNAR EXPEDITION',
        tasks: [
          {
            id: 'moons',
            label: 'Touch Down on All 3 Orbiting Moons (Lumen, Pyra, Goliath)',
            getProgress: (s) => `${Math.min(3, s.moonsVisited)}/3`,
            isDone: (s) => s.moonsVisited >= 3
          }
        ]
      },
      {
        id: 'ch4_abyss',
        title: 'Phase IV: Hadal Trench Expedition',
        shortTitle: 'ABYSSAL TRENCH DIVE',
        tasks: [
          {
            id: 'depth',
            label: 'Dive Below 45m Depth into Aurelia Prime Ocean Trenches',
            getProgress: (s) => `${Math.min(45, Math.round(s.maxDepthReached))}m / 45m`,
            isDone: (s) => s.maxDepthReached >= 45
          }
        ]
      }
    ];
  }

  recordMineralHarvest(amount = 1) {
    this.stats.mineralsHarvested += amount;
    this._checkCompletions();
  }

  recordFaunaDefeated(speciesKey) {
    this.stats.faunaDefeated += 1;
    if (speciesKey) this.discoveredSpecies.add(speciesKey);
    this._checkCompletions();
  }

  recordSpeciesSighting(speciesKey) {
    if (speciesKey && !this.discoveredSpecies.has(speciesKey)) {
      this.discoveredSpecies.add(speciesKey);
    }
  }

  recordUpgradeCrafted() {
    this.stats.upgradesCrafted += 1;
    this._checkCompletions();
  }

  recordInventoryOpened() {
    this.stats.inventoryOpened = true;
    this._checkCompletions();
  }

  updateLiveState({ repairStatus, visitedMoonsCount, waterDepth }) {
    if (repairStatus && typeof repairStatus.installed === 'number') {
      this.stats.partsInstalled = Math.max(this.stats.partsInstalled, repairStatus.installed);
    }
    if (typeof visitedMoonsCount === 'number') {
      this.stats.moonsVisited = Math.max(this.stats.moonsVisited, visitedMoonsCount);
    }
    if (typeof waterDepth === 'number' && waterDepth > this.stats.maxDepthReached) {
      this.stats.maxDepthReached = waterDepth;
    }
    this._checkCompletions();
  }

  _checkCompletions() {
    for (const ch of this.chapters) {
      if (this.completedChapters.has(ch.id)) continue;
      const allDone = ch.tasks.every((t) => t.isDone(this.stats));
      if (allDone) {
        this.completedChapters.add(ch.id);
        if (this.onNotice) {
          this.onNotice(`OBJECTIVE COMPLETE: ${ch.title}!`, 4.5);
        }
      }
    }
  }

  getActiveChapter() {
    for (const ch of this.chapters) {
      if (!this.completedChapters.has(ch.id)) return ch;
    }
    return this.chapters[this.chapters.length - 1];
  }

  getBannerSummary() {
    const active = this.getActiveChapter();
    if (this.completedChapters.size === this.chapters.length) {
      return {
        badge: 'HORIZON MASTER',
        headline: 'All Planetary, Xenology, Lunar & Abyssal Objectives Complete!',
        tasks: active.tasks.map((t) => ({
          label: t.label,
          progress: t.getProgress(this.stats),
          done: true
        }))
      };
    }

    return {
      badge: active.shortTitle,
      headline: active.title,
      tasks: active.tasks.map((t) => ({
        label: t.label,
        progress: t.getProgress(this.stats),
        done: t.isDone(this.stats)
      }))
    };
  }
}
