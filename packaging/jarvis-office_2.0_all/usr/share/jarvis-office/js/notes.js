/* ===== JARVIS OFFICE v2 — NOTES ===== */

function initNotes(container) {
  let notes = JarvisDB.get('notes_list', []);
  let selectedId = null;
  let saveTimer = null;

  if (!notes.length) {
    notes = [{ id: JarvisDB.genId(), title: 'Erste Notiz', content: 'Hier steht deine erste Notiz.', modified: Date.now(), pinned: false }];
    persist();
  }

  function persist() { JarvisDB.set('notes_list', notes); }

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome notes-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title">Jarvis Notes</span>
        <div class="titlebar-actions">
          <button class="btn btn-primary btn-sm" id="notes-new">${icon('plus', 15)} Neue Notiz</button>
        </div>
      </div>
      <div class="notes-layout">
        <div class="notes-sidebar">
          <div class="notes-search-wrap">
            <input type="search" id="notes-search" placeholder="Suchen…" aria-label="Notizen durchsuchen" />
          </div>
          <div class="notes-list" id="notes-list" role="list" aria-label="Notizen"></div>
        </div>
        <div class="notes-editor-area">
          <div class="notes-toolbar">
            <input type="text" id="notes-title-in" class="notes-title-in" placeholder="Titel" aria-label="Notiz-Titel" />
            <button class="btn-icon" id="notes-pin" title="Anheften">${icon('pin', 16)}</button>
            <button class="btn-icon" id="notes-delete" title="Löschen">${icon('trash', 16)}</button>
            <button class="btn btn-ghost btn-sm" id="notes-export">${icon('download', 14)} TXT</button>
          </div>
          <textarea id="notes-content" class="notes-content" placeholder="Notiz beginnen…" aria-label="Notizinhalt"></textarea>
        </div>
      </div>
      <div class="statusbar">
        <span id="notes-count">0 Notizen</span>
        <span id="notes-saved"></span>
      </div>
    </div>
  `;

  const listEl    = container.querySelector('#notes-list');
  const titleIn   = container.querySelector('#notes-title-in');
  const contentEl = container.querySelector('#notes-content');
  const searchEl  = container.querySelector('#notes-search');
  const countEl   = container.querySelector('#notes-count');
  const savedEl   = container.querySelector('#notes-saved');
  const pinBtn    = container.querySelector('#notes-pin');

  // ── Helpers ───────────────────────────────────────────────────────────────
  function currentNote() { return notes.find(n => n.id === selectedId) || null; }

  function sorted(list) {
    return [...list].sort((a, b) => {
      if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
      return b.modified - a.modified;
    });
  }

  function filtered(q) {
    if (!q) return sorted(notes);
    const lq = q.toLowerCase();
    return sorted(notes.filter(n => n.title.toLowerCase().includes(lq) || n.content.toLowerCase().includes(lq)));
  }

  // ── Render list ───────────────────────────────────────────────────────────
  function renderList(q = '') {
    const vis = filtered(q);
    listEl.innerHTML = '';
    countEl.textContent = `${notes.length} Notiz${notes.length !== 1 ? 'en' : ''}`;
    vis.forEach(n => {
      const div = document.createElement('div');
      div.className = 'note-item' + (n.id === selectedId ? ' active' : '') + (n.pinned ? ' pinned' : '');
      div.setAttribute('role', 'listitem');
      div.setAttribute('tabindex', '0');
      div.innerHTML = `
        <div class="note-item-title">${sanitize(n.title) || '(kein Titel)'}${n.pinned ? ' ' + icon('pin', 11) : ''}</div>
        <div class="note-item-preview">${sanitize(n.content.slice(0, 60))}</div>
        <div class="note-item-date">${formatDate(new Date(n.modified))}</div>
      `;
      div.addEventListener('click', () => selectNote(n.id));
      div.addEventListener('keydown', e => { if (e.key === 'Enter') selectNote(n.id); });
      listEl.appendChild(div);
    });
  }

  // ── Select note ───────────────────────────────────────────────────────────
  function selectNote(id) {
    selectedId = id;
    const n = currentNote();
    if (!n) return;
    titleIn.value    = n.title;
    contentEl.value  = n.content;
    pinBtn.classList.toggle('active', !!n.pinned);
    renderList(searchEl.value);
    contentEl.focus();
  }

  // ── Auto-save ─────────────────────────────────────────────────────────────
  function scheduleAutoSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, 1000);
  }

  function doSave() {
    const n = currentNote();
    if (!n) return;
    n.title    = titleIn.value;
    n.content  = contentEl.value;
    n.modified = Date.now();
    persist();
    savedEl.textContent = 'Gespeichert';
    setTimeout(() => { savedEl.textContent = ''; }, 1500);
    renderList(searchEl.value);
  }

  titleIn.addEventListener('input',   scheduleAutoSave);
  contentEl.addEventListener('input', scheduleAutoSave);

  // ── New note ──────────────────────────────────────────────────────────────
  function newNote() {
    const n = { id: JarvisDB.genId(), title: 'Neue Notiz', content: '', modified: Date.now(), pinned: false };
    notes.unshift(n);
    persist();
    selectNote(n.id);
    titleIn.select();
  }

  // ── Delete ────────────────────────────────────────────────────────────────
  function deleteNote() {
    if (!selectedId) return;
    if (!confirm('Notiz löschen?')) return;
    notes = notes.filter(n => n.id !== selectedId);
    persist();
    selectedId = notes.length ? notes[0].id : null;
    if (selectedId) selectNote(selectedId);
    else { titleIn.value = ''; contentEl.value = ''; renderList(); }
  }

  // ── Pin ───────────────────────────────────────────────────────────────────
  function togglePin() {
    const n = currentNote();
    if (!n) return;
    n.pinned = !n.pinned;
    n.modified = Date.now();
    persist();
    pinBtn.classList.toggle('active', n.pinned);
    renderList(searchEl.value);
  }

  // ── Export ────────────────────────────────────────────────────────────────
  container.querySelector('#notes-export').addEventListener('click', () => {
    const n = currentNote();
    if (!n) return;
    downloadFile(n.title + '\n' + '='.repeat(n.title.length) + '\n\n' + n.content,
      (n.title || 'Notiz') + '.txt', 'text/plain');
  });

  // ── Wiring ────────────────────────────────────────────────────────────────
  container.querySelector('#notes-new').addEventListener('click', newNote);
  container.querySelector('#notes-delete').addEventListener('click', deleteNote);
  pinBtn.addEventListener('click', togglePin);
  searchEl.addEventListener('input', () => renderList(searchEl.value));
  container.querySelector('.back-btn').addEventListener('click', () => {
    clearTimeout(saveTimer); doSave(); goHome();
  });

  selectNote(notes[0].id);
}
