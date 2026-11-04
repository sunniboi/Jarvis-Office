import Store from '../../core/store.js';
import { uid, now, toast, debounce, el } from '../../core/utils.js';

const STORE_KEY = 'jarvis_write_docs';

const FONTS = ['Inter', 'monospace', 'serif'];
const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 36, 48, 72];

function svgIcon(path, size = 16) {
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
}

const ICONS = {
  back:        svgIcon('<polyline points="15 18 9 12 15 6"/>'),
  new:         svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/>'),
  open:        svgIcon('<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/>'),
  save:        svgIcon('<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/>'),
  bold:        svgIcon('<path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/><path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"/>'),
  italic:      svgIcon('<line x1="19" y1="4" x2="10" y2="4"/><line x1="14" y1="20" x2="5" y2="20"/><line x1="15" y1="4" x2="9" y2="20"/>'),
  underline:   svgIcon('<path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"/><line x1="4" y1="21" x2="20" y2="21"/>'),
  strike:      svgIcon('<line x1="18" y1="6" x2="6" y2="6"/><line x1="6" y1="12" x2="18" y2="12"/><line x1="8" y1="18" x2="16" y2="18"/>'),
  alignLeft:   svgIcon('<line x1="17" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="17" y1="18" x2="3" y2="18"/>'),
  alignCenter: svgIcon('<line x1="18" y1="10" x2="6" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="18" y1="18" x2="6" y2="18"/>'),
  alignRight:  svgIcon('<line x1="21" y1="10" x2="7" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="7" y2="18"/>'),
  alignJustify:svgIcon('<line x1="21" y1="10" x2="3" y2="10"/><line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="14" x2="3" y2="14"/><line x1="21" y1="18" x2="3" y2="18"/>'),
  ul:          svgIcon('<line x1="9" y1="6" x2="20" y2="6"/><line x1="9" y1="12" x2="20" y2="12"/><line x1="9" y1="18" x2="20" y2="18"/><circle cx="4" cy="6" r="2"/><circle cx="4" cy="12" r="2"/><circle cx="4" cy="18" r="2"/>'),
  ol:          svgIcon('<line x1="10" y1="6" x2="21" y2="6"/><line x1="10" y1="12" x2="21" y2="12"/><line x1="10" y1="18" x2="21" y2="18"/><path d="M4 6h1v4"/><path d="M4 10h2"/><path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/>'),
  hr:          svgIcon('<line x1="5" y1="12" x2="19" y2="12"/>'),
  link:        svgIcon('<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>'),
  table:       svgIcon('<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="3" x2="9" y2="21"/><line x1="15" y1="3" x2="15" y2="21"/>'),
  undo:        svgIcon('<polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/>'),
  redo:        svgIcon('<polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/>'),
  search:      svgIcon('<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>'),
  download:    svgIcon('<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>'),
  trash:       svgIcon('<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>'),
  textColor:   svgIcon('<path d="M4 20h16"/><path d="M6 16l6-12 6 12"/><path d="M8.5 11h7"/>'),
  bgColor:     svgIcon('<rect x="2" y="2" width="20" height="20" rx="2"/><path d="M8 12h8"/><path d="M12 8v8"/>'),
};

function tbBtn(cmd, iconHtml, title) {
  return `<button class="tb-btn" data-cmd="${cmd}" title="${title}" type="button">${iconHtml}</button>`;
}

