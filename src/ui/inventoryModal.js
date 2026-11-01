import { FAUNA_SPECIES } from '../world/fauna.js';

export const CRAFTING_RECIPES = [
  {
    id: 'exosuit',
    name: 'Reinforced Exosuit Carapace',
    desc: '+50 Max Suit Health (150 HP) & 35% Predator Damage Mitigation',
    costs: { titanium: 4, chitin_shell: 1 },
    costText: '4 Titanium • 1 Chitin Shell'
  },
  {
    id: 'rebreather',
    name: 'Deep-Sea Oxygen Rebreather',
    desc: '2x Oxygen Capacity (200 O₂) & Halved Hadal Trench Depletion',
    costs: { crystal: 3, biolum_gland: 1 },
    costText: '3 Silica Crystal • 1 Bioluminescent Gland'
  },
  {
    id: 'blasterOvercharge',
    name: 'Plasma Blaster Overcharge',
    desc: '+52% Plasma Bolt Damage (58 DMG) & High-Velocity Capacitor',
    costs: { titanium: 4, apex_fang: 1 },
    costText: '4 Titanium • 1 Apex Fang'
  },
  {
    id: 'shipPlating',
    name: 'Starfighter Ablative Hull Plating',
    desc: '+50 Max Starfighter Hull Integrity (150%) & Instant Full Hull Repair',
    costs: { titanium: 5, crystal: 2 },
    costText: '5 Titanium • 2 Silica Crystal'
  },
  {
    id: 'goliathOverdrive',
    name: 'Aetherium Exosuit Overdrive',
    desc: '+25% Movement & Sprint Speed, +20% Jump Power, +50 Max Shield HP, +80 Max Oxygen',
    costs: { void_crystal: 5, titanium: 4 },
    costText: '5 Void Aetherium • 4 Titanium'
  },
  {
    id: 'ammoCell',
    name: 'Plasma Capacitor Ammo Pack',
    desc: 'Instant +30 Plasma Blaster Rounds synthesized from common Silica Crystal.',
    costs: { crystal: 1 },
    costText: '1 Silica Crystal',
    repeatable: true
  }
];

export const RESOURCE_ITEMS = [
  { key: 'titanium', name: 'Titanium Alloy', category: 'Mineral Ore', color: '#4cc9f0', desc: 'High-tensile structural alloy mined from surface & lunar nodes.' },
  { key: 'crystal', name: 'Silica Crystal', category: 'Energetic Shard', color: '#f72585', desc: 'Piezoelectric lattice used in plasma weapon ammunition recharging, optical emitters, and life-support filters.' },
  { key: 'void_crystal', name: 'Void Aetherium', category: 'Goliath Mineral', color: '#d900ff', desc: 'Hyper-resonant crystal from Moon III: Goliath. Infuses suit systems with kinetic velocity, enhanced jump propulsion, expanded shield capacity, and pressurized oxygen reserves.' },
  { key: 'colossal_carapace', name: 'Colossal Carapace', category: 'Titan Mineral Plate', color: '#7b2cbf', desc: 'Diamond-hard basalt carapace harvested from Colossal Behemoths. Withstands crushing seismic pressures.' },
  { key: 'apex_fang', name: 'Tracker Sickle-Fang', category: 'Predator Trophy', color: '#ff595e', desc: 'Hyper-conductive sickle fang dropped by aggressive Bipedal Trackers.' },
  { key: 'chitin_shell', name: 'Burrower Chitin Shell', category: 'Organic Carapace', color: '#2ec4b6', desc: 'Dense layered chitin plate harvested from Armored Burrowers.' },
  { key: 'prismatic_antler', name: 'Prismatic Antler Shard', category: 'Energetic Shard', color: '#c084fc', desc: 'Resonant quartz antler crystal shed by docile Herding Quadrupeds.' },
  { key: 'swarmer_gland', name: 'Resonant Swarmer Gland', category: 'Bio-Node', color: '#00f5d4', desc: 'High-frequency neural ganglion harvested from aggressive pack Scurrying Swarmers.' },
  { key: 'abyssal_pearl', name: 'Leviathan Hadal Pearl', category: 'Hadal Relic', color: '#c77dff', desc: 'Ultra-dense crystalline pearl formed in midnight trenches inside Leviathan Eels.' },
  { key: 'biolum_gland', name: 'Bioluminescent Ray Organ', category: 'Aquatic Organ', color: '#48cae4', desc: 'Oxygen-synthesizing organ harvested from docile Faceted Rays.' },
  { key: 'crustacean_claw', name: 'Plated Pincer Chitin', category: 'Carapace Claw', color: '#6b21a8', desc: 'Dense volcanic carapace claw from benthic Plated Crustaceans.' },
  { key: 'aero_membrane', name: 'Skimmer Aero Membrane', category: 'Thermal Wing', color: '#9ef01a', desc: 'Ultra-lightweight crystalline glider membrane from Aerial Skimmers.' },
  { key: 'darting_wing', name: 'Ion Dart Flier Shard', category: 'Atmospheric Membrane', color: '#e879f9', desc: 'Ultra-thin shimmering crystal wing membrane harvested from Tiny Darting Fliers.' }
];

