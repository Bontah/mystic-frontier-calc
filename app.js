// ============================================
// PAGE NAVIGATION
// ============================================

function showPage(pageName) {
  // Hide all pages
  document.querySelectorAll('.page').forEach(page => {
    page.classList.remove('active');
  });

  // Remove active from all nav buttons
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });

  // Show selected page
  const page = document.getElementById(`page-${pageName}`);
  if (page) {
    page.classList.add('active');
  }

  // Activate corresponding nav button
  const buttons = document.querySelectorAll('.nav-btn');
  const pageIndex = { calculator: 0, roster: 1, info: 2 };
  if (buttons[pageIndex[pageName]]) {
    buttons[pageIndex[pageName]].classList.add('active');
  }
}

let currentWave = null;

function saveToCurrentWave() {
  if (!currentWave) {
    alert('Select a wave first by clicking Wave 1, 2, or 3');
    return;
  }

  // Get current calculator values
  const calcFamiliars = [];
  for (let i = 1; i <= 3; i++) {
    calcFamiliars.push({
      rank: document.getElementById(`monster${i}Rank`).value,
      element: document.getElementById(`monster${i}Element`).value,
      type: document.getElementById(`monster${i}Type`).value
    });
  }

  // Free current wave first
  freeWave(currentWave);

  // Find matching roster familiars (not already assigned to another wave)
  const matched = [];
  const availableFamiliars = [...familiarRoster.filter(f => !f.wave)];

  for (const calc of calcFamiliars) {
    const matchIndex = availableFamiliars.findIndex(f =>
      f.rank === calc.rank && f.element === calc.element && f.type === calc.type
    );
    if (matchIndex !== -1) {
      matched.push(availableFamiliars[matchIndex]);
      availableFamiliars.splice(matchIndex, 1); // Remove so we don't match same familiar twice
    }
  }

  if (matched.length === 0) {
    alert('No matching familiars found in your roster');
    return;
  }

  // Assign matched familiars to current wave
  matched.forEach(fam => {
    const rosterFam = familiarRoster.find(f => f.id === fam.id);
    if (rosterFam) rosterFam.wave = currentWave;
  });

  saveData();
  renderRoster();

  // Update label
  const label = document.getElementById('currentWaveLabel');
  label.textContent = `(Wave ${currentWave} - ${matched.length}/3 assigned)`;

  if (matched.length < 3) {
    alert(`Only ${matched.length} of 3 familiars found in roster. Add the missing ones to your roster first.`);
  }
}

function loadWave(waveNum) {
  const waveFamiliars = familiarRoster.filter(f => f.wave === waveNum);

  // Update active tab
  document.querySelectorAll('.wave-tab').forEach(tab => tab.classList.remove('active'));
  document.querySelector(`.wave-tab.wave-${waveNum}`).classList.add('active');

  // Update label
  const label = document.getElementById('currentWaveLabel');
  label.textContent = `(Wave ${waveNum})`;
  label.className = `wave-label wave-${waveNum}`;

  currentWave = waveNum;

  if (waveFamiliars.length === 0) {
    // No familiars assigned to this wave
    label.textContent = `(Wave ${waveNum} - Empty)`;
    return;
  }

  // Load familiars into calculator
  waveFamiliars.forEach((fam, i) => {
    if (i < 3) {
      document.getElementById(`monster${i + 1}Rank`).value = fam.rank;
      document.getElementById(`monster${i + 1}Element`).value = fam.element;
      document.getElementById(`monster${i + 1}Type`).value = fam.type;
    }
  });

  // Load conditionals from wave familiars
  conditionalBonuses = [];
  waveFamiliars.forEach(fam => {
    if (fam.conditional) {
      conditionalBonuses.push({
        name: fam.conditional.name,
        flatBonus: fam.conditional.flatBonus || 0,
        multiplierBonus: fam.conditional.multiplierBonus || 1,
        condition: fam.conditional.condition
      });
    }
  });
  saveData();
  renderConditionalBonuses();

  // Update dice options and recalculate
  for (let i = 1; i <= 3; i++) {
    updateDiceOptions(i);
  }
  calculate();
}

// ============================================
// DATA STORAGE
// ============================================

// Load from localStorage or use defaults (with fallback for environments where localStorage doesn't work)
let bonusItems = [];
let conditionalBonuses = [];
let savedLineups = [];

let characters = [];
let currentCharacterId = null;

// Helper to get current character's roster
function getFamiliarRoster() {
  const char = characters.find(c => c.id === currentCharacterId);
  return char ? char.roster : [];
}

// Helper to set current character's roster
function setFamiliarRoster(roster) {
  const char = characters.find(c => c.id === currentCharacterId);
  if (char) char.roster = roster;
}

// For backwards compatibility - getter/setter for familiarRoster
Object.defineProperty(window, 'familiarRoster', {
  get: function() { return getFamiliarRoster(); },
  set: function(val) { setFamiliarRoster(val); }
});

try {
  bonusItems = JSON.parse(localStorage.getItem('bonusItems')) || [];
  conditionalBonuses = JSON.parse(localStorage.getItem('conditionalBonuses')) || [];
  savedLineups = JSON.parse(localStorage.getItem('savedLineups')) || [];
  characters = JSON.parse(localStorage.getItem('characters')) || [];
  currentCharacterId = JSON.parse(localStorage.getItem('currentCharacterId')) || null;

  // Migration: if old familiarRoster exists, migrate to first character
  const oldRoster = JSON.parse(localStorage.getItem('familiarRoster'));
  if (oldRoster && oldRoster.length > 0 && characters.length === 0) {
    characters.push({
      id: Date.now(),
      name: 'Main',
      roster: oldRoster
    });
    currentCharacterId = characters[0].id;
    localStorage.removeItem('familiarRoster');
  }

  // Create default character if none exist
  if (characters.length === 0) {
    characters.push({
      id: Date.now(),
      name: 'Main',
      roster: []
    });
    currentCharacterId = characters[0].id;
  }

  // Ensure a character is selected
  if (!currentCharacterId && characters.length > 0) {
    currentCharacterId = characters[0].id;
  }
} catch (e) {
  console.log('localStorage not available, using in-memory storage');
  bonusItems = [];
  conditionalBonuses = [];
  savedLineups = [];
  characters = [{ id: Date.now(), name: 'Main', roster: [] }];
  currentCharacterId = characters[0].id;
}

function saveData() {
  try {
    localStorage.setItem('bonusItems', JSON.stringify(bonusItems));
    localStorage.setItem('conditionalBonuses', JSON.stringify(conditionalBonuses));
    localStorage.setItem('savedLineups', JSON.stringify(savedLineups));
    localStorage.setItem('characters', JSON.stringify(characters));
    localStorage.setItem('currentCharacterId', JSON.stringify(currentCharacterId));
  } catch (e) {
    // localStorage not available, data will persist only during session
  }
}

// ============================================
// CHARACTER MANAGEMENT
// ============================================

function renderCharacterSelector() {
  const container = document.getElementById('characterSelector');
  if (!container) return;

  const currentChar = characters.find(c => c.id === currentCharacterId);

  container.innerHTML = `
    <select id="characterSelect" onchange="switchCharacter(this.value)">
      ${characters.map(c => `<option value="${c.id}" ${c.id === currentCharacterId ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
    </select>
    <button class="char-btn" onclick="addCharacter()">+</button>
    <button class="char-btn" onclick="renameCharacter()">Rename</button>
    ${characters.length > 1 ? `<button class="char-btn delete" onclick="deleteCharacter()">Delete</button>` : ''}
  `;
}

function switchCharacter(id) {
  currentCharacterId = parseInt(id);
  saveData();
  renderRoster();
  renderCharacterSelector();

  // Clear wave selection
  currentWave = null;
  document.querySelectorAll('.wave-tab').forEach(tab => tab.classList.remove('active'));
  const label = document.getElementById('currentWaveLabel');
  if (label) label.textContent = '';
}

function addCharacter() {
  const name = prompt('Enter character name:');
  if (!name || !name.trim()) return;

  const newChar = {
    id: Date.now(),
    name: name.trim(),
    roster: []
  };
  characters.push(newChar);
  currentCharacterId = newChar.id;
  saveData();
  renderRoster();
  renderCharacterSelector();
}

function renameCharacter() {
  const currentChar = characters.find(c => c.id === currentCharacterId);
  if (!currentChar) return;

  const name = prompt('Enter new name:', currentChar.name);
  if (!name || !name.trim()) return;

  currentChar.name = name.trim();
  saveData();
  renderCharacterSelector();
}

function deleteCharacter() {
  if (characters.length <= 1) {
    alert('Cannot delete the last character');
    return;
  }

  const currentChar = characters.find(c => c.id === currentCharacterId);
  if (!confirm(`Delete character "${currentChar.name}" and all their familiars?`)) return;

  characters = characters.filter(c => c.id !== currentCharacterId);
  currentCharacterId = characters[0].id;
  saveData();
  renderRoster();
  renderCharacterSelector();
}

// ============================================
// FAMILIAR ROSTER
// ============================================

let selectedRosterConditional = null;
let editingFamiliarId = null;

function searchRosterConditional() {
  const query = document.getElementById('rosterConditionalSearch').value.toLowerCase().trim();
  const resultsContainer = document.getElementById('rosterConditionalResults');
  const selectedRank = document.getElementById('rosterRank').value;
  const prePatch = document.getElementById('prePatchFam').checked;
  if (!query) { resultsContainer.style.display = 'none'; return; }

  const allBonuses = configConditionalBonuses.bonuses || [];
  const matches = allBonuses.filter(b => {
    if (!prePatch && b.rarity !== selectedRank) return false;
    return b.name.toLowerCase().includes(query) || b.condition.toLowerCase().includes(query);
  });

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 10px; color: #666;">No bonuses found</div>';
  } else {
    const limitedMatches = matches.slice(0, 20);
    resultsContainer.innerHTML = limitedMatches.map(bonus => {
      const flatStr = bonus.flatBonus !== 0 ? '<span class="flat' + (bonus.flatBonus < 0 ? ' negative' : '') + '">' + (bonus.flatBonus >= 0 ? '+' : '') + bonus.flatBonus + '</span>' : '';
      const multStr = bonus.multiplierBonus && bonus.multiplierBonus !== 1 ? '<span class="mult">x' + bonus.multiplierBonus + '</span>' : '';
      return '<div class="config-item" style="border-left: 3px solid ' + bonus.color + ';" onclick="selectRosterConditional(' + JSON.stringify(bonus).replace(/"/g, "&quot;") + ')"><div class="config-item-info"><div class="config-item-name">' + escapeHtml(bonus.name) + ' <span style="font-size:11px;color:' + bonus.color + ';">[' + bonus.rarity + ']</span></div><div class="config-item-stats">' + flatStr + (flatStr && multStr ? ', ' : '') + multStr + '</div></div></div>';
    }).join('');
  }
  resultsContainer.style.display = 'block';
}

function selectRosterConditional(bonus) {
  selectedRosterConditional = bonus;
  document.getElementById('rosterConditionalSearch').value = '';
  document.getElementById('rosterConditionalResults').style.display = 'none';

  const displayEl = document.getElementById('selectedConditionalDisplay');
  const flatStr = bonus.flatBonus !== 0 ? (bonus.flatBonus >= 0 ? '+' : '') + bonus.flatBonus : '';
  const multStr = bonus.multiplierBonus && bonus.multiplierBonus !== 1 ? 'x' + bonus.multiplierBonus : '';
  displayEl.innerHTML = `<span class="selected-conditional-name">${escapeHtml(bonus.name)}</span> <span style="color:${bonus.color};">[${bonus.rarity}]</span> ${flatStr}${flatStr && multStr ? ', ' : ''}${multStr} <button class="clear-conditional-btn" onclick="clearRosterConditional()">×</button>`;
  displayEl.style.display = 'block';
}

function clearRosterConditional() {
  selectedRosterConditional = null;
  document.getElementById('selectedConditionalDisplay').style.display = 'none';
}

function addToRoster() {
  const name = document.getElementById('rosterName').value.trim();
  const rank = document.getElementById('rosterRank').value;
  const element = document.getElementById('rosterElement').value;
  const type = document.getElementById('rosterType').value;

  if (editingFamiliarId !== null) {
    // Update existing familiar
    const index = familiarRoster.findIndex(f => f.id === editingFamiliarId);
    if (index !== -1) {
      familiarRoster[index] = {
        id: editingFamiliarId,
        name,
        rank,
        element,
        type,
        conditional: selectedRosterConditional ? { ...selectedRosterConditional } : null
      };
    }
    editingFamiliarId = null;
    document.getElementById('rosterAddBtn').textContent = 'Add to Roster';
    document.getElementById('rosterCancelBtn').style.display = 'none';
  } else {
    // Add new familiar
    const familiar = {
      id: Date.now(),
      name,
      rank,
      element,
      type,
      conditional: selectedRosterConditional ? { ...selectedRosterConditional } : null
    };
    familiarRoster.unshift(familiar);
  }

  // Clear name input
  document.getElementById('rosterName').value = '';

  saveData();
  renderRoster();

  // Clear conditional selection
  clearRosterConditional();
}

function editFamiliar(id) {
  const familiar = familiarRoster.find(f => f.id === id);
  if (!familiar) return;

  // Populate form with familiar data
  document.getElementById('rosterName').value = familiar.name || '';
  document.getElementById('rosterRank').value = familiar.rank;
  document.getElementById('rosterElement').value = familiar.element;
  document.getElementById('rosterType').value = familiar.type;

  // Set conditional if exists
  if (familiar.conditional) {
    selectRosterConditional(familiar.conditional);
  } else {
    clearRosterConditional();
  }

  // Set editing mode
  editingFamiliarId = id;
  document.getElementById('rosterAddBtn').textContent = 'Update Familiar';
  document.getElementById('rosterCancelBtn').style.display = 'inline-block';

  // Scroll to form
  document.getElementById('rosterRank').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function cancelEdit() {
  editingFamiliarId = null;
  document.getElementById('rosterName').value = '';
  document.getElementById('rosterAddBtn').textContent = 'Add to Roster';
  document.getElementById('rosterCancelBtn').style.display = 'none';
  clearRosterConditional();
}

function deleteFromRoster(id) {
  if (!confirm('Remove this familiar from your roster?')) return;

  familiarRoster = familiarRoster.filter(f => f.id !== id);

  // If we were editing this familiar, cancel the edit
  if (editingFamiliarId === id) {
    cancelEdit();
  }

  saveData();
  renderRoster();
}

function assignToWave(ids, wave) {
  ids.forEach(id => {
    const fam = familiarRoster.find(f => f.id === id);
    if (fam) fam.wave = wave;
  });
  saveData();
  renderRoster();

  // Navigate to calculator and load the wave
  showPage('calculator');
  loadWave(wave);
}

function freeWave(wave) {
  familiarRoster.forEach(fam => {
    if (fam.wave === wave) fam.wave = null;
  });
  saveData();
  renderRoster();
}

function freeAllWaves() {
  familiarRoster.forEach(fam => fam.wave = null);
  saveData();
  renderRoster();
}

function exportRoster() {
  const currentChar = characters.find(c => c.id === currentCharacterId);
  const charName = currentChar ? currentChar.name : 'unknown';
  const data = JSON.stringify(familiarRoster, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `mystic-frontier-${charName.toLowerCase().replace(/\s+/g, '-')}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importRoster(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const imported = JSON.parse(e.target.result);
      if (!Array.isArray(imported)) {
        alert('Invalid file format: expected an array of familiars');
        return;
      }
      // Assign new IDs to avoid conflicts
      imported.forEach(fam => {
        fam.id = Date.now() + Math.random();
      });
      familiarRoster = [...familiarRoster, ...imported];
      saveData();
      renderRoster();
      alert(`Imported ${imported.length} familiar(s)`);
    } catch (err) {
      alert('Failed to import: ' + err.message);
    }
  };
  reader.readAsText(file);
  event.target.value = '';
}