function buildHTML(state) {
  return `
<div class="app-chrome write-app">
  <div class="titlebar">
    <button class="btn-icon back-btn" title="Zurück">${ICONS.back}</button>
    <span class="app-title" id="write-title" contenteditable="true" spellcheck="false">Unbenannt</span>
    <div class="titlebar-actions">
      <button class="btn btn-ghost btn-sm" id="write-new">${ICONS.new} Neu</button>
      <button class="btn btn-ghost btn-sm" id="write-open">${ICONS.open} Öffnen</button>
      <button class="btn btn-primary btn-sm" id="write-save">${ICONS.save} Speichern</button>
    </div>
  </div>

  <div class="toolbar" role="toolbar" aria-label="Formatierung">
    <div class="toolbar-group">
      <select id="write-font" class="tb-select" title="Schriftart">
        <option value="Inter">Inter</option>
        <option value="monospace">Mono</option>
        <option value="serif">Serif</option>
      </select>
      <select id="write-size" class="tb-select" title="Schriftgröße" style="width:52px">
        ${SIZES.map(s => `<option value="${s}"${s === 14 ? ' selected' : ''}>${s}</option>`).join('')}
      </select>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      ${tbBtn('bold', ICONS.bold, 'Fett (Strg+B)')}
      ${tbBtn('italic', ICONS.italic, 'Kursiv (Strg+I)')}
      ${tbBtn('underline', ICONS.underline, 'Unterstrichen (Strg+U)')}
      ${tbBtn('strikeThrough', ICONS.strike, 'Durchgestrichen')}
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <label class="tb-color-wrap" title="Schriftfarbe">
        ${ICONS.textColor}
        <input type="color" id="write-fg-color" value="#e2e8f0" class="tb-color-input">
      </label>
      <label class="tb-color-wrap" title="Hintergrundfarbe">
        ${ICONS.bgColor}
        <input type="color" id="write-bg-color" value="#0d0d1a" class="tb-color-input">
      </label>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      ${tbBtn('justifyLeft', ICONS.alignLeft, 'Linksbündig')}
      ${tbBtn('justifyCenter', ICONS.alignCenter, 'Zentriert')}
      ${tbBtn('justifyRight', ICONS.alignRight, 'Rechtsbündig')}
      ${tbBtn('justifyFull', ICONS.alignJustify, 'Blocksatz')}
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <select id="write-heading" class="tb-select" title="Überschrift" style="width:100px">
        <option value="">Absatz</option>
        <option value="h1">Überschrift 1</option>
        <option value="h2">Überschrift 2</option>
        <option value="h3">Überschrift 3</option>
        <option value="h4">Überschrift 4</option>
      </select>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      ${tbBtn('insertUnorderedList', ICONS.ul, 'Aufzählungsliste')}
      ${tbBtn('insertOrderedList', ICONS.ol, 'Nummerierte Liste')}
      ${tbBtn('insertHorizontalRule', ICONS.hr, 'Trennlinie')}
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="tb-btn" id="write-link-btn" title="Link einfügen" type="button">${ICONS.link}</button>
      <button class="tb-btn" id="write-table-btn" title="Tabelle einfügen" type="button">${ICONS.table}</button>
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      ${tbBtn('undo', ICONS.undo, 'Rückgängig (Strg+Z)')}
      ${tbBtn('redo', ICONS.redo, 'Wiederholen (Strg+Y)')}
    </div>
    <div class="toolbar-sep"></div>
    <div class="toolbar-group">
      <button class="btn btn-ghost btn-sm" id="write-search-btn" type="button">${ICONS.search}</button>
      <button class="btn btn-ghost btn-sm" id="write-export-html" type="button">${ICONS.download} HTML</button>
      <button class="btn btn-ghost btn-sm" id="write-export-txt" type="button">${ICONS.download} TXT</button>
    </div>
  </div>

  <div id="write-search-panel" class="write-search-panel" hidden>
    <input type="text" id="write-find" placeholder="Suchen…" class="tb-input">
    <input type="text" id="write-replace" placeholder="Ersetzen…" class="tb-input">
    <button class="btn btn-ghost btn-sm" id="write-do-replace" type="button">Ersetzen</button>
    <button class="btn btn-ghost btn-sm" id="write-do-replace-all" type="button">Alle ersetzen</button>
    <button class="btn btn-icon" id="write-search-close" type="button">&times;</button>
  </div>

  <div class="write-scroll">
    <div class="write-page"
         id="write-editor"
         contenteditable="true"
         spellcheck="true"
         role="textbox"
         aria-multiline="true"
         aria-label="Dokument-Editor"></div>
  </div>

  <div class="statusbar">
    <span id="write-wordcount">0 Wörter · 0 Zeichen</span>
    <span id="write-save-status"></span>
  </div>
</div>`;
}