export const FLORA_CODEX = [
  // Terrestrial Flora (Land Plants 1-5)
  { name: 'Aurelian Lucent-Mycena', category: 'terrestrial', biome: 'Conifer Valleys & Goliath Titan Moon', solid: 'Solid Trunk Collider', desc: 'Compound triad fungal towers with glowing turquoise lamellar gills illuminating nocturnal biomes.' },
  { name: 'Cobalt Strata-Arbor', category: 'terrestrial', biome: 'Coastal Beaches & Lowland Steppe', solid: 'Solid Trunk Collider', desc: 'Curved twin-ring bark palms with segmented bamboo nodes and crowning cobalt-crystal fronds.' },
  { name: 'Prismatic Lithocactus', category: 'terrestrial', biome: 'Granite Highland Peaks & Lumen Crystal Moon', solid: 'Solid Spire Collider', desc: 'Faceted crystal prism columns with radiating neon-pink needle spines that hum with resonance.' },
  { name: 'Cyan Serrata-Fern', category: 'terrestrial', biome: 'Temperate Steppe Grasslands', solid: 'Basal Rosette', desc: 'Concentric tiered rosettes of saw-toothed fronds with bioluminescent leaf margins.' },
  { name: 'Abyssal Tendril-Pod', category: 'terrestrial', biome: 'Forest Undergrowth & Pyra Volcanic Moon', solid: 'Herbaceous Shrub', desc: 'Undulating sinusoidal ribbon vines bearing luminescent purple seed lanterns and spore motes.' },

  // Marine Flora (Aquatic Flora 6-9)
  { name: 'Aurelian Prismatic Ribbon-Kelp', category: 'marine', depth: '2m–18m Depth', biome: 'Sunlit Oceanic Reefs & Lagoons', solid: 'Aquatic Frond', desc: 'Undulating emerald-teal twisted ribbon blades with hovering cyan bioluminescent spore lanterns.' },
  { name: 'Crystalline Staghorn Branch-Coral', category: 'marine', depth: '2m–25m Depth', biome: 'Ocean Coral Lagoons & Lumen Crystal Canyons', solid: 'Crystalline Branch', desc: 'Arborescent violet-purple branching limbs crowned with radiant neon-pink crystal pyramid termination caps.' },
  { name: 'Bioluminescent Strata-Plate Coral', category: 'marine', depth: '18m–55m Depth', biome: 'Bathyal Submerged Shelves', solid: 'Solid Shelf Collider', desc: 'Horizontally tiered stepped dark-indigo table coral shelves with glowing electric-cyan border margins.' },
  { name: 'Volcanic Hadal Vent-Spire', category: 'marine', depth: '55m–160m Depth', biome: 'Midnight Hadal Abyss & Pyra Magma Fumaroles', solid: 'Solid Chimney Collider', desc: 'Hollow hexagonal volcanic basalt chimneys with glowing hydrothermal lip rims venting geothermal bubbles.' }
];

export const CANONICAL_FAUNA_SPECIES = [
  'colossal_behemoth',
  'bipedal_tracker',
  'armored_burrower',
  'herding_quadruped',
  'scurrying_swarmer',
  'leviathan_eel',
  'faceted_ray',
  'plated_crustacean',
  'aerial_skimmer',
  'tiny_darting_flier'
];

