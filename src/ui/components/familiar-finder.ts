/**
 * Familiar Finder Component
 * Finds minimum set of familiars to cover all types and elements
 * with the ability to choose between alternatives
 */

import { safeGetItem, safeSetItem } from '../../state/persistence.js';

interface FamiliarData {
  FamiliarId: number;
  MobId: number;
  MobName: string;
  Level: number;
  TypeId: number;
  TypeName: string;
  ElementCode: string;
  ElementName: string;
}

interface NormalizedFamiliar extends FamiliarData {
  element: string;
  type: string;
}

interface SelectedFamiliar extends NormalizedFamiliar {
  newType: boolean;
  newElement: boolean;
}

const ELEMENTS = ['None', 'Fire', 'Poison', 'Lightning', 'Ice', 'Dark', 'Holy'];
const TYPES = ['Human', 'Beast', 'Plant', 'Aquatic', 'Fairy', 'Reptile', 'Devil', 'Undead', 'Machine'];

// Familiars that are unobtainable or should be excluded from coverage calculations
const EXCLUDED_FAMILIARS = new Set([
  'Corrupted Stormcaster',
  'Stormcaster Caeneus',
  'Ghostwood Stumpy',
  'Royal Guard',
  'Imperial Guard',
  'Enhanced Maverick Beta',
  'Maverick Alpha',
  'Afterlord',
  'Prototype Lord',
  'Overlord',
  'Romantic Slime',
  'Spirit Debris',
  'Chosen Seren',
  'Thralled Warhammer Knight',
  'Thralled Guard',
  'Mihile',
  'Guard Captain Darknell',
  'Dark Miscreation',
  'Entangled Fragment',
  'Faith Fragment',
  'Red-eyed Gargoyle',
  'Dreamkeeper',
  'Dark Demon Wolfmaster',
  'Dark Demon Shieldmaster',
  'Dark Demon Shieldbearer',
  'Dark Demon Axeman',
  'Dark Demon Swordmaster',
  'Damien',
  'Normal Damien',
  'Master Specter',
  'Permeating Vanity',
  'Permeating Anxiety',
]);

const ELEMENT_MAP: Record<string, string> = {
  'N': 'None',
  'F': 'Fire',
  'P': 'Poison',
  'L': 'Lightning',
  'I': 'Ice',
  'D': 'Dark',
  'H': 'Holy'
};

type CoverageMode = 'both' | 'types' | 'elements';

// Preset data structure for saving/loading configurations
interface FamiliarFinderPreset {
  id: number;
  name: string;
  ignoredIds: number[];
  lockedSelections: [string, number][];
  mode: CoverageMode;
  doneIds: number[];
  createdAt: string;
}

// localStorage keys
const STORAGE_KEYS = {
  PRESETS: 'famfinderPresets',
  DONE_IDS: 'famfinderDoneIds',
} as const;

let allFamiliars: NormalizedFamiliar[] = [];
const ignoredIds = new Set<number>();
const lockedSelections = new Map<string, number>(); // key: "type-element", value: FamiliarId
let currentMode: CoverageMode = 'both';

// New state for presets and done tracking
const doneFamiliarIds = new Set<number>();
let savedPresets: FamiliarFinderPreset[] = [];
let activePresetId: number | null = null;

/**
 * Initialize the familiar finder
 */
export async function initFamiliarFinder(): Promise<void> {
  try {
    const response = await fetch('familiars.json');
    const familiars: FamiliarData[] = await response.json();

    // Filter to level 185-294, exclude unobtainable, and normalize
    allFamiliars = familiars
      .filter(f => f.Level >= 185 && f.Level < 295 && !EXCLUDED_FAMILIARS.has(f.MobName))
      .map(f => ({
        ...f,
        element: f.ElementName || ELEMENT_MAP[f.ElementCode] || 'None',
        type: f.TypeName
      }));

    // Load persisted state (presets and done IDs)
    loadPersistedFamfinderState();

    // Setup event handlers
    setupEventHandlers();

    // Render presets section
    renderPresetsSection();

    // Initial render
    findMinimumFamiliars();
  } catch (error) {
    console.error('Failed to load familiars:', error);
    const statsDiv = document.getElementById('famfinderStats');
    if (statsDiv) {
      statsDiv.innerHTML = `<p style="color: #ff6666;">Error loading familiars data</p>`;
    }
  }
}

