// ===== JARVIS GLOBAL SEARCH (Finde-Skills) =====

const JarvisSearch = {
  // App-Metadaten für Labels
  apps: {
    write:    { label: 'Write',    icon: '✍',  color: 'var(--write)',    docKey: 'write_docs',  titleField: 'title', contentField: 'content' },
    calc:     { label: 'Calc',     icon: '📊',  color: 'var(--calc)',     docKey: 'calc_docs',   titleField: 'title', contentField: null },
    matrix:   { label: 'Matrix',   icon: '📈',  color: 'var(--matrix)',   docKey: 'matrix_docs', titleField: 'title', contentField: null },
    present:  { label: 'Present',  icon: '🖥',  color: 'var(--present)', docKey: 'present_docs',titleField: 'title', contentField: null },
    notes:    { label: 'Notes',    icon: '📋',  color: 'var(--notes)',    docKey: null,           titleField: 'title', contentField: 'content' },
  },

  // Alle gespeicherten Docs und Notes sammeln
  collect() {
    const results = [];

    for (const [app, meta] of Object.entries(this.apps)) {
      if (meta.docKey) {
        const docs = JarvisDB.get(meta.docKey, {});
        for (const doc of Object.values(docs)) {
          results.push({ app, meta, title: doc[meta.titleField] || 'Unbenannt', content: doc[meta.contentField] || '', id: doc.id, modified: doc.modified || 0 });
        }
      }
      // Notes nutzt eigene Liste
      if (app === 'notes') {
        const notes = JarvisDB.get('notes_list', []);
        for (const n of notes) {
          results.push({ app, meta, title: n.title || 'Notiz', content: n.content || '', id: n.id, modified: n.date || 0 });
        }
      }
    }

    return results;
  },

  // Suche mit Highlighting
  query(term) {
    const t = term.trim().toLowerCase();
    if (!t) return [];
    return this.collect().filter(r =>
      r.title.toLowerCase().includes(t) || r.content.toLowerCase().includes(t)
    );
  },

  highlight(text, term) {
    if (!term || !text) return sanitize(text || '');
    const safe = sanitize(text);
    const re = new RegExp(`(${term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    return safe.replace(re, '<mark>$1</mark>');
  },

  excerpt(content, term, len = 80) {
    if (!content) return '';
    const idx = content.toLowerCase().indexOf(term.toLowerCase());
    const start = Math.max(0, idx - 20);
    const slice = content.slice(start, start + len);
    return (start > 0 ? '…' : '') + slice + (start + len < content.length ? '…' : '');
  },
};

// ===== SEARCH UI =====

let _searchOverlay = null;

function openSearch() {
  if (_searchOverlay) return;

  const overlay = el('div', { class: 'search-overlay', onclick: (e) => { if (e.target === overlay) closeSearch(); } });
  const box = el('div', { class: 'search-box fade-in' });

  const header = el('div', { class: 'search-header' });
  const input = el('input', { type: 'text', class: 'search-input', placeholder: 'Suche in allen Apps… (Esc schließt)', autofocus: 'true' });
  const closeBtn = el('button', { class: 'search-close-btn', onclick: closeSearch }, '✕');
  header.append(input, closeBtn);

  const results = el('div', { class: 'search-results' });
  const hint = el('div', { class: 'search-hint' }, 'Tippe um zu suchen – Write, Calc, Notes, Present, Matrix');

  box.append(header, results);
  overlay.append(box);
  document.body.append(overlay);
  _searchOverlay = overlay;
  input.focus();

  results.append(hint);

  input.addEventListener('input', debounce(() => {
    const term = input.value.trim();
    results.innerHTML = '';

    if (!term) { results.append(hint); return; }

    const hits = JarvisSearch.query(term);
    if (!hits.length) {
      results.append(el('div', { class: 'search-empty' }, `Nichts gefunden für „${sanitize(term)}"`));
      return;
    }

    for (const hit of hits.slice(0, 30)) {
      const row = el('div', { class: 'search-result-row', onclick: () => { closeSearch(); launchApp(hit.app); } });

      const badge = el('span', { class: 'search-badge', style: `background:${hit.meta.color}22;color:${hit.meta.color};border:1px solid ${hit.meta.color}44` });
      badge.textContent = `${hit.meta.icon} ${hit.meta.label}`;

      const info = el('div', { class: 'search-result-info' });
      const title = el('div', { class: 'search-result-title' });
      title.innerHTML = JarvisSearch.highlight(hit.title, term);

      info.append(title);

      if (hit.content) {
        const excerpt = el('div', { class: 'search-result-excerpt' });
        excerpt.innerHTML = JarvisSearch.highlight(JarvisSearch.excerpt(hit.content, term), term);
        info.append(excerpt);
      }

      const date = el('div', { class: 'search-result-date' }, hit.modified ? formatDate(new Date(hit.modified)) : '');

      row.append(badge, info, date);
      results.append(row);
    }

    if (hits.length > 30) {
      results.append(el('div', { class: 'search-hint' }, `… und ${hits.length - 30} weitere Treffer`));
    }
  }, 200));

  input.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
  });
}

function closeSearch() {
  if (_searchOverlay) { _searchOverlay.remove(); _searchOverlay = null; }
}

// Ctrl+K / Strg+K öffnet die Suche global
document.addEventListener('keydown', e => {
  if (e.ctrlKey && e.key === 'k') {
    e.preventDefault();
    if (_searchOverlay) closeSearch();
    else openSearch();
  }
});