let rosterExpanded = false;
const ROSTER_COLLAPSED_COUNT = 6;

function toggleRosterExpand() {
  rosterExpanded = !rosterExpanded;
  renderRoster();
}

function renderRoster() {
  const container = document.getElementById('rosterList');
  const countEl = document.getElementById('rosterCount');

  countEl.textContent = `${familiarRoster.length} familiar${familiarRoster.length !== 1 ? 's' : ''} in roster`;

  if (familiarRoster.length === 0) {
    container.innerHTML = '<div style="color: #666; padding: 10px; grid-column: 1/-1;">No familiars in roster yet. Add your familiars above.</div>';
    return;
  }

  const showAll = rosterExpanded || familiarRoster.length <= ROSTER_COLLAPSED_COUNT;
  const displayFamiliars = showAll ? familiarRoster : familiarRoster.slice(0, ROSTER_COLLAPSED_COUNT);
  const hiddenCount = familiarRoster.length - ROSTER_COLLAPSED_COUNT;

  const familiarCards = displayFamiliars.map(fam => {
    const displayName = fam.name || `${fam.element} ${fam.type}`;
    const rankClass = `rank-${fam.rank.toLowerCase()}`;

    let conditionalHtml = '';
    if (fam.conditional) {
      const flatStr = fam.conditional.flatBonus !== 0 ? (fam.conditional.flatBonus >= 0 ? '+' : '') + fam.conditional.flatBonus : '';
      const multStr = fam.conditional.multiplierBonus && fam.conditional.multiplierBonus !== 1 ? 'x' + fam.conditional.multiplierBonus : '';
      const color = fam.conditional.color || '#888';
      conditionalHtml = `
        <div class="roster-item-conditional" style="border-left: 2px solid ${color};">
          <span class="conditional-name">${escapeHtml(fam.conditional.name)}</span>
          <span class="conditional-stats">${flatStr}${flatStr && multStr ? ', ' : ''}${multStr}</span>
        </div>
      `;
    } else {
      conditionalHtml = '<div class="roster-item-conditional none">No conditional</div>';
    }

    const waveClass = fam.wave ? `wave-${fam.wave}` : '';
    const waveBadge = fam.wave ? `<div class="wave-badge wave-${fam.wave}">Wave ${fam.wave}</div>` : '';

    return `
      <div class="roster-item ${rankClass} ${waveClass}">
        <div class="roster-item-header">
          <span class="roster-item-name">${escapeHtml(displayName)}</span>
          <span class="roster-item-rank ${rankClass}">${fam.rank}</span>
        </div>
        ${waveBadge}
        <div class="roster-item-details">
          <span class="roster-item-element">${fam.element}</span> ·
          <span class="roster-item-type">${fam.type}</span>
        </div>
        ${conditionalHtml}
        <div class="roster-item-actions">
          <button class="roster-item-edit" onclick="editFamiliar(${fam.id})">Edit</button>
          <button class="roster-item-delete" onclick="deleteFromRoster(${fam.id})">Remove</button>
        </div>
      </div>
    `;
  }).join('');

  // Add show more/less button if needed
  let toggleBtn = '';
  if (familiarRoster.length > ROSTER_COLLAPSED_COUNT) {
    if (rosterExpanded) {
      toggleBtn = `<button class="roster-toggle-btn" onclick="toggleRosterExpand()">Show Less</button>`;
    } else {
      toggleBtn = `<button class="roster-toggle-btn" onclick="toggleRosterExpand()">Show All (${hiddenCount} more)</button>`;
    }
  }

  container.innerHTML = familiarCards + (toggleBtn ? `<div class="roster-toggle-wrapper">${toggleBtn}</div>` : '');
}

// ============================================
// LINEUP OPTIMIZER
// ============================================

function generateCombinations(arr, size) {
  const result = [];

  function combine(start, combo) {
    if (combo.length === size) {
      result.push([...combo]);
      return;
    }
    for (let i = start; i < arr.length; i++) {
      combo.push(arr[i]);
      combine(i + 1, combo);
      combo.pop();
    }
  }

  combine(0, []);
  return result;
}

function evaluateLineup(familiars, bonuses, dice) {
  // Calculate the score for a lineup with given dice values
  const diceSum = dice.reduce((a, b) => a + b, 0);

  let totalFlat = 0;
  let totalMult = 0;
  const activeBonusNames = [];
  const familiarBreakdown = [];

  // Include conditionals from the familiars themselves
  familiars.forEach((fam, index) => {
    const breakdown = {
      familiarIndex: index,
      name: fam.name,
      element: fam.element,
      type: fam.type,
      rank: fam.rank,
      conditionalTriggered: false,
      conditionalName: null,
      flatContribution: 0,
      multiplierContribution: 0
    };

    if (fam.conditional) {
      let isActive = false;
      try {
        const condFn = new Function('dice', 'familiars', `return ${fam.conditional.condition}`);
        isActive = condFn(dice, familiars);
      } catch (e) {
        // Invalid condition
      }
      if (isActive) {
        breakdown.conditionalTriggered = true;
        breakdown.conditionalName = fam.conditional.name;
        breakdown.flatContribution = fam.conditional.flatBonus || 0;
        breakdown.multiplierContribution = fam.conditional.multiplierBonus || 0;

        activeBonusNames.push(fam.conditional.name);
        totalFlat += fam.conditional.flatBonus || 0;
        if (fam.conditional.multiplierBonus && fam.conditional.multiplierBonus !== 0 && fam.conditional.multiplierBonus !== 1) {
          totalMult += fam.conditional.multiplierBonus;
        }
      }
    }

    familiarBreakdown.push(breakdown);
  });

  // Check each conditional bonus
  bonuses.forEach(cond => {
    let isActive = false;
    try {
      const condFn = new Function('dice', 'familiars', `return ${cond.condition}`);
      isActive = condFn(dice, familiars);
    } catch (e) {
      // Invalid condition
    }

    if (isActive) {
      activeBonusNames.push(cond.name);
      totalFlat += cond.flatBonus || 0;
      if (cond.multiplierBonus && cond.multiplierBonus !== 0 && cond.multiplierBonus !== 1) {
        totalMult += cond.multiplierBonus;
      }
    }
  });

  const afterFlat = diceSum + totalFlat;
  const finalResult = totalMult !== 0 ? Math.floor(afterFlat * totalMult) : afterFlat;

  return {
    score: finalResult,
    diceSum,
    totalFlat,
    totalMult,
    activeBonusNames,
    familiarBreakdown
  };
}

function getMaxDiceForFamiliars(familiars) {
  return familiars.map(f => getMaxDiceForRank(f.rank));
}

function findBestOverall(combinations, bonuses) {
  // Evaluate with average dice values
  let best = null;
  let bestScore = -Infinity;

  combinations.forEach(combo => {
    const maxDice = getMaxDiceForFamiliars(combo);
    // Use average dice values
    const avgDice = maxDice.map(max => Math.ceil((1 + max) / 2));
    const result = evaluateLineup(combo, bonuses, avgDice);

    // Also calculate expected value across all roll combinations
    let totalScore = 0;
    let count = 0;
    for (let d1 = 1; d1 <= maxDice[0]; d1++) {
      for (let d2 = 1; d2 <= maxDice[1]; d2++) {
        for (let d3 = 1; d3 <= maxDice[2]; d3++) {
          const r = evaluateLineup(combo, bonuses, [d1, d2, d3]);
          totalScore += r.score;
          count++;
        }
      }
    }
    const expectedScore = totalScore / count;

    if (expectedScore > bestScore) {
      bestScore = expectedScore;
      best = {
        familiars: combo,
        score: Math.round(expectedScore),
        scoreLabel: 'Expected',
        testDice: avgDice,
        ...result
      };
    }
  });

  return best;
}

function findBestForLowRolls(combinations, bonuses) {
  // Evaluate with dice = [1,1,1]
  let best = null;
  let bestScore = -Infinity;

  combinations.forEach(combo => {
    const dice = [1, 1, 1];
    const result = evaluateLineup(combo, bonuses, dice);

    if (result.score > bestScore) {
      bestScore = result.score;
      best = {
        familiars: combo,
        score: result.score,
        scoreLabel: 'With 1-1-1',
        testDice: dice,
        ...result
      };
    }
  });

  return best;
}

function findBestForHighRolls(combinations, bonuses) {
  // Evaluate with max dice based on ranks
  let best = null;
  let bestScore = -Infinity;

  combinations.forEach(combo => {
    const dice = getMaxDiceForFamiliars(combo);
    const result = evaluateLineup(combo, bonuses, dice);

    if (result.score > bestScore) {
      bestScore = result.score;
      best = {
        familiars: combo,
        score: result.score,
        scoreLabel: `With ${dice.join('-')}`,
        testDice: dice,
        ...result
      };
    }
  });

  return best;
}

// Async versions with progress callback for UI updates
async function findBestOverallAsync(combinations, bonuses, onProgress) {
  let best = null;
  let bestScore = -Infinity;

  for (const combo of combinations) {
    const maxDice = getMaxDiceForFamiliars(combo);
    const avgDice = maxDice.map(max => Math.ceil((1 + max) / 2));
    const result = evaluateLineup(combo, bonuses, avgDice);

    // Calculate expected value across all roll combinations
    let totalScore = 0;
    let count = 0;
    for (let d1 = 1; d1 <= maxDice[0]; d1++) {
      for (let d2 = 1; d2 <= maxDice[1]; d2++) {
        for (let d3 = 1; d3 <= maxDice[2]; d3++) {
          const r = evaluateLineup(combo, bonuses, [d1, d2, d3]);
          totalScore += r.score;
          count++;
        }
      }
    }
    const expectedScore = totalScore / count;

    if (expectedScore > bestScore) {
      bestScore = expectedScore;
      best = {
        familiars: combo,
        score: Math.round(expectedScore),
        scoreLabel: 'Expected',
        testDice: avgDice,
        ...result
      };
    }

    if (onProgress) await onProgress();
  }

  return best;
}