export class InventoryModal {
  constructor({ explorer, ship, objectiveSystem, onNotice }) {
    this.explorer = explorer;
    this.ship = ship;
    this.objectiveSystem = objectiveSystem;
    this.onNotice = onNotice;
    this.isOpen = false;
    this.activeTab = 'crafting'; // 'crafting' | 'codex' | 'missions'

    this.modal = document.getElementById('inventory-modal');
    this.btnClose = document.getElementById('btn-close-inventory');
    this.btnOpenHud = document.getElementById('btn-open-inventory');
    this.tabBtns = document.querySelectorAll('.inv-tab-btn');

    this.elResourceGrid = document.getElementById('inv-resource-grid');
    this.elCraftingGrid = document.getElementById('inv-crafting-grid');
    this.elCodexGrid = document.getElementById('inv-codex-grid');
    this.elMissionsList = document.getElementById('inv-missions-list');

    this._bindEvents();
  }

  _bindEvents() {
    this.btnClose?.addEventListener('click', () => this.toggle(false));
    this.btnOpenHud?.addEventListener('click', () => this.toggle());

    this.modal?.addEventListener('click', (e) => {
      if (e.target === this.modal) this.toggle(false);
    });

    this.tabBtns.forEach((btn) => {
      btn.addEventListener('click', () => {
        const tab = btn.dataset.tab;
        if (tab) this.switchTab(tab);
      });
    });
  }

  setStoryDialog(storyDialog) {
    this.storyDialog = storyDialog;
  }

  toggle(forceState) {
    this.isOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;
    if (this.modal) {
      this.modal.classList.toggle('open', this.isOpen);
    }
    if (this.isOpen) {
      if (document.pointerLockElement) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      document.body.classList.add('modal-open');
      this.storyDialog?.stashForModal();
      if (this.objectiveSystem) {
        this.objectiveSystem.recordInventoryOpened();
      }
      this.render();
    } else {
      const settingsOpen = document.getElementById('settings-modal')?.classList.contains('open');
      if (!settingsOpen) {
        document.body.classList.remove('modal-open');
        this.storyDialog?.restoreFromModal();
      }
    }
    return this.isOpen;
  }

  switchTab(tabId) {
    this.activeTab = tabId;
    this.tabBtns.forEach((b) => b.classList.toggle('active', b.dataset.tab === tabId));
    document.querySelectorAll('.inv-tab-pane').forEach((pane) => {
      pane.style.display = pane.id === `inv-pane-${tabId}` ? 'flex' : 'none';
    });
    this.render();
  }

  canCraft(recipeId) {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.explorer) return false;
    if (!recipe.repeatable && this.explorer.craftedUpgrades && this.explorer.craftedUpgrades[recipeId]) return false;