/**
 * Setup event handlers for the familiar finder
 */
function setupEventHandlers(): void {
  // Clear ignored button
  const clearBtn = document.getElementById('famfinderClearIgnored');
  if (clearBtn) {
    clearBtn.addEventListener('click', clearIgnored);
  }

  // Mode selector buttons
  document.querySelectorAll('.famfinder-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.getAttribute('data-mode') as CoverageMode;
      if (mode) {
        setMode(mode);
      }
    });
  });

  // Save preset button
  const savePresetBtn = document.getElementById('famfinderSavePresetBtn');
  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', showSavePresetModal);
  }

  // Save preset confirm button
  const savePresetConfirm = document.getElementById('famfinderSavePresetConfirm');
  if (savePresetConfirm) {
    savePresetConfirm.addEventListener('click', handleSavePresetSubmit);
  }

  // Enter key in preset name input
  const presetNameInput = document.getElementById('famfinderPresetNameInput');
  if (presetNameInput) {
    presetNameInput.addEventListener('keypress', (e) => {
      if ((e as KeyboardEvent).key === 'Enter') {
        handleSavePresetSubmit();
      }
    });
  }
}

/**
 * Set the coverage mode
 */
function setMode(mode: CoverageMode): void {
  currentMode = mode;

  // Update button states
  document.querySelectorAll('.famfinder-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === mode);
  });

  // Clear locked selections when changing mode
  lockedSelections.clear();

  // Recalculate
  findMinimumFamiliars();
}

/**
 * Add a familiar to ignored list
 */
function ignoreFamiliar(id: number): void {
  ignoredIds.add(id);
  // Remove from locked selections if it was locked
  for (const [key, lockedId] of lockedSelections.entries()) {
    if (lockedId === id) {
      lockedSelections.delete(key);
    }
  }
  findMinimumFamiliars();
}

/**
 * Remove a familiar from ignored list
 */
function unignoreFamiliar(id: number): void {
  ignoredIds.delete(id);
  findMinimumFamiliars();
}

/**
 * Clear all ignored familiars
 */
function clearIgnored(): void {
  ignoredIds.clear();
  lockedSelections.clear();
  findMinimumFamiliars();
}

/**
 * Lock a specific familiar choice for a type/element combo
 */
function lockSelection(type: string, element: string, familiarId: number): void {
  // Lock key depends on mode
  let key = `${type}-${element}`;
  if (currentMode === 'types') key = type;
  if (currentMode === 'elements') key = element;

  lockedSelections.set(key, familiarId);
  findMinimumFamiliars();
  closeAlternativesModal();
}

/**
 * Get alternatives based on current mode
 */
function getAlternatives(type: string, element: string): NormalizedFamiliar[] {
  return allFamiliars
    .filter(f => {
      if (ignoredIds.has(f.FamiliarId)) return false;
      if (currentMode === 'types') return f.type === type;
      if (currentMode === 'elements') return f.element === element;
      return f.type === type && f.element === element;
    })
    .sort((a, b) => b.Level - a.Level);
}

/**
 * Show alternatives modal
 */
