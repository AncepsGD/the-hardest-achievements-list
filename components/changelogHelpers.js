function getAchievementContext(achievement, allAchievements, index) {
  const below = index > 0 ? allAchievements[index - 1]?.name : null;
  const above = index < allAchievements.length - 1 ? allAchievements[index + 1]?.name : null;
  return { below, above };
}

function formatChangelogEntry(change, achievements, mode, idIndexMap, contextMap) {
  const { type, achievement, oldAchievement, oldRank, newRank, removedDuplicates, readdedAchievements, oldIndex, newIndex } = change;

  if (!achievement) return '';

  const name = achievement.name || 'Unknown';
  const rank = achievement.rank || '?';
  const allAchievements = achievements || [];

  let newIdx = -1;
  if (idIndexMap && achievement && achievement.id && idIndexMap.has(achievement.id)) {
    newIdx = idIndexMap.get(achievement.id);
  } else {
    newIdx = allAchievements.findIndex(a => a.id === achievement.id);
  }
  let context = { below: null, above: null };
  try {
    if (contextMap && achievement && achievement.id && contextMap.has(achievement.id)) {
      context = contextMap.get(achievement.id);
    } else if (newIdx >= 0) {
      context = getAchievementContext(achievement, allAchievements, newIdx);
      if (contextMap && achievement && achievement.id) {
        try { contextMap.set(achievement.id, context); } catch (e) { }
      }
    }
  } catch (e) {
    context = newIdx >= 0 ? getAchievementContext(achievement, allAchievements, newIdx) : { below: null, above: null };
  }
  const showOnlyOneContext = mode === 'dev';

  let entry = '';
  switch (type) {
    case 'added':
      entry = `<:added:1458440716400459837> **${name}** added at #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Below ${context.below}`;
        if (context.above) entry += `\n> Above ${context.above}`;
      }
      break;

    case 'removed':
      entry = `⛔ **${name}** removed from #${oldRank || rank}`;
      if (oldAchievement) {
        const oldContext = getAchievementContext(oldAchievement, achievements || [], oldIndex || 0);
        if (showOnlyOneContext) {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
        } else {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
          if (oldContext.above) entry += `\n> Formerly above ${oldContext.above}`;
        }
      }
      break;

    case 'movedUp':
      entry = `🔼 **${name}** moved up from #${oldRank} to #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Now below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Now below ${context.below}`;
        if (context.above) entry += `\n> Now above ${context.above}`;
      }
      break;

    case 'movedDown':
      entry = `🔽 **${name}** moved down from #${oldRank} to #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Now below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Now below ${context.below}`;
        if (context.above) entry += `\n> Now above ${context.above}`;
      }
      break;

    case 'swapped':
      {
        const a = achievement;
        const b = oldAchievement;
        const nameA = (a && a.name) ? a.name : 'Unknown';
        const nameB = (b && b.name) ? b.name : 'Unknown';
        const newA = (newRank != null) ? newRank : (a && a.rank) ? a.rank : '?';
        const newB = (change && change.newRankB != null) ? change.newRankB : (b && b.rank) ? b.rank : '?';
        entry = `:repeat: **${nameA}** swapped placement with **${nameB}**`;
        entry += `\n> Now ${nameA} is #${newA}`;
        entry += `\n> And ${nameB} is #${newB}`;
      }
      break;

    case 'renamed':
      entry = `⚪ ${oldAchievement?.name || 'Unknown'} updated to **${name}**`;
      break;

    case 'addedWithRemovals':
      entry = `<:updatedup:1375890567870812322> **${name}** added at #${rank}`;
      if (showOnlyOneContext) {
        if (context.below) entry += `\n> Now below ${context.below}`;
      } else {
        if (context.below) entry += `\n> Now below ${context.below}`;
        if (context.above) entry += `\n> Now above ${context.above}`;
      }
      if (removedDuplicates && removedDuplicates.length > 0) {
        entry += `\n>\n> Achievement(s) removed for redundancy:`;
        removedDuplicates.forEach(dup => {
          entry += `\n> ⛔ ${dup.name} (#${dup.rank})`;
        });
      }
      break;

    case 'removedWithReadds':
      entry = `<:updateddown:1375890556059783371> **${name}** removed from #${oldRank || rank}`;
      if (oldAchievement) {
        const oldContext = getAchievementContext(oldAchievement, achievements || [], oldIndex || 0);
        if (showOnlyOneContext) {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
        } else {
          if (oldContext.below) entry += `\n> Formerly below ${oldContext.below}`;
          if (oldContext.above) entry += `\n> Formerly above ${oldContext.above}`;
        }
      }
      if (readdedAchievements && readdedAchievements.length > 0) {
        entry += `\n>\n> Achievement(s) re-added due to renewed relevance:`;
        readdedAchievements.forEach(re => {
          entry += `\n> <:added:1458440716400459837> ${re.name} (#${re.rank})`;
        });
      }
      break;

    case 'timelineAdded':
      entry = `<:timelineadd:1458442225351393307> **${name}** added to the Timeline at ${achievement.date || 'Unknown date'}`;
      break;

    case 'timelineRemoved':
      entry = `<:timelineremove:1375894648383606945> **${name}** removed from the Timeline at ${achievement.date || 'Unknown date'}`;
      break;
  }

  return entry;
}

