import Store from '../../core/store.js';
import { uid, now, el, toast, debounce } from '../../core/utils.js';

const ICON_BACK = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 4L6 10l6 6"/></svg>`;
const ICON_PLUS = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M10 4v12M4 10h12"/></svg>`;
const ICON_TRASH = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 6h12M8 6V4h4v2M6 6l1 11h6l1-11"/></svg>`;
const ICON_SAVE = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4h9l3 3v9a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"/><path d="M8 17v-6h4v6"/><path d="M8 4v3h5V4"/></svg>`;
const ICON_FOLDER = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 6a2 2 0 012-2h3l2 2h7a2 2 0 012 2v7a2 2 0 01-2 2H4a2 2 0 01-2-2V6z"/></svg>`;
const ICON_PLAY = `<svg width="15" height="15" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="5,3 19,10 5,17" fill="currentColor" stroke="none"/></svg>`;
const ICON_CHEVL = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M13 4L7 10l6 6"/></svg>`;
const ICON_CHEVR = `<svg width="18" height="18" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M7 4l6 6-6 6"/></svg>`;
const ICON_X = `<svg width="16" height="16" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 4l12 12M16 4L4 16"/></svg>`;
const ICON_TEXT = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 5h12M10 5v10M7 15h6"/></svg>`;
const ICON_RECT = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="5" width="14" height="10" rx="1"/></svg>`;
const ICON_ELLIPSE = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><ellipse cx="10" cy="10" rx="8" ry="6"/></svg>`;
const ICON_LINE = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><line x1="3" y1="17" x2="17" y2="3"/></svg>`;
const ICON_IMAGE = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="2" y="4" width="16" height="13" rx="1"/><circle cx="7" cy="9" r="1.5"/><path d="M2 14l5-5 4 4 2-2 5 5"/></svg>`;
const ICON_DUP = `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="7" y="7" width="10" height="10" rx="1"/><path d="M13 7V4a1 1 0 00-1-1H4a1 1 0 00-1 1v8a1 1 0 001 1h3"/></svg>`;

const STORE_KEY = 'jarvis_present_docs';

function newSlide() {
  return { id: uid(), bg: '#1e1b4b', elements: [] };
}

function newDoc(name = 'Präsentation') {
  return { id: uid(), name, slides: [newSlide()], modified: now() };
}

function loadDocs() { return Store.get(STORE_KEY, {}); }
function saveDocs(docs) { Store.set(STORE_KEY, docs); }