function showAlternatives(type: string, element: string, currentId: number): void {
  const alternatives = getAlternatives(type, element);

  if (alternatives.length <= 1) {
    return; // No alternatives available
  }

  const modal = document.getElementById('famfinderAlternativesModal');
  const infoEl = document.getElementById('famfinderAlternativesInfo');
  const listEl = document.getElementById('famfinderAlternativesList');

  if (!modal || !infoEl || !listEl) return;

  // Set info text based on mode
  if (currentMode === 'types') {
    infoEl.textContent = `${alternatives.length} familiars with ${type} type:`;
  } else if (currentMode === 'elements') {
    infoEl.textContent = `${alternatives.length} familiars with ${element} element:`;
  } else {
    infoEl.textContent = `${alternatives.length} familiars with ${type} type and ${element} element:`;
  }

  listEl.innerHTML = alternatives.map(fam => `
    <div class="famfinder-alternative-item element-${fam.element.toLowerCase()} ${fam.FamiliarId === currentId ? 'selected' : ''}"
         data-id="${fam.FamiliarId}" data-type="${type}" data-element="${element}">
      <div class="famfinder-alternative-info">
        <div class="famfinder-alternative-name">${fam.MobName}</div>
        <div class="famfinder-alternative-details">Level ${fam.Level} | ${fam.type} | ${fam.element}</div>
      </div>
      <div class="famfinder-alternative-action">
        <button class="select-btn" data-action="select-alternative">Select</button>
      </div>
    </div>
  `).join('');

  // Add event listeners to select buttons
  listEl.querySelectorAll('[data-action="select-alternative"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const item = (e.target as HTMLElement).closest('.famfinder-alternative-item');
      if (!item) return;
      const id = parseInt(item.getAttribute('data-id') || '0');
      const itemType = item.getAttribute('data-type') || '';
      const itemElement = item.getAttribute('data-element') || '';
      lockSelection(itemType, itemElement, id);
    });
  });

  // Also allow clicking the row
  listEl.querySelectorAll('.famfinder-alternative-item').forEach(item => {
    item.addEventListener('click', () => {
      const id = parseInt(item.getAttribute('data-id') || '0');
      const itemType = item.getAttribute('data-type') || '';
      const itemElement = item.getAttribute('data-element') || '';
      lockSelection(itemType, itemElement, id);
    });
  });

  modal.style.display = 'flex';
}

/**
 * Close alternatives modal
 */
function closeAlternativesModal(): void {
  const modal = document.getElementById('famfinderAlternativesModal');
  if (modal) {
    modal.style.display = 'none';
  }
}

/**
 * Find minimum familiars using greedy set cover with locked selections
 */
function findMinimumFamiliars(): void {
  try {
    // Filter out ignored familiars
    const available = allFamiliars.filter(f => !ignoredIds.has(f.FamiliarId));

    // Greedy set cover algorithm with locked selections
    // Only track what we need based on mode
    const uncoveredTypes = currentMode !== 'elements' ? new Set(TYPES) : new Set<string>();
    const uncoveredElements = currentMode !== 'types' ? new Set(ELEMENTS) : new Set<string>();
    const selectedFamiliars: SelectedFamiliar[] = [];
    const usedIds = new Set<number>();

    // First, apply locked selections
    for (const [key, familiarId] of lockedSelections.entries()) {
      const fam = available.find(f => f.FamiliarId === familiarId);
      if (!fam) continue;

      usedIds.add(fam.FamiliarId);
      selectedFamiliars.push({
        ...fam,
        newType: uncoveredTypes.has(fam.type),
        newElement: uncoveredElements.has(fam.element)
      });

      uncoveredTypes.delete(fam.type);
      uncoveredElements.delete(fam.element);
    }

    // Keep selecting familiars until everything is covered
    while (uncoveredTypes.size > 0 || uncoveredElements.size > 0) {
      let bestFamiliar: NormalizedFamiliar | null = null;
      let bestScore = 0;

      // Find familiar that covers the most uncovered items
      for (const fam of available) {
        if (usedIds.has(fam.FamiliarId)) continue;

        let score = 0;
        if (currentMode !== 'elements' && uncoveredTypes.has(fam.type)) score++;
        if (currentMode !== 'types' && uncoveredElements.has(fam.element)) score++;

        // Prefer higher coverage, then higher level
        if (score > bestScore || (score === bestScore && bestFamiliar && fam.Level > bestFamiliar.Level)) {
          bestScore = score;
          bestFamiliar = fam;
        }
      }

      if (!bestFamiliar || bestScore === 0) {
        break;
      }

      usedIds.add(bestFamiliar.FamiliarId);
      selectedFamiliars.push({
        ...bestFamiliar,
        newType: uncoveredTypes.has(bestFamiliar.type),
        newElement: uncoveredElements.has(bestFamiliar.element)
      });

      uncoveredTypes.delete(bestFamiliar.type);
      uncoveredElements.delete(bestFamiliar.element);
    }

    // Render results
    renderIgnoredSection();
    renderStats(available.length, selectedFamiliars.length, uncoveredTypes, uncoveredElements, selectedFamiliars);
    renderCoverage(uncoveredTypes, uncoveredElements);
    renderResults(selectedFamiliars);

  } catch (error) {
    console.error('Error in findMinimumFamiliars:', error);
  }
}

/**
 * Render ignored familiars section
 */