function generateChangelog(original, current, opts = {}) {
  const mode = opts.mode || '';
  const neighborContext = opts.contextMap || new Map();

  const byIdOriginal = new Map();
  original.forEach(a => { if (a && a.id) byIdOriginal.set(a.id, a); });
  const byIdCurrent = new Map();
  current.forEach(a => { if (a && a.id) byIdCurrent.set(a.id, a); });

  const changes = [];

  for (const [id, a] of byIdOriginal.entries()) {
    if (!byIdCurrent.has(id)) {
      const changeType = mode === 'timeline' ? 'timelineRemoved' : 'removed';
      changes.push({ type: changeType, achievement: a, oldAchievement: a, oldRank: a.rank });
    }
  }

  for (const [id, a] of byIdCurrent.entries()) {
    if (!byIdOriginal.has(id)) {
      const changeType = mode === 'timeline' ? 'timelineAdded' : 'added';
      changes.push({ type: changeType, achievement: a, newIndex: (a && a.rank) ? a.rank - 1 : null });
    }
  }

  for (const [id, orig] of byIdOriginal.entries()) {
    if (!byIdCurrent.has(id)) continue;
    const curr = byIdCurrent.get(id);
    if (!curr) continue;

    if ((orig.name || '') !== (curr.name || '')) {
      changes.push({ type: 'renamed', oldAchievement: orig, achievement: curr });
    }

    const oldRank = Number(orig.rank) || null;
    const newRank = Number(curr.rank) || null;
    if (mode !== 'timeline' && oldRank != null && newRank != null && oldRank !== newRank) {
      changes.push({ type: newRank < oldRank ? 'movedUp' : 'movedDown', achievement: curr, oldRank, newRank });
    }
  }

  function getLevelBase(name) {
    if (!name || typeof name !== 'string') return '';
    const parts = name.trim().split(/\s+/);
    if (parts.length <= 1) return name.toLowerCase();
    const lastPart = parts[parts.length - 1];
    if (lastPart.match(/^\d+(\s*\+\s*\d+)?%?$/)) {
      return parts.slice(0, -1).join(' ').toLowerCase();
    }
    return name.toLowerCase();
  }

  function areRelated(ach1, ach2) {
    if (!ach1 || !ach2) return false;

    const base1 = getLevelBase(ach1.name);
    const base2 = getLevelBase(ach2.name);
    const player1 = (ach1.player || '').toLowerCase().trim();
    const player2 = (ach2.player || '').toLowerCase().trim();

    if (base1 === base2 && player1 === player2 && player1) return true;

    if (base1 && base2 && (base1.includes(base2) || base2.includes(base1))) return true;

    return false;
  }

  const addedChanges = changes.filter(c => c && c.type === 'added');
  const removedChanges = changes.filter(c => c && c.type === 'removed');
  const suppressedIndices = new Set();
  const convertedToRenames = new Set();

  for (let i = 0; i < addedChanges.length; i++) {
    const addedChange = addedChanges[i];
    if (!addedChange.achievement) continue;

    for (let j = 0; j < removedChanges.length; j++) {
      if (suppressedIndices.has(j)) continue;
      const removedChange = removedChanges[j];
      if (!removedChange.achievement) continue;

      const sameRank = Number(addedChange.achievement.rank) === Number(removedChange.achievement.rank);

      if (sameRank && areRelated(addedChange.achievement, removedChange.achievement)) {
        const addIdx = changes.indexOf(addedChange);
        if (addIdx !== -1) {
          changes[addIdx] = {
            type: 'renamed',
            oldAchievement: removedChange.achievement,
            achievement: addedChange.achievement
          };
          convertedToRenames.add(addIdx);
        }
        suppressedIndices.add(j);
        break;
      }
    }
  }

  for (let i = 0; i < addedChanges.length; i++) {
    const addedChange = addedChanges[i];
    if (!addedChange.achievement || convertedToRenames.has(changes.indexOf(addedChange))) continue;

    const related = [];
    for (let j = 0; j < removedChanges.length; j++) {
      if (suppressedIndices.has(j)) continue;
      const removedChange = removedChanges[j];
      if (!removedChange.achievement) continue;

      const sameRank = Number(addedChange.achievement.rank) === Number(removedChange.achievement.rank);

      if (sameRank) continue;

      if (areRelated(addedChange.achievement, removedChange.achievement)) {
        related.push(j);
      }
    }

    if (related.length > 0) {
      const changeIdx = changes.indexOf(addedChange);
      if (changeIdx !== -1) {
        changes[changeIdx] = {
          ...addedChange,
          type: 'addedWithRemovals',
          removedDuplicates: related.map(idx => removedChanges[idx].achievement)
        };
        related.forEach(idx => suppressedIndices.add(idx));
      }
    }
  }

  for (let j = 0; j < removedChanges.length; j++) {
    if (suppressedIndices.has(j)) continue;
    const removedChange = removedChanges[j];
    if (!removedChange.achievement) continue;

    const related = [];
    for (let i = 0; i < addedChanges.length; i++) {
      const addedChange = addedChanges[i];
      if (!addedChange.achievement) continue;
      if (addedChange.type === 'addedWithRemovals') continue;
      if (convertedToRenames.has(changes.indexOf(addedChange))) continue;

      const sameRank = Number(removedChange.achievement.rank) === Number(addedChange.achievement.rank);

      if (sameRank) continue;

      if (areRelated(addedChange.achievement, removedChange.achievement)) {
        related.push(addedChange);
      }
    }

    if (related.length > 0) {
      const changeIdx = changes.indexOf(removedChange);
      if (changeIdx !== -1) {
        changes[changeIdx] = {
          ...removedChange,
          type: 'removedWithReadds',
          readdedAchievements: related.map(c => c.achievement)
        };
      }
    }
  }

  const changesList = changes.filter((c, idx) => {
    if (!c) return false;
    const removedIdx = removedChanges.indexOf(c);
    if (removedIdx !== -1 && suppressedIndices.has(removedIdx)) return false;
    return true;
  });

  const addedPositions = changesList.filter(c => c && (c.type === 'added' || c.type === 'addedWithRemovals') && c.achievement && c.achievement.rank).map(c => Number(c.achievement.rank));
  const removedRanks = changesList.filter(c => c && (c.type === 'removed' || c.type === 'removedWithReadds')).map(c => Number(c.oldRank || 0));

  const readdedPositions = [];
  const removedDuplicateRanks = [];
  changesList.forEach(c => {
    if (c && c.type === 'removedWithReadds' && c.readdedAchievements) {
      c.readdedAchievements.forEach(a => { if (a && a.rank) readdedPositions.push(Number(a.rank)); });
    }
    if (c && c.type === 'addedWithRemovals' && c.removedDuplicates) {
      c.removedDuplicates.forEach(a => { if (a && a.rank) removedDuplicateRanks.push(Number(a.rank)); });
    }
  });

  const allAddedPositions = [...addedPositions, ...readdedPositions];
  const allRemovedRanks = [...removedRanks, ...removedDuplicateRanks];

  const moveChanges = changesList.filter(c => c && (c.type === 'movedUp' || c.type === 'movedDown'));
  const suppressedIds = new Set();
  const swappedIds = new Set();

  for (let i = 0; i < moveChanges.length; i++) {
    const a = moveChanges[i];
    if (!a || !a.achievement) continue;
    for (let j = i + 1; j < moveChanges.length; j++) {
      const b = moveChanges[j];
      if (!b || !b.achievement) continue;
      if (a.oldRank === b.newRank && a.newRank === b.oldRank) {
        swappedIds.add(a.achievement.id);
        swappedIds.add(b.achievement.id);
      }
    }
  }

  if (allAddedPositions && allAddedPositions.length) {
    for (const m of moveChanges) {
      if (!m || !m.achievement || m.type !== 'movedDown') continue;
      if (swappedIds.has(m.achievement.id)) continue;
      const oldR = Number(m.oldRank) || 0;
      const newR = Number(m.newRank) || 0;
      const delta = newR - oldR;
      if (delta === 1) {
        const causedByAddition = allAddedPositions.some(pos => { const addPos = Number(pos); return addPos <= newR; });
        if (causedByAddition) suppressedIds.add(m.achievement.id);
      }
    }
  }

  if (allRemovedRanks && allRemovedRanks.length) {
    for (const m of moveChanges) {
      if (!m || !m.achievement || m.type !== 'movedUp') continue;
      if (swappedIds.has(m.achievement.id)) continue;
      const oldR = Number(m.oldRank) || 0;
      const newR = Number(m.newRank) || 0;
      const delta = oldR - newR;
      if (delta === 1) {
        const causedByRemoval = allRemovedRanks.some(pos => { const remPos = Number(pos); return remPos <= oldR; });
        if (causedByRemoval) suppressedIds.add(m.achievement.id);
      }
    }
  }

  if (moveChanges && moveChanges.length) {
    const movesMap = new Map();
    moveChanges.forEach(m => {
      if (!m || !m.achievement) return;
      const id = m.achievement.id;
      movesMap.set(id, {
        oldRank: Number(m.oldRank) || null,
        newRank: Number(m.newRank) || null,
        type: m.type,
        achievement: m.achievement
      });
    });

    for (const [id, mv] of movesMap.entries()) {
      if (!mv || mv.oldRank == null || mv.newRank == null) continue;
      const delta = mv.newRank - mv.oldRank;
      if (delta === 0) continue;
      if (delta < 0) {
        const low = mv.newRank;
        const high = mv.oldRank - 1;
        for (const [otherId, other] of movesMap.entries()) {
          if (otherId === id) continue;
          if (suppressedIds.has(otherId)) continue;
          if (other.oldRank === mv.newRank && other.newRank === mv.oldRank) continue;
          if (other.oldRank >= low && other.oldRank <= high && (other.newRank === other.oldRank + 1)) {
            suppressedIds.add(otherId);
          }
        }
      } else {
        const low = mv.oldRank + 1;
        const high = mv.newRank;
        for (const [otherId, other] of movesMap.entries()) {
          if (otherId === id) continue;
          if (suppressedIds.has(otherId)) continue;
          if (other.oldRank === mv.newRank && other.newRank === mv.oldRank) continue;
          if (other.oldRank >= low && other.oldRank <= high && (other.newRank === other.oldRank - 1)) {
            suppressedIds.add(otherId);
          }
        }
      }
    }
  }

  for (let i = 0; i < moveChanges.length; i++) {
    const a = moveChanges[i];
    if (!a || !a.achievement || suppressedIds.has(a.achievement.id)) continue;
    for (let j = i + 1; j < moveChanges.length; j++) {
      const b = moveChanges[j];
      if (!b || !b.achievement || suppressedIds.has(b.achievement.id)) continue;
      if (a.oldRank === b.newRank && a.newRank === b.oldRank) {
        if (a.type === 'movedUp' && b.type === 'movedDown') suppressedIds.add(b.achievement.id);
        else if (b.type === 'movedUp' && a.type === 'movedDown') suppressedIds.add(a.achievement.id);
      }
    }
  }

  const baseList = current;
  const filteredChanges = changesList.filter(c => {
    if (!c) return false;
    if (mode === 'timeline' && (c.type === 'movedUp' || c.type === 'movedDown' || c.type === 'swapped')) return false;
    if ((c.type === 'movedUp' || c.type === 'movedDown') && c.achievement && suppressedIds.has(c.achievement.id)) return false;
    return true;
  });

  const finalChanges = [...filteredChanges];
  {
    const used = new Set();
    const collapsed = [];
    for (let i = 0; i < finalChanges.length; i++) {
      if (used.has(i)) continue;
      const a = finalChanges[i];
      if (!a || !(a.type === 'movedUp' || a.type === 'movedDown') || !a.achievement) {
        collapsed.push(a);
        used.add(i);
        continue;
      }
      let found = -1;
      for (let j = i + 1; j < finalChanges.length; j++) {
        if (used.has(j)) continue;
        const b = finalChanges[j];
        if (!b || !(b.type === 'movedUp' || b.type === 'movedDown') || !b.achievement) continue;
        if (a.oldRank === b.newRank && a.newRank === b.oldRank) {
          found = j;
          break;
        }
      }
      if (found !== -1) {
        const b = finalChanges[found];
        const swap = {
          type: 'swapped',
          achievement: a.achievement,
          oldAchievement: b.achievement,
          oldRank: a.oldRank,
          newRank: a.newRank,
          newRankB: b.newRank,
          oldRankB: b.oldRank
        };
        collapsed.push(swap);
        used.add(i);
        used.add(found);
      } else {
        collapsed.push(a);
        used.add(i);
      }
    }
    for (let k = 0; k < finalChanges.length; k++) {
      if (!used.has(k)) collapsed.push(finalChanges[k]);
    }
    finalChanges.length = 0;
    for (const it of collapsed) finalChanges.push(it);
  }

  for (let i = 0; i < finalChanges.length; i++) {
    const x = finalChanges[i];
    if (!x || !(x.type === 'movedUp' || x.type === 'movedDown') || !x.achievement) continue;
    for (let j = i + 1; j < finalChanges.length; j++) {
      const y = finalChanges[j];
      if (!y || !(y.type === 'movedUp' || y.type === 'movedDown') || !y.achievement) continue;
      if (x.oldRank === y.newRank && x.newRank === y.oldRank) {
        if (x.type === 'movedUp' && y.type === 'movedDown') {
          finalChanges.splice(j, 1);
          j--;
        } else if (y.type === 'movedUp' && x.type === 'movedDown') {
          finalChanges.splice(i, 1);
          i--;
          break;
        }
      }
    }
  }

  // build idIndexMap
  const idIndexMap = new Map();
  (baseList || []).forEach((a, i) => { if (a && a.id) idIndexMap.set(a.id, i); });

  const formatted = finalChanges.map(c => formatChangelogEntry(c, baseList, mode, idIndexMap, neighborContext)).filter(s => s && s.trim()).join('\n\n');

  const previewEntries = finalChanges.length > 20 ? finalChanges.map(c => formatChangelogEntry(c, baseList, mode, idIndexMap, neighborContext)).filter(s => s && s.trim()) : null;

  return { formatted, previewEntries, finalChanges, idIndexMap };
}

