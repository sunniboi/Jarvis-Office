// ===== JARVIS MATRIX — Smart-Tabellen (besser als Excel) =====

function initMatrix(container) {
  let data = []; // Array of row objects
  let columns = [];
  let currentDocId = null;
  let filters = {};
  let sortCol = null, sortAsc = true;
  let selectedRows = new Set();

  const COL_TYPES = ['text', 'number', 'currency', 'percent', 'date', 'checkbox', 'select', 'formula', 'progress', 'rating', 'link', 'email'];

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--matrix)">⚡ Jarvis Matrix</span>
      <span class="filename" id="matrix-filename">Matrix1.jmatrix</span>
      <div class="titlebar-actions">
        <button class="tb-btn" onclick="matrixNew()">📄 Neu</button>
        <button class="tb-btn" onclick="matrixOpen()">📂 Öffnen</button>
        <button class="tb-btn" onclick="matrixSave()">💾 Speichern</button>
        <button class="tb-btn" onclick="matrixExportCSV()">⬇ CSV</button>
        <button class="tb-btn" onclick="matrixExportJSON()">⬇ JSON</button>
        <button class="tb-btn" onclick="matrixImportCSV()">⬆ CSV Import</button>
        <button class="tb-btn" onclick="matrixChartWizard()">📈 Chart</button>
        <button class="tb-btn" onclick="matrixPivot()">↔ Pivot</button>
        <button class="tb-btn" onclick="matrixStats()">∑ Statistik</button>
      </div>
    </div>
    <div class="toolbar">
      <button class="tb-btn" onclick="matrixAddRow()">+ Zeile</button>
      <button class="tb-btn" onclick="matrixAddCol()">+ Spalte</button>
      <button class="tb-btn" onclick="matrixDeleteSelected()">🗑 Löschen</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="matrixDuplicateRows()">⧉ Duplizieren</button>
      <button class="tb-btn" onclick="matrixFreezeRow()">📌 Einfrieren</button>
      <div class="tb-sep"></div>
      <button class="tb-btn" onclick="matrixConditional()">🎨 Bedingte Formatierung</button>
      <button class="tb-btn" onclick="matrixAIFill()">🤖 KI AutoFill</button>
      <div class="tb-sep"></div>
      <input type="text" id="matrix-search" placeholder="🔍 Suchen..." style="background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:var(--radius);padding:4px 10px;font-size:12px;width:180px;" />
    </div>
    <div class="matrix-layout" style="flex:1;overflow:hidden;display:flex;flex-direction:column;">
      <div id="matrix-chart-strip" class="matrix-chart-area" style="display:none"></div>
      <div id="matrix-table-wrap" style="flex:1;overflow:auto;"></div>
    </div>
    <div class="statusbar">
      <span id="matrix-rowcount">Zeilen: 0</span>
      <span id="matrix-selcount">Ausgewählt: 0</span>
      <span id="matrix-sum-status"></span>
      <span style="margin-left:auto">Jarvis Matrix v1.0 — smarter als Excel</span>
    </div>
  `;

  // Default template
  function loadDefault() {
    columns = [
      { id: 'c0', name: 'Name', type: 'text', width: 160 },
      { id: 'c1', name: 'Wert', type: 'number', width: 100 },
      { id: 'c2', name: 'Kategorie', type: 'select', width: 130, options: 'A,B,C,D' },
      { id: 'c3', name: 'Datum', type: 'date', width: 120 },
      { id: 'c4', name: 'Fertig', type: 'checkbox', width: 70 },
      { id: 'c5', name: 'Fortschritt', type: 'progress', width: 130 },
      { id: 'c6', name: 'Bewertung', type: 'rating', width: 110 },
      { id: 'c7', name: 'Formel', type: 'formula', width: 120, formula: '={c1}*2' },
    ];
    data = [
      { _id: uid(), c0: 'Projekt Alpha', c1: 1200, c2: 'A', c3: '2026-10-01', c4: true,  c5: 80, c6: 4 },
      { _id: uid(), c0: 'Projekt Beta',  c1: 850,  c2: 'B', c3: '2026-10-15', c4: false, c5: 45, c6: 3 },
      { _id: uid(), c0: 'Projekt Gamma', c1: 2300, c2: 'A', c3: '2026-11-01', c4: false, c5: 10, c6: 5 },
      { _id: uid(), c0: 'Projekt Delta', c1: 670,  c2: 'C', c3: '2026-09-20', c4: true,  c5: 95, c6: 2 },
    ];
    render();
  }

  function uid() { return '_' + Math.random().toString(36).slice(2,9); }

  function getFilteredSorted() {
    let rows = [...data];
    // Search
    const q = (document.getElementById('matrix-search')?.value || '').toLowerCase();
    if (q) rows = rows.filter(row => columns.some(col => String(row[col.id] ?? '').toLowerCase().includes(q)));
    // Filter
    for (const [cid, val] of Object.entries(filters)) {
      if (val === '') continue;
      rows = rows.filter(row => String(row[cid] ?? '').toLowerCase().includes(val.toLowerCase()));
    }
    // Sort
    if (sortCol) {
      rows.sort((a, b) => {
        const va = a[sortCol] ?? '', vb = b[sortCol] ?? '';
        if (typeof va === 'number' && typeof vb === 'number') return sortAsc ? va-vb : vb-va;
        return sortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
      });
    }
    return rows;
  }

  function evalFormula(formula, row) {
    return formula.replace(/\{(\w+)\}/g, (_, key) => row[key] ?? 0);
  }

  function renderCell(col, row, val) {
    switch (col.type) {
      case 'checkbox': return `<input type="checkbox" ${val ? 'checked' : ''} onclick="matrixToggle('${row._id}','${col.id}',this.checked)" style="cursor:pointer;width:16px;height:16px;" />`;
      case 'progress': {
        const pct = Math.min(100, Math.max(0, parseInt(val)||0));
        const color = pct>=80?'var(--success)':pct>=40?'var(--warn)':'var(--danger)';
        return `<div style="display:flex;align-items:center;gap:6px"><div style="flex:1;background:var(--border);border-radius:4px;height:8px;overflow:hidden"><div style="width:${pct}%;height:100%;background:${color};border-radius:4px;"></div></div><span style="font-size:10px;color:var(--text2)">${pct}%</span></div>`;
      }
      case 'rating': {
        const r = parseInt(val)||0;
        return Array(5).fill(0).map((_,i)=>`<span onclick="matrixSetRating('${row._id}','${col.id}',${i+1})" style="cursor:pointer;color:${i<r?'#f59e0b':'var(--border2)'}">★</span>`).join('');
      }
      case 'currency': return `<span>${typeof val==='number'?val.toLocaleString('de-DE',{style:'currency',currency:'EUR'}):val}</span>`;
      case 'percent': return `<span>${typeof val==='number'?(val*100).toFixed(1)+'%':val}</span>`;
      case 'link': return val ? `<a href="${sanitize(val)}" target="_blank" style="color:var(--accent2)">${sanitize(val).substring(0,30)}</a>` : '';
      case 'email': return val ? `<a href="mailto:${sanitize(val)}" style="color:var(--accent2)">${sanitize(val)}</a>` : '';
      case 'formula': {
        try {
          const expr = evalFormula(col.formula || '', row);
          const result = Function(`"use strict";return(${expr})`)();
          return `<span style="color:var(--calc)">${typeof result==='number'?result.toLocaleString('de-DE'):result}</span>`;
        } catch { return '<span style="color:var(--danger)">#FEHLER</span>'; }
      }
      case 'date': return val ? `<span>${new Date(val).toLocaleDateString('de-DE')}</span>` : '';
      default: return `<span>${sanitize(String(val ?? ''))}</span>`;
    }
  }

  function render() {
    const rows = getFilteredSorted();
    const wrap = document.getElementById('matrix-table-wrap');

    let html = `<table style="border-collapse:collapse;width:100%;font-size:13px;">`;
    // Thead
    html += `<thead><tr>
      <th style="width:32px;background:var(--bg2);border:1px solid var(--border);padding:6px;sticky:true;"><input type="checkbox" id="matrix-select-all" onchange="matrixSelectAll(this.checked)" /></th>`;
    columns.forEach((col, ci) => {
      const sorted = sortCol === col.id ? (sortAsc ? ' ▲' : ' ▼') : '';
      html += `<th data-cid="${col.id}" style="background:var(--bg2);border:1px solid var(--border);padding:6px 8px;text-align:left;white-space:nowrap;cursor:pointer;user-select:none;min-width:${col.width||100}px;position:relative;">
        <div style="display:flex;align-items:center;gap:4px">
          <span onclick="matrixSort('${col.id}')" style="flex:1;font-weight:600;color:var(--text2);font-size:11px;text-transform:uppercase;">${sanitize(col.name)}${sorted}</span>
          <span onclick="matrixEditCol(${ci})" style="color:var(--text3);cursor:pointer;font-size:10px;" title="Spalte bearbeiten">⚙</span>
          <span onclick="matrixToggleFilter('${col.id}')" style="color:var(--text3);cursor:pointer;" title="Filtern">▼</span>
        </div>
        <div id="filter-${col.id}" style="display:none;margin-top:4px"><input type="text" placeholder="Filter..." value="${filters[col.id]||''}" oninput="matrixFilter('${col.id}',this.value)" style="width:100%;font-size:11px;background:var(--surface);border:1px solid var(--border);color:var(--text);border-radius:3px;padding:2px 6px;" /></div>
        <div style="position:absolute;right:0;top:0;bottom:0;width:4px;cursor:col-resize;" onmousedown="matrixResizeCol(event,${ci})"></div>
      </th>`;
    });
    html += `<th style="background:var(--bg2);border:1px solid var(--border);padding:6px;width:32px;"></th></tr></thead>`;

    // Summary row
    html += `<tr style="background:var(--bg3);">
      <td style="border:1px solid var(--border);padding:4px;"></td>`;
    columns.forEach(col => {
      let summary = '';
      if (col.type === 'number' || col.type === 'currency') {
        const vals = data.map(r => +r[col.id]).filter(v => !isNaN(v));
        const s = vals.reduce((a,b)=>a+b,0);
        summary = `<span style="font-size:10px;color:var(--text3)">Σ ${s.toLocaleString('de-DE')}</span>`;
      } else if (col.type === 'checkbox') {
        const checked = data.filter(r => r[col.id]).length;
        summary = `<span style="font-size:10px;color:var(--text3)">${checked}/${data.length} ✓</span>`;
      } else if (col.type === 'progress') {
        const avg = data.length ? Math.round(data.reduce((a,r)=>a+(+r[col.id]||0),0)/data.length) : 0;
        summary = `<span style="font-size:10px;color:var(--text3)">Ø ${avg}%</span>`;
      }
      html += `<td style="border:1px solid var(--border);padding:4px 8px;">${summary}</td>`;
    });
    html += `<td style="border:1px solid var(--border);"></td></tr>`;

    // Tbody
    html += '<tbody>';
    rows.forEach(row => {
      const sel = selectedRows.has(row._id);
      html += `<tr class="matrix-row" data-id="${row._id}" style="background:${sel?'rgba(124,58,237,0.12)':'var(--bg)'};transition:background 0.1s;">`;
      html += `<td style="border:1px solid var(--border);padding:4px;text-align:center;"><input type="checkbox" ${sel?'checked':''} onchange="matrixSelectRow('${row._id}',this.checked)" /></td>`;
      columns.forEach(col => {
        const val = row[col.id];
        const isEditable = !['checkbox','progress','rating','formula','link','email','currency','percent','date'].includes(col.type);
        html += `<td style="border:1px solid var(--border);padding:4px 8px;max-width:${col.width||100}px;overflow:hidden;"
          ${isEditable ? `ondblclick="matrixEditCell(event,'${row._id}','${col.id}','${col.type}')"` : ''}
        >${renderCell(col, row, val)}</td>`;
      });
      html += `<td style="border:1px solid var(--border);padding:4px;text-align:center;">
        <button onclick="matrixDeleteRow('${row._id}')" style="background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;" title="Zeile löschen">🗑</button>
      </td></tr>`;
    });
    html += '</tbody></table>';

    wrap.innerHTML = html;
    updateStatus();
    attachConditionalFormat();
  }

  function attachConditionalFormat() {
    // Apply conditional formatting rules
    const rules = JarvisDB.get('matrix_cond', []);
    rules.forEach(rule => {
      $$('.matrix-row').forEach(row => {
        const id = row.dataset.id;
        const rowObj = data.find(r => r._id === id);
        if (!rowObj) return;
        const val = rowObj[rule.col];
        let match = false;
        if (rule.op === '>' && +val > +rule.val) match = true;
        else if (rule.op === '<' && +val < +rule.val) match = true;
        else if (rule.op === '==' && String(val) === String(rule.val)) match = true;
        else if (rule.op === 'contains' && String(val).includes(rule.val)) match = true;
        if (match) row.style.background = rule.bg;
      });
    });
  }

  function updateStatus() {
    document.getElementById('matrix-rowcount').textContent = `Zeilen: ${data.length}`;
    document.getElementById('matrix-selcount').textContent = `Ausgewählt: ${selectedRows.size}`;
    // Sum of selected number cells
    const numCols = columns.filter(c => c.type === 'number' || c.type === 'currency');
    if (numCols.length && selectedRows.size) {
      const sum = [...selectedRows].reduce((acc, id) => {
        const row = data.find(r => r._id === id);
        return acc + numCols.reduce((a, col) => a + (+row?.[col.id] || 0), 0);
      }, 0);
      document.getElementById('matrix-sum-status').textContent = `Σ Auswahl: ${sum.toLocaleString('de-DE')}`;
    } else {
      document.getElementById('matrix-sum-status').textContent = '';
    }
  }

  // Event handlers exposed globally
  window.matrixToggle = (id, cid, val) => {
    const row = data.find(r => r._id === id);
    if (row) { row[cid] = val; render(); }
  };

  window.matrixSetRating = (id, cid, val) => {
    const row = data.find(r => r._id === id);
    if (row) { row[cid] = val; render(); }
  };

  window.matrixSort = (cid) => {
    if (sortCol === cid) sortAsc = !sortAsc;
    else { sortCol = cid; sortAsc = true; }
    render();
  };

  window.matrixFilter = (cid, val) => { filters[cid] = val; render(); };

  window.matrixToggleFilter = (cid) => {
    const el = document.getElementById(`filter-${cid}`);
    if (el) el.style.display = el.style.display === 'none' ? 'block' : 'none';
  };

  window.matrixSelectRow = (id, checked) => {
    if (checked) selectedRows.add(id); else selectedRows.delete(id);
    updateStatus();
  };

  window.matrixSelectAll = (checked) => {
    if (checked) data.forEach(r => selectedRows.add(r._id));
    else selectedRows.clear();
    render();
  };

  window.matrixAddRow = () => {
    const row = { _id: uid() };
    columns.forEach(col => { row[col.id] = col.type === 'number' ? 0 : col.type === 'checkbox' ? false : ''; });
    data.push(row);
    render();
    // Scroll to bottom
    const wrap = document.getElementById('matrix-table-wrap');
    wrap.scrollTop = wrap.scrollHeight;
  };

  window.matrixAddCol = () => {
    showModal(`<h3>+ Spalte hinzufügen</h3>
      <div class="form-group"><label>Name</label><input type="text" id="col-name" value="Neue Spalte"/></div>
      <div class="form-group"><label>Typ</label><select id="col-type">${COL_TYPES.map(t=>`<option value="${t}">${t}</option>`).join('')}</select></div>
      <div id="col-options-row" style="display:none" class="form-group"><label>Optionen (kommagetrennt)</label><input type="text" id="col-options" placeholder="Option1,Option2,Option3"/></div>
      <div id="col-formula-row" style="display:none" class="form-group"><label>Formel (z.B. {c1}*2)</label><input type="text" id="col-formula" placeholder="{c1}*{c2}"/></div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Hinzufügen</button></div>
    `, (modal) => {
      const name = modal.querySelector('#col-name').value || 'Spalte';
      const type = modal.querySelector('#col-type').value;
      const options = modal.querySelector('#col-options').value;
      const formula = modal.querySelector('#col-formula').value;
      const cid = 'c' + Date.now();
      const col = { id: cid, name, type, width: 130 };
      if (options) col.options = options;
      if (formula) col.formula = formula;
      columns.push(col);
      data.forEach(row => { row[cid] = type === 'checkbox' ? false : type === 'number' ? 0 : ''; });
      render();
    });
    setTimeout(() => {
      document.getElementById('col-type')?.addEventListener('change', e => {
        document.getElementById('col-options-row').style.display = e.target.value === 'select' ? 'block' : 'none';
        document.getElementById('col-formula-row').style.display = e.target.value === 'formula' ? 'block' : 'none';
      });
    }, 50);
  };

  window.matrixEditCol = (ci) => {
    const col = columns[ci];
    showModal(`<h3>⚙ Spalte bearbeiten</h3>
      <div class="form-group"><label>Name</label><input type="text" id="ecol-name" value="${sanitize(col.name)}"/></div>
      <div class="form-group"><label>Typ</label><select id="ecol-type">${COL_TYPES.map(t=>`<option value="${t}" ${t===col.type?'selected':''}>${t}</option>`).join('')}</select></div>
      <div class="form-group"><label>Breite (px)</label><input type="number" id="ecol-width" value="${col.width||100}"/></div>
      <div class="modal-actions">
        <button class="btn btn-danger" onclick="matrixDeleteCol(${ci});document.querySelector('.modal-overlay')?.remove()">Löschen</button>
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">Speichern</button>
      </div>
    `, (modal) => {
      col.name = modal.querySelector('#ecol-name').value;
      col.type = modal.querySelector('#ecol-type').value;
      col.width = parseInt(modal.querySelector('#ecol-width').value) || 100;
      render();
    });
  };

  window.matrixDeleteCol = (ci) => { columns.splice(ci, 1); render(); };

  window.matrixDeleteRow = (id) => {
    data = data.filter(r => r._id !== id);
    selectedRows.delete(id);
    render();
  };

  window.matrixDeleteSelected = () => {
    if (!selectedRows.size) return showNotify('Keine Zeilen ausgewählt.', 'warn');
    data = data.filter(r => !selectedRows.has(r._id));
    selectedRows.clear();
    render();
  };

  window.matrixDuplicateRows = () => {
    if (!selectedRows.size) return showNotify('Keine Zeilen ausgewählt.', 'warn');
    const dups = data.filter(r => selectedRows.has(r._id)).map(r => ({ ...r, _id: uid() }));
    data.push(...dups);
    render();
  };

  window.matrixFreezeRow = () => showNotify('Kopfzeile ist standardmäßig eingefroren.', 'info');

  window.matrixEditCell = (event, id, cid, type) => {
    const td = event.currentTarget;
    const row = data.find(r => r._id === id);
    if (!row) return;
    const col = columns.find(c => c.id === cid);
    const val = row[cid] ?? '';
    let input;
    if (type === 'select' && col?.options) {
      input = document.createElement('select');
      input.style.cssText = 'width:100%;background:var(--surface);border:none;color:var(--text);font-size:13px;';
      col.options.split(',').forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.trim(); o.textContent = opt.trim();
        if (opt.trim() === val) o.selected = true;
        input.append(o);
      });
    } else if (type === 'date') {
      input = document.createElement('input');
      input.type = 'date'; input.value = val;
      input.style.cssText = 'width:100%;background:var(--surface);border:none;color:var(--text);font-size:13px;';
    } else {
      input = document.createElement('input');
      input.value = val;
      input.style.cssText = 'width:100%;background:var(--surface);border:none;color:var(--text);font-size:13px;';
    }
    td.innerHTML = ''; td.append(input); input.focus(); if (input.select) input.select();
    const commit = () => {
      const newVal = type === 'number' ? (+input.value || 0) : input.value;
      row[cid] = newVal;
      render();
    };
    input.addEventListener('blur', commit);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { commit(); } else if (e.key === 'Escape') { render(); } });
  };

  window.matrixResizeCol = (e, ci) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = columns[ci].width || 100;
    const onMove = (ev) => { columns[ci].width = Math.max(60, startW + ev.clientX - startX); render(); };
    const onUp = () => { document.removeEventListener('mousemove', onMove); document.removeEventListener('mouseup', onUp); };
    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onUp);
  };

  window.matrixConditional = () => {
    const rules = JarvisDB.get('matrix_cond', []);
    const cols = columns.filter(c => c.type === 'number' || c.type === 'text');
    showModal(`<h3>🎨 Bedingte Formatierung</h3>
      <div class="form-group"><label>Spalte</label><select id="cond-col">${cols.map(c=>`<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Bedingung</label><select id="cond-op"><option value=">">&gt;</option><option value="<">&lt;</option><option value="==">==</option><option value="contains">enthält</option></select></div>
      <div class="form-group"><label>Wert</label><input type="text" id="cond-val"/></div>
      <div class="form-group"><label>Hintergrundfarbe</label><input type="color" id="cond-bg" value="#1a3a1a" style="width:50px;height:30px;border:none;cursor:pointer;"/></div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Anwenden</button></div>
    `, (modal) => {
      const rule = {
        col: modal.querySelector('#cond-col').value,
        op: modal.querySelector('#cond-op').value,
        val: modal.querySelector('#cond-val').value,
        bg: modal.querySelector('#cond-bg').value,
      };
      rules.push(rule);
      JarvisDB.set('matrix_cond', rules);
      render();
    });
  };

  window.matrixAIFill = () => {
    // Pattern-based smart fill (simulated AI)
    showModal(`<h3>🤖 KI AutoFill</h3>
      <p style="color:var(--text2);font-size:13px;margin-bottom:12px;">Wähle eine Spalte — Jarvis erkennt das Muster und füllt die leeren Zellen automatisch.</p>
      <div class="form-group"><label>Spalte</label><select id="ai-col">${columns.map(c=>`<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Methode</label><select id="ai-method">
        <option value="sequence">Sequenz (1,2,3...)</option>
        <option value="copy">Letzten Wert kopieren</option>
        <option value="average">Durchschnitt (Zahlen)</option>
        <option value="pattern">Muster erkennen</option>
      </select></div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Füllen</button></div>
    `, (modal) => {
      const cid = modal.querySelector('#ai-col').value;
      const method = modal.querySelector('#ai-method').value;
      const col = columns.find(c => c.id === cid);
      if (!col) return;
      const filledRows = data.filter(r => r[cid] !== '' && r[cid] != null);
      const emptyRows = data.filter(r => r[cid] === '' || r[cid] == null);
      if (!emptyRows.length) return showNotify('Keine leeren Zellen.', 'info');

      if (method === 'sequence') {
        let counter = filledRows.length + 1;
        emptyRows.forEach(r => { r[cid] = counter++; });
      } else if (method === 'copy') {
        const last = filledRows[filledRows.length - 1]?.[cid] ?? '';
        emptyRows.forEach(r => { r[cid] = last; });
      } else if (method === 'average') {
        const nums = filledRows.map(r => +r[cid]).filter(v => !isNaN(v));
        const avg = nums.length ? nums.reduce((a,b)=>a+b,0)/nums.length : 0;
        emptyRows.forEach(r => { r[cid] = Math.round(avg); });
      } else {
        // Pattern: detect if incrementing
        const nums = filledRows.map(r => +r[cid]).filter(v => !isNaN(v));
        if (nums.length >= 2) {
          const diff = nums[nums.length-1] - nums[nums.length-2];
          let last = nums[nums.length-1];
          emptyRows.forEach(r => { last += diff; r[cid] = last; });
        } else {
          const last = filledRows[filledRows.length - 1]?.[cid] ?? '';
          emptyRows.forEach(r => { r[cid] = last; });
        }
      }
      render();
      showNotify(`${emptyRows.length} Zellen gefüllt.`, 'success');
    });
  };

  window.matrixStats = () => {
    const numCols = columns.filter(c => c.type === 'number' || c.type === 'currency');
    if (!numCols.length) return showNotify('Keine numerischen Spalten.', 'warn');
    let html = '<h3>∑ Statistik</h3><table style="width:100%;border-collapse:collapse;font-size:12px;">';
    html += '<tr><th style="text-align:left;padding:4px 8px;color:var(--text2)">Spalte</th><th style="padding:4px 8px">Summe</th><th style="padding:4px 8px">Ø</th><th style="padding:4px 8px">Min</th><th style="padding:4px 8px">Max</th><th style="padding:4px 8px">Anzahl</th></tr>';
    numCols.forEach(col => {
      const vals = data.map(r => +r[col.id]).filter(v => !isNaN(v));
      const sum = vals.reduce((a,b)=>a+b,0);
      const avg = vals.length ? sum/vals.length : 0;
      const min = vals.length ? Math.min(...vals) : 0;
      const max = vals.length ? Math.max(...vals) : 0;
      html += `<tr><td style="padding:4px 8px;font-weight:600">${sanitize(col.name)}</td><td style="text-align:right;padding:4px 8px">${sum.toLocaleString('de-DE')}</td><td style="text-align:right;padding:4px 8px">${avg.toLocaleString('de-DE',{maximumFractionDigits:2})}</td><td style="text-align:right;padding:4px 8px">${min.toLocaleString('de-DE')}</td><td style="text-align:right;padding:4px 8px">${max.toLocaleString('de-DE')}</td><td style="text-align:right;padding:4px 8px">${vals.length}</td></tr>`;
    });
    html += '</table><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Schließen</button></div>';
    showModal(html, null);
  };

  window.matrixChartWizard = () => {
    const numCols = columns.filter(c => c.type === 'number' || c.type === 'currency');
    const labelCols = columns.filter(c => c.type === 'text' || c.type === 'select');
    if (!numCols.length) return showNotify('Keine numerischen Spalten für Diagramm.', 'warn');
    showModal(`<h3>📈 Diagramm-Assistent</h3>
      <div class="form-group"><label>Beschriftungsspalte</label><select id="chart-label">${labelCols.map(c=>`<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Wertspalte</label><select id="chart-value">${numCols.map(c=>`<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Typ</label><select id="chart-type"><option value="bar">Balken</option><option value="line">Linie</option><option value="pie">Kreis</option></select></div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Erstellen</button></div>
    `, (modal) => {
      const labelCid = modal.querySelector('#chart-label').value;
      const valueCid = modal.querySelector('#chart-value').value;
      const chartType = modal.querySelector('#chart-type').value;
      const chartData = data.map(r => ({ label: r[labelCid] || r._id, value: +r[valueCid] || 0 }));
      drawChart(chartData, chartType, columns.find(c=>c.id===valueCid)?.name || 'Wert');
    });
  };

  function drawChart(chartData, type, title) {
    const strip = document.getElementById('matrix-chart-strip');
    strip.style.display = 'flex';
    const card = document.createElement('div');
    card.className = 'matrix-chart-card';
    const w = 340, h = 160, pad = 30;
    const max = Math.max(...chartData.map(d=>d.value), 1);

    let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" style="font-family:sans-serif;overflow:visible">`;
    svg += `<text x="${w/2}" y="14" text-anchor="middle" fill="var(--text2)" font-size="11" font-weight="600">${sanitize(title)}</text>`;

    if (type === 'bar') {
      const bw = (w - 2*pad) / chartData.length - 4;
      chartData.forEach((d, i) => {
        const bh = Math.max(2, (d.value/max) * (h - pad - 24));
        const x = pad + i * ((w-2*pad)/chartData.length);
        const y = h - pad - bh;
        const hue = (i * 40) % 360;
        svg += `<rect x="${x}" y="${y}" width="${bw}" height="${bh}" fill="hsl(${hue},70%,55%)" rx="2" opacity="0.85"/>`;
        svg += `<text x="${x+bw/2}" y="${h-pad+12}" text-anchor="middle" fill="#94a3b8" font-size="9" transform="rotate(-30,${x+bw/2},${h-pad+12})">${sanitize(String(d.label).substring(0,8))}</text>`;
        svg += `<text x="${x+bw/2}" y="${y-3}" text-anchor="middle" fill="#e2e8f0" font-size="9">${d.value}</text>`;
      });
    } else if (type === 'line') {
      const pts = chartData.map((d, i) => {
        const x = pad + i * (w-2*pad) / Math.max(1, chartData.length-1);
        const y = h - pad - Math.max(2, (d.value/max)*(h-pad-24));
        return `${x},${y}`;
      });
      svg += `<polyline points="${pts.join(' ')}" fill="none" stroke="#7c3aed" stroke-width="2"/>`;
      chartData.forEach((d, i) => {
        const [x,y] = pts[i].split(',');
        svg += `<circle cx="${x}" cy="${y}" r="3" fill="#a78bfa"/>`;
        svg += `<text x="${x}" y="${h-pad+12}" text-anchor="middle" fill="#94a3b8" font-size="9">${sanitize(String(d.label).substring(0,6))}</text>`;
      });
    } else if (type === 'pie') {
      const total = chartData.reduce((a,d)=>a+Math.abs(d.value),0) || 1;
      let angle = -Math.PI/2;
      const cx = w/2, cy = h/2+5, r = Math.min(w,h)/2 - 20;
      chartData.forEach((d, i) => {
        const slice = (Math.abs(d.value)/total) * 2*Math.PI;
        const x1 = cx + r*Math.cos(angle), y1 = cy + r*Math.sin(angle);
        const x2 = cx + r*Math.cos(angle+slice), y2 = cy + r*Math.sin(angle+slice);
        const large = slice > Math.PI ? 1 : 0;
        const hue = (i*50)%360;
        svg += `<path d="M${cx},${cy} L${x1},${y1} A${r},${r} 0 ${large},1 ${x2},${y2} Z" fill="hsl(${hue},65%,55%)" stroke="var(--bg2)" stroke-width="2"/>`;
        const mx = cx + (r*0.65)*Math.cos(angle+slice/2);
        const my = cy + (r*0.65)*Math.sin(angle+slice/2);
        if (slice > 0.3) svg += `<text x="${mx}" y="${my}" text-anchor="middle" fill="#fff" font-size="9">${Math.round(d.value/total*100)}%</text>`;
        angle += slice;
      });
    }
    svg += '</svg>';

    const closebtn = document.createElement('button');
    closebtn.style.cssText = 'position:absolute;top:4px;right:6px;background:none;border:none;color:var(--text3);cursor:pointer;font-size:14px;';
    closebtn.textContent = '✕';
    closebtn.onclick = () => { card.remove(); if (!strip.children.length) strip.style.display='none'; };
    card.style.position = 'relative';
    card.innerHTML = svg;
    card.append(closebtn);
    strip.append(card);
  }

  window.matrixPivot = () => {
    const textCols = columns.filter(c => c.type === 'text' || c.type === 'select');
    const numCols = columns.filter(c => c.type === 'number' || c.type === 'currency');
    if (!textCols.length || !numCols.length) return showNotify('Benötigt mind. 1 Text- und 1 Zahlenspalte.', 'warn');
    showModal(`<h3>↔ Pivot-Tabelle</h3>
      <div class="form-group"><label>Gruppierung</label><select id="pivot-row">${textCols.map(c=>`<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}</select></div>
      <div class="form-group"><label>Wert (Summe)</label><select id="pivot-val">${numCols.map(c=>`<option value="${c.id}">${sanitize(c.name)}</option>`).join('')}</select></div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button><button class="btn btn-primary btn-ok">Erstellen</button></div>
    `, (modal) => {
      const rowCid = modal.querySelector('#pivot-row').value;
      const valCid = modal.querySelector('#pivot-val').value;
      const groups = {};
      data.forEach(r => {
        const key = String(r[rowCid] ?? '(leer)');
        groups[key] = (groups[key] || 0) + (+r[valCid] || 0);
      });
      let html = '<h3>↔ Pivot-Ergebnis</h3><table style="width:100%;border-collapse:collapse;font-size:13px;">';
      html += '<tr><th style="text-align:left;padding:6px 10px;background:var(--bg2);border:1px solid var(--border)">Gruppe</th><th style="padding:6px 10px;background:var(--bg2);border:1px solid var(--border)">Summe</th></tr>';
      Object.entries(groups).sort((a,b)=>b[1]-a[1]).forEach(([k,v]) => {
        html += `<tr><td style="padding:6px 10px;border:1px solid var(--border)">${sanitize(k)}</td><td style="text-align:right;padding:6px 10px;border:1px solid var(--border)">${v.toLocaleString('de-DE')}</td></tr>`;
      });
      html += '</table><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Schließen</button></div>';
      showModal(html, null);
    });
  };

  window.matrixSave = () => {
    const id = currentDocId || JarvisDB.genId();
    currentDocId = id;
    const name = document.getElementById('matrix-filename').textContent;
    JarvisDB.saveDoc('matrix', id, { name, columns, data });
    showNotify('Gespeichert.', 'success');
  };

  window.matrixNew = () => { currentDocId = null; loadDefault(); document.getElementById('matrix-filename').textContent = 'Matrix1.jmatrix'; };

  window.matrixOpen = () => {
    const docs = JarvisDB.listDocs('matrix');
    if (!docs.length) return showNotify('Keine gespeicherten Dateien.', 'warn');
    const items = docs.map(d=>`<div class="sidebar-item" data-id="${d.id}" style="cursor:pointer">${d.name} — <small>${new Date(d.modified).toLocaleString('de-DE')}</small></div>`).join('');
    showModal(`<h3>📂 Öffnen</h3><div style="max-height:300px;overflow-y:auto">${items}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    setTimeout(()=>{
      $$('.sidebar-item[data-id]').forEach(item => item.addEventListener('click', () => {
        const doc = JarvisDB.loadDoc('matrix', item.dataset.id);
        if (doc) { currentDocId=doc.id; columns=doc.columns||[]; data=doc.data||[]; render(); document.querySelector('.modal-overlay')?.remove(); }
      }));
    }, 50);
  };

  window.matrixExportCSV = () => {
    let csv = columns.map(c => c.name).join(',') + '\n';
    data.forEach(row => { csv += columns.map(c => { const v = row[c.id]??''; return typeof v==='string'&&v.includes(',')?`"${v}"`:v; }).join(',') + '\n'; });
    downloadFile(csv, 'matrix.csv', 'text/csv');
  };

  window.matrixExportJSON = () => {
    downloadFile(JSON.stringify({ columns, data }, null, 2), 'matrix.json', 'application/json');
  };

  window.matrixImportCSV = () => {
    const input = document.createElement('input');
    input.type = 'file'; input.accept = '.csv';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const lines = ev.target.result.split('\n').filter(l => l.trim());
        if (!lines.length) return showNotify('Leere Datei.', 'warn');
        const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g,''));
        columns = headers.map((h, i) => ({ id: `c${i}`, name: h, type: 'text', width: 130 }));
        data = lines.slice(1).map(line => {
          const vals = line.split(',').map(v => v.trim().replace(/^"|"$/g,''));
          const row = { _id: uid() };
          headers.forEach((_, i) => { row[`c${i}`] = vals[i] ?? ''; });
          return row;
        });
        render();
        showNotify(`${data.length} Zeilen importiert.`, 'success');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // Search
  document.getElementById('matrix-search').addEventListener('input', debounce(render, 250));

  loadDefault();
}
