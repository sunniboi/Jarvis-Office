/* ===== JARVIS OFFICE v2 — UTILS ===== */

function $(sel, ctx = document) { return ctx.querySelector(sel); }
function $$(sel, ctx = document) { return [...ctx.querySelectorAll(sel)]; }

function el(tag, attrs = {}, ...children) {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') e.className = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else e.setAttribute(k, v);
  }
  for (const c of children) {
    if (c == null) continue;
    e.append(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return e;
}

function formatDate(d = new Date()) {
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(d = new Date()) {
  return d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}
function formatDateTime(d = new Date()) {
  return `${formatDate(d)} ${formatTime(d)}`;
}

function debounce(fn, ms = 300) {
  let t; return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
}

function sanitize(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function downloadFile(content, filename, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
}

// Modal — returns a Promise resolved with the modal el on OK, rejected on cancel
// No setTimeout race: event listeners are added before overlay is inserted.
function showModal(html, onOk, onCancel) {
  const overlay = el('div', { class: 'modal-overlay', role: 'dialog', 'aria-modal': 'true' });
  const modal = el('div', { class: 'modal' });
  modal.innerHTML = html;

  const btnOk     = modal.querySelector('.btn-ok');
  const btnCancel = modal.querySelector('.btn-cancel');

  function close() { overlay.remove(); document.removeEventListener('keydown', esc); }

  if (btnOk) {
    btnOk.addEventListener('click', () => {
      close();
      onOk && onOk(modal);
    });
  }
  if (btnCancel) {
    btnCancel.addEventListener('click', () => {
      close();
      onCancel && onCancel();
    });
  }
  overlay.addEventListener('click', e => {
    if (e.target === overlay) { close(); onCancel && onCancel(); }
  });
  function esc(e) {
    if (e.key === 'Escape') { close(); onCancel && onCancel(); }
  }
  document.addEventListener('keydown', esc);

  overlay.append(modal);
  document.body.append(overlay);

  // Focus first interactive element
  const firstFocusable = modal.querySelector('input, textarea, select, button');
  firstFocusable?.focus();

  return modal;
}

function showNotify(msg, type = 'info') {
  const colors = { info: 'var(--accent)', success: 'var(--app-calc)', error: 'var(--danger)', warn: 'var(--warning)' };
  const n = el('div');
  n.setAttribute('role', 'status');
  n.setAttribute('aria-live', 'polite');
  n.style.cssText = `position:fixed;bottom:20px;right:20px;background:${colors[type]||colors.info};color:#fff;padding:9px 15px;border-radius:8px;font-size:12px;z-index:9999;box-shadow:0 4px 20px rgba(0,0,0,.45);animation:slideUp 0.18s ease;max-width:300px;font-family:var(--font-sans);`;
  n.textContent = msg;
  document.body.append(n);
  setTimeout(() => n.remove(), 3000);
}

// Spreadsheet address helpers
function colToLetter(n) {
  let s = '';
  while (n >= 0) { s = String.fromCharCode(65 + (n % 26)) + s; n = Math.floor(n / 26) - 1; }
  return s;
}
function letterToCol(s) {
  let n = -1;
  for (const c of s.toUpperCase()) { n = (n + 1) * 26 + (c.charCodeAt(0) - 65); }
  return n;
}
function cellRef(row, col) { return `${colToLetter(col)}${row + 1}`; }

// SVG icon helper (inline Lucide-compatible paths)
const ICONS = {
  arrowLeft:   '<path stroke-linecap="round" stroke-linejoin="round" d="M19 12H5M12 5l-7 7 7 7"/>',
  save:        '<path stroke-linecap="round" stroke-linejoin="round" d="M17 21H7a2 2 0 01-2-2V7l4-4h8a2 2 0 012 2v12a2 2 0 01-2 2z"/><rect x="9" y="13" width="6" height="8" rx="1"/>',
  filePlus:    '<path stroke-linecap="round" stroke-linejoin="round" d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><path d="M14 2v6h6M12 11v6M9 14h6"/>',
  folderOpen:  '<path stroke-linecap="round" stroke-linejoin="round" d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/>',
  download:    '<path stroke-linecap="round" stroke-linejoin="round" d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  printer:     '<path stroke-linecap="round" stroke-linejoin="round" d="M6 9V2h12v7M6 18H4a2 2 0 01-2-2v-5a2 2 0 012-2h16a2 2 0 012 2v5a2 2 0 01-2 2h-2M6 14h12v8H6z"/>',
  search:      '<circle cx="11" cy="11" r="8"/><path stroke-linecap="round" d="M21 21l-4.35-4.35"/>',
  table:       '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  bold:        '<path stroke-linecap="round" stroke-linejoin="round" d="M6 12h8a4 4 0 000-8H6v8zM6 12h9a4 4 0 010 8H6v-8z"/>',
  italic:      '<path stroke-linecap="round" stroke-linejoin="round" d="M19 4h-9M14 20H5M15 4L9 20"/>',
  underline:   '<path stroke-linecap="round" stroke-linejoin="round" d="M6 3v7a6 6 0 0012 0V3M4 21h16"/>',
  alignLeft:   '<line x1="21" y1="6" x2="3" y2="6"/><line x1="15" y1="12" x2="3" y2="12"/><line x1="17" y1="18" x2="3" y2="18"/>',
  alignCenter: '<line x1="18" y1="6" x2="6" y2="6"/><line x1="21" y1="12" x2="3" y2="12"/><line x1="18" y1="18" x2="6" y2="18"/>',
  alignRight:  '<line x1="21" y1="6" x2="3" y2="6"/><line x1="21" y1="12" x2="9" y2="12"/><line x1="21" y1="18" x2="7" y2="18"/>',
  undo:        '<path stroke-linecap="round" stroke-linejoin="round" d="M3 7v6h6"/><path stroke-linecap="round" stroke-linejoin="round" d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>',
  redo:        '<path stroke-linecap="round" stroke-linejoin="round" d="M21 7v6h-6"/><path stroke-linecap="round" stroke-linejoin="round" d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/>',
  barChart:    '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>',
  plus:        '<path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14M5 12h14"/>',
  trash:       '<polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6M9 6V4h6v2"/>',
  star:        '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  mail:        '<rect x="2" y="4" width="20" height="16" rx="2"/><path d="M22 6l-10 7L2 6"/>',
  reply:       '<polyline points="9 17 4 12 9 7"/><path d="M20 18v-2a4 4 0 00-4-4H4"/>',
  forward:     '<polyline points="15 17 20 12 15 7"/><path d="M4 18v-2a4 4 0 014-4h12"/>',
  pin:         '<path stroke-linecap="round" stroke-linejoin="round" d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  chevronLeft: '<polyline points="15 18 9 12 15 6"/>',
  chevronRight:'<polyline points="9 18 15 12 9 6"/>',
  x:           '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  check:       '<polyline points="20 6 9 17 4 12"/>',
  settings:    '<circle cx="12" cy="12" r="3"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  palette:     '<circle cx="12" cy="12" r="10"/><circle cx="8" cy="10" r="1.5" fill="currentColor"/><circle cx="12" cy="7" r="1.5" fill="currentColor"/><circle cx="16" cy="10" r="1.5" fill="currentColor"/><path d="M9.5 17a2.5 2.5 0 005 0"/>',
  eye:         '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  link:        '<path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71"/>',
  calendarIcon:'<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
};

function icon(name, size = 16, extra = '') {
  const paths = ICONS[name] || '';
  return `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" ${extra}>${paths}</svg>`;
}
