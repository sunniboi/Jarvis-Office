import Store from '../../core/store.js';
import { uid, now, el, toast, debounce } from '../../core/utils.js';

const STORE_KEY = 'jarvis_matrix_docs';
const COL_TYPES = ['text','number','date','checkbox','select','progress','star-rating','url','email','phone','color','formula'];

const DEFAULT_COLS = [
  { id: 'c1', name: 'Name',   type: 'text' },
  { id: 'c2', name: 'Status', type: 'select', options: ['Offen','In Arbeit','Erledigt'] },
  { id: 'c3', name: 'Datum',  type: 'date' },
  { id: 'c4', name: 'Notiz',  type: 'text' },
];

function sanitize(str) {
  return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function evalFormula(formula, row, columns) {
  const m = formula.match(/^=(SUM|AVERAGE|COUNT|MAX|MIN)\(([^)]+)\)/i);
  if (!m) return formula;
  const fn = m[1].toUpperCase();
  const refs = m[2].split(',').map(r => r.trim());
  const vals = [];
  for (const ref of refs) {
    const col = columns.find(c => c.name.toLowerCase() === ref.toLowerCase() || c.id === ref);
    if (col) {
      const v = parseFloat(row[col.id]);
      if (!isNaN(v)) vals.push(v);
    }
  }
  if (!vals.length) return 0;
  switch (fn) {
    case 'SUM':     return vals.reduce((a, b) => a + b, 0);
    case 'AVERAGE': return vals.reduce((a, b) => a + b, 0) / vals.length;
    case 'COUNT':   return vals.length;
    case 'MAX':     return Math.max(...vals);
    case 'MIN':     return Math.min(...vals);
  }
  return 0;
}

function renderCellValue(val, col, row, columns) {
  const v = val ?? '';
  switch (col.type) {
    case 'checkbox':
      return `<input type="checkbox" class="cell-check" data-col="${col.id}"${v ? ' checked' : ''} />`;
    case 'progress': {
      const pct = Math.min(100, Math.max(0, parseFloat(v) || 0));
      return `<div class="cell-progress"><div class="progress-bar" style="width:${pct}%"></div><span>${pct}%</span></div>`;
    }
    case 'star-rating': {
      const stars = parseInt(v) || 0;
      return Array.from({length:5}, (_,i) =>
        `<span class="star${i < stars ? ' filled' : ''}" data-col="${col.id}" data-val="${i+1}">★</span>`
      ).join('');
    }
    case 'url':
      return v ? `<a href="${sanitize(v)}" target="_blank" rel="noopener" class="cell-link">${sanitize(v)}</a>` : '';
    case 'email':
      return v ? `<a href="mailto:${sanitize(v)}" class="cell-link">${sanitize(v)}</a>` : '';
    case 'phone':
      return v ? `<a href="tel:${sanitize(v)}" class="cell-link">${sanitize(v)}</a>` : '';
    case 'color':
      return `<div class="cell-color-wrap"><span class="cell-color-swatch" style="background:${sanitize(v) || '#888'}"></span>${sanitize(v)}</div>`;
    case 'formula': {
      const result = evalFormula(String(v), row, columns);
      return `<span class="cell-formula-result">${result}</span>`;
    }
    default:
      return sanitize(v);
  }
}

function renderEditInput(val, col) {
  const v = val ?? '';
  switch (col.type) {
    case 'text':
    case 'url':
    case 'email':
    case 'phone':
    case 'formula':
      return `<input type="text" class="cell-edit-input" value="${sanitize(v)}" />`;
    case 'number':
    case 'progress':
      return `<input type="number" class="cell-edit-input" value="${sanitize(v)}" />`;
    case 'date':
      return `<input type="date" class="cell-edit-input" value="${sanitize(v)}" />`;
    case 'checkbox':
      return `<input type="checkbox" class="cell-edit-check"${v ? ' checked' : ''} />`;
    case 'select': {
      const opts = (col.options || []).map(o =>
        `<option value="${sanitize(o)}"${o === v ? ' selected' : ''}>${sanitize(o)}</option>`
      ).join('');
      return `<select class="cell-edit-input">${opts}</select>`;
    }
    case 'star-rating':
      return `<input type="number" min="0" max="5" class="cell-edit-input" value="${sanitize(v)}" />`;
    case 'color':
      return `<input type="color" class="cell-edit-color" value="${sanitize(v) || '#7c3aed'}" />`;
    default:
      return `<input type="text" class="cell-edit-input" value="${sanitize(v)}" />`;
  }
}

