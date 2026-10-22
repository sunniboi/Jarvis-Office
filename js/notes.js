// ===== JARVIS NOTES =====

function initNotes(container) {
  let notes = JarvisDB.get('notes_list', []);
  let activeId = null;

  if (!notes.length) {
    notes = [
      { id: 'n1', title: 'Willkommen bei Jarvis Notes', content: 'Hier kannst du schnelle Notizen erstellen und organisieren.\n\n• Neue Notiz: Klick auf + oben links\n• Löschen: Rechtsklick auf Notiz\n• Suche: Suchfeld oben\n\nViel Spaß!', date: Date.now(), pinned: true },
      { id: 'n2', title: 'Ideen', content: '- Neue App-Idee\n- Feature für Jarvis Matrix\n- Farb-Theme überarbeiten', date: Date.now()-3600000, pinned: false },
    ];
    saveNotes();
  }

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--notes)">📋 Jarvis Notes</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="notesNew()">+ Neue Notiz</button>
        <button class="tb-btn" onclick="notesExportAll()">⬇ Alle exportieren</button>
        <select class="tb-select" id="notes-sort" onchange="notesSortChange(this.value)" style="width:110px">
          <option value="date">Nach Datum</option>
          <option value="title">Nach Titel</option>
          <option value="pinned">Angeheftet</option>
        </select>
      </div>
    </div>
    <div class="notes-layout">
      <div class="notes-list">
        <div class="notes-list-header">
          <input class="notes-search" id="notes-search" placeholder="🔍 Suchen..." oninput="notesSearch(this.value)" />
          <button onclick="notesNew()" style="background:var(--accent);border:none;color:#fff;border-radius:50%;width:28px;height:28px;cursor:pointer;font-size:18px;flex-shrink:0;display:flex;align-items:center;justify-content:center;">+</button>
        </div>
        <div class="notes-items" id="notes-items"></div>
      </div>
      <div class="notes-editor" id="notes-editor">
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);">Wähle eine Notiz oder erstelle eine neue.</div>
      </div>
    </div>
    <div class="statusbar">
      <span id="notes-count">Notizen: ${notes.length}</span>
      <span id="notes-chars"></span>
      <span style="margin-left:auto" id="notes-saved"></span>
    </div>
  `;

  let sortMode = 'date';
  let searchQ = '';

  function getFiltered() {
    let list = [...notes];
    if (searchQ) list = list.filter(n => n.title.toLowerCase().includes(searchQ) || n.content.toLowerCase().includes(searchQ));
    if (sortMode === 'date') list.sort((a,b) => b.date - a.date);
    else if (sortMode === 'title') list.sort((a,b) => a.title.localeCompare(b.title));
    else if (sortMode === 'pinned') list.sort((a,b) => (b.pinned?1:0) - (a.pinned?1:0) || b.date - a.date);
    return list;
  }

  function renderList() {
    const items = document.getElementById('notes-items');
    const list = getFiltered();
    items.innerHTML = list.length ? list.map(n => `
      <div class="note-item${n.id === activeId ? ' active' : ''}" onclick="notesOpen('${n.id}')" oncontextmenu="notesContext(event,'${n.id}')">
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <span class="note-item-title">${n.pinned ? '📌 ' : ''}${sanitize(n.title)}</span>
        </div>
        <div class="note-item-preview">${sanitize((n.content||'').split('\n')[0]).substring(0,60)}</div>
        <div class="note-item-date">${new Date(n.date).toLocaleDateString('de-DE')} ${new Date(n.date).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</div>
      </div>
    `).join('') : '<div style="padding:16px;color:var(--text3);font-size:12px;text-align:center;">Keine Notizen gefunden.</div>';
    document.getElementById('notes-count').textContent = `Notizen: ${notes.length}`;
  }

  function renderEditor(id) {
    const note = notes.find(n => n.id === id);
    const editor = document.getElementById('notes-editor');
    if (!note) { editor.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);">Wähle eine Notiz.</div>'; return; }

    editor.innerHTML = `
      <div style="display:flex;align-items:center;border-bottom:1px solid var(--border);padding:8px 12px;gap:8px;">
        <input class="notes-title-input" id="note-title" value="${sanitize(note.title)}" placeholder="Titel..." style="padding:8px 0;" />
        <button onclick="notesTogglePin('${id}')" class="btn btn-ghost" style="font-size:12px;white-space:nowrap;">${note.pinned ? '📌 Lösen' : '📌 Anheften'}</button>
        <button onclick="notesDelete('${id}')" class="btn btn-ghost" style="font-size:12px;color:var(--danger)">🗑</button>
        <button onclick="notesExport('${id}')" class="btn btn-ghost" style="font-size:12px">⬇</button>
      </div>
      <div class="notes-body">
        <textarea class="notes-textarea" id="note-body" placeholder="Notiz hier eingeben...">${sanitize(note.content||'')}</textarea>
      </div>
    `;

    const titleInput = document.getElementById('note-title');
    const bodyInput = document.getElementById('note-body');

    const save = debounce(() => {
      note.title = titleInput.value;
      note.content = bodyInput.value;
      note.date = Date.now();
      saveNotes();
      renderList();
      document.getElementById('notes-saved').textContent = '✓ Auto-gespeichert ' + formatTime();
      document.getElementById('notes-chars').textContent = `Zeichen: ${bodyInput.value.length} | Wörter: ${bodyInput.value.trim() ? bodyInput.value.trim().split(/\s+/).length : 0}`;
    }, 500);

    titleInput.addEventListener('input', save);
    bodyInput.addEventListener('input', save);

    // Keyboard shortcuts
    bodyInput.addEventListener('keydown', e => {
      if (e.ctrlKey && e.key === 's') { e.preventDefault(); save.flush?.(); saveNotes(); showNotify('Gespeichert.', 'success'); }
      if (e.key === 'Tab') {
        e.preventDefault();
        const start = bodyInput.selectionStart;
        const end = bodyInput.selectionEnd;
        bodyInput.value = bodyInput.value.substring(0,start) + '  ' + bodyInput.value.substring(end);
        bodyInput.selectionStart = bodyInput.selectionEnd = start + 2;
      }
    });

    bodyInput.focus();
    document.getElementById('notes-chars').textContent = `Zeichen: ${(note.content||'').length}`;
  }

  window.notesOpen = (id) => { activeId = id; renderList(); renderEditor(id); };

  window.notesNew = () => {
    const note = { id: 'n'+Date.now(), title: 'Neue Notiz', content: '', date: Date.now(), pinned: false };
    notes.unshift(note);
    saveNotes();
    notesOpen(note.id);
  };

  window.notesDelete = (id) => {
    if (!confirm('Notiz löschen?')) return;
    notes = notes.filter(n => n.id !== id);
    if (activeId === id) { activeId = notes[0]?.id || null; renderEditor(activeId); }
    saveNotes();
    renderList();
  };

  window.notesTogglePin = (id) => {
    const note = notes.find(n => n.id === id);
    if (note) { note.pinned = !note.pinned; saveNotes(); renderList(); renderEditor(id); }
  };

  window.notesSearch = (q) => { searchQ = q.toLowerCase(); renderList(); };

  window.notesSortChange = (mode) => { sortMode = mode; renderList(); };

  window.notesContext = (e, id) => {
    e.preventDefault();
    const menu = document.createElement('div');
    menu.style.cssText = `position:fixed;left:${e.clientX}px;top:${e.clientY}px;background:var(--surface);border:1px solid var(--border);border-radius:var(--radius);box-shadow:var(--shadow);z-index:999;min-width:160px;`;
    menu.innerHTML = `
      <div onclick="notesTogglePin('${id}');menu.remove()" style="padding:8px 14px;cursor:pointer;font-size:13px;">📌 Anheften/Lösen</div>
      <div onclick="notesExport('${id}');menu.remove()" style="padding:8px 14px;cursor:pointer;font-size:13px;">⬇ Exportieren</div>
      <div onclick="notesDuplicate('${id}');menu.remove()" style="padding:8px 14px;cursor:pointer;font-size:13px;">⧉ Duplizieren</div>
      <hr style="border-color:var(--border);margin:2px 0;">
      <div onclick="notesDelete('${id}');menu.remove()" style="padding:8px 14px;cursor:pointer;font-size:13px;color:var(--danger);">🗑 Löschen</div>
    `;
    document.body.append(menu);
    const remove = () => { menu.remove(); document.removeEventListener('click', remove); };
    setTimeout(() => document.addEventListener('click', remove), 50);
  };

  window.notesDuplicate = (id) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    const dup = { ...note, id: 'n'+Date.now(), title: note.title + ' (Kopie)', date: Date.now(), pinned: false };
    notes.unshift(dup);
    saveNotes();
    renderList();
  };

  window.notesExport = (id) => {
    const note = notes.find(n => n.id === id);
    if (!note) return;
    downloadFile(note.title + '\n' + '='.repeat(note.title.length) + '\n\n' + note.content, note.title.replace(/[^a-z0-9äöüß]/gi, '_') + '.txt');
  };

  window.notesExportAll = () => {
    const text = notes.map(n => `# ${n.title}\n\n${n.content}`).join('\n\n---\n\n');
    downloadFile(text, 'alle_notizen.txt');
  };

  function saveNotes() { JarvisDB.set('notes_list', notes); }

  renderList();
  if (notes[0]) notesOpen(notes[0].id);
}
