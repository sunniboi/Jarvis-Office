/* ===== JARVIS OFFICE v2 — MATRIX (Smart-Tabellen) ===== */

function initMatrix(container) {
  let docId = null;
  let isDirty = false;

  const DEFAULT_COLS = [
    { id: 'c1', label: 'Name',    type: 'text'   },
    { id: 'c2', label: 'Status',  type: 'select', options: ['Offen','In Arbeit','Erledigt'] },
    { id: 'c3', label: 'Datum',   type: 'date'   },
    { id: 'c4', label: 'Notiz',   type: 'text'   },
  ];

  let schema = DEFAULT_COLS.map(c => ({ ...c }));
  let rows   = [];

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome matrix-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title" id="matrix-title" contenteditable="true">Matrix1</span>
        <div class="titlebar-actions">
          <button class="btn btn-ghost btn-sm" id="mx-new">${icon('filePlus', 15)} Neu</button>
          <button class="btn btn-ghost btn-sm" id="mx-open">${icon('folderOpen', 15)} Öffnen</button>
          <button class="btn btn-primary btn-sm" id="mx-save">${icon('save', 15)} Speichern</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="mx-add-row">${icon('plus', 15)} Zeile</button>
          <button class="btn btn-ghost btn-sm" id="mx-add-col">${icon('table', 15)} Spalte</button>
          <button class="btn btn-ghost btn-sm" id="mx-export">${icon('download', 15)} CSV</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <input type="search" id="mx-search" class="tb-search" placeholder="Suchen…" aria-label="Suchen" />
        </div>
      </div>
      <div class="matrix-scroll">
        <table class="matrix-table" id="mx-table" role="grid"></table>
      </div>
      <div class="statusbar">
        <span id="mx-count">0 Einträge</span>
        <span id="mx-dirty"></span>
      </div>
    </div>
  `;

  const tableEl  = container.querySelector('#mx-table');
  const titleEl  = container.querySelector('#matrix-title');
  const dirtyEl  = container.querySelector('#mx-dirty');
  const countEl  = container.querySelector('#mx-count');
  const searchEl = container.querySelector('#mx-search');

  function markDirty() { isDirty = true; dirtyEl.textContent = '● Ungespeichert'; }
  function markClean() { isDirty = false; dirtyEl.textContent = ''; }

  // ── Render ────────────────────────────────────────────────────────────────
  function render(filter = '') {
    const q = filter.toLowerCase();
    const visible = q ? rows.filter(r => Object.values(r.data).some(v => String(v).toLowerCase().includes(q))) : rows;

    let html = '<thead><tr><th></th>';
    schema.forEach(col => {
      html += `<th data-col="${sanitize(col.id)}">${sanitize(col.label)} <button class="col-menu" data-col="${sanitize(col.id)}" title="Spalte bearbeiten">…</button></th>`;
    });
    html += '<th></th></thead><tbody>';

    visible.forEach(row => {
      html += `<tr data-rid="${sanitize(row.id)}"><td class="row-handle">${icon('chevronRight', 12)}</td>`;
      schema.forEach(col => {
        const val = row.data[col.id] ?? '';
        if (col.type === 'select') {
          const opts = (col.options || []).map(o => `<option${o === val ? ' selected' : ''}>${sanitize(o)}</option>`).join('');
          html += `<td><select class="cell-select" data-row="${sanitize(row.id)}" data-col="${sanitize(col.id)}">${opts}</select></td>`;
        } else if (col.type === 'date') {
          html += `<td><input type="date" class="cell-input" value="${sanitize(val)}" data-row="${sanitize(row.id)}" data-col="${sanitize(col.id)}" /></td>`;
        } else {
          html += `<td><input type="text" class="cell-input" value="${sanitize(val)}" data-row="${sanitize(row.id)}" data-col="${sanitize(col.id)}" /></td>`;
        }
      });
      html += `<td><button class="btn-icon row-delete" data-rid="${sanitize(row.id)}" aria-label="Zeile löschen">${icon('trash', 13)}</button></td></tr>`;
    });
    html += '</tbody>';
    tableEl.innerHTML = html;
    countEl.textContent = `${rows.length} Einträge`;
    bindCellEvents();
  }

  function bindCellEvents() {
    tableEl.querySelectorAll('.cell-input, .cell-select').forEach(el => {
      el.addEventListener('change', e => {
        const row = rows.find(r => r.id === e.target.dataset.row);
        if (row) { row.data[e.target.dataset.col] = e.target.value; markDirty(); }
      });
    });
    tableEl.querySelectorAll('.row-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        rows = rows.filter(r => r.id !== btn.dataset.rid);
        markDirty();
        render(searchEl.value);
      });
    });
    tableEl.querySelectorAll('.col-menu').forEach(btn => {
      btn.addEventListener('click', () => editColumn(btn.dataset.col));
    });
  }

  // ── Add row ───────────────────────────────────────────────────────────────
  function addRow() {
    const row = { id: JarvisDB.genId(), data: {} };
    rows.push(row);
    markDirty();
    render(searchEl.value);
  }

  // ── Add / Edit column ─────────────────────────────────────────────────────
  function addColumn() {
    showModal(`
      <h3>Spalte hinzufügen</h3>
      <div class="form-group"><label>Name</label><input type="text" id="col-name" value="Neue Spalte" /></div>
      <div class="form-group">
        <label>Typ</label>
        <select id="col-type">
          <option value="text">Text</option>
          <option value="select">Auswahl</option>
          <option value="date">Datum</option>
        </select>
      </div>
      <div class="form-group" id="col-opts-wrap" style="display:none">
        <label>Optionen (kommagetrennt)</label>
        <input type="text" id="col-opts" placeholder="Option1, Option2" />
      </div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">Hinzufügen</button>
      </div>
    `, (modal) => {
      const label   = modal.querySelector('#col-name').value.trim() || 'Spalte';
      const type    = modal.querySelector('#col-type').value;
      const optsRaw = modal.querySelector('#col-opts').value;
      const options = type === 'select' ? optsRaw.split(',').map(o => o.trim()).filter(Boolean) : undefined;
      schema.push({ id: JarvisDB.genId(), label, type, options });
      markDirty();
      render(searchEl.value);
    });
    // show/hide options field
    setTimeout(() => {
      const typeEl = document.querySelector('#col-type');
      const wrap   = document.querySelector('#col-opts-wrap');
      if (typeEl && wrap) {
        typeEl.addEventListener('change', () => { wrap.style.display = typeEl.value === 'select' ? '' : 'none'; });
      }
    }, 0);
  }

  function editColumn(colId) {
    const col = schema.find(c => c.id === colId);
    if (!col) return;
    showModal(`
      <h3>Spalte bearbeiten</h3>
      <div class="form-group"><label>Name</label><input type="text" id="col-name" value="${sanitize(col.label)}" /></div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-danger btn-delete" style="margin-right:auto">Löschen</button>
        <button class="btn btn-primary btn-ok">Speichern</button>
      </div>
    `, (modal) => {
      col.label = modal.querySelector('#col-name').value.trim() || col.label;
      markDirty();
      render(searchEl.value);
    });
    // delete button
    setTimeout(() => {
      document.querySelector('.btn-delete')?.addEventListener('click', () => {
        if (!confirm('Spalte löschen?')) return;
        schema = schema.filter(c => c.id !== colId);
        rows.forEach(r => delete r.data[colId]);
        markDirty();
        render(searchEl.value);
        document.querySelector('.modal-overlay')?.remove();
      });
    }, 0);
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveDoc() {
    const title = titleEl.textContent.trim() || 'Matrix1';
    if (!docId) docId = JarvisDB.genId();
    JarvisDB.saveDoc('matrix', docId, { title, schema, rows });
    markClean();
    showNotify('Gespeichert: ' + title, 'success');
  }

  function loadDocById(id) {
    const d = JarvisDB.loadDoc('matrix', id);
    if (!d) return;
    docId = id;
    titleEl.textContent = d.title || 'Matrix1';
    schema = d.schema || DEFAULT_COLS;
    rows   = d.rows   || [];
    markClean();
    render();
  }

  function newDoc() {
    if (isDirty && !confirm('Verwerfen?')) return;
    docId = null;
    schema = DEFAULT_COLS.map(c => ({ ...c }));
    rows   = [];
    titleEl.textContent = 'Matrix1';
    markClean();
    render();
  }

  function openDocDialog() {
    const docs = JarvisDB.listDocs('matrix');
    if (!docs.length) { showNotify('Keine Matrizen gefunden.', 'info'); return; }
    const rowsHtml = docs.map(d => `
      <div class="doc-row" data-id="${sanitize(d.id)}" tabindex="0" role="button">
        <span class="doc-row-title">${sanitize(d.title)}</span>
        <span class="doc-row-date">${formatDateTime(new Date(d.modified))}</span>
        <button class="btn btn-ghost btn-sm doc-delete" data-id="${sanitize(d.id)}">${icon('trash', 14)}</button>
      </div>`).join('');
    showModal(`<h3>Matrix öffnen</h3><div class="doc-list">${rowsHtml}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    container.querySelectorAll('.doc-row').forEach(r => {
      r.addEventListener('click', e => {
        if (e.target.closest('.doc-delete')) return;
        if (isDirty && !confirm('Verwerfen?')) return;
        loadDocById(r.dataset.id);
        r.closest('.modal-overlay')?.remove();
      });
    });
    container.querySelectorAll('.doc-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Löschen?')) return;
        JarvisDB.deleteDoc('matrix', btn.dataset.id);
        btn.closest('.doc-row').remove();
      });
    });
  }

  // ── CSV Export ────────────────────────────────────────────────────────────
  container.querySelector('#mx-export').addEventListener('click', () => {
    const header = schema.map(c => c.label).join(',');
    const body   = rows.map(r => schema.map(c => {
      const v = r.data[c.id] ?? '';
      return v.includes(',') ? `"${v}"` : v;
    }).join(',')).join('\n');
    downloadFile(header + '\n' + body, (titleEl.textContent.trim() || 'Matrix') + '.csv', 'text/csv');
  });

  // ── Wiring ────────────────────────────────────────────────────────────────
  container.querySelector('.back-btn').addEventListener('click', () => {
    if (isDirty && !confirm('Verwerfen?')) return;
    goHome();
  });
  container.querySelector('#mx-new').addEventListener('click', newDoc);
  container.querySelector('#mx-open').addEventListener('click', openDocDialog);
  container.querySelector('#mx-save').addEventListener('click', saveDoc);
  container.querySelector('#mx-add-row').addEventListener('click', addRow);
  container.querySelector('#mx-add-col').addEventListener('click', addColumn);
  searchEl.addEventListener('input', () => render(searchEl.value));
  titleEl.addEventListener('input', markDirty);
  container.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
  });

  render();
}
