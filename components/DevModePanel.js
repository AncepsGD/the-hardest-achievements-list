import React, { useMemo, useCallback, useRef, useEffect, useState } from 'react';
import { CopyIcon, FileIcon, CheckIcon, NewIcon, ChangelogIcon, ResetIcon, CollapseUpIcon, CollapseDownIcon } from './DevIcons';
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
        <button className="devmode-btn" onClick={generateAndCopyChangelog} style={{ ...COMPACT_DEVMODE_BTN, backgroundColor: '#28a745', color: '#fff' }}>
          <span style={{ marginRight: 6 }}>{icons.changelog}</span>Changelog
        </button>
        <button className="devmode-btn" onClick={resetChanges} style={{ ...COMPACT_DEVMODE_BTN, backgroundColor: '#ffc107' }}>
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
        <div style={{ maxHeight: 240, overflowY: 'auto', background: 'var(--secondary-bg, #232323)', border: '1px solid var(--hover-bg)', borderRadius: 6, padding: 8, marginTop: 6 }}>
          {pasteCandidates.length === 0 ? (
            <div style={{ color: '#aaa', fontSize: 13 }}>No matches</div>
          ) : (
            pasteCandidates.map((p, i) => (
              <CandidateButton key={p && p.id ? p.id : `p-${i}`} p={p} onSelect={handlePasteSelect} />
            ))
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
            {AVAILABLE_TAGS.map(tag => (
              <TagButton key={tag} tag={tag} selected={editFormTags.includes(tag)} onToggle={handleEditFormTagClick} />
            ))}
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
            {AVAILABLE_TAGS.map(tag => (
              <TagButton key={tag} tag={tag} selected={newFormTags.includes(tag)} onToggle={handleNewFormTagClick} />
            ))}
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
  editIdx,
  editForm,
  editFormTags,
  editFormCustomTags,
  AVAILABLE_TAGS,
  handleEditFormChange,
  handleEditFormTagClick,
  handleEditFormCustomTagsChange,
  handleEditFormSave,
  handleEditFormCancel,
  showNewForm,
  newForm,
  newFormTags,
  newFormCustomTags,
  handleNewFormChange,
  handleNewFormTagClick,
  handleNewFormCustomTagsChange,
  handleNewFormAdd,
  handleNewFormCancel,
  handleCopyJson,
  handleCopyCompressedJson,
  handlePasteCompressedJson,
  handleShowNewForm,
  newFormPreview,
  handleCheckDuplicateThumbnails,
  onImportAchievementsJson,
  pasteSearch,
  setPasteSearch,
  pasteShowResults,
  setPasteShowResults,
  getPasteCandidates,
  handlePasteSelect,
  generateAndCopyChangelog,
  resetChanges,

}) {
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
  return (
    <>
      <DevToolbar
        devMode={devMode}
        handleCopyJson={handleCopyJson}
        handleCheckDuplicateThumbnails={handleCheckDuplicateThumbnails}
        onImportAchievementsJson={onImportAchievementsJson}
        handleShowNewForm={handleShowNewForm}
        generateAndCopyChangelog={generateAndCopyChangelog}
        resetChanges={resetChanges}
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
    && prev.editIdx === next.editIdx
    && prev.showNewForm === next.showNewForm
    && shallowEqual(prev.editForm, next.editForm)
    && shallowEqual(prev.newForm, next.newForm)
    && shallowEqual(prev.newFormTags, next.newFormTags)
    && shallowEqual(prev.newFormPreview, next.newFormPreview)
    && prev.pasteSearch === next.pasteSearch
    && prev.pasteShowResults === next.pasteShowResults;
});

export default DevModePanel;
