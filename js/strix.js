/* ===== STRIX — Jarvis Office Security Layer ===== */

const Strix = (() => {

  const ALLOWED_TAGS = new Set([
    'p','br','b','i','u','em','strong','a','ul','ol','li',
    'h1','h2','h3','h4','h5','h6','blockquote','span','div',
    'table','tr','td','th','thead','tbody','tfoot','pre','code',
    'hr','sub','sup','mark','s','small'
  ]);

  const ALLOWED_ATTRS = new Set(['class','style','href','title','align','colspan','rowspan']);

  const DANGEROUS_PROTO = /^(javascript|data|vbscript|blob):/i;

  function _stripNode(node) {
    const children = [...node.childNodes];
    for (const child of children) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const tag = child.tagName.toLowerCase();
      if (!ALLOWED_TAGS.has(tag)) {
        child.replaceWith(document.createTextNode(child.textContent));
        continue;
      }
      for (const attr of [...child.attributes]) {
        if (!ALLOWED_ATTRS.has(attr.name.toLowerCase())) {
          child.removeAttribute(attr.name);
        } else if (attr.name === 'href' && DANGEROUS_PROTO.test(attr.value.trim())) {
          child.removeAttribute(attr.name);
        } else if (attr.name === 'style') {
          // Strip expression() and url() with dangerous schemes
          const clean = attr.value.replace(/expression\s*\(/gi, '').replace(/url\s*\(\s*["']?(javascript|data|vbscript)/gi, '');
          child.setAttribute('style', clean);
        }
      }
      _stripNode(child);
    }
  }

  function sanitizeHTML(html) {
    if (!html) return '';
    const doc = new DOMParser().parseFromString(html, 'text/html');
    _stripNode(doc.body);
    return doc.body.innerHTML;
  }

  function freezeProtos() {
    try { Object.freeze(Object.prototype); } catch(_) {}
    try { Object.freeze(Array.prototype); } catch(_) {}
    try { Object.freeze(Function.prototype); } catch(_) {}
  }

  function checkStorage() {
    let dirty = false;
    const SCRIPT_RE = /<script[\s>]/i;
    for (const k of Object.keys(localStorage)) {
      if (!k.startsWith('jo2_')) continue;
      try {
        const raw = localStorage.getItem(k);
        if (raw && SCRIPT_RE.test(raw)) {
          console.warn(`[Strix] Verdächtiger Inhalt entfernt: ${k}`);
          localStorage.removeItem(k);
          dirty = true;
        }
      } catch(_) {}
    }
    return !dirty;
  }

  function injectCSP() {
    if (document.querySelector('meta[http-equiv="Content-Security-Policy"]')) return;
    const meta = document.createElement('meta');
    meta.httpEquiv = 'Content-Security-Policy';
    // unsafe-inline nötig für bestehende Event-Handler im Inline-JS
    meta.content = [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      "connect-src 'self'",
      "object-src 'none'",
      "base-uri 'self'"
    ].join('; ');
    document.head.prepend(meta);
  }

  let _snapshot = null;

  function startWatcher() {
    _snapshot = new Set(Object.keys(window));
    setInterval(() => {
      for (const k of Object.keys(window)) {
        if (!_snapshot.has(k)) {
          console.warn(`[Strix] Neues Global erkannt: window.${k}`);
          _snapshot.add(k);
        }
      }
    }, 15000);
  }

  function init() {
    freezeProtos();
    injectCSP();
    const ok = checkStorage();
    startWatcher();
    console.info(`[Strix] Sicherheitsschicht aktiv. Speicher: ${ok ? 'OK' : 'bereinigt'}`);
  }

  return { init, sanitizeHTML, checkStorage };
})();
