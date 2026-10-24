// ===== JARVIS MEM =====

function initMem(container) {
  const CATS = {
    fakt:    { label: 'Fakt',    color: '#6366f1', icon: '🧠' },
    aufgabe: { label: 'Aufgabe', color: '#f59e0b', icon: '✅' },
    kontakt: { label: 'Kontakt', color: '#06b6d4', icon: '👤' },
    idee:    { label: 'Idee',    color: '#a855f7', icon: '💡' },
    warnung: { label: 'Warnung', color: '#ef4444', icon: '⚠️' },
    notiz:   { label: 'Notiz',   color: '#94a3b8', icon: '📝' },
  };

  let mems = JarvisDB.get('mem_list', []);
  let filterCat = 'all';
  let filterTag = '';
  let searchQ = '';
  let activeId = null;

  if (!mems.length) {
    mems = [
      { id: 'm1', cat: 'fakt', title: 'Willkommen bei Jarvis Mem', body: 'Jarvis Mem ist dein persönliches Wissensspeicher.\n\nSpeichere Fakten, Aufgaben, Kontakte, Ideen und mehr.\nJeder Eintrag bekommt eine Kategorie und optionale Tags.\n\nStrg+N = Neuer Eintrag\nStrg+F = Suchen', tags: ['jarvis'], star: true, created: Date.now() },
      { id: 'm2', cat: 'idee', title: 'Erste Idee', body: 'Hier könnte deine erste Idee stehen.', tags: ['test'], star: false, created: Date.now() - 3600000 },
    ];
    saveMems();
  }

  container.innerHTML = `
    <div class="app-titlebar">
      <button class="back-btn" onclick="goHome()">←</button>
      <span class="app-title" style="color:var(--mem)">🧠 Jarvis Mem</span>
      <div class="titlebar-actions">
        <input class="tb-search" id="mem-search" placeholder="🔍 Suchen..." oninput="memSearch(this.value)" style="width:180px" />
        <button class="tb-btn" onclick="memNew()">+ Neu (Strg+N)</button>
        <button class="tb-btn" onclick="memExportAll()">⬇ Export</button>
        <button class="tb-btn" onclick="memImport()">⬆ Import</button>
      </div>
    </div>
    <div class="mem-layout">
      <aside class="mem-sidebar">
        <div class="mem-sidebar-section">
          <div class="mem-sidebar-label">Filter</div>
          <button class="mem-filter-btn${filterCat==='all'?' active':''}" onclick="memFilterCat('all')" id="mfb-all">
            Alle <span class="mem-count" id="mfc-all"></span>
          </button>
          <button class="mem-filter-btn${filterCat==='star'?' active':''}" onclick="memFilterCat('star')" id="mfb-star">
            ⭐ Markiert <span class="mem-count" id="mfc-star"></span>
          </button>
          ${Object.entries(CATS).map(([k,v]) => `
            <button class="mem-filter-btn" onclick="memFilterCat('${k}')" id="mfb-${k}" style="--cat-c:${v.color}">
              ${v.icon} ${v.label} <span class="mem-count" id="mfc-${k}"></span>
            </button>
          `).join('')}
        </div>
        <div class="mem-sidebar-section" id="mem-tags-section">
          <div class="mem-sidebar-label">Tags</div>
          <div id="mem-tags-list"></div>
        </div>
        <div class="mem-sidebar-section">
          <div class="mem-sidebar-label">Statistik</div>
          <div id="mem-stats" class="mem-stats"></div>
        </div>
      </aside>
      <main class="mem-main">
        <div class="mem-cards" id="mem-cards"></div>
      </main>
      <div class="mem-detail" id="mem-detail">
        <div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:13px;">Eintrag auswählen oder neu erstellen.</div>
      </div>
    </div>
    <div class="statusbar">
      <span id="mem-status"></span>
      <span style="margin-left:auto;font-size:11px;color:var(--text3)" id="mem-saved"></span>
    </div>
  `;

  function getAllTags() {
    const set = new Set();
    mems.forEach(m => (m.tags||[]).forEach(t => set.add(t)));
    return [...set].sort();
  }

  function getFiltered() {
    let list = [...mems];
    if (filterCat === 'star') list = list.filter(m => m.star);
    else if (filterCat !== 'all') list = list.filter(m => m.cat === filterCat);
    if (filterTag) list = list.filter(m => (m.tags||[]).includes(filterTag));
    if (searchQ) {
      const q = searchQ.toLowerCase();
      list = list.filter(m =>
        m.title.toLowerCase().includes(q) ||
        (m.body||'').toLowerCase().includes(q) ||
        (m.tags||[]).some(t => t.toLowerCase().includes(q))
      );
    }
    return list.sort((a,b) => (b.star?1:0)-(a.star?1:0) || b.created - a.created);
  }

  function updateCounts() {
    const setCnt = (id, n) => { const el = document.getElementById(id); if (el) el.textContent = n || ''; };
    setCnt('mfc-all', mems.length);
    setCnt('mfc-star', mems.filter(m=>m.star).length);
    Object.keys(CATS).forEach(k => setCnt('mfc-'+k, mems.filter(m=>m.cat===k).length));
    document.getElementById('mem-status').textContent = `${getFiltered().length} / ${mems.length} Einträge`;

    const stats = document.getElementById('mem-stats');
    if (stats) {
      stats.innerHTML = Object.entries(CATS).map(([k,v]) => {
        const n = mems.filter(m=>m.cat===k).length;
        return n ? `<div class="mem-stat-row"><span style="color:${v.color}">${v.icon} ${v.label}</span><b>${n}</b></div>` : '';
      }).join('');
    }
  }

  function renderTags() {
    const tagsList = document.getElementById('mem-tags-list');
    if (!tagsList) return;
    const tags = getAllTags();
    tagsList.innerHTML = tags.length
      ? tags.map(t => `<button class="mem-tag-btn${filterTag===t?' active':''}" onclick="memFilterTag('${sanitize(t)}')">#${sanitize(t)}</button>`).join('')
      : '<span style="font-size:11px;color:var(--text3)">Keine Tags</span>';
  }

  function renderCards() {
    const list = getFiltered();
    const el = document.getElementById('mem-cards');
    if (!el) return;
    el.innerHTML = list.length ? list.map(m => {
      const cat = CATS[m.cat] || CATS.notiz;
      const preview = (m.body||'').split('\n')[0].substring(0, 80);
      return `
        <div class="mem-card${m.id===activeId?' active':''}" onclick="memOpen('${m.id}')" data-id="${m.id}"
             style="--card-c:${cat.color}">
          <div class="mem-card-header">
            <span class="mem-card-cat">${cat.icon} ${cat.label}</span>
            <button class="mem-star-btn${m.star?' on':''}" onclick="memToggleStar(event,'${m.id}')" title="Markieren">⭐</button>
          </div>
          <div class="mem-card-title">${sanitize(m.title)}</div>
          ${preview ? `<div class="mem-card-preview">${sanitize(preview)}</div>` : ''}
          ${(m.tags||[]).length ? `<div class="mem-card-tags">${m.tags.map(t=>`<span class="mem-tag">#${sanitize(t)}</span>`).join('')}</div>` : ''}
          <div class="mem-card-date">${new Date(m.created).toLocaleDateString('de-DE')} ${new Date(m.created).toLocaleTimeString('de-DE',{hour:'2-digit',minute:'2-digit'})}</div>
        </div>
      `;
    }).join('') : `<div class="mem-empty">Keine Einträge gefunden.<br><button class="btn btn-primary" style="margin-top:12px" onclick="memNew()">+ Neuer Eintrag</button></div>`;
    updateCounts();
    renderTags();
  }

  function renderDetail(id) {
    const el = document.getElementById('mem-detail');
    if (!el) return;
    const m = mems.find(m => m.id === id);
    if (!m) {
      el.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;height:100%;color:var(--text3);font-size:13px;">Eintrag auswählen.</div>';
      return;
    }
    const cat = CATS[m.cat] || CATS.notiz;
    el.innerHTML = `
      <div class="mem-detail-header">
        <select class="mem-cat-select" id="det-cat" onchange="memUpdateCat(this.value)">
          ${Object.entries(CATS).map(([k,v]) => `<option value="${k}"${m.cat===k?' selected':''}>${v.icon} ${v.label}</option>`).join('')}
        </select>
        <button class="mem-star-btn${m.star?' on':''}" onclick="memToggleStar(event,'${id}')" title="Markieren" id="det-star">⭐</button>
        <button onclick="memDelete('${id}')" class="btn btn-ghost" style="font-size:12px;color:var(--danger);margin-left:auto">🗑 Löschen</button>
      </div>
      <input class="mem-title-input" id="det-title" value="${sanitize(m.title)}" placeholder="Titel..." />
      <div class="mem-tags-editor">
        <span style="font-size:11px;color:var(--text3)">Tags (kommasepariert):</span>
        <input class="mem-tags-input" id="det-tags" value="${(m.tags||[]).join(', ')}" placeholder="tag1, tag2, ..." />
      </div>
      <textarea class="mem-body-textarea" id="det-body" placeholder="Inhalt hier eingeben...">${sanitize(m.body||'')}</textarea>
      <div class="mem-detail-footer">
        <span style="font-size:11px;color:var(--text3)">Erstellt: ${new Date(m.created).toLocaleString('de-DE')}</span>
        <span id="det-charcount" style="font-size:11px;color:var(--text3)"></span>
      </div>
    `;

    const titleEl = document.getElementById('det-title');
    const bodyEl = document.getElementById('det-body');
    const tagsEl = document.getElementById('det-tags');
    const charEl = document.getElementById('det-charcount');

    const updateCharCount = () => {
      if (charEl && bodyEl) charEl.textContent = `${bodyEl.value.length} Zeichen`;
    };
    updateCharCount();

    const save = debounce(() => {
      m.title = titleEl.value || 'Ohne Titel';
      m.body = bodyEl.value;
      m.tags = tagsEl.value.split(',').map(t=>t.trim()).filter(Boolean);
      m.modified = Date.now();
      saveMems();
      renderCards();
      document.getElementById('mem-saved').textContent = '✓ ' + formatTime();
    }, 400);

    titleEl.addEventListener('input', save);
    bodyEl.addEventListener('input', () => { updateCharCount(); save(); });
    tagsEl.addEventListener('input', save);

    bodyEl.focus();
  }

  window.memOpen = (id) => {
    activeId = id;
    renderCards();
    renderDetail(id);
  };

  window.memNew = () => {
    const m = { id: 'm'+Date.now(), cat: filterCat==='all'||filterCat==='star' ? 'notiz' : filterCat, title: 'Neuer Eintrag', body: '', tags: filterTag ? [filterTag] : [], star: false, created: Date.now() };
    mems.unshift(m);
    saveMems();
    memOpen(m.id);
  };

  window.memDelete = (id) => {
    if (!confirm('Eintrag löschen?')) return;
    mems = mems.filter(m => m.id !== id);
    if (activeId === id) { activeId = null; renderDetail(null); }
    saveMems();
    renderCards();
    showNotify('Gelöscht.', 'success');
  };

  window.memToggleStar = (e, id) => {
    e.stopPropagation();
    const m = mems.find(m => m.id === id);
    if (!m) return;
    m.star = !m.star;
    saveMems();
    renderCards();
    if (activeId === id) {
      const btn = document.getElementById('det-star');
      if (btn) btn.classList.toggle('on', m.star);
    }
  };

  window.memUpdateCat = (cat) => {
    const m = mems.find(m => m.id === activeId);
    if (!m) return;
    m.cat = cat;
    saveMems();
    renderCards();
  };

  window.memFilterCat = (cat) => {
    filterCat = cat;
    document.querySelectorAll('.mem-filter-btn').forEach(b => b.classList.remove('active'));
    const btn = document.getElementById('mfb-' + cat);
    if (btn) btn.classList.add('active');
    renderCards();
  };

  window.memFilterTag = (tag) => {
    filterTag = filterTag === tag ? '' : tag;
    renderTags();
    renderCards();
  };

  window.memSearch = (q) => { searchQ = q; renderCards(); };

  window.memExportAll = () => {
    const text = mems.map(m => {
      const cat = CATS[m.cat]||CATS.notiz;
      return `[${cat.label}] ${m.title}\nTags: ${(m.tags||[]).join(', ')}\nErstellt: ${new Date(m.created).toLocaleString('de-DE')}\n\n${m.body||''}`;
    }).join('\n\n' + '─'.repeat(60) + '\n\n');
    downloadFile(text, 'jarvis-mem-export.txt');
  };

  window.memImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = JSON.parse(ev.target.result);
          if (!Array.isArray(data)) throw new Error('Kein Array');
          let added = 0;
          data.forEach(m => {
            if (m.id && m.title) {
              if (!mems.find(x => x.id === m.id)) { mems.push(m); added++; }
            }
          });
          saveMems();
          renderCards();
          showNotify(`${added} Einträge importiert.`, 'success');
        } catch { showNotify('Import fehlgeschlagen — ungültiges Format.', 'error'); }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  document.addEventListener('keydown', function memKeys(e) {
    if (!document.getElementById('mem-cards')) { document.removeEventListener('keydown', memKeys); return; }
    if (e.ctrlKey && e.key === 'n') { e.preventDefault(); memNew(); }
    if (e.ctrlKey && e.key === 'f') { e.preventDefault(); document.getElementById('mem-search')?.focus(); }
  });

  function saveMems() { JarvisDB.set('mem_list', mems); }

  renderCards();
  if (mems[0]) memOpen(mems[0].id);
}
