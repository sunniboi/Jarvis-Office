/* ===== JARVIS OFFICE v2 — ANYDOC ===== */

function initAnyDoc(container) {
  let currentFile = null;
  let currentObjectURL = null;
  let zoomLevel = 1.0;
  let recent = JarvisDB.get('anydoc_recent', []);

  // ── Supported types ───────────────────────────────────────────────────────
  const TYPE = {
    pdf:      { exts: ['pdf'],                         label: 'PDF'        },
    image:    { exts: ['png','jpg','jpeg','gif','svg','webp','bmp','ico'], label: 'Bild' },
    text:     { exts: ['txt','md','markdown','log','csv','tsv','ini','env','sh','bat'], label: 'Text' },
    code:     { exts: ['js','ts','html','htm','css','json','xml','yaml','yml','toml','py','java','c','cpp','h','rs','go','rb','php','sql'], label: 'Code' },
    html:     { exts: ['html','htm'],                  label: 'HTML'       },
  };

  function detectType(name) {
    const ext = (name.split('.').pop() || '').toLowerCase();
    if (TYPE.pdf.exts.includes(ext))   return 'pdf';
    if (TYPE.image.exts.includes(ext)) return 'image';
    if (TYPE.html.exts.includes(ext))  return 'html';
    if (TYPE.code.exts.includes(ext))  return 'code';
    if (TYPE.text.exts.includes(ext))  return 'text';
    return 'text'; // fallback
  }

  // ── DOM ───────────────────────────────────────────────────────────────────
  container.innerHTML = `
    <div class="app-chrome anydoc-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title" id="anydoc-title">Jarvis AnyDoc</span>
        <div class="titlebar-actions">
          <button class="btn btn-ghost btn-sm" id="anydoc-open">${icon('folderOpen', 15)} Öffnen</button>
          <button class="btn btn-ghost btn-sm hidden" id="anydoc-print">${icon('printer', 15)} Drucken</button>
          <button class="btn btn-ghost btn-sm hidden" id="anydoc-zoom-out">−</button>
          <span class="anydoc-zoom-label hidden" id="anydoc-zoom-label">100%</span>
          <button class="btn btn-ghost btn-sm hidden" id="anydoc-zoom-in">+</button>
          <button class="btn btn-ghost btn-sm hidden" id="anydoc-zoom-reset">1:1</button>
        </div>
      </div>

      <div class="anydoc-body" id="anydoc-body">
        <div class="anydoc-drop-zone" id="anydoc-drop">
          <div class="anydoc-drop-inner">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="var(--app-anydoc)" stroke-width="1.5" aria-hidden="true">
              <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
              <path d="M14 2v6h6M12 11v6M9 14l3-3 3 3"/>
            </svg>
            <p class="anydoc-drop-hint">Datei hierher ziehen</p>
            <p class="anydoc-drop-sub">oder</p>
            <button class="btn btn-primary" id="anydoc-open-big">${icon('folderOpen', 15)} Datei öffnen</button>
            <p class="anydoc-drop-formats">PDF · Bilder · Text · Code · HTML · CSV · JSON · Markdown</p>

            <div class="anydoc-recent" id="anydoc-recent"></div>
          </div>
        </div>

        <div class="anydoc-viewer hidden" id="anydoc-viewer">
          <div class="anydoc-viewer-inner" id="anydoc-viewer-inner"></div>
        </div>
      </div>

      <div class="statusbar">
        <span id="anydoc-status">Keine Datei geöffnet</span>
        <span id="anydoc-filesize"></span>
      </div>
    </div>

    <input type="file" id="anydoc-file-input" style="display:none"
      accept=".pdf,.png,.jpg,.jpeg,.gif,.svg,.webp,.bmp,.ico,.txt,.md,.markdown,.log,.csv,.tsv,.json,.xml,.yaml,.yml,.toml,.html,.htm,.js,.ts,.css,.sh,.bat,.py,.java,.c,.cpp,.h,.rs,.go,.rb,.php,.sql,.ini,.env" />
  `;

  // ── References ────────────────────────────────────────────────────────────
  const titleEl     = container.querySelector('#anydoc-title');
  const openBtn     = container.querySelector('#anydoc-open');
  const openBigBtn  = container.querySelector('#anydoc-open-big');
  const printBtn    = container.querySelector('#anydoc-print');
  const zoomOut     = container.querySelector('#anydoc-zoom-out');
  const zoomIn      = container.querySelector('#anydoc-zoom-in');
  const zoomReset   = container.querySelector('#anydoc-zoom-reset');
  const zoomLabel   = container.querySelector('#anydoc-zoom-label');
  const dropZone    = container.querySelector('#anydoc-drop');
  const viewerEl    = container.querySelector('#anydoc-viewer');
  const viewerInner = container.querySelector('#anydoc-viewer-inner');
  const fileInput   = container.querySelector('#anydoc-file-input');
  const statusEl    = container.querySelector('#anydoc-status');
  const filesizeEl  = container.querySelector('#anydoc-filesize');
  const recentEl    = container.querySelector('#anydoc-recent');

  // ── Recent files ──────────────────────────────────────────────────────────
  function renderRecent() {
    if (!recent.length) { recentEl.innerHTML = ''; return; }
    recentEl.innerHTML = `<p class="anydoc-recent-label">Zuletzt geöffnet</p>` +
      recent.slice(0, 6).map(r => `
        <span class="anydoc-recent-item" data-name="${escHtml(r.name)}" title="${escHtml(r.name)}">
          ${icon('eye', 13)} ${escHtml(r.name)}
        </span>`).join('');
    recentEl.querySelectorAll('.anydoc-recent-item').forEach(el => {
      el.addEventListener('click', () => showToast('Datei aus Verlauf neu laden: Datei bitte erneut öffnen (Browser-Sicherheit)', 'info'));
    });
  }

  function addRecent(name, size) {
    recent = [{ name, size }, ...recent.filter(r => r.name !== name)].slice(0, 10);
    JarvisDB.set('anydoc_recent', recent);
  }

  function escHtml(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  function formatSize(bytes) {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / 1048576).toFixed(1) + ' MB';
  }

  // ── Zoom ──────────────────────────────────────────────────────────────────
  function setZoom(z) {
    zoomLevel = Math.min(5, Math.max(0.1, z));
    zoomLabel.textContent = Math.round(zoomLevel * 100) + '%';
    const target = viewerInner.querySelector('.anydoc-zoomable');
    if (target) target.style.transform = `scale(${zoomLevel})`;
  }

  function showZoomControls(show) {
    [zoomOut, zoomIn, zoomReset, zoomLabel].forEach(el => el.classList.toggle('hidden', !show));
  }

  // ── Render ────────────────────────────────────────────────────────────────
  function revokeOldURL() {
    if (currentObjectURL) { URL.revokeObjectURL(currentObjectURL); currentObjectURL = null; }
  }

  function renderFile(file) {
    revokeOldURL();
    currentFile = file;
    const type = detectType(file.name);
    titleEl.textContent = file.name;
    dropZone.classList.add('hidden');
    viewerEl.classList.remove('hidden');
    viewerInner.innerHTML = '';
    printBtn.classList.remove('hidden');
    showZoomControls(type === 'image' || type === 'pdf');
    zoomLevel = 1.0;
    if (zoomLabel) zoomLabel.textContent = '100%';

    statusEl.textContent = file.name + ' · ' + (TYPE[type]?.label || 'Dokument');
    filesizeEl.textContent = formatSize(file.size);
    addRecent(file.name, file.size);
    renderRecent();

    if (type === 'pdf') {
      currentObjectURL = URL.createObjectURL(file);
      viewerInner.innerHTML = `
        <div class="anydoc-zoomable" style="width:100%;height:100%;transform-origin:top center;transition:transform .15s">
          <embed src="${currentObjectURL}" type="application/pdf" style="width:100%;height:100%;border:none;" />
        </div>`;
    } else if (type === 'image') {
      currentObjectURL = URL.createObjectURL(file);
      viewerInner.innerHTML = `
        <div class="anydoc-img-wrap">
          <img src="${currentObjectURL}" alt="${escHtml(file.name)}" class="anydoc-zoomable anydoc-img"
               style="transform-origin:center center;transition:transform .15s;max-width:100%;max-height:100%;display:block;margin:auto;" />
        </div>`;
    } else if (type === 'html') {
      const reader = new FileReader();
      reader.onload = e => {
        const blob = new Blob([e.target.result], { type: 'text/html' });
        currentObjectURL = URL.createObjectURL(blob);
        viewerInner.innerHTML = `<iframe src="${currentObjectURL}" sandbox="allow-same-origin allow-scripts" style="width:100%;height:100%;border:none;background:#fff;"></iframe>`;
      };
      reader.readAsText(file);
    } else {
      // text / code / csv / json / markdown
      const reader = new FileReader();
      reader.onload = e => {
        const raw = e.target.result;
        const ext = (file.name.split('.').pop() || '').toLowerCase();
        if (ext === 'csv' || ext === 'tsv') {
          renderCSV(raw, ext === 'tsv' ? '\t' : ',');
        } else if (ext === 'md' || ext === 'markdown') {
          renderMarkdown(raw);
        } else {
          renderCode(raw, ext);
        }
      };
      reader.onerror = () => showToast('Fehler beim Lesen der Datei', 'error');
      reader.readAsText(file, 'UTF-8');
    }
  }

  function renderCode(raw, ext) {
    const lines = raw.split('\n');
    const numbered = lines.map((l, i) =>
      `<tr><td class="anydoc-ln">${i + 1}</td><td class="anydoc-lc">${escHtml(l)}</td></tr>`
    ).join('');
    viewerInner.innerHTML = `
      <div class="anydoc-code-wrap">
        <div class="anydoc-code-lang">${ext.toUpperCase()}</div>
        <table class="anydoc-code-table"><tbody>${numbered}</tbody></table>
      </div>`;
    statusEl.textContent = currentFile.name + ' · ' + lines.length + ' Zeilen';
  }

  function renderCSV(raw, sep) {
    const rows = raw.trim().split('\n').map(r => r.split(sep));
    if (!rows.length) { viewerInner.innerHTML = '<p style="padding:16px">Leere Datei</p>'; return; }
    const head = rows[0];
    const body = rows.slice(1);
    const ths = head.map(h => `<th>${escHtml(h.trim())}</th>`).join('');
    const trs = body.map(r =>
      `<tr>${head.map((_, i) => `<td>${escHtml((r[i] || '').trim())}</td>`).join('')}</tr>`
    ).join('');
    viewerInner.innerHTML = `
      <div class="anydoc-csv-wrap">
        <table class="anydoc-csv-table">
          <thead><tr>${ths}</tr></thead>
          <tbody>${trs}</tbody>
        </table>
      </div>`;
    statusEl.textContent = currentFile.name + ' · ' + body.length + ' Zeilen, ' + head.length + ' Spalten';
  }

  function renderMarkdown(raw) {
    // minimal Markdown → HTML (no external dependency)
    let html = escHtml(raw)
      .replace(/^#{6}\s(.+)$/gm, '<h6>$1</h6>')
      .replace(/^#{5}\s(.+)$/gm, '<h5>$1</h5>')
      .replace(/^#{4}\s(.+)$/gm, '<h4>$1</h4>')
      .replace(/^#{3}\s(.+)$/gm, '<h3>$1</h3>')
      .replace(/^#{2}\s(.+)$/gm, '<h2>$1</h2>')
      .replace(/^#{1}\s(.+)$/gm, '<h1>$1</h1>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`(.+?)`/g, '<code>$1</code>')
      .replace(/^---$/gm, '<hr>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, m => `<ul>${m}</ul>`)
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>');
    viewerInner.innerHTML = `<div class="anydoc-md-wrap"><div class="anydoc-md"><p>${html}</p></div></div>`;
  }

  // ── Events ────────────────────────────────────────────────────────────────
  function openFilePicker() { fileInput.click(); }

  openBtn.addEventListener('click', openFilePicker);
  openBigBtn.addEventListener('click', openFilePicker);

  fileInput.addEventListener('change', () => {
    const f = fileInput.files[0];
    if (f) renderFile(f);
    fileInput.value = '';
  });

  // Drag & drop
  const body = container.querySelector('#anydoc-body');
  body.addEventListener('dragover', e => { e.preventDefault(); body.classList.add('anydoc-drag-over'); });
  body.addEventListener('dragleave', () => body.classList.remove('anydoc-drag-over'));
  body.addEventListener('drop', e => {
    e.preventDefault();
    body.classList.remove('anydoc-drag-over');
    const f = e.dataTransfer?.files?.[0];
    if (f) renderFile(f);
  });

  printBtn.addEventListener('click', () => {
    if (!currentFile) return;
    const type = detectType(currentFile.name);
    if (type === 'pdf' || type === 'html') {
      const iframeOrEmbed = viewerInner.querySelector('iframe, embed');
      if (iframeOrEmbed?.contentWindow) { iframeOrEmbed.contentWindow.print(); return; }
    }
    window.print();
  });

  zoomOut.addEventListener('click',   () => setZoom(zoomLevel - 0.1));
  zoomIn.addEventListener('click',    () => setZoom(zoomLevel + 0.1));
  zoomReset.addEventListener('click', () => setZoom(1.0));

  // Keyboard zoom
  container.addEventListener('keydown', e => {
    if (!currentFile) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '=')) { e.preventDefault(); setZoom(zoomLevel + 0.1); }
    if ((e.ctrlKey || e.metaKey) && e.key === '-') { e.preventDefault(); setZoom(zoomLevel - 0.1); }
    if ((e.ctrlKey || e.metaKey) && e.key === '0') { e.preventDefault(); setZoom(1.0); }
    if ((e.ctrlKey || e.metaKey) && e.key === 'o') { e.preventDefault(); openFilePicker(); }
  });

  // ── Init ──────────────────────────────────────────────────────────────────
  renderRecent();
}