function buildModalHTML(docs) {
  if (!docs.length) {
    return `<div class="modal-overlay" id="write-modal">
      <div class="modal">
        <h3>Dokument öffnen</h3>
        <p class="text-muted">Keine gespeicherten Dokumente.</p>
        <div class="modal-actions"><button class="btn btn-ghost" id="write-modal-close">Schließen</button></div>
      </div>
    </div>`;
  }
  const rows = docs.map(d => `
    <div class="doc-row" data-id="${d.id}" tabindex="0" role="button">
      <span class="doc-row-title">${d.name || 'Unbenannt'}</span>
      <span class="doc-row-date text-muted" style="font-size:var(--text-xs)">${new Date(d.modified).toLocaleString('de-DE')}</span>
      <button class="btn btn-icon doc-delete" data-id="${d.id}" title="Löschen" type="button">${ICONS.trash}</button>
    </div>`).join('');
  return `<div class="modal-overlay" id="write-modal">
    <div class="modal">
      <h3>Dokument öffnen</h3>
      <div class="doc-list">${rows}</div>
      <div class="modal-actions"><button class="btn btn-ghost" id="write-modal-close">Abbrechen</button></div>
    </div>
  </div>`;
}

export default {
  id: 'write',
  label: 'Write',
  color: 'var(--app-write)',
  icon: svgIcon('<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/>', 24),

  mount(container) {
    // --- state ---
    let docId = null;
    let dirty = false;
    const cleanup = [];

    container.innerHTML = buildHTML();

    const q = sel => container.querySelector(sel);
    const editor    = q('#write-editor');
    const titleEl   = q('#write-title');
    const saveStatus= q('#write-save-status');
    const wcEl      = q('#write-wordcount');
    const searchPanel = q('#write-search-panel');

    // --- helpers ---
    function getDocs() { return Store.get(STORE_KEY, {}); }
    function saveDocs(docs) { Store.set(STORE_KEY, docs); }

    function markDirty() {
      dirty = true;
      saveStatus.textContent = '● Ungespeichert';
    }
    function markClean() {
      dirty = false;
      saveStatus.textContent = '';
    }

    function updateWordCount() {
      const text = editor.innerText.trim();
      const words = text ? text.split(/\s+/).length : 0;
      const chars = editor.innerText.length;
      wcEl.textContent = `${words} ${words === 1 ? 'Wort' : 'Wörter'} · ${chars} Zeichen`;
    }

    function saveDoc() {
      const name = titleEl.textContent.trim() || 'Unbenannt';
      if (!docId) docId = uid();
      const docs = getDocs();
      docs[docId] = { id: docId, name, html: editor.innerHTML, modified: now() };
      saveDocs(docs);
      markClean();
      toast('Gespeichert: ' + name, 'success');
    }

    function loadDoc(id) {
      const docs = getDocs();
      const d = docs[id];
      if (!d) return;
      docId = id;
      titleEl.textContent = d.name || 'Unbenannt';
      editor.innerHTML = d.html || '';
      markClean();
      updateWordCount();
      editor.focus();
    }

    function newDoc() {
      if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
      docId = null;
      titleEl.textContent = 'Unbenannt';
      editor.innerHTML = '';
      markClean();
      updateWordCount();
      editor.focus();
    }

    function openModal() {
      const docs = getDocs();
      const list = Object.values(docs).sort((a, b) => b.modified.localeCompare(a.modified));
      const overlay = document.createElement('div');
      overlay.innerHTML = buildModalHTML(list);
      const inner = overlay.firstElementChild;
      document.body.append(inner);

      const closeModal = () => inner.remove();

      const closeBtn = inner.querySelector('#write-modal-close');
      if (closeBtn) {
        const h = () => closeModal();
        closeBtn.addEventListener('click', h);
        cleanup.push(() => closeBtn.removeEventListener('click', h));
      }

      inner.querySelectorAll('.doc-row').forEach(row => {
        row.addEventListener('click', e => {
          if (e.target.closest('.doc-delete')) return;
          if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
          loadDoc(row.dataset.id);
          closeModal();
        });
        row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') row.click(); });
      });

      inner.querySelectorAll('.doc-delete').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (!confirm('Dokument löschen?')) return;
          const docs2 = getDocs();
          delete docs2[btn.dataset.id];
          saveDocs(docs2);
          btn.closest('.doc-row')?.remove();
          if (docId === btn.dataset.id) {
            docId = null;
            titleEl.textContent = 'Unbenannt';
            editor.innerHTML = '';
            markClean();
          }
        });
      });

      inner.addEventListener('click', e => { if (e.target === inner) closeModal(); });
    }

    function execCmd(cmd, val = null) {
      editor.focus();
      document.execCommand(cmd, false, val);
      markDirty();
    }

    function downloadBlob(content, filename, mime) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], { type: mime }));
      a.download = filename;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    }

    // --- auto-save ---
    const autoSaveTimer = setInterval(() => { if (dirty && docId) saveDoc(); }, 30000);
    cleanup.push(() => clearInterval(autoSaveTimer));

    // --- debounced input ---
    const debouncedDirty = debounce(() => { markDirty(); updateWordCount(); }, 500);

    // --- toolbar: simple exec commands ---
    container.querySelectorAll('.tb-btn[data-cmd]').forEach(btn => {
      const h = e => { e.preventDefault(); execCmd(btn.dataset.cmd); };
      btn.addEventListener('mousedown', h);
      cleanup.push(() => btn.removeEventListener('mousedown', h));
    });

    // --- font family ---
    const fontSel = q('#write-font');
    const fontH = function() { execCmd('fontName', this.value); };
    fontSel.addEventListener('change', fontH);
    cleanup.push(() => fontSel.removeEventListener('change', fontH));

    // --- font size ---
    const sizeSel = q('#write-size');
    const sizeH = function() {
      // execCommand fontSize only does 1-7; use a wrapper span for exact px
      const saved = window.getSelection()?.getRangeAt(0)?.cloneRange();
      document.execCommand('fontSize', false, '7');
      editor.querySelectorAll('font[size="7"]').forEach(f => {
        const sp = document.createElement('span');
        sp.style.fontSize = this.value + 'px';
        sp.append(...f.childNodes);
        f.replaceWith(sp);
      });
      markDirty();
    };
    sizeSel.addEventListener('change', sizeH);
    cleanup.push(() => sizeSel.removeEventListener('change', sizeH));

    // --- heading ---
    const headingSel = q('#write-heading');
    const headingH = function() {
      execCmd('formatBlock', this.value || 'p');
      this.value = '';
    };
    headingSel.addEventListener('change', headingH);
    cleanup.push(() => headingSel.removeEventListener('change', headingH));

    // --- text color ---
    const fgColor = q('#write-fg-color');
    const fgH = function() { execCmd('foreColor', this.value); };
    fgColor.addEventListener('input', fgH);
    cleanup.push(() => fgColor.removeEventListener('input', fgH));

    // --- bg color ---
    const bgColor = q('#write-bg-color');
    const bgH = function() { execCmd('hiliteColor', this.value); };
    bgColor.addEventListener('input', bgH);
    cleanup.push(() => bgColor.removeEventListener('input', bgH));

    // --- link ---
    const linkBtn = q('#write-link-btn');
    const linkH = () => {
      const url = prompt('URL eingeben:');
      if (url) execCmd('createLink', url);
    };
    linkBtn.addEventListener('click', linkH);
    cleanup.push(() => linkBtn.removeEventListener('click', linkH));

    // --- table ---
    const tableBtn = q('#write-table-btn');
    const tableH = () => {
      const rows = parseInt(prompt('Zeilen:', '3'), 10) || 3;
      const cols = parseInt(prompt('Spalten:', '3'), 10) || 3;
      let html = '<table border="1" style="border-collapse:collapse;width:100%"><tbody>';
      for (let r = 0; r < rows; r++) {
        html += '<tr>';
        for (let c = 0; c < cols; c++) html += '<td style="padding:6px 8px;min-width:60px">&nbsp;</td>';
        html += '</tr>';
      }
      html += '</tbody></table><p><br></p>';
      document.execCommand('insertHTML', false, html);
      markDirty();
    };
    tableBtn.addEventListener('click', tableH);
    cleanup.push(() => tableBtn.removeEventListener('click', tableH));

    // --- search panel ---
    const searchBtn = q('#write-search-btn');
    const searchClose = q('#write-search-close');
    const doReplace = q('#write-do-replace');
    const doReplaceAll = q('#write-do-replace-all');

    const searchBtnH = () => { searchPanel.hidden = !searchPanel.hidden; if (!searchPanel.hidden) q('#write-find').focus(); };
    const searchCloseH = () => { searchPanel.hidden = true; };

    const replaceH = () => {
      const find = q('#write-find').value;
      const rep = q('#write-replace').value;
      if (!find) return;
      const sel = window.getSelection();
      const range = sel?.getRangeAt(0);
      // simple text node replacement for selected or first occurrence
      const text = editor.innerHTML;
      const idx = text.indexOf(find);
      if (idx === -1) { toast('Nicht gefunden', 'info'); return; }
      editor.innerHTML = text.slice(0, idx) + rep + text.slice(idx + find.length);
      markDirty();
    };

    const replaceAllH = () => {
      const find = q('#write-find').value;
      const rep = q('#write-replace').value;
      if (!find) return;
      const escaped = find.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      editor.innerHTML = editor.innerHTML.replaceAll(find, rep);
      markDirty();
      toast('Ersetzt', 'success');
    };

    searchBtn.addEventListener('click', searchBtnH);
    searchClose.addEventListener('click', searchCloseH);
    doReplace.addEventListener('click', replaceH);
    doReplaceAll.addEventListener('click', replaceAllH);
    cleanup.push(
      () => searchBtn.removeEventListener('click', searchBtnH),
      () => searchClose.removeEventListener('click', searchCloseH),
      () => doReplace.removeEventListener('click', replaceH),
      () => doReplaceAll.removeEventListener('click', replaceAllH),
    );

    // --- editor events ---
    const editorInputH = () => debouncedDirty();
    const editorKeyH = e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'h') { e.preventDefault(); searchBtnH(); }
    };
    editor.addEventListener('input', editorInputH);
    editor.addEventListener('keydown', editorKeyH);
    cleanup.push(
      () => editor.removeEventListener('input', editorInputH),
      () => editor.removeEventListener('keydown', editorKeyH),
    );

    // --- title rename ---
    const titleH = () => markDirty();
    const titleKeyH = e => { if (e.key === 'Enter') { e.preventDefault(); editor.focus(); } };
    titleEl.addEventListener('input', titleH);
    titleEl.addEventListener('keydown', titleKeyH);
    cleanup.push(
      () => titleEl.removeEventListener('input', titleH),
      () => titleEl.removeEventListener('keydown', titleKeyH),
    );

    // --- toolbar action buttons ---
    const backBtn = q('.back-btn');
    const backH = () => {
      if (dirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
      window.__jarvis?.showLauncher();
    };
    backBtn.addEventListener('click', backH);
    cleanup.push(() => backBtn.removeEventListener('click', backH));

    const newBtn = q('#write-new');
    newBtn.addEventListener('click', newDoc);
    cleanup.push(() => newBtn.removeEventListener('click', newDoc));

    const openBtn = q('#write-open');
    openBtn.addEventListener('click', openModal);
    cleanup.push(() => openBtn.removeEventListener('click', openModal));

    const saveBtn = q('#write-save');
    saveBtn.addEventListener('click', saveDoc);
    cleanup.push(() => saveBtn.removeEventListener('click', saveDoc));

    const exportHtmlBtn = q('#write-export-html');
    const exportHtmlH = () => {
      const name = titleEl.textContent.trim() || 'Unbenannt';
      downloadBlob(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>${name}</title></head><body>${editor.innerHTML}</body></html>`, name + '.html', 'text/html');
    };
    exportHtmlBtn.addEventListener('click', exportHtmlH);
    cleanup.push(() => exportHtmlBtn.removeEventListener('click', exportHtmlH));

    const exportTxtBtn = q('#write-export-txt');
    const exportTxtH = () => {
      const name = titleEl.textContent.trim() || 'Unbenannt';
      downloadBlob(editor.innerText, name + '.txt', 'text/plain');
    };
    exportTxtBtn.addEventListener('click', exportTxtH);
    cleanup.push(() => exportTxtBtn.removeEventListener('click', exportTxtH));

    updateWordCount();
    editor.focus();
  },

  unmount() {
    // cleanup is scoped inside mount; called via stored ref if needed
    // For safety: cleanup array is local to mount, so this is intentionally empty
    // Parent (router) should call mount's returned cleanup if extended
  }
};
