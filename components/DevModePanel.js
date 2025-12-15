import React from 'react';

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
  onImportAchievementsJson
}) {
  return (
    <>
      {/* Floating dev mode controls */}
      {devMode && (
        <div className="devmode-floating-panel">
          <span className="devmode-title">Developer Mode Enabled (SHIFT+M)</span>
          <div className="devmode-btn-row" style={{gap: 8}}>
            <button className="devmode-btn" onClick={handleCopyJson}>Copy achievements.json</button>
            <button className="devmode-btn" onClick={handleCheckDuplicateThumbnails}>Check duplicate thumbnails</button>
            <label className="devmode-btn" style={{display:'inline-block',cursor:'pointer',margin:0}}>
              Import achievements.json
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
                  // Reset input so user can re-import same file if needed
                  e.target.value = '';
                }}
              />
            </label>
            <button className="devmode-btn" onClick={handleShowNewForm}>New Achievement</button>
          </div>
        </div>
      )}
      {/* Edit achievement form (dev mode) */}
      {devMode && editIdx !== null && editForm && (
        <div className="devmode-form-panel">
          <h3 className="devmode-form-title">Edit Achievement</h3>
          <form onSubmit={e => {e.preventDefault(); handleEditFormSave();}} autoComplete="off">
            <label style={{display:'block',fontSize:13,marginTop:6}}>Name<input type="text" name="name" value={editForm.name || ''} onChange={handleEditFormChange} required placeholder="Naracton Diablo X 99%" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>ID<input type="text" name="id" value={editForm.id || ''} onChange={handleEditFormChange} required placeholder="naracton-diablo-x-99" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Player<input type="text" name="player" value={editForm.player || ''} onChange={handleEditFormChange} placeholder="Zoink" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Tags
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>
                {AVAILABLE_TAGS.map(tag => (
                  <button type="button" key={tag} onClick={() => handleEditFormTagClick(tag)} style={{fontSize:11,padding:'3px 6px',backgroundColor:editFormTags.includes(tag)?'#007bff':'#eee',color:editFormTags.includes(tag)?'#fff':'#222',border:'1px solid #ccc',borderRadius:3,cursor:'pointer'}}>{tag}</button>
                ))}
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
            {JSON.stringify({
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
            }, null, 2)}
          </div>
        </div>
      )}
      {/* New achievement form (dev mode) */}
      {devMode && showNewForm && !editForm && (
        <div className="devmode-form-panel">
          <h3 className="devmode-form-title">New Achievement</h3>
          <form onSubmit={e => {e.preventDefault(); handleNewFormAdd();}} autoComplete="off">
            <label style={{display:'block',fontSize:13,marginTop:6}}>Name<input type="text" name="name" value={newForm.name} onChange={handleNewFormChange} required placeholder="Naracton Diablo X 99%" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>ID<input type="text" name="id" value={newForm.id} onChange={handleNewFormChange} required placeholder="naracton-diablo-x-99" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Player<input type="text" name="player" value={newForm.player} onChange={handleNewFormChange} placeholder="Zoink" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Tags
              <div style={{display:'flex',flexWrap:'wrap',gap:5,marginTop:4}}>
                {AVAILABLE_TAGS.map(tag => (
                  <button type="button" key={tag} onClick={() => handleNewFormTagClick(tag)} style={{fontSize:11,padding:'3px 6px',backgroundColor:newFormTags.includes(tag)?'#007bff':'#eee',color:newFormTags.includes(tag)?'#fff':'#222',border:'1px solid #ccc',borderRadius:3,cursor:'pointer'}}>{tag}</button>
                ))}
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
            <label style={{display:'block',fontSize:13,marginTop:6}}>Level ID<input type="text" name="levelID" value={newForm.levelID} onChange={handleNewFormChange} placeholder="86407629" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <label style={{display:'block',fontSize:13,marginTop:6}}>Thumbnail<input type="text" name="thumbnail" value={newForm.thumbnail} onChange={handleNewFormChange} placeholder="Image URL" style={{width:'100%',fontSize:14,padding:4,marginTop:2,boxSizing:'border-box'}} /></label>
            <div className="devmode-form-btn-row">
              <button className="devmode-btn" type="submit">Add</button>
              <button className="devmode-btn" type="button" onClick={handleNewFormCancel}>Cancel</button>
            </div>
          </form>
          <div className="devmode-preview-box">
            <strong>Preview:</strong>
            <br />
            {JSON.stringify(newFormPreview, null, 2)}
          </div>
        </div>
      )}
    </>
  );
}

const DevModePanel = React.memo(DevModePanelInner, (prev, next) => {
  // Shallow compare important state/refs to avoid unnecessary re-renders
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
    && prev.onImportAchievementsJson === next.onImportAchievementsJson;
});

export default DevModePanel;