const MatrixModule = {
  id: 'matrix',
  label: 'Matrix',
  color: 'var(--app-matrix)',
  icon: `<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
    <rect x="2" y="2" width="16" height="16" rx="2"/>
    <line x1="2" y1="7" x2="18" y2="7"/>
    <line x1="2" y1="12" x2="18" y2="12"/>
    <line x1="7" y1="2" x2="7" y2="18"/>
  </svg>`,

  _state: null,
  _listeners: [],
  _timers: [],

  mount(container) {
    const state = {
      docId: null,
      dirty: false,
      columns: DEFAULT_COLS.map(c => ({...c})),
      rows: [],
      filters: {},
      condFmt: [],
      sortCol: null,
      sortDir: 1,
      search: '',
      colWidths: {},
    };
    this._state = state;
    this._listeners = [];
    this._timers = [];

    container.innerHTML = `
<style>
.mx-app { display:flex; flex-direction:column; height:100%; background:var(--bg); color:var(--text); font-family:var(--font-sans); font-size:var(--text-md); }
.mx-titlebar { display:flex; align-items:center; gap:var(--sp-2); padding:0 var(--sp-4); height:var(--h-titlebar); background:var(--bg-elevated); border-bottom:1px solid var(--border); flex-shrink:0; }
.mx-title { flex:1; border:none; background:transparent; color:var(--text); font-size:var(--text-lg); font-weight:600; outline:none; }
.mx-toolbar { display:flex; align-items:center; gap:var(--sp-2); padding:0 var(--sp-3); height:var(--h-toolbar); background:var(--bg-elevated); border-bottom:1px solid var(--border); flex-shrink:0; flex-wrap:wrap; }
.mx-sep { width:1px; height:20px; background:var(--border); margin:0 var(--sp-1); }
.mx-scroll { flex:1; overflow:auto; }
.mx-table { border-collapse:collapse; width:max-content; min-width:100%; }
.mx-table th, .mx-table td { border:1px solid var(--border); padding:var(--sp-1) var(--sp-2); white-space:nowrap; vertical-align:middle; font-size:var(--text-sm); }
.mx-table th { background:var(--surface); position:sticky; top:0; z-index:2; user-select:none; cursor:pointer; }
.mx-table th:hover { background:var(--surface-hi); }
.mx-table td { background:var(--bg); min-width:80px; max-width:240px; overflow:hidden; text-overflow:ellipsis; cursor:default; }
.mx-table td.editing { padding:0; }
.mx-table tr:hover td { background:var(--bg-elevated); }
.th-inner { display:flex; align-items:center; gap:var(--sp-1); }
.th-resize { width:4px; cursor:col-resize; height:100%; position:absolute; right:0; top:0; background:transparent; }
.th-wrap { position:relative; }
.sort-arrow { font-size:10px; opacity:0.5; }
.sort-arrow.active { opacity:1; color:var(--accent); }
.col-menu-btn { background:none; border:none; cursor:pointer; color:var(--text-muted); padding:0 2px; font-size:11px; opacity:0; transition:opacity .15s; }
th:hover .col-menu-btn { opacity:1; }
.row-num { color:var(--text-faint); text-align:right; min-width:32px; font-size:11px; background:var(--bg-sunken) !important; }
.row-del-btn { background:none; border:none; cursor:pointer; color:var(--danger); opacity:0; padding:2px 4px; }
tr:hover .row-del-btn { opacity:1; }
.cell-progress { display:flex; align-items:center; gap:var(--sp-2); }
.progress-bar { height:6px; background:var(--accent); border-radius:var(--r-full); }
.cell-progress > div { width:60px; background:var(--border); border-radius:var(--r-full); overflow:hidden; }
.star { cursor:pointer; color:var(--border-hi); font-size:16px; }
.star.filled { color:var(--warning); }
.cell-link { color:var(--accent-hi); text-decoration:none; }
.cell-link:hover { text-decoration:underline; }
.cell-color-wrap { display:flex; align-items:center; gap:var(--sp-2); }
.cell-color-swatch { width:14px; height:14px; border-radius:var(--r-sm); border:1px solid var(--border); display:inline-block; flex-shrink:0; }
.cell-formula-result { font-weight:600; color:var(--accent-hi); }
.cell-edit-input, .cell-edit-color { width:100%; border:none; background:var(--surface-hi); color:var(--text); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); font-family:var(--font-sans); outline:2px solid var(--accent); }
.cell-edit-check { margin:0 auto; display:block; width:16px; height:16px; }
.mx-statusbar { display:flex; align-items:center; gap:var(--sp-4); padding:0 var(--sp-4); height:var(--h-statusbar); background:var(--bg-elevated); border-top:1px solid var(--border); font-size:var(--text-xs); color:var(--text-muted); flex-shrink:0; }
.mx-dirty { color:var(--warning); }
.btn { display:inline-flex; align-items:center; gap:var(--sp-1); padding:var(--sp-1) var(--sp-3); border-radius:var(--r-sm); border:1px solid transparent; cursor:pointer; font-size:var(--text-sm); font-family:var(--font-sans); font-weight:500; transition:background .15s; }
.btn-ghost { background:transparent; border-color:var(--border); color:var(--text-muted); }
.btn-ghost:hover { background:var(--surface); color:var(--text); }
.btn-primary { background:var(--accent); color:var(--on-accent); border-color:var(--accent); }
.btn-primary:hover { background:var(--accent-hi); }
.btn-danger { background:var(--danger); color:var(--on-danger); border-color:var(--danger); }
.btn-icon { background:transparent; border:none; cursor:pointer; color:var(--text-muted); display:inline-flex; align-items:center; justify-content:center; padding:var(--sp-1); border-radius:var(--r-sm); }
.btn-icon:hover { background:var(--surface); color:var(--text); }
.tb-search { background:var(--surface); border:1px solid var(--border); color:var(--text); border-radius:var(--r-sm); padding:var(--sp-1) var(--sp-3); font-size:var(--text-sm); width:160px; }
.tb-search:focus { outline:2px solid var(--accent); outline-offset:-1px; }
/* Modal */
.mx-modal-overlay { position:fixed; inset:0; background:rgba(0,0,0,.55); display:flex; align-items:center; justify-content:center; z-index:1000; }
.mx-modal { background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-lg); padding:var(--sp-6); min-width:320px; max-width:480px; box-shadow:var(--shadow-lg); }
.mx-modal h3 { margin:0 0 var(--sp-4); font-size:var(--text-xl); }
.form-row { display:flex; flex-direction:column; gap:var(--sp-1); margin-bottom:var(--sp-3); }
.form-row label { font-size:var(--text-sm); color:var(--text-muted); }
.form-row input, .form-row select, .form-row textarea { background:var(--surface); border:1px solid var(--border); color:var(--text); border-radius:var(--r-sm); padding:var(--sp-2) var(--sp-3); font-size:var(--text-sm); font-family:var(--font-sans); }
.form-row input:focus, .form-row select:focus { outline:2px solid var(--accent); outline-offset:-1px; }
.modal-actions { display:flex; justify-content:flex-end; gap:var(--sp-2); margin-top:var(--sp-4); }
.doc-list { display:flex; flex-direction:column; gap:var(--sp-2); max-height:300px; overflow:auto; margin-bottom:var(--sp-4); }
.doc-row { display:flex; align-items:center; gap:var(--sp-3); padding:var(--sp-2) var(--sp-3); background:var(--surface); border-radius:var(--r-md); cursor:pointer; border:1px solid transparent; }
.doc-row:hover { border-color:var(--accent); }
.doc-row-title { flex:1; font-weight:500; }
.doc-row-date { font-size:var(--text-xs); color:var(--text-muted); }
/* Filter dropdown */
.filter-dropdown { position:absolute; top:100%; left:0; background:var(--bg-elevated); border:1px solid var(--border); border-radius:var(--r-md); padding:var(--sp-3); z-index:50; min-width:180px; box-shadow:var(--shadow-md); }
.filter-dropdown input, .filter-dropdown select { width:100%; background:var(--surface); border:1px solid var(--border); color:var(--text); border-radius:var(--r-sm); padding:var(--sp-1) var(--sp-2); font-size:var(--text-sm); margin-bottom:var(--sp-2); }
.filter-clear { font-size:var(--text-xs); color:var(--accent-hi); cursor:pointer; }
/* Cond fmt badge */
.cond-badge { display:inline-block; padding:1px 6px; border-radius:var(--r-full); font-size:11px; }
</style>
<div class="mx-app" id="mx-root">
  <div class="mx-titlebar">
    <button class="btn-icon" id="mx-back" aria-label="Zurück">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5l-7 5 7 5"/></svg>
    </button>
    <input class="mx-title" id="mx-title" value="Matrix1" spellcheck="false" />
    <button class="btn btn-ghost" id="mx-new" style="font-size:var(--text-sm)">Neu</button>
    <button class="btn btn-ghost" id="mx-open" style="font-size:var(--text-sm)">Öffnen</button>
    <button class="btn btn-primary" id="mx-save" style="font-size:var(--text-sm)">Speichern</button>
  </div>
  <div class="mx-toolbar">
    <button class="btn btn-ghost" id="mx-add-row">+ Zeile</button>
    <button class="btn btn-ghost" id="mx-add-col">+ Spalte</button>
    <button class="btn btn-ghost" id="mx-filter-reset">Filter ×</button>
    <div class="mx-sep"></div>
    <button class="btn btn-ghost" id="mx-export-csv">CSV</button>
    <button class="btn btn-ghost" id="mx-export-json">JSON</button>
    <div class="mx-sep"></div>
    <button class="btn btn-ghost" id="mx-cond-fmt">Bed. Formatierung</button>
    <div class="mx-sep"></div>
    <input type="search" class="tb-search" id="mx-search" placeholder="Suchen…" />
  </div>
  <div class="mx-scroll" id="mx-scroll">
    <table class="mx-table" id="mx-table"></table>
  </div>
  <div class="mx-statusbar">
    <span id="mx-count">0 Einträge</span>
    <span id="mx-dirty" class="mx-dirty"></span>
  </div>
</div>`;

    const root      = container.querySelector('#mx-root');
    const tableEl   = container.querySelector('#mx-table');
    const titleEl   = container.querySelector('#mx-title');
    const countEl   = container.querySelector('#mx-count');
    const dirtyEl   = container.querySelector('#mx-dirty');
    const searchEl  = container.querySelector('#mx-search');

    const markDirty = () => { state.dirty = true; dirtyEl.textContent = '● Ungespeichert'; };
    const markClean = () => { state.dirty = false; dirtyEl.textContent = ''; };

    // ── Visible rows ──────────────────────────────────────────────────────────
    function getVisible() {
      let rows = [...state.rows];
      const q = state.search.toLowerCase();
      if (q) {
        rows = rows.filter(r => state.columns.some(c => String(r[c.id] ?? '').toLowerCase().includes(q)));
      }
      for (const [colId, fval] of Object.entries(state.filters)) {
        if (!fval) continue;
        rows = rows.filter(r => String(r[colId] ?? '').toLowerCase().includes(fval.toLowerCase()));
      }
      if (state.sortCol) {
        rows.sort((a, b) => {
          const av = a[state.sortCol] ?? '';
          const bv = b[state.sortCol] ?? '';
          return String(av).localeCompare(String(bv), undefined, {numeric:true}) * state.sortDir;
        });
      }
      return rows;
    }

    // ── Render table ──────────────────────────────────────────────────────────
    function render() {
      const visible = getVisible();
      const cols = state.columns;

      let html = '<thead><tr><th class="row-num">#</th>';
      cols.forEach(col => {
        const isSort = state.sortCol === col.id;
        const arrow  = isSort ? (state.sortDir === 1 ? '▲' : '▼') : '▲';
        const hasFilter = !!state.filters[col.id];
        const w = state.colWidths[col.id] ? `width:${state.colWidths[col.id]}px` : '';
        html += `<th class="th-wrap" data-col="${col.id}" style="${w}">
          <div class="th-inner">
            <span class="th-label">${sanitize(col.name)}</span>
            <span class="sort-arrow${isSort ? ' active' : ''}">${arrow}</span>
            ${hasFilter ? '<span style="color:var(--accent);font-size:10px">▼</span>' : ''}
            <button class="col-menu-btn" data-col="${col.id}" title="Spaltenmenü">⋯</button>
          </div>
          <div class="th-resize" data-col="${col.id}"></div>
        </th>`;
      });
      html += '<th style="width:32px"></th></tr></thead><tbody>';

      visible.forEach((row, i) => {
        html += `<tr data-rid="${row.id}"><td class="row-num">${i + 1}</td>`;
        cols.forEach(col => {
          const val = row[col.id];
          let bgStyle = '';
          const fmtRule = state.condFmt.find(r => r.colId === col.id);
          if (fmtRule && col.type === 'number' || col.type === 'progress') {
            const n = parseFloat(val);
            if (fmtRule && !isNaN(n) && n > parseFloat(fmtRule.threshold)) {
              bgStyle = `background:${fmtRule.color}22;`;
            }
          }
          html += `<td data-col="${col.id}" data-row="${row.id}" style="${bgStyle}">${renderCellValue(val, col, row, cols)}</td>`;
        });
        html += `<td><button class="row-del-btn" data-rid="${row.id}" aria-label="Zeile löschen">✕</button></td></tr>`;
      });
      html += '</tbody>';
      tableEl.innerHTML = html;
      countEl.textContent = `${visible.length} / ${state.rows.length} Einträge`;
      bindTableEvents();
    }

    // ── Table event binding ───────────────────────────────────────────────────
    function bindTableEvents() {
      // Sort on header click
      tableEl.querySelectorAll('th.th-wrap').forEach(th => {
        th.querySelector('.th-label')?.addEventListener('click', () => {
          const col = th.dataset.col;
          if (state.sortCol === col) state.sortDir *= -1;
          else { state.sortCol = col; state.sortDir = 1; }
          render();
        });
        // Column menu
        th.querySelector('.col-menu-btn')?.addEventListener('click', e => {
          e.stopPropagation();
          showColMenu(th.dataset.col, th);
        });
        // Col resize
        th.querySelector('.th-resize')?.addEventListener('mousedown', e => startResize(e, th.dataset.col, th));
      });

      // Row delete
      tableEl.querySelectorAll('.row-del-btn').forEach(btn => {
        btn.addEventListener('click', () => {
          state.rows = state.rows.filter(r => r.id !== btn.dataset.rid);
          markDirty();
          render();
        });
      });

      // Star rating click
      tableEl.querySelectorAll('.star').forEach(s => {
        s.addEventListener('click', e => {
          const td = e.target.closest('td');
          const rid = td?.dataset.row;
          const col = td?.dataset.col;
          const row = state.rows.find(r => r.id === rid);
          if (row && col) { row[col] = parseInt(s.dataset.val); markDirty(); render(); }
        });
      });

      // Checkbox toggle
      tableEl.querySelectorAll('.cell-check').forEach(cb => {
        cb.addEventListener('change', e => {
          const td = e.target.closest('td');
          const rid = td?.dataset.row;
          const col = td?.dataset.col;
          const row = state.rows.find(r => r.id === rid);
          if (row && col) { row[col] = cb.checked; markDirty(); }
        });
      });

      // Double-click to edit
      tableEl.querySelectorAll('td[data-col][data-row]').forEach(td => {
        td.addEventListener('dblclick', () => startEdit(td));
      });
    }

    // ── Inline editing ────────────────────────────────────────────────────────
    function startEdit(td) {
      const colId = td.dataset.col;
      const rowId = td.dataset.row;
      const col   = state.columns.find(c => c.id === colId);
      const row   = state.rows.find(r => r.id === rowId);
      if (!col || !row) return;

      td.classList.add('editing');
      td.innerHTML = renderEditInput(row[colId], col);
      const input = td.querySelector('input, select');
      input?.focus();

      const commit = () => {
        let val;
        if (col.type === 'checkbox') val = td.querySelector('.cell-edit-check')?.checked ?? false;
        else val = input?.value ?? '';
        row[colId] = val;
        markDirty();
        td.classList.remove('editing');
        td.innerHTML = renderCellValue(val, col, row, state.columns);
        // rebind stars/checkbox on this cell
        td.querySelectorAll('.star').forEach(s => {
          s.addEventListener('click', e => {
            row[colId] = parseInt(s.dataset.val); markDirty(); render();
          });
        });
        td.querySelector('.cell-check')?.addEventListener('change', e => {
          row[colId] = e.target.checked; markDirty();
        });
      };

      input?.addEventListener('blur', commit);
      input?.addEventListener('keydown', e => {
        if (e.key === 'Enter') { e.preventDefault(); commit(); }
        if (e.key === 'Escape') { td.classList.remove('editing'); render(); }
      });
    }

    // ── Column resize ─────────────────────────────────────────────────────────
    function startResize(e, colId, th) {
      e.preventDefault();
      const startX = e.clientX;
      const startW = th.offsetWidth;
      const onMove = ev => {
        const w = Math.max(60, startW + ev.clientX - startX);
        state.colWidths[colId] = w;
        th.style.width = w + 'px';
      };
      const onUp = () => {
        document.removeEventListener('mousemove', onMove);
        document.removeEventListener('mouseup', onUp);
      };
      document.addEventListener('mousemove', onMove);
      document.addEventListener('mouseup', onUp);
    }

    // ── Column menu ───────────────────────────────────────────────────────────
    function showColMenu(colId, th) {
      const col = state.columns.find(c => c.id === colId);
      if (!col) return;
      closeDropdowns();
      const dd = el('div', { class: 'filter-dropdown' });
      dd.innerHTML = `
        <div style="font-weight:600;margin-bottom:var(--sp-2);font-size:var(--text-sm)">${sanitize(col.name)}</div>
        <div style="display:flex;flex-direction:column;gap:var(--sp-2)">
          <button class="btn btn-ghost" id="dd-edit">Umbenennen</button>
          <button class="btn btn-ghost" id="dd-filter">Filtern…</button>
          <button class="btn btn-danger" id="dd-del-col">Spalte löschen</button>
        </div>
        <div style="margin-top:var(--sp-3);border-top:1px solid var(--border);padding-top:var(--sp-2)">
          <label style="font-size:var(--text-xs);color:var(--text-muted)">Filter:</label>
          <input type="text" id="dd-filter-val" placeholder="Filter…" value="${sanitize(state.filters[colId] || '')}" />
          <span class="filter-clear" id="dd-filter-clear">× löschen</span>
        </div>`;
      th.style.position = 'relative';
      th.appendChild(dd);

      dd.querySelector('#dd-edit').onclick = () => { closeDropdowns(); renameColumn(colId); };
      dd.querySelector('#dd-del-col').onclick = () => {
        if (!confirm('Spalte löschen?')) return;
        state.columns = state.columns.filter(c => c.id !== colId);
        state.rows.forEach(r => delete r[colId]);
        markDirty(); closeDropdowns(); render();
      };
      dd.querySelector('#dd-filter').onclick = () => {
        const v = dd.querySelector('#dd-filter-val').value;
        state.filters[colId] = v;
        closeDropdowns(); render();
      };
      dd.querySelector('#dd-filter-val').addEventListener('keydown', e => {
        if (e.key === 'Enter') { state.filters[colId] = e.target.value; closeDropdowns(); render(); }
      });
      dd.querySelector('#dd-filter-clear').onclick = () => {
        delete state.filters[colId]; closeDropdowns(); render();
      };

      const handler = e => { if (!dd.contains(e.target)) closeDropdowns(); };
      setTimeout(() => document.addEventListener('click', handler), 0);
      this._listeners.push([document, 'click', handler]);
    }

    function closeDropdowns() {
      container.querySelectorAll('.filter-dropdown').forEach(d => d.remove());
    }

    // ── Rename column ─────────────────────────────────────────────────────────
    function renameColumn(colId) {
      const col = state.columns.find(c => c.id === colId);
      if (!col) return;
      showModal(`
        <h3>Spalte umbenennen</h3>
        <div class="form-row"><label>Name</label><input type="text" id="col-name-input" value="${sanitize(col.name)}" /></div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="m-cancel">Abbrechen</button>
          <button class="btn btn-primary" id="m-ok">Speichern</button>
        </div>`, modal => {
        col.name = modal.querySelector('#col-name-input').value.trim() || col.name;
        markDirty(); render();
      });
    }

    // ── Add column dialog ─────────────────────────────────────────────────────
    function addColumn() {
      const typeOpts = COL_TYPES.map(t => `<option value="${t}">${t}</option>`).join('');
      showModal(`
        <h3>Spalte hinzufügen</h3>
        <div class="form-row"><label>Name</label><input type="text" id="new-col-name" value="Neue Spalte" /></div>
        <div class="form-row"><label>Typ</label><select id="new-col-type">${typeOpts}</select></div>
        <div class="form-row" id="opts-wrap" style="display:none">
          <label>Optionen (kommagetrennt)</label>
          <input type="text" id="new-col-opts" placeholder="Option1, Option2" />
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="m-cancel">Abbrechen</button>
          <button class="btn btn-primary" id="m-ok">Hinzufügen</button>
        </div>`, modal => {
        const name    = modal.querySelector('#new-col-name').value.trim() || 'Spalte';
        const type    = modal.querySelector('#new-col-type').value;
        const optsRaw = modal.querySelector('#new-col-opts').value;
        const options = type === 'select' ? optsRaw.split(',').map(o => o.trim()).filter(Boolean) : undefined;
        state.columns.push({ id: uid(), name, type, ...(options ? {options} : {}) });
        markDirty(); render();
      });
      // show/hide select options
      setTimeout(() => {
        const sel  = container.querySelector('#new-col-type');
        const wrap = container.querySelector('#opts-wrap');
        sel?.addEventListener('change', () => { if (wrap) wrap.style.display = sel.value === 'select' ? '' : 'none'; });
      }, 50);
    }

    // ── Conditional formatting dialog ─────────────────────────────────────────
    function showCondFmt() {
      const colOpts = state.columns
        .filter(c => ['number','progress'].includes(c.type))
        .map(c => `<option value="${c.id}">${sanitize(c.name)}</option>`).join('');
      if (!colOpts) { toast('Keine Zahlen-Spalten vorhanden.', 'info'); return; }
      const existing = state.condFmt.map(r => {
        const col = state.columns.find(c => c.id === r.colId);
        return `<div style="display:flex;gap:var(--sp-2);align-items:center;margin-bottom:var(--sp-1)">
          <span style="flex:1">${sanitize(col?.name||r.colId)} &gt; ${r.threshold}</span>
          <span style="display:inline-block;width:16px;height:16px;border-radius:50%;background:${r.color}"></span>
          <button class="btn btn-icon cond-del" data-col="${r.colId}">✕</button>
        </div>`;
      }).join('') || '<div style="color:var(--text-muted);font-size:var(--text-sm)">Keine Regeln.</div>';
      showModal(`
        <h3>Bedingte Formatierung</h3>
        <div id="cond-list">${existing}</div>
        <div style="margin-top:var(--sp-3);border-top:1px solid var(--border);padding-top:var(--sp-3)">
          <div class="form-row"><label>Spalte</label><select id="cond-col">${colOpts}</select></div>
          <div class="form-row"><label>Wert &gt;</label><input type="number" id="cond-val" value="0" /></div>
          <div class="form-row"><label>Farbe</label><input type="color" id="cond-color" value="#7c3aed" /></div>
        </div>
        <div class="modal-actions">
          <button class="btn btn-ghost" id="m-cancel">Schließen</button>
          <button class="btn btn-primary" id="m-ok">Regel hinzufügen</button>
        </div>`, modal => {
        const colId     = modal.querySelector('#cond-col').value;
        const threshold = parseFloat(modal.querySelector('#cond-val').value) || 0;
        const color     = modal.querySelector('#cond-color').value;
        state.condFmt = state.condFmt.filter(r => r.colId !== colId);
        state.condFmt.push({ colId, threshold, color });
        markDirty(); render();
      });
      setTimeout(() => {
        container.querySelectorAll('.cond-del').forEach(btn => {
          btn.addEventListener('click', () => {
            state.condFmt = state.condFmt.filter(r => r.colId !== btn.dataset.col);
            markDirty();
            container.querySelector('.mx-modal-overlay')?.remove();
            render();
          });
        });
      }, 50);
    }

    // ── Save / Load ───────────────────────────────────────────────────────────
    function saveDoc() {
      const name = titleEl.value.trim() || 'Matrix1';
      if (!state.docId) state.docId = uid();
      const docs = Store.get(STORE_KEY, {});
      docs[state.docId] = { id: state.docId, name, columns: state.columns, rows: state.rows, filters: state.filters, condFmt: state.condFmt, modified: now() };
      Store.set(STORE_KEY, docs);
      markClean();
      toast('Gespeichert: ' + name, 'success');
    }

    function loadDocById(id) {
      const docs = Store.get(STORE_KEY, {});
      const d = docs[id];
      if (!d) return;
      state.docId   = id;
      state.columns = d.columns || DEFAULT_COLS.map(c=>({...c}));
      state.rows    = d.rows    || [];
      state.filters = d.filters || {};
      state.condFmt = d.condFmt || [];
      titleEl.value = d.name || 'Matrix1';
      markClean();
      render();
    }

    function newDoc() {
      if (state.dirty && !confirm('Änderungen verwerfen?')) return;
      state.docId   = null;
      state.columns = DEFAULT_COLS.map(c=>({...c}));
      state.rows    = [];
      state.filters = {};
      state.condFmt = [];
      state.sortCol = null;
      titleEl.value = 'Matrix1';
      markClean();
      render();
    }

    function openDocDialog() {
      const docs = Store.get(STORE_KEY, {});
      const list = Object.values(docs).sort((a,b) => b.modified.localeCompare(a.modified));
      if (!list.length) { toast('Keine Matrizen gespeichert.', 'info'); return; }
      const rows = list.map(d => `
        <div class="doc-row" data-id="${d.id}" tabindex="0" role="button">
          <span class="doc-row-title">${sanitize(d.name)}</span>
          <span class="doc-row-date">${sanitize(d.modified?.slice(0,10)||'')}</span>
          <button class="btn btn-icon doc-del" data-id="${d.id}">✕</button>
        </div>`).join('');
      showModal(`<h3>Matrix öffnen</h3><div class="doc-list">${rows}</div>
        <div class="modal-actions"><button class="btn btn-ghost" id="m-cancel">Abbrechen</button></div>`, null);
      setTimeout(() => {
        container.querySelectorAll('.doc-row').forEach(row => {
          row.addEventListener('click', e => {
            if (e.target.closest('.doc-del')) return;
            if (state.dirty && !confirm('Änderungen verwerfen?')) return;
            loadDocById(row.dataset.id);
            container.querySelector('.mx-modal-overlay')?.remove();
          });
        });
        container.querySelectorAll('.doc-del').forEach(btn => {
          btn.addEventListener('click', e => {
            e.stopPropagation();
            if (!confirm('Löschen?')) return;
            const docs = Store.get(STORE_KEY, {});
            delete docs[btn.dataset.id];
            Store.set(STORE_KEY, docs);
            btn.closest('.doc-row')?.remove();
          });
        });
      }, 50);
    }

    // ── Exports ───────────────────────────────────────────────────────────────
    function exportCSV() {
      const header = state.columns.map(c => c.name).join(',');
      const body   = state.rows.map(r =>
        state.columns.map(c => {
          const v = String(r[c.id] ?? '');
          return v.includes(',') || v.includes('"') ? `"${v.replace(/"/g,'""')}"` : v;
        }).join(',')
      ).join('\n');
      download(header + '\n' + body, (titleEl.value||'Matrix') + '.csv', 'text/csv');
    }

    function exportJSON() {
      const data = { name: titleEl.value, columns: state.columns, rows: state.rows };
      download(JSON.stringify(data, null, 2), (titleEl.value||'Matrix') + '.json', 'application/json');
    }

    function download(content, filename, mime) {
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob([content], {type: mime}));
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
    }

    // ── Modal helper ──────────────────────────────────────────────────────────
    function showModal(html, onOk) {
      const overlay = el('div', { class: 'mx-modal-overlay' });
      const modal   = el('div', { class: 'mx-modal' });
      modal.innerHTML = html;
      overlay.appendChild(modal);
      container.appendChild(overlay);
      modal.querySelector('#m-cancel')?.addEventListener('click', () => overlay.remove());
      overlay.addEventListener('click', e => { if (e.target === overlay) overlay.remove(); });
      if (onOk) {
        modal.querySelector('#m-ok')?.addEventListener('click', () => {
          onOk(modal);
          overlay.remove();
          render();
        });
      }
      modal.querySelector('input')?.focus();
    }

    // ── Event wiring ──────────────────────────────────────────────────────────
    const on = (el2, ev, fn) => { el2.addEventListener(ev, fn); this._listeners.push([el2, ev, fn]); };

    on(container.querySelector('#mx-back'), 'click', () => {
      if (state.dirty && !confirm('Änderungen verwerfen?')) return;
      container.dispatchEvent(new CustomEvent('jarvis:back', {bubbles:true}));
    });
    on(container.querySelector('#mx-new'),  'click', newDoc);
    on(container.querySelector('#mx-open'), 'click', openDocDialog);
    on(container.querySelector('#mx-save'), 'click', saveDoc);
    on(container.querySelector('#mx-add-row'), 'click', () => {
      state.rows.push({ id: uid() });
      markDirty();
      render();
    });
    on(container.querySelector('#mx-add-col'),     'click', () => addColumn());
    on(container.querySelector('#mx-filter-reset'), 'click', () => { state.filters = {}; render(); });
    on(container.querySelector('#mx-export-csv'),  'click', exportCSV);
    on(container.querySelector('#mx-export-json'), 'click', exportJSON);
    on(container.querySelector('#mx-cond-fmt'),    'click', () => showCondFmt());
    on(titleEl, 'input', markDirty);

    const debouncedSearch = debounce(v => { state.search = v; render(); }, 180);
    on(searchEl, 'input', e => debouncedSearch(e.target.value));

    on(root, 'keydown', e => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
    });

    render();
  },

  unmount() {
    for (const [target, ev, fn] of (this._listeners || [])) {
      target.removeEventListener(ev, fn);
    }
    this._listeners = [];
    for (const t of (this._timers || [])) clearTimeout(t);
    this._timers = [];
    this._state = null;
  }
};

export default MatrixModule;
