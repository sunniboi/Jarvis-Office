import Store from '../../core/store.js';
import { uid, now, toast, debounce } from '../../core/utils.js';

// ── helpers ──────────────────────────────────────────────────────────────────
const ROWS = 100, COLS = 26;
const STORE_KEY = 'jarvis_calc_docs';

function colLetter(c) { return String.fromCharCode(65 + c); }
function cellRef(r, c) { return colLetter(c) + (r + 1); }
function refToRC(ref) {
  const m = ref.match(/^([A-Z]+)(\d+)$/i);
  if (!m) return null;
  const col = m[1].toUpperCase().split('').reduce((n, ch) => n * 26 + ch.charCodeAt(0) - 64, 0) - 1;
  return [parseInt(m[2]) - 1, col];
}

function rangeRC(a, b) {
  const p = refToRC(a), q = refToRC(b);
  if (!p || !q) return [];
  const pairs = [];
  for (let r = Math.min(p[0], q[0]); r <= Math.max(p[0], q[0]); r++)
    for (let c = Math.min(p[1], q[1]); c <= Math.max(p[1], q[1]); c++)
      pairs.push([r, c]);
  return pairs;
}

// ── formula engine ────────────────────────────────────────────────────────────
function makeEval(cells) {
  function getVal(ref) {
    const cell = cells[ref.toUpperCase()];
    if (!cell) return 0;
    const n = Number(cell.value);
    return isNaN(n) ? cell.value : n;
  }
  function rangeVals(a, b) {
    return rangeRC(a, b).map(([r, c]) => getVal(cellRef(r, c)));
  }
  function sumRange(a, b) { return rangeVals(a, b).reduce((s, v) => s + (Number(v) || 0), 0); }

  return function evalFormula(raw) {
    if (!raw || !raw.startsWith('=')) {
      const n = Number(raw);
      return raw === '' ? '' : isNaN(n) ? raw : n;
    }
    let f = raw.slice(1).trim().toUpperCase();
    try {
      // IF(cond,a,b) — handle before generic replace
      f = f.replace(/IF\((.+?),(.+?),(.+?)\)/g, (_, cond, a, b) => {
        // evaluate cond inline after cell substitution
        return `(__IF__(${cond},${a},${b}))`;
      });
      // range functions
      f = f.replace(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => sumRange(a, b));
      f = f.replace(/AVERAGE\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        const v = rangeVals(a, b).map(Number).filter(n => !isNaN(n));
        return v.length ? v.reduce((s, n) => s + n, 0) / v.length : 0;
      });
      f = f.replace(/COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) =>
        rangeVals(a, b).filter(v => !isNaN(Number(v))).length);
      f = f.replace(/MAX\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        const v = rangeVals(a, b).map(Number).filter(n => !isNaN(n));
        return v.length ? Math.max(...v) : 0;
      });
      f = f.replace(/MIN\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        const v = rangeVals(a, b).map(Number).filter(n => !isNaN(n));
        return v.length ? Math.min(...v) : 0;
      });
      // cell references
      f = f.replace(/\b([A-Z]+\d+)\b/g, ref => {
        const v = getVal(ref);
        return typeof v === 'string' ? JSON.stringify(v) : v;
      });
      // __IF__ helper
      // eslint-disable-next-line no-new-func
      const result = Function(
        '"use strict";',
        `function __IF__(c,a,b){return c?a:b;}`,
        `return (${f});`
      )();
      if (result === null || result === undefined) return '';
      const n = Number(result);
      return isNaN(n) ? result : parseFloat(n.toPrecision(12));
    } catch {
      return '#ERR';
    }
  };
}

// ── storage helpers ───────────────────────────────────────────────────────────
function loadDocs() { return Store.get(STORE_KEY, {}); }
function saveDoc(id, doc) {
  const all = loadDocs();
  all[id] = doc;
  Store.set(STORE_KEY, all);
}
function deleteDoc(id) {
  const all = loadDocs();
  delete all[id];
  Store.set(STORE_KEY, all);
}

// ── module ────────────────────────────────────────────────────────────────────
let _cleanup = null;

