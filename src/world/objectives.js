/**
 * Multi-Chapter Objective, Storyline & Xenology Progression System for Aurelia Horizon.
 * Includes narrative dialog logs, achievement tracking, and localStorage permanence.
 */

export const STORAGE_CAMPAIGN_KEY = 'aurelia_campaign_save';
export const STORAGE_ACHIEVEMENTS_KEY = 'aurelia_achievements_save';

export const ACHIEVEMENTS = [
  { id: 'first_encounter', title: 'First Encounter', desc: 'Encounter or neutralize native predatory fauna.', icon: '🐾' },
  { id: 'phoenix_salvage', title: 'Phoenix from Ashes', desc: 'Fully repair your crash-landed starfighter.', icon: '🛠️' },
  { id: 'crystal_capacitor', title: 'Crystal Capacitor', desc: 'Replenish plasma blaster ammo by mining silica crystals.', icon: '💎' },
  { id: 'lunar_prospector', title: 'Moon Prospector', desc: 'Touch down on the orbiting moons of Aurelia Prime.', icon: '🌕' },
  { id: 'matter_synthesizer', title: 'Frontier Armorer', desc: 'Synthesize advanced combat gear in the Inventory.', icon: '⚙️' },
  { id: 'hadal_diver', title: 'Abyssal Diver', desc: 'Descend into the deep Hadal ocean trenches.', icon: '🌊' },
  { id: 'hive_decapitation', title: 'Swarm Crusher', desc: 'Assault and defeat the planetary Crimson Hive outpost.', icon: '⚔️' },
  { id: 'orbital_ace', title: 'Orbital Interceptor', desc: 'Destroy enemy Crystal Collector interceptors in space dogfights.', icon: '🚀' },
  { id: 'void_ascendant', title: 'Void Ascendant', desc: 'Harvest Void Aetherium Crystals on Moon III: Goliath.', icon: '🔮' },
  { id: 'goliath_liberator', title: 'Goliath Liberator', desc: 'Eradicate the Wasp-Warrior garrisons defending Goliath strongholds.', icon: '🏆' },
  { id: 'vanguard_hero', title: 'Vanguard Hero', desc: 'Complete all campaign objectives and engage hyperdrive warp jump.', icon: '🌌' }
];