async function findBestForLowRollsAsync(combinations, bonuses, onProgress) {
  let best = null;
  let bestScore = -Infinity;

  for (const combo of combinations) {
    const dice = [1, 1, 1];
    const result = evaluateLineup(combo, bonuses, dice);

    if (result.score > bestScore) {
      bestScore = result.score;
      best = {
        familiars: combo,
        score: result.score,
        scoreLabel: 'With 1-1-1',
        testDice: dice,
        ...result
      };
    }

    if (onProgress) await onProgress();
  }

  return best;
}

async function findBestForHighRollsAsync(combinations, bonuses, onProgress) {
  let best = null;
  let bestScore = -Infinity;

  for (const combo of combinations) {
    const dice = getMaxDiceForFamiliars(combo);
    const result = evaluateLineup(combo, bonuses, dice);

    if (result.score > bestScore) {
      bestScore = result.score;
      best = {
        familiars: combo,
        score: result.score,
        scoreLabel: `With ${dice.join('-')}`,
        testDice: dice,
        ...result
      };
    }

    if (onProgress) await onProgress();
  }

  return best;
}

function getAllLibraryBonuses() {
  return configConditionalBonuses.bonuses || [];
}

function toggleOptimizerHelp() {
  const content = document.getElementById('optimizerHelpContent');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

async function runOptimizer() {
  const resultsContainer = document.getElementById('optimizerResults');

  // Get filter values
  const filterElement = document.getElementById('filterElement')?.value || '';
  const filterType = document.getElementById('filterType')?.value || '';
  const requireMatch = document.getElementById('filterRequireMatch')?.checked || false;

  // Filter out familiars that are assigned to a wave
  const availableFamiliars = familiarRoster.filter(f => !f.wave);

  if (availableFamiliars.length < 3) {
    const assignedCount = familiarRoster.filter(f => f.wave).length;
    resultsContainer.innerHTML = `
      <div class="optimizer-error">
        Need at least 3 available familiars!
        ${assignedCount > 0 ? `<br><small>${assignedCount} familiar(s) assigned to waves</small>` : ''}
        ${familiarRoster.length < 3 ? `<br><small>Add more familiars to your roster</small>` : ''}
      </div>
    `;
    return;
  }

  // Generate all combinations from available familiars
  let combinations = generateCombinations(availableFamiliars, 3);

  // Apply filtering if required
  if (requireMatch && (filterElement || filterType)) {
    combinations = combinations.filter(combo => {
      const hasMatchingElement = !filterElement || combo.some(fam => fam.element === filterElement);
      const hasMatchingType = !filterType || combo.some(fam => fam.type === filterType);
      return hasMatchingElement && hasMatchingType;
    });

    if (combinations.length === 0) {
      resultsContainer.innerHTML = `
        <div class="optimizer-error">
          No lineup combinations match your filter criteria.<br>
          Try adjusting the filters or add more familiars to your roster.
        </div>
      `;
      return;
    }
  }

  // Show progress indicator
  const totalSteps = combinations.length * 3; // 3 strategies to evaluate
  resultsContainer.innerHTML = `
    <div class="optimizer-progress">
      <div class="progress-text">Analyzing ${combinations.length.toLocaleString()} lineup combinations...</div>
      <div class="progress-bar-container">
        <div class="progress-bar" id="optimizerProgressBar" style="width: 0%"></div>
      </div>
      <div class="progress-percent" id="optimizerProgressPercent">0%</div>
    </div>
  `;

  // Helper to update progress and yield to UI
  let currentStep = 0;
  const updateProgress = async () => {
    currentStep++;
    if (currentStep % 50 === 0 || currentStep === totalSteps) {
      const percent = Math.round((currentStep / totalSteps) * 100);
      document.getElementById('optimizerProgressBar').style.width = percent + '%';
      document.getElementById('optimizerProgressPercent').textContent = percent + '%';
      await new Promise(resolve => setTimeout(resolve, 0)); // Yield to UI
    }
  };

  // Find best lineups for each strategy with progress updates
  const bestOverall = await findBestOverallAsync(combinations, [], updateProgress);
  const bestLow = await findBestForLowRollsAsync(combinations, [], updateProgress);
  const bestHigh = await findBestForHighRollsAsync(combinations, [], updateProgress);

  renderOptimizerResults({ bestOverall, bestLow, bestHigh, filterElement, filterType });
}

function renderOptimizerResults({ bestOverall, bestLow, bestHigh, filterElement, filterType }) {
  const container = document.getElementById('optimizerResults');

  const renderLineupCard = (result, type, title, icon) => {
    if (!result) return '';

    const familiarsHtml = result.familiars.map((fam, index) => {
      const elementClass = `element-${fam.element.toLowerCase()}`;
      const matchesElement = filterElement && fam.element === filterElement;
      const matchesType = filterType && fam.type === filterType;
      const matchClass = (matchesElement || matchesType) ? 'expedition-match' : '';

      // Get breakdown for this familiar
      const breakdown = result.familiarBreakdown ? result.familiarBreakdown[index] : null;
      let bonusHtml = '';
      if (breakdown && breakdown.conditionalTriggered) {
        const flatStr = breakdown.flatContribution !== 0 ? `+${breakdown.flatContribution}` : '';
        const multStr = breakdown.multiplierContribution && breakdown.multiplierContribution !== 0 && breakdown.multiplierContribution !== 1 ? `x${parseFloat(breakdown.multiplierContribution.toFixed(2))}` : '';
        bonusHtml = `
          <div class="lineup-familiar-bonus active">
            <div class="bonus-name">${escapeHtml(breakdown.conditionalName)}</div>
            <div class="bonus-values">${flatStr}${flatStr && multStr ? ', ' : ''}${multStr}</div>
          </div>
        `;
      } else if (fam.conditional) {
        bonusHtml = `<div class="lineup-familiar-bonus inactive">Conditional not triggered</div>`;
      } else {
        bonusHtml = `<div class="lineup-familiar-bonus none">No conditional</div>`;
      }

      const matchBadges = `
        ${matchesElement ? '<span class="match-badge element-match">Element</span>' : ''}
        ${matchesType ? '<span class="match-badge type-match">Type</span>' : ''}
      `;

      const displayName = fam.name || `${fam.element} ${fam.type}`;
      return `
        <div class="lineup-familiar ${elementClass} ${matchClass}">
          ${(matchesElement || matchesType) ? `<div class="match-badges">${matchBadges}</div>` : ''}
          <div class="lineup-familiar-name">${escapeHtml(displayName)}</div>
          <div class="lineup-familiar-details">${fam.element} · ${fam.type}</div>
          <div class="lineup-familiar-rank">${fam.rank}</div>
          ${bonusHtml}
        </div>
      `;
    }).join('');

    // Build breakdown summary
    let breakdownHtml = '';
    if (result.familiarBreakdown) {
      const activeBreakdowns = result.familiarBreakdown.filter(b => b.conditionalTriggered);
      if (activeBreakdowns.length > 0) {
        breakdownHtml = `
          <div class="lineup-breakdown">
            <div class="breakdown-header">Bonus Breakdown</div>
            ${activeBreakdowns.map(b => {
              const flatStr = b.flatContribution !== 0 ? `+${b.flatContribution} flat` : '';
              const multStr = b.multiplierContribution && b.multiplierContribution !== 0 && b.multiplierContribution !== 1 ? `x${parseFloat(b.multiplierContribution.toFixed(2))}` : '';
              const sourceName = b.name || `${b.element} ${b.type}`;
              return `
                <div class="breakdown-row">
                  <span class="breakdown-source">${escapeHtml(sourceName)}:</span>
                  <span class="breakdown-values">${flatStr}${flatStr && multStr ? ', ' : ''}${multStr}</span>
                </div>
              `;
            }).join('')}
            <div class="breakdown-totals">
              <span>Total: +${result.totalFlat} flat${result.totalMult ? `, x${parseFloat(result.totalMult.toFixed(2))}` : ''}</span>
            </div>
          </div>
        `;
      }
    }

    return `
      <div class="lineup-card ${type}">
        <div class="lineup-card-header">
          <div class="lineup-card-title">${icon} ${title}</div>
          <div class="lineup-card-score">${result.scoreLabel}: <strong>${result.score}</strong></div>
        </div>
        <div class="lineup-familiars">
          ${familiarsHtml}
        </div>
        ${breakdownHtml}
        <div class="lineup-actions">
          <button class="use-lineup-btn" onclick="useOptimizedLineup(${JSON.stringify(result.familiars).replace(/"/g, '&quot;')})">Use in Calculator</button>
          <div class="wave-assign-btns">
            <button class="wave-assign-btn wave-1" onclick="assignToWave([${result.familiars.map(f => f.id).join(',')}], 1)">Wave 1</button>
            <button class="wave-assign-btn wave-2" onclick="assignToWave([${result.familiars.map(f => f.id).join(',')}], 2)">Wave 2</button>
            <button class="wave-assign-btn wave-3" onclick="assignToWave([${result.familiars.map(f => f.id).join(',')}], 3)">Wave 3</button>
          </div>
        </div>
      </div>
    `;
  };

  container.innerHTML = `
    ${renderLineupCard(bestOverall, 'best-overall', 'BEST OVERALL', '🏆')}
    ${renderLineupCard(bestLow, 'best-low', 'BEST FOR LOW ROLLS', '🛡️')}
    ${renderLineupCard(bestHigh, 'best-high', 'BEST FOR HIGH ROLLS', '🎯')}
  `;
}

function useOptimizedLineup(familiars) {
  // Populate the main Familiars section with this lineup
  familiars.forEach((fam, i) => {
    document.getElementById(`monster${i + 1}Rank`).value = fam.rank;
    document.getElementById(`monster${i + 1}Element`).value = fam.element;
    document.getElementById(`monster${i + 1}Type`).value = fam.type;
  });

  // Clear existing conditionals and add each familiar's conditional
  conditionalBonuses = [];
  familiars.forEach(fam => {
    if (fam.conditional) {
      conditionalBonuses.push({
        name: fam.conditional.name,
        flatBonus: fam.conditional.flatBonus || 0,
        multiplierBonus: fam.conditional.multiplierBonus || 1,
        condition: fam.conditional.condition
      });
    }
  });
  saveData();
  renderConditionalBonuses();

  // Update dice options and recalculate
  for (let i = 1; i <= 3; i++) {
    updateDiceOptions(i);
  }
  calculate();

  // Navigate to calculator page
  showPage('calculator');
}

// ============================================
// CONFIG DATA
// ============================================

let configBonusItems = { items: [] };
let configConditionalBonuses = { bonuses: [] };

async function loadConfigFiles() {
  try {
    const itemsResponse = await fetch('config/bonus-items.json');
    if (itemsResponse.ok) configBonusItems = await itemsResponse.json();
  } catch (e) { console.log('Could not load bonus-items.json'); }

  try {
    const bonusesResponse = await fetch('config/conditional-bonuses.json');
    if (bonusesResponse.ok) {
      const data = await bonusesResponse.json();
      configConditionalBonuses.bonuses = [];
      for (const [rarity, cat] of Object.entries(data.categories || {})) {
        for (const bonus of cat.bonuses || []) {
          configConditionalBonuses.bonuses.push({ ...bonus, rarity, color: cat.color });
        }
      }
    }
  } catch (e) { console.log('Could not load conditional-bonuses.json'); }
}

function searchBonusItems() {
  const query = document.getElementById('bonusItemSearch').value.toLowerCase().trim();
  const resultsContainer = document.getElementById('bonusItemSearchResults');
  if (!query) { resultsContainer.style.display = 'none'; return; }

  const items = configBonusItems.items || [];
  const matches = items.filter(item => {
    const nameMatch = item.name.toLowerCase().includes(query);
    const descMatch = item.description && item.description.toLowerCase().includes(query);
    return nameMatch || descMatch;
  });

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 10px; color: #666;">No items found</div>';
  } else {
    resultsContainer.innerHTML = matches.map(item => {
      const flatStr = item.flatBonus !== 0 ? '<span class="flat' + (item.flatBonus < 0 ? ' negative' : '') + '">' + (item.flatBonus >= 0 ? '+' : '') + item.flatBonus + '</span>' : '';
      const multStr = item.multiplierBonus && item.multiplierBonus !== 0 ? '<span class="mult">x' + item.multiplierBonus + '</span>' : '';
      const descStr = item.description || '';
      return '<div class="config-item" onclick="applyBonusItem(' + JSON.stringify(item).replace(/"/g, "&quot;") + ')"><div class="config-item-info"><div class="config-item-name">' + escapeHtml(item.name) + '</div><div class="config-item-stats">' + flatStr + (flatStr && multStr ? ', ' : '') + multStr + '</div><div class="config-item-tags">' + escapeHtml(descStr) + '</div></div><button class="apply-btn" onclick="event.stopPropagation()">Apply</button></div>';
    }).join('');
  }
  resultsContainer.style.display = 'block';
}

function applyBonusItem(item) {
  bonusItems.push({ name: item.name, flatBonus: item.flatBonus || 0, multiplierBonus: item.multiplierBonus || 0 });
  saveData(); renderBonusItems(); calculate();
  document.getElementById('bonusItemSearch').value = '';
  document.getElementById('bonusItemSearchResults').style.display = 'none';
}

function searchCondBonuses() {
  const query = document.getElementById('condBonusSearch').value.toLowerCase().trim();
  const resultsContainer = document.getElementById('condBonusSearchResults');
  const prePatch = document.getElementById('prePatchCalc').checked;
  if (!query) { resultsContainer.style.display = 'none'; return; }

  // Get current familiar ranks from calculator
  const calcRanks = [
    document.getElementById('monster1Rank').value,
    document.getElementById('monster2Rank').value,
    document.getElementById('monster3Rank').value
  ];

  // Use pre-flattened bonuses array from loadConfigFiles
  const allBonuses = configConditionalBonuses.bonuses || [];
  const matches = allBonuses.filter(b => {
    if (!prePatch && !calcRanks.includes(b.rarity)) return false;
    return b.name.toLowerCase().includes(query) || b.condition.toLowerCase().includes(query);
  });

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 10px; color: #666;">No bonuses found</div>';
  } else {
    const limitedMatches = matches.slice(0, 50);
    const moreText = matches.length > 50 ? '<div style="padding: 10px; color: #666; text-align: center;">Showing 50 of ' + matches.length + ' results. Refine your search for more specific results.</div>' : '';
    resultsContainer.innerHTML = limitedMatches.map(bonus => {
      const flatStr = bonus.flatBonus !== 0 ? '<span class="flat' + (bonus.flatBonus < 0 ? ' negative' : '') + '">' + (bonus.flatBonus >= 0 ? '+' : '') + bonus.flatBonus + '</span>' : '';
      const multStr = bonus.multiplierBonus && bonus.multiplierBonus !== 1 ? '<span class="mult">x' + bonus.multiplierBonus + '</span>' : '';
      return '<div class="config-item" style="border-left: 3px solid ' + bonus.color + ';" onclick="applyCondBonus(' + JSON.stringify(bonus).replace(/"/g, "&quot;") + ')"><div class="config-item-info"><div class="config-item-name">' + escapeHtml(bonus.name) + ' <span style="font-size:11px;color:' + bonus.color + ';">[' + bonus.rarity + ']</span></div><div class="config-item-stats">' + flatStr + (flatStr && multStr ? ', ' : '') + multStr + '</div><div class="config-item-tags" style="font-family:monospace;">' + escapeHtml(bonus.condition) + '</div></div><button class="apply-btn" onclick="event.stopPropagation()">Apply</button></div>';
    }).join('') + moreText;
  }
  resultsContainer.style.display = 'block';
}

function applyCondBonus(bonus) {
  conditionalBonuses.push({ name: bonus.name, flatBonus: bonus.flatBonus || 0, multiplierBonus: bonus.multiplierBonus || 1, condition: bonus.condition });
  saveData(); renderConditionalBonuses(); calculate();
  document.getElementById('condBonusSearch').value = '';
  document.getElementById('condBonusSearchResults').style.display = 'none';
}

// ============================================
// FAMILIAR RANK DICE SYSTEM
// ============================================

// Rank determines the max dice value (number of sides)
// Common = d3, Rare = d4, Epic = d5, Unique/Legendary = d6
function getMaxDiceForRank(rank) {
  switch (rank) {
    case 'Common': return 3;
    case 'Rare': return 4;
    case 'Epic': return 5;
    case 'Unique':
    case 'Legendary': return 6;
    default: return 3;
  }
}

function updateDiceOptions(familiarIndex) {
  const rank = document.getElementById(`monster${familiarIndex}Rank`).value;
  const maxDice = getMaxDiceForRank(rank);
  const diceSelect = document.getElementById(`dice${familiarIndex}`);
  const currentValue = parseInt(diceSelect.value);

  // Rebuild options
  diceSelect.innerHTML = '';
  for (let i = 1; i <= maxDice; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    diceSelect.appendChild(option);
  }

  // Keep current value if valid, otherwise set to max
  if (currentValue <= maxDice) {
    diceSelect.value = currentValue;
  } else {
    diceSelect.value = maxDice;
  }
}

function onRankChange(familiarIndex) {
  updateDiceOptions(familiarIndex);
  calculate();
}

function initializeDiceFromRanks() {
  for (let i = 1; i <= 3; i++) {
    updateDiceOptions(i);
  }
}

// ============================================
// BONUS ITEMS
// ============================================

function renderBonusItems() {
  const container = document.getElementById('bonusItemsList');

  if (bonusItems.length === 0) {
    container.innerHTML = '<div style="color: #666; padding: 10px;">No bonus items yet. Add one below.</div>';
    return;
  }

  container.innerHTML = bonusItems.map((item, index) => {
    const flatClass = item.flatBonus < 0 ? 'flat negative' : 'flat';
    const flatStr = item.flatBonus !== 0
      ? `<span class="${flatClass}">${item.flatBonus >= 0 ? '+' : ''}${item.flatBonus} flat</span>`
      : '';
    const multStr = item.multiplierBonus !== 1 && item.multiplierBonus !== 0
      ? `<span class="mult">×${item.multiplierBonus}</span>`
      : '';
    const separator = flatStr && multStr ? ', ' : '';

    return `
      <div class="bonus-item">
        <span class="bonus-name">${escapeHtml(item.name)}</span>
        <span class="bonus-stats">${flatStr}${separator}${multStr}</span>
        <button class="delete-btn" onclick="deleteBonusItem(${index})">Delete</button>
      </div>
    `;
  }).join('');
}

function addBonusItem() {
  const name = document.getElementById('newItemName').value.trim();
  const flatBonus = parseFloat(document.getElementById('newItemFlat').value) || 0;
  const multiplierBonus = parseFloat(document.getElementById('newItemMult').value) || 0;

  if (!name) {
    alert('Please enter a name');
    return;
  }

  bonusItems.push({ name, flatBonus, multiplierBonus });
  saveData();
  renderBonusItems();
  calculate();

  // Clear form
  document.getElementById('newItemName').value = '';
  document.getElementById('newItemFlat').value = '0';
  document.getElementById('newItemMult').value = '1';
}

function deleteBonusItem(index) {
  bonusItems.splice(index, 1);
  saveData();
  renderBonusItems();
  calculate();
}

// ============================================
// CONDITIONAL BONUSES
// ============================================

function renderConditionalBonuses() {
  const container = document.getElementById('conditionalList');

  if (conditionalBonuses.length === 0) {
    container.innerHTML = '<div style="color: #666; padding: 10px;">No conditional bonuses yet. Add one below.</div>';
    return;
  }

  container.innerHTML = conditionalBonuses.map((cond, index) => {
    const flatClass = cond.flatBonus < 0 ? 'flat negative' : 'flat';
    const flatStr = cond.flatBonus !== 0
      ? `<span class="${flatClass}">${cond.flatBonus >= 0 ? '+' : ''}${cond.flatBonus} flat</span>`
      : '';
    const multStr = cond.multiplierBonus !== 1 && cond.multiplierBonus !== 0
      ? `<span class="mult">×${cond.multiplierBonus}</span>`
      : '';
    const separator = flatStr && multStr ? ', ' : '';

    return `
      <div class="conditional-item" id="cond${index}">
        <div style="flex: 1; min-width: 0;">
          <span class="cond-name">${escapeHtml(cond.name)}</span>
        </div>
        <span class="cond-stats">${flatStr}${separator}${multStr}</span>
        <button class="delete-btn" onclick="deleteConditionalBonus(${index})">Delete</button>
      </div>
    `;
  }).join('');
}

function addConditionalBonus() {
  const name = document.getElementById('newCondName').value.trim();
  const flatBonus = parseFloat(document.getElementById('newCondFlat').value) || 0;
  const multiplierBonus = parseFloat(document.getElementById('newCondMult').value) || 0;
  const condition = document.getElementById('newCondCondition').value.trim();
  const errorEl = document.getElementById('conditionError');

  if (!name) {
    alert('Please enter a name');
    return;
  }

  if (!condition) {
    alert('Please enter a condition');
    return;
  }

  // Test the condition
  try {
    const testDice = [1, 2, 3];
    const testFamiliars = [
      { type: 'Human', element: 'None' },
      { type: 'Human', element: 'None' },
      { type: 'Human', element: 'None' }
    ];
    const testFn = new Function('dice', 'familiars', `return ${condition}`);
    testFn(testDice, testFamiliars);
    errorEl.textContent = '';
  } catch (e) {
    errorEl.textContent = `Invalid condition: ${e.message}`;
    return;
  }

  conditionalBonuses.push({ name, flatBonus, multiplierBonus, condition });
  saveData();
  renderConditionalBonuses();
  calculate();

  // Clear form
  document.getElementById('newCondName').value = '';
  document.getElementById('newCondFlat').value = '0';
  document.getElementById('newCondMult').value = '1';
  document.getElementById('newCondCondition').value = '';
}

function deleteConditionalBonus(index) {
  conditionalBonuses.splice(index, 1);
  saveData();
  renderConditionalBonuses();
  calculate();
}

// ============================================
// SAVED LINEUPS
// ============================================

function renderSavedLineups() {
  const container = document.getElementById('savedLineupsList');

  if (savedLineups.length === 0) {
    container.innerHTML = '<div style="color: #666; padding: 10px;">No presets yet. Enter a name and click "Save Preset" to save your first wave preset.</div>';
    return;
  }

  container.innerHTML = savedLineups.map((lineup, index) => {
    // Build familiar summary (support both old 'monsters' and new 'familiars' key)
    const familiars = lineup.familiars || lineup.monsters;
    const familiarSummary = familiars.map((m, i) =>
      `F${i + 1}: ${m.rank} ${m.type}${m.element !== 'None' ? ' (' + m.element + ')' : ''}`
    ).join(' | ');

    const condCount = lineup.conditionalBonuses.length;
    const condText = condCount === 1 ? '1 conditional' : `${condCount} conditionals`;

    return `
      <div class="saved-lineup-item">
        <div class="lineup-info">
          <div class="lineup-name">${escapeHtml(lineup.name)}</div>
          <div class="lineup-details">
            <span class="lineup-detail-item">${familiarSummary}</span>
            <span class="lineup-detail-item lineup-conditionals-count">${condText}</span>
          </div>
        </div>
        <button class="load-lineup-btn" onclick="loadLineup(${index})">Load</button>
        <button class="delete-btn" onclick="deleteLineup(${index})">Delete</button>
      </div>
    `;
  }).join('');
}

function saveLineup() {
  const nameInput = document.getElementById('lineupName');
  const name = nameInput.value.trim();

  if (!name) {
    alert('Please enter a name for this lineup');
    return;
  }

  // Get current familiar configuration
  const familiars = [
    {
      type: document.getElementById('monster1Type').value,
      element: document.getElementById('monster1Element').value,
      rank: document.getElementById('monster1Rank').value,
    },
    {
      type: document.getElementById('monster2Type').value,
      element: document.getElementById('monster2Element').value,
      rank: document.getElementById('monster2Rank').value,
    },
    {
      type: document.getElementById('monster3Type').value,
      element: document.getElementById('monster3Element').value,
      rank: document.getElementById('monster3Rank').value,
    },
  ];

  // Save the lineup
  const lineup = {
    name,
    familiars,
    conditionalBonuses: [...conditionalBonuses]
  };

  savedLineups.push(lineup);
  saveData();
  renderSavedLineups();

  // Clear the name input
  nameInput.value = '';
}

function loadLineup(index) {
  const lineup = savedLineups[index];
  if (!lineup) return;

  // Load familiar configuration (support both old 'monsters' and new 'familiars' key)
  const familiars = lineup.familiars || lineup.monsters;
  for (let i = 0; i < 3; i++) {
    const m = familiars[i];
    document.getElementById(`monster${i + 1}Rank`).value = m.rank;
    document.getElementById(`monster${i + 1}Element`).value = m.element;
    document.getElementById(`monster${i + 1}Type`).value = m.type;

    // Update dice options based on new rank
    updateDiceOptions(i + 1);
  }

  // Load conditional bonuses
  conditionalBonuses = [...lineup.conditionalBonuses];
  saveData();
  renderConditionalBonuses();
  calculate();
}

function deleteLineup(index) {
  if (!confirm('Are you sure you want to delete this lineup?')) {
    return;
  }

  savedLineups.splice(index, 1);
  saveData();
  renderSavedLineups();
}

// ============================================
// REROLL LOGIC
// ============================================

function simulateResultDetailed(testDice, familiars, activeBonusItems) {
  // Calculate what the final result would be with given dice values
  // Returns detailed breakdown including which conditionals activate
  const diceSum = testDice.reduce((a, b) => a + b, 0);

  // Calculate flat bonuses from items
  let itemFlat = 0;
  activeBonusItems.forEach(item => {
    itemFlat += item.flatBonus;
  });

  // Check conditional bonuses and track which ones activate
  let conditionalFlat = 0;
  let conditionalMult = 0;
  const activeConditionals = [];

  conditionalBonuses.forEach(cond => {
    let isActive = false;
    try {
      const condFn = new Function('dice', 'familiars', `return ${cond.condition}`);
      isActive = condFn(testDice, familiars);
    } catch (e) {
      // Invalid condition
    }
    if (isActive) {
      activeConditionals.push(cond.name);
      conditionalFlat += cond.flatBonus;
      if (cond.multiplierBonus !== 0 && cond.multiplierBonus !== 1) {
        conditionalMult += cond.multiplierBonus;
      }
    }
  });

  // Calculate multipliers from items
  let itemMult = 0;
  activeBonusItems.forEach(item => {
    if (item.multiplierBonus !== 0 && item.multiplierBonus !== 1) {
      itemMult += item.multiplierBonus;
    }
  });

  const totalFlat = itemFlat + conditionalFlat;
  const totalMultiplier = itemMult + conditionalMult;

  // Calculate final result
  const afterFlat = diceSum + totalFlat;
  let beforeRounding;
  let finalMultiplier = null;
  if (totalMultiplier !== 0) {
    finalMultiplier = totalMultiplier;
    beforeRounding = afterFlat * finalMultiplier;
  } else {
    beforeRounding = afterFlat;
  }
  const finalResult = Math.floor(beforeRounding);

  return {
    diceSum,
    totalFlat,
    totalMultiplier: finalMultiplier,
    finalResult,
    activeConditionals,
    breakdown: {
      itemFlat,
      conditionalFlat,
      itemMult,
      conditionalMult
    }
  };
}

function calculateRerollSuggestions(dice, familiars, activeBonusItems, difficulty, currentResult) {
  const suggestions = [];

  for (let dieIndex = 0; dieIndex < 3; dieIndex++) {
    const currentValue = dice[dieIndex];
    const passingValues = [];

    // Get max dice value based on familiar rank
    const maxDice = getMaxDiceForRank(familiars[dieIndex].rank);

    // Test all possible values for this die (1 to maxDice based on rank)
    for (let testValue = 1; testValue <= maxDice; testValue++) {
      const testDice = [...dice];
      testDice[dieIndex] = testValue;

      const result = simulateResultDetailed(testDice, familiars, activeBonusItems);

      if (result.finalResult >= difficulty) {
        passingValues.push({
          value: testValue,
          ...result
        });
      }
    }

    // Calculate odds based on how many values pass (out of maxDice, not 6)
    const odds = passingValues.length > 0
      ? Math.round((passingValues.length / maxDice) * 100)
      : null;

    // Check if current value is among passing values
    const currentPasses = passingValues.some(p => p.value === currentValue);

    suggestions.push({
      dieIndex,
      dieName: `Dice ${dieIndex + 1}`,
      currentValue,
      passingValues,
      odds,
      currentPasses,
      maxDice,
      rank: familiars[dieIndex].rank
    });
  }

  return suggestions;
}

function renderRerollSuggestions(suggestions, passed, difficulty) {
  const section = document.getElementById('rerollSection');
  const container = document.getElementById('rerollSuggestions');

  // Hide section if already passing
  if (passed) {
    section.style.display = 'none';
    return;
  }

  section.style.display = 'block';

  container.innerHTML = suggestions.map(s => {
    let itemClass = 'reroll-item';
    let targetClass = 'reroll-target';
    let targetText = '';
    let conditionalsHtml = '';

    if (s.passingValues.length === 0) {
      // Impossible to pass by rerolling this die alone
      itemClass += ' impossible';
      targetClass += ' impossible';
      targetText = 'Impossible alone';
    } else {
      // Can reroll to pass - show which values work
      itemClass += ' can-reroll';
      targetClass += ' possible';

      const passingNums = s.passingValues.map(p => p.value);
      targetText = `Need: ${passingNums.join(', ')}`;

      // Show which conditionals would activate
      const r = s.passingValues[0];
      if (r.activeConditionals.length > 0) {
        conditionalsHtml = `<div class="reroll-conditionals">Activates: ${r.activeConditionals.join(', ')}</div>`;
      }
    }

    return `
      <div class="${itemClass}">
        <div class="reroll-die-name">${s.dieName} (d${s.maxDice})</div>
        <div class="reroll-current">Current: ${s.currentValue} | ${s.rank}</div>
        <div class="${targetClass}">${targetText}</div>
        ${s.odds !== null ? `<div class="reroll-odds">${s.odds}% chance (${s.passingValues.length}/${s.maxDice})</div>` : ''}
        ${conditionalsHtml}
      </div>
    `;
  }).join('');
}

// ============================================
// CALCULATION
// ============================================

function getState() {
  const dice = [
    parseInt(document.getElementById('dice1').value),
    parseInt(document.getElementById('dice2').value),
    parseInt(document.getElementById('dice3').value),
  ];

  const familiars = [
    {
      type: document.getElementById('monster1Type').value,
      element: document.getElementById('monster1Element').value,
      rank: document.getElementById('monster1Rank').value,
    },
    {
      type: document.getElementById('monster2Type').value,
      element: document.getElementById('monster2Element').value,
      rank: document.getElementById('monster2Rank').value,
    },
    {
      type: document.getElementById('monster3Type').value,
      element: document.getElementById('monster3Element').value,
      rank: document.getElementById('monster3Rank').value,
    },
  ];

  const activeBonusItems = [...bonusItems];

  const difficulty = parseInt(document.getElementById('difficulty').value) || 0;

  return { dice, familiars, activeBonusItems, difficulty };
}

function calculate() {
  const { dice, familiars, activeBonusItems, difficulty } = getState();

  // Step 1: Sum dice
  const diceSum = dice.reduce((a, b) => a + b, 0);

  // Step 2: Calculate flat bonuses
  let totalFlat = 0;

  // From toggled items
  activeBonusItems.forEach(item => {
    totalFlat += item.flatBonus;
  });

  // From conditional bonuses
  conditionalBonuses.forEach((cond, index) => {
    let isActive = false;
    try {
      const condFn = new Function('dice', 'familiars', `return ${cond.condition}`);
      isActive = condFn(dice, familiars);
    } catch (e) {
      console.error(`Error in condition "${cond.name}":`, e);
    }

    const el = document.getElementById(`cond${index}`);
    if (el) {
      el.classList.toggle('active', isActive);
    }

    if (isActive) {
      totalFlat += cond.flatBonus;
    }
  });

  // Step 3: Calculate multipliers (just add them up directly)
  // e.g., x1.6 + x1.2 + x1.6 = x4.4
  let totalMultiplier = 0;

  activeBonusItems.forEach(item => {
    if (item.multiplierBonus !== 0 && item.multiplierBonus !== 1) {
      totalMultiplier += item.multiplierBonus;
    }
  });

  conditionalBonuses.forEach((cond, index) => {
    let isActive = false;
    try {
      const condFn = new Function('dice', 'familiars', `return ${cond.condition}`);
      isActive = condFn(dice, familiars);
    } catch (e) {
      // Already logged above
    }

    if (isActive && cond.multiplierBonus !== 0 && cond.multiplierBonus !== 1) {
      totalMultiplier += cond.multiplierBonus;
    }
  });

  // Step 4: Apply calculation
  const afterFlat = diceSum + totalFlat;
  let beforeRounding;
  let finalMultiplier;

  if (totalMultiplier !== 0) {
    finalMultiplier = totalMultiplier;
    beforeRounding = afterFlat * finalMultiplier;
  } else {
    finalMultiplier = null;
    beforeRounding = afterFlat;
  }

  const finalResult = Math.floor(beforeRounding);

  // Step 5: Compare to difficulty
  const passed = finalResult >= difficulty;
  const difference = finalResult - difficulty;

  // Update display
  document.getElementById('diceSum').textContent = diceSum;
  document.getElementById('flatBonus').textContent =
    (totalFlat >= 0 ? '+' : '') + totalFlat;

  const multEl = document.getElementById('totalMult');
  const beforeRoundEl = document.getElementById('beforeRound');
  const multContainer = multEl.closest('.result-item');
  const beforeRoundContainer = beforeRoundEl.closest('.result-item');

  if (finalMultiplier !== null) {
    multContainer.style.display = '';
    beforeRoundContainer.style.display = '';
    multEl.textContent = '×' + finalMultiplier.toFixed(2);
    beforeRoundEl.textContent = beforeRounding.toFixed(2);
  } else {
    multContainer.style.display = 'none';
    beforeRoundContainer.style.display = 'none';
  }

  const finalResultEl = document.getElementById('finalResult');
  finalResultEl.textContent = finalResult;
  finalResultEl.className = 'final-result ' + (passed ? 'pass' : 'fail');

  const statusEl = document.getElementById('resultStatus');
  statusEl.textContent = passed ? 'PASS' : 'FAIL';
  statusEl.className = 'result-status ' + (passed ? 'pass' : 'fail');

  const diffEl = document.getElementById('difference');
  if (difference >= 0) {
    diffEl.textContent = `Beat by ${difference}`;
  } else {
    diffEl.textContent = `Failed by ${Math.abs(difference)}`;
  }

  // Show active bonuses
  const activeBonusNames = activeBonusItems.map(item => item.name);
  const activeCondNames = [];
  conditionalBonuses.forEach((cond, index) => {
    const el = document.getElementById(`cond${index}`);
    if (el && el.classList.contains('active')) {
      activeCondNames.push(cond.name);
    }
  });

  const allActive = [...activeBonusNames, ...activeCondNames];
  const activeBonusesEl = document.getElementById('activeBonusesDisplay');
  if (allActive.length > 0) {
    activeBonusesEl.textContent = `Active: ${allActive.join(', ')}`;
  } else {
    activeBonusesEl.textContent = '';
  }

  // Calculate and display reroll suggestions
  const rerollSuggestions = calculateRerollSuggestions(dice, familiars, activeBonusItems, difficulty, finalResult);
  renderRerollSuggestions(rerollSuggestions, passed, difficulty);
}

// ============================================
// IMAGE SCANNER MODULE
// ============================================

const ImageScanner = {
  // Configuration
  config: {
    borderColors: {
      // NOTE: Only Legendary is confirmed. Replace others with actual hex values when available.
      Common: { r: 127, g: 127, b: 127 },    // Gray (placeholder - needs real value)
      Rare: { r: 0, g: 150, b: 255 },        // Green-ish (placeholder - needs real value)
      Epic: { r: 110, g: 75, b: 255 },       // Purple-ish (placeholder - needs real value)
      Unique: { r: 205, g: 97, b: 9 },     // Orange-ish (placeholder - needs real value)
      Legendary: { r: 80, g: 163, b: 2 }     // #50A302 - Lime green (confirmed)
    },
    // Icon positions relative to card (percentages) - calibrated from examples
    elementIconRegion: { x: 0.89, y: 0.185, w: 0.065, h: 0.060 },  // Top-right, small icon
    typeIconRegion: { x: 0.895, y: 0.27, w: 0.063, h: 0.060 },     // Below element
    textRegion: { x: 0.03, y: 0.79, w: 0.94, h: 0.1 },
    debug: false  // Set to true to visualize extraction regions
  },

  // State
  canvas: null,
  ctx: null,
  currentImage: null,
  referenceImages: { elements: {}, types: {} },
  tesseractWorker: null,

  async init() {
    this.canvas = document.getElementById('scannerCanvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

    await this.loadReferenceImages();
    this.setupEventListeners();
  },

  async loadReferenceImages() {
    const elements = ['Fire', 'Ice', 'Lightning', 'Poison', 'Dark', 'Holy', 'None'];
    const types = ['Human', 'Beast', 'Plant', 'Aquatic', 'Fairy', 'Reptile', 'Devil', 'Undead', 'Machine'];

    for (const element of elements) {
      try {
        this.referenceImages.elements[element] = await this.loadImage(`element/${element}.png`);
      } catch (e) {
        console.warn(`Could not load element reference: ${element}`);
      }
    }

    for (const type of types) {
      try {
        this.referenceImages.types[type] = await this.loadImage(`type/${type}.png`);
      } catch (e) {
        console.warn(`Could not load type reference: ${type}`);
      }
    }
  },

  loadImage(src) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load ${src}`));
      img.src = src;
    });
  },

  setupEventListeners() {
    const dropZone = document.getElementById('scannerDropZone');
    const fileInput = document.getElementById('cardImageInput');

    if (!dropZone || !fileInput) return;

    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
      dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      if (e.dataTransfer.files.length) {
        this.processFile(e.dataTransfer.files[0]);
      }
    });

    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length) {
        this.processFile(e.target.files[0]);
      }
      e.target.value = '';
    });

    // Clipboard paste support (Ctrl+V anywhere on page)
    document.addEventListener('paste', (e) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            // Switch to roster page if not already there
            if (!document.getElementById('page-roster').classList.contains('active')) {
              showPage('roster');
            }
            this.processFile(file);
          }
          break;
        }
      }
    });
  },

  async processFile(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file');
      return;
    }

    const preview = document.getElementById('scannerPreview');
    const status = document.getElementById('scannerStatus');
    preview.style.display = 'block';
    status.textContent = 'Loading image...';

    try {
      // Load the image
      const imageUrl = URL.createObjectURL(file);
      this.currentImage = await this.loadImage(imageUrl);
      URL.revokeObjectURL(imageUrl);

      // Draw to canvas
      this.canvas.width = this.currentImage.width;
      this.canvas.height = this.currentImage.height;
      this.ctx.drawImage(this.currentImage, 0, 0);

      status.textContent = 'Detecting border...';

      // Step 1: Detect and crop card by border
      const croppedData = await this.detectAndCropByBorder();

      status.textContent = 'Detecting rank...';

      // Step 2: Detect rank from border color
      const rankResult = this.detectRank(croppedData.borderColor);

      status.textContent = 'Detecting element...';

      // Step 3: Detect element from icon
      const elementResult = await this.detectElement(croppedData);

      status.textContent = 'Detecting type...';

      // Step 4: Detect type from icon
      const typeResult = await this.detectType(croppedData);

      status.textContent = 'Extracting text...';

      // Step 5: OCR for conditional bonus
      const conditionalResult = await this.extractConditionalText(croppedData);

      // Debug: Draw extraction regions on canvas
      if (this.config.debug) {
        this.drawDebugOverlay(croppedData);
        // Update croppedImageUrl AFTER drawing debug overlay
        croppedData.croppedImageUrl = croppedData.canvas.toDataURL('image/png');
      }

      // Update scanner preview canvas to show the cropped result
      this.canvas.width = croppedData.width;
      this.canvas.height = croppedData.height;
      this.ctx.drawImage(croppedData.canvas, 0, 0);

      // Log debug info to console
      console.log('Scanner Results:', {
        borderColor: croppedData.borderColor,
        bounds: croppedData.bounds,
        rank: rankResult,
        element: elementResult,
        type: typeResult,
        conditionalText: conditionalResult.rawText
      });

      // Step 6: Show results modal
      this.showExtractionModal({
        rank: rankResult,
        element: elementResult,
        type: typeResult,
        conditional: conditionalResult,
        croppedImage: croppedData.croppedImageUrl
      });

      status.textContent = 'Done! Review the extracted data above.';

    } catch (error) {
      console.error('Image processing error:', error);
      status.textContent = 'Error: ' + error.message;
    }
  },

  async detectAndCropByBorder() {
    const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
    const pixels = imageData.data;
    const width = this.canvas.width;
    const height = this.canvas.height;

    // Find which border color is present and locate the border bounds
    const tolerance = 50;
    const borderColors = this.config.borderColors;

    // Check if a pixel matches any known border color
    const matchesBorderColor = (r, g, b) => {
      for (const [rank, color] of Object.entries(borderColors)) {
        const dist = Math.sqrt(
          Math.pow(r - color.r, 2) +
          Math.pow(g - color.g, 2) +
          Math.pow(b - color.b, 2)
        );
        if (dist < tolerance) {
          return { match: true, rank, color };
        }
      }
      return { match: false };
    };

    // Scan to find border bounds
    let left = 0, right = width, top = 0, bottom = height;
    let detectedColor = null;

    // Find left edge - scan from left until we hit border color
    leftScan: for (let x = 0; x < width / 2; x++) {
      for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
        const idx = (y * width + x) * 4;
        const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
        if (result.match) {
          left = x;
          detectedColor = result.color;
          break leftScan;
        }
      }
    }

    // Find right edge
    rightScan: for (let x = width - 1; x > width / 2; x--) {
      for (let y = Math.floor(height * 0.3); y < height * 0.7; y++) {
        const idx = (y * width + x) * 4;
        const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
        if (result.match) {
          right = x + 1;
          break rightScan;
        }
      }
    }

    // Find top edge
    topScan: for (let y = 0; y < height / 2; y++) {
      for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
        const idx = (y * width + x) * 4;
        const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
        if (result.match) {
          top = y;
          break topScan;
        }
      }
    }

    // Find bottom edge
    bottomScan: for (let y = height - 1; y > height / 2; y--) {
      for (let x = Math.floor(width * 0.3); x < width * 0.7; x++) {
        const idx = (y * width + x) * 4;
        const result = matchesBorderColor(pixels[idx], pixels[idx + 1], pixels[idx + 2]);
        if (result.match) {
          bottom = y + 1;
          break bottomScan;
        }
      }
    }

    const borderColor = detectedColor || { r: 128, g: 128, b: 128 };
    const bounds = { left, right, top, bottom };

    console.log('Border detection:', { bounds, borderColor });

    // Crop the image
    const cropWidth = bounds.right - bounds.left;
    const cropHeight = bounds.bottom - bounds.top;

    const croppedCanvas = document.createElement('canvas');
    croppedCanvas.width = cropWidth;
    croppedCanvas.height = cropHeight;
    const croppedCtx = croppedCanvas.getContext('2d');

    croppedCtx.drawImage(
      this.canvas,
      bounds.left, bounds.top, cropWidth, cropHeight,
      0, 0, cropWidth, cropHeight
    );

    return {
      borderColor,
      canvas: croppedCanvas,
      ctx: croppedCtx,
      width: cropWidth,
      height: cropHeight,
      croppedImageUrl: croppedCanvas.toDataURL('image/png'),
      bounds
    };
  },

  detectRank(borderColor) {
    const ranks = this.config.borderColors;
    let bestMatch = { rank: 'Common', confidence: 0, distance: Infinity };

    for (const [rank, targetColor] of Object.entries(ranks)) {
      const distance = Math.sqrt(
        Math.pow(borderColor.r - targetColor.r, 2) +
        Math.pow(borderColor.g - targetColor.g, 2) +
        Math.pow(borderColor.b - targetColor.b, 2)
      );

      if (distance < bestMatch.distance) {
        const confidence = Math.max(0, 100 - (distance / 4.41));
        bestMatch = { rank, confidence: Math.round(confidence), distance };
      }
    }

    return bestMatch;
  },

  async detectElement(croppedData) {
    const region = this.config.elementIconRegion;
    const iconData = this.extractIconRegion(croppedData, region);

    let bestMatch = { element: 'None', confidence: 0 };
    const allScores = {};

    for (const [element, refImage] of Object.entries(this.referenceImages.elements)) {
      const similarity = this.calculateSimilarity(iconData, refImage);
      allScores[element] = Math.round(similarity);
      if (similarity > bestMatch.confidence) {
        bestMatch = { element, confidence: Math.round(similarity) };
      }
    }

    if (this.config.debug) {
      console.log('Element detection scores:', allScores);
    }

    return { ...bestMatch, allScores, iconData };
  },

  async detectType(croppedData) {
    const region = this.config.typeIconRegion;
    const iconData = this.extractIconRegion(croppedData, region);

    let bestMatch = { type: 'Human', confidence: 0 };
    const allScores = {};

    // Use Binary Mask + Hu Moments for types (same colors, different shapes)
    for (const [type, refImage] of Object.entries(this.referenceImages.types)) {
      const similarity = this.calculateTypeSimilarity(iconData, refImage);
      allScores[type] = Math.round(similarity);
      if (similarity > bestMatch.confidence) {
        bestMatch = { type, confidence: Math.round(similarity) };
      }
    }

    if (this.config.debug) {
      console.log('Type detection scores:', allScores);
    }

    return { ...bestMatch, allScores, iconData };
  },

  extractIconRegion(croppedData, region) {
    const x = Math.floor(croppedData.width * region.x);
    const y = Math.floor(croppedData.height * region.y);
    const w = Math.floor(croppedData.width * region.w);
    const h = Math.floor(croppedData.height * region.h);

    const iconCanvas = document.createElement('canvas');
    iconCanvas.width = w;
    iconCanvas.height = h;
    const iconCtx = iconCanvas.getContext('2d');

    iconCtx.drawImage(croppedData.canvas, x, y, w, h, 0, 0, w, h);

    return { canvas: iconCanvas, ctx: iconCtx, width: w, height: h };
  },

  calculateSimilarity(sourceIcon, referenceImage) {
    // Resize both to a standard size for comparison
    const size = 32;

    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = size;
    srcCanvas.height = size;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(sourceIcon.canvas, 0, 0, size, size);
    const srcData = srcCtx.getImageData(0, 0, size, size);

    const refCanvas = document.createElement('canvas');
    refCanvas.width = size;
    refCanvas.height = size;
    const refCtx = refCanvas.getContext('2d');
    refCtx.drawImage(referenceImage, 0, 0, size, size);
    const refData = refCtx.getImageData(0, 0, size, size);

    // Background color to ignore (dark brownish from card background)
    // Pixels similar to this will be skipped
    const bgColor = { r: 58, g: 52, b: 47 };
    const bgTolerance = 40;

    const isBackground = (r, g, b) => {
      const dist = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      );
      return dist < bgTolerance;
    };

    // Color histogram comparison (8 bins per channel)
    const bins = 8;
    const binSize = 256 / bins;
    const srcHist = { r: new Array(bins).fill(0), g: new Array(bins).fill(0), b: new Array(bins).fill(0) };
    const refHist = { r: new Array(bins).fill(0), g: new Array(bins).fill(0), b: new Array(bins).fill(0) };

    let srcPixelCount = 0;
    let refPixelCount = 0;

    for (let i = 0; i < srcData.data.length; i += 4) {
      const srcR = srcData.data[i], srcG = srcData.data[i + 1], srcB = srcData.data[i + 2], srcA = srcData.data[i + 3];
      const refR = refData.data[i], refG = refData.data[i + 1], refB = refData.data[i + 2], refA = refData.data[i + 3];

      // Skip transparent pixels
      if (srcA < 128) continue;

      // For source: skip background pixels
      if (!isBackground(srcR, srcG, srcB)) {
        srcHist.r[Math.floor(srcR / binSize)]++;
        srcHist.g[Math.floor(srcG / binSize)]++;
        srcHist.b[Math.floor(srcB / binSize)]++;
        srcPixelCount++;
      }

      // For reference: skip transparent pixels only (reference images should have clean backgrounds)
      if (refA >= 128) {
        refHist.r[Math.floor(refR / binSize)]++;
        refHist.g[Math.floor(refG / binSize)]++;
        refHist.b[Math.floor(refB / binSize)]++;
        refPixelCount++;
      }
    }

    if (srcPixelCount === 0 || refPixelCount === 0) return 0;

    // Normalize histograms and calculate intersection (higher = more similar)
    let intersection = 0;
    for (let i = 0; i < bins; i++) {
      srcHist.r[i] /= srcPixelCount;
      srcHist.g[i] /= srcPixelCount;
      srcHist.b[i] /= srcPixelCount;
      refHist.r[i] /= refPixelCount;
      refHist.g[i] /= refPixelCount;
      refHist.b[i] /= refPixelCount;

      intersection += Math.min(srcHist.r[i], refHist.r[i]);
      intersection += Math.min(srcHist.g[i], refHist.g[i]);
      intersection += Math.min(srcHist.b[i], refHist.b[i]);
    }

    // intersection ranges from 0 to 3 (sum of R, G, B channels)
    // Convert to 0-100 percentage
    return (intersection / 3) * 100;
  },

  // Binary Mask + Hu Moments for type icon detection
  // Works well for grayscale silhouettes (same colors, different shapes)

  createBinaryMask(imageData, width, height) {
    const bgColor = { r: 58, g: 52, b: 47 };  // Dark card background
    const bgTolerance = 45;
    const mask = new Uint8Array(width * height);

    for (let i = 0; i < width * height; i++) {
      const idx = i * 4;
      const r = imageData.data[idx];
      const g = imageData.data[idx + 1];
      const b = imageData.data[idx + 2];
      const a = imageData.data[idx + 3];

      const dist = Math.sqrt(
        Math.pow(r - bgColor.r, 2) +
        Math.pow(g - bgColor.g, 2) +
        Math.pow(b - bgColor.b, 2)
      );
      mask[i] = (a > 128 && dist > bgTolerance) ? 1 : 0;
    }
    return mask;
  },

  calculateIoU(mask1, mask2) {
    let intersection = 0, union = 0;
    for (let i = 0; i < mask1.length; i++) {
      if (mask1[i] && mask2[i]) intersection++;
      if (mask1[i] || mask2[i]) union++;
    }
    return union > 0 ? intersection / union : 0;
  },

  calculateDice(mask1, mask2) {
    let intersection = 0, sum1 = 0, sum2 = 0;
    for (let i = 0; i < mask1.length; i++) {
      if (mask1[i] && mask2[i]) intersection++;
      sum1 += mask1[i];
      sum2 += mask2[i];
    }
    return (sum1 + sum2) > 0 ? (2 * intersection) / (sum1 + sum2) : 0;
  },

  calculateHuMoments(mask, width, height) {
    // Calculate raw moments
    let m00 = 0, m10 = 0, m01 = 0;
    let m11 = 0, m20 = 0, m02 = 0;
    let m21 = 0, m12 = 0, m30 = 0, m03 = 0;

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const v = mask[y * width + x];
        if (v === 0) continue;

        m00 += v;
        m10 += x * v;
        m01 += y * v;
        m11 += x * y * v;
        m20 += x * x * v;
        m02 += y * y * v;
        m21 += x * x * y * v;
        m12 += x * y * y * v;
        m30 += x * x * x * v;
        m03 += y * y * y * v;
      }
    }

    if (m00 === 0) return new Array(7).fill(0);

    // Centroid
    const cx = m10 / m00;
    const cy = m01 / m00;

    // Central moments (translation invariant)
    const mu20 = m20 / m00 - cx * cx;
    const mu02 = m02 / m00 - cy * cy;
    const mu11 = m11 / m00 - cx * cy;
    const mu30 = m30 / m00 - 3 * cx * mu20 - cx * cx * cx;
    const mu03 = m03 / m00 - 3 * cy * mu02 - cy * cy * cy;
    const mu21 = m21 / m00 - 2 * cx * mu11 - cy * mu20 - cx * cx * cy;
    const mu12 = m12 / m00 - 2 * cy * mu11 - cx * mu02 - cx * cy * cy;

    // Normalized central moments (scale invariant)
    const norm = (p, q) => Math.pow(m00, 1 + (p + q) / 2);
    const nu20 = mu20 / norm(2, 0);
    const nu02 = mu02 / norm(0, 2);
    const nu11 = mu11 / norm(1, 1);
    const nu30 = mu30 / norm(3, 0);
    const nu03 = mu03 / norm(0, 3);
    const nu21 = mu21 / norm(2, 1);
    const nu12 = mu12 / norm(1, 2);

    // 7 Hu moments (rotation invariant)
    const hu = new Array(7);
    hu[0] = nu20 + nu02;
    hu[1] = Math.pow(nu20 - nu02, 2) + 4 * Math.pow(nu11, 2);
    hu[2] = Math.pow(nu30 - 3 * nu12, 2) + Math.pow(3 * nu21 - nu03, 2);
    hu[3] = Math.pow(nu30 + nu12, 2) + Math.pow(nu21 + nu03, 2);
    hu[4] = (nu30 - 3 * nu12) * (nu30 + nu12) *
            (Math.pow(nu30 + nu12, 2) - 3 * Math.pow(nu21 + nu03, 2)) +
            (3 * nu21 - nu03) * (nu21 + nu03) *
            (3 * Math.pow(nu30 + nu12, 2) - Math.pow(nu21 + nu03, 2));
    hu[5] = (nu20 - nu02) * (Math.pow(nu30 + nu12, 2) - Math.pow(nu21 + nu03, 2)) +
            4 * nu11 * (nu30 + nu12) * (nu21 + nu03);
    hu[6] = (3 * nu21 - nu03) * (nu30 + nu12) *
            (Math.pow(nu30 + nu12, 2) - 3 * Math.pow(nu21 + nu03, 2)) -
            (nu30 - 3 * nu12) * (nu21 + nu03) *
            (3 * Math.pow(nu30 + nu12, 2) - Math.pow(nu21 + nu03, 2));

    return hu;
  },

  huMomentDistance(hu1, hu2) {
    let distance = 0;
    for (let i = 0; i < 7; i++) {
      const sign1 = hu1[i] >= 0 ? 1 : -1;
      const sign2 = hu2[i] >= 0 ? 1 : -1;
      const log1 = hu1[i] !== 0 ? sign1 * Math.log10(Math.abs(hu1[i])) : 0;
      const log2 = hu2[i] !== 0 ? sign2 * Math.log10(Math.abs(hu2[i])) : 0;
      distance += Math.abs(log1 - log2);
    }
    return distance;
  },

  calculateTypeSimilarity(sourceIcon, referenceImage) {
    const size = 32;

    // Resize both to standard size
    const srcCanvas = document.createElement('canvas');
    srcCanvas.width = size;
    srcCanvas.height = size;
    const srcCtx = srcCanvas.getContext('2d');
    srcCtx.drawImage(sourceIcon.canvas, 0, 0, size, size);
    const srcData = srcCtx.getImageData(0, 0, size, size);

    const refCanvas = document.createElement('canvas');
    refCanvas.width = size;
    refCanvas.height = size;
    const refCtx = refCanvas.getContext('2d');
    refCtx.drawImage(referenceImage, 0, 0, size, size);
    const refData = refCtx.getImageData(0, 0, size, size);

    // Create binary masks
    const srcMask = this.createBinaryMask(srcData, size, size);
    const refMask = this.createBinaryMask(refData, size, size);

    // Phase 1: Mask overlap (IoU + Dice weighted)
    const iou = this.calculateIoU(srcMask, refMask);
    const dice = this.calculateDice(srcMask, refMask);
    const maskScore = (iou * 0.4 + dice * 0.6) * 100;

    // Phase 2: Hu Moments
    const srcHu = this.calculateHuMoments(srcMask, size, size);
    const refHu = this.calculateHuMoments(refMask, size, size);
    const huDistance = this.huMomentDistance(srcHu, refHu);
    const huScore = Math.max(0, 100 - huDistance * 20);

    // Combine: trust mask when confident, blend Hu otherwise
    let finalScore;
    if (maskScore > 60) {
      finalScore = maskScore * 0.8 + huScore * 0.2;
    } else {
      finalScore = maskScore * 0.4 + huScore * 0.6;
    }

    return finalScore;
  },

  async extractConditionalText(croppedData) {
    // Initialize Tesseract if not already done
    if (!this.tesseractWorker) {
      if (typeof Tesseract === 'undefined') {
        return { rawText: '', matched: null, confidence: 0 };
      }

      const status = document.getElementById('scannerStatus');
      status.textContent = 'Loading OCR engine (first time only)...';

      this.tesseractWorker = await Tesseract.createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            status.textContent = `OCR: ${Math.round(m.progress * 100)}%`;
          }
        }
      });
    }

    // Extract text region
    const region = this.config.textRegion;
    const x = Math.floor(croppedData.width * region.x);
    const y = Math.floor(croppedData.height * region.y);
    const w = Math.floor(croppedData.width * region.w);
    const h = Math.floor(croppedData.height * region.h);

    const textCanvas = document.createElement('canvas');
    textCanvas.width = w;
    textCanvas.height = h;
    const textCtx = textCanvas.getContext('2d');

    textCtx.drawImage(croppedData.canvas, x, y, w, h, 0, 0, w, h);

    // Preprocess for OCR
    this.preprocessForOCR(textCtx, w, h);

    // Run OCR
    const result = await this.tesseractWorker.recognize(textCanvas);
    const rawText = result.data.text.trim();

    // Match against known conditionals
    const matched = this.matchConditionalText(rawText);

    return {
      rawText,
      matched,
      confidence: Math.round(result.data.confidence)
    };
  },

  preprocessForOCR(ctx, width, height) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const pixels = imageData.data;

    // Step 1: Calculate histogram for adaptive thresholding
    const histogram = new Array(256).fill(0);
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = Math.round(pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114);
      histogram[gray]++;
    }

    // Step 2: Find optimal threshold using Otsu's method
    const totalPixels = width * height;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * histogram[i];

    let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
    for (let t = 0; t < 256; t++) {
      wB += histogram[t];
      if (wB === 0) continue;
      const wF = totalPixels - wB;
      if (wF === 0) break;

      sumB += t * histogram[t];
      const mB = sumB / wB;
      const mF = (sum - sumB) / wF;
      const variance = wB * wF * (mB - mF) * (mB - mF);

      if (variance > maxVariance) {
        maxVariance = variance;
        threshold = t;
      }
    }

    // Step 3: Apply contrast enhancement and adaptive threshold
    for (let i = 0; i < pixels.length; i += 4) {
      const gray = pixels[i] * 0.299 + pixels[i + 1] * 0.587 + pixels[i + 2] * 0.114;

      // Invert if text is light on dark (threshold below midpoint means dark bg)
      const value = (threshold < 128)
        ? (gray > threshold ? 0 : 255)   // Light text on dark bg - invert
        : (gray > threshold ? 255 : 0);  // Dark text on light bg - normal

      pixels[i] = value;
      pixels[i + 1] = value;
      pixels[i + 2] = value;
    }

    ctx.putImageData(imageData, 0, 0);
  },

  // Keywords with weights for matching
  keywordWeights: {
    // Elements (highest weight)
    'fire': 10, 'ice': 10, 'lightning': 10, 'poison': 10, 'dark': 10, 'holy': 10,
    'elemental': 8, 'non-elemental': 10,
    // Types
    'human': 10, 'beast': 10, 'plant': 10, 'aquatic': 10, 'fairy': 10,
    'reptile': 10, 'devil': 10, 'undead': 10, 'machine': 10,
    // Important condition words
    'same': 8, 'different': 8, 'all': 6, 'three': 6, 'two': 6, 'one': 5,
    'type': 5, 'element': 5, 'familiar': 3, 'familiars': 3,
    // Low weight common words
    'lineup': 1, 'active': 1, 'your': 0, 'is': 0, 'on': 0, 'if': 0, 'a': 0, 'an': 0, 'the': 0, 'have': 0
  },

  matchConditionalText(extractedText) {
    if (!extractedText || !configConditionalBonuses.bonuses) return null;

    const normalized = extractedText.toLowerCase()
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    // Extract bonus values from OCR text (e.g., "+2", "x1.2", "1.5x")
    const extractedBonus = this.extractBonusValues(normalized);

    let bestMatch = null;
    let bestScore = 0;

    for (const bonus of configConditionalBonuses.bonuses) {
      const bonusText = bonus.name.toLowerCase();

      // Calculate text similarity with keyword weighting
      const textScore = this.calculateTextSimilarity(normalized, bonusText);

      // Bonus value matching score (if we extracted values from OCR)
      let bonusValueScore = 0;
      if (extractedBonus.flat !== null || extractedBonus.mult !== null) {
        bonusValueScore = this.calculateBonusValueMatch(extractedBonus, bonus);
      }

      // Combined score: 70% text, 30% bonus values (if available)
      const finalScore = bonusValueScore > 0
        ? textScore * 0.7 + bonusValueScore * 0.3
        : textScore;

      if (finalScore > bestScore && finalScore > 35) {
        bestScore = finalScore;
        bestMatch = { ...bonus, matchScore: Math.round(finalScore) };
      }
    }

    return bestMatch;
  },

  extractBonusValues(text) {
    const result = { flat: null, mult: null };

    // Look for flat bonus patterns: +2, +1, -1, etc.
    const flatMatch = text.match(/([+-]\d+)(?!\.\d)/);
    if (flatMatch) {
      result.flat = parseInt(flatMatch[1]);
    }

    // Look for multiplier patterns: x1.2, 1.5x, ×1.2, etc.
    const multMatch = text.match(/[x×](\d+\.?\d*)|(\d+\.?\d*)[x×]/i);
    if (multMatch) {
      result.mult = parseFloat(multMatch[1] || multMatch[2]);
    }

    return result;
  },

  calculateBonusValueMatch(extracted, bonus) {
    let score = 0;
    let checks = 0;

    if (extracted.flat !== null && bonus.flatBonus !== undefined) {
      checks++;
      if (extracted.flat === bonus.flatBonus) score += 100;
      else if (Math.abs(extracted.flat - bonus.flatBonus) <= 1) score += 50;
    }

    if (extracted.mult !== null && bonus.multiplierBonus !== undefined) {
      checks++;
      if (Math.abs(extracted.mult - bonus.multiplierBonus) < 0.05) score += 100;
      else if (Math.abs(extracted.mult - bonus.multiplierBonus) < 0.2) score += 50;
    }

    return checks > 0 ? score / checks : 0;
  },

  calculateTextSimilarity(text1, text2) {
    // Multi-factor similarity: keyword matching + n-gram + Jaro-Winkler

    // 1. Keyword-weighted matching
    const keywordScore = this.calculateKeywordScore(text1, text2);

    // 2. Character n-gram similarity (trigrams)
    const ngramScore = this.calculateNgramSimilarity(text1, text2, 3);

    // 3. Jaro-Winkler for handling OCR errors
    const jaroScore = this.jaroWinklerSimilarity(text1, text2) * 100;

    // Weighted combination
    return keywordScore * 0.5 + ngramScore * 0.3 + jaroScore * 0.2;
  },

  calculateKeywordScore(text1, text2) {
    const words1 = text1.split(/\s+/).filter(w => w.length > 1);
    const words2 = text2.split(/\s+/).filter(w => w.length > 1);

    if (words1.length === 0 || words2.length === 0) return 0;

    let totalWeight = 0;
    let matchedWeight = 0;

    // Check each word in the reference text
    for (const w2 of words2) {
      const weight = this.keywordWeights[w2] !== undefined ? this.keywordWeights[w2] : 2;
      totalWeight += weight;

      // Check if this keyword is found in extracted text
      for (const w1 of words1) {
        if (w1 === w2 || w1.includes(w2) || w2.includes(w1) ||
            this.levenshteinDistance(w1, w2) <= Math.max(1, Math.floor(w2.length / 4))) {
          matchedWeight += weight;
          break;
        }
      }
    }

    return totalWeight > 0 ? (matchedWeight / totalWeight) * 100 : 0;
  },

  calculateNgramSimilarity(text1, text2, n) {
    const getNgrams = (text) => {
      const ngrams = new Set();
      const cleaned = text.replace(/\s+/g, ' ');
      for (let i = 0; i <= cleaned.length - n; i++) {
        ngrams.add(cleaned.substring(i, i + n));
      }
      return ngrams;
    };

    const ngrams1 = getNgrams(text1);
    const ngrams2 = getNgrams(text2);

    if (ngrams1.size === 0 || ngrams2.size === 0) return 0;

    let intersection = 0;
    for (const ng of ngrams1) {
      if (ngrams2.has(ng)) intersection++;
    }

    // Dice coefficient for n-grams
    return (2 * intersection / (ngrams1.size + ngrams2.size)) * 100;
  },

  jaroWinklerSimilarity(s1, s2) {
    if (s1 === s2) return 1;
    if (s1.length === 0 || s2.length === 0) return 0;

    const matchWindow = Math.floor(Math.max(s1.length, s2.length) / 2) - 1;
    const s1Matches = new Array(s1.length).fill(false);
    const s2Matches = new Array(s2.length).fill(false);

    let matches = 0;
    let transpositions = 0;

    // Find matches
    for (let i = 0; i < s1.length; i++) {
      const start = Math.max(0, i - matchWindow);
      const end = Math.min(i + matchWindow + 1, s2.length);

      for (let j = start; j < end; j++) {
        if (s2Matches[j] || s1[i] !== s2[j]) continue;
        s1Matches[i] = true;
        s2Matches[j] = true;
        matches++;
        break;
      }
    }

    if (matches === 0) return 0;

    // Count transpositions
    let k = 0;
    for (let i = 0; i < s1.length; i++) {
      if (!s1Matches[i]) continue;
      while (!s2Matches[k]) k++;
      if (s1[i] !== s2[k]) transpositions++;
      k++;
    }

    const jaro = (matches / s1.length + matches / s2.length +
                  (matches - transpositions / 2) / matches) / 3;

    // Winkler modification: boost for common prefix
    let prefix = 0;
    for (let i = 0; i < Math.min(4, s1.length, s2.length); i++) {
      if (s1[i] === s2[i]) prefix++;
      else break;
    }

    return jaro + prefix * 0.1 * (1 - jaro);
  },

  levenshteinDistance(str1, str2) {
    const m = str1.length;
    const n = str2.length;
    const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        dp[i][j] = Math.min(
          dp[i - 1][j] + 1,      // deletion
          dp[i][j - 1] + 1,      // insertion
          dp[i - 1][j - 1] + cost // substitution
        );
      }
    }

    return dp[m][n];
  },

  showExtractionModal(results) {
    const modal = document.getElementById('extractionModal');

    // Set preview image
    document.getElementById('extractedCardPreview').src = results.croppedImage;

    // Set rank
    document.getElementById('extractedRank').value = results.rank.rank;
    this.setConfidence('rankConfidence', results.rank.confidence);

    // Set element
    document.getElementById('extractedElement').value = results.element.element;
    this.setConfidence('elementConfidence', results.element.confidence);

    // Set type
    document.getElementById('extractedType').value = results.type.type;
    this.setConfidence('typeConfidence', results.type.confidence);

    // Set conditional text
    document.getElementById('extractedConditionalText').textContent =
      results.conditional.rawText || '(No text detected)';

    // Populate conditional match dropdown
    const matchSelect = document.getElementById('extractedConditionalMatch');
    matchSelect.innerHTML = '<option value="">-- No match --</option>';

    if (results.conditional.matched) {
      const opt = document.createElement('option');
      opt.value = JSON.stringify(results.conditional.matched);
      const bonusStr = this.formatBonusValues(results.conditional.matched);
      const rarity = results.conditional.matched.rarity || '';
      opt.textContent = `[${rarity}] [${bonusStr}] ${results.conditional.matched.name} (${results.conditional.matched.matchScore}%)`;
      opt.selected = true;
      matchSelect.appendChild(opt);
      this.setConfidence('conditionalConfidence', results.conditional.matched.matchScore);
    } else {
      const confEl = document.getElementById('conditionalConfidence');
      if (confEl) {
        confEl.textContent = '';
        if (!this.config.debug) confEl.style.display = 'none';
      }
    }

    // Add all bonuses as options, sorted by: 1) matching rank first, 2) match score
    if (configConditionalBonuses.bonuses) {
      const detectedRank = results.rank.rank;
      const allMatches = this.findTopMatches(results.conditional.rawText, 999);

      // Sort: same rank first, then by match score
      allMatches.sort((a, b) => {
        const aMatchesRank = a.rarity === detectedRank ? 1 : 0;
        const bMatchesRank = b.rarity === detectedRank ? 1 : 0;
        if (aMatchesRank !== bMatchesRank) return bMatchesRank - aMatchesRank;
        return b.matchScore - a.matchScore;
      });

      for (const match of allMatches) {
        if (!results.conditional.matched || match.id !== results.conditional.matched.id) {
          const opt = document.createElement('option');
          opt.value = JSON.stringify(match);
          const bonusStr = this.formatBonusValues(match);
          const rarity = match.rarity || '';
          opt.textContent = `[${rarity}] [${bonusStr}] ${match.name} (${match.matchScore}%)`;
          matchSelect.appendChild(opt);
        }
      }
    }

    // Display bonus values and update on dropdown change
    this.updateBonusValuesDisplay();
    matchSelect.addEventListener('change', () => this.updateBonusValuesDisplay());

    // Populate debug section with element/type detection details
    this.populateDebugSection(results);

    modal.style.display = 'flex';
  },

  formatBonusValues(bonus) {
    const parts = [];
    if (bonus.flatBonus !== undefined && bonus.flatBonus !== 0) {
      parts.push((bonus.flatBonus >= 0 ? '+' : '') + bonus.flatBonus);
    }
    if (bonus.multiplierBonus !== undefined && bonus.multiplierBonus !== 1) {
      parts.push('x' + bonus.multiplierBonus);
    }
    return parts.length > 0 ? parts.join(', ') : '+0';
  },

  updateBonusValuesDisplay() {
    const matchSelect = document.getElementById('extractedConditionalMatch');
    const bonusEl = document.getElementById('extractedBonusValues');

    if (!matchSelect.value) {
      bonusEl.textContent = '-';
      return;
    }

    try {
      const bonus = JSON.parse(matchSelect.value);
      bonusEl.textContent = this.formatBonusValues(bonus);
    } catch (e) {
      bonusEl.textContent = '-';
    }
  },

  populateDebugSection(results) {
    // Hide debug section when debug is off
    const debugSection = document.querySelector('.debug-section');
    if (debugSection) {
      debugSection.style.display = this.config.debug ? '' : 'none';
    }
    if (!this.config.debug) return;

    // Draw extracted element icon
    const elemCanvas = document.getElementById('debugElementExtracted');
    if (elemCanvas && results.element.iconData) {
      const ctx = elemCanvas.getContext('2d');
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(results.element.iconData.canvas, 0, 0, 64, 64);
    }

    // Draw extracted type icon
    const typeCanvas = document.getElementById('debugTypeExtracted');
    if (typeCanvas && results.type.iconData) {
      const ctx = typeCanvas.getContext('2d');
      ctx.clearRect(0, 0, 64, 64);
      ctx.drawImage(results.type.iconData.canvas, 0, 0, 64, 64);
    }

    // Populate element references with scores
    const elemRefsContainer = document.getElementById('debugElementReferences');
    if (elemRefsContainer && results.element.allScores) {
      elemRefsContainer.innerHTML = '';
      const sortedElements = Object.entries(results.element.allScores)
        .sort((a, b) => b[1] - a[1]);

      for (const [name, score] of sortedElements) {
        const refImg = this.referenceImages.elements[name];
        if (!refImg) continue;

        const item = document.createElement('div');
        item.className = 'debug-ref-item' + (name === results.element.element ? ' best-match' : '');

        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(refImg, 0, 0, 48, 48);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'ref-name';
        nameSpan.textContent = name;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'ref-score' + (score >= 70 ? ' high' : score >= 50 ? ' medium' : ' low');
        scoreSpan.textContent = score + '%';

        item.appendChild(canvas);
        item.appendChild(nameSpan);
        item.appendChild(scoreSpan);
        elemRefsContainer.appendChild(item);
      }
    }

    // Populate type references with scores
    const typeRefsContainer = document.getElementById('debugTypeReferences');
    if (typeRefsContainer && results.type.allScores) {
      typeRefsContainer.innerHTML = '';
      const sortedTypes = Object.entries(results.type.allScores)
        .sort((a, b) => b[1] - a[1]);

      for (const [name, score] of sortedTypes) {
        const refImg = this.referenceImages.types[name];
        if (!refImg) continue;

        const item = document.createElement('div');
        item.className = 'debug-ref-item' + (name === results.type.type ? ' best-match' : '');

        const canvas = document.createElement('canvas');
        canvas.width = 48;
        canvas.height = 48;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(refImg, 0, 0, 48, 48);

        const nameSpan = document.createElement('span');
        nameSpan.className = 'ref-name';
        nameSpan.textContent = name;

        const scoreSpan = document.createElement('span');
        scoreSpan.className = 'ref-score' + (score >= 70 ? ' high' : score >= 50 ? ' medium' : ' low');
        scoreSpan.textContent = score + '%';

        item.appendChild(canvas);
        item.appendChild(nameSpan);
        item.appendChild(scoreSpan);
        typeRefsContainer.appendChild(item);
      }
    }
  },

  setConfidence(elementId, confidence) {
    const el = document.getElementById(elementId);
    if (!el) return;

    // Hide confidence when debug is off
    if (!this.config.debug) {
      el.style.display = 'none';
      return;
    }

    el.style.display = '';
    el.textContent = `${confidence}%`;
    el.className = 'confidence';

    if (confidence < 50) {
      el.classList.add('very-low');
    } else if (confidence < 70) {
      el.classList.add('low');
    }
  },

  findTopMatches(text, limit) {
    if (!text || !configConditionalBonuses.bonuses) return [];

    const normalized = text.toLowerCase()
      .replace(/[\n\r]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const scored = configConditionalBonuses.bonuses.map(bonus => ({
      ...bonus,
      matchScore: Math.round(this.calculateTextSimilarity(normalized, bonus.name.toLowerCase()))
    }));

    return scored
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);
  },

  drawDebugOverlay(croppedData) {
    const ctx = croppedData.ctx;
    const w = croppedData.width;
    const h = croppedData.height;

    // Draw element region (red)
    const elemRegion = this.config.elementIconRegion;
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.strokeRect(
      w * elemRegion.x, h * elemRegion.y,
      w * elemRegion.w, h * elemRegion.h
    );
    ctx.fillStyle = 'red';
    ctx.font = '12px sans-serif';
    ctx.fillText('ELEMENT', w * elemRegion.x, h * elemRegion.y - 2);

    // Draw type region (blue)
    const typeRegion = this.config.typeIconRegion;
    ctx.strokeStyle = 'blue';
    ctx.strokeRect(
      w * typeRegion.x, h * typeRegion.y,
      w * typeRegion.w, h * typeRegion.h
    );
    ctx.fillStyle = 'blue';
    ctx.fillText('TYPE', w * typeRegion.x, h * typeRegion.y - 2);

    // Draw text region (green)
    const textRegion = this.config.textRegion;
    ctx.strokeStyle = 'lime';
    ctx.strokeRect(
      w * textRegion.x, h * textRegion.y,
      w * textRegion.w, h * textRegion.h
    );
    ctx.fillStyle = 'lime';
    ctx.fillText('TEXT/OCR', w * textRegion.x, h * textRegion.y - 2);

    // Draw border bounds info
    ctx.fillStyle = 'yellow';
    ctx.font = '14px monospace';
    ctx.fillText(`Bounds: L=${croppedData.bounds.left} T=${croppedData.bounds.top} R=${croppedData.bounds.right} B=${croppedData.bounds.bottom}`, 5, 16);
    ctx.fillText(`Border: RGB(${croppedData.borderColor.r}, ${croppedData.borderColor.g}, ${croppedData.borderColor.b})`, 5, 32);
  }
};

function confirmExtraction() {
  const modal = document.getElementById('extractionModal');

  // Get extracted values
  const rank = document.getElementById('extractedRank').value;
  const element = document.getElementById('extractedElement').value;
  const type = document.getElementById('extractedType').value;
  const conditionalSelect = document.getElementById('extractedConditionalMatch');

  // Populate the roster form
  document.getElementById('rosterName').value = '';
  document.getElementById('rosterRank').value = rank;
  document.getElementById('rosterElement').value = element;
  document.getElementById('rosterType').value = type;

  // Set conditional if matched
  if (conditionalSelect.value) {
    try {
      const matchedBonus = JSON.parse(conditionalSelect.value);
      selectRosterConditional(matchedBonus);
    } catch (e) {
      console.error('Failed to parse conditional:', e);
    }
  }

  // Close modal
  closeExtractionModal();

  // Scroll to form
  document.getElementById('rosterRank').scrollIntoView({ behavior: 'smooth', block: 'center' });
}

function closeExtractionModal() {
  document.getElementById('extractionModal').style.display = 'none';
}

// ============================================
// UTILITIES
// ============================================

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ============================================
// INITIALIZE
// ============================================

renderCharacterSelector();
renderBonusItems();
renderConditionalBonuses();
renderSavedLineups();
renderRoster();
initializeDiceFromRanks();
loadConfigFiles();
calculate();
ImageScanner.init();
