// ===== JARVIS CALC =====

function initCalc(container) {
  const ROWS = 100, COLS = 26;
  let cells = {}; // { 'A1': { raw, value, fmt } }
  let selectedCell = { r: 0, c: 0 };
  let selRange = null;
  let currentDocId = null;
  let isEditing = false;

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--calc)">📊 Jarvis Calc</span>
      <span class="filename" id="calc-filename">Tabelle1.jcalc</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="calcNew()">📄 Neu</button>
        <button class="tb-btn" onclick="calcOpen()">📂 Öffnen</button>
        <button class="tb-btn" onclick="calcSave()">💾 Speichern</button>
        <button class="tb-btn" onclick="calcExportCSV()">⬇ CSV</button>
        <button class="tb-btn" onclick="calcInsertChart()">📈 Diagramm</button>
      </div>
    </div>
    <div class="toolbar">
      <button class="tb-btn" onclick="calcFormatCmd('bold')"><b>B</b></button>
      <button class="tb-btn" onclick="calcFormatCmd('italic')"><i>I</i></button>
      <button class="tb-btn" onclick="calcFormatCmd('underline')"><u>U</u></button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="calcAlign('left')">⬅</button>
      <button class="tb-btn" onclick="calcAlign('center')">↔</button>
      <button class="tb-btn" onclick="calcAlign('right')">➡</button>
      <div class="tb-sep"></div>
      <select class="tb-select" id="calc-numfmt" style="width:110px">
        <option value="general">Standard</option>
        <option value="number">Zahl</option>
        <option value="currency">Währung</option>
        <option value="percent">Prozent</option>
        <option value="date">Datum</option>
        <option value="text">Text</option>
      </select>
      <div class="tb-sep"></div>
      <input type="color" id="calc-bg" value="#ffffff" title="Hintergrundfarbe" style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0;" />
      <input type="color" id="calc-fg" value="#000000" title="Schriftfarbe" style="width:24px;height:24px;border:none;background:none;cursor:pointer;padding:0;" />
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="calcInsertRow()">+ Zeile</button>
      <button class="tb-btn" onclick="calcDeleteRow()">- Zeile</button>
      <button class="tb-btn" onclick="calcInsertCol()">+ Spalte</button>
      <button class="tb-btn" onclick="calcDeleteCol()">- Spalte</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="calcAutoSum()">Σ AutoSumme</button>
      <button class="tb-btn" onclick="calcSort()">⇅ Sortieren</button>
    </div>
    <div class="calc-layout">
      <div class="calc-formula-bar">
        <input class="calc-cell-ref" id="calc-cellref" value="A1" readonly />
        <span style="color:var(--text3);font-size:13px">ƒx</span>
        <input class="calc-formula-input" id="calc-formula" placeholder="Formel oder Wert eingeben..." />
      </div>
      <div class="calc-body" id="calc-body"></div>
    </div>
    <div class="statusbar">
      <span id="calc-sum">Summe: 0</span>
      <span id="calc-avg">Durchschnitt: 0</span>
      <span id="calc-count">Anzahl: 0</span>
      <span style="margin-left:auto" id="calc-mode">Bereit</span>
    </div>
  `;

  function buildGrid() {
    const body = document.getElementById('calc-body');
    let html = '<div class="calc-grid-wrap">';
    html += '<div class="calc-header-row"><div class="corner-header"></div>';
    for (let c = 0; c < COLS; c++) html += `<div class="col-header" data-col="${c}">${colToLetter(c)}</div>`;
    html += '</div>';
    for (let r = 0; r < ROWS; r++) {
      html += `<div class="calc-row"><div class="row-header">${r + 1}</div>`;
      for (let c = 0; c < COLS; c++) {
        const ref = cellRef(r, c);
        html += `<div class="calc-cell" data-r="${r}" data-c="${c}" data-ref="${ref}" tabindex="-1"></div>`;
      }
      html += '</div>';
    }
    html += '</div>';
    body.innerHTML = html;
    refreshDisplay();
    attachEvents(body);
  }

  function attachEvents(body) {
    body.addEventListener('click', e => {
      const cell = e.target.closest('.calc-cell');
      if (!cell) return;
      const r = +cell.dataset.r, c = +cell.dataset.c;
      if (e.shiftKey && selRange) {
        selRange.r2 = r; selRange.c2 = c;
      } else {
        selRange = { r1: r, c1: c, r2: r, c2: c };
        selectCell(r, c);
      }
      updateRangeHighlight();
    });
    body.addEventListener('dblclick', e => {
      const cell = e.target.closest('.calc-cell');
      if (!cell) return;
      startEdit(+cell.dataset.r, +cell.dataset.c, cell);
    });
    body.addEventListener('keydown', e => {
      if (isEditing) return;
      const { r, c } = selectedCell;
      const nav = { ArrowUp:[-1,0], ArrowDown:[1,0], ArrowLeft:[0,-1], ArrowRight:[0,1], Tab:[0,1], Enter:[1,0] };
      if (nav[e.key]) {
        e.preventDefault();
        const [dr, dc] = nav[e.key];
        selectCell(Math.max(0, Math.min(ROWS-1, r+dr)), Math.max(0, Math.min(COLS-1, c+dc)));
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        deleteSelected();
      } else if (e.key === 'F2') {
        const el = getCellEl(r, c);
        if (el) startEdit(r, c, el);
      } else if (!e.ctrlKey && !e.metaKey && e.key.length === 1) {
        const el = getCellEl(r, c);
        if (el) startEdit(r, c, el, e.key);
      } else if (e.ctrlKey && e.key === 's') {
        e.preventDefault(); calcSave();
      } else if (e.ctrlKey && e.key === 'c') {
        copySelected();
      } else if (e.ctrlKey && e.key === 'v') {
        pasteToSelected();
      }
    });
  }

  let clipboard = [];

  function copySelected() {
    const ref = cellRef(selectedCell.r, selectedCell.c);
    const c = cells[ref];
    clipboard = [[c ? c.raw : '']];
    showNotify('Kopiert.', 'info');
  }

  function pasteToSelected() {
    const ref = cellRef(selectedCell.r, selectedCell.c);
    if (clipboard[0]) setCell(selectedCell.r, selectedCell.c, clipboard[0][0]);
  }

  function getCellEl(r, c) {
    return document.querySelector(`.calc-cell[data-r="${r}"][data-c="${c}"]`);
  }

  function selectCell(r, c) {
    const prev = getCellEl(selectedCell.r, selectedCell.c);
    if (prev) prev.classList.remove('selected');
    selectedCell = { r, c };
    selRange = { r1: r, c1: c, r2: r, c2: c };
    const el = getCellEl(r, c);
    if (el) {
      el.classList.add('selected');
      el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }
    const ref = cellRef(r, c);
    document.getElementById('calc-cellref').value = ref;
    const data = cells[ref];
    document.getElementById('calc-formula').value = data ? data.raw : '';
    updateStatusBar();
  }

  function updateRangeHighlight() {
    $$('.calc-cell.selected-range').forEach(e => e.classList.remove('selected-range'));
    if (!selRange) return;
    const { r1, c1, r2, c2 } = selRange;
    const minR = Math.min(r1,r2), maxR = Math.max(r1,r2);
    const minC = Math.min(c1,c2), maxC = Math.max(c1,c2);
    for (let r = minR; r <= maxR; r++)
      for (let c = minC; c <= maxC; c++) {
        if (r === selectedCell.r && c === selectedCell.c) continue;
        getCellEl(r, c)?.classList.add('selected-range');
      }
    updateStatusBar();
  }

  function startEdit(r, c, cellEl, initialKey = null) {
    isEditing = true;
    cellEl.classList.add('editing');
    const ref = cellRef(r, c);
    const data = cells[ref];
    const input = document.createElement('input');
    input.value = initialKey || (data ? data.raw : '');
    cellEl.innerHTML = '';
    cellEl.append(input);
    input.focus();
    if (!initialKey && input.value) input.select();

    input.addEventListener('blur', () => commitEdit(r, c, cellEl, input.value));
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') { e.preventDefault(); commitEdit(r, c, cellEl, input.value); selectCell(Math.min(ROWS-1, r+1), c); }
      else if (e.key === 'Escape') { isEditing = false; cellEl.classList.remove('editing'); refreshCell(r, c); selectCell(r, c); }
      else if (e.key === 'Tab') { e.preventDefault(); commitEdit(r, c, cellEl, input.value); selectCell(r, Math.min(COLS-1, c+1)); }
    });
    document.getElementById('calc-formula').value = input.value;
    document.getElementById('calc-formula').addEventListener('input', e => { input.value = e.target.value; }, { once: true });
  }

  function commitEdit(r, c, cellEl, raw) {
    isEditing = false;
    cellEl.classList.remove('editing');
    setCell(r, c, raw);
  }

  function setCell(r, c, raw) {
    const ref = cellRef(r, c);
    if (raw === '' || raw == null) { delete cells[ref]; }
    else {
      const value = evalCell(raw, ref);
      cells[ref] = { raw, value };
    }
    refreshDisplay();
    updateStatusBar();
  }

  function evalCell(raw, selfRef) {
    if (!raw || typeof raw !== 'string') return raw;
    if (raw.startsWith('=')) {
      try { return evalFormula(raw.slice(1).toUpperCase(), selfRef); }
      catch(e) { return '#FEHLER'; }
    }
    const n = parseFloat(raw.replace(',', '.'));
    if (!isNaN(n) && raw.trim() !== '') return n;
    return raw;
  }

  function evalFormula(expr, selfRef) {
    // Replace cell ranges A1:B3 with array values
    expr = expr.replace(/([A-Z]+)(\d+):([A-Z]+)(\d+)/g, (_, c1, r1, c2, r2) => {
      const values = [];
      const minC = Math.min(letterToCol(c1), letterToCol(c2));
      const maxC = Math.max(letterToCol(c1), letterToCol(c2));
      const minR = Math.min(parseInt(r1)-1, parseInt(r2)-1);
      const maxR = Math.max(parseInt(r1)-1, parseInt(r2)-1);
      for (let r = minR; r <= maxR; r++)
        for (let c = minC; c <= maxC; c++) {
          const ref = cellRef(r, c);
          const v = cells[ref]?.value;
          if (v !== undefined && v !== '' && !isNaN(v)) values.push(+v);
        }
      return JSON.stringify(values);
    });

    // Replace single cell refs
    expr = expr.replace(/([A-Z]+)(\d+)/g, (_, col, row) => {
      const ref = col + row;
      if (ref === selfRef) return '0';
      const v = cells[ref]?.value;
      return (v !== undefined && v !== '') ? (isNaN(v) ? `"${v}"` : String(+v)) : '0';
    });

    // Built-in functions
    const fns = {
      SUM: (arr) => (Array.isArray(arr) ? arr : [arr]).flat().reduce((a,b)=>a+(+b||0),0),
      AVERAGE: (arr) => { const a=(Array.isArray(arr)?arr:[arr]).flat().filter(v=>!isNaN(v)); return a.length?a.reduce((s,v)=>s+(+v),0)/a.length:0; },
      AVG: (arr) => fns.AVERAGE(arr),
      COUNT: (arr) => (Array.isArray(arr)?arr:[arr]).flat().filter(v=>!isNaN(+v)&&v!=='').length,
      MAX: (arr) => Math.max(...(Array.isArray(arr)?arr:[arr]).flat().map(Number)),
      MIN: (arr) => Math.min(...(Array.isArray(arr)?arr:[arr]).flat().map(Number)),
      ABS: (v) => Math.abs(+v),
      ROUND: (v, d=0) => Math.round(+v * Math.pow(10,+d)) / Math.pow(10,+d),
      SQRT: (v) => Math.sqrt(+v),
      POW: (b,e) => Math.pow(+b,+e),
      IF: (cond,t,f) => cond?t:f,
      LEN: (s) => String(s).length,
      UPPER: (s) => String(s).toUpperCase(),
      LOWER: (s) => String(s).toLowerCase(),
      CONCAT: (...args) => args.join(''),
      TODAY: () => new Date().toLocaleDateString('de-DE'),
      NOW: () => new Date().toLocaleString('de-DE'),
      PI: () => Math.PI,
    };

    // Replace function calls
    expr = expr.replace(/([A-Z]+)\(([^)]*)\)/g, (_, fn, args) => {
      if (fns[fn]) {
        try {
          const parsedArgs = args ? args.split(',').map(a => {
            const t = a.trim();
            if (t.startsWith('[')) return JSON.parse(t);
            if (t.startsWith('"') || t.startsWith("'")) return t.slice(1,-1);
            if (!isNaN(t)) return +t;
            return t;
          }) : [];
          const result = fns[fn](...parsedArgs);
          return typeof result === 'string' ? `"${result}"` : String(result);
        } catch { return '0'; }
      }
      return '0';
    });

    // Safe eval
    const result = Function(`"use strict"; return (${expr})`)();
    return isNaN(result) ? result : +result;
  }

  function formatValue(ref) {
    const data = cells[ref];
    if (!data) return '';
    const v = data.value;
    if (v === undefined || v === null || v === '') return '';
    if (typeof v === 'number') {
      if (isNaN(v)) return '#WERT';
      if (!isFinite(v)) return '#DIV/0';
      return v.toLocaleString('de-DE', { maximumFractionDigits: 8 });
    }
    return String(v);
  }

  function refreshCell(r, c) {
    const el = getCellEl(r, c);
    if (!el) return;
    const ref = cellRef(r, c);
    const display = formatValue(ref);
    el.textContent = display;
    const data = cells[ref];
    el.classList.toggle('cell-formula', !!(data?.raw?.startsWith('=')));
    el.classList.toggle('cell-error', display.startsWith('#'));
    el.classList.toggle('cell-number', typeof data?.value === 'number');
    if (data?.style) {
      Object.assign(el.style, data.style);
    }
  }

  function refreshDisplay() {
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++)
        refreshCell(r, c);
  }

  function deleteSelected() {
    if (selRange) {
      const { r1, c1, r2, c2 } = selRange;
      for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++)
        for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) {
          delete cells[cellRef(r, c)];
          refreshCell(r, c);
        }
    }
    document.getElementById('calc-formula').value = '';
    updateStatusBar();
  }

  function updateStatusBar() {
    if (!selRange) return;
    const { r1, c1, r2, c2 } = selRange;
    const vals = [];
    for (let r = Math.min(r1,r2); r <= Math.max(r1,r2); r++)
      for (let c = Math.min(c1,c2); c <= Math.max(c1,c2); c++) {
        const v = cells[cellRef(r,c)]?.value;
        if (typeof v === 'number' && !isNaN(v)) vals.push(v);
      }
    const sum = vals.reduce((a,b)=>a+b,0);
    const avg = vals.length ? sum/vals.length : 0;
    document.getElementById('calc-sum').textContent = `Summe: ${sum.toLocaleString('de-DE')}`;
    document.getElementById('calc-avg').textContent = `Durchschnitt: ${avg.toLocaleString('de-DE',{maximumFractionDigits:4})}`;
    document.getElementById('calc-count').textContent = `Anzahl: ${vals.length}`;
  }

  // Formula bar input
  document.getElementById('calc-formula').addEventListener('keydown', e => {
    if (e.key === 'Enter') {
      const raw = document.getElementById('calc-formula').value;
      setCell(selectedCell.r, selectedCell.c, raw);
      selectCell(Math.min(ROWS-1, selectedCell.r+1), selectedCell.c);
    }
  });

  // Format commands
  window.calcFormatCmd = (cmd) => {
    const ref = cellRef(selectedCell.r, selectedCell.c);
    cells[ref] = cells[ref] || { raw: '', value: '' };
    cells[ref].style = cells[ref].style || {};
    if (cmd === 'bold') cells[ref].style.fontWeight = cells[ref].style.fontWeight === 'bold' ? '' : 'bold';
    if (cmd === 'italic') cells[ref].style.fontStyle = cells[ref].style.fontStyle === 'italic' ? '' : 'italic';
    if (cmd === 'underline') cells[ref].style.textDecoration = cells[ref].style.textDecoration === 'underline' ? '' : 'underline';
    refreshCell(selectedCell.r, selectedCell.c);
  };

  window.calcAlign = (align) => {
    const ref = cellRef(selectedCell.r, selectedCell.c);
    cells[ref] = cells[ref] || { raw: '', value: '' };
    cells[ref].style = cells[ref].style || {};
    cells[ref].style.textAlign = align;
    refreshCell(selectedCell.r, selectedCell.c);
  };

  window.calcInsertRow = () => {
    const r = selectedCell.r;
    const newCells = {};
    for (const [ref, data] of Object.entries(cells)) {
      const col = ref.match(/[A-Z]+/)[0];
      const row = parseInt(ref.match(/\d+/)[0]) - 1;
      if (row >= r) newCells[cellRef(row+1, letterToCol(col))] = data;
      else newCells[ref] = data;
    }
    cells = newCells;
    refreshDisplay();
  };

  window.calcDeleteRow = () => {
    const r = selectedCell.r;
    const newCells = {};
    for (const [ref, data] of Object.entries(cells)) {
      const col = ref.match(/[A-Z]+/)[0];
      const row = parseInt(ref.match(/\d+/)[0]) - 1;
      if (row < r) newCells[ref] = data;
      else if (row > r) newCells[cellRef(row-1, letterToCol(col))] = data;
    }
    cells = newCells;
    refreshDisplay();
  };

  window.calcInsertCol = () => {
    const c = selectedCell.c;
    const newCells = {};
    for (const [ref, data] of Object.entries(cells)) {
      const col = letterToCol(ref.match(/[A-Z]+/)[0]);
      const row = parseInt(ref.match(/\d+/)[0]) - 1;
      if (col >= c) newCells[cellRef(row, col+1)] = data;
      else newCells[ref] = data;
    }
    cells = newCells;
    refreshDisplay();
  };

  window.calcDeleteCol = () => {
    const c = selectedCell.c;
    const newCells = {};
    for (const [ref, data] of Object.entries(cells)) {
      const col = letterToCol(ref.match(/[A-Z]+/)[0]);
      const row = parseInt(ref.match(/\d+/)[0]) - 1;
      if (col < c) newCells[ref] = data;
      else if (col > c) newCells[cellRef(row, col-1)] = data;
    }
    cells = newCells;
    refreshDisplay();
  };

  window.calcAutoSum = () => {
    const r = selectedCell.r, c = selectedCell.c;
    let startR = r - 1;
    while (startR >= 0 && cells[cellRef(startR, c)]?.raw && !isNaN(parseFloat(cells[cellRef(startR, c)].raw))) startR--;
    startR++;
    if (startR < r) {
      const formula = `=SUM(${cellRef(startR, c)}:${cellRef(r-1, c)})`;
      setCell(r, c, formula);
      getCellEl(r, c) && (getCellEl(r, c).textContent = formatValue(cellRef(r, c)));
    }
  };

  window.calcSort = () => {
    const c = selectedCell.c;
    const rowData = [];
    for (let r = 0; r < ROWS; r++) {
      const ref = cellRef(r, c);
      if (cells[ref]) rowData.push({ r, val: cells[ref].value });
    }
    rowData.sort((a, b) => {
      if (typeof a.val === 'number' && typeof b.val === 'number') return a.val - b.val;
      return String(a.val).localeCompare(String(b.val));
    });
    // Reassign rows
    const newCells = {};
    for (const [ref, data] of Object.entries(cells)) {
      const col = letterToCol(ref.match(/[A-Z]+/)[0]);
      const row = parseInt(ref.match(/\d+/)[0]) - 1;
      if (col !== c) newCells[ref] = data;
    }
    rowData.forEach((item, newR) => {
      newCells[cellRef(newR, c)] = cells[cellRef(item.r, c)];
    });
    cells = newCells;
    refreshDisplay();
  };

  window.calcInsertChart = () => {
    // Simple SVG bar chart in a new window
    const c = selectedCell.c;
    const values = [];
    for (let r = 0; r < ROWS; r++) {
      const v = cells[cellRef(r, c)]?.value;
      if (typeof v === 'number' && !isNaN(v)) values.push({ label: cellRef(r, c), value: v });
    }
    if (!values.length) return showNotify('Keine numerischen Daten in dieser Spalte.', 'warn');
    const max = Math.max(...values.map(v => v.value));
    const w = 600, h = 300, pad = 40;
    const bw = (w - 2*pad) / values.length - 4;
    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="font-family:sans-serif">`;
    svg += `<rect width="${w}" height="${h}" fill="#1a1a2e"/>`;
    values.forEach((v, i) => {
      const bh = ((v.value / max) * (h - 2*pad));
      const x = pad + i * ((w - 2*pad) / values.length);
      const y = h - pad - bh;
      svg += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="#7c3aed" rx="2"/>`;
      svg += `<text x="${x + bw/2}" y="${h - pad + 14}" text-anchor="middle" fill="#94a3b8" font-size="10">${v.label}</text>`;
      svg += `<text x="${x + bw/2}" y="${y - 4}" text-anchor="middle" fill="#e2e8f0" font-size="10">${v.value}</text>`;
    });
    svg += `<line x1="${pad}" y1="${pad}" x2="${pad}" y2="${h-pad}" stroke="#2d2d5e" stroke-width="1"/>`;
    svg += `<line x1="${pad}" y1="${h-pad}" x2="${w-pad}" y2="${h-pad}" stroke="#2d2d5e" stroke-width="1"/>`;
    svg += '</svg>';
    const win = window.open('', '_blank', 'width=640,height=400');
    win.document.write(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Diagramm</title><style>body{margin:0;background:#0f0f1a;display:flex;align-items:center;justify-content:center;min-height:100vh;}</style></head><body>${svg}</body></html>`);
    win.document.close();
  };

  window.calcSave = () => {
    const id = currentDocId || JarvisDB.genId();
    currentDocId = id;
    const name = document.getElementById('calc-filename').textContent;
    JarvisDB.saveDoc('calc', id, { name, cells });
    showNotify('Gespeichert.', 'success');
  };

  window.calcNew = () => {
    currentDocId = null;
    cells = {};
    refreshDisplay();
    document.getElementById('calc-filename').textContent = 'Tabelle1.jcalc';
  };

  window.calcOpen = () => {
    const docs = JarvisDB.listDocs('calc');
    if (!docs.length) return showNotify('Keine gespeicherten Dateien.', 'warn');
    const items = docs.map(d => `<div class="sidebar-item" data-id="${d.id}" style="cursor:pointer">${d.name} — <small>${new Date(d.modified).toLocaleString('de-DE')}</small></div>`).join('');
    showModal(`<h3>📂 Datei öffnen</h3><div style="max-height:300px;overflow-y:auto">${items}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    setTimeout(() => {
      $$('.sidebar-item[data-id]').forEach(item => {
        item.addEventListener('click', () => {
          const doc = JarvisDB.loadDoc('calc', item.dataset.id);
          if (doc) {
            currentDocId = doc.id;
            cells = doc.cells || {};
            refreshDisplay();
            document.getElementById('calc-filename').textContent = doc.name;
            document.querySelector('.modal-overlay')?.remove();
          }
        });
      });
    }, 50);
  };

  window.calcExportCSV = () => {
    let csv = '';
    for (let r = 0; r < ROWS; r++) {
      const row = [];
      for (let c = 0; c < COLS; c++) {
        const v = cells[cellRef(r,c)]?.value ?? '';
        row.push(typeof v === 'string' && v.includes(',') ? `"${v}"` : v);
      }
      const line = row.join(',').replace(/,+$/, '');
      if (line) csv += line + '\n';
    }
    downloadFile(csv, 'tabelle.csv', 'text/csv');
  };

  buildGrid();
  document.getElementById('calc-body').focus();
  selectCell(0, 0);
}