export class ObjectiveSystem {
  constructor(onNotice) {
    this.onNotice = onNotice;

    this.stats = {
      partsInstalled: 0,
      mineralsHarvested: 0,
      silicaHarvested: 0,
      silicaAmmoRecharges: 0,
      faunaDefeated: 0,
      moonsVisited: 0,
      maxDepthReached: 0,
      upgradesCrafted: 0,
      inventoryOpened: false,
      bugAliensDefeated: 0,
      enemyPodsDestroyed: 0,
      voidCrystalsHarvested: 0,
      goliathBugsDefeated: 0,
      hyperdriveEngaged: false
    };

    this.discoveredSpecies = new Set(['hexapod_strider']);
    this.completedChapters = new Set();
    this.unlockedAchievements = new Set();
    this.unlockedDialogs = new Set();
    this.onStoryDialogCallback = null;
    this.onCompletionCallback = null;

    this.chapters = [
      {
        id: 'ch1_salvage',
        act: 'Act I',
        title: 'Phase I: Starfighter Salvage & Resource Mining',
        shortTitle: 'SALVAGE & SURVIVAL',
        storyLog: {
          speaker: 'COMMANDER VANCE // FLIGHT LOG',
          speakerRole: 'TERRAN EXPEDITIONARY VANGUARD',
          title: 'Crash-Landed in Hostile Frontier',
          text: 'Terran Vanguard patrol ambushed by the Crimson Chrysalis Swarm in deep space. Atmospheric entry was critical; ship impact sustained on uncharted frontier world: Aurelia Prime. Starfighter is grounded and structural components are strewn across the plateau. Scavenge components and basic titanium ore to restore thrusters.',
          directive: 'Locate and install 5 scattered Starfighter Components and mine 6 surface mineral veins.'
        },
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
        act: 'Act II',
        title: 'Phase II: Predator Defense & Weapon Ammunition Logistics',
        shortTitle: 'FAUNA & AMMUNITION',
        storyLog: {
          speaker: 'A.U.R.A. // TACTICAL SUIT AI',
          speakerRole: 'AUTOMATED RECON COMPANION',
          title: 'Hostile Biosphere & Capacitor Logistics',
          text: 'Native hyper-predators (Hexapod Striders) are closing in on the crash site. Caution: your on-foot plasma blaster draws from resonant crystal capacitor cells. Ammunition is critically limited! Mining common Silica Crystal veins directly recharges blaster ammunition (+20 rounds per crystal). Gather silica to sustain weapon fire and neutralize hostile predators.',
          directive: 'Mine Silica Crystals to recharge blaster ammo, neutralize 2 aggressive fauna, and open Inventory [I].'
        },
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
        act: 'Act III',
        title: 'Phase III: Lunar Monolith Expeditions & Mineral Prospecting',
        shortTitle: 'LUNAR EXPEDITION',
        storyLog: {
          speaker: 'A.U.R.A. // NAVIGATION COMPUTER',
          speakerRole: 'ORBITAL FLIGHT TELEMETRY',
          title: 'Prospecting the Orbiting Moons',
          text: 'Sub-orbital thrusters calibrated. The inner moons—Moon I: Lumen and Moon II: Pyra—harbor dense silica crystal and titanium deposits needed for the coming war. Break orbit from Aurelia Prime, execute orbital insertion, and touch down on the orbiting moons to survey their mineral riches.',
          directive: 'Fly to and touch down on orbiting moons to establish lunar footholds.'
        },
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
        act: 'Act IV',
        title: 'Phase IV: Hadal Trench Expedition & Combat Synthesis',
        shortTitle: 'ABYSSAL TRENCH DIVE',
        storyLog: {
          speaker: 'COMMANDER VANCE // SUIT LOG',
          speakerRole: 'VANGUARD COMBAT PILOT',
          title: 'Hadal Deep Dive & Matter Synthesis',
          text: 'Sensors detect exotic crystalline organisms in Aurelia Prime\'s oceanic abyss. Dive into the Hadal ocean trenches below 45 meters, test submersible pressure integrity, and synthesize reinforced combat upgrades in your inventory to prepare for assault on the Crimson Swarm.',
          directive: 'Dive deeper than 45m in deep ocean trenches and synthesize combat upgrades.'
        },
        tasks: [
          {
            id: 'depth',
            label: 'Dive Below 45m Depth into Aurelia Prime Ocean Trenches',
            getProgress: (s) => `${Math.min(45, Math.round(s.maxDepthReached))}m / 45m`,
            isDone: (s) => s.maxDepthReached >= 45
          }
        ]
      },
      {
        id: 'ch5_crimson_hive',
        act: 'Act V',
        title: 'Phase V: Crimson Hive Assault & Goliath Fleet Interception',
        shortTitle: 'CRIMSON HIVE ASSAULT',
        storyLog: {
          speaker: 'A.U.R.A. // TACTICAL PRIORITY',
          speakerRole: 'COMBAT TARGETING MATRIX',
          title: 'Decapitation Strike & Orbital Dogfight',
          text: 'Long-range sensors have triangulated the Crimson Swarm\'s planetary command outpost on Aurelia Prime, guarded by lethal Wasp-Warrior troopers. Assault the base and eliminate the troopers. Then launch into space and intercept the Crystal Collector fighter fleet patrolling Moon III: Goliath!',
          directive: 'Eliminate 3 Wasp-Warriors at the planetary outpost and destroy 3 enemy interceptors in Goliath orbit.'
        },
        tasks: [
          {
            id: 'outpost_bugs',
            label: 'Assault Planetary Outpost & Defeat 3 Bug-Alien Troopers',
            getProgress: (s) => `${Math.min(3, s.bugAliensDefeated || 0)}/3`,
            isDone: (s) => (s.bugAliensDefeated || 0) >= 3
          },
          {
            id: 'goliath_pods',
            label: 'Fly to Moon III: Goliath & Destroy 3 Finned Pod Interceptors',
            getProgress: (s) => `${Math.min(3, s.enemyPodsDestroyed || 0)}/3`,
            isDone: (s) => (s.enemyPodsDestroyed || 0) >= 3
          }
        ]
      },
      {
        id: 'ch6_goliath_bastion',
        act: 'Act VI',
        title: 'Phase VI: Goliath Stronghold Annihilation & Void Aetherium',
        shortTitle: 'GOLIATH BASTION SIEGE',
        storyLog: {
          speaker: 'A.U.R.A. // SECTOR COMMAND',
          speakerRole: 'LUNAR RECONNAISSANCE',
          title: 'The Goliath Bastion Falls',
          text: 'Moon III: Goliath is the Swarm\'s ultimate stronghold in this system. Six fortified Crater-Crystal Hive Bases exploit hyper-dense Void Aetherium crystals. Land on Goliath, mine the Void Crystals to permanently boost your exosuit capabilities (speed, jump, shields, oxygen), and eliminate the defending Wasp-Warrior garrisons.',
          directive: 'Mine Void Aetherium Crystals on Moon III: Goliath and eradicate the lunar base garrisons.'
        },
        tasks: [
          {
            id: 'void_crystals',
            label: 'Mine 4 Void Aetherium Crystals on Moon III: Goliath',
            getProgress: (s) => `${Math.min(4, s.voidCrystalsHarvested || 0)}/4`,
            isDone: (s) => (s.voidCrystalsHarvested || 0) >= 4
          },
          {
            id: 'goliath_bugs',
            label: 'Eliminate 4 Wasp-Warriors Defending Goliath Strongholds',
            getProgress: (s) => `${Math.min(4, s.goliathBugsDefeated || 0)}/4`,
            isDone: (s) => (s.goliathBugsDefeated || 0) >= 4
          }
        ]
      },
      {
        id: 'ch7_liberation',
        act: 'Act VII',
        title: 'Phase VII: System Liberation & Hyperspace Warp Jump',
        shortTitle: 'HYPERSPACE JUMP HOME',
        storyLog: {
          speaker: 'FLEET COMMAND // PRIORITY TRANS-BEAM',
          speakerRole: 'TERRAN COMMAND VANGUARD',
          title: 'Sector 4-B Liberated — Return to Home Fleet',
          text: 'Exceptional heroism, Commander Vance! The Crimson Chrysalis Swarm\'s planetary outpost is demolished, their orbital fleet intercepted, and their Goliath bastions wiped out. Your starfighter\'s hyperdrive jump core is 100% primed and celestial jump vectors to your home system are locked. Board your vessel and engage the hyperdrive warp jump to rejoin the main fleet!',
          directive: 'Board your starfighter and engage the Hyperdrive Warp Drive to return home!'
        },
        tasks: [
          {
            id: 'warp_ready',
            label: 'Engage Hyperdrive Warp Jump to Return Home',
            getProgress: (s) => (s.hyperdriveEngaged ? 'ENGAGED' : 'READY'),
            isDone: (s) => Boolean(s.hyperdriveEngaged)
          }
        ]
      }
    ];

    // Restore saved progress if available
    this.loadProgress();
  }

