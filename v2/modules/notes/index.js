import Store from '../../core/store.js';
import { uid, now, toast, debounce } from '../../core/utils.js';

const STORE_KEY = 'jarvis_notes';

const ICON_BACK = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4L6 10l6 6"/></svg>`;
const ICON_PLUS = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 4v12M4 10h12"/></svg>`;
const ICON_TRASH = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>`;
const ICON_PIN = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M9 1l2 6 5 1-4 4 1 6-4-3-4 3 1-6L2 8l5-1z"/></svg>`;
const ICON_SEARCH = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="8" cy="8" r="5"/><path d="M13 13l4 4"/></svg>`;

function loadNotes() { return Store.get(STORE_KEY, []); }
function saveNotes(notes) { Store.set(STORE_KEY, notes); }

function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function sanitize(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

export default {
  id: 'notes',
  label: 'Notes',
  color: 'var(--app-notes)',
  icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="2" width="14" height="17" rx="2"/><path d="M7 7h6M7 11h6M7 15h4"/></svg>`,

  _state: null,

  mount(container) {
    const state = {
      notes: loadNotes(),
      selectedId: null,
      query: '',
      listeners: [],
      timers: [],
    };
    this._state = state;

    // Inject styles
    if (!document.getElementById('notes-styles')) {
      const s = document.createElement('style');
      s.id = 'notes-styles';
      s.textContent = `
        .notes-app *{box-sizing:border-box;}
        .ntbtn{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:var(--text-sm);cursor:pointer;}
        .ntbtn:hover{background:var(--surface-hi);}
        .ntbtn-primary{background:var(--accent);border-color:var(--accent);color:var(--on-accent);}
        .ntbtn-primary:hover{background:var(--accent-hi);}
        .ntbtn-icon{padding:4px;background:none;border:none;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;border-radius:var(--r-sm);}
        .ntbtn-icon:hover{background:var(--surface-hi);color:var(--text);}
        .ntbtn-icon.active{color:var(--accent);}
        .note-card{padding:var(--sp-3);border-bottom:1px solid var(--border);cursor:pointer;transition:background .1s;}
        .note-card:hover{background:var(--surface);}
        .note-card.active{background:var(--surface-hi);border-left:3px solid var(--accent);}
        .note-card-title{font-size:var(--text-md);font-weight:600;color:var(--text);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .note-card-preview{font-size:var(--text-sm);color:var(--text-muted);margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
        .note-card-meta{font-size:var(--text-xs);color:var(--text-faint);margin-top:4px;display:flex;align-items:center;gap:6px;}
        .note-card.pinned .note-card-title::before{content:'📌 ';}
        .notes-empty{padding:var(--sp-6);text-align:center;color:var(--text-muted);font-size:var(--text-md);}
        .notes-search{width:100%;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:var(--text-sm);padding:6px 10px;outline:none;}
        .notes-search:focus{border-color:var(--accent);}
        .notes-editor{width:100%;flex:1;background:transparent;border:none;resize:none;color:var(--text);font-family:var(--font-sans);font-size:var(--text-md);line-height:1.6;outline:none;padding:var(--sp-4);}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;}
        .modal-box{background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-5);min-width:300px;}
      `;
      document.head.appendChild(s);
    }

    container.innerHTML = `
<div class="notes-app" style="display:flex;flex-direction:column;height:100%;background:var(--bg);">
  <div style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:var(--h-titlebar);background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0;">
    <button id="n-back" class="ntbtn-icon" title="Zurück">${ICON_BACK}</button>
    <span style="font-size:var(--text-md);font-weight:600;color:var(--text);flex:1;">Jarvis Notes</span>
    <button id="n-new" class="ntbtn ntbtn-primary">${ICON_PLUS} Neue Notiz</button>
  </div>
  <div style="display:flex;flex:1;overflow:hidden;">
    <!-- Sidebar -->
    <div style="width:260px;flex-shrink:0;display:flex;flex-direction:column;background:var(--bg-sunken);border-right:1px solid var(--border);">
      <div style="padding:var(--sp-2) var(--sp-3);border-bottom:1px solid var(--border);display:flex;align-items:center;gap:6px;">
        <span style="color:var(--text-muted);">${ICON_SEARCH}</span>
        <input id="n-search" class="notes-search" placeholder="Suchen…" aria-label="Notizen durchsuchen" style="flex:1;border:none;background:none;padding:4px 0;"/>
      </div>
      <div id="n-list" style="flex:1;overflow-y:auto;" role="list" aria-label="Notizen"></div>
      <div style="padding:var(--sp-2) var(--sp-3);border-top:1px solid var(--border);font-size:var(--text-xs);color:var(--text-faint);">
        <span id="n-count">0 Notizen</span>
      </div>
    </div>
    <!-- Editor -->
    <div style="flex:1;display:flex;flex-direction:column;overflow:hidden;">
      <div id="n-editor-header" style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:44px;border-bottom:1px solid var(--border);background:var(--bg-elevated);flex-shrink:0;">
        <input id="n-title" placeholder="Titel" style="flex:1;background:none;border:none;color:var(--text);font-size:var(--text-lg);font-weight:600;outline:none;" aria-label="Notiz-Titel"/>
        <button id="n-pin" class="ntbtn-icon" title="Anheften">${ICON_PIN}</button>
        <button id="n-del" class="ntbtn-icon" title="Löschen">${ICON_TRASH}</button>
      </div>
      <div id="n-no-selection" style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:var(--text-md);">
        Keine Notiz ausgewählt
      </div>
      <textarea id="n-body" class="notes-editor" placeholder="Notiz beginnen…" aria-label="Notizinhalt" style="display:none;"></textarea>
      <div id="n-save-indicator" style="height:var(--h-statusbar);background:var(--bg-elevated);border-top:1px solid var(--border);padding:0 var(--sp-3);display:flex;align-items:center;font-size:var(--text-xs);color:var(--text-faint);flex-shrink:0;"></div>
    </div>
  </div>
</div>`;

    const q = id => container.querySelector(id);
    const listEl = q('#n-list');
    const titleIn = q('#n-title');
    const bodyEl = q('#n-body');
    const searchEl = q('#n-search');
    const countEl = q('#n-count');
    const pinBtn = q('#n-pin');
    const saveInd = q('#n-save-indicator');
    const noSel = q('#n-no-selection');

    function sorted(arr) {
      return [...arr].sort((a, b) => {
        if (a.pinned !== b.pinned) return a.pinned ? -1 : 1;
        return (b.modified || '').localeCompare(a.modified || '');
      });
    }

    function filtered() {
      if (!state.query) return sorted(state.notes);
      const q2 = state.query.toLowerCase();
      return sorted(state.notes.filter(n =>
        (n.title || '').toLowerCase().includes(q2) ||
        (n.body || '').toLowerCase().includes(q2)
      ));
    }

    function renderList() {
      const vis = filtered();
      listEl.innerHTML = '';
      countEl.textContent = `${state.notes.length} Notiz${state.notes.length !== 1 ? 'en' : ''}`;

      if (!state.notes.length) {
        listEl.innerHTML = `<div class="notes-empty">Noch keine Notizen.<br>Erstelle eine mit +</div>`;
        return;
      }
      if (!vis.length) {
        listEl.innerHTML = `<div class="notes-empty">Keine Ergebnisse.</div>`;
        return;
      }

      vis.forEach(n => {
        const card = document.createElement('div');
        card.className = 'note-card' + (n.id === state.selectedId ? ' active' : '') + (n.pinned ? ' pinned' : '');
        card.setAttribute('role', 'listitem');
        card.setAttribute('tabindex', '0');
        const preview = (n.body || '').slice(0, 100).replace(/\n/g, ' ');
        card.innerHTML = `
          <div class="note-card-title">${sanitize(n.title) || '(kein Titel)'}</div>
          <div class="note-card-preview">${sanitize(preview)}</div>
          <div class="note-card-meta">${formatDate(n.modified || n.created)}</div>
        `;
        card.addEventListener('click', () => selectNote(n.id));
        card.addEventListener('keydown', e => { if (e.key === 'Enter') selectNote(n.id); });
        listEl.appendChild(card);
      });
    }

    function selectNote(id) {
      state.selectedId = id;
      const n = state.notes.find(x => x.id === id);
      if (!n) return;
      titleIn.value = n.title || '';
      bodyEl.value = n.body || '';
      bodyEl.style.display = 'block';
      noSel.style.display = 'none';
      pinBtn.classList.toggle('active', !!n.pinned);
      renderList();
    }

    function currentNote() { return state.notes.find(n => n.id === state.selectedId) || null; }

    // Autosave
    const doSave = debounce(() => {
      const n = currentNote();
      if (!n) return;
      n.title = titleIn.value;
      n.body = bodyEl.value;
      n.modified = now();
      saveNotes(state.notes);
      saveInd.textContent = 'Gespeichert';
      const t = setTimeout(() => { saveInd.textContent = ''; }, 1500);
      state.timers.push(t);
      renderList();
    }, 500);

    titleIn.addEventListener('input', doSave);
    bodyEl.addEventListener('input', doSave);

    q('#n-new').addEventListener('click', () => {
      const n = { id: uid(), title: 'Neue Notiz', body: '', pinned: false, created: now(), modified: now() };
      state.notes.unshift(n);
      saveNotes(state.notes);
      selectNote(n.id);
      titleIn.select();
    });

    q('#n-del').addEventListener('click', () => {
      if (!state.selectedId) return;
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `<div class="modal-box"><p style="color:var(--text);margin:0 0 var(--sp-4);">Notiz löschen?</p><div style="display:flex;gap:var(--sp-2);justify-content:flex-end;"><button class="ntbtn" id="del-cancel">Abbrechen</button><button class="ntbtn" id="del-confirm" style="background:var(--danger);border-color:var(--danger);color:#fff;">Löschen</button></div></div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#del-cancel').addEventListener('click', () => overlay.remove());
      overlay.querySelector('#del-confirm').addEventListener('click', () => {
        state.notes = state.notes.filter(n => n.id !== state.selectedId);
        saveNotes(state.notes);
        state.selectedId = state.notes.length ? sorted(state.notes)[0].id : null;
        overlay.remove();
        if (state.selectedId) selectNote(state.selectedId);
        else {
          titleIn.value = '';
          bodyEl.value = '';
          bodyEl.style.display = 'none';
          noSel.style.display = 'flex';
          renderList();
        }
      });
    });

    pinBtn.addEventListener('click', () => {
      const n = currentNote();
      if (!n) return;
      n.pinned = !n.pinned;
      n.modified = now();
      saveNotes(state.notes);
      pinBtn.classList.toggle('active', n.pinned);
      renderList();
    });

    searchEl.addEventListener('input', e => {
      state.query = e.target.value;
      renderList();
    });

    q('#n-back').addEventListener('click', () => {
      // Flush pending save
      const n = currentNote();
      if (n) { n.title = titleIn.value; n.body = bodyEl.value; n.modified = now(); saveNotes(state.notes); }
      window.__jarvis?.showLauncher();
    });

    // Init
    renderList();
    if (state.notes.length) selectNote(sorted(state.notes)[0].id);
  },

  unmount() {
    if (!this._state) return;
    for (const t of this._state.timers) clearTimeout(t);
    const s = document.getElementById('notes-styles');
    if (s) s.remove();
    this._state = null;
  }
};
