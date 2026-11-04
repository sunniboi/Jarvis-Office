import Store from '../../core/store.js';
import { uid, now, toast, el } from '../../core/utils.js';

// ── Constants ─────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'jarvis_draw_docs';
const GRID_SIZE = 20;
const HANDLE_SIZE = 8;
const UNDO_LIMIT = 50;

// ── Hit-Testing ───────────────────────────────────────────────────────────────
function pointInShape(shape, px, py) {
  const { type, x, y, w, h, style } = shape;
  const lw = (style.lineWidth || 2) / 2 + 4; // hit margin
  if (type === 'rect') {
    return px >= x - lw && px <= x + w + lw && py >= y - lw && py <= y + h + lw;
  }
  if (type === 'ellipse') {
    const cx = x + w / 2, cy = y + h / 2;
    const rx = Math.abs(w / 2) + lw, ry = Math.abs(h / 2) + lw;
    if (rx === 0 || ry === 0) return false;
    // fill or stroke-only
    const inside = ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2);
    if (style.fill && style.fill !== 'none') return inside <= 1;
    const rxInner = Math.max(0, Math.abs(w / 2) - lw);
    const ryInner = Math.max(0, Math.abs(h / 2) - lw);
    const outside = ((px - cx) ** 2) / (rxInner ** 2 || 1) + ((py - cy) ** 2) / (ryInner ** 2 || 1);
    return inside <= 1 && outside >= 1;
  }
  if (type === 'line' || type === 'arrow') {
    const x2 = x + w, y2 = y + h;
    const dx = x2 - x, dy = y2 - y;
    const len2 = dx * dx + dy * dy;
    if (len2 === 0) return Math.hypot(px - x, py - y) <= lw;
    const t = Math.max(0, Math.min(1, ((px - x) * dx + (py - y) * dy) / len2));
    const nearX = x + t * dx, nearY = y + t * dy;
    return Math.hypot(px - nearX, py - nearY) <= lw + 2;
  }
  if (type === 'pen') {
    const pts = shape.points || [];
    for (let i = 1; i < pts.length; i++) {
      const ax = pts[i - 1][0], ay = pts[i - 1][1];
      const bx = pts[i][0], by = pts[i][1];
      const dx = bx - ax, dy = by - ay;
      const len2 = dx * dx + dy * dy;
      if (len2 === 0) continue;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / len2));
      if (Math.hypot(px - ax - t * dx, py - ay - t * dy) <= lw + 2) return true;
    }
    return false;
  }
  if (type === 'text') {
    return px >= x && px <= x + (shape.w || 150) && py >= y - 20 && py <= y + 4;
  }
  // fallback bounding box
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

// ── Resize Handle Positions ────────────────────────────────────────────────────
function getHandles(shape) {
  const { x, y, w, h } = shape;
  return [
    { id: 'nw', cx: x,       cy: y },
    { id: 'n',  cx: x + w/2, cy: y },
    { id: 'ne', cx: x + w,   cy: y },
    { id: 'e',  cx: x + w,   cy: y + h/2 },
    { id: 'se', cx: x + w,   cy: y + h },
    { id: 's',  cx: x + w/2, cy: y + h },
    { id: 'sw', cx: x,       cy: y + h },
    { id: 'w',  cx: x,       cy: y + h/2 },
  ];
}

// ── Module ────────────────────────────────────────────────────────────────────
export default {
  id: 'draw',
  label: 'Draw',
  color: 'var(--app-draw)',
  icon: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 16l1.5-4L14 3.5a2 2 0 012.8 2.8L8 15.5 4 16z"/><path d="M12.5 5l2 2"/></svg>',

  _state: null,

  mount(container) {
    this._state = createDrawApp(container);
  },

  unmount() {
    if (this._state) {
      this._state.destroy();
      this._state = null;
    }
  }
};

