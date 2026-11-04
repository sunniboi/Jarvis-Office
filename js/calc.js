/* ===== JARVIS OFFICE v2 — CALC ===== */

function initCalc(container) {
  const ROWS = 50, COLS = 26;
  let cells = {};        // { "A1": { raw, val, fmt } }
  let dirty = new Set(); // cells needing re-render
  let selected = { r: 0, c: 0 };
  let docId = null;
  let isDirty = false;

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome calc-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title" id="calc-title" contenteditable="true">Tabelle1</span>
        <div class="titlebar-actions">
          <button class="btn btn-ghost btn-sm" id="calc-new">${icon('filePlus', 15)} Neu</button>
          <button class="btn btn-ghost btn-sm" id="calc-open">${icon('folderOpen', 15)} Öffnen</button>
          <button class="btn btn-primary btn-sm" id="calc-save">${icon('save', 15)} Speichern</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-group">
          <span class="cell-ref-box" id="calc-ref">A1</span>
          <input type="text" id="calc-formula" class="formula-bar" aria-label="Formelleiste" placeholder="Wert oder =Formel" />
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="calc-insert-chart">${icon('barChart', 15)} Diagramm</button>
          <button class="btn btn-ghost btn-sm" id="calc-export">${icon('download', 15)} CSV</button>
        </div>
      </div>
      <div class="calc-scroll">
        <table class="calc-table" id="calc-table" role="grid" aria-label="Tabellenkalkulation"></table>
      </div>
      <div class="statusbar">
        <span id="calc-status">Bereit</span>
        <span id="calc-dirty"></span>
      </div>
    </div>
  `;

  const table    = container.querySelector('#calc-table');
  const formulaBar = container.querySelector('#calc-formula');
  const refBox   = container.querySelector('#calc-ref');
  const titleEl  = container.querySelector('#calc-title');
  const dirtyEl  = container.querySelector('#calc-dirty');
  const statusEl = container.querySelector('#calc-status');

  // ── Build table skeleton ──────────────────────────────────────────────────
  function buildTable() {
    const frag = document.createDocumentFragment();
    // header row
    const hrow = document.createElement('tr');
    hrow.appendChild(document.createElement('th')); // corner
    for (let c = 0; c < COLS; c++) {
      const th = document.createElement('th');
      th.textContent = colToLetter(c);
      th.setAttribute('scope', 'col');
      frag.appendChild(th); // temp; we'll add to hrow
      hrow.appendChild(th);
    }
    frag.appendChild(hrow);
    // data rows
    for (let r = 0; r < ROWS; r++) {
      const row = document.createElement('tr');
      const rowH = document.createElement('th');
      rowH.textContent = r + 1;
      rowH.setAttribute('scope', 'row');
      row.appendChild(rowH);
      for (let c = 0; c < COLS; c++) {
        const td = document.createElement('td');
        td.dataset.r = r;
        td.dataset.c = c;
        td.setAttribute('tabindex', '-1');
        td.setAttribute('role', 'gridcell');
        row.appendChild(td);
      }
      frag.appendChild(row);
    }
    table.innerHTML = '';
    table.appendChild(frag);
  }

  function getCellEl(r, c) {
    return table.querySelector(`td[data-r="${r}"][data-c="${c}"]`);
  }

  // ── Cell key helper ───────────────────────────────────────────────────────
  function key(r, c) { return cellRef(r, c); }

  // ── Formula evaluation ────────────────────────────────────────────────────
  function getCellVal(ref) {
    const v = cells[ref.toUpperCase()]?.val;
    return v === undefined ? 0 : (isNaN(v) ? v : Number(v));
  }

  function evalFormula(expr) {
    if (!expr.startsWith('=')) return (expr.trim() === '' || isNaN(expr)) ? expr : Number(expr);
    let f = expr.slice(1).trim().toUpperCase();
    try {
      // SUM(A1:B3)
      f = f.replace(/SUM\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        let sum = 0;
        const [r1, c1] = refToRC(a), [r2, c2] = refToRC(b);
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) sum += Number(getCellVal(cellRef(r, c))) || 0;
        return sum;
      });
      // AVG(A1:B3)
      f = f.replace(/AVG\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        let sum = 0, cnt = 0;
        const [r1, c1] = refToRC(a), [r2, c2] = refToRC(b);
        for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) { sum += Number(getCellVal(cellRef(r, c))) || 0; cnt++; }
        return cnt ? sum / cnt : 0;
      });
      // MAX / MIN
      f = f.replace(/MAX\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        const vals = rangeVals(a, b); return vals.length ? Math.max(...vals) : 0;
      });
      f = f.replace(/MIN\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => {
        const vals = rangeVals(a, b); return vals.length ? Math.min(...vals) : 0;
      });
      // COUNT
      f = f.replace(/COUNT\(([A-Z]+\d+):([A-Z]+\d+)\)/g, (_, a, b) => rangeVals(a, b).filter(v => !isNaN(v)).length);
      // Cell references
      f = f.replace(/\b([A-Z]+\d+)\b/g, ref => {
        const v = getCellVal(ref);
        return typeof v === 'number' ? v : JSON.stringify(String(v));
      });
      // Nur Zahlen, Operatoren, Klammern und Text-Literale zulassen — kein beliebiger JS-Code
      const withoutStrings = f.replace(/"(?:[^"\\]|\\.)*"/g, '0');
      if (!/^[\d\s.+\-*\/%()<>=!&|?:,]*$/.test(withoutStrings)) return '#ERR';
      // eslint-disable-next-line no-new-func
      const result = Function('"use strict"; return (' + f + ')')();
      return typeof result === 'number' && isFinite(result) ? Number(result.toFixed(10)) : (typeof result === 'number' ? '#ERR' : result);
    } catch { return '#ERR'; }
  }

  function rangeVals(a, b) {
    const [r1, c1] = refToRC(a), [r2, c2] = refToRC(b);
    const vals = [];
    for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) vals.push(Number(getCellVal(cellRef(r, c))));
    return vals;
  }

  function refToRC(ref) {
    const m = ref.match(/^([A-Z]+)(\d+)$/);
    return m ? [parseInt(m[2]) - 1, letterToCol(m[1])] : [0, 0];
  }

  // Abhängige Formeln neu berechnen (mehrere Durchläufe für Ketten wie C1=B1, B1=A1)
  function recalcFormulas() {
    for (let pass = 0; pass < 20; pass++) {
      let changed = false;
      for (const [k, cell] of Object.entries(cells)) {
        if (typeof cell.raw !== 'string' || !cell.raw.startsWith('=')) continue;
        const val = evalFormula(cell.raw);
        if (val !== cell.val) { cell.val = val; dirty.add(k); changed = true; }
      }
      if (!changed) return;
    }
    // Nach 20 Durchläufen immer noch Änderungen → Zirkelbezug
    for (const [k, cell] of Object.entries(cells)) {
      if (typeof cell.raw === 'string' && cell.raw.startsWith('=') && evalFormula(cell.raw) !== cell.val) {
        cell.val = '#ZIRKEL'; dirty.add(k);
      }
    }
  }

  // ── Dirty-cell rendering ──────────────────────────────────────────────────
  function scheduleRender() {
    requestAnimationFrame(flushDirty);
  }

  function flushDirty() {
    for (const k of dirty) {
      const cell = cells[k];
      const [r, c] = refToRC(k);
      const td = getCellEl(r, c);
      if (!td) continue;
      const display = cell ? String(cell.val === undefined ? '' : cell.val) : '';
      td.textContent = display;
      td.classList.toggle('cell-error', display === '#ERR');
      td.classList.toggle('cell-formula', !!(cell?.raw?.startsWith('=')));
    }
    dirty.clear();
  }

  function setCellRaw(r, c, raw) {
    const k = key(r, c);
    if (raw === '' || raw === undefined) {
      delete cells[k];
    } else {
      const val = evalFormula(raw);
      cells[k] = { raw, val };
    }
    dirty.add(k);
    recalcFormulas();
    isDirty = true;
    dirtyEl.textContent = '● Ungespeichert';
    scheduleRender();
  }

  // ── Selection ─────────────────────────────────────────────────────────────
  function selectCell(r, c) {
    if (r < 0 || r >= ROWS || c < 0 || c >= COLS) return;
    const prev = getCellEl(selected.r, selected.c);
    prev?.classList.remove('selected');
    selected = { r, c };
    const td = getCellEl(r, c);
    if (td) { td.classList.add('selected'); td.focus(); }
    const k = key(r, c);
    refBox.textContent = k;
    formulaBar.value = cells[k]?.raw || '';
    updateStatus();
  }

  function updateStatus() {
    const k = key(selected.r, selected.c);
    const val = cells[k]?.val;
    statusEl.textContent = val !== undefined ? String(val) : '';
  }

  // ── Event: click cell ─────────────────────────────────────────────────────
  table.addEventListener('click', e => {
    const td = e.target.closest('td');
    if (!td) return;
    selectCell(Number(td.dataset.r), Number(td.dataset.c));
  });

  // ── Event: keyboard nav ───────────────────────────────────────────────────
  table.addEventListener('keydown', e => {
    const { r, c } = selected;
    if (e.key === 'ArrowRight')  { e.preventDefault(); selectCell(r, c + 1); }
    else if (e.key === 'ArrowLeft')  { e.preventDefault(); selectCell(r, c - 1); }
    else if (e.key === 'ArrowDown' || e.key === 'Enter') { e.preventDefault(); selectCell(r + 1, c); }
    else if (e.key === 'ArrowUp')    { e.preventDefault(); selectCell(r - 1, c); }
    else if (e.key === 'Tab')        { e.preventDefault(); selectCell(r, c + (e.shiftKey ? -1 : 1)); }
    else if (e.key === 'Delete' || e.key === 'Backspace') {
      if (e.target.tagName === 'TD') { setCellRaw(r, c, ''); formulaBar.value = ''; }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.metaKey) {
      formulaBar.value = e.key;
      formulaBar.focus();
    }
  });

  // ── Formula bar ───────────────────────────────────────────────────────────
  formulaBar.addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      commitFormula();
      selectCell(selected.r + 1, selected.c);
    } else if (e.key === 'Escape') {
      formulaBar.value = cells[key(selected.r, selected.c)]?.raw || '';
      getCellEl(selected.r, selected.c)?.focus();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      commitFormula();
      selectCell(selected.r, selected.c + (e.shiftKey ? -1 : 1));
    }
  });

  function commitFormula() {
    setCellRaw(selected.r, selected.c, formulaBar.value);
    getCellEl(selected.r, selected.c)?.focus();
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveDoc() {
    const title = titleEl.textContent.trim() || 'Tabelle1';
    if (!docId) docId = JarvisDB.genId();
    JarvisDB.saveDoc('calc', docId, { title, cells });
    isDirty = false;
    dirtyEl.textContent = '';
    showNotify('Gespeichert: ' + title, 'success');
  }

  function loadDocById(id) {
    const d = JarvisDB.loadDoc('calc', id);
    if (!d) return;
    docId = id;
    titleEl.textContent = d.title || 'Tabelle1';
    cells = d.cells || {};
    // mark all occupied cells dirty
    for (const k of Object.keys(cells)) dirty.add(k);
    flushDirty();
    isDirty = false;
    dirtyEl.textContent = '';
    selectCell(0, 0);
  }

  function newDoc() {
    if (isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    docId = null;
    cells = {};
    dirty.clear();
    table.querySelectorAll('td').forEach(td => { td.textContent = ''; td.className = ''; });
    titleEl.textContent = 'Tabelle1';
    isDirty = false;
    dirtyEl.textContent = '';
    selectCell(0, 0);
  }

  function openDocDialog() {
    const docs = JarvisDB.listDocs('calc');
    if (!docs.length) { showNotify('Keine gespeicherten Tabellen.', 'info'); return; }
    const rows = docs.map(d => `
      <div class="doc-row" data-id="${sanitize(d.id)}" tabindex="0" role="button">
        <span class="doc-row-title">${sanitize(d.title)}</span>
        <span class="doc-row-date">${formatDateTime(new Date(d.modified))}</span>
        <button class="btn btn-ghost btn-sm doc-delete" data-id="${sanitize(d.id)}" aria-label="Löschen">${icon('trash', 14)}</button>
      </div>`).join('');
    showModal(`<h3>Tabelle öffnen</h3><div class="doc-list">${rows}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    container.querySelectorAll('.doc-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.doc-delete')) return;
        if (isDirty && !confirm('Verwerfen?')) return;
        loadDocById(row.dataset.id);
        row.closest('.modal-overlay')?.remove();
      });
    });
    container.querySelectorAll('.doc-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Löschen?')) return;
        JarvisDB.deleteDoc('calc', btn.dataset.id);
        btn.closest('.doc-row').remove();
      });
    });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  container.querySelector('#calc-export').addEventListener('click', () => {
    const rows = [];
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const v = cells[key(r, c)]?.val ?? '';
        row.push(typeof v === 'string' && v.includes(',') ? `"${v}"` : v);
      }
      // trim trailing empty
      while (row.length && row[row.length - 1] === '') row.pop();
      if (row.length) rows.push(row.join(','));
    }
    downloadFile(rows.join('\n'), (titleEl.textContent.trim() || 'Tabelle') + '.csv', 'text/csv');
  });

  // ── Wiring ────────────────────────────────────────────────────────────────
  container.querySelector('.back-btn').addEventListener('click', () => {
    if (isDirty && !confirm('Verwerfen?')) return;
    goHome();
  });
  container.querySelector('#calc-new').addEventListener('click', newDoc);
  container.querySelector('#calc-open').addEventListener('click', openDocDialog);
  container.querySelector('#calc-save').addEventListener('click', saveDoc);
  container.querySelector('#calc-insert-chart').addEventListener('click', () => showNotify('Diagramm-Funktion folgt in v2.1', 'info'));
  titleEl.addEventListener('input', () => { isDirty = true; dirtyEl.textContent = '● Ungespeichert'; });

  // Ctrl+S
  container.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
  });

  buildTable();
  selectCell(0, 0);
}