    for (const [key, req] of Object.entries(recipe.costs)) {
      if ((this.explorer.inventory[key] || 0) < req) return false;
    }
    return true;
  }

  craftUpgrade(recipeId) {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.explorer) return false;
    if (!recipe.repeatable && this.explorer.craftedUpgrades[recipeId]) {
      if (this.onNotice) this.onNotice(`${recipe.name} is already installed!`);
      return false;
    }
    if (!this.canCraft(recipeId)) {
      if (this.onNotice) this.onNotice(`Insufficient resources! Need ${recipe.costText}.`);
      return false;
    }

    for (const [key, req] of Object.entries(recipe.costs)) {
      this.explorer.inventory[key] -= req;
    }

    if (!recipe.repeatable) {
      this.explorer.craftedUpgrades[recipeId] = true;
    }

    if (recipeId === 'exosuit') {
      this.explorer.maxSuitHealth = 150;
      this.explorer.suitHealth = 150;
    } else if (recipeId === 'rebreather') {
      this.explorer.maxOxygen = 200;
      this.explorer.oxygen = 200;
    } else if (recipeId === 'shipPlating' && this.ship) {
      this.ship.maxHullIntegrity = 150;
      this.ship.hullIntegrity = 100;
    } else if (recipeId === 'goliathOverdrive') {
      if (typeof this.explorer.applyVoidCrystalBoosts === 'function') {
        this.explorer.applyVoidCrystalBoosts(0);
      }
    } else if (recipeId === 'ammoCell') {
      const added = this.explorer.replenishAmmo(30);
      if (this.onNotice) this.onNotice(`Synthesized Ammo Pack! (+${added} Plasma Rounds) [${this.explorer.ammo}/${this.explorer.maxAmmo}]`, 3.0);
    }

    if (this.objectiveSystem) {
      this.objectiveSystem.recordUpgradeCrafted();
    }
    if (this.onNotice) {
      this.onNotice(`Crafted & Installed: ${recipe.name}!`);
    }
    this.render();
    return true;
  }

  render() {
    if (!this.explorer) return;

    // 1. Render Resources
    if (this.elResourceGrid) {
      this.elResourceGrid.innerHTML = '';
      for (const item of RESOURCE_ITEMS) {
        const count = this.explorer.inventory[item.key] || 0;
        const card = document.createElement('div');
        card.className = 'inv-item-card';
        card.innerHTML = `
          <div class="inv-item-top">
            <span class="inv-swatch" style="background:${item.color}"></span>
            <div class="inv-item-titles">
              <strong>${item.name}</strong>
              <small>${item.category}</small>
            </div>
            <span class="inv-item-count">${count}</span>
          </div>
          <p class="inv-item-desc">${item.desc}</p>
        `;
        this.elResourceGrid.appendChild(card);
      }
    }

    // 2. Render Crafting Upgrades
    if (this.elCraftingGrid) {
      this.elCraftingGrid.innerHTML = '';
      for (const recipe of CRAFTING_RECIPES) {
        const installed = Boolean(this.explorer.craftedUpgrades?.[recipe.id]);
        const craftable = this.canCraft(recipe.id);
        const card = document.createElement('div');
        card.className = `inv-recipe-card ${installed ? 'installed' : ''}`;
        card.innerHTML = `
          <div class="inv-recipe-info">
            <div class="inv-recipe-title-row">
              <strong>${recipe.name}</strong>
              <span class="inv-cost-pill">${installed ? 'INSTALLED ✓' : recipe.costText}</span>
            </div>
            <p class="inv-item-desc">${recipe.desc}</p>
          </div>
          <button type="button" class="inv-craft-btn ${installed ? 'done' : ''}" data-recipe="${recipe.id}" ${installed || !craftable ? 'disabled' : ''}>
            ${installed ? 'ACTIVE' : (craftable ? 'CRAFT UPGRADE' : 'NEED RESOURCES')}
          </button>
        `;
        const btn = card.querySelector('.inv-craft-btn');
        btn?.addEventListener('click', () => this.craftUpgrade(recipe.id));
        this.elCraftingGrid.appendChild(card);
      }
    }

    // 3. Render Xenology Codex (Fauna & Flora Reorganized by Habitat)
    if (this.elCodexGrid) {
      this.elCodexGrid.innerHTML = '';

      const makeCategoryHeader = (icon, title, count) => {
        const header = document.createElement('div');
        header.className = 'codex-category-header';
        header.innerHTML = `
          <span class="codex-cat-title">${icon} ${title}</span>
          <span class="codex-cat-count">${count} ${count === 1 ? 'Entry' : 'Entries'}</span>
        `;
        return header;
      };

      const makeFaunaCard = (sp) => {
        const card = document.createElement('div');
        card.className = `inv-codex-card fauna-card fauna-${sp.locomotion}`;
        const sizeClass = `badge-size-${sp.sizeCategory || 'medium'}`;
        const tempClass = `badge-temp-${sp.temperament || 'docile'}`;
        const habClass = `badge-habitat-${sp.locomotion === 'walking' ? 'land' : (sp.locomotion === 'swimming' ? 'aquatic' : 'flying')}`;

        const attackBadge = sp.attackDamage > 0 ? `<span>DMG: ${sp.attackDamage}</span>` : '';
        const combatStats = `<div class="codex-stats-row"><span>HP: ${sp.maxHealth}</span>${attackBadge}<span>SPD: ${sp.speed} m/s</span></div>`;

        card.innerHTML = `
          <div class="inv-codex-header">
            <strong>${sp.name}</strong>
            <div class="codex-chip-group">
              <span class="codex-badge ${sizeClass}">${(sp.sizeCategory || '').toUpperCase()}</span>
              <span class="codex-badge ${tempClass}">${(sp.temperament || '').toUpperCase()}</span>
              <span class="codex-badge ${habClass}">${(sp.locomotion || '').toUpperCase()}</span>
            </div>
          </div>
          <div class="codex-meta">Habitat: ${sp.biome} | Drops: <em>${sp.dropLabel}</em></div>
          ${combatStats}
          <p class="inv-item-desc">${sp.description}</p>
        `;
        return card;
      };

      const makeFloraCard = (fl) => {
        const card = document.createElement('div');
        card.className = 'inv-codex-card flora-card';
        const rangeInfo = fl.depth ? ` | Depth: <em>${fl.depth}</em>` : '';
        card.innerHTML = `
          <div class="inv-codex-header">
            <strong>${fl.name}</strong>
            <div class="codex-chip-group">
              <span class="codex-badge badge-habitat-flora">${fl.solid}</span>
            </div>
          </div>
          <div class="codex-meta">Biome: ${fl.biome}${rangeInfo}</div>
          <p class="inv-item-desc">${fl.desc}</p>
        `;
        return card;
      };

      // Section 1: Terrestrial Fauna (Land Dwelling 1-5)
      const landFaunaKeys = ['colossal_behemoth', 'bipedal_tracker', 'armored_burrower', 'herding_quadruped', 'scurrying_swarmer'];
      const landFauna = landFaunaKeys.map((k) => FAUNA_SPECIES[k]).filter(Boolean);
      this.elCodexGrid.appendChild(makeCategoryHeader('🌿', 'Terrestrial Fauna (Land Dwelling)', landFauna.length));
      landFauna.forEach((sp) => this.elCodexGrid.appendChild(makeFaunaCard(sp)));

      // Section 2: Marine Fauna (Aquatic 6-8)
      const marineFaunaKeys = ['leviathan_eel', 'faceted_ray', 'plated_crustacean'];
      const marineFauna = marineFaunaKeys.map((k) => FAUNA_SPECIES[k]).filter(Boolean);
      this.elCodexGrid.appendChild(makeCategoryHeader('🌊', 'Marine Fauna (Aquatic)', marineFauna.length));
      marineFauna.forEach((sp) => this.elCodexGrid.appendChild(makeFaunaCard(sp)));

      // Section 3: Aerial Fauna (Flying 9-10)
      const aerialFaunaKeys = ['aerial_skimmer', 'tiny_darting_flier'];
      const aerialFauna = aerialFaunaKeys.map((k) => FAUNA_SPECIES[k]).filter(Boolean);
      this.elCodexGrid.appendChild(makeCategoryHeader('🪽', 'Aerial Fauna (Flying)', aerialFauna.length));
      aerialFauna.forEach((sp) => this.elCodexGrid.appendChild(makeFaunaCard(sp)));

      // Section 4: Terrestrial Flora (Land Plants)
      const terrestrialFlora = FLORA_CODEX.filter((fl) => fl.category === 'terrestrial');
      this.elCodexGrid.appendChild(makeCategoryHeader('🌲', 'Terrestrial Flora (Land Plants)', terrestrialFlora.length));
      terrestrialFlora.forEach((fl) => this.elCodexGrid.appendChild(makeFloraCard(fl)));

      // Section 5: Marine Flora (Aquatic Flora)
      const marineFlora = FLORA_CODEX.filter((fl) => fl.category === 'marine');
      this.elCodexGrid.appendChild(makeCategoryHeader('🪸', 'Marine Flora (Aquatic Flora)', marineFlora.length));
      marineFlora.forEach((fl) => this.elCodexGrid.appendChild(makeFloraCard(fl)));
    }

    // 4. Render Mission Log Chapters
    if (this.elMissionsList && this.objectiveSystem) {
      this.elMissionsList.innerHTML = '';
      for (const ch of this.objectiveSystem.chapters) {
        const done = this.objectiveSystem.completedChapters.has(ch.id);
        const block = document.createElement('div');
        block.className = `inv-mission-block ${done ? 'completed' : ''}`;
        const tasksHtml = ch.tasks.map((t) => {
          const tDone = t.isDone(this.objectiveSystem.stats);
          const prog = t.getProgress(this.objectiveSystem.stats);
          return `<div class="inv-mission-task ${tDone ? 'done' : ''}">
            <span>${tDone ? '✓' : '○'} ${t.label}</span>
            <strong>${prog}</strong>
          </div>`;
        }).join('');
        block.innerHTML = `
          <div class="inv-mission-header">
            <strong>${ch.title}</strong>
            <span class="codex-tag ${done ? 'docile' : 'flora'}">${done ? 'COMPLETED' : 'IN PROGRESS'}</span>
          </div>
          <div class="inv-mission-tasks">${tasksHtml}</div>
        `;
        this.elMissionsList.appendChild(block);
      }
    }
  }
}