  saveProgress() {
    try {
      const data = {
        stats: this.stats,
        completedChapters: Array.from(this.completedChapters),
        discoveredSpecies: Array.from(this.discoveredSpecies),
        unlockedAchievements: Array.from(this.unlockedAchievements),
        unlockedDialogs: Array.from(this.unlockedDialogs)
      };
      localStorage.setItem(STORAGE_CAMPAIGN_KEY, JSON.stringify(data));
    } catch (e) {
      // Storage unavailable or quota exceeded
    }
  }

  loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_CAMPAIGN_KEY);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        if (data.stats) Object.assign(this.stats, data.stats);
        if (Array.isArray(data.completedChapters)) {
          data.completedChapters.forEach((id) => this.completedChapters.add(id));
        }
        if (Array.isArray(data.discoveredSpecies)) {
          data.discoveredSpecies.forEach((s) => this.discoveredSpecies.add(s));
        }
        if (Array.isArray(data.unlockedAchievements)) {
          data.unlockedAchievements.forEach((a) => this.unlockedAchievements.add(a));
        }
        if (Array.isArray(data.unlockedDialogs)) {
          data.unlockedDialogs.forEach((d) => this.unlockedDialogs.add(d));
        }
        return true;
      }
    } catch (e) {
      // JSON parse error
    }
    return false;
  }

  resetProgress() {
    try {
      localStorage.removeItem(STORAGE_CAMPAIGN_KEY);
      localStorage.removeItem(STORAGE_ACHIEVEMENTS_KEY);
    } catch (e) {}

    this.stats = {
      partsInstalled: 0,
      mineralsHarvested: 0,
      silicaHarvested: 0,
      silicaAmmoRecharges: 0,
      faunaDefeated: 0,
      moonsVisited: 0,
      maxDepthReached: 0,
      upgradesCrafted: 0,
      inventoryOpened: false,
      bugAliensDefeated: 0,
      enemyPodsDestroyed: 0,
      voidCrystalsHarvested: 0,
      goliathBugsDefeated: 0,
      hyperdriveEngaged: false
    };

    this.discoveredSpecies = new Set(['hexapod_strider']);
    this.completedChapters.clear();
    this.unlockedAchievements.clear();
    this.unlockedDialogs.clear();
    this.saveProgress();

    if (this.onNotice) {
      this.onNotice('Campaign progress and achievements reset to Day 1.', 3.0);
    }
  }

  unlockAchievement(achId) {
    if (this.unlockedAchievements.has(achId)) return false;
    const def = ACHIEVEMENTS.find((a) => a.id === achId);
    if (!def) return false;

    this.unlockedAchievements.add(achId);
    this.saveProgress();

    if (this.onNotice) {
      this.onNotice(`${def.icon} ACHIEVEMENT UNLOCKED: ${def.title}! (${def.desc})`, 4.5);
    }
    return true;
  }

  recordMineralHarvest(amount = 1, type = null) {
    this.stats.mineralsHarvested += amount;
    if (type === 'crystal') {
      this.stats.silicaHarvested = (this.stats.silicaHarvested || 0) + amount;
      this.unlockAchievement('crystal_capacitor');
    }
    this._checkCompletions();
    this.saveProgress();
  }

  recordSilicaAmmoRecharge(amount = 20) {
    this.stats.silicaAmmoRecharges = (this.stats.silicaAmmoRecharges || 0) + 1;
    this.unlockAchievement('crystal_capacitor');
    this._checkCompletions();
    this.saveProgress();
  }

  recordVoidCrystalHarvest(amount = 1) {
    this.stats.voidCrystalsHarvested = (this.stats.voidCrystalsHarvested || 0) + amount;
    this.unlockAchievement('void_ascendant');
    this._checkCompletions();
    this.saveProgress();
  }

  recordFaunaDefeated(speciesKey) {
    this.stats.faunaDefeated += 1;
    if (speciesKey) this.discoveredSpecies.add(speciesKey);
    this.unlockAchievement('first_encounter');
    this._checkCompletions();
    this.saveProgress();
  }

  recordBugAlienDefeated(isGoliath = false) {
    this.stats.bugAliensDefeated = (this.stats.bugAliensDefeated || 0) + 1;
    if (isGoliath) {
      this.stats.goliathBugsDefeated = (this.stats.goliathBugsDefeated || 0) + 1;
      if (this.stats.goliathBugsDefeated >= 4) {
        this.unlockAchievement('goliath_liberator');
      }
    }
    if (this.stats.bugAliensDefeated >= 3) {
      this.unlockAchievement('hive_decapitation');
    }
    this._checkCompletions();
    this.saveProgress();
  }

  recordEnemyPodDestroyed() {
    this.stats.enemyPodsDestroyed = (this.stats.enemyPodsDestroyed || 0) + 1;
    if (this.stats.enemyPodsDestroyed >= 3) {
      this.unlockAchievement('orbital_ace');
    }
    this._checkCompletions();
    this.saveProgress();
  }

  recordSpeciesSighting(speciesKey) {
    if (speciesKey && !this.discoveredSpecies.has(speciesKey)) {
      this.discoveredSpecies.add(speciesKey);
      this.saveProgress();
    }
  }

  recordUpgradeCrafted() {
    this.stats.upgradesCrafted += 1;
    this.unlockAchievement('matter_synthesizer');
    this._checkCompletions();
    this.saveProgress();
  }

  recordInventoryOpened() {
    this.stats.inventoryOpened = true;
    this._checkCompletions();
    this.saveProgress();
  }

  recordHyperdriveEngaged() {
    this.stats.hyperdriveEngaged = true;
    this.unlockAchievement('vanguard_hero');
    this._checkCompletions();
    this.saveProgress();
    if (this.onCompletionCallback) {
      this.onCompletionCallback(this.stats);
    }
  }

  updateLiveState({ repairStatus, visitedMoonsCount, waterDepth }) {
    let changed = false;
    if (repairStatus && typeof repairStatus.installed === 'number') {
      if (repairStatus.installed > this.stats.partsInstalled) {
        this.stats.partsInstalled = repairStatus.installed;
        changed = true;
      }
      if (repairStatus.installed >= 5) {
        this.unlockAchievement('phoenix_salvage');
      }
    }
    if (typeof visitedMoonsCount === 'number') {
      if (visitedMoonsCount > this.stats.moonsVisited) {
        this.stats.moonsVisited = visitedMoonsCount;
        changed = true;
      }
      if (visitedMoonsCount >= 1) {
        this.unlockAchievement('lunar_prospector');
      }
    }
    if (typeof waterDepth === 'number' && waterDepth > this.stats.maxDepthReached) {
      this.stats.maxDepthReached = waterDepth;
      changed = true;
      if (waterDepth >= 35) {
        this.unlockAchievement('hadal_diver');
      }
    }

    this._checkCompletions();
    if (changed) this.saveProgress();
  }

  _checkCompletions() {
    for (let i = 0; i < this.chapters.length; i++) {
      const ch = this.chapters[i];
      if (this.completedChapters.has(ch.id)) continue;
      const allDone = ch.tasks.every((t) => t.isDone(this.stats));
      if (allDone) {
        this.completedChapters.add(ch.id);
        this.saveProgress();
        if (this.onNotice) {
          this.onNotice(`OBJECTIVE COMPLETE: ${ch.title}!`, 4.5);
        }

        // Trigger next chapter dialog if available
        const nextIdx = i + 1;
        if (nextIdx < this.chapters.length) {
          const nextCh = this.chapters[nextIdx];
          if (this.onStoryDialogCallback) {
            this.onStoryDialogCallback(nextCh);
          }
        } else if (this.completedChapters.size === this.chapters.length) {
          // All chapters completed!
          this.unlockAchievement('vanguard_hero');
          if (this.onCompletionCallback) {
            this.onCompletionCallback(this.stats);
          }
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

  isAllCompleted() {
    return this.completedChapters.size >= this.chapters.length;
  }

  getBannerSummary() {
    const active = this.getActiveChapter();
    if (this.completedChapters.size === this.chapters.length) {
      return {
        badge: 'LIBERATION HERO',
        headline: 'Aurelia System Liberated! Hyperdrive Ready for Warp Jump Home!',
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
