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
  }
];

export const RESOURCE_ITEMS = [
  { key: 'titanium', name: 'Titanium Alloy', category: 'Mineral Ore', color: '#4cc9f0', desc: 'High-tensile structural alloy mined from surface & lunar nodes.' },
  { key: 'crystal', name: 'Silica Crystal', category: 'Energetic Shard', color: '#f72585', desc: 'Piezoelectric lattice used in plasma optics and life-support filters.' },
  { key: 'void_crystal', name: 'Void Aetherium', category: 'Goliath Mineral', color: '#d900ff', desc: 'Hyper-resonant crystal from Moon III: Goliath. Infuses suit systems with kinetic velocity, enhanced jump propulsion, expanded shield capacity, and pressurized oxygen reserves.' },
  { key: 'chitin_shell', name: 'Chitin Shell', category: 'Organic Carapace', color: '#2ec4b6', desc: 'Harvested from Hexapod Striders. Lightweight impact-absorbing armor.' },
  { key: 'apex_fang', name: 'Apex Fang', category: 'Predator Trophy', color: '#ff595e', desc: 'Dense hyper-conductive fang dropped by aggressive Spined Stalkers.' },
  { key: 'biolum_gland', name: 'Bioluminescent Gland', category: 'Aquatic Organ', color: '#00f5d4', desc: 'Oxygen-synthesizing organ harvested from Ribbon Leviathans.' },
  { key: 'abyssal_pearl', name: 'Abyssal Pearl', category: 'Hadal Relic', color: '#c77dff', desc: 'Ultra-dense crystalline pearl formed inside Abyssal Maw trench predators.' },
  { key: 'aero_membrane', name: 'Aero Membrane', category: 'Thermal Wing', color: '#9ef01a', desc: 'Ultra-lightweight glider membrane from Aurelian Sky-Mantas.' }
];

export const FLORA_CODEX = [
  { name: 'Bioluminescent Giant Mushroom', biome: 'Tropical Valleys & Plateaus', solid: 'Solid Trunk Collider', desc: 'Curved fungal towers with glowing turquoise under-gills that illuminate nocturnal jungles.' },
  { name: 'Curved Alien Palm', biome: 'Coastal Beaches & Islands', solid: 'Solid Trunk Collider', desc: 'Wind-swept tropical palms with multi-segmented trunks and drooping cyan fronds.' },
  { name: 'Branching Silica Crystal Spire', biome: 'Highland Ridges & Craters', solid: 'Solid Spire Collider', desc: 'Pink crystalline spires with procedural offshoots that hum with geomagnetic resonance.' },
  { name: 'Bioluminescent Spore-Fern', biome: 'Mid-Elevation Jungle Floor', solid: 'Solid Basal Rosette', desc: 'Ancient cycad rosettes with 7 curved fronds and hovering golden spore orbs.' },
  { name: 'Spiral Tendril Shrub', biome: 'Humid Jungle Clearings', solid: 'Solid Coiled Base', desc: 'Helical violet vines tipped with pulsing magenta bioluminescent lantern bulbs.' },
  { name: 'Abyssal Giant Kelp & Trench Vents', biome: 'Submerged Ocean Floor (-5m to -160m)', solid: 'Aquatic Flora', desc: 'Towering underwater kelp forests and thermal coral pillars thriving in deep oceanic trenches.' }
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

  toggle(forceState) {
    this.isOpen = typeof forceState === 'boolean' ? forceState : !this.isOpen;
    if (this.modal) {
      this.modal.classList.toggle('open', this.isOpen);
    }
    if (this.isOpen) {
      if (document.pointerLockElement) {
        try { document.exitPointerLock(); } catch (_) {}
      }
      if (this.objectiveSystem) {
        this.objectiveSystem.recordInventoryOpened();
      }
      this.render();
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
    if (this.explorer.craftedUpgrades && this.explorer.craftedUpgrades[recipeId]) return false;

    for (const [key, req] of Object.entries(recipe.costs)) {
      if ((this.explorer.inventory[key] || 0) < req) return false;
    }
    return true;
  }

  craftUpgrade(recipeId) {
    const recipe = CRAFTING_RECIPES.find((r) => r.id === recipeId);
    if (!recipe || !this.explorer) return false;
    if (this.explorer.craftedUpgrades[recipeId]) {
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

    this.explorer.craftedUpgrades[recipeId] = true;

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

    // 3. Render Xenology Codex (Fauna & Flora)
    if (this.elCodexGrid) {
      this.elCodexGrid.innerHTML = '';
      Object.values(FAUNA_SPECIES).forEach((sp) => {
        const isHostile = sp.temperament === 'aggressive';
        const card = document.createElement('div');
        card.className = 'inv-codex-card';
        card.innerHTML = `
          <div class="inv-codex-header">
            <strong>${sp.name}</strong>
            <span class="codex-tag ${isHostile ? 'hostile' : 'docile'}">${sp.locomotion.toUpperCase()} • ${sp.temperament.toUpperCase()}</span>
          </div>
          <div class="codex-meta">Habitat: ${sp.biome} | Drops: <em>${sp.dropLabel}</em> (${sp.maxHealth} HP)</div>
          <p class="inv-item-desc">${sp.description}</p>
        `;
        this.elCodexGrid.appendChild(card);
      });

      FLORA_CODEX.forEach((fl) => {
        const card = document.createElement('div');
        card.className = 'inv-codex-card flora-card';
        card.innerHTML = `
          <div class="inv-codex-header">
            <strong>${fl.name}</strong>
            <span class="codex-tag flora">${fl.solid}</span>
          </div>
          <div class="codex-meta">Biome: ${fl.biome}</div>
          <p class="inv-item-desc">${fl.desc}</p>
        `;
        this.elCodexGrid.appendChild(card);
      });
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