export { generateChangelog, formatChangelogEntry };

function _ensureRanks(arr) {
  if (!Array.isArray(arr)) return arr;
  for (let i = 0; i < arr.length; i++) {
    const a = arr[i];
    if (a) a.rank = i + 1;
  }
  return arr;
}

function moveUp(list, realIdx) {
  const arr = Array.isArray(list) ? list.slice() : [];
  const len = arr.length;
  if (realIdx <= 0 || realIdx >= len) return list;
  const [removed] = arr.splice(realIdx, 1);
  arr.splice(realIdx - 1, 0, removed);
  return _ensureRanks(arr);
}

function moveDown(list, realIdx) {
  const arr = Array.isArray(list) ? list.slice() : [];
  const len = arr.length;
  if (realIdx < 0 || realIdx >= len - 1) return list;
  const [removed] = arr.splice(realIdx, 1);
  arr.splice(realIdx + 1, 0, removed);
  return _ensureRanks(arr);
}

function removeAt(list, realIdx) {
  const arr = Array.isArray(list) ? list.slice() : [];
  if (realIdx < 0 || realIdx >= arr.length) return list;
  arr.splice(realIdx, 1);
  return _ensureRanks(arr);
}

function duplicateAt(list, realIdx, opts = {}) {
  const idGen = (opts && typeof opts.idGenerator === 'function') ? opts.idGenerator : (() => `new-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  const enhancer = opts && typeof opts.enhancer === 'function' ? opts.enhancer : null;
  const arr = Array.isArray(list) ? list.slice() : [];
  if (realIdx < 0 || realIdx >= arr.length) return list;
  const orig = arr[realIdx] || {};
  const uniqueSuffix = idGen();
  const newId = (orig && orig.id) ? `${orig.id}-copy-${uniqueSuffix}` : uniqueSuffix;
  const copy = { ...orig, id: newId };
  const final = enhancer ? enhancer(copy) : copy;
  arr.splice(realIdx + 1, 0, final);
  return _ensureRanks(arr);
}

export { moveUp, moveDown, removeAt, duplicateAt };
