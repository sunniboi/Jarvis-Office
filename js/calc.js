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
  // Direkt-Cache: cellEls[r][c] → kein querySelector bei jedem Zugriff
  let cellEls = [];

  // ── Build table skeleton ──────────────────────────────────────────────────
  function buildTable() {
    const frag = document.createDocumentFragment();
    cellEls = [];
    // header row
    const hrow = document.createElement('tr');
    hrow.appendChild(document.createElement('th')); // corner
    for (let c = 0; c < COLS; c++) {
      const th = document.createElement('th');
      th.textContent = colToLetter(c);
      th.setAttribute('scope', 'col');
      hrow.appendChild(th);
    }
    frag.appendChild(hrow);
    // data rows
    for (let r = 0; r < ROWS; r++) {
      cellEls[r] = [];
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
        cellEls[r][c] = td;
      }
      frag.appendChild(row);
    }
    table.innerHTML = '';
    table.appendChild(frag);
  }

  function getCellEl(r, c) {
    return cellEls[r]?.[c] ?? null;
  }

  // ── Cell key helper ───────────────────────────────────────────────────────
  function key(r, c) { return cellRef(r, c); }

  // ── Formula evaluation ────────────────────────────────────────────────────
  function getCellVal(ref) {
    const v = cells[ref.toUpperCase()]?.val;
    return v === undefined ? 0 : (isNaN(v) ? v : Number(v));
  }

  function evalFormula(expr) {
    if (!expr.startsWith('=')) return isNaN(expr) ? expr : Number(expr) || expr;
    try {
      const p = new FormulaParser(expr.slice(1));
      const v = p.parse();
      if (typeof v !== 'number' || !isFinite(v)) return '#ERR';
      return Number(v.toFixed(10));
    } catch { return '#ERR'; }
  }

  class FormulaParser {
    constructor(src) {
      this.tokens = src.toUpperCase().match(/[A-Z]+\d+:[A-Z]+\d+|[A-Z]+\d+|[A-Z]+|\d+(?:\.\d+)?|[-+*/^(),]|\s+/g) || [];
      this.tokens = this.tokens.filter(t => !/^\s+$/.test(t));
      this.joined = this.tokens.join('');
      if (this.joined.length !== src.replace(/\s+/g, '').toUpperCase().length) throw new Error('bad');
      this.i = 0;
    }
    peek() { return this.tokens[this.i]; }
    next() { return this.tokens[this.i++]; }
    parse() {
      const v = this.expr();
      if (this.i !== this.tokens.length) throw new Error('trailing');
      return v;
    }
    expr() {
      let v = this.term();
      while (this.peek() === '+' || this.peek() === '-') {
        const op = this.next(); const r = this.term();
        v = op === '+' ? v + r : v - r;
      }
      return v;
    }
    term() {
      let v = this.power();
      while (this.peek() === '*' || this.peek() === '/') {
        const op = this.next(); const r = this.power();
        v = op === '*' ? v * r : v / r;
      }
      return v;
    }
    power() {
      const base = this.unary();
      if (this.peek() === '^') { this.next(); return Math.pow(base, this.power()); }
      return base;
    }
    unary() {
      if (this.peek() === '-') { this.next(); return -this.unary(); }
      if (this.peek() === '+') { this.next(); return this.unary(); }
      return this.primary();
    }
    primary() {
      const t = this.next();
      if (t === undefined) throw new Error('eof');
      if (t === '(') { const v = this.expr(); if (this.next() !== ')') throw new Error('paren'); return v; }
      if (/^\d/.test(t)) return Number(t);
      if (/^[A-Z]+\d+:[A-Z]+\d+$/.test(t)) throw new Error('range outside function');
      if (/^[A-Z]+\d+$/.test(t)) return numOf(t);
      if (/^(SUM|AVERAGE|AVG|COUNT|MAX|MIN)$/.test(t) && this.peek() === '(') return this.call(t);
      throw new Error('unknown ' + t);
    }
    call(name) {
      this.next();
      const vals = [];
      if (this.peek() !== ')') {
        do {
          const t = this.peek();
          if (t && /^[A-Z]+\d+:[A-Z]+\d+$/.test(t)) {
            this.next();
            const [a, b] = t.split(':');
            rangeVals(a, b).forEach(x => vals.push(x));
          } else {
            vals.push(this.expr());
          }
        } while (this.peek() === ',' && this.next());
      }
      if (this.next() !== ')') throw new Error('call');
      const nums = vals.filter(x => typeof x === 'number' && !isNaN(x));
      switch (name) {
        case 'SUM': return nums.reduce((a, b) => a + b, 0);
        case 'AVERAGE': case 'AVG': return nums.length ? nums.reduce((a, b) => a + b, 0) / nums.length : 0;
        case 'COUNT': return nums.length;
        case 'MAX': return nums.length ? Math.max(...nums) : 0;
        case 'MIN': return nums.length ? Math.min(...nums) : 0;
      }
      throw new Error('fn');
    }
  }

  function numOf(ref) {
    const v = getCellVal(ref);
    if (typeof v !== 'number' || isNaN(v)) throw new Error('nonnumeric');
    return v;
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