function renderIgnoredSection(): void {
  const section = document.getElementById('famfinderIgnored');
  const listEl = document.getElementById('famfinderIgnoredList');

  if (!section || !listEl) return;

  if (ignoredIds.size > 0) {
    section.style.display = 'block';
    const ignoredFams = allFamiliars.filter(f => ignoredIds.has(f.FamiliarId));
    listEl.innerHTML = ignoredFams.map(f =>
      `<span class="famfinder-ignored-tag" data-id="${f.FamiliarId}">${f.MobName} ✕</span>`
    ).join('');

    // Add click handlers
    listEl.querySelectorAll('.famfinder-ignored-tag').forEach(tag => {
      tag.addEventListener('click', () => {
        const id = parseInt(tag.getAttribute('data-id') || '0');
        unignoreFamiliar(id);
      });
    });
  } else {
    section.style.display = 'none';
  }
}

/**
 * Render stats
 */
function renderStats(
  availableCount: number,
  selectedCount: number,
  uncoveredTypes: Set<string>,
  uncoveredElements: Set<string>,
  selectedFamiliars: SelectedFamiliar[]
): void {
  const statsDiv = document.getElementById('famfinderStats');
  if (!statsDiv) return;

  const coveredTypes = TYPES.filter(t => !uncoveredTypes.has(t));
  const coveredElements = ELEMENTS.filter(e => !uncoveredElements.has(e));

  let needToCover = '';
  if (currentMode === 'both') {
    needToCover = `${TYPES.length} types + ${ELEMENTS.length} elements = 16 total`;
  } else if (currentMode === 'types') {
    needToCover = `${TYPES.length} types`;
  } else {
    needToCover = `${ELEMENTS.length} elements`;
  }

  let coverageStats = '';
  if (currentMode !== 'elements') {
    coverageStats += `<p><strong>Types covered:</strong> ${coveredTypes.length}/${TYPES.length}</p>`;
  }
  if (currentMode !== 'types') {
    coverageStats += `<p><strong>Elements covered:</strong> ${coveredElements.length}/${ELEMENTS.length}</p>`;
  }

  // Calculate done count
  const doneInSelection = selectedFamiliars.filter(f => doneFamiliarIds.has(f.FamiliarId)).length;
  const doneStats = doneFamiliarIds.size > 0
    ? `<p><strong>Done:</strong> ${doneInSelection}/${selectedCount} in current set (${doneFamiliarIds.size} total marked)</p>`
    : '';

  statsDiv.innerHTML = `
    <p><strong>Total level 185-294 familiars:</strong> ${availableCount} (${ignoredIds.size} ignored)</p>
    <p><strong>Need to cover:</strong> ${needToCover}</p>
    <p><strong>Minimum familiars needed:</strong> ${selectedCount}</p>
    ${coverageStats}
    ${doneStats}
  `;
}

/**
 * Render coverage status
 */
function renderCoverage(uncoveredTypes: Set<string>, uncoveredElements: Set<string>): void {
  const coverageDiv = document.getElementById('famfinderCoverage');
  if (!coverageDiv) return;

  const coveredTypes = TYPES.filter(t => !uncoveredTypes.has(t));
  const coveredElements = ELEMENTS.filter(e => !uncoveredElements.has(e));

  let html = '';

  if (currentMode !== 'elements') {
    html += `
      <div class="famfinder-coverage-section">
        <h4>Types (${coveredTypes.length}/${TYPES.length})</h4>
        ${TYPES.map(t => `<span class="famfinder-tag ${uncoveredTypes.has(t) ? 'missing' : 'covered'}">${t}</span>`).join('')}
      </div>
    `;
  }

  if (currentMode !== 'types') {
    html += `
      <div class="famfinder-coverage-section">
        <h4>Elements (${coveredElements.length}/${ELEMENTS.length})</h4>
        ${ELEMENTS.map(e => `<span class="famfinder-tag ${uncoveredElements.has(e) ? 'missing' : 'covered'}">${e}</span>`).join('')}
      </div>
    `;
  }

  coverageDiv.innerHTML = html;
}

/**
 * Render results grid
 */
