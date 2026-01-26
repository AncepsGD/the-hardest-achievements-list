import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { FixedSizeList as ListWindow } from 'react-window';
import { CopyIcon, FileIcon, CheckIcon, NewIcon, ChangelogIcon, ResetIcon, CollapseUpIcon, CollapseDownIcon } from './DevIcons';
import { generateChangelog } from './changelogHelpers';
const shallowEqual = (a, b) => {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return a === b;
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }
  const aKeys = Object.keys(a);
  const bKeys = Object.keys(b);
  if (aKeys.length !== bKeys.length) return false;
  for (let k of aKeys) if (a[k] !== b[k]) return false;
  return true;
};
const COMPACT_DEVMODE_BTN = { fontSize: 12, padding: '4px 6px', borderRadius: 4, cursor: 'pointer', margin: 0, pointerEvents: 'auto' };

const DevToolbar = React.memo(function DevToolbar({
  devMode,
  handleCopyJson,
  handleCheckDuplicateThumbnails,
  onImportAchievementsJson,
  handleShowNewForm,
  generateAndCopyChangelog,
  resetChanges,
}) {
  if (!devMode) return null;
  const [collapsed, setCollapsed] = useState(false);
  const handleToggleCollapsed = useCallback(() => setCollapsed(c => !c), []);
  const icons = {
    copy: <CopyIcon width={16} height={16} />,
    file: <FileIcon width={16} height={16} />,
    check: <CheckIcon width={16} height={16} />,
    new: <NewIcon width={16} height={16} />,
    changelog: <ChangelogIcon width={16} height={16} />,
    reset: <ResetIcon width={16} height={16} />,
    collapse: collapsed ? <CollapseDownIcon width={14} height={14} /> : <CollapseUpIcon width={14} height={14} />
  };

  if (collapsed) {
    return (
      <div className="devmode-floating-panel" style={{ padding: 6, fontSize: 13, display: 'flex', gap: 6, alignItems: 'center' }}>
        <button title="Toggle dev toolbar" aria-label="Toggle dev toolbar" onClick={handleToggleCollapsed} style={COMPACT_DEVMODE_BTN}>{icons.collapse}</button>
        <button title="Copy .json" aria-label="Copy .json" onClick={handleCopyJson} style={COMPACT_DEVMODE_BTN}>{icons.copy}</button>
      </div>
    );
  }

  return (
    <div className="devmode-floating-panel" style={{ padding: 6, fontSize: 12 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span className="devmode-title" style={{ fontSize: 12, marginRight: 8 }}>Developer Mode Enabled (SHIFT+M)</span>
        <button title="Toggle dev toolbar" aria-label="Toggle dev toolbar" onClick={handleToggleCollapsed} style={COMPACT_DEVMODE_BTN}>{icons.collapse}</button>
      </div>
      <div className="devmode-btn-row" style={{ gap: 6, display: 'flex', flexWrap: 'wrap', alignItems: 'center', marginTop: 6 }}>
        <button className="devmode-btn" onClick={handleCopyJson} style={COMPACT_DEVMODE_BTN}><span style={{ marginRight: 6 }}>{icons.copy}</span>Copy .json</button>

        <label className="devmode-btn" style={{ ...COMPACT_DEVMODE_BTN, display: 'inline-flex', alignItems: 'center', gap: 6, cursor: 'pointer' }}>
          <span style={{ lineHeight: 1 }}>{icons.file} Import .json</span>
          <input
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            onChange={e => {
              const file = e.target.files && e.target.files[0];
              if (!file) return;
              const reader = new FileReader();
              reader.onload = evt => {
                try {
                  const json = JSON.parse(evt.target.result);
                  if (typeof onImportAchievementsJson === 'function') onImportAchievementsJson(json);
                } catch (err) {
                  alert('Invalid achievements.json file.');
                }
              };
              reader.readAsText(file);
              e.target.value = '';
            }}
          />
        </label>
        <button className="devmode-btn" onClick={handleCheckDuplicateThumbnails} style={COMPACT_DEVMODE_BTN}><span style={{ marginRight: 6 }}>{icons.check}</span>Dupe Img Check</button>
        <button className="devmode-btn" onClick={handleShowNewForm} style={COMPACT_DEVMODE_BTN}><span style={{ marginRight: 6 }}>{icons.new}</span>Create</button>
        <button className="devmode-btn" onClick={generateAndCopyChangelog} style={COMPACT_DEVMODE_BTN}>
          <span style={{ marginRight: 6 }}>{icons.changelog}</span>Changelog
        </button>
        <button className="devmode-btn" onClick={resetChanges} style={COMPACT_DEVMODE_BTN}>
          <span style={{ marginRight: 6 }}>{icons.reset}</span>Reset
        </button>
      </div>
    </div>
  );
}, (p, n) => p.devMode === n.devMode && p.handleCopyJson === n.handleCopyJson && p.handleShowNewForm === n.handleShowNewForm);

const TAG_BUTTON_BASE = { fontSize: 11, padding: '3px 6px', border: '1px solid #ccc', borderRadius: 3, cursor: 'pointer' };
const TAG_PILL_STYLE = { display: 'inline-block', background: '#ddd', padding: '2px 6px', margin: '2px', borderRadius: 4, cursor: 'pointer' };
const TagButton = React.memo(function TagButton({ tag, selected, onToggle }) {
  const handleClick = useCallback(() => onToggle(tag), [onToggle, tag]);
  const style = useMemo(() => ({ ...TAG_BUTTON_BASE, backgroundColor: selected ? '#007bff' : '#eee', color: selected ? '#fff' : '#222' }), [selected]);
  return (
    <button type="button" onClick={handleClick} style={style}>{tag}</button>
  );
}, (p, n) => p.tag === n.tag && p.selected === n.selected && p.onToggle === n.onToggle);

const TagPill = React.memo(function TagPill({ tag, onRemove }) {
  const handleClick = useCallback(() => onRemove(tag), [onRemove, tag]);
  return (
    <span onClick={handleClick} style={TAG_PILL_STYLE} title="Click to remove">{tag}</span>
  );
}, (p, n) => p.tag === n.tag && p.onRemove === n.onRemove);

const CandidateButton = React.memo(function CandidateButton({ p, onSelect }) {
  const handleClick = useCallback(() => onSelect && onSelect(p), [onSelect, p]);
  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        padding: '8px',
        background: 'transparent',
        border: 'none',
        textAlign: 'left',
        cursor: 'pointer',
        color: 'var(--text-color)'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        <strong style={{ fontSize: 14 }}>{p.name}</strong>
        <span style={{ fontSize: 12, color: '#aaa' }}>{p.player || ''} {p.id ? `— ${p.id}` : ''}</span>
      </div>
      <div style={{ fontSize: 12, color: '#999' }}>{p.levelID ? `L:${p.levelID}` : ''}</div>
    </button>
  );
}, (prevProps, nextProps) => {
  const prevP = prevProps.p;
  const nextP = nextProps.p;
  const sameP = prevP && nextP ? prevP.id === nextP.id : prevP === nextP;
  return sameP && prevProps.onSelect === nextProps.onSelect;
});
const PreviewBox = React.memo(function PreviewBox({ content }) {
  return (
    <div className="devmode-preview-box">
      <strong>Preview:</strong>
      <br />
      {JSON.stringify(content, null, 2)}
    </div>
  );
}, (p, n) => shallowEqual(p.content, n.content));
const PasteSearchBox = React.memo(function PasteSearchBox({ pasteSearch, setPasteSearch, pasteShowResults, setPasteShowResults, pasteCandidates, handlePasteSelect }) {
  const containerRef = useRef(null);
  const Row = useCallback(({ index, style }) => {
    const p = pasteCandidates[index];
    return (
      <div style={style}>
        <CandidateButton key={p && p.id ? p.id : `p-${index}`} p={p} onSelect={handlePasteSelect} />
      </div>
    );
  }, [pasteCandidates, handlePasteSelect]);

  return (
    <div style={{ marginTop: 8, marginBottom: 6 }}>
      <label style={{ color: 'var(--muted, #DFE3F5)', fontSize: 13, display: 'block', marginBottom: 4 }}>Paste from previous achievements</label>
      <input
        type="text"
        placeholder="Search previous achievements by name, player, id, or levelID..."
        value={pasteSearch}
        onChange={e => { setPasteSearch(e.target.value); setPasteShowResults(true); }}
        aria-label="Paste from previous achievements"
        className="search-input"
        style={{ width: '100%' }}
      />
      {pasteShowResults && pasteSearch && (
        <div ref={containerRef} style={{ maxHeight: 240, overflowY: 'auto', background: 'var(--secondary-bg, #232323)', border: '1px solid var(--hover-bg)', borderRadius: 6, padding: 8, marginTop: 6 }}>
          {pasteCandidates.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13 }}>No matches</div>
          ) : (
            pasteCandidates.length > 20 ? (
              <ListWindow
                height={Math.min(240, pasteCandidates.length * 48)}
                itemCount={pasteCandidates.length}
                itemSize={48}
                width={'100%'}
              >
                {Row}
              </ListWindow>
            ) : (
              pasteCandidates.map((p, i) => (
                <CandidateButton key={p && p.id ? p.id : `p-${i}`} p={p} onSelect={handlePasteSelect} />
              ))
            )
          )}
        </div>
      )}
    </div>
  );
}, (p, n) => p.pasteSearch === n.pasteSearch && p.pasteShowResults === n.pasteShowResults && shallowEqual(p.pasteCandidates, n.pasteCandidates));
const EditFormPanel = React.memo(function EditFormPanel({
  editForm,
  editFormTags,
  editFormCustomTags,
  AVAILABLE_TAGS,
  handleEditFormChange,
  handleEditFormTagClick,
  handleEditFormCustomTagsChange,
  handleEditFormSave,
  handleEditFormCancel,
  editFormPreviewObj,
}) {
  if (!editForm) return null;
  return (
    <div className="devmode-form-panel">
      <h3 className="devmode-form-title">Edit Achievement</h3>
      <form onSubmit={e => { e.preventDefault(); handleEditFormSave(); }} autoComplete="off">
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Name<input type="text" name="name" value={editForm.name || ''} onChange={handleEditFormChange} required placeholder="Naracton Diablo X 99%" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>ID<input type="text" name="id" value={editForm.id || ''} onChange={handleEditFormChange} required placeholder="naracton-diablo-x-99" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Player<input type="text" name="player" value={editForm.player || ''} onChange={handleEditFormChange} placeholder="Zoink" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Tags
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {AVAILABLE_TAGS.length > 20 ? (
              <div style={{ width: '100%', height: 160 }}>
                <ListWindow height={160} itemCount={AVAILABLE_TAGS.length} itemSize={34} width={'100%'}>
                  {({ index, style }) => {
                    const tag = AVAILABLE_TAGS[index];
                    return (
                      <div style={{ ...style, display: 'inline-block', paddingRight: 6 }}>
                        <TagButton key={tag} tag={tag} selected={editFormTags.includes(tag)} onToggle={handleEditFormTagClick} />
                      </div>
                    );
                  }}
                </ListWindow>
              </div>
            ) : (
              AVAILABLE_TAGS.map(tag => (
                <TagButton key={tag} tag={tag} selected={editFormTags.includes(tag)} onToggle={handleEditFormTagClick} />
              ))
            )}
          </div>
          <input type="text" value={editFormCustomTags} onChange={handleEditFormCustomTagsChange} placeholder="Or type custom tags separated by commas" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} />
          <div style={{ marginTop: 4, fontSize: 13 }}>
            {editFormTags.map(tag => (
              <TagPill key={tag} tag={tag} onRemove={handleEditFormTagClick} />
            ))}
          </div>
        </label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Length<input type="text" name="length" value={editForm.length || ''} onChange={handleEditFormChange} placeholder="69" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Rank<input type="number" name="rank" value={editForm.rank || ''} onChange={handleEditFormChange} min={1} style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Version played on<input type="text" name="version" value={editForm.version || ''} onChange={handleEditFormChange} placeholder="2.2" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Video URL<input type="text" name="video" value={editForm.video || ''} onChange={handleEditFormChange} placeholder="https://youtu.be/..." style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Showcase Video<input type="text" name="showcaseVideo" value={editForm.showcaseVideo || ''} onChange={handleEditFormChange} placeholder="https://youtu.be/..." style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Date (YYYY-MM-DD)<input type="text" name="date" value={editForm.date || ''} onChange={handleEditFormChange} placeholder="2023-12-19" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Submitter<input type="text" name="submitter" value={editForm.submitter || ''} onChange={handleEditFormChange} placeholder="kyle1saurus" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Level ID<input type="text" name="levelID" value={editForm.levelID || ''} onChange={handleEditFormChange} placeholder="86407629" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Thumbnail<input type="text" name="thumbnail" value={editForm.thumbnail || ''} onChange={handleEditFormChange} placeholder="Image URL" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <div className="devmode-form-btn-row">
          <button className="devmode-btn" type="submit">Save</button>
          <button className="devmode-btn" type="button" onClick={handleEditFormCancel}>Cancel</button>
        </div>
      </form>
      <PreviewBox content={editFormPreviewObj} />
    </div>
  );
}, (p, n) => shallowEqual(p.editForm, n.editForm) && shallowEqual(p.editFormTags, n.editFormTags) && p.editFormCustomTags === n.editFormCustomTags && p.AVAILABLE_TAGS === n.AVAILABLE_TAGS);
const NewFormPanel = React.memo(function NewFormPanel({
  newForm,
  newFormTags,
  newFormCustomTags,
  AVAILABLE_TAGS,
  handleNewFormChange,
  handleNewFormTagClick,
  handleNewFormCustomTagsChange,
  handleNewFormAdd,
  handleNewFormCancel,
  newFormPreview,
  pasteSearch,
  setPasteSearch,
  pasteShowResults,
  setPasteShowResults,
  pasteCandidates,
  handlePasteSelect,
}) {
  return (
    <div className="devmode-form-panel">
      <h3 className="devmode-form-title">New Achievement</h3>
      <form onSubmit={e => { e.preventDefault(); handleNewFormAdd(); }} autoComplete="off">
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Name<input type="text" name="name" value={newForm.name} onChange={handleNewFormChange} required placeholder="Naracton Diablo X 99%" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>ID<input type="text" name="id" value={newForm.id} onChange={handleNewFormChange} required placeholder="naracton-diablo-x-99" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Player<input type="text" name="player" value={newForm.player} onChange={handleNewFormChange} placeholder="Zoink" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Tags
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 4 }}>
            {AVAILABLE_TAGS.length > 20 ? (
              <div style={{ width: '100%', height: 160 }}>
                <ListWindow height={160} itemCount={AVAILABLE_TAGS.length} itemSize={34} width={'100%'}>
                  {({ index, style }) => {
                    const tag = AVAILABLE_TAGS[index];
                    return (
                      <div style={{ ...style, display: 'inline-block', paddingRight: 6 }}>
                        <TagButton key={tag} tag={tag} selected={newFormTags.includes(tag)} onToggle={handleNewFormTagClick} />
                      </div>
                    );
                  }}
                </ListWindow>
              </div>
            ) : (
              AVAILABLE_TAGS.map(tag => (
                <TagButton key={tag} tag={tag} selected={newFormTags.includes(tag)} onToggle={handleNewFormTagClick} />
              ))
            )}
          </div>
          <input type="text" value={newFormCustomTags} onChange={handleNewFormCustomTagsChange} placeholder="Or type custom tags separated by commas" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} />
          <div style={{ marginTop: 4, fontSize: 13 }}>
            {newFormTags.map(tag => (
              <TagPill key={tag} tag={tag} onRemove={handleNewFormTagClick} />
            ))}
          </div>
        </label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Length<input type="text" name="length" value={newForm.length} onChange={handleNewFormChange} placeholder="69" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Rank<input type="number" name="rank" value={newForm.rank || ''} onChange={handleNewFormChange} min={1} placeholder="1" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Version<input type="text" name="version" value={newForm.version} onChange={handleNewFormChange} placeholder="2.2" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Video URL<input type="text" name="video" value={newForm.video} onChange={handleNewFormChange} placeholder="https://youtu.be/..." style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Showcase Video<input type="text" name="showcaseVideo" value={newForm.showcaseVideo} onChange={handleNewFormChange} placeholder="https://youtu.be/..." style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Date (YYYY-MM-DD)<input type="text" name="date" value={newForm.date} onChange={handleNewFormChange} placeholder="2023-12-19" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Submitter<input type="text" name="submitter" value={newForm.submitter} onChange={handleNewFormChange} placeholder="kyle1saurus" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Level ID<input type="text" name="levelID" value={newForm.levelID} onChange={handleNewFormChange} placeholder="86407629" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <label style={{ display: 'block', fontSize: 13, marginTop: 6 }}>Thumbnail<input type="text" name="thumbnail" value={newForm.thumbnail} onChange={handleNewFormChange} placeholder="Image URL" style={{ width: '100%', fontSize: 14, padding: 4, marginTop: 2, boxSizing: 'border-box' }} /></label>
        <PasteSearchBox pasteSearch={pasteSearch} setPasteSearch={setPasteSearch} pasteShowResults={pasteShowResults} setPasteShowResults={setPasteShowResults} pasteCandidates={pasteCandidates} handlePasteSelect={handlePasteSelect} />
        <div className="devmode-form-btn-row">
          <button className="devmode-btn" type="submit">Add</button>
          <button className="devmode-btn" type="button" onClick={handleNewFormCancel}>Cancel</button>
        </div>
      </form>
      <PreviewBox content={newFormPreview} />
    </div>
  );
}, (p, n) => shallowEqual(p.newForm, n.newForm) && shallowEqual(p.newFormTags, n.newFormTags) && p.newFormCustomTags === n.newFormCustomTags && shallowEqual(p.pasteCandidates, n.pasteCandidates));

