/* ===== JARVIS OFFICE v2 — STUDIO (Medien: Bibliothek, Teilen, Aufträge) ===== */

// Verbindung zum lokalen Medien-Dienst (server/jarvis_media.py).
// Der Starter übergibt Port und Token als "#jm=PORT.TOKEN".
const JM = (() => {
  let conn = JarvisDB.get('media_conn', null);
  const m = location.hash.match(/jm=(\d+)\.([\w-]+)/);
  if (m) {
    conn = { port: Number(m[1]), token: m[2] };
    JarvisDB.set('media_conn', conn);
    try { history.replaceState(null, '', location.pathname + location.search); } catch { /* file:// */ }
  }
  const state = { info: null };

  function url(path, params = {}) {
    if (!conn) return '';
    const q = new URLSearchParams({ t: conn.token, ...params });
    return `http://127.0.0.1:${conn.port}${path}?${q}`;
  }

  async function api(method, path, body) {
    if (!conn) throw new Error('Der Medien-Dienst ist nicht verbunden.');
    let res;
    try {
      res = await fetch(url(path), {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      state.info = null;
      throw new Error('Der Medien-Dienst antwortet nicht.');
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || `Fehler ${res.status}`);
    return data;
  }

  async function connect() {
    try { state.info = await api('GET', '/api/ping'); }
    catch { state.info = null; }
    return state.info;
  }

  // Hält den Dienst wach, solange Jarvis Office offen ist.
  setInterval(() => { if (conn) connect(); }, 60000);

  return { url, api, connect, get info() { return state.info; }, get connected() { return !!state.info; } };
})();

function jmDur(s) {
  s = Math.max(0, Number(s) || 0);
  const h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), r = s % 60;
  const sec = (s < 60 ? r.toFixed(1) : String(Math.floor(r))).padStart(s < 60 ? 4 : 2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${sec}` : `${m}:${sec}`;
}
function jmSize(b) {
  if (b >= 1073741824) return (b / 1073741824).toFixed(2).replace('.', ',') + ' GB';
  if (b >= 1048576) return (b / 1048576).toFixed(1).replace('.', ',') + ' MB';
  return Math.max(1, Math.round(b / 1024)) + ' KB';
}

const JM_KIND = { video: 'Video', image: 'Foto', gif: 'GIF', audio: 'Ton' };
const JM_ACCEPT = 'video/*,image/*,audio/*,.mkv,.mov,.avi,.mts,.m2ts,.ts,.flv,.wmv,.3gp,.heic,.heif,.tif,.tiff,.vob';
const JM_PLATFORMS = [
  ['youtube', 'YouTube', 'youtube'], ['tiktok', 'TikTok', 'vertical'], ['instagram', 'Instagram', 'vertical'],
  ['facebook', 'Facebook', 'youtube'], ['whatsapp', 'WhatsApp', 'hd'], ['telegram', 'Telegram', 'hd'],
  ['x', 'X (Twitter)', 'hd'], ['linkedin', 'LinkedIn', 'youtube'], ['pinterest', 'Pinterest', 'vertical'],
  ['threads', 'Threads', 'vertical'], ['bluesky', 'Bluesky', 'hd'], ['reddit', 'Reddit', 'youtube'],
  ['discord', 'Discord', 'hd'], ['vimeo', 'Vimeo', 'youtube'],
];
const JM_EXAMPLES = [
  'Pausen raus und für TikTok hochkant',
  'Kurzfassung 60 Sekunden für YouTube Shorts',
  'Für WhatsApp klein machen, höchstens 15 MB',
  'Als GIF, 5 Sekunden',
  'Stabilisieren, Farben verbessern, mit Ein- und Ausblenden',
];

function initMedia(container) {
  container.innerHTML = `
    <div class="app-chrome jm-app">
      <div class="titlebar">
        <button class="btn-icon back-btn" aria-label="Zurück">${icon('arrowLeft', 18)}</button>
        <span class="app-title">Jarvis Studio</span>
        <div class="jm-tabs" role="tablist">
          <button class="jm-tab active" data-view="library" role="tab">Bibliothek</button>
          <button class="jm-tab" data-view="video" role="tab">Video-Schnitt</button>
          <button class="jm-tab" data-view="photo" role="tab">Foto</button>
          <button class="jm-tab" data-view="jobs" role="tab">Aufträge <span class="jm-badge hidden" id="jm-jobcount"></span></button>
        </div>
        <div class="titlebar-actions">
          <span class="jm-conn" id="jm-conn"></span>
          <button class="btn btn-ghost btn-sm" id="jm-settings">${icon('settings', 15)} KI & Einstellungen</button>
        </div>
      </div>
      <div class="jm-body">
        <section class="jm-pane" data-pane="library"></section>
        <section class="jm-pane hidden" data-pane="video"></section>
        <section class="jm-pane hidden" data-pane="photo"></section>
        <section class="jm-pane hidden" data-pane="jobs"></section>
      </div>
      <div class="statusbar"><span id="jm-status">Bereit</span><span id="jm-space"></span></div>
    </div>`;

  const root = container.firstElementChild;
  const pane = name => root.querySelector(`[data-pane="${name}"]`);
  const statusEl = root.querySelector('#jm-status');
  const alive = () => root.isConnected;

  let items = [];
  let filter = 'all';
  let search = '';
  let jobs = [];
  const jobDone = new Map();          // jobId -> Rückruf bei Ende
  const uploads = [];                 // { file, name, progress, state, error }
  let uploading = false;
  const auto = JarvisDB.get('media_auto', { on: false, prompt: '' });

  // ── Gemeinsame Dienste für die Editoren ─────────────────────────────────
  const ctx = {
    url: JM.url, api: JM.api,
    get items() { return items; },
    get connected() { return JM.connected; },
    get info() { return JM.info; },
    item: id => items.find(i => i.id === id),
    refresh: loadLibrary,
    share: openShare,
    show: showView,
    status: t => { statusEl.textContent = t; },
    trackJob(job, onEnd) { jobDone.set(job.id, onEnd); jobs = [job, ...jobs.filter(j => j.id !== job.id)]; renderJobs(); pollSoon(); },
    pickItem,
    openVideo(item) { showView('video'); video.addClip(item, true); },
    openPhoto(item) { showView('photo'); photo.open(item); },
  };

  function showView(name) {
    root.querySelectorAll('.jm-tab').forEach(t => t.classList.toggle('active', t.dataset.view === name));
    root.querySelectorAll('.jm-pane').forEach(p => p.classList.toggle('hidden', p.dataset.pane !== name));
    if (name !== 'video') video.pause();
    if (name === 'video') video.layout();
  }
  root.querySelectorAll('.jm-tab').forEach(t => t.addEventListener('click', () => showView(t.dataset.view)));
  root.querySelector('.back-btn').addEventListener('click', () => {
    if (video.dirty() && !confirm('Das Schnittprojekt ist nicht gespeichert. Trotzdem schließen?')) return;
    video.pause();
    goHome();
  });

  // ── Bibliothek ───────────────────────────────────────────────────────────
  const lib = pane('library');
  lib.innerHTML = `
    <div class="jm-libbar">
      <button class="btn btn-primary btn-sm" id="jm-upload">${icon('plus', 15)} Dateien hochladen</button>
      <input type="file" id="jm-file" multiple accept="${JM_ACCEPT}" hidden />
      <div class="jm-chips" id="jm-chips">
        ${[['all', 'Alle'], ['video', 'Videos'], ['image', 'Fotos'], ['gif', 'GIFs'], ['audio', 'Ton'], ['exp', 'Fertige Exporte']]
          .map(([k, n]) => `<button class="jm-chip${k === 'all' ? ' active' : ''}" data-f="${k}">${n}</button>`).join('')}
      </div>
      <input type="search" class="tb-search" id="jm-search" placeholder="Suchen …" aria-label="Bibliothek durchsuchen" />
      <button class="btn btn-ghost btn-sm" id="jm-folder">${icon('folderOpen', 15)} Ordner öffnen</button>
    </div>
    <div class="jm-autobar">
      <label class="jm-check"><input type="checkbox" id="jm-auto-on" ${auto.on ? 'checked' : ''}/> Nach dem Hochladen automatisch fertig machen</label>
      <input type="text" id="jm-auto-prompt" placeholder="Was soll passieren? z. B. „Pausen raus, hochkant für TikTok“ (leer = Pausen raus, Ton angleichen)" value="${sanitize(auto.prompt || '')}" />
    </div>
    <div class="jm-uploads hidden" id="jm-uploads"></div>
    <div class="jm-grid-wrap" id="jm-drop">
      <div class="jm-grid" id="jm-grid"></div>
    </div>`;
  const grid = lib.querySelector('#jm-grid');
  const fileIn = lib.querySelector('#jm-file');

  lib.querySelector('#jm-upload').addEventListener('click', () => fileIn.click());
  fileIn.addEventListener('change', () => { addUploads([...fileIn.files]); fileIn.value = ''; });
  lib.querySelector('#jm-search').addEventListener('input', e => { search = e.target.value.toLowerCase(); renderGrid(); });
  lib.querySelector('#jm-folder').addEventListener('click', () => call(() => JM.api('POST', '/api/reveal', {})));
  lib.querySelectorAll('.jm-chip').forEach(c => c.addEventListener('click', () => {
    filter = c.dataset.f;
    lib.querySelectorAll('.jm-chip').forEach(x => x.classList.toggle('active', x === c));
    renderGrid();
  }));
  const saveAuto = () => JarvisDB.set('media_auto', auto);
  lib.querySelector('#jm-auto-on').addEventListener('change', e => { auto.on = e.target.checked; saveAuto(); });
  lib.querySelector('#jm-auto-prompt').addEventListener('input', e => { auto.prompt = e.target.value; saveAuto(); });

  const drop = lib.querySelector('#jm-drop');
  ['dragenter', 'dragover'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.add('jm-dragging'); }));
  ['dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => { e.preventDefault(); drop.classList.remove('jm-dragging'); }));
  drop.addEventListener('drop', e => addUploads([...e.dataTransfer.files]));

  async function call(fn, okMsg) {
    try { const r = await fn(); if (okMsg) showNotify(okMsg, 'success'); return r; }
    catch (err) { showNotify(err.message, 'error'); return null; }
  }

  async function loadLibrary() {
    if (!JM.connected) { items = []; renderGrid(); return; }
    try { items = (await JM.api('GET', '/api/library')).items; }
    catch (err) { showNotify(err.message, 'error'); }
    renderGrid();
    video.itemsChanged();
  }

  function visibleItems() {
    return items.filter(i =>
      (filter === 'all' || (filter === 'exp' ? i.folder === 'exp' : i.kind === filter)) &&
      (!search || i.name.toLowerCase().includes(search)));
  }

  function renderGrid() {
    if (!JM.connected) {
      grid.innerHTML = `
        <div class="jm-empty">
          <h3>Der Medien-Dienst läuft nicht</h3>
          <p>Videos schneiden, Automatik und Teilen brauchen den lokalen Dienst (ffmpeg). Er startet automatisch,
             wenn Jarvis Office über das Startmenü oder den Befehl <code>jarvis-office</code> geöffnet wird.</p>
          <p>Fotos lassen sich auch ohne Dienst bearbeiten.</p>
          <div class="jm-empty-actions">
            <button class="btn btn-primary btn-sm" id="jm-retry">Erneut verbinden</button>
            <button class="btn btn-ghost btn-sm" id="jm-localphoto">Foto direkt öffnen</button>
          </div>
        </div>`;
      grid.querySelector('#jm-retry').addEventListener('click', boot);
      grid.querySelector('#jm-localphoto').addEventListener('click', () => { showView('photo'); photo.pickLocal(); });
      return;
    }
    const list = visibleItems();
    if (!list.length) {
      grid.innerHTML = `
        <div class="jm-empty">
          <h3>${items.length ? 'Nichts gefunden' : 'Noch keine Dateien'}</h3>
          <p>Videos, Fotos, GIFs oder Tondateien hierher ziehen oder auf „Dateien hochladen“ klicken – bis 5 GB pro Datei.</p>
          <p>Große Filme lassen sich auch direkt in den Ordner <code>${sanitize(JM.info.root)}/Bibliothek</code> kopieren.</p>
        </div>`;
      return;
    }
    grid.innerHTML = list.map(i => `
      <article class="jm-card" data-id="${i.id}">
        <div class="jm-thumb">
          ${i.kind === 'audio' ? `<div class="jm-thumb-audio">♪</div>`
            : `<img loading="lazy" src="${JM.url(`/media/${i.id}/thumb`, { v: i.mtime })}" alt="" />`}
          <span class="jm-kind jm-kind-${i.kind}">${i.folder === 'exp' ? 'Export · ' : ''}${JM_KIND[i.kind]}</span>
          ${i.kind !== 'image' ? `<span class="jm-len">${jmDur(i.duration)}</span>` : ''}
        </div>
        <div class="jm-card-body">
          <div class="jm-name" title="${sanitize(i.name)}">${sanitize(i.name)}</div>
          <div class="jm-meta">${i.width ? `${i.width}×${i.height} · ` : ''}${jmSize(i.size)}</div>
          <div class="jm-actions">
            <button class="btn btn-primary btn-sm" data-act="auto">Automatik</button>
            <button class="btn btn-ghost btn-sm" data-act="edit">Bearbeiten</button>
            <button class="btn btn-ghost btn-sm" data-act="share">Teilen</button>
            <button class="btn-icon jm-more" data-act="more" aria-label="Weitere Aktionen" title="Umbenennen, Herunterladen, Löschen">⋯</button>
          </div>
        </div>
      </article>`).join('');
  }

  grid.addEventListener('click', e => {
    const btn = e.target.closest('[data-act]');
    const card = e.target.closest('.jm-card');
    if (!card) return;
    const item = ctx.item(card.dataset.id);
    if (!item) return;
    const act = btn ? btn.dataset.act : 'edit';
    if (act === 'edit') item.kind === 'image' ? ctx.openPhoto(item) : ctx.openVideo(item);
    else if (act === 'auto') item.kind === 'image' ? autoPhoto(item) : openAuto(item);
    else if (act === 'share') openShare(item);
    else if (act === 'more') openMore(item);
  });

  function openMore(item) {
    const modal = showModal(`
      <h3>${sanitize(item.name)}</h3>
      <div class="jm-menu">
        <button class="btn btn-ghost" data-m="rename">Umbenennen</button>
        <a class="btn btn-ghost" href="${JM.url(`/media/${item.id}`, { dl: 1 })}" download="${sanitize(item.name)}">${icon('download', 15)} Herunterladen</a>
        <button class="btn btn-ghost" data-m="reveal">${icon('folderOpen', 15)} Im Ordner zeigen</button>
        <button class="btn btn-danger" data-m="delete">${icon('trash', 15)} Löschen</button>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Schließen</button></div>`);
    const close = () => modal.closest('.modal-overlay').remove();
    modal.querySelector('[data-m="reveal"]').addEventListener('click', () => { call(() => JM.api('POST', '/api/reveal', { id: item.id })); close(); });
    modal.querySelector('[data-m="delete"]').addEventListener('click', async () => {
      if (!confirm(`„${item.name}“ endgültig löschen?`)) return;
      close();
      if (await call(() => JM.api('DELETE', `/api/item/${item.id}`), 'Gelöscht.')) loadLibrary();
    });
    modal.querySelector('[data-m="rename"]').addEventListener('click', async () => {
      const name = prompt('Neuer Name:', item.name);
      if (!name || name === item.name) return;
      close();
      if (await call(() => JM.api('POST', `/api/item/${item.id}/rename`, { name }))) loadLibrary();
    });
  }

  // ── Upload ───────────────────────────────────────────────────────────────
  function addUploads(files) {
    if (!JM.connected) { showNotify('Der Medien-Dienst ist nicht verbunden.', 'error'); return; }
    for (const file of files) {
      const u = { file, name: file.name, progress: 0, state: 'wait', error: '' };
      if (file.size > JM.info.maxUpload) { u.state = 'error'; u.error = 'größer als 5 GB'; }
      uploads.push(u);
    }
    renderUploads();
    pumpUploads();
  }

  function renderUploads() {
    const box = lib.querySelector('#jm-uploads');
    const open = uploads.filter(u => u.state !== 'done');
    box.classList.toggle('hidden', !open.length);
    box.innerHTML = open.map(u => `
      <div class="jm-upload ${u.state === 'error' ? 'jm-upload-err' : ''}">
        <span class="jm-upload-name">${sanitize(u.name)} <small>${jmSize(u.file.size)}</small></span>
        ${u.state === 'error' ? `<span class="jm-upload-msg">Fehlgeschlagen: ${sanitize(u.error)}</span>`
          : `<div class="jm-bar"><div style="width:${(u.progress * 100).toFixed(1)}%"></div></div>
             <span class="jm-upload-msg">${u.state === 'wait' ? 'wartet' : Math.round(u.progress * 100) + ' %'}</span>`}
      </div>`).join('')
      + (open.some(u => u.state === 'error') ? '<button class="btn btn-ghost btn-sm" id="jm-upclear">Fehler ausblenden</button>' : '');
    box.querySelector('#jm-upclear')?.addEventListener('click', () => {
      for (let i = uploads.length - 1; i >= 0; i--) if (uploads[i].state === 'error') uploads.splice(i, 1);
      renderUploads();
    });
  }

  function pumpUploads() {
    if (uploading) return;
    const u = uploads.find(x => x.state === 'wait');
    if (!u) return;
    uploading = true;
    u.state = 'run';
    const xhr = new XMLHttpRequest();
    xhr.open('PUT', JM.url('/api/upload', { name: u.name }));
    xhr.upload.onprogress = e => { if (e.lengthComputable) { u.progress = e.loaded / e.total; renderUploads(); } };
    const finish = (ok, msg, item) => {
      u.state = ok ? 'done' : 'error';
      u.error = msg || '';
      uploading = false;
      renderUploads();
      if (ok) { loadLibrary(); afterUpload(item); }
      pumpUploads();
    };
    xhr.onload = () => {
      let data = {};
      try { data = JSON.parse(xhr.responseText); } catch { /* leer */ }
      if (xhr.status === 200) finish(true, '', data);
      else finish(false, data.error || `Fehler ${xhr.status}`);
    };
    xhr.onerror = () => finish(false, 'Verbindung abgebrochen (Dateityp nicht unterstützt, Platte voll oder Dienst beendet)');
    xhr.send(u.file);
    renderUploads();
  }

  function afterUpload(item) {
    showNotify(`Hochgeladen: ${item.name}`, 'success');
    if (!auto.on) return;
    if (item.kind === 'image') autoPhoto(item);
    else startAuto(item, auto.prompt, true);
  }

  // ── Automatik / KI-Regie ─────────────────────────────────────────────────
  async function autoPhoto(item) {
    ctx.status(`Verbessere ${item.name} …`);
    try {
      const saved = await photo.autoSave(item);
      await loadLibrary();
      ctx.status('Bereit');
      notifyDone(`Foto verbessert: ${saved.name}`, saved);
    } catch (err) { ctx.status('Bereit'); showNotify(err.message, 'error'); }
  }

  function openAuto(item) {
    const ai = JM.info.ai;
    const modal = showModal(`
      <h3>Automatik: ${sanitize(item.name)}</h3>
      <p class="jm-hint">${ai
        ? 'Die KI plant den Schnitt nach deinem Wunsch. Dafür gehen Dateiname, Messwerte und ein paar kleine Standbilder an Anthropic – nie das ganze Video.'
        : 'Ohne KI-Schlüssel versteht die Automatik feste Stichwörter (Plattform, Länge, GIF, stumm, stabilisieren …). Freie Wünsche gehen mit KI-Schlüssel unter „KI & Einstellungen“.'}</p>
      <div class="form-group">
        <label for="jm-auto-text">Was soll aus dem Video werden?</label>
        <textarea id="jm-auto-text" rows="3" placeholder="Leer lassen = Pausen und Schwarzbild raus, Ton angleichen">${sanitize(auto.prompt || '')}</textarea>
      </div>
      <div class="jm-examples">${JM_EXAMPLES.map(x => `<button class="jm-chip" type="button">${x}</button>`).join('')}</div>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-ghost" id="jm-auto-plan">Erst im Editor zeigen</button>
        <button class="btn btn-primary btn-ok">Fertig machen</button>
      </div>`, m => startAuto(item, m.querySelector('#jm-auto-text').value, true));
    const ta = modal.querySelector('#jm-auto-text');
    modal.querySelectorAll('.jm-examples .jm-chip').forEach(c => c.addEventListener('click', () => { ta.value = c.textContent; ta.focus(); }));
    modal.querySelector('#jm-auto-plan').addEventListener('click', () => {
      const text = ta.value;
      modal.closest('.modal-overlay').remove();
      startAuto(item, text, false);
    });
  }

  async function startAuto(item, prompt, run) {
    const job = await call(() => JM.api('POST', '/api/auto', { id: item.id, prompt, run }));
    if (!job) return;
    showNotify(run ? `Automatik läuft: ${item.name}` : 'Schnittplan wird erstellt …', 'info');
    ctx.trackJob(job, done => {
      if (done.state !== 'done') return;
      const r = done.result;
      if (run) {
        loadLibrary();
        notifyDone(`Fertig: ${r.item.name} – ${jmDur(r.removed)} herausgeschnitten`, r.item, r);
      } else {
        showView('video');
        video.loadProject(r.project, r.notes);
      }
    });
  }

  // Meldung mit „Teilen“-Knopf, wenn etwas fertig ist.
  function notifyDone(text, item, extra) {
    const n = el('div', { class: 'jm-toast', role: 'status' });
    n.innerHTML = `<span>${sanitize(text)}</span>
      <button class="btn btn-primary btn-sm">Teilen</button>
      <button class="btn-icon" aria-label="Schließen">${icon('x', 14)}</button>`;
    n.querySelector('.btn-primary').addEventListener('click', () => { n.remove(); openShare(item, extra); });
    n.querySelector('.btn-icon').addEventListener('click', () => n.remove());
    document.body.append(n);
    setTimeout(() => n.remove(), 20000);
  }
  ctx.notifyDone = notifyDone;

  // ── Aufträge ─────────────────────────────────────────────────────────────
  const jobsPane = pane('jobs');
  let pollTimer = null;

  function pollSoon() { if (!pollTimer) pollTimer = setTimeout(poll, 700); }
  async function poll() {
    pollTimer = null;
    if (!alive() || !JM.connected) return;
    try { jobs = (await JM.api('GET', '/api/jobs')).jobs; } catch { return; }
    renderJobs();
    for (const j of jobs) {
      if (j.state === 'queued' || j.state === 'running') continue;
      const cb = jobDone.get(j.id);
      if (!cb) continue;
      jobDone.delete(j.id);
      if (j.state === 'error') showNotify(`${j.title}: ${j.error}`, 'error');
      cb(j);
    }
    if (jobs.some(j => j.state === 'queued' || j.state === 'running')) pollSoon();
  }

  function renderJobs() {
    const active = jobs.filter(j => j.state === 'queued' || j.state === 'running');
    const badge = root.querySelector('#jm-jobcount');
    badge.textContent = active.length;
    badge.classList.toggle('hidden', !active.length);
    statusEl.textContent = active.length
      ? `${active[0].title} – ${active[0].message} ${Math.round(active[0].progress * 100)} %` + (active.length > 1 ? ` (+${active.length - 1})` : '')
      : 'Bereit';
    const label = { queued: 'wartet', running: 'läuft', done: 'fertig', error: 'Fehler', canceled: 'abgebrochen' };
    jobsPane.innerHTML = jobs.length ? `<div class="jm-jobs">${jobs.map(j => `
      <div class="jm-job jm-job-${j.state}" data-id="${j.id}">
        <div class="jm-job-head">
          <strong>${sanitize(j.title)}</strong>
          <span class="jm-job-state">${label[j.state]}</span>
        </div>
        ${j.state === 'running' || j.state === 'queued'
          ? `<div class="jm-bar"><div style="width:${(j.progress * 100).toFixed(1)}%"></div></div>
             <div class="jm-job-foot"><span>${sanitize(j.message)} · ${Math.round(j.progress * 100)} %</span>
               <button class="btn btn-ghost btn-sm" data-j="cancel">Abbrechen</button></div>`
          : `<div class="jm-job-foot"><span>${sanitize(j.state === 'error' ? j.error : (j.result && j.result.notes) || j.message)}</span>
               ${j.state === 'done' && j.result && (j.result.item || j.result.folder)
                 ? '<button class="btn btn-primary btn-sm" data-j="share">Teilen</button>' : ''}</div>`}
      </div>`).join('')}</div>`
      : '<div class="jm-empty"><h3>Keine Aufträge</h3><p>Hier erscheinen Exporte, Analysen und die Automatik mit ihrem Fortschritt.</p></div>';
  }
  jobsPane.addEventListener('click', e => {
    const b = e.target.closest('[data-j]');
    if (!b) return;
    const job = jobs.find(j => j.id === b.closest('.jm-job').dataset.id);
    if (b.dataset.j === 'cancel') call(() => JM.api('POST', `/api/job/${job.id}/cancel`)).then(pollSoon);
    else openShare(job.result.item || job.result, job.result);
  });

  // ── Datei aus der Bibliothek wählen ──────────────────────────────────────
  function pickItem(kinds, title) {
    return new Promise(resolve => {
      const list = items.filter(i => kinds.includes(i.kind));
      if (!list.length) { showNotify('Dafür ist noch keine passende Datei in der Bibliothek.', 'warn'); resolve(null); return; }
      const modal = showModal(`
        <h3>${sanitize(title)}</h3>
        <div class="doc-list jm-pick">${list.map(i => `
          <div class="doc-row" data-id="${i.id}" tabindex="0" role="button">
            <span class="jm-kind jm-kind-${i.kind}">${JM_KIND[i.kind]}</span>
            <span class="doc-row-title">${sanitize(i.name)}</span>
            <span class="doc-row-date">${i.kind === 'image' ? jmSize(i.size) : jmDur(i.duration)}</span>
          </div>`).join('')}</div>
        <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Abbrechen</button></div>`, null, () => resolve(null));
      modal.querySelectorAll('.doc-row').forEach(r => r.addEventListener('click', () => {
        modal.closest('.modal-overlay').remove();
        resolve(ctx.item(r.dataset.id));
      }));
    });
  }

  // ── Teilen ───────────────────────────────────────────────────────────────
  function openShare(item, extra) {
    const isVideo = item.kind === 'video';
    const cap = extra && (extra.caption || (extra.hashtags || []).length)
      ? [extra.caption, (extra.hashtags || []).join(' ')].filter(Boolean).join('\n\n') : '';
    const modal = showModal(`
      <h3>Teilen: ${sanitize(item.name)}</h3>
      <div class="jm-share">
        <div class="jm-share-col">
          <h4>Am Rechner hochladen</h4>
          <p class="jm-hint">Öffnet die Upload-Seite im Browser und zeigt die Datei im Ordner – von dort in die Seite ziehen.</p>
          <div class="jm-platforms">${JM_PLATFORMS.map(([k, n]) => `<button class="jm-platform" data-p="${k}">${n}</button>`).join('')}</div>
          <div class="jm-share-tools">
            <a class="btn btn-ghost btn-sm" href="${JM.url(`/media/${item.id}`, { dl: 1 })}" download="${sanitize(item.name)}">${icon('download', 14)} Herunterladen</a>
            <button class="btn btn-ghost btn-sm" data-s="reveal">${icon('folderOpen', 14)} Im Ordner zeigen</button>
            ${item.kind === 'image' ? `<button class="btn btn-ghost btn-sm" data-s="clip">In die Zwischenablage</button>` : ''}
            ${navigator.share ? `<button class="btn btn-ghost btn-sm" data-s="native">System-Teilen</button>` : ''}
            ${isVideo ? `<button class="btn btn-ghost btn-sm" data-s="fit">Für Plattform umwandeln …</button>` : ''}
          </div>
          <h4>Beitragstext</h4>
          <textarea id="jm-caption" rows="4" placeholder="Text und Hashtags zum Beitrag">${sanitize(cap)}</textarea>
          <div class="jm-share-tools">
            <button class="btn btn-ghost btn-sm" data-s="ai">KI-Vorschlag</button>
            <button class="btn btn-ghost btn-sm" data-s="copy">Text kopieren</button>
          </div>
        </div>
        <div class="jm-share-col">
          <h4>Aufs Handy – und von dort in jede App</h4>
          <p class="jm-hint">Instagram, TikTok, WhatsApp-Status und Co. gehen am besten vom Handy. QR-Code scannen, Datei laden, in der Galerie auf „Teilen“ tippen. Handy und Rechner müssen im selben WLAN sein.</p>
          <div class="jm-qr" id="jm-qr"><button class="btn btn-primary" data-s="lan">QR-Code anzeigen</button></div>
        </div>
      </div>
      <div class="modal-actions"><button class="btn btn-ghost btn-cancel">Schließen</button></div>`);
    modal.classList.add('jm-modal-wide');
    const caption = modal.querySelector('#jm-caption');
    let lastPlatform = '';

    modal.querySelectorAll('.jm-platform').forEach(b => b.addEventListener('click', async () => {
      lastPlatform = b.dataset.p;
      if (caption.value.trim()) navigator.clipboard?.writeText(caption.value).catch(() => {});
      const r = await call(() => JM.api('POST', '/api/open', { platform: b.dataset.p, id: item.id }));
      if (!r) return;
      if (!r.ok) window.open(r.url, '_blank', 'noopener');
      showNotify(`${b.textContent} geöffnet.${caption.value.trim() ? ' Der Beitragstext liegt in der Zwischenablage.' : ''}`, 'success');
    }));

    modal.addEventListener('click', async e => {
      const b = e.target.closest('[data-s]');
      if (!b) return;
      const s = b.dataset.s;
      if (s === 'reveal') call(() => JM.api('POST', '/api/reveal', { id: item.id }));
      if (s === 'copy') navigator.clipboard.writeText(caption.value).then(() => showNotify('Text kopiert.', 'success'), () => showNotify('Kopieren nicht möglich.', 'error'));
      if (s === 'fit') { modal.closest('.modal-overlay').remove(); ctx.openVideo(item); showNotify('Rechts unter „Format“ die Plattform wählen, dann exportieren.', 'info'); }
      if (s === 'ai') {
        if (!JM.info.ai) { showNotify('Dafür fehlt der KI-Schlüssel (oben unter „KI & Einstellungen“).', 'warn'); return; }
        b.disabled = true; b.textContent = 'KI schreibt …';
        const r = await call(() => JM.api('POST', '/api/ai/caption', { id: item.id, platform: lastPlatform, hint: caption.value }));
        b.disabled = false; b.textContent = 'KI-Vorschlag';
        if (r) caption.value = [r.caption, (r.hashtags || []).join(' ')].filter(Boolean).join('\n\n');
      }
      if (s === 'lan') {
        const r = await call(() => JM.api('POST', '/api/share/lan', { id: item.id }));
        if (!r) return;
        modal.querySelector('#jm-qr').innerHTML = `
          <div class="jm-qr-img">${r.qr}</div>
          <div class="jm-qr-url">${sanitize(r.url)}</div>
          <p class="jm-hint">Gültig ${r.minutes} Minuten. Klappt es nicht, blockiert meist die Firewall des Rechners den Zugriff aus dem WLAN.</p>
          <button class="btn btn-ghost btn-sm" data-s="lanstop">Freigabe beenden</button>`;
      }
      if (s === 'lanstop') {
        await call(() => JM.api('POST', '/api/share/stop'), 'Freigabe beendet.');
        modal.querySelector('#jm-qr').innerHTML = '<button class="btn btn-primary" data-s="lan">QR-Code anzeigen</button>';
      }
      if (s === 'clip' || s === 'native') {
        try {
          const blob = await (await fetch(JM.url(`/media/${item.id}`))).blob();
          if (s === 'clip') {
            const png = blob.type === 'image/png' ? blob : await jmToPng(blob);
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
            showNotify('Bild liegt in der Zwischenablage.', 'success');
          } else {
            const file = new File([blob], item.name, { type: blob.type });
            if (!navigator.canShare || !navigator.canShare({ files: [file] })) throw new Error('Dieses System kann die Datei nicht direkt teilen.');
            await navigator.share({ files: [file], text: caption.value });
          }
        } catch (err) { if (err.name !== 'AbortError') showNotify(err.message, 'error'); }
      }
    });
  }

  // ── Einstellungen ────────────────────────────────────────────────────────
  root.querySelector('#jm-settings').addEventListener('click', () => {
    if (!JM.connected) { showNotify('Der Medien-Dienst ist nicht verbunden.', 'error'); return; }
    const i = JM.info;
    showModal(`
      <h3>KI & Einstellungen</h3>
      <p class="jm-hint">Mit einem Anthropic-API-Schlüssel versteht die Automatik freie Wünsche, sieht sich Standbilder an und schreibt Beitragstexte.
        Der Schlüssel bleibt auf diesem Rechner (<code>${sanitize(i.root)}/.config.json</code>). Die Nutzung der API kostet Geld und wird über dein Anthropic-Konto abgerechnet.</p>
      <div class="form-group">
        <label for="jm-key">API-Schlüssel ${i.ai ? '(ist hinterlegt – leer lassen, um ihn zu behalten)' : '(noch keiner hinterlegt)'}</label>
        <input type="text" id="jm-key" autocomplete="off" spellcheck="false" placeholder="sk-ant-…" />
      </div>
      <div class="form-group">
        <label for="jm-model">Modell</label>
        <input type="text" id="jm-model" value="${sanitize(i.aiModel)}" spellcheck="false" />
      </div>
      <label class="jm-check"><input type="checkbox" id="jm-frames" ${i.sendFrames ? 'checked' : ''}/> Kleine Standbilder mitsenden, damit die KI den Inhalt sieht</label>
      ${i.ai ? '<label class="jm-check"><input type="checkbox" id="jm-keydel"/> Hinterlegten Schlüssel löschen</label>' : ''}
      <p class="jm-hint">Speicherort der Medien: <code>${sanitize(i.root)}</code> · frei: ${jmSize(i.free)}${i.ffmpeg ? '' : ' · <strong>ffmpeg fehlt!</strong>'}</p>
      <div class="modal-actions">
        <button class="btn btn-ghost btn-cancel">Abbrechen</button>
        <button class="btn btn-primary btn-ok">Speichern</button>
      </div>`, async m => {
      const body = { aiModel: m.querySelector('#jm-model').value.trim(), sendFrames: m.querySelector('#jm-frames').checked };
      const key = m.querySelector('#jm-key').value.trim();
      if (key) body.aiKey = key;
      else if (m.querySelector('#jm-keydel')?.checked) body.aiKey = '';
      if (await call(() => JM.api('POST', '/api/config', body), 'Einstellungen gespeichert.')) { await JM.connect(); renderConn(); }
    });
  });

  function renderConn() {
    const c = root.querySelector('#jm-conn');
    const i = JM.info;
    c.className = 'jm-conn ' + (i ? (i.ffmpeg ? 'jm-conn-ok' : 'jm-conn-warn') : 'jm-conn-off');
    c.textContent = !i ? 'Dienst aus' : !i.ffmpeg ? 'ffmpeg fehlt' : i.ai ? 'KI aktiv' : 'Automatik (ohne KI)';
    root.querySelector('#jm-space').textContent = i ? `Frei: ${jmSize(i.free)}` : '';
  }

  // ── Editoren einhängen und starten ───────────────────────────────────────
  const video = JMVideo.mount(pane('video'), ctx);
  const photo = JMPhoto.mount(pane('photo'), ctx);
  renderJobs();

  async function boot() {
    await JM.connect();
    renderConn();
    await loadLibrary();
    if (JM.connected) poll();
  }
  boot();
}

async function jmToPng(blob) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = bmp.width; c.height = bmp.height;
  c.getContext('2d').drawImage(bmp, 0, 0);
  return new Promise(res => c.toBlob(res, 'image/png'));
}
