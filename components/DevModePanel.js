import React, { useMemo } from 'react';

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
  const editTagButtons = useMemo(() => AVAILABLE_TAGS.map(tag => (
    <button type="button" key={tag} onClick={() => handleEditFormTagClick(tag)} style={{fontSize:11,padding:'3px 6px',backgroundColor:editFormTags.includes(tag)?'#007bff':'#eee',color:editFormTags.includes(tag)?'#fff':'#222',border:'1px solid #ccc',borderRadius:3,cursor:'pointer'}}>{tag}</button>
  )), [AVAILABLE_TAGS, editFormTags, handleEditFormTagClick]);

  const newTagButtons = useMemo(() => AVAILABLE_TAGS.map(tag => (
    <button type="button" key={tag} onClick={() => handleNewFormTagClick(tag)} style={{fontSize:11,padding:'3px 6px',backgroundColor:newFormTags.includes(tag)?'#007bff':'#eee',color:newFormTags.includes(tag)?'#fff':'#222',border:'1px solid #ccc',borderRadius:3,cursor:'pointer'}}>{tag}</button>
  )), [AVAILABLE_TAGS, newFormTags, handleNewFormTagClick]);

  const pasteCandidates = useMemo(() => {
    try {
      return typeof getPasteCandidates === 'function' ? getPasteCandidates() || [] : [];
    } catch (e) {
      return [];
    }
  }, [getPasteCandidates, pasteShowResults, pasteSearch]);

  const editPreviewText = useMemo(() => {
    try {
      return JSON.stringify({
        ...editForm,
        tags: (() => {
          let tags = [...editFormTags];
          if (typeof editFormCustomTags === 'string' && editFormCustomTags.trim()) {
            editFormCustomTags.split(',').map(t => (typeof t === 'string' ? t.trim() : t)).filter(Boolean).forEach(t => {
              if (!tags.includes(t)) tags.push(t);
            });
          }
          return tags;
        })()
      }, null, 2);
    } catch (e) {
      return '{}';
    }
  }, [editForm, editFormTags, editFormCustomTags]);

  const newPreviewText = useMemo(() => {
    try { return JSON.stringify(newFormPreview, null, 2); } catch (e) { return '{}'; }
  }, [newFormPreview]);

  return (
    <>
      {devMode && (
        <div className="devmode-floating-panel">
          <span className="devmode-title">Developer Mode Enabled (SHIFT+M)</span>
          <div className="devmode-btn-row" style={{gap: 8}}>
            <button className="devmode-btn" onClick={handleCopyJson}>Copy .json</button>
            <button className="devmode-btn" onClick={handleCheckDuplicateThumbnails}>Check Dupe Images</button>
            <label className="devmode-btn" style={{display:'inline-block',cursor:'pointer',margin:0}}>
              Import .json
              <input
                type="file"
                accept="application/json,.json"
                style={{display:'none'}}
                onChange={e => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = evt => {
                    try {
                      const json = JSON.parse(evt.target.result);
                      if (typeof onImportAchievementsJson === 'function') {
                        onImportAchievementsJson(json);
                      }
                    } catch (err) {
                      alert('Invalid achievements.json file.');
                    }
                  };
                  reader.readAsText(file);
                  e.target.value = '';
                }}
              />
            </label>
            <button className="devmode-btn" onClick={handleShowNewForm}>New Achievement</button>
            <button className="devmode-btn" onClick={generateAndCopyChangelog} style={{backgroundColor: '#28a745'}}>
              Copy Changelog
            </button>
            <button className="devmode-btn" onClick={resetChanges} style={{backgroundColor: '#ffc107'}}>
              Reset Changes
            </button>
          </div>
        </div>
      )}
      {devMode && editIdx !== null && editForm && (
        <div className="devmode-form-panel">
          <h3 className="devmode-form-title">Edit Achievement</h3>
          <form onSubmit={e => {e.preventDefault(); handleEditFormSave();}} autoComplete="off">
            <label style={{display:'block',fontSize:13,marginTop:6}}>Name<input type="text" name="name" value={editForm.name || ''} onChange={handleEditFormChange} required placeholder="Naracton Diablo X 99%" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>ID<input type="text" name="id" value={editForm.id || ''} onChange={handleEditFormChange} required placeholder="naracton-diablo-x-99" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Player<input type="text" name="player" value={editForm.player || ''} onChange={handleEditFormChange} placeholder="Zoink" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Tags
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>
                {editTagButtons}
              </div>
              <input type="text" value={editFormCustomTags} onChange={handleEditFormCustomTagsChange} placeholder="Or type custom tags separated by commas" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} />
              <div style={{marginTop:4,fontSize:13}}>
                {editFormTags.map(tag => (
                  <span key={tag} style={{display:'inline-block',background:'#ddd',padding:'2px 6px',margin:'2px',borderRadius:4,cursor:'pointer'}} title="Click to remove" onClick={() => handleEditFormTagClick(tag)}>{tag}</span>
                ))}
              </div>
            </label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Length<input type="text" name="length" value={editForm.length || ''} onChange={handleEditFormChange} placeholder="69" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Rank<input type="number" name="rank" value={editForm.rank || ''} onChange={handleEditFormChange} min={1} style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Version played on<input type="text" name="version" value={editForm.version || ''} onChange={handleEditFormChange} placeholder="2.2" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Video URL<input type="text" name="video" value={editForm.video || ''} onChange={handleEditFormChange} placeholder="https://youtu.be/..." style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Showcase Video<input type="text" name="showcaseVideo" value={editForm.showcaseVideo || ''} onChange={handleEditFormChange} placeholder="https://youtu.be/..." style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Date (YYYY-MM-DD)<input type="text" name="date" value={editForm.date || ''} onChange={handleEditFormChange} placeholder="2023-12-19" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Submitter<input type="text" name="submitter" value={editForm.submitter || ''} onChange={handleEditFormChange} placeholder="kyle1saurus" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Note<textarea name="note" value={editForm.note || ''} onChange={handleEditFormChange} placeholder="Internal note or comment" style={{width:'100%',fontSize:14,padding:6,marginTop:2,boxSizing:'border-box',minHeight:64}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Level ID<input type="text" name="levelID" value={editForm.levelID || ''} onChange={handleEditFormChange} placeholder="86407629" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Thumbnail<input type="text" name="thumbnail" value={editForm.thumbnail || ''} onChange={handleEditFormChange} placeholder="Image URL" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <div className="devmode-form-btn-row">
              <button className="devmode-btn" type="submit">Save</button>
              <button className="devmode-btn" type="button" onClick={handleEditFormCancel}>Cancel</button>
            </div>
          </form>
            <div className="devmode-preview-box">
            <strong>Preview:</strong>
            <br />
            {editPreviewText}
          </div>
        </div>
      )}
      {devMode && showNewForm && !editForm && (
        <div className="devmode-form-panel">
          <h3 className="devmode-form-title">New Achievement</h3>
          <form onSubmit={e => {e.preventDefault(); handleNewFormAdd();}} autoComplete="off">
            <label style={{display:'block',fontSize:13,marginTop:6}}>Name<input type="text" name="name" value={newForm.name} onChange={handleNewFormChange} required placeholder="Naracton Diablo X 99%" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>ID<input type="text" name="id" value={newForm.id} onChange={handleNewFormChange} required placeholder="naracton-diablo-x-99" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Player<input type="text" name="player" value={newForm.player} onChange={handleNewFormChange} placeholder="Zoink" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Tags
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>
                {newTagButtons}
              </div>
              <input type="text" value={newFormCustomTags} onChange={handleNewFormCustomTagsChange} placeholder="Or type custom tags separated by commas" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} />
              <div style={{marginTop:4,fontSize:13}}>
                {newFormTags.map(tag => (
                  <span key={tag} style={{display:'inline-block',background:'#ddd',padding:'2px 6px',margin:'2px',borderRadius:4,cursor:'pointer'}} title="Click to remove" onClick={() => handleNewFormTagClick(tag)}>{tag}</span>
                ))}
              </div>
            </label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Length<input type="text" name="length" value={newForm.length} onChange={handleNewFormChange} placeholder="69" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Rank<input type="number" name="rank" value={newForm.rank || ''} onChange={handleNewFormChange} min={1} placeholder="1" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Version<input type="text" name="version" value={newForm.version} onChange={handleNewFormChange} placeholder="2.2" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Video URL<input type="text" name="video" value={newForm.video} onChange={handleNewFormChange} placeholder="https://youtu.be/..." style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Showcase Video<input type="text" name="showcaseVideo" value={newForm.showcaseVideo} onChange={handleNewFormChange} placeholder="https://youtu.be/..." style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Date (YYYY-MM-DD)<input type="text" name="date" value={newForm.date} onChange={handleNewFormChange} placeholder="2023-12-19" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Submitter<input type="text" name="submitter" value={newForm.submitter} onChange={handleNewFormChange} placeholder="kyle1saurus" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Note<textarea name="note" value={newForm.note || ''} onChange={handleNewFormChange} placeholder="Internal note or comment" style={{width:'100%',fontSize:14,padding:6,marginTop:2,boxSizing:'border-box',minHeight:64}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Level ID<input type="text" name="levelID" value={newForm.levelID} onChange={handleNewFormChange} placeholder="86407629" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Thumbnail<input type="text" name="thumbnail" value={newForm.thumbnail} onChange={handleNewFormChange} placeholder="Image URL" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            {}
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
                      <button
                        key={p && p.id ? p.id : `p-${i}`}
                        type="button"
                        onClick={() => handlePasteSelect && handlePasteSelect(p)}
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
                    ))
                  )}
                </div>
              )}
            </div>
            <div className="devmode-form-btn-row">
              <button className="devmode-btn" type="submit">Add</button>
              <button className="devmode-btn" type="button" onClick={handleNewFormCancel}>Cancel</button>
            </div>
          </form>
          <div className="devmode-preview-box">
            <strong>Preview:</strong>
            <br />
            {newPreviewText}
          </div>
        </div>
      )}
    </>
  );
}

const DevModePanel = React.memo(DevModePanelInner, (prev, next) => {
  return prev.devMode === next.devMode
    && prev.editIdx === next.editIdx
    && prev.showNewForm === next.showNewForm
    && prev.editForm === next.editForm
    && prev.newForm === next.newForm
    && prev.newFormTags === next.newFormTags
    && prev.newFormPreview === next.newFormPreview
    && prev.handleCopyJson === next.handleCopyJson
    && prev.handleShowNewForm === next.handleShowNewForm
    && prev.handleCheckDuplicateThumbnails === next.handleCheckDuplicateThumbnails
    && prev.onImportAchievementsJson === next.onImportAchievementsJson
    && prev.pasteSearch === next.pasteSearch
    && prev.pasteShowResults === next.pasteShowResults
    && prev.getPasteCandidates === next.getPasteCandidates
    && prev.handlePasteSelect === next.handlePasteSelect
    && prev.generateAndCopyChangelog === next.generateAndCopyChangelog
    && prev.resetChanges === next.resetChanges;
});

export default DevModePanel;
