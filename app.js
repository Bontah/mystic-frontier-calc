// ============================================
// DATA STORAGE
// ============================================

// Load from localStorage or use defaults (with fallback for environments where localStorage doesn't work)
let bonusItems = [];
let conditionalBonuses = [];
let savedLineups = [];

try {
  bonusItems = JSON.parse(localStorage.getItem('bonusItems')) || [];
  conditionalBonuses = JSON.parse(localStorage.getItem('conditionalBonuses')) || [];
  savedLineups = JSON.parse(localStorage.getItem('savedLineups')) || [];
} catch (e) {
  console.log('localStorage not available, using in-memory storage');
  bonusItems = [];
  conditionalBonuses = [];
  savedLineups = [];
}

function saveData() {
  try {
    localStorage.setItem('bonusItems', JSON.stringify(bonusItems));
    localStorage.setItem('conditionalBonuses', JSON.stringify(conditionalBonuses));
    localStorage.setItem('savedLineups', JSON.stringify(savedLineups));
  } catch (e) {
    // localStorage not available, data will persist only during session
  }
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
    const tagMatch = item.tags && item.tags.some(tag => tag.toLowerCase().includes(query));
    return nameMatch || tagMatch;
  });

  if (matches.length === 0) {
    resultsContainer.innerHTML = '<div style="padding: 10px; color: #666;">No items found</div>';
  } else {
    resultsContainer.innerHTML = matches.map(item => {
      const flatStr = item.flatBonus !== 0 ? '<span class="flat' + (item.flatBonus < 0 ? ' negative' : '') + '">' + (item.flatBonus >= 0 ? '+' : '') + item.flatBonus + '</span>' : '';
      const multStr = item.multiplierBonus && item.multiplierBonus !== 0 ? '<span class="mult">x' + item.multiplierBonus + '</span>' : '';
      const tagsStr = item.tags ? item.tags.join(', ') : '';
      return '<div class="config-item" onclick="applyBonusItem(' + JSON.stringify(item).replace(/"/g, "&quot;") + ')"><div class="config-item-info"><div class="config-item-name">' + escapeHtml(item.name) + '</div><div class="config-item-stats">' + flatStr + (flatStr && multStr ? ', ' : '') + multStr + '</div><div class="config-item-tags">' + tagsStr + '</div></div><button class="apply-btn" onclick="event.stopPropagation()">Apply</button></div>';
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
  if (!query) { resultsContainer.style.display = 'none'; return; }

  // Flatten all categories into a single array with rarity and color
  let allBonuses = [];
  const categories = configConditionalBonuses.categories || {};
  for (const [rarity, data] of Object.entries(categories)) {
    for (const bonus of (data.bonuses || [])) {
      allBonuses.push({ ...bonus, rarity: rarity, color: data.color });
    }
  }
  const matches = allBonuses.filter(b => {
    return b.name.toLowerCase().includes(query) || b.condition.toLowerCase().includes(query) || b.rarity.toLowerCase().includes(query);
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
// MONSTER RANK DICE SYSTEM
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

function updateDiceOptions(monsterIndex) {
  const rank = document.getElementById(`monster${monsterIndex}Rank`).value;
  const maxDice = getMaxDiceForRank(rank);
  const diceSelect = document.getElementById(`dice${monsterIndex}`);
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

function onRankChange(monsterIndex) {
  updateDiceOptions(monsterIndex);
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
          <div style="color: #666; font-size: 12px; font-family: monospace; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(cond.condition)}</div>
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
    const testMonsters = [
      { type: 'Human', element: 'None' },
      { type: 'Human', element: 'None' },
      { type: 'Human', element: 'None' }
    ];
    const testFn = new Function('dice', 'monsters', `return ${condition}`);
    testFn(testDice, testMonsters);
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
    container.innerHTML = '<div style="color: #666; padding: 10px;">No saved lineups yet. Enter a name and click "Save Current Lineup" to save your first lineup.</div>';
    return;
  }

  container.innerHTML = savedLineups.map((lineup, index) => {
    // Build monster summary
    const monsterSummary = lineup.monsters.map((m, i) =>
      `M${i + 1}: ${m.rank} ${m.type}${m.element !== 'None' ? ' (' + m.element + ')' : ''}`
    ).join(' | ');

    const condCount = lineup.conditionalBonuses.length;
    const condText = condCount === 1 ? '1 conditional' : `${condCount} conditionals`;

    return `
      <div class="saved-lineup-item">
        <div class="lineup-info">
          <div class="lineup-name">${escapeHtml(lineup.name)}</div>
          <div class="lineup-details">
            <span class="lineup-detail-item">${monsterSummary}</span>
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

  // Get current monster configuration
  const monsters = [
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
    monsters,
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

  // Load monster configuration
  for (let i = 0; i < 3; i++) {
    const m = lineup.monsters[i];
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

function simulateResultDetailed(testDice, monsters, activeBonusItems) {
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
      const condFn = new Function('dice', 'monsters', `return ${cond.condition}`);
      isActive = condFn(testDice, monsters);
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

function calculateRerollSuggestions(dice, monsters, activeBonusItems, difficulty, currentResult) {
  const suggestions = [];

  for (let dieIndex = 0; dieIndex < 3; dieIndex++) {
    const currentValue = dice[dieIndex];
    const passingValues = [];

    // Get max dice value based on monster rank
    const maxDice = getMaxDiceForRank(monsters[dieIndex].rank);

    // Test all possible values for this die (1 to maxDice based on rank)
    for (let testValue = 1; testValue <= maxDice; testValue++) {
      const testDice = [...dice];
      testDice[dieIndex] = testValue;

      const result = simulateResultDetailed(testDice, monsters, activeBonusItems);

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
      rank: monsters[dieIndex].rank
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

  const monsters = [
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

  return { dice, monsters, activeBonusItems, difficulty };
}

function calculate() {
  const { dice, monsters, activeBonusItems, difficulty } = getState();

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
      const condFn = new Function('dice', 'monsters', `return ${cond.condition}`);
      isActive = condFn(dice, monsters);
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
      const condFn = new Function('dice', 'monsters', `return ${cond.condition}`);
      isActive = condFn(dice, monsters);
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
  const rerollSuggestions = calculateRerollSuggestions(dice, monsters, activeBonusItems, difficulty, finalResult);
  renderRerollSuggestions(rerollSuggestions, passed, difficulty);
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

renderBonusItems();
renderConditionalBonuses();
renderSavedLineups();
initializeDiceFromRanks();
loadConfigFiles();
calculate();