function createDrawApp(container) {
  // ── State ────────────────────────────────────────────────────────────────
  let shapes = [];
  let selectedIds = new Set();
  let tool = 'select';
  let docId = null;
  let docName = 'Zeichnung1';
  let isDirty = false;
  let undoStack = [];
  let redoStack = [];
  let zoom = 1;
  let panX = 0, panY = 0;
  let showGrid = false;
  let fillColor = '#7c3aed';
  let strokeColor = '#7c3aed';
  let lineWidth = 2;
  let opacity = 1;
  // interaction state
  let pointerState = null; // { mode: 'draw'|'move'|'resize'|'pan'|'pen', ... }

  // ── DOM ──────────────────────────────────────────────────────────────────
  container.innerHTML = `
<div class="draw-app" style="display:flex;flex-direction:column;height:100%;background:var(--bg);color:var(--text);font-family:var(--font-sans)">
  <div class="titlebar" style="display:flex;align-items:center;gap:var(--sp-2);padding:0 var(--sp-3);height:var(--h-titlebar);background:var(--bg-elevated);border-bottom:1px solid var(--border);flex-shrink:0">
    <button class="draw-back btn-icon" title="Zurück" style="background:none;border:none;cursor:pointer;color:var(--text);display:flex;align-items:center;padding:4px">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="18" height="18"><path d="M12 4L6 10l6 6"/></svg>
    </button>
    <span class="draw-docname" contenteditable="true" style="flex:1;font-size:var(--text-md);font-weight:500;outline:none;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${escHtml(docName)}</span>
    <div style="display:flex;gap:var(--sp-2)">
      <button class="draw-btn-new" style="${btnStyle('ghost')}">Neu</button>
      <button class="draw-btn-open" style="${btnStyle('ghost')}">Öffnen</button>
      <button class="draw-btn-save" style="${btnStyle('primary')}">Speichern</button>
      <button class="draw-btn-export-png" style="${btnStyle('ghost')}">PNG</button>
      <button class="draw-btn-export-svg" style="${btnStyle('ghost')}">SVG</button>
    </div>
  </div>

  <div style="display:flex;flex:1;min-height:0;overflow:hidden">
    <!-- Left Toolbox -->
    <div class="draw-toolbox" style="width:48px;background:var(--bg-elevated);border-right:1px solid var(--border);display:flex;flex-direction:column;align-items:center;padding:var(--sp-2) 0;gap:4px;flex-shrink:0">
      ${toolBtn('select','Auswählen','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M5 3l11 7-6 1-3 5z"/></svg>')}
      ${toolBtn('pen','Stift','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 16l1.5-4L14 3.5a2 2 0 012.8 2.8L8 15.5 4 16z"/></svg>')}
      ${toolBtn('rect','Rechteck','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><rect x="3" y="4" width="14" height="12" rx="1"/></svg>')}
      ${toolBtn('ellipse','Ellipse','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><ellipse cx="10" cy="10" rx="8" ry="6"/></svg>')}
      ${toolBtn('line','Linie','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 16L16 4"/></svg>')}
      ${toolBtn('arrow','Pfeil','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 16L16 4m0 0H9m7 0v7"/></svg>')}
      ${toolBtn('text','Text','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><path d="M4 5h12M10 5v10M7 15h6"/></svg>')}
      <div style="width:32px;height:1px;background:var(--border);margin:4px 0"></div>
      ${toolBtn('image','Bild','<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5" width="16" height="16"><rect x="2" y="4" width="16" height="12" rx="1"/><path d="M2 13l4-4 3 3 3-4 6 5"/><circle cx="7" cy="8" r="1" fill="currentColor"/></svg>')}
    </div>

    <!-- Canvas Area -->
    <div class="draw-canvas-wrap" style="flex:1;position:relative;overflow:hidden;cursor:crosshair">
      <canvas class="draw-canvas" style="position:absolute;top:0;left:0"></canvas>
      <!-- Zoom controls -->
      <div style="position:absolute;bottom:var(--sp-3);left:var(--sp-3);display:flex;align-items:center;gap:4px;background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-md);padding:4px">
        <button class="draw-zoom-out" style="background:none;border:none;cursor:pointer;color:var(--text);width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px">−</button>
        <span class="draw-zoom-label" style="font-size:var(--text-sm);min-width:40px;text-align:center">100%</span>
        <button class="draw-zoom-in" style="background:none;border:none;cursor:pointer;color:var(--text);width:24px;height:24px;display:flex;align-items:center;justify-content:center;font-size:16px">+</button>
        <button class="draw-zoom-fit" style="background:none;border:none;cursor:pointer;color:var(--text-muted);font-size:var(--text-sm);padding:0 4px" title="Fit to screen">Fit</button>
      </div>
    </div>

    <!-- Right Props Panel -->
    <div class="draw-props" style="width:200px;background:var(--bg-elevated);border-left:1px solid var(--border);padding:var(--sp-3);display:flex;flex-direction:column;gap:var(--sp-3);flex-shrink:0;overflow-y:auto">
      <div style="font-size:var(--text-xs);font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.05em">Eigenschaften</div>
      <label style="font-size:var(--text-sm);display:flex;flex-direction:column;gap:4px">Füllfarbe
        <input type="color" class="draw-prop-fill" value="#7c3aed" style="width:100%;height:28px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface);cursor:pointer" />
      </label>
      <label style="font-size:var(--text-sm);display:flex;flex-direction:column;gap:4px">Rahmenfarbe
        <input type="color" class="draw-prop-stroke" value="#7c3aed" style="width:100%;height:28px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--surface);cursor:pointer" />
      </label>
      <label style="font-size:var(--text-sm);display:flex;flex-direction:column;gap:4px">
        <span>Rahmenstärke <span class="draw-prop-lw-val">2</span>px</span>
        <input type="range" class="draw-prop-lw" min="1" max="20" value="2" style="width:100%" />
      </label>
      <label style="font-size:var(--text-sm);display:flex;flex-direction:column;gap:4px">
        <span>Deckkraft <span class="draw-prop-opacity-val">100</span>%</span>
        <input type="range" class="draw-prop-opacity" min="0" max="100" value="100" style="width:100%" />
      </label>
      <div style="display:flex;gap:4px;flex-direction:column">
        <div style="font-size:var(--text-xs);color:var(--text-muted)">Ebene</div>
        <div style="display:flex;gap:4px">
          <button class="draw-prop-up" style="${btnStyle('ghost')};flex:1" title="Nach vorne">↑</button>
          <button class="draw-prop-down" style="${btnStyle('ghost')};flex:1" title="Nach hinten">↓</button>
        </div>
      </div>
      <button class="draw-prop-delete" style="${btnStyle('danger')};margin-top:auto" disabled>Löschen</button>
    </div>
  </div>

  <div class="draw-statusbar" style="height:var(--h-statusbar);background:var(--bg-elevated);border-top:1px solid var(--border);display:flex;align-items:center;padding:0 var(--sp-3);gap:var(--sp-4);font-size:var(--text-xs);color:var(--text-muted);flex-shrink:0">
    <span class="draw-status-tool">Werkzeug: Auswählen</span>
    <span class="draw-status-shapes">0 Formen</span>
    <span class="draw-status-dirty" style="margin-left:auto"></span>
  </div>
</div>

<!-- Hidden file input for image import -->
<input type="file" class="draw-file-input" accept="image/*" style="display:none">

<!-- Modal container -->
<div class="draw-modal-overlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:1000;align-items:center;justify-content:center"></div>
`;

  // ── Element references ────────────────────────────────────────────────────
  const $ = s => container.querySelector(s);
  const canvasWrap = $('.draw-canvas-wrap');
  const canvas = $('.draw-canvas');
  const ctx = canvas.getContext('2d');
  const docNameEl = $('.draw-docname');
  const statusTool = $('.draw-status-tool');
  const statusShapes = $('.draw-status-shapes');
  const statusDirty = $('.draw-status-dirty');
  const propFill = $('.draw-prop-fill');
  const propStroke = $('.draw-prop-stroke');
  const propLw = $('.draw-prop-lw');
  const propLwVal = $('.draw-prop-lw-val');
  const propOpacity = $('.draw-prop-opacity');
  const propOpacityVal = $('.draw-prop-opacity-val');
  const propDelete = $('.draw-prop-delete');
  const fileInput = $('.draw-file-input');
  const modalOverlay = $('.draw-modal-overlay');

  // ── Canvas sizing ─────────────────────────────────────────────────────────
  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(canvasWrap);

  function resizeCanvas() {
    const r = canvasWrap.getBoundingClientRect();
    canvas.width = r.width;
    canvas.height = r.height;
    render();
  }

  // ── Undo / Redo ───────────────────────────────────────────────────────────
  function snapshot() {
    undoStack.push(JSON.stringify(shapes));
    if (undoStack.length > UNDO_LIMIT) undoStack.shift();
    redoStack = [];
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(shapes));
    shapes = JSON.parse(undoStack.pop());
    selectedIds.clear();
    markDirty(); render(); updateProps();
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(shapes));
    shapes = JSON.parse(redoStack.pop());
    selectedIds.clear();
    markDirty(); render(); updateProps();
  }

  // ── Dirty tracking ─────────────────────────────────────────────────────────
  function markDirty() {
    isDirty = true;
    statusDirty.textContent = '● Ungespeichert';
  }
  function markClean() {
    isDirty = false;
    statusDirty.textContent = '';
  }

  // ── Coordinate transforms ─────────────────────────────────────────────────
  function canvasToWorld(cx2, cy2) {
    return { x: (cx2 - panX) / zoom, y: (cy2 - panY) / zoom };
  }
  function getCanvasPos(e) {
    const r = canvas.getBoundingClientRect();
    return canvasToWorld(e.clientX - r.left, e.clientY - r.top);
  }
  function worldToCanvas(wx, wy) {
    return { x: wx * zoom + panX, y: wy * zoom + panY };
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function render() {
    const W = canvas.width, H = canvas.height;
    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg').trim() || '#0d0d1a';
    ctx.fillRect(0, 0, W, H);

    // Grid
    if (showGrid) drawGrid(W, H);

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // Shapes
    for (const shape of shapes) {
      drawShape(shape, selectedIds.has(shape.id));
    }

    // In-progress shape
    if (pointerState?.mode === 'draw' && pointerState.preview) {
      drawShape(pointerState.preview, false);
    }
    if (pointerState?.mode === 'pen' && pointerState.preview) {
      drawShape(pointerState.preview, false);
    }

    ctx.restore();

    // Selection handles (in screen space for crisp rendering)
    if (selectedIds.size === 1) {
      const shape = shapes.find(s => s.id === [...selectedIds][0]);
      if (shape && shape.type !== 'pen') drawHandles(shape);
    }

    statusShapes.textContent = `${shapes.length} Form${shapes.length !== 1 ? 'en' : ''}`;
    $('.draw-zoom-label').textContent = Math.round(zoom * 100) + '%';
  }

  function drawGrid(W, H) {
    const step = GRID_SIZE * zoom;
    const startX = ((panX % step) + step) % step;
    const startY = ((panY % step) + step) % step;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.05)';
    ctx.lineWidth = 1;
    for (let x = startX; x < W; x += step) { ctx.moveTo(x, 0); ctx.lineTo(x, H); }
    for (let y = startY; y < H; y += step) { ctx.moveTo(0, y); ctx.lineTo(W, y); }
    ctx.stroke();
  }

  function drawShape(shape, isSelected) {
    const { type, x, y, w, h, style } = shape;
    ctx.save();
    ctx.globalAlpha = style.opacity ?? 1;

    if (isSelected) {
      ctx.shadowColor = 'rgba(124,58,237,0.6)';
      ctx.shadowBlur = 8 / zoom;
    }

    ctx.fillStyle = style.fill || 'none';
    ctx.strokeStyle = style.stroke || '#7c3aed';
    ctx.lineWidth = (style.lineWidth || 2) / zoom;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (type === 'rect') {
      ctx.beginPath();
      const r = 4 / zoom;
      ctx.roundRect(x, y, w, h, r);
      if (style.fill && style.fill !== 'none') ctx.fill();
      ctx.stroke();
    } else if (type === 'ellipse') {
      ctx.beginPath();
      ctx.ellipse(x + w/2, y + h/2, Math.abs(w/2), Math.abs(h/2), 0, 0, Math.PI * 2);
      if (style.fill && style.fill !== 'none') ctx.fill();
      ctx.stroke();
    } else if (type === 'line') {
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + w, y + h);
      ctx.stroke();
    } else if (type === 'arrow') {
      const x2 = x + w, y2 = y + h;
      const angle = Math.atan2(h, w);
      const headLen = Math.max(10, (style.lineWidth || 2) * 4) / zoom;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(x2, y2);
      ctx.lineTo(x2 - headLen * Math.cos(angle - Math.PI/6), y2 - headLen * Math.sin(angle - Math.PI/6));
      ctx.lineTo(x2 - headLen * Math.cos(angle + Math.PI/6), y2 - headLen * Math.sin(angle + Math.PI/6));
      ctx.closePath();
      ctx.fillStyle = style.stroke || '#7c3aed';
      ctx.fill();
    } else if (type === 'pen') {
      const pts = shape.points || [];
      if (pts.length < 2) {
        ctx.restore();
        return;
      }
      ctx.beginPath();
      ctx.moveTo(pts[0][0], pts[0][1]);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
      ctx.stroke();
    } else if (type === 'text') {
      const fontSize = (style.fontSize || 16) / zoom;
      ctx.font = `${fontSize}px ${getComputedStyle(document.documentElement).getPropertyValue('--font-sans') || 'Inter, sans-serif'}`;
      ctx.fillStyle = style.stroke || '#e2e8f0';
      ctx.fillText(shape.text || '', x, y);
      if (isSelected) {
        const metrics = ctx.measureText(shape.text || '');
        ctx.strokeStyle = 'rgba(124,58,237,0.5)';
        ctx.lineWidth = 1 / zoom;
        ctx.strokeRect(x - 2/zoom, y - fontSize - 2/zoom, metrics.width + 4/zoom, fontSize + 6/zoom);
      }
    } else if (type === 'image' && shape._img) {
      ctx.drawImage(shape._img, x, y, w, h);
      if (isSelected) {
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2 / zoom;
        ctx.strokeRect(x, y, w, h);
      }
    }
    ctx.restore();
  }

  function drawHandles(shape) {
    const handles = getHandles(shape);
    for (const h of handles) {
      const { x: hx, y: hy } = worldToCanvas(h.cx, h.cy);
      ctx.save();
      ctx.fillStyle = '#fff';
      ctx.strokeStyle = '#7c3aed';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.rect(hx - HANDLE_SIZE/2, hy - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  // ── Snap to grid ───────────────────────────────────────────────────────────
  function snap(v) {
    return showGrid ? Math.round(v / GRID_SIZE) * GRID_SIZE : v;
  }

  // ── Handle hit test ────────────────────────────────────────────────────────
  function hitHandle(shape, wx, wy) {
    if (selectedIds.size !== 1) return null;
    const handles = getHandles(shape);
    const margin = (HANDLE_SIZE / 2 + 2) / zoom;
    for (const h of handles) {
      if (Math.abs(wx - h.cx) <= margin && Math.abs(wy - h.cy) <= margin) return h.id;
    }
    return null;
  }

  // ── Pointer Events ────────────────────────────────────────────────────────
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);

  function onPointerDown(e) {
    if (e.button === 1 || (e.button === 0 && e.altKey)) {
      // Middle button or Alt+drag → pan
      pointerState = { mode: 'pan', startX: e.clientX, startY: e.clientY, startPanX: panX, startPanY: panY };
      canvas.setPointerCapture(e.pointerId);
      return;
    }
    const { x, y } = getCanvasPos(e);
    const sx = snap(x), sy = snap(y);

    if (tool === 'select') {
      // Check handle first
      if (selectedIds.size === 1) {
        const sel = shapes.find(s => s.id === [...selectedIds][0]);
        if (sel && sel.type !== 'pen') {
          const hid = hitHandle(sel, x, y);
          if (hid) {
            pointerState = { mode: 'resize', handleId: hid, shape: sel,
              origShape: JSON.parse(JSON.stringify(sel)), startX: x, startY: y };
            canvas.setPointerCapture(e.pointerId);
            return;
          }
        }
      }
      // Hit test shapes (back to front)
      let hit = null;
      for (let i = shapes.length - 1; i >= 0; i--) {
        if (pointInShape(shapes[i], x, y)) { hit = shapes[i]; break; }
      }
      if (hit) {
        if (e.shiftKey) {
          if (selectedIds.has(hit.id)) selectedIds.delete(hit.id);
          else selectedIds.add(hit.id);
        } else {
          if (!selectedIds.has(hit.id)) selectedIds = new Set([hit.id]);
        }
        // Prepare move
        const startPositions = {};
        for (const id of selectedIds) {
          const s = shapes.find(sh => sh.id === id);
          if (s) startPositions[id] = { x: s.x, y: s.y };
        }
        pointerState = { mode: 'move', startX: x, startY: y, startPositions };
        canvas.setPointerCapture(e.pointerId);
      } else {
        selectedIds.clear();
      }
      updateProps(); render();
      return;
    }

    if (tool === 'pen') {
      snapshot();
      pointerState = { mode: 'pen', preview: { id: uid(), type: 'pen', x: 0, y: 0, w: 0, h: 0,
        points: [[x, y]], style: { stroke: strokeColor, lineWidth, opacity } } };
      canvas.setPointerCapture(e.pointerId);
      return;
    }

    if (tool === 'text') {
      showTextModal(sx, sy);
      return;
    }

    if (tool === 'image') {
      fileInput.click();
      fileInput._pendingX = sx;
      fileInput._pendingY = sy;
      return;
    }

    // Shape drawing tools
    snapshot();
    const newShape = { id: uid(), type: tool, x: sx, y: sy, w: 0, h: 0,
      style: { fill: fillColor, stroke: strokeColor, lineWidth, opacity } };
    pointerState = { mode: 'draw', startX: sx, startY: sy, preview: newShape };
    canvas.setPointerCapture(e.pointerId);
  }

  function onPointerMove(e) {
    if (!pointerState) return;
    const { x, y } = getCanvasPos(e);
    const sx = snap(x), sy = snap(y);
    const ps = pointerState;

    if (ps.mode === 'pan') {
      panX = ps.startPanX + (e.clientX - ps.startX);
      panY = ps.startPanY + (e.clientY - ps.startY);
      render(); return;
    }

    if (ps.mode === 'pen') {
      ps.preview.points.push([x, y]);
      render(); return;
    }

    if (ps.mode === 'draw') {
      ps.preview.w = sx - ps.startX;
      ps.preview.h = sy - ps.startY;
      render(); return;
    }

    if (ps.mode === 'move') {
      const dx = x - ps.startX, dy = y - ps.startY;
      for (const id of selectedIds) {
        const s = shapes.find(sh => sh.id === id);
        const orig = ps.startPositions[id];
        if (s && orig) { s.x = snap(orig.x + dx); s.y = snap(orig.y + dy); }
      }
      markDirty(); render(); return;
    }

    if (ps.mode === 'resize') {
      const { handleId, origShape } = ps;
      const s = shapes.find(sh => sh.id === origShape.id);
      if (!s) return;
      const o = origShape;
      let nx = o.x, ny = o.y, nw = o.w, nh = o.h;
      if (handleId.includes('e')) nw = sx - o.x;
      if (handleId.includes('w')) { nw = (o.x + o.w) - sx; nx = sx; }
      if (handleId.includes('s')) nh = sy - o.y;
      if (handleId.includes('n')) { nh = (o.y + o.h) - sy; ny = sy; }
      s.x = nx; s.y = ny; s.w = nw; s.h = nh;
      markDirty(); render(); return;
    }
  }

  function onPointerUp(e) {
    const ps = pointerState;
    pointerState = null;

    if (!ps) return;

    if (ps.mode === 'draw') {
      const { preview } = ps;
      if (Math.abs(preview.w) > 3 || Math.abs(preview.h) > 3) {
        // Normalize negative dimensions
        if (preview.w < 0) { preview.x += preview.w; preview.w = -preview.w; }
        if (preview.h < 0) { preview.y += preview.h; preview.h = -preview.h; }
        shapes.push(preview);
        selectedIds = new Set([preview.id]);
        markDirty();
      } else {
        undoStack.pop(); // discard snapshot for tiny shapes
      }
    } else if (ps.mode === 'pen') {
      const pts = ps.preview.points;
      if (pts.length >= 2) {
        const xs = pts.map(p => p[0]), ys = pts.map(p => p[1]);
        ps.preview.x = Math.min(...xs); ps.preview.y = Math.min(...ys);
        ps.preview.w = Math.max(...xs) - ps.preview.x;
        ps.preview.h = Math.max(...ys) - ps.preview.y;
        shapes.push(ps.preview);
        selectedIds = new Set([ps.preview.id]);
        markDirty();
      } else {
        undoStack.pop();
      }
    } else if (ps.mode === 'move') {
      markDirty();
    } else if (ps.mode === 'resize') {
      markDirty();
    }

    updateProps(); render();
  }

  // ── Wheel zoom ────────────────────────────────────────────────────────────
  canvas.addEventListener('wheel', e => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.1 : 0.9;
    const r = canvas.getBoundingClientRect();
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    panX = mx - (mx - panX) * factor;
    panY = my - (my - panY) * factor;
    zoom = Math.max(0.1, Math.min(10, zoom * factor));
    render();
  }, { passive: false });

  $('.draw-zoom-in').addEventListener('click', () => { zoom = Math.min(10, zoom * 1.2); render(); });
  $('.draw-zoom-out').addEventListener('click', () => { zoom = Math.max(0.1, zoom / 1.2); render(); });
  $('.draw-zoom-fit').addEventListener('click', fitToScreen);

  function fitToScreen() {
    if (!shapes.length) { zoom = 1; panX = 0; panY = 0; render(); return; }
    const xs = shapes.flatMap(s => [s.x, s.x + s.w]);
    const ys = shapes.flatMap(s => [s.y, s.y + s.h]);
    const minX = Math.min(...xs), minY = Math.min(...ys);
    const maxX = Math.max(...xs), maxY = Math.max(...ys);
    const W = canvas.width, H = canvas.height;
    const pad = 40;
    zoom = Math.min((W - pad*2) / (maxX - minX || 1), (H - pad*2) / (maxY - minY || 1), 4);
    panX = pad - minX * zoom;
    panY = pad - minY * zoom;
    render();
  }

  // ── Props panel ───────────────────────────────────────────────────────────
  function updateProps() {
    const hasSelection = selectedIds.size > 0;
    propDelete.disabled = !hasSelection;
    if (selectedIds.size === 1) {
      const s = shapes.find(sh => sh.id === [...selectedIds][0]);
      if (s) {
        propFill.value = s.style.fill && s.style.fill !== 'none' ? s.style.fill : '#000000';
        propStroke.value = s.style.stroke || '#7c3aed';
        propLw.value = s.style.lineWidth || 2;
        propLwVal.textContent = propLw.value;
        propOpacity.value = Math.round((s.style.opacity ?? 1) * 100);
        propOpacityVal.textContent = propOpacity.value;
      }
    }
  }

  function applyPropToSelected(key, value) {
    if (!selectedIds.size) return;
    snapshot();
    for (const id of selectedIds) {
      const s = shapes.find(sh => sh.id === id);
      if (s) s.style[key] = value;
    }
    markDirty(); render();
  }

  propFill.addEventListener('input', () => { fillColor = propFill.value; applyPropToSelected('fill', fillColor); });
  propStroke.addEventListener('input', () => { strokeColor = propStroke.value; applyPropToSelected('stroke', strokeColor); });
  propLw.addEventListener('input', () => {
    lineWidth = Number(propLw.value); propLwVal.textContent = lineWidth;
    applyPropToSelected('lineWidth', lineWidth);
  });
  propOpacity.addEventListener('input', () => {
    opacity = Number(propOpacity.value) / 100; propOpacityVal.textContent = propOpacity.value;
    applyPropToSelected('opacity', opacity);
  });

  $('.draw-prop-up').addEventListener('click', () => {
    for (const id of selectedIds) {
      const i = shapes.findIndex(s => s.id === id);
      if (i < shapes.length - 1) { snapshot(); [shapes[i], shapes[i+1]] = [shapes[i+1], shapes[i]]; markDirty(); }
    }
    render();
  });
  $('.draw-prop-down').addEventListener('click', () => {
    for (const id of selectedIds) {
      const i = shapes.findIndex(s => s.id === id);
      if (i > 0) { snapshot(); [shapes[i-1], shapes[i]] = [shapes[i], shapes[i-1]]; markDirty(); }
    }
    render();
  });

  propDelete.addEventListener('click', deleteSelected);

  // ── Toolbox wiring ────────────────────────────────────────────────────────
  container.querySelectorAll('.draw-tool-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      tool = btn.dataset.tool;
      container.querySelectorAll('.draw-tool-btn').forEach(b => b.style.background = 'none');
      btn.style.background = 'var(--surface-hi)';
      canvas.style.cursor = tool === 'select' ? 'default' : 'crosshair';
      statusTool.textContent = `Werkzeug: ${btn.title}`;
    });
  });
  // Activate select by default
  const firstBtn = container.querySelector('.draw-tool-btn[data-tool="select"]');
  if (firstBtn) { firstBtn.style.background = 'var(--surface-hi)'; }

  // ── Keyboard ──────────────────────────────────────────────────────────────
  const onKey = e => {
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || e.target.isContentEditable) return;
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); undo(); return; }
    if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) { e.preventDefault(); redo(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'a') { e.preventDefault(); selectedIds = new Set(shapes.map(s => s.id)); updateProps(); render(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 'd') { e.preventDefault(); duplicateSelected(); return; }
    if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); saveDoc(); return; }
    if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); deleteSelected(); return; }
    if (e.key === 'g' || e.key === 'G') { showGrid = !showGrid; render(); return; }
    if (e.key === 'Escape') { selectedIds.clear(); updateProps(); render(); return; }
  };
  document.addEventListener('keydown', onKey);

  function deleteSelected() {
    if (!selectedIds.size) return;
    snapshot();
    shapes = shapes.filter(s => !selectedIds.has(s.id));
    selectedIds.clear();
    markDirty(); updateProps(); render();
  }

  function duplicateSelected() {
    if (!selectedIds.size) return;
    snapshot();
    const newIds = new Set();
    const toAdd = [];
    for (const id of selectedIds) {
      const s = shapes.find(sh => sh.id === id);
      if (!s) continue;
      const copy = JSON.parse(JSON.stringify(s));
      copy.id = uid(); copy.x += 20; copy.y += 20;
      toAdd.push(copy); newIds.add(copy.id);
    }
    shapes.push(...toAdd);
    selectedIds = newIds;
    markDirty(); updateProps(); render();
  }

  // ── Text input modal ──────────────────────────────────────────────────────
  function showTextModal(x, y) {
    modalOverlay.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-5);min-width:300px">
        <h3 style="margin:0 0 var(--sp-3);font-size:var(--text-lg)">Text eingeben</h3>
        <input type="text" id="draw-text-input" placeholder="Text…" style="width:100%;box-sizing:border-box;background:var(--surface);border:1px solid var(--border);border-radius:var(--r-sm);padding:var(--sp-2) var(--sp-3);color:var(--text);font-size:var(--text-md);outline:none" />
        <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-4);justify-content:flex-end">
          <button class="draw-modal-cancel" style="${btnStyle('ghost')}">Abbrechen</button>
          <button class="draw-modal-ok" style="${btnStyle('primary')}">Einfügen</button>
        </div>
      </div>`;
    modalOverlay.style.display = 'flex';
    const inp = container.querySelector('#draw-text-input');
    inp.focus();
    container.querySelector('.draw-modal-cancel').onclick = closeModal;
    container.querySelector('.draw-modal-ok').onclick = () => {
      const text = inp.value.trim();
      if (text) {
        snapshot();
        shapes.push({ id: uid(), type: 'text', x, y, w: 0, h: 0, text,
          style: { stroke: strokeColor, lineWidth, opacity, fontSize: 16 } });
        markDirty(); render();
      }
      closeModal();
    };
    inp.addEventListener('keydown', e => { if (e.key === 'Enter') container.querySelector('.draw-modal-ok').click(); });
  }

  function closeModal() { modalOverlay.style.display = 'none'; modalOverlay.innerHTML = ''; }

  // ── Open doc modal ────────────────────────────────────────────────────────
  function showOpenModal() {
    const docs = Store.get(STORAGE_KEY, {});
    const list = Object.values(docs).sort((a, b) => b.modified.localeCompare(a.modified));
    if (!list.length) { toast('Keine gespeicherten Zeichnungen.', 'info'); return; }
    modalOverlay.innerHTML = `
      <div style="background:var(--bg-elevated);border:1px solid var(--border);border-radius:var(--r-lg);padding:var(--sp-5);min-width:360px;max-width:480px;max-height:70vh;display:flex;flex-direction:column;gap:var(--sp-3)">
        <h3 style="margin:0;font-size:var(--text-lg)">Zeichnung öffnen</h3>
        <div style="overflow-y:auto;flex:1;display:flex;flex-direction:column;gap:4px">
          ${list.map(d => `<div class="draw-doc-row" data-id="${escHtml(d.id)}" style="display:flex;align-items:center;padding:var(--sp-2) var(--sp-3);border-radius:var(--r-sm);cursor:pointer;border:1px solid var(--border)">
            <span style="flex:1;font-size:var(--text-md)">${escHtml(d.name)}</span>
            <span style="font-size:var(--text-xs);color:var(--text-muted)">${new Date(d.modified).toLocaleDateString('de-DE')}</span>
            <button class="draw-doc-del" data-id="${escHtml(d.id)}" style="background:none;border:none;cursor:pointer;color:var(--text-muted);margin-left:var(--sp-2);padding:2px" title="Löschen">✕</button>
          </div>`).join('')}
        </div>
        <div style="display:flex;justify-content:flex-end"><button class="draw-modal-cancel" style="${btnStyle('ghost')}">Abbrechen</button></div>
      </div>`;
    modalOverlay.style.display = 'flex';
    container.querySelector('.draw-modal-cancel').onclick = closeModal;
    container.querySelectorAll('.draw-doc-row').forEach(row => {
      row.addEventListener('click', e => {
        if (e.target.closest('.draw-doc-del')) return;
        if (isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
        loadDoc(row.dataset.id); closeModal();
      });
    });
    container.querySelectorAll('.draw-doc-del').forEach(btn => {
      btn.addEventListener('click', e => {
        e.stopPropagation();
        if (!confirm('Löschen?')) return;
        const docs2 = Store.get(STORAGE_KEY, {});
        delete docs2[btn.dataset.id];
        Store.set(STORAGE_KEY, docs2);
        btn.closest('.draw-doc-row').remove();
      });
    });
  }

  // ── Save / Load ───────────────────────────────────────────────────────────
  function saveDoc() {
    const name = docNameEl.textContent.trim() || 'Zeichnung1';
    docName = name;
    if (!docId) docId = uid();
    const docs = Store.get(STORAGE_KEY, {});
    // Don't store _img (HTMLImageElement not serializable), just src
    const serializableShapes = shapes.map(s => {
      if (s.type !== 'image') return s;
      const { _img, ...rest } = s;
      return rest;
    });
    docs[docId] = { id: docId, name, elements: serializableShapes, modified: now() };
    Store.set(STORAGE_KEY, docs);
    markClean();
    toast('Gespeichert: ' + name, 'info');
  }

  function loadDoc(id) {
    const docs = Store.get(STORAGE_KEY, {});
    const d = docs[id];
    if (!d) return;
    docId = id;
    docName = d.name;
    docNameEl.textContent = d.name;
    shapes = (d.elements || []).map(s => {
      if (s.type === 'image' && s.src) {
        const img = new Image();
        img.onload = () => render();
        img.src = s.src;
        return { ...s, _img: img };
      }
      return s;
    });
    selectedIds.clear(); undoStack = []; redoStack = [];
    markClean(); render(); updateProps();
  }

  function newDoc() {
    if (isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    docId = null; docName = 'Zeichnung1'; docNameEl.textContent = docName;
    shapes = []; selectedIds.clear(); undoStack = []; redoStack = [];
    markClean(); render(); updateProps();
  }

  // ── Export ────────────────────────────────────────────────────────────────
  function exportPNG() {
    const link = document.createElement('a');
    link.download = (docName || 'zeichnung') + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  function exportSVG() {
    const W = canvas.width / zoom, H = canvas.height / zoom;
    let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" style="background:#0d0d1a">`;
    for (const s of shapes) {
      const { type, x, y, w, h, style } = s;
      const fill = style.fill || 'none';
      const stroke = style.stroke || '#7c3aed';
      const lw = style.lineWidth || 2;
      const alpha = style.opacity ?? 1;
      if (type === 'rect') svgContent += `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" stroke="${stroke}" stroke-width="${lw}" rx="4" opacity="${alpha}"/>`;
      else if (type === 'ellipse') svgContent += `<ellipse cx="${x+w/2}" cy="${y+h/2}" rx="${Math.abs(w/2)}" ry="${Math.abs(h/2)}" fill="${fill}" stroke="${stroke}" stroke-width="${lw}" opacity="${alpha}"/>`;
      else if (type === 'line') svgContent += `<line x1="${x}" y1="${y}" x2="${x+w}" y2="${y+h}" stroke="${stroke}" stroke-width="${lw}" stroke-linecap="round" opacity="${alpha}"/>`;
      else if (type === 'text') svgContent += `<text x="${x}" y="${y}" fill="${stroke}" font-size="${style.fontSize||16}" font-family="Inter,sans-serif" opacity="${alpha}">${escHtml(s.text||'')}</text>`;
    }
    svgContent += '</svg>';
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const link = document.createElement('a');
    link.download = (docName || 'zeichnung') + '.svg';
    link.href = URL.createObjectURL(blob);
    link.click(); URL.revokeObjectURL(link.href);
  }

  // ── Image import ───────────────────────────────────────────────────────────
  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        snapshot();
        const px = fileInput._pendingX || 100, py = fileInput._pendingY || 100;
        const shape = { id: uid(), type: 'image', x: px, y: py,
          w: Math.min(img.naturalWidth, 400), h: Math.min(img.naturalHeight, 300),
          style: { opacity: 1 }, src: e.target.result, _img: img };
        shapes.push(shape);
        selectedIds = new Set([shape.id]);
        markDirty(); render(); updateProps();
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
    fileInput.value = '';
  });

  // ── Titlebar wiring ────────────────────────────────────────────────────────
  $('.draw-btn-new').addEventListener('click', newDoc);
  $('.draw-btn-open').addEventListener('click', showOpenModal);
  $('.draw-btn-save').addEventListener('click', saveDoc);
  $('.draw-btn-export-png').addEventListener('click', exportPNG);
  $('.draw-btn-export-svg').addEventListener('click', exportSVG);
  docNameEl.addEventListener('input', markDirty);

  $('.draw-back').addEventListener('click', () => {
    if (isDirty && !confirm('Ungespeicherte Änderungen verwerfen?')) return;
    container.dispatchEvent(new CustomEvent('jarvis:back', { bubbles: true }));
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  resizeCanvas();

  // ── Cleanup ───────────────────────────────────────────────────────────────
  return {
    destroy() {
      ro.disconnect();
      document.removeEventListener('keydown', onKey);
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', onPointerUp);
    }
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function escHtml(s) {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function btnStyle(variant) {
  const base = 'border:none;cursor:pointer;border-radius:var(--r-sm);padding:4px 10px;font-size:var(--text-sm);font-family:inherit;';
  if (variant === 'primary') return base + 'background:var(--accent);color:var(--on-accent);';
  if (variant === 'danger') return base + 'background:var(--danger);color:var(--on-danger);';
  return base + 'background:var(--surface);color:var(--text);border:1px solid var(--border);';
}

function toolBtn(id, title, iconSvg) {
  return `<button class="draw-tool-btn" data-tool="${id}" title="${title}" style="width:36px;height:36px;background:none;border:none;cursor:pointer;color:var(--text);display:flex;align-items:center;justify-content:center;border-radius:var(--r-sm)" aria-label="${title}">${iconSvg}</button>`;
}
