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

// ============================================
// DATA STORAGE
// ============================================

// Load from localStorage or use defaults (with fallback for environments where localStorage doesn't work)
let bonusItems = [];
let conditionalBonuses = [];
let savedLineups = [];

let familiarRoster = [];

try {
  bonusItems = JSON.parse(localStorage.getItem('bonusItems')) || [];
  conditionalBonuses = JSON.parse(localStorage.getItem('conditionalBonuses')) || [];
  savedLineups = JSON.parse(localStorage.getItem('savedLineups')) || [];
  familiarRoster = JSON.parse(localStorage.getItem('familiarRoster')) || [];
} catch (e) {
  console.log('localStorage not available, using in-memory storage');
  bonusItems = [];
  conditionalBonuses = [];
  savedLineups = [];
  familiarRoster = [];
}

function saveData() {
  try {
    localStorage.setItem('bonusItems', JSON.stringify(bonusItems));
    localStorage.setItem('conditionalBonuses', JSON.stringify(conditionalBonuses));
    localStorage.setItem('savedLineups', JSON.stringify(savedLineups));
    localStorage.setItem('familiarRoster', JSON.stringify(familiarRoster));
  } catch (e) {
    // localStorage not available, data will persist only during session
  }
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
  if (!query) { resultsContainer.style.display = 'none'; return; }

  const allBonuses = configConditionalBonuses.bonuses || [];
  const matches = allBonuses.filter(b => {
    if (b.rarity !== selectedRank) return false;
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
  const rank = document.getElementById('rosterRank').value;
  const element = document.getElementById('rosterElement').value;
  const type = document.getElementById('rosterType').value;

  if (editingFamiliarId !== null) {
    // Update existing familiar
    const index = familiarRoster.findIndex(f => f.id === editingFamiliarId);
    if (index !== -1) {
      familiarRoster[index] = {
        id: editingFamiliarId,
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
      rank,
      element,
      type,
      conditional: selectedRosterConditional ? { ...selectedRosterConditional } : null
    };
    familiarRoster.push(familiar);
  }

  saveData();
  renderRoster();

  // Clear conditional selection
  clearRosterConditional();
}

function editFamiliar(id) {
  const familiar = familiarRoster.find(f => f.id === id);
  if (!familiar) return;

  // Populate form with familiar data
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

function renderRoster() {
  const container = document.getElementById('rosterList');
  const countEl = document.getElementById('rosterCount');

  countEl.textContent = `${familiarRoster.length} familiar${familiarRoster.length !== 1 ? 's' : ''} in roster`;

  if (familiarRoster.length === 0) {
    container.innerHTML = '<div style="color: #666; padding: 10px; grid-column: 1/-1;">No familiars in roster yet. Add your familiars above.</div>';
    return;
  }

  container.innerHTML = familiarRoster.map(fam => {
    const displayName = `${fam.element} ${fam.type}`;
    const elementClass = `element-${fam.element.toLowerCase()}`;
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

    return `
      <div class="roster-item ${elementClass}">
        <div class="roster-item-header">
          <span class="roster-item-name">${escapeHtml(displayName)}</span>
          <span class="roster-item-rank ${rankClass}">${fam.rank}</span>
        </div>
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

function getAllLibraryBonuses() {
  return configConditionalBonuses.bonuses || [];
}

function toggleOptimizerHelp() {
  const content = document.getElementById('optimizerHelpContent');
  content.style.display = content.style.display === 'none' ? 'block' : 'none';
}

function runOptimizer() {
  const resultsContainer = document.getElementById('optimizerResults');

  // Get filter values
  const filterElement = document.getElementById('filterElement')?.value || '';
  const filterType = document.getElementById('filterType')?.value || '';
  const requireMatch = document.getElementById('filterRequireMatch')?.checked || false;

  if (familiarRoster.length < 3) {
    resultsContainer.innerHTML = `
      <div class="optimizer-error">
        Add at least 3 familiars to your roster first!
      </div>
    `;
    return;
  }

  // Generate all combinations
  let combinations = generateCombinations(familiarRoster, 3);

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

  // Find best lineups for each strategy (only using familiars' own conditionals)
  const bestOverall = findBestOverall(combinations, []);
  const bestLow = findBestForLowRolls(combinations, []);
  const bestHigh = findBestForHighRolls(combinations, []);

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
        const multStr = breakdown.multiplierContribution && breakdown.multiplierContribution !== 0 && breakdown.multiplierContribution !== 1 ? `x${breakdown.multiplierContribution}` : '';
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

      return `
        <div class="lineup-familiar ${elementClass} ${matchClass}">
          ${(matchesElement || matchesType) ? `<div class="match-badges">${matchBadges}</div>` : ''}
          <div class="lineup-familiar-element">${fam.element}</div>
          <div class="lineup-familiar-type">${fam.type}</div>
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
              const multStr = b.multiplierContribution && b.multiplierContribution !== 0 && b.multiplierContribution !== 1 ? `x${b.multiplierContribution}` : '';
              return `
                <div class="breakdown-row">
                  <span class="breakdown-source">${b.element} ${b.type}:</span>
                  <span class="breakdown-values">${flatStr}${flatStr && multStr ? ', ' : ''}${multStr}</span>
                </div>
              `;
            }).join('')}
            <div class="breakdown-totals">
              <span>Total: +${result.totalFlat} flat${result.totalMult ? `, x${result.totalMult}` : ''}</span>
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
        <button class="use-lineup-btn" onclick="useOptimizedLineup(${JSON.stringify(result.familiars).replace(/"/g, '&quot;')})">Use This Lineup</button>
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

  // Add familiars' conditionals to active conditionals (avoid duplicates)
  familiars.forEach(fam => {
    if (fam.conditional) {
      const exists = conditionalBonuses.some(c => c.name === fam.conditional.name && c.condition === fam.conditional.condition);
      if (!exists) {
        conditionalBonuses.push({
          name: fam.conditional.name,
          flatBonus: fam.conditional.flatBonus || 0,
          multiplierBonus: fam.conditional.multiplierBonus || 1,
          condition: fam.conditional.condition
        });
      }
    }
  });
  saveData();
  renderConditionalBonuses();

  // Update dice options and recalculate
  for (let i = 1; i <= 3; i++) {
    updateDiceOptions(i);
  }
  calculate();

  // Scroll to results
  document.getElementById('finalResult').scrollIntoView({ behavior: 'smooth' });
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
  if (!query) { resultsContainer.style.display = 'none'; return; }

  // Use pre-flattened bonuses array from loadConfigFiles
  const allBonuses = configConditionalBonuses.bonuses || [];
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
    container.innerHTML = '<div style="color: #666; padding: 10px;">No saved lineups yet. Enter a name and click "Save Current Lineup" to save your first lineup.</div>';
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
renderRoster();
initializeDiceFromRanks();
loadConfigFiles();
calculate();
