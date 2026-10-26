/* ===== JARVIS OFFICE v2 — DRAW (Vektorgrafik) ===== */

function initDraw(container) {
  let tool = 'select';
  let color = getComputedStyle(document.documentElement).getPropertyValue('--accent').trim() || '#7c3aed';
  let strokeWidth = 2;
  let shapes = [];    // { id, type, x, y, w, h, text, fill, stroke, sw, rx }
  let selected = null;
  let dragging = null; // { shape, ox, oy }
  let drawing  = null; // in-progress shape
  let docId = null;
  let isDirty = false;

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome draw-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title" id="draw-title" contenteditable="true">Zeichnung1</span>
        <div class="titlebar-actions">
          <button class="btn btn-ghost btn-sm" id="draw-new">${icon('filePlus', 15)} Neu</button>
          <button class="btn btn-ghost btn-sm" id="draw-open">${icon('folderOpen', 15)} Öffnen</button>
          <button class="btn btn-primary btn-sm" id="draw-save">${icon('save', 15)} Speichern</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-group" role="radiogroup" aria-label="Werkzeug">
          <button class="tb-btn tool-btn active" data-tool="select"  title="Auswählen">${icon('eye', 16)}</button>
          <button class="tb-btn tool-btn"         data-tool="rect"   title="Rechteck">▭</button>
          <button class="tb-btn tool-btn"         data-tool="ellipse"title="Ellipse">◯</button>
          <button class="tb-btn tool-btn"         data-tool="line"   title="Linie">╱</button>
          <button class="tb-btn tool-btn"         data-tool="text"   title="Text">T</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <label class="tb-label" for="draw-color">Farbe</label>
          <input type="color" id="draw-color" value="${color}" class="tb-color" aria-label="Farbe" />
          <label class="tb-label" for="draw-sw">Strich</label>
          <input type="range" id="draw-sw" min="1" max="20" value="${strokeWidth}" class="tb-range" aria-label="Strichbreite" style="width:70px" />
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="draw-delete-sel" disabled>${icon('trash', 15)} Löschen</button>
          <button class="btn btn-ghost btn-sm" id="draw-export">${icon('download', 15)} SVG</button>
        </div>
      </div>
      <div class="draw-scroll">
        <svg id="draw-canvas" class="draw-canvas" tabindex="0"
             xmlns="http://www.w3.org/2000/svg"
             aria-label="Zeichenfläche"
             role="application"></svg>
      </div>
      <div class="statusbar">
        <span id="draw-info">Werkzeug: Auswählen</span>
        <span id="draw-dirty"></span>
      </div>
    </div>
  `;

  const svg      = container.querySelector('#draw-canvas');
  const titleEl  = container.querySelector('#draw-title');
  const dirtyEl  = container.querySelector('#draw-dirty');
  const infoEl   = container.querySelector('#draw-info');
  const colorIn  = container.querySelector('#draw-color');
  const swIn     = container.querySelector('#draw-sw');
  const delBtn   = container.querySelector('#draw-delete-sel');

  function markDirty() { isDirty = true; dirtyEl.textContent = '● Ungespeichert'; }
  function markClean() { isDirty = false; dirtyEl.textContent = ''; }

  // ── SVG helpers ───────────────────────────────────────────────────────────
  function svgEl(tag, attrs) {
    const e = document.createElementNS('http://www.w3.org/2000/svg', tag);
    for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
    return e;
  }

  function shapeToEl(s) {
    let el;
    if (s.type === 'rect') {
      el = svgEl('rect', { x: s.x, y: s.y, width: s.w, height: s.h,
        fill: s.fill || 'none', stroke: s.stroke, 'stroke-width': s.sw, rx: s.rx || 4 });
    } else if (s.type === 'ellipse') {
      el = svgEl('ellipse', { cx: s.x + s.w / 2, cy: s.y + s.h / 2, rx: s.w / 2, ry: s.h / 2,
        fill: s.fill || 'none', stroke: s.stroke, 'stroke-width': s.sw });
    } else if (s.type === 'line') {
      el = svgEl('line', { x1: s.x, y1: s.y, x2: s.x + s.w, y2: s.y + s.h,
        stroke: s.stroke, 'stroke-width': s.sw, 'stroke-linecap': 'round' });
    } else if (s.type === 'text') {
      el = svgEl('text', { x: s.x, y: s.y, fill: s.stroke, 'font-size': 16,
        'font-family': 'var(--font-sans)' });
      el.textContent = s.text || '';
    } else return null;
    el.dataset.id = s.id;
    el.style.cursor = tool === 'select' ? 'move' : 'crosshair';
    return el;
  }

  function renderAll() {
    // keep defs if any
    const existing = new Map();
    svg.querySelectorAll('[data-id]').forEach(e => existing.set(e.dataset.id, e));

    // remove deleted
    for (const [id, el] of existing) {
      if (!shapes.find(s => s.id === id)) el.remove();
    }

    // add/update
    shapes.forEach(s => {
      const oldEl = existing.get(s.id);
      const newEl = shapeToEl(s);
      if (!newEl) return;
      newEl.classList.toggle('selected-shape', s.id === selected);
      if (oldEl) oldEl.replaceWith(newEl);
      else svg.appendChild(newEl);
    });
  }

  // ── Pointer events ────────────────────────────────────────────────────────
  function svgCoords(e) {
    const rect = svg.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  svg.addEventListener('pointerdown', e => {
    if (tool === 'select') {
      const target = e.target.closest('[data-id]');
      if (target) {
        selected = target.dataset.id;
        const s = shapes.find(sh => sh.id === selected);
        dragging = { shape: s, ox: e.clientX - s.x, oy: e.clientY - s.y };
        delBtn.disabled = false;
        renderAll();
      } else {
        selected = null; delBtn.disabled = true; renderAll();
      }
      return;
    }
    if (tool === 'text') {
      const { x, y } = svgCoords(e);
      showModal(`
        <h3>Text eingeben</h3>
        <div class="form-group"><input type="text" id="text-input" value="" placeholder="Text…" /></div>
        <div class="modal-actions">
          <button class="btn btn-ghost btn-cancel">Abbrechen</button>
          <button class="btn btn-primary btn-ok">Einfügen</button>
        </div>
      `, (modal) => {
        const t = modal.querySelector('#text-input').value;
        if (!t) return;
        shapes.push({ id: JarvisDB.genId(), type: 'text', x, y, w: 0, h: 0, text: t, stroke: color, sw: strokeWidth });
        markDirty(); renderAll();
      });
      return;
    }
    const { x, y } = svgCoords(e);
    drawing = { id: JarvisDB.genId(), type: tool, x, y, w: 0, h: 0, stroke: color, sw: strokeWidth, fill: 'none' };
    svg.setPointerCapture(e.pointerId);
  });

  svg.addEventListener('pointermove', e => {
    if (dragging) {
      dragging.shape.x = e.clientX - dragging.ox;
      dragging.shape.y = e.clientY - dragging.oy;
      markDirty(); renderAll();
    } else if (drawing) {
      const { x, y } = svgCoords(e);
      drawing.w = x - drawing.x;
      drawing.h = y - drawing.y;
      // preview
      let preview = svg.querySelector('#draw-preview');
      if (!preview) {
        preview = shapeToEl({ ...drawing, id: 'draw-preview' });
        if (preview) { preview.id = 'draw-preview'; preview.dataset.id = ''; svg.appendChild(preview); }
      } else {
        const fresh = shapeToEl({ ...drawing, id: 'draw-preview' });
        if (fresh) { fresh.id = 'draw-preview'; fresh.dataset.id = ''; preview.replaceWith(fresh); }
      }
    }
  });

  svg.addEventListener('pointerup', () => {
    dragging = null;
    if (drawing) {
      svg.querySelector('#draw-preview')?.remove();
      if (Math.abs(drawing.w) > 3 || Math.abs(drawing.h) > 3) {
        shapes.push({ ...drawing });
        markDirty(); renderAll();
      }
      drawing = null;
    }
  });

  // ── Toolbar wiring ────────────────────────────────────────────────────────
  container.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      tool = btn.dataset.tool;
      infoEl.textContent = `Werkzeug: ${btn.title || tool}`;
      svg.style.cursor = tool === 'select' ? 'default' : 'crosshair';
    });
  });

  colorIn.addEventListener('input', () => { color = colorIn.value; });
  swIn.addEventListener('input', () => { strokeWidth = Number(swIn.value); });

  delBtn.addEventListener('click', () => {
    if (!selected) return;
    shapes = shapes.filter(s => s.id !== selected);
    selected = null; delBtn.disabled = true;
    markDirty(); renderAll();
  });

  container.querySelector('#draw-export').addEventListener('click', () => {
    const w = svg.clientWidth || 800, h = svg.clientHeight || 600;
    const svgStr = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}">${svg.innerHTML}</svg>`;
    downloadFile(svgStr, (titleEl.textContent.trim() || 'Zeichnung') + '.svg', 'image/svg+xml');
  });

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveDoc() {
    const title = titleEl.textContent.trim() || 'Zeichnung1';
    if (!docId) docId = JarvisDB.genId();
    JarvisDB.saveDoc('draw', docId, { title, shapes });
    markClean();
    showNotify('Gespeichert: ' + title, 'success');
  }

  function loadDocById(id) {
    const d = JarvisDB.loadDoc('draw', id);
    if (!d) return;
    docId = id; titleEl.textContent = d.title || 'Zeichnung1';
    shapes = d.shapes || [];
    markClean(); renderAll();
  }

  function newDoc() {
    if (isDirty && !confirm('Verwerfen?')) return;
    docId = null; shapes = []; titleEl.textContent = 'Zeichnung1';
    markClean(); renderAll();
  }

  function openDocDialog() {
    const docs = JarvisDB.listDocs('draw');
    if (!docs.length) { showNotify('Keine Zeichnungen.', 'info'); return; }
    const rowsHtml = docs.map(d => `
      <div class="doc-row" data-id="${sanitize(d.id)}" tabindex="0" role="button">
        <span class="doc-row-title">${sanitize(d.title)}</span>
        <span class="doc-row-date">${formatDateTime(new Date(d.modified))}</span>
        <button class="btn btn-ghost btn-sm doc-delete" data-id="${sanitize(d.id)}">${icon('trash', 14)}</button>
      </div>`).join('');
    showModal(`<h3>Zeichnung öffnen</h3><div class="doc-list">${rowsHtml}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
    container.querySelectorAll('.doc-row').forEach(r => {
      r.addEventListener('click', e => {
        if (e.target.closest('.doc-delete')) return;
        if (isDirty && !confirm('Verwerfen?')) return;
        loadDocById(r.dataset.id); r.closest('.modal-overlay')?.remove();
      });
    });
    container.querySelectorAll('.doc-delete').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Löschen?')) return;
        JarvisDB.deleteDoc('draw', btn.dataset.id);
        btn.closest('.doc-row').remove();
      });
    });
  }

  container.querySelector('.back-btn').addEventListener('click', () => {
    if (isDirty && !confirm('Verwerfen?')) return; goHome();
  });
  container.querySelector('#draw-new').addEventListener('click', newDoc);
  container.querySelector('#draw-open').addEventListener('click', openDocDialog);
  container.querySelector('#draw-save').addEventListener('click', saveDoc);
  titleEl.addEventListener('input', markDirty);
  container.addEventListener('keydown', e => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
    if (e.key === 'Delete' && selected) delBtn.click();
  });

  renderAll();
}
