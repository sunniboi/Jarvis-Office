// ===== JARVIS OFFICE UTILS =====

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

function showModal(html, onOk, onCancel) {
  const overlay = el('div', { class: 'modal-overlay' });
  const modal = el('div', { class: 'modal fade-in' });
  modal.innerHTML = html;
  overlay.append(modal);
  document.body.append(overlay);

  modal.querySelector('.btn-ok')?.addEventListener('click', () => { overlay.remove(); onOk && onOk(modal); });
  modal.querySelector('.btn-cancel')?.addEventListener('click', () => { overlay.remove(); onCancel && onCancel(); });
  overlay.addEventListener('click', e => { if (e.target === overlay) { overlay.remove(); onCancel && onCancel(); } });
  return modal;
}

function showNotify(msg, type = 'info') {
  const colors = { info: '#7c3aed', success: '#22c55e', error: '#ef4444', warn: '#f59e0b' };
  const n = el('div');
  n.style.cssText = `position:fixed;bottom:20px;right:20px;background:${colors[type]};color:#fff;padding:10px 16px;border-radius:8px;font-size:13px;z-index:9999;box-shadow:0 4px 16px rgba(0,0,0,0.4);animation:fadeIn 0.2s ease;max-width:320px;`;
  n.textContent = msg;
  document.body.append(n);
  setTimeout(() => n.remove(), 3000);
}

// Column letter helpers
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