function DevModePanelInner({
  devMode,
  achievements,
  reordered,
  stagedReordered,
  originalAchievements,
  originalSnapshotRef,
  batchUpdateReordered,
  setReordered,
  setStagedReordered,
  setEditIdx,
  editIdx,
  editForm,
  setEditForm,
  editFormTags,
  setEditFormTags,
  editFormCustomTags,
  setEditFormCustomTags,
  AVAILABLE_TAGS,

  showNewForm,
  newForm,
  setNewForm,
  newFormTags,
  setNewFormTags,
  newFormCustomTags,
  setNewFormCustomTags,
  setShowNewForm,

  pasteSearch,
  setPasteSearch,
  pasteShowResults,
  setPasteShowResults,
  getPasteCandidates,

  storageKeySuffix,
  setDuplicateThumbKeys,
  setDevMode,
  setScrollToIdx,
  setInsertIdx,
  insertIdx,

  handlePasteSelect,
  onImportAchievementsJson,
  visible,
}) {
  if (!devMode) return null;
  if (typeof visible === 'boolean' && !visible) return null;
  const getPasteCandidatesRef = useRef(getPasteCandidates);
  useEffect(() => { getPasteCandidatesRef.current = getPasteCandidates; }, [getPasteCandidates]);

  const pasteCandidates = useMemo(() => {
    if (!pasteShowResults) return [];
    const fn = getPasteCandidatesRef.current;
    if (typeof fn !== 'function') return [];
    try {
      return fn(pasteSearch) || [];
    } catch (e) {
      return [];
    }
  }, [pasteShowResults, pasteSearch]);

  const editFormPreviewObj = useMemo(() => {
    if (!editForm) return null;
    let tags = Array.isArray(editFormTags) ? [...editFormTags] : [];
    if (typeof editFormCustomTags === 'string' && editFormCustomTags.trim()) {
      editFormCustomTags
        .split(',')
        .map(t => (typeof t === 'string' ? t.trim() : t))
        .filter(Boolean)
        .forEach(t => { if (!tags.includes(t)) tags.push(t); });
    }
    return { ...editForm, tags };
  }, [editForm, editFormTags, editFormCustomTags]);

  const newFormPreview = useMemo(() => {
    let tags = [...newFormTags];
    if (typeof newFormCustomTags === 'string' && newFormCustomTags.trim()) {
      newFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => { if (!tags.includes(t)) tags.push(t); });
    }
    const entry = {};
    Object.entries(newForm || {}).forEach(([k, v]) => {
      if (k === 'version') { const num = Number(v); if (!isNaN(num)) entry[k] = num; return; }
      if (k === 'levelID') { const num = Number(v); if (!isNaN(num) && num > 0) entry[k] = num; return; }
      if (typeof v === 'string') { if (v.trim() !== '') entry[k] = v.trim(); }
      else if (v !== undefined && v !== null && v !== '') entry[k] = v;
    });
    if (tags.length) entry.tags = tags;
    return entry;
  }, [newForm, newFormTags, newFormCustomTags]);
  const handleCopyJson = useCallback(async () => {
    try {
      const arr =
        Array.isArray(stagedReordered) && stagedReordered.length
          ? stagedReordered
          : Array.isArray(reordered) && reordered.length
            ? reordered
            : Array.isArray(achievements)
              ? achievements
              : [];
      function toBase64(s) {
        try {
          if (typeof btoa === 'function') return btoa(unescape(encodeURIComponent(String(s || ''))));
          if (typeof Buffer !== 'undefined') return Buffer.from(String(s || ''), 'utf8').toString('base64');
        } catch (e) { }
        return String(s || '');
      }
      const json = JSON.stringify(arr.map(a => {
        const copy = { ...a };
        delete copy._sortedTags; delete copy._isPlatformer; delete copy._lengthStr; delete copy._thumbnail;
        delete copy._searchable; delete copy._searchableNormalized; delete copy._tagString; delete copy.hasThumb; delete copy.autoThumb;
        if (Array.isArray(copy._tokens)) {
          try { copy._tokens = copy._tokens.join(' '); } catch (e) { }
        }
        if (copy._searchText) {
          try { copy._searchText = toBase64(copy._searchText); } catch (e) { }
        }
        return copy;
      }), null, 2);
      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        await navigator.clipboard.writeText(json);
        alert('Copied achievement JSON to clipboard');
      } else {
        const t = document.createElement('textarea');
        t.value = json;
        document.body.appendChild(t);
        t.select();
        document.execCommand('copy');
        document.body.removeChild(t);
        alert('Copied achievement JSON to clipboard');
      }
    } catch (e) {
      console.error(e);
    }
  }, [achievements, reordered, stagedReordered]);

  const handleCheckDuplicateThumbnailsLocal = useCallback(() => {
    const items = devMode && reordered ? reordered : achievements;
    const map = new Map();
    (items || []).forEach((a) => {
      const thumb = (a && a.thumbnail) ? a.thumbnail : (a && a.levelID) ? `https://levelthumbs.prevter.me/thumbnail/${a.levelID}` : '';
      const key = String(thumb || '').trim();
      if (!key) return;
      map.set(key, (map.get(key) || 0) + 1);
    });
    const dupKeys = new Set();
    map.forEach((count, key) => { if (count > 1) dupKeys.add(key); });
    if (typeof setDuplicateThumbKeys === 'function') setDuplicateThumbKeys(dupKeys);
  }, [achievements, reordered, devMode, setDuplicateThumbKeys]);
  const ID_INDEX_TTL_MS_LOCAL = 5 * 60 * 1000;
  const _idIndexCache_local = useRef(new Map()).current;

  const formatChangelogEntryLocal = (change, achievementsList, mode, idIndexMap, contextMap) => {
    try {
      const { type, achievement, oldAchievement, oldRank } = change;
      if (!achievement) return '';
      const name = achievement.name || 'Unknown';
      const rank = achievement.rank || '?';
      let newIdx = -1;
      if (idIndexMap && achievement && achievement.id && idIndexMap.has(achievement.id)) newIdx = idIndexMap.get(achievement.id);
      else newIdx = (achievementsList || []).findIndex(a => a.id === achievement.id);
      const getAchievementContextLocal = (achievementParam, allAchievementsParam, indexParam) => {
        const below = indexParam > 0 ? allAchievementsParam[indexParam - 1]?.name : null;
        const above = indexParam < allAchievementsParam.length - 1 ? allAchievementsParam[indexParam + 1]?.name : null;
        return { below, above };
      };
      let context = { below: null, above: null };
      if (contextMap && achievement && achievement.id && contextMap.has(achievement.id)) context = contextMap.get(achievement.id);
      else if (newIdx >= 0) context = getAchievementContextLocal(achievement, achievementsList, newIdx);
      const showOnlyOneContext = mode === 'dev';
      let entry = '';
      switch (type) {
        case 'added':
          entry = `**${name}** added at #${rank}`;
          if (showOnlyOneContext) { if (context.below) entry += `\n> Below ${context.below}`; }
          else { if (context.below) entry += `\n> Below ${context.below}`; if (context.above) entry += `\n> Above ${context.above}`; }
          break;
        case 'removed':
          entry = `⛔ **${name}** removed from #${oldRank || rank}`;
          break;
        case 'movedUp':
          entry = `🔼 **${name}** moved up from #${oldRank} to #${rank}`;
          break;
        case 'movedDown':
          entry = `🔽 **${name}** moved down from #${oldRank} to #${rank}`;
          break;
        case 'renamed':
          entry = `⚪ ${oldAchievement?.name || 'Unknown'} updated to **${name}**`;
          break;
      }
      return entry;
    } catch (e) { return ''; }
  };

  const generateAndCopyChangelogLocal = useCallback(() => {
    try {
      const original = (originalSnapshotRef && originalSnapshotRef.current) ? originalSnapshotRef.current : (originalAchievements || []);
      const current = (stagedReordered && stagedReordered.length) ? stagedReordered : (reordered && reordered.length) ? reordered : achievements || [];
      if (!original || !original.length) { alert('Original JSON not available to diff against.'); return; }

      const { formatted } = generateChangelog(original, current, { mode: 'dev' });

      if (!formatted || !formatted.trim()) { alert('No changes detected'); return; }

      if (navigator && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
        navigator.clipboard.writeText(formatted).then(() => alert('Changelog copied to clipboard!')).catch(() => alert('Failed to copy to clipboard'));
      } else {
        try { const t = document.createElement('textarea'); t.value = formatted; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); alert('Changelog copied to clipboard!'); } catch (e) { alert('Clipboard API not available'); }
      }
    } catch (e) { console.error(e); alert('Failed to generate changelog'); }
  }, [originalAchievements, stagedReordered, reordered, achievements, storageKeySuffix]);

  const resetChangesLocal = useCallback(() => {
    const original = (originalSnapshotRef && originalSnapshotRef.current) ? originalSnapshotRef.current : (originalAchievements || []);
    if (!original || !original.length) { alert('No original JSON loaded to reset to.'); return; }
    const ok = typeof window !== 'undefined' ? window.confirm('Are you sure you want to reset all changes and restore the original JSON?') : true;
    if (!ok) return;
    try {
      const restored = Array.isArray(original) ? original.slice() : [];
      if (typeof setReordered === 'function') setReordered(restored);
      if (typeof setStagedReordered === 'function') setStagedReordered(null);
      if (typeof setEditIdx === 'function') setEditIdx(null);
      if (typeof setEditForm === 'function') setEditForm(null);
      if (typeof setEditFormTags === 'function') setEditFormTags([]);
      if (typeof setNewForm === 'function') setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
      if (typeof setNewFormTags === 'function') setNewFormTags([]);
      if (typeof setNewFormCustomTags === 'function') setNewFormCustomTags('');
      if (typeof setInsertIdx === 'function') setInsertIdx(null);
      if (typeof setScrollToIdx === 'function') setScrollToIdx(0);
      if (typeof setDevMode === 'function') setDevMode(false);
    } catch (e) { console.error('Failed to reset changes', e); alert('Failed to reset changes'); }
  }, [originalAchievements, setReordered, setStagedReordered, setEditIdx, setEditForm, setEditFormTags, setNewForm, setNewFormTags, setNewFormCustomTags, setInsertIdx, setScrollToIdx, setDevMode]);

  const handleShowNewFormLocal = useCallback(() => {
    if (typeof setShowNewForm === 'function') setShowNewForm(true);
  }, [setShowNewForm]);

  const normalizeYoutubeUrlLocal = useCallback((input) => {
    if (!input || typeof input !== 'string') return input;
    const s = input.trim();
    let m = s.match(/(?:https?:\/\/)?(?:www\.)?youtu\.be\/([^?&#\/]+)/i);
    if (m) {
      const id = m[1];
      try {
        const parsedShort = new URL(s.startsWith('http') ? s : `https://${s}`);
        const t = parsedShort.searchParams.get('t') || parsedShort.searchParams.get('start') || parsedShort.searchParams.get('time_continue');
        if (t) return `https://www.youtube.com/watch?v=${id}&t=${t}`;
      } catch (e) { }
      return `https://youtu.be/${id}`;
    }
    return s;
  }, []);

  const handleEditFormChange = useCallback((e) => {
    const { name, value } = e.target;
    let newVal;
    if (name === 'id') {
      newVal = String(value || '').trim().replace(/\s+/g, '-').replace(/[^A-Za-z0-9\-_.~]/g, '').toLowerCase();
    } else {
      if (name === 'video' || name === 'showcaseVideo') {
        const norm = normalizeYoutubeUrlLocal(value);
        newVal = devMode ? (norm || String(value || '').trim()) : norm;
      } else {
        newVal = (['levelID', 'length'].includes(name) ? Number(value) : value);
      }
    }
    if (typeof setEditForm !== 'function') return;

    const generateIdFromName = (src) => {
      if (!src || typeof src !== 'string') return '';
      let s = src.trim().replace(/\s+/g, '-');
      s = s.replace(/[^A-Za-z0-9\-_.~]/g, '');
      return s.toLowerCase();
    };

    setEditForm(f => {
      const next = { ...f, [name]: newVal };
      if (name === 'name') {
        const autoId = generateIdFromName(String(newVal || ''));
        const prevAuto = generateIdFromName(String(f && f.name ? f.name : ''));
        if (!f.id || (f.id === prevAuto)) {
          next.id = autoId;
        }
      }
      return next;
    });
  }, [setEditForm, normalizeYoutubeUrlLocal, devMode]);

  const handleEditFormTagClick = useCallback((tag) => {
    if (typeof setEditFormTags !== 'function') return;
    setEditFormTags(tags => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]);
  }, [setEditFormTags]);

  const handleEditFormCustomTagsChange = useCallback((e) => { if (typeof setEditFormCustomTags === 'function') setEditFormCustomTags(e.target.value); }, [setEditFormCustomTags]);

  const handleEditFormSave = useCallback(() => {
    if (!batchUpdateReordered) return;
    const entry = {};
    if (!editForm) return;
    Object.entries(editForm).forEach(([k, v]) => {
      if (k === 'version') { const num = Number(v); if (!isNaN(num)) { entry[k] = num; } return; }
      if (k === 'levelID') { const num = Number(v); if (!isNaN(num) && num > 0) { entry[k] = num; } return; }
      if (typeof v === 'string') { if (v.trim() !== '') entry[k] = v.trim(); }
      else if (v !== undefined && v !== null && v !== '') entry[k] = v;
    });
    let tags = Array.isArray(editFormTags) ? [...editFormTags] : [];
    if (typeof editFormCustomTags === 'string' && editFormCustomTags.trim()) {
      editFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => { if (!tags.includes(t)) tags.push(t); });
    }
    if (tags.length) entry.tags = tags;
    if (entry.video) {
      const nv = normalizeYoutubeUrlLocal(entry.video);
      if (nv) entry.video = nv; else if (!devMode) delete entry.video;
    }
    if (entry.showcaseVideo) {
      const nv2 = normalizeYoutubeUrlLocal(entry.showcaseVideo);
      if (nv2) entry.showcaseVideo = nv2; else if (!devMode) delete entry.showcaseVideo;
    }
    batchUpdateReordered(arr => {
      if (!arr) return arr;
      const original = arr[editIdx];
      const newRank = entry && entry.rank !== undefined && entry.rank !== null && entry.rank !== '' ? Number(entry.rank) : null;
      const oldRank = original ? Number(original.rank) : null;
      const rankIsChanging = newRank !== null && !isNaN(newRank) && newRank !== oldRank;
      if (rankIsChanging) {
        const [removed] = arr.splice(editIdx, 1);
        const updated = { ...removed, ...entry };
        const idx = Math.max(0, Math.min(arr.length, newRank - 1));
        arr.splice(idx, 0, updated);
      } else {
        arr[editIdx] = { ...arr[editIdx], ...entry };
      }
      return arr;
    });
    if (typeof setEditIdx === 'function') setEditIdx(null);
    if (typeof setEditForm === 'function') setEditForm(null);
    if (typeof setEditFormTags === 'function') setEditFormTags([]);
    if (typeof setEditFormCustomTags === 'function') setEditFormCustomTags('');
  }, [batchUpdateReordered, editForm, editFormTags, editFormCustomTags, editIdx, normalizeYoutubeUrlLocal, devMode, setEditIdx, setEditForm, setEditFormTags, setEditFormCustomTags]);

  const handleEditFormCancel = useCallback(() => {
    if (typeof setEditIdx === 'function') setEditIdx(null);
    if (typeof setEditForm === 'function') setEditForm(null);
    if (typeof setEditFormTags === 'function') setEditFormTags([]);
    if (typeof setEditFormCustomTags === 'function') setEditFormCustomTags('');
  }, [setEditIdx, setEditForm, setEditFormTags, setEditFormCustomTags]);

  const handleNewFormChange = useCallback((e) => {
    const { name, value } = e.target;
    const newVal = (['levelID', 'length'].includes(name) ? Number(value) : value);
    if (typeof setNewForm !== 'function') return;

    const generateIdFromName = (src) => {
      if (!src || typeof src !== 'string') return '';
      let s = src.trim().replace(/\s+/g, '-');
      s = s.replace(/[^A-Za-z0-9\-_.~]/g, '');
      return s.toLowerCase();
    };

    setNewForm(prev => {
      const next = { ...prev, [name]: newVal };
      if (name === 'name') {
        const autoId = generateIdFromName(String(newVal || ''));

        const prevAuto = generateIdFromName(String(prev && prev.name ? prev.name : ''));
        if (!prev.id || (prev.id === prevAuto)) {
          next.id = autoId;
        }
      }
      return next;
    });
  }, [setNewForm]);

  const handleNewFormTagClick = useCallback((tag) => { if (typeof setNewFormTags === 'function') setNewFormTags(tags => tags.includes(tag) ? tags.filter(t => t !== tag) : [...tags, tag]); }, [setNewFormTags]);

  const handleNewFormCustomTagsChange = useCallback((e) => { if (typeof setNewFormCustomTags === 'function') setNewFormCustomTags(e.target.value); }, [setNewFormCustomTags]);

  const handleNewFormAdd = useCallback(() => {
    if (!batchUpdateReordered) return;
    const entry = {};
    Object.entries(newForm || {}).forEach(([k, v]) => {
      if (k === 'version') { const num = Number(v); if (!isNaN(num)) entry[k] = num; return; }
      if (k === 'levelID') { const num = Number(v); if (!isNaN(num) && num > 0) entry[k] = num; return; }
      if (typeof v === 'string') { if (v.trim() !== '') entry[k] = v.trim(); }
      else if (v !== undefined && v !== null && v !== '') entry[k] = v;
    });
    let tags = Array.isArray(newFormTags) ? [...newFormTags] : [];
    if (typeof newFormCustomTags === 'string' && newFormCustomTags.trim()) {
      newFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => { if (!tags.includes(t)) tags.push(t); });
    }
    if (tags.length) entry.tags = tags;
    const copy = { ...entry };
    batchUpdateReordered(arr => {
      const target = Array.isArray(arr) ? arr.slice() : [];
      const idx = (typeof insertIdx === 'number' && insertIdx >= 0) ? Math.min(insertIdx, target.length) : target.length;
      copy.rank = idx + 1; target.splice(idx, 0, copy);
      for (let i = 0; i < target.length; i++) { if (target[i]) target[i].rank = i + 1; }
      return target;
    });
    if (typeof setNewForm === 'function') setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
    if (typeof setNewFormTags === 'function') setNewFormTags([]);
    if (typeof setNewFormCustomTags === 'function') setNewFormCustomTags('');
    if (typeof setShowNewForm === 'function') setShowNewForm(false);
  }, [batchUpdateReordered, newForm, newFormTags, newFormCustomTags, insertIdx, setNewForm, setNewFormTags, setNewFormCustomTags, setShowNewForm]);

  const handleNewFormCancel = useCallback(() => {
    if (typeof setShowNewForm === 'function') setShowNewForm(false);
    if (typeof setNewForm === 'function') setNewForm({ name: '', id: '', player: '', length: 0, version: 2, video: '', showcaseVideo: '', date: '', submitter: '', levelID: 0, thumbnail: '', tags: [] });
    if (typeof setNewFormTags === 'function') setNewFormTags([]);
    if (typeof setNewFormCustomTags === 'function') setNewFormCustomTags('');
  }, [setShowNewForm, setNewForm, setNewFormTags, setNewFormCustomTags]);

  return (
    <>
      <DevToolbar
        devMode={devMode}
        handleCopyJson={handleCopyJson}
        handleCheckDuplicateThumbnails={handleCheckDuplicateThumbnailsLocal}
        onImportAchievementsJson={onImportAchievementsJson}
        handleShowNewForm={handleShowNewFormLocal}
        generateAndCopyChangelog={generateAndCopyChangelogLocal}
        resetChanges={resetChangesLocal}
      />

      {devMode && editIdx !== null && editForm && (
        <EditFormPanel
          editForm={editForm}
          editFormTags={editFormTags}
          editFormCustomTags={editFormCustomTags}
          AVAILABLE_TAGS={AVAILABLE_TAGS}
          handleEditFormChange={handleEditFormChange}
          handleEditFormTagClick={handleEditFormTagClick}
          handleEditFormCustomTagsChange={handleEditFormCustomTagsChange}
          handleEditFormSave={handleEditFormSave}
          handleEditFormCancel={handleEditFormCancel}
          editFormPreviewObj={editFormPreviewObj}
        />
      )}

      {devMode && showNewForm && !editForm && (
        <NewFormPanel
          newForm={newForm}
          newFormTags={newFormTags}
          newFormCustomTags={newFormCustomTags}
          AVAILABLE_TAGS={AVAILABLE_TAGS}
          handleNewFormChange={handleNewFormChange}
          handleNewFormTagClick={handleNewFormTagClick}
          handleNewFormCustomTagsChange={handleNewFormCustomTagsChange}
          handleNewFormAdd={handleNewFormAdd}
          handleNewFormCancel={handleNewFormCancel}
          newFormPreview={newFormPreview}
          pasteSearch={pasteSearch}
          setPasteSearch={setPasteSearch}
          pasteShowResults={pasteShowResults}
          setPasteShowResults={setPasteShowResults}
          pasteCandidates={pasteCandidates}
          handlePasteSelect={handlePasteSelect}
        />
      )}
    </>
  );
}

const DevModePanel = React.memo(DevModePanelInner, (prev, next) => {
  return prev.devMode === next.devMode
    && prev.visible === next.visible
    && prev.editIdx === next.editIdx
    && prev.showNewForm === next.showNewForm
    && shallowEqual(prev.editForm, next.editForm)
    && shallowEqual(prev.newForm, next.newForm)
    && shallowEqual(prev.newFormTags, next.newFormTags)
    && prev.pasteSearch === next.pasteSearch
    && prev.pasteShowResults === next.pasteShowResults;
});

export default DevModePanel;
