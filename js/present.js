/* ===== JARVIS OFFICE v2 — PRESENT ===== */

function initPresent(container) {
  function defaultSlide(n) {
    return { id: JarvisDB.genId(), title: `Folie ${n}`, content: '', bg: '#1e1b4b', color: '#ffffff', layout: 'center', elements: [] };
  }
  let slides = [defaultSlide(1)];
  let current = 0;
  let docId = null;
  let isDirty = false;
  let presenting = false;
  let selEl = null;   // selected element id on current slide
  let dragState = null; // { elId, ox, oy }

  const LAYOUTS = ['center', 'left', 'split'];

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome present-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title" id="pres-title" contenteditable="true">Präsentation1</span>
        <div class="titlebar-actions">
          <button class="btn btn-ghost btn-sm" id="pres-new">${icon('filePlus', 15)} Neu</button>
          <button class="btn btn-ghost btn-sm" id="pres-open">${icon('folderOpen', 15)} Öffnen</button>
          <button class="btn btn-primary btn-sm" id="pres-save">${icon('save', 15)} Speichern</button>
        </div>
      </div>
      <div class="toolbar">
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="pres-add-slide">${icon('plus', 15)} Folie</button>
          <button class="btn btn-ghost btn-sm" id="pres-del-slide">${icon('trash', 15)} Löschen</button>
          <button class="btn btn-ghost btn-sm" id="pres-move-up">${icon('chevronLeft', 15)}</button>
          <button class="btn btn-ghost btn-sm" id="pres-move-down">${icon('chevronRight', 15)}</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <label class="tb-label">Hintergrund</label>
          <input type="color" id="pres-bg" class="tb-color" value="#1e1b4b" aria-label="Hintergrundfarbe" />
          <label class="tb-label">Text</label>
          <input type="color" id="pres-fc" class="tb-color" value="#ffffff" aria-label="Textfarbe" />
          <select id="pres-layout" class="tb-select" aria-label="Layout">
            <option value="center">Zentriert</option>
            <option value="left">Links</option>
            <option value="split">Geteilt</option>
          </select>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="btn btn-ghost btn-sm" id="pres-add-text">${icon('type', 15)} Text</button>
          <button class="btn btn-ghost btn-sm" id="pres-add-rect">▭ Rechteck</button>
          <button class="btn btn-ghost btn-sm" id="pres-add-circle">◯ Kreis</button>
          <button class="btn btn-ghost btn-sm" id="pres-del-el" disabled>${icon('trash', 15)} Element</button>
        </div>
        <div class="toolbar-sep"></div>
        <div class="toolbar-group">
          <button class="btn btn-primary btn-sm" id="pres-start">${icon('eye', 15)} Präsentieren</button>
        </div>
      </div>
      <div class="present-workspace">
        <div class="slide-panel" id="slide-panel" role="list" aria-label="Folien"></div>
        <div class="slide-editor-area">
          <div class="slide-preview" id="slide-preview" role="img" aria-label="Vorschau"></div>
          <div class="slide-fields">
            <div class="form-group">
              <label for="slide-title-in">Titel</label>
              <input type="text" id="slide-title-in" class="slide-field-in" />
            </div>
            <div class="form-group">
              <label for="slide-content-in">Inhalt</label>
              <textarea id="slide-content-in" class="slide-field-ta" rows="5"></textarea>
            </div>
          </div>
        </div>
      </div>
      <div class="statusbar">
        <span id="pres-counter">Folie 1 / 1</span>
        <span id="pres-dirty"></span>
      </div>
    </div>
    <div class="present-fullscreen hidden" id="pres-fs" tabindex="0" role="dialog" aria-modal="true" aria-label="Präsentation">
      <div class="pres-fs-slide" id="pres-fs-slide"></div>
      <div class="pres-fs-controls">
        <button class="btn btn-ghost" id="fs-prev">${icon('chevronLeft', 20)}</button>
        <span id="fs-counter">1 / 1</span>
        <button class="btn btn-ghost" id="fs-next">${icon('chevronRight', 20)}</button>
        <button class="btn btn-ghost" id="fs-exit">${icon('x', 18)} Beenden</button>
      </div>
    </div>
  `;

  const slidePanel   = container.querySelector('#slide-panel');
  const preview      = container.querySelector('#slide-preview');
  const titleInEl    = container.querySelector('#slide-title-in');
  const contentInEl  = container.querySelector('#slide-content-in');
  const titleEl      = container.querySelector('#pres-title');
  const dirtyEl      = container.querySelector('#pres-dirty');
  const counterEl    = container.querySelector('#pres-counter');
  const bgIn         = container.querySelector('#pres-bg');
  const fcIn         = container.querySelector('#pres-fc');
  const layoutSel    = container.querySelector('#pres-layout');
  const fsEl         = container.querySelector('#pres-fs');
  const fsSlide      = container.querySelector('#pres-fs-slide');
  const fsCounter    = container.querySelector('#fs-counter');

  function markDirty() { isDirty = true; dirtyEl.textContent = '● Ungespeichert'; }
  function markClean() { isDirty = false; dirtyEl.textContent = ''; }

  // ── Render ────────────────────────────────────────────────────────────────
  function renderSlideThumb(s, idx) {
    const div = document.createElement('div');
    div.className = 'slide-thumb' + (idx === current ? ' active' : '');
    div.setAttribute('role', 'listitem');
    div.setAttribute('tabindex', '0');
    div.setAttribute('aria-label', `Folie ${idx + 1}: ${s.title}`);
    div.dataset.idx = idx;
    div.innerHTML = `<div class="thumb-inner" style="background:${s.bg};color:${s.color}">
      <strong>${sanitize(s.title)}</strong>
    </div>
    <span class="thumb-num">${idx + 1}</span>`;
    div.addEventListener('click', () => selectSlide(idx));
    div.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectSlide(idx); });
    return div;
  }

  function renderPanel() {
    slidePanel.innerHTML = '';
    slides.forEach((s, i) => slidePanel.appendChild(renderSlideThumb(s, i)));
  }

  function renderPreview() {
    const s = slides[current];
    preview.style.background = s.bg;
    preview.style.color = s.color;
    preview.style.textAlign = s.layout === 'left' ? 'left' : 'center';
    preview.style.position = 'relative';
    preview.style.overflow = 'hidden';

    // base text layer
    let html = `<h2 class="slide-prev-title">${sanitize(s.title)}</h2>
      <p class="slide-prev-content">${sanitize(s.content).replace(/\n/g, '<br>')}</p>`;

    // draggable elements layer
    (s.elements || []).forEach(el => {
      const sel = el.id === selEl ? ' pres-el-selected' : '';
      if (el.type === 'text') {
        html += `<div class="pres-el${sel}" data-elid="${sanitize(el.id)}" style="left:${el.x}%;top:${el.y}%;color:${sanitize(el.color||s.color)};font-size:${el.fs||18}px;position:absolute;cursor:move;user-select:none;padding:4px 8px;border-radius:4px">${sanitize(el.text||'')}</div>`;
      } else if (el.type === 'rect') {
        html += `<div class="pres-el${sel}" data-elid="${sanitize(el.id)}" style="left:${el.x}%;top:${el.y}%;width:${el.w||120}px;height:${el.h||60}px;background:${sanitize(el.fill||'rgba(255,255,255,.15)')};border:2px solid ${sanitize(el.stroke||s.color)};position:absolute;cursor:move;border-radius:4px"></div>`;
      } else if (el.type === 'circle') {
        html += `<div class="pres-el${sel}" data-elid="${sanitize(el.id)}" style="left:${el.x}%;top:${el.y}%;width:${el.w||80}px;height:${el.w||80}px;background:${sanitize(el.fill||'rgba(255,255,255,.15)')};border:2px solid ${sanitize(el.stroke||s.color)};position:absolute;cursor:move;border-radius:50%"></div>`;
      }
    });

    preview.innerHTML = html;
    bindPreviewDrag();

    counterEl.textContent = `Folie ${current + 1} / ${slides.length}`;
    bgIn.value = s.bg;
    fcIn.value = s.color;
    layoutSel.value = s.layout || 'center';
    titleInEl.value  = s.title;
    contentInEl.value = s.content;

    const delElBtn = container.querySelector('#pres-del-el');
    if (delElBtn) delElBtn.disabled = !selEl;
  }

  function bindPreviewDrag() {
    preview.querySelectorAll('.pres-el').forEach(div => {
      div.addEventListener('pointerdown', e => {
        e.stopPropagation();
        selEl = div.dataset.elid;
        const s = slides[current];
        const el = (s.elements || []).find(el => el.id === selEl);
        if (!el) return;
        const rect = preview.getBoundingClientRect();
        dragState = {
          elId: selEl,
          startX: el.x, startY: el.y,
          pxW: rect.width, pxH: rect.height,
          mx0: e.clientX, my0: e.clientY
        };
        div.setPointerCapture(e.pointerId);
        renderPreview();
      });
      div.addEventListener('pointermove', e => {
        if (!dragState || dragState.elId !== div.dataset.elid) return;
        const s = slides[current];
        const el = (s.elements || []).find(el => el.id === dragState.elId);
        if (!el) return;
        el.x = Math.max(0, Math.min(90, dragState.startX + (e.clientX - dragState.mx0) / dragState.pxW * 100));
        el.y = Math.max(0, Math.min(90, dragState.startY + (e.clientY - dragState.my0) / dragState.pxH * 100));
        markDirty();
        // live update position without full re-render
        div.style.left = el.x + '%';
        div.style.top  = el.y + '%';
      });
      div.addEventListener('pointerup', () => { dragState = null; });
    });
  }

  function selectSlide(idx) {
    current = Math.max(0, Math.min(idx, slides.length - 1));
    renderPanel();
    renderPreview();
  }

  // ── Fields sync ───────────────────────────────────────────────────────────
  titleInEl.addEventListener('input',   () => { slides[current].title   = titleInEl.value;   markDirty(); renderPanel(); renderPreview(); });
  contentInEl.addEventListener('input', () => { slides[current].content = contentInEl.value; markDirty(); renderPreview(); });
  bgIn.addEventListener('input',    () => { slides[current].bg     = bgIn.value;    markDirty(); renderPreview(); });
  fcIn.addEventListener('input',    () => { slides[current].color  = fcIn.value;    markDirty(); renderPreview(); });
  layoutSel.addEventListener('change', () => { slides[current].layout = layoutSel.value; markDirty(); renderPreview(); });

  // ── Slide management ──────────────────────────────────────────────────────
  container.querySelector('#pres-add-slide').addEventListener('click', () => {
    const newSlide = { id: JarvisDB.genId(), title: `Folie ${slides.length + 1}`, content: '', bg: '#1e1b4b', color: '#ffffff', layout: 'center' };
    slides.splice(current + 1, 0, newSlide);
    selectSlide(current + 1);
    markDirty();
  });

  container.querySelector('#pres-del-slide').addEventListener('click', () => {
    if (slides.length <= 1) { showNotify('Mindestens eine Folie erforderlich.', 'warn'); return; }
    if (!confirm('Folie löschen?')) return;
    slides.splice(current, 1);
    selectSlide(Math.min(current, slides.length - 1));
    markDirty();
  });

  container.querySelector('#pres-move-up').addEventListener('click', () => {
    if (current <= 0) return;
    [slides[current], slides[current - 1]] = [slides[current - 1], slides[current]];
    selectSlide(current - 1);
    markDirty();
  });

  container.querySelector('#pres-move-down').addEventListener('click', () => {
    if (current >= slides.length - 1) return;
    [slides[current], slides[current + 1]] = [slides[current + 1], slides[current]];
    selectSlide(current + 1);
    markDirty();
  });

  // ── Fullscreen presentation ───────────────────────────────────────────────
  function renderFsSlide(idx) {
    const s = slides[idx];
    fsSlide.style.background = s.bg;
    fsSlide.style.color = s.color;
    fsSlide.style.textAlign = s.layout === 'left' ? 'left' : 'center';
    fsSlide.style.position = 'relative';
    let html = `<h1 class="fs-title">${sanitize(s.title)}</h1>
      <p class="fs-content">${sanitize(s.content).replace(/\n/g, '<br>')}</p>`;
    (s.elements || []).forEach(el => {
      if (el.type === 'text') {
        html += `<div style="left:${el.x}%;top:${el.y}%;color:${sanitize(el.color||s.color)};font-size:${(el.fs||18)*1.5}px;position:absolute;padding:4px 8px">${sanitize(el.text||'')}</div>`;
      } else if (el.type === 'rect') {
        html += `<div style="left:${el.x}%;top:${el.y}%;width:${el.w||120}px;height:${el.h||60}px;background:${sanitize(el.fill||'rgba(255,255,255,.15)')};border:2px solid ${sanitize(el.stroke||s.color)};position:absolute;border-radius:4px"></div>`;
      } else if (el.type === 'circle') {
        html += `<div style="left:${el.x}%;top:${el.y}%;width:${el.w||80}px;height:${el.w||80}px;background:${sanitize(el.fill||'rgba(255,255,255,.15)')};border:2px solid ${sanitize(el.stroke||s.color)};position:absolute;border-radius:50%"></div>`;
      }
    });
    fsSlide.innerHTML = html;
    fsCounter.textContent = `${idx + 1} / ${slides.length}`;
  }

  // ── Element management ────────────────────────────────────────────────────
  function addElement(type) {
    const s = slides[current];
    if (!s.elements) s.elements = [];
    const newEl = { id: JarvisDB.genId(), type, x: 10, y: 10 };
    if (type === 'text') {
      const txt = prompt('Text eingeben:');
      if (!txt) return;
      newEl.text = txt; newEl.fs = 18; newEl.color = s.color;
    } else {
      newEl.fill = 'rgba(255,255,255,.15)'; newEl.stroke = s.color;
      newEl.w = type === 'circle' ? 80 : 120; newEl.h = 60;
    }
    s.elements.push(newEl);
    selEl = newEl.id;
    markDirty(); renderPreview();
  }

  container.querySelector('#pres-add-text').addEventListener('click', () => addElement('text'));
  container.querySelector('#pres-add-rect').addEventListener('click', () => addElement('rect'));
  container.querySelector('#pres-add-circle').addEventListener('click', () => addElement('circle'));
  container.querySelector('#pres-del-el').addEventListener('click', () => {
    if (!selEl) return;
    slides[current].elements = (slides[current].elements || []).filter(el => el.id !== selEl);
    selEl = null; markDirty(); renderPreview();
  });

  container.querySelector('#pres-start').addEventListener('click', () => {
    presenting = true;
    fsEl.classList.remove('hidden');
    renderFsSlide(current);
    fsEl.focus();
  });

  container.querySelector('#fs-exit').addEventListener('click', () => {
    presenting = false; fsEl.classList.add('hidden');
  });

  container.querySelector('#fs-prev').addEventListener('click', () => {
    if (current > 0) { current--; renderFsSlide(current); }
  });
  container.querySelector('#fs-next').addEventListener('click', () => {
    if (current < slides.length - 1) { current++; renderFsSlide(current); }
  });

  fsEl.addEventListener('keydown', e => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') {
      if (current < slides.length - 1) { current++; renderFsSlide(current); }
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      if (current > 0) { current--; renderFsSlide(current); }
    } else if (e.key === 'Escape') {
      presenting = false; fsEl.classList.add('hidden');
    }
  });

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveDoc() {
    const title = titleEl.textContent.trim() || 'Präsentation1';
    if (!docId) docId = JarvisDB.genId();
    JarvisDB.saveDoc('present', docId, { title, slides });
    markClean();
    showNotify('Gespeichert: ' + title, 'success');
  }

  function loadDocById(id) {
    const d = JarvisDB.loadDoc('present', id);
    if (!d) return;
    docId = id; titleEl.textContent = d.title || 'Präsentation1';
    slides = d.slides || slides;
    markClean(); selectSlide(0);
  }

  function newDoc() {
    if (isDirty && !confirm('Verwerfen?')) return;
    docId = null; selEl = null;
    slides = [defaultSlide(1)];
    titleEl.textContent = 'Präsentation1';
    markClean(); selectSlide(0);
  }

  function openDocDialog() {
    const docs = JarvisDB.listDocs('present');
    if (!docs.length) { showNotify('Keine Präsentationen.', 'info'); return; }
    const rowsHtml = docs.map(d => `
      <div class="doc-row" data-id="${sanitize(d.id)}" tabindex="0" role="button">
        <span class="doc-row-title">${sanitize(d.title)}</span>
        <span class="doc-row-date">${formatDateTime(new Date(d.modified))}</span>
        <button class="btn btn-ghost btn-sm doc-delete" data-id="${sanitize(d.id)}">${icon('trash', 14)}</button>
      </div>`).join('');
    showModal(`<h3>Präsentation öffnen</h3><div class="doc-list">${rowsHtml}</div><div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null);
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
        JarvisDB.deleteDoc('present', btn.dataset.id);
        btn.closest('.doc-row').remove();
      });
    });
  }

  container.querySelector('.back-btn').addEventListener('click', () => {
    if (isDirty && !confirm('Verwerfen?')) return; goHome();
  });
  container.querySelector('#pres-new').addEventListener('click', newDoc);
  container.querySelector('#pres-open').addEventListener('click', openDocDialog);
  container.querySelector('#pres-save').addEventListener('click', saveDoc);
  titleEl.addEventListener('input', markDirty);
  container.addEventListener('keydown', e => {
    if (!presenting && (e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); }
  });

  selectSlide(0);
}
