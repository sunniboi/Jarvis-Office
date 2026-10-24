/* ===== JARVIS OFFICE v2 — WRITE ===== */

function initWrite(container) {
  let docId = null;
  let dirty = false;
  let autoSaveTimer = null;

  const settings = JarvisDB.get('settings', {});
  const fontSize = settings.fontSize || 14;

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome write-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück zum Launcher">${icon('arrowLeft', 18)}</button>
        <span class="app-title" id="write-title">Unbenannt</span>
        <div class="titlebar-actions">
          <button class="btn btn-ghost btn-sm" id="write-new">${icon('filePlus', 15)} Neu</button>
          <button class="btn btn-ghost btn-sm" id="write-open">${icon('folderOpen', 15)} Öffnen</button>
          <button class="btn btn-primary btn-sm" id="write-save">${icon('save', 15)} Speichern</button>
        </div>
      </div>

      <div class="toolbar" role="toolbar" aria-label="Formatierung">
        <div class="toolbar-group">
          <button class="tb-btn" data-cmd="bold"      title="Fett (Strg+B)">${icon('bold', 16)}</button>
          <button class="tb-btn" data-cmd="italic"    title="Kursiv (Strg+I)">${icon('italic', 16)}</button>
          <button class="tb-btn" data-cmd="underline" title="Unterstrichen (Strg+U)">${icon('underline', 16)}</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="tb-btn" data-cmd="justifyLeft"   title="Linksbündig">${icon('alignLeft', 16)}</button>
          <button class="tb-btn" data-cmd="justifyCenter" title="Zentriert">${icon('alignCenter', 16)}</button>
          <button class="tb-btn" data-cmd="justifyRight"  title="Rechtsbündig">${icon('alignRight', 16)}</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <select id="write-heading" aria-label="Überschrift" class="tb-select">
            <option value="">Absatz</option>
            <option value="H1">Überschrift 1</option>
            <option value="H2">Überschrift 2</option>
            <option value="H3">Überschrift 3</option>
          </select>
          <select id="write-fontsize" aria-label="Schriftgröße" class="tb-select">
            ${[10,11,12,13,14,16,18,20,24,28,36,48].map(s =>
              `<option value="${s}"${s===fontSize?' selected':''}>${s}</option>`
            ).join('')}
          </select>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="tb-btn" data-cmd="undo"  title="Rückgängig (Strg+Z)">${icon('undo', 16)}</button>
          <button class="tb-btn" data-cmd="redo"  title="Wiederholen (Strg+Y)">${icon('redo', 16)}</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="write-export-html">${icon('download', 15)} HTML</button>
          <button class="btn btn-ghost btn-sm" id="write-export-txt">${icon('download', 15)} TXT</button>
          <button class="btn btn-ghost btn-sm" id="write-print">${icon('printer', 15)} Drucken</button>
        </div>
      </div>

      <div class="write-scroll">
        <div class="write-page"
             id="write-editor"
             contenteditable="true"
             spellcheck="true"
             role="textbox"
             aria-multiline="true"
             aria-label="Dokument-Editor"
             style="font-size:${fontSize}px"></div>
      </div>

      <div class="statusbar">
        <span id="write-wordcount">0 Wörter</span>
        <span id="write-dirty"></span>
      </div>
    </div>
  `;

  const editor    = container.querySelector('#write-editor');
  const titleEl   = container.querySelector('#write-title');
  const dirtyEl   = container.querySelector('#write-dirty');
  const wcEl      = container.querySelector('#write-wordcount');

  // ── Helpers ───────────────────────────────────────────────────────────────
  function markDirty() {
    dirty = true;
    dirtyEl.textContent = '● Ungespeichert';
  }

  function markClean() {
    dirty = false;
    dirtyEl.textContent = '';
  }

  function getTitle() {
    return titleEl.textContent.trim() || 'Unbenannt';
  }

  function setTitle(t) {
    titleEl.textContent = t || 'Unbenannt';
  }

  function countWords() {
    const text = editor.innerText.trim();
    const words = text ? text.split(/\s+/).length : 0;
    wcEl.textContent = `${words} ${words === 1 ? 'Wort' : 'Wörter'}`;
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveDoc() {
    const title = getTitle();
    const html  = editor.innerHTML;
    if (!docId) docId = JarvisDB.genId();
    JarvisDB.saveDoc('write', docId, { title, html });
    markClean();
    showNotify('Gespeichert: ' + title, 'success');
  }

  function loadDocById(id) {
    const d = JarvisDB.loadDoc('write', id);
    if (!d) return;
    docId = id;
    setTitle(d.title);
    editor.innerHTML = Strix.sanitizeHTML(d.html || '');
    markClean();
    countWords();
    editor.focus();
  }

  function newDoc() {
    if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    docId = null;
    setTitle('Unbenannt');
    editor.innerHTML = '';
    markClean();
    countWords();
    editor.focus();
  }

  function openDocDialog() {
    const docs = JarvisDB.listDocs('write');
    if (!docs.length) { showNotify('Keine gespeicherten Dokumente.', 'info'); return; }

    const rows = docs.map(d => `
      <div class="doc-row" data-id="${sanitize(d.id)}" tabindex="0" role="button" aria-label="${sanitize(d.title)} öffnen">
        <span class="doc-row-title">${sanitize(d.title)}</span>
        <span class="doc-row-date">${formatDateTime(new Date(d.modified))}</span>
        <button class="btn btn-ghost btn-sm doc-delete" data-id="${sanitize(d.id)}" aria-label="Löschen">${icon('trash', 14)}</button>
      </div>`).join('');

    showModal(`
      <h3>Dokument öffnen</h3>
      <div class="doc-list">${rows}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
      </div>
    `, null);

    // attach click handlers after modal is in DOM
    container.querySelectorAll('.doc-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.doc-delete')) return;
        if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
        loadDocById(row.dataset.id);
        row.closest('.modal-overlay')?.remove();
      });
      row.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') row.click();
      });
    });
    container.querySelectorAll('.doc-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Dokument löschen?')) return;
        JarvisDB.deleteDoc('write', btn.dataset.id);
        btn.closest('.doc-row').remove();
        if (docId === btn.dataset.id) { docId = null; setTitle('Unbenannt'); editor.innerHTML = ''; markClean(); }
      });
    });
  }

  // ── Auto-save ─────────────────────────────────────────────────────────────
  autoSaveTimer = setInterval(() => { if (dirty && docId) saveDoc(); }, 30000);

  // ── Toolbar commands ──────────────────────────────────────────────────────
  function execCmd(cmd, val = null) {
    editor.focus();
    document.execCommand(cmd, false, val);
    markDirty();
  }

  container.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
    btn.addEventListener('mousedown', e => {
      e.preventDefault(); // keep focus in editor
      execCmd(btn.dataset.cmd);
    });
  });

  container.querySelector('#write-heading').addEventListener('change', function () {
    if (this.value) execCmd('formatBlock', this.value);
    else execCmd('formatBlock', 'P');
    this.value = '';
  });

  container.querySelector('#write-fontsize').addEventListener('change', function () {
    execCmd('fontSize', 7);
    // execCommand fontSize only supports 1-7; use span hack for exact px
    const spans = editor.querySelectorAll('font[size="7"]');
    spans.forEach(s => {
      const sp = document.createElement('span');
      sp.style.fontSize = this.value + 'px';
      s.replaceWith(...(sp.append(...s.childNodes), [sp]));
    });
  });

  // ── Document events ───────────────────────────────────────────────────────
  editor.addEventListener('input', () => { markDirty(); countWords(); });
  editor.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
  });

  container.querySelector('.back-btn').addEventListener('click', () => {
    if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    clearInterval(autoSaveTimer);
    goHome();
  });

  container.querySelector('#write-new').addEventListener('click', newDoc);
  container.querySelector('#write-open').addEventListener('click', openDocDialog);
  container.querySelector('#write-save').addEventListener('click', saveDoc);

  container.querySelector('#write-export-html').addEventListener('click', () => {
    downloadFile(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${getTitle()}</title></head><body>${editor.innerHTML}</body></html>`,
      getTitle() + '.html', 'text/html');
  });
  container.querySelector('#write-export-txt').addEventListener('click', () => {
    downloadFile(editor.innerText, getTitle() + '.txt', 'text/plain');
  });
  container.querySelector('#write-print').addEventListener('click', () => {
    const w = window.open('', '_blank');
    w.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${getTitle()}</title><style>body{font-family:Georgia,serif;max-width:800px;margin:40px auto;padding:0 20px;line-height:1.6}</style></head><body>${editor.innerHTML}</body></html>`);
    w.document.close();
    w.print();
  });

  // Allow inline title rename
  titleEl.setAttribute('contenteditable', 'true');
  titleEl.addEventListener('input', markDirty);
  titleEl.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); } });

  countWords();
  editor.focus();
}