function mount(container) {
  // ── state ──
  let cells = {};      // { 'A1': { raw, value, style: { bold, italic, underline, align } } }
  let docId = null;
  let docName = 'Tabelle1';
  let isDirty = false;
  let selected = { r: 0, c: 0 };
  let selRange = null; // { r1,c1,r2,c2 } for range selection
  let shiftAnchor = null;
  const dirty = new Set();
  const listeners = [];
  let evalFormula;

  function rebuildEval() { evalFormula = makeEval(cells); }
  rebuildEval();

  // ── render shell ──
  container.innerHTML = `
<div class="calc-app" style="display:flex;flex-direction:column;height:100%;background:var(--bg);color:var(--text);font-family:var(--font-sans);">
  <div class="titlebar" style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:var(--h-titlebar);background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0;">
    <button id="cc-back" title="Zurück" style="background:none;border:none;color:var(--text-muted);cursor:pointer;padding:var(--sp-1);border-radius:var(--r-sm);display:flex;align-items:center;">
      <svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4l-6 6 6 6"/></svg>
    </button>
    <span id="cc-name" contenteditable="true" style="flex:1;font-size:var(--text-md);font-weight:600;outline:none;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;" spellcheck="false">Tabelle1</span>
    <span id="cc-dirty" style="font-size:var(--text-xs);color:var(--text-muted);"></span>
    <button id="cc-new"  style="background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:2px 10px;border-radius:var(--r-sm);font-size:var(--text-sm);">Neu</button>
    <button id="cc-open" style="background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:2px 10px;border-radius:var(--r-sm);font-size:var(--text-sm);">Öffnen</button>
    <button id="cc-save" style="background:var(--accent);border:none;color:var(--on-accent);cursor:pointer;padding:2px 10px;border-radius:var(--r-sm);font-size:var(--text-sm);">Speichern</button>
  </div>

  <div class="toolbar" style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:var(--h-toolbar);background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0;">
    <span id="cc-ref" style="min-width:52px;text-align:center;font-size:var(--text-sm);font-weight:600;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:2px 6px;">A1</span>
    <input id="cc-fbar" type="text" placeholder="Wert oder =Formel" spellcheck="false"
      style="flex:1;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:var(--text-md);padding:3px 8px;outline:none;" />
    <div style="width:1px;height:20px;background:var(--border);"></div>
    <button id="cc-bold" title="Fett" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-weight:700;font-size:13px;padding:2px 6px;border-radius:var(--r-sm);">B</button>
    <button id="cc-italic" title="Kursiv" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-style:italic;font-size:13px;padding:2px 6px;border-radius:var(--r-sm);">I</button>
    <button id="cc-under" title="Unterstrichen" style="background:none;border:none;color:var(--text-muted);cursor:pointer;text-decoration:underline;font-size:13px;padding:2px 6px;border-radius:var(--r-sm);">U</button>
    <div style="width:1px;height:20px;background:var(--border);"></div>
    <button id="cc-al" title="Links" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px;padding:2px 6px;border-radius:var(--r-sm);">&#9664;</button>
    <button id="cc-ac" title="Mitte" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px;padding:2px 6px;border-radius:var(--r-sm);">&#9632;</button>
    <button id="cc-ar" title="Rechts" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:11px;padding:2px 6px;border-radius:var(--r-sm);">&#9654;</button>
    <div style="width:1px;height:20px;background:var(--border);"></div>
    <button id="cc-autosum" style="background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:2px 8px;border-radius:var(--r-sm);font-size:var(--text-sm);">∑ AutoSum</button>
    <button id="cc-sort-asc" style="background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:2px 8px;border-radius:var(--r-sm);font-size:var(--text-sm);">↑ Sortieren</button>
    <button id="cc-sort-desc" style="background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:2px 8px;border-radius:var(--r-sm);font-size:var(--text-sm);">↓ Sortieren</button>
    <button id="cc-csv" style="background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:2px 8px;border-radius:var(--r-sm);font-size:var(--text-sm);">CSV</button>
  </div>

  <div id="cc-scroll" style="flex:1;overflow:auto;position:relative;">
    <table id="cc-table" role="grid" style="border-collapse:collapse;table-layout:fixed;min-width:100%;">
      <colgroup id="cc-cols"></colgroup>
      <thead id="cc-thead"></thead>
      <tbody id="cc-tbody"></tbody>
    </table>
  </div>

  <div class="statusbar" style="display:flex;align-items:center;gap:var(--sp-4);padding:0 var(--sp-3);height:var(--h-statusbar);background:var(--bg-elevated);border-top:1px solid var(--border);font-size:var(--text-xs);color:var(--text-muted);flex-shrink:0;">
    <span id="cc-status">Bereit</span>
    <span id="cc-agg"></span>
  </div>
</div>

<style>
#cc-table th,#cc-table td{border:1px solid var(--border);padding:0 4px;white-space:nowrap;overflow:hidden;height:22px;font-size:var(--text-md);}
#cc-table th{background:var(--bg-elevated);color:var(--text-muted);font-weight:500;text-align:center;user-select:none;position:sticky;}
#cc-table thead th{top:0;z-index:2;}
#cc-table tbody th{left:0;z-index:1;min-width:36px;text-align:right;font-size:var(--text-xs);}
#cc-table td{background:var(--bg);cursor:cell;min-width:80px;}
#cc-table td.cc-sel{background:rgba(124,58,237,0.18);outline:2px solid var(--accent);}
#cc-table td.cc-range{background:rgba(124,58,237,0.08);}
#cc-table td.cc-active{background:var(--bg);}
#cc-table td.cc-err{color:var(--danger);}
#cc-table td.cc-formula{color:var(--accent-hi);}
#cc-fbar:focus{border-color:var(--accent);box-shadow:var(--shadow-glow);}
</style>`;

  const nameEl  = container.querySelector('#cc-name');
  const dirtyEl = container.querySelector('#cc-dirty');
  const refBox  = container.querySelector('#cc-ref');
  const fbar    = container.querySelector('#cc-fbar');
  const statusEl= container.querySelector('#cc-status');
  const aggEl   = container.querySelector('#cc-agg');
  const tbody   = container.querySelector('#cc-tbody');
  const thead   = container.querySelector('#cc-thead');

  // ── build table skeleton ──
  (function buildSkeleton() {
    const hrow = document.createElement('tr');
    const corner = document.createElement('th');
    corner.style.minWidth = '36px';
    hrow.appendChild(corner);
    for (let c = 0; c < COLS; c++) {
      const th = document.createElement('th');
      th.textContent = colLetter(c);
      th.style.minWidth = '80px';
      hrow.appendChild(th);
    }
    thead.appendChild(hrow);

    const frag = document.createDocumentFragment();
    for (let r = 0; r < ROWS; r++) {
      const tr = document.createElement('tr');
      const rh = document.createElement('th');
      rh.textContent = r + 1;
      tr.appendChild(rh);
      for (let c = 0; c < COLS; c++) {
        const td = document.createElement('td');
        td.dataset.r = r;
        td.dataset.c = c;
        td.setAttribute('tabindex', '-1');
        td.setAttribute('role', 'gridcell');
        tr.appendChild(td);
      }
      frag.appendChild(tr);
    }
    tbody.appendChild(frag);
  })();

  function cellEl(r, c) {
    // fast lookup via row index
    const row = tbody.children[r];
    return row ? row.children[c + 1] : null;
  }

  // ── dirty-only rendering ──
  function flushDirty() {
    for (const k of dirty) {
      const rc = refToRC(k);
      if (!rc) continue;
      const [r, c] = rc;
      const td = cellEl(r, c);
      if (!td) continue;
      const cell = cells[k];
      const display = cell ? String(cell.value === '' || cell.value === undefined ? '' : cell.value) : '';
      td.textContent = display;
      td.className = '';
      if (display === '#ERR' || display === '#DIV/0' || display === '#WERT') td.classList.add('cc-err');
      else if (cell?.raw?.startsWith('=')) td.classList.add('cc-formula');
      applyCellStyle(td, cell?.style);
    }
    dirty.clear();
    rerenderSelection();
  }

  function applyCellStyle(td, style) {
    if (!style) return;
    td.style.fontWeight     = style.bold      ? '700' : '';
    td.style.fontStyle      = style.italic    ? 'italic' : '';
    td.style.textDecoration = style.underline ? 'underline' : '';
    td.style.textAlign      = style.align || '';
  }

  function scheduleFlush() { requestAnimationFrame(flushDirty); }

  // ── cell data write ──
  function setCellRaw(r, c, raw, style) {
    const k = cellRef(r, c);
    if (raw === '' && !style) {
      delete cells[k];
    } else {
      const existing = cells[k] || {};
      const newStyle = style !== undefined ? style : existing.style;
      rebuildEval();
      const value = evalFormula(raw);
      cells[k] = { raw, value, style: newStyle };
    }
    dirty.add(k);
    markDirtyDependents(k);
    setUnsaved();
    scheduleFlush();
  }

  // mark dependents dirty (cells with formulas referencing k)
  function markDirtyDependents(ref) {
    for (const [k, cell] of Object.entries(cells)) {
      if (cell.raw?.startsWith('=') && cell.raw.toUpperCase().includes(ref)) {
        dirty.add(k);
      }
    }
  }

  function setUnsaved() {
    isDirty = true;
    dirtyEl.textContent = '● Ungespeichert';
  }

  // ── selection ──
  function rerenderSelection() {
    tbody.querySelectorAll('.cc-sel,.cc-range').forEach(td => td.classList.remove('cc-sel','cc-range'));
    if (!selRange) {
      const td = cellEl(selected.r, selected.c);
      if (td) td.classList.add('cc-sel');
    } else {
      const { r1,c1,r2,c2 } = selRange;
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        const td = cellEl(r, c);
        if (td) td.classList.add(r === selected.r && c === selected.c ? 'cc-sel' : 'cc-range');
      }
    }
  }

  function selectCell(r, c, addToRange) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    if (addToRange && shiftAnchor) {
      selRange = {
        r1: Math.min(shiftAnchor.r, r), c1: Math.min(shiftAnchor.c, c),
        r2: Math.max(shiftAnchor.r, r), c2: Math.max(shiftAnchor.c, c)
      };
    } else {
      selRange = null;
      shiftAnchor = { r, c };
    }
    selected = { r, c };
    const td = cellEl(r, c);
    if (td) td.focus({ preventScroll: false });
    const k = cellRef(r, c);
    refBox.textContent = k;
    fbar.value = cells[k]?.raw || '';
    updateStatus();
    rerenderSelection();
    updateAgg();
  }

  function updateStatus() {
    const k = cellRef(selected.r, selected.c);
    const v = cells[k]?.value;
    statusEl.textContent = v !== undefined && v !== '' ? String(v) : 'Bereit';
  }

  function updateAgg() {
    if (!selRange) { aggEl.textContent = ''; return; }
    const { r1,c1,r2,c2 } = selRange;
    const nums = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
      const v = Number(cells[cellRef(r,c)]?.value);
      if (!isNaN(v)) nums.push(v);
    }
    if (!nums.length) { aggEl.textContent = ''; return; }
    const sum = nums.reduce((a,b)=>a+b,0);
    aggEl.textContent = `Summe: ${parseFloat(sum.toPrecision(12))}  Ø: ${parseFloat((sum/nums.length).toPrecision(6))}  Anzahl: ${nums.length}`;
  }

  // ── load doc data into grid ──
  function loadCells(newCells) {
    // clear existing display
    tbody.querySelectorAll('td').forEach(td => {
      td.textContent = '';
      td.className = '';
      td.style.cssText = '';
    });
    cells = newCells;
    for (const k of Object.keys(cells)) dirty.add(k);
    rebuildEval();
    // recalc all formula cells
    for (const [k, cell] of Object.entries(cells)) {
      if (cell.raw?.startsWith('=')) {
        cell.value = evalFormula(cell.raw);
        dirty.add(k);
      }
    }
    flushDirty();
  }

  // ── events: table ──
  function on(el, type, fn) { el.addEventListener(type, fn); listeners.push([el, type, fn]); }

  on(tbody, 'mousedown', e => {
    const td = e.target.closest('td');
    if (!td) return;
    selectCell(Number(td.dataset.r), Number(td.dataset.c), e.shiftKey);
  });

  on(tbody, 'keydown', e => {
    const { r, c } = selected;
    switch (e.key) {
      case 'ArrowRight': e.preventDefault(); selectCell(r, c+1, e.shiftKey); break;
      case 'ArrowLeft':  e.preventDefault(); selectCell(r, c-1, e.shiftKey); break;
      case 'ArrowDown':  e.preventDefault(); selectCell(r+1, c, e.shiftKey); break;
      case 'ArrowUp':    e.preventDefault(); selectCell(r-1, c, e.shiftKey); break;
      case 'Tab':        e.preventDefault(); selectCell(r, c+(e.shiftKey?-1:1)); break;
      case 'Enter':      e.preventDefault(); selectCell(r+1, c); break;
      case 'F2':         fbar.focus(); fbar.select(); break;
      case 'Delete':
      case 'Backspace':
        if (e.target.tagName === 'TD') { setCellRaw(r, c, ''); fbar.value = ''; }
        break;
      default:
        if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
          fbar.value = e.key;
          fbar.focus();
        }
    }
  });

  // ── formula bar ──
  on(fbar, 'keydown', e => {
    if (e.key === 'Enter') {
      commitFbar();
      selectCell(selected.r + 1, selected.c);
    } else if (e.key === 'Escape') {
      fbar.value = cells[cellRef(selected.r, selected.c)]?.raw || '';
      cellEl(selected.r, selected.c)?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitFbar();
      selectCell(selected.r, selected.c + (e.shiftKey ? -1 : 1));
    }
  });

  function commitFbar() {
    setCellRaw(selected.r, selected.c, fbar.value);
    cellEl(selected.r, selected.c)?.focus();
  }

  // ── toolbar buttons ──
  function toggleStyle(prop) {
    const k = cellRef(selected.r, selected.c);
    const style = { ...(cells[k]?.style || {}) };
    style[prop] = !style[prop];
    const raw = cells[k]?.raw || '';
    setCellRaw(selected.r, selected.c, raw, style);
  }

  on(container.querySelector('#cc-back'), 'click', () => {
    if (isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    window.__jarvis?.showLauncher();
  });
  on(container.querySelector('#cc-bold'),   'click', () => toggleStyle('bold'));
  on(container.querySelector('#cc-italic'), 'click', () => toggleStyle('italic'));
  on(container.querySelector('#cc-under'),  'click', () => toggleStyle('underline'));
  on(container.querySelector('#cc-al'), 'click', () => { const k=cellRef(selected.r,selected.c); const s={...(cells[k]?.style||{}),align:'left'}; setCellRaw(selected.r,selected.c,cells[k]?.raw||'',s); });
  on(container.querySelector('#cc-ac'), 'click', () => { const k=cellRef(selected.r,selected.c); const s={...(cells[k]?.style||{}),align:'center'}; setCellRaw(selected.r,selected.c,cells[k]?.raw||'',s); });
  on(container.querySelector('#cc-ar'), 'click', () => { const k=cellRef(selected.r,selected.c); const s={...(cells[k]?.style||{}),align:'right'}; setCellRaw(selected.r,selected.c,cells[k]?.raw||'',s); });

  on(container.querySelector('#cc-autosum'), 'click', () => {
    // sum the column above selected cell
    const { r, c } = selected;
    if (r === 0) return;
    const top = cellRef(0, c), above = cellRef(r - 1, c);
    setCellRaw(r, c, `=SUM(${top}:${above})`);
    fbar.value = cells[cellRef(r,c)]?.raw || '';
  });

  on(container.querySelector('#cc-sort-asc'), 'click', () => sortCol('asc'));
  on(container.querySelector('#cc-sort-desc'), 'click', () => sortCol('desc'));

  function sortCol(dir) {
    const col = selected.c;
    // collect non-empty rows in that column
    const rowData = [];
    for (let r = 0; r < ROWS; r++) {
      const k = cellRef(r, col);
      rowData.push({ r, val: cells[k]?.value ?? '' });
    }
    rowData.sort((a, b) => {
      const na = Number(a.val), nb = Number(b.val);
      if (!isNaN(na) && !isNaN(nb)) return dir === 'asc' ? na - nb : nb - na;
      return dir === 'asc' ? String(a.val).localeCompare(String(b.val)) : String(b.val).localeCompare(String(a.val));
    });
    // rebuild that column
    rowData.forEach(({ r: srcRow }, destRow) => {
      const srcKey = cellRef(srcRow, col);
      const destKey = cellRef(destRow, col);
      const src = cells[srcKey];
      if (src) cells[destKey] = { ...src };
      else delete cells[destKey];
      dirty.add(destKey);
    });
    rebuildEval();
    scheduleFlush();
    setUnsaved();
  }

  on(container.querySelector('#cc-csv'), 'click', exportCSV);
  function exportCSV() {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const v = String(cells[cellRef(r,c)]?.value ?? '');
        row.push(v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g,'""')}"` : v);
      }
      // trim trailing empties
      while (row.length && row[row.length-1] === '') row.pop();
      if (row.length) rows.push(row.join(','));
    }
    const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = (docName || 'Tabelle') + '.csv';
    a.click();
  }

  // Ctrl+S
  on(container, 'keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); doSave(); }
  });

  // name edit
  on(nameEl, 'input', () => { docName = nameEl.textContent.trim() || 'Tabelle1'; setUnsaved(); });

  // ── save / load ──
  on(container.querySelector('#cc-save'), 'click', doSave);
  on(container.querySelector('#cc-new'), 'click', doNew);
  on(container.querySelector('#cc-open'), 'click', doOpen);

  function doSave() {
    if (!docId) docId = uid();
    const doc = { id: docId, name: docName, cells: { ...cells }, modified: now() };
    saveDoc(docId, doc);
    isDirty = false;
    dirtyEl.textContent = '';
    toast('Gespeichert: ' + docName, 'success');
  }

  function doNew() {
    if (isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    docId = null;
    docName = 'Tabelle1';
    nameEl.textContent = docName;
    isDirty = false;
    dirtyEl.textContent = '';
    loadCells({});
    selectCell(0, 0);
  }

  function doOpen() {
    const all = loadDocs();
    const list = Object.values(all).sort((a,b) => (b.modified||'').localeCompare(a.modified||''));
    if (!list.length) { toast('Keine gespeicherten Tabellen.', 'info'); return; }
    showDocModal(list);
  }

  function showDocModal(list) {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:999;';
    overlay.innerHTML = `
      <div style="background:var(--surface);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-6);min-width:360px;max-height:60vh;display:flex;flex-direction:column;gap:var(--sp-3);">
        <h3 style="margin:0;font-size:var(--text-xl);">Tabelle öffnen</h3>
        <div id="cc-doclist" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:var(--sp-2);">
          ${list.map(d => `
            <div class="cc-docrow" data-id="${d.id}" style="display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);background:var(--bg-elevated);border-radius:var(--r-md);cursor:pointer;">
              <span style="flex:1;font-size:var(--text-md);">${esc(d.name||'Tabelle')}</span>
              <span style="font-size:var(--text-xs);color:var(--text-muted);">${d.modified ? new Date(d.modified).toLocaleString('de-DE') : ''}</span>
              <button class="cc-deldoc" data-id="${d.id}" style="background:none;border:none;color:var(--text-muted);cursor:pointer;font-size:14px;" title="Löschen">✕</button>
            </div>`).join('')}
        </div>
        <button id="cc-modal-cancel" style="align-self:flex-end;background:none;border:1px solid var(--border);color:var(--text-muted);cursor:pointer;padding:4px 16px;border-radius:var(--r-sm);">Abbrechen</button>
      </div>`;
    overlay.querySelector('#cc-modal-cancel').addEventListener('click', () => overlay.remove());
    overlay.querySelectorAll('.cc-docrow').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.cc-deldoc')) return;
        if (isDirty && !confirm('Verwerfen?')) return;
        const doc = loadDocs()[row.dataset.id];
        if (!doc) return;
        docId = doc.id;
        docName = doc.name || 'Tabelle1';
        nameEl.textContent = docName;
        isDirty = false;
        dirtyEl.textContent = '';
        loadCells(doc.cells || {});
        selectCell(0, 0);
        overlay.remove();
      });
    });
    overlay.querySelectorAll('.cc-deldoc').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Löschen?')) return;
        deleteDoc(btn.dataset.id);
        btn.closest('.cc-docrow').remove();
      });
    });
    document.body.appendChild(overlay);
  }

  function esc(s) { return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }

  // ── init ──
  selectCell(0, 0);
}

function unmount() {
  // listeners array approach: nothing to do if container is replaced,
  // but clear any module-level state
  _cleanup = null;
}

export default {
  id: 'calc',
  label: 'Calc',
  color: 'var(--app-calc)',
  icon: '<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="2" width="16" height="16" rx="2"/><path d="M2 7h16M7 7v11M2 12h16"/></svg>',
  mount,
  unmount,
};