function renderResults(selectedFamiliars: SelectedFamiliar[]): void {
  const resultsDiv = document.getElementById('famfinderResults');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = selectedFamiliars.map((fam, i) => {
    const covers: string[] = [];
    if (currentMode !== 'elements' && fam.newType) covers.push(fam.type);
    if (currentMode !== 'types' && fam.newElement) covers.push(fam.element);

    const alternatives = getAlternatives(fam.type, fam.element);
    const hasAlternatives = alternatives.length > 1;

    // Lock key depends on mode
    let lockKey = `${fam.type}-${fam.element}`;
    if (currentMode === 'types') lockKey = fam.type;
    if (currentMode === 'elements') lockKey = fam.element;
    const isLocked = lockedSelections.has(lockKey);

    // Check done state
    const famIsDone = doneFamiliarIds.has(fam.FamiliarId);

    return `
      <div class="famfinder-card element-${fam.element.toLowerCase()}${famIsDone ? ' done' : ''}" data-id="${fam.FamiliarId}">
        <div class="famfinder-card-header">
          <span class="famfinder-card-name">
            ${famIsDone ? '<span class="famfinder-done-badge">&#10003;</span>' : ''}
            ${fam.MobName}
          </span>
          <span class="famfinder-card-index">#${i + 1}</span>
        </div>
        <div class="famfinder-card-info">Level ${fam.Level} | ${fam.type} | ${fam.element}</div>
        <div class="famfinder-card-covers">New coverage: ${covers.join(', ')}</div>
        ${hasAlternatives ? `<div class="famfinder-alternatives-count">${alternatives.length} alternatives available${isLocked ? ' (locked)' : ''}</div>` : ''}
        <div class="famfinder-card-actions">
          <button class="famfinder-btn done${famIsDone ? ' active' : ''}" data-action="toggle-done" data-id="${fam.FamiliarId}">${famIsDone ? 'Undo' : 'Done'}</button>
          ${hasAlternatives ? `<button class="famfinder-btn alternatives" data-action="show-alternatives" data-type="${fam.type}" data-element="${fam.element}" data-current="${fam.FamiliarId}">Choose</button>` : ''}
          <button class="famfinder-btn ignore" data-action="ignore" data-id="${fam.FamiliarId}">Ignore</button>
        </div>
      </div>
    `;
  }).join('');

  // Add event handlers
  resultsDiv.querySelectorAll('[data-action="show-alternatives"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const type = (e.target as HTMLElement).getAttribute('data-type') || '';
      const element = (e.target as HTMLElement).getAttribute('data-element') || '';
      const currentId = parseInt((e.target as HTMLElement).getAttribute('data-current') || '0');
      showAlternatives(type, element, currentId);
    });
  });

  resultsDiv.querySelectorAll('[data-action="ignore"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id') || '0');
      ignoreFamiliar(id);
    });
  });

  // Done toggle handlers
  resultsDiv.querySelectorAll('[data-action="toggle-done"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id') || '0');
      toggleDone(id);
    });
  });
}

// ============================================
// PERSISTENCE FUNCTIONS
// ============================================

/**
 * Load persisted state from localStorage
 */
function loadPersistedFamfinderState(): void {
  savedPresets = safeGetItem<FamiliarFinderPreset[]>(STORAGE_KEYS.PRESETS, []);
  const doneIds = safeGetItem<number[]>(STORAGE_KEYS.DONE_IDS, []);
  doneFamiliarIds.clear();
  doneIds.forEach(id => doneFamiliarIds.add(id));
}

/**
 * Save presets to localStorage
 */
function savePresets(): void {
  safeSetItem(STORAGE_KEYS.PRESETS, savedPresets);
}

/**
 * Save done IDs to localStorage
 */
function saveDoneIds(): void {
  safeSetItem(STORAGE_KEYS.DONE_IDS, Array.from(doneFamiliarIds));
}

// ============================================
// PRESET MANAGEMENT FUNCTIONS
// ============================================

/**
 * Save current state as a new preset
 */
function savePreset(name: string): void {
  const preset: FamiliarFinderPreset = {
    id: Date.now(),
    name: name.trim(),
    ignoredIds: Array.from(ignoredIds),
    lockedSelections: Array.from(lockedSelections.entries()),
    mode: currentMode,
    doneIds: Array.from(doneFamiliarIds),
    createdAt: new Date().toISOString()
  };
  savedPresets.push(preset);
  activePresetId = preset.id;
  savePresets();
  renderPresetsSection();
}