function sanitize(str) {
  return String(str ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export default {
  id: 'present',
  label: 'Present',
  color: 'var(--app-present)',
  icon: `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="2" y="3" width="16" height="12" rx="1"/><path d="M8 19l4-4M12 19l-4-4M6 19h8"/></svg>`,

  _state: null,

  mount(container) {
    // State
    const state = {
      doc: newDoc(),
      docId: null,
      currentSlide: 0,
      selectedEl: null,   // index into slide.elements
      isDirty: false,
      presenting: false,
      dragEl: null,       // dragging element info
      resizeEl: null,     // resizing element info
      listeners: [],      // [target, type, fn] for cleanup
      timers: [],
    };
    this._state = state;

    // ── HTML shell ──────────────────────────────────────────────────────────
    container.innerHTML = `
<div class="present-app" style="display:flex;flex-direction:column;height:100%;background:var(--bg);">
  <div class="titlebar" style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:var(--h-titlebar);background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0;">
    <button id="p-back" title="Zurück" style="background:none;border:none;color:var(--text-muted);cursor:pointer;display:flex;align-items:center;padding:4px;">${ICON_BACK}</button>
    <input id="p-docname" value="${sanitize(state.doc.name)}" style="background:none;border:none;color:var(--text);font:600 var(--text-md) var(--font-sans);flex:1;outline:none;min-width:0;" aria-label="Dateiname"/>
    <div style="display:flex;gap:var(--sp-2);">
      <button id="p-new" class="tbtn">${ICON_PLUS} Neu</button>
      <button id="p-open" class="tbtn">${ICON_FOLDER} Öffnen</button>
      <button id="p-save" class="tbtn tbtn-primary">${ICON_SAVE} Speichern</button>
      <button id="p-present" class="tbtn tbtn-accent">${ICON_PLAY} Präsentieren</button>
    </div>
  </div>
  <div class="toolbar" style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:var(--h-toolbar);background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0;">
    <button id="p-add-slide" class="tbtn">${ICON_PLUS} Folie</button>
    <button id="p-dup-slide" class="tbtn">${ICON_DUP}</button>
    <button id="p-del-slide" class="tbtn">${ICON_TRASH}</button>
    <button id="p-mv-left" class="tbtn">${ICON_CHEVL}</button>
    <button id="p-mv-right" class="tbtn">${ICON_CHEVR}</button>
    <span style="width:1px;height:20px;background:var(--border);margin:0 var(--sp-2);"></span>
    <label style="font-size:var(--text-xs);color:var(--text-muted);">Hintergrund</label>
    <input id="p-bg" type="color" value="#1e1b4b" style="width:28px;height:24px;border:none;padding:0;cursor:pointer;background:none;" aria-label="Folienhintergrund"/>
    <span style="width:1px;height:20px;background:var(--border);margin:0 var(--sp-2);"></span>
    <label style="font-size:var(--text-xs);color:var(--text-muted);">Element:</label>
    <button id="p-add-text" class="tbtn" title="Text">${ICON_TEXT}</button>
    <button id="p-add-rect" class="tbtn" title="Rechteck">${ICON_RECT}</button>
    <button id="p-add-ellipse" class="tbtn" title="Ellipse">${ICON_ELLIPSE}</button>
    <button id="p-add-line" class="tbtn" title="Linie">${ICON_LINE}</button>
    <button id="p-del-el" class="tbtn" title="Element löschen">${ICON_TRASH}</button>
  </div>
  <div style="display:flex;flex:1;overflow:hidden;">
    <!-- Slide panel -->
    <div id="p-slides" style="width:140px;flex-shrink:0;overflow-y:auto;background:var(--bg-sunken);border-right:1px solid var(--border);padding:var(--sp-2);display:flex;flex-direction:column;gap:var(--sp-2);" aria-label="Folien" role="list"></div>
    <!-- Stage area -->
    <div id="p-stage-wrap" style="flex:1;display:flex;align-items:center;justify-content:center;overflow:hidden;background:var(--bg);position:relative;">
      <div id="p-stage" style="position:relative;background:#1e1b4b;box-shadow:var(--shadow-lg);" tabindex="0" aria-label="Folien-Bühne"></div>
    </div>
    <!-- Props panel -->
    <div id="p-props" style="width:200px;flex-shrink:0;background:var(--bg-elevated);border-left:1px solid var(--border);padding:var(--sp-3);overflow-y:auto;display:none;"></div>
  </div>
  <div style="height:var(--h-statusbar);background:var(--bg-elevated);border-top:1px solid var(--border);display:flex;align-items:center;padding:0 var(--sp-3);gap:var(--sp-4);font-size:var(--text-xs);color:var(--text-muted);flex-shrink:0;">
    <span id="p-counter">Folie 1 / 1</span>
    <span id="p-dirty"></span>
  </div>
</div>
<!-- Fullscreen overlay -->
<div id="p-fs" style="display:none;position:fixed;inset:0;background:#000;z-index:9999;flex-direction:column;align-items:center;justify-content:center;" tabindex="0">
  <div id="p-fs-slide" style="width:960px;max-width:90vw;aspect-ratio:16/9;position:relative;overflow:hidden;"></div>
  <div style="position:fixed;bottom:var(--sp-4);left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:var(--sp-3);background:rgba(0,0,0,.6);padding:var(--sp-2) var(--sp-4);border-radius:var(--r-full);">
    <button id="p-fs-prev" style="background:none;border:none;color:#fff;cursor:pointer;">${ICON_CHEVL}</button>
    <span id="p-fs-counter" style="color:#fff;font-size:var(--text-sm);">1 / 1</span>
    <button id="p-fs-next" style="background:none;border:none;color:#fff;cursor:pointer;">${ICON_CHEVR}</button>
    <button id="p-fs-exit" style="background:none;border:none;color:#fff;cursor:pointer;margin-left:var(--sp-4);">${ICON_X}</button>
  </div>
</div>`;

    // Add base styles if not present
    if (!document.getElementById('present-styles')) {
      const s = document.createElement('style');
      s.id = 'present-styles';
      s.textContent = `
        .tbtn{display:inline-flex;align-items:center;gap:4px;padding:4px 8px;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:var(--text-sm);cursor:pointer;white-space:nowrap;}
        .tbtn:hover{background:var(--surface-hi);}
        .tbtn-primary{background:var(--surface-hi);}
        .tbtn-accent{background:var(--accent);border-color:var(--accent);color:var(--on-accent);}
        .tbtn-accent:hover{background:var(--accent-hi);}
        .p-thumb{width:116px;height:65px;border:2px solid var(--border);border-radius:var(--r-sm);cursor:pointer;position:relative;overflow:hidden;flex-shrink:0;}
        .p-thumb.active{border-color:var(--accent);}
        .p-thumb-num{position:absolute;bottom:2px;right:4px;font-size:9px;color:rgba(255,255,255,.6);}
        .p-el{position:absolute;cursor:move;box-sizing:border-box;}
        .p-el.selected{outline:2px solid var(--accent);outline-offset:1px;}
        .p-resize-handle{position:absolute;width:8px;height:8px;background:var(--accent);border:1px solid #fff;border-radius:2px;z-index:10;}
        .props-row{display:flex;flex-direction:column;gap:4px;margin-bottom:var(--sp-3);}
        .props-row label{font-size:var(--text-xs);color:var(--text-muted);}
        .props-row input,.props-row select{background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);color:var(--text);font-size:var(--text-sm);padding:4px 6px;width:100%;}
        .modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.7);display:flex;align-items:center;justify-content:center;z-index:1000;}
        .modal-box{background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-5);min-width:320px;max-width:500px;max-height:80vh;overflow-y:auto;}
        .doc-row{display:flex;align-items:center;gap:var(--sp-2);padding:var(--sp-2) var(--sp-3);border-radius:var(--r-sm);cursor:pointer;}
        .doc-row:hover{background:var(--surface-hi);}
      `;
      document.head.appendChild(s);
    }

    const q = id => container.querySelector(id);

    // ── Stage sizing ────────────────────────────────────────────────────────
    const stageWrap = q('#p-stage-wrap');
    const stage = q('#p-stage');
    const STAGE_W = 960, STAGE_H = 540;

    function resizeStage() {
      const { width, height } = stageWrap.getBoundingClientRect();
      const scale = Math.min((width - 40) / STAGE_W, (height - 40) / STAGE_H);
      stage.style.width = STAGE_W + 'px';
      stage.style.height = STAGE_H + 'px';
      stage.style.transform = `scale(${scale})`;
      stage.style.transformOrigin = 'center center';
    }

    const ro = new ResizeObserver(resizeStage);
    ro.observe(stageWrap);
    state.listeners.push({ type: '_ro', ro });

    // ── Rendering ────────────────────────────────────────────────────────────
    function currentSlide() { return state.doc.slides[state.currentSlide]; }

    function renderThumbs() {
      const panel = q('#p-slides');
      panel.innerHTML = '';
      state.doc.slides.forEach((slide, i) => {
        const thumb = document.createElement('div');
        thumb.className = 'p-thumb' + (i === state.currentSlide ? ' active' : '');
        thumb.setAttribute('role', 'listitem');
        thumb.setAttribute('tabindex', '0');
        thumb.style.background = slide.bg || '#1e1b4b';
        thumb.innerHTML = `<span class="p-thumb-num">${i + 1}</span>`;
        thumb.addEventListener('click', () => selectSlide(i));
        thumb.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') selectSlide(i); });
        panel.appendChild(thumb);
      });
    }

    function renderStage() {
      const slide = currentSlide();
      stage.style.background = slide.bg || '#1e1b4b';
      // Remove old elements (keep resize handles)
      stage.querySelectorAll('.p-el').forEach(e => e.remove());
      (slide.elements || []).forEach((elem, i) => renderElement(elem, i));
      q('#p-counter').textContent = `Folie ${state.currentSlide + 1} / ${state.doc.slides.length}`;
      q('#p-bg').value = slide.bg || '#1e1b4b';
      updatePropsPanel();
    }

    function renderElement(elem, idx) {
      const div = document.createElement('div');
      div.className = 'p-el' + (idx === state.selectedEl ? ' selected' : '');
      div.dataset.idx = idx;
      div.style.left = elem.x + 'px';
      div.style.top = elem.y + 'px';
      div.style.width = elem.w + 'px';
      div.style.height = elem.h + 'px';
      div.style.zIndex = elem.z || 1;

      if (elem.type === 'text') {
        div.style.color = elem.color || '#fff';
        div.style.fontSize = (elem.fontSize || 24) + 'px';
        div.style.fontWeight = elem.bold ? '700' : '400';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.justifyContent = 'center';
        div.style.textAlign = 'center';
        div.style.padding = '4px';
        div.style.cursor = 'move';
        div.textContent = elem.text || 'Text';
        div.addEventListener('dblclick', () => startTextEdit(div, elem, idx));
      } else if (elem.type === 'rect') {
        div.style.background = elem.fill || 'rgba(124,58,237,0.5)';
        div.style.border = `${elem.strokeW || 2}px solid ${elem.stroke || 'var(--accent)'}`;
        div.style.borderRadius = (elem.radius || 0) + 'px';
      } else if (elem.type === 'ellipse') {
        div.style.background = elem.fill || 'rgba(124,58,237,0.5)';
        div.style.border = `${elem.strokeW || 2}px solid ${elem.stroke || 'var(--accent)'}`;
        div.style.borderRadius = '50%';
      } else if (elem.type === 'line') {
        div.style.height = (elem.strokeW || 2) + 'px';
        div.style.background = elem.stroke || 'var(--accent)';
        div.style.border = 'none';
      }

      // Drag to move
      div.addEventListener('mousedown', e => {
        if (e.target.classList.contains('p-resize-handle')) return;
        e.stopPropagation();
        selectElement(idx);
        const startX = e.clientX, startY = e.clientY;
        const ox = elem.x, oy = elem.y;
        const scale = getScale();
        const onMove = mv => {
          elem.x = Math.max(0, ox + (mv.clientX - startX) / scale);
          elem.y = Math.max(0, oy + (mv.clientY - startY) / scale);
          div.style.left = elem.x + 'px';
          div.style.top = elem.y + 'px';
          markDirty();
        };
        const onUp = () => {
          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
          saveCurrentDoc();
        };
        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });

      // Resize handle (bottom-right)
      if (elem.type !== 'line') {
        const handle = document.createElement('div');
        handle.className = 'p-resize-handle';
        handle.style.right = '-4px';
        handle.style.bottom = '-4px';
        handle.style.cursor = 'se-resize';
        handle.addEventListener('mousedown', e => {
          e.stopPropagation();
          const startX = e.clientX, startY = e.clientY;
          const ow = elem.w, oh = elem.h;
          const scale = getScale();
          const onMove = mv => {
            elem.w = Math.max(20, ow + (mv.clientX - startX) / scale);
            elem.h = Math.max(20, oh + (mv.clientY - startY) / scale);
            div.style.width = elem.w + 'px';
            div.style.height = elem.h + 'px';
            markDirty();
          };
          const onUp = () => {
            document.removeEventListener('mousemove', onMove);
            document.removeEventListener('mouseup', onUp);
            saveCurrentDoc();
          };
          document.addEventListener('mousemove', onMove);
          document.addEventListener('mouseup', onUp);
        });
        div.appendChild(handle);
      }

      stage.appendChild(div);
    }

    function getScale() {
      const m = stage.style.transform.match(/scale\(([^)]+)\)/);
      return m ? parseFloat(m[1]) : 1;
    }

    function startTextEdit(div, elem, idx) {
      div.contentEditable = 'true';
      div.focus();
      div.style.cursor = 'text';
      div.style.outline = '2px dashed var(--accent)';
      const onBlur = () => {
        elem.text = div.textContent;
        div.contentEditable = 'false';
        div.style.cursor = 'move';
        div.style.outline = '';
        div.removeEventListener('blur', onBlur);
        markDirty();
        saveCurrentDoc();
        renderStage();
      };
      div.addEventListener('blur', onBlur);
    }

    function updatePropsPanel() {
      const panel = q('#p-props');
      const slide = currentSlide();
      if (state.selectedEl === null || !slide.elements[state.selectedEl]) {
        panel.style.display = 'none';
        return;
      }
      panel.style.display = 'block';
      const elem = slide.elements[state.selectedEl];

      let html = `<div style="font-size:var(--text-xs);color:var(--text-muted);margin-bottom:var(--sp-3);text-transform:uppercase;letter-spacing:.05em;">Element — ${elem.type}</div>`;

      const field = (label, type, key, attrs = '') =>
        `<div class="props-row"><label>${label}</label><input type="${type}" id="pp-${key}" value="${sanitize(String(elem[key] ?? ''))}" ${attrs}/></div>`;

      html += field('X', 'number', 'x', 'min="0"');
      html += field('Y', 'number', 'y', 'min="0"');
      html += field('Breite', 'number', 'w', 'min="10"');
      if (elem.type !== 'line') html += field('Höhe', 'number', 'h', 'min="10"');
      html += `<div class="props-row"><label>Z-Index</label><input type="number" id="pp-z" value="${elem.z || 1}" min="1" max="99"/></div>`;

      if (elem.type === 'text') {
        html += field('Text', 'text', 'text');
        html += `<div class="props-row"><label>Farbe</label><input type="color" id="pp-color" value="${elem.color || '#ffffff'}"/></div>`;
        html += `<div class="props-row"><label>Schriftgröße</label><input type="number" id="pp-fontSize" value="${elem.fontSize || 24}" min="8" max="200"/></div>`;
      } else {
        html += `<div class="props-row"><label>Füllung</label><input type="color" id="pp-fill" value="${elem.fill || '#7c3aed'}"/></div>`;
        html += `<div class="props-row"><label>Rahmen</label><input type="color" id="pp-stroke" value="${elem.stroke || '#7c3aed'}"/></div>`;
        html += `<div class="props-row"><label>Rahmenbreite</label><input type="number" id="pp-strokeW" value="${elem.strokeW || 2}" min="0" max="20"/></div>`;
        if (elem.type === 'rect') html += `<div class="props-row"><label>Radius</label><input type="number" id="pp-radius" value="${elem.radius || 0}" min="0" max="200"/></div>`;
      }

      html += `<button id="pp-del" style="margin-top:var(--sp-4);width:100%;" class="tbtn">${ICON_TRASH} Element löschen</button>`;
      panel.innerHTML = html;

      // Bind prop changes
      const numKeys = ['x', 'y', 'w', 'h', 'z', 'fontSize', 'strokeW', 'radius'];
      const colorKeys = ['color', 'fill', 'stroke'];
      const textKeys = ['text'];
      [...numKeys, ...colorKeys, ...textKeys].forEach(key => {
        const inp = panel.querySelector(`#pp-${key}`);
        if (!inp) return;
        inp.addEventListener('input', () => {
          elem[key] = numKeys.includes(key) ? parseFloat(inp.value) || 0 : inp.value;
          markDirty();
          renderStage();
        });
      });
      panel.querySelector('#pp-del')?.addEventListener('click', () => {
        slide.elements.splice(state.selectedEl, 1);
        state.selectedEl = null;
        markDirty();
        saveCurrentDoc();
        renderStage();
      });
    }

    function selectSlide(idx) {
      state.currentSlide = Math.max(0, Math.min(idx, state.doc.slides.length - 1));
      state.selectedEl = null;
      renderThumbs();
      renderStage();
    }

    function selectElement(idx) {
      state.selectedEl = idx;
      renderStage();
    }

    // Click on stage background = deselect
    stage.addEventListener('mousedown', e => {
      if (e.target === stage) { state.selectedEl = null; updatePropsPanel(); renderStage(); }
    });

    // ── Add elements ────────────────────────────────────────────────────────
    function addElement(type) {
      const slide = currentSlide();
      const defaults = {
        text: { type: 'text', x: 100, y: 100, w: 300, h: 80, text: 'Text', color: '#ffffff', fontSize: 32, bold: false, z: slide.elements.length + 1 },
        rect: { type: 'rect', x: 100, y: 100, w: 200, h: 120, fill: 'rgba(124,58,237,0.5)', stroke: '#7c3aed', strokeW: 2, radius: 0, z: slide.elements.length + 1 },
        ellipse: { type: 'ellipse', x: 100, y: 100, w: 200, h: 120, fill: 'rgba(124,58,237,0.5)', stroke: '#7c3aed', strokeW: 2, z: slide.elements.length + 1 },
        line: { type: 'line', x: 50, y: 270, w: 300, h: 2, stroke: '#7c3aed', strokeW: 2, z: slide.elements.length + 1 },
      };
      const elem = { id: uid(), ...defaults[type] };
      slide.elements.push(elem);
      state.selectedEl = slide.elements.length - 1;
      markDirty();
      saveCurrentDoc();
      renderStage();
    }

    // ── Slide CRUD ──────────────────────────────────────────────────────────
    q('#p-add-slide').addEventListener('click', () => {
      state.doc.slides.splice(state.currentSlide + 1, 0, newSlide());
      selectSlide(state.currentSlide + 1);
      markDirty();
    });
    q('#p-dup-slide').addEventListener('click', () => {
      const copy = JSON.parse(JSON.stringify(currentSlide()));
      copy.id = uid();
      state.doc.slides.splice(state.currentSlide + 1, 0, copy);
      selectSlide(state.currentSlide + 1);
      markDirty();
    });
    q('#p-del-slide').addEventListener('click', () => {
      if (state.doc.slides.length <= 1) { toast('Mindestens eine Folie erforderlich.', 'warn'); return; }
      if (!confirm('Folie löschen?')) return;
      state.doc.slides.splice(state.currentSlide, 1);
      selectSlide(Math.min(state.currentSlide, state.doc.slides.length - 1));
      markDirty();
    });
    q('#p-mv-left').addEventListener('click', () => {
      if (state.currentSlide <= 0) return;
      const slides = state.doc.slides;
      [slides[state.currentSlide], slides[state.currentSlide - 1]] = [slides[state.currentSlide - 1], slides[state.currentSlide]];
      selectSlide(state.currentSlide - 1);
      markDirty();
    });
    q('#p-mv-right').addEventListener('click', () => {
      const slides = state.doc.slides;
      if (state.currentSlide >= slides.length - 1) return;
      [slides[state.currentSlide], slides[state.currentSlide + 1]] = [slides[state.currentSlide + 1], slides[state.currentSlide]];
      selectSlide(state.currentSlide + 1);
      markDirty();
    });
    q('#p-bg').addEventListener('input', e => {
      currentSlide().bg = e.target.value;
      stage.style.background = e.target.value;
      renderThumbs();
      markDirty();
    });

    // Add element buttons
    q('#p-add-text').addEventListener('click', () => addElement('text'));
    q('#p-add-rect').addEventListener('click', () => addElement('rect'));
    q('#p-add-ellipse').addEventListener('click', () => addElement('ellipse'));
    q('#p-add-line').addEventListener('click', () => addElement('line'));
    q('#p-del-el').addEventListener('click', () => {
      const slide = currentSlide();
      if (state.selectedEl === null || !slide.elements[state.selectedEl]) return;
      slide.elements.splice(state.selectedEl, 1);
      state.selectedEl = null;
      markDirty();
      saveCurrentDoc();
      renderStage();
    });

    // ── Save / Load ─────────────────────────────────────────────────────────
    function markDirty() {
      state.isDirty = true;
      q('#p-dirty').textContent = '● Ungespeichert';
    }
    function markClean() {
      state.isDirty = false;
      q('#p-dirty').textContent = '';
    }
    function saveCurrentDoc() {
      const docs = loadDocs();
      state.doc.modified = now();
      docs[state.doc.id] = state.doc;
      saveDocs(docs);
      state.docId = state.doc.id;
    }

    q('#p-save').addEventListener('click', () => {
      state.doc.name = q('#p-docname').value.trim() || 'Präsentation';
      saveCurrentDoc();
      markClean();
      toast('Gespeichert: ' + state.doc.name, 'success');
    });

    q('#p-new').addEventListener('click', () => {
      if (state.isDirty && !confirm('Änderungen verwerfen?')) return;
      state.doc = newDoc();
      state.currentSlide = 0;
      state.selectedEl = null;
      q('#p-docname').value = state.doc.name;
      markClean();
      renderThumbs();
      renderStage();
    });

    q('#p-open').addEventListener('click', () => openDocDialog());
    q('#p-docname').addEventListener('input', markDirty);

    function openDocDialog() {
      const docs = loadDocs();
      const entries = Object.values(docs).sort((a, b) => (b.modified || '').localeCompare(a.modified || ''));
      if (!entries.length) { toast('Keine Präsentationen gespeichert.', 'info'); return; }
      const overlay = document.createElement('div');
      overlay.className = 'modal-overlay';
      overlay.innerHTML = `<div class="modal-box"><h3 style="margin:0 0 var(--sp-4);color:var(--text);">Präsentation öffnen</h3>
        <div>${entries.map(d => `<div class="doc-row" data-id="${sanitize(d.id)}"><span style="flex:1;color:var(--text);">${sanitize(d.name)}</span><span style="font-size:var(--text-xs);color:var(--text-muted);">${(d.modified||'').slice(0,10)}</span><button class="tbtn doc-del" data-id="${sanitize(d.id)}" style="margin-left:8px;">${ICON_TRASH}</button></div>`).join('')}</div>
        <div style="margin-top:var(--sp-4);text-align:right;"><button class="tbtn" id="modal-cancel">Abbrechen</button></div>
      </div>`;
      document.body.appendChild(overlay);
      overlay.querySelector('#modal-cancel').addEventListener('click', () => overlay.remove());
      overlay.querySelectorAll('.doc-row').forEach(row => {
        row.addEventListener('click', e => {
          if (e.target.closest('.doc-del')) return;
          if (state.isDirty && !confirm('Änderungen verwerfen?')) return;
          const d = docs[row.dataset.id];
          if (!d) return;
          state.doc = d;
          state.currentSlide = 0;
          state.selectedEl = null;
          q('#p-docname').value = d.name;
          markClean();
          renderThumbs();
          renderStage();
          overlay.remove();
        });
      });
      overlay.querySelectorAll('.doc-del').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          if (!confirm('Löschen?')) return;
          const docs2 = loadDocs();
          delete docs2[btn.dataset.id];
          saveDocs(docs2);
          btn.closest('.doc-row').remove();
        });
      });
    }

    // ── Fullscreen ──────────────────────────────────────────────────────────
    const fsEl = container.querySelector('#p-fs');
    const fsSlide = container.querySelector('#p-fs-slide');
    const fsCounter = container.querySelector('#p-fs-counter');

    function renderFsSlide(idx) {
      const slide = state.doc.slides[idx];
      fsSlide.style.background = slide.bg || '#1e1b4b';
      fsSlide.innerHTML = '';
      (slide.elements || []).forEach(elem => {
        const div = document.createElement('div');
        div.style.position = 'absolute';
        div.style.left = (elem.x / STAGE_W * 100) + '%';
        div.style.top = (elem.y / STAGE_H * 100) + '%';
        div.style.width = (elem.w / STAGE_W * 100) + '%';
        div.style.height = (elem.h / STAGE_H * 100) + '%';
        div.style.zIndex = elem.z || 1;
        if (elem.type === 'text') {
          div.style.color = elem.color || '#fff';
          div.style.fontSize = 'clamp(12px, 3vw, ' + (elem.fontSize || 24) + 'px)';
          div.style.fontWeight = elem.bold ? '700' : '400';
          div.style.display = 'flex';
          div.style.alignItems = 'center';
          div.style.justifyContent = 'center';
          div.style.textAlign = 'center';
          div.textContent = elem.text || '';
        } else if (elem.type === 'rect') {
          div.style.background = elem.fill || 'rgba(124,58,237,0.5)';
          div.style.border = `${elem.strokeW || 2}px solid ${elem.stroke || '#7c3aed'}`;
          div.style.borderRadius = (elem.radius || 0) + 'px';
        } else if (elem.type === 'ellipse') {
          div.style.background = elem.fill || 'rgba(124,58,237,0.5)';
          div.style.border = `${elem.strokeW || 2}px solid ${elem.stroke || '#7c3aed'}`;
          div.style.borderRadius = '50%';
        } else if (elem.type === 'line') {
          div.style.height = (elem.strokeW || 2) + 'px';
          div.style.background = elem.stroke || '#7c3aed';
        }
        fsSlide.appendChild(div);
      });
      fsCounter.textContent = `${idx + 1} / ${state.doc.slides.length}`;
      state.currentSlide = idx;
    }

    q('#p-present').addEventListener('click', () => {
      state.presenting = true;
      fsEl.style.display = 'flex';
      renderFsSlide(state.currentSlide);
      fsEl.focus();
    });
    q('#p-fs-exit').addEventListener('click', () => { state.presenting = false; fsEl.style.display = 'none'; });
    q('#p-fs-prev').addEventListener('click', () => { if (state.currentSlide > 0) renderFsSlide(state.currentSlide - 1); });
    q('#p-fs-next').addEventListener('click', () => { if (state.currentSlide < state.doc.slides.length - 1) renderFsSlide(state.currentSlide + 1); });

    const fsKeyHandler = e => {
      if (!state.presenting) return;
      if (e.key === 'ArrowRight' || e.key === ' ') { if (state.currentSlide < state.doc.slides.length - 1) renderFsSlide(state.currentSlide + 1); }
      else if (e.key === 'ArrowLeft') { if (state.currentSlide > 0) renderFsSlide(state.currentSlide - 1); }
      else if (e.key === 'Escape') { state.presenting = false; fsEl.style.display = 'none'; }
    };
    document.addEventListener('keydown', fsKeyHandler);
    state.listeners.push({ target: document, type: 'keydown', fn: fsKeyHandler });

    // Ctrl+S
    const ctrlS = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's' && !state.presenting) { e.preventDefault(); q('#p-save').click(); } };
    container.addEventListener('keydown', ctrlS);
    state.listeners.push({ target: container, type: 'keydown', fn: ctrlS });

    // ── Back ────────────────────────────────────────────────────────────────
    q('#p-back').addEventListener('click', () => {
      if (state.isDirty && !confirm('Änderungen verwerfen?')) return;
      window.__jarvis?.showLauncher();
    });

    // ── Init ────────────────────────────────────────────────────────────────
    renderThumbs();
    renderStage();
    resizeStage();
  },

  unmount() {
    if (!this._state) return;
    const { listeners, timers } = this._state;
    for (const item of listeners) {
      if (item.type === '_ro') item.ro.disconnect();
      else item.target.removeEventListener(item.type, item.fn);
    }
    for (const t of timers) clearTimeout(t);
    const s = document.getElementById('present-styles');
    if (s) s.remove();
    this._state = null;
  }
};
