/**
 * Familiar Finder Component
 * Finds minimum set of familiars to cover all types and elements
 * with the ability to choose between alternatives
 */

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

const ELEMENT_MAP: Record<string, string> = {
  'N': 'None',
  'F': 'Fire',
  'P': 'Poison',
  'L': 'Lightning',
  'I': 'Ice',
  'D': 'Dark',
  'H': 'Holy'
};

let allFamiliars: NormalizedFamiliar[] = [];
const ignoredIds = new Set<number>();
const lockedSelections = new Map<string, number>(); // key: "type-element", value: FamiliarId

/**
 * Initialize the familiar finder
 */
export async function initFamiliarFinder(): Promise<void> {
  try {
    const response = await fetch('familiars.json');
    const familiars: FamiliarData[] = await response.json();

    // Filter to level 185-294 and normalize
    allFamiliars = familiars
      .filter(f => f.Level >= 185 && f.Level < 295)
      .map(f => ({
        ...f,
        element: f.ElementName || ELEMENT_MAP[f.ElementCode] || 'None',
        type: f.TypeName
      }));

    // Setup event handlers
    setupEventHandlers();

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
  const key = `${type}-${element}`;
  lockedSelections.set(key, familiarId);
  findMinimumFamiliars();
  closeAlternativesModal();
}

/**
 * Get alternatives for a specific type/element combination
 */
function getAlternatives(type: string, element: string): NormalizedFamiliar[] {
  return allFamiliars
    .filter(f => !ignoredIds.has(f.FamiliarId) && f.type === type && f.element === element)
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

  infoEl.textContent = `${alternatives.length} familiars with ${type} type and ${element} element:`;

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
    const uncoveredTypes = new Set(TYPES);
    const uncoveredElements = new Set(ELEMENTS);
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
        if (uncoveredTypes.has(fam.type)) score++;
        if (uncoveredElements.has(fam.element)) score++;

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
    renderStats(available.length, selectedFamiliars.length, uncoveredTypes, uncoveredElements);
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
  uncoveredElements: Set<string>
): void {
  const statsDiv = document.getElementById('famfinderStats');
  if (!statsDiv) return;

  const coveredTypes = TYPES.filter(t => !uncoveredTypes.has(t));
  const coveredElements = ELEMENTS.filter(e => !uncoveredElements.has(e));

  statsDiv.innerHTML = `
    <p><strong>Total level 185-294 familiars:</strong> ${availableCount} (${ignoredIds.size} ignored)</p>
    <p><strong>Need to cover:</strong> ${TYPES.length} types + ${ELEMENTS.length} elements = 16 total</p>
    <p><strong>Minimum familiars needed:</strong> ${selectedCount}</p>
    <p><strong>Types covered:</strong> ${coveredTypes.length}/${TYPES.length}</p>
    <p><strong>Elements covered:</strong> ${coveredElements.length}/${ELEMENTS.length}</p>
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

  coverageDiv.innerHTML = `
    <div class="famfinder-coverage-section">
      <h4>Types (${coveredTypes.length}/${TYPES.length})</h4>
      ${TYPES.map(t => `<span class="famfinder-tag ${uncoveredTypes.has(t) ? 'missing' : 'covered'}">${t}</span>`).join('')}
    </div>
    <div class="famfinder-coverage-section">
      <h4>Elements (${coveredElements.length}/${ELEMENTS.length})</h4>
      ${ELEMENTS.map(e => `<span class="famfinder-tag ${uncoveredElements.has(e) ? 'missing' : 'covered'}">${e}</span>`).join('')}
    </div>
  `;
}

/**
 * Render results grid
 */
function renderResults(selectedFamiliars: SelectedFamiliar[]): void {
  const resultsDiv = document.getElementById('famfinderResults');
  if (!resultsDiv) return;

  resultsDiv.innerHTML = selectedFamiliars.map((fam, i) => {
    const covers: string[] = [];
    if (fam.newType) covers.push(fam.type);
    if (fam.newElement) covers.push(fam.element);

    const alternatives = getAlternatives(fam.type, fam.element);
    const hasAlternatives = alternatives.length > 1;
    const isLocked = lockedSelections.has(`${fam.type}-${fam.element}`);

    return `
      <div class="famfinder-card element-${fam.element.toLowerCase()}" data-id="${fam.FamiliarId}">
        <div class="famfinder-card-header">
          <span class="famfinder-card-name">${fam.MobName}</span>
          <span class="famfinder-card-index">#${i + 1}</span>
        </div>
        <div class="famfinder-card-info">Level ${fam.Level} | ${fam.type} | ${fam.element}</div>
        <div class="famfinder-card-covers">New coverage: ${covers.join(', ')}</div>
        ${hasAlternatives ? `<div class="famfinder-alternatives-count">${alternatives.length} alternatives available${isLocked ? ' (locked)' : ''}</div>` : ''}
        <div class="famfinder-card-actions">
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
}

// Export for modal close handler
(window as unknown as { closeFamfinderModal: () => void }).closeFamfinderModal = closeAlternativesModal;