/**
 * Load a preset by ID
 */
function loadPreset(presetId: number): void {
  const preset = savedPresets.find(p => p.id === presetId);
  if (!preset) return;

  // Restore state
  ignoredIds.clear();
  preset.ignoredIds.forEach(id => ignoredIds.add(id));

  lockedSelections.clear();
  preset.lockedSelections.forEach(([key, id]) => lockedSelections.set(key, id));

  currentMode = preset.mode;
  activePresetId = presetId;

  // Restore done state (handle legacy presets without doneIds)
  doneFamiliarIds.clear();
  if (preset.doneIds) {
    preset.doneIds.forEach(id => doneFamiliarIds.add(id));
  }
  saveDoneIds();

  // Update mode button UI
  document.querySelectorAll('.famfinder-mode-btn').forEach(btn => {
    btn.classList.toggle('active', btn.getAttribute('data-mode') === currentMode);
  });

  // Recalculate and render
  findMinimumFamiliars();
  renderPresetsSection();
}

/**
 * Delete a preset by ID
 */
function deletePreset(presetId: number): void {
  savedPresets = savedPresets.filter(p => p.id !== presetId);
  if (activePresetId === presetId) {
    activePresetId = null;
  }
  savePresets();
  renderPresetsSection();
}

/**
 * Show save preset modal
 */
function showSavePresetModal(): void {
  const modal = document.getElementById('famfinderSavePresetModal');
  const input = document.getElementById('famfinderPresetNameInput') as HTMLInputElement;
  if (!modal || !input) return;
  input.value = '';
  modal.style.display = 'flex';
  input.focus();
}

/**
 * Close save preset modal
 */
function closeSavePresetModal(): void {
  const modal = document.getElementById('famfinderSavePresetModal');
  if (modal) modal.style.display = 'none';
}

/**
 * Handle save preset form submission
 */
function handleSavePresetSubmit(): void {
  const input = document.getElementById('famfinderPresetNameInput') as HTMLInputElement;
  const name = input?.value.trim();
  if (!name) return;
  savePreset(name);
  closeSavePresetModal();
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Render presets section
 */
function renderPresetsSection(): void {
  const listEl = document.getElementById('famfinderPresetsList');
  if (!listEl) return;

  if (savedPresets.length === 0) {
    listEl.innerHTML = '<p class="famfinder-no-presets">No saved presets</p>';
    return;
  }

  listEl.innerHTML = savedPresets.map(preset => {
    const doneCount = preset.doneIds?.length || 0;
    return `
    <div class="famfinder-preset-item ${preset.id === activePresetId ? 'active' : ''}" data-id="${preset.id}">
      <div class="famfinder-preset-info">
        <span class="famfinder-preset-name">${escapeHtml(preset.name)}</span>
        <span class="famfinder-preset-meta">${preset.mode} mode | ${preset.ignoredIds.length} ignored | ${doneCount} done</span>
      </div>
      <div class="famfinder-preset-actions">
        <button class="famfinder-btn load" data-action="load-preset" data-id="${preset.id}">Load</button>
        <button class="famfinder-btn delete" data-action="delete-preset" data-id="${preset.id}">Delete</button>
      </div>
    </div>
  `;
  }).join('');

  // Add event listeners
  listEl.querySelectorAll('[data-action="load-preset"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id') || '0');
      loadPreset(id);
    });
  });

  listEl.querySelectorAll('[data-action="delete-preset"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const id = parseInt((e.target as HTMLElement).getAttribute('data-id') || '0');
      deletePreset(id);
    });
  });
}

// ============================================
// DONE STATE FUNCTIONS
// ============================================

/**
 * Toggle done state for a familiar
 */
function toggleDone(familiarId: number): void {
  if (doneFamiliarIds.has(familiarId)) {
    doneFamiliarIds.delete(familiarId);
  } else {
    doneFamiliarIds.add(familiarId);
  }
  saveDoneIds();
  // Re-render to update visual indicators
  findMinimumFamiliars();
}

// Export for modal close handlers
(window as unknown as { closeFamfinderModal: () => void }).closeFamfinderModal = closeAlternativesModal;
(window as unknown as { closeFamfinderPresetModal: () => void }).closeFamfinderPresetModal = closeSavePresetModal;
